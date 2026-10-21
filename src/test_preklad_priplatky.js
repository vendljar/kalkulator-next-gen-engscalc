/* ===== PŘEKLADY PŘÍPLATKŮ A PEVNÝCH TEXTŮ ŠABLONY NABÍDKY =====
 * (#334, #335; nálezy K10-N36 a K10-N38 z 10. testovacího kola, 24. 9. 2026)
 *
 * Kolo 10 našlo v anglické nabídce „LEŠENÍ - vnitřní" vedle „SCAFFOLDING –
 * external": 13 z 23 příplatků slovník neznal a tiskly se česky. Příplatek
 * přibude v engine.js a na slovník se zapomene — proto se názvy neberou
 * z ručního seznamu, ale PŘÍMO ZE ZDROJÁKU jádra (každé `mkPrip('klíč',
 * 'NÁZEV'…)`). Nový příplatek bez překladu tenhle test shodí.
 *
 * Druhá část hlídá pevné texty šablony nabídky OCK: překladač šablony
 * (Nastavení → Šablony → EN/DE) je nechával česky a mutace pak byla z 17 %
 * česká. Kontaktní blok firmy (web, telefon, IČ, adresa) se naopak
 * překládat nesmí — ten musí vyjít jako „neutrální".
 *
 * ŽÁDNÉ CENY — zkouší se jen texty.
 */
const fs = require('fs');
const P = require('./preklad.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};
const JAZYKY = ['en', 'de', 'fr'];
const chybi = (t) => JAZYKY.filter(l => !P.trStav(t, l).prelozeno || P.trStav(t, l).text === t);

/* ---------- 1) každý příplatek z jádra má překlad ---------- */
const engine = fs.readFileSync(__dirname + '/engine.js', 'utf8');
const priplatky = [...new Set([...engine.matchAll(/mkPrip\('[^']+',\s*'([^']+)'/g)].map(m => m[1]))];
/* Pojistka proti prázdnému testu: kdyby se změnil tvar volání mkPrip,
 * regex by nenašel nic a test by „prošel" nad prázdným seznamem. */
test('ze zdrojáku jádra se našly příplatky (aspoň 20)', priplatky.length >= 20, priplatky.length);
priplatky.forEach(n => test('příplatek „' + n + '" má překlad EN/DE/FR', chybi(n).length === 0, chybi(n)));
test('K10-N38: „LEŠENÍ - vnitřní" už v anglické nabídce nestojí česky',
  P.tr('LEŠENÍ - vnitřní', 'en') === 'SCAFFOLDING – internal', P.tr('LEŠENÍ - vnitřní', 'en'));

/* ---------- 2) pevné texty šablony nabídky OCK (v10 / v11) ---------- */
const SABLONA = [
  'A. TECHNICKÁ ČÁST NABÍDKY:', 'B. OBCHODNÍ ČÁST NABÍDKY:', 'I. TECHNICKÁ SPECIFIKACE VÝTAHOVÉ ŠACHTY',
  'I. CENOVÁ NABÍDKA:', 'II. ROZŠÍŘENÍ CENOVÉ NABÍDKY – Příplatky:', 'Pohled na objekt z ulice:',
  'CELKEM za nabídku ', 'Kancelář:', 'Splatnost faktur a platnost nabídky:',
  'Cena díla je splatná v následujících dílčích splátkách:',
  /* Odsazení mezerami je v šabloně skutečně — slovník ho musí unést. */
  '               b. DPH bude účtováno dle aktuálně platných daňových předpisů ',
  '                                                      c. k úpravě celkové ceny může dojít po přesném zaměření a vyhodnocení statiky',
  'Poznámky k cenové nabídce: a. cena vychází z technické specifikace nabídky – viz výše',
  'Předávací protokol z bodů 1. a 2. lze nahradit oboustranně podepsaným zápisem do montážního deníku.',
];
SABLONA.forEach(t => test('text šablony „' + t.trim().slice(0, 50) + '" má překlad EN/DE/FR', chybi(t).length === 0, chybi(t)));

/* ---------- 3) kontaktní blok firmy se NEpřekládá ---------- */
['www.engineers-cz.cz', 'Tel.: +420 252 546 463', 'IČ: 241 27 663', '170 00  Praha 7',
 'V Háji 1092/15', 'ENGINEERS CZ s.r.o.', '_____________________________'].forEach(t =>
  test('„' + t + '" je neutrální (nepřekládá se, nehlásí se jako chybějící)',
    P.trStav(t, 'en').zdroj === 'neutrální' && P.tr(t, 'de') === t, P.trStav(t, 'en')));
/* Vzory neutrálního textu musí zůstat úzké — běžný text s číslem je
 * pořád text a překládat se má. */
['Varianta 1', 'Montáž 2 týdny', 'Zakázka 12/2026 pro zákazníka', 'Nabídka platí 30 dní'].forEach(t =>
  test('„' + t + '" neutrální NENÍ (vzory adresy nejsou příliš široké)', P.trStav(t, 'en').zdroj !== 'neutrální', P.trStav(t, 'en')));

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
