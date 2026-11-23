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
 * Revize SA (23. 11. 2026): R1 strop obejitý mezerami před „<" v .bin,
 *   R2 binární část čtená jako UTF-16 po znaku, R4 neplatné % vypnulo
 *   dekódování názvu, R5 další tvary názvu (.. , //, :, U+FFFD), R7 {} místo
 *   Set, R8 strop při rozbalení i .XML / .rels / DEFLATE.
 *   Pojistka revize: nad b3d710a 17 FAIL (R1, R2, R4, R5, R7), nad 133a8f5 54 FAIL.
 * Pojistka: před opravou sada selže na všech „→ odmítnuto" (0 vad, rozbalení
 * 60 MB projde), po opravě projde; legitimní šablona (PAGE, NUMPAGES, DATE,
 * obrázek, customXml, složka v ZIPu, XML část právě na stropu) projde před
 * i po. Syntetické .docx, žádné firemní podklady.
 * Spuštění: cd src && node test_sa_sablony.js */
const DG = require('./docxgen.js');
const SO = require('./sablona_obsah.js');
const zlib = require('zlib');
/* ZIP s kompresí DEFLATE (zipZapis píše jen STORE) — strop části v zipRozbal. */
function zipDeflate(polozky) {
  const casti = [], cd = []; let off = 0;
  const u16 = v => Buffer.from([v & 255, (v >> 8) & 255]); const u32 = v => { const b = Buffer.alloc(4); b.writeUInt32LE(v >>> 0); return b; };
  for (const p of polozky) {
    const jm = Buffer.from(p.nazev), komp = zlib.deflateRawSync(Buffer.from(p.data), { level: 1 }), crc = DG.crc32(p.data);
    const hl = Buffer.concat([u32(0x04034b50), u16(20), u16(0x0800), u16(8), u16(0), u16(0), u32(crc), u32(komp.length), u32(p.data.length), u16(jm.length), u16(0), jm]);
    cd.push(Buffer.concat([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(8), u16(0), u16(0), u32(crc), u32(komp.length), u32(p.data.length), u16(jm.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off), jm]));
    casti.push(hl, komp); off += hl.length + komp.length;
  }
  const cdb = Buffer.concat(cd);
  return new Uint8Array(Buffer.concat([...casti, cdb, u32(0x06054b50), u16(0), u16(0), u16(cd.length), u16(cd.length), u32(cdb.length), u32(off), u16(0)]));
}

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
    disk: [navic('C:/Windows/x.xml'), /dvojtečka/],
    /* revize SA R4: neplatné % nesmí vypnout dekódování zbytku */
    r4NeplatneProcento: [navic('word/%2e%2e/x%ZZ.xml'), /mimo balíček/],
    r4Procento: [navic('word/%2e%2e/100%.xml'), /mimo balíček/],
    /* revize SA R5 */
    r5Mezera: [navic('word/.. /x.xml'), /mimo balíček/],
    r5Mezera20: [navic('word/..%20/x.xml'), /mimo balíček/],
    r5TriTecky: [navic('word/.../x.xml'), /mimo balíček/],
    r5Proud: [navic('word/x.xml:ads'), /dvojtečka/],
    r5Dvojlomitko: [navic('word//document.xml', `<w:document ${W}/>`), /prázdný úsek/],
    r5DvojlomitkoDuplicita: [navic('word//document.xml', `<w:document ${W}/>`), /dvě položky téhož jména/],
    r5KoncovaTecka: [navic('word/document.xml.', `<w:document ${W}/>`), /dvě položky téhož jména/],
    r5Prodlouzene: [navic('word/%C0%AE%C0%AE/x.xml'), /neplatný znak/],
    r5Fffd: [navic('word/x\ufffd.xml'), /neplatný znak/],
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
  /* revize SA R1: .bin s mezerami před „<" nad strop (dřív strop četl prvních 64 B) */
  for (const mezer of [65, 100000]) {
    const p = kopie(); const u8 = velkyDoc(STROP + 1024); u8.copyWithin(mezer, 0, u8.length - mezer); u8.fill(0x20, 0, mezer);
    p.push({ nazev: 'word/media/x.bin', data: u8 });
    const vady = await SO.sablonaObsahVady(await zip(p));
    test('→ odmítnuto (R1): .bin s ' + mezer + ' mezerami před „<" nad strop', vady.some(v => /XML část větší než 8 MB \(word\/media\/x\.bin\)/.test(v)), vady);
  }
  /* R1: zakázané pole v .bin, které začíná 100 mezerami — rozbor ho vidí */
  {
    const p = kopie(); p.push({ nazev: 'word/media/y.bin', data: enc.encode(' '.repeat(100) + `<w:document ${W}><w:body>` + pole(' USERNAME ') + '</w:body></w:document>') });
    const vady = await SO.sablonaObsahVady(await zip(p));
    test('→ odmítnuto (R1): pole v .bin za 100 mezerami', vady.some(v => /pole USERNAME \(word\/media\/y\.bin\)/.test(v)), vady);
  }
  /* revize SA R2: 60 MB binární část „A\0A\0…" (dřív čtená jako UTF-16 po znaku ~3,3 s) */
  {
    const p = kopie(); const u8 = new Uint8Array(60 * MB); for (let i = 0; i < u8.length; i += 2) u8[i] = 0x41;
    p.push({ nazev: 'word/media/z.bin', data: u8 });
    const t = Date.now(); const vady = SO.sablonaObsahVadyZipu(p); const ms = Date.now() - t;
    test('R2: 60 MB binární část „A\\0" se nedekóduje (pod 1 s)', vady.length === 0 && ms < 1000, { vady, ms });
  }
  /* R2: XML v UTF-16 LE i BE (s BOM i bez) — zakázané pole vidět */
  for (const [jm, le, bom] of [['LE', true, true], ['BE', false, true], ['LE bez BOM', true, false], ['BE bez BOM', false, false]]) {
    const t = `<w:document ${W}><w:body>` + pole(' AUTHOR ') + '</w:body></w:document>';
    const u8 = new Uint8Array((bom ? 2 : 0) + t.length * 2); let o = 0;
    if (bom) { u8[0] = le ? 0xFF : 0xFE; u8[1] = le ? 0xFE : 0xFF; o = 2; }
    for (let i = 0; i < t.length; i++) { const c = t.charCodeAt(i); u8[o + 2 * i] = le ? c & 255 : c >> 8; u8[o + 2 * i + 1] = le ? c >> 8 : c & 255; }
    const p = kopie(); p.push({ nazev: 'word/u16.xml', data: u8 });
    const vady = SO.sablonaObsahVadyZipu(p);
    test('→ odmítnuto (R2): pole v UTF-16 ' + jm, vady.some(v => /pole AUTHOR \(word\/u16\.xml\)/.test(v)), vady);
  }
  /* revize SA R8: strop při rozbalení i pro .XML, .rels a DEFLATE */
  for (const [nazev, deflate] of [['word/document.xml', true], ['word/Document.XML', false], ['word/Document.XML', true], ['word/_rels/velky.rels', false], ['word/_rels/velky.rels', true]]) {
    const pol = kopie().filter(x => x.nazev !== 'word/document.xml' || nazev.toLowerCase() !== 'word/document.xml');
    pol.push({ nazev, data: velkyDoc(STROP + 1) });
    const u8 = deflate ? zipDeflate(pol) : await zip(pol);
    let z = '';
    try { await DG.zipPrecti(u8, { xmlCastMax: STROP }); } catch (e) { z = e.message; }
    test('R8: zipPrecti zastaví ' + nazev + (deflate ? ' (DEFLATE)' : ' (STORE)'), /XML část větší než 8 MB/.test(z), z);
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
    r7Constructor: navic('constructor', '<a/>'),
    r7Proto: navic('__proto__', '<a/>'),
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
