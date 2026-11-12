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
import { aresNacti, aresIcoNorm, aresPoleHlavicky, ARES_SIT } from '../lib/ares_server.mjs';
import {
  pdVazbaNorm, pdOdmitnuto, pdRejstrikZapis, pdProtokol, pdPoleText, pdOrgText, pdOrgHodnoty, pdOrgRozdily, pdIcoShoda,
} from '../lib/pd_vazba.mjs';
import { zakazkaPrijmi } from '../lib/zakazka_kontrola.mjs';
import { pdPoleMapa } from './pd_pole.mjs';
import {
  pdWebhookKlic, pdWebhookKlicZPozadavku, pdWebhookKlicSedi, pdWebhookDealId, pdWebhookZadani,
  pdWebhookHlavicka, pdWebhookPouzij, pdWebhookVolbaText, pdWebhookZamkyPoruseny, pdWebhookCisloKlic, pdWebhookOdkaz,
  pdWebhookOtisk, PD_WEBHOOK_POLE_ARES,
  PD_WEBHOOK_MAX, PD_WEBHOOK_TELO_MAX, PD_WEBHOOK_AUTOR, PD_WEBHOOK_AUTOR_JMENO, PD_WEBHOOK_ULOZISTE,
  PD_WEBHOOK_KLIC_PROMENNA,
} from '../lib/pd_webhook.mjs';

/* Mapa polí bez „Odkazu na kalkulaci“ se obnoví nejvýš jednou za 15 min
 * (pole mohl integrátor právě založit; obnova stojí 20 tokenů). */
const MAPA_OBNOVA_MS = 15 * 60 * 1000;

async function bezpecne(cesta) {
  try { return await pdZavolej(cesta); } catch (e) { return null; }
}

const rejstrikZapis = (s, ULO, zak, jmeno, razitko) => pdRejstrikZapis(s, ULO, vyhradne, zak, jmeno, razitko, PD_WEBHOOK_AUTOR);

/* Hlavička strany je zmrazená (zamčená varianta, nebo po tisku SoD / odeslané
 * CN podle zamekZakCestaZmrazena) — webhook ji nemění a ARES se pak nevolá. */
function hlavickaZmrazena(zak, strana) {
  if (!zak) return false;
  const zam = (v) => !!(globalThis.variantaUzamcena ? globalThis.variantaUzamcena(v) : (v && v.zamek && v.zamek.zamceno));
  if ((zak.varianty || []).some(zam)) return true;
  const f = globalThis.zamekZakCestaZmrazena;
  if (strana === 'proj' || typeof f !== 'function') return false;
  return ['nazevAkce', 'adresa', 'objednatel', 'adresaObjednatele', 'ico', 'dic', 'kontakt'].some((k) => !!f(zak, 'ZAK.' + k));
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
  /* ODMÍTNUTÝ DEAL (K40c #581): vazbu na tento deal autor nebo administrátor
   * u kalkulace zrušil (překlep v čísle nabídky) — PŘED jakýmkoli zápisem
   * (zakázka, index, odkaz v dealu) i před dotazem do ARES. */
  if (stara && pdOdmitnuto(stara, dealId))
    return json({ ok: false, chyba: 'Deal ' + dealId + ' byl u kalkulace ' + String(pdWebhookHlavicka(JSON.parse(JSON.stringify(stara)), zadani.strana).cislo || jmeno)
      + ' odmítnut (vazbu zrušil autor nebo administrátor). Nic se nezměnilo — opravte číslo nabídky v Pipedrive.' }, 409);
  /* Vlastník dealu (#115 B): CN v dealu musí sedět s číslem navázané kalkulace. */
  if (stara && cnDealu) {
    const h = pdWebhookHlavicka(JSON.parse(JSON.stringify(stara)), zadani.strana);
    if (pdWebhookCisloKlic(h.cislo) && pdWebhookCisloKlic(h.cislo) !== pdWebhookCisloKlic(cnDealu))
      return json({ ok: false, chyba: 'Deal patří jiné nabídce: v Pipedrive je číslo nabídky ' + cnDealu
        + ', navázaná kalkulace má ' + String(h.cislo || '') + '. Nic se nezměnilo.' }, 409);
  }

  /* 5b) ARES (K40c #581, B208): firma podle IČO organizace dealu — jen při
   * nové vazbě nebo změně IČO proti otisku, nikdy u zmrazené hlavičky.
   * Výpadek nic neshodí: zůstanou údaje z dealu a varování. */
  const kdy = new Date().toISOString();
  const vazbaStara = stara ? pdVazbaNorm(stara.pdVazbaWebhook) : null;
  const novaVazba = !stara || norm(stara.pdDealId) !== dealId;
  const vazbaPlati = !novaVazba && vazbaStara && vazbaStara.deal === dealId && vazbaStara.stav !== 'zruseno' ? vazbaStara : null;
  const icoSurove = String(nase.ico || '').trim();
  const icoOtisk = icoSurove ? pdWebhookOtisk(aresIcoNorm(icoSurove) || icoSurove) : '';
  const zmrazena = hlavickaZmrazena(stara, zadani.strana);
  let ares = vazbaPlati ? vazbaPlati.ares : '';
  let aresVolano = false, subjekt = null;
  if (!zmrazena && icoSurove && (!vazbaPlati || vazbaPlati.icoOtisk !== icoOtisk)) {
    const r = await aresNacti(icoSurove, { fetch: ARES_SIT.fetch });
    aresVolano = true; ares = r.stav; subjekt = r.subjekt || null;
  }
  if (aresVolano && subjekt) Object.assign(zadani.pole, aresPoleHlavicky(subjekt));
  else if (!aresVolano && ares === 'ok') for (const k of PD_WEBHOOK_POLE_ARES) zadani.pole[k] = '';   // firmu drží ARES, deal ji nepřepíše
  let aresRozdily = vazbaPlati ? vazbaPlati.aresRozdily : [];
  if (aresVolano) aresRozdily = subjekt ? pdOrgRozdily(pdOrgHodnoty(organizace, pole.mapaOrganizace, pdHodnota), subjekt).rozdily.map((x) => x.klic) : [];
  if (aresVolano && ares === 'neplatne') varovani.push('IČO organizace dealu neprojde kontrolní číslicí — do ARES se neposlalo, firma je z dealu.');
  else if (aresVolano && ares === 'nenalezeno') varovani.push('ARES subjekt s IČO organizace dealu nevede — firma je z dealu, ověřte ji v kalkulaci.');
  else if (aresVolano && ares === 'vypadek') varovani.push('ARES neodpověděl včas — firma je z dealu, ověřte ji v kalkulaci tlačítkem „Najít firmu v ARES“.');
  if (subjekt && subjekt.zanikla) varovani.push('Subjekt je v ARES zaniklý' + (subjekt.datumZaniku ? ' (' + subjekt.datumZaniku + ')' : '') + ' — údaje převzaty, zkontrolujte zákazníka.');
  if (aresRozdily.length && aresVolano) varovani.push('Organizace v Pipedrive se liší od ARES: ' + pdOrgText(aresRozdily) + '.');

  /* 6) ZÁPIS KALKULACE — ve výhradním úseku zakázky (vzor SEC-S1). */
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
    const zmena = pdWebhookPouzij(zak, zadani, dealId, kdy, { hlavickaZmrazena: zmrazena });
    const bezVazby = norm(zak.pdDealId) !== dealId;
    if (bezVazby) zak.pdDealId = dealId;
    /* VAZBA Z WEBHOOKU (K40c): navázání EXISTUJÍCÍ kalkulace čeká na „V pořádku“
     * (upozornění při otevření); kalkulace založená webhookem ne. */
    const doplneno = zmena.zmeneno.slice();
    const vazba = { deal: dealId, kdy: vazbaPlati && vazbaPlati.kdy ? vazbaPlati.kdy : kdy, cislo: zadani.cislo, strana: zadani.strana,
      stav: vazbaPlati ? vazbaPlati.stav : (stara ? 'ceka' : 'webhook'), ares, icoOtisk: aresVolano ? icoOtisk : (vazbaPlati ? vazbaPlati.icoOtisk : ''),
      aresRozdily, doplneno: vazbaPlati ? [...new Set(vazbaPlati.doplneno.concat(doplneno))] : doplneno };
    if (subjekt ? subjekt.zanikla : (vazbaPlati && vazbaPlati.zanikla && !aresVolano)) vazba.zanikla = true;
    if (vazbaPlati && vazbaPlati.nahlaseno) vazba.nahlaseno = vazbaPlati.nahlaseno;
    if (pdIcoShoda(icoSurove, pdWebhookHlavicka(zak, zadani.strana).ico).ok) vazba.icoShoda = true;
    zak.pdVazbaWebhook = pdVazbaNorm(vazba);
    if (stara && !bezVazby && !zmena.zmeneno.length && JSON.stringify(zak.pdZadani) === JSON.stringify(stara.pdZadani)
        && JSON.stringify(zak.pdVazbaWebhook) === JSON.stringify(pdVazbaNorm(stara.pdVazbaWebhook)))
      return { akce: 'bezeZmeny', zmena };   // opakované doručení: nic se nezapisuje, razítko zůstává
    /* PROTOKOL ZAKÁZKY (K40c): kdo pipedrive-webhook, deal, číslo, doplněná
     * pole a výsledek ARES — jen názvy polí, žádné kontakty ani hodnoty. */
    const aresVeta = !aresVolano ? '' : ({ ok: 'firma ověřena v ARES' + (aresRozdily.length ? ' (v Pipedrive se liší: ' + pdOrgText(aresRozdily) + ')' : ''),
      neplatne: 'IČO neprojde kontrolní číslicí — firma z dealu', nenalezeno: 'IČO v ARES není — firma z dealu',
      vypadek: 'ARES neodpověděl — firma z dealu' }[ares] || '');
    pdProtokol(zak, PD_WEBHOOK_AUTOR, (bezVazby ? (stara ? 'Navázáno na deal ' + dealId + ' podle čísla nabídky ' + zadani.cislo
      : 'Založeno z dealu ' + dealId + ' (číslo nabídky ' + zadani.cislo + ')') : 'Aktualizace z dealu ' + dealId)
      + '; doplněno: ' + (pdPoleText(zmena.zmeneno) || 'nic')
      + (zmena.ponechano.length ? '; ponecháno (kalkulace má jinou hodnotu): ' + pdPoleText(zmena.ponechano) : '')
      + (aresVeta ? '; ' + aresVeta : ''));
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
    ares, aresDotaz: aresVolano, aresRozdily,
    pozn: 'Cena se z Pipedrive nepřebírá — nabídku vygeneruje obchodník v kalkulaci.' });
}

export const config = { path: '/api/pd/webhook' };
