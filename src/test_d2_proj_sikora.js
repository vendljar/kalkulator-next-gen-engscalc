/* D2 (v20.10.4) — ŠABLONA NABÍDKY PROJ OBCHODNÍKA (OVP-CN „online calkulak",
 * rev. 33, 15. 9. 2026; rozhodnutí J. V. 20. 10. 2026):
 *   1. Akce mimo Prahu: přepínač v zadání PROJ + cena 1 výjezdu technika
 *      v ceníku PROJ (u zakázky přepsatelná). ZA / SP / DPZ / KOLAUDACE —
 *      výjezd se přičte k ceně a nabídka to řekne větou (DPZ a KOLAUDACE
 *      s dovětkem o dalších cestách); IČ a AD — cena výjezdu se jen uvede.
 *      V Praze se nic netiskne. Online i Word ({{PROJ_CESTOVNE_…}}, PROJ v8).
 *   2. Úvod „Naše NABÍDKA a doporučení": předvyplněný, ruční úprava u
 *      varianty, „Vrátit výchozí", upozornění, když se změní činnosti.
 *   3. Jednostupňová dokumentace: jen upozornění kontroly před nabídkou.
 * Pojistka proti prázdnému testu: na stromu před D2 sada selže hned na
 * prvních kontrolách (vyjezdTechnikaKc / NABIDKA_PROJ_CESTOVNE neexistují).
 *
 * Spuštění: cd src && node test_d2_proj_sikora.js */
const path = require('path');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./preklad.js');
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
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info.slice(0, 600) : JSON.stringify(info).slice(0, 600))); } };
const chybaZ = (fn) => { try { fn(); return ''; } catch (e) { return e.message; } };

test('engine_proj exportuje vyjezdTechnikaKc', typeof EP.vyjezdTechnikaKc === 'function');
test('nabidka_proj exportuje věty cestovného', !!(NP.NABIDKA_PROJ_CESTOVNE && NP.NABIDKA_PROJ_CESTOVNE_KDE));
if (fail) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }

const kopie = o => JSON.parse(JSON.stringify(o));
const CEN = Object.assign(kopie(ZC.zkusebniCenikProj()), { vyjezdTechnikKc: 3500 });
/* zadání: zaměření zapnuté, všechny sekce s náklady */
const zadani = (uprava) => {
  const z = kopie(EP.DEFAULT_ZADANI_PROJ);
  z.sekce.forEach(s => s.polozky.forEach(p => { p.vyrazeno = false; }));
  return Object.assign(z, uprava || {});
};
const sek = (r, k) => r.sekce.find(s => s.key === k);

/* ---------------- 1) jádro ---------------- */
{
  const praha = EP.vypocetProj(zadani(), CEN);
  const mimo = EP.vypocetProj(zadani({ akceMimoPrahu: true }), CEN);
  test('Praha: žádný výjezd', praha.souhrn.vyjezd === 0 && praha.sekce.every(s => s.vyjezdKc === 0), praha.souhrn);
  ['zamereni', 'dpz', 'kolaudace'].forEach(k => test('mimo Prahu: ' + k + ' + 3 500 Kč po přirážce',
    sek(mimo, k).vyjezdKc === 3500 && Math.abs(sek(mimo, k).celkem - sek(praha, k).celkem - 3500) < 1e-9,
    [sek(mimo, k).celkem, sek(praha, k).celkem]));
  test('mimo Prahu: přirážka se z výjezdu nepočítá', sek(mimo, 'zamereni').marze === sek(praha, 'zamereni').marze);
  test('se zaměřením: studie výjezd nedostane (jedna cesta)', sek(mimo, 'studie').vyjezdKc === 0);
  ['ic', 'dps', 'ezc', 'geodet', 'projednani'].forEach(k => test('mimo Prahu: ' + k + ' beze změny',
    sek(mimo, k).celkem === sek(praha, k).celkem));
  test('souhrn: celkem = Praha + 3 × výjezd', Math.abs(mimo.souhrn.celkem - praha.souhrn.celkem - 3 * 3500) < 1e-9
    && mimo.souhrn.vyjezd === 10500, mimo.souhrn);

  const bezZam = zadani({ akceMimoPrahu: true });
  bezZam.sekce.find(s => s.key === 'zamereni').polozky.forEach(p => { p.vyrazeno = true; });
  const r2 = EP.vypocetProj(bezZam, CEN);
  test('bez zaměření: výjezd jde ke studii', sek(r2, 'studie').vyjezdKc === 3500 && sek(r2, 'zamereni').vyjezdKc === 0);
  test('vyřazená sekce se kvůli výjezdu nevrátí', sek(r2, 'zamereni').celkem === 0);

  const pre = EP.vypocetProj(zadani({ akceMimoPrahu: true, vyjezdKcPrepis: 5000 }), CEN);
  test('přepis u zakázky má přednost', sek(pre, 'dpz').vyjezdKc === 5000);
  const nula = EP.vypocetProj(zadani({ akceMimoPrahu: true, vyjezdKcPrepis: 0 }), CEN);
  test('přepis 0 = cestu neúčtujeme', nula.souhrn.vyjezd === 0);
  const prazdnyPrepis = EP.vypocetProj(zadani({ akceMimoPrahu: true, vyjezdKcPrepis: '' }), CEN);
  test('prázdný přepis = ceník', prazdnyPrepis.souhrn.vyjezd === 10500);
  const bezCeny = EP.vypocetProj(zadani({ akceMimoPrahu: true }), Object.assign(kopie(CEN), { vyjezdTechnikKc: undefined }));
  test('starší ceník bez klíče: nic se nepřičte, žádné NaN', bezCeny.souhrn.vyjezd === 0 && isFinite(bezCeny.souhrn.celkem));
}

/* ---------------- 2) nabídka online + symboly ---------------- */
const zakazka = (uprava) => {
  const zak = zk.novaZakazka(); zak.cislo = '2026 - OVP - CN - 9142'; zak.nazevAkce = 'Zkušební akce';
  const v = zak.varianty[0];
  v.data.proj.cenik = kopie(CEN);
  v.data.proj.zadani = Object.assign(zadani({ nabizetAD: true }), uprava || {});
  return { zak, v };
};
/* formát částek nese pevné mezery — porovnává se s obyčejnými */
const nbsp = d => JSON.parse(JSON.stringify(d).replace(/\u00a0/g, ' '));
const cenaBlok = (d, nadpis) => d.bloky.find(b => b.typ === 'cena' && b.nadpis === nadpis);
{
  const { zak, v } = zakazka();
  const d = NP.nabidkaProjData(zak, v, 'cz');
  test('Praha: žádná věta o cestovném', d.bloky.every(b => !(b.cestovne || []).length));
  test('Praha: symboly cestovného prázdné', Object.keys(d.placeholders).filter(k => /^PROJ_CESTOVNE_/.test(k)).length === 6
    && Object.keys(d.placeholders).filter(k => /^PROJ_CESTOVNE_/.test(k)).every(k => d.placeholders[k] === ''));
}
{
  const { zak, v } = zakazka({ akceMimoPrahu: true });
  const d = nbsp(NP.nabidkaProjData(zak, v, 'cz'));
  const za = cenaBlok(d, 'CENA ZA ZAMĚŘENÍ A ZPRACOVÁNÍ VÝSTUPŮ');
  const VETA = 'Cena zahrnuje i cestovní náklady na 1 výjezd technika na stavbu (3 500,00 Kč bez DPH).';
  test('ZA: věta s cenou výjezdu', za && za.cestovne.join(' ') === VETA, za && za.cestovne);
  const dpz = cenaBlok(d, 'CENA ZA DOKUMENTACI PRO POVOLENÍ ZÁMĚRU (DPZ)');
  test('DPZ: věta + další cesty', dpz && dpz.cestovne.join(' ') === VETA + ' Případné další cesty budou fakturovány individuálně.', dpz && dpz.cestovne);
  const kol = cenaBlok(d, 'CENA ZA ZAJIŠTĚNÍ KOLAUDAČNÍHO ŘÍZENÍ');
  test('KOLAUDACE: věta + další cesty', kol && kol.cestovne.length === 2);
  const ic = cenaBlok(d, 'CENA ZA INŽENÝRSKOU ČINNOST (IČ)');
  test('IČ: NEZAHRNUJE s cenou za výjezd', ic && ic.cestovne.join(' ') === 'Cena NEZAHRNUJE cestovní náklady – případné cesty budou fakturovány individuálně ve výši 3 500,00 Kč bez DPH za jeden výjezd.', ic && ic.cestovne);
  const ad = cenaBlok(d, 'MĚSÍČNÍ SAZBA ZA AUTORSKÝ DOZOR (AD)');
  test('AD: věta o každém výjezdu AD', ad && /^Cestovní náklady na každý 1 výjezd AD na stavbu \(3 500,00 Kč bez DPH\)/.test(ad.cestovne.join(' ')), ad && ad.cestovne);
  const sp2 = cenaBlok(d, 'CENA ZA STUDII PROVEDITELNOSTI – část 2');
  test('SP se zaměřením: věta jen u zaměření (výjezd jednou)', sp2 && sp2.cestovne.length === 0);
  test('DPS / EZC / geodet: nic', ['CENA ZA DOKUMENTACI PRO PROVEDENÍ STAVBY (DPS)', 'CENA ZA EKONOMICKOU ZADÁVACÍ ČÁST (EZC)', 'CENA ZA GEODETICKÉ ZAMĚŘENÍ']
    .every(n => !cenaBlok(d, n) || !cenaBlok(d, n).cestovne.length));
  const p = d.placeholders;
  test('symboly Wordu = věty online', p.PROJ_CESTOVNE_ZAMERENI === VETA && p.PROJ_CESTOVNE_DPZ === dpz.cestovne.join(' ')
    && p.PROJ_CESTOVNE_IC === ic.cestovne.join(' ') && p.PROJ_CESTOVNE_AD === ad.cestovne.join(' ') && p.PROJ_CESTOVNE_SP === '');
  /* cena činnosti s výjezdem konzistentně: rekapitulace, CELKEM, plán plateb */
  const { zak: zP, v: vP } = zakazka();
  const dP = NP.nabidkaProjData(zP, vP, 'cz');
  test('CELKEM bez DPH o 3 výjezdy výš', Math.abs(d.souhrn.bezDph - dP.souhrn.bezDph - 10500) < 1e-6, [d.souhrn.bezDph, dP.souhrn.bezDph]);
  const pl = NP.nabidkaProjPlatby(zak, v, 'cz');
  const plP = NP.nabidkaProjPlatby(zP, vP, 'cz');
  test('plán plateb: cena DPZ s výjezdem', pl && plP && Math.abs(pl.ceny.dpz - plP.ceny.dpz - 3500) < 1e-6, pl && pl.ceny);
  test('plán plateb: IČ beze změny', pl && plP && pl.ceny.ic === plP.ceny.ic);

  /* AD nenabízený → věta AD nikde */
  const { zak: z2, v: v2 } = zakazka({ akceMimoPrahu: true, nabizetAD: false });
  const d2 = NP.nabidkaProjData(z2, v2, 'cz');
  test('AD se nenabízí: bez věty AD', d2.placeholders.PROJ_CESTOVNE_AD === '');

  /* bez zaměření → věta u studie */
  const { zak: z3, v: v3 } = zakazka({ akceMimoPrahu: true });
  v3.data.proj.zadani.sekce.find(s => s.key === 'zamereni').polozky.forEach(x => { x.vyrazeno = true; });
  const d3 = nbsp(NP.nabidkaProjData(z3, v3, 'cz'));
  test('bez zaměření: věta u studie (SP)', d3.placeholders.PROJ_CESTOVNE_SP === VETA && d3.placeholders.PROJ_CESTOVNE_ZAMERENI === '');

  /* bez ceny výjezdu: nic se nevymýšlí */
  const { zak: z4, v: v4 } = zakazka({ akceMimoPrahu: true });
  v4.data.proj.cenik.vyjezdTechnikKc = 0;
  const d4 = NP.nabidkaProjData(z4, v4, 'cz');
  test('bez ceny výjezdu: žádná věta', Object.keys(d4.placeholders).filter(k => /^PROJ_CESTOVNE_/.test(k)).every(k => d4.placeholders[k] === ''));

  /* nenabízená IČ: věta o cestovném IČ není */
  const { zak: z6, v: v6 } = zakazka({ akceMimoPrahu: true });
  v6.data.proj.zadani.sekce.find(s => s.key === 'ic').polozky.forEach(x => { x.vyrazeno = true; });
  test('IČ se nenabízí: bez věty IČ', NP.nabidkaProjData(z6, v6, 'cz').placeholders.PROJ_CESTOVNE_IC === '');

  /* EN: přeloženo, v eurech */
  const { zak: z5, v: v5 } = zakazka({ akceMimoPrahu: true });
  v5.data.proj.cenik.kurzEurKc = 25; v5.data.cenik = Object.assign(v5.data.cenik || {}, { kurzEurKc: 25 });
  const d5 = nbsp(NP.nabidkaProjData(z5, v5, 'en'));
  test('EN: přeložená věta v eurech', /^The price also includes travel costs for 1 visit of a technician to the site \(140[,.]00 €|^The price also includes travel costs for 1 visit of a technician to the site \(.*140/.test(d5.placeholders.PROJ_CESTOVNE_ZAMERENI), d5.placeholders.PROJ_CESTOVNE_ZAMERENI);
  ['de', 'fr'].forEach(L => {
    const dx = NP.nabidkaProjData(z5, v5, L);
    test(L.toUpperCase() + ': věta není česky', dx.placeholders.PROJ_CESTOVNE_IC && !/cestovní/.test(dx.placeholders.PROJ_CESTOVNE_IC), dx.placeholders.PROJ_CESTOVNE_IC);
  });
}

/* ---------------- 3) úvod upravený obchodníkem ---------------- */
{
  const { zak, v } = zakazka();
  const d0 = NP.nabidkaProjData(zak, v, 'cz');
  test('výchozí úvod: data nesou výchozí znění', d0.uvod && d0.uvod.vychoziCz === d0.placeholders.UVOD_NABIDKY_PROJ && !d0.uvod.rucne && !d0.uvod.nesedi);
  const RUC = 'Nabízíme celý projekt na klíč.\nDruhý odstavec obchodníka.';
  Object.assign(v.data.proj.zadani, { uvodNabidkyRucne: RUC, uvodNabidkyZaklad: d0.uvod.vychoziCz });
  const d1 = NP.nabidkaProjData(zak, v, 'cz');
  const blok = d1.bloky.find(b => b.nadpis === 'Naše NABÍDKA a doporučení');
  test('ruční úvod: online dva odstavce', blok && blok.odstavce.length === 2 && blok.odstavce[0] === 'Nabízíme celý projekt na klíč.', blok);
  test('ruční úvod: Word symbol', d1.placeholders.UVOD_NABIDKY_PROJ === RUC);
  test('ruční úvod: sedí, dokud se činnosti nemění', d1.uvod.nesedi === false);
  v.data.proj.cenik.kurzEurKc = 25;
  const den = NP.nabidkaProjData(zak, v, 'en');
  test('EN: výchozí přeložený úvod (ruční je česky)', den.placeholders.UVOD_NABIDKY_PROJ !== RUC && den.placeholders.UVOD_NABIDKY_PROJ.length > 0);
  /* změna činností: vyřadit DPZ */
  v.data.proj.zadani.sekce.find(s => s.key === 'dpz').polozky.forEach(x => { x.vyrazeno = true; });
  const d2 = NP.nabidkaProjData(zak, v, 'cz');
  test('změněné činnosti: upozornění „nemusí sedět"', d2.uvod.nesedi === true);
  test('změněné činnosti: text se nepřepíše', d2.placeholders.UVOD_NABIDKY_PROJ === RUC);
  /* kontrola před nabídkou */
  const ctx = { zak, projZadani: v.data.proj.zadani, projVysledek: EP.vypocetProj(v.data.proj.zadani, v.data.proj.cenik), cenikProj: v.data.proj.cenik };
  const kody = KO.kontrolyProved(ctx).kody || KO.kontrolyProved(ctx).nalezy.map(n => n.kod);
  test('kontrola uvodProjNesedi se ozve', kody.indexOf('uvodProjNesedi') >= 0, kody);
  /* Vrátit výchozí */
  Object.assign(v.data.proj.zadani, { uvodNabidkyRucne: '', uvodNabidkyZaklad: null });
  const d3 = NP.nabidkaProjData(zak, v, 'cz');
  test('Vrátit výchozí: zpět výchozí znění bez upozornění', d3.placeholders.UVOD_NABIDKY_PROJ === d3.uvod.vychoziCz && !d3.uvod.nesedi);
  /* zamčená varianta drží text (zadání je její) */
  Object.assign(v.data.proj.zadani, { uvodNabidkyRucne: RUC });
  /* #458 (K4-N8, O8): zámek jako ve skutečnosti (zamkniVariantu → zamceno,
   * výsledek PROJ zmrazený při odeslání) a výjimka z nabidkaProjData je
   * selhání, ne „projde“. Před úpravou test prošel i s výjimkou (dz = null)
   * a se zámkem bez `zamceno`; ověřeno podvržením výjimky — před 0, po 1 FAIL. */
  delete v.zamek;
  zamkniVariantu(v, { kdy: '2026-10-20T08:00:00Z', typ: 'nabidkaProj',
    vysledek: { proj: EP.vypocetProj(v.data.proj.zadani, v.data.proj.cenik) } });
  let dz = null, chybaZ = null;
  try { dz = NP.nabidkaProjData(zak, v, 'cz'); } catch (e) { chybaZ = String(e && e.message || e); }
  test('zamčená varianta (zamkniVariantu): ruční text zůstává',
    v.zamek && v.zamek.zamceno === true && !chybaZ && !!dz && dz.placeholders.UVOD_NABIDKY_PROJ === RUC,
    chybaZ || (dz && dz.placeholders.UVOD_NABIDKY_PROJ));
}

/* ---------------- 4) kontroly: jednostupňová, cena výjezdu, Word ---------------- */
{
  const kody = (z, cen, sablona) => {
    const r = KO.kontrolyProved({ projZadani: z, projVysledek: EP.vypocetProj(z, cen), cenikProj: cen, sablonaNabidkaProj: sablona });
    return (r.nalezy || []).map(n => n.kod);
  };
  test('jednostupňová: upozornění', kody(zadani({ jednostupnova: true }), CEN).indexOf('jednostupnovaProj') >= 0);
  test('jednostupňová vypnutá: mlčí', kody(zadani(), CEN).indexOf('jednostupnovaProj') < 0);
  const txt = (KO.kontrolyProved({ projZadani: zadani({ jednostupnova: true }), projVysledek: EP.vypocetProj(zadani(), CEN), cenikProj: CEN }).nalezy || [])
    .find(n => n.kod === 'jednostupnovaProj');
  test('jednostupňová: text říká co hlídat (DPZ+DPS, ceny, plán plateb)', txt && /ve Wordu ručně/.test(txt.text) && /DPZ a DPS/.test(txt.text) && /plán plateb/.test(txt.text), txt);
  test('jednostupňová: nic se nepřepočítá', EP.vypocetProj(zadani({ jednostupnova: true }), CEN).souhrn.celkem === EP.vypocetProj(zadani(), CEN).souhrn.celkem);
  const bez = Object.assign(kopie(CEN), { vyjezdTechnikKc: 0 });
  test('mimo Prahu bez ceny: vyjezdCenaChybi', kody(zadani({ akceMimoPrahu: true }), bez).indexOf('vyjezdCenaChybi') >= 0);
  test('mimo Prahu s přepisem 0: mlčí', kody(zadani({ akceMimoPrahu: true, vyjezdKcPrepis: 0 }), bez).indexOf('vyjezdCenaChybi') < 0);
  test('mimo Prahu s cenou: mlčí', kody(zadani({ akceMimoPrahu: true }), CEN).indexOf('vyjezdCenaChybi') < 0);
  const stara = { symboly: ['PROJ_CENA_ZAMERENI', 'PROJ_CELKEM_BEZ_DPH'], nazev: 'PROJ v7', verze: 7 };
  const nova = { symboly: ['PROJ_CENA_ZAMERENI', 'PROJ_CESTOVNE_ZAMERENI'], nazev: 'PROJ v8', verze: 8 };
  test('šablona bez cestovného: cestovneWordProj', kody(zadani({ akceMimoPrahu: true }), CEN, stara).indexOf('cestovneWordProj') >= 0);
  test('šablona v8: mlčí', kody(zadani({ akceMimoPrahu: true }), CEN, nova).indexOf('cestovneWordProj') < 0);
  test('Praha: mlčí', kody(zadani(), CEN, stara).indexOf('cestovneWordProj') < 0);
}

/* ---------------- 5) šablona PROJ v8 (syntetické XML) ---------------- */
let VS = null;
try { VS = require(path.join(__dirname, '..', 'nastroje', 'vyrob_sablony.js')); } catch (e) { VS = null; }
test('vyrob_sablony exportuje projV8', !!(VS && typeof VS.projV8 === 'function'));
if (VS && VS.projV8) {
  const r = t => '<w:r><w:t xml:space="preserve">' + t + '</w:t></w:r>';
  const p = t => '<w:p><w:pPr><w:pStyle w:val="Bezmezer"/></w:pPr>' + (t ? r(t) : '') + '</w:p>';
  const tbl = (...ps) => '<w:tbl><w:tblPr/><w:tr><w:tc>' + ps.map(p).join('') + '</w:tc></w:tr></w:tbl>';
  const V7 = '<w:document><w:body>'
    + p('ZAMĚŘENÍ') + tbl('CENA ZA ZAMĚŘENÍ', '{{PROJ_CENA_ZAMERENI}}') + p('')
    + tbl('SP1', '{{PROJ_CENA_SP1}}', 'SP2', '{{PROJ_CENA_SP2}}', 'SP3', '{{PROJ_CENA_SP3}}')
    + tbl('DPZ', '{{PROJ_CENA_DPZ}}') + p('{{BLOK_DPZ_HVEZDICKA_ZAC}}') + p('{{PROJ_DPZ_HVEZDICKA}}') + p('{{BLOK_DPZ_HVEZDICKA_KON}}')
    + tbl('IČ', '{{PROJ_CENA_IC}}') + tbl('KOL', '{{PROJ_CENA_KOLAUDACE}}')
    + p('{{BLOK_AD_ZAC}}') + tbl('AD', '{{PROJ_CENA_AD_BLOK}}') + p('{{BLOK_AD_KON}}')
    + tbl('DOLOŽKY:', '{{PROJ_DOLOZKY}}') + '<w:sectPr/></w:body></w:document>';
  const v8 = VS.projV8(V7);
  const sym = dg.klicePlaceholderu(v8);
  const CEST = ['ZAMERENI', 'SP', 'DPZ', 'IC', 'KOLAUDACE', 'AD'];
  test('v8: šest symbolů cestovného', CEST.every(x => sym.indexOf('PROJ_CESTOVNE_' + x) >= 0), sym);
  test('v8: každý v bloku ZAC/KON', CEST.every(x => {
    const a = v8.indexOf('{{BLOK_CESTOVNE_' + x + '_ZAC}}'), b = v8.indexOf('{{PROJ_CESTOVNE_' + x + '}}'), c = v8.indexOf('{{BLOK_CESTOVNE_' + x + '_KON}}');
    return a > 0 && a < b && b < c;
  }));
  test('v8: cestovné ZA hned za tabulkou ceny zaměření', v8.indexOf('{{BLOK_CESTOVNE_ZAMERENI_ZAC}}') > v8.indexOf('{{PROJ_CENA_ZAMERENI}}')
    && v8.indexOf('{{BLOK_CESTOVNE_ZAMERENI_ZAC}}') < v8.indexOf('{{PROJ_CENA_SP1}}'));
  test('v8: cestovné AD uvnitř bloku AD', v8.indexOf('{{BLOK_CESTOVNE_AD_KON}}') < v8.indexOf('{{BLOK_AD_KON}}')
    && v8.indexOf('{{BLOK_CESTOVNE_AD_ZAC}}') > v8.indexOf('{{BLOK_AD_ZAC}}'));
  test('v8: cestovné DPZ před hvězdičkou DPZ', v8.indexOf('{{BLOK_CESTOVNE_DPZ_KON}}') < v8.indexOf('{{BLOK_DPZ_HVEZDICKA_ZAC}}'));
  test('v8: původní symboly zůstaly', dg.klicePlaceholderu(V7).every(k => sym.indexOf(k) >= 0));
  test('v8: podruhé odmítne', /už symboly cestovného/.test(chybaZ(() => VS.projV8(v8))));
  test('v8: vstup bez doložek (v5) odmítne', /není PROJ v6/.test(chybaZ(() => VS.projV8(V7.replace('{{PROJ_DOLOZKY}}', 'x')))));
  test('v8: cena ve dvou tabulkách odmítne', /v právě jednom prvku těla, je v 2/.test(chybaZ(() => VS.projV8(V7.replace('<w:sectPr/>', tbl('DPZ znovu', '{{PROJ_CENA_DPZ}}') + '<w:sectPr/>')))));
  test('v8: chybějící cena odmítne', /PROJ_CENA_IC/.test(chybaZ(() => VS.projV8(V7.replace('{{PROJ_CENA_IC}}', 'x')))));
  /* aplikace: prázdný symbol (Praha) blok odstraní, plný ho vytiskne */
  const ph = {}; CEST.forEach(x => { ph['PROJ_CESTOVNE_' + x] = ''; });
  const praha = dg.odstranPrazdneBloky(v8, Object.assign({}, ph, { PROJ_DOLOZKY: 'x', PROJ_DPZ_HVEZDICKA: '*' }));
  test('Word Praha: bloky cestovného zmizí', dg.klicePlaceholderu(praha).every(k => !/CESTOVNE/.test(k)));
  const mimo = dg.odstranPrazdneBloky(v8, Object.assign({}, ph, { PROJ_CESTOVNE_DPZ: 'Cena zahrnuje…', PROJ_DOLOZKY: 'x', PROJ_DPZ_HVEZDICKA: '*' }));
  test('Word mimo Prahu: zůstane jen vyplněný', dg.klicePlaceholderu(mimo).indexOf('PROJ_CESTOVNE_DPZ') >= 0
    && dg.klicePlaceholderu(mimo).indexOf('PROJ_CESTOVNE_IC') < 0);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
