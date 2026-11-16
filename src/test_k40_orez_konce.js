/* ===== K40-X1, K40-X2: OŘEZ KONCE TEXTU SMYČKOU MÍSTO VÝRAZU =====
 * (dávka K40a, roadmapa #579, 11. 11. 2026)
 *
 * Výraz s kotvou jen na konci zkouší shodu od každé pozice — nad dlouhým
 * textem kvadratický čas (posudek: 15 000× „.-" 319 ms v nazevCast; v4.11.3
 * 60 000 znaků 3,6 s). nazevCast běží při každém render() Kalkulace OCK
 * a název varianty ani zákazník délku omezenou nemají.
 *
 * Sada ověří u všech čtyř míst (nazevCast, prekladNorm, milník plánu plateb,
 * záložní normalizace slovníku):
 *  - STEJNÝ výstup jako dosavadní výraz (referenční implementace níž) na
 *    sadě běžných i krajních vstupů a na náhodných krátkých textech,
 *  - 100 000 znaků do 50 ms,
 *  - nazevCast: strop 200 znaků na úsek (K10-N1).
 *
 * POJISTKA: nad c664c9e selže (časové limity; nazevCast bez stropu); mutace
 * „[K40a] X1/X2" v mutace_jadro.mjs vrací výraz.
 */
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const fmt = nacti('./format.js');
const NS = nacti('./nazvy_souboru.js');
const PR = nacti('./preklad.js');
const PP = nacti('./plan_plateb.js');
const fs = require('fs');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};

/* ---- referenční (dosavadní) implementace z c664c9e ---- */
const refNazevCast = s => String(s == null ? '' : s)
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[\s_]+/g, '-').replace(/[^A-Za-z0-9.+-]+/g, '-').replace(/-{2,}/g, '-')
  .replace(/^[-.]+|[-.]+$/g, '');
const refPrekladNorm = s => String(s == null ? '' : s)
  .replace(/ /g, ' ').replace(/[–—]/g, '-').replace(/[„“”]/g, '"')
  .replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim().replace(/[\s:.*]+$/, '').toLowerCase();
const refMilnik = s => String(s || '(milník chybí)').replace(/[.\s]+$/, '');
const refSlovnikNorm = k => String(k == null ? '' : k).trim().replace(/[\s:.*]+$/, '').toLowerCase();

/* záložní normalizace slovníku (bez prekladNorm) — vyříznutá ze zdrojáku */
const tSl = fs.readFileSync(__dirname + '/slovnik.js', 'utf8');
const iSl = tSl.indexOf('function slovnikNorm(');
const telo = tSl.slice(tSl.indexOf('\n', tSl.indexOf("try { return require('./preklad.js')", iSl)) + 1, tSl.indexOf('\n}\n', iSl));
// eslint-disable-next-line no-new-func
const slovnikZaloha = new Function('k', telo);
const milnik = (text) => PP.planSodKalendar({ platby: [{ text, castka: 1 }] }, n => String(n))
  .replace(/^Platba ve výši 1 \+ DPH proběhne /, '').replace(/\.$/, '');

/* ---- vstupy ---- */
const pevne = ['', ' ', '.', '-', '.-', '-.', '--..--', 'abc', 'abc.', 'abc-', 'a.b-c', '.abc.', '-a-', '2026 - OPR - CN - 555.2',
  'Šachta – výtah „A" : ', 'Název *', 'text :.*  ', ' \t\n x \n', 'x...', 'Platba po podpisu smlouvy.  ', 'a : ',
  'á.é-í', '__a__', '+.+', 'x—', 'ÿ:', 'dlouhé    mezery   .', '…', 'a:b:', '*', '**:**'];
const abeceda = ['a', 'Z', '1', '.', '-', ' ', ':', '*', '_', '\t', ' ', 'š', '–', '„', '+', 'é'];
let seed = 42; const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const nahodne = Array.from({ length: 3000 }, () => Array.from({ length: rnd(12) }, () => abeceda[rnd(abeceda.length)]).join(''));
const vstupy = pevne.concat(nahodne);

const shoda = (jmeno, f, ref) => {
  const rozdil = vstupy.filter(x => f(x) !== ref(x));
  test(jmeno + ': stejný výstup jako výraz (' + vstupy.length + ' vstupů)', rozdil.length === 0,
    rozdil.slice(0, 3).map(x => [x, f(x), ref(x)]));
};
shoda('nazevCast', NS.nazevCast, refNazevCast);
shoda('prekladNorm', PR.prekladNorm, refPrekladNorm);
shoda('milník plánu plateb', milnik, refMilnik);
shoda('slovník (záloha bez prekladNorm)', slovnikZaloha, refSlovnikNorm);
test('format.js exportuje orezKonce', typeof fmt.orezKonce === 'function');
if (typeof fmt.orezKonce === 'function') {
  shoda('orezKonce = /[-.]+$/', s => fmt.orezKonce(s, /[-.]/), s => String(s).replace(/[-.]+$/, ''));
  test('orezKonce: null a undefined → prázdno', fmt.orezKonce(null, /x/) === '' && fmt.orezKonce(undefined, /x/) === '');
}

/* ---- čas: 100 000 znaků do 50 ms ---- */
const cas = (jmeno, f, s) => {
  f('zahrati.-');
  const t0 = process.hrtime.bigint(); f(s); const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  test(jmeno + ': 100 000 znaků do 50 ms (' + ms.toFixed(1) + ' ms)', ms < 50, ms);
};
const zlo1 = '.-'.repeat(50000), zlo2 = ': '.repeat(50000) + 'x', zlo3 = '. '.repeat(50000) + 'x';
cas('nazevCast', NS.nazevCast, zlo1 + 'x');
cas('nazevCast (samé .-)', NS.nazevCast, zlo1);
cas('nazevCast (x + .- + x)', s => NS.nazevCast(s), 'x' + zlo1 + 'x');
cas('nazevCast (orez bez stropu: x + .-)', s => NS.nazevCast(s), 'x' + zlo1);
cas('prekladNorm', PR.prekladNorm, zlo2);
cas('milník plánu plateb', milnik, zlo3);
cas('slovník (záloha)', slovnikZaloha, zlo2);

/* ---- nazevCast: strop úseku 200 znaků (K10-N1) ---- */
test('nazevCast: úsek nejvýš 200 znaků', NS.nazevCast('A'.repeat(100000)).length === 200);
test('nazevCast: do 200 znaků beze změny', NS.nazevCast('B'.repeat(200)) === 'B'.repeat(200));
test('nazevCast: strop platí před ořezem konce (pomlčka na hraně zmizí)', NS.nazevCast('C'.repeat(199) + '-x') === 'C'.repeat(199));

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
