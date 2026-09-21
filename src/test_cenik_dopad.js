/* ===== DOPAD PŘEPOČTU NA CENU =====
 * (#284, nálezy N7 a N22 kola 6)
 *
 * Do 21. 9. 2026 se rozpracovaná zakázka po otevření přepočítala na platný
 * ceník a do lišty se napsalo, KOLIK cen se změnilo. Nikde ale nestálo,
 * O KOLIK SE HNULA CENA — a to je jediné číslo, které obchodníka zajímá:
 * „12 změněných položek" může znamenat stokorunu i sto tisíc.
 *
 * `cenikCenaRozpracovanych` sečte základní cenu nezamčených variant, takže
 * se dá změřit stav před přepočtem a po něm. Zamčené se vynechávají: ty se
 * nepřepočítávají, takže by do rozdílu jen přidaly šum.
 *
 * ŽÁDNÉ CENY Z OSTRÉHO CENÍKU — počítá se nad zkušebním.
 */
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
global.vypocet = eng.vypocet; global.DEFAULT_ZADANI = eng.DEFAULT_ZADANI;
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const ep = require('./engine_proj.js');
global.DEFAULT_ZADANI_PROJ = ep.DEFAULT_ZADANI_PROJ; global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const tsm = require('./techspec.js');
global.TECHSPEC_DEF = tsm.TECHSPEC_DEF; global.DEFAULT_TECHSPEC = tsm.DEFAULT_TECHSPEC;
const zk = require('./zakazka.js'); Object.keys(zk).forEach(k => { global[k] = zk[k]; });
const zam = require('./zamek.js'); Object.keys(zam).forEach(k => { global[k] = zam[k]; });
const cs = require('./cenik_stari.js'); Object.keys(cs).forEach(k => { global[k] = cs[k]; });
const fs = require('fs');
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

function zakazkaSVariantami(pocet) {
  const zak = zk.novaZakazka();
  const vzor = zak.varianty[0];
  vzor.data.cenik = ZC.zkusebniCenik();
  const Z = vzor.data.ock.zadani;
  Z.typSachty = 'exteriérová';
  Z.sirka = 1.6; Z.hloubka = 1.4; Z.zdvih = 9; Z.prejezd = 3.5; Z.prohluben = 1.1; Z.nastupiste = 4;
  for (let i = 1; i < pocet; i++) {
    const kop = JSON.parse(JSON.stringify(vzor));
    kop.id = 'v' + i;
    zak.varianty.push(kop);
  }
  return zak;
}

/* ---------- 1) součet přes nezamčené varianty ---------- */
{
  const jedna = cs.cenikCenaRozpracovanych(zakazkaSVariantami(1), JEKLY);
  const dve = cs.cenikCenaRozpracovanych(zakazkaSVariantami(2), JEKLY);
  test('jedna varianta = jedna započtená', jedna.pocet === 1, jedna);
  test('dvě varianty = dvě započtené', dve.pocet === 2, dve);
  test('cena je kladná', jedna.cena > 0, jedna.cena);
  test('dvě stejné varianty dají dvojnásobek',
    Math.abs(dve.cena - 2 * jedna.cena) < 0.01, { jedna: jedna.cena, dve: dve.cena });
  test('nic se nepokazilo', jedna.chyby === 0 && dve.chyby === 0, { jedna, dve });
}

/* ---------- 2) zamčená varianta se do součtu nepočítá ----------
 *
 * Zamčená (odeslaná) nabídka se nepřepočítává, takže by do rozdílu před/po
 * přidala jen šum — a hlavně by rozdíl ředila: kdyby se v zakázce se třemi
 * odeslanými a jednou rozpracovanou variantou změnila cena té rozpracované
 * o 10 %, ve společném součtu by to vypadalo na 2,5 %. */
{
  const zak = zakazkaSVariantami(2);
  const pred = cs.cenikCenaRozpracovanych(zak, JEKLY);
  /* Zamknutí tak, jak ho dělá aplikace (`zamkniVariantu`, ne ruční příznak —
   * zámek pozná `zamekInfo` podle `v.zamek.zamceno`). */
  zam.zamkniVariantu(zak.varianty[1], { typ: 'nabidka' });
  test('varianta je opravdu zamčená', zam.variantaUzamcena(zak.varianty[1]) === true,
    JSON.stringify(zak.varianty[1].zamek || null).slice(0, 80));
  const po = cs.cenikCenaRozpracovanych(zak, JEKLY);
  test('po zamčení jedné varianty se počítá jen ta druhá',
    po.pocet === pred.pocet - 1, { pred: pred.pocet, po: po.pocet });
  test('a cena klesne právě o tu zamčenou',
    Math.abs(po.cena - pred.cena / 2) < 0.01, { pred: pred.cena, po: po.cena });
}

/* ---------- 3) varianta, která se nespočítá, se hlásí ----------
 *
 * Tvrdit o ní nulu by znamenalo vykázat pokles ceny, který se nestal. */
{
  const zak = zakazkaSVariantami(2);
  zak.varianty[1].data.ock.zadani = null;      // rozbité zadání
  const r = cs.cenikCenaRozpracovanych(zak, JEKLY);
  test('rozbitá varianta se do součtu nepočítá', r.pocet === 1, r);
  test('a je vidět v chybách', r.chyby === 1, r);
}

/* ---------- 4) odolnost ---------- */
{
  test('bez zakázky vrátí null', cs.cenikCenaRozpracovanych(null, JEKLY) === null);
  test('zakázka bez variant dá nulu a nespadne',
    JSON.stringify(cs.cenikCenaRozpracovanych({ varianty: [] }, JEKLY)) === '{"cena":0,"pocet":0,"chyby":0}',
    cs.cenikCenaRozpracovanych({ varianty: [] }, JEKLY));
}

/* ---------- 5) změna ceníku se v součtu opravdu projeví ----------
 *
 * POJISTKA PROTI PRÁZDNÉMU TESTU: kdyby funkce vracela pořád totéž číslo,
 * kontroly výš by vycházely taky — a dialog by hlásil „na cenu to nemělo
 * vliv" u zakázky, které cena vyskočila. */
{
  const zak = zakazkaSVariantami(1);
  const pred = cs.cenikCenaRozpracovanych(zak, JEKLY);
  const c = zak.varianty[0].data.cenik;
  /* Sazba montáže je v každé zakázce; zdvojnásobení se musí projevit. */
  c.montazHodKc = (+c.montazHodKc || 0) * 2 + 1;
  const po = cs.cenikCenaRozpracovanych(zak, JEKLY);
  test('zdražení položky ceníku zvedne i součet', po.cena > pred.cena,
    { pred: pred.cena, po: po.cena });
}

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
