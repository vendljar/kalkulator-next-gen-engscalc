/* SVĚTLÍKY U ŠACHETNÍCH DVEŘÍ (#375, rozhodnutí J. V. 30. 9. 2026: „s tvými
 * návrhy řešení bočních světlíků souhlasím" — výchozí odpovědi 1–7 návrhu
 * platí; k tomu rozhodnutí o světlíku nad dveřmi „zajistí stavba").
 *
 * Hlídá se:
 *   1) volby boků = volby nad dveřmi, výchozí stav nové zakázky (boky „bez",
 *      nad dveřmi plech),
 *   2) počet bočních světlíků: automaticky nástupiště × 2 (jde s nástupišti),
 *      ruční přepis, prázdno = automatika,
 *   3) rozložení po dveřích (se dvěma / s jedním / bez), plocha výplně
 *      min(N; dveře) × mezera × 2,2 m,
 *   4) konstrukce na světlík (sloupek +1, krátké příčníky +2, montáž 0,5 h,
 *      terče +2 / lišty +8), plech (8,5 kg/m², obě strany, práce +1 ks na
 *      dveře se světlíky), zajistí stavba, bez,
 *   5) čím se světlík vyplní: sklo = sklo stěny s dveřmi (po stěnách typ skla
 *      stěny A, jinak sklo čelní stěny ze standardu — žádné dělení do pásů),
 *      materiál = stěny B, C, D (převažující podle plochy, deska bez lišt
 *      a terčů, „bez — dodá stavba" = zajistí stavba),
 *   6) nad dveřmi: „zajistí stavba" neubírá montáž 0,2 h (oba modely), „bez"
 *      ji ubírá jen v Modelu 1 (#378, rozhodnutí J. V. 1. 10. 2026),
 *   7) průchozí šachta: boční světlíky podle dveří na stěnách A a C,
 *   8) převod starších zakázek beze změny ceny (i import zakázky),
 *   9) kontrola před nabídkou, technická specifikace a překlad, nabídka,
 *  10) server odmítne volbu mimo výčet.
 * Čísla jsou ze zkušebního ceníku, skutečné sazby do repozitáře nepatří. */
const E = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
const J = require('./jekly.json');
const kop = x => JSON.parse(JSON.stringify(x));
/* Jádro je v aplikaci globální — kontrola, specifikace i zakázka ho tak čtou. */
['nadDvermiVypln', 'bokyVypln', 'bokyPocet', 'bokyPocetAuto', 'bokyPocetRucne', 'nastupisteCelkem',
 'svetlikyBokyMigrace', 'mustkyPocet', 'OPLASTENI_TYPY', 'skloVolba', 'oplasteniTypy']
  .forEach(k => { if (E[k] !== undefined) global[k] = E[k]; });

let ok = 0, fail = 0;
const test = (n, fn, info) => {
  let c = false, det = info;
  try { c = typeof fn === 'function' ? fn() : fn; } catch (e) { c = false; det = 'výjimka: ' + e.message; }
  if (c) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, det === undefined ? '' : (typeof det === 'function' ? safe(det) : JSON.stringify(det))); }
};
const safe = f => { try { return JSON.stringify(f()); } catch (e) { return 'výjimka: ' + e.message; } };
const blizko = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1e-9 : tol);
const CENIK = () => Object.assign(kop(E.DEFAULT_CENIK), ZC.zkusebniCenik());

/* Zadání v NOVÉM tvaru: 5 nástupišť, stěna 1,5 m, dveře 800 + 2 × 100. */
function zad(x, typ) {
  const t = typ || 'exteriérová';
  const z = kop(E.DEFAULT_ZADANI);
  Object.assign(z, { typSachty: t, profily: kop(E.PROFILY_VYCHOZI[t]), zaskleni: 'na terče',
    sirka: 1.5, hloubka: 1.6, zdvih: 12, prejezd: 3.5, prohluben: 1.2, nastupiste: 5,
    cistyVstupMm: 800, sirkaRamuMm: 100, nadDvermi: 'bez', bokyDveri: 'bez', svetlikyBokyKs: '' });
  return Object.assign(z, x || {});
}
const spocti = (z, fixes) => E.vypocet(z, CENIK(), J, fixes !== false);
const radek = (r, kus) => {
  for (const s of ['hrubaOck', 'oplasteni', 'volitelne', 'rezie']) {
    const it = (r.sekce[s] || []).find(x => String(x.origNazev).indexOf(kus) >= 0);
    if (it) return it;
  }
  return null;
};
const mn = (r, kus) => { const x = radek(r, kus); return x ? x.mnozstvi : 0; };
const prip = (r, key) => { const p = (r.priplatky || []).find(x => x.key === key); return p ? p.mnozstvi : null; };
const PL_MAT = 'PLECHY - OPLECH. DVEŘÍ A PODEST (MATERIÁL)', PL_PRACE = 'PLECHY - OPLECH. DVEŘÍ A PODEST (PRÁCE)';

/* ---------- 1) volby a výchozí stav ---------- */
test('boky mají tytéž volby jako světlík nad dveřmi',
  () => JSON.stringify(E.BOKY_DVERI_VOLBY) === JSON.stringify(E.NAD_DVERMI_VOLBY)
    && E.NAD_DVERMI_VOLBY.join('|') === 'bez|sklo|plech|material|stavba');
test('volba boků se čte z `bokyDveri`', () => E.bokyVypln({ bokyDveri: 'plech', svetlikyBoky: 0 }) === 'plech');
{
  global.vypocet = E.vypocet; global.DEFAULT_ZADANI = E.DEFAULT_ZADANI; global.DEFAULT_CENIK = CENIK();
  const ep = require('./engine_proj.js');
  global.DEFAULT_ZADANI_PROJ = ep.DEFAULT_ZADANI_PROJ; global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
  const tsm = require('./techspec.js');
  global.TECHSPEC_DEF = tsm.TECHSPEC_DEF; global.tsHodnota = tsm.tsHodnota; global.DEFAULT_TECHSPEC = tsm.DEFAULT_TECHSPEC;
  const zk = require('./zakazka.js');
  const z = zk.novaZakazka().varianty[0].data.ock.zadani;
  test('nová zakázka: boky „bez", nad dveřmi plech', () => E.bokyVypln(z) === 'bez' && E.nadDvermiVypln(z) === 'plech',
    () => [z.bokyDveri, z.nadDvermi]);
  test('nová zakázka: počet světlíků prázdný (automatika)', () => z.svetlikyBokyKs === '' || z.svetlikyBokyKs == null,
    () => z.svetlikyBokyKs);
}

/* ---------- 2) počet bočních světlíků ---------- */
test('automaticky nástupiště × 2', () => E.bokyPocet(zad({ bokyDveri: 'sklo' })) === 10);
test('automatika jde se změnou nástupišť', () => E.bokyPocet(zad({ bokyDveri: 'sklo', nastupiste: 7 })) === 14);
test('průchozí šachta: automatika z dveří A + C',
  () => E.bokyPocet(zad({ bokyDveri: 'sklo', pruchoziSachta: true, nastupisteA: 3, nastupisteC: 2, patra: 3 })) === 10);
test('ruční počet platí a nejde s nástupišti', () => E.bokyPocet(zad({ bokyDveri: 'sklo', svetlikyBokyKs: 7, nastupiste: 8 })) === 7);
test('ruční počet jako text ze vstupu („7")', () => E.bokyPocet(zad({ bokyDveri: 'sklo', svetlikyBokyKs: '7' })) === 7);
test('prázdno = automatika, nula = platný ruční počet',
  () => E.bokyPocet(zad({ bokyDveri: 'sklo', svetlikyBokyKs: '' })) === 10 && E.bokyPocet(zad({ bokyDveri: 'sklo', svetlikyBokyKs: 0 })) === 0);
test('boky „bez" = 0 světlíků i s ručním počtem', () => E.bokyPocet(zad({ bokyDveri: 'bez', svetlikyBokyKs: 6 })) === 0);
test('ruční počet se pozná (ručně / automaticky)',
  () => E.bokyPocetRucne(zad({ bokyDveri: 'sklo', svetlikyBokyKs: 7 })) === true && E.bokyPocetRucne(zad({ bokyDveri: 'sklo' })) === false);
test('záporný ruční počet = 0', () => E.bokyPocet(zad({ bokyDveri: 'sklo', svetlikyBokyKs: -3 })) === 0);

/* ---------- 3) rozložení po dveřích a plocha ---------- */
{
  const roz = N => { const v = spocti(zad({ bokyDveri: 'sklo', svetlikyBokyKs: N })).zaskleni.vypln; return [v.dvereDva, v.dvereJeden, v.dvereBez]; };
  test('10 světlíků na 5 dveří = všechny se dvěma', () => roz(10).join() === '5,0,0', () => roz(10));
  test('7 světlíků = 2 dveře se dvěma, 3 s jedním', () => roz(7).join() === '2,3,0', () => roz(7));
  test('5 světlíků = všechny dveře s jedním', () => roz(5).join() === '0,5,0', () => roz(5));
  test('3 světlíky = 3 dveře s jedním, 2 bez', () => roz(3).join() === '0,3,2', () => roz(3));
  test('12 světlíků (víc než dva na dveře) = všechny se dvěma', () => roz(12).join() === '5,0,0', () => roz(12));
  const r10 = spocti(zad({ bokyDveri: 'sklo', svetlikyBokyKs: 10 }));
  const mez = r10.zaskleni.vypln.mezera;
  test('mezera vedle dveří = šířka stěny − otvor dveří − 0,04 m',
    () => blizko(mez, r10.zaskleni.rozmer.sir - r10.odvozene.sirkaDveri - 0.04), mez);
  [[10, 5], [7, 5], [5, 5], [3, 3], [12, 5]].forEach(([N, dvere]) => {
    const r = spocti(zad({ bokyDveri: 'sklo', svetlikyBokyKs: N }));
    test('plocha boků pro ' + N + ' světlíků = min(N; dveře) × mezera × 2,2',
      () => blizko(r.zaskleni.svetlikyBoky.m2, dvere * mez * 2.2, 1e-9), r.zaskleni.svetlikyBoky.m2);
  });
  test('skleněných tabulí po 1,1 m je 2 na světlík', () => spocti(zad({ bokyDveri: 'sklo', svetlikyBokyKs: 7 })).zaskleni.svetlikyBoky.ks === 14);
}

/* ---------- 4) konstrukce, plech, stavba, bez ---------- */
{
  const bez = spocti(zad({ bokyDveri: 'bez' }));
  const s7 = spocti(zad({ bokyDveri: 'sklo', svetlikyBokyKs: 7 }));
  test('sloupek portálu +1 na světlík', () => s7.parametry.sloupkyPortalu === 7 && bez.parametry.sloupkyPortalu === 0);
  test('krátké příčníky +2 na světlík', () => s7.parametry.kratkePricniky === 14);
  test('montáž 0,5 h na světlík', () => blizko(s7.montaz.hodinyNavic.svetlikyBoky, 3.5) && bez.montaz.hodinyNavic.svetlikyBoky === 0);
  test('terče +2 na světlík', () => s7.dily.terceKs - bez.dily.terceKs === 14, () => [s7.dily.terceKs, bez.dily.terceKs]);
  const listyBez = spocti(zad({ bokyDveri: 'bez', zaskleni: 'mezi příčníky' }));
  const listy7 = spocti(zad({ bokyDveri: 'sklo', svetlikyBokyKs: 7, zaskleni: 'mezi příčníky' }));
  test('lišty +8 na světlík (4 na krátký příčník)', () => listy7.dily.listyKs - listyBez.dily.listyKs === 56);
  test('boky „bez": žádná konstrukce ani výplň', () => bez.parametry.sloupkyPortalu === 0 && bez.zaskleni.svetlikyBoky.m2 === 0
    && bez.zaskleni.vypln.bokyPlechM2 === 0);

  const pl = spocti(zad({ bokyDveri: 'plech', svetlikyBokyKs: 7 }));
  const plM2 = 5 * pl.zaskleni.vypln.mezera * 2.2;
  test('plech: plocha výplně = plocha boků', () => blizko(pl.zaskleni.vypln.bokyPlechM2, plM2, 1e-9), pl.zaskleni.vypln.bokyPlechM2);
  test('plech: +8,5 kg/m² v plechu dveří', () => blizko(mn(pl, PL_MAT) - mn(bez, PL_MAT), 8.5 * plM2, 1e-6));
  test('plech: práce +1 ks na dveře s bočními světlíky (7 světlíků na 5 dveří = 5 ks)',
    () => mn(pl, PL_PRACE) - mn(bez, PL_PRACE) === 5, () => [mn(pl, PL_PRACE), mn(bez, PL_PRACE)]);
  const pl3 = spocti(zad({ bokyDveri: 'plech', svetlikyBokyKs: 3 }));
  test('plech: 3 světlíky na 5 dveří = práce +3 ks', () => mn(pl3, PL_PRACE) - mn(bez, PL_PRACE) === 3);
  /* Proti „zajistí stavba" se stejným počtem: konstrukce, terče i spoje jsou
   * tytéž, liší se jen plech výplně. */
  const st7 = spocti(zad({ bokyDveri: 'stavba', svetlikyBokyKs: 7 }));
  test('plech: lakování obou stran (Tomáš)', () => blizko(pl.lakovani.tomas - st7.lakovani.tomas,
    2 * plM2 * CENIK().lak.tomasOplechM2, 1e-6), () => [pl.lakovani.tomas, st7.lakovani.tomas]);
  test('plech: lakování obou stran (lakovna)', () => blizko(pl.lakovani.lakovna - st7.lakovani.lakovna,
    2 * plM2 * CENIK().lak.lakovnaM2, 1e-6));
  test('plech: sklo boků nula', () => pl.zaskleni.svetlikyBoky.m2 === 0);

  const st = spocti(zad({ bokyDveri: 'stavba', svetlikyBokyKs: 7 }));
  test('zajistí stavba: konstrukce naše (sloupky, příčníky, montáž)',
    () => st.parametry.sloupkyPortalu === 7 && blizko(st.montaz.hodinyNavic.svetlikyBoky, 3.5));
  test('zajistí stavba: výplň 0 Kč (ani sklo, ani plech)', () => st.zaskleni.svetlikyBoky.m2 === 0 && st.zaskleni.vypln.bokyPlechM2 === 0
    && blizko(st.souctySekci.oplasteni.naklad, bez.souctySekci.oplasteni.naklad, 1e-6));
}

/* ---------- 5) čím se světlík vyplní ---------- */
{
  /* Standard, exteriér: sklo = sklo čelní stěny (VSG 4.4.1), materiál = dvojsklo boků. */
  const bez = spocti(zad({ bokyDveri: 'bez' }));
  const sklo = spocti(zad({ bokyDveri: 'sklo' }));
  const mat = spocti(zad({ bokyDveri: 'material' }));
  const m2 = sklo.zaskleni.svetlikyBoky.m2;
  test('sklo (standard, exteriér): typ = sklo čelní stěny', () => sklo.zaskleni.vypln.material.boky.A.typ === 'C.skloCelniKc');
  test('sklo (standard): plocha v řádku čelní stěny', () => blizko(sklo.zaskleni.celniM2 - bez.zaskleni.celniM2, m2, 1e-9)
    && blizko(sklo.zaskleni.bokyZadniM2, bez.zaskleni.bokyZadniM2, 1e-9));
  test('materiál (standard, exteriér): typ = dvojsklo boků a zad', () => mat.zaskleni.vypln.material.boky.A.typ === 'C.skloBokyKc');
  test('materiál (standard): plocha v řádku boků a zad, ne čelní stěny',
    () => blizko(mat.zaskleni.bokyZadniM2 - bez.zaskleni.bokyZadniM2, m2, 1e-9) && blizko(mat.zaskleni.celniM2, bez.zaskleni.celniM2, 1e-9));
  test('materiál (standard, exteriér): příplatek SKN (náhrada dvojskla) nese i světlíky',
    () => blizko(prip(mat, 'skn') - prip(bez, 'skn'), m2, 1e-9));
  test('materiál (standard): lišty a terče jako sklo', () => mat.dily.terceKs === sklo.dily.terceKs);
  const matInt = spocti(zad({ bokyDveri: 'material' }, 'interiérová')), skloInt = spocti(zad({ bokyDveri: 'sklo' }, 'interiérová'));
  test('materiál (standard, interiér) stojí stejně jako sklo (VSG podle zasklení)',
    () => matInt.souhrn.zakladCena === skloInt.souhrn.zakladCena && matInt.zaskleni.vypln.material.boky.A.typ === 'C.skloVsg442Kc');

  /* Po stěnách. */
  const c = CENIK();
  const steny = (z, fn) => { const st = E.oplasteniStenyVychozi(z, c); fn(st); z.oplasteni = { rezim: 'poStenach', steny: st }; return z; };
  const pas = typ => [{ typ, doM: null }];
  const skloVych = spocti(steny(zad({ bokyDveri: 'sklo' }), () => {}));
  test('po stěnách, výchozí stěny: zapnutí režimu cenou nehne', () => skloVych.souhrn.zakladCena === sklo.souhrn.zakladCena);
  const skloCetrisA = spocti(steny(zad({ bokyDveri: 'sklo', nadDvermi: 'sklo' }), st => { st.A.pasy = pas('C.cetrisKc'); }));
  test('po stěnách, stěna A z Cetrisu: „sklo" zůstává sklem čelní stěny ze standardu',
    () => skloCetrisA.zaskleni.vypln.material.boky.A.typ === 'C.skloCelniKc' && skloCetrisA.zaskleni.vypln.material.nad.A.typ === 'C.skloCelniKc');
  /* Stěna A běžné šachty je celá nástupiště — bez světlíků nemá plochu
   * (N46), takže její pás z Cetrisu je v kalkulaci s nulou. */
  test('… a Cetrisem se neocení nic ze světlíků (dřív poměrem výšek pásů)', () => mn(skloCetrisA, 'CETRIS') === 0,
    () => mn(skloCetrisA, 'CETRIS'));
  test('… světlíky jdou do řádku skla VSG 4.4.1',
    () => blizko(mn(skloCetrisA, 'SKLO VSG 4.4.1'), skloCetrisA.zaskleni.svetliky.m2 + skloCetrisA.zaskleni.svetlikyBoky.m2, 1e-9));
  const skloBezA = spocti(steny(zad({ bokyDveri: 'sklo' }), st => { st.A.pasy = pas('bez'); }));
  test('po stěnách, stěna A „bez — dodá stavba": boční světlíky se ocení sklem (ne za 0 Kč)',
    () => blizko(mn(skloBezA, 'SKLO VSG 4.4.1'), skloBezA.zaskleni.svetlikyBoky.m2, 1e-9) && skloBezA.zaskleni.svetlikyBoky.m2 > 0);
  const skloVsg442A = spocti(steny(zad({ bokyDveri: 'sklo' }, 'interiérová'), st => {
    st.A.pasy = [{ typ: 'C.skloCelniKc', doM: 3 }, { typ: 'C.skloVsg442Kc', doM: null }]; }));
  test('po stěnách, stěna A ze dvou skel: světlík celý převažujícím sklem (podle výšky pásů)',
    () => skloVsg442A.zaskleni.vypln.material.boky.A.typ === 'C.skloVsg442Kc');
  const skloDvojA = spocti(steny(zad({ bokyDveri: 'sklo' }), st => { st.A.pasy = pas('C.skloBokyKc'); }));
  test('po stěnách, stěna A z dvojskla: světlík je z dvojskla (typ stěny A)',
    () => skloDvojA.zaskleni.vypln.material.boky.A.typ === 'C.skloBokyKc');

  const matCetris = spocti(steny(zad({ bokyDveri: 'material', nadDvermi: 'material' }), st => {
    st.B.pasy = pas('C.cetrisKc'); st.C.pasy = pas('C.cetrisKc'); st.D.pasy = pas('C.cetrisKc'); }));
  const m2Nad = matCetris.zaskleni.vypln.nadM2, m2Boky = matCetris.zaskleni.vypln.bokyM2;
  test('materiál po stěnách z Cetrisu: světlíky jsou deska Cetris', () => matCetris.zaskleni.vypln.material.boky.A.druh === 'deska'
    && matCetris.zaskleni.vypln.material.boky.A.typ === 'C.cetrisKc');
  test('… oceněná sazbou Cetrisu (řádek Cetrisu = stěny B, C, D + světlíky)', () => {
    const steny3 = matCetris.oplasteni.pasy.filter(p => p.stena !== 'A').reduce((a, p) => a + p.m2, 0);
    return blizko(mn(matCetris, 'CETRIS'), steny3 + m2Nad + m2Boky, 1e-9);
  });
  const matSklo = spocti(steny(zad({ bokyDveri: 'material', nadDvermi: 'material' }), () => {}));
  test('… deska nemá lišty ani terče světlíku (terče o 2 × N méně než u skla)',
    () => matSklo.dily.terceKs - matCetris.dily.terceKs === 2 * 10, () => [matSklo.dily.terceKs, matCetris.dily.terceKs]);
  const matCetrisL = spocti(steny(zad({ bokyDveri: 'material', nadDvermi: 'material', zaskleni: 'mezi příčníky' }), st => {
    st.B.pasy = pas('C.cetrisKc'); st.C.pasy = pas('C.cetrisKc'); st.D.pasy = pas('C.cetrisKc'); }));
  const matSkloL = spocti(steny(zad({ bokyDveri: 'material', nadDvermi: 'material', zaskleni: 'mezi příčníky' }), () => {}));
  test('… ani lišty (boky 8 na světlík, nad dveřmi 4 na nástupiště)',
    () => matSkloL.dily.listyKs - matCetrisL.dily.listyKs === 8 * 10 + 4 * 5, () => [matSkloL.dily.listyKs, matCetrisL.dily.listyKs]);
  test('… konstrukce a montáž zůstávají jako u skla', () => matCetris.parametry.sloupkyPortalu === 10
    && matCetris.montaz.hodinyNavic.svetlik === 0);
  const matMix = spocti(steny(zad({ bokyDveri: 'material' }), st => { st.B.pasy = pas('C.cetrisKc'); }));
  test('materiál po stěnách: B z Cetrisu, C a D z dvojskla → převažuje dvojsklo',
    () => matMix.zaskleni.vypln.material.boky.A.typ === 'C.skloBokyKc');
  const matMix2 = spocti(steny(zad({ bokyDveri: 'material' }), st => { st.B.pasy = pas('C.cetrisKc'); st.D.pasy = pas('C.cetrisKc'); }));
  test('materiál po stěnách: B a D z Cetrisu, jen C z dvojskla → převažuje Cetris',
    () => matMix2.zaskleni.vypln.material.boky.A.typ === 'C.cetrisKc');
  const matJine = spocti(steny(zad({ bokyDveri: 'material' }), st => {
    ['B', 'C', 'D'].forEach(k => { st[k].pasy = [{ typ: 'jine', nazev: 'Trapéz', naklad: 800, doM: null }]; }); }));
  test('materiál po stěnách „jiné": deska s ručním názvem a sazbou v řádku téhož „jiné"',
    () => matJine.zaskleni.vypln.material.boky.A.druh === 'deska' && matJine.zaskleni.vypln.material.boky.A.nazev === 'Trapéz'
      && blizko(mn(matJine, 'TRAPÉZ'), matJine.oplasteni.pasy.filter(p => p.stena !== 'A').reduce((a, p) => a + p.m2, 0) + matJine.zaskleni.vypln.bokyM2, 1e-9));
  const matBez = spocti(steny(zad({ bokyDveri: 'material', nadDvermi: 'material' }), st => {
    st.B.pasy = pas('bez'); st.C.pasy = pas('bez'); st.D.pasy = pas('bez'); }));
  test('materiál po stěnách „bez — dodá stavba" = zajistí stavba (výplň 0 Kč, konstrukce naše)',
    () => matBez.zaskleni.vypln.material.boky.A.druh === 'stavba' && matBez.oplasteni.plochaCelkem === 0
      && matBez.parametry.sloupkyPortalu === 10 && matBez.montaz.hodinyNavic.svetlik === 0);
}

/* ---------- 6) nad dveřmi: bez / zajistí stavba ---------- */
for (const fixes of [true, false]) {
  const M = fixes ? 'Model 2' : 'Model 1';
  const bez = spocti(zad({ nadDvermi: 'bez' }), fixes), st = spocti(zad({ nadDvermi: 'stavba' }), fixes);
  /* #378 (rozhodnutí J. V. 1. 10. 2026): odpočet 0,2 h × nástupiště při „bez"
   * zůstává jen v Modelu 1 (1:1 předloha); Model 2 ho nedělá. */
  if (fixes) test(M + ': nad dveřmi „bez" montáž neubírá (#378, rozhodnutí J. V. 1. 10. 2026)',
    () => bez.montaz.hodinyNavic.svetlik === 0, () => bez.montaz.hodinyNavic.svetlik);
  else test(M + ': nad dveřmi „bez" ubírá montáž 0,2 h na nástupiště (jako předloha)',
    () => blizko(bez.montaz.hodinyNavic.svetlik, -1), () => bez.montaz.hodinyNavic.svetlik);
  test(M + ': „zajistí stavba" montáž neubírá (rozhodnutí J. V. 30. 9. 2026)', () => st.montaz.hodinyNavic.svetlik === 0);
  test(M + ': ' + (fixes ? '„zajistí stavba" má stejnou montáž jako „bez"' : '„zajistí stavba" je o montáž dražší než „bez"') + ', výplň 0 Kč', () =>
    blizko(mn(st, 'MONTÁŽ NA STAVBĚ') - mn(bez, 'MONTÁŽ NA STAVBĚ'), fixes ? 0 : 0.2 * 5 * 4, 1e-9)
    && blizko(st.souctySekci.oplasteni.naklad, bez.souctySekci.oplasteni.naklad, 1e-6),
    () => [mn(st, 'MONTÁŽ NA STAVBĚ'), mn(bez, 'MONTÁŽ NA STAVBĚ')]);
}
{
  /* Model 1 napodobuje chybu předlohy (buňka D19 místo D18): hloubka bočního
   * zasklení se řídí tím, jestli je světlík nad dveřmi „zaškrtnutý".
   * Materiál opláštění se v tom bere jako sklo — tak jako do 30. 9. —, ať se
   * Model 1 nehne; o skle světlíku samotném rozhoduje materiál stěn. */
  const m1 = x => spocti(zad(Object.assign({ zaskleni: 'mezi příčníky' }, x)), false);
  test('Model 1: materiál nad dveřmi dává stejnou hloubku bočního zasklení jako sklo (D19)',
    () => blizko(m1({ nadDvermi: 'material' }).zaskleni.bocni.m2, m1({ nadDvermi: 'sklo' }).zaskleni.bocni.m2)
      && !blizko(m1({ nadDvermi: 'sklo' }).zaskleni.bocni.m2, m1({ nadDvermi: 'bez' }).zaskleni.bocni.m2, 1e-6));
}
{
  const sklo = spocti(zad({ nadDvermi: 'sklo' })), mat = spocti(zad({ nadDvermi: 'material' }));
  test('nad dveřmi materiál (standard, exteriér) = dvojsklo boků, ne VSG čelní stěny',
    () => mat.zaskleni.vypln.material.nad.A.typ === 'C.skloBokyKc' && sklo.zaskleni.vypln.material.nad.A.typ === 'C.skloCelniKc'
      && blizko(mat.zaskleni.celniM2, 0, 1e-9) && blizko(sklo.zaskleni.celniM2, sklo.zaskleni.svetliky.m2, 1e-9));
}

/* ---------- 7) průchozí šachta ---------- */
{
  const x = { pruchoziSachta: true, nastupisteA: 3, nastupisteC: 2, patra: 3, bokyDveri: 'sklo' };
  const r = spocti(zad(x));
  const n = r.zaskleni.nastupisteSten, boky = r.zaskleni.svetlikyBoky.m2;
  test('průchozí: boční světlíky se dělí mezi A a C podle dveří (3 : 2)',
    () => blizko(n.A.svetliky - r.zaskleni.svetliky.m2, boky * 3 / 5, 1e-9)
      && blizko(n.C.svetliky - r.zaskleni.svetlikyZadni.m2, boky * 2 / 5, 1e-9), () => [n.A.svetliky, n.C.svetliky, boky]);
  test('průchozí: sklo zadních dveří = sklo stěny C (u exteriéru dvojsklo)',
    () => r.zaskleni.vypln.material.boky.C.typ === 'C.skloBokyKc' && r.zaskleni.vypln.material.boky.A.typ === 'C.skloCelniKc');
}

/* ---------- 8) převod starších zakázek ---------- */
{
  /* Obal kvůli pojistce proti prázdnému testu: nad kódem bez převodu (před
   * #375) sada doběhne a selže, místo aby spadla na chybějící funkci. */
  const migr = z => (typeof E.svetlikyBokyMigrace === 'function' ? E.svetlikyBokyMigrace(z) : false);
  const stara = (strany, vypln) => { const z = zad({ svetlikyBoky: strany, nadDvermi: 'sklo' }); delete z.bokyDveri; delete z.svetlikyBokyKs;
    if (vypln === undefined) delete z.bokyVypln; else z.bokyVypln = vypln; return z; };
  const z0 = stara(0, 'plech'); migr(z0);
  test('převod: strany 0 → boky „bez"', () => z0.bokyDveri === 'bez');
  const z2 = stara(2, 'plech'); migr(z2);
  test('převod: strany 2 → výplň z „Výplně boků", počet automaticky',
    () => z2.bokyDveri === 'plech' && (z2.svetlikyBokyKs === undefined || z2.svetlikyBokyKs === '') && E.bokyPocet(z2) === 10);
  const z2b = stara(2); migr(z2b);
  test('převod: chybějící výplň = sklo (jako dřív)', () => z2b.bokyDveri === 'sklo');
  const z1 = stara(1, 'stavba'); migr(z1);
  test('převod: strana 1 → výplň, počet = počet dveří zapsaný ručně',
    () => z1.bokyDveri === 'stavba' && z1.svetlikyBokyKs === 5 && E.bokyPocetRucne(z1) && E.bokyPocet(z1) === 5);
  test('převod je jednorázový (podruhé nic nemění)', () => E.svetlikyBokyMigrace(z1) === false && z1.svetlikyBokyKs === 5);
  test('starší zakázka se čte po staru i bez převodu', () => E.bokyVypln(stara(1, 'plech')) === 'plech'
    && E.bokyPocet(stara(1, 'plech')) === 5 && E.bokyVypln(stara(0, 'sklo')) === 'bez' && E.bokyPocet(stara(2)) === 10);

  /* Cena se převodem nehne — v obou modelech, uvnitř i venku, terče i lišty,
   * jedna i obě strany, všechny výplně, i průchozí šachta. */
  let shod = 0, celkem = 0; const rozdil = [];
  for (const fixes of [true, false]) for (const typ of ['exteriérová', 'interiérová'])
  for (const zaskleni of ['na terče', 'mezi příčníky']) for (const strany of [0, 1, 2])
  for (const vypln of [undefined, 'sklo', 'plech', 'stavba']) for (const pr of [false, true]) {
    const z = stara(strany, vypln); z.typSachty = typ; z.profily = kop(E.PROFILY_VYCHOZI[typ]); z.zaskleni = zaskleni;
    if (pr) Object.assign(z, { pruchoziSachta: true, nastupisteA: 3, nastupisteC: 2, patra: 3 });
    const a = spocti(kop(z), fixes); const zm = kop(z); migr(zm); const b = spocti(zm, fixes);
    celkem++;
    if (a.souhrn.zakladCena === b.souhrn.zakladCena && blizko(a.souhrn.zakladNaklad, b.souhrn.zakladNaklad, 1e-6)
      && a.souhrn.priplatkyCena === b.souhrn.priplatkyCena) shod++;
    else rozdil.push({ fixes, typ, zaskleni, strany, vypln, pr, a: a.souhrn.zakladCena, b: b.souhrn.zakladCena });
  }
  test('převod nehne cenou (' + celkem + ' zadání)', () => shod === celkem && celkem === 192, () => rozdil.slice(0, 3));

  /* Import zakázky převede všechny varianty, i odeslanou (zmrazený otisk
   * zůstává, výsledek se nemění); odemčení administrátorem pak na serveru
   * nenarazí na rozdíl dat. */
  const zk = require('./zakazka.js');
  const zak = zk.novaZakazka();
  const v1 = zak.varianty[0];
  v1.data.ock.zadani = stara(1, 'plech');
  const v2 = JSON.parse(JSON.stringify(v1)); v2.id = 'v2'; v2.zamek = { zamceno: true, kdy: '2026-09-01' };
  v2.data.ock.zadani = stara(2, 'sklo');
  zak.varianty.push(v2);
  const imp = zk.importZakazka(JSON.parse(JSON.stringify(zak)));
  const i1 = imp.varianty[0].data.ock.zadani, i2 = imp.varianty[1].data.ock.zadani;
  test('import: rozpracovaná varianta převedena (strana 1 → počet 5 ručně)', () => i1.bokyDveri === 'plech' && i1.svetlikyBokyKs === 5);
  test('import: i odeslaná varianta převedena, cena stejná', () => i2.bokyDveri === 'sklo'
    && spocti(i2).souhrn.zakladCena === spocti(v2.data.ock.zadani).souhrn.zakladCena);
  test('import podruhé nic nemění (server porovnává převedené verze)',
    () => JSON.stringify(zk.importZakazka(JSON.parse(JSON.stringify(imp))).varianty.map(v => v.data.ock.zadani))
      === JSON.stringify(imp.varianty.map(v => v.data.ock.zadani)));
}

/* ---------- 9) kontrola před nabídkou ---------- */
{
  const sl = require('./sleva.js'); global.slevaPodil = sl.slevaPodil;
  const kt = require('./kontroly.js');
  const nal = z => kt.kontrolyProved({ zadani: z, vysledek: spocti(z) }).nalezy.find(n => n.kod === 'bokyDveri');
  const zBez = zad({ bokyDveri: 'bez' }), n1 = nal(zBez);
  const mezTxt = String(Math.round(spocti(zBez).zaskleni.vypln.mezera * 100) / 100).replace('.', ',');
  test('kontrola: boky „bez" upozorní na mezeru vedle dveří (s rozměrem)', () => !!n1 && mezTxt === '0,6'
    && n1.text.indexOf('mezera ' + mezTxt + ' m') >= 0, () => n1 && n1.text);
  test('kontrola: boky „bez" bez mezery (dveře přes celou šířku) mlčí', () => !nal(zad({ bokyDveri: 'bez', cistyVstupMm: 1400 })));
  test('kontrola: 10 světlíků na 5 dveří mlčí', () => !nal(zad({ bokyDveri: 'sklo' })));
  const n2 = nal(zad({ bokyDveri: 'sklo', svetlikyBokyKs: 12 }));
  test('kontrola: víc než dva světlíky na dveře', () => !!n2 && /víc než dva/.test(n2.text) && /12/.test(n2.text), () => n2 && n2.text);
  const n3 = nal(zad({ bokyDveri: 'sklo', svetlikyBokyKs: 3 }));
  test('kontrola: dveře bez světlíku (3 na 5 dveří) i s mezerou', () => !!n3 && /u 2 dveří/.test(n3.text) && /mezera/.test(n3.text), () => n3 && n3.text);
  const n4 = nal(zad({ bokyDveri: 'plech', svetlikyBokyKs: 0 }));
  test('kontrola: počet 0 při zvolené výplni', () => !!n4 && /počet je 0/.test(n4.text), () => n4 && n4.text);
  test('kontrola je jen upozornění (nezastaví dokument)', () => !!n1 && n1.uroven !== kt.KONTROLY_UROVEN_ZABRANA);
}

/* ---------- 10) technická specifikace a překlad ---------- */
{
  const tsm = require('./techspec.js');
  const pole = id => { let p = null; tsm.TECHSPEC_DEF.forEach(s => s.pole.forEach(x => { if (x.id === id) p = x; })); return p; };
  const t = (id, z) => pole(id).prefill(spocti(z), z, CENIK(), 'cz');
  test('spec: pole „SVĚTLÍKY U ŠACHETNÍCH DVEŘÍ" existuje', () => !!pole('svetlikyDveri'));
  test('spec: 10 ks, sklo VSG 4.4.1, na terče', () => t('svetlikyDveri', zad({ bokyDveri: 'sklo' }))
    === 'Světlíky na bocích dveří: 10 ks, sklo VSG 4.4.1, na terče', () => t('svetlikyDveri', zad({ bokyDveri: 'sklo' })));
  test('spec: nad dveřmi plech + boky materiál (dvojsklo) v lištách', () => t('svetlikyDveri',
    zad({ nadDvermi: 'plech', bokyDveri: 'material', svetlikyBokyKs: 7, zaskleni: 'mezi příčníky' }))
    === 'Nadpraží nad šachetními dveřmi: 5 ks, plech; Světlíky na bocích dveří: 7 ks, izolační dvojsklo, v lištách',
    () => t('svetlikyDveri', zad({ nadDvermi: 'plech', bokyDveri: 'material', svetlikyBokyKs: 7, zaskleni: 'mezi příčníky' })));
  test('spec: zajistí stavba (nad i boky)', () => t('svetlikyDveri', zad({ nadDvermi: 'stavba', bokyDveri: 'stavba' }))
    === 'Nadpraží nad šachetními dveřmi zajistí objednatel; Světlíky na bocích dveří: 10 ks, výplň zajistí objednatel');
  test('spec: bez světlíků = „ -" (řádek zmizí)', () => t('svetlikyDveri', zad({})) === ' -');
  test('spec: členění — 2 na dveře „na obou stranách", 1 na dveře „na jedné straně", jinak „na bocích"',
    () => t('portalyCleneni', zad({ nadDvermi: 'sklo', bokyDveri: 'sklo' })) === 'světlík nade dveřmi a na obou stranách š. dveří'
      && t('portalyCleneni', zad({ nadDvermi: 'sklo', bokyDveri: 'sklo', svetlikyBokyKs: 5 })) === 'světlík nade dveřmi a na jedné straně š. dveří'
      && t('portalyCleneni', zad({ nadDvermi: 'sklo', bokyDveri: 'sklo', svetlikyBokyKs: 7 })) === 'světlík nade dveřmi a na bocích š. dveří');
  test('spec: nadsvětlíky u exteriéru — sklo = VSG (sklo čelní stěny), materiál = dvojsklo',
    () => t('oplasteniNadsvetliku', zad({ nadDvermi: 'sklo' })) === 'vrstvené bezpečnostní sklo VSG vsazené do rámečků'
      && t('oplasteniNadsvetliku', zad({ nadDvermi: 'material' })) === 'izolační dvojskla vsazená do lakovaných rámečků');
  const pr = require('./preklad.js');
  let cz = '';
  try { cz = t('svetlikyDveri', zad({ nadDvermi: 'sklo', bokyDveri: 'plech' })); } catch (e) { cz = ''; }
  test('překlad: věta se přeloží do EN, DE i FR (vzor + hesla slovníku)', () => ['en', 'de', 'fr'].every(L => pr.trStav(cz, L).prelozeno)
    && pr.tr(cz, 'en') === 'Transom light above the landing doors: 5 pcs, laminated safety glass VSG 4.4.1, on glazing fixing points; '
      + 'Side lights beside the landing doors: 10 pcs, sheet metal', () => pr.tr(cz, 'en'));
  test('překlad: ruční název materiálu („jiné") větu nepřeloží — nic se nevymýšlí',
    () => !pr.trStav('Světlíky na bocích dveří: 4 ks, Trapéz', 'en').prelozeno);
  test('překlad: nadpis pole a nová znění členění mají hesla', () => ['SVĚTLÍKY U ŠACHETNÍCH DVEŘÍ',
    'světlík nade dveřmi a na bocích š. dveří', 'světlíky na bocích š. dveří', 'plechová výplň na bocích dveří']
    .every(s => ['en', 'de', 'fr'].every(L => pr.trStav(s, L).prelozeno)));
}

/* ---------- 11) nabídka ---------- */
{
  const fm = require('./firma.js'); Object.keys(fm).forEach(k => { global[k] = fm[k]; });
  const pr = require('./preklad.js'); Object.keys(pr).forEach(k => { global[k] = pr[k]; });
  const zk = require('./zakazka.js');
  const { nabidkaData } = require('./nabidka.js');
  const zak = zk.novaZakazka(); zak.cislo = '2026 - OPR - CN - 9375';
  Object.assign(zak.varianty[0].data.ock.zadani, zad({ bokyDveri: 'sklo', nadDvermi: 'bez' }));
  const ph = nabidkaData(zak, zak.varianty[0], J, 'cz').placeholders;
  test('nabídka: zástupce TS_SVETLIKY_DVERI nese větu s počtem', () => ph.TS_SVETLIKY_DVERI === 'Světlíky na bocích dveří: 10 ks, sklo VSG 4.4.1, na terče',
    () => ph.TS_SVETLIKY_DVERI);
  const zak2 = zk.novaZakazka(); Object.assign(zak2.varianty[0].data.ock.zadani, zad({}));
  test('nabídka bez světlíků: zástupce prázdný (řádek zmizí)', () => nabidkaData(zak2, zak2.varianty[0], J, 'cz').placeholders.TS_SVETLIKY_DVERI === '');
}

/* ---------- 12) server: volba mimo výčet neprojde ---------- */
{
  const U = require('./uloziste.js');
  const zk = require('./zakazka.js');
  global.OPLASTENI_TYPY = E.OPLASTENI_TYPY;
  const s1 = fn => { const z = zk.novaZakazka(); fn(z.varianty[0].data.ock.zadani); return U.uloTypyProblemy(z); };
  test('server: seznam voleb = NAD_DVERMI_VOLBY z jádra', () => JSON.stringify(U.ULO_VYPLN_DVERI) === JSON.stringify(E.NAD_DVERMI_VOLBY));
  test('server: skript v `bokyDveri` neprojde', () => s1(z => { z.bokyDveri = '<img src=x onerror=alert(1)>'; }).some(p => /bokyDveri/.test(p.kde)));
  test('server: neznámá volba nad dveřmi neprojde', () => s1(z => { z.nadDvermi = 'zlato'; }).some(p => /nadDvermi/.test(p.kde)));
  test('server: text místo počtu světlíků neprojde', () => s1(z => { z.svetlikyBokyKs = '"><b>'; }).some(p => /svetlikyBokyKs/.test(p.kde)));
  test('server: platné volby a prázdný počet projdou', () => s1(z => { z.bokyDveri = 'material'; z.svetlikyBokyKs = ''; z.nadDvermi = 'stavba'; }).length === 0);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
