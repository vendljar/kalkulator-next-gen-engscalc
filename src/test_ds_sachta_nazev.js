/* #648 (K49-I6, dávka DS, 21. 11. 2026) — VÝCHOZÍ NÁZEV „Šachta N" V CIZOJAZYČNÉ NABÍDCE.
 *
 * Kolo 49: CN EN tiskla „Shaft 1", ale „Šachta 2" — tlačítko „+ přidat šachtu"
 * zapisuje výchozí název „Šachta N" do dat a nabídka překládala jen PRÁZDNÝ
 * název; SoD EN/DE netiskla přeložený ani jeden („Šachta 1/2").
 *  A) vsNazevPreloz / vsNazevL: prázdný i uložený „Šachta N" → Shaft / Schacht /
 *     Gaine N; ruční název beze změny; česky beze změny;
 *  B) nabídka (Word data, symboly šachty, Word smyčka) EN/DE/FR bez „Šachta";
 *     ruční název zůstává; česky „Šachta 1/2";
 *  C) online náhled nabídky (nabidkaNahledSekce) EN bez „Šachta";
 *  D) smlouva o dílo (předmět a rozpis šachet) EN/DE/FR bez „Šachta", česky
 *     beze změny.
 * Pojistka: před opravou sada padá (vsNazevPreloz neexistuje, nabídka EN
 * tiskne „Šachta 2", SoD EN „Šachta 1 … Šachta 2") — viz zpráva commitu.
 * Spuštění: node src/test_ds_sachta_nazev.js */
'use strict';
const path = require('path');
const fs = require('fs');
const CORE = ['build_info.js', 'nazvy_souboru.js', 'preklad.js', 'format.js', 'engine.js', 'vice_sachet.js', 'engine_proj.js', 'techspec.js',
  'zakazka.js', 'uloziste.js', 'retence_zaloh.js', 'zamek.js', 'seznam.js', 'archiv.js', 'docxgen.js', 'xlsx.js', 'dokumenty.js',
  'sleva.js', 'schvalovani.js', 'zaokrouhleni.js', 'marze.js', 'kontroly.js', 'ares.js', 'poznamky.js', 'protokol.js', 'firma.js',
  'zpracovatel.js', 'podminky.js', 'plan_plateb.js', 'nabidka.js', 'nabidka_proj.js', 'sod.js', 'kryci.js', 'kryci_proj.js',
  'cenik.js', 'cenik_stari.js', 'cenik_rady.js', 'vyjimky.js', 'rucni_ceny.js', 'katalog.js', 'prepisy.js', 'slovnik.js',
  'konfigurace.js', 'sablony_online.js', 'sablona_obsah.js', 'analytika.js', 'nastaveni_db.js', 'program.js', 'ukazkove.js',
  'prava.js', 'zobrazeni.js', 'zakaznici.js', 'controlling.js', 'pd_nanecisto.js', 'objednane.js', 'standard_ock.js'];
CORE.forEach(f => { const m = require(path.join(__dirname, f)); if (m && typeof m === 'object') Object.assign(global, m); });
const ZC = require('./zkusebni_cenik.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const J = JSON.parse(fs.readFileSync(path.join(__dirname, 'jekly.json'), 'utf8'));
const V = require('./vice_sachet.js');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 400)); } };
const kop = x => JSON.parse(JSON.stringify(x));
const SLOVO = { en: 'Shaft', de: 'Schacht', fr: 'Gaine' };

/* ---------- A) funkce ---------- */
{
  test('A vsNazevPreloz existuje', typeof V.vsNazevPreloz === 'function' && typeof V.vsNazevL === 'function');
  if (typeof V.vsNazevPreloz === 'function') {
    Object.keys(SLOVO).forEach(L => {
      test('A ' + L + ': uložený „Šachta 2" → ' + SLOVO[L] + ' 2', V.vsNazevPreloz('Šachta 2', L) === SLOVO[L] + ' 2', V.vsNazevPreloz('Šachta 2', L));
      test('A ' + L + ': prázdný název šachty 1 → ' + SLOVO[L] + ' 1', V.vsNazevL({ nazev: '' }, 0, L) === SLOVO[L] + ' 1', V.vsNazevL({ nazev: '' }, 0, L));
      test('A ' + L + ': ruční název beze změny', V.vsNazevL({ nazev: 'Výtah C' }, 2, L) === 'Výtah C'
        && V.vsNazevPreloz('Šachta 2 (kopie)', L) === 'Šachta 2 (kopie)' && V.vsNazevPreloz('Šachta u schodiště', L) === 'Šachta u schodiště');
    });
    test('A česky beze změny', V.vsNazevL({ nazev: '' }, 0, 'cz') === 'Šachta 1' && V.vsNazevPreloz('Šachta 2', 'cz') === 'Šachta 2');
    test('A neznámý jazyk = jako česky', V.vsNazevPreloz('Šachta 2', 'xx') === 'Šachta 2');
  }
}

/* Zakázka: šachta 1 bez názvu, šachta 2 s uloženým „Šachta 2" (+ přidat šachtu),
 * šachta 3 s ručním názvem „Výtah C". Model 2 (víc šachet). */
const ZAD = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 };
function zakazka() {
  const zak = novaZakazka();
  zak.cislo = '2026-OPR-CN-9648'; zak.nazevAkce = 'DS #648';
  const v = zak.varianty[0];
  Object.assign(v.data.ock.zadani, ZAD, { typSachty: 'exteriérová' });
  v.data.ock.fixes = true;
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), { kurzEurKc: 25 });
  v.data.ock.nazev = '';
  const zB = Object.assign(kop(DEFAULT_ZADANI), ZAD, { sirka: 2.4, typSachty: 'interiérová', profily: kop(PROFILY_VYCHOZI['interiérová']) });
  v.data.ock.dalsi = [{ id: 's_b', nazev: 'Šachta 2', ks: 2, zadani: zB }, { id: 's_c', nazev: 'Výtah C', ks: 1, zadani: kop(zB) }];
  return { zak, v };
}

/* ---------- B) nabídka ---------- */
{
  const { zak, v } = zakazka();
  const dCz = nabidkaData(zak, v, J, 'cz');
  test('B česky: Šachta 1, Šachta 2, Výtah C', dCz.sachty && dCz.sachty.map(s => s.nazev).join('|') === 'Šachta 1|Šachta 2|Výtah C',
    dCz.sachty && dCz.sachty.map(s => s.nazev));
  Object.keys(SLOVO).forEach(L => {
    const d = nabidkaData(zak, v, J, L);
    const jm = (d.sachty || []).map(s => s.nazev);
    test('B ' + L + ': ' + SLOVO[L] + ' 1, ' + SLOVO[L] + ' 2, Výtah C', jm.join('|') === [SLOVO[L] + ' 1', SLOVO[L] + ' 2', 'Výtah C'].join('|'), jm);
    const sym = (d.sachtyWord && d.sachtyWord.polozky || []).map(p => p.SACHTA_NAZEV + ' ' + p.SACHTA_TS_NAZEV).join(' ');
    test('B ' + L + ': symboly Word smyčky (SACHTA_NAZEV, SACHTA_TS_NAZEV) bez „Šachta"', sym && !/Šachta/.test(sym), sym);
    test('B ' + L + ': ruční název ve Wordu zůstává', /Výtah C/.test(sym), sym);
  });
}

/* ---------- C) online náhled nabídky ---------- */
{
  const { zak, v } = zakazka();
  const d = nabidkaData(zak, v, J, 'en');
  const sek = nabidkaNahledSekce(d.placeholders, 'en', d.platbyOck, d.tsExtra, d.sachty);
  const txt = JSON.stringify(sek);
  test('C náhled EN: názvy šachet bez „Šachta"', !/Šachta \d/.test(txt) && /Shaft 2/.test(txt) && /Shaft 1/.test(txt), txt.match(/(Šachta|Shaft) \d/g));
}

/* ---------- D) smlouva o dílo ---------- */
{
  const { zak, v } = zakazka();
  const cz = { placeholders: {} };
  sodSachtySymboly(cz, zak, v, J, 'cz');
  test('D SoD česky: předmět „Šachta 1 … Šachta 2 … Výtah C"', /\(Šachta 1 1 ks, Šachta 2 2 ks, Výtah C 1 ks\)$/.test(cz.placeholders.SACHTY_SOD_PREDMET || ''),
    cz.placeholders.SACHTY_SOD_PREDMET);
  Object.keys(SLOVO).forEach(L => {
    const dd = { placeholders: {} };
    sodSachtySymboly(dd, zak, v, J, L);
    const p = String(dd.placeholders.SACHTY_SOD_PREDMET || ''), r = String(dd.placeholders.SACHTY_SOD_ROZPIS || '');
    test('D SoD ' + L + ': předmět bez „Šachta", s ' + SLOVO[L] + ' 1/2 a Výtah C', p && !/Šachta/.test(p)
      && p.indexOf(SLOVO[L] + ' 1 ') >= 0 && p.indexOf(SLOVO[L] + ' 2 ') >= 0 && /Výtah C/.test(p), p);
    test('D SoD ' + L + ': rozpis bez „Šachta"', r && !/Šachta/.test(r) && r.split('\n')[0].indexOf(SLOVO[L] + ' 1') === 0 && /Výtah C/.test(r), r);
  });
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
