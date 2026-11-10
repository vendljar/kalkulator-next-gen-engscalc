/* VS #570 / E1 (#591) — ROZPOČET ZAOKROUHLENÍ DO ŠACHET (R7, návrh 3.6).
 *
 * rozpocetSachet(T, castky): celé Kč po šachtách, součet = T přesně, BigInt,
 * metoda největšího zbytku (při shodě dražší šachta, pak nižší pořadí).
 *  – 10 000 náhodných sad (pevné semínko): 1–10 šachet, ks 1–20, ceny
 *    0 – 10 mil. Kč, T = CEIL(Σ, 1000) → Σ = T, celé nezáporné koruny,
 *    každá šachta nejvýš o 1 Kč od přesného podílu;
 *  – deterministika (2× stejný vstup = stejný výstup), shodné zbytky;
 *  – krajní případy: 1 šachta, S = 0, T přesně na tisícovce;
 *  – příklad z návrhu: 1 184 350,40 + 2 082 241,50 → 3 267 000 =
 *    1 184 498 + 2 082 502.
 * Pojistka: na 3ff5403 (bez src/vice_sachet.js) sada spadne na require;
 * s rozpočtem „po šachtách Math.round" (bez zbytku) selže součet = T.
 * Spuštění: node src/test_vs_rozpocet.js */
'use strict';
const V = require('./vice_sachet.js');
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 300)); } };
const CEIL = (x, m) => Math.ceil(x / m - 1e-9) * m;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(5701110);

/* příklad z návrhu */
{ const r = V.rozpocetSachet(3267000, [1184350.40, 2082241.50]);
  test('příklad návrhu: 1 184 498 + 2 082 502 = 3 267 000', r[0] === 1184498 && r[1] === 2082502, r); }

/* krajní případy */
test('1 šachta: cena = T', JSON.stringify(V.rozpocetSachet(1215000, [1214321.77])) === '[1215000]');
test('S = 0: všem 0', JSON.stringify(V.rozpocetSachet(0, [0, 0, 0])) === '[0,0,0]');
test('prázdný seznam: []', JSON.stringify(V.rozpocetSachet(1000, [])) === '[]');
{ const r = V.rozpocetSachet(3000, [1000, 1000, 1000]);
  test('T přesně na tisícovce, stejné podíly: 1000 × 3', JSON.stringify(r) === '[1000,1000,1000]', r); }
{ const r = V.rozpocetSachet(1000, [1, 1, 1]);
  test('stejné zbytky: koruna první šachtě (nižší pořadí) → 334 + 333 + 333', JSON.stringify(r) === '[334,333,333]', r); }
{ const r = V.rozpocetSachet(1000, [1, 2, 1]);
  test('dražší šachta dostane větší díl; Σ = 1000', r.reduce((a, b) => a + b, 0) === 1000 && r[1] === 500, r); }
{ const r = V.rozpocetSachet(2, [0.01, 0.03]);
  test('shodný zbytek, různé ceny: koruna dražší šachtě → 0 + 2', JSON.stringify(r) === '[0,2]', r); }
{ const r = V.rozpocetSachet(10, [1, 1, 1]);
  test('zbytek 1 Kč: shodné zbytky → první šachta', JSON.stringify(r) === '[4,3,3]', r); }

/* 10 000 náhodných sad */
let chybaSoucet = 0, chybaTvar = 0, chybaOdchylka = 0, chybaDet = 0;
const prvni = [];
for (let i = 0; i < 10000; i++) {
  const n = 1 + Math.floor(rnd() * 10);
  const castky = Array.from({ length: n }, () => {
    const ks = 1 + Math.floor(rnd() * 20);
    const U = rnd() < 0.05 ? 0 : Math.round(rnd() * 10e6 * 100) / 100 + rnd() / 1000;
    return ks * U;
  });
  const sum = castky.reduce((a, b) => a + b, 0);
  const T = CEIL(sum, 1000);
  const r = V.rozpocetSachet(T, castky);
  const r2 = V.rozpocetSachet(T, castky.slice());
  if (r.reduce((a, b) => a + b, 0) !== T) { chybaSoucet++; if (prvni.length < 3) prvni.push({ T, castky, r }); }
  if (!r.every(x => Number.isInteger(x) && x >= 0) || r.length !== n) chybaTvar++;
  if (sum > 0 && n > 1) {
    const S = castky.reduce((a, c) => a + Math.round(c * 100), 0);
    if (r.some((x, j) => Math.abs(x - T * Math.round(castky[j] * 100) / S) > 1 + 1e-6)) chybaOdchylka++;
  }
  if (JSON.stringify(r) !== JSON.stringify(r2)) chybaDet++;
}
test('10 000 sad: Σ = T přesně', chybaSoucet === 0, prvni);
test('10 000 sad: celé nezáporné koruny, délka = počet šachet', chybaTvar === 0, chybaTvar);
test('10 000 sad: každá šachta nejvýš 1 Kč od přesného podílu', chybaOdchylka === 0, chybaOdchylka);
test('10 000 sad: deterministika', chybaDet === 0, chybaDet);

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
