/* ENGINEERING JAKO PŘÍPLATEK (#757, rozhodnutí J. V. 24. 11. 2026).
 *
 * Nová kalkulace (příznak `engineeringPriplatek: true` ze ZADANI_NOVA) má
 * engineering v příplatkových položkách (C.engineeringKc × 1), ne v Režii,
 * a ve výchozím stavu MIMO nabídku. Stará data příznak nemají a počítají
 * postaru — řádek ENGINEERING v Režii, cena beze změny.
 *
 * Zlatá čísla starého výpočtu jsou spočtená jádrem integrace c89e872 (před
 * #757) nad zkušebním ceníkem — smyšlená čísla, žádná ostrá cena.
 *
 * Pojistka proti prázdnému testu: proti c89e872 (před změnou) sada padá
 * (chybí příplatek `engineering`, nová zakázka příznak nenese, matice
 * engineering do nabídky pustí, server příznak nehlídá, slovník nezná
 * „ENGINEERING").
 *
 * Spuštění: node src/test_engineering_priplatek.js */
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); };
nacti('./format.js'); nacti('./cenik.js'); nacti('./cenik_stari.js'); nacti('./cenik_rady.js');
nacti('./engine.js'); nacti('./engine_proj.js'); nacti('./techspec.js'); nacti('./zamek.js');
nacti('./poznamky.js'); nacti('./zakazka.js'); nacti('./zobrazeni.js'); nacti('./sleva.js');
nacti('./schvalovani.js'); nacti('./kontroly.js'); nacti('./vyjimky.js'); nacti('./program.js');
nacti('./uloziste.js'); nacti('./rucni_ceny.js'); nacti('./vice_sachet.js');
const VJ = require('./vyjimky.js'); global.vyjimkyObsah = VJ.vyjimkyObsah;
const U = require('./uloziste.js');
const P = require('./preklad.js');
const ZC = require('./zkusebni_cenik.js');
const JEKLY = require('./jekly.json');
global.JEKLY = JEKLY;
global.DEFAULT_CENIK = ZC.zkusebniCenik();

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};
const kopie = x => JSON.parse(JSON.stringify(x));
const ROZMERY = { sirka: 1.6, hloubka: 2, zdvih: 12, prejezd: 3.3, prohluben: 1.2, nastupiste: 5 };
const stare = (navic) => Object.assign(kopie(DEFAULT_ZADANI), ROZMERY, { engineeringKs: 1 }, navic || {});
const eng = r => r.priplatky.filter(p => p.key === 'engineering');
const rezieEng = r => r.sekce.rezie.filter(x => x.nazev === 'ENGINEERING');

console.log('===== 0. pojistka: zkušební ceník engineering nese =====');
test('C.engineeringKc > 0 ve zkušebním ceníku', ZC.zkusebniCenik().engineeringKc > 0, ZC.zkusebniCenik().engineeringKc);
test('DEFAULT_ZADANI příznak NENESE (fixtury a fuzz zůstávají na staré cestě)',
  !Object.prototype.hasOwnProperty.call(DEFAULT_ZADANI, 'engineeringPriplatek'));

console.log('===== 1. stará kalkulace beze změny =====');
{
  const r2 = vypocet(stare(), ZC.zkusebniCenik(), JEKLY, true);
  const r1 = vypocet(stare(), ZC.zkusebniCenik(), JEKLY, false);
  test('Model 2: řádek ENGINEERING v Režii (1 × 10 000)', rezieEng(r2).length === 1 && rezieEng(r2)[0].naklad === 10000, rezieEng(r2));
  test('Model 2: žádný příplatek engineering', eng(r2).length === 0);
  test('Model 2: zlatá čísla c89e872 (základ 1 204 000, příplatky 362 000)',
    r2.souhrn.zakladCena === 1204000 && r2.souhrn.priplatkyCena === 362000, r2.souhrn);
  test('Model 1: zlatá čísla c89e872 (základ 1 200 000, příplatky 362 000)',
    r1.souhrn.zakladCena === 1200000 && r1.souhrn.priplatkyCena === 362000, r1.souhrn);
  const r0 = vypocet(stare({ engineeringKs: 0 }), ZC.zkusebniCenik(), JEKLY, true);
  test('stará kalkulace s „Ne": v Režii ani v příplatcích', rezieEng(r0).length === 0 && eng(r0).length === 0);
  const rf = vypocet(stare({ engineeringPriplatek: false }), ZC.zkusebniCenik(), JEKLY, true);
  test('příznak false = stará cesta', rezieEng(rf).length === 1 && eng(rf).length === 0);
  const rt = vypocet(stare({ engineeringPriplatek: 'ano' }), ZC.zkusebniCenik(), JEKLY, true);
  test('příznak jiný než true (text) = stará cesta', rezieEng(rt).length === 1 && eng(rt).length === 0);
}

console.log('===== 2. kalkulace s příznakem =====');
{
  const r = vypocet(stare({ engineeringPriplatek: true }), ZC.zkusebniCenik(), JEKLY, true);
  test('Režie bez ENGINEERING i při engineeringKs = 1', rezieEng(r).length === 0);
  const p = eng(r)[0] || {};
  test('příplatek engineering: množství 1, cena C.engineeringKc, cesta C.engineeringKc',
    eng(r).length === 1 && p.mnozstvi === 1 && p.naklad === 10000 && p.cenaPath === 'C.engineeringKc' && p.nazev === 'ENGINEERING', p);
  const m = ZC.zkusebniCenik().marze;
  test('příplatek s marží = 10 000 × (1 + m)', Math.abs(p.sMarzi - 10000 * (1 + m)) < 1e-6, { s: p.sMarzi, m });
  test('základ o engineering nižší než u staré (1 192 000), příplatky vyšší (374 000)',
    r.souhrn.zakladCena === 1192000 && r.souhrn.priplatkyCena === 374000, r.souhrn);
  const r0 = vypocet(stare({ engineeringPriplatek: true, engineeringKs: 0 }), ZC.zkusebniCenik(), JEKLY, true);
  test('příplatek nezávisí na engineeringKs', eng(r0).length === 1 && eng(r0)[0].mnozstvi === 1);
}

console.log('===== 3. nová zakázka =====');
{
  const z = novaZakazka();
  const zad = z.varianty[0].data.ock.zadani;
  test('nová zakázka nese příznak', zad.engineeringPriplatek === true, zad.engineeringPriplatek);
  test('engineering ve výchozím stavu MIMO nabídku (priplatkyVynechat)',
    Array.isArray(zad.priplatkyVynechat) && zad.priplatkyVynechat.includes('engineering'), zad.priplatkyVynechat);
  test('skla zůstávají mimo nabídku jako dosud',
    zad.priplatkyVynechat.includes('vsgFolie') && zad.priplatkyVynechat.includes('skn'));
  const z2 = novaZakazka();
  z2.varianty[0].data.ock.zadani.priplatkyVynechat.push('x');
  test('seznam vynechaných se mezi zakázkami nesdílí', !novaZakazka().varianty[0].data.ock.zadani.priplatkyVynechat.includes('x')
    && !(ZADANI_NOVA.priplatkyVynechat || []).includes('x'));
}

console.log('===== 4. matice Výchozí =====');
{
  const cerstve = () => novaZakazka().varianty[0].data.ock.zadani;
  let zad = cerstve(); zobrazeniVychoziAplikuj({}, zad, null);
  test('prázdná matice: engineering zůstane mimo nabídku', zad.priplatkyVynechat.includes('engineering'), zad.priplatkyVynechat);
  zad = cerstve(); zobrazeniVychoziAplikuj({ vychozi: { 'ock.priplatek:vsgFolie': false, 'ock.priplatek:skn': false } }, zad, null);
  test('matice s jinými klíči: engineering zůstane mimo', zad.priplatkyVynechat.includes('engineering'), zad.priplatkyVynechat);
  zad = cerstve(); zobrazeniVychoziAplikuj({ vychozi: { 'ock.priplatek:engineering': true } }, zad, null);
  test('výslovné true v matici: engineering jde do nabídky', !zad.priplatkyVynechat.includes('engineering'), zad.priplatkyVynechat);
  const stary = stare({ priplatkyVynechat: [] }); zobrazeniVychoziAplikuj({}, stary, null);
  test('zadání bez příznaku: matice engineering nevyřadí', !stary.priplatkyVynechat.includes('engineering'), stary.priplatkyVynechat);
  test('kódový základ sloupce Výchozí: engineering false, ostatní true',
    zobrazeniPriplatekZaklad('engineering') === false && zobrazeniPriplatekZaklad('vsgFolie') === true);
  const mat = {}; zobrazeniPolozkaVychoziNastav(mat, 'ock.priplatek:engineering', true, zobrazeniPriplatekZaklad('engineering'));
  test('zaškrtnutí ve sloupci Výchozí se uloží (odchylka od základu)', mat.vychozi && mat.vychozi['ock.priplatek:engineering'] === true, mat);
  zad = cerstve();
  test('nedotčená nová zakázka je pro matici „nedotčená"',
    zobrazeniVychoziNedotcene(zad, null, novaVariantaData().ock.zadani, null) === true);
}

console.log('===== 5. stará data se nepřevádějí =====');
{
  const z = novaZakazka();
  const zad = z.varianty[0].data.ock.zadani;
  delete zad.engineeringPriplatek; zad.engineeringKs = 1;
  const dup = zakazkaDuplikuj(kopie(z), 'X-1');
  const dz = dup.varianty[0].data.ock.zadani;
  test('duplikát staré zakázky příznak nedostane', dz.engineeringPriplatek === undefined, dz.engineeringPriplatek);
  const imp = importZakazka(kopie(z));
  test('import staré zakázky příznak nedoplní', imp.varianty[0].data.ock.zadani.engineeringPriplatek === undefined);
  const imp2 = importZakazka(kopie(novaZakazka()));
  test('import nové zakázky příznak zachová', imp2.varianty[0].data.ock.zadani.engineeringPriplatek === true);
}

console.log('===== 6. víc šachet =====');
{
  const z1 = stare({ engineeringPriplatek: true });
  const ock = { zadani: z1, fixes: true, dalsi: [{ id: 's2', zadani: kopie(z1) }] };
  const r = vypocetZakazkyOck(ock, ZC.zkusebniCenik(), JEKLY);
  test('víc šachet: rozpoznáno', Array.isArray(r.sachty) && r.sachty.length === 2, r.sachty && r.sachty.length);
  const e = eng(r);
  test('víc šachet: příplatek engineering sloučen do jednoho řádku z obou šachet',
    e.length === 1 && e[0].naklad === 20000, e);
}

console.log('===== 7. server: tvar příznaku =====');
{
  const s1 = f => { const z = novaZakazka(); f(z.varianty[0].data.ock.zadani); return U.uloTypyProblemy(z); };
  test('true / false / chybí projde', !s1(z => { z.engineeringPriplatek = true; }).length
    && !s1(z => { z.engineeringPriplatek = false; }).length && !s1(z => { delete z.engineeringPriplatek; }).length);
  test('jiná hodnota = chyba tvaru', s1(z => { z.engineeringPriplatek = 'ano'; }).some(p => /engineeringPriplatek/.test(p.kde) && p.duvod === 'typ'));
}

console.log('===== 8. překlad názvu příplatku =====');
['en', 'de', 'fr'].forEach(l => {
  const t = P.tr('ENGINEERING', l);
  test('ENGINEERING má překlad ' + l.toUpperCase() + ' (odlišný od IČ)', t && t !== 'ENGINEERING' && !/\(IČ\)/.test(t), t);
});

console.log('===== 9. UI: pole v Práce a režie jen u staré kalkulace =====');
{
  const src = require('fs').readFileSync(__dirname + '/ui/kalk_ock.js', 'utf8');
  test('pole Engineering Ano/Ne podmíněné příznakem', /Z\.engineeringPriplatek === true[\s\S]{0,200}inp\('Z\.engineeringKs'/.test(src));
  test('sloupec Výchozí u příplatku čte kódový základ', /vychoziPolozkaChk\(ZOBRAZENI_PRIPLATEK \+ x\.key,\s*\n?\s*\(typeof zobrazeniPriplatekZaklad/.test(src));
}

console.log('===== 10. krycí list a controlling =====');
{
  nacti('./controlling.js'); nacti('./kryci.js');
  const r = vypocet(stare({ engineeringPriplatek: true }), ZC.zkusebniCenik(), JEKLY, true);
  const rad = ctrlRozvrhOck(r, { fixes: true });
  const e = rad.filter(x => x.pKey === 'engineering');
  test('controlling: engineering mezi příplatky (mimo základ), cesta C.engineeringKc',
    e.length === 1 && e[0].sekce === 'priplatky' && e[0].vZakladu === false && e[0].cenaPath === 'C.engineeringKc' && e[0].naklad === 10000, e);
  test('controlling: v Režii engineering není', !rad.some(x => x.sekce === 'rezie' && /ENGINEERING/.test(x.nazev)));
  const rs = ctrlRozvrhOck(vypocet(stare(), ZC.zkusebniCenik(), JEKLY, true), { fixes: true });
  test('controlling staré kalkulace: engineering v Režii', rs.some(x => x.sekce === 'rezie' && x.nazev === 'ENGINEERING' && x.vZakladu === true));
  const zak = novaZakazka(); const v = zak.varianty[0];
  Object.assign(v.data.ock.zadani, ROZMERY); v.data.cenik = ZC.zkusebniCenik();
  const k1 = kryciCtx(zak, v, JEKLY);
  test('krycí list: engineering mimo nabídku se nevypíše', !/ENGINEERING/.test(k1.priplatky || ''), k1.priplatky);
  v.data.ock.zadani.priplatkyVynechat = v.data.ock.zadani.priplatkyVynechat.filter(k => k !== 'engineering');
  const k2 = kryciCtx(zak, v, JEKLY);
  test('krycí list: zaškrtnutý engineering ve výčtu příplatků v nabídce', /ENGINEERING/.test(k2.priplatky || ''), k2.priplatky);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
