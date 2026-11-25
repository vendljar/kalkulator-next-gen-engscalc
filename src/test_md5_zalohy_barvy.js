/* MD-5 (J. V. 25. 11. 2026) — barvy stavových řádků záloh v Nastavení → Databáze
 * (uloZalohaBarva v src/uloziste.js): ≤ 36 h a bez chyby zelená; starší než
 * 36 h nebo chyba, nejvýš 5 dní oranžová; starší než 5 dní nebo chybí červená.
 * Barva nikdy sama — štítek nese stav slovy. Hodiny jsou falešné (pevné `ted`),
 * den bez času = půlnoc v Europe/Prague.
 * Pojistka: před MD-5 funkce neexistuje → všechny testy FAIL.
 * Spouští se `node src/test_md5_zalohy_barvy.js`. */
const U = require('./uloziste.js');
let ok = 0, fail = 0;
function test(nazev, podminka, detail) {
  if (podminka) { ok++; console.log('OK  ' + nazev); }
  else { fail++; console.log('FAIL ' + nazev + (detail !== undefined ? ' ' + JSON.stringify(detail) : '')); }
}
const C = (x) => (typeof U.uloZalohaCas === 'function' ? U.uloZalohaCas(x) : NaN);
const B = (kdy, ted, chyba) => (typeof U.uloZalohaBarva === 'function' ? U.uloZalohaBarva(kdy, ted, chyba) : {});
const TED = Date.parse('2026-11-25T10:00:00Z');
const H = 3600000, D = 24 * H;
const iso = (t) => new Date(t).toISOString();

test('meze na jednom místě: 36 h a 5 dní', U.ULO_ZALOHA_OK_HODIN === 36 && U.ULO_ZALOHA_CERVENA_DNU === 5);
let b = B(iso(TED - H), TED);
test('1 h → zelená, štítek „V pořádku (před 1 h)"', b.barva === 'zelena' && b.stitek === 'V pořádku (před 1 h)', b);
b = B(iso(TED - 36 * H), TED);
test('přesně 36 h → ještě zelená', b.barva === 'zelena', b);
b = B(iso(TED - 37 * H), TED);
test('37 h → oranžová se slovem „zkontrolujte"', b.barva === 'oranzova' && /zkontrolujte/.test(b.stitek), b);
b = B(iso(TED - 3 * D), TED);
test('3 dny → oranžová, štítek „před 3 dny"', b.barva === 'oranzova' && /před 3 dny/.test(b.stitek), b);
b = B(iso(TED - 5 * D), TED);
test('přesně 5 dní → ještě oranžová', b.barva === 'oranzova', b);
b = B(iso(TED - 6 * D), TED);
test('6 dní → červená, štítek „před 6 dny — zkontrolujte"', b.barva === 'cervena' && /před 6 dny\) — zkontrolujte/.test(b.stitek), b);
for (const x of [null, undefined, '', 'nesmysl']) {
  b = B(x, TED);
  test('chybí (' + JSON.stringify(x) + ') → červená „Chybí — zkontrolujte"', b.barva === 'cervena' && b.stitek === 'Chybí — zkontrolujte', b);
}
b = B(iso(TED - H), TED, true);
test('čerstvá, ale hlášená chyba → oranžová „Chyba — zkontrolujte"', b.barva === 'oranzova' && b.stitek === 'Chyba — zkontrolujte', b);
b = B(iso(TED - 6 * D), TED, true);
test('stará a s chybou → červená (stáří přebije)', b.barva === 'cervena', b);
/* Pražský čas: den bez času = půlnoc v Praze (SEČ 23:00 UTC předchozího dne, SELČ 22:00). */
test('den bez času v zimě = půlnoc Praha (23:00 UTC)', C('2026-11-25') === Date.parse('2026-11-24T23:00:00Z'));
test('den bez času v létě = půlnoc Praha (22:00 UTC)', C('2026-07-15') === Date.parse('2026-07-14T22:00:00Z'));
b = B('2026-11-23', Date.parse('2026-11-24T11:30:00Z'));
test('noční otisk s klíčem dne, 36,5 h od pražské půlnoci → oranžová', b.barva === 'oranzova' && b.hodin === 36, b);
b = B(iso(TED + H), TED);
test('čas v budoucnu (posunuté hodiny) → zelená, 0 h', b.barva === 'zelena' && b.hodin === 0, b);

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
