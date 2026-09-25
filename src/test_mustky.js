/* Můstky mezi budovou a OCK (P7 / K13-N59, zadání J. V. 25. 9. 2026).
 *
 * Do 25. 9. byl můstek zaškrtávátko, které do výpočtu nevstupovalo a do
 * nabídky se nedostalo (K13-08: můstek zadaný, v nabídce nic, bez ceny).
 * Teď počet kusů: 0 = žádný, jinak kolik jich je. Hlídá se:
 *   – převod staré zakázky (zaškrtnuto = 1, jinak 0) a zakázka bez můstků
 *     beze změny (seznam položek i cena, oba modely),
 *   – řádek v hrubé OCK: počet × ceníková cena za kus,
 *   – specifikace (usazení čelní stěny, střecha, nový řádek) a nabídka,
 *   – kontrola před nabídkou: chybějící cena, víc můstků než nástupišť,
 *   – kontrola standardu počítá s počtem. */
const E = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
const J = require('./jekly.json');
const tsm = require('./techspec.js');
global.mustkyPocet = E.mustkyPocet; global.nastupisteCelkem = E.nastupisteCelkem;
const kop = x => JSON.parse(JSON.stringify(x));
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
const CENIK = Object.assign(kop(E.DEFAULT_CENIK), ZC.zkusebniCenik());
const RADEK = 'MŮSTKY MEZI BUDOVOU A OCK';

function spocti(extra, fixes = true, typ = 'exteriérová', cenik) {
  const z = kop(E.DEFAULT_ZADANI);
  Object.assign(z, { typSachty: typ, profily: kop(E.PROFILY_VYCHOZI[typ]) }, extra || {});
  return { r: E.vypocet(z, kop(cenik || CENIK), J, fixes), z };
}
const radek = r => (r.sekce.hrubaOck || []).find(x => x.nazev === RADEK || x.origNazev === RADEK);

/* Převod a beze změny. */
test('mustkyPocet: staré zaškrtnuto = 1', E.mustkyPocet({ mustek: true }) === 1);
test('mustkyPocet: staré nezaškrtnuto = 0', E.mustkyPocet({ mustek: false }) === 0);
test('mustkyPocet: počet má přednost', E.mustkyPocet({ mustek: true, mustkyKs: 3 }) === 3 && E.mustkyPocet({ mustek: true, mustkyKs: 0 }) === 0);
test('mustkyPocet: záporné / nesmysl = 0 / celé číslo', E.mustkyPocet({ mustkyKs: -2 }) === 0 && E.mustkyPocet({ mustkyKs: 2.7 }) === 2);
test('DEFAULT_ZADANI klíč mustkyKs nenese (import by starým zakázkám dal nulu)', !('mustkyKs' in E.DEFAULT_ZADANI));
for (const fixes of [true, false]) {
  const M = fixes ? 'Model 2' : 'Model 1';
  const bez = spocti({}, fixes).r, nula = spocti({ mustkyKs: 0 }, fixes).r;
  test(M + ': bez můstků žádný řádek a stejná cena', !radek(bez) && !radek(nula)
    && bez.souhrn.zakladCena === nula.souhrn.zakladCena
    && bez.sekce.hrubaOck.length === nula.sekce.hrubaOck.length);
  const dva = spocti({ mustkyKs: 2 }, fixes).r;
  test(M + ': 2 můstky = řádek 2 × cena za kus', radek(dva) && radek(dva).mnozstvi === 2
    && Math.abs(radek(dva).naklad - 2 * CENIK.mustekKc) < 1e-6, radek(dva));
  test(M + ': cena nabídky vzroste', dva.souhrn.zakladCena > bez.souhrn.zakladCena);
  const stary = spocti({ mustek: true }, fixes).r;
  test(M + ': stará zakázka se zaškrtnutým můstkem = 1 ks', radek(stary) && radek(stary).mnozstvi === 1);
}

/* Specifikace. */
{
  const pole = id => { let p = null; tsm.TECHSPEC_DEF.forEach(s => s.pole.forEach(x => { if (x.id === id) p = x; })); return p; };
  const Z = x => Object.assign(kop(E.DEFAULT_ZADANI), { typSachty: 'exteriérová', nastupiste: 5 }, x);
  const u = pole('usazeniCelni'), st = pole('strecha'), m = pole('mustky');
  test('spec: bez můstků usazení beze změny', u.prefill(null, Z({})) === 'přisazena k fasádě (dle odchylky podest od svislice)');
  test('spec: 1 můstek', u.prefill(null, Z({ mustkyKs: 1 })) === 'přisazena k fasádě, v jednom nástupišti přes můstek');
  test('spec: 2 můstky (interiér)', u.prefill(null, Z({ mustkyKs: 2, typSachty: 'interiérová' })) === 'přisazena k podestám, v 2 nástupištích přes můstky');
  test('spec: můstek v každém nadzemním nástupišti', u.prefill(null, Z({ mustkyKs: 4 })) === 's nástupními můstky ve všech nadzemních nástupištích');
  test('spec: střecha přetažená přes můstek, jen když je i v nejvyšším',
    /přetažená i přes nástupní můstek/.test(st.prefill(null, Z({ mustkyKs: 4 }))) && /RAL 3011/.test(st.prefill(null, Z({ mustkyKs: 2 }))));
  test('spec: řádek můstků s rozměry', m.prefill(null, Z({ mustkyKs: 2, mustekHloubkaMm: 900, mustekSirkaMm: 1300 })) === '2 ks, hloubka 900 mm, šířka 1300 mm');
  test('spec: bez můstků řádek „ -"', m.prefill(null, Z({})) === ' -');
  const pr = require('./preklad.js');
  test('spec EN: řádek i usazení přeložené vzorem',
    pr.tr('2 ks, hloubka 900 mm, šířka 1300 mm', 'en') === '2 pcs, depth 900 mm, width 1300 mm'
    && pr.tr('přisazena k fasádě, v 3 nástupištích přes můstky', 'de') === 'An die Fassade angebaut, an 3 Zugangsstellen über Brücken');
}

/* Nabídka. */
{
  global.vypocet = E.vypocet; global.DEFAULT_ZADANI = E.DEFAULT_ZADANI; global.DEFAULT_CENIK = CENIK;
  const ep = require('./engine_proj.js');
  global.DEFAULT_ZADANI_PROJ = ep.DEFAULT_ZADANI_PROJ; global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
  global.TECHSPEC_DEF = tsm.TECHSPEC_DEF; global.tsHodnota = tsm.tsHodnota; global.DEFAULT_TECHSPEC = tsm.DEFAULT_TECHSPEC;
  const fm = require('./firma.js'); Object.keys(fm).forEach(k => { global[k] = fm[k]; });
  const zk = require('./zakazka.js');
  const { nabidkaData, nabidkaNahledSekce } = require('./nabidka.js');
  const zak = zk.novaZakazka(); zak.cislo = '2026 - OPR - CN - 9137';
  Object.assign(zak.varianty[0].data.ock.zadani, { prejezd: 3.5, zdvih: 12, prohluben: 1.1, sirka: 1.6, hloubka: 1.5,
    mustkyKs: 1, mustekHloubkaMm: 900, mustekSirkaMm: 1300 });
  const ph = nabidkaData(zak, zak.varianty[0], J, 'cz').placeholders;
  test('nabídka: TS_MUSTKY', ph.TS_MUSTKY === '1 ks, hloubka 900 mm, šířka 1300 mm', ph.TS_MUSTKY);
  const radky = []; nabidkaNahledSekce(ph, 'cz').forEach(s => s.radky.forEach(r => radky.push(r)));
  test('online nabídka: řádek MŮSTKY v doplňkových konstrukcích', radky.some(r => r[0] === RADEK && /900/.test(r[1])));
  zak.varianty[0].data.ock.zadani.mustkyKs = 0;
  test('nabídka bez můstků: zástupce prázdný', nabidkaData(zak, zak.varianty[0], J, 'cz').placeholders.TS_MUSTKY === '');
}

/* Kontrola před nabídkou. */
{
  const sl = require('./sleva.js'); global.slevaPodil = sl.slevaPodil;
  const kt = require('./kontroly.js');
  const nal = (x, c) => { const { r, z } = spocti(x, true, 'exteriérová', c);
    return kt.kontrolyProved({ zadani: z, vysledek: r, cenik: c || CENIK }).nalezy.find(n => n.kod === 'mustky'); };
  test('kontrola: s cenou a rozumným počtem mlčí', !nal({ mustkyKs: 1 }));
  const bezCeny = Object.assign(kop(CENIK), { mustekKc: 0 });
  const n = nal({ mustkyKs: 2 }, bezCeny);
  test('kontrola: chybí cena → 0 Kč se řekne', n && /chybí cena můstku/.test(n.text) && /0 Kč/.test(n.text), n && n.text);
  const n2 = nal({ mustkyKs: 9, nastupiste: 5 });
  test('kontrola: víc můstků než nástupišť', n2 && /víc než nástupišť/.test(n2.text), n2 && n2.text);
  test('kontrola: bez můstků mlčí i bez ceny', !nal({}, bezCeny));
}

/* Kontrola standardu počítá s počtem. */
{
  const so = require('./standard_ock.js');
  const std = Object.assign(so.standardOciste({}), { zapnuto: true });
  const z = Object.assign(kop(E.DEFAULT_ZADANI), { mustkyKs: 2, mustekHloubkaMm: 1500, mustekSirkaMm: 800 });
  const v = so.standardVyhodnot(z, 20, std, {});
  test('standard: hloubka můstku nad limit se hlásí i při zadání počtem', (v.nalezy || []).some(n => /Hloubka můstku/.test(n.co || n.nazev || JSON.stringify(n))), v.nalezy);
  const v0 = so.standardVyhodnot(Object.assign(kop(E.DEFAULT_ZADANI), { mustkyKs: 0, mustekHloubkaMm: 1500 }), 20, std, {});
  test('standard: 0 můstků = rozměry se nehlídají', !(v0.nalezy || []).some(n => /můstku/.test(JSON.stringify(n))));
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
