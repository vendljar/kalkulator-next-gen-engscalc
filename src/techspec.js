/* ============================================================
 * TECHNICKÁ SPECIFIKACE – datový model záložky
 * Zdroj: Technická specifikacevzor.xlsx (list CHECKLIST SMLOUVA + číselníky _data)
 * Pole s prefill() se předvyplňují živě z kalkulace OCK; ruční hodnota
 * (override) má vždy přednost. ciselnik = položky rozbalovacích seznamů
 * z listů _data, vlastní text je vždy povolen.
 * ============================================================ */

const TS_C = { /* číselníky z listů _data (bez úvodní pomlčky) */
  umisteniSachty: ['v interiéru', 'v interiéru - v zrcadle schodiště', 'v interiéru - v ATRIU domu',
    'v exteriéru', 'v exteriéru, přisazena k fasádě', 'v exteriéru, přisazena k fasádě, umístěna na podchozí nosné OCK',
    'v exteriéru, přisazena k fasádě přes nástupní můstky',
    'v exteriéru, přisazena k fasádě přes nástupní můstky + podchozí nosná OCK'],
  umisteniStroje: ['v původní strojovně nad šachtou', 'v horní části OCK výtahové šachty (bezstrojovnový výtah)',
    'v prohlubni výtahové šachty (bezstrojovnový výtah)', 'v samostatné části vedle výtahové šachty',
    'hydraulický agregát v samostatné místnosti mimo šachtu'],
  ulozeniKonstrukce: ['na dně prohlubně výtahové šachty', 'na zpevněné hraně stěn prohlubně výtahové šachty',
    'na zpevněné hraně stěn spodní části výtahové šachty', 'na nosné základové desce',
    'na nosné základové desce v úrovni dvora', 'na nosné základové desce nad úrovní dvora'],
  pudorys: ['pravoúhlý tvar', 'pravoúhlý tvar, zkosené zadní rohy konstrukce', 'lichoběžník',
    'šestiúhelník', 'osmiúhelník', 'nepravidelný tvar (viz nákres)', 'kruhový tvar'],
  pruchoziKabina: ['neprůchozí kabina', 'průchozí kabina', 'diagonálně průchozí kabina', 'kabina se třemi vstupy'],
  usazeniCelni: ['přisazena k podestám (dle odchylky podest od svislice)',
    'přisazena k fasádě (dle odchylky podest od svislice)', 's nástupními můstky ve všech nadzemních nástupištích',
    'přisazena k podestám, v některých nástupištích přes můstky',
    'přisazena k fasádě, v nejvyšším nástupišti přes můstek', 'přisazena k fasádě (bez opláštění)',
    'dveřní vstup ze dvora (diagonálně průchozí kabina)'],
  usazeniBocni: ['mezera max. 5 cm', 'mezera 5-10 cm', 'vycentrováno do prostoru zrcadla schodiště',
    'dveřní vstup ze dvora (diagonálně průchozí kabina)', 'přisazena k fasádě (bez opláštění)',
    'přisazena k podestám (dle odchylky podest od svislice)'],
  usazeniZadni: ['dveřní vstup ze dvora (průchozí kabina)', 'nástupní můstky u protilehlých nástupišť',
    'průběžná, vedle schodiště/podest', 'průběžná, vedle podest, k jedné podestě nástupní můstek',
    'přisazena k fasádě (bez opláštění)'],
  typKonstrukce: ['montovaná, průběžná', 'svařovaná'],
  svisleNosne: ['4x rohový sloupek, ocelový uzavřený profil',
    '4x rohový sloupek + 2x sloupek v bočních stěnách, ocelové uzavřené profily',
    '4x rohový sloupek + 1x sloupek v zadní stěně, ocelové uzavřené profily',
    '6x sloupek ve vrcholech 6-ti úhelníkového půdorysu', '8x sloupek ve vrcholech 8-mi úhelníkového půdorysu'],
  vodorovneNosne: ['příčníky z ocelových uzavřených profilů'],
  profily: ['jekl 80x40', 'jekl 80x50', 'jekl 80x60', 'jekl 80x80', 'jekl 100x60', 'jekl 100x80', 'jekl 100x100'],
  roztec: ['cca 1000 mm', 'cca 1250 mm', '1250-1500 mm', 'max 1500 mm', 'rovnoměrné rozdělení dle podlaží', 'individuální řešení'],
  kotveniPoloha: ['prohlubeň, podesty ve všech nástupištích a hlava šachty',
    'prohlubeň, všechny podesty, hlava šachty a sloupky zadní stěny do schodnic'],
  kotveniTyp: ['kontaktní, přes chemické kotvy do zdiva', 'kontaktní, hmoždiny do ŽB konstrukcí',
    'kontaktní, přivařením k ocelovým nosníkům', 'kontaktní, přes antivibrační podložky'],
  portalyProstor: ['bez předsazených portálů', 'portál mezi sloupky šachty (nepředsazený na podestu)',
    'předsazený portál', 'stávající zděný portál'],
  portalyCleneni: ['řeší stavba', 'bez světlíků', 'světlík nade dveřmi', 'světlík nade dveřmi a na jedné straně š. dveří',
    'světlík nade dveřmi a na obou stranách š. dveří', 'světlík na jedné straně š. dveří',
    'světlík na obou stranách š. dveří', 'prosklení nade dveřmi a jedné straně vedle dveří',
    'prosklení nade dveřmi a obou stranách vedle dveří'],
  povrchovaUprava: ['lesklý ochranný lak v barvě RAL dle výběru objednatele',
    'matný ochranný lak v barvě RAL dle výběru objednatele', 'lesklý ochranný lak, odstín RAL 7016',
    'matný ochranný lak, odstín RAL 7016', 'ochranný vypalovaný lak, odstín RAL 7016'],
  haky: ['nejsou součástí konstrukce', '3 ks závěsných ok pro výškové práce', '6 ks závěsných ok pro výškové práce'],
  strecha: ['plochá pultová střecha se sklonem na dvůr, RAL 3011', 'plochá pultová střecha se sklonem na budovu, RAL 3011',
    'bez zastřešení (OCK končí pod stropem)', 'vodorovné zakrytí horního rámu plechem v barvě OCK',
    'plech v barvě shodné s nátěrem celé OCK',
    'plochá pultová střecha se sklonem na dvůr přetažená i přes nástupní můstek až k fasádě budovy, žlab není uvažován'],
  pozarni: ['materiály DP1, opláštění bez deklarované požární odolnosti',
    'materiály DP1, opláštění s deklarovanou požární odolností EW',
    'materiály DP1, opláštění s deklarovanou požární odolností EI', 'materiály DP1'],
  typOplasteni: ['plnostěnné', 'bez opláštění', 'řeší objednatel'],
  materialOplasteni: ['bez opláštění', 'sádrovláknité desky', 'cementotřískové desky', 'vrstvené bezpečnostní sklo VSG',
    'vrstvené bezpečnostní sklo VSG (v souladu i s ČSN 74 3305)', 'cementotřískové desky včetně zateplení',
    'izolační dvojsklo v kombinaci s vrstveným bezpečnostním sklem VSG',
    'vrstvené bezp. sklo ESG (kalené) s vrtanými otvory'],
  povrchOplasteni: ['čiré sklo', 'mléčné sklo', 'čiré sklo - hrany strojově broušeny',
    'mléčné sklo - hrany skel strojově broušeny', 'protisluneční sklo Cool Lite, Ug=1,1 W/m2.K',
    'standardní čirá skla, Ug=2,6 W/m2.K', 'reflexní vrstva pro omezení přehřívání interiéru šachty vlivem slunečního svitu',
    'minerální izolace, VPC omítka + fasádní barva', 'tmelené a broušené styky desek, bílý nátěr aplikovaný na stavbě'],
  oplasteniCela: ['bez opláštění', 'plech v celé ploše podesty', 'plechové lišty na bocích podest', 'dokončení provede stavba'],
  oplasteniPortalu: ['stejné jako šachta', 'bez opláštění, komplet dozdí stavba', 'cementotřískové desky',
    'sádrovláknité desky', 'vrstvené bezpečnostní sklo VSG vsazené do rámečků', 'vrstvené bezpečnostní sklo VSG',
    'izolační dvojskla vsazená do lakovaných rámečků', 'bez opláštění'],
  oplasteniNadsvetliku: ['izolační dvojskla vsazená do lakovaných rámečků', 'vrstvené bezpečnostní sklo VSG vsazené do rámečků'],
  umisteniOplasteni: ['vložené mezi ocelové profily konstrukce', 'kotvené na vnější stranu ocelové konstrukce',
    'předsazené před ocelovou konstrukci o cca 30 mm'],
  kotveniOplasteni: ['do L profilů mezi příčníky', 'na zasklívací terče', 'do rámečku z plechových lišt',
    'kotvy do otvorů vrtaných ve skle'],
  parametryKotvy: ['nerezové držáky do otvorů ve skle', 'obdélníkový terč 80x50, lakovaný RAL 7016, zapuštěné pozink šrouby',
    'obdélníkový terč 80x50, nerezový, zapuštěné pozink šrouby', 'kruhový terč průměr 70 mm, lakovaný, zapuštěný pozink šroub',
    'kruhový terč průměr 70 mm, nerezový, zapuštěný šroub', 'lakované lišty po obvodu skla', 'nerezové lišty po obvodu skla'],
  napojeniDveri: ['provede kompletně stavba po montáži šachetních dveří', 'bez dokrytí', 'řeší objednatel',
    'dokrytí lakovaným plechem', 'dokrytí nerezovým plechem'],
  /* Čtyři varianty názvu akce místo jedné věty s lomítkem (nález D3,
   * 15. 9. 2026). Přístavba = šachta přistavěná k domu, vestavba = vsazená
   * dovnitř; prosklená = kompletní zasklení, s opláštěním = plné plochy.
   * Všechny čtyři musí být v preklad.js, jinak zůstanou v EN/DE česky. */
  nazevAkce: ['přístavba nové prosklené OCK výtahové šachty',
    'vestavba nové prosklené OCK výtahové šachty',
    'přístavba nové OCK výtahové šachty včetně opláštění',
    'vestavba nové OCK výtahové šachty včetně opláštění'],
  anoNe: ['ano', 'ne'],
  dodavkaPozn: ['bezúplatně zajistí objednatel', 'bezúplatně zajistí majitel objektu', 'není řešeno',
    'není požadováno', 'není součástí nabídky', 'zajistí objednatel v rámci SP', 'zajistí objednatel',
    'lze doplnit - viz „Příplatky“', 'není součástí dodávky, zajistí objednatel',
    'není součást dodávky, lze doplnit viz příplatkové ceny', 'je součástí dodávky',
    'lze doplnit – viz příplatkové ceny'],
  stavebniPrace: ['není součástí dodávky, zajistí objednatel', 'je součástí dodávky',
    'není součást dodávky, zajistí objednatel před montáží šachty', 'viz příplatky',
    'není součást dodávky, lze doplnit viz příplatkové ceny', 'lze doplnit – viz příplatkové ceny',
    'je součástí dodávky pouze po dobu stavby šachty',
    'je součástí dodávky pro stavbu šachty i montáž výtahu', 'je součástí dodávky na celou dobu stavby',
    'je součástí dodávky pro dokončení opláštění v horním přejezdu',
    'je součástí dodávky pro provedení kompletního opláštění šachty', 'zůstane zachováno'],
};

/* Pomocné formátování čísel pro prefill */
const tsNum = (n, d = 0) => (+n).toLocaleString('cs-CZ', { maximumFractionDigits: d });

/* DVOJSKLO MÁ JEN EXTERIÉROVÁ ŠACHTA (nález C3 z testování obchodníkem,
 * 15. 9. 2026).
 *
 * Do 15. 9. měla čtyři pole opláštění pevné `def:` psané pro exteriérovou
 * šachtu: MATERIÁL OPLÁŠTĚNÍ hlásil „izolační dvojsklo v kombinaci s VSG",
 * povrch „standardní dvojsklo" a nadsvětlíky „izolační dvojskla". U INTERIÉROVÉ
 * šachty přitom jádro počítá VSG na všech plochách (skloVolba, rozhodnutí
 * J. V. z 9. 9. 2026) — dvojsklo se v ní nevyskytuje vůbec. Technická
 * specifikace tedy slibovala zákazníkovi dražší zasklení, než jaké bylo
 * v ceně, a obchodník to opravoval ručně u každé interiérové nabídky.
 * Z databáze: 12 interiérových variant, u 10 z nich text opravený nebyl.
 *
 * Pevná hodnota se nemá jak zeptat na zadání — proto `prefill`. Podmínka je
 * schválně TÁŽ jako v `skloVolba()` (`typSachty !== 'interiérová'`), aby se
 * text řídil tím, co se opravdu počítá; kdyby se pravidlo v jádře změnilo
 * (viz otevřený nález V42), text ho má následovat sám. Svázanost obojího
 * hlídá test_techspec_sklo.js — ten se ptá přímo `skloVolba()`, ne téhle
 * konstanty, takže rozejít se to nemůže potichu.
 *
 * Ruční hodnota má pořád přednost (tsHodnota se ptá na ts.hodnoty[id] první),
 * takže zakázkám, kde obchodník text už opravil, se nic nezmění. */
function tsDvojsklo(Z) { return (Z || {}).typSachty !== 'interiérová'; }

/* ROZSAH OPLÁŠTĚNÍ PŘI REŽIMU PO STĚNÁCH (#268, 3. krok, 21. 9. 2026).
 *
 * Ve standardním režimu je opláštění jednotné a věta „kompletní opláštění
 * šachty" ho popisuje přesně. Jakmile se ale plášť rozdělí po stěnách,
 * přestane to být pravda — a technická specifikace je dokument, který
 * zákazník dostane. Mlčet o tom, že jedna stěna je z Cetrisu a druhou dodá
 * stavba, by znamenalo poslat mu popis jiné šachty, než jakou kupuje.
 *
 * Věta se jen PŘEDVYPLNÍ: obchodník ji může přepsat jako každé jiné pole
 * specifikace. Dělicí výšky se uvádějí tak, jak je zadal — nezaokrouhlují se
 * (rozhodnutí J. V. u dodatku 3).
 *
 * Názvy typů se berou z OPLASTENI_TYPY, aby se popis nerozešel s číselníkem
 * v zadání. Když jádro po ruce není (Node test jen nad techspec.js), vypíše
 * se aspoň klíč — nikdy se nevymýšlí. */
/* PÁSY PODLE JÁDRA, NE SYROVĚ (23. 9. 2026, nález N41b z revize v22.9.9).
 * Dostane-li funkce i výsledek výpočtu `r`, vypisuje jen pásy, které jádro
 * opravdu započítalo (`r.oplasteni.pasy`). Syrový výpis zadání uváděl
 * i pás, který se do ceny nedostal — dělicí výšku nad horní hranou
 * prosklení nebo neklesající výšky — a zákazník ho viděl ve specifikaci,
 * ačkoli ho nikdo nenaceňoval. Poslední započítaný pás je „výš“. */
/* Výplň nad dveřmi a vedle nich (N58, N58b) — jak ji vidí specifikace.
 * Jádro má tutéž volbu v nadDvermiVypln / bokyVypln; techspec.js se ale
 * načítá i bez jádra (testy, server), proto záložní převod starého
 * zaškrtávátka přímo tady — stejné pravidlo: zaškrtnutý = sklo. */
/* Počet můstků a nástupišť pro specifikaci (P7). Jádro má mustkyPocet
 * a nastupisteCelkem; techspec.js se načítá i bez jádra, proto záloha. */
function tsMustky(Z) {
  if (typeof mustkyPocet === 'function') return mustkyPocet(Z || {});
  const n = Z && Z.mustkyKs;
  if (n !== undefined && n !== null && n !== '' && isFinite(+n)) return Math.max(0, Math.floor(+n));
  return (Z && Z.mustek) ? 1 : 0;
}
function tsNastupiste(Z) {
  if (typeof nastupisteCelkem === 'function') return nastupisteCelkem(Z || {});
  return +(Z && Z.nastupiste) || 0;
}

function tsVyplnDveri(Z) {
  const z = Z || {};
  const nad = (typeof nadDvermiVypln === 'function') ? nadDvermiVypln(z)
    : (['bez', 'sklo', 'plech', 'material', 'stavba'].indexOf(z.nadDvermi) >= 0 ? z.nadDvermi
       : (z.svetlikNadDvermi ? 'sklo' : 'bez'));
  const bokyVypln_ = (typeof bokyVypln === 'function') ? bokyVypln(z)
    : (['sklo', 'plech', 'material', 'stavba'].indexOf(z.bokyVypln) >= 0 ? z.bokyVypln : 'sklo');
  const boky = +z.svetlikyBoky || 0;
  const poStenach = !!(z.oplasteni && z.oplasteni.rezim === 'poStenach');
  /* „Materiál opláštění" je ve standardu sklo stěny — tedy světlík. */
  const sklo = v => v === 'sklo' || (v === 'material' && !poStenach);
  return { nad, boky, bokyVypln: bokyVypln_, poStenach,
           skloNad: sklo(nad), skloBoky: boky > 0 && sklo(bokyVypln_) };
}
function tsVyplnDveriCasti(Z) {
  const v = tsVyplnDveri(Z);
  const strana = v.boky === 2 ? 'na obou stranách' : 'na jedné straně';
  if (v.skloNad && v.skloBoky) return ['světlík nade dveřmi a ' + strana + ' š. dveří'];
  const casti = [];
  if (v.skloNad) casti.push('světlík nade dveřmi');
  else if (v.nad === 'plech') casti.push('plechové nadpraží nade dveřmi');
  else if (v.nad === 'material') casti.push('nadpraží z materiálu opláštění stěny');
  else if (v.nad === 'stavba') casti.push('nadpraží nade dveřmi zajistí objednatel');
  if (v.boky > 0) {
    if (v.skloBoky) casti.push('světlík ' + strana + ' š. dveří');
    else if (v.bokyVypln === 'plech') casti.push('plechová výplň ' + strana + ' dveří');
    else if (v.bokyVypln === 'material') casti.push('výplň vedle dveří z materiálu opláštění stěny');
    else if (v.bokyVypln === 'stavba') casti.push('výplň vedle dveří zajistí objednatel');
  }
  return casti.length ? casti : ['bez světlíků'];
}

function tsOplasteniRozsah(Z, jazyk, r) {
  const z = Z || {};
  const o = z.oplasteni || {};
  /* Kusy věty se překládají jednotlivě — celou složenou větu by slovník
   * nikdy netrefil. Bez jazyka (nebo v češtině) vrací `tr` originál, takže
   * česká cesta zůstává přesně taková, jaká byla. */
  const T = (s) => (jazyk && jazyk !== 'cz' && typeof tr === 'function') ? tr(s, jazyk) : s;
  if (o.rezim !== 'poStenach' || !o.steny) return T('kompletní opláštění šachty');
  const nazvy = (typeof OPLASTENI_TYPY !== 'undefined') ? OPLASTENI_TYPY : [];
  const jmeno = (p) => {
    if (p.typ === 'jine') return (p.nazev || T('jiné opláštění'));
    const d = nazvy.find(t => t.id === p.typ);
    /* Název se NEPŘEVÁDÍ na malá písmena: „Sklo VSG 4.4.1" by z toho vyšlo
     * jako „sklo vsg 4.4.1" a zkratka by přestala být zkratkou.
     * Ruční název u typu „jiné" napsal obchodník — ten se nepřekládá, protože
     * ho slovník nezná a vymýšlet si cizojazyčný název materiálu nesmíme. */
    return d ? T(d.nazev) : String(p.typ);
  };
  const cislo = (x) => (typeof formatCislo === 'function')
    ? formatCislo(x) : String(Math.round((+x || 0) * 100) / 100).replace('.', ',');
  const klice = (typeof OPLASTENI_STENY !== 'undefined') ? OPLASTENI_STENY : ['A', 'B', 'C', 'D'];
  const casti = [];
  klice.forEach(k => {
    const st = o.steny[k];
    if (!st || !Array.isArray(st.pasy) || !st.pasy.length) return;
    const odM = +st.odM || 0;
    const spoctene = (r && r.oplasteni && r.oplasteni.rezim === 'poStenach' && Array.isArray(r.oplasteni.pasy))
      ? r.oplasteni.pasy.filter(p => p.stena === k) : null;
    const zdroj = spoctene || st.pasy;
    if (!zdroj.length) return;       // stěna bez plochy — ve výpočtu nic nemá
    const pasy = zdroj.map((p, i) => {
      const posledni = (i === zdroj.length - 1);
      if (zdroj.length === 1) return jmeno(p);
      return posledni ? jmeno(p) + ' ' + T('výš')
        : jmeno(p) + ' ' + T('do výšky') + ' ' + cislo(p.doM) + ' m';
    });
    casti.push(T('stěna') + ' ' + k + ': ' + pasy.join(', ')
      + (odM < 0 ? ' (' + T('od výšky') + ' ' + cislo(odM) + ' m, ' + T('tedy do prohlubně') + ')' : ''));
  });
  if (!casti.length) return T('kompletní opláštění šachty');
  return T('opláštění po stěnách') + ' — ' + casti.join('; ');
}

/* Definice dokumentu: sekce → pole. prefill(r, Z, C) vrací text z kalkulace OCK
 * (r = výsledek vypocet(), Z = zadání, C = ceník); bez prefill je výchozí def. */
const TECHSPEC_DEF = [
  { sekce: 'ZÁKLADNÍ PARAMETRY ŠACHTY', pole: [
    { id: 'umisteni', label: 'UMÍSTĚNÍ ŠACHTY', ciselnik: TS_C.umisteniSachty,
      prefill: (r, Z) => Z.typSachty === 'exteriérová' ? 'v exteriéru' : 'v interiéru' },
    { id: 'umisteniStroje', label: 'UMÍSTĚNÍ VÝTAHOVÉHO STROJE', ciselnik: TS_C.umisteniStroje,
      def: 'v horní části OCK výtahové šachty (bezstrojovnový výtah)' },
    { id: 'ulozeni', label: 'ULOŽENÍ KONSTRUKCE', ciselnik: TS_C.ulozeniKonstrukce,
      def: 'na dně prohlubně výtahové šachty' },
    { id: 'vyskaCelkova', label: 'CELKOVÁ VÝŠKA KONSTRUKCE [m] *',
      prefill: r => tsNum(r.odvozene.vyskaSachty, 3) },
    { id: 'rozmerVnitrni', label: 'ROZMĚR ŠACHTY – VNITŘNÍ [mm] *',
      prefill: (r, Z) => `šířka ${tsNum(Z.sirka * 1000)} × hloubka ${tsNum(Z.hloubka * 1000)}` },
    { id: 'rozmerVnejsi', label: 'ROZMĚR ŠACHTY – VNĚJŠÍ [mm] *', def: ' -' },
    { id: 'zdvih', label: 'ZDVIH VÝTAHU [m] *', prefill: (r, Z) => tsNum(Z.zdvih, 3) },
    { id: 'dolniPrejezd', label: 'DOLNÍ PŘEJEZD [mm]', prefill: (r, Z) => tsNum(Z.prohluben * 1000) },
    { id: 'horniPrejezd', label: 'HORNÍ PŘEJEZD [mm]', prefill: (r, Z) => tsNum(Z.prejezd * 1000) },
    { id: 'stanice', label: 'POČET STANIC / NÁSTUPIŠŤ',
      prefill: (r, Z) => {
        const celkem = (typeof nastupisteCelkem === 'function') ? nastupisteCelkem(Z) : Z.nastupiste;
        const stanic = (typeof patraProVypocet === 'function') ? patraProVypocet(Z) : Z.nastupiste;
        return `${stanic} / ${celkem}`;
      } },
    /* Rozpad nástupišť na čelní a zadní stěnu (9. 9. 2026, zadání J. V.:
     * „vzhledem k následným pracem a detailnějšímu rozpracování v realizační
     * fázi může být toto důležitá informace, kterou budeme potřebovat předávat
     * dále"). U neprůchozí šachty nemá co říct, proto pomlčka. */
    { id: 'nastupisteAC', label: 'POČET NÁSTUPIŠŤ A / C',
      prefill: (r, Z) => (Z.pruchoziSachta
        ? `${+Z.nastupisteA || 0} / ${+Z.nastupisteC || 0}` : ' -') },
    { id: 'kabina', label: 'PRŮCHOZÍ KABINA', ciselnik: TS_C.pruchoziKabina,
      prefill: (r, Z) => Z.pruchoziSachta ? 'průchozí kabina' : 'neprůchozí kabina' },
    { id: 'pudorys', label: 'PŮDORYSNÉ ŘEŠENÍ ŠACHTY', ciselnik: TS_C.pudorys, def: 'pravoúhlý tvar' },
    /* S můstky (P7 / K13-N59, 25. 9. 2026) se usazení čelní stěny řídí jejich
     * počtem: v každém nadzemním nástupišti = „s nástupními můstky…" z číselníku,
     * jinak věta s počtem. Bez můstků beze změny. */
    { id: 'usazeniCelni', label: 'USAZENÍ OCK – ČELNÍ STĚNA', ciselnik: TS_C.usazeniCelni,
      prefill: (r, Z) => {
        const ext = Z.typSachty === 'exteriérová';
        const n = tsMustky(Z), nast = tsNastupiste(Z);
        const k = ext ? 'přisazena k fasádě' : 'přisazena k podestám';
        if (!n) return k + ' (dle odchylky podest od svislice)';
        if (nast > 1 && n >= nast - 1) return 's nástupními můstky ve všech nadzemních nástupištích';
        return n === 1 ? k + ', v jednom nástupišti přes můstek' : k + ', v ' + n + ' nástupištích přes můstky';
      } },
    { id: 'usazeniBocni', label: 'USAZENÍ OCK – BOČNÍ STĚNY', ciselnik: TS_C.usazeniBocni, def: ' -' },
    { id: 'usazeniLeva', label: 'USAZENÍ OCK – LEVÁ BOČNÍ STĚNA', ciselnik: TS_C.usazeniBocni, def: ' -' },
    { id: 'usazeniPrava', label: 'USAZENÍ OCK – PRAVÁ BOČNÍ STĚNA', ciselnik: TS_C.usazeniBocni, def: ' -' },
    { id: 'usazeniZadni', label: 'USAZENÍ OCK – ZADNÍ STĚNA', ciselnik: TS_C.usazeniZadni, def: ' -' },
  ], pozn: '* Uvažované rozměry nabízené šachty vychází ze zadání objednatele. Po přesném zaměření skutečného stavu zhotovitelem se mohou změnit!' },

  { sekce: 'KONSTRUKČNÍ ŘEŠENÍ ŠACHTY', pole: [
    { id: 'typKonstrukce', label: 'TYP KONSTRUKCE (ENG-M)', ciselnik: TS_C.typKonstrukce, def: 'montovaná, průběžná' },
    { id: 'svisleNosne', label: 'SVISLÉ NOSNÉ PRVKY', ciselnik: TS_C.svisleNosne,
      prefill: (r, Z) => Z.rohoveSloupky <= 4 ? '4x rohový sloupek, ocelový uzavřený profil'
        : `${Z.rohoveSloupky}x sloupek, ocelové uzavřené profily` },
    { id: 'profilSloupku', label: 'PROFIL SLOUPKŮ **', ciselnik: TS_C.profily,
      prefill: (r, Z) => `jekl ${Z.profily.sloupek.dim}` },
    { id: 'vodorovneNosne', label: 'VODOROVNÉ NOSNÉ PRVKY', ciselnik: TS_C.vodorovneNosne,
      def: 'příčníky z ocelových uzavřených profilů' },
    { id: 'roztecPricniku', label: 'SVISLÁ ROZTEČ PŘÍČNÍKŮ', ciselnik: TS_C.roztec,
      prefill: (r, Z) => `cca ${tsNum(Z.roztec * 1000)} mm` },
    { id: 'profilPricniku', label: 'PROFIL PŘÍČNÍKŮ **', ciselnik: TS_C.profily,
      prefill: (r, Z) => `jekl ${Z.profily.precnikBok.dim}` },
    { id: 'kotveniPoloha', label: 'KOTVENÍ KONSTRUKCE (POLOHA)', ciselnik: TS_C.kotveniPoloha,
      def: 'prohlubeň, podesty ve všech nástupištích a hlava šachty' },
    { id: 'kotveniTyp', label: 'KOTVENÍ KONSTRUKCE (TYP)', ciselnik: TS_C.kotveniTyp,
      def: 'kontaktní, přes chemické kotvy do zdiva' },
    { id: 'portalyProstor', label: 'ŘEŠENÍ PORTÁLŮ (PROSTOROVÉ)', ciselnik: TS_C.portalyProstor,
      prefill: (r, Z) => Z.typPortalu === 'zapuštěný' ? 'bez předsazených portálů' : 'předsazený portál' },
    /* Členění portálu podle výplně nad dveřmi a vedle nich (N58, N58b).
     * Skleněné kombinace nesou dosavadní znění (slovník je zná); ostatní
     * volby se skládají z částí, proto `jazykSam` — každá část se přeloží
     * zvlášť a složená věta už slovníkem znovu nejde. */
    { id: 'portalyCleneni', label: 'ŘEŠENÍ PORTÁLŮ (ČLENĚNÍ)', ciselnik: TS_C.portalyCleneni, jazykSam: true,
      prefill: (r, Z, C, jazyk) => {
        const T = (t) => (jazyk && jazyk !== 'cz' && typeof tr === 'function') ? tr(t, jazyk) : t;
        const casti = tsVyplnDveriCasti(Z);
        return casti.map(T).join(', ');
      } },
    { id: 'povrchovaUprava', label: 'POVRCHOVÁ ÚPRAVA KONSTRUKCE', ciselnik: TS_C.povrchovaUprava,
      def: 'matný ochranný lak, odstín RAL 7016' },
    { id: 'haky', label: 'HÁKY PRO ČIŠTĚNÍ ŠACHTY', ciselnik: TS_C.haky,
      prefill: (r, Z) => Z.typSachty === 'exteriérová' && Z.volitelne.haky
        ? '3 ks závěsných ok pro výškové práce' : 'nejsou součástí konstrukce' },
    { id: 'strecha', label: 'STŘECHA ŠACHTY', ciselnik: TS_C.strecha,
      prefill: (r, Z) => {
        if (Z.typSachty !== 'exteriérová') return 'bez zastřešení (OCK končí pod stropem)';
        if (tsRadekVCene(r, 'hrubaOck', 'C.zastreseniM2Kc') === false) return 'není součástí nabídky';   // N48
        /* Můstek v každém nadzemním nástupišti = i v nejvyšším, střecha se
         * přes něj přetahuje k fasádě (číselník). Při menším počtu se neví,
         * kde můstky jsou, a střecha zůstává standardní. */
        const n = tsMustky(Z), nast = tsNastupiste(Z);
        return (n && nast > 1 && n >= nast - 1)
          ? 'plochá pultová střecha se sklonem na dvůr přetažená i přes nástupní můstek až k fasádě budovy, žlab není uvažován'
          : 'plochá pultová střecha se sklonem na dvůr, RAL 3011';
      } },
    { id: 'pozarni', label: 'POŽÁRNÍ KLASIFIKACE KONSTRUKCE', ciselnik: TS_C.pozarni,
      def: 'materiály DP1, opláštění bez deklarované požární odolnosti' },
  ], pozn: '** parametry profilů se mohou změnit po zpracování statického posouzení' },

  { sekce: 'OPLÁŠTĚNÍ ŠACHTY', pole: [
    { id: 'typOplasteni', label: 'TYP OPLÁŠTĚNÍ', ciselnik: TS_C.typOplasteni, def: 'plnostěnné' },
    { id: 'materialOplasteni', label: 'MATERIÁL OPLÁŠTĚNÍ', ciselnik: TS_C.materialOplasteni,
      prefill: (r, Z) => tsDvojsklo(Z)
        ? 'izolační dvojsklo v kombinaci s vrstveným bezpečnostním sklem VSG'
        : 'vrstvené bezpečnostní sklo VSG' },
    /* Povrch se u exteriéru bere z názvu ceníkové položky pro boky — a to je
     * právě ta položka, ze které se u exteriéru počítá. U interiéru se z ní
     * nepočítá nic, takže by její název popisoval sklo, které v nabídce není. */
    { id: 'povrchOplasteni', label: 'POVRCHOVÁ ÚPRAVA OPLÁŠTĚNÍ', ciselnik: TS_C.povrchOplasteni,
      prefill: (r, Z, C) => tsDvojsklo(Z)
        ? `standardní ${C.skloBokyNazev || 'čirá skla'}`
        : 'čiré sklo' },
    { id: 'oplasteniCela', label: 'OPLÁŠTĚNÍ ČELA POD NÁSTUPIŠTĚM', ciselnik: TS_C.oplasteniCela,
      def: 'plech v celé ploše podesty' },
    /* `jazykSam`: větu skládá prefill rovnou v cílovém jazyce — viz tsHodnota. */
    { id: 'rozsahOplasteni', label: 'ROZSAH OPLÁŠTĚNÍ', def: 'kompletní opláštění šachty',
      jazykSam: true, prefill: (r, Z, C, jazyk) => tsOplasteniRozsah(Z, jazyk, r) },
    { id: 'oplasteniPortalu', label: 'OPLÁŠTĚNÍ PORTÁLŮ NÁSTUPIŠŤ', ciselnik: TS_C.oplasteniPortalu, def: ' -' },
    { id: 'oplasteniNadsvetliku', label: 'OPLÁŠTĚNÍ NADSVĚTLÍKŮ', ciselnik: TS_C.oplasteniNadsvetliku,
      prefill: (r, Z) => {
        const v = tsVyplnDveri(Z);
        if (v.skloNad || v.skloBoky)
          return tsDvojsklo(Z) ? 'izolační dvojskla vsazená do lakovaných rámečků'
                               : 'vrstvené bezpečnostní sklo VSG vsazené do rámečků';
        if (v.nad === 'plech' || (v.boky && v.bokyVypln === 'plech')) return 'lakovaný ocelový plech';   // N58
        return ' -';
      } },
    /* Umístění se řídí ZPŮSOBEM ZASKLENÍ, ne typem šachty — stejným polem jako
     * ZPŮSOB KOTVENÍ o řádek níž. Sklo na terče se kotví zvenku, sklo mezi
     * příčníky leží v profilech; pevné „kotvené na vnější stranu" tvrdilo
     * u lištového zasklení opak (ruční oprava obchodníka 10. 9. 2026). */
    { id: 'umisteniOplasteni', label: 'VNĚJŠÍ OPLÁŠTĚNÍ ŠACHTY', ciselnik: TS_C.umisteniOplasteni,
      prefill: (r, Z) => Z.zaskleni === 'na terče'
        ? 'kotvené na vnější stranu ocelové konstrukce'
        : 'vložené mezi ocelové profily konstrukce' },
    { id: 'kotveniOplasteni', label: 'ZPŮSOB KOTVENÍ OPLÁŠTĚNÍ', ciselnik: TS_C.kotveniOplasteni,
      prefill: (r, Z) => Z.zaskleni === 'na terče' ? 'na zasklívací terče' : 'do L profilů mezi příčníky' },
    { id: 'parametryKotvy', label: 'VZHLED KOTVENÍ ZASKLENÍ', ciselnik: TS_C.parametryKotvy,
      prefill: (r, Z) => Z.zaskleni === 'na terče'
        ? 'obdélníkový terč 80x50, lakovaný RAL 7016, zapuštěné pozink šrouby' : 'lakované lišty po obvodu skla' },
    { id: 'napojeniDveri', label: 'NAPOJENÍ ŠACHETNÍCH DVEŘÍ', ciselnik: TS_C.napojeniDveri,
      def: 'dokrytí lakovaným plechem' },
  ] },

  { sekce: 'DOPLŇKOVÉ KONSTRUKCE', pole: [
    { id: 'montazniNosnik', label: 'MONTÁŽNÍ NOSNÍK NEBO OKA',
      prefill: (r) => tsRadekVCene(r, 'hrubaOck', 'C.montazniNosnik') === false
        ? 'není součástí nabídky' : 'na horním nosném rámu OCK' },   // N48
    { id: 'pripravaKotveni', label: 'PŘÍPRAVA PRO KOTVENÍ VÝTAHU',
      def: 'ano, oválné otvory pro kotvení konzolí vodítek a šachetních dveří v příčnících OCK včetně dodávky T šroubů M12 s podložkou' },
    { id: 'prosklenaPricka', label: 'PROSKLENÁ PŘÍČKA VEDLE ŠACHTY', def: ' -' },
    { id: 'odvetrani', label: 'ODVĚTRÁNÍ ŠACHTY',
      prefill: (r, Z) => Z.typSachty !== 'exteriérová' ? 'přirozené, do prostoru schodiště'
        : tsRadekVCene(r, 'hrubaOck', 'C.vetraciMrizkaKc') === false ? 'není součástí nabídky'   // N48
        : 'přirozené, větrací mřížka v horní i dolní části zadní stěny výtahové šachty' },
    /* Stříška se od 9. 9. 2026 zadává počtem kusů a může být i u interiérové
     * šachty, takže se text řídí tím počtem — ne typem šachty a průchozností. */
    { id: 'prosklenaStriska', label: 'PROSKLENÁ STŘÍŠKA',
      prefill: (r, Z) => {
        const ks = +Z.striskaKs || 0;
        if (!ks) return ' -';
        return ks === 1 ? 'nad nástupištěm' : `${ks}× nad nástupišti`;
      } },
    { id: 'podchoziOck', label: 'PODCHOZÍ NOSNÁ OCK', def: ' -' },
    /* Můstky do specifikace a nabídky (P7 / K13-N59, 25. 9. 2026). */
    { id: 'mustky', label: 'MŮSTKY MEZI BUDOVOU A OCK',
      prefill: (r, Z) => {
        const n = tsMustky(Z);
        if (!n) return ' -';
        const h = +Z.mustekHloubkaMm || 0, s = +Z.mustekSirkaMm || 0;
        return n + ' ks' + (h ? ', hloubka ' + h + ' mm' : '') + (s ? ', šířka ' + s + ' mm' : '');
      } },
    { id: 'zabradliPodesty', label: 'ZÁBRADLÍ NA PODESTÁCH',
      prefill: (r, Z) => Z.typSachty !== 'exteriérová' && Z.volitelne.zabradli
        ? 'úpravy a napojení stávajícího zábradlí na podestách' : ' -' },
    { id: 'prechodovePlechy', label: 'PŘECHODOVÉ PLECHY V NÁSTUPIŠTÍCH',
      /* N48: rozhoduje, jestli jsou plechy V CENĚ (volitelná položka
       * `prechodove` ve výsledku), ne staré pole Z.prechodovePlechy — to se
       * s volbou ve sloupci „v ceně" mohlo rozejít. Bez výsledku jako dřív. */
      prefill: (r, Z) => {
        const kat = r && Array.isArray(r.volitelneKatalog) ? r.volitelneKatalog.find(x => x.key === 'prechodove') : null;
        const ano = kat ? !!kat.zahrnuto : !!Z.prechodovePlechy;
        return ano ? 'nerezový plech dle zaměření ve všech nástupištích' : 'nejsou součástí dodávky, viz příplatkové ceny';
      } },
  ] },

  { sekce: 'STAVEBNÍ A PŘÍPRAVNÉ PRÁCE', pole: [
    { id: 'demontazOhrazeni', label: 'DEMONTÁŽ PŮVODNÍHO OHRAZENÍ', ciselnik: TS_C.stavebniPrace, def: ' -' },
    { id: 'upravaOkopu', label: 'ÚPRAVA PŮVODNÍCH OKOPŮ', ciselnik: TS_C.stavebniPrace, def: ' -' },
    { id: 'upravaSchodnic', label: 'ÚPRAVA A OPRAVA SCHODNIC', ciselnik: TS_C.stavebniPrace,
      def: 'není součástí dodávky, zajistí objednatel' },
    { id: 'demontazVytahu', label: 'DEMONTÁŽ PŮVODNÍHO VÝTAHU', ciselnik: TS_C.stavebniPrace, def: ' -' },
    { id: 'demontazPortalu', label: 'DEMONTÁŽ PORTÁLŮ', ciselnik: TS_C.stavebniPrace, def: ' -' },
    { id: 'leseniUvnitr', label: 'LEŠENÍ – UVNITŘ ŠACHTY', ciselnik: TS_C.stavebniPrace,
      prefill: (r, Z) => Z.volitelne.leseniVnitrni
        ? 'je součástí dodávky pouze po dobu stavby šachty' : 'není součást dodávky, lze doplnit viz příplatkové ceny' },
    /* Rozhoduje VÝSLEDEK VÝPOČTU, ne zaškrtávátko v zadání (22. 9. 2026
     * večer). Do základní ceny se vnější lešení dostane jen na exteriérové
     * šachtě; na interiérové je od té doby vždycky příplatkem (pokyn J. V.:
     * „vnější lešení vrať do příplatkových položek"). Samotné
     * `Z.volitelne.leseniVnejsi` by na interiérové šachtě s předvolbou
     * z matice Výchozí slíbilo dodávku, která v ceně není. U odeslané
     * nabídky je `r` zmrazený otisk, takže se znění zpětně nemění. */
    { id: 'leseniVne', label: 'LEŠENÍ – VNĚ ŠACHTY', ciselnik: TS_C.stavebniPrace,
      prefill: (r) => tsLeseniVnejsiVCene(r)
        ? 'je součástí dodávky pro provedení kompletního opláštění šachty'
        : 'není součást dodávky, lze doplnit viz příplatkové ceny' },
    /* N49 (hloubkový test 24. 9. 2026): nabídka tyto věci nabízí jako
     * příplatek, specifikace přitom psala „zajistí objednatel". Je-li
     * příplatek v nabídce, platí znění schválené J. V.: „lze doplnit – viz
     * příplatkové ceny". Ruční volba z číselníku dál vyhrává. */
    { id: 'ohrazeniProtiPadu', label: 'OHRAZENÍ ŠACHTY PROTI PÁDU', ciselnik: TS_C.stavebniPrace,
      prefill: (r, Z) => tsPriplatekNabizen(r, Z, 'zabranyPad') ? TS_LZE_DOPLNIT : 'není součástí dodávky, zajistí objednatel' },
    { id: 'zabranyVstupy', label: 'ZÁBRANY DO DVEŘNÍCH VSTUPŮ', ciselnik: TS_C.stavebniPrace,
      prefill: (r, Z) => tsPriplatekNabizen(r, Z, 'zabranyDvere') ? TS_LZE_DOPLNIT : 'není součástí dodávky, zajistí objednatel' },
    { id: 'zabradliSchodiste', label: 'ZÁBRADLÍ NA SCHODIŠTI', ciselnik: TS_C.stavebniPrace, def: ' -' },
  ] },

  { sekce: 'PROJEKČNÍ A PŘÍPRAVNÉ PRÁCE', pole: [
    { id: 'sken3d', label: 'ZAMĚŘENÍ PROSTORŮ 3D SKENEREM', ciselnik: TS_C.anoNe,
      prefill: (r) => tsRadekVCene(r, 'rezie', 'C.sken3dKc') === false ? 'ne' : 'ano' },   // N48
    { id: 'vystupZamereni', label: 'VÝSTUP ZE ZAMĚŘENÍ PRO OBJEDNATELE', ciselnik: TS_C.anoNe,
      prefill: (r, Z) => Z.vystupZamereni ? 'ano' : 'ne' },
    { id: 'dilenskaDok', label: 'ZPRACOVÁNÍ DÍLENSKÉ DOKUMENTACE', ciselnik: TS_C.anoNe,
      prefill: (r) => tsRadekVCene(r, 'rezie', 'C.projekceHodKc') === false ? 'ne' : 'ano' },   // N48
    /* STATIKA SE ŘÍDÍ CENOU (P8/6, pokyn J. V. 22. 9. 2026: „statiku nastav
     * tak, ať dokument respektuje to, co je v ceně").
     *
     * Do té doby tu stálo jen `def: 'ano'`. Položka STATICKÉ POSOUZENÍ se
     * přitom v kalkulaci dá vypnout (množstvím 0 nebo vyřazením z počítání)
     * a pole šlo naopak přepsat na „ne", zatímco statika v ceně zůstala.
     * Specifikace je příloha smlouvy: co v ní stojí, je slib zákazníkovi.
     *
     * Pole je proto ODVOZENÉ — ruční hodnota se nepoužije (zůstává v datech,
     * nic se nemaže) a obrazovka ho ukazuje jen ke čtení s vysvětlením, kde
     * se statika zapíná. `def` zůstává pro chvíli, kdy výsledek výpočtu
     * ještě není (tsHodnota pak prefill ani odvození nevolá). */
    { id: 'statika', label: 'OVĚŘOVACÍ STATICKÝ VÝPOČET KONSTRUKCE', ciselnik: TS_C.anoNe, def: 'ano',
      odvozene: (r) => tsStatikaVCene(r) ? 'ano' : 'ne',
      odvozenePopis: 'Řídí se cenou: „ano", když je v Kalkulaci OCK (sekce Režie) položka '
        + 'STATICKÉ POSOUZENÍ s nenulovým množstvím. Statiku vypnete tam — množstvím 0.' },
  ] },

  { sekce: 'SOUČÁSTÍ DODÁVKY NENÍ', volne: true, pole: [
    { id: 'neni1', label: 'OSVĚTLENÍ NÁSTUPIŠŤ', ciselnik: TS_C.dodavkaPozn, def: 'není součástí nabídky' },
    { id: 'neni2', label: 'NUCENÉ VĚTRÁNÍ ŠACHTY VENTILÁTOREM', ciselnik: TS_C.dodavkaPozn,
      prefill: (r, Z) => tsPriplatekNabizen(r, Z, 'ventilator') ? TS_LZE_DOPLNIT : 'není požadováno' },   // N49
    /* Když je vnější lešení v ZÁKLADNÍ CENĚ, nesmí tu stát (P8/7 — návrh,
     * který J. V. 22. 9. 2026 schválil: „když je lešení vnější zaškrtnuté,
     * musí řádek LEŠENÍ KOLEM OCK… říct, že je v dodávce"). Řádek je ale
     * v sekci SOUČÁSTÍ DODÁVKY NENÍ, takže „je v dodávce" by si odporovalo
     * s nadpisem — stejná past jako u soklu (16. 9. 2026). Dodávku už říká
     * řádek LEŠENÍ – VNĚ ŠACHTY výš; tenhle se proto VYNECHÁ (prázdná
     * hodnota = řádek z dokumentu zmizí, viz TS_SOKL v nabidka.js).
     *
     * Oprava K1 z 22. 9. odpoledne srovnala jen kapitolu IV. a řádek výš;
     * tenhle zůstal a u exteriérové šachty s lešením v ceně tvrdil opak.
     * Mimo tenhle případ se pole chová jako dřív — text volí obchodník. */
    { id: 'neni3', label: 'LEŠENÍ KOLEM OCK PRO PROVEDENÍ OPLÁŠTĚNÍ', ciselnik: TS_C.dodavkaPozn, def: 'zajistí objednatel v rámci SP',
      odvozene: (r) => tsLeseniVnejsiVCene(r) ? '' : null,
      odvozenePopis: 'Vnější lešení je v základní ceně (řádek LEŠENÍ – VNĚ ŠACHTY), '
        + 'proto se tenhle řádek do dokumentu nedává.' },
    { id: 'neni4', label: 'ODBĚRNÉ MÍSTO EL. ENERGIE PO DOBU REALIZACE', ciselnik: TS_C.dodavkaPozn, def: 'bezúplatně zajistí objednatel' },
    { id: 'neni5', label: 'ÚLOŽNÉ PROSTORY', ciselnik: TS_C.dodavkaPozn, def: 'bezúplatně zajistí majitel objektu' },
    { id: 'neni6', label: 'DOKONČENÍ PODLAH NÁSTUPIŠŤ A NAPOJENÍ K PRAHŮM Š. DVEŘÍ', ciselnik: TS_C.dodavkaPozn, def: 'zajistí objednatel' },
    /* DOZDĚNÍ U ŠACHTY V ZRCADLE SCHODIŠTĚ (nález C5, 15. 9. 2026).
     *
     * Obchodník ten řádek u šachty v zrcadle schodiště pokaždé mazal ručně:
     * kolem dveří tam není co dozdívat. Aplikace o tom umístění VÍ — je to
     * volba číselníku UMÍSTĚNÍ ŠACHTY —, jen ji dosud nikdo s tímhle řádkem
     * nespojil.
     *
     * Zůstává to NABÍDKA, ne automatika (pokyn J. V.: „návrh = přepínač
     * u zakázky, ne tichá automatika"): `prefill` jen předvyplní a obchodník
     * ho může přepsat; štítek u pole pak ukáže „ručně". Čte se ULOŽENÁ
     * hodnota umístění, ne zadání — umístění je pole specifikace, ne
     * kalkulace, takže `ts.hodnoty.umisteni` je jediný zdroj pravdy. */
    { id: 'neni7', label: 'DOZDĚNÍ KOLEM ŠACHETNÍCH DVEŘÍ', ciselnik: TS_C.dodavkaPozn,
      def: 'zajistí objednatel', prefillTs: (ts) => /zrcadle schodiště/.test(
        String((ts && ts.hodnoty && ts.hodnoty.umisteni) || '')) ? ' -' : 'zajistí objednatel' },
    { id: 'neni8', label: 'STAVEBNÍ PŘÍPRAVA', ciselnik: TS_C.dodavkaPozn, def: 'zajistí objednatel v rámci SP' },
    { id: 'neni9', label: 'NAPÁJENÍ VÝTAHU VČETNĚ REVIZNÍ ZPRÁVY', ciselnik: TS_C.dodavkaPozn, def: 'není součástí nabídky' },
    { id: 'neni10', label: 'PROHLUBEŇ PRO ZALOŽENÍ OCK VE SPRÁVNÉ POZICI A ROZMĚRU', ciselnik: TS_C.dodavkaPozn, def: 'zajistí objednatel v rámci SP' },
    { id: 'neni11', label: 'DOSTATEČNÉ PŘÍSTUPOVÉ A MANIPULAČNÍ PROSTORY', ciselnik: TS_C.dodavkaPozn, def: 'zajistí objednatel v rámci SP' },
  ] },
];

const DEFAULT_TECHSPEC = {
  nazevAkce: 'vestavba nové prosklené OCK výtahové šachty',
  hodnoty: {},     // { idPole: 'ruční hodnota' } – jen přepsaná pole; ostatní auto/výchozí
  extra: [],       // [{label, hodnota}] – vlastní doplněné řádky (sekce SOUČÁSTÍ DODÁVKY NENÍ apod.)
};

/* Výsledná hodnota pole: ruční přepis > prefill z kalkulace > výchozí text */
/* `jazyk` (nepovinný) se předává PREFILLU, ne výstupu. Skoro všechna pole
 * vracejí českou větu, kterou přeloží až tisk přes `tr()` nad celým textem —
 * to ale nejde u vět, které se SKLÁDAJÍ z proměnlivého počtu kusů (rozsah
 * opláštění po stěnách, #268). Takovou větu nemá slovník jak trefit celou,
 * takže si ji prefill složí rovnou v cílovém jazyce a dá o tom vědět
 * příznakem `prelozeno`. Tisk pak ví, že přes ni nemá pouštět `tr()` podruhé
 * — jinak by hlásil chybějící heslo u textu, který je přeložený správně. */
/* ODVOZENÉ POLE (22. 9. 2026 večer). `pole.odvozene(r, Z, C, jazyk)` vrací
 * text, když hodnotu URČUJE CENA — pak se ruční přepis nepoužije —, nebo
 * `null`, když se pole chová jako každé jiné. Prázdný řetězec znamená „řádek
 * do dokumentu nepatří" (dokument prázdné řádky vynechává).
 *
 * Proč přednost před ruční hodnotou: specifikace je příloha smlouvy a tyhle
 * řádky popisují něco, za co zákazník v ceně platí, nebo neplatí. Ruční text,
 * který ceně odporuje, je slib, který firma nedodrží (statika P8/6), nebo
 * popření dodávky, kterou si zákazník zaplatil (lešení P8/7). Ruční hodnota
 * se nemaže — zůstává v datech a vrátí se, jakmile cena přestane rozhodovat. */
function tsOdvozeno(pole, vysledekOck, Z, C, jazyk) {
  if (!pole || typeof pole.odvozene !== 'function' || !vysledekOck) return null;
  try {
    const t = pole.odvozene(vysledekOck, Z, C, jazyk);
    return t == null ? null : String(t);
  } catch (e) { return null; }
}

/* Je vnější lešení v ZÁKLADNÍ CENĚ? Rozhoduje výsledek výpočtu: katalog
 * volitelných je profiltrovaný podle typu šachty, takže na interiérové šachtě
 * v něm lešení není vůbec. U odeslané nabídky je `r` zmrazený otisk. */
function tsLeseniVnejsiVCene(r) {
  return !!(r && (r.volitelneKatalog || []).some(x => x.key === 'leseniVnejsi' && x.zahrnuto));
}

/* Je statika v ceně? Řádek STATICKÉ POSOUZENÍ mezi POČÍTANÝMI řádky režie
 * (`r.sekce.rezie` už je po filtru vyřazených položek) a s nenulovým
 * množstvím — nula je v kalkulaci OCK zavedený způsob, jak položku vypnout
 * (štítek „vypnuto (množství 0)"). Nulová CENA při nenulovém množství
 * statiku nevypíná: to je statika zdarma, ale pořád se dělá. Řádek se hledá
 * podle ceníkové cesty; název může obchodník přejmenovat. */
/* JE ŘÁDEK V CENĚ? (N48, hloubkový test 24. 9. 2026) — obecná podoba
 * tsStatikaVCene: řádek s danou ceníkovou cestou mezi POČÍTANÝMI řádky sekce
 * (`r.sekce.*` je už po filtru vyřazených položek) a s nenulovým množstvím.
 * Specifikace a krycí list do té doby slibovaly 3D sken, dílenskou
 * dokumentaci, střechu, mřížku i nosník, i když je obchodník z ceny vyřadil.
 * Vrací null, když výsledek výpočtu není — pak platí dosavadní text. */
function tsRadekVCene(r, sekce, cenaPath) {
  if (!r || !r.sekce) return null;
  return ((r.sekce[sekce]) || []).some(x => x.cenaPath === cenaPath && Number(x.mnozstvi) > 0);
}
/* Je příplatek NABÍZENÝ (v nabídce, ne vynechaný)? Stejné pravidlo jako
 * v nabídce (nabidka.js) a krycím listu: v r.priplatky a ne v priplatkyVynechat. */
function tsPriplatekNabizen(r, Z, key) {
  return !!(r && (r.priplatky || []).some(x => x.key === key)
    && !((Z && Z.priplatkyVynechat) || []).includes(key));
}
const TS_LZE_DOPLNIT = 'lze doplnit – viz příplatkové ceny';   // znění schválené J. V. (N49)

function tsStatikaVCene(r) {
  const radky = (r && r.sekce && r.sekce.rezie) || [];
  return radky.some(x => (x.cenaPath === 'C.statikaKc' || x.origNazev === 'STATICKÉ POSOUZENÍ')
    && Number(x.mnozstvi) > 0);
}

function tsHodnota(pole, ts, vysledekOck, Z, C, jazyk) {
  const odv = tsOdvozeno(pole, vysledekOck, Z, C, jazyk);
  if (odv != null) return { text: odv, zdroj: 'z kalkulace', odvozeno: true };
  if (ts.hodnoty[pole.id] != null) return { text: ts.hodnoty[pole.id], zdroj: 'ručně' };
  if (pole.prefill && vysledekOck) {
    try {
      const t = pole.prefill(vysledekOck, Z, C, jazyk);
      return { text: t, zdroj: 'z kalkulace', prelozeno: !!(jazyk && jazyk !== 'cz' && pole.jazykSam) };
    }
    catch (e) { /* spadne-li prefill, použij výchozí */ }
  }
  /* `prefillTs` se řídí JINÝM POLEM SPECIFIKACE, ne kalkulací (nález C5,
   * 15. 9. 2026). Umístění šachty je volba obchodníka v této záložce, takže
   * výsledek OCK o něm nic neví a `prefill(r, Z, C)` by se neměl čeho chytit.
   * Zdroj se hlásí jako „ze specifikace", ať je v rozhraní poznat, odkud to
   * je — „z kalkulace" by u toho řádku lhalo. */
  if (pole.prefillTs) {
    try { return { text: pole.prefillTs(ts, Z, C), zdroj: 'ze specifikace' }; }
    catch (e) { /* spadne-li, použij výchozí */ }
  }
  return { text: pole.def != null ? pole.def : ' -', zdroj: pole.prefill ? 'z kalkulace' : 'výchozí' };
}

/* ---------- Admin: editace dat (záložka „Technická specifikace OCK Data") ----------
 * TS_C = pojmenované číselníky (rolovací seznamy). Jedno pole odkazuje na pole
 * (array) číselníku PŘES REFERENCI, takže úprava seznamu na místě (in-place
 * splice/push) se hned promítne do všech pozic, které jej sdílejí, i do
 * záložky Technická specifikace. Výchozí hodnota se drží na poli (pole.def). */

/* mapa: reference číselníku (array) → klíč v TS_C */
const TS_C_KEY_OF = new Map();
Object.keys(TS_C).forEach(k => TS_C_KEY_OF.set(TS_C[k], k));
function tsCiselnikKlic(pole) { return pole.ciselnik ? TS_C_KEY_OF.get(pole.ciselnik) : null; }

/* mapa: klíč číselníku → seznam pozic, které jej používají [{id,label,sekce}] */
function tsCiselnikPouziti() {
  const m = {};
  Object.keys(TS_C).forEach(k => { m[k] = []; });
  TECHSPEC_DEF.forEach(s => s.pole.forEach(p => {
    const k = tsCiselnikKlic(p);
    if (k) m[k].push({ id: p.id, label: p.label, sekce: s.sekce });
  }));
  return m;
}

/* najdi definici pole podle id (napříč sekcemi) */
function tsPole(id) {
  for (const s of TECHSPEC_DEF) { const p = s.pole.find(x => x.id === id); if (p) return p; }
  return null;
}

/* snímky původního stavu (pro „vrátit vše na výchozí") */
const TS_C_ORIG = JSON.parse(JSON.stringify(TS_C));
const TS_DEF_ORIG = {};
TECHSPEC_DEF.forEach(s => s.pole.forEach(p => { TS_DEF_ORIG[p.id] = p.def; }));

/* ============================================================
 * TS-1: KONTROLA VYPLNĚNÍ – POUZE UPOZORNĚNÍ, NIC NEBLOKUJE
 * ------------------------------------------------------------
 * Specifikace se tiskne jako příloha smlouvy, takže prázdné povinné
 * položky je potřeba vidět dřív než zákazník. Kontrola proto jen
 * spočítá a vyjmenuje, co chybí – tisk, export ani uložení nikdy
 * nezastaví. Záměrně tu není žádné „nelze pokračovat“.
 * ============================================================ */

/* hlavička dokumentu (data leží v zakázce ZAK, ne v TS) */
const TS_HLAVICKA = [
  { id: 'cislo', label: 'ČÍSLO NABÍDKY', zdroj: 'zakazka' },
  { id: 'objednatel', label: 'OBJEDNATEL', zdroj: 'zakazka' },
  { id: 'datum', label: 'DATUM', zdroj: 'zakazka' },
  /* NÁZEV AKCE JE VÝBĚR, NE JEDNA VĚTA S LOMÍTKEM (nález D3, 15. 9. 2026).
   *
   * Výchozí hodnota zněla „přístavba/vestavba nové prosklené OCK výtahové
   * šachty" — tedy obě možnosti naráz. Slovník ji poctivě přeložil celou,
   * takže v anglické specifikaci pro Konstanz stálo „extension / built-in
   * installation…" a obchodník jednu půlku mazal ve Wordu. Nebyl to dynamický
   * text, byl to jeden řetězec se dvěma významy.
   *
   * Číselník to řeší v CZ i v mutacích: každá ze čtyř variant je vlastní
   * položka slovníku. Vlastní text zůstává povolený (jako u všech polí
   * specifikace) — jen se nepřeloží, protože ve slovníku není; na to
   * upozorňuje nápověda u pole. Přesně to se dnes děje na 0290, kde si
   * obchodník název zkrátil ručně. */
  { id: 'nazevAkce', label: 'NÁZEV AKCE', zdroj: 'techspec', ciselnik: TS_C.nazevAkce },
  { id: 'adresa', label: 'ADRESA STAVBY', zdroj: 'zakazka' },
];

/* Povinné položky dokumentu. Pomlčka „ -“ je legitimní odpověď u polí,
 * která se běžně neuplatní (usazení bočních stěn, doplňkové konstrukce),
 * proto v seznamu nejsou – hlídáme jen to, bez čeho specifikace nedává smysl. */
const TS_POVINNE = [
  'umisteni', 'umisteniStroje', 'ulozeni', 'vyskaCelkova', 'rozmerVnitrni', 'zdvih',
  'stanice', 'kabina', 'pudorys', 'usazeniCelni',
  'typKonstrukce', 'svisleNosne', 'profilSloupku', 'vodorovneNosne', 'roztecPricniku',
  'profilPricniku', 'kotveniPoloha', 'kotveniTyp', 'povrchovaUprava', 'strecha', 'pozarni',
  'typOplasteni', 'materialOplasteni', 'povrchOplasteni', 'umisteniOplasteni', 'kotveniOplasteni',
];

/* prázdné = nic, samá mezera nebo jen pomlčka (tak vypadá „nevyplněno“ v číselnících) */
function tsPrazdna(t) {
  const s = String(t == null ? '' : t).trim();
  return !s || s === '-' || s === '–';
}

/* tsKontrola(ts, r, Z, C, zak) → { ok, pocet, chybi[], hlavicka[], pole[] }
 * chybi = [{ id, label, sekce, druh }]; druh: 'hlavicka' | 'pole'.
 * Všechny argumenty kromě ts jsou volitelné (bez zakázky se hlavička přeskočí). */
function tsKontrola(ts, r, Z, C, zak) {
  const t = ts || { hodnoty: {}, extra: [] };
  const h = t.hodnoty || {};
  const chybi = [];

  if (zak) TS_HLAVICKA.forEach(p => {
    const val = p.zdroj === 'techspec' ? t[p.id] : zak[p.id];
    if (tsPrazdna(val)) chybi.push({ id: p.id, label: p.label, sekce: 'HLAVIČKA DOKUMENTU', druh: 'hlavicka' });
  });

  TECHSPEC_DEF.forEach(s => s.pole.forEach(p => {
    if (TS_POVINNE.indexOf(p.id) < 0) return;
    let text;
    try { text = tsHodnota(p, { hodnoty: h, extra: t.extra || [] }, r, Z, C).text; }
    catch (e) { text = h[p.id]; }
    if (tsPrazdna(text)) chybi.push({ id: p.id, label: p.label, sekce: s.sekce, druh: 'pole' });
  }));

  return {
    ok: chybi.length === 0,
    pocet: chybi.length,
    chybi: chybi,
    hlavicka: chybi.filter(x => x.druh === 'hlavicka'),
    pole: chybi.filter(x => x.druh === 'pole'),
  };
}

if (typeof module !== 'undefined')
  module.exports = { tsRadekVCene, tsPriplatekNabizen, TS_LZE_DOPLNIT, TECHSPEC_DEF, TS_C, DEFAULT_TECHSPEC, tsHodnota, tsOplasteniRozsah,
    tsOdvozeno, tsLeseniVnejsiVCene, tsStatikaVCene,
    TS_C_KEY_OF, tsCiselnikKlic, tsCiselnikPouziti, tsPole, TS_C_ORIG, TS_DEF_ORIG,
    TS_HLAVICKA, TS_POVINNE, tsPrazdna, tsKontrola };
