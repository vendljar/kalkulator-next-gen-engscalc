/* ZÁMEK MUTAČNÍCH BĚHŮ (F1 / B194, 19. 10. 2026)
 *
 * Proč: mutační běh (mutace_jadro.mjs, netlify/mutace.mjs) přepisuje
 * skutečné soubory v pracovní kopii. Druhý běh, který by v téže kopii běžel
 * souběžně, by svoje sady pouštěl nad cizí mutací — výchozí stav pak padá
 * „bez mutace" (přesně tak se 19. 10. 2026 ve 13:07 ohlásilo
 * test_vyjimky.mjs: 1 selhalo) a chycené / nechycené mutace přestanou
 * cokoli znamenat. Doložená reprodukce: souběžná `mutace.mjs b178` (mutuje
 * src/vyjimky.js) shodila samostatné běhy test_vyjimky.mjs na 1–5 FAIL
 * v 7 z 11 pokusů; bez souběhu 400 / 400 zelených.
 *
 * Zámek je soubor `.mutace_bezi.json` v kořeni repozitáře (v .gitignore)
 * s PID, názvem běhu a časem startu procesu. Vytváří se atomicky; zámek po
 * mrtvém procesu se převezme (K3-N5 níž). Uvolní se při ukončení procesu (i po signálu — obě mutační
 * skripty končí přes process.exit). `--kontrola` zámek nebere: jen čte. */
/* K3-N5 (audit K3, dávka O5 20. 10. 2026) — tři díry zámku z v19.10.10:
 *   1. souběžné převzetí po mrtvém procesu: oba běhy zámek smazaly a založily
 *      znovu → běžely dva (test: 6 běhů naráz, zámek dostali tři);
 *   2. prázdný zámek mezi `openSync` a `writeSync` jiného běhu se bral jako
 *      „převzít";
 *   3. PID, které po SIGKILL dostal jiný proces, drželo zámek dál.
 * Teď: zámek vzniká celý najednou (`linkSync` z dočasného souboru — buď
 * existuje s celým záznamem, nebo vůbec); mrtvý zámek smí smazat jen běh,
 * který drží výlučný ZÁMEK PŘEVZETÍ (`<zámek>.prevzeti`, týmž `linkSync`)
 * a pod ním zámek znovu přečte — živý zámek tak nesmaže nikdo jiný než jeho
 * vlastník (pokus s přesunem a vracením zámku nechal při 6 bězích naráz
 * vklouznout třetí běh a zámek drželi dva); záznam nese čas startu procesu
 * (/proc/<pid>/stat, pole 22) a jiný čas startu = jiný proces. Prázdný
 * nebo nečitelný zámek mladší ZAMEK_ROZEPSANY_MS se nepřebírá. */
import { writeFileSync, readFileSync, unlinkSync, linkSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/* KNG_MUTACE_ZAMEK jen pro test_mutace_zamek.mjs (izolace od skutečných běhů). */
export const ZAMEK_CESTA = process.env.KNG_MUTACE_ZAMEK
  || resolve(dirname(fileURLToPath(import.meta.url)), '..', '.mutace_bezi.json');
const ZAMEK_ROZEPSANY_MS = 30000;
/* zámek převzetí drží běh jen po dobu přečtení a smazání mrtvého zámku;
 * starší patří běhu, který mezi tím umřel */
const PREVZETI_MAX_MS = 10000;
const spi = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/* Čas startu procesu (v tikách od startu systému); bez /proc ''. */
function startProcesu(pid) {
  try {
    const st = readFileSync('/proc/' + pid + '/stat', 'utf8');
    return st.slice(st.lastIndexOf(')') + 2).split(' ')[19] || '';   // pole 22 (za jménem procesu)
  } catch (e) { return ''; }
}
function zije(pid, start) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); }
  catch (e) { if (!e || e.code !== 'EPERM') return false; }
  /* záznam z dřívějška bez času startu nebo systém bez /proc: jen PID */
  if (!start) return true;
  const ted = startProcesu(pid);
  return !ted || ted === String(start);
}
function precti(cesta) {
  try { return readFileSync(cesta, 'utf8'); } catch (e) { return null; }
}
function rozeber(raw) {
  try { const z = JSON.parse(raw); return z && typeof z === 'object' ? z : null; } catch (e) { return null; }
}
function cerstvy(cesta) {
  try { return Date.now() - statSync(cesta).mtimeMs < ZAMEK_ROZEPSANY_MS; } catch (e) { return false; }
}

/* Vrací null (zámek je náš) nebo popis běhu, který zámek drží. */
export function zamkniMutace(nazev, cesta = ZAMEK_CESTA) {
  const zaznam = JSON.stringify({ pid: process.pid, beh: nazev, od: new Date().toISOString(), start: startProcesu(process.pid) });
  const docasny = cesta + '.' + process.pid + '.zaklad';
  writeFileSync(docasny, zaznam);
  try {
    for (let pokus = 0; pokus < 200; pokus++) {
      try {
        linkSync(docasny, cesta);                // atomicky: zámek je celý, nebo není
        process.on('exit', () => {
          try { if (rozeber(precti(cesta)).pid === process.pid) unlinkSync(cesta); }
          catch (e) { /* už není */ }
        });
        return null;
      } catch (e) {
        if (!e || e.code !== 'EEXIST') throw e;
      }
      const raw = precti(cesta);
      if (raw === null) continue;                // mezitím zmizel — zkusit znovu
      const drzi = rozeber(raw);
      if (drzi && drzi.pid === process.pid) return null;
      if (drzi && zije(drzi.pid, drzi.start)) return drzi;
      if (!drzi && cerstvy(cesta)) return { pid: '?', beh: 'jiný běh právě zakládá zámek', od: '' };
      /* Zámek po mrtvém běhu (nebo starý nečitelný) — převzít, ale jen pod
       * výlučným zámkem převzetí a jen když je zámek pořád tentýž. */
      const prevzeti = cesta + '.prevzeti';
      writeFileSync(docasny, zaznam);            // čerstvý čas změny (PREVZETI_MAX_MS)
      try { linkSync(docasny, prevzeti); }
      catch (e) {
        if (!e || e.code !== 'EEXIST') throw e;
        let stary = false;
        try { stary = Date.now() - statSync(prevzeti).mtimeMs > PREVZETI_MAX_MS; } catch (e2) { /* mezitím zmizel */ }
        if (stary) { try { unlinkSync(prevzeti); } catch (e2) { /* už není */ } }
        spi(20 + Math.floor(Math.random() * 30));
        continue;
      }
      try {
        if (precti(cesta) === raw) unlinkSync(cesta);
      } catch (e) { /* mezitím zmizel */ }
      finally { try { unlinkSync(prevzeti); } catch (e) { /* už není */ } }
    }
    return { pid: '?', beh: 'neznámý (zámek nejde převzít)', od: '' };
  } finally {
    try { unlinkSync(docasny); } catch (e) { /* už není */ }
  }
}

export function zamekHlaska(drzi) {
  return 'PŘERUŠENO: v této pracovní kopii už běží jiný mutační běh (' + drzi.beh + ', PID ' + drzi.pid
    + (drzi.od ? ', od ' + drzi.od : '') + ').\nSouběžné mutace by si navzájem rozbíjely sady (B194). '
    + 'Počkejte na jeho konec; zámek po ukončeném běhu se převezme sám (' + ZAMEK_CESTA + ').';
}
