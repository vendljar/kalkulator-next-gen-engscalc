/* Hlídač prohlížečového harnessu (13. 10. 2026, nález z noční dávky N1).
 *
 * `page.evaluate` v Playwrightu nemá vlastní časový limit. Když po selhání
 * testu (B59 v overit_online.mjs: server nabídku neuložil) otevře klient
 * skutečný modál — „neuložené změny", volba — slib v prohlížeči se nikdy
 * nesplní, harness visí a celé testovací kolo stojí bez výpisu. Tenhle
 * hlídač:
 *   - každému `page.evaluate` dá strop (výchozí 120 s) — po něm slib
 *     odmítne s chybou, která říká, který krok visel;
 *   - nastaví celkový strop běhu (výchozí 20 min);
 *   - na nezachycenou chybu i vypršení vypíše důvod, zkusí zavřít prohlížeč
 *     a server (úklid má vlastní strop 5 s) a ukončí proces kódem 1 —
 *     selhání, nikdy „prošlo" ani „přeskočeno".
 *
 * Použití (ESM harness přes createRequire):
 *   const { hlidejHarness } = require('./nastroje/harness_hlidac.js');
 *   hlidejHarness({ page, uklid: async () => { await prohlizec.close(); server.close(); } });
 */
'use strict';

const VYCHOZI_KROK_MS = 120000;
const VYCHOZI_CELKEM_MS = 20 * 60 * 1000;
const UKLID_MS = 5000;

function sLimitem(slib, ms, popis) {
  let casovac;
  const vyprseni = new Promise((_, reject) => {
    casovac = setTimeout(() => reject(new Error(`${popis}: bez odpovědi déle než ${Math.round(ms / 1000)} s (visí — např. otevřený modál)`)), ms);
  });
  return Promise.race([Promise.resolve(slib), vyprseni]).finally(() => clearTimeout(casovac));
}

/* Obalí page.evaluate (a evaluateHandle) limitem. Vrací stránku. */
function obalStranku(page, krokMs = VYCHOZI_KROK_MS) {
  for (const jm of ['evaluate', 'evaluateHandle']) {
    if (typeof page[jm] !== 'function' || page[jm].__hlidano) continue;
    const puvodni = page[jm].bind(page);
    const obal = (fn, ...arg) => {
      const nazev = String(fn).replace(/\s+/g, ' ').slice(0, 80);
      return sLimitem(puvodni(fn, ...arg), krokMs, `page.${jm}(${nazev}…)`);
    };
    obal.__hlidano = true;
    page[jm] = obal;
  }
  return page;
}

/* Hlídá celý harness. `konec(kod)` je pro testy (výchozí process.exit). */
function hlidejHarness({ page = null, uklid = null, krokMs = VYCHOZI_KROK_MS, celkemMs = VYCHOZI_CELKEM_MS,
                         konec = (k) => process.exit(k), vypis = (t) => console.error(t), proces = process } = {}) {
  if (page) obalStranku(page, krokMs);
  let skoncil = false;
  const ukonci = async (duvod) => {
    if (skoncil) return;
    skoncil = true;
    vypis('FAIL harness skončil předčasně: ' + duvod);
    if (uklid) { try { await sLimitem(uklid(), UKLID_MS, 'úklid'); } catch (e) { vypis('  (úklid: ' + e.message + ')'); } }
    konec(1);
  };
  const celkem = setTimeout(() => ukonci(`celkový strop ${Math.round(celkemMs / 60000)} min vypršel`), celkemMs);
  if (celkem.unref) celkem.unref();
  const naChybu = (e) => ukonci((e && e.stack) || String(e));
  proces.on('unhandledRejection', naChybu);
  proces.on('uncaughtException', naChybu);
  return { ukonci, zrus: () => { clearTimeout(celkem); proces.off('unhandledRejection', naChybu); proces.off('uncaughtException', naChybu); } };
}

module.exports = { hlidejHarness, obalStranku, sLimitem, VYCHOZI_KROK_MS, VYCHOZI_CELKEM_MS };
