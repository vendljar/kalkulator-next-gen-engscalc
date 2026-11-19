/* PG #4 (J. V. 19. 11. 2026, diagnostika testovacího sezení) — PEVNÉ ČÍSLO
 * STRÁNKY V ZÁHLAVÍ CN A ŠABLONA CN v18.
 *
 * Šablony CN OCK v9–v17 mají v záhlaví (header1.xml, textové pole
 * w:txbxContent — wps i záloha VML) číslo stránky jako pevný text „1", ne pole
 * PAGE. Generátor ho jen přenese (src/test_pg_pole_page.js), takže každá
 * vytištěná stránka má „1". Hlídá se:
 *   A) kontrola šablony (docxCisloStranky + docxCisloStrankyVarovani): pevná
 *      „1" bez pole PAGE → upozornění; pole PAGE (záhlaví nebo zápatí) → nic;
 *      výsledek pole „1" se za pevný text nepočítá; průvodce šablon ho u CN
 *      (typ nabidka) přidá mezi upozornění, ne mezi chyby;
 *   B) nástroj --cn-v18 (cnV18 / cnV18Soubor): „1" v obou textových polích →
 *      pole PAGE \* MERGEFORMAT se stejným rPr, tělo a ostatní díly beze změny,
 *      XML bez vad, upozornění zmizí; odmítne záhlaví s PAGE, „1" mimo textové
 *      pole, dvě „1" v jednom poli a šablonu bez textového pole;
 *   C) v18 projde vyplněním i překladem (EN/DE/FR) — pole zůstane celé.
 * Pojistka: nad origin/claude/integrace-16-10 docxCisloStranky ani cnV18
 * neexistují — sada selže na první kontrole; viz commit.
 * Spuštění: node src/test_pg_cislo_stranky.js */
'use strict';
const fs = require('fs');
const path = require('path');
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
nacti('./format.js');
nacti('./preklad.js');
const DG = nacti('./docxgen.js');
let VS = null;
try { VS = require(path.join(__dirname, '..', 'nastroje', 'vyrob_sablony.js')); } catch (e) { VS = null; }

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 800)); } };
const chybaZ = async fn => { try { await fn(); return ''; } catch (e) { return e.message; } };
test('docxgen exportuje docxCisloStranky a docxCisloStrankyVarovani', typeof DG.docxCisloStranky === 'function' && typeof DG.docxCisloStrankyVarovani === 'function');
test('vyrob_sablony exportuje cnV18 a cnV18Soubor', !!(VS && typeof VS.cnV18 === 'function' && typeof VS.cnV18Soubor === 'function'));
if (fail) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }

const enc = new TextEncoder(), dec = new TextDecoder();
const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
  + 'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const RPR = '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="18"/></w:rPr>';
const beh = (t, rpr) => `<w:r>${rpr == null ? RPR : rpr}<w:t>${t}</w:t></w:r>`;
const txbx = obsah => `<w:txbxContent><w:p><w:pPr><w:jc w:val="center"/></w:pPr>${obsah}</w:p></w:txbxContent>`;
/* záhlaví CN v17: logo/text + textové pole s pevnou „1" (wps + záloha VML) */
const hlavicka = (vTextu, mimo) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${NS}>`
  + `<w:p><w:r>${RPR}<w:t xml:space="preserve">ENGINEERS CZ · {{CISLO_NABIDKY}}</w:t></w:r>${mimo || ''}`
  + `<w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing><wps:wsp><wps:txbx>${txbx(vTextu)}</wps:txbx></wps:wsp></w:drawing></mc:Choice>`
  + `<mc:Fallback><w:pict><v:shape><v:textbox>${txbx(vTextu)}</v:textbox></v:shape></w:pict></mc:Fallback></mc:AlternateContent></w:r></w:p></w:hdr>`;
const ZAPATI = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${NS}><w:p>${beh('Tel. 222 333 444')}</w:p></w:ftr>`;
const ZAPATI_PAGE = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${NS}><w:p>${beh('Strana ')}<w:r><w:fldChar w:fldCharType="begin"/></w:r>`
  + '<w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>' + beh('1')
  + '<w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>';
const DOKUMENT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>`
  + '<w:p><w:r><w:t xml:space="preserve">Cenová nabídka</w:t></w:r></w:p><w:p><w:r><w:t xml:space="preserve">Objednatel: {{OBJEDNATEL}}</w:t></w:r></w:p>'
  + '<w:p><w:r><w:t>1</w:t></w:r></w:p>'   // „1" v těle (číslo kapitoly) se neřeší
  + '<w:sectPr/></w:body></w:document>';
const balik = async (hdr, ftr) => new Uint8Array(await (await DG.zipZapis([
  { nazev: 'word/document.xml', data: enc.encode(DOKUMENT) },
  { nazev: 'word/header1.xml', data: enc.encode(hdr) },
  { nazev: 'word/footer1.xml', data: enc.encode(ftr || ZAPATI) },
  { nazev: 'word/styles.xml', data: enc.encode(`<?xml version="1.0"?><w:styles ${NS}/>`) },
])).arrayBuffer());
const dil = async (b, n) => dec.decode((await DG.zipPrecti(b)).find(p => p.nazev === n).data);
const varovani = async b => DG.docxCisloStrankyVarovani(await DG.docxCisloStranky(b.slice().buffer));
const sled = xml => (xml.match(/<w:fldChar\b[^>]*w:fldCharType="(\w+)"[^>]*\/>|<w:instrText\b[^>]*>[^<]*<\/w:instrText>/g) || [])
  .map(x => /fldChar/.test(x) ? x.match(/"(\w+)"\/>/)[1] : 'kód:' + x.replace(/<[^>]+>/g, '').trim());

(async () => {
  const v17 = await balik(hlavicka(beh('1')));
  /* ---------- A) kontrola šablony ---------- */
  {
    const c = await DG.docxCisloStranky(v17.slice().buffer);
    test('A v17: žádné pole PAGE, pevná „1" v záhlaví (wps i VML)', c.pole === false && JSON.stringify(c.pevne) === '["1","1"]', c);
    const v = await varovani(v17);
    test('A v17: upozornění „číslo stránky je pevný text" s radou', /Číslo stránky je pevný text/.test(v) && /--cn-v18/.test(v), v);
    test('A pole PAGE v zápatí → bez upozornění', (await varovani(await balik(hlavicka(beh('1')), ZAPATI_PAGE))) === '');
    test('A záhlaví bez číslic → bez upozornění', (await varovani(await balik(hlavicka(beh('strana'))))) === '');
    test('A „1" jako výsledek pole PAGE v záhlaví se za pevný text nepočítá',
      JSON.stringify((await DG.docxCisloStranky((await balik(hlavicka(beh('x')), ZAPATI_PAGE)).slice().buffer)).pevne) === '[]');
    const ui = fs.readFileSync(path.join(__dirname, 'ui', 'sablony_sprava_ui.js'), 'utf8');
    const kontrola = ui.slice(ui.indexOf('async function sablKontrolaSouboru'), ui.indexOf('\n}\n', ui.indexOf('async function sablKontrolaSouboru')));
    test('A průvodce šablon: u CN (typ nabidka) jde výsledek mezi upozornění, ne mezi chyby',
      /typ === 'nabidka' && typeof docxCisloStranky === 'function'/.test(kontrola) && /if \(v\) out\.varovani\.push\(v\)/.test(kontrola)
      && !/docxCisloStranky[\s\S]{0,200}out\.chyby/.test(kontrola));
    test('A průvodce předává typ i u české verze', /sablKontrolaSouboru\(soubor\.data, 'cz', vzor, d\.typ\)/.test(ui));
  }
  /* ---------- B) nástroj --cn-v18 ---------- */
  let v18 = null;
  {
    const ch = await chybaZ(async () => { v18 = await VS.cnV18Soubor(v17, 'v17'); });
    test('B v18 vznikne, pole PAGE 2× (wps + VML)', !ch && v18.pocet === 2, ch || v18.pocet);
    const h = await dil(v18.bajty, 'word/header1.xml');
    test('B záhlaví: dvakrát begin → PAGE \\* MERGEFORMAT → separate → end',
      JSON.stringify(sled(h)) === JSON.stringify(Array(2).fill(['begin', 'kód:PAGE \\* MERGEFORMAT', 'separate', 'end']).flat()), sled(h));
    const runy = h.match(/<w:r>(?:(?!<\/w:r>)[\s\S])*?<w:(?:fldChar|instrText)[\s\S]*?<\/w:r>/g) || [];
    test('B každý běh pole nese rPr původního běhu (písmo, barva, velikost)', runy.length === 8 && runy.every(r => r.indexOf(RPR) >= 0)
      && (h.match(new RegExp(RPR.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '<w:t>1</w:t>', 'g')) || []).length === 2, runy.length);
    test('B výsledek pole „1" stojí mezi separate a end', /fldCharType="separate"\/><\/w:r><w:r><w:rPr>[\s\S]*?<\/w:rPr><w:t>1<\/w:t><\/w:r><w:r><w:rPr>[\s\S]*?<\/w:rPr><w:fldChar w:fldCharType="end"/.test(h));
    test('B mimo běh „1" je záhlaví beze změny', h.replace(/<w:r><w:rPr>(?:(?!<\/w:rPr>)[\s\S])*<\/w:rPr><w:fldChar w:fldCharType="begin"\/>[\s\S]*?w:fldCharType="end"\/><\/w:r>/g, beh('1'))
      === await dil(v17, 'word/header1.xml'));
    test('B tělo, zápatí a styly beze změny', (await dil(v18.bajty, 'word/document.xml')) === DOKUMENT
      && (await dil(v18.bajty, 'word/footer1.xml')) === ZAPATI && (await dil(v18.bajty, 'word/styles.xml')) === await dil(v17, 'word/styles.xml'));
    test('B XML bez vad, upozornění zmizí', (await DG.docxXmlVady(v18.bajty.slice().buffer)).length === 0 && (await varovani(v18.bajty)) === '');
    test('B podruhé odmítne (záhlaví už PAGE má)', /už pole PAGE má/.test(await chybaZ(() => VS.cnV18Soubor(v18.bajty, 'v18'))));
    test('B „1" mimo textové pole odmítne', /mimo textové pole/.test(await chybaZ(async () => VS.cnV18Soubor(await balik(hlavicka(beh('1'), beh('1'))), 'x'))));
    test('B dvě „1" v jednom textovém poli odmítne', /v jednom textovém poli/.test(await chybaZ(async () => VS.cnV18Soubor(await balik(hlavicka(beh('1') + beh('1'))), 'x'))));
    test('B bez pevné „1" odmítne (nic nehádá)', /nic nehádám/.test(await chybaZ(async () => VS.cnV18Soubor(await balik(hlavicka(beh('2'))), 'x'))));
  }
  /* ---------- C) v18 vyplněním a překladem ---------- */
  {
    const ph = { CISLO_NABIDKY: '2026-OPR-CN-9705', OBJEDNATEL: 'Zákazník a.s.' };
    const ocek = JSON.stringify(sled(await dil(v18.bajty, 'word/header1.xml')));
    const vyp = new Uint8Array(await (await DG.docxVyplnSablonu(v18.bajty.slice().buffer, ph, [], {}, {})).arrayBuffer());
    const h = await dil(vyp, 'word/header1.xml');
    test('C vyplnění: pole PAGE celé, symbol v záhlaví dosazený', JSON.stringify(sled(h)) === ocek && h.indexOf('2026-OPR-CN-9705') > 0 && (await varovani(vyp)) === '');
    for (const L of ['en', 'de', 'fr']) {
      const pr = new Uint8Array(await (await DG.docxPrelozSablonu(v18.bajty.slice().buffer, L, {})).arrayBuffer());
      const vp = new Uint8Array(await (await DG.docxVyplnSablonu(pr.slice().buffer, ph, [], {}, {})).arrayBuffer());
      test('C překlad ' + L + ' + vyplnění: pole PAGE celé, XML bez vad', JSON.stringify(sled(await dil(vp, 'word/header1.xml'))) === ocek
        && (await DG.docxXmlVady(vp.slice().buffer)).length === 0);
    }
  }
  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
