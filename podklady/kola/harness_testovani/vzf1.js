// VZ-F1 zkouška na TESTU (zápis jen do TEST VZ zakázky, Pipedrive a vše mimo test blokováno).
const { chromium } = require('playwright'); const fs = require('fs');
const OUT = '/tmp/claude-0/sp/vzf1'; const LOG = []; const L = (...a) => { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); LOG.push(s); console.log(s); };
const CISLO = 'TEST - 2026 - OPR - CN - 9811', AKCE = 'TEST VZ – F1';
const IA = '99811014', IB = '99811022', IC = '99811031';
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ acceptDownloads: true }); const p = await ctx.newPage();
  const zapisy = [];
  await p.route('**/*', r => { const u = r.request().url(), m = r.request().method();
    if (m === 'GET') return r.continue();
    if (!u.startsWith('https://testengscalc.netlify.app')) { zapisy.push('BLOK mimo ' + m); return r.abort(); }
    const path = new URL(u).pathname;
    if (/\/api\/pd/.test(path)) { zapisy.push('BLOK ' + m + ' ' + path); return r.abort(); }
    zapisy.push(m + ' ' + path); return r.continue(); });
  p.on('download', d => d.saveAs(OUT + '/dl_' + Date.now() + '_' + d.suggestedFilename().replace(/[^\w.-]/g, '_')).catch(() => {}));
  await p.goto('https://testengscalc.netlify.app/', { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#onlineEmail', { timeout: 60000 });
  await p.fill('#onlineEmail', process.env.KNG_TEST_EMAIL); await p.fill('#onlineHeslo', process.env.KNG_TEST_HESLO); await p.press('#onlineHeslo', 'Enter');
  await p.waitForSelector('#prihlaseni-overlay', { state: 'hidden', timeout: 60000 }); await p.waitForTimeout(2500);
  const E = (fn, arg) => p.evaluate(fn, arg);
  await E(() => { window.__hl = []; window.potvrd = async (t) => { window.__hl.push('POTVRĎ: ' + String(t).replace(/\s+/g, ' ').slice(0, 220)); return true; };
    window.hlaska = (t) => { window.__hl.push('HLÁŠKA: ' + String(t).replace(/\s+/g, ' ').slice(0, 260)); };
    window.__hlBer = () => { const x = window.__hl; window.__hl = []; return x; };
    // tisk/obsah dokumentu stejnou cestou jako tlačítka, bez zámku
    window.T = async (typ, Lg) => {
      const v = aktivniVarianta(ZAK);
      if (typeof dokumentZabrana === 'function') { const d = dokumentZabrana(typ, v); if (d) return { typ, stop: 'zábrana: ' + d }; }
      let duvod = ''; const vt = vzTiskVstup(typ, v, t => { duvod = t; }); if (!vt) return { typ, stop: duvod || (window.__hl.slice(-1)[0] || 'vzTiskVstup null') };
      let sab = null;
      if (/^(sod|sodProj|plnaMoc|nabidka)$/.test(typ)) { const srv = await sablonaProTisk(typ, Lg || 'cz'); if (!srv) return { typ, stop: 'bez šablony' }; sab = srv.data.slice(0); }
      try {
        const res = await dokumentVygeneruj(typ, sab, vt.zak, vt.varianta, JEKLY, Lg || 'cz');
        const buf = new Uint8Array(await res.blob.arrayBuffer()); let s = '';
        for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
        let html = '';
        if (/^kryci_(bo|techdata)$/.test(typ)) html = JSON.stringify(kryciVystupSekce(vt.zak, kryciData(vt.zak, vt.varianta, JEKLY, typ.slice(6)).sekce));
        if (/^kryciproj_(bo|techdata)$/.test(typ)) html = JSON.stringify(kryciVystupSekce(vt.zak, kryciProjData(vt.zak, vt.varianta, JEKLY, typ.slice(10)).sekce));
        return { typ, nazev: res.nazevSouboru, b64: btoa(s), html };
      } catch (e) { return { typ, stop: 'chyba: ' + e.message }; }
    };
  });
  const tiskni = async (krok, komu, typy) => {
    for (const typ of typy) {
      const r = await E(t => T(t), typ);
      const base = `${OUT}/${krok}_${komu}_${typ}`;
      if (r.b64) { fs.writeFileSync(base + '.docx', Buffer.from(r.b64, 'base64')); if (r.html) fs.writeFileSync(base + '.html.txt', r.html); }
      L('  tisk', krok, komu, typ, r.stop ? 'STOP ' + r.stop : 'soubor ' + r.nazev.replace(/\d{4}-\d\d-\d\d/g, 'DATUM'));
    }
  };
  const otevri = async (kdo) => { await E(k => { const z = vzZakaznici(ZAK).find(x => x.pismeno === k || (k === 'R' && x.ridici)) ; vzOtevri(z.id); }, kdo); await p.waitForTimeout(600); };
  const uloz = async (popis) => { const ok = await E(() => onlineUloz()); await p.waitForTimeout(3500); L('uložení', popis, ok, JSON.stringify(await E(() => ({ hl: window.__hlBer(), zprava: (ONLINE_STAV.zprava && (ONLINE_STAV.zprava.text || ONLINE_STAV.zprava)) || '', soubor: ONLINE_STAV.soubor }))));
    if (!ok && popis === 'S1') { L('S1 neuloženo — konec'); fs.writeFileSync(OUT + '/log.txt', LOG.join('\n')); process.exit(7); } };
  const odesli = async (komu) => { await otevri(komu); await E(() => { tiskJazykNastav('cz'); nabidkaWord(); }); await p.waitForTimeout(9000);
    L('odeslání CN', komu, JSON.stringify(await E(() => ({ cislo: (aktivniVarianta(ZAK).zamek || {}).cislo || '', tisky: ((aktivniVarianta(ZAK).zamek || {}).tisky || []).length, hl: window.__hlBer() })))); };

  // --- S0 vypínač
  const vyp0 = await E(() => viceZakaznikuZapnuto()); L('vypínač na začátku', vyp0 ? 'ZAP' : 'VYP');
  if (!vyp0) { await E(() => onlineFunkceNastav('viceZakazniku', true)); await p.waitForTimeout(2500); }
  L('vypínač teď', await E(() => viceZakaznikuZapnuto()) ? 'ZAP' : 'VYP');
  fs.writeFileSync(OUT + '/vyp0.txt', vyp0 ? 'ZAP' : 'VYP');
  // --- S1 zakázka
  if (await E(c => ONLINE_STAV.rejstrik.some(z => z.cislo === c), CISLO)) { L('zakázka už existuje — konec'); process.exit(4); }
  const vzor = await E(() => (ONLINE_STAV.rejstrik.find(z => /9603 - K19T-C103/.test(z.cislo)) || {}).soubor);
  await Promise.race([E(s => onlineOtevri(s), vzor), new Promise(r => setTimeout(r, 15000))]); await p.waitForTimeout(3000);
  L('S1', await E(({ CISLO, AKCE, IA }) => {
    const kopie = JSON.parse(JSON.stringify(aktivniVarianta(ZAK).data));
    ZAK = novaZakazka(); syncVarianta(); ONLINE_STAV.soubor = ''; ONLINE_STAV.razitko = ''; ONLINE_STAV.posledni = '';
    Object.assign(ZAK, { cislo: CISLO, nazevAkce: AKCE, adresa: 'Zkušební 11, 100 00 Praha', objednatel: 'TEST VZ F1 Zákazník A s.r.o.',
      ico: IA, dic: 'CZ' + IA, kontakt: 'KANAR-A-KONTAKT', adresaObjednatele: 'Zkušební 1, 100 00 Praha' });
    ZAK.zastupci = Object.assign({}, ZAK.zastupci || {}, { smluvniJmeno: 'KANAR-A-ZASTUPCE' });
    const v = aktivniVarianta(ZAK); for (const k of Object.keys(kopie)) if (!/sleva/.test(k)) v.data[k] = kopie[k];
    if (v.data.ock) v.data.ock.dalsi = [];
    syncVarianta(); const cteni0 = typeof zamekCteniJe === 'function' && zamekCteniJe(); if (cteni0) zamekCteniOdemkniUI(); render(); return { ok: true, cteniPred: cteni0, cteniPo: typeof zamekCteniJe === 'function' && zamekCteniJe(), vzRezim: vzRezimUI() };
  }, { CISLO, AKCE, IA }));
  await uloz('S1');
  // --- S2 B a C
  const pridej = async (h, vlastni) => E(({ h, vlastni }) => { vzFormOtevri('ock'); Object.assign(VZ_UI.form.h, h); vzFormNova(vlastni ? 'vlastni' : 'stejna'); vzFormPridej();
    return { zakazniku: vzZakaznici(ZAK).length, hl: window.__hlBer() }; }, { h, vlastni });
  L('S2 B', await pridej({ objednatel: 'TEST VZ F1 Zákazník B s.r.o.', ico: IB, dic: 'CZ' + IB, kontakt: 'KANAR-B-KONTAKT', adresaObjednatele: 'Zkušební 2, 100 00 Praha' }, false));
  L('S2 C', await pridej({ objednatel: 'TEST VZ F1 Zákazník C s.r.o.', ico: IC, dic: 'CZ' + IC, kontakt: 'KANAR-C-KONTAKT', adresaObjednatele: 'Zkušební 3, 100 00 Praha' }, true));
  // --- S3 N1 duplicitní IČO
  L('S3 N1 stejné IČO jako B', await pridej({ objednatel: 'TEST VZ F1 duplicita IČO', ico: IB, dic: '', kontakt: '' }, false));
  await E(() => { if (VZ_UI.form) vzFormZavri(); });
  L('zákazníci', await E(() => vzZakaznici(ZAK).map(z => ({ p: z.pismeno || '(řídící)', ridici: !!z.ridici, varianta: (vzVarianta(z.varianta) || {}).nazev }))));
  await uloz('S3');
  // --- S5 N2
  for (const k of ['R', 'B', 'C']) { await otevri(k); L('S5 N2 varianty v hlavičce u', k, await E(() => (vzVariantyHlavicka() || []).map(v => v.nazev))); }
  // --- S6 N3: zápis zástupce a DIČ u otevřeného C přes pole krycího listu OCK a PROJ
  await otevri('C');
  const zapisPole = async (tab, re, hodnota) => { await E(t => { prepniTab(t); render(); }, tab); await p.waitForTimeout(800);
    return E(({ re, hodnota }) => { const rx = new RegExp(re); const el = [...document.querySelectorAll('input,textarea')].find(e => rx.test(e.getAttribute('onchange') || ''));
      if (!el) return { nalezeno: false };
      const oc = el.getAttribute('onchange'); const ro = el.disabled || el.readOnly; el.value = hodnota; el.dispatchEvent(new Event('change', { bubbles: true }));
      return { nalezeno: true, onchange: oc.slice(0, 90), jenCteni: ro, hl: window.__hlBer() }; }, { re, hodnota }); };
  L('S6 KL OCK zástupce', await zapisPole('kryci', "zastupci\\.smluvniJmeno'", 'KANAR-C-ZASTUPCE'));
  L('S6 KL OCK DIČ', await zapisPole('kryci', "\\.dic'", 'CZKANARC1'));
  L('S6 KL PROJ zástupce', await zapisPole('kryciproj', "zastupci\\.smluvniJmeno'", 'KANAR-C-ZASTPROJ'));
  L('S6 KL PROJ DIČ', await zapisPole('kryciproj', "\\.dic'", 'CZKANARC2'));
  L('S6 kde je kanárek C', await E(() => { const j = s => JSON.stringify(s || {}); const c = vzZakaznici(ZAK).find(z => z.pismeno === 'C');
    const d = ZAK.dalsiZakaznici.find(x => String(x.id) === String(c.id));
    return { ridiciZastupci: /KANAR-C/.test(j(ZAK.zastupci)), ridiciDic: /KANARC/.test(String(ZAK.dic)), C_zastupci: j(d.zastupci).match(/KANAR-C-\w+/g), C_dic: (d.hlavicka || {}).dic }; }));
  await uloz('S6');
  // --- S8 odeslání CN A, B, C
  for (const k of ['R', 'B', 'C']) await odesli(k);
  await uloz('S8');
  // --- S9 tisky před výměnou
  const TYPY = ['sod', 'plnaMoc', 'kryci_bo', 'kryci_techdata', 'kryciproj_bo', 'kryciproj_techdata'];
  for (const k of ['R', 'B', 'C']) { await otevri(k); await tiskni('pred', k === 'R' ? 'A' : k, TYPY); }
  // --- S11 výměna řídícího na C
  await E(() => vzRidiciZmen(vzZakaznici(ZAK).find(z => z.pismeno === 'C').id)); await p.waitForTimeout(1500);
  L('S11 výměna', await E(() => ({ ridici: vzNazevZ(vzZakaznik(ZAK, vzRidiciId(ZAK))), hl: window.__hlBer() })));
  // A je teď další zákazník: zapsat mu nový zástupce, nesmí se dostat k C
  const pismA = await E(() => (vzZakaznici(ZAK).find(z => /Zákazník A/.test(vzNazevZ(z))) || {}).pismeno || '');
  L('A má po výměně písmeno', pismA || '(řídící)');
  await E(id => vzOtevri(id), await E(() => vzZakaznici(ZAK).find(z => /Zákazník A/.test(vzNazevZ(z))).id)); await p.waitForTimeout(500);
  L('S11 KL OCK zástupce u A', await zapisPole('kryci', "zastupci\\.smluvniJmeno'", 'KANAR-A2-ZASTUPCE'));
  L('S11 kde je A2', await E(() => ({ ridici: /KANAR-A2/.test(JSON.stringify(ZAK.zastupci || {})), dalsi: ZAK.dalsiZakaznici.filter(d => /KANAR-A2/.test(JSON.stringify(d.zastupci || {}))).length })));
  await uloz('S11');
  for (const nm of ['A', 'B', 'C']) { await E(n => vzOtevri(vzZakaznici(ZAK).find(z => vzNazevZ(z).includes('Zákazník ' + n)).id), nm); await p.waitForTimeout(500); await tiskni('po', nm, TYPY); }
  // --- N4 název KL vlastní varianty C (před výměnou) uložen v logu výš
  // --- S13 prodej B a controlling
  const bId = await E(() => vzZakaznici(ZAK).find(z => vzNazevZ(z).includes('Zákazník B')).id);
  await E(id => { const z = vzZakaznik(ZAK, id); vzProdejOtevri(id, z.varianta); }, bId); await p.waitForTimeout(800);
  await E(() => vzProdejPotvrd(true)); await p.waitForTimeout(3000);
  L('S13 prodej B', await E(() => ({ ridici: vzNazevZ(vzZakaznik(ZAK, vzRidiciId(ZAK))), hl: window.__hlBer() })));
  L('S13 controlling', await E(() => { const v = ZAK.varianty.find(x => String(x.id) === String(vzRidiciVariantaId(ZAK))); const r = ctrlExportVarianty(ZAK, v, {});
    return (r.strany || r.radky || []).map(s => ({ oblast: s.oblast, cislo: s.cislo })); }));
  await uloz('S13');
  fs.writeFileSync(OUT + '/zakazka.txt', await E(() => ONLINE_STAV.soubor));
  L('zápisy', zapisy.join(', '));
  fs.writeFileSync(OUT + '/log.txt', LOG.join('\n'));
  await b.close();
})().catch(e => { console.error('CHYBA', e.message); fs.writeFileSync(OUT + '/log.txt', LOG.join('\n') + '\nCHYBA ' + e.message); process.exit(1); });
