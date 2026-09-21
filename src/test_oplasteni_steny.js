/* ===== OPLÁŠTĚNÍ PO STĚNÁCH A–D =====
 * (#268, druhý krok, 18. 9. 2026)
 *
 * Každá stěna může mít vlastní typ opláštění a rozdělení na pásy. Rozhodnutí
 * J. V. z 18. 9. 2026, na kterých to stojí:
 *   · sazby práce a tmelení se počítají PO CELÉ PLOŠE, ne po typech,
 *   · ořez tabulí se řídí tím, co zadá obchodník — dělicí výška platí, jak
 *     ji napsal, a nezaokrouhluje se na rozteč příčníků,
 *   · většinou stačí jeden pás, ale dva musí jít taky.
 *
 * NEJDŮLEŽITĚJŠÍ PRAVIDLO CELÉ SADY je hned první oddíl: ZAPNUTÍ REŽIMU
 * BEZE ZMĚNY ZADÁNÍ NESMÍ HNOUT CENOU. Bez toho by se režim nedal zapnout
 * na rozdělané zakázce, aniž by se přepsala nabídka — a nikdo by mu nevěřil.
 * Drží to způsob, jakým se plocha počítá: bere se ta, kterou jádro spočítalo
 * dosavadní cestou, a pásy si ji dělí poměrem výšek. Nepřepočítává se.
 */
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
const SO = require('./standard_ock.js');
const JEKLY = require('./jekly.json');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};
const blizko = (a, b, tol) => Math.abs(a - b) < (tol || 1e-6);

function spocti(zmeny, opl, fixes) {
  const z = JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI));
  z.typSachty = 'interiérová'; z.zaskleni = 'na terče';
  z.sirka = 1.8; z.hloubka = 1.9; z.zdvih = 12; z.prejezd = 3.5; z.prohluben = 1.2;
  z.nastupiste = 5;
  Object.assign(z, zmeny || {});
  if (opl) z.oplasteni = opl;
  return eng.vypocet(z, ZC.zkusebniCenik(), JEKLY, fixes !== false);
}
const PO_STENACH = (steny) => ({ rezim: 'poStenach', steny: steny || null });
const plocha = (r, kus) => {
  const x = r.sekce.oplasteni.find(i => String(i.origNazev).indexOf(kus) >= 0);
  return x ? x.mnozstvi : null;
};
const prace = (r) => plocha(r, 'PRÁCE OPLÁŠTĚNÍ');

/* ---------- 1) zapnutí režimu cenou nehne ---------- */
{
  let shoda = 0, rozdil = [];
  ['interiérová', 'exteriérová'].forEach(t => {
    ['na terče', 'mezi příčníky'].forEach(zs => {
      [false, true].forEach(sv => {
        [3, 5, 8].forEach(n => {
          [false, true].forEach(fixes => {
            const zm = { typSachty: t, zaskleni: zs, svetlikNadDvermi: sv, nastupiste: n };
            const a = spocti(zm, { rezim: 'standard', steny: null }, fixes);
            const b = spocti(zm, PO_STENACH(null), fixes);
            /* ZMĚNA PRAVIDLA 21. 9. 2026 (rozhodnutí J. V., #295): zapnutí
             * režimu už cenou hnout SMÍ — čelní stěna se nově počítá jako celá
             * stěna mínus dveřní otvory, ne jen jako světlík nad dveřmi.
             * Podrobné zdůvodnění i směr změny je v test_oplasteni_zapnuti.js;
             * tady se hlídá, že se rozdíl VEJDE DO ČELNÍ STĚNY — tedy že
             * zapnutí režimu nehnulo ničím jiným. */
            const rozdilPlochy = b.oplasteni.zakladSten.A - a.zaskleni.steny.A;
            const rozdilCelkem = b.oplasteni.plochaCelkem - a.zaskleni.celkemM2;
            if (blizko(rozdilCelkem, rozdilPlochy, 0.005)) shoda++;
            else rozdil.push(t + '/' + zs + '/' + n + (fixes ? '/M2' : '/M1')
              + ': rozdíl ploch ' + rozdilCelkem + ' vs čelní stěna ' + rozdilPlochy);
          });
        });
      });
    });
  });
  test('zapnutí režimu hne jen čelní stěnou, ničím jiným (' + shoda + ' zadání)',
    rozdil.length === 0, rozdil.slice(0, 3));
}

/* ---------- 2) plocha se dělí, nepřibývá ---------- */
{
  const zaklad = spocti({}, PO_STENACH(null));
  const celkem = prace(zaklad);
  test('je z čeho vycházet', celkem > 0, celkem);

  /* Jiný typ na jedné stěně jen PŘESUNE plochu — součet zůstává. */
  const cetrisC = spocti({}, PO_STENACH({ C: { odM: 0, pasy: [{ typ: 'C.cetrisKc', doM: null }] } }));
  test('změna typu jedné stěny nezmění celkovou plochu',
    blizko(prace(cetrisC), celkem, 1e-6), { pred: celkem, po: prace(cetrisC) });
  test('a plocha se rozdělí na dva řádky',
    plocha(cetrisC, 'CETRIS') > 0 && plocha(cetrisC, 'VSG 4.4.2') > 0,
    { cetris: plocha(cetrisC, 'CETRIS'), sklo: plocha(cetrisC, 'VSG 4.4.2') });
  test('a ty dva dohromady dají totéž',
    blizko(plocha(cetrisC, 'CETRIS') + plocha(cetrisC, 'VSG 4.4.2'), celkem, 1e-6));

  /* Dva pásy na jedné stěně — taky jen dělení. */
  const dvaPasy = spocti({}, PO_STENACH({ B: { odM: 0,
    pasy: [{ typ: 'C.skloVsg442Kc', doM: 2.2 }, { typ: 'C.cetrisKc', doM: null }] } }));
  test('dva pásy na stěně nezmění celkovou plochu',
    blizko(prace(dvaPasy), celkem, 1e-6), { pred: celkem, po: prace(dvaPasy) });
  test('dělicí výška 2,2 m ukrojí menší kus než celá stěna C',
    plocha(dvaPasy, 'CETRIS') > 0 && plocha(dvaPasy, 'CETRIS') < plocha(cetrisC, 'CETRIS'),
    { dvaPasy: plocha(dvaPasy, 'CETRIS'), celaStena: plocha(cetrisC, 'CETRIS') });
}

/* ---------- 3) dělicí výška se NEZAOKROUHLUJE (rozhodnutí J. V.) ---------- */
{
  /* Rozteč příčníků je 1,25 m, takže 2,2 m na ni nepadne. Kdyby se
   * zaokrouhlovalo na celé tabule, vyšly by obě dělicí výšky stejně. */
  const a = spocti({}, PO_STENACH({ B: { odM: 0,
    pasy: [{ typ: 'C.cetrisKc', doM: 2.2 }, { typ: 'C.skloVsg442Kc', doM: null }] } }));
  const b = spocti({}, PO_STENACH({ B: { odM: 0,
    pasy: [{ typ: 'C.cetrisKc', doM: 2.5 }, { typ: 'C.skloVsg442Kc', doM: null }] } }));
  test('jiná dělicí výška dá jinou plochu — neořezává se na rozteč',
    !blizko(plocha(a, 'CETRIS'), plocha(b, 'CETRIS'), 1e-4),
    { '2,2': plocha(a, 'CETRIS'), '2,5': plocha(b, 'CETRIS') });
  /* A poměr sedí: 2,5 / 2,2 plochy. */
  test('a roste úměrně výšce pásu',
    blizko(plocha(b, 'CETRIS') / plocha(a, 'CETRIS'), 2.5 / 2.2, 1e-6),
    plocha(b, 'CETRIS') / plocha(a, 'CETRIS'));
}

/* ---------- 4) prohlubeň plochu PŘIDÁVÁ ---------- */
{
  const bez = spocti({}, PO_STENACH(null));
  const doProhlubne = spocti({}, PO_STENACH({ B: { odM: -1.2,
    pasy: [{ typ: 'C.skloVsg442Kc', doM: null }] } }));
  test('zasklení do prohlubně plochu přidá', prace(doProhlubne) > prace(bez),
    { bez: prace(bez), sProhlubni: prace(doProhlubne) });
  /* Přibýt má přesně šířka stěny × hloubka pásu pod nulou. Stěna B je boční,
   * tedy hloubka šachty — proto se nekontroluje proti šířce 1,8. */
  const prirustek = prace(doProhlubne) - prace(bez);
  test('a přibude úměrně hloubce pásu pod nulou', prirustek > 1 && prirustek < 3, prirustek);
}

/* ---------- 5) „bez" a „jiné" ---------- */
{
  const zaklad = spocti({}, PO_STENACH(null));
  const bezD = spocti({}, PO_STENACH({ D: { odM: 0, pasy: [{ typ: 'bez', doM: null }] } }));
  test('stěna „bez" zmizí z materiálu i z práce', prace(bezD) < prace(zaklad),
    { pred: prace(zaklad), po: prace(bezD) });
  test('a nevznikne na ni žádný řádek',
    !bezD.sekce.oplasteni.some(i => /BEZ|DODÁ STAVBA/i.test(String(i.origNazev))),
    bezD.sekce.oplasteni.map(i => i.origNazev));

  const jine = spocti({}, PO_STENACH({ A: { odM: 0,
    pasy: [{ typ: 'jine', doM: null, nazev: 'Perforovaný plech', naklad: 900 }] } }));
  const radek = jine.sekce.oplasteni.find(i => /PERFOROVANÝ PLECH/.test(String(i.origNazev)));
  test('„jiné" dostane vlastní řádek s názvem od obchodníka', !!radek,
    jine.sekce.oplasteni.map(i => i.origNazev));
  test('a počítá se ručně zadanou sazbou',
    !!radek && blizko(radek.naklad, radek.mnozstvi * 900, 1e-6),
    radek && { mn: radek.mnozstvi, naklad: radek.naklad });
  test('ručně zadaná položka nemá ceníkovou cestu — sazba je jen pro tuhle zakázku',
    !!radek && !radek.cenaPath, radek && radek.cenaPath);
}

/* ---------- 6) kontrola standardu ---------- */
{
  const std = SO.standardOciste({});
  const zad = (opl) => Object.assign({
    typSachty: 'interiérová', sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2,
    zaskleni: 'na terče', profily: { sloupek: { dim: '80x50' } }, rohoveSloupky: 4, mustek: false,
  }, opl ? { oplasteni: opl } : {});
  test('standardní režim projde', SO.standardVyhodnot(zad(null), 13.4, std, []).stav === 'standard');
  const v = SO.standardVyhodnot(zad({ rezim: 'poStenach', steny: null }), 13.4, std, []);
  test('opláštění po stěnách je VŽDY atyp', v.stav === 'atyp', v.stav);
  const n = v.nalezy.find(x => /Opláštění/.test(x.co));
  /* „mimo standard", ne „nelze posoudit": posoudit to jde, odpověď je ne. */
  test('a hlásí se jako mimo standard, ne jako chybějící údaj',
    !!n && n.stav === 'mimo', n);
}

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
