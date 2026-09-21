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
  const bezZnacky = cenikSlozRadu(V27(), { ceny: {}, jenZahr: {} }, 'cr');
  test('pevný seznam CENIK_JEN_ZAHR platí i bez zaškrtnuté značky',
    bezZnacky.prekladyKc === 0, bezZnacky.prekladyKc);
  test('a cenikJenZahrCesty ho vrací', cenikJenZahrCesty({ ceny: {}, jenZahr: {} })
    .indexOf('C.prekladyKc') >= 0, cenikJenZahrCesty({ ceny: {}, jenZahr: {} }));
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
