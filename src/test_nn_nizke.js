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

/* NN B256 (audit 20. 11. 2026, XS-1/XS-2): čísla z odpovědi serveru se do HTML
 * vkládají přes esc() — druhá vrstva. Pojistka: před opravou všech 6 souborových
 * vzorů neescapovaných vložení výskyt mělo. */
const syrove = {
  'ui/analytika_ui.js': [/<b>\$\{c\.(zakazky|kalkulace|tiskyWord|tiskyNahled|prihlaseni|chyby)\}<\/b>/, /text-align:right">\$\{p\.(zakazky|kalkulace|tiskyWord|tiskyNahled|prihlaseni|chyby|dnu)\}/,
    /' \(' \+ n \+ '×\)'/],
  'ui/online_ui.js': [/<td \$\{td\}>\$\{b\.(nove|prepsane|bezeZmeny|preskocene)\}/, /Zapsalo by se \$\{s\.nove/, /na serveru teď ' \+ rj\.existujicich/],
  'ui/pd_mapa_ui.js': [/: \$\{n \|\| 0\}/, /<b>\$\{s\.celkem \|\| 0\}/, /nezařazená v CRM: \$\{s\.nezarazeno/],
  'ui/pd_nanecisto_ui.js': [/: \$\{s\[k\] \|\| 0\}/, /kolize: \$\{s\.kolize \|\| 0\}/],
};
const b256 = [];
for (const [f, vzory] of Object.entries(syrove)) {
  const t = fs.readFileSync(path.join(__dirname, f), 'utf8');
  vzory.forEach(v => { if (v.test(t)) b256.push(f + ' ' + v); });
}
test('B256: čísla ze serveru v analytice, náhledu obnovy, mapě polí CRM a nanečisto jdou přes esc()', b256.length === 0, b256);
const escVyskyt = ['ui/analytika_ui.js', 'ui/online_ui.js', 'ui/pd_mapa_ui.js', 'ui/pd_nanecisto_ui.js']
  .every(f => /esc\((c|p|b|s|n|rj)\b[^)]*\)/.test(fs.readFileSync(path.join(__dirname, f), 'utf8')));
test('B256: escapovaná vložení v souborech jsou (hlídač není prázdný)', escVyskyt);

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
