/* LEŠENÍ V TECHNICKÉ SPECIFIKACI ŘÍZENÉ KALKULACÍ (připomínka obchodu D. S.
 * 15. 10. 2026, bod 2; dávka S12, v16.10.2).
 *
 * Obchodník měl v Kalkulaci OCK mezi příplatky v nabídce LEŠENÍ - vnitřní
 * i LEŠENÍ - vnější. Tabulka SOUČÁSTÍ DODÁVKY NENÍ přitom ukazovala jen
 * „LEŠENÍ KOLEM OCK PRO PROVEDENÍ OPLÁŠTĚNÍ" s výchozím „zajistí objednatel
 * v rámci SP" (štítek „výchozí") — tedy opak toho, co nabídka o kus dál
 * nabízí za cenu. Očekávání: obě lešení v tabulce a stav podle kalkulace,
 * stejně jako u OPLECHOVÁNÍ SOKLU PROHLUBNĚ.
 *
 * Rozhoduje jedna funkce tsLeseniNeniRadek (techspec.js) pro specifikaci
 * i nabídku OCK:
 *   v základní ceně  → řádek se do dokumentu nedává (dodávku říká sekce
 *                      STAVEBNÍ A PŘÍPRAVNÉ PRÁCE; P8/7),
 *   příplatek v nabídce → „nabízeno jako příplatek",
 *   jinak            → „zajistí objednatel v rámci SP".
 * Na rozdíl od soklu jde text mimo základní cenu RUČNĚ PŘEPSAT (štítek
 * „ručně", tlačítko ↺ vrátí návrh z kalkulace) — pokyn zadání.
 *
 * ŽÁDNÉ CENY — zkouší se znění a umístění řádků (zkušební ceník).
 * Spuštění: cd src && node test_leseni_specifikace.js */
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./preklad.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const TSm = nacti('./techspec.js');
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

const VNITRNI = 'LEŠENÍ VNITŘNÍ PRO STAVBU OCK', VNEJSI = 'LEŠENÍ KOLEM OCK PRO PROVEDENÍ OPLÁŠTĚNÍ';
const SEK_NENI = 'SOUČÁSTÍ DODÁVKY NENÍ';
const neni = (TSm.TECHSPEC_DEF.find(s => s.sekce === SEK_NENI) || { pole: [] }).pole;
const iV = neni.findIndex(p => p.id === 'neniLeseniVnitrni'), i3 = neni.findIndex(p => p.id === 'neni3');
test('specifikace má v SOUČÁSTÍ DODÁVKY NENÍ řádek vnitřního lešení hned před lešením kolem OCK',
  iV >= 0 && i3 === iV + 1 && neni[iV].label === VNITRNI, { iV, i3 });
test('techspec.js exportuje tsLeseniNeniRadek', typeof TSm.tsLeseniNeniRadek === 'function');
test('číselník poznámek k dodávce nabízí „nabízeno jako příplatek"', TSm.TS_C.dodavkaPozn.includes('nabízeno jako příplatek'));
if (fail) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }

const pole = id => TSm.TECHSPEC_DEF.reduce((a, s) => a.concat(s.pole), []).find(p => p.id === id);
const zakazka = (uprav) => {
  const zak = zk.novaZakazka();
  zak.cislo = '2026 - OPR - CN - 9161'; zak.nazevAkce = 'Lešení';
  const z = zak.varianty[0].data.ock.zadani;
  Object.assign(z, { prejezd: 3.5, zdvih: 12, prohluben: 1.1, sirka: 1.6, hloubka: 1.5, nastupiste: 4 });
  if (uprav) uprav(z, zak.varianty[0].data);
  return zak;
};
const stav = (zak, L) => {
  const v = zak.varianty[0], d = v.data;
  const r = vypocet(d.ock.zadani, d.cenik, JEKLY, d.ock.fixes);
  const spec = ['neniLeseniVnitrni', 'neni3'].map(id => tsHodnota(pole(id), d.techspec, r, d.ock.zadani, d.cenik));
  const data = N.nabidkaData(zak, v, JEKLY, L || 'cz');
  const ph = data.placeholders;
  const sekce = N.nabidkaNahledSekce(ph, L || 'cz', data.platbyOck);
  return { spec, nab: [ph.TS_NENI_LESENI_VNITRNI, ph.TS_NENI_LESENI], sekce, data };
};
const radkyNeni = (s, L) => {
  const sek = s.sekce.find(x => x.sekce === (L && L !== 'cz' ? tr(SEK_NENI, L) : SEK_NENI)) || { radky: [] };
  return sek.radky.map(r => r[0]);
};

const PRIPAD_DS = z => { z.typSachty = 'interiérová'; z.volitelne.leseniVnitrni = false; z.volitelne.leseniVnejsi = false; };
const PRIPADY = [
  /* snímek obrazovky D. S.: oba příplatky lešení zaškrtnuté v nabídce */
  ['vnitřní šachta, oba příplatky lešení v nabídce', PRIPAD_DS, ['nabízeno jako příplatek', 'nabízeno jako příplatek']],
  ['exteriér, oba příplatky lešení v nabídce', z => { z.typSachty = 'exteriérová';
    z.volitelne.leseniVnitrni = false; z.volitelne.leseniVnejsi = false; }, ['nabízeno jako příplatek', 'nabízeno jako příplatek']],
  ['exteriér, obě lešení v základní ceně', z => { z.typSachty = 'exteriérová';
    z.volitelne.leseniVnitrni = true; z.volitelne.leseniVnejsi = true; }, ['', '']],
  ['výchozí zakázka (vnitřní v ceně, vnější příplatkem)', z => { z.typSachty = 'interiérová'; }, ['', 'nabízeno jako příplatek']],
  ['příplatky lešení z nabídky vyřazené', z => { z.typSachty = 'interiérová'; z.volitelne.leseniVnitrni = false;
    z.priplatkyVynechat = (z.priplatkyVynechat || []).concat(['leseniVnitrni', 'leseniVnejsi']); },
    ['zajistí objednatel v rámci SP', 'zajistí objednatel v rámci SP']],
];
PRIPADY.forEach(([nazev, uprav, ocek]) => {
  const s = stav(zakazka(uprav));
  test(nazev + ': specifikace ' + JSON.stringify(ocek), s.spec[0].text === ocek[0] && s.spec[1].text === ocek[1], s.spec);
  test(nazev + ': štítek „z kalkulace" (ne „výchozí")', s.spec.every(h => h.zdroj === 'z kalkulace'), s.spec.map(h => h.zdroj));
  test(nazev + ': nabídka OCK říká totéž co specifikace', s.nab[0] === s.spec[0].text && s.nab[1] === s.spec[1].text, [s.nab, s.spec.map(h => h.text)]);
  const radky = radkyNeni(s);
  test(nazev + ': náhled nabídky má řádky lešení právě tehdy, když mají text',
    radky.includes(VNITRNI) === !!ocek[0] && radky.includes(VNEJSI) === !!ocek[1], radky);
});

/* ruční přepis funguje jako u ostatních polí; ↺ (smazání ruční hodnoty) vrátí návrh */
{
  const zak = zakazka(PRIPAD_DS);
  const ts = zak.varianty[0].data.techspec;
  ts.hodnoty.neniLeseniVnitrni = 'zajistí objednatel';
  ts.hodnoty.neni3 = 'není požadováno';
  let s = stav(zak);
  test('ruční přepis vnitřního lešení platí (štítek „ručně")', s.spec[0].text === 'zajistí objednatel' && s.spec[0].zdroj === 'ručně', s.spec[0]);
  test('ruční přepis lešení kolem OCK platí (štítek „ručně")', s.spec[1].text === 'není požadováno' && s.spec[1].zdroj === 'ručně', s.spec[1]);
  test('ruční přepis jde i do nabídky', s.nab[0] === 'zajistí objednatel' && s.nab[1] === 'není požadováno', s.nab);
  delete ts.hodnoty.neniLeseniVnitrni; delete ts.hodnoty.neni3;   // tlačítko ↺ (tsReset)
  s = stav(zak);
  test('↺ vrátí návrh z kalkulace', s.spec.every(h => h.text === 'nabízeno jako příplatek' && h.zdroj === 'z kalkulace'), s.spec);
}
/* lešení v základní ceně: řádek se nedává ani s ruční hodnotou (P8/7 — dokument si nesmí odporovat) */
{
  const zak = zakazka(z => { z.typSachty = 'exteriérová'; z.volitelne.leseniVnitrni = true; z.volitelne.leseniVnejsi = true; });
  zak.varianty[0].data.techspec.hodnoty.neniLeseniVnitrni = 'zajistí objednatel';
  const s = stav(zak);
  test('lešení v ceně: ruční text řádek v SOUČÁSTÍ DODÁVKY NENÍ nevrátí', s.spec[0].text === '' && s.spec[0].odvozeno, s.spec[0]);
}

/* cizí jazyky: popisek i hodnota přeložené (slovník), řádek v náhledu */
{
  const zak = zakazka(PRIPAD_DS);
  zak.varianty[0].data.cenik.kurzEurKc = 25;
  ['en', 'de', 'fr'].forEach(L => {
    test(L.toUpperCase() + ': popisek ' + VNITRNI + ' má překlad', trStav(VNITRNI, L).prelozeno);
    const s = stav(zak, L);
    test(L.toUpperCase() + ': hodnota je přeložená', s.nab[0].toLowerCase() === tr('nabízeno jako příplatek', L).toLowerCase() && !/[ěščřžůťďň]/i.test(s.nab[0]), s.nab);
    test(L.toUpperCase() + ': náhled nabídky má přeložený řádek vnitřního lešení', radkyNeni(s, L).includes(tr(VNITRNI, L)), radkyNeni(s, L));
    const navic = (s.data.tsRadkyNavic || []).find(x => x.symbol === 'TS_NENI_LESENI_VNITRNI');
    test(L.toUpperCase() + ': Word dostane přeložený popisek nového řádku', navic && navic.nazev === tr(VNITRNI, L), navic);
  });
}

/* ---------- Word: šablona symbol {{TS_NENI_LESENI_VNITRNI}} nemá — řádek se naklonuje ---------- */
const odst = t => `<w:p><w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;
const bunka = t => `<w:tc><w:tcPr><w:tcW w:w="4000"/></w:tcPr>${odst(t)}</w:tc>`;
const radek = (a, b) => `<w:tr>${bunka(a)}${b == null ? '' : bunka(b)}</w:tr>`;
const dokument = telo => `<w:document><w:body>${telo}<w:sectPr/></w:body></w:document>`;
const tabulka = (s) => '<w:tbl>' + radek('STAVEBNÍ A PŘÍPRAVNÉ PRÁCE') + radek('LEŠENÍ – UVNITŘ ŠACHTY', '{{TS_LESENI_UVNITR}}')
  + radek(SEK_NENI) + radek('OSVĚTLENÍ NÁSTUPIŠŤ', '{{TS_NENI_OSVETLENI}}')
  + (s || '') + radek(VNEJSI, '{{TS_NENI_LESENI}}')
  + radek('DOSTATEČNÉ PŘÍSTUPOVÉ A MANIPULAČNÍ PROSTORY', '{{TS_NENI_PRISTUP}}') + '</w:tbl>';
const word = async (telo, data) => {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const sablona = await (await DG.zipZapis([{ nazev: 'word/document.xml', data: enc.encode(dokument(telo)) }])).arrayBuffer();
  const blob = await DG.docxVyplnSablonu(sablona.slice(0), data.placeholders, [], {},
    { odstavcePryc: data.odstavcePryc || [], radkyNavic: data.tsRadkyNavic || [] });
  const vystup = await blob.arrayBuffer();
  const doc = dec.decode((await DG.zipPrecti(new Uint8Array(vystup))).find(p => p.nazev === 'word/document.xml').data);
  return { doc, vady: await DG.docxXmlVady(vystup) };
};
const text = doc => (doc.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) || []).map(t => t.replace(/<[^>]*>/g, '')).join('|');
(async () => {
  {
    const s = stav(zakazka(PRIPAD_DS));
    const { doc, vady } = await word(tabulka(), s.data);
    const t = text(doc);
    test('Word: řádek vnitřního lešení vložen PŘED lešení kolem OCK s hodnotou z kalkulace',
      t.indexOf(VNITRNI + '|nabízeno jako příplatek|' + VNEJSI + '|nabízeno jako příplatek') >= 0, t);
    test('Word: platné XML', vady.length === 0, vady);
  }
  {
    const s = stav(zakazka(z => { z.typSachty = 'exteriérová'; z.volitelne.leseniVnitrni = true; z.volitelne.leseniVnejsi = true; }));
    const { doc } = await word(tabulka(), s.data);
    test('Word: lešení v ceně → ani jeden řádek lešení v SOUČÁSTÍ DODÁVKY NENÍ', !text(doc).includes(VNITRNI) && !text(doc).includes(VNEJSI), text(doc));
  }
  {
    /* šablona, která symbol už nese (budoucí verze), dostane hodnotu do svého řádku — žádný klon navíc */
    const s = stav(zakazka(PRIPAD_DS));
    const { doc } = await word(tabulka(radek('LEŠENÍ VNITŘNÍ (ŠABLONA)', '{{TS_NENI_LESENI_VNITRNI}}')), s.data);
    const t = text(doc);
    test('Word: šablona se symbolem — hodnota v jejím řádku a řádek se neklonuje',
      t.includes('LEŠENÍ VNITŘNÍ (ŠABLONA)|nabízeno jako příplatek') && !t.includes(VNITRNI), t);
  }
  {
    const zakEn = zakazka(PRIPAD_DS); zakEn.varianty[0].data.cenik.kurzEurKc = 25;
    const s = stav(zakEn, 'en');
    const { doc } = await word(tabulka(), s.data);
    test('Word EN: vložený řádek nese anglický popisek a hodnotu',
      text(doc).toLowerCase().includes((tr(VNITRNI, 'en') + '|' + tr('nabízeno jako příplatek', 'en')).toLowerCase()), text(doc));
  }
  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})();
