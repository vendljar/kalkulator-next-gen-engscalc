/* ===== K40-N2, K40-N5: VĚROHODNOST CENÍKU MŮSTKŮ =====
 * (dávka K40a, roadmapa #579, 11. 11. 2026)
 *
 * N2: referenční šířka můstku hlídala jen „> 0" — šířka v metrech (2 místo
 *     2 000) dala tisíckrát dražší můstek bez varování. Rozsah 500–5 000 mm
 *     (rozhodnutí J. V. 8a); mimo něj potvrzení, hodnota se nemění.
 * N5: kontrola četla jen tuzemský ceník; zahraniční řada s nulovou montáží
 *     (a bez vlastní montáže můstků) počítala montáž můstků za 0 Kč/hod.
 *
 * Sada: jádro (mustkyCenikKontrola), cenik_rady (mustkyCenikKontrolaZahr)
 * a SKUTEČNÝ dialog progMustkyPotvrd (ui/program_ui.js) ve vm — s potvrzením
 * i bez. Server ověřuje netlify/test_k40_mustky_program.mjs.
 *
 * POJISTKA: nad c664c9e selže (šířka 2 mm → ok: true; zahraniční nula bez
 * dotazu); mutace „[K40a] N2/N5" v mutace_jadro.mjs.
 */
const fs = require('fs');
const vm = require('vm');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
const eng = nacti('./engine.js');
nacti('./cenik.js');
nacti('./cenik_stari.js');   // cenikNastavHodnotu pro cenikSlozRadu
const CR = nacti('./cenik_rady.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};
const novy = (zmena) => Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky(), zmena || {});

/* ---- N2: rozsah referenční šířky ---- */
test('úplný ceník (šířka 2 000 mm) → ok', eng.mustkyCenikKontrola(novy()).ok);
[500, 1200, 5000].forEach(s => test('šířka ' + s + ' mm v rozsahu → ok', eng.mustkyCenikKontrola(novy({ mustekRefSirkaMm: s })).ok));
[2, 1.5, 499, 5001, 20000].forEach(s => {
  const k = eng.mustkyCenikKontrola(novy({ mustekRefSirkaMm: s }));
  test('šířka ' + s + ' mm mimo rozsah → potvrzení', !k.ok && k.chybi.includes('mustekRefSirkaMm')
    && /mimo věrohodný rozsah 500–5 000 mm/.test(k.text), k);
});
{
  const k = eng.mustkyCenikKontrola(novy({ mustekRefSirkaMm: 2, mustekMontazHodKc: 0 }));
  test('šířka mimo rozsah + nulová montáž → obojí v textu i v chybi', !k.ok
    && k.chybi.includes('mustekRefSirkaMm') && k.chybi.includes('mustekMontazHodKc')
    && /mimo věrohodný/.test(k.text) && /sazba montáže/.test(k.text), k);
}
{ /* skladebný model: šířka škáluje i nosnou konstrukci */
  const sk = {}; eng.MUSTKY_SKLADBA_KLICE.forEach(x => { sk[x] = 100; });
  const k = eng.mustkyCenikKontrola(novy(Object.assign({}, sk, { mustekRamBmKc: 900, mustekRefSirkaMm: 2 })));
  test('skladebný model se šířkou 2 mm → potvrzení', !k.ok && k.chybi.includes('mustekRefSirkaMm'), k);
  const k2 = eng.mustkyCenikKontrola(novy(Object.assign({}, sk, { mustekRamBmKc: 900 })));
  test('úplný skladebný model v rozsahu → ok', k2.ok, k2);
}
test('starý tvar (bez šířky) se rozsahem nehlídá', !/mimo věrohodný/.test(eng.mustkyCenikKontrola(ZC.zkusebniCenik()).text));
test('kontrola hodnotu nemění', (() => { const c = novy({ mustekRefSirkaMm: 2 }); eng.mustkyCenikKontrola(c); return c.mustekRefSirkaMm === 2; })());
test('konstanty rozsahu 500 a 5 000', eng.MUSTEK_REF_SIRKA_MIN_MM === 500 && eng.MUSTEK_REF_SIRKA_MAX_MM === 5000);

/* ---- N5: složená zahraniční řada ---- */
/* Bez funkce (stav před opravou) se zahraniční řada nekontroluje = „ok". */
const KZ = (...a) => (typeof CR.mustkyCenikKontrolaZahr === 'function') ? CR.mustkyCenikKontrolaZahr(...a) : { ok: true, chybi: [], text: '' };
const zahr = (ceny) => ({ ceny: ceny || {}, jenZahr: {} });
test('bez zahraničních odchylek → ok', KZ(novy(), zahr()).ok);
test('zahraniční montáž 0, montáž můstků nevyplněná → potvrzení', (() => {
  const k = KZ(novy(), zahr({ 'C.montazHodKc': 0 }));
  return !k.ok && k.chybi.includes('zahr:mustekMontazHodKc') && /^Zahraniční řada/.test(k.text);
})());
test('zahraniční montáž 0, ale vlastní montáž můstků 600 → ok',
  KZ(novy(), zahr({ 'C.montazHodKc': 0, 'C.mustekMontazHodKc': 600 })).ok);
test('zahraniční montáž můstků výslovně 0 → potvrzení',
  !KZ(novy(), zahr({ 'C.mustekMontazHodKc': 0 })).ok);
test('zahraniční šířka můstku 2 mm → potvrzení', (() => {
  const k = KZ(novy(), zahr({ 'C.mustekRefSirkaMm': 2 }));
  return !k.ok && k.chybi.includes('zahr:mustekRefSirkaMm');
})());
test('chyba už v tuzemsku se v zahraničí neopakuje',
  KZ(novy({ mustekMontazHodKc: 0 }), zahr()).ok);
test('starý tvar → zahraniční kontrola mlčí (řekne tuzemská)', KZ(ZC.zkusebniCenik(), zahr({ 'C.montazHodKc': 0 })).ok);
test('ceník se kontrolou nemění', (() => { const c = novy(); const p = JSON.stringify(c);
  KZ(c, zahr({ 'C.montazHodKc': 0 })); return JSON.stringify(c) === p; })());

/* ---- dialog: skutečný progMustkyPotvrd ---- */
const t = fs.readFileSync(__dirname + '/ui/program_ui.js', 'utf8');
const i = t.indexOf('async function progMustkyPotvrd(');
let h = 0, j = t.indexOf('{', i);
for (; j < t.length; j++) { if (t[j] === '{') h++; else if (t[j] === '}' && --h === 0) break; }
const fDialog = t.slice(i, j + 1);
test('progMustkyPotvrd je v ui/program_ui.js', i >= 0);
async function dialog(ctx, odpoved, platneZahr) {
  const dotazy = [];
  const c = { mustkyCenikKontrola: eng.mustkyCenikKontrola, mustkyCenikKontrolaZahr: CR.mustkyCenikKontrolaZahr,
    cenikZahrSluc: CR.cenikZahrSluc, CENIK_ZAHR: platneZahr || zahr(),
    potvrd: async (text) => { dotazy.push(text); return odpoved; } };
  vm.createContext(c);
  const vysl = await vm.runInContext(fDialog + '\n progMustkyPotvrd(ctx);', Object.assign(c, { ctx }));
  return { vysl, dotazy };
}
(async () => {
  let r = await dialog({ cenik: novy() }, false);
  test('dialog: úplný ceník → bez dotazu', r.vysl === true && r.dotazy.length === 0, r);
  const ctx1 = { cenik: novy({ mustekRefSirkaMm: 2 }) };
  r = await dialog(ctx1, false);
  test('dialog: šířka 2 mm, správce odmítne → nezveřejní', r.vysl === false && r.dotazy.length === 1
    && /mimo věrohodný/.test(r.dotazy[0]) && !ctx1.mustkyPotvrzeno, r);
  r = await dialog(ctx1, true);
  test('dialog: šířka 2 mm, správce potvrdí → mustkyPotvrzeno', r.vysl === true && ctx1.mustkyPotvrzeno === true, r);
  const ctx2 = { cenik: novy(), zahranicni: zahr({ 'C.montazHodKc': 0 }) };
  r = await dialog(ctx2, false);
  test('dialog: zahraniční montáž 0 → dotaz se zahraniční větou', r.vysl === false && r.dotazy.length === 1
    && /Zahraniční řada/.test(r.dotazy[0]), r);
  r = await dialog(ctx2, true);
  test('dialog: zahraniční montáž 0 potvrzeno → mustkyPotvrzeno', r.vysl === true && ctx2.mustkyPotvrzeno === true, r);
  r = await dialog({ cenik: novy(), zahranicni: zahr() }, false, zahr({ 'C.montazHodKc': 0 }));
  test('dialog: nula v PLATNÝCH zahraničních odchylkách (CENIK_ZAHR) se taky ozve', r.vysl === false && r.dotazy.length === 1, r);
  console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
})();
