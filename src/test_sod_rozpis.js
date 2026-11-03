/* ROZPIS CENY DÍLA VE SMLOUVĚ — FORMÁTOVÁNÍ (SF #556, hlášení J. V. 3. 11. 2026).
 *
 * Šablona SoD realizace v4 (a její EN/DE/FR) nese pod celkovou cenou tři
 * odstavce rozpisu se symboly SOD_CENA_NABIDKY, SOD_PRIPLATKY_OBJEDNANE
 * a SOD_PRIPLATKY_KC. Vygenerovaná smlouva měla odstavce očíslované
 * I./II./III. (styl Normal (Web) s vlastním číslováním), zarovnané do bloku
 * (řádky před ručním zalomením roztažené přes celou šířku) a s mezerami.
 * Na SMYŠLENÉM úryvku (styl s numPr jako v4, odstavec s numPr + jc both +
 * mezery stylu, popisek a seznam zalomené <w:br/>) se hlídá, že generátor:
 *   – odstavcům rozpisu vypne číslování (numId 0, i číslování stylu),
 *   – zarovná je vlevo, odsazení textu odrážky zachová (hanging 0),
 *   – víceřádkovou hodnotu i popisek dá na vlastní odstavce (žádné <w:br/>),
 *   – uvnitř bloku nedá mezery (before/after 0, poslední si after nechá),
 *   – prvky w:pPr drží pořadí schématu, rPr značky odstavce nezmění, XML bez vad,
 *   – bez objednaných příplatků odstavce celé odstraní (odstavcePryc),
 *   – totéž v anglické šabloně; symbol bez hodnoty nechá být; zalomení
 *     stránky nerozdělí; ostatní odstavce nezmění.
 * Pojistka: na 6e4bf49 (před opravou) 0 prošlo / 1 selhalo (chybí
 * docxRozpisOdstavce); s dočasně vypnutým voláním v docxVyplnSablonu
 * 6 prošlo / 10 selhalo; po opravě 16 / 0.
 *
 * Spuštění: cd src && node test_sod_rozpis.js */
const dg = require('./docxgen.js');
let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info.slice(0, 900) : JSON.stringify(info).slice(0, 900))); } };
test('docxgen exportuje docxRozpisOdstavce', typeof dg.docxRozpisOdstavce === 'function');
if (fail) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }

const PORADI = ['pStyle', 'keepNext', 'keepLines', 'pageBreakBefore', 'framePr', 'widowControl', 'numPr', 'suppressLineNumbers',
  'pBdr', 'shd', 'tabs', 'suppressAutoHyphens', 'kinsoku', 'wordWrap', 'overflowPunct', 'topLinePunct', 'autoSpaceDE', 'autoSpaceDN',
  'bidi', 'adjustRightInd', 'snapToGrid', 'spacing', 'ind', 'contextualSpacing', 'mirrorIndents', 'suppressOverlap', 'jc',
  'textDirection', 'textAlignment', 'textboxTightWrap', 'outlineLvl', 'divId', 'cnfStyle', 'rPr', 'sectPr', 'pPrChange'];
const pPrDeti = p => { const pPr = (p.match(/<w:pPr>([\s\S]*?)<\/w:pPr>/) || [])[1] || '';
  const deti = []; let hl = 0; pPr.replace(/<(\/?)w:([A-Za-z]+)\b[^>]*?(\/?)>/g, (m, z, jm, s) => { if (!z && hl === 0) deti.push(jm); if (!z && !s) hl++; if (z) hl--; return m; });
  return deti; };
const poradiOk = p => { const i = pPrDeti(p).map(d => PORADI.indexOf(d)); return i.every((x, k) => x >= 0 && (k === 0 || x > i[k - 1])); };
const pPrHorni = p => { const pPr = (p.match(/<w:pPr>([\s\S]*?)<\/w:pPr>/) || [])[1] || ''; return pPr.replace(/<w:rPr>[\s\S]*?<\/w:rPr>/, ''); };

(async () => {
  /* úryvek jako v4: odstavec rozpisu má styl Normlnweb (ten v šabloně čísluje
   * numId 7 upperRoman a má before 100 auto / after 240), přímé ind bez
   * hanging, jc both, značku odstavce s rPr (vč. znakové w:spacing) */
  const rPr = '<w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/><w:b w:val="0"/></w:rPr>';
  const mark = '<w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/><w:spacing w:val="0"/><w:b w:val="0"/></w:rPr>';
  const pPrV4 = '<w:pPr><w:pStyle w:val="Normlnweb"/><w:ind w:left="1080" w:right="340"/><w:jc w:val="both"/>' + mark + '</w:pPr>';
  const pPrCislo = '<w:pPr><w:pStyle w:val="Normlnweb"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="7"/></w:numPr>'
    + '<w:spacing w:before="100" w:beforeAutospacing="1" w:after="240"/><w:ind w:left="1080" w:right="340"/><w:jc w:val="both"/>' + mark + '</w:pPr>';
  const r = t => '<w:r>' + rPr + '<w:t xml:space="preserve">' + t + '</w:t></w:r>';
  const odr = '<w:p w14:paraId="00000001" w14:textId="00000002"><w:pPr><w:pStyle w:val="Normlnweb"/><w:numPr><w:ilvl w:val="1"/><w:numId w:val="8"/></w:numPr><w:jc w:val="both"/></w:pPr>' + r('{{CENA_BEZ_DPH}} (bez DPH)') + '</w:p>';
  const p1 = '<w:p w14:paraId="00000003">' + pPrCislo + r('z toho cena díla dle cenové nabídky č. {{CISLO_NABIDKY}}: {{SOD_CENA_NABIDKY}} (bez DPH)') + '</w:p>';
  const p2 = '<w:p w14:paraId="00000004" w14:textId="00000005">' + pPrV4 + '<w:r>' + rPr + '<w:t xml:space="preserve">objednané příplatky:</w:t><w:br/><w:t xml:space="preserve">{{SOD_PRIPLATKY_OBJEDNANE}}</w:t></w:r></w:p>';
  const p3 = '<w:p>' + pPrV4 + r('příplatky celkem: {{SOD_PRIPLATKY_KC}} (bez DPH)') + '</w:p>';
  const za = '<w:p><w:pPr><w:pStyle w:val="Normlnweb"/><w:numPr><w:ilvl w:val="1"/><w:numId w:val="8"/></w:numPr><w:jc w:val="both"/></w:pPr>' + r('{{SOD_DPH_REZIM}}') + '</w:p>';
  const doc = telo => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
    + ' xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"><w:body>' + telo + '<w:sectPr/></w:body></w:document>';
  const styly = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    + '<w:style w:type="paragraph" w:styleId="Normlnweb"><w:name w:val="Normal (Web)"/><w:pPr><w:numPr><w:numId w:val="7"/></w:numPr>'
    + '<w:spacing w:before="100" w:beforeAutospacing="1" w:after="240"/><w:ind w:left="426" w:hanging="426"/></w:pPr></w:style></w:styles>';
  const E = new TextEncoder();
  const zip = async xml => dg.zipZapis([{ nazev: '[Content_Types].xml', data: E.encode('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>') },
    { nazev: 'word/styles.xml', data: E.encode(styly) }, { nazev: 'word/document.xml', data: E.encode(xml) }]).arrayBuffer();
  const vypln = async (xml, ph, volby) => {
    const blob = await dg.docxVyplnSablonu(await zip(xml), ph, null, null, volby);
    const buf = await blob.arrayBuffer();
    const pol = await dg.zipPrecti(new Uint8Array(buf));
    return { xml: new TextDecoder().decode(pol.find(p => p.nazev === 'word/document.xml').data), vady: await dg.docxXmlVady(buf) };
  };
  const odstavce = x => dg.odstavcoveSpany(x).map(sp => x.slice(sp.zac, sp.kon));
  const text = p => dg.odstavecText(p);

  const ph = { CENA_BEZ_DPH: '130 000,00 Kč', SOD_DPH_REZIM: 'DPH dle zákona.', CISLO_NABIDKY: 'CN 1', SOD_CENA_NABIDKY: '100 000,00 Kč',
    SOD_PRIPLATKY_OBJEDNANE: 'LEŠENÍ - vnitřní – 10 000,00 Kč\nLEŠENÍ - dokončení hlavy šachty – 6 000,00 Kč\nÚPRAVY/NAPOJENÍ ZÁBRADLÍ (INT) – 14 000,00 Kč',
    SOD_PRIPLATKY_KC: '30 000,00 Kč' };
  const s = await vypln(doc(odr + p1 + p2 + p3 + za), ph, { odstavcePryc: [] });
  const ps = odstavce(s.xml), ts = ps.map(text);
  test('rozpis: popisek a každý příplatek na vlastním odstavci, žádný symbol', ts.length === 8
    && ts[1] === 'z toho cena díla dle cenové nabídky č. CN 1: 100 000,00 Kč (bez DPH)' && ts[2] === 'objednané příplatky:'
    && ts[3] === 'LEŠENÍ - vnitřní – 10 000,00 Kč' && ts[4] === 'LEŠENÍ - dokončení hlavy šachty – 6 000,00 Kč'
    && ts[5] === 'ÚPRAVY/NAPOJENÍ ZÁBRADLÍ (INT) – 14 000,00 Kč' && ts[6] === 'příplatky celkem: 30 000,00 Kč (bez DPH)'
    && !/\{\{/.test(s.xml), ts);
  const roz = ps.slice(1, 7);
  test('rozpis bez ručního zalomení řádku (Word by řádek roztáhl)', roz.every(p => !/<w:br\b/.test(p)), roz);
  test('rozpis bez číslování: numPr s numId 0 (přebije číslování stylu Normal (Web))',
    roz.every(p => (pPrHorni(p).match(/<w:numPr>[\s\S]*?<\/w:numPr>/g) || []).length === 1 && /<w:numPr><w:ilvl w:val="0"\/><w:numId w:val="0"\/><\/w:numPr>/.test(p)), roz);
  test('rozpis zarovnaný vlevo (žádné jc both)', roz.every(p => (pPrHorni(p).match(/<w:jc /g) || []).length === 1 && /<w:jc w:val="left"\/>/.test(p)), roz);
  test('odsazení textu odrážky: left 1080 zůstane, hanging 0 (styl má hanging 426)',
    roz.every(p => /<w:ind w:left="1080" w:right="340" w:hanging="0"\/>/.test(p)), roz.map(p => (p.match(/<w:ind[^>]*>/) || [''])[0]));
  const sp = p => (pPrHorni(p).match(/<w:spacing[^>]*\/>/) || [''])[0];
  test('mezery: uvnitř bloku before 0 / after 0, poslední odstavec before 0 a after ze šablony',
    roz.slice(0, -1).every(p => /w:before="0"/.test(sp(p)) && /w:beforeAutospacing="0"/.test(sp(p)) && /w:after="0"/.test(sp(p)) && /w:afterAutospacing="0"/.test(sp(p)))
    && /w:before="0"/.test(sp(roz[5])) && !/w:after=/.test(sp(roz[5])), roz.map(sp));
  test('první odstavec: původní after 240 uvnitř bloku na 0, before 100 auto na 0', /^<w:spacing w:before="0" w:beforeAutospacing="0" w:after="0" w:afterAutospacing="0"\/>$/.test(sp(roz[0])), sp(roz[0]));
  test('prvky w:pPr v pořadí schématu, rPr značky odstavce beze změny (znaková w:spacing zůstala)',
    roz.every(poradiOk) && roz.every(p => p.indexOf(mark) >= 0), roz.map(pPrDeti));
  test('klony bez duplicitních w14:paraId / w14:textId', (s.xml.match(/w14:paraId="00000004"/g) || []).length === 1
    && (s.xml.match(/w14:textId="00000005"/g) || []).length === 1 && (s.xml.match(/w14:paraId="/g) || []).length === 3, s.xml.match(/<w:p [^>]*>/g));
  test('ostatní odstavce beze změny (odrážka s cenou, režim DPH)', ps[0].indexOf('<w:numId w:val="8"/>') >= 0 && /<w:jc w:val="both"\/>/.test(ps[0])
    && /<w:jc w:val="both"\/>/.test(ps[7]) && ts[0] === '130 000,00 Kč (bez DPH)' && ts[7] === 'DPH dle zákona.');
  test('XML vyplněného souboru bez vad', !s.vady.length, s.vady);

  /* bez objednaných příplatků — odstavce zmizí celé (jako v3) */
  const bez = await vypln(doc(odr + p1 + p2 + p3 + za), Object.assign({}, ph, { SOD_CENA_NABIDKY: '', SOD_PRIPLATKY_OBJEDNANE: '', SOD_PRIPLATKY_KC: '' }),
    { odstavcePryc: ['SOD_CENA_NABIDKY', 'SOD_PRIPLATKY_OBJEDNANE', 'SOD_PRIPLATKY_KC'] });
  const tb = odstavce(bez.xml).map(text);
  test('bez příplatků odstavce rozpisu pryč, nic prázdného', tb.length === 2 && tb[0] === '130 000,00 Kč (bez DPH)' && tb[1] === 'DPH dle zákona.' && !bez.vady.length, tb);

  /* anglická šablona; odstavec bez pPr; jeden příplatek */
  const en1 = '<w:p>' + r('of which the price of the Work according to price quotation No. {{CISLO_NABIDKY}}: {{SOD_CENA_NABIDKY}} (excl. VAT)') + '</w:p>';
  const en2 = p2.replace('objednané příplatky:', 'ordered surcharges:');
  const en = await vypln(doc(odr + en1 + en2 + p3.replace('příplatky celkem:', 'surcharges in total:').replace('(bez DPH)', '(excl. VAT)') + za),
    Object.assign({}, ph, { SOD_PRIPLATKY_OBJEDNANE: 'SCAFFOLDING - internal – 400.00 EUR' }), {});
  const pe = odstavce(en.xml), te = pe.map(text);
  test('EN: rozpis ve 4 odstavcích, odstavec bez pPr dostane numId 0 a jc left', te.length === 6 && te[2] === 'ordered surcharges:'
    && te[3] === 'SCAFFOLDING - internal – 400.00 EUR' && /^<w:p><w:pPr><w:numPr><w:ilvl w:val="0"\/><w:numId w:val="0"\/><\/w:numPr><w:spacing w:before="0" w:beforeAutospacing="0" w:after="0" w:afterAutospacing="0"\/><w:jc w:val="left"\/><\/w:pPr>/.test(pe[1])
    && pe.slice(1, 5).every(p => /<w:numId w:val="0"\/>/.test(p) && /<w:jc w:val="left"\/>/.test(p) && !/<w:br\b/.test(p)) && !en.vady.length, te);

  /* symbol bez hodnoty (builder o něm nic neřekl) zůstane, odstavec se nemění;
   * zalomení stránky odstavec nerozdělí */
  const nic = dg.docxRozpisOdstavce(doc(p2), { CENA_BEZ_DPH: '1' });
  test('symbol bez hodnoty: odstavec beze změny', nic === doc(p2));
  const str = dg.docxRozpisOdstavce(doc('<w:p>' + pPrV4 + '<w:r><w:t>{{SOD_PRIPLATKY_KC}}</w:t><w:br w:type="page"/><w:t>x</w:t></w:r></w:p>'), { SOD_PRIPLATKY_KC: '5 Kč' });
  test('zalomení stránky odstavec nerozdělí', odstavce(str).length === 1 && /<w:br w:type="page"\/>/.test(str) && /<w:jc w:val="left"\/>/.test(str), str);

  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL výjimka', e.stack); process.exit(1); });
