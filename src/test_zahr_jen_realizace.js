/* ===== P6 (K19-N114): ZAHRANIČNÍ ŘADA CENÍKU A „JEN REALIZACE" =====
 * (nálezy 19. kola; rozhodnutí J. V. 2. 10. 2026 — výchozí návrh;
 * upraveno 13. 10. 2026 — D6f, výchozí)
 *
 * Po přepnutí varianty na zahraniční ceník se aplikace zeptá, zda zakázku
 * nastavit jen jako realizaci (jenOck); po návratu všech variant do
 * tuzemska nabídne zrušení jenOck ('zrusitJenOck', dřív 'obeStrany').
 * Od 13. 10. 2026 (zámek strany: číslo nabídky vyřadí druhou stranu) se
 * dialog nabízí jen zahraniční zakázce BEZ čísla — zakázka s číslem OPR
 * (tvar K22-Z02) má PROJ vyřazenou už podle čísla. Příznak obeStrany se
 * ignoruje. Rozhodovací funkce zahrJenRealizaceNabidnout (zakazka.js) —
 * tady její pravidla; dialog hlídá overit_zahranicni.mjs.
 * Před 13. 10. 2026 (1df7283): OPR → 'jenOck', návrat → 'obeStrany'.
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
/* Výchozí: zakázka BEZ čísla (předloha) — obchodník se teprve rozhoduje. */
const zak = (x) => Object.assign({ cislo: zk.ZAK_CISLO_PREDLOHA, jenOck: false, jenProj: false }, x || {});

test('přepnutí na zahraničí u zakázky bez čísla → nabídnout „jen realizace"', f(zak(), 'zahr', ['zahr']) === 'jenOck');
test('D6f: zahraniční zakázka s číslem OPR (K22-Z02) → nic, PROJ je vyřazená podle čísla',
  f(zak({ cislo: '2026 - OPR - CN - 0100' }), 'zahr', ['zahr']) === null);
test('zakázka už jen realizace → nic', f(zak({ jenOck: true }), 'zahr', ['zahr']) === null);
test('D6a: příznak obeStrany se ignoruje (bez čísla dál nabídnout)', f(zak({ obeStrany: true }), 'zahr', ['zahr']) === 'jenOck');
test('zakázka jen projekce → nic', f(zak({ jenProj: true }), 'zahr', ['zahr']) === null);
test('číslo projekce (OVP) ve společném čísle → nic', f(zak({ cislo: '2026 - OVP - CN - 0100' }), 'zahr', ['zahr']) === null);
test('vlastní číslo ve starší hlavičce PROJ → nic', f(zak({ projHlavicka: { cislo: '2026 - OVP - CN - 0101' } }), 'zahr', ['zahr']) === null);
test('prázdná starší hlavička PROJ → nabídnout', f(zak({ projHlavicka: { cislo: '' } }), 'zahr', ['zahr']) === 'jenOck');
test('návrat do tuzemska, žádná varianta zahraniční, zakázka jen realizace → nabídnout zrušení jenOck',
  f(zak({ jenOck: true }), 'cr', ['cr', 'cr']) === 'zrusitJenOck');
test('návratová hodnota „obeStrany" se už nepoužívá',
  [f(zak({ jenOck: true }), 'cr', ['cr']), f(zak({ jenOck: true, cislo: '2026 - OPR - CN - 1' }), 'cr', ['cr'])].every(x => x !== 'obeStrany'));
test('návrat do tuzemska, jiná varianta dál zahraniční → nic', f(zak({ jenOck: true }), 'cr', ['cr', 'zahr']) === null);
test('návrat do tuzemska u zakázky, která jen realizace nebyla → nic', f(zak(), 'cr', ['cr']) === null);
test('bez zakázky → nic', f(null, 'zahr', []) === null);
/* B129 (audit 6. 10. 2026): `jenOck` je vlastnost zakázky — u zakázky
 * s odeslanou (zamčenou) variantou by změnila i odeslanou nabídku. */
const zamcena = { id: 'v1', zamek: { zamceno: true, typ: 'nabidka' } }, volna = { id: 'v2' };
test('B129: zakázka s odeslanou variantou — přepnutí na zahraničí nic nenabídne',
  f(zak({ varianty: [zamcena, volna] }), 'zahr', ['cr', 'zahr']) === null);
test('B129: ani návrat do tuzemska u zakázky s odeslanou variantou',
  f(zak({ jenOck: true, varianty: [zamcena, volna] }), 'cr', ['cr', 'cr']) === null);
test('B129: odemčená (dříve zamčená) varianta nabídku nebrání',
  f(zak({ varianty: [{ id: 'v1', zamek: { zamceno: false } }, volna] }), 'zahr', ['zahr', 'cr']) === 'jenOck');

console.log(`\n${ok} OK, ${fail} FAIL`);
if (fail) process.exit(1);
