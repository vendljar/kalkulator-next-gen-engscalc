/* PoC čočky AD: co obchodník dostane z čtecích cest číselníků a zda vadný
 * vstup shodí funkci (500). Spuštění: node podklady/audit_2026-11-20/poc_AD_cteni_a_500.mjs */
import { pamet, post, get, cObchA, cAdmin } from './poc_AD_spolecne.mjs';
const imp = async n => (await import('../../netlify/functions/' + n + '.mjs')).default;
const F = {}; for (const n of ['analytika', 'popisy', 'sablony', 'program', 'firma', 'zobrazeni', 'slovnik', 'controlling', 'controlling_export', 'zaloha', 'zaloha_vynuceno', 'obnova', 'zakaznici']) F[n] = await imp(n);
const zkus = async (popis, fn) => { let s; try { const r = await fn(); s = r.status; } catch (e) { s = 'VÝJIMKA ' + e.message; } console.log(String(s).padEnd(10) + popis); return s; };
let spatne = 0;
const cekam = async (popis, ok, fn) => { const s = await zkus(popis, fn); if (!ok.includes(s)) { spatne++; console.log('   ^^^ NEČEKANÉ (čekáno ' + ok.join('/') + ')'); } };
console.log('— zápisy číselníků obchodníkem (čeká se 403) —');
for (const [n, telo] of [['popisy', { klic: 'x', text: 'y' }], ['sablony', { akce: 'rezim', rezim: 'mekky' }], ['program', {}], ['firma', { udaje: {} }],
  ['zobrazeni', { matice: {} }], ['slovnik', { hesla: {} }], ['controlling', { data: {} }], ['zaloha_vynuceno', {}], ['obnova', { rezim: 'doplnit' }]])
  await cekam('POST /api/' + n, [403], () => post(F[n], 'http://x/api/' + n, telo, cObchA));
for (const u of ['zaloha', 'zaloha?zdroj=nocni', 'zaloha?strana=1', 'zaloha_vynuceno', 'controlling', 'controlling/export?protokol=1', 'analytika', 'popisy?sber=1'])
  await cekam('GET /api/' + u, [403], () => get(F[u.split(/[?/]/)[0] === 'controlling' && u.includes('export') ? 'controlling_export' : u.split(/[?/]/)[0]], 'http://x/api/' + u, cObchA));
console.log('— vadné vstupy obchodníka (čeká se 200/400, ne 500) —');
const A = 'http://x/api/analytika';
for (const telo of [{ akce: 'udalosti', den: { pocty: { a: { toString: 1 } } } }, { akce: 'udalosti', den: { pocty: 5, role: [], uzivatele: 'x' } },
  { akce: 'udalosti', casy: { '2026 - OPR - CN - 0001': { ock: { valueOf: 1 } } } }, { akce: 'udalosti', den: { __proto__x: 1, pocty: { ['a'.repeat(5000)]: 1e308 } } },
  { akce: { toString: 1 } }])
  await cekam('POST analytika ' + JSON.stringify(telo).slice(0, 70), [200, 400], () => post(F.analytika, A, telo, cObchA));
await cekam('GET sablony?typ=nabidka&verze=abc', [404, 400], () => get(F.sablony, 'http://x/api/sablony?typ=nabidka&verze=abc', cObchA));
await cekam('GET sablony?typ=../rejstrik', [400], () => get(F.sablony, 'http://x/api/sablony?typ=' + encodeURIComponent('../rejstrik'), cObchA));
await cekam('GET sablony?typ=__proto__', [400, 404], () => get(F.sablony, 'http://x/api/sablony?typ=__proto__', cObchA));
await cekam('GET sablony?typ=constructor', [400, 404], () => get(F.sablony, 'http://x/api/sablony?typ=constructor', cObchA));
console.log(spatne ? '\nVÝSLEDEK: ZRANITELNÉ (' + spatne + ' nečekaných odpovědí)' : '\nVÝSLEDEK: ODOLNÉ');
