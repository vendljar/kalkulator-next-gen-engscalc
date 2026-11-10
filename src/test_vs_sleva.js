/* VS #570, etapa E3 (roadmapa #593) — SLEVA, SCHVALOVÁNÍ, ROZPIS CENY
 * A PŘEHLEDY VARIANTY S VÍC ŠACHTAMI (R3, R7, R19).
 *  – jedna sleva ze součtu: koncová cena, strop role a marže po slevě
 *    z celé nabídky, ne ze šachty 1; věta v kartě slevy a v žádosti
 *    o schválení („2 varianty šachet, celkem 3 ks"), u projekce ani
 *    u jedné šachty nic;
 *  – hlavička ceny: rozpis po šachtách = ceny po rozpočtu, Σ = základ,
 *    klik otevře šachtu (s vypnutou funkcí jen šachta 1);
 *  – karta Obchodní zaokrouhlení: tabulka rozpočtu (spočteno, v nabídce,
 *    celkem = základ);
 *  – štítek „2 varianty / 3 ks" (seznam, porovnání), hledání podle názvu
 *    šachty v seznamu variant; jedna šachta beze změny.
 * Pojistka: na 079cfc6 selže (vice_sachet_ui.js, vsNazvySachetText chybí).
 * Spuštění: cd src && node test_vs_sleva.js */
'use strict';
const { prostredi, kop, cenik, zad, E, VS, J } = require('./vs_ui_prostredi.js');
Object.keys(VS).forEach(k => { global[k] = VS[k]; });   // seznam.js volá vsNazvySachetText jako globální (build)
['./sleva.js', './zaokrouhleni.js', './seznam.js'].forEach(f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); });

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 300)); } };
const blizko = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));

const C = cenik();
const ZA = zad(), ZB = zad({ zdvih: 17.3, sirka: 2.2 });
const ock = { zadani: kop(ZA), fixes: true, nazev: 'Výtah A', dalsi: [{ id: 's_b', nazev: 'Uliční trakt', ks: 2, zadani: kop(ZB) }] };
const { ctx } = prostredi({ ock, cenik: C });
const r = ctx.vypocetAkt();
const ra = E.vypocet(kop(ZA), C, J, true);

/* sleva ze součtu */
const NAST = { minMarze: 0.10, stropy: { 'Obchodník': 5 } };
const sl = { procenta: 4, stav: 'schváleno', role: 'Obchodník' };
const vS = slevaVyhodnot(r.souhrn.zakladCena, r.souhrn.zakladNaklad, sl, NAST);
const vA = slevaVyhodnot(ra.souhrn.zakladCena, ra.souhrn.zakladNaklad, sl, NAST);
test('sleva ze součtu: částka = 4 % ze základu celé nabídky', vS && blizko(vS.slevaKc, r.souhrn.zakladCena * 0.04) && vS.slevaKc > vA.slevaKc * 2, [vS && vS.slevaKc, vA && vA.slevaKc]);
test('marže po slevě ze součtu nákladů', blizko(vS.marzePoSleve, (vS.cenaPoSleve - r.souhrn.zakladNaklad) / vS.cenaPoSleve));
const cn = cenaNabidkyOck(r, sl, null);
test('koncová cena = základ součtu po slevě', cn && blizko(cn.zaklad, r.souhrn.zakladCena) && blizko(cn.pred, r.souhrn.zakladCena * 0.96), cn);
test('věta v kartě slevy: počty variant a šachet celkem', /Sleva se počítá z ceny celé nabídky \(2 varianty šachet, celkem 3 ks\)/.test(ctx.vsSlevaPoznamka()), ctx.vsSlevaPoznamka());
test('žádost o schválení OCK: „2 varianty šachet, celkem 3 ks"', ctx.vsSchvPopis({ id: 'v1', cast: 'ock' }) === 'Sleva z ceny celé nabídky: <b>2 varianty šachet, celkem 3 ks</b>');
test('žádost u projekce ani u cizí varianty nic', ctx.vsSchvPopis({ id: 'v1', cast: 'proj' }) === '' && ctx.vsSchvPopis({ id: 'jina', cast: 'ock' }) === '');

/* hlavička ceny */
const h = ctx.vsRozpisHlavicka(r);
const kc = x => 'F0' + Math.round(x);
test('rozpis: šachty s ks a cenou po rozpočtu', h.indexOf('Výtah A · 1 ks · ' + kc(r.sachty[0].cenaRozpis)) > 0
  && h.indexOf('Uliční trakt · 2 ks · ' + kc(r.sachty[1].cenaRozpis)) > 0, h);
test('rozpis: Σ cen šachet = základní cena (R7)', r.sachty[0].cenaRozpis + r.sachty[1].cenaRozpis === r.souhrn.zakladCena);
test('rozpis: klik otevře šachtu', /onclick="vsAkt\(0\)"/.test(h) && /onclick="vsAkt\(1\)"/.test(h));
test('rozpis: počty v poznámce', /2 varianty šachet, celkem 3 ks/.test(h));
{ const p = prostredi({ zap: false, ock: kop(ock), cenik: C });
  const hv = p.ctx.vsRozpisHlavicka(p.ctx.vypocetAkt());
  test('VYP: rozpis se ukáže (cena podle dat), otevřít jde jen šachta 1', /onclick="vsAkt\(0\)"/.test(hv) && !/vsAkt\(1\)/.test(hv) && /disabled/.test(hv)); }

/* rozpočet v kartě zaokrouhlení */
const t = ctx.vsRozpocetTabulka();
test('rozpočet: řádek po šachtě s ks a cenou v nabídce', /<td>Uliční trakt<\/td><td class="r">2<\/td>/.test(t) && t.indexOf(kc(r.sachty[1].cenaRozpis)) > 0, t.slice(0, 500));
test('rozpočet: spočteno s haléři = ks × cena před zaokrouhlením', t.indexOf((Math.round(r.sachty[1].cenaPredZaokr * 100) / 100).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kč') > 0);
test('rozpočet: celkem v nabídce = základní cena, celkem 3 ks', /<td style="font-weight:600">Celkem<\/td><td class="r">3<\/td>/.test(t)
  && t.indexOf('<td class="r" style="font-weight:600">' + kc(r.souhrn.zakladCena) + '</td>') > 0);

/* štítek a hledání */
test('štítek varianty „2 varianty / 3 ks" s názvy v bublině', /<span class="pill vs-stitek" title="Výtah A, Uliční trakt 2 ks">2 varianty \/ 3 ks<\/span>/.test(ctx.vsStitekVarianty(ctx.V)), ctx.vsStitekVarianty(ctx.V));
const zak = { varianty: [{ id: 'v1', nazev: 'Var A', data: { ock: kop(ock) } }, { id: 'v2', nazev: 'Var B', data: { ock: { zadani: kop(ZA), fixes: true } } }] };
const radky = seznamRadky(zak, {});
test('seznam: hledání podle názvu šachty najde variantu', seznamHledej(radky, 'ulicni trakt').map(x => x.id).join() === 'v1');
test('seznam: jedna šachta — hledatelný text beze změny (bez názvů šachet)', !/sachta/.test(radky[1].hledatelne) && ctx.vsStitekVarianty(zak.varianty[1]) === '');
test('vsNazvySachetText: jen v režimu víc šachet', VS.vsNazvySachetText(ock) === 'Výtah A Uliční trakt' && VS.vsNazvySachetText({ zadani: {}, fixes: true }) === '');
test('jedna šachta: věta slevy ani rozpočet nic', (() => { const p = prostredi({ ock: { zadani: kop(ZA), fixes: true }, cenik: C });
  return p.ctx.vsSlevaPoznamka() === '' && p.ctx.vsRozpocetTabulka() === '' && p.ctx.vsRozpisHlavicka(p.ctx.vypocetAkt()) === ''; })());

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
