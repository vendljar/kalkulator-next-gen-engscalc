/* ROZSAH STATICKÉ KONTROLY OSOBNÍCH ÚDAJŮ (K6-W2, dávka D3 21. 10. 2026).
 *
 * nastroje/kontrola_udaju.py nečetla podklady/ ani .claude/ — e-mail,
 * telefon i token v předávkách, auditech a datech kokpitu prošly jako čisté.
 * Test se ptá samotného skriptu (funkce soubory()), co čte, a ověří, že
 * vzorový token ve skillu by kontrola chytila. Žádný soubor nezapisuje. */
const path = require('path');
const { spawnSync } = require('child_process');
const KOREN = path.join(__dirname, '..');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 300)); }
};
const py = (kod) => spawnSync('python3', ['-I', '-c', 'import sys; sys.path.insert(0, "nastroje"); import kontrola_udaju as K\n' + kod],
  { cwd: KOREN, encoding: 'utf8' });

const r = py('import os\nfor c in K.soubory(): print(os.path.relpath(c, K.KOREN).replace(os.sep, "/"))');
const cte = (r.stdout || '').split('\n').filter(Boolean);
test('skript vypíše čtené soubory', r.status === 0 && cte.length > 100, r.stderr);
test('K6-W2: čte podklady/', cte.some(f => f.startsWith('podklady/')), cte.filter(f => /^podklady/.test(f)).length);
test('K6-W2: čte .claude/ (skill kokpitu i jeho šablonu)', cte.includes('.claude/skills/kokpit-koordinace/SKILL.md')
  && cte.includes('.claude/skills/kokpit-koordinace/kokpit_sablona.html'));
test('src/ a nastroje/ čte dál', cte.includes('src/objednane.js') && cte.includes('nastroje/kontrola_udaju.py'));
/* Vzorek tokenu tvaru GitHub (smyšlený, skládá se až za běhu, aby sám test
 * nebyl nálezem) — kontrola ho musí poznat. */
const t = py('vzor = "gh" + "p_" + "A" * 36\nprint(any(r.search(vzor) for _, r in K.TAJEMSTVI))');
test('token tvaru ghp_… kontrola pozná', (t.stdout || '').trim() === 'True', t.stderr);

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
if (fail) process.exit(1);
