/* PLÁN PLATEB PROJEKCE v krycím listu PROJ (etapa B, krok 3, 30. 9. 2026).
 *
 * Hlídá model krycího listu nad plánem plateb (UI hlídá overit_plan_plateb.mjs):
 *   – cena díla z plánu = cena díla nabídky bez řádku slevy / smlouvy
 *     (PROJ_CELKEM_BEZ_DPH), i se schválenou slevou; nabízené = oceněné činnosti,
 *   – efektivní plán varianty: rozpracovaná → firemní plán, odeslaná se
 *     snímkem → snímek, odeslaná bez snímku → „starý" krycí list,
 *   – snímek při prvním zamčení (kryciProjZmrazPodminky) a jen jednou,
 *   – viditelnost polí (dřívější záloha / ruční splátky × řádky plánu),
 *   – tisk krycího listu (pevný počet řádků plánu), způsob fakturace z předvolby
 *     (výchozí návrh Q10), popis předvolby, eura bez ručních částek.
 * Před krokem 3 funkce plánu varianty neexistovaly — sada selže hned na začátku.
 *
 * Spuštění: cd src && node test_plan_plateb_kryci.js */
const fs = require('fs');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./firma.js');
const PP = nacti('./plan_plateb.js');
const NP = nacti('./nabidka_proj.js');
const zk = nacti('./zakazka.js');
nacti('./zamek.js');
nacti('./kryci.js');
const kp = nacti('./kryci_proj.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));

test('funkce plánu varianty existují (krok 3)', typeof PP.planPlatebVarianty === 'function' && typeof NP.nabidkaProjPlatby === 'function'
  && typeof kp.kryciProjZmrazPlan === 'function' && typeof kp.kryciProjPoleViditelne === 'function');
if (fail) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }

global.NAST = { firma: global.firmaDefault() };
const novaZ = (slevaPct) => {
  const z = zk.novaZakazka();
  z.cislo = '2026 - OVP - CN - 402'; z.nazevAkce = 'Zkušební plán plateb';
  const v = z.varianty[0];
  v.data.proj.cenik = ZC.zkusebniCenikProj();
  if (slevaPct) v.data.slevaProj = { procenta: slevaPct, stav: 'schváleno automaticky', role: 'Administrátor', schvalenoProc: slevaPct };
  return z;
};

/* 1) seznam činností krycího listu = seznam činností plánu */
test('KRYCI_PROJ_PLAN_CINNOSTI zrcadlí PLAN_PROJ_SEKCE a zkratky',
  JSON.stringify(kp.KRYCI_PROJ_PLAN_CINNOSTI.map(x => x[0])) === JSON.stringify(PP.PLAN_PROJ_SEKCE)
  && kp.KRYCI_PROJ_PLAN_CINNOSTI.every(([k, z]) => PP.PLAN_PROJ_ZKRATKY[k] === z));

/* 2) cena díla z plánu = cena díla nabídky bez řádku slevy (smlouva o dílo) */
for (const sleva of [0, 10]) {
  const z = novaZ(sleva), v = z.varianty[0];
  const pl = NP.nabidkaProjPlatby(z, v, 'cz');
  const nd = NP.nabidkaProjData(z, v, 'cz', { slevaZvlast: false });
  const ceny = NP.nabidkaProjCeny(v, 'cz');
  test('sleva ' + sleva + ' %: nabízené činnosti = oceněné, ceny po slevě',
    Object.keys(pl.ceny).length > 0 && Object.keys(pl.ceny).every(k => pl.ceny[k] === ceny.cenyPo[k] && ceny.cenyPred[k] > 0),
    { ceny: pl.ceny });
  test('sleva ' + sleva + ' %: součet plateb = cena díla smlouvy (PROJ_CELKEM_BEZ_DPH)',
    pl.dopocet.sedi && Math.round(pl.dopocet.cena * 100) === Math.round(nd.souhrn.bezDph * 100), [pl.dopocet.cena, nd.souhrn.bezDph]);
  if (sleva) test('sleva 10 %: platby se počítají z ceny PO slevě (menší než před slevou)',
    pl.dopocet.cena < NP.nabidkaProjData(z, v, 'cz').souhrn.bezDphPred, pl.dopocet.cena);
}

/* 3) efektivní plán varianty */
{
  const z = novaZ(0), v = z.varianty[0];
  let e = PP.planPlatebVarianty(v, global.NAST.firma);
  test('rozpracovaná varianta bez plánu: firemní (výchozí) plán, ne snímek, ne starý', !e.stary && !e.zmrazeny && e.plan === null
    && e.firemni === PP.PLAN_PROJ_VYCHOZI);
  v.data.kryciProj.planPlateb = { v: 1, predvolba: 'zaloha', zaloha: 30 };
  test('kontext krycího listu nese plán a není „starý"', !kp.kryciProjCtx(z, v).planStary && !!kp.kryciProjCtx(z, v).planEf);
  /* první zamčení: snímek */
  const pocet = kp.kryciProjZmrazPodminky(z, v);
  const snimek = v.data.kryciProj.zmrazenoPlan;
  test('zmrazení podmínek vrací dál počet polí (P9.5) a uloží snímek plánu', typeof pocet === 'number' && !!snimek
    && snimek.predvolba === 'zaloha' && snimek.zaloha === 30, snimek);
  test('snímek nese splátky jen nabízených činností s milníky a texty z katalogu',
    Object.keys(snimek.cinnosti).sort().join() === Object.keys(NP.nabidkaProjPlatby(z, v, 'cz').ceny).sort().join()
    && snimek.cinnosti.dpz.map(r => r.p + ':' + r.m).join() === '30:podpis,70:dpz_su'
    && snimek.milniky.find(m => m.id === 'podpis').cz === 'po podpisu smlouvy / objednávky', snimek);
  test('druhé zmrazení snímek nepřepíše', kp.kryciProjZmrazPlan(z, v) === false && v.data.kryciProj.zmrazenoPlan === snimek);
  zamkniVariantu(v, { typ: 'nabidkaProj', kdo: 'Test', cislo: '2026 - OVP - CN - 402' });
  const platby = () => NP.nabidkaProjPlatby(z, v, 'cz').dopocet.platby.map(x => x.klic + ':' + x.text + ':' + x.castka).join('|');
  const pred = platby();
  const f2 = JSON.parse(JSON.stringify(PP.PLAN_PROJ_VYCHOZI)); f2.milniky[0].cz = 'po podpisu (nové znění)'; f2.zalohaPct = 70; f2.vychozi = 'sto';
  global.NAST.firma.planPlatebProj = f2;
  e = PP.planPlatebVarianty(v, global.NAST.firma);
  test('zamčená varianta se snímkem: plán ze snímku (zmrazený)', e.zmrazeny && !e.stary);
  test('změna firemního plánu po odeslání platby nezmění', platby() === pred && !/nové znění/.test(platby()), platby());
  delete global.NAST.firma.planPlatebProj;
  delete v.data.kryciProj.zmrazenoPlan;
  e = PP.planPlatebVarianty(v, global.NAST.firma);
  test('zamčená varianta bez snímku (z doby před plánem): „starý" krycí list', e.stary && kp.kryciProjCtx(z, v).planStary);
  test('„starý" krycí list: plán nehlásí nedostatky (tiskne se, jak odešel)', NP.nabidkaProjPlatby(z, v, 'cz').kontrola.length === 0);
}

/* 4) viditelnost polí a tisk krycího listu */
{
  const z = novaZ(0), v = z.varianty[0];
  const c = kp.kryciProjCtx(z, v);
  const pole = [].concat(...kp.KRYCI_PROJ_SEKCE.map(s => s.pole));
  const stara = pole.filter(p => p.stary).map(p => p.id);
  const planova = pole.filter(p => p.plan).map(p => p.id);
  test('dřívější pole zálohy a splátek jsou označená „stary"',
    ['zpusobFakturace', 'faktZamereni', 'faktDpz', 'faktDps', 'zaloha', 'sodpPlatba1', 'sodpPlatba8'].every(id => stara.indexOf(id) >= 0), stara);
  test('řádků plánu je pevný počet: předvolba + 9 činností + platby smlouvy', planova.length === 11, planova);
  test('rozpracovaná varianta s plánem: dřívější pole skrytá, řádky plánu vidět',
    stara.every(id => !kp.kryciProjPoleViditelne(pole.find(p => p.id === id), c)) && planova.every(id => kp.kryciProjPoleViditelne(pole.find(p => p.id === id), c)));
  const d = kp.kryciProjData(z, v, JEKLY, 'bo');
  const r = [].concat(...d.sekce.map(s => s.radky));
  const hod = (label) => (r.find(x => x[0] === label) || [])[1];
  test('tisk: „Plán plateb" = Standard po činnostech', hod('Plán plateb') === 'Standard po činnostech', hod('Plán plateb'));
  test('tisk: DPZ po splátkách, neoceněné ZA „není součástí nabídky"',
    /^50 % po podpisu smlouvy \/ objednávky · 30 % po dokončení/.test(hod('Plán plateb — DPZ') || '') && hod('Plán plateb — ZA') === 'není součástí nabídky',
    [hod('Plán plateb — DPZ'), hod('Plán plateb — ZA')]);
  test('tisk: platby smlouvy po řádcích „Platba N — milník: částka"', /^Platba 1 — po podpisu smlouvy \/ objednávky: [\d\s ]+,\d\d Kč/.test(hod('Platby smlouvy (z plánu plateb)') || '')
    && (hod('Platby smlouvy (z plánu plateb)') || '').split('\n').length === NP.nabidkaProjPlatby(z, v, 'cz').dopocet.platby.length, hod('Platby smlouvy (z plánu plateb)'));
  test('tisk: dřívější záloha ani ruční splátky 1–8 v tisku nejsou', hod('Záloha') === undefined && !r.some(x => /^Platba 1 — po podpisu smlouvy$/.test(x[0])));
  /* ruční částka v tisku a symbolech SoD */
  v.data.kryciProj.planPlateb = { v: 1, prepis: { podpis: 100000 } };
  const platbyTisk = (kp.kryciProjData(z, v, JEKLY, 'bo').sekce.flatMap(s => s.radky).find(x => x[0] === 'Platby smlouvy (z plánu plateb)') || [])[1] || '';
  test('tisk: ruční částka platby je poznat a nesouhlas se součtem se vypíše',
    /: 100[\s\u00a0]000,00 Kč \(ručně\)/.test(platbyTisk) && /nesouhlasí s cenou díla/.test(platbyTisk), platbyTisk);
  v.data.kryciProj.hodnoty = { sodpPlatba1: '110 000 Kč' };
  test('dřívější ruční splátka nejde do symbolů SoD, když má varianta plán (dopočet řeší krok 5)',
    kp.kryciProjSodSymboly(z, v, {}).SODP_PLATBA1_KC === undefined);
}

/* 5) způsob fakturace z předvolby (Q10) a popis předvolby */
{
  const F = PP.PLAN_PROJ_VYCHOZI;
  test('Standard → „po milnících jednotlivých činností podle plánu plateb"',
    PP.planZpusobFakturace(null, F, 'věta firmy') === 'po milnících jednotlivých činností podle plánu plateb');
  test('Záloha 30 % → věta se zálohou', /^záloha 30 % po podpisu smlouvy/.test(PP.planZpusobFakturace({ predvolba: 'zaloha', zaloha: 30 }, F)));
  test('Bez zálohy → „po předání jednotlivých stupňů dokumentace"', PP.planZpusobFakturace({ predvolba: 'zaloha', zaloha: 0 }, F) === 'po předání jednotlivých stupňů dokumentace');
  test('100 % po dokončení stupně → věta z Nastavení → Firma', PP.planZpusobFakturace({ predvolba: 'sto' }, F, 'po odevzdání každého stupně') === 'po odevzdání každého stupně');
  test('Vlastní i upravená předvolba → „podle dohodnutého plánu plateb"',
    PP.planZpusobFakturace({ predvolba: 'vlastni' }, F) === 'podle dohodnutého plánu plateb'
    && PP.planZpusobFakturace({ predvolba: 'std', cinnosti: { dpz: [{ p: 100, m: 'dpz_su' }] } }, F) === 'podle dohodnutého plánu plateb');
  test('popis předvolby: Záloha 30 % / Bez zálohy / upraveno',
    PP.planPopisPredvolby({ predvolba: 'zaloha', zaloha: 30 }, F) === 'Záloha 30 % + zbytek po předání'
    && PP.planPopisPredvolby({ predvolba: 'zaloha', zaloha: 0 }, F) === 'Bez zálohy — 100 % po předání'
    && PP.planPopisPredvolby({ predvolba: 'std', cinnosti: { dpz: [{ p: 100, m: 'dpz_su' }] } }, F) === 'Standard po činnostech (upraveno)');
  test('neupravená činnost (stejné řádky jako předvolba) se za úpravu nepočítá',
    !PP.planUpraveno({ predvolba: 'std', cinnosti: { dpz: [{ p: 50, m: 'podpis' }, { p: 30, m: 'dpz_doss' }, { p: 20, m: 'dpz_su' }] } }, F));
  const z = novaZ(0), v = z.varianty[0];
  v.data.kryciProj.planPlateb = { v: 1, predvolba: 'zaloha', zaloha: 50 };
  test('symbol PODM_ZPUSOB_FAKTURACE nabídky PROJ jde z předvolby',
    /^záloha 50 % po podpisu smlouvy/.test(kp.kryciProjPodminkoveSymboly(z, v, null).PODM_ZPUSOB_FAKTURACE || ''),
    kp.kryciProjPodminkoveSymboly(z, v, null).PODM_ZPUSOB_FAKTURACE);
}

/* 6) eura: ruční částky (v korunách) se v cizojazyčné smlouvě neuplatní */
{
  const z = novaZ(0), v = z.varianty[0];
  v.data.proj.cenik.kurzEurKc = 25;
  v.data.kryciProj.planPlateb = { v: 1, prepis: { podpis: 100000 } };
  const cz = NP.nabidkaProjPlatby(z, v, 'cz'), en = NP.nabidkaProjPlatby(z, v, 'en');
  test('CZ: ruční částka platí', cz.dopocet.platby.find(x => x.klic === 'podpis').prepsano === true);
  test('EN (eura): jen dopočet, žádná ruční částka, součet = cena díla v eurech', en.eur && en.dopocet.platby.every(x => !x.prepsano) && en.dopocet.sedi
    && Math.round(en.dopocet.cena) === Math.round(NP.nabidkaProjData(z, v, 'en', { slevaZvlast: false }).souhrn.bezDph), [en.dopocet.cena]);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
