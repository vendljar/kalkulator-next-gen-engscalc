/* ============================================================
 * DÁVKA NN (22. 11. 2026) — PoC bezpečnostního auditu 20. 11. 2026 jako
 * stálá sada (doporučení auditu „převzít PoC jako sady", #702).
 *
 * Každý PoC v podklady/audit_2026-11-20/ běží v paměti, bez sítě, se
 * smyšlenými účty @priklad.cz a končí verdiktem ODOLNÉ / ZRANITELNÉ.
 *   B237  poc_AZ_3_prepis_bez_razitka   tělo bez razítka verze nepřepíše cizí zakázku
 *   B238  poc_AZ_4_lhuty_snimek         snímek lhůt PROJ píše server, ne klient
 *   B240  poc_AU_spravce_stary_zapis    akce správce nevrátí změnu hesla / odhlášení
 *   B243, B244, B234  poc_AD_zakaznici  objekt v poli 400, strop zalozen, autor karty
 * Pojistka: před opravou dávky NN hlásí ZRANITELNÉ PoC AZ-3, AZ-4, AU-2
 * a AD-2/AD-3 (doloženo v commitech NN).
 * ============================================================ */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n + (info ? ' ' + info : '')); } };
function spust(poc) {
  try { return execFileSync(process.execPath, [path.join(koren, 'podklady/audit_2026-11-20', poc + '.mjs')],
    { env: Object.assign({}, process.env, { KNG_STROM: koren }), encoding: 'utf8', timeout: 180000 }); }
  catch (e) { return String((e.stdout || '') + (e.stderr || '')); }
}
const posledni = (out) => out.trim().split('\n').slice(-3).join(' | ').slice(0, 400);
for (const [id, poc] of [['B237', 'poc_AZ_3_prepis_bez_razitka'], ['B238', 'poc_AZ_4_lhuty_snimek'],
  ['B240', 'poc_AU_spravce_stary_zapis'], ['B243/B244', 'poc_AD_zakaznici']]) {
  const out = spust(poc);
  test(id + ': ' + poc + ' = ODOLNÉ', /ODOLNÉ/.test(out) && !/ZRANITELNÉ/.test(out), posledni(out));
}
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
