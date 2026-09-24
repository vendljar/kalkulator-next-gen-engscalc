/* Zapnutí režimu „opláštění po stěnách" nesmí hnout cenou (#268, 3. krok).
 *
 * PROČ TAHLE SADA EXISTUJE. Dávka z 18. 9. 2026 slíbila: „zapnutí režimu
 * beze změny zadání nehne cenou" a doložila to na 48 zadáních — jenže
 * měřila stěny složené v testu. Obrazovka přišla až 21. 9. 2026 a ta stěny
 * skládá taky. Kdyby si je skládala po svém, rozešlo by se to při první
 * změně pravidel a poznalo by se to až na ceně u zákazníka.
 *
 * Proto výchozí podobu stěn drží JÁDRO (`oplasteniStenyVychozi`) a obrazovka
 * si ji jen vyžádá. Tahle sada hlídá tu funkci — tedy přesně to, co
 * obrazovka do zadání zapíše.
 *
 * Co se tu hlídá:
 *   – výchozí stěny dají na haléř tutéž cenu jako standardní režim,
 *   – a to napříč typem šachty, zasklením, průchozí šachtou i prohlubní,
 *   – výchozí typ stěny sedí na to, co by na ní bylo ve standardu,
 *   – „bez — dodá stavba" plochu odebere, jiný typ ji přesune,
 *   – číselník typů se řídí typem šachty.
 *
 * Čísla jsou smyšlená — skutečné sazby do repozitáře nepatří.
 */
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); };
nacti('./format.js'); nacti('./cenik.js'); nacti('./cenik_stari.js'); nacti('./cenik_rady.js');
const eng = require('./engine.js');
Object.keys(eng).forEach(k => { global[k] = eng[k]; });
const ZC = require('./zkusebni_cenik.js');
const JEKLY = JSON.parse(require('fs').readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const CENIK = () => ZC.zkusebniCenik();
const zad = (e) => Object.assign(JSON.parse(JSON.stringify(DEFAULT_ZADANI)), e || {});

/* ---------- 1) zapnutí režimu nehne cenou ---------- */
{
  const pripady = [];
  ['exteriérová', 'interiérová'].forEach(typSachty => {
    ['na terče', 'mezi příčníky'].forEach(zaskleni => {
      [false, true].forEach(pruchozi => {
        [0, 1.2].forEach(prohluben => {
          [false, true].forEach(atyp => {
            pripady.push({ typSachty, zaskleni, prohluben, atyp,
              pruchoziSachta: pruchozi,
              nastupisteA: pruchozi ? 2 : undefined,
              nastupisteC: pruchozi ? 1 : undefined,
              patra: pruchozi ? 2 : undefined });
          });
        });
      });
    });
  });

  /* ZMĚNA PRAVIDLA 21. 9. 2026 (rozhodnutí J. V., #295, varianta „b").
   *
   * Do té doby se tu čekalo, že zapnutí režimu NEHNE CENOU ani o haléř.
   * To pravidlo padlo: plocha čelní stěny se v režimu po stěnách nově bere
   * jako celá stěna MÍNUS dveřní otvory, ne jen jako světlík nad dveřmi.
   * Bez toho vycházela čelní stěna u šachty bez světlíků na NULU a sklo přes
   * celou stěnu bylo zdarma (#294).
   *
   * Cena tedy NAHORU jít smí — ale jen z tohohle jediného důvodu. Měří se
   * proto přesně to: rozdíl ploch mezi režimy musí sedět na rozdíl ZÁKLADU
   * ČELNÍ STĚNY, a to na haléř. Kdyby se hnulo cokoli jiného (boky, záda,
   * terče, práce), vyjde jiné číslo a sada spadne.
   *
   * Pouhé „cena vzrostla" by byl slabý test: prošel by i tehdy, kdyby se
   * omylem zdvojnásobila plocha boků. */
  let shod = 0, vzrostlo = 0;
  const rozdily = [];
  pripady.forEach(zm => {
    const c = CENIK();
    const zStd = zad(zm);
    const std = vypocet(zStd, c, JEKLY, false);

    const zPo = zad(zm);
    zPo.oplasteni = { rezim: 'poStenach', steny: oplasteniStenyVychozi(zPo, c) };
    const po = vypocet(zPo, c, JEKLY, false);

    /* Plocha skla ve standardu vs. celková plocha v režimu po stěnách. */
    const plochaStd = std.zaskleni.celkemM2;
    const plochaPo = po.oplasteni.plochaCelkem;
    const cekanyRozdil = po.oplasteni.zakladSten.A - std.zaskleni.steny.A;
    if (Math.abs((plochaPo - plochaStd) - cekanyRozdil) < 0.005) shod++;
    else rozdily.push({ zm, plochaStd, plochaPo, cekanyRozdil });
    if (po.souhrn.zakladCena >= std.souhrn.zakladCena - 0.005) vzrostlo++;
  });

  test('rozdíl ploch mezi režimy sedí PŘESNĚ na rozdíl základu čelní stěny ('
    + pripady.length + ' zadání)', shod === pripady.length, rozdily.slice(0, 3));
  /* SMĚR SE LIŠÍ PODLE ŠACHTY — a je poctivé to tu mít změřené, ne tvrdit,
   * že cena vždycky vzroste (to jsem si nejdřív myslel a měření to vyvrátilo).
   *
   * U šachty BEZ světlíků je standardní plocha čelní stěny nula, takže režim
   * po stěnách přidá celou stěnu a cena JDE NAHORU.
   *
   * U PRŮCHOZÍ šachty je to naopak: `svetlikM2` se v předloze počítá jako
   * `počet nástupišť × šířka × (světlá výška − 2,3)` a bere VŠECHNA nástupiště
   * včetně zadních, takže u ní vyjde plocha světlíků VĚTŠÍ NEŽ CELÁ STĚNA —
   * změřeno 75,16 m² proti 37,9 m² skutečné stěny. Geometricky poctivý základ
   * je tedy menší a cena JDE DOLŮ (změřeno −92 000 Kč u 16 z 32 zadání).
   * Je to tatáž vada předlohy, kvůli které umí `svetlikM2` vyjít i záporně
   * (nález N14) — režim po stěnách ji nedědí.
   *
   * Hlídá se proto jen to, že rozdíl sedí na čelní stěnu (kontrola výš),
   * a že obojí opravdu nastává — kdyby jeden ze směrů zmizel, něco se změnilo
   * a je potřeba se na to podívat.
   *
   * DOPLNĚNO 22. 9. 2026 (revize v22.9.9, T1): vysvětlení o dva odstavce výš
   * už neplatí celé. Od #296 se zadní nástupiště do čelních světlíků
   * nepočítají. Cena u průchozí šachty v těchhle zadáních jde dolů pořád,
   * ale z jiného důvodu: zkušební zadání mají 2 patra při výchozím zdvihu
   * 17,3 m, takže světlá výška podlaží vychází 17,1 m a světlík nad KAŽDÝMI
   * dveřmi se počítá přes celou tu výšku (vzorec předlohy, Model 1) — dva
   * světlíky dají 50,1 m² na stěně, která má bez dveří 30,7 m². Režim po
   * stěnách počítá skutečnou stěnu, proto vyjde levněji. U reálného zadání
   * (patra odpovídají zdvihu) tenhle rozdíl nevzniká. */
  /* ZMĚNA PRAVIDLA 24. 9. 2026 (N46, zadání J. V.: „stejné pravidlo platí
   * i po stěnách"). Nástupiště (patro s dveřmi) nese jen světlíky, zbytek
   * stěny se opláští celý — ve standardu i po stěnách. Základ po stěnách je
   * tedy TÝŽ jako plochy standardu a zapnutí režimu cenou NEHNE (vrací se
   * původní slib #268; varianta b z 21. 9. je tím nahrazena). Předchozí
   * odstavce popisují stav 21.–24. 9. */
  let stejne = 0;
  pripady.forEach(zm => {
    const c = CENIK();
    const std = vypocet(zad(zm), c, JEKLY, false);
    const zPo = zad(zm); zPo.oplasteni = { rezim: 'poStenach', steny: oplasteniStenyVychozi(zPo, c) };
    const po = vypocet(zPo, c, JEKLY, false);
    if (Math.abs(po.souhrn.zakladCena - std.souhrn.zakladCena) < 0.5) stejne++;
  });
  test('N46: zapnutí režimu po stěnách nehne cenou (' + pripady.length + ' zadání)',
    stejne === pripady.length, { stejne, celkem: pripady.length, vzrostlo });
  test('a případů bylo opravdu dost, aby to něco znamenalo', pripady.length >= 32, pripady.length);

  /* POJISTKA PROTI PRÁZDNÉMU TESTU: kdyby byl rozdíl u všech zadání nulový,
   * kontrola výš by vycházela i u výpočtu, který čelní stěnu dál počítá za
   * světlík. Aspoň u jednoho zadání se tedy rozdíl musí opravdu projevit. */
  {
    const c = CENIK();
    const z1 = zad({ svetlikNadDvermi: false, svetlikyBoky: 0 });
    const std1 = vypocet(z1, c, JEKLY, false);
    const z2 = zad({ svetlikNadDvermi: false, svetlikyBoky: 0 });
    z2.oplasteni = { rezim: 'poStenach', steny: oplasteniStenyVychozi(z2, c) };
    const po1 = vypocet(z2, c, JEKLY, false);
    /* Od 24. 9. (N46): čelní stěna s dveřmi v každém patře je samé
     * nástupiště — bez světlíků nemá opláštění ani po stěnách. Pojistka
     * proti prázdnému testu je proto průchozí šachta bez dveří vpředu:
     * tam čelní stěna plochu mít MUSÍ, v obou režimech stejnou. */
    test('N46: u šachty bez světlíků je čelní stěna nástupiště — bez opláštění i po stěnách',
      Math.abs(po1.oplasteni.zakladSten.A - std1.zaskleni.steny.A) < 0.005 && std1.zaskleni.steny.A < 0.005,
      { std: std1.zaskleni.steny.A, po: po1.oplasteni.zakladSten.A });
    const z3 = zad({ svetlikNadDvermi: false, svetlikyBoky: 0, pruchoziSachta: true, nastupisteA: 0, nastupisteC: 4, patra: 4 });
    z3.oplasteni = { rezim: 'poStenach', steny: oplasteniStenyVychozi(z3, c) };
    const po3 = vypocet(z3, c, JEKLY, false);
    test('N46: čelní stěna BEZ dveří (A0C4) plochu opravdu má, i po stěnách',
      po3.oplasteni.zakladSten.A > 10, po3.oplasteni.zakladSten);
  }

  /* Kdyby výpočet v obou režimech vracel nulu, test výš by prošel naprázdno. */
  const kontrola = vypocet(zad({}), CENIK(), JEKLY, false);
  test('zkušební zadání má nenulovou cenu (jinak by test neměřil nic)',
    kontrola.souhrn.zakladCena > 0, kontrola.souhrn.zakladCena);
}

/* ---------- 2) výchozí typ stěny ---------- */
{
  const c = CENIK();
  const ext = oplasteniStenyVychozi(zad({ typSachty: 'exteriérová' }), c);
  test('exteriér: čelní stěna má sklo čelní stěny',
    ext.A.pasy[0].typ === 'C.skloCelniKc', ext.A.pasy[0].typ);
  test('exteriér: boky a záda mají dvojsklo',
    ['B', 'C', 'D'].every(k => ext[k].pasy[0].typ === 'C.skloBokyKc'),
    ['B', 'C', 'D'].map(k => ext[k].pasy[0].typ));

  const intPricniky = oplasteniStenyVychozi(zad({ typSachty: 'interiérová', zaskleni: 'mezi příčníky' }), c);
  test('interiér s lištami: všechny stěny VSG 4.4.1',
    OPLASTENI_STENY.every(k => intPricniky[k].pasy[0].typ === 'C.skloCelniKc'),
    OPLASTENI_STENY.map(k => intPricniky[k].pasy[0].typ));

  const intTerce = oplasteniStenyVychozi(zad({ typSachty: 'interiérová', zaskleni: 'na terče' }), c);
  test('interiér na terče: všechny stěny VSG 4.4.2',
    OPLASTENI_STENY.every(k => intTerce[k].pasy[0].typ === 'C.skloVsg442Kc'),
    OPLASTENI_STENY.map(k => intTerce[k].pasy[0].typ));

  test('stěny jsou čtyři a v pořadí A–D',
    OPLASTENI_STENY.join('') === 'ABCD', OPLASTENI_STENY);
  test('každá výchozí stěna je celá (jeden pás až nahoru, od nuly)',
    OPLASTENI_STENY.every(k => ext[k].odM === 0 && ext[k].pasy.length === 1
      && ext[k].pasy[0].doM === null));
}

/* ---------- 3) změna typu stěnu opravdu přesune ---------- */
{
  const c = CENIK();
  const z = zad({ typSachty: 'exteriérová' });
  const steny = oplasteniStenyVychozi(z, c);

  const vse = vypocet(Object.assign(zad({ typSachty: 'exteriérová' }),
    { oplasteni: { rezim: 'poStenach', steny: JSON.parse(JSON.stringify(steny)) } }), c, JEKLY, false);

  /* „bez — dodá stavba": plocha se nepočítá nikam, cena musí klesnout. */
  const bezB = JSON.parse(JSON.stringify(steny));
  bezB.B.pasy[0].typ = 'bez';
  const sBez = vypocet(Object.assign(zad({ typSachty: 'exteriérová' }),
    { oplasteni: { rezim: 'poStenach', steny: bezB } }), c, JEKLY, false);
  test('stěna „bez — dodá stavba" cenu sníží',
    sBez.souhrn.zakladCena < vse.souhrn.zakladCena,
    [sBez.souhrn.zakladCena, vse.souhrn.zakladCena]);

  /* Cetris: plocha se přesune do jiného řádku, řádek musí vzniknout. */
  const cetris = JSON.parse(JSON.stringify(steny));
  cetris.B.pasy[0].typ = 'C.cetrisKc';
  const sCetris = vypocet(Object.assign(zad({ typSachty: 'exteriérová' }),
    { oplasteni: { rezim: 'poStenach', steny: cetris } }), c, JEKLY, false);
  test('Cetris na stěně vyrobí vlastní řádek opláštění',
    sCetris.sekce.oplasteni.some(r => /CETRIS/i.test(r.nazev)),
    sCetris.sekce.oplasteni.map(r => r.nazev));
}

/* ---------- 4) číselník typů ---------- */
{
  const ext = oplasteniTypy(true).map(t => t.id);
  const int = oplasteniTypy(false).map(t => t.id);
  test('exteriér nabízí dvojsklo, interiéru se nenabízí',
    ext.indexOf('C.skloBokyKc') >= 0 && int.indexOf('C.skloBokyKc') < 0, [ext, int]);
  test('interiér nabízí VSG 4.4.2, exteriéru se nenabízí',
    int.indexOf('C.skloVsg442Kc') >= 0 && ext.indexOf('C.skloVsg442Kc') < 0, [ext, int]);
  test('Cetris, „bez" i „jiné" se nabízejí vždy',
    ['C.cetrisKc', 'bez', 'jine'].every(id => ext.indexOf(id) >= 0 && int.indexOf(id) >= 0),
    [ext, int]);
}

/* ---------- 5) řádek technické specifikace ---------- */
{
  nacti('./preklad.js'); nacti('./techspec.js');
  const c = CENIK();

  test('standardní režim popisuje opláštění jako dosud',
    tsOplasteniRozsah(zad({})) === 'kompletní opláštění šachty', tsOplasteniRozsah(zad({})));

  const z = zad({ typSachty: 'exteriérová' });
  z.oplasteni = { rezim: 'poStenach', steny: oplasteniStenyVychozi(z, c) };
  z.oplasteni.steny.B.pasy = [{ typ: 'C.skloBokyKc', doM: 2.2 }, { typ: 'C.cetrisKc', doM: null }];
  z.oplasteni.steny.C.pasy = [{ typ: 'bez', doM: null }];
  z.oplasteni.steny.D.odM = -1.2;

  const cz = tsOplasteniRozsah(z);
  test('režim po stěnách jmenuje všechny čtyři stěny',
    ['A', 'B', 'C', 'D'].every(k => cz.indexOf('stěna ' + k) >= 0), cz);
  test('dvojice pásů nese dělicí výšku', /2,2 m/.test(cz), cz);
  test('stěna, kterou dodá stavba, je v textu vidět', /dodá stavba/.test(cz), cz);
  test('záporná dolní mez se označí jako prohlubeň', /prohlubně/.test(cz), cz);

  /* N41b (revize v22.9.9, oprava 23. 9. 2026): specifikace vypisuje jen pásy,
   * které jádro započítalo. Dělicí výška nad horní hranou prosklení dá
   * hornímu pásu nulovou výšku — do ceny nejde, a tak nesmí ani do textu. */
  {
    const zn = zad({ typSachty: 'exteriérová' });
    zn.oplasteni = { rezim: 'poStenach', steny: oplasteniStenyVychozi(zn, c) };
    const rn0 = vypocet(zn, c, JEKLY, false);
    const H = rn0.oplasteni.vyska;
    zn.oplasteni.steny.B.pasy = [{ typ: 'C.skloBokyKc', doM: H + 5 }, { typ: 'C.cetrisKc', doM: null }];
    /* neklesající výšky: druhý pás pod prvním se nezapočítá */
    zn.oplasteni.steny.D.pasy = [{ typ: 'C.skloBokyKc', doM: 3 }, { typ: 'C.cetrisKc', doM: 1 }, { typ: 'C.skloBokyKc', doM: null }];
    const rn = vypocet(zn, c, JEKLY, false);
    const pasyB = rn.oplasteni.pasy.filter(p => p.stena === 'B');
    const pasyD = rn.oplasteni.pasy.filter(p => p.stena === 'D');
    test('N41b: jádro na stěně B započítá jen spodní pás', pasyB.length === 1, JSON.stringify(pasyB.map(p => p.typ)));
    const t = tsOplasteniRozsah(zn, 'cz', rn);
    const stB = (t.split('; ').find(x => x.indexOf('stěna B') >= 0) || '');
    const stD = (t.split('; ').find(x => x.indexOf('stěna D') >= 0) || '');
    test('N41b: specifikace u stěny B nevypíše pás, který se nepočítá', !/Cetris/i.test(stB) && !/do výšky/.test(stB), stB);
    test('N41b: u stěny D vypíše tolik pásů, kolik jádro započítalo',
      (stD.match(/, /g) || []).length + 1 === pasyD.length, stD + ' | jádro: ' + pasyD.length);
    test('N41b: bez výsledku výpočtu zůstává dosavadní syrový výpis', /Cetris/i.test(tsOplasteniRozsah(zn, 'cz').split('; ').find(x => x.indexOf('stěna B') >= 0)));
    /* Chování, ne tvar zdrojáku (T4): pole specifikace, které větu plní,
     * musí s výsledkem výpočtu dát tentýž text. */
    const pole = TECHSPEC_DEF.reduce((a, sk) => a.concat(sk.pole), []).find(f => f.jazykSam && f.prefill
      && /opláštění/.test(String(f.prefill(rn, zn, c, 'cz'))));
    test('N41b: pole specifikace plní větu podle jádra',
      !!pole && pole.prefill(rn, zn, c, 'cz') === t, pole ? pole.prefill(rn, zn, c, 'cz') : 'pole nenalezeno');
  }

  /* Ruční název u typu „jiné" se nepřekládá — vymýšlet cizojazyčný název
   * materiálu, který napsal obchodník, nesmíme. */
  const zj = zad({ typSachty: 'exteriérová' });
  zj.oplasteni = { rezim: 'poStenach', steny: oplasteniStenyVychozi(zj, c) };
  zj.oplasteni.steny.A.pasy = [{ typ: 'jine', nazev: 'Trapézový plech', naklad: 1200, doM: null }];
  test('ruční název u typu „jiné" projde do textu beze změny',
    tsOplasteniRozsah(zj, 'en').indexOf('Trapézový plech') >= 0, tsOplasteniRozsah(zj, 'en'));

  /* PŘEKLADY. Věta se skládá z proměnlivého počtu kusů, takže ji slovník
   * nemůže trefit celou — skládá se rovnou v cílovém jazyce. Kdyby některý
   * kus chyběl, zůstal by uprostřed cizojazyčné věty česky. */
  ['en', 'de', 'fr'].forEach(j => {
    const t = tsOplasteniRozsah(z, j);
    test('věta v ' + j.toUpperCase() + ' neobsahuje české kusy',
      !/stěna |opláštění po stěnách|do výšky|dodá stavba/.test(t), t);
    test('standardní věta se přeloží taky (' + j.toUpperCase() + ')',
      tsOplasteniRozsah(zad({}), j) !== 'kompletní opláštění šachty',
      tsOplasteniRozsah(zad({}), j));
  });

  /* Slovník nesmí u téhle věty hlásit chybějící heslo — to by znamenalo, že
   * se něco přeložit nepodařilo a v dokumentu zůstal český kus. */
  const chybi = Object.values(PREKLAD_CHYBI || {});
  test('slovníku nechybí žádné heslo z téhle věty', chybi.length === 0,
    chybi.map(x => x.jazyk + ': ' + x.cz));

  /* Pole hlásí, že si text přeložilo samo — tisk pak přes něj nepustí
   * `tr()` podruhé (jinak by hlásil chybějící heslo u správného textu). */
  let pole = null;
  TECHSPEC_DEF.forEach(s => s.pole.forEach(p => { if (p.id === 'rozsahOplasteni') pole = p; }));
  test('pole ROZSAH OPLÁŠTĚNÍ je označené jako „přeloží si samo"', !!pole && pole.jazykSam === true);
  const h = tsHodnota(pole, { hodnoty: {} }, { neco: 1 }, z, c, 'de');
  test('a tsHodnota to v němčině hlásí', h.prelozeno === true, h);
  const hcz = tsHodnota(pole, { hodnoty: {} }, { neco: 1 }, z, c, 'cz');
  test('v češtině se nic za přeložené nevydává', !hcz.prelozeno, hcz);
  const hrucne = tsHodnota(pole, { hodnoty: { rozsahOplasteni: 'ruční text' } }, { neco: 1 }, z, c, 'de');
  test('ruční přepis má přednost a překládá se jako dřív',
    hrucne.text === 'ruční text' && !hrucne.prelozeno, hrucne);
}

/* ---------- CENA SEDÍ NA PLOCHU (nález T1 revize v22.9.9) ----------
 *
 * Kontrola „rozdíl ploch = rozdíl základu čelní stěny" v oddílu 1 je
 * rovnost z konstrukce: základy B, C, D jsou doslova plochy standardního
 * výpočtu, takže ověřuje jen, že dělení na pásy neztrácí plochu. CENU
 * neměřila žádná sada — a přesně proto prošel N31 (pás světlíku nad
 * zadními dveřmi se v režimu po stěnách odečetl a neúčtoval se nikde).
 *
 * Tady se měří, že se NÁKLAD SEKCE OPLÁŠTĚNÍ hne stejným směrem jako
 * plocha: víc plochy = dražší opláštění, stejná plocha = stejná cena,
 * méně plochy = levnější. Plocha, která se započte, ale nezaplatí (nebo
 * naopak), se tím pozná na kterémkoli ze 128 zadání. */
{
  let shoda = 0, n = 0;
  const nesoulad = [];
  const smer = (x, eps) => (Math.abs(x) < eps ? 0 : Math.sign(x));
  ['exteriérová', 'interiérová'].forEach(typSachty => ['na terče', 'mezi příčníky'].forEach(zaskleni =>
    [false, true].forEach(pruchozi => [0, 1.2].forEach(prohluben => [false, true].forEach(atyp =>
      [false, true].forEach(svetlik => [false, true].forEach(fixes => {
        const zm = { typSachty, zaskleni, prohluben, atyp, pruchoziSachta: pruchozi, svetlikNadDvermi: svetlik,
          nastupisteA: pruchozi ? 2 : undefined, nastupisteC: pruchozi ? 1 : undefined,
          patra: pruchozi ? 2 : undefined };
        const c = CENIK();
        const std = vypocet(zad(zm), c, JEKLY, fixes);
        const zPo = zad(zm);
        zPo.oplasteni = { rezim: 'poStenach', steny: oplasteniStenyVychozi(zPo, c) };
        const po = vypocet(zPo, c, JEKLY, fixes);
        const dPlocha = po.oplasteni.plochaCelkem - std.zaskleni.celkemM2;
        const dNaklad = po.souctySekci.oplasteni.naklad - std.souctySekci.oplasteni.naklad;
        n++;
        if (smer(dPlocha, 0.005) === smer(dNaklad, 0.5)) shoda++;
        else nesoulad.push({ zm, fixes, dPlocha, dNaklad });
      })))))));
  test('náklad opláštění jde stejným směrem jako plocha (' + n + ' zadání, oba modely)',
    shoda === n, nesoulad.slice(0, 3));
  test('a zadání bylo dost, aby to něco znamenalo', n >= 128, n);
}

/* ---------- REGRESE N31: světlík nad dveřmi u průchozí šachty ----------
 *
 * Revize v22.9.9: v režimu po stěnách zaškrtnutí „světlík nad dveřmi"
 * SNÍŽILO cenu. Základ zadní stěny odečítal kromě dveří i pás světlíku nad
 * nimi, a ten se v režimu po stěnách neúčtoval nikde. Změřeno na zadání
 * průchozí A2 + C1, 2 patra: zadní stěna 33,06 m² bez světlíku, 8,01 m²
 * se světlíkem; cena o desítky tisíc níž.
 *
 * Opravila to #296 (22. 9. 2026): od zadní stěny se odečítají jen dveře
 * a pás nad nimi je obyčejné sklo zadní stěny. Tady se hlídá, že se to
 * nevrátí: v režimu po stěnách je plocha stěny celá stěna mínus otvory,
 * takže přepínač světlíku s ní nesmí hnout — a cenu nesmí snížit. */
{
  ['exteriérová', 'interiérová'].forEach(typSachty => ['na terče', 'mezi příčníky'].forEach(zaskleni =>
    [false, true].forEach(fixes => {
      const sfx = ' [' + typSachty + ', ' + zaskleni + ', ' + (fixes ? 'opravený' : 'Excel 1:1') + ']';
      const spocti = (svetlik) => {
        const c = CENIK();
        const z = zad({ typSachty, zaskleni, pruchoziSachta: true, nastupisteA: 2, nastupisteC: 1,
          nastupiste: 3, patra: 2, svetlikNadDvermi: svetlik, svetlikyBoky: 0 });
        z.oplasteni = { rezim: 'poStenach', steny: oplasteniStenyVychozi(z, c) };
        return vypocet(z, c, JEKLY, fixes);
      };
      const bez = spocti(false), se = spocti(true);
      /* Od 24. 9. (N46) je nástupiště = dveře, portál, plechy a SVĚTLÍKY,
       * takže zaškrtnutý světlík plochu stěny s dveřmi přidá. Hlídá se to,
       * o co v N31 šlo: plochu (a cenu) nesmí UBRAT. */
      test('světlík nad dveřmi základ zadní stěny nezmenší' + sfx,
        se.oplasteni.zakladSten.C >= bez.oplasteni.zakladSten.C - 0.005,
        [bez.oplasteni.zakladSten.C, se.oplasteni.zakladSten.C]);
      test('ani čelní stěny' + sfx,
        se.oplasteni.zakladSten.A >= bez.oplasteni.zakladSten.A - 0.005,
        [bez.oplasteni.zakladSten.A, se.oplasteni.zakladSten.A]);
      /* Celková plocha jen v OPRAVENÉM modelu. Model 1 je 1:1 s Excelem
       * včetně zdokumentované chyby šablony (engine.js, `bocniHl`: „D19
       * místo D18") — u zasklení mezi příčníky se v něm se světlíkem mění
       * hloubka BOČNÍCH stěn. Stěny s nástupišti (A a C), o které v N31
       * šlo, hlídají kontroly výš v obou modelech. */
      if (fixes)
        test('celková plocha opláštění přibude právě o světlíky na A a C' + sfx,
          Math.abs((se.oplasteni.plochaCelkem - bez.oplasteni.plochaCelkem)
            - ((se.oplasteni.zakladSten.A + se.oplasteni.zakladSten.C)
              - (bez.oplasteni.zakladSten.A + bez.oplasteni.zakladSten.C))) < 0.005,
          [bez.oplasteni.plochaCelkem, se.oplasteni.plochaCelkem]);
      else
        test('v Modelu 1 se navíc liší boční stěny (chyba šablony D19/D18)' + sfx,
          Math.abs((se.oplasteni.plochaCelkem - bez.oplasteni.plochaCelkem)
            - ((se.oplasteni.zakladSten.A + se.oplasteni.zakladSten.B + se.oplasteni.zakladSten.C + se.oplasteni.zakladSten.D)
              - (bez.oplasteni.zakladSten.A + bez.oplasteni.zakladSten.B + bez.oplasteni.zakladSten.C + bez.oplasteni.zakladSten.D))) < 0.005,
          [bez.oplasteni.plochaCelkem, se.oplasteni.plochaCelkem]);
      test('a zaškrtnutí světlíku cenu nesníží' + sfx,
        se.souhrn.zakladCena >= bez.souhrn.zakladCena, [bez.souhrn.zakladCena, se.souhrn.zakladCena]);
      /* Pojistka proti prázdnému testu: zadní stěna tu opravdu má plochu
       * a otvory se z ní odečítají (je menší než boční stěna × 2). */
      test('(zadní stěna má plochu a dveře vzadu se od ní odečetly)' + sfx,
        bez.oplasteni.zakladSten.C > 1 && bez.oplasteni.zakladSten.C < bez.oplasteni.zakladSten.A + 5,
        [bez.oplasteni.zakladSten.A, bez.oplasteni.zakladSten.C]);
    })));
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
