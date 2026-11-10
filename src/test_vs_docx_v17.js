/* VS #570 / E4 (#594) — WORD CN v17 A SMYČKA ŠACHET (docxgen + nástroj šablon), 10. 11. 2026.
 *
 * Firemní šablony v repu nejsou — sada vyrobí syntetickou CN v15 (stavba
 * tabulek jako firemní: sekční pruhy a řádky v jedné tabulce, cenová část),
 * z ní nástrojem v16 (cnV16) a v17 (cnV17), přesně jak to udělá J. V.
 *
 *  A) nástroj: v17 nese symboly šachet a značky smyček, druhé spuštění
 *     i vstup bez v16 = chyba;
 *  B) JEDNA ŠACHTA: v17 = v16 BAJT PO BAJTU (document.xml po vyplnění) —
 *     s můstky i bez, se slevou, česky i v přeložené šabloně EN/DE (R15);
 *  C) VÍC ŠACHET: technická část za každou šachtu s jejími hodnotami,
 *     obchodní část = řádky šachet + CENA CELKEM se „šachet celkem", řádky
 *     VÝTAHOVÁ ŠACHTA a MŮSTKY ze v16 pryč (R14), žádný symbol ani značka
 *     v dokumentu, XML bez vad; EN v eurech;
 *  D) bezpečnost a vady: název šachty „{{FIRMA_ICO}}" se nerozvine (B86),
 *     značka bez páru = chyba, šablona bez značek beze změny;
 *  E) překlad šablony v17: značky se nepřekládají ani nehlásí, symboly
 *     zůstanou všechny.
 * Pojistka: na 079cfc6 nástroj cnV17 ani docxSmyckaSachet neexistují —
 * sada selže; viz zpráva commitu.
 * Spuštění: node src/test_vs_docx_v17.js */
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
nacti('./techspec.js'); nacti('./sleva.js'); nacti('./zaokrouhleni.js'); nacti('./firma.js');
const ZK = nacti('./zakazka.js');
nacti('./zamek.js');
const N = nacti('./nabidka.js');
const DG = nacti('./docxgen.js');
const J = require('./jekly.json');
const vyrob = require('../nastroje/vyrob_sablony.js');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 600)); } };
const kop = x => JSON.parse(JSON.stringify(x));
const dec = new TextDecoder(), enc = new TextEncoder();

const SKLADBA = { mustekRamBmKc: 10000, mustekPodlahaPlechM2Kc: 1000, mustekPodlahaPororostM2Kc: 1100, mustekPodlahaVanaM2Kc: 1200,
  mustekZabradliKovBmKc: 2000, mustekZabradliSkloBmKc: 5000, mustekKotveniDeskaKc: 3000, mustekKotveniSloupKc: 3100,
  mustekKotveniKonzolaKc: 3200, mustekZabradliSkloMontazHodBm: 1 };
const ZAD = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 };
const MUSTKY = [{ ks: 2, sirkaMm: 1600, delkaMm: 1200, podlaha: 'plech', zabradli: 'kov', zabradliStrany: 2, sloupyKs: 2, sloupVyskaM: 3.2 }];
function zakazka(o) {
  o = o || {};
  const zak = ZK.novaZakazka();
  zak.cislo = '2026-OPR-CN-9594'; zak.nazevAkce = 'VS E4 Word';
  const v = zak.varianty[0];
  Object.assign(v.data.ock.zadani, ZAD, { typSachty: 'exteriérová' }, o.mustky ? { mustky: kop(MUSTKY) } : {});
  v.data.ock.fixes = true;
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky(), SKLADBA, { kurzEurKc: 25 });
  if (o.sleva) v.data.sleva = { procenta: 5, stav: 'schváleno automaticky', role: 'Obchodník' };
  if (o.vice) {
    v.data.ock.nazev = o.nazevA || 'Výtah A';
    const zB = Object.assign(kop(E.DEFAULT_ZADANI), ZAD, { sirka: 2.4, zdvih: 17.325, typSachty: 'interiérová',
      profily: kop(E.PROFILY_VYCHOZI['interiérová']) });
    v.data.ock.dalsi = [{ id: 's_b', nazev: 'Výtah B', ks: 2, zadani: zB }];
  }
  return zak;
}

/* syntetická CN v15 (stavba jako firemní: pruhy a řádky v jedné tabulce) */
async function sablonaV15() {
  return DG.zipPrecti(new Uint8Array(await DG.docxDokumentBlob('Nabídka', [
    { sekce: 'ZÁKLADNÍ PARAMETRY ŠACHTY', radky: [['ROZMĚR ŠACHTY – VNITŘNÍ [mm]', 'šířka {{TS_SIRKA_VNITRNI}} × hloubka {{TS_HLOUBKA_VNITRNI}}'],
      ['ZDVIH VÝTAHU [m]', '{{TS_ZDVIH}}'], ['USAZENÍ OCK – BOČNÍ STĚNY', '{{TS_USAZENI_BOCNI}}'],
      ['USAZENÍ OCK – LEVÁ BOČNÍ STĚNA', '{{TS_USAZENI_LEVA}}'], ['USAZENÍ OCK – PRAVÁ BOČNÍ STĚNA', '{{TS_USAZENI_PRAVA}}']] },
    { sekce: 'KONSTRUKČNÍ ŘEŠENÍ ŠACHTY', radky: [['STŘECHA ŠACHTY', '{{TS_STRECHA}}'], ['TYP KONSTRUKCE (ENG-M)', '{{TS_TYP_KONSTRUKCE}}']] },
    { sekce: 'OPLÁŠTĚNÍ ŠACHTY', radky: [['TYP OPLÁŠTĚNÍ', '{{TS_TYP_OPLASTENI}}'], ['SVĚTLÍKY U ŠACHETNÍCH DVEŘÍ', '{{TS_SVETLIKY_DVERI}}']] },
    { sekce: 'DOPLŇKOVÉ KONSTRUKCE', radky: [['MŮSTKY MEZI BUDOVOU A OCK', '{{TS_MUSTKY}}'], ['PŘECHODOVÉ PLECHY V NÁSTUPIŠTÍCH', '{{TS_PRECHODOVE_PLECHY}}'],
      ['OPLECHOVÁNÍ SOKLU PROHLUBNĚ', '{{TS_SOKL}}']] },
    { sekce: 'STAVEBNÍ A PŘÍPRAVNÉ PRÁCE', radky: [['LEŠENÍ – UVNITŘ ŠACHTY', '{{TS_LESENI_UVNITR}}'], ['ZÁBRANY DO DVEŘNÍCH VSTUPŮ', '{{TS_ZABRANY_VSTUPY}}']] },
    { sekce: 'SOUČÁSTÍ DODÁVKY NENÍ', radky: [['OSVĚTLENÍ NÁSTUPIŠŤ', '{{TS_NENI_OSVETLENI}}'], ['OPLECHOVÁNÍ SOKLU PROHLUBNĚ', '{{TS_NENI_SOKL}}']] },
    { sekce: 'CENA', radky: [['Cena před slevou', '{{CENA_PRED_SLEVOU}}'], ['Sleva', '− {{SLEVA_KC}} ({{SLEVA_PROC}} %)'],
      ['VÝTAHOVÁ ŠACHTA', '{{CENA_BEZ_DPH}} bez DPH'], ['CELKEM za nabídku', '{{CENA_S_DPH}} včetně DPH']] }]).arrayBuffer()));
}
const sDoc = (pol, fn) => pol.map(p => p.nazev === 'word/document.xml' ? Object.assign({}, p, { data: enc.encode(fn(dec.decode(p.data))) }) : p);
const docXml = pol => dec.decode(pol.find(p => p.nazev === 'word/document.xml').data);
async function prelozena(pol, L) {
  const stat = {};
  const b = await DG.docxPrelozSablonu(await DG.zipZapis(pol).arrayBuffer(), L, stat);
  return { pol: await DG.zipPrecti(new Uint8Array(await b.arrayBuffer())), stat };
}
async function vypln(pol, data) {
  const buf = await DG.zipZapis(pol).arrayBuffer();
  const vys = await DG.zipPrecti(new Uint8Array(await (await DG.docxVyplnSablonu(buf, data.placeholders, [], {},
    { radkyNavic: data.tsRadkyNavic, sachty: data.sachtyWord || null })).arrayBuffer()));
  return dec.decode(vys.find(p => p.nazev === 'word/document.xml').data);
}
const text = x => x.replace(/<\/w:tc>/g, ' | ').replace(/<\/w:p>/g, ' ').replace(/<\/w:tr>/g, '\n').replace(/<[^>]+>/g, '')
  .replace(/[ \t]+/g, ' ').replace(/ \| \n/g, '\n').replace(/ \n/g, '\n');

(async () => {
  const p15 = await sablonaV15();
  const p16 = sDoc(p15, vyrob.cnV16);
  const p17 = sDoc(p16, vyrob.cnV17);
  const sym16 = new Set(DG.klicePlaceholderu(docXml(p16)));
  const sym17 = new Set(DG.klicePlaceholderu(docXml(p17)));
  const x17 = docXml(p17);

  /* ---------- A) nástroj ---------- */
  test('A v17: symboly šachet přibyly, symboly v16 zůstaly', ['SACHTA_NAZEV', 'SACHTA_POPIS', 'SACHTA_CENA_BEZ_DPH', 'SACHTA_TS_NAZEV', 'SACHTY_CELKEM_POPIS']
    .every(k => sym17.has(k)) && [...sym16].every(k => sym17.has(k)), [...sym17].filter(k => !sym16.has(k)));
  test('A v17: dvě smyčky (2× {#sachty}, 2× {/sachty}) v řádcích tabulky', (x17.match(/\{#sachty\}/g) || []).length === 2 && (x17.match(/\{\/sachty\}/g) || []).length === 2);
  test('A v17: aplikace v17 pozná, v16 ne', V.vsSablonaUmiSachty(sym17) && !V.vsSablonaUmiSachty(sym16));
  let e1 = ''; try { vyrob.cnV17(x17); } catch (e) { e1 = e.message; }
  test('A v17 podruhé = chyba', /už smyčku šachet má/.test(e1), e1);
  let e2 = ''; try { vyrob.cnV17(docXml(p15)); } catch (e) { e2 = e.message; }
  test('A vstup v15 = chyba (nejdřív v16)', /není CN v16/.test(e2), e2);
  test('A v17 XML bez vad', (await DG.docxXmlVady(await DG.zipZapis(p17).arrayBuffer())).length === 0);
  test('A šablona bez značek: smyčka nic nemění', DG.docxSmyckaSachet(docXml(p16), null) === docXml(p16));

  /* ---------- B) jedna šachta: v17 = v16 bajt po bajtu ---------- */
  for (const [jm, o] of [['bez můstků', {}], ['s můstky', { mustky: true }], ['s můstky a slevou', { mustky: true, sleva: true }], ['bez můstků se slevou', { sleva: true }]]) {
    const z = zakazka(o); const v = z.varianty[0];
    const a = await vypln(p16, N.nabidkaData(z, v, J, 'cz', { symboly: sym16 }));
    const b = await vypln(p17, N.nabidkaData(z, v, J, 'cz', { symboly: sym17 }));
    test('B jedna šachta ' + jm + ': v17 = v16 (document.xml shodný)', a === b && !/sachty|SACHT/.test(b), a === b ? '' : [text(a).slice(-600), text(b).slice(-600)]);
  }
  for (const L of ['en', 'de']) {
    const t16 = await prelozena(p16, L), t17 = await prelozena(p17, L);
    const z = zakazka({ mustky: true, sleva: true }); const v = z.varianty[0];
    const a = await vypln(t16.pol, N.nabidkaData(z, v, J, L, { symboly: sym16 }));
    const b = await vypln(t17.pol, N.nabidkaData(z, v, J, L, { symboly: sym17 }));
    test('B jedna šachta ' + L + ' (přeložená šablona): v17 = v16', a === b, a === b ? '' : [text(a).slice(-500), text(b).slice(-500)]);
    /* E) překlad šablony v17 */
    test('E překlad ' + L + ': značky smyček se nehlásí jako nepřeložené, symboly zůstaly', !t17.stat.chybi.concat(t17.stat.symbolove || []).some(t => /sachty/.test(t))
      && (t17.stat.chybi.length + (t17.stat.symbolove || []).length) === (t16.stat.chybi.length + (t16.stat.symbolove || []).length)
      && DG.klicePlaceholderu(docXml(t17.pol)).length === DG.klicePlaceholderu(x17).length && /\{#sachty\}/.test(docXml(t17.pol)),
      [t17.stat.chybi, t17.stat.symbolove]);
  }

  /* ---------- C) víc šachet ---------- */
  {
    const z = zakazka({ vice: true, mustky: true }); const v = z.varianty[0];
    const d = N.nabidkaData(z, v, J, 'cz', { symboly: sym17 });
    const x = await vypln(p17, d);
    const t = text(x);
    test('C dokument bez symbolů a značek', !/\{\{|\{#|\{\//.test(t), t.match(/\{[^\n]{0,40}/g));
    test('C XML bez vad', (await DG.docxXmlVady(await DG.zipZapis(sDoc(p17, () => x)).arrayBuffer())).length === 0);
    const iA = t.indexOf('VARIANTA ŠACHTY: Výtah A\n'), iB = t.indexOf('VARIANTA ŠACHTY: Výtah B – 2 ks\n'), iS = t.indexOf('STAVEBNÍ A PŘÍPRAVNÉ PRÁCE');
    test('C technická část: nadpis za každou šachtu, v pořadí, před STAVEBNÍMI pracemi (za zakázku jednou)', iA >= 0 && iB > iA && iS > iB
      && (t.match(/STAVEBNÍ A PŘÍPRAVNÉ PRÁCE/g) || []).length === 1, t.slice(0, 1500));
    const castA = t.slice(iA, iB), castB = t.slice(iB, iS);
    test('C rozměry ze své šachty', /šířka 1600 × hloubka 2100/.test(castA) && /šířka 2400 × hloubka 2100/.test(castB), [castA.slice(0, 200), castB.slice(0, 200)]);
    test('C sekce ZÁKLADNÍ PARAMETRY za každou šachtu', (t.match(/\nZÁKLADNÍ PARAMETRY ŠACHTY\n/g) || []).length === 2);
    test('C MŮSTKY jen u šachty A (skladebné), u B sekce zmizela', /\nMŮSTKY MEZI BUDOVOU A OCK\nPOČET A ROZMĚR \| 2 ks/.test(castA) && !/MŮSTKY MEZI BUDOVOU A OCK/.test(castB), castB);
    const cena = t.slice(t.indexOf('CENA\n'));
    test('C obchodní část: řádek za šachtu (název, počet kusů, cena), CENA CELKEM se „šachet celkem: 3 ks"',
      /\nVýtah A, vč\. můstků počet kusů: 1 \| [^|\n]+,00 Kč bez DPH\nVýtah B počet kusů: 2 \| [^|\n]+,00 Kč bez DPH\nCENA CELKEM výtahová šachta a můstky mezi budovou a OCK šachet celkem: 3 ks \| [^|\n]+,00 Kč bez DPH\nCELKEM za nabídku/.test(cena), cena);
    test('C R14: řádky VÝTAHOVÁ ŠACHTA a MŮSTKY (cena) ze v16 pryč', !/VÝTAHOVÁ ŠACHTA/.test(cena) && !/^MŮSTKY/m.test(cena), cena);
    const ceny = (cena.match(/\| ([^|\n]+),00 Kč bez DPH/g) || []).map(s => +s.replace(/\D/g, '') / 100);
    test('C řádky šachet dají CENU CELKEM (bez slevy)', ceny.length === 3 && ceny[0] + ceny[1] === ceny[2], ceny);
    /* se slevou */
    const zs = zakazka({ vice: true, mustky: true, sleva: true });
    const ts = text(await vypln(p17, N.nabidkaData(zs, zs.varianty[0], J, 'cz', { symboly: sym17 })));
    test('C se slevou: šachty, Cena před slevou, Sleva, CENA CELKEM', /\nVýtah A[^\n]*\nVýtah B[^\n]*\nCena před slevou[^\n]*\nSleva[^\n]*\nCENA CELKEM/.test(ts), ts.slice(ts.indexOf('CENA\n')));
    /* EN v eurech nad přeloženou šablonou */
    const t17en = await prelozena(p17, 'en');
    const ten = text(await vypln(t17en.pol, N.nabidkaData(z, v, J, 'en', { symboly: sym17 })));
    test('C EN: šachty v eurech, texty přeložené, bez symbolů', /SHAFT VARIANT: Výtah B – 2 pcs/.test(ten) && /Výtah A, incl\. bridges number of units: 1 \| /.test(ten)
      && /shafts in total: 3 pcs/.test(ten) && !/\{\{|\{#|\{\/|Kč/.test(ten), [ten.match(/.{0,30}Výtah B.{0,30}/g), ten.slice(ten.lastIndexOf('Výtah A') - 50)]);
  }

  /* ---------- D) bezpečnost a vady ---------- */
  {
    const z = zakazka({ vice: true, nazevA: '{{FIRMA_ICO}} A' }); const v = z.varianty[0];
    const x = await vypln(p17, Object.assign(N.nabidkaData(z, v, J, 'cz', { symboly: sym17 }), {}));
    test('D B86: název šachty „{{FIRMA_ICO}}" se nerozvine (zůstane doslova, závorka entitou)', /&#123;\{FIRMA_ICO\}\} A/.test(x) || /&#123;&#123;FIRMA_ICO\}\} A/.test(x), (x.match(/.{20}FIRMA_ICO.{10}/) || [])[0]);
    let ch = '';
    try { DG.docxSmyckaSachet(docXml(p17).replace('{/sachty}', '{x}'), null); } catch (e) { ch = e.message; }
    test('D značka bez páru = chyba šablony', /vadnou smyčku šachet/.test(ch), ch);
    ch = '';
    try { DG.docxSmyckaSachet('<w:body><w:p><w:r><w:t>{#sachty}</w:t></w:r></w:p><w:p><w:r><w:t>{/sachty}</w:t></w:r></w:p></w:body>', null); } catch (e) { ch = e.message; }
    test('D značky mimo tabulku = chyba šablony', /téže úrovně/.test(ch), ch);
  }

  console.log(`\n${ok} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
