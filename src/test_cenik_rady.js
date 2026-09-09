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
  test('rozdíly vypíšou všechny odchylky', rozdily.length === 4, rozdily.length);
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

  const rozdily = cenikRadaRozdily(crData, zahrProj);
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
    Array.isArray(cenikRadaRozdily(cr, ZAHR())) && cenikRadaRozdily(cr, ZAHR()).length === 4);
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
  const bez442 = CR(); delete bez442.skloVsg442Kc;
  test('starší ceník bez 4.4.2 počítá sazbou 4.4.1 (nabídka nespadne na nulu)',
    radek(zad('interiérová', 'na terče'), bez442, 'MATERIÁL VSG 4.4.2').cena === bez442.skloCelniKc);

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

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
