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

  /* ---------- B) R9 ---------- */
  {
    const t = '<w:hdr/>';
    test('B R9 UTF-32 BE s BOM je XML', sablonaJeXmlBajty(utf32be(t, true)) === true);
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
    test('D #754 ostatní vlastnosti beze změny (title, revision)', core.includes('<dc:title>Nabídka</dc:title>') && core.includes('<cp:revision>7</cp:revision>'), core);
    test('D #754 text dokumentu vyplněn jako dřív', dec.decode(vyst.find(p => p.nazev === 'word/document.xml').data).includes('Cena 100'));
    const fn = typeof docxVlastnostiAutorXml === 'function' ? docxVlastnostiAutorXml : x => x;
    test('D #754 prázdný prvek (<cp:lastModifiedBy/>) dostane firmu',
      fn('<cp:lastModifiedBy/><dc:creator xml:lang="cs">x</dc:creator>') === '<cp:lastModifiedBy>ENGINEERS CZ s.r.o.</cp:lastModifiedBy><dc:creator xml:lang="cs">ENGINEERS CZ s.r.o.</dc:creator>');
    test('D #754 chybějící prvek se nepřidává, jiné prvky beze změny', typeof docxVlastnostiAutorXml === 'function' && fn('<dc:title>a</dc:title><dc:creatorX>b</dc:creatorX>') === '<dc:title>a</dc:title><dc:creatorX>b</dc:creatorX>');
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
