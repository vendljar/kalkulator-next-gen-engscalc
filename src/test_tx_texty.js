/* DÁVKA TX — TEXTY (rozhodnutí J. V. 26. 11. 2026; koordinace)
 *   #771 V4  věta konečné faktury „… na zbývajících 10 % ceny díla bez DPH, k níž bude připočtena
 *            DPH v zákonné výši.“ (+ EN/DE/FR); odeslaná po PD2 a před TX se dotiskne větou PD2
 *            (značka txTisk ve snímku podmínek), vlastní znění Firmy beze změny.
 *   #771 V5  {{NAB_ZARUKA}} „Záruka: 60 měsíců“; z kapitoly V. pryč JEN když šablona symbol má.
 *   #771 V6  online tisk: poznámky k ceně jako nadpis + seznam (a. b. c. = číslování).
 *   #815     šachta bez opláštění: požární klasifikace, odvětrání, vnější lešení; překlady
 *            FR „Sans habillage“, DE „SCHACHTVERKLEIDUNG“, EN „Compiled by:“.
 *   #814     nadpis „POHLED NA OBJEKT“ v textovém poli rámečku fotky (PROJ v9) bez fotky pryč.
 *   #811     objednávka PROJ: nadpis Poznámka drží se svým textem (PDF i Word).
 *   #812     uložení bez čísla / názvu: jedna hláška.
 *   #809     varování #756 v jednotném / množném čísle.
 *   #808     dotisk nad zakázkou jen ke čtení: záznam dotisku se smí uložit (zamekJenDotisk).
 *   K66-I1   slovník: heslo „… STUDII PROVEDITELNOSTI projednat …“ (oprava překlepu, starý tvar alias).
 * Pojistka: na 2e5f90cc (před TX) sada selže — chybí KRYCI_VETA_KONECNA_TX / značka txTisk,
 * NAB_ZARUKA, blok „seznam“, zamekJenDotisk, heslo PROVEDITELNOSTI, ramecek v docxPopiskyBezHodnoty.
 * Spuštění: node src/test_tx_texty.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js'); const PR = nacti('./preklad.js'); const DG = nacti('./docxgen.js'); nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik(); nacti('./engine_proj.js'); global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./vice_sachet.js'); nacti('./techspec.js'); nacti('./sleva.js'); nacti('./zaokrouhleni.js'); nacti('./firma.js');
nacti('./plan_plateb.js'); const zk = nacti('./zakazka.js'); const ZM = nacti('./zamek.js'); const PM = nacti('./podminky.js');
const KR = nacti('./kryci.js'); nacti('./kryci_proj.js'); const N = nacti('./nabidka.js'); const NP = nacti('./nabidka_proj.js');
const NW = nacti('./nahled_word.js'); nacti('./rucni_polozky.js'); const KO = nacti('./kontroly.js');
const J = require('./jekly.json');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 500)); } };
const cti = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
global.NAST = { firma: global.firmaDefault() };
const novaZ = () => { const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 0816'; z.nazevAkce = 'TX texty'; z.objednatel = 'Zkušební s.r.o.';
  z.projHlavicka.cislo = '2026 - OVP - CN - 0816'; z.varianty[0].data.proj.cenik = ZC.zkusebniCenikProj();
  z.varianty[0].data.cenik = Object.assign(ZC.zkusebniCenik(), { kurzEurKc: 25 }); z.varianty[0].data.ock.fixes = true;
  Object.assign(z.varianty[0].data.ock.zadani, { sirka: 1.6, hloubka: 2, zdvih: 12, prejezd: 3.3, prohluben: 1.2, nastupiste: 5, kalkVerze: 2 });
  return z; };
/* odeslaná se snímkem podmínek: značky jako PD2 (pd2Tisk) / TX (pd2Tisk + txTisk) / žádná (před PD2) */
const zamkni = (v, znacky) => {
  v.data.kryci = { hodnoty: {}, zmrazenoPodminky: Object.assign({ v: 1, vety: {} }, znacky) };
  v.data.kryciProj = { hodnoty: {}, zmrazenoPodminky: Object.assign({ v: 1, nabidkaProj: {} }, znacky) };
  v.zamek = { zamceno: true, typ: 'nabidka', kdy: '2026-11-26T10:00:00Z' };
};

(async () => {
  /* ---------- #771 V4 ---------- */
  {
    const posl = s => String(s.PODM_PLATEBNI_KALENDAR || '').split('\n').pop();
    const sym = (z, v, L = 'cz') => KR.kryciPlatebniSymboly(KR.kryciPlatebniKalendar(z, v, J), L === 'cz' ? (x => x) : (t => PR.tr(t, L)), L);
    const z = novaZ(), v = z.varianty[0];
    test('V4 CZ: přesné znění J. V. 26. 11. 2026', posl(sym(z, v)) === 'Po ukončení všech výše uvedených prací a po řádném předání a převzetí celého díla '
      + 'předávacím protokolem bude vystaven 3. konečný daňový doklad na zbývajících 10 % ceny díla bez DPH, k níž bude připočtena DPH v zákonné výši.', posl(sym(z, v)));
    const en = posl(sym(z, v, 'en')), de = posl(sym(z, v, 'de')), fr = posl(sym(z, v, 'fr'));
    test('V4 EN: „the 3rd final tax invoice … remaining 10 % of the contract price excl. VAT, to which VAT … will be added“',
      /the 3rd final tax invoice will be issued for the remaining 10 % of the contract price excl\. VAT, to which VAT at the statutory rate will be added\.$/.test(en), en);
    test('V4 DE: „die 3. Schlussrechnung über die verbleibenden 10 % des Werkpreises ohne MwSt. …, zuzüglich der MwSt.“',
      /die 3\. Schlussrechnung über die verbleibenden 10 % des Werkpreises ohne MwSt\. ausgestellt, zuzüglich der MwSt\. in gesetzlicher Höhe\.$/.test(de), de);
    test('V4 FR: „la 3e facture finale … les 10 % restants du prix de l’ouvrage hors TVA, auxquels s’ajoutera la TVA“',
      /la 3e facture finale sera émise pour les 10 % restants du prix de l’ouvrage hors TVA, auxquels s’ajoutera la TVA au taux légal\.$/.test(fr), fr);
    test('V4: nový snímek podmínek nese značku txTisk (i pd2Tisk)', PM.podminkySnimek(global.NAST.firma).txTisk === 1 && PM.podminkySnimek(global.NAST.firma).pd2Tisk === 1);
    const zs = novaZ(), vs = zs.varianty[0];
    KR.kryciZmrazPodminky(zs, vs);
    ZM.zamkniVariantu(vs, { typ: 'nabidka', kdo: 'Test', cislo: zs.cislo });
    delete vs.data.kryci.zmrazenoPodminky.txTisk;   // odeslaná po PD2, před TX
    test('V4: odeslaná po PD2, před TX → dotisk větou PD2 (beze změny)', /ve výši 10 % \(bez DPH\) z celkové ceny díla s vyúčtováním DPH/.test(posl(sym(zs, vs))), posl(sym(zs, vs)));
    vs.data.kryci.zmrazenoPodminky.txTisk = 1;
    test('V4: odeslaná po TX → věta TX', /na zbývajících 10 % ceny díla bez DPH/.test(posl(sym(zs, vs))), posl(sym(zs, vs)));
    delete vs.data.kryci.zmrazenoPodminky.txTisk; delete vs.data.kryci.zmrazenoPodminky.pd2Tisk;
    test('V4: odeslaná před PD2 → „na zbývající část“', /na zbývající část celkové ceny díla/.test(posl(sym(zs, vs))), posl(sym(zs, vs)));
    global.NAST.firma.podminky = { v: 1, vety: { konecna: { cz: 'Vlastní věta konečné faktury.' } } };
    const z2 = novaZ();
    test('V4: vlastní znění Firmy beze změny', posl(sym(z2, z2.varianty[0])) === 'Vlastní věta konečné faktury.');
    delete global.NAST.firma.podminky;
  }

  /* ---------- #771 V5 ---------- */
  {
    const z = novaZ(), v = z.varianty[0];
    const s = (zz, vv, sym) => N.nabidkaData(zz, vv, J, 'cz', sym ? { symboly: new Set(sym) } : null).placeholders;
    const bez = s(z, v, ['NAB_KAP_TERMINY']), se = s(z, v, ['NAB_KAP_TERMINY', 'NAB_ZARUKA']);
    test('V5: NAB_ZARUKA = „Záruka: 60 měsíců“', bez.NAB_ZARUKA === 'Záruka: 60 měsíců', bez.NAB_ZARUKA);
    test('V5: šablona BEZ symbolu → záruka zůstává v Termínech (bez regrese)', /Záruka: 60 měsíců/.test(bez.NAB_KAP_TERMINY), bez.NAB_KAP_TERMINY);
    test('V5: šablona SE symbolem → Termíny bez záruky', !/Záruka/.test(se.NAB_KAP_TERMINY) && se.NAB_KAP_TERMINY.length > 0, se.NAB_KAP_TERMINY);
    test('V5: online tisk (bez šablony) → záruka v Termínech jako dřív', /Záruka: 60 měsíců/.test(s(z, v, null).NAB_KAP_TERMINY));
    test('V5 EN: „Warranty: 60 months“', N.nabidkaData(z, v, J, 'en', null).placeholders.NAB_ZARUKA === 'Warranty: 60 months',
      N.nabidkaData(z, v, J, 'en', null).placeholders.NAB_ZARUKA);
    const zs = novaZ(), vs = zs.varianty[0]; zamkni(vs, { pd2Tisk: 1 });
    const st = s(zs, vs, ['NAB_KAP_TERMINY', 'NAB_ZARUKA']);
    test('V5: odeslaná před TX + nová šablona → NAB_ZARUKA prázdný (blok zmizí), záruka v Termínech', st.NAB_ZARUKA === '' && /Záruka/.test(st.NAB_KAP_TERMINY), st);
    /* Word: blok {{NAB_ZARUKA_ZAC}} … {{NAB_ZARUKA_KON}} s prázdným symbolem zmizí, s hodnotou zůstane. */
    const p = t => '<w:p><w:r><w:t xml:space="preserve">' + t + '</w:t></w:r></w:p>';
    const telo = p('V. TERMÍNY') + p('{{NAB_ZARUKA_ZAC}}') + p('{{NAB_ZARUKA}}') + p('{{NAB_ZARUKA_KON}}') + p('VI. PŘEDÁNÍ');
    const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + telo + '<w:sectPr/></w:body></w:document>';
    const zip = async () => (await DG.zipZapis([{ nazev: '[Content_Types].xml', data: new TextEncoder().encode('<Types/>') },
      { nazev: 'word/document.xml', data: new TextEncoder().encode(xml) }])).arrayBuffer();
    const text = async ph => { const b = await DG.docxVyplnSablonu(await zip(), ph, [], {}, {});
      const x = new TextDecoder().decode((await DG.zipPrecti(new Uint8Array(await b.arrayBuffer()))).find(q => q.nazev === 'word/document.xml').data);
      return (x.match(/<w:t[^>]*>[^<]*<\/w:t>/g) || []).map(q => q.replace(/<[^>]+>/g, '')).join('|'); };
    test('V5 Word: blok záruky s hodnotou → vlastní bod „Záruka: 60 měsíců“', await text({ NAB_ZARUKA: 'Záruka: 60 měsíců' }) === 'V. TERMÍNY|Záruka: 60 měsíců|VI. PŘEDÁNÍ');
    test('V5 Word: prázdný NAB_ZARUKA → blok zmizí i se značkami', await text({ NAB_ZARUKA: '' }) === 'V. TERMÍNY|VI. PŘEDÁNÍ');
  }

  /* ---------- #771 V6 ---------- */
  {
    const z = novaZ(), v = z.varianty[0];
    const blok = (zz, vv, L) => NW.nwBloky(N.nabidkaData(zz, vv, J, L), L, { foto: '' }).find(b => b.styl === 'pozn-cena');
    const b = blok(z, v, 'cz');
    test('V6: online tisk — poznámky k ceně jako seznam (nadpis + 3 body bez písmen v textu)', b && b.typ === 'seznam'
      && b.nadpis === 'Poznámky k cenové nabídce:' && b.radky.length === 3 && b.radky[0] === 'cena vychází z technické specifikace nabídky – viz výše'
      && b.radky.every(r => !/^[a-c]\.\s/.test(r)), b);
    const html = NW.nwHtml([b]);
    test('V6: HTML — <ol> s písmeny (nw-ol-pism)', /<ol class="nw-ol nw-ol-pism"><li>cena vychází/.test(html), html.slice(0, 300));
    test('V6: CSS seznamu (lower-alpha)', /ol\.nw-ol-pism\{list-style:lower-alpha/.test(cti('ui/nahled_word_ui.js')));
    const be = blok(z, v, 'en');
    test('V6 EN: nadpis „Notes on the price quotation:“ + 3 body', be && be.typ === 'seznam' && be.nadpis === 'Notes on the price quotation:' && be.radky.length === 3, be);
    const zs = novaZ(), vs = zs.varianty[0]; zamkni(vs, { pd2Tisk: 1 });
    const bs = blok(zs, vs, 'cz');
    test('V6: odeslaná před TX → odstavce jako dřív (týž papír)', bs && bs.typ === 'odstavce' && /^Poznámky k cenové nabídce: a\./.test(bs.radky[0]), bs);
  }

  /* ---------- #815 ---------- */
  {
    const bez = () => ({ odM: 0, pasy: [{ typ: 'bez', doM: null }] });
    const BEZ = { oplasteni: { rezim: 'poStenach', steny: { A: bez(), B: bez(), C: bez(), D: bez() } },
      nadDvermi: 'stavba', bokyDveri: 'stavba', svetlikNadDvermi: false, svetlikyBoky: 0, typSachty: 'exteriérová' };
    const z = novaZ(), v = z.varianty[0];
    Object.assign(v.data.ock.zadani, BEZ, { volitelne: Object.assign({}, v.data.ock.zadani.volitelne, { leseniVnejsi: true }) });
    const ph = N.nabidkaData(z, v, J, 'cz').placeholders;
    test('#815: požární klasifikace bez zmínky o opláštění („materiály DP1“)', ph.TS_POZARNI === 'materiály DP1', ph.TS_POZARNI);
    test('#815: odvětrání bez „zadní stěny“', !/zadní stěn/.test(ph.TS_ODVETRANI) && (ph.TS_ODVETRANI === 'přirozené, šachta bez opláštění' || ph.TS_ODVETRANI === 'není součástí nabídky'), ph.TS_ODVETRANI);
    test('#815: vnější lešení bez „pro provedení kompletního opláštění“', !/opláštění/.test(ph.TS_LESENI_VNE), ph.TS_LESENI_VNE);
    const phEn = N.nabidkaData(z, v, J, 'en').placeholders;
    test('#815 EN: „DP1 materials“, bez „cladding“ v požární klasifikaci', phEn.TS_POZARNI === 'DP1 materials', phEn.TS_POZARNI);
    test('#815 FR: TYP OPLÁŠTĚNÍ „Sans habillage“', N.nabidkaData(z, v, J, 'fr').placeholders.TS_TYP_OPLASTENI === 'Sans habillage');
    /* ruční přepis ve specifikaci vyhrává */
    v.data.techspec.hodnoty.pozarni = 'materiály DP1, opláštění bez deklarované požární odolnosti';
    test('#815: ruční přepis požární klasifikace zůstává', N.nabidkaData(z, v, J, 'cz').placeholders.TS_POZARNI === 'materiály DP1, opláštění bez deklarované požární odolnosti');
    delete v.data.techspec.hodnoty.pozarni;
    /* šachta S opláštěním beze změny */
    const zn = novaZ(), phn = N.nabidkaData(zn, zn.varianty[0], J, 'cz').placeholders;
    test('#815: šachta s opláštěním beze změny', phn.TS_POZARNI === 'materiály DP1, opláštění bez deklarované požární odolnosti', phn.TS_POZARNI);
    /* odeslaná po PD2, před TX → beze změny */
    zamkni(v, { pd2Tisk: 1 });
    const pho = N.nabidkaData(z, v, J, 'cz').placeholders;
    test('#815: odeslaná před TX → požární klasifikace jak odešla', pho.TS_POZARNI === 'materiály DP1, opláštění bez deklarované požární odolnosti', pho.TS_POZARNI);
    test('#815 slovník: DE „SCHACHTVERKLEIDUNG“, EN „Compiled by:“, FR „Établi par :“', PR.tr('OPLÁŠTĚNÍ ŠACHTY', 'de') === 'SCHACHTVERKLEIDUNG'
      && PR.tr('Vypracoval:', 'en') === 'Compiled by:' && PR.tr('Vypracoval:', 'fr') === 'Établi par :' && PR.tr('bez opláštění', 'fr') === 'Sans habillage');
  }

  /* ---------- #814 ---------- */
  {
    const txbx = t => '<w:p><w:r><w:drawing><wp:anchor><a:graphic><a:graphicData><wps:wsp><wps:txbx><w:txbxContent>'
      + '<w:p><w:r><w:t>' + t + '</w:t></w:r></w:p></w:txbxContent></wps:txbx></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>'
      + '<w:r><w:pict><v:shape><v:textbox><w:txbxContent><w:p><w:r><w:t>' + t + '</w:t></w:r></w:p></w:txbxContent></v:textbox></v:shape></w:pict></w:r></w:p>';
    const xml = '<w:body>' + txbx('POHLED NA OBJEKT') + '<w:p><w:r><w:t>Text</w:t></w:r></w:p></w:body>';
    const po = DG.odstranOdstavceSTextem(xml, DG.docxPopiskyBezHodnoty({ foto: false, tel: '1', ramecek: true }));
    test('#814: nadpis v textovém poli (wps:txbx i v:textbox) zmizí, rámeček a kresba zůstanou', !/POHLED NA OBJEKT/.test(po)
      && (po.match(/<w:txbxContent><w:p\/><\/w:txbxContent>/g) || []).length === 2 && /<w:drawing>/.test(po) && /Text/.test(po), po);
    test('#814: s fotkou se nemaže', /POHLED NA OBJEKT/.test(DG.odstranOdstavceSTextem(xml, DG.docxPopiskyBezHodnoty({ foto: true, tel: '1', ramecek: true }).concat(['x']))));
    test('#814: bez `ramecek` (OCK, odeslaná před TX) se nemaže', /POHLED NA OBJEKT/.test(DG.odstranOdstavceSTextem(xml, DG.docxPopiskyBezHodnoty({ foto: false, tel: '' }))));
    const z = novaZ(), v = z.varianty[0];
    test('#814: nabídka PROJ bez fotky (neodeslaná) → v seznamu i „POHLED NA OBJEKT“', NP.nabidkaProjData(z, v, 'cz').odstavceTextPryc.includes('POHLED NA OBJEKT'));
    zamkni(v, { pd2Tisk: 1 });
    test('#814: odeslaná po PD2, před TX → nadpis rámečku zůstane', !NP.nabidkaProjData(z, v, 'cz').odstavceTextPryc.includes('POHLED NA OBJEKT'));
    v.data.kryciProj.zmrazenoPodminky.txTisk = 1;
    test('#814: odeslaná po TX → nadpis rámečku pryč', NP.nabidkaProjData(z, v, 'cz').odstavceTextPryc.includes('POHLED NA OBJEKT'));
  }

  /* ---------- #811 ---------- */
  {
    const ui = cti('ui/objednavka_proj_ui.js');
    test('#811 PDF: každý nadpis poznámek blokový s break-after: avoid', /\.pozn b\{display:block;break-after:avoid;page-break-after:avoid\}/.test(ui)
      && /\.pozn b\+p\{break-before:avoid/.test(ui));
    test('#811 Word: nadpisy poznámek vždy keepNext (nadpisP)', /const nadpisP = \{ keep: true \};/.test(cti('objednavka_proj.js'))
      && /B\('Poznámka', Object\.assign\(\{ sz: 16 \}, nadpisP\)\)/.test(cti('objednavka_proj.js')));
  }

  /* ---------- #812 ---------- */
  {
    const ui = cti('ui/zakulozeni_ui.js');
    const zdroj = ui.slice(ui.indexOf('function zakUlozeniRadek'), ui.indexOf('/* #801: stránka s hlavičkou'));
    const ctx = { ZAKULO_STAV: { hlaska: '', hlaskaTyp: '' }, ONLINE_STAV: { rejstrik: [], soubor: '' }, ZAK: {},
      zakUlozeniStav: () => ({ stav: 'vyplnit', chybi: ['Číslo nabídky (CN)'], text: 'Zakázka ještě není v databázi. Vyplňte v hlavičce: Číslo nabídky (CN) – pak zakázku uložte (dál už se ukládá sama).' }),
      zapisTridaHlasky: t => 'h-' + t, esc: s => s, zakKanal: () => 'online', zakazkaDuplicita: () => ({ cislo: '' }) };
    vm.createContext(ctx); vm.runInContext(zdroj + '\nthis.f = zakUlozeniRadek;', ctx);
    test('#812: bez kliknutí jedna stavová hláška', (ctx.f().match(/Vyplňte v hlavičce/g) || []).length === 1);
    ctx.ZAKULO_STAV.hlaska = 'Vyplňte v hlavičce: Číslo nabídky (CN) – pak zakázku uložte. Než ji vyplníte, uložte si práci do souboru …';
    const h = ctx.f();
    test('#812: po „Uložit zakázku“ jen JEDNA hláška (ta s radou o souboru)', (h.match(/Vyplňte v hlavičce/g) || []).length === 1 && /do souboru/.test(h), h);
  }

  /* ---------- #809 ---------- */
  {
    const ZAD = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4, typSachty: 'exteriérová' };
    const zakazka = (rucni, prepis) => { const zak = zk.novaZakazka(); const v = zak.varianty[0];
      v.data.cenik = Object.assign(ZC.zkusebniCenik(), { kurzEurKc: 25 }); v.data.ock.fixes = true;
      Object.assign(v.data.ock.zadani, ZAD, { vlastniPolozky: rucni }, prepis || {}); return v; };
    const nalez = v => KO.kontrolyProved({ jazyk: 'cz', vysledek: vypocetZ(v, J), zadani: v.data.ock.zadani, ock: v.data.ock }).nalezy.find(n => n.kod === 'rucniPolozkaPomer');
    const LAK = 'LAKOVÁNÍ (ŠACHTA, PLECHY, ZASKLENÍ, OPLECHOVÁNÍ)';
    const n1 = nalez(zakazka({ spojovaci: [{ nazev: 'Kotvy navíc', mnozstvi: 10, cena: 100 }] }, { mnozstviPrepis: { 'SPOJOVACÍ MATERIÁL': 3 } }));
    test('#809: jedna položka, jeden řádek — znění beze změny', n1 && n1.text === 'Ruční položka „Kotvy navíc" bere cenu z poměru řádku „SPOJOVACÍ MATERIÁL" v Hrubé OCK, '
      + 'který je ručně přepsaný (množství nebo cena). Cena položky v rozpisu nabídky je proto jen podíl přepsaného řádku; celková cena nabídky sedí. '
      + 'Zkontrolujte rozpis, nebo zrušte přepis řádku.', n1 && n1.text);
    const n2 = nalez(zakazka({ spojovaci: [{ nazev: 'Kotvy navíc', mnozstvi: 10, cena: 100 }], lakovani: [{ nazev: 'Lak navíc', mnozstvi: 2, cena: 500 }] },
      { mnozstviPrepis: { 'SPOJOVACÍ MATERIÁL': 3, [LAK]: 5 } }));
    test('#809: dvě položky, dva řádky — „berou cenu z poměru řádků …, které jsou ručně přepsané“', n2 && / berou cenu z poměru řádků „/.test(n2.text)
      && /, které jsou ručně přepsané/.test(n2.text) && /Ceny položek v rozpisu nabídky jsou proto jen podíly přepsaných řádků/.test(n2.text)
      && /zrušte přepisy řádků\.$/.test(n2.text), n2 && n2.text);
    const n3 = nalez(zakazka({ spojovaci: [{ nazev: 'A', mnozstvi: 1, cena: 100 }, { nazev: 'B', mnozstvi: 1, cena: 100 }] }, { mnozstviPrepis: { 'SPOJOVACÍ MATERIÁL': 3 } }));
    test('#809: dvě položky, jeden řádek — „berou cenu z poměru řádku …, který je“', n3 && / berou cenu z poměru řádku „/.test(n3.text) && /, který je ručně přepsaný/.test(n3.text), n3 && n3.text);
  }

  /* ---------- #808 ---------- */
  {
    test('#808: zamekJenDotisk existuje', typeof ZM.zamekJenDotisk === 'function');
    if (typeof ZM.zamekJenDotisk !== 'function') ZM.zamekJenDotisk = () => null;   // pojistka: zbytek sady selže, nespadne
    const z = novaZ(), v = z.varianty[0];
    ZM.zamkniVariantu(v, { typ: 'nabidka', kdo: 'Test', cislo: z.cislo });
    z.protokol = [{ id: 'p1', kdy: '2026-11-26T10:00:00Z', co: 'Odesláno' }];
    const ulozeno = JSON.stringify(z);
    test('#808: bez změny → false (není co ukládat)', false === ZM.zamekJenDotisk(JSON.stringify(z), ulozeno));
    ZM.zamkniVariantu(v, { typ: 'nabidka', kdo: 'Test' });   // dotisk: další záznam do tisky
    z.protokol.push({ id: 'p2', kdy: '2026-11-26T11:00:00Z', co: 'Dotisk' });
    test('#808: jen nový záznam dotisku + protokol → true', ZM.zamekJenDotisk(JSON.stringify(z), ulozeno));
    const a = JSON.parse(JSON.stringify(z)); a.varianty[0].data.ock.zadani.zdvih = 13;
    test('#808: dotisk + změna výpočtu → false (zámek čtení dál platí)', false === ZM.zamekJenDotisk(JSON.stringify(a), ulozeno));
    const b = JSON.parse(JSON.stringify(z)); b.varianty[0].zamek.tisky[0].kdo = 'Jiný';
    test('#808: přepsaný starý záznam tisku → false', false === ZM.zamekJenDotisk(JSON.stringify(b), ulozeno));
    const c = JSON.parse(JSON.stringify(z)); c.protokol = [c.protokol[1]];
    test('#808: nejstarší uložený řádek protokolu odříznutý přetečením (PROTOKOL_MAX) → true', ZM.zamekJenDotisk(JSON.stringify(c), ulozeno));
    const d = JSON.parse(JSON.stringify(z)); d.protokol[0].co = 'Jinak';
    test('#808: změněný uložený řádek protokolu → false', false === ZM.zamekJenDotisk(JSON.stringify(d), ulozeno));
    const e = JSON.parse(ulozeno); e.varianty[0].zamek = undefined; const eu = JSON.stringify(e);
    const f = JSON.parse(eu); ZM.zamkniVariantu(f.varianty[0], { typ: 'nabidka', kdo: 'Test' });
    test('#808: PRVNÍ zámek (varianta v uložené verzi nezamčená) → false (to není dotisk)', false === ZM.zamekJenDotisk(JSON.stringify(f), eu));
    /* odemčená varianta (zamceno: false) s historií tisků — nový záznam není dotisk zamčené nabídky */
    const g = JSON.parse(ulozeno); g.varianty[0].zamek.zamceno = false; const gu = JSON.stringify(g);
    g.varianty[0].zamek.tisky.push({ kdy: '2026-11-26T12:00:00Z', typ: 'nabidka', kdo: 'Test' });
    test('#808: nový tisk u ODEMČENÉ varianty → false', false === ZM.zamekJenDotisk(JSON.stringify(g), gu));
    /* Revize Fable N1: nový typ tisku (první smlouva o dílo) není dotisk */
    const h = JSON.parse(ulozeno);
    h.varianty[0].zamek.tisky.push({ kdy: '2026-11-26T12:00:00Z', typ: 'sod', kdo: 'Test' });
    test('#808 N1: první tisk SoD u varianty, která smlouvu netiskla → false', false === ZM.zamekJenDotisk(JSON.stringify(h), ulozeno));
    const hu = JSON.stringify(h), h2 = JSON.parse(hu);
    h2.varianty[0].zamek.tisky.push({ kdy: '2026-11-26T13:00:00Z', typ: 'sod', kdo: 'Test' });
    test('#808 N1: dotisk SoD, kterou varianta už tiskla → true', ZM.zamekJenDotisk(JSON.stringify(h2), hu) === true);
    const ui = cti('ui/online_ui.js');
    test('#808 UI: onlineUloz pustí jen dotisk nad zakázkou jen ke čtení', /!onlineJenProdej\(\) && !onlineJenDotisk\(\)\)/.test(ui));
    test('#808 UI: dialog při přepnutí nesvádí na ATYP a nabídne Uložit záznam', /const jenDotisk = jenCteni && onlineJenDotisk\(\);/.test(ui) && /Uložit záznam a otevřít jinou/.test(ui));
  }

  /* ---------- K66-I1 ---------- */
  {
    const t = 'díky obsahu a zpracování je možné naší STUDII PROVEDITELNOSTI projednat v této fázi na odboru památkové péče HMP';
    test('K66-I1: opravené heslo se přeloží (EN/DE/FR)', ['en', 'de', 'fr'].every(L => PR.trStav(t, L).prelozeno && /FEASIBILITY|MACHBARKEITS|FAISABILIT/.test(PR.trStav(t, L).text)));
    test('K66-I1: starý tvar s překlepem dál přeložený (alias pro staré šablony)', ['en', 'de', 'fr'].every(L => PR.trStav(t.replace('PROVEDIT', 'PROVDIT'), L).prelozeno));
  }

  console.log(`\n${ok} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
