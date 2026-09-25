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
function nabidkaData(zak, varianta, jekly, lang) {
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
  const soklJe = (r.volitelneKatalog || []).some(x => x.key === 'sokl' && x.zahrnuto);

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
  const soklPriplatek = (r.priplatky || []).some(x => x.key === 'sokl')
    && !(Zv.priplatkyVynechat || []).includes('sokl');

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
  const ts = id => {
    if (!pole[id]) return P(' -');
    const h = tsHodnota(pole[id], TSv, r, Zv, Cv, L);
    return h.prelozeno ? h.text : P(h.text);
  };

  /* Pole, které v téhle zakázce nic neříká („ -"), vrací prázdno — řádek
   * pak z dokumentu zmizí (docxgen i nabidkaNahledSekce). */
  const tsNeboPrazdno = id => {
    const t = ts(id);
    return /^\s*-?\s*$/.test(String(t == null ? '' : t)) ? '' : t;
  };

  // vnější rozměr: z ručního přepisu pole „ROZMĚR ŠACHTY – VNĚJŠÍ“, je-li ve tvaru „š × h“
  let sirkaVnejsi = ' -', hloubkaVnejsi = ' -';
  const mVnejsi = String(TSv.hodnoty.rozmerVnejsi || '').match(/(\d[\d\s]*)\D+(\d[\d\s]*)/);
  if (mVnejsi) { sirkaVnejsi = mVnejsi[1].trim(); hloubkaVnejsi = mVnejsi[2].trim(); }

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
  if (mena.eur) {
    cenaPredSlevou = mena.na(cenaPredSlevou);
    cenaBezDphNum = mena.na(cenaBezDphNum);
    slevaKcNum = cenaPredSlevou - cenaBezDphNum;   // rozdíl převedených částek — sedí na euro
    dphKcNum = Math.ceil(cenaBezDphNum * Cv.dph);
    cenaSDphNum = cenaBezDphNum + dphKcNum;
  }

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

    TS_UMISTENI: ts('umisteni'), TS_UMISTENI_STROJE: ts('umisteniStroje'),
    TS_ULOZENI: ts('ulozeni'), TS_VYSKA_CELKOVA: ts('vyskaCelkova'),
    TS_SIRKA_VNITRNI: String(Math.round(Zv.sirka * 1000)),
    TS_HLOUBKA_VNITRNI: String(Math.round(Zv.hloubka * 1000)),
    TS_SIRKA_VNEJSI: sirkaVnejsi, TS_HLOUBKA_VNEJSI: hloubkaVnejsi,
    TS_ZDVIH: cislo(Zv.zdvih), TS_DOLNI_PREJEZD: String(Math.round(Zv.prohluben * 1000)),
    TS_HORNI_PREJEZD: String(Math.round(Zv.prejezd * 1000)),
    TS_STANICE: ts('stanice'), TS_KABINA: ts('kabina'), TS_PUDORYS: ts('pudorys'),
    TS_USAZENI_CELNI: ts('usazeniCelni'), TS_USAZENI_BOCNI: ts('usazeniBocni'),
    TS_USAZENI_ZADNI: ts('usazeniZadni'),
    TS_TYP_KONSTRUKCE: ts('typKonstrukce'), TS_SVISLE_NOSNE: ts('svisleNosne'),
    TS_PROFIL_SLOUPKU: ts('profilSloupku'), TS_VODOROVNE_NOSNE: ts('vodorovneNosne'),
    TS_ROZTEC: ts('roztecPricniku'), TS_PROFIL_PRICNIKU: ts('profilPricniku'),
    TS_KOTVENI_POLOHA: ts('kotveniPoloha'), TS_KOTVENI_TYP: ts('kotveniTyp'),
    TS_PORTALY_PROSTOR: ts('portalyProstor'), TS_PORTALY_CLENENI: ts('portalyCleneni'),
    TS_POVRCH_UPRAVA: ts('povrchovaUprava'), TS_HAKY: ts('haky'),
    TS_STRECHA: ts('strecha'), TS_POZARNI: ts('pozarni'),
    TS_TYP_OPLASTENI: ts('typOplasteni'), TS_MATERIAL_OPLASTENI: ts('materialOplasteni'),
    TS_POVRCH_OPLASTENI: ts('povrchOplasteni'), TS_OPLASTENI_CELA: ts('oplasteniCela'),
    TS_ROZSAH_OPLASTENI: ts('rozsahOplasteni'), TS_OPLASTENI_NADSVETLIKU: ts('oplasteniNadsvetliku'),
    TS_UMISTENI_OPLASTENI: ts('umisteniOplasteni'), TS_KOTVENI_OPLASTENI: ts('kotveniOplasteni'),
    TS_PARAMETRY_KOTVY: ts('parametryKotvy'), TS_NAPOJENI_DVERI: ts('napojeniDveri'),
    TS_MONTAZNI_NOSNIK: ts('montazniNosnik'), TS_PRIPRAVA_KOTVENI: ts('pripravaKotveni'),
    TS_ODVETRANI: ts('odvetrani'), TS_PODCHOZI_OCK: ts('podchoziOck'),
    /* POPIS ZÁMĚRU A VĚTA O OPLÁŠTĚNÍ (P6 / K13-N57, 24. 9. 2026). Šablona v11
     * má natvrdo odstavec o přístavbě k dvorní fasádě a o izolačním dvojskle —
     * tiskne se i u interiérových šachet s čistým VSG. Tihle zástupci jsou
     * připravení pro upravenou šablonu (šablona v11 je zatím nepoužívá).
     * Znění vět je NÁVRH ke schválení J. V. (podklady/K13_ROZBOR_2026-09-24.md);
     * překlady přibudou po schválení. */
    POPIS_ZAMERU_OCK: nabidkaPopisZameru(zak, Zv, P),
    OPLASTENI_VETA: (() => {
      const m = ts('materialOplasteni');
      return nabidkaHodnotaChybi(m) ? '' : P('Opláštění šachty') + ': ' + m + '.';
    })(),
    TS_PRECHODOVE_PLECHY: ts('prechodovePlechy'),
    /* Příčka a stříšky vedle šachty (P10 / K12-N46, 24. 9. 2026). Stříšky
     * jsou v základní ceně (sekce opláštění), technická specifikace je
     * vypisuje, ale do nabídky se nedostávaly. Prázdná hodnota = řádek
     * zmizí (Word i náhled), stejně jako u soklu. Šablona v11 na ně zatím
     * symbol nemá — doplní se se šablonou. */
    TS_PROSKLENA_PRICKA: tsNeboPrazdno('prosklenaPricka'),
    TS_PROSKLENA_STRISKA: tsNeboPrazdno('prosklenaStriska'),
    TS_MUSTKY: tsNeboPrazdno('mustky'),   // P7 / K13-N59: počet a rozměr můstků
    TS_LESENI_UVNITR: ts('leseniUvnitr'), TS_LESENI_VNE: ts('leseniVne'),
    TS_ZABRANY_VSTUPY: ts('zabranyVstupy'),
    TS_SKEN3D: ts('sken3d'), TS_VYSTUP_ZAMERENI: ts('vystupZamereni'),
    TS_DILENSKA_DOK: ts('dilenskaDok'), TS_STATIKA: ts('statika'),
    TS_NENI_OSVETLENI: ts('neni1'), TS_NENI_VENTILATOR: ts('neni2'),
    TS_NENI_LESENI: ts('neni3'), TS_NENI_ODBERNE: ts('neni4'),
    TS_NENI_ULOZNE: ts('neni5'), TS_NENI_DOZDENI: ts('neni7'),
    TS_NENI_STAVEBNI: ts('neni8'),
    /* Vyplněný je vždy právě JEDEN z nich, druhý zůstává prázdný — tím se
     * řádek přesune mezi sekcemi. Prázdná hodnota je v téhle aplikaci
     * zavedený způsob, jak řádek zmizí: docxgen.js vyhodí z Wordu řádek,
     * jehož všechny TS_* zástupce jsou prázdné, i s popiskem, a pak i sekční
     * pruh, kterému nezbyl jediný datový řádek. Náhled se řídí týmž. */
    TS_SOKL: soklJe ? P('je součástí dodávky') : '',
    TS_NENI_SOKL: soklJe ? '' : (soklPriplatek ? P('nabízeno jako příplatek') : P('není součástí nabídky')),
    TS_NENI_NAPAJENI: ts('neni9'), TS_NENI_PROHLUBEN: ts('neni10'),
    TS_NENI_PRISTUP: ts('neni11'),

    CENA_BEZ_DPH: kc(cenaBezDphNum),
    DPH_SAZBA: String(Math.round(Cv.dph * 100)),
    /* Nulová sazba má vlastní jméno (22. 9. 2026 večer). Od té doby, co
     * zahraniční řada ceníku přepíná DPH na 0 %, by tu podmínka `<= 0.15`
     * tiskla „DPH 0 % (snížená sazba)" — tedy nesmysl, který by zákazník
     * četl jako chybu v nabídce. */
    DPH_NAZEV: P(!(+Cv.dph > 0) ? 'nulová' : (Cv.dph <= 0.15 ? 'snížená' : 'základní')),
    DPH_KC: kc(dphKcNum),
    CENA_S_DPH: kc(cenaSDphNum),
    CENA_PRED_SLEVOU: kc(cenaPredSlevou),
    SLEVA_PROC: slevaP ? String(Math.round(slevaP * 10000) / 100) : '0',
    SLEVA_KC: kc(slevaKcNum),
    /* Symbol zůstává kvůli starším šablonám, ale je VŽDY prázdný (#135):
     * zaokrouhlují se položky, takže žádný dorovnávací řádek nevzniká.
     * Kdyby se klíč zrušil, zůstal by v takové šabloně viset text {{…}}. */
    ZAOKROUHLENI_KC: '',
    PRIP_LESENI_VNEJSI: prip('leseniVnejsi'),
    PRIP_SKN: prip('skn'),
  };

  // Firemní údaje zhotovitele (SET-3) – symboly {{FIRMA_…}} do šablony i náhledu.
  // Vlastní jména, adresy a čísla se nikdy nepřekládají, jen země (viz firma.js).
  if (typeof firmaPlaceholders === 'function')
    Object.assign(placeholders, firmaPlaceholders(
      typeof firmaAktualni === 'function' ? firmaAktualni() : null, P));

  /* Zpracovatel nabídky (#146) – symboly {{ZPRAC_…}} do bloku „Vypracoval“.
   * Nabídku podepisuje ten obchodní technik, který je právě přihlášený;
   * do 5. 8. 2026 byl v šabloně natvrdo jeden kolega. Bez přihlášení
   * (offline build na ploše) se použijí firemní údaje – viz zpracovatel.js. */
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

  /* KAPITOLY IV.–VI. A DOLOŽKY (#282, nálezy N15 a N16 kola 6).
   *
   * Wordová šablona je má, aplikace je neuměla — tiskla tedy nabídku bez
   * kapitol POŽADAVKY PRO PROVEDENÍ REALIZACE, TERMÍNY REALIZACE, PŘEDÁNÍ
   * DÍLA a bez závěrečných doložek. D. Sikora to hlásil slovy „nám tam
   * schází úplně". Texty jsou firemní standard (Nastavení → Firma), každý
   * jazyk má vlastní.
   *
   * NEPŘEKLÁDAJÍ SE. Jsou to smluvní podmínky napsané člověkem v cílovém
   * jazyce; `tr()` by přes ně jel podruhé a hlásil chybějící hesla u textu,
   * který je v pořádku. Chybějící jazyk se pozná podle `chybi` a nabídka to
   * řekne nahlas — tiché nahrazení češtinou by znamenalo poslat cizímu
   * zákazníkovi podmínky v jazyce, kterému nemusí rozumět. */
  if (typeof firmaKapitola === 'function' && typeof FIRMA_KAPITOLY !== 'undefined') {
    const f = (typeof firmaAktualni === 'function') ? firmaAktualni() : null;
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
    FIRMA_KAPITOLY.forEach(kap => {
      const k = firmaKapitola(f, kap.base, L);
      const sym = 'FIRMA_NAB_' + kap.base.replace(/^kap/, '').toUpperCase();
      const radky = (kap.base === 'kapPozadavky' && leseniVDodavce)
        ? k.radky.filter(rr => !LESENI_RE.test(rr)) : k.radky;
      placeholders[sym] = radky.join('\n');
      /* Příznak znamená „tenhle jazyk aplikace u kapitol nezná, text je
       * česky" — ne „pole je prázdné". Prázdná kapitola se z dokumentu
       * vypustí i s nadpisem a upozorňovat na ni není na co. */
      placeholders[sym + '_CHYBI'] = k.jazykChybi ? '1' : '';
    });
  }

  /* KAPITOLA V. PRO WORD (#330/#331, 24. 9. 2026). Šablona v11 má v kapitole
   * V. jeden symbol {{NAB_KAP_TERMINY}}: první řádek je termín dodání ze
   * zakázky (s ATYP), pod ním text z Firmy. Jeden symbol místo dvou, aby
   * při nevyplněné lhůtě nezůstal v dokumentu prázdný řádek tabulky.
   * Popisek se překládá tady — odstavec se symbolem překlad šablony
   * záměrně přeskakuje. */
  {
    const termin = String(placeholders.PODM_TERMIN_DODANI == null ? '' : placeholders.PODM_TERMIN_DODANI).trim();
    placeholders.NAB_KAP_TERMINY = (termin ? [P('Termín dodání') + ': ' + termin] : [])
      .concat(String(placeholders.FIRMA_NAB_TERMINY || '').split('\n').filter(r => r.trim() !== ''))
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
  const popisPolozky = (p) => {
    const t = String(p.popisNabidka || '').trim();
    const pz = p.pozn ? P(p.pozn) : '';
    if (t && pz) return P(t) + ' (' + pz + ')';
    if (t) return P(t);
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

  const nazevSouboru = 'NABÍDKA_' + (placeholders.CISLO_NABIDKY || 'CN')
    + (varianta.zakaznik ? '_' + varianta.zakaznik : '')
    + (varianta.ridici ? '' : '_' + varianta.nazev)
    + (L !== 'cz' ? '_' + L.toUpperCase() : '');
  /* Úvodní fotka stavby (11. 8. 2026): obrázek do tvaru {{UVODNI_FOTO}}
   * a k němu název a popisek jako textové symboly, ať si je jde do šablony
   * dopsat pod obrázek. Do 11. 8. byla fotka jen v online náhledu a titulní
   * strana Wordu vozila fotografii cizí stavby ze šablony. */
  Object.assign(placeholders,
    typeof uvodniFotoSymboly === 'function' ? uvodniFotoSymboly(zak) : {});
  return { placeholders, priplatky: priplatkyList, jazyk: L,
           /* sken podpisu s razítkem (#146) + úvodní fotka stavby */
           obrazky: Object.assign({},
             typeof zpracovatelObrazky === 'function' ? zpracovatelObrazky() : {},
             typeof uvodniFotoObrazky === 'function' ? uvodniFotoObrazky(zak) : {}),
           nazevSouboru: nazevSouboru.replace(/[\\/:*?"<>|]+/g, '-') };
}

/* Struktura náhledu podkladů – stejné sekce jako v technické specifikaci/nabídce.
 * lang = 'cz' | 'en' | 'de' | 'fr' – překládají se NÁZVY SEKCÍ a POPISKY řádků;
 * hodnoty už přeložené přicházejí v ph (nabidkaData). Neznámý výraz zůstává česky. */
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

function nabidkaNahledSekce(ph, lang) {
  const L = lang || 'cz';
  const P = t => (L !== 'cz' && typeof tr === 'function') ? tr(t, L) : t;
  const sekce = [
    { sekce: 'HLAVIČKA NABÍDKY', radky: [
      ['Objednatel', ph.OBJEDNATEL], ['Kontaktní osoba', ph.OBJEDNATEL_KONTAKT], ['Datum', ph.DATUM],
      ['Název akce', ph.NAZEV_AKCE], ['Číslo nabídky', ph.CISLO_NABIDKY], ['Adresa stavby', ph.ADRESA]] },
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
      ['PŮDORYSNÉ ŘEŠENÍ ŠACHTY', ph.TS_PUDORYS], ['USAZENÍ OCK – ČELNÍ STĚNA', ph.TS_USAZENI_CELNI],
      ['USAZENÍ OCK – BOČNÍ STĚNY', ph.TS_USAZENI_BOCNI], ['USAZENÍ OCK – ZADNÍ STĚNA', ph.TS_USAZENI_ZADNI]] },
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
      ...(ph.TS_NENI_LESENI ? [['LEŠENÍ KOLEM OCK PRO PROVEDENÍ OPLÁŠTĚNÍ', ph.TS_NENI_LESENI]] : []),
      ['ODBĚRNÉ MÍSTO EL. ENERGIE PO DOBU REALIZACE', ph.TS_NENI_ODBERNE], ['ÚLOŽNÉ PROSTORY', ph.TS_NENI_ULOZNE],
      ['DOZDĚNÍ KOLEM ŠACHETNÍCH DVEŘÍ', ph.TS_NENI_DOZDENI], ['STAVEBNÍ PŘÍPRAVA', ph.TS_NENI_STAVEBNI],
      ...(ph.TS_NENI_SOKL ? [['OPLECHOVÁNÍ SOKLU PROHLUBNĚ', ph.TS_NENI_SOKL]] : []),
      ['NAPÁJENÍ VÝTAHU VČET. REVIZNÍ ZPRÁVY', ph.TS_NENI_NAPAJENI],
      ['PROHLUBEŇ PRO ZALOŽENÍ OCK VE SPRÁVNÉ POZICI A ROZMĚRU', ph.TS_NENI_PROHLUBEN],
      ['DOSTATEČNÉ PŘÍSTUPOVÉ A MANIPULAČNÍ PROSTORY', ph.TS_NENI_PRISTUP]] },
    { sekce: 'B. OBCHODNÍ ČÁST – CENOVÁ NABÍDKA', radky: [
      ['Výtahová šachta (bez DPH)', ph.CENA_BEZ_DPH],
      /* skládaný popisek (číslo sazby uprostřed) se překládá po částech, proto je
       * označen jako HOTOVÝ – závěrečná mapa ho už nesmí překládat podruhé */
      [{ hotovo: P('DPH') + ' ' + ph.DPH_SAZBA + ' % (' + ph.DPH_NAZEV + ' ' + P('sazba') + ')' }, ph.DPH_KC],
      ['CELKEM za nabídku (včetně DPH)', ph.CENA_S_DPH]] },
  ];

  /* ---------- KAPITOLY III.–VI. (#282, nálezy N15 a N16) ----------
   *
   * Do 21. 9. 2026 nabídka končila cenou. Wordová šablona přitom měla ještě
   * čtyři kapitoly a dvě doložky — dokument z aplikace se tedy s dokumentem,
   * který zákazník dostal, neshodoval. D. Sikora: „nám tam schází úplně".
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

  const platebni = [
    ['1. dílčí faktura', ph.PODM_ZALOHA1], ['2. dílčí faktura', ph.PODM_FAKTURA2],
    ['Konečná faktura', ph.PODM_FAKTURA_KONC],
    ['Splatnost faktur (dní)', ph.PODM_SPLATNOST_DNI],
    ['Platnost nabídky', ph.PODM_PLATNOST_NABIDKY],
    ['Způsob fakturace', ph.PODM_ZPUSOB_FAKTURACE],
  ].filter(r => String(r[1] == null ? '' : r[1]).trim() !== '');
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
    if (sym === 'FIRMA_NAB_TERMINY' && termin) radky = [['Termín dodání', termin]].concat(radky);
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
  return sekce.map(s => ({ sekce: P(s.sekce), radky: s.radky.map(r => [popisek(r[0]), r[1]]) }));
}

/* registrace do jednotného registru dokumentů (dokumenty.js) */
if (typeof dokumentRegistruj === 'function')
  dokumentRegistruj('nabidka', {
    nazev: 'Cenová nabídka (CN)', sablona: 'Sablona_NABIDKA_CN.docx',
    builder: (zak, varianta, jekly, lang) => nabidkaData(zak, varianta, jekly, lang),
  });

if (typeof module !== 'undefined') module.exports = { nabidkaData, nabidkaNahledSekce, nabidkaPopisZameru };
