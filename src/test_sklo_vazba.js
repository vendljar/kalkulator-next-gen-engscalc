/* ===== SKLO: NÁZEV A SAZBA TÉŽE POLOŽKY · POLOŽKA NESMÍ ZMIZET =====
 * (nález V38 / úkol O9, 3. kolo testů, 14. 9. 2026)
 *
 * Dva nálezy z jednoho kořene.
 *
 * 1) V kalkulaci interiérové šachty se řádek jmenoval „MATERIÁL boční + zadní
 *    stěna (VSG 4.4.2)", ale počítal se sazbou položky VSG 4.4.1. Byla to
 *    záložní větev: prázdnou sazbu 4.4.2 jádro tiše nahradilo sazbou 4.4.1,
 *    aby nabídka nespadla na nulu. Jenže nabídka pak nese cenu jiného skla,
 *    než jaké má v názvu, a nikdo to nepozná. Záloha je pryč — název i sazba
 *    míří na tutéž položku a prázdná sazba se projeví nulou.
 *
 * 2) Proč byla 4.4.2 prázdná: ceník se zveřejňuje z ceníku OTEVŘENÉ VARIANTY.
 *    Zakázka uložená dřív, než položka vznikla, ten klíč vůbec nemá, takže
 *    zveřejněním z ní položka z platného ceníku ZMIZÍ. Mezi verzemi 24 a 25
 *    se to stalo doopravdy a pět dní se interiérové nabídky počítaly bez ní.
 *    J. V.: „nic jsem neodebíral." Chybějící klíče se proto doplňují nulou.
 *
 * Sada schválně nepoužívá skutečné sazby — pracuje se zkušebním ceníkem.
 */
const fs = require('fs');
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');

/* zakazka.js sahá na globály, které v sestavení dodává předchozí soubor —
 * v Node se musí nastavit ručně, stejně jako v test_zakazka.js. */
global.DEFAULT_ZADANI = JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI));
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const engProj = require('./engine_proj.js');
global.DEFAULT_ZADANI_PROJ = JSON.parse(JSON.stringify(engProj.DEFAULT_ZADANI_PROJ));
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
global.DEFAULT_TECHSPEC = (() => { try { return require('./techspec.js').DEFAULT_TECHSPEC; } catch (e) { return {}; } })();
global.cenikDoplnKlice = eng.cenikDoplnKlice;
global.cenikMigraceLeseni = eng.cenikMigraceLeseni;
global.skloMigraceNazvu = eng.skloMigraceNazvu;
const zk = require('./zakazka.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));
const zadani = () => JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI));
const cenik = () => ZC.zkusebniCenik();

/* ---------- 1) název a sazba míří na tutéž položku ---------- */

const vsg442 = (c) => { const x = cenik(); Object.assign(x, c || {}); return x; };

{
  const z = zadani(); z.typSachty = 'interiérová'; z.zaskleni = 'na terče';
  const c = vsg442({ skloVsg442Kc: 777, skloCelniKc: 111 });
  const s = eng.skloVolba(z, c);
  test('interiér na terče: název nese VSG 4.4.2', /VSG 4\.4\.2/.test(s.boky.nazev), s.boky.nazev);
  test('interiér na terče: sazba je ze 4.4.2', s.boky.kc === 777, s.boky.kc);
  test('interiér na terče: cesta míří na C.skloVsg442Kc', s.boky.cesta === 'C.skloVsg442Kc', s.boky.cesta);
  test('interiér na terče: čelní stěna má týž materiál i sazbu',
    s.celni.kc === s.boky.kc && s.celni.cesta === s.boky.cesta);
}

{
  const z = zadani(); z.typSachty = 'interiérová'; z.zaskleni = 'mezi příčníky';
  const c = vsg442({ skloVsg442Kc: 777, skloCelniKc: 111 });
  const s = eng.skloVolba(z, c);
  test('interiér mezi příčníky: název nese VSG 4.4.1', /VSG 4\.4\.1/.test(s.boky.nazev), s.boky.nazev);
  test('interiér mezi příčníky: sazba je ze 4.4.1', s.boky.kc === 111, s.boky.kc);
  test('interiér mezi příčníky: cesta míří na C.skloCelniKc', s.boky.cesta === 'C.skloCelniKc');
}

/* JÁDRO NÁLEZU: prázdná 4.4.2 se NESMÍ tiše nahradit sazbou 4.4.1. */
[null, '', undefined].forEach(prazdno => {
  const z = zadani(); z.typSachty = 'interiérová'; z.zaskleni = 'na terče';
  const c = vsg442({ skloVsg442Kc: prazdno, skloCelniKc: 111 });
  const s = eng.skloVolba(z, c);
  test(`prázdná 4.4.2 (${JSON.stringify(prazdno)}) se nenahradí sazbou 4.4.1`,
    s.boky.kc !== 111, s.boky.kc);
  test(`prázdná 4.4.2 (${JSON.stringify(prazdno)}) nechá název na 4.4.2`,
    /VSG 4\.4\.2/.test(s.boky.nazev), s.boky.nazev);
});

/* Exteriér se nemění: boky dvojsklo z ceníku, čelní stěna VSG 4.4.1. */
{
  const z = zadani(); z.typSachty = 'exteriérová';
  const s = eng.skloVolba(z, vsg442({ skloVsg442Kc: 777, skloCelniKc: 111, skloBokyKc: 222 }));
  test('exteriér: boky berou dvojsklo z C.skloBokyKc', s.boky.cesta === 'C.skloBokyKc' && s.boky.kc === 222);
  test('exteriér: čelní stěna bere VSG 4.4.1', s.celni.cesta === 'C.skloCelniKc' && s.celni.kc === 111);
  test('exteriér: sazbu 4.4.2 vůbec nepoužije', s.boky.kc !== 777 && s.celni.kc !== 777);
}

/* Sazbu řídí TYP ŠACHTY, ne způsob zasklení (V33) — u exteriéru je zasklení
 * na volbu materiálu bez vlivu. */
{
  const a = eng.skloVolba(Object.assign(zadani(), { typSachty: 'exteriérová', zaskleni: 'na terče' }), cenik());
  const b = eng.skloVolba(Object.assign(zadani(), { typSachty: 'exteriérová', zaskleni: 'mezi příčníky' }), cenik());
  test('exteriér: způsob zasklení nemění materiál ani sazbu',
    a.boky.cesta === b.boky.cesta && a.celni.cesta === b.celni.cesta);
}

/* Projev v kalkulaci: řádek, který se jmenuje VSG 4.4.2, musí reagovat na
 * změnu položky VSG 4.4.2 — a ne na změnu 4.4.1. */
{
  const z = zadani();
  z.typSachty = 'interiérová'; z.zaskleni = 'na terče';
  z.sirka = 1.6; z.hloubka = 1.8; z.zdvih = 9; z.prejezd = 3.2; z.prohluben = 1.2; z.nastupiste = 4;
  const najdi = (r) => r.sekce.oplasteni.find(x => /VSG 4\.4\.2/.test(x.nazev));
  const zaklad = najdi(eng.vypocet(z, vsg442({ skloVsg442Kc: 100, skloCelniKc: 100 }), JEKLY, false));
  const zvednuta442 = najdi(eng.vypocet(z, vsg442({ skloVsg442Kc: 200, skloCelniKc: 100 }), JEKLY, false));
  const zvednuta441 = najdi(eng.vypocet(z, vsg442({ skloVsg442Kc: 100, skloCelniKc: 200 }), JEKLY, false));
  test('řádek VSG 4.4.2 v kalkulaci existuje', !!zaklad, zaklad && zaklad.nazev);
  test('zdvojnásobení sazby 4.4.2 zdvojnásobí náklad řádku',
    zaklad && zvednuta442 && Math.abs(zvednuta442.naklad - 2 * zaklad.naklad) < 1e-6,
    [zaklad && zaklad.naklad, zvednuta442 && zvednuta442.naklad]);
  test('změna sazby 4.4.1 s řádkem VSG 4.4.2 nehne',
    zaklad && zvednuta441 && Math.abs(zvednuta441.naklad - zaklad.naklad) < 1e-6,
    [zaklad && zaklad.naklad, zvednuta441 && zvednuta441.naklad]);
}

/* ---------- 2) chybějící klíč ceníku se doplní, položka nezmizí ---------- */

{
  const stary = cenik();
  delete stary.skloVsg442Kc;                 // ceník uložený před 9. 9. 2026
  test('výchozí stav: starý ceník klíč opravdu nemá',
    !Object.prototype.hasOwnProperty.call(stary, 'skloVsg442Kc'));

  const doplneno = eng.cenikDoplnKlice(stary, eng.DEFAULT_CENIK);
  test('doplnění klíče se počítá a je nenulové', doplneno >= 1, doplneno);
  test('klíč skloVsg442Kc po doplnění existuje',
    Object.prototype.hasOwnProperty.call(stary, 'skloVsg442Kc'));
  test('doplněný klíč je nula, ne vymyšlená cena', stary.skloVsg442Kc === 0, stary.skloVsg442Kc);
}

{
  /* Vyplněnou hodnotu doplnění NEPŘEPÍŠE — jinak by zveřejnění ceník vynulovalo. */
  const c = cenik(); c.skloVsg442Kc = 1234;
  eng.cenikDoplnKlice(c, eng.DEFAULT_CENIK);
  test('vyplněná sazba zůstane beze změny', c.skloVsg442Kc === 1234, c.skloVsg442Kc);
}

{
  /* Vnořené objekty (příplatky, lakování) se procházejí taky. */
  const c = cenik();
  const klicPriplatku = Object.keys(eng.DEFAULT_CENIK.priplatky || {})[0];
  if (klicPriplatku) {
    delete c.priplatky[klicPriplatku];
    eng.cenikDoplnKlice(c, eng.DEFAULT_CENIK);
    test('chybějící příplatek se doplní i ve vnořeném objektu',
      Object.prototype.hasOwnProperty.call(c.priplatky, klicPriplatku));
  } else {
    test('chybějící příplatek se doplní i ve vnořeném objektu', true, 'DEFAULT_CENIK bez příplatků');
  }
  const bezPriplatku = cenik(); delete bezPriplatku.priplatky;
  eng.cenikDoplnKlice(bezPriplatku, eng.DEFAULT_CENIK);
  test('chybí-li celý vnořený objekt, vznikne', !!bezPriplatku.priplatky);
}

test('doplnění snese prázdné vstupy', eng.cenikDoplnKlice(null, eng.DEFAULT_CENIK) === 0
  && eng.cenikDoplnKlice({}, null) === 0);

/* Doplnění nesmí hnout s cenou: chybějící klíč se ve výpočtu chová jako nula,
 * takže po doplnění musí vyjít totéž. */
{
  const z = zadani();
  z.sirka = 1.5; z.hloubka = 1.52; z.zdvih = 14.752; z.prejezd = 3.6; z.prohluben = 2.45; z.nastupiste = 5;
  const bez = cenik(); delete bez.skloVsg442Kc;
  const sKlicem = JSON.parse(JSON.stringify(bez));
  eng.cenikDoplnKlice(sKlicem, eng.DEFAULT_CENIK);
  const a = eng.vypocet(z, bez, JEKLY, false).souhrn.zakladCena;
  const b = eng.vypocet(z, sKlicem, JEKLY, false).souhrn.zakladCena;
  test('doplnění chybějících klíčů nezmění cenu exteriérové zakázky', a === b, [a, b]);
}

/* Otevření starší zakázky klíč doplní — právě odtud se ceník zveřejňuje. */
{
  const zak = zk.novaZakazka();
  const d = zak.varianty[0].data;
  delete d.cenik.skloVsg442Kc;
  zk.importZakazka(zak);
  test('importZakazka doplní chybějící klíč ceníku',
    Object.prototype.hasOwnProperty.call(zak.varianty[0].data.cenik, 'skloVsg442Kc'));
}

/* Kontext pro zveřejnění doplňuje klíče v KOPII (hlídá se na zdroji — funkce
 * sedí v ui/program_ui.js, které v Node nejde načíst). */
{
  const ui = fs.readFileSync(__dirname + '/ui/program_ui.js', 'utf8');
  test('progKontext doplňuje klíče ceníku před zveřejněním', /cenikDoplnKlice/.test(ui));
  test('progKontext pracuje s kopií, ne s ceníkem varianty',
    /JSON\.parse\(JSON\.stringify\(o \|\| \{\}\)\)/.test(ui));
}

/* Poznámka v ceníku musí říkat totéž co kód (V33): rozhoduje typ šachty. */
{
  const cen = fs.readFileSync(__dirname + '/cenik.js', 'utf8');
  const radek442 = (cen.match(/'C\.skloVsg442Kc'.*/) || [''])[0];
  const radek441 = (cen.match(/'C\.skloCelniKc'.*/) || [''])[0];
  test('poznámka u 4.4.2 mluví o interiérové šachtě', /interiérová/.test(radek442), radek442);
  test('poznámka u 4.4.2 varuje, že prázdná sazba dá nulu', /nula/.test(radek442), radek442);
  test('poznámka u 4.4.1 rozlišuje exteriér a interiér',
    /exteriérová/.test(radek441) && /interiérová/.test(radek441), radek441);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
