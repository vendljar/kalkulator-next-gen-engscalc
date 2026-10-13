/* Test hlídače prohlížečových harnessů (nastroje/harness_hlidac.js, 13. 10. 2026).
 *
 * Nález N1: overit_online.mjs po selhání B59 visel na page.evaluate nad
 * skutečným modálem a celé kolo stálo. Tady se bez prohlížeče (falešná
 * stránka, falešný proces) ověří, že visící krok skončí chybou s popisem,
 * nezachycená chyba harness ukončí kódem 1 po úklidu, úklid, který sám
 * visí, konec nezablokuje, a rychlý krok projde beze změny. */
const { EventEmitter } = require('events');
const { hlidejHarness, obalStranku, sLimitem } = require('../nastroje/harness_hlidac.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info || ''); } };
const cekej = (ms) => new Promise(r => setTimeout(r, ms));
/* Pojistka proti prázdnému testu: kdyby hlídač visící slib nepřerušil, Node
 * skončí bez souhrnu — a bez tohohle by to byl kód 0, tedy „prošlo". */
process.exitCode = 1;

(async () => {
  /* 1) visící page.evaluate skončí chybou */
  const page = { evaluate: () => new Promise(() => {}), evaluateHandle: async (f, a) => a };
  obalStranku(page, 50);
  let chyba = null;
  const t0 = Date.now();
  try { await page.evaluate(async () => { await onlineOtevri('x'); }); } catch (e) { chyba = e; }
  test('visící page.evaluate skončí chybou (ne věčným čekáním)', chyba && Date.now() - t0 < 2000, chyba);
  test('chyba říká, který krok visel', chyba && /page\.evaluate\(async \(\) => \{ await onlineOtevri/.test(chyba.message) && /visí/.test(chyba.message), chyba && chyba.message);
  test('rychlý krok projde s výsledkem', (await page.evaluateHandle(() => 1, 42)) === 42);
  obalStranku(page, 50);
  test('dvojí obalení nepřidá druhou vrstvu', page.evaluate.__hlidano === true);

  /* 2) nezachycená chyba → úklid → konec(1) */
  const proc = new EventEmitter();
  const kody = [], vypisy = []; let uklizeno = 0;
  const h = hlidejHarness({ proces: proc, celkemMs: 60000, konec: (k) => kody.push(k), vypis: (t) => vypisy.push(t),
    uklid: async () => { uklizeno++; } });
  proc.emit('unhandledRejection', new Error('page.evaluate: zkouška'));
  await cekej(20);
  test('nezachycená chyba ukončí harness kódem 1', kody.length === 1 && kody[0] === 1, kody);
  test('před koncem proběhne úklid (prohlížeč, server)', uklizeno === 1);
  test('výpis začíná FAIL a nese důvod', /^FAIL harness skončil předčasně: Error: page\.evaluate: zkouška/.test(vypisy[0] || ''), vypisy);
  proc.emit('uncaughtException', new Error('druhá'));
  await cekej(20);
  test('druhá chyba už konec neopakuje', kody.length === 1, kody);
  h.zrus();
  test('zrus() odebere posluchače', proc.listenerCount('unhandledRejection') === 0 && proc.listenerCount('uncaughtException') === 0);

  /* 3) celkový strop a úklid, který sám visí */
  const proc2 = new EventEmitter(); const kody2 = [];
  const h2 = hlidejHarness({ proces: proc2, celkemMs: 30, konec: (k) => kody2.push(k), vypis: () => {},
    uklid: () => new Promise(() => {}) });
  await cekej(5600);
  test('celkový strop ukončí harness kódem 1 i s visícím úklidem', kody2.length === 1 && kody2[0] === 1, kody2);
  h2.zrus();

  test('sLimitem pustí výsledek včas splněného slibu', (await sLimitem(Promise.resolve(7), 100, 'x')) === 7);

  console.log(`\n${ok} OK / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
