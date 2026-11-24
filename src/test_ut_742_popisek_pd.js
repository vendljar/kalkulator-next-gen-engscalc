/* #742 (dávka UT, O2 rozhodnutí J. V. 24. 11. 2026, varianta a)
 *
 * Právo `crm.pipedrive` zůstává (klíč beze změny), ale od PV #597 nehlídá jen
 * čtení — hlídá i zápis prodeje do dealu. Popisek v matici zobrazení se proto
 * jmenuje „Pipedrive: čtení a zápis do vlastních obchodních případů“.
 *
 * Hlídá se:
 *  1) název prvku v matici a nezměněný klíč,
 *  2) že hlášky, které právo citují (karta Prodej, 403 ze serveru, výběr
 *     organizace dealu), citují přesně tentýž název,
 *  3) že starý název v aplikaci, příručkách ani mezích nezůstal (CHANGELOG
 *     je historie, ten se nepřepisuje),
 *  4) že mutace B80 „výchozí matice bere obchodníkovi čtení z Pipedrive“
 *     v netlify/mutace.mjs pořád najde svůj řádek (jinak by tiše vypadla).
 */
const fs = require('fs');
const path = require('path');
const ZOB = require('./zobrazeni.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info || ''); } };
const KOREN = path.join(__dirname, '..');
const cti = p => fs.readFileSync(path.join(KOREN, p), 'utf8');

const NOVY = 'Pipedrive: čtení a zápis do vlastních obchodních případů';
const STARY = 'Čtení obchodních případů z Pipedrive';

const prvek = ZOB.ZOBRAZENI_PRVKY.find(p => p.klic === 'crm.pipedrive');
test('prvek crm.pipedrive v matici existuje (klíč beze změny)', !!prvek);
test('popisek práva = nový název (#742)', prvek && prvek.nazev === NOVY, prvek && prvek.nazev);

const CITUJI = ['src/ui/sod_ui.js', 'netlify/lib/pipedrive.mjs', 'netlify/lib/pd_org_vitez.mjs',
  'manual/admin/obsah.json', 'manual/kompletni/provoz.json', 'NASAZENI_NETLIFY.md'];
CITUJI.forEach(f => test(f + ' cituje nový název', cti(f).indexOf(NOVY) >= 0));

/* mutace.mjs starý název nese schválně v `nahrad` mutací [UT] — kontroluje se níže hledej B80. */
const PROHLEDAT = CITUJI.concat(['src/zobrazeni.js', 'BEZPECNOST_MEZE.md']);
PROHLEDAT.forEach(f => test(f + ' nemá starý název', cti(f).indexOf(STARY) < 0));

/* 4) mutace B80 v mutace.mjs: vytáhnout `hledej` a ověřit, že je v souboru */
const mut = cti('netlify/mutace.mjs');
const i = mut.indexOf("nazev: 'B80: výchozí matice bere obchodníkovi čtení z Pipedrive'");
test('mutace B80 (výchozí matice) v seznamu je', i >= 0);
const usek = mut.slice(i, mut.indexOf('proc:', i));
const m = /hledej:([\s\S]*?),\s*nahrad:/.exec(usek);
let hledej = null;
try { hledej = m && Function('return ' + m[1])(); } catch (e) { hledej = null; }
test('mutace B80: hledej jde přečíst', typeof hledej === 'string' && hledej.length > 0);
test('mutace B80: hledej najde řádek v src/zobrazeni.js (právě jednou)',
  typeof hledej === 'string' && cti('src/zobrazeni.js').split(hledej).length === 2);
test('mutace B80: hledej nese nový název', typeof hledej === 'string' && hledej.indexOf(NOVY) >= 0);

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
