/* Položky „jen pro zahraničí" (P4, nález N6, 21. 9. 2026).
 *
 * CO SE STALO: položka Překlady CZ→DE má příznak „jen zahraniční", ale
 * vadný ceník verze 27 měl u ní vyplněnou i ČR hodnotu. V tuzemské
 * kalkulaci se řádek správně NEUKÁZAL — jenže jeho cena přesto vstupovala
 * do základu PŘIRÁŽKY ZA ATYP, a přes ni ještě jednou do rezervy. Po
 * otevření zakázky a přepočtu „na ceník, který platí dnes" tak cena
 * vyskočila, aniž by přibyl jediný viditelný řádek.
 *
 * Příčina byla v pořadí: základ přirážky se počítal z celého pole `rezie`,
 * a to o pár řádků NAD filtrem, který skryté a vyřazené položky odstraňuje.
 * Rozdíl mezi tím, co je v kalkulaci vidět, a tím, z čeho se počítá, je ta
 * nejhůř dohledatelná chyba — proto se tu hlídá obojí.
 *
 * Co se tu hlídá:
 *   – tuzemská cena u takové položky nezmění výsledek, ani když je v ceníku,
 *     a to ANI se zaškrtnutým ATYP,
 *   – základ přirážky za ATYP odpovídá tomu, co je v sekci Režie vidět,
 *   – ručně vyřazený řádek přirážku taky nenafukuje,
 *   – skládání řady dá takové položce v ČR nulu (obě funkce),
 *   – přepočet při otevření zakázky nemá co hlásit a cenu nezmění,
 *   – v ZAHRANIČNÍ zakázce se položka počítá dál.
 *
 * Čísla jsou smyšlená — skutečné sazby do repozitáře nepatří.
 */
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); };
nacti('./format.js'); nacti('./cenik.js'); nacti('./cenik_stari.js'); nacti('./cenik_rady.js');
const eng = require('./engine.js');
Object.keys(eng).forEach(k => { global[k] = eng[k]; });
nacti('./engine_proj.js'); nacti('./techspec.js'); nacti('./zamek.js');
nacti('./poznamky.js'); nacti('./zakazka.js');
nacti('./program.js');   // zveřejnění se zkouší tou cestou, kterou opravdu chodí
const ZC = require('./zkusebni_cenik.js');
const JEKLY = JSON.parse(require('fs').readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const zad = (e) => Object.assign(JSON.parse(JSON.stringify(DEFAULT_ZADANI)), e || {});
/* Ceník jako vadná verze 27: u položky „jen zahraniční" je i ČR hodnota. */
const V27 = () => { const c = ZC.zkusebniCenik(); c.prekladyKc = 50000; return c; };
const ZAHR = () => ({ ceny: { 'C.prekladyKc': 60000 }, jenZahr: { 'C.prekladyKc': true } });

/* ---------- 1) tuzemská cena nesmí nic změnit ---------- */
{
  for (const atyp of [false, true]) {
    const sCenou = vypocet(zad({ atyp }), cenikSlozRadu(V27(), ZAHR(), 'cr'), JEKLY, false);
    const bezCeny = vypocet(zad({ atyp }), cenikSlozRadu(ZC.zkusebniCenik(), ZAHR(), 'cr'), JEKLY, false);
    test('ATYP=' + atyp + ': tuzemská cena u položky „jen zahraniční" nemění výsledek',
      sCenou.souhrn.zakladCena === bezCeny.souhrn.zakladCena,
      [sCenou.souhrn.zakladCena, bezCeny.souhrn.zakladCena]);
  }
  /* Kdyby řádek do kalkulace přece jen prolezl, test výš by to nechytil —
   * mohl by se vykompenzovat jinde. Hlídá se proto i jeho nepřítomnost. */
  const r = vypocet(zad({ atyp: true }), cenikSlozRadu(V27(), ZAHR(), 'cr'), JEKLY, false);
  test('a řádek PŘEKLADY v tuzemské kalkulaci vůbec není',
    !r.sekce.rezie.some(x => /PŘEKLADY/.test(x.nazev)),
    r.sekce.rezie.map(x => x.nazev));
}

/* ---------- 2) základ přirážky ATYP = co je v sekci vidět ---------- */
{
  const sazba = 0.25;
  const c = ZC.zkusebniCenik();
  c.atypPrirazka = sazba;
  c.prekladyKc = 50000;                       // vadná ČR hodnota
  const r = vypocet(zad({ atyp: true }), cenikSlozRadu(c, ZAHR(), 'cr'), JEKLY, false);
  const radek = r.sekce.rezie.find(x => /PŘIRÁŽKA ZA ATYP/.test(x.nazev));
  const ostatni = r.sekce.rezie.filter(x => !/PŘIRÁŽKA ZA ATYP/.test(x.nazev))
    .reduce((a, x) => a + x.naklad, 0);
  test('řádek přirážky za ATYP vznikl', !!radek);
  test('a jeho základ je přesně součet viditelných řádků režie',
    radek && Math.abs(radek.naklad - ostatni * sazba) < 0.01,
    radek && [radek.naklad, ostatni * sazba]);

  /* Ručně vyřazený řádek přirážku taky nenafukuje — táž past, jiný filtr. */
  const rv = vypocet(zad({ atyp: true, nepocitat: ['REŽIE KANCELÁŘE'] }),
    cenikSlozRadu(c, ZAHR(), 'cr'), JEKLY, false);
  const radekV = rv.sekce.rezie.find(x => /PŘIRÁŽKA ZA ATYP/.test(x.nazev));
  const ostatniV = rv.sekce.rezie.filter(x => !/PŘIRÁŽKA ZA ATYP/.test(x.nazev))
    .reduce((a, x) => a + x.naklad, 0);
  test('vyřazený řádek do základu přirážky nevstupuje',
    radekV && Math.abs(radekV.naklad - ostatniV * sazba) < 0.01,
    radekV && [radekV.naklad, ostatniV * sazba]);
  test('a vyřazení přirážku opravdu snížilo (test by jinak neměřil nic)',
    radekV && radek && radekV.naklad < radek.naklad,
    [radekV && radekV.naklad, radek && radek.naklad]);
}

/* ---------- 3) skládání řady dá v ČR nulu ---------- */
{
  const cr = cenikSlozRadu(V27(), ZAHR(), 'cr');
  test('cenikSlozRadu: tuzemská řada má u položky nulu', cr.prekladyKc === 0, cr.prekladyKc);
  const zahr = cenikSlozRadu(V27(), ZAHR(), 'zahr');
  test('cenikSlozRadu: zahraniční řada má zahraniční odchylku',
    zahr.prekladyKc === 60000, zahr.prekladyKc);

  const dnesCr = cenikDnesniProRadu({ cenik: V27(), proj: { cenik: {} } }, ZAHR(), 'cr');
  test('cenikDnesniProRadu: tuzemská řada má taky nulu',
    dnesCr.cenik.prekladyKc === 0, dnesCr.cenik.prekladyKc);
  const dnesZahr = cenikDnesniProRadu({ cenik: V27(), proj: { cenik: {} } }, ZAHR(), 'zahr');
  test('cenikDnesniProRadu: zahraniční řada má odchylku',
    dnesZahr.cenik.prekladyKc === 60000, dnesZahr.cenik.prekladyKc);

  /* Pevný seznam platí i bez značky — značku šlo v ceníku ztratit. */
  test('cenikJenZahrCesty vrací pevný seznam i bez zaškrtnuté značky',
    cenikJenZahrCesty({ ceny: {}, jenZahr: {} }).indexOf('C.prekladyKc') >= 0,
    cenikJenZahrCesty({ ceny: {}, jenZahr: {} }));

  /* ZMĚNA OČEKÁVÁNÍ 21. 9. 2026 (nezávislá revize téhož dne).
   *
   * Do té doby se tady čekala nula i u ceníku BEZ zahraniční odchylky. Jenže
   * zahraniční řada je řídká tabulka odchylek — co v ní není, DĚDÍ SE Z ČR
   * SLOUPCE. Bezpodmínečné nulování proto takové položce zničilo cenu i pro
   * zahraničí: ČR sloupec šel na nulu, zveřejnění ji zapsalo do platného
   * ceníku a každá další zahraniční varianta počítala s nulou. Tiše, a
   * v editoru se to nedalo ani opravit (ČR pole je zašedlé „neplatí v ČR").
   *
   * Nuluje se proto jen tam, kde zahraniční cena OPRAVDU JE. Únik do ceny
   * zavírá filtr v jádře (`jenPocitane(rezie)`), ne tohle — nulování má jen
   * srovnat obě strany porovnání, a to platí i tehdy, když se nenuluje. */
  const bezOdchylky = cenikSlozRadu(V27(), { ceny: {}, jenZahr: {} }, 'cr');
  test('bez zahraniční ceny se ČR hodnota NENULUJE (jinak by o ni přišlo i zahraničí)',
    bezOdchylky.prekladyKc === 50000, bezOdchylky.prekladyKc);
  const sOdchylkou = cenikSlozRadu(V27(), ZAHR(), 'cr');
  test('se zahraniční cenou se ČR hodnota nuluje dál',
    sOdchylkou.prekladyKc === 0, sOdchylkou.prekladyKc);

  /* Jádro nálezu: cena nesmí zmizet ani po zveřejnění z tuzemské varianty.
   *
   * PŮVODNĚ SE TU HODNOTA DOSAZOVALA RUČNĚ (`zverejneny.prekladyKc =
   * bezOdchylky.prekladyKc`) a test tím jen potvrzoval sám sebe — skutečné
   * zveřejnění jím neprocházelo (nález druhého kola revize 21. 9. 2026).
   * Jde se proto přes `programNovaVerze`, tedy tou cestou, kterou zveřejnění
   * opravdu chodí z aplikace, ze serveru i souborem.
   *
   * A měří se OBA případy, protože se liší:
   *   · bez odchylky se ČR hodnota vůbec nenuluje, takže projde,
   *   · S ODCHYLKOU varianta ČR nulu má — a právě tu nulu nesmí zveřejnění
   *     zapsat do platného ceníku, jinak zahraniční řada po zrušení odchylky
   *     zdědí nulu místo ceny. */
  {
    const vychozi = { cenik: V27(), cenikProj: {}, zahranicni: { ceny: {}, jenZahr: {} },
                      kdo: 'test', poznamka: 'v1' };
    let db = programNovy(vychozi);
    test('příprava: platný ceník tu cenu má', db.platny.cenik.prekladyKc === 50000,
      db.platny.cenik.prekladyKc);

    /* a) zveřejnění z varianty ČR, kde odchylka JE (tam je hodnota na nule) */
    const varCR = cenikSlozRadu(JSON.parse(JSON.stringify(db.platny.cenik)), ZAHR(), 'cr');
    test('příprava: varianta ČR má u položky s odchylkou nulu',
      varCR.prekladyKc === 0, varCR.prekladyKc);
    db = programNovaVerze(db, { cenik: varCR, cenikProj: {}, zahranicni: ZAHR(),
                                kdo: 'test', poznamka: 'v2' });
    test('zveřejnění z ČR varianty nezapíše nulu do platného ceníku',
      db.platny.cenik.prekladyKc === 50000, db.platny.cenik.prekladyKc);
    test('a otisk popisuje ceník, který se opravdu uložil',
      db.platny.otisk === programOtisk(db.platny));

    /* b) a proto zahraniční řada po ZRUŠENÍ odchylky zdědí cenu, ne nulu —
     *    to je ten okamžik, ve kterém se ztráta projeví. */
    test('po zrušení odchylky zahraniční řada zdědí cenu, ne nulu',
      cenikSlozRadu(JSON.parse(JSON.stringify(db.platny.cenik)),
        { ceny: {}, jenZahr: { 'C.prekladyKc': true } }, 'zahr').prekladyKc === 50000,
      cenikSlozRadu(JSON.parse(JSON.stringify(db.platny.cenik)),
        { ceny: {}, jenZahr: { 'C.prekladyKc': true } }, 'zahr').prekladyKc);

    /* c) POJISTKA: zákaz nesmí zamknout hodnotu natrvalo. Legitimní cesta,
     *    jak cenu položky „jen zahraniční" změnit, je tabulka odchylek — a ta
     *    musí fungovat dál. */
    const jina = { ceny: { 'C.prekladyKc': 70000 }, jenZahr: { 'C.prekladyKc': true } };
    db = programNovaVerze(db, { cenik: varCR, cenikProj: {}, zahranicni: jina,
                                kdo: 'test', poznamka: 'v3' });
    test('změna přes tabulku odchylek projde',
      cenikSlozRadu(JSON.parse(JSON.stringify(db.platny.cenik)), jina, 'zahr').prekladyKc === 70000,
      cenikSlozRadu(JSON.parse(JSON.stringify(db.platny.cenik)), jina, 'zahr').prekladyKc);
  }

  /* A obě strany porovnání jsou pořád shodné, takže přepočet nemá co hlásit —
   * kvůli tomu se nulovalo. */
  const dnesBez = cenikDnesniProRadu({ cenik: V27(), proj: { cenik: {} } }, { ceny: {}, jenZahr: {} }, 'cr');
  test('a obě strany porovnání se pořád shodují',
    dnesBez.cenik.prekladyKc === bezOdchylky.prekladyKc,
    { dnesni: dnesBez.cenik.prekladyKc, varianta: bezOdchylky.prekladyKc });
}

/* ---------- 4) přepočet při otevření zakázky ---------- */
{
  const zak = novaZakazka();
  zak.cislo = '2026 - OPR - CN - 9010'; zak.nazevAkce = 'TEST-K6';
  const v = zak.varianty[0];
  v.data.cenik = cenikSlozRadu(V27(), ZAHR(), 'cr');
  v.data.ock.zadani.atyp = true;

  const pred = vypocet(v.data.ock.zadani, v.data.cenik, JEKLY, false).souhrn.zakladCena;
  cenikPrepoctiRozpracovane(zak, { cenik: V27(), proj: { cenik: {} } }, { zahr: ZAHR() });
  const po = vypocet(v.data.ock.zadani, v.data.cenik, JEKLY, false).souhrn.zakladCena;

  test('přepočet na dnešní ceník cenu nezvedl', pred === po, [pred, po]);
  test('a tuzemská hodnota zůstala nulová', v.data.cenik.prekladyKc === 0, v.data.cenik.prekladyKc);
}

/* ---------- 5) v zahraniční zakázce se položka počítá ---------- */
{
  const sOdchylkou = vypocet(zad({ atyp: false }), cenikSlozRadu(V27(), ZAHR(), 'zahr'), JEKLY, false);
  const bez = vypocet(zad({ atyp: false }),
    cenikSlozRadu(ZC.zkusebniCenik(), { ceny: {}, jenZahr: { 'C.prekladyKc': true } }, 'zahr'), JEKLY, false);
  test('zahraniční kalkulace řádek PŘEKLADY má',
    sOdchylkou.sekce.rezie.some(x => /PŘEKLADY/.test(x.nazev)),
    sOdchylkou.sekce.rezie.map(x => x.nazev));
  test('a cena je proti nulové odchylce vyšší',
    sOdchylkou.souhrn.zakladCena > bez.souhrn.zakladCena,
    [sOdchylkou.souhrn.zakladCena, bez.souhrn.zakladCena]);
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
