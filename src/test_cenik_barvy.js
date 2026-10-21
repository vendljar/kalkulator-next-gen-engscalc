/* Test: probarvení buněk ceníku (13. 10. 2026, zadání J. V.).
 *
 * „Světle červeně všechny, kde je hodnota nula nebo není vyplněno, a světle
 * oranžově všechny, kde je hodnota vyšší než 40 000,- Kč."
 *
 * Tady se hlídá čisté pravidlo (cenikBunkaTrida v cenik.js); že ho editory
 * Ceník OCK a Ceník PROJ opravdu použijí a barva se mění při psaní, ověřuje
 * v prohlížeči overit_cenik_barvy.mjs. Hodnoty jsou vymyšlené, ceník se
 * nečte. */
const ck = require('./cenik.js');
const { cenikBunkaTrida, cenikJednotkaKc, CENIK_BARVA_MEZ_KC, CENIK_DEF, CENIK_DEF_PROJ } = ck;

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

test('pravidlo je exportované pro Node', typeof cenikBunkaTrida === 'function' && typeof cenikJednotkaKc === 'function');
if (typeof cenikBunkaTrida !== 'function') { console.log('\n' + ok + ' OK, ' + fail + ' FAIL'); process.exit(1); }

test('mez je 40 000 Kč', CENIK_BARVA_MEZ_KC === 40000);

/* 1) nula a prázdno → červená, u každé jednotky */
for (const j of ['Kč', 'Kč/ks', 'Kč/hod', '%', 'hod', 'kg', 'ks', ''])
  test(`nula svítí červeně (jednotka „${j}")`, cenikBunkaTrida(0, j) === 'cenik-nula' && cenikBunkaTrida('0', j) === 'cenik-nula');
test('prázdné pole svítí červeně', cenikBunkaTrida('', 'Kč/ks') === 'cenik-nula');
test('chybějící hodnota (undefined/null) svítí červeně',
  cenikBunkaTrida(undefined, 'Kč') === 'cenik-nula' && cenikBunkaTrida(null, '%') === 'cenik-nula');
test('mezery se berou jako prázdno', cenikBunkaTrida('   ', 'Kč') === 'cenik-nula');
test('0,0 i -0 je nula', cenikBunkaTrida('0,0', 'Kč') === 'cenik-nula' && cenikBunkaTrida(-0, 'Kč') === 'cenik-nula');

/* 2) nad 40 000 Kč → oranžová, ale jen u položek v Kč */
test('40 001 Kč svítí oranžově', cenikBunkaTrida(40001, 'Kč') === 'cenik-vysoka');
test('přesně 40 000 Kč nesvítí (pravidlo říká „vyšší než")', cenikBunkaTrida(40000, 'Kč') === '');
test('39 999,5 Kč nesvítí', cenikBunkaTrida('39999,5', 'Kč') === '');
test('125 000 Kč/ks svítí oranžově', cenikBunkaTrida('125000', 'Kč/ks') === 'cenik-vysoka');
test('vstup s mezerou tisíců („45 000") svítí oranžově', cenikBunkaTrida('45 000', 'Kč') === 'cenik-vysoka');
for (const j of ['%', 'hod', 'kg', 'ks', ''])
  test(`50 000 v jednotce „${j}" oranžově nesvítí`, cenikBunkaTrida(50000, j) === '');
test('běžná cena nesvítí vůbec', cenikBunkaTrida(1500, 'Kč/m²') === '');
test('záporná cena nesvítí (není nula ani nad mez)', cenikBunkaTrida(-5, 'Kč') === '');
test('nečíselný text nesvítí', cenikBunkaTrida('abc', 'Kč') === '');

/* 3) sloupec Cena Zahraničí: prázdno = „jako ČR", tedy ne chyba */
test('prazdnaOk: prázdné pole nesvítí', cenikBunkaTrida('', 'Kč/ks', { prazdnaOk: true }) === '');
test('prazdnaOk: zapsaná nula svítí dál', cenikBunkaTrida('0', 'Kč/ks', { prazdnaOk: true }) === 'cenik-nula');
test('prazdnaOk: vysoká cena svítí dál', cenikBunkaTrida('41000', 'Kč', { prazdnaOk: true }) === 'cenik-vysoka');

/* 4) rozlišení jednotek nad skutečnou definicí ceníku */
test('„Kč…" jednotky jsou Kč', ['Kč', 'Kč/ks', 'Kč/kg', 'Kč/hod', 'Kč/h', 'Kč/m²', 'Kč/bm', 'Kč/km', 'Kč/m výšky']
  .every(cenikJednotkaKc));
test('%, hod, kg, ks a prázdná jednotka nejsou Kč', ['%', 'hod', 'kg', 'ks', '', null, undefined].every(j => !cenikJednotkaKc(j)));
const jednotky = new Set();
[CENIK_DEF, CENIK_DEF_PROJ].forEach(def => def.forEach(([, it]) => it.forEach(([, , u, , typ]) => { if (!typ || typ === 'pct') jednotky.add(u); })));
const nezname = [...jednotky].filter(u => !cenikJednotkaKc(u) && ['%', 'hod', 'kg'].indexOf(u) < 0);
test('každá číselná jednotka ceníku je rozpoznaná (Kč, %, hod, kg)', nezname.length === 0, nezname);
test('procentní položky ceníku nejsou „Kč"', CENIK_DEF.every(([, it]) => it.every(([, , u, , typ]) => typ !== 'pct' || !cenikJednotkaKc(u))));

/* 5) pravidlo je čistě vizuální: nic nemění */
const vstup = { a: 0 };
cenikBunkaTrida(vstup.a, 'Kč');
test('volání hodnotu nemění', vstup.a === 0);

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
if (fail) process.exit(1);
