/* #551 — nález K37-I2 (rozhodnutí J. V. 2. 11. 2026): „IČ:" v cizojazyčných nabídkách.
 *
 * Patička firmy (`{{FIRMA_PATICKA}}` ve Wordu, patička tiskového náhledu)
 * nesla v DE/EN/FR nabídce česky „IČ:". Od #551 jde popisek přes slovník:
 *   EN „Company ID (IČ):", DE „Identifikationsnummer (IČ):",
 *   FR „Numéro d’identification (IČ) :". Číslo ani název se nepřekládají.
 * Firma je smyšlená. Před opravou: EN/DE/FR selžou (zůstalo „IČ:"); po opravě projdou.
 * Spuštění: node src/test_551_ic_preklad.js */
const fs = require('fs');
const path = require('path');
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
global.vypocet = eng.vypocet; global.DEFAULT_ZADANI = eng.DEFAULT_ZADANI;
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const ep = require('./engine_proj.js');
global.DEFAULT_ZADANI_PROJ = ep.DEFAULT_ZADANI_PROJ; global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const tsm = require('./techspec.js');
global.TECHSPEC_DEF = tsm.TECHSPEC_DEF; global.tsHodnota = tsm.tsHodnota; global.DEFAULT_TECHSPEC = tsm.DEFAULT_TECHSPEC;
const zk = require('./zakazka.js'); Object.keys(zk).forEach(k => { global[k] = zk[k]; });
const fm = require('./firma.js'); Object.keys(fm).forEach(k => { global[k] = fm[k]; });
const kr = require('./kryci.js'); Object.keys(kr).forEach(k => { global[k] = kr[k]; });
const PR = require('./preklad.js'); global.tr = PR.tr; global.trStav = PR.trStav;
const N = require('./nabidka.js');
const JEKLY = JSON.parse(fs.readFileSync(path.join(__dirname, 'jekly.json'), 'utf8'));

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

const ICO = '000 00 000';   // smyšlené
const paticka = (jazyk) => {
  const puv = global.NAST;
  global.NAST = { firma: Object.assign({}, fm.DEFAULT_FIRMA, { nazev: 'Zkušební firma s.r.o.', ico: ICO }) };
  const zak = zk.novaZakazka();
  const v = zak.varianty[0];
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), { kurzEurKc: 25 });
  const ph = N.nabidkaData(zak, v, JEKLY, jazyk).placeholders;
  global.NAST = puv;
  return String(ph.FIRMA_PATICKA || '');
};

const OCEK = { en: 'Company ID (IČ): ', de: 'Identifikationsnummer (IČ): ', fr: 'Numéro d’identification (IČ) : ' };
for (const [j, popisek] of Object.entries(OCEK)) {
  const t = paticka(j);
  test(j.toUpperCase() + ': patička nese přeložený popisek a číslo beze změny', t.includes(popisek + ICO), t);
  test(j.toUpperCase() + ': žádné holé české „IČ:"', !/(^|[ ,])IČ:/.test(t.replace(popisek, '')), t);
}
const cz = paticka('cz');
test('CZ: patička beze změny („IČ: …")', cz.includes(', IČ: ' + ICO) && !/Company|Identifikation|Numéro/.test(cz), cz);
test('slovník: „IČ:" je přeložené ve všech třech jazycích',
  ['en', 'de', 'fr'].every(j => PR.trStav('IČ:', j).zdroj === 'slovník'));
test('firmaPaticka bez překladu = čeština (smlouvy, krycí listy, detail výpočtu)',
  fm.firmaPaticka(Object.assign({}, fm.DEFAULT_FIRMA, { nazev: 'X', ico: ICO })).includes('IČ: ' + ICO));
const CU = fs.readFileSync(path.join(__dirname, 'ui', 'common.js'), 'utf8');
test('tiskový náhled nabídky předává překlad i patičce', /firmaPaticka\(f, P\)/.test(CU));

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
