/* PLÁN PLATEB PROJEKCE v krycím listu PROJ (etapa B, krok 3, 30. 9. 2026).
 *
 * Hlídá model krycího listu nad plánem plateb (UI hlídá overit_plan_plateb.mjs):
 *   – cena díla z plánu = cena díla nabídky bez řádku slevy / smlouvy
 *     (PROJ_CELKEM_BEZ_DPH), i se schválenou slevou; nabízené = oceněné činnosti,
 *   – efektivní plán varianty: rozpracovaná → firemní plán, odeslaná se
 *     snímkem → snímek, odeslaná bez snímku → „starý" krycí list,
 *   – snímek při prvním zamčení (kryciProjZmrazPodminky) — i u klonu odeslané
 *     varianty a po odemčení správcem; zamčenou variantu dotisk nepřepíše,
 *   – zamčená varianta pod firemním Standardem se nehlásí „upraveno“,
 *     poškozený snímek výpočet neshodí, obří pole splátek se ořízne,
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
  zamkniVariantu(v, { typ: 'nabidkaProj', kdo: 'Test', cislo: '2026 - OVP - CN - 402' });
  test('zamčená varianta: další zmrazení (dotisk odeslané nabídky) snímek nepřepíše',
    kp.kryciProjZmrazPlan(z, v) === false && v.data.kryciProj.zmrazenoPlan === snimek);
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

/* 3b) klon odeslané varianty a odemčení správcem (revize etapy B, 30. 9. 2026):
 * první zamčení vezme snímek z VLASTNÍHO plánu varianty. Do opravy nechal
 * kryciProjZmrazPlan zděděný snímek předlohy — zamčený klon pak tiskl
 * a smlouvu dopočítal z plánu předlohy (u činnosti navíc hlásil neznámý
 * milník a zábrana ho zablokovala natrvalo). */
{
  const z = novaZ(0), a = z.varianty[0];
  const zamkni = (v) => { kp.kryciProjZmrazPodminky(z, v); zamkniVariantu(v, { typ: 'nabidkaProj', kdo: 'Test', cislo: '2026 - OVP - CN - 402' }); };
  zamkni(a);
  const snA = JSON.stringify(a.data.kryciProj.zmrazenoPlan);
  const b = klonujVariantu(z, a.id);
  test('klon odeslané varianty: zděděný snímek rozpracovaný klon nečte', !!b.data.kryciProj.zmrazenoPlan
    && !PP.planPlatebVarianty(b, global.NAST.firma).zmrazeny);
  b.data.kryciProj.planPlateb = { v: 1, predvolba: 'zaloha', zaloha: 30 };
  zamkni(b);
  const eb = PP.planPlatebVarianty(b, global.NAST.firma);
  test('první zamčení klonu vezme snímek z plánu klonu (Záloha 30 %), ne předlohy (Standard)',
    eb.zmrazeny && eb.plan.predvolba === 'zaloha' && eb.plan.zaloha === 30
    && eb.plan.cinnosti.dpz.map(r => r.p + ':' + r.m).join() === '30:podpis,70:dpz_su', eb.plan);
  const plb = NP.nabidkaProjPlatby(z, b, 'cz');
  test('zamčený klon: splátky smlouvy podle plánu klonu, bez nedostatků',
    plb.dopocet.cinnosti.dpz.map(r => r.p).join() === '30,70' && plb.kontrola.length === 0, plb.kontrola);
  test('snímek předlohy zůstal beze změny', JSON.stringify(a.data.kryciProj.zmrazenoPlan) === snA);
  const od = odemkniVariantu(b, { jeAdmin: true, duvod: 'oprava plánu plateb', kdo: 'Test' });
  b.data.kryciProj.planPlateb = { v: 1, predvolba: 'sto' };
  zamkni(b);
  test('odemčení správcem, úprava a nové zamčení: snímek nového plánu (100 % po dokončení stupně)',
    od.ok && PP.planPlatebVarianty(b, global.NAST.firma).plan.predvolba === 'sto', od);
}

/* 3c) zamčená varianta pod VLASTNÍM firemním Standardem se nehlásí jako
 * „upraveno" (revize etapy B): snímek nese, které činnosti byly při odeslání
 * upravené. Do opravy se zamčený plán srovnával se Standardem z kódu. */
{
  const f = JSON.parse(JSON.stringify(PP.PLAN_PROJ_VYCHOZI));
  /* Firma s výchozí předvolbou Standard — od 1. 10. 2026 je výchozí z kódu
   * Záloha 70 % (rozhodnutí J. V.), tady jde o firemní Standard. */
  f.vychozi = 'std';
  f.standard.dpz = [{ p: 40, m: 'podpis' }, { p: 40, m: 'dpz_doss' }, { p: 20, m: 'dpz_su' }];
  global.NAST.firma.planPlatebProj = f;
  const z = novaZ(0), v = z.varianty[0];
  const ceny = NP.nabidkaProjPlatby(z, v, 'cz').ceny;
  test('předpoklad: firemní Standard je platný a rozpracovaná varianta není „upraveno"',
    PP.planPlatebFirmaVady(f).length === 0 && !PP.planUpraveno(null, PP.planFirmaPlan(global.NAST.firma), ceny));
  kp.kryciProjZmrazPodminky(z, v);
  zamkniVariantu(v, { typ: 'nabidkaProj', kdo: 'Test', cislo: '2026 - OVP - CN - 402' });
  const e = PP.planPlatebVarianty(v, global.NAST.firma);
  test('zamčená varianta pod firemním Standardem: ne „upraveno", popis „Standard po činnostech"',
    e.zmrazeny && !PP.planUpraveno(e.plan, e.firemni, ceny) && PP.planPopisPredvolby(e.plan, e.firemni, ceny) === 'Standard po činnostech',
    PP.planPopisPredvolby(e.plan, e.firemni, ceny));
  const hod = (label) => ((kp.kryciProjData(z, v, JEKLY, 'bo').sekce.flatMap(s => s.radky).find(x => x[0] === label)) || [])[1];
  test('tisk zamčeného krycího listu: „Plán plateb" bez „(upraveno)"', hod('Plán plateb') === 'Standard po činnostech', hod('Plán plateb'));
  const z2 = novaZ(0), v2 = z2.varianty[0];
  v2.data.kryciProj.planPlateb = { v: 1, cinnosti: { dpz: [{ p: 100, m: 'dpz_su' }] } };
  kp.kryciProjZmrazPodminky(z2, v2);
  zamkniVariantu(v2, { typ: 'nabidkaProj', kdo: 'Test', cislo: '2026 - OVP - CN - 403' });
  const e2 = PP.planPlatebVarianty(v2, global.NAST.firma);
  test('zamčená varianta se skutečnou úpravou zůstane „upraveno" (jen DPZ)', PP.planUpraveno(e2.plan, e2.firemni, ceny)
    && PP.planCinnostUpravena('dpz', e2.plan, e2.firemni) && !PP.planCinnostUpravena('ic', e2.plan, e2.firemni));
  delete global.NAST.firma.planPlatebProj;
}

/* 3d) poškozený snímek (ruční úprava dat, import — server kryciProj
 * nekontroluje): výpočet plateb nespadne a obří pole splátek neucpe
 * prohlížeč (revize etapy B). */
{
  const z = novaZ(0), v = z.varianty[0];
  kp.kryciProjZmrazPodminky(z, v);
  zamkniVariantu(v, { typ: 'nabidkaProj', kdo: 'Test', cislo: '2026 - OVP - CN - 402' });
  v.data.kryciProj.zmrazenoPlan.milniky.unshift(null, 5, { cz: 'bez klíče' });
  let chyba = '';
  try { NP.nabidkaProjPlatby(z, v, 'cz'); } catch (e) { chyba = e.message; }
  test('snímek s poškozeným katalogem milníků: výpočet plateb nespadne', chyba === '', chyba);
  v.data.kryciProj.zmrazenoPlan.cinnosti.dpz = Array.from({ length: 5000 }, () => ({ p: 1, m: 'podpis' }));
  const plan = PP.planPlatebVarianty(v, global.NAST.firma).plan;
  let pl = null;
  try { pl = NP.nabidkaProjPlatby(z, v, 'cz'); } catch (e) { pl = null; }
  test('obří pole splátek se ořízne na 10 a plán hlásí nedostatek',
    PP.planRadkyCinnosti('dpz', plan, PP.PLAN_PROJ_VYCHOZI).length === 10 && !!pl && pl.kontrola.some(k => k.kod === 'procenta'),
    PP.planRadkyCinnosti('dpz', plan, PP.PLAN_PROJ_VYCHOZI).length);
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
  /* Výchozí plán nové zakázky = Záloha 70 % + zbytek po předání
   * (rozhodnutí J. V. 1. 10. 2026; do té doby Standard po činnostech). */
  test('tisk: „Plán plateb" nové zakázky = Záloha 70 % + zbytek po předání', hod('Plán plateb') === 'Záloha 70 % + zbytek po předání', hod('Plán plateb'));
  test('tisk: DPZ po splátkách 70 % po podpisu + 30 % po předání, neoceněné ZA „není součástí nabídky"',
    /^70 % po podpisu smlouvy \/ objednávky · 30 % po dokončení dokumentace pro povolení záměru v rozsahu pro podání na stavební úřad$/.test(hod('Plán plateb — DPZ') || '') && hod('Plán plateb — ZA') === 'není součástí nabídky',
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
    PP.planZpusobFakturace({ predvolba: 'std' }, F, 'věta firmy') === 'po milnících jednotlivých činností podle plánu plateb');
  test('výchozí plán (zakázka bez předvolby) → „záloha 70 % po podpisu smlouvy, zbytek po předání …"',
    PP.planZpusobFakturace(null, F, 'věta firmy') === 'záloha 70 % po podpisu smlouvy, zbytek po předání jednotlivých stupňů dokumentace',
    PP.planZpusobFakturace(null, F, 'věta firmy'));
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
  /* Pole nahrazená plánem (`stary`) do symbolů {{PODM_…}} nepatří a ruční
   * hodnota starší verze nepřebije způsob fakturace z předvolby (revize
   * etapy B: skrytá pole plnila zálohu a fakturaci po stupních, které plán
   * neplatí, a ruční znění způsobu fakturace nešlo vidět ani smazat). */
  v.data.kryciProj.hodnoty = { zpusobFakturace: 'měsíčně', zaloha: 'Záloha 70 %', faktDps: '100 % předem' };
  const sy = kp.kryciProjPodminkoveSymboly(z, v, null);
  test('symboly PODM_: ruční způsob fakturace starší verze nepřebije předvolbu',
    /^záloha 50 % po podpisu smlouvy/.test(sy.PODM_ZPUSOB_FAKTURACE || ''), sy.PODM_ZPUSOB_FAKTURACE);
  test('symboly PODM_: dřívější záloha a fakturace po stupních se u plánu neplní (zůstanou {{…}})',
    sy.PODM_ZALOHA === undefined && sy.PODM_ZALOHA_PROC === undefined && sy.PODM_FAKT_DPS === undefined && sy.PODM_FAKT_ZAMERENI === undefined,
    [sy.PODM_ZALOHA, sy.PODM_ZALOHA_PROC, sy.PODM_FAKT_DPS]);
  kp.kryciProjZmrazPodminky(z, v);
  test('zmrazení u plánu vezme způsob fakturace z předvolby, ne ruční starší hodnotu',
    /^záloha 50 % po podpisu smlouvy/.test(v.data.kryciProj.zmrazeno.zpusobFakturace || ''), v.data.kryciProj.zmrazeno);
  const z3 = novaZ(0), v3 = z3.varianty[0];
  v3.data.kryciProj.hodnoty = { zaloha: 'Záloha 70 %' };
  zamkniVariantu(v3, { typ: 'nabidkaProj', kdo: 'Test', cislo: '2026 - OVP - CN - 405' });
  test('odeslaná nabídka z doby před plánem: PODM_ZALOHA z dřívějšího pole (jak odešla)',
    kp.kryciProjPodminkoveSymboly(z3, v3, null).PODM_ZALOHA === 'Záloha 70 %', kp.kryciProjPodminkoveSymboly(z3, v3, null).PODM_ZALOHA);
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

/* 7) převod starších zakázek (krok 7): ruční splátky sodpPlatba1–8 */
{
  const z = novaZ(0), v = z.varianty[0];
  v.data.kryciProj.hodnoty = { sodpPlatba1: '110 000 Kč', sodpPlatba6: 'viz příloha', zaloha: 'Záloha 30 %' };
  const e = PP.planPlatebVarianty(v, global.NAST.firma);
  /* Q5 (rozhodnutí J. V. 30. 9. 2026): dřívější záloha krycího listu se
   * přepne AUTOMATICKY na předvolbu „Záloha X % + zbytek po předání" —
   * do té doby se jen nabízela tlačítkem. Líně, bez zápisu do dat. */
  test('Q5: dřívější záloha „Záloha 30 %" přepne předvolbu sama na Zálohu 30 %',
    e.plan && e.plan.predvolba === 'zaloha' && e.plan.zaloha === 30 && !!e.zalohaZeStarych && e.zalohaZeStarych.lze === true
    && NP.nabidkaProjPlatby(z, v, 'cz').dopocet.cinnosti.dpz.map(r => r.p + ':' + r.m).join() === '30:podpis,70:dpz_su', e.plan);
  test('starší zakázka: ruční splátka 1 platí jako ruční částka platby „po podpisu"', e.plan && e.plan.prepis.podpis === 110000 && !!e.zeStarych, e.plan);
  test('nečitelná ruční splátka se nezahodí (k upozornění)', e.zeStarych && e.zeStarych.necitelne.length === 1 && e.zeStarych.necitelne[0].id === 'sodpPlatba6');
  const pl = NP.nabidkaProjPlatby(z, v, 'cz');
  test('platba „po podpisu" je ve smlouvě ručně 110 000 Kč a součet hlídá kontrola',
    pl.dopocet.platby.find(x => x.klic === 'podpis').prepsano && pl.dopocet.platby.find(x => x.klic === 'podpis').castka === 110000
    && pl.kontrola.some(k => k.kod === 'soucet'), pl.dopocet.platby.map(x => x.klic + ':' + x.castka));
  test('převod nic nezapsal do dat (líně)', v.data.kryciProj.planPlateb === undefined || v.data.kryciProj.planPlateb === null);
  v.data.kryciProj.planPlateb = { v: 1, prepis: {} };
  test('plán s vlastními ručními částkami (i prázdnými) dřívější splátky nebere', !PP.planPlatebVarianty(v, global.NAST.firma).zeStarych
    && !NP.nabidkaProjPlatby(z, v, 'cz').dopocet.platby.some(x => x.prepsano));
  delete v.data.kryciProj.planPlateb;
  kp.kryciProjZmrazPodminky(z, v);
  zamkniVariantu(v, { typ: 'nabidkaProj', kdo: 'Test', cislo: '2026 - OVP - CN - 402' });
  test('odeslaná (se snímkem): dřívější ruční splátka platí stejně jako před odesláním',
    NP.nabidkaProjPlatby(z, v, 'cz').dopocet.platby.find(x => x.klic === 'podpis').castka === 110000);
  test('Q5: snímek při odeslání nese převzatou předvolbu Záloha 30 %',
    v.data.kryciProj.zmrazenoPlan.predvolba === 'zaloha' && v.data.kryciProj.zmrazenoPlan.zaloha === 30, v.data.kryciProj.zmrazenoPlan);
}

/* 7b) Q5: které znění dřívější zálohy se přepne a které ne */
{
  const ef = (hodnoty, plan) => { const z = novaZ(0), v = z.varianty[0]; v.data.kryciProj.hodnoty = hodnoty;
    if (plan) v.data.kryciProj.planPlateb = plan; const e = PP.planPlatebVarianty(v, global.NAST.firma);
    return { e: Object.assign({}, e, { plan: e.plan || {} }), z, v }; };
  let r = ef({ zaloha: 'Bez zálohy' });
  test('Q5: „Bez zálohy" → předvolba Záloha 0 % (100 % po předání)', r.e.plan.predvolba === 'zaloha' && r.e.plan.zaloha === 0
    && NP.nabidkaProjPlatby(r.z, r.v, 'cz').dopocet.cinnosti.dpz.map(x => x.p + ':' + x.m).join() === '100:dpz_su', r.e.plan);
  r = ef({ zaloha: 'Záloha 70 %' });
  test('Q5: „Záloha 70 %" → předvolba Záloha 70 %', r.e.plan.predvolba === 'zaloha' && r.e.plan.zaloha === 70, r.e.plan);
  r = ef({ zaloha: '40 % po podpisu smlouvy' });
  test('Q5: vlastní znění, které předvolba nezná (40 %), se nepřepne — jen ohlásí',
    !r.e.plan.predvolba && PP.planPredvolba(r.e.plan, r.e.firemni) === PP.PLAN_PROJ_VYCHOZI.vychozi
    && PP.planZalohaEf(r.e.plan, r.e.firemni) === PP.PLAN_PROJ_VYCHOZI.zalohaPct && !!r.e.zalohaZeStarych && r.e.zalohaZeStarych.lze === false && r.e.zalohaZeStarych.pct === 40,
    [r.e.plan, r.e.zalohaZeStarych]);
  r = ef({ zaloha: 'Záloha 30 %' }, { v: 1, predvolba: 'std' });
  test('Q5: plán s vlastní předvolbou se dřívější zálohou nepřepíše', r.e.plan.predvolba === 'std' && !r.e.zalohaZeStarych, r.e.plan);
  r = ef({ zaloha: 'Záloha 50 %' }, { v: 1, cinnosti: { ic: [{ p: 100, m: 'ic_povoleni' }] } });
  test('Q5: upravené splátky bez předvolby zůstanou, ostatní činnosti jdou z převzaté zálohy',
    r.e.plan.predvolba === 'zaloha' && r.e.plan.zaloha === 50
    && NP.nabidkaProjPlatby(r.z, r.v, 'cz').dopocet.cinnosti.ic.map(x => x.p + ':' + x.m).join() === '100:ic_povoleni'
    && NP.nabidkaProjPlatby(r.z, r.v, 'cz').dopocet.cinnosti.dpz.map(x => x.p + ':' + x.m).join() === '50:podpis,50:dpz_su', r.e.plan);
  r = ef({ zaloha: 'Záloha 30 %' });
  test('Q5: převod nic nezapsal do dat (líně)', r.v.data.kryciProj.planPlateb === undefined);
  const zl = novaZ(0), vl = zl.varianty[0];
  vl.data.kryciProj.hodnoty = { zaloha: 'Záloha 30 %' };
  zamkniVariantu(vl, { typ: 'nabidkaProj', kdo: 'Test', cislo: '2026 - OVP - CN - 406' });
  test('Q5: odeslaná nabídka z doby před plánem se nepřepíná (tiskne se, jak odešla)', PP.planPlatebVarianty(vl, global.NAST.firma).stary === true);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
