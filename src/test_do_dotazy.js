/* DÁVKA DO — dotazy obchodníků z 16. 11. 2026 (rozhodnutí J. V. 19. 11. 2026),
 * část, která se dá ověřit v jádře bez prohlížeče. Obrazovku (po celé výšce,
 * předvyplnění pásu, příplatky jedním stiskem, uložení textu, seznam
 * nabídek) hlídá overit_do_dotazy.mjs.
 *
 *  D2  pás „bez — dodá stavba" se jmenuje „bez opláštění"; KLÍČ `bez` zůstává
 *      (uložené zakázky), nový název má překlad EN/DE/FR, starý název z výběru
 *      zmizel; prázdná dělicí výška spodního pásu „bez" a předvyplněná nula
 *      dávají tutéž cenu (předvyplnění na obrazovce cenou nehne).
 *  D4  ve Volitelných stojí montáž přechodových plechů hned pod materiálem;
 *      materiál se zobrazuje jako „PŘECHODOVÉ PLECHY - NEREZ (MATERIÁL)"
 *      (jako příplatek), ale KLÍČ ruční úpravy (`origNazev`) zůstává
 *      „PŘECHODOVÉ PLECHY - NEREZ" — uložený přepis množství pod starým
 *      klíčem dál platí a přepis příplatku pod novým názvem do základní ceny
 *      nevteče. Ruční název obchodníka má přednost.
 *
 * Testy se ptají na pravidla, ne na částky ze zkušebního ceníku.
 * Spuštění: cd src && node test_do_dotazy.js */
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
nacti('./format.js');
const PR = nacti('./preklad.js');
const E = nacti('./engine.js');
const ZC = require('./zkusebni_cenik.js');
const JEKLY = require('./jekly.json');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

const C = ZC.zkusebniCenik();
const zad = (o) => Object.assign(JSON.parse(JSON.stringify(E.DEFAULT_ZADANI)), { typSachty: 'exteriérová' }, o || {});
const vyp = (z) => E.vypocet(z, C, JEKLY, true);
const celkem = (r) => Math.round((r.souhrn.zakladCena + r.souhrn.priplatkyCena) * 100) / 100;

/* ---------- D2: název pásu „bez opláštění" ---------- */
const bez = (E.OPLASTENI_TYPY || []).find(t => t.id === 'bez') || {};
test('D2: typ „bez" se jmenuje „bez opláštění"', bez.nazev === 'bez opláštění', bez);
test('D2: klíč typu zůstává `bez`', bez.id === 'bez');
test('D2: starý popisek „dodá stavba" z výběru zmizel', !(E.OPLASTENI_TYPY || []).some(t => /dodá stavba/.test(t.nazev)));
test('D2: „bez opláštění" je ve výběru interiéru i exteriéru',
  E.oplasteniTypy(true).some(t => t.id === 'bez') && E.oplasteniTypy(false).some(t => t.id === 'bez'));
['en', 'de', 'fr'].forEach(L => {
  const t = PR.tr('bez opláštění', L);
  test('D2: překlad „bez opláštění" ' + L.toUpperCase(), !!t && t !== 'bez opláštění', t);
});

/* Spodní pás „bez" v prohlubni: prázdná dělicí výška × předvyplněná nula. */
const steny = (doM) => ({ rezim: 'poStenach', steny: {
  A: { odM: -1.1, pasy: [{ typ: 'C.cetrisKc', doM: null }] },
  B: { odM: -1.1, pasy: [{ typ: 'bez', doM }, { typ: 'C.cetrisKc', doM: null }] },
  C: { odM: 0, pasy: [{ typ: 'C.cetrisKc', doM: null }] },
  D: { odM: -1.1, pasy: [{ typ: 'bez', doM }, { typ: 'C.skloBokyKc', doM: null }] },
} });
const rNull = vyp(zad({ prohluben: 1.1, oplasteni: steny(null) }));
const rNula = vyp(zad({ prohluben: 1.1, oplasteni: steny(0) }));
test('D2: pás „bez" s prázdnou dělicí výškou = s předvyplněnou nulou (cena na haléř)',
  celkem(rNull) === celkem(rNula), [celkem(rNull), celkem(rNula)]);
const pasB = (r) => r.oplasteni.pasy.filter(p => p.stena === 'B').map(p => [p.typ, p.odM, p.doM]);
test('D2: pás „bez" sahá od dna prohlubně po úroveň nástupu (nákres podle zadání)',
  JSON.stringify(pasB(rNula)) === JSON.stringify(pasB(rNull))
  && pasB(rNula)[0][0] === 'bez' && pasB(rNula)[0][1] === -1.1 && pasB(rNula)[0][2] === 0, pasB(rNula));
test('D2: řádek kalkulace se nejmenuje „bez opláštění" (pás bez se neoceňuje)',
  !(rNula.sekce.oplasteni || []).some(x => /bez opláštění|dodá stavba/.test(x.nazev)));

/* ---------- D4: přechodové plechy ve Volitelných ---------- */
const zPlechy = (o) => zad(Object.assign({ prechodovePlechy: true }, o || {}));
const r = vyp(zPlechy());
const kat = r.volitelneKatalog.map(x => x.key);
const iMat = kat.indexOf('prechodove'), iMont = kat.indexOf('prechMont');
test('D4: montáž stojí ve Volitelných hned pod materiálem', iMat >= 0 && iMont === iMat + 1, kat);
const mat = r.volitelneKatalog.find(x => x.key === 'prechodove') || {};
test('D4: materiál se zobrazuje jako „PŘECHODOVÉ PLECHY - NEREZ (MATERIÁL)"',
  mat.nazev === 'PŘECHODOVÉ PLECHY - NEREZ (MATERIÁL)', mat.nazev);
test('D4: klíč ruční úpravy materiálu zůstává „PŘECHODOVÉ PLECHY - NEREZ"',
  mat.origNazev === 'PŘECHODOVÉ PLECHY - NEREZ', mat.origNazev);
test('D4: přejmenování není ruční název (bez tlačítka „vrátit název")', mat.nazevPrepsan === false);
test('D4: název materiálu = název příplatku (překlad do cizí nabídky existuje)',
  ['en', 'de', 'fr'].every(L => PR.tr(mat.nazev, L) !== mat.nazev));

/* Uložený přepis množství pod STARÝM klíčem platí dál — cena se nemění. */
const rPrep = vyp(zPlechy({ mnozstviPrepis: { 'PŘECHODOVÉ PLECHY - NEREZ': 7 } }));
const matPrep = rPrep.volitelneKatalog.find(x => x.key === 'prechodove') || {};
test('D4: přepis množství pod dosavadním klíčem dál platí', matPrep.mnozstvi === 7 && matPrep.prepsano === true, matPrep);
test('D4: přepis pod dosavadním klíčem mění cenu jako dřív (náklad = 7 × sazba)',
  Math.abs(matPrep.naklad - 7 * C.prechodoveKgKc) < 1e-6, [matPrep.naklad, C.prechodoveKgKc]);
/* Přepis příplatku (nový název) nesmí vtéct do základní ceny. */
const rPrip = vyp(zPlechy({ mnozstviPrepis: { 'PŘECHODOVÉ PLECHY - NEREZ (MATERIÁL)': 3 } }));
test('D4: přepis příplatku „(MATERIÁL)" nehne materiálem v základní ceně',
  Math.round(rPrip.souhrn.zakladCena * 100) === Math.round(r.souhrn.zakladCena * 100) && (rPrip.volitelneKatalog.find(x => x.key === 'prechodove') || {}).prepsano === false);
/* Vyřazení a ruční název taky pod dosavadním klíčem. */
const rNaz = vyp(zPlechy({ nazvyPrepis: { 'PŘECHODOVÉ PLECHY - NEREZ': 'Plechy nerez' } }));
test('D4: ruční název obchodníka má přednost před novým popiskem',
  (rNaz.volitelneKatalog.find(x => x.key === 'prechodove') || {}).nazev === 'Plechy nerez');
/* Příplatek beze změny. */
const rBez = vyp(zad({ prechodovePlechy: false }));
const pMat = rBez.priplatky.find(x => x.key === 'prechMat') || {};
test('D4: příplatek materiálu beze změny názvu', pMat.nazev === 'PŘECHODOVÉ PLECHY - NEREZ (MATERIÁL)', pMat.nazev);
const pKeys = rBez.priplatky.map(x => x.key);
test('D4: v příplatcích montáž hned pod materiálem (vzor pořadí)', pKeys.indexOf('prechMont') === pKeys.indexOf('prechMat') + 1, pKeys);

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
