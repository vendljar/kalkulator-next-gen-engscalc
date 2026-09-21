/* Duplikace zakázky a návrh dalšího čísla (P3, nález N5, 21. 9. 2026).
 *
 * ZADÁNÍ: „Do Přehledu přidat akci Duplikovat jako novou zakázku (nové číslo
 * CN zadá uživatel, výchozí = další číslo; zkopíruje varianty bez zámků
 * a tisků, poznámky ne), vedle stávající kopie varianty ⧉."
 *
 * PROČ: kopie varianty (⧉) zakládá DALŠÍ VARIANTU téže zakázky. Když přijde
 * nová poptávka podobná staré, je potřeba NOVÁ ZAKÁZKA s vlastním číslem —
 * a na to do 21. 9. 2026 nebyla cesta. Lidé to obcházeli tím, že otevřeli
 * starou zakázku a přepsali jí číslo, čímž o ni přišli.
 *
 * Co se tu hlídá:
 *   – kopíruje se hlavička, zadání i ceníky,
 *   – NEkopírují se zámky, doklady o odemčení, poznámky ani přílohy,
 *   – nová zakázka nesmí zdědit identitu uložené předlohy (razítko, autor),
 *   – předloha se duplikací nezmění,
 *   – návrh čísla zvýší poslední skupinu a zachová vedoucí nuly.
 */
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); };
nacti('./format.js');
const eng = require('./engine.js');
Object.keys(eng).forEach(k => { global[k] = eng[k]; });
nacti('./engine_proj.js'); nacti('./techspec.js'); nacti('./zamek.js'); nacti('./poznamky.js');
nacti('./zakazka.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

/* ---------- návrh dalšího čísla ---------- */
{
  test('zvýší poslední skupinu a nechá vedoucí nuly',
    zakazkaCisloDalsi('2026 - OPR - CN - 0383') === '2026 - OPR - CN - 0384',
    zakazkaCisloDalsi('2026 - OPR - CN - 0383'));
  test('nesahá na rok ani na značku řady',
    zakazkaCisloDalsi('2026 - OVP - CN - 0099') === '2026 - OVP - CN - 0100',
    zakazkaCisloDalsi('2026 - OVP - CN - 0099'));
  test('přetečení šířku rozšíří',
    zakazkaCisloDalsi('CN-999') === 'CN-1000', zakazkaCisloDalsi('CN-999'));
  test('číslo s příponou varianty zvýší tu poslední skupinu',
    zakazkaCisloDalsi('2026 - OPR - CN - 0383.2') === '2026 - OPR - CN - 0383.3',
    zakazkaCisloDalsi('2026 - OPR - CN - 0383.2'));
  test('text bez číslic se vrátí beze změny',
    zakazkaCisloDalsi('bez cisla') === 'bez cisla');
  test('prázdno a nesmysl nespadnou',
    zakazkaCisloDalsi('') === '' && zakazkaCisloDalsi(null) === '');
}

/* ---------- duplikace ---------- */
{
  const zak = novaZakazka();
  zak.cislo = '2026 - OPR - CN - 0383';
  zak.nazevAkce = 'Výtah Lauda';
  zak.objednatel = 'Jiří Lauda';
  zak.ico = '12345678';
  zak.uloRazitko = 'razitko-puvodni';
  zak.autor = 'obchodnik@priklad.cz';
  zak.autorJmeno = 'Test Obchodník';
  zak.upravil = 'nekdo@priklad.cz';

  /* Varianta 1: uzamčená (odeslaná nabídka) + doklad o odemčení. */
  const v1 = zak.varianty[0];
  v1.data.ock.zadani.sirka = 1.8;
  v1.zamek = { zamceno: true, typ: 'nabidka', kdy: '2026-09-11T08:00:00Z', kdo: 'Obchodník' };
  v1.odemceni = [{ kdy: '2026-09-12T08:00:00Z', kdo: 'Správce', duvod: 'oprava' }];
  v1.klonZ = 'neco'; v1.klonZCislo = '2026 - OPR - CN - 0380';
  v1.pripona = 0;

  /* Varianta 2: rozpracovaná. */
  const v2 = klonujVariantu(zak, v1.id, { nazev: 'Varianta 2' });
  v2.data.ock.zadani.sirka = 2.1;

  poznamkyZajisti(zak);
  poznamkyPridej(zak, 'Telefonát se zákazníkem', {});
  zak.prilohy.push({ id: 'pr1', nazev: 'vykres.pdf' });

  const predJson = JSON.stringify(zak);
  const nova = zakazkaDuplikuj(zak, '2026 - OPR - CN - 0384');

  test('duplikát vznikl', !!nova);
  test('a má nové číslo', nova.cislo === '2026 - OPR - CN - 0384', nova.cislo);
  test('PŘEDLOHA se duplikací nezměnila', JSON.stringify(zak) === predJson);

  /* Hlavička — to je ta práce, kvůli které se duplikuje. */
  test('hlavička se zkopírovala',
    nova.nazevAkce === 'Výtah Lauda' && nova.objednatel === 'Jiří Lauda' && nova.ico === '12345678',
    [nova.nazevAkce, nova.objednatel, nova.ico]);
  test('zadání variant se zkopírovalo',
    nova.varianty.length === 2
    && nova.varianty[0].data.ock.zadani.sirka === 1.8
    && nova.varianty[1].data.ock.zadani.sirka === 2.1,
    nova.varianty.map(v => v.data.ock.zadani.sirka));

  /* Zámky a doklady — nová zakázka nic neodeslala. */
  test('zámek odeslané nabídky se NEzkopíroval',
    nova.varianty.every(v => !v.zamek), nova.varianty.map(v => v.zamek));
  test('ani doklad o odemčení',
    nova.varianty.every(v => v.odemceni === undefined));
  test('ani odkaz na klonovanou variantu předlohy',
    nova.varianty.every(v => v.klonZ === undefined && v.klonZCislo === undefined));

  /* Poznámky a přílohy patří k původní akci. */
  test('poznámky se NEzkopírovaly', Array.isArray(nova.poznamky) && nova.poznamky.length === 0,
    nova.poznamky);
  test('přílohy se NEzkopírovaly', Array.isArray(nova.prilohy) && nova.prilohy.length === 0,
    nova.prilohy);

  /* Identita uložené zakázky — jinak by první uložení přepsalo předlohu. */
  test('razítko uložení se nezdědilo', nova.uloRazitko === undefined);
  test('autor ani upravil se nezdědili',
    nova.autor === undefined && nova.autorJmeno === undefined && nova.upravil === undefined,
    [nova.autor, nova.autorJmeno, nova.upravil]);

  /* Varianty se čísluje od začátku a řídící je právě jedna. */
  test('přípony variant se vynulovaly',
    nova.varianty.every(v => v.pripona === 0), nova.varianty.map(v => v.pripona));
  test('řídící varianta je právě jedna',
    nova.varianty.filter(v => v.ridici).length === 1,
    nova.varianty.map(v => !!v.ridici));
  test('aktivní varianta ukazuje na existující',
    nova.varianty.some(v => v.id === nova.aktivni), nova.aktivni);

  /* Duplikát je samostatný objekt — změna v něm se nevrátí do předlohy. */
  nova.varianty[0].data.ock.zadani.sirka = 9.9;
  test('duplikát je hluboká kopie, ne sdílený odkaz',
    zak.varianty[0].data.ock.zadani.sirka === 1.8,
    zak.varianty[0].data.ock.zadani.sirka);

  test('nesmysl na vstupu nespadne', zakazkaDuplikuj(null, 'x') === null);
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
