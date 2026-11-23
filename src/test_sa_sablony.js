/* [SA] B270–B272 (audit 20. 11. 2026, #719–#721) — KONTROLA OBSAHU ŠABLONY
 * WORDU: názvy položek ZIPu, pole s údaji počítače, strop jedné XML části
 * (src/sablona_obsah.js, src/docxgen.js zipPrecti).
 *
 *   B270 položka ../, absolutní cesta (/x, C:x), zpětné lomítko a dvě
 *        položky téhož jména (word/document.xml dvakrát) prošly;
 *   B271 pole FILENAME (i \p), USERNAME a AUTHOR prošla — při aktualizaci
 *        polí vloží cestu k souboru a jméno uživatele počítače;
 *   B272 jedna XML část těsně pod stropem rozbalení (64 MB) zaměstnala
 *        server ~1,9 s; strop jedné XML části SABLONA_XML_CAST_MAX.
 *
 * Pojistka: před opravou sada selže na všech „→ odmítnuto" (0 vad, rozbalení
 * 60 MB projde), po opravě projde; legitimní šablona (PAGE, NUMPAGES, DATE,
 * obrázek, customXml, složka v ZIPu, XML část právě na stropu) projde před
 * i po. Syntetické .docx, žádné firemní podklady.
 * Spuštění: cd src && node test_sa_sablony.js */
const DG = require('./docxgen.js');
const SO = require('./sablona_obsah.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
const enc = new TextEncoder(), dec = new TextDecoder();
const MB = 1024 * 1024;
const STROP = SO.SABLONA_XML_CAST_MAX || 8 * MB;   // před opravou není — test pak ověří, že 60 MB prošlo

(async () => {
  const zaklad = await DG.zipPrecti(new Uint8Array(await DG.docxDokumentBlob('Zkušební šablona {{X}}', []).arrayBuffer()));
  const kopie = () => zaklad.map(x => ({ nazev: x.nazev, data: new Uint8Array(x.data) }));
  const zip = async (p) => new Uint8Array(await DG.zipZapis(p).arrayBuffer());
  const docText = (p) => dec.decode(p.find(x => x.nazev === 'word/document.xml').data);
  const doDoc = (p, xml) => { const i = p.findIndex(x => x.nazev === 'word/document.xml'); p[i].data = enc.encode(docText(p).replace('</w:body>', xml + '</w:body>')); };
  const pole = (kod) => '<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve">' + kod
    + '</w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>x</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>';
  const simple = (instr) => '<w:p><w:fldSimple w:instr="' + instr + '"><w:r><w:t>x</w:t></w:r></w:fldSimple></w:p>';
  const navic = (nazev, text) => p => p.push({ nazev, data: enc.encode(text === undefined ? '<a/>' : text) });
  const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  const velkyDoc = (bajtu) => {
    const zac = enc.encode(`<w:document ${W}><w:body><w:p><w:r><w:t>{{X}}`), kon = enc.encode('</w:t></w:r></w:p></w:body></w:document>');
    const u8 = new Uint8Array(bajtu).fill(0x20);
    u8.set(zac, 0); u8.set(kon, bajtu - kon.length);
    return u8;
  };

  const spatne = {
    /* B270 — názvy položek */
    rodic: [navic('../../mimo.xml'), /mimo balíček/],
    rodicUprostred: [navic('word/../../mimo.xml'), /mimo balíček/],
    rodicKodovany: [navic('word/%2e%2e/%2E%2E/mimo.xml'), /mimo balíček/],
    absolutni: [navic('/etc/x.xml'), /absolutní cesta/],
    disk: [navic('C:/Windows/x.xml'), /absolutní cesta/],
    zpetneLomitko: [navic('word\\document2.xml'), /zpětné lomítko/],
    ridiciZnak: [navic('word/doc\u0000ument2.xml'), /řídicí znak/],
    dvojiDokument: [p => p.push({ nazev: 'word/document.xml', data: enc.encode(`<w:document ${W}><w:body><w:p><w:r><w:t>JINÝ OBSAH</w:t></w:r></w:p></w:body></w:document>`) }), /dvě položky téhož jména \(word\/document\.xml\)/],
    dvojiVelikost: [navic('Word/Document.xml', `<w:document ${W}/>`), /dvě položky téhož jména/],
    dvojiKodovany: [navic('word/document%2Exml', `<w:document ${W}/>`), /dvě položky téhož jména/],
    /* B271 — pole s údaji počítače */
    filenameP: [p => doDoc(p, pole(' FILENAME \\p ')), /pole FILENAME/],
    filename: [p => doDoc(p, pole(' FILENAME ')), /pole FILENAME/],
    filenameMale: [p => doDoc(p, pole(' filename \\* MERGEFORMAT ')), /pole FILENAME/],
    username: [p => doDoc(p, pole(' USERNAME ')), /pole USERNAME/],
    author: [p => doDoc(p, pole(' AUTHOR \\* Upper ')), /pole AUTHOR/],
    authorSimple: [p => doDoc(p, simple(' AUTHOR ')), /pole AUTHOR/],
    usernameRozdeleny: [p => doDoc(p, '<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText> USER</w:instrText></w:r><w:r><w:instrText>NAME </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>'), /pole USERNAME/]
  };
  for (const [jmeno, [uprav, ocek]] of Object.entries(spatne)) {
    const p = kopie(); uprav(p);
    const vady = await SO.sablonaObsahVady(await zip(p));
    test('→ odmítnuto: ' + jmeno, vady.some(v => ocek.test(v)), vady);
  }

  /* B272 — XML část nad strop: odmítne se už při rozbalení (rychle) */
  {
    const p = kopie(); const i = p.findIndex(x => x.nazev === 'word/document.xml'); p[i].data = velkyDoc(60 * MB);
    const t = Date.now();
    const vady = await SO.sablonaObsahVady(await zip(p));
    test('→ odmítnuto: XML část 60 MB (pod stropem rozbalení 64 MB) už při rozbalení', vady.some(v => /nejde rozbalit.*XML část větší než 8 MB \(word\/document\.xml\)/.test(v)), vady);
    let z = '';
    try { await DG.zipPrecti(await zip(p), { xmlCastMax: STROP }); } catch (e) { z = e.message; }
    test('zipPrecti se stropem části zastaví rozbalení', /XML část větší než 8 MB/.test(z), z);
    z = 'bez chyby';
    try { await DG.zipPrecti(await zip(p)); } catch (e) { z = e.message; }
    test('zipPrecti bez stropu části rozbalí 60 MB (ceníky, generátor beze změny)', z === 'bez chyby', z);
    console.log('     (kontrola 60 MB části: ' + (Date.now() - t) + ' ms)');
    /* i rozbalená (generátor v prohlížeči zipPrecti volá bez stropu části) */
    const v2 = SO.sablonaObsahVadyZipu(p);
    test('→ odmítnuto: XML část 60 MB i nad rozbalenými položkami (docxObsahZkontroluj)', v2.some(v => /XML část větší než 8 MB/.test(v)), v2);
    /* část bez přípony .xml, ale s obsahem XML */
    const p3 = kopie(); p3.push({ nazev: 'word/media/obrazek.bin', data: velkyDoc(STROP + 1) });
    const v3 = SO.sablonaObsahVadyZipu(p3);
    test('→ odmítnuto: XML obsah nad strop bez přípony .xml', v3.some(v => /XML část větší než/.test(v)), v3);
    let chyba = '';
    try { await DG.docxVyplnSablonu((await zip(p)).buffer, { X: 'a' }); } catch (e) { chyba = e.message; }
    test('→ odmítnuto: generátor s 60 MB částí', /XML část větší než 8 MB/.test(chyba), chyba.slice(0, 200));
  }
  test('strop jedné XML části je 8 MB', SO.SABLONA_XML_CAST_MAX === 8 * MB, SO.SABLONA_XML_CAST_MAX);

  /* Legitimní šablona projde (před i po opravě) */
  const dobre = {
    zaklad: p => {},
    polePage: p => doDoc(p, pole(' PAGE ') + pole(' NUMPAGES ') + simple(' DATE \\@ &quot;d. M. yyyy&quot; ')),
    poleSlovaVeTextu: p => doDoc(p, '<w:p><w:r><w:t>FILENAME USERNAME AUTHOR</w:t></w:r></w:p>'),
    poleTitle: p => doDoc(p, pole(' TITLE ') + pole(' FILESIZE ')),
    obrazek: p => p.push({ nazev: 'word/media/image1.png', data: new Uint8Array(9 * MB).fill(7) }),
    customXml: navic('customXml/item1.xml', '<b:Sources xmlns:b="http://schemas.openxmlformats.org/officeDocument/2006/bibliography"/>'),
    slozka: p => p.push({ nazev: 'word/media/', data: new Uint8Array(0) }),
    tecka: navic('word/theme/theme1.xml', '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/>'),
    naStropu: p => { const i = p.findIndex(x => x.nazev === 'word/document.xml'); p[i].data = velkyDoc(STROP); }
  };
  for (const [jmeno, uprav] of Object.entries(dobre)) {
    const p = kopie(); uprav(p);
    const vady = await SO.sablonaObsahVady(await zip(p));
    test('projde: ' + jmeno, vady.length === 0, vady);
  }
  /* názvy jednotlivě */
  for (const n of ['word/document.xml', '[Content_Types].xml', '_rels/.rels', 'word/_rels/document.xml.rels', 'word/media/image%201.png', 'docProps/app.xml', 'word/..x.xml'])
    test('název v pořádku: ' + n, SO.sablonaNazevVada ? SO.sablonaNazevVada(n) === '' : false, SO.sablonaNazevVada && SO.sablonaNazevVada(n));
  /* vyplnění legitimní šablony dál funguje */
  {
    const p = kopie(); doDoc(p, pole(' PAGE '));
    const blob = await DG.docxVyplnSablonu((await zip(p)).buffer, { X: 'Hodnota' });
    const po = await DG.zipPrecti(new Uint8Array(await blob.arrayBuffer()));
    test('generátor: legitimní šablona vyplněna', /Hodnota/.test(dec.decode(po.find(x => x.nazev === 'word/document.xml').data)));
  }

  console.log(`\nVýsledek: ${ok} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
