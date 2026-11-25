/* ============================================================
 * ORGANIZACE DEALU = VÍTĚZNÝ ZÁKAZNÍK (VZ-E5b #605, návrh v3 § 7.4,
 * rozhodnutí J. V. 16. 11. 2026, mez B226)
 *
 * POST /api/pd/organizace { soubor, akce: 'vitez' } (functions/pd_organizace.mjs)
 *
 * Po prodeji zakázky s víc zákazníky (`vzRidici` v ULOŽENÉ verzi) server
 * najde v Pipedrive organizaci podle IČO hlavičky (= vítěz, řídící zákazník
 * po prodeji) nebo ji založí, a přepojí na ni deal. Klientovi se nevěří nic
 * kromě jména souboru; vše z uložené zakázky a z Pipedrive.
 *
 * CESTY PIPEDRIVE (ověřeno v oficiální dokumentaci 16. 11. 2026,
 * developers.pipedrive.com/docs/api/v1/Organizations a …/Deals, sekce v2):
 *   GET   /api/v2/deals/{id}                   — deal (org_id, owner_id)
 *   GET   /api/v2/organizations/{id}           — organizace (custom_fields)
 *   GET   /api/v2/organizations/search         — term (min. 2 znaky, 1 s exact_match),
 *         fields=custom_fields (prohledávatelné typy: address, varchar, text,
 *         varchar_auto, double, monetary, phone — IČ je v účtu číselné = double),
 *         exact_match=true, limit (max 100), cursor; data.items[].item.id.
 *         Obal /v1/itemSearch — výsledku se NEVĚŘÍ, každý kandidát se načte
 *         znovu a ověří normalizovaným IČO (pdIco, kontrolní číslice).
 *   POST  /api/v2/organizations                — name (povinné), owner_id,
 *         address { value }, custom_fields { <40znakový klíč>: hodnota }.
 *   PATCH /api/v2/deals/{id}                   — tělo JEN { org_id }.
 *
 * Kroky (návrh § 7.4): 1) prodaná, deal, platné IČO hlavičky (jinak
 * `bez-ico`); 2) deal a jeho organizace — IČO sedí → `shoda`; 3) hledání
 * podle IČO s ověřením kandidátů: jedna → použít, žádná → založit (ARES,
 * při výpadku hlavička; DIČ jen když účet pole má; vlastník = vlastník
 * dealu), víc → `vice` a nic; 4) PATCH dealu `{ org_id }`; 5) stav do
 * `zak.pdOrgVitez`, protokol, smazání cache dealu.
 *
 * Stavy: zapsano (zdroj nalezena | zalozena), shoda, bez-ico, vice,
 * bez-prava, chyba, strop.
 *
 * Revize poradce (16. 11. 2026): P1 prodej jinému zákazníkovi, než je
 * řídící → 409; P2 strop před bez-prava/bez-ico a stejný neúspěšný stav se
 * znovu nezapisuje (razítko zůstává); P3 ARES „nenalezeno“ → chyba, hlavička
 * jen při výpadku; P5 zápis stavu jen do pořád prodané zakázky téhož dealu.
 *
 * CO TO NEDĚLÁ (mez B226): neslučuje duplicity, nemění ani nečte osobu
 * dealu (žádné /persons, žádné person_id), původní organizaci nemění ani
 * nemaže, nezapisuje hodnotu ani pole dealu (#597), při odemčení prodeje
 * nic nevrací, nespouští se z webhooku. Souběh dvou instancí funkce může
 * organizaci založit dvakrát (výhradní úsek drží jen v instanci).
 * ============================================================ */
import { pdZavolej, PdChyba, pdStropCerstvych, PD_CACHE_ULOZISTE, pdZapisPovolen, PD_ZAPIS_VYPNUTY } from './pipedrive.mjs';
import { pdDealPatriZakazce } from './pd_overeni.mjs';
import { pdWebhookOdkaz } from './pd_webhook.mjs';
import { pdHodnota, pdIco } from './pd_mapa.mjs';
import { aresNacti, aresIcoNorm, aresIcoPlatne, aresText, ARES_SIT, ARES_DIC_TVAR } from './ares_server.mjs';
import { pdProtokol, pdRejstrikZapis, pdVazbaSmiMenit } from './pd_vazba.mjs';
import { pdPoznamkaSmi } from './pd_poznamka.mjs';

export const PD_VITEZ_STAVY = ['zapsano', 'shoda', 'bez-ico', 'vice', 'bez-prava', 'chyba', 'strop', 'neovereno'];   // neovereno: B236
export const PD_VITEZ_ZDROJE = ['nalezena', 'zalozena'];
/* Časové meze: jedno volání Pipedrive, celá akce včetně ARES. */
export const PD_VITEZ_VOLANI_MS = 2500;
export const PD_VITEZ_CELKEM_MS = 9000;
export const PD_VITEZ_ARES_MS = 3000;
/* Strop pokusů za hodinu (i neúspěšných): na deal a na uživatele. */
export const PD_VITEZ_STROP_DEAL = 10;
export const PD_VITEZ_STROP_UZIVATEL = 20;
/* Kolik kandidátů z hledání se nejvýš ověřuje (každý = jedno čtení). */
export const PD_VITEZ_KANDIDATI_MAX = 10;
export const PD_VITEZ_NAZVY_MAX = 10;
export const PD_VITEZ_KONTAKT_VETA = 'Doplňte v Pipedrive kontaktní osobu vítězného zákazníka před posunem dealu na Vyhráno.';
export const PD_VITEZ_ARES_NENI = 'IČO v ARES není — ověřte IČO, nebo organizaci změňte ručně.';
export const PD_VITEZ_JINY_VITEZ = 'Zakázka je prodaná jinému zákazníkovi, než je řídící — organizace dealu se nepřepisuje, dokud prodaný zákazník není řídící.';
export const PD_VITEZ_DUVOD = {
  'bez-ico': 'Hlavička zakázky nemá platné IČO vítězného zákazníka — doplňte IČO (po odemčení prodeje vedoucí nebo administrátor), nebo změňte organizaci dealu ručně v Pipedrive.',
  vice: 'V Pipedrive je víc organizací s tímto IČO — sjednoťte je a zápis zopakujte.',
  'bez-prava': 'Zápis do Pipedrive vám administrátor nepřidělil — organizaci dealu přepíše kolega s právem „Pipedrive: čtení a zápis do vlastních obchodních případů“.',
  strop: 'Zápis organizace dealu byl za poslední hodinu zkoušen příliš často — zkuste to později.',
};

const ID = /^[1-9][0-9]{0,11}$/;
const KDY = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const txt = (x, max) => aresText(typeof x === 'string' ? x : '', max);

/* Čistý tvar pole psaného jen serverem (whitelist), nebo null. */
export function pdOrgVitezNorm(x) {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
  const deal = String(x.deal == null ? '' : x.deal);
  if (!ID.test(deal) || !PD_VITEZ_STAVY.includes(x.stav)) return null;
  const org = Number.isInteger(x.org) && x.org > 0 ? x.org : 0;
  const v = { deal, org, stav: x.stav, kdy: KDY.test(String(x.kdy || '')) ? x.kdy : '', kdo: txt(x.kdo, 200) };
  if (x.stav === 'zapsano' && PD_VITEZ_ZDROJE.includes(x.zdroj)) v.zdroj = x.zdroj;
  const nazev = txt(x.nazev, 200);
  if (nazev) v.nazev = nazev;
  const duvod = txt(x.duvod, 400);
  if (duvod) v.duvod = duvod;
  if (x.stav === 'vice' && x.vice && typeof x.vice === 'object' && Number.isInteger(x.vice.pocet) && x.vice.pocet > 1)
    v.vice = { pocet: Math.min(x.vice.pocet, 999), nazvy: (Array.isArray(x.vice.nazvy) ? x.vice.nazvy : []).map((n) => txt(n, 200)).filter(Boolean).slice(0, PD_VITEZ_NAZVY_MAX) };
  return v;
}

/* POLE PSANÉ JEN SERVEREM (vzor pdVazbaDrz): z uložené verze, hodnota
 * z prohlížeče se zahodí; obnova ze souboru ho nepřebírá, obnova z otisku ano. */
export function pdOrgVitezDrz(stara, zak, volby = {}) {
  if (!zak || typeof zak !== 'object') return;
  const zOtisku = volby.obnova === true && volby.zeSouboru !== true;
  const v = pdOrgVitezNorm((zOtisku ? zak : stara) && (zOtisku ? zak : stara).pdOrgVitez);
  if (v) zak.pdOrgVitez = v; else delete zak.pdOrgVitez;
}

/* SKUTEČNÁ ORGANIZACE DEALU (VZ T1, revize N3): `pdOrgDealu` { deal, org,
 * ico, nazev, kdy } píše jen server (pd_poznamka.mjs pdOrgDealuObnov při
 * uložení, níže po přepojení na vítěze) — z uložené verze, hodnota
 * z prohlížeče se zahodí; obnova ze souboru ji nepřebírá, z otisku ano. */
export function pdOrgDealuDrz(stara, zak, volby = {}, G = globalThis) {
  if (!zak || typeof zak !== 'object' || typeof G.vzOrgDealuNorm !== 'function') return;
  const zOtisku = volby.obnova === true && volby.zeSouboru !== true;
  const zdroj = zOtisku ? zak : stara;
  const v = G.vzOrgDealuNorm(zdroj && zdroj.pdOrgDealu);
  if (v) zak.pdOrgDealu = v; else delete zak.pdOrgDealu;
}

/* Kdo smí (§ 7.4): kdo prodal (prodano.kdo uložené verze = e-mail relace),
 * autor zakázky nebo administrátor. Právo crm.pipedrive se řeší zvlášť. */
export function pdOrgVitezKdoSmi(ulozena, relace, G = globalThis) {
  if (pdVazbaSmiMenit(ulozena, relace)) return true;
  const p = typeof G.prodStav === 'function' ? G.prodStav(ulozena) : null;
  const kdo = String((p && p.prodano && p.prodano.kdo) || '').trim().toLowerCase();
  const ja = String((relace && relace.email) || '').trim().toLowerCase();
  return !!kdo && !!ja && kdo === ja;
}

/* Volání Pipedrive s časovou mezí: jedno nejvýš PD_VITEZ_VOLANI_MS, nikdy za termín celé akce. */
function volani(termin) {
  return (cesta, volby = {}) => {
    const zbyva = termin - Date.now();
    if (zbyva <= 0) throw new PdChyba('Pipedrive neodpověděl včas.', 504);
    return pdZavolej(cesta, { ...volby, pokusu: 1, casLimitMs: Math.min(PD_VITEZ_VOLANI_MS, zbyva) });
  };
}

const orgAktivni = (o) => !!o && typeof o === 'object' && o.is_deleted !== true && o.active_flag !== false;
const orgIco = (o, hashIco) => aresIcoNorm(pdIco(((o && o.custom_fields) || {})[hashIco]));

/* Hledání podle IČO + ověření každého kandidáta. `navic` = id organizace,
 * kterou si server pamatuje z minulého pokusu (idempotence při zpožděném
 * indexu hledání). Vrací seznam OVĚŘENÝCH organizací, nebo hodí PdChyba. */
async function najdiPodleIco(zavolej, ico, hashIco, navic) {
  const v = await zavolej('/api/v2/organizations/search', {
    dotaz: { term: String(Number(ico)), fields: 'custom_fields', exact_match: 'true', limit: 100 } });
  const polozky = v && Array.isArray(v.items) ? v.items : [];
  const ids = [];
  for (const x of polozky) {
    const id = Number(x && x.item && x.item.id);
    if (Number.isInteger(id) && id > 0 && !ids.includes(id)) ids.push(id);
  }
  if (navic && !ids.includes(navic)) ids.unshift(navic);
  if (ids.length > PD_VITEZ_KANDIDATI_MAX)
    throw new PdChyba('Hledání v Pipedrive vrátilo příliš mnoho organizací (' + ids.length + ') — sjednoťte je a zápis zopakujte.', 409);
  const overene = [];
  for (const id of ids) {
    let o = null;
    try { o = await zavolej('/api/v2/organizations/' + id); }
    catch (e) { if (!(e instanceof PdChyba) || e.stav !== 404) throw e; }
    if (orgAktivni(o) && Number(o.id) === id && orgIco(o, hashIco) === ico) overene.push(o);
  }
  return overene;
}

/* Údaje nové organizace: ARES podle IČO, při výpadku hlavička zakázky. */
async function udajeNove(ulozena, ico, termin, aresFetch) {
  const zbyva = Math.min(PD_VITEZ_ARES_MS, termin - Date.now());
  const a = zbyva > 0 ? await aresNacti(ico, { fetch: aresFetch, timeoutMs: zbyva }) : { stav: 'vypadek' };
  if (a.stav === 'ok') return { nazev: a.subjekt.nazev, adresa: a.subjekt.adresa, dic: a.subjekt.dic, zdroj: 'ares' };
  /* Revize P3: hlavička jen při VÝPADKU ARES — „nenalezeno“ / „neplatne“ =
   * IČO je nejspíš špatně, organizace se nezakládá. */
  if (a.stav !== 'vypadek') throw new PdChyba(PD_VITEZ_ARES_NENI, 409);
  const dic = txt(ulozena.dic, 20).replace(/\s+/g, '').toUpperCase();
  return { nazev: txt(ulozena.objednatel, 200), adresa: txt(ulozena.adresaObjednatele, 300),
    dic: ARES_DIC_TVAR.test(dic) ? dic : '', zdroj: 'hlavicka', ares: a.stav };
}

/* Zápis stavu do zakázky: výhradní úsek, druhé čtení, protokol, rejstřík. */
/* Neúspěšný (nebo shodný) stav se stejným dealem, organizací, důvodem
 * a seznamem jako uložený se nezapisuje znovu (revize P2). */
function stejnyStav(ulozeny, novy) {
  if (!ulozeny || !novy || novy.stav === 'zapsano') return false;
  const k = (x) => JSON.stringify([x.deal, x.org, x.stav, x.duvod || '', x.vice || null, x.nazev || '']);
  return k(ulozeny) === k(novy);
}

async function zapisStav(ctx, stav) {
  const { s, ULO, vyhradne, soubor, relace } = ctx;
  const G = ctx.G || globalThis;
  const kdo = String(relace.jmeno || relace.email || '');
  const v = await vyhradne('zakazky/z/' + soubor, async () => {
    const zak = await s.cti('z/' + soubor);   // druhé čtení (SEC-S1)
    if (!zak || typeof zak !== 'object') return {};
    /* Revize P5: mezitím odemčený prodej nebo jiný deal → stav se nezapisuje. */
    if (!(typeof G.prodStav === 'function' && G.prodStav(zak)) || (G.ctrlPdDealIdNorm(zak.pdDealId) || '') !== stav.deal)
      return { nezapsano: true };
    const hodnota = pdOrgVitezNorm(Object.assign({}, stav, { kdy: new Date().toISOString(), kdo }));
    if (!hodnota) return {};
    const ulozeny = pdOrgVitezNorm(zak.pdOrgVitez);
    if (stejnyStav(ulozeny, hodnota)) return { hodnota: ulozeny, razitko: String(zak.uloRazitko || ''), beze: true };
    zak.pdOrgVitez = hodnota;
    /* VZ T1 (N3): deal teď vede organizace vítěze — skutečná organizace dealu. */
    if ((stav.stav === 'zapsano' || stav.stav === 'shoda') && stav.org && typeof G.vzOrgDealuNorm === 'function') {
      const o = G.vzOrgDealuNorm({ deal: stav.deal, org: stav.org, ico: aresIcoNorm(stav.ico || ''), nazev: stav.nazev || '', kdy: hodnota.kdy });
      if (o) zak.pdOrgDealu = o;
    }
    if (stav.stav === 'zapsano') {
      pdProtokol(zak, kdo, 'Přepojil deal ' + stav.deal + ' v Pipedrive na organizaci vítězného zákazníka „'
        + (hodnota.nazev || ('#' + hodnota.org)) + '“ (' + (hodnota.zdroj === 'zalozena' ? 'založena' : 'nalezena') + ').');
      pdProtokol(zak, kdo, PD_VITEZ_KONTAKT_VETA);
    }
    const razitko = ULO.uloRazitkoNove();
    zak.uloRazitko = razitko;
    await s.zapis('z/' + soubor, zak);
    return { zak, razitko, hodnota };
  });
  if (v.zak && !v.beze) await pdRejstrikZapis(s, ULO, vyhradne, v.zak, soubor, v.razitko, String(relace.email || ''));
  return v;
}

/* Hlavní akce. ctx = { soubor, relace, matice, s, ULO, vyhradne, G, aresFetch?, nastaveno }.
 * Vrací { status, telo }. */
export async function pdOrgVitezAkce(ctx) {
  const { soubor, relace, matice, s } = ctx;
  const G = ctx.G || globalThis;
  const ulozena = await s.cti('z/' + soubor);
  if (!ulozena || typeof ulozena !== 'object') return { status: 404, telo: { ok: false, chyba: 'Zakázka nenalezena.' } };
  if (!pdOrgVitezKdoSmi(ulozena, relace, G))
    return { status: 403, telo: { ok: false, chyba: 'Organizaci dealu přepíše jen ten, kdo zakázku prodal, autor zakázky nebo administrátor.' } };
  if (!(typeof G.prodStav === 'function' && G.prodStav(ulozena)))
    return { status: 409, telo: { ok: false, chyba: 'Zakázka není prodaná — organizace dealu se přepisuje až po prodeji.' } };
  if (!(ulozena.vzRidici && typeof ulozena.vzRidici === 'object' && Array.isArray(ulozena.dalsiZakaznici) && ulozena.dalsiZakaznici.length))
    return { status: 409, telo: { ok: false, chyba: 'Zakázka má jednoho zákazníka — organizace dealu se nemění.' } };
  /* Revize P1: prodej patří jinému zákazníkovi než řídícímu (E4 ho ještě
   * nepřepnul) — IČO hlavičky by nebylo IČO vítěze. */
  {
    const p = G.prodStav(ulozena);
    const zakaznik = p && p.prodano && typeof p.prodano.zakaznik === 'string' ? p.prodano.zakaznik : '';
    if (zakaznik && zakaznik !== String(ulozena.vzRidici.id || ''))
      return { status: 409, telo: { ok: false, chyba: PD_VITEZ_JINY_VITEZ } };
  }
  const deal = G.ctrlPdDealIdNorm(ulozena.pdDealId) || '';
  if (!deal) return { status: 409, telo: { ok: false, chyba: 'Zakázka není navázaná na deal v Pipedrive.' } };
  if (!ctx.nastaveno) return { status: 503, telo: { ok: false, chyba: 'Napojení na Pipedrive není nastavené.' } };
  /* B235/B236: vypínač zápisu do Pipedrive (výchozí vypnuto). */
  if (!pdZapisPovolen()) return { status: 503, telo: { ok: false, chyba: PD_ZAPIS_VYPNUTY } };

  const minule = pdOrgVitezNorm(ulozena.pdOrgVitez);
  const minuleOrg = minule && minule.deal === deal && minule.org ? minule.org : 0;
  const hotovo = async (stav) => {
    const v = await zapisStav(ctx, stav);
    const ok = stav.stav === 'zapsano' || stav.stav === 'shoda';
    const telo = { ok, stav: stav.stav, duvod: stav.duvod || '', pdOrgVitez: v.hodnota || pdOrgVitezNorm(stav), razitko: v.razitko || '' };
    if (v.nezapsano) telo.nezapsano = true;   // P5: zakázka se mezitím změnila (prodej odemčen / jiný deal)
    if (stav.zdroj) telo.zdroj = stav.zdroj;
    if (stav.vice) telo.vice = (v.hodnota && v.hodnota.vice) || stav.vice;
    if (stav.org) telo.organizace = { id: stav.org, nazev: (v.hodnota && v.hodnota.nazev) || '' };
    if (stav.stav === 'zapsano') telo.upozorneni = 'kontaktni-osoba';
    return { status: 200, telo };
  };

  /* Strop PŘED bez-prava a bez-ico (revize P2): omezuje i zápisy stavu do zakázky. */
  if (!(await pdStropCerstvych('deal:' + deal, 'org-vitez', PD_VITEZ_STROP_DEAL))
    || !(await pdStropCerstvych(relace.email, 'org-vitez', PD_VITEZ_STROP_UZIVATEL)))
    return hotovo({ deal, org: minuleOrg, stav: 'strop', duvod: PD_VITEZ_DUVOD.strop });
  if (!pdPoznamkaSmi(relace, matice, G))
    return hotovo({ deal, org: minuleOrg, stav: 'bez-prava', duvod: PD_VITEZ_DUVOD['bez-prava'] });
  const ico = aresIcoNorm(ulozena.ico);
  if (!ico || !aresIcoPlatne(ico)) return hotovo({ deal, org: minuleOrg, stav: 'bez-ico', duvod: PD_VITEZ_DUVOD['bez-ico'] });

  const termin = Date.now() + PD_VITEZ_CELKEM_MS;
  const zavolej = volani(termin);
  /* Výhradní úsek dealu (v instanci): dvojí stisk se seřadí a druhý už
   * organizaci najde (nebo dostane `shoda`). */
  return ctx.vyhradne('pd-org-vitez/deal:' + deal, async () => {
    let zalozenaId = 0;
    try {
      const mapaOrg = (await Promise.race([ctx.poleMapa(),
        new Promise((_, ne) => setTimeout(() => ne(new PdChyba('Pipedrive neodpověděl včas.', 504)), Math.max(1, termin - Date.now())).unref?.())])).mapaOrganizace || {};
      if (!mapaOrg.ico) throw new PdChyba('Účet Pipedrive nemá pole IČ organizace — organizaci nejde podle IČO najít.', 409);
      /* B236: deal musí patřit zakázce (vazba z webhooku, odkaz na kalkulaci
       * nebo číslo nabídky v dealu) — jinak se nic nezakládá ani nepřepojuje. */
      const ov = await pdDealPatriZakazce(ulozena, deal, { zavolej, poleMapa: ctx.poleMapa,
        odkaz: ctx.req ? pdWebhookOdkaz(soubor, ctx.req) : '' }, G);
      if (!ov.ok) return hotovo({ deal, org: minuleOrg, stav: 'neovereno', duvod: ov.duvod });
      const d = await zavolej('/api/v2/deals/' + Number(deal));
      if (!d) throw new PdChyba('Pipedrive deal zakázky nezná.', 404);
      const puvodni = Number(d.org_id) || 0;
      if (puvodni) {
        let o = null;
        try { o = await zavolej('/api/v2/organizations/' + puvodni); }
        catch (e) { if (!(e instanceof PdChyba) || e.stav !== 404) throw e; }
        if (o && orgIco(o, mapaOrg.ico) === ico)
          return hotovo({ deal, org: puvodni, stav: 'shoda', nazev: txt(o.name, 200), ico });
      }
      const nalez = await najdiPodleIco(zavolej, ico, mapaOrg.ico, minuleOrg && minuleOrg !== puvodni ? minuleOrg : 0);
      if (nalez.length > 1) {
        const nazvy = nalez.map((o) => txt(o.name, 200) || ('#' + o.id)).slice(0, PD_VITEZ_NAZVY_MAX);
        return hotovo({ deal, org: 0, stav: 'vice', duvod: PD_VITEZ_DUVOD.vice, vice: { pocet: nalez.length, nazvy } });
      }
      let cil, zdroj;
      if (nalez.length === 1) { cil = nalez[0]; zdroj = 'nalezena'; }
      else {
        const u = await udajeNove(ulozena, ico, termin, ctx.aresFetch || ARES_SIT.fetch);
        if (!u.nazev) throw new PdChyba('Vítězný zákazník nemá název (ARES neodpověděl, hlavička je prázdná) — organizaci nejde založit.', 409);
        const cf = { [mapaOrg.ico]: Number(ico) };
        if (mapaOrg.dic && u.dic) cf[mapaOrg.dic] = u.dic;   // DIČ jen když účet pole má (pole se nikdy nezakládá)
        const telo = { name: u.nazev, custom_fields: cf };
        const vlastnik = Number(d.owner_id || d.user_id) || 0;
        if (vlastnik) telo.owner_id = vlastnik;
        if (u.adresa) telo.address = { value: u.adresa };
        cil = await zavolej('/api/v2/organizations', { metoda: 'POST', telo });
        if (!cil || !(Number(cil.id) > 0)) throw new PdChyba('Pipedrive nevrátil id nové organizace.', 502);
        zalozenaId = Number(cil.id);
        zdroj = 'zalozena';
      }
      const orgId = Number(cil.id);
      await zavolej('/api/v2/deals/' + Number(deal), { metoda: 'PATCH', telo: { org_id: orgId } });
      try { await (await (ctx.uloziste)(PD_CACHE_ULOZISTE)).smaz('deal:' + deal); } catch (e) { /* cache jen zestárne */ }
      return hotovo({ deal, org: orgId, stav: 'zapsano', zdroj, nazev: txt(cil.name, 200), ico });
    } catch (e) {
      if (!(e instanceof PdChyba)) throw e;
      /* Založená organizace, ale PATCH dealu selhal: id si pamatujeme —
       * opakování ji ověří a použije, druhou nezaloží. */
      return hotovo({ deal, org: zalozenaId || minuleOrg, stav: 'chyba',
        duvod: 'Organizace dealu se nepřepsala: ' + e.message + (zalozenaId ? ' Organizace vítěze už v Pipedrive je, opakování ji použije.' : '') });
    }
  });
}
