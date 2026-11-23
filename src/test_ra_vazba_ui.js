/* RA #723 (rozhodnutí J. V. 23. 11. 2026) — vazbu dealu ve stavu „ceka“
 * (z webhooku Pipedrive) potvrzuje tlačítkem „V pořádku“ JEN administrátor.
 *
 * Hlídá žlutý pruh pdVazbaUpozorneni (src/ui/pd_vazba_ui.js) v pískovišti:
 *   – administrátor vidí „V pořádku“ (a „Zrušit vazbu“),
 *   – autor zakázky vidí „Zrušit vazbu“ a štítek „čeká na potvrzení správcem“,
 *   – cizí obchodník i vedoucí vidí „Vazba je chybná“ a týž štítek,
 *   – potvrzená vazba štítek nemá.
 * Server hlídá netlify/test_k40c_webhook.mjs (403 pro všechny kromě správce).
 * Pojistka: před opravou autor i cizí obchodník „V pořádku“ viděli (sada padá).
 *
 * Spuštění: cd src && node test_ra_vazba_ui.js */
const fs = require('fs');
const vm = require('vm');
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 600)); } };

const ctx = {
  console, ONLINE_STAV: { ja: null },
  esc: (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  escJs: (s) => String(s), ctrlPdDealIdNorm: (x) => String(x == null ? '' : x).trim(), ctrlDenPraha: (k) => String(k).slice(0, 10),
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + '/ui/pd_vazba_ui.js', 'utf8'), ctx, { filename: 'ui/pd_vazba_ui.js' });
const kresli = (ja, stav) => {
  ctx.ONLINE_STAV.ja = ja;
  const zak = { autor: 'autor@priklad.cz', pdDealId: '4711',
    pdVazbaWebhook: { deal: '4711', kdy: '2026-11-23T08:00:00.000Z', cislo: 'CN-1', strana: 'ock', stav: stav || 'ceka', ares: '', doplneno: [] } };
  const html = vm.runInContext('pdVazbaUpozorneni', ctx)(zak);
  const tl = [...html.matchAll(/data-pd-vazba="([^"]+)"/g)].map(m => m[1]);
  return { html, tl };
};
const ADMIN = { email: 'spravce@priklad.cz', role: 'Administrátor' };
const AUTOR = { email: 'autor@priklad.cz', role: 'Obchodník' };
const CIZI = { email: 'cizi@priklad.cz', role: 'Obchodník' };
const VED = { email: 'vedouci@priklad.cz', role: 'Vedoucí' };

let r = kresli(ADMIN);
test('administrátor: „V pořádku“ a „Zrušit vazbu“, bez štítku čekání', r.tl.join() === 'potvrdit,zrusit' && !/čeká na potvrzení správcem/.test(r.html), r.tl);
r = kresli(AUTOR);
test('autor zakázky: bez „V pořádku“, „Zrušit vazbu“ + „čeká na potvrzení správcem“', r.tl.join() === 'ceka-spravce,zrusit'
  && /čeká na potvrzení správcem/.test(r.html), r.tl);
r = kresli(CIZI);
test('cizí obchodník: bez „V pořádku“, „Vazba je chybná“ + štítek', r.tl.join() === 'ceka-spravce,chybna', r.tl);
r = kresli(VED);
test('vedoucí: bez „V pořádku“ (potvrzuje jen administrátor)', r.tl.indexOf('potvrdit') < 0 && /čeká na potvrzení správcem/.test(r.html), r.tl);
test('pdVazbaSmiPotvrditUI: jen role Administrátor', (() => {
  const f = vm.runInContext('pdVazbaSmiPotvrditUI', ctx);
  ctx.ONLINE_STAV.ja = ADMIN; const a = f(); ctx.ONLINE_STAV.ja = VED; const b = f(); ctx.ONLINE_STAV.ja = null; const c = f();
  return a === true && b === false && c === false;
})());
r = kresli(AUTOR, 'potvrzeno');
test('potvrzená vazba: žádný štítek čekání ani „V pořádku“', !/čeká na potvrzení správcem/.test(r.html) && r.tl.indexOf('potvrdit') < 0, r.tl);

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
