/* Testy jazykových mutací dokumentů (N1, 2. část):
   – docxPrelozSablonu / docxPrelozXml: překlad pevného textu .docx šablony,
   – nabidkaData(…, lang): překlad HODNOT dosazovaných do {{…}}.
   Spuštění: cd src && node test_docx_preklad.js */
const P = require('./preklad.js');
global.tr = P.tr; global.trStav = P.trStav;                 // v prohlížeči jsou to globály z preklad.js
const dg = require('./docxgen.js');
const { docxPrelozXml, docxPrelozSablonu, odstavcoveSpany, odstavecText, zipPrecti } = dg;

const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
global.vypocet = eng.vypocet; global.DEFAULT_ZADANI = eng.DEFAULT_ZADANI; global.DEFAULT_CENIK = ZC.zkusebniCenik();
const ep = require('./engine_proj.js');
global.DEFAULT_ZADANI_PROJ = ep.DEFAULT_ZADANI_PROJ; global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const tsm = require('./techspec.js');
global.TECHSPEC_DEF = tsm.TECHSPEC_DEF; global.tsHodnota = tsm.tsHodnota; global.DEFAULT_TECHSPEC = tsm.DEFAULT_TECHSPEC;
const zk = require('./zakazka.js');
const { nabidkaData } = require('./nabidka.js');
const JEKLY = JSON.parse(require('fs').readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info || ''); } };

const par = (...runy) => '<w:p>' + runy.map(t => `<w:r><w:t>${t}</w:t></w:r>`).join('') + '</w:p>';
const texty = xml => (xml.match(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g) || [])
  .map(t => t.replace(/^<w:t(?:\s[^>]*)?>/, '').replace(/<\/w:t>$/, ''));

// ---- 1. hledání odstavců ---------------------------------------------------
const x1 = par('A') + '<w:p/>' + par('B') + '<w:p w:rsidR="00"/>' + par('C');
test('najde 3 odstavce, prázdné <w:p/> ignoruje', odstavcoveSpany(x1).length === 3,
  odstavcoveSpany(x1).length);
test('text odstavce spojí runy', odstavecText(par('UMÍSTĚNÍ ', 'ŠACHTY')) === 'UMÍSTĚNÍ ŠACHTY');
test('text odstavce rozkóduje entity', odstavecText(par('A &amp; B')) === 'A & B');

// ---- 2. překlad textu rozděleného do více runů -----------------------------
let stat = { celkem: 0, prelozeno: 0, neutralni: 0, chybi: [] };
let out = docxPrelozXml(par('UMÍSTĚNÍ ', 'ŠACHTY'), 'en', stat);
test('rozdělený text se přeloží jako celek', texty(out)[0] === 'SHAFT LOCATION', texty(out));
test('ostatní runy se vyprázdní', texty(out)[1] === '', JSON.stringify(texty(out)));
test('statistika započítala překlad', stat.prelozeno === 1 && stat.celkem === 1, JSON.stringify(stat));

stat = { celkem: 0, prelozeno: 0, neutralni: 0, chybi: [] };
out = docxPrelozXml(par('ZÁKLADNÍ PARAMETRY ŠACHTY'), 'de', stat);
test('DE překlad sekce', texty(out)[0] === 'PARAMETER DES SCHACHTGERÜSTS', texty(out));

// ---- 3. zástupné symboly {{…}} zůstávají netknuté --------------------------
stat = { celkem: 0, prelozeno: 0, neutralni: 0, chybi: [] };
const xPh = par('{{TS_UMISTENI}}');
test('odstavec se symbolem se nemění', docxPrelozXml(xPh, 'en', stat) === xPh);
const xPhSplit = par('{{', 'TS_UMISTENI', '}}');
test('symbol rozdělený do runů se nemění', docxPrelozXml(xPhSplit, 'en', stat) === xPhSplit);
test('symboly se nepočítají do statistiky', stat.celkem === 0, JSON.stringify(stat));

// ---- 4. nepřeložené fráze zůstávají česky a jsou v seznamu -----------------
stat = { celkem: 0, prelozeno: 0, neutralni: 0, chybi: [] };
const xNez = par('naprosto neznámá věta v šabloně');
out = docxPrelozXml(xNez, 'en', stat);
test('neznámá věta zůstane česky', out === xNez);
test('neznámá věta je v seznamu chybějících', stat.chybi[0] === 'naprosto neznámá věta v šabloně',
  JSON.stringify(stat.chybi));

// ---- 5. neutrální obsah (čísla, pomlčky) se nepočítá jako chybějící --------
stat = { celkem: 0, prelozeno: 0, neutralni: 0, chybi: [] };
docxPrelozXml(par('1 600') + par(' - '), 'fr', stat);
test('neutrální odstavce se nehlásí jako chybějící', stat.chybi.length === 0 && stat.neutralni === 2,
  JSON.stringify(stat));

// ---- 6. escapování a bezpečnost XML ---------------------------------------
stat = { celkem: 0, prelozeno: 0, neutralni: 0, chybi: [] };
P.prekladNastav('test & pokus', 'en', 'test & attempt <ok>');
out = docxPrelozXml(par('test &amp; pokus'), 'en', stat);
test('výstup je XML-escapovaný', texty(out)[0] === 'test &amp; attempt &lt;ok&gt;', texty(out));
P.prekladSmaz('test & pokus');

// ---- 7. celý .docx roundtrip ----------------------------------------------
(async () => {
  const telo = par('ZÁKLADNÍ PARAMETRY ŠACHTY') + par('UMÍSTĚNÍ ŠACHTY') + par('{{TS_UMISTENI}}');
  const zdroj = await dg.docxSestavBlob(telo).arrayBuffer();
  const st = {};
  const blob = await docxPrelozSablonu(zdroj, 'en', st);
  const polozky = await zipPrecti(new Uint8Array(await blob.arrayBuffer()));
  const doc = new TextDecoder().decode(polozky.find(p => p.nazev === 'word/document.xml').data);
  test('roundtrip: sekce přeložena', doc.includes('SHAFT CORE PARAMETERS'), doc.slice(0, 200));
  test('roundtrip: popisek přeložen', doc.includes('SHAFT LOCATION'));
  test('roundtrip: symbol zachován', doc.includes('{{TS_UMISTENI}}'));
  test('roundtrip: statistika', st.prelozeno === 2 && st.celkem === 2, JSON.stringify(st));

  let chyba = '';
  try { await docxPrelozSablonu(zdroj, 'cz', {}); } catch (e) { chyba = e.message; }
  test('bez cílového jazyka to skončí chybou', /jazyk/i.test(chyba), chyba);

  // ---- 8. nabidkaData s jazykem -------------------------------------------
  const zak = zk.novaZakazka();
  zak.cislo = '2026-OPR-CN-9001'; zak.objednatel = 'Vzorový odběratel s.r.o.';
  const v = zak.varianty[0];
  const cz = nabidkaData(zak, v, JEKLY);
  const czExpl = nabidkaData(zak, v, JEKLY, 'cz');
  const en = nabidkaData(zak, v, JEKLY, 'en');
  const de = nabidkaData(zak, v, JEKLY, 'de');

  test('bez jazyka = beze změny (zpětná kompatibilita)',
    JSON.stringify(cz.placeholders) === JSON.stringify(czExpl.placeholders));
  // hodnoty ze slovníku se přeloží; co ve slovníku není, zůstává česky (a je vidět v pokrytí)
  const tsKlice = Object.keys(cz.placeholders).filter(k => k.startsWith('TS_'));
  const zmeneno = tsKlice.filter(k => en.placeholders[k] !== cz.placeholders[k]);
  test('EN: přeložena je aspoň třetina hodnot TS_*', zmeneno.length >= tsKlice.length / 3,
    zmeneno.length + '/' + tsKlice.length);
  test('EN: konkrétní hodnota přeložena (slovník/vzor)',
    en.placeholders.TS_HAKY === P.tr(cz.placeholders.TS_HAKY, 'en')
    && ['slovník', 'vzor'].includes(P.trStav(cz.placeholders.TS_HAKY, 'en').zdroj),
    cz.placeholders.TS_HAKY + ' → ' + en.placeholders.TS_HAKY);
  test('EN: sazba DPH slovem přeložena', en.placeholders.DPH_NAZEV === P.tr(cz.placeholders.DPH_NAZEV, 'en'),
    cz.placeholders.DPH_NAZEV + ' → ' + en.placeholders.DPH_NAZEV);
  test('DE: sazba DPH slovem přeložena', de.placeholders.DPH_NAZEV === P.tr(cz.placeholders.DPH_NAZEV, 'de'),
    cz.placeholders.DPH_NAZEV + ' → ' + de.placeholders.DPH_NAZEV);
  /* Do 21. 9. 2026 se tu hledala konkrétní anglická slova („included"). To je
   * křehké: nález N17 přidal třetí stav („nabízeno jako příplatek" → „offered
   * as an extra charge") a kontrola spadla, přestože překlad byl v pořádku.
   * Zkouší se proto totéž co o pár řádků výš u TS_HAKY — že hodnota projde
   * slovníkem —, ne jaká slova v ní stojí. */
  test('EN: sokl přeložen',
    en.placeholders.TS_NENI_SOKL === P.tr(cz.placeholders.TS_NENI_SOKL, 'en')
    && ['slovník', 'vzor'].includes(P.trStav(cz.placeholders.TS_NENI_SOKL, 'en').zdroj),
    cz.placeholders.TS_NENI_SOKL + ' → ' + en.placeholders.TS_NENI_SOKL);
  test('ceny zůstávají shodné bez ohledu na jazyk',
    en.placeholders.CENA_BEZ_DPH === cz.placeholders.CENA_BEZ_DPH);
  /* Pořadí příplatků se mění s výchozím nastavením nové nabídky (9. 9. 2026:
   * světlík i přechodové plechy jsou nově odškrtnuté), takže se nesmí testovat
   * první řádek. Hlídá se to, o co jde: v anglické nabídce nezůstane česky
   * uvozené množství — a sloučené přechodové plechy nemají množství vůbec,
   * kusy a kilogramy nejde sečíst. */
  const czPopisy = en.priplatky.filter(p => /^množství: /.test(p.popis));
  const enPopisy = en.priplatky.filter(p => /^quantity: /.test(p.popis));
  const bezMnozstvi = en.priplatky.filter(p => !/^(množství|quantity): /.test(p.popis));
  test('EN: příplatky mají anglické „quantity"',
    czPopisy.length === 0 && (enPopisy.length > 0 || en.priplatky.length === bezMnozstvi.length),
    en.priplatky.map(p => p.popis).join(' | '));
  test('EN: sloučené přechodové plechy jsou přeložené, bez množství',
    bezMnozstvi.every(p => !/[ěščřžýáíéúůňťď]/i.test(p.popis)),
    bezMnozstvi.map(p => p.popis).join(' | '));
  test('název souboru nese jazyk', en.nazevSouboru.endsWith('_EN') && !cz.nazevSouboru.endsWith('_EN'),
    en.nazevSouboru);
  test('data nesou informaci o jazyku', en.jazyk === 'en' && cz.jazyk === 'cz');
  /* Hlídá se ZTRÁTA, ne prázdnota: některé placeholdery jsou prázdné záměrně
   * (ZAOKROUHLENI_KC je prázdné, když se nezaokrouhluje – dokument tím schová
   * celý řádek). Chyba by byla, kdyby česky vyplněná hodnota po překladu zmizela. */
  const ztracene = Object.keys(cz.placeholders)
    .filter(k => cz.placeholders[k] !== '' && cz.placeholders[k] != null)
    .filter(k => en.placeholders[k] == null || en.placeholders[k] === '');
  test('překlad neztratil žádný vyplněný placeholder', ztracene.length === 0, ztracene.join(','));

  /* #350: odstavec se symbolem {{…}} se přeloží, když ho slovník zná celý
   * a překlad nese tytéž symboly; jinak zůstane a vypíše se zvlášť. */
  {
    P.prekladNastav('Cena díla činí {{CENA}} bez DPH.', 'en', 'The contract price is {{CENA}} excl. VAT.');
    P.prekladNastav('Záloha {{ZALOHA}} se platí předem.', 'en', 'The advance is paid beforehand.');   // ztratil symbol
    const odst = (t) => '<w:p><w:r><w:t>' + t + '</w:t></w:r></w:p>';
    const xml = '<w:body>' + odst('Cena díla ') .replace('</w:t></w:r></w:p>', '</w:t></w:r><w:r><w:t>činí {{CENA}} bez DPH.</w:t></w:r></w:p>')
      + odst('Záloha {{ZALOHA}} se platí předem.') + odst('Neznámá věta {{X}}.') + odst('{{OBJEDNATEL}}') + '</w:body>';
    const st = { celkem: 0, prelozeno: 0, neutralni: 0, chybi: [] };
    const po = dg.docxPrelozXml(xml, 'en', st);
    test('#350: známý odstavec se symbolem se přeloží i přes dva runy', po.includes('The contract price is {{CENA}} excl. VAT.'), po);
    test('#350: překlad, který ztratil symbol, se nepoužije', po.includes('Záloha {{ZALOHA}} se platí předem.') && !po.includes('The advance'), po);
    test('#350: neznámý odstavec se symbolem zůstane a vypíše se zvlášť',
      po.includes('Neznámá věta {{X}}.') && (st.symbolove || []).includes('Neznámá věta {{X}}.'), JSON.stringify(st.symbolove));
    test('#350: odstavec jen ze symbolů se nevypisuje', !(st.symbolove || []).includes('{{OBJEDNATEL}}'));
    test('#350: do pokrytí se počítá jen přeložený odstavec se symbolem', st.celkem === 1 && st.prelozeno === 1, JSON.stringify(st));
  }

  /* PŘEKLAD PO ÚSECÍCH MEZI SYMBOLY (P3 / K14-N63, K16-N84, 25. 9. 2026).
   *
   * EN/DE/FR mutace šablony CN v12 nechávala česky 15 odstavců se symbolem
   * (PROJ v2 dvanáct): hlavičku „Číslo nabídky: {{…}}", „{{CENA_S_DPH}}
   * včetně DPH", platební podmínky. Slovník přitom popisky znal — jen ne celý
   * odstavec i se symbolem. A v šabloně dělí text a symbol TABULÁTORY
   * a ZALOMENÍ; překlad celého odstavce do prvního `<w:t>` by text přestěhoval
   * přes ně a rozbil rozvržení. Proto se překládá po úsecích mezi symboly
   * a oddělovači a každý úsek zůstává ve svém běhu. */
  {
    const r = t => '<w:r><w:t>' + t + '</w:t></w:r>';
    const rp = t => '<w:r><w:t xml:space="preserve">' + t + '</w:t></w:r>';
    const TAB = '<w:r><w:tab/></w:r>';
    const p = (...casti) => '<w:p>' + casti.join('') + '</w:p>';
    const stP = () => ({ celkem: 0, prelozeno: 0, neutralni: 0, chybi: [] });
    const poradi = (xml, ...co) => co.map(c => xml.indexOf(c)).every((x, i, a) => x >= 0 && (i === 0 || x > a[i - 1]));

    const hl = p(r('Číslo nabídky:'), TAB, TAB, r('{{CISLO_NABIDKY}}'));
    const s1 = stP(); const o1 = dg.docxPrelozXml(hl, 'en', s1);
    test('P3: popisek před tabulátory se přeloží na svém místě (EN)',
      JSON.stringify(texty(o1)) === JSON.stringify(['Tender number:', '{{CISLO_NABIDKY}}']), texty(o1));
    test('P3: tabulátory zůstanou mezi popiskem a symbolem',
      poradi(o1, 'Tender number:', '<w:tab/>', '{{CISLO_NABIDKY}}') && (o1.match(/<w:tab\/>/g) || []).length === 2, o1);
    test('P3: přeložený odstavec se symbolem se počítá do pokrytí', s1.celkem === 1 && s1.prelozeno === 1, JSON.stringify(s1));
    const oFr = dg.docxPrelozXml(p(r('Datum: {{DATUM}}')), 'fr', stP());
    test('P3: francouzská dvojtečka má před sebou mezeru', odstavecText(oFr) === 'Date : {{DATUM}}', odstavecText(oFr));

    const cena = p(r('{{CENA_S_DPH}}'), '<w:r><w:br/><w:t>včetně DPH</w:t></w:r>');
    const oC = { en: dg.docxPrelozXml(cena, 'en', stP()), de: dg.docxPrelozXml(cena, 'de', stP()),
                 fr: dg.docxPrelozXml(cena, 'fr', stP()) };
    test('P3: „včetně DPH" se přeloží (EN/DE/FR)',
      texty(oC.en)[1] === 'including VAT' && texty(oC.de)[1] === 'inkl. MwSt.' && texty(oC.fr)[1] === 'TTC',
      JSON.stringify([texty(oC.en), texty(oC.de), texty(oC.fr)]));
    test('P3: a zůstane za zalomením, ne před ním (K16-N84)', poradi(oC.en, '{{CENA_S_DPH}}', '<w:br/>', 'including VAT'), oC.en);

    const plat = p(rp('Platnost této nabídky je '), r('{{PODM_PLATNOST_NABIDKY}}'), rp(' od data uvedeného v'),
      r(' '), r('záhlaví'), r('.'));
    const oP = dg.docxPrelozXml(plat, 'en', stP());
    test('P3: věta se symbolem přes několik běhů se přeloží celá',
      odstavecText(oP) === 'This offer is valid for {{PODM_PLATNOST_NABIDKY}} from the date stated in the header.', odstavecText(oP));
    const oPde = dg.docxPrelozXml(plat, 'de', stP());
    test('P3: totéž německy', /^Dieses Angebot gilt \{\{PODM_PLATNOST_NABIDKY\}\} ab /.test(odstavecText(oPde)), odstavecText(oPde));

    const dph = p(r('DPH {{DPH_SAZBA}} % ({{DPH_NAZEV}} sazba)'));
    const dEn = odstavecText(dg.docxPrelozXml(dph, 'en', stP())), dDe = odstavecText(dg.docxPrelozXml(dph, 'de', stP()));
    test('P3: řádek DPH se sazbou se přeloží celý (bez „Regelsatz Satz")',
      dEn === 'VAT {{DPH_SAZBA}} % ({{DPH_NAZEV}} rate)' && dDe === 'MwSt. {{DPH_SAZBA}} % ({{DPH_NAZEV}})', [dEn, dDe]);

    const mesic = p(rp('     {{PROJ_CENA_AD}} / měsíc'));
    const mEn = odstavecText(dg.docxPrelozXml(mesic, 'en', stP()));
    test('P3: jednotka za symbolem („/ měsíc") se přeloží a oddělovač zůstane', mEn === '     {{PROJ_CENA_AD}} / month', mEn);
    const dni = odstavecText(dg.docxPrelozXml(p(r('{{PODM_SPLATNOST_DNI_CISLO}} dní')), 'en', stP()));
    test('P3: „{{…}} dní" → „days"', dni === '{{PODM_SPLATNOST_DNI_CISLO}} days', dni);

    const sleva = p(r('− {{SLEVA_KC}} ({{SLEVA_PROC}} %)'));
    const sS = stP(); const oS = dg.docxPrelozXml(sleva, 'en', sS);
    test('P3: odstavec jen se symboly a znaménky se nemění a nehlásí jako nepřeložený',
      oS === sleva && !(sS.symbolove || []).length, JSON.stringify(sS));

    const nezn = p(r('Neznámý štítek:'), TAB, r('{{X}}'));
    const sN = stP(); const oN = dg.docxPrelozXml(nezn, 'en', sN);
    test('P3: neznámý úsek nechá celý odstavec česky (žádná půlka v cizím jazyce)', oN === nezn, oN);
    test('P3: a odstavec se vypíše mezi nepřeloženými', (sN.symbolove || []).includes('Neznámý štítek:{{X}}'), JSON.stringify(sN.symbolove));

    /* Odstavec, který slovník zná celý, ale text a symbol dělí tabulátor:
     * celý překlad do prvního běhu by text přestěhoval přes tabulátor. */
    P.prekladNastav('Zkušební popisek:{{X}}', 'en', 'Test label:{{X}}');
    P.prekladNastav('Zkušební popisek', 'en', 'Test label');
    const tabCelek = p(r('Zkušební popisek:'), TAB, r('{{X}}'));
    const oT = dg.docxPrelozXml(tabCelek, 'en', stP());
    test('P3: celý odstavec přes tabulátor se nepřestěhuje — přeloží se po úsecích',
      poradi(oT, 'Test label:', '<w:tab/>', '{{X}}') && texty(oT).length === 2, oT);
    P.prekladSmaz('Zkušební popisek:{{X}}'); P.prekladSmaz('Zkušební popisek');
  }

  console.log(fail ? `\n${fail} CHYB (${ok} OK)` : `\nVŠECHNY TESTY DOCX-PŘEKLAD OK (${ok})`);
  process.exit(fail ? 1 : 0);
})();
