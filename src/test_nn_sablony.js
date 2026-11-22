/* [NN] B247–B249 (audit 20. 11. 2026) — KONTROLA OBSAHU ŠABLONY WORDU:
 * odkazy a kód pole (src/sablona_obsah.js).
 *
 *   B247 vnější odkaz (vztah hyperlink, TargetMode External) s relativním
 *        cílem (..\x.hta) a pole HYPERLINK na \\server / file: prošly;
 *   B248 vztah typu hyperlink na https:// prošel, i když ho dokument použil
 *        jako odkazovaný obrázek (<a:blip r:link>, r:embed, v:imagedata);
 *   B249 symbol {{…}} uvnitř kódu pole (HYPERLINK "{{OBJEDNATEL_WEB}}")
 *        prošel — uvozovka z dat by ukončila argument a přidala přepínač.
 *
 * Pojistka: před opravou sada selže na všech „→ odmítnuto" (0 vad), po
 * opravě projde; legitimní odkazy a pole (https, mailto, \l záložka, PAGE,
 * hlinkClick v kresbě, symbol v textu vedle pole) projdou před i po.
 * Syntetické .docx, žádné firemní podklady. Spuštění: cd src && node test_nn_sablony.js */
const DG = require('./docxgen.js');
const SO = require('./sablona_obsah.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
const enc = new TextEncoder(), dec = new TextDecoder();

(async () => {
  const zaklad = await DG.zipPrecti(new Uint8Array(await DG.docxDokumentBlob('Zkušební šablona {{X}}', []).arrayBuffer()));
  const sestav = async (uprav) => {
    const p = zaklad.map(x => ({ nazev: x.nazev, data: new Uint8Array(x.data) }));
    uprav(p);
    return new Uint8Array(await DG.zipZapis(p).arrayBuffer());
  };
  const pridej = (p, nazev, text) => { const i = p.findIndex(x => x.nazev === nazev); const d = enc.encode(text); if (i >= 0) p[i].data = d; else p.push({ nazev, data: d }); };
  const docText = (p) => dec.decode(p.find(x => x.nazev === 'word/document.xml').data);
  const doDoc = (p, xml) => pridej(p, 'word/document.xml', docText(p).replace('</w:body>', xml + '</w:body>'));
  const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
  const rel = (id, typ, cil, ext) => '<Relationship Id="' + id + '" Type="' + R + typ + '" Target="' + cil + '"' + (ext ? ' TargetMode="External"' : '') + '/>';
  const docRels = (p, radek) => {
    const n = 'word/_rels/document.xml.rels';
    const puvodni = p.find(x => x.nazev === n);
    const text = puvodni ? dec.decode(puvodni.data).replace('</Relationships>', radek + '</Relationships>')
      : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + radek + '</Relationships>';
    pridej(p, n, text);
  };
  const pole = (kod) => '<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve">' + kod
    + '</w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>odkaz</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>';
  const simple = (instr) => '<w:p><w:fldSimple w:instr="' + instr + '"><w:r><w:t>odkaz</w:t></w:r></w:fldSimple></w:p>';
  const blip = (atr) => '<w:p><w:r><w:drawing><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData><a:blip ' + atr + '/></a:graphicData></a:graphic></w:drawing></w:r></w:p>';
  const odkazText = '<w:p><w:hyperlink r:id="rIdH"><w:r><w:t>web</w:t></w:r></w:hyperlink></w:p>';

  const spatne = {
    /* B247 — vztah */
    relRelativni: [p => { doDoc(p, odkazText); docRels(p, rel('rIdH', 'hyperlink', '..\\..\\Downloads\\faktura.hta', true)); }, /hyperlink s nepovolenou adresou/],
    relBezLomitek: [p => docRels(p, rel('rIdH', 'hyperlink', 'https:utocnik.priklad.cz', true)), /hyperlink s nepovolenou adresou/],
    relSoubor: [p => docRels(p, rel('rIdH', 'hyperlink', 'faktura.docx', true)), /hyperlink s nepovolenou adresou/],
    /* B247 — pole HYPERLINK */
    poleUnc: [p => doDoc(p, pole(' HYPERLINK "\\\\\\\\utocnik.priklad.cz\\\\sdileni\\\\a.docx" ')), /pole HYPERLINK s nepovolenou adresou/],
    poleFile: [p => doDoc(p, pole(' HYPERLINK "file:///C:/Windows/System32/calc.exe" ')), /pole HYPERLINK s nepovolenou adresou/],
    poleRelativni: [p => doDoc(p, pole(' HYPERLINK "..\\\\x.hta" \\o "faktura" ')), /pole HYPERLINK s nepovolenou adresou/],
    poleBezUvozovek: [p => doDoc(p, pole(' HYPERLINK \\\\\\\\server\\\\x ')), /pole HYPERLINK s nepovolenou adresou/],
    polePrepinacPred: [p => doDoc(p, pole(' HYPERLINK \\o "popisek" "file:///C:/x.exe" ')), /pole HYPERLINK s nepovolenou adresou/],
    /* \n (nové okno) hodnotu nemá — následující argument je cíl */
    poleNoveOkno: [p => doDoc(p, pole(' HYPERLINK \\n "file:///C:/x.exe" ')), /pole HYPERLINK s nepovolenou adresou/],
    poleSimpleUnc: [p => doDoc(p, simple(' HYPERLINK &quot;\\\\\\\\server\\\\x&quot; ')), /pole HYPERLINK s nepovolenou adresou/],
    poleVnorene: [p => doDoc(p, '<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText> HYPERLINK "</w:instrText></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r>'
      + '<w:r><w:instrText> REF adresa </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r><w:r><w:instrText>" </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>'), /vnořeného pole/],
    /* B248 — povolený odkaz použitý jako obsah */
    blipLink: [p => { doDoc(p, blip('r:link="rIdH"')); docRels(p, rel('rIdH', 'hyperlink', 'https://utocnik.priklad.cz/sledovac.png', true)); }, /použitý jako obsah/],
    blipEmbed: [p => { doDoc(p, blip('r:embed="rIdH"')); docRels(p, rel('rIdH', 'hyperlink', 'https://utocnik.priklad.cz/a.png', true)); }, /použitý jako obsah/],
    vmlObrazek: [p => { doDoc(p, '<w:p><w:r><w:pict><v:shape xmlns:v="urn:schemas-microsoft-com:vml"><v:imagedata r:id="rIdH"/></v:shape></w:pict></w:r></w:p>');
      docRels(p, rel('rIdH', 'hyperlink', 'https://utocnik.priklad.cz/a.png', true)); }, /použitý jako obsah/],
    zahlavi: [p => { pridej(p, 'word/header1.xml', '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="' + R.replace(/\/$/, '') + '">' + blip('r:link="rIdZ"') + '</w:hdr>');
      pridej(p, 'word/_rels/header1.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rel('rIdZ', 'hyperlink', 'mailto:x@priklad.cz', true) + '</Relationships>'); }, /použitý jako obsah/],
    /* B249 — symbol v kódu pole */
    symbolHyperlink: [p => doDoc(p, pole(' HYPERLINK "{{OBJEDNATEL_WEB}}" ')), /\{\{…\}\} uvnitř kódu pole HYPERLINK/],
    symbolRozdeleny: [p => doDoc(p, '<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> HYPERLINK "https://x.priklad.cz/{</w:instrText></w:r>'
      + '<w:r><w:instrText>{OBJEDNATEL_WEB}}" </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>'), /uvnitř kódu pole/],
    symbolSimple: [p => doDoc(p, simple(' HYPERLINK &quot;mailto:{{OBCHODNIK_EMAIL}}&quot; ')), /uvnitř kódu pole/],
    symbolDate: [p => doDoc(p, pole(' DATE \\@ "{{FORMAT}}" ')), /uvnitř kódu pole DATE/],
    symbolSirotek: [p => doDoc(p, '<w:p><w:r><w:instrText> REF {{ZALOZKA}} </w:instrText></w:r></w:p>'), /uvnitř kódu pole/],
  };
  for (const [k, [uprav, ocek]] of Object.entries(spatne)) {
    const v = await SO.sablonaObsahVady(await sestav(uprav));
    test('[NN] ' + k + ' → odmítnuto s popisem', v.length > 0 && v.some(x => ocek.test(x)), v);
  }

  const dobre = {
    relHttps: p => { doDoc(p, odkazText); docRels(p, rel('rIdH', 'hyperlink', 'https://www.priklad.cz/', true)); },
    relMailto: p => { doDoc(p, odkazText); docRels(p, rel('rIdH', 'hyperlink', 'mailto:nabidky@priklad.cz', true)); },
    relHttpVelka: p => docRels(p, rel('rIdH', 'hyperlink', ' HTTP://www.priklad.cz/a?b=1 ', true)),
    hlinkClick: p => { doDoc(p, '<w:p><w:r><w:drawing><wp:docPr xmlns:wp="x" id="1" name="Obr"><a:hlinkClick xmlns:a="y" r:id="rIdH"/></wp:docPr></w:drawing></w:r></w:p>');
      docRels(p, rel('rIdH', 'hyperlink', 'https://www.priklad.cz/', true)); },
    obrazekVnitrni: p => { doDoc(p, blip('r:embed="rIdI"')); docRels(p, rel('rIdI', 'image', 'media/image1.png') + rel('rIdH', 'hyperlink', 'https://www.priklad.cz/', true)); },
    poleHttps: p => doDoc(p, pole(' HYPERLINK "https://www.priklad.cz/a" \\o "Web" ') + pole(' HYPERLINK "mailto:nabidky@priklad.cz" ')),
    poleZalozka: p => doDoc(p, pole(' HYPERLINK \\l "_Toc123" \\h ') + simple(' HYPERLINK \\l &quot;_Ref1&quot; ')),
    poleZalozkaACil: p => doDoc(p, pole(' HYPERLINK "https://www.priklad.cz/" \\l "kotva" ')),
    polePage: p => doDoc(p, simple(' PAGE \\* MERGEFORMAT ') + pole(' NUMPAGES ')),
    symbolVText: p => doDoc(p, '<w:p><w:r><w:t>{{OBJEDNATEL_WEB}}</w:t></w:r></w:p>' + pole(' HYPERLINK "https://www.priklad.cz/" ')),
    symbolVysledekPole: p => doDoc(p, '<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>'
      + '<w:r><w:t>{{CISLO}}</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>'),
    jednaZavorka: p => doDoc(p, pole(' QUOTE "{a}" ')),
  };
  for (const [k, uprav] of Object.entries(dobre)) {
    const v = await SO.sablonaObsahVady(await sestav(uprav));
    test('[NN] legitimní ' + k + ' projde', v.length === 0, v);
  }

  /* B249 i v generátoru: šablona se symbolem v kódu pole se nevyplní a data
   * nezmění stavbu pole (dřív: … HYPERLINK "https://priklad.cz" \l "x"). */
  {
    let chyba = '';
    try { await DG.docxVyplnSablonu(await sestav(p => doDoc(p, pole(' HYPERLINK "{{OBJEDNATEL_WEB}}" '))), { OBJEDNATEL_WEB: 'https://priklad.cz" \\l "x', X: 'x' }, [], {}); }
    catch (e) { chyba = e.message; }
    test('[NN] B249: generátor šablonu se symbolem v kódu pole odmítne', /uvnitř kódu pole/.test(chyba), chyba);
  }
  /* Legitimní šablona se symbolem v textu a polem HYPERLINK https dál dává
   * stejný text — oprava nemění vytištěný dokument. */
  {
    const vys = await DG.docxVyplnSablonu(await sestav(dobre.symbolVText), { OBJEDNATEL_WEB: 'www.priklad.cz', X: 'x' }, [], {});
    const p = await DG.zipPrecti(new Uint8Array(await vys.arrayBuffer()));
    const xml = dec.decode(p.find(x => x.nazev === 'word/document.xml').data);
    test('[NN] legitimní šablona se vyplní (symbol v textu, pole HYPERLINK https beze změny)',
      xml.indexOf('<w:t>www.priklad.cz</w:t>') >= 0 && xml.indexOf(' HYPERLINK "https://www.priklad.cz/" ') >= 0, xml.slice(-600));
  }

  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL výjimka', e && e.stack); process.exit(1); });
