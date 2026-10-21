/* VLASTNÍ ŘÁDKY TECHNICKÉ SPECIFIKACE V CENOVÉ NABÍDCE (připomínka obchodu
 * D. S. 15. 10. 2026, bod 3; dávka S12, v16.10.2).
 *
 * Obchodník si ve specifikaci tlačítkem „+ přidat vlastní řádek" přidal do
 * sekce DALŠÍ UJEDNÁNÍ řádek „LEŠENÍ VNITŘNÍ PRO STAVBU OCK" = „zajistí
 * objednatel v rámci SP". V cenové nabídce (CN) se neukázal: nabidkaData
 * četla jen pevná pole TECHSPEC_DEF a `techspec.extra` nepředávala nikam —
 * ani do online náhledu / tisku (nabidkaNahledSekce), ani do Wordu (šablona
 * pro ně symbol nemá).
 *
 * Nově: sekce DALŠÍ UJEDNÁNÍ za SOUČÁSTÍ DODÁVKY NENÍ — v náhledu i tisku
 * (nabidkaNahledSekce, 4. parametr) a ve Wordu naklonovaným sekčním pruhem
 * a řádky (docxRadkyNavic, kotva TS_NENI_PRISTUP). Popisek i hodnota jdou
 * přes slovník (známé fráze se přeloží, neznámé zůstanou česky — stejně
 * jako v náhledu specifikace).
 *
 * Spuštění: cd src && node test_techspec_vlastni_radky.js */
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./preklad.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./firma.js');
const DG = nacti('./docxgen.js');
const zk = nacti('./zakazka.js');
const N = nacti('./nabidka.js');
const JEKLY = JSON.parse(require('fs').readFileSync(__dirname + '/jekly.json', 'utf8'));
global.NAST = { firma: global.firmaDefault() };

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

const SEK = 'DALŠÍ UJEDNÁNÍ';
const R1 = { label: 'LEŠENÍ VNITŘNÍ PRO STAVBU OCK', hodnota: 'zajistí objednatel v rámci SP' };
const R2 = { label: 'PŘEDÁNÍ STAVENIŠTĚ <do 14 dnů>', hodnota: 'dle dohody {{CENA_S_DPH}} & co' };
const zakazka = (extra) => {
  const zak = zk.novaZakazka();
  zak.cislo = '2026 - OPR - CN - 9162'; zak.nazevAkce = 'Vlastní řádky';
  Object.assign(zak.varianty[0].data.ock.zadani, { prejezd: 3.5, zdvih: 12, prohluben: 1.1, sirka: 1.6, hloubka: 1.5, nastupiste: 4 });
  zak.varianty[0].data.techspec.extra = extra;
  zak.varianty[0].data.cenik.kurzEurKc = 25;
  return zak;
};
const nabidka = (zak, L) => {
  const data = N.nabidkaData(zak, zak.varianty[0], JEKLY, L || 'cz');
  return { data, sekce: N.nabidkaNahledSekce(data.placeholders, L || 'cz', data.platbyOck, data.tsExtra) };
};
const P = (t, L) => (L && L !== 'cz') ? tr(t, L) : t;

/* ---------- online náhled / tisk ---------- */
{
  const { sekce } = nabidka(zakazka([R1, R2, { label: '', hodnota: '' }]));
  const i = sekce.findIndex(s => s.sekce === SEK), iNeni = sekce.findIndex(s => s.sekce === 'SOUČÁSTÍ DODÁVKY NENÍ');
  test('náhled CN má sekci DALŠÍ UJEDNÁNÍ hned za SOUČÁSTÍ DODÁVKY NENÍ', i >= 0 && i === iNeni + 1, sekce.map(s => s.sekce));
  const radky = i >= 0 ? sekce[i].radky : [];
  test('vlastní řádky v náhledu v pořadí specifikace (prázdný řádek vynechán)',
    radky.length === 2 && radky[0][0] === R1.label && radky[0][1] === R1.hodnota && radky[1][0] === R2.label && radky[1][1] === R2.hodnota, radky);
  const iObchod = sekce.findIndex(s => s.radky.some(r => /CELKEM/.test(String(r[0]))));
  test('DALŠÍ UJEDNÁNÍ stojí v technické části (před obchodní částí — tisk CN ji tak zařadí)', i >= 0 && i < iObchod, [i, iObchod]);
}
{
  const { sekce } = nabidka(zakazka([]));
  test('bez vlastních řádků sekce DALŠÍ UJEDNÁNÍ v náhledu není', !sekce.some(s => s.sekce === SEK));
}
['en', 'de', 'fr'].forEach(L => {
  const { sekce, data } = nabidka(zakazka([R1, R2]), L);
  const s = sekce.find(x => x.sekce === tr(SEK, L));
  test(L.toUpperCase() + ': nadpis DALŠÍ UJEDNÁNÍ má překlad', trStav(SEK, L).prelozeno);
  test(L.toUpperCase() + ': známá fráze vlastního řádku přeložená, neznámá zůstane, jak ji obchodník napsal',
    !!s && s.radky[0][0] === tr(R1.label, L) && s.radky[0][1] === tr(R1.hodnota, L) && s.radky[1][0] === R2.label, s);
  test(L.toUpperCase() + ': data pro Word nesou tytéž přeložené řádky',
    (data.tsExtra || []).length === 2 && data.tsExtra[0].nazev === tr(R1.label, L));
});

/* ---------- Word ---------- */
const odst = t => `<w:p><w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;
const bunka = t => `<w:tc><w:tcPr><w:tcW w:w="4000"/></w:tcPr>${odst(t)}</w:tc>`;
const pruh = t => `<w:tr><w:tc><w:tcPr><w:gridSpan w:val="2"/><w:shd w:fill="D9E2F3"/></w:tcPr>${odst(t)}</w:tc></w:tr>`;
const radek = (a, b) => `<w:tr>${bunka(a)}${bunka(b)}</w:tr>`;
const dokument = telo => `<w:document><w:body>${telo}<w:sectPr/></w:body></w:document>`;
const TABULKA = '<w:tbl>' + pruh('SOUČÁSTÍ DODÁVKY NENÍ') + radek('OSVĚTLENÍ NÁSTUPIŠŤ', '{{TS_NENI_OSVETLENI}}')
  + radek('DOSTATEČNÉ PŘÍSTUPOVÉ A MANIPULAČNÍ PROSTORY', '{{TS_NENI_PRISTUP}}') + '</w:tbl>'
  + '<w:tbl>' + radek('Výtahová šachta (bez DPH)', '{{CENA_BEZ_DPH}}') + '</w:tbl>';
const word = async (data) => {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const sablona = await (await DG.zipZapis([{ nazev: 'word/document.xml', data: enc.encode(dokument(TABULKA)) }])).arrayBuffer();
  const blob = await DG.docxVyplnSablonu(sablona.slice(0), data.placeholders, [], {},
    { odstavcePryc: data.odstavcePryc || [], radkyNavic: data.tsRadkyNavic || [] });
  const vystup = await blob.arrayBuffer();
  const doc = dec.decode((await DG.zipPrecti(new Uint8Array(vystup))).find(p => p.nazev === 'word/document.xml').data);
  return { doc, vady: await DG.docxXmlVady(vystup) };
};
const text = doc => (doc.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) || []).map(t => t.replace(/<[^>]*>/g, '')).join('|');
(async () => {
  {
    const { data } = nabidka(zakazka([R1, R2]));
    const { doc, vady } = await word(data);
    const t = text(doc);
    test('Word: za SOUČÁSTÍ DODÁVKY NENÍ je pruh DALŠÍ UJEDNÁNÍ a oba vlastní řádky v pořadí',
      t.indexOf('MANIPULAČNÍ PROSTORY|zajistí objednatel v rámci SP|' + SEK + '|' + R1.label + '|' + R1.hodnota) >= 0
      && t.indexOf(R1.hodnota + '|' + R2.label.replace('<', '&lt;').replace('>', '&gt;') + '|') >= 0, t);
    test('Word: pruh DALŠÍ UJEDNÁNÍ převzal formát sekčního pruhu (stínování, sloučené buňky)',
      new RegExp('<w:gridSpan w:val="2"/><w:shd w:fill="D9E2F3"/></w:tcPr><w:p><w:r><w:t xml:space="preserve">' + SEK).test(doc));
    test('Word: vlastní text se nerozvine jako symbol a XML zůstane platné',
      doc.includes('dle dohody &#123;&#123;CENA_S_DPH}} &amp; co') && vady.length === 0, vady);
    test('Word: tabulka ceny zůstala na svém místě', /Výtahová šachta \(bez DPH\)/.test(t));
  }
  {
    const { data } = nabidka(zakazka([]));
    const { doc } = await word(data);
    test('Word bez vlastních řádků: žádný pruh DALŠÍ UJEDNÁNÍ', !text(doc).includes(SEK));
  }
  {
    /* sekce SOUČÁSTÍ DODÁVKY NENÍ, které nezbyl žádný řádek, zmizí i s pruhem — i když za ní stojí DALŠÍ UJEDNÁNÍ */
    const { data } = nabidka(zakazka([R1]));
    const ph = Object.assign({}, data.placeholders, { TS_NENI_OSVETLENI: '', TS_NENI_PRISTUP: '' });
    const { doc } = await word(Object.assign({}, data, { placeholders: ph }));
    const t = text(doc);
    test('Word: prázdná sekce SOUČÁSTÍ DODÁVKY NENÍ zmizí, DALŠÍ UJEDNÁNÍ zůstane',
      !t.includes('SOUČÁSTÍ DODÁVKY NENÍ') && t.includes(SEK + '|' + R1.label), t);
  }
  {
    /* symbol v POPISKU vlastního řádku (popisek jde do klonu jinou cestou než hodnota) */
    const { data } = nabidka(zakazka([{ label: 'ZÁLOHA {{CENA_S_DPH}}', hodnota: 'ano' }]));
    const { doc } = await word(data);
    test('Word: {{SYMBOL}} v popisku vlastního řádku se nerozvine', doc.includes('ZÁLOHA &#123;&#123;CENA_S_DPH}}'),
      text(doc).slice(text(doc).indexOf(SEK)));
  }
  {
    const { data } = nabidka(zakazka([{ label: 'ZÁRUKA NA NÁTĚRY DLE DOHODY', hodnota: '' }]));
    const { doc } = await word(data);
    test('Word: vlastní řádek jen s popiskem (bez hodnoty) se vloží', text(doc).includes(SEK + '|ZÁRUKA NA NÁTĚRY DLE DOHODY'), text(doc));
  }
  {
    const { data } = nabidka(zakazka([R1]), 'de');
    const { doc } = await word(data);
    const t = text(doc).toLowerCase();
    test('Word DE: pruh i řádek přeložené', t.includes((tr(SEK, 'de') + '|' + tr(R1.label, 'de') + '|' + tr(R1.hodnota, 'de')).toLowerCase()), t);
  }
  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})();
