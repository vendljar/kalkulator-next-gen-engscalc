/* Test porovnání slovníku s tabulkou Vocabulary (#5).
 *
 * Slovník PREKLAD a tabulka EngineersCZ_Vocabulary_*.xlsx se rozcházejí a
 * ruční sesouhlasení nikdo nedělá. Porovnání je proto užitečné jen tehdy,
 * když mu jde věřit – falešný „rozdíl" kvůli velkému písmenu nebo dvojtečce
 * by uživatele naučil výsledky ignorovat.
 *
 * Testy hlídají:
 *   a) hledání hlavičky – sloupce se v tabulce stěhují, hlavička nemusí být
 *      na prvním řádku a nadpisy se píší různě („CZ", „Česky", „Czech"),
 *   b) výběr listu ze sešitu (uživatel nemusí vědět, jak se list jmenuje),
 *   c) rozpad na čtyři kategorie podle rizika, a to POD normalizací
 *      prekladNorm – tedy stejnou, jakou používá tr(),
 *   d) že se nic nezapisuje samo: slovnikAplikuj zapíše přesně to, co dostane.
 */
const S = require('./slovnik.js');
const { prekladNorm } = require('./preklad.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

/* ---- a) hlavička ---- */
const listZakladni = [
  ['CZ', 'EN', 'DE', 'FR'],
  ['Umístění šachty', 'Shaft location', 'Schachtposition', 'Emplacement'],
  ['Nosnost', 'Capacity', 'Tragfähigkeit', 'Capacité'],
];
const h = S.slovnikNajdiHlavicku(listZakladni);
test('hlavička na prvním řádku', h && h.radek === 0, h);
test('sloupce se namapovaly', h && h.sloupce.cz === 0 && h.sloupce.en === 1 && h.sloupce.de === 2 && h.sloupce.fr === 3, h && h.sloupce);

/* Hlavička nebývá první – nad ní bývá nadpis, datum, prázdné řádky. */
const listSHlavou = [
  ['EngineersCZ – Vocabulary'], [], ['aktualizováno 4/2026'],
  ['Český termín', 'English', 'Deutsch', 'Français'],
  ['Nosnost', 'Capacity', '', ''],
];
const h2 = S.slovnikNajdiHlavicku(listSHlavou);
test('hlavička se najde i pod nadpisem', h2 && h2.radek === 3, h2);
test('slovní nadpisy sloupců se poznají', h2 && h2.sloupce.cz === 0 && h2.sloupce.de === 2, h2 && h2.sloupce);

/* Přehozené sloupce – nesmíme spoléhat na pořadí. */
const h3 = S.slovnikNajdiHlavicku([['German', 'Czech', 'Angl.']]);
test('přehozené sloupce', h3 && h3.sloupce.cz === 1 && h3.sloupce.de === 0 && h3.sloupce.en === 2, h3 && h3.sloupce);

test('samotný CZ sloupec nestačí', S.slovnikNajdiHlavicku([['CZ', 'poznámka']]) === null);
test('list bez hlavičky vrací null', S.slovnikNajdiHlavicku([['a', 'b'], ['c', 'd']]) === null);
test('prázdný list nespadne', S.slovnikNajdiHlavicku([]) === null && S.slovnikNajdiHlavicku(null) === null);

/* Hlavička dál než 20 řádků = to už není hlavička, ale nález uprostřed dat. */
const daleko = [];
for (let i = 0; i < 25; i++) daleko.push(['x', 'y']);
daleko.push(['CZ', 'EN']);
test('hlavička dál než 20 řádků se ignoruje', S.slovnikNajdiHlavicku(daleko) === null);

/* ---- rozbor listu ---- */
const rozbor = S.slovnikZListu(listZakladni);
test('rozbor vrátí položky', rozbor.polozky.length === 2, rozbor.polozky);
test('rozbor nese číslo řádku v Excelu', rozbor.polozky[0].radek === 2, rozbor.polozky[0]);
test('rozbor nese všechny jazyky', rozbor.polozky[0].en === 'Shaft location' && rozbor.polozky[0].fr === 'Emplacement');

/* Chybějící cizí sloupec nesmí položku zahodit ani vyhodit výjimku. */
const bezFr = S.slovnikZListu([['CZ', 'EN'], ['Nosnost', 'Capacity']]);
test('chybějící sloupec = prázdný řetězec', bezFr.polozky[0].fr === '' && bezFr.polozky[0].en === 'Capacity', bezFr.polozky[0]);

/* Řádky bez českého hesla jsou oddělovače a mezery, ne data. */
const sMezerami = S.slovnikZListu([['CZ', 'EN'], ['', 'sirotek'], ['Nosnost', 'Capacity'], [null, null]]);
test('řádky bez českého hesla se přeskočí', sMezerami.polozky.length === 1, sMezerami.polozky);

/* Nedělitelná mezera v exportu z Excelu se nesmí propsat do klíče. */
const nbsp = S.slovnikZListu([['CZ', 'EN'], ['Nosnost kabiny ', 'Capacity']]);
test('NBSP a okrajové mezery se čistí', nbsp.polozky[0].cz === 'Nosnost kabiny', nbsp.polozky[0].cz);

test('list bez hlavičky hlásí chybu', !!S.slovnikZListu([['a']]).chyba);

/* ---- b) výběr listu ze sešitu ---- */
const sesit = [
  { nazev: 'Info', rows: [['Verze', '4/2026']] },
  { nazev: 'Vocab', rows: listZakladni },
  { nazev: 'Pokus', rows: [['CZ', 'EN'], ['Nosnost', 'Capacity']] },
];
const vyber = S.slovnikVyberList(sesit);
test('vybere se list s nejvíc řádky', vyber && vyber.list === 'Vocab', vyber && vyber.list);
test('výběr nese rozbor', vyber && vyber.rozbor.polozky.length === 2);
test('sešit bez slovníku vrací null', S.slovnikVyberList([{ nazev: 'Info', rows: [['a']] }]) === null);
test('prázdný sešit nespadne', S.slovnikVyberList([]) === null && S.slovnikVyberList(null) === null);

/* ---- c) porovnání ---- */
const PREKLAD = {
  'Umístění šachty': ['Shaft location', '', 'Emplacement'],   // DE chybí
  'Nosnost': ['Load capacity', 'Tragfähigkeit', ''],          // EN se liší
  'Jen v aplikaci': ['App only', '', ''],
};
const polozky = S.slovnikZListu([
  ['CZ', 'EN', 'DE', 'FR'],
  ['UMÍSTĚNÍ ŠACHTY:', 'Shaft location', 'Schachtposition', 'Emplacement'],
  ['Nosnost', 'Capacity', 'Tragfähigkeit', ''],
  ['Zcela nové heslo', 'Brand new', '', ''],
]).polozky;
const d = S.slovnikPorovnej(PREKLAD, polozky, prekladNorm);

/* Klíčové: „UMÍSTĚNÍ ŠACHTY:" a „Umístění šachty" je pod prekladNorm totéž
 * heslo. Bez normalizace by se hlásilo jako nové a slovník by se zdvojil. */
test('normalizace spáruje odlišný zápis hesla', d.nove.length === 1 && d.nove[0].cz === 'Zcela nové heslo', d.nove);
test('doplnit = jen prázdná místa', d.doplnit.length === 1 && d.doplnit[0].jazyk === 'de'
  && d.doplnit[0].klic === 'Umístění šachty', d.doplnit);
test('doplnit nese původní klíč slovníku, ne zápis z tabulky', d.doplnit[0].klic === 'Umístění šachty' && d.doplnit[0].cz === 'UMÍSTĚNÍ ŠACHTY:');
test('rozdílné = obě strany plné a jiné', d.rozdilne.length === 1 && d.rozdilne[0].jazyk === 'en'
  && d.rozdilne[0].aplikace === 'Load capacity' && d.rozdilne[0].tabulka === 'Capacity', d.rozdilne);
test('shodné se počítají', d.shodne === 3, d.shodne);   // EN+FR u umístění, DE u nosnosti
test('jen v aplikaci', d.jenVApp.length === 1 && d.jenVApp[0].klic === 'Jen v aplikaci', d.jenVApp);

/* Prázdná buňka v tabulce není návrh na smazání překladu. */
test('prázdná hodnota v tabulce se ignoruje',
  !d.doplnit.concat(d.rozdilne).some(x => x.jazyk === 'fr' && x.cz === 'Nosnost'));

test('souhrn sedí', d.souhrn.vTabulce === 3 && d.souhrn.vAplikaci === 3
  && d.souhrn.doplnit === 1 && d.souhrn.rozdilne === 1 && d.souhrn.nove === 1 && d.souhrn.jenVApp === 1, d.souhrn);

/* Nové heslo bez jediného překladu nemá cenu nabízet. */
const dPrazdne = S.slovnikPorovnej({}, S.slovnikZListu([['CZ', 'EN'], ['Heslo bez překladu', '']]).polozky, prekladNorm);
test('nové heslo bez překladu se nenabízí', dPrazdne.nove.length === 0, dPrazdne.nove);

/* Porovnání je čtení – nesmí sáhnout do slovníku. */
const kopie = JSON.parse(JSON.stringify(PREKLAD));
S.slovnikPorovnej(PREKLAD, polozky, prekladNorm);
test('porovnání slovník nemění', JSON.stringify(PREKLAD) === JSON.stringify(kopie));

test('porovnání s prázdnými vstupy nespadne',
  S.slovnikPorovnej(null, null, prekladNorm).souhrn.vTabulce === 0);

/* ---- d) zápis ---- */
const zapsano = [];
const nastav = (klic, jazyk, text) => { zapsano.push([klic, jazyk, text]); return true; };

test('aplikuj zapíše právě předané změny', S.slovnikAplikuj(d.doplnit, nastav) === 1 && zapsano.length === 1);
test('zápis jde pod klíčem slovníku, ne pod zápisem z tabulky',
  zapsano[0][0] === 'Umístění šachty' && zapsano[0][1] === 'de' && zapsano[0][2] === 'Schachtposition', zapsano[0]);

zapsano.length = 0;
test('aplikuj nezapisuje prázdné hodnoty',
  S.slovnikAplikuj([{ klic: 'X', jazyk: 'en', tabulka: '' }, null], nastav) === 0 && zapsano.length === 0);

zapsano.length = 0;
const zmenyNove = S.slovnikNoveJakoZmeny(d.nove);
test('nová hesla se rozpadnou po jazycích', zmenyNove.length === 1 && zmenyNove[0].jazyk === 'en', zmenyNove);
S.slovnikAplikuj(zmenyNove, nastav);
test('nové heslo se zapisuje pod svým českým zněním', zapsano[0][0] === 'Zcela nové heslo', zapsano[0]);

/* Odmítnutý zápis (neznámý jazyk) se nesmí počítat jako úspěch. */
test('neúspěšný zápis se nepočítá',
  S.slovnikAplikuj([{ klic: 'X', jazyk: 'xx', tabulka: 'y' }], () => false) === 0);

/* ---- CSV pro překladatele ---- */
const csv = S.slovnikCsvJenVApp([{ klic: 'Heslo s "uvozovkami"', hodnoty: { en: 'A', de: '', fr: '' } }]);
test('CSV má BOM (jinak Excel rozbije diakritiku)', csv.charCodeAt(0) === 0xFEFF);
test('CSV má hlavičku', csv.indexOf('"CZ";"EN";"DE";"FR"') === 1);
test('CSV zdvojuje uvozovky', csv.indexOf('"Heslo s ""uvozovkami"""') > 0, csv);
test('prázdné CSV má jen hlavičku', S.slovnikCsvJenVApp([]).split('\r\n').length === 1);

/* ---- e) zveřejněný slovník (#401, 12. 10. 2026) ----
 * Tytéž funkce volá server (/api/slovnik, obnova) i prohlížeč. */
const K = S.slovnikHeslaKontrola;
test('#401: platná hesla projdou', K({ 'Heslo': ['a', 'b', 'c'] }).ok === true);
test('#401: kontrola vrací kopii, ne originál', (() => { const h = { 'Heslo': ['a', 'b', 'c'] }; const r = K(h); return r.hesla.Heslo !== h.Heslo; })());
test('#401: __proto__ neprojde', K(JSON.parse('{"__proto__":["a","b","c"]}')).ok === false);
test('#401: constructor / prototype neprojdou', !K({ constructor: ['a', 'b', 'c'] }).ok && !K({ prototype: ['a', 'b', 'c'] }).ok);
test('#401: prázdný klíč, dlouhý klíč neprojdou', !K({ ' ': ['a', 'b', 'c'] }).ok && !K({ ['k'.repeat(1001)]: ['a', 'b', 'c'] }).ok);
test('#401: klíč na hraně 1000 znaků projde', K({ ['k'.repeat(1000)]: ['a', 'b', 'c'] }).ok);
test('#401: celý zabudovaný slovník projde kontrolou zveřejnění (nejdelší heslo ' + Math.max(...Object.keys(require('./preklad.js').PREKLAD).map(k => k.length)) + ' znaků)',
  K(require('./preklad.js').PREKLAD).ok, K(require('./preklad.js').PREKLAD).chyba);
test('#401: hodnota musí být trojice textů', !K({ H: 'x' }).ok && !K({ H: ['a', 'b'] }).ok && !K({ H: ['a', 1, 'c'] }).ok);
test('#401: překlad nad 2000 znaků neprojde, 2000 ano', !K({ H: ['x'.repeat(2001), '', ''] }).ok && K({ H: ['x'.repeat(2000), '', ''] }).ok);
test('#401: řídicí znak neprojde, tabulátor a nový řádek ano', !K({ H: ['a\u0000', '', ''] }).ok && K({ H: ['a\tb\nc', '', ''] }).ok);
test('#401: pole / null místo objektu neprojde', !K([]).ok && !K(null).ok);

const ZAB = { 'A': ['a', 'aa', 'aaa'], 'B': ['b', '', ''] };
const ZIV = { 'A': ['a', 'aa', 'aaa'], 'B': ['B2', '', ''], 'C': ['c', '', ''] };
const odch = S.slovnikOdchylky(ZIV, ZAB);
test('#401: odchylky = změněná a nová hesla, shodná ne', JSON.stringify(Object.keys(odch).sort()) === '["B","C"]', odch);

const db1 = S.slovnikDbNovaVerze(null, { hesla: odch, kdo: 'spravce@priklad.cz', poznamka: 'první', kdy: '2026-10-12T10:00:00.000Z' });
test('#401: první verze má číslo 1 a prázdnou historii', db1.platny.verze === 1 && db1.historie.length === 0 && db1.platny.pocet === 2);
test('#401: beze změny se pozná i při jiném pořadí klíčů', S.slovnikBezeZmeny(db1, { C: ['c', '', ''], B: ['B2', '', ''] }));
const db2 = S.slovnikDbNovaVerze(db1, { hesla: { B: ['B3', '', ''] }, kdo: 'spravce@priklad.cz', kdy: '2026-10-12T11:00:00.000Z' });
test('#401: druhá verze odloží první do historie s platnoDo',
  db2.platny.verze === 2 && db2.historie[0].verze === 1 && db2.historie[0].platnoDo === '2026-10-12T11:00:00.000Z');
let vyhozeno = false; try { S.slovnikDbNovaVerze(db1, { hesla: { constructor: ['x', '', ''] } }); } catch (e) { vyhozeno = true; }
test('#401: nová verze s neplatnými hesly se nevyrobí', vyhozeno);

const oc = S.slovnikDbOciste({ platny: db2.platny, historie: [db1.platny, { verze: 'x', hesla: {} }, null] });
test('#401: očista nechá platnou verzi a vypustí vadné starší', oc.ok && oc.db.historie.length === 1 && oc.db.historie[0].verze === 1, oc);
test('#401: očista odmítne platnou verzi s vadnými hesly',
  S.slovnikDbOciste({ platny: { verze: 3, hesla: JSON.parse('{"__proto__":["a","b","c"]}') } }).ok === false);
test('#401: očista odmítne záznam bez platné verze', !S.slovnikDbOciste({ historie: [] }).ok && !S.slovnikDbOciste(null).ok);

/* slovnikPoloz nad samostatnou kopií slovníku (ne nad PREKLAD sdíleným s ostatními testy) */
const P = { 'A': ['a', 'aa', 'aaa'], 'B': ['b', '', ''] };
const fn = { importuj: (d) => { let n = 0; Object.keys(d.hesla).forEach(k => { P[k] = d.hesla[k].slice(); n++; }); return n; },
             smaz: (k) => { delete P[k]; return true; } };
const r1 = S.slovnikPoloz({ B: ['B2', '', ''], C: ['c', '', ''] }, [], ZAB, fn);
test('#401: položení zveřejněných hesel přes zabudovaná', r1.ok && P.B[0] === 'B2' && P.C[0] === 'c' && P.A[0] === 'a');
const r2 = S.slovnikPoloz({ A: ['A2', '', ''] }, r1.polozeno, ZAB, fn);
test('#401: další verze vrátí hesla, která už nenese, na zabudované znění', r2.ok && P.B[0] === 'b' && !('C' in P) && P.A[0] === 'A2', P);
const r3 = S.slovnikPoloz(JSON.parse('{"__proto__":["x","y","z"]}'), r2.polozeno, ZAB, fn);
test('#401: vadná hesla se nepoloží vůbec', !r3.ok && P.A[0] === 'A2' && ({}).x === undefined);

/* ---- f) nálezy nezávislé revize #401 (12. 10. 2026) ---- */
const PR = require('./preklad.js');
/* N2: klíč, který se teprve PO prekladNorm stane __proto__ */
test('rev #401 N2: „__proto__:" neprojde kontrolou', !K({ '__proto__:': ['a', 'b', 'c'] }).ok);
test('rev #401 N2: „__proto__." ani „Constructor :" neprojdou', !K({ '__proto__.': ['a', 'b', 'c'] }).ok && !K({ 'Constructor :': ['a', 'b', 'c'] }).ok);
test('rev #401 N2: rejstřík PREKLAD_IDX nemá prototyp', Object.getPrototypeOf(PR.PREKLAD_IDX) === null);
const protoPred = Object.getPrototypeOf(PR.PREKLAD_IDX);
test('rev #401 N2: prekladNastav „__proto__:" odmítne a nic nezmění',
  PR.prekladNastav('__proto__:', 'en', 'x') === false && Object.getPrototypeOf(PR.PREKLAD_IDX) === protoPred && ({})[0] === undefined);
test('rev #401 N2: prekladNastav „constructor" odmítne (Object se nezmění)',
  PR.prekladNastav('constructor', 'en', 'x') === false && Object[0] === undefined && ({}).constructor === Object);
test('rev #401 N2: prekladImport zakázané klíče přeskočí',
  PR.prekladImport({ hesla: JSON.parse('{"__proto__":["x","y","z"],"__proto__:":["x","y","z"]}') }) === 0 && ({})[0] === undefined);
/* N3: U+FFFE / U+FFFF */
test('rev #401 N3: U+FFFE v překladu ani U+FFFF v hesle neprojdou',
  !K({ H: ['a￾b', '', ''] }).ok && !K({ ['H￿']: ['a', '', ''] }).ok);
/* N4: prázdný přepis zabudovaného hesla */
const ZAB4 = { 'A': ['a', 'aa', 'aaa'] };
test('rev #401 N4: prázdný přepis zabudovaného překladu se pozná (po jazycích)',
  JSON.stringify(S.slovnikPrazdnePrepisy({ A: ['', 'aa', ''], B: ['', '', ''] }, ZAB4)) === JSON.stringify([{ klic: 'A', jazyk: 'en' }, { klic: 'A', jazyk: 'fr' }]));
test('rev #401 N4: změna znění zabudovaného hesla a prázdné heslo mimo kód projdou',
  S.slovnikPrazdnePrepisy({ A: ['x', 'y', 'z'], B: ['', '', ''] }, ZAB4).length === 0);
test('rev #401 N4: očista se zabudovaným slovníkem odmítne prázdný přepis',
  !S.slovnikDbOciste({ platny: { verze: 1, hesla: { A: ['', '', ''] } } }, ZAB4).ok
  && S.slovnikDbOciste({ platny: { verze: 1, hesla: { A: ['', '', ''] } } }).ok);
/* N5: strop záznamu v bajtech */
test('rev #401 N5: velikost se měří v bajtech UTF-8', S.slovnikBajty('č') === 2 && S.slovnikBajty({ a: 'ř' }) === JSON.stringify({ a: 'ř' }).length + 1);
test('rev #401 N5: strop záznamu je 2 MB (pod dávkou obnovy 3,5 MB)', S.SLOVNIK_MEZE.db === 2 * 1024 * 1024);
{
  const tezka = {}; for (let i = 0; i < 300; i++) tezka['Heslo ' + i] = ['č'.repeat(1990), '', ''];   // ~0,6 M znaků, ~1,2 MB
  let db = S.slovnikDbNovaVerze(null, { hesla: { A: ['x', '', ''] }, kdo: 'a' });
  db = S.slovnikDbNovaVerze(db, { hesla: tezka, kdo: 'a' });
  db = S.slovnikDbNovaVerze(db, { hesla: Object.assign({}, tezka, { Z: ['z', '', ''] }), kdo: 'a' });
  /* platná ~1,2 MB + předchozí ~1,2 MB: znaků 1,2 M (pod stropem), bajtů 2,4 MB (nad) → předchozí vypadne */
  const sHistorii = { schema: 1, platny: db.platny, historie: [{ verze: 2, hesla: tezka }] };
  test('rev #401 N5: historie se zkrátí podle bajtů (znaků je pod stropem, bajtů nad)',
    JSON.stringify(sHistorii).length < S.SLOVNIK_MEZE.db && S.slovnikBajty(db) <= S.SLOVNIK_MEZE.db && db.historie.length === 0,
    [JSON.stringify(sHistorii).length, S.slovnikBajty(db), db.historie.length]);
}
/* N7: verze jen celé číslo 1 … 1e6 */
const sVerzi = (v) => S.slovnikDbOciste({ platny: { verze: v, hesla: {} } }).ok;
test('rev #401 N7: verze 1e300, „Infinity", 1,5, 0 a 1000001 neprojdou',
  !sVerzi(1e300) && !sVerzi('Infinity') && !sVerzi(1.5) && !sVerzi(0) && !sVerzi(1000001) && !sVerzi(null));
test('rev #401 N7: verze 1 a 1000000 projdou', sVerzi(1) && sVerzi(1000000) && sVerzi('7'));
/* N1: razítko slovníku do zámku */
const R1 = S.slovnikRazitko({ A: ['a', '', ''] }, 3), R2 = S.slovnikRazitko({ A: ['a', '', ''] }, 3), R3 = S.slovnikRazitko({ A: ['b', '', ''] }, 3);
test('rev #401 N1: razítko je stálé a změna překladu ho změní', R1.otisk === R2.otisk && R1.otisk !== R3.otisk && /^[0-9a-f]{8}$/.test(R1.otisk) && R1.verze === 3);
test('rev #401 N1: razítko bez zveřejněné verze má verzi null', S.slovnikRazitko({}, null).verze === null);
test('rev #401 N1: očista razítka zahodí cizí tvar',
  S.slovnikRazitkoOciste({ otisk: '<img>' }) === null && S.slovnikRazitkoOciste('x') === null
  && JSON.stringify(S.slovnikRazitkoOciste({ verze: 2, otisk: 'abcdef01', navic: 1 })) === '{"verze":2,"otisk":"abcdef01"}');
global.slovnikRazitkoOciste = S.slovnikRazitkoOciste;
const ZM = require('./zamek.js');
const vz = { id: 'v1' };
ZM.zamkniVariantu(vz, { typ: 'nabidka', slovnik: R1 });
ZM.zamkniVariantu(vz, { typ: 'nabidka', slovnik: R3 });
test('rev #401 N1: zámek nese razítko slovníku z odeslání, dotisk své v tisky[]',
  vz.zamek.slovnik.otisk === R1.otisk && vz.zamek.tisky[0].slovnik.otisk === R1.otisk && vz.zamek.tisky[1].slovnik.otisk === R3.otisk);
const vs = { id: 'v2' }; ZM.zamkniVariantu(vs, { typ: 'nabidka' });
test('rev #401 N1: zámek bez razítka (starší klient) má slovnik null', vs.zamek.slovnik === null);

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
