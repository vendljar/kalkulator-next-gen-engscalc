/* MD-4 (J. V. 25. 11. 2026) — prefill pole „Dne" krycího listu (kryciDnesIso)
 * = den v Europe/Prague (zamekDenPraha, jako datum nabídky DT #745), ne den
 * v pásmu prohlížeče. Dětský proces s falešnými hodinami
 * (netlify/pomoc_falesne_hodiny.mjs) a pásmem prohlížeče v proměnné TZ.
 * Pojistka: před opravou (den prohlížeče) padají první dva testy.
 * Spouští se `node src/test_md4_kryci_den.js`. */
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const KOREN = path.resolve(__dirname, '..');
let ok = 0, fail = 0;
function test(nazev, podminka, detail) {
  if (podminka) { ok++; console.log('OK  ' + nazev); }
  else { fail++; console.log('FAIL ' + nazev + (detail !== undefined ? ' ' + JSON.stringify(detail) : '')); }
}
const den = (cas, tz) => spawnSync(process.execPath,
  ['--import', './netlify/pomoc_falesne_hodiny.mjs', '-e',
    'globalThis.zamekDenPraha = require("./src/zamek.js").zamekDenPraha;'
    + 'const K = require("./src/kryci.js");'
    + 'process.stdout.write(K.kryciDnesIso() + "|" + K.kryciDatumNabidky({}))'],
  { cwd: KOREN, env: { ...process.env, KNG_FALESNE_HODINY: cas, TZ: tz }, encoding: 'utf8', timeout: 60000 });
let r = den('2026-11-24T23:30:00Z', 'UTC');
test('23:30 UTC, prohlížeč v UTC → pražský den 2026-11-25 (prefill i nouzová hodnota)', r.stdout === '2026-11-25|2026-11-25', r.stdout + r.stderr);
r = den('2026-07-14T22:30:00Z', 'America/New_York');
test('léto 22:30 UTC, prohlížeč v New Yorku → pražský den 2026-07-15', r.stdout === '2026-07-15|2026-07-15', r.stdout + r.stderr);
r = den('2026-11-24T11:00:00Z', 'Asia/Tokyo');
test('poledne UTC, prohlížeč v Tokiu → 2026-11-24', r.stdout === '2026-11-24|2026-11-24', r.stdout + r.stderr);
r = den('2026-11-24T22:30:00Z', 'Asia/Tokyo');
test('22:30 UTC, prohlížeč v Tokiu (už 25.) → pražský den 2026-11-24', r.stdout === '2026-11-24|2026-11-24', r.stdout + r.stderr);
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
