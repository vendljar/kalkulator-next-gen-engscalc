// Zkouška OP1 / DS / DOS / SB (v21.11.1–v21.11.4, test v22.11.5) na TESTU, 22. 11. 2026 — trvalý souhlas J. V. se zápisem na test.
// A) D3-N1/D3-N2: objednávka PROJ z TEST OVP 9821 (4 činnosti) a 9822 (7 činností) — náhled → PDF z tisku, Word → PDF (LibreOffice), počet stran.
//    Funkce nahled/word z d3.js. Zápis jen TEST zakázky (filtr d3_spolecne), Pipedrive blokováno.
// B) NP-N1 #690 / PG-N1 / #682: Kompletní náhled podkladů a Word CN (9603, jen paměť, klon zamčené varianty).
// C) DS #648: název šachty v cizím jazyce (9949-K49, 2 šachty; jen paměť): Word CN EN/DE, náhled EN, SoD EN (je-li šablona).
// D) DO-N1 #680: Ceník → číselník dodatkových textů → „Najít texty…" → oddíl „Návrhy k položkám mimo číselník" (jen čtení, nepřebírá se).
// Ceny se do logu nepíšou.
process.env.OUT = process.env.OUT || ((process.env.KNG_SP || '/tmp/claude-0/sp') + '/op1');
const fs = require('fs'); const { execSync } = require('child_process');
const S = require('./d3_spolecne.js'); const D3 = require('./d3.js');
const OUT = process.env.OUT; const { L, V, st, konec } = S.start(OUT);
const sh = c => execSync(c, { maxBuffer: 1 << 27 }).toString();
const pocet = (t, s) => t.split(s).length - 1;
const FAZE = (process.env.OP1_FAZE || 'a,b,c,d').split(',');
const KLIC = 'PŘECHODOVÉ PLECHY - NEREZ (MATERIÁL)';
(async () => {
  const x = await S.otevriProhlizec(OUT, 'admin'); const { E, W, p, ctx, zap } = x;
  L('start', await E(() => ({ verze: typeof buildVerze === 'function' ? buildVerze() : '', role: ONLINE_STAV.ja.role })));
  // Word bez zamykání (generátor ze serverové šablony) — jako np.js
  const word = async (typ, Lg, tag) => { const r = await E(async ([typ, Lg]) => { const srv = await sablonaProTisk(typ, Lg); if (!srv || !srv.data) return { chybi: true };
      const v = aktivniVarianta(ZAK); const vt = vzTiskVstup(typ, v, () => {}) || { zak: ZAK, varianta: v };
      const res = await dokumentVygeneruj(typ, srv.data.slice(0), vt.zak, vt.varianta, JEKLY, Lg); const buf = new Uint8Array(await res.blob.arrayBuffer()); let s = '';
      for (let k = 0; k < buf.length; k += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(k, k + 0x8000));
      return { b64: btoa(s), sablona: srv.nazev || srv.typ, verze: srv.verze, jazyk: srv.jazyk || Lg }; }, [typ, Lg]).catch(e => ({ chyba: e.message.slice(0, 160) }));
    if (!r.b64) return r; const f = `${OUT}/${tag}.docx`; fs.writeFileSync(f, Buffer.from(r.b64, 'base64'));
    return { f, t: S.txtDocx(f), sablona: r.sablona, verze: r.verze }; };
  const nahledPodkladu = async (Lg, tag) => {
    const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 30000 }), E(Lg => { tiskJazykNastav(Lg); nabidkaNahled(); }, Lg)]);
    await pop.waitForLoadState('load'); await pop.waitForFunction(() => /^\d+$/.test((document.getElementById('nwPocetStran') || {}).textContent || ''), null, { timeout: 30000 }); await pop.waitForTimeout(1500);
    const t = await pop.evaluate(() => [...document.querySelectorAll('#nwStranky .nw-strana')].map(s => (s.querySelector('.nw-telo') || s).innerText).join('\n'));
    fs.writeFileSync(`${OUT}/${tag}.txt`, t); await pop.close(); return t; };
  const otevriRe = async re => { const c = await E(r => (ONLINE_STAV.rejstrik.find(z => new RegExp(r).test(z.cislo)) || {}).cislo, re); if (!c) throw new Error('nenalezeno ' + re); await x.otevri(c); return c; };

  // ================= A) objednávka PROJ — počet stran =================
  if (FAZE.includes('a')) for (const [cis, stitek] of [[D3.C1, 'a_9821'], [D3.C2, 'a_9822']]) {
    await x.otevri(cis);
    const info = await E(() => { const v = aktivniVarianta(ZAK); const d = nabidkaProjData(vzTiskZakTicho(), v, 'cz'); return { zamceno: !!(v.zamek && v.zamek.zamceno), cinnosti: (d.nabizeneSekce || []).length }; });
    const n = await D3.nahled(x, stitek);
    const w = await D3.word(x, stitek);
    const upoz = (n.roz && n.roz.upoz) || [];
    L(stitek, cis, { zamceno: info.zamceno, cinnosti: info.cinnosti, nahledPdfStran: n.strany, wordPdfStran: w.strany, wordSoubor: !!w.soubor, okno: n.okno, upoz: upoz.map(u => u.slice(0, 120)) });
    V(`A1 ${cis.slice(-4)}: objednávka PROJ — PDF z tisku náhledu ≤ 2 strany (D3-N1; dřív ${stitek === 'a_9821' ? 3 : 4})`, n.okno && n.strany > 0 && n.strany <= 2, { strany: n.strany });
    V(`A2 ${cis.slice(-4)}: Word → PDF (LibreOffice) ≤ 2 strany a stejně jako náhled (dřív ${stitek === 'a_9821' ? 2 : 3})`, !!w.soubor && w.strany > 0 && w.strany <= 2 && w.strany === n.strany, { word: w.strany, nahled: n.strany });
    const th = (n.roz && n.roz.th) || []; const rad = (n.roz && n.roz.radky) || [];
    L(`  ${stitek} hlavička tabulky`, th, 'řádků', rad.length, 'buněk v řádcích', rad.slice(0, 4).map(r => r.length));
    V(`A3 ${cis.slice(-4)}: lišta „Kontrola před odesláním" bez kontrol SoD OCK / SoD PROJ (D3-N2)`, n.okno && !upoz.some(u => /SoD|smlouv/i.test(u)), upoz.map(u => u.slice(0, 100)));
  }

  // ================= B) náhled podkladů a Word CN: NP-N1, PG-N1, #682 =================
  if (FAZE.includes('b')) {
    await otevriRe('9603 - K19T-C103');
    L('B příprava', await E(() => { klonujVariantu(ZAK, aktivniVarianta(ZAK).id); syncVarianta(); const v = aktivniVarianta(ZAK); v.data.techspec = v.data.techspec || {};
      v.data.techspec.extra = [{ label: 'TEST OP1 RADEK NENI', hodnota: 'Dodavka TEST OP1 neni soucasti', sekce: 'neni' }, { label: 'TEST OP1 RADEK DALSI', hodnota: 'Ujednani TEST OP1 zustava' }];
      syncVarianta(); render(); return { varianta: v.nazev, mustek: v.data.ock.zadani.mustek, svetliky: JSON.stringify(v.data.ock.zadani.svetliky || null) }; }));
    for (const Lg of ['cz', 'en']) {
      const tn = await nahledPodkladu(Lg, 'b_nahled_' + Lg); const ww = await word('nabidka', Lg, 'b_word_' + Lg);
      const H = await E(Lg => { const P = t => Lg === 'cz' ? t : tr(t, Lg); return { neni: P('SOUČÁSTÍ DODÁVKY NENÍ'), dalsi: P('DALŠÍ UJEDNÁNÍ'), svetl: P('SVĚTLÍKY U ŠACHETNÍCH DVEŘÍ'), mustky: P('SKLADEBNÉ MŮSTKY MEZI BUDOVOU A OCELOVOU KONSTRUKCÍ') }; }, Lg);
      const r = { nahledSvetliky: pocet(tn.toUpperCase(), H.svetl.toUpperCase()), wordSvetliky: pocet(ww.t.toUpperCase(), H.svetl.toUpperCase()), nahledNeni: pocet(tn, 'TEST OP1 RADEK NENI'), wordNeni: pocet(ww.t, 'TEST OP1 RADEK NENI'),
        nahledDalsiPoNeni: (() => { const i = tn.indexOf('TEST OP1 RADEK NENI'); const j = tn.indexOf(H.dalsi); return j > i; })(), sablona: ww.sablona + ' v' + ww.verze };
      V(`B1 ${Lg.toUpperCase()} náhled podkladů bez řádku SVĚTLÍKY (NP-N1 #690) jako Word`, r.nahledSvetliky === 0 && r.wordSvetliky === 0, r);
      V(`B2 ${Lg.toUpperCase()} náhled podkladů: řádek NENÍ jen jednou, před DALŠÍ UJEDNÁNÍ (PG-N1)`, r.nahledNeni === 1 && r.wordNeni === 1 && r.nahledDalsiPoNeni, r);
      if (Lg === 'en') { const t = ww.t.toUpperCase(); const pruh = /BRIDGES BETWEEN THE BUILDING/.test(t);
        V('B3 Word CN EN šachty bez můstků bez prázdného pruhu BRIDGES… (#682)', !pruh, { pruh, mustek: await E(() => aktivniVarianta(ZAK).data.ock.zadani.mustek) }); }
    }
    // jen řádek NENÍ → náhled bez pruhu DALŠÍ UJEDNÁNÍ (jako Word)
    await E(() => { const v = aktivniVarianta(ZAK); v.data.techspec.extra = [{ label: 'TEST OP1 RADEK NENI', hodnota: 'Dodavka TEST OP1 neni soucasti', sekce: 'neni' }]; syncVarianta(); render(); });
    const tn = await nahledPodkladu('cz', 'b_nahled_jen_neni'); const ww = await word('nabidka', 'cz', 'b_word_jen_neni');
    const i = tn.indexOf('SOUČÁSTÍ DODÁVKY NENÍ'), iw = ww.t.indexOf('SOUČÁSTÍ DODÁVKY NENÍ');
    const r = { nahledDalsi: pocet(tn.slice(i), 'DALŠÍ UJEDNÁNÍ'), wordDalsi: pocet(ww.t.slice(iw), 'DALŠÍ UJEDNÁNÍ'), nahledR: pocet(tn, 'TEST OP1 RADEK NENI') };
    V('B4 jen řádek NENÍ: náhled podkladů bez pruhu DALŠÍ UJEDNÁNÍ jako Word (PG-N1)', r.nahledDalsi === r.wordDalsi && r.nahledDalsi === 0 && r.nahledR === 1, r);
  }

  // ================= C) DS #648: název šachty v cizím jazyce =================
  if (FAZE.includes('c')) {
    await otevriRe('9949 - K49');
    const pr = await E(() => { const v0 = ZAK.varianty.find(v => (v.data.ock.dalsi || []).length) || aktivniVarianta(ZAK); ZAK.aktivni = v0.id; syncVarianta();
      if (v0.zamek && v0.zamek.zamceno) { klonujVariantu(ZAK, v0.id); syncVarianta(); }
      const v = aktivniVarianta(ZAK); v.data.ock.nazev = ''; v.data.ock.dalsi[0].nazev = 'Šachta 2'; syncVarianta(); render();
      return { varianta: v.nazev, sachet: 1 + v.data.ock.dalsi.length, nazvy: sachtyZ(v.data.ock).map(s => s.nazev) }; });
    L('C příprava (s1 prázdný název, s2 uložený výchozí „Šachta 2")', pr);
    const ocek = { cz: 'Šachta', en: 'Shaft', de: 'Schacht' };
    for (const Lg of ['cz', 'en', 'de']) {
      const ww = await word('nabidka', Lg, 'c_word_' + Lg);
      const r = { s1: pocet(ww.t, ocek[Lg] + ' 1'), s2: pocet(ww.t, ocek[Lg] + ' 2'), cesky: Lg === 'cz' ? 0 : pocet(ww.t, 'Šachta '), sablona: ww.sablona + ' v' + ww.verze };
      V(`C1 Word CN ${Lg.toUpperCase()}: obě šachty „${ocek[Lg]} 1/2"${Lg === 'cz' ? '' : ', žádné „Šachta N"'}`, r.s1 > 0 && r.s2 > 0 && r.cesky === 0, r);
    }
    const tn = await nahledPodkladu('en', 'c_nahled_en');
    V('C2 náhled podkladů EN: „Shaft 1/2", žádné „Šachta N"', pocet(tn, 'Shaft 1') > 0 && pocet(tn, 'Shaft 2') > 0 && pocet(tn, 'Šachta ') === 0, { s1: pocet(tn, 'Shaft 1'), s2: pocet(tn, 'Shaft 2'), cz: pocet(tn, 'Šachta ') });
    const on = await E(() => { const v = aktivniVarianta(ZAK); const out = {}; for (const Lg of ['cz', 'en', 'de', 'fr']) out[Lg] = sachtyZ(v.data.ock).map((s, i) => vsNazevL(s, i, Lg)); return out; });
    V('C3 vsNazevL: CZ Šachta / EN Shaft / DE Schacht / FR Gaine', on.en.join() === 'Shaft 1,Shaft 2' && on.de.join() === 'Schacht 1,Schacht 2' && on.fr.join() === 'Gaine 1,Gaine 2' && on.cz.join() === 'Šachta 1,Šachta 2', on);
    for (const Lg of ['en', 'de']) {
      const ws = await word('sod', Lg, 'c_sod_' + Lg);
      if (ws.chybi || ws.chyba || !ws.t) { L(`C4 SoD ${Lg.toUpperCase()}: Word nevznikl`, ws.chybi ? 'šablona chybí' : ws.chyba); continue; }
      V(`C4 SoD ${Lg.toUpperCase()}: šachty „${ocek[Lg]} 1/2", žádné „Šachta N"`, pocet(ws.t, ocek[Lg] + ' 1') > 0 && pocet(ws.t, 'Šachta ') === 0, { s1: pocet(ws.t, ocek[Lg] + ' 1'), s2: pocet(ws.t, ocek[Lg] + ' 2'), cz: pocet(ws.t, 'Šachta '), sablona: ws.sablona });
    }
    await E(() => { const v = aktivniVarianta(ZAK); v.data.ock.dalsi[0].nazev = 'Dvorní TEST'; syncVarianta(); render(); });
    const wr = await word('nabidka', 'en', 'c_word_en_rucni');
    V('C5 ručně zadaný název („Dvorní TEST") zůstává i v EN', pocet(wr.t, 'Dvorní TEST') > 0 && pocet(wr.t, 'Shaft 1') > 0, { rucni: pocet(wr.t, 'Dvorní TEST'), s1: pocet(wr.t, 'Shaft 1') });
  }

  // ================= D) DO-N1: návrhy k položkám mimo číselník =================
  // Předpoklad: obchodník v TEST 9816 navrhne text k příplatku KLIC (uložení TEST zakázky), správce ho najde sběrem.
  // Na konci obchodník text i návrh odebere a uloží; číselník se nemění (převzetí se nezkouší).
  if (FAZE.includes('d')) {
    const C16 = 'TEST - 2026 - OPR - CN - 9816'; const NAVRH = 'TEST OP1 návrh obchodníka 9816 (DO-N1)';
    const O = await S.otevriProhlizec(OUT + '/obchodnik', 'obchodnik');
    const ulozO = async popis => { const n = O.zap.length; const ok = await O.E(async () => { try { return await onlineUloz(); } catch (e) { return 'výjimka ' + e.message; } }); await O.W(3500);
      L('uložení', popis, { ok, http: O.zap.slice(n).filter(z => /zakazky|ODPOVĚĎ/.test(z)) }); };
    const pole = (P, k) => P.E(k => { const inp = [...document.querySelectorAll('#page-kalk input[type=text]')].find(e => (e.getAttribute('onchange') || '').indexOf("popisSet('" + k + "'") === 0);
      return inp ? { je: true, td: (inp.parentElement.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120), tlac: !!inp.parentElement.querySelector('.popis-navrhnout') } : { je: false }; }, k);
    await O.otevri(C16);
    await O.E(k => { Z.prechodovePlechy = false; Z.priplatkyVynechat = []; cenikPopisNastav(C, k, ''); prepniTab('kalk'); render(); }, KLIC); await O.W(800);
    const r0 = await pole(O, KLIC); L('D0 obchodník 9816: pole textu příplatku', r0);
    await O.E(([k, t]) => { const inp = [...document.querySelectorAll('#page-kalk input[type=text]')].find(e => (e.getAttribute('onchange') || '').indexOf("popisSet('" + k + "'") === 0); inp.value = t; inp.dispatchEvent(new Event('change')); }, [KLIC, NAVRH]); await O.W(500);
    await O.E(k => { const inp = [...document.querySelectorAll('#page-kalk input[type=text]')].find(e => (e.getAttribute('onchange') || '').indexOf("popisSet('" + k + "'") === 0); const b = inp.parentElement.querySelector('.popis-navrhnout'); if (b) b.click(); }, KLIC); await O.W(800);
    const nv = await O.E(k => (aktivniVarianta(ZAK).popisyNavrhy || {})[k] || '', KLIC);
    L('D0 návrh ve variantě', nv === NAVRH, await O.E(() => window.__hlBer()));
    await ulozO('9816 návrh obchodníka');
    const sber = await E(async () => { const r = await fetch('/api/popisy?sber=1', { credentials: 'include' }); const j = await r.json(); return { s: r.status, klice: Object.keys(j.nalez || {}) }; });
    L('D sběr (GET /api/popisy?sber=1)', sber.s, { pocet: sber.klice.length, maKlic: sber.klice.includes(KLIC) });
    await E(() => { prepniTab('cenik'); render(); }); await W(1500);
    const najdi = async () => { await p.locator('#cenikPopisyKarta button', { hasText: 'Najít texty v uložených zakázkách' }).first().click(); await p.waitForFunction(() => !POPISY_CIS.hleda, null, { timeout: 60000 }); await W(1500);
      return E(([k, t]) => { const karta = document.getElementById('cenikPopisyKarta'); const mimo = [...karta.querySelectorAll('tr.popis-mimo')];
        const radek = mimo.find(tr => (tr.querySelector('.c-nazev') || {}).textContent === k);
        return { oddil: mimo.length ? mimo[0].textContent.replace(/\s+/g, ' ').trim().slice(0, 40) : null, radkuMimo: Math.max(0, mimo.length - 1), radek: !!radek,
          text: radek ? radek.textContent.includes(t) : false, navrh: radek ? !!radek.querySelector('.popis-navrh-stitek') : false,
          prevzit: radek ? !!radek.querySelector(`button[onclick^="cenikPopisPrevzit("]`) || [...radek.querySelectorAll('button')].some(b => /převzít/i.test(b.textContent)) : false,
          nalezeno: ((karta.querySelector('.btns .note') || {}).textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30) }; }, [KLIC, NAVRH]); };
    const d = await najdi();
    V(`D1 Ceník → číselník: oddíl „Návrhy k položkám mimo číselník" s řádkem „${KLIC}", text návrhu, štítek návrh a „převzít" (DO-N1 #680)`, !!d.oddil && d.radek && d.text && d.navrh && d.prevzit, d);
    await p.screenshot({ path: OUT + '/d_cenik_mimo.png' }).catch(() => {});
    L('D2 převzetí se nezkoušelo (číselník se nemění)');
    // úklid: obchodník text i návrh odebere
    await O.otevri(C16);
    await O.E(k => { cenikPopisNastav(C, k, ''); const v = aktivniVarianta(ZAK); if (v.popisyNavrhy) delete v.popisyNavrhy[k]; v.upraveno = new Date().toISOString(); render(); }, KLIC);
    await ulozO('9816 úklid návrhu');
    const d2 = await najdi();
    V('D3 po odebrání návrhu řádek v oddílu mimo číselník zmizí', !d2.radek, d2);
    await O.b.close();
  }
  L('souhrn', st, 'zápisy', zap.filter(z => !/^GET/.test(z)));
  konec(); await x.b.close();
})().catch(e => { L('VÝJIMKA', e.message, (e.stack || '').split('\n').slice(1, 3).join(' | ')); konec(); process.exit(1); });
