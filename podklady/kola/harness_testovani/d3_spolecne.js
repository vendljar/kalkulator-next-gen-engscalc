// Společné pomůcky zkoušky D3 (#688) na TESTU — přihlášení, blokace zápisů, otevírání a ukládání TEST zakázek.
// Zápis jen do zakázek „TEST - …"; /api/pd* blokováno (kromě /api/pd/nanecisto bez dealId).
const { chromium } = require('playwright'); const fs = require('fs'); const { execSync } = require('child_process');
const TEST = 'https://testengscalc.netlify.app/';
function start(OUT) {
  fs.mkdirSync(OUT, { recursive: true });
  const LOG = []; const L = (...a) => { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); LOG.push(s); console.log(s); };
  const st = { ok: 0, fail: 0 }; const V = (id, pod, det) => { if (pod) st.ok++; else st.fail++; L((pod ? 'OK   ' : 'FAIL ') + id, det === undefined ? '' : det); };
  return { LOG, L, V, st, konec: () => fs.writeFileSync(OUT + '/log.txt', LOG.join('\n')) };
}
async function otevriProhlizec(OUT, role) {
  const b = await chromium.launch(); const ctx = await b.newContext({ acceptDownloads: true, viewport: { width: 1500, height: 1000 } }); const p = await ctx.newPage();
  const zap = [];
  await p.route('**/*', async r => { const u = r.request().url(), m = r.request().method(); if (m === 'GET') return r.continue();
    const path = new URL(u).pathname; if (path === '/api/prihlaseni') return r.continue();
    if (!u.startsWith(TEST) || (/\/api\/pd/.test(path) && path !== '/api/pd/nanecisto')) { zap.push('BLOK ' + m + ' ' + path); return r.abort(); }
    let telo = ''; try { telo = r.request().postData() || ''; } catch (e) {}
    if (path === '/api/pd/nanecisto' && /"dealId"\s*:\s*"?\d/.test(telo)) { zap.push('BLOK nanecisto s dealId'); return r.abort(); }
    if (path === '/api/zakazky' && m === 'POST' && !/"cislo"\s*:\s*"TEST - /.test(telo)) { zap.push('BLOK POST zakazky bez TEST čísla'); return r.abort(); }
    const resp = await r.fetch(); let tx = ''; try { tx = (await resp.text()).slice(0, 300); } catch (e) {}
    zap.push(m + ' ' + path + ' ' + resp.status()); if (resp.status() >= 400) zap.push('  ODPOVĚĎ ' + tx.replace(/[\w.+-]+@[\w.-]+/g, '<email>').slice(0, 200)); return r.fulfill({ response: resp }); });
  const dl = []; ctx.on('page', np => np.on('download', d => { const f = OUT + '/dl_' + d.suggestedFilename().replace(/[^\w.-]/g, '_'); dl.push(f); d.saveAs(f).catch(() => {}); }));
  p.on('download', d => { const f = OUT + '/dl_' + d.suggestedFilename().replace(/[^\w.-]/g, '_'); dl.push(f); d.saveAs(f).catch(() => {}); });
  const em = role === 'obchodnik' ? process.env.KNG_TEST_OBCHODNIK_EMAIL : process.env.KNG_TEST_EMAIL;
  const he = role === 'obchodnik' ? process.env.KNG_TEST_OBCHODNIK_HESLO : process.env.KNG_TEST_HESLO;
  const prihlas = async () => {
    if (await p.locator('#onlineEmail').isVisible().catch(() => false)) {
      await p.fill('#onlineEmail', em); await p.fill('#onlineHeslo', he); await p.press('#onlineHeslo', 'Enter');
      await p.waitForSelector('#prihlaseni-overlay', { state: 'hidden', timeout: 60000 }); }
    await p.waitForFunction(() => typeof ONLINE_STAV !== 'undefined' && (ONLINE_STAV.rejstrik || []).length > 50, null, { timeout: 60000 }); await p.waitForTimeout(2500);
    await p.evaluate(() => { window.__hl = []; window.potvrd = async (t) => { window.__hl.push('POTVRĎ: ' + String(t).replace(/\s+/g, ' ').slice(0, 140)); return true; };
      window.hlaska = (t) => { window.__hl.push('HLÁŠKA: ' + String(t).replace(/\s+/g, ' ').slice(0, 300)); };
      window.volba = async (t, moz) => { window.__hl.push('VOLBA: ' + String(t).replace(/\s+/g, ' ').slice(0, 100)); return (moz || []).some(m => m.kod === 'zahodit') ? 'zahodit' : ((moz || [])[0] || {}).kod; };
      window.dotaz = async (t) => { window.__hl.push('DOTAZ: ' + String(t).slice(0, 100)); return null; };
      window.nabidkaVarianta = async () => aktivniVarianta(ZAK);
      if (typeof onlineAutoPrepni === 'function') { try { onlineAutoPrepni(false); } catch (e) {} }
      window.__hlBer = () => { const x = window.__hl; window.__hl = []; return x; }; });
  };
  await p.goto(TEST, { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#onlineEmail', { timeout: 60000 }); await prihlas();
  const E = (fn, arg) => p.evaluate(fn, arg); const W = ms => p.waitForTimeout(ms);
  const otevri = async (cislo) => { const s = await E(c => (ONLINE_STAV.rejstrik.find(z => z.cislo === c) || {}).soubor, cislo); if (!s) return null;
    for (let i = 1; i <= 4; i++) { p.evaluate(x => { try { onlineOtevri(x); } catch (e) {} }, s).catch(() => {});
      if (await p.waitForFunction(c => typeof ZAK !== 'undefined' && ZAK.cislo === c, cislo, { timeout: 15000 }).then(() => true, () => false)) break; }
    await W(3000); if (await E(() => ZAK.cislo) !== cislo) throw new Error('neotevřeno ' + cislo);
    if (await E(() => typeof zamekCteniJe === 'function' && zamekCteniJe())) await E(() => zamekCteniOdemkniUI()); return s; };
  const uloz = async (popis, L) => { if (!/^TEST - /.test(await E(() => ZAK.cislo))) throw new Error('ukládání mimo TEST zakázku zastaveno');
    const n = zap.length; const r = await E(async () => { const x = await onlineUloz(); return x; }); await W(3000);
    const st = zap.slice(n).filter(x => /\/api\/zakazky/.test(x) || /ODPOVĚĎ/.test(x)); if (L) L('uložení', popis, { ok: r, http: st, hl: (await E(() => window.__hlBer())).filter(x => !/Uloženo online/.test(x)).slice(0, 3) }); return { ok: r, http: st }; };
  const F5 = async () => { await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => (document.querySelector('#onlineEmail') && document.querySelector('#onlineEmail').offsetParent) || (typeof ONLINE_STAV !== 'undefined' && (ONLINE_STAV.rejstrik || []).length > 50), null, { timeout: 90000 }); await W(2000); await prihlas(); };
  return { b, ctx, p, zap, dl, E, W, otevri, uloz, F5, prihlas };
}
const txtDocx = f => execSync(`unzip -p "${f}" 'word/document.xml' 'word/footer1.xml' 2>/dev/null || true`, { maxBuffer: 1 << 27 }).toString()
  .replace(/<w:tab\/>/g, ' ').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '');
module.exports = { start, otevriProhlizec, txtDocx, TEST };
