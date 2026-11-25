/* ============================================================================
 * G1 — úklid nízkých nálezů vlny G (25. 11. 2026)
 *  A) #753 R6: položka ZIPu skrytá počtem v koncovém záznamu (zipPrecti)
 *  B) #753 R9: UTF-32 BE s BOM / dvojí BOM v části bez přípony .xml (sablonaJeXmlBajty)
 *  C) #753 R10: výjimka TextDecoder('utf-16be') kontrolu tiše vypnula (sablonaObsahText)
 *  D) #754: vlastnosti dokumentu (docProps/core.xml) — autor = firma
 *  E) #756: kontrola „rucniPolozkaPomer" (ruční položka Spojovacího materiálu /
 *     Lakování u ručně přepsaného řádku Hrubé OCK); cena se nemění
 * ========================================================================== */
'use strict';
const path = require('path');
const fs = require('fs');
const CORE = ['build_info.js', 'nazvy_souboru.js', 'preklad.js', 'format.js', 'engine.js', 'vice_sachet.js', 'engine_proj.js', 'techspec.js',
  'rucni_polozky.js', 'zakazka.js', 'uloziste.js', 'retence_zaloh.js', 'zamek.js', 'seznam.js', 'archiv.js', 'docxgen.js', 'xlsx.js', 'dokumenty.js',
  'sleva.js', 'schvalovani.js', 'zaokrouhleni.js', 'marze.js', 'kontroly.js', 'ares.js', 'poznamky.js', 'protokol.js', 'firma.js',
  'zpracovatel.js', 'podminky.js', 'plan_plateb.js', 'nabidka.js', 'nabidka_proj.js', 'sod.js', 'kryci.js', 'kryci_proj.js',
  'cenik.js', 'cenik_stari.js', 'cenik_rady.js', 'vyjimky.js', 'rucni_ceny.js', 'katalog.js', 'prepisy.js', 'slovnik.js',
  'konfigurace.js', 'sablony_online.js', 'sablona_obsah.js', 'analytika.js', 'nastaveni_db.js', 'program.js', 'ukazkove.js',
  'prava.js', 'zobrazeni.js', 'zakaznici.js', 'controlling.js', 'pd_nanecisto.js', 'objednane.js', 'standard_ock.js'];
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 500)); } };
for (const f of CORE) {
  const p = path.join(__dirname, f);
  const m = require(p); if (m && typeof m === 'object') Object.assign(global, m);
}
const enc = new TextEncoder(), dec = new TextDecoder();
const bajty = blob => blob.arrayBuffer().then(b => new Uint8Array(b));
const u16le = (u8, o, v) => { u8[o] = v & 255; u8[o + 1] = (v >> 8) & 255; };
const eocdOff = u8 => { for (let i = u8.length - 22; i >= 0; i--) if (u8[i] === 0x50 && u8[i + 1] === 0x4b && u8[i + 2] === 5 && u8[i + 3] === 6) return i; return -1; };
const odmitne = async (u8, re) => { try { await zipPrecti(u8); return false; } catch (e) { return re.test(e.message) ? true : e.message; } };
/* UTF-32 BE a UTF-16 BE z textu */
const utf32be = (t, bom) => { const a = []; if (bom) a.push(0, 0, 0xFE, 0xFF); for (const ch of t) { const c = ch.codePointAt(0); a.push(0, 0, (c >> 8) & 255, c & 255); } return new Uint8Array(a); };
const utf16be = (t, bom) => { const a = []; if (bom) a.push(0xFE, 0xFF); for (let i = 0; i < t.length; i++) { const c = t.charCodeAt(i); a.push(c >> 8, c & 255); } return new Uint8Array(a); };
const POLE = '<w:document><w:body><w:p><w:r><w:instrText>INCLUDETEXT "x.docx"</w:instrText></w:r></w:p></w:body></w:document>';
const CT = '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>';

(async () => {
  /* ---------- A) R6 ---------- */
  {
    const p = [{ nazev: '[Content_Types].xml', data: enc.encode(CT) }, { nazev: 'word/document.xml', data: enc.encode('<w:document/>') },
      { nazev: 'word/document.XML', data: enc.encode(POLE) }];
    const cisty = await bajty(zipZapis(p));
    test('A R6 čistý archiv se přečte (3 položky)', (await zipPrecti(cisty)).length === 3);
    const e = eocdOff(cisty);
    const skryty = new Uint8Array(cisty); u16le(skryty, e + 8, 2); u16le(skryty, e + 10, 2);
    test('A R6 počet v koncovém záznamu o 1 menší (skrytá položka) → odmítnuto', await odmitne(skryty, /skrytá položka/));
    const nesoulad = new Uint8Array(cisty); u16le(nesoulad, e + 8, 2);
    test('A R6 počet „na disku" ≠ „celkem" → odmítnuto', await odmitne(nesoulad, /počet položek/));
    /* jméno v lokální hlavičce jiné než v adresáři (stejná délka) */
    const jine = new Uint8Array(cisty);
    const i = dec.decode(jine).indexOf('word/document.xml');   // první výskyt = lokální hlavička
    jine.set(enc.encode('word/../../e.xml'), i);
    test('A R6 jméno v lokální hlavičce ≠ adresář → odmítnuto', await odmitne(jine, /lokální hlavičce/));
    const bezPodpisu = new Uint8Array(cisty); bezPodpisu[0] = 0;
    test('A R6 lokální hlavička bez podpisu → odmítnuto', await odmitne(bezPodpisu, /lokální hlavička/));
  }

  /* ---------- A2) revize Fable F1, F2 a kladné případy (F6) ---------- */
  {
    const zlib = require('zlib');
    /* Vlastní zápis ZIPu: DEFLATE, data descriptor (bit 3), komentář, bajty za koncem, ZIP64 záznamy. */
    const zip = (pol, o) => {
      o = o || {};
      const ven = [], cd = []; let off = 0;
      const u16 = v => [v & 255, (v >> 8) & 255], u32 = v => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255];
      for (const p of pol) {
        const jm = Array.from(enc.encode(p.nazev)), data = enc.encode(p.text);
        const crc = crc32(data), komp = p.deflate ? Array.from(zlib.deflateRawSync(data)) : Array.from(data);
        const fl = 0x800 | (p.dd ? 8 : 0), met = p.deflate ? 8 : 0;
        const hl = [...u32(0x04034b50), ...u16(20), ...u16(fl), ...u16(met), 0, 0, 0, 0,
          ...u32(p.dd ? 0 : crc), ...u32(p.dd ? 0 : komp.length), ...u32(p.dd ? 0 : data.length), ...u16(jm.length), 0, 0, ...jm, ...komp,
          ...(p.dd ? [...u32(0x08074b50), ...u32(crc), ...u32(komp.length), ...u32(data.length)] : [])];
        cd.push([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(fl), ...u16(met), 0, 0, 0, 0, ...u32(crc), ...u32(komp.length),
          ...u32(data.length), ...u16(jm.length), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(off), ...jm]);   // extra, komentář, disk, int. a ext. atributy
        ven.push(...hl); off += hl.length;
      }
      const cdZac = off, cdB = cd.flat();
      ven.push(...cdB);
      if (o.zip64) {
        const z = [...u32(0x06064b50), ...u32(44), 0, 0, 0, 0, ...u16(45), ...u16(45), ...u32(0), ...u32(0),
          ...u32(pol.length), 0, 0, 0, 0, ...u32(pol.length), 0, 0, 0, 0, ...u32(cdB.length), 0, 0, 0, 0, ...u32(cdZac), 0, 0, 0, 0];
        const lok = [...u32(0x07064b50), ...u32(0), ...u32(cdZac + cdB.length), 0, 0, 0, 0, ...u32(1)];
        ven.push(...z, ...lok);
      }
      const kom = Array.from(enc.encode(o.komentar || ''));
      ven.push(...u32(0x06054b50), 0, 0, 0, 0, ...u16(pol.length), ...u16(pol.length), ...u32(cdB.length), ...u32(cdZac), ...u16(kom.length), ...kom);
      if (o.za) ven.push(...o.za);
      return new Uint8Array(ven);
    };
    const DVE = [{ nazev: '[Content_Types].xml', text: CT }, { nazev: 'word/document.xml', text: '<w:document/>' }];
    let v;
    const cte = async (u8, n) => { try { const p = await zipPrecti(u8); return p.length === n && dec.decode(p[1].data) === '<w:document/>'; } catch (e) { return e.message; } };
    test('A2 F6 DEFLATE se přečte', (v = await cte(zip(DVE.map(p => Object.assign({ deflate: true }, p))), 2)) === true, v);
    test('A2 F6 data descriptor (bit 3) se přečte', (v = await cte(zip(DVE.map(p => Object.assign({ deflate: true, dd: true }, p))), 2)) === true, v);
    test('A2 F6 komentář archivu a bajty za koncem se přečtou', (v = await cte(zip(DVE, { komentar: 'vyrobeno', za: [1, 2, 3] }), 2)) === true, v);
    test('A2 F1 záznamy ZIP64 mezi adresářem a koncem (zip ze vstupu) se přečtou', (v = await cte(zip(DVE, { zip64: true }), 2)) === true, v);
    /* F1: [lokál A][lokál B][adresář A][adresář B][konec → jen adresář A] — Python i unzip čtou B */
    const tri = await bajty(zipZapis([{ nazev: '[Content_Types].xml', data: enc.encode(CT) }, { nazev: 'word/document.xml', data: enc.encode(POLE) }]));
    const e2 = eocdOff(tri), dv = new DataView(tri.buffer);
    const cdA = 46 + dv.getUint16(dv.getUint32(e2 + 16, true) + 28, true);
    const mezera = new Uint8Array(tri); u16le(mezera, e2 + 8, 1); u16le(mezera, e2 + 10, 1);
    mezera[e2 + 12] = cdA & 255; mezera[e2 + 13] = cdA >> 8; mezera[e2 + 14] = 0; mezera[e2 + 15] = 0;
    test('A2 F1 cizí adresář mezi adresářem a koncem → odmítnuto', await odmitne(mezera, /cizí data/));
    /* F2: jména stejné délky s různými neplatnými bajty UTF-8 (obě → U+FFFD) */
    const f2 = await bajty(zipZapis([{ nazev: 'word/a.xml', data: enc.encode('<a/>') }]));
    const t = dec.decode(f2), i1 = t.indexOf('word/a.xml'), i2 = t.indexOf('word/a.xml', i1 + 1);
    const neplatne = new Uint8Array(f2); neplatne[i1 + 5] = 0xFE; neplatne[i2 + 5] = 0xFF;
    test('A2 F2 jména liší se jen neplatným bajtem → odmítnuto', await odmitne(neplatne, /lokální hlavičce/));
  }

  /* ---------- B) R9 ---------- */
  {
    const t = '<w:hdr/>';
    test('B R9 UTF-32 BE s BOM je XML', sablonaJeXmlBajty(utf32be(t, true)) === true);
    test('B R9 UTF-32 LE s BOM je XML', sablonaJeXmlBajty(new Uint8Array([0xFF, 0xFE, 0, 0, 0x3C, 0, 0, 0])) === true);
    test('B R9 dvojí BOM UTF-8 je XML', sablonaJeXmlBajty(new Uint8Array([0xEF, 0xBB, 0xBF, 0xEF, 0xBB, 0xBF, 0x3C])) === true);
    test('B R9 BOM UTF-8 + BOM UTF-16 LE je XML', sablonaJeXmlBajty(new Uint8Array([0xEF, 0xBB, 0xBF, 0xFF, 0xFE, 0x3C, 0])) === true);
    test('B R9 obrázek (PNG) dál není XML', sablonaJeXmlBajty(new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A])) === false);
    test('B R9 samotný BOM bez „<" není XML', sablonaJeXmlBajty(new Uint8Array([0xFE, 0xFF, 0x00, 0x41])) === false);
    const v = sablonaObsahVadyZipu([{ nazev: 'word/h.bin', data: utf32be(POLE, true) }]);
    test('B R9 word/h.bin v UTF-32 BE s BOM → vada (dřív prošla nerozebraná)', v.some(x => /UTF-32/.test(x) && /h\.bin/.test(x)), v);
  }

  /* ---------- C) R10 ---------- */
  {
    const Puvodni = global.TextDecoder;
    class Rozbity extends Puvodni { constructor(k, o) { if (String(k).toLowerCase() === 'utf-16be') throw new RangeError('nepodporováno'); super(k, o); } }
    global.TextDecoder = Rozbity;
    let v, vyj = '';
    try { v = sablonaObsahVadyZipu([{ nazev: 'word/document.xml', data: utf16be(POLE, true) }]); }
    catch (e) { vyj = e.message; }
    finally { global.TextDecoder = Puvodni; }
    test('C R10 dekodér UTF-16 BE selže → vada „nejde přečíst", část neprojde', !vyj && Array.isArray(v) && v.some(x => /nejde přečíst/.test(x) && /document\.xml/.test(x)), vyj || v);
    const w = sablonaObsahVadyZipu([{ nazev: 'word/document.xml', data: utf16be(POLE, true) }]);
    test('C R10 s funkčním dekodérem se UTF-16 BE rozebere (zakázané pole nalezeno)', w.some(x => /INCLUDETEXT/i.test(x)) && !w.some(x => /nejde přečíst/.test(x)), w);
  }

  /* ---------- D) #754 ---------- */
  {
    const CORE_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/">'
      + '<dc:title>Nabídka</dc:title><dc:creator>Autor Šablony</dc:creator><cp:lastModifiedBy>Kdo &amp; Upravil</cp:lastModifiedBy>'
      + '<cp:revision>7</cp:revision></cp:coreProperties>';
    const DOC = '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Cena {{CENA}}</w:t></w:r></w:p></w:body></w:document>';
    const sab = await bajty(zipZapis([{ nazev: '[Content_Types].xml', data: enc.encode(CT) }, { nazev: 'docProps/core.xml', data: enc.encode(CORE_XML) },
      { nazev: 'word/document.xml', data: enc.encode(DOC) }]));
    const vyst = await zipPrecti(await bajty(await docxVyplnSablonu(sab.buffer, { CENA: '100' }, [], {}, {})));
    const core = dec.decode(vyst.find(p => p.nazev === 'docProps/core.xml').data);
    test('D #754 dc:creator = ENGINEERS CZ s.r.o.', core.includes('<dc:creator>ENGINEERS CZ s.r.o.</dc:creator>') && !core.includes('Autor Šablony'), core);
    test('D #754 cp:lastModifiedBy = ENGINEERS CZ s.r.o.', core.includes('<cp:lastModifiedBy>ENGINEERS CZ s.r.o.</cp:lastModifiedBy>') && !core.includes('Upravil'), core);
    test('D #754 ostatní vlastnosti beze změny (revision); #794 dc:title prázdný', core.includes('<dc:title></dc:title>') && !core.includes('Nabídka</dc:title>') && core.includes('<cp:revision>7</cp:revision>'), core);
    test('D #754 text dokumentu vyplněn jako dřív', dec.decode(vyst.find(p => p.nazev === 'word/document.xml').data).includes('Cena 100'));
    /* Revize koordinace S1: CN v18 má i docProps/core0.xml (záznam v [Content_Types].xml a vztah v _rels/.rels) */
    const CT2 = '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
      + '<Override PartName="/docProps/core0.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
      + "<Override ContentType='application/vnd.openxmlformats-package.core-properties+xml' PartName='/docProps/jenTypy.xml'/></Types>";
    const RELS = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
      + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
      + '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core0.xml"/>'
      + "<Relationship Id='rId4' Type='http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties' Target='/meta/vlastnosti.xml'/></Relationships>";
    const sab2 = await bajty(zipZapis([{ nazev: '[Content_Types].xml', data: enc.encode(CT2) }, { nazev: '_rels/.rels', data: enc.encode(RELS) },
      { nazev: 'docProps/core.xml', data: enc.encode(CORE_XML) }, { nazev: 'docProps/core0.xml', data: enc.encode(CORE_XML) },
      { nazev: 'meta/vlastnosti.xml', data: enc.encode(CORE_XML) }, { nazev: 'docProps/jenTypy.xml', data: enc.encode(CORE_XML) }, { nazev: 'docProps/app.xml', data: enc.encode('<Properties><dc:creator>Jiny Prvek</dc:creator></Properties>') },
      { nazev: 'word/document.xml', data: enc.encode(DOC) }]));
    const vyst2 = await zipPrecti(await bajty(await docxVyplnSablonu(sab2.buffer, { CENA: '100' }, [], {}, {})));
    const cast = n => dec.decode(vyst2.find(p => p.nazev === n).data);
    const firma = x => x.includes('<dc:creator>ENGINEERS CZ s.r.o.</dc:creator>') && x.includes('<cp:lastModifiedBy>ENGINEERS CZ s.r.o.</cp:lastModifiedBy>');
    test('D S1 druhá část vlastností docProps/core0.xml (CN v18) přepsána', firma(cast('docProps/core0.xml')), cast('docProps/core0.xml'));
    test('D S1 část jen podle [Content_Types].xml (docProps/jenTypy.xml) přepsána', firma(cast('docProps/jenTypy.xml')), cast('docProps/jenTypy.xml'));
    test('D S1 část jen podle vztahu v _rels/.rels (/meta/vlastnosti.xml) přepsána', firma(cast('meta/vlastnosti.xml')), cast('meta/vlastnosti.xml'));
    test('D S1 docProps/core.xml dál přepsána, jiná část (app.xml) beze změny',
      firma(cast('docProps/core.xml')) && cast('docProps/app.xml').includes('Jiny Prvek'));
    const fn = typeof docxVlastnostiAutorXml === 'function' ? docxVlastnostiAutorXml : x => x;
    test('D #754 prázdný prvek (<cp:lastModifiedBy/>) dostane firmu',
      fn('<cp:lastModifiedBy/><dc:creator xml:lang="cs">x</dc:creator>') === '<cp:lastModifiedBy>ENGINEERS CZ s.r.o.</cp:lastModifiedBy><dc:creator xml:lang="cs">ENGINEERS CZ s.r.o.</dc:creator>');
    test('D #754 chybějící prvek se nepřidává, jiné prvky beze změny', typeof docxVlastnostiAutorXml === 'function' && fn('<dc:subject>a</dc:subject><dc:creatorX>b</dc:creatorX><dc:title/>') === '<dc:subject>a</dc:subject><dc:creatorX>b</dc:creatorX><dc:title/>');

    /* #794 (J. V. 25. 11., revize G1 N1): Company = firma (app.xml, custom.xml), dc:title prázdný — ve všech částech */
    const APP = '<?xml version="1.0" encoding="UTF-8"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">'
      + '<Template>Normal.dotm</Template><Company>Notebook</Company><Manager>Vedouci</Manager></Properties>';
    const CUSTOM = '<?xml version="1.0" encoding="UTF-8"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">'
      + '<property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2" name="Company"><vt:lpwstr>MHMP</vt:lpwstr></property>'
      + '<property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="3" name="Jine"><vt:lpwstr>zustane</vt:lpwstr></property></Properties>';
    const CT3 = '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Override PartName="/vlast/app2.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>';
    const RELS3 = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
      + '<Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties" Target="vlast/moje.xml"/></Relationships>';
    const sab3 = await bajty(zipZapis([{ nazev: '[Content_Types].xml', data: enc.encode(CT3) }, { nazev: '_rels/.rels', data: enc.encode(RELS3) },
      { nazev: 'docProps/core.xml', data: enc.encode(CORE_XML) }, { nazev: 'docProps/app.xml', data: enc.encode(APP) },
      { nazev: 'vlast/app2.xml', data: enc.encode(APP) }, { nazev: 'docProps/custom.xml', data: enc.encode(CUSTOM) },
      { nazev: 'vlast/moje.xml', data: enc.encode(CUSTOM) }, { nazev: 'word/document.xml', data: enc.encode(DOC) }]));
    const vyst3 = await zipPrecti(await bajty(await docxVyplnSablonu(sab3.buffer, { CENA: '100' }, [], {}, {})));
    const c3 = n => dec.decode(vyst3.find(p => p.nazev === n).data);
    const comp = x => x.includes('<Company>ENGINEERS CZ s.r.o.</Company>') && !x.includes('Notebook') && x.includes('<Manager>Vedouci</Manager>');
    test('D #794 Company v docProps/app.xml (bez záznamu v typech) = firma, ostatní (Manager) beze změny', comp(c3('docProps/app.xml')), c3('docProps/app.xml'));
    test('D #794 Company i v další části app podle [Content_Types].xml', comp(c3('vlast/app2.xml')), c3('vlast/app2.xml'));
    const cus = x => x.includes('name="Company"><vt:lpwstr>ENGINEERS CZ s.r.o.</vt:lpwstr></property>') && !x.includes('MHMP') && x.includes('<vt:lpwstr>zustane</vt:lpwstr>');
    test('D #794 vlastnost Company v docProps/custom.xml = firma, jiné vlastnosti beze změny', cus(c3('docProps/custom.xml')), c3('docProps/custom.xml'));
    test('D #794 Company i v části custom podle vztahu v _rels/.rels', cus(c3('vlast/moje.xml')), c3('vlast/moje.xml'));
    test('D #794 dc:title prázdný i v druhé části vlastností (core0.xml)', cast('docProps/core0.xml').includes('<dc:title></dc:title>'), cast('docProps/core0.xml'));
    test('D #794 text dokumentu beze změny', dec.decode(vyst3.find(p => p.nazev === 'word/document.xml').data).includes('Cena 100'));
  }

  /* ---------- E) #756 ---------- */
  {
    const ZC = require('./zkusebni_cenik.js');
    global.DEFAULT_CENIK = ZC.zkusebniCenik();
    global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
    const J = JSON.parse(fs.readFileSync(path.join(__dirname, 'jekly.json'), 'utf8'));
    const ZAD = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4, typSachty: 'exteriérová' };
    const zakazka = (rucni, prepis) => {
      const zak = novaZakazka(); zak.cislo = '2026-OPR-CN-9756'; zak.nazevAkce = 'G1 #756';
      const v = zak.varianty[0];
      v.data.cenik = Object.assign(ZC.zkusebniCenik(), { kurzEurKc: 25 });
      v.data.ock.fixes = true;
      Object.assign(v.data.ock.zadani, ZAD, { vlastniPolozky: rucni }, prepis || {});
      return { zak, v };
    };
    const nalez = (v) => kontrolyProved({ jazyk: 'cz', vysledek: vypocetZ(v, J), zadani: v.data.ock.zadani, ock: v.data.ock }).nalezy.find(n => n.kod === 'rucniPolozkaPomer');
    const RUC = { spojovaci: [{ nazev: 'Kotvy navíc', mnozstvi: 10, cena: 100 }] };
    const bez = zakazka(RUC);
    test('E #756 ruční položka, řádek Hrubé OCK nepřepsaný → bez varování', !nalez(bez.v));
    const prep = zakazka(RUC, { mnozstviPrepis: { 'SPOJOVACÍ MATERIÁL': 3 } });
    const rs = vypocetZ(prep.v, J).sekce.hrubaOck.find(x => x.origNazev === 'SPOJOVACÍ MATERIÁL');
    test('E #756 přepis množství řádku SPOJOVACÍ MATERIÁL je ve výsledku vidět', rs && rs.prepsano === true, rs);
    const n = nalez(prep.v);
    test('E #756 ruční položka + přepsaný řádek → varování s názvem položky a řádku',
      n && /„Kotvy navíc"/.test(n.text) && /SPOJOVACÍ MATERIÁL/.test(n.text) && n.uroven === 2, n);
    const jenPrepis = zakazka({}, { mnozstviPrepis: { 'SPOJOVACÍ MATERIÁL': 3 } });
    test('E #756 přepsaný řádek bez ruční položky → bez varování', !nalez(jenPrepis.v));
    const lak = zakazka({ lakovani: [{ nazev: 'Lak navíc', mnozstvi: 2, cena: 500 }] }, { mnozstviPrepis: { 'LAKOVÁNÍ (ŠACHTA, PLECHY, ZASKLENÍ, OPLECHOVÁNÍ)': 5 } });
    const nl = nalez(lak.v);
    test('E #756 lakování: přepsaný řádek LAKOVÁNÍ → varování', nl && /„Lak navíc"/.test(nl.text) && /LAKOVÁNÍ/.test(nl.text), nl);
    const cenaPr = zakazka(RUC, { cenyPrepis: { 'SPOJOVACÍ MATERIÁL': 1 } });
    const rsc = vypocetZ(cenaPr.v, J).sekce.hrubaOck.find(x => x.origNazev === 'SPOJOVACÍ MATERIÁL');
    test('E #756 (F6) přepis jednotkové ceny řádku → varování', rsc && rsc.cenaPrepsana && !rsc.prepsano && !!nalez(cenaPr.v), rsc && [rsc.prepsano, rsc.cenaPrepsana]);
    const trvala = zakazka({ spojovaci: [{ nazev: 'Trvalá', mnozstvi: 1, cena: 50, kid: 'k9' }] }, { mnozstviPrepis: { 'SPOJOVACÍ MATERIÁL': 3 } });
    test('E #756 trvalá položka z ceníku (kid) → bez varování', !nalez(trvala.v));
    const jinaSekce = zakazka({ hrubaOck: [{ nazev: 'Výztuha', mnozstvi: 1, cena: 100 }] }, { mnozstviPrepis: { 'SPOJOVACÍ MATERIÁL': 3 } });
    test('E #756 ruční položka v Hrubé OCK (ne Spojovací) → bez varování', !nalez(jinaSekce.v));
    /* cena ani tisk se nemění: rozpis ruční položky je týž jako před G1 (poměr přepsaného řádku) */
    const r = vypocetZ(prep.v, J);
    const k = rucniPolozkyVysledku(r, prep.v.data.ock.zadani).find(x => x.nazev === 'Kotvy navíc');
    test('E #756 cena položky beze změny (náklad × poměr přepsaného řádku)', k && Math.abs(k.sMarzi - 1000 * rs.sMarzi / rs.naklad) < 1e-6, { k, rs: rs && [rs.naklad, rs.sMarzi] });
  }

  console.log(`\nVýsledek: ${ok} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL výjimka ' + (e && e.stack || e)); process.exit(1); });
