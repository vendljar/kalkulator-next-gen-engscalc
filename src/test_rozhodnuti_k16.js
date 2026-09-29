/* ROZHODNUTÍ J. V. K ROZBORU D KOLA 16 (29. 9. 2026)
 * Podklad: podklady/K16_ROZBOR_2026-09-25.md (tabulka rozhodnutí nahoře).
 *
 * Každý oddíl hlídá jedno rozhodnutí; bez opravy jeho testy selžou.
 *   P8b  — holé číslo termínu dodání dostane jednotku („12" → „12 týdnů"),
 *          aby nabídka neříkala „Termín dodání: 12" a aby se termín s ATYP
 *          dal přeložit (dřív „16 (vč. 4 týdnů za ATYP)" zůstalo česky). */
const fs = require('fs');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./firma.js');
const pr = nacti('./preklad.js');
const zk = nacti('./zakazka.js');
const kr = nacti('./kryci.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info))); } };
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));
global.NAST = { firma: global.firmaDefault() };

const zak = zk.novaZakazka();
zak.cislo = '2026 - OPR - CN - 0404'; zak.nazevAkce = 'Zkušební termíny'; zak.objednatel = 'Zkušební s.r.o.';
const v = zak.varianty[0];
const c = kr.kryciCtx(zak, v, JEKLY);
const pole = id => [].concat(...kr.KRYCI_SEKCE.map(s => s.pole)).find(p => p.id === id);

/* ---------------- P8b: termín dodání s jednotkou ---------------- */
const T = kr.kryciTerminDodaniText;
test('P8b: holé číslo dostane jednotku („12" → „12 týdnů")', T('12', false, '4') === '12 týdnů', T('12', false, '4'));
test('P8b: s ATYP se přičte a jednotka zůstane', T('12', true, '4') === '16 týdnů (vč. 4 týdnů za ATYP)', T('12', true, '4'));
test('P8b: „cca 12" → „cca 12 týdnů"', T('cca 12', false, '4') === 'cca 12 týdnů', T('cca 12', false, '4'));
test('P8b: česky se skloňuje (3 týdny, 1 týden)', T('3', false) === '3 týdny' && T('1', false) === '1 týden', [T('3', false), T('1', false)]);
test('P8b: po přičtení ATYP se skloňuje podle nového čísla („2 týdny" + 4 → „6 týdnů")',
  T('2 týdny od podpisu smlouvy', true, '4') === '6 týdnů od podpisu smlouvy (vč. 4 týdnů za ATYP)', T('2 týdny od podpisu smlouvy', true, '4'));
test('P8b: věta s vlastní jednotkou zůstává, jak je',
  T('12 týdnů od podpisu smlouvy', true, '4') === '16 týdnů od podpisu smlouvy (vč. 4 týdnů za ATYP)', T('12 týdnů od podpisu smlouvy', true, '4'));
test('P8b: bez čísla se nic nevymýšlí', T('dle dohody', false, '4') === 'dle dohody' && T('', false, '4') === '');
test('P8b: ruční přepis v krycím listu „10" odejde jako „10 týdnů"',
  kr.kryciHodnota(pole('terminDodani'), { hodnoty: { terminDodani: '10' } }, c) === '10 týdnů',
  kr.kryciHodnota(pole('terminDodani'), { hodnoty: { terminDodani: '10' } }, c));
test('P8b: ruční přepis s vlastním textem se nemění',
  kr.kryciHodnota(pole('terminDodani'), { hodnoty: { terminDodani: 'do 30. 11. 2026' } }, c) === 'do 30. 11. 2026');
const sAtyp = kr.kryciTerminDodani({ firma: { terminDodaniOck: '12', terminAtypTydny: '4' }, atyp: true });
test('P8b: termín z Firmy s ATYP se přeloží celý (EN)',
  pr.tr(sAtyp, 'en') === '16 weeks (incl. 4 weeks for the non-standard design)', pr.tr(sAtyp, 'en'));
test('P8b: … i německy a francouzsky',
  pr.tr(sAtyp, 'de') === '16 Wochen (inkl. 4 Wochen für die Sonderausführung)'
  && /^16 semaines/.test(pr.tr(sAtyp, 'fr')), [pr.tr(sAtyp, 'de'), pr.tr(sAtyp, 'fr')]);
test('P8b: jednotné číslo se přeloží („1 týden" → „1 week")', pr.tr('1 týden', 'en') === '1 week', pr.tr('1 týden', 'en'));

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
