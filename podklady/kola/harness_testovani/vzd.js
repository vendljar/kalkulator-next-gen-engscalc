// Zkouška VZD (v22.11.1 v testu v22.11.5) na TESTU, 22. 11. 2026 — trvalý souhlas J. V. se zápisem na test.
// Zápis jen nové zakázky TEST OPR 9830+ (filtr d3_spolecne); Pipedrive jen suchý běh /api/pd/nanecisto bez dealId.
// (b) CN pod správcem (X = autor), dotisk pod obchodníkem (Y) → „Vypracoval" = X.
// (e) KL sdílené varianty → „vlastní varianta"; (a) suchý běh PD u víc zákazníků; (c) výměna řídícího na B s CN.
// (d) TEST 7650-K29-N50 — DPZ v nabídce PROJ × krycí list PROJ (jen čtení, neukládá se).
const fs = require('fs');
const H = require('./vzd_spolecne');
const OUT = process.env.OUT || H.SP + '/vzd';
const { L, V, konec, st } = H.start(OUT);
const IA = H.ico('9983101'), IB = H.ico('9983102'), IC = H.ico('9983103'), IX = H.ico('9983100');
(async () => {
  const A = await H.prohlizec(OUT, 'spravce'); const O = await H.prohlizec(OUT, 'obchodnik');
  const jaA = await A.E(() => ({ role: ONLINE_STAV.ja.role, jmeno: ONLINE_STAV.ja.jmeno || '', email: ONLINE_STAV.ja.email || '' }));
  const jaO = await O.E(() => ({ role: ONLINE_STAV.ja.role, jmeno: ONLINE_STAV.ja.jmeno || '', email: ONLINE_STAV.ja.email || '' }));
  L('role', { spravce: jaA.role, obchodnik: jaO.role, ruzneUcty: jaA.email.toLowerCase() !== jaO.email.toLowerCase(), ruznaJmena: jaA.jmeno !== jaO.jmeno, jmenoObchodnika: !!jaO.jmeno });
  const vyp0 = await A.E(() => viceZakaznikuZapnuto()); L('vypínač víc zákazníků na začátku', vyp0 ? 'ZAP' : 'VYP');
  if (!vyp0) { await A.E(() => onlineFunkceNastav('viceZakazniku', true)); await A.W(2500); }
  const cis = fs.existsSync(OUT + '/cisla.json') ? JSON.parse(fs.readFileSync(OUT + '/cisla.json', 'utf8')) : null;
  const [cX, cVZ] = cis ? [cis.cX, cis.cVZ] : await H.volne(A, 'OPR', 9830, 2);
  const [cP] = cis ? [cis.cP] : await H.volne(A, 'OVP', 9830, 1);
  fs.writeFileSync(OUT + '/cisla.json', JSON.stringify({ cX, cVZ, cP })); L('čísla', { cX, cVZ, cP });
  const posledniDocx = async (P, pred) => { await P.W(1500); const n = P.dl.slice(pred).filter(f => /\.docx$/.test(f)); return n[n.length - 1] || null; };
  const vypracoval = (f, jmX) => { if (!f) return null; const t = H.txtDocx(f).split('\n'); const i = t.findIndex(x => /^\s*Vypracoval\s*:/i.test(x)); const blok = i < 0 ? '' : t.slice(i, i + 6).join(' | ');
    const media = require('child_process').execSync(`unzip -l "${f}" | grep -c 'word/media/' || true`).toString().trim();
    return { blok: !!blok, maX: !!jmX && blok.includes(jmX), maEmailX: blok.toLowerCase().includes(jaA.email.toLowerCase()), maEmailY: blok.toLowerCase().includes(jaO.email.toLowerCase()), media: Number(media) }; };

  // ================= (b) Vypracoval: X = správce (autor, odešle CN), Y = obchodník (dotisk) =================
  if (process.env.VZD_JEN !== 'vz') {
    let jmX = '';
    if (!(await A.E(c => ONLINE_STAV.rejstrik.some(z => z.cislo === c), cX))) {
      L('b založení (správce = X)', await H.zaloz(A, '9603 - K19T-C103', cX, 'TEST VZD – Vypracoval', { objednatel: 'TEST VZD Zákazník X s.r.o.', ico: IX, dic: 'CZ' + IX, kontakt: 'KANAR-VZDX' }));
      await A.ulozX(L, 'b založení');
      const n = A.dl.length; await A.E(() => { tiskJazykNastav('cz'); nabidkaWord(); }); await A.W(10000);
      const fX = await posledniDocx(A, n); await A.ulozX(L, 'b po CN (správce = X)');
      const zX = await A.E(e => { const v = aktivniVarianta(ZAK); const z = (v.zamek || {}).zpracovatel || null; return { zamceno: !!(v.zamek && v.zamek.zamceno), snimek: !!z, snimekJeX: !!z && String(z.kdo || z.email || '').toLowerCase() === e, jmeno: z ? zpracovatelJmeno(z) : '' }; }, jaA.email.toLowerCase());
      jmX = zX.jmeno; const vX = vypracoval(fX, jmX);
      V('b1 CN pod X zamčená, snímek zamek.zpracovatel = X', zX.zamceno && zX.snimek && zX.snimekJeX, Object.assign({}, zX, { jmeno: !!zX.jmeno }));
      V('b2 Word CN pod X: Vypracoval = X', !!vX && vX.maX && !vX.maEmailY, vX);
    } else { await A.otevri(cX); jmX = await A.E(() => { const z = (aktivniVarianta(ZAK).zamek || {}).zpracovatel; return z ? zpracovatelJmeno(z) : ''; }); L('b', cX, 'už existuje — tisk X přeskočen');
      const fX = fs.readdirSync(OUT + '/spravce').filter(f => f.includes(cX.replace(/ /g, '')) && /^dl_NABIDKA/.test(f)).map(f => OUT + '/spravce/' + f)[0];
      const vX = vypracoval(fX, jmX); V('b2 Word CN pod X (soubor z prvního běhu): Vypracoval = X', !!vX && vX.maX && !vX.maEmailY, vX); }
    await O.otevri(cX);
    const pl = await O.E(() => { const v = aktivniVarianta(ZAK); const p = zpracovatelPlaceholders(null, v); let nah = ''; try { nah = (nabidkaData(ZAK, v, 'cz').placeholders || {}).ZPRAC_JMENO || ''; } catch (e) { nah = 'chyba ' + e.message; }
      const ja = zpracovatelPlaceholders(null, null); return { zamceno: !!(v.zamek && v.zamek.zamceno), ph: p.ZPRAC_JMENO, nahled: nah, email: p.ZPRAC_EMAIL || '', jaJmeno: ja.ZPRAC_JMENO, obrazky: Object.keys(zpracovatelObrazky(v)) }; });
    V('b3 dotisk pod Y — ZPRAC_JMENO (Word) = X', !!jmX && pl.ph === jmX && pl.ph !== pl.jaJmeno, { zamceno: pl.zamceno, jeX: pl.ph === jmX, jeY: pl.ph === pl.jaJmeno, emailX: pl.email.toLowerCase() === jaA.email.toLowerCase() });
    V('b4 online tisk (nabidkaData) pod Y = X', pl.nahled === jmX, { jeX: pl.nahled === jmX, jeY: pl.nahled === pl.jaJmeno });
    L('b4b podpis do dotisku pod Y (zpracovatelObrazky)', pl.obrazky, '— prázdné = podpis kolegy se nevloží (#665)');
    const n2 = O.dl.length; await O.E(() => { tiskJazykNastav('cz'); nabidkaWord(); }); await O.W(10000);
    const fY = await posledniDocx(O, n2); const vY = vypracoval(fY, jmX);
    V('b5 Word dotisku pod Y: Vypracoval = X (ne Y)', !!vY && vY.maX && !vY.maEmailY, vY || { hl: await O.E(() => window.__hlBer()) });
    L('b6 dotisk Y — hlášky', await O.E(() => window.__hlBer()));
    await O.ulozX(L, 'b dotisk (Y) — uložení razítka tisku');
  }

  // ================= víc zákazníků (e, a, c) =================
  if (process.env.VZD_JEN !== 'b') {
    if (await A.E(c => ONLINE_STAV.rejstrik.some(z => z.cislo === c), cVZ)) { L(cVZ, 'už existuje — konec části VZ'); }
    else {
      L('VZ založení', await H.zaloz(A, '9603 - K19T-C103', cVZ, 'TEST VZD – víc zákazníků', { objednatel: 'TEST VZD Zákazník A s.r.o.', ico: IA, dic: 'CZ' + IA, kontakt: 'KANAR-VZDA-KONTAKT' }));
      await A.ulozX(L, 'VZ založení');
      const pridej = (h) => A.E((h) => { vzFormOtevri('ock'); Object.assign(VZ_UI.form.h, h); vzFormNova('stejna'); const pred = vzZakaznici(ZAK).length; vzFormPridej(); if (VZ_UI.form) vzFormZavri(); return { pridano: vzZakaznici(ZAK).length - pred, hl: window.__hlBer() }; }, h);
      L('B', await pridej({ objednatel: 'TEST VZD Zákazník B s.r.o.', ico: IB, dic: 'CZ' + IB, kontakt: 'KANAR-VZDB-KONTAKT' }));
      L('C', await pridej({ objednatel: 'TEST VZD Zákazník C s.r.o.', ico: IC, dic: 'CZ' + IC, kontakt: 'KANAR-VZDC-KONTAKT' }));
      await A.ulozX(L, 'A, B, C sdílí V1');
      const zid = n => A.E(n => vzZakaznici(ZAK).find(z => vzNazevZ(z).includes('Zákazník ' + n)).id, n);
      const zA = await zid('A'), zB = await zid('B'), zC = await zid('C');
      // ---- (e) vlastní varianta z KL
      const e1 = await A.E(id => { vzOtevri(id); prepniTab('kryci'); render(); const pg = document.getElementById('page-kryci') || document.body;
        const bt = [...pg.querySelectorAll('button')].find(b => /vzVlastniVarianta/.test(b.getAttribute('onclick') || ''));
        const upoz = bt ? (bt.closest('div') || {}).textContent.replace(/\s+/g, ' ').trim().slice(0, 240) : '';
        const pred = { varianty: ZAK.varianty.length, var: vzZakaznik(ZAK, id).varianta };
        if (bt) bt.click();
        const po = { varianty: ZAK.varianty.length, var: vzZakaznik(ZAK, id).varianta, aktivni: String(ZAK.aktivni), nazev: (vzVarianta(vzZakaznik(ZAK, id).varianta) || {}).nazev };
        const ostatni = vzZakaznici(ZAK).filter(z => z.id !== id).map(z => z.varianta);
        return { tlacitko: !!bt, upoz, pred, po, ostatniNaV1: ostatni.every(x => x === pred.var), hl: window.__hlBer() }; }, zC);
      V('e1 KL OCK u C na sdílené variantě: upozornění s tlačítkem „vlastní varianta"', e1.tlacitko, e1.upoz);
      V('e2 klik založí kopii pro C (nová varianta, C na ní, A a B zůstávají na V1)', e1.tlacitko && e1.po.varianty === e1.pred.varianty + 1 && e1.po.var !== e1.pred.var && e1.po.aktivni === e1.po.var && e1.ostatniNaV1, e1);
      const e3 = await A.E(id => { prepniTab('kryci'); render(); const pg = document.getElementById('page-kryci') || document.body; return { tlacitkoPo: [...pg.querySelectorAll('button')].some(b => /vzVlastniVarianta/.test(b.getAttribute('onclick') || '')) }; }, zC);
      V('e3 po založení u C už upozornění sdílené varianty není', !e3.tlacitkoPo, e3);
      const ue = await A.ulozX(L, 'e vlastní varianta C');
      V('e4 uložení vlastní varianty projde', ue.http.some(x => /POST \/api\/zakazky 200/.test(x)), ue.http);
      // ---- (a) suchý běh PD
      const a0 = await A.E(({ zA, zB }) => { prepniTab('kryci'); const pz = ['objKopie1', 'objKopie2', 'objPodpis2Jmeno'].map(id => [id, typeof kryciPoleZakaznika === 'function' ? !!kryciPoleZakaznika(id) : null]);
        vzOtevri(zA); klSet('objKopie1', 'KANAR-VZDA-1');
        vzOtevri(zB); klSet('objKopie1', 'KANAR-VZDB-1'); klSet('objKopie2', 'KANAR-VZDB-2');
        vzOtevri(zA); const kl = (vzVarianta(vzRidiciVariantaId(ZAK)).data.kryci) || {};
        return { poleZakaznika: pz, ulozeni: JSON.stringify({ h: kl.hodnoty, vl: kl.vzVlastnik, hz: kl.hodnotyZakaznika }).replace(/"(objKopie|objPodpis)/g, '"$1').slice(0, 400) }; }, { zA, zB });
      L('a0 ruční pole KL (A objKopie1; B objKopie1 obsazené A, objKopie2 volné)', a0);
      await A.ulozX(L, 'a ruční pole KL');
      const pdn = async (popis, otevrit) => A.E(async ({ otevrit }) => { if (otevrit) vzOtevri(otevrit); prepniTab('kryci'); render();
        const pod = pdnPodklad(ZAK, JEKLY); const telo = JSON.stringify(pdnTelo(pod)); const ok = await pdnUiSpust(); render();
        const html = ((document.getElementById('pdnKarta_ock') || {}).innerText || ''); const data = JSON.stringify(PDN_UI.data || {});
        const vse = telo + data + html; const kan = [...new Set(vse.match(/KANAR-VZD[A-C]-\w+/g) || [])].sort();
        return { ok, rezim: (PDN_UI.data || {}).rezim, chyba: PDN_UI.chyba, kanarkyTelo: [...new Set(telo.match(/KANAR-VZD[A-C]-\w+/g) || [])].sort(), kanarkyNahled: [...new Set((data + html).match(/KANAR-VZD[A-C]-\w+/g) || [])].sort(), kan,
          ridici: vzNazevZ(vzZakaznik(ZAK, vzRidiciId(ZAK))).replace(/^TEST VZD /, ''), radku: ((PDN_UI.data || {}).radky || []).length }; }, { otevrit });
      const a1 = await pdn('řídící A, otevřený A', zA); L('a1 suchý běh (otevřený A)', a1);
      const nA = a1.kan.filter(k => /VZDA-1/.test(k)).length, nB = a1.kan.filter(k => /VZDB-[12]$/.test(k)).length;
      V('a1 suchý běh 200 (nanecisto), náhled bez ručních polí KL zákazníka B', a1.ok && nB === 0, { rezim: a1.rezim, kanarky: a1.kan, radku: a1.radku });
      V('a2 ruční pole KL zákazníka A v podkladu ano (detektor není prázdný)', nA > 0, { telo: a1.kanarkyTelo, nahled: a1.kanarkyNahled });
      const a3 = await pdn('řídící A, otevřený B', zB);
      V('a3 totéž s otevřeným B (podklad vždy za řídícího A)', a3.ok && !a3.kan.some(k => /VZDB-[12]$/.test(k)) && a3.kan.some(k => /VZDA-1/.test(k)), { kanarky: a3.kan });
      // ---- (c) CN zákazníkovi B, výměna řídícího na B
      let n = A.dl.length; await A.E(id => vzOtevri(id), zB); await A.E(() => { tiskJazykNastav('cz'); nabidkaWord(); }); await A.W(10000); await A.E(() => window.__hlBer());
      const c0 = await A.E(id => ({ odeslanoB: typeof vzOdeslano === 'function' ? !!vzOdeslano(vzZakaznik(ZAK, id)) : null, v1zamcena: !!(vzVarianta(vzZakaznik(ZAK, id).varianta).zamek || {}).zamceno }), zB);
      await A.ulozX(L, 'c CN zákazníkovi B'); L('c0 B odeslána CN', c0, 'docx', !!(await posledniDocx(A, n)));
      const c1 = await A.E(async id => { const r = vzT1ZakZmen(id); if (r && r.then) await r; await new Promise(x => setTimeout(x, 500)); return { ridiciB: vzRidiciId(ZAK) === id, pismeno: (vzZakaznik(ZAK, vzRidiciId(ZAK)) || {}).pismeno, hl: window.__hlBer() }; }, zB);
      await A.W(800); const uc1 = await A.ulozX(L, 'c výměna řídícího na B');
      V('c1 výměna řídícího na B (CN odeslána, neprodáno) projde a uloží se', c1.ridiciB && uc1.http.some(x => /POST \/api\/zakazky 200/.test(x)), Object.assign({}, c1, { http: uc1.http }));
      const c2 = await A.E(() => { vzOtevri(vzRidiciId(ZAK)); prepniTab('kalk'); render(); const pg = document.getElementById('page-kalk') || document.body;
        const inp = [...pg.querySelectorAll('input')].filter(e => /naseptavacZakVyber\(this\.value/.test(e.getAttribute('onchange') || ''));
        const attr = e => e ? { readOnly: e.readOnly, disabled: e.disabled, title: (e.title || '').slice(0, 140) } : null;
        const ico = [...pg.querySelectorAll('input')].find(e => /'ZAK\.ico'/.test(e.getAttribute('onchange') || '') || /ZAK\.ico/.test(e.getAttribute('oninput') || ''));
        const out = { inputNazev: attr(inp[0]), inputIco: attr(ico), zmeny: {} };
        for (const [c, h] of [['ZAK.objednatel', 'TEST VZD změna názvu'], ['ZAK.ico', '99831049'], ['ZAK.dic', 'CZ99831049'], ['ZAK.adresaObjednatele', 'Jinde 1'], ['ZAK.kontakt', 'KANAR-VZDB-KONTAKT2']]) {
          const pred = get(c); window.__hlBer(); set(c, h); const po = get(c); out.zmeny[c.slice(4)] = { zmeneno: po !== pred, hl: window.__hlBer().map(x => x.slice(0, 160)) }; }
        return out; });
      L('c2 hlavička řídícího B po výměně', c2);
      V('c2 název, IČO, DIČ, sídlo B jen ke čtení (klient), kontakt volný', ['objednatel', 'ico', 'dic', 'adresaObjednatele'].every(k => !c2.zmeny[k].zmeneno && c2.zmeny[k].hl.length) && c2.zmeny.kontakt.zmeneno, c2.zmeny);
      V('c3 pole názvu v hlavičce zamčené (readonly/disabled)', !!c2.inputNazev && (c2.inputNazev.readOnly || c2.inputNazev.disabled), c2.inputNazev);
      await A.ulozX(L, 'c kontakt B');
      await A.E(() => { ZAK.objednatel = 'TEST VZD obchvat s.r.o.'; ZAK.ico = '99831049'; });
      const uc4 = await A.ulozX(L, 'c obchvat klienta (název+IČO B v datech)');
      const odp = uc4.http.filter(x => /ODPOVĚĎ/.test(x)).join(' '); const lista = uc4.lista.join(' | ') + ' ' + uc4.hl.join(' | ');
      const pocet = s => (s.match(/Neuloženo:/g) || []).length;
      V('c4 server odmítne (4xx) změnu názvu/IČO řídícího B', uc4.http.some(x => /POST \/api\/zakazky 4\d\d/.test(x)), uc4.http);
      V('c5 právě jedna předpona „Neuloženo:" (odpověď serveru i hláška)', pocet(odp) === 1 && pocet(lista) <= 1 && pocet(lista + ' ' + odp) >= 1, { odpoved: pocet(odp), hlaska: pocet(lista), lista: uc4.lista.slice(0, 2), hl: uc4.hl.slice(0, 2) });
      await A.otevri(cVZ);
      const c6 = await A.E(() => ({ nazev: ZAK.objednatel.replace(/^TEST VZD /, ''), icoB: ZAK.ico }));
      V('c6 po znovuotevření hlavička = B (obchvat neuložen)', /Zákazník B/.test(c6.nazev) && c6.icoB === IB, c6);
      const a4 = await pdn('řídící B (po výměně)', null);
      V('a4 po výměně řídícího: suchý běh nese B, ne A', a4.ok && a4.kan.some(k => /VZDB-[12]$/.test(k)) && !a4.kan.some(k => /VZDA-1/.test(k)), { ridici: a4.ridici, kanarky: a4.kan });
    }
  }

  // ================= (d) TEST 7650-K29-N50 (jen čtení) =================
  if (!process.env.VZD_JEN) {
    const c7650 = await A.otevriRe('7650 - K29-N50');
    const d = await A.E(() => ZAK.varianty.map(v => { try {
      const ph = nabidkaProjData(ZAK, v, 'cz').placeholders; const nab = nabidkaProjNabizi(v);
      const pole = id => KRYCI_PROJ_SEKCE.flatMap(s => s.pole).find(p => p.id === id); const c = kryciProjCtx(ZAK, v);
      const zk = JSON.parse(JSON.stringify(ZAK)); const vv = zk.varianty.find(x => String(x.id) === String(v.id));
      if (!(vv.zamek && vv.zamek.zamceno)) vv.zamek = { zamceno: true, tisky: [] }; if (!vv.prodano) vv.prodano = { datum: '2026-11-22', zakaznik: 'z1' };
      vv.data.kryciProj = vv.data.kryciProj || { hodnoty: {} }; if (!vv.data.kryciProj.lhutyProj) vv.data.kryciProj.lhutyProj = lhutyProjVychozi();
      const t = kryciProjTerminy(kryciProjCtx(zk, vv)) || {}; const st = (v.data.proj.zadani.sekce || []).find(s => s.key === 'studie') || {};
      const tz = String(ph.PROJ_TERMINY || '');
      return { varianta: v.nazev, aktivni: String(v.id) === String(ZAK.aktivni), prodano: !!v.prodano, studieVyrazena: (st.polozky || []).length ? (st.polozky || []).every(p => p.vyrazeno) : null,
        nabidkaNabiziStudii: nab('studie'), hvezdickaDpz: ph.PROJ_DPZ_HVEZDICKA_ZNACKA === '*', dpzOdStudie: /od schválení studie/.test(tz),
        dpzRadek: tz.split('\n').filter(l => /DPZ|dokumentac/i.test(l)).map(l => l.replace(/\d[\d\s ]*(Kč|EUR|€)/g, '#').slice(0, 200)),
        klRozsah: String(pole('cin_studie').prefill(c)).slice(0, 80), klAno: pole('st_studie').prefill(c), terminStudie: !!(t.terminStudie || {}).datum, zdrojDpz: String((t.terminDpz || {}).zdroj || '').slice(0, 120) };
    } catch (e) { return { varianta: v.nazev, chyba: e.message }; } }));
    L('d', c7650, JSON.stringify(d, null, 1));
    for (const x of d) { if (x.chyba) { V('d ' + x.varianta + ' výpočet', false, x.chyba); continue; }
      const shoda = x.nabidkaNabiziStudii === /^ANO/.test(x.klRozsah) && x.nabidkaNabiziStudii === (x.klAno === 'ANO') && x.nabidkaNabiziStudii === x.terminStudie && x.dpzOdStudie === /studie/.test(x.zdrojDpz);
      V('d ' + x.varianta + ': nabídka PROJ a KL PROJ rozhodují o studii stejně (rozsah, ANO, termín studie, DPZ od studie)', shoda, x); }
    await A.E(() => { ZAK = novaZakazka(); syncVarianta(); ONLINE_STAV.soubor = ''; render(); });   // 7650 se neukládá
  }
  const ted = await A.E(() => viceZakaznikuZapnuto()); if (ted !== vyp0) { await A.E(v => onlineFunkceNastav('viceZakazniku', v), vyp0); await A.W(2500); }
  L('vypínač na konci', (await A.E(() => viceZakaznikuZapnuto())) ? 'ZAP' : 'VYP');
  L('zápisy správce', A.zap.join(', ')); L('zápisy obchodník', O.zap.join(', '));
  L('SOUHRN', st); konec(); await A.b.close(); await O.b.close();
})().catch(e => { console.error('CHYBA', e.stack); L('CHYBA ' + e.message); konec(); process.exit(1); });
