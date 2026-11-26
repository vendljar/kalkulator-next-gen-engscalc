/* #813 (K65-N1, kolo 65) — dotisk odeslané nabídky víc šachet nesmí změnit
 * pořadí řádků příplatků. MD N1 (#778, PD2) řadí příplatky víc šachet podle
 * ceníku (pořadí ve výsledku); do PD2 platilo pořadí prvního zaškrtnutého
 * výskytu (šachta A, pak B). Nové řazení smí platit jen pro neodeslanou
 * nabídku a odeslanou po PD2 (značka `pd2Tisk` ve snímku podmínek
 * data.kryci.zmrazenoPodminky); starší zámek tiskne v původním pořadí —
 * nabídka (Word i online), krycí list i objednané (SoD).
 *
 * Smyšlená data zkušebního ceníku. Pojistka: nad integrací v25.11.6 (bez
 * opravy) padá „starý zámek: pořadí jako před PD2“ u nabídky, krycího listu
 * i objednaných. Spuštění: node src/test_813_poradi_priplatku.js */
'use strict';
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js'); nacti('./preklad.js'); const E = nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik(); nacti('./engine_proj.js'); global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const V = nacti('./vice_sachet.js'); nacti('./techspec.js'); nacti('./sleva.js'); nacti('./zaokrouhleni.js'); nacti('./firma.js');
const ZK = nacti('./zakazka.js'); const ZM = nacti('./zamek.js'); const N = nacti('./nabidka.js');
const O = nacti('./objednane.js'); const KR = nacti('./kryci.js');
const J = require('./jekly.json');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 500)); } };
const kop = x => JSON.parse(JSON.stringify(x));
const ZAD = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 };

/* Šachta A: pozdější příplatek ceníku; šachta B: dřívější. Jako 9961
 * (zábrany A+B, madla jen B): staré pořadí = A, pak B; nové = podle ceníku. */
const zak = ZK.novaZakazka(); zak.cislo = '2026-OPR-CN-9813'; zak.nazevAkce = 'Rychlá #813';
const v = zak.varianty[0];
v.data.cenik = ZC.zkusebniCenik(); v.data.cenik.kurzEurKc = 25; v.data.ock.fixes = true;
Object.assign(v.data.ock.zadani, ZAD);
const vse = E.vypocet(v.data.ock.zadani, v.data.cenik, J, true).priplatky.map(p => p.key);
const PRVNI = vse[0], POZDEJSI = vse[2], OBE = vse[4];
v.data.ock.nazev = 'A';
v.data.ock.zadani.priplatkyVynechat = vse.filter(k => k !== POZDEJSI && k !== OBE);
const z2 = kop(v.data.ock.zadani); z2.priplatkyVynechat = vse.filter(k => k !== PRVNI && k !== OBE);
v.data.ock.dalsi = [{ id: 's_b', nazev: 'B', ks: 2, zadani: z2 }];

const r = V.vypocetOckDat(v.data, J);
const nazvy = keys => keys.map(k => r.sachty.map(s => s.vysl.priplatky.find(p => p.key === k)).find(Boolean).nazev);
const STARE = [POZDEJSI, OBE, PRVNI];      // první zaškrtnutý výskyt (A, pak B)
const NOVE = [PRVNI, POZDEJSI, OBE];       // ceník
test('předpoklad: šachty dávají jiné staré a nové pořadí', JSON.stringify(STARE) !== JSON.stringify(NOVE), vse);

/* Zámek víc šachet se značkou priplatkyVyber (#767, odesláno po v25.11.3) a
 * snímek podmínek bez / s pd2Tisk (před / po PD2). */
const zamkni = pd2 => {
  const x = kop(v);   /* snímek podmínek zamrzá s krycím listem při odeslání (kryciZmrazPodminky) */
  x.data.kryci = Object.assign({}, x.data.kryci, { zmrazenoPodminky: pd2 ? { v: 1, pd2Tisk: 1 } : { v: 1 } });
  x.zamek = { zamceno: true, typ: 'nabidka', kdy: '2026-11-25T10:00:00Z', snimek: ZM.zamekSnimekSpocti(x) };
  return x;
};
const tisk = x => N.nabidkaData(zak, x, J, 'cz').priplatky.map(p => p.nazev);
const tiskEn = x => N.nabidkaData(zak, x, J, 'en').priplatky.map(p => p.nazev);
/* Krycí list „Příplatky v nabídce“: „3 – název (A), …“ → názvy v pořadí. */
const kryci = x => String(KR.kryciCtx(zak, x, J).priplatky).replace(/^\d+ – /, '').split(/ \([A-Z, ]+\)(?:, |$)/).filter(Boolean);
const obj = x => O.objNabidnute(x, J).map(p => p.key);
const shoda = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const stary = zamkni(false), novy = zamkni(true);
test('starý zámek má značku priplatkyVyber (#767), ne pd2Tisk', stary.zamek.snimek.priplatkyVyber === 1 && !(stary.data.kryci.zmrazenoPodminky.pd2Tisk));
test('vice_sachet má vsPriplatkyPoradiCeniku (#813)', typeof V.vsPriplatkyPoradiCeniku === 'function');

console.log('===== nabídka (dotisk) =====');
const sN = tisk(stary), nN = tisk(novy), rN = tisk(v);
test('neodeslaná: pořadí podle ceníku (MD N1)', shoda(rN, nazvy(NOVE)), [rN, nazvy(NOVE)]);
test('odeslaná po PD2 (pd2Tisk): pořadí podle ceníku', shoda(nN, nazvy(NOVE)), [nN, nazvy(NOVE)]);
test('starý zámek (bez pd2Tisk): pořadí jako před PD2 (první zaškrtnutý výskyt)', shoda(sN, nazvy(STARE)), [sN, nazvy(STARE)]);
{ const sE = tiskEn(stary), nE = tiskEn(novy), rE = tiskEn(v);
  test('EN: starý zámek jiné pořadí než nový, neodeslaná = nový', sE.length === 3 && !shoda(sE, nE) && shoda(rE, nE), [sE, nE]);
  test('EN: starý zámek = CZ pořadí před PD2 (pozice řádku podle klíče)',
    shoda(sE.map(t => nE.indexOf(t)), sN.map(t => nN.indexOf(t))), [sE, nE]); }
test('starý zámek: tytéž řádky jako nový, jen jiné pořadí', shoda(sN.slice().sort(), nN.slice().sort()), [sN, nN]);

console.log('===== krycí list a objednané =====');
test('krycí list neodeslané: pořadí podle ceníku', shoda(kryci(v), nazvy(NOVE)), kryci(v));
test('krycí list starého zámku: pořadí jako před PD2', shoda(kryci(stary), nazvy(STARE)), kryci(stary));
test('objednané nového zámku: pořadí podle ceníku', shoda(obj(novy), NOVE), obj(novy));
test('objednané starého zámku: pořadí jako před PD2', shoda(obj(stary), STARE), obj(stary));

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
