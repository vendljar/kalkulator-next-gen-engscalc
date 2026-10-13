/* B83 (audit 9. 9. 2026, opraveno 13. 10. 2026): CSV exporty pro překladatele
 * (nepřeložené fráze šablon a technické specifikace, hesla slovníku jen
 * v aplikaci) dávaly text do buňky, jak byl. Fráze nebo heslo začínající
 * „=", „+", „−" nebo „@" Excel u překladatele vyhodnotí jako vzorec
 * (=HYPERLINK, DDE). Jedna buňka csvBunka (format.js) pro všechna místa. */
const fs = require('fs');
const path = require('path');
const { csvBunka } = require('./format.js');
const sl = require('./slovnik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

test('csvBunka existuje', typeof csvBunka === 'function');
if (typeof csvBunka === 'function') {
  for (const z of ['=', '+', '-', '@', '\t', '\r'])
    test('vzorec začínající ' + JSON.stringify(z) + ' dostane apostrof', csvBunka(z + 'HYPERLINK("x")') === '"\'' + z + 'HYPERLINK(""x"")"', csvBunka(z + 'HYPERLINK("x")'));
  test('běžný text beze změny, uvozovky zdvojené', csvBunka('Cena "od"') === '"Cena ""od"""');
  test('prázdno a null', csvBunka(null) === '""' && csvBunka('') === '""');
  test('znak uprostřed textu nevadí', csvBunka('a=b') === '"a=b"');
  test('odrážka „- položka" s mezerou apostrof nedostane', csvBunka('- položka') === '"- položka"' && csvBunka('+ 1 patro') === '"+ 1 patro"');
}
const csv = sl.slovnikCsvJenVApp([{ klic: '=1+1', hodnoty: { en: '@SUM(A1)', de: '-2', fr: 'ok' } }]);
test('slovník jen v aplikaci: všechny buňky chráněné', csv.includes('"\'=1+1";"\'@SUM(A1)";"\'-2";"ok"'), csv);

/* Každé místo, které vyrábí CSV (Blob text/csv), musí jít přes csvBunka
 * nebo přes slovnikCsvJenVApp — nový export s vlastním uvozováním neprojde. */
const ui = path.join(__dirname, 'ui');
for (const f of fs.readdirSync(ui).filter(f => f.endsWith('.js'))) {
  const t = fs.readFileSync(path.join(ui, f), 'utf8');
  const kusy = t.split(/\nfunction |\nasync function /).filter(k => /text\/csv/.test(k));
  kusy.forEach(k => test('CSV export v ui/' + f + ' (' + k.slice(0, k.indexOf('(')) + ') jde přes csvBunka',
    /csvBunka|slovnikCsvJenVApp/.test(k) && !/replace\(\/"\/g/.test(k)));
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
