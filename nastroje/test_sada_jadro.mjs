/* OBNOVA TESTOVACÍ SADY ZAKÁZEK — jádro nástroje (C5, #585, 11. 11. 2026).
 *
 * PROČ. Od 2.–3. 11. 2026 nejsou TEST zakázky kol K28/K29/K36 v testovací
 * databázi (K39-I1). J. V. rozhodl (B0.9): sadu obnoví nástrojem sám.
 * Obal `nastroje/test_sada_obnov.mjs` (klávesnice, soubor, síť) volá tohle
 * jádro; rozhodování je tu, v čistých funkcích, a síť (`fetch`) se předává —
 * testy (netlify/test_c5_test_sada.mjs) ho pouští proti SKUTEČNÝM serverovým
 * funkcím nad paměťovým úložištěm.
 *
 * MEZE (BEZPECNOST_MEZE.md B215–B216). Nástroj zapisuje jako administrátor,
 * a proto:
 *   P1  cíl jen z povoleného seznamu (testengscalc + místní adresy), ostrý
 *       web se odmítne dřív, než se zadá heslo; /api/zdravi musí hlásit
 *       prostředí „test" (před přihlášením, po něm a těsně před zápisem);
 *       přesměrování se nenásleduje (redirect: 'error').
 *   P2  jen role Administrátor; volá jen pět dvojic metoda + cesta (VOLANI).
 *   P3  jen zakázky, jejichž číslo, čísla variant, čísla zámků a číslo PROJ
 *       začínají „TEST" (podle jména souboru „TEST-…"); jediná cizí zakázka
 *       v exportu = nezapíše se nic.
 *   P4  výchozí běh je náhled; zakázka, která na serveru je, se přeskočí;
 *       posílá se vždy `ocekavaneRazitko: ''` (server pak existující zakázku
 *       odmítne 409) a nikdy `prepsat`.
 *   P5  zakázka jde, jak je v exportu — nástroj data nemění.
 *   P6  výpisy nesou jen čísla zakázek, počty a stav (žádné ceny, e-maily,
 *       jména, heslo ani cookie).
 * ============================================================ */
import { createRequire } from 'node:module';
import { pdSimulatorOstryWeb } from '../netlify/lib/pipedrive_simulator.mjs';
const require = createRequire(import.meta.url);
const ULO = require('../src/uloziste.js');
const ZAM = require('../src/zamek.js');
const ZK = require('../src/zakazka.js');

/* ---------- P1: cíl ---------- */

/* Povolený seznam. Jiný testovací web se přidá SEM (a revizí), ne parametrem. */
export const POVOLENE_WEBY = ['https://testengscalc.netlify.app'];
const MISTNI = /^http:\/\/(localhost|127\.0\.0\.1):([1-9]\d{0,4})$/;

/* Ostrý web: stejná pravidla jako simulátor Pipedrive (pdSimulatorStav) —
 * sdílená funkce pdSimulatorOstryWeb (host přesně engscalc.netlify.app nebo
 * „<nasazení>--engscalc.netlify.app") a cokoli se „schaftscalc". */
export function cilOstry(adresa) {
  const s = String(adresa == null ? '' : adresa);
  if (s.toLowerCase().includes('schaftscalc')) return 'schaftscalc';
  return pdSimulatorOstryWeb({ URL: s.trim() });
}

/* Vrací { ok, web } nebo { ok:false, chyba }. Adresa musí být PŘESNĚ původ
 * (schéma + host [+ port]) — žádná cesta, dotaz, uživatel, velká písmena,
 * tečka na konci hostu; jen https, místní adresy jen http s portem. */
export function cilPovolen(adresa) {
  const s = String(adresa == null ? '' : adresa).replace(/\/$/, '');
  const ostry = cilOstry(s);
  if (ostry) return { ok: false, chyba: 'Adresa ' + JSON.stringify(s) + ' je OSTRÝ web (' + ostry + '). '
    + 'Nástroj zapisuje jen do testovací databáze — na ostrém webu nikdy neběží.' };
  let u;
  try { u = new URL(s); } catch (e) { return { ok: false, chyba: 'Adresa webu nemá platný tvar.' }; }
  if (u.username || u.password) return { ok: false, chyba: 'Adresa webu nesmí nést jméno ani heslo.' };
  if (s !== u.origin) return { ok: false, chyba: 'Adresa webu musí být jen původ webu, např. https://testengscalc.netlify.app (bez cesty, malými písmeny).' };
  /* Seznam se porovnává s ROZPARSOVANÝM původem; přesnost zápisu (bez cesty,
   * velkých písmen, výchozího portu) hlídá samostatně kontrola výš. */
  if (POVOLENE_WEBY.includes(u.origin)) return { ok: true, web: u.origin };
  const m = MISTNI.exec(u.origin);
  if (m && +m[2] <= 65535) return { ok: true, web: u.origin };
  return { ok: false, chyba: 'Adresa ' + JSON.stringify(s) + ' není na povoleném seznamu ('
    + POVOLENE_WEBY.concat(['http://localhost:<port>', 'http://127.0.0.1:<port>']).join(', ') + ').' };
}

/* ---------- P2: povolená volání ---------- */
export const VOLANI = ['GET /api/zdravi', 'POST /api/prihlaseni', 'POST /api/odhlaseni', 'GET /api/zakazky', 'POST /api/zakazky'];

/* ---------- P3: čísla TEST ---------- */

/* Číslo je testovací, když začíná „TEST" a jeho jméno souboru (normalizace
 * mezer a znaků jako na serveru, uloKlicSouboru) začíná „TEST-" a něco za
 * tím je: „TEST - 2026 - OPR - CN - 9578 - K19T-C078" → „TEST-2026-OPR-…". */
export function cisloJeTest(cislo) {
  if (typeof cislo !== 'string') return false;
  if (!cislo.trim().startsWith('TEST')) return false;
  const k = ULO.uloKlicSouboru(cislo);
  return k.startsWith('TEST-') && k.length > 5;
}

/* Všechna čísla zakázky, která musí být testovací: číslo zakázky, číslo
 * každé varianty (variantaCislo), číslo v zámku a číslo PROJ. Vrací seznam
 * { kde, cislo } těch, která pravidlo NESPLŇUJÍ (prázdný = zakázka je TEST). */
export function zakazkaCizi(zak) {
  if (!zak || typeof zak !== 'object' || Array.isArray(zak)) return [{ kde: 'zakázka', cislo: '(není objekt)' }];
  const spatne = [];
  const cislo = zak.cislo;
  if (!cisloJeTest(cislo)) spatne.push({ kde: 'číslo zakázky', cislo: typeof cislo === 'string' ? cislo : '(chybí)' });
  const ph = zak.projHlavicka && typeof zak.projHlavicka === 'object' ? zak.projHlavicka : null;
  /* Číslo PROJ: nevyplněné = prázdné nebo předloha „2026 - OPR - CN - " (hlavickaVyplneno
   * aplikace) — takové se nehlídá; vyplněné musí být TEST. */
  if (ph && ph.cislo != null && (typeof ph.cislo !== 'string' || ZK.hlavickaVyplneno(ph.cislo)) && !cisloJeTest(ph.cislo))
    spatne.push({ kde: 'číslo PROJ', cislo: String(ph.cislo) });
  const varianty = Array.isArray(zak.varianty) ? zak.varianty : [];
  if (!varianty.length) spatne.push({ kde: 'varianty', cislo: '(zakázka nemá varianty)' });
  for (const v of varianty) {
    if (!v || typeof v !== 'object') { spatne.push({ kde: 'varianta', cislo: '(není objekt)' }); continue; }
    let vc = '';
    try { vc = ZAM.variantaCislo(zak, v); } catch (e) { vc = ''; }
    if (!cisloJeTest(vc)) spatne.push({ kde: 'číslo varianty', cislo: vc || '(prázdné)' });
    if (v.zamek && typeof v.zamek === 'object') {
      const zc = v.zamek.cislo;
      /* Zámek bez čísla se taky nepustí (bezpečnější výchozí): z čeho by šlo
       * poznat, že patří testovací nabídce. */
      if (!cisloJeTest(zc)) spatne.push({ kde: 'číslo v zámku', cislo: typeof zc === 'string' && zc ? zc : '(prázdné)' });
    }
  }
  return spatne;
}

/* ---------- P6: vstupní soubory ---------- */

const jeObjekt = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const hodnoty = (x) => Array.isArray(x) ? x : (jeObjekt(x) ? Object.values(x) : null);

/* --export: JSON pole zakázek, nebo { zakazky: [ … ] } (i mapa jméno → zakázka).
 * Všechny musí být TEST (P3) — jinak { ok:false, cizi:[…] }. */
export function vyberZExportu(data) {
  const seznam = Array.isArray(data) ? data : (jeObjekt(data) ? hodnoty(data.zakazky) : null);
  if (!seznam) return { ok: false, chyba: 'Soubor exportu není pole zakázek ani objekt { zakazky: [ … ] }.' };
  const zakazky = seznam.filter(z => z != null);
  if (!zakazky.length) return { ok: false, chyba: 'Soubor exportu neobsahuje žádnou zakázku.' };
  const cizi = [];
  zakazky.forEach((z, i) => {
    const sp = zakazkaCizi(z);
    if (sp.length) cizi.push({ poradi: i + 1, cislo: jeObjekt(z) && typeof z.cislo === 'string' ? z.cislo : '', duvody: sp });
  });
  if (cizi.length) return { ok: false, cizi, chyba: cizi.length + ' z ' + zakazky.length
    + ' zakázek v exportu nemá testovací číslo — nezapíše se nic. Soubor je jiný, než má být '
    + '(nejspíš celá záloha: tu načtěte přes --zaloha, z ní se vyberou jen TEST zakázky).' };
  return { ok: true, zakazky, ostatnich: 0 };
}

/* --zaloha: otisk databáze (kopie z Disku). Vyberou se JEN zakázky, které
 * pravidlo P3 splňují celé; účty, ceník a nastavení se nečtou dál. */
export function vyberZeZalohy(data) {
  if (!jeObjekt(data)) return { ok: false, chyba: 'Soubor zálohy není objekt otisku databáze.' };
  if (data.format && !data.zakazky) return { ok: false, chyba: 'Soubor je manifest otisku po částech, ne kopie zálohy z Disku.' };
  const seznam = hodnoty(data.zakazky);
  if (!seznam) return { ok: false, chyba: 'V souboru zálohy chybí část „zakazky".' };
  const zakazky = [], vyrazene = [];
  let ostatnich = 0;
  for (const z of seznam) {
    if (!jeObjekt(z)) { ostatnich++; continue; }
    if (!cisloJeTest(z.cislo)) { ostatnich++; continue; }
    const sp = zakazkaCizi(z);
    if (sp.length) vyrazene.push({ cislo: z.cislo, duvody: sp }); else zakazky.push(z);
  }
  if (!zakazky.length) return { ok: false, chyba: 'V záloze není žádná zakázka s testovacím číslem.', vyrazene, ostatnich };
  return { ok: true, zakazky, vyrazene, ostatnich };
}

/* ---------- P4: plán ---------- */

/* Strop těla zakázky — týž jako server (ZAKAZKA_MAX_B v netlify/lib/zakazka_kontrola.mjs,
 * shodu hlídá test). */
export const ZAKAZKA_MAX_B = 4 * 1024 * 1024;

export const teloZapisu = (zak) => ({ zakazka: zak, ocekavaneRazitko: '' });

/* Jméno souboru se počítá JEN pro porovnání s rejstříkem — na server se
 * neposílá (jméno počítá server). */
export function jmenoSouboru(zak) {
  try { return ULO.uloJmenoSouboru(zak); } catch (e) { return ''; }
}

/* Kroky: { cislo, jmeno, zak, stav: 'zalozit' | 'existuje' | 'dvojice' | 'velka' }. */
export function planKroku(zakazky, rejstrik) {
  const naServeru = new Set(), cislaNaServeru = new Set();
  for (const z of ((rejstrik && rejstrik.zakazky) || [])) {
    if (!z) continue;
    if (z.soubor) naServeru.add(String(z.soubor));
    if (z.cislo) cislaNaServeru.add(ULO.uloKlicSouboru(z.cislo));
  }
  const videno = new Set();
  return zakazky.map(zak => {
    const jmeno = jmenoSouboru(zak);
    const krok = { cislo: zak.cislo, jmeno, zak, varianty: (zak.varianty || []).length,
      zamcenych: (zak.varianty || []).filter(v => v && v.zamek && v.zamek.zamceno).length };
    if (naServeru.has(jmeno) || cislaNaServeru.has(ULO.uloKlicSouboru(zak.cislo))) krok.stav = 'existuje';
    else if (videno.has(jmeno)) krok.stav = 'dvojice';
    else if (JSON.stringify(teloZapisu(zak)).length > ZAKAZKA_MAX_B) krok.stav = 'velka';
    else krok.stav = 'zalozit';
    videno.add(jmeno);
    return krok;
  });
}

/* ---------- P5: porovnání po zápisu ---------- */

/* Kanonický tvar: klíče objektů seřazené, aby pořadí klíčů nebylo rozdílem. */
export function kanon(x) {
  if (Array.isArray(x)) return '[' + x.map(kanon).join(',') + ']';
  if (x && typeof x === 'object') return '{' + Object.keys(x).sort()
    .filter(k => x[k] !== undefined).map(k => JSON.stringify(k) + ':' + kanon(x[k])).join(',') + '}';
  return JSON.stringify(x === undefined ? null : x);
}

/* Co server při uložení NOVÉ zakázky razí z relace a nástroj za rozdíl nepovažuje:
 * role zadavatele slevy (schvalovaniServerKontrola — „role slevy určuje relace,
 * ne data", P1 / K16-N73): u zakázky založené administrátorem je to Administrátor.
 * Ostatní změny dat varianty se hlásí cestou ke klíči (bez hodnot). */
export const RAZI_SERVER = [['sleva', 'role'], ['slevaProj', 'role']];
function bezRaziServeru(data) {
  if (!data || typeof data !== 'object') return data;
  const d = JSON.parse(JSON.stringify(data));
  for (const [a, b] of RAZI_SERVER) if (d[a] && typeof d[a] === 'object') delete d[a][b];
  return d;
}
/* Cesty ke klíčům, kde se dva stromy liší (nejvýš `max`, bez hodnot). */
export function rozdilCesty(a, b, max = 4, cesta = '', out = []) {
  if (out.length >= max || kanon(a) === kanon(b)) return out;
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    for (const k of [...new Set(Object.keys(a).concat(Object.keys(b)))].sort()) {
      rozdilCesty(a[k], b[k], max, cesta ? cesta + '.' + k : k, out);
      if (out.length >= max) break;
    }
    return out;
  }
  out.push(cesta || '(celé)');
  return out;
}

/* Rozdíly mezi odeslanou a zpět přečtenou zakázkou (seznam krátkých vět bez dat). */
export function porovnej(puvodni, zpet) {
  if (!zpet || typeof zpet !== 'object') return ['zakázku se nepodařilo přečíst zpět'];
  const r = [];
  if (zpet.cislo !== puvodni.cislo) r.push('číslo zakázky');
  const a = puvodni.varianty || [], b = zpet.varianty || [];
  if (a.length !== b.length) { r.push('počet variant ' + a.length + ' → ' + b.length); return r; }
  a.forEach((v, i) => {
    const w = b[i] || {};
    const n = 'varianta ' + (i + 1);
    let ca = '', cb = '';
    try { ca = ZAM.variantaCislo(puvodni, v); cb = ZAM.variantaCislo(zpet, w); } catch (e) { /* rozdíl níž */ }
    if (ca !== cb || v.id !== w.id) r.push(n + ': číslo');
    const za = v.zamek && v.zamek.zamceno, zb = w.zamek && w.zamek.zamceno;
    if (!!za !== !!zb) r.push(n + ': zámek ' + (za ? 'chybí' : 'přibyl'));
    else if (za) for (const k of ['cislo', 'typ', 'kdy'])
      if (String(v.zamek[k] || '') !== String(w.zamek[k] || '')) r.push(n + ': zámek.' + k);
    const da = bezRaziServeru(v.data), db = bezRaziServeru(w.data);
    if (kanon(da) !== kanon(db)) r.push(n + ': data varianty (' + rozdilCesty(da, db).join(', ') + ')');
  });
  return r;
}

/* ---------- doporučení k odmítnuté zakázce (B2, revize 12. 11. 2026) ----------
 * Běžné uložení bere zámek a prodej jako NOVÉ: prodej starší než 7 dní před
 * razítkem přijetí zámku (K40b, dnes) a zámek z doby před #320 server odmítne.
 * Obnova ze zálohy v aplikaci bere zámek ze zálohy jako doklad a razítko
 * přijetí nepřepisuje — proto doporučení u prodaných a zamčených. */
export function doporuceniOdmitnute(zak) {
  const varianty = (zak && Array.isArray(zak.varianty)) ? zak.varianty : [];
  const prodana = varianty.some(v => v && v.prodano);
  const zamcena = varianty.some(v => v && v.zamek && v.zamek.zamceno);
  if (prodana || zamcena)
    return 'doporučení: ' + (prodana ? 'prodanou' : 'odeslanou (zamčenou)') + ' zakázku obnovte v aplikaci přes „Obnovit ze zálohy“ '
      + '(Nastavení → Databáze; režim obnovy bere zámek ze zálohy jako doklad a razítko přijetí nepřepisuje).';
  return 'doporučení: pošlete číslo a hlášku koordinaci (zakázka bez zámku neprošla kontrolou serveru).';
}

/* ---------- výpis bez cen a osobních údajů ---------- */

/* Text od serveru může nést částku nebo e-mail — do výpisu jde očištěný. */
export function ocistiText(t) {
  return String(t == null ? '' : t)
    .replace(/[^\s@<>()"',;]+@[^\s@<>()"',;]+/g, '…@…')
    .replace(/\d[\d\s.,]*\s*(Kč|CZK|EUR|€|%)/g, '… $1')
    .slice(0, 240);
}

/* ---------- běh ---------- */

/* opt: { web, zakazky, zapsat, fetch, zeptej(otazka) → text, zeptejHeslo(otazka) → text,
 *        vypis(radek), pauzaMs, prerusit() → bool }
 * Vrací { kod, souhrn }. Kód: 0 vše založené a ověřené (nebo náhled), 1 něco
 * neprošlo / zrušeno, 2 odmítnutý cíl nebo vstup. */
export async function obnovSadu(opt) {
  const vypis = opt.vypis || ((s) => console.log(s));
  const f = opt.fetch;
  const pauza = (ms) => new Promise(r => setTimeout(r, ms));
  const souhrn = { zalozeno: 0, existuje: 0, soubeh: 0, odmitnuto: 0, rozdil: 0, velka: 0, dvojice: 0, chyba: 0 };
  const cil = cilPovolen(opt.web);
  if (!cil.ok) { vypis('ODMÍTNUTO: ' + cil.chyba); return { kod: 2, souhrn }; }
  const WEB = cil.web;
  if (!Array.isArray(opt.zakazky) || !opt.zakazky.length) { vypis('Není co obnovit (prázdný výběr).'); return { kod: 2, souhrn }; }
  for (const z of opt.zakazky) if (zakazkaCizi(z).length) {
    vypis('ODMÍTNUTO: výběr obsahuje zakázku bez testovacího čísla — nezapíše se nic.'); return { kod: 2, souhrn };
  }

  let COOKIE = '';
  /* Jediné místo, kde nástroj sahá na síť: jen povolené dvojice, nikdy přesměrování. */
  async function api(metoda, cesta, telo) {
    const kus = cesta.split('?')[0];
    if (!VOLANI.includes(metoda + ' ' + kus)) throw new Error('nepovolené volání ' + metoda + ' ' + kus);
    const hlavicky = { accept: 'application/json' };
    if (telo !== undefined) hlavicky['content-type'] = 'application/json';
    if (COOKIE) hlavicky.cookie = COOKIE;
    const odp = await f(WEB + cesta, { method: metoda, headers: hlavicky, redirect: 'error',
      body: telo === undefined ? undefined : JSON.stringify(telo) });
    if (odp.status >= 300 && odp.status < 400) throw new Error('server přesměrovává (' + odp.status + ')');
    const text = await odp.text();
    let data = null;
    try { data = JSON.parse(text); } catch (e) { /* data null */ }
    return { odp, data };
  }
  async function zdraviTest(kdy) {
    let r;
    try { r = await api('GET', '/api/zdravi'); }
    catch (e) { vypis('KONEC: /api/zdravi neodpovídá (' + ocistiText(e && e.message) + ') — ' + kdy + '.'); return false; }
    if (!r.data || r.data.ok !== true || r.data.prostredi !== 'test') {
      vypis('KONEC: web neohlásil testovací prostředí (prostredi = ' + JSON.stringify(r.data && r.data.prostredi) + ') — ' + kdy + '.');
      return false;
    }
    return true;
  }
  async function odhlas() {
    if (!COOKIE) return;
    try { await api('POST', '/api/odhlaseni', {}); } catch (e) { /* relace vyprší sama */ }
    COOKIE = '';
  }

  if (!(await zdraviTest('před přihlášením'))) return { kod: 2, souhrn };

  /* ---- přihlášení (P2) ---- */
  vypis('Po běhu budete v aplikaci odhlášeni — uložte si rozdělanou práci.');
  const email = String((await opt.zeptej('E-mail administrátora testovacího webu: ')) || '').trim();
  const heslo = String((await opt.zeptejHeslo('Heslo: ')) || '');
  let prih;
  try { prih = await api('POST', '/api/prihlaseni', { email, heslo }); }
  catch (e) { vypis('Přihlášení se nepovedlo (' + ocistiText(e && e.message) + ').'); return { kod: 1, souhrn }; }
  const setc = prih.odp.headers.get('set-cookie') || '';
  if (!prih.data || prih.data.ok !== true) {
    vypis('Přihlášení se nepovedlo: ' + ocistiText((prih.data && prih.data.chyba) || ('HTTP ' + prih.odp.status)));
    return { kod: 1, souhrn };
  }
  COOKIE = setc.split(';')[0];
  if (prih.data.role !== 'Administrátor') {
    vypis('KONEC: účet nemá roli Administrátor — zakázky by se založily pod ním. Nic se nezapsalo.');
    await odhlas();
    return { kod: 1, souhrn };
  }
  vypis('Přihlášeno jako administrátor na ' + WEB + '.');
  try {
    if (!(await zdraviTest('po přihlášení'))) return { kod: 2, souhrn };

    /* ---- co už na serveru je ---- */
    const rej = await api('GET', '/api/zakazky');
    if (!rej.data || rej.data.ok !== true) { vypis('Rejstřík zakázek se nepodařilo přečíst.'); return { kod: 1, souhrn }; }
    const kroky = planKroku(opt.zakazky, rej.data.rejstrik);
    const POPIS = { zalozit: 'založí se', existuje: 'přeskočí se — na serveru už je', dvojice: 'přeskočí se — v souboru dvakrát',
      velka: 'přeskočí se — větší než strop 4 MB' };
    vypis('');
    vypis('NÁHLED (' + kroky.length + ' zakázek, web ' + WEB + '):');
    for (const k of kroky) vypis('  ' + k.cislo + '  · variant ' + k.varianty + (k.zamcenych ? ', zamčených ' + k.zamcenych : '') + '  → ' + POPIS[k.stav]);
    for (const k of kroky) if (k.stav !== 'zalozit') souhrn[k.stav]++;
    const zalozit = kroky.filter(k => k.stav === 'zalozit');
    vypis('');
    vypis('Založí se ' + zalozit.length + ', přeskočí ' + (kroky.length - zalozit.length) + '.');
    if (!opt.zapsat) { vypis('NÁHLED — nic se nezapsalo. Pro zápis spusťte znovu s --zapsat.'); return { kod: 0, souhrn }; }
    if (!zalozit.length) { vypis('Není co založit.'); return { kod: souhrn.velka || souhrn.dvojice ? 1 : 0, souhrn }; }

    const odpoved = String((await opt.zeptej('Založit ' + zalozit.length + ' zakázek na ' + WEB + '? Napište OBNOVIT: ')) || '').trim();
    if (odpoved !== 'OBNOVIT') { vypis('Zrušeno — nic se nezapsalo.'); return { kod: 1, souhrn }; }
    if (!(await zdraviTest('před zápisem'))) return { kod: 2, souhrn };

    /* ---- zápis po jedné (P4, P5) ---- */
    const odmitnute = [];
    for (const k of zalozit) {
      if (opt.prerusit && opt.prerusit()) { vypis('PŘERUŠENO — založené zakázky zůstávají, další spuštění je přeskočí.'); break; }
      let r;
      try { r = await api('POST', '/api/zakazky', teloZapisu(k.zak)); }
      catch (e) { souhrn.chyba++; vypis('  ✗ ' + k.cislo + ' — chyba spojení (' + ocistiText(e && e.message) + ')'); continue; }
      /* 409 s `kolize` = zakázku mezitím někdo založil (razítko) → přeskočeno;
       * jiná 409 (např. vypnutá funkce víc šachet) je odmítnutí serverem. */
      if (r.odp.status === 409 && r.data && r.data.kolize === true) { souhrn.soubeh++; vypis('  – ' + k.cislo + ' — přeskočeno (mezitím ji někdo založil)'); }
      else if (!r.data || r.data.ok !== true || !r.data.soubor) {
        souhrn.odmitnuto++;
        odmitnute.push({ cislo: k.cislo, doporuceni: doporuceniOdmitnute(k.zak) });
        vypis('  ✗ ' + k.cislo + ' — odmítnuto serverem (' + r.odp.status + '): ' + ocistiText(r.data && r.data.chyba));
      } else {
        /* Čtení zpět i při výpadku spojení nesmí shodit běh (souhrn se vypíše). */
        let rozdily;
        try {
          const zp = await api('GET', '/api/zakazky?soubor=' + encodeURIComponent(r.data.soubor));
          rozdily = porovnej(k.zak, zp.data && zp.data.zakazka);
        } catch (e) { rozdily = ['zakázku se nepodařilo přečíst zpět (' + ocistiText(e && e.message) + ')']; }
        if (rozdily.length) { souhrn.rozdil++; vypis('  ! ' + k.cislo + ' — založeno s rozdílem: ' + rozdily.join(', ')); }
        else { souhrn.zalozeno++; vypis('  ✓ ' + k.cislo + ' — založeno a ověřeno'); }
        if (r.data.varovani) vypis('      varování serveru: ' + ocistiText(r.data.varovani));
      }
      if (opt.pauzaMs) await pauza(opt.pauzaMs);
    }
    vypis('');
    vypis('SOUHRN: založeno ' + souhrn.zalozeno + ', s rozdílem ' + souhrn.rozdil + ', přeskočeno – už existuje ' + souhrn.existuje
      + ', přeskočeno – souběh ' + souhrn.soubeh + ', odmítnuto serverem ' + souhrn.odmitnuto
      + (souhrn.velka ? ', příliš velké ' + souhrn.velka : '') + (souhrn.dvojice ? ', dvakrát v souboru ' + souhrn.dvojice : '')
      + (souhrn.chyba ? ', chyba spojení ' + souhrn.chyba : '') + '.');
    if (odmitnute.length) {
      vypis('');
      vypis('ODMÍTNUTÉ ZAKÁZKY — co s nimi (nástroj data nemění):');
      for (const o of odmitnute) vypis('  ' + o.cislo + ' — ' + o.doporuceni);
    }
    const vse = souhrn.zalozeno === zalozit.length && !souhrn.velka && !souhrn.dvojice;
    return { kod: vse ? 0 : 1, souhrn };
  } finally {
    await odhlas();
  }
}
