/* MD (J. V. 25. 11. 2026): v Ceníku nákladů OCK je řádek C.engineeringKc „Engineering“
 * v sekci PŘÍPLATKOVÉ POLOŽKY, ne v REŽII. Jen zobrazení v editoru ceníku — klíč,
 * popis, jednotka a výpočet beze změny (staré kalkulace dál počítají engineering
 * v Režii, nové jako příplatek #757). Množina klíčů ceníku se nemění.
 * Pojistka: před přesunem je řádek v REŽII → testy sekce FAIL.
 * Spuštění: node src/test_md_cenik_engineering.js */
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
const C = nacti('./cenik.js');
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
const DEF = C.CENIK_DEF || global.CENIK_DEF;
const sekce = (nazev) => (DEF.find(s => s[0] === nazev) || [null, []])[1];
const radky = (nazev) => sekce(nazev).filter(r => r).map(r => r[0]);
test('ceník OCK má sekce REŽIE a PŘÍPLATKOVÉ POLOŽKY', radky('REŽIE').length > 0 && radky('PŘÍPLATKOVÉ POLOŽKY').length > 0);
test('Engineering je v PŘÍPLATKOVÝCH POLOŽKÁCH', radky('PŘÍPLATKOVÉ POLOŽKY').includes('C.engineeringKc'), radky('PŘÍPLATKOVÉ POLOŽKY'));
test('Engineering už není v REŽII', !radky('REŽIE').includes('C.engineeringKc'));
const vse = DEF.flatMap(s => s[1].map(r => r[0]));
test('klíč je v ceníku právě jednou', vse.filter(k => k === 'C.engineeringKc').length === 1);
const r = DEF.flatMap(s => s[1]).find(x => x[0] === 'C.engineeringKc');
test('popis, jednotka a poznámka beze změny (bez nové poznámky)', r && r[1] === 'Engineering' && r[2] === 'Kč' && r[3] === '', r);
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
