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
 *
 * K3-N5 (audit K3, dávka O5 20. 10. 2026) — oddíl 3:
 *   – souběžné převzetí zámku po mrtvém procesu získá právě jeden běh
 *     (dřív oba smazali a založili zámek → běžely dva, stav B194);
 *   – čerstvý prázdný (rozepsaný) zámek se nepřevezme, starý ano;
 *   – zámek, jehož PID mezitím dostal jiný proces (jiný čas startu),
 *     se převezme;
 *   – zámek vzniká celý najednou (pomocný soubor se po sobě uklidí).
 * Pojistka: proti zámku z v19.10.10 selžou kontroly prázdného zámku,
 * opětovného PID a (podle časování) souběhu; po opravě vše zelené.
 * ============================================================ */
import { spawn, spawnSync } from 'node:child_process';
import { writeFileSync, existsSync, mkdtempSync, rmSync, readFileSync, readdirSync, utimesSync } from 'node:fs';
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

  /* 3) K3-N5: atomické převzetí, rozepsaný zámek, opětovné PID */
  const POMOC = join(tmp, 'zamkni.mjs');
  writeFileSync(POMOC, `import { zamkniMutace } from ${JSON.stringify(resolve(REPO, 'nastroje', 'mutace_zamek.mjs'))};
const [cesta, drz, start] = process.argv.slice(2);
if (start) { const s = Number(start); while (Date.now() < s) {} }   // souběžný start
const r = zamkniMutace('test K3-N5', cesta);
console.log(JSON.stringify({ moje: r === null, drzi: r }));
setTimeout(() => process.exit(0), Number(drz || 0));`);
  const zamkni = (cesta, drz) => JSON.parse(spawnSync('node', [POMOC, cesta, String(drz || 0)], { encoding: 'utf8' }).stdout.trim().split('\n').pop());
  const Z2 = join(tmp, 'zamek2.json');
  /* čerstvý prázdný zámek = jiný běh ho právě zakládá */
  writeFileSync(Z2, '');
  test('K3-N5: čerstvý prázdný zámek se nepřevezme', zamkni(Z2).moje === false && existsSync(Z2));
  if (!existsSync(Z2)) writeFileSync(Z2, '');                      // před opravou ho převzetí smazalo
  const stary = new Date(Date.now() - 5 * 60000);
  utimesSync(Z2, stary, stary);
  test('K3-N5: starý prázdný (poškozený) zámek se převezme', zamkni(Z2).moje === true);
  test('K3-N5: po převzetí a konci běhu zámek zmizel', !existsSync(Z2));
  /* PID žije, ale je to jiný proces (čas startu nesedí) */
  writeFileSync(Z2, JSON.stringify({ pid: spac.pid, beh: 'starý běh', od: '2026-10-19T13:00:00.000Z', start: 'jiny-start-1' }));
  test('K3-N5: zámek s PID, které mezitím dostal jiný proces, se převezme', zamkni(Z2).moje === true);
  writeFileSync(Z2, JSON.stringify({ pid: spac.pid, beh: 'cizí běh', od: '' }));
  test('K3-N5: zámek živého procesu bez času startu (starší tvar) dál drží', zamkni(Z2).moje === false);
  /* souběžné převzetí: 6 běhů naráz nad zámkem mrtvého procesu */
  const DEAD = Number(spawnSync('node', ['-e', 'console.log(process.pid)'], { encoding: 'utf8' }).stdout.trim());
  let jeden = true, vysledky = [];
  for (let kolo = 0; kolo < 5 && jeden; kolo++) {
    writeFileSync(Z2, JSON.stringify({ pid: DEAD, beh: 'mrtvý běh', od: '' }));
    const start = Date.now() + 800;
    const deti = [...Array(6)].map(() => new Promise(res => {
      let out = ''; const d = spawn('node', [POMOC, Z2, '1500', String(start)]);
      d.stdout.on('data', x => { out += x; }); d.on('close', () => res(out.trim()));
    }));
    vysledky = (await Promise.all(deti)).map(x => { try { return JSON.parse(x.split('\n').pop()); } catch (e) { return { chyba: x }; } });
    if (vysledky.filter(v => v.moje).length !== 1) jeden = false;
  }
  test('K3-N5: souběžné převzetí zámku po mrtvém procesu získá právě jeden běh (5 kol × 6 běhů)', jeden,
    JSON.stringify(vysledky.map(v => v.moje)));
  test('K3-N5: pomocný soubor zámku nezůstal', !readdirSync(tmp).some(f => /zamek2\.json\./.test(f)), readdirSync(tmp));
} finally {
  try { spac.kill('SIGKILL'); } catch (e) { /* už skončil */ }
  rmSync(tmp, { recursive: true, force: true });
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
