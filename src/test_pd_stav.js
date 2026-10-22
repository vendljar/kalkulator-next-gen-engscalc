/* P1 — STAV DEALU PIPEDRIVE V HLAVIČCE A V EXPORTU CONTROLLINGU
 * (rozhodnutí J. V. 22. 10. 2026, podklady/PIPEDRIVE_STAV_DEALU_22_10.md).
 *
 * Hlídá:
 *   1. MODEL — tvar `zak.pdStav = { status, nacteno }`, whitelist stavů
 *      open / lost / won / deleted, převod dealu z API (is_deleted → deleted),
 *      texty Otevřené / Ztracené / Vyhrané / Smazané, bez dealu prázdno;
 *   2. HLAVIČKA — řádek „Stav Pipedrive" je ÚPLNĚ NAHOŘE pravého sloupce OCK
 *      i PROJ, štítek v barvě stavu (třída jen z výčtu), pole jen ke čtení
 *      (disabled, bez obsluhy — pro všechny role stejné), bez dealu šedé
 *      „— zakázka nemá deal —", žádný šedý text pod polem, escapování;
 *   3. EXPORT — sloupce „Stav Pipedrive" a „Stav Pipedrive načten" za
 *      „Pipedrive deal" v CSV i XLSX (Řádky i Příplatky – volby), česky,
 *      prázdné bez dealu; verze struktury 3; filtry exportu beze změny.
 * Ceník v testu je SMYŠLENÝ. Serverovou část hlídá netlify/test_pd_stav.mjs. */
const fs = require('fs');
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
nacti('./cenik.js');
nacti('./cenik_stari.js');
const eng = nacti('./engine.js');
nacti('./engine_proj.js');
const C = nacti('./controlling.js');
['./format.js', './techspec.js', './sleva.js', './zaokrouhleni.js', './zamek.js', './zakazka.js']
  .forEach(f => { try { nacti(f); } catch (e) { /* modul v Node nemusí jít načíst */ } });
const DX = require('./docxgen.js');
global.zipZapis = DX.zipZapis; global.zipPrecti = DX.zipPrecti;
const XL = require('./xlsx.js');
const JEKLY = require('./jekly.json');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};
const kopie = x => JSON.parse(JSON.stringify(x));
const T = '2026-10-22T08:15:00.000Z';

/* ---------- 1. model ---------- */
test('whitelist stavů = open, lost, won, deleted', JSON.stringify(C.PD_STAVY) === '["open","lost","won","deleted"]');
test('texty stavů česky', C.PD_STAV_TEXT.open === 'Otevřené' && C.PD_STAV_TEXT.lost === 'Ztracené'
  && C.PD_STAV_TEXT.won === 'Vyhrané' && C.PD_STAV_TEXT.deleted === 'Smazané');
C.PD_STAVY.forEach(s => test('platný tvar ' + s, JSON.stringify(C.pdStavNorm({ status: s, nacteno: T })) === JSON.stringify({ status: s, nacteno: T })));
test('chybějící pole = bez stavu ("")', C.pdStavNorm(undefined) === '' && C.pdStavNorm(null) === '');
const spatne = ['won', ['won'], 7, true, {}, { status: 'won' }, { nacteno: T }, { status: 'won', nacteno: T, x: 1 },
  { status: 'vyhrano', nacteno: T }, { status: 'won', nacteno: '22. 10. 2026' }, { status: 'won', nacteno: '2026-13-45T99:00:00Z' },
  { status: { toString: 1 }, nacteno: T }, { status: 'won', nacteno: { toString: 1 } }, { status: 'Won', nacteno: T },
  JSON.parse('{"status":"won","nacteno":"' + T + '","__proto__":{"x":1}}')];
spatne.forEach((x, i) => test('neplatný tvar č. ' + (i + 1) + ' → null', C.pdStavNorm(x) === null, x));
test('kontrola zakázky: neplatný tvar → 400', (C.pdStavKontrola({ pdStav: 'won' }) || {}).status === 400
  && (C.pdStavKontrola({ pdStav: { status: { toString: 1 }, nacteno: T } }) || {}).status === 400);
test('kontrola zakázky: platný tvar i bez pole projde', C.pdStavKontrola({ pdStav: { status: 'won', nacteno: T } }) === null
  && C.pdStavKontrola({}) === null && C.pdStavKontrola(null) === null);
test('deal z API: stav z whitelistu', C.pdStavZDealu({ status: 'open' }) === 'open' && C.pdStavZDealu({ status: 'won' }) === 'won');
test('deal z API: is_deleted → deleted (i když status lost)', C.pdStavZDealu({ status: 'lost', is_deleted: true }) === 'deleted');
test('deal z API: status deleted (v1) → deleted', C.pdStavZDealu({ status: 'deleted' }) === 'deleted');
test('deal z API: neznámý stav nebo nic → ""', C.pdStavZDealu({ status: 'x<script>' }) === '' && C.pdStavZDealu(null) === '');
test('text: s dealem a stavem česky', C.pdStavText({ pdDealId: '4711', pdStav: { status: 'won', nacteno: T } }) === 'Vyhrané');
test('text: bez dealu prázdný, i když zakázka stav nese', C.pdStavText({ pdStav: { status: 'won', nacteno: T } }) === '');
test('text: neplatný stav prázdný', C.pdStavText({ pdDealId: '4711', pdStav: { status: 'x', nacteno: T } }) === '');
test('datum načtení v českém čase (RRRR-MM-DD)', C.pdStavNactenoText({ pdDealId: '1', pdStav: { status: 'lost', nacteno: '2026-10-31T23:30:00.000Z' } }) === '2026-11-01');

/* ---------- 2. hlavička ---------- */
const src = fs.readFileSync(__dirname + '/ui/common.js', 'utf8').replace(/\r\n/g, '\n');
const vytahniConst = jm => { const i = src.indexOf('const ' + jm + ' ='); if (i < 0) throw new Error('chybí const ' + jm);
  const z = src.slice(i); return z.slice(0, z.match(/;\n/).index + 1); };
const vytahniFn = jm => { const m = src.match(new RegExp('function ' + jm + '\\(zak\\) \\{[\\s\\S]*?\\n\\}')); if (!m) throw new Error('chybí function ' + jm); return m[0]; };
let radek = null;
try {
  radek = (0, eval)(vytahniConst('esc') + vytahniConst('PD_STAV_PILL') + vytahniFn('pdStavRadek') + ';pdStavRadek');   // eslint-disable-line no-eval
} catch (e) { test('pdStavRadek je v ui/common.js', false, e.message); }
if (radek) {
  const pdStavRadek = radek;
  const pill = h => (h.match(/<span class="pill ([^"]*)"[^>]*>([^<]*)<\/span>/) || []).slice(1);
  const pole = h => (h.match(/<option[^>]*>([^<]*)<\/option>/) || [])[1];
  const ocekavane = { open: ['pd-open', 'Otevřené'], lost: ['pd-lost', 'Ztracené'], won: ['pd-won', 'Vyhrané'], deleted: ['pd-deleted', 'Smazané'] };
  Object.keys(ocekavane).forEach(s => {
    const h = pdStavRadek({ pdDealId: '4711', pdStav: { status: s, nacteno: T } });
    test('hlavička ' + s + ': popisek „Stav Pipedrive", štítek ' + ocekavane[s].join(' / ') + ', pole ' + ocekavane[s][1],
      /<label>Stav Pipedrive</.test(h) && JSON.stringify(pill(h)) === JSON.stringify(ocekavane[s]) && pole(h) === ocekavane[s][1], h);
  });
  const bez = pdStavRadek({ pdStav: { status: 'won', nacteno: T } });
  test('bez dealu: šedé pole „— zakázka nemá deal —" a šedý štítek', pole(bez) === '— zakázka nemá deal —'
    && pill(bez)[0] === 'mut' && /class="pd-stav bez-dealu"/.test(bez), bez);
  const neznamy = pdStavRadek({ pdDealId: '4711' });
  test('deal bez načteného stavu: šedý štítek, žádný vymyšlený stav', pill(neznamy)[0] === 'mut' && !/Otevřené|Vyhrané|Ztracené|Smazané/.test(neznamy), neznamy);
  const vse = [bez, neznamy].concat(C.PD_STAVY.map(s => pdStavRadek({ pdDealId: '1', pdStav: { status: s, nacteno: T } })));
  test('pole jen ke čtení pro všechny: select disabled, bez obsluhy a bez role v podmínce',
    vse.every(h => /<select [^>]*disabled/.test(h) && !/on(change|click|input)=/.test(h)) && !/jeAdmin|smiZobrazit|role/.test(vytahniFn('pdStavRadek')));
  test('žádný šedý doplňující text pod polem (řádek končí polem)', vse.every(h => /<\/select><\/div>$/.test(h.trim()) && !/class="(note|sub|mut-text)"/.test(h)));
  test('třída štítku jen z výčtu (podvržený stav → mut)', pill(pdStavRadek({ pdDealId: '1', pdStav: { status: 'pd-won" onclick="x', nacteno: T } }))[0] === 'mut');
  test('podvržený tvar se nezobrazí (neznámý)', !/onclick/.test(pdStavRadek({ pdDealId: '1', pdStav: { status: '<img src=x onerror=alert(1)>', nacteno: T } })));
  test('datum načtení jen v bublině, escapované', /title="[^"]*načteno 2026-10-22\)"/.test(pdStavRadek({ pdDealId: '1', pdStav: { status: 'won', nacteno: T } })));
}
/* Pořadí v hlavičce: úplně nahoře pravého sloupce, OCK i PROJ. */
const tretiSloupce = src.match(/<div class="zak-head-col">\$\{[^]*?<\/div>/g) || [];
const projSloupec = (src.match(/<div class="zak-head-col">\$\{variantaRow[^\n]*|<div class="zak-head-col">\$\{pdStavRow\}[^\n]*/) || [''])[0];
const ockSloupec = (src.match(/<div class="zak-head-col">\n\s*\$\{pdStavRow\}\$\{variantaRow\}[^\n]*/) || [''])[0];
test('PROJ: pravý sloupec začíná řádkem Stav Pipedrive', /^<div class="zak-head-col">\$\{pdStavRow\}\$\{variantaRow\}/.test(projSloupec), projSloupec);
test('OCK: pravý sloupec začíná řádkem Stav Pipedrive (ostatní o řádek níž)', /\$\{pdStavRow\}\$\{variantaRow\}\$\{ridiciBtn\}\$\{rezimRow\}\$\{prirazkaRow\}\$\{radaRow\}/.test(ockSloupec), ockSloupec);
test('řádek se skládá ze ZAK (sdílená hlavička) pro OCK i PROJ', /const pdStavRow = pdStavRadek\(ZAK\);/.test(src) && (src.match(/\$\{pdStavRow\}/g) || []).length === 2);
test('styly štítků stavů jsou v šabloně', ['pd-open', 'pd-won', 'pd-lost', 'pd-deleted'].every(t =>
  new RegExp('\\.pill\\.' + t + ' \\{').test(fs.readFileSync(__dirname + '/app_template.html', 'utf8'))));
void tretiSloupce;

/* ---------- 3. export pro controlling ---------- */
function smyslenyCenik() {
  const c = kopie(eng.DEFAULT_CENIK);
  let i = 7;
  const projdi = (o) => Object.keys(o).forEach(k => {
    if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) projdi(o[k]);
    else if (typeof o[k] === 'number' || o[k] === null) o[k] = 10 + (i++ % 97) * 3;
  });
  projdi(c);
  c.marze = 0.3; c.dph = 0.21; c.atypPrirazka = 0.1;
  c.atypMontazPct = 0.3; c.atypProjekcePct = 0.5; c.atypRezervaZakladPct = 0.1; c.atypRezervaPriplatkyPct = 0.2;
  delete c.ukazkove; delete c.prazdny;
  return c;
}
async function export3() {
  if (typeof novaZakazka !== 'function' || typeof zamkniVariantu !== 'function') { test('jádro zakázky se načetlo', false); return; }
  const zak = novaZakazka();
  zak.cislo = '2026 - OPR - CN - 0951'; zak.nazevAkce = 'Zkušební stav'; zak.objednatel = 'Zkušební zákazník s.r.o.';
  const v = zak.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, rezervaPriplatkyPct: 0.2 });
  v.data.cenik = smyslenyCenik(); v.data.sleva = { pct: 0 };
  zamkniVariantu(v, { cislo: variantaCislo(zak, v), kdo: 'admin@priklad.cz', typ: 'nabidka', vysledek: zamekVysledekSpocti(v, JEKLY, 'test') });
  const H = C.CTRL_RADKY_HLAVICKA;
  const iDeal = H.indexOf('Pipedrive deal'), iSt = H.indexOf('Stav Pipedrive'), iNac = H.indexOf('Stav Pipedrive načten');
  test('sloupce „Stav Pipedrive" a „Stav Pipedrive načten" hned za „Pipedrive deal"', iDeal > 0 && iSt === iDeal + 1 && iNac === iDeal + 2, H);
  test('verze struktury exportu 3', C.CTRL_EXPORT_VERZE === 3);

  const zS = kopie(zak); zS.pdDealId = '4711'; zS.pdStav = { status: 'won', nacteno: T };
  const eS = C.ctrlExportVarianty(zS, zS.varianty[0], { jekly: JEKLY });
  test('export s dealem projde', eS.ok, eS.chyba);
  const listy = C.ctrlExportListy(eS);
  const L = n => listy.find(l => l.nazev === n);
  const radky = L('Řádky').rows.slice(1), volby = L(C.CTRL_LIST_PRIPLATKY).rows.slice(1);
  test('Řádky: každý řádek nese „Vyhrané" a datum načtení', radky.length > 0 && radky.every(r => r[iSt] === 'Vyhrané' && r[iNac] === '2026-10-22'), radky[0]);
  test('Příplatky – volby: týž sloupec', volby.length === 0 || volby.every(r => r[iSt] === 'Vyhrané'));
  test('Popis: verze struktury 3', (L('Popis').rows.find(r => r[0] === 'Verze struktury souboru') || [])[1] === 3);
  const csv = C.ctrlExportCsv(eS);
  const hl = csv.replace(/^﻿/, '').split('\r\n')[0].split(';');
  test('CSV: hlavička nese oba sloupce', hl[iSt] === '"Stav Pipedrive"' && hl[iNac] === '"Stav Pipedrive načten"', hl.slice(iDeal, iDeal + 3));
  test('CSV: hodnota „Vyhrané" jako text', csv.split('\r\n')[1].split(';')[iSt] === '"Vyhrané"');
  /* XLSX: zápis a zpětné čtení. */
  const bajty = new Uint8Array(await (await XL.xlsxZapis(listy)).arrayBuffer());
  const sesit = await XL.xlsxPrecti(bajty);
  const xr = (sesit.find(s => (s.nazev || s.name) === 'Řádky') || {}).rows || [];
  test('XLSX: hlavička i hodnota „Vyhrané" v listu Řádky', xr[0] && xr[0][iSt] === 'Stav Pipedrive' && xr[1] && xr[1][iSt] === 'Vyhrané', xr[1] && xr[1].slice(iDeal, iDeal + 3));

  /* Bez dealu prázdné (i když zakázka nese starý stav). */
  const zB = kopie(zak); zB.pdStav = { status: 'lost', nacteno: T };
  const eB = C.ctrlExportVarianty(zB, zB.varianty[0], { jekly: JEKLY });
  test('bez dealu: sloupce prázdné', eB.ok && C.ctrlExportListy(eB)[0].rows.slice(1).every(r => r[iSt] === '' && r[iNac] === ''));
  const zN = kopie(zak); zN.pdDealId = '4711';
  const eN = C.ctrlExportVarianty(zN, zN.varianty[0], { jekly: JEKLY });
  test('deal bez známého stavu: prázdné, nic se nevymýšlí', eN.ok && C.ctrlExportListy(eN)[0].rows.slice(1).every(r => r[iSt] === ''));
  /* Stav nic neovlivňuje: řádky exportu (mimo dva nové sloupce) jsou s ním i bez něj shodné. */
  const bezSloupcu = rows => rows.map(r => r.filter((x, i) => i !== iSt && i !== iNac && i !== iDeal));
  test('stav neovlivní částky ani řádky exportu', JSON.stringify(bezSloupcu(C.ctrlExportListy(eS)[0].rows)) === JSON.stringify(bezSloupcu(C.ctrlExportListy(eB)[0].rows)));
  /* Filtr hromadného exportu podle stavu je od #504 (doplnění J. V. 22. 10.) parametr `pd`
   * s výchozím „won"; neznámý parametr `stav` filtr dál nezná. */
  const f = C.ctrlHromadnyFiltr({ od: '2026-10-01', do: '2026-10-31', stav: 'lost' });
  test('filtr hromadného exportu: parametr „stav" nezná, stav Pipedrive je `pd` (výchozí won)', f.ok && !('stav' in f.filtr)
    && JSON.stringify(Object.keys(f.filtr)) === '["od","do","oblast","rada","podle","pd"]' && f.filtr.pd === 'won', f);
  ['lost', 'deleted', 'open'].forEach(s => {
    const z = kopie(zak); z.pdDealId = '4711'; z.pdStav = { status: s, nacteno: T };
    const e = C.ctrlExportVarianty(z, z.varianty[0], { jekly: JEKLY });
    test('export stavu ' + s + ' → ' + C.PD_STAV_TEXT[s], C.ctrlExportListy(e)[0].rows[1][iSt] === C.PD_STAV_TEXT[s]);
  });
}

export3().catch(e => test('export doběhl', false, e && e.stack)).then(() => {
  console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
  if (fail) process.exit(1);
});
