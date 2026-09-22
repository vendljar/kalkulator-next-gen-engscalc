/* ============================================================
 * KALKULÁK – výpočetní jádro (přepis Excel šablony do JS)
 * Zdroj: Kalkulace montované OCK (VZOR v1.00 + aktualizace v22.7.1)
 * fixes=false  -> "kompatibilní režim": počítá 1:1 jako Excel (vč. chyb)
 * fixes=true   -> opravené logické chyby (viz README/dokumentace)
 * ============================================================ */

const CEIL = (x, m) => Math.ceil(x / m - 1e-9) * m;

/* Odstup lešení U-dokola od šachty [m] — nález V2, rozhodnutí J. V. 14. 9. 2026:
 * „pracuje se s odstupem 0,25 m (novější předloha 01/2026)". Jediné místo, kde
 * se ta hodnota vyskytuje; platí pro Model 1 i Model 2. */
const LESENI_ODSTUP_M = 0.25;

// Konstanty spojů plechů (VZORCE řádky 44–52, sloupce O–T)
const SPOJE = {
  zadniRoh:      { int: { ks: 1, kg: 1.38,   m2: 0.059 },  ext: { ks: 4, kg: 3.732,  m2: 0.202 } },
  celni:         { int: { ks: 1, kg: 0.467,  m2: 0.0225 }, ext: { ks: 3, kg: 1.419,  m2: 0.07654 } },
  predsazene:    { int: { ks: 1, kg: 0.4777, m2: 0.027 },  ext: { ks: 1, kg: 0.4777, m2: 0.027 } },
  portPricniky:  { int: { ks: 1, kg: 0.38,   m2: 0.0167 }, ext: { ks: 2, kg: 0.125,  m2: 0.011968 } },
  sloupkyPortalu:{ int: { ks: 1, kg: 0.514,  m2: 0.0478 }, ext: { ks: 2, kg: 0.514,  m2: 0.0478 } },
  spodniRamRoh:  { int: { ks: 1, kg: 3.725,  m2: 0 },      ext: { ks: 3, kg: 12.025, m2: 0.49575 } },
  kotveni:       { int: { ks: 4, kg: 2.422,  m2: 0.172 },  ext: { ks: 4, kg: 3.12,   m2: 0.1704 } },
};

/* PRÁZDNÝ CENÍK – ve zdrojovém kódu nejsou žádné ceny, ani ukázkové.
 *
 * Skutečné nákupní ceny, sazby a marže jsou obchodní tajemství a ve
 * zdrojovém kódu nemají co dělat – ten se zálohuje na GitHub a jednou
 * poběží na serveru. Bydlí proto ve `_program.json` ve složce `_DB`, kde
 * má každá jejich změna datum, autora a zdůvodnění (viz program.js).
 * Aplikace si je odtud načte při spuštění a `progPouzij()` jimi obsah
 * tohoto objektu NA MÍSTĚ přepíše.
 *
 * Do 30. 7. 2026 tady ležel ukázkový ceník s kulatými čísly, aby se dala
 * aplikace předvést i bez připojené složky. Zadání z 30. 7. 2026 to ruší:
 *
 *   „Ukázkový ceník z aplikace prostě vymaž. S tím nabídka ven jít nesmí
 *    za žádnou cenu. Buď se z databáze natáhne ostrý ceník, anebo svítí
 *    všude nuly a není z čeho počítat."
 *
 * Důvod je obchodní, ne technický: dokud v sestavení leželo cokoli, co
 * se tvářilo jako ceník, existovala cesta, jak poslat zákazníkovi nabídku
 * spočítanou z vymyšlených čísel. Červený pruh na to upozorňoval, ale
 * upozornění se dá přehlédnout – nula se přehlédnout nedá.
 *
 * Zůstává jen STRUKTURA: seznam klíčů, které ceník musí obsahovat, aby
 * výpočet nespadl na `undefined` a aby bylo podle čeho poznat, co ještě
 * v načteném ceníku chybí. Všechny peněžní hodnoty jsou 0.
 *
 * Výjimky z nulování, ať nepřekvapí:
 *  - `dph` – zákonná sazba, ne naše cena. Nula by tiše vyrobila dokument
 *    se špatnou daní; nechat platnou sazbu je bezpečnější než nulu.
 *  - `lak.rezim` – přepínač způsobu lakování, ne částka.
 *  - `skloBokyNazev` / `skloCelniNazev` – názvy výrobku, prázdný řetězec.
 *
 * `ukazkove: true` zůstává jako značka „tohle nejsou ostré ceny" (jméno
 * klíče se nemění, aby na něj navázaná mašinérie fungovala beze změny),
 * `prazdny: true` k ní přidává „a navíc jsou samé nuly", aby hlášky mohly
 * říct pravdu: ceník není nahraný, není z čeho počítat. Obě zmizí samy –
 * konfigNahradVMiste() nahrazuje celý obsah objektu a skutečný ceník ze
 * složky tyhle klíče nemá. Zveřejnění ceníku (progZverejni) je ze zápisu
 * odstraňuje – uložit ceník do složky je vědomé prohlášení, že ceny jsou
 * skutečné.
 *
 * Testy si čísla berou ze `zkusebni_cenik.js`, který není v seznamu CORE
 * v `build.py`, takže do `dist/*.html` nevede žádná cesta. */
const DEFAULT_CENIK = {  // HODNOTY VYNULOVÁNY pro GitHub (pripravit_github.py) – reálný ceník je jen v lokální záloze
  ukazkove: true,
  prazdny: true,
  marze: 0, dph: 0.12,            // dph = zákonná sazba, ne naše cena
  /* Kurz EUR (#155, 19. 8. 2026): přepočet cen pro dokumenty v jiné než
   * české mutaci. 0 = nenastaveno → cizojazyčný tisk se zastaví (ceny se
   * nevymýšlejí). Do výpočtu nevstupuje — kalkulace je vždy v Kč. */
  kurzEurKc: 0,
  profilasKgKc: 0,                // Kč/kg profily
  powertechExt: 0, powertechInt: 0, // Kč/kg plechy
  montazniNosnik: 0, lemovaniKgKc: 0,
  oplechPracKc: 0, nytKc: 0, spodniRamKc: 0, cilkoKc: 0,
  montazHodKc: 0, vetraciMrizkaKc: 0, transportKc: 0,
  zastreseniM2Kc: 0, oplechFasadaBmKc: 0,
  skloBokyKc: 0,  skloBokyNazev: '',
  skloCelniKc: 0, skloCelniNazev: '',
  skloVsg442Kc: 0,               // VSG 4.4.2 — interiérová šachta na terče (9. 9. 2026)
  cetrisKc: 0,                   // Cetris — neprůhledné opláštění stěny (17. 9. 2026)
  /* Dodatkové texty k položkám (#267, 18. 9. 2026): cesta do ceníku → věta
   * do cenové nabídky. Prázdná mapa schválně — nic se nepředvyplňuje, dokud
   * si firma texty nenapíše. Není to sazba, takže do porovnání cen nevstupuje;
   * otisk verze ji naopak nese, jinak by oprava překlepu nešla zveřejnit. */
  popisy: {},
  praceOplasteniKc: 0, plastKotvyKc: 0, tmeleniKc: 0,
  striskaDvurKc: 0, cestovniKc: 0, cisteniKc: 0,
  /* leseniFix (11. 8. 2026) — JEDINÝ zdroj fixní části lešení. Do té doby
   * měla každá varianta lešení vlastní fixní klíč (vnitřní / vnější / hlava
   * šachty) a v předloze se tytéž řádky lišily: vnitřní 18 000 ve volitelných,
   * ale 15 000 v příplatcích, hlava šachty 0 a 5 000. Rozhodnutí uživatele:
   * jedna cena (18 000 Kč) a jedno místo, kde se mění. */
  prechodoveKgKc: 0, leseniVnitrniKc: 0, leseniFix: 0,
  leseniVnejsiKc: 0, hakyKc: 0, zabradliKc: 0, soklBmKc: 0,
  sken3dKc: 0, vystupZamereniKc: 0, engineeringKc: 0,
  projekceHodKc: 0, statikaKc: 0, statikaHod: 0, rezieKancelareKc: 0,
  /* Projekce navíc při zasklení mezi příčníky (9. 9. 2026). V repozitáři je
   * jako každá jiná ceníková hodnota NULA — skutečný ceník sem dosadí své
   * číslo. Prázdná hodnota znamená „výchozí 4 hodiny" (viz vypocet), takže
   * ceník, který položku ještě nemá, počítá stejně jako po jejím vyplnění. */
  zaskleniListyProjHod: 0,
  stavbyvedouciHod: 0, stavbyvedouciKc: 0,
  prekladyKc: 0,                  // překlady CZ→DE, jen zahraniční zakázky (#181)
  atypPrirazka: 0,                // ATYP: přirážka k nákladu režie (viz zadání #22)
  zamecnikAtypKc: 0,              // ATYP: sazba za atypickou zámečnickou práci (#7) – viz Z.zamecnikAtypKc
  /* Co zaškrtnutí ATYP předvyplní do zadání, a s čím začíná nová zakázka
   * (31. 8. 2026). Do teď byla tahle čísla napsaná v kódu — v atypPrepni()
   * a v DEFAULT_ZADANI —, takže je firma nemohla změnit bez nového
   * sestavení. Teď jsou v ceníku, kde se dají zadat a zveřejnit.
   * Výpočtu se netýkají: pracuje se zadáním zakázky, ne s nimi. */
  atypMontazPct: 0, atypProjekcePct: 0, atypZamecnikKc: null,
  atypRezervaZakladPct: 0, atypRezervaPriplatkyPct: 0,
  vychMontazZakladHod: 0, vychProjekceZakladHod: 0,
  vychOplechOstatniKg: 0, vychOplechOstatniHod: 0,
  /* Předvolby sazeb DPH (1. 9. 2026). Sazba zakázky je `dph` o kus výš —
   * tohle je jen nabídka v hlavičce. Nula = nenastaveno, platí zákonná
   * sazba ze sestavení (viz dphPredvolby v ui/common.js). */
  dphZakladni: 0.21, dphSnizena: 0.12, dphNulova: 0,
  spojovaci: { riplockM10: 0, riplockM8: 0, nordlock: 0, nytM10: 0, nytM8: 0,
               nytM6: 0, tSrouby: 0, sroubM10: 0, sroubM8: 0, sroubM6: 0,
               zavitTyc: 0, chemKotva: 0 },
  lak: { rezim: 'tomas',          // rezim = přepínač, ne částka
         lakovnaProfilBm: 0, lakovnaListaBm: 0, lakovnaM2: 0,
         tomasProfilM2: 0, tomasListaBm: 0, tomasPlechKs: 0, tomasOplechM2: 0, tomasTercKs: 0 },
  priplatky: { vsgFolieM2: 0, sknM2: 0, medStrechaM2: 0,
               ventilatorKc: 0, zabranyDvereKc: 0, madlaBmKc: 0,
               leseniHlavaKc: 0, montazDveriKc: 0, prechMontKc: 0,
               /* Osm příplatků z excelové předlohy (rozhodnutí J. V. 1. 9. 2026:
                * „zaveď je všechny, tak jak jsou"). V Excelu jsou to nabídkové
                * položky za akci — množství 1, cena z ceníku; obchodník
                * množství i cenu v zakázce přepíše. Žádný vzorec nad rozměry
                * šachty za nimi NENÍ; kdyby některá měla počítat m² nebo bm,
                * doplní se, až bude jasné z čeho. */
               zabranyPadKc: 0, demontazOhrazeniKc: 0, malbaSchodnicKc: 0,
               naterOhrazeniKc: 0, naterOkopovychKc: 0, prosklenaStenaKc: 0,
               demontazVytahuKc: 0, destovySvodKc: 0 },
};

/* VÝCHOZÍ DIMENZE PROFILŮ PODLE TYPU ŠACHTY (9. 9. 2026, zadání J. V.
 * v sešitu „Vychozi_nastaveni_spec_sachty_a_hlavicky.xlsx": „nastav výchozí
 * nastavení profilů a zasklení pro interiérovou a exteriérovou šachtu — po
 * vybrání typu šachty").
 *
 * Interiérová šachta nenese vítr ani sníh a stojí uvnitř budovy, takže
 * vystačí se subtilnějšími profily; exteriérová sada zůstává tím, čím byla
 * dosud (proto se DEFAULT_ZADANI nemění ani o milimetr). Lemování je
 * u interiérové vedené taky, ale do výpočtu nevstupuje — položka
 * „PROFILY - LEMOVÁNÍ ŠACHTY (EXT)" se skládá jen u exteriérové, a obrazovka
 * proto u interiérové ukazuje místo dimenzí pomlčku. */
const PROFILY_VYCHOZI = {
  'exteriérová': {
    sloupek:       { dim: '80x80', tl: 4 },
    precnikBok:    { dim: '80x80', tl: 3 },
    sloupekPortal: { dim: '40x40', tl: 3 },
    precnikPortal: { dim: '80x40', tl: 3 },
    spojka:        { dim: '70x70', tl: 3 },
    lemovani:      { dim: '60x30', tl: 2 },
  },
  'interiérová': {
    sloupek:       { dim: '80x40', tl: 4 },
    precnikBok:    { dim: '80x40', tl: 3 },
    sloupekPortal: { dim: '40x40', tl: 3 },
    precnikPortal: { dim: '80x40', tl: 3 },
    spojka:        { dim: '70x30', tl: 3 },
    lemovani:      { dim: '60x30', tl: 2 },
  },
};

/* PRŮCHOZÍ ŠACHTA: NÁSTUPIŠTĚ A / C A POČET PATER (9. 9. 2026, zadání J. V.).
 *
 * Průchozí šachta má nástupiště na dvou stranách — A je čelní stěna, C zadní.
 * Celkový počet nástupišť se z nich pak dopočítává a ručně se nezadává; jinak
 * by v zakázce byla dvě čísla o téže věci a jedno z nich by se dřív nebo
 * později rozešlo s druhým.
 *
 * Počet PATER je samostatný údaj, protože u průchozí šachty už není roven
 * počtu nástupišť (jedno patro může mít dvě). Slouží k výšce podlaží.
 *
 * Obě funkce mají fallback na dnešní chování: bez zaškrtnuté průchozí šachty
 * (a u všech starších zakázek) platí „nástupiště = patra" přesně jako dosud. */
function nastupisteCelkem(z) {
  const zd = z || {};
  if (!zd.pruchoziSachta) return +zd.nastupiste || 0;
  return (+zd.nastupisteA || 0) + (+zd.nastupisteC || 0);
}
function patraProVypocet(z) {
  const zd = z || {};
  if (!zd.pruchoziSachta) return +zd.nastupiste || 0;
  return +zd.patra || 0;
}

/* ZASKLENÍ PODLE TYPU ŠACHTY (9. 9. 2026, zadání J. V. v sešitu
 * „Vychozi_nastaveni_spec_sachty_a_hlavicky.xlsx", výklad potvrzen týž den).
 *
 * Exteriérová šachta stojí venku, takže boky a záda drží dvojsklo kvůli
 * tepelné izolaci a čelní stěna je z VSG 4.4.1 — tak to bylo dosud a nemění
 * se. Interiérová šachta uvnitř budovy dvojsklo nepotřebuje: obě plochy jsou
 * z téhož VSG, a to podle způsobu zasklení — na terče 4.4.2, mezi příčníky
 * 4.4.1.
 *
 * Vrací pro každou plochu NÁZEV ŘÁDKU, sazbu a cestu do ceníku. Název je
 * součástí návratu schválně: ruční přepisy množství, přejmenování i seznam
 * vyřazených položek se v tomhle jádře klíčují právě názvem řádku, takže
 * migrace starších zakázek (skloMigraceNazvu) musí umět spočítat týž název
 * jako výpočet. Jedna funkce, jedna pravda.
 *
 * Chybí-li v ceníku sazba pro 4.4.2 (starší ceníky ji nemají), počítá se
 * cenou 4.4.1 — nabídka tak nespadne na nulu a v ceníku je vidět, co doplnit. */
/* TYPY OPLÁŠTĚNÍ PRO REŽIM PO STĚNÁCH (#268, 18. 9. 2026).
 *
 * Typ JE ceníková cesta — díky tomu se sazba nehledá v žádné druhé tabulce
 * a nové sklo v ceníku se ve výběru objeví samo. Dvě výjimky nemají cestu:
 * „bez" (dodá stavba, nepočítá se nikam) a „jiné" (název i náklad zadá
 * obchodník ručně; ruční náklad je vždycky atyp, stejně jako ručně přepsané
 * množství).
 *
 * `kde` říká, kde se typ nabízí — pravidla interiér/exteriér jsou táž jako
 * u `skloVolba()`. Cetris a „jiné" jsou vždy. */
const OPLASTENI_TYPY = [
  { id: 'C.skloBokyKc', nazev: 'Dvojsklo (boky + záda)', kde: 'ext' },
  { id: 'C.skloCelniKc', nazev: 'Sklo VSG 4.4.1', kde: 'vse' },
  { id: 'C.skloVsg442Kc', nazev: 'Sklo VSG 4.4.2', kde: 'int' },
  { id: 'C.cetrisKc', nazev: 'Cetris', kde: 'vse' },
  { id: 'bez', nazev: 'bez — dodá stavba', kde: 'vse' },
  { id: 'jine', nazev: 'jiné', kde: 'vse' },
];
function oplasteniTypy(ext) {
  return OPLASTENI_TYPY.filter(t => t.kde === 'vse' || t.kde === (ext ? 'ext' : 'int'));
}

/* VÝCHOZÍ TYP STĚNY = to, co by na ní bylo ve standardním režimu.
 *
 * Čelní stěna (A) nese světlíky a dveře, takže se u ní sklo volí jinak než
 * u boků a zad — rozhoduje o tom `skloVolba` podle typu šachty a způsobu
 * zasklení. Pravidlo stojí tady, na jednom místě, protože ho potřebuje
 * VÝPOČET (když stěna v zadání ještě není) i OBRAZOVKA (když se režim po
 * stěnách zapíná a stěny se zakládají). Dvě kopie by se rozešly a zapnutí
 * režimu by pak hnulo cenou — přesně to, co se u #268 slíbilo, že nenastane. */
function oplasteniVychoziTyp(z, c, stena) {
  const r = skloVolba(z, c);
  return (stena === 'A' ? r.celni.cesta : r.boky.cesta);
}

const OPLASTENI_STENY = ['A', 'B', 'C', 'D'];

/* Čtyři stěny v takovém stavu, v JAKÉM JE ŠACHTA DNES: každá celá, z toho
 * materiálu, který by na ní byl ve standardním režimu.
 *
 * Bydlí to v jádru, ne v obrazovce, schválně. Dávka #268 slíbila, že
 * ZAPNUTÍ REŽIMU BEZE ZMĚNY ZADÁNÍ NEHNE CENOU ANI O HALÉŘ — a ten slib drží
 * jedině tehdy, když stěny zakládá tentýž kód, jehož se výpočet drží, když
 * je v zadání nenajde. Kdyby si je skládala obrazovka po svém, rozešlo by se
 * to při první změně pravidel a poznalo by se to až na ceně. Takhle se to dá
 * otestovat v Node, bez prohlížeče. */
function oplasteniStenyVychozi(z, c) {
  const out = {};
  OPLASTENI_STENY.forEach(k => {
    out[k] = { odM: 0, pasy: [{ typ: oplasteniVychoziTyp(z, c, k), doM: null }] };
  });
  return out;
}
/* Řádky kalkulace ze součtu ploch podle typu. Pořadí je dané pořadím
 * v OPLASTENI_TYPY, aby se kalkulace nepřeskupovala podle toho, kterou
 * stěnu obchodník vyplnil dřív; „jiné" jdou nakonec, abecedně. */
function oplRadky(podleTypu, mk, c) {
  const znam = OPLASTENI_TYPY.map(t => t.id).filter(id => id !== 'bez' && id !== 'jine');
  const klice = Object.keys(podleTypu).sort((a, b) => {
    const ia = znam.indexOf(a), ib = znam.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b, 'cs');
  });
  return klice.map(k => {
    const r = podleTypu[k];
    if (r.typ === 'jine') {
      /* Ruční sazba — položka nemá ceníkovou cestu, takže se cena zadává
       * v zadání a do ceníku se nepropisuje. */
      return mk('OPLÁŠTĚNÍ - ' + (r.nazev || 'JINÉ').toUpperCase(), r.m2, +r.naklad || 0, {});
    }
    const def = OPLASTENI_TYPY.find(t => t.id === r.typ);
    /* Sazba se čte přímo z dat, ne přes `cenikGet()`: ten je v jiném modulu
     * a v Node by tu nebyl vidět, takže by jádro v testech počítalo nulou
     * a v aplikaci správně. Cesta má tvar „C.klic" nebo „C.skupina.klic". */
    const sazba = String(r.typ).split('.').slice(1)
      .reduce((o, k) => (o == null ? undefined : o[k]), c);
    return mk((def ? def.nazev : r.typ).toUpperCase(), r.m2, +sazba || 0, { cenaPath: r.typ });
  });
}

const SKLO_VSG441 = 'VSG 4.4.1';
const SKLO_VSG442 = 'VSG 4.4.2';
function skloVolba(z, c) {
  const zd = z || {}, cc = c || {};
  const ext = zd.typSachty !== 'interiérová';
  if (ext) {
    return {
      boky:  { nazev: 'MATERIÁL boční + zadní stěna (' + (cc.skloBokyNazev || '') + ')',
               kc: cc.skloBokyKc, cesta: 'C.skloBokyKc' },
      celni: { nazev: 'MATERIÁL ' + SKLO_VSG441, kc: cc.skloCelniKc, cesta: 'C.skloCelniKc' },
    };
  }
  /* NÁZEV ŘÁDKU A SAZBA MÍŘÍ NA TUTÉŽ POLOŽKU CENÍKU (nález V38, 14. 9. 2026).
   *
   * Do 14. 9. tu stála záložní větev: když byla položka „Sklo VSG 4.4.2"
   * v ceníku prázdná, řádek se dál jmenoval VSG 4.4.2, ale počítal se sazbou
   * VSG 4.4.1. V kole 3 to tak i dopadlo — položka mezi verzemi ceníku
   * zmizela (viz cenikDoplnKlice) a nabídka tiše počítala jiným sklem, než
   * jaké měla v názvu. Záloha je pryč: řádek nese název i sazbu téže položky,
   * a je-li prázdná, je v nabídce vidět nula. Nulu nejde přehlédnout, tiše
   * zaměněné sklo ano. */
  const listy = zd.zaskleni === 'mezi příčníky';
  const typ = listy ? SKLO_VSG441 : SKLO_VSG442;
  const kc = listy ? cc.skloCelniKc : cc.skloVsg442Kc;
  const cesta = listy ? 'C.skloCelniKc' : 'C.skloVsg442Kc';
  return {
    boky:  { nazev: 'MATERIÁL boční + zadní stěna (' + typ + ')', kc, cesta },
    celni: { nazev: 'MATERIÁL ' + typ, kc, cesta },
  };
}

/* Migrace názvů skel u starších zakázek (9. 9. 2026).
 *
 * Do 9. 9. se řádky jmenovaly „MATERIÁL boční + zadní stěna (<typ z ceníku>)"
 * a „MATERIÁL čelní stěna (<typ z ceníku>)". Přepisy množství, přejmenování
 * a hlavně seznam VYŘAZENÝCH položek (`nepocitat`) se klíčují názvem, takže
 * bez přemapování by vyřazené sklo začalo znovu vstupovat do ceny — a to
 * potichu. Klíče se proto přepíšou na názvy, které pro tutéž zakázku vydá
 * skloVolba(). Migrace se pouští jen tehdy, když starý tvar v datech opravdu
 * je; nová zakázka jí neprojde. */
function skloMigraceNazvu(data) {
  const d = data || {};
  const z = d.ock && d.ock.zadani, c = d.cenik;
  if (!z || !c) return 0;
  const nove = skloVolba(z, c);
  const dvojice = [[/^MATERIÁL boční \+ zadní stěna \(/, nove.boky.nazev],
                   [/^MATERIÁL čelní stěna \(/, nove.celni.nazev]];
  let zmen = 0;
  const prejmenuj = (mapa) => {
    if (!mapa || typeof mapa !== 'object') return;
    Object.keys(mapa).forEach(k => {
      dvojice.forEach(([vzor, novy]) => {
        if (!vzor.test(k) || k === novy) return;
        if (mapa[novy] === undefined) mapa[novy] = mapa[k];
        delete mapa[k];
        zmen++;
      });
    });
  };
  prejmenuj(z.mnozstviPrepis); prejmenuj(z.cenyPrepis); prejmenuj(z.nazvyPrepis);
  if (Array.isArray(z.nepocitat)) {
    z.nepocitat = z.nepocitat.map(n => {
      const s = String(n);
      const nalez = dvojice.find(([vzor]) => vzor.test(s));
      if (!nalez || s === nalez[1]) return n;
      zmen++;
      return nalez[1];
    });
  }
  return zmen;
}

const DEFAULT_ZADANI = {
  prejezd: 2.7, zdvih: 17.325, prohluben: 1.05,
  sirka: 1.51, hloubka: 1.515, roztec: 1.25,
  rohoveSloupky: 4, nastupiste: 6,
  typSachty: 'exteriérová', typPortalu: 'zapuštěný', zaskleni: 'na terče',
  svetlikNadDvermi: true, svetlikyBoky: 0,
  cistyVstupMm: 800, sirkaRamuMm: 100, prechodovePlechy: true,
  pruchoziSachta: false, atyp: false, vystupZamereni: false,
  /* Průchozí šachta (9. 9. 2026): nástupiště zvlášť na čelní (A) a zadní (C)
   * stěně, počet pater kvůli výšce podlaží a počet stříšek. U neprůchozí
   * šachty se A/C ani patra nečtou — platí `nastupiste` jako dosud. */
  nastupisteA: 0, nastupisteC: 0, patra: 0, striskaKs: 0,
  profily: JSON.parse(JSON.stringify(PROFILY_VYCHOZI['exteriérová'])),
  rezervaProfilyPct: 0, rezervaPlechyPct: 0,
  montazZakladHod: 24, montazAtypHod: 0, projekceZakladHod: 50, projekceAtypHod: 0,
  /* zamecnikAtypKc = přepis sazby atypické zámečnické práce JEN pro tuhle zakázku.
   * Výchozí je prázdno (null), ne nula: prázdno znamená „platí ceník", kdežto
   * nula je platná dohoda („tohle uděláme zdarma"). Kdyby tu stála nula, ceníková
   * sazba by se nikdy neuplatnila a cena by zase vznikala ručně mimo ceník (#7). */
  zamecnikAtypKs: 0, zamecnikAtypKc: null, oplechOstatniKg: 10, oplechOstatniHod: 5,
  engineeringKs: 0, rezervaZakladPct: 0, rezervaPriplatkyPct: 0,
  volitelne: { prechodove: null /* null = dle zadání */, leseniVnitrni: true, leseniVnejsi: false,
               prechMont: null /* od 16. 9. 2026 se nečte — montáž jde s materiálem */,
               leseniHlava: false,
               haky: true, zabradli: true, sokl: false },
  /* OPLÁŠTĚNÍ PO STĚNÁCH (#268, druhý krok, 18. 9. 2026).
   *
   * `rezim: 'standard'` znamená, že se nepočítá nic nového — jádro jde
   * dosavadní cestou přes `skloVolba()` a ŽÁDNÁ uložená zakázka se nemění.
   * Teprve `'poStenach'` pustí ke slovu `steny`.
   *
   * Prázdné `steny` = „ještě se nezadávalo". Naplní se až při přepnutí, a to
   * tím, co by vyšlo ve standardu — přepnutí samo tedy cenou nehne. */
  oplasteni: { rezim: 'standard', steny: null },
  priplatkyVyber: null, // null = všechny (jako Excel); jinak pole klíčů
  mnozstviPrepis: {},   // ruční přepis množství položek kalkulace { název: množství }
  volitelneVlastni: [], // (starší) vlastní ruční položky sekce Volitelné [{nazev, mnozstvi, cena}]
  vlastniPolozky: { hrubaOck: [], atyp: [], oplasteni: [], volitelne: [], rezie: [],
                    spojovaci: [], lakovani: [] },  // vlastní položky v sekcích (spojovaci/lakovani = položky ceníku)
  priplatkyVlastni: [], // vlastní příplatkové položky [{nazev, mnozstvi, cena}]
  katalogOdebrane: [],  // kid katalogových položek, které uživatel v této zakázce smazal
  nazvyPrepis: {},      // ruční přejmenování položek { původní název: nový název }
  cenyPrepis: {},       // ruční přepis jedn. ceny u položek bez ceníkové vazby { název: cena }
  poradi: {},           // ruční pořadí řádků v sekcích { sekce: [klíče] } (jen zobrazení)
  skryteProUzivatele: [], // klíče položek skryté běžnému uživateli
  /* Můstek mezi budovou a OCK (#163, 21. 8. 2026). Do té doby existoval jen
   * jako věta v technické specifikaci — bez čísel se nedal hlídat standard
   * („hloubka max 1000 mm, šířka max na šířku OCK"). Do VÝPOČTU nevstupuje:
   * jsou to evidenční údaje pro kontrolu standardu a pro dokument.
   * Prázdné rozměry znamenají „nevyplněno", ne nulu — kontrola standardu je
   * pak hlásí jako „nelze posoudit". */
  mustek: false, mustekHloubkaMm: '', mustekSirkaMm: '',
  volitelneVychozi: {}, // výchozí zaškrtnutí volitelných { klíč: bool }
  /* Skla (vsgFolie, skn) jsou ve výchozím stavu MIMO nabídku (23. 8. 2026,
   * zadání J. V. — řeší nález N7). Šachta se počítá jako ocelová a obchodník
   * do nabídky vloží to sklo, které zákazník chce; dokud žádné nevloží,
   * kontrola standardu neřeší „dvě skla" a nehlásí „nelze posoudit". Jsou to
   * PŘÍPLATKY (nepovinné), takže se tím nemění základní cena, jen výchozí
   * obsah nabídky. Vložení skla = odškrtnutí ze sloupce Nabídka. */
  priplatkyVynechat: ['vsgFolie', 'skn'], // klíče příplatků mimo výchozí nabídku
  /* Položky, které se v TÉTO zakázce nepočítají (21. 8. 2026, zadání J. V.:
   * „přidej ke všem položkám kalkulace OCK možnost zaškrtnout výchozí
   * počítání"). Seznam PŮVODNÍCH názvů řádků; prázdný seznam = počítá se
   * všechno, tedy přesně dnešní chování a Model 1 se nemění ani o korunu.
   * Vyplňuje ho sloupec Výchozí u nové zakázky (zobrazeniVychoziAplikuj). */
  nepocitat: [],
};

function vypocet(zadani, cenik, jekly, fixes = true) {
  const z = zadani, c = cenik;
  const ext = z.typSachty === 'exteriérová';
  const D16 = ext ? 0 : 1;              // Excel konvence: 1=interiér, 0=exteriér
  const zapusteny = z.typPortalu === 'zapuštěný';
  const terce = z.zaskleni === 'na terče';
  const svetlik = z.svetlikNadDvermi ? 1 : 0;

  const jekl = (p) => {
    const j = jekly[p.dim];
    if (!j) throw new Error('Neznámá dimenze profilu: ' + p.dim);
    const kg = j.kg[String(p.tl)];
    if (kg == null) throw new Error(`Dimenze ${p.dim} nemá tloušťku ${p.tl} mm`);
    return { kg, m2: j.m2, A: j.A, B: j.B };
  };

  /* ---------- odvozené parametry ---------- */
  const H = z.prejezd + z.zdvih + z.prohluben;         // výška šachty
  /* VÝŠKA PODLAŽÍ SE POČÍTÁ Z PATER, NE Z NÁSTUPIŠŤ (9. 9. 2026).
   *
   * Do 9. 9. tu stálo `z.zdvih / (z.nastupiste - 1)`, protože platilo
   * „jedno nástupiště = jedno patro". U průchozí šachty to přestává platit:
   * patro má nástupiště na čelní i na zadní stěně, takže nástupišť je až
   * dvakrát tolik co pater a výška podlaží by vyšla poloviční. Počet pater
   * proto u průchozí šachty zadává obchodník (postřeh J. V. 9. 9. 2026);
   * u běžné šachty se dál bere počet nástupišť, takže se nemění ani koruna.
   *
   * Pod dvě patra se nedělí: při jednom patře by šlo o dělení nulou
   * a při nule o záporné číslo, které by prolezlo do všech navazujících
   * rozměrů. Nula je poctivější — je vidět, že zadání není hotové. */
  /* Počet nástupišť se od 9. 9. 2026 bere přes `nastupisteCelkem` — u průchozí
   * šachty je to součet čelní (A) a zadní (C) stěny, jinde přesně to, co je
   * v zadání. Celý výpočet dál pracuje s tímhle jedním číslem. */
  const nastupist = nastupisteCelkem(z);
  const pater = patraProVypocet(z);
  /* Nástupiště na ZADNÍ stěně (nález V37, 14. 9. 2026). U neprůchozí šachty
   * je jich nula, takže se všechno, co na tomhle čísle visí, chová přesně
   * jako dosud — to je podmínka, aby se nepohnuly ceny stávajících zakázek. */
  const nastupistC = (z.pruchoziSachta && (+z.nastupisteC || 0) > 0) ? (+z.nastupisteC || 0) : 0;
  const vyskaPodlazi = pater >= 2 ? z.zdvih / (pater - 1) : 0;
  const svetlaVyska = vyskaPodlazi - 0.2;
  const vyskaProsklene = z.zdvih + z.prejezd;
  const sirkaDveri = (z.cistyVstupMm + 2 * z.sirkaRamuMm + 2 * 20) / 1000;
  /* LEŠENÍ U-DOKOLA — odstup od šachty (nález V2, rozhodnuto J. V. 14. 9. 2026).
   *
   * Referenční odstup je 0,25 m podle novější předlohy 01/2026; soubor
   * Kornpfortstraße s 0,20 m je odchylka jednoho souboru, ne jiné pravidlo
   * (doloženo v test_kornpfortstrasse.js). Hodnota byla dosud zapsaná přímo
   * ve vzorci, takže se při hledání „jak se to počítá" pletla s jinými
   * dvacetinami v kódu (0,2 u sloupků, 0,2 u závitových tyčí). Teď je
   * pojmenovaná a stojí na jednom místě. */
  const leseniVez = H;
  const leseniU = (z.sirka + 0.5 + 2 * (z.hloubka + LESENI_ODSTUP_M)) * (z.prejezd + z.zdvih);

  /* ---------- hodiny navíc (montáž) ---------- */
  const hn = {
    vyska: (H - 21) * 0.5,
    sirka: z.sirka <= 2 ? 0 : H * 0.2,
    hloubka: z.hloubka <= 2 ? 0 : H * 0.2,
    sloupky: z.rohoveSloupky > 4 ? 8 + 4 + Math.max((H - 21) * 0.5, 0) * 2 : 0,
    nastupiste: nastupist - 6,
    exterier: D16 === 1 ? 0 : 8 + (H - 21) * 0.5 * 1.5,
    portaly: zapusteny ? 0 : nastupist,
    svetlik: (svetlik - 1) * nastupist * 0.2,
    svetlikyBoky: z.svetlikyBoky * 0.5 * nastupist,
  };
  const hodinyNavic = Object.values(hn).reduce((a, b) => a + b, 0);

  /* ---------- parametry konstrukce ---------- */
  const ramy = Math.ceil(H / z.roztec + 2 - 1e-9) + Math.abs(1 - D16); // počet rámů
  const portPricniky = 3 * nastupist;
  const sloupkyPortalu = nastupist * z.svetlikyBoky;
  const kratkePricniky = sloupkyPortalu * 2;
  const spojky = Math.ceil(H / 4 - 1e-9) * z.rohoveSloupky + z.rohoveSloupky;
  const pocetCilek = (ramy * 6 + portPricniky * 2 + kratkePricniky) * D16;

  /* ---------- profily (délky, hmotnosti, plochy) ---------- */
  const jSl = jekl(z.profily.sloupek), jPb = jekl(z.profily.precnikBok),
        jSp = jekl(z.profily.sloupekPortal), jPp = jekl(z.profily.precnikPortal),
        jSpj = jekl(z.profily.spojka), jLem = jekl(z.profily.lemovani);

  const dSloupky = H * z.rohoveSloupky - 0.2 * z.rohoveSloupky;
  const dPricniky = (2 * z.hloubka + z.sirka) * ramy + z.sirka;
  const dSloupkyPortalu = 2.2 * nastupist * z.svetlikyBoky + (zapusteny ? 0 : nastupist * svetlaVyska * 2);
  const dPricnikyPortalu = portPricniky * z.sirka + sloupkyPortalu * (z.sirka - sirkaDveri) * 2;
  const dSpojky = spojky * 0.4;
  const dLemovani = ext ? 3 * H : 0;

  const profilyRows = [
    { nazev: 'Profil - sloupek',            m: dSloupky,          j: jSl },
    { nazev: 'Profil - příčníky bok/zadek', m: dPricniky,         j: jPb },
    { nazev: 'Profil - sloupek portálu',    m: dSloupkyPortalu,   j: jSp },
    { nazev: 'Profil - příčníky portálu',   m: dPricnikyPortalu,  j: jPp },
    { nazev: 'Profil - spojka sloupků',     m: dSpojky,           j: jSpj },
  ].map(r => ({ ...r, kg: r.m * r.j.kg, m2: r.m * r.j.m2 }));

  let profM = profilyRows.reduce((a, r) => a + r.m, 0);
  let profKg = profilyRows.reduce((a, r) => a + r.kg, 0);
  let profM2 = profilyRows.reduce((a, r) => a + r.m2, 0);
  const rezP = z.rezervaProfilyPct;
  profM *= 1 + rezP; profKg *= 1 + rezP; profM2 *= 1 + rezP;
  const lemKg = dLemovani * jLem.kg, lemM2 = dLemovani * jLem.m2;

  /* ---------- plechy (spoje) ---------- */
  const strana = ext ? 'ext' : 'int';
  const spojeRows = [
    { key: 'zadniRoh',       spoju: ramy * 2 },
    /* Spoje čelní strany se u PRŮCHOZÍ šachty počítají dvakrát (nález V37,
     * 14. 9. 2026): portály jsou na obou stěnách, takže i spoje. Neprůchozí
     * šachta a průchozí bez nástupišť C vycházejí přesně jako dosud. */
    { key: 'celni',          spoju: ((ramy - 1) * 2 - 2) * (nastupistC > 0 ? 2 : 1) },
    { key: 'predsazene',     spoju: zapusteny ? 0 : 8 * nastupist },
    { key: 'portPricniky',   spoju: portPricniky * 2 + kratkePricniky },
    { key: 'sloupkyPortalu', spoju: sloupkyPortalu },
    { key: 'spodniRamRoh',   spoju: 4 },
    { key: 'kotveni',        spoju: nastupist + 1 },
  ].map(r => {
    const s = SPOJE[r.key];
    // Oprava chyb šablony: D51/D52 měly obrácenou podmínku int/ext, G52 odkazoval na prázdné $D$3
    let ksNa1, kgNa1, m2Na1;
    if (fixes) {
      ksNa1 = s[strana].ks; kgNa1 = s[strana].kg; m2Na1 = s[strana].m2;
    } else {
      const inv = (r.key === 'spodniRamRoh' || r.key === 'kotveni');
      ksNa1 = inv ? (ext ? s.int.ks : s.ext.ks) : s[strana].ks;
      kgNa1 = s[strana].kg;
      m2Na1 = (r.key === 'kotveni') ? s.ext.m2 : s[strana].m2; // $D$3 bug -> vždy ext
    }
    return { key: r.key, spoju: r.spoju, ks: ksNa1 * r.spoju, kg: kgNa1 * r.spoju, m2: m2Na1 * r.spoju };
  });
  const cilkaKg = pocetCilek * 0.12;
  let plechyKs = spojeRows.reduce((a, r) => a + r.ks, 0) + pocetCilek;
  let plechyKg = spojeRows.reduce((a, r) => a + r.kg, 0) + cilkaKg;
  let plechyM2 = spojeRows.reduce((a, r) => a + r.m2, 0);
  const rezPl = z.rezervaPlechyPct;
  const plechyKgRez = plechyKg * (1 + rezPl);

  /* ---------- terče / lišty / oplechování ---------- */
  const tercuBok = z.hloubka > 1.7 ? 3 : 2, tercuCelo = z.sirka > 1.7 ? 3 : 2;
  const terceKs = terce ? ramy * (tercuBok * 2 + tercuCelo) + tercuCelo * (portPricniky - nastupist) + kratkePricniky : 0;
  const terceKg = terceKs * 0.15, terceM2 = terceKs * 0.008;

  const listyKs = terce ? 0 : ramy * 12 + svetlik * nastupist * 4 + kratkePricniky * 4;
  const listyBm = terce ? 0
    : (ramy - 1) * (z.hloubka * 6 + (z.sirka + z.hloubka * 2) * 2)
      + svetlik * nastupist * (z.sirka + svetlaVyska - 2.2) * 2
      + kratkePricniky * (1.1 + (z.sirka - sirkaDveri)) * 2;
  const listaKgBm = 8500 * ((20 / 1000 + 10 / 1000) * 1 / 1000);
  /* KOTVÍCÍ LIŠTY (nález V1, 2. 9. 2026 — zakázky CN-0348 i 2025-OPR-0640).
   * Předloha (list VZORCE, C60 = C59 a D60 = C60 × 0,1) bere 10 % z POČTU
   * KUSŮ a výsledek sečte s metry: dimenzionálně to nesedí, ale Model 1 je
   * 1:1 s předlohou VČETNĚ jejích chyb — to je celý smysl toho přepínače.
   * Model 2 počítá 10 % z DÉLKY, což ten řádek evidentně měl znamenat.
   * Ověřeno ve dvou různých zákaznických souborech, shodně (kusy).
   *
   * ROZHODNUTO (nález V25, J. V. 17. 9. 2026, varianta B): „správný je
   * výpočet Model 2: +10 % z délky a dále pracovat v bm."
   *
   * Tím se uzavírá rozpor předlohy, která si odporovala sama: v C60 vykazuje
   * kotvicí lišty 1 : 1 k vnějším (KALKULÁK C127 sčítá 204 + 204 = 408 ks),
   * ale do DÉLKY přičte jen 10 %. Obojí platit nemůže. Platí ta desetina:
   * kotvicí lišta NENÍ samostatný kus ke každé vnější, je to přídavek
   * materiálu na kotvení — a přídavek se měří v metrech, ne v kusech.
   *
   * `listyKs` proto počítá VÝHRADNĚ vnější lišty a kotvicí do něj nepatří.
   * Kdo by ho chtěl „opravit" na 408, ať nejdřív čte tenhle odstavec: byla
   * by to změna ceny (dvojnásobek metrů i kilogramů), ne oprava výkazu.
   * Hlídá `src/test_listy_kotvici.js`. */
  const listyKotviciBm = fixes ? listyBm * 0.1 : listyKs * 0.1;
  const listyCelkBm = listyBm + listyKotviciBm;
  const listyKg = listaKgBm * listyCelkBm;

  const oplDvereKs = 3 * nastupist;
  const oplDvereBm = (2.3 * 2 + sirkaDveri) * nastupist;
  const oplDvereKg = oplDvereBm * 0.8925, oplDvereM2 = oplDvereBm * 0.21;

  const podestKs0 = nastupist - 1;
  const podKg1 = 8.5 * (z.sirka + 0.06) * (vyskaPodlazi - svetlaVyska + 0.06);
  const podM21 = (z.sirka + 0.06) * (vyskaPodlazi - svetlaVyska + 0.06) * 2;
  const podestKs = podestKs0 * D16, podestKg = podKg1 * podestKs0 * D16, podestM2 = podM21 * podestKs0 * D16;

  const prechodoveAno = z.volitelne.prechodove == null ? z.prechodovePlechy : z.volitelne.prechodove;
  /* PLECHY MAJÍ VŽDY DVĚ POLOŽKY (16. 9. 2026, vyjádření J. V. z 5. kola:
   * „Pokud jsou zaškrtnuté plechy, pak vždy musí být zaškrtnuta i jejich
   * montáž a vice versa. Tzn. Plechy mají vždy 2 položky. Uprav.").
   *
   * Montáž měla od 11. 8. 2026 vlastní přepínač, aby šla objednat bez
   * materiálu. V praxi to znamenalo, že odškrtnutí plechů v Zadání šachty
   * nechalo montáž zaškrtnutou a ta šla do základní ceny za nástupiště,
   * přestože se žádné plechy nedodávaly — nález 5. kola. Montáž se proto
   * řídí VÝHRADNĚ materiálem a samostatně ji zapnout nejde.
   *
   * NOVÉ PRAVIDLO PLATÍ JEN PRO NOVÉ ZAKÁZKY (rozhodnutí J. V. 16. 9. 2026:
   * „nové pravidlo bude platit jen pro nové zakázky. zpětně neřeš."). Kdo
   * montáž ručně vypnul za starých pravidel, má `volitelne.prechMont` zapsané
   * — a takové zakázce se cena nemění, dokud se jí nikdo nedotkne. Nová
   * zakázka má v tom poli null a řídí se materiálem.
   *
   * Jakmile ale obchodník na plechy v takové zakázce klikne, pole se zahodí
   * (viz `volitelneToggle`) a zakázka přejde pod nové pravidlo. Bez toho by
   * v ní zůstal duch: montáž natrvalo vypnutá a žádný přepínač, kterým to
   * vrátit — samostatné zaškrtávátko montáže už neexistuje. */
  const prechMontAno = (z.volitelne.prechMont != null) ? !!z.volitelne.prechMont : prechodoveAno;
  /* MNOŽSTVÍ SE ŘÍDÍ TÝMŽ PŘEPÍNAČEM JAKO ZAHRNUTÍ (16. 9. 2026, nález J. V.:
   * „stále nám nefunguje zaškrtávání výchozích položek").
   *
   * Plechy mají dva přepínače: jeden v zadání šachty (`z.prechodovePlechy` —
   * „jsou tam vůbec?") a jeden ve Volitelných (`z.volitelne.prechodove` —
   * „v základní ceně, nebo za příplatek?"). O ZAHRNUTÍ rozhodoval ten druhý,
   * o MNOŽSTVÍ pořád ten první. Se zadáním vypnutým se tedy položka po
   * zaškrtnutí sice započetla, ale s množstvím 0 — a zároveň zmizela
   * z příplatků, protože zaškrtnutá položka se odtamtud vypouští.
   * Zákazník ji tak nedostal nabídnutou ANI ji nezaplatil v základní ceně.
   * Zaškrtávátko vypadalo, že nefunguje; ve skutečnosti ovládalo jen půlku.
   *
   * `prechodoveAno` je efektivní odpověď na „jsou tam plechy" — zaškrtnutím
   * ve Volitelných obchodník říká, že ano. Množství se proto počítá z něj.
   * Montáž má od 11. 8. 2026 vlastní přepínač právě proto, aby šla objednat
   * bez materiálu; kdyby se její množství dál řídilo materiálem, zůstala by
   * v tom případě na nule a ten přepínač by byl k ničemu. */
  const prechKs = prechodoveAno ? nastupist : 0;
  const prechKsMont = prechMontAno ? nastupist : 0;
  const prechKg1 = 8500 * (0.1 * sirkaDveri * 0.002);
  const prechKg = prechKg1 * prechKs;

  /* ---------- spojovací materiál ---------- */
  const riplockM10 = (D16 === 1 ? 16 : 48) * ramy + portPricniky * 2 + sloupkyPortalu * 2 + spojky * 6 + nastupist * 8;
  const riplockM8 = spojky * 6 + sloupkyPortalu * 4;
  const nordlock = pocetCilek * 2;
  const sroubM6 = terceKs * 2;
  const sp = c.spojovaci;
  const spojovaciRows = [
    ['riplock M10', riplockM10, sp.riplockM10], ['riplock M8', riplockM8, sp.riplockM8],
    ['NordLock', nordlock, sp.nordlock], ['nýtovací matice M10', riplockM10 + nordlock, sp.nytM10],
    ['nýtovací matice M8', riplockM8, sp.nytM8], ['nýtovací matice M6', sroubM6, sp.nytM6],
    ['T šrouby', (ramy + 2) / 2 * 4 + nastupist * 4, sp.tSrouby],
    ['Šrouby M10', riplockM10 + nordlock, sp.sroubM10], ['Šrouby M8', riplockM8, sp.sroubM8],
    ['Šrouby M6', sroubM6, sp.sroubM6],
    ['Závitové tyče M12', Math.ceil((nastupist + 1) * 4 * 0.2 + 0.8 - 1e-9), sp.zavitTyc],
    ['Chem. kotvy', nastupist + 2, sp.chemKotva],
  ].map(([nazev, ks, cena]) => ({ nazev, ks, cena, celkem: ks * cena }));
  // vlastní položky spojovacího materiálu z ceníku (katalog / zakázka)
  const vlSpoj = (z.vlastniPolozky && Array.isArray(z.vlastniPolozky.spojovaci)) ? z.vlastniPolozky.spojovaci : [];
  vlSpoj.forEach(vl => spojovaciRows.push({
    nazev: vl.nazev, ks: +vl.mnozstvi || 0, cena: +vl.cena || 0,
    celkem: (+vl.mnozstvi || 0) * (+vl.cena || 0), vlastni: true,
  }));
  const spojovaciKc = spojovaciRows.reduce((a, r) => a + r.celkem, 0);
  const nytovaniKs = (riplockM10 + nordlock) + riplockM8 + sroubM6;

  /* ---------- lakování ---------- */
  const lakProfM2 = profM2 + (fixes ? lemM2 : 0);
  const lakProfBm = profM + (fixes ? dLemovani : 0);
  const lakOplechM2 = oplDvereM2 + (fixes ? podestM2 : podM21 * podestKs0); // šablona podesty negatuje jen v ceně, ne v lakování
  const lakPlechKs = plechyKs, lakPlechM2 = plechyM2;
  const L = c.lak;
  const lakovna = L.lakovnaProfilBm * lakProfBm + L.lakovnaListaBm * listyCelkBm
    + L.lakovnaM2 * (lakPlechM2 + lakOplechM2 + terceM2);
  const tomas = L.tomasProfilM2 * lakProfM2 + L.tomasListaBm * listyCelkBm
    + L.tomasPlechKs * lakPlechKs + L.tomasOplechM2 * lakOplechM2 + L.tomasTercKs * terceKs;
  // vlastní položky lakování z ceníku (katalog / zakázka) – přičítají se k oběma režimům
  const vlLakRows = ((z.vlastniPolozky && Array.isArray(z.vlastniPolozky.lakovani)) ? z.vlastniPolozky.lakovani : [])
    .map(vl => ({ nazev: vl.nazev, ks: +vl.mnozstvi || 0, cena: +vl.cena || 0,
                  celkem: (+vl.mnozstvi || 0) * (+vl.cena || 0), vlastni: true }));
  const lakVlastniKc = vlLakRows.reduce((a, r) => a + r.celkem, 0);
  const lakovaniKc = (L.rezim === 'tomas' ? tomas : lakovna) + lakVlastniKc;

  /* ---------- zasklení ---------- */
  const Asl = jSl.A / 1000, Bsl = jSl.B / 1000, Bpr = jPb.B / 1000, Apr = jPb.A / 1000;
  const gTerc = { hl: z.hloubka + Bpr * 2 - 0.01, sir: z.sirka + Bpr * 2 + 0.02, vys: z.roztec - 0.016 };
  const gLis = { hl: z.hloubka - Asl / 2 - 0.008, sir: z.sirka - Bsl * 2 - 0.008, vys: z.roztec - Apr - 0.008 };
  const g = terce ? gTerc : gLis;
  const zadniKs = Math.ceil(vyskaProsklene / z.roztec - 1e-9);
  const zadniM2 = Math.max(zadniKs * g.sir * g.vys, vyskaProsklene * g.sir);
  const bocniKs = zadniKs * 2;
  const bocniHl = fixes ? g.hl : (svetlik ? gTerc.hl : gLis.hl);   // chyba šablony: D19 místo D18
  const bocniM2 = Math.max(bocniKs * g.hl * g.vys, 2 * vyskaProsklene * bocniHl);
  /* SVĚTLÍK SE POČÍTÁ K TÉ STĚNĚ, NA KTERÉ JE NÁSTUPIŠTĚ (#296, rozhodnutí
   * J. V. 22. 9. 2026: „zadní světlíky patří pochopitelně na zadní stěnu").
   *
   * Do 22. 9. stálo na tomhle řádku `svetlik * nastupist`, tedy součet
   * nástupišť A + C. Počet světlíků tím vycházel správně — je jich tolik,
   * kolik je nástupišť —, jenže VŠECHNY se sčítaly do položky „čelní stěna
   * (světlíky)". Zadní stěna si pak svůj pás odečítala, aby se plocha
   * nepočítala dvakrát.
   *
   * Dvě věci na tom byly špatně. Za prvé u průchozí šachty vycházela položka
   * čelní stěny větší než celá čelní stěna (na ostré zakázce 75,16 m² proti
   * 37,9 m²), což je v nabídce i v kontrole standardu nesmysl. Za druhé, a to
   * je ta dražší: čelní a zadní stěna mají u exteriérové šachty jiné sklo
   * a jinou sazbu, takže se zadní světlíky počítaly sazbou čelní stěny.
   *
   * Nástupišť na čelní straně je `nastupist − nastupistC`; u neprůchozí
   * šachty je `nastupistC` nula, takže se pro ni nemění vůbec nic. */
  const svetlikKs = svetlik * Math.max(nastupist - nastupistC, 0);
  /* ZÁPORNÁ PLOCHA SVĚTLÍKŮ — CHYBA PŘEDLOHY (nález N14, 19. kolo testů).
   *
   * Předloha počítá světlík nad dveřmi jako „co zbude nad dveřmi do stropu":
   * šířka tabule × (světlá výška − 2,3). Nehlídá ale, že rozdíl může vyjít
   * ZÁPORNĚ. Jakmile výška podlaží klesne pod 2,5 m, dveře o výšce 2,3 m se
   * do patra nevejdou a vzorec začne sklo ODEČÍTAT: plocha jde do minusu
   * a cena tiše klesá — a to hned třikrát, protože `skloCelniM2` vstupuje
   * i do práce opláštění a u exteriérové šachty do tmelení.
   *
   * Měřeno při zdvihu 12 m a 5 nástupištích se světlíkem nad dveřmi:
   *   5 pater → výška podlaží 3,00 m → +4,95 m²
   *   6 pater → 2,40 m → −0,99 m²
   *   8 pater → 1,71 m → −7,78 m²
   *   1 patro → 0 m    → −24,75 m²
   * Od v9.9.5 se počet pater u průchozí šachty zadává ručně, takže takový
   * vstup vznikne snadno.
   *
   * ROZHODNUTÍ J. V. 14. 9. 2026: „opravu světlíků proveď jen v modelu 2.
   * Model 1 ponech 1:1 a tuto chybu v něm zaeviduj."
   *
   * Model 1 tedy ZÁMĚRNĚ počítá dál i se zápornou plochou — je to chyba
   * předlohy a kompatibilní režim má být 1:1 s předlohou včetně jejích chyb,
   * jinak přepínač ztrácí smysl. Že se tak opravdu chová, drží test
   * v src/test_pruchozi_zadni.js; kdyby se to někdo pokusil „opravit"
   * i v Modelu 1, sada padne.
   *
   * Týká se to JEN zakázek se zaškrtnutým světlíkem nad šachetními dveřmi
   * (bez něj je `svetlikKs` nula). Nové nabídky ho mají od v9.9.6 odškrtnutý,
   * starší zakázky zaškrtnutý — tam to tedy hrozí. */
  const svetlikVyskaM = svetlaVyska - 2.3;
  const svetlikM2 = svetlikKs * g.sir * (fixes ? Math.max(svetlikVyskaM, 0) : svetlikVyskaM);
  const svetlikBokKs = kratkePricniky;
  const svetlikBokM2 = svetlikBokKs * ((g.sir - sirkaDveri - 0.04) / Math.max(1, z.svetlikyBoky)) * 1.1;

  /* PRŮCHOZÍ ŠACHTA: ZADNÍ STĚNA NENÍ CELÁ PROSKLENÁ (nález V37, 14. 9. 2026).
   *
   * Rozhodnutí J. V.: „U průchozí šachty se musí v případě nástupišť počítat
   * s tím, že v nich jsou portály + světlíky. Ostatní patra se počítají jako
   * plné zasklení."
   *
   * Do 14. 9. se zadní stěna zasklívala jako plná stěna i tam, kde do ní
   * vedou dveře — průchozí 2+2 vycházela na sklo úplně stejně jako neprůchozí
   * se čtyřmi nástupišti. Nástupiště na zadní stěně přitom znamená otvor:
   * sklo v něm není a nad ním je světlík, přesně jako na stěně čelní.
   *
   * Model je záměrně týž jako u čelní stěny, aby se obě stěny nepočítaly
   * každá jinak:
   *   – otvor = šířka dveřního otvoru × 2,3 m (táž výška, s jakou počítá
   *     oplechování dveří i sloupky portálu).
   *
   * ODEČÍTAJÍ SE JEN DVEŘE, NE PÁS NAD NIMI (#296, rozhodnutí J. V.
   * 22. 9. 2026: „zadní světlíky patří pochopitelně na zadní stěnu").
   *
   * Vývoj tohohle místa stojí za přečtení, protože se sem dvakrát vracelo
   * totéž z opačné strany:
   *
   *   · do 15. 9. 2026 se odečítal jen dveřní otvor po 2,3 m, ale pás nad
   *     ním se ZÁROVEŇ počítal jako světlík v čelní stěně (`svetlikKs` stál
   *     na součtu nástupišť A + C). Tatáž plocha byla v ceně dvakrát —
   *     na zadání 9001 to dělalo 75,49 m² místo 68,69;
   *   · 15. 9. (nález O10/V40) se proto pás od zadní stěny odečetl. Dvojí
   *     počítání zmizelo, jenže plocha zůstala v položce ČELNÍ stěny —
   *     a ta u průchozí šachty vycházela větší než celá čelní stěna;
   *   · 22. 9. se světlíky rozdělily podle stěn (viz `svetlikKs` výš).
   *     Zadní pás tím přestal být v čelní položce, takže se od zadní stěny
   *     nemá co odečítat: je to obyčejné sklo zadní stěny nad dveřmi.
   *
   * Zůstává tedy odečet dveří. Plocha pásu se dál vypisuje v Detailu
   * výpočtu (`svetlikyZadni`) — je užitečné vidět, kolik ze zadního skla
   * leží nad dveřmi —, ale do odečtu nevstupuje.
   *
   * Neprůchozí šachta a průchozí s nulou nástupišť C musí vyjít přesně jako
   * dosud: `nastupistC` je pak 0 a obě čísla níž vycházejí na nulu. */
  const zadniOtvorM2 = sirkaDveri * 2.3;
  const svetlikZadniKs = svetlik * nastupistC;
  const svetlikZadniM2 = svetlikZadniKs * g.sir * (fixes ? Math.max(svetlikVyskaM, 0) : svetlikVyskaM);
  const zadniPortalyM2 = nastupistC * zadniOtvorM2;
  /* Ubrat nejde víc, než na stěně je — u nízké šachty s mnoha nástupišti by
   * jinak vyšlo záporné sklo. */
  const zadniPlneM2 = Math.max(zadniM2 - zadniPortalyM2, 0);

  /* ---------- plocha zasklení PO STĚNÁCH (#268, 18. 9. 2026) ----------
   *
   * PŘÍPRAVNÝ KROK, KTERÝ NESMÍ ZMĚNIT ANI HALÉŘ. Připravovaný režim
   * „opláštění po stěnách" (viz NAVRH_ZASKLENI_PROHLUBNE) potřebuje u každé
   * stěny vlastní typ a rozsah. Dnes se ale plocha počítá ze tří čísel, ve
   * kterých se OBĚ BOČNÍ STĚNY sčítají dohromady — B a D tedy nejde
   * rozlišit. Tenhle krok je rozpojí a nic víc; součty zůstávají stejné,
   * takže regrese na uložených zakázkách musí sedět na haléř.
   *
   * Značení podle zadání J. V.: stojím na nástupišti čelem ke dveřím,
   *   A = čelní (dveře)   B = boční   C = zadní   D = boční
   * po směru hodinových ručiček. Táž abeceda jako u nástupišť A/C.
   *
   * POZOR NA DĚLENÍ DVĚMA. `bocniM2` má v sobě `Math.max` přes OBĚ stěny
   * najednou — počítá se maximum ze součtu tabulí a ze součinu výšky,
   * nikoli maximum po jedné stěně. Půlka výsledku je proto jediný věrný
   * způsob, jak z toho udělat dvě stěny; kdyby se `Math.max` počítal zvlášť
   * pro B a D, vyšlo by u některých zadání jiné číslo. Rozpojení podle
   * skutečných rozměrů přijde na řadu teprve s režimem po stěnách, kde
   * se stejně bude počítat po pásech.
   *
   * Portály a světlíky: A nese světlík nad dveřmi i po stranách; C už má
   * své portály odečtené v `zadniPlneM2`. */
  const skloStenaB = bocniM2 / 2;
  const skloSteny = {
    A: svetlikM2 + svetlikBokM2,
    B: skloStenaB,
    C: zadniPlneM2,
    D: skloStenaB,
  };

  const skloBokyZadniM2 = skloSteny.B + skloSteny.D + skloSteny.C;
  const skloCelniM2 = skloSteny.A;
  const skloCelkemM2 = skloBokyZadniM2 + skloCelniM2;
  const skloRada = skloVolba(z, c);   // typ skla podle šachty a zasklení (9. 9. 2026)

  /* ---------- ZÁKLAD PLOCHY PRO REŽIM PO STĚNÁCH (#295) ----------
   *
   * ROZHODNUTÍ J. V. 21. 9. 2026, varianta (b): „otvory dveří a portálů
   * odečti".
   *
   * `skloSteny.A` je plocha SKLA v čelní stěně, jak ji zná standardní model —
   * tedy jen světlík nad dveřmi a po stranách. To je pro standard správně:
   * zbytek čelní stěny zabírají dveře a portály, které se nesklí. V režimu po
   * stěnách si ale obchodník vybírá opláštění pro CELOU stěnu, takže u šachty
   * bez světlíků vycházela čelní stěna na NULU (#294) — sklo přes celou stěnu
   * bylo zdarma.
   *
   * Nově se u čelní stěny bere plocha celé stěny MÍNUS dveřní otvory. Vzorec
   * není nový: přesně takhle se už počítá ZADNÍ stěna u průchozí šachty
   * (`zadniPlneM2` pár řádků výš), takže obě strany s nástupišti se teď
   * počítají stejně.
   *
   * Otvor je `sirkaDveri * 2.3`, kde `sirkaDveri` UŽ OBSAHUJE rámy (čistý
   * vstup + 2× šířka rámu + 2× 20 mm), takže „dveře a portály" jsou v tom
   * čísle oba. Nástupišť na čelní straně je `nastupist − nastupistC`:
   * u neprůchozí šachty jsou všechna, u průchozí se ta na zadní straně
   * odečtou — jinak by se na čelní stěně odečetly otvory, které jsou vzadu.
   *
   * STANDARDNÍ MODEL SE TÍM NEMĚNÍ. `skloSteny` zůstává, jak byl; tohle je
   * samostatný základ, který se použije jen v režimu po stěnách. Cena mimo
   * tenhle režim je proto na haléř stejná jako dřív.
   *
   * Vedlejší důsledek, který je potřeba říct nahlas: ZAPNUTÍ REŽIMU PO
   * STĚNÁCH UŽ CENOU HNE — u čelní stěny nahoru. Do 21. 9. 2026 to byla
   * podmínka návrhu; rozhodnutí J. V. ji vědomě ruší, protože „počítá se
   * skutečná plocha". Drží to test_oplasteni_zapnuti.js. */
  const celniOtvoryKs = Math.max(nastupist - nastupistC, 0);
  const oplZakladSteny = {
    A: Math.max(zadniM2 - celniOtvoryKs * zadniOtvorM2, 0),
    B: skloSteny.B,
    C: skloSteny.C,
    D: skloSteny.D,
  };

  /* ---------- OPLÁŠTĚNÍ PO STĚNÁCH (#268, druhý krok) ----------
   *
   * Každá stěna může mít vlastní typ opláštění a rozdělení na pásy.
   * Rozhodnutí J. V. 18. 9. 2026:
   *   · sazby práce a tmelení se počítají PO CELÉ PLOŠE, ne po typech,
   *   · ořez tabulí se řídí tím, co zadá obchodník — dělicí výška platí,
   *     jak ji napsal, a počítá se skutečná plocha.
   *
   * PLOCHA STĚNY SE NEPŘEPOČÍTÁVÁ. Bere se ta, kterou jádro spočítalo
   * dosavadní cestou (`skloSteny`), a pásy si ji dělí POMĚREM VÝŠEK. Je to
   * schválně: dnešní plochy mají v sobě `Math.max` a odečty portálů, takže
   * počítat je znovu jako šířka × výška by dalo jiná čísla a přepnutí režimu
   * by hnulo cenou. Takhle platí, že zapnutí režimu beze změny zadání
   * nezmění ani haléř — a to se dá otestovat.
   *
   * Prohlubeň je jediné místo, kde plocha PŘIBÝVÁ: záporná dolní mez sahá
   * pod úroveň nástupu, kam dnešní výpočet nesahá vůbec. Připočítá se
   * skutečnou šířkou stěny. */
  const OPL_BEZ = 'bez', OPL_JINE = 'jine';
  const oplRezim = ((z.oplasteni || {}).rezim === 'poStenach') ? 'poStenach' : 'standard';
  const stenaSirka = { A: g.sir, B: g.hl, C: g.sir, D: g.hl };
  /* Výchozí typ stěny = to, co by na ní bylo ve standardu. Čelní stěna nese
   * světlíky (celni), ostatní jsou boky a záda. */
  /* Jediné pravidlo pro výpočet i obrazovku — viz `oplasteniVychoziTyp`. */
  const oplVychoziTyp = (k) => oplasteniVychoziTyp(z, c, k);

  function oplPasyStenyM2(k) {
    const st = ((z.oplasteni || {}).steny || {})[k] || null;
    const celkem = oplZakladSteny[k];
    const odM = st ? (+st.odM || 0) : 0;
    /* Pásy zdola nahoru; poslední má `doM: null` = až nahoru. Rozhraní je
     * vypisuje odshora, ale ukládají se takhle — v tomhle pořadí nejde
     * zapsat překryv ani mezeru. */
    const pasy = (st && Array.isArray(st.pasy) && st.pasy.length)
      ? st.pasy : [{ typ: oplVychoziTyp(k), doM: null }];
    const out = [];
    let dolni = odM;                     // záporné = do prohlubně
    pasy.forEach((p, i) => {
      const posledni = (i === pasy.length - 1);
      /* Dělicí výška platí, jak ji obchodník napsal (rozhodnutí J. V.):
       * nezaokrouhluje se na rozteč příčníků. Jen se nepustí pod předchozí
       * pás a nad horní hranu — jinak by pás vyšel záporně. */
      const horni = posledni ? vyskaProsklene
        : Math.min(Math.max(+p.doM || 0, dolni), vyskaProsklene);
      if (horni <= dolni) { dolni = horni; return; }
      /* Nad nulou se bere PODÍL na dnešní ploše stěny, pod nulou skutečná
       * plocha — tam dnešní výpočet nesahá, takže není z čeho brát podíl. */
      const nadNulou = Math.max(horni, 0) - Math.max(dolni, 0);
      const podNulou = Math.min(horni, 0) - Math.min(dolni, 0);
      const m2 = (vyskaProsklene > 0 ? celkem * (nadNulou / vyskaProsklene) : 0)
        + podNulou * stenaSirka[k];
      out.push({ stena: k, typ: String(p.typ || oplVychoziTyp(k)),
        nazev: p.nazev || '', naklad: p.naklad, odM: dolni, doM: horni, m2 });
      dolni = horni;
    });
    return out;
  }

  const oplPasy = oplRezim === 'poStenach'
    ? ['A', 'B', 'C', 'D'].reduce((a, k) => a.concat(oplPasyStenyM2(k)), [])
    : [];

  /* Součet ploch podle TYPU — nabídka se tím nerozdrobí na osm skoro
   * stejných řádků. „bez" se nepočítá nikam: stěnu dodá stavba. */
  const oplPodleTypu = {};
  oplPasy.forEach(p => {
    if (p.typ === OPL_BEZ) return;
    /* U typu „jiné" je součástí klíče i SAZBA, ne jen název (oprava
     * 21. 9. 2026, revize téhož dne).
     *
     * Do té doby se slévaly podle samotného názvu a sazba se brala z PRVNÍHO
     * pásu. Dvě stěny „Trapézový plech" za různou cenu — což je běžné, když
     * je na jedné straně jiná tloušťka nebo povrch — se tak spočítaly obě
     * za tu levnější a nikde to nebylo vidět: v kalkulaci byl jeden řádek
     * se správnou plochou a tichým podhodnocením ceny.
     *
     * Dva řádky se stejným názvem a jinou sazbou vypadají v nabídce divně,
     * ale to je na obchodníkovi, aby je pojmenoval jinak. Tichá ztráta peněz
     * je horší než divně vypadající nabídka. */
    const klic = p.typ === OPL_JINE
      ? (OPL_JINE + ':' + (p.nazev || 'bez názvu') + ':' + (+p.naklad || 0))
      : p.typ;
    if (!oplPodleTypu[klic]) oplPodleTypu[klic] = { typ: p.typ, nazev: p.nazev, m2: 0, naklad: p.naklad };
    oplPodleTypu[klic].m2 += p.m2;
  });
  /* Plocha, ze které se počítá PRÁCE a TMELENÍ: po celé ploše (J. V.), tedy
   * i přes typy — ale bez stěn, které nedodáváme. */
  const oplPlochaCelkem = oplRezim === 'poStenach'
    ? oplPasy.reduce((a, p) => a + (p.typ === OPL_BEZ ? 0 : p.m2), 0)
    : skloCelkemM2;

  /* ---------- montáž + projekce ---------- */
  const montazHod1 = z.montazZakladHod + hodinyNavic + z.montazAtypHod;
  const montazHod = montazHod1 * 4;
  /* Zasklení mezi příčníky = projekce navíc (9. 9. 2026, zadání J. V.:
   * „při zasklení mezi příčníky připočítávej k základu projekce 4 hodiny
   * navíc"). Sklo do rámečku znamená navrhnout a zakreslit lišty, což je
   * práce v kanceláři, ne na stavbě. Hodiny se PŘIČÍTAJÍ k zadání, nezapisují
   * se do něj: pole „Projekce – základ" patří obchodníkovi a přepsat mu ho
   * by znamenalo, že po přepnutí zpět na terče zůstane navýšené. Sazba je
   * v ceníku (C.zaskleniListyProjHod), takže cestuje se zakázkou a jde
   * změnit v Nastavení — stejně jako hodina cesty mimo Prahu u projekce.
   * Prázdná nebo nulová hodnota v ceníku znamená výchozí 4 hodiny (týž vzorec
   * jako u hodiny cesty mimo Prahu): ceník v repozitáři je vynulovaný a starší
   * ceníky položku vůbec nemají — obojí musí počítat stejně jako po vyplnění. */
  const listy = z.zaskleni === 'mezi příčníky';
  const zaskleniProjHod = listy ? (+c.zaskleniListyProjHod || 4) : 0;
  const projekceHod = z.projekceZakladHod + z.projekceAtypHod + zaskleniProjHod;

  /* ---------- položky kalkulace ---------- */
  const m = c.marze;
  /* Rejstřík všech názvů, které v tomhle běhu vznikly – včetně položek, které
   * se nakonec do výsledku nedostanou (nevybrané příplatky). Ruční přepisy
   * (mnozstviPrepis / cenyPrepis / nazvyPrepis) jsou klíčované právě názvem,
   * takže po přejmenování položky v ceníku zůstane přepis viset na klíči, který
   * už nic nepotká. Rejstřík umožňuje takové sirotky najít – viz prepisy.js (#4). */
  const nazvyPolozek = [];
  const zapisNazev = n => { if (n != null && nazvyPolozek.indexOf(n) === -1) nazvyPolozek.push(n); };
  /* Dodatkový text k položce (#267). Bydlí v CENÍKU, aby se u další nabídky
   * předvyplnil sám, ale klíčuje se PŮVODNÍM NÁZVEM POLOŽKY, ne ceníkovou
   * cestou.
   *
   * Proč: dvě různé položky můžou sdílet tutéž sazbu — „MADLA NA BOČNÍCH
   * STĚNÁCH" a „MADLA NA ZADNÍ STĚNĚ" obě počítají z `C.priplatky.madlaBmKc`.
   * S klíčem podle cesty by text napsaný u jedné vyskočil i u druhé, a to
   * jsou v nabídce dva různé výrobky. Název je navíc týž klíč, jakým se už
   * klíčují ruční přepisy množství, cen a názvů — jeden zvyk, ne dva.
   *
   * Čte se přímo z dat: `cenikPopis()` je v jiném modulu a v Node by tu
   * nebyl vidět, takže by jádro v testech vracelo prázdno a v aplikaci text.
   * Jediným zapisovatelem zůstává `cenikPopisNastav()`. */
  const popisZCeniku = (nazev) => {
    if (!nazev || !c || !c.popisy) return '';
    const v = c.popisy[String(nazev)];
    return (typeof v === 'string') ? v : '';
  };
  const mkItem = (nazev, mnozstvi, cena, opts = {}) => {
    zapisNazev(nazev);
    // klíčem pro přepisy je PŮVODNÍ název položky
    // ruční přepis množství (Z.mnozstviPrepis[název]) má přednost před vypočteným
    /* #14 krok 2: „prázdno není nula" — stejná sémantika jako v projekci.
     * Formulář prázdný přepis maže, takže '' sem doteče jen z importu;
     * dřív by z něj bylo množství 0, teď platí spočtené. */
    const prepis = z.mnozstviPrepis ? z.mnozstviPrepis[nazev] : null;
    const prepisJe = (typeof prepisPlati === 'function') ? prepisPlati(prepis) : prepis != null;
    const mn = prepisJe ? +prepis : mnozstvi;
    // jedn. cena: rows s ceníkovou vazbou (opts.cenaPath) berou cenu odtud (obousměrně s ceníkem),
    // ostatní mohou mít ruční přepis Z.cenyPrepis[název]; jinak vypočtená/ceníková cena
    const cenaPrepisSurova = (!opts.cenaPath && z.cenyPrepis) ? z.cenyPrepis[nazev] : null;
    const cenaPrepis = ((typeof prepisPlati === 'function') ? prepisPlati(cenaPrepisSurova)
                        : cenaPrepisSurova != null) ? +cenaPrepisSurova : null;
    const cenaEff = cenaPrepis != null ? cenaPrepis : cena;
    let naklad;
    if (opts.fix != null) naklad = mn * cenaEff + opts.fix;                    // lešení: m×cena + fixní část
    else if (opts.naklad != null && cenaPrepis == null)
      naklad = prepis != null && mnozstvi ? opts.naklad * (mn / mnozstvi) : opts.naklad;
    else naklad = mn * cenaEff;
    const novyNazev = z.nazvyPrepis ? z.nazvyPrepis[nazev] : null;
    return { nazev: novyNazev || nazev, origNazev: nazev, nazevPrepsan: !!novyNazev,
             mnozstvi: mn, mnozstviAuto: mnozstvi, prepsano: prepis != null,
             cena: cenaEff, cenaAuto: cena, cenaPrepsana: cenaPrepis != null, cenaPath: opts.cenaPath || null,
             /* Dodatkový text z ceníku (#267) — stejně jako u příplatků. */
             popisNabidka: popisZCeniku(nazev),
             /* Souhrnný řádek nemá jednu ceníkovou cenu, ale celou skupinu
              * (`C.spojovaci.*`). Nese ji jen pro zobrazení klíče administrátorovi. */
             cenaSkupina: opts.cenaSkupina || null,
             fix: opts.fix != null ? opts.fix : null,
             /* Řádky volitelných položek se NEZAOKROUHLUJÍ. Zaokrouhlení nahoru
              * na tisíce patří jen příplatkům (mkPrip). V jednom konkrétním
              * excelovém souboru (zakázka CN-0327) mělo zaokrouhlení i jedno
              * volitelné — montáž přechodových plechů. Rozhodnutí uživatele
              * z 11. 8. 2026: byla to úprava toho jednoho souboru, ne pravidlo
              * původní šablony, a nenapodobuje se ani v kompatibilním režimu.
              * Kdyby se totéž objevilo i u dalších zakázek, je to naopak signál,
              * že se změnila předloha — a pak se to sem vrátí vědomě. */
             naklad, marze: naklad * m, sMarzi: naklad * (1 + m),
             pozn: opts.pozn || '', vlastni: !!opts.vlastni };
  };
  // vlastní ruční položky dané sekce (z.vlastniPolozky[sek]); starší soubory: volitelneVlastni → volitelne
  const vlastniProSekci = (sek) => {
    let zdroj = (z.vlastniPolozky && Array.isArray(z.vlastniPolozky[sek])) ? z.vlastniPolozky[sek] : [];
    if (sek === 'volitelne' && !zdroj.length && Array.isArray(z.volitelneVlastni)) zdroj = z.volitelneVlastni;
    return zdroj.map((vl, i) => ({
      ...mkItem(vl.nazev, +vl.mnozstvi || 0, +vl.cena || 0,
        { vlastni: true, pozn: vl.kid ? 'trvalá položka z ceníku' : 'ruční položka' }),
      sekce: sek, idx: i, kid: vl.kid || null,
    }));
  };

  /* ATYP položky (#7, zadání z 30. 7. 2026).
   *
   * U atypické zakázky se dělají věci, které v předloze nejsou – netradiční tvar
   * šachty, napojení na stavbu, zámečnina navíc. Do 30. 7. 2026 se jejich cena
   * psala rovnou do zakázky, takže vznikla mimo ceník i mimo výpočet: příště ji
   * nikdo nedohledal a nikdo ji neaktualizoval. Nově cena patří do ceníku
   * (katalogová sekce „atyp"), číslo v zakázce je jen dohoda pro jednu stavbu.
   *
   * Prázdno znamená „platí ceník"; NULA je platný přepis („uděláme zdarma"),
   * proto se tu testuje prázdnota, ne pravdivost – stejně jako u PROJ (#8).
   * (Vlastní název, ať se to netluče s `_prepisPlati` v engine_proj.js –
   *  v sestaveném souboru žijí obě funkce v jednom globálním prostoru.) */
  const _prepisZadan = v => !(v === undefined || v === null || v === '');
  const atypZamecnikPrepsana = _prepisZadan(z.zamecnikAtypKc);
  /* DVA MODELY, DVĚ PRAVIDLA (rozhodnutí J. V. 1. 9. 2026)
   *
   * Zámečník atyp má v datech dvě podoby: starší (počet kusů × ceníková sazba
   * `C.zamecnikAtypKc`) a dnešní (jedna částka `Z.zamecnikAtypKc`, kterou
   * předvyplní ATYP z `C.atypZamecnikKc`). Dokud platily obě naráz, nebylo
   * z ceníku poznat, která z nich zrovna počítá.
   *
   *   MODEL 1 (1:1 jako Excel, fixes = false) — nechává se PŘESNĚ jak byl:
   *     kusy mají přednost a při prázdném poli platí ceníková sazba. Starší
   *     nabídky se tak přepočítají na korunu stejně jako v den, kdy odešly.
   *   MODEL 2 (opravený, fixes = true) — stará podoba V NĚM NENÍ: počítá se
   *     vždy novým způsobem, tedy jedna částka ze zakázky. Prázdné pole
   *     znamená, že řádek nevznikne; ceníková sazba za kus se neuplatní.
   */
  const atypZamecnikSazba = atypZamecnikPrepsana ? (+z.zamecnikAtypKc || 0)
    : (fixes ? 0 : (+c.zamecnikAtypKc || 0));
  /* `atyp` říká „tohle je práce navíc", `bezCeny` říká „a nikdo jí zatím nedal
   * cenu". Bez druhého příznaku by se neoceněná položka tiše sečetla jako nula
   * a nabídka by ji rozdala zdarma; takhle na ni upozorní kontrola před nabídkou.
   * Množství 0 chyba není – to je jen položka, kterou tahle stavba nepotřebuje. */
  const oznacAtyp = r => r && ({ ...r, atyp: true,
    bezCeny: (+r.mnozstvi || 0) > 0 && !((+r.cena || 0) > 0) });

  const plechKey = ext ? 'C.powertechExt' : 'C.powertechInt';
  const hrubaOck = [
    mkItem('PROFILY - HLAVNÍ NOSNÉ PRVKY', profKg, c.profilasKgKc, { cenaPath: 'C.profilasKgKc' }),
    mkItem('PROFILY - MONTÁŽNÍ NOSNÍK', 1, c.montazniNosnik, { cenaPath: 'C.montazniNosnik' }),
    ext ? mkItem('PROFILY - LEMOVÁNÍ ŠACHTY (EXT)', lemKg, c.lemovaniKgKc, { cenaPath: 'C.lemovaniKgKc' }) : null,
    mkItem('PLECHY - HLAVNÍ KONSTRUKČNÍ PLECHY', plechyKgRez, ext ? c.powertechExt : c.powertechInt, { cenaPath: plechKey }),
    mkItem('PLECHY - ZASKLENÍ (TERČE/LIŠTY)', terceKg + listyKg, ext ? c.powertechExt : c.powertechInt, { cenaPath: plechKey }),
    mkItem('PLECHY - OPLECH. DVEŘÍ A PODEST (MATERIÁL)', oplDvereKg + podestKg, ext ? c.powertechExt : c.powertechInt, { cenaPath: plechKey }),
    mkItem('PLECHY - OPLECH. DVEŘÍ A PODEST (PRÁCE)', nastupist * 3, c.oplechPracKc, { cenaPath: 'C.oplechPracKc' }),
    mkItem('PLECHY - OPLECHOVÁNÍ OSTATNÍ (MATERIÁL)', z.oplechOstatniKg, ext ? c.powertechExt : c.powertechInt, { cenaPath: plechKey }),
    mkItem('PLECHY - OPLECHOVÁNÍ OSTATNÍ (PRÁCE)', z.oplechOstatniHod, c.oplechPracKc, { cenaPath: 'C.oplechPracKc' }),
    mkItem('SPOJOVACÍ MATERIÁL', 1, spojovaciKc, { naklad: spojovaciKc, cenaSkupina: 'C.spojovaci.*' }),
    !ext ? mkItem('PRÁCE ZÁMEČNÍKA - SPODNÍ RÁM (INT)', 1, c.spodniRamKc, { cenaPath: 'C.spodniRamKc' }) : null,
    mkItem('PRÁCE ZÁMEČNÍKA - NÝTOVÁNÍ', nytovaniKs, c.nytKc, { cenaPath: 'C.nytKc' }),
    !ext ? mkItem('PRÁCE ZÁMEČNÍKA - ČÍLKA (INT)', pocetCilek, c.cilkoKc, { cenaPath: 'C.cilkoKc' }) : null,
    /* Zámečník atyp — JEDNA ČÁSTKA (17. 8. 2026 večer): pole „množství" z UI
     * zmizelo, zadává se jen částka v Kč (přepis; zaškrtnutí ATYP předvyplní
     * 50 000). Řádek má množství VŽDY 1 a jednotkovou cenu = ta částka.
     * Staré zakázky s uloženými kusy se počítají PŘESNĚ jako dřív — kusy
     * mají přednost, dokud v datech jsou; jinak by se změnily jejich ceny. */
    ((+z.zamecnikAtypKs || 0) && !fixes)
      ? oznacAtyp(mkItem('PRÁCE ZÁMEČNÍKA - OSTATNÍ (ATYP)', z.zamecnikAtypKs, atypZamecnikSazba, { cenaPath: 'Z.zamecnikAtypKc' }))
      : (atypZamecnikPrepsana
        ? oznacAtyp(mkItem('PRÁCE ZÁMEČNÍKA - OSTATNÍ (ATYP)', 1, atypZamecnikSazba, { cenaPath: 'Z.zamecnikAtypKc' }))
        : null),
    mkItem('LAKOVÁNÍ (ŠACHTA, PLECHY, ZASKLENÍ, OPLECHOVÁNÍ)', 1, lakovaniKc, { naklad: lakovaniKc, cenaSkupina: 'C.lak.*' }),
    mkItem('MONTÁŽ NA STAVBĚ', montazHod, c.montazHodKc, { cenaPath: 'C.montazHodKc' }),
    ext ? mkItem('VĚTRACÍ MŘÍŽKA (EXT)', 2, c.vetraciMrizkaKc, { cenaPath: 'C.vetraciMrizkaKc' }) : null,
    mkItem('INTERNÍ TRANSPORT', 2, c.transportKc, { cenaPath: 'C.transportKc' }),
    ext ? mkItem('ZASTŘEŠENÍ ŠACHTY (EXT)', (z.sirka + 0.2) * (z.hloubka + 0.1), c.zastreseniM2Kc, { cenaPath: 'C.zastreseniM2Kc' }) : null,
    ext ? mkItem('OPLECHOVÁNÍ K FASÁDĚ (EXT)', (H - z.prohluben) * 2, c.oplechFasadaBmKc, { cenaPath: 'C.oplechFasadaBmKc' }) : null,
    ...vlastniProSekci('hrubaOck'),
    /* ATYP položky se v nabídce nevydělují do vlastní sekce – zákazník má vidět
     * jednu ocelovou konstrukci, ne účet za „něco navíc". Uvnitř kalkulace je
     * ale poznáme podle příznaku `atyp` a umíme je hlídat. */
    ...vlastniProSekci('atyp').map(oznacAtyp),
  ].filter(Boolean);

  const oplasteni = [
    /* Které sklo kam (9. 9. 2026) rozhoduje typ šachty a způsob zasklení —
     * viz skloVolba(). Názvy řádků nese táž funkce, protože se na ně věší
     * ruční přepisy i vyřazení položek. */
    /* REŽIM PO STĚNÁCH (#268): místo dvou řádků podle `skloVolba()` vznikne
     * jeden řádek na každý POUŽITÝ typ. Nerozdrobí se tím nabídka: stěny se
     * sečtou podle typu, ne podle písmene. Ve standardu zůstává všechno
     * přesně jako dosud. */
    ...(oplRezim === 'poStenach'
      ? oplRadky(oplPodleTypu, mkItem, c)
      : [mkItem(skloRada.boky.nazev, skloBokyZadniM2, skloRada.boky.kc, { cenaPath: skloRada.boky.cesta }),
         mkItem(skloRada.celni.nazev, skloCelniM2, skloRada.celni.kc, { cenaPath: skloRada.celni.cesta })]),
    /* Práce i tmelení se počítají PO CELÉ PLOŠE, ne po typech (rozhodnutí
     * J. V. 18. 9. 2026) — proto `oplPlochaCelkem`, která je ve standardu
     * totožná se `skloCelkemM2`. */
    mkItem('PRÁCE OPLÁŠTĚNÍ', oplPlochaCelkem, c.praceOplasteniKc, { cenaPath: 'C.praceOplasteniKc' }),
    mkItem('PLASTOVÉ KOTVY', terce ? 1 : 0, c.plastKotvyKc, { cenaPath: 'C.plastKotvyKc' }),
    ext ? mkItem('TMELENÍ (MAT. + PRÁCE) (EXT)', oplPlochaCelkem, c.tmeleniKc, { cenaPath: 'C.tmeleniKc' }) : null,
    /* STŘÍŠKA JE POČET KUSŮ, NE ZAŠKRTÁVÁTKO (9. 9. 2026, zadání J. V.).
     *
     * Do 9. 9. ji zapínala „Průchozí šachta" a byla vždy právě jedna, a jen
     * u exteriérové. Obojí padlo: stříšek může být víc (2 ks = dvojnásobný
     * náklad i cena) a být můžou i u interiérové šachty — „za určitých
     * okolností může být stříška i u interiéru". Nula znamená žádnou, takže
     * se řádek do kalkulace nedostane vůbec a nesvítí tam prázdná položka. */
    (+z.striskaKs || 0) > 0
      ? mkItem('STŘÍŠKA NAD NÁSTUPIŠTĚ', +z.striskaKs || 0, c.striskaDvurKc, { cenaPath: 'C.striskaDvurKc' })
      : null,
    mkItem('CESTOVNÍ NÁKLADY', 1, c.cestovniKc, { cenaPath: 'C.cestovniKc' }),
    mkItem('ČIŠTĚNÍ', 1, c.cisteniKc, { cenaPath: 'C.cisteniKc' }),
    ...vlastniProSekci('oplasteni'),
  ].filter(Boolean);

  /* Příplatkové sazby. Deklarované až tady nahoře proto, že od 11. 8. 2026
   * je potřebují i dvě volitelné položky (montáž přechodových plechů a lešení
   * pro dokončení hlavy) — sazba je pro obě varianty táž a nemá být dvakrát. */
  const pp = c.priplatky;

  // ---------- VOLITELNÉ: katalog všech dostupných položek + příznak „zahrnuto“ (checkbox v tabulce) ----------
  const v = z.volitelne;
  /* `prip` = klíč PŘÍPLATKU, který tuhle položku zastupuje, když není
   * zaškrtnutá (16. 9. 2026). Položka totiž žije na dvou místech: ve
   * VOLITELNÝCH je součástí základní ceny, v PŘÍPLATCÍCH si ji zákazník
   * doobjedná. Zaškrtnutím se z příplatků vypustí, aby se nepočítala
   * dvakrát — řádky `v.klic ? null : mkPrip(...)` níž.
   *
   * Do 16. 9. 2026 tenhle příznak neexistoval a tabulka příplatků si
   * dvojdomé položky poznávala podle názvu (`/LEŠENÍ/i`). Fungovalo to jen
   * u lešení; přechodové plechy jsou dvojdomé taky a věta pod tabulkou
   * o nich mlčela. Klíč je jednoznačný a nezmění se přejmenováním položky.
   * Že oba seznamy souhlasí, hlídá test_priplatky_volitelne.js. */
  const volKatalogDef = [
    { key: 'prechodove', mk: () => mkItem('PŘECHODOVÉ PLECHY - NEREZ', prechKg, c.prechodoveKgKc, { cenaPath: 'C.prechodoveKgKc' }), zahrnuto: prechodoveAno, dostupne: true, prip: 'prechMat' },
    { key: 'leseniVnitrni', mk: () => mkItem('LEŠENÍ - vnitřní', leseniVez, c.leseniVnitrniKc, { cenaPath: 'C.leseniVnitrniKc', fix: c.leseniFix, pozn: `+ fix ${c.leseniFix} Kč` }), zahrnuto: v.leseniVnitrni, dostupne: true, prip: 'leseniVnitrni' },
    { key: 'leseniVnejsi', mk: () => mkItem('LEŠENÍ - vnější', leseniU, c.leseniVnejsiKc, { cenaPath: 'C.leseniVnejsiKc', fix: c.leseniFix, pozn: `+ fix ${c.leseniFix} Kč` }), zahrnuto: v.leseniVnejsi, dostupne: true, prip: 'leseniVnejsi' },
    /* Montáž přechodových plechů (11. 8. 2026). Předloha ji má ve volitelných
     * hned pod materiálem — u nás byla jen jako příplatek, takže když se plechy
     * daly do základní ceny, jejich montáž se neúčtovala vůbec. Množství je
     * počet nástupišť, sazba je táž jako u příplatkové varianty (jeden zdroj).
     *
     * Zapnutí se řídí MATERIÁLEM, ne vlastním přepínačem (16. 9. 2026).
     * V excelovém souboru zakázky CN-0327 to tak bylo omylem — vzorec
     * `=H64*G64*F63` sahá na buňku o řádek výš, protože jeho vlastní F64
     * zůstala prázdná. Vlastní přepínač, který kvůli tomu 11. 8. 2026 přibyl,
     * vydržel do 5. kola testů: „Plechy mají vždy 2 položky." Excel měl tedy
     * ve výsledku pravdu a dvojice se nerozpojuje — viz `prechMontAno` výš. */
    { key: 'prechMont', mk: () => mkItem('PŘECHODOVÉ PLECHY - NEREZ (MONTÁŽ)', prechKsMont, pp.prechMontKc,
      { cenaPath: 'C.priplatky.prechMontKc' }),
      zahrnuto: prechMontAno, dostupne: true, prip: 'prechMont' },
    /* Lešení pro dokončení hlavy šachty (11. 8. 2026). Fixní část NEMÁ, a to
     * ani ve volitelných, ani v příplatcích: je to nástavba už postaveného
     * lešení, ne samostatná stavba. Předloha tu měla dvě různá čísla (0 a
     * 5 000) — obojí padlo spolu se zavedením jediného klíče leseniFix. */
    { key: 'leseniHlava', mk: () => mkItem('LEŠENÍ - dokončení hlavy šachty', z.prejezd, pp.leseniHlavaKc,
      { cenaPath: 'C.priplatky.leseniHlavaKc' }), zahrnuto: v.leseniHlava, dostupne: true, prip: 'leseniHlava' },
    { key: 'haky', mk: () => mkItem('HÁKY NA MYTÍ ŠACHTY (EXT)', 3, c.hakyKc, { cenaPath: 'C.hakyKc' }), zahrnuto: v.haky, dostupne: ext, prip: 'haky' },
    { key: 'zabradli', mk: () => mkItem('ÚPRAVY/NAPOJENÍ ZÁBRADLÍ (INT)', nastupist, c.zabradliKc, { cenaPath: 'C.zabradliKc' }), zahrnuto: v.zabradli, dostupne: !ext, prip: 'zabradli' },
    { key: 'sokl', mk: () => mkItem('OPLECHOVÁNÍ SOKLU PROHLUBNĚ (EXT)', z.sirka + 2 * z.hloubka, c.soklBmKc, { cenaPath: 'C.soklBmKc' }), zahrnuto: v.sokl, dostupne: ext, prip: 'sokl' },
  ];
  // mk() voláme i u nedostupných variant (interiér vs. exteriér) – položka se do
  // výsledku nedostane, ale její název se zapíše do rejstříku. Jinak by ruční
  // přepis u exteriérové položky vypadal na interiérové šachtě jako sirotek (#4).
  const volitelneKatalog = volKatalogDef.map(d => ({ d, it: d.mk() }))
    .filter(x => x.d.dostupne)
    .map(x => ({ ...x.it, key: x.d.key, zahrnuto: !!x.d.zahrnuto, prip: x.d.prip || null }))
    .concat(vlastniProSekci('volitelne').map(r => ({ ...r, key: 'vlastni:' + r.idx, zahrnuto: true })));
  const volitelne = volitelneKatalog.filter(r => r.zahrnuto);

  const rezie = [
    mkItem('ZAMĚŘENÍ 3D SKENEREM', 1, c.sken3dKc, { cenaPath: 'C.sken3dKc' }),
    mkItem('VÝSTUP ZE ZAMĚŘENÍ PRO ZÁKAZNÍKA', z.vystupZamereni ? 1 : 0.5, c.vystupZamereniKc, { cenaPath: 'C.vystupZamereniKc' }),
    z.engineeringKs ? mkItem('ENGINEERING', z.engineeringKs, c.engineeringKc, { cenaPath: 'C.engineeringKc' }) : null,
    /* Poznámka u hodin navíc: obchodník musí vidět, proč je řádek vyšší,
     * než co má v poli „Projekce – základ" (9. 9. 2026). */
    mkItem('DÍLENSKÁ DOKUMENTACE', projekceHod, c.projekceHodKc,
      { cenaPath: 'C.projekceHodKc',
        pozn: zaskleniProjHod ? `+ ${zaskleniProjHod} hod za zasklení mezi příčníky (lišty)` : '' }),
    mkItem('STATICKÉ POSOUZENÍ', c.statikaHod, c.statikaKc, { cenaPath: 'C.statikaKc' }),
    mkItem('REŽIE KANCELÁŘE', 1, c.rezieKancelareKc, { cenaPath: 'C.rezieKancelareKc' }),
    mkItem('PRÁCE STAVBYVEDOUCÍHO', c.stavbyvedouciHod, c.stavbyvedouciKc, { cenaPath: 'C.stavbyvedouciKc' }),
    /* `|| 0`: starší ceníky (a zkušební sady) položku nemají a bez toho by
     * z nedefinované ceny vzniklo NaN, které by rozbilo celý součet. */
    mkItem('PŘEKLADY CZ→DE', 1, +c.prekladyKc || 0, { cenaPath: 'C.prekladyKc' }),
    ...vlastniProSekci('rezie'),
  ].filter(Boolean);

  /* ---------- ATYP → přirážka k projekčním a koordinačním pracím (#22) ----------
   * Zaškrtnutí „ATYP (nestandardní zakázka)" dosud nemělo na výpočet žádný vliv –
   * byl to mrtvý příznak. Nestandardní šachta přitom stojí víc hlavně v kanceláři:
   * dílenská dokumentace, statika, engineering a koordinace stavbyvedoucího.
   * Přirážka se proto počítá z NÁKLADU sekce Režie a přidává se jako samostatný
   * řádek, ne jako tiché navýšení jednotlivých položek. Důvody:
   *   – v kalkulaci i v detailu je hned vidět, kolik ATYP stojí a z čeho se počítá,
   *   – dá se ručně přepsat jako každá jiná položka (mnozstviPrepis/cenyPrepis),
   *   – nezkresluje ceníkové jednotkové ceny, které se propisují do dokumentů.
   * Marže se na řádek nasazuje stejně jako všude jinde (naklad × (1+m)).
   * Sazba je součástí ceníku (C.atypPrirazka), takže cestuje se zakázkou a jde
   * změnit v Nastavení; výchozí hodnota je 30 %. */
  const atypSazba = z.atyp ? (c.atypPrirazka != null ? +c.atypPrirazka : 0.30) : 0;

  /* VYŘAZENÉ POLOŽKY (21. 8. 2026). Filtr stojí schválně až tady, na jednom
   * jediném místě těsně před součty: kdyby se rozházel po výpočtu, každá
   * nová položka by musela na vyřazení znovu myslet. Volitelné se nefiltrují —
   * ty mají vlastní, starší zaškrtávátko „počítat do základní ceny".
   * Prázdný seznam nedělá nic, takže starší zakázky počítají beze změny. */
  const nepocitat = Array.isArray(z.nepocitat) ? z.nepocitat.map(String) : [];
  /* POLOŽKY JEN PRO ZAHRANIČÍ (#181, 31. 8. 2026, zadání J. V.: „pokud
   * nějaká položka v tuzemsku není, tak ji v kalkulaci nezobrazuj").
   * Cestovní náklady s logistikou nebo překlady CZ→DE nemají v tuzemské
   * zakázce co dělat — a ukázat je s nulou není totéž jako neukázat je:
   * nulový řádek v kalkulaci pořád svádí k tomu něco do něj napsat.
   * Značky nese ceník varianty (`cenik.jenZahr`), řadu `cenik.rada`. */
  /* Od 9. 9. 2026 (hlášeno J. V.: „u zakázky pro ČR se mi ve výběru zobrazují
   * překlady") rozhoduje kromě značek i pevný seznam CENIK_JEN_ZAHR z ceníku:
   * dokud se rozhodovalo jen podle značky, stačilo ji v ceníku nezaškrtnout
   * (nebo ji ztratit obnovou) a položka se v české nabídce objevila. Značka
   * umí přidat další, tuhle sadu ale nezruší. */
  const jenZahrZnacky = (c.jenZahr && typeof c.jenZahr === 'object') ? c.jenZahr : {};
  const jenZahr = Object.assign({}, jenZahrZnacky);
  if (typeof CENIK_JEN_ZAHR !== 'undefined')
    CENIK_JEN_ZAHR.forEach(cesta => { jenZahr[cesta] = true; });
  const zahranicni = String(c.rada) === 'zahr';
  const jenTetoRady = rows => (zahranicni || !Object.keys(jenZahr).length) ? rows
    : rows.filter(r => !(r.cenaPath && jenZahr[r.cenaPath]));
  const jenPocitane = rows => jenTetoRady(nepocitat.length
    ? rows.filter(r => nepocitat.indexOf(String(r.origNazev || r.nazev)) < 0) : rows);

  /* PŘIRÁŽKA ZA ATYP SE POČÍTÁ AŽ Z TOHO, CO SE OPRAVDU POČÍTÁ
   * (P4, nález N6, 21. 9. 2026).
   *
   * Řádek přirážky stál dřív NAD filtry a základ si bral z celého pole
   * `rezie`. Do základu tak vstupovaly i řádky, které se do nabídky vůbec
   * nedostanou: položka „jen pro zahraničí" (PŘEKLADY CZ→DE) v tuzemské
   * zakázce a ručně vyřazené řádky ze seznamu `nepocitat`. V kalkulaci
   * nebyly vidět, ale cenu zvedaly — a přes přirážku ještě jednou i rezervu,
   * která se počítá z celkového nákladu.
   *
   * Projevilo se to u zakázky s ATYP, jakmile měl ČR sloupec u překladů
   * vyplněnou hodnotu (vadný ceník v27): po otevření a přepočtu „na ceník,
   * který platí dnes" cena vyskočila, aniž by přibyl jediný viditelný řádek.
   * Rozdíl mezi tím, co je v kalkulaci vidět, a tím, z čeho se počítá, je
   * ta nejhůř dohledatelná chyba — proto základ bere `jenPocitane(rezie)`,
   * tedy přesně ty řádky, které jdou do součtu.
   *
   * Řádek se pak přidá do `rezie` a projde filtrem ještě jednou (v `sekce`
   * níž): to je schválně, aby šel vyřadit jako každý jiný. Sám žádnou
   * `cenaPath` nemá, takže ho filtr řady nevyhodí.
   *
   * ZMĚNA CENY: tuzemská zakázka s ATYP, která měla některý z těchto řádků,
   * se tím zlevní na hodnotu, kterou měla mít. Model 1 to neporušuje —
   * přirážka za ATYP je vlastní funkce aplikace (#22), v předloze VZOR
   * žádná není, takže není s čím být 1:1. */
  if (atypSazba > 0) {
    const atypZaklad = jenPocitane(rezie).reduce((a, r) => a + r.naklad, 0);
    const atypKc = atypZaklad * atypSazba;
    rezie.push(mkItem('PŘIRÁŽKA ZA ATYP - PROJEKČNÍ A KOORDINAČNÍ PRÁCE', 1, atypKc,
      { naklad: atypKc,
        pozn: `${Math.round(atypSazba * 1000) / 10} % z nákladu režie (${Math.round(atypZaklad).toLocaleString('cs-CZ')} Kč)` }));
  }

  const sekce = { hrubaOck: jenPocitane(hrubaOck), oplasteni: jenPocitane(oplasteni),
                  volitelne: jenTetoRady(volitelne), rezie: jenPocitane(rezie) };
  const sum = rows => ({
    naklad: rows.reduce((a, r) => a + r.naklad, 0),
    marze: rows.reduce((a, r) => a + r.marze, 0),
    sMarzi: rows.reduce((a, r) => a + r.sMarzi, 0),
  });
  const s1 = sum(sekce.hrubaOck), s2 = sum(sekce.oplasteni), s3 = sum(sekce.volitelne), s4 = sum(sekce.rezie);
  const nakladBezRezervy = s1.naklad + s2.naklad + s3.naklad + s4.naklad;
  const sMarziBezRezervy = s1.sMarzi + s2.sMarzi + s3.sMarzi + s4.sMarzi;

  // REZERVA — oprava: počítá se z NÁKLADŮ a marže se přidá jen jednou.
  // (šablona: základ = cena vč. marže a k tomu ještě jednou marže)
  let rezerva;
  if (fixes) {
    const naklad = nakladBezRezervy * z.rezervaZakladPct;
    rezerva = { naklad, marze: naklad * m, sMarzi: naklad * (1 + m) };
  } else {
    const naklad = sMarziBezRezervy * z.rezervaZakladPct;
    rezerva = { naklad, marze: naklad * m, sMarzi: naklad * (1 + m) };
  }

  const zakladNaklad = nakladBezRezervy + rezerva.naklad;
  const zakladCena = sMarziBezRezervy + rezerva.sMarzi;
  const zakladCenaZaokr = CEIL(zakladCena, 1000);

  /* ---------- příplatkové položky (ceník variant) ---------- */
  const mkPrip = (key, nazev, mnozstvi, cena, opts = {}) => {
    zapisNazev(nazev);
    /* RUČNÍ PŘEPIS MNOŽSTVÍ (2. 9. 2026, zadání J. V. po testu Kornpfortstraße).
     * Excel má u některých položek pod čarou množství 0, aby se nenabízely —
     * a obchodník se se zákazníkem běžně domluví na jiném počtu, než kolik
     * plyne ze zadání. Do teď šla u příplatku přepsat jen jednotková cena,
     * takže se předloha nedala napodobit. Sémantika je stejná jako u mkItem
     * (#14): PRÁZDNO NENÍ NULA — prázdný přepis znamená „platí vypočtené",
     * nula je platná dohoda („tuhle položku nenabízíme"). */
    const prepis = z.mnozstviPrepis ? z.mnozstviPrepis[nazev] : null;
    const prepisJe = (typeof prepisPlati === 'function') ? prepisPlati(prepis) : prepis != null;
    const mn = prepisJe ? +prepis : mnozstvi;
    const cenaPrepis = (opts.cenaPath == null && z.cenyPrepis && z.cenyPrepis[nazev] != null) ? +z.cenyPrepis[nazev] : null;
    const cenaEff = cenaPrepis != null ? cenaPrepis : cena;
    /* Náklad z PŘEPSANÉHO množství. U položek s vlastním nákladem (lešení:
     * proměnná část × množství PLUS fixní částka) se přepis promítne poměrem
     * — fixní část tak nespadne pod stůl ani se nezněkolikanásobí. Poměr se
     * počítá jen tehdy, když je z čeho: u nulového automatického množství
     * (a tedy nulového základu) by dělení nedávalo smysl. */
    let naklad;
    if (opts.naklad != null && cenaPrepis == null) {
      naklad = (prepisJe && mnozstvi) ? opts.naklad * (mn / mnozstvi) : opts.naklad;
    } else {
      naklad = mn * cenaEff;
    }
    const novyNazev = z.nazvyPrepis ? z.nazvyPrepis[nazev] : null;
    return { key, nazev: novyNazev || nazev, origNazev: nazev, nazevPrepsan: !!novyNazev,
             mnozstvi: mn, mnozstviAuto: mnozstvi, prepsano: prepisJe,
             cena: cenaEff, cenaAuto: cena, cenaPrepsana: cenaPrepis != null, cenaPath: opts.cenaPath || null,
             naklad, sMarzi: CEIL(naklad * (1 + m), 1000), pozn: opts.pozn || '', vlastni: !!opts.vlastni,
             /* Dodatkový text z ceníku (#267). Nese ho POLOŽKA, aby ho nabídka
              * nemusela dohledávat v ceníku sama — jinak by si musela vozit celý
              * ceník kvůli jedné větě.
              *
              * Čte se PŘÍMO z dat, ne přes cenikPopis(): ten je v jiném modulu
              * a v Node by tu nebyl vidět, takže by jádro v testech vracelo
              * prázdno a v aplikaci text. Jediným zapisovatelem zůstává
              * cenikPopisNastav() — tvar {cesta: text} se drží tam. */
             popisNabidka: popisZCeniku(nazev) };
  };
  let priplatky = [
    mkPrip('vsgFolie', 'Sklo VSG s mléčnou fólií', skloCelkemM2, pp.vsgFolieM2, { cenaPath: 'C.priplatky.vsgFolieM2' }),
    ext ? mkPrip('skn', 'Sklo SKN 176 (Ug=1,1) (EXT)', skloBokyZadniM2, pp.sknM2, { cenaPath: 'C.priplatky.sknM2' }) : null,
    prechodoveAno ? null : mkPrip('prechMat', 'PŘECHODOVÉ PLECHY - NEREZ (MATERIÁL)', prechKg1 * nastupist, c.prechodoveKgKc, { cenaPath: 'C.prechodoveKgKc' }),
    /* Příplatková varianta jen tehdy, když montáž není už ve volitelných —
     * jinak by se táž práce naúčtovala dvakrát. */
    prechMontAno ? null : mkPrip('prechMont', 'PŘECHODOVÉ PLECHY - NEREZ (MONTÁŽ)', nastupist, pp.prechMontKc, { cenaPath: 'C.priplatky.prechMontKc' }),
    mkPrip('madlaBoky', 'MADLA NA BOČNÍCH STĚNÁCH (dřevo, lak)', (nastupist - 1) * ((z.hloubka + 0.16) * 1.2) * 2, pp.madlaBmKc, { cenaPath: 'C.priplatky.madlaBmKc' }),
    mkPrip('madlaZadni', 'MADLA NA ZADNÍ STĚNĚ (dřevo, lak)', (nastupist - 1) * ((z.sirka + 0.16) * 1.2), pp.madlaBmKc, { cenaPath: 'C.priplatky.madlaBmKc' }),
    ext ? mkPrip('medStrecha', 'PŘÍPLATEK ZA STŘECHU V MĚDI (EXT)', (z.sirka + 0.2) * (z.hloubka + 0.1), pp.medStrechaM2, { cenaPath: 'C.priplatky.medStrechaM2' }) : null,
    ext ? mkPrip('ventilator', 'VENTILÁTOR (EXT)', 1, pp.ventilatorKc, { cenaPath: 'C.priplatky.ventilatorKc' }) : null,
    mkPrip('zabranyDvere', 'ZÁBRANY DO DVEŘNÍCH VSTUPŮ', nastupist, pp.zabranyDvereKc, { cenaPath: 'C.priplatky.zabranyDvereKc' }),
    /* MONTÁŽ ŠACHETNÍCH DVEŘÍ zrušena 2. 9. 2026 na pokyn J. V.: v excelové
     * předloze pod čarou není a obchodník si ji podle potřeby přidá ručně
     * („+ přidat položku" v příplatcích). Ceníkový klíč `montazDveriKc`
     * ZŮSTÁVÁ i s cenou — je to vodítko, za kolik tu ruční položku nacenit,
     * a kdyby se měla vrátit, stačí sem přidat řádek zpátky. */
    /* Osm příplatků z excelové předlohy (1. 9. 2026). Množství 1 = za akci;
     * cena je ceníková a v zakázce jde přepsat. V Excelu jsou u zakázky
     * všechny nulové — je to nabídkové menu, ne automatika. */
    /* Zábrany proti pádu jsou v předloze na KAŽDÉM nástupišti (2. 9. 2026:
     * v Excelu množství 6,0 při šesti nástupištích) — stejně jako zábrany
     * do dveřních vstupů. Ostatní položky z předlohy mají množství 1: i v Excelu
     * jsou prázdné, je to nabídkové menu, ne automatika. */
    mkPrip('zabranyPad', 'ZÁBRANY PROTI PÁDU DO ŠACHTY', nastupist, +pp.zabranyPadKc || 0, { cenaPath: 'C.priplatky.zabranyPadKc' }),
    mkPrip('demontazOhrazeni', 'DEMONTÁŽ STÁVAJÍCÍHO OHRAZENÍ', 1, +pp.demontazOhrazeniKc || 0, { cenaPath: 'C.priplatky.demontazOhrazeniKc' }),
    mkPrip('malbaSchodnic', 'MALBA SCHODNIC', 1, +pp.malbaSchodnicKc || 0, { cenaPath: 'C.priplatky.malbaSchodnicKc' }),
    mkPrip('naterOhrazeni', 'NÁTĚR CELÉHO OHRAZENÍ', 1, +pp.naterOhrazeniKc || 0, { cenaPath: 'C.priplatky.naterOhrazeniKc' }),
    mkPrip('naterOkopovych', 'NÁTĚR POUZE OKOPOVÝCH PLECHŮ', 1, +pp.naterOkopovychKc || 0, { cenaPath: 'C.priplatky.naterOkopovychKc' }),
    mkPrip('prosklenaStena', 'PROSKLENÁ STĚNA VEDLE ŠACHTY', 1, +pp.prosklenaStenaKc || 0, { cenaPath: 'C.priplatky.prosklenaStenaKc' }),
    mkPrip('demontazVytahu', 'DEMONTÁŽ STÁVAJÍCÍHO VÝTAHU', 1, +pp.demontazVytahuKc || 0, { cenaPath: 'C.priplatky.demontazVytahuKc' }),
    mkPrip('destovySvod', 'DEŠŤOVÝ SVOD', 1, +pp.destovySvodKc || 0, { cenaPath: 'C.priplatky.destovySvodKc' }),
    /* Fixní část lešení je v příplatcích táž jako ve volitelných — jeden klíč
     * c.leseniFix. Dokud měla každá větev vlastní číslo, znamenalo přesunutí
     * lešení ze základní ceny do příplatků tichou změnu ceny o tisíce korun. */
    v.leseniVnitrni ? null : mkPrip('leseniVnitrni', 'LEŠENÍ - vnitřní', leseniVez, c.leseniVnitrniKc,
      { cenaPath: 'C.leseniVnitrniKc', naklad: leseniVez * c.leseniVnitrniKc + c.leseniFix }),
    v.leseniHlava ? null : mkPrip('leseniHlava', 'LEŠENÍ - dokončení hlavy šachty', z.prejezd, pp.leseniHlavaKc,
      { cenaPath: 'C.priplatky.leseniHlavaKc' }),
    v.leseniVnejsi ? null : mkPrip('leseniVnejsi', 'LEŠENÍ - vnější', leseniU, c.leseniVnejsiKc,
      { cenaPath: 'C.leseniVnejsiKc', naklad: leseniU * c.leseniVnejsiKc + c.leseniFix }),
    /* HÁKY, ZÁBRADLÍ a SOKL i mezi příplatky (16. 9. 2026, zadání J. V.:
     * „z volitelných položek do základní ceny přidej do příplatkových i ty
     * zbývající a ať se chovají stejně jako lešení").
     *
     * Do teď byly tyhle tři jen ve volitelných. Odškrtnutím tedy zmizely
     * úplně — zákazník si je nemohl doobjednat a obchodník neměl kam sáhnout,
     * když je nechtěl mít v základní ceně. Lešení a přechodové plechy to
     * uměly od začátku; tyhle tři na to jen nikdo nedošel.
     *
     * Množství i sazba jsou TYTÉŽ výrazy jako ve volitelných — jeden zdroj,
     * ať přesun mezi základní cenou a příplatkem cenu nemění. Právě na tomhle
     * pravidle stojí lešení (viz poznámka o c.leseniFix výš).
     *
     * Dostupnost se drží stejného dělení: háky a sokl jen na exteriérové
     * šachtě, zábradlí jen na interiérové. Nabízet v příplatcích něco, co
     * volitelné pro tuhle šachtu vůbec neukazují, by byl nový nesoulad. */
    (ext && !v.haky) ? mkPrip('haky', 'HÁKY NA MYTÍ ŠACHTY (EXT)', 3, c.hakyKc,
      { cenaPath: 'C.hakyKc' }) : null,
    (!ext && !v.zabradli) ? mkPrip('zabradli', 'ÚPRAVY/NAPOJENÍ ZÁBRADLÍ (INT)', nastupist, c.zabradliKc,
      { cenaPath: 'C.zabradliKc' }) : null,
    (ext && !v.sokl) ? mkPrip('sokl', 'OPLECHOVÁNÍ SOKLU PROHLUBNĚ (EXT)', z.sirka + 2 * z.hloubka, c.soklBmKc,
      { cenaPath: 'C.soklBmKc' }) : null,
    ...(Array.isArray(z.priplatkyVlastni) ? z.priplatkyVlastni : []).map((vl, i) =>
      ({ ...mkPrip('vlastni:' + i, vl.nazev, +vl.mnozstvi || 0, +vl.cena || 0,
        { vlastni: true, pozn: vl.kid ? 'trvalá položka z ceníku' : 'ruční položka' }), kid: vl.kid || null })),
  ].filter(Boolean);
  if (z.priplatkyVyber) priplatky = priplatky.filter(p => z.priplatkyVyber.includes(p.key));
  const priplatkyNaklad = priplatky.reduce((a, r) => a + r.naklad, 0);
  const priplatkyCena = priplatky.reduce((a, r) => a + r.sMarzi, 0);
  const priplatkyRez = z.rezervaPriplatkyPct
    ? (fixes ? priplatkyNaklad : priplatkyCena) * z.rezervaPriplatkyPct * (1 + m) : 0;
  const priplatkyCenaCelkem = CEIL(priplatkyCena + priplatkyRez, 1000);

  /* ---------- DPH ---------- */
  const dph = c.dph;
  const souhrn = {
    zakladNaklad, zakladMarze: zakladCena - zakladNaklad,
    zakladCena: zakladCenaZaokr, zakladDph: zakladCenaZaokr * dph,
    zakladSDph: zakladCenaZaokr * (1 + dph),
    priplatkyCena: priplatkyCenaCelkem, priplatkyDph: priplatkyCenaCelkem * dph,
    priplatkySDph: priplatkyCenaCelkem * (1 + dph),
  };

  return {
    odvozene: { vyskaSachty: H, vyskaPodlazi, svetlaVyska, vyskaProsklene, sirkaDveri, leseniVez, leseniU },
    parametry: { ramy, portPricniky, sloupkyPortalu, kratkePricniky, spojky, pocetCilek },
    profily: { rows: profilyRows, celkemM: profM, celkemKg: profKg, celkemM2: profM2, lemovani: { m: dLemovani, kg: lemKg, m2: lemM2 } },
    plechy: { spojeRows, ks: plechyKs, kg: plechyKg, m2: plechyM2 },
    zaskleni: { rozmer: g, zadni: { ks: zadniKs, m2: zadniM2 }, bocni: { ks: bocniKs, m2: bocniM2 },
                svetliky: { ks: svetlikKs, m2: svetlikM2 }, svetlikyBoky: { ks: svetlikBokKs, m2: svetlikBokM2 },
                bokyZadniM2: skloBokyZadniM2, celniM2: skloCelniM2, celkemM2: skloCelkemM2,
                /* Plocha po stěnách A–D (#268). Zatím jen se vydává — cenu
                 * pořád tvoří součty výš. Bude z ní stavět režim „opláštění
                 * po stěnách" a Detail výpočtu. */
                steny: skloSteny,
                /* Rozpad zadní stěny pro Detail výpočtu (V37, 14. 9. 2026):
                 * patra bez nástupiště C jsou plné sklo, patra s nástupištěm
                 * mají portál a nad ním světlík. */
                zadniPlne: { m2: zadniPlneM2 },
                zadniPortaly: { ks: nastupistC, m2: zadniPortalyM2, otvorM2: zadniOtvorM2,
                                  dvereM2: nastupistC * zadniOtvorM2, svetlikyM2: svetlikZadniM2 },
                svetlikyZadni: { ks: svetlikZadniKs, m2: svetlikZadniM2 } },
    dily: { terceKs, terceKg, listyKs, listyBm: listyCelkBm, listyKg, oplDvereKs, oplDvereKg, oplDvereM2,
            podestKs, podestKg, podestM2, prechKs, prechKg },
    spojovaci: { rows: spojovaciRows, celkem: spojovaciKc, nytovaniKs },
    lakovani: { lakovna, tomas, pouzito: lakovaniKc, rezim: L.rezim, vlastniRows: vlLakRows, vlastniKc: lakVlastniKc },
    montaz: { hodinyNavic: hn, hodinyNavicCelkem: hodinyNavic, hod1osoba: montazHod1, hodCelkem: montazHod, dni: montazHod1 / 8 },
    nazvyPolozek,
    /* PÁSY OPLÁŠTĚNÍ TAK, JAK JE SPOČÍTALO JÁDRO (#268).
     *
     * Vydávají se ven kvůli NÁKRESU stěn v Zadání šachty. Obrazovka si je
     * schválně nepočítá sama: jádro dělicí výšku ořezává (pás nesmí pod
     * předchozí ani nad horní hranu) a plochu pod nulou bere jinak než nad
     * ní. Nákres, který by si to spočítal po svém, by při první změně
     * pravidel ukazoval něco jiného, než z čeho vyšla cena — a obrázek,
     * kterému se nedá věřit, je horší než žádný.
     *
     * Ve standardním režimu je pole prázdné; kreslit není co. */
    oplasteni: { rezim: oplRezim, vyska: vyskaProsklene, pasy: oplPasy,
                 zakladSten: oplZakladSteny,
                 sirkySten: stenaSirka, plochaCelkem: oplPlochaCelkem,
                 podleTypu: Object.keys(oplPodleTypu).map(k => ({ klic: k, ...oplPodleTypu[k] })) },
    sekce, volitelneKatalog, souctySekci: { hrubaOck: s1, oplasteni: s2, volitelne: s3, rezie: s4 }, rezerva,
    priplatky, souhrn,
  };
}

/* MIGRACE 11. 8. 2026 — tři fixní částky lešení se slučují do jedné.
 *
 * Do této verze měl ceník `leseniVnitrniFix`, `leseniVnejsiFix` a
 * `priplatky.leseniHlavaFix`. Uložené zakázky i zveřejněný ceník je pořád
 * nesou; kdyby se jen přestaly číst, spadla by fixní část lešení na nulu a
 * cena by se tiše propadla o desítky tisíc. Proto se hodnota převezme —
 * a to z VNITŘNÍHO lešení, protože to je ta cena, kterou uživatel označil
 * za platnou (18 000 Kč). Staré klíče se zahazují, aby v datech nezůstal
 * druhý zdroj, ke kterému by se dalo omylem vrátit.
 *
 * Funkce je bez návratové hodnoty a mění ceník na místě; volá se z migrace
 * zakázky (zakazka.js) i při načtení ceníku programu (program_ui.js). */
/* CHYBĚJÍCÍ KLÍČ CENÍKU SE DOPLNÍ, AŤ NEMÁ JAK ZMIZET (nález V38, 14. 9. 2026).
 *
 * Ceník se zveřejňuje z ceníku OTEVŘENÉ VARIANTY. Zakázka uložená dřív, než
 * nějaká položka vznikla, ten klíč vůbec nemá — a zveřejněním z takové
 * zakázky se položka z platného ceníku ztratí. Přesně to se stalo mezi
 * verzemi 24 a 25: „Sklo VSG 4.4.2" zmizelo, aniž by ho kdokoli mazal, a pět
 * dní se interiérové nabídky počítaly bez něj. J. V.: „nic jsem neodebíral."
 *
 * Doplňuje se JEN chybějící klíč a JEN hodnotou ze sestavení (v repozitáři
 * vynulovanou), takže se žádná cena nemění — chybějící klíč se ve výpočtu
 * stejně chová jako nula. Rozdíl je v tom, že prázdná položka je v ceníku
 * vidět a přežije zveřejnění. Hodnoty, které v ceníku jsou, se nepřepisují.
 *
 * Vrací počet doplněných klíčů (pro testy a pro hlášku). */
/* Klíče, které se NIKDY nedoplňují ze vzoru (P2, nálezy N2/N3, 21. 9. 2026).
 *
 * `ukazkove` a `prazdny` nejsou schéma ceníku — jsou to značky o STAVU dat
 * („tenhle ceník je ukázkový / vynulovaný"). Vzorem je ale DEFAULT_CENIK ze
 * sestavení, které je pro GitHub vynulované a obě značky nese. Doplňování
 * chybějících klíčů je tím vtisklo do každé zakázky, která šla přes
 * normalizaci — a protože normalizaci pouští i server při POST /api/zakazky,
 * vracel se klientovi soubor, kde každá varianta měla `cenik.ukazkove = true`,
 * přestože klient nic takového neposlal.
 *
 * Důsledek u uživatele: uzamčené varianty se při načtení nepřepočítávají,
 * takže značka zůstala — červená lišta „Ceník není nahraný, všude svítí nuly"
 * a vypnutá tlačítka tisku nabídky na ostrých zakázkách, které ceník měly.
 *
 * Značka musí jít s čísly, ne se schématem. */
/* Názvy jsou tu NAPSANÉ DOSLOVA, ne převzaté z `UKAZKOVE_KLIC`/`PRAZDNY_KLIC`
 * v ukazkove.js — a je to nutnost, ne lenost.
 *
 * Sestavená aplikace je jeden skript a `ukazkove.js` v něm stojí AŽ ZA
 * `engine.js`. Odkaz na tamní `const` by se vyhodnocoval v jeho dočasné
 * mrtvé zóně (TDZ) a vyhodil by výjimku. Nepomůže ani `typeof`: u proměnné
 * v TDZ hází i on — chrání jen před úplně nedeklarovaným jménem. Výjimka
 * v hlavním skriptu ukončí jeho vyhodnocování, takže se nenainicializuje
 * nic, co stojí níž, a aplikace se vůbec nespustí. Přesně to se 21. 9. 2026
 * stalo a chytil to až kouřový test v prohlížeči.
 *
 * Že se obě místa nerozejdou, hlídá test_ukazkove_znacky.js. */
const CENIK_NEDOPLNOVAT = ['ukazkove', 'prazdny'];

function cenikDoplnKlice(cenik, vzor) {
  const c = cenik, v = vzor;
  if (!c || typeof c !== 'object' || !v || typeof v !== 'object') return 0;
  let doplneno = 0;
  Object.keys(v).forEach(k => {
    if (CENIK_NEDOPLNOVAT.indexOf(k) >= 0) return;
    const hodnota = v[k];
    if (hodnota && typeof hodnota === 'object' && !Array.isArray(hodnota)) {
      if (!c[k] || typeof c[k] !== 'object') { c[k] = {}; doplneno++; }
      doplneno += cenikDoplnKlice(c[k], hodnota);
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(c, k)) {
      c[k] = (typeof hodnota === 'number') ? 0 : hodnota;
      doplneno++;
    }
  });
  return doplneno;
}

function cenikMigraceLeseni(cenik) {
  if (!cenik || typeof cenik !== 'object') return;
  if (cenik.leseniFix == null) {
    const stary = [cenik.leseniVnitrniFix, cenik.leseniVnejsiFix].find(x => x != null);
    if (stary != null) cenik.leseniFix = +stary || 0;
  }
  delete cenik.leseniVnitrniFix;
  delete cenik.leseniVnejsiFix;
  if (cenik.priplatky && typeof cenik.priplatky === 'object') {
    delete cenik.priplatky.leseniHlavaFix;
    /* POZOR: `zabranyPadKc` se 1. 9. 2026 dopoledne zahazoval jako mrtvý klíč —
     * a odpoledne ho J. V. vrátil k životu („zaveď těch osm příplatků všechny,
     * tak jak jsou"). Mazání je proto pryč; kdo měl v ceníku uloženou hodnotu,
     * o ni nepřijde. Poučení: mrtvý klíč nemusí být mrtvý nápad.
     * Původní komentář k rozhodnutí:
     * klíč nikdy neměl řádek v ceníku a žádná kalkulace ho nepoužívala, takže
     * nesl vždycky nulu a jen mátl při kontrole pokrytí ceníku. Uložené
     * a zveřejněné ceníky ho pořád nesou — proto se maže tady, stejnou cestou
     * jako `leseniHlavaFix`. Kdyby se zábrany proti pádu měly nabízet, patří
     * do KATALOGU trvalých položek (sekce příplatky), ne zpátky do kódu:
     * osm trvale nulových řádků by zaplevelilo každou nabídku. */
  }
}

if (typeof module !== 'undefined') module.exports = { vypocet, DEFAULT_ZADANI, DEFAULT_CENIK, OPLASTENI_TYPY, oplasteniTypy, oplasteniVychoziTyp, OPLASTENI_STENY, oplasteniStenyVychozi, PROFILY_VYCHOZI, CEIL, cenikMigraceLeseni, cenikDoplnKlice, CENIK_NEDOPLNOVAT, skloVolba, skloMigraceNazvu, SKLO_VSG441, SKLO_VSG442, nastupisteCelkem, patraProVypocet, LESENI_ODSTUP_M };
