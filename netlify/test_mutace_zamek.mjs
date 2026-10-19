/* ============================================================
 * ZÁMEK MUTAČNÍCH BĚHŮ (B194, F1 19. 10. 2026)
 *
 * 19. 10. 2026 ve 13:07 skončil `node netlify/mutace.mjs b168` hláškou
 * „sady nejsou zelené ani bez mutace — test_vyjimky.mjs: 1 selhalo";
 * samostatně test_vyjimky prošel 400× ze 400. Jediný mechanismus, který
 * pád doložitelně vyvolá, je DRUHÝ mutační běh nad toutéž pracovní kopií
 * (souběžná `mutace.mjs b178` přepisuje src/vyjimky.js → test_vyjimky
 * 1–5 FAIL v 7 z 11 běhů). Oba mutační skripty proto berou zámek
 * (nastroje/mutace_zamek.mjs) a druhý běh odmítnou.
 *
 * Sada ověří, že:
 *   – při zámku drženém ŽIVÝM procesem netlify/mutace.mjs i mutace_jadro.mjs
 *     skončí hned nenulovým kódem a řeknou proč (a nic nespustí);
 *   – `--kontrola` (jen čte) zámek nepotřebuje;
 *   – zámek po MRTVÉM procesu se převezme, běh proběhne a zámek po sobě
 *     uklidí; během běhu zámek drží právě ten běh (PID v souboru).
 * Zámek se kvůli izolaci od skutečných běhů vede v dočasné složce
 * (KNG_MUTACE_ZAMEK). Mutace se nespouští žádná (filtr bez shody).
 *
 * POJISTKA: proti stavu před B194 (bez zámku) selže 4 kontroly — oba
 * skripty se zámkem živého procesu klidně rozběhnou.
 * ============================================================ */
import { spawn, spawnSync } from 'node:child_process';
import { writeFileSync, existsSync, mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOREN = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(KOREN, '..');
const tmp = mkdtempSync(join(tmpdir(), 'kng-mutace-zamek-'));
const ZAMEK = join(tmp, 'zamek.json');
const SADA = join(tmp, 'sada_ok.mjs');
/* Zástupná sada: zelená, když zámek v době běhu drží rodičovský mutační běh. */
writeFileSync(SADA, `import { readFileSync } from 'node:fs';
let z = null; try { z = JSON.parse(readFileSync(${JSON.stringify(ZAMEK)}, 'utf8')); } catch (e) {}
const ok = !!z && z.pid === process.ppid;
console.log(ok ? '1 OK, 0 FAIL' : '0 OK, 1 FAIL');`);

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + (info === undefined ? '' : '  ' + String(info).slice(0, 400))); } };
const env = { ...process.env, KNG_MUTACE_ZAMEK: ZAMEK, KNG_MUTACE_SADY: SADA };
const spust = (skript, args) => spawnSync('node', [resolve(REPO, skript), ...args],
  { cwd: REPO, env, encoding: 'utf8', timeout: 60000 });
const vystup = r => (r.stdout || '') + (r.stderr || '');

const spac = spawn('node', ['-e', 'setTimeout(() => {}, 120000)'], { stdio: 'ignore' });
try {
  /* 1) zámek drží živý cizí proces */
  writeFileSync(ZAMEK, JSON.stringify({ pid: spac.pid, beh: 'cizí běh (test)', od: '2026-10-19T13:00:00.000Z' }));
  for (const skript of ['netlify/mutace.mjs', 'mutace_jadro.mjs']) {
    const r = spust(skript, ['zzz-zadna-mutace-b194']);
    test(skript + ': zámek živého běhu → skončí hned nenulovým kódem', r.status !== 0 && r.status !== null, r.status);
    test(skript + ': hláška jmenuje souběžný běh a jeho PID', /už běží jiný mutační běh/.test(vystup(r))
      && vystup(r).includes(String(spac.pid)), vystup(r).slice(-300));
    test(skript + ': cizí zámek zůstal netknutý', existsSync(ZAMEK) && JSON.parse(readFileSync(ZAMEK, 'utf8')).pid === spac.pid);
  }
  const rk = spust('netlify/mutace.mjs', ['--kontrola']);
  test('mutace.mjs --kontrola zámek nepotřebuje (kód 0)', rk.status === 0, vystup(rk).slice(-300));

  /* 2) zámek po mrtvém procesu */
  const mrtvy = spawnSync('node', ['-e', 'console.log(process.pid)'], { encoding: 'utf8' });
  writeFileSync(ZAMEK, JSON.stringify({ pid: Number(mrtvy.stdout.trim()), beh: 'mrtvý běh', od: '' }));
  const r2 = spust('netlify/mutace.mjs', ['zzz-zadna-mutace-b194']);
  test('zámek mrtvého běhu se převezme, výchozí stav zelený (zámek během běhu drží tento běh)',
    r2.status === 0 && /Výchozí stav/.test(vystup(r2)), vystup(r2).slice(-300));
  test('po skončení běhu zámek zmizel', !existsSync(ZAMEK));
} finally {
  try { spac.kill('SIGKILL'); } catch (e) { /* už skončil */ }
  rmSync(tmp, { recursive: true, force: true });
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
