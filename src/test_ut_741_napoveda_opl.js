/* #741 (dávka UT, rozhodnutí J. V. 24. 11. 2026, varianta A)
 *
 * Nápověda (title) u volby Opláštění v Zadání šachty závisí na zvolené
 * hodnotě. Po stěnách: „Jiný typ zasklení viz níže." Standard: zasklení,
 * které se opravdu počítá (skloVolba):
 *   exteriér (na terče i mezi příčníky) „Zasklení VSG 4.4.1 + Izolační dvojsklo"
 *   interiér mezi příčníky             „Zasklení VSG 4.4.1"
 *   interiér na terče                  „Zasklení VSG 4.4.2"
 *
 * Sada vyřízne SKUTEČNOU oplasteniNapoveda z ui/kalk_ock.js a pustí ji ve vm
 * se skloVolba z jádra; ověří i to, že ji select opláštění opravdu volá
 * (a s aktuálním zadáním, aby title sledoval změnu typu šachty a zasklení).
 *
 * POJISTKA: nad 8232565 (title = SKLO_JINE_NAPOVEDA, funkce není) sada
 * selže; hlídají ji mutace „[UT] #741" v netlify/mutace.mjs.
 */
const fs = require('fs');
const vm = require('vm');
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

const SRC = fs.readFileSync(__dirname + '/ui/kalk_ock.js', 'utf8');
function vyrizni(jmeno) {
  const i = SRC.indexOf('function ' + jmeno + '(');
  if (i < 0) return '';
  let h = 0, j = SRC.indexOf('{', i);
  for (; j < SRC.length; j++) {
    if (SRC[j] === '{') h++;
    else if (SRC[j] === '}' && --h === 0) break;
  }
  return SRC.slice(i, j + 1);
}
const f = vyrizni('oplasteniNapoveda');
test('oplasteniNapoveda je v ui/kalk_ock.js', !!f);

const ctx = { skloVolba: eng.skloVolba, SKLO_JINE_NAPOVEDA: '(jiné sklo)' };
vm.createContext(ctx);
let fn = null;
try { vm.runInContext(f + '\nthis.fn = oplasteniNapoveda;', ctx); fn = ctx.fn; } catch (e) { fn = null; }
const nap = (typSachty, zaskleni, poStenach) => fn ? fn(Object.assign({}, eng.DEFAULT_ZADANI, { typSachty, zaskleni }), poStenach) : null;

const EXT = 'Zasklení VSG 4.4.1 + Izolační dvojsklo';
['na terče', 'mezi příčníky'].forEach(zas => {
  test('exteriér, ' + zas + ' → ' + EXT, nap('exteriérová', zas, false) === EXT, nap('exteriérová', zas, false));
});
test('interiér, mezi příčníky → Zasklení VSG 4.4.1', nap('interiérová', 'mezi příčníky', false) === 'Zasklení VSG 4.4.1', nap('interiérová', 'mezi příčníky', false));
test('interiér, na terče → Zasklení VSG 4.4.2', nap('interiérová', 'na terče', false) === 'Zasklení VSG 4.4.2', nap('interiérová', 'na terče', false));
[['exteriérová', 'na terče'], ['interiérová', 'na terče'], ['interiérová', 'mezi příčníky']].forEach(([t, z]) => {
  test('po stěnách (' + t + ', ' + z + ') → Jiný typ zasklení viz níže.', nap(t, z, true) === 'Jiný typ zasklení viz níže.', nap(t, z, true));
});

/* Text se řídí tím, co se počítá: u každé kombinace typ skla v nápovědě =
 * typ čelního skla ze skloVolba (s ceníkem i bez něj), dvojsklo jen tam,
 * kde boky berou položku „Izolační dvojsklo". */
const C = ZC.zkusebniCenik();
['exteriérová', 'interiérová'].forEach(t => ['na terče', 'mezi příčníky'].forEach(z => {
  const sv = eng.skloVolba(Object.assign({}, eng.DEFAULT_ZADANI, { typSachty: t, zaskleni: z }), C);
  const typ = sv.celni.nazev.replace(/^MATERIÁL\s+/, '');
  const n = nap(t, z, false) || '';
  test('souhlas se skloVolba: ' + t + ', ' + z, n.indexOf('Zasklení ' + typ) === 0
    && /dvojsklo/i.test(n) === (sv.boky.cesta === 'C.skloBokyKc'), [n, typ, sv.boky.cesta]);
}));

/* Select opláštění volá funkci s aktuálním zadáním a režimem. */
const sel = (SRC.match(/<select[^>]*oplRezimSet\(this\.value\)[^>]*>/) || [''])[0];
test('select opláštění má title z oplasteniNapoveda(Z, oplPoStenach())', /title="\$\{esc\(oplasteniNapoveda\(Z, oplPoStenach\(\)\)\)\}"/.test(sel), sel);
test('select opláštění už nenese pevnou SKLO_JINE_NAPOVEDA', sel.indexOf('SKLO_JINE_NAPOVEDA') < 0, sel);

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
