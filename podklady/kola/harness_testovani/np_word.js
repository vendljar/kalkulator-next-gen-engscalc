// NP bod 5: tlačítko „Vytvořit nabídku (Word)" v pruhu náhledu (TEST 9815: Word + zámek varianty) a zábrana (jen v paměti, uložení blokované).
const { chromium } = require('playwright'); const fs = require('fs');
const OUT = process.env.OUT || '/tmp/npw'; fs.mkdirSync(OUT, { recursive: true }); const C = 'TEST - 2026 - OPR - CN - ' + (process.env.NP_ZAK || '9815');
const L = (...a) => console.log(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '));
let ok = 0, fail = 0; const V = (id, pod, det) => { if (pod) ok++; else fail++; L((pod ? 'OK   ' : 'FAIL ') + id, det === undefined ? '' : det); };
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ acceptDownloads: true, viewport: { width: 1360, height: 900 } }); const p = await ctx.newPage(); const zap = []; let ZAPIS = false; const dl = [];
  await ctx.route('**/*', async r => { const m = r.request().method(), u = r.request().url(), path = new URL(u).pathname; if (m === 'GET' || path === '/api/prihlaseni') return r.continue();
    if (!ZAPIS || !u.startsWith('https://testengscalc.netlify.app') || !['/api/zakazky', '/api/analytika'].includes(path)) { zap.push('BLOK ' + m + ' ' + path); return r.abort(); }
    const resp = await r.fetch(); zap.push(m + ' ' + path + ' ' + resp.status()); return r.fulfill({ response: resp }); });
  p.on('download', d => { dl.push(d.suggestedFilename()); d.saveAs(OUT + '/' + d.suggestedFilename().replace(/[^\w.-]/g, '_')).catch(() => {}); });
  const login = async () => { await p.goto('https://testengscalc.netlify.app/', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => (document.querySelector('#onlineEmail') && document.querySelector('#onlineEmail').offsetParent) || (typeof ONLINE_STAV !== 'undefined' && (ONLINE_STAV.rejstrik || []).length > 50), null, { timeout: 90000 });
    if (await p.locator('#onlineEmail').isVisible().catch(() => false)) { await p.fill('#onlineEmail', process.env.KNG_TEST_EMAIL); await p.fill('#onlineHeslo', process.env.KNG_TEST_HESLO); await p.press('#onlineHeslo', 'Enter'); await p.waitForSelector('#prihlaseni-overlay', { state: 'hidden', timeout: 60000 }); }
    await p.waitForFunction(() => (ONLINE_STAV.rejstrik || []).length > 50, null, { timeout: 60000 }); await p.waitForTimeout(2500);
    await p.evaluate(() => { onlineAutoPrepni(false); window.__hl = []; window.potvrd = async (t) => { window.__hl.push('POTVRĎ ' + String(t).slice(0, 120)); return true; }; window.hlaska = (t) => window.__hl.push('HL ' + String(t).slice(0, 160));
      window.volba = async (t, m) => { window.__hl.push('VOLBA ' + String(t).slice(0, 80)); return (m.find(x => x.kod === 'zahodit') || m[0]).kod; }; window.nabidkaVarianta = async () => aktivniVarianta(ZAK); }); };
  const otevri = async () => { const s = await p.evaluate(c => ONLINE_STAV.rejstrik.find(z => z.cislo === c).soubor, C);
    for (let i = 0; i < 4; i++) { p.evaluate(x => onlineOtevri(x), s).catch(() => {}); if (await p.waitForFunction(c => ZAK.cislo === c, C, { timeout: 15000 }).then(() => 1, () => 0)) break; } await p.waitForTimeout(2500);
    await p.evaluate(() => { if (typeof zamekCteniJe === 'function' && zamekCteniJe()) zamekCteniOdemkniUI(); }); };
  const okno = async () => { const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 30000 }), p.evaluate(() => { tiskJazykNastav('cz'); nabidkaNahled(); })]);
    await pop.waitForFunction(() => /^\d+$/.test((document.getElementById('nwPocetStran') || {}).textContent || ''), null, { timeout: 30000 }); return pop; };
  await login(); L('logo ve Firmě', await p.evaluate(() => { const f = firmaAktualni(); return !!(f && typeof f.logo === 'string' && f.logo.length > 30); }));
  // --- zábrana (jen v paměti, ZAPIS = false)
  await otevri();
  const z = await p.evaluate(() => { const pokusy = [['šířka 0,3 m', () => { Z.sirka = 0.3; }], ['zdvih 300 m', () => { Z.zdvih = 300; }], ['záporná vlastní položka', () => { Z.vlastniPolozky = [{ sekce: 'zakladni', nazev: 'TEST záporná', mnozstvi: 1, cena: -999999 }]; }]];
    const out = []; for (const [popis, fn] of pokusy) { fn(); syncVarianta(); render(); const d = dokumentZabrana('nabidka', aktivniVarianta(ZAK)) || ''; out.push({ popis, zabrana: d.slice(0, 200) }); if (d) break; } return out; });
  L('zábrana pokusy', z);
  if (z.some(x => x.zabrana)) { const pop = await okno(); const t = await pop.evaluate(() => { const b = document.getElementById('nwWord'); return { disabled: b.disabled, title: b.title.slice(0, 200), pruh: (document.querySelector('.nw-zabrana') || {}).textContent || '' }; });
    V('NP5 se zábranou je tlačítko Word vypnuté s důvodem', t.disabled && t.title.length > 10 && /Word teď vytvořit nejde/.test(t.pruh), t); await pop.close(); }
  else V('NP5 zábranu se nepodařilo vyvolat', false);
  L('zápisy během zábrany', zap.filter(x => /zakazky/.test(x)));
  // --- tlačítko Word (zápis povolen jen /api/zakazky)
  await login(); await otevri(); ZAPIS = true;
  const pred = await p.evaluate(() => { const v = aktivniVarianta(ZAK); return { varianta: v.nazev, zamcena: !!(v.zamek && v.zamek.zamceno), zabrana: dokumentZabrana('nabidka', v) || '' }; }); L('před', pred);
  const pop = await okno(); const btn = await pop.evaluate(() => { const b = document.getElementById('nwWord'); return { disabled: b.disabled, text: b.textContent }; });
  await pop.click('#nwWord'); await p.waitForTimeout(12000);
  const po = await p.evaluate(() => { const v = aktivniVarianta(ZAK); const zv = ZAK.varianty.filter(x => x.zamek && x.zamek.zamceno).map(x => x.nazev); return { aktivni: v.nazev, zamcene: zv, hl: window.__hl.slice(-4) }; });
  const stav = await pop.evaluate(() => (document.getElementById('nwStavWord') || {}).textContent || '').catch(() => '(okno zavřené)');
  L('po kliku', po, 'stav v okně:', stav, 'stažené:', dl);
  const n = zap.length; const ul = await p.evaluate(async () => { const r = await onlineUloz(); return r; }); await p.waitForTimeout(3000);
  V('NP5 „Vytvořit nabídku (Word)" vytvoří Word a varianta se zamkne (uloženo)', !btn.disabled && dl.some(x => /^NABIDKA_.*\.docx$/.test(x)) && po.zamcene.includes(pred.varianta) && !pred.zamcena, { btn, dl, zamcene: po.zamcene, uloz: ul, http: zap.slice(n) });
  L('zápisy', [...new Set(zap)]); L(`SOUHRN ${ok} OK, ${fail} FAIL`); await b.close();
})().catch(e => { console.error('CHYBA', e.stack); process.exit(1); });
