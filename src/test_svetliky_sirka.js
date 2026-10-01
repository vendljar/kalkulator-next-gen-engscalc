/* ŠÍŘKA BOČNÍHO SVĚTLÍKU PŘI RUČNÍM POČTU SVĚTLÍKŮ (#381, rozhodnutí J. V.
 * 1. 10. 2026: „s návrhem šířky bočního světlíku souhlasím, zapracuj ho pro
 * model 2 (modelu 1 nic neměň)"; výchozí odpovědi otázek 1–6 a 8 návrhu
 * platí, otázka 7 jen Model 2).
 *
 * Proč: podle #375 stojí dveře s jedním světlíkem u sloupku a světlík vyplní
 * celou mezeru vedle dveří, takže plocha boků je od D do 2D světlíků stejná
 * (zakázka ze snímku J. V.: 5 × 0,60 m × 2,2 m = 6,60 m² pro 5 i pro 10 ks).
 * Obchodník teď při RUČNÍM počtu v Modelu 2 vidí a smí přepsat šířku
 * jednoho světlíku; plocha boků je pak počet × šířka × 2,2 m.
 *
 * Hlídá se:
 *   1) data: `svetlikyBokySirkaMm` — prázdno / chybí = předpočítaná, číslo =
 *      ruční šířka v celých mm (prázdno není nula),
 *   2) zakázka ze snímku: mezera 0,60 m, ruční 5 ks bez šířky = 6,60 m²
 *      (beze změny), 300 mm → 3,30 m², 450 mm → 4,95 m², plech v kg
 *      sleduje plochu, konstrukce a montáž dál po kusech,
 *   3) MODEL 1 SE NEMĚNÍ ani o haléř — celý výsledek se šířkou v datech je
 *      bajt po bajtu týž jako bez ní; automatický počet šířku ignoruje,
 *   4) předpočítaná šířka = dnešní plocha / (2,2 × N) — smíšené 7 ks =
 *      5 · 0,6 / 7 m,
 *   5) kontrola před nabídkou (jen Model 2, jen s ruční šířkou): širší než
 *      mezera a „nevejdou se" = zábrana, která zastaví dokumenty OCK; zbytek
 *      mezery = upozornění,
 *   6) technická specifikace „…, šířka 300 mm" a překlad EN/DE/FR, nabídka,
 *   7) server odmítne text místo šířky.
 * Čísla jsou ze zkušebního ceníku, skutečné sazby do repozitáře nepatří. */
const E = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
const J = require('./jekly.json');
const kop = x => JSON.parse(JSON.stringify(x));
/* Jádro je v aplikaci globální — kontrola, specifikace i zakázka ho tak čtou. */
['nadDvermiVypln', 'bokyVypln', 'bokyPocet', 'bokyPocetAuto', 'bokyPocetRucne', 'bokySirkaRucniMm', 'nastupisteCelkem',
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

/* Zakázka ze snímku J. V. (1. 10. 2026): exteriér, vnitřní šířka 1,5 m,
 * hloubka 1, zdvih 8, přejezd 2, prohlubeň 2, 5 nástupišť, 4 sloupky, na
 * terče, zapuštěný portál, rozteč 1,25, rám 100, vstup 800, nad dveřmi plech,
 * boky sklo. Šířka stěny 1,68 m, otvor dveří 1,04 m → mezera 0,60 m. */
function zad(x) {
  const z = kop(E.DEFAULT_ZADANI);
  Object.assign(z, { typSachty: 'exteriérová', profily: kop(E.PROFILY_VYCHOZI['exteriérová']), zaskleni: 'na terče',
    sirka: 1.5, hloubka: 1, zdvih: 8, prejezd: 2, prohluben: 2, nastupiste: 5, rohoveSloupky: 4,
    typPortalu: 'zapuštěný', roztec: 1.25, sirkaRamuMm: 100, cistyVstupMm: 800,
    nadDvermi: 'plech', bokyDveri: 'sklo', svetlikyBokyKs: '', svetlikyBokySirkaMm: '' });
  return Object.assign(z, x || {});
}
/* Bez klíče šířky — tak vypadá zakázka uložená před #381. */
const bezKlice = z => { const x = kop(z); delete x.svetlikyBokySirkaMm; return x; };
const spocti = (z, fixes) => E.vypocet(z, CENIK(), J, fixes !== false);
const radek = (r, kus) => {
  for (const s of ['hrubaOck', 'oplasteni', 'volitelne', 'rezie']) {
    const it = (r.sekce[s] || []).find(x => String(x.origNazev).indexOf(kus) >= 0);
    if (it) return it;
  }
  return null;
};
const mn = (r, kus) => { const x = radek(r, kus); return x ? x.mnozstvi : 0; };
const VSG = 'MATERIÁL VSG 4.4.1', PL_MAT = 'PLECHY - OPLECH. DVEŘÍ A PODEST (MATERIÁL)';
const vy = r => r.zaskleni.vypln;

/* ---------- 1) data ---------- */
test('výchozí zadání nese šířku prázdnou (= předpočítaná)', () => E.DEFAULT_ZADANI.svetlikyBokySirkaMm === '',
  () => E.DEFAULT_ZADANI.svetlikyBokySirkaMm);
test('bokySirkaRucniMm: prázdno, chybějící klíč i text = předpočítaná (null)', () => typeof E.bokySirkaRucniMm === 'function'
  && E.bokySirkaRucniMm({}) === null && E.bokySirkaRucniMm({ svetlikyBokySirkaMm: '' }) === null
  && E.bokySirkaRucniMm({ svetlikyBokySirkaMm: null }) === null && E.bokySirkaRucniMm({ svetlikyBokySirkaMm: 'abc' }) === null
  && E.bokySirkaRucniMm(null) === null);
test('bokySirkaRucniMm: číslo i číslo jako text, celé mm, nula je platná, záporné = 0', () =>
  E.bokySirkaRucniMm({ svetlikyBokySirkaMm: 300 }) === 300 && E.bokySirkaRucniMm({ svetlikyBokySirkaMm: '450' }) === 450
  && E.bokySirkaRucniMm({ svetlikyBokySirkaMm: 300.4 }) === 300 && E.bokySirkaRucniMm({ svetlikyBokySirkaMm: 0 }) === 0
  && E.bokySirkaRucniMm({ svetlikyBokySirkaMm: -20 }) === 0);

/* ---------- 2) zakázka ze snímku, Model 2 ---------- */
const r5 = spocti(zad({ svetlikyBokyKs: 5 }));
test('snímek: mezera vedle dveří 0,60 m (1,68 − 1,04 − 0,04)', () => blizko(vy(r5).mezera, 0.6, 1e-9), () => vy(r5).mezera);
test('snímek: ruční 5 ks bez šířky = 6,60 m² (beze změny proti #375)',
  () => blizko(vy(r5).bokyM2, 6.6, 1e-9) && blizko(r5.zaskleni.svetlikyBoky.m2, 6.6, 1e-9) && blizko(mn(r5, VSG), 6.6, 1e-9),
  () => [vy(r5).bokyM2, mn(r5, VSG)]);
test('snímek: bez šířky — předpočítaná 0,60 m (jeden světlík přes celou mezeru), ruční null, použitá 0,60 m',
  () => blizko(vy(r5).sirkaPredpocitana, 0.6, 1e-12) && vy(r5).sirkaRucne === null && blizko(vy(r5).sirka, 0.6, 1e-12),
  () => [vy(r5).sirkaPredpocitana, vy(r5).sirkaRucne, vy(r5).sirka]);
test('snímek: prázdná šířka = výsledek bajt po bajtu jako zakázka bez klíče (starší zakázka, cena beze změny)',
  () => JSON.stringify(r5) === JSON.stringify(spocti(bezKlice(zad({ svetlikyBokyKs: 5 })))));
const r300 = spocti(zad({ svetlikyBokyKs: 5, svetlikyBokySirkaMm: 300 }));
test('snímek: 5 ks × 300 mm = 3,30 m² (5 × 0,3 × 2,2)',
  () => blizko(vy(r300).bokyM2, 3.3, 1e-9) && blizko(r300.zaskleni.svetlikyBoky.m2, 3.3, 1e-9) && blizko(mn(r300, VSG), 3.3, 1e-9),
  () => [vy(r300).bokyM2, mn(r300, VSG)]);
test('snímek: 300 mm — ruční 0,30 m, použitá 0,30 m, předpočítaná dál 0,60 m',
  () => blizko(vy(r300).sirkaRucne, 0.3, 1e-12) && blizko(vy(r300).sirka, 0.3, 1e-12) && blizko(vy(r300).sirkaPredpocitana, 0.6, 1e-12),
  () => [vy(r300).sirkaRucne, vy(r300).sirka, vy(r300).sirkaPredpocitana]);
const r450 = spocti(zad({ svetlikyBokyKs: 5, svetlikyBokySirkaMm: 450 }));
test('snímek: 5 ks × 450 mm = 4,95 m²', () => blizko(vy(r450).bokyM2, 4.95, 1e-9) && blizko(mn(r450, VSG), 4.95, 1e-9),
  () => vy(r450).bokyM2);
test('šířka jako text ze vstupu („300") počítá stejně', () => blizko(vy(spocti(zad({ svetlikyBokyKs: 5, svetlikyBokySirkaMm: '300' }))).bokyM2, 3.3, 1e-9));
test('šířka 0 mm je platná ruční hodnota (plocha 0), prázdno není nula',
  () => vy(spocti(zad({ svetlikyBokyKs: 5, svetlikyBokySirkaMm: 0 }))).bokyM2 === 0
    && blizko(vy(spocti(zad({ svetlikyBokyKs: 5, svetlikyBokySirkaMm: '' }))).bokyM2, 6.6, 1e-9));
test('menší šířka zlevní nabídku (sklo boků je v ceně)', () => r300.souhrn.zakladCena < r5.souhrn.zakladCena,
  () => [r300.souhrn.zakladCena, r5.souhrn.zakladCena]);
test('konstrukce a montáž dál po kusech (sloupky portálu, krátké příčníky, 0,5 h na světlík, tabule)',
  () => r300.parametry.sloupkyPortalu === r5.parametry.sloupkyPortalu && r300.parametry.kratkePricniky === r5.parametry.kratkePricniky
    && r300.montaz.hodinyNavic.svetlikyBoky === r5.montaz.hodinyNavic.svetlikyBoky && r300.zaskleni.svetlikyBoky.ks === r5.zaskleni.svetlikyBoky.ks
    && r300.dily.terceKs === r5.dily.terceKs);
{
  const pl = spocti(zad({ bokyDveri: 'plech', svetlikyBokyKs: 5 }));
  const pl300 = spocti(zad({ bokyDveri: 'plech', svetlikyBokyKs: 5, svetlikyBokySirkaMm: 300 }));
  test('plech: plocha výplně boků sleduje šířku (6,60 → 3,30 m²)',
    () => blizko(vy(pl).bokyPlechM2, 6.6, 1e-9) && blizko(vy(pl300).bokyPlechM2, 3.3, 1e-9), () => [vy(pl).bokyPlechM2, vy(pl300).bokyPlechM2]);
  test('plech: kg v plechu dveří klesnou o 3,30 m² × 8,5 kg/m²', () => blizko(mn(pl, PL_MAT) - mn(pl300, PL_MAT), 3.3 * 8.5, 1e-6),
    () => [mn(pl, PL_MAT), mn(pl300, PL_MAT)]);
  test('plech: lakování obou stran sleduje plochu', () => blizko(pl.lakovani.tomas - pl300.lakovani.tomas, 2 * 3.3 * CENIK().lak.tomasOplechM2, 1e-6));
  ['material', 'stavba'].forEach(v => {
    const a = spocti(zad({ bokyDveri: v, svetlikyBokyKs: 5, svetlikyBokySirkaMm: 300 }));
    test('výplň „' + v + '": plocha boků = počet × šířka × 2,2 (3,30 m²)', () => blizko(vy(a).bokyM2, 3.3, 1e-9), () => vy(a).bokyM2);
  });
  const mat = spocti(zad({ bokyDveri: 'material', svetlikyBokyKs: 5 })), mat300 = spocti(zad({ bokyDveri: 'material', svetlikyBokyKs: 5, svetlikyBokySirkaMm: 300 }));
  test('materiál opláštění: řádek boků a zad klesne o 3,30 m²', () => blizko(mat.zaskleni.bokyZadniM2 - mat300.zaskleni.bokyZadniM2, 3.3, 1e-9));
  const pr = x => zad(Object.assign({ pruchoziSachta: true, nastupisteA: 3, nastupisteC: 2, patra: 3 }, x));
  const p300 = spocti(pr({ svetlikyBokyKs: 5, svetlikyBokySirkaMm: 300 }));
  test('průchozí šachta: plocha boků = 5 × 0,3 × 2,2 i se dveřmi na A a C', () => blizko(vy(p300).bokyM2, 3.3, 1e-9)
    && blizko(p300.zaskleni.svetlikyBoky.m2, 3.3, 1e-9), () => vy(p300).bokyM2);
}

/* ---------- 3) Model 1 se nemění, automatika šířku ignoruje ---------- */
{
  const m1 = spocti(zad({ svetlikyBokyKs: 5, svetlikyBokySirkaMm: 300 }), false);
  test('Model 1 se šířkou 300 mm: plocha boků dál 6,60 m²', () => blizko(vy(m1).bokyM2, 6.6, 1e-9) && blizko(mn(m1, VSG), 6.6, 1e-9),
    () => vy(m1).bokyM2);
  test('Model 1: ruční šířka se nevydá (null) ani při uložené hodnotě; použitá = předpočítaná',
    () => vy(m1).sirkaRucne === null && blizko(vy(m1).sirka, 0.6, 1e-12) && blizko(vy(m1).sirkaPredpocitana, 0.6, 1e-12));
  /* Celý výsledek bajt po bajtu: šířka v datech, bez klíče, prázdná — přes
   * výplně, počty, šířky, zasklení, typ šachty i průchozí šachtu. */
  let shod = 0, celkem = 0; const rozdil = [];
  for (const typ of ['exteriérová', 'interiérová']) for (const zaskleni of ['na terče', 'mezi příčníky'])
  for (const boky of ['sklo', 'plech', 'material', 'stavba']) for (const ks of ['', 0, 3, 5, 7, 10, 12])
  for (const w of [0, 300, 600, 750, '450']) for (const pruchozi of [false, true]) {
    const z = zad({ typSachty: typ, profily: kop(E.PROFILY_VYCHOZI[typ]), zaskleni, bokyDveri: boky, svetlikyBokyKs: ks, svetlikyBokySirkaMm: w });
    if (pruchozi) Object.assign(z, { pruchoziSachta: true, nastupisteA: 3, nastupisteC: 2, patra: 3 });
    const a = JSON.stringify(spocti(z, false)), b = JSON.stringify(spocti(bezKlice(z), false));
    celkem++;
    if (a === b) shod++; else if (rozdil.length < 3) rozdil.push({ typ, zaskleni, boky, ks, w, pruchozi });
  }
  test('Model 1: celý výsledek se šířkou v datech = výsledek bez klíče (' + celkem + ' zadání, JSON)',
    () => shod === celkem && celkem === 1120, () => ({ shod, celkem, rozdil }));
  /* Automatický počet (prázdný) šířku ignoruje — v Modelu 2 taky. */
  const auto = zad({ svetlikyBokyKs: '', svetlikyBokySirkaMm: 300 });
  test('Model 2, automatický počet: uložená šířka se ignoruje (výsledek = bez klíče)',
    () => JSON.stringify(spocti(auto)) === JSON.stringify(spocti(bezKlice(auto))) && blizko(vy(spocti(auto)).bokyM2, 6.6, 1e-9)
      && vy(spocti(auto)).sirkaRucne === null);
  const bez = zad({ bokyDveri: 'bez', svetlikyBokyKs: 5, svetlikyBokySirkaMm: 300 });
  test('Model 2, boky „bez": uložená šířka se ignoruje', () => JSON.stringify(spocti(bez)) === JSON.stringify(spocti(bezKlice(bez)))
    && vy(spocti(bez)).bokyM2 === 0 && vy(spocti(bez)).sirkaRucne === null);
  const nula = zad({ svetlikyBokyKs: 0, svetlikyBokySirkaMm: 300 });
  test('Model 2, ruční počet 0: šířka se nečte (žádný světlík)', () => vy(spocti(nula)).bokyM2 === 0 && vy(spocti(nula)).sirkaRucne === null
    && vy(spocti(nula)).sirkaPredpocitana === 0);
  /* Starší zakázka (počet stran, bez `bokyDveri`) bez klíče — Model 2 i 1 beze změny. */
  const stara = zad({ svetlikyBoky: 1, bokyVypln: 'sklo' }); delete stara.bokyDveri; delete stara.svetlikyBokyKs; delete stara.svetlikyBokySirkaMm;
  test('starší zakázka (1 strana) bez klíče: plocha jako dřív (5 × 0,6 × 2,2), šířka předpočítaná',
    () => blizko(vy(spocti(stara)).bokyM2, 6.6, 1e-9) && vy(spocti(stara)).sirkaRucne === null && blizko(vy(spocti(stara)).sirkaPredpocitana, 0.6, 1e-12));
}

/* ---------- 4) předpočítaná šířka ---------- */
{
  const r7 = spocti(zad({ svetlikyBokyKs: 7 }));
  test('smíšené 7 ks (2 dveře se dvěma, 3 s jedním): předpočítaná = 5 · 0,6 / 7 m (průměr)',
    () => blizko(vy(r7).sirkaPredpocitana, 5 * 0.6 / 7, 1e-12) && blizko(vy(r7).sirka, 5 * 0.6 / 7, 1e-12)
      && vy(r7).dvereDva === 2 && vy(r7).dvereJeden === 3, () => [vy(r7).sirkaPredpocitana, 5 * 0.6 / 7]);
  test('předpočítaná šířka vrátí dnešní plochu: N × šířka × 2,2 = plocha boků',
    () => [3, 5, 7, 10, 12].every(N => { const v = vy(spocti(zad({ svetlikyBokyKs: N })));
      return blizko(N * v.sirkaPredpocitana * 2.2, v.bokyM2, 1e-9); }));
  test('10 ks ručně (dva u každých dveří): předpočítaná = polovina mezery 0,30 m',
    () => blizko(vy(spocti(zad({ svetlikyBokyKs: 10 }))).sirkaPredpocitana, 0.3, 1e-12));
  test('smíšené 7 ks × 400 mm ručně = 6,16 m²', () => blizko(vy(spocti(zad({ svetlikyBokyKs: 7, svetlikyBokySirkaMm: 400 }))).bokyM2, 6.16, 1e-9));
}

/* ---------- 4b) rám dveří v mezeře (dotaz J. V. 1. 10. 2026) ----------
 * „ve výpočtu šířky světlíků zřejmě nezohledňujeme šířku rámu dveří x2
 * (rám obchází dveře okolo)". Zohledňujeme: otvor dveří = čistý vstup
 * + 2 × šířka rámu + 2 × 20 mm (engine.js, sirkaDveri — vzorec z Excelu,
 * oba modely) a mezera vedle dveří = šířka skla − otvor − 40 mm. Kontrola
 * drží, že rám ubírá z mezery dvakrát. */
{
  const mez = (x, fixes) => spocti(zad(x), fixes).zaskleni.vypln.mezera;
  for (const fixes of [true, false]) {
    const m = fixes ? 'Model 2' : 'Model 1';
    test(m + ': otvor dveří = 800 + 2 × 100 + 2 × 20 = 1 040 mm, mezera 1 680 − 1 040 − 40 = 600 mm',
      () => blizko(spocti(zad(), fixes).odvozene.sirkaDveri, 1.04, 1e-12) && blizko(mez({}, fixes), 0.6, 1e-12),
      () => [spocti(zad(), fixes).odvozene.sirkaDveri, mez({}, fixes)]);
    test(m + ': rám o 50 mm širší ubere z mezery 100 mm (rám po obou stranách dveří)',
      () => blizko(mez({ sirkaRamuMm: 150 }, fixes), 0.5, 1e-12) && blizko(mez({ sirkaRamuMm: 0 }, fixes), 0.8, 1e-12),
      () => [mez({ sirkaRamuMm: 150 }, fixes), mez({ sirkaRamuMm: 0 }, fixes)]);
  }
}

/* ---------- 5) kontrola před nabídkou ---------- */
{
  const sl = require('./sleva.js'); global.slevaPodil = sl.slevaPodil;
  const kt = require('./kontroly.js');
  const stav = (z, fixes) => kt.kontrolyProved({ zadani: z, vysledek: spocti(z, fixes) });
  const nal = (z, fixes) => stav(z, fixes).nalezy.find(n => n.kod === 'bokyDveri');
  const n750 = nal(zad({ svetlikyBokyKs: 5, svetlikyBokySirkaMm: 750 }));
  test('750 mm > mezera 600 mm: ZÁBRANA s oběma rozměry', () => !!n750 && n750.uroven === kt.KONTROLY_UROVEN_ZABRANA
    && n750.text.indexOf('Boční světlík (750 mm) je širší než mezera vedle dveří (600 mm)') >= 0
    && /Dokument nevznikne, dokud se to neopraví\.$/.test(n750.text), () => n750);
  const s750 = stav(zad({ svetlikyBokyKs: 5, svetlikyBokySirkaMm: 750 }));
  test('… zábrana brání dokumentu (brani, kodyBrani)', () => s750.brani && s750.kodyBrani.indexOf('bokyDveri') >= 0, () => s750.kodyBrani);
  test('… a brána zastaví nabídku, SoD i krycí list OCK, ne dokumenty PROJ ani plnou moc',
    () => ['nabidka', 'nabidkaTisk', 'sod', 'kryci_bo', 'nabidka_en'].every(t => /Světlíky na bocích dveří: Boční světlík \(750 mm\)/.test(kt.kontrolyZabranaDokumentu(s750, t)))
      && ['nabidkaProj', 'sodProj', 'kryciproj_bo', 'plnaMoc'].every(t => kt.kontrolyZabranaDokumentu(s750, t) === ''),
    () => kt.kontrolyZabranaDokumentu(s750, 'nabidka'));
  const n700 = nal(zad({ svetlikyBokyKs: 5, svetlikyBokySirkaMm: 700 }));
  test('5 × 700 mm: širší než mezera = ZÁBRANA', () => !!n700 && n700.uroven === kt.KONTROLY_UROVEN_ZABRANA
    && /Boční světlík \(700 mm\) je širší než mezera vedle dveří \(600 mm\)/.test(n700.text), () => n700);
  const n10 = nal(zad({ svetlikyBokyKs: 10, svetlikyBokySirkaMm: 400 }));
  test('10 ks × 400 mm (4,00 m) proti mezerám 5 × 0,60 m: „nevejdou se" = ZÁBRANA', () => !!n10 && n10.uroven === kt.KONTROLY_UROVEN_ZABRANA
    && n10.text.indexOf('Boční světlíky se vedle dveří nevejdou: 10 × 400 mm = 4,00 m, mezery u 5 dveří jsou celkem 3,00 m') >= 0, () => n10);
  test('5 × 600 mm (přesně mezera) i 10 × 300 mm: bez nálezu', () => !nal(zad({ svetlikyBokyKs: 5, svetlikyBokySirkaMm: 600 }))
    && !nal(zad({ svetlikyBokyKs: 10, svetlikyBokySirkaMm: 300 })));
  test('7 ks × 429 mm (zaokrouhlená předpočítaná šířka) projde, 7 × 430 mm už se nevejde',
    () => !nal(zad({ svetlikyBokyKs: 7, svetlikyBokySirkaMm: 429 }))
      && (nal(zad({ svetlikyBokyKs: 7, svetlikyBokySirkaMm: 430 })) || {}).uroven === kt.KONTROLY_UROVEN_ZABRANA);
  /* ZBYTEK MEZERY PO DVEŘÍCH (J. V. 1. 10. 2026: „Text vedle dveří zůstane
   * 1,50 m je podle mně špatně"). Věta do té doby nesla součet přes všechny
   * dveře a zněla jako zbytek u jedněch dveří; teď říká zbytek u jedněch
   * dveří, z čeho vznikl, a součet zvlášť. */
  const n300 = nal(zad({ svetlikyBokyKs: 5, svetlikyBokySirkaMm: 300 }));
  test('5 × 300 mm (snímek J. V.): UPOZORNĚNÍ se zbytkem u jedněch dveří a součtem zvlášť',
    () => !!n300 && n300.uroven !== kt.KONTROLY_UROVEN_ZABRANA
      && n300.text === 'Vedle každých dveří zůstane neoceněných 300 mm (mezera 600 mm − světlík 300 mm), u 5 dveří celkem 1,50 m.',
    () => n300);
  const zb = (x, fixes) => kt.kontrolyBokySirka(spocti(zad(x), fixes)).upozorneni;
  test('10 × 250 mm (dva u každých dveří): zbytek 100 mm u dveří, celkem 0,50 m',
    () => zb({ svetlikyBokyKs: 10, svetlikyBokySirkaMm: 250 })[0]
      === 'Vedle každých dveří zůstane neoceněných 100 mm (mezera 600 mm − 2 světlíky po 250 mm), u 5 dveří celkem 0,50 m.',
    () => zb({ svetlikyBokyKs: 10, svetlikyBokySirkaMm: 250 }));
  test('smíšené 7 × 371 mm (šířka je průměr): jen součet a z čeho vznikl',
    () => zb({ svetlikyBokyKs: 7, svetlikyBokySirkaMm: 371 })[0]
      === 'Vedle dveří zůstane neoceněných celkem 0,40 m (mezery u 5 dveří 3,00 m − 7 světlíků po 371 mm).',
    () => zb({ svetlikyBokyKs: 7, svetlikyBokySirkaMm: 371 }));
  test('smíšené 3 světlíky u 2 dveří: „3 světlíky" (1. pád množného čísla)',
    () => zb({ nastupiste: 2, svetlikyBokyKs: 3, svetlikyBokySirkaMm: 300 })[0]
      === 'Vedle dveří zůstane neoceněných celkem 0,30 m (mezery u 2 dveří 1,20 m − 3 světlíky po 300 mm).',
    () => zb({ nastupiste: 2, svetlikyBokyKs: 3, svetlikyBokySirkaMm: 300 }));
  test('jedny dveře: zbytek bez součtu', () => zb({ nastupiste: 1, svetlikyBokyKs: 1, svetlikyBokySirkaMm: 300 })[0]
    === 'Vedle dveří zůstane neoceněných 300 mm (mezera 600 mm − světlík 300 mm).',
    () => zb({ nastupiste: 1, svetlikyBokyKs: 1, svetlikyBokySirkaMm: 300 }));
  test('mezi příčníky (mezera 252 mm), 5 × 200 mm: zbytek 52 mm u dveří, celkem 0,26 m',
    () => zb({ zaskleni: 'mezi příčníky', svetlikyBokyKs: 5, svetlikyBokySirkaMm: 200 })[0]
      === 'Vedle každých dveří zůstane neoceněných 52 mm (mezera 252 mm − světlík 200 mm), u 5 dveří celkem 0,26 m.',
    () => zb({ zaskleni: 'mezi příčníky', svetlikyBokyKs: 5, svetlikyBokySirkaMm: 200 }));
  test('… upozornění dokument nezastaví', () => !stav(zad({ svetlikyBokyKs: 5, svetlikyBokySirkaMm: 300 })).brani);
  test('zbytek do 5 mm se nehlásí (5 × 599 mm), 10 mm už ano (5 × 598 mm: 2 mm u dveří, celkem 0,01 m)',
    () => !nal(zad({ svetlikyBokyKs: 5, svetlikyBokySirkaMm: 599 }))
      && /zůstane neoceněných 2 mm \(mezera 600 mm − světlík 598 mm\), u 5 dveří celkem 0,01 m\./.test((nal(zad({ svetlikyBokyKs: 5, svetlikyBokySirkaMm: 598 })) || {}).text || ''));
  const n3 = nal(zad({ svetlikyBokyKs: 3, svetlikyBokySirkaMm: 300 }));
  test('3 ks × 300 mm: dveře bez světlíku hlásí pravidlo počtu, zbytek jen u dveří se světlíkem (ne „2,10 m")',
    () => !!n3 && /u 2 dveří nebude boční světlík — mezera 0,6 m tam zůstane neoceněná/.test(n3.text)
      && n3.text.indexOf('Vedle každých dveří se světlíkem zůstane neoceněných 300 mm (mezera 600 mm − světlík 300 mm), u 3 dveří celkem 0,90 m.') >= 0
      && !/2,10 m/.test(n3.text) && n3.uroven !== kt.KONTROLY_UROVEN_ZABRANA, () => n3);
  test('Model 1: šířka se nehlídá ani při 750 mm (bez nálezu, nic nebrání)',
    () => !nal(zad({ svetlikyBokyKs: 5, svetlikyBokySirkaMm: 750 }), false) && !stav(zad({ svetlikyBokyKs: 5, svetlikyBokySirkaMm: 750 }), false).brani);
  test('automatický počet s uloženou šířkou 750 mm: nic se nehlídá', () => !nal(zad({ svetlikyBokyKs: '', svetlikyBokySirkaMm: 750 })));
  test('pravidlo „Světlíky na bocích dveří" je v katalogu jako pravidlo, které umí zastavit dokument (jen OCK)',
    () => { const p = kt.kontrolyPravidla().find(x => x.kod === 'bokyDveri'); return !!p && p.zabranaMozna === true; });
  test('bez ruční šířky zůstávají nálezy počtu upozorněním (12 ks na 5 dveří)', () => {
    const n = nal(zad({ svetlikyBokyKs: 12 })); return !!n && n.uroven !== kt.KONTROLY_UROVEN_ZABRANA && /víc než dva/.test(n.text); });
  test('kontrolyBokySirka (pro nápovědu u pole) vrací tytéž věty jako kontrola', () => {
    const s = kt.kontrolyBokySirka(spocti(zad({ svetlikyBokyKs: 5, svetlikyBokySirkaMm: 750 })));
    const u = kt.kontrolyBokySirka(spocti(zad({ svetlikyBokyKs: 5, svetlikyBokySirkaMm: 300 })));
    const m1 = kt.kontrolyBokySirka(spocti(zad({ svetlikyBokyKs: 5, svetlikyBokySirkaMm: 750 }), false));
    return s.zabrana.length === 1 && n750.text.indexOf(s.zabrana[0]) === 0 && !s.upozorneni.length
      && u.upozorneni.length === 1 && u.upozorneni[0] === n300.text && !u.zabrana.length
      && !m1.zabrana.length && !m1.upozorneni.length && !kt.kontrolyBokySirka(null).zabrana.length;
  });
}

/* ---------- 6) specifikace, překlad, nabídka ---------- */
{
  global.vypocet = E.vypocet; global.DEFAULT_ZADANI = E.DEFAULT_ZADANI; global.DEFAULT_CENIK = CENIK();
  const ep = require('./engine_proj.js');
  global.DEFAULT_ZADANI_PROJ = ep.DEFAULT_ZADANI_PROJ; global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
  const tsm = require('./techspec.js');
  global.TECHSPEC_DEF = tsm.TECHSPEC_DEF; global.tsHodnota = tsm.tsHodnota; global.DEFAULT_TECHSPEC = tsm.DEFAULT_TECHSPEC;
  const pole = id => { let p = null; tsm.TECHSPEC_DEF.forEach(s => s.pole.forEach(x => { if (x.id === id) p = x; })); return p; };
  const t = (z, fixes) => pole('svetlikyDveri').prefill(spocti(z, fixes), z, CENIK(), 'cz');
  const VETA = 'Nadpraží nad šachetními dveřmi: 5 ks, plech; Světlíky na bocích dveří: 5 ks, šířka 300 mm, sklo VSG 4.4.1, na terče';
  test('spec: ruční šířka v Modelu 2 → „5 ks, šířka 300 mm"', () => t(zad({ svetlikyBokyKs: 5, svetlikyBokySirkaMm: 300 })) === VETA,
    () => t(zad({ svetlikyBokyKs: 5, svetlikyBokySirkaMm: 300 })));
  test('spec: bez ruční šířky beze změny (žádná „šířka")', () => t(zad({ svetlikyBokyKs: 5 }))
    === 'Nadpraží nad šachetními dveřmi: 5 ks, plech; Světlíky na bocích dveří: 5 ks, sklo VSG 4.4.1, na terče');
  test('spec: Model 1 šířku neuvádí, ani když je v datech', () => !/šířka/.test(t(zad({ svetlikyBokyKs: 5, svetlikyBokySirkaMm: 300 }), false)));
  test('spec: plech a „zajistí stavba" nesou šířku taky', () =>
    t(zad({ nadDvermi: 'bez', bokyDveri: 'plech', svetlikyBokyKs: 5, svetlikyBokySirkaMm: 450 })) === 'Světlíky na bocích dveří: 5 ks, šířka 450 mm, plech'
    && t(zad({ nadDvermi: 'bez', bokyDveri: 'stavba', svetlikyBokyKs: 5, svetlikyBokySirkaMm: 450 })) === 'Světlíky na bocích dveří: 5 ks, šířka 450 mm, výplň zajistí objednatel');
  const pr = require('./preklad.js');
  test('překlad: věta se šířkou se přeloží do EN, DE i FR', () => ['en', 'de', 'fr'].every(L => pr.trStav(VETA, L).prelozeno),
    () => ['en', 'de', 'fr'].map(L => pr.tr(VETA, L)));
  test('překlad EN: „width 300 mm"', () => pr.tr(VETA, 'en') === 'Panel above the landing doors: 5 pcs, sheet metal; '
    + 'Side lights beside the landing doors: 5 pcs, width 300 mm, laminated safety glass VSG 4.4.1, on glazing fixing points', () => pr.tr(VETA, 'en'));
  test('překlad DE „Breite 300 mm", FR „largeur 300 mm"', () => pr.tr(VETA, 'de').indexOf('5 Stk., Breite 300 mm, ') >= 0
    && pr.tr(VETA, 'fr').indexOf('5 pcs, largeur 300 mm, ') >= 0, () => [pr.tr(VETA, 'de'), pr.tr(VETA, 'fr')]);
  test('překlad: šířka bez čísla v milimetrech vzorem neprojde (nic se nevymýšlí)',
    () => !pr.trStav('Světlíky na bocích dveří: 5 ks, šířka asi půl metru, plech', 'en').prelozeno);

  const fm = require('./firma.js'); Object.keys(fm).forEach(k => { global[k] = fm[k]; });
  Object.keys(pr).forEach(k => { global[k] = pr[k]; });
  const zk = require('./zakazka.js');
  const { nabidkaData } = require('./nabidka.js');
  const zak = zk.novaZakazka(); zak.cislo = '2026 - OPR - CN - 9381';
  Object.assign(zak.varianty[0].data.ock.zadani, zad({ svetlikyBokyKs: 5, svetlikyBokySirkaMm: 300 }));
  zak.varianty[0].data.ock.fixes = true;
  test('nabídka (Model 2): zástupce TS_SVETLIKY_DVERI nese šířku', () => nabidkaData(zak, zak.varianty[0], J, 'cz').placeholders.TS_SVETLIKY_DVERI === VETA,
    () => nabidkaData(zak, zak.varianty[0], J, 'cz').placeholders.TS_SVETLIKY_DVERI);
  zak.varianty[0].data.ock.fixes = false;
  test('nabídka (Model 1): šířka v zástupci není', () => !/šířka/.test(nabidkaData(zak, zak.varianty[0], J, 'cz').placeholders.TS_SVETLIKY_DVERI));
}

/* ---------- 7) server: text místo šířky neprojde ---------- */
{
  const U = require('./uloziste.js');
  const zk = require('./zakazka.js');
  global.OPLASTENI_TYPY = E.OPLASTENI_TYPY;
  const s1 = fn => { const z = zk.novaZakazka(); fn(z.varianty[0].data.ock.zadani); return U.uloTypyProblemy(z); };
  test('server: skript v šířce bočního světlíku neprojde', () => s1(z => { z.svetlikyBokySirkaMm = '"><img src=x onerror=alert(1)>'; })
    .some(p => /svetlikyBokySirkaMm/.test(p.kde)));
  test('server: prázdná šířka, číslo i číslo jako text projdou', () => [ '', 300, '450', null ].every(w =>
    s1(z => { z.bokyDveri = 'sklo'; z.svetlikyBokyKs = 5; z.svetlikyBokySirkaMm = w; }).length === 0));
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
