/* ===== DATUM DOKUMENTU A ČÍSLO ODESLANÉ NABÍDKY =====
 * (nálezy D2 a A3 z testování obchodníkem, 15. 9. 2026)
 *
 * D2 — Datum bylo vlastností ZAKÁZKY: `novaZakazka()` ho nastavilo jednou
 * a už nikdy. Každá další varianta pak nesla datum založení zakázky; na
 * 2025-OVP-CN-0356 tak vyšla varianta z pozdějška s datem 2. 9. Zákazník
 * dostal nabídku s datem, které neodpovídá dni odeslání — u nabídky
 * s omezenou platností je to právně nepříjemné.
 * J. V.: „nová varianta musí mít vždy nové aktuální datum … historické
 * varianty už neměň, jen zaveď toto pravidlo u nových."
 * Proto ŽÁDNÁ MIGRACE: varianta bez `datum` spadne na `zak.datum` jako dosud.
 *
 * A3 — Číslo nabídky je hlavičkové pole a hlavička je ze zámku varianty
 * vyjmutá schválně (zámek chrání cenu, ne adresu zákazníka). U čísla to ale
 * neplatí: je to identifikátor dokumentu, který odešel, a otisk zámku ho
 * neobsahuje — dal se tedy přepsat beze stopy. Rozhodnutí J. V.: „Pouze
 * administrátor", a to AŽ PO ODESLÁNÍ; dokud nic neodešlo, obchodník číslo
 * vyplňuje volně (nová zakázka má jen předlohu „2026 - OPR - CN - ").
 *
 * Rok v předloze zůstává natvrdo 2026 — J. V. 15. 9.: „aktuálně pracujme se
 * čtyřčíslím 2026, toto ještě budeme měnit až přijde čas."
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
const zk = require('./zakazka.js');
Object.keys(zk).forEach(k => { global[k] = zk[k]; });
const zm = require('./zamek.js');
Object.keys(zm).forEach(k => { global[k] = zm[k]; });

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const DNES = new Date().toISOString().slice(0, 10);

/* ---------- 1) D2: datum nové varianty ---------- */

{
  const zak = zk.novaZakazka();
  zak.datum = '2026-09-02';                       // zakázka založená dřív
  const puvodni = zak.varianty[0];

  test('nová zakázka má datum', !!zak.datum);
  test('původní varianta datum nenese (nemusí)', puvodni.datum === undefined, puvodni.datum);
  test('a čte se tedy z hlavičky zakázky',
    zk.variantaDatum(zak, puvodni) === '2026-09-02', zk.variantaDatum(zak, puvodni));

  const klon = zm.klonujVariantu(zak, puvodni.id, { nazev: 'Varianta 2' });
  test('klon vznikl', !!klon);
  test('klon nese DNEŠNÍ datum', klon.datum === DNES, klon.datum);
  test('a čte se z něj', zk.variantaDatum(zak, klon) === DNES, zk.variantaDatum(zak, klon));

  /* Tohle je celý smysl „historické varianty už neměň". */
  test('zdrojová varianta zůstala beze změny', puvodni.datum === undefined);
  test('a hlavička zakázky taky', zak.datum === '2026-09-02', zak.datum);
  test('takže původní varianta pořád vydá staré datum',
    zk.variantaDatum(zak, puvodni) === '2026-09-02');

  const klon2 = zm.klonujVariantu(zak, klon.id, { nazev: 'Varianta 3' });
  test('klon klonu má taky dnešní datum', klon2.datum === DNES, klon2.datum);
}

/* Varianta načtená ze staršího souboru — nesmí se nic dopočítávat. */
{
  const zak = { datum: '2026-08-01', varianty: [{ id: 'v1', nazev: 'Varianta 1' }] };
  test('starší varianta bez data spadne na zakázku',
    zk.variantaDatum(zak, zak.varianty[0]) === '2026-08-01');
  test('a chybí-li obojí, vrací prázdno, ne dnešek',
    zk.variantaDatum({ varianty: [] }, {}) === '');
}

/* ---------- 2) D2: generátory berou datum z varianty ---------- */

{
  const nab = fs.readFileSync(__dirname + '/nabidka.js', 'utf8');
  const nabP = fs.readFileSync(__dirname + '/nabidka_proj.js', 'utf8');
  const sod = fs.readFileSync(__dirname + '/sod.js', 'utf8');
  test('nabídka OCK bere datum z varianty', /variantaDatum\(zak, varianta\)/.test(nab));
  test('nabídka PROJ bere datum z varianty', /varianta && varianta\.datum/.test(nabP));
  test('smlouva o dílo bere datum z varianty', /variantaDatum\(zak, varianta\)/.test(sod));
  test('a nikde nezůstalo holé datumCz(zak.datum)',
    !/datumCz\(zak\.datum\)/.test(nab + sod), 'zbylo přímé čtení hlavičky');
}

/* ---------- 3) A3: číslo odeslané nabídky ---------- */

{
  const zak = zk.novaZakazka();
  test('nová zakázka nemá odeslanou nabídku', zm.zakazkaMaOdeslanou(zak) === false);
  test('a předloha čísla je připravená k dopsání',
    /2026 - OPR - CN - $/.test(zak.cislo), zak.cislo);

  zm.zamkniVariantu(zak.varianty[0], { typ: 'nabidkaTisk', kdo: 'DS', cislo: 'x' });
  test('po zamčení zakázka odeslanou nabídku má', zm.zakazkaMaOdeslanou(zak) === true);

  const klon = zm.klonujVariantu(zak, zak.varianty[0].id, {});
  test('a má ji pořád, i když se pokračuje klonem', zm.zakazkaMaOdeslanou(zak) === true);
  test('klon sám zamčený není', zm.variantaEditovatelna(klon) === true);
}

{
  const com = fs.readFileSync(__dirname + '/ui/common.js', 'utf8');
  const fn = (com.match(/function set\(path, v\)[\s\S]*?\n\}/) || [''])[0];
  test('set() se u čísla ptá, jestli už něco odešlo',
    /path === 'ZAK\.cislo'[\s\S]{0,120}zakazkaMaOdeslanou\(ZAK\)/.test(fn));
  test('a bez práv administrátora zápis zahodí',
    /jeAdmin\(\)\)\s*\{[\s\S]{0,400}return;/.test(fn));
  test('změna se zapíše do protokolu', /protokolZapis\(ZAK, \{ co: 'Číslo nabídky změněno/.test(fn));
  test('protokol nese starou i novou hodnotu',
    /pred: String\(pred\), po: String\(v\)/.test(fn));
  /* Dokud nic neodešlo, nesmí se omezovat nic — jinak by obchodník nemohl
   * číslo ani poprvé vyplnit a nová nabídka by nešla vytvořit. */
  test('omezení platí AŽ po odeslání, ne vždy',
    !/path === 'ZAK\.cislo'\)\s*\{\s*if \(typeof jeAdmin/.test(fn));
}

/* Rok v předloze zůstává 2026 — vědomé rozhodnutí, ne opomenutí. */
{
  const zdroj = fs.readFileSync(__dirname + '/zakazka.js', 'utf8');
  test('předloha čísla nese rok natvrdo (zatím záměr J. V.)',
    /ZAK_CISLO_PREDLOHA = '2026 - OPR - CN - '/.test(zdroj));
}

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
