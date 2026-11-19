/* D8 — TERMÍNY KRYCÍHO LISTU PROJ ZE LHŮT V TÝDNECH (dotaz obchodu D8,
 * rozhodnutí J. V. 19. 11. 2026).
 *
 * Hlídá:
 *   1. tabulka lhůt (Firma): výchozí hodnoty z textu nabídky, kontrola tvaru,
 *      zveřejnění s firmou (firmaLzeZverejnit / firmaKZverejneni / shoda);
 *   2. text termínů v nabídce PROJ (online i Word, CZ/EN/DE/FR) bere čísla
 *      z tabulky; s výchozí tabulkou je přesně dnešní text; vlastní znění
 *      zůstane pevné a kontrola ho ohlásí;
 *   3. odeslaná nabídka drží lhůty z doby odeslání (snímek), stará bez
 *      snímku lhůt výchozí čísla;
 *   4. dopočet termínů: řetěz jen přes nabízené činnosti, horní mez rozpětí,
 *      úřady měsíc = 4,3 týdne, ruční datum má přednost a řetěz jde od něj,
 *      do prodeje nic, zdroj u každého data;
 *   5. Prodáno zamrazí lhůty do varianty; změna tabulky prodanou zakázku
 *      nemění; termíny prodané varianty zůstávají editovatelné (do SoD),
 *      ostatní krycí list zamčený; snímek lhůt jde zapsat jen do prodeje.
 * Pojistka: nad integrací 042fcbc sada padá (lhuty_proj.js neexistuje).
 * Smyšlené údaje, zkušební ceník.
 *
 * Spuštění: cd src && node test_d8_lhuty.js */
const fs = require('fs');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 600)); } };

test('src/lhuty_proj.js existuje', fs.existsSync(__dirname + '/lhuty_proj.js'));
if (fail) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }

const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
const PR = nacti('./preklad.js');
nacti('./docxgen.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const EP = nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
const LH = nacti('./lhuty_proj.js');
const FM = nacti('./firma.js');
nacti('./plan_plateb.js');
const PD = nacti('./podminky.js');
const NP = nacti('./nabidka_proj.js');
const zk = nacti('./zakazka.js');
const ZM = nacti('./zamek.js');
const KP = nacti('./kryci_proj.js');
const OB = nacti('./objednane.js');
global.NAST = { firma: global.firmaDefault() };
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));
const tr = (t, L) => L === 'cz' ? t : PR.tr(t, L);
const kop = x => JSON.parse(JSON.stringify(x));
const VYCH = LH.lhutyProjVychozi();
const JINE = (() => { const t = kop(VYCH); t.radky.zamereni = { do: 3 }; t.radky.vystupy = { od: 5, do: 7 };
  t.radky.studie = { od: 8, do: 9 }; t.radky.dpz = { od: 11, do: 14 }; t.radky.stanoviska = { do: 5 };
  t.radky.povoleni = { do: 3 }; t.radky.pravniMoc = { do: 2 }; t.radky.dps = { do: 7.5 }; t.platnostOd = '2026-12-01'; return t; })();

/* ---------- 1) tabulka ---------- */
test('1: výchozí lhůty z textu nabídky (4 / 4–6 / 10–12 / 10–12 / 4 t / 2+1 m / 6)',
  JSON.stringify(VYCH.radky) === JSON.stringify({ zamereni: { do: 4 }, vystupy: { od: 4, do: 6 }, studie: { od: 10, do: 12 },
    dpz: { od: 10, do: 12 }, stanoviska: { do: 4 }, povoleni: { do: 2 }, pravniMoc: { do: 1 }, dps: { do: 6 } }), VYCH);
test('1: měsíc úřadu = 4,3 týdne', LH.LHUTY_PROJ_TYDNU_MESIC === 4.3);
test('1: chybějící tabulka nemá vady a platí výchozí', LH.lhutyProjVady(undefined).length === 0
  && JSON.stringify(LH.lhutyProjEf(undefined)) === JSON.stringify(VYCH));
test('1: platná upravená tabulka bez vad', LH.lhutyProjVady(JINE).length === 0, LH.lhutyProjVady(JINE));
[['neznámá lhůta', { radky: { xx: { do: 1 } } }], ['dolní > horní', { radky: { studie: { od: 13, do: 12 } } }],
 ['nulová horní', { radky: { dps: { do: 0 } } }], ['text', { radky: { dps: { do: 'šest' } } }],
 ['neplatné datum', { platnostOd: '2026-13-40' }], ['cizí klíč', { radky: {}, skript: 1 }],
 ['nad strop', { radky: { povoleni: { do: 61 } } }], ['pole', []]].forEach(([n, x]) =>
  test('1: vada — ' + n, LH.lhutyProjVady(x).length > 0 && JSON.stringify(LH.lhutyProjEf(x)) === JSON.stringify(VYCH)));
test('1: text „12,5" z formuláře projde jako 12.5', LH.lhutyProjVady({ radky: { dps: { do: '12,5' } } }).length === 0
  && LH.lhutyProjEf({ radky: { dps: { do: '12,5' } } }).radky.dps.do === 12.5);
{
  const f = Object.assign(global.firmaDefault(), { nazev: 'Firma s.r.o.', ico: '12345678', sidloUlice: 'Ulice 1', sidloPsc: '11000',
    sidloMesto: 'Praha', telefon: '+420 000 000 000' });
  delete f.ukazkove;
  test('1: firma s platnými lhůtami jde zveřejnit', FM.firmaLzeZverejnit(Object.assign({}, f, { lhutyProj: JINE })).ok,
    FM.firmaLzeZverejnit(Object.assign({}, f, { lhutyProj: JINE })));
  test('1: firma s vadnými lhůtami nejde zveřejnit (s důvodem)', /Lhůty PROJ/.test(FM.firmaLzeZverejnit(Object.assign({}, f,
    { lhutyProj: { radky: { dps: { do: -1 } } } })).duvod || ''));
  const zv = FM.firmaKZverejneni(Object.assign({}, f, { lhutyProj: Object.assign(kop(JINE), { navic: 1 }) }));
  test('1: zveřejnění nese lhůty (vadné ne)', !zv.lhutyProj);
  const zv2 = FM.firmaKZverejneni(Object.assign({}, f, { lhutyProj: JINE }));
  test('1: zveřejnění nese čistou kopii lhůt', JSON.stringify(zv2.lhutyProj) === JSON.stringify(LH.lhutyProjCisty(JINE)), zv2.lhutyProj);
  test('1: změna lhůt je rozdíl proti online kopii', FM.firmaShodaSOnline(Object.assign({}, f, { lhutyProj: JINE }), f).rozdily.indexOf('Lhůty PROJ') >= 0);
}

/* ---------- 2) text termínů ---------- */
LH.LHUTY_PROJ_TEXTY.forEach((t, i) => {
  const cz = LH.lhutyProjDosad(t.cz, VYCH, 'cz');
  if (!t.stare) test('2: výchozí znění #' + i + ' = PODMINKY_VYCHOZI (' + t.sekce + ')',
    PD.PODMINKY_VYCHOZI.nabidkaProj.terminy.cz.some(r => r[1] === cz && r[2] === t.sekce), cz);
  ['en', 'de', 'fr'].forEach(L => test('2: překlad slovníku #' + i + ' ' + L + ' = výchozí znění se symboly',
    PR.tr(cz, L) === LH.lhutyProjDosad(t[L], VYCH, L), [PR.tr(cz, L), LH.lhutyProjDosad(t[L], VYCH, L)]));
});
const zakazka = (sekce) => {
  const z = zk.novaZakazka();
  z.cislo = '2026 - OPR - OVP - 8008'; z.nazevAkce = 'TEST D8';
  const v = z.varianty[0];
  v.data.proj.cenik = ZC.zkusebniCenikProj(); v.data.proj.cenik.kurzEurKc = 25;
  v.data.proj.zadani.sekce.forEach(s => s.polozky.forEach(p => { p.vyrazeno = sekce.indexOf(s.key) < 0; }));
  return { z, v };
};
const terminy = (d, L) => {
  const b = d.bloky.find(x => x.typ === 'pary' && x.nadpis === tr('TERMÍNY', L));
  return b ? b.radky.map(r => r[1]) : [];
};
const VSE = ['zamereni', 'studie', 'dpz', 'ic', 'dps'];
const firmaS = lhuty => Object.assign(global.firmaDefault(), lhuty ? { lhutyProj: lhuty } : {});
{
  global.NAST = { firma: firmaS(null) };
  const { z, v } = zakazka(VSE);
  const zaklad = {};
  ['cz', 'en', 'de', 'fr'].forEach(L => { zaklad[L] = NP.nabidkaProjData(z, v, L); });
  test('2: výchozí tabulka = dnešní text (online cz)', terminy(zaklad.cz, 'cz').indexOf('ZAMĚŘENÍ na stavbě do 4 týdnů od objednání a předání plné moci; zpracování VÝSTUPŮ do 4–6 týdnů od zaměření') >= 0
    && terminy(zaklad.cz, 'cz').indexOf('do 10–12 týdnů od předání podkladů') >= 0, terminy(zaklad.cz, 'cz'));
  global.NAST = { firma: firmaS(JINE) };
  ['cz', 'en', 'de', 'fr'].forEach(L => {
    const d = NP.nabidkaProjData(z, v, L);
    const t = terminy(d, L).join(' | ');
    const w = d.placeholders.PROJ_TERMINY_TERMIN;
    const r = L === 'fr' ? ' à ' : '–';
    const des = L === 'en' ? '7.5' : '7,5';
    test(L + ' 2: online termíny z tabulky (3 / 5' + r + '7 / 8' + r + '9 / 11' + r + '14 / 5 / 3+2 / ' + des + ')',
      t.indexOf(' 3 ') >= 0 && t.indexOf('5' + r + '7') >= 0 && t.indexOf('8' + r + '9') >= 0 && t.indexOf('11' + r + '14') >= 0
      && t.indexOf(des) >= 0 && t.indexOf('4' + r + '6') < 0 && t.indexOf('10' + r + '12') < 0, t);
    test(L + ' 2: Word {{PROJ_TERMINY_TERMIN}} totéž co online', w === terminy(d, L).join('\n'), [w, terminy(d, L)]);
    test(L + ' 2: Word {{PROJ_TERMINY}} nese nová čísla', d.placeholders.PROJ_TERMINY.indexOf('8' + r + '9') >= 0);
    test(L + ' 2: ostatní text beze změny (počet řádků a znění mimo čísla)', terminy(d, L).length === terminy(zaklad[L], L).length
      && terminy(d, L).map(x => x.replace(/\d+([.,]\d+)?/g, '#').replace(/# à #|#–#/g, '#'))
        .join('|') === terminy(zaklad[L], L).map(x => x.replace(/\d+([.,]\d+)?/g, '#').replace(/# à #|#–#/g, '#')).join('|'));
    test(L + ' 2: cena se nemění', d.souhrn.bezDph === zaklad[L].souhrn.bezDph);
  });
  /* DPZ bez studie: horní mez */
  const b = zakazka(['zamereni', 'dpz']);
  test('2: DPZ bez studie — horní mez „do 14 týdnů od předání podkladů"',
    terminy(NP.nabidkaProjData(b.z, b.v, 'cz'), 'cz').indexOf('do 14 týdnů od předání podkladů') >= 0, terminy(NP.nabidkaProjData(b.z, b.v, 'cz'), 'cz'));
  /* vlastní znění zůstane pevné a kontrola ho ohlásí */
  const vlastni = PD.PODMINKY_VYCHOZI.nabidkaProj.terminy.cz.map(r => r.slice());
  vlastni.forEach(r => { if (r[2] === 'dps') r[1] = 'do 9 týdnů od povolení (vlastní znění)'; });
  global.NAST = { firma: Object.assign(firmaS(JINE), { podminky: { nabidkaProj: { terminy: { cz: vlastni } } } }) };
  const dv = NP.nabidkaProjData(z, v, 'cz');
  test('2: vlastní znění termínu zůstane pevné', terminy(dv, 'cz').indexOf('do 9 týdnů od povolení (vlastní znění)') >= 0
    && terminy(dv, 'cz').indexOf('do 8–9 týdnů od předání podkladů') >= 0, terminy(dv, 'cz'));
  const pevne = LH.lhutyProjPevneRadky(PD.podminkyTextProj(PD.podminkyEf(global.NAST.firma), 'terminy', 'cz', x => x), 'cz');
  test('2: kontrola ohlásí jen pevný řádek DPS', pevne.length === 1 && /DPS/.test(pevne[0].cinnost), pevne);
  test('2: výchozí znění kontrola nehlásí (všechny jazyky)', ['cz', 'en', 'de', 'fr'].every(L =>
    LH.lhutyProjPevneRadky(PD.podminkyTextProj(PD.podminkyEf(firmaS(null)), 'terminy', L, x => tr(x, L)), L).length === 0));
}

/* ---------- 3) odeslaná nabídka ---------- */
const zamkni = (v) => {
  ZM.zamkniVariantu(v, { typ: 'nabidkaProjTisk', kdy: '2026-11-19T10:00:00.000Z', cislo: 'x',
    vysledek: ZM.zamekVysledekSpocti(v, JEKLY, 'test') });
};
{
  global.NAST = { firma: firmaS(JINE) };
  const { z, v } = zakazka(VSE);
  KP.kryciProjZmrazPodminky(z, v);
  zamkni(v);
  test('3: snímek podmínek nese lhůty', JSON.stringify(v.data.kryciProj.zmrazenoPodminky.lhutyProj.radky) === JSON.stringify(JINE.radky));
  global.NAST = { firma: firmaS(null) };
  test('3: odeslaná nabídka drží lhůty z doby odeslání (změna Firmy ji nemění)',
    terminy(NP.nabidkaProjData(z, v, 'cz'), 'cz').indexOf('do 8–9 týdnů od předání podkladů') >= 0, terminy(NP.nabidkaProjData(z, v, 'cz'), 'cz'));
  delete v.data.kryciProj.zmrazenoPodminky.lhutyProj;   // odeslaná před D8
  global.NAST = { firma: firmaS(JINE) };
  test('3: snímek bez lhůt (před D8) tiskne výchozí čísla', terminy(NP.nabidkaProjData(z, v, 'cz'), 'cz').indexOf('do 10–12 týdnů od předání podkladů') >= 0);
  delete v.data.kryciProj.zmrazenoPodminky;            // odeslaná před v20.10.2
  test('3: zamčená bez snímku tiskne výchozí čísla', terminy(NP.nabidkaProjData(z, v, 'cz'), 'cz').indexOf('do 10–12 týdnů od předání podkladů') >= 0);
}

/* ---------- 4) dopočet ---------- */
{
  const vse = () => true;
  const r = LH.lhutyProjDopocet({ podpis: '2026-11-19', lhuty: VYCH, nabizi: vse, rucne: {} });
  const dat = o => LH.LHUTY_PROJ_POLE.map(p => o[p].datum).join(',');
  test('4: plný řetěz (podpis → +10 t → +12 → +12 → +16,9 → +6)',
    dat(r) === '2026-11-19,2027-01-28,2027-04-22,2027-07-15,2027-11-11,2027-12-23', dat(r));
  test('4: zdroj „výstupy ze zaměření + 12 týdnů" u studie', r.terminStudie.zdroj === 'výstupy ze zaměření + 12 týdnů', r.terminStudie);
  test('4: zdroj zaměření „podpis + 10 týdnů (zaměření 4 + výstupy 6)"', r.terminZamereni.zdroj === 'podpis + 10 týdnů (zaměření 4 + výstupy 6)', r.terminZamereni);
  test('4: úřady 4 t + 3 měsíce × 4,3 = 16,9 týdne', /^DPZ \+ 16,9 týdne/.test(r.terminPovoleni.zdroj), r.terminPovoleni);
  const bezStudie = LH.lhutyProjDopocet({ podpis: '2026-11-19', lhuty: VYCH, nabizi: k => k !== 'studie', rucne: {} });
  test('4: bez studie — studie se nepočítá, DPZ od výstupů ze zaměření', bezStudie.terminStudie.datum === ''
    && bezStudie.terminDpz.datum === '2027-04-22' && /^výstupy ze zaměření/.test(bezStudie.terminDpz.zdroj), bezStudie);
  const jenDps = LH.lhutyProjDopocet({ podpis: '2026-11-19', lhuty: VYCH, nabizi: k => k === 'dps', rucne: {} });
  test('4: jen DPS — od podpisu + 6 týdnů', jenDps.terminDps.datum === '2026-12-31' && jenDps.terminZamereni.datum === '', jenDps);
  const bezIc = LH.lhutyProjDopocet({ podpis: '2026-11-19', lhuty: VYCH, nabizi: k => k !== 'ic', rucne: {} });
  test('4: DPZ i DPS bez IČ — DPS se nedopočte (povolení nezajišťujeme)', bezIc.terminDps.datum === '' && /povolení/.test(bezIc.terminDps.zdroj), bezIc.terminDps);
  const bezIcRucne = LH.lhutyProjDopocet({ podpis: '2026-11-19', lhuty: VYCH, nabizi: k => k !== 'ic', rucne: { terminPovoleni: '2028-01-03' } });
  test('4: … s ručním předpokladem povolení se DPS dopočte od něj', bezIcRucne.terminDps.datum === '2028-02-14', bezIcRucne.terminDps);
  const rucne = LH.lhutyProjDopocet({ podpis: '2026-11-19', lhuty: VYCH, nabizi: vse, rucne: { terminStudie: '2027-06-01' } });
  test('4: ruční datum studie — řetěz pokračuje od něj (DPZ = 1. 6. + 12 t)', rucne.terminDpz.datum === '2027-08-24' && rucne.terminZamereni.datum === '2027-01-28', rucne);
  const horni = LH.lhutyProjDopocet({ podpis: '2026-11-19', lhuty: JINE, nabizi: k => k === 'studie', rucne: {} });
  test('4: u rozpětí horní mez (studie 8–9 → 9 týdnů)', horni.terminStudie.datum === '2027-01-21', horni.terminStudie);
  const nic = LH.lhutyProjDopocet({ podpis: '', lhuty: VYCH, nabizi: vse, rucne: {} });
  test('4: do prodeje se nedopočítává nic', LH.LHUTY_PROJ_POLE.every(p => nic[p].datum === '') && /Prodáno/.test(nic.terminZamereni.zdroj));
  const stara = LH.lhutyProjDopocet({ podpis: '2026-11-19', lhuty: null, nabizi: vse, rucne: {} });
  test('4: prodáno bez snímku lhůt (před D8) — nic se nedopočítá', LH.LHUTY_PROJ_POLE.every(p => stara[p].datum === ''));
}

/* ---------- 5) Prodáno, krycí list, zámek ---------- */
{
  global.NAST = { firma: firmaS(JINE) };
  const { z, v } = zakazka(['zamereni', 'studie', 'dpz', 'ic', 'dps']);
  KP.kryciProjZmrazPodminky(z, v);
  zamkni(v);
  const hodnota = (id) => {
    const c = KP.kryciProjCtx(z, v);
    const p = KP.KRYCI_PROJ_SEKCE.reduce((a, s) => a || s.pole.find(x => x.id === id), null);
    return { v: KP.kryciProjHodnota(p, v.data.kryciProj, c), src: typeof p.src === 'function' ? p.src(c) : p.src };
  };
  test('5: před prodejem termín prázdný, zdroj říká proč', hodnota('terminZamereni').v === '' && /Prodáno/.test(hodnota('terminZamereni').src), hodnota('terminZamereni'));
  const stary = kop(v);
  const chyba = OB.prodNastav(z, v, '2026-11-19', { kdo: 'obchodnik@priklad.cz', ted: '2026-11-19T12:00:00Z', kdy: '2026-11-19T12:00:00Z' });
  test('5: Prodáno projde', chyba === '', chyba);
  test('5: Prodáno zamrazí lhůty Firmy do varianty', JSON.stringify(v.data.kryciProj.lhutyProj.radky) === JSON.stringify(JINE.radky), v.data.kryciProj.lhutyProj);
  test('5: po prodeji se termíny dopočítají (zaměření = podpis + 3 + 7 týdnů)', hodnota('terminZamereni').v === '2027-01-28'
    && hodnota('terminZahajeni').v === '2026-11-19', [hodnota('terminZahajeni'), hodnota('terminZamereni')]);
  test('5: u data je vidět, z čeho vzniklo', /^podpis \+ 10 týdnů/.test(hodnota('terminZamereni').src), hodnota('terminZamereni'));
  global.NAST = { firma: firmaS(null) };
  test('5: změna tabulky ve Firmě prodanou zakázku nemění', hodnota('terminZamereni').v === '2027-01-28');
  v.data.kryciProj.hodnoty.terminStudie = '2027-03-01';
  test('5: ruční datum zůstane a řetěz jde od něj (DPZ = 1. 3. + 14 t)', hodnota('terminStudie').v === '2027-03-01'
    && hodnota('terminDpz').v === '2027-06-07', [hodnota('terminStudie'), hodnota('terminDpz')]);
  delete v.data.kryciProj.hodnoty.terminStudie;   // ↺ = smazání ruční hodnoty
  test('5: vrácení k dopočtu (smazání ruční hodnoty)', hodnota('terminStudie').v === '2027-04-01', hodnota('terminStudie'));
  test('5: termíny prodané varianty editovatelné, ostatní pole zamčené',
    ZM.zamekKryciPoleStav(v, 'kryciProj', 'terminDps') === 'editovatelne' && ZM.zamekKryciPoleStav(v, 'kryciProj', 'terminZahajeni') === 'editovatelne'
    && ZM.zamekKryciPoleStav(v, 'kryciProj', 'terminJine') === 'zmrazeno' && ZM.zamekKryciPoleStav(v, 'kryciProj', 'pojisteni') === 'zmrazeno'
    && ZM.zamekKryciPoleStav(v, 'kryci', 'terminDps') === 'zmrazeno');
  /* server: snímek lhůt jen do prodeje, pak se nemění; ruční termín projde */
  const ulozena = kop(stary.data);
  const nova = kop(v.data);
  test('5: server — uložení prodeje se snímkem lhůt projde (uložená verze neprodaná)',
    ZM.zamekDataPorovnani(nova, stary) === ZM.zamekDataPorovnani(ulozena, stary));
  const zmena = kop(v.data); zmena.kryciProj.lhutyProj.radky.dps.do = 99;
  test('5: server — snímek lhůt prodané varianty se už nezmění', ZM.zamekDataPorovnani(zmena, v) !== ZM.zamekDataPorovnani(kop(v.data), v));
  const termin = kop(v.data); termin.kryciProj.hodnoty.terminDps = '2028-05-05';
  test('5: server — ruční termín prodané varianty projde', ZM.zamekDataPorovnani(termin, v) === ZM.zamekDataPorovnani(kop(v.data), v));
  const jine = kop(v.data); jine.kryciProj.hodnoty.terminJine = 'něco';
  test('5: server — jiné pole prodané varianty neprojde', ZM.zamekDataPorovnani(jine, v) !== ZM.zamekDataPorovnani(kop(v.data), v));
  v.zamek.tisky = (v.zamek.tisky || []).concat([{ typ: 'sodProj', kdy: '2026-11-20T10:00:00.000Z' }]);
  test('5: po tisku SoD jsou termíny zamčené jako zbytek krycího listu', ZM.zamekKryciPoleStav(v, 'kryciProj', 'terminDps') === 'zmrazeno');
}
{
  /* krycí list: jen nabízené činnosti (bez studie a IČ) */
  global.NAST = { firma: firmaS(null) };
  const { z, v } = zakazka(['zamereni', 'dpz', 'dps']);
  KP.kryciProjZmrazPodminky(z, v);
  zamkni(v);
  OB.prodNastav(z, v, '2026-11-19', { kdo: 'x', ted: '2026-11-19T12:00:00Z', kdy: '2026-11-19T12:00:00Z' });
  const c = KP.kryciProjCtx(z, v);
  const t = KP.kryciProjTerminy(c);
  test('5: krycí list — nenabízená studie a povolení bez data, DPZ od výstupů ze zaměření, DPS bez povolení nedopočtená',
    t.terminStudie.datum === '' && t.terminPovoleni.datum === '' && t.terminDpz.datum === '2027-04-22'
    && /^výstupy ze zaměření/.test(t.terminDpz.zdroj) && t.terminDps.datum === '', t);
}
{
  /* varianta bez strany PROJ: Prodáno nic nezakládá */
  const z = zk.novaZakazka(); const v = z.varianty[0];
  delete v.data.proj;
  test('5: varianta bez PROJ — snímek lhůt se nezakládá', LH.lhutyProjZmraz(v, firmaS(JINE)) === null && !(v.data.kryciProj && v.data.kryciProj.lhutyProj));
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
