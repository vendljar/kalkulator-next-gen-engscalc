/* ============================================================
 * DÁVKA NN (22. 11. 2026) — nízké nálezy: statické a klientské kontroly.
 *
 *   #708 (PR-N1)  rovná uvozovka uvnitř atributu HTML: „…" v title / placeholder /
 *                 aria-label / alt zakončený ASCII " ukončí atribut uprostřed věty
 *                 (bublina „Opláštit i prohlubeň" v Kalkulaci OCK byla useknutá).
 *
 * Pojistka: před opravou hlídač našel src/ui/kalk_ock.js:223 a :2546.
 * Spouští se `node src/test_nn_nizke.js` (a samo v spust_testy.sh).
 * ============================================================ */
const fs = require('fs');
const path = require('path');

let ok = 0, fail = 0;
function test(nazev, podminka, detail) {
  if (podminka) { ok++; console.log('OK  ' + nazev); }
  else { fail++; console.log('FAIL ' + nazev + (detail !== undefined ? ' ' + JSON.stringify(detail).slice(0, 600) : '')); }
}
const bezKomentaru = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/* #708: atribut v uvozovkách "…", uvnitř české „ a před zavírací “ už " — atribut skončil. */
const soubory = ['ui', '.'].flatMap(d => fs.readdirSync(path.join(__dirname, d))
  .filter(f => f.endsWith('.js') && !/^test/.test(f)).map(f => path.join(d, f)));
const vzor = /\b(title|placeholder|aria-label|alt)="[^"]*„[^"“]*"/g;
const nalezy = [];
for (const f of soubory) {
  const radky = bezKomentaru(fs.readFileSync(path.join(__dirname, f), 'utf8')).split('\n');
  radky.forEach((r, i) => { if (vzor.test(r)) nalezy.push(f + ':' + (i + 1)); vzor.lastIndex = 0; });
}
test('#708: žádný atribut title / placeholder / aria-label / alt neukončí rovná uvozovka po „', nalezy.length === 0, nalezy);
test('#708: hlídač vidí aspoň 60 souborů (není prázdný)', soubory.length >= 60, soubory.length);
test('#708: hlídač chytí vzorový případ', /\b(title)="[^"]*„[^"“]*"/.test('title="zaškrtněte „Opláštit i prohlubeň" — zbytek"'));

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
