const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ proxy: { server: 'http://127.0.0.1:43943' } });
  const p = await (await b.newContext()).newPage();
  const poz = [], kon = [], chyby = [];
  await p.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI)); });
  p.on('request', r => poz.push(r.method() + ' ' + r.url().slice(0, 120)));
  p.on('console', m => kon.push(m.type() + ': ' + m.text().slice(0, 200)));
  p.on('pageerror', e => chyby.push(String(e).slice(0, 200)));
  await p.goto('https://testengscalc.netlify.app/', { waitUntil: 'load', timeout: 60000 });
  await p.waitForTimeout(3000);
  // přihlašovací overlay je otevřený hned
  await p.waitForTimeout(3000);
  const dlg = await p.evaluate(() => ({ csp: window.__csp, inputy: [...document.querySelectorAll('#prihlaseni-overlay input')].map(i => i.type + ':' + (i.autocomplete || '')), }));
  await p.screenshot({ path: require("os").tmpdir() + "/prihlaseni.png" });
  // vložení do cizího rámu
  const p2 = await (await b.newContext()).newPage();
  const ram = [];
  p2.on('console', m => ram.push(m.text().slice(0, 200)));
  await p2.setContent('<iframe id="f" src="https://testengscalc.netlify.app/" width="800" height="600"></iframe>');
  await p2.waitForTimeout(8000);
  const f = p2.frames().find(x => x.url().includes('testengscalc'));
  let ramObsah = null; try { ramObsah = f ? await f.evaluate(() => document.title) : null; } catch (e) { ramObsah = 'nelze: ' + String(e).slice(0, 80); }
  console.log(JSON.stringify({ poz, kon, chyby, dlg, ram, ramObsah }, null, 1));
  await b.close();
})();
