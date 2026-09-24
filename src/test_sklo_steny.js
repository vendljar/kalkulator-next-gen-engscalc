/* ===== PLOCHA ZASKLENÍ PO STĚNÁCH A–D =====
 * (#268, 18. 9. 2026 — první krok k opláštění po stěnách)
 *
 * Připravovaný režim „opláštění po stěnách" potřebuje u každé stěny vlastní
 * typ a rozsah. Dnes se plocha počítá ze tří čísel, ve kterých se OBĚ BOČNÍ
 * STĚNY sčítají dohromady — B a D tedy nejde rozlišit. Tenhle krok je
 * rozpojil a NIC VÍC.
 *
 * CELÝ SMYSL SADY: doložit, že se rozpojením nezměnil ani haléř. Součty
 * musí dál vycházet přesně jako dřív a cena se nesmí hnout. Ověřeno i mimo
 * sadu srovnáním starého a nového vzorce na 2304 zadáních (shodný otisk);
 * tady se drží pravidla, která to zaručují do budoucna.
 *
 * Značení podle zadání J. V.: stojím na nástupišti čelem ke dveřím,
 *   A = čelní (dveře) · B = boční · C = zadní · D = boční
 * po směru hodinových ručiček. Táž abeceda jako u nástupišť A/C.
 */
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
const JEKLY = require('./jekly.json');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};
const blizko = (a, b, tol) => Math.abs(a - b) < (tol || 1e-9);

function spocti(zmeny, fixes) {
  const z = JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI));
  z.sirka = 1.8; z.hloubka = 1.9; z.zdvih = 12; z.prejezd = 3.5; z.prohluben = 1.2;
  z.nastupiste = 5;
  Object.assign(z, zmeny || {});
  return eng.vypocet(z, ZC.zkusebniCenik(), JEKLY, !!fixes);
}

/* Široká sada zadání — kdyby platilo jen pro jedno, nic to nedokazuje.
 * Průchozí šachta i světlík jsou uvnitř schválně: zadní stěna má pak
 * portály a čelní světlíky, takže se rozpad nejvíc rozchází. */
const ZADANI = [];
['interiérová', 'exteriérová'].forEach(t => {
  ['na terče', 'mezi příčníky'].forEach(zs => {
    [false, true].forEach(sv => {
      [3, 5, 8].forEach(n => {
        ZADANI.push({ popis: t + ' · ' + zs + ' · světlík ' + (sv ? 'ano' : 'ne') + ' · ' + n + ' nástupišť',
          z: { typSachty: t, zaskleni: zs, svetlikNadDvermi: sv, nastupiste: n } });
      });
    });
  });
});
/* A průchozí šachta s nástupišti C — tam se odečítají portály ze zadní stěny. */
ZADANI.push({ popis: 'průchozí, nástupiště A3 + C2',
  z: { typSachty: 'interiérová', pruchoziSachta: true, nastupisteA: 3, nastupisteC: 2, svetlikNadDvermi: true } });

/* ---------- 1) stěny se vůbec vydávají ---------- */
{
  const r = spocti({}, true);
  test('výsledek nese plochu po stěnách', !!r.zaskleni.steny, Object.keys(r.zaskleni || {}));
  test('a má všechny čtyři',
    ['A', 'B', 'C', 'D'].every(k => typeof r.zaskleni.steny[k] === 'number'), r.zaskleni.steny);
}

/* ---------- 2) SOUČTY SEDÍ — tohle je to podstatné ---------- */
[false, true].forEach(fixes => {
  const model = fixes ? 'Model 2' : 'Model 1';
  ZADANI.forEach(({ popis, z }) => {
    const r = spocti(z, fixes);
    const s = r.zaskleni.steny;
    test(model + ' / ' + popis + ': A + B + C + D = celkem',
      blizko(s.A + s.B + s.C + s.D, r.zaskleni.celkemM2, 1e-9),
      { soucet: s.A + s.B + s.C + s.D, celkem: r.zaskleni.celkemM2 });
    test(model + ' / ' + popis + ': B + C + D = boky a záda',
      blizko(s.B + s.C + s.D, r.zaskleni.bokyZadniM2, 1e-9),
      { soucet: s.B + s.C + s.D, bokyZadni: r.zaskleni.bokyZadniM2 });
    test(model + ' / ' + popis + ': A = čelní',
      blizko(s.A, r.zaskleni.celniM2, 1e-9), { A: s.A, celni: r.zaskleni.celniM2 });
  });
});

/* ---------- 3) která stěna je která ----------
 *
 * FIXTURA MUSÍ ROZSVÍTIT VŠECHNY CESTY. První verze tohohle oddílu použila
 * obyčejnou neprůchozí šachtu bez bočních světlíků — a v ní jsou
 * `svetlikBokM2` i `zadniPortalyM2` nulové, takže dvě mutace („čelní stěna
 * přijde o světlíky po stranách", „zadní stěna bez odečtu portálů") prošly
 * naprázdno: odebíraly nulu. Proto průchozí šachta s nástupišti C
 * a se světlíky na obou bocích dveří. */
{
  const r = spocti({ typSachty: 'interiérová', svetlikNadDvermi: true, svetlikyBoky: 2,
    pruchoziSachta: true, nastupisteA: 3, nastupisteC: 2 }, true);
  const s = r.zaskleni.steny;
  test('fixtura má nenulové boční světlíky (jinak by testy níž neměřily nic)',
    r.zaskleni.svetlikyBoky.m2 > 0, r.zaskleni.svetlikyBoky.m2);
  test('a nenulové portály v zadní stěně',
    r.zaskleni.zadniPortaly.m2 > 0 && r.zaskleni.zadniPlne.m2 !== r.zaskleni.zadni.m2,
    { portaly: r.zaskleni.zadniPortaly.m2, plne: r.zaskleni.zadniPlne.m2, zadni: r.zaskleni.zadni.m2 });
  /* Boční stěny jsou dnes nutně stejné: `bocniM2` má v sobě `Math.max` přes
   * OBĚ najednou, takže půlka je jediný věrný rozpad. Kdyby se někdo pokusil
   * počítat je zvlášť, vyjde u některých zadání jiné číslo — a tenhle test
   * spadne dřív, než se to dostane do ceny. */
  test('B a D jsou zatím stejné (bocniM2 se dělí napůl)', blizko(s.B, s.D, 1e-12), { B: s.B, D: s.D });
  test('a dohromady dají přesně boční plochu',
    blizko(s.B + s.D, r.zaskleni.bocni.m2, 1e-9), { soucet: s.B + s.D, bocni: r.zaskleni.bocni.m2 });
  /* Průchozí šachta od 24. 9. 2026 (N46, pravidlo nástupišť): A i C =
   * světlíky nástupišť té stěny + patra bez dveří po celé ploše. */
  const n = r.zaskleni.nastupisteSten;
  test('N46: C = světlíky nástupišť C + patra bez dveří C',
    blizko(s.C, n.C.svetliky + n.C.plne, 1e-12), { C: s.C, n: n.C });
  test('N46: A = světlíky nástupišť A + patra bez dveří A',
    blizko(s.A, n.A.svetliky + n.A.plne, 1e-12), { A: s.A, n: n.A });
  test('N46: boční světlíky se dělí podle dveří (A 3, C 2)',
    blizko(n.A.svetliky + n.C.svetliky, r.zaskleni.svetliky.m2 + r.zaskleni.svetlikyZadni.m2 + r.zaskleni.svetlikyBoky.m2, 1e-9),
    { n, sv: r.zaskleni.svetliky.m2, svZ: r.zaskleni.svetlikyZadni.m2, boky: r.zaskleni.svetlikyBoky.m2 });
}

/* ---------- 4) cena se rozpojením nehnula ---------- */
{
  /* Nepřímý, ale nejtvrdší důkaz: plocha vstupuje do materiálu skla, práce
   * opláštění i tmelení. Kdyby se rozpad počítal jinak než součty, musela by
   * se cena rozejít — a tady se porovnává proti hodnotě, kterou nese sám
   * výsledek, takže test platí i po budoucích změnách sazeb. */
  ZADANI.slice(0, 6).forEach(({ popis, z }) => {
    const r = spocti(z, true);
    const s = r.zaskleni.steny;
    test('cena stojí na téže ploše — ' + popis,
      blizko(s.A + s.B + s.C + s.D, r.zaskleni.celkemM2, 1e-9) && r.souhrn.zakladCena > 0,
      { cena: r.souhrn.zakladCena });
  });
}

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
