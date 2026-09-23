/* Test řad ceníku OCK — tuzemsko a zahraničí (#181, 31. 8. 2026).
 *
 * Co se hlídá:
 *   – zahraniční ceník je TABULKA ODCHYLEK: co v něm není, platí z tuzemské,
 *   – přepnutí mění jen ceníkové ceny, ne ruční přepisy ani přirážku,
 *   – položka „jen pro zahraničí" se v tuzemské kalkulaci NEZOBRAZÍ,
 *   – razítko varianty nese řadu, aby šlo po roce doložit, z čeho se počítalo,
 *   – očista odmítne cizí klíče (databáze programu chodí i ze souboru).
 */
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); };
nacti('./format.js'); nacti('./cenik.js'); nacti('./cenik_stari.js'); nacti('./cenik_rady.js');
const eng = require('./engine.js');
Object.keys(eng).forEach(k => { global[k] = eng[k]; });
const ZC = require('./zkusebni_cenik.js');
const JEKLY = JSON.parse(require('fs').readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : info); }
};

const CR = () => ZC.zkusebniCenik();
const ZAHR = () => ({
  ceny: { 'C.montazHodKc': 1000, 'C.powertechInt': 250, 'C.prekladyKc': 15000, 'C.cestovniKc': 120000 },
  jenZahr: { 'C.prekladyKc': true, 'C.cestovniKc': true },
});

/* ---------- složení řady ---------- */
{
  const cr = CR();
  const slozeny = cenikSlozRadu(cr, ZAHR(), 'zahr');
  test('zahraniční řada přepsala jen své cesty',
    slozeny.montazHodKc === 1000 && slozeny.powertechInt === 250);
  test('co v odchylkách není, zůstalo tuzemské',
    slozeny.profilasKgKc === cr.profilasKgKc, slozeny.profilasKgKc);
  test('složený ceník nese řadu i značky', slozeny.rada === 'zahr' && slozeny.jenZahr['C.prekladyKc']);
  test('tuzemská řada odchylky nebere',
    cenikSlozRadu(cr, ZAHR(), 'cr').montazHodKc === cr.montazHodKc);
  test('složení je kopie — původní ceník se nezměnil', cr.montazHodKc !== 1000);
  test('neznámá řada je tuzemská', cenikRadaPlatna('nesmysl') === 'cr' && cenikRadaPlatna() === 'cr');
}

/* ---------- očista ---------- */
{
  const spinave = cenikZahrOciste({
    ceny: { 'C.montazHodKc': 1000, 'X.podvrh': 999, 'C.profilasKgKc': 'abc' },
    jenZahr: { 'C.cestovniKc': true, 'Y.cizi': true },
  });
  test('cizí cesta se do odchylek nedostane', spinave.ceny['X.podvrh'] === undefined);
  test('známá cesta projde', spinave.ceny['C.montazHodKc'] === 1000);
  test('cizí značka se zahodí', spinave.jenZahr['Y.cizi'] === undefined
    && spinave.jenZahr['C.cestovniKc'] === true);
  test('prázdný vstup dá prázdné odchylky', cenikZahrPrazdna(cenikZahrOciste(null)));
}

/* ---------- rozdíly a přepnutí varianty ---------- */
{
  const cr = CR();
  const rozdily = cenikRadaRozdily(cr, ZAHR());
  /* Od 22. 9. 2026 večer přibývá k odchylkám ze zveřejněného ceníku ještě
   * VÝCHOZÍ NULOVÁ SAZBA DPH (J. V.: „sazba DPH se při přepnutí na zahraniční
   * ceník nepřepíná na 0 % … to by bylo optimální"). Proto se výslovné
   * odchylky počítají zvlášť a výchozí nula má vlastní kontrolu níž. */
  test('rozdíly vypíšou všechny odchylky', rozdily.filter(x => !x.vychozi).length === 4,
    rozdily.map(x => x.cesta));
  test('a navíc výchozí nulovou sazbu DPH (holý ceník OCK = jen sazba OCK)',
    rozdily.filter(x => x.vychozi).map(x => x.cesta).join(',') === 'C.dph',
    rozdily.filter(x => x.vychozi));
  test('rozdíl zná tuzemskou i zahraniční cenu', (() => {
    const r = rozdily.find(x => x.cesta === 'C.montazHodKc');
    return r && r.zahr === 1000 && r.cr === cr.montazHodKc;
  })());

  const data = { cenik: CR(), cenikRada: 'cr' };
  const puvodniMarze = data.cenik.marze;
  const v = cenikRadaPrepni(data, cr, ZAHR(), 'zahr');
  test('přepnutí zapsalo řadu', data.cenikRada === 'zahr' && cenikRadaVarianty(data) === 'zahr');
  test('přepnutí změnilo ceníkové ceny', data.cenik.montazHodKc === 1000 && v.zmen >= 3, v.zmen);
  test('globální přirážka se přepnutím nemění', data.cenik.marze === puvodniMarze);
  test('ceník varianty nese značky jen pro zahraničí', !!data.cenik.jenZahr['C.cestovniKc']);

  /* zpátky do tuzemska */
  const v2 = cenikRadaPrepni(data, cr, ZAHR(), 'cr');
  test('návrat vrátí tuzemské ceny', data.cenik.montazHodKc === cr.montazHodKc, data.cenik.montazHodKc);
  test('návrat zapsal řadu zpět', cenikRadaVarianty(data) === 'cr' && v2.zmen >= 3);
}

/* ---------- položky jen pro zahraničí ve výpočtu ---------- */
{
  const zadani = JSON.parse(JSON.stringify(DEFAULT_ZADANI));
  const crCenik = cenikSlozRadu(CR(), ZAHR(), 'cr');
  const zahrCenik = cenikSlozRadu(CR(), ZAHR(), 'zahr');
  const nazvy = r => r.sekce.rezie.map(x => String(x.origNazev || x.nazev));

  const rCr = vypocet(zadani, crCenik, JEKLY, false);
  const rZahr = vypocet(zadani, zahrCenik, JEKLY, false);
  test('v tuzemské kalkulaci překlady vůbec nejsou',
    !nazvy(rCr).some(n => /PŘEKLADY/.test(n)), nazvy(rCr).join(' | '));
  test('v zahraniční kalkulaci překlady jsou',
    nazvy(rZahr).some(n => /PŘEKLADY/.test(n)), nazvy(rZahr).join(' | '));
  test('zahraniční kalkulace je dražší', rZahr.souhrn.zakladCena > rCr.souhrn.zakladCena,
    Math.round(rZahr.souhrn.zakladCena) + ' × ' + Math.round(rCr.souhrn.zakladCena));
  /* Do 9. 9. 2026 tu stálo „bez značek se nic neskrývá". Přesně to byla ta
   * chyba: administrátor značku nezaškrtl a překlady se objevily v české
   * nabídce. Teď se pevná sada (CENIK_JEN_ZAHR) uplatní i bez značek —
   * a co v ní není, se bez značky pořád ukáže. */
  test('bez značek se skryje jen pevná sada, zbytek zůstane', (() => {
    const bezZnacek = cenikSlozRadu(CR(), { ceny: {}, jenZahr: {} }, 'cr');
    const r = vypocet(zadani, bezZnacek, JEKLY, false);
    return r.sekce.rezie.length === rZahr.sekce.rezie.length - CENIK_JEN_ZAHR.length
      && !nazvy(r).some(n => /PŘEKLADY/.test(n));
  })(), nazvy(vypocet(zadani, cenikSlozRadu(CR(), { ceny: {}, jenZahr: {} }, 'cr'), JEKLY, false)).join(' | '));
}

/* ---------- razítko nese řadu ---------- */
{
  const data = { cenik: cenikSlozRadu(CR(), ZAHR(), 'zahr'), cenikRada: 'zahr' };
  const r = cenikRazitkoNovy(data, { dnes: '2026-08-31', verze: 4 });
  test('razítko zahraniční varianty nese řadu', r.rada === 'zahr');
  test('a popis se dá vypsat', cenikRazitkoRada(r) === 'zahraniční ceník');
  const rCr = cenikRazitkoNovy({ cenik: CR(), cenikRada: 'cr' }, { dnes: '2026-08-31' });
  test('tuzemské razítko řadu nenese (výchozí stav nepotřebuje štítek)',
    rCr.rada === undefined && cenikRazitkoRada(rCr) === '');
}

/* ---------- přirážka se natahuje z ceníku (31. 8. 2026) ----------
 * Zadání J. V.: „vlož globální přirážku do ceníku OCK, stejně jako je tomu
 * v ceníku PROJ, a z ceníků ji natahuj do odpovídajících kalkulací."
 * Přirážka je součástí ceníku (`C.marze` / `PC.marze`), takže NOVÁ zakázka ji
 * dostane ze zveřejněného ceníku — a rozpracované si tu svou nechají
 * (to hlídá test_cenik_stari.js, protože je to zakázková hodnota). */
{
  const zk = require('./zakazka.js');
  global.DEFAULT_CENIK = CR();
  global.DEFAULT_CENIK.marze = 0.42;
  /* Pozor na čísla: hlídač v test_proj_vzhled.js hledá ve zdrojácích zápis
   * skutečné ceníkové marže (i v komentáři!) a bere ho jako únik ceníku.
   * Zkušební hodnoty proto schválně vypadají jinak než ta ostrá. */
  global.DEFAULT_CENIK_PROJ = { marze: 0.55, sazby: {}, fixy: {}, dph: 0.21 };
  global.DEFAULT_ZADANI_PROJ = { sekce: [] };
  global.DEFAULT_TECHSPEC = {};
  const d = zk.novaVariantaData();
  test('nová zakázka bere přirážku OCK z ceníku', d.cenik.marze === 0.42, d.cenik.marze);
  test('nová zakázka bere přirážku PROJ z ceníku', d.proj.cenik.marze === 0.55, d.proj.cenik.marze);
  test('a je to kopie, ne odkaz — změna v zakázce nesahá na ceník', (() => {
    d.cenik.marze = 0.40;
    return DEFAULT_CENIK.marze === 0.42;
  })());
  test('nová zakázka je tuzemská', d.cenikRada === 'cr');

  /* K9-N31 (9. testovací kolo, 23. 9. 2026): nová tuzemská zakázka hlásila
   * „ceník se liší od dnešního" u položky „jen zahraničí", protože brala holý
   * DEFAULT_CENIK, kdežto přehled srovnává s ceníkem složeným pro řadu
   * (tam je taková položka v tuzemsku nula). Smyšlená čísla. */
  const zaloha = JSON.parse(JSON.stringify(CENIK_ZAHR));
  global.DEFAULT_CENIK.prekladyKc = 11000;
  Object.assign(CENIK_ZAHR, { ceny: { 'C.prekladyKc': 13000 }, jenZahr: { 'C.prekladyKc': true } });
  const n = zk.novaVariantaData();
  test('K9-N31: nová tuzemská zakázka má položku „jen zahraničí" na nule', n.cenik.prekladyKc === 0, n.cenik.prekladyKc);
  test('K9-N31: ceník aplikace se tím nezměnil', DEFAULT_CENIK.prekladyKc === 11000, DEFAULT_CENIK.prekladyKc);
  const dnesni = cenikDnesniProRadu({ cenik: DEFAULT_CENIK, proj: { cenik: DEFAULT_CENIK_PROJ } }, CENIK_ZAHR, 'cr');
  const pr = cenikPrehled({ data: n }, dnesni, { dnes: '2026-09-23' });
  test('K9-N31: a přehled ceníku u ní nehlásí žádný rozdíl', pr.rozdily.length === 0 && !pr.varovat,
    JSON.stringify(pr.rozdily));
  /* Bez zahraniční ceny se nic nenuluje (stejné pravidlo jako v přepočtu). */
  Object.assign(CENIK_ZAHR, { ceny: {}, jenZahr: { 'C.prekladyKc': true } });
  const bez = zk.novaVariantaData();
  test('K9-N31: bez zahraniční ceny položka zůstane, jak je v ceníku', bez.cenik.prekladyKc === 11000, bez.cenik.prekladyKc);
  CENIK_ZAHR.ceny = zaloha.ceny; CENIK_ZAHR.jenZahr = zaloha.jenZahr;
}

/* ---------- zahraniční globální přirážka (3. 9. 2026) ----------
 * Zadání J. V.: „pro zahraniční zakázky předvolit globální přirážku 40 %
 * místo standardních 30 % — nejlépe v ceníku jako zahraniční variantu."
 * Přirážka je sledovaná ceníková cesta, takže odchylka jde uložit stejně
 * jako u ceny. Dvě věci se musí držet zároveň:
 *   – nedotčená přirážka se přepnutím řady vymění (to je celý smysl),
 *   – přirážku, kterou si obchodník v TÉHLE nabídce nastavil sám, nikdo
 *     nepřepíše (#177) — jinak by mu přepnutí měny přepsalo dohodnutou marži.
 * Čísla jsou schválně jiná než ostrá ceníková (hlídač úniku ceníku). */
{
  const cr = CR();
  const zahrMarze = Object.assign(ZAHR(), { ceny: Object.assign({}, ZAHR().ceny, { 'C.marze': 0.44 }) });
  cr.marze = 0.27;

  const data = { cenik: Object.assign(CR(), { marze: 0.27 }), cenikRada: 'cr' };
  const v = cenikRadaPrepni(data, cr, zahrMarze, 'zahr');
  test('zahraniční odchylka přirážky se při přepnutí použije', data.cenik.marze === 0.44, data.cenik.marze);
  test('nic nezůstalo ležet jako chráněné', v.chranene.length === 0, JSON.stringify(v.chranene));
  cenikRadaPrepni(data, cr, zahrMarze, 'cr');
  test('návratem do tuzemska se vrátí tuzemská přirážka', data.cenik.marze === 0.27, data.cenik.marze);

  /* Tatáž zakázka, ale obchodník si přirážku nastavil sám. */
  const dohodnuta = { cenik: Object.assign(CR(), { marze: 0.29 }), cenikRada: 'cr' };
  cenikRucniZnac(dohodnuta, 'C.marze');
  const v2 = cenikRadaPrepni(dohodnuta, cr, zahrMarze, 'zahr');
  test('ručně nastavenou přirážku přepnutí nepřepíše', dohodnuta.cenik.marze === 0.29, dohodnuta.cenik.marze);
  test('a řekne o ní volajícímu, ať to obchodník neprošvihne',
    v2.chranene.length === 1 && v2.chranene[0].cesta === 'C.marze', JSON.stringify(v2.chranene));
  test('ceny se přitom přepnuly normálně', dohodnuta.cenik.montazHodKc === 1000, dohodnuta.cenik.montazHodKc);
}

/* ---------- zahraniční sazba DPH (nález N18, 22. 9. 2026) ----------
 * Pozorování z 8. kola: po přepnutí na zahraniční ceník naskočila zahraniční
 * přirážka a ceny se přepsaly, ale SAZBA DPH zůstala tuzemská. Mechanismus
 * pro ni přitom existoval — `C.dph` je sledovaná cesta —, jen ji neměl
 * administrátor kam zadat: sloupec „Cena Zahraničí" se kreslí u řádků
 * tabulky a DPH v tabulce není.
 *
 * NULA JE PLATNÁ HODNOTA, ne „prázdné". U DPH to není detail: 0 % znamená
 * přenesenou daňovou povinnost, která je u dodání s montáží do jiného státu
 * EU běžná. Je to přesně ten rozdíl, který se ztratí v pravdivostní
 * podmínce, takže se měří testem, ne čtením kódu. */
{
  const cr = CR();
  cr.dph = 0.21;
  const zahrDph = { ceny: { 'C.dph': 0 }, jenZahr: {} };

  const rozdily = cenikRadaRozdily({ cenik: cr }, zahrDph);
  test('rozdíl u sazby DPH zná obě hodnoty',
    rozdily.length === 1 && rozdily[0].cr === 0.21 && rozdily[0].zahr === 0,
    JSON.stringify(rozdily));

  const data = { cenik: Object.assign(CR(), { dph: 0.21 }), cenikRada: 'cr' };
  const v = cenikRadaPrepni(data, cr, zahrDph, 'zahr');
  test('nulová zahraniční sazba DPH se při přepnutí použije',
    data.cenik.dph === 0, data.cenik.dph);
  test('a nespadne pod stůl jako „prázdné"', data.cenik.dph !== 0.21, data.cenik.dph);
  test('nic nezůstalo ležet jako chráněné', v.chranene.length === 0, JSON.stringify(v.chranene));
  cenikRadaPrepni(data, cr, zahrDph, 'cr');
  test('návratem do tuzemska se vrátí tuzemská sazba', data.cenik.dph === 0.21, data.cenik.dph);

  /* Sazba, kterou si obchodník v téhle nabídce nastavil sám, se nepřepíše —
   * stejné pravidlo jako u přirážky (#177). */
  const vlastni = { cenik: Object.assign(CR(), { dph: 0.12 }), cenikRada: 'cr' };
  cenikRucniZnac(vlastni, 'C.dph');
  const v2 = cenikRadaPrepni(vlastni, cr, zahrDph, 'zahr');
  test('ručně nastavenou sazbu přepnutí nepřepíše', vlastni.cenik.dph === 0.12, vlastni.cenik.dph);
  test('a řekne o ní volajícímu',
    v2.chranene.some(x => x.cesta === 'C.dph'), JSON.stringify(v2.chranene));

  /* Projekce má vlastní sazbu (`PC.dph`), takže i vlastní odchylku. Past je
   * tatáž jako u přirážky: hodnota bydlí v ceníku PROJ, rozdíly proto musí
   * dostat CELÝ datový objekt. */
  const crData = { cenik: CR(), proj: { cenik: { dph: 0.21 } } };
  const zahrProjDph = { ceny: { 'PC.dph': 0 }, jenZahr: {} };
  const dataP = { cenik: CR(), proj: { cenik: { dph: 0.21 } }, cenikRada: 'cr' };
  cenikRadaPrepni(dataP, crData, zahrProjDph, 'zahr');
  test('přepnutí použije zahraniční sazbu DPH projekce', dataP.proj.cenik.dph === 0,
    dataP.proj.cenik.dph);
  cenikRadaPrepni(dataP, crData, zahrProjDph, 'cr');
  test('a návrat vrátí tuzemskou sazbu projekce', dataP.proj.cenik.dph === 0.21,
    dataP.proj.cenik.dph);
}

/* ---------- VÝCHOZÍ NULOVÁ SAZBA DPH V ZAHRANIČNÍ ŘADĚ (22. 9. 2026 večer) ----------
 *
 * J. V.: „sazba DPH se při přepnutí na zahraniční ceník nepřepíná na 0 %
 * … to by bylo optimální." Pole pro zahraniční sazbu (N18) je v ceníku, ale
 * zveřejněný ceník ho nemá vyplněné — a ceník se během testu nemění. Bez
 * výchozí hodnoty se tedy nic nestalo: zahraniční nabídka měla dál českou
 * sazbu. Prázdná zahraniční sazba DPH proto nově znamená NULU.
 *
 * Hlídá se celý kruh: tam (0 %), zpátky (tuzemská), ruční volba obchodníka
 * (zůstává), výslovná sazba v ceníku (má přednost) a — nejzrádnější —
 * přepočet při příštím otevření, který by jinak prázdné zakázce nulu vrátil
 * zpátky na tuzemskou sazbu. */
{
  const bezOdchylek = { ceny: {}, jenZahr: {} };
  const crData = () => ({ cenik: Object.assign(CR(), { dph: 0.12 }), proj: { cenik: { dph: 0.21 } } });

  const data = Object.assign(crData(), { cenikRada: 'cr' });
  const v = cenikRadaPrepni(data, crData(), bezOdchylek, 'zahr');
  test('bez odchylky v ceníku jde sazba DPH v zahraničí na 0 %', data.cenik.dph === 0, data.cenik.dph);
  test('i sazba DPH projekce', data.proj.cenik.dph === 0, data.proj.cenik.dph);
  test('a přepnutí to hlásí jako změnu (dialog ji vypíše)',
    v.rozdily.some(x => x.cesta === 'C.dph' && x.nova === 0), JSON.stringify(v.rozdily));
  cenikRadaPrepni(data, crData(), bezOdchylek, 'cr');
  test('návrat do tuzemska vrátí tuzemskou sazbu OCK', data.cenik.dph === 0.12, data.cenik.dph);
  test('i projekce', data.proj.cenik.dph === 0.21, data.proj.cenik.dph);

  /* Výslovná sazba v ceníku má přednost — kdo chce i v zahraničí českou
   * sazbu (nebo jinou), zapíše ji do ceníku. */
  const vyslovne = { ceny: { 'C.dph': 0.19 }, jenZahr: {} };
  const d2 = Object.assign(crData(), { cenikRada: 'cr' });
  cenikRadaPrepni(d2, crData(), vyslovne, 'zahr');
  test('výslovná zahraniční sazba v ceníku má přednost před nulou', d2.cenik.dph === 0.19, d2.cenik.dph);
  test('a na projekci, kde odchylka není, platí nula', d2.proj.cenik.dph === 0, d2.proj.cenik.dph);

  /* Ruční volba obchodníka zůstává (#177) — ať je jakákoli. */
  const d3 = Object.assign(crData(), { cenikRada: 'cr' });
  cenikRucniZnac(d3, 'C.dph');
  const v3 = cenikRadaPrepni(d3, crData(), bezOdchylek, 'zahr');
  test('ručně nastavenou sazbu výchozí nula nepřepíše', d3.cenik.dph === 0.12, d3.cenik.dph);
  test('a volající se to dozví (upozornění po přepnutí)',
    v3.chranene.some(x => x.cesta === 'C.dph'), JSON.stringify(v3.chranene));

  /* PŘEPOČET PŘI OTEVŘENÍ. Dnešní ceník pro zahraniční variantu musí nést
   * tutéž nulu — jinak by ho přepočet prázdné zakázce „srovnal" zpátky na
   * tuzemskou sazbu (u nerozdělané zakázky se zakázkové hodnoty z ceníku
   * natahují). */
  const dnesZahr = cenikDnesniProRadu(crData(), bezOdchylek, 'zahr');
  test('dnešní ceník zahraniční řady nese nulovou sazbu DPH', dnesZahr.cenik.dph === 0, dnesZahr.cenik.dph);
  test('i u projekce', dnesZahr.proj.cenik.dph === 0, dnesZahr.proj.cenik.dph);
  const dnesCr = cenikDnesniProRadu(crData(), bezOdchylek, 'cr');
  test('tuzemská řada nulu nedostane', dnesCr.cenik.dph === 0.12 && dnesCr.proj.cenik.dph === 0.21,
    [dnesCr.cenik.dph, dnesCr.proj.cenik.dph]);
  test('a složení zahraniční řady taky', cenikSlozRadu(CR(), bezOdchylek, 'zahr').dph === 0);

  /* VÝCHOZÍ NULA SE NEUKLÁDÁ: ceník (a tím otisk a verze) se nemění
   * a pojistka zveřejnění ji nevidí. */
  const z = cenikZahrOciste(bezOdchylek);
  test('výchozí nula se do odchylek ceníku nezapisuje', !('C.dph' in z.ceny) && !('PC.dph' in z.ceny), z.ceny);
  test('přepnutí nechá zdroj odchylek netknutý', !('C.dph' in bezOdchylek.ceny), bezOdchylek.ceny);
}

/* ---------- N38 (revize v22.9.9): návrat do tuzemska u položky jen pro zahraničí ----------
 *
 * Změřeno v revizi: ČR 50 000 → zahraničí 60 000 → zpátky ČR 50 000, ale
 * tuzemská řada (a tedy přepočet při otevření) má u té položky 0. Přepočet
 * pak hlásil změnu ceny, která žádná nebyla. Návrat bere hodnotu ze složené
 * tuzemské řady. */
{
  const dnes = { cenik: Object.assign(CR(), { prekladyKc: 50000 }), proj: { cenik: {} } };
  const zahr = { ceny: { 'C.prekladyKc': 60000, 'C.montazHodKc': 1000 }, jenZahr: { 'C.prekladyKc': true } };
  const data = JSON.parse(JSON.stringify(dnes)); data.cenikRada = 'cr';
  cenikRadaPrepni(data, dnes, zahr, 'zahr');
  test('(zahraniční řada má u položky zahraniční cenu)', data.cenik.prekladyKc === 60000, data.cenik.prekladyKc);
  cenikRadaPrepni(data, dnes, zahr, 'cr');
  const dnesCr = cenikDnesniProRadu(dnes, zahr, 'cr');
  test('návrat do tuzemska dá položce jen pro zahraničí tutéž nulu jako tuzemská řada (N38)',
    data.cenik.prekladyKc === dnesCr.cenik.prekladyKc && data.cenik.prekladyKc === 0,
    [data.cenik.prekladyKc, dnesCr.cenik.prekladyKc]);
  const zbyva = cenikRozdily(data, dnesCr).filter(r => !cenikPatriZakazce(r.cesta));
  test('a přepočet pak nemá co hlásit', zbyva.length === 0, zbyva.map(r => r.cesta));
  test('běžná položka se vrátí na tuzemskou cenu jako dřív',
    data.cenik.montazHodKc === dnes.cenik.montazHodKc, [data.cenik.montazHodKc, dnes.cenik.montazHodKc]);
}

/* ---------- zahraniční přirážka i pro projekci (3. 9. 2026) ----------
 * Zadání J. V.: „připrav tedy pro globální přirážku i variantu pro zahraničí."
 * Ceny projekce zahraniční řadu nemají (#181 je jen pro OCK), přirážka ano —
 * je to sledovaná cesta `PC.marze`. Pozor na past: hodnota bydlí v ceníku
 * PROJ, takže rozdíly musí dostat CELÝ datový objekt. Kdyby dostaly jen ceník
 * OCK, přepnutí na zahraničí by přirážku změnilo, ale návrat do tuzemska už
 * ne — a nabídka by zůstala na zahraniční sazbě, aniž by to bylo vidět. */
{
  const cr = CR();
  const crData = { cenik: cr, proj: { cenik: { marze: 0.55 } } };
  const zahrProj = { ceny: { 'PC.marze': 0.66 }, jenZahr: {} };

  const rozdily = cenikRadaRozdily(crData, zahrProj).filter(x => !x.vychozi);
  test('rozdíl u přirážky projekce zná obě hodnoty',
    rozdily.length === 1 && rozdily[0].cr === 0.55 && rozdily[0].zahr === 0.66,
    JSON.stringify(rozdily));

  const data = { cenik: CR(), proj: { cenik: { marze: 0.55 } }, cenikRada: 'cr' };
  cenikRadaPrepni(data, crData, zahrProj, 'zahr');
  test('přepnutí použije zahraniční přirážku projekce', data.proj.cenik.marze === 0.66,
    data.proj.cenik.marze);
  cenikRadaPrepni(data, crData, zahrProj, 'cr');
  test('a návrat vrátí tuzemskou přirážku projekce', data.proj.cenik.marze === 0.55,
    data.proj.cenik.marze);

  /* Holý ceník OCK (starší volání) nesmí spadnout. */
  test('rozdíly snesou i holý ceník OCK jako dřív',
    Array.isArray(cenikRadaRozdily(cr, ZAHR()))
    && cenikRadaRozdily(cr, ZAHR()).filter(x => !x.vychozi).length === 4);
}

/* ---------- položky, které v tuzemsku neexistují (9. 9. 2026) ----------
 * Do 9. 9. o tom rozhodovala jen značka `jenZahr` z ceníku, takže když ji
 * administrátor nezaškrtl, ukázaly se překlady i v české nabídce (hlášeno
 * J. V.). Teď je zdrojem pravdy CENIK_JEN_ZAHR a značka umí jen přidat. */
{
  const nazvy = r => r.sekce.rezie.map(x => x.origNazev || x.nazev);
  const zad = () => Object.assign(JSON.parse(JSON.stringify(DEFAULT_ZADANI)), { typSachty: 'exteriérová' });

  const bezZnacek = cenikSlozRadu(CR(), { ceny: {}, jenZahr: {} }, 'cr');
  test('CENIK_JEN_ZAHR nese překlady', CENIK_JEN_ZAHR.indexOf('C.prekladyKc') >= 0);
  test('tuzemská zakázka překlady nenabídne ani BEZ značky v ceníku',
    nazvy(vypocet(zad(), bezZnacek, JEKLY, true)).every(n => !/PŘEKLADY/.test(n)),
    nazvy(vypocet(zad(), bezZnacek, JEKLY, true)).join(' | '));

  const zahrBezZnacek = cenikSlozRadu(CR(), { ceny: { 'C.prekladyKc': 15000 }, jenZahr: {} }, 'zahr');
  test('zahraniční zakázka je má dál',
    nazvy(vypocet(zad(), zahrBezZnacek, JEKLY, true)).some(n => /PŘEKLADY/.test(n)));

  /* Cestovní náklady jsou v obou řadách — jen s jinou cenou. Kdyby se do
   * pevného seznamu dostaly omylem, česká nabídka by přišla o dopravu. */
  test('cestovní náklady v tuzemské zakázce zůstávají',
    vypocet(zad(), bezZnacek, JEKLY, true).sekce.oplasteni
      .some(x => /CESTOVNÍ/.test(x.origNazev || x.nazev)));

  /* Značka administrátora pořád funguje — přidá další položku. */
  const seZnackou = cenikSlozRadu(CR(), { ceny: {}, jenZahr: { 'C.cisteniKc': true } }, 'cr');
  test('značka „jen zahr." v ceníku dál skryje i jinou položku',
    vypocet(zad(), seZnackou, JEKLY, true).sekce.oplasteni
      .every(x => !/ČIŠTĚNÍ/.test(x.origNazev || x.nazev)));
}

/* ---------- zasklení mezi příčníky: projekce navíc (9. 9. 2026) ----------
 * Zadání J. V.: „při zasklení mezi příčníky připočítávej k základu projekce
 * 4 hodiny navíc." Hodiny se PŘIČÍTAJÍ, do zadání se nezapisují — po přepnutí
 * zpět na terče musí být řádek zase původní. */
{
  const zad = (zaskleni) => Object.assign(JSON.parse(JSON.stringify(DEFAULT_ZADANI)),
    { typSachty: 'exteriérová', zaskleni, projekceZakladHod: 50, projekceAtypHod: 0 });
  const dok = (z, c) => vypocet(z, c || CR(), JEKLY, true).sekce.rezie
    .find(x => /DÍLENSKÁ DOKUMENTACE/.test(x.origNazev || x.nazev));

  test('na terče: hodiny = zadání', dok(zad('na terče')).mnozstvi === 50);
  test('mezi příčníky: +4 hodiny z ceníku', dok(zad('mezi příčníky')).mnozstvi === 54,
    dok(zad('mezi příčníky')).mnozstvi);
  test('a řádek řekne proč', /zasklení mezi příčníky/.test(dok(zad('mezi příčníky')).pozn || ''),
    dok(zad('mezi příčníky')).pozn);
  test('zadání zůstane nedotčené (přepnutí zpět vrátí původní hodiny)',
    (() => { const z = zad('mezi příčníky'); dok(z); return z.projekceZakladHod === 50; })());

  const c8 = Object.assign(CR(), { zaskleniListyProjHod: 8 });
  test('sazba se bere z ceníku, ne z kódu', dok(zad('mezi příčníky'), c8).mnozstvi === 58);
  const cStary = CR(); delete cStary.zaskleniListyProjHod;
  test('starší ceník bez položky počítá se čtyřmi hodinami',
    dok(zad('mezi příčníky'), cStary).mnozstvi === 54);
  /* Vynulovaný ceník (ten v repozitáři) musí počítat stejně jako vyplněný —
   * jinak by se sada proti Excelu rozešla podle toho, kde běží. */
  const cNula = Object.assign(CR(), { zaskleniListyProjHod: 0 });
  test('nula v ceníku znamená totéž co prázdno (4 hodiny)',
    dok(zad('mezi příčníky'), cNula).mnozstvi === 54);
  test('atyp hodiny se přičtou k tomu',
    dok(Object.assign(zad('mezi příčníky'), { projekceAtypHod: 25 })).mnozstvi === 79);
}

/* ---------- zasklení a profily podle typu šachty (9. 9. 2026) ----------
 * Exteriérová: boky dvojsklo, čelní VSG 4.4.1 (beze změny proti dřívějšku).
 * Interiérová: obě plochy z téhož VSG — na terče 4.4.2, mezi příčníky 4.4.1. */
{
  const zad = (typ, zaskleni) => Object.assign(JSON.parse(JSON.stringify(DEFAULT_ZADANI)),
    { typSachty: typ, zaskleni });
  const opl = (z, c) => vypocet(z, c || CR(), JEKLY, true).sekce.oplasteni.map(x => x.origNazev || x.nazev);
  const cenik = CR();

  const ext = opl(zad('exteriérová', 'na terče'), cenik);
  test('exteriérová: boky dvojsklo z ceníku, čelní VSG 4.4.1',
    ext.some(n => n === 'MATERIÁL boční + zadní stěna (' + cenik.skloBokyNazev + ')')
    && ext.includes('MATERIÁL VSG 4.4.1'), ext.slice(0, 3).join(' | '));
  test('a v názvu čelního skla už není „čelní stěna"', !ext.some(n => /čelní stěna/.test(n)));

  const intTerce = opl(zad('interiérová', 'na terče'), cenik);
  test('interiérová na terče: obě plochy VSG 4.4.2',
    intTerce.includes('MATERIÁL boční + zadní stěna (VSG 4.4.2)')
    && intTerce.includes('MATERIÁL VSG 4.4.2'), intTerce.slice(0, 3).join(' | '));

  const intListy = opl(zad('interiérová', 'mezi příčníky'), cenik);
  test('interiérová mezi příčníky: obě plochy VSG 4.4.1',
    intListy.includes('MATERIÁL boční + zadní stěna (VSG 4.4.1)')
    && intListy.includes('MATERIÁL VSG 4.4.1'), intListy.slice(0, 3).join(' | '));

  /* Sazba: interiérová na terče musí počítat s cenou 4.4.2, ne 4.4.1. */
  const radek = (z, c, nazev) => vypocet(z, c, JEKLY, true).sekce.oplasteni
    .find(x => (x.origNazev || x.nazev) === nazev);
  test('interiérová na terče počítá sazbou VSG 4.4.2',
    radek(zad('interiérová', 'na terče'), cenik, 'MATERIÁL VSG 4.4.2').cena === cenik.skloVsg442Kc,
    radek(zad('interiérová', 'na terče'), cenik, 'MATERIÁL VSG 4.4.2').cena);
  /* ZMĚNA 14. 9. 2026 (nález V38). Do té doby tu stálo, že starší ceník bez
   * položky 4.4.2 počítá sazbou 4.4.1, „aby nabídka nespadla na nulu".
   * V kole 3 se ukázalo, co to stojí: položka mezi verzemi ceníku zmizela
   * a pět dní se interiérové nabídky počítaly sazbou jiného skla, než jaké
   * měly v názvu — a nikdo to nepoznal. Záložní větev je pryč; prázdná sazba
   * se projeví nulou, kterou přehlédnout nejde. Že položka nemá jak zmizet,
   * hlídá cenikDoplnKlice (test_sklo_vazba.js). */
  const bez442 = CR(); delete bez442.skloVsg442Kc;
  test('prázdná 4.4.2 se NEnahradí sazbou 4.4.1 — název a sazba drží u sebe',
    !(radek(zad('interiérová', 'na terče'), bez442, 'MATERIÁL VSG 4.4.2').cena === bez442.skloCelniKc),
    radek(zad('interiérová', 'na terče'), bez442, 'MATERIÁL VSG 4.4.2').cena);

  test('výchozí profily se liší podle typu šachty',
    PROFILY_VYCHOZI['exteriérová'].sloupek.dim === '80x80'
    && PROFILY_VYCHOZI['interiérová'].sloupek.dim === '80x40'
    && PROFILY_VYCHOZI['interiérová'].spojka.dim === '70x30');
  test('a DEFAULT_ZADANI drží exteriérovou sadu',
    JSON.stringify(DEFAULT_ZADANI.profily) === JSON.stringify(PROFILY_VYCHOZI['exteriérová']));

  /* Migrace: vyřazená položka pod starým názvem se musí přemapovat, jinak by
   * se sklo tiše vrátilo do ceny. */
  const stara = { ock: { zadani: Object.assign(zad('exteriérová', 'na terče'), {
    nepocitat: ['MATERIÁL čelní stěna (VSG 44.1 čiré)'],
    mnozstviPrepis: { 'MATERIÁL boční + zadní stěna (dvojsklo čiré Ug=2,6)': 12 } }) }, cenik: CR() };
  const zmen = skloMigraceNazvu(stara);
  test('migrace přemapuje vyřazenou položku i přepis množství', zmen === 2
    && stara.ock.zadani.nepocitat[0] === 'MATERIÁL VSG 4.4.1'
    && stara.ock.zadani.mnozstviPrepis['MATERIÁL boční + zadní stěna (' + CR().skloBokyNazev + ')'] === 12,
    JSON.stringify([zmen, stara.ock.zadani.nepocitat, Object.keys(stara.ock.zadani.mnozstviPrepis)]));
  test('a na nové zakázce nemá co dělat', skloMigraceNazvu({ ock: { zadani: zad('exteriérová', 'na terče') }, cenik: CR() }) === 0);
}

/* ---------- průchozí šachta: nástupiště A/C, patra, stříška (9. 9. 2026) ---------- */
{
  const zad = (zmeny) => Object.assign(JSON.parse(JSON.stringify(DEFAULT_ZADANI)),
    { typSachty: 'exteriérová' }, zmeny || {});
  const spocti = (z) => vypocet(z, CR(), JEKLY, true);
  const radek = (z, vzor) => spocti(z).sekce.oplasteni.find(x => vzor.test(x.origNazev || x.nazev));

  /* Neprůchozí šachta se nesmí změnit ani o korunu — nástupiště i patra
   * se dál berou z jediného pole `nastupiste`. */
  test('bez průchozí šachty platí nástupiště ze zadání',
    nastupisteCelkem(zad({ nastupiste: 6 })) === 6 && patraProVypocet(zad({ nastupiste: 6 })) === 6);
  test('u průchozí šachty je součet A + C',
    nastupisteCelkem(zad({ pruchoziSachta: true, nastupisteA: 4, nastupisteC: 2 })) === 6);
  test('a patra jsou vlastní údaj, ne nástupiště',
    patraProVypocet(zad({ pruchoziSachta: true, nastupisteA: 4, nastupisteC: 2, patra: 3 })) === 3);

  /* Výška podlaží se počítá z pater. Průchozí šachta se šesti nástupišti ve
   * třech patrech musí mít vyšší podlaží než šest pater — to je celý smysl
   * odděleného pole (postřeh J. V. 9. 9. 2026). */
  const bezne = spocti(zad({ nastupiste: 6, zdvih: 10 }));
  const pruchozi = spocti(zad({ pruchoziSachta: true, nastupisteA: 3, nastupisteC: 3, patra: 3, zdvih: 10 }));
  test('výška podlaží se u průchozí šachty počítá z pater',
    Math.abs(bezne.odvozene.vyskaPodlazi - 10 / 5) < 1e-9
    && Math.abs(pruchozi.odvozene.vyskaPodlazi - 10 / 2) < 1e-9,
    JSON.stringify([bezne.odvozene.vyskaPodlazi, pruchozi.odvozene.vyskaPodlazi]));
  test('pod dvě patra vyjde nula, ne dělení nulou ani záporné číslo',
    spocti(zad({ pruchoziSachta: true, nastupisteA: 1, nastupisteC: 0, patra: 1 })).odvozene.vyskaPodlazi === 0
    && spocti(zad({ pruchoziSachta: true, patra: 0 })).odvozene.vyskaPodlazi === 0);
  test('a výsledek zůstane číslem (žádné NaN ani nekonečno)',
    ['zakladNaklad', 'zakladCena'].every(k => isFinite(spocti(zad({ pruchoziSachta: true, patra: 0 })).souhrn[k])));

  /* Stříška: počet kusů, násobí se, platí i u interiérové šachty. */
  const c = CR();
  test('nula stříšek řádek do kalkulace vůbec nedá', !radek(zad({ striskaKs: 0 }), /STŘÍŠKA/));
  const jedna = radek(zad({ striskaKs: 1 }), /STŘÍŠKA/);
  const dve = radek(zad({ striskaKs: 2 }), /STŘÍŠKA/);
  test('jedna stříška se počítá ceníkovou sazbou', jedna && jedna.naklad === c.striskaDvurKc, jedna && jedna.naklad);
  test('dvě stříšky stojí dvojnásobek nákladu i ceny',
    dve && dve.naklad === 2 * jedna.naklad && dve.sMarzi === 2 * jedna.sMarzi,
    JSON.stringify([jedna && jedna.naklad, dve && dve.naklad]));
  test('stříška platí i u interiérové šachty',
    !!radek(zad({ typSachty: 'interiérová', striskaKs: 1 }), /STŘÍŠKA/));
  test('a řádek se jmenuje podle nástupišť, ne podle dvora',
    (jedna.origNazev || jedna.nazev) === 'STŘÍŠKA NAD NÁSTUPIŠTĚ', jedna.origNazev || jedna.nazev);
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
