/* ŠABLONA SoD REALIZACE v3 — REŽIM DPH A SKLADNÉ SYMBOLY
 * (nastroje/vyrob_sablony.js --sod-real-v3, rozhodnutí J. V. 18. 10. 2026).
 *
 * Na SMYŠLENÉM úryvku článků V a VI (žádný firemní text, smyšlená částka)
 * se hlídá:
 *   – věta o režimu DPH → {{SOD_DPH_REZIM}} (celý odstavec, číslování
 *     odstavce zůstává),
 *   – tělo odstavce „3." s prohlášením o snížené sazbě → {{SOD_DPH_PROHLASENI}},
 *     číslo „3." a tabulátor zůstávají (odkazy na „bod 4"),
 *   – částka skladného „N,- Kč" rozdělená do dvou běhů → {{SOD_SKLADNE}}
 *     v jednom běhu, „/denně" a zbytek věty zůstávají,
 *   – platné XML, kotva dvakrát nebo vůbec = chyba (nic se nehádá),
 *   – šablona v3 vyplněná aplikací dá české věty a částku jako dřív.
 * Před vznikem sodRealV3: 0 prošlo / 1 selhalo; po něm 11 / 0.
 *
 * Spuštění: cd src && node test_sod_real_v3.js */
const path = require('path');
const dg = require('./docxgen.js');
let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info.slice(0, 600) : JSON.stringify(info))); } };
let VS = null;
try { VS = require(path.join(__dirname, '..', 'nastroje', 'vyrob_sablony.js')); } catch (e) { VS = null; }
test('nastroje/vyrob_sablony.js exportuje sodRealV3', !!(VS && typeof VS.sodRealV3 === 'function'));
if (fail) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }

const r = (t, rPr) => '<w:r>' + (rPr || '') + '<w:t xml:space="preserve">' + t + '</w:t></w:r>';
const num = '<w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="8"/></w:numPr></w:pPr>';
const dph = '<w:p>' + num + r('DPH bude účtováno dle platných předpisů v režimu přenesené daňové povinnosti.') + '</w:p>';
const prohl = '<w:p>' + r('3.') + '<w:r><w:tab/></w:r>' + r('Objednatel prohlašuje, že objekt, v němž je prováděno dílo, je stavbou pro bydlení (smyšlený text) a splňuje podmínky snížené sazby DPH.') + '</w:p>';
const skl = '<w:p>' + r('Zhotovitel je oprávněn požadovat skladovacích poplatků ve výši 6') + r('00,- Kč/denně. Vyúčtují se měsíčně.', '<w:rPr><w:b/></w:rPr>') + '</w:p>';
const doc = telo => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
  + telo + '<w:sectPr/></w:body></w:document>';
const vstup = doc(dph + prohl + skl);
let vys = '', chybaV = '';
const zaznam = [];
try { vys = VS.sodRealV3(vstup, zaznam); } catch (e) { chybaV = e.message; }
const texty = (dg.odstavcoveSpany(vys).map(sp => dg.odstavecText(vys.slice(sp.zac, sp.kon))));
test('úprava proběhla, tři záznamy', !chybaV && zaznam.length === 3, chybaV || zaznam);
test('věta o režimu DPH → {{SOD_DPH_REZIM}}, odrážka zůstala', texty[0] === '{{SOD_DPH_REZIM}}' && vys.indexOf(num + '<w:r><w:t xml:space="preserve">{{SOD_DPH_REZIM}}') >= 0, texty[0]);
test('odstavec „3." + tabulátor + {{SOD_DPH_PROHLASENI}}', texty[1] === '3.{{SOD_DPH_PROHLASENI}}' && /3\.<\/w:t><\/w:r><w:r><w:tab\/><\/w:r>/.test(vys), texty[1]);
test('skladné: částka z dvou běhů → {{SOD_SKLADNE}} v jednom běhu, „/denně" zůstává',
  texty[2] === 'Zhotovitel je oprávněn požadovat skladovacích poplatků ve výši {{SOD_SKLADNE}}/denně. Vyúčtují se měsíčně.'
    && /<w:t[^>]*>[^<]*\{\{SOD_SKLADNE\}\}[^<]*<\/w:t>/.test(vys), texty[2]);
test('platné XML', !dg.xmlStrukturaVada(vys), dg.xmlStrukturaVada(vys));
const hazi = x => { try { VS.sodRealV3(x, []); return ''; } catch (e) { return e.message; } };
test('věta o DPH dvakrát → chyba', /právě jeden odstavec o režimu DPH/.test(hazi(doc(dph + dph + prohl + skl))));
test('skladné bez částky „N,- Kč" → chyba', /právě jednu částku/.test(hazi(doc(dph + prohl + '<w:p>' + r('ve výši skladovacích poplatků dle dohody.') + '</w:p>'))));
test('šablona už v3 → chyba', /už symbol/.test(hazi(vys)));
test('dvě částky ve větě o skladném → chyba', /právě jednu částku/.test(hazi(doc(dph + prohl + '<w:p>' + r('skladovacích poplatků ve výši 600,- Kč/denně, nejvýše 9 000,- Kč.') + '</w:p>'))));
(async () => {
  /* v3 vyplněná aplikací: české věty a částka „N,- Kč" jako dřív */
  const buf = await (await dg.zipZapis([{ nazev: 'word/document.xml', data: new TextEncoder().encode(vys) }])).arrayBuffer();
  const ph = { SOD_DPH_REZIM: 'Věta A.', SOD_DPH_PROHLASENI: 'Věta B.', SOD_SKLADNE: '600,- Kč' };
  const blob = await dg.docxVyplnSablonu(buf, ph);
  const t = (await dg.docxTextSablony(await blob.arrayBuffer())).join('|');
  test('vyplněná v3: „Věta A.|3.Věta B.|… ve výši 600,- Kč/denně …"', t === 'Věta A.|3.Věta B.|Zhotovitel je oprávněn požadovat skladovacích poplatků ve výši 600,- Kč/denně. Vyúčtují se měsíčně.', t);
  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})();
