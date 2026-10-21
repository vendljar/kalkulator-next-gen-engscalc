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
const k1 = nab[0].key, k2 = nab[1].key;
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
const ulozena = sObj(zak, [k1]);
test('beze změny (jen jiné razítko kdo/kdy) projde i cizímu', K(ulozena, Object.assign(kopie(ulozena),
  { objednane: Object.assign({}, ulozena.objednane, { kdo: 'podvrh', kdy: 'x' }) }), JINY) === null);
test('smazání objednaných: obchodník zakázky ano, cizí ne', K(ulozena, zak, OBCH) === null && (K(ulozena, zak, JINY) || {}).status === 403);
/* Po vytištěné SoD jen administrátor. */
const poSod = kopie(ulozena); zamkniVariantu(poSod.varianty[0], { typ: 'sod', kdo: 'obchodnik@priklad.cz' });
test('vytištěná SoD se pozná (dotisk typu sod)', O.objSodVytistena(poSod.varianty[0]) && !O.objSodVytistena(v));
test('po SoD obchodník nezmění ani nesmaže (403)', (K(poSod, sObj(poSod, [k1, k2]), OBCH) || {}).status === 403
  && (K(poSod, Object.assign(kopie(poSod), { objednane: undefined }), OBCH) || {}).status === 403);
test('po SoD vedoucí taky ne (403), administrátor ano', (K(poSod, sObj(poSod, [k2]), VED) || {}).status === 403
  && K(poSod, sObj(poSod, [k2]), ADM) === null);
test('po SoD bez předchozího záznamu: obchodník nezapíše (403)', (K(Object.assign(kopie(poSod), { objednane: undefined }), sObj(poSod, [k1]), OBCH) || {}).status === 403);

/* ---- klient: objNastav, text do krycího listu ---- */
{ const z = kopie(zak);
  test('objNastav k zamčené variantě zapíše klíče a datum', O.objNastav(z, z.varianty[0], [k1, k1, k2], '2026-10-20') === ''
    && z.objednane.klice.join() === [k1, k2].join() && z.objednane.datum === '2026-10-20');
  test('objNastav bez data doplní dnešek', (O.objNastav(z, z.varianty[0], [k1], '', { ted: TED }), z.objednane.datum === '2026-10-21'));
  test('objNastav s prázdným seznamem záznam smaže', O.objNastav(z, z.varianty[0], []) === '' && !('objednane' in z));
  const zn = kopie(zak); zn.varianty[0].zamek = null;
  test('objNastav k nezamčené variantě vrátí chybu', /zamčené/.test(O.objNastav(zn, zn.varianty[0], [k1])));
  test('text krycího listu', O.objText(ulozena, ulozena.varianty[0], JEKLY) === '1 – ' + nab[0].nazev + ' (20. 10. 2026)'
    && O.objText(zak, v, JEKLY) === 'nic objednáno');
  if (typeof kryciCtx === 'function') {
    let ctx = null; try { ctx = kryciCtx(ulozena, ulozena.varianty[0], JEKLY); } catch (e) { ctx = { chyba: e.message }; }
    test('krycí list nese údaj Objednané příplatky', !!ctx && ctx.objednane === O.objText(ulozena, ulozena.varianty[0], JEKLY), ctx && ctx.objednane);
    const pole = (KRYCI_SEKCE || []).flatMap(s => s.pole).find(p => p.id === 'priplatkyObjednane');
    test('pole „Objednané příplatky" ve stejných verzích jako „Příplatky v nabídce"', !!pole
      && JSON.stringify(pole.verze) === JSON.stringify((KRYCI_SEKCE || []).flatMap(s => s.pole).find(p => p.id === 'priplatkyNabidka').verze));
  }
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

  const F = (q) => C.ctrlHromadnyFiltr(q).filtr;
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
