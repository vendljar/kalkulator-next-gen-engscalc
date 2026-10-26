/* NÁZEV POLOŽKY DVOJSKLA (J. V. 26. 10. 2026, #517 bod 6a — jen text).
 *
 * „Sklo boky + zadní stěna" v ceníku a „Dvojsklo (boky + záda)" ve výběru
 * typu stěny popisovaly jen standardní exteriérovou šachtu; v opláštění po
 * stěnách jde dvojsklo dát na kteroukoli stěnu. Nový název je „Izolační
 * dvojsklo" (ceník: „Izolační dvojsklo – typ", „Izolační dvojsklo"
 * s poznámkou, kde platí). KLÍČE C.skloBokyKc / C.skloBokyNazev zůstávají
 * — uložené ceníky a zakázky platí, výpočet beze změny (stávající sady).
 *
 * Hlídá se: popisky ceníku a poznámka, název ve výběru typu stěny, klíče
 * beze změny, překlad nového názvu EN/DE/FR (jde do specifikace cizojazyčné
 * nabídky), řádek nabídky „MATERIÁL boční + zadní stěna" ponechaný.
 * Spuštění: cd src && node test_dvojsklo_nazev.js */
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
nacti('./format.js');
const PR = nacti('./preklad.js');
const E = nacti('./engine.js');
const CN = require('./cenik.js');
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

const radky = [];
(CN.CENIK_DEF || []).forEach(([, r]) => (r || []).forEach(x => radky.push(x)));
const radek = k => radky.find(x => x[0] === k) || [];
test('ceník: C.skloBokyNazev = „Izolační dvojsklo – typ"', radek('C.skloBokyNazev')[1] === 'Izolační dvojsklo – typ', radek('C.skloBokyNazev'));
test('ceník: C.skloBokyKc = „Izolační dvojsklo"', radek('C.skloBokyKc')[1] === 'Izolační dvojsklo', radek('C.skloBokyKc'));
test('ceník: poznámka říká, kde dvojsklo platí',
  radek('C.skloBokyKc')[3] === 'exteriérová: boky a zadní stěna ve standardu · po stěnách: volitelně u kterékoli stěny', radek('C.skloBokyKc'));
test('ceník: jednotka beze změny (Kč/m²)', radek('C.skloBokyKc')[2] === 'Kč/m²');
test('ceník: starý název „Sklo boky + zadní stěna" zmizel', !radky.some(x => /Sklo boky \+ zadní stěna/.test(x[1])));

const typ = (E.OPLASTENI_TYPY || []).find(t => t.id === 'C.skloBokyKc') || {};
test('výběr typu stěny: „Izolační dvojsklo"', typ.nazev === 'Izolační dvojsklo', typ);
test('výběr typu stěny: klíč C.skloBokyKc a jen exteriér', typ.id === 'C.skloBokyKc' && typ.kde === 'ext', typ);
test('výběr typu stěny: v exteriéru nabízené', E.oplasteniTypy(true).some(t => t.nazev === 'Izolační dvojsklo'));
test('výběr typu stěny: starý název „Dvojsklo (boky + záda)" zmizel', !(E.OPLASTENI_TYPY || []).some(t => /boky \+ záda/.test(t.nazev)));

['en', 'de', 'fr'].forEach(L => {
  const t = PR.tr('Izolační dvojsklo', L);
  test('překlad „Izolační dvojsklo" ' + L.toUpperCase(), !!t && t !== 'Izolační dvojsklo', t);
});
const ZC = require('./zkusebni_cenik.js');
const Zext = Object.assign({}, E.DEFAULT_ZADANI, { typSachty: 'exteriérová' });
const boky = E.skloVolba(Zext, ZC.zkusebniCenik()).boky;
test('řádek nabídky „MATERIÁL boční + zadní stěna (…)" ponechán', /^MATERIÁL boční \+ zadní stěna \(/.test(boky.nazev), boky);

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
