/* ===== K20-N1: ROZPRACOVANÁ VARIANTA PROJ S PŘEDVOLBOU „ZÁLOHA" BEZ PROCENTA =====
 * (20. kolo testů 2. 10. 2026; rozhodovací list 6. 10. 2026, bod 1)
 *
 * Do #383 byla výchozí záloha 50 %. Varianta, u které obchodník zvolil
 * předvolbu „Záloha + zbytek po předání" a procento nezměnil, má uložené
 * jen `predvolba: 'zaloha'` bez `zaloha`. Po #383 se taková varianta řídí
 * AKTUÁLNÍM firemním procentem (dnes 70/30) — stejně jako rozhodnutí J. V.
 * k #383 „výchozí plán platí i pro rozpracované zakázky … jako každá změna
 * firemního plánu". Vědomé chování, kód beze změny; sada ho drží, aby se
 * nezměnilo potichu.
 *
 * Hlídá se: rozpracovaná varianta → 70/30 v řádcích činnosti, popisu
 * předvolby, efektivní záloze i dopočtu SoD PROJ; ručně zvolené procento
 * (i 50) platí dál; zamčená varianta (snímek plánu) se nemění; vlastní
 * firemní plán s jiným procentem má přednost před výchozím z kódu.
 *
 * Pojistka proti prázdnému testu: s mutací jádra „K20-N1: záloha bez
 * procenta zůstane na 50 %" (mutace_jadro.mjs) sada hlásí 11 prošlo,
 * 4 selhalo; bez mutace 15 prošlo, 0 selhalo.
 *
 * Spuštění: cd src && node test_plan_plateb_k20n1.js */
const PP = require('./plan_plateb.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

const V = PP.PLAN_PROJ_VYCHOZI;
const predaniDps = V.predani.dps;

/* 0) výchozí z kódu: Záloha 70 % */
test('výchozí z kódu: předvolba Záloha', V.vychozi === 'zaloha', V.vychozi);
test('výchozí z kódu: záloha 70 %', +V.zalohaPct === 70, V.zalohaPct);

/* 1) rozpracovaná varianta: předvolba Záloha bez uloženého procenta */
const rozpr = { predvolba: 'zaloha' };
const radky = PP.planRadkyCinnosti('dps', rozpr, null);
test('rozpracovaná „Záloha" bez procenta: 70 % po podpisu', radky.length === 2 && radky[0].p === 70 && radky[0].m === 'podpis', radky);
test('… a 30 % po předání činnosti', radky[1] && radky[1].p === 30 && radky[1].m === predaniDps, radky);
test('… efektivní záloha 70', PP.planZalohaEf(rozpr, null) === 70, PP.planZalohaEf(rozpr, null));
test('… popis předvolby „Záloha 70 % + zbytek po předání"',
  PP.planPopisPredvolby(rozpr, null) === 'Záloha 70 % + zbytek po předání', PP.planPopisPredvolby(rozpr, null));

/* 2) dopočet SoD PROJ jde za týmž procentem */
const ceny = { dps: 100000, ic: 50000 };
const d = PP.planPlatebDopocet(ceny, rozpr, null);
const podpis = d.platby.find(p => p.klic === 'podpis');
test('SoD PROJ: platba po podpisu = 70 % ceny díla', podpis && podpis.castka === 105000, podpis);
test('SoD PROJ: součet plateb = cena díla', d.sedi && d.soucet === 150000, [d.soucet, d.cena]);

/* 3) ručně zvolené procento platí dál (i dřívějších 50 %) */
for (const z of [50, 30]) {
  const pl = { predvolba: 'zaloha', zaloha: z };
  const r = PP.planRadkyCinnosti('dps', pl, null);
  test(`uložené procento ${z} % platí dál`, r[0].p === z && r[1].p === 100 - z, r);
  test(`… popis „Záloha ${z} %"`, PP.planPopisPredvolby(pl, null) === `Záloha ${z} % + zbytek po předání`);
}

/* 4) zamčená varianta: snímek plánu nese řádky i procento — změna výchozího ji nemění */
const snimek = PP.planPlatebSnimek({ predvolba: 'zaloha', zaloha: 50 }, null, ceny);
test('snímek zamčené varianty nese zálohu 50', snimek.zaloha === 50, snimek.zaloha);
const rz = PP.planRadkyCinnosti('dps', snimek, null);
test('zamčená varianta zůstává 50/50', rz[0].p === 50 && rz[1].p === 50, rz);

/* 5) vlastní firemní plán s jiným procentem má přednost před výchozím z kódu */
const F = Object.assign({}, V, { zalohaPct: 40 });
const rf = PP.planRadkyCinnosti('dps', rozpr, F);
test('firemní plán se zálohou 40 %: rozpracovaná varianta 40/60', rf[0].p === 40 && rf[1].p === 60, rf);

console.log(`\n${ok} prošlo, ${fail} selhalo`);
if (fail) process.exit(1);
