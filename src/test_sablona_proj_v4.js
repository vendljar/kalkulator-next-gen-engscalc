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
 * K18-N92 (30. 9. 2026): v4 dostane i cenu GEODETICKÉHO ZAMĚŘENÍ — v3 měla
 * jen jeho seznam bez ceny, takže Word nesečetl činnosti do CELKEM (P09:
 * vidět 18 200 Kč, CELKEM 41 600 Kč). Pod seznam přijde cenová tabulka ve
 * stavbě tabulky ceny IČ se symbolem {{PROJ_CENA_GEODET_BLOK}} mezi značkami
 * {{CENA_GEODET_ZAC}}/{{CENA_GEODET_KON}}; nenabízené zaměření blok smaže.
 * S KNG_PODKLADY se ověří i skutečná šablona PROJ v3 (jinak se to přeskočí).
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
/* Mapa symbolů cen činností (K18-N92); prázdná mapa by testy níž splnila
 * naprázdno, proto se hlídá i její velikost. */
const MAPA_CEN = NP.NABIDKA_PROJ_CENA_SYMBOL || {};
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
/* Tabulka ceny IČ (vzor stavby cenových tabulek) s mezerou před sebou
 * a seznam geodetického zaměření jako plovoucí tabulka bez ceny — tak je
 * to ve skutečné PROJ v3 (K18-N92). Odstavce vzoru nesou w14:paraId. */
const TBL_PR_IC = '<w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblInd w:w="108" w:type="dxa"/></w:tblPr>';
const TBL_GRID_IC = '<w:tblGrid><w:gridCol w:w="8090"/><w:gridCol w:w="2404"/></w:tblGrid>';
const cenaIc = `<w:p w14:paraId="14A6453E"><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>`
  + `<w:tbl>${TBL_PR_IC}${TBL_GRID_IC}<w:tr><w:trPr><w:trHeight w:val="399"/></w:trPr>`
  + `<w:tc><w:tcPr><w:tcW w:w="8222" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="FFE599"/></w:tcPr>`
  + `<w:p w14:paraId="49BB1E36"><w:pPr><w:spacing w:before="60"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">CENA ZA </w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>INŽENÝRSKOU ČINNOST (IČ)</w:t></w:r></w:p>`
  + `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:color w:val="2F5496"/><w:sz w:val="18"/></w:rPr><w:t>Vyřízení POVOLENÍ ZÁMĚRU</w:t></w:r></w:p>`
  + `<w:p><w:pPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:i/><w:sz w:val="18"/></w:rPr><w:t>bez DPH</w:t></w:r></w:p></w:tc>`
  + `<w:tc><w:tcPr><w:tcW w:w="2442" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="D9D9D9"/></w:tcPr>`
  + `<w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>{{PROJ_CENA_IC}}</w:t></w:r></w:p></w:tc></w:tr></w:tbl>`;
const geodetSeznam = `<w:tbl><w:tblPr><w:tblpPr w:vertAnchor="text" w:tblpX="108" w:tblpY="484"/><w:tblW w:w="10632" w:type="dxa"/></w:tblPr>`
  + `<w:tblGrid><w:gridCol w:w="10632"/></w:tblGrid>`
  + ['Provedení zaměření geodetem', 'Zpracování geometrického plánu'].map(t => `<w:tr><w:tc><w:p><w:r><w:t>${t}</w:t></w:r></w:p></w:tc></w:tr>`).join('')
  + '</w:tbl>';
const v3 = `<w:document><w:body>${cenaIc}${odst('ROZŠÍŘENÁ NABÍDKA')}${geodetSeznam}<w:p><w:pPr><w:rPr><w:vanish/></w:rPr></w:pPr></w:p>`
  + `${odst('DPH, SPLATNOST FAKTUR A PLATNOST NABÍDKY:')}`
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

/* ---- K18-N92: cena geodetického zaměření ---- */
{
  const i = t => v4.indexOf(t);
  test('N92: v4 má pod seznamem geodetického zaměření blok ceny ({{CENA_GEODET_ZAC}} … {{PROJ_CENA_GEODET_BLOK}} … {{CENA_GEODET_KON}})',
    i('Zpracování geometrického plánu') >= 0 && i('Zpracování geometrického plánu') < i('{{CENA_GEODET_ZAC}}')
    && i('{{CENA_GEODET_ZAC}}') < i('CENA ZA GEODETICKÉ ZAMĚŘENÍ') && i('CENA ZA GEODETICKÉ ZAMĚŘENÍ') < i('{{PROJ_CENA_GEODET_BLOK}}')
    && i('{{PROJ_CENA_GEODET_BLOK}}') < i('{{CENA_GEODET_KON}}') && i('{{CENA_GEODET_KON}}') < i('DPH, SPLATNOST FAKTUR'),
    [i('Zpracování geometrického plánu'), i('{{CENA_GEODET_ZAC}}'), i('{{PROJ_CENA_GEODET_BLOK}}'), i('{{CENA_GEODET_KON}}')]);
  const blok = v4.slice(i('{{CENA_GEODET_ZAC}}'), i('{{CENA_GEODET_KON}}'));
  test('N92: cenová tabulka geodetu má stavbu tabulky ceny IČ (vlastnosti, mřížka, buňky) a texty online nabídky',
    blok.indexOf(TBL_PR_IC) >= 0 && blok.indexOf(TBL_GRID_IC) >= 0 && /w:fill="FFE599"/.test(blok) && /w:fill="D9D9D9"/.test(blok)
    && /Geodetické zaměření a geometrický plán/.test(blok) && /bez DPH/.test(blok) && (blok.match(/<w:tc>/g) || []).length === 2, blok);
  test('N92: odstavce vzoru se neopakují (w14:paraId je v dokumentu jen jednou)',
    v4.split('w14:paraId="49BB1E36"').length === 2 && v4.split('w14:paraId="14A6453E"').length === 2);
  test('N92: v4 bez seznamu geodetického zaměření skončí chybou (nic nehádá)',
    /seznam geodetického zaměření/.test(chybaZ(() => VS.projV4(v3.replace('Provedení zaměření geodetem', 'X')))));
  test('N92: v4 bez vzoru cenové tabulky (IČ) skončí chybou',
    /vzor cenové tabulky/.test(chybaZ(() => VS.projV4(v3.replace('{{PROJ_CENA_IC}}', '{{PROJ_CENA_XX}}')))));
  test('N92: šablona, která cenu geodetu už má, druhou nedostane',
    VS.projV4(v3.replace('Provedení zaměření geodetem', 'Provedení zaměření geodetem {{PROJ_CENA_GEODET}}')).indexOf('CENA_GEODET_ZAC') < 0);
}

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
  /* Výchozí plán nové zakázky je od 1. 10. 2026 Záloha 70 % + zbytek po
   * předání (rozhodnutí J. V.); Standard po činnostech je jedna z předvoleb. */
  test('DPZ: řádky „Platba … – N % z nabídkové ceny za DPZ" (výchozí plán: záloha 70 % + 30 % po předání)',
    ph.PROJ_PLATBY_DPZ.split('\n').join(' | ') === 'Platba po podpisu smlouvy / objednávky – 70 % z nabídkové ceny za DPZ | '
      + 'Platba po dokončení dokumentace pro povolení záměru v rozsahu pro podání na stavební úřad – 30 % z nabídkové ceny za DPZ', ph.PROJ_PLATBY_DPZ);
  {
    const zs = novaZ(), vs = zs.varianty[0];
    vs.data.kryciProj.planPlateb = { v: 1, predvolba: 'std' };
    const phs = NP.nabidkaProjData(zs, vs, 'cz').placeholders;
    test('DPZ: předvolba Standard po činnostech dá řádky 50/30/20',
      phs.PROJ_PLATBY_DPZ.split('\n').join(' | ') === 'Platba po podpisu smlouvy / objednávky – 50 % z nabídkové ceny za DPZ | '
        + 'Platba po dokončení dokumentace pro povolení záměru v rozsahu pro podání na dotčené orgány – 30 % z nabídkové ceny za DPZ | '
        + 'Platba po dokončení dokumentace pro povolení záměru v rozsahu pro podání na stavební úřad – 20 % z nabídkové ceny za DPZ', phs.PROJ_PLATBY_DPZ);
  }
  const doc = vypln(ph);
  test('vyplněná v4: nenabízené zaměření zmizelo i s nadpisem, DPZ zůstalo', !/PLATEBNÍ PODMÍNKY ZAMĚŘENÍ/.test(doc) && /PLATEBNÍ PODMÍNKY DPZ/.test(doc)
    && /30 % z nabídkové ceny za DPZ/.test(doc), doc.length);
  test('vyplněná v4: žádná značka ani nevyplněný symbol plánu nezůstal', !/PLATBY_[A-Z]+_(ZAC|KON)|PROJ_PLATBY_/.test(doc));
  test('vyplněná v4: řádky jsou zalomené (w:br), XML platné', /<w:br\/>/.test(doc) && !dg.xmlStrukturaVada(doc), dg.xmlStrukturaVada(doc));
  /* K18-N92: geodetické zaměření se tu nenabízí (ceník ho má za 0 Kč). */
  test('N92: nenabízené geodetické zaměření — {{PROJ_CENA_GEODET_BLOK}} prázdný, {{PROJ_CENA_GEODET}} dál „není součástí této nabídky"',
    ph.PROJ_CENA_GEODET_BLOK === '' && ph.PROJ_CENA_GEODET === 'není součástí této nabídky', [ph.PROJ_CENA_GEODET_BLOK, ph.PROJ_CENA_GEODET]);
  test('N92: vyplněná v4 bez geodetu — blok ceny zmizel i se značkami, seznam zůstal',
    !/CENA ZA GEODETICKÉ ZAMĚŘENÍ|CENA_GEODET_|PROJ_CENA_GEODET/.test(doc) && /Provedení zaměření geodetem/.test(doc));
  test('N92: symbol …_BLOK je u každé činnosti prázdný právě tehdy, když se nenabízí, jinak nese cenu jako {{PROJ_CENA_<X>}}',
    Object.keys(MAPA_CEN).length === 9 && Object.keys(MAPA_CEN).every(k => {
      const s = MAPA_CEN[k], b = ph[s + '_BLOK'];
      return (+ceny[k] > 0) ? (b !== '' && b === ph[s] && /Kč/.test(b)) : b === '';
    }), Object.keys(MAPA_CEN).map(k => k + '=' + ph[MAPA_CEN[k] + '_BLOK']));
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

/* ---- K18-N92: nabízené geodetické zaměření — cena ve Wordu ---- */
{
  const z = novaZ(), v = z.varianty[0];
  v.data.proj.cenik.fixy.geodet = 19500;   // s přirážkou 23 400 Kč — jiná částka než IČ
  const d = NP.nabidkaProjData(z, v, 'cz');
  const ph = d.placeholders;
  test('N92: nabízené geodetické zaměření — {{PROJ_CENA_GEODET_BLOK}} nese cenu (tutéž jako {{PROJ_CENA_GEODET}})',
    /Kč/.test(ph.PROJ_CENA_GEODET_BLOK) && ph.PROJ_CENA_GEODET_BLOK === ph.PROJ_CENA_GEODET, [ph.PROJ_CENA_GEODET_BLOK, ph.PROJ_CENA_GEODET]);
  const doc = vypln(ph);
  const i = t => doc.indexOf(t);
  test('N92: vyplněná v4 ukáže cenu geodetického zaměření pod jeho seznamem, značky zmizí, XML platné',
    i('CENA ZA GEODETICKÉ ZAMĚŘENÍ') > i('Zpracování geometrického plánu') && doc.indexOf(ph.PROJ_CENA_GEODET_BLOK, i('CENA ZA GEODETICKÉ ZAMĚŘENÍ')) > 0
    && !/CENA_GEODET_(ZAC|KON)|PROJ_CENA_GEODET/.test(doc) && !dg.xmlStrukturaVada(doc),
    [i('Zpracování geometrického plánu'), i('CENA ZA GEODETICKÉ ZAMĚŘENÍ'), i(ph.PROJ_CENA_GEODET_BLOK),
      (doc.match(/CENA_GEODET_(ZAC|KON)|PROJ_CENA_GEODET/) || [''])[0], dg.xmlStrukturaVada(doc)]);
  v.data.proj.cenik.kurzEurKc = 25;
  const en = NP.nabidkaProjData(z, v, 'en');
  test('N92: v cizím jazyce nese blok cenu geodetu v eurech, jako ostatní činnosti',
    /€/.test(en.placeholders.PROJ_CENA_GEODET_BLOK) && en.placeholders.PROJ_CENA_GEODET_BLOK === en.placeholders.PROJ_CENA_GEODET,
    en.placeholders.PROJ_CENA_GEODET_BLOK);
}

/* ---- K18-N92 na skutečné šabloně PROJ v3 (jen s KNG_PODKLADY) ----
 * Šablony v repozitáři nejsou (firemní texty). Když je složka podkladů po
 * ruce, projde v4 z opravdové v3: cena geodetu musí mít blok, každá činnost
 * svůj symbol ceny a vyplněný dokument s geodetem jeho částku. */
(async () => {
  const fs = require('fs');
  const zdroj = process.env.KNG_PODKLADY ? path.join(process.env.KNG_PODKLADY, 'Sablona_NABIDKA_PROJ.docx') : '';
  if (!zdroj || !fs.existsSync(zdroj)) {
    console.log('–    skutečná šablona PROJ v3 (KNG_PODKLADY) není po ruce — přeskočeno');
  } else {
    const casti = await dg.zipPrecti(new Uint8Array(fs.readFileSync(zdroj)));
    const xml3 = new TextDecoder().decode(casti.find(x => x.nazev === 'word/document.xml').data);
    let xml4 = '';
    const ch = chybaZ(() => { xml4 = VS.projV4(xml3); });
    test('N92 (skutečná v3): v4 vznikne bez chyby', !ch, ch);
    const kl = dg.klicePlaceholderu(xml4);
    test('N92 (skutečná v3): v4 má blok ceny geodetu', ['CENA_GEODET_ZAC', 'PROJ_CENA_GEODET_BLOK', 'CENA_GEODET_KON'].every(k => kl.includes(k)), kl);
    test('N92 (skutečná v3): každá činnost má v4 svůj symbol ceny',
      Object.values(MAPA_CEN).length === 9 && Object.values(MAPA_CEN).every(s => kl.includes(s) || kl.includes(s + '_BLOK')),
      Object.values(MAPA_CEN).filter(s => !kl.includes(s) && !kl.includes(s + '_BLOK')));
    test('N92 (skutečná v3): XML v4 bez vad', !dg.xmlStrukturaVada(xml4), dg.xmlStrukturaVada(xml4));
    const z = novaZ(), v = z.varianty[0];
    v.data.proj.cenik.fixy.geodet = 19500;   // s přirážkou 23 400 Kč — jiná částka než IČ
    const ph = NP.nabidkaProjData(z, v, 'cz').placeholders;
    const doc = dg.nahradPlaceholdery(dg.odstranPrazdneBloky(xml4, ph), ph);
    const text = dg.xmlUnesc((doc.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join(''));
    test('N92 (skutečná v3): vyplněná v4 s geodetem ukáže jeho cenu', text.indexOf('CENA ZA GEODETICKÉ ZAMĚŘENÍ') >= 0
      && text.indexOf(ph.PROJ_CENA_GEODET_BLOK) >= 0 && !/CENA_GEODET_/.test(doc));
    /* K18-N95: jazykové mutace v4 bez napůl českých vět (vzor „cca …"
     * dřív z „cca do 4 týdnů od podání žádosti" udělal „approx. do 4 týdnů
     * od podání žádosti" a počítal to za přeložené). Neutrální řádky
     * (adresa, IČ) a zkratka IČ se nepočítají. */
    const ab4 = await (await dg.zipZapis(casti.map(c => (c.nazev === 'word/document.xml'
      ? { nazev: c.nazev, data: new TextEncoder().encode(xml4) } : c)))).arrayBuffer();
    for (const L of ['en', 'de', 'fr']) {
      const out = await dg.docxPrelozSablonu(ab4.slice(0), L, {});
      const c2 = await dg.zipPrecti(new Uint8Array(await out.arrayBuffer()));
      const x2 = new TextDecoder().decode(c2.find(x => x.nazev === 'word/document.xml').data);
      const cesky = (x2.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || [])
        .map(p => dg.xmlUnesc((p.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join('')))
        .filter(t => /[ěščřžůťďňýáíú]/i.test(t.replace(/\(IČ\)|\bIČ\b|\{\{[^}]*\}\}/g, '')) && !prekladNeutral(t));
      test('N95 (skutečná v3): jazyková mutace v4 ' + L.toUpperCase() + ' bez české ani napůl přeložené věty', cesky.length === 0, cesky);
    }
  }
  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL výjimka: ' + (e && e.stack || e)); process.exit(1); });
