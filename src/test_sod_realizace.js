/* SMLOUVA O DÍLO REALIZACE: ZÁRUKA, SPLÁTKY A PŘEDÁNÍ K MONTÁŽI Z KRYCÍHO
 * LISTU OCK (K18-N100, 1. 10. 2026).
 *
 * Nález z ostré v30.9.1 (C19, šablona SOD_REALIZACE v1): smlouva převzala
 * cenu a termíny montáže, ale {{SOD_ZARUKA_MESICU}} a {{SOD_SPLATKA1–4_PROC}}
 * zůstaly ve Wordu jako {{…}}, ač krycí list nesl 60 měsíců a 50 / 40 / 10.
 *
 * Hlídá se:
 *   – záruka (jen číslo, šablona píše „měsíců" sama), ruční přepis platí,
 *   – splátky šablony v1: 1 ← záloha, 2 ← dílčí faktura, 4 ← konečná;
 *     věta 3 (druhá dílčí platba, kterou krycí list nemá) zmizí,
 *   – „Bez zálohy": věta o záloze zmizí, v seznamu plateb chybí,
 *   – měsíční fakturace: v1 smlouvu nevyrobí a řekne proč, v2 dostane větu,
 *   – seznam plateb {{SOD_PLATEBNI_KALENDAR}} (šablona v2) a jeho rozvinutí
 *     ve Wordu za každou splátku,
 *   – zamčená varianta drží způsob fakturace z doby odeslání,
 *   – „Ukončení montáže a předání montáži výtahu" → SOD_TERMIN_PREDANI_K_MONTAZI.
 * Před opravou nic z toho neexistovalo — sada selže.
 *
 * Spuštění: cd src && node test_sod_realizace.js */
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./preklad.js');
const dg = nacti('./docxgen.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
['./techspec.js', './sleva.js', './zaokrouhleni.js', './firma.js', './zpracovatel.js', './plan_plateb.js',
  './nabidka_proj.js'].forEach(nacti);
const zk = nacti('./zakazka.js');
const ZM = nacti('./zamek.js');
const KR = nacti('./kryci.js');
nacti('./kryci_proj.js');
nacti('./dokumenty.js');
nacti('./nabidka.js');
const sod = nacti('./sod.js');
const JEKLY = JSON.parse(require('fs').readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info.slice(0, 600) : JSON.stringify(info))); } };
const hazi = (fn) => { try { fn(); return ''; } catch (e) { return e.message || String(e); } };

global.NAST = { firma: global.firmaDefault() };
const novaZ = () => { const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 0405'; return z; };
const sablona = (...symboly) => ({ symboly: new Set(symboly) });
const V1 = sablona('SOD_SPLATKA1_PROC', 'SOD_SPLATKA2_PROC', 'SOD_SPLATKA3_PROC', 'SOD_SPLATKA4_PROC', 'SOD_ZARUKA_MESICU', 'CENA_BEZ_DPH');
const V2 = sablona('SOD_PLATEBNI_KALENDAR', 'SOD_ZARUKA_MESICU', 'CENA_BEZ_DPH');
const hodnoty = (v, h) => { v.data.kryci = v.data.kryci || { hodnoty: {} }; v.data.kryci.hodnoty = Object.assign(v.data.kryci.hodnoty || {}, h); };

/* 1) výchozí krycí list: 60 měsíců, 50 / 40 / 10 */
{
  const z = novaZ(), v = z.varianty[0];
  const d = sod.sodData(z, v, JEKLY, 'cz', V1);
  const P = d.placeholders;
  test('záruka z krycího listu: SOD_ZARUKA_MESICU = 60 (jen číslo)', P.SOD_ZARUKA_MESICU === '60', P.SOD_ZARUKA_MESICU);
  test('splátky v1: 1 = 50, 2 = 40, 4 = 10', P.SOD_SPLATKA1_PROC === '50' && P.SOD_SPLATKA2_PROC === '40' && P.SOD_SPLATKA4_PROC === '10',
    [P.SOD_SPLATKA1_PROC, P.SOD_SPLATKA2_PROC, P.SOD_SPLATKA4_PROC]);
  test('v1: věta 3 (druhá dílčí platba, krycí list ji nemá) zmizí', (d.odstavcePryc || []).join() === 'SOD_SPLATKA3_PROC', d.odstavcePryc);
  const sum = ['SOD_SPLATKA1_PROC', 'SOD_SPLATKA2_PROC', 'SOD_SPLATKA4_PROC'].reduce((a, k) => a + (+P[k]), 0);
  test('součet splátek v1 = 100 %', sum === 100, sum);
  const d2 = sod.sodData(z, v, JEKLY, 'cz', V2);
  test('seznam plateb v2: tři věty v pořadí záloha / dílčí / konečná',
    d2.placeholders.SOD_PLATEBNI_KALENDAR === 'při uzavření této smlouvy o dílo 50 % z celkové ceny díla\n'
      + 'po zahájení montáže 40 % z celkové ceny díla\n'
      + 'po provedení celého díla zhotovitele a jeho předání a převzetí bez vad a nedodělků bránících provozu výtahu zbývajících 10 % z celkové ceny díla',
    d2.placeholders.SOD_PLATEBNI_KALENDAR);
  test('v2: nic se nemaže', !d2.odstavcePryc);
  test('dokument sod si vyžádá symboly šablony (sablonaSymboly)', !!(DOKUMENTY.sod && DOKUMENTY.sod.sablonaSymboly === true));
}

/* 2) ruční záruka a termín předání k montáži */
{
  const z = novaZ(), v = z.varianty[0];
  hodnoty(v, { zarukaMesicu: '36', terminMontaz: '2026-12-04' });
  const P = sod.sodData(z, v, JEKLY, 'cz', V1).placeholders;
  test('ruční záruka 36 platí', P.SOD_ZARUKA_MESICU === '36', P.SOD_ZARUKA_MESICU);
  test('termín „Ukončení montáže a předání montáži výtahu" → SOD_TERMIN_PREDANI_K_MONTAZI', P.SOD_TERMIN_PREDANI_K_MONTAZI === '04.12.2026', P.SOD_TERMIN_PREDANI_K_MONTAZI);
  hodnoty(v, { zarukaMesicu: 'dle dohody' });
  test('záruka bez čísla: symbol se neplní (zůstane {{…}})', !('SOD_ZARUKA_MESICU' in sod.sodData(z, v, JEKLY, 'cz', V1).placeholders));
}

/* 3) Bez zálohy */
{
  const z = novaZ(), v = z.varianty[0];
  hodnoty(v, { zaloha1: 'Bez zálohy', faktura2: '90 % – po zahájení montáže' });
  const d = sod.sodData(z, v, JEKLY, 'cz', V1);
  test('bez zálohy v1: věta o záloze a věta 3 zmizí', ['SOD_SPLATKA1_PROC', 'SOD_SPLATKA3_PROC'].every(k => (d.odstavcePryc || []).indexOf(k) >= 0)
    && !('SOD_SPLATKA1_PROC' in d.placeholders), d.odstavcePryc);
  test('bez zálohy v1: 2 = 90, 4 = 10', d.placeholders.SOD_SPLATKA2_PROC === '90' && d.placeholders.SOD_SPLATKA4_PROC === '10');
  const k = sod.sodData(z, v, JEKLY, 'cz', V2).placeholders.SOD_PLATEBNI_KALENDAR;
  test('bez zálohy v2: dvě věty, žádná o záloze', k.split('\n').length === 2 && !/při uzavření/.test(k), k);
}

/* 4) měsíční fakturace */
{
  const z = novaZ(), v = z.varianty[0];
  hodnoty(v, { zpusobFakturace: 'Měsíční' });
  const ch = hazi(() => sod.sodData(z, v, JEKLY, 'cz', V1));
  test('měsíční fakturace + v1: smlouva nevznikne a řekne proč', /měsíční fakturaci/.test(ch) && /SOD_PLATEBNI_KALENDAR/.test(ch), ch);
  const P = sod.sodData(z, v, JEKLY, 'cz', V2).placeholders;
  test('měsíční fakturace + v2: jedna věta o měsíční fakturaci', P.SOD_PLATEBNI_KALENDAR === KR.KRYCI_FAKTURACE_MESICNE_VETA, P.SOD_PLATEBNI_KALENDAR);
  test('měsíční fakturace: splátky v1 se neplní', !('SOD_SPLATKA1_PROC' in P) && !('SOD_SPLATKA4_PROC' in P));
  test('náhled bez šablony se neodmítá', hazi(() => sod.sodData(z, v, JEKLY, 'cz')) === '');
}

/* 5) zamčená varianta drží způsob fakturace z doby odeslání */
{
  global.NAST.firma.zpusobFakturaceOck = 'Měsíční';
  const z = novaZ(), v = z.varianty[0];
  KR.kryciZmrazPodminky(z, v, JEKLY);
  ZM.zamkniVariantu(v, { typ: 'nabidka', kdo: 'Test', cislo: z.cislo });
  global.NAST.firma.zpusobFakturaceOck = 'Po milnících';          // Nastavení se po odeslání změní
  const P = sod.sodData(z, v, JEKLY, 'cz', V2).placeholders;
  test('zamčená varianta: smlouva nese měsíční fakturaci, s jakou nabídka odešla', P.SOD_PLATEBNI_KALENDAR === KR.KRYCI_FAKTURACE_MESICNE_VETA, P.SOD_PLATEBNI_KALENDAR);
  delete global.NAST.firma.zpusobFakturaceOck;
}

/* 6) výroba šablony v2 z v1 (nastroje/vyrob_sablony.js --sod-real) */
{
  let VS = null;
  try { VS = require(require('path').join(__dirname, '..', 'nastroje', 'vyrob_sablony.js')); } catch (e) { VS = null; }
  test('vyrob_sablony umí SoD realizace v2 (sodRealV2)', !!(VS && typeof VS.sodRealV2 === 'function'));
  if (VS && VS.sodRealV2) {
    const p = (t) => '<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="25"/></w:numPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>' + t + '</w:t></w:r></w:p>';
    /* Od rozhodnutí J. V. 1. 10. 2026 (Q5, Q6) v2 přepojí i pokutu zhotovitele
     * a pevné datum podkladů dodavatele výtahu — šablona bez těch vět se
     * nevyrobí (podrobně test_rozhodnuti_sod.js). */
    const xml = '<w:document><w:body>' + p('Cena bude hrazena:') + [1, 2, 3, 4].map(n => p('věta {{SOD_SPLATKA' + n + '_PROC}} %')).join('')
      + p('Splatnost {{PODM_SPLATNOST_DNI_CISLO}}')
      + p('Zhotovitel se zavazuje zaplatit objednateli smluvní pokutu ve výši {{PODM_POKUTA_SPLATNOST_PROC}} % z ceny díla.')
      + p('Objednatel se zavazuje k zajištění stavební připravenosti nejdéle k {{SOD_TERMIN_PRIPRAVENOST}} a k dodání podkladů do 19.06.2026.')
      + '<w:sectPr/></w:body></w:document>';
    const vy = VS.sodRealV2(xml);
    const k = dg.klicePlaceholderu(vy);
    test('v2: čtyři věty splátek nahradí jeden odstavec {{SOD_PLATEBNI_KALENDAR}} se stejnou odrážkou a písmem',
      k.join() === 'SOD_PLATEBNI_KALENDAR,PODM_SPLATNOST_DNI_CISLO,PODM_POKUTA_DODAVKA_PROC,SOD_TERMIN_PRIPRAVENOST,SOD_TERMIN_PODKLADY_VYTAH'
        && /<w:numId w:val="25"\/><\/w:numPr><\/w:pPr><w:r><w:rPr><w:b\/><\/w:rPr><w:t xml:space="preserve">\{\{SOD_PLATEBNI_KALENDAR\}\}/.test(vy)
        && /Cena bude hrazena/.test(vy), [k.join(), vy]);
    test('v2 z v2 se nevyrobí podruhé', hazi(() => VS.sodRealV2(vy)) !== '');
  }
}

/* 7) Word: seznam plateb za každý řádek, věty v1 pryč */
(async () => {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const odst = (t) => '<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="25"/></w:numPr></w:pPr><w:r><w:t xml:space="preserve">' + t + '</w:t></w:r></w:p>';
  const dok = (telo) => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + telo + '</w:body></w:document>';
  const vypln = async (telo, data) => {
    const s = await (await dg.zipZapis([{ nazev: 'word/document.xml', data: enc.encode(dok(telo)) }])).arrayBuffer();
    const blob = await dg.docxVyplnSablonu(s, data.placeholders, [], {}, { odstavcePryc: data.odstavcePryc || [] });
    return dec.decode((await dg.zipPrecti(new Uint8Array(await blob.arrayBuffer()))).find(p => p.nazev === 'word/document.xml').data);
  };
  const z = novaZ(), v = z.varianty[0];
  hodnoty(v, { zaloha1: 'Bez zálohy', faktura2: '90 % – po zahájení montáže' });
  const v1 = odst('při uzavření této smlouvy o dílo {{SOD_SPLATKA1_PROC}} % z celkové ceny díla')
    + odst('po dokončení montáže ocelové konstrukce výtahové šachty {{SOD_SPLATKA2_PROC}} % z celkové ceny díla')
    + odst('po provedení základního opláštění {{SOD_SPLATKA3_PROC}} % z celkové ceny díla')
    + odst('po provedení celého díla zbývajících {{SOD_SPLATKA4_PROC}} % z celkové ceny díla')
    + odst('Záruka {{SOD_ZARUKA_MESICU}} měsíců.');
  const x1 = await vypln(v1, sod.sodData(z, v, JEKLY, 'cz', V1));
  const t1 = x1.replace(/<[^>]+>/g, '|');
  test('Word v1: žádný {{…}} splátek ani záruky nezůstal', !/SOD_SPLATKA|SOD_ZARUKA/.test(x1), t1);
  test('Word v1: věta o záloze a o opláštění zmizela, 90 % a 10 % jsou', !/při uzavření/.test(t1) && !/opláštění/.test(t1)
    && /výtahové šachty 90 % z celkové/.test(t1) && /zbývajících 10 % z celkové/.test(t1) && /Záruka 60 měsíců/.test(t1), t1);
  const x2 = await vypln(odst('{{SOD_PLATEBNI_KALENDAR}}'), sod.sodData(z, v, JEKLY, 'cz', V2));
  test('Word v2: odstavec s odrážkou za každou splátku (2)', (x2.match(/<w:numId w:val="25"\/>/g) || []).length === 2 && !/\{\{/.test(x2), x2);
  test('Word: platné XML', !dg.xmlStrukturaVada(x1) && !dg.xmlStrukturaVada(x2));
  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})();
