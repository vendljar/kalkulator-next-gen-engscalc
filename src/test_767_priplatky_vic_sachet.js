/* #767 (J. V. 25. 11. 2026) — víc šachet: nabídka bere výběr příplatků
 * STEJNĚ jako krycí list, Pipedrive a objednané / SoD = sjednocení šachet
 * (vsPriplatkyVyber v vice_sachet.js). Příplatek zaškrtnutý jen v šachtě 2 se
 * v nabídce vytiskne; částka řádku = Σ ks × šachta jen přes šachty, které ho
 * zaškrtly (do #767: výběr šachty 1 a částka všech šachet).
 * Zamčená (odeslaná) nabídka bez značky `priplatkyVyber` ve snímku zámku se
 * tiskne postaru; nový zámek víc šachet značku nese. Jedna šachta beze změny.
 *
 * Smyšlená čísla zkušebního ceníku. Pojistka: před #767 nabídka nemá „VSG"
 * (jen šachta B) a SKN (jen šachta A, 1 ks) tiskne za 3 kusy — testy B padají.
 * Spuštění: node src/test_767_priplatky_vic_sachet.js */
'use strict';
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js'); nacti('./preklad.js'); const E = nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik(); nacti('./engine_proj.js'); global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const V = nacti('./vice_sachet.js'); nacti('./techspec.js'); nacti('./sleva.js'); nacti('./zaokrouhleni.js'); nacti('./firma.js');
const ZK = nacti('./zakazka.js'); const ZM = nacti('./zamek.js'); const N = nacti('./nabidka.js');
const O = nacti('./objednane.js');
const J = require('./jekly.json');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 500)); } };
const kop = x => JSON.parse(JSON.stringify(x));
const castka = t => +String(t).replace(/[^\d,-]/g, '').replace(',', '.');
const ZAD = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 };

/* Šachta A (1 ks) a B (2 ks). `jenA` / `jenB` / `obe` = klíče příplatků v nabídce. */
function zakazka(jenA, jenB, obe) {
  const zak = ZK.novaZakazka(); zak.cislo = '2026-OPR-CN-9767'; zak.nazevAkce = 'MD #767';
  const v = zak.varianty[0];
  v.data.cenik = ZC.zkusebniCenik(); v.data.ock.fixes = true;
  Object.assign(v.data.ock.zadani, ZAD);
  const vse = E.vypocet(v.data.ock.zadani, v.data.cenik, J, true).priplatky.map(p => p.key);
  v.data.ock.nazev = 'A';
  v.data.ock.zadani.priplatkyVynechat = vse.filter(k => !jenA.concat(obe).includes(k));
  const z2 = kop(v.data.ock.zadani); z2.priplatkyVynechat = vse.filter(k => !jenB.concat(obe).includes(k));
  v.data.ock.dalsi = [{ id: 's_b', nazev: 'B', ks: 2, zadani: z2 }];
  return { zak, v };
}
const tisk = (zak, v) => N.nabidkaData(zak, v, J, 'cz').priplatky;
const najdi = (list, re) => list.find(p => re.test(p.nazev));
const jedna = (r, k) => r.priplatky.find(p => p.key === k);

console.log('===== A. pojistky =====');
test('vice_sachet má vsPriplatkyVyber (#767)', typeof V.vsPriplatkyVyber === 'function');

console.log('===== B. neodeslaná nabídka = sjednocení šachet =====');
{
  const { zak, v } = zakazka(['skn'], ['vsgFolie'], ['prechMat']);
  const r = V.vypocetOckDat(v.data, J);
  const s1 = r.sachty[0].vysl, s2 = r.sachty[1].vysl;
  const n = tisk(zak, v);
  const vsg = najdi(n, /VSG/), skn = najdi(n, /SKN/), pm = najdi(n, /PŘECHODOVÉ PLECHY/);
  test('příplatek zaškrtnutý jen v šachtě B je v nabídce', !!vsg, n.map(p => p.nazev));
  test('… s částkou 2 ks × šachta B', vsg && castka(vsg.cena) === 2 * jedna(s2, 'vsgFolie').sMarzi, [vsg, jedna(s2, 'vsgFolie').sMarzi]);
  test('příplatek jen v šachtě A: částka 1 ks × šachta A (ne součet všech šachet)',
    skn && castka(skn.cena) === jedna(s1, 'skn').sMarzi, [skn, jedna(s1, 'skn').sMarzi]);
  test('příplatek v obou šachtách: Σ ks × šachta', pm && castka(pm.cena) === jedna(s1, 'prechMat').sMarzi + 2 * jedna(s2, 'prechMat').sMarzi, pm);
  test('příplatek, který nezaškrtla žádná šachta, v nabídce není', !najdi(n, /SOKL/i) && n.length === 3, n.map(p => p.nazev));
  /* Totéž, co krycí list a Pipedrive (názvy), a objednané / SoD (částky). */
  const kl = V.vsPriplatkyVNabidce(r, v.data.ock);
  test('krycí list: stejné příplatky ve stejném pořadí', JSON.stringify(kl.map(p => p.nazev)) === JSON.stringify(n.map(p => p.nazev)), [kl, n]);
  /* MD N1 (#778, PD2): pořadí = pořadí příplatků ve výsledku (ceník), ne pořadí prvního zaškrtnutí —
   * „Sklo VSG“ zaškrtnuté jen v šachtě B už neskončí za přechodovými plechy. */
  const ceniku = r.sachty[0].vysl.priplatky.map(p => p.key);
  test('krycí list nese šachty u každého řádku (A) / (B) / (A, B)', JSON.stringify(kl.map(p => p.sachty).slice().sort()) === '[["A"],["A","B"],["B"]]', kl);
  test('MD N1: pořadí příplatků = pořadí v ceníku (ne první zaškrtnutý výskyt)',
    JSON.stringify(V.vsPriplatkyVyber(r, v.data.ock).map(x => ceniku.indexOf(x.key))) === JSON.stringify(V.vsPriplatkyVyber(r, v.data.ock).map(x => ceniku.indexOf(x.key)).slice().sort((a, b) => a - b))
    && ceniku.indexOf('vsgFolie') < ceniku.indexOf('prechMat') && kl[kl.length - 1].nazev !== kl.find(p => /VSG/.test(p.nazev)).nazev, kl);
  const vz = kop(v); vz.zamek = { zamceno: true, snimek: ZM.zamekSnimekSpocti(vz) };
  const ob = O.objNabidnute(vz, J);
  test('objednané (SoD): stejné klíče a částky jako nabídka',
    ob.length === 3 && ob.every(o => { const t = n.find(p => p.nazev === o.nazev); return t && castka(t.cena) === Math.round(o.sMarzi * 100) / 100; }),
    [ob, n]);
}

console.log('===== B2. příplatek s jinou sazbou v každé šachtě (dva řádky výběru, jeden klíč) =====');
{
  const { v } = zakazka([], [], ['skn']);
  const r = V.vypocetOckDat(v.data, J);
  const b = r.sachty[1].vysl.priplatky.find(p => p.key === 'skn');
  b.cena *= 2; b.sMarzi *= 2; b.naklad *= 2;            // šachta B s jinou jednotkovou cenou (např. ruční cena)
  const a = r.sachty[0].vysl.priplatky.find(p => p.key === 'skn');
  const vyb = V.vsPriplatkyVyber(r, v.data.ock).filter(x => x.key === 'skn');
  test('výběr: dva řádky (sazba A a B)', vyb.length === 2, vyb.map(x => x.klic));
  const puvodni = global.vypocetZ;
  global.vypocetZ = () => r;
  let ob;
  try { const vz = kop(v); vz.zamek = { zamceno: true }; ob = O.objNabidnute(vz, J); } finally { global.vypocetZ = puvodni; }
  const o = (ob || []).find(x => x.key === 'skn');
  test('objednané: jeden klíč se součtem obou řádků (1 × A + 2 × B)', !!o && ob.filter(x => x.key === 'skn').length === 1
    && o.sMarzi === a.sMarzi + 2 * b.sMarzi && o.naklad === a.naklad + 2 * b.naklad, [o, a.sMarzi, b.sMarzi]);
}

console.log('===== B3. engineering s jinou sazbou v každé šachtě — pořád jednou za variantu =====');
{
  const { v } = zakazka(['engineering'], ['engineering'], []);
  const r = V.vypocetOckDat(v.data, J);
  const b = r.sachty[1].vysl.priplatky.find(p => p.key === 'engineering');
  b.cena *= 2; b.sMarzi *= 2; b.naklad *= 2;
  const a = r.sachty[0].vysl.priplatky.find(p => p.key === 'engineering');
  const vyb = V.vsPriplatkyVyber(r, v.data.ock).filter(x => x.key === 'engineering');
  test('výběr: engineering jediný řádek s hodnotou šachty A', vyb.length === 1 && vyb[0].radek.sMarzi === a.sMarzi, vyb.map(x => [x.klic, x.radek.sMarzi]));
  const puvodni = global.vypocetZ;
  global.vypocetZ = () => r;
  let ob;
  try { const vz = kop(v); vz.zamek = { zamceno: true }; ob = O.objNabidnute(vz, J); } finally { global.vypocetZ = puvodni; }
  const o = (ob || []).find(x => x.key === 'engineering');
  test('objednané: engineering jednou (šachta A), ne součet sazeb', !!o && o.sMarzi === a.sMarzi, [o, a.sMarzi]);
}

console.log('===== C. přechodové plechy rozdělené mezi šachty =====');
{
  const { zak, v } = zakazka(['prechMat'], ['prechMont'], []);
  const r = V.vypocetOckDat(v.data, J);
  const n = tisk(zak, v);
  test('materiál v A a montáž v B → jedna položka „Přechodové plechy" se součtem výběru',
    n.length === 1 && /Přechodové plechy/.test(n[0].nazev)
    && castka(n[0].cena) === jedna(r.sachty[0].vysl, 'prechMat').sMarzi + 2 * jedna(r.sachty[1].vysl, 'prechMont').sMarzi, n);
}

console.log('===== D. engineering jednou za variantu (#757) =====');
{
  const { zak, v } = zakazka([], ['engineering'], []);
  const r = V.vypocetOckDat(v.data, J);
  const n = tisk(zak, v);
  const e = najdi(n, /ENGINEERING/i);
  test('engineering zaškrtnutý jen v B: v nabídce jednou, ne × ks', !!e && n.length === 1
    && castka(e.cena) === jedna(r.sachty[1].vysl, 'engineering').sMarzi, n);
}

console.log('===== E. zamčené (odeslané) nabídky =====');
{
  const { zak, v } = zakazka(['skn'], ['vsgFolie'], []);
  const sn = ZM.zamekSnimekSpocti(v);
  test('nový zámek víc šachet nese značku priplatkyVyber: 1', sn.priplatkyVyber === 1 && sn.sachtyVerze === 1, sn);
  const r = V.vypocetOckDat(v.data, J);
  const stary = kop(v); stary.zamek = { zamceno: true, snimek: Object.assign(kop(sn), { priplatkyVyber: undefined }) };
  delete stary.zamek.snimek.priplatkyVyber;
  const ns = tisk(zak, stary);
  test('zámek bez značky (odeslaný před #767): tisk postaru — výběr šachty 1, částka všech šachet',
    ns.length === 1 && /SKN/.test(ns[0].nazev) && castka(ns[0].cena) === r.priplatky.find(p => p.key === 'skn').sMarzi, ns);
  const bez = kop(v); bez.zamek = { zamceno: true };
  test('zámek bez snímku: postaru', tisk(zak, bez).length === 1);
  const novy = kop(v); novy.zamek = { zamceno: true, snimek: sn };
  test('zámek se značkou: sjednocení šachet', tisk(zak, novy).length === 2);
  test('nabidkaPriplatkyVyberNovy: neodeslaná ano, zámek jen se značkou 1',
    N.nabidkaPriplatkyVyberNovy(v) && !N.nabidkaPriplatkyVyberNovy(stary) && N.nabidkaPriplatkyVyberNovy(novy)
    && !N.nabidkaPriplatkyVyberNovy({ zamek: { zamceno: true, snimek: { priplatkyVyber: '1' } } }));
}

console.log('===== F. jedna šachta beze změny =====');
{
  const zak = ZK.novaZakazka(); const v = zak.varianty[0];
  v.data.cenik = ZC.zkusebniCenik(); v.data.ock.fixes = true; Object.assign(v.data.ock.zadani, ZAD);
  const r = E.vypocet(v.data.ock.zadani, v.data.cenik, J, true);
  v.data.ock.zadani.priplatkyVynechat = r.priplatky.map(p => p.key).filter(k => k !== 'skn' && k !== 'sokl');
  const n = tisk(zak, v);
  test('jedna šachta: výběr podle sloupce Nabídka', n.length === 2 && !!najdi(n, /SKN/) && castka(najdi(n, /SKN/).cena) === jedna(r, 'skn').sMarzi, n);
  test('jedna šachta: vsPriplatkyVyber = null', V.vsPriplatkyVyber(r, v.data.ock) === null);
  test('jedna šachta: snímek zámku bez značky (4 klíče)', !('priplatkyVyber' in ZM.zamekSnimekSpocti(v)));
}

console.log('===== G. kontrola dodatekCesky bere týž výběr =====');
{
  const K = require('./kontroly.js');
  const { v } = zakazka([], ['vsgFolie'], []);
  const VSG = 'Sklo VSG s mléčnou fólií';
  v.data.cenik.popisy = { [VSG]: 'dubové madlo, lakované' };
  const ctx = (jazyk) => ({ jazyk, zadani: v.data.ock.zadani, ock: v.data.ock, cenik: v.data.cenik,
    vysledek: V.vypocetOckDat(v.data, J) });
  const nal = K.kontrolyProved(ctx('en')).nalezy.find(n => n.kod === 'dodatekCesky');
  test('příplatek jen v šachtě B s českým textem se v EN nabídce hlásí', !!nal && nal.text.indexOf(VSG) >= 0, nal);
  v.data.ock.dalsi[0].zadani.priplatkyVynechat.push('vsgFolie');
  test('… a nehlásí se, když ho nezaškrtla žádná šachta', !K.kontrolyProved(ctx('en')).nalezy.some(n => n.kod === 'dodatekCesky'));
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
