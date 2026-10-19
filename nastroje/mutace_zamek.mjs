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
 * s PID a názvem běhu. Vytváří se atomicky (`wx`); zámek po mrtvém procesu
 * se převezme. Uvolní se při ukončení procesu (i po signálu — obě mutační
 * skripty končí přes process.exit). `--kontrola` zámek nebere: jen čte. */
import { openSync, writeSync, closeSync, readFileSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/* KNG_MUTACE_ZAMEK jen pro test_mutace_zamek.mjs (izolace od skutečných běhů). */
export const ZAMEK_CESTA = process.env.KNG_MUTACE_ZAMEK
  || resolve(dirname(fileURLToPath(import.meta.url)), '..', '.mutace_bezi.json');

function zije(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; }
  catch (e) { return e && e.code === 'EPERM'; }
}

/* Vrací null (zámek je náš) nebo popis běhu, který zámek drží. */
export function zamkniMutace(nazev, cesta = ZAMEK_CESTA) {
  const zaznam = JSON.stringify({ pid: process.pid, beh: nazev, od: new Date().toISOString() });
  for (let pokus = 0; pokus < 2; pokus++) {
    try {
      const fd = openSync(cesta, 'wx');
      writeSync(fd, zaznam); closeSync(fd);
      process.on('exit', () => {
        try { if (JSON.parse(readFileSync(cesta, 'utf8')).pid === process.pid) unlinkSync(cesta); }
        catch (e) { /* už není */ }
      });
      return null;
    } catch (e) {
      if (!e || e.code !== 'EEXIST') throw e;
      let drzi = null;
      try { drzi = JSON.parse(readFileSync(cesta, 'utf8')); } catch (e2) { /* rozepsaný nebo poškozený */ }
      if (drzi && zije(drzi.pid) && drzi.pid !== process.pid) return drzi;
      /* Zámek po mrtvém běhu (nebo nečitelný) — převzít. */
      try { unlinkSync(cesta); } catch (e3) { /* mezitím zmizel */ }
    }
  }
  return { pid: '?', beh: 'neznámý (zámek nejde převzít)', od: '' };
}

export function zamekHlaska(drzi) {
  return 'PŘERUŠENO: v této pracovní kopii už běží jiný mutační běh (' + drzi.beh + ', PID ' + drzi.pid
    + (drzi.od ? ', od ' + drzi.od : '') + ').\nSouběžné mutace by si navzájem rozbíjely sady (B194). '
    + 'Počkejte na jeho konec; zámek po ukončeném běhu se převezme sám (' + ZAMEK_CESTA + ').';
}
