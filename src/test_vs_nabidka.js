/* VS #570 / E4 (#594) — CENOVÁ NABÍDKA S VÍC ŠACHTAMI (nabidka.js), 10. 11. 2026.
 *
 *  A) jedna šachta: žádný nový symbol, žádné `sachty` (R15; bajt po bajtu
 *     hlídá zlatá sada test_vs_zlata.js);
 *  B) víc šachet (R4, R12, R14): tabulka variant šachet = řádek za variantu,
 *     cena všech kusů (žádná cena za kus), součet řádků = cena před slevou na
 *     korunu, šachta s můstky „vč. můstků", řádky ceny šablony v16 (šachta,
 *     můstky, VÝTAHOVÁ ŠACHTA) prázdné, CENA CELKEM = koncová cena,
 *     POCET_VARIANT / POCET_SACHET_CELKEM / „šachet celkem";
 *  C) se slevou: řádky šachet před slevou, součet = Cena před slevou;
 *  D) v eurech (EN/DE/FR): součet řádků = cena před slevou v eurech, texty
 *     přeložené (bez češtiny);
 *  E) technická část po šachtách: rozměry z výsledku a zadání SVÉ šachty,
 *     ruční hodnota šachty 2 z dalsi[i].techspec, ruční pole šachty 1 do
 *     šachty 2 neprosákne, pole za zakázku platí pro všechny; můstky jen
 *     u šachty, která je má;
 *  F) zábrana šablony: v16 a starší + víc šachet = chyba, v17 projde, jedna
 *     šachta s v16 projde; vsSablonaZabrana (pro kontroly.js) i Model 1;
 *  G) online náhled: sekce technické části s názvem šachty, obchodní část
 *     s řádkem za šachtu a součtem.
 * Pojistka: na 079cfc6 nabidkaData žádné šachty nezná (sachty undefined,
 * tabulka chybí, zábrana chybí) — sada selže; viz zpráva commitu.
 * Spuštění: node src/test_vs_nabidka.js */
'use strict';
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./preklad.js');
const E = nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const V = nacti('./vice_sachet.js');
const TS = nacti('./techspec.js');
nacti('./sleva.js'); nacti('./zaokrouhleni.js'); nacti('./firma.js');
const ZK = nacti('./zakazka.js');
nacti('./zamek.js');
const N = nacti('./nabidka.js');
const J = require('./jekly.json');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 400)); } };
const kop = x => JSON.parse(JSON.stringify(x));
/* „1 234 567,00 Kč" / „€ 12,345" → číslo */
const castka = t => +String(t).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');

const SKLADBA = { mustekRamBmKc: 10000, mustekPodlahaPlechM2Kc: 1000, mustekPodlahaPororostM2Kc: 1100, mustekPodlahaVanaM2Kc: 1200,
  mustekZabradliKovBmKc: 2000, mustekZabradliSkloBmKc: 5000, mustekKotveniDeskaKc: 3000, mustekKotveniSloupKc: 3100,
  mustekKotveniKonzolaKc: 3200, mustekZabradliSkloMontazHodBm: 1 };
const ZAD = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 };
const MUSTKY = [{ ks: 2, sirkaMm: 1600, delkaMm: 1200, podlaha: 'plech', zabradli: 'kov', zabradliStrany: 2, sloupyKs: 0, sloupVyskaM: 0 }];

/* Zakázka: Výtah A (1 ks, exteriér, skladebné můstky) + Výtah B (2 ks, interiér, bez můstků). */
function zakazka(o) {
  o = o || {};
  const zak = ZK.novaZakazka();
  zak.cislo = '2026-OPR-CN-9594'; zak.nazevAkce = 'VS E4 nabídka';
  const v = zak.varianty[0];
  Object.assign(v.data.ock.zadani, ZAD, { typSachty: 'exteriérová', mustky: kop(MUSTKY) });
  v.data.ock.fixes = o.fixes === undefined ? true : o.fixes;
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky(), SKLADBA, { kurzEurKc: 25 });
  if (o.jedna) return zak;
  v.data.ock.nazev = 'Výtah A';
  const zB = Object.assign(kop(E.DEFAULT_ZADANI), ZAD, { sirka: 2.4, zdvih: 17.325, typSachty: 'interiérová',
    profily: kop(E.PROFILY_VYCHOZI['interiérová']) });
  v.data.ock.dalsi = [{ id: 's_b', nazev: o.bezNazvu ? '' : 'Výtah B', ks: 2, zadani: zB }];
  return zak;
}

/* ---------------- A) jedna šachta ---------------- */
{
  const z = zakazka({ jedna: true });
  const d = N.nabidkaData(z, z.varianty[0], J, 'cz');
  test('A jedna šachta: žádný symbol SACHTA_/SACHTY_/POCET_', !Object.keys(d.placeholders).some(k => /^(SACHTA_|SACHTY_|POCET_VARIANT|POCET_SACHET)/.test(k)),
    Object.keys(d.placeholders).filter(k => /SACHT|POCET_/.test(k)));
  test('A jedna šachta: výsledek bez klíčů sachty / sachtyWord', !('sachty' in d) && !('sachtyWord' in d));
  test('A jedna šachta se skladebnými můstky: řádky šachta + můstky jako dnes (R15)', d.placeholders.CENA_MUSTKY_BEZ_DPH !== '' && d.placeholders.CENA_SACHTA_BEZ_DPH !== '');
  const z1 = zakazka({ jedna: true }); z1.varianty[0].data.ock.ks = 1; z1.varianty[0].data.ock.dalsi = [];
  test('A dalsi [] a ks 1 = jedna šachta', !('sachty' in N.nabidkaData(z1, z1.varianty[0], J, 'cz')));
}

/* ---------------- B) dvě varianty šachet, celkem 3 ks ---------------- */
const zB = zakazka(), vB = zB.varianty[0];
const dB = N.nabidkaData(zB, vB, J, 'cz');
const pB = dB.placeholders;
{
  test('B sachty: dvě varianty v pořadí zadání', Array.isArray(dB.sachty) && dB.sachty.length === 2
    && dB.sachty[0].nazev === 'Výtah A' && dB.sachty[1].nazev === 'Výtah B', dB.sachty && dB.sachty.map(s => s.nazev));
  test('B R14: šachta s můstky „vč. můstků", bez můstků ne', dB.sachty[0].nazevTisk === 'Výtah A, vč. můstků' && dB.sachty[1].nazevTisk === 'Výtah B',
    dB.sachty.map(s => s.nazevTisk));
  const soucet = dB.sachty.reduce((a, s) => a + castka(s.cena), 0);
  test('B R7: součet řádků šachet = cena před slevou na korunu', Math.abs(soucet - castka(pB.CENA_PRED_SLEVOU)) < 0.005, [soucet, pB.CENA_PRED_SLEVOU]);
  test('B ceny šachet jsou celé koruny', dB.sachty.every(s => /,00 Kč$/.test(s.cena)), dB.sachty.map(s => s.cena));
  const r = vypocetZ(vB, J);
  test('B ceny šachet = rozpočet obalu (cenaRozpis)', dB.sachty.every((s, i) => castka(s.cena) === r.sachty[i].cenaRozpis), [dB.sachty.map(s => s.cena), r.sachty.map(s => s.cenaRozpis)]);
  test('B R12: cena za řádek (všechny kusy), za kus se netiskne', !Object.keys(dB.sachty[1].ph).some(k => /KUS|ZA_KS/.test(k))
    && dB.sachty[1].ph.SACHTA_KS === '2' && castka(dB.sachty[1].cena) > castka(dB.sachty[0].cena));
  test('B R14: řádky ceny v16 prázdné, CENA CELKEM = koncová cena', pB.CENA_SACHTA_BEZ_DPH === '' && pB.CENA_MUSTKY_BEZ_DPH === ''
    && pB.CENA_BEZ_DPH_SACHTA === '' && pB.CENA_BEZ_DPH_CELKEM === pB.CENA_BEZ_DPH && pB.CENA_BEZ_DPH !== '');
  test('B počty: POCET_VARIANT 2, POCET_SACHET_CELKEM 3, „šachet celkem: 3 ks"', pB.POCET_VARIANT === '2' && pB.POCET_SACHET_CELKEM === '3'
    && pB.SACHTY_CELKEM_POPIS === 'šachet celkem: 3 ks', [pB.POCET_VARIANT, pB.POCET_SACHET_CELKEM, pB.SACHTY_CELKEM_POPIS]);
  test('B symboly šachty: název, ks, popis, cena, nadpis technické části', dB.sachty[1].ph.SACHTA_NAZEV === 'Výtah B'
    && dB.sachty[1].ph.SACHTA_POPIS === 'počet kusů: 2' && dB.sachty[1].ph.SACHTA_TS_NAZEV === 'VARIANTA ŠACHTY: Výtah B – 2 ks'
    && dB.sachty[0].ph.SACHTA_TS_NAZEV === 'VARIANTA ŠACHTY: Výtah A', dB.sachty.map(s => s.ph.SACHTA_TS_NAZEV));
  test('B Word: položky smyčky = symboly šachet, společné SACHTY_CELKEM_POPIS', dB.sachtyWord && dB.sachtyWord.polozky.length === 2
    && dB.sachtyWord.polozky[1].SACHTA_NAZEV === 'Výtah B' && dB.sachtyWord.spolecne.SACHTY_CELKEM_POPIS === pB.SACHTY_CELKEM_POPIS);
  const zN = zakazka({ bezNazvu: true });
  const dN = N.nabidkaData(zN, zN.varianty[0], J, 'en');
  test('B nepojmenovaná šachta: „Šachta 2" v jazyce dokumentu', dN.sachty[1].nazev === tr('Šachta', 'en') + ' 2' && !/Šachta/.test(dN.sachty[1].nazev), dN.sachty[1].nazev);
}

/* ---------------- C) sleva ---------------- */
{
  const z = zakazka(); const v = z.varianty[0];
  v.data.sleva = { procenta: 5, stav: 'schváleno automaticky', role: 'Obchodník' };
  const d = N.nabidkaData(z, v, J, 'cz');
  const soucet = d.sachty.reduce((a, s) => a + castka(s.cena), 0);
  test('C se slevou: řádky šachet před slevou, součet = Cena před slevou', Math.abs(soucet - castka(d.placeholders.CENA_PRED_SLEVOU)) < 0.005
    && d.placeholders.SLEVA_KC !== '' && castka(d.placeholders.CENA_BEZ_DPH_CELKEM) < soucet, [soucet, d.placeholders.CENA_PRED_SLEVOU, d.placeholders.CENA_BEZ_DPH_CELKEM]);
}

/* ---------------- D) eura a překlad ---------------- */
for (const L of ['en', 'de', 'fr']) {
  const d = N.nabidkaData(zB, vB, J, L);
  const soucet = d.sachty.reduce((a, s) => a + castka(s.cena), 0);
  test('D ' + L + ': součet řádků v eurech = cena před slevou', Math.abs(soucet - castka(d.placeholders.CENA_PRED_SLEVOU)) < 0.005 && /€|EUR/.test(d.sachty[0].cena),
    [d.sachty.map(s => s.cena), d.placeholders.CENA_PRED_SLEVOU]);
  const texty = [d.sachty[0].nazevTisk, d.sachty[1].ph.SACHTA_POPIS, d.sachty[1].ph.SACHTA_TS_NAZEV, d.placeholders.SACHTY_CELKEM_POPIS].join(' | ');
  test('D ' + L + ': texty šachet přeložené (vč. můstků, počet kusů, VARIANTA ŠACHTY, šachet celkem)',
    !/vč\. můstků|počet kusů|VARIANTA ŠACHTY|šachet celkem| ks\b/.test(texty), texty);
}

/* ---------------- E) technická část po šachtách ---------------- */
{
  const z = zakazka(); const v = z.varianty[0];
  v.data.techspec.hodnoty.kotveniTyp = 'ruční A';                    // pole šachty — jen šachta 1
  v.data.techspec.hodnoty.leseniUvnitr = 'ruční zakázka';            // pole za zakázku
  v.data.ock.dalsi[0].techspec = { hodnoty: { strecha: 'ruční střecha B', leseniUvnitr: 'nepatří sem' } };
  const d = N.nabidkaData(z, v, J, 'cz');
  const [a, b] = d.sachty.map(s => s.ph);
  test('E rozměr vnitřní ze zadání své šachty', a.TS_SIRKA_VNITRNI === '1600' && b.TS_SIRKA_VNITRNI === '2400', [a.TS_SIRKA_VNITRNI, b.TS_SIRKA_VNITRNI]);
  test('E zdvih ze zadání své šachty', a.TS_ZDVIH !== b.TS_ZDVIH && /17,325/.test(b.TS_ZDVIH), [a.TS_ZDVIH, b.TS_ZDVIH]);
  test('E ruční hodnota šachty 2 z dalsi[0].techspec', b.TS_STRECHA === 'ruční střecha B' && a.TS_STRECHA !== 'ruční střecha B', [a.TS_STRECHA, b.TS_STRECHA]);
  test('E ruční pole šachty 1 do šachty 2 neprosákne', a.TS_KOTVENI_TYP === 'ruční A' && b.TS_KOTVENI_TYP !== 'ruční A', [a.TS_KOTVENI_TYP, b.TS_KOTVENI_TYP]);
  test('E pole za zakázku: jednou v nabídce (v.data.techspec), šachta 2 ho nepřepíše', d.placeholders.TS_LESENI_UVNITR === 'ruční zakázka'
    && !('TS_LESENI_UVNITR' in b));
  test('E můstky jen u šachty, která je má', a.TS_MUSTKY_ROZMER !== '' && b.TS_MUSTKY_ROZMER === '' && b.TS_MUSTKY === '', [a.TS_MUSTKY_ROZMER, b.TS_MUSTKY_ROZMER, b.TS_MUSTKY]);
  const tsB = TS.tsSachtaTechspec(v.data, 1);
  test('E tsSachtaTechspec: šachta 1 = v.data.techspec, šachta 2 = pole zakázky + vlastní pole šachty',
    TS.tsSachtaTechspec(v.data, 0) === v.data.techspec && tsB.hodnoty.leseniUvnitr === 'ruční zakázka' && tsB.hodnoty.strecha === 'ruční střecha B'
    && !('kotveniTyp' in tsB.hodnoty), tsB.hodnoty);
  test('E tsPoleSachty: rozměr/střecha/můstky ano, lešení a SOUČÁSTÍ NENÍ ne', TS.tsPoleSachty('strecha') && TS.tsPoleSachty('mustkyRozmer')
    && TS.tsPoleSachty('pudorys') && !TS.tsPoleSachty('leseniUvnitr') && !TS.tsPoleSachty('neni1'));
}

/* ---------------- F) zábrana šablony ---------------- */
{
  const v16 = new Set(['CENA_BEZ_DPH_SACHTA', 'CENA_BEZ_DPH_CELKEM', 'CENA_SACHTA_BEZ_DPH', 'CENA_MUSTKY_BEZ_DPH', 'TS_MUSTKY_ROZMER', 'TS_USAZENI_LEVA']);
  const v17 = new Set([...v16, 'SACHTA_NAZEV', 'SACHTA_CENA_BEZ_DPH', 'SACHTA_POPIS', 'SACHTA_TS_NAZEV', 'SACHTY_CELKEM_POPIS']);
  let chyba = '';
  try { N.nabidkaData(zB, vB, J, 'cz', { symboly: v16 }); } catch (e) { chyba = e.message; }
  test('F v16 + víc šachet: tisk zastaven se srozumitelnou hláškou', chyba === V.VS_SABLONA_ZABRANA && /v17/.test(chyba), chyba);
  chyba = '';
  try { N.nabidkaData(zB, vB, J, 'cz', { symboly: new Set(['CENA_BEZ_DPH', 'TS_SOKL']) }); } catch (e) { chyba = e.message; }
  test('F v15 a starší + víc šachet: zastaveno', chyba === V.VS_SABLONA_ZABRANA, chyba);
  let d17 = null;
  try { d17 = N.nabidkaData(zB, vB, J, 'cz', { symboly: v17 }); } catch (e) { chyba = e.message; }
  test('F v17 + víc šachet: projde', d17 && d17.sachty.length === 2);
  const zj = zakazka({ jedna: true });
  let dj = null; try { dj = N.nabidkaData(zj, zj.varianty[0], J, 'cz', { symboly: v16 }); } catch (e) { dj = null; }
  test('F jedna šachta + v16: projde (R15)', !!dj);
  test('F vsSablonaZabrana: víc šachet + v16 = text, + v17 = \'\', jedna šachta = \'\', bez šablony = \'\'',
    V.vsSablonaZabrana(vB.data.ock, v16) === V.VS_SABLONA_ZABRANA && V.vsSablonaZabrana(vB.data.ock, v17) === ''
    && V.vsSablonaZabrana(zj.varianty[0].data.ock, v16) === '' && V.vsSablonaZabrana(vB.data.ock, null) === '');
  test('F vsSablonaUmiSachty: množina i pole', V.vsSablonaUmiSachty(v17) && V.vsSablonaUmiSachty(['SACHTA_NAZEV', 'SACHTA_CENA_BEZ_DPH'])
    && !V.vsSablonaUmiSachty(v16) && !V.vsSablonaUmiSachty(null) && !V.vsSablonaUmiSachty(new Set(['SACHTA_NAZEV'])));
  const zm = zakazka({ fixes: false });
  test('F Model 1 + další šachty = jen šachta 1 (3.5): bez tabulky i bez zábrany', !('sachty' in N.nabidkaData(zm, zm.varianty[0], J, 'cz', { symboly: v16 }))
    && V.vsSablonaZabrana(zm.varianty[0].data.ock, v16) === '');
  const zk = zakazka({ jedna: true }); zk.varianty[0].data.ock.ks = 3;
  const dk = N.nabidkaData(zk, zk.varianty[0], J, 'cz');
  test('F jedna varianta × 3 ks = režim víc šachet (R20): jeden řádek, 3 ks', dk.sachty && dk.sachty.length === 1 && dk.sachty[0].ks === 3
    && dk.placeholders.POCET_SACHET_CELKEM === '3' && castka(dk.sachty[0].cena) === castka(dk.placeholders.CENA_PRED_SLEVOU));
}

/* ---------------- G) online náhled ---------------- */
{
  const sek = N.nabidkaNahledSekce(pB, 'cz', dB.platbyOck, dB.tsExtra, dB.sachty);
  const nazvy = sek.map(s => s.sekce);
  test('G technická část po šachtách s názvem šachty', nazvy.includes('ZÁKLADNÍ PARAMETRY ŠACHTY – Výtah A') && nazvy.includes('ZÁKLADNÍ PARAMETRY ŠACHTY – Výtah B (2 ks)')
    && nazvy.includes('MŮSTKY MEZI BUDOVOU A OCK – Výtah A') && !nazvy.includes('MŮSTKY MEZI BUDOVOU A OCK – Výtah B (2 ks)')
    && !nazvy.includes('ZÁKLADNÍ PARAMETRY ŠACHTY'), nazvy);
  const zakl = sek.find(s => s.sekce === 'ZÁKLADNÍ PARAMETRY ŠACHTY – Výtah B (2 ks)');
  test('G rozměr šachty B v její sekci', zakl && zakl.radky.some(r => /2400/.test(r[1])), zakl && zakl.radky);
  const ob = sek.find(s => /OBCHODNÍ ČÁST/.test(s.sekce));
  const radky = ob.radky.map(r => r[0] + ' = ' + r[1]);
  test('G obchodní část: řádek za šachtu, součet se „šachet celkem"', /^Výtah A, vč. můstků – 1 ks \(bez DPH\) = /.test(radky[0])
    && /^Výtah B – 2 ks \(bez DPH\) = /.test(radky[1]) && /^Cena celkem \(bez DPH\) – šachet celkem: 3 ks = /.test(radky[2])
    && !radky.some(r => /^Výtahová šachta|^Můstky/.test(r)), radky);
  const sekEn = N.nabidkaNahledSekce(N.nabidkaData(zB, vB, J, 'en').placeholders, 'en', null, [], N.nabidkaData(zB, vB, J, 'en').sachty);
  test('G náhled EN: názvy sekcí šachet přeložené', sekEn.some(s => /^BASIC SHAFT PARAMETERS – Výtah B/i.test(s.sekce) || (/– Výtah B/.test(s.sekce) && !/ŠACHTY/.test(s.sekce))),
    sekEn.map(s => s.sekce).slice(0, 6));
  const zj = zakazka({ jedna: true });
  const dj = N.nabidkaData(zj, zj.varianty[0], J, 'cz');
  test('G jedna šachta: náhled bez názvů šachet (jako dnes)', N.nabidkaNahledSekce(dj.placeholders, 'cz', dj.platbyOck, dj.tsExtra)
    .every(s => !/ – Výtah|Šachta 1/.test(s.sekce)));
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
