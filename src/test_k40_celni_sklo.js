/* ===== K40-N1: VYŘAZENÉ ČELNÍ SKLO PO ZMĚNĚ ZASKLENÍ NEBO TYPU ŠACHTY =====
 * (dávka K40a, roadmapa #579, 11. 11. 2026)
 *
 * Řádek čelního skla se jmenuje „MATERIÁL VSG 4.4.1" (exteriér, interiér mezi
 * příčníky) nebo „MATERIÁL VSG 4.4.2" (interiér na terče). Vyřazení a ruční
 * přepisy se klíčují názvem, a migrace skla (K37-N1) poznala jen boky — po
 * změně zasklení nebo typu se vyřazené čelní sklo znovu počítalo.
 *
 * Oprava podle posudku K40 (rozhodnutí J. V. 1a, 2a): přejmenovat JEN při
 * skutečném přepnutí (`set('Z.typSachty' | 'Z.zaskleni')` zná název před
 * změnou, `skloMigraceNazvu(d, { predCelni, zadani })`). Import a otevření
 * zakázky staré osiřelé záznamy nechávají být (cena uložené nabídky se
 * nemění). Nový nález posudku: migrace skla jen nad šachtou 1 — u šachet 2+
 * se vracela vada K37-N1 (boky i čelní sklo).
 *
 * Sada volá SKUTEČNÉ `set` a `skloMigraceAkt` (ui/common.js) vyříznuté ze
 * zdrojáku ve vm s náhražkami ostatního UI.
 *
 * POJISTKA: nad c664c9e sada selže (čelní sklo zůstane pod starým názvem,
 * šachta 2 se nemigruje); hlídají ji mutace „[K40a] N1" v mutace_jadro.mjs.
 */
const fs = require('fs');
const vm = require('vm');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
const eng = nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
global.DEFAULT_TECHSPEC = require('./techspec.js').DEFAULT_TECHSPEC;
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
const vs = nacti('./vice_sachet.js');
const zk = nacti('./zakazka.js');
const zm = nacti('./zamek.js');
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};

function vyrizni(soubor, jmeno) {
  const t = fs.readFileSync(__dirname + '/' + soubor, 'utf8');
  const i = t.indexOf('function ' + jmeno + '(');
  if (i < 0) return '';
  let h = 0, j = t.indexOf('{', i);
  for (; j < t.length; j++) {
    if (t[j] === '{') h++;
    else if (t[j] === '}' && --h === 0) break;
  }
  return t.slice(i, j + 1);
}
const fSet = vyrizni('ui/common.js', 'set');
const fMigrace = vyrizni('ui/common.js', 'skloMigraceAkt');
test('set je v ui/common.js', !!fSet);
test('skloMigraceAkt je v ui/common.js', !!fMigrace);

const kopie = x => JSON.parse(JSON.stringify(x));
const VSG1 = 'MATERIÁL VSG 4.4.1', VSG2 = 'MATERIÁL VSG 4.4.2';

function zakazka(typ, zaskleni) {
  const zak = zk.novaZakazka();
  const v = zk.aktivniVarianta(zak);
  const Z = v.data.ock.zadani;
  /* Interiér 1,6 × 1,8 m, zdvih 15 + přejezd 2, 5 nástupišť (reprodukce v1). */
  Object.assign(Z, { prejezd: 2, zdvih: 15, prohluben: 1.05, sirka: 1.6, hloubka: 1.8, roztec: 1.25, nastupiste: 5 });
  Z.typSachty = typ; Z.zaskleni = zaskleni;
  /* Světlík nad dveřmi se sklem — jinak má čelní sklo nulovou plochu a test nic neověří. */
  Z.nadDvermi = 'sklo';
  Z.profily = kopie(eng.PROFILY_VYCHOZI[typ]);
  /* Skla jsou příplatky mimo výchozí nabídku — do ceny vstupují jako řádky. */
  return { zak, v, Z };
}
const cena = (v) => JSON.stringify(vs.vypocetOckDat(v.data, JEKLY).souhrn);
const radekCelni = (v, z) => {
  const r = eng.vypocet(z || v.data.ock.zadani, v.data.cenik, JEKLY, v.data.ock.fixes);
  const vse = [];
  JSON.stringify(r, (k, x) => { if (x && typeof x === 'object' && typeof x.origNazev === 'string' && /^MATERIÁL VSG/.test(x.origNazev)) vse.push(x); return x; });
  return vse;
};

/* Skutečný `set` z ui/common.js nad danou variantou a otevřeným zadáním Z. */
function setUI(zak, v, Z, cesta, hodnota, zamcena) {
  const ctx = {
    ZAK: zak, Z, C: v.data.cenik, OCK: v.data.ock, JSON, String, Object, Array, Date,
    aktivniVarianta: zk.aktivniVarianta, skloMigraceNazvu: eng.skloMigraceNazvu, skloVolba: eng.skloVolba,
    variantaUzamcena: () => !!zamcena, cestaBezpecna: () => true, hodinyZaporneOdmitni: () => false,
    zamekStop: () => !!zamcena, render: () => {},
  };
  ctx.rootObj = () => ({ Z: ctx.Z, C: ctx.C, OCK: ctx.OCK });
  vm.createContext(ctx);
  vm.runInContext(fMigrace + '\n' + fSet + '\n set(' + JSON.stringify(cesta) + ', ' + JSON.stringify(hodnota) + ');', ctx);
}

/* 1) Přepnutí zasklení a typu: vyřazení i přepisy čelního skla přejdou. */
function pripad(popis, odkud, kam) {
  const { zak, v, Z } = zakazka(odkud[0], odkud[1]);
  const pred = eng.skloVolba(Z, v.data.cenik).celni.nazev;
  const cenaBez = cena(v);
  Z.nepocitat = [pred];
  Z.mnozstviPrepis = { [pred]: 7 };
  Z.nazvyPrepis = { [pred]: 'Vlastní název čelního skla' };
  const cenaVyr = cena(v);
  test(popis + ': vyřazení čelního skla mění cenu (porovnání má smysl)', cenaVyr !== cenaBez);
  const puvodni = kopie(Z);
  if (odkud[0] !== kam[0]) setUI(zak, v, Z, 'Z.typSachty', kam[0]);
  if (odkud[1] !== kam[1]) setUI(zak, v, Z, 'Z.zaskleni', kam[1]);
  const novy = eng.skloVolba(Z, v.data.cenik).celni.nazev;
  test(popis + ': název čelního skla se změnil', novy !== pred, [pred, novy]);
  test(popis + ': čelní sklo zůstalo vyřazené pod novým názvem', Z.nepocitat.length === 1 && Z.nepocitat[0] === novy, Z.nepocitat);
  test(popis + ': přepis množství přešel', Z.mnozstviPrepis[novy] === 7 && !(pred in Z.mnozstviPrepis), Z.mnozstviPrepis);
  test(popis + ': vlastní název přešel (2a)', Z.nazvyPrepis[novy] === 'Vlastní název čelního skla', Z.nazvyPrepis);
  const bezVyr = kopie(v.data.ock.zadani); bezVyr.nepocitat = [];
  const radky = radekCelni(v, bezVyr).filter(r => r.origNazev === novy);
  test(popis + ': čelní sklo má v cílovém stavu nenulovou plochu', radky.some(r => r.mnozstviAuto > 0), radky);
  const sirotek = kopie(v); sirotek.data.ock.zadani.nepocitat = [pred];
  test(popis + ': cena je nižší než se sirotkem (sklo se nepočítá)',
    vs.vypocetOckDat(v.data, JEKLY).souhrn.zakladCena < vs.vypocetOckDat(sirotek.data, JEKLY).souhrn.zakladCena);
  /* kulatá cesta export → importZakazka nesmí nic změnit */
  const kulata = zk.importZakazka(kopie(zak));
  test(popis + ': po importu stejné vyřazení i cena', JSON.stringify(zk.aktivniVarianta(kulata).data.ock.zadani.nepocitat) === JSON.stringify(Z.nepocitat)
    && cena(zk.aktivniVarianta(kulata)) === cena(v));
  /* a zpět */
  if (odkud[1] !== kam[1]) setUI(zak, v, Z, 'Z.zaskleni', odkud[1]);
  if (odkud[0] !== kam[0]) setUI(zak, v, Z, 'Z.typSachty', odkud[0]);
  test(popis + ': tam a zpět — cena se vrátí', cena(v) === cenaVyr);
  test(popis + ': tam a zpět — vyřazení a přepisy se vrátí',
    JSON.stringify([Z.nepocitat, Z.mnozstviPrepis, Z.nazvyPrepis]) === JSON.stringify([puvodni.nepocitat, puvodni.mnozstviPrepis, puvodni.nazvyPrepis]),
    [Z.nepocitat, Z.mnozstviPrepis]);
}
pripad('int terče → int mezi příčníky', ['interiérová', 'na terče'], ['interiérová', 'mezi příčníky']);
pripad('int terče → ext', ['interiérová', 'na terče'], ['exteriérová', 'na terče']);
pripad('ext → int terče', ['exteriérová', 'na terče'], ['interiérová', 'na terče']);

/* 2) Uložená zakázka se sirotkem: import ani syncVarianta (migrace bez opts) nic nemění. */
{
  const { zak, v, Z } = zakazka('interiérová', 'mezi příčníky');
  Z.nepocitat = [VSG2];
  const cenaPred = cena(v), dataPred = JSON.stringify(Z);
  const imp = zk.importZakazka(kopie(zak));
  const vi = zk.aktivniVarianta(imp);
  test('sirotek: po importZakazka beze změny dat', JSON.stringify(vi.data.ock.zadani.nepocitat) === JSON.stringify([VSG2]), vi.data.ock.zadani.nepocitat);
  test('sirotek: po importZakazka beze změny ceny', cena(vi) === cenaPred);
  const ctx = { ZAK: zak, aktivniVarianta: zk.aktivniVarianta, skloMigraceNazvu: eng.skloMigraceNazvu, variantaUzamcena: () => false };
  vm.createContext(ctx);
  const n = vm.runInContext(fMigrace + '\n skloMigraceAkt();', ctx);
  test('sirotek: skloMigraceAkt (syncVarianta) nic nemění', n === 0 && JSON.stringify(Z) === dataPred && cena(v) === cenaPred);
  test('sirotek: skloMigraceNazvu bez opts nic nemění', eng.skloMigraceNazvu(v.data) === 0);
}

/* 3) Zamčená varianta se sirotkem: import nezmění nepocitat, ověření zámku = shoda. */
{
  const { zak, v, Z } = zakazka('interiérová', 'mezi příčníky');
  Z.nepocitat = [VSG2];
  zm.zamkniVariantu(v, { typ: 'nabidka', cislo: zm.variantaCislo(zak, v),
    vysledek: kopie(zm.zamekVysledekSpocti(v, JEKLY, 'k40')) });
  const imp = zk.importZakazka(kopie(zak));
  const vi = zk.aktivniVarianta(imp);
  test('zamčená se sirotkem: import nezmění nepocitat', JSON.stringify(vi.data.ock.zadani.nepocitat) === JSON.stringify([VSG2]), vi.data.ock.zadani.nepocitat);
  const ov = zm.zamekOvereni(vi, JEKLY, 'k40');
  test('zamčená se sirotkem: ověření zámku po importu = shoda', ov && ov.stav === 'shoda', ov);
  /* set nad zamčenou variantou nic nezmění (zámek ho zastaví dřív) */
  setUI(zak, v, Z, 'Z.zaskleni', 'na terče', true);
  test('zamčená: set zasklení se neuplatní a nepocitat zůstane', Z.zaskleni === 'mezi příčníky' && Z.nepocitat[0] === VSG2);
}

/* 4) Duplicita: cílový název už ve vyřazených je → jen jeden záznam. */
{
  const { zak, v, Z } = zakazka('interiérová', 'na terče');
  Z.nepocitat = [VSG2, VSG1];
  Z.mnozstviPrepis = { [VSG2]: 3, [VSG1]: 9 };
  setUI(zak, v, Z, 'Z.zaskleni', 'mezi příčníky');
  test('duplicita: v nepocitat jen jeden záznam nového názvu', JSON.stringify(Z.nepocitat) === JSON.stringify([VSG1]), Z.nepocitat);
  test('duplicita: existující cílový klíč přepisu má přednost', Z.mnozstviPrepis[VSG1] === 9 && !(VSG2 in Z.mnozstviPrepis), Z.mnozstviPrepis);
}

/* 5) Beze změny zasklení (stejná hodnota) se nic nepřejmenuje. */
{
  const { zak, v, Z } = zakazka('interiérová', 'na terče');
  Z.nepocitat = [VSG1];
  setUI(zak, v, Z, 'Z.zaskleni', 'na terče');
  test('stejná hodnota zasklení: nic se nepřejmenuje', JSON.stringify(Z.nepocitat) === JSON.stringify([VSG1]));
}

/* 6) Víc šachet: šachta 2 boky i čelní sklo; šachta 1 se nemění. */
function viceSachet(popis, odkud, cesta, hodnota) {
  const { zak, v, Z } = zakazka('interiérová', 'na terče');
  const z2 = kopie(Z);
  z2.typSachty = odkud[0]; z2.zaskleni = odkud[1];
  z2.profily = kopie(eng.PROFILY_VYCHOZI[odkud[0]]);
  v.data.ock.dalsi = [{ id: 's2', nazev: 'Výtah B', ks: 1, zadani: z2 }];
  const sv = eng.skloVolba(z2, v.data.cenik);
  z2.nepocitat = [sv.boky.nazev, sv.celni.nazev];
  z2.mnozstviPrepis = { [sv.boky.nazev]: 4 };
  Z.nepocitat = [eng.skloVolba(Z, v.data.cenik).celni.nazev];
  const s1Pred = JSON.stringify(Z);
  const cenaPred = cena(v);
  setUI(zak, v, z2, cesta, hodnota);
  const nv = eng.skloVolba(z2, v.data.cenik);
  test(popis + ': boky šachty 2 zůstaly vyřazené pod novým názvem', z2.nepocitat.includes(nv.boky.nazev)
    && (sv.boky.nazev === nv.boky.nazev || !z2.nepocitat.includes(sv.boky.nazev)), z2.nepocitat);
  test(popis + ': přepis boků šachty 2 přešel', z2.mnozstviPrepis[nv.boky.nazev] === 4, z2.mnozstviPrepis);
  test(popis + ': čelní sklo šachty 2 zůstalo vyřazené pod novým názvem', z2.nepocitat.includes(nv.celni.nazev), z2.nepocitat);
  test(popis + ': šachta 1 beze změny', JSON.stringify(Z) === s1Pred);
  /* zpět → cena zakázky se vrátí */
  setUI(zak, v, z2, cesta, cesta === 'Z.typSachty' ? odkud[0] : odkud[1]);
  test(popis + ': tam a zpět — cena zakázky se vrátí', cena(v) === cenaPred);
  /* import po přepnutí nic nezmění */
  setUI(zak, v, z2, cesta, hodnota);
  const c2 = cena(v);
  test(popis + ': po importu stejná cena', cena(zk.aktivniVarianta(zk.importZakazka(kopie(zak)))) === c2);
}
viceSachet('šachta 2 int → ext', ['interiérová', 'na terče'], 'Z.typSachty', 'exteriérová');
viceSachet('šachta 2 ext → int', ['exteriérová', 'na terče'], 'Z.typSachty', 'interiérová');
viceSachet('šachta 2 terče → mezi příčníky', ['interiérová', 'na terče'], 'Z.zaskleni', 'mezi příčníky');
viceSachet('šachta 2 mezi příčníky → terče', ['interiérová', 'mezi příčníky'], 'Z.zaskleni', 'na terče');

/* 7) Reprodukce z posudku: šachta 2 interiér → exteriér, migrace bez opts
 * (otevření / import) přemapuje boky i u šachty 2. */
{
  const { v, Z } = zakazka('interiérová', 'na terče');
  const z2 = kopie(Z);
  v.data.ock.dalsi = [{ id: 's2', nazev: '', ks: 1, zadani: z2 }];
  z2.nepocitat = [eng.skloVolba(z2, v.data.cenik).boky.nazev];
  z2.typSachty = 'exteriérová';
  const n = eng.skloMigraceNazvu(v.data);
  test('posudek: migrace boků nad šachtou 2 (> 0 změn)', n > 0 && z2.nepocitat[0] === eng.skloVolba(z2, v.data.cenik).boky.nazev, [n, z2.nepocitat]);
}

/* 7b) Revize K40a D1: ZAMČENÁ varianta s víc šachtami a sirotkem boků
 * u šachty 2 — import nesmí přemapovat (cena odeslané nabídky, ověření
 * zámku = shoda). Nezamčená táž zakázka migruje (jako šachta 1 od K37).
 * POJISTKA: na ed98942 (K40a před revizí) import přemapuje a zámek nesouhlasí. */
function sirotekSachta2() {
  const { zak, v, Z } = zakazka('interiérová', 'na terče');
  const z2 = kopie(Z);
  v.data.ock.dalsi = [{ id: 's2', nazev: 'Výtah B', ks: 1, zadani: z2 }];
  const sirotek = eng.skloVolba(z2, v.data.cenik).boky.nazev;
  z2.typSachty = 'exteriérová';
  z2.profily = kopie(eng.PROFILY_VYCHOZI['exteriérová']);
  z2.nepocitat = [sirotek];
  test('D1: sirotek boků šachty 2 je opravdu sirotek', sirotek !== eng.skloVolba(z2, v.data.cenik).boky.nazev);
  return { zak, v, sirotek };
}
{
  const { zak, v, sirotek } = sirotekSachta2();
  zm.zamkniVariantu(v, { typ: 'nabidka', cislo: zm.variantaCislo(zak, v),
    vysledek: kopie(zm.zamekVysledekSpocti(v, JEKLY, 'k40')) });
  const vi = zk.aktivniVarianta(zk.importZakazka(kopie(zak)));
  test('D1: zamčená, šachta 2 se sirotkem boků — import nezmění nepocitat',
    JSON.stringify(vi.data.ock.dalsi[0].zadani.nepocitat) === JSON.stringify([sirotek]), vi.data.ock.dalsi[0].zadani.nepocitat);
  const ov = zm.zamekOvereni(vi, JEKLY, 'k40');
  test('D1: zamčená, šachta 2 se sirotkem boků — ověření zámku = shoda', ov && ov.stav === 'shoda', ov && ov.stav);
}
{
  const { zak, sirotek } = sirotekSachta2();
  const vi = zk.aktivniVarianta(zk.importZakazka(kopie(zak)));
  const z2 = vi.data.ock.dalsi[0].zadani;
  test('D1: nezamčená — import šachtu 2 migruje (jako šachtu 1 od K37)',
    !z2.nepocitat.includes(sirotek) && z2.nepocitat.includes(eng.skloVolba(z2, vi.data.cenik).boky.nazev), z2.nepocitat);
}
test('D1: skloMigraceNazvu s jenPrvni na šachtu 2 nesáhne', (() => {
  const { v, sirotek } = sirotekSachta2();
  eng.skloMigraceNazvu(v.data, { jenPrvni: true });
  return v.data.ock.dalsi[0].zadani.nepocitat[0] === sirotek;
})());

/* 8) Jedna šachta: výstup migrace bez opts beze změny (starý tvar názvů). */
{
  const { v, Z } = zakazka('exteriérová', 'na terče');
  Z.nepocitat = ['MATERIÁL boční + zadní stěna (staré)', 'MATERIÁL čelní stěna (staré)', 'jiná položka'];
  const n = eng.skloMigraceNazvu(v.data);
  const sv = eng.skloVolba(Z, v.data.cenik);
  test('jedna šachta: starý tvar migruje jako dřív', n === 2
    && JSON.stringify(Z.nepocitat) === JSON.stringify([sv.boky.nazev, sv.celni.nazev, 'jiná položka']), Z.nepocitat);
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
