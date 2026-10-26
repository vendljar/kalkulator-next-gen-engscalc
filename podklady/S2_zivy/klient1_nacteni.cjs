const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ proxy: { server: 'http://127.0.0.1:43943' } });
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  const poz = [], kon = [], chyby = [], csp = [], selhane = [];
  await p.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', e => window.__csp.push({ dir: e.violatedDirective, uri: e.blockedURI, src: e.sourceFile, line: e.lineNumber }));
  });
  p.on('request', r => poz.push({ m: r.method(), u: r.url().slice(0, 140), t: r.resourceType() }));
  p.on('response', r => { if (r.status() >= 400) selhane.push(r.status() + ' ' + r.url().slice(0, 120)); });
  p.on('requestfailed', r => selhane.push('FAIL ' + r.url().slice(0, 120) + ' ' + (r.failure() || {}).errorText));
  p.on('console', m => kon.push(m.type() + ': ' + m.text().slice(0, 300)));
  p.on('pageerror', e => chyby.push(String(e).slice(0, 300)));
  const resp = await p.goto('https://testengscalc.netlify.app/', { waitUntil: 'load', timeout: 60000 });
  await p.waitForTimeout(15000);
  const v = await p.evaluate(() => ({ csp: window.__csp, title: document.title,
    cookie: document.cookie, ls: Object.keys(localStorage), viditelne: (document.body.innerText || '').slice(0, 400),
    skriptyExt: [...document.querySelectorAll('script[src]')].map(s => s.src),
    linkyExt: [...document.querySelectorAll('link[href]')].map(s => s.href).filter(h => !h.startsWith('data:')).slice(0, 10),
    iframe: document.querySelectorAll('iframe').length }));
  await p.screenshot({ path: require("os").tmpdir() + "/klient.png" });
  const hosty = {}; poz.forEach(x => { const h = new URL(x.u).host; hosty[h] = (hosty[h] || 0) + 1; });
  console.log(JSON.stringify({ status: resp.status(), hosty, pozadavky: poz, konzole: kon, chyby, csp: v.csp, selhane, ...v }, null, 1));
  await b.close();
})();
