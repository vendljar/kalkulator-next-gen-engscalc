/* ============================================================
 * #635 — krycí list sdílené varianty: u upozornění „Varianta je sdílená
 * zákazníky …" tlačítko „vlastní varianta" (vzVlastniVarianta — kopie
 * sdílené varianty pro dalšího zákazníka, týž krok jako v hlavičce).
 *  - otevřený další zákazník B (sdílí V1): jedno tlačítko „vlastní varianta",
 *    klik → B dostane kopii V1 jako vlastní variantu, upozornění zmizí;
 *  - otevřený řídící A: tlačítka pro každého dalšího, kdo V1 sdílí
 *    („vlastní varianta pro …"), pro řídícího ne;
 *  - zámek čtení / náhled: tlačítko se nekreslí; jeden zákazník: nic.
 * POJISTKA: před opravou upozornění tlačítko nemá (testy „tlačítko …" FAIL).
 * Spuštění: node src/test_635_vlastni_varianta.js
 * ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const vm = require('vm');

const CORE = ['build_info.js', 'nazvy_souboru.js', 'preklad.js', 'format.js', 'engine.js', 'vice_sachet.js', 'engine_proj.js', 'techspec.js',
  'zakazka.js', 'uloziste.js', 'retence_zaloh.js', 'zamek.js', 'vice_zakazniku.js'];
CORE.forEach(f => { const m = require(path.join(__dirname, f)); if (m && typeof m === 'object') Object.assign(global, m); });

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + (info === undefined ? '' : '  ' + JSON.stringify(info).slice(0, 500))); } };
const J = o => JSON.parse(JSON.stringify(o));
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function zakazka(dalsi) {
  const zak = novaZakazka();
  Object.assign(zak, { objednatel: 'Alfa zkušební s.r.o.', ico: '27182818' });
  zak.cislo = '2026 - OPR - CN - 9635';
  if (dalsi) {
    for (const u of [{ objednatel: 'Beta zkušební a.s.', ico: '16180339' }, { objednatel: 'Gama zkušební s.r.o.', ico: '46692016' }]) {
      const r = vzPridej(zak, u, { kdo: 'x', kdy: '2026-11-21T10:00:00.000Z' });
      if (!r.ok) throw new Error(r.chyba);
    }
  }
  return zak;
}
function obrazovka(zak, volby = {}) {
  const hlasky = [];
  const ctx = vm.createContext(Object.assign({ console, JSON, Math, String, Set, Map, Array, Object, Date, Number, RegExp, Promise,
    esc, escJs: esc, setTimeout: () => 0, render: () => {}, hlaska: t => { hlasky.push(String(t)); },
    viceZakaznikuZapnuto: () => true, zamekCteniJe: () => !!volby.cteni, nahledAktivni: () => !!volby.nahled,
    zamekCteniStop: () => !!volby.cteni, nahledStop: () => !!volby.nahled,
    variantaUzamcena, variantaProdana, klonujVariantu, protokolZapis: () => {}, prepniTab: () => {}, TAB: 'kryci', NAST: { uzivatel: 'tester' } }));
  vm.runInContext(`
    var ZAK = null;
    function aktivniVarianta(z) { return z.varianty.find(v => String(v.id) === String(z.aktivni)) || z.varianty[0]; }
    function syncVarianta() {}
  `, ctx);
  ['vice_zakazniku.js', 'ui/vice_zakazniku_ui.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx, { filename: f }));
  ctx.ZAK = J(zak);
  vm.runInContext('vzOtevrenyId()', ctx);
  return { run: k => vm.runInContext(k, ctx), ctx, hlasky };
}

const tlacitka = html => (String(html).match(/<button[^>]*vz-kl-vlastni[^>]*>[^<]*<\/button>/g) || []);

/* otevřený B */
{
  const o = obrazovka(zakazka(true));
  o.run("VZ_UI.otevreny = 'z2'");
  const h = o.run('vzKlSdilenaPozn()');
  const t = tlacitka(h);
  test('otevřený B: upozornění sdílené varianty', /Varianta je sdílená/.test(h), h);
  test('otevřený B: tlačítko „vlastní varianta" (jedno, pro B)', t.length === 1 && /vzVlastniVarianta\('z2'\)/.test(t[0]) && />vlastní varianta</.test(t[0]), t);
  const pred = o.run('ZAK.varianty.length');
  o.run("vzVlastniVarianta('z2')");
  const zB = o.run("vzZakaznik(ZAK, 'z2')");
  test('klik: B má vlastní kopii varianty', o.run('ZAK.varianty.length') === pred + 1 && zB.varianta !== o.run('vzRidiciVariantaId(ZAK)')
    && String(o.run('ZAK.aktivni')) === zB.varianta, { pred, zB });
  test('po kliku: varianta B už není sdílená (bez upozornění)', o.run('vzKlSdilenaPozn()') === '');
}
/* otevřený řídící A */
{
  const o = obrazovka(zakazka(true));
  o.run("VZ_UI.otevreny = 'z1'");
  const t = tlacitka(o.run('vzKlSdilenaPozn()'));
  test('otevřený řídící: tlačítka pro B a C, ne pro řídícího', t.length === 2 && t.some(x => /z2/.test(x) && /pro Beta/.test(x))
    && t.some(x => /z3/.test(x) && /pro Gama/.test(x)) && !t.some(x => /z1/.test(x)), t);
}
/* zámek čtení, náhled, jeden zákazník */
{
  const o = obrazovka(zakazka(true), { cteni: true }); o.run("VZ_UI.otevreny = 'z2'");
  const h = o.run('vzKlSdilenaPozn()');
  test('zámek čtení: upozornění ano, tlačítko ne', /Varianta je sdílená/.test(h) && tlacitka(h).length === 0, h);
  const o2 = obrazovka(zakazka(true), { nahled: true }); o2.run("VZ_UI.otevreny = 'z2'");
  test('náhled: tlačítko ne', tlacitka(o2.run('vzKlSdilenaPozn()')).length === 0);
  const o3 = obrazovka(zakazka(false));
  test('jeden zákazník: nic', o3.run('vzKlSdilenaPozn()') === '');
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
