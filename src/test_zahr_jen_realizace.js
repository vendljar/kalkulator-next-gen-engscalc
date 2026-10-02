/* ===== P6 (K19-N114): ZAHRANIČNÍ ŘADA CENÍKU A „JEN REALIZACE" =====
 * (nálezy 19. kola; rozhodnutí J. V. 2. 10. 2026 — výchozí návrh)
 *
 * Po přepnutí varianty na zahraniční ceník se aplikace zeptá, zda zakázku
 * nastavit jen jako realizaci (jenOck); po návratu všech variant do
 * tuzemska nabídne opak. Rozhodovací funkce zahrJenRealizaceNabidnout
 * (zakazka.js) — tady její pravidla; dialog hlídá overit_zahranicni.mjs.
 * Před zavedením: sada padá (funkce chybí).
 */
const eng = require('./engine.js');
const ep = require('./engine_proj.js');
const ZC = require('./zkusebni_cenik.js');
global.DEFAULT_ZADANI = JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI));
global.DEFAULT_CENIK = ZC.zkusebniCenik();
global.DEFAULT_ZADANI_PROJ = JSON.parse(JSON.stringify(ep.DEFAULT_ZADANI_PROJ));
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
global.DEFAULT_TECHSPEC = (() => { try { return require('./techspec.js').DEFAULT_TECHSPEC; } catch (e) { return {}; } })();
global.cenikDoplnKlice = eng.cenikDoplnKlice;
global.cenikMigraceLeseni = eng.cenikMigraceLeseni;
global.skloMigraceNazvu = eng.skloMigraceNazvu;
const zk = require('./zakazka.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};
const f = zk.zahrJenRealizaceNabidnout;
test('funkce je v zakazka.js', typeof f === 'function');
const zak = (x) => Object.assign({ cislo: '2026 - OPR - CN - 0100', jenOck: false, jenProj: false, obeStrany: false }, x || {});

test('přepnutí na zahraničí u běžné zakázky → nabídnout „jen realizace"', f(zak(), 'zahr', ['zahr']) === 'jenOck');
test('zakázka už jen realizace → nic', f(zak({ jenOck: true }), 'zahr', ['zahr']) === null);
test('vědomě „počítat obě strany" → nic', f(zak({ obeStrany: true }), 'zahr', ['zahr']) === null);
test('zakázka jen projekce → nic', f(zak({ jenProj: true }), 'zahr', ['zahr']) === null);
test('číslo projekce (OVP) ve společném čísle → nic', f(zak({ cislo: '2026 - OVP - CN - 0100' }), 'zahr', ['zahr']) === null);
test('vlastní číslo ve starší hlavičce PROJ → nic', f(zak({ projHlavicka: { cislo: '2026 - OVP - CN - 0101' } }), 'zahr', ['zahr']) === null);
test('prázdná starší hlavička PROJ → nabídnout', f(zak({ projHlavicka: { cislo: '' } }), 'zahr', ['zahr']) === 'jenOck');
test('návrat do tuzemska, žádná varianta zahraniční, zakázka jen realizace → nabídnout opak',
  f(zak({ jenOck: true }), 'cr', ['cr', 'cr']) === 'obeStrany');
test('návrat do tuzemska, jiná varianta dál zahraniční → nic', f(zak({ jenOck: true }), 'cr', ['cr', 'zahr']) === null);
test('návrat do tuzemska u zakázky, která jen realizace nebyla → nic', f(zak(), 'cr', ['cr']) === null);
test('bez zakázky → nic', f(null, 'zahr', []) === null);

console.log(`\n${ok} OK, ${fail} FAIL`);
if (fail) process.exit(1);
