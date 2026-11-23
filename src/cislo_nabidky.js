/* ============================================================================
 * ČÍSLO NABÍDKY (CN) — POSOUZENÍ ZMĚNY V HLAVIČCE (#727, J. V. 23. 11. 2026)
 *
 * PROČ: obchodník 21. 11. 2026 místo „Načíst zakázku" vepsal hledaný text do
 * pole Číslo nabídky otevřené kalkulace. Změna prošla bez otázky a zakázka se
 * automaticky uložila pod novým číslem (J. V. ji 23. 11. vrátil podle
 * protokolu). Pole s identifikátorem dokumentu se nesmí měnit „mimochodem".
 *
 * Model je tady (Node test src/test_cn_cislo_nabidky.js), dialogy jsou
 * v ui/cislo_nabidky_ui.js. Pořadí pravidel:
 *   1. beze změny → nic;
 *   2. text bez tvaru čísla nabídky (bod 2) → nabídnout vyhledání zakázky
 *      (Načíst zakázku s textem v hledání); uživatel může trvat na svém;
 *   3. číslo, které už má jiná zakázka v rejstříku (bod 3) → zamítnout;
 *   4. uložená zakázka s vyplněným číslem (bod 1) → potvrdit
 *      „Opravdu chcete změnit číslo nabídky z X na Y?" ANO / NE;
 *   5. jinak (nová zakázka, doplnění předlohy) → provést.
 * Odeslanou nabídku hlídá A3 v set() (jen administrátor) a server B56,
 * prodanou zamekZakCestaZmrazena / zamekCisloProdaneZmena (zamek.js, bod 5).
 * Protokol „Číslo nabídky: X → Y" píše protokol.js při každém uložení (bod 4).
 * ============================================================================ */

/* TVAR ČÍSLA NABÍDKY: aspoň jedna číslice a žádné slovo ze čtyř a víc
 * písmen. Čísla nabídek se skládají z roku, zkratek řady (OPR, OVP, CN,
 * SOD — nejvýš tři písmena), pořadí a přípon („.2", „-B"); hledaný text
 * (akce, adresa, zákazník, obchodník) má skoro vždy delší slovo. Holé pořadí
 * („555") je číslo. Prázdno ani nedopsaná předloha se neposuzují. */
function cnTvarCisla(text) {
  const t = String(text == null ? '' : text).trim();
  if (!t || !/\d/.test(t)) return false;
  return !/\p{L}{4,}/u.test(t);
}

const CN_TEXTY = {
  hledat: (po) => 'Text „' + po + '" nevypadá jako číslo nabídky.\n\n'
    + 'Chtěli jste zakázku vyhledat? Otevře se okno Načíst zakázku s tímto textem v hledání '
    + '(hledá se v čísle nabídky, názvu akce, adrese stavby, zákazníkovi i jménu obchodníka).',
  duplicita: (po, soubor) => 'Číslo nabídky „' + po + '" už má jiná zakázka (' + soubor + '). '
    + 'Změna neproběhla — zvolte vlastní číslo, nebo zakázku ' + soubor + ' otevřete přes Načíst zakázku.',
  potvrdit: (pred, po) => 'Opravdu chcete změnit číslo nabídky z „' + pred + '" na „' + po + '"?\n\n'
    + 'Zakázka se pak uloží pod novým číslem jako nový záznam — záznam s původním číslem zůstane '
    + 'v seznamu zakázek. Změna se zapíše do protokolu zakázky.',
};

/* Vyplněné číslo = ne prázdno a ne nedopsaná předloha (hlavickaVyplneno ze
 * zakazka.js; v Node sadě se modul dotáhne sám). */
const _CN_ZK = (typeof hlavickaVyplneno !== 'function' && typeof module !== 'undefined' && typeof require === 'function')
  ? require('./zakazka.js') : null;
function _cnVyplneno(v) {
  if (typeof hlavickaVyplneno === 'function') return hlavickaVyplneno(v);
  if (_CN_ZK) return _CN_ZK.hlavickaVyplneno(v);
  return String(v == null ? '' : v).trim() !== '';
}

/* ctx = { pred, po, ulozena, dupSoubor, jeToCislo }
 *   ulozena   — zakázka už leží v databázi (online / ve složce);
 *   dupSoubor — soubor jiné zakázky se stejným číslem (zakazkaDuplicita) nebo '';
 *   jeToCislo — uživatel u dotazu na hledání potvrdil, že jde o číslo.
 * → { akce: 'nic' | 'hledat' | 'zamitnout' | 'potvrdit' | 'provest', text } */
function cnZmenaPosud(ctx) {
  const c = ctx || {};
  const pred = String(c.pred == null ? '' : c.pred);
  const po = String(c.po == null ? '' : c.po);
  if (pred === po) return { akce: 'nic', text: '' };
  const poVypl = _cnVyplneno(po);
  if (poVypl && !c.jeToCislo && !cnTvarCisla(po)) return { akce: 'hledat', text: CN_TEXTY.hledat(po.trim()) };
  if (poVypl && c.dupSoubor) return { akce: 'zamitnout', text: CN_TEXTY.duplicita(po.trim(), String(c.dupSoubor)) };
  if (c.ulozena && _cnVyplneno(pred)) return { akce: 'potvrdit', text: CN_TEXTY.potvrdit(pred.trim(), po.trim()) };
  return { akce: 'provest', text: '' };
}

if (typeof module !== 'undefined') module.exports = { cnTvarCisla, cnZmenaPosud, CN_TEXTY };
