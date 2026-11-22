/* PoC čočky DO (audit 20. 11. 2026): vkládání dat zakázky do Wordu (docxVyplnSablonu, docxDokumentBlob).
 * Nepřátelské hodnoty do všech cest (hlavní průchod, smyčka šachet, příplatky, řádky navíc, řádek/odstavec za řádek,
 * rozpis, atribut, kód pole). Lokálně, bez sítě. Spuštění: node podklady/audit_2026-11-20/poc_DO_vkladani.mjs */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const DG = require('../../src/docxgen.js');
const enc = new TextEncoder(), dec = new TextDecoder('utf-8', { fatal: true });

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
const P = t => `<w:p><w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;
const TR = (...b) => `<w:tr>${b.map(x => `<w:tc>${P(x)}</w:tc>`).join('')}</w:tr>`;
const pole = (kod) => `<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve">${kod}</w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>odkaz</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>`;
const telo = [
  P('Objednatel: {{OBJEDNATEL}} / akce {{NAZEV_AKCE}}'),
  P('IČO firmy (tajný kanárek): {{FIRMA_ICO}}'),
  P('Rozdělený symbol: {{</w:t></w:r><w:r><w:t>POZNAMKA</w:t></w:r><w:r><w:t>}}'),
  `<w:p><w:r><w:drawing><wp:docPr id="1" name="{{NAZEV_AKCE}}"/></w:drawing></w:r></w:p>`,
  pole(' HYPERLINK "{{OBJEDNATEL_WEB}}" '),
  `<w:tbl>${TR('{#sachty}')}${TR('{{SACHTA_NAZEV}}', '{{SACHTA_CENA_BEZ_DPH}}')}${TR('{/sachty}')}</w:tbl>`,
  `<w:tbl>${TR('{{PRIP_NAZEV}}', '{{PRIP_POPIS}}', '{{PRIP_CENA}}')}</w:tbl>`,
  `<w:tbl>${TR('PRUH')}${TR('Popisek', '{{TS_KOTVA}}')}${TR('a)', '{{PODM_PLATEBNI_KALENDAR}}')}${TR('{{PROJ_TERMINY_CINNOST}}', '{{PROJ_TERMINY_TERMIN}}')}</w:tbl>`,
  P('{{SODP_PLATEBNI_KALENDAR}}'),
  P('{{SOD_CENA_NABIDKY}}'),
  P('{{KAP_ZAC}}'), P('Kapitola: {{KAP_TEXT}}'), P('{{KAP_KON}}'),
].join('');
const sablona = async () => new Uint8Array(await DG.zipZapis([
  { nazev: '[Content_Types].xml', data: enc.encode('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>') },
  { nazev: 'word/document.xml', data: enc.encode(`<?xml version="1.0"?><w:document ${W}><w:body>${telo}</w:body></w:document>`) },
]).arrayBuffer());

const KANAREK = 'KANAREK-ICO-777';
const UTOKY = {
  'XML značky':            '</w:t></w:r><w:r><w:instrText>DDEAUTO cmd</w:instrText></w:r><w:r><w:t>',
  'symbol jiného pole':    'x {{FIRMA_ICO}} y',
  'symbol přes entitu':    '&#123;&#123;FIRMA_ICO}} &#x7b;{FIRMA_ICO}}',
  'značka bloku':          '{{KAP_KON}}',
  'značka smyčky':         '{#sachty} {/sachty}',
  'CDATA a komentář':      ']]> <!-- --> <![CDATA[ <?pi?>',
  'uvozovky a apostrof':   '" onload="x" \' ',
  'řídicí znaky':          'a\u0000b\u0001c\u0008d\u000Be\u000Cf\u001Fg￾h￿i',
  'osamělý náhradní pár':  'a\uD800b\uDC00c',
  'soukromé značky':       'a{bc',
  'víceřádkové':           'r1\r\nr2 </w:t>\n{{FIRMA_ICO}}\n',
  'entita':                '&lt;w:t&gt; &amp; &#60;',
};
const nazvy = Object.keys(UTOKY);
let zle = 0; const hlas = (ok, t, info) => { if (!ok) zle++; console.log((ok ? 'OK   ' : 'VADA ') + t + (info ? ' — ' + info : '')); };
const tagy = (xml) => { const o = {}; (xml.match(/<[A-Za-z][\w:]*/g) || []).forEach(t => { o[t] = (o[t] || 0) + 1; }); return o; };
const POVOLENE_NAVIC = ['<w:br', '<w:t', '<w:p', '<w:r', '<w:tr', '<w:tc', '<w:tbl', '<w:pPr', '<w:numPr', '<w:ilvl', '<w:numId', '<w:jc', '<w:spacing', '<w:ind', '<w:rPr'];

for (const nazev of nazvy) {
  const u = UTOKY[nazev];
  const ph = { OBJEDNATEL: u, NAZEV_AKCE: u, FIRMA_ICO: KANAREK, POZNAMKA: u, OBJEDNATEL_WEB: u, TS_KOTVA: u,
    PODM_PLATEBNI_KALENDAR: u + '\n' + u, PROJ_TERMINY_CINNOST: u + '\n' + u, PROJ_TERMINY_TERMIN: u, SODP_PLATEBNI_KALENDAR: u + '\n' + u,
    SOD_CENA_NABIDKY: u + '\n' + u, KAP_TEXT: u };
  const volby = { sachty: { polozky: [{ SACHTA_NAZEV: u, SACHTA_CENA_BEZ_DPH: u }, { SACHTA_NAZEV: u, SACHTA_CENA_BEZ_DPH: '1' }], spolecne: {} },
    radkyNavic: [{ kotva: 'TS_KOTVA', nazev: u, hodnota: u }, { kotva: 'TS_KOTVA', pruh: true, nazev: u }] };
  let xml;
  try {
    const blob = await DG.docxVyplnSablonu((await sablona()).buffer, ph, [{ nazev: u, popis: u, cena: u }], {}, volby);
    const pol = await DG.zipPrecti(new Uint8Array(await blob.arrayBuffer()));
    xml = dec.decode(pol.find(p => p.nazev === 'word/document.xml').data);   // fatal: neplatné UTF-8 = výjimka
  } catch (e) { hlas(false, nazev, 'výjimka: ' + e.message); continue; }
  const vady = [];
  const str = DG.xmlStrukturaVada ? DG.xmlStrukturaVada(xml) : '';
  if (str) vady.push('rozbitá struktura XML: ' + str);
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F￾￿]/.test(xml)) vady.push('znak nepovolený v XML 1.0');
  if (/[\uD800-\uDFFF]/.test(xml.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ''))) vady.push('osamělý náhradní pár');
  const kanarku = xml.split(KANAREK).length - 1;
  if (kanarku !== 1) vady.push('kanárek FIRMA_ICO se objevil ' + kanarku + '× (čeká se 1× — dvojí rozvinutí)');
  if ((xml.match(/<w:instrText/g) || []).length !== 1 || (xml.match(/<w:fldChar/g) || []).length !== 3) vady.push('z dat vzniklo další pole (instrText / fldChar)');
  const t = tagy(xml), vzor = tagy('<w:document><w:body>' + telo), cizi = Object.keys(t).filter(k => !(k in vzor) && POVOLENE_NAVIC.indexOf(k) < 0);
  if (cizi.length) vady.push('nové prvky z dat: ' + cizi.join(' '));
  if (/<!--|<!\[CDATA\[|<\?pi/.test(xml)) vady.push('komentář / CDATA / PI z dat');
  hlas(!vady.length, 'hodnota „' + nazev + '"', vady.join('; '));
}

/* --- kód pole se symbolem: co se stane s uvozovkou z dat --- */
{
  const blob = await DG.docxVyplnSablonu((await sablona()).buffer, { OBJEDNATEL_WEB: 'https://priklad.cz" \\l "x', FIRMA_ICO: '1' }, [], {}, {});
  const pol = await DG.zipPrecti(new Uint8Array(await blob.arrayBuffer()));
  const xml = dec.decode(pol.find(p => p.nazev === 'word/document.xml').data);
  const kod = DG.xmlUnesc((/<w:instrText[^>]*>([^<]*)<\/w:instrText>/.exec(xml) || [])[1]);
  console.log('\nKód pole po dosazení (jak ho přečte Word):', JSON.stringify(kod));
  const prepinac = /HYPERLINK "https:\/\/priklad\.cz" \\l "x"/.test(kod);
  hlas(!prepinac, 'data nemění stavbu kódu pole (symbol uvnitř HYPERLINK "…")', prepinac ? 'uvozovka z dat ukončila argument a přidala přepínač \\l' : '');
  const blob2 = await DG.docxVyplnSablonu((await sablona()).buffer, { OBJEDNATEL_WEB: '\\\\utocnik.priklad.cz\\s\\a.docx', FIRMA_ICO: '1' }, [], {}, {});
  const xml2 = dec.decode((await DG.zipPrecti(new Uint8Array(await blob2.arrayBuffer()))).find(p => p.nazev === 'word/document.xml').data);
  console.log('Cíl odkazu z dat (schéma se nekontroluje):', JSON.stringify(DG.xmlUnesc((/<w:instrText[^>]*>([^<]*)</.exec(xml2) || [])[1])));
}

/* --- dokument od nuly (krycí list, objednávka): docxDokumentBlob --- */
{
  const u = Object.values(UTOKY).join(' | ');
  const blob = DG.docxDokumentBlob(u, [{ sekce: u, radky: [[u, u]] }, { sekce: u, text: u }, { sekce: u, sloupce: [u, u], radky: [[u, u]] }]);
  const xml = dec.decode((await DG.zipPrecti(new Uint8Array(await blob.arrayBuffer()))).find(p => p.nazev === 'word/document.xml').data);
  const str = DG.xmlStrukturaVada ? DG.xmlStrukturaVada(xml) : '';
  hlas(!str && !/<w:instrText/.test(xml) && !/[\x00-\x08\x0B\x0C\x0E-\x1F￾￿]/.test(xml), 'docxDokumentBlob s nepřátelskými texty', str);
}

/* --- obrázek z dat: jen PNG/JPEG data URL --- */
{
  const zk = { 'SVG': 'data:image/svg+xml;base64,PHN2Zy8+', 'HTML': 'data:text/html;base64,PGI+', 'http': 'https://utocnik.priklad.cz/a.png', 'javascript': 'javascript:alert(1)', 'PNG': 'data:image/png;base64,iVBORw0KGgo=' };
  const v = Object.keys(zk).map(k => k + '=' + (DG.dataUrlNaBajty(zk[k]) ? 'přijato' : 'odmítnuto'));
  hlas(!DG.dataUrlNaBajty(zk.SVG) && !DG.dataUrlNaBajty(zk.HTML) && !DG.dataUrlNaBajty(zk.http) && !DG.dataUrlNaBajty(zk.javascript) && !!DG.dataUrlNaBajty(zk.PNG), 'obrázek z dat (dataUrlNaBajty)', v.join(', '));
}
console.log('\n' + (zle ? 'ZRANITELNÉ — ' + zle + ' vad (viz řádky VADA)' : 'ODOLNÉ — žádná hodnota nezměnila stavbu dokumentu'));
