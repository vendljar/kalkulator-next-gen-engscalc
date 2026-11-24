/* NOVÁ KALKULACE — ER (rozhodnutí J. V. 24. 11. 2026), příznak `kalkVerze: 2`.
 *
 * Jen nová kalkulace (ZADANI_NOVA):
 *   #757 ENGINEERING je příplatková položka (C.engineeringKc × 1), ve výchozím
 *        stavu MIMO nabídku; v Režii není;
 *   #758 REZERVA příplatky v cenách jednotlivých příplatků (nabídka, krycí
 *        list, SoD, Pipedrive je tisknou), controlling bez dvojího započtení;
 *   #761 VÝSTUP ZE ZAMĚŘENÍ vždy 1 ×, STATICKÉ POSOUZENÍ OPLÁŠTĚNÍ jen podle
 *        opláštění (přepínače zrušeny).
 * Stará data příznak nemají a počítají postaru — cena beze změny.
 * Pro všechny: automat ATYP ručně přepsaná pole nepřepíše (#758 B).
 *
 * Zlatá čísla starého výpočtu jsou spočtená jádrem integrace c89e872 (před
 * ER) nad zkušebním ceníkem — smyšlená čísla, žádná ostrá cena.
 *
 * Pojistka proti prázdnému testu: proti c89e872 sada padá (chybí kalkNova
 * a příplatek `engineering`, nová zakázka příznak nenese, matice engineering
 * do nabídky pustí, server příznak nehlídá, slovník nezná „ENGINEERING",
 * automat ATYP ruční rezervu přepíše).
 *
 * Spuštění: node src/test_er_nova_kalkulace.js */
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); };
nacti('./format.js'); nacti('./cenik.js'); nacti('./cenik_stari.js'); nacti('./cenik_rady.js');
nacti('./engine.js'); nacti('./engine_proj.js'); nacti('./techspec.js'); nacti('./zamek.js');
nacti('./poznamky.js'); nacti('./zakazka.js'); nacti('./zobrazeni.js'); nacti('./sleva.js');
nacti('./schvalovani.js'); nacti('./kontroly.js'); nacti('./vyjimky.js'); nacti('./program.js');
nacti('./uloziste.js'); nacti('./rucni_ceny.js'); nacti('./vice_sachet.js');
nacti('./controlling.js'); nacti('./kryci.js'); nacti('./objednane.js');
const VJ = require('./vyjimky.js'); global.vyjimkyObsah = VJ.vyjimkyObsah;
const U = require('./uloziste.js');
const P = require('./preklad.js');
const ZC = require('./zkusebni_cenik.js');
const JEKLY = require('./jekly.json');
global.JEKLY = JEKLY;
global.DEFAULT_CENIK = ZC.zkusebniCenik();

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};
const kopie = x => JSON.parse(JSON.stringify(x));
const ROZMERY = { sirka: 1.6, hloubka: 2, zdvih: 12, prejezd: 3.3, prohluben: 1.2, nastupiste: 5 };
const stare = (navic) => Object.assign(kopie(DEFAULT_ZADANI), ROZMERY, { engineeringKs: 1 }, navic || {});
const nove = (navic) => stare(Object.assign({ kalkVerze: 2 }, navic || {}));
const V = (z, fixes, c) => vypocet(z, c || ZC.zkusebniCenik(), JEKLY, fixes !== false);
const eng = r => r.priplatky.filter(p => p.key === 'engineering');
const rez = (r, n) => r.sekce.rezie.filter(x => (x.origNazev || x.nazev) === n);
const ENG = 'ENGINEERING', VYS = 'VÝSTUP ZE ZAMĚŘENÍ PRO ZÁKAZNÍKA', OPL = 'STATICKÉ POSOUZENÍ OPLÁŠTĚNÍ';

console.log('===== 0. pojistky =====');
test('jádro má kalkNova', typeof kalkNova === 'function');
if (typeof kalkNova !== 'function') { console.log(`\n${ok} OK, ${fail} FAIL`); process.exit(1); }
test('C.engineeringKc a C.vystupZamereniKc > 0 ve zkušebním ceníku',
  ZC.zkusebniCenik().engineeringKc > 0 && ZC.zkusebniCenik().vystupZamereniKc > 0);
test('DEFAULT_ZADANI příznak NENESE (fixtury a fuzz zůstávají na staré cestě)', !('kalkVerze' in DEFAULT_ZADANI));
test('kalkNova jen pro celé číslo ≥ 2', kalkNova({ kalkVerze: 2 }) && kalkNova({ kalkVerze: 3 })
  && !kalkNova({ kalkVerze: '2' }) && !kalkNova({ kalkVerze: true }) && !kalkNova({ kalkVerze: 1 }) && !kalkNova({}) && !kalkNova(null));

console.log('===== 1. stará kalkulace beze změny =====');
{
  const r2 = V(stare(), true), r1 = V(stare(), false);
  test('Model 2: ENGINEERING v Režii (1 × 10 000), žádný příplatek', rez(r2, ENG).length === 1 && rez(r2, ENG)[0].naklad === 10000 && !eng(r2).length);
  test('Model 2: zlatá čísla c89e872 (základ 1 204 000, příplatky 362 000)',
    r2.souhrn.zakladCena === 1204000 && r2.souhrn.priplatkyCena === 362000, r2.souhrn);
  test('Model 1: zlatá čísla c89e872 (základ 1 200 000, příplatky 362 000)',
    r1.souhrn.zakladCena === 1200000 && r1.souhrn.priplatkyCena === 362000, r1.souhrn);
  test('výstup ze zaměření bez přepínače = 0,5 ×', rez(r2, VYS)[0].mnozstvi === 0.5);
  const r0 = V(stare({ engineeringKs: 0 }));
  test('stará s „Ne": engineering v Režii ani v příplatcích', !rez(r0, ENG).length && !eng(r0).length);
  ['2', true, 1].forEach(h => {
    const rt = V(stare({ kalkVerze: h }));
    test('příznak ' + JSON.stringify(h) + ' = stará cesta', rez(rt, ENG).length === 1 && !eng(rt).length && rez(rt, VYS)[0].mnozstvi === 0.5);
  });
  const o2 = V(stare({ rezervaPriplatkyPct: 0.1 }), true), o1 = V(stare({ rezervaPriplatkyPct: 0.1 }), false);
  test('stará: rezerva příplatků jen v součtu (zlatá c89e872: 398 000 / 406 000)',
    o2.souhrn.priplatkyCena === 398000 && o1.souhrn.priplatkyCena === 406000, [o2.souhrn.priplatkyCena, o1.souhrn.priplatkyCena]);
  test('stará: položky bez rezervy a bez polí rezerva*', o2.priplatky.every(p => !('rezervaNaklad' in p) && !('rezervaSMarzi' in p))
    && o2.priplatky.reduce((a, p) => a + p.sMarzi, 0) === 362000);
}

console.log('===== 2. #757 engineering jako příplatek =====');
{
  const r = V(nove());
  test('Režie bez ENGINEERING i při engineeringKs = 1', !rez(r, ENG).length);
  const p = eng(r)[0] || {};
  test('příplatek engineering: 1 × C.engineeringKc, cesta C.engineeringKc',
    eng(r).length === 1 && p.mnozstvi === 1 && p.naklad === 10000 && p.cenaPath === 'C.engineeringKc' && p.nazev === ENG, p);
  test('příplatek s marží = 10 000 × (1 + m)', Math.abs(p.sMarzi - 10000 * (1 + ZC.zkusebniCenik().marze)) < 1e-6, p.sMarzi);
  test('nová: základ 1 198 000 (bez engineeringu, výstup 1 ×), příplatky 374 000',
    r.souhrn.zakladCena === 1198000 && r.souhrn.priplatkyCena === 374000, r.souhrn);
  const r0 = V(nove({ engineeringKs: 0 }));
  test('příplatek nezávisí na engineeringKs', eng(r0).length === 1 && eng(r0)[0].mnozstvi === 1);
}

console.log('===== 3. #758 rezerva příplatků v položkách =====');
for (const fixes of [true, false]) {
  const M = fixes ? 'Model 2' : 'Model 1';
  const m = ZC.zkusebniCenik().marze;
  const r = V(nove({ rezervaPriplatkyPct: 0.1 }), fixes);
  const bez = V(nove(), fixes);
  const ven = r.priplatky.find(p => p.key === 'ventilator'), ven0 = bez.priplatky.find(p => p.key === 'ventilator');
  const zaklad = fixes ? ven0.naklad : ven0.naklad * (1 + m);
  test(M + ': ventilátor nese rezervu (' + (fixes ? 'z nákladu' : 'z ceny') + ')',
    ven && Math.abs(ven.rezervaNaklad - zaklad * 0.1) < 1e-6 && Math.abs(ven.rezervaSMarzi - zaklad * 0.1 * (1 + m)) < 1e-6, ven);
  test(M + ': cena položky = CEIL(náklad × (1+m) + rezerva × (1+m), 1000)',
    ven.sMarzi === Math.ceil((ven.naklad * (1 + m) + ven.rezervaNaklad * (1 + m)) / 1000) * 1000 && ven.sMarzi > ven0.sMarzi, [ven.sMarzi, ven0.sMarzi]);
  test(M + ': náklad položky beze změny (rezerva zvlášť)', ven.naklad === ven0.naklad);
  test(M + ': součet „pokud vše" = součet položek (rezerva se nepřičítá podruhé)',
    r.souhrn.priplatkyCena === Math.ceil(r.priplatky.reduce((a, p) => a + p.sMarzi, 0) / 1000) * 1000, r.souhrn.priplatkyCena);
  test(M + ': bez rezervy položky pole rezerva* nemají', bez.priplatky.every(p => !('rezervaNaklad' in p)));
}
{
  const r = V(nove({ rezervaPriplatkyPct: 0.1 }));
  const rad = ctrlRozvrhOck(r, { fixes: true, rezervaPriplatkyPct: 0.1, marze: ZC.zkusebniCenik().marze });
  const pr = rad.filter(x => x.sekce === 'priplatky');
  const rz = pr.filter(x => x.klic === 'R.rezervaPriplatky');
  const sumProdej = pr.reduce((a, x) => a + x.prodej, 0);
  test('controlling: jeden řádek REZERVA PŘÍPLATKY z rezerv položek', rz.length === 1
    && Math.abs(rz[0].naklad - r.priplatky.reduce((a, p) => a + p.rezervaNaklad, 0)) < 1e-6, rz);
  test('controlling: prodej příplatků celkem = součet cen položek (bez dvojího započtení)',
    Math.abs(sumProdej - r.priplatky.reduce((a, p) => a + p.sMarzi, 0)) < 1e-6, sumProdej);
  const r1 = V(nove({ rezervaPriplatkyPct: 0.1 }), false);
  const rz1 = ctrlRozvrhOck(r1, { fixes: false, rezervaPriplatkyPct: 0.1, marze: ZC.zkusebniCenik().marze }).filter(x => x.klic === 'R.rezervaPriplatky');
  test('controlling Model 1: rezerva z položek (ne z procenta zaokrouhlených cen)', rz1.length === 1
    && Math.abs(rz1[0].naklad - r1.priplatky.reduce((a, p) => a + p.rezervaNaklad, 0)) < 1e-6
    && Math.abs(rz1[0].prodej - r1.priplatky.reduce((a, p) => a + p.rezervaSMarzi, 0)) < 1e-6, rz1);
  const so = ctrlRozvrhOck(V(stare({ rezervaPriplatkyPct: 0.1 })), { fixes: true, rezervaPriplatkyPct: 0.1, marze: 0.2 });
  const soR = so.filter(x => x.klic === 'R.rezervaPriplatky');
  test('controlling staré kalkulace: rezerva jako dosud (z procenta)', soR.length === 1 && Math.abs(soR[0].naklad - V(stare()).priplatky.reduce((a, p) => a + p.naklad, 0) * 0.1) < 1e-6, soR);
}

console.log('===== 4. #761 výstup ze zaměření a statika opláštění =====');
{
  const c = Object.assign(ZC.zkusebniCenik(), { statikaOplHod: 6, statikaKc: 1000 });
  const r = V(nove({ vystupZamereni: false }), true, c);
  test('nová: VÝSTUP ZE ZAMĚŘENÍ 1 × i při uloženém „Ne"', rez(r, VYS)[0].mnozstvi === 1 && rez(r, VYS)[0].naklad === ZC.zkusebniCenik().vystupZamereniKc);
  test('stará: přepínač dál platí (Ano 1 ×)', rez(V(stare({ vystupZamereni: true }), true, c), VYS)[0].mnozstvi === 1);
  const sOpl = V(nove({ statikaOpl: false }), true, c);
  test('nová s opláštěním: statika i při uloženém „Ne"', sOpl.oplasteni.plochaCelkem > 0 && rez(sOpl, OPL).length === 1);
  const BEZ = { odM: 0, pasy: [{ typ: 'bez', doM: null }] };
  const bezOpl = { oplasteni: { rezim: 'poStenach', steny: { A: kopie(BEZ), B: kopie(BEZ), C: kopie(BEZ), D: kopie(BEZ) } },
    nadDvermi: 'stavba', bokyDveri: 'stavba', svetlikNadDvermi: false, svetlikyBoky: 0 };
  const sBez = V(nove(Object.assign({ statikaOpl: true }, bezOpl)), true, c);
  test('nová bez opláštění: statika ani při uloženém „Ano"', sBez.oplasteni.plochaCelkem === 0 && !rez(sBez, OPL).length);
  test('stará: přepínač statiky dál platí (Ne = řádek není)', !rez(V(stare({ statikaOpl: false }), true, c), OPL).length);
  const src = require('fs').readFileSync(__dirname + '/techspec.js', 'utf8');
  test('specifikace: výstup ze zaměření „ano" i u nové kalkulace bez přepínače',
    /prefill: \(r, Z\) => \(Z\.vystupZamereni \|\| \(Number\.isInteger\(Z\.kalkVerze\) && Z\.kalkVerze >= 2\)\) \? 'ano' : 'ne'/.test(src));
}

console.log('===== 5. nová zakázka a matice Výchozí =====');
{
  const zad = novaZakazka().varianty[0].data.ock.zadani;
  test('nová zakázka nese kalkVerze 2', zad.kalkVerze === 2, zad.kalkVerze);
  test('engineering ve výchozím stavu MIMO nabídku', Array.isArray(zad.priplatkyVynechat) && zad.priplatkyVynechat.includes('engineering'), zad.priplatkyVynechat);
  test('skla zůstávají mimo nabídku', zad.priplatkyVynechat.includes('vsgFolie') && zad.priplatkyVynechat.includes('skn'));
  const z2 = novaZakazka(); z2.varianty[0].data.ock.zadani.priplatkyVynechat.push('x');
  test('seznam vynechaných se mezi zakázkami nesdílí', !novaZakazka().varianty[0].data.ock.zadani.priplatkyVynechat.includes('x')
    && !(ZADANI_NOVA.priplatkyVynechat || []).includes('x'));
  const cerstve = () => novaZakazka().varianty[0].data.ock.zadani;
  let z = cerstve(); zobrazeniVychoziAplikuj({}, z, null);
  test('prázdná matice: engineering zůstane mimo', z.priplatkyVynechat.includes('engineering'), z.priplatkyVynechat);
  z = cerstve(); zobrazeniVychoziAplikuj({ vychozi: { 'ock.priplatek:vsgFolie': false, 'ock.priplatek:skn': false } }, z, null);
  test('matice s jinými klíči: engineering zůstane mimo', z.priplatkyVynechat.includes('engineering'), z.priplatkyVynechat);
  z = cerstve(); zobrazeniVychoziAplikuj({ vychozi: { 'ock.priplatek:engineering': true } }, z, null);
  test('výslovné true v matici: engineering jde do nabídky', !z.priplatkyVynechat.includes('engineering'), z.priplatkyVynechat);
  const st = stare({ priplatkyVynechat: [] }); zobrazeniVychoziAplikuj({}, st, null);
  test('zadání bez příznaku: matice engineering nevyřadí', !st.priplatkyVynechat.includes('engineering'));
  test('kódový základ sloupce Výchozí: engineering false, ostatní true',
    zobrazeniPriplatekZaklad('engineering') === false && zobrazeniPriplatekZaklad('vsgFolie') === true);
  const mat = {}; zobrazeniPolozkaVychoziNastav(mat, 'ock.priplatek:engineering', true, zobrazeniPriplatekZaklad('engineering'));
  test('zaškrtnutí ve sloupci Výchozí se uloží', mat.vychozi && mat.vychozi['ock.priplatek:engineering'] === true, mat);
  test('nedotčená nová zakázka je pro matici „nedotčená"', zobrazeniVychoziNedotcene(cerstve(), null, novaVariantaData().ock.zadani, null) === true);
}

console.log('===== 6. stará data se nepřevádějí =====');
{
  const z = novaZakazka(); const zad = z.varianty[0].data.ock.zadani;
  delete zad.kalkVerze; zad.engineeringKs = 1;
  test('duplikát staré zakázky příznak nedostane', zakazkaDuplikuj(kopie(z), 'X-1').varianty[0].data.ock.zadani.kalkVerze === undefined);
  test('import staré zakázky příznak nedoplní', importZakazka(kopie(z)).varianty[0].data.ock.zadani.kalkVerze === undefined);
  test('import nové zakázky příznak zachová', importZakazka(kopie(novaZakazka())).varianty[0].data.ock.zadani.kalkVerze === 2);
}

console.log('===== 7. víc šachet: engineering JEDNOU za variantu (J. V. 24. 11.) =====');
{
  const z1 = nove({ rezervaPriplatkyPct: 0.1 });
  const ock = { zadani: z1, fixes: true, ks: 3, dalsi: [{ id: 's2', ks: 2, zadani: kopie(z1) }] };
  const r = vypocetZakazkyOck(ock, ZC.zkusebniCenik(), JEKLY);
  test('víc šachet: rozpoznáno (3 + 2 ks)', Array.isArray(r.sachty) && r.sachty.length === 2 && r.sachty[0].ks === 3 && r.sachty[1].ks === 2,
    r.sachty && r.sachty.map(s => s.ks));
  const e = eng(r), e1 = eng(r.sachty[0].vysl)[0];
  test('engineering 1 × (ne 5 ×): množství 1, náklad 10 000', e.length === 1 && e[0].mnozstvi === 1 && e[0].naklad === 10000, e);
  test('cena sloučeného řádku = cena jedné šachty (i s rezervou)', e.length === 1 && e[0].sMarzi === e1.sMarzi
    && Math.abs(e[0].rezervaNaklad - e1.rezervaNaklad) < 1e-6, [e[0] && e[0].sMarzi, e1.sMarzi]);
  const ven = r.priplatky.find(p => p.key === 'ventilator') || r.priplatky.find(p => p.key !== 'engineering');
  const ven1 = r.sachty[0].vysl.priplatky.find(p => p.key === ven.key);
  test('ostatní příplatky dál × ks (5 ×)', Math.abs(ven.naklad - 5 * ven1.naklad) < 1e-6, [ven.key, ven.naklad, ven1.naklad]);
  test('rezerva ostatních příplatků sečtena × ks (controlling víc šachet)', ven1.rezervaNaklad > 0 && Math.abs(ven.rezervaNaklad - 5 * ven1.rezervaNaklad) < 1e-6, [ven.rezervaNaklad, ven1.rezervaNaklad]);
  const soucet = r.priplatky.reduce((a, p) => a + p.sMarzi, 0);
  test('„Příplatky celkem" = součet sloučených řádků (engineering jednou)', r.souhrn.priplatkyCena === Math.ceil(soucet / 1000) * 1000,
    [r.souhrn.priplatkyCena, soucet]);
  /* objednané příplatky zamčené varianty (SoD, krycí list po prodeji) */
  const zak = novaZakazka(); const v = zak.varianty[0];
  v.data.ock = kopie(ock); v.data.ock.zadani.priplatkyVynechat = []; v.data.ock.dalsi[0].zadani.priplatkyVynechat = [];
  v.data.cenik = ZC.zkusebniCenik(); v.zamek = { zamceno: true, typ: 'nabidka', kdy: '2026-11-24T10:00:00.000Z' };
  const ob = objNabidnute(v, JEKLY);
  const oe = ob.filter(p => p.key === 'engineering'), ov = ob.find(p => p.key === ven.key);
  test('objednané příplatky: engineering jednou', oe.length === 1 && oe[0].naklad === 10000 && oe[0].sMarzi === e1.sMarzi, oe);
  test('objednané příplatky: ostatní × ks', ov && Math.abs(ov.naklad - 5 * ven1.naklad) < 1e-6, ov);
}

console.log('===== 7b. různé šachty: součet a objednané berou tutéž šachtu (revize ER N1) =====');
{
  const m = ZC.zkusebniCenik().marze;
  const pripad = (jm, s1, s2, cekej) => {
    const z1 = nove(Object.assign({ priplatkyVynechat: [] }, s1)), z2 = nove(Object.assign({ priplatkyVynechat: [] }, s2));
    const ock = { zadani: z1, fixes: true, ks: 2, dalsi: [{ id: 's2', ks: 3, zadani: z2 }] };
    const r = vypocetZakazkyOck(kopie(ock), ZC.zkusebniCenik(), JEKLY);
    const e = eng(r)[0] || {};
    const zak = novaZakazka(); const v = zak.varianty[0];
    v.data.ock = kopie(ock); v.data.cenik = ZC.zkusebniCenik(); v.zamek = { zamceno: true, typ: 'nabidka', kdy: '2026-11-24T10:00:00.000Z' };
    const ob = objNabidnute(v, JEKLY).filter(x => x.key === 'engineering');
    const obS = ob.length ? ob[0].sMarzi : null;
    test(jm + ': součet = ' + cekej, e.sMarzi === cekej, e.sMarzi);
    test(jm + ': objednané = součet', obS === null ? cekej === 0 || !ob.length : obS === e.sMarzi, [obS, e.sMarzi]);
    const sumRadku = r.priplatky.reduce((a, x) => a + x.sMarzi, 0);
    test(jm + ': „Příplatky celkem" = součet řádků', r.souhrn.priplatkyCena === Math.ceil(sumRadku / 1000) * 1000);
  };
  const ceil = x => Math.ceil(x / 1000) * 1000;
  pripad('š1 mimo nabídku (rezerva 0 %), š2 v nabídce (rezerva 30 %)',
    { priplatkyVynechat: ['engineering'], rezervaPriplatkyPct: 0 }, { rezervaPriplatkyPct: 0.3 }, ceil(10000 * 1.3 * (1 + m)));
  pripad('š1 v nabídce s množstvím přepsaným na 0, š2 automaticky',
    { mnozstviPrepis: { ENGINEERING: 0 } }, {}, 0);
  pripad('š1 mimo nabídku, š2 přepis množství 3',
    { priplatkyVynechat: ['engineering'] }, { mnozstviPrepis: { ENGINEERING: 3 } }, ceil(30000 * (1 + m)));
  pripad('obě mimo nabídku → první šachta (kalkulace), objednané nic',
    { priplatkyVynechat: ['engineering'], rezervaPriplatkyPct: 0.3 }, { priplatkyVynechat: ['engineering'] }, ceil(10000 * 1.3 * (1 + m)));
  const v = vsPriplatekJednou([{ priplatky: [{ key: 'engineering', sMarzi: 1 }] }, { priplatky: [{ key: 'engineering', sMarzi: 2 }] }],
    [{ priplatkyVynechat: ['engineering'] }, {}], 'engineering');
  test('vsPriplatekJednou: první šachta v nabídce', v && v.i === 1 && v.vNabidce === true);
}

console.log('===== 8. server: tvar příznaku =====');
{
  const s1 = f => { const z = novaZakazka(); f(z.varianty[0].data.ock.zadani); return U.uloTypyProblemy(z); };
  test('2 / chybí projde', !s1(z => { z.kalkVerze = 2; }).length && !s1(z => { delete z.kalkVerze; }).length);
  test('jiná hodnota (1, "2", true) = chyba tvaru',
    [1, '2', true].every(h => s1(z => { z.kalkVerze = h; }).some(p => /kalkVerze/.test(p.kde) && p.duvod === 'typ')));
}

console.log('===== 8b. server: příznak uložené kalkulace se nemění (revize ER N3) =====');
{
  const ulozena = novaZakazka(); Object.assign(ulozena.varianty[0].data.ock.zadani, ROZMERY);
  ulozena.varianty[0].data.ock.dalsi = [{ id: 's2', zadani: kopie(ulozena.varianty[0].data.ock.zadani) }];
  const stara = kopie(ulozena);
  const zmena = (f) => { const z = kopie(stara); f(z.varianty[0].data.ock); return U.uloTypyProblemy(z, stara); };
  const jeKv = (p) => p.some(x => x.duvod === 'kalkVerze');
  test('beze změny projde', !jeKv(zmena(() => {})));
  test('ubrat příznak u uložené varianty = odmítnuto', jeKv(zmena(o => { delete o.zadani.kalkVerze; })));
  test('ubrat příznak u uložené šachty 2 = odmítnuto', jeKv(zmena(o => { delete o.dalsi[0].zadani.kalkVerze; })));
  const st2 = kopie(stara); delete st2.varianty[0].data.ock.zadani.kalkVerze; delete st2.varianty[0].data.ock.dalsi[0].zadani.kalkVerze;
  const pridat = kopie(st2); pridat.varianty[0].data.ock.zadani.kalkVerze = 2;
  test('přidat příznak staré kalkulaci = odmítnuto', jeKv(U.uloTypyProblemy(pridat, st2)));
  test('obnova ze zálohy smí', !jeKv(U.uloTypyProblemy(pridat, st2, { obnova: true })));
  const pd = kopie(st2); pd.pdCerstva = true;
  test('první uložení čerstvé kalkulace z Pipedrive smí', !jeKv(U.uloTypyProblemy(pridat, pd)));
  test('nová varianta / zakázka (bez uložené) projde', !jeKv(U.uloTypyProblemy(pridat, null)));
  const zam = kopie(st2); zam.varianty[0].zamek = { zamceno: true };
  test('zamčená uložená varianta se neposuzuje', !jeKv(U.uloTypyProblemy(pridat, zam)));
  test('věta pro obchodníka', /změnu pravidel výpočtu uložené kalkulace/.test(U.uloIdProblemyText(U.uloTypyProblemy(pridat, st2))));
}

console.log('===== 9. překlad a UI =====');
['en', 'de', 'fr'].forEach(l => {
  const t = P.tr(ENG, l);
  test('ENGINEERING má překlad ' + l.toUpperCase() + ' (odlišný od IČ)', t && t !== ENG && !/\(IČ\)/.test(t), t);
});
{
  const src = require('fs').readFileSync(__dirname + '/ui/kalk_ock.js', 'utf8');
  test('pole Engineering, Výstup ze zaměření a statika jen u staré kalkulace',
    /\(kalkNova\(Z\)[\s\S]{0,200}: inp\('Z\.engineeringKs'[\s\S]{0,120}inp\('Z\.vystupZamereni'[\s\S]{0,120}statikaOplRadek\(rAkt\)\)/.test(src));
  test('sloupec Výchozí u příplatku čte kódový základ', /vychoziPolozkaChk\(ZOBRAZENI_PRIPLATEK \+ x\.key,\s*\n?\s*\(typeof zobrazeniPriplatekZaklad/.test(src));
  test('přepínač ATYP předá automat do atypHodnoty', /atypHodnoty\(Z, vData, zap, predloha, \{ automat: !!\(opts && opts\.automat\) \}\)/.test(src));
}

console.log('===== 10. #758 B: automat ATYP ruční pole nepřepíše =====');
{
  const data = { zadaniRucni: {} };
  const Z = { rezervaZakladPct: 0, rezervaPriplatkyPct: 0 };
  const predloha = { rezervaZakladPct: 0.3, rezervaPriplatkyPct: 0.3, rezervaProfilyPct: 0.3, rezervaPlechyPct: 0.3, zamecnikAtypKc: 50000, montazAtypHod: 5, projekceAtypHod: 3 };
  Z.rezervaZakladPct = 0.1; zadaniRucniZnac(data, 'rezervaZakladPct');
  atypHodnoty(Z, data, true, predloha, { automat: true });
  test('automat: ručně zadaná rezerva základ zůstane 10 %', Z.rezervaZakladPct === 0.1, Z.rezervaZakladPct);
  test('automat: ostatní pole dostanou předlohu', Z.rezervaPriplatkyPct === 0.3 && Z.zamecnikAtypKc === 50000);
  const Z2 = { rezervaZakladPct: 0.1 };
  atypHodnoty(Z2, data, true, predloha);
  test('ruční klik na ATYP: předloha i do ručně přepsaného pole (16. 9.)', Z2.rezervaZakladPct === 0.3, Z2.rezervaZakladPct);
  atypHodnoty(Z, data, false, null);
  test('automat a pak vypnutí: ruční hodnota drží', Z.rezervaZakladPct === 0.1);
}

console.log('===== 11. krycí list a controlling (#757) =====');
{
  const rad = ctrlRozvrhOck(V(nove()), { fixes: true });
  const e = rad.filter(x => x.pKey === 'engineering');
  test('controlling: engineering mezi příplatky (mimo základ), cesta C.engineeringKc',
    e.length === 1 && e[0].sekce === 'priplatky' && e[0].vZakladu === false && e[0].cenaPath === 'C.engineeringKc' && e[0].naklad === 10000, e);
  test('controlling: v Režii engineering není', !rad.some(x => x.sekce === 'rezie' && /ENGINEERING/.test(x.nazev)));
  test('controlling staré kalkulace: engineering v Režii',
    ctrlRozvrhOck(V(stare()), { fixes: true }).some(x => x.sekce === 'rezie' && x.nazev === ENG && x.vZakladu === true));
  const zak = novaZakazka(); const v = zak.varianty[0];
  Object.assign(v.data.ock.zadani, ROZMERY); v.data.cenik = ZC.zkusebniCenik();
  test('krycí list: engineering mimo nabídku se nevypíše', !/ENGINEERING/.test(kryciCtx(zak, v, JEKLY).priplatky || ''));
  v.data.ock.zadani.priplatkyVynechat = v.data.ock.zadani.priplatkyVynechat.filter(k => k !== 'engineering');
  test('krycí list: zaškrtnutý engineering ve výčtu příplatků', /ENGINEERING/.test(kryciCtx(zak, v, JEKLY).priplatky || ''));
}

console.log('===== 12. cesty dat (revize Fable N2, N3) =====');
{
  nacti('./firma.js'); nacti('./preklad.js'); nacti('./nabidka.js');
  const zak = novaZakazka(); zak.cislo = '2026-OPR-CN-9757';
  const v = zak.varianty[0]; Object.assign(v.data.ock.zadani, ROZMERY); v.data.cenik = Object.assign(ZC.zkusebniCenik(), { kurzEurKc: 25 });
  const kl = klonujVariantu(zak, v.id);
  test('klon nové varianty příznak i výběr nese', kl && kl.data.ock.zadani.kalkVerze === 2 && kl.data.ock.zadani.priplatkyVynechat.includes('engineering'));
  test('duplikát nové zakázky příznak nese', zakazkaDuplikuj(kopie(zak), 'X-2').varianty[0].data.ock.zadani.kalkVerze === 2);
  const pd = kopie(zak); pd.pdCerstva = true; delete pd.varianty[0].data.ock.zadani.kalkVerze;
  pdCerstvaPriprav(pd, { vychozi: (zo, zp) => zobrazeniVychoziAplikuj({}, zo, zp) });
  test('čerstvá kalkulace z Pipedrive (pdCerstvaPriprav) = nová kalkulace, engineering mimo nabídku',
    pd.varianty[0].data.ock.zadani.kalkVerze === 2 && pd.varianty[0].data.ock.zadani.priplatkyVynechat.includes('engineering'));
  /* zámek: výsledek nové kalkulace se znovu spočte stejně (otisk sedí) */
  v.data.ock.zadani.priplatkyVynechat = v.data.ock.zadani.priplatkyVynechat.filter(k => k !== 'engineering');
  v.data.ock.zadani.rezervaPriplatkyPct = 0.1;
  const z1 = zamekVysledekSpocti(v, JEKLY, 't'), z2 = zamekVysledekSpocti(kopie(v), JEKLY, 't');
  test('zámek nové kalkulace: výsledek se spočte znovu shodně', z1 && zamekVysledekRozdily(z1, z2, 5, { prisne: true }).pocet === 0 && eng(z1.ock).length === 1);
  /* tisk nabídky CZ/EN/DE/FR */
  const cz = nabidkaData(zak, v, JEKLY, 'cz').priplatky.filter(x => /ENGINEERING/.test(x.nazev));
  test('nabídka CZ: ENGINEERING s cenou včetně rezervy', cz.length === 1 && /^14\s000/.test(cz[0].cena), cz);
  ['en', 'de', 'fr'].forEach(L => {
    const t = nabidkaData(zak, v, JEKLY, L).priplatky.map(x => x.nazev);
    test('nabídka ' + L.toUpperCase() + ': příplatek přeložený', t.includes(P.tr(ENG, L)) && !t.includes(ENG), t.filter(x => /ENG|ING/.test(x)));
  });
  v.data.ock.zadani.priplatkyVynechat.push('engineering');
  test('nabídka: engineering mimo nabídku se netiskne', !nabidkaData(zak, v, JEKLY, 'cz').priplatky.some(x => /ENGINEERING/.test(x.nazev)));
  const s2 = kopie(zak); s2.varianty[0].data.ock.dalsi = [{ id: 's2', zadani: Object.assign(kopie(v.data.ock.zadani), { kalkVerze: 'ano' }) }];
  test('server: neplatný příznak u šachty 2 = chyba tvaru (N3)', U.uloTypyProblemy(s2).some(p => /dalsi\.0\.zadani\.kalkVerze/.test(p.kde)));
  s2.varianty[0].data.ock.dalsi[0].zadani.kalkVerze = 2;
  test('server: platný příznak u šachty 2 projde', !U.uloTypyProblemy(s2).some(p => /kalkVerze/.test(p.kde)));
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
