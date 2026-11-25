/* K39-N2 (kolo 39, 3. 11. 2026): Nastavení → Šablony a filtr OCK | PROJ.
 *
 * overit_nabidka_proj_word.mjs hledal řádek šablony PROJ v nastSablony()
 * ve výchozím pohledu OCK — od #367 tam ale řádek PROJ schválně chybí
 * (podmSablonaViditelna) a harness trvale hlásil 59/1. Navíc bez firemní
 * šablony (Sablona_NABIDKA_PROJ.docx) se celý přeskočí, takže v testovacím
 * kole se filtr nehlídal vůbec. Tenhle harness podklady nepotřebuje
 * a v kole běží vždy (glob overit_*.mjs).
 *
 * Hlídá: „všechny šablony" ukáže OCK i PROJ, „jen OCK" bez PROJ, „jen PROJ"
 * bez OCK; přepínač (podmPrepni, podmSablonyVse) jde přes skutečné UI funkce;
 * stav se po čtení vrátí. */
import { chromium } from 'playwright';
import path from 'path';
const soubor = 'file://' + path.resolve('dist/kalkulacka.html');
let ok = 0, fail = 0;
const zkus = (p, c, d) => { if (c) { ok++; console.log('  ✓ ' + p); } else { fail++; console.log('  ✕ ' + p + (d ? '  → ' + d : '')); } };
const b = await chromium.launch();
const s = await b.newPage({ viewport: { width: 1500, height: 1000 } });
const chyby = [];
s.on('pageerror', e => chyby.push(String(e)));
await s.goto(soubor); await s.waitForTimeout(400);

const r = await s.evaluate(() => {
  const radky = () => { const h = nastSablony();
    return { ock: /Šablona cenové nabídky OCK/.test(h), proj: /Šablona cenové nabídky PROJ/.test(h) }; };
  const pred = { vse: NAST.sablonyVse, panel: NAST.panelPodminky };
  const out = { funkce: typeof nastSablony === 'function' && typeof podmPrepni === 'function'
    && typeof podmSablonyVse === 'function' };
  if (!out.funkce) return out;
  podmSablonyVse(false); podmPrepni('ock'); out.ock = radky();
  podmPrepni('proj'); out.proj = radky();
  podmSablonyVse(true); out.vseProj = radky();
  podmPrepni('ock'); out.vseOck = radky();
  podmSablonyVse(!!pred.vse); NAST.panelPodminky = pred.panel;
  out.vraceno = NAST.sablonyVse === pred.vse || (!NAST.sablonyVse && !pred.vse);
  return out;
});
zkus('UI funkce šablon a filtru existují', r.funkce, JSON.stringify(r));
zkus('filtr „jen OCK": řádek OCK je', r.ock && r.ock.ock, JSON.stringify(r.ock));
zkus('filtr „jen OCK": řádek PROJ chybí', r.ock && !r.ock.proj, JSON.stringify(r.ock));
zkus('filtr „jen PROJ": řádek PROJ je', r.proj && r.proj.proj, JSON.stringify(r.proj));
zkus('filtr „jen PROJ": řádek OCK chybí', r.proj && !r.proj.ock, JSON.stringify(r.proj));
zkus('„všechny šablony" (část PROJ): OCK i PROJ', r.vseProj && r.vseProj.ock && r.vseProj.proj, JSON.stringify(r.vseProj));
zkus('„všechny šablony" (část OCK): OCK i PROJ', r.vseOck && r.vseOck.ock && r.vseOck.proj, JSON.stringify(r.vseOck));
zkus('stav filtru se po kontrole vrátil', r.vraceno);
/* NS (pokyn J. V. 18. 11. 2026): správa šablon stojí hned pod přepínačem
 * OCK | PROJ a nad platebními podmínkami — v obou kartách, offline i online
 * obrazovce. Před úpravou byla šablony až pod logem firmy (pořadí 1-3-2). */
const poradi = await s.evaluate(() => {
  const pred = { vse: NAST.sablonyVse, panel: NAST.panelPodminky, online: window.sablonyOnlineAktivni };
  const mista = (h, cast) => ({
    prepinac: h.indexOf('podm-prepinac'),
    sablony: h.indexOf('<div class="sec-title">Šablony dokumentů'),
    platebni: h.indexOf('<div class="sec-title">Platební podmínky ' + cast + '</div>'),
    standardy: h.indexOf('<div class="sec-title">Smluvní standardy'),
  });
  const out = {};
  podmSablonyVse(false);
  podmPrepni('ock'); out.ock = mista(nastSablony(), 'OCK');
  podmPrepni('proj'); out.proj = mista(nastSablony(), 'PROJ');
  /* online obrazovka (správa šablon ze serveru) — bez serveru stačí zástupce */
  window.sablonyOnlineAktivni = () => true;
  try { podmPrepni('ock'); out.onlineOck = mista(nastSablony(), 'OCK'); out.onlineSprava = /sabl-banner|sabl-tab/.test(nastSablony()); }
  finally { window.sablonyOnlineAktivni = pred.online; }
  podmSablonyVse(!!pred.vse); NAST.panelPodminky = pred.panel;
  return out;
});
const vPoradi = m => m && m.prepinac >= 0 && m.prepinac < m.sablony && m.sablony < m.platebni && m.platebni < m.standardy;
zkus('NS: OCK — přepínač → šablony → Platební podmínky OCK → Smluvní standardy', vPoradi(poradi.ock), JSON.stringify(poradi.ock));
/* PD2 (#782, J. V. 25. 11. 2026): „Způsob fakturace — projekce“ zrušen — karta PROJ smluvní
 * standardy nemá (prázdná sekce se netiskne); pořadí přepínač → šablony → platební podmínky zůstává. */
zkus('NS: PROJ — přepínač → šablony → Platební podmínky PROJ; Smluvní standardy PROJ zrušeny (PD2)',
  poradi.proj && poradi.proj.prepinac >= 0 && poradi.proj.prepinac < poradi.proj.sablony && poradi.proj.sablony < poradi.proj.platebni
  && poradi.proj.standardy === -1, JSON.stringify(poradi.proj));
zkus('NS: online správa šablon — totéž pořadí', vPoradi(poradi.onlineOck) && poradi.onlineSprava, JSON.stringify(poradi));
zkus('žádná chyba stránky', chyby.length === 0, chyby.join(' | '));

await b.close();
console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
