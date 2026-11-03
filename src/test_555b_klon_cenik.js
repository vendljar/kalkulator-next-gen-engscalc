/* ===== ZO2 #555b: TISK KLONU — „první rozdíl v datech: cenik" (hlášení
 * J. V. 3. 11. 2026, test v3.11.3) =====
 *
 * Po #555 hláška serveru ukázala důvod: „Neuloženo: změnila by se data
 * uzamčené (odeslané) nabídky „Varianta 1" (… K19T-C078), první rozdíl
 * v datech: cenik". Cesta končila na `cenik` — hodnoty pod ním byly stejné,
 * lišilo se POŘADÍ klíčů.
 *
 * Příčina: odeslané variantě uložené starší verzí chybějí klíče ceníku, které
 * přibyly později. Import (importZakazka → cenikDoplnKlice, V38) je doplní na
 * konec objektu — v prohlížeči podle DEFAULT_CENIK, který po přihlášení nese
 * ZVEŘEJNĚNÝ ceník (progPouzij), na serveru podle ceníku SESTAVENÍ
 * (staraPorovnani v netlify/lib/zakazka_kontrola.mjs). Jiný vzor = jiné pořadí
 * doplněných klíčů (a jiný doplněný text) a porovnání textem JSON to bralo
 * jako změnu odeslané nabídky. Celý tok v prohlížeči: overit_klon_tisk.mjs 5).
 *
 * Tady bez prohlížeče, obě prostředí v jednom procesu:
 *   1) skutečná cesta: prohlížeč (zveřejněný ceník + PROG_BUILD) → server
 *      (ceník sestavení) — porovnání zámku sedí, i u doplněného textu;
 *   2) zakImportVzorCeniku: zamčená varianta ze sestavení, rozpracovaná
 *      z platného ceníku;
 *   3) zamekJsonKanon / zamekDataPorovnani: pořadí klíčů není obsah, pole
 *      drží pořadí, skutečná změna ceníku odeslané varianty se dál pozná
 *      (pojistka serveru neoslabena);
 *   4) zamekDataRozdilCesta: „cenik (chybí v ukládané)" / „(chybí v uložené)"
 *      / „(jiný typ)", bez hodnot.
 *
 * POJISTKA: nad 198ed4c (v3.11.3) sada selže (viz commit); hlídají ji mutace
 * „#555b" v mutace_jadro.mjs.
 */
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
const eng = nacti('./engine.js');
const engP = nacti('./engine_proj.js');
const BUILD = JSON.parse(JSON.stringify(eng.DEFAULT_CENIK));
const BUILDP = JSON.parse(JSON.stringify(engP.DEFAULT_CENIK_PROJ));
global.DEFAULT_CENIK = JSON.parse(JSON.stringify(BUILD));
global.DEFAULT_CENIK_PROJ = JSON.parse(JSON.stringify(BUILDP));
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./podminky.js');
const FM = nacti('./firma.js');
nacti('./plan_plateb.js');
const zk = nacti('./zakazka.js');
const zm = nacti('./zamek.js');
nacti('./kryci.js');
nacti('./kryci_proj.js');
global.NAST = { firma: FM.firmaDefault() };

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};
const kopie = x => JSON.parse(JSON.stringify(x));
const nahrad = (cil, zdroj) => { Object.keys(cil).forEach(k => delete cil[k]); Object.assign(cil, kopie(zdroj)); };

/* Prostředí: server = ceník sestavení, PROG_BUILD neexistuje; prohlížeč po
 * přihlášení = zveřejněný ceník v DEFAULT_CENIK a PROG_BUILD ze sestavení. */
const PUB = ZC.zkusebniCenik();
/* Zveřejněný ceník PROJ v jiném pořadí klíčů než sestavení (zkušební má pořadí
 * shodné; skutečný zveřejněný ceník pořadí ze sestavení držet nemusí). */
const PUBP = (() => { const c = ZC.zkusebniCenikProj(), o = {}; Object.keys(c).reverse().forEach(k => { o[k] = c[k]; }); return o; })();
const server = () => { nahrad(global.DEFAULT_CENIK, BUILD); nahrad(global.DEFAULT_CENIK_PROJ, BUILDP); delete global.PROG_BUILD; };
const prohlizec = () => { nahrad(global.DEFAULT_CENIK, PUB); nahrad(global.DEFAULT_CENIK_PROJ, PUBP);
  global.PROG_BUILD = { cenik: kopie(BUILD), cenikProj: kopie(BUILDP) }; };

/* Odeslaná varianta tak, jak ji uložil server: zveřejněné ceny + klíče
 * sestavení (import serveru je doplnil). */
server();
const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 8771'; z.nazevAkce = 'TEST ZO2 555b';
const v = z.varianty[0];
Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2 });
v.data.cenik = kopie(PUB); v.data.proj.cenik = kopie(PUBP);
zm.zamkniVariantu(v, { cislo: zm.variantaCislo(z, v), typ: 'nabidkaTisk', kdy: new Date().toISOString() });
const ulozena = zk.importZakazka(kopie(z));
test('(příprava: zveřejněný ceník a ceník sestavení mají jiné pořadí klíčů — jinak test nic neověřuje)',
  Object.keys(PUB).filter(k => k in BUILD).join() !== Object.keys(BUILD).filter(k => k in PUB).join());

/* „Zestárnutí": klíče, které v době odeslání neexistovaly — jeden zná i
 * zveřejněný ceník (zamecnikAtypKc), ostatní jen sestavení. */
const STARE = ['zamecnikAtypKc', 'kurzEurKc', 'atypMontazPct', 'dleNabidky'];
const tok = (uprav) => {
  const stara = kopie(ulozena); uprav(stara.varianty[0].data);
  server();
  const sp = zk.importZakazka(kopie(stara));                        // staraPorovnani
  prohlizec();
  const okno = zk.importZakazka(kopie(stara));                      // onlineOtevri
  const oknoV1 = kopie(okno.varianty[0].data);
  server();
  const prijata = zk.importZakazka(kopie(okno));                    // zakazkaPrijmi
  const sv = sp.varianty[0];
  return { sp, okno, oknoV1, prijata, sv,
    shoda: zm.zamekDataPorovnani(prijata.varianty[0].data, sv) === zm.zamekDataPorovnani(sv.data, sv),
    cesta: zm.zamekDataRozdilCesta(prijata.varianty[0].data, sv.data, sv) };
};

/* 1) skutečná cesta */
{
  const r = tok(d => STARE.forEach(k => delete d.cenik[k]));
  test('#555b: starší tvar ceníku odeslané varianty → porovnání zámku na serveru sedí', r.shoda && r.cesta === '', r.cesta);
  test('#555b: v prohlížeči se doplnil i klíč sestavení (jako na serveru)', 'kurzEurKc' in r.oknoV1.cenik && 'atypMontazPct' in r.oknoV1.cenik);
  test('#555b: …ve stejném pořadí jako na serveru', Object.keys(r.oknoV1.cenik).join() === Object.keys(r.sv.data.cenik).join());
  test('#555b: hodnoty původních klíčů beze změny', Object.keys(ulozena.varianty[0].data.cenik).filter(k => STARE.indexOf(k) < 0)
    .every(k => JSON.stringify(r.oknoV1.cenik[k]) === JSON.stringify(ulozena.varianty[0].data.cenik[k])));
}
{
  const r = tok(d => { delete d.cenik.skloBokyNazev; delete d.cenik.cetrisKc; });
  test('#555b: doplněný TEXT ceníku (název skla) je v prohlížeči týž jako na serveru', r.shoda && r.cesta === '', r.cesta);
  test('…text ze sestavení, ne ze zveřejněného ceníku', r.oknoV1.cenik.skloBokyNazev === BUILD.skloBokyNazev
    && BUILD.skloBokyNazev !== PUB.skloBokyNazev, [r.oknoV1.cenik.skloBokyNazev]);
}
{
  const r = tok(d => { const k0 = Object.keys(d.cenik.spojovaci)[0]; delete d.cenik.spojovaci[k0];
    ['dopravaKmKc', 'dopravaHodKc', 'kurzEurKc'].forEach(k => delete d.proj.cenik[k]); });
  test('#555b: vnořený oddíl a ceník PROJ starší → sedí', r.shoda && r.cesta === '', r.cesta);
  test('#555b: ceník PROJ doplněn v pořadí jako na serveru', Object.keys(r.oknoV1.proj.cenik).join() === Object.keys(r.sv.data.proj.cenik).join());
  test('#555b: vnořený oddíl doplněn v pořadí jako na serveru', Object.keys(r.oknoV1.cenik.spojovaci).join() === Object.keys(r.sv.data.cenik.spojovaci).join());
}
{
  const r = tok(d => { d.cenikRada = 'zahr'; STARE.forEach(k => delete d.cenik[k]); });
  test('#555b: zahraniční řada odeslané varianty → sedí', r.shoda && r.cesta === '', r.cesta);
}
{
  /* Rozpracovaná varianta se dál doplňuje ze zveřejněného ceníku (V38 — klíč platného ceníku se neztratí). */
  prohlizec();
  const n = zk.novaZakazka(); const nv = n.varianty[0];
  nv.data.cenik = kopie(PUB); delete nv.data.cenik.zamecnikAtypKc; delete nv.data.cenik.zkusebni;
  const o = zk.importZakazka(kopie(n));
  test('rozpracovaná varianta: doplní se klíč zveřejněného ceníku, ne jen sestavení', 'zkusebni' in o.varianty[0].data.cenik
    && !('kurzEurKc' in o.varianty[0].data.cenik));
}

/* 2) zakImportVzorCeniku */
prohlizec();
test('#555b: vzor zamčené varianty = ceník sestavení (PROG_BUILD)', zk.zakImportVzorCeniku(v).ock === global.PROG_BUILD.cenik
  && zk.zakImportVzorCeniku(v).proj === global.PROG_BUILD.cenikProj);
test('vzor rozpracované varianty = platný ceník (DEFAULT_CENIK)', zk.zakImportVzorCeniku({ data: {} }).ock === global.DEFAULT_CENIK);
server();
test('server / Node bez PROG_BUILD: vzor zamčené varianty = DEFAULT_CENIK', zk.zakImportVzorCeniku(v).ock === global.DEFAULT_CENIK);

/* 3) kanonické porovnání */
test('#555b: pořadí klíčů objektu není rozdíl', zm.zamekJsonKanon({ a: 1, b: { c: 2, d: 3 } }) === zm.zamekJsonKanon({ b: { d: 3, c: 2 }, a: 1 }));
test('pořadí prvků pole rozdíl je', zm.zamekJsonKanon({ a: [1, 2] }) !== zm.zamekJsonKanon({ a: [2, 1] }));
test('klíč __proto__ se neztratí', zm.zamekJsonKanon(JSON.parse('{"__proto__":{"x":1}}')) !== zm.zamekJsonKanon({}));
{
  const sv = ulozena.varianty[0];
  const a = kopie(sv.data); const ks = Object.keys(a.cenik).reverse(); const b = kopie(a); b.cenik = {}; ks.forEach(k => { b.cenik[k] = a.cenik[k]; });
  test('#555b: zamekDataPorovnani — ceník v obráceném pořadí klíčů = shoda', zm.zamekDataPorovnani(b, sv) === zm.zamekDataPorovnani(a, sv));
  const c = kopie(a); c.cenik.montazHodKc = (+c.cenik.montazHodKc || 0) + 1;
  test('pojistka: změněná cena odeslané varianty se dál pozná', zm.zamekDataPorovnani(c, sv) !== zm.zamekDataPorovnani(a, sv));
  const e = kopie(a); delete e.cenik.montazHodKc;
  test('pojistka: chybějící položka ceníku se dál pozná', zm.zamekDataPorovnani(e, sv) !== zm.zamekDataPorovnani(a, sv));

  /* 4) diagnostika */
  const bez = kopie(a); delete bez.cenik;
  test('#555b: cesta „cenik (chybí v ukládané)"', zm.zamekDataRozdilCesta(bez, a, sv) === 'cenik (chybí v ukládané)', zm.zamekDataRozdilCesta(bez, a, sv));
  test('#555b: cesta „cenik (chybí v uložené)"', zm.zamekDataRozdilCesta(a, bez, sv) === 'cenik (chybí v uložené)', zm.zamekDataRozdilCesta(a, bez, sv));
  const nul = kopie(a); nul.cenik = null;
  test('#555b: null = chybí', zm.zamekDataRozdilCesta(nul, a, sv) === 'cenik (chybí v ukládané)', zm.zamekDataRozdilCesta(nul, a, sv));
  const pole = kopie(a); pole.cenik = [];
  test('#555b: cesta „cenik (jiný typ)" (pole proti objektu)', zm.zamekDataRozdilCesta(pole, a, sv) === 'cenik (jiný typ)', zm.zamekDataRozdilCesta(pole, a, sv));
  const txt = kopie(a); txt.cenik.montazHodKc = String(txt.cenik.montazHodKc) + 'x';
  test('#555b: číslo proti textu → (jiný typ), bez hodnoty', zm.zamekDataRozdilCesta(txt, a, sv) === 'cenik.montazHodKc (jiný typ)', zm.zamekDataRozdilCesta(txt, a, sv));
  test('změněná hodnota stejného typu → cesta bez poznámky', zm.zamekDataRozdilCesta(c, a, sv) === 'cenik.montazHodKc', zm.zamekDataRozdilCesta(c, a, sv));
  test('chybějící položka → cesta s poznámkou', zm.zamekDataRozdilCesta(e, a, sv) === 'cenik.montazHodKc (chybí v ukládané)', zm.zamekDataRozdilCesta(e, a, sv));
  test('jen jiné pořadí → žádný rozdíl', zm.zamekDataRozdilCesta(b, a, sv) === '', zm.zamekDataRozdilCesta(b, a, sv));
  test('cesta nenese hodnoty', !/\d{2,}/.test(zm.zamekDataRozdilCesta(c, a, sv) + zm.zamekDataRozdilCesta(txt, a, sv)));
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
if (fail) process.exit(1);
