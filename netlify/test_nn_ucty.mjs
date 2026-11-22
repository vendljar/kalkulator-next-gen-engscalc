/* ============================================================
 * DÁVKA NN (22. 11. 2026) — B240: akce správce nevrátí souběžnou změnu
 * hesla ani odhlášení (audit 20. 11. 2026, čočka AU, #702).
 *
 * Sada pouští PoC auditu podklady/audit_2026-11-20/poc_AU_spravce_stary_zapis.mjs
 * (paměťové úložiště se zpožděním, bez sítě, smyšlené účty @priklad.cz)
 * a čeká verdikt ODOLNÉ. Pojistka: před opravou (zápis celého účtu
 * přečteného před potvrzením hesla) PoC hlásí ZRANITELNÉ — ukradená cookie
 * po zásahu správce zase platí.
 * ============================================================ */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n + (info ? ' ' + info : '')); } };
let out = '';
try { out = execFileSync(process.execPath, [path.join(koren, 'podklady/audit_2026-11-20/poc_AU_spravce_stary_zapis.mjs')],
  { env: Object.assign({}, process.env, { KNG_STROM: koren }), encoding: 'utf8', timeout: 120000 }); }
catch (e) { out = String((e.stdout || '') + (e.stderr || '')); }
test('B240: zásah správce verzi hesla ani otisk nevrátí (PoC AU-2 = ODOLNÉ)', /ODOLNÉ/.test(out) && !/ZRANITELNÉ/.test(out), out.split('\n').slice(-4).join(' | '));
test('B240: PoC proběhl oba děje (a) odhlášení, (b) změna hesla', /\(a\)/.test(out) && /\(b\)/.test(out));
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
