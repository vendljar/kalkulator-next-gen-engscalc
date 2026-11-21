/* DO-N1 #680 — návrh obchodníka k položce mimo číselník (rozhodnutí J. V. 21. 11. 2026).
 *
 * Nález zkoušky DO (19. 11. 2026): obchodník navrhl text do číselníku
 * u příplatku „PŘECHODOVÉ PLECHY - NEREZ (MATERIÁL)“, správce ho v Ceník →
 * číselník neviděl. Číselník staví řádky z výpočtu nad DEFAULT_ZADANI a ten
 * přechodové plechy počítá jako volitelnou položku (klíč bez „(MATERIÁL)“),
 * takže příplatek řádek nemá; kandidáti ze sběru se vypisovali jen pod řádky.
 *
 * Oprava: oddíl „Návrhy k položkám mimo číselník“ (popisyNavrhyMimo v cenik.js
 * + cenikPopisyKarta v ui/cenik_ui.js), převzetí stejně jako u ostatních.
 *
 * Spuštění: cd src && node test_do_n1_navrhy.js */
const fs = require('fs');
const vm = require('vm');
const ck = require('./cenik.js');
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
const JEKLY = require('./jekly.json');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

const KLIC = 'PŘECHODOVÉ PLECHY - NEREZ (MATERIÁL)';
const C = ZC.zkusebniCenik();
const vyp = (z, c) => eng.vypocet(z, c, JEKLY, true);
const SPOL = { 'ZRUŠENÁ POLOŽKA': 'Starý text.' };
const cis = ck.popisyCiselnik(vyp, eng.DEFAULT_ZADANI, C, SPOL);
const SBER = {
  [KLIC]: [{ text: 'Nerezové plechy tl. 1,5 mm.', cislo: '2026 - OPR - CN - 900', kdy: '2026-11-19', pocet: 1, navrh: true }],
  'VENTILÁTOR (EXT)': [{ text: 'Ventilátor.', cislo: '2026 - OPR - CN - 901', kdy: '2026-11-19', pocet: 1 }],
  'ZRUŠENÁ POLOŽKA': [{ text: 'Jiný starý text.', cislo: '2026 - OPR - CN - 902', kdy: '2026-11-19', pocet: 1 }],
  'PRÁZDNÝ': [],
};

/* ---------- předpoklad nálezu ---------- */
test('předpoklad: příplatek „(MATERIÁL)“ v číselníku řádek nemá', !cis.radky.some(r => r.klic === KLIC));
test('předpoklad: VENTILÁTOR (EXT) řádek má', cis.radky.some(r => r.klic === 'VENTILÁTOR (EXT)'));

/* ---------- čistá funkce ---------- */
test('popisyNavrhyMimo existuje', typeof ck.popisyNavrhyMimo === 'function');
const mimo = typeof ck.popisyNavrhyMimo === 'function' ? ck.popisyNavrhyMimo(cis, SBER) : [];
test('návrh k položce mimo číselník se vrátí', mimo.includes(KLIC), mimo);
test('klíč s řádkem se nevrací (kandidáti jsou pod řádkem)', !mimo.includes('VENTILÁTOR (EXT)'), mimo);
test('osiřelý klíč se nevrací (kandidáti jsou pod osiřelým řádkem)', !mimo.includes('ZRUŠENÁ POLOŽKA'), mimo);
test('prázdný seznam kandidátů se nevrací', !mimo.includes('PRÁZDNÝ'), mimo);
test('bez sběru prázdno a nespadne', typeof ck.popisyNavrhyMimo === 'function'
  && ck.popisyNavrhyMimo(cis, null).length === 0 && ck.popisyNavrhyMimo(null, { A: [{ text: 'a' }] }).join() === 'A');

/* ---------- obrazovka číselníku (cenikPopisyKarta) ---------- */
const ui = fs.readFileSync(__dirname + '/ui/cenik_ui.js', 'utf8');
const fn = (jmeno) => (ui.match(new RegExp('\\nfunction ' + jmeno + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}')) || [''])[0];
const JMENA = ['cenikPopisyKandidati', 'cenikPopisyKarta', 'cenikPopisJazykyHtml', 'cenikPopisySpolecne', 'cenikPopisyJazykySpolecne'];
const kod = JMENA.map(fn);
test('UI funkce nalezeny', kod.every(k => k), JMENA.filter((j, i) => !kod[i]));
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function karta(admin) {
  const ctx = {
    popisyCiselnik: ck.popisyCiselnik, popisyNavrhyMimo: ck.popisyNavrhyMimo,
    vypocet: (z, c) => eng.vypocet(z, c, JEKLY, true), JEKLY, OCK: { fixes: true },
    DEFAULT_ZADANI: eng.DEFAULT_ZADANI, C,
    POPISY_CIS: { sber: JSON.parse(JSON.stringify(SBER)), hleda: false, chyba: '' },
    ONLINE_STAV: { ja: { email: 'x' }, popisy: { texty: SPOL, jazyky: {} } },
    jeAdminOnline: () => admin, esc, keyAttr: s => String(s), escJs: s => JSON.stringify(s),
    POPISY_MAX_TEXT: 300, POPISY_JAZYKY: ['en', 'de', 'fr'],
  };
  vm.createContext(ctx);
  vm.runInContext(kod.join('\n'), ctx);
  return ctx.cenikPopisyKarta();
}
const html = karta(true);
const iOddil = html.indexOf('Návrhy k položkám mimo číselník');
test('správce vidí oddíl „Návrhy k položkám mimo číselník“', iOddil > 0);
const za = iOddil > 0 ? html.slice(iOddil) : '';
test('v oddílu je položka i navržený text', za.includes(esc(KLIC)) && za.includes('Nerezové plechy tl. 1,5 mm.'));
test('návrh nese štítek „návrh“', /popis-navrh-stitek/.test(za));
test('převzetí stejně jako u ostatních (cenikPopisPrevzit s klíčem)',
  za.includes(`cenikPopisPrevzit('${KLIC}', 0)`));
test('kandidát osiřelého textu je pod jeho řádkem', /Jiný starý text\./.test(html) && !/Jiný starý text\./.test(za));
test('VENTILÁTOR (EXT) v oddílu mimo není', !za.includes('VENTILÁTOR (EXT)'));
const htmlNe = karta(false);
test('bez práv správce oddíl vidět je, ale bez tlačítka převzít',
  htmlNe.includes('Návrhy k položkám mimo číselník') && !htmlNe.includes('cenikPopisPrevzit'));

console.log(`\nDO-N1 návrhy mimo číselník: ${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
