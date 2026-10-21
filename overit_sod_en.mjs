/* SMLOUVA O DÍLO V ANGLIČTINĚ — ovládání v aplikaci (#157, dávka V3, 17. 10. 2026).
 *
 * Node sada src/test_sod_en.js hlídá data smlouvy a zábranu jako funkci;
 * tady se ověřuje zapojení v sestavené aplikaci bez firemních šablon:
 *   – karty smluv OCK i PROJ mají „Jazyk tisku" (jako nabídky),
 *   – anglická smlouva bez zveřejněné anglické šablony (server hlásí
 *     mutaceChybi) nevznikne a stavový řádek řekne proč,
 *   – totéž v místní cestě (bez serveru, jen česká šablona v Nastavení),
 *   – s anglickou šablonou a česky se generuje dál (generátor zavolán).
 * Před úpravou karet a sodWord (v17.10.4): 2 prošlo / 4 selhalo; po ní 6 / 0. */
import { chromium } from 'playwright';
import path from 'path';
const soubor = 'file://' + path.resolve('dist/kalkulacka.html');
let ok = 0, fail = 0;
const zkus = (p, c, d) => { if (c) { ok++; console.log('  ✓ ' + p); } else { fail++; console.log('  ✕ ' + p + (d ? '  → ' + d : '')); } };
const b = await chromium.launch();
const s = await b.newPage({ viewport: { width: 1400, height: 900 } });
const chyby = [];
s.on('pageerror', e => chyby.push(e.message));
await s.goto(soubor); await s.waitForTimeout(400);

const karty = await s.evaluate(() => ({ ock: sodKarta(), proj: sodProjKarta() }));
zkus('karta smlouvy OCK má výběr „Jazyk tisku"', /Jazyk tisku/.test(karty.ock) && /value="en"/.test(karty.ock));
zkus('karta smlouvy PROJ má výběr „Jazyk tisku"', /Jazyk tisku/.test(karty.proj) && /value="en"/.test(karty.proj));

/* Generátor i stažení šablony se nahradí zkouškou — jde jen o rozhodnutí. */
const stav = (srv, jazyk, mistni) => s.evaluate(async ({ srv, jazyk, mistni }) => {
  document.querySelectorAll('.zkouska-sod').forEach(e => e.remove());
  const d = document.createElement('div'); d.className = 'zkouska-sod'; d.innerHTML = sodKarta();
  document.body.appendChild(d);
  window.__generovano = 0;
  window.sodWordGeneruj = () => { window.__generovano++; };
  window.sablonaProTisk = () => Promise.resolve(srv);
  Object.keys(SABLONY).forEach(k => delete SABLONY[k]);
  Object.keys(mistni || {}).forEach(k => { SABLONY[k] = { nazev: k + '.docx', data: new ArrayBuffer(8) }; });
  tiskJazykNastav(jazyk);
  sodWord('sod');
  await new Promise(r => setTimeout(r, 200));
  tiskJazykNastav('');
  return { text: d.querySelector('.sodStav_sod').textContent, generovano: window.__generovano };
}, { srv, jazyk, mistni });

const srvBez = { data: new ArrayBuffer(8), nazev: 'x.docx', zdroj: 'server', verze: 3, typ: 'sod', mutaceChybi: true };
const a = await stav(srvBez, 'en');
zkus('EN bez anglické šablony na serveru: smlouva nevznikne, hláška s cestou k nápravě',
  a.generovano === 0 && /nevznikne/.test(a.text) && /Nastavení → Šablony/.test(a.text), JSON.stringify(a));
const m = await stav(null, 'en', { sod: 1 });
zkus('EN bez anglické šablony v místní cestě: smlouva nevznikne',
  m.generovano === 0 && /nevznikne/.test(m.text), JSON.stringify(m));
const e = await stav(Object.assign({}, srvBez, { typ: 'sod_en', mutaceChybi: false }), 'en');
const c = await stav(Object.assign({}, srvBez, { mutaceChybi: false }), 'cz');
zkus('s anglickou šablonou i česky se smlouva generuje', e.generovano === 1 && c.generovano === 1, JSON.stringify([e, c]));
zkus('bez chyby v konzoli', !chyby.length, chyby.join(' | '));

await b.close();
console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
