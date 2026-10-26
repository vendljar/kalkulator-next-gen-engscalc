/* #518 — ZVÝRAZNĚNÍ NEPŘELOŽENÝCH A RUČNĚ ZAPSANÝCH TEXTŮ V NÁHLEDU NABÍDKY
 * (zadání J. V. 26. 10. 2026, podnět obchodníka 24. 10.)
 *
 * Hlídá rychle a bez prohlížeče (chytá mutace preklad.js a ui/common.js):
 *   1. preklad.js — sledování zapnuté náhledem sbírá PRÁVĚ české originály,
 *      pro které slovník ani vzor nemají překlad; přeložené, neutrální
 *      (čísla, kódy) a česká nabídka se nesbírají; konec sledování ho vypne;
 *   2. ui/common.js — česká nabídka nedostane nic (CSS, legendu ani skript),
 *      tisk značku ruší (@media print), do seznamu nepřeložených nejde nic
 *      bez písmene, ruční údaje hlavičky bez prázdna a čísel, skript nemá
 *      uzavírací značku z dat a legenda mluví česky.
 * Chování v okně náhledu (značka, legenda, skok, print, DOCX) ověřuje
 * prohlížečový harness overit_neprelozene.mjs.
 *
 * Pojistka: před #518 sada spadne hned na prvním testu (preklad.js nemá
 * prekladSledujZacni a ui/common.js nemá blok #518); po změně vše OK. */
const fs = require('fs');
const PR = require('./preklad.js');
Object.keys(PR).forEach(k => { global[k] = PR[k]; });

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};
process.exitCode = 1;

/* ---------- 1. preklad.js ---------- */
test('preklad.js vyváží prekladSledujZacni / prekladSledujKonec',
  typeof PR.prekladSledujZacni === 'function' && typeof PR.prekladSledujKonec === 'function');
if (typeof PR.prekladSledujZacni === 'function') {
  const NEZNAMY = 'Vestavba OCK výtahové šachty včetně opláštění (zkouška #518)';
  const ZNAMY = Object.keys(PR.PREKLAD).find(k => PR.PREKLAD[k][0]);
  PR.prekladSledujZacni();
  PR.tr(NEZNAMY, 'en');
  PR.tr('  ' + NEZNAMY + '  ', 'de');
  PR.tr(ZNAMY, 'en');
  PR.tr('2026 - OPR - CN - 518', 'en');
  PR.tr('Text jen česky', 'cz');
  const sebrano = PR.prekladSledujKonec();
  test('sbírá se text bez překladu (oříznutý, bez duplicit)', sebrano.length === 1 && sebrano[0] === NEZNAMY, sebrano);
  test('přeložený text se nesbírá', sebrano.indexOf(ZNAMY) < 0, ZNAMY);
  test('číslo nabídky (neutrální) ani česká nabídka se nesbírají',
    sebrano.indexOf('2026 - OPR - CN - 518') < 0 && sebrano.indexOf('Text jen česky') < 0, sebrano);
  PR.tr('Další text bez hesla po konci sledování', 'en');
  test('po konci sledování se nic nesbírá (další konec vrací prázdno)', PR.prekladSledujKonec().length === 0);
  PR.prekladSledujZacni();
  PR.tr(NEZNAMY, 'fr');
  PR.prekladSledujZacni();
  test('nový začátek zahodí sběr z minula', PR.prekladSledujKonec().length === 0);
  test('výsledek překladu se sledováním nemění', PR.tr(NEZNAMY, 'en') === NEZNAMY && PR.tr(ZNAMY, 'en') === PR.PREKLAD[ZNAMY][0]);
}

/* ---------- 2. ui/common.js ---------- */
const src = fs.readFileSync(__dirname + '/ui/common.js', 'utf8').replace(/\r\n/g, '\n');
const zac = src.indexOf('function neprelozenoZacni(');
const konecFn = src.indexOf('\nfunction neprelozenoSkript(');
const konec = konecFn < 0 ? -1 : src.indexOf('\n}\n', konecFn);
test('blok #518 je v ui/common.js', zac >= 0 && konec > zac);
let F = null;
if (zac >= 0 && konec > zac) {
  F = (0, eval)('(function(){' + src.slice(zac, konec + 3)   // eslint-disable-line no-eval
    + ';return { neprelozenoZacni, neprelozenoKonec, neprelozenoRucne, neprelozenoCss, neprelozenoLegendaHtml, neprelozenoSkript };})()');
}
if (F) {
  test('česká nabídka: sledování se nezapne', F.neprelozenoZacni('cz') === false && F.neprelozenoZacni('') === false);
  test('cizí jazyk: sledování se zapne a konec vrátí sběr',
    F.neprelozenoZacni('en') === true && (PR.tr('Zkušební věta bez hesla #518', 'en'), F.neprelozenoKonec().join() === 'Zkušební věta bez hesla #518'));
  test('česká nabídka: žádná legenda ani skript', F.neprelozenoLegendaHtml('cz') === '' && F.neprelozenoSkript('cz', ['x y'], ['a b']) === '');
  const css = F.neprelozenoCss();
  test('CSS: žluté podbarvení na obrazovce', /\.neprelozeno\{background:#fef08a/.test(css), css);
  test('CSS: tisk značku i legendu ruší', /@media print\{\.neprelozeno\{background:none!important;box-shadow:none!important;outline:0!important\}/.test(css)
    && /\.nepr-legenda\{display:none!important\}/.test(css), css);
  test('legenda je noprint a zpočátku skrytá', /class="nepr-legenda noprint"/.test(F.neprelozenoLegendaHtml('en'))
    && /display:none/.test(F.neprelozenoLegendaHtml('en')));
  test('ruční údaje: bez prázdna, „…" a čísel', JSON.stringify(F.neprelozenoRucne(['', '…', null, ' 2026 - OPR - CN - 1 ', ' Název akce ', 'Praha']))
    === JSON.stringify(['Název akce', 'Praha']));
  const skr = F.neprelozenoSkript('en', ['12 %', '3×', 'x', 'Věta bez hesla', '</script><b>'], ['Ruční název']);
  const nepr = JSON.parse(((skr.match(/var NEPR=(\[.*?\]);var RUCNE/) || [])[1] || '[]').replace(/\\u003c/g, '<'));
  test('do nepřeložených nejde nic bez písmene ani jednoznakové', JSON.stringify(nepr) === JSON.stringify(['Věta bez hesla', '</script><b>']), nepr);
  test('data nemohou ukončit skript (B84)', (skr.match(/<\/script>/gi) || []).length === 1 && /\\u003c\/script>/.test(skr));
  test('ruční údaje hlavičky jen celým textem (RUCNE.indexOf(t))', /RUCNE\.indexOf\(t\)>=0/.test(skr) && /var RUCNE=\["Ruční název"\]/.test(skr));
  test('legenda česky: „… bez překladu — zkontrolujte" a skok na první', /bez překladu — zkontrolujte/.test(skr)
    && /Přejít na první/.test(skr) && /n===1\?"text":\(n>=2&&n<=4\?"texty":"textů"\)/.test(skr), skr.slice(0, 120));
  test('ruční úprava v náhledu: blok dostane značku s vysvětlením', /T_UPRAV=/.test(skr) && /b\.classList\.add\("neprelozeno"\);b\.title=T_UPRAV/.test(skr));
  test('značka se nepřidává mimo dokument (noprint, skript, styl)', /closest\("\.noprint,script,style,\.neprelozeno"\)/.test(skr));
  test('skript je syntakticky platný', (() => {
    try { new Function(skr.replace(/^<script>/, '').replace(/<\/script>$/, '')); return true; } catch (e) { return e.message; }
  })() === true);
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exitCode = fail ? 1 : 0;
