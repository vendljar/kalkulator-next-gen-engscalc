/* SB (21. 11. 2026, rozhodnutí J. V., nález NPT-N4) — CN v18 EN/DE/FR:
 * popisky „IČ:" a „Tel.:" v podpisovém bloku Kancelář.
 *
 * Jazykové šablony CN v17 mají v bloku Kancelář pevný český text „IČ: …"
 * a „Tel.: …", kdežto náhled (src/nahled_word.js, NW_TEXT.kIco/kTel přes
 * nwPreloz) je překládá. Nástroj --cn-v18 je v EN/DE/FR přeloží stejně —
 * ze slovníku aplikace, ne natvrdo (cnV18Kancelar / cnV18Soubor(…, L)).
 * Česká šablona se nemění, řádek SVĚTLÍKY se nepřidává.
 *
 * Firma je smyšlená (IČ 000 00 000, telefon samé nuly).
 * Pojistka: nad origin/claude/integrace-16-10 (bez SB) sada selže hned
 * na exportu cnV18Kancelar; po změně projde.
 * Spuštění: node src/test_sb_kancelar.js */
'use strict';
const path = require('path');
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
nacti('./format.js');
const PR = nacti('./preklad.js');
const DG = nacti('./docxgen.js');
const NW = require('./nahled_word.js');
let VS = null;
try { VS = require(path.join(__dirname, '..', 'nastroje', 'vyrob_sablony.js')); } catch (e) { VS = null; }

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 800)); } };
const chybaZ = async fn => { try { await fn(); return ''; } catch (e) { return e.message; } };
test('vyrob_sablony exportuje cnV18Kancelar a cnV18KancelarPopisky',
  !!(VS && typeof VS.cnV18Kancelar === 'function' && typeof VS.cnV18KancelarPopisky === 'function'));
if (fail) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }

const enc = new TextEncoder(), dec = new TextDecoder();
const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
  + 'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const RPR = '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/></w:rPr>';
const odst = (t, id) => `<w:p w14:paraId="${id || '0000000A'}"><w:pPr><w:pStyle w:val="Bezmezer"/></w:pPr><w:r>${RPR}<w:t>${t}</w:t></w:r></w:p>`;
const PRAZDNY = '<w:p><w:pPr><w:pStyle w:val="Bezmezer"/></w:pPr></w:p>';
/* tělo jazykové CN v17: Vypracoval (tel. zpracovatele přeložený) + Kancelář s pevným „IČ:" a „Tel.:" */
const telo = (nadpis, radky) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>`
  + odst('Tel.: {{ZPRAC_TEL}}') + PRAZDNY + odst(nadpis)
  + radky.join('') + `<w:p><w:hyperlink r:id="rId9"><w:r>${RPR}<w:t>www.zkusebni-firma.example</w:t></w:r></w:hyperlink></w:p>`
  + PRAZDNY + odst('IČ: mimo blok — nemění se') + '<w:sectPr/></w:body></w:document>';
const RADKY = [odst('Zkušební firma s.r.o.'), odst('Ulice 1'), odst('100 00  Město'),
  odst('IČ: 000 00 000', '1111111A'), odst('Tel.: +420 000 000 000', '2222222A')];
const NADPIS = { en: 'Office:', de: 'Büro:', fr: 'Bureau :' };
const OCEK = {   // to, co dnes ukazuje náhled (nwPreloz NW_TEXT.kIco / kTel)
  en: ['Company ID (IČ): 000 00 000', 'Phone: +420 000 000 000'],
  de: ['Identifikationsnummer (IČ): 000 00 000', 'Tel.: +420 000 000 000'],
  fr: ['Numéro d’identification (IČ) : 000 00 000', 'Tél. : +420 000 000 000'],
};
const texty = xml => (xml.match(/<w:p\b(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/g) || [])
  .map(p => (p.match(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join(''));

(async () => {
  /* ---------- A) popisky = náhled = slovník ---------- */
  for (const L of ['en', 'de', 'fr']) {
    const P = VS.cnV18KancelarPopisky(L);
    const nahled = k => NW.nwPreloz(NW.NW_TEXT[k], L).split('{{')[0].trim();
    test('A ' + L + ': popisky ze slovníku jako náhled (' + P.popisky.map(p => p.cil).join(' / ') + ')',
      P.nadpis === NADPIS[L] && P.popisky[0].cil === nahled('kIco') && P.popisky[1].cil === nahled('kTel')
      && P.popisky[0].cil + ' 000 00 000' === OCEK[L][0], P);
  }
  /* ---------- B) cnV18Kancelar nad tělem ---------- */
  for (const L of ['en', 'de', 'fr']) {
    const vstup = telo(NADPIS[L], RADKY);
    let r = null;
    const ch = await chybaZ(async () => { r = VS.cnV18Kancelar(vstup, L); });
    const t = r ? texty(r.xml) : [];
    test('B ' + L + ': IČ a Tel. v bloku Kancelář přeložené', !ch && t.indexOf(OCEK[L][0]) >= 0 && t.indexOf(OCEK[L][1]) >= 0, ch || t);
    test('B ' + L + ': mimo blok Kancelář beze změny (řádek „IČ:" za blokem, Tel. zpracovatele)',
      r && t.indexOf('IČ: mimo blok — nemění se') >= 0 && t[0] === 'Tel.: {{ZPRAC_TEL}}');
    test('B ' + L + ': změní se jen dva odstavce, rPr a paraId zůstanou', r && (() => {
      const a = vstup.split('</w:p>'), b = r.xml.split('</w:p>');
      const jine = a.map((x, i) => i).filter(i => a[i] !== b[i]);
      const max = L === 'de' ? 1 : 2;   // DE „Tel.:" = „Tel.:"
      return a.length === b.length && jine.length === max && jine.every(i => b[i].indexOf(RPR) > 0 && /w14:paraId="(1111111A|2222222A)"/.test(b[i]));
    })());
    test('B ' + L + ': řádek SVĚTLÍKY se nepřidává', r && !/SVĚTLÍK|SKYLIGHT|LICHTKUPPEL|PUITS/i.test(r.xml));
  }
  test('B cz: česká šablona beze změny', VS.cnV18Kancelar(telo('Kancelář:', RADKY), 'cz').xml === telo('Kancelář:', RADKY));
  test('B podruhé odmítne (popisek už přeložený)',
    /už je/.test(await chybaZ(async () => VS.cnV18Kancelar(VS.cnV18Kancelar(telo('Office:', RADKY), 'en').xml, 'en'))));
  test('B bez nadpisu Kancelář v jazyce souboru odmítne', /nadpis bloku/.test(await chybaZ(async () => VS.cnV18Kancelar(telo('Kancelář:', RADKY), 'en'))));
  test('B dva řádky „IČ:" v bloku odmítne', /právě jeden řádek/.test(await chybaZ(async () =>
    VS.cnV18Kancelar(telo('Office:', RADKY.concat(odst('IČ: 111 11 111'))), 'en'))));
  test('B popisek rozdělený mezi běhy odmítne', /rozdělený mezi běhy/.test(await chybaZ(async () =>
    VS.cnV18Kancelar(telo('Office:', [RADKY[0], `<w:p><w:r>${RPR}<w:t>I</w:t></w:r><w:r>${RPR}<w:t>Č: 000 00 000</w:t></w:r></w:p>`, RADKY[4]]), 'en'))));

  /* ---------- C) celý soubor: PAGE + Kancelář, XML bez vad ---------- */
  const txbx = '<w:txbxContent><w:p><w:r>' + RPR + '<w:t>1</w:t></w:r></w:p></w:txbxContent>';
  const HDR = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${NS}><w:p><w:r><mc:AlternateContent><mc:Choice Requires="wps">`
    + `<w:drawing><wps:wsp><wps:txbx>${txbx}</wps:txbx></wps:wsp></w:drawing></mc:Choice></mc:AlternateContent></w:r></w:p></w:hdr>`;
  const balik = async doc => new Uint8Array(await (await DG.zipZapis([
    { nazev: 'word/document.xml', data: enc.encode(doc) }, { nazev: 'word/header1.xml', data: enc.encode(HDR) },
  ])).arrayBuffer());
  const dil = async (b, n) => dec.decode((await DG.zipPrecti(b)).find(p => p.nazev === n).data);
  for (const L of ['cz', 'en']) {
    const doc = telo(L === 'cz' ? 'Kancelář:' : 'Office:', RADKY);
    let r = null;
    const ch = await chybaZ(async () => { r = await VS.cnV18Soubor(await balik(doc), 'v17 ' + L, L); });
    const d = r ? await dil(r.bajty, 'word/document.xml') : '';
    test('C ' + L + ': pole PAGE 1× a ' + (L === 'cz' ? 'tělo beze změny' : 'IČ/Tel. přeložené'), !ch && r.pocet === 1
      && (L === 'cz' ? d === doc && r.kancelar.length === 0 : texty(d).indexOf(OCEK.en[0]) >= 0 && r.kancelar.length === 2)
      && (await DG.docxXmlVady(r.bajty.slice().buffer)).length === 0, ch || (r && r.kancelar));
  }
  test('C bez jazyka (dřívější volání) tělo nemění', await (async () => {
    const doc = telo('Office:', RADKY);
    const r = await VS.cnV18Soubor(await balik(doc), 'v17');
    return (await dil(r.bajty, 'word/document.xml')) === doc;
  })());
  test('preklad.js zná „IČ:" (zdroj popisku)', !!PR.tr && /Company ID/.test(PR.tr('IČ:', 'en')));

  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
