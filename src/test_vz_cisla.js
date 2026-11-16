/* ============================================================
 * VZ #598, etapa E2 (#601) — ČÍSLA NABÍDEK S PÍSMENEM ZÁKAZNÍKA
 * (návrh podklady/NAVRH_VICE_ZAKAZNIKU.md § 3; zadání PROMPT_VZ_E2.md bod 1)
 *
 *   řídící zákazník  …9940      …9940.2
 *   další (B)        …9940-B    …9940.2-B
 *
 *  1. cisloSVariantou a variantaCislo z pohledu (vzTiskPohled): řídící bez
 *     písmene, B a C s písmenem, vlastní varianta s příponou (.2-C, .2-B);
 *     prázdné číslo / předloha beze změny; zakázka s jedním zákazníkem →
 *     vzTiskPohled vrací TÝŽ objekt a čísla jsou jako dřív;
 *  2. zamekCisloZakladSedi: …-B, …9940.2-B ano; …9940.-B, cizí základ,
 *     …-A, …-b, …-BB ne;
 *  3. sodCisloNavrh zachová písmeno (s CN i bez CN, skutečný výstup);
 *  4. názvy souborů dokumentů dalšího zákazníka nesou číslo s písmenem
 *     (nabidkaData(…).nazevSouboru, kryciData(…).nazevSouboru), řídící ne;
 *  5. zakazkaDuplicita: „…9940-B" v rejstříku × zakázka „…9940" a naopak
 *     koliduje, „…9940" × „…9941-B" ne;
 *  6. uloJmenoSouboru: zakázka s dalšími zákazníky (i pohled) = jméno bez nich.
 *
 * POJISTKA PROTI PRÁZDNÉMU TESTU (bod 7 níž, běží při každém spuštění):
 * testy písmene (body 1 a 4) se pustí znovu s podvrženou
 * vzPismenoPohledu = () => '' (jako by E2 v jádře nebylo) a musí SELHAT —
 * jinak by ověřovaly něco, co písmeno vůbec nedělá. Ručně ověřeno
 * 16. 11. 2026: kopie src/ se zakazka.js, zamek.js a kryci.js z e29f2b1
 * (před E2, vice_zakazniku.js současný) → 44 prošlo, 15 selhalo: čísla B/C
 * bez písmene (bod 1), …-B / …9940.2-B neprojdou zamekCisloZakladSedi (2),
 * sodCisloNavrh(„2025-OPR-0640-B") vrátí '' (3; varianty s CN písmeno
 * držely už dřív), názvy souborů bez písmene (4), rejstřík „…9940-B"
 * nekoliduje (5) a bod 7.
 * Spuštění: cd src && node test_vz_cisla.js
 * ============================================================ */

/* Moduly do `global` ve stejném pořadí jako CORE v build.py (jako test_vz_model.js). */
const fs = require('fs');
const path = require('path');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./preklad.js');
nacti('./format.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./vice_sachet.js');
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./zakazka.js');
nacti('./zamek.js');
nacti('./vice_zakazniku.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./ares.js');
nacti('./poznamky.js');
nacti('./protokol.js');
nacti('./firma.js');
nacti('./kryci.js');
nacti('./kryci_proj.js');
nacti('./nazvy_souboru.js');
nacti('./uloziste.js');
const N = nacti('./nabidka.js');
const JEKLY = JSON.parse(fs.readFileSync(path.join(__dirname, 'jekly.json'), 'utf8'));

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); } };
const J = x => JSON.stringify(x);

/* Smyšlená data — žádný skutečný zákazník ani cena (zkušební ceník). */
const CISLO = '2026 - OPR - CN - 9940';
const BEZ = s => String(s).replace(/\s+/g, '');
function zakazka(cislo) {
  const z = novaZakazka();
  Object.assign(z, { cislo, objednatel: 'Řídící Zkušební s.r.o.', nazevAkce: 'Zkušební akce', adresa: 'Stavba 1, Kdesi' });
  z.varianty[0].data.cenik = Object.assign(ZC.zkusebniCenik(), { kurzEurKc: 25 });
  return z;
}
/* Zakázka 1: řídící (v1), B sdílí v1, C má vlastní variantu (.2).
 * Zakázka 2: B má vlastní variantu (.2) → „…9940.2-B". */
const Z1 = zakazka(CISLO);
const zB = vzPridej(Z1, { objednatel: 'Beta Zkušební a.s.' }).zakaznik;
const zC = vzPridej(Z1, { objednatel: 'Gama Zkušební s.r.o.' }, { vlastni: true }).zakaznik;
const Z2 = zakazka(CISLO);
const z2B = vzPridej(Z2, { objednatel: 'Beta Zkušební a.s.' }, { vlastni: true }).zakaznik;
const cisla = (zak, id) => { const p = vzTiskPohled(zak, id); return p.varianty.map(v => [cisloSVariantou(p, v), variantaCislo(p, v)]); };

/* Testy, které stojí na písmenu pohledu — bod 7 je pustí i s podvrženou
 * vzPismenoPohledu = () => ''. Vrací [název, podmínka, info]. */
function testyPismene() {
  const out = [];
  const t = (n, c, info) => out.push([n, c, info]);
  t('řídící: číslo bez písmene (cisloSVariantou i variantaCislo)', J(cisla(Z1, 'z1')) === J([[CISLO, CISLO]]), cisla(Z1, 'z1'));
  t('další zákazník B (sdílená varianta): …9940-B', J(cisla(Z1, zB.id)) === J([[CISLO + '-B', CISLO + '-B']]), cisla(Z1, zB.id));
  t('další zákazník C (vlastní varianta .2): …9940.2-C', J(cisla(Z1, zC.id)) === J([[CISLO + '.2-C', CISLO + '.2-C']]), cisla(Z1, zC.id));
  t('vlastní varianta B: …9940.2-B', J(cisla(Z2, z2B.id)) === J([[CISLO + '.2-B', CISLO + '.2-B']]), cisla(Z2, z2B.id));
  const pB = vzTiskPohled(Z1, zB.id);
  const nab = N.nabidkaData(pB, pB.varianty[0], JEKLY, 'cs');
  t('nabídka B: CISLO_NABIDKY i název souboru nesou …9940-B', nab.placeholders.CISLO_NABIDKY === BEZ(CISLO) + '-B'
    && nab.nazevSouboru.indexOf(BEZ(CISLO) + '-B-') > 0, [nab.placeholders.CISLO_NABIDKY, nab.nazevSouboru]);
  const pC = vzTiskPohled(Z1, zC.id);
  const nabC = N.nabidkaData(pC, pC.varianty[0], JEKLY, 'cs');
  t('nabídka C (vlastní varianta): název souboru nese …9940.2-C', nabC.nazevSouboru.indexOf(BEZ(CISLO) + '.2-C-') > 0, nabC.nazevSouboru);
  const kl = kryciData(pB, pB.varianty[0], JEKLY);
  t('krycí list B: název souboru nese …9940-B', kl.nazevSouboru.indexOf(BEZ(CISLO) + '-B-') > 0, kl.nazevSouboru);
  return out;
}

/* ---------- 1. cisloSVariantou / variantaCislo ---------- */
console.log('\n===== 1. ČÍSLO S PÍSMENEM Z POHLEDU =====\n');
testyPismene().slice(0, 4).forEach(([n, c, i]) => test(n, c, i));
{
  const pR = vzTiskPohled(Z1, 'z1');
  test('pohled řídícího nevidí vlastní variantu C', pR.varianty.length === 1 && pR.varianty[0].id === Z1.varianty[0].id);
  test('vzPismenoPohledu: řídící \'\', B, C; celá zakázka (ne pohled) \'\'',
    vzPismenoPohledu(pR) === '' && vzPismenoPohledu(vzTiskPohled(Z1, zB.id)) === 'B'
    && vzPismenoPohledu(vzTiskPohled(Z1, zC.id)) === 'C' && vzPismenoPohledu(Z1) === '');
  test('celá zakázka (ne pohled) s víc zákazníky: čísla jako dřív (bez písmene)',
    cisloSVariantou(Z1, Z1.varianty[0]) === CISLO && cisloSVariantou(Z1, Z1.varianty[1]) === CISLO + '.2'
    && variantaCislo(Z1, Z1.varianty[1]) === CISLO + '.2');
  /* Prázdné číslo / předloha: písmeno se nepřidá. */
  const P = zakazka(''); vzPridej(P, { objednatel: 'Beta Zkušební a.s.' });
  const pP = vzTiskPohled(P, 'z2');
  test('prázdné číslo v pohledu B → prázdno (cisloSVariantou i variantaCislo)',
    cisloSVariantou(pP, pP.varianty[0]) === '' && variantaCislo(pP, pP.varianty[0]) === '', [cisloSVariantou(pP, pP.varianty[0]), variantaCislo(pP, pP.varianty[0])]);
  const P2 = zakazka(ZAK_CISLO_PREDLOHA); vzPridej(P2, { objednatel: 'Beta Zkušební a.s.' });
  const pP2 = vzTiskPohled(P2, 'z2');
  test('předloha čísla („2026 - OPR - CN - ", nevyplněno) v pohledu B: cisloSVariantou beze změny, bez písmene',
    cisloSVariantou(pP2, pP2.varianty[0]) === cisloSVariantou(P2, P2.varianty[0]) && !/-B$/.test(cisloSVariantou(pP2, pP2.varianty[0])),
    [P2.cislo, cisloSVariantou(pP2, pP2.varianty[0])]);
  /* Předloha: variantaCislo musí vrátit totéž co bez víc zákazníků (dřív
   * „2026 - OPR - CN - "), ne „2026 - OPR - CN --B". */
  test('předloha čísla v pohledu B: variantaCislo beze změny, bez písmene',
    variantaCislo(pP2, pP2.varianty[0]) === variantaCislo(P2, P2.varianty[0]), [variantaCislo(P2, P2.varianty[0]), variantaCislo(pP2, pP2.varianty[0])]);
  test('vzCisloSPismenem: prázdno / jen mezery beze změny, neplatné písmeno beze změny',
    vzCisloSPismenem('', 'B') === '' && vzCisloSPismenem('  ', 'B') === '  ' && vzCisloSPismenem('X-1', 'A') === 'X-1'
    && vzCisloSPismenem('X-1', 'b') === 'X-1' && vzCisloSPismenem('X-1 ', 'B') === 'X-1-B');
  /* Jeden zákazník: dnešek beze změny. */
  const J1 = zakazka(CISLO); klonujVariantu(J1, J1.varianty[0].id, { aktivovat: false });
  const pred = J(J1);
  test('jeden zákazník: vzTiskPohled vrací TÝŽ objekt (s id i bez)', vzTiskPohled(J1) === J1 && vzTiskPohled(J1, 'z1') === J1 && vzTiskPohled(J1, 'z2') === J1);
  test('jeden zákazník: čísla beze změny (…9940, …9940.2)', cisloSVariantou(J1, J1.varianty[0]) === CISLO
    && cisloSVariantou(J1, J1.varianty[1]) === CISLO + '.2' && variantaCislo(J1, J1.varianty[1]) === CISLO + '.2');
  test('jeden zákazník: zakázka nezměněna, bez klíčů víc zákazníků', J(J1) === pred && !('vzRidici' in J1) && !('dalsiZakaznici' in J1));
  test('vzCisloRozloz: …9940-B, …9940.2-B, bez písmene, -A, -BB',
    J(vzCisloRozloz(CISLO + '-B')) === J({ zaklad: CISLO, pismeno: 'B' })
    && J(vzCisloRozloz(CISLO + '.2-B')) === J({ zaklad: CISLO + '.2', pismeno: 'B' })
    && vzCisloRozloz(CISLO).pismeno === '' && vzCisloRozloz(CISLO + '-A').pismeno === '' && vzCisloRozloz(CISLO + '-BB').pismeno === '');
}

/* ---------- 2. zamekCisloZakladSedi ---------- */
console.log('\n===== 2. ZÁMEK: ČÍSLO S PÍSMENEM PATŘÍ K ZÁKLADU =====\n');
{
  const z = { cislo: '2025-OPR-9940' };
  const ano = ['2025-OPR-9940', '2025-OPR-9940-B', '2025-OPR-9940-Z', '2025-OPR-9940.2', '2025-OPR-9940.2-B', '2025-OPR-9940.12-C'];
  const ne = ['2025-OPR-9940.-B', '2025-OPR-9941-B', '2025-OPR-994-B', '2025-OPR-9940-A', '2025-OPR-9940-b', '2025-OPR-9940-BB',
    '2025-OPR-9940.2-A', '2025-OPR-9940.2-BB', '2025-OPR-9940-B.2', '2025-OPR-9940--B', '2025-OPR-9940.2.-B', 'JINY-9940-B', ''];
  ano.forEach(c => test('zamekCisloZakladSedi přijme „' + c + '"', zamekCisloZakladSedi(c, z) === true));
  ne.forEach(c => test('zamekCisloZakladSedi odmítne „' + c + '"', zamekCisloZakladSedi(c, z) === false));
  test('zamekCisloZakladSedi: zakázka bez čísla nepřijme „-B"', zamekCisloZakladSedi('-B', { cislo: '' }) === false);
}

/* ---------- 3. sodCisloNavrh ---------- */
console.log('\n===== 3. ČÍSLO SoD ZACHOVÁ PÍSMENO =====\n');
for (const [vstup, ocek] of [
  ['2025-OPR-0640-B', '2025-OPR-SOD-0640-B'],          // bez CN: SOD před číselnou skupinu
  ['2025-OPR-0640', '2025-OPR-SOD-0640'],              // dnešek beze změny
  ['2026 - OPR - CN - 9940-B', '2026 - OPR - SOD - 9940-B'],   // s CN: CN → SOD
  ['2026 - OPR - CN - 9940.2-B', '2026 - OPR - SOD - 9940.2-B'],
  ['2026 - OPR - CN - 9940.2', '2026 - OPR - SOD - 9940.2'],
  ['CN-12-C', 'SOD-12-C'],
  ['2025-OPR-0640-A', ''],                             // „-A" není písmeno zákazníka, číslo nekončí číslicí
]) test('sodCisloNavrh(„' + vstup + '") = „' + ocek + '"', sodCisloNavrh(vstup) === ocek, sodCisloNavrh(vstup));
test('sodCisloNavrh: prázdno → prázdno', sodCisloNavrh('') === '' && sodCisloNavrh(null) === '');

/* ---------- 4. NÁZVY SOUBORŮ ---------- */
console.log('\n===== 4. NÁZVY SOUBORŮ DOKUMENTŮ =====\n');
testyPismene().slice(4).forEach(([n, c, i]) => test(n, c, i));
{
  const pR = vzTiskPohled(Z1, 'z1');
  const nab = N.nabidkaData(pR, pR.varianty[0], JEKLY, 'cs');
  const kl = kryciData(pR, pR.varianty[0], JEKLY);
  test('řídící: nabídka a krycí list bez písmene', nab.nazevSouboru.indexOf(BEZ(CISLO) + '-OCK') > 0 && !/9940-[B-Z]-/.test(nab.nazevSouboru)
    && kl.nazevSouboru.indexOf(BEZ(CISLO) + '-OCK') > 0, [nab.nazevSouboru, kl.nazevSouboru]);
  const J1 = zakazka(CISLO);
  test('jeden zákazník: název souboru nabídky bez písmene', N.nabidkaData(J1, J1.varianty[0], JEKLY, 'cs').nazevSouboru.indexOf(BEZ(CISLO) + '-OCK') > 0);
  const pB = vzTiskPohled(Z1, zB.id);
  test('název souboru nabídky B nenese jméno řídícího', N.nabidkaData(pB, pB.varianty[0], JEKLY, 'cs').nazevSouboru.indexOf('Ridici') < 0);
}

/* ---------- 5. zakazkaDuplicita ---------- */
console.log('\n===== 5. KONTROLA DUPLICIT ČÍSLA =====\n');
{
  const rej = (cislo, soubor) => [{ cislo, soubor, nazevAkce: 'Jiná akce' }];
  test('rejstřík „…9940-B" × zakázka „…9940" → kolize', zakazkaDuplicita({ cislo: CISLO }, rej(CISLO + '-B', 'a.json')).cislo === 'a.json');
  test('rejstřík „…9940" × zakázka „…9940-B" → kolize', zakazkaDuplicita({ cislo: CISLO + '-B' }, rej(CISLO, 'b.json')).cislo === 'b.json');
  test('rejstřík „…9940.2-B"? jiná varianta = jiné číslo → bez kolize se „…9940" (jako dřív u .2)',
    zakazkaDuplicita({ cislo: CISLO }, rej(CISLO + '.2-B', 'c.json')).cislo === zakazkaDuplicita({ cislo: CISLO }, rej(CISLO + '.2', 'c.json')).cislo);
  test('„…9940" × „…9941-B" → bez kolize', zakazkaDuplicita({ cislo: CISLO }, rej('2026 - OPR - CN - 9941-B', 'd.json')).cislo === '');
  test('„…9940-B" × „…9940-C" (týž základ) → kolize', zakazkaDuplicita({ cislo: CISLO + '-B' }, rej(CISLO + '-C', 'e.json')).cislo === 'e.json');
  test('vlastní soubor se nehlásí', zakazkaDuplicita({ cislo: CISLO }, rej(CISLO + '-B', 'a.json'), 'a.json').cislo === '');
}

/* ---------- 6. uloJmenoSouboru ---------- */
console.log('\n===== 6. JMÉNO SOUBORU ZAKÁZKY = ZÁKLAD =====\n');
{
  const jen = zakazka(CISLO);
  const zaklad = uloJmenoSouboru(jen);
  test('zakázka s dalšími zákazníky: jméno souboru jako bez nich', uloJmenoSouboru(Z1) === zaklad && uloJmenoSouboru(Z2) === zaklad, [uloJmenoSouboru(Z1), zaklad]);
  test('pohled dalšího zákazníka: jméno souboru taky základ (bez písmene)', uloJmenoSouboru(vzTiskPohled(Z1, zB.id)) === zaklad
    && uloJmenoSouboru(vzTiskPohled(Z1, zC.id)) === zaklad && !/-B\./.test(zaklad));
}

/* ---------- 7. POJISTKA: bez písmene pohledu testy písmene selžou ---------- */
console.log('\n===== 7. POJISTKA PROTI PRÁZDNÉMU TESTU =====\n');
{
  const puv = global.vzPismenoPohledu;
  global.vzPismenoPohledu = () => '';      // jako by jádro E2 písmeno nedávalo
  let vysledky;
  try { vysledky = testyPismene(); } finally { global.vzPismenoPohledu = puv; }
  const selhaly = vysledky.filter(([, c]) => !c).map(([n]) => n);
  /* Řídící (první test) písmeno nemá, takže projde i bez E2; ostatní musí selhat. */
  test('bez písmene pohledu selže každý test písmene kromě řídícího (' + selhaly.length + ' z ' + (vysledky.length - 1) + ')',
    selhaly.length === vysledky.length - 1 && vysledky[0][1] === true, selhaly);
  test('po pojistce je vzPismenoPohledu zpět a testy písmene zase projdou', testyPismene().every(([, c]) => c));
}

/* Číslo SoD zamčené sdílené varianty (overit_vz_tisk: snímek zámku i ruční
 * přepis nesou číslo řídícího) — v pohledu B s písmenem. */
{
  const pole = KRYCI_SEKCE.map(x => x.pole).flat().find(x => x.id === 'cisloSod');
  const pB = vzTiskPohled(Z1, zB.id), vB = pB.varianty[0];
  const zm = { cisloSod: '2026 - OPR - SOD - 9940' };
  test('cisloSod: snímek zámku v pohledu B → …SOD - 9940-B',
    kryciHodnota(pole, {}, { zak: pB, varianta: vB, zamceno: true, zmrazeno: zm }) === '2026 - OPR - SOD - 9940-B');
  test('cisloSod: ruční přepis s písmenem zůstane',
    kryciHodnota(pole, { hodnoty: { cisloSod: 'SOD-1-B' } }, { zak: pB, varianta: vB }) === 'SOD-1-B');
  const pA = vzTiskPohled(Z1, '');
  test('cisloSod: řídící beze změny (snímek)', kryciHodnota(pole, {}, { zak: pA, varianta: pA.varianty[0], zamceno: true, zmrazeno: zm }) === '2026 - OPR - SOD - 9940');
}

console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
process.exit(fail ? 1 : 0);
