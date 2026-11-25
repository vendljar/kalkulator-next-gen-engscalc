/* K58-I2 (J. V. 25. 11. 2026, kolo 58) — šachta BEZ opláštění (všechny stěny
 * „bez“, plocha opláštění 0): v sekci Opláštění PLASTOVÉ KOTVY, CESTOVNÍ
 * NÁKLADY a ČIŠTĚNÍ = 0. Jen NOVÁ kalkulace (kalkVerze 2, jako #761 statika
 * opláštění); stará beze změny (kotvy podle zasklení na terče, cestovné
 * a čištění 1). Šachta s opláštěním beze změny i v nové kalkulaci.
 * Zkušební ceník, smyšlená čísla. Pojistka: před opravou mají nová šachta
 * bez opláštění cestovné a čištění 1 → testy 2 padají.
 * Spuštění: node src/test_k58i2_bez_oplasteni.js */
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
nacti('./format.js'); nacti('./cenik.js'); nacti('./engine.js');
const ZC = require('./zkusebni_cenik.js');
const JEKLY = require('./jekly.json');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
const kopie = x => JSON.parse(JSON.stringify(x));
const bez = { odM: 0, pasy: [{ typ: 'bez', doM: null }] };
const BEZ_OPL = { oplasteni: { rezim: 'poStenach', steny: { A: kopie(bez), B: kopie(bez), C: kopie(bez), D: kopie(bez) } },
  nadDvermi: 'stavba', bokyDveri: 'stavba', svetlikNadDvermi: false, svetlikyBoky: 0 };
const ROZ = { sirka: 1.6, hloubka: 2, zdvih: 12, prejezd: 3.3, prohluben: 1.2, nastupiste: 5 };
const zad = (x) => Object.assign(kopie(DEFAULT_ZADANI), ROZ, x || {});
const c = Object.assign(ZC.zkusebniCenik(), { cestovniKc: 9000, cisteniKc: 7000, plastKotvyKc: 3000 });
const radek = (r, n) => (r.sekce.oplasteni || []).find(x => (x.origNazev || x.nazev) === n) || null;
const mn = (r, n) => { const x = radek(r, n); return x ? +x.mnozstvi : null; };
const K = 'PLASTOVÉ KOTVY', CE = 'CESTOVNÍ NÁKLADY', CI = 'ČIŠTĚNÍ';

for (const fixes of [true, false]) {
  const M = fixes ? 'Model 2: ' : 'Model 1: ';
  const nB = vypocet(zad(Object.assign({ kalkVerze: 2, zaskleni: 'na terče' }, BEZ_OPL)), c, JEKLY, fixes);
  test(M + 'nová kalkulace bez opláštění: plocha 0', (+nB.oplasteni.plochaCelkem || 0) === 0, nB.oplasteni.plochaCelkem);
  test(M + 'nová bez opláštění: kotvy, cestovné, čištění = 0', mn(nB, K) === 0 && mn(nB, CE) === 0 && mn(nB, CI) === 0,
    [mn(nB, K), mn(nB, CE), mn(nB, CI)]);
  const sB = vypocet(zad(Object.assign({ zaskleni: 'na terče' }, BEZ_OPL)), c, JEKLY, fixes);
  test(M + 'stará kalkulace bez opláštění beze změny: kotvy podle terčů 1, cestovné 1, čištění 1',
    mn(sB, K) === 1 && mn(sB, CE) === 1 && mn(sB, CI) === 1, [mn(sB, K), mn(sB, CE), mn(sB, CI)]);
  const nS = vypocet(zad({ kalkVerze: 2, zaskleni: 'na terče' }), c, JEKLY, fixes);
  test(M + 'nová kalkulace S opláštěním beze změny (1 / 1 / 1)', nS.oplasteni.plochaCelkem > 0
    && mn(nS, K) === 1 && mn(nS, CE) === 1 && mn(nS, CI) === 1, [mn(nS, K), mn(nS, CE), mn(nS, CI)]);
  const nSbezTercu = vypocet(zad({ kalkVerze: 2 }), c, JEKLY, fixes);
  test(M + 'nová s opláštěním bez terčů: kotvy 0 jako dřív', mn(nSbezTercu, K) === (DEFAULT_ZADANI.zaskleni === 'na terče' ? 1 : 0));
  test(M + 'nová bez opláštění je levnější o cestovné a čištění (sekce Opláštění)',
    nB.souctySekci.oplasteni.naklad < sB.souctySekci.oplasteni.naklad, [nB.souctySekci.oplasteni, sB.souctySekci.oplasteni]);
}
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
