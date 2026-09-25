/* Test docxgen.js – náhrada symbolů, ZIP roundtrip a odstranění prázdných
   řádků/sekcí technické specifikace na reálné šabloně.
   Použití: node test_docxgen.js /cesta/k/Sablona_NABIDKA_CN_v3.docx [vystup.docx] */
const fs = require('fs');
const { docxVyplnSablonu, nahradPlaceholdery, zipPrecti, zipZapis,
        odstranPrazdneTsRadky, expandujPriplatky } = require('./docxgen.js');

// --- data pro test na reálné šabloně: placeholdery z VÝCHOZÍHO zadání ---
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
global.vypocet = eng.vypocet; global.DEFAULT_ZADANI = eng.DEFAULT_ZADANI; global.DEFAULT_CENIK = ZC.zkusebniCenik();
const ep = require('./engine_proj.js');
global.DEFAULT_ZADANI_PROJ = ep.DEFAULT_ZADANI_PROJ; global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const tsm = require('./techspec.js');
global.TECHSPEC_DEF = tsm.TECHSPEC_DEF; global.tsHodnota = tsm.tsHodnota; global.DEFAULT_TECHSPEC = tsm.DEFAULT_TECHSPEC;
const zk = require('./zakazka.js');
const { nabidkaData } = require('./nabidka.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info || ''); } };

// pomůcky pro syntetické tabulky
const radek = inner => `<w:tr><w:tc>${inner}</w:tc></w:tr>`;
const bunka = txt => `<w:tr><w:tc><w:p><w:r><w:t>${txt}</w:t></w:r></w:tc></w:tr>`;
const pocetRadku = x => (x.match(/<w:tr[\s>]/g) || []).length;

(async () => {
  // 1) náhrada v XML – celistvý i rozdělený placeholder
  test('celistvý placeholder', nahradPlaceholdery('<w:t>{{OBJEDNATEL}}</w:t>', { OBJEDNATEL: 'MP <Lifts>' }) === '<w:t>MP &lt;Lifts&gt;</w:t>');
  test('placeholder rozdělený mezi runy', nahradPlaceholdery('<w:t>{{OBJ</w:t></w:r><w:r><w:t>EDNATEL}}</w:t>', { OBJEDNATEL: 'X' }) === '<w:t>X</w:t>');
  test('rozdělené závorky', nahradPlaceholdery('<w:t>{</w:t><w:t>{DATUM}</w:t><w:t>}</w:t>', { DATUM: '1.1.' }).includes('1.1.'));
  test('neznámý klíč zůstává', nahradPlaceholdery('<w:t>{{NEZNAMY}}</w:t>', {}) === '<w:t>{{NEZNAMY}}</w:t>');

  /* VÍCEŘÁDKOVÁ HODNOTA (17. 9. 2026). `\n` projde escapováním bez úhony —
   * v seznamu řídicích znaků není — ale Word ho vykreslí jako MEZERU. Bez
   * převodu na `<w:br/>` by dvouřádková patička ve wordové nabídce skončila
   * na jednom řádku a nikdo by nepoznal proč. */
  test('konec řádku se ve Wordu stane zalomením, ne mezerou',
    nahradPlaceholdery('<w:t>{{PATICKA}}</w:t>', { PATICKA: 'první\ndruhý' })
      === '<w:t>první<w:br/>druhý</w:t>');
  test('a text kolem zalomení se pořád escapuje',
    nahradPlaceholdery('<w:t>{{X}}</w:t>', { X: 'a<b\nc&d' })
      === '<w:t>a&lt;b<w:br/>c&amp;d</w:t>');
  /* CRLF ze schránky nebo z CRM nesmí udělat prázdný řádek navíc. */
  test('CRLF dá jedno zalomení, ne dvě',
    nahradPlaceholdery('<w:t>{{X}}</w:t>', { X: 'a\r\nb' }) === '<w:t>a<w:br/>b</w:t>');
  test('jednořádková hodnota zůstává beze změny',
    nahradPlaceholdery('<w:t>{{X}}</w:t>', { X: 'bez zalomení' }) === '<w:t>bez zalomení</w:t>');

  // 2) odstranění prázdných řádků (syntetické tabulky)
  // (a) řádek s jediným prázdným TS_ symbolem zmizí
  {
    const xml = '<w:tbl>' + bunka('UMÍSTĚNÍ {{TS_UMISTENI}}') + bunka('ZDVIH {{TS_ZDVIH}}') + '</w:tbl>';
    const out = odstranPrazdneTsRadky(xml, { TS_UMISTENI: ' -', TS_ZDVIH: '3,2' });
    test('(a) prázdný TS řádek zmizí', pocetRadku(out) === 1 && !out.includes('TS_UMISTENI') && out.includes('TS_ZDVIH'));
  }
  // (b) řádek se dvěma symboly, z nichž jeden vyplněný, zůstává
  {
    const xml = '<w:tbl>' + bunka('ROZMĚR šířka {{TS_SIRKA_VNEJSI}} × hloubka {{TS_HLOUBKA_VNEJSI}}') + '</w:tbl>';
    const out = odstranPrazdneTsRadky(xml, { TS_SIRKA_VNEJSI: '2000', TS_HLOUBKA_VNEJSI: '–' });
    test('(b) částečně vyplněný víceplaceholderový řádek zůstává', pocetRadku(out) === 1 && out.includes('TS_SIRKA_VNEJSI'));
  }
  // (c) řádek se dvěma prázdnými symboly zmizí
  {
    const xml = '<w:tbl>' + bunka('ROZMĚR šířka {{TS_SIRKA_VNEJSI}} × hloubka {{TS_HLOUBKA_VNEJSI}}') + bunka('ZDVIH {{TS_ZDVIH}}') + '</w:tbl>';
    const out = odstranPrazdneTsRadky(xml, { TS_SIRKA_VNEJSI: ' -', TS_HLOUBKA_VNEJSI: '—', TS_ZDVIH: '3,2' });
    test('(c) oba prázdné → řádek zmizí', pocetRadku(out) === 1 && !out.includes('TS_SIRKA_VNEJSI'));
  }
  // (d) prázdná sekce zmizí včetně pruhu
  {
    const xml = '<w:tbl>'
      + bunka('OPLÁŠTĚNÍ ŠACHTY')                 // sekční pruh
      + bunka('TYP OPLÁŠTĚNÍ {{TS_TYP_OPLASTENI}}')   // jediný řádek sekce – prázdný
      + bunka('DOPLŇKOVÉ KONSTRUKCE')             // další sekce
      + bunka('ODVĚTRÁNÍ {{TS_ODVETRANI}}')       // vyplněný řádek (sekce zůstává)
      + '</w:tbl>';
    const out = odstranPrazdneTsRadky(xml, { TS_TYP_OPLASTENI: ' -', TS_ODVETRANI: 'přirozené' });
    test('(d) prázdná sekce i s pruhem zmizí', !out.includes('OPLÁŠTĚNÍ ŠACHTY') && out.includes('DOPLŇKOVÉ KONSTRUKCE') && out.includes('TS_ODVETRANI'));
  }
  // (e) neprázdné řádky i hlavička zůstávají beze změny
  {
    const xml = '<w:tbl>' + bunka('OBJEDNATEL {{OBJEDNATEL}}') + bunka('UMÍSTĚNÍ {{TS_UMISTENI}}') + '</w:tbl>';
    const out = odstranPrazdneTsRadky(xml, { OBJEDNATEL: ' -', TS_UMISTENI: 'interiér' });
    test('(e) hlavička (bez TS) i vyplněný TS řádek zůstávají', out === xml);
  }
  // (e2) vnořená tabulka: nadřazený řádek se nesmí smazat kvůli vnořenému prázdnému
  {
    const vnor = '<w:tbl>' + bunka('VNITŘNÍ {{TS_PODCHOZI_OCK}}') + '</w:tbl>';
    const xml = '<w:tbl><w:tr><w:tc>POPIS bez TS' + vnor + '</w:tc></w:tr></w:tbl>';
    const out = odstranPrazdneTsRadky(xml, { TS_PODCHOZI_OCK: ' -' });
    test('(e2) vnořený prázdný řádek zmizí, nadřazený zůstává', out.includes('POPIS bez TS') && !out.includes('TS_PODCHOZI_OCK'));
  }

  // 3) reálná šablona
  const cesta = process.argv[2];
  if (!cesta) { console.log('(šablona nezadána – testy na reálné šabloně přeskočeny)'); }
  else {
    const buf = fs.readFileSync(cesta);
    const polozky = await zipPrecti(new Uint8Array(buf));
    test('šablona obsahuje document.xml', polozky.some(p => p.nazev === 'word/document.xml'));
    const zpet = await zipPrecti(new Uint8Array(await zipZapis(polozky).arrayBuffer()));
    test('roundtrip zachová počet souborů', zpet.length === polozky.length, zpet.length + '/' + polozky.length);
    const dok1 = polozky.find(p => p.nazev === 'word/document.xml');
    const dok2 = zpet.find(p => p.nazev === 'word/document.xml');
    test('roundtrip zachová obsah', Buffer.compare(Buffer.from(dok1.data), Buffer.from(dok2.data)) === 0);

    // vyplnění VÝCHOZÍMI daty (prázdné: ROZMĚR VNĚJŠÍ, USAZENÍ BOČNÍ/ZADNÍ, PODCHOZÍ OCK)
    const zak = zk.novaZakazka();
    zak.objednatel = 'Vzorový odběratel s.r.o.'; zak.cislo = '2026-OPR-CN-9001'; zak.adresa = 'Praha';
    const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));
    const d = nabidkaData(zak, zak.varianty[0], JEKLY);
    const blob = await docxVyplnSablonu(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), d.placeholders, d.priplatky);
    const out = Buffer.from(await blob.arrayBuffer());
    const vystup = process.argv[3] || '/tmp/nabidka_docxgen_test.docx';
    fs.writeFileSync(vystup, out);
    const vyplnene = await zipPrecti(new Uint8Array(out));
    const xml = Buffer.from(vyplnene.find(p => p.nazev === 'word/document.xml').data).toString('utf8');
    const textOnly = xml.replace(/<[^>]+>/g, '');
    // text jednotlivých buněk (pro kontrolu, že žádná hodnota není holé „-“)
    const bunkaText = frag => (frag.match(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/g) || [])
      .map(t => t.replace(/<[^>]*>/g, '')).join('').replace(/\s+/g, ' ').trim();
    const holyPomlcka = (xml.match(/<w:tc[\s>][\s\S]*?<\/w:tc>/g) || [])
      .map(bunkaText).filter(t => t === '-' || t === '–' || t === '—');

    // text syrové šablony (před vyplněním) – kontroly popisků jen když v šabloně jsou
    const syrove = Buffer.from(dok1.data).toString('utf8').replace(/<[^>]+>/g, '');
    const pryc = (label) => { if (syrove.includes(label)) test('(f) popisek odstraněn: ' + label, !textOnly.includes(label)); };
    const zustava = (label) => { if (syrove.includes(label)) test('(f) popisek zůstává: ' + label, textOnly.includes(label)); };

    test('žádný nevyplněný {{...}}', !/\{\{[A-Z0-9_]+\}\}/.test(xml));
    test('objednatel vyplněn', xml.includes('Vzorový odběratel'));
    // (f) po vyplnění výchozími daty nezůstane žádná buňka s holou hodnotou „-“
    test('(f) žádná buňka s holou hodnotou „-“', holyPomlcka.length === 0, JSON.stringify(holyPomlcka));
    // prázdné řádky (popisek+placeholder v jednom řádku) odstraněny
    pryc('USAZENÍ OCK – BOČNÍ');
    pryc('USAZENÍ OCK – ZADNÍ');
    pryc('PODCHOZÍ NOSNÁ OCK');
    // vyplněné řádky zůstávají
    zustava('ZDVIH VÝTAHU');
    // sekce zůstávají (žádná není pod výchozími daty celá prázdná)
    test('(f) sekce ZÁKLADNÍ PARAMETRY zůstává', textOnly.includes('ZÁKLADNÍ PARAMETRY ŠACHTY'));
    if (d.priplatky.length)
      test('příplatky v dokumentu (' + d.priplatky.length + ')', d.priplatky.every(p => xml.includes(p.nazev.replace(/&/g, '&amp;'))));
    console.log('výstup:', vystup);
  }
  /* B86 (hloubkový test 24. 9. 2026): symbol v NÁZVU příplatku se po
   * rozvinutí tabulky nesmí rozvinout podruhé. */
  {
    const proto = '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>{{PRIP_NAZEV}} {{PRIP_CENA}}</w:t></w:r></w:p></w:tc></w:tr></w:tbl>';
    const xml = '<w:body>' + proto + '<w:p><w:r><w:t>{{FIRMA_ICO}}</w:t></w:r></w:p></w:body>';
    const po = nahradPlaceholdery(expandujPriplatky(xml, [{ nazev: 'Zábrana {{FIRMA_ICO}}', popis: '', cena: '1 000 Kč' }]),
      { FIRMA_ICO: '12345678' });
    test('B86: symbol v názvu příplatku se nerozvine', po.includes('Zábrana &#123;&#123;FIRMA_ICO}}') && !po.includes('Zábrana 12345678'), po);
    test('B86: symbol mimo příplatek se rozvine dál', po.includes('<w:t>12345678</w:t>'), po);
    test('B86: běžný název příplatku zůstává beze změny',
      expandujPriplatky(proto, [{ nazev: 'Střecha', cena: '5 Kč' }]).includes('Střecha 5 Kč'));
  }
  console.log(fail ? `\n${fail} TESTŮ SELHALO` : '\nVŠECHNY TESTY DOCXGEN OK');
  process.exit(fail ? 1 : 0);
})();
