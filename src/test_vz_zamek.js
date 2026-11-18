/* ============================================================
 * VZ-E3 (#602) — ZÁMEK PO ZÁKAZNÍCÍCH: čistá logika jádra
 * (src/vice_zakazniku.js oddíl „E3", src/zamek.js zamekZakVzOdeslano;
 * návrh podklady/NAVRH_VICE_ZAKAZNIKU.md § 1.1, § 2a, § 5; zadání
 * podklady/PROMPT_VZ_E3.md).
 *
 *  A) razítko „komu": zamkniVariantu s info.zakaznik (vzRazitkoSnimek) —
 *     { id, pismeno, cislo, objednatel, ico }; zamek.cislo bez písmene;
 *     bez info.zakaznik klíč chybí (jeden zákazník);
 *  B) vzStavNabidky: odeslaná jen s tiskem s jeho id v zámku JEHO varianty;
 *  C) vzPlatna: poslední podle času (ne podle pořadí zápisu), cena ze
 *     ZMRAZENÉHO výsledku, číslo z razítka; vlastní varianta ze zamčené
 *     sdílené (klonujVariantu + ukazatel) — stará odeslaná zůstává platná,
 *     dokud neodejde nová;
 *  D) dotisk: vzTiskPohled(zak, id, varianta) nese název a IČO adresáta ze
 *     snímku jeho razítka i po přejmenování; bez varianty dnešní údaje;
 *  E) písmena a id: zákazník s odeslanou nabídkou je po odstranění
 *     neuvolní, bez odeslané se uvolní;
 *  F) vzCisloDokladu po odstranění zákazníka s vlastní zamčenou variantou;
 *  G) vzOdstranDuvod (administrátor / ne), vzZakaznikPoleZmrazeno;
 *  H) D3: tiskový pohled A nenese snímek B a naopak (kopie, originál
 *     beze změny);
 *  I) zmrazení názvu akce a adresy stavby u víc zákazníků po zamčení
 *     NEŘÍDÍCÍ varianty (zamekZakCestaZmrazena, zamekZakZmeny); s jedním
 *     zákazníkem zůstává chování jako dřív.
 * Smyšlená data, žádné skutečné kontakty ani ceny.
 * Pojistka: bez kódu E3 (645b6ea) sada padá — funkce vzPlatna,
 * vzStavNabidky, vzRazitkoSnimek … neexistují; s vrácenou jednotlivou
 * funkcí selžou její oddíly (viz zpráva commitu).
 * Spuštění: node src/test_vz_zamek.js
 * ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
/* Moduly do `global` ve stejném pořadí jako CORE v build.py (vzor
 * test_vz_unik.js). */
const CORE = ['build_info.js', 'nazvy_souboru.js', 'preklad.js', 'format.js', 'engine.js', 'vice_sachet.js', 'engine_proj.js', 'techspec.js',
  'zakazka.js', 'uloziste.js', 'retence_zaloh.js', 'zamek.js', 'vice_zakazniku.js', 'seznam.js', 'archiv.js', 'docxgen.js', 'xlsx.js', 'dokumenty.js',
  'sleva.js', 'schvalovani.js', 'zaokrouhleni.js', 'marze.js', 'kontroly.js', 'ares.js', 'poznamky.js', 'protokol.js', 'firma.js',
  'zpracovatel.js', 'podminky.js', 'plan_plateb.js', 'nabidka.js', 'nabidka_proj.js', 'sod.js', 'kryci.js', 'kryci_proj.js'];
CORE.forEach(f => { const m = require(path.join(__dirname, f)); if (m && typeof m === 'object') Object.assign(global, m); });
const ZC = require('./zkusebni_cenik.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const J = JSON.parse(fs.readFileSync(path.join(__dirname, 'jekly.json'), 'utf8'));

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + (info === undefined ? '' : '  ' + JSON.stringify(info).slice(0, 500))); } };
const kop = x => JSON.parse(JSON.stringify(x));
const E3 = ['vzRazitkoSnimek', 'vzPlatna', 'vzStavNabidky', 'vzRazitkoDotisku', 'vzCisloDokladu', 'vzOdstranDuvod',
  'vzZakaznikPoleZmrazeno', 'vzVariantaBezCizichRazitek', 'zamekZakVzOdeslano'];
const chybi = E3.filter(f => typeof global[f] !== 'function');
if (chybi.length) { console.log('FAIL jádro nenese funkce E3: ' + chybi.join(', ')); process.exit(1); }

/* Smyšlení zákazníci (IČO prázdné nebo smyšlené 8 číslic bez kontroly). */
const UD = {
  B: { objednatel: 'Zkušební Beta s.r.o.', adresaObjednatele: 'Betová 2, Kdesi', ico: '11112222', dic: '', kontakt: 'Osoba Beta' },
  C: { objednatel: 'Zkušební Gama s.r.o.', adresaObjednatele: 'Gamová 3, Kdesi', ico: '33334444', dic: '', kontakt: 'Osoba Gama' },
};
const ZAD = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 };
const CAS = h => '2026-11-16T' + String(h).padStart(2, '0') + ':00:00.000Z';
let cisloN = 9950;
function zakazka(opt) {
  const o = opt || {};
  const z = novaZakazka();
  Object.assign(z, { cislo: '2026 - OPR - CN - ' + (cisloN++), nazevAkce: 'Zkušební akce E3', adresa: 'Stavba 1, Kdesi',
    objednatel: 'Zkušební Alfa s.r.o.', adresaObjednatele: 'Alfová 1, Kdesi', ico: '55556666', kontakt: 'Osoba Alfa' });
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, ZAD);
  v.data.ock.fixes = true;
  if (o.B !== false) { const r = vzPridej(z, UD.B, { kdo: 'test', kdy: CAS(8) }); if (!r.ok) throw new Error(r.chyba); }
  if (o.C) { const r = vzPridej(z, UD.C, { kdo: 'test', kdy: CAS(8), vlastni: true }); if (!r.ok) throw new Error(r.chyba); }
  return z;
}
/* Tisk varianty `v` zákazníkovi `id` (jako zamekPoTisku: snímek z dnešních
 * údajů; zamek.cislo = variantaCislo celé zakázky, bez písmene). */
function tiskni(z, v, id, kdy) {
  const prvni = !variantaUzamcena(v);
  const info = { typ: 'nabidka', kdo: 'test@priklad.cz', kdy: kdy || CAS(10), cislo: variantaCislo(z, v) };
  if (prvni) { info.vysledek = zamekVysledekSpocti(v, J, 'vz-e3'); info.snimek = zamekSnimekSpocti(v); }
  if (vzRezim(z)) info.zakaznik = vzRazitkoSnimek(z, id, v);
  return zamkniVariantu(v, info);
}
const vid = (z, id) => vzZakaznik(z, id).varianta;
const varZ = (z, id) => z.varianty.find(v => v.id === vid(z, id));

/* ---------- A) razítko „komu" ---------- */
{
  const z = zakazka();
  const v = z.varianty[0];
  const cV = variantaCislo(z, v);
  const sA = vzRazitkoSnimek(z, 'z1', v);
  test('A vzRazitkoSnimek řídícího: id z1, bez písmene, číslo varianty, název a IČO z hlavičky',
    sA && sA.id === 'z1' && sA.pismeno === '' && sA.cislo === cV && sA.objednatel === 'Zkušební Alfa s.r.o.' && sA.ico === '55556666', sA);
  test('A vzRazitkoSnimek: klíče přesně VZ_RAZITKO_KLICE', JSON.stringify(Object.keys(sA)) === JSON.stringify(VZ_RAZITKO_KLICE), Object.keys(sA));
  const sB = vzRazitkoSnimek(z, 'z2', v);
  test('A vzRazitkoSnimek dalšího: písmeno B, číslo s -B, jeho název a IČO',
    sB && sB.pismeno === 'B' && sB.cislo === cV + '-B' && sB.objednatel === UD.B.objednatel && sB.ico === UD.B.ico, sB);
  test('A vzRazitkoSnimek neznámého zákazníka → null, prázdné id → řídící',
    vzRazitkoSnimek(z, 'z9', v) === null && vzRazitkoSnimek(z, '', v).id === 'z1');
  tiskni(z, v, 'z1', CAS(9));
  test('A první tisk řídícímu: zámek, zamek.cislo bez písmene, tisky[0].zakaznik = snímek A',
    variantaUzamcena(v) && v.zamek.cislo === cV && v.zamek.tisky.length === 1 && JSON.stringify(v.zamek.tisky[0].zakaznik) === JSON.stringify(sA),
    v.zamek.tisky);
  tiskni(z, v, 'z2', CAS(10));
  test('A dotisk sdílené varianty B: druhý záznam s razítkem B (…-B), zamek.cislo pořád bez písmene',
    v.zamek.tisky.length === 2 && v.zamek.tisky[1].zakaznik.id === 'z2' && v.zamek.tisky[1].zakaznik.cislo === cV + '-B'
    && v.zamek.cislo === cV && !/-B$/.test(v.zamek.cislo), v.zamek);
  test('A razítko je snímek (kopie): změna hlavičky B ho nezmění', (() => {
    vzZakaznik(z, 'z2'); z.dalsiZakaznici[0].hlavicka.objednatel = 'Jiný název';
    return v.zamek.tisky[1].zakaznik.objednatel === UD.B.objednatel; })());
  const z1 = zakazka({ B: false });
  const v1 = z1.varianty[0];
  tiskni(z1, v1, 'z1');
  test('A jeden zákazník: tisk bez info.zakaznik → klíč zakaznik v záznamu chybí (zlatá sada)',
    !vzRezim(z1) && !('zakaznik' in v1.zamek.tisky[0]), v1.zamek.tisky[0]);
  test('A vzTiskKomu: záznam bez razítka patří z1', vzTiskKomu(v1.zamek.tisky[0]) === 'z1' && vzTiskKomu({}) === 'z1');
}

/* ---------- B) vzStavNabidky ---------- */
{
  const z = zakazka({ C: true });
  const v1 = z.varianty[0], v2 = varZ(z, 'z3');
  test('B nic nevytištěno: A, B, C rozpracovaná, platna null',
    ['z1', 'z2', 'z3'].every(id => { const s = vzStavNabidky(z, id); return s.stav === 'rozpracovana' && s.kdy === '' && s.platna === null; }));
  test('B vzStavNabidky neznámého zákazníka → null', vzStavNabidky(z, 'z9') === null);
  tiskni(z, v1, 'z1', CAS(9));
  test('B tisk sdílené V1 řídícímu: A odeslaná, B (táž varianta) rozpracovaná',
    vzStavNabidky(z, 'z1').stav === 'odeslana' && vzStavNabidky(z, 'z1').kdy === CAS(9) && vzStavNabidky(z, 'z2').stav === 'rozpracovana',
    [vzStavNabidky(z, 'z1'), vzStavNabidky(z, 'z2')]);
  test('B vzOdeslanoKomu: A ano, B ne', vzOdeslanoKomu(z, 'z1') && !vzOdeslanoKomu(z, 'z2'));
  tiskni(z, v1, 'z2', CAS(10));
  test('B tisk V1 pro B: B odeslaná (kdy = čas jeho tisku), C rozpracovaná',
    vzStavNabidky(z, 'z2').stav === 'odeslana' && vzStavNabidky(z, 'z2').kdy === CAS(10) && vzStavNabidky(z, 'z3').stav === 'rozpracovana');
  /* Tisk s id C v zámku CIZÍ varianty (V1) → C není „odeslaná" (jeho varianta je V2). */
  v1.zamek.tisky.push({ typ: 'nabidka', kdo: 'test', kdy: CAS(11), zakaznik: vzRazitkoSnimek(z, 'z3', v1) });
  const sC = vzStavNabidky(z, 'z3');
  test('B tisk s id C v zámku cizí varianty: stav C rozpracovaná, ale platna (starší varianta) existuje',
    sC.stav === 'rozpracovana' && sC.platna && sC.platna.varianta === v1.id, sC);
  tiskni(z, v2, 'z3', CAS(12));
  test('B tisk vlastní V2 pro C: C odeslaná', vzStavNabidky(z, 'z3').stav === 'odeslana' && vzStavNabidky(z, 'z3').platna.varianta === v2.id);
}

/* ---------- C) vzPlatna ---------- */
{
  const z = zakazka();
  const v1 = z.varianty[0];
  tiskni(z, v1, 'z2', CAS(10));
  const cV = v1.zamek.cislo;
  const p = vzPlatna(z, 'z2');
  const cenaZamek = cenaNabidkyOck(v1.zamek.vysledek.ock, v1.data.sleva || {}, v1.data.zaokr).cena;
  test('C vzPlatna B: varianta V1, číslo …-B, kdy, cena = cena ze zmrazeného výsledku, CZK',
    p && p.varianta === v1.id && p.cislo === cV + '-B' && p.kdy === CAS(10) && typeof p.cena === 'number' && p.cena > 0
    && p.cena === cenaZamek && p.mena === 'CZK' && JSON.stringify(Object.keys(p)) === JSON.stringify(VZ_PLATNA_KLICE), p);
  /* Cena se nepočítá znovu: zmrazený výsledek změněný (jako by dnešní kód počítal jinak) → cena platné jde za ním. */
  const vys0 = kop(v1.zamek.vysledek);
  v1.zamek.vysledek.ock.souhrn.zakladCena += 100000;
  const p2 = vzPlatna(z, 'z2');
  /* vypocetZ u zamčené varianty vrací týž zmrazený výsledek — „živá" cena je ta před úpravou. */
  const zive = cenaZamek;
  test('C cena platné nabídky jde ze zmrazeného výsledku (výsledek v zámku upraven → cena jde za ním)',
    p2.cena === cenaNabidkyOck(v1.zamek.vysledek.ock, v1.data.sleva || {}, v1.data.zaokr).cena && p2.cena !== zive, { p2: p2.cena, zive });
  v1.zamek.vysledek = vys0;
  const bez = kop(v1); bez.zamek.vysledek = null;
  test('C vzCenaZamku: starý zámek bez výsledku → null (nic se nepřepočítává)', vzCenaZamku(z, bez) === null);
  /* číslo z razítka */
  v1.zamek.tisky[0].zakaznik.cislo = 'RAZITKO-CISLO-B';
  test('C číslo platné nabídky = číslo z razítka', vzPlatna(z, 'z2').cislo === 'RAZITKO-CISLO-B');
  v1.zamek.tisky[0].zakaznik.cislo = cV + '-B';
  test('C platna řídícího = jeho tisky (žádný → null)', vzPlatna(z, 'z1') === null && vzPlatna(z, '') === null && vzPlatna(z, 'z9') === null);

  /* Vlastní varianta ze zamčené sdílené: klon V1 + ukazatel B na klon. */
  const k = klonujVariantu(z, v1.id, { aktivovat: false });
  k.data.ock.zadani.zdvih = 15;
  z.dalsiZakaznici[0].varianta = k.id;
  const sB = vzStavNabidky(z, 'z2');
  test('C B dostal vlastní variantu (klon zamčené V1): stav rozpracovaná, platna = stará odeslaná V1 (…-B)',
    !variantaUzamcena(k) && sB.stav === 'rozpracovana' && sB.platna && sB.platna.varianta === v1.id && sB.platna.cislo === cV + '-B', sB);
  tiskni(z, k, 'z2', CAS(13));
  const pk = vzPlatna(z, 'z2');
  test('C po tisku vlastní varianty: platna = nová (klon), číslo z jejího razítka …-B, cena klonu',
    pk.varianta === k.id && pk.cislo === k.zamek.tisky[0].zakaznik.cislo && /-B$/.test(pk.cislo) && pk.cislo !== cV + '-B'
    && pk.cena === cenaNabidkyOck(k.zamek.vysledek.ock, k.data.sleva || {}, k.data.zaokr).cena && pk.cena !== p.cena, { pk, p });
  test('C vzStavNabidky B po tisku vlastní: odeslaná', vzStavNabidky(z, 'z2').stav === 'odeslana');
  /* Poslední podle ČASU, ne podle pořadí zápisu: starší tisk připsaný později. */
  v1.zamek.tisky.push({ typ: 'nabidka', kdo: 'test', kdy: CAS(11), zakaznik: vzRazitkoSnimek(z, 'z2', v1) });
  test('C poslední podle času: tisk V1 s dřívějším časem připsaný až po klonu → platna zůstává klon',
    vzPlatna(z, 'z2').varianta === k.id);
  v1.zamek.tisky.push({ typ: 'nabidka', kdo: 'test', kdy: CAS(14), zakaznik: vzRazitkoSnimek(z, 'z2', v1) });
  test('C novější dotisk V1 pro B (čas 14) → platna = V1', vzPlatna(z, 'z2').varianta === v1.id && vzPlatna(z, 'z2').kdy === CAS(14));
  /* vzPlatnaPrepocti zapíše platna dalším (řídícímu ne). */
  const zz = kop(z);
  zz.dalsiZakaznici[0].platna = { varianta: 'x', cislo: 'PODVRH', kdy: '', cena: 1, mena: 'EUR' };
  vzPlatnaPrepocti(zz);
  test('C vzPlatnaPrepocti: platna dalšího = vzPlatna (podvržená přepsána), vzRidici bez platna',
    JSON.stringify(zz.dalsiZakaznici[0].platna) === JSON.stringify(vzPlatna(zz, 'z2')) && !('platna' in zz.vzRidici), zz.dalsiZakaznici[0].platna);
  const z0 = zakazka();
  z0.dalsiZakaznici[0].platna = { varianta: z0.varianty[0].id, cislo: 'PODVRH', kdy: '', cena: 1, mena: 'CZK' };
  vzPlatnaPrepocti(z0);
  test('C vzPlatnaPrepocti bez odeslané nabídky: platna pryč', !('platna' in z0.dalsiZakaznici[0]));
}

/* ---------- D) dotisk se starým názvem adresáta ---------- */
{
  const z = zakazka();
  const v1 = z.varianty[0];
  tiskni(z, v1, 'z2', CAS(10));
  z.dalsiZakaznici[0].hlavicka.objednatel = 'Přejmenovaná Beta s.r.o.';
  z.dalsiZakaznici[0].hlavicka.ico = '99998888';
  const dnes = vzTiskPohled(z, 'z2');
  const dot = vzTiskPohled(z, 'z2', v1);
  const dotId = vzTiskPohled(z, 'z2', v1.id);
  test('D tiskový pohled B bez varianty: dnešní název a IČO', dnes.objednatel === 'Přejmenovaná Beta s.r.o.' && dnes.ico === '99998888');
  test('D dotisk V1 pro B (objekt varianty): název a IČO ze snímku razítka', dot.objednatel === UD.B.objednatel && dot.ico === UD.B.ico,
    { o: dot.objednatel, ico: dot.ico });
  test('D dotisk V1 pro B (id varianty): totéž', dotId.objednatel === UD.B.objednatel && dotId.ico === UD.B.ico);
  test('D dotisk: v.zakaznik varianty v pohledu = název ze snímku (jde do názvu souboru)',
    vzTiskVarianta(dot, v1) && vzTiskVarianta(dot, v1).zakaznik === UD.B.objednatel, vzTiskVarianta(dot, v1) && vzTiskVarianta(dot, v1).zakaznik);
  test('D dotisk nemění zakázku (hlavička B zůstala přejmenovaná)', z.dalsiZakaznici[0].hlavicka.objednatel === 'Přejmenovaná Beta s.r.o.');
  test('D vzRazitkoDotisku: poslední razítko B; pro A (netištěno) null',
    vzRazitkoDotisku(v1, 'z2').objednatel === UD.B.objednatel && vzRazitkoDotisku(v1, 'z1') === null);
  /* Varianta, která B ještě neodešla (nový klon) → dnešní údaje. */
  const k = klonujVariantu(z, v1.id, { aktivovat: false });
  z.dalsiZakaznici[0].varianta = k.id;
  const nova = vzTiskPohled(z, 'z2', k);
  test('D varianta, která B ještě neodešla: dnešní název', nova.objednatel === 'Přejmenovaná Beta s.r.o.');
  /* Dva tisky B s různým názvem: dotisk bere POSLEDNÍ razítko. */
  z.dalsiZakaznici[0].varianta = v1.id;
  v1.zamek.tisky.push({ typ: 'nabidka', kdo: 'test', kdy: CAS(12), zakaznik: Object.assign(vzRazitkoSnimek(z, 'z2', v1), { objednatel: 'Druhý snímek Beta' }) });
  test('D dotisk po druhém tisku B: název z posledního razítka', vzTiskPohled(z, 'z2', v1).objednatel === 'Druhý snímek Beta');
  /* Řídící: dotisk sdílené V1 řídícímu po změně hlavičky (A V1 nedostal) → dnešní. */
  test('D řídící, kterému varianta neodešla: dnešní hlavička', vzTiskPohled(z, 'z1', v1).objednatel === 'Zkušební Alfa s.r.o.');
}

/* ---------- E) písmena a id ---------- */
{
  /* B s odeslanou nabídkou odstraněn → nový zákazník dostane C / z3. */
  const z = zakazka();
  tiskni(z, z.varianty[0], 'z2', CAS(10));
  const o = vzOdstran(z, 'z2');
  test('E příprava: B (s odeslanou nabídkou) odstraněn, zakázka bez dalších', o.ok && !vzRezim(z), o);
  test('E vzPismenoDalsi / vzIdDalsi po odstranění B s odeslanou: C / z3 (razítko B je drží)',
    vzPismenoDalsi(z) === 'C' && vzIdDalsi(z) === 'z3', [vzPismenoDalsi(z), vzIdDalsi(z)]);
  const r = vzPridej(z, UD.C, { kdo: 'test' });
  test('E vzPridej po odstranění B s odeslanou: nový zákazník C, z3', r.ok && r.zakaznik.pismeno === 'C' && r.zakaznik.id === 'z3', r);
  /* B bez odeslané nabídky odstraněn → písmeno i id se uvolní. */
  const z2 = zakazka();
  tiskni(z2, z2.varianty[0], 'z1', CAS(10));   // řídící tisk (bez písmene) nic nedrží
  vzOdstran(z2, 'z2');
  test('E po odstranění B bez odeslané: B / z2 se uvolní', vzPismenoDalsi(z2) === 'B' && vzIdDalsi(z2) === 'z2', [vzPismenoDalsi(z2), vzIdDalsi(z2)]);
  /* Prostřední zákazník: B, C; C odeslaná a odstraněná, B zůstává → další je D. */
  const z3 = zakazka({ C: true });
  tiskni(z3, varZ(z3, 'z3'), 'z3', CAS(10));
  vzOdstran(z3, 'z3');
  test('E C (vlastní zamčená varianta) odstraněn: další písmeno D, id z4', vzPismenoDalsi(z3) === 'D' && vzIdDalsi(z3) === 'z4');
}

/* ---------- F) vzCisloDokladu ---------- */
{
  const z = zakazka({ C: true });
  const v1 = z.varianty[0], v2 = varZ(z, 'z3');
  tiskni(z, v2, 'z3', CAS(10));
  const cV2 = v2.zamek.cislo;
  test('F vzCisloDokladu vlastní zamčené varianty C: …-C', vzCisloDokladu(z, v2) === cV2 + '-C', vzCisloDokladu(z, v2));
  const o = vzOdstran(z, 'z3', { smazatVariantu: true });
  test('F odstranění C se smazatVariantu: zamčená varianta zůstala (doklad)', o.ok && o.smazanaVarianta === '' && z.varianty.includes(v2), o);
  test('F vzCisloDokladu po odstranění C: pořád …-C (číslo z razítka)', vzCisloDokladu(z, v2) === cV2 + '-C', vzCisloDokladu(z, v2));
  /* Volná varianta odstraněného C se jeho jménem ve v.zakaznik: tiskový
   * pohled řídícího ho pozná podle snímku v razítku a přepíše (E3). */
  v2.zakaznik = UD.C.objednatel;
  const pA = vzTiskPohled(z, 'z1', v2);
  const vA = pA.varianty.find(v => v.id === v2.id);
  test('F řídící tiskne volnou V2 odstraněného C: v.zakaznik se jménem C přepsán názvem řídícího, razítko C vyjmuto',
    vA && vA.zakaznik === 'Zkušební Alfa s.r.o.' && !JSON.stringify(vA).includes(UD.C.objednatel) && v2.zakaznik === UD.C.objednatel, vA && vA.zakaznik);
  test('F vzCisloDokladu nezamčené / bez tisku → ""', vzCisloDokladu(z, v1) === '');
  tiskni(z, v1, 'z1', CAS(11));
  test('F vzCisloDokladu varianty tištěné řídícímu (bez písmene) → ""', vzCisloDokladu(z, v1) === '');
  tiskni(z, v1, 'z2', CAS(12));
  test('F vzCisloDokladu varianty tištěné A i B → "" (platí variantaCislo)', vzCisloDokladu(z, v1) === '');
  /* Volná (ne-vlastní) varianta tištěná zákazníkovi, který v zakázce je a má jinou variantu → '' */
  const z2 = zakazka({ C: true });
  const k = klonujVariantu(z2, z2.varianty[0].id, { aktivovat: false });
  tiskni(z2, k, 'z3', CAS(10));
  test('F tisk C na variantě, která není jeho (C v zakázce) → ""', vzCisloDokladu(z2, k) === '');
}

/* ---------- G) vzOdstranDuvod, vzZakaznikPoleZmrazeno ---------- */
{
  const z = zakazka({ C: true });
  test('G bez odeslané nabídky: odstranit smí i ne-administrátor', vzOdstranDuvod(z, 'z2', false) === '' && vzOdstranDuvod(z, 'z3', false) === '');
  tiskni(z, z.varianty[0], 'z2', CAS(10));
  const ne = vzOdstranDuvod(z, 'z2', false);
  test('G B s odeslanou nabídkou: ne-administrátor dostane důvod (jen administrátor)', /jen administrátor/.test(ne), ne);
  test('G B s odeslanou nabídkou: administrátor smí ("")', vzOdstranDuvod(z, 'z2', true) === '');
  test('G řídícího nikdo, neznámého nikdo', /Řídícího/.test(vzOdstranDuvod(z, 'z1', true)) && /není/.test(vzOdstranDuvod(z, 'z9', true)));
  z.varianty[0].prodano = { zakaznik: 'z3' };
  test('G prodaný zákazník: ani administrátor', /prodalo/.test(vzOdstranDuvod(z, 'z3', true)));
  delete z.varianty[0].prodano;
  test('G zmrazení údajů B po odeslání: název, sídlo, IČO, DIČ ano; kontakt ne',
    ['objednatel', 'adresaObjednatele', 'ico', 'dic'].every(k => vzZakaznikPoleZmrazeno(z, 'z2', k) !== '')
    && vzZakaznikPoleZmrazeno(z, 'z2', 'kontakt') === '');
  test('G zmrazení: C bez odeslané nabídky ne; řídící ne (hlídá zámek hlavičky)',
    vzZakaznikPoleZmrazeno(z, 'z3', 'objednatel') === '' && vzZakaznikPoleZmrazeno(z, 'z1', 'objednatel') === '');
}

/* ---------- H) D3: cizí razítka z tiskového pohledu ---------- */
{
  const z = zakazka();
  const v1 = z.varianty[0];
  tiskni(z, v1, 'z1', CAS(9));
  tiskni(z, v1, 'z2', CAS(10));
  const pred = JSON.stringify(v1.zamek);
  const pA = vzTiskPohled(z, 'z1'), pB = vzTiskPohled(z, 'z2');
  const vA = pA.varianty.find(v => v.id === v1.id), vB = pB.varianty.find(v => v.id === v1.id);
  test('H pohled A: zámek V1 nenese razítko B (id, název, IČO)', vA && !JSON.stringify(vA.zamek).includes(UD.B.objednatel)
    && !JSON.stringify(vA.zamek).includes(UD.B.ico) && !vA.zamek.tisky.some(t => t.zakaznik && t.zakaznik.id === 'z2'), vA && vA.zamek.tisky);
  test('H pohled A: vlastní razítko zůstalo', vA.zamek.tisky.some(t => t.zakaznik && t.zakaznik.id === 'z1'));
  test('H pohled B: zámek V1 nenese razítko A', vB && !JSON.stringify(vB.zamek).includes('Zkušební Alfa') && !JSON.stringify(vB.zamek).includes('55556666')
    && vB.zamek.tisky.some(t => t.zakaznik && t.zakaznik.id === 'z2'), vB && vB.zamek.tisky);
  test('H pohled B: celý JSON pohledu (bez protokolu) nenese název ani IČO A', (() => {
    const b = Object.assign({}, pB); delete b.protokol; const s = JSON.stringify(b);
    return !s.includes('Zkušební Alfa') && !s.includes('55556666'); })());
  test('H pohled A: celý JSON pohledu nenese název ani IČO B', (() => {
    const a = Object.assign({}, pA); delete a.protokol; const s = JSON.stringify(a);
    return !s.includes(UD.B.objednatel) && !s.includes(UD.B.ico); })());
  test('H počet tisků v kopii zachován (razítko jen vyjmuto, ne záznam)', vA.zamek.tisky.length === 2 && vB.zamek.tisky.length === 2);
  test('H originál zakázky beze změny (kopie zámku)', JSON.stringify(v1.zamek) === pred && vA !== v1);
  test('H vzVariantaBezCizichRazitek bez cizího razítka vrací tutéž variantu',
    vzVariantaBezCizichRazitek(v1, 'z1') !== v1 && (() => { const w = zakazka().varianty[0]; return vzVariantaBezCizichRazitek(w, 'z1') === w; })());
}

/* ---------- I) zmrazení názvu akce u víc zákazníků ---------- */
{
  const z = zakazka({ C: true });
  const v2 = varZ(z, 'z3');
  test('I nic neodešlo: název akce volný', zamekZakCestaZmrazena(z, 'ZAK.nazevAkce') === '' && !zamekZakVzOdeslano(z));
  const stara = kop(z);
  tiskni(z, v2, 'z3', CAS(10));
  const st2 = kop(z);
  test('I po tisku NEŘÍDÍCÍ vlastní varianty C: název akce a adresa stavby zmrazené (víc zákazníků)',
    /víc zákazníky/.test(zamekZakCestaZmrazena(z, 'ZAK.nazevAkce')) && zamekZakCestaZmrazena(z, 'ZAK.adresa') !== '' && zamekZakVzOdeslano(z),
    zamekZakCestaZmrazena(z, 'ZAK.nazevAkce'));
  test('I kontakt hlavičky (mimo cesty po CN) zůstává volný', zamekZakCestaZmrazena(z, 'ZAK.kontakt') === '');
  const nova = kop(st2); nova.nazevAkce = 'Jiný název akce';
  const zm = zamekZakZmeny(st2, nova);
  test('I zamekZakZmeny (server): změna názvu akce po tisku neřídící varianty → hlášená cesta', zm.indexOf('ZAK.nazevAkce') >= 0, zm);
  test('I zamekZakZmeny: před tiskem změna projde', zamekZakZmeny(stara, Object.assign(kop(stara), { nazevAkce: 'X' })).length === 0);
  /* Jeden zákazník: neřídící klon zamčený → název akce volný jako dřív. */
  const z1 = zakazka({ B: false });
  const k = klonujVariantu(z1, z1.varianty[0].id, { aktivovat: false });
  tiskni(z1, k, 'z1', CAS(10));
  test('I jeden zákazník, zamčený neřídící klon: název akce volný (beze změny chování)',
    zamekZakCestaZmrazena(z1, 'ZAK.nazevAkce') === '' && zamekZakZmeny(kop(z1), Object.assign(kop(z1), { nazevAkce: 'X' })).length === 0);
  /* Víc zákazníků, řídící odeslaná: původní hláška o řídící variantě. */
  const z2 = zakazka();
  tiskni(z2, z2.varianty[0], 'z1', CAS(10));
  test('I víc zákazníků, odeslaná řídící: hláška o řídící variantě', /Řídící varianta/.test(zamekZakCestaZmrazena(z2, 'ZAK.nazevAkce')));
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
