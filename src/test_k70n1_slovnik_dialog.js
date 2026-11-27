/* ============================================================
 * K70-N1 (kolo 70A, 27. 11. 2026) — DOTISK STARÉ NABÍDKY A PLANÝ DIALOG
 * „Dotisk se změněným slovníkem".
 *
 * Razítko slovníku v zámku nese otisk CELÉHO živého slovníku. Dávka TX
 * (v26.11.2, K66-I1) do PREKLAD jen PŘIDALA heslo „… PROVEDITELNOSTI …",
 * dvojče hesla „… PROVDITELNOSTI …" se stejným překladem — otisk se změnil,
 * text dotisku ne. Test hlídá:
 *   1. rozdíl PREKLAD test v25.11.6 × v26.11.3 = právě to jedno heslo
 *      (zabudovaný slovník bez něj má 1012 hesel a otisk c3d49e6a),
 *      jeho překlad = překlad dvojčete (dotisk dá týž text); rozdíl
 *      main v24.11.7 (4e69c27) × dnes = 5 hesel SLOVNIK_PRIDANA_HESLA
 *      (fixtura test_k70n1_zamek_main.json — zámek pořízený kódem main);
 *   2. slovnikRazitkoShoda: staré razítko (slovník bez hesla K66-I1,
 *      i se zveřejněnou verzí) → shoda; jiný otisk, jiná zveřejněná verze,
 *      změněný překlad dvojčete → neshoda;
 *   3. tiskSlovnikUpozorni ze zdroje UI: staré razítko (před TX i zámek
 *      z main, s ruční položkou i bez) → bez dialogu; jiný otisk / jiná
 *      verze / data, která přidané heslo použijí → dialog; CZ → bez dialogu;
 *      dotisk zámku z main současným kódem přidaná hesla opravdu nečte;
 *   4. text dialogu při téže verzi neříká „verze 1 → verze 1".
 * Spuštění: node src/test_k70n1_slovnik_dialog.js
 * ============================================================ */
const fs = require('fs');
const vm = require('vm');
const P = require('./preklad.js');
const S = require('./slovnik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

const K_NOVY = 'díky obsahu a zpracování je možné naší STUDII PROVEDITELNOSTI projednat v této fázi na odboru památkové péče HMP';
const K_STARY = 'díky obsahu a zpracování je možné naší STUDII PROVDITELNOSTI projednat v této fázi na odboru památkové péče HMP';
const bez = (o, k) => { const c = Object.assign({}, o); delete c[k]; return c; };
const ZAB = P.PREKLAD_ZABUDOVANY || P.PREKLAD;

/* ---------- 1. rozdíl zabudovaného slovníku ---------- */
const stary = bez(ZAB, K_NOVY);
test('zabudovaný slovník bez hesla K66-I1 = stav v25.11.6 (1012 hesel, otisk c3d49e6a)',
  Object.keys(stary).length === 1012 && S.slovnikRazitko(stary, null).otisk === 'c3d49e6a',
  [Object.keys(stary).length, S.slovnikRazitko(stary, null).otisk]);
test('heslo K66-I1 má stejný překlad jako dvojče se starým tvarem (dotisk dá týž text)',
  Array.isArray(ZAB[K_NOVY]) && JSON.stringify(ZAB[K_NOVY]) === JSON.stringify(ZAB[K_STARY]));
['en', 'de', 'fr'].forEach(L => test('tr(' + L + ') starého i nového tvaru dá týž text',
  P.tr(K_NOVY, L) === P.tr(K_STARY, L) && P.tr(K_NOVY, L) !== K_NOVY));
const PRIDANA = [].concat(...S.SLOVNIK_PRIDANA_HESLA.map(g => g.hesla.map(h => h.klic)));
test('seznam přidaných hesel: RP (bm, kpl, m²), ER (ENGINEERING), K66-I1 — v tomto pořadí',
  JSON.stringify(PRIDANA) === JSON.stringify(['bm', 'kpl', 'm²', 'ENGINEERING', K_NOVY])
  && S.SLOVNIK_PRIDANA_HESLA[2].hesla[0].dvojce === K_STARY, PRIDANA);

/* ---------- 1b. rozdíl main v24.11.7 (4e69c27) × dnes ---------- */
/* Fixtura test_k70n1_zamek_main.json: dvě zakázky zamčené KÓDEM MAIN 4e69c27
 * (kryciZmrazPodminky, zamekVysledekSpocti, zamekSnimekSpocti, zamkniVariantu
 * s razítkem slovnikRazitko(PREKLAD main, 1)) — bez ruční položky a s ruční
 * položkou (řádek „+ přidat položku" v Hrubé OCK, tvar main bez jednotky);
 * obě se starou režií ENGINEERING (engineeringKs 2). */
const FM = require('./test_k70n1_zamek_main.json');
const main = PRIDANA.reduce((o, k) => bez(o, k), ZAB);
test('zabudovaný slovník bez 5 přidaných hesel = main v24.11.7 (1008 hesel, týž otisk jako zámek z main)',
  Object.keys(main).length === FM.pocetHesel && S.slovnikRazitko(main, null).otisk === FM.razitkoZabudovany.otisk
  && FM.bez.varianty[0].zamek.slovnik.otisk === FM.razitkoZabudovany.otisk && FM.bez.varianty[0].zamek.slovnik.verze === 1,
  [Object.keys(main).length, S.slovnikRazitko(main, null).otisk, FM.razitkoZabudovany]);
test('jinak se main a dnešek ve slovníku neliší (žádné změněné heslo)',
  Object.keys(main).every(k => JSON.stringify(main[k]) === JSON.stringify(ZAB[k])));
test('fixtura: stará režie nese ENGINEERING, ruční položka je bez jednotky, kalkVerze chybí',
  /"ENGINEERING"/.test(JSON.stringify(FM.bez.varianty[0].zamek.vysledek))
  && FM.rp.varianty[0].data.ock.zadani.vlastniPolozky.hrubaOck.length === 1
  && FM.rp.varianty[0].data.ock.zadani.vlastniPolozky.hrubaOck[0].jednotka === undefined
  && FM.bez.varianty[0].data.ock.zadani.kalkVerze === undefined);

/* ---------- 2. slovnikRazitkoShoda ---------- */
/* živý slovník = zabudovaný + zveřejněná verze 1 s jedním přepisem (jako na testu) */
const zverejneno = { 'OPLÁŠTĚNÍ ŠACHTY': ['X CLADDING', 'X VERKLEIDUNG', 'X HABILLAGE'] };
const zivyTed = Object.assign({}, ZAB, zverejneno);
const zivyTehdy = bez(zivyTed, K_NOVY);
const rTehdy = S.slovnikRazitko(zivyTehdy, 1), rTed = S.slovnikRazitko(zivyTed, 1);
test('otisky před a po K66-I1 se liší (příčina dialogu)', rTehdy.otisk !== rTed.otisk);
test('staré razítko (verze 1) × dnešní slovník (verze 1) → shoda', S.slovnikRazitkoShoda(rTehdy, zivyTed, 1) === true);
test('staré razítko jen zabudovaného slovníku → shoda',
  S.slovnikRazitkoShoda(S.slovnikRazitko(stary, null), ZAB, null) === true);
test('totéž razítko jako dnes → shoda', S.slovnikRazitkoShoda(rTed, zivyTed, 1) === true);
test('jiná zveřejněná verze → neshoda', S.slovnikRazitkoShoda(rTehdy, zivyTed, 2) === false
  && S.slovnikRazitkoShoda(S.slovnikRazitko(zivyTehdy, null), zivyTed, 1) === false);
test('jiný otisk (jiný překlad, který dotisk použije) → neshoda',
  S.slovnikRazitkoShoda({ verze: 1, otisk: 'deadbeef' }, zivyTed, 1) === false
  && S.slovnikRazitkoShoda(S.slovnikRazitko(Object.assign({}, zivyTehdy, { 'OPLÁŠTĚNÍ ŠACHTY': ['Y', 'Y', 'Y'] }), 1), zivyTed, 1) === false);
const jineDvojce = Object.assign({}, zivyTed, { [K_STARY]: ['jiné', 'anders', 'autre'] });
test('dvojče se dnes překládá jinak → heslo se neodebere, neshoda',
  S.slovnikRazitkoShoda(S.slovnikRazitko(bez(jineDvojce, K_NOVY), 1), jineDvojce, 1) === false);
/* zámek z main: shoda jen s daty, která přidaná hesla nenesou */
const dM = (d) => d.varianty[0].data, rM = (d) => d.varianty[0].zamek.slovnik;
test('zámek z main bez ruční položky × dnešní slovník → shoda', S.slovnikRazitkoShoda(rM(FM.bez), ZAB, 1, dM(FM.bez)) === true);
test('zámek z main s ruční položkou × dnešní slovník → shoda', S.slovnikRazitkoShoda(rM(FM.rp), ZAB, 1, dM(FM.rp)) === true);
test('zámek z main se zveřejněným přepisem na obou stranách → shoda',
  S.slovnikRazitkoShoda(S.slovnikRazitko(Object.assign({}, main, zverejneno), 1), zivyTed, 1, dM(FM.bez)) === true);
test('zámek z main bez dat varianty → neshoda (nedá se doložit)', S.slovnikRazitkoShoda(rM(FM.bez), ZAB, 1, null) === false);
test('zámek z před TX bez dat varianty → shoda (dvojče se doloží samo)',
  S.slovnikRazitkoShoda(S.slovnikRazitko(stary, 1), ZAB, 1, null) === true);
const sJednotkou = (j) => { const d = JSON.parse(JSON.stringify(dM(FM.rp))); d.ock.zadani.vlastniPolozky.hrubaOck[0].jednotka = j; return d; };
['bm', 'kpl', 'm²'].forEach(j => test('ruční položka s jednotkou „' + j + '" → neshoda',
  S.slovnikRazitkoShoda(rM(FM.rp), ZAB, 1, sJednotkou(j)) === false));
test('ruční položka s jednotkou „ks" → shoda', S.slovnikRazitkoShoda(rM(FM.rp), ZAB, 1, sJednotkou('ks')) === true);
const dNova = JSON.parse(JSON.stringify(dM(FM.bez))); dNova.ock.zadani.kalkVerze = 2;
test('nová kalkulace (kalkVerze 2, příplatek ENGINEERING) → neshoda', S.slovnikRazitkoShoda(rM(FM.bez), ZAB, 1, dNova) === false);
const dEng = JSON.parse(JSON.stringify(dM(FM.rp))); dEng.ock.zadani.vlastniPolozky.hrubaOck[0].nazev = 'Engineering';
test('ruční položka jménem „Engineering" → neshoda', S.slovnikRazitkoShoda(rM(FM.rp), ZAB, 1, dEng) === false);
const dSachty = { sachty: [{ zadani: { vlastniPolozky: { rezie: [{ nazev: 'X', mnozstvi: 1, jednotka: 'kpl' }] } } }] };
test('jednotka „kpl" v ruční položce další šachty → neshoda', S.slovnikRazitkoShoda(rM(FM.rp), ZAB, 1, dSachty) === false);
/* revize Fable K70 S2: volné texty (vlastní řádky specifikace) jdou přes překlad celé */
const sExtra = (label, hodnota) => { const d = JSON.parse(JSON.stringify(dM(FM.bez))); d.techspec.extra = [{ label, hodnota }]; return d; };
test('techspec.extra s názvem „Engineering" → neshoda', S.slovnikRazitkoShoda(rM(FM.bez), ZAB, 1, sExtra('Engineering', 'ano')) === false);
test('techspec.extra s hodnotou „kpl" → neshoda', S.slovnikRazitkoShoda(rM(FM.bez), ZAB, 1, sExtra('Rozsah', 'kpl')) === false);
test('techspec.extra s víceřádkovou hodnotou, řádek „m²:" → neshoda', S.slovnikRazitkoShoda(rM(FM.bez), ZAB, 1, sExtra('Plocha', 'viz výkres\nm²:')) === false);
test('techspec.extra s obyčejným textem → shoda', S.slovnikRazitkoShoda(rM(FM.bez), ZAB, 1, sExtra('Poznámka', 'Engineering dle dohody')) === true);
const dCenik = JSON.parse(JSON.stringify(dM(FM.bez))); dCenik.cenik.jednotkaX = 'kpl';
test('text „kpl" ve větvi ceníku se nepočítá → shoda', S.slovnikRazitkoShoda(rM(FM.bez), ZAB, 1, dCenik) === true);
/* revize Fable K70 S1: strop velikosti dat = „nevím", heslo se neodebere */
const dVelka = { a: Array.from({ length: 25000 }, (_, i) => i), ock: { zadani: { vlastniPolozky: { rezie: [{ nazev: 'X', mnozstvi: 1, jednotka: 'kpl' }] } } } };
test('25 000 uzlů před větví ock s „kpl" → neshoda (strop = nevím)', S.slovnikDataVarianty(dVelka) === null
  && S.slovnikRazitkoShoda(rM(FM.bez), ZAB, 1, dVelka) === false);
let hluboka = {}; const vrch = hluboka; for (let i = 0; i < 13; i++) { hluboka.x = {}; hluboka = hluboka.x; }
hluboka.t = 'nic';
test('zanoření 13 → neshoda (strop = nevím)', S.slovnikDataVarianty(vrch) === null && S.slovnikRazitkoShoda(rM(FM.bez), ZAB, 1, vrch) === false);
test('data fixtury z main jsou pod stropem', S.slovnikDataVarianty(dM(FM.rp)) !== null);
test('main zámek s jinou zveřejněnou verzí → neshoda', S.slovnikRazitkoShoda(rM(FM.bez), ZAB, 2, dM(FM.bez)) === false);
test('vadné razítko → neshoda', S.slovnikRazitkoShoda({ otisk: '<x>' }, zivyTed, 1) === false
  && S.slovnikRazitkoShoda(null, zivyTed, 1) === false);

/* ---------- 3. tiskSlovnikUpozorni (zdroj UI) ---------- */
const UI = fs.readFileSync(__dirname + '/ui/zamek_ui.js', 'utf8');
const vyrizni = (zdroj, zacatek) => { const i = zdroj.indexOf(zacatek); return i < 0 ? '' : zdroj.slice(i, zdroj.indexOf('\n}\n', i) + 2); };
const kod = vyrizni(UI, 'function zamekSlovnikTed(') + vyrizni(UI, 'async function tiskSlovnikUpozorni(');
const dotisk = async (razitko, jazyk, zivy, verze) => {
  const dialogy = [];
  const ctx = { slovnikRazitko: S.slovnikRazitko, slovnikRazitkoOciste: S.slovnikRazitkoOciste,
    slovnikRazitkoShoda: S.slovnikRazitkoShoda, slovnikZmenaPopis: S.slovnikZmenaPopis,
    PREKLAD: zivy, ONLINE_STAV: { slovnik: verze ? { platny: { verze } } : null },
    zamekInfo: v => v.zamek, tiskJazyk: () => jazyk,
    potvrd: async (t) => { dialogy.push(t); return false; }, JSON, Object, String, Array, Promise };
  vm.createContext(ctx); vm.runInContext(kod, ctx);
  const r = await ctx.tiskSlovnikUpozorni('nabidkaTisk', (razitko && razitko.varianty) ? razitko.varianty[0] : { zamek: { slovnik: razitko } });
  return { r, dialogy };
};
(async () => {
  for (const L of ['en', 'de', 'fr']) {
    const a = await dotisk(rTehdy, L, zivyTed, 1);
    test('dotisk ' + L.toUpperCase() + ' staré nabídky (před K66-I1) → bez dialogu', a.r === true && a.dialogy.length === 0, a.dialogy);
  }
  for (const L of ['en', 'de', 'fr']) for (const k of ['bez', 'rp']) {
    const m = await dotisk(FM[k], L, ZAB, 1);
    test('dotisk ' + L.toUpperCase() + ' zámku z main (' + (k === 'rp' ? 's ruční položkou' : 'bez ruční položky') + ') → bez dialogu',
      m.r === true && m.dialogy.length === 0, m.dialogy);
  }
  const mJ = await dotisk({ varianty: [{ zamek: FM.rp.varianty[0].zamek, data: sJednotkou('bm') }] }, 'en', ZAB, 1);
  test('dotisk zámku z main s jednotkou „bm" → dialog', mJ.r === false && mJ.dialogy.length === 1);
  const b = await dotisk({ verze: 1, otisk: 'deadbeef' }, 'en', zivyTed, 1);
  test('jiný otisk → dialog', b.r === false && b.dialogy.length === 1);
  test('text při téže verzi neříká „verze 1 … verze 1"', b.dialogy.length === 1
    && !/verze 1, teď: zveřejněná verze 1/.test(b.dialogy[0]) && /zabudovaný v aplikaci/.test(b.dialogy[0]), b.dialogy);
  const c = await dotisk(rTehdy, 'en', zivyTed, 2);
  test('jiná zveřejněná verze → dialog s „verze 1 … verze 2"', c.r === false && c.dialogy.length === 1
    && /při odeslání: zveřejněná verze 1, teď: zveřejněná verze 2/.test(c.dialogy[0]), c.dialogy);
  const d = await dotisk({ verze: 1, otisk: 'deadbeef' }, 'cz', zivyTed, 1);
  test('CZ dotisk → bez dialogu', d.r === true && d.dialogy.length === 0);
  const e = await dotisk(rTed, 'en', zivyTed, 1);
  test('nová nabídka (stejný otisk) → bez dialogu', e.r === true && e.dialogy.length === 0);

  /* ---------- 3b. dotisk zámku z main přidaná hesla opravdu nečte ----------
   * Současný kód tiskne zámek z main (nabídka: data Wordu i online náhled,
   * smlouva o dílo) EN/DE/FR; každé čtení 5 přidaných hesel z rejstříku
   * PREKLAD_IDX (jediná cesta k heslu, trStav i T v preklad.js) se zapíše. */
  {
    const nacti = f => { const m = require('./' + f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
    const ZC = require('./zkusebni_cenik.js');
    nacti('format.js'); nacti('preklad.js'); nacti('docxgen.js'); nacti('engine.js');
    global.DEFAULT_CENIK = ZC.zkusebniCenik(); nacti('engine_proj.js'); global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
    ['vice_sachet.js', 'techspec.js', 'sleva.js', 'zaokrouhleni.js', 'firma.js', 'plan_plateb.js', 'zakazka.js', 'zamek.js',
      'podminky.js', 'kryci.js', 'kryci_proj.js', 'rucni_polozky.js', 'kontroly.js'].forEach(nacti);
    const N = nacti('nabidka.js'); nacti('nabidka_proj.js'); const NW = nacti('nahled_word.js'); const SOD = nacti('sod.js');
    const J = require('./jekly.json');
    global.NAST = { firma: global.firmaDefault() };
    const cteno = new Set();
    PRIDANA.forEach(k => { const n = P.prekladNorm(k), hod = P.PREKLAD_IDX[n];
      Object.defineProperty(P.PREKLAD_IDX, n, { get() { cteno.add(k); return hod; }, configurable: true, enumerable: true }); });
    test('pojistka sledování: tr("ENGINEERING") se zapíše', (cteno.clear(), P.tr('ENGINEERING', 'en') === 'TECHNICAL ENGINEERING' && cteno.has('ENGINEERING')));
    for (const k of ['bez', 'rp']) for (const L of ['en', 'de', 'fr']) {
      const z = JSON.parse(JSON.stringify(FM[k])), v = z.varianty[0];
      cteno.clear();
      const d = N.nabidkaData(z, v, J, L); const bl = NW.nwBloky(d, L, { foto: '' }); const sd = SOD.sodData(z, v, J, L, null);
      const txt = JSON.stringify(d.placeholders) + JSON.stringify(bl);
      test('dotisk ' + L.toUpperCase() + ' zámku z main (' + k + '): přidaná hesla se nečtou' + (k === 'rp' ? ', ruční položka se tiskne s „ks"' : ''),
        cteno.size === 0 && !!sd && (k !== 'rp' || /KOTEVNÍ KONZOLA ATYP/.test(txt)), [...cteno]);
    }
    /* S2: vlastní řádek specifikace „Engineering" dotisk opravdu přeloží heslem ER */
    { const z = JSON.parse(JSON.stringify(FM.bez)), v = z.varianty[0];
      v.data.techspec.extra = [{ label: 'Engineering', hodnota: 'ano' }];
      cteno.clear(); const d = N.nabidkaData(z, v, J, 'en'); NW.nwBloky(d, 'en', { foto: '' });
      test('techspec.extra „Engineering" dotisk opravdu čte heslo ENGINEERING (proto neshoda)', cteno.has('ENGINEERING'), [...cteno]); }
    PRIDANA.forEach(k => { const n = P.prekladNorm(k); const hod = P.PREKLAD_IDX[n];
      Object.defineProperty(P.PREKLAD_IDX, n, { value: hod, writable: true, configurable: true, enumerable: true }); });
  }

  /* ---------- 4. popis změny ---------- */
  test('popis: stejná verze → zabudovaný slovník, ne „1 → 1"',
    /změnil se slovník zabudovaný v aplikaci/.test(S.slovnikZmenaPopis({ verze: 1 }, { verze: 1 }))
    && !/teď/.test(S.slovnikZmenaPopis({ verze: 1 }, { verze: 1 })));
  test('popis: bez zveřejněné verze obě strany → zabudovaný slovník',
    /zabudovaný v aplikaci/.test(S.slovnikZmenaPopis({ verze: null }, { verze: null })));
  test('popis: jiná verze → „při odeslání … teď …"',
    S.slovnikZmenaPopis({ verze: null }, { verze: 3 }) === 'při odeslání: jen slovník zabudovaný v aplikaci, teď: zveřejněná verze 3');

  console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
})();
