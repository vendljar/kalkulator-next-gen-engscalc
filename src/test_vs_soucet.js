/* VS #570 / E1 (#591) — JÁDRO VÍC ŠACHET (src/vice_sachet.js), 10. 11. 2026.
 *
 *  A) jedna šachta = přímo vypocet(): bez dalsi, s `dalsi: []`, s ks = 1
 *     i s názvem; tři nová pole „před zaokrouhlením" v souhrn jsou
 *     nevýčtová (JSON výsledku beze změny — zlatá sada);
 *  B) součet × ks: Z = CEIL(Σ kᵢ·Uᵢ) — ne Σ CEIL(Uᵢ) (R3); ks = 2 = šachta
 *     + její kopie; náklad, marže, sekce, příplatky, rezerva, montáž
 *     sečtené; součty sekcí = součet řádků; popisné části ze šachty 1;
 *  C) hrana tisícovky: obal bere pole před zaokrouhlením, ne dopočet;
 *  D) rozpočet do šachet (sachty[].cenaRozpis) bez zbytku = zakladCena;
 *  E) sleva ze součtu (cenaNabidkyOck), schvalování (limit ze součtu);
 *  F) můstky po šachtách (#560): mustkyCena = min(CEIL(Σ k·M), Z),
 *     sekce MŮSTKY sloučená, šachta bez můstků nepřispívá;
 *  G) Model 1 + další šachty = jen šachta 1 (3.5);
 *  H) vypocetZ / zamekVysledekSpocti přes obal, migrace importu i u šachty 2,
 *     klon nese dalsi;
 *  I) sloučení příplatků (R8): stejný klíč a sazba = jeden řádek, jiná
 *     sazba = dva; vlastní z katalogu podle kid.
 * Pojistka: na 3ff5403 (bez src/vice_sachet.js) sada spadne hned na require
 * a vypocetZ s dalsi vrací jen šachtu 1 — viz zpráva commitu.
 * Spuštění: node src/test_vs_soucet.js */
'use strict';
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
const E = nacti('./engine.js');
const V = nacti('./vice_sachet.js');
nacti('./engine_proj.js'); nacti('./techspec.js'); nacti('./sleva.js'); nacti('./zaokrouhleni.js'); nacti('./preklad.js');
const ZK = nacti('./zakazka.js');
const ZM = nacti('./zamek.js');
const SCHV = nacti('./schvalovani.js');
const ZC = require('./zkusebni_cenik.js');
const J = require('./jekly.json');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 300)); } };
const kop = x => JSON.parse(JSON.stringify(x));
const blizko = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
const CEIL = (x, m) => Math.ceil(x / m - 1e-9) * m;

/* smyšlené sazby skladebného modelu můstků (#560) — jako netlify/test_560_mustky.mjs */
const SKLADBA = { mustekRamBmKc: 10000, mustekPodlahaPlechM2Kc: 1000, mustekPodlahaPororostM2Kc: 1100, mustekPodlahaVanaM2Kc: 1200,
  mustekZabradliKovBmKc: 2000, mustekZabradliSkloBmKc: 5000, mustekKotveniDeskaKc: 3000, mustekKotveniSloupKc: 3100,
  mustekKotveniKonzolaKc: 3200, mustekZabradliSkloMontazHodBm: 1 };
const cenik = (m) => Object.assign(kop(E.DEFAULT_CENIK), ZC.zkusebniCenik(), m ? ZC.zkusebniMustky() : {}, m ? SKLADBA : {}, { kurzEurKc: 25 });
const zad = (u) => Object.assign(kop(E.DEFAULT_ZADANI), { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 }, u || {});
const C = cenik();
const Z1 = zad(), Z2 = zad({ zdvih: 17.325, sirka: 2.4, typSachty: 'interiérová', profily: kop(E.PROFILY_VYCHOZI['interiérová']) });
const pred = r => r.souhrn.zakladCenaPredZaokr;

/* A) jedna šachta */
{ const r = E.vypocet(kop(Z1), C, J, true);
  test('A jádro: zakladCenaPredZaokr je číslo a CEIL z něj = zakladCena', typeof pred(r) === 'number' && CEIL(pred(r), 1000) === r.souhrn.zakladCena, r.souhrn);
  test('A jádro: priplatkyCenaPredZaokr → CEIL = priplatkyCena', CEIL(r.souhrn.priplatkyCenaPredZaokr, 1000) === r.souhrn.priplatkyCena);
  test('A jádro: nová pole nejsou v JSON (nevýčtová)', !/PredZaokr/.test(JSON.stringify(r)) && Object.keys(r.souhrn).indexOf('zakladCenaPredZaokr') < 0);
  const varianty = [{ zadani: kop(Z1), fixes: true }, { zadani: kop(Z1), fixes: true, dalsi: [] }, { zadani: kop(Z1), fixes: true, ks: 1, nazev: 'Výtah A' },
    { zadani: kop(Z1), fixes: false, dalsi: [] }];
  varianty.forEach((ock, i) => {
    const a = V.vypocetZakazkyOck(ock, C, J), b = E.vypocet(kop(Z1), C, J, ock.fixes);
    test('A obal jedné šachty #' + i + ' = vypocet (JSON shodný, bez sachty[])', JSON.stringify(a) === JSON.stringify(b) && !a.sachty);
  });
  test('A režim: bez dalsi / dalsi [] / ks 1 = jedna šachta', !V.rezimViceSachet({ zadani: Z1 }) && !V.rezimViceSachet({ zadani: Z1, dalsi: [] }) && !V.rezimViceSachet({ zadani: Z1, ks: 1 }));
  test('A režim: ks 2 nebo další šachta = víc šachet', V.rezimViceSachet({ zadani: Z1, ks: 2 }) && V.rezimViceSachet({ zadani: Z1, dalsi: [{ id: 's_b', ks: 1, zadani: Z1 }] }));
  test('A vsKs: jen celé číslo 1–20, jinak 1', V.vsKs(20) === 20 && V.vsKs(21) === 1 && V.vsKs(0) === 1 && V.vsKs(1.5) === 1 && V.vsKs('3') === 3 && V.vsKs(null) === 1);
  test('A sachtyZ: šachta 1 = s1, ks 1, neplatné ks = 1', JSON.stringify(V.sachtyZ({ zadani: { a: 1 }, ks: 'x' }).map(s => [s.id, s.ks])) === '[["s1",1]]'); }

/* B) součet × ks */
const r1 = E.vypocet(kop(Z1), C, J, true), r2 = E.vypocet(kop(Z2), C, J, true);
const ock = { zadani: kop(Z1), fixes: true, nazev: 'Výtah A', dalsi: [{ id: 's_b', nazev: 'Výtah B', ks: 2, zadani: kop(Z2) }] };
const S = V.vypocetZakazkyOck(ock, C, J);
{ const U = pred(r1) + 2 * pred(r2);
  test('B Z = CEIL(U₁ + 2·U₂, 1000)', S.souhrn.zakladCena === CEIL(U, 1000), [S.souhrn.zakladCena, U]);
  test('B Z ≤ CEIL(U₁) + 2·CEIL(U₂) (zaokrouhluje se jen součet)', S.souhrn.zakladCena <= r1.souhrn.zakladCena + 2 * r2.souhrn.zakladCena);
  test('B náklad = N₁ + 2·N₂', blizko(S.souhrn.zakladNaklad, r1.souhrn.zakladNaklad + 2 * r2.souhrn.zakladNaklad));
  test('B marže = U − N', blizko(S.souhrn.zakladMarze, U - S.souhrn.zakladNaklad));
  test('B DPH = Z × sazba', blizko(S.souhrn.zakladDph, S.souhrn.zakladCena * C.dph) && blizko(S.souhrn.zakladSDph, S.souhrn.zakladCena * (1 + C.dph)));
  test('B příplatky = CEIL(P₁ + 2·P₂)', S.souhrn.priplatkyCena === CEIL(r1.souhrn.priplatkyCenaPredZaokr + 2 * r2.souhrn.priplatkyCenaPredZaokr, 1000));
  ['hrubaOck', 'oplasteni', 'volitelne', 'rezie'].forEach(k => {
    const rad = S.sekce[k].reduce((a, x) => a + x.sMarzi, 0);
    test('B sekce ' + k + ': součet řádků = souctySekci = s₁ + 2·s₂', blizko(rad, S.souctySekci[k].sMarzi)
      && blizko(S.souctySekci[k].sMarzi, r1.souctySekci[k].sMarzi + 2 * r2.souctySekci[k].sMarzi), [rad, S.souctySekci[k].sMarzi]);
  });
  test('B rezerva a montáž sečtené × ks', blizko(S.rezerva.naklad, r1.rezerva.naklad + 2 * r2.rezerva.naklad)
    && blizko(S.montaz.hodCelkem, r1.montaz.hodCelkem + 2 * r2.montaz.hodCelkem));
  test('B popisné části ze šachty 1 (odvozene, oplasteni s razítkem #572)', JSON.stringify(S.odvozene) === JSON.stringify(r1.odvozene)
    && S.oplasteni.skloJenSPlochou === true && JSON.stringify(S.zaskleni) === JSON.stringify(r1.zaskleni));
  test('B sachty[]: dvě šachty, názvy, ks, výsledek šachty', S.sachty.length === 2 && S.sachty[0].nazev === 'Výtah A' && S.sachty[1].ks === 2
    && JSON.stringify(S.sachty[1].vysl) === JSON.stringify(r2) && S.sachtyVerze === 1);
  const ks2 = V.vypocetZakazkyOck({ zadani: kop(Z1), fixes: true, ks: 2 }, C, J);
  const kopieS = V.vypocetZakazkyOck({ zadani: kop(Z1), fixes: true, dalsi: [{ id: 's_k', ks: 1, zadani: kop(Z1) }] }, C, J);
  test('B ks = 2 je přesně šachta + kopie šachty (souhrn i sekce)', JSON.stringify(ks2.souhrn) === JSON.stringify(kopieS.souhrn)
    && JSON.stringify(ks2.sekce) .replace(/"vsSachty":\[[^\]]*\]/g, '') === JSON.stringify(kopieS.sekce).replace(/"vsSachty":\[[^\]]*\]/g, ''));
  test('B ks = 2: stejné řádky sloučené (počet řádků jako u jedné šachty)', ks2.sekce.hrubaOck.length === r1.sekce.hrubaOck.length);
  test('B ks = 3 jediné šachty: Z = CEIL(3·U₁)', V.vypocetZakazkyOck({ zadani: kop(Z1), fixes: true, ks: 3 }, C, J).souhrn.zakladCena === CEIL(3 * pred(r1), 1000)); }

/* C) hrana tisícovky */
{ const fake = (pZ, N, M) => { const s = { zakladNaklad: N, zakladMarze: M, zakladCena: CEIL(pZ, 1000), priplatkyCena: 0 };
    Object.defineProperty(s, 'zakladCenaPredZaokr', { value: pZ, enumerable: false });
    Object.defineProperty(s, 'priplatkyCenaPredZaokr', { value: 0, enumerable: false }); return { souhrn: s }; };
  /* dopočet N + M = 1 000,000001, ale jádro mělo před zaokrouhlením přesně 1 000 → Z = 1 000, ne 2 000 */
  const s = V.vsSoucetSouhrnu([fake(1000, 400, 600.000001)], [1], { dph: 0.21 });
  test('C hrana: obal bere pole před zaokrouhlením (1 000 → 1 000, ne 2 000)', s.zakladCena === 1000, s);
  const s2 = V.vsSoucetSouhrnu([fake(500.4, 0, 500.4), fake(499.6, 0, 499.6)], [1, 1], { dph: 0 });
  test('C hrana: 500,40 + 499,60 = 1 000 (ne 2 000 jako CEIL po šachtách)', s2.zakladCena === 1000, s2);
  const s3 = V.vsSoucetSouhrnu([fake(500.4, 0, 500.4), fake(499.61, 0, 499.61)], [1, 1], { dph: 0 });
  test('C hrana: 1 000,01 → 2 000', s3.zakladCena === 2000, s3);
  const s4 = V.vsSoucetSouhrnu([fake(333.34, 0, 333.34)], [3], { dph: 0 });
  test('C hrana: 3 ks × 333,34 = 1 000,02 → 2 000', s4.zakladCena === 2000, s4); }

/* D) rozpočet */
{ const T = S.souhrn.zakladCena;
  test('D Σ cenaRozpis = zakladCena přesně', S.sachty.reduce((a, s) => a + s.cenaRozpis, 0) === T, S.sachty.map(s => s.cenaRozpis));
  test('D cenaRozpis celé Kč, cenaPredZaokr = ks × U', S.sachty.every(s => Number.isInteger(s.cenaRozpis))
    && blizko(S.sachty[1].cenaPredZaokr, 2 * pred(r2))); }

/* E) sleva a schvalování ze součtu */
{ const cn = cenaNabidkyOck(S, { procenta: 5, stav: 'schváleno' }, null);
  test('E koncová cena: sleva 5 % ze součtu', cn && blizko(cn.zaklad, S.souhrn.zakladCena) && blizko(cn.pred, S.souhrn.zakladCena * 0.95), cn);
  const z = ZK.novaZakazka(); const v = z.varianty[0]; v.data.ock = kop(ock); v.data.cenik = C;
  const fn = SCHV.schvalovaniZakladCasti || global.schvalovaniZakladCasti;
  const zc = fn ? fn(v, J, 'ock') : null;
  test('E schvalování: základ a náklad pro limit slevy ze součtu', zc && zc.zakladCena === S.souhrn.zakladCena && blizko(zc.zakladNaklad, S.souhrn.zakladNaklad), zc); }

/* F) můstky po šachtách */
{ const CM = cenik(true);
  const MU = [{ ks: 2, sirkaMm: 1600, delkaMm: 1200, podlaha: 'plech', zabradli: 'kov', zabradliStrany: 2, sloupyKs: 2, sloupVyskaM: 3.2 }];
  const za = zad({ mustky: kop(MU) }), zb = zad({ zdvih: 9 });
  const ra = E.vypocet(kop(za), CM, J, true), rb = E.vypocet(kop(zb), CM, J, true);
  if (ra.souhrn.mustkyCena === undefined) test('F příprava: zkušební ceník počítá skladebně', false, ra.mustky);
  else {
    const s = V.vypocetZakazkyOck({ zadani: kop(za), fixes: true, dalsi: [{ id: 's_m', ks: 3, zadani: kop(zb) }] }, CM, J);
    test('F mustkyCena = min(CEIL(M_A), Z) — šachta B bez můstků nepřispívá', s.souhrn.mustkyCena === Math.min(CEIL(ra.souhrn.mustkyCenaPredZaokr + (rb.souhrn.mustkyCenaPredZaokr || 0) * 3, 1000), s.souhrn.zakladCena), [s.souhrn.mustkyCena, ra.souhrn.mustkyCena]);
    test('F mustkyNaklad sečtený', blizko(s.souhrn.mustkyNaklad, ra.souhrn.mustkyNaklad + 3 * (rb.souhrn.mustkyNaklad || 0)));
    const s2 = V.vypocetZakazkyOck({ zadani: kop(za), fixes: true, dalsi: [{ id: 's_m', ks: 2, zadani: kop(za) }] }, CM, J);
    test('F můstky u obou šachet: CEIL(3·M) a sekce MŮSTKY sloučená', s2.souhrn.mustkyCena === Math.min(CEIL(3 * ra.souhrn.mustkyCenaPredZaokr, 1000), s2.souhrn.zakladCena)
      && blizko(s2.souctySekci.mustky.sMarzi, 3 * ra.souctySekci.mustky.sMarzi) && s2.sekce.mustky.length === ra.sekce.mustky.length
      && blizko(s2.souhrn.mustkyNaklad, 3 * ra.souhrn.mustkyNaklad));
    const s3 = V.vypocetZakazkyOck({ zadani: kop(zb), fixes: true, ks: 2 }, CM, J);
    test('F bez můstků v žádné šachtě: pole mustkyCena chybí jako dnes', s3.souhrn.mustkyCena === undefined && !s3.sekce.mustky);
  } }

/* G) Model 1 */
{ const m1 = V.vypocetZakazkyOck(Object.assign(kop(ock), { fixes: false }), C, J);
  test('G Model 1 + další šachty = jen šachta 1 (výsledek vypocet Model 1)', JSON.stringify(m1) === JSON.stringify(E.vypocet(kop(Z1), C, J, false)) && !m1.sachty); }

/* H) vypocetZ, zámek, import, klon */
{ const z = ZK.novaZakazka(); const v = z.varianty[0]; v.data.ock = kop(ock); v.data.cenik = C;
  const rz = ZM.vypocetZ(v, J);
  test('H vypocetZ jde přes obal (součet + sachty[])', rz.souhrn.zakladCena === S.souhrn.zakladCena && rz.sachty && rz.sachty.length === 2);
  const zv = ZM.zamekVysledekSpocti(v, J, 'test');
  test('H zamekVysledekSpocti nese součet a sachty[] (dotisk ze snímku)', zv.ock.souhrn.zakladCena === S.souhrn.zakladCena && zv.ock.sachty.length === 2);
  const z1 = ZK.novaZakazka(); z1.varianty[0].data.ock.zadani = kop(Z1); z1.varianty[0].data.cenik = C;
  test('H vypocetZ jedné šachty = vypocet', JSON.stringify(ZM.vypocetZ(z1.varianty[0], J)) === JSON.stringify(E.vypocet(kop(Z1), C, J, true)));
  /* import: migrace šachty 2 (stará stříška / nástupiště) jako u šachty 1 */
  const s = kop(z); const st = s.varianty[0].data.ock.dalsi[0].zadani;
  delete st.striskaKs; delete st.nastupisteA; delete st.patra; st.pruchoziSachta = true; st.typSachty = 'exteriérová'; st.zdvih = '12';
  const imp = ZK.importZakazka(s);
  const di = imp.varianty[0].data.ock.dalsi[0];
  test('H import: migrace zadání i u šachty 2 (stříška, nástupiště, čísla z textu)', di.zadani.striskaKs === 1 && di.zadani.nastupisteA === 4 && di.zadani.zdvih === 12, di.zadani);
  test('H import: dalsi, ks a název zůstanou, nic se nedoplní', di.ks === 2 && di.nazev === 'Výtah B' && imp.varianty[0].data.ock.nazev === 'Výtah A'
    && Object.keys(di).sort().join() === 'id,ks,nazev,zadani');
  const z0 = ZK.importZakazka(kop(z1));
  test('H import jedné šachty nedoplní dalsi / ks / nazev', !('dalsi' in z0.varianty[0].data.ock) && !('ks' in z0.varianty[0].data.ock) && !('nazev' in z0.varianty[0].data.ock));
  global.slevaRozhodnutiZahod = global.slevaRozhodnutiZahod || (() => {});
  const kl = ZM.klonujVariantu(z, v.id);
  test('H klon varianty nese dalsi celé (stejná id šachet)', kl && JSON.stringify(kl.data.ock.dalsi) === JSON.stringify(v.data.ock.dalsi)); }

/* I) sloučení příplatků */
{ const rows = [[{ key: 'haky', nazev: 'HÁKY', cena: 100, mnozstvi: 3, naklad: 300, sMarzi: 1000 },
                 { key: 'vlastni:0', vlastni: true, nazev: 'Jeřáb', cena: 5000, mnozstvi: 1, naklad: 5000, sMarzi: 6000 },
                 { key: 'vlastni:1', vlastni: true, kid: 'k_x', nazev: 'Z katalogu', cena: 50, mnozstvi: 2, naklad: 100, sMarzi: 1000 }],
                [{ key: 'haky', nazev: 'HÁKY', cena: 100, mnozstvi: 3, naklad: 300, sMarzi: 1000 },
                 { key: 'vlastni:0', vlastni: true, kid: 'k_x', nazev: 'Jiný název', cena: 50, mnozstvi: 1, naklad: 50, sMarzi: 1000 },
                 { key: 'vlastni:1', vlastni: true, nazev: '  jeřáb ', cena: 6000, mnozstvi: 1, naklad: 6000, sMarzi: 7000 }]];
  const m = V.vsSlucRadky(rows, [1, 2], V.vsKlicPriplatku);
  const haky = m.filter(x => x.key === 'haky');
  test('I stejný klíč a sazba = jeden řádek, množství Σ k·q', haky.length === 1 && haky[0].mnozstvi === 9 && haky[0].sMarzi === 3000
    && JSON.stringify(haky[0].vsSachty) === '[{"i":0,"ks":1},{"i":1,"ks":2}]', haky);
  test('I vlastní z katalogu podle kid (i s jiným názvem) = jeden řádek', m.filter(x => x.kid === 'k_x').length === 1 && m.find(x => x.kid === 'k_x').mnozstvi === 4);
  test('I ruční vlastní stejného názvu s jinou sazbou = dva řádky', m.filter(x => /jeřáb/i.test(x.nazev)).length === 2);
  test('I priplatkySloucene vrací sloučené příplatky součtu', V.priplatkySloucene(S) === S.priplatky && S.priplatky.every(p => Array.isArray(p.vsSachty))); }

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
