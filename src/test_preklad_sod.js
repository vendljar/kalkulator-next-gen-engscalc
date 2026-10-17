/* NÁSTROJ PŘEKLADU ŠABLON SoD (#157, nastroje/preklad_sod.js, 17. 10. 2026).
 *
 * Anglické šablony smluv o dílo vznikají z českých přeskládáním odstavců
 * podle slovníku mimo repozitář. Hlídá se na SMYŠLENÉM odstavci (žádný
 * firemní text):
 *   – kostra zapíše odstavec se značkami stylů (<s1>…</s1>) a tabulátory,
 *   – překlad zachová vlastnosti odstavce (odrážku), písmo tučného úseku
 *     i symbolu (zvýraznění), tabulátor a symbol {{…}} beze změny,
 *   – odstavec bez překladu se vrátí jako chybějící a zůstane česky,
 *   – překlad s jiným symbolem nebo bez tabulátoru se odmítne,
 *   – celá šablona: kontrola vrátí problém u nepřeloženého odstavce
 *     a projde u úplného překladu (jazyk en, symboly sedí, XML bez vad).
 * Před vznikem nástroje sada selže (modul chybí): 0 prošlo / 1 selhalo;
 * s nástrojem 12 / 0.
 *
 * Spuštění: cd src && node test_preklad_sod.js */
const path = require('path');
const dg = require('./docxgen.js');
let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info.slice(0, 600) : JSON.stringify(info))); } };
let ps = null;
try { ps = require(path.join(__dirname, '..', 'nastroje', 'preklad_sod.js')); } catch (e) { test('nástroj nastroje/preklad_sod.js existuje', false, e.message); }

const B = '<w:rPr><w:b/><w:sz w:val="20"/></w:rPr>', N = '<w:rPr><w:sz w:val="20"/></w:rPr>', H = '<w:rPr><w:highlight w:val="yellow"/></w:rPr>';
const r = (rPr, t) => '<w:r>' + rPr + '<w:t xml:space="preserve">' + t + '</w:t></w:r>';
const pPr = '<w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="7"/></w:numPr></w:pPr>';
const odstavec1 = '<w:p w14:paraId="1">' + pPr + r(N, 'Cena díla je ') + '<w:proofErr w:type="spellStart"/>' + r(B, 'pevná') + r(N, ' a činí ')
  + r(H, '{{CENA_BEZ_DPH}}') + '<w:r>' + N + '<w:tab/></w:r>' + r(N, 'bez DPH.') + '</w:p>';
const odstavec2 = '<w:p>' + r(N, 'Zhotovitel:') + '</w:p>';
const doc = (telo) => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
  + telo + '</w:body></w:document>';

if (ps) {
  const xml = doc(odstavec1 + odstavec2);
  const kostra = ps.odstavceKPrekladu(xml);
  test('kostra: dva odstavce k překladu', kostra.length === 2, kostra);
  test('kostra: tučný úsek ve značce, tabulátor a symbol beze změny',
    kostra[0] && kostra[0].cz === 'Cena díla je <s1>pevná</s1> a činí {{CENA_BEZ_DPH}}\tbez DPH.', kostra[0] && kostra[0].cz);
  const slovnik = new Map([[ps.normKlic(kostra[0].cz), { en: 'The price of the Work is <s1>fixed</s1> and amounts to {{CENA_BEZ_DPH}}\texcluding VAT.' }]]);
  const v = ps.prelozXml(xml, slovnik);
  test('překlad: jeden odstavec přeložen, druhý chybí', v.prelozeno === 1 && v.chybi.length === 1 && v.chybi[0] === 'Zhotovitel:', v);
  test('překlad: odrážka (w:pPr) i otevírací značka odstavce zůstaly', v.xml.indexOf('<w:p w14:paraId="1">' + pPr) >= 0, v.xml);
  test('překlad: tučný úsek má písmo tučného běhu', v.xml.indexOf(r(B, 'fixed')) >= 0, v.xml);
  test('překlad: symbol si nese zvýraznění, tabulátor zůstal', v.xml.indexOf('<w:r>' + H + '<w:t xml:space="preserve">{{CENA_BEZ_DPH}}</w:t></w:r>') >= 0
    && /<w:tab\/><w:t xml:space="preserve">excluding VAT\.<\/w:t>/.test(v.xml), v.xml);
  test('překlad: kontrola pravopisu (proofErr) z přeskládaného odstavce zmizela', v.xml.indexOf('proofErr') < 0, v.xml);
  test('překlad: platné XML', !dg.xmlStrukturaVada(v.xml), dg.xmlStrukturaVada(v.xml));
  const spatne = ps.prelozXml(xml, new Map([[ps.normKlic(kostra[0].cz), { en: 'The price is {{CENA_S_DPH}}\tincl.' }]]));
  test('jiný symbol: odstavec se odmítne', spatne.prelozeno === 0 && /symboly nesouhlasí/.test(spatne.vady.join()), spatne.vady);
  const bezTab = ps.prelozXml(xml, new Map([[ps.normKlic(kostra[0].cz), { en: 'The price is {{CENA_BEZ_DPH}} excl. VAT.' }]]));
  test('chybí tabulátor: odstavec se odmítne', bezTab.prelozeno === 0 && /tabulátory/.test(bezTab.vady.join()), bezTab.vady);

  (async () => {
    const enc = new TextEncoder();
    const bajty = new Uint8Array(await (await dg.zipZapis([{ nazev: 'word/document.xml', data: enc.encode(xml) }])).arrayBuffer());
    const zaznamy = [{ cz: kostra[0].cz, en: 'The price of the Work is <s1>fixed</s1> and amounts to {{CENA_BEZ_DPH}}\texcluding VAT.' }];
    const neuplny = await ps.prelozSablonu(bajty, zaznamy);
    test('šablona s nepřeloženým odstavcem: kontrola hlásí problém', neuplny.problemy.some(t => /nepřeloženo/.test(t)), neuplny.problemy);
    zaznamy.push({ cz: 'Zhotovitel:', en: 'Contractor:', pozn: 'Zhotovitel = Contractor' });
    const uplny = await ps.prelozSablonu(bajty, zaznamy);
    test('úplný překlad: bez problémů, jazyk en, poznámka pro rodilého mluvčího', uplny.problemy.length === 0 && uplny.jazyk.jazyk === 'en' && uplny.pozn.length === 1, uplny.problemy);
    console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
    process.exit(fail ? 1 : 0);
  })();
} else {
  console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
  process.exit(1);
}
