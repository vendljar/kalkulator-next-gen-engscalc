/* SLOVNÍK PŘEKLADU SoD Z REVIDOVANÉHO ZNĚNÍ — TEST KRUHEM (D4, 22. 10. 2026)
 *
 * J. V. 21. 10. 2026: revidované jazykové šablony SoD (EN/DE/FR na Disku) jsou
 * závazné znění; slovníky nastroje/preklad_sod.js je mají reprodukovat přesně.
 * Kruh: CZ → (slovník) → jazyková šablona → porovnání s revizí; slovník
 * z revize (slovnikZRevize) → znovu → 0 rozdílů. Vše na SMYŠLENÉM vzorku
 * (žádný firemní text šablon): značky stylů, úsek bez písmen v jiném písmu
 * (tabulátory), w:lang cs-CZ → en-GB, pojmenované místo, w:keepNext prázdných
 * řádků podpisu (blok „drzetSpolu"), název dokumentu, jazyk ve stylech a
 * nastavení, w:rsid* u běhů, sloučení běhů stejného písma.
 * Pojistka: proti nástroji 4c127f5 (před D4) sada selže — slovnikZRevize
 * a porovnejSRevizi chybí: 0 prošlo / 1 selhalo; po D4 29 / 0 (zápis \u00a0 — proti ad78da2 28 / 1).
 *
 * Spuštění: cd src && node test_sod_slovnik_revize.js */
const path = require('path');
const dg = require('./docxgen.js');
let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info.slice(0, 600) : JSON.stringify(info).slice(0, 600))); } };
let ps = null;
try { ps = require(path.join(__dirname, '..', 'nastroje', 'preklad_sod.js')); } catch (e) { /* níže */ }
if (!ps || typeof ps.slovnikZRevize !== 'function' || typeof ps.porovnejSRevizi !== 'function') {
  test('nástroj umí slovník z revize (slovnikZRevize, porovnejSRevizi)', false, ps ? Object.keys(ps) : 'modul chybí');
  console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo'); process.exit(1);
}

const enc = new TextEncoder(), dec = new TextDecoder();
const N = '<w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/><w:lang w:val="cs-CZ"/></w:rPr>';
const B = '<w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/><w:b/><w:lang w:val="cs-CZ"/></w:rPr>';
const BU = '<w:rPr><w:b/><w:u w:val="single"/></w:rPr>', T = '<w:rPr><w:b/></w:rPr>';
const H = '<w:rPr><w:highlight w:val="yellow"/></w:rPr>';
const en = s => s.replace(/cs-CZ/g, 'en-GB');
const r = (rPr, t, atr) => '<w:r' + (atr || '') + '>' + rPr + t.split('\t').map(x => (x ? '<w:t xml:space="preserve">' + x + '</w:t>' : '')).join('<w:tab/>') + '</w:r>';
const pPrL = '<w:pPr><w:ind w:left="0"/><w:rPr><w:lang w:val="cs-CZ"/></w:rPr></w:pPr>';
const pPrS = '<w:pPr><w:pStyle w:val="Podpis"/><w:spacing w:after="0"/></w:pPr>';
const p = (pPr, behy) => '<w:p>' + pPr + behy + '</w:p>';
const doc = telo => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + telo + '</w:body></w:document>';
const STYLY = '<?xml version="1.0"?><w:styles xmlns:w="w"><w:rPr><w:lang w:val="cs-CZ" w:eastAsia="en-US"/></w:rPr><w:rPr><w:lang w:val="de-DE"/></w:rPr></w:styles>';
const NAST = '<?xml version="1.0"?><w:settings xmlns:w="w"><w:themeFontLang w:val="cs-CZ"/></w:settings>';
const CORE = t => '<?xml version="1.0"?><cp:coreProperties xmlns:cp="c" xmlns:dc="d"><dc:title>' + t + '</dc:title></cp:coreProperties>';

/* česká šablona (smyšlený text) */
const CZ = doc(
  p(pPrL, r(N, 'Cena díla je ') + r(B, 'pevná') + r(N, ' a činí ') + r(H, '{{CENA_BEZ_DPH}}') + r(N, ' bez DPH.'))   // 0
  + p('', r(BU, 'Objednatel:{{OBJEDNATEL}}') + r(T, '\t') + r(T, '\t'))                                           // 1
  + p('', r(N, '(dále jen „') + r(B, 'smlouva') + r(N, '“)'))                                                    // 2
  + p('', r(N, 'Skladné činí {{SOD_SKLADNE}} za den.'))                                                         // 3
  + p(pPrS, r(N, 'V Praze dne {{SOD_DATUM}}'))                                                                  // 4
  + p(pPrS, '') + p(pPrS, r(N, '\t', ' w:rsidRPr="00AB12CD"'))                                                   // 5, 6
  + p(pPrS, r(N, 'Za objednatele:'))                                                                            // 7
  + p('', r(N, '{{SOD_PRILOHA}}', ' w:rsidR="0011AA22" w:rsidRPr="00AB12CD"')));                               // 8
/* revize (smyšlené „závazné znění"): jiný text, sloučené běhy, en-GB, keepNext u 5–6 */
const KN = '<w:pPr><w:pStyle w:val="Podpis"/><w:keepNext/><w:spacing w:after="0"/></w:pPr>';
const REV = doc(
  p(en(pPrL), r(en(N), 'The price of the Work is ') + r(en(B), 'fixed') + r(en(N), ' and amounts to ') + r(H, '{{CENA_BEZ_DPH}}') + r(en(N), ' excl. VAT.'))
  + p('', r(BU, 'Client: {{OBJEDNATEL}}') + r(T, '\t\t'))
  + p('', r(en(N), '(hereinafter the “') + r(en(B), 'Contract') + r(en(N), '”)'))
  + p('', r(en(N), 'The storage fee is {{SOD_SKLADNE}} per calendar day.'))
  + p(pPrS, r(en(N), 'In Prague on {{SOD_DATUM}}'))
  + p(KN, '') + p(KN, r(en(N), '\t'))
  + p(pPrS, r(en(N), 'For the Client:'))
  + p('', r(N.replace('cs-CZ', 'en-GB'), '{{SOD_PRILOHA}}')));
/* strojový slovník (V3) — odlišný od revize */
const STARY = [
  { cz: 'Cena díla je <s1>pevná</s1> a činí {{CENA_BEZ_DPH}} bez DPH.', en: 'The Work price is <s1>fixed</s1> and is {{CENA_BEZ_DPH}} without VAT.', pozn: '' },
  { cz: 'Objednatel:{{OBJEDNATEL}}\t\t', en: 'Client:{{OBJEDNATEL}}\t\t', pozn: '' },
  { cz: '(dále jen „<s1>smlouva“)</s1>', en: '(hereinafter the “<s1>Contract”)</s1>', pozn: '' },
  { cz: 'Skladné činí {{SOD_SKLADNE}} za den.', en: 'The storage fee is [[SKLADNE]].', pozn: '' },
  { misto: 'SKLADNE', en: '{{SOD_SKLADNE}} per day', pozn: 'pojmenované místo' },
  { cz: 'V Praze dne {{SOD_DATUM}}', en: 'In Prague on {{SOD_DATUM}}', pozn: '' },
  { cz: 'Za objednatele:', en: 'For the Client:', pozn: 'ponechat' }];

const docx = async (xml, title) => new Uint8Array(await (await dg.zipZapis([
  { nazev: 'word/document.xml', data: enc.encode(xml) }, { nazev: 'word/styles.xml', data: enc.encode(title ? STYLY.replace(/(w:val=")(cs-CZ|de-DE)"/g, '$1en-GB"') : STYLY) },
  { nazev: 'word/settings.xml', data: enc.encode(title ? NAST.replace('cs-CZ', 'en-GB') : NAST) },
  { nazev: 'docProps/core.xml', data: enc.encode(CORE(title || '')) }])).arrayBuffer());

(async () => {
  const czB = await docx(CZ), revB = await docx(REV, 'CONTRACT FOR WORK');
  const pred = await ps.porovnejSRevizi((await ps.prelozSablonu(czB, STARY, 'en')).bajty, revB);
  test('před: strojový slovník — porovnání najde 3 rozdíly textu a 1 jen v bězích (uvozovka v tučném)', pred.text === 3 && pred.behy === 1 && pred.odstavcu === 9, pred);
  test('před: porovnání hlásí w:keepNext prázdných řádků podpisu (2) a název dokumentu', pred.pPr === 2 && pred.ostatni.some(t => /název dokumentu/.test(t)), pred);

  const v = await ps.slovnikZRevize(czB, revB, STARY, 'en');
  test('z revize: bez vad a sporných vět', !v.vady.length && !v.sporne.length, v.vady.concat(v.sporne));
  test('z revize: změněny 4 věty + blok + název, 2 beze změny', v.zmeneno === 6 && v.beze === 2 && v.novych === 0, [v.zmeneno, v.beze, v.novych]);
  const z = c => v.zaznamy.find(x => x.cz === c);
  test('z revize: tučný úsek ve značce, mezera před symbolem z revize', z(STARY[0].cz).en === 'The price of the Work is <s1>fixed</s1> and amounts to {{CENA_BEZ_DPH}} excl. VAT.', z(STARY[0].cz).en);
  test('z revize: tabulátory v jiném písmu než text (pomocný styl s1 za styly s písmeny)', z(STARY[1].cz).en === 'Client: {{OBJEDNATEL}}<s1>\t\t</s1>', z(STARY[1].cz).en);
  test('z revize: uvozovka za tučným slovem v základním písmu', z(STARY[2].cz).en === '(hereinafter the “<s1>Contract</s1>”)', z(STARY[2].cz).en);
  test('z revize: pojmenované místo zůstalo, změnil se jeho text', z(STARY[3].cz).en === 'The storage fee is [[SKLADNE]].'
    && v.zaznamy.find(x => x.misto === 'SKLADNE').en === '{{SOD_SKLADNE}} per calendar day', v.zaznamy.filter(x => x.misto || x.cz === STARY[3].cz));
  test('z revize: poznámka záznamu zůstala', z('Za objednatele:').pozn === 'ponechat');
  const blok = v.zaznamy.filter(x => x.drzetSpolu);
  test('z revize: blok „drzetSpolu" mezi „V Praze dne…" a „Za objednatele:"', blok.length === 1 && blok[0].drzetSpolu.za === 'V Praze dne {{SOD_DATUM}}'
    && blok[0].drzetSpolu.pred === 'Za objednatele:', blok);
  test('z revize: název dokumentu jako záznam vlastnost=title', (v.zaznamy.find(x => x.vlastnost === 'title') || {}).en === 'CONTRACT FOR WORK');
  test('z revize: vstupní slovník se nezměnil', STARY[0].en.indexOf('without VAT') > 0 && STARY.length === 7);

  /* KRUH: CZ + nový slovník → šablona → 0 rozdílů s revizí */
  const vys = await ps.prelozSablonu(czB, v.zaznamy, 'en');
  test('kruh: šablona bez problémů kontroly', !vys.problemy.length, vys.problemy);
  const po = await ps.porovnejSRevizi(vys.bajty, revB);
  test('kruh: 0 rozdílů textu, běhů i w:pPr (9 odstavců)', po.odstavcu === 9 && po.text + po.behy + po.pPr === 0, po.rozdily);
  test('kruh: název, jazyk stylů a nastavení souhlasí', !po.ostatni.length, po.ostatni);
  const polozky = await dg.zipPrecti(vys.bajty);
  const x = dec.decode(polozky.find(q => q.nazev === 'word/document.xml').data);
  test('kruh: w:lang cs-CZ → en-GB v textu i ve značce odstavce', x.indexOf('cs-CZ') < 0 && (x.match(/en-GB/g) || []).length >= 6, x);
  test('kruh: w:keepNext jen u dvou prázdných řádků podpisu', (x.match(/<w:keepNext\/>/g) || []).length === 2
    && x.indexOf('<w:pStyle w:val="Podpis"/><w:keepNext/><w:spacing') > 0, x);
  test('kruh: běhy bez w:rsid* (i u odstavce jen se symbolem)', !/<w:r\s/.test(x), x);
  test('kruh: sousední úseky stejného písma v jednom běhu (symbol uvnitř)', x.indexOf('<w:t xml:space="preserve">Client: {{OBJEDNATEL}}</w:t></w:r>') > 0, x);
  test('kruh: XML bez vad', !dg.xmlStrukturaVada(x), dg.xmlStrukturaVada(x));
  const styl = dec.decode(polozky.find(q => q.nazev === 'word/styles.xml').data), nast = dec.decode(polozky.find(q => q.nazev === 'word/settings.xml').data);
  test('kruh: styles.xml w:lang → en-GB (eastAsia beze změny)', styl.indexOf('<w:lang w:val="en-GB" w:eastAsia="en-US"/>') > 0 && styl.indexOf('de-DE') < 0, styl);
  test('kruh: settings.xml themeFontLang → en-GB', nast.indexOf('<w:themeFontLang w:val="en-GB"/>') > 0, nast);
  test('kruh: docProps title z vlastnosti slovníku', dec.decode(polozky.find(q => q.nazev === 'docProps/core.xml').data).indexOf('<dc:title>CONTRACT FOR WORK</dc:title>') > 0);

  /* zápis slovníku: nezlomitelná mezera jako \u00a0 (přenos textem přes konektor Disku ji jinak ztratí) */
  const nb = String.fromCharCode(0xa0), js = typeof ps.jsonSlovniku === 'function' ? ps.jsonSlovniku([{ cz: 'v' + nb + 'Praze', en: 'in Prague' }]) : '';
  test('zápis slovníku: \\u00a0 místo nezlomitelné mezery, čisté ASCII, načte se stejně', /v\\u00a0Praze/.test(js)
    && !/[^\x00-\x7f]/.test(js) && JSON.parse(js)[0].cz === 'v' + nb + 'Praze', js);

  /* odhalení vad revize */
  const revKurziva = await docx(REV.replace(r(en(B), 'fixed'), r('<w:rPr><w:i/></w:rPr>', 'fixed')), 'X');
  const vk = await ps.slovnikZRevize(czB, revKurziva, STARY, 'en');
  test('vada: písmo, které česká věta nemá (kurzíva) — hlásí se', vk.vady.some(t => /písmo běhu/.test(t)), vk.vady);
  const revTab = await docx(REV.replace(r(T, '\t\t'), r('<w:rPr><w:i/></w:rPr>', '\t\t')), 'X');
  const vt = await ps.slovnikZRevize(czB, revTab, STARY, 'en');
  test('vada: tabulátory v písmu, které čeština nemá — zachytí ověření po složení', vt.vady.some(t => /po složení/.test(t)), vt.vady);
  const revNavic = await docx(REV.replace('</w:body>', p('', r(N, 'Navíc')) + '</w:body>'), 'X');
  const vn = await ps.slovnikZRevize(czB, revNavic, STARY, 'en');
  test('vada: revize s odstavcem navíc nejde spárovat', vn.vady.some(t => /nejde spárovat/.test(t)), vn.vady);
  const czDvakrat = await docx(CZ.replace('</w:body>', p('', r(N, 'Za objednatele:')) + '</w:body>'));
  const revDvakrat = await docx(REV.replace('</w:body>', p('', r(en(N), 'On behalf of the Client:')) + '</w:body>'), 'X');
  const vd = await ps.slovnikZRevize(czDvakrat, revDvakrat, STARY, 'en');
  test('sporné: stejná česká věta přeložená v revizi dvakrát jinak', vd.sporne.length === 1, vd.sporne);
  const poKN = await ps.porovnejSRevizi(vys.bajty, await docx(REV.replace(KN, pPrS), 'CONTRACT FOR WORK'));
  test('porovnání: chybějící w:keepNext v revizi = 1 rozdíl w:pPr', poKN.pPr === 1 && poKN.text + poKN.behy === 0, poKN);

  console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL výjimka', e.stack); process.exit(1); });
