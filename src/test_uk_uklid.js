/* ============================================================================
 * UK — úklid nízkých návrhů revize G1 (#807, 26. 11. 2026)
 *  A) F3: náhrada vlastností Wordu bezpečná u atributu s „>“, CDATA
 *     a vnořeného prvku; při vadě struktury zůstane původní část (#820)
 *  B) F4: Manager v docProps/app.xml prázdný; w:author / w:initials
 *     komentářů a sledovaných změn (i w15:author, w15:userId v people.xml)
 *     = firma; text dokumentu beze změny (#820)
 *  C) F5: varování rucniPolozkaPomer u víc šachet s názvem šachty (#821)
 *  D) F7: dočasná značka verze v roadmapě větve → upozornění
 *     (novinky.py --docasne, krok staticke) (#822)
 * Pojistka: nad integrací 2a61e6c (před UK) sada padá — viz zpráva commitu.
 * Spuštění: node src/test_uk_uklid.js
 * ========================================================================== */
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const CORE = ['build_info.js', 'nazvy_souboru.js', 'preklad.js', 'format.js', 'engine.js', 'vice_sachet.js', 'engine_proj.js', 'techspec.js',
  'rucni_polozky.js', 'zakazka.js', 'uloziste.js', 'retence_zaloh.js', 'zamek.js', 'seznam.js', 'archiv.js', 'docxgen.js', 'xlsx.js', 'dokumenty.js',
  'sleva.js', 'schvalovani.js', 'zaokrouhleni.js', 'marze.js', 'kontroly.js', 'ares.js', 'poznamky.js', 'protokol.js', 'firma.js',
  'zpracovatel.js', 'podminky.js', 'plan_plateb.js', 'nabidka.js', 'nabidka_proj.js', 'sod.js', 'kryci.js', 'kryci_proj.js',
  'cenik.js', 'cenik_stari.js', 'cenik_rady.js', 'vyjimky.js', 'rucni_ceny.js', 'katalog.js', 'prepisy.js', 'slovnik.js',
  'konfigurace.js', 'sablony_online.js', 'sablona_obsah.js', 'analytika.js', 'nastaveni_db.js', 'program.js', 'ukazkove.js',
  'prava.js', 'zobrazeni.js', 'zakaznici.js', 'controlling.js', 'pd_nanecisto.js', 'objednane.js', 'standard_ock.js'];
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 500)); } };
for (const f of CORE) { const m = require(path.join(__dirname, f)); if (m && typeof m === 'object') Object.assign(global, m); }
const enc = new TextEncoder(), dec = new TextDecoder();
const bajty = blob => blob.arrayBuffer().then(b => new Uint8Array(b));
const FIRMA = 'ENGINEERS CZ s.r.o.';
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const CT = '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>';
const DOC = '<w:document ' + W + '><w:body><w:p><w:r><w:t>Cena {{CENA}}</w:t></w:r></w:p></w:body></w:document>';
const vypln = async casti => zipPrecti(await bajty(await docxVyplnSablonu((await bajty(zipZapis(
  [{ nazev: '[Content_Types].xml', data: enc.encode(CT) }].concat(casti.map(([n, x]) => ({ nazev: n, data: enc.encode(x) })))))).buffer,
  { CENA: '100' }, [], {}, {})));
const cast = (vyst, n) => { const p = vyst.find(x => x.nazev === n); return p ? dec.decode(p.data) : null; };
const coreXml = obsah => '<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
  + 'xmlns:dc="http://purl.org/dc/elements/1.1/">' + obsah + '<cp:revision>3</cp:revision></cp:coreProperties>';

(async () => {
  /* ---------- A) F3 ---------- */
  {
    const vyst = await vypln([['docProps/core.xml', coreXml('<dc:creator id="a>b">Jan Autor</dc:creator><cp:lastModifiedBy>X</cp:lastModifiedBy>')], ['word/document.xml', DOC]]);
    const c = cast(vyst, 'docProps/core.xml');
    test('A F3 atribut s „>“: autor = firma, atribut i struktura celé', c.includes('<dc:creator id="a>b">' + FIRMA + '</dc:creator>') && !c.includes('Jan Autor') && !xmlStrukturaVada(c), c);
    const vyst2 = await vypln([['docProps/core.xml', coreXml('<dc:creator><![CDATA[Jan </dc:creator> Autor]]></dc:creator>')], ['word/document.xml', DOC]]);
    const c2 = cast(vyst2, 'docProps/core.xml');
    test('A F3 CDATA s „</dc:creator>“: autor = firma, nic nezůstane', c2.includes('<dc:creator>' + FIRMA + '</dc:creator><cp:revision>') && !c2.includes('Autor') && !xmlStrukturaVada(c2), c2);
    const VNOR = coreXml('<dc:creator><dc:creator>Jan Autor</dc:creator></dc:creator>');
    const vyst3 = await vypln([['docProps/core.xml', VNOR], ['word/document.xml', DOC]]);
    const c3 = cast(vyst3, 'docProps/core.xml');
    test('A F3 vnořený prvek: náhrada by rozbila strukturu → část zůstane původní', c3 === VNOR && !xmlStrukturaVada(c3), c3);
    test('A F3 kontrola testu: samotná náhrada vnořeného prvku strukturu opravdu rozbije',
      !!xmlStrukturaVada(docxVlastnostiAutorXml(VNOR)), docxVlastnostiAutorXml(VNOR));
    test('A F3 dokument se přesto vyplní', cast(vyst3, 'word/document.xml').includes('Cena 100'));
  }

  /* ---------- B) F4 ---------- */
  {
    const APP = '<?xml version="1.0" encoding="UTF-8"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">'
      + '<Template>Normal.dotm</Template><Manager>Vedouci Oddeleni</Manager><Company>Notebook</Company></Properties>';
    const DOCR = '<w:document ' + W + '><w:body><w:p><w:ins w:id="1" w:author="Jan Autor" w:date="2026-01-01T00:00:00Z"><w:r><w:t>Cena {{CENA}}</w:t></w:r></w:ins>'
      + '<w:del w:id="2" w:author=\'Eva Revize\'><w:r><w:delText>staré</w:delText></w:r></w:del>'
      + '<w:commentRangeStart w:id="0"/><w:r><w:t>Pole w:author="v textu" a > zůstane</w:t></w:r><w:commentRangeEnd w:id="0"/></w:p></w:body></w:document>';
    const KOM = '<w:comments ' + W + '><w:comment w:id="0" w:author="Jan Autor" w:date="2026-01-01T00:00:00Z" w:initials="JA"><w:p><w:r><w:t>Poznámka JA</w:t></w:r></w:p></w:comment></w:comments>';
    const PEOPLE = '<w15:people xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"><w15:person w15:author="Jan Autor">'
      + '<w15:presenceInfo w15:providerId="AD" w15:userId="S::jan.autor@priklad.cz::0"/></w15:person></w15:people>';
    const vyst = await vypln([['docProps/core.xml', coreXml('<dc:creator>A</dc:creator>')], ['docProps/app.xml', APP],
      ['word/document.xml', DOCR], ['word/comments.xml', KOM], ['word/people.xml', PEOPLE]]);
    const app = cast(vyst, 'docProps/app.xml');
    test('B F4 Manager v docProps/app.xml prázdný, Template beze změny', app.includes('<Manager></Manager>') && !app.includes('Vedouci') && app.includes('<Template>Normal.dotm</Template>'), app);
    const d = cast(vyst, 'word/document.xml');
    test('B F4 sledované změny (w:ins, w:del): w:author = firma', d.includes('<w:ins w:id="1" w:author="' + FIRMA + '" w:date=') && d.includes("w:author='" + FIRMA + "'") && !/Jan Autor|Eva Revize/.test(d), d);
    test('B F4 text dokumentu beze změny (i text „w:author=…“)', d.includes('<w:t>Cena 100</w:t>') && d.includes('<w:t>Pole w:author="v textu" a > zůstane</w:t>') && d.includes('<w:delText>staré</w:delText>'), d);
    const k = cast(vyst, 'word/comments.xml');
    test('B F4 komentář: w:author i w:initials = firma, text komentáře beze změny',
      k.includes('w:author="' + FIRMA + '"') && k.includes('w:initials="' + FIRMA + '"') && !k.includes('Jan Autor') && k.includes('<w:t>Poznámka JA</w:t>'), k);
    const pe = cast(vyst, 'word/people.xml');
    test('B F4 people.xml: w15:author a w15:userId = firma (bez jména a přihlášení)', pe.includes('w15:author="' + FIRMA + '"') && !/Jan Autor|jan\.autor/.test(pe), pe);
    /* šablona bez komentářů a revizí: document.xml bajt po bajtu stejný jako dosud */
    const DOC0 = '<w:document ' + W + '><w:body><w:p><w:r><w:t>Cena {{CENA}} a > 0</w:t></w:r></w:p></w:body></w:document>';
    const v0 = await vypln([['word/document.xml', DOC0]]);
    test('B F4 šablona bez komentářů a revizí: dokument jen s dosazeným symbolem', cast(v0, 'word/document.xml') === DOC0.replace('{{CENA}}', '100'), cast(v0, 'word/document.xml'));
  }

  /* ---------- C) F5 ---------- */
  {
    const ZC = require('./zkusebni_cenik.js');
    global.DEFAULT_CENIK = ZC.zkusebniCenik();
    global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
    const J = JSON.parse(fs.readFileSync(path.join(__dirname, 'jekly.json'), 'utf8'));
    const kop = x => JSON.parse(JSON.stringify(x));
    const ZAD = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4, typSachty: 'exteriérová' };
    const RUC = { spojovaci: [{ nazev: 'Kotvy navíc', mnozstvi: 10, cena: 100 }] };
    const PREP = { mnozstviPrepis: { 'SPOJOVACÍ MATERIÁL': 3 } };
    const zakazka = (a, b) => {
      const zak = novaZakazka(); zak.cislo = '2026-OPR-CN-9821'; zak.nazevAkce = 'UK F5';
      const v = zak.varianty[0];
      v.data.cenik = Object.assign(ZC.zkusebniCenik(), { kurzEurKc: 25 });
      v.data.ock.fixes = true;
      v.data.ock.nazev = 'Výtah A';
      Object.assign(v.data.ock.zadani, ZAD, a);
      if (b) v.data.ock.dalsi = [{ id: 's_b', nazev: 'Výtah B', ks: 1, zadani: Object.assign(kop(DEFAULT_ZADANI), ZAD, b) }];
      return v;
    };
    const nalez = v => kontrolyProved({ jazyk: 'cz', vysledek: vypocetZ(v, J), zadani: v.data.ock.zadani, ock: v.data.ock, cenik: v.data.cenik, jekly: J })
      .nalezy.find(n => n.kod === 'rucniPolozkaPomer');
    const jenB = nalez(zakazka({}, Object.assign({ vlastniPolozky: kop(RUC) }, kop(PREP))));
    test('C F5 víc šachet, ruční položka + přepis jen u šachty B → nález „Výtah B: …“ bez Výtahu A',
      jenB && /^Výtah B: /.test(jenB.text) && !/Výtah A/.test(jenB.text) && /„Kotvy navíc"/.test(jenB.text), jenB);
    const obe = nalez(zakazka(Object.assign({ vlastniPolozky: kop(RUC) }, kop(PREP)), Object.assign({ vlastniPolozky: kop(RUC) }, kop(PREP))));
    test('C F5 obě šachty: jeden nález s oběma názvy', obe && /^Výtah A: .*Výtah B: /.test(obe.text), obe && obe.text);
    test('C F5 víc šachet bez přepisu → bez varování', !nalez(zakazka({ vlastniPolozky: kop(RUC) }, { vlastniPolozky: kop(RUC) })));
    const jedna = nalez(zakazka(Object.assign({ vlastniPolozky: kop(RUC) }, kop(PREP))));
    test('C F5 jedna šachta beze změny (bez názvu šachty)', jedna && /^Ruční položka „Kotvy navíc"/.test(jedna.text), jedna);
  }

  /* ---------- D) F7 ---------- */
  {
    const koren = path.join(__dirname, '..');
    const r = fs.mkdtempSync(path.join(os.tmpdir(), 'uk-f7-'));
    const g = (...a) => execFileSync('git', ['-C', r, '-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null'].concat(a), { stdio: 'pipe' });
    const nov = (...refy) => execFileSync('python3', [path.join(koren, 'nastroje', 'novinky.py'), '--docasne', '--koren', r].concat(refy), { encoding: 'utf8' });
    const roadmapa = pol => { fs.mkdirSync(path.join(r, 'roadmapa'), { recursive: true }); fs.writeFileSync(path.join(r, 'roadmapa', 'roadmap.json'), JSON.stringify({ polozky: pol })); };
    try {
      g('init', '-q', '-b', 'hlavni');
      roadmapa([{ id: '1', stav: 'hotovo', verze: 'v26.11.1' }, { id: '2', stav: 'hotovo', verze: 'UK' }, { id: '3', stav: 'ceka', verze: 'TX' },
        { id: '4', stav: 'hotovo', verze: 'R813' }]);
      g('add', '-A'); g('commit', '-q', '-m', 'a');
      const v1 = nov('hlavni');
      test('D F7 hotová položka s dočasnou značkou (UK, R813) → UPOZORNĚNÍ s čísly', /^UPOZORNĚNÍ: hlavni — .*#2 \(UK\), #4 \(R813\)/m.test(v1) && !/#1|#3/.test(v1), v1);
      g('checkout', '-q', '-b', 'testv');
      roadmapa([{ id: '1', stav: 'hotovo', verze: 'v26.11.1' }, { id: '2', stav: 'hotovo', verze: 'v26.11.2' }, { id: '3', stav: 'ceka', verze: 'TX' }]);
      g('commit', '-q', '-am', 'b');
      const v2 = nov('testv', 'neni/ref');
      test('D F7 čísla verzí (nehotová položka smí nést značku) → bez upozornění; chybějící ref = poznámka',
        !/UPOZORNĚNÍ/.test(v2) && /^testv: hotové položky nesou čísla verzí/m.test(v2) && /^Poznámka: roadmapu v neni\/ref/m.test(v2), v2);
    } finally { fs.rmSync(r, { recursive: true, force: true }); }
    const sh = fs.readFileSync(path.join(koren, 'nastroje', 'kontrola_podkladu.sh'), 'utf8');
    test('D F7 krok staticke (kontrola_podkladu.sh) volá kontrolu nad origin/main a origin/test',
      /^python3 nastroje\/novinky\.py --docasne origin\/main origin\/test$/m.test(sh));
  }

  console.log(`\nVýsledek: ${ok} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL výjimka ' + (e && e.stack || e)); process.exit(1); });
