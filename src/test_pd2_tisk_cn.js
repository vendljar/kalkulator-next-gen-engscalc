/* PD2 #771 — vady tisku cenové nabídky CN (posudek CN-432, J. V. 25. 11. 2026):
 *   V1 nadpis „Pohled na objekt z ulice:“ bez fotky se netiskne (Word i online tisk),
 *   V2 řádek „Tel:“ bez telefonu zpracovatele se netiskne,
 *   V4 konečná faktura s pořadím a procentem (všechny splátky očíslované) —
 *      jen nová nabídka; odeslaná před PD2 se dotiskne s větou, se kterou odešla.
 *   #800 (K61-N1) šachta bez opláštění: z bloku Opláštění šachty jen „TYP OPLÁŠTĚNÍ:
 *      bez opláštění“ (Word i online, všechny jazyky); odeslaná před PD2 beze změny.
 * (V3 vypuštěn rozhodnutím J. V.; V5 a V6 čekají na odpověď koordinace — šablona.)
 * Generátor maže JEN odstavec, jehož celý text je samotný popisek; Tel a Email
 * v jednom odstavci, odstavec s obrázkem a vyplněný popisek zůstanou.
 * Pojistka: před PD2 chybí odstranOdstavceSTextem / docxPopiskyBezHodnoty a konečná
 * věta pořadí nemá — sada selže. Spuštění: node src/test_pd2_tisk_cn.js */
'use strict';
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js'); const PR = nacti('./preklad.js'); const DG = nacti('./docxgen.js'); nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik(); nacti('./engine_proj.js'); global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./vice_sachet.js'); nacti('./techspec.js'); nacti('./sleva.js'); nacti('./zaokrouhleni.js'); nacti('./firma.js');
nacti('./plan_plateb.js'); const zk = nacti('./zakazka.js'); const ZM = nacti('./zamek.js'); nacti('./podminky.js');
const KR = nacti('./kryci.js'); nacti('./kryci_proj.js'); const N = nacti('./nabidka.js'); const NP = nacti('./nabidka_proj.js');
const NW = nacti('./nahled_word.js');
const J = require('./jekly.json');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 500)); } };
global.NAST = { firma: global.firmaDefault() };
const FOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
const novaZ = () => { const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 0771'; z.nazevAkce = 'PD2 CN-432'; z.objednatel = 'Zkušební s.r.o.';
  z.projHlavicka.cislo = '2026 - OVP - CN - 0771'; z.varianty[0].data.proj.cenik = ZC.zkusebniCenikProj(); return z; };

/* ---------- V1, V2: generátor (syntetická šablona) ---------- */
const p = t => '<w:p><w:r><w:t xml:space="preserve">' + t + '</w:t></w:r></w:p>';
const dok = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
  + p('Pohled na objekt z ulice:') + p('Popis: {{UVODNI_FOTO_POPIS}}') + p('Vypracoval:') + p('Tel: {{ZPRAC_TEL}}') + p('Email: {{ZPRAC_EMAIL}}')
  + p('Tel: {{ZPRAC_TEL}}, Email: {{ZPRAC_EMAIL}}')
  + '<w:tbl><w:tr><w:tc>' + p('Tel: {{ZPRAC_TEL}}') + '</w:tc></w:tr></w:tbl><w:sectPr/></w:body></w:document>';
const zip = async xml => (await DG.zipZapis([{ nazev: '[Content_Types].xml', data: new TextEncoder().encode('<Types/>') },
  { nazev: 'word/document.xml', data: new TextEncoder().encode(xml) }])).arrayBuffer();
const text = async (ph, volby) => {
  const blob = await DG.docxVyplnSablonu(await zip(dok), ph, [], {}, volby);
  const pol = await DG.zipPrecti(new Uint8Array(await blob.arrayBuffer()));
  const x = new TextDecoder().decode(pol.find(q => q.nazev === 'word/document.xml').data);
  return { x, t: (x.match(/<w:t[^>]*>[^<]*<\/w:t>/g) || []).map(s => s.replace(/<[^>]+>/g, '')).join('|') };
};
(async () => {
  test('pojistka: docxgen má odstranOdstavceSTextem a docxPopiskyBezHodnoty', typeof DG.odstranOdstavceSTextem === 'function'
    && typeof DG.docxPopiskyBezHodnoty === 'function');
  if (typeof DG.docxPopiskyBezHodnoty === 'function') {
    const bez = DG.docxPopiskyBezHodnoty({ foto: false, tel: '' });
    const s = await text({ ZPRAC_TEL: '', ZPRAC_EMAIL: 'a@priklad.cz', UVODNI_FOTO_POPIS: '' }, { odstavceTextPryc: bez });
    test('V1: bez fotky nadpis „Pohled na objekt z ulice:“ zmizí', !/Pohled na objekt/.test(s.t), s.t);
    test('V2: „Tel:“ bez čísla zmizí jako samostatný odstavec (i v buňce tabulky — zůstane prázdný odstavec)',
      (s.t.match(/Tel:/g) || []).length === 1 && /<w:tc><w:p\/><\/w:tc>/.test(s.x), s.t);
    test('V2: Tel a Email v jednom odstavci zůstanou (nic se nesmaže)', /Tel: , Email: a@priklad\.cz/.test(s.t), s.t);
    test('ostatní odstavce zůstanou (Vypracoval, Email)', /Vypracoval:/.test(s.t) && /\|Email: a@priklad\.cz/.test(s.t), s.t);
    const s2 = await text({ ZPRAC_TEL: '123 456 789', ZPRAC_EMAIL: 'a@priklad.cz' }, { odstavceTextPryc: DG.docxPopiskyBezHodnoty({ foto: true, tel: '123 456 789' }) });
    test('s fotkou a telefonem se nic nemaže', /Pohled na objekt z ulice:/.test(s2.t) && (s2.t.match(/Tel: 123 456 789/g) || []).length === 3, s2.t);
    test('s telefonem a fotkou nejsou v seznamu ani „Tel:“, ani nadpis fotky', DG.docxPopiskyBezHodnoty({ foto: true, tel: '123' }).length === 0,
      DG.docxPopiskyBezHodnoty({ foto: true, tel: '123' }));
    test('popisky EN: „Phone:“ podle slovníku (překlad šablony po úsecích)', DG.docxPopiskyBezHodnoty({ tel: '', foto: true, P: t => PR.tr(t, 'en') }).indexOf('Phone:') >= 0);
  }

  /* ---------- V1, V2: data nabídky OCK i PROJ ---------- */
  {
    const z = novaZ(), v = z.varianty[0];
    const d = N.nabidkaData(z, v, J, 'cz');
    test('V1/V2 OCK: bez fotky a bez telefonu → odstavceTextPryc s nadpisem i „Tel:“', Array.isArray(d.odstavceTextPryc)
      && d.odstavceTextPryc.includes('Pohled na objekt z ulice:') && d.odstavceTextPryc.includes('Tel:'), d.odstavceTextPryc);
    z.uvodniFoto = FOTO;
    const d2 = N.nabidkaData(z, v, J, 'cz');
    test('V1 OCK: s fotkou nadpis zůstává', Array.isArray(d2.odstavceTextPryc) && !d2.odstavceTextPryc.includes('Pohled na objekt z ulice:'), d2.odstavceTextPryc);
    const dp = NP.nabidkaProjData(z, v, 'cz');
    test('V1/V2 PROJ: totéž (vlastní fotka PROJ — chybí → nadpis pryč)', Array.isArray(dp.odstavceTextPryc)
      && dp.odstavceTextPryc.includes('Pohled na objekt z ulice:') && dp.odstavceTextPryc.includes('Tel:'), dp.odstavceTextPryc);
    /* Online tisk (náhled ve tvaru Wordu). */
    const html = NW.nwHtml(NW.nwBloky(N.nabidkaData(novaZ(), novaZ().varianty[0], J, 'cz'), 'cz', { foto: '' }));
    test('V1/V2 online tisk: bez fotky bez nadpisu, bez telefonu bez „Tel:“', !/Pohled na objekt z ulice/.test(html) && !/>Tel: </.test(html) && !/>Tel:<\/p>/.test(html));
    /* Dotisk nabídky odeslané PŘED PD2 (snímky podmínek bez značky pd2Tisk) — popisky zůstanou. */
    const zs = novaZ(), vs = zs.varianty[0];
    vs.data.kryci = { hodnoty: {}, zmrazenoPodminky: { v: 1, vety: {} } };
    vs.data.kryciProj = { hodnoty: {}, zmrazenoPodminky: { v: 1, nabidkaProj: {} } };
    vs.zamek = { zamceno: true, typ: 'nabidka', kdy: '2026-11-20T10:00:00Z' };
    const dos = N.nabidkaData(zs, vs, J, 'cz'), dosP = NP.nabidkaProjData(zs, vs, 'cz');
    test('dotisk odeslané před PD2: OCK i PROJ popisky nemažou (týž papír)', !(dos.odstavceTextPryc || []).length && !(dosP.odstavceTextPryc || []).length,
      [dos.odstavceTextPryc, dosP.odstavceTextPryc]);
    const htmlS = NW.nwHtml(NW.nwBloky(dos, 'cz', { foto: '' }));
    test('dotisk odeslané před PD2: online tisk nadpis fotky i „Tel:“ ponechá', /Pohled na objekt z ulice/.test(htmlS) && /Tel:/.test(htmlS));
    vs.data.kryci.zmrazenoPodminky.pd2Tisk = 1; vs.data.kryciProj.zmrazenoPodminky.pd2Tisk = 1;
    test('odeslaná po PD2 (značka): popisky pryč i při dotisku', N.nabidkaData(zs, vs, J, 'cz').odstavceTextPryc.includes('Tel:')
      && NP.nabidkaProjData(zs, vs, 'cz').odstavceTextPryc.includes('Tel:'));
    const html2 = NW.nwHtml(NW.nwBloky(d2, 'cz', { foto: FOTO }));
    test('V1 online tisk: s fotkou nadpis i obrázek', /Pohled na objekt z ulice/.test(html2) && /nw-foto/.test(html2));
  }

  /* ---------- V4: konečná faktura s pořadím a procentem ---------- */
  {
    const z = novaZ(), v = z.varianty[0];
    const posl = s => String(s.PODM_PLATEBNI_KALENDAR || '').split('\n').pop();
    const sym = (zz, vv, L = 'cz') => KR.kryciPlatebniSymboly(KR.kryciPlatebniKalendar(zz, vv, J), L === 'cz' ? (x => x) : (t => PR.tr(t, L)), L);
    test('V4: neodeslaná nabídka — „3. konečný daňový doklad ve výši 10 % (bez DPH)…“', /bude vystaven 3\. konečný daňový doklad ve výši 10 % \(bez DPH\)/.test(posl(sym(z, v))), posl(sym(z, v)));
    test('V4: EN / DE / FR přeloženo (žádná čeština)', ['en', 'de', 'fr'].every(L => !/konečný/.test(posl(sym(z, v, L))) && /\b3/.test(posl(sym(z, v, L)))),
      ['en', 'de', 'fr'].map(L => posl(sym(z, v, L))));
    /* Odeslaná PŘED PD2: snímek podmínek bez značky → stará věta. */
    KR.kryciZmrazPodminky(z, v);
    ZM.zamkniVariantu(v, { typ: 'nabidka', kdo: 'Test', cislo: z.cislo });
    test('V4: nový zámek nese značku pd2Tisk ve snímku podmínek', v.data.kryci.zmrazenoPodminky && v.data.kryci.zmrazenoPodminky.pd2Tisk === 1);
    test('V4: odeslaná po PD2 (se značkou) → nová věta i při dotisku', /3\. konečný daňový doklad ve výši 10 %/.test(posl(sym(z, v))), posl(sym(z, v)));
    delete v.data.kryci.zmrazenoPodminky.pd2Tisk;
    test('V4: odeslaná PŘED PD2 (snímek bez značky) → dotisk se starou větou „na zbývající část“',
      /konečný daňový doklad na zbývající část/.test(posl(sym(z, v))), posl(sym(z, v)));
    /* Vlastní znění věty z Firmy se nepřepisuje. */
    const z2 = novaZ();
    global.NAST.firma.podminky = { v: 1, vety: { konecna: { cz: 'Vlastní věta konečné faktury.' } } };
    test('V4: vlastní znění konečné věty z Firmy zůstává', posl(sym(z2, z2.varianty[0])) === 'Vlastní věta konečné faktury.', posl(sym(z2, z2.varianty[0])));
    delete global.NAST.firma.podminky;
  }
  /* ---------- #800 (K61-N1): šachta bez opláštění ---------- */
  {
    const bez = () => ({ odM: 0, pasy: [{ typ: 'bez', doM: null }] });
    const BEZ = { oplasteni: { rezim: 'poStenach', steny: { A: bez(), B: bez(), C: bez(), D: bez() } },
      nadDvermi: 'stavba', bokyDveri: 'stavba', svetlikNadDvermi: false, svetlikyBoky: 0, kalkVerze: 2,
      sirka: 1.6, hloubka: 2, zdvih: 12, prejezd: 3.3, prohluben: 1.2, nastupiste: 5 };
    const KLICE = ['TS_MATERIAL_OPLASTENI', 'TS_POVRCH_OPLASTENI', 'TS_OPLASTENI_CELA', 'TS_ROZSAH_OPLASTENI', 'TS_OPLASTENI_NADSVETLIKU',
      'TS_UMISTENI_OPLASTENI', 'TS_KOTVENI_OPLASTENI', 'TS_PARAMETRY_KOTVY', 'TS_NAPOJENI_DVERI'];
    const z = novaZ(), v = z.varianty[0];
    v.data.cenik = Object.assign(ZC.zkusebniCenik(), { kurzEurKc: 25 }); v.data.ock.fixes = true;
    Object.assign(v.data.ock.zadani, BEZ);
    const d = N.nabidkaData(z, v, J, 'cz');
    test('#800: bez opláštění — TYP OPLÁŠTĚNÍ „bez opláštění“, ostatní symboly bloku prázdné',
      d.placeholders.TS_TYP_OPLASTENI === 'bez opláštění' && KLICE.every(k => d.placeholders[k] === ''), KLICE.map(k => d.placeholders[k]));
    test('#800: EN „Without cladding“', N.nabidkaData(z, v, J, 'en').placeholders.TS_TYP_OPLASTENI === 'Without cladding');
    const sek = (N.nabidkaNahledSekce(d.placeholders, 'cz') || []).find(x => x.sekce === 'OPLÁŠTĚNÍ ŠACHTY');
    test('#800: online tisk — v bloku Opláštění šachty jen řádek typu', sek && sek.radky.length === 1 && sek.radky[0][1] === 'bez opláštění', sek);
    const zn = novaZ(), vn = zn.varianty[0];
    vn.data.cenik = ZC.zkusebniCenik(); vn.data.ock.fixes = true;
    Object.assign(vn.data.ock.zadani, { sirka: 1.6, hloubka: 2, zdvih: 12, prejezd: 3.3, prohluben: 1.2, nastupiste: 5, kalkVerze: 2 });
    const dn = N.nabidkaData(zn, vn, J, 'cz');
    test('#800: šachta S opláštěním beze změny (materiál, rozsah vyplněné, typ ne „bez“)', dn.placeholders.TS_TYP_OPLASTENI !== 'bez opláštění'
      && dn.placeholders.TS_MATERIAL_OPLASTENI !== '' && dn.placeholders.TS_ROZSAH_OPLASTENI !== '', [dn.placeholders.TS_TYP_OPLASTENI, dn.placeholders.TS_MATERIAL_OPLASTENI]);
    /* Odeslaná před PD2 (snímek podmínek bez značky) — dotisk se všemi řádky jako dřív. */
    v.data.kryci = { hodnoty: {}, zmrazenoPodminky: { v: 1, vety: {} } };
    v.zamek = { zamceno: true, typ: 'nabidka', kdy: '2026-11-20T10:00:00Z' };
    const ds = N.nabidkaData(z, v, J, 'cz');
    test('#800: odeslaná před PD2 → dotisk beze změny (řádky bloku vyplněné)', ds.placeholders.TS_TYP_OPLASTENI !== 'bez opláštění'
      && ds.placeholders.TS_MATERIAL_OPLASTENI !== '', [ds.placeholders.TS_TYP_OPLASTENI, ds.placeholders.TS_MATERIAL_OPLASTENI]);
    v.data.kryci.zmrazenoPodminky.pd2Tisk = 1;
    test('#800: odeslaná po PD2 (značka) → jen řádek typu', N.nabidkaData(z, v, J, 'cz').placeholders.TS_TYP_OPLASTENI === 'bez opláštění');
    /* Word: prázdné řádky bloku vypadnou (odstranPrazdneTsRadky), řádek typu zůstane. */
    const radek = (k) => '<w:tr><w:tc><w:p><w:r><w:t>X</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>{{' + k + '}}</w:t></w:r></w:p></w:tc></w:tr>';
    const xml = '<w:tbl>' + ['TS_TYP_OPLASTENI'].concat(KLICE).map(radek).join('') + '</w:tbl>';
    const po = DG.odstranPrazdneTsRadky(xml, d.placeholders);
    test('#800 Word: z bloku zůstane jediný řádek (TYP OPLÁŠTĚNÍ)', (po.match(/<w:tr>/g) || []).length === 1 && /TS_TYP_OPLASTENI/.test(po), po.slice(0, 300));
  }
  /* ---------- smlouva / objednávka nedědí mazání popisků; KL PROJ má Odchylky ---------- */
  {
    const ZP = require('./zpracovatel.js');
    const d = ZP.zpracovatelTiskneDoklad({ placeholders: {}, odstavceTextPryc: ['Tel:'] });
    test('smlouva o dílo / objednávka PROJ (zpracovatelTiskneDoklad) popisky nabídky nemažou', d.odstavceTextPryc === undefined, d);
    const KP = require('./kryci_proj.js');
    const pole = [].concat(...KP.KRYCI_PROJ_SEKCE.map(x => x.pole)).find(p => p.id === 'odchylky');
    test('A3: krycí list PROJ má pole „Jiné odchylky oproti smluvnímu standardu“ (Backoffice)', !!pole && pole.verze.includes('bo')
      && pole.label === 'Jiné odchylky oproti smluvnímu standardu', pole);
  }
  /* ---------- Revize Fable N2 (U8): zrušený Způsob fakturace PROJ a odeslaná stará nabídka ---------- */
  {
    const KP = require('./kryci_proj.js');
    const pole = [].concat(...KP.KRYCI_PROJ_SEKCE.map(x => x.pole)).find(p => p.id === 'zpusobFakturace');
    const VLASTNI = 'vlastní věta Firmy z doby odeslání (smyšlená)';
    global.NAST.firma.zpusobFakturaceProj = 'jiná uložená věta Firmy (smyšlená)';   // uložená hodnota zrušeného nastavení
    const z = novaZ(), v = z.varianty[0];
    v.data.kryciProj = { hodnoty: {}, zmrazeno: { zpusobFakturace: VLASTNI } };
    v.zamek = { zamceno: true, typ: 'nabidkaProj', kdy: '2026-10-01T10:00:00Z' };
    const odesl = KP.kryciProjHodnota(pole, v.data.kryciProj, KP.kryciProjCtx(z, v));
    test('N2 (U8): odeslaná stará nabídka PROJ tiskne Způsob fakturace ze snímku, ne z Firmy ani pevnou větu', odesl === VLASTNI, odesl);
    const zn = novaZ(), vn = zn.varianty[0];
    const nova = KP.kryciProjHodnota(pole, (vn.data.kryciProj = { hodnoty: {} }), KP.kryciProjCtx(zn, vn));
    test('N2 (U8): rozpracovaná nabídka uloženou větu zrušeného nastavení nečte', nova !== 'jiná uložená věta Firmy (smyšlená)' && !!nova, nova);
    delete global.NAST.firma.zpusobFakturaceProj;
  }
  console.log(`\n${ok} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
