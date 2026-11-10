/* VS #570 / E4 (#594) — TECHNICKÁ SPECIFIKACE PO ŠACHTÁCH (techspec.js), 10. 11. 2026.
 *
 *  A) TS_SEKCE_SACHTY: všechny názvy existují v TECHSPEC_DEF, sekce za
 *     zakázku (stavební, projekční, co není součástí) mezi nimi nejsou;
 *  B) tsPoleSachty: každé pole sekcí šachty ano, ostatní ne;
 *  C) tsSachtaTechspec: šachta 1 = v.data.techspec (týž objekt — beze změny
 *     dnešní cesty), šachta 2+ = pole zakázky z v.data.techspec + jen VLASTNÍ
 *     pole šachty z dalsi[i].techspec; pole zakázky zapsané do šachty se
 *     ignoruje; chybějící / vadné dalsi[i].techspec = předvyplnění; neexistující
 *     šachta = jen pole zakázky; vstup se nemění;
 *  D) předvyplnění šachty z JEJÍ dvojice (zadání, výsledek): typ šachty,
 *     rozměry, opláštění a sklo (#572 — tsMaSklo dostane výsledek šachty),
 *     sekce MŮSTKY (`jen`) podle výsledku šachty.
 * Pojistka: na 079cfc6 TS_SEKCE_SACHTY / tsPoleSachty / tsSachtaTechspec
 * neexistují — sada selže; viz zpráva commitu.
 * Spuštění: node src/test_vs_techspec.js */
'use strict';
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js'); nacti('./preklad.js');
const E = nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const V = nacti('./vice_sachet.js');
const TS = nacti('./techspec.js');
const J = require('./jekly.json');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 400)); } };
const kop = x => JSON.parse(JSON.stringify(x));

/* A) sekce */
const nazvy = TS.TECHSPEC_DEF.map(s => s.sekce);
test('A TS_SEKCE_SACHTY: všechny v TECHSPEC_DEF', Array.isArray(TS.TS_SEKCE_SACHTY) && TS.TS_SEKCE_SACHTY.length === 5
  && TS.TS_SEKCE_SACHTY.every(n => nazvy.includes(n)), TS.TS_SEKCE_SACHTY);
test('A sekce za zakázku nejsou sekcemi šachty', ['STAVEBNÍ A PŘÍPRAVNÉ PRÁCE', 'PROJEKČNÍ A PŘÍPRAVNÉ PRÁCE', 'SOUČÁSTÍ DODÁVKY NENÍ']
  .every(n => nazvy.includes(n) && !TS.tsSekceSachty(n)));

/* B) pole */
{
  const sach = [], zak = [];
  TS.TECHSPEC_DEF.forEach(s => s.pole.forEach(p => (TS.tsSekceSachty(s.sekce) ? sach : zak).push(p.id)));
  test('B tsPoleSachty: každé pole sekcí šachty ano (' + sach.length + ')', sach.length > 30 && sach.every(TS.tsPoleSachty));
  test('B tsPoleSachty: pole za zakázku ne (' + zak.length + ')', zak.length > 10 && !zak.some(TS.tsPoleSachty));
  test('B tsPoleSachty: neznámé id ne', !TS.tsPoleSachty('neexistuje') && !TS.tsPoleSachty(undefined));
}

/* C) tsSachtaTechspec */
{
  const d = { techspec: { nazevAkce: 'X', hodnoty: { strecha: 'A střecha', leseniUvnitr: 'zakázka' }, extra: [{ label: 'L', hodnota: 'H' }] },
    ock: { zadani: {}, dalsi: [{ id: 's_b', ks: 1, zadani: {}, techspec: { hodnoty: { strecha: 'B střecha', leseniUvnitr: 'ze šachty — nepatří' } } },
      { id: 's_c', ks: 1, zadani: {} }, { id: 's_d', ks: 1, zadani: {}, techspec: { hodnoty: 'vadné' } }] } };
  const pred = JSON.stringify(d);
  test('C šachta 1 = týž objekt v.data.techspec', TS.tsSachtaTechspec(d, 0) === d.techspec);
  const b = TS.tsSachtaTechspec(d, 1);
  test('C šachta 2: vlastní pole šachty + pole zakázky, pole zakázky ze šachty ignorováno', b.hodnoty.strecha === 'B střecha' && b.hodnoty.leseniUvnitr === 'zakázka', b.hodnoty);
  test('C šachta 2: nazevAkce a extra ze zakázky', b.nazevAkce === 'X' && b.extra === d.techspec.extra);
  const c = TS.tsSachtaTechspec(d, 2);
  test('C šachta 3 bez techspec: pole šachty prázdná (předvyplnění), zakázka ano', !('strecha' in c.hodnoty) && c.hodnoty.leseniUvnitr === 'zakázka', c.hodnoty);
  test('C šachta s vadným techspec = předvyplnění', !('strecha' in TS.tsSachtaTechspec(d, 3).hodnoty));
  test('C neexistující šachta = jen pole zakázky', JSON.stringify(TS.tsSachtaTechspec(d, 9).hodnoty) === '{"leseniUvnitr":"zakázka"}');
  test('C vstup se nemění', JSON.stringify(d) === pred);
  test('C bez techspec / bez ock nespadne', TS.tsSachtaTechspec({}, 1).hodnoty && TS.tsSachtaTechspec(null, 0).hodnoty);
}

/* D) předvyplnění z dvojice šachty */
{
  const C = Object.assign(kop(E.DEFAULT_CENIK), ZC.zkusebniCenik());
  const ZAD = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 };
  const ZA = Object.assign(kop(E.DEFAULT_ZADANI), ZAD, { typSachty: 'exteriérová' });
  const ZB = Object.assign(kop(E.DEFAULT_ZADANI), ZAD, { typSachty: 'interiérová', profily: kop(E.PROFILY_VYCHOZI['interiérová']) });
  const ock = { zadani: ZA, fixes: true, dalsi: [{ id: 's_b', ks: 2, zadani: ZB }] };
  const S = V.vypocetZakazkyOck(ock, C, J);
  const d = { techspec: kop(DEFAULT_TECHSPEC), ock };
  const pole = id => TS.tsPole(id);
  const h = (i, id) => TS.tsHodnota(pole(id), TS.tsSachtaTechspec(d, i), S.sachty[i].vysl, V.sachtyZ(ock)[i].zadani, C, 'cz').text;
  test('D umístění šachty podle typu své šachty', h(0, 'umisteni') !== h(1, 'umisteni'), [h(0, 'umisteni'), h(1, 'umisteni')]);
  test('D materiál opláštění ze své šachty (#572: výsledek šachty, ne součet)', h(0, 'materialOplasteni') !== h(1, 'materialOplasteni')
    || h(0, 'typOplasteni') !== h(1, 'typOplasteni'), [h(0, 'materialOplasteni'), h(1, 'materialOplasteni')]);
  test('D tsMaSklo se volá s dvojicí šachty', TS.tsMaSklo(ZA, S.sachty[0].vysl) === TS.tsMaSklo(ZA, E.vypocet(kop(ZA), C, J, true))
    && TS.tsMaSklo(ZB, S.sachty[1].vysl) === TS.tsMaSklo(ZB, E.vypocet(kop(ZB), C, J, true)));
  const CM = Object.assign(kop(C), ZC.zkusebniMustky(), { mustekRamBmKc: 10000, mustekPodlahaPlechM2Kc: 1000, mustekZabradliKovBmKc: 2000, mustekKotveniDeskaKc: 3000 });
  const ockM = { zadani: Object.assign(kop(ZA), { mustky: [{ ks: 1, sirkaMm: 1200, delkaMm: 900, podlaha: 'plech', zabradli: 'kov', zabradliStrany: 1 }] }),
    fixes: true, dalsi: [{ id: 's_b', ks: 1, zadani: ZB }] };
  const SM = V.vypocetZakazkyOck(ockM, CM, J);
  const sekM = TS.TECHSPEC_DEF.find(s => s.sekce === 'MŮSTKY MEZI BUDOVOU A OCK');
  test('D sekce MŮSTKY podle výsledku šachty (A ano, B ne)', sekM.jen(SM.sachty[0].vysl) && !sekM.jen(SM.sachty[1].vysl));
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
