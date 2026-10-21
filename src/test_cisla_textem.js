/* ============================================================
 * B186 — čísla zadání uložená jako text (audit 18. 10. 2026, dávka H1)
 *
 * Soubor zakázky může nést číselné pole zadání jako řetězec (`zdvih: "9"`)
 * — starší verze, ruční úprava JSON, cizí nástroj. Jádro takové pole sčítá
 * (`z.prejezd + z.zdvih` dá řetězec „2.79") a výpočet vrátí NaN; server pak
 * zámek odeslané nabídky odmítne. importZakazka proto převede řetězec, který
 * celý JE číslo (s desetinnou tečkou), na číslo — jen u klíčů, které jsou
 * ve výchozím zadání číselné. Nečíselný text ani desetinná čárka (tu server
 * odmítá 400 podle B134/B137) se neodhadují a zůstávají.
 *
 * Pojistka: před opravou (bez zadaniCislaZTextu v importu) padá kontrola
 * „zdvih je po importu číslo" i „výpočet dá konečná čísla"; po opravě projde.
 * ============================================================ */
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./poznamky.js');
nacti('./zamek.js');
nacti('./protokol.js');
nacti('./firma.js');
nacti('./kryci.js');
nacti('./kryci_proj.js');
const zk = nacti('./zakazka.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : info); } };
const kopie = (x) => JSON.parse(JSON.stringify(x));
const JEKLY = JSON.parse(require('fs').readFileSync(__dirname + '/jekly.json', 'utf8'));

/* --- zakázka se zadáním z rozměrů vzorové šachty, čísla jako text --- */
const z = zk.novaZakazka();
const zad = z.varianty[0].data.ock.zadani;
Object.assign(zad, { prejezd: 2.7, zdvih: 9, prohluben: 1.05, sirka: 2, hloubka: 2.2 });
const vzor = global.vypocet(kopie(zad), ZC.zkusebniCenik(), JEKLY, true);

const souborText = kopie(z);
Object.assign(souborText.varianty[0].data.ock.zadani,
  { zdvih: '9', prejezd: ' 2.7 ', nastupiste: '5', sirka: '2', hloubka: '2.2', prohluben: '1.05' });
delete souborText.varianty[0].data.ock.zadani.nastupisteA;   // starší soubor: migrace ho dopočte
souborText.varianty[0].data.proj.zadani.pocetPodlazi = '4';

const im = zk.importZakazka(kopie(souborText));
const zi = im.varianty[0].data.ock.zadani;
test('zdvih "9" je po importu číslo 9', zi.zdvih === 9, JSON.stringify(zi.zdvih));
test('desetinná tečka s mezerami („ 2.7 ") je číslo 2.7', zi.prejezd === 2.7, JSON.stringify(zi.prejezd));
test('nástupiště "5" je číslo 5', zi.nastupiste === 5, JSON.stringify(zi.nastupiste));
test('migrace nástupiště A pracuje s číslem (5, ne "5")', zi.nastupisteA === 5, JSON.stringify(zi.nastupisteA));
const pz = im.varianty[0].data.proj.zadani;
if (typeof global.DEFAULT_ZADANI_PROJ.pocetPodlazi === 'number')
  test('číselné pole PROJ ("4") je po importu číslo', pz.pocetPodlazi === 4, JSON.stringify(pz.pocetPodlazi));

let r = null, spadl = null;
try { r = global.vypocet(kopie(zi), ZC.zkusebniCenik(), JEKLY, true); } catch (e) { spadl = e.message; }
const cisla = r ? [r.souhrn.zakladNaklad, r.souhrn.zakladCena] : [];
test('výpočet po importu dá konečná čísla (jádro nesčítá řetězce)', !spadl && cisla.every(x => isFinite(x)), spadl || JSON.stringify(cisla));
test('a stejná jako u zadání s čísly', r && Math.abs(r.souhrn.zakladCena - vzor.souhrn.zakladCena) < 1e-6,
  r && [r.souhrn.zakladCena, vzor.souhrn.zakladCena]);

/* --- co se NEpřevádí --- */
const jine = kopie(z);
Object.assign(jine.varianty[0].data.ock.zadani, { zdvih: 'devět', sirka: '', hloubka: '2,2 m', prejezd: '2,7' });
const ij = zk.importZakazka(jine).varianty[0].data.ock.zadani;
test('nečíselný text zůstává, jak je (nic se neodhaduje)', ij.zdvih === 'devět', ij.zdvih);
test('prázdný text zůstává prázdný', ij.sirka === '', JSON.stringify(ij.sirka));
test('číslo s jednotkou se nepřevádí', ij.hloubka === '2,2 m', ij.hloubka);
test('desetinná čárka („2,7") se nepřevádí — server ji odmítá 400 (B134/B137)', ij.prejezd === '2,7', JSON.stringify(ij.prejezd));
test('textové pole výchozího zadání (typ šachty) zůstává text',
  typeof ij.typSachty === typeof global.DEFAULT_ZADANI.typSachty, typeof ij.typSachty);

/* --- přímé volání pomocné funkce --- */
const p = { a: '3', b: 'x', c: '4', d: 7 };
test('zadaniCislaZTextu převádí jen klíče, které jsou ve vzoru číselné',
  zk.zadaniCislaZTextu(p, { a: 0, b: 0, c: 'text', d: 0 }) === 1 && p.a === 3 && p.c === '4' && p.d === 7, JSON.stringify(p));
test('zadaniCislaZTextu snese chybějící zadání', zk.zadaniCislaZTextu(null, { a: 0 }) === 0);

/* --- starý formát v1 --- */
const v1 = { zadani: Object.assign(kopie(zad), { zdvih: '9' }), cenik: ZC.zkusebniCenik() };
test('starý formát v1: zdvih "9" je po importu číslo',
  zk.importZakazka(v1).varianty[0].data.ock.zadani.zdvih === 9);

console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
process.exit(fail ? 1 : 0);
