/* ===== TABULÁTOR PO ZADÁNÍ HODNOTY =====
 * (nález J. V. 16. 9. 2026)
 *
 * „Tabulátor přeskakuje správně, pokud do datového okna nic nevpisuju. Ve
 * chvíli, kdy tam cokoliv zadám, mě po stisku tabulátoru systém přenese do
 * první buňky (typ šachty) a začínám znovu."
 *
 * PROČ TO BYLO VIDĚT JEN PŘI PSANÍ. Tab z NEZMĚNĚNÉHO pole nespustí nic —
 * `change` se nepošle, aplikace se nepřekresluje a prohlížeč si přesun
 * fokusu vyřídí sám. Tab ze ZMĚNĚNÉHO pole spustí `change` → `set()` →
 * `render()`, ten přepíše `#inputs` novým HTML a původní políčko ZANIKNE.
 * Prohlížeč má ale přesun fokusu rozjetý a míří na prvek, který v dokumentu
 * není — skončí na `<body>` a další Tab začne od začátku stránky.
 *
 * Změřeno na běžící aplikaci: po zapsání hodnoty a Tabu byl
 * `document.activeElement === document.body`.
 *
 * PROČ TO NESPRAVILA DOSAVADNÍ OBNOVA FOKUSU. `renderSFokusem` existuje
 * odjakživa, jenže se ptá na `document.activeElement` až v okamžiku
 * překreslení — a tam už je `BODY`. Funkce tedy hned na prvním řádku zjistí,
 * že aktivní prvek není pole, a odejde. Pole se proto musí zapamatovat už
 * při `keydown`, kdy v něm fokus ještě je.
 *
 * Sada testuje ROZHODOVACÍ ČÁST nad zdrojákem — prohlížeč tu není. Že to
 * doopravdy funguje, bylo ověřeno skutečnými stisky kláves v prohlížeči:
 * Zdvih → „11" → Tab → Horní přejezd → „3" → Tab → Prohlubeň; a zpět
 * Shift+Tab z Vnitřní šířky na Průchozí šachtu (tedy i přes hranici sloupce).
 */
const fs = require('fs');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const src = fs.readFileSync(__dirname + '/ui/common.js', 'utf8');
const fn = (src.match(/function renderSFokusem\(kresli\)[\s\S]*?\n\}/) || [''])[0];

/* ---------- 1) pole se pamatuje při stisku klávesy ---------- */

test('na Tab se reaguje už v keydown', /addEventListener\('keydown'/.test(src));
test('a rovnou se schová klíč pole, ze kterého se odchází',
  /klic: renderKlicPole\(document\.activeElement\)/.test(src));
test('posluchač je v zachycovací fázi — jinak ho může stopnout cizí handler',
  /addEventListener\('keydown'[\s\S]{0,300}\}, true\)/.test(src));
test('jiná klávesa značku smaže', /: null;/.test(src.match(/addEventListener\('keydown'[\s\S]{0,400}/)[0]));
test('značka má čas vzniku', /kdy: Date\.now\(\)/.test(src));
test('a Shift se pamatuje taky', /zpet: !!e\.shiftKey/.test(src));

/* ---------- 2) značka nesmí přežít ---------- */

test('stará značka se ignoruje', /Date\.now\(\) - RENDER_TAB\.kdy\) < 400/.test(src));
test('a bez zapamatovaného pole se nepoužije', /RENDER_TAB\.klic &&/.test(src));
test('po použití se hned maže', /RENDER_TAB = null;\s*\n\s*kresli\(\);/.test(fn), fn.slice(0, 400));

/* ---------- 3) fokus jde na SOUSEDA, ne zpátky ---------- */

test('u odchodu tabulátorem se hledá pole, ze kterého se odešlo',
  /renderKlicPole\(x\) === tab\.klic/.test(fn));
test('a fokus míří na souseda v pořadí tabulátoru',
  /seznam\[i \+ \(tab\.zpet \? -1 : 1\)\]/.test(fn));
test('Shift+Tab míří opačně', /tab\.zpet \? -1 : 1/.test(fn));
test('bez souseda se zůstane v poli, ne na BODY',
  /const kam = soused \|\| odkud;/.test(fn));

/* ---------- 4) běžné překreslení se nesmí změnit ---------- */

test('bez čerstvého Tabu se fokus pořád vrací do TÉHOŽ pole',
  /if \(!klic\) \{ kresli\(\); return; \}[\s\S]{0,600}cil\.focus/.test(fn));
test('a rozepsaná hodnota i kurzor zůstávají',
  /setSelectionRange\(zac, kon\)/.test(fn));
test('rozepsanost se pozná proti defaultValue', /a\.value !== a\.defaultValue/.test(fn));

/* ---------- 5) výběr tabovatelných prvků ---------- */

const vyber = (src.match(/function renderTabovatelne\(\)[\s\S]*?\n\}/) || [''])[0];
test('funkce existuje', vyber.length > 0);
test('přeskakuje zakázané prvky', /el\.disabled/.test(vyber));
test('přeskakuje záporný tabindex', /tabindex.*charAt\(0\) === '-'/.test(vyber));
test('přeskakuje skryté prvky', /offsetParent !== null/.test(vyber));
test('a bere i tlačítka a odkazy, ne jen pole',
  /button/.test(vyber) && /a\[href\]/.test(vyber));

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
