/* PoC čočky XS (audit 20. 11. 2026) k nálezu XS-1: klient vkládá počty
 * z /api/analytika do HTML bez esc()/num(). Dá se k nim přes server dostat
 * text? Zkouší se nepřátelská dávka od přihlášeného uživatele i poškozený
 * denní záznam v úložišti — obojí projde týmiž funkcemi jádra jako na serveru
 * (analytikaDavkaOcisti → analytikaSlij → analytikaObdobi).
 *   node podklady/audit_2026-11-20/poc_XS_analytika_cisla.mjs
 */
import { createRequire } from 'module';
import path from 'path';
const require = createRequire(path.resolve('package.json'));
const A = require(path.resolve('src/analytika.js'));
const P = '<img src=x onerror=__x(1)>';
const davka = { kliky: { ['a' + P]: P, b: '5' + P }, zdrz: { c: P }, zalozky: { ['kalk' + P]: P }, pocty: { zakazky: P, kalkulace: '1' + P, chyby: [P] },
  poUzivateli: { ['x' + P + '@priklad.cz']: { zakazky: P } } };
const stary = JSON.parse(JSON.stringify(davka));                       // poškozený záznam přímo v úložišti
const novy = A.analytikaSlij(stary, A.analytikaDavkaOcisti(davka));
A.analytikaPrictiUzivateli(novy, 'obchodnik.xs@priklad.cz', A.analytikaDavkaOcisti(davka).pocty, A.analytikaDavkaOcisti(davka));
const souhrn = A.analytikaObdobi([['den/2026-11-19', novy]]);
const spatne = [];
(function jdi(o, c) { for (const k of Object.keys(o)) { const v = o[k]; if (v && typeof v === 'object') jdi(v, c + '.' + k); else if (typeof v !== 'number') spatne.push(c + '.' + k + ' = ' + JSON.stringify(v)); } })({ celkem: souhrn.celkem, poMesicich: souhrn.poMesicich }, 'odpověď');
/* vedlejší zjištění: počet jako objekt { toString: 1 } shodí převod na číslo (výjimka = odpověď 500 jen pro odesílatele, nic se neuloží) */
let vyjimka = ''; try { A.analytikaSlij(null, A.analytikaDavkaOcisti({ pocty: { prihlaseni: { toString: 1 } } })); } catch (e) { vyjimka = e.message; }
console.log('počet jako objekt { toString: 1 }: ' + (vyjimka ? 'výjimka „' + vyjimka + '" (nic se neuloží)' : 'bez výjimky'));
const klice = JSON.stringify(souhrn).includes('<img');
console.log('hodnoty, které nejsou číslo: ' + (spatne.length ? spatne.join(' | ') : 'žádné'));
console.log('payload v KLÍČÍCH map (klient je vypisuje přes esc): ' + (klice ? 'ano' : 'ne'));
console.log('\nVÝSLEDEK: ' + (spatne.length ? 'ZRANITELNÉ — server pustí do počtů text' : 'ODOLNÉ — server vrací v počtech vždy čísla; neescapované vložení v klientu (XS-1) je jen chybějící druhá vrstva'));
