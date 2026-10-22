/* ROZHODNUTÍ J. V. K AUDITU K6 (dávka D5, 22. 10. 2026, v22.10.4).
 *
 *   K6-K3  přechodové plechy (materiál + montáž) jsou v kartě objednaných
 *          i ve SoD jednou položkou jako v nabídce — objednat jen celé,
 *          součet v Kč i v € sedí s nabídkou;
 *   K6-K2  SoD se šablonou bez rozpisu objednaných a s objednanými příplatky
 *          upozorní „Šablona nemá rozpis objednaných příplatků…";
 *   K6-K4  záznam tisku SoD nese otisk objednaných a cenu díla; dotisk SoD
 *          a export pro controlling berou cenu díla z něj, pozdější změnu
 *          objednaných zapíše server do historie (kdo/kdy);
 *   K6-K5  karta objednaných se před nahrazením záznamu jiné zamčené
 *          varianty zeptá (potvrd) a bez potvrzení nic nemění;
 *   K6-K9  karta ukazuje ceny v měně smlouvy (€ u cizojazyčné SoD).
 *
 * Serverovou cestu (záznam tisku přepočítaný serverem, historie, obnova
 * K6-S7) měří netlify/test_prava.mjs (blok D5). Ceník je zkušební
 * (zkusebni_cenik.js), skutečné ceny do repozitáře nepatří. */
const vm = require('vm');
const fs = require('fs');
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
['./preklad.js', './format.js', './engine.js', './engine_proj.js', './techspec.js', './zakazka.js', './zamek.js',
  './sleva.js', './zaokrouhleni.js', './firma.js', './zpracovatel.js', './kryci.js', './kryci_proj.js', './dokumenty.js',
  './nabidka.js', './nabidka_proj.js'].forEach(nacti);
const ZC = require('./zkusebni_cenik.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const O = nacti('./objednane.js');
nacti('./sod.js');
const C = nacti('./controlling.js');
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 500)); }
};
const kopie = x => JSON.parse(JSON.stringify(x));
const cislo = t => +String(t).replace(/[^0-9,]/g, '').replace(',', '.');
const TED = '2026-10-21T10:00:00Z';
const OBCH = { email: 'obchodnik@priklad.cz', role: 'Obchodník' };
const ADM = { email: 'spravce@priklad.cz', role: 'Administrátor' };
const PLECHY = ['prechMat', 'prechMont'];
const v4 = { symboly: new Set(['CENA_BEZ_DPH', 'SOD_CENA_NABIDKY', 'SOD_PRIPLATKY_OBJEDNANE', 'SOD_PRIPLATKY_KC']) };
const v3 = { symboly: new Set(['CENA_BEZ_DPH', 'DPH_KC', 'CENA_S_DPH']) };

function zakazka() {
  const zak = novaZakazka();
  zak.cislo = '2026 - OPR - CN - 0957'; zak.objednatel = 'SVJ Zkušební D5'; zak.autor = 'obchodnik@priklad.cz';
  const v = zak.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2 });
  v.data.cenik.kurzEurKc = 25;
  zamkniVariantu(v, { typ: 'nabidka', kdo: 'test', cislo: variantaCislo(zak, v), vysledek: zamekVysledekSpocti(v, JEKLY, 'test') });
  return zak;
}
const zak = zakazka();
const v = zak.varianty[0];
const nab = O.objNabidnute(v, JEKLY);
const K = (stara, nova, rel) => O.objKontrola(stara, nova, rel, { jekly: JEKLY, ted: TED });
const sObj = (z, klice) => { const n = kopie(z); n.objednane = { varianta: v.id, klice, datum: '2026-10-20' }; return n; };
const jedno = nab.find(p => !PLECHY.includes(p.key)).key;

/* ---------------- K6-K3: přechodové plechy jednou položkou ---------------- */
test('K6-K3 příprava: nabídka nabízí materiál i montáž přechodových plechů', PLECHY.every(k => nab.some(p => p.key === k)), nab.map(p => p.key));
const pol = O.objPolozky(nab);
const plechy = pol.find(p => p.klice.length === 2);
test('K6-K3: karta má jednu položku „Přechodové plechy" s oběma klíči a součtem cen',
  !!plechy && plechy.nazev === 'Přechodové plechy' && plechy.klice.join() === PLECHY.join()
  && plechy.sMarzi === nab.filter(p => PLECHY.includes(p.key)).reduce((a, p) => a + p.sMarzi, 0)
  && pol.length === nab.length - 1 && !pol.some(p => p.key === 'prechMont'), plechy);
test('K6-K3: je-li v nabídce jen jedna půlka, zůstane sama s původním názvem',
  O.objPolozky(nab.filter(p => p.key !== 'prechMont')).some(p => p.key === 'prechMat' && p.klice.length === 1
    && p.nazev === nab.find(x => x.key === 'prechMat').nazev));
test('K6-K3: objednat jen materiál nebo jen montáž → 400 „jen celé"',
  ['prechMat', 'prechMont'].every(k => { const r = K(zak, sObj(zak, [k]), OBCH); return r && r.status === 400 && /celé/.test(r.chyba); }),
  K(zak, sObj(zak, ['prechMat']), OBCH));
test('K6-K3: celá dvojice (i s dalším příplatkem) projde', K(zak, sObj(zak, PLECHY.concat([jedno])), OBCH) === null);
{
  const n = sObj(zak, PLECHY.slice());
  const nabidka = nabidkaData(n, n.varianty[0], JEKLY, 'cz');
  const vNab = nabidka.priplatky.find(p => p.nazev === 'Přechodové plechy');
  const s = sodData(n, n.varianty[0], JEKLY, 'cz', v4).placeholders;
  test('K6-K3: SoD má jeden řádek „Přechodové plechy – cena" a cena = řádek nabídky (Kč)',
    !!vNab && s.SOD_PRIPLATKY_OBJEDNANE === 'Přechodové plechy – ' + vNab.cena && s.SOD_PRIPLATKY_KC === vNab.cena,
    { sod: s.SOD_PRIPLATKY_OBJEDNANE, nab: vNab });
  const nabE = nabidkaData(n, n.varianty[0], JEKLY, 'en');
  const vNabE = nabE.priplatky.find(p => p.nazev === tr('Přechodové plechy', 'en'));
  const sE = sodData(n, n.varianty[0], JEKLY, 'en', v4).placeholders;
  test('K6-K3: v eurech zaokrouhlený součet dvojice = řádek nabídky (ne o 1 € víc)',
    !!vNabE && sE.SOD_PRIPLATKY_KC === vNabE.cena && sE.SOD_PRIPLATKY_OBJEDNANE.split('\n').length === 1
    && cislo(sE.CENA_BEZ_DPH) === cislo(sE.SOD_CENA_NABIDKY) + cislo(vNabE.cena), { sod: sE.SOD_PRIPLATKY_OBJEDNANE, nab: vNabE });
  test('K6-K3: text krycího listu nese jednu položku', O.objText(n, n.varianty[0], JEKLY) === '1 – Přechodové plechy (20. 10. 2026)',
    O.objText(n, n.varianty[0], JEKLY));
}

/* ---------------- K6-K2: šablona bez rozpisu objednaných ---------------- */
{
  const n = sObj(zak, [jedno]);
  const u3 = sodData(n, n.varianty[0], JEKLY, 'cz', v3).upozorneni || [];
  test('K6-K2: šablona bez SOD_PRIPLATKY_OBJEDNANE + objednané → upozornění', u3.includes(SOD_OBJ_BEZ_ROZPISU)
    && /jen celková cena/.test(SOD_OBJ_BEZ_ROZPISU), u3);
  test('K6-K2: šablona v4 s rozpisem → bez upozornění', !(sodData(n, n.varianty[0], JEKLY, 'cz', v4).upozorneni || []).length);
  test('K6-K2: bez objednaných příplatků → bez upozornění', !(sodData(zak, v, JEKLY, 'cz', v3).upozorneni || []).length);
  test('K6-K2: náhled bez informace o šabloně → bez upozornění', !(sodData(n, n.varianty[0], JEKLY, 'cz').upozorneni || []).length);
}

/* ---------------- K6-K4: záznam tisku SoD ---------------- */
{
  const n = sObj(zak, [jedno]);
  const vn = n.varianty[0];
  const s1 = sodData(n, vn, JEKLY, 'cz', v4).placeholders;
  const sn = O.objSodSnimek(n, vn, JEKLY, 'cz');
  test('K6-K4: snímek = otisk objednaných a cena díla SoD (Kč)', sn.objOtisk === O.objOtisk(n.objednane)
    && sn.klice.join() === jedno && sn.mena === 'CZK' && formatKc2(sn.bezDph) === s1.CENA_BEZ_DPH
    && sn.bezDphKc === sn.bezDph && formatKc2(sn.nabidka) === s1.SOD_CENA_NABIDKY, { sn, s1: s1.CENA_BEZ_DPH });
  const snE = O.objSodSnimek(n, vn, JEKLY, 'en');
  const sE = sodData(n, vn, JEKLY, 'en', v4).placeholders;
  test('K6-K4: snímek v eurech = cena díla eurové SoD, Kč zůstávají pro controlling', snE.mena === 'EUR'
    && cislo(sE.CENA_BEZ_DPH) === snE.bezDph && snE.bezDphKc === sn.bezDphKc, { snE, e: sE.CENA_BEZ_DPH });
  /* tisk SoD do zámku (jako zamekPoTisku) */
  zamkniVariantu(vn, { typ: 'sod', kdo: 'test', sod: sn });
  test('K6-K4: záznam tisku SoD nese snímek', O.objSodZaznam(vn) && O.objSodZaznam(vn).objOtisk === sn.objOtisk);
  test('K6-K4: beze změny objednaných nic „po SoD" nehlásí', O.objZmenenoPoSod(n, vn) === null);
  /* administrátor po tisku změní objednané */
  const jine = nab.filter(p => !PLECHY.includes(p.key))[1].key;
  const zm = kopie(n); zm.objednane.klice = [jedno, jine];
  const s2 = sodData(zm, zm.varianty[0], JEKLY, 'cz', v4).placeholders;
  test('K6-K4: dotisk SoD nese cenu díla a objednané ze záznamu tisku', s2.CENA_BEZ_DPH === s1.CENA_BEZ_DPH
    && s2.SOD_PRIPLATKY_OBJEDNANE === s1.SOD_PRIPLATKY_OBJEDNANE, [s2.CENA_BEZ_DPH, s1.CENA_BEZ_DPH]);
  const s2e = sodData(zm, zm.varianty[0], JEKLY, 'en', v4).placeholders;
  test('K6-K4: dotisk v jiném jazyce přepočte objednané ze záznamu (ne nové)', s2e.SOD_PRIPLATKY_OBJEDNANE.split('\n').length === 1
    && s2e.CENA_BEZ_DPH === sE.CENA_BEZ_DPH, [s2e.CENA_BEZ_DPH, sE.CENA_BEZ_DPH]);
  test('K6-K4: změna po tisku SoD se pozná', !!O.objZmenenoPoSod(zm, zm.varianty[0]));
  /* záznam s podvrženou cenou: dotisk v téže měně bere číslo ze záznamu */
  const pv = kopie(zm); O.objSodZaznam(pv.varianty[0]).bezDph = 1;
  test('K6-K4: cena díla dotisku je číslo ze záznamu (ne nový výpočet)',
    sodData(pv, pv.varianty[0], JEKLY, 'cz', v4).placeholders.CENA_BEZ_DPH === formatKc2(1));
  /* server přepočítá snímek NOVĚ připsaného tisku, starý nechá */
  const st = kopie(zm);
  const nov = kopie(zm); zamkniVariantu(nov.varianty[0], { typ: 'sod', kdo: 'test', sod: { objOtisk: 'podvrh', klice: [jine], bezDph: 1, bezDphKc: 1, mena: 'EUR' } });
  const pocet = O.objSodZaznamyServer(st, nov, JEKLY);
  const t = nov.varianty[0].zamek.tisky;
  test('K6-K4 server: nový tisk SoD dostane snímek z předchozího záznamu, cenu v měně tisku',
    pocet === 1 && t[t.length - 1].sod.objOtisk === sn.objOtisk && t[t.length - 1].sod.klice.join() === jedno
    && t[t.length - 1].sod.mena === 'EUR' && t[t.length - 1].sod.bezDph === snE.bezDph && t[t.length - 2].sod.bezDph === sn.bezDph,
    t.map(x => x.sod));
  const prvni = kopie(n); prvni.varianty[0] = kopie(v); prvni.varianty[0].zamek = null; delete prvni.objednane;
  const prvniNovy = kopie(prvni); zamkniVariantu(prvniNovy.varianty[0], { typ: 'sod', kdo: 'x', sod: { bezDph: 1, klice: ['podvrh'] } });
  O.objSodZaznamyServer(prvni, prvniNovy, JEKLY);
  test('K6-K4 server: SoD jako první zámek — snímek ze záznamu zakázky, ne od klienta',
    O.objSodZaznam(prvniNovy.varianty[0]).bezDph !== 1 && O.objSodZaznam(prvniNovy.varianty[0]).klice.join() === '',
    O.objSodZaznam(prvniNovy.varianty[0]));
  /* historie změn po tisku SoD */
  const h0 = kopie(zm); O.objZmenyServer(n, h0, ADM, '2026-10-21T11:00:00Z');
  test('K6-K4 server: změna po tisku SoD se zapíše (kdo/kdy z relace)', Array.isArray(h0.objednaneZmeny) && h0.objednaneZmeny.length === 1
    && h0.objednaneZmeny[0].kdo === ADM.email && h0.objednaneZmeny[0].kdy === '2026-10-21T11:00:00Z'
    && h0.objednaneZmeny[0].klice.join() === [jedno, jine].join(), h0.objednaneZmeny);
  const h1 = kopie(h0); h1.objednaneZmeny = [{ kdo: 'podvrh' }];
  O.objZmenyServer(h0, h1, ADM);
  test('K6-K4 server: historii klient nepřepíše (beze změny = uložená)', JSON.stringify(h1.objednaneZmeny) === JSON.stringify(h0.objednaneZmeny));
  const pred = sObj(zak, [jedno]), predZm = sObj(zak, [jedno, jine]);
  O.objZmenyServer(pred, predZm, OBCH);
  test('K6-K4 server: změna před tiskem SoD historii nezakládá', !('objednaneZmeny' in predZm));
  test('K6-K4: očista historie z obnovy nechá jen povolená pole', JSON.stringify(O.objZmenyOciste([{ kdo: 'a', kdy: 'b', cizi: 1, klice: ['k', 2] }, 'x']))
    === JSON.stringify([{ varianta: '', klice: ['k'], datum: '', kdo: 'a', kdy: 'b' }]));
  /* export pro controlling: cena díla ze záznamu tisku SoD */
  const ex = C.ctrlExportVarianty(h0, h0.varianty[0], { jekly: JEKLY });
  test('K6-K4 export: cena díla z posledního záznamu tisku SoD (Kč) a změna po tisku',
    ex.ok && ex.hlavicka.cenaDilaSod === sn.bezDphKc && /^ano \(spravce@priklad\.cz, 2026-10-21\)$/.test(ex.hlavicka.objZmenenoPoSod), ex.hlavicka);
  const popis = C.ctrlExportListy(ex, C.ctrlPlatne ? null : null).find(l => l.nazev === 'Popis').rows;
  test('K6-K4 export: list Popis nese cenu díla dle SoD', popis.some(r => r[0] === 'Cena díla dle SoD (Kč bez DPH)' && r[1] === Math.round(sn.bezDphKc * 100) / 100)
    && popis.some(r => r[0] === 'Objednané změněny po tisku SoD'));
  const bezSod = C.ctrlExportVarianty(zak, v, { jekly: JEKLY });
  test('K6-K4 export: bez tisku SoD cena díla prázdná', bezSod.ok && bezSod.hlavicka.cenaDilaSod === null && bezSod.hlavicka.objZmenenoPoSod === '');
}

/* ---------------- K6-K5 + K6-K9: karta objednaných (ui/sod_ui.js) ---------------- */
{
  const ctx = {
    ZAK: null, JEKLY, render: () => {}, hlaska: () => {}, set: (cesta, hod) => { ctx.ZAK.objednane = hod || undefined; if (!hod) delete ctx.ZAK.objednane; ctx.zapsano++; },
    zapsano: 0, potvrzeni: [], odpoved: false, potvrd: async (t) => { ctx.potvrzeni.push(t); return ctx.odpoved; },
    esc: s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'),
    escJs: s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"),
    fmt0: formatKc0, jeAdmin: () => false, aktivniVarianta: z => z.varianty.find(x => x.id === ctx.aktivni) || z.varianty[0],
    ONLINE_STAV: { ja: { email: 'obchodnik@priklad.cz' } }, jazykTisku: 'cz', tiskJazyk: () => ctx.jazykTisku, aktivni: null,
    document: { querySelectorAll: () => [] },
  };
  Object.keys(global).forEach(k => { if (!(k in ctx)) ctx[k] = global[k]; });
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(__dirname + '/ui/sod_ui.js', 'utf8'), ctx, { filename: 'ui/sod_ui.js' });
  const z = kopie(zak);
  const v2 = kopie(z.varianty[0]); v2.id = 'v-d5-2'; v2.pripona = 1; z.varianty.push(v2);
  ctx.ZAK = z; ctx.aktivni = v2.id;
  z.objednane = { varianta: z.varianty[0].id, klice: [jedno], datum: '2026-10-20' };
  (async () => {
    ctx.odpoved = false;
    await ctx.objUiPrepni(jedno, true);
    test('K6-K5: přepnutí na jinou zamčenou variantu se zeptá „Objednané příplatky varianty X budou nahrazeny"',
      ctx.potvrzeni.length === 1 && ctx.potvrzeni[0].startsWith('Objednané příplatky varianty ' + variantaCislo(z, z.varianty[0]) + ' budou nahrazeny'),
      ctx.potvrzeni);
    test('K6-K5: bez potvrzení se nic nezmění', ctx.zapsano === 0 && z.objednane.varianta === z.varianty[0].id);
    ctx.odpoved = true;
    await ctx.objUiPrepni(jedno, true);
    test('K6-K5: s potvrzením se záznam přepíše na tuto variantu', ctx.zapsano === 1 && z.objednane.varianta === v2.id
      && z.objednane.klice.join() === jedno, z.objednane);
    await ctx.objUiPrepni(PLECHY, true);
    test('K6-K5: v téže variantě už se neptá; dvojice plechů se zaškrtne celá', ctx.potvrzeni.length === 2 && ctx.zapsano === 2
      && PLECHY.every(k => z.objednane.klice.includes(k)), z.objednane);
    const html = ctx.objKarta();
    test('K6-K3 karta: jedna položka „Přechodové plechy" s oběma klíči v onchange', (html.match(/Přechodové plechy/g) || []).length === 1
      && html.includes("objUiPrepni(['prechMat','prechMont'], this.checked)"));
    test('K6-K9: česká SoD — ceny v kartě v Kč', /Kč bez DPH/.test(html) && !/€/.test(html.replace(/€ —/g, '')));
    ctx.jazykTisku = 'en';
    const htmlE = ctx.objKarta();
    const p1 = O.objPolozky(nab).find(p => p.key === jedno);
    test('K6-K9: cizojazyčná SoD — ceny v kartě v € (celá eura nahoru, jako SoD)', htmlE.includes(menaDokumentu('en', 25).fmt(Math.ceil(p1.sMarzi / 25)) + ' bez DPH')
      && !/[0-9] Kč bez DPH/.test(htmlE), htmlE.slice(0, 300));
    const bezKurzu = kopie(z); bezKurzu.varianty[1].data.cenik.kurzEurKc = 0; bezKurzu.varianty[1].zamek.vysledek.kurzEurKc = 0;
    ctx.ZAK = bezKurzu;
    test('K6-K9: bez kurzu EUR karta cenu nevymyslí', /chybí kurz EUR/.test(ctx.objKarta()));
    ctx.ZAK = z; ctx.jazykTisku = 'cz';
    test('K6-K2: věta upozornění SoD jde do stavu (sodUpozorneniText)', ctx.sodUpozorneniText({ data: { upozorneni: [SOD_OBJ_BEZ_ROZPISU, SOD_OBJ_BEZ_ROZPISU] } }) === SOD_OBJ_BEZ_ROZPISU
      && ctx.sodUpozorneniText({ data: {} }) === '');
    console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
    process.exit(fail ? 1 : 0);
  })().catch(e => { console.log('FAIL výjimka ' + e.stack); process.exit(1); });
}
