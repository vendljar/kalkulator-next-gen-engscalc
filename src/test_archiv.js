/* Test #17 – původ varianty převzaté z historické kalkulace.
 *
 * Okno „↩ Historická kalkulace…" (archiv, alternativní nabídka) bylo
 * 13. 10. 2026 na pokyn J. V. odstraněno: „Odstraň z hlavičky tlačítka
 * Historická kalkulace. Myslím, že už k ničemu není." Spolu s ním odešel
 * model archivu (hledání, řazení, vytvorAlternativu) — testy, které ho
 * zkoušely, odešly s ním (už není co zkoušet). Zůstává:
 *   1) věta o původu (puvodPopis) pro varianty, které oknem dřív vznikly
 *      a jsou v uložených zakázkách dál,
 *   2) pojistka, že se tlačítka ani okno do zdrojů nevrátí.
 * V prohlížeči totéž hlídá overit_lista.mjs (lišta i seznam kalkulací). */
const fs = require('fs');
const path = require('path');
const ar = require('./archiv.js');
const { puvodPopis } = ar;

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info || ''); } };

/* ---------- 1) věta o původu ---------- */
const stara = { id: 'v2', nazev: 'Alternativa – Základní', puvod: {
  cislo: '2025 - OPR - CN - 0410', zakazka: '2025 - OPR - CN - 0410', nazevAkce: 'Výtahová šachta Hejtmánská',
  objednatel: 'Zkušební s.r.o.', varianta: 'Základní', soubor: 'zakazka_0410.json', cenik: 'aktualni',
  kdy: '2026-07-29T11:00:00.000Z' } };
test('popis původu je věta pro obrazovku',
  puvodPopis(stara).includes('2025 - OPR - CN - 0410') && puvodPopis(stara).includes('dnešním ceníkem'),
  puvodPopis(stara));
test('popis nese variantu, akci i soubor',
  puvodPopis(stara).includes('„Základní"') && puvodPopis(stara).includes('Hejtmánská')
  && puvodPopis(stara).includes('soubor zakazka_0410.json'), puvodPopis(stara));
test('popis původu historický ceník pojmenuje',
  puvodPopis({ puvod: Object.assign({}, stara.puvod, { cenik: 'historicky' }) }).includes('historickým ceníkem'));
test('varianta bez původu popis nemá', puvodPopis({ id: 'v1', nazev: 'Varianta 1' }) === '');
test('původ bez čísla popis nemá', puvodPopis({ puvod: { soubor: 'x.json' } }) === '');
test('nic na vstupu nespadne', puvodPopis(null) === '' && puvodPopis(undefined) === '');
test('z modelu archivu zbyla jen věta o původu', JSON.stringify(Object.keys(ar)) === '["puvodPopis"]', Object.keys(ar));

/* ---------- 2) tlačítka ani okno se nevrátí ---------- */
const cti = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const bezKomentaru = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
for (const f of ['ui/common.js', 'ui/seznam_ui.js', 'app_template.html']) {
  const s = bezKomentaru(cti(f));
  test(`${f}: žádné tlačítko „Historická kalkulace"`, !s.includes('Historická kalkulace'));
  test(`${f}: nic neotevírá okno archivu`, !/otevriArchiv|zavriArchiv|archiv-overlay/.test(s));
}
test('okno archivu (ui/archiv_ui.js) už ve zdrojích není', !fs.existsSync(path.join(__dirname, 'ui/archiv_ui.js')));
test('build.py okno archivu nesestavuje', !cti('../build.py').includes('archiv_ui.js'));

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
if (fail) process.exit(1);
