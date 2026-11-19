/* NP (19. 11. 2026) — KOMPLETNÍ NÁHLED PODKLADŮ = TEXT WORDU.
 *
 * Náhled OCK (src/nahled_word.js) má ukázat nabídku tak, jak vyjde z Wordu.
 * Pojistka shody: pro pevnou sadu zakázek se porovná TEXT náhledu (řádek po
 * řádku, v pořadí) s textem Wordu vygenerovaného generátorem aplikace
 * (docxVyplnSablonu) ze syntetické šablony ve stavbě CN v17. Firemní šablona
 * v repu není — syntetická je opsaná ze snímků Wordu CN v17
 * (podklady/kola/nahled_vs_word_2026-11-19/word_01–06.png): hlavička, Popis
 * záměru, A./I. technická specifikace se smyčkou šachet {#sachty}, sekce
 * se symboly TS_*, B./I. cenová tabulka v17 (šachty, můstky, cena před
 * slevou, sleva, CENA CELKEM, DPH, celkem), II. příplatky (prototyp
 * {{PRIP_NAZEV}}), III. bloky PLATBY_*, kapitoly ve značkách KAP_*, podpis.
 * Rozdíl v pořadí nebo v jediné hodnotě = FAIL.
 *
 *  A) porovnávací sada (fixtury, scénáře #560 a skladebné můstky, fuzz se
 *     slevou) — česky; náhled = Word řádek po řádku;
 *  B) zlatá sada VS: víc šachet (s můstky, se slevou) a víc zákazníků
 *     (pohled dalšího zákazníka vzPohled) — náhled = Word;
 *  C) cílené případy: sleva je v náhledu i ve Wordu, II. příplatky hned za
 *     cenou (před III.), DALŠÍ UJEDNÁNÍ, měsíční fakturace, prázdná kapitola
 *     zmizí i s nadpisem, bez příplatků jen nadpis;
 *  D) pojistka srovnávače: starý náhled (nabidkaNahledSekce + příplatky na
 *     konci, bez řádku slevy) se s Wordem NESHODUJE — srovnávač by starý stav
 *     chytil (sleva, pořadí příplatků).
 * Pojistka: na 6092af3 (před NP) modul nahled_word.js neexistuje a sada
 * selže hned na začátku; mutace „bez řádků slevy" a „příplatky až za
 * doložkami" v nahled_word.js shodí A i C — viz zpráva commitu.
 * Spuštění: cd src && node test_np_nahled_word.js */
'use strict';
const path = require('path');
const fs = require('fs');
const ZV = require('../nastroje/zlata_vs.js');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + (info === undefined ? '' : JSON.stringify(info).slice(0, 900))); } };
const kop = x => JSON.parse(JSON.stringify(x));

ZV.pevneHodiny();
for (const f of ZV.CORE) {
  const p = path.join(__dirname, f);
  if (!fs.existsSync(p)) continue;
  const m = require(p);
  if (m && typeof m === 'object') Object.assign(global, m);
}
const ZC = require('./zkusebni_cenik.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const J = JSON.parse(fs.readFileSync(path.join(__dirname, 'jekly.json'), 'utf8'));
let NW = null;
try { NW = require('./nahled_word.js'); Object.assign(global, NW); } catch (e) { NW = null; }
test('modul nahled_word.js existuje a vydá nwBloky / nwHtml / nwTextZHtml / nwTextZDocx',
  !!(NW && NW.nwBloky && NW.nwHtml && NW.nwTextZHtml && NW.nwTextZDocx));
if (!NW) { console.log(`\nVýsledek: ${ok} OK, ${fail} FAIL`); process.exit(1); }

/* ------------------------------------------------------------------------
 * SYNTETICKÁ ŠABLONA CN v17 (document.xml)
 * ---------------------------------------------------------------------- */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const p = t => '<w:p><w:r><w:t xml:space="preserve">' + esc(t) + '</w:t></w:r></w:p>';
const tc = (pars, span) => '<w:tc><w:tcPr>' + (span ? '<w:gridSpan w:val="' + span + '"/>' : '') + '</w:tcPr>'
  + ([].concat(pars).map(p).join('') || '<w:p/>') + '</w:tc>';
const tr_ = (...bunky) => '<w:tr>' + bunky.join('') + '</w:tr>';
const tbl = (...radky) => '<w:tbl><w:tblPr/><w:tblGrid><w:gridCol/><w:gridCol/><w:gridCol/></w:tblGrid>' + radky.join('') + '</w:tbl>';
const pruh = t => tr_(tc(t, 3));
const r2 = (l, v) => tr_(tc(l), tc(v, 2));
const r3 = (l, a, b) => tr_(tc(l), tc(a), tc(b));
const T = NW.NW_TEXT;
/* Pevný text šablony opsaný DOSLOVA ze snímků Wordu CN v17 (word_01–06.png) —
 * ne z NW_TEXT: změna textu v náhledu (nahled_word.js) se tak proti Wordu
 * ukáže jako rozdíl, ne že se změní obě strany naráz. */
const S = {
  hlObjednatel: "Objednatel:",
  hlDatum: "Datum:",
  hlNazev: "Název akce:",
  hlCislo: "Číslo nabídky:",
  hlAdresa: "Adresa stavby / projekt:",
  popisNadpis: "Popis záměru:",
  popisNase: "Naše nabídka obsahuje výrobu, dodání a stavbu MONTOVANÉ ocelové konstrukce výtahové šachty včetně jejího opláštění. Specifikace provedení nabízené šachty je v technické části této nabídky.",
  popisSkladba: "Nabídka se skládá z Technické a Obchodní části. Objednatelem odsouhlasená Technická část bude použita jako příloha smlouvy o dílo nebo závazné objednávky.",
  pohled: "Pohled na objekt z ulice:",
  castA: "A. TECHNICKÁ ČÁST NABÍDKY:",
  tsTitul: "I. TECHNICKÁ SPECIFIKACE VÝTAHOVÉ ŠACHTY",
  tsPozn: "(tato technická specifikace bude použita jako příloha Smlouvy o Dílo nebo závazné objednávky)",
  poznRozmery: "* Uvažované rozměry nabízené šachty vychází ze zadání objednatele. Po přesném zaměření skutečného stavu zhotovitelem se mohou změnit!",
  poznProfily: "** parametry profilů se mohou změnit po zpracování statického posouzení",
  roztec: "svislá rozteč příčníků:",
  castB: "B. OBCHODNÍ ČÁST NABÍDKY:",
  cnTitul: "I. CENOVÁ NABÍDKA:",
  sachta: "VÝTAHOVÁ ŠACHTA",
  sachtaRozsah: "rozsah dodávky dle Technické části nabídky - A. TECHNICKÁ SPECIFIKACE VÝTAHOVÉ ŠACHTY",
  mustky: "MŮSTKY MEZI BUDOVOU A OCK",
  mustkyRozsah: "rozsah dodávky dle Technické části nabídky - MŮSTKY MEZI BUDOVOU A OCK",
  predSlevou: "Cena před slevou",
  sleva: "Sleva",
  slevaHodnota: "− {{SLEVA_KC}} ({{SLEVA_PROC}} %)",
  celkemCena: "CENA CELKEM",
  celkemCenaPopis: "výtahová šachta a můstky mezi budovou a OCK",
  bezDph: "bez DPH",
  dph: "DPH {{DPH_SAZBA}} % ({{DPH_NAZEV}} sazba)",
  celkem: "CELKEM za nabídku",
  vcDph: "včetně DPH",
  poznCena: [
    "Poznámky k cenové nabídce: a. cena vychází z technické specifikace nabídky – viz výše",
    "b. DPH bude účtováno dle aktuálně platných daňových předpisů",
    "c. k úpravě celkové ceny může dojít po přesném zaměření a vyhodnocení statiky"
  ],
  zvyseni: "Dojde-li v průběhu realizace díla k VÝRAZNÉMU zvýšení cen vstupních materiálů, oceli, skla a dopravného a paliv, může zhotovitel cenu díla zvýšit o tento rozdíl. Pro posouzení cenových změn se přihlíží k cenám platným v době uzavření smlouvy o dílo (nebo objednávky) ve srovnání s cenami platnými v době, kdy byl zhotovitel povinen dílo provést.",
  priplatky: "II. ROZŠÍŘENÍ CENOVÉ NABÍDKY – Příplatky:",
  kapIII: "III. PLATEBNÍ PODMÍNKY:",
  splatky: "Cena díla je splatná v následujících dílčích splátkách:",
  mesicne: "Způsob fakturace:",
  poznPlatby: "Poznámky k platebním podmínkám: v případě podepsané rámcové nebo subdodavatelské smlouvy, platí dohodnuté podmínky z těchto smluv. Bude-li potřeba upravit tyto standardní platební podmínky, jsme připraveni k jejich projednání na úrovni vedení společnosti.",
  splatnostNadpis: "Splatnost faktur a platnost nabídky:",
  splatnost: "Splatnost faktur {{PODM_SPLATNOST_DNI_CISLO}} dní ode dne vystavení.",
  platnost: "Platnost této nabídky je {{PODM_PLATNOST_NABIDKY}} od data uvedeného v záhlaví.",
  kapIV: "IV. POŽADAVKY PRO PROVEDENÍ REALIZACE:",
  kapV: "V. TERMÍNY REALIZACE:",
  kapVI: "VI. PŘEDÁNÍ DÍLA:",
  predaniPozn: "Předávací protokol z bodů 1. a 2. lze nahradit oboustranně podepsaným zápisem do montážního deníku.",
  dolozky: "DOLOŽKY:",
  vypracoval: "Vypracoval:",
  tel: "Tel: {{ZPRAC_TEL}}",
  email: "Email: {{ZPRAC_EMAIL}}",
  kancelar: "Kancelář:",
  kIco: "IČ: {{FIRMA_ICO}}",
  kTel: "Tel.: {{FIRMA_TELEFON}}"
};

const TS_SACHTA = [
  ['ZÁKLADNÍ PARAMETRY ŠACHTY', [
    r2('UMÍSTĚNÍ ŠACHTY', '{{TS_UMISTENI}}'), r2('UMÍSTĚNÍ VÝTAHOVÉHO STROJE', '{{TS_UMISTENI_STROJE}}'),
    r2('ULOŽENÍ KONSTRUKCE', '{{TS_ULOZENI}}'), r2('CELKOVÁ VÝŠKA KONSTRUKCE [m] *', '{{TS_VYSKA_CELKOVA}}'),
    r2('ROZMĚR ŠACHTY – VNITŘNÍ [mm] *', 'šířka {{TS_SIRKA_VNITRNI}} × hloubka {{TS_HLOUBKA_VNITRNI}}'),
    r2('ROZMĚR ŠACHTY – VNĚJŠÍ [mm] *', 'šířka {{TS_SIRKA_VNEJSI}} × hloubka {{TS_HLOUBKA_VNEJSI}}'),
    r2('ZDVIH VÝTAHU [m] *', '{{TS_ZDVIH}}'), r2('DOLNÍ PŘEJEZD [mm]', '{{TS_DOLNI_PREJEZD}}'),
    r2('HORNÍ PŘEJEZD [mm]', '{{TS_HORNI_PREJEZD}}'), r3('POČET STANIC / NÁSTUPIŠŤ', '{{TS_STANICE}}', '{{TS_KABINA}}'),
    r2('PŮDORYSNÉ ŘEŠENÍ ŠACHTY', '{{TS_PUDORYS}}'),
    r2('USAZENÍ OCK – ČELNÍ STĚNA', '{{TS_USAZENI_CELNI}}'), r2('USAZENÍ OCK – BOČNÍ STĚNY', '{{TS_USAZENI_BOCNI}}'),
    r2('USAZENÍ OCK – LEVÁ BOČNÍ STĚNA', '{{TS_USAZENI_LEVA}}'), r2('USAZENÍ OCK – PRAVÁ BOČNÍ STĚNA', '{{TS_USAZENI_PRAVA}}'),
    r2('USAZENÍ OCK – ZADNÍ STĚNA', '{{TS_USAZENI_ZADNI}}'), pruh(S.poznRozmery)]],
  ['KONSTRUKČNÍ ŘEŠENÍ ŠACHTY', [
    r2('TYP KONSTRUKCE (ENG-M)', '{{TS_TYP_KONSTRUKCE}}'), r2('SVISLÉ NOSNÉ PRVKY', '{{TS_SVISLE_NOSNE}}'),
    r2('PROFIL SLOUPKŮ **', '{{TS_PROFIL_SLOUPKU}}'), r2('VODOROVNÉ NOSNÉ PRVKY', '{{TS_VODOROVNE_NOSNE}}'),
    r3('', S.roztec, '{{TS_ROZTEC}}'), r2('PROFIL PŘÍČNÍKŮ **', '{{TS_PROFIL_PRICNIKU}}'),
    r2('KOTVENÍ KONSTRUKCE (POLOHA)', '{{TS_KOTVENI_POLOHA}}'), r2('KOTVENÍ KONSTRUKCE (TYP)', '{{TS_KOTVENI_TYP}}'),
    r2('ŘEŠENÍ PORTÁLŮ (PROSTOROVÉ)', '{{TS_PORTALY_PROSTOR}}'), r2('ŘEŠENÍ PORTÁLŮ (ČLENĚNÍ)', '{{TS_PORTALY_CLENENI}}'),
    r2('POVRCHOVÁ ÚPRAVA KONSTRUKCE', '{{TS_POVRCH_UPRAVA}}'), r2('HÁKY PRO ČIŠTĚNÍ ŠACHTY', '{{TS_HAKY}}'),
    r2('STŘECHA ŠACHTY', '{{TS_STRECHA}}'), r2('POŽÁRNÍ KLASIFIKACE KONSTRUKCE', '{{TS_POZARNI}}'), pruh(S.poznProfily)]],
  ['OPLÁŠTĚNÍ ŠACHTY', [
    r2('TYP OPLÁŠTĚNÍ', '{{TS_TYP_OPLASTENI}}'), r2('MATERIÁL OPLÁŠTĚNÍ', '{{TS_MATERIAL_OPLASTENI}}'),
    r2('POVRCHOVÁ ÚPRAVA OPLÁŠTĚNÍ', '{{TS_POVRCH_OPLASTENI}}'), r2('OPLÁŠTĚNÍ ČELA POD NÁSTUPIŠTĚM', '{{TS_OPLASTENI_CELA}}'),
    r2('ROZSAH OPLÁŠTĚNÍ', '{{TS_ROZSAH_OPLASTENI}}'), r2('OPLÁŠTĚNÍ NADSVĚTLÍKŮ', '{{TS_OPLASTENI_NADSVETLIKU}}'),
    r2('SVĚTLÍKY U ŠACHETNÍCH DVEŘÍ', '{{TS_SVETLIKY_DVERI}}'), r2('VNĚJŠÍ OPLÁŠTĚNÍ ŠACHTY', '{{TS_UMISTENI_OPLASTENI}}'),
    r2('ZPŮSOB KOTVENÍ OPLÁŠTĚNÍ', '{{TS_KOTVENI_OPLASTENI}}'), r2('VZHLED KOTVENÍ ZASKLENÍ', '{{TS_PARAMETRY_KOTVY}}'),
    r2('NAPOJENÍ ŠACHETNÍCH DVEŘÍ', '{{TS_NAPOJENI_DVERI}}')]],
  ['DOPLŇKOVÉ KONSTRUKCE', [
    r2('MONTÁŽNÍ NOSNÍK NEBO OKA', '{{TS_MONTAZNI_NOSNIK}}'), r2('PŘÍPRAVA PRO KOTVENÍ VÝTAHU', '{{TS_PRIPRAVA_KOTVENI}}'),
    r2('ODVĚTRÁNÍ ŠACHTY', '{{TS_ODVETRANI}}'), r2('PODCHOZÍ NOSNÁ OCK', '{{TS_PODCHOZI_OCK}}'),
    r2('PROSKLENÁ PŘÍČKA VEDLE ŠACHTY', '{{TS_PROSKLENA_PRICKA}}'), r2('PROSKLENÁ STŘÍŠKA', '{{TS_PROSKLENA_STRISKA}}'),
    r2('MŮSTKY MEZI BUDOVOU A OCK', '{{TS_MUSTKY}}'), r2('PŘECHODOVÉ PLECHY V NÁSTUPIŠTÍCH', '{{TS_PRECHODOVE_PLECHY}}'),
    r2('OPLECHOVÁNÍ SOKLU PROHLUBNĚ', '{{TS_SOKL}}')]],
  ['MŮSTKY MEZI BUDOVOU A OCK', [
    r2('POČET A ROZMĚR', '{{TS_MUSTKY_ROZMER}}'), r2('PODLAHA', '{{TS_MUSTKY_PODLAHA}}'), r2('ZÁBRADLÍ', '{{TS_MUSTKY_ZABRADLI}}'),
    r2('KOTVENÍ MŮSTKŮ', '{{TS_MUSTKY_KOTVENI}}'), r2('SLOUPY NAVÍC', '{{TS_MUSTKY_SLOUPY}}')]],
];
const TS_ZAKAZKA = [
  ['STAVEBNÍ A PŘÍPRAVNÉ PRÁCE', [
    r2('LEŠENÍ – UVNITŘ ŠACHTY', '{{TS_LESENI_UVNITR}}'), r2('LEŠENÍ – VNĚ ŠACHTY', '{{TS_LESENI_VNE}}'),
    r2('ZÁBRANY DO DVEŘNÍCH VSTUPŮ', '{{TS_ZABRANY_VSTUPY}}')]],
  ['PROJEKČNÍ A PŘÍPRAVNÉ PRÁCE', [
    r2('ZAMĚŘENÍ PROSTORŮ 3D SKENEREM', '{{TS_SKEN3D}}'), r2('VÝSTUP ZE ZAMĚŘENÍ PRO OBJEDNATELE', '{{TS_VYSTUP_ZAMERENI}}'),
    r2('ZPRACOVÁNÍ DÍLENSKÉ DOKUMENTACE', '{{TS_DILENSKA_DOK}}'), r2('OVĚŘOVACÍ STATICKÝ VÝPOČET KONSTRUKCE', '{{TS_STATIKA}}')]],
  /* LEŠENÍ VNITŘNÍ šablona nemá — naklonuje ho docxRadkyNavic (jako u v15–v17) */
  ['SOUČÁSTÍ DODÁVKY NENÍ', [
    r2('OSVĚTLENÍ NÁSTUPIŠŤ', '{{TS_NENI_OSVETLENI}}'), r2('NUCENÉ VĚTRÁNÍ ŠACHTY VENTILÁTOREM', '{{TS_NENI_VENTILATOR}}'),
    r2('LEŠENÍ KOLEM OCK PRO PROVEDENÍ OPLÁŠTĚNÍ', '{{TS_NENI_LESENI}}'),
    r2('ODBĚRNÉ MÍSTO EL. ENERGIE PO DOBU REALIZACE', '{{TS_NENI_ODBERNE}}'), r2('ÚLOŽNÉ PROSTORY', '{{TS_NENI_ULOZNE}}'),
    r2('DOZDĚNÍ KOLEM ŠACHETNÍCH DVEŘÍ', '{{TS_NENI_DOZDENI}}'), r2('STAVEBNÍ PŘÍPRAVA', '{{TS_NENI_STAVEBNI}}'),
    r2('OPLECHOVÁNÍ SOKLU PROHLUBNĚ', '{{TS_NENI_SOKL}}'), r2('NAPÁJENÍ VÝTAHU VČET. REVIZNÍ ZPRÁVY', '{{TS_NENI_NAPAJENI}}'),
    r2('PROHLUBEŇ PRO ZALOŽENÍ OCK VE SPRÁVNÉ POZICI A ROZMĚRU', '{{TS_NENI_PROHLUBEN}}'),
    r2('DOSTATEČNÉ PŘÍSTUPOVÉ A MANIPULAČNÍ PROSTORY', '{{TS_NENI_PRISTUP}}')]],
];
const sekceXml = s => s.map(([n, radky]) => pruh(n) + radky.join('')).join('');
const cenaRadek = (popis, hodnota) => tr_(tc(popis), tc(hodnota));
const BEZ = S.bezDph;
const BODY = ''
  + tbl(r2(S.hlObjednatel, ['{{OBJEDNATEL}}', '{{OBJEDNATEL_KONTAKT}}']), r2(S.hlDatum, '{{DATUM}}'), r2(S.hlNazev, '{{NAZEV_AKCE}}'),
    r2(S.hlCislo, '{{CISLO_NABIDKY}}'), r2(S.hlAdresa, '{{ADRESA}}'))
  + p(S.popisNadpis) + p('{{POPIS_ZAMERU_OCK}}') + p(S.popisNase) + p('{{OPLASTENI_VETA}}') + p(S.popisSkladba) + p(S.pohled)
  + p(S.castA)
  + tbl(pruh(S.tsTitul), pruh(S.tsPozn), pruh('{#sachty}'), pruh('{{SACHTA_TS_NAZEV}}'), sekceXml(TS_SACHTA), pruh('{/sachty}'), sekceXml(TS_ZAKAZKA))
  + p(S.castB) + p(S.cnTitul)
  + tbl(pruh('{#sachty}'), cenaRadek(['{{SACHTA_NAZEV}}', '{{SACHTA_POPIS}}'], ['{{SACHTA_CENA_BEZ_DPH}}', BEZ]), pruh('{/sachty}'),
    cenaRadek([S.sachta, S.sachtaRozsah], ['{{CENA_SACHTA_BEZ_DPH}}', BEZ]),
    cenaRadek([S.mustky, S.mustkyRozsah], ['{{CENA_MUSTKY_BEZ_DPH}}', BEZ]),
    cenaRadek(S.predSlevou, '{{CENA_PRED_SLEVOU}}'), cenaRadek(S.sleva, S.slevaHodnota),
    cenaRadek([S.sachta, S.sachtaRozsah], ['{{CENA_BEZ_DPH_SACHTA}}', BEZ]),
    cenaRadek([S.celkemCena, S.celkemCenaPopis, '{{SACHTY_CELKEM_POPIS}}'], ['{{CENA_BEZ_DPH_CELKEM}}', BEZ]),
    cenaRadek(S.dph, '{{DPH_KC}}'), cenaRadek(S.celkem, ['{{CENA_S_DPH}}', S.vcDph]))
  + S.poznCena.map(p).join('') + p(S.zvyseni)
  + p(S.priplatky) + tbl(cenaRadek(['{{PRIP_NAZEV}}', '{{PRIP_POPIS}}'], ['{{PRIP_CENA}}', BEZ]))
  + p(S.kapIII)
  + p('{{PLATBY_SPLATKY_ZAC}}') + tbl(tr_(tc(S.splatky)), tr_(tc('{{PODM_PLATEBNI_KALENDAR}}'))) + p('{{PLATBY_SPLATKY_KON}}')
  + p('{{PLATBY_MESICNE_ZAC}}') + tbl(tr_(tc(S.mesicne)), tr_(tc('{{PODM_FAKTURACE_MESICNE}}'))) + p('{{PLATBY_MESICNE_KON}}')
  + p(S.poznPlatby)
  + tbl(tr_(tc(S.splatnostNadpis)), tr_(tc(S.splatnost)), tr_(tc(S.platnost)))
  + p('{{KAP_IV_ZAC}}') + p(S.kapIV) + tbl(tr_(tc('{{FIRMA_NAB_POZADAVKY}}'))) + p('{{KAP_IV_KON}}')
  + p('{{KAP_V_ZAC}}') + p(S.kapV) + tbl(tr_(tc('{{NAB_KAP_TERMINY}}'))) + p('{{KAP_V_KON}}')
  + p('{{KAP_VI_ZAC}}') + p(S.kapVI) + tbl(tr_(tc('{{FIRMA_NAB_PREDANI}}'))) + p(S.predaniPozn) + p('{{KAP_VI_KON}}')
  + p('{{KAP_DOLOZKY_ZAC}}') + p(S.dolozky) + tbl(tr_(tc('{{FIRMA_NAB_DOLOZKY}}'))) + p('{{KAP_DOLOZKY_KON}}')
  + p(S.vypracoval) + p('{{ZPRAC_JMENO}}') + p('{{ZPRAC_FUNKCE}}') + p(S.tel) + p(S.email)
  + p(S.kancelar) + p('{{FIRMA_NAZEV}}') + p('{{FIRMA_SIDLO_ULICE}}') + p('{{FIRMA_SIDLO_PSC}}  {{FIRMA_SIDLO_MESTO}}')
  + p(S.kIco) + p(S.kTel) + p('{{FIRMA_WEB}}');
const SYMBOLY = new Set(klicePlaceholderu(BODY));

let SABLONA = null;
async function sablona() {
  if (!SABLONA) SABLONA = await docxSestavBlob(BODY).arrayBuffer();
  return SABLONA.slice(0);
}

async function wordText(zak, v, L) {
  const d = nabidkaData(zak, v, J, L, { symboly: SYMBOLY });
  const blob = await docxVyplnSablonu(await sablona(), d.placeholders, d.priplatky, {}, { radkyNavic: d.tsRadkyNavic, sachty: d.sachtyWord || null });
  const pol = await zipPrecti(new Uint8Array(await blob.arrayBuffer()));
  const xml = new TextDecoder().decode(pol.find(x => x.nazev === 'word/document.xml').data);
  return { text: nwTextZDocx(xml), xml };
}
function nahledText(zak, v, L) {
  const d = nabidkaData(zak, v, J, L);           // jako UI: bez symbolů šablony
  return nwTextZHtml(nwHtml(nwBloky(d, L, {})));
}
/* první rozdíl dvou posloupností řádků */
function rozdil(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return { radek: i, word: a.slice(Math.max(0, i - 2), i + 3), nahled: b.slice(Math.max(0, i - 2), i + 3) };
  return null;
}
async function shoda(nazev, zak, v, L) {
  let w, n;
  try { w = await wordText(zak, v, L || 'cz'); n = nahledText(zak, v, L || 'cz'); } catch (e) { test(nazev + ': bez chyby', false, String(e && e.stack || e).slice(0, 400)); return null; }
  const r = rozdil(w.text, n);
  test(nazev + ': náhled = Word (' + w.text.length + ' řádků)', !r && !/\{\{|\{#|\{\//.test(w.text.join('\n')), r || w.text.filter(t => /\{\{/.test(t)).slice(0, 3));
  return { w: w.text, n };
}

/* ---------- zakázky ---------- */
const ZAD = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 };
function nova(cislo, nazev) { const z = novaZakazka(); z.cislo = cislo; z.nazevAkce = nazev; ZV.pevneDatum(z); return z; }
function scenar(typ, uprava, mustkyCenik, fixes) {
  const zak = nova('2026-OPR-CN-9690', 'NP ' + typ);
  const v = zak.varianty[0];
  Object.assign(v.data.ock.zadani, ZAD, { typSachty: typ }, kop(uprava || {}));
  v.data.ock.fixes = fixes !== false;
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), mustkyCenik ? ZC.zkusebniMustky() : {}, { kurzEurKc: 25 });
  return zak;
}
const SKLADBA = { mustekRamBmKc: 10000, mustekPodlahaPlechM2Kc: 1000, mustekPodlahaPororostM2Kc: 1100, mustekPodlahaVanaM2Kc: 1200,
  mustekZabradliKovBmKc: 2000, mustekZabradliSkloBmKc: 5000, mustekKotveniDeskaKc: 3000, mustekKotveniSloupKc: 3100,
  mustekKotveniKonzolaKc: 3200, mustekZabradliSkloMontazHodBm: 1 };
const MUSTKY = [{ ks: 2, sirkaMm: 1600, delkaMm: 1200, podlaha: 'plech', zabradli: 'kov', zabradliStrany: 2, sloupyKs: 2, sloupVyskaM: 3.2 }];
function viceSachet(o) {
  o = o || {};
  const zak = nova('2026-OPR-CN-9691', 'NP víc šachet');
  const v = zak.varianty[0];
  Object.assign(v.data.ock.zadani, ZAD, { typSachty: 'exteriérová' }, o.mustky ? { mustky: kop(MUSTKY) } : {});
  v.data.ock.fixes = true;
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky(), SKLADBA, { kurzEurKc: 25 });
  if (o.sleva) v.data.sleva = { procenta: 5, stav: 'schváleno automaticky', role: 'Obchodník' };
  v.data.ock.nazev = 'Výtah A';
  const zB = Object.assign(kop(DEFAULT_ZADANI), ZAD, { sirka: 2.4, zdvih: 17.325, typSachty: 'interiérová', profily: kop(PROFILY_VYCHOZI['interiérová']) });
  v.data.ock.dalsi = [{ id: 's_b', nazev: 'Výtah B', ks: 2, zadani: zB }];
  return zak;
}
const sleva = (zak, pct) => { const v = zak.varianty[0]; v.data.sleva = Object.assign(v.data.sleva || {}, { procenta: pct, stav: 'schváleno' }); return zak; };

(async () => {
  /* ---------- A) porovnávací sada ---------- */
  let pocetA = 0;
  const fdir = path.join(__dirname, 'fixtury');
  for (const f of fs.readdirSync(fdir).filter(x => x.endsWith('.json')).sort()) {
    const zak = importZakazka(JSON.parse(fs.readFileSync(path.join(fdir, f), 'utf8')));
    for (const v of zak.varianty) { await shoda('A fixtura ' + f + ' ' + v.id, zak, v); pocetA++; }
  }
  const SC = [
    ['ext-354', 'exteriérová', {}, true], ['int-pausal', 'interiérová', {}, false],
    ['stare-2ks-354', 'exteriérová', { mustkyKs: 2, mustekHloubkaMm: 1200 }, true],
    ['stare-zaskrtnuty-pausal', 'interiérová', { mustek: true, mustekHloubkaMm: 900, mustekSirkaMm: 1500 }, false],
    ['skladebne-1', 'exteriérová', { mustky: kop(MUSTKY) }, true],
    ['skladebne-2', 'interiérová', { mustky: [{ ks: 1, sirkaMm: 1200, delkaMm: 900, podlaha: 'pororost', zabradli: 'sklo', zabradliStrany: 1, sloupyKs: 0, sloupVyskaM: 0 },
      { ks: 3, sirkaMm: 1400, delkaMm: 1500, podlaha: 'vana', zabradli: 'bez', zabradliStrany: 0, sloupyKs: 0, sloupVyskaM: 0 }] }, true],
  ];
  for (const [jm, typ, up, cen] of SC) for (const fx of [true, false]) {
    const zak = scenar(typ, up, cen, fx);
    await shoda('A scénář ' + jm + (fx ? ' m2' : ' m1'), zak, zak.varianty[0]); pocetA++;
  }
  const G = ZV.generator(ZC);
  const pocetFuzz = Math.max(0, +process.env.KNG_NP_FUZZ || 120);
  let fuzzSleva = 0;
  for (let i = 0; i < pocetFuzz; i++) {
    const { c } = G.genCenik();
    const { z, fixes, sleva: sl, zaokr } = G.genZadani();
    const zak = nova('2026-OPR-CN-' + (9700 + i), 'NP fuzz ' + i);
    const v = zak.varianty[0];
    v.data.ock.zadani = z; v.data.ock.fixes = fixes; v.data.cenik = Object.assign(c, { kurzEurKc: 25 });
    if (sl && v.data.sleva) { v.data.sleva.procenta = sl; v.data.sleva.stav = 'schváleno'; fuzzSleva++; }
    if (zaokr) v.data.zaokr = Object.assign({}, v.data.zaokr || {}, zaokr);
    await shoda('A fuzz ' + i + (sl ? ' (sleva ' + sl + ' %)' : ''), zak, v); pocetA++;
  }
  test('A sada: aspoň 80 zakázek, z toho aspoň 5 se slevou', pocetA >= 80 && fuzzSleva >= 5, { pocetA, fuzzSleva });

  /* ---------- B) zlatá sada VS / VZ ---------- */
  for (const [jm, o] of [['bez můstků', {}], ['s můstky', { mustky: true }], ['s můstky a slevou', { mustky: true, sleva: true }]]) {
    const zak = viceSachet(o);
    const r = await shoda('B víc šachet ' + jm, zak, zak.varianty[0]);
    if (r) test('B víc šachet ' + jm + ': obě šachty v technické i obchodní části',
      r.n.filter(t => /^VARIANTA ŠACHTY: Výtah [AB]/.test(t)).length === 2 && r.n.some(t => /^Výtah B$/.test(t)) && r.n.some(t => /^šachet celkem: 3 ks$/.test(t)), r.n.filter(t => /Výtah|šachet/.test(t)));
  }
  {
    const zak = sleva(scenar('exteriérová', {}, true), 3);
    const r = vzPridej(zak, { objednatel: 'Druhý zákazník s.r.o.', adresaObjednatele: 'Zkušební 2, 100 00 Praha', ico: '', dic: '', kontakt: 'Zkušební Kontakt' },
      { kdo: 'zlata@priklad.cz', kdy: '2026-11-10T10:00:00.000Z' });
    test('B víc zákazníků: druhý zákazník přidán', r && r.ok, r);
    const pohled = vzPohled(zak, r.zakaznik.id);
    const v = pohled.varianty.find(x => x.id === zak.varianty[0].id);
    const s = await shoda('B víc zákazníků: pohled dalšího zákazníka', pohled, v);
    if (s) test('B víc zákazníků: v hlavičce je další zákazník, ne řídící', s.n[1] === 'Druhý zákazník s.r.o.' && s.n[2] === 'Zkušební Kontakt', s.n.slice(0, 4));
    const ridici = vzPohled(zak, '');
    await shoda('B víc zákazníků: pohled řídícího', ridici, ridici.varianty.find(x => x.id === zak.varianty[0].id));
  }

  /* ---------- C) cílené případy ---------- */
  {
    const zak = sleva(scenar('exteriérová', {}, true), 3);
    const v = zak.varianty[0];
    v.data.techspec = Object.assign(v.data.techspec || {}, { extra: [{ label: 'Vlastní ujednání (TEST)', hodnota: 'Předání dokumentace do 14 dnů (TEST)' }, { label: 'Jen popisek', hodnota: '' }] });
    const r = await shoda('C sleva + DALŠÍ UJEDNÁNÍ', zak, v);
    if (r) {
      const n = r.n, iC = n.indexOf(T.celkem), iS = n.indexOf(T.sleva), iP = n.indexOf(T.predSlevou), iII = n.indexOf(T.priplatky), iIII = n.indexOf(T.kapIII);
      test('C sleva: řádky Cena před slevou a Sleva před cenou a celkem, hodnota „− … (3 %)"', iP > 0 && iS === iP + 2 && iC > iS && /^− .+ \(3 %\)$/.test(n[iS + 1]), n.slice(iP, iC + 2));
      test('C pořadí: II. PŘÍPLATKY hned za cenou (před III.), A před B', iII > iC && iIII > iII && n.indexOf(T.castA) < n.indexOf(T.castB), { iC, iII, iIII });
      test('C DALŠÍ UJEDNÁNÍ za SOUČÁSTÍ DODÁVKY NENÍ, s vlastním řádkem', n.indexOf('DALŠÍ UJEDNÁNÍ') > n.indexOf('SOUČÁSTÍ DODÁVKY NENÍ') && n.indexOf('Vlastní ujednání (TEST)') > n.indexOf('DALŠÍ UJEDNÁNÍ') && n.indexOf('Jen popisek') > 0);
      test('C tabulka DODAVATEL a věta „Přesně tyto hodnoty…" v náhledu nejsou', !n.includes('DODAVATEL') && !n.some(t => /Přesně tyto hodnoty/.test(t)));
    }
    const bez = scenar('interiérová', {}, false);
    const rb = await shoda('C bez slevy', bez, bez.varianty[0]);
    if (rb) test('C bez slevy: řádky slevy nejsou', !rb.n.includes(T.sleva) && !rb.n.includes(T.predSlevou));
  }
  {
    const zak = scenar('interiérová', {}, false);
    const v = zak.varianty[0];
    v.data.ock.zadani.priplatkyVynechat = (v.data.ock.zadani.priplatkyVynechat || []).concat(vypocet(v.data.ock.zadani, v.data.cenik, J, true).priplatky.map(x => x.key));
    const r = await shoda('C bez příplatků', zak, v);
    if (r) test('C bez příplatků: nadpis II. zůstane, hned po něm III.', r.n[r.n.indexOf(T.priplatky) + 1] === T.kapIII);
  }
  {
    const zak = scenar('exteriérová', {}, true);
    const v = zak.varianty[0];
    const d0 = nabidkaData(zak, v, J, 'cz');
    const ph = d0.placeholders;
    /* prázdná kapitola (Firma bez doložek) — přes data náhledu i Wordu */
    const puvodni = global.NAST;
    global.NAST = Object.assign({}, puvodni || {}, { firma: Object.assign({}, firmaAktualni(), { dolozky: '' }) });
    try {
      const r = await shoda('C prázdné doložky', zak, v);
      if (r) test('C prázdné doložky: nadpis DOLOŽKY zmizí v náhledu i ve Wordu', !r.n.includes(T.dolozky) && !r.w.includes(T.dolozky));
    } finally { global.NAST = puvodni; }
    test('C platební kalendář má věty (fixtura testu)', !!String(ph.PODM_PLATEBNI_KALENDAR || '').trim());
  }
  for (const [jm, h, ocek] of [['měsíční fakturace', { zpusobFakturace: 'Měsíční' }, 'mesicne'],
    ['splátka 0 % a vlastní znění', { zaloha1: 'dle rámcové smlouvy', faktura2: '0 % – po zahájení montáže' }, 'splatky']]) {
    const zak = scenar('interiérová', {}, false);
    zak.varianty[0].data.kryci = { hodnoty: h };
    const r = await shoda('C ' + jm, zak, zak.varianty[0]);
    if (r) test('C ' + jm + ': blok ' + (ocek === 'mesicne' ? '„Způsob fakturace:" bez splátek' : 'splátek bez měsíční fakturace'),
      ocek === 'mesicne' ? (r.n.includes(T.mesicne) && !r.n.includes(T.splatky)) : (!r.n.includes(T.mesicne) && r.n.includes(T.splatky)));
  }
  {
    /* Sekce, jejíž všechny hodnoty jsou prázdné („-"), zmizí v náhledu i ve Wordu
     * i s pruhem — reálná data to dávají zřídka, proto přímo nad symboly. */
    const zak = scenar('interiérová', {}, false);
    const v = zak.varianty[0];
    const d = nabidkaData(zak, v, J, 'cz', { symboly: SYMBOLY });
    ['TS_LESENI_UVNITR', 'TS_LESENI_VNE', 'TS_ZABRANY_VSTUPY'].forEach(k => { d.placeholders[k] = ' -'; });
    const pol = await zipPrecti(new Uint8Array(await (await docxVyplnSablonu(await sablona(), d.placeholders, d.priplatky, {}, { radkyNavic: d.tsRadkyNavic })).arrayBuffer()));
    const w = nwTextZDocx(new TextDecoder().decode(pol.find(x => x.nazev === 'word/document.xml').data));
    const n = nwTextZHtml(nwHtml(nwBloky(d, 'cz', {})));
    const r = rozdil(w, n);
    test('C sekce bez hodnot: náhled = Word a pruh STAVEBNÍ A PŘÍPRAVNÉ PRÁCE zmizí v obou', !r && !n.includes('STAVEBNÍ A PŘÍPRAVNÉ PRÁCE') && !w.includes('STAVEBNÍ A PŘÍPRAVNÉ PRÁCE'), r);
  }
  {
    /* angličtina: text šablony přeložený týmž slovníkem (docxPrelozSablonu) */
    const zak = sleva(scenar('exteriérová', {}, true), 3);
    const v = zak.varianty[0];
    const t = await docxPrelozSablonu(await sablona(), 'en', {});
    const d = nabidkaData(zak, v, J, 'en', { symboly: SYMBOLY });
    const pol = await zipPrecti(new Uint8Array(await (await docxVyplnSablonu(await t.arrayBuffer(), d.placeholders, d.priplatky, {}, { radkyNavic: d.tsRadkyNavic })).arrayBuffer()));
    const w = nwTextZDocx(new TextDecoder().decode(pol.find(x => x.nazev === 'word/document.xml').data));
    const n = nwTextZHtml(nwHtml(nwBloky(nabidkaData(zak, v, J, 'en'), 'en', {})));
    /* Hodnoty (všechny řádky s číslem nebo částkou) ve stejném pořadí — pevný
     * text šablony EN je ručně revidovaný a slovník ho nemusí trefit slovo od slova. */
    const hodnoty = a => a.filter(x => /\d/.test(x) && !/[{}]/.test(x));
    const rh = rozdil(hodnoty(w), hodnoty(n));
    test('C EN: hodnoty náhledu = hodnoty Wordu (v pořadí), v eurech', !rh && n.some(x => /€|EUR/.test(x)) && !n.some(x => /Kč/.test(x)), rh || n.filter(x => /Kč/.test(x)).slice(0, 3));
  }

  /* ---------- D) pojistka srovnávače: starý náhled ≠ Word ---------- */
  {
    const zak = sleva(scenar('exteriérová', {}, true), 3);
    const v = zak.varianty[0];
    const d = nabidkaData(zak, v, J, 'cz');
    const w = (await wordText(zak, v, 'cz')).text;
    const stary = [];
    nabidkaNahledSekce(d.placeholders, 'cz', d.platbyOck, d.tsExtra, d.sachty).forEach(s => {
      stary.push(s.sekce); s.radky.forEach(r => { stary.push(r[0]); if (!nwPrazdna(r[1])) stary.push(String(r[1])); });
    });
    stary.push('II. ROZŠÍŘENÍ CENOVÉ NABÍDKY – PŘÍPLATKY');
    d.priplatky.forEach(pr => { stary.push(pr.nazev); stary.push(pr.cena + ' bez DPH'); });
    test('D starý náhled se s Wordem NESHODUJE (srovnávač by ho chytil)', !!rozdil(w, stary));
    test('D starý náhled nemá řádek slevy, Word ano', !stary.includes(T.sleva) && w.includes(T.sleva));
    const iPw = w.indexOf(T.priplatky), iIIIw = w.indexOf(T.kapIII), iPs = stary.indexOf('II. ROZŠÍŘENÍ CENOVÉ NABÍDKY – PŘÍPLATKY');
    test('D starý náhled má příplatky až za kapitolami, Word hned za cenou', iPw < iIIIw && iPs > stary.indexOf('III. PLATEBNÍ PODMÍNKY'), { iPw, iIIIw, iPs });
  }

  /* ---------- E) upozornění v pruhu ---------- */
  {
    const zak = scenar('exteriérová', {}, true);
    const v = zak.varianty[0];
    const d = nabidkaData(zak, v, J, 'cz');
    const u = nwVarovani(d, zak, { foto: '' });
    test('E upozornění: chybí fotka a popis záměru', u.some(x => /fotka/.test(x)) && u.some(x => /Popis záměru/.test(x)), u);
    zak.popisZameru = 'Vlastní popis.';
    test('E upozornění: vyplněný popis a fotka se nehlásí', !nwVarovani(d, zak, { foto: 'data:image/png;base64,AAAA' }).some(x => /fotka|Popis záměru/.test(x)));
  }

  console.log(`\nVýsledek: ${ok} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
