/* Webhook „Vygenerovat nabídku“ z Pipedrive (#553, varianta A, J. V. 3. 11. 2026).
 *
 * POST /api/pd/webhook   hlavička x-kalkulator-klic: <PIPEDRIVE_WEBHOOK_KLIC>
 *                        tělo { "dealId": 123 }
 *   → 200 { ok, akce: 'zalozeno' | 'aktualizovano' | 'bezeZmeny', dealId, soubor, odkaz,
 *           zmeneno: [pole], ponechano: [pole], zamceno, odkazDoDealu: 'zapsano' | 'beze-zmeny' | 'nezapsano',
 *           varovani: [...] }
 *   401 bez klíče / špatný klíč (do Pipedrive se nesáhne), 400 neplatné tělo
 *   nebo ID dealu, 404 deal neexistuje, 409 deal patří jiné nabídce / číslo
 *   nabídky má zakázka jiného dealu / deal je smazaný, 413 velké tělo,
 *   422 deal bez čísla nabídky, 429 strop volání, 502 Pipedrive nedostupný,
 *   503 webhook nebo napojení na Pipedrive nenastavené.
 *
 * CO SE DĚJE (varianta A, roadmapa #553):
 *   1. Z těla se bere JEN ID dealu. Cokoli dalšího (cena, název, adresa…)
 *      se ignoruje — kalkulátor si deal načte z Pipedrive sám, stejnou cestou
 *      jako /api/pd/deal (mapa polí podle názvu, organizace a osoba dealu).
 *   2. Kalkulace se najde podle `pdDealId` (rejstřík webhooku deal → soubor),
 *      jinak podle čísla nabídky („Číslo nabídky (CN)“ v dealu, jinak z názvu
 *      dealu). Vlastník dealu podle CN (PIPEDRIVE_ROZHODNUTI_115.md, 27. 10.):
 *      jiné CN v dealu než číslo navázané kalkulace → 409, nic se nemění.
 *      Opakované doručení téhož dealu nezaloží druhou kalkulaci.
 *   3. Zadání z dealu (lib/pd_webhook.mjs) se přenese podle pravidla #113:
 *      přepíše se jen prázdné pole nebo hodnota z minulého webhooku. Zamčené
 *      (odeslané) varianty se nemění nikdy, se zamčenou variantou ani hlavička.
 *   4. Do dealu se vrátí odkaz na kalkulaci (pole „Odkaz na kalkulaci“) —
 *      JEDINÝ zápis do Pipedrive (vzor #115: PATCH jen změněného pole). Stejný
 *      odkaz už v dealu = žádný zápis (update_time se neposune).
 *   CENA SE Z CRM ANI Z WEBHOOKU NIKDY NEBERE a dokument na serveru nevzniká:
 *   nabídku vygeneruje obchodník v prohlížeči po dopočítání kalkulace.
 *
 * SMYČKA (#117): zápis odkazu posune update_time dealu. Automatizace v Pipedrive
 * se proto smí spouštět JEN změnou pole „Vygenerovat nabídku“, nikdy „deal
 * aktualizován“ (podklady/PIPEDRIVE_WEBHOOK_553.md). Pojistkou je strop volání.
 *
 * Bez přihlášení do aplikace: Pipedrive cookie nemá. Místo relace chrání
 * webhook tajný klíč (PIPEDRIVE_WEBHOOK_KLIC v Netlify, nastavuje J. V.; do
 * repozitáře ani klientovi nejde). Odpověď nenese e-maily, telefony, jména
 * ani token — jen názvy polí a odkaz (K8-S3, SEC-PD). */
import { uloziste, json, vyhradne } from '../lib/sdilene.mjs';
import { jadro, jadroChyba } from '../lib/jadro.mjs';
import { pdNastaveno, pdRezim, pdZavolej, PdChyba, pdStropCerstvych, PD_CACHE_ULOZISTE } from '../lib/pipedrive.mjs';
import { pdDealNaNase, pdHodnota } from '../lib/pd_mapa.mjs';
import { zakazkaPrijmi } from '../lib/zakazka_kontrola.mjs';
import { pdPoleMapa } from './pd_pole.mjs';
import {
  pdWebhookKlic, pdWebhookKlicZPozadavku, pdWebhookKlicSedi, pdWebhookDealId, pdWebhookZadani,
  pdWebhookHlavicka, pdWebhookPouzij, pdWebhookVolbaText, pdWebhookZamkyPoruseny, pdWebhookCisloKlic, pdWebhookOdkaz,
  PD_WEBHOOK_MAX, PD_WEBHOOK_TELO_MAX, PD_WEBHOOK_AUTOR, PD_WEBHOOK_AUTOR_JMENO, PD_WEBHOOK_ULOZISTE,
  PD_WEBHOOK_KLIC_PROMENNA,
} from '../lib/pd_webhook.mjs';

/* Mapa polí bez „Odkazu na kalkulaci“ se obnoví nejvýš jednou za 15 min
 * (pole mohl integrátor právě založit; obnova stojí 20 tokenů). */
const MAPA_OBNOVA_MS = 15 * 60 * 1000;

async function bezpecne(cesta) {
  try { return await pdZavolej(cesta); } catch (e) { return null; }
}

/* Zápis rejstříku zakázek: jeden záznam (vzor functions/zakazky.mjs, K7-S1). */
async function rejstrikZapis(s, ULO, zak, jmeno, razitko) {
  await vyhradne('zakazky/_rejstrik', async () => {
    const rej = (await s.cti('_rejstrik')) || { schema: 1, zakazky: [] };
    const novy = ULO.uloRejstrikSloucit(Array.isArray(rej.zakazky) ? rej.zakazky : [],
      ULO.uloRejstrikZaznam(zak, { soubor: jmeno, razitko }));
    await s.zapis('_rejstrik', { schema: 1, zakazky: ULO.uloRejstrikSerad(novy), kdo: PD_WEBHOOK_AUTOR,
      upraveno: new Date().toISOString() });
  });
}

export default async (req) => {
  if (req.method !== 'POST') return json({ ok: false, chyba: 'Použijte POST.' }, 405);

  /* 1) KLÍČ — před čímkoli dalším, bez dotazu do Pipedrive a bez čtení těla. */
  const klic = pdWebhookKlic();
  if (!klic) return json({ ok: false, chyba: 'Webhook není nastavený (' + PD_WEBHOOK_KLIC_PROMENNA
    + ' v Netlify chybí nebo je kratší než 32 znaků).' }, 503);
  if (!pdWebhookKlicSedi(pdWebhookKlicZPozadavku(req), klic))
    return json({ ok: false, chyba: 'Neplatný nebo chybějící klíč webhooku.' }, 401);

  /* 2) TĚLO — jen ID dealu. */
  const delka = +req.headers.get('content-length') || 0;
  if (delka > PD_WEBHOOK_TELO_MAX) return json({ ok: false, chyba: 'Tělo webhooku je příliš velké.' }, 413);
  let telo;
  try {
    const text = await req.text();
    if (text.length > PD_WEBHOOK_TELO_MAX) return json({ ok: false, chyba: 'Tělo webhooku je příliš velké.' }, 413);
    telo = JSON.parse(text || 'null');
  } catch (e) { return json({ ok: false, chyba: 'Tělo webhooku není platný JSON.' }, 400); }
  const dealId = pdWebhookDealId(telo);
  if (!dealId) return json({ ok: false, chyba: 'Chybí platné ID dealu (pole „dealId“, kladné celé číslo).' }, 400);

  if (!pdNastaveno()) return json({ ok: false, chyba: 'Napojení na Pipedrive není nastavené.' }, 503);

  /* 3) STROP VOLÁNÍ (B158 vzor) — společný pro celý webhook. */
  if (!(await pdStropCerstvych(PD_WEBHOOK_AUTOR, 'webhook', PD_WEBHOOK_MAX)))
    return json({ ok: false, chyba: 'Webhook byl za poslední hodinu volán příliš často (strop ' + PD_WEBHOOK_MAX
      + '). Zkontrolujte, že automatizaci spouští jen změna pole „Vygenerovat nabídku“.' }, 429);

  let ULO;
  try { ({ ULO } = await jadro()); } catch (e) { return jadroChyba(e); }
  const G = globalThis;

  try {
    /* Doručení téhož dealu se řadí za sebe (v instanci funkce). */
    return await vyhradne(PD_WEBHOOK_ULOZISTE + '/deal:' + dealId, () => zpracuj(req, dealId, ULO, G));
  } catch (e) {
    if (e instanceof PdChyba)
      return json({ ok: false, chyba: e.message }, (e.stav >= 500 || e.stav === 401) ? 502 : e.stav);
    throw e;
  }
};

async function zpracuj(req, dealId, ULO, G) {
  const varovani = [];
  if (pdRezim() === 'simulator') varovani.push('Odpovídá SIMULÁTOR Pipedrive se smyšlenými daty.');

  /* 4) DEAL Z PIPEDRIVE — tatáž cesta jako /api/pd/deal. */
  let pole = await pdPoleMapa();
  const deal = await pdZavolej('/api/v2/deals/' + Number(dealId), { dotaz: { include_option_labels: true } });
  if (!deal) return json({ ok: false, chyba: 'Pipedrive takový deal nezná.' }, 404);
  if (deal.is_deleted === true || deal.status === 'deleted')
    return json({ ok: false, chyba: 'Deal je v Pipedrive smazaný — kalkulace se nezakládá.' }, 409);
  const [organizace, osoba] = await Promise.all([
    deal.org_id ? bezpecne('/api/v2/organizations/' + Number(deal.org_id)) : null,
    deal.person_id ? bezpecne('/api/v2/persons/' + Number(deal.person_id)) : null,
  ]);
  const nase = pdDealNaNase(deal, pole.mapa, { organizace, osoba, mapaOrganizace: pole.mapaOrganizace });
  nase.typZakazky = pdWebhookVolbaText(nase.typZakazky, (pole.popisy || {}).typZakazky);
  const cf = deal.custom_fields || {};
  const cnDealu = pole.mapa.cisloNabidky ? pdHodnota(cf[pole.mapa.cisloNabidky]).trim() : '';
  const zadani = pdWebhookZadani(nase, cnDealu);
  if (!zadani.cislo)
    return json({ ok: false, chyba: 'Deal nemá číslo nabídky (pole „Číslo nabídky (CN)“ je prázdné a název '
      + 'dealu nezačíná „CN-…“, „OVP-CN-…“ ani „OPR…“). Doplňte ho v Pipedrive a změňte pole znovu.' }, 422);
  if (!organizace) varovani.push('K dealu není navázaná organizace — zákazník zůstal prázdný.');

  /* 5) KTERÁ KALKULACE — podle pdDealId, pak podle čísla nabídky. */
  const s = await uloziste('zakazky');
  const sw = await uloziste(PD_WEBHOOK_ULOZISTE);
  const norm = (x) => (typeof G.ctrlPdDealIdNorm === 'function' ? G.ctrlPdDealIdNorm(x) : String(x || '')) || '';
  let jmeno = '', stara = null;
  const idx = await sw.cti('deal:' + dealId);
  if (idx && typeof idx.soubor === 'string' && /^[A-Za-z0-9._-]{1,200}$/.test(idx.soubor)) {
    const z = await s.cti('z/' + idx.soubor);
    if (z && norm(z.pdDealId) === dealId) { jmeno = idx.soubor; stara = z; }
  }
  if (!stara) {
    const vzor = G.novaZakazka();
    pdWebhookHlavicka(vzor, zadani.strana).cislo = zadani.cislo;
    jmeno = ULO.uloJmenoSouboru(vzor);
    const z = await s.cti('z/' + jmeno);
    if (z) {
      const jiny = norm(z.pdDealId);
      if (jiny && jiny !== dealId)
        return json({ ok: false, chyba: 'Číslo nabídky ' + zadani.cislo + ' už má kalkulace navázaná na jiný deal ('
          + jiny + '). Nic se nezměnilo — opravte číslo nabídky v Pipedrive, nebo vazbu v kalkulátoru (administrátor).' }, 409);
      stara = z;
    }
  }
  /* Vlastník dealu (#115 B): CN v dealu musí sedět s číslem navázané kalkulace. */
  if (stara && cnDealu) {
    const h = pdWebhookHlavicka(JSON.parse(JSON.stringify(stara)), zadani.strana);
    if (pdWebhookCisloKlic(h.cislo) && pdWebhookCisloKlic(h.cislo) !== pdWebhookCisloKlic(cnDealu))
      return json({ ok: false, chyba: 'Deal patří jiné nabídce: v Pipedrive je číslo nabídky ' + cnDealu
        + ', navázaná kalkulace má ' + String(h.cislo || '') + '. Nic se nezměnilo.' }, 409);
  }

  /* 6) ZÁPIS KALKULACE — ve výhradním úseku zakázky (vzor SEC-S1). */
  const kdy = new Date().toISOString();
  const vysledek = await vyhradne('zakazky/z/' + jmeno, async () => {
    const tesne = await s.cti('z/' + jmeno);
    if (!!tesne !== !!stara || ULO.uloRazitko(tesne) !== ULO.uloRazitko(stara))
      return { odpoved: json({ ok: false, chyba: 'Kalkulaci právě někdo uložil — pošlete webhook znovu.' }, 409) };
    let zak, akce;
    if (!stara) {
      zak = G.novaZakazka();
      pdWebhookHlavicka(zak, zadani.strana).cislo = zadani.cislo;
      akce = 'zalozeno';
    } else {
      zak = JSON.parse(JSON.stringify(stara));
      akce = 'aktualizovano';
    }
    const zmena = pdWebhookPouzij(zak, zadani, dealId, kdy);
    const bezVazby = norm(zak.pdDealId) !== dealId;
    if (bezVazby) zak.pdDealId = dealId;
    if (stara && !bezVazby && !zmena.zmeneno.length && JSON.stringify(zak.pdZadani) === JSON.stringify(stara.pdZadani))
      return { akce: 'bezeZmeny', zmena };   // opakované doručení: nic se nezapisuje, razítko zůstává
    if (stara) {
      const spatne = pdWebhookZamkyPoruseny(stara, zak);
      if (spatne.length)   // nemá nastat — pojistka „zamčenou variantu webhook nikdy nemění“
        return { odpoved: json({ ok: false, chyba: 'Zamčená varianta by se změnila — nic se neuložilo.' }, 500) };
    } else {
      /* Kontrola tvaru stejnou funkcí jako uložení z prohlížeče (jméno, id). */
      const prijem = zakazkaPrijmi(JSON.parse(JSON.stringify(zak)), ULO);
      if (!prijem.ok) return { odpoved: json({ ok: false, chyba: prijem.chyba }, prijem.status) };
      if (prijem.jmeno !== jmeno) return { odpoved: json({ ok: false, chyba: 'Číslo nabídky dává jiné jméno kalkulace.' }, 500) };
      zak.autor = PD_WEBHOOK_AUTOR;
      zak.autorJmeno = PD_WEBHOOK_AUTOR_JMENO;
      /* BEZ CENÍKU (P12): ceník doplní prohlížeč z platného při otevření —
       * server ceník nevolí a cena z CRM do kalkulace nejde. */
      zak = G.zakazkaBezCeniku(zak, (v) => ({ cenik: v.data.cenik, proj: { cenik: v.data.proj && v.data.proj.cenik } }));
    }
    zak.upravil = PD_WEBHOOK_AUTOR;
    zak.upravilJmeno = PD_WEBHOOK_AUTOR_JMENO;
    const razitko = ULO.uloRazitkoNove();
    zak.uloRazitko = razitko;
    await s.zapis('z/' + jmeno, zak);
    return { akce, zmena, zak, razitko };
  });
  if (vysledek.odpoved) return vysledek.odpoved;
  if (vysledek.zak) await rejstrikZapis(s, ULO, vysledek.zak, jmeno, vysledek.razitko);
  await sw.zapis('deal:' + dealId, { soubor: jmeno, kdy });

  /* 7) ODKAZ DO DEALU — jediný zápis do Pipedrive. */
  const odkaz = pdWebhookOdkaz(jmeno, req);
  let odkazDoDealu = 'nezapsano';
  if (!pole.mapa.odkazKalkulace && (Date.now() - (pole.poridano || 0)) > MAPA_OBNOVA_MS)
    pole = await pdPoleMapa(true);
  const hash = pole.mapa.odkazKalkulace;
  if (!hash) varovani.push('V Pipedrive chybí pole „Odkaz na kalkulaci“ (text) — odkaz se do dealu nezapsal.');
  else if (pdHodnota(cf[hash]).trim() === odkaz) odkazDoDealu = 'beze-zmeny';
  else {
    try {
      await pdZavolej('/api/v2/deals/' + Number(dealId), { metoda: 'PATCH', telo: { custom_fields: { [hash]: odkaz } } });
      odkazDoDealu = 'zapsano';
      try { await (await uloziste(PD_CACHE_ULOZISTE)).smaz('deal:' + dealId); } catch (e) { /* cache detailu jen zestárne */ }
    } catch (e) {
      varovani.push('Odkaz se do dealu nezapsal: ' + ((e instanceof PdChyba) ? e.message : 'chyba spojení') + ' Kalkulace je uložená.');
    }
  }
  const z = vysledek.zmena;
  return json({ ok: true, akce: vysledek.akce, dealId, soubor: jmeno, odkaz,
    zmeneno: z.zmeneno, ponechano: z.ponechano, zamceno: z.zamceno, odkazDoDealu, varovani,
    pozn: 'Cena se z Pipedrive nepřebírá — nabídku vygeneruje obchodník v kalkulaci.' });
}

export const config = { path: '/api/pd/webhook' };
