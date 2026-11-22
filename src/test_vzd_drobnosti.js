/* ============================================================
 * #674 (VZ-F2-R2) — drobnosti víc zákazníků po VZ-F2.
 *  (a) plnaMocData hlídá vzTiskHlidej: ze surové zakázky s víc zákazníky
 *      dokument nevznikne (cizí ruční zmocnitel by prošel); z pohledu
 *      zákazníka a u jednoho zákazníka ano.
 *  (b) vzIcoKlic: úvodní nuly na 8 číslic — „027182818" a „27182818" jsou
 *      totéž IČO (vzIcoDuplicita je najde); „1234567" = „01234567".
 *  (c) hláška bez dvojitého „Neuloženo:" — netlify/test_vz_server.mjs.
 *  (d) klient: řídící s písmenem (B po výměně), kterému odešla CN — název,
 *      sídlo, IČO a DIČ v hlavičce zmrazené (zamekZakCestaZmrazena), jako je
 *      hlídá server (vzServerZakaznici § 5, netlify/test_vz_server.mjs);
 *      kontakt volný; řídící z1 po CN volný jako dřív.
 * POJISTKA: před opravou selže (a) „surová zakázka → chyba", (b) obě
 * porovnání s úvodní nulou a (d) „B řídící: název/IČO zmrazené".
 * Spuštění: node src/test_vzd_drobnosti.js
 * ============================================================ */
'use strict';
const path = require('path');

const CORE = ['build_info.js', 'nazvy_souboru.js', 'preklad.js', 'format.js', 'engine.js', 'vice_sachet.js', 'engine_proj.js', 'techspec.js',
  'zakazka.js', 'uloziste.js', 'retence_zaloh.js', 'zamek.js', 'vice_zakazniku.js', 'seznam.js', 'archiv.js', 'docxgen.js', 'xlsx.js',
  'dokumenty.js', 'sleva.js', 'schvalovani.js', 'zaokrouhleni.js', 'marze.js', 'kontroly.js', 'ares.js', 'poznamky.js', 'protokol.js', 'firma.js',
  'zpracovatel.js', 'podminky.js', 'plan_plateb.js', 'nabidka.js', 'nabidka_proj.js', 'sod.js', 'kryci.js', 'kryci_proj.js'];
CORE.forEach(f => { const m = require(path.join(__dirname, f)); if (m && typeof m === 'object') Object.assign(global, m); });
const ZC = require('./zkusebni_cenik.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + (info === undefined ? '' : '  ' + JSON.stringify(info).slice(0, 500))); } };

function zakazka(dalsi) {
  const zak = novaZakazka();
  Object.assign(zak, { objednatel: 'Alfa zkušební s.r.o.', ico: '27182818' });
  zak.projHlavicka = Object.assign({}, zak.projHlavicka, { cislo: '2026 - OVP - CN - 9811' });
  zak.varianty[0].data.kryciProj = { hodnoty: {} };
  if (dalsi) {
    const r = vzPridej(zak, { objednatel: 'Beta zkušební a.s.', ico: '16180339' }, { kdo: 'x', kdy: '2026-11-21T10:00:00.000Z' });
    if (!r.ok) throw new Error(r.chyba);
    vzKlZapisRucni(zak.varianty[0].data.kryciProj, zak, 'z2', 'pmZmocnitel', 'ZMOCNITEL-B-KANAREK');
  }
  return zak;
}

/* ---------- (a) plnaMocData ---------- */
{
  const zak = zakazka(true);
  let chyba = '';
  try { plnaMocData(zak, zak.varianty[0]); } catch (e) { chyba = e.message; }
  test('(a) surová zakázka s víc zákazníky → chyba (vzTiskHlidej)', /pohledu/.test(chyba), chyba);
  let d = null, chybaP = '';
  try { const p = vzTiskPohled(zak, 'z1'); d = plnaMocData(p, vzTiskVarianta(p, zak.varianty[0])); } catch (e) { chybaP = e.message; }
  test('(a) z pohledu řídícího projde', !!d && !chybaP, chybaP);
  test('(a) pohled řídícího nenese zmocnitele B', !!d && JSON.stringify(d).indexOf('ZMOCNITEL-B-KANAREK') < 0);
  const z1 = zakazka(false);
  let d1 = null;
  try { d1 = plnaMocData(z1, z1.varianty[0]); } catch (e) { d1 = null; }
  test('(a) jeden zákazník beze změny (projde)', !!d1 && !!d1.placeholders);
}

/* ---------- (b) IČO s úvodními nulami ---------- */
{
  test('(b) 027182818 = 27182818', vzIcoKlic('027182818') === vzIcoKlic('27182818'), [vzIcoKlic('027182818'), vzIcoKlic('27182818')]);
  test('(b) 1234567 = 01234567', vzIcoKlic('1234567') === vzIcoKlic('01234567'));
  test('(b) mezery a CZ se ignorují', vzIcoKlic('CZ 271 82 818') === '27182818');
  test('(b) prázdné IČO zůstane prázdné', vzIcoKlic('') === '' && vzIcoKlic(null) === '');
  test('(b) jiné IČO zůstane jiné', vzIcoKlic('16180339') !== vzIcoKlic('27182818'));
  const zak = zakazka(true);
  const d = vzIcoDuplicita(zak, '027182818', 'z2');
  test('(b) vzIcoDuplicita najde řídícího pod 027182818', !!d && d.id === 'z1', d && d.id);
  test('(b) vzIcoDuplicita: vlastní IČO s nulou se nehlásí', vzIcoDuplicita(zak, '016180339', 'z2') === null);
}

/* ---------- (d) klient: řídící s písmenem po výměně ---------- */
{
  const zak = zakazka(true);
  const v = zak.varianty[0];
  const tisk = id => zamkniVariantu(v, { typ: 'nabidka', kdo: 'test@priklad.cz', kdy: '2026-11-21T10:00:00.000Z', cislo: variantaCislo(zak, v),
    zakaznik: vzRazitkoSnimek(zak, id, v) });
  tisk('z1');
  test('(d) řídící z1 po CN: název v hlavičce volný (jako dřív)', zamekZakCestaZmrazena(zak, 'ZAK.objednatel') === '', zamekZakCestaZmrazena(zak, 'ZAK.objednatel'));
  tisk('z2');
  const r = vzVymenRidiciho(zak, 'z2');
  test('(d) předpoklad: B je řídící s písmenem', r.ok !== false && vzRidiciId(zak) === 'z2' && vzZakaznik(zak, 'z2').pismeno === 'B');
  ['objednatel', 'adresaObjednatele', 'ico', 'dic'].forEach(k =>
    test('(d) B řídící (odešla mu CN): ZAK.' + k + ' zmrazené', /už odešla nabídka/.test(zamekZakCestaZmrazena(zak, 'ZAK.' + k)), zamekZakCestaZmrazena(zak, 'ZAK.' + k)));
  test('(d) B řídící: kontaktní osoba volná', !/už odešla nabídka/.test(zamekZakCestaZmrazena(zak, 'ZAK.kontakt')));
  test('(d) A po výměně (další, odešla mu CN): název zmrazený', /už odešla nabídka/.test(vzZakaznikPoleZmrazeno(zak, 'z1', 'objednatel')));
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
