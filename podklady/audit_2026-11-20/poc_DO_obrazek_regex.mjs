/* PoC čočky DO: r:id tvaru z šablony jde bez escapování do RegExp (docxgen.js docxVlozObrazky).
 * Spuštění: node podklady/audit_2026-11-20/poc_DO_obrazek_regex.mjs */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const DG = require('../../src/docxgen.js');
const enc = new TextEncoder();
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const sablona = async (rid) => (await DG.zipZapis([
  { nazev: '[Content_Types].xml', data: enc.encode('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="png" ContentType="image/png"/></Types>') },
  { nazev: 'word/document.xml', data: enc.encode(`<w:document xmlns:w="w" xmlns:v="v" xmlns:o="o" xmlns:r="r"><w:body><w:p><w:r><w:pict><v:shape style="width:10pt;height:10pt"><v:imagedata r:id="${rid}" o:title="{{ZPRAC_PODPIS}}"/></v:shape></w:pict></w:r></w:p><w:p><w:r><w:t>{{FIRMA_NAZEV}}</w:t></w:r></w:p></w:body></w:document>`) },
  { nazev: 'word/_rels/document.xml.rels', data: enc.encode('<Relationships><Relationship Id="rId7" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/p.png"/></Relationships>') },
  { nazev: 'word/media/p.png', data: new Uint8Array([1, 2, 3]) },
]).arrayBuffer());
let zle = 0;
for (const rid of ['rId7', 'rId7(', '(a+)+$' ]) {
  try { await DG.docxVyplnSablonu(await sablona(rid), { FIRMA_NAZEV: 'x' }, [], { ZPRAC_PODPIS: PNG }, {}); console.log('r:id=' + JSON.stringify(rid) + ' → dokument vznikl'); }
  catch (e) { zle++; console.log('r:id=' + JSON.stringify(rid) + ' → VÝJIMKA ' + e.name + ': ' + e.message.slice(0, 90)); }
}
/* šablona s takovým r:id projde kontrolou obsahu? */
const SO = require('../../src/sablona_obsah.js');
const vady = await SO.sablonaObsahVady(new Uint8Array(await sablona('rId7(')));
console.log('kontrola obsahu šablony s r:id="rId7(":', vady.length ? vady.join('; ') : 'bez vad (zveřejnit by šla)');
console.log(zle && !vady.length ? 'ZRANITELNÉ (jen spolehlivost: šablona projde kontrolou a generování s podpisem spadne na neplatném regulárním výrazu)' : 'ODOLNÉ');
