/* ============================================================
 * Test #367 fáze 2b — věty platebního kalendáře, texty nabídky PROJ
 * a rozšíření krycích listů z Nastavení → Firma (podminky.js)
 *
 * Rozhodnutí J. V. 19. 10. 2026:
 *   Q3  věty platebních podmínek (nabídka OCK, smlouva o dílo realizace)
 *       do Firmy i v EN/DE/FR, výchozí znění ze slovníku — žádný prázdný
 *       jazyk s českou zálohou;
 *   Q5  texty nabídky PROJ (Cena nezahrnuje, Požadováno od investora,
 *       Termíny) z dnešního kódu do Firmy, doložky PROJ prázdné a vypnuté;
 *   Q6  typ smlouvy, licence PD, pojištění a „Cena nezahrnuje" krycích
 *       listů do Firmy.
 *
 * Hlídá totéž co test_podminky.js: prázdné Nastavení = dosavadní výstup,
 * změna Firmy se propíše, cizí jazyk nikdy nespadne do češtiny.
 * Firma i zakázky jsou ukázkové.
 * ============================================================ */
const fs = require('fs');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
const PR = nacti('./preklad.js');
nacti('./docxgen.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
const PD = nacti('./podminky.js');
const FM = nacti('./firma.js');
nacti('./plan_plateb.js');
const NP = nacti('./nabidka_proj.js');
const zk = nacti('./zakazka.js');
const kr = nacti('./kryci.js');
const kp = nacti('./kryci_proj.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); } };
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));
/* zkratka „IČ" (inženýrská činnost) zůstává ve všech jazycích — slovník ji tak překládá od K18-N95 */
const CESKA = { test: t => /[ěščřžůťďňĚŠČŘŽŮŤĎŇ]/.test(String(t).replace(/\(IČ\)|\bIČ\b/g, '')) };
const JAZ = ['en', 'de', 'fr'];
global.NAST = { firma: FM.firmaDefault() };
const tr = L => x => PR.tr(x, L);

/* ---------- 1) věty nabídky OCK: prázdné Nastavení = dosavadní výstup ---------- */
{
  const zak = zk.novaZakazka(); const v = zak.varianty[0];
  const kal = kr.kryciPlatebniKalendar(zak, v, JEKLY);
  const [v13zal, v13f2, v13kon] = kr.KRYCI_VETY_V13;
  const dnes = L => [v13zal.replace('{{PODM_ZALOHA1_PROC}}', '50 %'), v13f2.replace('{{PODM_FAKTURA2_PROC}}', '40 %'), v13kon]
    .map(x => L === 'cz' ? x : PR.tr(x, L)).join('\n');
  ['cz'].concat(JAZ).forEach(L => {
    const s = kr.kryciPlatebniSymboly(kal, L === 'cz' ? (x => x) : tr(L), L);
    test('prázdné Nastavení: kalendář nabídky ' + L.toUpperCase() + ' = dosavadní věty (šablona v13 + slovník)',
      s.PODM_PLATEBNI_KALENDAR === dnes(L), [s.PODM_PLATEBNI_KALENDAR.slice(0, 120), dnes(L).slice(0, 120)]);
    if (L !== 'cz') test('kalendář ' + L.toUpperCase() + ' nemá češtinu', !CESKA.test(s.PODM_PLATEBNI_KALENDAR), s.PODM_PLATEBNI_KALENDAR.slice(0, 200));
  });
  v.data.kryci = { hodnoty: { zpusobFakturace: 'Měsíční' } };
  const kalM = kr.kryciPlatebniKalendar(zak, v, JEKLY);
  test('měsíční fakturace CZ = dosavadní věta', kr.kryciPlatebniSymboly(kalM, x => x, 'cz').PODM_FAKTURACE_MESICNE === kr.KRYCI_FAKTURACE_MESICNE_VETA);
  test('měsíční fakturace DE ze slovníku', kr.kryciPlatebniSymboly(kalM, tr('de'), 'de').PODM_FAKTURACE_MESICNE === PR.tr(kr.KRYCI_FAKTURACE_MESICNE_VETA, 'de'));
}

/* ---------- 2) věty z Firmy ---------- */
{
  NAST.firma.podminky = { vety: {
    zaloha: { cz: '{PORADI} doklad {PROC} po podpisu.', en: 'Invoice {PORADI}: {PROC} on signature.', fr: 'Facture {PORADI} : {PROC}.' },
    faktura2: { cz: '{PORADI} doklad {PROC} po dodání.' },
    sodZCeny: { cz: 'z ceny díla' },
  } };
  const zak = zk.novaZakazka(); const v = zak.varianty[0];
  v.data.kryci = { hodnoty: { zaloha1: '12,5 % – po podpisu smlouvy', faktura2: '77,5 % – po zahájení montáže' } };
  const kal = kr.kryciPlatebniKalendar(zak, v, JEKLY);
  const cz = kr.kryciPlatebniSymboly(kal, x => x, 'cz').PODM_PLATEBNI_KALENDAR.split('\n');
  test('Firma CZ: věta zálohy z Firmy s pořadím a procentem', cz[0] === '1. doklad 12,5 % po podpisu.', cz[0]);
  test('Firma CZ: věta faktury 2 z Firmy', cz[1] === '2. doklad 77,5 % po dodání.', cz[1]);
  const en = kr.kryciPlatebniSymboly(kal, tr('en'), 'en').PODM_PLATEBNI_KALENDAR.split('\n');
  test('Firma EN: vlastní znění, anglické pořadí a desetinná tečka', en[0] === 'Invoice 1st: 12.5 % on signature.', en[0]);
  test('Firma EN bez vlastního znění faktury 2: překlad VÝCHOZÍ věty (žádná čeština)',
    /partial tax invoice/.test(en[1]) && !CESKA.test(en[1]), en[1]);
  const fr = kr.kryciPlatebniSymboly(kal, tr('fr'), 'fr').PODM_PLATEBNI_KALENDAR.split('\n');
  test('Firma FR: francouzské pořadí „1re"', fr[0] === 'Facture 1re : 12,5 %.', fr[0]);
  const ef = PD.podminkyEf(NAST.firma);
  test('upravená čeština bez EN/DE znění se v Nastavení hlásí', PD.podminkyVetaJenVychoziPreklad(ef, 'faktura2', 'de')
    && !PD.podminkyVetaJenVychoziPreklad(ef, 'zaloha', 'en') && !PD.podminkyVetaJenVychoziPreklad(ef, 'konecna', 'de'));
  /* smlouva o dílo realizace */
  const sod = kr.kryciSodPlatby(zak, v, JEKLY, null, 'cz').symboly.SOD_PLATEBNI_KALENDAR.split('\n');
  test('SoD CZ: „z ceny díla" z Firmy', sod.every(r => / z ceny díla$/.test(r)), sod);
  delete NAST.firma.podminky;
  const sod0 = kr.kryciSodPlatby(zak, v, JEKLY, null, 'cz').symboly.SOD_PLATEBNI_KALENDAR.split('\n');
  test('SoD CZ bez Firmy: dosavadní znění zálohy a konečné splátky',
    sod0[0] === 'při uzavření této smlouvy o dílo 12,5 % z celkové ceny díla'
    && sod0[2] === 'po provedení celého díla zhotovitele a jeho předání a převzetí bez vad a nedodělků bránících provozu výtahu zbývajících 10 % z celkové ceny díla', sod0);
  JAZ.forEach(L => {
    const s = kr.kryciSodPlatby(zak, v, JEKLY, null, L).symboly.SOD_PLATEBNI_KALENDAR;
    test('SoD ' + L.toUpperCase() + ' bez Firmy: bez češtiny', !CESKA.test(s), s.slice(0, 200));
  });
  NAST.firma.podminky = { vety: { sodZaloha: { de: 'bei Unterschrift' } } };
  test('SoD DE: vlastní znění milníku zálohy z Firmy',
    /^bei Unterschrift – 12,5 %/.test(kr.kryciSodPlatby(zak, v, JEKLY, null, 'de').symboly.SOD_PLATEBNI_KALENDAR));
  delete NAST.firma.podminky;
}

/* ---------- 3) vady vět ---------- */
test('věta zálohy bez {PROC} je vada', PD.podminkyVady({ vety: { zaloha: { cz: '{PORADI} doklad.' } } }).length === 1);
test('neznámá věta a neznámý jazyk jsou vady',
  PD.podminkyVady({ vety: { xx: { cz: 'a' }, konecna: { it: 'b' } } }).length === 2);
test('prázdné cizí znění vadou není (= slovník)', PD.podminkyVady({ vety: { konecna: { en: '' } } }).length === 0);
test('čistá kopie vět nese jen známé klíče a neprázdné jazyky',
  JSON.stringify(PD.podminkyCiste({ vety: { konecna: { cz: 'K.', en: '', it: 'x' }, xx: { cz: 'y' } } }).vety) === '{"konecna":{"cz":"K."}}');

/* ---------- 4) texty nabídky PROJ ---------- */
const zakProj = () => { const z = zk.novaZakazka(); z.cislo = '2026 - OVP - CN - 367'; z.nazevAkce = 'Zkušební akce';
  const v = z.varianty[0]; v.data.proj.cenik = ZC.zkusebniCenikProj(); v.data.proj.cenik.kurzEurKc = 25;
  v.data.proj.zadani.sekce.forEach(s => s.polozky.forEach(p => { p.vyrazeno = false; }));
  return z; };
const blok = (d, nadpis, L) => d.bloky.find(b => b.nadpis === PR.tr(nadpis, L || 'cz'));
{
  const z = zakProj();
  const d = NP.nabidkaProjData(z, z.varianty[0], 'cz');
  const T = PD.PODMINKY_VYCHOZI.nabidkaProj;
  test('prázdné Nastavení: CENA NEZAHRNUJE = dosavadní tři řádky',
    JSON.stringify(blok(d, 'CENA NEZAHRNUJE').radky) === JSON.stringify(T.cenaNezahrnuje.cz));
  test('prázdné Nastavení: POŽADOVÁNO OD INVESTORA = dosavadní tři řádky',
    JSON.stringify(blok(d, 'POŽADOVÁNO OD INVESTORA').radky) === JSON.stringify(T.pozadovano.cz));
  test('prázdné Nastavení: TERMÍNY mají první řádek zaměření',
    (blok(d, 'TERMÍNY').radky[0] || [])[0] === T.terminy.cz[0][0]);
  test('prázdné Nastavení: doložky PROJ se netisknou', !blok(d, 'DOLOŽKY') && d.placeholders.PROJ_DOLOZKY === '');
  test('symbol {{PROJ_CENA_NEZAHRNUJE}} nese řádky', d.placeholders.PROJ_CENA_NEZAHRNUJE === T.cenaNezahrnuje.cz.join('\n'));
  test('symbol {{PROJ_TERMINY}} nese „činnost – termín"', /^Provedení detailního zaměření .* – ZAMĚŘENÍ na stavbě/.test(d.placeholders.PROJ_TERMINY));
  JAZ.forEach(L => {
    const dL = NP.nabidkaProjData(z, z.varianty[0], L);
    const radky = ['CENA NEZAHRNUJE', 'POŽADOVÁNO OD INVESTORA', 'TERMÍNY'].map(n => blok(dL, n, L))
      .reduce((a, b) => a.concat(b ? b.radky : ['CHYBÍ BLOK']), []);
    test('texty PROJ ' + L.toUpperCase() + ' z výchozích: přeložené, bez češtiny',
      radky.length > 10 && radky.every(r => !CESKA.test(Array.isArray(r) ? r.join(' ') : r)),
      radky.filter(r => CESKA.test(Array.isArray(r) ? r.join(' ') : r)).slice(0, 3));
  });
  /* Firma změní texty */
  NAST.firma.podminky = { nabidkaProj: {
    cenaNezahrnuje: { cz: ['Poplatky úřadům'], en: ['Fees to authorities'] },
    terminy: { cz: [['Zaměření', 'do 2 týdnů', 'zamereni'], ['Kolaudace', 'do 1 měsíce', 'kolaudace']] },
    dolozky: { cz: ['Autorská práva drží {FIRMA}.'] }, dolozkyTisk: true } };
  NAST.firma.nazev = 'Zkušební firma s.r.o.';
  const d2 = NP.nabidkaProjData(z, z.varianty[0], 'cz');
  test('Firma: CENA NEZAHRNUJE z Firmy', JSON.stringify(blok(d2, 'CENA NEZAHRNUJE').radky) === '["Poplatky úřadům"]');
  test('Firma: TERMÍNY z Firmy', JSON.stringify(blok(d2, 'TERMÍNY').radky) === '[["Zaměření","do 2 týdnů"],["Kolaudace","do 1 měsíce"]]',
    blok(d2, 'TERMÍNY').radky);
  test('Firma: zapnuté doložky se tisknou a {FIRMA} se nahradí',
    JSON.stringify((blok(d2, 'DOLOŽKY') || {}).radky) === '["Autorská práva drží Zkušební firma s.r.o.."]' && /Zkušební firma/.test(d2.placeholders.PROJ_DOLOZKY));
  const d2en = NP.nabidkaProjData(z, z.varianty[0], 'en');
  test('Firma EN: vlastní anglické znění', JSON.stringify(blok(d2en, 'CENA NEZAHRNUJE', 'en').radky) === '["Fees to authorities"]');
  /* termín nenabízené činnosti se netiskne */
  const z3 = zakProj(); z3.varianty[0].data.proj.zadani.sekce.filter(s => s.key === 'kolaudace')
    .forEach(s => s.polozky.forEach(p => { p.vyrazeno = true; }));
  const d3 = NP.nabidkaProjData(z3, z3.varianty[0], 'cz');
  test('Firma: termín nenabízené činnosti (kolaudace) se netiskne',
    JSON.stringify(blok(d3, 'TERMÍNY').radky) === '[["Zaměření","do 2 týdnů"]]', blok(d3, 'TERMÍNY').radky);
  delete NAST.firma.podminky;
}
test('vady textů PROJ: cizí znění s jiným počtem řádků', PD.podminkyVady({ nabidkaProj: { pozadovano: { en: ['a'] } } }).length === 1);
test('vady textů PROJ: termín s neznámou sekcí', PD.podminkyVady({ nabidkaProj: { terminy: { cz: [['a', 'b', 'xx']] } } }).length === 1);
test('vady textů PROJ: tisk doložek musí být ano/ne', PD.podminkyVady({ nabidkaProj: { dolozkyTisk: 'ano' } }).length === 1);
test('výchozí doložky PROJ prázdné a vypnuté',
  PD.PODMINKY_VYCHOZI.nabidkaProj.dolozky.cz.length === 0 && PD.PODMINKY_VYCHOZI.nabidkaProj.dolozkyTisk === false);

/* ---------- 5) rozšíření krycích listů (Q6) ---------- */
{
  const zak = zk.novaZakazka(); const v = zak.varianty[0];
  const pO = id => [].concat(...kr.KRYCI_SEKCE.map(s => s.pole)).find(p => p.id === id);
  const pP = id => [].concat(...kp.KRYCI_PROJ_SEKCE.map(s => s.pole)).find(p => p.id === id);
  const hO = id => kr.kryciHodnota(pO(id), { hodnoty: {} }, kr.kryciCtx(zak, v, JEKLY));
  const hP = id => kp.kryciProjHodnota(pP(id), { hodnoty: {} }, kp.kryciProjCtx(zak, v));
  test('prázdné Nastavení: OCK typ smlouvy a „Cena nezahrnuje" = dosavadní', hO('typSmlouvy') === 'Naše bez úprav' && hO('cenaNezahrnuje') === 'dle CN');
  test('prázdné Nastavení: PROJ typ, licence, pojištění, „Cena nezahrnuje" = dosavadní',
    hP('typSmlouvy') === 'Naše bez úprav' && hP('autorskaPrava') === 'nevýhradní, pro účel stavby dle smlouvy'
    && hP('pojisteni') === 'ANO – dle pojistné smlouvy zhotovitele'
    && hP('cenaNezahrnuje') === 'správní poplatky, posudky nad rámec nabídky, činnosti neuvedené v nabídce');
  NAST.firma.podminky = { ock: { typSmlouvy: 'Cizí', cenaNezahrnuje: 'lešení' },
    proj: { typSmlouvy: 'Naše s úpravami', licence: 'výhradní', pojisteni: 'ANO – limit dle smlouvy', cenaNezahrnuje: 'poplatky' } };
  test('Firma: OCK typ smlouvy a „Cena nezahrnuje"', hO('typSmlouvy') === 'Cizí' && hO('cenaNezahrnuje') === 'lešení');
  test('Firma: PROJ typ, licence, pojištění, „Cena nezahrnuje"', hP('typSmlouvy') === 'Naše s úpravami' && hP('autorskaPrava') === 'výhradní'
    && hP('pojisteni') === 'ANO – limit dle smlouvy' && hP('cenaNezahrnuje') === 'poplatky');
  NAST.firma.podminky = { ock: { typSmlouvy: 'Vlastní' } };
  test('neplatný typ smlouvy → továrna a vada', hO('typSmlouvy') === 'Naše bez úprav' && PD.podminkyVady(NAST.firma.podminky).length === 1);
  delete NAST.firma.podminky;
  const k1 = fs.readFileSync(__dirname + '/kryci.js', 'utf8'), k2 = fs.readFileSync(__dirname + '/kryci_proj.js', 'utf8');
  test('v kódu krycích listů už není literál typu smlouvy, licence, pojištění ani „Cena nezahrnuje" v prefillu',
    !/prefill: \(\) => '(Naše bez úprav|dle CN|nevýhradní|ANO – dle|správní poplatky)/.test(k1 + k2));
  const n = fs.readFileSync(__dirname + '/nabidka_proj.js', 'utf8');
  test('v nabidka_proj.js už nejsou řádky CENA NEZAHRNUJE ani TERMÍNY', !/Případné studie a průzkumy|do 10–12 týdnů od zpracování výstupů/.test(n));
}

console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
if (fail) process.exit(1);
