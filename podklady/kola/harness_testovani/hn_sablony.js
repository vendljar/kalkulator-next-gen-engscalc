// HN #646 (22. 11. 2026): stáhne z TESTU (jen čtení, GET /api/sablony) platné šablony smluv
// (SoD realizace, SoD projekce, plná moc) do složky pro KNG_PODKLADY. Jméno souboru
// Sablona_<ZAKLAD>_v<N>.docx: N z názvu zveřejněného souboru, jinak z pořadí verze na serveru.
// Spuštění: NODE_PATH=$(npm root -g) node hn_sablony.js https://testengscalc.netlify.app KNG_TEST_EMAIL KNG_TEST_HESLO <složka>
const { chromium } = require('playwright'); const fs = require('fs');
const [,, base, envE, envH, out] = process.argv;
const MAP = { sod: 'Sablona_SOD_REALIZACE', sodProj: 'Sablona_SOD_PROJEKCE', plnaMoc: 'Sablona_PLNA_MOC' };
(async () => { const b = await chromium.launch(); const r = (await b.newContext()).request; fs.mkdirSync(out, { recursive: true });
  const pr = await r.post(base + '/api/prihlaseni', { data: { email: process.env[envE], heslo: process.env[envH] } }); console.log('přihlášení', pr.status());
  const rej = await (await r.get(base + '/api/sablony')).json();
  for (const [typ, zaklad] of Object.entries(MAP)) { const resp = await r.get(base + '/api/sablony?typ=' + typ); const j = await resp.json();
    if (!j.data) { console.log(typ, 'CHYBÍ', resp.status()); continue; }
    const m = /_v(\d+)\.docx$/i.exec(String(j.nazev || '')); const n = m ? m[1] : String(j.verze);
    const jm = zaklad + '_v' + n + '.docx'; fs.writeFileSync(out + '/' + jm, Buffer.from(j.data, 'base64'));
    console.log(typ, 'GET', resp.status(), 'verze serveru', j.verze, 'název', j.nazev, '→', jm, Buffer.from(j.data, 'base64').length, 'B'); }
  console.log('rejstřík typů:', Object.keys((rej && rej.rejstrik) || {}).join(', '));
  await b.close(); })().catch(e => { console.error('CHYBA', e.message); process.exit(1); });
