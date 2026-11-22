// Zkouška BZ (v22.11.3 v testu v22.11.5) na TESTU, 22. 11. 2026 — trvalý souhlas J. V. se zápisem na test.
// Navazuje na vzd.js (cisla.json: OPR 9830 odeslaná CN pod správcem, OPR 9831 víc zákazníků).
// 1) B231 strana po zámku: OCK 9830 (správce, odeslaná → prodaná), OPR 9832 obchodníka (odeslaná), OVP 9830 (PROJ, odeslaná).
// 2) B234 karta zákazníka (TEST BZ karty, IČO 99832xxx): autor/admin mění, ostatní návrh; historie; smazání i s historií.
// 3) B235/B236 vypínač PIPEDRIVE_ZAPIS: neověřeno (viz konec souboru); /api/pd* blokováno kromě suchého běhu.
const fs = require('fs');
const H = require('./vzd_spolecne');
const OUT = process.env.OUT || H.SP + '/bz';
const VZD = process.env.VZD_OUT || H.SP + '/vzd';
const { L, V, konec, st } = H.start(OUT);
const KA = H.ico('9983201'), KO = H.ico('9983202');
(async () => {
  const { cX, cVZ, cP } = JSON.parse(fs.readFileSync(VZD + '/cisla.json', 'utf8'));
  const A = await H.prohlizec(OUT, 'spravce'); const O = await H.prohlizec(OUT, 'obchodnik');
  for (const P of [A, O]) await P.E(() => { if (window.__fetchPuv) return; window.__fetchPuv = window.fetch; window.__resp = [];
    window.fetch = async (...a) => { const r = await window.__fetchPuv(...a); try { const u = String((a[0] && a[0].url) || a[0]); const m = ((a[1] || {}).method || 'GET').toUpperCase();
      if (/\/api\/(zakazky|zakaznici)/.test(u) && m !== 'GET') r.clone().text().then(t => window.__resp.push(m + ' ' + u.replace(/^https?:\/\/[^/]+/, '') + ' ' + r.status + ' ' + t.replace(/[\w.+-]+@[\w.-]+/g, '<email>').slice(0, 500))); } catch (e) {} return r; }; });
  const respBer = P => P.E(() => { const x = window.__resp; window.__resp = []; return x; });
  const zkusSet = (P, cesta, h) => P.E(({ cesta, h }) => { window.__hlBer(); const pred = get(cesta); set(cesta, h); const po = get(cesta); const hl = window.__hlBer().map(x => x.slice(0, 200));
    if (po !== pred) set(cesta, pred); return { zmeneno: po !== pred, hl }; }, { cesta, h });
  const surove = (P, fn, arg) => P.E(fn, arg);
  const je403Strana = u => u.http.some(x => /POST \/api\/zakazky 403/.test(x)) && u.http.some(x => /strana zakázky/.test(x));
  const STRANA = /strana zakázky/;

  const CAST = (process.env.BZ_CAST || '1,2').split(',');
  if (CAST.includes('1')) {
  // ================= 1a) OCK 9830 správce, odeslaná =================
  await A.otevri(cX);
  const z0 = await A.E(() => ({ zamceno: aktivniVarianta(ZAK).zamek && aktivniVarianta(ZAK).zamek.zamceno, snimekStrana: JSON.stringify((aktivniVarianta(ZAK).zamek || {}).strana || null), jenProj: !!ZAK.jenProj, jenOck: !!ZAK.jenOck, prodano: !!aktivniVarianta(ZAK).prodano, vyrazena: zakazkaVyrazenaStrana(ZAK) }));
  L('1a stav 9830', z0);
  V('1a0 nový zámek nese snímek zamek.strana (píše server)', z0.zamceno && z0.snimekStrana !== 'null', z0.snimekStrana);
  for (const [c, h] of [['ZAK.jenProj', true], ['ZAK.jenOck', true]]) { const r = await zkusSet(A, c, h);
    V('1a1 klient správce: ' + c + ' po zámku odmítnuto s důvodem', !r.zmeneno && r.hl.some(x => STRANA.test(x)), r); }
  const ui = await A.E(() => { try { prepniTab('kalk'); } catch (e) {} render(); const cb = [...document.querySelectorAll('input[type=checkbox]')].filter(e => /ZAK\.jen(Proj|Ock)/.test(e.getAttribute('onchange') || '')); return cb.map(e => ({ co: (/ZAK\.(jen\w+)/.exec(e.getAttribute('onchange')) || [])[1], disabled: e.disabled, title: (e.title || (e.closest('[title]') || {}).title || '').slice(0, 100) })); });
  L('1a zaškrtávátka strany v UI', ui);
  for (const [k, h] of [['jenProj', true], ['jenOck', true]]) {
    await surove(A, ({ k, h }) => { ZAK[k] = h; }, { k, h }); const u = await A.ulozX(L, '1a server správce ' + k + '=' + h);
    V('1a2 server: správce ' + k + ' po zámku → 403 „strana zakázky"', je403Strana(u), u.http); await A.otevri(cX); }
  // doplnění čísla PROJ k OCK zakázce (vedoucí strana OCK se nemění → podle pravidla R2 projde, ověřit chování)
  await surove(A, (c) => { ZAK.projHlavicka = Object.assign({}, ZAK.projHlavicka || {}, { cislo: c }); }, cP);
  const ud = await A.ulozX(L, '1a doplnění čísla PROJ (OVP) k odeslané OCK');
  L('1a3 doplnění čísla PROJ k odeslané OCK — výsledek', ud.http, 'vyřazená strana po:', await A.E(() => zakazkaVyrazenaStrana(ZAK)));
  if (ud.http.some(x => / 200/.test(x))) { await surove(A, () => { ZAK.projHlavicka.cislo = ''; }); await A.ulozX(L, '1a vrácení čísla PROJ'); }
  await A.otevri(cX);
  // obchodník na cizí odeslané zakázce (klient)
  await O.otevri(cX);
  for (const c of ['ZAK.jenProj', 'ZAK.jenOck']) { const r = await zkusSet(O, c, true); V('1a4 klient obchodník (cizí 9830): ' + c + ' nezměněno', !r.zmeneno, r); }

  // ================= 1b) OPR obchodníka, odeslaná CN =================
  const [cO] = await H.volne(O, 'OPR', 9832, 1);
  L('1b založení (obchodník)', await H.zaloz(O, '9603 - K19T-C103', cO, 'TEST BZ – strana po zámku (obchodník)', { objednatel: 'TEST BZ Zákazník O s.r.o.', ico: H.ico('9983203'), kontakt: 'KANAR-BZO' }));
  const u0 = await O.ulozX(L, '1b založení');
  if (u0.http.some(x => / 200/.test(x))) {
    await O.E(() => { tiskJazykNastav('cz'); nabidkaWord(); }); await O.W(10000); const hlt = await O.E(() => window.__hlBer());
    const u1 = await O.ulozX(L, '1b po CN (obchodník)'); const zam = await O.E(() => !!(aktivniVarianta(ZAK).zamek || {}).zamceno);
    L('1b CN obchodníka', { zamceno: zam, hl: hlt.slice(0, 2) });
    if (zam && u1.http.some(x => / 200/.test(x))) {
      for (const [c, h] of [['ZAK.jenProj', true], ['ZAK.jenOck', true]]) { const r = await zkusSet(O, c, h); V('1b1 klient obchodník (autor): ' + c + ' po zámku odmítnuto s důvodem', !r.zmeneno && r.hl.some(x => STRANA.test(x)), r); }
      for (const k of ['jenProj', 'jenOck']) { await surove(O, k => { ZAK[k] = true; }, k); const u = await O.ulozX(L, '1b server obchodník ' + k);
        V('1b2 server: obchodník (autor) ' + k + ' po zámku → 403 „strana zakázky"', je403Strana(u), u.http); await O.otevri(cO); }
    } else V('1b CN obchodníka vznikla a uložila se', false, { zam, http: u1.http, hl: hlt.slice(0, 2) });
  } else V('1b založení zakázky obchodníkem', false, u0.http);

  // ================= 1c) prodej 9830 a znovu =================
  await A.otevri(cX);
  await A.E(() => { prepniTab('kryci'); render(); const bt = [...document.querySelectorAll('#page-kryci button')].find(x => /prodejUiProdej/.test(x.getAttribute('onclick') || '')); if (!bt) throw new Error('tlačítko Prodáno nenalezeno'); bt.click(); });
  await A.W(9000); const pr = await A.E(() => ({ prodano: !!aktivniVarianta(ZAK).prodano, hl: window.__hlBer().slice(0, 3) })); L('1c Prodáno 9830', pr, A.zap.slice(-4));
  await A.otevri(cX);
  for (const [c, h] of [['ZAK.jenProj', true], ['ZAK.jenOck', true]]) { const r = await zkusSet(A, c, h); V('1c1 prodaná: klient správce ' + c + ' odmítnuto', !r.zmeneno && r.hl.some(x => STRANA.test(x)), r); }
  await surove(A, () => { ZAK.jenProj = true; }); const up = await A.ulozX(L, '1c server správce jenProj (prodaná)');
  V('1c2 prodaná: server správce jenProj → 403', je403Strana(up), up.http); await A.otevri(cX);

  // ================= 1d) PROJ (OVP) odeslaná: přepnutí strany a číslo nabídky =================
  if (!(await A.E(c => ONLINE_STAV.rejstrik.some(z => z.cislo === c), cP))) {
    L('1d založení OVP', await H.zaloz(A, '7650 - K29-N50', cP, 'TEST BZ – strana po zámku PROJ', { objednatel: 'TEST BZ Zákazník P s.r.o.', ico: H.ico('9983204'), kontakt: 'KANAR-BZP' }, { jenProj: false }));
    await A.ulozX(L, '1d založení');
    await A.E(() => { tiskJazykNastav('cz'); nabidkaProjWord(); }); await A.W(10000); L('1d hlášky tisku', await A.E(() => window.__hlBer().slice(0, 2)));
    await A.ulozX(L, '1d po CN PROJ');
  }
  await A.otevri(cP);
  const zp = await A.E(() => ({ zamceno: !!(aktivniVarianta(ZAK).zamek || {}).zamceno, vyrazena: zakazkaVyrazenaStrana(ZAK), jenProj: !!ZAK.jenProj, snimek: JSON.stringify((aktivniVarianta(ZAK).zamek || {}).strana || null) }));
  L('1d stav OVP', zp);
  if (zp.zamceno) {
    for (const [c, h] of [['ZAK.jenOck', true], ['ZAK.jenProj', true]]) { const r = await zkusSet(A, c, h); V('1d1 PROJ klient správce ' + c + ' odmítnuto', !r.zmeneno && r.hl.some(x => STRANA.test(x)), r); }
    const [cOPRvolne] = await H.volne(A, 'OPR', 9840, 1);
    const pokusy = [['jenProj=true', () => { ZAK.jenProj = true; }],
      ['číslo OVP → ÓVP (R2)', () => { ZAK.cislo = ZAK.cislo.replace('OVP', 'ÓVP'); }],
      ['doplnění čísla OCK (OVP do hlavičky PROJ, OPR do čísla zakázky)', (c) => { ZAK.projHlavicka = Object.assign({}, ZAK.projHlavicka || {}, { cislo: ZAK.cislo }); ZAK.cislo = c; }]];
    for (const [popis, fn] of pokusy) { await A.E(fn, cOPRvolne); const u = await A.ulozX(L, '1d server správce ' + popis);
      V('1d2 PROJ server správce: ' + popis + ' → 403', /doplnění/.test(popis) ? u.http.some(x => /POST \/api\/zakazky 403/.test(x)) : je403Strana(u), u.http); await A.otevri(cP); }
  } else V('1d OVP odeslaná (zamčená)', false, zp);

  }
  // ================= 2) karta zákazníka B234 =================
  if (CAST.includes('2')) {
  const api = (P, cesta, telo, metoda) => P.E(async ({ cesta, telo, metoda }) => { const o = { credentials: 'same-origin', method: metoda || (telo ? 'POST' : 'GET') };
    if (telo) { o.headers = { 'Content-Type': 'application/json' }; o.body = JSON.stringify(telo); }
    const r = await window.__fetchPuv(cesta, o); let d = {}; try { d = await r.json(); } catch (e) {} return { status: r.status, d }; }, { cesta, telo, metoda });
  const karta = async (P, k) => (await api(P, '/api/zakaznici?klic=' + k)).d.zakaznik || null;
  const hist = async (P, k) => ((await api(P, '/api/zakaznici?klic=' + k + '&historie=1')).d.historie || []);
  const bezE = o => JSON.parse(H.bezEmailu(JSON.stringify(o)));
  for (const P of [A, O]) await P.E(() => { window.__nactiZ = async () => { try { prepniTab('zakaznici'); } catch (e) {} for (let i = 0; i < 100 && ZAK_DB.nacita; i++) await new Promise(r => setTimeout(r, 200)); await zakazniciNacti(); }; });
  for (const k of [KA, KO]) if (await karta(A, k)) { const d = await api(A, '/api/zakaznici?klic=' + k, null, 'DELETE'); L('2 úklid zbytku z předchozího běhu', k, d.status); }
  if ((await karta(A, KA)) || (await karta(A, KO))) { V('2 karty TEST BZ už existují — přeskočeno', false, { KA, KO }); }
  else {
    // správce založí kartu přes UI
    await A.E(async (k) => { await window.__nactiZ(); zakaznikNovyUI(); Object.assign(ZAK_DB.otevreny, { nazev: 'TEST BZ karta správce s.r.o.', ico: k, sidlo: 'Zkušební 1, 100 00 Praha', kontaktOsoba: 'KANAR-BZK-1' }); await zakaznikUloz(); }, KA);
    const k1 = await karta(A, KA); V('2a karta správce založena, autor = správce', !!k1 && k1.autor && k1.autor.toLowerCase() === (await A.E(() => ONLINE_STAV.ja.email)).toLowerCase(), k1 && bezE({ autor: k1.autor }));
    // obchodník upraví cizí kartu přes UI → návrh
    const o1 = await O.E(async (k) => { await window.__nactiZ(); zakaznikOtevri(k); render(); const pg = document.getElementById('page-zakaznici') || document.body;
      const pozn = /Kartu mění jen její autor/.test(pg.innerText); zakaznikSet('kontaktOsoba', 'KANAR-BZK-NAVRH1'); await zakaznikUloz(); return { poznamkaVUI: pozn, hlaska: ZAK_DB.hlaska.replace(/[\w.+-]+@[\w.-]+/g, '<email>') }; }, KA);
    const k2 = await karta(A, KA);
    V('2b obchodník (ne autor) cizí kartu nepřepíše — uloží se návrh změny', k2.kontaktOsoba === 'KANAR-BZK-1' && (k2.navrhy || []).length === 1 && /návrh/.test(o1.hlaska), { kontakt: k2.kontaktOsoba, navrhu: (k2.navrhy || []).length, ui: o1 });
    const prij = await api(O, '/api/zakaznici', { akce: 'navrhPrijmout', klic: KA, id: k2.navrhy[0].id });
    V('2c obchodník návrh sám nepřevezme (server 403)', prij.status === 403, bezE({ status: prij.status, chyba: prij.d.chyba }));
    const o2 = await O.E(async (k) => { await window.__nactiZ(); zakaznikOtevri(k); render(); const pg = document.getElementById('page-zakaznici') || document.body; return { tlacitkoPrevzit: [...pg.querySelectorAll('button')].some(b => /zakaznikNavrhRozhodni/.test(b.getAttribute('onclick') || '')) }; }, KA);
    V('2c2 obchodník nemá na kartě tlačítka Převzít/Zamítnout', !o2.tlacitkoPrevzit, o2);
    // správce převezme návrh přes UI
    const a3 = await A.E(async (k) => { await window.__nactiZ(); zakaznikOtevri(k); render(); const pg = document.getElementById('page-zakaznici') || document.body;
      const tl = [...pg.querySelectorAll('button')].filter(b => /zakaznikNavrhRozhodni\('[^']+', true\)/.test(b.getAttribute('onclick') || '')); const n = tl.length; if (tl[0]) tl[0].click(); await new Promise(r => setTimeout(r, 3000));
      return { tlacitek: n, hlaska: ZAK_DB.hlaska }; }, KA);
    const k3 = await karta(A, KA); const h3 = await hist(A, KA);
    V('2d správce (admin) návrh převezme tlačítkem → karta změněna, návrh pryč', a3.tlacitek === 1 && k3.kontaktOsoba === 'KANAR-BZK-NAVRH1' && !(k3.navrhy || []).length, { a3, kontakt: k3.kontaktOsoba });
    V('2e historie verzí: předchozí verze uložena (proc „návrh …")', h3.length === 1 && /návrh/.test(h3[0].proc) && h3[0].verze && h3[0].verze.kontaktOsoba === 'KANAR-BZK-1', bezE(h3.map(x => ({ proc: x.proc, kontakt: x.verze && x.verze.kontaktOsoba }))));
    // druhý návrh obchodníka → správce zamítne
    await O.E(async (k) => { await window.__nactiZ(); zakaznikOtevri(k); zakaznikSet('kontaktOsoba', 'KANAR-BZK-NAVRH2'); await zakaznikUloz(); }, KA);
    const k4 = await karta(A, KA); const zam = await api(A, '/api/zakaznici', { akce: 'navrhZamitnout', klic: KA, id: (k4.navrhy || [{}])[0].id });
    const k5 = await karta(A, KA);
    V('2f zamítnutí návrhu správcem: karta beze změny, návrh pryč', zam.status === 200 && k5.kontaktOsoba === 'KANAR-BZK-NAVRH1' && !(k5.navrhy || []).length, { status: zam.status, kontakt: k5.kontaktOsoba });
    // obchodník založí vlastní kartu a mění ji přímo; správce ji mění přímo
    await O.E(async (k) => { zakaznikNovyUI(); Object.assign(ZAK_DB.otevreny, { nazev: 'TEST BZ karta obchodník s.r.o.', ico: k, kontaktOsoba: 'KANAR-BZK-O1' }); await zakaznikUloz(); }, KO);
    const o6 = await O.E(async (k) => { await window.__nactiZ(); zakaznikOtevri(k); zakaznikSet('kontaktOsoba', 'KANAR-BZK-O2'); await zakaznikUloz(); return ZAK_DB.hlaska; }, KO);
    const k6 = await karta(O, KO);
    V('2g autor (obchodník) vlastní kartu mění přímo', k6.kontaktOsoba === 'KANAR-BZK-O2' && !(k6.navrhy || []).length && /^Uloženo/.test(o6), { kontakt: k6.kontaktOsoba, hlaska: o6 });
    const r7 = await api(A, '/api/zakaznici', { zakaznik: Object.assign({}, k6, { kontaktOsoba: 'KANAR-BZK-A1' }) });
    const k7 = await karta(A, KO);
    V('2h správce (admin) cizí kartu mění přímo (bez návrhu)', r7.status === 200 && !r7.d.navrh && k7.kontaktOsoba === 'KANAR-BZK-A1', { status: r7.status, navrh: r7.d.navrh, kontakt: k7.kontaktOsoba });
    const h7 = await hist(O, KO); V('2i historie karty obchodníka: 2 verze (úprava autora, úprava správce)', h7.length === 2 && h7.every(x => x.proc === 'úprava'), h7.map(x => ({ proc: x.proc, kontakt: x.verze && x.verze.kontaktOsoba })));
    // historie v UI
    const hu = await A.E(async (k) => { await window.__nactiZ(); zakaznikOtevri(k); await zakaznikHistorieUI(); render(); const re = /Historie verzí \((\d+)\)/; return { html: (re.exec(zakaznikHistorieHtml()) || [])[1] || null, stranka: (re.exec(document.body.innerText) || [])[1] || null, pamet: (ZAK_DB.historie || []).length }; }, KO);
    V('2j tlačítko „Historie verzí" ukáže 2 verze (na stránce)', hu.stranka === '2' || hu.html === '2', hu);
    // smazání: obchodník nesmí, správce smaže i historii
    const d0 = await api(O, '/api/zakaznici?klic=' + KA, null, 'DELETE');
    V('2k obchodník kartu nesmaže (403)', d0.status === 403, d0.status);
    for (const k of [KA, KO]) { const d = await api(A, '/api/zakaznici?klic=' + k, null, 'DELETE'); const hh = await hist(A, k); const kk = await karta(A, k);
      V('2l smazání karty ' + k + ' smaže i historii', d.status === 200 && !kk && hh.length === 0, { status: d.status, karta: !!kk, historie: hh.length }); }
    // nová karta se stejným klíčem historii nezdědí
    await api(A, '/api/zakaznici', { zakaznik: { nazev: 'TEST BZ karta znovu s.r.o.', ico: KA } });
    const hz = await hist(A, KA); V('2m nová karta se stejným IČO historii nezdědí', hz.length === 0, hz.length);
    const dz = await api(A, '/api/zakaznici?klic=' + KA, null, 'DELETE'); L('2 úklid', dz.status, 'karty po úklidu', !!(await karta(A, KA)), !!(await karta(A, KO)));
  }

  }
  // 3) B235/B236 vypínač PIPEDRIVE_ZAPIS: na testu NEOVĚŘENO — zápisové cesty (poznámka dealu, vítěz, zrušení vazby)
  //    potřebují zakázku navázanou na deal; sonda s vymyšleným dealem nebyla povolena (nic do živého Pipedrive,
  //    ostatní /api/pd* blokované). Ověřit na dealu TEST nebo v simulátoru.
  L('zápisy správce', A.zap.join(', ')); L('zápisy obchodník', O.zap.join(', '));
  L('SOUHRN', st); konec(); await A.b.close(); await O.b.close();
})().catch(e => { console.error('CHYBA', e.stack); L('CHYBA ' + e.message); konec(); process.exit(1); });
