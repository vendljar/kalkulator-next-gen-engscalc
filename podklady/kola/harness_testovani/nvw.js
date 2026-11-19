// Náhled vs Word — jen čtení (všechny zápisy blokované), úpravy zakázky jen v paměti; částky, e-maily, telefony a jméno začerněny.
const { chromium } = require('playwright'); const fs = require('fs');
const OUT = '/tmp/claude-0/sp/nvw';
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1 }); const p = await ctx.newPage(); const blok = [];
  await ctx.route('**/*', r => { const m = r.request().method(), u = r.request().url(); if (m === 'GET' || u.endsWith('/api/prihlaseni')) return r.continue(); blok.push(m + ' ' + u.slice(0, 70)); return r.abort(); });
  await p.goto('https://testengscalc.netlify.app/', { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#onlineEmail', { timeout: 60000 });
  await p.fill('#onlineEmail', process.env.KNG_TEST_EMAIL); await p.fill('#onlineHeslo', process.env.KNG_TEST_HESLO); await p.press('#onlineHeslo', 'Enter');
  await p.waitForSelector('#prihlaseni-overlay', { state: 'hidden', timeout: 60000 }); await p.waitForFunction(() => (ONLINE_STAV.rejstrik || []).length > 100, null, { timeout: 60000 });
  await p.evaluate(() => { if (typeof onlineAutoPrepni === 'function') onlineAutoPrepni(false); window.potvrd = async () => true; window.hlaska = () => {}; });
  const s = await p.evaluate(() => ONLINE_STAV.rejstrik.find(z => /9603 - K19T-C103/.test(z.cislo)).soubor);
  await Promise.race([p.evaluate(x => onlineOtevri(x), s), new Promise(r => setTimeout(r, 15000))]); await p.waitForTimeout(3000);
  const info = await p.evaluate(() => { if (typeof zamekCteniJe === 'function' && zamekCteniJe()) zamekCteniOdemkniUI();
    const zam = !!(aktivniVarianta(ZAK).zamek && aktivniVarianta(ZAK).zamek.zamceno); const kl = klonujVariantu(ZAK, aktivniVarianta(ZAK).id); syncVarianta(); const v = aktivniVarianta(ZAK); v.data.techspec = v.data.techspec || {}; v.data.techspec.extra = [{ label: 'Vlastní ujednání (TEST)', hodnota: 'Předání dokumentace do 14 dnů po dokončení (TEST)' }];
    syncVarianta(); render(); try { slevaSet('procenta', 3); } catch (e) {} syncVarianta(); render();
    const ja = ONLINE_STAV.ja || {}; const jmena = [ja.jmeno, ja.cele, ja.jmenoPrijmeni, NAST && NAST.uzivatel, NAST && NAST.firma && NAST.firma.zpracovatel].filter(x => typeof x === 'string' && x.length > 3);
    return { puvodniZamcena: zam, klonZamceny: !!(v.zamek && v.zamek.zamceno), varianta: v.nazev, sleva: v.data.sleva && v.data.sleva.procenta, stav: v.data.sleva && v.data.sleva.stav, jmena, extra: v.data.techspec.extra.length, prip: (v.data.ock.zadani.volitelne ? Object.values(v.data.ock.zadani.volitelne).filter(Boolean).length : 0) }; });
  console.log('příprava', JSON.stringify({ ...info, jmena: info.jmena.length }));
  fs.writeFileSync(OUT + '/jmena.json', JSON.stringify(info.jmena));
  const MASK = (jmena) => { const RX = [/[\w.+-]+@[\w-]+\.[\w.]+/g, /\+?\d{3}[\s ]?\d{3}[\s ]?\d{3}[\s ]?\d{0,3}/g, /\d{1,3}(?:[\s ]\d{3})+(?:,\d{1,2})?/g, /\d+,\d{2}/g, /\d{4,}/g];
    const f = t => { let x = t; for (const j of jmena) x = x.split(j).join('█'.repeat(j.length)); for (const r of RX) x = x.replace(r, m => m.replace(/[^\s ,.]/g, '█')); return x; };
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const n = []; while (w.nextNode()) n.push(w.currentNode); n.forEach(t => { t.nodeValue = f(t.nodeValue); });
    document.querySelectorAll('input,textarea').forEach(e => { e.value = f(e.value); }); };
  // 1) Kompletní náhled podkladů
  const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 30000 }), p.evaluate(() => { tiskJazykNastav('cz'); nabidkaNahled(); })]);
  await pop.waitForLoadState('load'); await pop.setViewportSize({ width: 1360, height: 900 }); await pop.waitForTimeout(2500);
  await pop.evaluate(MASK, info.jmena);
  const vys = await pop.evaluate(() => document.documentElement.scrollHeight); let i = 0;
  for (let y = 0; y < vys; y += 900) { await pop.evaluate(y => window.scrollTo(0, y), y); await pop.waitForTimeout(300); await pop.screenshot({ path: `${OUT}/nahled_${String(++i).padStart(2, '0')}.png` }); }
  fs.writeFileSync(OUT + '/nahled_text.txt', await pop.evaluate(() => document.body.innerText));
  fs.writeFileSync(OUT + '/nahled_struktura.json', JSON.stringify(await pop.evaluate(() => ({ h: [...document.querySelectorAll('h1,h2,h3,h4')].map(e => e.tagName + ' ' + e.textContent.trim().slice(0, 80)), tabulek: document.querySelectorAll('table').length, img: [...document.querySelectorAll('img')].map(e => (e.alt || '') + ' ' + e.naturalWidth + 'x' + e.naturalHeight), font: getComputedStyle(document.body).fontFamily }))));
  console.log('náhled snímků', i);
  // 2) Word přes generátor (bez zámku)
  const b64 = await p.evaluate(async () => { const srv = await sablonaProTisk('nabidka', 'cz'); const v = aktivniVarianta(ZAK); const vt = vzTiskVstup('nabidka', v, () => {}) || { zak: ZAK, varianta: v };
    const res = await dokumentVygeneruj('nabidka', srv.data.slice(0), vt.zak, vt.varianta, JEKLY, 'cz'); const buf = new Uint8Array(await res.blob.arrayBuffer()); let x = ''; for (let k = 0; k < buf.length; k += 0x8000) x += String.fromCharCode.apply(null, buf.subarray(k, k + 0x8000)); return btoa(x); });
  fs.writeFileSync(OUT + '/word.docx', Buffer.from(b64, 'base64')); console.log('word ok; blokováno', blok.length);
  await b.close(); })().catch(e => { console.error('CHYBA', e.message); process.exit(1); });
