/* ŠABLONA SoD REALIZACE v4 — OBJEDNANÉ PŘÍPLATKY V ČLÁNKU O CENĚ DÍLA
 * (nastroje/vyrob_sablony.js --sod-real-v4, Controlling C6 #447, 21. 10. 2026).
 *
 * Na SMYŠLENÉM úryvku článku V (žádný firemní text) se hlídá:
 *   – za odrážku „{{CENA_BEZ_DPH}} (bez DPH)" přibudou TŘI SAMOSTATNÉ
 *     odstavce (ne buňky tabulky) s popiskem a symbolem v témže odstavci:
 *     cena dle nabídky {{SOD_CENA_NABIDKY}}, seznam {{SOD_PRIPLATKY_OBJEDNANE}}
 *     a součet {{SOD_PRIPLATKY_KC}}; písmo běhu jako u ceny, bez odrážky
 *     (číslování článku se neposune), symbol v jednom běhu,
 *   – symboly přibudou přesně tři, žádný neubude, XML bez vad,
 *   – kotva dvakrát / vůbec, nebo šablona už v4 = chyba (nic se nehádá),
 *   – vyplnění jako aplikace: bez objednaných příplatků (odstavcePryc) zmizí
 *     všechny tři odstavce celé (žádný prázdný odstavec, text jako v3);
 *     s příplatky zůstanou, seznam se zalomí uvnitř odstavce,
 *   – překlad nových odstavců (SOD_REAL_V4_PREKLAD) do EN/DE/FR přes
 *     nastroje/preklad_sod.js: stejné symboly, žádná česká diakritika,
 *   – jazyková v3 (revidovaná na Disku): blok se vloží přeložený za kotvu v jazyce.
 * Před vznikem sodRealV4: 0 prošlo / 1 selhalo; po něm 18 / 0.
 *
 * Spuštění: cd src && node test_sod_real_v4.js */
const path = require('path');
const dg = require('./docxgen.js');
let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info.slice(0, 600) : JSON.stringify(info))); } };
let VS = null, PS = null;
try { VS = require(path.join(__dirname, '..', 'nastroje', 'vyrob_sablony.js')); } catch (e) { VS = null; }
try { PS = require(path.join(__dirname, '..', 'nastroje', 'preklad_sod.js')); } catch (e) { PS = null; }
test('nastroje/vyrob_sablony.js exportuje sodRealV4 a SOD_REAL_V4_PREKLAD', !!(VS && typeof VS.sodRealV4 === 'function' && Array.isArray(VS.SOD_REAL_V4_PREKLAD)));
if (fail) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }

(async () => {
  const rPr = '<w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/><w:sz w:val="22"/></w:rPr>';
  const r = t => '<w:r>' + rPr + '<w:t xml:space="preserve">' + t + '</w:t></w:r>';
  const pPr1 = '<w:pPr><w:pStyle w:val="Normlnweb"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="8"/></w:numPr><w:jc w:val="both"/></w:pPr>';
  const pPr2 = '<w:pPr><w:pStyle w:val="Normlnweb"/><w:numPr><w:ilvl w:val="1"/><w:numId w:val="8"/></w:numPr>'
    + '<w:tabs><w:tab w:val="clear" w:pos="14688"/><w:tab w:val="num" w:pos="1080"/></w:tabs><w:ind w:left="0" w:right="340" w:firstLine="993"/><w:jc w:val="both"/></w:pPr>';
  const uvod = '<w:p>' + pPr1 + r('Objednatel se zavazuje zaplatit zhotoviteli za provedení díla dohodnutou cenu (smyšlený text), a to ve výši ') + '</w:p>';
  const cena = '<w:p>' + pPr2 + '<w:proofErr w:type="gramStart"/>' + r('{{CENA_BEZ_DPH}} (bez DPH)') + r('') + '</w:p>';
  const rezim = '<w:p>' + pPr1 + r('{{SOD_DPH_REZIM}}') + '</w:p>';
  const priloha = '<w:p>' + r('příloha č. 1 – nabídka {{CISLO_NABIDKY}}') + '</w:p>';
  const doc = telo => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
    + telo + '<w:sectPr/></w:body></w:document>';
  const vstup = doc(uvod + cena + rezim + priloha);
  let vys = '', chybaV = '';
  const zaznam = [];
  try { vys = VS.sodRealV4(vstup, zaznam); } catch (e) { chybaV = e.message; }
  const spany = dg.odstavcoveSpany(vys);
  const texty = spany.map(sp => dg.odstavecText(vys.slice(sp.zac, sp.kon)));
  test('úprava proběhla, záznam o vložení', !chybaV && zaznam.length === 1, chybaV || zaznam);
  test('pořadí: úvod, cena, 3 nové odstavce, režim DPH', texty.length === 7 && texty[1] === '{{CENA_BEZ_DPH}} (bez DPH)'
    && /\{\{SOD_CENA_NABIDKY\}\}/.test(texty[2]) && /\{\{SOD_PRIPLATKY_OBJEDNANE\}\}/.test(texty[3])
    && /\{\{SOD_PRIPLATKY_KC\}\}/.test(texty[4]) && texty[5] === '{{SOD_DPH_REZIM}}', texty);
  const nove = spany.slice(2, 5).map(sp => vys.slice(sp.zac, sp.kon));
  test('nové odstavce: bez odrážky, styl a zarovnání jako cena, písmo běhu ceny',
    nove.every(p => !/<w:numPr>/.test(p) && /<w:pStyle w:val="Normlnweb"\/>/.test(p) && /<w:jc w:val="both"\/>/.test(p) && p.indexOf(rPr) >= 0), nove);
  test('každý symbol v jednom běhu', ['SOD_CENA_NABIDKY', 'SOD_PRIPLATKY_OBJEDNANE', 'SOD_PRIPLATKY_KC', 'CISLO_NABIDKY']
    .every(k => vys.indexOf('{{' + k + '}}</w:t>') >= 0 || new RegExp('>[^<]*\\{\\{' + k + '\\}\\}[^<]*</w:t>').test(vys)));
  test('seznam příplatků začíná na novém řádku pod popiskem', /<w:br\/><w:t xml:space="preserve">\{\{SOD_PRIPLATKY_OBJEDNANE\}\}/.test(nove[1]), nove[1]);
  const sym = s => dg.klicePlaceholderu(s);
  const rozdil = sym(vys).filter(k => sym(vstup).indexOf(k) < 0).sort();
  test('přibyly přesně tři symboly, žádný neubyl', rozdil.join() === 'SOD_CENA_NABIDKY,SOD_PRIPLATKY_KC,SOD_PRIPLATKY_OBJEDNANE'
    && sym(vstup).every(k => sym(vys).indexOf(k) >= 0), rozdil);
  test('žádný nový odstavec v buňce tabulky', !/<w:tc[\s>]/.test(vys));

  const hazi = x => { try { VS.sodRealV4(x, []); return ''; } catch (e) { return e.message; } };
  test('kotva dvakrát = chyba', /právě jeden/.test(hazi(doc(uvod + cena + cena + rezim))));
  test('kotva chybí = chyba', /právě jeden/.test(hazi(doc(uvod + rezim))));
  test('šablona už v4 = chyba', /už/.test(hazi(vys)));

  /* jazyková v3 (revidované znění z Disku): kotva v jazyce dokumentu, vloží se překlad */
  const vstupEn = doc(uvod.replace(/Objednatel[^<]*/, 'The Client undertakes to pay the agreed price (fictitious text), in the amount of ')
    + cena.replace('(bez DPH)', '(excl. VAT)') + rezim + priloha);
  let vysEn = '', chybaEn = '';
  try { vysEn = VS.sodRealV4(vstupEn, [], 'en'); } catch (e) { chybaEn = e.message; }
  const tEn = dg.odstavcoveSpany(vysEn).map(sp => dg.odstavecText(vysEn.slice(sp.zac, sp.kon)));
  test('jazyková v3 (en): za „{{CENA_BEZ_DPH}} (excl. VAT)" tři anglické odstavce, bez češtiny', !chybaEn && tEn.length === 7
    && /^of which the price of the Work/.test(tEn[2]) && /^ordered surcharges:/.test(tEn[3]) && /^surcharges in total:/.test(tEn[4])
    && !tEn.slice(2, 5).some(x => /[áčďěíňóřšťúůýž]/i.test(x.replace(/\{\{[A-Z_0-9]+\}\}/g, ''))), chybaEn || tEn);
  test('jazyková v3: česká kotva v anglickém dokumentu se nehledá (cz režim = chyba)', /právě jeden/.test(hazi(vstupEn)));

  /* vyplnění jako aplikace (docxVyplnSablonu + odstavcePryc) */
  const zip = async xml => {
    const b = await dg.zipZapis([{ nazev: '[Content_Types].xml', data: new TextEncoder().encode('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>') },
      { nazev: 'word/document.xml', data: new TextEncoder().encode(xml) }]).arrayBuffer();
    return b;
  };
  const vypln = async (ph, volby) => {
    const blob = await dg.docxVyplnSablonu(await zip(vys), ph, null, null, volby);
    const pol = await dg.zipPrecti(new Uint8Array(await blob.arrayBuffer()));
    return new TextDecoder().decode(pol.find(p => p.nazev === 'word/document.xml').data);
  };
  const zaklad = { CENA_BEZ_DPH: '100 000,00 Kč', SOD_DPH_REZIM: 'DPH dle zákona.', CISLO_NABIDKY: 'CN 1' };
  const bez = await vypln(Object.assign({}, zaklad, { SOD_CENA_NABIDKY: '', SOD_PRIPLATKY_OBJEDNANE: '', SOD_PRIPLATKY_KC: '' }),
    { odstavcePryc: ['SOD_CENA_NABIDKY', 'SOD_PRIPLATKY_OBJEDNANE', 'SOD_PRIPLATKY_KC'] });
  const tBez = dg.odstavcoveSpany(bez).map(sp => dg.odstavecText(bez.slice(sp.zac, sp.kon)));
  test('bez objednaných příplatků zmizí tři odstavce celé (jako v3)', tBez.length === 4 && tBez[1] === '100 000,00 Kč (bez DPH)' && !/\{\{/.test(bez), tBez);
  test('bez příplatků nezůstane popisek „objednané příplatky" ani prázdný odstavec (popisek a seznam v TÉMŽE odstavci)',
    bez.indexOf('objednané příplatky') < 0 && bez.indexOf('z toho') < 0 && tBez.every(t => t.trim() !== ''), tBez);
  const s = await vypln(Object.assign({}, zaklad, { CENA_BEZ_DPH: '130 000,00 Kč', SOD_CENA_NABIDKY: '100 000,00 Kč',
    SOD_PRIPLATKY_OBJEDNANE: 'Příplatek A – 10 000,00 Kč\nPříplatek B – 20 000,00 Kč', SOD_PRIPLATKY_KC: '30 000,00 Kč' }), { odstavcePryc: [] });
  const tS = dg.odstavcoveSpany(s).map(sp => dg.odstavecText(s.slice(sp.zac, sp.kon)));
  test('s příplatky: tři odstavce navíc, seznam zalomený v jednom odstavci, žádný symbol',
    tS.length === 7 && /CN 1/.test(tS[2]) && /Příplatek A – 10 000,00 Kč/.test(tS[3]) && /<w:br\/>/.test(s) && !/\{\{/.test(s), tS);

  /* překlad nových odstavců */
  test('nastroje/preklad_sod.js je k dispozici', !!PS);
  if (PS) {
    const zaznamy = VS.SOD_REAL_V4_PREKLAD;
    const vady = [];
    ['en', 'de', 'fr'].forEach(L => {
      const p = PS.prelozXml(vys, new Map(zaznamy.map(z => [PS.normKlic(z.cz), z])), L, {});
      const t = dg.odstavcoveSpany(p.xml).slice(2, 5).map(sp => dg.odstavecText(p.xml.slice(sp.zac, sp.kon)));
      if (p.prelozeno !== 3 || p.vady.length) vady.push(L + ': přeloženo ' + p.prelozeno + ' ' + p.vady.join('; '));
      if (t.some(x => /[áčďěíňóřšťúůýž]/i.test(x.replace(/\{\{[A-Z_]+\}\}/g, '')))) vady.push(L + ': česky ' + t.join(' | '));
    });
    test('nové odstavce přeložené do EN/DE/FR, symboly sedí, bez češtiny', !vady.length, vady);
  }
  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL výjimka', e.message); process.exit(1); });
