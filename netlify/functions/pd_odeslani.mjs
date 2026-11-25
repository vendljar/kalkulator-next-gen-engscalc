/* Zápis ODESLÁNÍ nabídky do dealu v Pipedrive (PO #116 CRM-17, J. V. 24. 11. 2026).
 *
 * POST /api/pd/odeslani { soubor, varianta, zamekKdy, akce: 'nahled', zdroje? }
 *   → 200 { ok, rezim, deal, radky, poznamka, soubor, stav, otisk, zapisPovolen, nicKZapisu, zastaveno, varovani }
 * POST … { akce: 'zapis', otisk }            → 200 { ok, stav: 'zapsano', zapsano, poznamka, razitko, varovani }
 * POST … { akce: 'soubor', obsah: base64 }   → 200 { ok, stav: 'zapsano', nazev, uz?, razitko }
 *   400 neplatný požadavek / soubor není docx, 401/403 přihlášení / původ / právo crm.pipedrive / kdo nesmí,
 *   404 zakázka, 409 zámek ještě není uložený (kod 'zamekNeulozen'), nejde o cenovou nabídku, bez dealu,
 *   vazba neověřená, zastaveno (ztracený deal, cizí CN), změna od náhledu (kod 'zmeneno'),
 *   413 soubor nad limit, 429 strop, 502/504 Pipedrive, 503 napojení nenastavené / zápis vypnutý.
 *
 * Pravidla (vzor zápisu prodeje #597, functions/pd_prodej.mjs):
 *   · zapisuje jen ODESLANÁ varianta — zamčená poprvé cenovou nabídkou, zámek
 *     uložený na serveru (zamekKdy z prohlížeče se musí shodovat);
 *   · kdo smí: administrátor, vedoucí, autor zakázky, kdo nabídku odeslal
 *     (zamek.zpracovatel — snímek serveru z relace, #665); k tomu crm.pipedrive;
 *   · deal jen z uložené zakázky a s platnou vazbou (pd_overeni.mjs);
 *   · pole, hodnotu, fázi a poznámku skládá server z uložené zakázky;
 *     od klienta jen popisky zdroje a soubor Wordu (ověří se tvar a velikost,
 *     název skládá server);
 *   · souběh: otisk náhledu (deal, update_time, PATCH, zámek, poznámka);
 *   · fáze jen dopředu, stav dealu nikdy; cizí číslo nabídky v dealu zastaví
 *     (převzetí dealu zůstává jen u prodeje);
 *   · výsledek kroků do zak.pdOdeslani (pole / poznámka / soubor) a protokolu —
 *     tisk nabídky to nikdy neblokuje, kroky jde opakovat. */
import { uloziste, json, vyhradne } from '../lib/sdilene.mjs';
import { jadro, jadroChyba } from '../lib/jadro.mjs';
import {
  pdPristup, pdNastaveno, pdRezim, pdZavolej, PdChyba, pdStropCerstvych, pdZapisPovolen, PD_ZAPIS_VYPNUTY, PD_DEAL_MAX, PD_CACHE_ULOZISTE,
} from '../lib/pipedrive.mjs';
import { POLE_DEALU, pdHodnota } from '../lib/pd_mapa.mjs';
import { pdZamyslenyZapis, pdFazeNajdi } from '../lib/pd_prevod.mjs';
import { pdDealPatriZakazce } from '../lib/pd_overeni.mjs';
import { pdWebhookOdkaz } from '../lib/pd_webhook.mjs';
import { pdRejstrikZapis, pdProtokol } from '../lib/pd_vazba.mjs';
import { pdPoznamkaObsah, pdPoznamkaZnacka, pdPoznamkaOtisk, pdPoznamkaZapisDruhu, PD_POZNAMKA_DRUH_ODESLANI } from '../lib/pd_poznamka.mjs';
import { pdPoleMapa } from './pd_pole.mjs';
import { pdNanecistoStrana } from './pd_nanecisto.mjs';
import { pdProdejZmeny, pdProdejCnSedi, pdProdejOznacRadky, pdProdejChybaVeta } from '../lib/pd_prodej.mjs';
import {
  PD_ODESLANI_POLE, PD_ODESLANI_TYPY, PD_ODESLANI_STROP, PD_ODESLANI_VOLANI_MS, PD_ODESLANI_CELKEM_MS, PD_ODESLANI_SOUBOR_MS,
  pdOdeslaniDefinice, pdOdeslaniVarianta, pdOdeslaniStrany, pdOdeslaniFazeKonfigurace, pdOdeslaniFaze, pdOdeslaniPoznamkaText,
  pdOdeslaniOtisk, pdOdeslaniDocx, pdOdeslaniNazevSouboru, pdOdeslaniZaznam, pdOdeslaniKrok, pdOdeslaniVariantaStav,
  pdOdeslaniZastaveni, pdOdeslaniJinyZakaznik,
} from '../lib/pd_odeslani.mjs';

const SOUBOR_TVAR = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;
const VARIANTA_TVAR = /^[A-Za-z0-9._:-]{1,80}$/;
const TELO_MAX = 512 * 1024;
const TELO_SOUBOR_MAX = 6 * 1024 * 1024;
const OTISK_TVAR = /^[0-9a-f]{32}$/;
const ROLE_VZDY = ['Administrátor', 'Vedoucí'];

let PD_JADRO = null;
function jadroPd() {
  if (!PD_JADRO) PD_JADRO = import('../lib/jadro_pd.cjs');
  return PD_JADRO;
}

/* Kdo smí zapsat odeslání: administrátor, vedoucí, autor zakázky, kdo nabídku odeslal. */
export function pdOdeslaniSmi(zak, v, relace) {
  const r = relace || {};
  if (ROLE_VZDY.includes(r.role)) return true;
  const ja = String(r.email || '').trim().toLowerCase();
  if (!ja) return false;
  const odeslal = v && v.zamek && v.zamek.zpracovatel && v.zamek.zpracovatel.email;
  return String((zak && zak.autor) || '').trim().toLowerCase() === ja
    || String(odeslal || '').trim().toLowerCase() === ja;
}

function volani(celkemMs = PD_ODESLANI_CELKEM_MS) {
  const konec = Date.now() + celkemMs;
  return (cesta, volby = {}, mezMs = PD_ODESLANI_VOLANI_MS) => {
    const zbyva = konec - Date.now();
    if (zbyva < 200) throw new PdChyba('Pipedrive neodpověděl včas — zápis se nedokončil (časový limit).', 504);
    return pdZavolej(cesta, { ...volby, casLimitMs: Math.min(mezMs, zbyva), pokusu: 1 });
  };
}
const chybaPd = (e) => json({ ok: false, chyba: e.message }, (e.stav >= 500 || e.stav === 401) ? 502 : e.stav);

export default async (req) => {
  const { chyba, relace } = await pdPristup(req);
  if (chyba) return chyba;
  if (req.method !== 'POST') return json({ ok: false, chyba: 'Použijte POST.' }, 405);
  let telo;
  try {
    const text = await req.text();
    if (text.length > TELO_SOUBOR_MAX) return json({ ok: false, chyba: 'Soubor nabídky je pro přiložení příliš velký — přiložte ho k dealu ručně.' }, 413);
    telo = JSON.parse(text || 'null');
    if (telo && telo.akce !== 'soubor' && text.length > TELO_MAX) return json({ ok: false, chyba: 'Podklad zápisu je příliš velký.' }, 413);
  } catch (e) { return json({ ok: false, chyba: 'Neplatný JSON.' }, 400); }
  if (!telo || typeof telo !== 'object' || Array.isArray(telo)) return json({ ok: false, chyba: 'Neplatný požadavek.' }, 400);
  const soubor = typeof telo.soubor === 'string' ? telo.soubor : '';
  const varId = typeof telo.varianta === 'string' ? telo.varianta : '';
  const zamekKdy = typeof telo.zamekKdy === 'string' ? telo.zamekKdy.slice(0, 40) : '';
  const akce = ['nahled', 'zapis', 'soubor'].includes(telo.akce) ? telo.akce : '';
  if (!SOUBOR_TVAR.test(soubor) || !VARIANTA_TVAR.test(varId) || !zamekKdy || !akce)
    return json({ ok: false, chyba: 'Chybí zakázka, varianta, zámek nebo akce.' }, 400);
  if (telo.stav !== undefined || telo.status !== undefined)
    return json({ ok: false, chyba: 'Odeslání nabídky stav dealu nemění.' }, 400);
  const otiskKlienta = typeof telo.otisk === 'string' ? telo.otisk : '';
  if (akce === 'zapis' && !OTISK_TVAR.test(otiskKlienta))
    return json({ ok: false, chyba: 'Chybí potvrzení náhledu — nejdřív zobrazte, co se zapíše.' }, 400);
  const zdroje = {};
  for (const k of ['ock', 'proj']) zdroje[k] = (pdNanecistoStrana({ hodnoty: telo.zdroje && telo.zdroje[k] }) || {}).hodnoty || {};

  let ULO, JEKLY;
  try { ({ ULO, JEKLY } = await jadro()); await jadroPd(); } catch (e) { PD_JADRO = null; return jadroChyba(e); }
  /* Word se rozbalí až v zpracuj — po právech k zakázce a stropu pokusů (dorevize D3). */
  const obsah = akce === 'soubor' ? telo.obsah : null;
  if (akce === 'soubor' && (typeof obsah !== 'string' || !obsah)) return json({ ok: false, chyba: 'Soubor nabídky chybí nebo není v pořádku.' }, 400);
  const G = globalThis;
  const s = await uloziste('zakazky');
  const prvni = await s.cti('z/' + soubor);
  if (!prvni || typeof prvni !== 'object') return json({ ok: false, chyba: 'Zakázka nenalezena.' }, 404);
  const dealPredem = G.ctrlPdDealIdNorm(prvni.pdDealId) || '';
  const ctx = { req, relace, s, soubor, varId, zamekKdy, akce, otiskKlienta, obsah, zdroje, ULO, JEKLY, G };
  /* Zápis do téhož dealu jeden po druhém (vzor PV S2). */
  if (akce !== 'nahled' && dealPredem) return vyhradne('pd_odeslani/deal:' + dealPredem, () => zpracuj(ctx));
  return zpracuj(ctx);
};

async function zpracuj({ req, relace, s, soubor, varId, zamekKdy, akce, otiskKlienta, obsah, zdroje, ULO, JEKLY, G }) {
  const ulozena = await s.cti('z/' + soubor);
  if (!ulozena || typeof ulozena !== 'object') return json({ ok: false, chyba: 'Zakázka nenalezena.' }, 404);
  const vv = pdOdeslaniVarianta(ulozena, varId, zamekKdy);
  if (vv.chyba) return json({ ok: false, kod: vv.kod, chyba: vv.chyba }, vv.status);
  const v = vv.v;
  if (!pdOdeslaniSmi(ulozena, v, relace))
    return json({ ok: false, chyba: 'Odeslání nabídky do Pipedrive zapisuje autor zakázky, kdo nabídku odeslal, vedoucí nebo administrátor.' }, 403);
  const deal = G.ctrlPdDealIdNorm(ulozena.pdDealId) || '';
  if (!deal) return json({ ok: false, kod: 'bezDealu', chyba: 'Zakázka není navázaná na deal v Pipedrive — do Pipedrive se nic nezapsalo (nabídka platí).' }, 409);
  if (!pdNastaveno()) return json({ ok: false, chyba: 'Napojení na Pipedrive není nastavené — zápis nejde připravit.' }, 503);
  const kdo = String(relace.jmeno || relace.email || '');
  /* K58-N1: číslo z papíru; starý zámek PROJ s číslem OCK ukáže číslo PROJ (zamekCisloZobraz). */
  const cisloPapir = String((typeof G.zamekCisloZobraz === 'function' ? G.zamekCisloZobraz(ulozena, v) : v.zamek.cislo)
    || (typeof G.variantaCislo === 'function' ? G.variantaCislo(ulozena, v) : '') || '');

  /* Výsledek kroku do zak.pdOdeslani (po variantách, R2) a protokolu.
   * Vrací nové razítko, nebo '' = nic se nezapsalo (zámek mezitím odemčen). */
  const zaznamenej = async (zmena, veta) => {
    const r = await vyhradne('zakazky/z/' + soubor, async () => {
      const zak = await s.cti('z/' + soubor);
      const x = zak && (zak.varianty || []).find((y) => y && y.id === varId);
      if (!x || !x.zamek || x.zamek.kdy !== zamekKdy) return {};   // zámek mezitím odemčen — nic se nepřipisuje
      const rec = pdOdeslaniZaznam(zak[PD_ODESLANI_POLE], deal);
      zmena(rec, pdOdeslaniVariantaStav(rec, varId, zamekKdy, true));
      zak[PD_ODESLANI_POLE] = rec;
      if (veta) pdProtokol(zak, kdo, veta);
      const razitko = ULO.uloRazitkoNove();
      zak.uloRazitko = razitko;
      await s.zapis('z/' + soubor, zak);
      return { zak, razitko };
    });
    if (r.zak) await pdRejstrikZapis(s, ULO, vyhradne, r.zak, soubor, r.razitko, String(relace.email || ''));
    return r.razitko || '';
  };
  const krokKlic = akce === 'soubor' ? 'soubor' : 'pole';

  const strop = akce === 'nahled'
    ? await pdStropCerstvych(relace.email, 'odeslani', PD_DEAL_MAX)
    : await pdStropCerstvych('deal:' + deal, 'odeslani-zapis', PD_ODESLANI_STROP);
  if (!strop) return json({ ok: false, chyba: akce === 'nahled' ? 'Náhled zápisu jste za poslední hodinu spustili příliš často. Zkuste to později.'
    : 'Zápis odeslání do tohoto dealu byl za poslední hodinu zkoušen příliš často.' }, 429);
  /* B235/B236: bez PIPEDRIVE_ZAPIS = ano se do skutečného Pipedrive nic nezapíše. */
  if (akce !== 'nahled' && !pdZapisPovolen()) {
    const razitko = await zaznamenej((rec, e) => { e[krokKlic] = pdOdeslaniKrok('chyba', PD_ZAPIS_VYPNUTY); },
      'Zápis odeslání nabídky do dealu ' + deal + ' se neprovedl: ' + PD_ZAPIS_VYPNUTY);
    return json({ ok: false, stav: 'chyba', chyba: PD_ZAPIS_VYPNUTY, razitko }, 503);
  }
  /* Word: rozbalení a kontrola obsahu až tady — po právech a stropu (dorevize D3), před sítí. */
  let docx = null;
  if (akce === 'soubor') {
    docx = await pdOdeslaniDocx(obsah, G);
    if (docx.chyba) return json({ ok: false, chyba: docx.chyba, ...(docx.vady ? { vady: docx.vady } : {}) }, docx.status);
  }

  const zavolej = volani();
  const varovani = [];
  if (pdRezim() === 'simulator') varovani.push('Odpovídá SIMULÁTOR Pipedrive se smyšlenými daty — nic z toho není skutečné CRM.');
  const selhani = async (status, klic, text, podrobnost = '', extra = {}) => {
    const razitko = await zaznamenej((rec, e) => { e[klic] = pdOdeslaniKrok('chyba', text); },
      'Zápis odeslání nabídky do dealu ' + deal + ' se nepovedl (' + ({ pole: 'údaje dealu', soubor: 'soubor' }[klic]) + '): ' + text);
    return json({ ok: false, stav: 'chyba', chyba: text, ...(podrobnost && podrobnost !== text ? { podrobnost } : {}), razitko, ...extra }, status);
  };

  let pole, dealData;
  try {
    pole = await pdPoleMapa();
    const ov = await pdDealPatriZakazce(ulozena, deal, { zavolej: (c) => zavolej(c), poleMapa: async () => pole,
      odkaz: pdWebhookOdkaz(soubor, req) }, G);
    if (!ov.ok) return akce === 'nahled' ? json({ ok: false, stav: 'neovereno', chyba: ov.duvod }, 409)
      : selhani(409, krokKlic, ov.duvod, '', { kod: 'neovereno' });
    dealData = await zavolej('/api/v2/deals/' + Number(deal));
    if (!dealData || typeof dealData !== 'object') throw new PdChyba('Pipedrive deal zakázky nezná.', 404);
  } catch (e) {
    if (e instanceof PdChyba) return akce === 'nahled' ? chybaPd(e) : selhani(e.stav === 404 ? 404 : 502, krokKlic, pdProdejChybaVeta(e), e.message);
    throw e;
  }

  /* Zastavení platí pro zápis I soubor (revize PO R1): ztracený / smazaný deal,
   * cizí číslo nabídky, první tisk dalšímu zákazníkovi (R4). */
  const mapa = (pole && pole.mapa) || {};
  const cnDealu = mapa.cisloNabidky ? pdHodnota(((dealData.custom_fields || {})[mapa.cisloNabidky])).trim() : '';
  const cisloZak = String((typeof G.zakazkaCisloVedouci === 'function' ? G.zakazkaCisloVedouci(ulozena) : ulozena.cislo) || '');
  const cizi = cnDealu && !pdProdejCnSedi(cisloZak, cnDealu, ulozena) ? cnDealu : '';
  const jinyZakaznik = pdOdeslaniJinyZakaznik(ulozena, v, G);
  const zastaveno = pdOdeslaniZastaveni(dealData, cizi, jinyZakaznik);
  const rec = ulozena[PD_ODESLANI_POLE] && ulozena[PD_ODESLANI_POLE].deal === deal ? ulozena[PD_ODESLANI_POLE] : null;
  const recTento = rec ? pdOdeslaniVariantaStav(rec, varId, zamekKdy) : null;

  if (akce === 'soubor') {
    if (zastaveno) return selhani(409, 'soubor', zastaveno, '', { kod: 'zastaveno' });
    /* R5: Word jde k dealu až po potvrzeném a zapsaném náhledu (údaje dealu). */
    if (!(recTento && recTento.pole && recTento.pole.stav === 'zapsano'))
      return json({ ok: false, kod: 'nejdrivZapis', chyba: 'Word se k dealu přikládá až po potvrzení a zápisu odeslání do Pipedrive.' }, 409);
    return souborKrok({ ulozena, v, deal, cisloPapir, docx, zavolej, zaznamenej, selhani, recTento, G });
  }

  let uzivatele, fazeSeznam;
  try {
    const u = await zavolej('/api/v1/users');
    uzivatele = Array.isArray(u) ? u.map((x) => ({ id: x.id, name: String(x.name || '') || ('uživatel Pipedrive ' + x.id), email: x.email })) : undefined;
    const f = await zavolej('/api/v2/stages', { dotaz: { limit: 500 } });
    fazeSeznam = Array.isArray(f) ? f.map((x) => ({ id: x.id, name: x.name, pipeline_id: x.pipeline_id, order_nr: x.order_nr })) : [];
  } catch (e) {
    if (e instanceof PdChyba) return akce === 'zapis' ? selhani(e.stav === 404 ? 404 : 502, 'pole', pdProdejChybaVeta(e), e.message) : chybaPd(e);
    throw e;
  }

  /* Datum nabídky = datum zámku (nabidkaDatum, DT #745): poznámka i pole „Datum nabídky“ (#763). */
  const datum = typeof G.nabidkaDatum === 'function' ? G.nabidkaDatum(ulozena, v) : String(v.zamek.datumNabidky || '');
  const podklad = pdOdeslaniStrany(ulozena, v, G, JEKLY, datum);
  if (podklad.chyba) return json({ ok: false, chyba: podklad.chyba }, 409);
  const z = pdZamyslenyZapis(pdOdeslaniDefinice(POLE_DEALU), podklad.strany, pole, { uzivatele, mena: 'CZK', deal: dealData }, {}, zdroje);
  const faze = pdOdeslaniFaze(fazeSeznam, dealData, pdOdeslaniFazeKonfigurace(), pdFazeNajdi);
  /* R3 (doporučení revize, rozhodne J. V. #765): prodaná zakázka nebo vyhraný
   * deal — hodnotu ani pole krycího listu NEPOSÍLAT (deal nese prodej / SoD),
   * jen poznámka a Word. */
  const prodana = typeof G.prodStav === 'function' && !!G.prodStav(ulozena);
  const jenPoznamka = prodana || String(dealData.status || '') === 'won'
    ? (prodana ? 'zakázka je prodaná' : 'deal je vyhraný') + ' — údaje dealu se nemění, zapíše se jen poznámka (a Word)' : '';
  let patch = z.patch && !jenPoznamka ? JSON.parse(JSON.stringify(z.patch)) : null;
  if (patch && faze.stageId) patch.stage_id = faze.stageId;
  const zmeny = patch ? pdProdejZmeny(patch, dealData) : { patch: null, klice: [], hodnota: false, faze: false };
  if (zmeny.patch && zmeny.patch.status !== undefined) delete zmeny.patch.status;   // stav dealu nikdy (pojistka)
  const radkyVse = z.radky.concat([faze.radek]).map((r) => (jenPoznamka && r.stav === 'zapise'
    ? Object.assign({}, r, { stav: 'ponechano', duvod: jenPoznamka }) : r));
  const radky = pdProdejOznacRadky(radkyVse, mapa, zmeny);

  /* Poznámka: všechny odeslané varianty s cenou, šachty, zpracovatel, odkaz. */
  const odeslane = (ulozena.varianty || []).filter((x) => x && x.zamek && x.zamek.zamceno === true && PD_ODESLANI_TYPY.includes(x.zamek.typ));
  const varianty = odeslane.map((x) => {
    const p = x.id === v.id ? podklad : pdOdeslaniStrany(ulozena, x, G, JEKLY);
    return { nazev: x.nazev || '', cislo: (typeof G.zamekCisloZobraz === 'function' ? G.zamekCisloZobraz(ulozena, x) : x.zamek.cislo) || '', ridici: x.id === v.id,
      ock: p.strany && p.strany.ock ? p.strany.ock.cena : undefined, proj: p.strany && p.strany.proj ? p.strany.proj.cena : undefined };
  });
  const zpr = v.zamek.zpracovatel && typeof v.zamek.zpracovatel === 'object' ? v.zamek.zpracovatel : null;
  const poznamkaText = pdOdeslaniPoznamkaText({ cislo: cisloPapir, datum, varianty, sachty: podklad.sachty,
    vypracoval: zpr ? [zpr.titul, zpr.jmeno].filter(Boolean).join(' ') : '', odkaz: pdWebhookOdkaz(soubor, req), znacka: pdPoznamkaZnacka(ulozena) });
  const otisk = pdOdeslaniOtisk(deal, dealData.update_time, zmeny.patch, zamekKdy, poznamkaText);
  const zapsanoNazvy = radky.filter((r) => r.posle).map((r) => r.nazev);

  if (akce === 'nahled') {
    return json({ ok: true, rezim: pdRezim(), deal: { id: dealData.id, nazev: dealData.title || '', stav: dealData.status || '', faze: dealData.stage_id || null },
      radky, poznamka: poznamkaText, datum, cislo: cisloPapir, otisk, zapisPovolen: pdZapisPovolen(), nicKZapisu: !zmeny.patch,
      zastaveno, jenPoznamka, cizi: cizi ? { cislo: cizi } : null, stav: recTento, poznamkaStav: rec && rec.poznamka ? rec.poznamka : null, varovani });
  }

  /* ---------- ZÁPIS (pole + hodnota + fáze, pak poznámka) ---------- */
  if (zastaveno) return selhani(409, 'pole', zastaveno, '', { kod: 'zastaveno' });
  if (otiskKlienta !== otisk)
    return json({ ok: false, kod: 'zmeneno', chyba: 'Deal v Pipedrive nebo podklad zápisu se od náhledu změnil — nic se nezapsalo. '
      + 'Zobrazte náhled znovu a potvrďte nové hodnoty.' }, 409);
  try {
    if (zmeny.patch) await zavolej('/api/v2/deals/' + Number(deal), { metoda: 'PATCH', telo: zmeny.patch });
  } catch (e) {
    if (e instanceof PdChyba) return selhani(e.stav === 504 ? 504 : 502, 'pole', pdProdejChybaVeta(e), e.message);
    throw e;
  }
  try { await (await uloziste(PD_CACHE_ULOZISTE)).smaz('deal:' + deal); } catch (e) { /* cache detailu jen zestárne */ }
  const kdyPole = new Date().toISOString();
  /* Poznámka: shodný otisk u téže poznámky = nic; jinak úprava / založení. */
  const notaOtisk = pdPoznamkaOtisk(poznamkaText);
  const notaStara = rec && rec.poznamka ? rec.poznamka : null;
  let nota;
  if (notaStara && notaStara.stav === 'zapsano' && notaStara.id && notaStara.otisk === notaOtisk) nota = { id: notaStara.id, akce: 'beze-zmeny' };
  else {
    try {
      nota = await pdPoznamkaZapisDruhu(deal, notaStara && notaStara.id ? notaStara.id : null, pdPoznamkaObsah(poznamkaText), ulozena,
        (c, o) => zavolej(c, o), PD_POZNAMKA_DRUH_ODESLANI);
    } catch (e) {
      if (!(e instanceof PdChyba)) throw e;
      nota = { chyba: pdProdejChybaVeta(e) };
    }
  }
  const veta = 'Zápis odeslání nabídky ' + cisloPapir + ' do dealu ' + deal + ': '
    + (zapsanoNazvy.length ? 'zapsáno — ' + zapsanoNazvy.join(', ') : jenPoznamka ? 'údaje dealu beze změny (' + jenPoznamka.split(' — ')[0] + ')' : 'deal už měl všechny hodnoty, nic se neměnilo')
    + (nota.chyba ? '; poznámka se nezapsala: ' + nota.chyba : nota.akce === 'beze-zmeny' ? '' : '; poznámka ' + (nota.akce === 'upraveno' ? 'upravena' : 'založena'));
  const razitko = await zaznamenej((rec2, e) => {
    e.pole = pdOdeslaniKrok('zapsano', '', {}, kdyPole);
    rec2.poznamka = nota.chyba ? pdOdeslaniKrok('chyba', nota.chyba, notaStara && notaStara.id ? { id: notaStara.id } : {})
      : pdOdeslaniKrok('zapsano', '', { id: nota.id, otisk: notaOtisk });
  }, veta);
  if (nota.chyba) varovani.push('Poznámka se k dealu nezapsala (' + nota.chyba + ') — údaje dealu zapsané jsou, poznámku jde zkusit znovu.');
  return json({ ok: true, stav: 'zapsano', zapsano: zapsanoNazvy, poznamka: nota.chyba ? 'chyba' : nota.akce, razitko, varovani });
}

/* ---------- SOUBOR NABÍDKY K DEALU ---------- */
async function souborKrok({ ulozena, v, deal, cisloPapir, docx, zavolej, zaznamenej, selhani, recTento, G }) {
  const datum = typeof G.nabidkaDatum === 'function' ? G.nabidkaDatum(ulozena, v) : String(v.zamek.datumNabidky || '');
  const nazev = pdOdeslaniNazevSouboru(cisloPapir, datum);
  const velikost = docx.data.length;
  const tento = recTento ? recTento.soubor : null;
  if (tento && tento.stav === 'zapsano') return json({ ok: true, stav: 'zapsano', uz: true, nazev: tento.nazev || nazev });
  try {
    /* Revize PO R2: shodu názvu a velikosti u dealu hledat VŽDY před nahráním
     * (nepotvrzený pokus, jiná varianta téhož čísla, nové odeslání po odemčení) —
     * Pipedrive nemá klíč idempotence. Čte se prvních 100 souborů dealu (B280). */
    const seznam = await zavolej('/api/v1/deals/' + Number(deal) + '/files', { dotaz: { limit: 100 } });
    const shoda = (Array.isArray(seznam) ? seznam : []).find((f) => f && String(f.name || f.file_name || '') === nazev && Number(f.file_size) === velikost);
    if (shoda) {
      const razitko = await zaznamenej((r, e) => { e.soubor = pdOdeslaniKrok('zapsano', '', { id: Number(shoda.id) || undefined, nazev, velikost }); },
        'Soubor nabídky ' + nazev + ' u dealu ' + deal + ' už je — označeno jako přiložené');
      return json({ ok: true, stav: 'zapsano', uz: true, nazev, razitko });
    }
  } catch (e) {
    if (e instanceof PdChyba) return selhani(e.stav === 504 ? 504 : 502, 'soubor', pdProdejChybaVeta(e), e.message);
    throw e;
  }
  /* R9: bez zapsaného stavu „zahájeno“ se nenahrává (zámek mezitím odemčen). */
  const zahajeno = await zaznamenej((r, e) => { e.soubor = pdOdeslaniKrok('zahajeno', '', { nazev, velikost }); }, '');
  if (!zahajeno) return json({ ok: false, kod: 'zamekNeulozen', chyba: 'Odeslaná nabídka se mezitím změnila (odemčení) — Word se nepřiložil.' }, 409);
  let vysl;
  try {
    const f = new FormData();
    f.append('file', new Blob([docx.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), nazev);
    f.append('deal_id', String(Number(deal)));
    vysl = await zavolej('/api/v1/files', { metoda: 'POST', formular: f }, PD_ODESLANI_SOUBOR_MS);
  } catch (e) {
    if (e instanceof PdChyba) return selhani(e.stav === 504 ? 504 : 502, 'soubor', e.stav === 413 ? 'Pipedrive soubor odmítl jako příliš velký — přiložte ho k dealu ručně.' : pdProdejChybaVeta(e), e.message);
    throw e;
  }
  const id = vysl && Number(vysl.id);
  const razitko = await zaznamenej((r, e) => { e.soubor = pdOdeslaniKrok('zapsano', '', { id: Number.isInteger(id) && id > 0 ? id : undefined, nazev, velikost }); },
    'Soubor nabídky ' + nazev + ' přiložen k dealu ' + deal);
  return json({ ok: true, stav: 'zapsano', nazev, razitko });
}

export const config = { path: '/api/pd/odeslani' };
