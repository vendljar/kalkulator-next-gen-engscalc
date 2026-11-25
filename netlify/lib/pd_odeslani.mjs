/* ============================================================
 * ODESLÁNÍ NABÍDKY DO DEALU V PIPEDRIVE — ČISTÁ LOGIKA (PO #116 CRM-17)
 *
 * Rozhodnutí J. V. 24. 11. 2026: při ODESLÁNÍ nabídky (první zamčení varianty
 * tiskem cenové nabídky OCK nebo PROJ — Word i tisk) se do navázaného dealu
 * po POTVRZENÍ obchodníkem v tabulce „dnes v Pipedrive / nově“ zapíše
 *   · pole krycího listu podle mapy polí (pd_mapa.mjs, jen směr „zapis“ —
 *     zákazník, adresa a kontakty jsou podle „KDO JE ZDROJEM“ z CRM a nepíšou
 *     se; bez sekcí smlouvy o dílo, PD_ODESLANI_BEZ_SOD), včetně Čísla nabídky,
 *   · hodnota dealu = cena odesílané varianty bez DPH (jako #597; kombinovaná
 *     OCK + PROJ = součet; DPH přenesená → volba 0 %),
 *   · fáze JEN DOPŘEDU: deal před fází „Nabídka odeslána“ (pořadí order_nr
 *     v pipeline, ne čísla id) se přesune do ní; deal v ní nebo dál zůstane
 *     (řádek „ponechá se“); stav dealu (status) nikdy,
 *   · poznámka „Nabídka odeslána: …“ (číslo, datum nabídky = datum zámku,
 *     varianty a ceny, šachty, kdo vypracoval, odkaz na kalkulaci) — jedna
 *     na zakázku a deal, opakování ji upraví,
 *   · vygenerovaný Word jako soubor k dealu (POST /api/v1/files).
 * Tady je jen logika bez sítě; tok, práva, vazbu, souběh a záznam stavu drží
 * functions/pd_odeslani.mjs.
 * ============================================================ */
import { createHash } from 'node:crypto';

export const PD_ODESLANI_POLE = 'pdOdeslani';
/* Dokumenty, jejichž PRVNÍ tisk = odeslání nabídky (ZAMEK_DOKUMENTY v zamek.js). */
export const PD_ODESLANI_TYPY = ['nabidka', 'nabidkaTisk', 'nabidkaProj', 'nabidkaProjTisk'];
/* Pole mapy, která patří smlouvě o dílo — při odeslání nabídky se nepíšou. */
/* PD2: podpisy, zmocnitel, Informováno a Platba 1–8 patří prodeji / SoD —
 * při odeslání nabídky se nepíšou; kontakty zákazníka ano (jen do prázdných). */
export const PD_ODESLANI_BEZ_SOD = ['datumPodpisu', 'platebniKalendar', 'spravniPoplatky', 'pokutaSoucinnost', 'kopie1', 'kopie2',
  'podpisFirma', 'podpis2', 'zmocnitel', 'informovanoBo', 'informovanoTech',
  'platba1', 'platba2', 'platba3', 'platba4', 'platba5', 'platba6', 'platba7', 'platba8'];
export const PD_ODESLANI_STROP = 20;          // pokusů o zápis na deal za hodinu (vzor PV)
export const PD_ODESLANI_VOLANI_MS = 2500;
export const PD_ODESLANI_CELKEM_MS = 8000;
export const PD_ODESLANI_SOUBOR_MS = 6000;    // nahrání souboru (jedno volání)
export const PD_ODESLANI_SOUBOR_MAX = 4 * 1024 * 1024;   // binárně; base64 v těle ~5,4 MB (strop Netlify ~6 MB)
export const PD_ODESLANI_DUVOD_MAX = 300;
export const PD_ODESLANI_POZNAMKA_MAX = 2000;
export const PD_FAZE_ODESLANO_NAZEV = 'Nabídka odeslána';
export const PD_FAZE_ODESLANO_PROMENNA = 'PIPEDRIVE_FAZE_ODESLANO';

const cisty = (x, max = 200) => String(x == null ? '' : x).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const denText = (iso) => (/^\d{4}-\d{2}-\d{2}/.test(String(iso || '')) ? String(iso).slice(0, 10).split('-').reverse().map((x) => String(+x)).join('. ') : '');
const castka = (n) => (Math.round(n * 100) / 100).toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).replace(/ /g, ' ') + ' Kč';

/* Definice polí mapy pro odeslání: všechna kromě sekcí SoD (směr „cteni“
 * převod sám přeskočí). */
export function pdOdeslaniDefinice(POLE_DEALU) {
  return POLE_DEALU.filter((d) => !PD_ODESLANI_BEZ_SOD.includes(d.klic));
}

/* Varianta k zápisu z ULOŽENÉ zakázky: zamčená, poprvé tiskem cenové nabídky
 * a zámek z téhož okamžiku jako v prohlížeči (zamekKdy). Vrací { v } nebo
 * { chyba, kod, status }. */
export function pdOdeslaniVarianta(zak, varId, zamekKdy) {
  const v = (zak && Array.isArray(zak.varianty) ? zak.varianty : []).find((x) => x && x.id === varId);
  if (!v) return { chyba: 'Varianta v uložené zakázce není.', kod: 'varianta', status: 404 };
  const z = v.zamek;
  if (!z || z.zamceno !== true || (zamekKdy && z.kdy !== zamekKdy))
    return { chyba: 'Odeslaná nabídka ještě není uložená na serveru — chvíli počkejte a zkuste to znovu.', kod: 'zamekNeulozen', status: 409 };
  if (!PD_ODESLANI_TYPY.includes(z.typ))
    return { chyba: 'Varianta nebyla odeslána cenovou nabídkou (poprvé ji zamkl jiný dokument) — do Pipedrive se jako odeslání nezapisuje.', kod: 'neniNabidka', status: 409 };
  return { v };
}

/* Podklad zápisu (krycí listy, cena) — odesílaná varianta jako řídící v kopii
 * zakázky, týž kód jako náhled v prohlížeči (pdnPodklad; vzor pdProdejStrany).
 * Cena zamčené varianty jde ze zmrazeného výsledku (vysledekStrany). */
/* `datumNabidky` (RRRR-MM-DD, #763) dostane každá strana — pole „Datum
 * nabídky“ mapy polí ho zapíše; neplatné datum se nepřidá. */
export function pdOdeslaniStrany(zak, v, G = globalThis, jekly = null, datumNabidky = '') {
  if (typeof G.pdnPodklad !== 'function') return { chyba: 'Serverová část pro zápis do Pipedrive se nenačetla.' };
  const kopie = JSON.parse(JSON.stringify(zak));
  (kopie.varianty || []).forEach((x) => { if (x) x.ridici = x.id === v.id; });
  kopie.aktivni = v.id;
  const pod = G.pdnPodklad(kopie, jekly, {});
  if (!pod || !pod.ok) return { chyba: (pod && pod.chyba) || 'Podklad zápisu nejde složit.' };
  const strany = {};
  for (const strana of ['ock', 'proj']) {
    const sv = pod.strany && pod.strany[strana];
    if (!sv) continue;
    const s = { hodnoty: sv.hodnoty || {}, rucne: sv.rucne || {}, mena: 'CZK' };
    if (strana === 'ock') s.atyp = sv.atyp === true;
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(datumNabidky || ''))) s.datumNabidky = String(datumNabidky);
    if (typeof sv.cena === 'number' && isFinite(sv.cena)) s.cena = Math.round(sv.cena * 100) / 100;
    strany[strana] = s;
  }
  if (!Object.keys(strany).length) return { chyba: 'Zakázka nemá stranu OCK ani PROJ, ze které by se dalo zapisovat.' };
  return { strany, sachty: (pod.strany && pod.strany.ock && pod.strany.ock.sachty) || '' };
}

/* Cílová fáze odeslání z prostředí: číslo = id fáze, jiný text = název. */
export function pdOdeslaniFazeKonfigurace(env = process.env) {
  const t = String((env || {})[PD_FAZE_ODESLANO_PROMENNA] || '').trim();
  if (/^[0-9]{1,10}$/.test(t) && +t > 0) return { id: +t, nazev: '', promenna: PD_FAZE_ODESLANO_PROMENNA };
  return { id: null, nazev: t.slice(0, 120) || PD_FAZE_ODESLANO_NAZEV, promenna: PD_FAZE_ODESLANO_PROMENNA };
}

/* Řádek „Fáze dealu“ pro odeslání: JEN DOPŘEDU podle pořadí fází v pipeline
 * (order_nr), stav dealu se nemění. `najdi` = pdFazeNajdi z pd_prevod.mjs.
 * Vrací { radek, stageId|null, zastaveno }. Ztracený / smazaný deal zastaví
 * celý zápis; vyhraný a deal v pozdější fázi jen fázi ponechá. */
export function pdOdeslaniFaze(fazeSeznam, deal, konf, najdi) {
  const seznam = (Array.isArray(fazeSeznam) ? fazeSeznam : []).filter((f) => f && +f.id > 0);
  const text = (f) => (f ? String(f.name || '') + ' (' + f.id + ')' : '');
  const aktualni = deal ? seznam.find((f) => +f.id === +deal.stage_id) : null;
  const cil = konf.id ? 'fáze id ' + konf.id : (konf.nazev || PD_FAZE_ODESLANO_NAZEV);
  const r = { klic: 'fazeDealu', nazev: 'Fáze dealu', typ: 'stage', strana: '', zdroj: 'Odeslání nabídky', hodnotaKalkulace: cil,
    hodnota: null, hodnotaText: '', stav: 'zapise', duvod: '', kolize: [],
    vCrm: deal ? (aktualni ? text(aktualni) : (deal.stage_id ? 'fáze ' + deal.stage_id : '')) : '' };
  const st = deal ? String(deal.status || '') : '';
  if (st === 'lost' || st === 'deleted') {
    r.stav = 'nelze';
    r.duvod = 'deal je ' + (st === 'lost' ? 'ztracený (prohraný)' : 'smazaný') + ' — do Pipedrive se nic nezapíše';
    return { radek: r, stageId: null, zastaveno: 'Deal je ' + (st === 'lost' ? 'ztracený (prohraný)' : 'smazaný') + ' — odeslání nabídky se do něj nezapisuje.' };
  }
  const f = najdi(seznam, deal, konf);
  if (f.duvod) { r.stav = 'nelze'; r.duvod = f.duvod + ' — fáze zůstane, ostatní údaje se zapíšou'; return { radek: r, stageId: null, zastaveno: '' }; }
  const cilova = seznam.find((x) => +x.id === +f.faze.id);
  r.hodnotaText = text(cilova);
  if (st !== 'open') {   // revize PO R8: neznámý stav = fázi neposouvat
    r.stav = 'ponechano'; r.duvod = st === 'won' ? 'deal je vyhraný — fáze se nemění'
      : st ? 'deal je ve stavu ' + st + ' — fáze se nemění' : 'stav dealu není známý — fáze se nemění';
    return { radek: r, stageId: null, zastaveno: '' };
  }
  if (aktualni && +aktualni.id === +cilova.id) {
    r.stav = 'ponechano'; r.duvod = 'deal už v této fázi je';
    return { radek: r, stageId: null, zastaveno: '' };
  }
  const poradi = (x) => (x && x.order_nr != null && x.order_nr !== '' && isFinite(+x.order_nr) ? +x.order_nr : null);
  const pa = poradi(aktualni), pc = poradi(cilova);
  if (!aktualni || pa === null || pc === null || +aktualni.pipeline_id !== +cilova.pipeline_id) {
    r.stav = 'nelze'; r.duvod = 'pořadí fází nejde ověřit — fáze se nemění, ostatní údaje se zapíšou';
    return { radek: r, stageId: null, zastaveno: '' };
  }
  if (pa >= pc) {
    r.stav = 'ponechano'; r.duvod = 'deal je už v pozdější fázi „' + String(aktualni.name || '') + '“ — nevrací se';
    return { radek: r, stageId: null, zastaveno: '' };
  }
  r.hodnota = +cilova.id;
  return { radek: r, stageId: +cilova.id, zastaveno: '' };
}

/* Text poznámky (prostý text, řádky '\n'); escapuje volající
 * (pdPoznamkaObsah). Bez kontaktů a e-mailů — jen jméno zpracovatele. */
export function pdOdeslaniPoznamkaText({ cislo, datum, varianty, sachty, vypracoval, odkaz, znacka }) {
  const r = [];
  r.push('Nabídka odeslána: ' + cisty(cislo, 120) + (denText(datum) ? ' ze dne ' + denText(datum) : ''));
  for (const x of (varianty || []).slice(0, 20)) {
    const ceny = [];
    if (typeof x.ock === 'number') ceny.push('OCK ' + castka(x.ock));
    if (typeof x.proj === 'number') ceny.push('PROJ ' + castka(x.proj));
    r.push('· ' + cisty(x.nazev, 80) + ' (' + cisty(x.cislo, 60) + ')' + (x.ridici ? ' — tato nabídka' : '')
      + (ceny.length ? ': ' + ceny.join(' + ') + ' bez DPH' : ''));
  }
  if (sachty) r.push(cisty(sachty, 600));
  if (vypracoval) r.push('Vypracoval: ' + cisty(vypracoval, 120));
  if (odkaz) r.push('Kalkulace: ' + cisty(odkaz, 300));
  let t = r.join('\n');
  const z = String(znacka || '');
  if (t.length + z.length > PD_ODESLANI_POZNAMKA_MAX) t = t.slice(0, PD_ODESLANI_POZNAMKA_MAX - z.length - 1) + '…';
  return z ? t + '\n' + z.trim() : t;
}

/* Otisk náhledu: deal, update_time, přesné tělo PATCH, zámek a text poznámky. */
export function pdOdeslaniOtisk(dealId, updateTime, patch, zamekKdy, poznamka) {
  const t = JSON.stringify({ d: String(dealId), u: String(updateTime || ''), p: patch || null, z: String(zamekKdy || ''), n: String(poznamka || '') });
  return createHash('sha256').update(t).digest('hex').slice(0, 32);
}

/* Soubor Wordu z base64 (revize PO R5, dorevize D1): velikost, platný ZIP
 * (sablonaZipPolozky — týž čtecí kód a strop B272 jako kontrola šablon),
 * povinné části [Content_Types].xml a word/document.xml a nad rozbalenými
 * částmi TÁŽ kontrola jako u šablon (sablonaObsahVadyZipu: makra, vložené
 * objekty, ActiveX, attachedTemplate, aFChunk, vnější vztahy, kódování,
 * %-kódované a duplicitní názvy…). Jakákoli vada = soubor se nepřiloží.
 * Vrací { data: Buffer } nebo { chyba, status }. */
export async function pdOdeslaniDocx(b64, G = globalThis) {
  if (typeof b64 !== 'string' || !b64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64))
    return { chyba: 'Soubor nabídky chybí nebo není v pořádku.', status: 400 };
  if (Math.floor(b64.length * 3 / 4) > PD_ODESLANI_SOUBOR_MAX + 3)
    return { chyba: 'Soubor nabídky je větší než ' + (PD_ODESLANI_SOUBOR_MAX / 1048576) + ' MB — přiložte ho k dealu ručně.', status: 413 };
  const data = Buffer.from(b64, 'base64');
  if (data.length > PD_ODESLANI_SOUBOR_MAX)
    return { chyba: 'Soubor nabídky je větší než ' + (PD_ODESLANI_SOUBOR_MAX / 1048576) + ' MB — přiložte ho k dealu ručně.', status: 413 };
  const neniWord = { chyba: 'Soubor není dokument Wordu (.docx) — do Pipedrive se nepřiloží.', status: 400 };
  if (data.length < 30 || data.readUInt32LE(0) !== 0x04034b50) return neniWord;
  let polozky;
  if (typeof G.sablonaZipPolozky !== 'function') return { chyba: 'Kontrola Wordu se na serveru nenačetla — soubor se nepřiložil.', status: 503 };
  try { polozky = await G.sablonaZipPolozky(new Uint8Array(data.buffer, data.byteOffset, data.length)); }
  catch (e) { return neniWord; }
  const male = (Array.isArray(polozky) ? polozky : []).map((p) => String((p && p.nazev) || '').replace(/\\/g, '/').toLowerCase());
  if (!male.includes('[content_types].xml') || !male.includes('word/document.xml')) return neniWord;
  if (typeof G.sablonaObsahVadyZipu !== 'function') return { chyba: 'Kontrola Wordu se na serveru nenačetla — soubor se nepřiložil.', status: 503 };
  const vady = G.sablonaObsahVadyZipu(polozky);
  if (vady.length) return { chyba: 'Soubor obsahuje prvky, které Word načítá nebo spouští mimo dokument (makra, vložené objekty, vnější šablony či odkazy) — do Pipedrive se nepřiloží.', vady: vady.slice(0, 5), status: 400 };
  return { data };
}

/* Název souboru skládá server: CN_<číslo z papíru>_<datum nabídky>.docx. */
export function pdOdeslaniNazevSouboru(cislo, datum) {
  const c = String(cislo || '').replace(/[^A-Za-z0-9.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'nabidka';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(String(datum || '')) ? '_' + datum : '';
  return 'CN_' + c + d + '.docx';
}

/* ---------- stav zápisu v zakázce (`zak.pdOdeslani`, píše jen server) ----------
 * Revize PO R2: stav po VARIANTÁCH — { deal, poznamka: { stav, kdy, id, otisk },
 * varianty: { <id varianty>: { zamekKdy, pole, soubor } } }. Poznámka je jedna
 * na zakázku a deal; jiný deal = nový záznam bez id poznámky (revize R12 M4). */
const STAVY_KROKU = ['ceka', 'zapsano', 'chyba', 'zahajeno', 'bez'];
const ID_TVAR = /^[1-9][0-9]{0,11}$/;
const VAR_TVAR = /^[A-Za-z0-9._:-]{1,80}$/;
export const PD_ODESLANI_VARIANT_MAX = 50;
function krok(x, navic = []) {
  if (!x || typeof x !== 'object' || Array.isArray(x) || !STAVY_KROKU.includes(x.stav)) return null;
  const o = { stav: x.stav, kdy: cisty(x.kdy, 40) };
  if (x.stav === 'chyba' && x.duvod) o.duvod = cisty(x.duvod, PD_ODESLANI_DUVOD_MAX);
  for (const k of navic) {
    if (k === 'id' && Number.isInteger(x.id) && x.id > 0) o.id = x.id;
    if (k === 'otisk' && typeof x.otisk === 'string' && /^[0-9a-f]{16,32}$/.test(x.otisk)) o.otisk = x.otisk;
    if (k === 'nazev' && typeof x.nazev === 'string') o.nazev = cisty(x.nazev, 120);
    if (k === 'velikost' && Number.isInteger(x.velikost) && x.velikost >= 0) o.velikost = x.velikost;
  }
  return o;
}
export function pdOdeslaniNorm(x) {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
  const deal = typeof x.deal === 'string' && ID_TVAR.test(x.deal) ? x.deal : '';
  if (!deal) return null;
  const o = { deal, varianty: {} };
  const pozn = krok(x.poznamka, ['id', 'otisk']);
  if (pozn) o.poznamka = pozn;
  const v = x.varianty && typeof x.varianty === 'object' && !Array.isArray(x.varianty) ? x.varianty : {};
  for (const id of Object.keys(v).filter((k) => VAR_TVAR.test(k)).slice(0, PD_ODESLANI_VARIANT_MAX)) {
    const e = v[id];
    if (!e || typeof e !== 'object' || Array.isArray(e)) continue;
    const z = { zamekKdy: cisty(e.zamekKdy, 40) };
    const pole = krok(e.pole), soubor = krok(e.soubor, ['id', 'nazev', 'velikost']);
    if (pole) z.pole = pole;
    if (soubor) z.soubor = soubor;
    o.varianty[id] = z;
  }
  return o;
}
/* Při uložení zakázky z prohlížeče se pole bere z ULOŽENÉ verze (vzor
 * pdOrgVitezDrz); obnova ze souboru ho nepřebírá, obnova z otisku ano. */
export function pdOdeslaniDrz(stara, zak, volby = {}) {
  if (!zak || typeof zak !== 'object') return;
  const zOtisku = volby.obnova === true && volby.zeSouboru !== true;
  const zdroj = zOtisku ? zak : stara;
  const v = pdOdeslaniNorm(zdroj && zdroj[PD_ODESLANI_POLE]);
  if (v) zak[PD_ODESLANI_POLE] = v; else delete zak[PD_ODESLANI_POLE];
}

/* Záznam pro deal: jiný deal = nový (bez id poznámky). */
export function pdOdeslaniZaznam(stary, deal) {
  const s = pdOdeslaniNorm(stary);
  return s && s.deal === deal ? s : { deal, varianty: {} };
}
/* Stav varianty pro tento zámek (jiný zámek = nový stav varianty). */
export function pdOdeslaniVariantaStav(rec, varianta, zamekKdy, zalozit = false) {
  const e = rec && rec.varianty ? rec.varianty[varianta] : null;
  if (e && e.zamekKdy === zamekKdy) return e;
  if (!zalozit) return null;
  const n = { zamekKdy };
  rec.varianty[varianta] = n;
  return n;
}
export function pdOdeslaniKrok(stav, duvod, navic = {}, kdy = new Date().toISOString()) {
  const o = Object.assign({ stav, kdy }, navic);
  if (stav === 'chyba') o.duvod = cisty(duvod || 'zápis se nepovedl', PD_ODESLANI_DUVOD_MAX);
  return o;
}

/* Zastavení celého odeslání (zápis i soubor, revize PO R1, R4): ztracený
 * nebo smazaný deal, cizí číslo nabídky v dealu, první tisk pro DALŠÍHO
 * zákazníka (víc zákazníků — deal vede řídící). '' = nic nebrání. */
export function pdOdeslaniZastaveni(dealData, cizi, jinyZakaznik) {
  const st = dealData ? String(dealData.status || '') : '';
  if (st === 'lost' || st === 'deleted')
    return 'Deal je ' + (st === 'lost' ? 'ztracený (prohraný)' : 'smazaný') + ' — odeslání nabídky se do něj nezapisuje.';
  if (cizi) return 'Deal patří nabídce ' + cizi + ' (Číslo nabídky v dealu) — odeslání se do něj nezapíše. Převzít deal jde až zápisem prodeje.';
  if (jinyZakaznik) return 'Nabídka odešla dalšímu zákazníkovi (' + jinyZakaznik + ') — deal vede řídící zákazník, do Pipedrive se nic nezapisuje.';
  return '';
}

/* Zákazník, kterému šel PRVNÍ tisk (VZ-E3 razítko „komu“ v zamek.tisky[0]),
 * není řídící → jeho písmeno / číslo; jinak ''. */
export function pdOdeslaniJinyZakaznik(zak, v, G = globalThis) {
  const t = v && v.zamek && Array.isArray(v.zamek.tisky) ? v.zamek.tisky[0] : null;
  const k = t && t.zakaznik && typeof t.zakaznik === 'object' ? t.zakaznik : null;
  if (!k || !k.id) return '';
  const rid = typeof G.vzRidiciId === 'function' ? G.vzRidiciId(zak) : '';
  if (rid && String(k.id) === String(rid)) return '';
  return cisty(k.cislo || k.pismeno || k.id, 60) || 'další zákazník';
}
