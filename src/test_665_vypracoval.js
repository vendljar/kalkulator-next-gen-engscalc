/* ============================================================
 * #665 (rozhodnutí J. V. 18. 11. 2026) — blok „Vypracoval" odeslané nabídky
 * je zmrazený ve snímku zámku (`zamek.zpracovatel`), dotisk ho bere odtud,
 * ne z dnes přihlášeného účtu.
 *  - zpracovatelPlaceholders / zpracovatelObrazky: zamčená varianta se
 *    snímkem → jméno, funkce, telefon a e-mail ze snímku, podpis jen téhož
 *    člověka (shoda e-mailu); bez snímku (starší zámek) a nezamčená varianta
 *    → přihlášený jako dřív;
 *  - nabidkaData a nabidkaProjData (Word i online náhled) nesou ZPRAC_* ze
 *    snímku;
 *  - zamkniVariantu zapíše snímek jen při prvním zámku (další tisk ho nemění),
 *    zamekZpracovatelSnimek bere profil bez podpisu;
 *  - uloZamekRazitkaDrz drží uložený snímek (klient ho nepřepíše).
 * Server (snímek z relace) hlídá netlify/test_665_vypracoval.mjs.
 * POJISTKA: před opravou selžou testy „dotisk … ze snímku", „podpis kolegy
 * se nevloží", „zamkniVariantu zapíše snímek" a „server drží snímek".
 * Spuštění: node src/test_665_vypracoval.js
 * ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');

const CORE = ['build_info.js', 'nazvy_souboru.js', 'preklad.js', 'format.js', 'engine.js', 'vice_sachet.js', 'engine_proj.js', 'techspec.js',
  'zakazka.js', 'uloziste.js', 'retence_zaloh.js', 'zamek.js', 'vice_zakazniku.js', 'seznam.js', 'archiv.js', 'docxgen.js', 'xlsx.js',
  'dokumenty.js', 'sleva.js', 'schvalovani.js', 'zaokrouhleni.js', 'marze.js', 'kontroly.js', 'ares.js', 'poznamky.js', 'protokol.js', 'firma.js',
  'zpracovatel.js', 'podminky.js', 'plan_plateb.js', 'nabidka.js', 'nabidka_proj.js', 'sod.js', 'kryci.js', 'kryci_proj.js'];
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

function zakazka() {
  const zak = novaZakazka();
  Object.assign(zak, { objednatel: 'Alfa zkušební s.r.o.', cislo: '2026 - OPR - CN - 9665', nazevAkce: 'Bytový dům Zkušební' });
  zak.projHlavicka = Object.assign({}, zak.projHlavicka, { cislo: '2026 - OVP - CN - 9665' });
  const v = zak.varianty[0];
  Object.assign(v.data.ock.zadani, { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 });
  v.data.ock.fixes = true;
  return zak;
}
function zamkni(zak, v, zpracovatel) {
  return zamkniVariantu(v, { typ: 'nabidka', kdo: 'x', kdy: '2026-11-21T10:00:00.000Z', cislo: variantaCislo(zak, v),
    vysledek: zamekVysledekSpocti(v, JEKLY, 'test665'), snimek: zamekSnimekSpocti(v), zpracovatel });
}

/* ---------- snímek a první zámek ---------- */
{
  const s = zamekZpracovatelSnimek(PUVODNI);
  test('zamekZpracovatelSnimek: profil bez podpisu', !!s && s.email === PUVODNI.email && s.jmeno === PUVODNI.jmeno && s.titul === 'Ing.'
    && s.funkce === PUVODNI.funkce && s.telefon === PUVODNI.telefon && !('podpis' in s), s);
  test('zamekZpracovatelSnimek: bez e-mailu → null', zamekZpracovatelSnimek({ jmeno: 'X' }) === null && zamekZpracovatelSnimek(null) === null);
  test('zamekZpracovatelSnimek: ostré závorky pryč', zamekZpracovatelSnimek({ email: 'a@priklad.cz', jmeno: '<b>Jan</b>' }).jmeno === 'bJan/b');
  const zak = zakazka();
  const v = zak.varianty[0];
  zamkni(zak, v, zamekZpracovatelSnimek(PUVODNI));
  test('zamkniVariantu zapíše snímek zpracovatele', !!v.zamek.zpracovatel && v.zamek.zpracovatel.email === PUVODNI.email, v.zamek.zpracovatel);
  zamkni(zak, v, zamekZpracovatelSnimek(KOLEGA));
  test('další tisk snímek nezmění', v.zamek.zpracovatel && v.zamek.zpracovatel.email === PUVODNI.email && v.zamek.tisky.length === 2);
  const klic = uloZamekKlic(v);
  const v2 = JSON.parse(JSON.stringify(v)); v2.zamek.zpracovatel.jmeno = 'Jiný';
  test('snímek je mimo klíč zámku (starší klient bez 409)', uloZamekKlic(v2) === klic);
}

/* ---------- placeholders a dokumenty ---------- */
{
  const zak = zakazka();
  const v = zak.varianty[0];
  prihlas(PUVODNI);
  zamkni(zak, v, zamekZpracovatelSnimek(PUVODNI));
  prihlas(KOLEGA);   // dotiskne kolega
  const p = zpracovatelPlaceholders(null, v);
  test('dotisk kolegou: ZPRAC_* ze snímku', p.ZPRAC_JMENO === 'Ing. Petr Původní' && p.ZPRAC_EMAIL === PUVODNI.email
    && p.ZPRAC_TEL === PUVODNI.telefon && p.ZPRAC_FUNKCE === PUVODNI.funkce && p.FIRMA_ZPRACOVAL === 'Ing. Petr Původní', p);
  test('dotisk kolegou: podpis kolegy se nevloží', JSON.stringify(zpracovatelObrazky(v)) === '{}', zpracovatelObrazky(v));
  const d = nabidkaData(zak, v, JEKLY, 'cz');
  test('dotisk nabídky OCK (nabidkaData): ZPRAC_JMENO ze snímku', d.placeholders.ZPRAC_JMENO === 'Ing. Petr Původní', d.placeholders.ZPRAC_JMENO);
  test('dotisk nabídky OCK: obrázek podpisu kolegy chybí', !(d.obrazky && d.obrazky.ZPRAC_PODPIS), d.obrazky && Object.keys(d.obrazky));
  let dp = null; try { dp = nabidkaProjData(zak, v, 'cz'); } catch (e) { dp = { chyba: e.message }; }
  test('dotisk nabídky PROJ (nabidkaProjData): ZPRAC_JMENO ze snímku', dp && dp.placeholders && dp.placeholders.ZPRAC_JMENO === 'Ing. Petr Původní', dp && (dp.chyba || dp.placeholders.ZPRAC_JMENO));
  /* původní obchodník změnil jméno v účtu */
  prihlas(Object.assign({}, PUVODNI, { jmeno: 'Petr Přejmenovaný' }));
  test('dotisk po opravě jména: jméno z doby odeslání', zpracovatelPlaceholders(null, v).ZPRAC_JMENO === 'Ing. Petr Původní');
  test('dotisk týmž člověkem: jeho podpis', zpracovatelObrazky(v).ZPRAC_PODPIS === PUVODNI.podpis);
  /* nezamčená varianta a starší zámek */
  const zk2 = zakazka();
  prihlas(KOLEGA);
  test('nezamčená varianta: přihlášený', zpracovatelPlaceholders(null, zk2.varianty[0]).ZPRAC_JMENO === 'Karel Kolega'
    && zpracovatelObrazky(zk2.varianty[0]).ZPRAC_PODPIS === KOLEGA.podpis);
  zamkni(zk2, zk2.varianty[0], null);
  test('starší zámek bez snímku: přihlášený jako dřív', !('zpracovatel' in zk2.varianty[0].zamek)
    && zpracovatelPlaceholders(null, zk2.varianty[0]).ZPRAC_JMENO === 'Karel Kolega' && zpracovatelObrazky(zk2.varianty[0]).ZPRAC_PODPIS === KOLEGA.podpis);
  test('bez varianty (volající bez parametru): přihlášený', zpracovatelPlaceholders(null).ZPRAC_JMENO === 'Karel Kolega');
}

/* ---------- server drží uložený snímek ---------- */
{
  const zak = zakazka();
  zamkni(zak, zak.varianty[0], zamekZpracovatelSnimek(PUVODNI));
  const nova = JSON.parse(JSON.stringify(zak));
  nova.varianty[0].zamek.zpracovatel = { email: 'podvrh@priklad.cz', jmeno: 'Podvrh' };
  uloZamekRazitkaDrz(zak, nova);
  test('uloZamekRazitkaDrz: podvržený snímek → uložený', nova.varianty[0].zamek.zpracovatel.email === PUVODNI.email, nova.varianty[0].zamek.zpracovatel);
  const bez = JSON.parse(JSON.stringify(zak)); delete bez.varianty[0].zamek.zpracovatel;
  uloZamekRazitkaDrz(zak, bez);
  test('uloZamekRazitkaDrz: smazaný snímek se vrátí', bez.varianty[0].zamek.zpracovatel && bez.varianty[0].zamek.zpracovatel.email === PUVODNI.email);
  const stary = zakazka(); zamkni(stary, stary.varianty[0], null);
  const st2 = JSON.parse(JSON.stringify(stary)); st2.varianty[0].zamek.zpracovatel = { email: 'podvrh@priklad.cz' };
  uloZamekRazitkaDrz(stary, st2);
  test('uloZamekRazitkaDrz: starší zámek snímek nedostane', !('zpracovatel' in st2.varianty[0].zamek));
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
