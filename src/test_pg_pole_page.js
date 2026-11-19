/* PG #4 (J. V. 19. 11. 2026) — ČÍSLOVÁNÍ STRÁNEK V ZÁPATÍ CN (pole PAGE).
 *
 * Hlášení: všechny stránky vytištěné CN mají číslo „1". Číslo stránky je ve
 * Wordu POLE (složené fldChar begin / instrText PAGE / separate / výsledek /
 * end, nebo jednoduché <w:fldSimple w:instr="PAGE">); „1" je jen uložený
 * výsledek, který Word při zobrazení přepočítá. Když pole zmizí (zbude jen
 * text „1"), nebo se rozpadne jeho stavba, má každá stránka „1".
 *
 * Generátor sahá do header*.xml/footer*.xml třemi cestami: vyplnění šablony
 * (docxVyplnSablonu — mazání odstavců/bloků, rozvíjení řádků, dosazení
 * symbolů, tečky a podbarvení u smluv), překlad šablony (docxPrelozSablonu /
 * docxPrelozXml — přepis textu odstavce do prvního <w:t>) a zápis ZIPu
 * (zipZapis). Tahle sada staví syntetickou šablonu se zápatím a záhlavím,
 * která nese pole v typických podobách:
 *   F1 „Strana {PAGE} z {NUMPAGES}" (složená pole, výsledek „1"/„3");
 *   F2 <w:fldSimple w:instr=" PAGE "> uvnitř odstavce se symbolem čísla nabídky;
 *   F3 pole PAGE na začátku odstavce („{PAGE} / {NUMPAGES}"), kód pole
 *      rozdělený do dvou běhů instrText, formátovací přepínač \* MERGEFORMAT;
 *   F4 pole v buňce tabulky zápatí vedle textu, který slovník zná („Cenová nabídka");
 *   H1 záhlaví se symbolem a polem PAGE.
 * Ověří, že po vyplnění (CZ, s volbami nabídky OCK i smlouvy s tečkami),
 * po překladu do EN/DE/FR a po překladu + vyplnění zůstane KAŽDÉ pole celé:
 * stejný sled fldChar/instrText/fldSimple, stejné kódy polí, výsledek
 * mezi separate a end, XML bez vad, žádný symbol v zápatí.
 * Spuštění: node src/test_pg_pole_page.js */
'use strict';
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
nacti('./format.js');
nacti('./preklad.js');
const DG = nacti('./docxgen.js');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 900)); } };
const enc = new TextEncoder(), dec = new TextDecoder();

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const RPR = '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="16"/></w:rPr>';
const t = x => `<w:r>${RPR}<w:t xml:space="preserve">${x}</w:t></w:r>`;
const fc = typ => `<w:r>${RPR}<w:fldChar w:fldCharType="${typ}"/></w:r>`;
const it = kod => `<w:r>${RPR}<w:instrText xml:space="preserve">${kod}</w:instrText></w:r>`;
const pole = (kod, vysl) => fc('begin') + it(kod) + fc('separate') + t(vysl) + fc('end');
const p = (...beh) => `<w:p><w:pPr><w:pStyle w:val="Zapati"/><w:jc w:val="right"/></w:pPr>${beh.join('')}</w:p>`;
const FOOTER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${NS}>`
  /* F1 */ + p(t('Strana '), pole(' PAGE ', '1'), t(' z '), pole(' NUMPAGES ', '3'))
  /* F2 */ + p(t('Nabídka č. {{CISLO_NABIDKY}} – strana '), `<w:fldSimple w:instr=" PAGE "><w:r>${RPR}<w:t>1</w:t></w:r></w:fldSimple>`)
  /* F3 */ + p(fc('begin'), it(' PAGE'), it(' \\* MERGEFORMAT '), fc('separate'), t('1'), fc('end'), t(' / '), pole(' NUMPAGES ', '3'))
  /* F4 */ + `<w:tbl><w:tblPr/><w:tblGrid><w:gridCol w:w="5000"/><w:gridCol w:w="5000"/></w:tblGrid><w:tr>`
  + `<w:tc><w:tcPr/>${p(t('Cenová nabídka'))}</w:tc><w:tc><w:tcPr/>${p(pole(' PAGE ', '1'))}</w:tc></w:tr></w:tbl>`
  + p(t('{{FIRMA_NAZEV}}'))
  + '</w:ftr>';
const HEADER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${NS}>`
  + p(t('{{CISLO_NABIDKY}} · '), pole(' PAGE ', '1')) + '</w:hdr>';
const DOCUMENT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>`
  + p(t('Cenová nabídka')) + p(t('Objednatel: {{OBJEDNATEL}}')) + p(t('{{CENA_BEZ_DPH}}'))
  + '<w:sectPr><w:headerReference w:type="default" r:id="rId8"/><w:footerReference w:type="default" r:id="rId9"/></w:sectPr></w:body></w:document>';
const RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  + '<Relationship Id="rId8" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>'
  + '<Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>';
const SETTINGS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings ${NS}><w:zoom w:percent="100"/></w:settings>`;
const PH = { CISLO_NABIDKY: '2026-OPR-CN-9704', FIRMA_NAZEV: 'Zkušební firma s.r.o.', OBJEDNATEL: 'Zákazník a.s.', CENA_BEZ_DPH: '100 000 Kč' };

async function sablona() {
  return (await DG.zipZapis([
    { nazev: 'word/document.xml', data: enc.encode(DOCUMENT) },
    { nazev: 'word/footer1.xml', data: enc.encode(FOOTER) },
    { nazev: 'word/header1.xml', data: enc.encode(HEADER) },
    { nazev: 'word/settings.xml', data: enc.encode(SETTINGS) },
    { nazev: 'word/_rels/document.xml.rels', data: enc.encode(RELS) },
  ])).arrayBuffer();
}
const dil = async (ab, n) => { const x = (await DG.zipPrecti(new Uint8Array(ab))).find(q => q.nazev === n); return x ? dec.decode(x.data) : null; };

/* Sled značek polí v dílu: begin/separate/end, kódy instrText, fldSimple s instr.
 * Kód pole = instrText mezi begin a separate spojený (rozdělený kód je jeden). */
function pole_(xml) {
  const out = [];
  const re = /<w:fldChar\b[^>]*w:fldCharType="(\w+)"[^>]*\/>|<w:instrText\b[^>]*>([^<]*)<\/w:instrText>|<w:fldSimple\b[^>]*w:instr="([^"]*)"[^>]*>/g;
  let m;
  while ((m = re.exec(xml))) {
    if (m[1]) out.push(m[1]);
    else if (m[2] !== undefined) { if (out.length && out[out.length - 1].startsWith('kód:')) out[out.length - 1] += m[2]; else out.push('kód:' + m[2]); }
    else out.push('fldSimple:' + m[3]);
  }
  return out.map(x => x.startsWith('kód:') ? 'kód:' + x.slice(4).replace(/\s+/g, ' ').trim() : x.startsWith('fldSimple:') ? 'fldSimple:' + x.slice(10).trim() : x);
}
/* Každé složené pole: begin → kód → separate → (výsledek) → end, ve stejném odstavci. */
function polaCela(xml) {
  const vady = [];
  (xml.match(/<w:p[\s>](?:(?!<\/w:p>)[\s\S])*?<\/w:p>/g) || []).forEach(odst => {
    const s = pole_(odst);
    let stav = 0;
    s.forEach(x => {
      if (x === 'begin') { if (stav !== 0) vady.push('begin uvnitř pole'); stav = 1; }
      else if (x.startsWith('kód:')) { if (stav !== 1) vady.push('kód mimo pole'); }
      else if (x === 'separate') { if (stav !== 1) vady.push('separate bez begin'); stav = 2; }
      else if (x === 'end') { if (stav !== 2) vady.push('end bez separate'); stav = 0; }
    });
    if (stav) vady.push('neuzavřené pole');
    /* výsledek pole (text mezi separate a end) musí v běhu zůstat */
    const vysl = odst.match(/fldCharType="separate"\/><\/w:r>([\s\S]*?)<w:r>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?<w:fldChar w:fldCharType="end"/g) || [];
    vysl.forEach(v => { if (!/<w:t[\s>]/.test(v)) vady.push('výsledek pole zmizel'); });
  });
  return vady;
}
const PUV_F = pole_(FOOTER), PUV_H = pole_(HEADER);

async function over(nazev, ab, cekej) {
  const f = await dil(ab, 'word/footer1.xml'), h = await dil(ab, 'word/header1.xml');
  const vady = await DG.docxXmlVady(ab);
  test(nazev + ': zápatí — stejný sled polí (PAGE, NUMPAGES, fldSimple PAGE, rozdělený kód)', JSON.stringify(pole_(f)) === JSON.stringify(PUV_F), [pole_(f), PUV_F]);
  test(nazev + ': záhlaví — pole PAGE celé', JSON.stringify(pole_(h)) === JSON.stringify(PUV_H), pole_(h));
  test(nazev + ': každé pole má begin → kód → separate → výsledek → end v jednom odstavci', !polaCela(f).length && !polaCela(h).length, polaCela(f).concat(polaCela(h)));
  test(nazev + ': fldSimple PAGE drží svůj běh s výsledkem', /<w:fldSimple w:instr=" PAGE "><w:r>[\s\S]*?<w:t>1<\/w:t><\/w:r><\/w:fldSimple>/.test(f));
  test(nazev + ': XML bez vad', !vady.length, vady);
  if (cekej) cekej(f, h);
  return f;
}

(async () => {
  const s = await sablona();
  test('výchozí šablona: pole jsou celá (kontrola testu)', !polaCela(FOOTER).length && PUV_F.filter(x => x === 'begin').length === 5
    && PUV_F.indexOf('kód:PAGE \\* MERGEFORMAT') >= 0 && PUV_F.indexOf('fldSimple:PAGE') >= 0);

  /* 1) vyplnění CZ — nabídka OCK (řádky navíc, mazání odstavců a bloků) */
  const cz = await (await DG.docxVyplnSablonu(s.slice(0), PH, [], {},
    { odstavcePryc: ['NEEXISTUJE'], blokyPryc: [], radkyNavic: [{ kotva: 'NEEXISTUJE', nazev: 'X', hodnota: 'Y' }] })).arrayBuffer();
  await over('vyplnění CZ', cz, (f, h) => {
    test('vyplnění CZ: symboly v zápatí a záhlaví dosazené, žádné {{ nezůstalo', f.indexOf('2026-OPR-CN-9704') > 0 && f.indexOf('Zkušební firma') > 0
      && h.indexOf('2026-OPR-CN-9704') > 0 && !/\{\{/.test(f + h));
  });
  /* 2) vyplnění s tečkami a podbarvením (cesta smluv) */
  const tecky = await (await DG.docxVyplnSablonu(s.slice(0), Object.assign({}, PH, { FIRMA_NAZEV: '' }), [], {},
    { nevyplnene: ['FIRMA_NAZEV'], nevyplneneVDokumentu: [] })).arrayBuffer();
  await over('vyplnění s tečkami (smlouvy)', tecky);
  /* 3) překlad šablony a 4) překlad + vyplnění */
  for (const L of ['en', 'de', 'fr']) {
    const st = {};
    const pr = await (await DG.docxPrelozSablonu(s.slice(0), L, st)).arrayBuffer();
    await over('překlad ' + L, pr, f => {
      test('překlad ' + L + ': známý text vedle pole přeložený („Cenová nabídka")', f.indexOf('Cenová nabídka') < 0, f.slice(0, 300));
    });
    const vypl = await (await DG.docxVyplnSablonu(pr.slice(0), PH, [], {}, {})).arrayBuffer();
    await over('překlad ' + L + ' + vyplnění', vypl);
  }
  /* 5) zipZapis/zipPrecti: díly mimo tělo beze změny bajt po bajtu */
  {
    const a = await DG.zipPrecti(new Uint8Array(s)), b = await DG.zipPrecti(new Uint8Array(cz));
    const set = n => dec.decode(a.find(q => q.nazev === n).data) === dec.decode(b.find(q => q.nazev === n).data);
    test('ZIP: settings.xml a vztahy beze změny, žádný díl nezmizel', set('word/settings.xml') && set('word/_rels/document.xml.rels') && a.length === b.length);
  }
  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
