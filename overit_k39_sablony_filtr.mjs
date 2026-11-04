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
zkus('žádná chyba stránky', chyby.length === 0, chyby.join(' | '));

await b.close();
console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
