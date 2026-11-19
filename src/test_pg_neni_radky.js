/* PG #2 (J. V. 19. 11. 2026) — VLASTNÍ ŘÁDEK V SEKCI „SOUČÁSTÍ DODÁVKY NENÍ".
 *
 * „+ přidat vlastní řádek" ve specifikaci OCK dosud plnil jen sekci DALŠÍ
 * UJEDNÁNÍ. Obchodník teď u řádku volí sekci (`techspec.extra[i].sekce`:
 * chybí = DALŠÍ UJEDNÁNÍ, 'neni' = SOUČÁSTÍ DODÁVKY NENÍ). Řádek se sekcí
 * 'neni' stojí na KONCI sekce SOUČÁSTÍ DODÁVKY NENÍ ve všech výstupech:
 *   A) data nabídky (nabidkaData.tsExtra nese `neni: true`, tsRadkyNavic
 *      klonuje řádek za {{TS_NENI_PRISTUP}} PŘED pruh DALŠÍ UJEDNÁNÍ);
 *   B) online náhled (nabidkaNahledSekce) — konec sekce NENÍ, DALŠÍ
 *      UJEDNÁNÍ jen s ostatními řádky (bez nich sekce není);
 *   C) Word — syntetická CN v15 → v16 → v17 (nástroj vyrob_sablony), jedna
 *      i víc šachet: řádek po řádku „…MANIPULAČNÍ PROSTORY", vlastní řádek
 *      NENÍ, pruh DALŠÍ UJEDNÁNÍ, vlastní řádek DALŠÍ; u víc šachet jednou;
 *   D) překlady EN/DE/FR (známá fráze přeložená, neznámá zůstane);
 *   E) starší zakázka bez pole `sekce` = beze změny (vše v DALŠÍ UJEDNÁNÍ,
 *      Word bajt po bajtu shodný s výstupem bez nové logiky).
 * Pojistka: před opravou (nad origin/claude/integrace-16-10) řádek se sekcí
 * 'neni' končil v DALŠÍ UJEDNÁNÍ — testy A, B, C, D selžou; viz commit.
 * Spuštění: node src/test_pg_neni_radky.js */
'use strict';
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./preklad.js');
const E = nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./vice_sachet.js');
nacti('./techspec.js'); nacti('./sleva.js'); nacti('./zaokrouhleni.js'); nacti('./firma.js');
const ZK = nacti('./zakazka.js');
nacti('./zamek.js');
const N = nacti('./nabidka.js');
const DG = nacti('./docxgen.js');
const J = require('./jekly.json');
const vyrob = require('../nastroje/vyrob_sablony.js');
global.NAST = { firma: global.firmaDefault() };

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 700)); } };
const kop = x => JSON.parse(JSON.stringify(x));
const dec = new TextDecoder(), enc = new TextEncoder();

const NENI = 'SOUČÁSTÍ DODÁVKY NENÍ', DALSI = 'DALŠÍ UJEDNÁNÍ';
/* známá fráze (je ve slovníku) a neznámá */
const RN = { label: 'LEŠENÍ VNITŘNÍ PRO STAVBU OCK', hodnota: 'zajistí objednatel v rámci SP', sekce: 'neni' };
const RN2 = { label: 'ODVOZ SUTI', hodnota: 'objednatel', sekce: 'neni' };
const RD = { label: 'PŘEDÁNÍ STAVENIŠTĚ', hodnota: 'do 14 dnů' };
const ZAD = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 };
function zakazka(extra, o) {
  o = o || {};
  const zak = ZK.novaZakazka();
  zak.cislo = '2026-OPR-CN-9702'; zak.nazevAkce = 'PG vlastní řádky';
  const v = zak.varianty[0];
  Object.assign(v.data.ock.zadani, ZAD, { typSachty: 'exteriérová' });
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), { kurzEurKc: 25 });
  v.data.techspec.extra = kop(extra);
  if (o.vice) {
    v.data.ock.nazev = 'Výtah A';
    const zB = Object.assign(kop(E.DEFAULT_ZADANI), ZAD, { sirka: 2.4, typSachty: 'interiérová',
      profily: kop(E.PROFILY_VYCHOZI['interiérová']) });
    v.data.ock.dalsi = [{ id: 's_b', nazev: 'Výtah B', ks: 2, zadani: zB }];
  }
  return zak;
}
const nd = (z, ...a) => N.nabidkaData(z, z.varianty[0], ...a);
const P = (t, L) => (L && L !== 'cz') ? tr(t, L) : t;
const sek = (data, L) => N.nabidkaNahledSekce(data.placeholders, L || 'cz', data.platbyOck, data.tsExtra, data.sachty);
const najdi = (s, nazev) => s.find(x => (typeof x.sekce === 'string' ? x.sekce : (x.sekce && x.sekce.hotovo)) === nazev);
const popisek = r => (r && typeof r[0] === 'object') ? r[0].hotovo : r && r[0];

/* syntetická CN v15 — jako v test_vs_docx_v17, sekce NENÍ s kotvou {{TS_NENI_PRISTUP}} */
async function sablonaV15() {
  return DG.zipPrecti(new Uint8Array(await DG.docxDokumentBlob('Nabídka', [
    { sekce: 'ZÁKLADNÍ PARAMETRY ŠACHTY', radky: [['ROZMĚR ŠACHTY – VNITŘNÍ [mm]', 'šířka {{TS_SIRKA_VNITRNI}} × hloubka {{TS_HLOUBKA_VNITRNI}}'],
      ['ZDVIH VÝTAHU [m]', '{{TS_ZDVIH}}'], ['USAZENÍ OCK – ČELNÍ STĚNA', '{{TS_USAZENI_CELNI}}'], ['USAZENÍ OCK – BOČNÍ STĚNY', '{{TS_USAZENI_BOCNI}}'],
      ['USAZENÍ OCK – LEVÁ BOČNÍ STĚNA', '{{TS_USAZENI_LEVA}}'], ['USAZENÍ OCK – PRAVÁ BOČNÍ STĚNA', '{{TS_USAZENI_PRAVA}}'],
      ['USAZENÍ OCK – ZADNÍ STĚNA', '{{TS_USAZENI_ZADNI}}']] },
    { sekce: 'KONSTRUKČNÍ ŘEŠENÍ ŠACHTY', radky: [['STŘECHA ŠACHTY', '{{TS_STRECHA}}'], ['TYP KONSTRUKCE (ENG-M)', '{{TS_TYP_KONSTRUKCE}}']] },
    { sekce: 'OPLÁŠTĚNÍ ŠACHTY', radky: [['TYP OPLÁŠTĚNÍ', '{{TS_TYP_OPLASTENI}}'], ['SVĚTLÍKY U ŠACHETNÍCH DVEŘÍ', '{{TS_SVETLIKY_DVERI}}']] },
    { sekce: 'DOPLŇKOVÉ KONSTRUKCE', radky: [['MŮSTKY MEZI BUDOVOU A OCK', '{{TS_MUSTKY}}'], ['PŘECHODOVÉ PLECHY V NÁSTUPIŠTÍCH', '{{TS_PRECHODOVE_PLECHY}}'],
      ['OPLECHOVÁNÍ SOKLU PROHLUBNĚ', '{{TS_SOKL}}']] },
    { sekce: 'STAVEBNÍ A PŘÍPRAVNÉ PRÁCE', radky: [['LEŠENÍ – UVNITŘ ŠACHTY', '{{TS_LESENI_UVNITR}}'], ['ZÁBRANY DO DVEŘNÍCH VSTUPŮ', '{{TS_ZABRANY_VSTUPY}}']] },
    { sekce: NENI, radky: [['OSVĚTLENÍ NÁSTUPIŠŤ', '{{TS_NENI_OSVETLENI}}'], ['OPLECHOVÁNÍ SOKLU PROHLUBNĚ', '{{TS_NENI_SOKL}}'],
      ['DOSTATEČNÉ PŘÍSTUPOVÉ A MANIPULAČNÍ PROSTORY', '{{TS_NENI_PRISTUP}}']] },
    { sekce: 'CENA', radky: [['Cena před slevou', '{{CENA_PRED_SLEVOU}}'], ['Sleva', '− {{SLEVA_KC}} ({{SLEVA_PROC}} %)'],
      ['VÝTAHOVÁ ŠACHTA', '{{CENA_BEZ_DPH}} bez DPH'], ['CELKEM za nabídku', '{{CENA_S_DPH}} včetně DPH']] }]).arrayBuffer()));
}
const sDoc = (pol, fn) => pol.map(p => p.nazev === 'word/document.xml' ? Object.assign({}, p, { data: enc.encode(fn(dec.decode(p.data))) }) : p);
const docXml = pol => dec.decode(pol.find(p => p.nazev === 'word/document.xml').data);
async function prelozena(pol, L) {
  const b = await DG.docxPrelozSablonu(await DG.zipZapis(pol).arrayBuffer(), L, {});
  return DG.zipPrecti(new Uint8Array(await b.arrayBuffer()));
}
async function vypln(pol, data) {
  const buf = await DG.zipZapis(pol).arrayBuffer();
  const blob = await DG.docxVyplnSablonu(buf, data.placeholders, [], {}, { radkyNavic: data.tsRadkyNavic, sachty: data.sachtyWord || null });
  const ab = await blob.arrayBuffer();
  const vys = await DG.zipPrecti(new Uint8Array(ab));
  return { xml: dec.decode(vys.find(p => p.nazev === 'word/document.xml').data), vady: await DG.docxXmlVady(ab) };
}
/* řádky tabulek jako seznam „popisek | hodnota" (entity XML zpět na znaky) */
const ent = t => t.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const radky = x => ent(x).split('</w:tr>').map(r => (r.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) || []).map(t => t.replace(/<[^>]*>/g, '')).join('').length
  ? (r.match(/<w:tc[\s>][\s\S]*?<\/w:tc>/g) || []).map(c => (c.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) || []).map(t => t.replace(/<[^>]*>/g, '')).join('').trim()).join(' | ')
  : null).filter(Boolean);

(async () => {
  /* ---------- A) data ---------- */
  {
    const d = nd(zakazka([RD, RN, RN2]), J, 'cz');
    test('A tsExtra: řádky se sekcí neni nesou neni:true, ostatní ne',
      d.tsExtra.length === 3 && !d.tsExtra[0].neni && d.tsExtra[1].neni === true && d.tsExtra[2].neni === true, d.tsExtra);
    const rn = d.tsRadkyNavic.filter(x => x.kotva === 'TS_NENI_PRISTUP');
    test('A tsRadkyNavic: nejdřív řádky NENÍ (v pořadí), pak pruh DALŠÍ UJEDNÁNÍ a jeho řádek',
      rn.length === 4 && rn[0].nazev === RN.label && rn[1].nazev === RN2.label && rn[2].pruh && rn[2].nazev === DALSI && rn[3].nazev === RD.label,
      rn.map(x => x.nazev));
    const jenNeni = nd(zakazka([RN]), J, 'cz').tsRadkyNavic.filter(x => x.kotva === 'TS_NENI_PRISTUP');
    test('A jen řádky NENÍ: žádný pruh DALŠÍ UJEDNÁNÍ', jenNeni.length === 1 && !jenNeni.some(x => x.pruh), jenNeni);
  }

  /* ---------- B) online náhled ---------- */
  {
    const s = sek(nd(zakazka([RD, RN, RN2]), J, 'cz'));
    const n = najdi(s, NENI), d = najdi(s, DALSI);
    const posl = n ? n.radky.slice(-3).map(popisek) : [];
    test('B náhled: vlastní řádky NENÍ na konci sekce SOUČÁSTÍ DODÁVKY NENÍ (za MANIPULAČNÍ PROSTORY)',
      posl[0] === 'DOSTATEČNÉ PŘÍSTUPOVÉ A MANIPULAČNÍ PROSTORY' && posl[1] === RN.label && posl[2] === RN2.label
      && n.radky.slice(-2)[0][1] === RN.hodnota, posl);
    test('B náhled: DALŠÍ UJEDNÁNÍ má jen svůj řádek', d && d.radky.length === 1 && popisek(d.radky[0]) === RD.label, d);
    const s2 = sek(nd(zakazka([RN]), J, 'cz'));
    test('B náhled: jen řádky NENÍ → sekce DALŠÍ UJEDNÁNÍ není', !najdi(s2, DALSI) && najdi(s2, NENI).radky.some(r => popisek(r) === RN.label));
  }

  /* ---------- D) překlady ---------- */
  for (const L of ['en', 'de', 'fr']) {
    const d = nd(zakazka([RD, RN, RN2]), J, L);
    const n = najdi(sek(d, L), P(NENI, L));
    const posl = n ? n.radky.slice(-2) : [];
    test('D ' + L + ': řádek NENÍ přeložený na konci přeložené sekce, neznámá fráze zůstala',
      trStav(RN.label, L).prelozeno && popisek(posl[0]) === tr(RN.label, L) && posl[0][1] === tr(RN.hodnota, L) && popisek(posl[1]) === RN2.label,
      posl);
  }

  /* ---------- C) Word v16 a v17 (jedna i víc šachet) ---------- */
  const p15 = await sablonaV15();
  const p16 = sDoc(p15, vyrob.cnV16);
  const p17 = sDoc(p16, vyrob.cnV17);
  const sym16 = new Set(DG.klicePlaceholderu(docXml(p16)));
  const sym17 = new Set(DG.klicePlaceholderu(docXml(p17)));
  const ocek = (L) => [
    P('DOSTATEČNÉ PŘÍSTUPOVÉ A MANIPULAČNÍ PROSTORY', L), P(RN.label, L), RN2.label, P(DALSI, L), P(RD.label, L)];
  const poradi = (rr, L) => {
    const ix = ocek(L).map(t => rr.findIndex(r => r.split(' | ')[0].toLowerCase() === String(t).toLowerCase()));
    return { ix, ok: ix.every(i => i >= 0) && ix.every((i, k) => k === 0 || i === ix[k - 1] + 1) };
  };
  for (const [jm, pol, sym] of [['v16', p16, sym16], ['v17', p17, sym17]]) {
    const z = zakazka([RD, RN, RN2]);
    const { xml, vady } = await vypln(pol, nd(z, J, 'cz', { symboly: sym }));
    const rr = radky(xml), po = poradi(rr, 'cz');
    test('C Word ' + jm + ' jedna šachta: MANIPULAČNÍ PROSTORY → řádky NENÍ → pruh DALŠÍ UJEDNÁNÍ → jeho řádek', po.ok, [po.ix, rr.slice(-12)]);
    test('C Word ' + jm + ': hodnota řádku NENÍ ve druhé buňce, XML bez vad',
      rr.some(r => r === RN.label + ' | ' + RN.hodnota) && vady.length === 0, vady);
  }
  {
    const z = zakazka([RD, RN], { vice: true });
    const d = nd(z, J, 'cz', { symboly: sym17 });
    test('C víc šachet: data nesou šachty pro smyčku', !!d.sachtyWord);
    const { xml, vady } = await vypln(p17, d);
    const rr = radky(xml);
    const kolik = rr.filter(r => r.startsWith(RN.label + ' |')).length;
    const iN = rr.findIndex(r => r.startsWith(RN.label + ' |'));
    test('C Word v17 víc šachet: řádek NENÍ jednou, hned za MANIPULAČNÍ PROSTORY, před pruhem DALŠÍ UJEDNÁNÍ',
      kolik === 1 && /MANIPULAČNÍ PROSTORY/.test(rr[iN - 1]) && rr[iN + 1] === DALSI && vady.length === 0 && !/\{\{|sachty\}/.test(xml),
      [kolik, rr.slice(iN - 1, iN + 3), vady]);
  }
  for (const L of ['en', 'de', 'fr']) {
    const t17 = await prelozena(p17, L);
    const { xml } = await vypln(t17, nd(zakazka([RD, RN, RN2]), J, L, { symboly: sym17 }));
    const po = poradi(radky(xml), L);
    test('C Word v17 ' + L + ' (přeložená šablona): pořadí a překlad řádků NENÍ', po.ok, [po.ix, radky(xml).slice(-10)]);
  }

  /* ---------- E) starší zakázka bez pole `sekce` ---------- */
  {
    const stara = [{ label: RN.label, hodnota: RN.hodnota }, RD];
    const d = nd(zakazka(stara), J, 'cz');
    const s = sek(d);
    test('E starší zakázka: oba řádky v DALŠÍ UJEDNÁNÍ, sekce NENÍ beze změny',
      najdi(s, DALSI).radky.length === 2 && popisek(najdi(s, NENI).radky.slice(-1)[0]) === 'DOSTATEČNÉ PŘÍSTUPOVÉ A MANIPULAČNÍ PROSTORY'
      && d.tsExtra.every(e => !('neni' in e)));
    const { xml } = await vypln(p16, nd(zakazka(stara), J, 'cz', { symboly: sym16 }));
    const rr = radky(xml), i = rr.findIndex(r => r.startsWith('DOSTATEČNÉ PŘÍSTUPOVÉ'));
    test('E starší zakázka Word: za MANIPULAČNÍ PROSTORY hned pruh DALŠÍ UJEDNÁNÍ a oba řádky',
      rr[i + 1] === DALSI && rr[i + 2].startsWith(RN.label) && rr[i + 3].startsWith(RD.label), rr.slice(i, i + 4));
    test('E model: tsExtraNeni jen pro sekce=neni', tsExtraNeni(RN) && !tsExtraNeni(RD) && !tsExtraNeni({ sekce: 'dalsi' }) && !tsExtraNeni(null));
  }

  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
