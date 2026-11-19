/* PG #3 (J. V. 19. 11. 2026) — DALŠÍ UJEDNÁNÍ V CENOVÉ NABÍDCE PROJ.
 *
 * Nabídka PROJ měla jen vlastní POLOŽKY s cenou (P4). Nově „+ přidat vlastní
 * řádek" (text bez ceny, popisek + hodnota) v kartě Cenová nabídka (PROJ):
 * data `proj.zadani.dalsiUjednani`, sekce DALŠÍ UJEDNÁNÍ za termíny
 * (před doložkami) v online náhledu i ve Wordu PROJ v9 (nastroje/
 * vyrob_sablony.js --proj-v9). Hlídá se:
 *   A) model — prázdné řádky pryč, starší zakázka bez pole = beze změny;
 *   B) online bloky — DALŠÍ UJEDNÁNÍ za TERMÍNY, před DOLOŽKAMI, EN/DE/FR;
 *   C) šablona v9 ze syntetické v5 → v6 → v8 → v9 (CZ i DE přímo), odmítnutí;
 *   D) Word v9 — řádky za termíny v pořadí, prázdné = dokument jako z v8,
 *      vlastní text se nerozvine jako symbol, přeložená v9 (EN);
 *   E) Word v8 bez kotvy — generátor funguje, kontrola dalsiUjednaniWordProj
 *      upozorní (u v9 a bez řádků mlčí).
 * Pojistka: před úpravou (origin/claude/integrace-16-10) projV9 ani symboly
 * PROJ_DALSI_UJEDNANI_* neexistují — sada selže na první kontrole; viz commit.
 * Spuštění: node src/test_pg_proj_dalsi.js */
'use strict';
const path = require('path');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
const PR = nacti('./preklad.js');
const dg = nacti('./docxgen.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const EP = nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./firma.js');
nacti('./plan_plateb.js');
nacti('./podminky.js');
const NP = nacti('./nabidka_proj.js');
const zk = nacti('./zakazka.js');
nacti('./zamek.js');
nacti('./kryci.js');
nacti('./kryci_proj.js');
const KO = nacti('./kontroly.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info.slice(0, 700) : JSON.stringify(info).slice(0, 700))); } };
const chybaZ = (fn) => { try { fn(); return ''; } catch (e) { return e.message; } };

let VS = null;
try { VS = require(path.join(__dirname, '..', 'nastroje', 'vyrob_sablony.js')); } catch (e) { VS = null; }
test('nabidka_proj exportuje nabidkaProjDalsiUjednani', typeof NP.nabidkaProjDalsiUjednani === 'function');
test('vyrob_sablony exportuje projV9', !!(VS && typeof VS.projV9 === 'function'));
test('docxgen rozvíjí dvojici PROJ_DALSI_UJEDNANI_NAZEV | _TEXT', dg.DOCX_RADKY_ZA_RADEK.some(k => Array.isArray(k) && k.join() === 'PROJ_DALSI_UJEDNANI_NAZEV,PROJ_DALSI_UJEDNANI_TEXT'));
if (fail) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }

const kopie = o => JSON.parse(JSON.stringify(o));
const CEN = Object.assign(kopie(ZC.zkusebniCenikProj()), { kurzEurKc: 25 });
const zadani = (uprava) => {
  const z = kopie(EP.DEFAULT_ZADANI_PROJ);
  z.sekce.forEach(s => s.polozky.forEach(p => { p.vyrazeno = false; }));
  return Object.assign(z, uprava || {});
};
const zakazka = (dalsi) => {
  const zak = zk.novaZakazka(); zak.cislo = '2026 - OVP - CN - 9703'; zak.nazevAkce = 'PG další ujednání';
  const v = zak.varianty[0];
  v.data.proj.cenik = kopie(CEN);
  v.data.proj.zadani = zadani(dalsi === undefined ? {} : { dalsiUjednani: kopie(dalsi) });
  v.data.cenik = Object.assign(v.data.cenik || {}, { kurzEurKc: 25 });
  return { zak, v };
};
/* známá fráze (slovník) a neznámý text; symbol v textu se nesmí rozvinout */
const R1 = { label: 'LEŠENÍ VNITŘNÍ PRO STAVBU OCK', hodnota: 'zajistí objednatel v rámci SP' };
const R2 = { label: 'PŘEDÁNÍ PODKLADŮ {{CENA_S_DPH}}', hodnota: 'do 14 dnů & dle dohody' };
const R3 = { label: 'ZÁRUKA DLE DOHODY', hodnota: '' };

/* ---------------- A) model ---------------- */
test('A prázdný řádek pryč, konce řádků → mezera', JSON.stringify(NP.nabidkaProjDalsiUjednani({ dalsiUjednani: [R1, { label: ' ', hodnota: '' }, null, { label: 'A\nB', hodnota: 'x\r\ny' }] }))
  === JSON.stringify([R1, { label: 'A B', hodnota: 'x y' }]));
test('A starší zadání bez pole', NP.nabidkaProjDalsiUjednani({}).length === 0 && NP.nabidkaProjDalsiUjednani(null).length === 0);
{
  const { zak, v } = zakazka();
  const d = NP.nabidkaProjData(zak, v, 'cz');
  test('A starší zakázka: žádný blok DALŠÍ UJEDNÁNÍ, symboly prázdné',
    !d.bloky.some(b => b.nadpis === 'DALŠÍ UJEDNÁNÍ') && d.placeholders.PROJ_DALSI_UJEDNANI_NAZEV === '' && d.placeholders.PROJ_DALSI_UJEDNANI_TEXT === '');
}

/* ---------------- B) online bloky ---------------- */
{
  const { zak, v } = zakazka([R1, R2, R3]);
  v.data.proj.zadani.nabizetAD = true;
  const d = NP.nabidkaProjData(zak, v, 'cz');
  const i = d.bloky.findIndex(b => b.nadpis === 'DALŠÍ UJEDNÁNÍ');
  const iT = d.bloky.findIndex(b => b.nadpis === 'TERMÍNY');
  const iD = d.bloky.findIndex(b => b.nadpis === 'DOLOŽKY');
  test('B blok DALŠÍ UJEDNÁNÍ (pary) za TERMÍNY a jejich poznámkou', i > iT && iT >= 0 && d.bloky[i].typ === 'pary' && d.bloky[i - 1].typ === 'pozn', [i, iT, d.bloky.map(b => b.nadpis || b.typ)]);
  test('B před DOLOŽKAMI (jsou-li)', iD < 0 || iD > i, [i, iD]);
  test('B řádky v pořadí, text beze změny', JSON.stringify(d.bloky[i].radky) === JSON.stringify([[R1.label, R1.hodnota], [R2.label, R2.hodnota], [R3.label, '']]), d.bloky[i].radky);
  test('B Word data: řádky po řádcích', d.placeholders.PROJ_DALSI_UJEDNANI_NAZEV === [R1.label, R2.label, R3.label].join('\n')
    && d.placeholders.PROJ_DALSI_UJEDNANI_TEXT === [R1.hodnota, R2.hodnota, ''].join('\n'), d.placeholders);
  for (const L of ['en', 'de', 'fr']) {
    const dl = NP.nabidkaProjData(zak, v, L);
    const b = dl.bloky.find(x => x.nadpis === PR.tr('DALŠÍ UJEDNÁNÍ', L));
    test('B ' + L + ': nadpis přeložený, známá fráze přeložená, neznámá zůstala', PR.trStav('DALŠÍ UJEDNÁNÍ', L).prelozeno && !!b
      && b.radky[0][0] === PR.tr(R1.label, L) && b.radky[0][1] === PR.tr(R1.hodnota, L) && b.radky[1][0] === R2.label
      && dl.placeholders.PROJ_DALSI_UJEDNANI_NAZEV.split('\n')[0] === PR.tr(R1.label, L), b);
  }
}

/* ---------------- C) šablona v9 ---------------- */
const r = t => '<w:r><w:rPr><w:b/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">' + t + '</w:t></w:r>';
const p = (t, id) => '<w:p' + (id ? ' w14:paraId="' + id + '"' : '') + '><w:pPr><w:pStyle w:val="Bezmezer"/></w:pPr>' + (t ? r(t) : '') + '</w:p>';
const tc = (...ps) => '<w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr>' + ps.join('') + '</w:tc>';
const tr = (...tcs) => '<w:tr w14:paraId="0A0A0A0A"><w:trPr><w:trHeight w:val="300"/></w:trPr>' + tcs.join('') + '</w:tr>';
const tbl = (sl, ...trs) => '<w:tbl><w:tblPr><w:tblW w:w="10000" w:type="dxa"/></w:tblPr><w:tblGrid>'
  + '<w:gridCol w:w="4000"/>'.repeat(sl) + '</w:tblGrid>' + trs.join('') + '</w:tbl>';
const cena = (n, s) => tbl(2, tr(tc(p(n)), tc(p(s))));
/* syntetická PROJ v5 (stavba jako test_sablona_proj_v6 + ceny činností pro v8) */
const V5XML = '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"><w:body>'
  + p('{{CISLO_NABIDKY}} {{NAZEV_AKCE}}')
  + cena('CENA ZA ZAMĚŘENÍ', '{{PROJ_CENA_ZAMERENI}}') + cena('SP2', '{{PROJ_CENA_SP2}}') + cena('DPZ', '{{PROJ_CENA_DPZ}}')
  + cena('IČ', '{{PROJ_CENA_IC}}') + cena('KOLAUDACE', '{{PROJ_CENA_KOLAUDACE}}')
  + p('{{BLOK_AD_ZAC}}') + tbl(1, tr(tc(p('MĚSÍČNÍ SAZBA'), p('{{PROJ_CENA_AD_BLOK}}')))) + p('{{BLOK_AD_KON}}') + p('')
  + tbl(1, tr(tc(p('CENA NEZAHRNUJE:'))), tr(tc(p('Případné studie', '11110001')))) + p('')
  + tbl(1, tr(tc(p('POŽADOVÁNO OD INVESTORA:'))), tr(tc(p('Zajištění přístupu do objektu')))) + p('')
  + p('') + tbl(2, tr(tc(p(' TERMÍNY:')), tc(p(''))),
    tr(tc(p('Provedení detailního zaměření')), tc(p(''), p('ZAMĚŘENÍ na stavbě do 4 týdnů'))))
  + p('*) Termíny pro vyjádření dotčených orgánů a stavebního úřadu nejsou závazné.')
  + p('   Termíny zpracování můžou být upraven dle volných kapacit zhotovitele v okamžiku objednání.')
  + p('') + p('REKAPITULACE CENOVÉ NABÍDKY') + p('{{PROJ_CELKEM_BEZ_DPH}}')
  + '<w:sectPr/></w:body></w:document>';
const v6 = VS.projV6(V5XML), v8 = VS.projV8(v6);
let v9 = '';
const ch9 = chybaZ(() => { v9 = VS.projV9(v8, 'cz'); });
test('C v9 vznikne z v8 bez chyby', !ch9, ch9);
const kl9 = dg.klicePlaceholderu(v9);
test('C v9: symboly a značky bloku přibyly, symboly v8 zůstaly', ['PROJ_DALSI_UJEDNANI_NAZEV', 'PROJ_DALSI_UJEDNANI_TEXT', 'BLOK_DALSI_UJEDNANI_ZAC', 'BLOK_DALSI_UJEDNANI_KON']
  .every(k => kl9.indexOf(k) >= 0) && dg.klicePlaceholderu(v8).every(k => kl9.indexOf(k) >= 0)
  && kl9.length === dg.klicePlaceholderu(v8).length + 4, kl9.filter(k => dg.klicePlaceholderu(v8).indexOf(k) < 0));
{
  const ix = t => v9.indexOf(t);
  test('C v9: blok za termíny (i jejich poznámkami), před doložkami', ix('{{BLOK_TERMINY_KON}}') < ix('{{BLOK_DALSI_UJEDNANI_ZAC}}')
    && ix('Termíny zpracování') < ix('{{BLOK_DALSI_UJEDNANI_ZAC}}') && ix('{{BLOK_DALSI_UJEDNANI_KON}}') < ix('{{BLOK_DOLOZKY_ZAC}}')
    && ix('{{BLOK_DALSI_UJEDNANI_ZAC}}') < ix('DALŠÍ UJEDNÁNÍ:') && ix('{{PROJ_DALSI_UJEDNANI_TEXT}}') < ix('{{BLOK_DALSI_UJEDNANI_KON}}'));
  const zn = dg.docxZnackyBloku(v9).filter(z => z.jmeno === 'BLOK_DALSI_UJEDNANI');
  test('C v9: blok vyvážený, mimo tabulku', zn.length === 2 && dg.docxVyvazene(v9.slice(zn[0].kon, zn[1].zac)) && !dg.docxVBunce(v9, zn[0].zac));
  test('C v9: platné XML, žádná zdvojená w14:paraId z kopie', !dg.xmlStrukturaVada(v9)
    && (v9.match(/w14:paraId=/g) || []).length === (v8.match(/w14:paraId=/g) || []).length, dg.xmlStrukturaVada(v9));
  test('C v9: řádek s písmem a stavbou řádku termínů', /<w:rPr><w:b\/><w:sz w:val="22"\/><\/w:rPr><w:t xml:space="preserve">\{\{PROJ_DALSI_UJEDNANI_TEXT\}\}/.test(v9));
  test('C v9 mimo blok = v8 (nic jiného se nezměnilo)', v9.replace(/<w:p>(?:(?!<\/w:p>)[\s\S])*?\{\{BLOK_DALSI_UJEDNANI_ZAC\}\}[\s\S]*?\{\{BLOK_DALSI_UJEDNANI_KON\}\}[\s\S]*?<\/w:p>/, '') === v8);
}
{
  const de = VS.projV9(v8, 'de');
  test('C v9 DE přímo z v8: nadpis ze slovníku', de.indexOf('>WEITERE VEREINBARUNGEN<') > 0 && de.indexOf('DALŠÍ UJEDNÁNÍ') < 0);
}
test('C v9 podruhé odmítne', /už DALŠÍ UJEDNÁNÍ/.test(chybaZ(() => VS.projV9(v9, 'cz'))));
test('C vstup v7 (bez cestovného) odmítne', /není PROJ v8/.test(chybaZ(() => VS.projV9(v6, 'cz'))));
test('C chybí blok termínů → chyba', /BLOK_TERMINY/.test(chybaZ(() => VS.projV9(v8.split('{{BLOK_TERMINY_ZAC}}').join('x'), 'cz'))));

/* ---------------- D) Word ---------------- */
const enc = new TextEncoder(), dec = new TextDecoder();
const balik = async xml => (await dg.zipZapis([{ nazev: 'word/document.xml', data: enc.encode(xml) }])).arrayBuffer();
const vypln = async (xml, d) => {
  const blob = await dg.docxVyplnSablonu(await balik(xml), d.placeholders, [], {}, { odstavcePryc: d.odstavcePryc || [], blokyPryc: d.blokyPryc || [] });
  const ab = await blob.arrayBuffer();
  const doc = dec.decode((await dg.zipPrecti(new Uint8Array(ab))).find(x => x.nazev === 'word/document.xml').data);
  return { doc, vady: await dg.docxXmlVady(ab) };
};
const ent = t => t.replace(/&#123;/g, '{').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&apos;/g, "'").replace(/&quot;/g, '"');
const radky = x => x.split('</w:tr>').map(rr => (rr.match(/<w:tc[\s>][\s\S]*?<\/w:tc>/g) || [])
  .map(c => ent((c.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) || []).map(t => t.replace(/<[^>]*>/g, '')).join('')).trim()).join(' | ').trim()).filter(Boolean);
(async () => {
  {
    const { zak, v } = zakazka([R1, R2, R3]);
    const d = NP.nabidkaProjData(zak, v, 'cz');
    const { doc, vady } = await vypln(v9, d);
    const rr = radky(doc), i = rr.indexOf('DALŠÍ UJEDNÁNÍ: |');
    test('D Word v9: nadpis a tři řádky v pořadí', i >= 0 && rr[i + 1] === R1.label + ' | ' + R1.hodnota && rr[i + 2] === R2.label + ' | ' + R2.hodnota
      && rr[i + 3] === R3.label + ' |', rr.slice(i - 1, i + 5));
    test('D Word v9: vlastní text se nerozvine jako symbol, XML bez vad, žádný symbol ani značka',
      doc.indexOf('&#123;&#123;CENA_S_DPH}}') > 0 && vady.length === 0 && !/\{\{/.test(doc), [vady, (doc.match(/\{\{[A-Z_]+\}\}/g) || [])]);
  }
  {
    const { zak, v } = zakazka([]);
    const d = NP.nabidkaProjData(zak, v, 'cz');
    const a = await vypln(v8, d), b = await vypln(v9, d);
    test('D Word v9 bez řádků = Word v8 (blok zmizí i s nadpisem)', a.doc === b.doc && b.doc.indexOf('DALŠÍ UJEDNÁNÍ') < 0);
  }
  {
    const st = {};
    const en = dec.decode((await dg.zipPrecti(new Uint8Array(await (await dg.docxPrelozSablonu(await balik(v9), 'en', st)).arrayBuffer())))
      .find(x => x.nazev === 'word/document.xml').data);
    const { zak, v } = zakazka([R1]);
    const { doc } = await vypln(en, NP.nabidkaProjData(zak, v, 'en'));
    const rr = radky(doc);
    test('D Word v9 EN (přeložená šablona): nadpis i řádek anglicky', rr.indexOf(PR.tr('DALŠÍ UJEDNÁNÍ', 'en') + ' |') >= 0
      && rr.indexOf(PR.tr(R1.label, 'en') + ' | ' + PR.tr(R1.hodnota, 'en')) >= 0, rr.filter(x => /ARRANG|SCAFF|LEŠEN|DALŠÍ/i.test(x)));
  }
  /* ---------------- E) šablona bez kotvy ---------------- */
  {
    const { zak, v } = zakazka([R1]);
    const d = NP.nabidkaProjData(zak, v, 'cz');
    const { doc, vady } = await vypln(v8, d);
    test('E Word v8 s řádky: dokument vznikne, bez vad, bez řádků a bez symbolu', vady.length === 0 && doc.indexOf(R1.hodnota) < 0 && !/\{\{/.test(doc));
    const kody = (zad, sablona) => (KO.kontrolyProved({ zak, projZadani: zad, projVysledek: EP.vypocetProj(zad, CEN), cenikProj: CEN, sablonaNabidkaProj: sablona }).nalezy || []);
    const s8 = { symboly: dg.klicePlaceholderu(v8), nazev: 'PROJ v8', verze: 8 }, s9 = { symboly: dg.klicePlaceholderu(v9), nazev: 'PROJ v9', verze: 9 };
    const n8 = kody(v.data.proj.zadani, s8).find(n => n.kod === 'dalsiUjednaniWordProj');
    test('E kontrola: šablona v8 + řádky → dalsiUjednaniWordProj (varování, říká co dělat)', !!n8 && /PROJ v9/.test(n8.text) && /1 vlastní řádek/.test(n8.text) && n8.typ !== 'chyba', n8);
    test('E kontrola: šablona v9 mlčí', !kody(v.data.proj.zadani, s9).some(n => n.kod === 'dalsiUjednaniWordProj'));
    test('E kontrola: bez řádků mlčí', !kody(zadani(), s8).some(n => n.kod === 'dalsiUjednaniWordProj'));
    test('E kontrola: šablona neznámá (symboly nestažené) mlčí', !kody(v.data.proj.zadani, null).some(n => n.kod === 'dalsiUjednaniWordProj'));
  }
  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
