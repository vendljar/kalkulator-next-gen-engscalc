const { chromium } = require('playwright'); const fs = require('fs');
const [,, base, envE, envH, out] = process.argv;
const MAP = { nabidka: 'Sablona_NABIDKA_CN_v15.docx', nabidka_de: 'Sablona_NABIDKA_CN_v15_DE.docx', sod: 'Sablona_SOD_REALIZACE_v3.docx', sodProj: 'Sablona_SOD_PROJEKCE_v4.docx', nabidkaProj: 'Sablona_NABIDKA_PROJ_v8.docx' };
(async () => { const b = await chromium.launch(); const r = (await b.newContext()).request; fs.mkdirSync(out, { recursive: true });
  await r.post(base + '/api/prihlaseni', { data: { email: process.env[envE], heslo: process.env[envH] } });
  for (const [typ, jm] of Object.entries(MAP)) { const j = await (await r.get(base + '/api/sablony?typ=' + typ)).json();
    if (!j.data) { console.log(typ, 'CHYBÍ'); continue; } fs.writeFileSync(out + '/' + jm, Buffer.from(j.data, 'base64')); console.log(base.slice(8, 20), typ, 'v' + j.verze, j.nazev, '→', jm); }
  await b.close(); })().catch(e => { console.error('CHYBA', e.message); process.exit(1); });
