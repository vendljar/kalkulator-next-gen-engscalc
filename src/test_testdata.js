/* ===== UKÁZKOVÉ ZAKÁZKY TESTOVACÍHO WEBU =====
 * (16. 9. 2026, zadání J. V.: „testovací rozhraní musí mít vlastní dummy
 *  data a jiný barevný vizuál")
 *
 * Dvě věci se tu hlídají, a obě proto, že sestavení je JEDNO pro ostrý
 * i testovací web:
 *
 *  1) ŽÁDNÉ CENY. Pravidlo z 30. 7. 2026 („ukázkový ceník z aplikace vymaž,
 *     s tím nabídka ven jít nesmí") by se dalo obejít zadními vrátky —
 *     stačilo by do ukázkové zakázky napsat sazby. Jely by pak i v ostrém
 *     webu a existovala by cesta, jak poslat zákazníkovi nabídku spočítanou
 *     z vymyšlených čísel. Ukázkové zakázky proto nesou jen ZADÁNÍ.
 *
 *  2) JEN NA TESTOVACÍM WEBU. Rozhoduje PROSTREDI ze serveru, ne adresa
 *     v prohlížeči — adresu si lze vymyslet, proměnnou prostředí ne.
 */
const fs = require('fs');
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');

global.DEFAULT_ZADANI = JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI));
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const engProj = require('./engine_proj.js');
global.DEFAULT_ZADANI_PROJ = JSON.parse(JSON.stringify(engProj.DEFAULT_ZADANI_PROJ));
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
global.DEFAULT_TECHSPEC = require('./techspec.js').DEFAULT_TECHSPEC;
const pz = require('./poznamky.js');
Object.keys(pz).forEach(k => { global[k] = pz[k]; });
const zk = require('./zakazka.js');
const td = require('./testdata.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

/* ---------- 1) kdo je smí založit ---------- */

test('na testovacím webu a jako správce ANO',
  td.testDataSmi({ prostredi: 'test' }, true) === true);
test('na OSTRÉM webu ne, ani správci',
  td.testDataSmi({ prostredi: 'ostre' }, true) === false);
test('bez uvedeného prostředí ne — mlčení není souhlas',
  td.testDataSmi({}, true) === false);
test('na testovacím webu, ale bez práv správce, ne',
  td.testDataSmi({ prostredi: 'test' }, false) === false);
test('prázdný stav ne', td.testDataSmi(null, true) === false);

/* ---------- 2) v datech nesmí být ceny ---------- */

const CENOVA_POLE = /Kc$|Pct$|cena|naklad|sazba|marze|prirazka/i;
td.TESTDATA_ZAKAZKY.forEach(p => {
  const klice = Object.keys(p.zadani || {});
  const cenove = klice.filter(k => CENOVA_POLE.test(k));
  test('zakázka ' + p.cislo + ' nenese v zadání cenové pole', cenove.length === 0, cenove);
});
{
  /* Hrubá pojistka na celý soubor: žádné číslo nad tisíc, které by mohlo být
   * sazbou. Rozměry, hodiny ani počty se přes tisíc nedostanou — jediné
   * výjimky jsou milimetry (cistyVstupMm, sirkaRamuMm). */
  const zdroj = fs.readFileSync(__dirname + '/testdata.js', 'utf8');
  const cisla = (zdroj.match(/(?<![\w.])\d{4,}(?![\w])/g) || [])
    .filter(x => x !== '2026' && x !== '9001' && x !== '9002' && x !== '9003');
  const podezrela = cisla.filter(x => +x > 1000);
  test('v testdata.js není žádné číslo, které by mohlo být sazbou',
    podezrela.length === 0, podezrela);
}

/* ---------- 3) zakázka se opravdu postaví ---------- */

const zak = td.testDataZakazka(td.TESTDATA_ZAKAZKY[0], zk.novaZakazka);
test('zakázka má číslo z testovací řady', zak.cislo.indexOf(td.TESTDATA_RADA) === 0, zak.cislo);
test('a název akce říká, že je to test', /^TEST/.test(zak.nazevAkce), zak.nazevAkce);
test('objednatel je označený jako smyšlený', /smyšlen/i.test(zak.objednatel), zak.objednatel);
test('zadání se dosadilo', zak.varianty[0].data.ock.zadani.sirka === 1.6);
test('ale ostatní pole zadání zůstala výchozí (skládá se PŘES výchozí)',
  zak.varianty[0].data.ock.zadani.roztec === 1.25
  && zak.varianty[0].data.ock.zadani.typPortalu === 'zapuštěný');
test('ceník zůstal ten z nové zakázky — ukázková data ho nedosazují',
  JSON.stringify(zak.varianty[0].data.cenik) === JSON.stringify(zk.novaZakazka().varianty[0].data.cenik));
test('důvod existence je v interní poznámce, ne v názvu akce',
  zak.poznamky.length === 1 && /UKÁZKOVÁ ZAKÁZKA/.test(zak.poznamky[0].text)
  && !/C3/.test(zak.nazevAkce), zak.poznamky.length);

{
  const vZrcadle = td.TESTDATA_ZAKAZKY.find(x => /zrcadle/.test(x.nazevAkce));
  const z = td.testDataZakazka(vZrcadle, zk.novaZakazka);
  test('umístění šachty jde do SPECIFIKACE, ne do zadání',
    z.varianty[0].data.techspec.hodnoty.umisteni === 'v interiéru - v zrcadle schodiště');
}
{
  const zahr = td.TESTDATA_ZAKAZKY.find(x => x.zahr);
  const z = td.testDataZakazka(zahr, zk.novaZakazka);
  test('zahraniční zakázka má zahraniční řadu ceníku',
    z.varianty[0].data.cenikRada === 'zahr');
}

/* Čísla se nesmí krýt mezi sebou — přepsalo by se to navzájem. */
{
  const cisla = td.TESTDATA_ZAKAZKY.map(x => x.cislo);
  test('čísla ukázkových zakázek jsou jedinečná',
    new Set(cisla).size === cisla.length, cisla);
  test('a všechna jsou z řady 9xxx, která se v ostré databázi nepoužívá',
    cisla.every(c => c.indexOf(td.TESTDATA_RADA) === 0), cisla);
}

/* ---------- 4) UI tu kartu nesmí ukázat jinde ---------- */
{
  const ui = fs.readFileSync(__dirname + '/ui/program_ui.js', 'utf8');
  test('karta se ptá testDataSmi, ne adresy v prohlížeči',
    /function testDataKarta\(\)[\s\S]{0,400}testDataSmi\(stav/.test(ui));
  test('a sama akce se ptá znovu — karta se dá obejít z konzole',
    /async function testDataSyp\(\)[\s\S]{0,400}testDataSmi\(stav/.test(ui));
  test('nikde se nerozhoduje podle location/hostname',
    !/location\.hostname|window\.location\.host/.test(ui));
}

/* ---------- 5) barevné téma testovacího webu ---------- */
{
  const sablona = fs.readFileSync(__dirname + '/app_template.html', 'utf8');
  const com = fs.readFileSync(__dirname + '/ui/common.js', 'utf8');
  test('šablona má vlastní sadu barev pro test',
    /body\.prostredi-test\s*\{[^}]*--acc:/.test(sablona));
  test('a mění jen proměnné a hlavičku, ne rozložení',
    !/body\.prostredi-test[^}]*grid-template|body\.prostredi-test[^}]*display:/.test(sablona));
  test('třídu nasazuje renderProstrediLista podle prostředí',
    /classList\.toggle\('prostredi-test', t\.prostredi === 'test'\)/.test(com));
  test('ostrý web ji nedostane', !/classList\.add\('prostredi-test'\)/.test(com));
}

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
