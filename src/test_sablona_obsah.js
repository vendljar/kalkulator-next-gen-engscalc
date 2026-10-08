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

  /* B115 (audit 30. 9. 2026) — pět obchvatů kontroly B99, každý doložený
   * pokusem auditu (kontrola vrátila prázdný seznam), a další tvary téže
   * třídy. Před opravou: obchvaty prošly (0 vad), po opravě odmítnuty. */
  const W = 'xmlns:x="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  const pole = (kod) => '<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve">' + kod
    + '</w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>x</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>';
  const dokument = (telo) => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
    + telo + '</w:body></w:document>';
  const o = {
    /* (1) číselné entity v Type i TargetMode */
    entity: await sestav(p => pridej(p, 'word/_rels/settings.xml.rels', RELS('<Relationship Id="rId1" Type="' + R + 'attachedTempl&#97;te" Target="https://example.invalid/x.dotm" TargetMode="Ex&#116;ernal"/>'))),
    entityHex: await sestav(p => pridej(p, 'word/_rels/settings.xml.rels', RELS('<Relationship Id="rId1" Type="' + R + '&#x61;ttachedTemplate" Target="\\\\server\\share\\x.dotm" TargetMode="&#x45;xternal"/>'))),
    /* (2) pole přes jiný prefix jmenného prostoru */
    prefix: await sestav(p => doDoc(p, '<x:p ' + W + '><x:r><x:fldChar x:fldCharType="begin"/></x:r><x:r><x:instrText> INCLUDETEXT "https://example.invalid/a.docx" </x:instrText></x:r><x:r><x:fldChar x:fldCharType="end"/></x:r></x:p>')),
    prefixSimple: await sestav(p => doDoc(p, '<x:fldSimple ' + W + ' x:instr=" INCLUDEPICTURE &quot;\\\\server\\share\\a.png&quot; "><x:r><x:t>x</x:t></x:r></x:fldSimple>')),
    /* (3) dokument mimo word/<jeden segment>.xml */
    word2: await sestav(p => { pridej(p, 'word2/document.xml', dokument(pole(' INCLUDETEXT "https://example.invalid/a.docx" '))); }),
    glosar: await sestav(p => pridej(p, 'word/glossary/document.xml', dokument(pole(' INCLUDEPICTURE "https://example.invalid/a.png" \\d ')))),
    embeddings2: await sestav(p => pridej(p, 'word2/embeddings/objekt1.dat', 'x')),
    oleNazev: await sestav(p => pridej(p, 'word/media/oleObject1.bin', 'x')),
    /* (4) interní oleObject / package se zamlženým Type mimo embeddings/ */
    oleZamlzeny: await sestav(p => docRels(p, '<Relationship Id="rIdO" Type="' + R + 'ole&#79;bject" Target="media/obr9.bin"/>')),
    packageZamlzeny: await sestav(p => docRels(p, '<Relationship Id="rIdP" Type="' + R + 'p&#x61;ckage" Target="media/tabulka.xlsx"/>')),
    /* (5) pole LINK */
    link: await sestav(p => doDoc(p, pole(' LINK Excel.Sheet.12 "\\\\\\\\server\\\\share\\\\a.xlsx" "List1!R1C1" \\a \\f 4 '))),
    /* další tvary téže třídy */
    gtVAtributu: await sestav(p => pridej(p, 'word/_rels/settings.xml.rels', RELS('<Relationship Id="rId1" Target="https://example.invalid/a>b.dotm" Type="' + R + 'attachedTemplate" TargetMode="External"/>'))),
    staryInclude: await sestav(p => doDoc(p, pole(' INCLUDE "https://example.invalid/a.docx" '))),
    importPole: await sestav(p => doDoc(p, pole(' IMPORT "https://example.invalid/a.png" '))),
    entitaVPoli: await sestav(p => doDoc(p, pole(' &#73;NCLUDETEXT "https://example.invalid/a.docx" '))),
    utf16: await sestav(p => { const t = dokument(pole(' INCLUDETEXT "https://example.invalid/a.docx" ')).replace('encoding="UTF-8"', 'encoding="UTF-16"');
      const u = new Uint8Array(2 + t.length * 2); u[0] = 0xFF; u[1] = 0xFE; for (let i = 0; i < t.length; i++) { u[2 + i * 2] = t.charCodeAt(i) & 255; u[3 + i * 2] = t.charCodeAt(i) >> 8; }
      p.push({ nazev: 'word/footer9.xml', data: u }); }),
    jinyNazev: await sestav(p => pridej(p, 'word/obsah.dat', dokument(pole(' INCLUDETEXT "https://example.invalid/a.docx" ')))),
    doctype: await sestav(p => pridej(p, 'word/_rels/settings.xml.rels', '<?xml version="1.0"?><!DOCTYPE r [<!ENTITY t "attachedTemplate">]>' + RELS(rel('rId1', '&t;', 'https://example.invalid/x.dotm', true)).replace(/^<\?xml[^>]*>/, ''))),
    obrazekVnejsi: await sestav(p => docRels(p, rel('rIdI', 'image', 'file://server/share/a.png', true))),
    vnejsiBezModu: await sestav(p => docRels(p, rel('rIdI', 'image', '\\\\server\\share\\a.png', false))),
  };
  for (const [k, ocek] of [['entity', /attachedTemplate/], ['entityHex', /attachedTemplate/], ['prefix', /INCLUDETEXT/], ['prefixSimple', /INCLUDEPICTURE/],
    ['word2', /INCLUDETEXT/], ['glosar', /INCLUDEPICTURE/], ['embeddings2', /vložený objekt/], ['oleNazev', /vložený objekt/], ['oleZamlzeny', /oleObject/], ['packageZamlzeny', /package/],
    ['link', /pole LINK/], ['gtVAtributu', /attachedTemplate/], ['staryInclude', /pole INCLUDE\b/], ['importPole', /pole IMPORT/], ['entitaVPoli', /INCLUDETEXT/],
    ['utf16', /INCLUDETEXT/], ['jinyNazev', /INCLUDETEXT/], ['doctype', /DOCTYPE/], ['obrazekVnejsi', /vnější vztah image/], ['vnejsiBezModu', /vnější vztah image/]]) {
    const v = await SO.sablonaObsahVady(o[k]);
    test('B115: obchvat ' + k + ' → odmítnut s popisem', v.length > 0 && v.some(x => ocek.test(x)), v);
  }
  /* Revize 6. 10. 2026 (nezávislá revize dávky C): další čtyři obchvaty.
   * Před opravou prošly (0 vad), po opravě odmítnuty. */
  const r6 = {
    /* S1: zakázaný typ pole v sekci CDATA (parser ji vrací jako text) */
    cdata: await sestav(p => doDoc(p, pole('<![CDATA[ INCLUDETEXT "https://example.invalid/a.docx" ]]>'))),
    /* S2: falešný konec pole v komentáři rozhodí zásobník a skutečný kód
     * skončí jako „sirotek" za neškodným sirotkem */
    komentar: await sestav(p => doDoc(p, '<w:p><w:r><w:instrText> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r><!-- <w:fldChar w:fldCharType="end"/> -->'
      + '<w:r><w:instrText> INCLUDETEXT "https://example.invalid/a.docx" </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>')),
    /* S3: návnadový atribut jiné velikosti písmen s typem hyperlink */
    navnada: await sestav(p => docRels(p, '<Relationship Id="rIdI" type="' + R + 'hyperlink" Type="' + R + 'image" Target="https://example.invalid/a.png" TargetMode="External"/>')),
    /* S4: typ pole dodá symbol {{…}} až při generování */
    symbolTyp: await sestav(p => doDoc(p, pole(' {{X}} "https://example.invalid/a.docx" '))),
    /* S2: dva sirotci kódu pole — neškodný první by schoval zakázaný typ v druhém */
    sirotci: await sestav(p => doDoc(p, '<w:p><w:r><w:instrText> PAGE </w:instrText></w:r><w:r><w:t>x</w:t></w:r><w:r><w:instrText> INCLUDETEXT "https://example.invalid/a.docx" </w:instrText></w:r></w:p>')),
  };
  for (const [k, ocek] of [['cdata', /INCLUDETEXT/], ['komentar', /INCLUDETEXT/], ['navnada', /nejednoznačn/], ['symbolTyp', /symbol/], ['sirotci', /INCLUDETEXT/]]) {
    const v = await SO.sablonaObsahVady(r6[k]);
    test('revize 6. 10.: obchvat ' + k + ' → odmítnut s popisem', v.length > 0 && v.some(x => ocek.test(x)), v);
  }
  /* S4 i na výstupu: generátor zkontroluje i hotový dokument — symbol
   * s hodnotou nesmí vytvořit zakázané pole. */
  {
    let chyba = '';
    try { await DG.docxVyplnSablonu(await sestav(p => doDoc(p, pole(' {{TYP}} "https://example.invalid/a.docx" '))), { TYP: 'INCLUDETEXT', X: 'x' }, [], {}); }
    catch (e) { chyba = e.message; }
    test('revize 6. 10.: generátor odmítne šablonu, z níž by vzniklo zakázané pole', /symbol|INCLUDETEXT/.test(chyba), chyba);
  }

  /* Co projít musí: odkazy a běžná pole, i když slovo „link" nesou jinde. */
  const cisteDalsi = {
    hyperlinkPole: await sestav(p => doDoc(p, pole(' HYPERLINK "https://www.example.cz/link/include" ') + pole(' HYPERLINK \\l "_Toc1" '))),
    bezneSimple: await sestav(p => doDoc(p, '<w:fldSimple w:instr=" PAGE \\* MERGEFORMAT "><w:r><w:t>1</w:t></w:r></w:fldSimple>' + pole(' DATE \\@ "d. M. yyyy" ') + pole(' REF _Ref123 \\h '))),
    odkazEntita: await sestav(p => docRels(p, '<Relationship Id="rIdH" Type="' + R + 'hyperlink" Target="https://www.example.cz/?a=1&amp;b=&#50;" TargetMode="External"/>')),
    vnorenePole: await sestav(p => doDoc(p, '<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText> IF </w:instrText></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r>'
      + '<w:r><w:instrText> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r><w:r><w:instrText> = 1 "link" "jinak" </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>')),
  };
  for (const k of Object.keys(cisteDalsi)) {
    const v = await SO.sablonaObsahVady(cisteDalsi[k]);
    test('B115: legitimní ' + k + ' projde', v.length === 0, v);
  }
  {
    /* Typ pole z vnořeného pole (Word výsledek vnořeného pole do kódu dosadí). */
    const v = await SO.sablonaObsahVady(await sestav(p => doDoc(p, '<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r>'
      + '<w:r><w:instrText> QUOTE "INCLUDETEXT" </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r><w:r><w:instrText> "https://example.invalid/a.docx" </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>')));
    test('B115: pole, jehož typ dodá vnořené pole → odmítnuto', v.length > 0, v);
  }

  /* #395 (8. 10. 2026, nízké nálezy revize C): kódování, které kontrola
   * nečte, ZIP bomba a podvržený konec ZIPu v komentáři. Před opravou
   * prošly (0 vad, rozbalení bez stropu, kontrola četla podvržený adresář). */
  {
    const zlib = require('zlib');
    const t16 = (t, bom) => { const u = new Uint8Array((bom ? 2 : 0) + t.length * 2); let o = 0; if (bom) { u[0] = 0xFF; u[1] = 0xFE; o = 2; }
      for (let i = 0; i < t.length; i++) { u[o + i * 2] = t.charCodeAt(i) & 255; u[o + 1 + i * 2] = t.charCodeAt(i) >> 8; } return u; };
    const zakazane = dokument(pole(' INCLUDETEXT "https://example.invalid/a.docx" '));
    const v1 = await SO.sablonaObsahVady(await sestav(p => p.push({ nazev: 'word/footer9.xml',
      data: t16('\r\n' + zakazane.replace('encoding="UTF-8"', 'encoding="UTF-16"'), false) })));
    test('#395: UTF-16 bez BOM s koncem řádku na začátku → zakázané pole odhaleno', v1.some(x => /INCLUDETEXT/.test(x)), v1);
    const v2 = await SO.sablonaObsahVady(await sestav(p => pridej(p, 'word/footer9.xml',
      zakazane.replace('encoding="UTF-8"', 'encoding="UTF-7"').replace(/<w:instrText/g, '+ADw-w:instrText'))));
    test('#395: deklarace kódování UTF-7 → odmítnuto', v2.some(x => /kódování UTF-7/.test(x)), v2);
    const v3 = await SO.sablonaObsahVady(await sestav(p => { const u = new Uint8Array(4 + zakazane.length * 4);
      u.set([0xFF, 0xFE, 0, 0]); for (let i = 0; i < zakazane.length; i++) u[4 + i * 4] = zakazane.charCodeAt(i) & 255;
      p.push({ nazev: 'word/footer9.xml', data: u }); }));
    test('#395: část v UTF-32 → odmítnuto', v3.some(x => /UTF-32/.test(x)), v3);
    const v4 = await SO.sablonaObsahVady(s.cista);
    test('#395: čistá šablona v UTF-8 dál projde', v4.length === 0, v4);

    /* ZIP s jednou položkou komprimovanou deflate (zdejší zápis umí jen STORE). */
    const zipDeflate = (polozky) => {
      const casti = [], cd = []; let off = 0;
      const u16 = v => Buffer.from([v & 255, (v >> 8) & 255]), u32 = v => { const b = Buffer.alloc(4); b.writeUInt32LE(v >>> 0); return b; };
      for (const p of polozky) {
        const jm = Buffer.from(p.nazev), komp = p.deflate ? zlib.deflateRawSync(p.data) : Buffer.from(p.data);
        const crc = zlib.crc32(p.data), met = p.deflate ? 8 : 0;
        const hl = Buffer.concat([u32(0x04034b50), u16(20), u16(0), u16(met), u16(0), u16(0), u32(crc), u32(komp.length), u32(p.data.length), u16(jm.length), u16(0), jm]);
        cd.push(Buffer.concat([u32(0x02014b50), u16(20), u16(20), u16(0), u16(met), u16(0), u16(0), u32(crc), u32(komp.length), u32(p.data.length),
          u16(jm.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off), jm]));
        casti.push(hl, komp); off += hl.length + komp.length;
      }
      const cdB = Buffer.concat(cd);
      const eocd = Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(cd.length), u16(cd.length), u32(cdB.length), u32(off), u16(0)]);
      return new Uint8Array(Buffer.concat([...casti, cdB, eocd]));
    };
    const zaklPolozky = zaklad.map(x => ({ nazev: x.nazev, data: Buffer.from(x.data), deflate: true }));
    const bomba = zipDeflate(zaklPolozky.concat([{ nazev: 'word/media/nuly.bin', data: Buffer.alloc(80 * 1024 * 1024), deflate: true }]));
    test('#395: příprava — ZIP bomba je malá (< 1 MB zabaleno)', bomba.length < 1024 * 1024, bomba.length);
    const v5 = await SO.sablonaObsahVady(bomba);
    test('#395: ZIP, který se rozbalí na víc než 64 MB → odmítnuto', v5.some(x => /víc než 64 MB/.test(x)), v5);
    const v6 = await SO.sablonaObsahVady(zipDeflate(zaklPolozky));
    test('#395: šablona komprimovaná deflate pod stropem projde', v6.length === 0, v6);

    /* Podvržený konec adresáře v komentáři: skutečný adresář nese zakázané
     * pole, falešný konec (s komentářem do konce souboru) ukazuje na čistý. */
    const cista = s.cista;
    const zla = await sestav(p => doDoc(p, pole(' INCLUDETEXT "https://example.invalid/a.docx" ')));
    const dvZ = new DataView(zla.buffer, zla.byteOffset, zla.byteLength);
    const dvC = new DataView(cista.buffer, cista.byteOffset, cista.byteLength);
    const eZ = zla.length - 22, eC = cista.length - 22;
    /* Komentář = čistý archiv celý + jeho konec adresáře s posunutým offsetem. */
    const posun = zla.length;                                   // komentář začíná hned za skutečným koncem
    const kom = new Uint8Array(cista.length);
    kom.set(cista);
    new DataView(kom.buffer).setUint32(eC + 16, dvC.getUint32(eC + 16, true) + posun, true);
    const podvrh = new Uint8Array(zla.length + kom.length);
    podvrh.set(zla); podvrh.set(kom, zla.length);
    new DataView(podvrh.buffer).setUint16(eZ + 20, kom.length, true);
    /* Lokální hlavičky čistého archivu: offsety v jeho adresáři posunout taky. */
    const dvP = new DataView(podvrh.buffer);
    let cdOff = dvC.getUint32(eC + 16, true) + posun;
    for (let n = 0; n < dvC.getUint16(eC + 10, true); n++) {
      dvP.setUint32(cdOff + 42, dvP.getUint32(cdOff + 42, true) + posun, true);
      cdOff += 46 + dvP.getUint16(cdOff + 28, true) + dvP.getUint16(cdOff + 30, true) + dvP.getUint16(cdOff + 32, true);
    }
    const v7 = await SO.sablonaObsahVady(podvrh);
    test('#395: podvržený konec ZIP adresáře v komentáři → odmítnuto', v7.length > 0 && !v7.every(x => x === ''), v7);
    const sKom = new Uint8Array(cista.length + 5); sKom.set(cista); sKom.set([65, 104, 111, 106, 33], cista.length);
    new DataView(sKom.buffer).setUint16(eC + 20, 5, true);
    const v8 = await SO.sablonaObsahVady(sKom);
    test('#395: čistá šablona s obyčejným komentářem archivu projde', v8.length === 0, v8);
    const sZbytek = new Uint8Array(cista.length + 2); sZbytek.set(cista); sZbytek.set([0, 9], cista.length);
    const v9 = await SO.sablonaObsahVady(sZbytek);
    test('#395: bajty za koncem ZIPu (některé nástroje je přidávají) nevadí', v9.length === 0, v9);
  }

  /* Firemní šablony (jen s KNG_PODKLADY, mimo repozitář) — kontrola je nesmí
   * odmítnout: CN v14 + EN/DE/FR, CN v11, PROJ v3, PROJ v4 + EN/DE/FR, SoD
   * realizace a projekce, plná moc. */
  {
    const fs = require('fs'), path = require('path');
    const slozka = String(process.env.KNG_PODKLADY || '').trim();
    const sablony = slozka && fs.existsSync(slozka) ? fs.readdirSync(slozka).filter(f => /^Sablona_.*\.docx$/i.test(f)).sort() : [];
    if (!sablony.length) console.log('–    firemní šablony (KNG_PODKLADY) nejsou po ruce — přeskočeno');
    else {
      const pozadovane = [/CN_v14\.docx$/i, /CN_v14.*_EN/i, /CN_v14.*_DE/i, /CN_v14.*_FR/i, /CN_v11\.docx$/i, /^Sablona_NABIDKA_PROJ\.docx$/i,
        /PROJ_v4\.docx$/i, /PROJ_v4.*_EN/i, /PROJ_v4.*_DE/i, /PROJ_v4.*_FR/i, /SOD_REALIZACE/i, /SOD_PROJEKCE/i, /PLNA_MOC/i];
      for (const vz of pozadovane) {
        const f = sablony.find(x => vz.test(x));
        if (!f) { console.log('–    firemní šablona ' + vz + ' v KNG_PODKLADY chybí'); continue; }
        const v = await SO.sablonaObsahVady(new Uint8Array(fs.readFileSync(path.join(slozka, f))));
        test('B115: firemní šablona ' + f + ' projde', v.length === 0, v);
      }
    }
  }

  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})();
