/* POKUS AUDITU KOLA 28 (18. 10. 2026) — SoD realizace v3 / projekce v4
 * (režim DPH, skladné, bloky CIN_*, injekce do symbolů). Viz
 * podklady/AUDIT_2026-10-18_v18.10.11.md. Jen čistá logika ze src/, smyšlené
 * údaje, žádná šablona ani ceny. Spuštění: node podklady/AUDIT28_pokus_sod.mjs
 *
 * Testy „… trvá" popisují nález tak, jak je; po opravě se otočí. */
import { createRequire } from 'node:module';
const R = new URL('..', import.meta.url).pathname;
const require = createRequire(R + 'src/x.js');
const nacti = (f) => { const m = require(R + 'src/' + f); Object.keys(m).forEach(k => { if (globalThis[k] === undefined) globalThis[k] = m[k]; }); return m; };
nacti('format.js');
nacti('preklad.js');
const dg = nacti('docxgen.js');
const kr = nacti('kryci.js');
const sod = nacti('sod.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 400)); } };

/* P1 — výchozí režim DPH podle DIČ (B189). */
const R0 = kr.KRYCI_DPH_REZIMY;
const vych = dic => kr.kryciDphRezimVychozi({ dic });
test('P1: bez DIČ → česká DPH', vych('') === R0[0]);
test('P1 B189 opraveno (v19.10.1): DIČ CZ (plátce) → přenesená povinnost (tuzemsko) jako v2', vych('CZ12345678') === R0[1], vych('CZ12345678'));
test('P1 B189 opraveno: DIČ DE → bez výchozí volby (rozhoduje místo stavby)', vych('DE123456789') === '');
test('P1: DIČ GR → bez výchozí volby', vych('GR123456789') === '');
test('P1 B189 opraveno: DIČ mimo EU (CHE…) → bez výchozí volby', vych('CHE-123.456.789') === '');
test('P1: DIČ s mezerou a malými písmeny (" cz 123") → přenesená', vych(' cz 123') === R0[1]);
test('P1: neznámý text režimu → symboly zůstanou {{…}} (fail-safe)',
  (() => { const p = {}; sod.sodDphSymboly(p, 'jiné znění režimu', 'bytový dům', 'cz'); return p.SOD_DPH_REZIM === undefined; })());
test('P1: snížená sazba jen při české DPH a bydlení',
  (() => { const a = {}, b = {}; sod.sodDphSymboly(a, R0[0], 'bytový dům', 'cz'); sod.sodDphSymboly(b, R0[2], 'bytový dům', 'cz');
    return a.SOD_DPH_PROHLASENI === sod.SOD_DPH_PROHLASENI_SNIZENA && b.SOD_DPH_PROHLASENI === sod.SOD_DPH_PROHLASENI_OZNAMENI; })());

/* P2 — skladné z Nastavení → Firma (B190). */
const skl = (v, L, mena) => { const p = {}; sod.sodSkladne(p, { skladneDenneKc: v }, mena, L); return p.SOD_SKLADNE; };
const EUR = { eur: true, na: n => Math.ceil(n / 25), fmt: n => '€ ' + n };
test('P2: „500" → „500,- Kč"', skl('500', 'cz') === '500,- Kč', skl('500', 'cz'));
test('P2: „1 500" → „1 500,- Kč"', skl('1 500', 'cz') === (1500).toLocaleString('cs-CZ') + ',- Kč', skl('1 500', 'cz'));
test('P2: prázdné / text / záporné → symbol zůstane', skl('', 'cz') === undefined && skl('abc', 'cz') === undefined && skl('-500', 'cz') === undefined);
test('P2: EUR celá eura nahoru (510 Kč / 25 → € 21)', skl('510', 'en', EUR) === '€ 21', skl('510', 'en', EUR));
const tecka = skl('1.500', 'cz'), teckaCarka = skl('1.500,-', 'cz');
console.log('     „1.500" → ' + tecka + ' · „1.500,-" → ' + teckaCarka + ' · „1.000,50" → ' + skl('1.000,50', 'cz'));
test('P2 B190: „1.500" (tečka jako oddělovač tisíců) nesmí dát „2,- Kč"', tecka !== '2,- Kč', tecka);
test('P2 B190: „1.500,-" nesmí dát „2,- Kč"', teckaCarka !== '2,- Kč', teckaCarka);

/* P3 — bloky CIN_* (blokyPryc) na nevyváženém XML (B191). */
const p = t => '<w:p><w:r><w:t>' + t + '</w:t></w:r></w:p>';
const vyv = p('{{CIN_EZC_ZAC}}') + p('Ekonomická zadávací část') + p('{{CIN_EZC_KON}}');
test('P3: vyvážený blok v blokyPryc zmizí i s textem', !dg.odstranPrazdneBloky(vyv, {}, ['CIN_EZC']).includes('Ekonomická'));
/* začátek bloku v buňce tabulky, konec mimo ni (šablona upravená ve Wordu) */
const nevyv = '<w:tbl><w:tr><w:tc>' + p('{{CIN_EZC_ZAC}}') + p('Ekonomická zadávací část') + '</w:tc></w:tr></w:tbl>' + p('{{CIN_EZC_KON}}');
const out = dg.odstranPrazdneBloky(nevyv, {}, ['CIN_EZC']);
test('P3 B191 trvá: nevyvážený blok z blokyPryc zůstane v dokumentu a značky zmizí (tiše)',
  out.includes('Ekonomická') && !out.includes('CIN_EZC'), out);

/* P4 — injekce {{…}} a XML z hodnot uživatele do nových symbolů. */
const ph = { SOD_MISTO_PLNENI_DRUH: '{{SOD_CISLO_SMLOUVY}}</w:t><w:t>x&', SOD_CISLO_SMLOUVY: 'TAJNE' };
const x = dg.nahradPlaceholdery(p('{{SOD_MISTO_PLNENI_DRUH}}'), ph);
test('P4: {{…}} z hodnoty se nerozvine a XML se escapuje', !x.includes('TAJNE') && x.includes('&lt;/w:t&gt;') && x.includes('&amp;'), x);
test('P4: sodPrelozHodnoty nechá vlastní znění (slovník nezná) beze změny',
  (() => { const q = { SOD_MISTO_PLNENI_DRUH: '<script>' }; sod.sodPrelozHodnoty(q, 'en'); return q.SOD_MISTO_PLNENI_DRUH === '<script>'; })());

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
