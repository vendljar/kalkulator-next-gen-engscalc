/* C4 #540 — kód controllingu podle rozhodnutí J. V. 27. 10. 2026
 * (podklady/CONTROLLING_ROZHODNUTI.md, oddíl „Rozhodnuto 27. 10. 2026").
 *
 * Hlídá:
 *   1. PRODÁNO — model (prodNastav, prodOdemkni, prodServer): prodat jde jen
 *      zamčenou variantu a jen jednu; razítka a stav Pipedrive „čeká" píše
 *      server; odemknout smí jen vedoucí a administrátor s důvodem a stopa
 *      jde do prodejHistorie; krycí list i volná pole prodané varianty jsou
 *      zmrazené (zamekKryciPoleStav, zamekDataPorovnani), hlavička taky;
 *      controlling bere prodej z Prodáno (ctrlProdej, ctrlHromadnyZakazka,
 *      ctrlRejstrikDny), staré zakázky s objednanými příplatky platí dál;
 *      náhled zápisu do Pipedrive (prodPdZapis) — deal → Vyhráno, cena, krycí list.
 *   2. výchozí filtr stavu Pipedrive hromadného exportu = „Všechny".
 *   4. „Zaokrouhlení (Kč)" v souhrnu Kapitol nese u OCK i CEIL na tisíce.
 *   5. podíly skupin v Kapitolách dávají součet přesně 100 %.
 *  12. verze struktury 4 a list Popis říká, co se změnilo.
 * Pojistka: nad 2ad47f4 (před dávkou C4) sada padá ve všech bodech — viz commit.
 * Ceník je SMYŠLENÝ (src/zkusebni_cenik.js). */
const path = require('path');
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
['./format.js', './preklad.js', './docxgen.js', './cenik.js', './cenik_stari.js', './engine.js'].forEach(f => { try { nacti(f); } catch (e) {} });
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
['./techspec.js', './sleva.js', './zaokrouhleni.js', './podminky.js', './firma.js', './zakazka.js', './zamek.js', './kryci.js', './kryci_proj.js',
  './plan_plateb.js', './xlsx.js'].forEach(f => { try { nacti(f); } catch (e) { /* modul v Node nemusí jít načíst */ } });
const C = nacti('./controlling.js');
const O = nacti('./objednane.js');
const JEKLY = require('./jekly.json');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};
const kopie = x => JSON.parse(JSON.stringify(x));
const fn = n => typeof global[n] === 'function';
const DNES = '2026-10-27';
const TED = '2026-10-27T10:00:00.000Z';
const OBCH = { email: 'obchodnik@priklad.cz', role: 'Obchodník' };
const VED = { email: 'vedouci@priklad.cz', role: 'Vedoucí' };
const ADM = { email: 'spravce@priklad.cz', role: 'Administrátor' };

function zakazka() {
  const zak = novaZakazka();
  zak.cislo = '2026 - OPR - CN - 0951'; zak.nazevAkce = 'Zkušební akce C4'; zak.objednatel = 'Zkušební zákazník s.r.o.'; zak.ico = '12345678';
  zak.autor = OBCH.email; zak.jenOck = true;
  const v = zak.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, rezervaPriplatkyPct: 0.2 });
  v.data.cenik = ZC.zkusebniCenik();
  v.data.sleva = { procenta: 0 };
  return zak;
}
function zamkni(zak, v, kdy) {
  zamkniVariantu(v, { cislo: variantaCislo(zak, v), kdo: OBCH.email, typ: 'nabidka', kdy: kdy || '2026-10-20T08:00:00.000Z',
    vysledek: zamekVysledekSpocti(v, JEKLY, 'test') });
  if (kdy) v.zamek.kdy = kdy;
  return v;
}
const srv = (stara, zak, rel, ctx) => O.prodServer(stara, zak, rel, Object.assign({ ted: TED, kdy: TED }, ctx || {}));

if (!fn('novaZakazka') || !fn('zamkniVariantu')) { test('moduly zakázky a zámku se načetly', false); }
else {
  /* ---------- 1a. model Prodáno ---------- */
  test('#540 model: funkce prodeje existují', ['prodNastav', 'prodOdemkni', 'prodServer', 'prodStav', 'prodPdZapis'].every(k => typeof O[k] === 'function')
    && fn('variantaProdana'));
  if (typeof O.prodServer === 'function') {
    const z0 = zakazka(), v0 = z0.varianty[0];
    test('#540: nezamčenou variantu prodat nejde', /odeslanou/.test(O.prodNastav(z0, v0, DNES, { ted: TED })) && !v0.prodano);
    zamkni(z0, v0);
    test('#540: zamčenou variantu prodat jde (klient)', O.prodNastav(z0, v0, DNES, { kdo: 'podvrh@priklad.cz', ted: TED }) === '' && v0.prodano.datum === DNES);
    test('#540: datum v budoucnosti klient nepustí', (() => { const z = zakazka(); zamkni(z, z.varianty[0]); return /budoucnosti/.test(O.prodNastav(z, z.varianty[0], '2999-01-01', { ted: TED })); })());
    /* server: nový prodej → razítka z relace, stav Pipedrive čeká, stopa */
    const stara = kopie(z0); delete stara.varianty[0].prodano;
    const nova = kopie(z0); nova.varianty[0].prodano.pipedrive = { stav: 'odeslano', kdy: '2000-01-01' };
    const r1 = srv(stara, nova, OBCH);
    test('#540 server: obchodník zakázky prodá (null), kdo/kdy z relace, Pipedrive „čeká na odeslání"', r1 === null
      && nova.varianty[0].prodano.kdo === OBCH.email && nova.varianty[0].prodano.kdy === TED && nova.varianty[0].prodano.pipedrive.stav === 'ceka', { r1, p: nova.varianty[0].prodano });
    test('#540 server: stopa „prodano" v prodejHistorie', Array.isArray(nova.prodejHistorie) && nova.prodejHistorie.length === 1
      && nova.prodejHistorie[0].akce === 'prodano' && nova.prodejHistorie[0].kdo === OBCH.email && nova.prodejHistorie[0].datum === DNES, nova.prodejHistorie);
    const cizi = kopie(stara); cizi.autor = 'jiny@priklad.cz';
    test('#540 server: cizí obchodník neprodá (403)', (srv(cizi, kopie(z0), OBCH) || {}).status === 403);
    test('#540 server: vedoucí prodá i cizí zakázku', srv(cizi, kopie(z0), VED) === null);
    const bud = kopie(z0); bud.varianty[0].prodano.datum = '2999-01-01';
    test('#540 server: datum v budoucnosti → 400', (srv(stara, bud, ADM) || {}).status === 400);
    const tvar = kopie(z0); tvar.varianty[0].prodano = { datum: { toString: 1 } };
    test('#540 server: neplatný tvar → 400, ne výjimka', (() => { try { return (srv(stara, tvar, ADM) || {}).status === 400; } catch (e) { return false; } })());
    const nez = zakazka(); nez.varianty[0].prodano = { datum: DNES };
    test('#540 server: prodej nezamčené varianty → 400', (srv(null, nez, ADM) || {}).status === 400);
    const dve = kopie(z0); const v2 = kopie(dve.varianty[0]); v2.id = 'v-druha'; v2.ridici = false; dve.varianty.push(v2);
    test('#540 server: dvě prodané varianty → 400', (srv(stara, dve, ADM) || {}).status === 400);
    /* uložený prodej se nemění */
    const ulozena = kopie(nova);
    const zmena = kopie(nova); zmena.varianty[0].prodano = { datum: '2026-10-01', kdo: 'podvrh@priklad.cz', kdy: 'x', pipedrive: { stav: 'odeslano' } };
    test('#540 server: uložený prodej (datum, razítka, stav Pipedrive) klient nepřepíše', srv(ulozena, zmena, ADM) === null
      && JSON.stringify(zmena.varianty[0].prodano) === JSON.stringify(ulozena.varianty[0].prodano), zmena.varianty[0].prodano);
    test('#540 server: historii klient nepřepíše', (() => { const z = kopie(nova); z.prodejHistorie = []; srv(ulozena, z, ADM);
      return z.prodejHistorie.length === 1 && z.prodejHistorie[0].akce === 'prodano'; })());
    /* odemčení */
    const odem = (rel, duvod) => { const z = kopie(ulozena); const ch = O.prodOdemkni(z, z.varianty[0], duvod); return { ch, z, r: ch ? null : srv(ulozena, z, rel) }; };
    test('#540: odemčení bez důvodu klient nepustí', /důvod/.test(odem(VED, '  ').ch));
    test('#540 server: obchodník prodej neodemkne (403)', (odem(OBCH, 'zákazník změnil variantu').r || {}).status === 403);
    const ov = odem(VED, 'zákazník změnil variantu');
    test('#540 server: vedoucí odemkne s důvodem, stopa „odemceno" s důvodem a kdo z relace', ov.r === null && !ov.z.varianty[0].prodano
      && ov.z.prodejHistorie.length === 2 && ov.z.prodejHistorie[1].akce === 'odemceno' && ov.z.prodejHistorie[1].duvod === 'zákazník změnil variantu'
      && ov.z.prodejHistorie[1].kdo === VED.email && !('prodejOdemknout' in ov.z), ov);
    test('#540 server: administrátor odemkne s důvodem', odem(ADM, 'oprava data prodeje').r === null);
    const bezDuv = kopie(ulozena); delete bezDuv.varianty[0].prodano;
    test('#540 server: odemčení bez žádosti s důvodem → 400 i správci', (srv(ulozena, bezDuv, ADM) || {}).status === 400);
    /* obnova z otisku bere ze zálohy, ze souboru jde cestou uložení */
    const zal = kopie(ulozena); zal.varianty[0].prodano.cizi = 'x';
    test('#540 obnova z otisku: prodej a historie ze zálohy (jen povolená pole)', srv(null, zal, ADM, { obnova: true }) === null
      && zal.varianty[0].prodano.kdo === OBCH.email && !('cizi' in zal.varianty[0].prodano) && zal.prodejHistorie.length === 1);
    const soub = kopie(ulozena); soub.varianty[0].prodano.kdo = 'podvrh@priklad.cz';
    test('#540 obnova ze souboru: razítko nového prodeje z relace obnovujícího', srv(null, soub, ADM, { obnova: true, zeSouboru: true }) === null
      && soub.varianty[0].prodano.kdo === ADM.email);

    /* ---------- 1b. zmrazení krycího listu a hlavičky ---------- */
    const vz = ulozena.varianty[0];
    test('#540 zámek: prodaná varianta = variantaProdana', fn('variantaProdana') && variantaProdana(vz) && !variantaProdana(stara.varianty[0]));
    test('#540 zámek: volné pole krycího listu (po CN editovatelné) je po Prodáno zmrazené',
      zamekKryciPoleStav(stara.varianty[0], 'kryci', 'sodDatumPodpisu') === 'editovatelne' && zamekKryciPoleStav(vz, 'kryci', 'sodDatumPodpisu') === 'zmrazeno',
      [zamekKryciPoleStav(stara.varianty[0], 'kryci', 'sodDatumPodpisu'), zamekKryciPoleStav(vz, 'kryci', 'sodDatumPodpisu')]);
    test('#540 zámek: i krycí list PROJ prodané varianty je zmrazený (číslo SoD — po CN jinak volné)',
      zamekKryciPoleStav(stara.varianty[0], 'kryciProj', 'cisloSod') === 'editovatelne' && zamekKryciPoleStav(vz, 'kryciProj', 'cisloSod') === 'zmrazeno');
    const d1 = kopie(vz.data); d1.kryci = { hodnoty: { sodDatumPodpisu: DNES } };
    test('#540 zámek: serverové porovnání odeslané nabídky po Prodáno vidí změnu volného pole',
      zamekDataPorovnani(d1, vz) !== zamekDataPorovnani(vz.data, vz) && zamekDataPorovnani(d1, stara.varianty[0]) === zamekDataPorovnani(stara.varianty[0].data, stara.varianty[0]));
    const hl = kopie(ulozena); hl.ico = '87654321';
    test('#540 zámek: hlavička (IČO zákazníka) prodané zakázky se nemění', zamekZakZmeny(ulozena, hl).includes('ZAK.ico')
      && !zamekZakZmeny(stara, (() => { const x = kopie(stara); x.ico = '87654321'; return x; })()).includes('ZAK.ico'));
    test('#540 zámek: duplikát zakázky prodej ani stopu nedědí', (() => { const d = zakazkaDuplikuj(ulozena, '2026 - OPR - CN - 0952');
      return !d.varianty[0].prodano && !('prodejHistorie' in d); })());

    /* ---------- 1c. controlling bere prodej z Prodáno ---------- */
    const fP = C.ctrlHromadnyFiltr({ od: DNES, do: DNES }).filtr;
    test('#540 controlling: výchozí výběr podle prodeje vezme prodanou zakázku bez objednaných příplatků',
      C.ctrlHromadnyZakazka(ulozena, fP, { jekly: JEKLY }).ok, C.ctrlHromadnyZakazka(ulozena, fP, { jekly: JEKLY }));
    test('#540 controlling: neprodaná zakázka bez objednaných do výběru podle prodeje nepatří',
      C.ctrlHromadnyZakazka(stara, fP, { jekly: JEKLY }).duvod === 'bez prodeje');
    const stary = kopie(stara); const nab = O.objNabidnute(stary.varianty[0], JEKLY).map(p => p.key);
    O.objNastav(stary, stary.varianty[0], nab.slice(0, 1), DNES, { ted: TED });
    test('#540 controlling: starší zakázka jen s objednanými příplatky platí jako prodej dál',
      nab.length > 0 && C.ctrlHromadnyZakazka(stary, fP, { jekly: JEKLY }).ok);
    const obe = kopie(ulozena); O.objNastav(obe, obe.varianty[0], nab.slice(0, 1), '2026-10-01', { ted: TED });
    test('#540 controlling: datum prodeje bere z Prodáno, objednané jen doplní',
      C.ctrlProdej(obe).datum === DNES && C.ctrlHromadnyZakazka(obe, fP, { jekly: JEKLY }).ok
      && C.ctrlHromadnyZakazka(obe, fP, { jekly: JEKLY }).exp.radky.some(r => r.objednano), C.ctrlProdej && C.ctrlProdej(obe));
    const rozb = kopie(ulozena); rozb.varianty[0].prodano.datum = { toString: 1 };
    const rr = C.ctrlHromadnyZakazka(rozb, fP, { jekly: JEKLY });
    test('#540 controlling: nečitelné datum prodeje jde mezi přeskočené (ne tiše mimo období)', !rr.ok && !rr.mimo && /datum prodeje/.test(rr.duvod || ''), rr);
    test('#540 rejstřík: den prodeje z Prodáno', JSON.stringify(C.ctrlRejstrikDny(ulozena).prodej) === JSON.stringify({ den: DNES, rada: 'cr' }),
      C.ctrlRejstrikDny(ulozena));
    const e1 = C.ctrlExportVarianty(ulozena, ulozena.varianty[0], { jekly: JEKLY });
    test('#540 export varianty: datum prodeje z Prodáno v Popisu', e1.ok && e1.hlavicka.datumProdeje === DNES
      && C.ctrlExportListy(e1).find(l => l.nazev === 'Popis').rows.some(r => /Datum prodeje/.test(r[0]) && r[1] === DNES));

    /* ---------- 1d. náhled zápisu do Pipedrive ---------- */
    const pz = O.prodPdZapis(Object.assign(kopie(ulozena), { pdDealId: '4711' }), ulozena.varianty[0], JEKLY);
    test('#540 Pipedrive: náhled — deal, stav Vyhráno, prodaná varianta, datum, cena OCK bez DPH, krycí list, „čeká na odeslání"',
      !!pz && pz.dealId === '4711' && pz.stavDealu === 'won' && pz.varianta === '2026 - OPR - CN - 0951' && pz.datumProdeje === DNES
      && pz.hodnota.length === 1 && pz.hodnota[0].oblast === 'OCK' && pz.hodnota[0].bezDphKc > 0
      && pz.kryci.length === 1 && pz.kryci[0].list === 'OCK' && pz.kryci[0].sekce.length > 0 && /čeká/.test(pz.stav), pz && Object.assign({}, pz, { kryci: pz.kryci.length }));
  }

  /* ---------- 2. výchozí filtr „Všechny" ---------- */
  test('#540 bod 2: výchozí stav Pipedrive hromadného exportu = Všechny, „vyhráno" zůstává volbou',
    C.ctrlHromadnyFiltr({ od: '2026-10-01', do: '2026-10-31' }).filtr.pd === 'vse'
    && C.ctrlHromadnyFiltr({ od: '2026-10-01', do: '2026-10-31', pd: 'won' }).filtr.pd === 'won');

  /* ---------- 4. a 5. Kapitoly ---------- */
  const zk = zakazka(); zamkni(zk, zk.varianty[0]);
  const ex = C.ctrlExportVarianty(zk, zk.varianty[0], { jekly: JEKLY });
  const listy = C.ctrlExportListy(ex);
  const kap = listy.find(l => l.nazev === 'Kapitoly').rows;
  const iS = kap.findIndex(r => r[0] === 'Souhrn zakázky');
  const hS = kap[iS], rS = kap[iS + 1];
  const vO = vypocetZ(zk.varianty[0], JEKLY);
  const ceil = vO.souhrn.zakladCena - (vO.souhrn.zakladNaklad + vO.souhrn.zakladMarze);
  test('#540 bod 4: příprava — CEIL na tisíce u zkušební zakázky nenulový', ceil > 0.5, ceil);
  test('#540 bod 4: Zaokrouhlení (Kč) v souhrnu = CEIL na tisíce + obchodní zaokrouhlení',
    Math.abs(rS[hS.indexOf('Zaokrouhlení (Kč)')] - Math.round(ceil * 100) / 100) < 0.011, { zaokr: rS[hS.indexOf('Zaokrouhlení (Kč)')], ceil });
  const iPr = C.CTRL_RADKY_HLAVICKA.indexOf('Prodejní cena před slevou a zaokrouhlením (Kč)');
  const radky = listy.find(l => l.nazev === 'Řádky').rows.slice(1);
  test('#540 bod 4: Řádky beze změny — součet prodeje řádků + Zaokrouhlení = Cena před slevou',
    Math.abs(radky.reduce((a, r) => a + r[iPr], 0) + rS[hS.indexOf('Zaokrouhlení (Kč)')] - rS[hS.indexOf('Cena před slevou (Kč)')]) < 0.01 * (radky.length + 1));
  test('#540 bod 5: podíly dorovnané metodou největšího zbytku', typeof C.ctrlPodilyNa100 === 'function'
    && JSON.stringify(C.ctrlPodilyNa100([1, 1, 1], 3)) === '[33.34,33.33,33.33]'
    && JSON.stringify(C.ctrlPodilyNa100([1, 2], 3)) === '[33.33,66.67]'
    && JSON.stringify(C.ctrlPodilyNa100([0, 0], 0)) === '[0,0]');
  const podily = kap.slice(1, iS).filter(r => r.length === 13 && r[1] === 'OCK' && typeof r[10] === 'number');
  test('#540 bod 5: součet podílů skupin OCK v Kapitolách = přesně 100 %', Math.round(podily.reduce((a, r) => a + r[10], 0) * 100) === 10000,
    podily.reduce((a, r) => a + r[10], 0));

  /* ---------- 12. verze struktury ---------- */
  const popis = listy.find(l => l.nazev === 'Popis').rows;
  test('#540 bod 12: verze struktury 4 v konstantě i v listu Popis', C.CTRL_EXPORT_VERZE === 4
    && (popis.find(r => r[0] === 'Verze struktury souboru') || [])[1] === 4);
  test('#540 bod 12: Popis říká, co se ve verzi změnilo (Prodáno, Všechny, zaokrouhlení, 100 %)', (() => {
    const t = String((popis.find(r => r[0] === 'Změna struktury') || [])[1] || '');
    return /Prodáno/.test(t) && /Všechny/.test(t) && /tisíce/.test(t) && /100 %/.test(t); })());
  const fs = require('fs');
  const zdroj = fs.readFileSync(path.join(__dirname, 'controlling.js'), 'utf8');
  test('#540 bod 12: pravidlo „verze při každé změně exportu" je u konstanty', /PRAVIDLO[^]*KAŽDÉ změně exportu[^]*const CTRL_EXPORT_VERZE = /.test(zdroj));
}

console.log(`\n${ok} OK / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
