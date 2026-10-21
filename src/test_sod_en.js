/* SMLOUVA O DÍLO V ANGLIČTINĚ (#157, dávka V3, 17. 10. 2026).
 *
 * Rozhodnutí J. V. 16. 10. 2026: anglická SoD = překlad české šablony
 * (zveřejní se jako jazyková verze EN v Nastavení → Šablony), jazyk se volí
 * u tlačítka jako u nabídek. Hlídá se:
 *   – hodnoty, které do šablony skládá aplikace, jsou v jazyce smlouvy:
 *     seznam splátek SoD realizace, věty plateb SoD PROJ, druh místa plnění,
 *   – částky v eurech (pravidla nabídky #155), jméno souboru s _EN,
 *   – čeština beze změny (stejné věty jako před #157),
 *   – bez jazykové šablony smlouva v cizím jazyce nevznikne (sodJazykZabrana),
 *   – generování Wordu ze SMYŠLENÉ anglické šablony (žádný firemní text):
 *     symboly vyplněné, splátky rozvinuté do odstavců, nic českého.
 * Před opravou: 8 prošlo / 10 selhalo (české řádky splátek a plateb, „bytový
 * dům", chybějící sodJazykZabrana); po opravě 18 / 0. Část 2b (DE/FR,
 * 18. 10.) hlídá slovník z v17.10.6 — mutace hesel DE/FR ji shodí.
 *
 * Spuštění: cd src && node test_sod_en.js */
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./preklad.js');
const dg = nacti('./docxgen.js');
nacti('./engine.js');
global.DEFAULT_CENIK = Object.assign(ZC.zkusebniCenik(), { kurzEurKc: 25 });
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
['./techspec.js', './sleva.js', './zaokrouhleni.js', './firma.js', './zpracovatel.js', './plan_plateb.js',
  './nabidka_proj.js'].forEach(nacti);
const zk = nacti('./zakazka.js');
nacti('./zamek.js');
nacti('./kryci.js');
nacti('./kryci_proj.js');
const dok = nacti('./dokumenty.js');
nacti('./nabidka.js');
const sod = nacti('./sod.js');
const JEKLY = JSON.parse(require('fs').readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info.slice(0, 600) : JSON.stringify(info))); } };
const hazi = (fn) => { try { fn(); return ''; } catch (e) { return e.message || String(e); } };
const CESKY = /[ěščřžůťďň]/i;

global.NAST = { firma: global.firmaDefault() };
/* číslo OPR = jen realizace, OVP = projekce (zámek strany P6) */
const novaZ = (cislo) => {
  const z = zk.novaZakazka(); z.cislo = cislo || '2026 - OPR - CN - 0405';
  z.varianty[0].data.proj.cenik = Object.assign(ZC.zkusebniCenikProj(), { kurzEurKc: 25 });
  const v = z.varianty[0];
  v.data.kryci = { hodnoty: { sodMistoPlneni: 'bytový dům' } };
  return z;
};
const sablona = (...symboly) => ({ symboly: new Set(symboly) });

/* 1) SoD realizace anglicky */
{
  const z = novaZ(), v = z.varianty[0];
  const fn = typeof sod.sodData === 'function' ? sod.sodData : null;
  const d = fn(z, v, JEKLY, 'en', sablona('SOD_PLATEBNI_KALENDAR', 'CENA_BEZ_DPH'));
  const P = d.placeholders;
  const radky = String(P.SOD_PLATEBNI_KALENDAR || '').split('\n');
  test('EN: seznam splátek má tři řádky', radky.length === 3, P.SOD_PLATEBNI_KALENDAR);
  test('EN: řádky splátek bez češtiny', !CESKY.test(P.SOD_PLATEBNI_KALENDAR || 'ě'), P.SOD_PLATEBNI_KALENDAR);
  test('EN: záloha „upon conclusion of this contract for work – 50 % of the total price of the Work"',
    radky[0] === 'upon conclusion of this contract for work – 50 % of the total price of the Work', radky[0]);
  test('EN: konečná splátka „… – the remaining 10 % of the total price of the Work"',
    /^after completion of the entire Work .* – the remaining 10 % of the total price of the Work$/.test(radky[2] || ''), radky[2]);
  test('EN: druh místa plnění přeložený se členem', P.SOD_MISTO_PLNENI_DRUH === 'an apartment building', P.SOD_MISTO_PLNENI_DRUH);
  test('EN: cena v eurech', /^€ [\d\s ]+$/.test(P.CENA_BEZ_DPH || ''), P.CENA_BEZ_DPH);
  test('EN: jméno souboru končí _EN', /_EN$/.test(d.nazevSouboru), d.nazevSouboru);
  /* čeština beze změny */
  const c = fn(z, v, JEKLY, 'cz', sablona('SOD_PLATEBNI_KALENDAR')).placeholders;
  test('CZ: věty splátek beze změny', c.SOD_PLATEBNI_KALENDAR === 'při uzavření této smlouvy o dílo 50 % z celkové ceny díla\n'
    + 'po zahájení montáže 40 % z celkové ceny díla\n'
    + 'po provedení celého díla zhotovitele a jeho předání a převzetí bez vad a nedodělků bránících provozu výtahu zbývajících 10 % z celkové ceny díla',
    c.SOD_PLATEBNI_KALENDAR);
  test('CZ: druh místa plnění česky', c.SOD_MISTO_PLNENI_DRUH === 'bytový dům', c.SOD_MISTO_PLNENI_DRUH);
}

/* 2) SoD projekce anglicky */
{
  const z = novaZ('2026 - OVP - CN - 404'), v = z.varianty[0];
  const d = sod.sodProjData(z, v, 'en', sablona('SODP_PLATEBNI_KALENDAR', 'PROJ_CELKEM_BEZ_DPH'));
  const k = String(d.placeholders.SODP_PLATEBNI_KALENDAR || '');
  test('EN PROJ: seznam plateb existuje a je bez češtiny', k && !CESKY.test(k), k);
  test('EN PROJ: řádek „Payment after signing the contract / order – € … + VAT."',
    /^Payment after signing the contract \/ order – € [\d\s ]+ \+ VAT\.$/.test(k.split('\n')[0]), k.split('\n')[0]);
  const soucet = k.split('\n').map(r => +((/€ ([\d\s ]+) \+/.exec(r) || [])[1] || '0').replace(/[\s ]/g, '')).reduce((a, b) => a + b, 0);
  const cena = +String(d.placeholders.PROJ_CELKEM_BEZ_DPH || '').replace(/[^\d]/g, '');
  test('EN PROJ: součet plateb = cena díla v eurech', soucet > 0 && soucet === cena, [soucet, d.placeholders.PROJ_CELKEM_BEZ_DPH]);
  const c = sod.sodProjData(z, v, 'cz', sablona('SODP_PLATEBNI_KALENDAR')).placeholders.SODP_PLATEBNI_KALENDAR;
  test('CZ PROJ: věta „Platba ve výši … Kč + DPH proběhne …" beze změny', /^Platba ve výši [\d\s ]+,\d\d Kč \+ DPH proběhne po podpisu smlouvy \/ objednávky\.$/.test(String(c).split('\n')[0]), c);
}

/* 2b) němčina a francouzština (rozhodnutí J. V. 18. 10. 2026 — šablony
 * SoD i v DE a FR): hodnoty skládané aplikací jsou ve slovníku pro všechny
 * tři jazyky už od v17.10.6, tady se to jen hlídá. */
{
  const z = novaZ(), v = z.varianty[0];
  const de = sod.sodData(z, v, JEKLY, 'de', sablona('SOD_PLATEBNI_KALENDAR')).placeholders;
  test('DE: splátky bez češtiny, místo plnění „ein Wohngebäude"', !CESKY.test(de.SOD_PLATEBNI_KALENDAR || 'ě') && de.SOD_MISTO_PLNENI_DRUH === 'ein Wohngebäude'
    && /des Gesamtpreises des Werks$/.test(de.SOD_PLATEBNI_KALENDAR || ''), [de.SOD_PLATEBNI_KALENDAR, de.SOD_MISTO_PLNENI_DRUH]);
  const zp = novaZ('2026 - OVP - CN - 404');
  const fr = String(sod.sodProjData(zp, zp.varianty[0], 'fr', sablona('SODP_PLATEBNI_KALENDAR')).placeholders.SODP_PLATEBNI_KALENDAR || '');
  test('FR PROJ: platby bez češtiny, „Paiement … + TVA."', fr && !CESKY.test(fr) && /^Paiement .* – € [\d\s ]+ \+ TVA\.$/.test(fr.split('\n')[0]), fr);
}

/* 2c) režim DPH a skladné (rozhodnutí J. V. 18. 10. 2026, šablona SoD
 * realizace v3): věta režimu z krycího listu, prohlášení o snížené sazbě
 * jen při české DPH a stavbě pro bydlení, skladné z Nastavení → Firma —
 * česky v Kč, v cizí smlouvě v eurech kurzem ceníku (celá eura nahoru).
 * Částka 600 Kč je SMYŠLENÁ. Výchozí režim podle DIČ objednatele (zadání
 * koordinace 18. 10., od B189 19. 10. viz níže). Proti d502fc9 (bez režimu DPH a skladného): 24 prošlo /
 * 6 selhalo (kontroly „symbol se nevyplní" projdou i tam); po úpravě 30 / 0. */
{
  const fn = (h, L) => {
    const z = novaZ(), v = z.varianty[0];
    Object.assign(v.data.kryci.hodnoty, h || {});
    return sod.sodData(z, v, JEKLY, L || 'cz', sablona('SOD_DPH_REZIM', 'SOD_DPH_PROHLASENI', 'SOD_SKLADNE')).placeholders;
  };
  const S = sod.SOD_DPH_VETY || {};
  const fnZ = (dic, h, L) => {
    const z = novaZ(), v = z.varianty[0];
    z.dic = dic;
    Object.assign(v.data.kryci.hodnoty, h || {});
    return sod.sodData(z, v, JEKLY, L || 'cz', sablona('SOD_DPH_REZIM', 'SOD_DPH_PROHLASENI', 'SOD_SKLADNE')).placeholders;
  };
  const vychozi = fn();
  /* V7-N2 (rozhodnutí J. V. 20. 10. 2026): bez DIČ výchozí přenesená daňová
   * povinnost (tuzemsko) — do v20.10.5 česká DPH s prohlášením o snížené sazbě. */
  test('V7-N2: DPH výchozí (bez DIČ = tuzemsko): přenesená daňová povinnost; bytový dům → bez prohlášení o snížené sazbě',
    vychozi.SOD_DPH_REZIM === 'DPH bude účtováno dle platných předpisů v režimu přenesené daňové povinnosti.'
      && vychozi.SOD_DPH_PROHLASENI === sod.SOD_DPH_PROHLASENI_OZNAMENI, [vychozi.SOD_DPH_REZIM, vychozi.SOD_DPH_PROHLASENI]);
  /* B189 (rozhodnutí J. V. 19. 10. 2026, roadmapa #430): DIČ CZ → přenesená
   * daňová povinnost (tuzemsko, § 92e ZDPH), bez DIČ → česká DPH, DIČ z EU
   * i mimo EU → BEZ výchozí volby a smlouva bez zvoleného režimu NEVZNIKNE
   * (sodData hází; UI zhasne tlačítko s toutéž větou — dokumentZabrana).
   * Ruční volba má přednost. Proti 62bd0b6 (v18.10.15): 7 FAIL, po opravě projde. */
  const vychZ = dic => (typeof kryciDphRezimVychozi === 'function' ? kryciDphRezimVychozi({ dic }) : null);
  const dCz = fnZ('CZ12345678'), dCzMez = fnZ(' cz 123 456 78');
  test('B189: DIČ CZ → přenesená daňová povinnost (tuzemsko), věta odlišná od reverse charge čl. 196',
    vychZ('CZ12345678') === KRYCI_DPH_REZIMY[1] && dCz.SOD_DPH_REZIM === S.prenesena && dCzMez.SOD_DPH_REZIM === S.prenesena
      && S.prenesena !== S.eu && !/196/.test(S.prenesena || '196'), [vychZ('CZ12345678'), dCz.SOD_DPH_REZIM, dCzMez.SOD_DPH_REZIM]);
  /* V7-N2 (20. 10. 2026): bez DIČ → přenesená (dřív B189 česká DPH), obchodník
   * ji přepne rozbalovátkem a ↺ (smazání ruční hodnoty) vrátí výchozí. Proti
   * 5dc28d1 (v20.10.1): 3 FAIL (výchozí, bez DIČ, ↺), po opravě 49 / 0;
   * přepnutí do CZ/EN/DE/FR prochází i tam (ruční volba fungovala už dřív). */
  test('V7-N2: bez DIČ → přenesená daňová povinnost (tuzemsko), smlouva vznikne',
    vychZ('') === KRYCI_DPH_REZIMY[1] && vychZ('   ') === KRYCI_DPH_REZIMY[1] && fnZ('').SOD_DPH_REZIM === S.prenesena
      && fnZ('   ').SOD_DPH_REZIM === S.prenesena
      && (() => { const z = novaZ(); return sod.sodDphZabrana(z, z.varianty[0]) === ''; })(),
    [vychZ(''), fnZ('').SOD_DPH_REZIM]);
  {
    const jazyky = ['cz', 'en', 'de', 'fr'];
    const vety = jazyky.map(L => fnZ('', { sodDphRezim: KRYCI_DPH_REZIMY[0] }, L));
    const ok = vety.every((p, i) => p.SOD_DPH_REZIM === (i ? tr(S.ceska, jazyky[i]) : S.ceska)
      && p.SOD_DPH_PROHLASENI === (i ? tr(sod.SOD_DPH_PROHLASENI_SNIZENA, jazyky[i]) : sod.SOD_DPH_PROHLASENI_SNIZENA)
      && (!i || (!CESKY.test(p.SOD_DPH_REZIM) && p.SOD_DPH_REZIM !== S.ceska)));
    test('V7-N2: obchodník přepne bez DIČ na českou DPH — propíše se do SoD CZ/EN/DE/FR (věta i prohlášení o snížené sazbě)',
      ok, vety.map(p => p.SOD_DPH_REZIM));
    const z = novaZ(), v = z.varianty[0];
    v.data.kryci.hodnoty.sodDphRezim = KRYCI_DPH_REZIMY[0];
    const rucne = kryciPoleHodnota(z, v, 'sodDphRezim');
    delete v.data.kryci.hodnoty.sodDphRezim;   // ↺ = klReset (smaže ruční hodnotu)
    test('V7-N2: ↺ vrátí výchozí přenesenou povinnost', rucne === KRYCI_DPH_REZIMY[0]
      && kryciPoleHodnota(z, v, 'sodDphRezim') === KRYCI_DPH_REZIMY[1], [rucne, kryciPoleHodnota(z, v, 'sodDphRezim')]);
  }
  const euDic = ['DE 123456789', 'EL123456789', 'GR123456789', ' at u12345678', 'SK2020123456'], mimoDic = ['CHE-123.456.789', 'GB123456789', 'US12-3456789'];
  test('B189: DIČ z EU (DE, EL/GR, „ at u…", SK) → bez výchozí volby', euDic.every(d => vychZ(d) === ''), euDic.map(vychZ));
  test('B189: DIČ mimo EU (CH, GB, US) → bez výchozí volby', mimoDic.every(d => vychZ(d) === ''), mimoDic.map(vychZ));
  const zabEu = hazi(() => fnZ('DE123456789')), zabMimo = hazi(() => fnZ('CHE-123.456.789'));
  test('B189: EU bez volby → smlouva nevznikne, hláška s odkazem na volbu v krycím listu',
    /nevznikne: není zvolený režim DPH/.test(zabEu) && /z jiného státu EU/.test(zabEu) && /Režim DPH ve smlouvě/.test(zabEu), zabEu);
  test('B189: mimo EU bez volby → smlouva nevznikne (i anglicky)', /mimo Českou republiku a EU/.test(zabMimo)
    && /nevznikne/.test(hazi(() => fnZ('GB123456789', {}, 'en'))), zabMimo);
  test('B189: zábrana i v registru dokumentů (serverová i místní šablona jdou přes sodData)',
    typeof dok.dokumentVygeneruj === 'function' && typeof sod.sodDphZabrana === 'function'
      && (() => { const z = novaZ(); z.dic = 'DE123456789'; return /není zvolený režim DPH/.test(sod.sodDphZabrana(z, z.varianty[0])); })());
  const rucEu = hazi(() => fnZ('DE123456789', { sodDphRezim: KRYCI_DPH_REZIMY[0] }));
  const ruc = (dic, i) => fnZ(dic, { sodDphRezim: KRYCI_DPH_REZIMY[i] }).SOD_DPH_REZIM;
  test('B189: ruční volba má přednost — EU + česká DPH (stavba v ČR), EU + reverse charge, mimo EU + česká, CZ + česká, bez DIČ + česká / reverse charge',
    rucEu === '' && ruc('DE123456789', 0) === S.ceska && ruc('DE123456789', 2) === S.eu && ruc('CHE-1', 0) === S.ceska
      && ruc('CZ12345678', 0) === S.ceska && ruc('', 0) === S.ceska && ruc('', 2) === S.eu, [rucEu, ruc('DE123456789', 0), ruc('CZ12345678', 0)]);
  test('B189: vlastní znění režimu u cizího DIČ se počítá jako volba (symboly {{…}} doplní ve Wordu)',
    hazi(() => fnZ('DE123456789', { sodDphRezim: 'dle dohody' })) === '');
  /* Existující zakázka s uloženou volbou se nemění: ruční hodnota i zmrazené předvyplnění zamčené varianty. */
  {
    const z = novaZ(), v = z.varianty[0]; z.dic = 'CZ12345678';
    v.zamek = { zamceno: true }; v.data.kryci.zmrazeno = { sodDphRezim: KRYCI_DPH_REZIMY[0] };
    test('B189: zamčená varianta drží zmrazený režim z doby odeslání (česká DPH), ne nový výchozí',
      kryciPoleHodnota(z, v, 'sodDphRezim') === KRYCI_DPH_REZIMY[0], kryciPoleHodnota(z, v, 'sodDphRezim'));
  }
  /* UI: tlačítko smlouvy zhasne s toutéž větou (ui/ukazkove_ui.js → dokumentZabrana). */
  {
    const vm = require('vm');
    vm.runInThisContext(require('fs').readFileSync(__dirname + '/ui/ukazkove_ui.js', 'utf8'), { filename: 'ukazkove_ui.js' });
    const z = novaZ(); z.dic = 'DE123456789'; global.ZAK = z;
    global.aktivniVarianta = zz => zz.varianty[0];
    const uEu = dokumentZabrana('sod', z.varianty[0]);   // před opravou ''
    z.dic = 'CZ12345678'; const uCz = dokumentZabrana('sod', z.varianty[0]);
    z.dic = ''; const uBez = dokumentZabrana('sod', z.varianty[0]);   // V7-N2: bez DIČ výchozí přenesená → tlačítko svítí
    z.dic = 'DE123456789'; const uProj = dokumentZabrana('sodProj', z.varianty[0]);
    test('B189: UI zábrana — cizí DIČ bez volby zhasne SoD realizace, CZ ani bez DIČ ne, SoD PROJ se netýká',
      uEu === (typeof sod.sodDphZabrana === 'function' ? sod.sodDphZabrana(z, z.varianty[0]) : 'x') && /nevznikne/.test(uEu) && uCz === '' && uBez === '' && uProj === '', [uEu, uCz, uBez, uProj]);
    delete global.ZAK;
  }
  /* #454 (O8): od V7-N2 je výchozí režim přenesená povinnost — česká DPH se
   * musí zvolit výslovně, jinak by případ mutaci „prohlášení i mimo bydlení“
   * nechytil (přežila v kole K4). Před opravou mutace přežije, po opravě chycena. */
  const ceskaAdm = fn({ sodDphRezim: KRYCI_DPH_REZIMY[0], sodMistoPlneni: 'administrativní budova' });
  const ceskaByt = fn({ sodDphRezim: KRYCI_DPH_REZIMY[0] });
  test('česká DPH + administrativní budova: bez prohlášení o snížené sazbě (bytový dům ho má)',
    ceskaAdm.SOD_DPH_REZIM === S.ceska && ceskaAdm.SOD_DPH_PROHLASENI === sod.SOD_DPH_PROHLASENI_OZNAMENI
      && ceskaByt.SOD_DPH_PROHLASENI === sod.SOD_DPH_PROHLASENI_SNIZENA, [ceskaAdm.SOD_DPH_REZIM, ceskaAdm.SOD_DPH_PROHLASENI]);
  const prenByt = fn({ sodDphRezim: 'přenesená daňová povinnost (tuzemsko)' });
  test('přenesená DPH + bytový dům: věta šablony v2, prohlášení o snížené sazbě NE (nesoulad v2 zmizel)',
    prenByt.SOD_DPH_REZIM === 'DPH bude účtováno dle platných předpisů v režimu přenesené daňové povinnosti.'
      && prenByt.SOD_DPH_PROHLASENI === sod.SOD_DPH_PROHLASENI_OZNAMENI, prenByt.SOD_DPH_PROHLASENI);
  const euEn = fnZ('', { sodDphRezim: 'reverse charge EU (zákazník z jiného státu EU)' }, 'en');
  test('reverse charge EU anglicky (ruční volba): věta s čl. 196, bez češtiny', /^The supply is not subject to Czech VAT; .*Article 196 of Council Directive 2006\/112\/EC\.$/.test(euEn.SOD_DPH_REZIM || '')
    && !CESKY.test(euEn.SOD_DPH_PROHLASENI || 'ě'), [euEn.SOD_DPH_REZIM, euEn.SOD_DPH_PROHLASENI]);
  const vlastni = fn({ sodDphRezim: 'dle dohody' });
  test('vlastní znění režimu: symboly zůstanou {{…}} (nevyplní se)', !('SOD_DPH_REZIM' in vlastni) && !('SOD_DPH_PROHLASENI' in vlastni), vlastni.SOD_DPH_REZIM);
  test('bez skladného v Nastavení → Firma: {{SOD_SKLADNE}} zůstane', !('SOD_SKLADNE' in vychozi), vychozi.SOD_SKLADNE);
  NAST.firma.skladneDenneKc = '600';
  const cz = fn(), en = fn({}, 'en');
  test('skladné česky „600,- Kč" (tvar dosavadní šablony)', cz.SOD_SKLADNE === '600,- Kč', cz.SOD_SKLADNE);
  test('skladné anglicky v eurech kurzem ceníku: 600 / 25 = € 24', en.SOD_SKLADNE === '€ 24', en.SOD_SKLADNE);
  NAST.firma.skladneDenneKc = '610';
  test('skladné v eurech zaokrouhleno nahoru: 610 / 25 → € 25', fn({}, 'de').SOD_SKLADNE === '€ 25', fn({}, 'de').SOD_SKLADNE);
  /* B190 (audit kola 28, 18. 10. 2026): „1.500" (tečka jako oddělovač tisíců)
   * se četlo jako 1,5 → „2,- Kč". Nejednoznačný zápis se nevyplní — symbol
   * zůstane {{…}} k doplnění. Před opravou 2 FAIL, po opravě projde. */
  const skl = v => { NAST.firma.skladneDenneKc = v; return fn().SOD_SKLADNE; };
  test('B190: „1.500" ani „1.500,-" nedá „2,- Kč" — symbol zůstane', skl('1.500') === undefined && skl('1.500,-') === undefined, [skl('1.500'), skl('1.500,-')]);
  test('B190: „1.000,50" se nevyplní (ne „1,- Kč")', skl('1.000,50') === undefined, skl('1.000,50'));
  test('B190: běžné zápisy beze změny — „1 500", „600,-", „600 Kč", „500,50"',
    skl('1 500') === (1500).toLocaleString('cs-CZ') + ',- Kč' && skl('600,-') === '600,- Kč' && skl('600 Kč') === '600,- Kč'
      && skl('500,50') === '501,- Kč', [skl('1 500'), skl('600,-'), skl('600 Kč'), skl('500,50')]);
  NAST.firma.skladneDenneKc = '';
}

/* 2d) rozsah díla SoD PROJ v4 (#380, V5) v jazyce smlouvy — názvy sedmi
 * činností do věty přílohy č. 1 (zadání koordinace 18. 10. 2026). Zaměření
 * má vlastní překlad (kolize s nadpisem nabídky „ZAMĚŘENÍ a zpracování
 * výstupů"), nadpis nabídky se nemění. Před doplněním: 3 ze 4 selžou („sURVEY
 * and processing of outputs", české názvy).  */
{
  const vse = (sod.SODP_CINNOSTI || []).map(c => c.nazev);
  const t = L => (typeof sod.sodProjRozsahText === 'function' ? sod.sodProjRozsahText(vse, L) : 'ě');
  test('rozsah díla EN/DE/FR: sedm činností bez češtiny', vse.length === 7 && ['en', 'de', 'fr'].every(L => !CESKY.test(t(L))), ['en', 'de', 'fr'].map(t));
  test('rozsah díla EN: „survey and processing of outputs, …, economic tender part and selection of the contractor …"',
    /^survey and processing of outputs, documentation for the project permit, .* and selection of the contractor for the implementation of the project$/.test(t('en')), t('en'));
  test('rozsah díla DE: „Aufmaß und Ausarbeitung der Ergebnisse, … und Auswahl des Ausführungsunternehmens …"',
    /^Aufmaß und Ausarbeitung der Ergebnisse, .* und Auswahl des Ausführungsunternehmens für die Realisierung des Vorhabens$/.test(t('de')), t('de'));
  test('nadpis nabídky „ZAMĚŘENÍ a zpracování výstupů" překládá slovník dál beze změny', tr('ZAMĚŘENÍ a zpracování výstupů', 'en') === 'SURVEY and processing of outputs', tr('ZAMĚŘENÍ a zpracování výstupů', 'en'));
}

/* 3) bez jazykové šablony smlouva nevznikne */
{
  const z = typeof sod.sodJazykZabrana === 'function' ? sod.sodJazykZabrana : () => '';
  const t = z('sod', 'en', false);
  test('EN bez šablony: srozumitelná hláška s cestou k nápravě',
    /nevznikne/.test(t) && /Nastavení → Šablony/.test(t) && /EN/.test(t) && /česky/.test(t), t);
  test('EN se šablonou / česky / plná moc: bez zábrany',
    z('sod', 'en', true) === '' && z('sodProj', 'cz', false) === '' && z('plnaMoc', 'en', false) === '' && z('sodProj', 'de', false) !== '', '');
}

/* 4) Word ze smyšlené anglické šablony (žádný firemní text) */
(async () => {
  const enc = new TextEncoder();
  const p = (t) => '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="3"/></w:numPr></w:pPr><w:r><w:t xml:space="preserve">' + t + '</w:t></w:r></w:p>';
  const telo = ['TEST CONTRACT No. {{SOD_CISLO_SMLOUVY}}', 'Site: {{SOD_MISTO_PLNENI_DRUH}} at {{ADRESA}}',
    'Price: {{CENA_BEZ_DPH}} (excluding VAT)', 'Instalments:', '{{SOD_PLATEBNI_KALENDAR}}',
    'Warranty {{SOD_ZARUKA_MESICU}} months'].map(p).join('');
  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
    + telo + '</w:body></w:document>';
  const buf = await (await dg.zipZapis([{ nazev: 'word/document.xml', data: enc.encode(xml) }])).arrayBuffer();
  const z = novaZ(), v = z.varianty[0];
  z.adresa = 'Testovací 1, Praha';
  let res = null, chyba = '';
  try { res = await dok.dokumentVygeneruj('sod', buf, z, v, JEKLY, 'en'); } catch (e) { chyba = e.message; }
  test('Word EN ze smyšlené šablony vznikl', !!res, chyba);
  if (res) {
    const text = (await dg.docxTextSablony(await res.blob.arrayBuffer())).join('\n');
    test('Word EN: splátky rozvinuté do tří odstavců', (text.match(/of the total price of the Work/g) || []).length === 3, text);
    test('Word EN: žádný český text z aplikace (mimo adresu stavby) a cena v eurech',
      !CESKY.test(text.replace(/Testovací 1, Praha/, '')) && /Price: € /.test(text) && /an apartment building/.test(text), text);
  } else { test('Word EN: splátky rozvinuté do tří odstavců', false); test('Word EN: žádný český text', false); }
  console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
  process.exit(fail ? 1 : 0);
})();
