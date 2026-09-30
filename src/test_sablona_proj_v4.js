/* ŠABLONA NABÍDKY PROJ v4 A SYMBOLY PLATEBNÍCH PODMÍNEK Z PLÁNU PLATEB
 * (etapa B platebních podmínek, #367, rozhodnutí J. V. 29. 9. 2026).
 *
 * PROJ v3 měla platební podmínky činností natvrdo (procenta dnešní nabídky),
 * takže Word tiskl pořád totéž, ať obchodník v krycím listu zvolil
 * jakoukoli předvolbu. PROJ v4 (nastroje/vyrob_sablony.js --proj-v4) je
 * nahradí blokem za každou činnost plánu:
 *
 *   {{PLATBY_DPZ_ZAC}}
 *   [ PLATEBNÍ PODMÍNKY DPZ:          ]  ← nadpisový řádek tabulky ze vzoru v3
 *   [ {{PROJ_PLATBY_DPZ}}             ]  ← řádky „Platba … – N % z nabídkové ceny za DPZ"
 *   {{PLATBY_DPZ_KON}}
 *
 * Hlídá se úprava šablony (syntetické XML — skutečné šablony v repozitáři
 * nejsou) a to, co do ní aplikace dosadí: jen nabízené činnosti, nenabízená
 * zmizí i s nadpisem, autorský dozor zůstane, odeslaná nabídka z doby před
 * plánem dostane pevné řádky, jaké odešly. Před zavedením režimu v4
 * a symbolů PROJ_PLATBY_* sada selže na první kontrole.
 *
 * Spuštění: cd src && node test_sablona_proj_v4.js */
const path = require('path');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./preklad.js');
const dg = nacti('./docxgen.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./firma.js');
const PP = nacti('./plan_plateb.js');
const NP = nacti('./nabidka_proj.js');
const zk = nacti('./zakazka.js');
nacti('./zamek.js');
nacti('./kryci.js');
nacti('./kryci_proj.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info.slice(0, 600) : JSON.stringify(info))); } };

let VS = null;
try { VS = require(path.join(__dirname, '..', 'nastroje', 'vyrob_sablony.js')); } catch (e) { VS = null; }
test('nastroje/vyrob_sablony.js exportuje projV4 a nabídka zná bloky plánu', !!(VS && typeof VS.projV4 === 'function') && !!NP.NABIDKA_PROJ_PLATBY);
if (fail) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }

/* ---- syntetická PROJ v3: tabulky bloků s nadpisem v prvním řádku ---- */
const beh = t => `<w:r><w:rPr><w:b/><w:color w:val="1F497D"/></w:rPr><w:t xml:space="preserve">${t}</w:t></w:r>`;
const blokV3 = (nadpis, radky) => `<w:tbl><w:tblPr><w:tblW w:w="10632" w:type="dxa"/></w:tblPr><w:tblGrid><w:gridCol w:w="6629"/><w:gridCol w:w="4003"/></w:tblGrid>`
  + `<w:tr><w:tc><w:tcPr><w:tcW w:w="6629" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:pStyle w:val="Bezmezer"/></w:pPr>${beh('PLATEBNÍ PODMÍNKY ')}${beh(nadpis)}${beh(':')}</w:p></w:tc>`
  + `<w:tc><w:tcPr><w:tcW w:w="4003" w:type="dxa"/></w:tcPr><w:p/></w:tc></w:tr>`
  + radky.map(([a, b]) => `<w:tr><w:tc><w:p><w:r><w:t>${a}</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>${b}</w:t></w:r></w:p></w:tc></w:tr>`).join('')
  + '</w:tbl>';
const odst = t => `<w:p><w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;
const v3 = `<w:document><w:body>${odst('DPH, SPLATNOST FAKTUR A PLATNOST NABÍDKY:')}`
  + blokV3('ZAMĚŘENÍ', [['Platba po podpisu objednávky zaměření', '50 % z celkové ceny za zaměření']]) + odst('')
  + blokV3('DPZ', [['Platba po podpisu objednávky', '50 % z nabídkové ceny za DPZ']]) + odst('')
  + blokV3('AUTORSKÉHO DOZORU', [['Platba po zajištění autorského dozoru a součtu hodin', '100 % z celkové ceny za tuto činnost']])
  + odst('TERMÍNY:') + odst('{{PROJ_SLEVA_KC}}') + '<w:sectPr/></w:body></w:document>';

const v4 = VS.projV4(v3);
const klice = dg.klicePlaceholderu(v4);
const cinnosti = Object.values(NP.NABIDKA_PROJ_PLATBY);
test('v4: za každou činnost plánu symbol {{PROJ_PLATBY_<X>}} a pár značek', cinnosti.every(d => klice.includes('PROJ_PLATBY_' + d.symbol)
  && klice.includes('PLATBY_' + d.symbol + '_ZAC') && klice.includes('PLATBY_' + d.symbol + '_KON')), klice);
test('v4: pevné řádky zaměření a DPZ z v3 zmizely', !/Platba po podpisu objednávky zaměření/.test(v4) && !/50 % z nabídkové ceny za DPZ/.test(v4));
test('v4: blok autorského dozoru i okolní text zůstaly', /AUTORSKÉHO DOZORU/.test(v4) && /Platba po zajištění autorského dozoru/.test(v4)
  && /DPH, SPLATNOST FAKTUR/.test(v4) && /TERMÍNY:/.test(v4));
test('v4: nadpisy nových bloků (i DPS a EZC zvlášť, projednání, geodet)', ['PLATEBNÍ PODMÍNKY DPS:', 'PLATEBNÍ PODMÍNKY EZC:',
  'PLATEBNÍ PODMÍNKY PROJEDNÁNÍ STUDIE:', 'PLATEBNÍ PODMÍNKY GEODETICKÉHO ZAMĚŘENÍ:'].every(n => v4.indexOf(n) >= 0));
test('v4: platné XML', !dg.xmlStrukturaVada(v4), dg.xmlStrukturaVada(v4));
const chybaZ = (fn) => { try { fn(); return ''; } catch (e) { return e.message; } };
test('v4: druhý průchod odmítne (šablona už plán plateb má)', /už platební podmínky z plánu plateb má/.test(chybaZ(() => VS.projV4(v4))));
test('v4: vstup bez rekapitulace slevy (PROJ v2) odmítne', /není PROJ v3/.test(chybaZ(() => VS.projV4(v3.replace('{{PROJ_SLEVA_KC}}', '')))));
test('v4: bez bloku autorského dozoru skončí chybou (nic nehádá)',
  /AUTORSKÉHO DOZORU/.test(chybaZ(() => VS.projV4(v3.replace(/PLATEBNÍ PODMÍNKY <\/w:t><\/w:r><w:r><w:rPr><w:b\/><w:color w:val="1F497D"\/><\/w:rPr><w:t xml:space="preserve">AUTORSKÉHO DOZORU/, 'X</w:t></w:r><w:r><w:rPr><w:b/><w:color w:val="1F497D"/></w:rPr><w:t xml:space="preserve">AUTORSKÉHO DOZORU')))));

/* ---- co do v4 dosadí aplikace ---- */
global.NAST = { firma: global.firmaDefault() };
const novaZ = () => { const z = zk.novaZakazka(); z.cislo = '2026 - OVP - CN - 403'; z.varianty[0].data.proj.cenik = ZC.zkusebniCenikProj(); return z; };
/* pořadí jako v docxVyplnSablonu: nejdřív prázdné bloky, pak dosazení symbolů */
const vypln = (ph) => dg.nahradPlaceholdery(dg.odstranPrazdneBloky(v4, ph), ph);
{
  const z = novaZ(), v = z.varianty[0];
  const d = NP.nabidkaProjData(z, v, 'cz');
  const ceny = NP.nabidkaProjPlatby(z, v, 'cz').ceny;
  const ph = d.placeholders;
  test('symboly PROJ_PLATBY_* jsou vyplněné právě u nabízených činností', Object.keys(NP.NABIDKA_PROJ_PLATBY).every(k =>
    (+ceny[k] > 0) === !!String(ph['PROJ_PLATBY_' + NP.NABIDKA_PROJ_PLATBY[k].symbol] || '').trim()), Object.keys(ceny));
  test('DPZ: řádky „Platba … – N % z nabídkové ceny za DPZ" (Standard 50/30/20)',
    ph.PROJ_PLATBY_DPZ.split('\n').join(' | ') === 'Platba po podpisu smlouvy / objednávky – 50 % z nabídkové ceny za DPZ | '
      + 'Platba po dokončení dokumentace pro povolení záměru v rozsahu pro podání na dotčené orgány – 30 % z nabídkové ceny za DPZ | '
      + 'Platba po dokončení dokumentace pro povolení záměru v rozsahu pro podání na stavební úřad – 20 % z nabídkové ceny za DPZ', ph.PROJ_PLATBY_DPZ);
  const doc = vypln(ph);
  test('vyplněná v4: nenabízené zaměření zmizelo i s nadpisem, DPZ zůstalo', !/PLATEBNÍ PODMÍNKY ZAMĚŘENÍ/.test(doc) && /PLATEBNÍ PODMÍNKY DPZ/.test(doc)
    && /30 % z nabídkové ceny za DPZ/.test(doc), doc.length);
  test('vyplněná v4: žádná značka ani nevyplněný symbol plánu nezůstal', !/PLATBY_[A-Z]+_(ZAC|KON)|PROJ_PLATBY_/.test(doc));
  test('vyplněná v4: řádky jsou zalomené (w:br), XML platné', /<w:br\/>/.test(doc) && !dg.xmlStrukturaVada(doc), dg.xmlStrukturaVada(doc));
  test('souhrn {{PROJ_PLATEBNI_PODMINKY}} nese nadpisy nabízených činností', /^PLATEBNÍ PODMÍNKY STUDIE PROVEDITELNOSTI \(SP\):\n/.test(ph.PROJ_PLATEBNI_PODMINKY)
    && /PLATEBNÍ PODMÍNKY DPZ:\n/.test(ph.PROJ_PLATEBNI_PODMINKY) && !/ZAMĚŘENÍ:/.test(ph.PROJ_PLATEBNI_PODMINKY), ph.PROJ_PLATEBNI_PODMINKY);
  /* online nabídka: bloky z plánu místo pevných */
  const nad = d.bloky.filter(b => b.typ === 'pary' && /^PLATEBNÍ PODMÍNKY/.test(b.nadpis)).map(b => b.nadpis);
  test('online nabídka: bloky jen nabízených činností + autorský dozor, DPS a EZC zvlášť',
    nad.indexOf('PLATEBNÍ PODMÍNKY DPS') >= 0 && nad.indexOf('PLATEBNÍ PODMÍNKY EZC') >= 0 && nad.indexOf('PLATEBNÍ PODMÍNKY DPS A EZC') < 0
    && nad.indexOf('PLATEBNÍ PODMÍNKY ZAMĚŘENÍ') < 0 && nad.indexOf('PLATEBNÍ PODMÍNKY AUTORSKÉHO DOZORU') >= 0, nad);
  /* předvolba Záloha 30 % se propíše */
  v.data.kryciProj.planPlateb = { v: 1, predvolba: 'zaloha', zaloha: 30 };
  const d2 = NP.nabidkaProjData(z, v, 'cz');
  test('předvolba Záloha 30 %: DPZ „30 % po podpisu" + „70 % po předání" v nabídce i symbolu',
    /^Platba po podpisu smlouvy \/ objednávky – 30 % z nabídkové ceny za DPZ\nPlatba po dokončení dokumentace pro povolení záměru v rozsahu pro podání na stavební úřad – 70 %/.test(d2.placeholders.PROJ_PLATBY_DPZ)
    && d2.bloky.find(b => b.nadpis === 'PLATEBNÍ PODMÍNKY DPZ').radky[0][1] === '30 % z nabídkové ceny za DPZ', d2.placeholders.PROJ_PLATBY_DPZ);
  /* cizí jazyk: přeloží slovník a vzor */
  v.data.proj.cenik.kurzEurKc = 25;
  const en = NP.nabidkaProjData(z, v, 'en');
  test('EN: nadpis i řádky přeložené', en.bloky.some(b => b.nadpis === 'PAYMENT TERMS – DPZ')
    && /^Payment after signing the contract \/ order – 30 % of the quoted price for DPZ/.test(en.placeholders.PROJ_PLATBY_DPZ), en.placeholders.PROJ_PLATBY_DPZ);
}
/* ---- odeslaná nabídka z doby před plánem: pevné řádky, jak odešly ---- */
{
  const z = novaZ(), v = z.varianty[0];
  zamkniVariantu(v, { typ: 'nabidkaProj', kdo: 'Test', cislo: '2026 - OVP - CN - 403' });
  const d = NP.nabidkaProjData(z, v, 'cz');
  test('odeslaná bez snímku: online nabídka má pevné bloky (DPS A EZC společně)',
    d.bloky.some(b => b.nadpis === 'PLATEBNÍ PODMÍNKY DPS A EZC') && !d.bloky.some(b => b.nadpis === 'PLATEBNÍ PODMÍNKY DPS'));
  test('odeslaná bez snímku: v4 dostane pevné řádky (DPZ „Platba po podpisu objednávky")',
    /^Platba po podpisu objednávky – 50 % z nabídkové ceny za DPZ/.test(d.placeholders.PROJ_PLATBY_DPZ)
    && /^Platba po podpisu objednávky dokumentace pro provedení stavby \(DPS\)/.test(d.placeholders.PROJ_PLATBY_DPS)
    && /^Platba po podpisu objednávky ekonomické zadávací části \(EZC\)/.test(d.placeholders.PROJ_PLATBY_EZC)
    && d.placeholders.PROJ_PLATBY_GEODET === '', [d.placeholders.PROJ_PLATBY_DPZ, d.placeholders.PROJ_PLATBY_DPS]);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
