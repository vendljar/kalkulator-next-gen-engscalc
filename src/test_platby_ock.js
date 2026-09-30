/* PLATEBNÍ PODMÍNKY NABÍDKY OCK: BEZ ZÁLOHY A MĚSÍČNÍ FAKTURACE
 * (etapa A platebních podmínek, #367 — první část; 30. 9. 2026).
 *
 * D1 (nález K18-N94, střední): volba „Bez zálohy" dala ve Wordu větu
 * „1. dílčí daňový doklad ve výši  (bez DPH)…" bez procenta — šablona CN v13
 * má tři pevné věty a do první dosazuje {{PODM_ZALOHA1_PROC}}, které u „Bez
 * zálohy" nic nenese. Oprava: splátka s 0 % se z nabídky vynechá celá
 * a ostatní se přečíslují (dílčí faktura 2 = 100 % − záloha − konečná se
 * pak tiskne jako 1. dílčí daňový doklad).
 *
 * D2 (rozhodnutí J. V. 29. 9. 2026, pokyn 30. 9.: „teď už by to mělo být
 * možné, prověř to a nastav"): měsíční fakturace z krycího listu se do
 * nabídky promítne větou „Fakturace probíhá měsíčně podle skutečně
 * provedených prací." místo vět o splátkách 50 / 40 / 10. Milníky zůstávají
 * tři firemní, věty o podmínce úhrady u 1. a 2. splátky jako dnes.
 *
 * Šablona CN v13 to vyjádřit neumí (pevné věty), proto šablona CN v14
 * (nastroje/vyrob_sablony.js --cn-v14): věty skládá aplikace do
 * {{PODM_PLATEBNI_KALENDAR}} (řádek tabulky za větu), měsíční fakturace má
 * vlastní tabulku s {{PODM_FAKTURACE_MESICNE}}; nepotřebná tabulka zmizí
 * i se značkami bloku. S v13 zůstává dosavadní chování a kontrola
 * „platbyWordOck" upozorní, co Word nevytiskne. Odeslaná (zamčená) varianta
 * z doby před touto verzí se tiskne beze změny (P9.5 / A1).
 *
 * Každý oddíl níž před opravou selže (chybějící funkce a symboly), po ní
 * projde. Spuštění: cd src && node test_platby_ock.js */
const fs = require('fs');
const path = require('path');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
const PR = nacti('./preklad.js');
const dg = nacti('./docxgen.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./firma.js');
nacti('./plan_plateb.js');
const zk = nacti('./zakazka.js');
const ZM = nacti('./zamek.js');
const KR = nacti('./kryci.js');
nacti('./kryci_proj.js');
nacti('./nabidka_proj.js');
nacti('./zpracovatel.js');
nacti('./dokumenty.js');
const NB = nacti('./nabidka.js');
const SOD = nacti('./sod.js');
const K = nacti('./kontroly.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info.slice(0, 700) : JSON.stringify(info).slice(0, 700))); } };
/* Chybějící funkce před opravou nesmí sadu shodit — každý test má selhat sám. */
const zkus = (fn) => { try { return fn(); } catch (e) { return { __chyba: e.message }; } };
const JEKLY = JSON.parse(fs.readFileSync(path.join(__dirname, 'jekly.json'), 'utf8'));
global.NAST = { firma: global.firmaDefault() };

let VS = null;
try { VS = require(path.join(__dirname, '..', 'nastroje', 'vyrob_sablony.js')); } catch (e) { VS = null; }

/* Věty šablony CN v13 — znění, které odešlo v každé dosavadní nabídce. */
const V1 = (n, p) => n + '. dílčí daňový doklad ve výši ' + p + ' (bez DPH) z celkové ceny díla bude vystaven po podpisu SoD. '
  + 'Úhrada tohoto daňového dokladu je podmínkou pro dodržení předem dohodnutých realizačních termínů.';
const V2 = (n, p) => 'Po ukončení výroby, dodání materiálu na stavbu a po zahájení prací bude vystaven ' + n + '. dílčí daňový doklad ve výši '
  + p + ' (bez DPH) z celkové ceny díla. Úhrada tohoto daňového dokladu je podmínkou pro předání díla objednateli.';
const V3 = 'Po ukončení všech výše uvedených prací a po řádném předání a převzetí celého díla předávacím protokolem bude vystaven '
  + 'konečný daňový doklad na zbývající část celkové ceny díla s vyúčtováním DPH v zákonné výši.';
const MES = 'Fakturace probíhá měsíčně podle skutečně provedených prací.';
/* Šablonové věty v13 se symbolem (klíče slovníku, z nich vznikla EN/DE/FR v13). */
const V1S = V1(1, '{{PODM_ZALOHA1_PROC}}'), V2S = V2(2, '{{PODM_FAKTURA2_PROC}}');

const novaZ = (hodnoty) => {
  const z = zk.novaZakazka();
  z.cislo = '2026 - OPR - CN - 0467'; z.nazevAkce = 'Platební podmínky OCK'; z.objednatel = 'Zkušební odběratel s.r.o.';
  z.varianty[0].data.kryci = { hodnoty: Object.assign({}, hodnoty || {}) };
  return z;
};
const kal = (z) => zkus(() => KR.kryciPlatebniKalendar(z, z.varianty[0], JEKLY));
const sym = (z, lang) => zkus(() => NB.nabidkaData(z, z.varianty[0], JEKLY, lang || 'cz').placeholders) || {};
const radky = (t) => String(t == null ? '' : t).split('\n').filter(r => r.trim() !== '');

/* ---------------- 0) model: kryci.js vyváží kalendář a symboly ---------------- */
test('kryci.js vyváží kryciPlatebniKalendar, kryciPlatebniSymboly a kryciPlatbaProcento',
  typeof KR.kryciPlatebniKalendar === 'function' && typeof KR.kryciPlatebniSymboly === 'function'
  && typeof KR.kryciPlatbaProcento === 'function');
test('procento splátky: „Bez zálohy" = 0, „50 % – …" = 50, text bez % = neznámé (nic se nevymýšlí)',
  JSON.stringify(zkus(() => [KR.kryciPlatbaProcento('Bez zálohy').pct, KR.kryciPlatbaProcento('50 % – po podpisu smlouvy').pct,
    KR.kryciPlatbaProcento('dle rámcové smlouvy').pct, KR.kryciPlatbaProcento('12,5 % – po objednání').proc])) === '[0,50,null,"12,5 %"]',
  zkus(() => [KR.kryciPlatbaProcento('Bez zálohy'), KR.kryciPlatbaProcento('dle rámcové smlouvy'), KR.kryciPlatbaProcento('12,5 % – po objednání')]));

/* ---------------- 1) výchozí stav 50 / 40 / 10 se nemění ---------------- */
{
  const z = novaZ();
  const k = kal(z), s = sym(z);
  test('výchozí: tři splátky po milnících, ne měsíčně', k && !k.stary && k.mesicne === false && Array.isArray(k.splatky)
    && k.splatky.map(x => x.id).join(',') === 'zaloha1,faktura2,fakturaKonc', k);
  test('výchozí: {{PODM_PLATEBNI_KALENDAR}} = přesně tři věty šablony v13 (50 % a 40 %)',
    JSON.stringify(radky(s.PODM_PLATEBNI_KALENDAR)) === JSON.stringify([V1(1, '50 %'), V2(2, '40 %'), V3]), s.PODM_PLATEBNI_KALENDAR);
  test('výchozí: {{PODM_FAKTURACE_MESICNE}} je prázdný (tabulka měsíční fakturace zmizí)', s.PODM_FAKTURACE_MESICNE === '', s.PODM_FAKTURACE_MESICNE);
  test('kalendář čte tytéž hodnoty jako symboly {{PODM_…}} (lehký kontext bez výpočtu)',
    k && k.hodnoty && k.hodnoty.zaloha1 === s.PODM_ZALOHA1 && k.hodnoty.faktura2 === s.PODM_FAKTURA2
    && k.hodnoty.fakturaKonc === s.PODM_FAKTURA_KONC && k.hodnoty.zpusobFakturace === s.PODM_ZPUSOB_FAKTURACE, [k && k.hodnoty, s.PODM_ZALOHA1]);
}

/* ---------------- 2) D1: Bez zálohy ---------------- */
{
  const h = { zaloha1: 'Bez zálohy' };
  const f2 = zkus(() => KR.kryciFaktura2Sync(h));
  test('dopočet: „Bez zálohy" + konečná 10 % → dílčí faktura 2 = 90 % (100 − 0 − 10)', f2 === '90 % – po zahájení montáže', f2);
  const z = novaZ({ zaloha1: 'Bez zálohy', faktura2: f2 });
  const k = kal(z), s = sym(z);
  test('Bez zálohy: splátka s 0 % se vynechá', k && k.splatky && k.splatky.map(x => x.id).join(',') === 'faktura2,fakturaKonc'
    && JSON.stringify(k.vynechane) === '["zaloha1"]', k);
  test('Bez zálohy: dílčí faktura 2 se tiskne jako 1. dílčí daňový doklad (90 %), konečná zůstává',
    JSON.stringify(radky(s.PODM_PLATEBNI_KALENDAR)) === JSON.stringify([V2(1, '90 %'), V3]), s.PODM_PLATEBNI_KALENDAR);
  test('Bez zálohy: žádná věta „ve výši  (bez DPH)" bez procenta', !/ve výši\s+\(bez DPH\)/.test(s.PODM_PLATEBNI_KALENDAR || 've výši  (bez DPH)'));
  test('Bez zálohy: symboly šablony v13 se nemění (dosavadní chování, _PROC prázdné)', s.PODM_ZALOHA1_PROC === '' && s.PODM_FAKTURA2_PROC === '90 %',
    [s.PODM_ZALOHA1_PROC, s.PODM_FAKTURA2_PROC]);
  /* cizí jazyk: přeloží vzor (pořadí 1st / 1. / 1re) */
  z.varianty[0].data.cenik.kurzEurKc = 25;
  const en = sym(z, 'en'), de = sym(z, 'de'), fr = sym(z, 'fr');
  test('Bez zálohy EN: „the 1st partial tax invoice … 90 % (excl. VAT)" a konečná věta ze slovníku',
    radky(en.PODM_PLATEBNI_KALENDAR)[0] === 'After completion of production, delivery of the material to the site and commencement of the works, '
      + 'the 1st partial tax invoice will be issued in the amount of 90 % (excl. VAT) of the total contract price. Payment of this invoice is a condition for the handover of the work to the client.'
    && radky(en.PODM_PLATEBNI_KALENDAR)[1] === PR.tr(V3, 'en'), en.PODM_PLATEBNI_KALENDAR);
  test('Bez zálohy DE: „die 1. Teilrechnung … 90 % (zzgl. MwSt.)"', /wird die 1\. Teilrechnung in Höhe von 90 % \(zzgl\. MwSt\.\)/.test(de.PODM_PLATEBNI_KALENDAR || ''), de.PODM_PLATEBNI_KALENDAR);
  test('Bez zálohy FR: „la 1re facture partielle … 90 % (hors TVA)"', /la 1re facture partielle sera émise pour un montant de 90 % \(hors TVA\)/.test(fr.PODM_PLATEBNI_KALENDAR || ''), fr.PODM_PLATEBNI_KALENDAR);
}

/* ---------------- 3) další tvary kalendáře ---------------- */
{
  const s1 = sym(novaZ({ zaloha1: '90 % – po podpisu smlouvy', faktura2: '0 % – po zahájení montáže' }));
  test('dílčí faktura 2 s 0 %: vynechá se, záloha zůstane 1. dokladem', JSON.stringify(radky(s1.PODM_PLATEBNI_KALENDAR)) === JSON.stringify([V1(1, '90 %'), V3]), s1.PODM_PLATEBNI_KALENDAR);
  const s2 = sym(novaZ({ faktura2: '50 % – po zahájení montáže', fakturaKonc: '0 % – po předání' }));
  test('konečná 0 %: konečný doklad se vynechá, dílčí 1. a 2. zůstanou', JSON.stringify(radky(s2.PODM_PLATEBNI_KALENDAR)) === JSON.stringify([V1(1, '50 %'), V2(2, '50 %')]), s2.PODM_PLATEBNI_KALENDAR);
  const z3 = novaZ({ zaloha1: 'dle rámcové smlouvy' });
  const k3 = kal(z3), s3 = sym(z3);
  test('vlastní znění bez procenta: řádek „1. dílčí faktura: <text>", nic se nedopočítává',
    JSON.stringify(radky(s3.PODM_PLATEBNI_KALENDAR)) === JSON.stringify(['1. dílčí faktura: dle rámcové smlouvy', V2(2, '40 %'), V3])
    && k3 && JSON.stringify(k3.necitelne) === '["zaloha1"]', s3.PODM_PLATEBNI_KALENDAR);
  const s4 = sym(novaZ({ zaloha1: '30 % – po podpisu smlouvy', faktura2: '60 % – po zahájení montáže' }));
  test('záloha 30 %: věty 30 % / 60 % / konečná', JSON.stringify(radky(s4.PODM_PLATEBNI_KALENDAR)) === JSON.stringify([V1(1, '30 %'), V2(2, '60 %'), V3]), s4.PODM_PLATEBNI_KALENDAR);
}

/* ---------------- 4) D2: měsíční fakturace ---------------- */
{
  const z = novaZ({ zpusobFakturace: 'Měsíční' });
  const k = kal(z), s = sym(z);
  test('měsíční: kalendář to pozná', k && k.mesicne === true && !k.stary, k);
  test('měsíční: {{PODM_FAKTURACE_MESICNE}} nese schválenou větu', s.PODM_FAKTURACE_MESICNE === MES, s.PODM_FAKTURACE_MESICNE);
  test('měsíční: věty o splátkách se netisknou ({{PODM_PLATEBNI_KALENDAR}} prázdný)', s.PODM_PLATEBNI_KALENDAR === '', s.PODM_PLATEBNI_KALENDAR);
  test('měsíční: symboly šablony v13 zůstávají jako dřív (50 % / 40 %)', s.PODM_ZALOHA1_PROC === '50 %' && s.PODM_FAKTURA2_PROC === '40 %');
  global.NAST.firma.zpusobFakturaceOck = 'Měsíční';
  const kf = kal(novaZ());
  test('měsíční z Nastavení → Firma (předvyplnění krycího listu) platí taky', kf && kf.mesicne === true, kf);
  global.NAST.firma.zpusobFakturaceOck = 'Po milnících';
  test('vlastní znění způsobu fakturace („Náš standard / měsíční") měsíční fakturací není (P10.5)',
    zkus(() => kal(novaZ({ zpusobFakturace: 'Náš standard / měsíční' })).mesicne) === false);
  z.varianty[0].data.cenik.kurzEurKc = 25;
  const en = sym(z, 'en'), de = sym(z, 'de'), fr = sym(z, 'fr');
  test('měsíční: věta má překlad EN / DE / FR (návrh ke kontrole J. V.)',
    [en, de, fr].every(x => x.PODM_FAKTURACE_MESICNE && x.PODM_FAKTURACE_MESICNE !== MES)
    && ['en', 'de', 'fr'].every(L => PR.trStav(MES, L).prelozeno), [en.PODM_FAKTURACE_MESICNE, de.PODM_FAKTURACE_MESICNE, fr.PODM_FAKTURACE_MESICNE]);
  test('„Po milnících" a „Měsíční" mají překlad (řádek Způsob fakturace v cizím náhledu)',
    ['en', 'de', 'fr'].every(L => PR.trStav('Po milnících', L).prelozeno && PR.trStav('Měsíční', L).prelozeno));
}

/* ---------------- 5) překlad výchozích vět = šablona v13 EN/DE/FR ---------------- */
{
  const z = novaZ();
  z.varianty[0].data.cenik.kurzEurKc = 25;
  ['en', 'de', 'fr'].forEach(L => {
    const s = sym(z, L);
    const v13 = [PR.tr(V1S, L).replace('{{PODM_ZALOHA1_PROC}}', '50 %'), PR.tr(V2S, L).replace('{{PODM_FAKTURA2_PROC}}', '40 %'), PR.tr(V3, L)];
    test('výchozí ' + L.toUpperCase() + ': věty jsou tytéž, jaké tiskne přeložená šablona v13',
      JSON.stringify(radky(s.PODM_PLATEBNI_KALENDAR)) === JSON.stringify(v13), [s.PODM_PLATEBNI_KALENDAR, v13]);
  });
}

/* ---------------- 6) odeslaná (zamčená) varianta ---------------- */
{
  /* odeslaná PŘED touto verzí: zámek bez značky pravidel — tiskne se jako dřív */
  const z = novaZ({ zpusobFakturace: 'Měsíční' });
  const v = z.varianty[0];
  ZM.zamkniVariantu(v, { typ: 'nabidka', kdo: 'Test', cislo: z.cislo });
  const k = kal(z), s = sym(z);
  test('odeslaná před touto verzí: kalendář je „starý"', k && k.stary === true, k);
  test('odeslaná před touto verzí: měsíční se nepromítne, věty šablony v13 jako v odeslané nabídce',
    s.PODM_FAKTURACE_MESICNE === '' && JSON.stringify(radky(s.PODM_PLATEBNI_KALENDAR)) === JSON.stringify([V1(1, '50 %'), V2(2, '40 %'), V3]), s);
  const zb = novaZ({ zaloha1: 'Bez zálohy', faktura2: '90 % – po zahájení montáže' });
  ZM.zamkniVariantu(zb.varianty[0], { typ: 'nabidka', kdo: 'Test', cislo: zb.cislo });
  const sb = sym(zb);
  test('odeslaná před touto verzí + Bez zálohy: text přesně jako tiskla v13 (nic se zpětně nemění)',
    JSON.stringify(radky(sb.PODM_PLATEBNI_KALENDAR)) === JSON.stringify([V1(1, ''), V2(2, '90 %'), V3]), sb.PODM_PLATEBNI_KALENDAR);
  const nahledB = zkus(() => { const d = NB.nabidkaData(zb, zb.varianty[0], JEKLY, 'cz'); return NB.nabidkaNahledSekce(d.placeholders, 'cz', d.platbyOck); });
  const iii = Array.isArray(nahledB) ? nahledB.find(x => /^III\./.test(x.sekce)) : null;
  test('odeslaná před touto verzí: online náhled má řádky jako dřív (1. dílčí faktura = Bez zálohy)',
    !!iii && iii.radky[0][0] === '1. dílčí faktura' && iii.radky[0][1] === 'Bez zálohy' && iii.radky[1][0] === '2. dílčí faktura', iii);

  /* odeslaná OD této verze: zámek zmrazí podmínky i se značkou pravidel */
  global.NAST.firma.zpusobFakturaceOck = 'Měsíční';
  const zn = novaZ();
  const vn = zn.varianty[0];
  zkus(() => KR.kryciZmrazPodminky(zn, vn, JEKLY));
  ZM.zamkniVariantu(vn, { typ: 'nabidka', kdo: 'Test', cislo: zn.cislo });
  global.NAST.firma.zpusobFakturaceOck = 'Po milnících';          // Nastavení se po odeslání změní
  test('první zamčení zapíše značku pravidel platebních podmínek', vn.data.kryci.pravidlaPlateb === 1, vn.data.kryci);
  const kn = kal(zn), sn = sym(zn);
  test('odeslaná od této verze: měsíční z doby odeslání platí i po změně Nastavení',
    kn && kn.stary === false && kn.mesicne === true && sn.PODM_FAKTURACE_MESICNE === MES, kn);
  const zp = novaZ();
  zkus(() => KR.kryciZmrazPodminky(zp, zp.varianty[0], JEKLY));
  ZM.zamkniVariantu(zp.varianty[0], { typ: 'nabidka', kdo: 'Test', cislo: zp.cislo });
  global.NAST.firma.zpusobFakturaceOck = 'Měsíční';
  test('odeslaná po milnících zůstane po milnících, i když se Nastavení přepne na měsíční',
    zkus(() => kal(zp).mesicne) === false && radky(sym(zp).PODM_PLATEBNI_KALENDAR).length === 3);
  global.NAST.firma.zpusobFakturaceOck = 'Po milnících';
  /* klon odeslané je rozpracovaný — platí nová pravidla */
  const vk = zkus(() => ZM.klonujVariantu(z, v.id));
  test('klon odeslané varianty (rozpracovaný) už měsíční fakturaci tiskne',
    !!vk && !vk.__chyba && !vk.zamek && zkus(() => KR.kryciPlatebniKalendar(z, vk, JEKLY).mesicne) === true, vk && vk.__chyba);
}

/* ---------------- 7) online náhled podle týchž pravidel ---------------- */
const nahled = (z, L) => zkus(() => { const d = NB.nabidkaData(z, z.varianty[0], JEKLY, L || 'cz'); return NB.nabidkaNahledSekce(d.placeholders, L || 'cz', d.platbyOck); });
const kapIII = (sek) => (Array.isArray(sek) ? sek.find(x => /^III\./.test(x.sekce)) : null);
{
  const iii = kapIII(nahled(novaZ({ zaloha1: 'Bez zálohy', faktura2: '90 % – po zahájení montáže' })));
  const r = iii ? iii.radky.map(x => [String(x[0]), String(x[1])]) : [];
  test('náhled Bez zálohy: žádný řádek „Bez zálohy", 90 % je 1. dílčí faktura, pak konečná',
    !!iii && r[0][0] === '1. dílčí faktura' && r[0][1] === '90 % – po zahájení montáže' && r[1][0] === 'Konečná faktura'
    && !r.some(x => x[1] === 'Bez zálohy') && !r.some(x => x[0] === '2. dílčí faktura'), r);
  const iiiM = kapIII(nahled(novaZ({ zpusobFakturace: 'Měsíční' })));
  const rm = iiiM ? iiiM.radky.map(x => [String(x[0]), String(x[1])]) : [];
  test('náhled měsíční: řádek Způsob fakturace nese větu, řádky splátek nejsou',
    !!iiiM && rm[0][0] === 'Způsob fakturace' && rm[0][1] === MES && !rm.some(x => /dílčí faktura|Konečná faktura/.test(x[0]))
    && rm.filter(x => x[0] === 'Způsob fakturace').length === 1, rm);
  const iiiD = kapIII(nahled(novaZ()));
  const rd = iiiD ? iiiD.radky.map(x => String(x[0])) : [];
  test('náhled výchozí: řádky jako dosud (1., 2., konečná, splatnost, platnost, způsob fakturace)',
    JSON.stringify(rd) === JSON.stringify(['1. dílčí faktura', '2. dílčí faktura', 'Konečná faktura', 'Splatnost faktur (dní)', 'Platnost nabídky', 'Způsob fakturace']), rd);
  const zEn = novaZ({ zpusobFakturace: 'Měsíční' });
  zEn.varianty[0].data.cenik.kurzEurKc = 25;
  const iiiE = kapIII(nahled(zEn, 'en'));
  test('náhled EN měsíční: přeložený popisek i věta', !!iiiE && iiiE.radky[0][0] === 'Invoicing method' && iiiE.radky[0][1] === PR.tr(MES, 'en'), iiiE);
  const ui = fs.readFileSync(path.join(__dirname, 'ui', 'zakazka_ui.js'), 'utf8');
  test('obě online cesty (podklady i tiskový náhled) předávají kalendář náhledu',
    (ui.match(/nabidkaNahledSekce\(p, L, data\.platbyOck\)/g) || []).length === 2);
}

/* ---------------- 8) smlouva o dílo realizace ---------------- */
{
  const z = novaZ({ zpusobFakturace: 'Měsíční' });
  const ds = zkus(() => SOD.sodData(z, z.varianty[0], JEKLY, 'cz'));
  test('SoD realizace dostane {{PODM_FAKTURACE_MESICNE}} i {{PODM_PLATEBNI_KALENDAR}} (šablona si je může vzít)',
    !!ds && !!ds.placeholders && ds.placeholders.PODM_FAKTURACE_MESICNE === MES && 'PODM_PLATEBNI_KALENDAR' in ds.placeholders, ds && ds.__chyba);
  test('SoD realizace: splátky SOD_SPLATKA1–4_PROC aplikace dál neplní (doplňují se ve Wordu)',
    !!ds && ds.placeholders && ['SOD_SPLATKA1_PROC', 'SOD_SPLATKA2_PROC', 'SOD_SPLATKA3_PROC', 'SOD_SPLATKA4_PROC'].every(k => !(k in ds.placeholders)));
}

/* ---------------- 9) kontrola před nabídkou: co šablona v13 nevytiskne ---------------- */
{
  const nalez = (ctx) => K.kontrolyProved(ctx).nalezy.find(n => n.kod === 'platbyWordOck');
  const v13 = { symboly: ['PODM_ZALOHA1_PROC', 'PODM_FAKTURA2_PROC', 'PODM_SPLATNOST_DNI_CISLO'], nazev: 'Sablona_NABIDKA_CN_v13.docx', verze: 4 };
  const v14 = { symboly: ['PODM_PLATEBNI_KALENDAR', 'PODM_FAKTURACE_MESICNE', 'PODM_SPLATNOST_DNI_CISLO'], nazev: 'Sablona_NABIDKA_CN_v14.docx', verze: 5 };
  const kMes = kal(novaZ({ zpusobFakturace: 'Měsíční' }));
  const kBez = kal(novaZ({ zaloha1: 'Bez zálohy', faktura2: '90 % – po zahájení montáže' }));
  const kStd = kal(novaZ());
  const n1 = nalez({ platbyOck: kMes, sablonaNabidka: v13 });
  test('měsíční + šablona v13 → varování (jmenuje šablonu, verzi, symbol a řešení v14)',
    !!n1 && /měsíční/i.test(n1.text) && /v13/.test(n1.text) && /verze 4/.test(n1.text) && /PODM_PLATEBNI_KALENDAR/.test(n1.text) && /v14/.test(n1.text), n1);
  test('je to varování (úroveň 2), dokument nezastaví', !!n1 && n1.uroven === K.KONTROLY_UROVEN);
  const n2 = nalez({ platbyOck: kBez, sablonaNabidka: v13 });
  test('Bez zálohy + šablona v13 → varování o větě bez procenta', !!n2 && /bez zálohy/i.test(n2.text), n2);
  test('šablona v14 → mlčí', !nalez({ platbyOck: kMes, sablonaNabidka: v14 }) && !nalez({ platbyOck: kBez, sablonaNabidka: v14 }));
  test('šablona s kalendářem, ale bez {{PODM_FAKTURACE_MESICNE}} → u měsíční varuje',
    !!nalez({ platbyOck: kMes, sablonaNabidka: { symboly: ['PODM_PLATEBNI_KALENDAR'], nazev: 'vlastní', verze: 6 } }));
  test('výchozí 50 / 40 / 10 → mlčí (v13 vytiskne správně)', !nalez({ platbyOck: kStd, sablonaNabidka: v13 }));
  test('šablonu neznáme → mlčí', !nalez({ platbyOck: kMes, sablonaNabidka: null }));
  test('zakázka jen PROJ → mlčí', !nalez({ platbyOck: kMes, sablonaNabidka: v13, jenProj: true }));
  test('odeslaná před touto verzí → mlčí (tiskne se jako dřív)', !nalez({ platbyOck: Object.assign({}, kMes, { stary: true }), sablonaNabidka: v13 }));
  test('pravidlo je v katalogu', K.kontrolyPravidla().some(p => p.kod === 'platbyWordOck'));
  const ku = fs.readFileSync(path.join(__dirname, 'ui', 'kontroly_ui.js'), 'utf8');
  const kuCtx = ku.slice(ku.indexOf('function kontrolyCtxAkt'), ku.indexOf('function kontrolySablonaNabidka'));
  test('kontroly v aplikaci dostanou kalendář a šablonu stáhnou i kvůli platebním podmínkám',
    /kryciPlatebniKalendar\(/.test(kuCtx) && /^\s*platbyOck,$/m.test(kuCtx) && /kontrolySablonaNabidka\([\s\S]{0,200}?, platbyOck\)/.test(kuCtx)
    && /function kontrolySablonaNabidka\(sleva, jazyk, platby\)[\s\S]{0,400}kontrolyPlatbyDuvody\(platby\)/.test(ku));
}

/* ---------------- 10) Word: řádek tabulky za každou větu ---------------- */
test('generátor umí rozvinout řádek tabulky za řádek hodnoty (rozvinRadkyZaRadek) pro {{PODM_PLATEBNI_KALENDAR}}',
  typeof dg.rozvinRadkyZaRadek === 'function' && Array.isArray(dg.DOCX_RADKY_ZA_RADEK) && dg.DOCX_RADKY_ZA_RADEK.indexOf('PODM_PLATEBNI_KALENDAR') >= 0);
if (typeof dg.rozvinRadkyZaRadek === 'function') {
  const pl = (t) => '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr><w:r><w:t>' + t + '</w:t></w:r></w:p>';
  const xml = '<w:body><w:tbl><w:tblPr/><w:tr><w:tc><w:p><w:r><w:t>Hlavička:</w:t></w:r></w:p></w:tc></w:tr>'
    + '<w:tr><w:tc>' + pl('{{PODM_PLATEBNI_KALENDAR}}') + '</w:tc></w:tr></w:tbl>' + pl('{{JINY}}') + '</w:body>';
  const ph = { PODM_PLATEBNI_KALENDAR: 'Věta A.\nVěta B.\nVěta C.', JINY: 'řádek 1\nřádek 2' };
  const vysl = dg.nahradPlaceholdery(dg.rozvinRadkyZaRadek(xml, ph), ph);
  test('tři věty = tři řádky tabulky s odrážkou (hlavička zůstane)', (vysl.match(/<w:tr>/g) || []).length === 4
    && (vysl.match(/<w:numId w:val="2"\/>/g) || []).length === 4 && /Věta A\./.test(vysl) && /Věta C\./.test(vysl) && /Hlavička:/.test(vysl), vysl);
  test('jiný víceřádkový symbol se láme dál uvnitř odstavce (w:br)', /řádek 1<\/w:t><w:br\/>/.test(vysl), vysl);
  test('platné XML', !dg.xmlStrukturaVada(vysl), dg.xmlStrukturaVada(vysl));
  /* šablona, která by kalendář nesla v obyčejném odstavci (mimo tabulku): odstavec za větu */
  const xmlP = '<w:body>' + pl('{{PODM_PLATEBNI_KALENDAR}}') + '</w:body>';
  const vyslP = dg.nahradPlaceholdery(dg.rozvinOdstavceZaRadek(dg.rozvinRadkyZaRadek(xmlP, ph), ph), ph);
  test('kalendář v obyčejném odstavci: odstavec s odrážkou za každou větu',
    (vyslP.match(/<w:numId w:val="2"\/>/g) || []).length === 3 && /Věta B\./.test(vyslP) && !/<w:br\/>/.test(vyslP) && !dg.xmlStrukturaVada(vyslP), vyslP);
}

/* ---------------- 11) šablona CN v14 z v13 (nastroje/vyrob_sablony.js --cn-v14) ---------------- */
test('nastroje/vyrob_sablony.js exportuje cnV14', !!(VS && typeof VS.cnV14 === 'function'));
/* syntetická CN v13: tabulka s hlavičkou a třemi větami (stavba jako skutečná šablona) */
const beh = (t, tucne) => '<w:r><w:rPr>' + (tucne ? '<w:b/>' : '') + '<w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">' + t + '</w:t></w:r>';
const pHlav = t => '<w:p w14:paraId="1A2B3C4D"><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>' + t + '</w:t></w:r></w:p>';
const pVeta = (...behy) => '<w:p w14:paraId="2B3C4D5E"><w:pPr><w:pStyle w:val="Bezmezer"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr>'
  + '<w:spacing w:before="120" w:after="120"/><w:ind w:left="426" w:hanging="426"/></w:pPr>' + behy.join('') + '</w:p>';
const radek = (p, stin) => '<w:tr w14:paraId="3C4D5E6F"><w:trPr><w:trHeight w:val="452"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="10632" w:type="dxa"/>'
  + (stin ? '<w:shd w:val="clear" w:color="auto" w:fill="013451"/>' : '') + '</w:tcPr>' + p + '</w:tc></w:tr>';
const odst = t => '<w:p><w:pPr><w:pStyle w:val="Bezmezer"/></w:pPr><w:r><w:t xml:space="preserve">' + t + '</w:t></w:r></w:p>';
const tabV13 = '<w:tbl><w:tblPr><w:tblpPr w:tblpX="113" w:tblpY="141"/><w:tblW w:w="10632" w:type="dxa"/></w:tblPr><w:tblGrid><w:gridCol w:w="10632"/></w:tblGrid>'
  /* jako ve skutečné šabloně: za „v" nezlomitelná mezera (Word) */
  + radek(pHlav('Cena díla je splatná v následujících dílčích splátkách:'), true)
  + radek(pVeta(beh('1. dílčí daňový doklad ve výši '), beh('{{PODM_ZALOHA1_PROC}}', true), beh(' (bez DPH) z celkové ceny díla bude vystaven po podpisu SoD. Úhrada tohoto daňového dokladu je podmínkou pro dodržení předem dohodnutých realizačních termínů.')))
  + radek(pVeta(beh('Po ukončení výroby, dodání materiálu na stavbu a po zahájení prací bude vystaven 2. dílčí daňový doklad ve výši '), beh('{{PODM_FAKTURA2_PROC}}', true), beh(' (bez DPH) z celkové ceny díla. Úhrada tohoto daňového dokladu je podmínkou pro předání díla objednateli.')))
  + radek(pVeta(beh(V3)))
  + '</w:tbl>';
const cnV13 = '<w:document><w:body>' + odst('III. PLATEBNÍ PODMÍNKY:') + tabV13
  + odst('Poznámky k platebním podmínkám: v případě podepsané rámcové smlouvy platí dohodnuté podmínky.')
  + odst('Splatnost faktur {{PODM_SPLATNOST_DNI_CISLO}} dní ode dne vystavení.')
  + odst('{{KAP_IV_ZAC}}') + odst('IV. POŽADAVKY PRO PROVEDENÍ REALIZACE:') + odst('{{FIRMA_NAB_POZADAVKY}}') + odst('{{KAP_IV_KON}}')
  + '<w:sectPr/></w:body></w:document>';
const cn14 = VS && typeof VS.cnV14 === 'function' ? zkus(() => VS.cnV14(cnV13)) : null;
const cnOk = typeof cn14 === 'string';
test('v14: úprava syntetické v13 proběhne', cnOk, cn14);
if (cnOk) {
  const kl = dg.klicePlaceholderu(cn14);
  test('v14: symboly {{PODM_PLATEBNI_KALENDAR}} a {{PODM_FAKTURACE_MESICNE}} a dva páry značek',
    ['PODM_PLATEBNI_KALENDAR', 'PODM_FAKTURACE_MESICNE', 'PLATBY_SPLATKY_ZAC', 'PLATBY_SPLATKY_KON', 'PLATBY_MESICNE_ZAC', 'PLATBY_MESICNE_KON']
      .every(k => kl.filter(x => x === k).length === 1), kl);
  test('v14: pevné věty v13 zmizely (i jejich symboly _PROC)', !/PODM_ZALOHA1_PROC|PODM_FAKTURA2_PROC/.test(cn14) && !/konečný daňový doklad/.test(cn14)
    && !/dílčí daňový doklad/.test(cn14));
  test('v14: hlavička splátek zůstala, tabulka měsíční fakturace má hlavičku „Způsob fakturace:"',
    (cn14.match(/Cena díla je splatná v[  ]následujících dílčích splátkách:/g) || []).length === 1 && /<w:t[^>]*>Způsob fakturace:<\/w:t>/.test(cn14));
  test('v14: řádek kalendáře má odrážku (a, b, c) jako věty v13, věta o měsíční fakturaci ne',
    /<w:numId w:val="2"\/>[\s\S]*\{\{PODM_PLATEBNI_KALENDAR\}\}/.test(cn14) && (cn14.match(/<w:numId w:val="2"\/>/g) || []).length === 1);
  test('v14: okolní text (poznámky, splatnost, kapitola IV.) zůstal', /Poznámky k platebním podmínkám/.test(cn14) && /PODM_SPLATNOST_DNI_CISLO/.test(cn14) && /KAP_IV_ZAC/.test(cn14));
  test('v14: kopie nenesou zdvojená w14:paraId', (cn14.match(/w14:paraId="1A2B3C4D"/g) || []).length <= 1 && (cn14.match(/w14:paraId="2B3C4D5E"/g) || []).length <= 1);
  test('v14: platné XML', !dg.xmlStrukturaVada(cn14), dg.xmlStrukturaVada(cn14));
  const chybaZ = (fn) => { try { fn(); return ''; } catch (e) { return e.message; } };
  test('v14: druhý průchod odmítne (šablona už kalendář má)', /už platební kalendář/.test(chybaZ(() => VS.cnV14(cn14))), chybaZ(() => VS.cnV14(cn14)));
  test('v14: vstup bez tabulky vět o dílčích dokladech skončí chybou (nic nehádá)',
    /dílčích dokladech/.test(chybaZ(() => VS.cnV14(cnV13.replace(tabV13, odst('jiný text'))))));
  test('v14: vstup bez značek kapitol (starší než v13) odmítne', /není CN v13/.test(chybaZ(() => VS.cnV14(cnV13.replace(/KAP_IV_/g, 'XXX_')))));

  /* ---- co do v14 dosadí aplikace (celá cesta docxVyplnSablonu) ---- */
  const enc = new TextEncoder(), dec = new TextDecoder();
  const vyplnV14 = async (ph) => {
    const sablona = await (await dg.zipZapis([{ nazev: 'word/document.xml', data: enc.encode(cn14) }])).arrayBuffer();
    const blob = await dg.docxVyplnSablonu(sablona.slice(0), ph, [], {});
    const pol = await dg.zipPrecti(new Uint8Array(await blob.arrayBuffer()));
    return dec.decode(pol.find(p => p.nazev === 'word/document.xml').data);
  };
  const text = (xml) => (xml.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join('|');
  (async () => {
    const dStd = await vyplnV14(sym(novaZ()));
    test('vyplněná v14 (výchozí): tři řádky vět s odrážkou, tabulka měsíční fakturace zmizela',
      (dStd.match(/<w:numId w:val="2"\/>/g) || []).length === 3 && text(dStd).indexOf(V1(1, '50 %')) >= 0 && text(dStd).indexOf(V3) >= 0
      && !/Způsob fakturace:/.test(dStd), text(dStd));
    test('vyplněná v14: žádná značka ani symbol platebních podmínek nezůstal, XML platné',
      !/PLATBY_(SPLATKY|MESICNE)_(ZAC|KON)|PODM_PLATEBNI_KALENDAR|PODM_FAKTURACE_MESICNE/.test(dStd) && !dg.xmlStrukturaVada(dStd), dg.xmlStrukturaVada(dStd));
    const dBez = await vyplnV14(sym(novaZ({ zaloha1: 'Bez zálohy', faktura2: '90 % – po zahájení montáže' })));
    test('vyplněná v14 (Bez zálohy): dva řádky — 1. dílčí 90 % a konečný, žádná věta bez procenta',
      (dBez.match(/<w:numId w:val="2"\/>/g) || []).length === 2 && text(dBez).indexOf(V2(1, '90 %')) >= 0 && !/ve výši\s+\(bez DPH\)/.test(text(dBez)), text(dBez));
    const dMes = await vyplnV14(sym(novaZ({ zpusobFakturace: 'Měsíční' })));
    test('vyplněná v14 (měsíční): jen tabulka „Způsob fakturace:" s větou, žádná splátka ani hlavička splátek',
      (dMes.match(/<w:numId w:val="2"\/>/g) || []).length === 0 && text(dMes).indexOf('Způsob fakturace:|' + MES) >= 0
      && !/Cena díla je splatná/.test(dMes) && !/dílčí daňový doklad/.test(dMes), text(dMes));
    test('vyplněná v14 (měsíční): XML platné', !dg.xmlStrukturaVada(dMes), dg.xmlStrukturaVada(dMes));
    console.log(`\n${ok} prošlo, ${fail} selhalo`);
    process.exit(fail ? 1 : 0);
  })().catch(e => { console.log('FAIL výjimka při vyplnění v14: ' + e.message); console.log(`\n${ok} prošlo, ${fail + 1} selhalo`); process.exit(1); });
} else {
  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
}
