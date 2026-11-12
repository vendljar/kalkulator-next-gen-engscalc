/* ===== K40-X5: ZÁLOŽNÍ BUŇKA CSV = csvBunka (ochrana vzorců) =====
 * (dávka K40a, roadmapa #579, 11. 11. 2026)
 *
 * slovnik.js (CSV pro překladatele) a pd_nanecisto.js (suchý běh Pipedrive)
 * měly pro běh bez format.js vlastní kopii buňky CSV: první s jiným pravidlem
 * než csvBunka („+ 1+1" bez apostrofu — Excel to spočítá, K37-I5), druhá bez
 * ochrany vzorců vůbec. Oba moduly se tu načtou BEZ format.js v globálním
 * prostoru (tedy záložní cestou) a výstup se porovná s csvBunka.
 *
 * POJISTKA: nad c664c9e selže (záložní buňky se liší od csvBunka); mutace
 * „[K40a] X5" v netlify/mutace.mjs vrací vlastní kopii.
 */
const { csvBunka } = require('./format.js');   // jen jako vzor — NEdává se do global
const SL = require('./slovnik.js');
const PDN = require('./pd_nanecisto.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};
test('csvBunka není v globálním prostoru (zkouší se záložní cesta)', typeof global.csvBunka === 'undefined');

const ZLE = ['=HYPERLINK("x")', '+ 1+1', '- položka', '-1', '+1', '@SUM(A1)', '\tx', '\rx', 'běžný "text"', '', 'a;b'];

/* slovník: CSV hesel, která zná jen aplikace — buňka hesla */
const csvSl = SL.slovnikCsvJenVApp(ZLE.map(k => ({ klic: k, hodnoty: { en: k, de: '', fr: '' } })));
const radkySl = csvSl.replace(/^﻿/, '').split('\r\n').slice(1);
ZLE.forEach((k, i) => test('slovník: buňka ' + JSON.stringify(k) + ' = csvBunka',
  radkySl[i] === [k, k, '', ''].map(csvBunka).join(';'), [radkySl[i], [k, k, '', ''].map(csvBunka).join(';')]));

/* suchý běh Pipedrive: hlavička CSV nese číslo zakázky a název akce z dat */
ZLE.forEach(k => {
  const csv = PDN.pdnCsv({ pole: [] }, { cislo: k, nazevAkce: 'x' });
  test('Pipedrive nanečisto: buňka čísla zakázky ' + JSON.stringify(k) + ' = csvBunka',
    csv.indexOf(csvBunka('Zakázka') + ';' + csvBunka(k) + ';') >= 0, csv.split('\n').slice(0, 3));
});

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
