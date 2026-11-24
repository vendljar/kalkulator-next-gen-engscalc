/* ============================================================
 * K56-I2 (kolo 56, rozhodnutí J. V. 24. 11. 2026) — snímek zpracovatele ze
 * zámku (#665 / RJ #715: jméno, kontakty, sken podpisu z prvního odeslání)
 * platí JEN pro cenovou nabídku (CN OCK i PROJ, všechny jazyky, Word
 * i online tisk). Smlouva o dílo (OCK i PROJ) a objednávka PROJ („Vystavil")
 * nesou toho, kdo dokument PRÁVĚ TISKNE — přihlášeného zpracovatele, jako
 * před #665.
 *
 * Scénář: varianta zamčená odesláním nabídky Petra Původního (snímek se
 * skenem podpisu), dokumenty tiskne přihlášený Karel Kolega.
 *  - CN OCK a CN PROJ (cz, en): ZPRAC_* a FIRMA_ZPRACOVAL* = Původní, sken
 *    = zmrazená kopie Původního (beze změny);
 *  - SoD OCK (cz, en) a SoD PROJ: ZPRAC_*, FIRMA_ZPRACOVAL* = Kolega, sken
 *    podpisu = Kolegův;
 *  - objednávka PROJ: „Vystavil" = Kolega (jméno, telefon, e-mail);
 *  - nezamčená varianta a tisk týmž člověkem beze změny.
 * POJISTKA: před opravou (6722ad9) SoD OCK/PROJ a objednávka PROJ nesou
 * Původního — testy „SoD … tiskař" a „objednávka … tiskař" selžou.
 * Spuštění: node src/test_k56i2_tiskar.js
 * ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');

const CORE = ['build_info.js', 'nazvy_souboru.js', 'preklad.js', 'format.js', 'engine.js', 'vice_sachet.js', 'engine_proj.js', 'techspec.js',
  'zakazka.js', 'uloziste.js', 'retence_zaloh.js', 'zamek.js', 'vice_zakazniku.js', 'seznam.js', 'archiv.js', 'docxgen.js', 'xlsx.js',
  'dokumenty.js', 'sleva.js', 'schvalovani.js', 'zaokrouhleni.js', 'marze.js', 'kontroly.js', 'ares.js', 'poznamky.js', 'protokol.js', 'firma.js',
  'zpracovatel.js', 'podminky.js', 'plan_plateb.js', 'nabidka.js', 'nabidka_proj.js', 'objednane.js', 'sod.js', 'kryci.js', 'kryci_proj.js',
  'objednavka_proj.js'];
CORE.forEach(f => { const m = require(path.join(__dirname, f)); if (m && typeof m === 'object') Object.assign(global, m); });
const ZC = require('./zkusebni_cenik.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const JEKLY = JSON.parse(fs.readFileSync(path.join(__dirname, 'jekly.json'), 'utf8'));

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + (info === undefined ? '' : '  ' + JSON.stringify(info).slice(0, 500))); } };

const PUVODNI = { email: 'puvodni.obchodnik@priklad.cz', jmeno: 'Petr Původní', titul: 'Ing.', funkce: 'Obchodní technik', telefon: '212 300 111', podpis: 'data:image/png;base64,PUVODNI' };
const KOLEGA = { email: 'kolega@priklad.cz', jmeno: 'Karel Kolega', titul: '', funkce: 'Vedoucí', telefon: '212 300 222', podpis: 'data:image/png;base64,KOLEGA' };
const prihlas = j => { global.ONLINE_STAV = { ja: Object.assign({}, j) }; };
const OTISK = 'a'.repeat(32);
const SKEN_PUVODNI = 'data:image/png;base64,UFVWT0ROSQ==';

function zakazka() {
  const zak = novaZakazka();
  Object.assign(zak, { objednatel: 'Alfa zkušební s.r.o.', cislo: '2026 - OPR - CN - 9756', nazevAkce: 'Bytový dům Zkušební',
    adresa: 'Zkušební 1, Praha', adresaObjednatele: 'Vzorová 2, Praha', ico: '00000001' });
  zak.projHlavicka = Object.assign({}, zak.projHlavicka, { cislo: '2026 - OVP - CN - 9756', objednatel: 'Alfa zkušební s.r.o.',
    nazevAkce: 'Bytový dům Zkušební', adresa: 'Zkušební 1, Praha' });
  const v = zak.varianty[0];
  Object.assign(v.data.ock.zadani, { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 });
  v.data.ock.fixes = true;
  v.data.cenik.kurzEurKc = 25;   // cizojazyčný dokument v eurech
  if (v.data.proj && v.data.proj.cenik) v.data.proj.cenik.kurzEurKc = 25;
  return zak;
}
function zamkni(zak, v, zpracovatel) {
  return zamkniVariantu(v, { typ: 'nabidka', kdo: 'x', kdy: '2026-11-21T10:00:00.000Z', cislo: variantaCislo(zak, v),
    vysledek: zamekVysledekSpocti(v, JEKLY, 'testK56I2'), snimek: zamekSnimekSpocti(v), zpracovatel });
}
const jeKolega = p => p.ZPRAC_JMENO === 'Karel Kolega' && p.FIRMA_ZPRACOVAL === 'Karel Kolega'
  && p.ZPRAC_EMAIL === KOLEGA.email && p.ZPRAC_TEL === KOLEGA.telefon && p.ZPRAC_FUNKCE === KOLEGA.funkce;
const jePuvodni = p => /Petr Původní/.test(p.ZPRAC_JMENO) && /Petr Původní/.test(p.FIRMA_ZPRACOVAL)
  && p.ZPRAC_EMAIL === PUVODNI.email && p.ZPRAC_TEL === PUVODNI.telefon;
const vyber = p => ({ ZPRAC_JMENO: p.ZPRAC_JMENO, ZPRAC_EMAIL: p.ZPRAC_EMAIL, FIRMA_ZPRACOVAL: p.FIRMA_ZPRACOVAL });

/* ---------- zamčená varianta, tiskne kolega ---------- */
prihlas(PUVODNI);
const zak = zakazka(), v = zak.varianty[0];
zamkni(zak, v, Object.assign(zamekZpracovatelSnimek(PUVODNI), { podpisOtisk: OTISK }));
zpracovatelPodpisZamkuUloz(OTISK, SKEN_PUVODNI);
prihlas(KOLEGA);
test('příprava: varianta je zamčená se snímkem Původního', !!(v.zamek && v.zamek.zamceno && v.zamek.zpracovatel
  && v.zamek.zpracovatel.email === PUVODNI.email));

/* CN beze změny (#665 / RJ) */
['cz', 'en'].forEach(L => {
  const d = nabidkaData(zak, v, JEKLY, L);
  test('CN OCK ' + L + ': Vypracoval = Původní ze snímku zámku', jePuvodni(d.placeholders), vyber(d.placeholders));
  test('CN OCK ' + L + ': sken = zmrazená kopie Původního', d.obrazky.ZPRAC_PODPIS === SKEN_PUVODNI);
  const dp = nabidkaProjData(zak, v, L);
  test('CN PROJ ' + L + ': Vypracoval = Původní ze snímku zámku', jePuvodni(dp.placeholders), vyber(dp.placeholders));
  test('CN PROJ ' + L + ': sken = zmrazená kopie Původního', dp.obrazky.ZPRAC_PODPIS === SKEN_PUVODNI);
});

/* SoD OCK — tiskař */
['cz', 'en'].forEach(L => {
  let d = null, chyba = '';
  try { d = sodData(zak, v, JEKLY, L); } catch (e) { chyba = e.message; }
  test('SoD OCK ' + L + ': vznikne', !!d, chyba);
  if (!d) return;
  test('SoD OCK ' + L + ': zpracovatel = tiskař (Kolega), ne snímek zámku', jeKolega(d.placeholders), vyber(d.placeholders));
  test('SoD OCK ' + L + ': sken podpisu = tiskaře', d.obrazky && d.obrazky.ZPRAC_PODPIS === KOLEGA.podpis, d.obrazky && String(d.obrazky.ZPRAC_PODPIS).slice(0, 40));
  test('SoD OCK ' + L + ': cena = nabídka (beze změny)', d.placeholders.CENA_BEZ_DPH === nabidkaData(zak, v, JEKLY, L, undefined, { zive: true }).placeholders.CENA_BEZ_DPH);
});

/* SoD PROJ — tiskař */
{
  let d = null, chyba = '';
  try { d = sodProjData(zak, v, 'cz'); } catch (e) { chyba = e.message; }
  test('SoD PROJ: vznikne', !!d, chyba);
  if (d) {
    test('SoD PROJ: zpracovatel = tiskař (Kolega), ne snímek zámku', jeKolega(d.placeholders), vyber(d.placeholders));
    test('SoD PROJ: sken podpisu = tiskaře', d.obrazky && d.obrazky.ZPRAC_PODPIS === KOLEGA.podpis);
  }
}

/* Objednávka PROJ — Vystavil = tiskař */
{
  let o = null, chyba = '';
  try { o = objednavkaProjData(zak, v, { dnes: new Date(2026, 10, 24) }); } catch (e) { chyba = e.message; }
  test('objednávka PROJ: vznikne', !!o && !o.chyba, chyba || (o && o.chyba));
  if (o) test('objednávka PROJ: Vystavil = tiskař (Kolega: jméno, telefon, e-mail)',
    o.vystavil === 'Karel Kolega, 212 300 222, kolega@priklad.cz', o.vystavil);
}

/* Data nabídky se přepisem smlouvy nezmění (sdílený objekt obrázků / symbolů). */
{
  sodData(zak, v, JEKLY, 'cz'); sodProjData(zak, v, 'cz');
  const d = nabidkaData(zak, v, JEKLY, 'cz');
  test('CN OCK po vytištění SoD dál Původní', jePuvodni(d.placeholders) && d.obrazky.ZPRAC_PODPIS === SKEN_PUVODNI, vyber(d.placeholders));
}

/* ---------- týž člověk a nezamčená varianta: beze změny ---------- */
{
  prihlas(PUVODNI);
  const d = sodData(zak, v, JEKLY, 'cz');
  test('SoD tištěná původním zpracovatelem: jeho jméno', /Petr Původní/.test(d.placeholders.ZPRAC_JMENO) && d.placeholders.ZPRAC_EMAIL === PUVODNI.email);
  prihlas(KOLEGA);
  const z2 = zakazka();
  const d2 = sodData(z2, z2.varianty[0], JEKLY, 'cz'), n2 = nabidkaData(z2, z2.varianty[0], JEKLY, 'cz');
  test('nezamčená varianta: SoD i CN = přihlášený', jeKolega(d2.placeholders) && jeKolega(n2.placeholders), [vyber(d2.placeholders), vyber(n2.placeholders)]);
  global.ONLINE_STAV = null;
  const d3 = sodData(z2, z2.varianty[0], JEKLY, 'cz');
  test('bez přihlášení: SoD bez zpracovatele a bez skenu', !d3.placeholders.ZPRAC_JMENO && !(d3.obrazky && d3.obrazky.ZPRAC_PODPIS));
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
