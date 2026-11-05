/* #569 — STUDIE PROVEDITELNOSTI BEZ SEKCE ZAMĚŘENÍ (e-mail D. Sikory 2. 11. 2026:
 * „sekci zaměření prosím úplně vymaž ze studie proveditelnosti. Zaměření budeme
 * nabízet pouze jako samostatnou položku – pro ty zákazníky je to matoucí.";
 * pokyn J. V. 5. 11. 2026, dávka PH).
 *
 * Hlídá:
 *   1. online nabídka (CZ/EN/DE/FR): v rozsahu studie není „část 1" se
 *      zaměřením ani řádky „Stavebně technický průzkum a zaměření", ceny
 *      studie nemají odkaz na cenu zaměření, části jsou přečíslované 1–2;
 *   2. přeformulované věty: úvod („Z podkladů a prohlídky navrhneme…"),
 *      PŮVODNÍ STAV, termín studie („od předání podkladů") — i ve Wordu
 *      ({{UVOD_NABIDKY_PROJ}}, {{PROJ_TERMINY_TERMIN}});
 *   3. samostatné zaměření (ZA) se tiskne jako dosud; cena PROJ se nemění;
 *   4. Word (docxStudieBezZamereni) nad tabulkou ve stavbě šablony PROJ v8
 *      (BLOK_STUDIE_ROZSAH, BLOK_STUDIE_CENA): řádky části 1 a řádek
 *      {{PROJ_CENA_SP1}} zmizí, části se přečíslují, PŮVODNÍ STAV dostane
 *      neutrální znění — česky i v šabloně EN; ZA mimo blok zůstane;
 *   5. ODESLANÁ nabídka z doby před #569 (zmrazený výsledek bez razítka
 *      studieBezZamereni) se nemění: dotisk dá původní text i Word bez úprav;
 *      nabídka odeslaná po #569 drží nové znění.
 * Pojistka: nad 000924e sada padá (nabidkaProjStudieBezZamereni
 * a docxStudieBezZamereni neexistují, studie tiskne část 1 se zaměřením).
 * Smyšlené údaje, zkušební ceník.
 *
 * Spuštění: cd src && node test_569_studie_bez_zamereni.js */
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

test('nabidkaProjStudieBezZamereni a docxStudieBezZamereni existují',
  typeof NP.nabidkaProjStudieBezZamereni === 'function' && typeof DG.docxStudieBezZamereni === 'function');
if (fail) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }

const kopie = x => JSON.parse(JSON.stringify(x));
const zakazka = (sekce) => {
  const z = zk.novaZakazka();
  z.cislo = '2026 - OPR - OVP - 5690'; z.nazevAkce = 'TEST #569';
  const v = z.varianty[0];
  v.data.proj.cenik = ZC.zkusebniCenikProj(); v.data.proj.cenik.kurzEurKc = 25;
  /* zkušební ceník projednání neoceňuje — smyšlené fixy, ať je studie celá */
  v.data.proj.cenik.fixy = Object.assign({}, v.data.proj.cenik.fixy || {}, { pamatkari: 9000, uzemniRozvoj: 3000 });
  v.data.proj.zadani.sekce.forEach(s => s.polozky.forEach(p => { p.vyrazeno = sekce.indexOf(s.key) < 0; }));
  return { z, v };
};
const VSE = ['zamereni', 'studie', 'projednani', 'dpz', 'ic', 'dps', 'ezc', 'kolaudace', 'geodet'];
const st = d => d.bloky.find(b => b.typ === 'rozsah' && /^(STUDIE PROVEDITELNOSTI|FEASIBILITY STUDY|MACHBARKEITSSTUDIE|ÉTUDE DE FAISABILITÉ)/i.test(b.nadpis));
const tr = (t, L) => L === 'cz' ? t : PR.tr(t, L);
/* zamčení „jako po tisku" — zmrazený výsledek tímtéž kódem jako aplikace */
const zamkni = (v, stary) => {
  ZM.zamkniVariantu(v, { typ: 'nabidkaProjTisk', kdy: '2026-11-04T10:00:00.000Z', cislo: 'x',
    vysledek: ZM.zamekVysledekSpocti(v, JSON.parse(require('fs').readFileSync(__dirname + '/jekly.json', 'utf8')), 'test') });
  if (stary) delete v.zamek.vysledek.proj.studieBezZamereni;   // odeslaná před #569
};

/* ---------- 1–3) online nabídka ve čtyřech jazycích ---------- */
['cz', 'en', 'de', 'fr'].forEach(L => {
  const { z, v } = zakazka(VSE);
  const d = NP.nabidkaProjData(z, v, L);
  const s = st(d);
  const text = JSON.stringify(s);
  test(L + ' 1: blok STUDIE PROVEDITELNOSTI se tiskne', !!s);
  test(L + ' 1: ve studii není „Stavebně technický průzkum a zaměření" ani 3D sken',
    !text.includes(tr('Stavebně technický průzkum a zaměření', L).replace(/\s*:$/, '')) && !text.includes(tr('detailní zaměření 3D skenerem dotčených částí objektu', L)), text.slice(0, 400));
  test(L + ' 1: části studie jsou 1 a 2 (žádná část 3)',
    text.includes(tr('Studie proveditelnosti – část 1', L).replace(/\s*:$/, '')) && text.includes(tr('Studie proveditelnosti – část 2', L).replace(/\s*:$/, ''))
    && !text.includes(tr('Studie proveditelnosti – část 3', L).replace(/\s*:$/, '')), text.slice(0, 600));
  const ceny = d.bloky.filter(b => b.typ === 'cena' && /STUDII|FEASIBILITY|MACHBARKEITS|FAISABILIT/i.test(b.nadpis));
  test(L + ' 1: ceny studie bez odkazu na cenu zaměření', ceny.length >= 2 && !ceny.some(b => b.odkaz), ceny.map(b => [b.nadpis, b.castka]));
  test(L + ' 1: cena části 1 = vypracování studie, části 2 = projednání',
    !!ceny.find(b => b.nadpis === tr('CENA ZA STUDII PROVEDITELNOSTI – část 1', L) && b.sekce === 'studie')
    && !!ceny.find(b => b.nadpis === tr('CENA ZA STUDII PROVEDITELNOSTI – část 2', L) && b.sekce === 'projednani'), ceny.map(b => [b.nadpis, b.sekce]));
  test(L + ' 2: PŮVODNÍ STAV bez „ze zaměření"', !text.includes(NP.NABIDKA_PROJ_PUVODNI_STAV.stare) && !text.includes(tr(NP.NABIDKA_PROJ_PUVODNI_STAV.stare, L))
    && text.includes(tr(NP.NABIDKA_PROJ_PUVODNI_STAV.nove, L)), text.slice(0, 800));
  const uvod = d.placeholders.UVOD_NABIDKY_PROJ;
  test(L + ' 2: úvod — nová věta o studii', uvod.includes(tr('Z podkladů a prohlídky navrhneme varianty řešení a vybranou variantu zpracujeme ve STUDII PROVEDITELNOSTI.', L))
    && !uvod.includes(tr('Z výsledku zaměření navrhneme varianty řešení a vybranou variantu zpracujeme ve STUDII PROVEDITELNOSTI.', L)), uvod);
  test(L + ' 2: termín studie „od předání podkladů" (online i Word)',
    d.placeholders.PROJ_TERMINY_TERMIN.includes(tr('do 10–12 týdnů od předání podkladů', L))
    && !d.placeholders.PROJ_TERMINY_TERMIN.includes(tr('do 10–12 týdnů od zpracování výstupů ze zaměření', L))
    && JSON.stringify(d.bloky).includes(tr('do 10–12 týdnů od předání podkladů', L)), d.placeholders.PROJ_TERMINY_TERMIN);
  if (L !== 'cz') test(L + ' 2: nové věty jsou přeložené (ne česky)',
    !/podkladů|prohlídky/.test(uvod + d.placeholders.PROJ_TERMINY_TERMIN + text), (uvod + text).slice(0, 300));
  const za = d.bloky.find(b => b.typ === 'rozsah' && b.nadpis === tr('ZAMĚŘENÍ A ZPRACOVÁNÍ VÝSTUPŮ (ZA)', L));
  test(L + ' 3: samostatné ZAMĚŘENÍ (ZA) se tiskne jako dosud (5 bodů vč. 3D skenu)', !!za && za.radky.filter(x => !x[0]).length === 5
    && /3D/.test(JSON.stringify(za)), za);
  test(L + ' 3: cena ZA zaměření zůstává', !!d.bloky.find(b => b.typ === 'cena' && b.nadpis === tr('CENA ZA ZAMĚŘENÍ A ZPRACOVÁNÍ VÝSTUPŮ', L) && !b.odkaz));
  test(L + ' 4: Word dostane příznak studieBezZamereni', d.studieBezZamereni === true);
});

/* cena se nemění: nové i původní znění téže zakázky dá tutéž cenu */
{
  const a = zakazka(VSE), b = zakazka(VSE);
  zamkni(b.v, true);
  const dn = NP.nabidkaProjData(a.z, a.v, 'cz'), ds = NP.nabidkaProjData(b.z, b.v, 'cz');
  test('3: cena PROJ beze změny (nové × původní znění)', dn.souhrn.bezDph === ds.souhrn.bezDph && dn.souhrn.bezDph > 0
    && JSON.stringify(dn.rekapitulace) === JSON.stringify(ds.rekapitulace), [dn.souhrn, ds.souhrn]);
  const r = EP.vypocetProj(a.v.data.proj.zadani, a.v.data.proj.cenik);
  test('3: jádro — razítko studieBezZamereni je jen příznak, souhrn nese tatáž čísla', r.studieBezZamereni === true && typeof r.souhrn.celkem === 'number');
}

/* jen zaměření (bez studie): nic ze studie, ZA celé */
{
  const { z, v } = zakazka(['zamereni']);
  const d = NP.nabidkaProjData(z, v, 'cz');
  test('3: jen zaměření — studie se netiskne, ZA ano', !st(d) && !!d.bloky.find(b => b.nadpis === 'ZAMĚŘENÍ A ZPRACOVÁNÍ VÝSTUPŮ (ZA)'));
}

/* ---------- 5) odeslaná nabídka ---------- */
{
  const { z, v } = zakazka(VSE);
  zamkni(v, true);
  test('5: (příprava) odeslaná před #569 — razítko chybí', v.zamek.zamceno && !v.zamek.vysledek.proj.studieBezZamereni);
  test('5: nabidkaProjStudieBezZamereni = false', NP.nabidkaProjStudieBezZamereni(v) === false);
  const d = NP.nabidkaProjData(z, v, 'cz');
  const text = JSON.stringify(st(d));
  test('5: dotisk — část 1 se zaměřením zůstává', text.includes('Studie proveditelnosti – část 1 (Stavebně technický průzkum a zaměření)') && text.includes('Studie proveditelnosti – část 3'), text.slice(0, 300));
  test('5: dotisk — cena části 1 s odkazem na ZA', !!d.bloky.find(b => b.typ === 'cena' && b.odkaz && /část 1/.test(b.nadpis)));
  test('5: dotisk — původní úvod a PŮVODNÍ STAV', d.placeholders.UVOD_NABIDKY_PROJ.includes('Z výsledku zaměření navrhneme') && text.includes('grafický výstup ze zaměření'));
  test('5: dotisk — původní termín studie (online i Word)', d.placeholders.PROJ_TERMINY_TERMIN.includes('do 10–12 týdnů od zpracování výstupů ze zaměření')
    && JSON.stringify(d.bloky).includes('do 10–12 týdnů od zpracování výstupů ze zaměření'), d.placeholders.PROJ_TERMINY_TERMIN);
  test('5: dotisk — Word bez úprav studie', d.studieBezZamereni === false);
  const en = NP.nabidkaProjData(z, v, 'en');
  test('5: dotisk EN — původní znění (part 3)', JSON.stringify(st(en)).includes('part 3'));
}
{
  const { z, v } = zakazka(VSE);
  zamkni(v, false);
  test('5: odeslaná po #569 drží nové znění', NP.nabidkaProjStudieBezZamereni(v) === true
    && !JSON.stringify(st(NP.nabidkaProjData(z, v, 'cz'))).includes('Stavebně technický průzkum a zaměření'));
}
/* ruční úvod napsaný nad původním výchozím zněním se kvůli nové větě nehlásí jako „nesedí" */
{
  const vr = k => VSE.indexOf(k) >= 0;
  const stary = NP.nabidkaProjUvod(vr, null, true).join('\n');
  const zad = { uvodNabidkyRucne: 'Vlastní úvod.', uvodNabidkyZaklad: stary };
  test('2: ruční úvod nad původním zněním „nesedí" nehlásí', NP.nabidkaProjUvodNesedi(zad, NP.nabidkaProjUvod(vr).join('\n'), stary) === false);
  test('2: … ale změna činností se hlásí dál', NP.nabidkaProjUvodNesedi(zad, NP.nabidkaProjUvod(k => k === 'dpz').join('\n'),
    NP.nabidkaProjUvod(k => k === 'dpz', null, true).join('\n')) === true);
}

/* ---------- 4) Word: tabulka ve stavbě šablony PROJ v8 ---------- */
const wt = t => `<w:r><w:t xml:space="preserve">${t}</w:t></w:r>`;
const p = (...runs) => `<w:p>${runs.join('')}</w:p>`;
const tc = (...ps) => `<w:tc>${ps.join('') || '<w:p/>'}</w:tc>`;
const tr2 = (a, b) => `<w:tr>${tc(a)}${tc(b || '')}</w:tr>`;
const tbl = (...rows) => `<w:tbl>${rows.join('')}</w:tbl>`;
const sablona = (T) => '<w:body>'
  + tbl(tr2(p(wt(T.za))), tr2(p(wt(T.stp)), p(wt(T.zajisteni)))) /* ZA mimo blok */
  + p(wt('{{BLOK_STUDIE_ROZSAH_ZAC}}'))
  + tbl(
    tr2(p(wt(T.st))),
    tr2(p(wt(T.c1a), wt(T.c1b))),                       /* „část 1:" rozdělená do dvou běhů */
    tr2(p(wt(T.stp)), p(wt(T.zajisteni))),
    tr2(p(wt(T.sken))),
    tr2(p(wt(T.c2))),
    tr2(p(wt(T.navrh)), p(wt(T.puvodniA), wt(T.puvodniB))),
    tr2(p(wt(T.c3))),
    tr2(p(wt(T.projednani))))
  + p(wt('{{BLOK_STUDIE_ROZSAH_KON}}'))
  + p(wt('{{BLOK_STUDIE_CENA_ZAC}}'))
  + tbl(
    tr2(p(wt(T.cena1)), p(wt('{{PROJ_CENA_SP1}}'))),
    tr2(p(wt(T.cena2a), wt(T.cena2b)), p(wt('{{PROJ_CENA_SP2}}'))),
    tr2(p(wt(T.cena3)), p(wt('{{PROJ_CENA_SP3}}'))),
    tr2(p(wt(T.varianta)), p(wt('{{PROJ_CENA_VARIANTA}}'))))
  + p(wt('{{BLOK_STUDIE_CENA_KON}}')) + '</w:body>';
const CZ = { za: 'ZAMĚŘENÍ A ZPRACOVÁNÍ VÝSTUPŮ (ZA):', stp: 'Stavebně technický průzkum a zaměření:', zajisteni: 'zajištění původní dokumentace',
  st: 'STUDIE PROVEDITELNOSTI (ST):', c1a: 'Studie proveditelnosti – ', c1b: 'část 1:', sken: 'detailní zaměření 3D skenerem dotčených částí objektu',
  c2: 'Studie proveditelnosti – část 2:', navrh: 'Návrh grafické studie:', puvodniA: 'PŮVODNÍ STAV - grafický výstup ze ', puvodniB: 'zaměření průmět reality z průzkumu s původní dokumentací stavby',
  c3: 'Studie proveditelnosti – část 3:', projednani: 'Projednání STUDIE PROVEDITELNOSTI:',
  cena1: 'CENA ZA STUDII PROVEDITELNOSTI – části 1ZAMĚŘENÍ a zpracování výstupů bez DPH', cena2a: 'CENA ZA STUDII PROVEDITELNOSTI – část ', cena2b: '2Vypracování STUDIE PROVEDITELNOSTIbez DPH',
  cena3: 'CENA ZA STUDII PROVEDITELNOSTI – část 3Projednání STUDIE PROVEDITELNOSTIbez DPH', varianta: 'STUDIE PROVEDITELNOSTI – Variantní řešení' };
const EN = { za: 'SURVEY AND PROCESSING OF OUTPUTS (ZA):', stp: 'Building-technical inspection and survey:', zajisteni: 'obtaining the original building documentation',
  st: 'FEASIBILITY STUDY (ST):', c1a: 'Feasibility study – part', c1b: ' 1:', sken: 'detailed 3D laser scan survey of the affected parts of the building',
  c2: 'Feasibility study – part 2:', navrh: 'Graphic study design:', puvodniA: 'ORIGINAL STATE – graphic output of the survey', puvodniB: ' comparison of the inspection findings',
  c3: 'Feasibility study – part 3:', projednani: 'Approval of the FEASIBILITY STUDY:',
  cena1: 'PRICE FOR THE FEASIBILITY STUDY – parts 1 SURVEY', cena2a: 'PRICE FOR THE FEASIBILITY STUDY – part 2', cena2b: ' Preparation of the FEASIBILITY STUDY',
  cena3: 'PRICE FOR THE FEASIBILITY STUDY – part 3 Approval', varianta: 'FEASIBILITY STUDY – alternative solution' };
const text = x => (x.match(/<w:t[^>]*>[^<]*<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join('|');
[['CZ', CZ, 'grafický výstup z podkladů a prohlídky', 'část'], ['EN', EN, 'graphic output from the documents and the inspection', 'part']].forEach(([j, T, novy, slovo]) => {
  const pred = sablona(T);
  const po = DG.docxStudieBezZamereni(pred);
  const blok = po.slice(po.indexOf('BLOK_STUDIE_ROZSAH_ZAC'), po.indexOf('BLOK_STUDIE_ROZSAH_KON'));
  const ceny = po.slice(po.indexOf('BLOK_STUDIE_CENA_ZAC'), po.indexOf('BLOK_STUDIE_CENA_KON'));
  test(j + ' 4: řádky části 1 (průzkum, 3D sken) z tabulky ST zmizely', !blok.includes(T.stp) && !blok.includes(T.sken) && !blok.includes(T.zajisteni), text(blok));
  test(j + ' 4: části přečíslované (2 → 1, 3 → 2)',
    new RegExp(slovo + ' 1:').test(text(blok).replace(/\|/g, '')) && new RegExp(slovo + ' 2:').test(text(blok).replace(/\|/g, ''))
    && !new RegExp(slovo + ' 3').test(text(blok).replace(/\|/g, '')), text(blok));
  test(j + ' 4: PŮVODNÍ STAV neutrálně', text(blok).replace(/\|/g, '').includes(novy), text(blok));
  test(j + ' 4: řádek {{PROJ_CENA_SP1}} zmizel, SP2/SP3 zůstaly', !ceny.includes('PROJ_CENA_SP1') && ceny.includes('PROJ_CENA_SP2') && ceny.includes('PROJ_CENA_SP3'));
  test(j + ' 4: ceny přečíslované (část 2 → 1, 3 → 2)', new RegExp(slovo + ' ?1').test(text(ceny).replace(/\|/g, ''))
    && !new RegExp(slovo + ' ?3').test(text(ceny).replace(/\|/g, '')), text(ceny));
  test(j + ' 4: ZA mimo blok beze změny', po.slice(0, po.indexOf('BLOK_STUDIE_ROZSAH_ZAC')) === pred.slice(0, pred.indexOf('BLOK_STUDIE_ROZSAH_ZAC')));
  test(j + ' 4: XML zůstává vyvážené', (po.match(/<w:tr>/g) || []).length === (po.match(/<\/w:tr>/g) || []).length
    && (po.match(/<w:t[ >]/g) || []).length === (po.match(/<\/w:t>/g) || []).length);
});
{
  const bez = '<w:body>' + tbl(tr2(p(wt(CZ.c1a + CZ.c1b))), tr2(p(wt(CZ.stp)))) + '</w:body>';
  test('4: šablona bez bloků studie (v6 a starší) zůstane beze změny', DG.docxStudieBezZamereni(bez) === bez);
}

/* celá cesta plnění šablony (docxVyplnSablonu) a napojení v dokumenty.js */
test('4: dokumenty.js předá Wordu příznak studieBezZamereni z dat nabídky',
  /studieBezZamereni: data\.studieBezZamereni === true/.test(require('fs').readFileSync(__dirname + '/dokumenty.js', 'utf8')));
(async () => {
  const dokument = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    + sablona(CZ) + '</w:document>';
  const zip = async xml => (await DG.zipZapis([{ nazev: 'word/document.xml', data: new TextEncoder().encode(xml) }])).arrayBuffer();
  const ph = { PROJ_CENA_SP1: '1 Kč', PROJ_CENA_SP2: '2 Kč', PROJ_CENA_SP3: '3 Kč', PROJ_CENA_VARIANTA: '4 Kč' };
  const vypln = async volby => {
    const blob = await DG.docxVyplnSablonu(await zip(dokument), ph, [], {}, volby);
    const pol = await DG.zipPrecti(new Uint8Array(await blob.arrayBuffer()));
    return Buffer.from(pol.find(x => x.nazev === 'word/document.xml').data).toString('utf8');
  };
  const nove = await vypln({ studieBezZamereni: true });
  const stare = await vypln({});
  test('4: docxVyplnSablonu s příznakem — bez části 1 a bez ceny SP1', !nove.includes(CZ.sken) && !nove.includes('1 Kč') && nove.includes('2 Kč'));
  test('4: docxVyplnSablonu bez příznaku (dotisk před #569) — šablona jak je', stare.includes(CZ.sken) && stare.includes('1 Kč'));
  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL výjimka', e && e.stack); process.exit(1); });
