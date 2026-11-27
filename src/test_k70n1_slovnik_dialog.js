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
 *      jeho překlad = překlad dvojčete (dotisk dá týž text);
 *   2. slovnikRazitkoShoda: staré razítko (slovník bez hesla K66-I1,
 *      i se zveřejněnou verzí) → shoda; jiný otisk, jiná zveřejněná verze,
 *      změněný překlad dvojčete → neshoda;
 *   3. tiskSlovnikUpozorni ze zdroje UI: staré razítko → bez dialogu;
 *      jiný otisk / jiná verze → dialog; CZ → bez dialogu;
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
test('seznam přidaných hesel nese právě K66-I1', S.SLOVNIK_PRIDANA_HESLA.length === 1
  && S.SLOVNIK_PRIDANA_HESLA[0].id === 'K66-I1' && S.SLOVNIK_PRIDANA_HESLA[0].hesla[0].klic === K_NOVY
  && S.SLOVNIK_PRIDANA_HESLA[0].hesla[0].dvojce === K_STARY);

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
  const r = await ctx.tiskSlovnikUpozorni('nabidkaTisk', { zamek: { slovnik: razitko } });
  return { r, dialogy };
};
(async () => {
  for (const L of ['en', 'de', 'fr']) {
    const a = await dotisk(rTehdy, L, zivyTed, 1);
    test('dotisk ' + L.toUpperCase() + ' staré nabídky (před K66-I1) → bez dialogu', a.r === true && a.dialogy.length === 0, a.dialogy);
  }
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
