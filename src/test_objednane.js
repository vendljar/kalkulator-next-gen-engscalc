/* OBJEDNANÉ PŘÍPLATKY (#447 C6, rozhodnutí J. V. 21. 10. 2026 ~13:00).
 *
 * Hlídá model src/objednane.js (nabídnuté příplatky zamčené varianty,
 * pravidla zápisu objKontrola, text do krycího listu) a jeho průmět do
 * exportu pro controlling (Řádky = základ + objednané, sloupec „Objednáno
 * dodatečně", datum prodeje, hromadně podle data prodeje). Serverovou
 * cestu uložení zakázky měří netlify/test_prava.mjs (blok C6).
 * Ceník je SMYŠLENÝ (pořadová čísla), skutečné ceny do repozitáře nepatří. */
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
['./preklad.js', './format.js', './cenik.js', './cenik_stari.js', './engine.js', './engine_proj.js', './techspec.js',
  './zakazka.js', './zamek.js', './sleva.js', './zaokrouhleni.js', './podminky.js', './firma.js', './kryci.js']
  .forEach(f => { try { nacti(f); } catch (e) { /* modul v Node nemusí jít načíst */ } });
const eng = require('./engine.js');
const C = nacti('./controlling.js');
const O = nacti('./objednane.js');
const JEKLY = require('./jekly.json');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};
const kopie = x => JSON.parse(JSON.stringify(x));

function smyslenyCenik() {
  const c = kopie(eng.DEFAULT_CENIK);
  let i = 7;
  const projdi = (o) => Object.keys(o).forEach(k => {
    if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) projdi(o[k]);
    else if (typeof o[k] === 'number' || o[k] === null) o[k] = 10 + (i++ % 97) * 3;
  });
  projdi(c);
  c.marze = 0.3; c.dph = 0.21; delete c.ukazkove; delete c.prazdny;
  return c;
}
function zakazka(kdy) {
  const zak = novaZakazka();
  zak.cislo = '2026 - OPR - CN - 0950'; zak.nazevAkce = 'Akce C6'; zak.autor = 'obchodnik@priklad.cz';
  const v = zak.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2 });
  v.data.cenik = smyslenyCenik();
  v.data.sleva = { pct: 0 };
  zamkniVariantu(v, { cislo: variantaCislo(zak, v), kdo: 'obchodnik@priklad.cz', typ: 'nabidka',
    vysledek: zamekVysledekSpocti(v, JEKLY, 'test') });
  v.zamek.kdy = kdy || '2026-10-05T09:00:00Z';
  return zak;
}
const TED = '2026-10-21T10:00:00Z';
const OBCH = { email: 'obchodnik@priklad.cz', role: 'Obchodník' };
const JINY = { email: 'jiny@priklad.cz', role: 'Obchodník' };
const VED = { email: 'vedouci@priklad.cz', role: 'Vedoucí' };
const ADM = { email: 'spravce@priklad.cz', role: 'Administrátor' };

const zak = zakazka();
const v = zak.varianty[0];
const nab = O.objNabidnute(v, JEKLY);
test('nabídnuté příplatky zamčené varianty: aspoň dva, bez vynechaných', nab.length >= 2
  && !nab.some(p => (v.data.ock.zadani.priplatkyVynechat || []).includes(p.key)), nab.map(p => p.key));
const vynechany = (v.data.ock.zadani.priplatkyVynechat || [])[0];
test('nezamčená varianta nenabízí nic', O.objNabidnute(Object.assign(kopie(v), { zamek: null }), JEKLY).length === 0);

/* ---- objKontrola: pravidla zápisu ---- */
const K = (stara, nova, rel, ted) => O.objKontrola(stara, nova, rel, { jekly: JEKLY, ted: ted || TED });
const sObj = (z, klice, datum) => { const n = kopie(z); n.objednane = { varianta: v.id, klice, datum: datum || '2026-10-20' }; return n; };
/* Jednotlivé příplatky (přechodové plechy jsou dvojice — K6-K3, vlastní blok níž). */
const nabJ = nab.filter(p => !O.OBJ_SKUPINY.some(g => g.klice.includes(p.key)));
const k1 = nabJ[0].key, k2 = nabJ[1].key;
test('obchodník zakázky zapíše objednaný příplatek', K(zak, sObj(zak, [k1]), OBCH) === null);
test('jiný obchodník ne (403)', (K(zak, sObj(zak, [k1]), JINY) || {}).status === 403);
test('vedoucí a administrátor ano', K(zak, sObj(zak, [k1]), VED) === null && K(zak, sObj(zak, [k1]), ADM) === null);
test('nenabídnutý příplatek odmítne (400)', (K(zak, sObj(zak, ['neexistuje']), ADM) || {}).status === 400
  && (!vynechany || (K(zak, sObj(zak, [vynechany]), ADM) || {}).status === 400));
test('zdvojený klíč odmítne (400)', (K(zak, sObj(zak, [k1, k1]), ADM) || {}).status === 400);
test('datum v budoucnosti odmítne (400)', (K(zak, sObj(zak, [k1], '2026-10-22'), OBCH) || {}).status === 400);
test('neplatné datum odmítne (400)', (K(zak, sObj(zak, [k1], '2026-02-30'), OBCH) || {}).status === 400);
{ const n = sObj(zak, [k1]); n.objednane.varianta = 'neexistuje';
  test('záznam k neexistující variantě odmítne (400)', (K(zak, n, ADM) || {}).status === 400); }
{ const z = kopie(zak); z.varianty[0].zamek = null; const n = sObj(z, [k1]);
  test('k nezamčené variantě odmítne (400)', (K(z, n, ADM) || {}).status === 400); }
test('tvar pole místo objektu odmítne (400)', (K(zak, Object.assign(kopie(zak), { objednane: [k1] }), ADM) || {}).status === 400);
/* K6-K1 (D3): vlastní příplatek varianty má klíč `vlastni:N` — tvar
 * klíče ho pustí (dřív 400), jiný tvar s dvojtečkou dál ne. */
{ const z = kopie(zak); const zv = z.varianty[0];
  zv.data.ock.zadani.priplatkyVlastni = [{ nazev: 'Vlastní příplatek', mnozstvi: 1, cena: 50 }];
  zv.zamek.vysledek = zamekVysledekSpocti(zv, JEKLY, 'test');
  const nabV = O.objNabidnute(zv, JEKLY).map(p => p.key);
  const n = kopie(z); n.objednane = { varianta: zv.id, klice: ['vlastni:0'], datum: '2026-10-20' };
  test('K6-K1: vlastní příplatek nabídnutý a objednatelný (null)', nabV.includes('vlastni:0') && K(z, n, OBCH) === null, { nabV, k: K(z, n, OBCH) });
  const spatne = ['vlastni:x', 'vlastni:', 'vlastni:1:2', 'jiny:1', 'vlastni:12345'].map(k => { const m = kopie(n); m.objednane.klice = [k]; return (K(z, m, ADM) || {}).status; });
  test('K6-K1: jiný tvar s dvojtečkou odmítne (400)', spatne.every(x => x === 400), spatne); }
/* K6-S1, K6-S3 (D3): objekt nebo pole v klice/varianta/datum → 400, ne výjimka. */
{ const zly = [o => { o.klice = [{ toString: 1 }]; }, o => { o.varianta = { toString: 1 }; }, o => { o.datum = { toString: 1 }; },
    o => { o.varianta = [o.varianta]; }, o => { o.klice = 'k1'; }, o => { o.klice = [1]; }];
  const st = zly.map(f => { const n = sObj(zak, [k1]); f(n.objednane); try { return (K(zak, n, ADM) || {}).status; } catch (e) { return 'výjimka ' + e.message; } });
  test('K6-S1/S3: neplatný tvar záznamu → 400 (i beze změny proti uložené)', st.every(x => x === 400), st);
  const ul = sObj(zak, [k1]); ul.objednane.varianta = [v.id];
  let st2; try { st2 = (K(ul, kopie(ul), ADM) || {}).status; } catch (e) { st2 = 'výjimka'; }
  test('K6-S3: varianta jako pole neprojde ani jako „beze změny“', st2 === 400, st2);
  const n201 = sObj(zak, Array.from({ length: O.OBJ_MAX_KLICU + 1 }, (_, i) => 'k' + i));
  test('nad strop klíčů (201) → 400 neplatný tvar', /tvar/.test((K(zak, n201, ADM) || {}).chyba || ''), K(zak, n201, ADM));
  let ot; try { ot = O.objOtisk({ varianta: { toString: 1 }, klice: [{ toString: 1 }], datum: 'x' }); } catch (e) { ot = 'výjimka'; }
  test('K6-S1: objOtisk s objekty nevyhodí výjimku', typeof ot === 'string' && ot !== 'výjimka', ot); }
const ulozena = sObj(zak, [k1]);
test('beze změny (jen jiné razítko kdo/kdy) projde i cizímu', K(ulozena, Object.assign(kopie(ulozena),
  { objednane: Object.assign({}, ulozena.objednane, { kdo: 'podvrh', kdy: 'x' }) }), JINY) === null);
test('smazání objednaných: obchodník zakázky ano, cizí ne', K(ulozena, zak, OBCH) === null && (K(ulozena, zak, JINY) || {}).status === 403);
/* Po podpisu SoD (Q3: ručně vyplněné datum podpisu ≤ dnes) jen administrátor. */
const podpis = (z, d) => { z.varianty[0].data.kryci = Object.assign({}, z.varianty[0].data.kryci, { hodnoty: { sodDatumPodpisu: d } }); return z; };
const poSod = podpis(kopie(ulozena), '2026-10-20');
test('podpis se pozná jen z ručně vyplněného data ≤ dnes', O.objPodepsano(poSod.varianty[0], TED)
  && !O.objPodepsano(v, TED) && !O.objPodepsano(podpis(kopie(ulozena), '2026-10-25').varianty[0], TED)
  && !O.objPodepsano(podpis(kopie(ulozena), 'zítra').varianty[0], TED));
test('datum podpisu v budoucnosti: obchodník dál smí', K(podpis(kopie(ulozena), '2026-10-25'), sObj(ulozena, [k1, k2]), OBCH) === null);
test('po podpisu SoD obchodník nezmění ani nesmaže (403)', (K(poSod, sObj(poSod, [k1, k2]), OBCH) || {}).status === 403
  && (K(poSod, Object.assign(kopie(poSod), { objednane: undefined }), OBCH) || {}).status === 403);
test('po podpisu SoD vedoucí taky ne (403), administrátor ano', (K(poSod, sObj(poSod, [k2]), VED) || {}).status === 403
  && K(poSod, sObj(poSod, [k2]), ADM) === null);
test('po podpisu SoD bez předchozího záznamu: obchodník nezapíše (403)', (K(Object.assign(kopie(poSod), { objednane: undefined }), sObj(poSod, [k1]), OBCH) || {}).status === 403);

/* ---- klient: objNastav, text do krycího listu ---- */
{ const z = kopie(zak);
  test('objNastav k zamčené variantě zapíše klíče a datum', O.objNastav(z, z.varianty[0], [k1, k1, k2], '2026-10-20') === ''
    && z.objednane.klice.join() === [k1, k2].join() && z.objednane.datum === '2026-10-20');
  test('objNastav bez data doplní dnešek', (O.objNastav(z, z.varianty[0], [k1], '', { ted: TED }), z.objednane.datum === '2026-10-21'));
  test('objNastav bez data vezme datum podpisu z krycího listu', (O.objNastav(podpis(z, '2026-10-18'), z.varianty[0], [k1], '', { ted: TED }), z.objednane.datum === '2026-10-18'));
  test('objNastav s prázdným seznamem záznam smaže', O.objNastav(z, z.varianty[0], []) === '' && !('objednane' in z));
  const zn = kopie(zak); zn.varianty[0].zamek = null;
  test('objNastav k nezamčené variantě vrátí chybu', /zamčené/.test(O.objNastav(zn, zn.varianty[0], [k1])));
  test('text krycího listu', O.objText(ulozena, ulozena.varianty[0], JEKLY) === '1 – ' + nabJ[0].nazev + ' (20. 10. 2026)'
    && O.objText(zak, v, JEKLY) === 'nic objednáno');
  if (typeof kryciCtx === 'function') {
    let ctx = null; try { ctx = kryciCtx(ulozena, ulozena.varianty[0], JEKLY); } catch (e) { ctx = { chyba: e.message }; }
    test('krycí list nese údaj Objednané příplatky', !!ctx && ctx.objednane === O.objText(ulozena, ulozena.varianty[0], JEKLY), ctx && ctx.objednane);
    const pole = (KRYCI_SEKCE || []).flatMap(s => s.pole).find(p => p.id === 'priplatkyObjednane');
    test('pole „Objednané příplatky" ve stejných verzích jako „Příplatky v nabídce"', !!pole
      && JSON.stringify(pole.verze) === JSON.stringify((KRYCI_SEKCE || []).flatMap(s => s.pole).find(p => p.id === 'priplatkyNabidka').verze));
  }
}

/* ---- K31-N1 (#447 C6, 22. 10. 2026): krycí list zamčené varianty ----
 * Zmrazení P9.5 při tisku nabídky opsalo „nic objednáno" do data.kryci.zmrazeno
 * a krycí list ho ukazoval i po zápisu objednaných. Pojistka: nad v22.10.1
 * selže (1) a (2) — řádek nese „nic objednáno". */
if (typeof kryciData === 'function' && typeof kryciZmrazPodminky === 'function') {
  const radek = (z) => { const d = kryciData(z, z.varianty[0], JEKLY, 'bo');
    const r = d.sekce.flatMap(s => s.radky).find(x => x[0] === 'Objednané příplatky'); return r ? r[1] : undefined; };
  const z1 = kopie(zak); delete z1.objednane;
  kryciZmrazPodminky(z1, z1.varianty[0], JEKLY);   // tisk nabídky (P9.5)
  test('K31-N1: zmrazení při tisku nabídky objednané příplatky neopíše',
    !(z1.varianty[0].data.kryci.zmrazeno || {}).hasOwnProperty('priplatkyObjednane'), z1.varianty[0].data.kryci.zmrazeno);
  test('K31-N1 (3): bez objednaných krycí list ukáže „nic objednáno"', radek(z1) === 'nic objednáno', radek(z1));
  O.objNastav(z1, z1.varianty[0], [k1, k2], '2026-10-20');
  test('K31-N1 (1): po objNastav krycí list zamčené varianty = objText', radek(z1) === O.objText(z1, z1.varianty[0], JEKLY)
    && radek(z1) !== 'nic objednáno', [radek(z1), O.objText(z1, z1.varianty[0], JEKLY)]);
  const z2 = kopie(z1); z2.varianty[0].data.kryci.zmrazeno = Object.assign({}, z2.varianty[0].data.kryci.zmrazeno, { priplatkyObjednane: 'nic objednáno' });
  const pred = JSON.stringify(z2.varianty[0].data);
  test('K31-N1 (2): varianta zmrazená dřív („nic objednáno" v datech) ukáže skutečné objednané', radek(z2) === O.objText(z2, z2.varianty[0], JEKLY), radek(z2));
  test('K31-N1: data zamčené varianty se nepřepisují', JSON.stringify(z2.varianty[0].data) === pred);
}

/* ---- export pro controlling ---- */
{
  const e0 = C.ctrlExportVarianty(zak, v, { jekly: JEKLY });
  const e1 = C.ctrlExportVarianty(ulozena, ulozena.varianty[0], { jekly: JEKLY });
  test('export bez prodeje: žádný řádek objednaný', e0.ok && !e0.radky.some(r => r.objednano) && e0.hlavicka.datumProdeje === '');
  const obj = e1.radky.filter(r => r.objednano);
  test('export prodané zakázky: objednaný příplatek označen', e1.ok && obj.length >= 1 && obj.every(r => r.pKey === k1)
    && e1.hlavicka.datumProdeje === '2026-10-20', obj.map(r => r.klic));
  const L = (e) => { const l = C.ctrlExportListy(e); return { r: l.find(x => x.nazev === 'Řádky').rows, p: l.find(x => x.nazev === C.CTRL_LIST_PRIPLATKY).rows, popis: l.find(x => x.nazev === 'Popis').rows }; };
  const l0 = L(e0), l1 = L(e1);
  const iObj = C.CTRL_RADKY_HLAVICKA.indexOf('Objednáno dodatečně');
  test('Řádky = základ + objednané; příplatky-volby o ně kratší', iObj > 0 && l1.r.length === l0.r.length + obj.length
    && l1.p.length === l0.p.length - obj.length);
  test('sloupec Objednáno dodatečně = ano jen u objednaných', l1.r.slice(1).filter(r => r[iObj] === 'ano').length === obj.length
    && l0.r.slice(1).every(r => r[iObj] === 'ne'));
  test('Popis nese datum prodeje', (l1.popis.find(r => r[0] === 'Datum prodeje (objednané příplatky)') || [])[1] === '2026-10-20');
  const jina = kopie(ulozena); jina.objednane.varianta = 'jina';
  test('záznam k jiné variantě se do exportu nepromítne', !C.ctrlExportVarianty(jina, jina.varianty[0], { jekly: JEKLY }).radky.some(r => r.objednano));

  const F = (q) => C.ctrlHromadnyFiltr(Object.assign({ pd: 'vse' }, q)).filtr;   // #504: bez filtru stavu Pipedrive
  test('hromadně: filtr podle prodeje přijme, neznámý výběr odmítne', F({ od: '2026-10-01', do: '2026-10-31', podle: 'prodej' }).podle === 'prodej'
    && !C.ctrlHromadnyFiltr({ od: '2026-10-01', do: '2026-10-31', podle: 'tisk' }).ok);
  const opts = { jekly: JEKLY };
  test('hromadně podle prodeje: prodaná v období ano, bez prodeje ne',
    C.ctrlHromadnyZakazka(ulozena, F({ od: '2026-10-20', do: '2026-10-20', podle: 'prodej' }), opts).ok
    && C.ctrlHromadnyZakazka(zak, F({ od: '2026-10-01', do: '2026-10-31', podle: 'prodej' }), opts).mimo === true);
  test('hromadně podle prodeje: rozhoduje datum prodeje, ne zámku (zámek 5. 10., prodej 20. 10.)',
    C.ctrlHromadnyZakazka(ulozena, F({ od: '2026-10-01', do: '2026-10-10', podle: 'prodej' }), opts).mimo === true
    && C.ctrlHromadnyZakazka(ulozena, F({ od: '2026-10-01', do: '2026-10-10' }), opts).ok);
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
if (fail) process.exit(1);
