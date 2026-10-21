/* ============================================================
 * Test O10 / K4-N1 — kapitoly IV.–VI. a doložky nabídky OCK odeslané
 * varianty se po změně Firmy nemění (rozhodnutí J. V. 21. 10. 2026).
 *
 * Při PRVNÍM zamčení varianty opíše kryciZmrazPodminky kromě vět kalendáře
 * (K3-N2) i texty kapitol (`data.kryci.zmrazenoPodminky.kapitoly`,
 * firmaKapitolySnimek). Dotisk zamčené varianty je čte odtamtud
 * (nabidkaKapitolyFirma); nezamčená varianta a varianta zamčená před O10
 * (bez snímku) tisknou aktuální Firmu jako dosud.
 * Firma i zakázky jsou ukázkové. Spuštění: node src/test_o10_kapitoly.js
 * ============================================================ */
const fs = require('fs');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
const PR = nacti('./preklad.js');
global.tr = PR.tr;
nacti('./docxgen.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./podminky.js');
const FM = nacti('./firma.js');
nacti('./plan_plateb.js');
const zk = nacti('./zakazka.js');
const kr = nacti('./kryci.js');
const N = nacti('./nabidka.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); } };
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));
const SYM = ['FIRMA_NAB_POZADAVKY', 'FIRMA_NAB_TERMINY', 'FIRMA_NAB_PREDANI', 'FIRMA_NAB_DOLOZKY'];
const SYM_JAZ = ['FIRMA_NAB_DOLOZKY_EN', 'FIRMA_NAB_DOLOZKY_DE', 'FIRMA_NAB_PREDANI_DE'];

const firmaPred = () => Object.assign({}, FM.DEFAULT_FIRMA, { nazev: 'Zkušební firma s.r.o.' });
/* Správce po odeslání změní kapitoly IV.–VI., doložky (CZ, EN, DE) a název firmy. */
const zmenFirmu = f => {
  f.kapPozadavky = 'ZMĚNĚNO požadavky.'; f.kapTerminy = 'ZMĚNĚNO termíny {TERMIN}.';
  f.kapPredani = 'ZMĚNĚNO předání.'; f.dolozky = 'ZMĚNĚNO doložka {FIRMA}';
  f.dolozkyEn = 'CHANGED clause {FIRMA}'; f.dolozkyDe = 'GEÄNDERT Klausel.'; f.kapPredaniDe = 'GEÄNDERT Übergabe.';
  f.nazev = 'Přejmenovaná firma a.s.';
};
const novaVar = () => { const zak = zk.novaZakazka(); zak.cislo = '2026 - OPR - CN - 469';
  const v = zak.varianty[0]; v.data.cenik = ZC.zkusebniCenik(); v.data.cenik.kurzEurKc = 25; return { zak, v }; };
const tisk = (zak, v) => {
  const out = {};
  ['cz', 'en', 'de'].forEach(L => {
    const ph = N.nabidkaData(zak, v, JEKLY, L).placeholders;
    SYM.forEach(s => { out[L + ':' + s] = ph[s]; });
    if (L === 'cz') SYM_JAZ.forEach(s => { out[s] = ph[s]; });
  });
  return out;
};

/* ---------- 1) zamčená varianta: dotisk beze změny ---------- */
{
  global.NAST = { firma: firmaPred() };
  const { zak, v } = novaVar();
  const pred = tisk(zak, v);
  test('výchozí stav: doložka CZ nese název firmy z doby odeslání', /Zkušební firma s\.r\.o\./.test(pred['cz:FIRMA_NAB_DOLOZKY']),
    pred['cz:FIRMA_NAB_DOLOZKY']);
  kr.kryciZmrazPodminky(zak, v, JEKLY);
  v.zamek = { zamceno: true };
  const sn = v.data.kryci.zmrazenoPodminky && v.data.kryci.zmrazenoPodminky.kapitoly;
  test('snímek kapitol je ve variantě (data.kryci.zmrazenoPodminky.kapitoly)', !!sn && sn.v === 1 && typeof sn.dolozky === 'string'
    && sn.nazev === 'Zkušební firma s.r.o.', sn && Object.keys(sn));
  zmenFirmu(NAST.firma);
  const po = tisk(zak, v);
  Object.keys(pred).forEach(k => test('zamčená: dotisk ' + k + ' po změně Firmy beze změny', po[k] === pred[k],
    [String(pred[k]).slice(0, 80), String(po[k]).slice(0, 80)]));

  /* ---------- 2) nezamčená varianta: nový text ---------- */
  const n = novaVar();
  const nova = tisk(n.zak, n.v);
  test('nezamčená: kapitola IV. z aktuální Firmy', nova['cz:FIRMA_NAB_POZADAVKY'] === 'ZMĚNĚNO požadavky.', nova['cz:FIRMA_NAB_POZADAVKY']);
  test('nezamčená: doložka s novým názvem firmy', nova['cz:FIRMA_NAB_DOLOZKY'] === 'ZMĚNĚNO doložka Přejmenovaná firma a.s.',
    nova['cz:FIRMA_NAB_DOLOZKY']);
  test('nezamčená: doložka EN a DE z aktuální Firmy', nova['en:FIRMA_NAB_DOLOZKY'] === 'CHANGED clause Přejmenovaná firma a.s.'
    && nova['de:FIRMA_NAB_DOLOZKY'] === 'GEÄNDERT Klausel.', [nova['en:FIRMA_NAB_DOLOZKY'], nova['de:FIRMA_NAB_DOLOZKY']]);
  test('nezamčená: jazykový symbol {{FIRMA_NAB_PREDANI_DE}} z aktuální Firmy', nova.FIRMA_NAB_PREDANI_DE === 'GEÄNDERT Übergabe.',
    nova.FIRMA_NAB_PREDANI_DE);
  test('nezamčená: {TERMIN} v kapitole V. se dosadí', /^ZMĚNĚNO termíny .+\.$/.test(nova['cz:FIRMA_NAB_TERMINY'])
    && nova['cz:FIRMA_NAB_TERMINY'].indexOf('{TERMIN}') < 0, nova['cz:FIRMA_NAB_TERMINY']);

  /* klon odeslané varianty (nezamčený, snímek v datech) tiskne aktuální Firmu */
  const klon = JSON.parse(JSON.stringify(v)); klon.zamek = null;
  const k = tisk(zak, klon);
  test('nezamčená kopie se snímkem v datech: tiskne aktuální Firmu', k['cz:FIRMA_NAB_PREDANI'] === 'ZMĚNĚNO předání.', k['cz:FIRMA_NAB_PREDANI']);

  /* ---------- 3) stará zamčená bez snímku: aktuální Firma ---------- */
  const s = novaVar();
  global.NAST = { firma: firmaPred() };
  kr.kryciZmrazPodminky(s.zak, s.v, JEKLY);
  delete s.v.data.kryci.zmrazenoPodminky.kapitoly;          // zamčená před O10
  s.v.zamek = { zamceno: true };
  zmenFirmu(NAST.firma);
  const st = tisk(s.zak, s.v);
  test('zamčená před O10 (bez snímku kapitol): tiskne aktuální Firmu jako dosud',
    st['cz:FIRMA_NAB_POZADAVKY'] === 'ZMĚNĚNO požadavky.' && st['cz:FIRMA_NAB_DOLOZKY'] === 'ZMĚNĚNO doložka Přejmenovaná firma a.s.'
    && st.FIRMA_NAB_DOLOZKY_DE === 'GEÄNDERT Klausel.', [st['cz:FIRMA_NAB_POZADAVKY'], st['cz:FIRMA_NAB_DOLOZKY']]);
  const s2 = novaVar();
  kr.kryciZmrazPodminky(s2.zak, s2.v, JEKLY);
  delete s2.v.data.kryci.zmrazenoPodminky;                  // zamčená před v20.10.2 — žádný snímek
  s2.v.zamek = { zamceno: true };
  const st2 = tisk(s2.zak, s2.v);
  test('zamčená před v20.10.2 (bez snímku podmínek): tiskne aktuální Firmu', st2['cz:FIRMA_NAB_PREDANI'] === 'ZMĚNĚNO předání.',
    st2['cz:FIRMA_NAB_PREDANI']);
}

/* ---------- 4) snímek: velikost a poškozený tvar ---------- */
{
  const f = firmaPred(); f.kapPredani = '   '; f.dolozkyFr = '';
  const sn = FM.firmaKapitolySnimek(f);
  test('snímek nese jen neprázdná pole (strop zakázky 4 MB, K4-N18)', !('kapPredani' in sn) && !('dolozkyFr' in sn)
    && sn.kapPozadavky === f.kapPozadavky, Object.keys(sn));
  test('snímek výchozích textů je malý (< 12 kB)', Buffer.byteLength(JSON.stringify(sn)) < 12 * 1024,
    Buffer.byteLength(JSON.stringify(sn)));
  /* kapitola prázdná při odeslání zůstane v dotisku prázdná, i když ji správce pak vyplní */
  const z = FM.firmaKapitolyZeSnimku(Object.assign(firmaPred(), { kapPredani: 'Nově vyplněno.' }), sn);
  test('prázdná kapitola z doby odeslání zůstane v dotisku prázdná', FM.firmaKapitola(z, 'kapPredani', 'cz').prazdne);
  let bad = null;
  try { bad = FM.firmaKapitolyZeSnimku(firmaPred(), { v: 1, dolozky: 42, nazev: { x: 1 } }); } catch (e) { bad = null; }
  test('poškozený snímek: bez výjimky, vadné pole = prázdné', !!bad && bad.dolozky === '' && bad.nazev === ''
    && FM.firmaKapitola(bad, 'dolozky', 'cz').prazdne);
  test('bez snímku = aktuální Firma', FM.firmaKapitolyZeSnimku(f, null) === f && FM.firmaKapitolyZeSnimku(f, []) === f);
}

console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
if (fail) process.exit(1);
