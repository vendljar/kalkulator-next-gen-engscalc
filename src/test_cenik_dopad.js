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
global.vypocetProj = ep.vypocetProj;
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

/* ---------- 6) projekce se počítá taky ----------
 *
 * `cenikPrepoctiRozpracovane` počítá změněné položky i z ceníku PROJ. Kdyby
 * je součet ignoroval, vyšel by rozdíl před/po na nulu a dialog by
 * obchodníkovi TVRDIL „na celkovou cenu to nemělo vliv", přestože se cena
 * projekce hnula. Falešné ujištění je horší než mlčení (nález nezávislé
 * revize 21. 9. 2026). */
{
  const zak = zakazkaSVariantami(1);
  const v = zak.varianty[0];
  v.data.proj = v.data.proj || {};
  v.data.proj.cenik = ZC.zkusebniCenikProj();
  v.data.proj.zadani = JSON.parse(JSON.stringify(ep.DEFAULT_ZADANI_PROJ));
  /* PŮVODNĚ tu stálo `pred.cena > 0` — to projde i BEZ projekce, protože
   * OCK samo dává statisíce. Prázdná kontrola (nález druhého kola revize
   * 21. 9. 2026). Měří se proto proti téže zakázce bez projekce. */
  const zakBez = zakazkaSVariantami(1);
  zakBez.varianty[0].data.proj = null;             // opravdu bez projekce
  const bezProj = cs.cenikCenaRozpracovanych(zakBez, JEKLY);
  const pred = cs.cenikCenaRozpracovanych(zak, JEKLY);
  const samaProj = ep.vypocetProj(v.data.proj.zadani, v.data.proj.cenik).souhrn.celkem;
  test('projekce se do součtu započítá', pred.chyby === 0
    && Math.abs((pred.cena - bezProj.cena) - samaProj) < 0.01,
    { sProj: pred.cena, bezProj: bezProj.cena, samaProj });

  /* Změní se VÝHRADNĚ ceník projekce — OCK zůstane netknuté. */
  const pc = v.data.proj.cenik;
  const sazby = pc.sazby || {};
  const klic = Object.keys(sazby)[0];
  test('zkušební ceník PROJ má sazby, na kterých jde měřit', !!klic, Object.keys(sazby));
  sazby[klic] = (+sazby[klic] || 0) * 2 + 1;
  const po = cs.cenikCenaRozpracovanych(zak, JEKLY);
  test('změna sazby projekce se v součtu projeví', po.cena > pred.cena,
    { pred: pred.cena, po: po.cena });

  /* Pojistka: kdyby se do součtu dostala projekce dvakrát nebo vůbec,
   * rozdíl by neodpovídal tomu, co spočítá sám `vypocetProj`. */
  const projPred = ep.vypocetProj(JSON.parse(JSON.stringify(ep.DEFAULT_ZADANI_PROJ)), ZC.zkusebniCenikProj()).souhrn.celkem;
  const projPo = ep.vypocetProj(v.data.proj.zadani, pc).souhrn.celkem;
  test('a rozdíl sedí přesně na rozdíl projekce',
    Math.abs((po.cena - pred.cena) - (projPo - projPred)) < 0.01,
    { vSouctu: po.cena - pred.cena, vProjekci: projPo - projPred });
}

/* ---------- 7) počítá se jen strana, která jde do nabídky ----------
 *
 * Zakázka může být jen OCK, jen PROJ, nebo obojí — rozhoduje
 * `zakazkaVedouciStrana`. Do 21. 9. 2026 (druhé kolo nezávislé revize) se
 * projekce přičítala VŽDY, takže každá zakázka „jen OCK" nesla fantomovou
 * cenu projekce z výchozího zadání. Horší než nafouknuté číslo v závorce je
 * ale druhý důsledek: kdyby nová verze ceníku hnula JEN sazbou projektanta,
 * dialog by u čistě ocelářské nabídky hlásil pohyb ceny, který se nestal —
 * a obchodník by podle toho klikl „Vrátit původní ceny". */
{
  const zakOck = zakazkaSVariantami(1);
  const v = zakOck.varianty[0];
  v.data.proj = { cenik: ZC.zkusebniCenikProj(),
                  zadani: JSON.parse(JSON.stringify(ep.DEFAULT_ZADANI_PROJ)) };
  const ockSamo = eng.vypocet(v.data.ock.zadani, v.data.cenik, JEKLY,
    v.data.ock.fixes).souhrn.zakladCena;

  zakOck.jenOck = true;
  test('příprava: zakázka je opravdu vedená jako jen OCK',
    zk.zakazkaVedouciStrana(zakOck) === 'ock' && zk.stranaZamcena(zakOck, 'proj') === true);

  const pred = cs.cenikCenaRozpracovanych(zakOck, JEKLY);
  test('u zakázky „jen OCK" se projekce nepočítá',
    Math.abs(pred.cena - ockSamo) < 0.01, { soucet: pred.cena, ockSamo });

  /* Změní se VÝHRADNĚ ceník projekce. Nabízená cena se nehne — a dopad
   * na cenu tedy musí vyjít na nulu, ne na desítky tisíc. */
  const pc = v.data.proj.cenik, klic = Object.keys(pc.sazby || {})[0];
  test('zkušební ceník PROJ má sazbu, na které jde měřit', !!klic);
  pc.sazby[klic] = (+pc.sazby[klic] || 0) * 2 + 1;
  const po = cs.cenikCenaRozpracovanych(zakOck, JEKLY);
  test('a změna sazby projektanta cenu nabídky „jen OCK" nehne',
    Math.abs(po.cena - pred.cena) < 0.01, { pred: pred.cena, po: po.cena });

  /* POJISTKA PROTI PRÁZDNÉ KONTROLE: táž změna téhož ceníku se u zakázky,
   * která projekci opravdu nabízí, projevit MUSÍ — jinak by kontrola výš
   * vycházela i u funkce, která projekci nepočítá nikdy. */
  const zakObe = zakazkaSVariantami(1);
  const v2 = zakObe.varianty[0];
  v2.data.proj = { cenik: ZC.zkusebniCenikProj(),
                   zadani: JSON.parse(JSON.stringify(ep.DEFAULT_ZADANI_PROJ)) };
  zakObe.obeStrany = true;
  const predObe = cs.cenikCenaRozpracovanych(zakObe, JEKLY);
  v2.data.proj.cenik.sazby[klic] = (+v2.data.proj.cenik.sazby[klic] || 0) * 2 + 1;
  const poObe = cs.cenikCenaRozpracovanych(zakObe, JEKLY);
  test('u zakázky s oběma stranami se táž změna projeví', poObe.cena > predObe.cena,
    { pred: predObe.cena, po: poObe.cena });
}

/* ---------- 8) varianta se započítá celá, nebo vůbec ----------
 *
 * Když spadne výpočet projekce, nesmí v součtu zůstat půlka varianty, která
 * se zároveň hlásí jako chyba. Do 21. 9. 2026 vycházelo u varianty s `proj`
 * bez zadání `{"cena":912000,"pocet":0,"chyby":1}` — cena z varianty, která
 * se „nepočítala". */
{
  const zak = zakazkaSVariantami(1);
  const v = zak.varianty[0];
  const ockSamo = eng.vypocet(v.data.ock.zadani, v.data.cenik, JEKLY,
    v.data.ock.fixes).souhrn.zakladCena;
  v.data.proj = { cenik: null, zadani: null };     // rozpracovaná, ještě nevyplněná
  const r = cs.cenikCenaRozpracovanych(zak, JEKLY);
  test('nevyplněná projekce není chyba', r.chyby === 0, r);
  test('a OCK se započte normálně', Math.abs(r.cena - ockSamo) < 0.01,
    { cena: r.cena, ockSamo });

  /* A když výpočet opravdu spadne, nezůstane v součtu nic. */
  const zak2 = zakazkaSVariantami(1);
  zak2.varianty[0].data.ock.zadani = null;
  const r2 = cs.cenikCenaRozpracovanych(zak2, JEKLY);
  test('rozbitá varianta nepřidá do součtu ani část ceny',
    r2.cena === 0 && r2.pocet === 0 && r2.chyby === 1, r2);
}

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
