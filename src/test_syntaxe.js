/* ===== KAŽDÝ ZDROJÁK MUSÍ JÍT PŘELOŽIT =====
 * (nález J. V. 16. 9. 2026: „s nahráním test v16.9.5 se aplikace přestala
 *  zcela vykreslovat")
 *
 * CO SE STALO. Ve `src/ui/common.js` zůstal po úpravě komentáře uzavírací
 * znak (hvězdička-lomítko) uprostřed bloku a zbytek textu pokračoval mimo
 * komentář. Psát ho sem doslova nejde — ukončil by i tenhle blok, a přesně
 * na tom se tahle sada při psaní poprvé zasekla. Sestavení
 * slepí všechny soubory do jednoho `<script>`, takže jediná syntaktická
 * chyba shodí CELOU aplikaci — hlavička a záložky se vykreslí ze šablony,
 * ale tělo zůstane prázdné. Přesně to bylo na testovacím webu vidět.
 *
 * PROČ TO NECHYTILO CI. Jádrové moduly (`engine.js`, `zakazka.js`, …) si
 * sady načítají přes `require()`, takže syntaktická chyba v nich spadne hned.
 * Soubory ve `src/ui/` ale NIKDO nenačítá — sahá se na ně jen jako na TEXT
 * (test_escape.js, test_zamek_prepnuti.js a spol. v nich hledají vzory
 * regulárním výrazem). Text se přečte i rozbitý. Celá složka `src/ui/`, tedy
 * většina aplikace, byla proti syntaktické chybě nekrytá.
 *
 * Tahle sada to zavírá: každý `.js` ve `src/` a `src/ui/` se zkusí přeložit
 * `new Function(zdroj)`. Nic se nespouští — jen se ověří, že je to platný
 * JavaScript. Kdyby někdo zapomněl závorku, spadne to tady a ne u obchodníka.
 */
const fs = require('fs');
const path = require('path');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

/* Testovací sady se přeskakují: samy se při načtení spouštějí a některé
 * potřebují globály, které tady nejsou. Jde o ZDROJÁKY APLIKACE. */
function zdrojaky(dir, pre) {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.js') && !f.startsWith('test_'))
    .map(f => ({ jmeno: pre + f, cesta: path.join(dir, f) }));
}

const soubory = zdrojaky(__dirname, 'src/')
  .concat(zdrojaky(path.join(__dirname, 'ui'), 'src/ui/'));

test('našly se zdrojáky aplikace', soubory.length > 40, soubory.length);
test('a je mezi nimi i složka ui/ — právě ta byla nekrytá',
  soubory.some(s => s.jmeno.indexOf('src/ui/') === 0),
  soubory.filter(s => s.jmeno.indexOf('src/ui/') === 0).length);

const rozbite = [];
soubory.forEach(s => {
  const src = fs.readFileSync(s.cesta, 'utf8');
  try { new Function(src); }
  catch (e) { rozbite.push(s.jmeno + ': ' + e.message); }
});
test('každý zdroják je platný JavaScript', rozbite.length === 0, rozbite);

/* Sebekontrola: sada musí umět chybu poznat. Bez tohohle by stačilo, aby
 * `new Function` někdo omylem obalil try/catch bez hlášení, a hlídač by
 * mlčel nad čímkoli. */
{
  let chytlo = false;
  try { new Function('function a() { /* neuzavreny komentar'); } catch (e) { chytlo = true; }
  test('a neuzavřený komentář opravdu pozná', chytlo);
  let chytlo2 = false;
  try { new Function('const x = ;'); } catch (e) { chytlo2 = true; }
  test('stejně jako chybějící výraz', chytlo2);
}

/* Konce komentářů se hlídají zvlášť, protože přesně na tom to spadlo:
 * ukončovací znak uprostřed bloku a text za ním. Rychlá kontrola párování. */
soubory.forEach(s => {
  const src = fs.readFileSync(s.cesta, 'utf8');
  /* Řádek, který začíná hvězdičkou a NENÍ uvnitř komentáře, je podezřelý. */
  let vKomentari = false, podezrele = 0;
  src.split('\n').forEach(r => {
    const t = r.trim();
    if (!vKomentari && /^\*\s/.test(t)) podezrele++;
    const otevre = (r.match(/\/\*/g) || []).length;
    const zavre = (r.match(/\*\//g) || []).length;
    if (otevre > zavre) vKomentari = true;
    else if (zavre > otevre) vKomentari = false;
  });
  if (podezrele) rozbite.push(s.jmeno + ': ' + podezrele + ' řádků komentáře mimo blok');
});
test('žádný text komentáře nezůstal mimo blok',
  rozbite.filter(x => /komentáře mimo blok/.test(x)).length === 0,
  rozbite.filter(x => /komentáře mimo blok/.test(x)));

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
