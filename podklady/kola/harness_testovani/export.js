// Export pro kolo (jen GET). test: TEST K28/K29/K36 + api + glob; main: jen api + glob (bez zakázek).
const { chromium } = require('playwright'); const fs = require('fs');
const [,, base, envE, envH, out, sZak] = process.argv;
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const zap = [];
  await p.route('**/*', r => { const m = r.request().method(), u = r.request().url(); if (m === 'GET' || u.endsWith('/api/prihlaseni')) return r.continue(); zap.push(m + ' ' + u.slice(0, 60)); return r.abort(); });
  await p.goto(base, { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#onlineEmail', { timeout: 60000 });
  await p.fill('#onlineEmail', process.env[envE]); await p.fill('#onlineHeslo', process.env[envH]); await p.press('#onlineHeslo', 'Enter');
  await p.waitForSelector('#prihlaseni-overlay', { state: 'hidden', timeout: 60000 }); await p.waitForTimeout(4000);
  const o = await p.evaluate(async (sZak) => { const g = async u => (await fetch(u, { credentials: 'include' })).json(); const api = {};
    for (const u of ['/api/program', '/api/firma', '/api/slovnik', '/api/popisy', '/api/zobrazeni', '/api/sablony', '/api/funkce']) api[u] = await g(u);
    const glob = { NAST: typeof NAST !== 'undefined' ? NAST : null, JEKLY: typeof JEKLY !== 'undefined' ? JEKLY : null, DEFAULT_CENIK: typeof DEFAULT_CENIK !== 'undefined' ? DEFAULT_CENIK : null,
      CENIK_ZAHR: typeof CENIK_ZAHR !== 'undefined' ? CENIK_ZAHR : null, KATALOG: typeof KATALOG !== 'undefined' ? KATALOG : null, DEFAULT_CENIK_PROJ: typeof DEFAULT_CENIK_PROJ !== 'undefined' ? DEFAULT_CENIK_PROJ : null };
    const zak = {}; let rejN = 0;
    if (sZak) { const rej = (await g('/api/zakazky')).rejstrik.zakazky; rejN = rej.length; for (const z of rej.filter(z => /^TEST - .* - K(28|29|36)-/.test(z.cislo || ''))) { const d = await g('/api/zakazky?soubor=' + encodeURIComponent(z.soubor)); zak[z.cislo] = { soubor: z.soubor, odeslane: z.odeslane, z: d.zakazka || d.data || d }; } }
    return JSON.stringify({ meta: { verze: (document.body.innerText.match(/v\d+\.\d+\.\d+/) || [''])[0], kdy: new Date().toISOString(), rejstrik: rejN }, zak, api, glob }); }, !!sZak);
  fs.writeFileSync(out, o); const j = JSON.parse(o); console.log(base, 'verze', j.meta.verze, 'zakázek', Object.keys(j.zak).length, 'blokováno', zap.length); await b.close();
})().catch(e => { console.error('CHYBA', e.message); process.exit(1); });
