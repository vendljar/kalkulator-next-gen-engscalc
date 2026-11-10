/* VS #570, etapa E3 (roadmapa #593) — SLOUČENÉ PŘÍPLATKY A POHLED SOUČET
 * (návrh 5.1.1, R8, R13). Jádro slučuje řádky od E1 (vsSlucRadky); tady se
 * hlídá, co z toho vidí obchodník v Cenové kalkulaci:
 *  – stejný klíč a sazba = jeden řádek: množství Σ kᵢ·mᵢ, cena Σ kᵢ·cᵢ,
 *    pod názvem výčet šachet „Výtah A, Výtah B 2×" (jen v pohledu Součet);
 *  – příplatek jen u některé šachty (SKN jen exteriér) má výčet jen jí;
 *  – vlastní příplatek téhož názvu s jinou sazbou = dva řádky;
 *  – příplatky celkem = CEIL(Σ kᵢ·Pᵢ před zaokrouhlením);
 *  – pohled Součet je jen ke čtení: každé pole a tlačítko disabled;
 *  – věty nad tabulkami podle pohledu; bez víc šachet nic.
 * Pojistka: na 079cfc6 selže (ui/vice_sachet_ui.js ani vsSachtyPopis nejsou).
 * Spuštění: cd src && node test_vs_priplatky.js */
'use strict';
const { prostredi, kop, cenik, zad, E, VS, J } = require('./vs_ui_prostredi.js');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 300)); } };
const blizko = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
const CEIL = (x, m) => Math.ceil(x / m - 1e-9) * m;

const C = cenik();
const ZA = zad({ priplatkyVlastni: [{ nazev: 'Jeřáb', mnozstvi: 1, cena: 1000 }] });
const ZB = zad({ zdvih: 17.3, typSachty: 'interiérová', profily: kop(E.PROFILY_VYCHOZI['interiérová']),
  priplatkyVlastni: [{ nazev: 'Jeřáb ', mnozstvi: 2, cena: 2000 }] });
const ock = { zadani: kop(ZA), fixes: true, nazev: 'Výtah A', dalsi: [{ id: 's_b', nazev: 'Výtah B', ks: 2, zadani: kop(ZB) }] };
const { ctx } = prostredi({ ock, cenik: C });
const r = ctx.vypocetAkt();
const ra = E.vypocet(kop(ZA), C, J, true), rb = E.vypocet(kop(ZB), C, J, true);
const najdi = (rows, k) => rows.filter(x => x.key === k);

/* společný příplatek: madla na bočních stěnách (obě šachty, stejná sazba) */
const mA = najdi(ra.priplatky, 'madlaBoky')[0], mB = najdi(rb.priplatky, 'madlaBoky')[0];
const m = najdi(r.priplatky, 'madlaBoky');
test('stejný klíč a sazba → jeden řádek', m.length === 1 && !!mA && !!mB, m.length);
test('množství = Σ ks × množství (1·A + 2·B)', blizko(m[0].mnozstvi, mA.mnozstvi + 2 * mB.mnozstvi), [m[0].mnozstvi, mA.mnozstvi, mB.mnozstvi]);
test('cena = Σ ks × cena', blizko(m[0].sMarzi, mA.sMarzi + 2 * mB.sMarzi));
ctx.VS_UI.pohled = 'soucet';
ctx.vsKalkVysledek(r);
test('Součet: pod názvem „Výtah A, Výtah B 2×"', ctx.vsSachtyPopis(m[0]) === '<div class="note vs-sachty-popis">Výtah A, Výtah B 2×</div>', ctx.vsSachtyPopis(m[0]));

/* jen exteriér: SKN */
const skn = najdi(r.priplatky, 'skn');
test('příplatek jen u šachty A (SKN exteriér) — výčet jen „Výtah A"', skn.length === 1 && !najdi(rb.priplatky, 'skn').length
  && ctx.vsSachtyPopis(skn[0]) === '<div class="note vs-sachty-popis">Výtah A</div>', skn.length && ctx.vsSachtyPopis(skn[0]));

/* vlastní příplatek, stejný název (po normalizaci), jiná sazba → dva řádky */
const vl = r.priplatky.filter(x => x.vlastni);
test('vlastní „Jeřáb" s jinou sazbou → dva řádky', vl.length === 2 && vl[0].vsSachty.length === 1 && vl[1].vsSachty.length === 1, vl.map(x => [x.nazev, x.cena]));
test('…každý s výčtem své šachty (B 2×)', /Výtah A/.test(ctx.vsSachtyPopis(vl[0])) && /Výtah B 2×/.test(ctx.vsSachtyPopis(vl[1])));

/* celkem */
test('příplatky celkem = CEIL(Σ ks × před zaokrouhlením)', r.souhrn.priplatkyCena
  === CEIL(ra.souhrn.priplatkyCenaPredZaokr + 2 * rb.souhrn.priplatkyCenaPredZaokr, 1000), [r.souhrn.priplatkyCena]);

/* pohled šachty: bez výčtu, celkem šachty před zaokrouhlením */
ctx.VS_UI.pohled = 'akt'; ctx.VS_UI.akt = 1;
const rs = ctx.vsKalkVysledek(r);
test('pohled šachty B: výsledek šachty, bez výčtu šachet', rs === r.sachty[1].vysl && ctx.vsSachtyPopis(m[0]) === '');
test('pohled šachty: příplatky celkem bez zaokrouhlení', ctx.vsPriplatkyCelkem(rs) === rb.souhrn.priplatkyCenaPredZaokr);
test('věta nad příplatky: výběr po šachtách, jméno šachty', /výběr příplatků do nabídky je po šachtách — zde pro <b>Výtah B<\/b>/i.test(ctx.vsPriplatkyPoznamka(r)));
ctx.VS_UI.pohled = 'soucet';
test('věta nad příplatky v Součtu: jeden řádek s počtem', /jeden řádek\s+s počtem/.test(ctx.vsPriplatkyPoznamka(r)));
test('věta nad kalkulací v Součtu: jen ke čtení, počty variant', /jen ke čtení/.test(ctx.vsKalkPoznamka(r)) && /2 varianty šachet, celkem 3 ks/.test(ctx.vsKalkPoznamka(r)));

/* jen ke čtení */
const html = '<table><tr><td><input type="text" value="x"><select><option>a</select><button class="mini">✕</button><textarea></textarea></td></tr></table>';
const ro = ctx.vsKalkObal(r, html);
test('Součet: obal vs-soucet-ro a všechny prvky disabled', /^<div class="vs-soucet-ro">/.test(ro) && (ro.match(/ disabled/g) || []).length === 4, ro);
ctx.VS_UI.pohled = 'akt';
test('pohled šachty: tabulka beze změny', ctx.vsKalkObal(r, html) === html);
test('přepínač: šachty + Součet, aktivní šachta zvýrazněná', (ctx.vsKalkPrepinac(r).match(/onclick="vsAkt\(/g) || []).length === 2
  && /class="on" onclick="vsAkt\(1\)"/.test(ctx.vsKalkPrepinac(r)) && /id="vsKalkSoucet" class=""/.test(ctx.vsKalkPrepinac(r)));

/* bez víc šachet nic */
const jedna = E.vypocet(kop(ZA), C, J, true);
test('jedna šachta: žádný přepínač, věta, obal ani výčet', ctx.vsKalkPrepinac(jedna) === '' && ctx.vsKalkPoznamka(jedna) === ''
  && ctx.vsPriplatkyPoznamka(jedna) === '' && ctx.vsKalkObal(jedna, html) === html && ctx.vsSachtyPopis(jedna.priplatky[0]) === '');
ctx.VS_UI.pohled = 'soucet';
test('jedna šachta i s pohledem Součet v paměti: tabulka beze změny', ctx.vsKalkObal(jedna, html) === html && ctx.vsKalkVysledek(jedna) === jedna);

/* vypnuto: přepínač jen šachta 1 + Součet */
{ const p = prostredi({ zap: false, ock: kop(ock), cenik: C });
  const pr = p.ctx.vsKalkPrepinac(p.ctx.vypocetAkt());
  test('VYP + víc šachet: přepínač jen šachta 1 a Součet', (pr.match(/onclick="vsAkt\(/g) || []).length === 1 && /vsPohledSoucet\(\)/.test(pr), pr); }

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
