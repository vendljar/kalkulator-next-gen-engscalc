/* ============================================================
 * B171 — tlačítko Odhlásit říká, že odhlásí všechna zařízení
 * (audit 15. 10. 2026, dávka H1, 18. 10. 2026)
 *
 * Odhlášení zvedá verzi hesla (B6, netlify/functions/odhlaseni.mjs), takže
 * ukončí relace účtu na všech zařízeních. Příručka to od 13. 10. píše,
 * rozhraní ne. Soubory src/ui/ se v Node nenačítají, proto se kontroluje
 * zdroj: každé tlačítko volající onlineOdhlas() nese nápovědu s větou
 * o všech zařízeních a panel online ji má i jako viditelnou poznámku.
 *
 * Pojistka: před opravou padají všechny tři kontroly (tlačítka bez title,
 * konstanta ani poznámka neexistují); po opravě projdou.
 * ============================================================ */
const fs = require('fs');
const zdroj = fs.readFileSync(__dirname + '/ui/online_ui.js', 'utf8');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : info); } };

const titulek = /const ODHLASIT_TITULEK = '([^']*)';/.exec(zdroj);
test('konstanta nápovědy říká „všech zařízeních"', !!titulek && /všech zařízeních/.test(titulek[1]), titulek && titulek[1]);

const tlacitka = zdroj.match(/<button[^>]*onclick="onlineOdhlas\(\)"[^>]*>/g) || [];
test('tlačítka Odhlásit existují (lišta i panel online)', tlacitka.length >= 2, tlacitka.length);
const bez = tlacitka.filter(t => !/title="\$\{esc\(ODHLASIT_TITULEK\)\}"/.test(t));
test('každé tlačítko Odhlásit nese nápovědu o všech zařízeních', tlacitka.length > 0 && bez.length === 0, bez.join(' | '));

const pozn = /<div class="note" data-odhlaseni-vsude>([^<]*)<\/div>/.exec(zdroj);
test('panel online má poznámku, že odhlášení platí pro všechna zařízení',
  !!pozn && /všechna zařízení/.test(pozn[1]), pozn && pozn[1]);

console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
process.exit(fail ? 1 : 0);
