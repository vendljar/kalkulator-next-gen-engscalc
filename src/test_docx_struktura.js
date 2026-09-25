/* Kontrola struktury XML šablony (25. 9. 2026).
 *
 * Šablona PROJ v2 vyšla ze skriptu s rozbitým document.xml: odstavec
 * s textovým polem se smazal jen napůl a zůstala neuzavřená značka. Aplikace
 * z ní tiskla dál (dosazuje přes text), Word ji ale otevřel jen s opravou.
 * Průvodce nahráním šablon teď takový soubor odmítne — tady se hlídá, že
 * kontrola vadu opravdu pozná a zdravý soubor nechá projít. */
const d = require('./docxgen.js');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

const zdravy = '<?xml version="1.0"?><w:document><w:body><w:p><w:r><w:t xml:space="preserve">A &lt; B</w:t></w:r></w:p>'
  + '<w:p><w:r><w:pict><v:textbox><w:txbxContent><w:p><w:r><w:t>uvnitř</w:t></w:r></w:p></w:txbxContent></v:textbox></w:pict></w:r></w:p>'
  + '<w:p/><!-- <w:p> v komentáři se nepočítá --><w:sectPr w:rsidR="1"/></w:body></w:document>';
test('zdravý dokument (i s textovým polem, prázdným odstavcem a komentářem) projde',
  d.xmlStrukturaVada(zdravy) === '', d.xmlStrukturaVada(zdravy));

/* Přesně ten tvar, jaký vyrobil vadný skript: z odstavce s textovým polem
 * zmizel začátek až po první vnořené </w:p>. */
const rozbity = '<w:document><w:body><w:tbl><w:tr><w:tc><w:p><w:r><w:pict><v:textbox><w:txbxContent>'
  + '<w:p><w:r><w:t>POHLED NA OBJEKT</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>';
const v = d.xmlStrukturaVada(rozbity);
test('rozbitý odstavec s textovým polem se pozná', /w:tc/.test(v) && /txbxContent/.test(v), v);
test('neuzavřená značka na konci se pozná', /neuzavřená/.test(d.xmlStrukturaVada('<a><b></b>')));
test('atribut s ">" v uvozovkách nemate', d.xmlStrukturaVada('<a x="1>2"><b/></a>') === '');

(async () => {
  const enc = new TextEncoder();
  const zip = await d.zipZapis([
    { nazev: '[Content_Types].xml', data: enc.encode('<Types/>') },
    { nazev: 'word/document.xml', data: enc.encode(rozbity) },
    { nazev: 'word/header1.xml', data: enc.encode('<w:hdr><w:p/></w:hdr>') },
  ]);
  const ab = zip.arrayBuffer ? await zip.arrayBuffer() : zip;
  const vady = await d.docxXmlVady(ab);
  test('docxXmlVady hlásí vadný díl jménem a zdravý ne',
    vady.length === 1 && /^word\/document\.xml: /.test(vady[0]), vady);
  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})();
