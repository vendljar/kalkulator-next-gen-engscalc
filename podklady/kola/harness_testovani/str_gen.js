const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.route('**/api/**', r => (r.request().method() === 'GET' || r.request().url().endsWith('/api/prihlaseni')) ? r.continue() : r.abort());
  await p.goto('https://testengscalc.netlify.app/', { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#onlineEmail', { timeout: 60000 });
  await p.fill('#onlineEmail', process.env.KNG_TEST_EMAIL); await p.fill('#onlineHeslo', process.env.KNG_TEST_HESLO); await p.press('#onlineHeslo', 'Enter');
  await p.waitForSelector('#prihlaseni-overlay', { state: 'hidden', timeout: 60000 }); await p.waitForFunction(() => (ONLINE_STAV.rejstrik || []).length > 100, null, { timeout: 60000 });
  for (const [re, typ, L, jm] of [['7650 - K29-N50', 'nabidkaProj', 'cz', 'CN_PROJ_cz'], ['9603 - K19T-C103', 'nabidka', 'en', 'CN_OCK_en'], ['9603 - K19T-C103', 'nabidka', 'de', 'CN_OCK_de'], ['9603 - K19T-C103', 'nabidka', 'fr', 'CN_OCK_fr']]) {
    const s = await p.evaluate(r => ONLINE_STAV.rejstrik.find(z => new RegExp(r).test(z.cislo)).soubor, re);
    await Promise.race([p.evaluate(x => onlineOtevri(x), s), new Promise(r => setTimeout(r, 15000))]); await p.waitForTimeout(3000);
    const r = await p.evaluate(async ({ typ, L }) => { const srv = await sablonaProTisk(typ, L); const v = aktivniVarianta(ZAK); const vt = vzTiskVstup(typ, v, () => {}) || { zak: ZAK, varianta: v };
      const res = await dokumentVygeneruj(typ, srv.data.slice(0), vt.zak, vt.varianta, JEKLY, L); const buf = new Uint8Array(await res.blob.arrayBuffer()); let x = ''; for (let i = 0; i < buf.length; i += 0x8000) x += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); return btoa(x); }, { typ, L });
    fs.writeFileSync('/tmp/claude-0/sp/str/vys/' + jm + '.docx', Buffer.from(r, 'base64')); console.log(jm, 'ok'); }
  await b.close(); })().catch(e => { console.error('CHYBA', e.message); process.exit(1); });
