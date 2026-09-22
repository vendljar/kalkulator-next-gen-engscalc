/* ============================================================
 * PŘERUŠENÝ MUTAČNÍ BĚH VRÁTÍ ZMUTOVANÝ SOUBOR
 * (nález T5 revize v22.9.9, 22. 9. 2026)
 *
 * V 19. testovacím kole se `netlify/mutace.mjs` přerušil uprostřed mutace
 * a v pracovní kopii zůstal rozbitý serverový soubor — kontrola nahrazená
 * `if (false)`. Nikdo si toho hned nevšiml: soubor vypadal jako běžná úprava.
 * `finally` ve smyčce se při ukončení signálem vůbec nespustí a obsluha
 * signálu chyběla.
 *
 * Tahle sada spustí SKUTEČNÝ mutační běh s jedinou mutací a místo serverových
 * sad mu podstrčí drobný skript (proměnná KNG_MUTACE_SADY), který projde
 * hned, dokud soubor zmutovaný není, a čeká, když zmutovaný je. Ve chvíli,
 * kdy mutace prokazatelně leží na disku, pošle běhu signál a ověří, že:
 *   – běh skončil kódem 130 a řekl proč,
 *   – soubor je bajt po bajtu v původním znění,
 *   – čekající sada nezůstala viset jako sirotek.
 * Zkouší se SIGINT (Ctrl+C) i SIGTERM (kill, časový limit CI).
 *
 * POJISTKA: sada sama sahá na skutečný soubor v repozitáři (přes mutační
 * běh). Kdyby cokoli selhalo, `finally` níž soubor vrátí a test selže —
 * rozbitý soubor v pracovní kopii nesmí zůstat ani po pádu téhle sady.
 * ============================================================ */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOREN = dirname(fileURLToPath(import.meta.url));
const CIL = resolve(KOREN, 'functions/zakazky.mjs');
const MUTACE = 'B59: server výsledek nového zámku neověří';
const ZNAK_MUTACE = '    const ov = null;';        // `nahrad` té mutace v mutace.mjs

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : info); }
};
const pockej = (ms) => new Promise(r => setTimeout(r, ms));

const puvodni = readFileSync(CIL, 'utf8');
test('příprava: cílový soubor mutaci ještě nenese', !puvodni.includes(ZNAK_MUTACE));
test('příprava: mutace v seznamu existuje',
  readFileSync(resolve(KOREN, 'mutace.mjs'), 'utf8').includes("nazev: '" + MUTACE + "'"));

const dir = mkdtempSync(join(tmpdir(), 'kng-mutace-'));
const ZNACKA = join(dir, 'sada-bezi.txt');
const SADA = join(dir, 'sada.mjs');
/* Zástupná sada: nezmutovaný soubor = „prošlo" hned; zmutovaný = zapíše své
 * PID (ať jde ověřit, že po přerušení nežije) a čeká. */
writeFileSync(SADA, `
import { readFileSync, writeFileSync } from 'node:fs';
if (!readFileSync(${JSON.stringify(CIL)}, 'utf8').includes(${JSON.stringify(ZNAK_MUTACE)})) {
  console.log('1 prošlo, 0 selhalo'); process.exit(0);
}
writeFileSync(${JSON.stringify(ZNACKA)}, String(process.pid));
setTimeout(() => { console.log('1 prošlo, 0 selhalo'); }, 60000);
`, 'utf8');

async function prerus(signal) {
  rmSync(ZNACKA, { force: true });
  const beh = spawn(process.execPath, [resolve(KOREN, 'mutace.mjs'), MUTACE],
    { env: { ...process.env, KNG_MUTACE_SADY: SADA }, stdio: ['ignore', 'pipe', 'pipe'] });
  let vystup = '';
  beh.stdout.on('data', d => { vystup += d; });
  beh.stderr.on('data', d => { vystup += d; });
  const konec = new Promise(r => beh.on('exit', (kod, sig) => r({ kod, sig })));

  /* Signál až ve chvíli, kdy je mutace na disku A zástupná sada běží. */
  let naDisku = false;
  for (let i = 0; i < 400 && !naDisku; i++) {
    await pockej(50);
    naDisku = existsSync(ZNACKA) && readFileSync(CIL, 'utf8').includes(ZNAK_MUTACE);
  }
  test(signal + ': mutace je na disku a sada běží (jinak by test nic neměřil)', naDisku, vystup);
  const pidSady = existsSync(ZNACKA) ? Number(readFileSync(ZNACKA, 'utf8')) : 0;

  beh.kill(signal);
  const vysledek = await Promise.race([konec, pockej(15000).then(() => null)]);
  if (!vysledek) beh.kill('SIGKILL');
  test(signal + ': běh po signálu skončí', !!vysledek, vystup);
  test(signal + ': kódem 130', vysledek && vysledek.kod === 130, vysledek && JSON.stringify(vysledek));
  test(signal + ': a řekne, že vrátil zmutovaný soubor',
    new RegExp('PŘERUŠENO \\(' + signal + '\\) — zmutovaný soubor vrácen').test(vystup), vystup);
  test(signal + ': soubor je v původním znění', readFileSync(CIL, 'utf8') === puvodni);

  /* Běží ještě? Zombie (ukončený proces, po kterém nikdo neuklidil) už
   * neběží — v Linuxu se pozná z /proc, jinde stačí signál 0. */
  let sadaZije = false;
  if (pidSady) {
    await pockej(200);
    try { process.kill(pidSady, 0); sadaZije = true; } catch (e) { sadaZije = false; }
    if (sadaZije) {
      try { sadaZije = !/^State:\s*Z/m.test(readFileSync('/proc/' + pidSady + '/status', 'utf8')); }
      catch (e) { /* bez /proc platí signál 0 */ }
    }
  }
  test(signal + ': čekající sada nezůstala viset', pidSady > 0 && !sadaZije, 'pid ' + pidSady);
  if (sadaZije) { try { process.kill(pidSady, 'SIGKILL'); } catch (e) { /* nic */ } }
}

try {
  await prerus('SIGINT');
  await prerus('SIGTERM');
} finally {
  if (readFileSync(CIL, 'utf8') !== puvodni) {
    writeFileSync(CIL, puvodni, 'utf8');
    test('POJISTKA: soubor musel vrátit až tenhle test — mutační běh ho nechal rozbitý', false);
  }
  rmSync(dir, { recursive: true, force: true });
}

console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
if (fail) process.exit(1);
