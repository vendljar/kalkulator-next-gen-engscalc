// SEC-M #538, část B: Playwright nepřihlášeně nad ostrým engscalc.netlify.app (jen načtení,
// žádné klikání do přihlášení). Cizí požadavky se zablokují a zapíšou; počítá porušení CSP.
// Výstup JSON na stdout. Spouštět jen šetrně (≈ 3 dotazy).
const { chromium } = require('playwright');
(async () => {
  const B = 'https://engscalc.netlify.app';
  const prohl = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {});
  const ctx = await prohl.newContext({ ignoreHTTPSErrors: false });
  const stranka = await ctx.newPage();
  const pozadavky = [], cizi = [], konzole = [], chyby = [];
  await stranka.route('**/*', (r) => {
    const u = r.request().url();
    if (u.startsWith(B + '/') || u === B) { pozadavky.push({ cas: new Date().toISOString().slice(11, 19), metoda: r.request().method(), url: u.slice(B.length) }); return r.continue(); }
    if (u.startsWith('data:') || u.startsWith('blob:')) return r.continue();
    cizi.push(u); return r.abort();
  });
  stranka.on('console', (m) => konzole.push(m.type() + ': ' + m.text().slice(0, 200)));
  stranka.on('pageerror', (e) => chyby.push(String(e).slice(0, 200)));
  await stranka.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI)); });
  const selhane = [];
  stranka.on('requestfailed', (q) => selhane.push(q.url().slice(0, 80) + ' ' + (q.failure() || {}).errorText));
  const odp = await stranka.goto(B + '/', { waitUntil: 'load', timeout: 60000 }).catch((e) => { console.log(JSON.stringify({ chyba: String(e).slice(0, 200), pozadavky, selhane })); process.exit(1); });
  await stranka.waitForTimeout(4000);
  const vysl = await stranka.evaluate(() => ({
    titulek: document.title,
    csp: window.__csp,
    verze: (document.body.innerText.match(/v\d+\.\d+\.\d+/) || [''])[0],
    skripty_cizi: [...document.scripts].filter(s => s.src && !s.src.startsWith(location.origin)).length,
    ramy: document.querySelectorAll('iframe').length,
    localStorage: Object.keys(localStorage).length,
    cookie: document.cookie,
    autocomplete: [...document.querySelectorAll('input[type=password],input[type=email],input[autocomplete]')].map(i => i.getAttribute('autocomplete')).slice(0, 6),
  }));
  console.log(JSON.stringify({ kod: odp.status(), ...vysl, pozadavky, cizi, selhane, konzole, chyby }, null, 1));
  await prohl.close();
})();
