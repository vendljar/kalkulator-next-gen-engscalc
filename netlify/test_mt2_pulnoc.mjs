/* ============================================================
 * MT2 (24. 11. 2026) — SADY KOLEM PŮLNOCI (Praha × UTC)
 *
 * Kolo nad db1e9e7 spuštěné 23. 11. ve 23:00 UTC (00:00 Praha) mělo 4 červené
 * sady: „400 Neuloženo: Datum prodeje nesmí být dřív než odeslání nabídky“.
 * Sady braly datum prodeje jako den v UTC, server razí odeslání v pražském
 * dni (objDnes). Sady teď berou den z netlify/pomoc_den.mjs (dnesPraha).
 *
 * Tahle sada pustí dotčené sady s falešnými hodinami
 * (netlify/pomoc_falesne_hodiny.mjs) v čase, kdy je v Praze už zítra:
 *   – zima: 23:30 UTC = 00:30 SEČ,
 *   – léto: 22:30 UTC = 00:30 SELČ,
 * a v čase, kdy je den v obou zónách stejný (kontrola harnessu).
 * Pojistka: před opravou ve 23:30 UTC selžou všechny 4, po opravě projdou.
 * Spuštění: node netlify/test_mt2_pulnoc.mjs
 * ============================================================ */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { dnesPraha } from './pomoc_den.mjs';

const ZDE = path.dirname(fileURLToPath(import.meta.url));
const KOREN = path.resolve(ZDE, '..');
let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : String(info).slice(0, 800)); }
};

/* Pomocník sám: pražský den, ne UTC. */
test('dnesPraha ve 23:30 UTC v zimě = zítřek (Praha)', dnesPraha('2026-11-23T23:30:00Z') === '2026-11-24');
test('dnesPraha ve 22:30 UTC v létě = zítřek (Praha)', dnesPraha('2026-07-14T22:30:00Z') === '2026-07-15');
test('dnesPraha v poledne UTC = týž den', dnesPraha('2026-11-23T12:00:00Z') === '2026-11-23');

/* Falešné hodiny opravdu posunou čas v dětském procesu. */
const hodiny = (cas, args) => spawnSync(process.execPath,
  ['--import', './netlify/pomoc_falesne_hodiny.mjs', ...args],
  { cwd: KOREN, env: { ...process.env, KNG_FALESNE_HODINY: cas }, encoding: 'utf8', timeout: 240000 });
const h = hodiny('2026-11-23T23:30:00Z', ['-e', 'process.stdout.write(new Date().toISOString().slice(0, 16) + "|" + new Date(Date.now()).toISOString().slice(0, 10) + "|" + new Date(0).toISOString().slice(0, 4))']);
test('falešné hodiny: new Date(), Date.now a pevné datum', h.stdout === '2026-11-23T23:30|2026-11-23|1970', h.stdout + h.stderr);

const SADY = ['test_bz_bezpecnost.mjs', 'test_cn_cislo_nabidky.mjs', 'test_nn_nizke.mjs', 'test_ra_rozhodnuti.mjs'];
const CASY = [['zima 23:30 UTC (00:30 Praha)', '2026-11-23T23:30:00Z'],
  ['léto 22:30 UTC (00:30 Praha)', '2026-07-14T22:30:00Z'],
  ['poledne (stejný den)', '2026-11-24T11:00:00Z']];
for (const [popis, cas] of CASY) {
  for (const s of SADY) {
    const r = hodiny(cas, ['netlify/' + s]);
    const konec = (r.stdout || '').trim().split('\n').slice(-1)[0];
    test(s + ' — ' + popis, r.status === 0, konec + '\n' + (r.stdout || '').split('\n').filter((x) => /FAIL|selhal/.test(x)).slice(0, 3).join('\n') + (r.stderr || '').slice(0, 300));
  }
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
