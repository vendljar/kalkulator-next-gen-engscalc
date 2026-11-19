// Zkouška NP (#681) na TESTU — Kompletní náhled podkladů (vzhled Wordu) × Word z pravé CN v17. Jen čtení (zápisy blokované),
// úpravy zakázek jen v paměti. Výstup: texty náhledu (stránky) a Wordu, docx, PDF z tisku náhledu, info JSON; porovnání dělá np_porovnej.py.
// Spuštění z kořene repa: OUT=<složka> node podklady/kola/harness_testovani/np.js
const { chromium } = require('playwright'); const fs = require('fs');
const OUT = process.env.OUT || '/tmp/np'; fs.mkdirSync(OUT, { recursive: true });
const L = (...a) => console.log(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '));
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage(); const blok = [];
  await ctx.route('**/*', r => { const m = r.request().method(), u = r.request().url(); if (m === 'GET' || u.endsWith('/api/prihlaseni')) return r.continue(); blok.push(m + ' ' + new URL(u).pathname); return r.abort(); });
  await p.goto('https://testengscalc.netlify.app/', { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#onlineEmail', { timeout: 60000 });
  await p.fill('#onlineEmail', process.env.KNG_TEST_EMAIL); await p.fill('#onlineHeslo', process.env.KNG_TEST_HESLO); await p.press('#onlineHeslo', 'Enter');
  await p.waitForSelector('#prihlaseni-overlay', { state: 'hidden', timeout: 60000 }); await p.waitForFunction(() => (ONLINE_STAV.rejstrik || []).length > 100, null, { timeout: 60000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { if (typeof onlineAutoPrepni === 'function') onlineAutoPrepni(false); window.potvrd = async () => true; window.hlaska = (t) => { window.__hl = (window.__hl || []).concat(String(t).slice(0, 200)); };
    window.volba = async (t, m) => (m.find(x => x.kod === 'zahodit') || m[0]).kod; window.nabidkaVarianta = async () => aktivniVarianta(ZAK); });
  const E = (fn, a) => p.evaluate(fn, a);
  const jmena = await E(() => { const ja = ONLINE_STAV.ja || {}; return [ja.jmeno, ja.email, NAST && NAST.firma && NAST.firma.zpracovatel].filter(x => typeof x === 'string' && x.length > 3); });
  fs.writeFileSync(OUT + '/jmena.json', JSON.stringify(jmena));
  const otevri = async (re) => { const s = await E(r => ONLINE_STAV.rejstrik.find(z => new RegExp(r).test(z.cislo)).soubor, re);
    for (let i = 0; i < 4; i++) { p.evaluate(x => onlineOtevri(x), s).catch(() => {}); if (await p.waitForFunction(r => new RegExp(r).test(ZAK.cislo || ''), re, { timeout: 15000 }).then(() => 1, () => 0)) break; }
    await p.waitForTimeout(2500); await E(() => { if (typeof zamekCteniJe === 'function' && zamekCteniJe()) zamekCteniOdemkniUI(); }); };
  // ---- náhled: otevřít okno, počkat na stránkování, sebrat údaje; tisk do PDF
  const nahled = async (tag, Lg, pdf) => {
    const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 30000 }), E((Lg) => { tiskJazykNastav(Lg); nabidkaNahled(); }, Lg)]);
    await pop.waitForLoadState('load'); await pop.setViewportSize({ width: 1360, height: 900 });
    await pop.waitForFunction(() => /^\d+$/.test((document.getElementById('nwPocetStran') || {}).textContent || ''), null, { timeout: 30000 }); await pop.waitForTimeout(1500);
    const info = await pop.evaluate(() => { const st = [...document.querySelectorAll('#nwStranky .nw-strana')];
      return { stran: st.length, pocetText: document.getElementById('nwPocetStran').textContent, jazyk: (document.querySelector('.nw-jazyk') || {}).textContent,
        tlacitko: (() => { const b = document.getElementById('nwWord'); return b ? { disabled: b.disabled, title: b.title } : null; })(),
        zabrana: (document.querySelector('.nw-zabrana') || {}).textContent || '', varovani: [...document.querySelectorAll('.nw-varovani li')].map(x => x.textContent),
        font: getComputedStyle(document.querySelector('.nw-strana .nw-telo') || document.body).fontFamily,
        strany: st.map(s => { const z = s.querySelector('.nw-zahlavi'), f = s.querySelector('.nw-zapati'), t = s.querySelector('.nw-telo'), img = z && z.querySelector('img');
          return { zahlavi: z ? z.textContent.replace(/\s+/g, ' ').trim() : null, logo: img ? { w: img.naturalWidth, h: img.naturalHeight, src: img.src.slice(0, 30) } : null,
            zapati: f ? f.textContent.replace(/\s+/g, ' ').trim().length : 0, preteka: t ? t.scrollHeight > t.clientHeight + 2 : null, vyska: Math.round(s.getBoundingClientRect().height) }; }),
        texty: st.map(s => (s.querySelector('.nw-telo') || s).innerText) }; });
    fs.writeFileSync(`${OUT}/${tag}_nahled.json`, JSON.stringify(info, null, 1)); fs.writeFileSync(`${OUT}/${tag}_nahled.txt`, info.texty.join('\n=====STRANA=====\n'));
    if (pdf) { await pop.emulateMedia({ media: 'print' }); await pop.pdf({ path: `${OUT}/${tag}_nahled_tisk.pdf`, format: 'A4', printBackground: true, preferCSSPageSize: true }); await pop.emulateMedia({ media: 'screen' });
      // snímky stránek se začerněním (částky, čísla, e-maily, jména)
      await pop.evaluate((jmena) => { const RX = [/[\w.+-]+@[\w-]+\.[\w.]+/g, /\d/g]; const f = t => { let x = t; for (const j of jmena) x = x.split(j).join('█'.repeat(j.length)); for (const r of RX) x = x.replace(r, '█'); return x; };
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const n = []; while (w.nextNode()) n.push(w.currentNode); n.forEach(t => { t.nodeValue = f(t.nodeValue); }); }, jmena);
      const st = await pop.$$('#nwStranky .nw-strana'); for (let i = 0; i < st.length; i++) await st[i].screenshot({ path: `${OUT}/${tag}_nahled_${String(i + 1).padStart(2, '0')}.png` }); }
    await pop.close(); return info; };
  const word = async (tag, Lg) => { const r = await E(async (Lg) => { const srv = await sablonaProTisk('nabidka', Lg); const v = aktivniVarianta(ZAK); const vt = vzTiskVstup('nabidka', v, () => {}) || { zak: ZAK, varianta: v };
      const res = await dokumentVygeneruj('nabidka', srv.data.slice(0), vt.zak, vt.varianta, JEKLY, Lg); const buf = new Uint8Array(await res.blob.arrayBuffer()); let x = ''; for (let k = 0; k < buf.length; k += 0x8000) x += String.fromCharCode.apply(null, buf.subarray(k, k + 0x8000));
      return { b64: btoa(x), nazev: res.nazevSouboru, sablona: srv.nazev || srv.typ, verze: srv.verze }; }, Lg);
    fs.writeFileSync(`${OUT}/${tag}_word.docx`, Buffer.from(r.b64, 'base64')); return { nazev: r.nazev, sablona: r.sablona, verze: r.verze }; };
  const vysledek = {};
  // ---- S1–S3: 9603, klon zamčené varianty, sleva 3 %, DALŠÍ UJEDNÁNÍ (jako podklad nahled_vs_word)
  await otevri('9603 - K19T-C103');
  vysledek.priprava = await E(() => { const kl = klonujVariantu(ZAK, aktivniVarianta(ZAK).id); syncVarianta(); const v = aktivniVarianta(ZAK);
    v.data.techspec = v.data.techspec || {}; v.data.techspec.extra = [{ label: 'Vlastní ujednání (TEST)', hodnota: 'Předání dokumentace do 14 dnů po dokončení (TEST)' }];
    syncVarianta(); render(); try { slevaSet('procenta', 3); } catch (e) {} syncVarianta(); render();
    return { varianta: v.nazev, zamcena: !!(v.zamek && v.zamek.zamceno), sleva: v.data.sleva, zabrana: dokumentZabrana('nabidka', v) || '' }; });
  L('příprava 9603', vysledek.priprava);
  for (const Lg of ['cz', 'en', 'de']) { vysledek['s1_' + Lg] = { nahled: await nahled('s1_' + Lg, Lg, Lg === 'cz' || Lg === 'en'), word: await word('s1_' + Lg, Lg) };
    const n = vysledek['s1_' + Lg].nahled; L('S1', Lg, { stran: n.stran, jazyk: n.jazyk, tlacitko: n.tlacitko, zabrana: n.zabrana, varovani: n.varovani.length, font: n.font, word: vysledek['s1_' + Lg].word }); }
  // ---- zábrana tlačítka Word: v paměti zkusit stav, který dokumentZabrana zastaví
  vysledek.zabranaPokus = await E(() => { const v = aktivniVarianta(ZAK); const pokusy = [];
    const zkus = (popis, fn) => { const zal = JSON.stringify(ZAK); fn(); syncVarianta(); const z = dokumentZabrana('nabidka', aktivniVarianta(ZAK)) || ''; pokusy.push({ popis, zabrana: z.slice(0, 160) }); if (!z) { ZAK = JSON.parse(zal); syncVarianta(); } return !!z; };
    zkus('sleva 40 %', () => { slevaSet('procenta', 40); }) || zkus('bez objednatele', () => { ZAK.objednatel = ''; }) || zkus('nulová cena (ceník prázdný)', () => { const c = aktivniVarianta(ZAK).data.cenik; for (const k of Object.keys(c)) if (typeof c[k] === 'number') c[k] = 0; });
    return pokusy; });
  L('zábrana pokusy', vysledek.zabranaPokus);
  if (vysledek.zabranaPokus.some(x => x.zabrana)) { const n = await nahled('s5_zabrana', 'cz', false); vysledek.s5_zabrana = { tlacitko: n.tlacitko, zabrana: n.zabrana }; L('S5 zábrana', vysledek.s5_zabrana); }
  // ---- S3: víc šachet s můstky (9949-K49, varianta 2)
  await otevri('9949 - K49'); vysledek.s3_info = await E(() => { const v = ZAK.varianty.find(x => (x.data.ock.dalsi || []).length) || aktivniVarianta(ZAK); ZAK.aktivni = v.id; syncVarianta(); render();
    return { varianta: v.nazev, sachet: 1 + (v.data.ock.dalsi || []).length, mustek: v.data.ock.zadani.mustek }; });
  vysledek.s3 = { nahled: await nahled('s3_cz', 'cz', true), word: await word('s3_cz', 'cz') }; L('S3', vysledek.s3_info, { stran: vysledek.s3.nahled.stran });
  // ---- S4: víc zákazníků — pohled zákazníka B (9813)
  await otevri('CN - 9813$'); vysledek.s4_info = await E(() => { const zz = vzZakaznici(ZAK); const B = zz.find(z => /Zákazník B/.test(vzNazevZ(z))); if (B) vzOtevri(B.id); render();
    return { zakazniku: zz.length, otevreny: B ? vzNazevZ(B) : null }; });
  vysledek.s4 = { nahled: await nahled('s4_cz', 'cz', true), word: await word('s4_cz', 'cz') }; L('S4', vysledek.s4_info, { stran: vysledek.s4.nahled.stran, word: vysledek.s4.word.nazev });
  fs.writeFileSync(OUT + '/vysledek.json', JSON.stringify(vysledek, (k, v) => k === 'texty' ? undefined : v, 1)); L('blokováno', [...new Set(blok)]); await b.close();
})().catch(e => { console.error('CHYBA', e.stack); process.exit(1); });
