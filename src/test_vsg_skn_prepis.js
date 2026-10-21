/* ===== #392: PŘÍPLATKY VSG A SKN Z RUČNĚ PŘEPSANÉ PLOCHY SKLA =====
 * (navazuje na P3 / K19-N105, schváleno J. V. 2. 10. 2026)
 *
 * P3 posunul ruční přepis plochy skla do PRÁCE OPLÁŠTĚNÍ a TMELENÍ;
 * příplatky VSG s mléčnou fólií a SKN 176 zůstaly na geometrii. Ve
 * standardním režimu se teď berou EFEKTIVNÍ plochy: VSG = sklo celkem
 * (přepis řádku skla boků/zad a čelního skla, jinak vypočtená plocha),
 * SKN = sklo boků a zad (přepis, jinak vypočtená plocha).
 *
 * Hlídá se: bez přepisu beze změny (Model 1 i 2), přepis boků / čelního
 * skla / obou, SKN jen u exteriéru a jen z boků, ruční přepis množství
 * příplatku má dál přednost, prázdný přepis nic nemění, režim po stěnách
 * beze změny, značka pro Detail výpočtu jen tam, kde přepis skla platí.
 *
 * Sada nepoužívá skutečné sazby — pracuje se zkušebním ceníkem.
 */
const fs = require('fs');
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));
const zadani = (x) => Object.assign(JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI)), x || {});
const cenik = () => ZC.zkusebniCenik();
const blizko = (a, b) => Math.abs(a - b) < 1e-9;

const spocti = (z, fixes) => eng.vypocet(z, cenik(), JEKLY, fixes !== false);
const radek = (r, nazev) => r.sekce.oplasteni.find(x => x.origNazev === nazev) || null;
const pr = (r, k) => (r.priplatky || []).find(x => x.key === k) || null;
const VSG = 'Sklo VSG s mléčnou fólií', SKN = 'Sklo SKN 176 (Ug=1,1) (EXT)';

for (const [typ, fixes] of [['exteriérová', true], ['exteriérová', false], ['interiérová', true], ['interiérová', false]]) {
  const pop = typ + ', ' + (fixes ? 'Model 2' : 'Model 1');
  const ext = typ === 'exteriérová';
  const z0 = zadani({ typSachty: typ });
  const r0 = spocti(z0, fixes);
  const sv = eng.skloVolba(z0, cenik());
  const boky0 = radek(r0, sv.boky.nazev).mnozstvi, celni0 = radek(r0, sv.celni.nazev).mnozstvi;

  /* 1) bez přepisu beze změny */
  test(pop + ': bez přepisu VSG = sklo celkem z geometrie', blizko(pr(r0, 'vsgFolie').mnozstvi, r0.zaskleni.celkemM2),
    [pr(r0, 'vsgFolie').mnozstvi, r0.zaskleni.celkemM2]);
  test(pop + ': bez přepisu VSG nenese značku', pr(r0, 'vsgFolie').zPrepisuSkla === undefined);
  if (ext) {
    test(pop + ': bez přepisu SKN = sklo boků a zad z geometrie', blizko(pr(r0, 'skn').mnozstvi, r0.zaskleni.bokyZadniM2));
    test(pop + ': bez přepisu SKN nenese značku', pr(r0, 'skn').zPrepisuSkla === undefined);
  } else {
    test(pop + ': interiér: SKN v příplatcích není', !pr(r0, 'skn'));
  }

  /* 2) přepis skla boků */
  const r1 = spocti(zadani({ typSachty: typ, mnozstviPrepis: { [sv.boky.nazev]: 93.2 } }), fixes);
  test(pop + ': přepis boků → VSG = přepsané boky + čelní sklo', blizko(pr(r1, 'vsgFolie').mnozstvi, 93.2 + celni0),
    [pr(r1, 'vsgFolie').mnozstvi, 93.2 + celni0]);
  test(pop + ': … VSG nese značku „z ručně přepsané plochy skla"', pr(r1, 'vsgFolie').zPrepisuSkla === true);
  test(pop + ': … náklad VSG z přepsané plochy', blizko(pr(r1, 'vsgFolie').naklad, (93.2 + celni0) * pr(r1, 'vsgFolie').cena));
  if (ext) {
    test(pop + ': přepis boků → SKN = přepsané boky', blizko(pr(r1, 'skn').mnozstvi, 93.2), pr(r1, 'skn').mnozstvi);
    test(pop + ': … SKN nese značku', pr(r1, 'skn').zPrepisuSkla === true);
  }

  /* 3) přepis čelního skla */
  const r2 = spocti(zadani({ typSachty: typ, mnozstviPrepis: { [sv.celni.nazev]: 4.5 } }), fixes);
  test(pop + ': přepis čelního → VSG = boky + přepsané čelní', blizko(pr(r2, 'vsgFolie').mnozstvi, boky0 + 4.5));
  if (ext) {
    test(pop + ': přepis čelního SKN nemění (SKN jen z boků)', blizko(pr(r2, 'skn').mnozstvi, pr(r0, 'skn').mnozstvi));
    test(pop + ': … SKN bez značky', pr(r2, 'skn').zPrepisuSkla === undefined);
  }

  /* 4) oba přepisy */
  const r3 = spocti(zadani({ typSachty: typ, mnozstviPrepis: { [sv.boky.nazev]: 80, [sv.celni.nazev]: 4.5 } }), fixes);
  test(pop + ': přepis boků i čelního → VSG = 84,5 m²', blizko(pr(r3, 'vsgFolie').mnozstvi, 84.5));

  /* 5) ruční přepis množství příplatku vyhrává */
  const p4 = { [sv.boky.nazev]: 93.2, [VSG]: 10 };
  if (ext) p4[SKN] = 7;
  const r4 = spocti(zadani({ typSachty: typ, mnozstviPrepis: p4 }), fixes);
  test(pop + ': ruční přepis VSG má přednost', pr(r4, 'vsgFolie').mnozstvi === 10 && pr(r4, 'vsgFolie').zPrepisuSkla === undefined, pr(r4, 'vsgFolie'));
  if (ext) test(pop + ': ruční přepis SKN má přednost', pr(r4, 'skn').mnozstvi === 7 && pr(r4, 'skn').zPrepisuSkla === undefined);

  /* 6) prázdný přepis skla nic nemění („prázdno není nula" — v aplikaci platí prepisPlati) */
  global.prepisPlati = (v) => v !== null && v !== undefined && v !== '' && isFinite(+v);
  const r5 = spocti(zadani({ typSachty: typ, mnozstviPrepis: { [sv.boky.nazev]: '' } }), fixes);
  test(pop + ': prázdný přepis skla VSG nemění', blizko(pr(r5, 'vsgFolie').mnozstvi, pr(r0, 'vsgFolie').mnozstvi)
    && pr(r5, 'vsgFolie').zPrepisuSkla === undefined);
  delete global.prepisPlati;

  /* 7) režim po stěnách beze změny (přepis řádku skla se tam do příplatků nepromítá) */
  const poSt = (x) => { const z = zadani(Object.assign({ typSachty: typ }, x)); z.oplasteni = Object.assign({}, z.oplasteni, { rezim: 'poStenach' }); return z; };
  const rs0 = spocti(poSt(), fixes);
  const rs1 = spocti(poSt({ mnozstviPrepis: { [sv.boky.nazev]: 93.2 } }), fixes);
  test(pop + ': po stěnách: přepis skla boků VSG nemění', blizko(pr(rs1, 'vsgFolie').mnozstvi, pr(rs0, 'vsgFolie').mnozstvi)
    && pr(rs1, 'vsgFolie').zPrepisuSkla === undefined, [pr(rs1, 'vsgFolie').mnozstvi, pr(rs0, 'vsgFolie').mnozstvi]);
}

console.log(`\n${ok} OK / ${fail} FAIL`);
if (fail) process.exit(1);
