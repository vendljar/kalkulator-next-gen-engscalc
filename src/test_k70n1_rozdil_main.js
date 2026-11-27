/* ============================================================
 * K70-N1 (revize Fable K70, 27. 11. 2026) — ROZDÍL SLOVNÍKU PROTI MAIN.
 * Zabudovaný PREKLAD dneška × PREKLAD main v24.11.7 (4e69c27, na tom stojí
 * fixtura test_k70n1_zamek_main.json): rozdíl smí být jen PŘIDANÁ hesla
 * a jejich seznam = SLOVNIK_PRIDANA_HESLA (src/slovnik.js). Přibude-li
 * heslo, které tam není, nebo se heslo z main změní či zmizí, sada selže —
 * pak je třeba posoudit, jestli dotisk staré nabídky změní text (a seznam
 * doplnit), nebo dialog nechat.
 * Main se čte přes `git archive 4e69c27 src`. Bez gitu nebo bez toho
 * commitu (mělký klon) se sada PŘESKOČÍ s kódem 3.
 * Spuštění: node src/test_k70n1_rozdil_main.js
 * ============================================================ */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const MAIN = '4e69c27';

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 600)); } };

const koren = path.join(__dirname, '..');
let tmp = null;
try {
  execFileSync('git', ['cat-file', '-e', MAIN + '^{commit}'], { cwd: koren, stdio: 'ignore' });
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'k70n1-main-'));
  const tar = execFileSync('git', ['archive', MAIN, 'src/preklad.js', 'src/format.js'], { cwd: koren, maxBuffer: 64 * 1024 * 1024 });
  fs.writeFileSync(path.join(tmp, 'm.tar'), tar);
  execFileSync('tar', ['-xf', path.join(tmp, 'm.tar'), '-C', tmp], { stdio: 'ignore' });
} catch (e) {
  console.log('PŘESKOČENO: commit main ' + MAIN + ' není v gitu k dispozici (' + String(e.message || e).split('\n')[0] + ')');
  process.exit(3);
}

const M = require(path.join(tmp, 'src', 'preklad.js'));
const T = require('./preklad.js');
const S = require('./slovnik.js');
const zM = M.PREKLAD_ZABUDOVANY || M.PREKLAD, zT = T.PREKLAD_ZABUDOVANY || T.PREKLAD;
const pridane = Object.keys(zT).filter(k => !Object.prototype.hasOwnProperty.call(zM, k));
const ubrane = Object.keys(zM).filter(k => !Object.prototype.hasOwnProperty.call(zT, k));
const zmenene = Object.keys(zM).filter(k => Object.prototype.hasOwnProperty.call(zT, k) && JSON.stringify(zM[k]) !== JSON.stringify(zT[k]));
const seznam = [].concat(...S.SLOVNIK_PRIDANA_HESLA.map(g => g.hesla.map(h => h.klic)));

test('main ' + MAIN + ' má 1008 hesel (stav fixtury zámků)', Object.keys(zM).length === 1008, Object.keys(zM).length);
test('žádné heslo z main nezmizelo', ubrane.length === 0, ubrane);
test('žádné heslo z main se nezměnilo', zmenene.length === 0, zmenene);
test('přidaná hesla = SLOVNIK_PRIDANA_HESLA (bez pořadí)',
  JSON.stringify(pridane.slice().sort()) === JSON.stringify(seznam.slice().sort()), { pridane, seznam });
const sl = require('./test_k70n1_zamek_main.json');
test('otisk zabudovaného slovníku main = razítko ve fixtuře',
  S.slovnikRazitko(zM, null).otisk === sl.razitkoZabudovany.otisk, [S.slovnikRazitko(zM, null).otisk, sl.razitkoZabudovany.otisk]);

try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* jen úklid */ }
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
