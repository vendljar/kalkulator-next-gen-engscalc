/* LAKOVÁNÍ: CENA Z NABÍDKY LAKOVNY JAKO ČÁSTKA ŘÁDKU (#666, J. V. 18. 11. 2026
 * — audit #668 bod B2, vzor #667 / #561).
 *
 * Souhrnný řádek lakování smí nést částku z nabídky lakovny (cesta
 * C.lak.nabidkaKc mimo ceník a Nastavení) — ruční cena se zdrojem
 * a potvrzením obchodníka jako u #561. Bez ní se lakování počítá jako dřív
 * a tvar výsledku jádra se nemění (porovnání sestavení SHODA). Serverovou
 * část (B112, razítko, zámek, podvrh výsledku) měří
 * netlify/test_666_lakovani.mjs.
 *
 * Čísla jsou smyšlená (zkusebni_cenik.js + částky v testu).
 *
 * Pojistka proti prázdnému testu: proti 05a496d (v22.11.5, před #666) sada
 * padá v oddílu 1 (rucniCenaSmi('C.lak.nabidkaKc') = false, jádro částku
 * nebere) a s ním padají oddíly 2–6. */
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); };
nacti('./format.js'); nacti('./cenik.js'); nacti('./cenik_stari.js'); nacti('./cenik_rady.js');
nacti('./engine.js'); nacti('./engine_proj.js'); nacti('./techspec.js'); nacti('./zamek.js');
nacti('./poznamky.js'); nacti('./zakazka.js'); nacti('./zobrazeni.js'); nacti('./sleva.js');
nacti('./schvalovani.js'); nacti('./kontroly.js'); nacti('./vyjimky.js'); nacti('./program.js');
nacti('./uloziste.js'); nacti('./controlling.js'); nacti('./rucni_ceny.js'); nacti('./zaokrouhleni.js');
const ZC = require('./zkusebni_cenik.js');
const JEKLY = require('./jekly.json');
global.JEKLY = JEKLY;

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};
const kopie = x => JSON.parse(JSON.stringify(x));

const LAK = 'C.lak.nabidkaKc';
const NAZEV = 'LAKOVÁNÍ (ŠACHTA, PLECHY, ZASKLENÍ, OPLECHOVÁNÍ)';
const PLATNY = { verze: 3, cenik: (() => { const c = ZC.zkusebniCenik(); c.marze = 0.25; return c; })(),
  cenikProj: ZC.zkusebniCenikProj(), zahranicni: { ceny: {}, jenZahr: {} } };
const ROZMERY = { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4, typSachty: 'exteriérová' };
function zakazka() {
  const z = novaZakazka(); z.cislo = '2026 - OPR - CN - 0666'; z.nazevAkce = 'TEST lakování z nabídky';
  const d = z.varianty[0].data;
  Object.assign(d.ock.zadani, ROZMERY);
  d.cenik = kopie(PLATNY.cenik); d.proj.cenik = kopie(PLATNY.cenikProj);
  cenikOznacJakoDnesni(d, { verze: PLATNY.verze });
  return importZakazka(z);
}
const vys = (d) => vypocet(d.ock.zadani, d.cenik, JEKLY, d.ock.fixes);
const radekLak = (r) => (r.sekce.hrubaOck || []).find(x => x.origNazev === NAZEV);

console.log('===== 1. cesta částky řádku (rucni_ceny.js) =====');
test('ruční cena u C.lak.nabidkaKc je povolená', rucniCenaSmi(LAK));
test('jednotka Kč a popis „nabídka lakovny"', rucniCenaJednotka(LAK) === 'Kč' && /nabídk\w* lakovny/.test(rucniCenaPopis(LAK)), rucniCenaPopis(LAK));
test('jiná cesta pod C.lak bez ceníkové položky ne', !rucniCenaSmi('C.lak.nabidka') && !rucniCenaSmi('C.lak.rezim'));
test('ceník (Nastavení) cestu nenese — nový sloupec není', !CENIK_DEF.some(([, it]) => it.some(([p]) => p === LAK)));
test('vzor ceníku klíč nenese — import ho nedoplní nulou', !Object.prototype.hasOwnProperty.call(DEFAULT_CENIK.lak, 'nabidkaKc'));
test('řádek lakování → cesta C.lak.nabidkaKc', rucniCenaCestaRadku({ origNazev: NAZEV, cenaSkupina: 'C.lak.*' }) === LAK);
test('řádek sloupů můstků (lak) ani vlastní položka cestu nemají',
  rucniCenaCestaRadku({ origNazev: MUSTEK_RADEK.sloupyLak, cenaSkupina: 'C.lak.*' }) === ''
  && rucniCenaCestaRadku({ origNazev: NAZEV, vlastni: true }) === '');

console.log('===== 2. jádro: bez částky beze změny, s částkou částka řádku =====');
{ const z = zakazka(); const d = z.varianty[0].data;
  const r0 = vys(d), l0 = radekLak(r0);
  test('výchozí: lakování z ceníku (> 0), výsledek bez klíče „nabidka"', l0 && l0.naklad > 0 && !('nabidka' in r0.lakovani)
    && !('dleCeniku' in r0.lakovani), r0.lakovani);
  test('výchozí: tvar řádku beze změny (žádné nové pole)', l0 && !('rucniCesta' in l0) && l0.cenaPath === null && l0.cenaSkupina === 'C.lak.*');
  for (const spatne of [null, '', 'x', -5, NaN]) {
    const dd = kopie(d); dd.cenik.lak.nabidkaKc = spatne;
    const rr = vys(dd);
    test('neplatná částka ' + JSON.stringify(spatne) + ' = počítá se z ceníku', radekLak(rr).naklad === l0.naklad && !('nabidka' in rr.lakovani));
  }
  test('nastavení částky 54321 (ruční cena)', rucniCenaNastav(d, LAK, 54321) === true && d.cenik.lak.nabidkaKc === 54321);
  const r1 = vys(d), l1 = radekLak(r1);
  test('řádek lakování = částka z nabídky', l1 && l1.naklad === 54321 && l1.cena === 54321 && l1.mnozstvi === 1, l1);
  test('přirážka se přičte jako jinde', Math.abs(l1.sMarzi - 54321 * 1.25) < 1e-6, l1);
  test('výsledek nese částku a výpočet z ceníku pro srovnání', r1.lakovani.nabidka === 54321 && r1.lakovani.dleCeniku === l0.naklad
    && r1.lakovani.pouzito === 54321, r1.lakovani);
  test('základní náklad se změnil přesně o rozdíl', Math.abs((r1.souhrn.zakladNaklad - r0.souhrn.zakladNaklad) - (54321 - l0.naklad)) < 1e-6);
  const s0 = (r0.sekce.mustky || []).concat(r0.sekce.hrubaOck || []).find(x => x.origNazev === MUSTEK_RADEK.sloupyLak);
  const s1 = (r1.sekce.mustky || []).concat(r1.sekce.hrubaOck || []).find(x => x.origNazev === MUSTEK_RADEK.sloupyLak);
  test('lak sloupů můstků se nemění', JSON.stringify(s0 || null) === JSON.stringify(s1 || null));
  /* nula z nabídky platí (#667) */
  const d0 = kopie(d); rucniCenaNastav(d0, LAK, 0);
  test('nula z nabídky = řádek 0', radekLak(vys(d0)).naklad === 0 && vys(d0).lakovani.nabidka === 0);
  /* vlastní položky lakování se přičítají dál */
  const dv = kopie(d); dv.ock.zadani.vlastniPolozky = { lakovani: [{ nazev: 'Lak navíc', mnozstvi: 2, cena: 1000 }] };
  test('vlastní položky lakování se k částce přičtou', radekLak(vys(dv)).naklad === 54321 + 2000, radekLak(vys(dv)));
  /* režim lakovny částku nemění */
  const dr = kopie(d); dr.cenik.lak.rezim = 'lakovna';
  test('přepnutý režim lakovny částku nemění', radekLak(vys(dr)).naklad === 54321);
}

console.log('===== 3. záznam, potvrzení, zábrana tisku, ↺ vrátit =====');
{ const z = zakazka(); const d = z.varianty[0].data;
  const l0 = radekLak(vys(d)).naklad;
  rucniCenaNastav(d, LAK, 40000);
  const rec = rucniCenaZaznam(d, LAK);
  test('záznam bez zdroje: základ null (ceník cestu nemá)', rec && rec.zaklad === null && rec.potvrdil === null, rec);
  test('bez zdroje nejde potvrdit', rucniCenaPotvrd(d, LAK, 'T', '2026-11-22T10:00:00Z') === false);
  const p1 = rucniCenyPrehled(d);
  test('částka bez zdroje = NEPOTVRZENÁ (zábrana), ne schválení', p1.nepotvrzene.some(x => x.cesta === LAK) && !p1.bezZdroje.length, p1);
  const ctx = () => ({ zadani: d.ock.zadani, cenik: d.cenik, rucni: rucniCenyPrehled(d) });
  test('kontrola rucniCenaNepotvrzena (zábrana tisku)', kontrolyProved(ctx()).nalezy.some(x => x.kod === 'rucniCenaNepotvrzena'));
  test('server: nový zámek odmítnut (rucniCenyZamekProblem)', !!rucniCenyZamekProblem(z, z.varianty[0]));
  rucniCenaZdrojNastav(d, LAK, 'dodavatel', 'Lakovna Příklad s.r.o.'); rucniCenaZdrojNastav(d, LAK, 'cislo', 'NL-2026-66');
  test('se zdrojem potvrdit jde', rucniCenaPotvrd(d, LAK, 'Test', '2026-11-22T10:00:00Z') === true);
  test('po potvrzení zábrana mlčí', !kontrolyProved(ctx()).nalezy.some(x => x.kod === 'rucniCenaNepotvrzena')
    && !rucniCenyZamekProblem(z, z.varianty[0]));
  test('směs ceníků (cenová výjimka) částku nehlásí', !(vyjimkyObsah(d, PLATNY).smes || []).some(x => x.cesta === LAK));
  /* změna částky = nové potvrzení */
  rucniCenaNastav(d, LAK, 41000);
  test('změna částky shodí potvrzení', rucniCenaStav(rucniCenaZaznam(d, LAK)) === RC_NEPOTVRZENO);
  /* ↺ vrátit: klíč pryč, lakování z ceníku */
  test('↺ vrátit: záznam smazán', rucniCenaVrat(d, LAK, undefined) === true && !rucniCenaZaznam(d, LAK));
  test('↺ vrátit: klíč z ceníku varianty pryč, lakování zase z ceníku',
    !Object.prototype.hasOwnProperty.call(d.cenik.lak, 'nabidkaKc') && radekLak(vys(d)).naklad === l0);
}

console.log('===== 4. server: tvar záznamu a B112 =====');
{ const z = zakazka(); const d = z.varianty[0].data;
  test('očista přijme záznam u C.lak.nabidkaKc', rucniCenyOciste({ [LAK]: { hodnota: 1, dodavatel: 'L' } }).ok);
  rucniCenaNastav(d, LAK, 30000);
  test('rucniCenaPlati: záznam kryje hodnotu ceníku varianty', rucniCenaPlati(d, LAK));
  const dd = kopie(d); dd.cenik.lak.nabidkaKc = 29999;
  test('jiná hodnota v ceníku než v záznamu = nekryje', !rucniCenaPlati(dd, LAK));
}

console.log('===== 5. controlling: zdroj a odchylka od výpočtu z ceníku =====');
{ const z = zakazka(); const v = z.varianty[0]; const d = v.data;
  const l0 = radekLak(vys(d)).naklad;
  rucniCenaNastav(d, LAK, 35000);
  rucniCenaZdrojNastav(d, LAK, 'cislo', 'NL-2026-67');
  rucniCenaPotvrd(d, LAK, 'Test', '2026-11-22T10:00:00Z');
  zamkniVariantu(v, { typ: 'nabidka', kdy: '2026-11-22T10:00:00Z', kdo: 'T', cislo: variantaCislo(z, v),
    vysledek: zamekVysledekSpocti(v, JEKLY, 'v-666') });
  const ex = ctrlExportVarianty(z, v, { jekly: JEKLY });
  test('export prošel', ex.ok, ex.chyba);
  const rl = ex.ok ? ex.radky.find(x => x.klic === 'C.lak.*' && /LAKOVÁNÍ \(ŠACHTA/.test(x.nazev)) : null;
  test('řádek lakování: klíč C.lak.* (skupina lakování beze změny), náklad = částka', !!rl && rl.naklad === 35000 && rl.skupina === 'sl-lakovani', rl);
  test('řádek lakování nese zdroj (nabídka, č.) a odchylku od výpočtu z ceníku', !!rl && rl.rucni && /NL-2026-67/.test(rl.rucni.zdroj)
    && Math.abs(rl.rucni.odchylka - (35000 - l0)) < 1e-6, rl && rl.rucni);
  /* bez částky řádek controllingu beze změny tvaru */
  const z2 = zakazka(); const v2 = z2.varianty[0];
  zamkniVariantu(v2, { typ: 'nabidka', kdy: '2026-11-22T10:00:00Z', kdo: 'T', cislo: variantaCislo(z2, v2),
    vysledek: zamekVysledekSpocti(v2, JEKLY, 'v-666') });
  const ex2 = ctrlExportVarianty(z2, v2, { jekly: JEKLY });
  const rl2 = ex2.ok ? ex2.radky.find(x => x.klic === 'C.lak.*' && /LAKOVÁNÍ \(ŠACHTA/.test(x.nazev)) : null;
  test('bez částky: řádek bez rucni / rucniCesta', !!rl2 && !rl2.rucni && !('rucniCesta' in rl2), rl2);
}

console.log('===== 6. tisk: výsledek strany (nabídka, krycí list) nese částku =====');
{ const z = zakazka(); const v = z.varianty[0]; const d = v.data;
  rucniCenaNastav(d, LAK, 33333);
  const r = vysledekStrany(z, v, 'ock', JEKLY);
  const rl = r && radekLak(r);
  test('výsledek strany OCK: řádek lakování = částka z nabídky', !!rl && rl.naklad === 33333, rl);
  const cena = cenaNabidkyOck(r, d.slevaOck, d.zaokrOck);
  const r0 = vysledekStrany(zakazka(), zakazka().varianty[0], 'ock', JEKLY);
  const cena0 = cenaNabidkyOck(r0, d.slevaOck, d.zaokrOck);
  test('cena nabídky klesla (částka z nabídky je nižší než výpočet z ceníku)', cena && cena0 && cena.cena < cena0.cena, [cena && cena.cena, cena0 && cena0.cena]);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
