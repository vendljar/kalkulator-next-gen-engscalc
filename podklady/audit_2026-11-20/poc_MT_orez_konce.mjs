/* PoC MT-2 (audit 20. 11. 2026, čočka MT): kvadratický ořez konce textu (K40-X1/X2, #579).
 *
 * `nazevCast` (src/nazvy_souboru.js) běží v prohlížeči při každém render() nad
 * názvem varianty / zákazníka z uložené zakázky. Výraz s kotvou jen na konci
 * (`[-.]+$`) je nad dlouhým textem ze samých „.-“ kvadratický: jeden obchodník
 * uloží takový název a zakázka pak zamrzá každému, kdo ji otevře.
 *
 * Strom kódu: KNG_STROM (výchozí = tento repozitář). Bez sítě, jen měření času.
 *   node podklady/audit_2026-11-20/poc_MT_orez_konce.mjs
 *   KNG_STROM=<export origin/main> node podklady/audit_2026-11-20/poc_MT_orez_konce.mjs */
import { createRequire } from 'node:module';
import path from 'node:path';
const R = path.resolve(process.env.KNG_STROM || new URL('../..', import.meta.url).pathname) + '/';
const require = createRequire(R + 'src/x.js');
Object.assign(globalThis, require(R + 'src/format.js'));   // orezKonce (na main chybí)
const N = require(R + 'src/nazvy_souboru.js');
const verze = require('node:fs').readFileSync(R + 'verze.txt', 'utf8').trim();
console.log('strom: ' + R + '  (verze ' + verze + ')');
let nejhorsi = 0;
for (const n of [15000, 30000, 60000]) {
  const vstup = 'x' + '.-'.repeat(n / 2) + 'x';      // dlouhý běh „.-“ uprostřed, na konci jiný znak
  const t0 = process.hrtime.bigint();
  const vystup = N.nazevCast(vstup);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  nejhorsi = Math.max(nejhorsi, ms);
  console.log('nazevCast(' + n + ' znaků) → ' + ms.toFixed(1) + ' ms, výstup ' + String(vystup).length + ' znaků');
}
console.log(nejhorsi > 500
  ? 'ZRANITELNÉ — jedno volání trvá ' + Math.round(nejhorsi) + ' ms (kvadratický čas, volá se při každém překreslení).'
  : 'ODOLNÉ — nejdelší volání ' + nejhorsi.toFixed(1) + ' ms.');
