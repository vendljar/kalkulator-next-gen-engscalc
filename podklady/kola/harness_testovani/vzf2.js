// VZ-F2 na TESTU (trvalý souhlas J. V. 19. 11.). Zápis jen TEST VZ zakázky; Pipedrive blokováno.
const { chromium } = require('playwright'); const fs = require('fs');
const OUT = '/tmp/claude-0/sp/vzf2'; const LOG = []; const L = (...a) => { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); LOG.push(s); console.log(s); };
const IA = '99811073', IB = '99811081', IC = '99811090';
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ acceptDownloads: true }); const p = await ctx.newPage(); const zap = [];
  await p.route('**/*', async r => { const u = r.request().url(), m = r.request().method(); if (m === 'GET') return r.continue();
    if (!u.startsWith('https://testengscalc.netlify.app')) { zap.push('BLOK mimo'); return r.abort(); }
    const path = new URL(u).pathname; if (/\/api\/pd/.test(path)) { zap.push('BLOK ' + path); return r.abort(); }
    const resp = await r.fetch(); zap.push(m + ' ' + path + ' ' + resp.status()); return r.fulfill({ response: resp }); });
  p.on('download', d => d.saveAs(OUT + '/dl_' + d.suggestedFilename().replace(/[^\w.-]/g, '_')).catch(() => {}));
  await p.goto('https://testengscalc.netlify.app/', { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#onlineEmail', { timeout: 60000 });
  await p.fill('#onlineEmail', process.env.KNG_TEST_EMAIL); await p.fill('#onlineHeslo', process.env.KNG_TEST_HESLO); await p.press('#onlineHeslo', 'Enter');
  await p.waitForSelector('#prihlaseni-overlay', { state: 'hidden', timeout: 60000 }); await p.waitForFunction(() => (ONLINE_STAV.rejstrik || []).length > 100, null, { timeout: 60000 });
  const E = (fn, arg) => p.evaluate(fn, arg); const W = ms => p.waitForTimeout(ms);
  await E(() => { window.__hl = []; window.potvrd = async (t) => { window.__hl.push('POTVRĎ: ' + String(t).replace(/\s+/g, ' ').slice(0, 160)); return true; };
    window.hlaska = (t) => { window.__hl.push('HLÁŠKA: ' + String(t).replace(/\s+/g, ' ').slice(0, 300)); }; window.__hlBer = () => { const x = window.__hl; window.__hl = []; return x; };
    window.T = async (typ, Lg) => { const v = aktivniVarianta(ZAK); if (typeof dokumentZabrana === 'function') { const d = dokumentZabrana(typ, v); if (d) return { typ, stop: 'zábrana: ' + d.slice(0, 140) }; }
      let du = ''; const vt = vzTiskVstup(typ, v, t => { du = t; }); if (!vt) return { typ, stop: du || 'vzTiskVstup null' };
      let sab = null; if (/^(sod|sodProj|plnaMoc|nabidka|nabidkaProj)$/.test(typ)) { const srv = await sablonaProTisk(typ, Lg || 'cz'); if (!srv) return { typ, stop: 'bez šablony' }; sab = srv.data.slice(0); }
      try { const res = await dokumentVygeneruj(typ, sab, vt.zak, vt.varianta, JEKLY, Lg || 'cz'); const buf = new Uint8Array(await res.blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
        let html = ''; if (/^kryciproj_/.test(typ)) html = JSON.stringify(kryciVystupSekce(vt.zak, kryciProjData(vt.zak, vt.varianta, JEKLY, typ.slice(10)).sekce)); if (/^kryci_/.test(typ)) html = JSON.stringify(kryciVystupSekce(vt.zak, kryciData(vt.zak, vt.varianta, JEKLY, typ.slice(6)).sekce));
        return { typ, nazev: res.nazevSouboru, b64: btoa(s), html }; } catch (e) { return { typ, stop: 'chyba: ' + e.message }; } }; });
  const tiskni = async (krok, typy) => { for (const typ of typy) { const r = await E(t => T(t), typ); const base = `${OUT}/${krok}_${typ}`; if (r.b64) { fs.writeFileSync(base + '.docx', Buffer.from(r.b64, 'base64')); if (r.html) fs.writeFileSync(base + '.html.txt', r.html); } L('  tisk', krok, typ, r.stop ? 'STOP ' + r.stop : 'OK ' + r.nazev); } };
  const otevri = async (re) => { const s = await E(r => (ONLINE_STAV.rejstrik.find(z => new RegExp(r).test(z.cislo)) || {}).soubor, re); if (!s) { L('NENALEZENO', re); return null; }
    await Promise.race([E(x => onlineOtevri(x), s), new Promise(r => setTimeout(r, 15000))]); await W(3000); if (await E(() => typeof zamekCteniJe === 'function' && zamekCteniJe())) await E(() => zamekCteniOdemkniUI()); return s; };
  const uloz = async (popis) => { const ok = await E(() => onlineUloz()); await W(3500); const r = { ok, hl: await E(() => window.__hlBer()), posledni: zap.slice(-1)[0] }; L('uložení', popis, r); return r; };
  const zid = n => E(n => vzZakaznici(ZAK).find(z => vzNazevZ(z).includes('Zákazník ' + n)).id, n);
  const idx = n => E(n => ZAK.dalsiZakaznici.findIndex(d => (d.hlavicka || {}).objednatel && d.hlavicka.objednatel.includes('Zákazník ' + n)), n);
  const zaloz = async (zdrojRe, cislo, akce) => { await otevri(zdrojRe);
    return E(({ cislo, akce, IA }) => { const kop = JSON.parse(JSON.stringify(aktivniVarianta(ZAK).data)); const jp = !!ZAK.jenProj, jo = !!ZAK.jenOck;
      ZAK = novaZakazka(); syncVarianta(); ONLINE_STAV.soubor = ''; ONLINE_STAV.razitko = ''; ONLINE_STAV.posledni = '';
      Object.assign(ZAK, { cislo, nazevAkce: akce, adresa: 'Zkušební 13, 100 00 Praha', objednatel: 'TEST VZ F2 Zákazník A s.r.o.', ico: IA, dic: 'CZ' + IA, kontakt: 'KANAR-F2A-KONTAKT', jenProj: jp, jenOck: jo });
      ZAK.zastupci = Object.assign({}, ZAK.zastupci || {}, { smluvniJmeno: 'KANAR-F2A-ZASTUPCE' });
      const v = aktivniVarianta(ZAK); for (const k of Object.keys(kop)) if (!/sleva/.test(k)) v.data[k] = kop[k]; if (v.data.ock) v.data.ock.dalsi = [];
      syncVarianta(); if (typeof zamekCteniJe === 'function' && zamekCteniJe()) zamekCteniOdemkniUI(); render(); return { cislo: ZAK.cislo, jenProj: jp }; }, { cislo, akce, IA }); };
  const pridej = (h, vl) => E(({ h, vl }) => { vzFormOtevri('ock'); Object.assign(VZ_UI.form.h, h); render(); const b = document.getElementById('vzFormPridej'); const note = (document.getElementById('vzFormIcoDupl') || {}).textContent || '';
    const pred = vzZakaznici(ZAK).length; vzFormPridej(); const po = vzZakaznici(ZAK).length; if (VZ_UI.form) vzFormZavri(); return { tlacitkoZhasnute: !!(b && b.disabled), poznamka: note.slice(0, 160), pridano: po - pred, hl: window.__hlBer() }; }, { h, vl });
  const vyp0 = await E(() => viceZakaznikuZapnuto()); L('vypínač na začátku', vyp0 ? 'ZAP' : 'VYP'); fs.writeFileSync(OUT + '/vyp0.txt', String(vyp0));
  if (!vyp0) { await E(() => onlineFunkceNastav('viceZakazniku', true)); await W(2500); }
  // ---- 6 #671 ceník (jen čtení)
  L('6 #671', await E(() => { prepniTab('cenik'); render(); const el = [...document.querySelectorAll('input')].filter(i => i.placeholder === 'jako statika zahr.');
    const up = typeof cenikZahrStatikaOplUpozorneni === 'function' ? cenikZahrStatikaOplUpozorneni(CENIK_ZAHR) : 'funkce chybí';
    return { poliSPopisem: el.length, title: el[0] ? el[0].title : '', upozorneniDialogu: String(up).replace(/\d[\d\s ]*/g, '#').slice(0, 220) }; }));
  // ---- zakázka F2 (OCK)
  L('založení F2', await zaloz('9603 - K19T-C103', 'TEST - 2026 - OPR - CN - 9813', 'TEST VZ – F2')); await uloz('F2 založení');
  L('B', await pridej({ objednatel: 'TEST VZ F2 Zákazník B s.r.o.', ico: IB, dic: 'CZ' + IB, kontakt: 'KANAR-F2B-KONTAKT' }, false));
  L('C bez IČO', await pridej({ objednatel: 'TEST VZ F2 Zákazník C s.r.o.', ico: '', kontakt: 'KANAR-F2C-KONTAKT' }, false));
  await uloz('F2 A,B,C');
  // ---- 1 #660
  L('1 formulář s IČO B', await pridej({ objednatel: 'TEST VZ F2 duplicita', ico: IB }, false));
  const iC = await idx('C'), iB = await idx('B');
  L('1a IČO doplněné u C až po přidání', await E(({ i, IB }) => { vzOtevri(ZAK.dalsiZakaznici[i].id); set('ZAK.dalsiZakaznici.' + i + '.hlavicka.ico', IB); return { ico: ZAK.dalsiZakaznici[i].hlavicka.ico, hl: window.__hlBer() }; }, { i: iC, IB }));
  L('1b IČO řídícího A → IČO B', await E(({ IB }) => { vzOtevri(vzRidiciId(ZAK)); set('ZAK.ico', IB); return { ico: ZAK.ico, hl: window.__hlBer() }; }, { IB }));
  L('1c převzetí z databáze do C (karta jen v paměti)', await E(({ i, IB }) => { vzOtevri(ZAK.dalsiZakaznici[i].id); const karta = { nazev: 'TEST VZ F2 Karta s IČO B', objednatel: 'TEST VZ F2 Karta s IČO B', ico: IB };
    ZAK_DB.seznam = (ZAK_DB.seznam || []).concat([karta]); zakaznikDoZakazkyUI(zakaznikKlic(karta), 'ock'); ZAK_DB.seznam = ZAK_DB.seznam.filter(x => x !== karta);
    return { ico: ZAK.dalsiZakaznici[i].hlavicka.ico, hl: window.__hlBer() }; }, { i: iC, IB }));
  L('1d našeptávač do C (karta jen v paměti)', await E(({ i, IB }) => { if (typeof naseptavacZakVyber !== 'function' || typeof naseptavacZakKarta !== 'function') return 'není';
    const karta = { nazev: 'TEST VZ F2 Našeptávač', objednatel: 'TEST VZ F2 Našeptávač', ico: IB }; const puv = window.naseptavacZakKarta; window.naseptavacZakKarta = () => karta;
    try { naseptavacZakVyber('TEST VZ F2 Našeptávač', 'ock'); } finally { window.naseptavacZakKarta = puv; } return { ico: ZAK.dalsiZakaznici[i].hlavicka.ico, objednatel: ZAK.dalsiZakaznici[i].hlavicka.objednatel, hl: window.__hlBer() }; }, { i: iC, IB }));
  L('1 server: obchvat klienta (C dostane IČO B přímo v datech)', await E(({ i, IB }) => { ZAK.dalsiZakaznici[i].hlavicka.ico = IB; return true; }, { i: iC, IB }));
  await uloz('1 server duplicita');
  await E(({ i }) => { ZAK.dalsiZakaznici[i].hlavicka.ico = ''; }, { i: iC }); await uloz('1 vráceno');
  // ---- 2 #663
  await E(id => vzOtevri(id), await zid('B')); await E(() => { tiskJazykNastav('cz'); nabidkaWord(); }); await W(9000); await E(() => window.__hlBer()); await uloz('2 CN B');
  const zkus = async (popis, cesta, hod) => L('2', popis, await E(({ cesta, hod }) => { const pred = get(cesta); set(cesta, hod); const po = get(cesta); return { zmeneno: po !== pred, hl: window.__hlBer() }; }, { cesta, hod }));
  await E(id => vzOtevri(id), await zid('B'));
  await zkus('po CN B: zástupce B', `ZAK.dalsiZakaznici.${iB}.zastupci.smluvniJmeno`, 'KANAR-F2B-ZAST1');
  await uloz('2 zástupce B po CN');
  await E(() => { tiskJazykNastav('cz'); sodWord('sod'); }); await W(9000); L('2 SoD B', await E(() => ({ hl: window.__hlBer(), stav: ([...document.querySelectorAll('.sodStav_sod')][0] || {}).textContent || '' }))); await uloz('2 po SoD B');
  await E(id => vzOtevri(id), await zid('B'));
  await zkus('po SoD B: zástupce B', `ZAK.dalsiZakaznici.${iB}.zastupci.smluvniJmeno`, 'KANAR-F2B-ZAST2');
  await zkus('po SoD B: DIČ B', `ZAK.dalsiZakaznici.${iB}.hlavicka.dic`, 'CZKANARF2B');
  await zkus('po SoD B: kontakt B', `ZAK.dalsiZakaznici.${iB}.hlavicka.kontakt`, 'KANAR-F2B-KONTAKT2');
  L('2 KL OCK pole zástupce B jen ke čtení', await E(() => { prepniTab('kryci'); render(); const el = [...document.querySelectorAll('input')].find(e => /zastupci\.smluvniJmeno'/.test(e.getAttribute('onchange') || '')); return el ? { disabled: el.disabled || el.readOnly, title: (el.title || '').slice(0, 120) } : 'nenalezeno'; }));
  await E(() => vzOtevri(vzRidiciId(ZAK)));
  await zkus('A bez SoD: zástupce A', 'ZAK.zastupci.smluvniJmeno', 'KANAR-F2A-ZAST2');
  await uloz('2 změny po SoD');
  L('2 server: obchvat (zástupce B přímo v datech)', await E(({ i }) => { ZAK.dalsiZakaznici[i].zastupci.smluvniJmeno = 'KANAR-F2B-OBCHVAT'; return true; }, { i: iB }));
  await uloz('2 server zmrazení');
  await otevri('CN - 9813$'); L('2 po znovuotevření zástupce B', await E(({ i }) => ZAK.dalsiZakaznici[i].zastupci.smluvniJmeno, { i: iB }));
  // ---- 3 #661 PROJ (OVP)
  L('založení F2 PROJ', await zaloz('7650 - K29-N50', 'TEST - 2026 - OVP - CN - 9814', 'TEST VZ – F2 PROJ')); await uloz('F2P založení');
  L('B', await pridej({ objednatel: 'TEST VZ F2 Zákazník B s.r.o.', ico: IB, dic: 'CZ' + IB, kontakt: 'KANAR-F2PB-KONTAKT' }, false)); await uloz('F2P A,B');
  await E(id => vzOtevri(id), await zid('B'));
  L('3 KL PROJ u B', await E(() => { prepniTab('kryciproj'); render(); const t = (document.getElementById('page-kryciproj') || document.body).innerText; return { ukazujeB: /Zákazník B/.test(t), ukazujeA: /Zákazník A s\.r\.o/.test(t) }; }));
  L('3 zmocnitel u B', await E(() => { klpSet('pmZmocnitel', 'KANAR-F2PB-ZMOCNITEL'); klpSet('pmJednajici', 'KANAR-F2PB-JEDNAJICI'); return { hl: window.__hlBer(), hodnotyRidici: JSON.stringify(KLP.hodnoty || {}).match(/KANAR-F2PB-\w+/g) }; }));
  await uloz('3');
  await E(() => vzOtevri(vzRidiciId(ZAK))); await tiskni('p3_A', ['plnaMoc', 'kryciproj_bo', 'sodProj']);
  await E(id => vzOtevri(id), await zid('B')); await tiskni('p3_B', ['plnaMoc', 'kryciproj_bo']);
  // ---- 4 regrese 1 zákazník / VYP, 5 název plné moci
  await E(() => onlineFunkceNastav('viceZakazniku', false)); await W(2500);
  await otevri('9949 - K49');
  L('4 9949 (SoD vytištěna) varianty', await E(() => ZAK.varianty.map(v => ({ c: (v.zamek || {}).cislo, zamceno: !!(v.zamek && v.zamek.zamceno) }))));
  for (const [c, h] of [['ZAK.objednatel', 'X'], ['ZAK.ico', '12345679'], ['ZAK.dic', 'CZX'], ['ZAK.zastupci.smluvniJmeno', 'X']])
    L('4 zmrazení', c, await E(({ c, h }) => { const pred = get(c); set(c, h); const po = get(c); return { zmeneno: po !== pred, hl: window.__hlBer() }; }, { c, h }));
  await otevri('9603 - K19T-C103'); await tiskni('r4', ['nabidka', 'kryci_bo', 'kryci_techdata', 'sod', 'plnaMoc']);
  await E(v => onlineFunkceNastav('viceZakazniku', v), vyp0 || true); await W(2500);
  // ---- 7 úklid
  for (const re of ['CN - 9801$', 'CN - 9802$', 'CN - 9811$', 'CN - 9812$']) { await otevri(re);
    L('7', re, await E(() => { const rid = vzZakaznik(ZAK, vzRidiciId(ZAK)); const pis = (/Zákazník (\w)/.exec(vzNazevZ(rid)) || [])[1] || '';
      const cizi = []; for (const v of ZAK.varianty) { const kp = (v.data && v.data.kryciProj) || {}; const h = kp.hodnoty || kp; for (const [k, x] of Object.entries(h || {})) if (/KANAR-/.test(String(x)) && !new RegExp('KANAR-' + pis).test(String(x))) cizi.push(v.nazev + ':' + k + '=' + x); }
      return { ridici: vzNazevZ(rid), zamceneVarianty: ZAK.varianty.filter(v => v.zamek && v.zamek.zamceno).length + '/' + ZAK.varianty.length, ciziVKlProjRidiciho: cizi, ciziZastupci: Object.entries(ZAK.zastupci || {}).filter(([k, x]) => /KANAR-/.test(String(x)) && !new RegExp('KANAR-' + pis).test(String(x))).map(([k]) => k) }; })); }
  const ted = await E(() => viceZakaznikuZapnuto()); if (ted !== vyp0) { await E(v => onlineFunkceNastav('viceZakazniku', v), vyp0); await W(2500); }
  L('vypínač na konci', await E(() => viceZakaznikuZapnuto()) ? 'ZAP' : 'VYP'); L('zápisy', zap.join(', '));
  fs.writeFileSync(OUT + '/log.txt', LOG.join('\n')); await b.close();
})().catch(e => { console.error('CHYBA', e.message); fs.writeFileSync(OUT + '/log.txt', LOG.join('\n') + '\nCHYBA ' + e.message); process.exit(1); });
