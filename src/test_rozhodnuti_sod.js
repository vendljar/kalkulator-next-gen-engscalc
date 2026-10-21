/* ROZHODNUTÍ J. V. 1. 10. 2026 K NÁVRHU SMLUV O DÍLO (Q2–Q6, Q10).
 *
 * „Souhlas s výchozími odpověďmi, kromě bodu 10" — do smlouvy o dílo
 * realizace (OCK) jdou z krycího listu OCK i údaje, které se dosud
 * dopisovaly ve Wordu, a šablony v2 berou pokutu za prodlení zhotovitele
 * z pokuty za prodlení dodávky (OCK) / nedodržení termínu (PROJ).
 *
 * Hlídá se:
 *   – nová datumová pole sekce Termíny (bez předvyplnění, pořadí podle
 *     průběhu stavby) → {{SOD_TERMIN_*}} ve tvaru DD.MM.RRRR; prázdné pole
 *     symbol neplní (zůstane {{…}}),
 *   – místo plnění (výběr + vlastní znění, bez předvyplnění) →
 *     {{SOD_MISTO_PLNENI_DRUH}}, denní pokuta → {{SOD_POKUTA_DENNI}},
 *   – nic z toho neprosákne do cenové nabídky (KRYCI_NABIDKA_SEKCE, PODM_*),
 *   – datum podpisu = datum tisku smlouvy i u zamčené (odeslané) varianty;
 *     zamčení ho nezmrazí, ruční přepis platí,
 *   – pokuta za prodlení zhotovitele: „0" → věta pryč (jen když ji šablona
 *     má), procento → symbol, vlastní znění bez procenta → {{…}} zůstane,
 *   – výroba šablon v2 nad syntetickým XML: přepojení symbolu pokuty,
 *     datum rozdělené do běhů → {{SOD_TERMIN_PODKLADY_VYTAH}} se zachovaným
 *     formátováním, chyba, když datum není právě jednou.
 * Před úpravou pole, funkce ani přepojení neexistovaly — sada selže.
 *
 * Spuštění: cd src && node test_rozhodnuti_sod.js */
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./preklad.js');
const dg = nacti('./docxgen.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
['./techspec.js', './sleva.js', './zaokrouhleni.js', './firma.js', './zpracovatel.js', './plan_plateb.js',
  './nabidka_proj.js'].forEach(nacti);
const zk = nacti('./zakazka.js');
const ZM = nacti('./zamek.js');
const KR = nacti('./kryci.js');
const KP = nacti('./kryci_proj.js');
nacti('./kontroly.js');
nacti('./dokumenty.js');
const NB = nacti('./nabidka.js');
const sod = nacti('./sod.js');
const JEKLY = JSON.parse(require('fs').readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info.slice(0, 700) : JSON.stringify(info))); } };
const hazi = (fn) => { try { fn(); return ''; } catch (e) { return e.message || String(e); } };

global.NAST = { firma: global.firmaDefault() };
const novaZ = () => { const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 0406'; z.adresa = 'Zkušební 6, Praha'; return z; };
const novaZProj = () => { const z = zk.novaZakazka(); z.cislo = '2026 - OVP - CN - 0406'; z.varianty[0].data.proj.cenik = ZC.zkusebniCenikProj(); return z; };
const sablona = (...symboly) => ({ symboly: new Set(symboly) });
const V1 = sablona('SOD_SPLATKA1_PROC', 'SOD_SPLATKA2_PROC', 'SOD_SPLATKA3_PROC', 'SOD_SPLATKA4_PROC', 'SOD_ZARUKA_MESICU',
  'PODM_POKUTA_SPLATNOST_PROC', 'SOD_POKUTA_DENNI', 'SOD_DATUM_PODPISU', 'CENA_BEZ_DPH');
const V2 = sablona('SOD_PLATEBNI_KALENDAR', 'SOD_ZARUKA_MESICU', 'PODM_POKUTA_DODAVKA_PROC', 'PODM_POKUTA_SPLATNOST_PROC',
  'SOD_TERMIN_PODKLADY_VYTAH', 'SOD_POKUTA_DENNI', 'SOD_DATUM_PODPISU', 'CENA_BEZ_DPH');
const hodnoty = (v, h) => { v.data.kryci = v.data.kryci || { hodnoty: {} }; v.data.kryci.hodnoty = Object.assign(v.data.kryci.hodnoty || {}, h); };
const dva = n => String(n).padStart(2, '0');
const dnesCz = () => { const d = new Date(); return dva(d.getDate()) + '.' + dva(d.getMonth() + 1) + '.' + d.getFullYear(); };

const POLE = [].concat(...KR.KRYCI_SEKCE.map(s => s.pole));
const pole = id => POLE.find(p => p.id === id);
const sekcePole = id => (KR.KRYCI_SEKCE.find(s => s.pole.some(p => p.id === id)) || {}).sekce;
const SEKCE_SOD = 'Smlouva o dílo (SoD realizace)';

/* 1) Termíny smlouvy v krycím listu OCK (Q2 + Q6) */
const NOVE_TERMINY = [
  ['terminPodkladyVytah', 'SOD_TERMIN_PODKLADY_VYTAH', '2026-06-19', '19.06.2026'],
  ['terminPripravenost', 'SOD_TERMIN_PRIPRAVENOST', '2026-07-01', '01.07.2026'],
  ['terminMontazDo', 'SOD_TERMIN_MONTAZ_DO', '2026-08-14', '14.08.2026'],
  ['terminOplasteniOd', 'SOD_TERMIN_OPLASTENI_OD', '2026-08-17', '17.08.2026'],
  ['terminOplasteniDo', 'SOD_TERMIN_OPLASTENI_DO', '2026-08-28', '28.08.2026'],
  ['terminDvere', 'SOD_TERMIN_DVERE', '2026-09-11', '11.09.2026'],
];
NOVE_TERMINY.forEach(([id, sym]) => {
  const p = pole(id);
  test('Termíny: ' + id + ' je nepovinné datum (BO i Tech, bez předvyplnění) se symbolem ' + sym,
    !!p && sekcePole(id) === 'Termíny' && p.typ === 'date' && p.sod === sym && !p.prefill && (p.verze || []).join() === 'bo,techdata', p);
});
{
  const t = (KR.KRYCI_SEKCE.find(s => s.sekce === 'Termíny') || { pole: [] }).pole.map(p => p.id).join();
  test('Termíny jdou podle průběhu stavby (stávající pole zůstávají)',
    t === 'terminPodkladyVytah,terminPripravenost,terminPrevzeti,terminMontazDo,terminOplasteniOd,terminOplasteniDo,terminMontaz,terminDvere,terminPredani,terminJine', t);
  test('stávající termíny drží své symboly', pole('terminPrevzeti').sod === 'SOD_TERMIN_MONTAZ_OD'
    && pole('terminMontaz').sod === 'SOD_TERMIN_PREDANI_K_MONTAZI' && pole('terminPredani').sod === 'SOD_TERMIN_DOKONCENI');
}
{
  const z = novaZ(), v = z.varianty[0];
  hodnoty(v, Object.fromEntries(NOVE_TERMINY.map(([id, , iso]) => [id, iso])));
  const P = sod.sodData(z, v, JEKLY, 'cz', V2).placeholders;
  NOVE_TERMINY.forEach(([id, sym, , cz]) => test('vyplněný termín ' + id + ' → {{' + sym + '}} = ' + cz, P[sym] === cz, P[sym]));
  const P0 = sod.sodData(novaZ(), novaZ().varianty[0], JEKLY, 'cz', V2).placeholders;
  const nevypl = NOVE_TERMINY.map(x => x[1]).concat(['SOD_MISTO_PLNENI_DRUH', 'SOD_POKUTA_DENNI']).filter(k => k in P0);
  test('nevyplněné termíny, místo plnění a denní pokuta symbol neplní (zůstane {{…}})', !nevypl.length, nevypl);
}

/* 2) Místo plnění (Q3) a denní pokuta za prodlení zákazníka (Q4) */
{
  const pm = pole('sodMistoPlneni');
  test('místo plnění: výběr bytový dům / rodinný dům / administrativní budova, bez předvyplnění → SOD_MISTO_PLNENI_DRUH',
    !!pm && pm.typ === 'vyber' && JSON.stringify(pm.o) === JSON.stringify(['bytový dům', 'rodinný dům', 'administrativní budova'])
      && !pm.prefill && pm.sod === 'SOD_MISTO_PLNENI_DRUH', pm);
  const pp = pole('sodPokutaDenni');
  test('denní pokuta za prodlení zákazníka: pole bez předvyplnění → SOD_POKUTA_DENNI', !!pp && !pp.prefill && pp.sod === 'SOD_POKUTA_DENNI', pp);
  test('místo plnění, denní pokuta a datum podpisu jsou v sekci „' + SEKCE_SOD + '" (Backoffice)',
    ['sodMistoPlneni', 'sodPokutaDenni', 'sodDatumPodpisu'].every(id => sekcePole(id) === SEKCE_SOD && (pole(id).verze || []).join() === 'bo'),
    ['sodMistoPlneni', 'sodPokutaDenni', 'sodDatumPodpisu'].map(sekcePole));
  test('sekce SoD realizace nese dál podpisy a kopie faktur',
    ['objPodpisFirma', 'objPodpis2Jmeno', 'objPodpis2Funkce', 'objKopie1', 'objKopie2'].every(id => sekcePole(id) === SEKCE_SOD));
  const z = novaZ(), v = z.varianty[0];
  hodnoty(v, { sodMistoPlneni: 'rodinný dům', sodPokutaDenni: '1 000 Kč' });
  const P = sod.sodData(z, v, JEKLY, 'cz', V2).placeholders;
  test('vybrané místo plnění → {{SOD_MISTO_PLNENI_DRUH}}', P.SOD_MISTO_PLNENI_DRUH === 'rodinný dům', P.SOD_MISTO_PLNENI_DRUH);
  test('denní pokuta → {{SOD_POKUTA_DENNI}}', P.SOD_POKUTA_DENNI === '1 000 Kč', P.SOD_POKUTA_DENNI);
  hodnoty(v, { sodMistoPlneni: 'polyfunkční dům' });
  test('vlastní znění místa plnění jde do smlouvy, jak je napsané',
    sod.sodData(z, v, JEKLY, 'cz', V2).placeholders.SOD_MISTO_PLNENI_DRUH === 'polyfunkční dům');
}

/* 3) nic z toho neprosákne do cenové nabídky */
{
  const nove = NOVE_TERMINY.map(x => x[0]).concat(['sodMistoPlneni', 'sodPokutaDenni', 'sodDatumPodpisu']);
  test('nová pole nejsou v sekcích cenové nabídky (KRYCI_NABIDKA_SEKCE)',
    nove.every(id => KR.KRYCI_NABIDKA_SEKCE.indexOf(sekcePole(id)) < 0), nove.filter(id => KR.KRYCI_NABIDKA_SEKCE.indexOf(sekcePole(id)) >= 0));
  const z = novaZ(), v = z.varianty[0];
  hodnoty(v, Object.assign(Object.fromEntries(NOVE_TERMINY.map(([id, , iso]) => [id, iso])),
    { sodMistoPlneni: 'bytový dům', sodPokutaDenni: '1 000 Kč', sodDatumPodpisu: '2026-10-15' }));
  const podm = Object.keys(KR.kryciPodminkoveSymboly(z, v, JEKLY));
  const prosaklo = podm.filter(k => /PODKLADY|PRIPRAVENOST|MONTAZ_DO|OPLASTENI|DVERE|MISTO_PLNENI|POKUTA_DENNI|DATUM_PODPISU/.test(k));
  test('ani do symbolů {{PODM_…}} nabídky', podm.length > 0 && !prosaklo.length, prosaklo);
  const nab = Object.keys(NB.nabidkaData(z, v, JEKLY, 'cz').placeholders).filter(k => /^SOD_/.test(k));
  test('cenová nabídka OCK nenese žádný symbol SOD_*', !nab.length, nab);
}

/* 4) Datum podpisu = datum tisku smlouvy (Q10) */
{
  const pd = pole('sodDatumPodpisu');
  test('datum podpisu: datum předvyplněné dnešním dnem, symbol SOD_DATUM_PODPISU, při zamčení se nezmrazuje',
    !!pd && pd.typ === 'date' && pd.sod === 'SOD_DATUM_PODPISU' && typeof pd.prefill === 'function' && pd.nezmrazovat === true
      && pd.src === 'datum tisku', pd);
  const z = novaZ(), v = z.varianty[0];
  test('rozpracovaná varianta: SOD_DATUM_PODPISU = dnešní datum', sod.sodData(z, v, JEKLY, 'cz', V1).placeholders.SOD_DATUM_PODPISU === dnesCz(),
    sod.sodData(z, v, JEKLY, 'cz', V1).placeholders.SOD_DATUM_PODPISU);
  /* Nabídka odešla 1. 6. 2026 (zamčení se zmrazením podmínek), smlouva se
   * tiskne dnes. Datum se podvrhne jen na dobu zmrazení. */
  const Skutecny = Date;
  global.Date = class extends Skutecny {
    constructor(...a) { if (a.length) super(...a); else super(2026, 5, 1, 12, 0, 0); }
    static now() { return new Skutecny(2026, 5, 1, 12, 0, 0).getTime(); }
  };
  try { KR.kryciZmrazPodminky(z, v, JEKLY); } finally { global.Date = Skutecny; }
  ZM.zamkniVariantu(v, { typ: 'nabidka', kdo: 'Test', cislo: z.cislo });
  const zm = (v.data.kryci && v.data.kryci.zmrazeno) || {};
  test('zmrazení při odeslání proběhlo k 1. 6. 2026 (pole „Dne" zamrzlo)', zm.podpisDne === '2026-06-01', zm.podpisDne);
  test('… ale datum podpisu smlouvy se nezmrazilo', !('sodDatumPodpisu' in zm), zm.sodDatumPodpisu);
  test('zamčená varianta: smlouva tištěná dnes nese dnešní datum, ne datum odeslání nabídky',
    sod.sodData(z, v, JEKLY, 'cz', V1).placeholders.SOD_DATUM_PODPISU === dnesCz(), sod.sodData(z, v, JEKLY, 'cz', V1).placeholders.SOD_DATUM_PODPISU);
  v.data.kryci.zmrazeno.sodDatumPodpisu = '2026-06-01';            // ani podvržené zmrazení neplatí
  test('zmrazená hodnota data podpisu se nečte (kryciHodnota)',
    sod.sodData(z, v, JEKLY, 'cz', V1).placeholders.SOD_DATUM_PODPISU === dnesCz());
  const z2 = novaZ(), v2 = z2.varianty[0];
  hodnoty(v2, { sodDatumPodpisu: '2026-10-15' });
  KR.kryciZmrazPodminky(z2, v2, JEKLY);
  ZM.zamkniVariantu(v2, { typ: 'nabidka', kdo: 'Test', cislo: z2.cislo });
  test('ruční datum podpisu platí (i po zamčení)', sod.sodData(z2, v2, JEKLY, 'cz', V1).placeholders.SOD_DATUM_PODPISU === '15.10.2026',
    sod.sodData(z2, v2, JEKLY, 'cz', V1).placeholders.SOD_DATUM_PODPISU);
}

/* 5) Pokuta za prodlení zhotovitele — SoD realizace (Q5) */
test('stav sazby pokuty: „0", „0 % / den", „bez pokuty" = nula; „0,05 % / den" = procento; „500 Kč za den" = nečitelné',
  ['0', '0 % / den', '0,0 %', 'bez pokuty', 'Bez smluvní pokuty'].every(t => KR.kryciPokutaStav(t) === 'nula')
    && ['0,05 % / den', '0,1 % / den', '0,2 %'].every(t => KR.kryciPokutaStav(t) === 'procento')
    && ['500 Kč za den', 'dle dohody', ''].every(t => KR.kryciPokutaStav(t) === 'necitelne'),
  ['0', '0 % / den', 'bez pokuty', '0,05 % / den', '500 Kč za den', ''].map(t => t + '=' + KR.kryciPokutaStav(t)).join(' | '));
{
  const z = novaZ(), v = z.varianty[0];               // výchozí pokuta za prodlení dodávky = „0"
  const d = sod.sodData(z, v, JEKLY, 'cz', V2);
  test('pokuta „0" + šablona v2: věta o prodlení zhotovitele zmizí ({{PODM_POKUTA_DODAVKA_PROC}} v odstavcePryc)',
    (d.odstavcePryc || []).indexOf('PODM_POKUTA_DODAVKA_PROC') >= 0, d.odstavcePryc);
  test('… věta o prodlení zákazníka s placením zůstává (0,05 %)', (d.odstavcePryc || []).indexOf('PODM_POKUTA_SPLATNOST_PROC') < 0
    && d.placeholders.PODM_POKUTA_SPLATNOST_PROC === '0,05 %', d.placeholders.PODM_POKUTA_SPLATNOST_PROC);
  const d1 = sod.sodData(z, v, JEKLY, 'cz', V1);
  test('šablona v1 (symbol pokuty dodávky nemá): nic dalšího se nemaže', (d1.odstavcePryc || []).join() === 'SOD_SPLATKA3_PROC', d1.odstavcePryc);
  test('bez informace o šabloně (náhled) se nic nemaže', !sod.sodData(z, v, JEKLY, 'cz').odstavcePryc);
  hodnoty(v, { pokutaDodavka: '0,1 % / den' });
  const d2 = sod.sodData(z, v, JEKLY, 'cz', V2);
  test('pokuta 0,1 % / den: {{PODM_POKUTA_DODAVKA_PROC}} = „0,1 %", věta zůstává',
    d2.placeholders.PODM_POKUTA_DODAVKA_PROC === '0,1 %' && (d2.odstavcePryc || []).indexOf('PODM_POKUTA_DODAVKA_PROC') < 0,
    [d2.placeholders.PODM_POKUTA_DODAVKA_PROC, d2.odstavcePryc]);
  hodnoty(v, { pokutaDodavka: '500 Kč za každý den' });
  const d3 = sod.sodData(z, v, JEKLY, 'cz', V2);
  test('vlastní znění bez procenta: symbol se neplní (zůstane {{…}}), věta zůstává',
    !('PODM_POKUTA_DODAVKA_PROC' in d3.placeholders) && (d3.odstavcePryc || []).indexOf('PODM_POKUTA_DODAVKA_PROC') < 0,
    [d3.placeholders.PODM_POKUTA_DODAVKA_PROC, d3.odstavcePryc]);
  hodnoty(v, { pokutaDodavka: 'bez pokuty' });
  test('vlastní znění „bez pokuty": věta zmizí jako u „0"',
    (sod.sodData(z, v, JEKLY, 'cz', V2).odstavcePryc || []).indexOf('PODM_POKUTA_DODAVKA_PROC') >= 0);
  /* zamčená varianta: pokuta z doby odeslání (zmrazená předvyplněná hodnota) */
  const z4 = novaZ(), v4 = z4.varianty[0];
  KR.kryciZmrazPodminky(z4, v4, JEKLY);
  v4.data.kryci.zmrazeno.pokutaDodavka = '0,05 % / den';           // nabídka odešla s pokutou
  ZM.zamkniVariantu(v4, { typ: 'nabidka', kdo: 'Test', cislo: z4.cislo });
  const d4 = sod.sodData(z4, v4, JEKLY, 'cz', V2);
  test('zamčená varianta: pokuta zhotovitele z doby odeslání (0,05 %), věta zůstává',
    d4.placeholders.PODM_POKUTA_DODAVKA_PROC === '0,05 %' && (d4.odstavcePryc || []).indexOf('PODM_POKUTA_DODAVKA_PROC') < 0,
    [d4.placeholders.PODM_POKUTA_DODAVKA_PROC, d4.odstavcePryc]);
}

/* 6) Pokuta za prodlení zhotovitele — SoD projekce (Q6) */
{
  const pt = KP.KRYCI_PROJ_SEKCE.reduce((a, s) => a || s.pole.find(p => p.id === 'pokutaTermin'), null);
  test('PROJ: pole „Smluvní pokuta – prodlení s odevzdáním" (pokutaTermin) je v podmínkách nabídky → PODM_POKUTA_TERMIN_PROC',
    !!pt && KP.KRYCI_PROJ_NABIDKA_SEKCE.indexOf(KP.KRYCI_PROJ_SEKCE.find(s => s.pole.indexOf(pt) >= 0).sekce) >= 0
      && KR.kryciSymbolId(pt.id) === 'POKUTA_TERMIN');
  const SP2 = sablona('SODP_PLATEBNI_KALENDAR', 'PODM_POKUTA_TERMIN_PROC', 'PODM_POKUTA_SPLATNOST_PROC');
  const z = novaZProj(), v = z.varianty[0];            // výchozí pokuta za nedodržení termínu = „0"
  const d = sod.sodProjData(z, v, 'cz', SP2);
  test('PROJ: pokuta „0" + šablona v2: věta o prodlení zhotovitele zmizí', (d.odstavcePryc || []).indexOf('PODM_POKUTA_TERMIN_PROC') >= 0, d.odstavcePryc);
  test('PROJ: stará šablona (symbol nemá) a náhled nic navíc nemažou',
    !sod.sodProjData(z, v, 'cz', sablona('SODP_PLATEBNI_KALENDAR')).odstavcePryc && !sod.sodProjData(z, v, 'cz').odstavcePryc);
  v.data.kryciProj = Object.assign(v.data.kryciProj || {}, { hodnoty: Object.assign((v.data.kryciProj || {}).hodnoty || {}, { pokutaTermin: '0,05 % / den' }) });
  const d2 = sod.sodProjData(z, v, 'cz', SP2);
  test('PROJ: pokuta 0,05 % / den → {{PODM_POKUTA_TERMIN_PROC}} = „0,05 %", věta zůstává',
    d2.placeholders.PODM_POKUTA_TERMIN_PROC === '0,05 %' && (d2.odstavcePryc || []).indexOf('PODM_POKUTA_TERMIN_PROC') < 0,
    [d2.placeholders.PODM_POKUTA_TERMIN_PROC, d2.odstavcePryc]);
  v.data.kryciProj.hodnoty.pokutaTermin = 'dle dohody';
  const d3 = sod.sodProjData(z, v, 'cz', SP2);
  test('PROJ: vlastní znění bez procenta → symbol zůstane {{…}}', !('PODM_POKUTA_TERMIN_PROC' in d3.placeholders)
    && (d3.odstavcePryc || []).indexOf('PODM_POKUTA_TERMIN_PROC') < 0, [d3.placeholders.PODM_POKUTA_TERMIN_PROC, d3.odstavcePryc]);
  /* zamčená varianta: pokuta z doby odeslání (zmrazená předvyplněná hodnota) */
  const z4 = novaZProj(), v4 = z4.varianty[0];
  KP.kryciProjZmrazPodminky(z4, v4);
  v4.data.kryciProj.zmrazeno.pokutaTermin = '0,1 % / den';          // nabídka odešla s pokutou
  ZM.zamkniVariantu(v4, { typ: 'nabidkaProj', kdo: 'Test', cislo: z4.cislo });
  const d4 = sod.sodProjData(z4, v4, 'cz', SP2);
  test('PROJ: zamčená varianta — pokuta zhotovitele z doby odeslání (0,1 %), věta zůstává',
    d4.placeholders.PODM_POKUTA_TERMIN_PROC === '0,1 %' && (d4.odstavcePryc || []).indexOf('PODM_POKUTA_TERMIN_PROC') < 0,
    [d4.placeholders.PODM_POKUTA_TERMIN_PROC, d4.odstavcePryc]);
}

/* 7) výroba šablon v2 nad syntetickým XML (nastroje/vyrob_sablony.js) */
let VS = null;
try { VS = require(require('path').join(__dirname, '..', 'nastroje', 'vyrob_sablony.js')); } catch (e) { VS = null; }
const R_PR = '<w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/><w:color w:val="000000"/></w:rPr>';
const beh = (t, pr) => '<w:r>' + (pr || '<w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/></w:rPr>') + '<w:t xml:space="preserve">' + t + '</w:t></w:r>';
const odst = (...behy) => '<w:p w14:paraId="0A0B0C0D"><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:jc w:val="both"/></w:pPr>' + behy.join('') + '</w:p>';
const splatky = [1, 2, 3, 4].map(n => odst(beh('věta {{SOD_SPLATKA' + n + '_PROC}} % z celkové ceny díla'))).join('');
const vetaZhot = odst(beh('Zhotovitel se zavazuje zaplatit objednateli smluvní pokutu ve výši {{PODM_POKUTA_'), beh('SPLATNOST_PROC}} % z ceny díla bez DPH za každý započatý den prodlení s prováděním díla.'));
const vetaObj = odst(beh('Objednatel se zavazuje zaplatit zhotoviteli v případě prodlení s placením ceny díla smluvní pokutu ve výši {{PODM_POKUTA_SPLATNOST_PROC}} % z dlužné částky.'));
const vetaPodklady = (datumBehy) => odst(beh('Objednatel se zavazuje k zajištění stavební připravenosti nejdéle k {{SOD_TERMIN_PRIPRAVENOST}}'),
  beh(' a k dodání kompletních finálních podkladů od dodavatele technologie výtahu včetně požadavků na kotvení do ', R_PR), datumBehy);
const DATUM_BEHY = beh('19', R_PR) + '<w:r><w:rPr><w:b/></w:rPr><w:t>.06.202</w:t></w:r>' + beh('6', R_PR) + beh('.', R_PR);
const dokument = (telo) => '<w:document><w:body>' + telo + '<w:sectPr/></w:body></w:document>';
test('vyrob_sablony umí SoD realizace v2 (sodRealV2) i SoD PROJ v2 (sodProjV2)', !!(VS && VS.sodRealV2 && VS.sodProjV2));
if (VS && VS.sodRealV2) {
  const zaznam = [];
  let vy = '';
  const ch = hazi(() => { vy = VS.sodRealV2(dokument(odst(beh('Cena bude hrazena:')) + splatky + vetaZhot + vetaObj + vetaPodklady(DATUM_BEHY)), zaznam); });
  test('v2 se z šablony se všemi kotvami vyrobí', !ch, ch);
  const k = dg.klicePlaceholderu(vy);
  test('v2: věta o prodlení zhotovitele nese {{PODM_POKUTA_DODAVKA_PROC}} (i když byl symbol rozdělený do dvou běhů)',
    /Zhotovitel se zavazuje zaplatit objednateli smluvní pokutu ve výši \{\{PODM_POKUTA_DODAVKA_PROC\}\}/.test(vy.replace(/<[^>]+>/g, '')), vy);
  test('v2: věta o prodlení objednatele s placením zůstává s {{PODM_POKUTA_SPLATNOST_PROC}}',
    k.filter(x => x === 'PODM_POKUTA_SPLATNOST_PROC').length === 1 && /s placením ceny díla smluvní pokutu ve výši \{\{PODM_POKUTA_SPLATNOST_PROC\}\}/.test(vy), k);
  test('v2: datum rozdělené do běhů → {{SOD_TERMIN_PODKLADY_VYTAH}}, tečka za větou zůstává',
    !/19|\.06\.|2026/.test(vy.replace(/<[^>]+>/g, '')) && /kotvení do \{\{SOD_TERMIN_PODKLADY_VYTAH\}\}\.$/.test(dg.odstavecText(vy.slice(vy.lastIndexOf('<w:p '), vy.lastIndexOf('</w:p>') + 6))), vy);
  test('v2: symbol data má formátování běhu, ve kterém datum začínalo', vy.indexOf(R_PR + '<w:t xml:space="preserve">{{SOD_TERMIN_PODKLADY_VYTAH}}</w:t>') >= 0, vy);
  test('v2: zbylé běhy data zůstaly i s formátováním, jen bez znaků data',
    vy.indexOf('<w:r><w:rPr><w:b/></w:rPr><w:t></w:t></w:r>') >= 0 && vy.indexOf(R_PR + '<w:t xml:space="preserve">.</w:t>') >= 0, vy);
  test('v2: vlastnosti odstavců (odrážky, zarovnání, id) se nezměnily',
    (vy.match(/<w:p w14:paraId="0A0B0C0D"><w:pPr><w:numPr><w:ilvl w:val="0"\/><w:numId w:val="2"\/><\/w:numPr><w:jc w:val="both"\/><\/w:pPr>/g) || []).length === 4);
  test('v2: platné XML', !dg.xmlStrukturaVada(vy), dg.xmlStrukturaVada(vy));
  test('v2: výroba vypíše, co nahradila (splátky, pokuta, datum 19.06.2026)',
    zaznam.length === 3 && /19\.06\.2026/.test(zaznam[2]) && /PODM_POKUTA_DODAVKA_PROC/.test(zaznam[1]), zaznam);
  const bez = hazi(() => VS.sodRealV2(dokument(splatky + vetaZhot + vetaObj + vetaPodklady(''))));
  test('chyba, když ve větě o podkladech datum není', /právě jedno datum/.test(bez), bez);
  const dve = hazi(() => VS.sodRealV2(dokument(splatky + vetaZhot + vetaObj + vetaPodklady(beh('01.05.2026 a 19.06.2026.')))));
  test('chyba, když jsou v ní data dvě', /právě jedno datum/.test(dve), dve);
  const uprostred = hazi(() => VS.sodRealV2(dokument(splatky + vetaZhot + vetaObj
    + vetaPodklady(beh('19.06.2026, nejpozději však před zahájením výroby.')))));
  test('chyba, když datum není na konci věty o podkladech', /není na konci věty/.test(uprostred), uprostred);
  const jinde = hazi(() => VS.sodRealV2(dokument(splatky + vetaZhot + vetaObj
    + odst(beh('Objednatel zajistí stavební připravenost k {{SOD_TERMIN_PRIPRAVENOST}}, nejpozději do 19.06.2026.')))));
  test('chyba, když datum nepatří k větě o podkladech dodavatele výtahu', /není na konci věty o podkladech/.test(jinde), jinde);
  const bezPokuty = hazi(() => VS.sodRealV2(dokument(splatky + vetaObj + vetaPodklady(DATUM_BEHY))));
  test('chyba, když chybí věta o prodlení zhotovitele (nic se nehádá)', /právě jednu větu o prodlení zhotovitele/.test(bezPokuty), bezPokuty);
  test('v2 z v2 se nevyrobí podruhé', hazi(() => VS.sodRealV2(vy)) !== '');
}
if (VS && VS.sodProjV2) {
  const platby = [1, 2, 3, 4, 5, 6, 7, 8].map(n => odst(beh('Platba ve výši {{SODP_PLATBA' + n + '_KC}} + DPH proběhne …'))).join('');
  /* nezlomitelné mezery jako ve skutečné šabloně („V případě", „prodlení zhotovitele") */
  const projZhot = odst(beh('V\u00a0případě prodlení\u00a0zhotovitele s\u00a0plněním dle bodu '), '<w:r><w:rPr><w:b/></w:rPr><w:t>III. Termíny plnění</w:t></w:r>',
    beh(' této SoD má právo objednatel zhotoviteli účtovat {{PODM_POKUTA_SPLATNOST_PROC}} % z ceny části Díla v prodlení.'));
  const projObj = odst(beh('Pro případ prodlení objednatele s úhradou peněžitého plnění sjednávají smluvní strany smluvní pokutu ve výši {{PODM_POKUTA_SPLATNOST_PROC}} % z dlužné částky.'));
  let vy = '';
  const ch = hazi(() => { vy = VS.sodProjV2(dokument(projZhot + projObj + platby)); });
  test('SoD PROJ v2 se vyrobí (kotva věty i s nezlomitelnými mezerami jako ve skutečné šabloně)', !ch, ch);
  const t = vy.replace(/<[^>]+>/g, '');
  test('SoD PROJ v2: věta o prodlení zhotovitele nese {{PODM_POKUTA_TERMIN_PROC}}, tučné „III. Termíny plnění" zůstává',
    /zhotoviteli účtovat \{\{PODM_POKUTA_TERMIN_PROC\}\} % z ceny části Díla/.test(t) && vy.indexOf('<w:rPr><w:b/></w:rPr><w:t>III. Termíny plnění</w:t>') >= 0, vy);
  test('SoD PROJ v2: věta o prodlení objednatele zůstává s {{PODM_POKUTA_SPLATNOST_PROC}}',
    /s úhradou peněžitého plnění sjednávají smluvní strany smluvní pokutu ve výši \{\{PODM_POKUTA_SPLATNOST_PROC\}\}/.test(t), t);
  test('SoD PROJ v2: seznam plateb dál jedním symbolem', dg.klicePlaceholderu(vy).indexOf('SODP_PLATEBNI_KALENDAR') >= 0 && !/SODP_PLATBA/.test(vy));
  const bez = hazi(() => VS.sodProjV2(dokument(projObj + platby)));
  test('SoD PROJ: chyba, když chybí věta o prodlení zhotovitele', /právě jednu větu o prodlení zhotovitele/.test(bez), bez);
}

/* 8) Word: věta o prodlení zhotovitele, datum podpisu */
(async () => {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const dok = (telo) => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + telo + '</w:body></w:document>';
  const vypln = async (telo, data) => {
    const s = await (await dg.zipZapis([{ nazev: 'word/document.xml', data: enc.encode(dok(telo)) }])).arrayBuffer();
    const blob = await dg.docxVyplnSablonu(s, data.placeholders, [], {}, { odstavcePryc: data.odstavcePryc || [] });
    return dec.decode((await dg.zipPrecti(new Uint8Array(await blob.arrayBuffer()))).find(p => p.nazev === 'word/document.xml').data);
  };
  const p = t => '<w:p><w:r><w:t xml:space="preserve">' + t + '</w:t></w:r></w:p>';
  const telo = p('Zhotovitel se zavazuje zaplatit objednateli smluvní pokutu ve výši {{PODM_POKUTA_DODAVKA_PROC}} % z ceny díla bez DPH.')
    + p('Objednatel se zavazuje zaplatit zhotoviteli v případě prodlení s placením smluvní pokutu ve výši {{PODM_POKUTA_SPLATNOST_PROC}} % z dlužné částky.')
    + p('Místem provádění díla je {{SOD_MISTO_PLNENI_DRUH}} na adrese {{ADRESA}}.')
    + p('V Praze, dne {{SOD_DATUM_PODPISU}}');
  const z = novaZ(), v = z.varianty[0];
  const x0 = (await vypln(telo, sod.sodData(z, v, JEKLY, 'cz', V2))).replace(/<[^>]+>/g, '|');
  test('Word: pokuta „0" — věta o prodlení zhotovitele zmizela, o prodlení objednatele zůstala (0,05 %, bez „% %")',
    !/Zhotovitel se zavazuje/.test(x0) && /ve výši 0,05 % z dlužné částky/.test(x0) && !/%\s*%/.test(x0), x0);
  test('Word: datum podpisu = dnešní datum, místo plnění bez výběru zůstalo {{…}}',
    x0.indexOf('V Praze, dne ' + dnesCz()) >= 0 && /\{\{SOD_MISTO_PLNENI_DRUH\}\} na adrese Zkušební 6, Praha/.test(x0), x0);
  hodnoty(v, { pokutaDodavka: '0,1 % / den', sodMistoPlneni: 'bytový dům' });
  const x1 = (await vypln(telo, sod.sodData(z, v, JEKLY, 'cz', V2))).replace(/<[^>]+>/g, '|');
  test('Word: pokuta 0,1 % / den — „ve výši 0,1 % z ceny díla", místo plnění vyplněné',
    /smluvní pokutu ve výši 0,1 % z ceny díla bez DPH/.test(x1) && /Místem provádění díla je bytový dům na adrese/.test(x1), x1);
  hodnoty(v, { pokutaDodavka: '500 Kč za každý den' });
  const x2 = (await vypln(telo, sod.sodData(z, v, JEKLY, 'cz', V2))).replace(/<[^>]+>/g, '|');
  test('Word: vlastní znění bez procenta — {{PODM_POKUTA_DODAVKA_PROC}} zůstal vidět, nic prázdného', /ve výši \{\{PODM_POKUTA_DODAVKA_PROC\}\} % z ceny díla/.test(x2), x2);
  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL sada spadla: ' + (e && e.stack || e)); process.exit(1); });
