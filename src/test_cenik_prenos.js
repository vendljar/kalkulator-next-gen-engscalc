/* ===== MOST MEZI OSTRÝM A TESTOVACÍM WEBEM =====
 * (16. 9. 2026, J. V.: „proč se nám do zálohy neukládá zahraniční ceník?
 *  z toho důvodu nám zřejmě chybí v testu. oprav to.")
 *
 * Netlify Blobs jsou vázané na site, takže testovací web má vlastní databázi
 * a vlastní ceník. Mostem je SOUBOR: v ostrém webu se platný ceník stáhne,
 * v testovacím se z něj zveřejní. Automatické spojení mezi weby záměrně není
 * — testovací web by se musel umět přihlásit do ostrého.
 *
 * CO SE POKAZILO. Zahraniční řada ceníku přibyla 31. 8. 2026 (#181): do
 * zveřejnění (/api/program) i do otisku programu. Do mostu se ale nedoplnila,
 * a nikdo si toho nevšiml, protože soubor se tvářil kompletní — chyběl v něm
 * jediný klíč. Testovací web proto počítal zahraniční nabídky z výchozích cen
 * ze sestavení a rozcházel se s ostrým.
 *
 * Most neměl ŽÁDNÝ test. Proto ta mezera přežila dva a půl týdne.
 *
 * JAK SE TO HLÍDÁ. Oddíl 1 si seznam polí NEVYPISUJE ručně — čte ho ze
 * serverové funkce. Když tam příště přibude další pole a do mostu se
 * nedoplní, ozve se to samo. Ruční seznam by se rozešel úplně stejně jako
 * ten původní kód.
 *
 * ŽÁDNÉ CENY. Zkouší se tvar a cesta dat, ne částky — repozitář je veřejný.
 */
const fs = require('fs');
const P = require('./program.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

/* Ukázkový platný záznam. Hodnoty jsou vymyšlené značky, ne ceník. */
const ZAZNAM = {
  verze: 7, platnoOd: '2026-09-01', poznamka: 'zkouška',
  cenik: { C: { neco: 'A' } },
  cenikProj: { sazby: { neco: 'B' } },
  katalog: { polozky: [{ kid: 'k1' }] },
  slevy: { stropy: { Obchodník: 'C' } },
  zahranicni: { ceny: { 'C.prekladyKc': 'X', 'C.hakyKc': 'Y' }, jenZahr: { 'C.prekladyKc': true } },
};

/* ---------- 1) most nese všechno, co zveřejnění přijímá ---------- */
{
  const srv = fs.readFileSync(__dirname + '/../netlify/functions/program.mjs', 'utf8');
  const i = srv.indexOf('const ctx = {');
  const blok = i < 0 ? '' : srv.slice(i, srv.indexOf('};', i));
  const poleServeru = [...new Set((blok.match(/t\.([a-zA-Z]+)/g) || []).map(s => s.slice(2)))].sort();

  test('v serverové funkci se našel blok, který čte požadavek',
    i >= 0 && poleServeru.length >= 5, poleServeru);
  test('a jsou mezi nimi obě řady ceníku i zahraniční odchylky',
    poleServeru.indexOf('cenik') >= 0 && poleServeru.indexOf('cenikProj') >= 0
    && poleServeru.indexOf('zahranicni') >= 0, poleServeru);

  /* Tělo, které most posílá, musí mít KAŽDÉ pole, které server čte. */
  const telo = P.programPrenosZverejneni(P.programPrenosData(ZAZNAM), 'pozn', 'build');
  const chybi = poleServeru.filter(k => !Object.prototype.hasOwnProperty.call(telo, k));
  test('tělo zveřejnění nese každé pole, které server z požadavku čte',
    chybi.length === 0, { chybi, poleServeru, telo: Object.keys(telo).sort() });

  /* A soubor musí nést každé DATOVÉ pole. `build` a `poznamka` se dopisují
   * až při nahrání (kdo a čím to zveřejnil), do souboru nepatří. */
  const soubor = P.programPrenosData(ZAZNAM);
  const datova = poleServeru.filter(k => k !== 'build' && k !== 'poznamka');
  const chybiVSouboru = datova.filter(k => !Object.prototype.hasOwnProperty.call(soubor, k));
  test('a stažený soubor nese každé datové pole',
    chybiVSouboru.length === 0, { chybi: chybiVSouboru, soubor: Object.keys(soubor).sort() });
}

/* ---------- 2) zahraniční řada cestou nezmizí ---------- */
{
  const soubor = P.programPrenosData(ZAZNAM);
  test('stažený soubor nese zahraniční řadu',
    !!soubor.zahranicni && !!soubor.zahranicni.ceny, soubor.zahranicni);
  test('a beze změny — most do ní nesahá',
    JSON.stringify(soubor.zahranicni) === JSON.stringify(ZAZNAM.zahranicni));

  /* Celá cesta: záznam → soubor → JSON (tak se opravdu přenáší) → tělo. */
  const prenesene = JSON.parse(JSON.stringify(soubor));
  const telo = P.programPrenosZverejneni(prenesene, 'p', 'b');
  test('a dojde až do těla zveřejnění na druhém webu',
    JSON.stringify(telo.zahranicni) === JSON.stringify(ZAZNAM.zahranicni), telo.zahranicni);
  test('spolu s oběma ceníky, katalogem i slevami',
    JSON.stringify(telo.cenik) === JSON.stringify(ZAZNAM.cenik)
    && JSON.stringify(telo.cenikProj) === JSON.stringify(ZAZNAM.cenikProj)
    && JSON.stringify(telo.katalog) === JSON.stringify(ZAZNAM.katalog)
    && JSON.stringify(telo.slevy) === JSON.stringify(ZAZNAM.slevy));
}

/* ---------- 3) starší soubory se čtou dál ---------- */
{
  /* Soubor stažený před 16. 9. 2026 zahraniční klíč nemá. Nesmí to být
   * chyba — jen z něj zahraniční řada nepřijde, a to musí být vidět. */
  const stary = { typ: P.PROG_PRENOS_TYP, schema: 1, verze: 3,
    cenik: ZAZNAM.cenik, cenikProj: ZAZNAM.cenikProj, katalog: {}, slevy: {} };
  const telo = P.programPrenosZverejneni(stary, 'p', 'b');
  test('starý soubor se dá zveřejnit (chybějící klíč není chyba)',
    !!telo && JSON.stringify(telo.cenik) === JSON.stringify(ZAZNAM.cenik));
  test('a zahraniční řada z něj vyjde prázdná, ne rozbitá',
    telo.zahranicni === null, telo.zahranicni);
  test('počitadlo odchylek to řekne dopředu: nula',
    P.programPrenosZahrPocet(stary) === 0);
  test('u nového souboru řekne, kolik jich je',
    P.programPrenosZahrPocet(P.programPrenosData(ZAZNAM)) === 3,
    P.programPrenosZahrPocet(P.programPrenosData(ZAZNAM)));
  test('a snese i nesmysl místo souboru',
    P.programPrenosZahrPocet(null) === 0 && P.programPrenosZahrPocet({ zahranicni: 'ne' }) === 0);
}

/* ---------- 4) drobnosti tvaru ---------- */
{
  test('bez platné verze není co stahovat', P.programPrenosData(null) === null);
  test('nový soubor má schéma 2 (nese zahraniční řadu)',
    P.programPrenosData(ZAZNAM).schema === 2 && P.PROG_PRENOS_SCHEMA === 2);
  test('typ souboru je sdílená konstanta, ne opsaný řetězec',
    P.programPrenosData(ZAZNAM).typ === P.PROG_PRENOS_TYP && P.PROG_PRENOS_TYP === 'kalkulator-cenik');
  test('verze a platnost se přenášejí (podle nich se soubor pozná)',
    P.programPrenosData(ZAZNAM).verze === 7 && P.programPrenosData(ZAZNAM).platnoOd === '2026-09-01');
  /* Zakázky ani účty do mostu nepatří — most je jen o ceníku. */
  const klice = Object.keys(P.programPrenosData(ZAZNAM));
  test('most nenese zakázky, účty ani zálohy',
    !klice.some(k => /zakazk|uzivatel|zaloh|rejstrik/i.test(k)), klice);
}

/* ---------- 5) UI na pravidlo jen deleguje ---------- */
{
  const ui = fs.readFileSync(__dirname + '/ui/program_ui.js', 'utf8');
  test('stahování bere tvar z jádra',
    ui.indexOf('return programPrenosData(akt.db && akt.db.platny);') >= 0);
  test('nahrávání skládá tělo v jádře',
    ui.indexOf('programPrenosZverejneni(d,') >= 0);
  /* Vlastní kopie seznamu polí v UI je přesně to, co se rozešlo minule. */
  test('a UI si vlastní seznam polí nedrží',
    ui.indexOf("typ: 'kalkulator-cenik'") < 0
    && ui.indexOf('cenik: d.cenik, cenikProj: d.cenikProj') < 0);
  /* Že soubor zahraniční řadu nenese, musí správce vidět PŘED zveřejněním. */
  test('před zveřejněním se řekne, co soubor nese',
    ui.indexOf('programPrenosZahrPocet(d)') >= 0
    && ui.indexOf('NENESE zahraniční řadu') >= 0);
  test('a u souboru s odchylkami se napíše kolik jich je',
    ui.indexOf('nese i zahraniční řadu') >= 0);
}

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
