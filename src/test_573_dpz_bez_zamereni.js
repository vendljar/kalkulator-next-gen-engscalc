/* #573 — TEXTY DPZ BEZ NAŠEHO ZAMĚŘENÍ (rozhodnutí J. V. 6. 11. 2026, dávka DP;
 * navazuje na #569 — e-mail D. Sikory 2. 11. 2026: zaměření se nabízí jen jako
 * samostatná položka ZA).
 *
 * Hlídá:
 *   1. online nabídka (CZ/EN/DE/FR): v rozsahu DPZ (část 1) je „dokumentace
 *      stávajícího stavu – stav vycházející z původní dokumentace a prohlídky",
 *      ne „ze zaměření a původní dokumentace"; cizí jazyky přeložené;
 *   2. termín hrubopisu DPZ bez studie „do 12 týdnů od předání podkladů"
 *      (online i Word {{PROJ_TERMINY_TERMIN}}); se studií beze změny
 *      („od schválení studie investorem a objednání");
 *   3. samostatné zaměření (ZA) beze změny, cena PROJ beze změny;
 *   4. firma s vlastními termíny v Nastavení → Firma: uložené znění zůstává;
 *   5. ODESLANÁ nabídka z doby před #573 (zmrazený výsledek bez razítka
 *      dpzBezZamereni) se nemění — dotisk dá původní větu i termín, Word bez
 *      úpravy; nabídka odeslaná po #573 drží nové znění;
 *   6. Word (docxDpzBezZamereni) nad tabulkou DPZ ve stavbě šablony PROJ v8:
 *      věta stávajícího stavu se nahradí i rozdělená do běhů, ve všech čtyřech
 *      jazycích; šablona bez věty zůstane beze změny; docxVyplnSablonu jen
 *      s příznakem; dokumenty.js příznak předá.
 * Pojistka: nad 6b70cc3 sada padá (nabidkaProjDpzBezZamereni
 * a docxDpzBezZamereni neexistují, DPZ píše „ze zaměření").
 * Smyšlené údaje, zkušební ceník.
 *
 * Spuštění: cd src && node test_573_dpz_bez_zamereni.js */
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
const PR = nacti('./preklad.js');
const DG = nacti('./docxgen.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const EP = nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./firma.js');
nacti('./plan_plateb.js');
const PD = nacti('./podminky.js');
const NP = nacti('./nabidka_proj.js');
const zk = nacti('./zakazka.js');
const ZM = nacti('./zamek.js');
global.NAST = { firma: global.firmaDefault() };

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 500)); } };

test('nabidkaProjDpzBezZamereni a docxDpzBezZamereni existují',
  typeof NP.nabidkaProjDpzBezZamereni === 'function' && typeof DG.docxDpzBezZamereni === 'function');
if (fail) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }

const STARA = 'dokumentace stávajícího stavu – stav vycházející ze zaměření a původní dokumentace';
const NOVA = 'dokumentace stávajícího stavu – stav vycházející z původní dokumentace a prohlídky';
const T_NOVY = 'do 12 týdnů od předání podkladů';
const T_STARY = 'do 12 týdnů od zpracování výstupů ze zaměření';
const T_STUDIE = 'do 10–12 týdnů od schválení studie investorem a objednání';
const tr = (t, L) => L === 'cz' ? t : PR.tr(t, L);

const zakazka = (sekce) => {
  const z = zk.novaZakazka();
  z.cislo = '2026 - OPR - OVP - 5730'; z.nazevAkce = 'TEST #573';
  const v = z.varianty[0];
  v.data.proj.cenik = ZC.zkusebniCenikProj(); v.data.proj.cenik.kurzEurKc = 25;
  v.data.proj.zadani.sekce.forEach(s => s.polozky.forEach(p => { p.vyrazeno = sekce.indexOf(s.key) < 0; }));
  return { z, v };
};
const zamkni = (v, stary) => {
  ZM.zamkniVariantu(v, { typ: 'nabidkaProjTisk', kdy: '2026-11-05T10:00:00.000Z', cislo: 'x',
    vysledek: ZM.zamekVysledekSpocti(v, JSON.parse(require('fs').readFileSync(__dirname + '/jekly.json', 'utf8')), 'test') });
  if (stary) delete v.zamek.vysledek.proj.dpzBezZamereni;   // odeslaná před #573
};
const dpz = d => d.bloky.find(b => b.typ === 'rozsah' && /\(DPZ\)/.test(b.nadpis));
const terminDpz = (d, L) => {
  const b = d.bloky.find(x => x.typ === 'pary' && x.nadpis === tr('TERMÍNY', L));
  const hrubopis = tr('Zpracování dokumentace pro dotčené orgány (hrubopis DPZ)', L);
  return b ? b.radky.filter(r => r[0] === hrubopis).map(r => r[1]) : null;
};
const BEZ_STUDIE = ['zamereni', 'dpz', 'ic', 'dps'];

/* ---------- 1–3) online nabídka ve čtyřech jazycích ---------- */
['cz', 'en', 'de', 'fr'].forEach(L => {
  const { z, v } = zakazka(BEZ_STUDIE);
  const d = NP.nabidkaProjData(z, v, L);
  const text = JSON.stringify(dpz(d));
  test(L + ' 1: blok DPZ se tiskne', !!dpz(d));
  test(L + ' 1: stávající stav „z původní dokumentace a prohlídky"', text.includes(tr(NOVA, L)), text.slice(0, 500));
  test(L + ' 1: stávající stav bez „ze zaměření"', !text.includes(tr(STARA, L)) && !text.includes(STARA), text.slice(0, 500));
  if (L !== 'cz') test(L + ' 1: nová věta je přeložená (ne česky)', !text.includes('prohlídky') && PR.trStav(NOVA, L).prelozeno, PR.trStav(NOVA, L));
  test(L + ' 2: termín DPZ bez studie „od předání podkladů" (online)', JSON.stringify(terminDpz(d, L)) === JSON.stringify([tr(T_NOVY, L)]), terminDpz(d, L));
  test(L + ' 2: … i ve Wordu ({{PROJ_TERMINY_TERMIN}})', d.placeholders.PROJ_TERMINY_TERMIN.includes(tr(T_NOVY, L))
    && !d.placeholders.PROJ_TERMINY_TERMIN.includes(tr(T_STARY, L)), d.placeholders.PROJ_TERMINY_TERMIN);
  if (L !== 'cz') test(L + ' 2: nový termín je přeložený', PR.trStav(T_NOVY, L).prelozeno && !/podkladů/.test(d.placeholders.PROJ_TERMINY_TERMIN));
  const za = d.bloky.find(b => b.typ === 'rozsah' && b.nadpis === tr('ZAMĚŘENÍ A ZPRACOVÁNÍ VÝSTUPŮ (ZA)', L));
  test(L + ' 3: samostatné ZAMĚŘENÍ (ZA) se tiskne jako dosud (5 bodů vč. 3D skenu)', !!za && za.radky.filter(x => !x[0]).length === 5
    && /3D/.test(JSON.stringify(za)), za);
  test(L + ' 6: Word dostane příznak dpzBezZamereni', d.dpzBezZamereni === true);
});

/* se studií: termín hrubopisu DPZ zůstává navázaný na studii */
{
  const { z, v } = zakazka(['zamereni', 'studie', 'dpz']);
  const d = NP.nabidkaProjData(z, v, 'cz');
  test('2: se studií termín DPZ „od schválení studie" (beze změny)', JSON.stringify(terminDpz(d, 'cz')) === JSON.stringify([T_STUDIE]), terminDpz(d, 'cz'));
  test('1: se studií stávající stav taky bez zaměření', JSON.stringify(dpz(d)).includes(NOVA));
}
/* podmínky: výchozí termín a původní znění pro dotisk */
test('2: PODMINKY_TERMIN_DPZ = { nove: od předání podkladů, stare: od výstupů ze zaměření }',
  PD.PODMINKY_TERMIN_DPZ && PD.PODMINKY_TERMIN_DPZ.nove === T_NOVY && PD.PODMINKY_TERMIN_DPZ.stare === T_STARY
  && PD.PODMINKY_TERMIN_DPZ_BEZ_STUDIE === T_NOVY);
test('2: výchozí termíny PROJ (Nastavení → Firma) bez „výstupů ze zaměření" u DPZ',
  PD.PODMINKY_VYCHOZI.nabidkaProj.terminy.cz.filter(r => /DPZ/.test(r[0])).every(r => !/zaměření/.test(r[1])));

/* cena se nemění */
{
  const a = zakazka(BEZ_STUDIE), b = zakazka(BEZ_STUDIE);
  zamkni(b.v, true);
  const dn = NP.nabidkaProjData(a.z, a.v, 'cz'), ds = NP.nabidkaProjData(b.z, b.v, 'cz');
  test('3: cena PROJ beze změny (nové × původní znění)', dn.souhrn.bezDph === ds.souhrn.bezDph && dn.souhrn.bezDph > 0
    && JSON.stringify(dn.rekapitulace) === JSON.stringify(ds.rekapitulace), [dn.souhrn, ds.souhrn]);
  const r = EP.vypocetProj(a.v.data.proj.zadani, a.v.data.proj.cenik);
  test('3: jádro — razítko dpzBezZamereni je jen příznak', r.dpzBezZamereni === true && typeof r.souhrn.celkem === 'number');
}

/* ---------- 4) firma s vlastními termíny ---------- */
{
  const puvodni = global.NAST.firma;
  const terminy = PD.PODMINKY_VYCHOZI.nabidkaProj.terminy.cz.map(r => r.slice());
  terminy.forEach(r => { if (r[2] === 'dpz-studie') r[1] = 'do 14 týdnů od zpracování výstupů ze zaměření (vlastní znění firmy)'; });
  global.NAST = { firma: Object.assign({}, puvodni, { podminky: { nabidkaProj: { terminy: { cz: terminy } } } }) };
  const { z, v } = zakazka(BEZ_STUDIE);
  const d = NP.nabidkaProjData(z, v, 'cz');
  test('4: firma s uloženými termíny — vlastní znění zůstává', JSON.stringify(terminDpz(d, 'cz')) === JSON.stringify(['do 14 týdnů od zpracování výstupů ze zaměření (vlastní znění firmy)']), terminDpz(d, 'cz'));
  global.NAST = { firma: puvodni };
}

/* ---------- 5) odeslaná nabídka ---------- */
{
  const { z, v } = zakazka(BEZ_STUDIE);
  zamkni(v, true);
  test('5: (příprava) odeslaná před #573 — razítko chybí', v.zamek.zamceno && !v.zamek.vysledek.proj.dpzBezZamereni);
  test('5: nabidkaProjDpzBezZamereni = false', NP.nabidkaProjDpzBezZamereni(v) === false);
  const d = NP.nabidkaProjData(z, v, 'cz');
  test('5: dotisk — původní věta o stávajícím stavu', JSON.stringify(dpz(d)).includes(STARA), JSON.stringify(dpz(d)).slice(0, 400));
  test('5: dotisk — původní termín DPZ (online i Word)', JSON.stringify(terminDpz(d, 'cz')) === JSON.stringify([T_STARY])
    && d.placeholders.PROJ_TERMINY_TERMIN.includes(T_STARY), [terminDpz(d, 'cz'), d.placeholders.PROJ_TERMINY_TERMIN]);
  test('5: dotisk — Word bez úpravy DPZ', d.dpzBezZamereni === false);
  const en = NP.nabidkaProjData(z, v, 'en');
  test('5: dotisk EN — původní znění přeložené', JSON.stringify(dpz(en)).includes(PR.tr(STARA, 'en')) && PR.trStav(STARA, 'en').prelozeno
    && en.placeholders.PROJ_TERMINY_TERMIN.includes(PR.tr(T_STARY, 'en')));
}
{
  const { z, v } = zakazka(BEZ_STUDIE);
  zamkni(v, false);
  const d = NP.nabidkaProjData(z, v, 'cz');
  test('5: odeslaná po #573 drží nové znění', NP.nabidkaProjDpzBezZamereni(v) === true
    && JSON.stringify(dpz(d)).includes(NOVA) && d.placeholders.PROJ_TERMINY_TERMIN.includes(T_NOVY));
}

/* ---------- 6) Word: tabulka DPZ ve stavbě šablony PROJ v8 ---------- */
const wt = t => `<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${t}</w:t></w:r>`;
const p = (...runs) => `<w:p>${runs.join('')}</w:p>`;
const tc = (...ps) => `<w:tc>${ps.join('') || '<w:p/>'}</w:tc>`;
const tr2 = (a, b) => `<w:tr>${tc(a)}${tc(b || '')}</w:tr>`;
const tbl = (...rows) => `<w:tbl>${rows.join('')}</w:tbl>`;
const xmlEsc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, '&apos;');
const sablona = (T) => '<w:body>'
  + tbl(tr2(p(wt(T.za))), tr2(p(wt(T.zaRadek))))         /* ZA: zaměření zůstává */
  + tbl(
    tr2(p(wt(T.cast1))),
    tr2(p(wt(T.stavebni)), p(wt(T.stav1)) + p(wt(xmlEsc(T.a)), wt(xmlEsc(T.b)))),   /* věta rozdělená do dvou běhů */
    tr2(p(wt(T.bouraci)), p(wt('{{PROJ_CENA_DPZ}}'))))
  + '</w:body>';
const JAZ = {
  CZ: { za: 'ZAMĚŘENÍ A ZPRACOVÁNÍ VÝSTUPŮ (ZA):', zaRadek: 'zpracování výstupu ze zaměření', cast1: 'Dokumentace pro povolení záměru – část 1:',
    stavebni: 'Stavební část projektu:', stav1: 'dokumentace stávajícího stavu', a: '- stav vycházející ze ', b: 'zaměření a původní dokumentace',
    bouraci: 'bourací dokumentace', novy: '- stav vycházející z původní dokumentace a prohlídky', stary: 'ze zaměření' },
  EN: { za: 'SURVEY AND PROCESSING OF OUTPUTS (ZA):', zaRadek: 'processing of the survey outputs', cast1: 'Documentation for the project permit – part 1:',
    stavebni: 'Building part of the design:', stav1: 'documentation of the existing state', a: '- state based on the survey', b: ' and the original documentation',
    bouraci: 'demolition documentation', novy: '- state based on the original documentation and the inspection', stary: 'on the survey' },
  DE: { za: 'AUFMASS UND AUSWERTUNG (ZA):', zaRadek: 'Auswertung des Aufmaßes', cast1: 'Unterlagen für die Vorhabengenehmigung – Teil 1:',
    stavebni: 'Baulicher Teil der Planung:', stav1: 'Dokumentation des Bestands', a: '- Zustand auf Grundlage des Aufmaßes', b: ' und der ursprünglichen Unterlagen',
    bouraci: 'Abbruchplanung', novy: '- Zustand auf Grundlage der ursprünglichen Unterlagen und der Besichtigung', stary: 'des Aufmaßes' },
  FR: { za: 'RELEVÉ ET TRAITEMENT DES LIVRABLES (ZA) :', zaRadek: 'traitement des livrables du relevé', cast1: "Dossier de demande d'autorisation – partie 1 :",
    stavebni: 'Partie bâtiment du projet :', stav1: "dossier de l'état existant", a: '- état établi à partir du relevé ', b: "et du dossier d'origine",
    bouraci: 'dossier de démolition', novy: "- état établi à partir du dossier d'origine et de la visite", stary: 'du relevé et' },
};
const text = x => (x.match(/<w:t[^>]*>[^<]*<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join('')
  .replace(/&apos;/g, "'").replace(/&amp;/g, '&');
Object.keys(JAZ).forEach(j => {
  const T = JAZ[j];
  const pred = sablona(T);
  const po = DG.docxDpzBezZamereni(pred);
  test(j + ' 6: věta stávajícího stavu nahrazená (i rozdělená do běhů)', text(po).includes(T.novy) && !text(po).includes(T.a + T.b), text(po));
  test(j + ' 6: ZA (zaměření) beze změny', text(po).includes(T.zaRadek) && po.slice(0, po.indexOf('<w:tbl>', 5)) === pred.slice(0, pred.indexOf('<w:tbl>', 5)));
  test(j + ' 6: XML zůstává vyvážené', (po.match(/<w:p>/g) || []).length === (pred.match(/<w:p>/g) || []).length
    && (po.match(/<w:t[ >]/g) || []).length === (po.match(/<\/w:t>/g) || []).length
    && (po.match(/<w:r>/g) || []).length === (pred.match(/<w:r>/g) || []).length);
});
{
  const bez = '<w:body>' + tbl(tr2(p(wt('dokumentace stávajícího stavu')), p(wt('bourací dokumentace')))) + '</w:body>';
  test('6: šablona bez věty zůstane beze změny', DG.docxDpzBezZamereni(bez) === bez);
}
test('6: dokumenty.js předá Wordu příznak dpzBezZamereni z dat nabídky',
  /dpzBezZamereni: data\.dpzBezZamereni === true/.test(require('fs').readFileSync(__dirname + '/dokumenty.js', 'utf8')));
(async () => {
  const dokument = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    + sablona(JAZ.CZ) + '</w:document>';
  const zip = async xml => (await DG.zipZapis([{ nazev: 'word/document.xml', data: new TextEncoder().encode(xml) }])).arrayBuffer();
  const vypln = async volby => {
    const blob = await DG.docxVyplnSablonu(await zip(dokument), { PROJ_CENA_DPZ: '1 Kč' }, [], {}, volby);
    const pol = await DG.zipPrecti(new Uint8Array(await blob.arrayBuffer()));
    return Buffer.from(pol.find(x => x.nazev === 'word/document.xml').data).toString('utf8');
  };
  const nove = await vypln({ dpzBezZamereni: true });
  const stare = await vypln({});
  test('6: docxVyplnSablonu s příznakem — DPZ bez zaměření', text(nove).includes(JAZ.CZ.novy) && !text(nove).includes(JAZ.CZ.a + JAZ.CZ.b));
  test('6: docxVyplnSablonu bez příznaku (dotisk před #573) — šablona jak je', text(stare).includes(JAZ.CZ.a + JAZ.CZ.b));
  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL výjimka', e && e.stack); process.exit(1); });
