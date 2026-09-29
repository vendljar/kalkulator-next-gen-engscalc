/* B99 (29. 9. 2026) — KONTROLA OBSAHU ŠABLONY WORDU.
 *
 * Syntetické .docx (žádné firemní podklady): čistá šablona, šablona
 * s hypertextovým odkazem https / mailto a šablony s každým zakázaným
 * prvkem — vnější attachedTemplate v settings.xml.rels, oleObject, package,
 * altChunk, vbaProject, vložený objekt, ActiveX, typ obsahu macroEnabled,
 * pole INCLUDETEXT (i rozdělené do běhů), INCLUDEPICTURE, DDE, DDEAUTO,
 * vnější frame. Pravidlo 0 (před opravou): kontroly průvodce (docxXmlVady,
 * docxTextSablony) šablonu s attachedTemplate přijaly a docxVyplnSablonu
 * i docxPrelozSablonu ji přenesly do výsledku beze změny. Před opravou
 * modul src/sablona_obsah.js neexistoval — sada selže na první kontrole.
 *
 * Spuštění: cd src && node test_sablona_obsah.js */
const DG = require('./docxgen.js');
let SO = null;
try { SO = require('./sablona_obsah.js'); } catch (e) { SO = null; }

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
const enc = new TextEncoder(), dec = new TextDecoder();

(async () => {
  /* Základ: minimální platný .docx ze zdejšího generátoru + symbol {{X}}. */
  const zaklad = await DG.zipPrecti(new Uint8Array(await DG.docxDokumentBlob('Zkušební šablona {{X}}', []).arrayBuffer()));
  const sestav = async (uprav) => {
    const p = zaklad.map(x => ({ nazev: x.nazev, data: new Uint8Array(x.data) }));
    uprav(p);
    return new Uint8Array(await DG.zipZapis(p).arrayBuffer());
  };
  const pridej = (p, nazev, text) => { const i = p.findIndex(x => x.nazev === nazev); const d = enc.encode(text); if (i >= 0) p[i].data = d; else p.push({ nazev, data: d }); };
  const docText = (p) => dec.decode(p.find(x => x.nazev === 'word/document.xml').data);
  const doDoc = (p, xml) => pridej(p, 'word/document.xml', docText(p).replace('</w:body>', xml + '</w:body>'));
  const RELS = (radky) => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + radky + '</Relationships>';
  const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
  const rel = (id, typ, cil, ext) => '<Relationship Id="' + id + '" Type="' + R + typ + '" Target="' + cil + '"' + (ext ? ' TargetMode="External"' : '') + '/>';
  const docRels = (p, radek) => {
    const n = 'word/_rels/document.xml.rels';
    const puvodni = p.find(x => x.nazev === n);
    const text = puvodni ? dec.decode(puvodni.data).replace('</Relationships>', radek + '</Relationships>') : RELS(radek);
    pridej(p, n, text);
  };
  const s = {
    cista: await sestav(() => {}),
    https: await sestav(p => docRels(p, rel('rIdH', 'hyperlink', 'https://www.example.cz/', true))),
    mailto: await sestav(p => docRels(p, rel('rIdM', 'hyperlink', 'mailto:nabidky@example.cz', true))),
    attachedTemplate: await sestav(p => pridej(p, 'word/_rels/settings.xml.rels', RELS(rel('rId1', 'attachedTemplate', 'https://example.invalid/x.dotm', true)))),
    attachedUnc: await sestav(p => pridej(p, 'word/_rels/settings.xml.rels', RELS(rel('rId1', 'attachedTemplate', 'file://server/share/x.dotm', true)))),
    hyperlinkFile: await sestav(p => docRels(p, rel('rIdF', 'hyperlink', 'file:///C:/tajne.docx', true))),
    oleObject: await sestav(p => docRels(p, rel('rIdO', 'oleObject', 'embeddings/oleObject1.bin'))),
    package: await sestav(p => docRels(p, rel('rIdP', 'package', 'embeddings/Microsoft_Excel.xlsx'))),
    altChunk: await sestav(p => docRels(p, rel('rIdA', 'aFChunk', 'https://example.invalid/chunk.html', true))),
    vbaVztah: await sestav(p => docRels(p, rel('rIdV', 'vbaProject', 'vbaProject.bin'))),
    vbaCast: await sestav(p => pridej(p, 'word/vbaProject.bin', 'x')),
    embeddings: await sestav(p => pridej(p, 'word/embeddings/oleObject1.bin', 'x')),
    activeX: await sestav(p => pridej(p, 'word/activeX/activeX1.xml', '<ax/>')),
    macro: await sestav(p => { const i = p.findIndex(x => x.nazev === '[Content_Types].xml');
      pridej(p, '[Content_Types].xml', dec.decode(p[i].data).replace('</Types>', '<Override PartName="/word/document.xml" ContentType="application/vnd.ms-word.document.macroEnabled.main+xml"/></Types>')); }),
    includeText: await sestav(p => doDoc(p, '<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> INCLUDETEXT "https://example.invalid/a.docx" </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>')),
    includeRozdelene: await sestav(p => doDoc(p, '<w:p><w:r><w:instrText> INCLU</w:instrText></w:r><w:r><w:instrText>DEPICTURE "\\\\\\\\server\\\\share\\\\a.png" </w:instrText></w:r></w:p>')),
    dde: await sestav(p => doDoc(p, '<w:p><w:fldSimple w:instr=" DDEAUTO c:\\\\windows\\\\system32\\\\cmd.exe &quot;/k calc&quot; "><w:r><w:t>x</w:t></w:r></w:fldSimple></w:p>')),
    ddeMale: await sestav(p => doDoc(p, '<w:p><w:r><w:instrText> dde excel "list" </w:instrText></w:r></w:p>')),
    frame: await sestav(p => docRels(p, rel('rIdR', 'frame', 'https://example.invalid/frame.html', true))),
  };

  /* Pravidlo 0 — co dnešní kontroly průvodce a generátor s vadnou šablonou dělají. */
  const vadyXml = await DG.docxXmlVady(s.attachedTemplate.buffer);
  test('Pravidlo 0: kontrola struktury XML (průvodce) šablonu s attachedTemplate nepozná', vadyXml.length === 0, vadyXml);

  test('B99: modul src/sablona_obsah.js existuje', !!SO);
  if (!SO) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }

  test('B99: čistá šablona projde', (await SO.sablonaObsahVady(s.cista)).length === 0, await SO.sablonaObsahVady(s.cista));
  test('B99: hypertextový odkaz https projde', (await SO.sablonaObsahVady(s.https)).length === 0, await SO.sablonaObsahVady(s.https));
  test('B99: hypertextový odkaz mailto projde (nesou ho firemní šablony PROJ)', (await SO.sablonaObsahVady(s.mailto)).length === 0, await SO.sablonaObsahVady(s.mailto));
  for (const [k, ocek] of [['attachedTemplate', /attachedTemplate/], ['attachedUnc', /attachedTemplate/], ['hyperlinkFile', /nepovolenou adresou/],
    ['oleObject', /oleObject/], ['package', /package/], ['altChunk', /aFChunk/], ['vbaVztah', /vbaProject/], ['vbaCast', /makra VBA/],
    ['embeddings', /vložený objekt/], ['activeX', /ActiveX/], ['macro', /macroEnabled/], ['includeText', /INCLUDETEXT/],
    ['includeRozdelene', /INCLUDEPICTURE/], ['dde', /DDEAUTO/], ['ddeMale', /pole DDE/], ['frame', /frame/]]) {
    const v = await SO.sablonaObsahVady(s[k]);
    test('B99: ' + k + ' → odmítnuto s popisem', v.length > 0 && v.some(x => ocek.test(x)), v);
  }
  const b64 = Buffer.from(s.attachedTemplate).toString('base64');
  test('B99: kontrola umí i base64 (tvar, ve kterém šablona chodí na server)', (await SO.sablonaObsahVady(b64)).length === 1);
  test('B99: nečitelný soubor je vada', (await SO.sablonaObsahVady('UEsDBnesmysl')).length === 1);
  test('B99: text odmítnutí je česky a řekne, co vadí', /attachedTemplate/.test(SO.sablonaObsahVadyText(await SO.sablonaObsahVady(s.attachedTemplate))));

  /* Obrana do hloubky: generátor i překlad šablonu odmítnou (ne tiše vyhodí). */
  global.sablonaObsahVady = SO.sablonaObsahVady; global.sablonaObsahVadyText = SO.sablonaObsahVadyText;
  let chyba = '';
  try { await DG.docxVyplnSablonu(s.attachedTemplate.buffer, { X: 'hodnota' }, [], {}); } catch (e) { chyba = e.message; }
  test('B99: generátor (docxVyplnSablonu) šablonu s attachedTemplate odmítne', /attachedTemplate/.test(chyba), chyba);
  chyba = '';
  try { await DG.docxPrelozSablonu(s.attachedTemplate.buffer, 'en', {}); } catch (e) { chyba = e.message; }
  test('B99: překlad šablony (docxPrelozSablonu) ji odmítne také', /attachedTemplate/.test(chyba), chyba);
  let vysledek = null;
  try { vysledek = await DG.docxVyplnSablonu(s.https.buffer, { X: 'hodnota' }, [], {}); } catch (e) { vysledek = e.message; }
  test('B99: z čisté šablony s odkazem https generátor vyrobí dokument', vysledek && typeof vysledek === 'object', vysledek);

  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})();
