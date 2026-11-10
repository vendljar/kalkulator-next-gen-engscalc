/* ============================================================
 * NABÍDKA (CN) – sestavení dat pro šablonu nabídky
 * Šablona: Sablona_NABIDKA_CN.docx (složka _CN); zástupné symboly {{...}}
 * se plní z řídící varianty zakázky: hlavička (Zakázka), technická
 * specifikace (záložka Technická specifikace) a ceny (Kalkulace OCK).
 * Dokument se generuje výhradně lokálně v prohlížeči (docxgen.js, Word)
 * nebo tiskovým náhledem; cesta přes Apps Script byla odstraněna 2. 8. 2026.
 * ============================================================ */

/* lang = 'cz' (výchozí) | 'en' | 'de' | 'fr' – jazyk HODNOT vkládaných do šablony.
 * Pevný text šablony překládá docxPrelozSablonu (docxgen.js); tady se překládají
 * jen dosazované hodnoty, aby výsledný dokument byl jazykově konzistentní.
 * Neznámý výraz zůstává česky (viz preklad.js) – nikdy se nic nevymýšlí. */
function nabidkaData(zak, varianta, jekly, lang, sablona, moznosti) {
  /* ODESLANÁ NABÍDKA ZŮSTÁVÁ ZMRAZENÁ (Z1, J. V. 22. 10. 2026): dotisk CN
   * bere krycí list a sazbu DPH ze snímku zámku (zamekNabidkaPohled), takže
   * podmínky ani DPH změněné po odeslání ho nezmění. Smlouva o dílo staví
   * na týchž datech, ale s živými hodnotami (`moznosti.zive`). */
  if (!(moznosti && moznosti.zive) && typeof zamekNabidkaPohled === 'function') varianta = zamekNabidkaPohled(varianta);
  const d = varianta.data;
  const Zv = d.ock.zadani, Cv = d.cenik, TSv = d.techspec;
  /* Odeslaná nabídka vydá svůj otisk, ne dnešní výpočet (nález A1). */
  const r = (typeof vypocetZ === 'function') ? vypocetZ(varianta, jekly)
    : vypocet(Zv, Cv, jekly, d.ock.fixes);

  const L = lang || 'cz';
  const P = t => (L !== 'cz' && typeof tr === 'function') ? tr(t, L) : t;

  /* OPLECHOVÁNÍ SOKLU PROHLUBNĚ — v které sekci nabídky stojí (16. 9. 2026,
   * nález J. V.: „přestože je součástí, zobrazuje se v sekci, kdy součástí
   * není").
   *
   * Řádek byl natvrdo v sekci SOUČÁSTÍ DODÁVKY NENÍ a měnil jen text. Když
   * tedy sokl v dodávce byl, tvrdila nabídka zákazníkovi obojí naráz: nadpis
   * říkal „není součástí", hodnota vedle „je součástí dodávky". Nově řádek
   * mezi sekcemi PŘESKAKUJE — do Doplňkových konstrukcí, když se dodává.
   *
   * Rozhoduje VÝPOČET, ne zaškrtávátko v zadání. Sokl se nabízí jen na
   * exteriérové šachtě (v katalogu volitelných má `dostupne: ext`), takže
   * samotné `volitelne.sokl` by na interiérové šachtě slíbilo dodávku něčeho,
   * co se vůbec nepočítá. A protože `r` je u odeslané nabídky zmrazený otisk
   * (vypocetZ, nález A1), nezmění vytištěná nabídka svoje znění zpětně. */
  /* Od 14. 10. 2026 rozhoduje jediná funkce tsSoklRadek (techspec.js) —
   * tutéž otázku klade technická specifikace a obě místa se nesmí rozejít. */
  const sokl = ((typeof tsSoklRadek === 'function') ? tsSoklRadek
    : require('./techspec.js').tsSoklRadek)(r, Zv);   // Node bez globálu (testy): týž modul

  /* SOKL NABÍZENÝ JAKO PŘÍPLATEK (nález N17, kolo 6, 21. 9. 2026).
   *
   * Oprava z 16. 9. řešila jen dva stavy: v základní ceně → sekce Doplňkové
   * konstrukce, jinak → „není součástí nabídky". Jenže od 16. 9. se sokl
   * nabízí i mezi PŘÍPLATKY, a ty se do nabídky dávají VŠECHNY, dokud je
   * obchodník ve sloupci „Nabídka" nevyřadí. Výchozí exteriérová nabídka
   * proto zákazníkovi tvrdila obojí naráz: kapitola II. mu sokl nabízela
   * za cenu a tabulka specifikace u téhož řádku psala „není součástí
   * nabídky". Dokument, který si odporuje, je horší než chybějící řádek.
   *
   * Třetí stav má proto vlastní větu. Řádek zůstává v sekci SOUČÁSTÍ DODÁVKY
   * NENÍ — v dodávce (základní ceně) opravdu není —, ale místo popření
   * odkazuje na příplatek. Rozhoduje TÝŽ seznam, ze kterého se sází
   * kapitola II. (`r.priplatky` bez vyřazených), aby se obě místa nemohla
   * rozejít. */
  /* (Rozhodnutí N17 je v tsSoklRadek: příplatek nabízený = v r.priplatky
   * a ne v priplatkyVynechat.) */

  /* Vnější lešení v ZÁKLADNÍ CENĚ — jedna definice pro kapitolu IV.
   * i pro řádek specifikace „LEŠENÍ KOLEM OCK…" (P8/7). Dvě různé podmínky
   * na dvou místech by se dřív nebo později rozešly a dokument by si zase
   * odporoval. Tutéž otázku klade `tsLeseniVnejsiVCene` ve specifikaci. */
  const leseniVnejsiVCene = (r.volitelneKatalog || []).some(x => x.key === 'leseniVnejsi' && x.zahrnuto);

  /* #14 krok 3: formát bydlí ve format.js (záložka pro samostatný Node běh).
   * Měna (#155 + dorovnání 19. 8. večer): CZ = koruny; jiná mutace = eura
   * kurzem z ceníku varianty. Převádějí se ČÍSLA po položkách (celá eura
   * nahoru, mena.na) a součty se skládají z převedených čísel — rozpad
   * v dokumentu proto sedí na euro. Kurz se v dokumentu neukazuje; bez
   * kurzu se hodí srozumitelná chyba a dokument nevznikne. */
  const mena = (typeof menaDokumentu === 'function') ? menaDokumentu(L, (typeof kurzEurZ === 'function') ? kurzEurZ(varianta, Cv.kurzEurKc) : Cv.kurzEurKc)
    : { eur: false, na: n => n,
        fmt: (typeof formatKc2 === 'function') ? formatKc2
          : n => n.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kč' };
  const kc = mena.fmt;
  const cislo = (typeof formatCislo === 'function') ? (n => formatCislo(n, 3))
    : n => (+n).toLocaleString('cs-CZ', { maximumFractionDigits: 3 });
  const datumCz = iso => {
    if (!iso) return '';
    const [y, m, dd] = iso.split('-');
    return dd && m && y ? `${dd}.${m}.${y}` : iso;
  };

  // hodnota pole technické specifikace (ruční přepis > prefill > výchozí)
  const pole = {};
  TECHSPEC_DEF.forEach(s => s.pole.forEach(p => { pole[p.id] = p; }));
  /* Jazyk se předává i PREFILLU (#268, 3. krok): věta o rozsahu opláštění po
   * stěnách se skládá z proměnlivého počtu kusů, takže ji slovník nemůže
   * trefit celou a `tsOplasteniRozsah` si ji složí rovnou v cílovém jazyce.
   * Když to udělá (hlásí `prelozeno`), NEPOUŠTÍ se přes ni `tr()` podruhé —
   * jinak by tisk hlásil chybějící heslo u textu, který je v pořádku. */
  /* VS-E4 (#570): totéž pro libovolnou šachtu — (specifikace, výsledek,
   * zadání) šachty. Šachta 1 = TSv, r, Zv jako dosud. */
  const tsPro = (TSx, rx, Zx) => {
    const tsX = id => {
      if (!pole[id]) return P(' -');
      const h = tsHodnota(pole[id], TSx, rx, Zx, Cv, L);
      return h.prelozeno ? h.text : P(h.text);
    };
    /* Pole, které v téhle zakázce nic neříká („ -"), vrací prázdno — řádek
     * pak z dokumentu zmizí (docxgen i nabidkaNahledSekce). */
    const tsNeboPrazdnoX = id => {
      const t = tsX(id);
      return /^\s*-?\s*$/.test(String(t == null ? '' : t)) ? '' : t;
    };
    return { ts: tsX, tsNeboPrazdno: tsNeboPrazdnoX };
  };
  const { ts, tsNeboPrazdno } = tsPro(TSv, r, Zv);

  /* Je položka u TÉHLE šachty vůbec na výběr? Katalog volitelných je už
   * profiltrovaný podle typu šachty (`dostupne`), takže co v něm není,
   * u téhle zakázky neexistuje. */
  const jeVKatalogu = key => (r.volitelneKatalog || []).some(x => x.key === key);

  /* ROZLIŠIT DVA RŮZNÉ DŮVODY, PROČ POLOŽKA NENÍ MEZI PŘÍPLATKY (nález K1).
   *
   * Do 22. 9. 2026 vracela tahle funkce „v základní ceně" pokaždé, když
   * položku mezi příplatky nenašla. Dokud byly všechny volitelné položky
   * dostupné všude, sedělo to. Jakmile se vnější lešení omezilo na
   * exteriérovou šachtu, tvrdila by nabídka u interiérové, že lešení je
   * v základní ceně — ačkoli v kalkulaci není vůbec.
   *
   * Pomlčka je totéž, co má technická specifikace u polí, která se dané
   * zakázky netýkají. */
  const prip = key => {
    const p = r.priplatky.find(x => x.key === key);
    if (p) return kc(mena.na(p.sMarzi));
    return jeVKatalogu(key) ? P('v základní ceně') : ' -';
  };

  /* Koncová cena: základní cena → schválená sleva (ZAK-10; neschválená ani
   * čekající se neuplatní) → obchodní zaokrouhlení (#38). Skládá to
   * zaokrouhleni.js, aby nabídka, krycí list i porovnání variant ukazovaly
   * stejné číslo. Od 12. 8. 2026 (#135) se do dokumentu vypisují rovnou
   * zaokrouhlené částky a řádek se zaokrouhlením v nabídce není — viz
   * `zakladZaokr` a `slevaKcVykaz` v zaokrouhleni.js. */
  const sleva = d.sleva || {};
  const cn = (typeof cenaNabidkyOck === 'function') ? cenaNabidkyOck(r, sleva, d.zaokr) : null;
  const slevaP = cn ? cn.slevaPct : ((typeof slevaPodil === 'function') ? slevaPodil(sleva) : 0);
  /* Do dokumentu jdou ZAOKROUHLENÉ částky (#135): cena před slevou i koncová
   * cena, a sleva jako jejich rozdíl. Rozpad tím sedí na korunu a v nabídce
   * nemusí být řádek „obchodní zaokrouhlení", který zákazníkovi nic neříká. */
  let cenaPredSlevou = cn ? cn.zakladZaokr : r.souhrn.zakladCena;
  let cenaBezDphNum = cn ? cn.cena : cenaPredSlevou * (1 - slevaP);
  let slevaKcNum = cn ? cn.slevaKcVykaz : cenaPredSlevou - cenaBezDphNum;
  /* DPH jedinou funkcí (#14 krok 1); v eurech se počítá až z PŘEVEDENÉHO
   * základu (nahoru), aby platilo bez DPH + DPH = s DPH na euro přesně. */
  let dphKcNum = (typeof cenaSDph === 'function'
    ? cenaSDph(cenaBezDphNum, Cv.dph) : { dphKc: cenaBezDphNum * Cv.dph }).dphKc;
  let cenaSDphNum = (typeof cenaSDph === 'function'
    ? cenaSDph(cenaBezDphNum, Cv.dph) : { sDph: cenaBezDphNum * (1 + Cv.dph) }).sDph;
  /* MŮSTKY S VLASTNÍM ŘÁDKEM CENY (#560, A-Q8/9) — jen skladebný model
   * (Model 2 + nový ceník). Obě částky jsou PŘED slevou (cenaNabidkyOck);
   * v eurech se převádí cena můstků a šachta je rozdíl do převedené ceny
   * před slevou — rozpad sedí na euro. Jinak prázdné (řádky zmizí). */
  const mustkySk = !!(r.mustky && r.mustky.skladebny && cn && cn.mustky);
  let cenaMustkyNum = mustkySk ? cn.mustky.mustkyPred : 0;
  if (mena.eur) {
    cenaMustkyNum = mustkySk ? mena.na(cenaMustkyNum) : 0;
    cenaPredSlevou = mena.na(cenaPredSlevou);
    cenaBezDphNum = mena.na(cenaBezDphNum);
    slevaKcNum = cenaPredSlevou - cenaBezDphNum;   // rozdíl převedených částek — sedí na euro
    dphKcNum = Math.ceil(cenaBezDphNum * Cv.dph);
    cenaSDphNum = cenaBezDphNum + dphKcNum;
  }

  /* SYMBOLY TECHNICKÉ ČÁSTI, KTERÉ POPISUJÍ ŠACHTU (VS-E4 #570): sekce
   * ZÁKLADNÍ PARAMETRY … MŮSTKY + sokl v doplňkových konstrukcích. Jedna
   * šachta = tytéž hodnoty jako dosud (TSv, r, Zv); u víc šachet se volá
   * pro každou šachtu s JEJÍ dvojicí (zadání, výsledek) a specifikací
   * (tsSachtaTechspec) — šablona v17 je dosadí do smyčky {#sachty}. */
  const tsSymbolySachty = (TSx, rx, Zx, mSk) => {
    const T = tsPro(TSx, rx, Zx);
    // vnější rozměr: z ručního přepisu pole „ROZMĚR ŠACHTY – VNĚJŠÍ“, je-li ve tvaru „š × h“
    const vnejsi = [' -', ' -'];
    const mVnejsi = String((TSx.hodnoty || {}).rozmerVnejsi || '').match(/(\d[\d\s]*)\D+(\d[\d\s]*)/);
    if (mVnejsi) { vnejsi[0] = mVnejsi[1].trim(); vnejsi[1] = mVnejsi[2].trim(); }
    const soklX = ((typeof tsSoklRadek === 'function') ? tsSoklRadek : require('./techspec.js').tsSoklRadek)(rx, Zx);
    return {
      TS_UMISTENI: T.ts('umisteni'), TS_UMISTENI_STROJE: T.ts('umisteniStroje'),
      TS_ULOZENI: T.ts('ulozeni'), TS_VYSKA_CELKOVA: T.ts('vyskaCelkova'),
      TS_SIRKA_VNITRNI: String(Math.round(Zx.sirka * 1000)),
      TS_HLOUBKA_VNITRNI: String(Math.round(Zx.hloubka * 1000)),
      TS_SIRKA_VNEJSI: vnejsi[0], TS_HLOUBKA_VNEJSI: vnejsi[1],
      TS_ZDVIH: cislo(Zx.zdvih), TS_DOLNI_PREJEZD: String(Math.round(Zx.prohluben * 1000)),
      TS_HORNI_PREJEZD: String(Math.round(Zx.prejezd * 1000)),
      TS_STANICE: T.ts('stanice'), TS_KABINA: T.ts('kabina'), TS_PUDORYS: T.ts('pudorys'),
      /* USAZENÍ OCK PODLE TECHNICKÉ SPECIFIKACE (12. 10. 2026, pokyn J. V.).
       * Specifikace má vedle „boční stěny" i levou a pravou boční stěnu zvlášť —
       * do nabídky se nepropisovaly. Pole bez volby (výchozí „ -") vrací
       * prázdno a řádek z nabídky zmizí (Word i online). Šablona bez symbolů
       * {{TS_USAZENI_LEVA}} / {{TS_USAZENI_PRAVA}} (CN v14 a starší) dostane
       * levou a pravou stěnu do řádku „boční stěny" — viz usazeniBocniSloucene. */
      TS_USAZENI_CELNI: T.tsNeboPrazdno('usazeniCelni'), TS_USAZENI_BOCNI: T.tsNeboPrazdno('usazeniBocni'),
      TS_USAZENI_LEVA: T.tsNeboPrazdno('usazeniLeva'), TS_USAZENI_PRAVA: T.tsNeboPrazdno('usazeniPrava'),
      TS_USAZENI_ZADNI: T.tsNeboPrazdno('usazeniZadni'),
      TS_TYP_KONSTRUKCE: T.ts('typKonstrukce'), TS_SVISLE_NOSNE: T.ts('svisleNosne'),
      TS_PROFIL_SLOUPKU: T.ts('profilSloupku'), TS_VODOROVNE_NOSNE: T.ts('vodorovneNosne'),
      TS_ROZTEC: T.ts('roztecPricniku'), TS_PROFIL_PRICNIKU: T.ts('profilPricniku'),
      TS_KOTVENI_POLOHA: T.ts('kotveniPoloha'), TS_KOTVENI_TYP: T.ts('kotveniTyp'),
      TS_PORTALY_PROSTOR: T.ts('portalyProstor'), TS_PORTALY_CLENENI: T.ts('portalyCleneni'),
      TS_POVRCH_UPRAVA: T.ts('povrchovaUprava'), TS_HAKY: T.ts('haky'),
      TS_STRECHA: T.ts('strecha'), TS_POZARNI: T.ts('pozarni'),
      TS_TYP_OPLASTENI: T.ts('typOplasteni'), TS_MATERIAL_OPLASTENI: T.ts('materialOplasteni'),
      TS_POVRCH_OPLASTENI: T.ts('povrchOplasteni'), TS_OPLASTENI_CELA: T.ts('oplasteniCela'),
      TS_ROZSAH_OPLASTENI: T.ts('rozsahOplasteni'), TS_OPLASTENI_NADSVETLIKU: T.ts('oplasteniNadsvetliku'),
      /* Světlíky u šachetních dveří s počtem a materiálem (#375, 30. 9. 2026).
       * Šablona v11 na ně zatím symbol nemá — doplní se do ní; online nabídka
       * řádek ukazuje hned. Bez světlíků prázdné = řádek zmizí. */
      TS_SVETLIKY_DVERI: T.tsNeboPrazdno('svetlikyDveri'),
      TS_UMISTENI_OPLASTENI: T.ts('umisteniOplasteni'), TS_KOTVENI_OPLASTENI: T.ts('kotveniOplasteni'),
      TS_PARAMETRY_KOTVY: T.ts('parametryKotvy'), TS_NAPOJENI_DVERI: T.ts('napojeniDveri'),
      TS_MONTAZNI_NOSNIK: T.ts('montazniNosnik'), TS_PRIPRAVA_KOTVENI: T.ts('pripravaKotveni'),
      TS_ODVETRANI: T.ts('odvetrani'), TS_PODCHOZI_OCK: T.ts('podchoziOck'),
      TS_PRECHODOVE_PLECHY: T.ts('prechodovePlechy'),
      /* Příčka a stříšky vedle šachty (P10 / K12-N46, 24. 9. 2026). Stříšky
       * jsou v základní ceně (sekce opláštění), technická specifikace je
       * vypisuje, ale do nabídky se nedostávaly. Prázdná hodnota = řádek
       * zmizí (Word i náhled), stejně jako u soklu. Šablona v11 na ně zatím
       * symbol nemá — doplní se se šablonou. */
      TS_PROSKLENA_PRICKA: T.tsNeboPrazdno('prosklenaPricka'),
      TS_PROSKLENA_STRISKA: T.tsNeboPrazdno('prosklenaStriska'),
      TS_MUSTKY: mSk ? '' : T.tsNeboPrazdno('mustky'),   // P7 / K13-N59: počet a rozměr můstků
      /* #560: sekce MŮSTKY (jen skladebný model; jinak prázdné → sekce zmizí). */
      TS_MUSTKY_ROZMER: mSk ? T.tsNeboPrazdno('mustkyRozmer') : '',
      TS_MUSTKY_PODLAHA: mSk ? T.tsNeboPrazdno('mustkyPodlaha') : '',
      TS_MUSTKY_ZABRADLI: mSk ? T.tsNeboPrazdno('mustkyZabradli') : '',
      TS_MUSTKY_KOTVENI: mSk ? T.tsNeboPrazdno('mustkyKotveni') : '',
      TS_MUSTKY_SLOUPY: mSk ? T.tsNeboPrazdno('mustkySloupy') : '',
      /* Vyplněný je vždy právě JEDEN z TS_SOKL / TS_NENI_SOKL (viz níž). */
      TS_SOKL: soklX.vDodavce ? P(soklX.text) : '',
    };
  };

  /* Pořadí klíčů zůstává jako před VS-E4 (smlouva o dílo symboly přebírá
   * v tomto pořadí a zlatá sada otiskuje i ji): část šachty do opláštění,
   * popis záměru, zbytek šachty, za zakázku, sokl. */
  const tsS1 = tsSymbolySachty(TSv, r, Zv, mustkySk);
  const tsS1Klice = Object.keys(tsS1);
  const tsS1Cast = (od, po) => {
    const o = {};
    tsS1Klice.slice(tsS1Klice.indexOf(od), po ? tsS1Klice.indexOf(po) : tsS1Klice.length).forEach(k => { o[k] = tsS1[k]; });
    return o;
  };
  const placeholders = {
    OBJEDNATEL: zak.objednatel || '…',
    OBJEDNATEL_KONTAKT: zak.kontakt || '…',
    /* Datum nese VARIANTA, ne zakázka (nález D2) — starší varianty ho nemají
     * a spadnou na zak.datum, takže se nezmění. */
    DATUM: datumCz(typeof variantaDatum === 'function' ? variantaDatum(zak, varianta) : zak.datum),
    NAZEV_AKCE: zak.nazevAkce || TSv.nazevAkce || '…',
    /* Číslo varianty ≥ 2 se připojuje tečkou (…-555.2) — zadání 19. 8. 2026. */
    CISLO_NABIDKY: String((typeof cisloSVariantou === 'function'
      ? cisloSVariantou(zak, varianta) : zak.cislo) || '').replace(/\s+/g, ''),
    ADRESA: zak.adresa || '…',

    ...tsS1Cast('TS_UMISTENI', 'TS_PRECHODOVE_PLECHY'),
    /* POPIS ZÁMĚRU A VĚTA O OPLÁŠTĚNÍ (P6 / K13-N57, 24. 9. 2026). Šablona v11
     * má natvrdo odstavec o přístavbě k dvorní fasádě a o izolačním dvojskle —
     * tiskne se i u interiérových šachet s čistým VSG. Tihle zástupci jsou
     * připravení pro upravenou šablonu (šablona v11 je zatím nepoužívá).
     * Znění vět je NÁVRH ke schválení J. V. (podklady/K13_ROZBOR_2026-09-24.md);
     * překlady přibudou po schválení. */
    POPIS_ZAMERU_OCK: nabidkaPopisZameru(zak, Zv, P),
    OPLASTENI_VETA: (() => {
      const m = ts('materialOplasteni');
      /* Úvod věty se překládá tady, ne slovníkem: „Opláštění šachty" by se
       * ve slovníku srazilo s nadpisem sekce OPLÁŠTĚNÍ ŠACHTY (velká písmena). */
      const uvod = { cz: 'Opláštění šachty', en: 'Shaft cladding', de: 'Schachtverkleidung',
                     fr: 'Bardage de la gaine' }[L] || 'Opláštění šachty';
      return nabidkaHodnotaChybi(m) ? '' : uvod + ': ' + m + '.';
    })(),
    ...tsS1Cast('TS_PRECHODOVE_PLECHY', 'TS_SOKL'),
    TS_LESENI_UVNITR: ts('leseniUvnitr'), TS_LESENI_VNE: ts('leseniVne'),
    TS_ZABRANY_VSTUPY: ts('zabranyVstupy'),
    TS_SKEN3D: ts('sken3d'), TS_VYSTUP_ZAMERENI: ts('vystupZamereni'),
    TS_DILENSKA_DOK: ts('dilenskaDok'), TS_STATIKA: ts('statika'),
    TS_NENI_OSVETLENI: ts('neni1'), TS_NENI_VENTILATOR: ts('neni2'),
    /* Lešení v SOUČÁSTÍ DODÁVKY NENÍ se řídí kalkulací (obchodník 15. 10. 2026,
     * bod 2): prázdné, když je lešení v základní ceně (řádek zmizí), jinak
     * návrh z tsLeseniNeniRadek nebo ruční text. Šablony CN do v15 symbol
     * vnitřního lešení nemají — řádek se do Wordu naklonuje (tsRadkyNavic). */
    TS_NENI_LESENI_VNITRNI: tsNeboPrazdno('neniLeseniVnitrni'),
    TS_NENI_LESENI: ts('neni3'), TS_NENI_ODBERNE: ts('neni4'),
    TS_NENI_ULOZNE: ts('neni5'), TS_NENI_DOZDENI: ts('neni7'),
    TS_NENI_STAVEBNI: ts('neni8'),
    /* Vyplněný je vždy právě JEDEN z nich, druhý zůstává prázdný — tím se
     * řádek přesune mezi sekcemi. Prázdná hodnota je v téhle aplikaci
     * zavedený způsob, jak řádek zmizí: docxgen.js vyhodí z Wordu řádek,
     * jehož všechny TS_* zástupce jsou prázdné, i s popiskem, a pak i sekční
     * pruh, kterému nezbyl jediný datový řádek. Náhled se řídí týmž. */
    TS_SOKL: tsS1.TS_SOKL,
    TS_NENI_SOKL: sokl.vDodavce ? '' : P(sokl.text),
    TS_NENI_NAPAJENI: ts('neni9'), TS_NENI_PROHLUBEN: ts('neni10'),
    TS_NENI_PRISTUP: ts('neni11'),

    CENA_BEZ_DPH: kc(cenaBezDphNum),
    /* #560: šachta bez můstků a můstky (obojí před slevou); bez skladebného
     * modelu prázdné — řádky ze šablony v16 zmizí, v15 se neklonují. */
    CENA_SACHTA_BEZ_DPH: mustkySk ? kc(cenaPredSlevou - cenaMustkyNum) : '',
    CENA_MUSTKY_BEZ_DPH: mustkySk ? kc(cenaMustkyNum) : '',
    /* Šablona v16: koncová cena bez DPH v řádku „VÝTAHOVÁ ŠACHTA" (bez můstků,
     * jako dosud), nebo v řádku „CENA CELKEM" (s můstky). Druhý je prázdný
     * a zmizí (docxgen DOCX_CENA_CASTI). */
    CENA_BEZ_DPH_SACHTA: mustkySk ? '' : kc(cenaBezDphNum),
    CENA_BEZ_DPH_CELKEM: mustkySk ? kc(cenaBezDphNum) : '',
    DPH_SAZBA: String(Math.round(Cv.dph * 100)),
    /* Nulová sazba má vlastní jméno (22. 9. 2026 večer). Od té doby, co
     * zahraniční řada ceníku přepíná DPH na 0 %, by tu podmínka `<= 0.15`
     * tiskla „DPH 0 % (snížená sazba)" — tedy nesmysl, který by zákazník
     * četl jako chybu v nabídce. */
    DPH_NAZEV: P(!(+Cv.dph > 0) ? 'nulová' : (Cv.dph <= 0.15 ? 'snížená' : 'základní')),
    DPH_KC: kc(dphKcNum),
    CENA_S_DPH: kc(cenaSDphNum),
    CENA_PRED_SLEVOU: kc(cenaPredSlevou),
    /* Bez slevy PRÁZDNÉ (P5 / K13-N56, rozhodnutí J. V. 25. 9. 2026): Word
     * šablona v12 má řádky „Cena před slevou" a „Sleva" a docxgen je podle
     * prázdného SLEVA_KC vyhodí — nabídka bez slevy je nemá mít. Dřív „0"
     * a „0,00 Kč", které by se do dokumentu vypsaly. */
    SLEVA_PROC: slevaP ? String(Math.round(slevaP * 10000) / 100) : '',
    SLEVA_KC: slevaP ? kc(slevaKcNum) : '',
    /* Symbol zůstává kvůli starším šablonám, ale je VŽDY prázdný (#135):
     * zaokrouhlují se položky, takže žádný dorovnávací řádek nevzniká.
     * Kdyby se klíč zrušil, zůstal by v takové šabloně viset text {{…}}. */
    ZAOKROUHLENI_KC: '',
    PRIP_LESENI_VNEJSI: prip('leseniVnejsi'),
    PRIP_SKN: prip('skn'),
  };
  /* „CO NENÍ SOUČÁSTÍ DODÁVKY" V CIZÍM JAZYCE S VELKÝM PÍSMENEM (obchodník
   * 3. 10. 2026: „některé položky začínají velkým písmenem a jiné malým …
   * sjednoť to prosím na VELKÉ písmeno"). Hodnoty jsou překlady vět, které
   * česky začínají malým („zajistí objednatel", „není součástí nabídky"),
   * a slovník je převzal různě. V EN/DE/FR se první písmeno hodnot sekce
   * zvětší; česká nabídka zůstává, jak je (tam jsou všechny malým). */
  if (L !== 'cz') Object.keys(placeholders).forEach(k => {
    if (!/^TS_NENI_/.test(k)) return;
    const v = String(placeholders[k] == null ? '' : placeholders[k]);
    placeholders[k] = v.replace(/^(\s*)(\p{Ll})/u, (m, mez, pis) => mez + pis.toUpperCase());
  });

  // Firemní údaje zhotovitele (SET-3) – symboly {{FIRMA_…}} do šablony i náhledu.
  // Vlastní jména, adresy a čísla se nikdy nepřekládají, jen země (viz firma.js).
  if (typeof firmaPlaceholders === 'function')
    Object.assign(placeholders, firmaPlaceholders(
      typeof firmaAktualni === 'function' ? firmaAktualni() : null, P));
  /* Jazykové symboly kapitol ({{FIRMA_NAB_DOLOZKY_DE}} …) odeslané varianty
   * ze snímku (K4-N1) — jinak by je firmaPlaceholders vzal z aktuální Firmy. */
  const kapFirma = nabidkaKapitolyFirma(varianta);
  if (kapFirma && typeof firmaKapitolyJazykoveSymboly === 'function') firmaKapitolyJazykoveSymboly(kapFirma, placeholders);

  /* Zpracovatel nabídky (#146) – symboly {{ZPRAC_…}} do bloku „Vypracoval“.
   * Nabídku podepisuje ten obchodní technik, který je právě přihlášený;
   * do 5. 8. 2026 byl v šabloně natvrdo jeden kolega. Bez přihlášení
   * (offline build na ploše) se použijí firemní údaje – viz zpracovatel.js. */
  /* Šablona, která levou a pravou boční stěnu neumí (víme to jen u Wordu —
   * builder dostane symboly šablony), je dostane do řádku „boční stěny":
   * „levá – …; pravá – …". Online nabídka (bez šablony) má řádky zvlášť. */
  if (sablona && sablona.symboly && !sablona.symboly.has('TS_USAZENI_LEVA'))
    placeholders.TS_USAZENI_BOCNI = usazeniBocniSloucene(placeholders, P);

  /* VÍC ŠACHET V NABÍDCE (VS-E4 #570, R4, R12, R14, R15). Jen když výsledek
   * nese šachty (obal vypocetZakazkyOck: Model 2 a víc šachet nebo ks > 1);
   * jedna šachta nedostane ani jeden nový symbol (zlatá sada VS-E0 — symboly
   * přebírá i smlouva o dílo). */
  const vs = nabidkaVsData(d, r, sablona, { P, kc, cenaPredSlevou, cenaBezDphNum, tsSymbolySachty });
  if (vs.sachty) Object.assign(placeholders, vs.placeholders);

  if (typeof zpracovatelPlaceholders === 'function')
    Object.assign(placeholders, zpracovatelPlaceholders(
      typeof firmaAktualni === 'function' ? firmaAktualni() : null));

  /* Smluvní a platební podmínky (#147) – symboly {{PODM_…}}. Do 5. 8. 2026
   * byla procenta splátek a splatnost natvrdo v šabloně, takže se přepis
   * v podmínkách nabídky do odeslaného dokumentu nedostal. Teď jde do šablony
   * přesně to, co má obchodník v sekci pod „Celkem s DPH" (a tedy i v krycím
   * listu – je to jedno úložiště). */
  if (typeof kryciPodminkoveSymboly === 'function')
    Object.assign(placeholders, kryciPodminkoveSymboly(zak, varianta, jekly, P));

  /* PLATEBNÍ KALENDÁŘ OCK (etapa A, D1 + D2 — 30. 9. 2026). Věty o dílčích
   * dokladech skládá aplikace: splátka s 0 % („Bez zálohy") se vynechá
   * a ostatní se přečíslují, měsíční fakturace dá jednu schválenou větu.
   * Šablona CN v14 je bere z {{PODM_PLATEBNI_KALENDAR}} a
   * {{PODM_FAKTURACE_MESICNE}}; v13 tiskne pevné věty jako dřív (kontrola
   * platbyWordOck). Online náhled dostane týž kalendář (platbyOck). */
  let platbyOck = null;
  if (typeof kryciPlatebniKalendar === 'function') {
    platbyOck = kryciPlatebniKalendar(zak, varianta, jekly);
    Object.assign(placeholders, kryciPlatebniSymboly(platbyOck, P, L));
  }

  /* KAPITOLY IV.–VI. A DOLOŽKY (#282, nálezy N15 a N16 kola 6).
   *
   * Wordová šablona je má, aplikace je neuměla — tiskla tedy nabídku bez
   * kapitol POŽADAVKY PRO PROVEDENÍ REALIZACE, TERMÍNY REALIZACE, PŘEDÁNÍ
   * DÍLA a bez závěrečných doložek. Obchodník to hlásil slovy „nám tam
   * schází úplně". Texty jsou firemní standard (Nastavení → Firma), každý
   * jazyk má vlastní.
   *
   * NEPŘEKLÁDAJÍ SE. Jsou to smluvní podmínky napsané člověkem v cílovém
   * jazyce; `tr()` by přes ně jel podruhé a hlásil chybějící hesla u textu,
   * který je v pořádku. Chybějící jazyk se pozná podle `chybi` a nabídka to
   * řekne nahlas — tiché nahrazení češtinou by znamenalo poslat cizímu
   * zákazníkovi podmínky v jazyce, kterému nemusí rozumět. */
  if (typeof firmaKapitola === 'function' && typeof FIRMA_KAPITOLY !== 'undefined') {
    /* Zamčená varianta se snímkem tiskne kapitoly z doby odeslání (K4-N1). */
    const f = nabidkaKapitolyFirma(varianta) || ((typeof firmaAktualni === 'function') ? firmaAktualni() : null);
    /* LEŠENÍ SI NESMÍ ODPOROVAT S TECHNICKOU SPECIFIKACÍ (P8/7, rozhodnutí
     * J. V. 22. 9. 2026).
     *
     * Kapitola IV. žádá po objednateli „zajištění montážního lešení", zatímco
     * technická specifikace u téže zakázky může říkat, že vnější lešení je
     * součástí dodávky. Dokument si tím protiřečil a zákazník si vybral
     * výklad, který je pro něj levnější.
     *
     * Když je vnější lešení v základní ceně, odrážka z kapitoly vypadne.
     * Je-li příplatkem nebo u téhle šachty neexistuje, zůstává — tam platí
     * dál, že si ho objednatel zajistí sám.
     *
     * Hledá se ve všech jazycích kapitoly, ne jen česky: kapitola se
     * nepřekládá, každý jazyk má vlastní ručně psaný text. */
    const leseniVDodavce = leseniVnejsiVCene;
    const LESENI_RE = /lešen|scaffold|gerüst|gerust|échafaud|echafaud/i;
    /* Značka {TERMIN} (dávka O3 / TD1): termín dodání zakázky v jazyce
     * TEXTU kapitoly. Přeložený už je v PODM_TERMIN_DODANI; český (pro FR
     * bez vlastního znění) se dopočte jen tehdy, když je potřeba. */
    const terminKap = jazTextu => {
      if (jazTextu === L) return placeholders.PODM_TERMIN_DODANI;
      if (jazTextu === 'cz' && typeof kryciPodminkoveSymboly === 'function')
        return kryciPodminkoveSymboly(zak, varianta, jekly, x => x).PODM_TERMIN_DODANI;
      return '';
    };
    FIRMA_KAPITOLY.forEach(kap => {
      const k = firmaKapitola(f, kap.base, L, terminKap);
      const sym = 'FIRMA_NAB_' + kap.base.replace(/^kap/, '').toUpperCase();
      const radky = (kap.base === 'kapPozadavky' && leseniVDodavce)
        ? k.radky.filter(rr => !LESENI_RE.test(rr)) : k.radky;
      placeholders[sym] = radky.join('\n');
      /* Příznak znamená „tenhle jazyk aplikace u kapitol nezná, text je
       * česky" — ne „pole je prázdné". Prázdná kapitola se z dokumentu
       * vypustí i s nadpisem (Word od šablony CN v13 se značkami kapitol,
       * P8A 29. 9. 2026) a upozorňovat na ni není na co. */
      placeholders[sym + '_CHYBI'] = k.jazykChybi ? '1' : '';
      /* Text kapitoly nese termín sám (značka {TERMIN}) — samostatná
       * odrážka „Termín dodání" by ho opakovala. */
      if (kap.base === 'kapTerminy') placeholders[sym + '_TERMIN'] = k.termin ? '1' : '';
    });
  }

  /* KAPITOLA V. PRO WORD (#330/#331, 24. 9. 2026). Šablona v11 má v kapitole
   * V. jeden symbol {{NAB_KAP_TERMINY}}: první řádek je termín dodání ze
   * zakázky (s ATYP), pod ním text z Firmy. Jeden symbol místo dvou, aby
   * při nevyplněné lhůtě nezůstal v dokumentu prázdný řádek tabulky.
   * Popisek se překládá tady — odstavec se symbolem překlad šablony
   * záměrně přeskakuje. */
  /* ZÁRUKA Z KRYCÍHO LISTU (P10.7, rozhodnutí J. V. 29. 9. 2026: „krycí
   * list má vždy přednost"). Záruka měla dvě místa: pole krycího listu
   * („Doba trvání záruky (měsíců)", výchozí 60) a větu „5 let záruka na celé
   * dílo." ve výchozím textu kapitoly V. z Firmy. Kapitola teď nese řádek
   * „Záruka: N měsíců" z krycího listu a větu o záruce z Firmy vynechá. */
  {
    const termin = String(placeholders.PODM_TERMIN_DODANI == null ? '' : placeholders.PODM_TERMIN_DODANI).trim();
    const zaruka = nabidkaZarukaText(placeholders.PODM_ZARUKA_MESICU);
    const obsah = (termin && !placeholders.FIRMA_NAB_TERMINY_TERMIN ? [P('Termín dodání') + ': ' + termin] : [])
      .concat(String(placeholders.FIRMA_NAB_TERMINY || '').split('\n')
        .filter(r => r.trim() !== '' && !nabidkaJeVetaOZaruce(r, L)));
    /* Záruka jen ke kapitole, která má i jiný obsah — prázdná kapitola
     * zmizí celá jako dosud (hlídá ji kontrola „Nevyplněné kapitoly"). */
    placeholders.NAB_KAP_TERMINY = obsah.concat(obsah.length && zaruka ? [P('Záruka') + ': ' + P(zaruka)] : [])
      .join('\n');
  }

  // Příplatky do sekce „II. Rozšíření cenové nabídky" – včetně množství a ceny.
  // Zahrnou se položky nevyřazené v kalkulaci (sloupec „Nabídka" v tabulce příplatků).
  const vynech = Zv.priplatkyVynechat || [];
  /* PŘECHODOVÉ PLECHY JAKO JEDNA POLOŽKA (9. 9. 2026, zadání J. V.: „proveď
   * sloučení přechodových plechů (materiál a montáž) v cenové nabídce do jedné
   * položky s názvem „Přechodové plechy", cena obou položek se musí sečíst").
   *
   * V kalkulaci zůstávají dvě položky — obchodník potřebuje vidět materiál
   * a montáž zvlášť, protože se dají vyřadit nezávisle. Zákazníka v nabídce
   * ale dvojice mate: kupuje jedny plechy, ne materiál a k němu práci.
   * Slučuje se proto AŽ TADY, v dokumentu, a jen když jsou v nabídce obě;
   * zůstane-li jedna, ukáže se sama a beze změny názvu. Množství se
   * neuvádí — kusy a kilogramy nejde sečíst do jednoho čísla. */
  const PLECHY = ['prechMat', 'prechMont'];
  const vybrane = r.priplatky.filter(p => !vynech.includes(p.key));
  const plechy = vybrane.filter(p => PLECHY.includes(p.key));
  /* POPIS POLOŽKY V NABÍDCE (#267, 18. 9. 2026, zadání J. V.).
   *
   * Do 18. 9. tu stálo „množství: 88,626“. Zákazníkovi to neříkalo nic —
   * je to vnitřní mezivýsledek, ne popis toho, co si kupuje. Nahradil ho
   * dodatkový text z ceníku, který píše obchodník pod položkou v kalkulaci.
   *
   * PRÁZDNÝ TEXT = ŽÁDNÝ ŘÁDEK. Nevyplněná položka tak nevypadá jako
   * nedodělek; prostě popis nemá, jako ho nemá dnes. Poznámka z výpočtu
   * (`pozn`) se k textu připojí v závorce, jako se dosud připojovala
   * k množství — nese věci jako „v základní ceně“. */
  /* JAZYKOVÁ VARIANTA TEXTU (#379, nález K18-N96, 1. 10. 2026). Ručně
   * psaný text slovník nezná, takže v cizí nabídce zůstával česky. Má-li
   * položka variantu pro jazyk tisku (administrátor ji vyplnil v číselníku
   * dodatkových textů), vytiskne se ta — beze slovníku, je to hotový text.
   * Bez varianty platí dosavadní cesta: slovník, jinak česky (a kontrola
   * „dodatekCesky" na to upozorní). Česká nabídka variantu nečte nikdy. */
  const textPolozky = (p) => {
    const t = String(p.popisNabidka || '').trim();
    if (!t) return '';
    const j = (L !== 'cz' && p.popisNabidkaJazyky) ? p.popisNabidkaJazyky[L] : '';
    if (typeof j === 'string' && j.trim()) return j.trim();
    return P(t);
  };
  const popisPolozky = (p) => {
    const t = textPolozky(p);
    const pz = p.pozn ? P(p.pozn) : '';
    if (t && pz) return t + ' (' + pz + ')';
    if (t) return t;
    return pz ? '(' + pz + ')' : '';
  };
  const priplatkyList = [];
  vybrane.forEach(p => {
    if (!PLECHY.includes(p.key)) {
      priplatkyList.push({ nazev: P(p.nazev), popis: popisPolozky(p), cena: kc(mena.na(p.sMarzi)) });
      return;
    }
    if (p.key !== plechy[0].key) return;              // druhá půlka dvojice se už nevypisuje
    if (plechy.length < 2) {                          // jen jedna z nich — beze změny
      priplatkyList.push({ nazev: P(p.nazev), popis: popisPolozky(p), cena: kc(mena.na(p.sMarzi)) });
      return;
    }
    priplatkyList.push({
      nazev: P('Přechodové plechy'),
      popis: P('materiál a montáž'),
      cena: kc(mena.na(plechy.reduce((a, x) => a + x.sMarzi, 0))),
    });
  });

  /* NÁZEV SOUBORU V JAZYCE NABÍDKY (obchodník 3. 10. 2026: „jeste by mohl
   * kalkulak generovat nazvy souboru v jazyce cenova nabidky — EN price
   * quotation, DE angebot"). Tvar podle konvence #533 (nazvy_souboru.js):
   * NABIDKA_<číslo>-OCK[-zákazník][-varianta]-<JAZYK>. */
  const nazevSouboru = (typeof nazevExportu === 'function' ? nazevExportu : require('./nazvy_souboru.js').nazevExportu)('nabidka', { cislo: placeholders.CISLO_NABIDKY,
    oblast: 'ock', jazyk: L, zakaznik: varianta.zakaznik, varianta: varianta.ridici ? '' : varianta.nazev });
  /* Úvodní fotka stavby (11. 8. 2026): obrázek do tvaru {{UVODNI_FOTO}}
   * a k němu název a popisek jako textové symboly, ať si je jde do šablony
   * dopsat pod obrázek. Do 11. 8. byla fotka jen v online náhledu a titulní
   * strana Wordu vozila fotografii cizí stavby ze šablony. */
  Object.assign(placeholders,
    typeof uvodniFotoSymboly === 'function' ? uvodniFotoSymboly(zak) : {});
  /* ŘÁDKY TABULKY, PRO KTERÉ ŠABLONA NEMÁ SYMBOL (obchodník 15. 10. 2026).
   * docxgen je naklonuje z řádku `kotva` (formát zůstane) a vepíše popisek
   * v jazyce dokumentu; šablona, která symbol už nese, dostane hodnotu do
   * svého řádku a klon nevznikne. Prázdná hodnota = řádek se nevkládá. */
  /* VLASTNÍ ŘÁDKY SPECIFIKACE (obchodník 15. 10. 2026, bod 3). Tlačítko „+ přidat
   * vlastní řádek" plní `techspec.extra` a obrazovka je ukazuje pod nadpisem
   * DALŠÍ UJEDNÁNÍ — nabídka je dosud nečetla vůbec, takže řádek zákazníkovi
   * nikdy neodešel. Do nabídky jdou jako sekce DALŠÍ UJEDNÁNÍ za SOUČÁSTÍ
   * DODÁVKY NENÍ: náhled a tisk přes 4. parametr nabidkaNahledSekce, Word
   * naklonovaným pruhem a řádky za {{TS_NENI_PRISTUP}}. Popisek i hodnota jdou
   * přes slovník jako v náhledu specifikace (neznámý text zůstane, jak ho
   * obchodník napsal). Úplně prázdný řádek se vynechá. */
  const tsExtra = ((TSv && TSv.extra) || [])
    .filter(e => e && (String(e.label || '').trim() || String(e.hodnota || '').trim()))
    .map(e => ({ nazev: P(String(e.label || '')), hodnota: P(String(e.hodnota || '')) }));
  const tsRadkyNavic = [
    { symbol: 'TS_NENI_LESENI_VNITRNI', kotva: 'TS_NENI_LESENI', pred: true,
      nazev: P('LEŠENÍ VNITŘNÍ PRO STAVBU OCK'), hodnota: placeholders.TS_NENI_LESENI_VNITRNI },
    ...(tsExtra.length ? [{ kotva: 'TS_NENI_PRISTUP', pruh: true, nazev: P('DALŠÍ UJEDNÁNÍ') }] : []),
    ...tsExtra.map(e => ({ kotva: 'TS_NENI_PRISTUP', vzdy: true, nazev: e.nazev, hodnota: e.hodnota })),
    ...nabidkaMustkyKlon(placeholders, P, sablona),
  ];
  return { placeholders, priplatky: priplatkyList, jazyk: L, platbyOck, tsRadkyNavic, tsExtra, mena,
           /* VS-E4: šachty pro náhled a pro smyčku Wordu v17 — JEN u víc šachet
            * (výsledek jedné šachty beze změny; smlouva o dílo ho přebírá celý).
            * Bez `sachtyWord` bere docxgen jednu šachtu. */
           ...(vs.sachty ? { sachty: vs.sachty, sachtyWord: vs.word } : {}),
           /* Cena nabídky bez DPH ve měně dokumentu a sazba DPH — SoD k ní
            * přičítá objednané příplatky (#447 C6, sodObjednaneSymboly). */
           ceny: { bezDph: cenaBezDphNum, dphSazba: +Cv.dph || 0 },
           /* sken podpisu s razítkem (#146) + úvodní fotka stavby */
           obrazky: Object.assign({},
             typeof zpracovatelObrazky === 'function' ? zpracovatelObrazky() : {},
             typeof uvodniFotoObrazky === 'function' ? uvodniFotoObrazky(zak) : {}),
           nazevSouboru: nazevSouboru.replace(/[\\/:*?"<>|]+/g, '-') };
}

/* ---------- VÍC ŠACHET: tabulka šachet a technická část po šachtách ----------
 * (VS-E4 #570). Vrací:
 *   sachty       null u jedné šachty, jinak [{ id, nazev, nazevTisk, ks, mustky,
 *                cena, ph }] — `ph` = symboly šachty (SACHTA_*, technická část
 *                šachty TS_* z tsSymbolySachty s její dvojicí zadání/výsledek);
 *   placeholders jen u víc šachet: řádky ceny šablony v16 prázdné (řádek
 *                VÝTAHOVÁ ŠACHTA i MŮSTKY zmizí, R14), CENA CELKEM = koncová
 *                cena, POCET_VARIANT, POCET_SACHET_CELKEM;
 *   word         pro smyčku {#sachty}…{/sachty} šablony v17 (docxgen):
 *                { polozky: [symboly šachty], spolecne: { SACHTY_* } }. Jedna
 *                šachta = jedna položka s prázdnými SACHTA_* → řádek ceny šachty
 *                ze smyčky zmizí, nadpis šachty v technické části taky a dokument
 *                je stejný jako z v16 (R15).
 * Ceny šachet: rozpočet ceny před slevou do šachet (rozpocetSachet, R7) už
 * v měně dokumentu — součet řádků = „Cena před slevou" na korunu i na euro.
 * Cena za kus se netiskne (R12). Šablona bez smyčky (v16 a starší) u víc
 * šachet tisk zastaví (vsSablonaZabrana). */
function nabidkaVsData(d, r, sablona, o) {
  const VS = (typeof sachtyZ === 'function')
    ? { sachtyZ, rozpocetSachet, vsSablonaUmiSachty, VS_SABLONA_ZABRANA } : require('./vice_sachet.js');
  const prazdna = { SACHTA_NAZEV: '', SACHTA_KS: '', SACHTA_POPIS: '', SACHTA_CENA_BEZ_DPH: '', SACHTA_TS_NAZEV: '' };
  if (!(r && Array.isArray(r.sachty) && r.sachty.length))
    return { sachty: null, placeholders: {}, word: { polozky: [prazdna], spolecne: { SACHTY_CELKEM_POPIS: '' } } };
  if (sablona && sablona.symboly && !VS.vsSablonaUmiSachty(sablona.symboly)) throw new Error(VS.VS_SABLONA_ZABRANA);
  const P = o.P;
  const zadani = VS.sachtyZ(d.ock);
  const ceny = VS.rozpocetSachet(o.cenaPredSlevou, r.sachty.map(s => +s.cenaPredZaokr || 0));
  const tsMu = (typeof tsMustky === 'function') ? tsMustky : require('./techspec.js').tsMustky;
  const tsSach = (typeof tsSachtaTechspec === 'function') ? tsSachtaTechspec : require('./techspec.js').tsSachtaTechspec;
  const celkem = r.sachty.reduce((a, s) => a + (+s.ks || 1), 0);
  const sachty = r.sachty.map((s, i) => {
    const zs = zadani[i] || {};
    const Zi = zs.zadani || d.ock.zadani;
    const ri = s.vysl || r;
    const mSk = !!(ri.mustky && ri.mustky.skladebny && +(ri.souhrn || {}).mustkyCena > 0);
    const mustky = mSk || tsMu(Zi) > 0;
    /* Nepojmenovaná šachta má v jazyce dokumentu „Šachta N" (vsNazev je česky). */
    const nazev = String(zs.nazev || '').trim() || (P('Šachta') + ' ' + (i + 1));
    const ks = +s.ks || 1;
    const tsI = o.tsSymbolySachty(tsSach(d, i), ri, Zi, mSk);
    if (sablona && sablona.symboly && !sablona.symboly.has('TS_USAZENI_LEVA')) tsI.TS_USAZENI_BOCNI = usazeniBocniSloucene(tsI, P);
    /* R14: šachta s můstky nese jejich cenu — dovětek „vč. můstků". */
    const nazevTisk = nazev + (mustky ? ', ' + P('vč. můstků') : '');
    const ph = Object.assign({
      SACHTA_NAZEV: nazevTisk, SACHTA_KS: String(ks), SACHTA_POPIS: P('počet kusů') + ': ' + ks,
      SACHTA_CENA_BEZ_DPH: o.kc(ceny[i]),
      SACHTA_TS_NAZEV: P('VARIANTA ŠACHTY') + ': ' + nazev + (ks > 1 ? ' – ' + ks + ' ' + P('ks') : ''),
    }, tsI);
    return { id: s.id, nazev, nazevTisk, ks, mustky, cena: ph.SACHTA_CENA_BEZ_DPH, ph };
  });
  const celkemPopis = P('šachet celkem') + ': ' + celkem + ' ' + P('ks');
  return {
    sachty,
    placeholders: { CENA_SACHTA_BEZ_DPH: '', CENA_MUSTKY_BEZ_DPH: '', CENA_BEZ_DPH_SACHTA: '',
      CENA_BEZ_DPH_CELKEM: o.kc(o.cenaBezDphNum), POCET_VARIANT: String(sachty.length), POCET_SACHET_CELKEM: String(celkem),
      SACHTY_CELKEM_POPIS: celkemPopis },
    word: { polozky: sachty.map(s => s.ph), spolecne: { SACHTY_CELKEM_POPIS: celkemPopis } },
  };
}

/* MŮSTKY DO ŠABLONY CN v15 A STARŠÍ (#560, A-Q8/9). Šablona bez symbolů
 * sekce MŮSTKY a řádku ceny můstků dostane řádky naklonované:
 *  – sekce: pruh „MŮSTKY MEZI BUDOVOU A OCK" a pět řádků za kotvou
 *    {{TS_SOKL}} (poslední řádek DOPLŇKOVÝCH KONSTRUKCÍ; bez něj
 *    {{TS_PRECHODOVE_PLECHY}}), formát z kotvy;
 *  – cena: řádky „VÝTAHOVÁ ŠACHTA" a „MŮSTKY MEZI BUDOVOU A OCK" (před
 *    slevou) z řádku {{CENA_BEZ_DPH}}, vložené před „Cena před slevou"
 *    (bez slevy ten řádek zmizí, klony zůstanou), a řádek {{CENA_BEZ_DPH}}
 *    dostane popisek „CENA CELKEM".
 * Šablona v16 symboly nese (`symbol`) — klon nevznikne. Bez skladebného
 * modelu prázdné. `sablona.symboly` (Word) rozhoduje o kotvě sekce. */
function nabidkaMustkyKlon(ph, P, sablona) {
  if (!ph.CENA_MUSTKY_BEZ_DPH) return [];
  const sym = sablona && sablona.symboly;
  if (sym && sym.has('CENA_MUSTKY_BEZ_DPH') && sym.has('TS_MUSTKY_ROZMER')) return [];   // šablona v16
  const kotvaTs = (sym && !sym.has('TS_SOKL') && sym.has('TS_PRECHODOVE_PLECHY')) ? 'TS_PRECHODOVE_PLECHY' : 'TS_SOKL';
  const ts = [['POČET A ROZMĚR', ph.TS_MUSTKY_ROZMER], ['PODLAHA', ph.TS_MUSTKY_PODLAHA], ['ZÁBRADLÍ', ph.TS_MUSTKY_ZABRADLI],
    ['KOTVENÍ MŮSTKŮ', ph.TS_MUSTKY_KOTVENI], ['SLOUPY NAVÍC', ph.TS_MUSTKY_SLOUPY]].filter(x => x[1]);
  return [
    { kotva: kotvaTs, symbol: 'TS_MUSTKY_ROZMER', pruh: true, nazev: P('MŮSTKY MEZI BUDOVOU A OCK') },
    ...ts.map(([n, h]) => ({ kotva: kotvaTs, symbol: 'TS_MUSTKY_ROZMER', nazev: P(n), hodnota: h })),
    { kotva: 'CENA_BEZ_DPH', symbol: 'CENA_MUSTKY_BEZ_DPH', predSymbolem: 'CENA_PRED_SLEVOU', pred: true,
      nazev: P('VÝTAHOVÁ ŠACHTA').toLocaleUpperCase(), hodnota: ph.CENA_SACHTA_BEZ_DPH },
    { kotva: 'CENA_BEZ_DPH', symbol: 'CENA_MUSTKY_BEZ_DPH', predSymbolem: 'CENA_PRED_SLEVOU', pred: true,
      nazev: P('MŮSTKY MEZI BUDOVOU A OCK'), hodnota: ph.CENA_MUSTKY_BEZ_DPH },
    { kotva: 'CENA_BEZ_DPH', symbol: 'CENA_MUSTKY_BEZ_DPH', prejmenuj: true, nazev: P('CENA CELKEM') },
  ];
}

/* Struktura náhledu podkladů – stejné sekce jako v technické specifikaci/nabídce.
 * lang = 'cz' | 'en' | 'de' | 'fr' – překládají se NÁZVY SEKCÍ a POPISKY řádků;
 * hodnoty už přeložené přicházejí v ph (nabidkaData). Neznámý výraz zůstává česky. */
/* KAPITOLY IV.–VI. A DOLOŽKY ODESLANÉ NABÍDKY (K4-N1, dávka O10, rozhodnutí
 * J. V. 21. 10. 2026). Zamčená varianta se snímkem (`data.kryci.
 * zmrazenoPodminky.kapitoly`, kryciZmrazPodminky) vrátí Firmu s texty z doby
 * odeslání; nezamčená a zamčená před O10 (bez snímku) vrátí null = tiskne se
 * aktuální Firma jako dosud. */
function nabidkaKapitolyFirma(varianta) {
  const d = varianta && varianta.data;
  const zp = varianta && varianta.zamek && varianta.zamek.zamceno && d && d.kryci && d.kryci.zmrazenoPodminky;
  const snimek = zp && zp.kapitoly;
  if (!snimek || typeof firmaKapitolyZeSnimku !== 'function') return null;
  return firmaKapitolyZeSnimku((typeof firmaAktualni === 'function') ? firmaAktualni() : {}, snimek);
}

/* Popis záměru do nabídky OCK (P6). Vlastní text z hlavičky zakázky má
 * přednost — pole `popisZameru` už existuje (dnes ho vyplňuje nabídka PROJ).
 * Jinak věta složená podle typu šachty a průchodnosti. NÁVRH ZNĚNÍ. */
function nabidkaPopisZameru(zak, Z, P) {
  const vlastni = String((zak && zak.popisZameru) || '').trim();
  if (vlastni) return vlastni;
  const tr_ = typeof P === 'function' ? P : (t => t);
  const z = Z || {};
  const veta = z.typSachty === 'exteriérová'
    ? 'Přístavba výtahu v nové ocelové konstrukci výtahové šachty k fasádě objektu.'
    : 'Vestavba výtahu v nové ocelové konstrukci výtahové šachty do vnitřního prostoru objektu.';
  const pruchozi = z.pruchoziSachta
    ? ' ' + tr_('Šachta je průchozí – nástupiště jsou na čelní i zadní straně.') : '';
  return tr_(veta) + pruchozi;
}

/* Hodnota zástupce, která nic neříká: prázdno nebo samotná pomlčka. */
function nabidkaHodnotaChybi(x) {
  return /^\s*-?\s*$/.test(String(x == null ? '' : x));
}

/* „60" → „60 měsíců" (česky; do cizího jazyka převede slovník). Nečíselnou
 * hodnotu z krycího listu nechá, jak je. */
function nabidkaZarukaText(mesicu) {
  const t = String(mesicu == null ? '' : mesicu).trim();
  if (!/^\d+$/.test(t)) return t;
  const k = parseInt(t, 10);
  return k + ' ' + (k === 1 ? 'měsíc' : (k >= 2 && k <= 4 ? 'měsíce' : 'měsíců'));
}
/* Věta o záruce v textu kapitoly z Firmy (v jazyce nabídky nebo česky —
 * francouzská kapitola bez překladu je česká). */
const NABIDKA_ZARUKA_RE = { cz: /záruk/i, en: /warrant|guarantee/i, de: /garantie|gewährleistung/i, fr: /garantie/i };
function nabidkaJeVetaOZaruce(text, lang) {
  const t = String(text || '');
  return NABIDKA_ZARUKA_RE.cz.test(t) || !!(NABIDKA_ZARUKA_RE[lang] && NABIDKA_ZARUKA_RE[lang].test(t));
}

/* `platby` = platební kalendář OCK z nabidkaData (platbyOck). Bez něj (starší
 * volající) řádky kapitoly III. jako dřív. */
/* Levá a pravá boční stěna do jednoho řádku „boční stěny" (šablona bez
 * vlastních řádků). Vlastní text „boční stěny" zůstává první. */
function usazeniBocniSloucene(ph, P) {
  const casti = [];
  if (ph.TS_USAZENI_BOCNI) casti.push(ph.TS_USAZENI_BOCNI);
  if (ph.TS_USAZENI_LEVA) casti.push(P('levá') + ' – ' + ph.TS_USAZENI_LEVA);
  if (ph.TS_USAZENI_PRAVA) casti.push(P('pravá') + ' – ' + ph.TS_USAZENI_PRAVA);
  return casti.join('; ');
}
/* `extra` (nepovinné, obchodník 15. 10. 2026) = data.tsExtra z nabidkaData —
 * vlastní řádky specifikace, už přeložené; tvoří sekci DALŠÍ UJEDNÁNÍ. */
/* `sachty` (nepovinné, VS-E4 #570) = data.sachty z nabidkaData — u víc šachet
 * technická část po šachtách a tabulka šachet v obchodní části. */
function nabidkaNahledSekce(ph, lang, platby, extra, sachty) {
  const L = lang || 'cz';
  const P = t => (L !== 'cz' && typeof tr === 'function') ? tr(t, L) : t;
  /* Sekce technické části, které popisují šachtu (VS-E4: u víc šachet za
   * každou šachtu s jejími symboly, nadpis sekce s názvem šachty). */
  const sachtaSekce = (ph) => [
    { sekce: 'ZÁKLADNÍ PARAMETRY ŠACHTY', radky: [
      ['UMÍSTĚNÍ ŠACHTY', ph.TS_UMISTENI], ['UMÍSTĚNÍ VÝTAHOVÉHO STROJE', ph.TS_UMISTENI_STROJE],
      ['ULOŽENÍ KONSTRUKCE', ph.TS_ULOZENI], ['CELKOVÁ VÝŠKA KONSTRUKCE [m] *', ph.TS_VYSKA_CELKOVA],
      ['ROZMĚR ŠACHTY – VNITŘNÍ [mm] *', P('šířka') + ' ' + ph.TS_SIRKA_VNITRNI + ' × ' + P('hloubka') + ' ' + ph.TS_HLOUBKA_VNITRNI],
      /* Bez ručního přepisu vnějšího rozměru vycházelo „šířka - × hloubka -"
       * (P9 / K12-N48, 24. 9. 2026). Word takový řádek vynechá, náhled teď
       * taky — když chybí obě hodnoty. */
      ...(nabidkaHodnotaChybi(ph.TS_SIRKA_VNEJSI) && nabidkaHodnotaChybi(ph.TS_HLOUBKA_VNEJSI) ? [] :
        [['ROZMĚR ŠACHTY – VNĚJŠÍ [mm] *', P('šířka') + ' ' + ph.TS_SIRKA_VNEJSI + ' × ' + P('hloubka') + ' ' + ph.TS_HLOUBKA_VNEJSI]]),
      ['ZDVIH VÝTAHU [m] *', ph.TS_ZDVIH], ['DOLNÍ PŘEJEZD [mm]', ph.TS_DOLNI_PREJEZD],
      ['HORNÍ PŘEJEZD [mm]', ph.TS_HORNI_PREJEZD],
      ['POČET STANIC / NÁSTUPIŠŤ', ph.TS_STANICE + ' · ' + ph.TS_KABINA],
      ['PŮDORYSNÉ ŘEŠENÍ ŠACHTY', ph.TS_PUDORYS],
      /* Usazení OCK jako v technické specifikaci; řádek bez volby zmizí
       * (12. 10. 2026, pokyn J. V.). */
      ...[['USAZENÍ OCK – ČELNÍ STĚNA', ph.TS_USAZENI_CELNI], ['USAZENÍ OCK – BOČNÍ STĚNY', ph.TS_USAZENI_BOCNI],
        ['USAZENÍ OCK – LEVÁ BOČNÍ STĚNA', ph.TS_USAZENI_LEVA], ['USAZENÍ OCK – PRAVÁ BOČNÍ STĚNA', ph.TS_USAZENI_PRAVA],
        ['USAZENÍ OCK – ZADNÍ STĚNA', ph.TS_USAZENI_ZADNI]].filter(x => !nabidkaHodnotaChybi(x[1]))] },
    { sekce: 'KONSTRUKČNÍ ŘEŠENÍ ŠACHTY', radky: [
      ['TYP KONSTRUKCE (ENG-M)', ph.TS_TYP_KONSTRUKCE], ['SVISLÉ NOSNÉ PRVKY', ph.TS_SVISLE_NOSNE],
      ['PROFIL SLOUPKŮ **', ph.TS_PROFIL_SLOUPKU], ['VODOROVNÉ NOSNÉ PRVKY', ph.TS_VODOROVNE_NOSNE],
      ['SVISLÁ ROZTEČ PŘÍČNÍKŮ', ph.TS_ROZTEC], ['PROFIL PŘÍČNÍKŮ **', ph.TS_PROFIL_PRICNIKU],
      ['KOTVENÍ KONSTRUKCE (POLOHA)', ph.TS_KOTVENI_POLOHA], ['KOTVENÍ KONSTRUKCE (TYP)', ph.TS_KOTVENI_TYP],
      ['ŘEŠENÍ PORTÁLŮ (PROSTOROVÉ)', ph.TS_PORTALY_PROSTOR], ['ŘEŠENÍ PORTÁLŮ (ČLENĚNÍ)', ph.TS_PORTALY_CLENENI],
      ['POVRCHOVÁ ÚPRAVA KONSTRUKCE', ph.TS_POVRCH_UPRAVA], ['HÁKY PRO ČIŠTĚNÍ ŠACHTY', ph.TS_HAKY],
      ['STŘECHA ŠACHTY', ph.TS_STRECHA], ['POŽÁRNÍ KLASIFIKACE KONSTRUKCE', ph.TS_POZARNI]] },
    { sekce: 'OPLÁŠTĚNÍ ŠACHTY', radky: [
      ['TYP OPLÁŠTĚNÍ', ph.TS_TYP_OPLASTENI], ['MATERIÁL OPLÁŠTĚNÍ', ph.TS_MATERIAL_OPLASTENI],
      ['POVRCHOVÁ ÚPRAVA OPLÁŠTĚNÍ', ph.TS_POVRCH_OPLASTENI], ['OPLÁŠTĚNÍ ČELA POD NÁSTUPIŠTĚM', ph.TS_OPLASTENI_CELA],
      ['ROZSAH OPLÁŠTĚNÍ', ph.TS_ROZSAH_OPLASTENI], ['OPLÁŠTĚNÍ NADSVĚTLÍKŮ', ph.TS_OPLASTENI_NADSVETLIKU],
      ...(ph.TS_SVETLIKY_DVERI ? [['SVĚTLÍKY U ŠACHETNÍCH DVEŘÍ', ph.TS_SVETLIKY_DVERI]] : []),   // #375
      ['VNĚJŠÍ OPLÁŠTĚNÍ ŠACHTY', ph.TS_UMISTENI_OPLASTENI], ['ZPŮSOB KOTVENÍ OPLÁŠTĚNÍ', ph.TS_KOTVENI_OPLASTENI],
      ['VZHLED KOTVENÍ ZASKLENÍ', ph.TS_PARAMETRY_KOTVY], ['NAPOJENÍ ŠACHETNÍCH DVEŘÍ', ph.TS_NAPOJENI_DVERI]] },
    { sekce: 'DOPLŇKOVÉ KONSTRUKCE', radky: [
      ['MONTÁŽNÍ NOSNÍK NEBO OKA', ph.TS_MONTAZNI_NOSNIK], ['PŘÍPRAVA PRO KOTVENÍ VÝTAHU', ph.TS_PRIPRAVA_KOTVENI],
      ['ODVĚTRÁNÍ ŠACHTY', ph.TS_ODVETRANI], ['PODCHOZÍ NOSNÁ OCK', ph.TS_PODCHOZI_OCK],
      ...(ph.TS_PROSKLENA_PRICKA ? [['PROSKLENÁ PŘÍČKA VEDLE ŠACHTY', ph.TS_PROSKLENA_PRICKA]] : []),
      ...(ph.TS_PROSKLENA_STRISKA ? [['PROSKLENÁ STŘÍŠKA', ph.TS_PROSKLENA_STRISKA]] : []),   // P10 / K12-N46
      ...(ph.TS_MUSTKY ? [['MŮSTKY MEZI BUDOVOU A OCK', ph.TS_MUSTKY]] : []),                   // P7 / K13-N59
      ['PŘECHODOVÉ PLECHY V NÁSTUPIŠTÍCH', ph.TS_PRECHODOVE_PLECHY],
      /* Sokl sem patří, jen když se dodává — jinak stojí níž mezi tím, co
       * součástí dodávky není. Rozhoduje to, který ze zástupců je vyplněný;
       * tahle funkce dostává jen `ph`, jinou cestou se sem odpověď nedostane. */
      ...(ph.TS_SOKL ? [['OPLECHOVÁNÍ SOKLU PROHLUBNĚ', ph.TS_SOKL]] : [])] },
    /* #560: sekce MŮSTKY jen ve skladebném modelu (symboly jinak prázdné). */
    ...(ph.TS_MUSTKY_ROZMER ? [{ sekce: 'MŮSTKY MEZI BUDOVOU A OCK', radky: [
      ['POČET A ROZMĚR', ph.TS_MUSTKY_ROZMER], ['PODLAHA', ph.TS_MUSTKY_PODLAHA],
      ['ZÁBRADLÍ', ph.TS_MUSTKY_ZABRADLI], ['KOTVENÍ MŮSTKŮ', ph.TS_MUSTKY_KOTVENI],
      ...(ph.TS_MUSTKY_SLOUPY ? [['SLOUPY NAVÍC', ph.TS_MUSTKY_SLOUPY]] : [])] }] : []),
  ];
  const sachtySekce = !(Array.isArray(sachty) && sachty.length) ? sachtaSekce(ph)
    : [].concat(...sachty.map(sa => sachtaSekce(Object.assign({}, ph, sa.ph)).map(sk => ({
      sekce: { hotovo: P(sk.sekce) + ' – ' + sa.nazev + (sa.ks > 1 ? ' (' + sa.ks + ' ' + P('ks') + ')' : '') }, radky: sk.radky }))));
  const sekce = [
    { sekce: 'HLAVIČKA NABÍDKY', radky: [
      ['Objednatel', ph.OBJEDNATEL], ['Kontaktní osoba', ph.OBJEDNATEL_KONTAKT], ['Datum', ph.DATUM],
      ['Název akce', ph.NAZEV_AKCE], ['Číslo nabídky', ph.CISLO_NABIDKY], ['Adresa stavby', ph.ADRESA]] },
    ...sachtySekce,
    { sekce: 'STAVEBNÍ A PŘÍPRAVNÉ PRÁCE', radky: [
      ['LEŠENÍ – UVNITŘ ŠACHTY', ph.TS_LESENI_UVNITR], ['LEŠENÍ – VNĚ ŠACHTY', ph.TS_LESENI_VNE],
      ['ZÁBRANY DO DVEŘNÍCH VSTUPŮ', ph.TS_ZABRANY_VSTUPY]] },
    { sekce: 'PROJEKČNÍ A PŘÍPRAVNÉ PRÁCE', radky: [
      ['ZAMĚŘENÍ PROSTORŮ 3D SKENEREM', ph.TS_SKEN3D], ['VÝSTUP ZE ZAMĚŘENÍ PRO OBJEDNATELE', ph.TS_VYSTUP_ZAMERENI],
      ['ZPRACOVÁNÍ DÍLENSKÉ DOKUMENTACE', ph.TS_DILENSKA_DOK], ['OVĚŘOVACÍ STATICKÝ VÝPOČET KONSTRUKCE', ph.TS_STATIKA]] },
    { sekce: 'SOUČÁSTÍ DODÁVKY NENÍ', radky: [
      ['OSVĚTLENÍ NÁSTUPIŠŤ', ph.TS_NENI_OSVETLENI], ['NUCENÉ VĚTRÁNÍ ŠACHTY VENTILÁTOREM', ph.TS_NENI_VENTILATOR],
      /* Řádek zmizí, když je vnější lešení v základní ceně (P8/7) — dodávku
       * pak říká LEŠENÍ – VNĚ ŠACHTY výš. Word ho vyhodí sám (prázdný TS_*),
       * náhled se musí zeptat tady, stejně jako u soklu. */
      ...(ph.TS_NENI_LESENI_VNITRNI ? [['LEŠENÍ VNITŘNÍ PRO STAVBU OCK', ph.TS_NENI_LESENI_VNITRNI]] : []),   // obchodník 15. 10.
      ...(ph.TS_NENI_LESENI ? [['LEŠENÍ KOLEM OCK PRO PROVEDENÍ OPLÁŠTĚNÍ', ph.TS_NENI_LESENI]] : []),
      ['ODBĚRNÉ MÍSTO EL. ENERGIE PO DOBU REALIZACE', ph.TS_NENI_ODBERNE], ['ÚLOŽNÉ PROSTORY', ph.TS_NENI_ULOZNE],
      ['DOZDĚNÍ KOLEM ŠACHETNÍCH DVEŘÍ', ph.TS_NENI_DOZDENI], ['STAVEBNÍ PŘÍPRAVA', ph.TS_NENI_STAVEBNI],
      ...(ph.TS_NENI_SOKL ? [['OPLECHOVÁNÍ SOKLU PROHLUBNĚ', ph.TS_NENI_SOKL]] : []),
      ['NAPÁJENÍ VÝTAHU VČET. REVIZNÍ ZPRÁVY', ph.TS_NENI_NAPAJENI],
      ['PROHLUBEŇ PRO ZALOŽENÍ OCK VE SPRÁVNÉ POZICI A ROZMĚRU', ph.TS_NENI_PROHLUBEN],
      ['DOSTATEČNÉ PŘÍSTUPOVÉ A MANIPULAČNÍ PROSTORY', ph.TS_NENI_PRISTUP]] },
    /* vlastní řádky specifikace (bod 3); popisek už je přeložený → { hotovo } */
    ...((extra || []).length ? [{ sekce: 'DALŠÍ UJEDNÁNÍ',
      radky: extra.map(e => [{ hotovo: e.nazev }, e.hodnota]) }] : []),
    { sekce: 'B. OBCHODNÍ ČÁST – CENOVÁ NABÍDKA', radky: [
      /* VS-E4 (R4, R12, R14): u víc šachet řádek za každou variantu šachty
       * (cena všech kusů, můstky v ceně své šachty), sleva a součet s počtem
       * šachet celkem. */
      ...(Array.isArray(sachty) && sachty.length ? [
        ...sachty.map(sa => [{ hotovo: sa.nazevTisk + ' – ' + sa.ks + ' ' + P('ks') + ' (' + P('bez DPH') + ')' }, sa.cena]),
        ...(ph.SLEVA_KC ? [[{ hotovo: P('Sleva') + ' ' + ph.SLEVA_PROC + ' %' }, '− ' + ph.SLEVA_KC]] : []),
        [{ hotovo: P('Cena celkem (bez DPH)') + ' – ' + ph.SACHTY_CELKEM_POPIS }, ph.CENA_BEZ_DPH]]
      /* #560: s můstky šachta a můstky zvlášť (před slevou), sleva a součet. */
      : ph.CENA_MUSTKY_BEZ_DPH ? [
        ['Výtahová šachta (bez DPH)', ph.CENA_SACHTA_BEZ_DPH],
        ['Můstky mezi budovou a OCK (bez DPH)', ph.CENA_MUSTKY_BEZ_DPH],
        ...(ph.SLEVA_KC ? [[{ hotovo: P('Sleva') + ' ' + ph.SLEVA_PROC + ' %' }, '− ' + ph.SLEVA_KC]] : []),
        ['Cena celkem (bez DPH)', ph.CENA_BEZ_DPH]]
        : [['Výtahová šachta (bez DPH)', ph.CENA_BEZ_DPH]]),
      /* skládaný popisek (číslo sazby uprostřed) se překládá po částech, proto je
       * označen jako HOTOVÝ – závěrečná mapa ho už nesmí překládat podruhé */
      [{ hotovo: P('DPH') + ' ' + ph.DPH_SAZBA + ' % (' + ph.DPH_NAZEV + ' ' + P('sazba') + ')' }, ph.DPH_KC],
      ['CELKEM za nabídku (včetně DPH)', ph.CENA_S_DPH]] },
  ];

  /* ---------- KAPITOLY III.–VI. (#282, nálezy N15 a N16) ----------
   *
   * Do 21. 9. 2026 nabídka končila cenou. Wordová šablona přitom měla ještě
   * čtyři kapitoly a dvě doložky — dokument z aplikace se tedy s dokumentem,
   * který zákazník dostal, neshodoval. obchodník: „nám tam schází úplně".
   *
   * KAPITOLA III. SE SKLÁDÁ Z ÚDAJŮ ZAKÁZKY, ne z pevného textu: zálohy,
   * splatnost i platnost nabídky už v krycím listu jsou a do šablony jdou
   * jako {{PODM_…}}. Druhý opis týchž vět by se dřív nebo později rozešel
   * s tím, co obchodník u zakázky opravdu nastavil.
   *
   * Kapitoly IV.–VI. a doložky jsou firemní standard z Nastavení → Firma,
   * jeden řádek = jedna odrážka. Jsou už v cílovém jazyce, takže se přes ně
   * NESMÍ pustit `tr()` podruhé — proto `{ hotovo: … }`. */
  const kapRadky = (sym) => {
    const radky = String(ph[sym] || '').split('\n').map(r => r.trim()).filter(Boolean);
    /* PRÁZDNÁ KAPITOLA ZMIZÍ CELÁ. Upozornění na nedodaný překlad se přidá
     * jen k textu, který opravdu je — jinak by z nevyplněného pole zbyl
     * nadpis a pod ním varování, což vypadá jako chyba aplikace. */
    if (!radky.length) return [];
    const hlavicka = ph[sym + '_CHYBI']
      ? [[{ hotovo: '⚠ ' + P('Překlad do tohoto jazyka nebyl dodán — text je česky.') }, '']]
      : [];
    return hlavicka.concat(radky.map(r => [{ hotovo: r }, '']));
  };

  /* SPLÁTKY PODLE TÝCHŽ PRAVIDEL JAKO WORD (etapa A, D1 + D2 — 30. 9. 2026).
   * Splátka s 0 % („Bez zálohy") řádek nemá a ostatní dílčí faktury se
   * přečíslují; měsíční fakturace má místo splátek jeden řádek „Způsob
   * fakturace" se schválenou větou. Hodnoty jsou texty krycího listu
   * (přeložené v nabidkaData). Odeslaná nabídka z doby před pravidly
   * (platby.stary) i volající bez kalendáře mají řádky jako dřív. */
  const nove = !!(platby && !platby.stary && Array.isArray(platby.splatky));
  const hodnotaSplatky = { zaloha1: ph.PODM_ZALOHA1, faktura2: ph.PODM_FAKTURA2, fakturaKonc: ph.PODM_FAKTURA_KONC };
  const splatkyRadky = !nove
    ? [['1. dílčí faktura', ph.PODM_ZALOHA1], ['2. dílčí faktura', ph.PODM_FAKTURA2], ['Konečná faktura', ph.PODM_FAKTURA_KONC]]
    : (platby.mesicne ? [['Způsob fakturace', ph.PODM_FAKTURACE_MESICNE]]
      : platby.splatky.map(s => [s.poradi ? s.poradi + '. dílčí faktura' : 'Konečná faktura', hodnotaSplatky[s.id]]));
  const platebni = splatkyRadky.concat([
    ['Splatnost faktur (dní)', ph.PODM_SPLATNOST_DNI],
    ['Platnost nabídky', ph.PODM_PLATNOST_NABIDKY],
  ], nove && platby.mesicne ? [] : [['Způsob fakturace', ph.PODM_ZPUSOB_FAKTURACE]])
    .filter(r => String(r[1] == null ? '' : r[1]).trim() !== '');
  if (platebni.length) sekce.push({ sekce: 'III. PLATEBNÍ PODMÍNKY', radky: platebni });

  [['IV. POŽADAVKY PRO PROVEDENÍ REALIZACE', 'FIRMA_NAB_POZADAVKY'],
   ['V. TERMÍNY REALIZACE', 'FIRMA_NAB_TERMINY'],
   ['VI. PŘEDÁNÍ DÍLA', 'FIRMA_NAB_PREDANI'],
   ['DOLOŽKY', 'FIRMA_NAB_DOLOZKY']].forEach(([nazev, sym]) => {
    let radky = kapRadky(sym);
    /* TERMÍN DODÁNÍ JAKO PRVNÍ ODRÁŽKA KAPITOLY V. (#330, nález TD1,
     * rozhodnutí J. V. 24. 9. 2026 k podkladu #277, bod 2).
     *
     * Krycí list počítá termín dodání i s prodloužením za ATYP (+4 týdny,
     * zadání 21. 8. 2026) a skládá z něj {{PODM_TERMIN_DODANI}}. Do nabídky
     * se ale nedostal: kapitola V. je text z Firmy a ten říkal pevné
     * „cca 12 týdnů" i u atypické zakázky. Termín se proto bere ze zakázky
     * (tentýž symbol, který dostane i wordová šablona v11) a zbytek
     * kapitoly zůstává textem z Firmy. Prázdný termín se nevymýšlí —
     * odrážka se vynechá (hlídá to kontrola před nabídkou). */
    const termin = String(ph.PODM_TERMIN_DODANI == null ? '' : ph.PODM_TERMIN_DODANI).trim();
    if (sym === 'FIRMA_NAB_TERMINY' && termin && !ph.FIRMA_NAB_TERMINY_TERMIN)
      radky = [['Termín dodání', termin]].concat(radky);
    /* Záruka z krycího listu, věta o záruce z Firmy pryč (P10.7). */
    /* Hodnota se překládá stejně jako ve Wordu (K18-N93, 30. 9. 2026): popisek
     * řádku přeloží `popisek` níž, hodnotu ne — všech 22 cizojazyčných
     * nabídek tak psalo „Warranty 60 měsíců". „60 měsíců" převede vzor
     * v preklad.js; nečíselný text z krycího listu projde beze změny. */
    if (sym === 'FIRMA_NAB_TERMINY') {
      radky = radky.filter(r => !(r[0] && typeof r[0] === 'object' && nabidkaJeVetaOZaruce(r[0].hotovo, L)));
      const zaruka = nabidkaZarukaText(ph.PODM_ZARUKA_MESICU);
      if (zaruka && radky.some(r => !(r[0] && typeof r[0] === 'object' && /⚠/.test(r[0].hotovo || ''))))
        radky = radky.concat([['Záruka', P(zaruka)]]);
    }
    /* Prázdná kapitola se vynechá i s nadpisem — stejné pravidlo jako
     * u prázdných řádků technické specifikace ve Wordu. */
    if (radky.length) sekce.push({ sekce: nazev, radky });
  });

  // Dodavatel (naše firma) – SET-3; sekce se vypustí, nejsou-li údaje vyplněné
  if (typeof firmaRadky === 'function') {
    const dodavatel = firmaRadky(typeof firmaAktualni === 'function' ? firmaAktualni() : null, null);
    if (dodavatel.length) sekce.push({ sekce: 'DODAVATEL', radky: dodavatel });
  }

  /* Popisek se přeloží právě jednou. Objekt { hotovo: … } znamená „už přeloženo“
   * (skládané popisky s číslem uprostřed) – ten se jen rozbalí. */
  const popisek = l => (l && typeof l === 'object' && l.hotovo !== undefined) ? l.hotovo : P(l);
  return sekce.map(s => ({ sekce: popisek(s.sekce), radky: s.radky.map(r => [popisek(r[0]), r[1]]) }));
}

/* registrace do jednotného registru dokumentů (dokumenty.js) */
if (typeof dokumentRegistruj === 'function')
  dokumentRegistruj('nabidka', {
    nazev: 'Cenová nabídka (CN)', sablona: 'Sablona_NABIDKA_CN.docx',
    /* Symboly šablony: umí řádky levé a pravé boční stěny? (12. 10. 2026) */
    sablonaSymboly: true,
    builder: (zak, varianta, jekly, lang, sablona) => nabidkaData(zak, varianta, jekly, lang, sablona),
  });

if (typeof module !== 'undefined') module.exports = { nabidkaData, nabidkaKapitolyFirma, usazeniBocniSloucene, nabidkaNahledSekce, nabidkaPopisZameru, nabidkaVsData };
