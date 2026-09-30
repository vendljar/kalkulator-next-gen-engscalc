/* ============================================================
 * KRYCÍ LIST ZAKÁZKY – datový model (jeden zdroj pravdy)
 * Používá jej záložka Krycí list (kryci_ui.js) i generování do Wordu.
 * Každé pole má příslušnost k verzi: 'bo' (Backoffice) a/nebo 'techdata'
 * (Technické oddělení) – dle vzoru „..._BOvsTECH.xlsx". Word se generuje
 * VŽDY v obou verzích. Hodnota pole: ruční přepis > prefill > výchozí.
 * ============================================================ */

/* ---------- kdo nabídku vypracoval (#146) ----------
 * Přihlášený obchodní technik má přednost před firemními údaji; jeho profil
 * (titul, jméno, telefon) žije v modulu zpracovatel.js. Guard `typeof` je tu
 * kvůli Node testům a starším sestavením, kde modul nemusí být načtený –
 * tam se chová všechno jako dřív, tedy podle Nastavení → Firma. */
function kryciObchodnikJmeno(f) {
  return typeof zpracovatelJmenoProKryci === 'function'
    ? zpracovatelJmenoProKryci(f) : firmaHodnota(f, 'zpracoval');
}
function kryciObchodnikKontakt(f) {
  return typeof zpracovatelKontaktProKryci === 'function'
    ? zpracovatelKontaktProKryci(f)
    : [firmaHodnota(f, 'zpracoval'), firmaHodnota(f, 'zpracovalTelefon'),
       firmaHodnota(f, 'zpracovalEmail')].filter(Boolean).join(', ');
}

/* Nabídka sazeb smluvní pokuty (10. 8. 2026). První hodnota je předvyplněná.
 * Sdílí ji krycí list OCK i PROJ, aby se sazby nerozešly mezi dvěma seznamy. */
const KRYCI_POKUTY = ['0', '0,05 % / den', '0,1 % / den'];

/* Nabídka záloh (12. 8. 2026, rozhodnutí J. V.: „vybírání zálohy by mělo
 * fungovat z rolovacího seznamu"). U výtahové šachty nese každá volba i
 * milník, ke kterému se záloha váže — v podmínkách nestačí procento, musí
 * být jasné, kdy se fakturuje. Poslední volbu („jiné znění…") přidává
 * rozbalovátko samo, takže vlastní dohoda jde zapsat vždycky. */
const KRYCI_ZALOHY = ['Bez zálohy', '30 % – po podpisu smlouvy',
                      '50 % – po podpisu smlouvy', '70 % – po podpisu smlouvy'];

/* Způsob fakturace OCK (P10.5, 29. 9. 2026). */
const KRYCI_FAKTURACE = ['Po milnících', 'Měsíční'];
const KRYCI_FAKTURACE_STARY_VYCHOZI = 'Náš standard / měsíční';

/* Limit smluvních pokut (12. 8. 2026). Do té doby volné pole s jediným
 * předvyplněným zněním. Obě varianty se v praxi používají a pletly se —
 * rozdíl mezi „UPLATNĚN" a „NEUPLATNĚN" je jedno slovo a znamená opak.
 * Výchozí je uplatněný limit: strop odpovědnosti chrání nás, ne zákazníka,
 * a vypustit ho má být vědomé rozhodnutí. */
const KRYCI_LIMIT_POKUT = ['Uplatněn limit 10 %', 'NEUPLATNĚN limit 10 %'];

/* Datum tisku pro předvyplnění pole „Dne" (20. 8. 2026). Formát YYYY-MM-DD,
 * protože pole je typu date; ruční přepis má přednost jako u všech prefillů. */
function kryciDnesIso() {
  const d = new Date();
  const dva = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + dva(d.getMonth() + 1) + '-' + dva(d.getDate());
}

const KRYCI_SEKCE = [
  { sekce: 'Základní údaje', pole: [
    /* KL-4: obchodníka aplikace zná – od 5. 8. 2026 je to přihlášený uživatel
     * (#146), takže krycí list ukazuje téhož člověka jako cenová nabídka.
     * Bez přihlášení (offline) platí dál Nastavení → Firma. Ruční přepis
     * zůstává (↺ vrátí automatiku). */
    { id: 'obchodnik', label: 'Jméno obchodníka', verze: ['bo', 'techdata'], prefill: c => kryciObchodnikJmeno(c.firma), src: 'přihlášený uživatel / Nastavení → Firma' },
    { id: 'nazevAkce', label: 'Název akce', verze: ['bo', 'techdata'], bind: 'ZAK.nazevAkce', prefill: c => c.zak.nazevAkce, src: 'hlavička kalkulace' },
    { id: 'cisloCN', label: 'Číslo nabídky (CN)', verze: ['bo', 'techdata'], bind: 'ZAK.cislo',
      /* varianta ≥ 2 nese příponu .N (19. 8. 2026) */
      prefill: c => (typeof cisloSVariantou === 'function' ? cisloSVariantou(c.zak, c.varianta) : c.zak.cislo),
      src: 'hlavička kalkulace' },
    { id: 'adresaStavby', label: 'Adresa stavby', verze: ['bo', 'techdata'], bind: 'ZAK.adresa', prefill: c => c.zak.adresa, src: 'hlavička kalkulace' },
    /* KL-2: jen část OCK po slevě. Projekce má vlastní krycí list PROJ. */
    { id: 'hodnotaBezDph', label: 'Hodnota zakázky bez DPH', verze: ['bo', 'techdata'], prefill: c => c.hodnota, src: 'z nabídky OCK (po slevě)' },
    { id: 'priplatkyNabidka', label: 'Příplatky v nabídce', verze: ['bo', 'techdata'], prefill: c => c.priplatky, src: 'z nabídky' },
  ] },
  /* SET-3 – firemní údaje se doplní automaticky z Nastavení → Firma;
   * ruční přepis v krycím listu je možný (např. jiná fakturační adresa). */
  { sekce: 'Dodavatel (naše firma)', pole: [
    { id: 'dodNazev', label: 'Zhotovitel', verze: ['bo', 'techdata'], prefill: c => firmaHodnota(c.firma, 'nazev'), src: 'Nastavení → Firma' },
    { id: 'dodIcoDic', label: 'IČO / DIČ zhotovitele', verze: ['bo'], prefill: c => firmaIcoDic(c.firma), src: 'Nastavení → Firma' },
    { id: 'dodSidlo', label: 'Sídlo zhotovitele', verze: ['bo'], prefill: c => firmaSidlo(c.firma), src: 'Nastavení → Firma' },
    { id: 'dodBanka', label: 'Bankovní spojení zhotovitele', verze: ['bo'], prefill: c => firmaBankaRadek(c.firma), src: 'Nastavení → Firma' },
    { id: 'dodKontakt', label: 'Kontakt na zhotovitele (telefon, e-mail)', verze: ['bo', 'techdata'], prefill: c => [firmaHodnota(c.firma, 'telefon'), firmaHodnota(c.firma, 'email')].filter(Boolean).join(', '), src: 'Nastavení → Firma' },
    { id: 'dodZpracoval', label: 'Nabídku vypracoval', verze: ['bo', 'techdata'], prefill: c => kryciObchodnikKontakt(c.firma), src: 'přihlášený uživatel / Nastavení → Firma' },
  ] },
  /* Terminologie (20. 8. 2026, zadání J. V.): v APLIKACI se všude říká
   * ZÁKAZNÍK. „Objednatel" je pojem smluvní a zůstává jen v dokumentech
   * a v symbolech šablon ({{OBJEDNATEL_…}}), kde ho vyžaduje právní text.
   *
   * Bankovní a rejstříkové údaje jsou od 20. 8. součástí TÉTO sekce, ne
   * vlastního předělu — patří k identifikaci zákazníka a samostatný nadpis
   * jen roztrhal jednu myšlenku na dvě obrazovky. */
  { sekce: 'Zákazník (smluvní partner)', pole: [
    { id: 'jmenoPrijmeni', label: 'Jméno a příjmení kontaktu', verze: ['bo'], prefill: c => c.zak.kontakt, src: 'z hlavičky zakázky' },
    { id: 'zakaznik', label: 'Zákazník (smluvní partner)', verze: ['bo', 'techdata'], prefill: c => c.zak.objednatel, src: 'z hlavičky zakázky' },
    { id: 'kontaktZakaznikTel', label: 'Telefon na zákazníka', verze: ['bo'] },
    { id: 'kontaktZakaznikEmail', label: 'E-mail na zákazníka', verze: ['bo'] },
    { id: 'ico', label: 'IČO', verze: ['bo'], prefill: c => c.zak.ico, src: 'z hlavičky zakázky' },
    { id: 'dic', label: 'DIČ', verze: ['bo'], bind: 'ZAK.dic', prefill: c => c.zak.dic, src: 'hlavička zakázky' },
    /* KL-1: sídlo zákazníka, NE adresa stavby. Developer sídlí jinde, než
     * staví; do smlouvy a na fakturu patří sídlo. Dokud není v hlavičce
     * vyplněné, zůstane pole prázdné – raději prázdné než špatné. */
    { id: 'adresaZakaznik', label: 'Adresa (sídlo) zákazníka', verze: ['bo'], prefill: c => c.zak.adresaObjednatele, src: 'z hlavičky zakázky (sídlo)' },
    { id: 'zastBanka', label: 'Bankovní spojení zákazníka', verze: ['bo'], bind: 'ZAK.zastupci.banka', src: 'hlavička zakázky' },
    { id: 'zastUcet', label: 'Číslo účtu / směrový kód', verze: ['bo'], bind: 'ZAK.zastupci.ucet', src: 'hlavička zakázky' },
    { id: 'zastZapis', label: 'Zápis v rejstříku (zákazník)', verze: ['bo'], bind: 'ZAK.zastupci.zapis', src: 'hlavička zakázky' },
    /* „Kontakt stavba (tel / email)" odstraněn 20. 8. 2026 (zadání J. V.):
     * je to týž člověk jako zástupce zákazníka ve věcech technických, který
     * má o sekci níž vlastní jméno, telefon i e-mail. Dvě místa pro totéž
     * znamenala dvě různé hodnoty. */
    /* KL-6: ve formuláři je odkaz, ne popis – proto typ 'link' (otevře se ↗) */
    { id: 'scoring', label: 'Scoring Cribis / Pipedrive', verze: ['bo'], typ: 'link', ph: 'https://…' },
  ] },
  /* Zástupci a kontakty ZÁKAZNÍKA (20. 8. 2026, zadání J. V.).
   *
   * Vstupy do smlouvy o dílo, které aplikace dosud neznala a dopisovaly se
   * ve Wordu. Všechna pole mají `bind` na hlavičku zakázky (`ZAK.zastupci.*`),
   * takže krycí list OCK a PROJ ukazují a zapisují TÁŽ data — provázání
   * vzniká samo, nic se nesynchronizuje.
   *
   * Telefon a e-mail jsou VŽDY dvě samostatná pole. Slepenec „tel / mail"
   * se nedá proklikat, vytřídit ani zkontrolovat.
   *
   * Osoba ve věcech smluvních je zároveň ta, která smlouvu PODEPISUJE —
   * proto má pozici a žádná zvláštní podpisová pole tu nejsou. */
  { sekce: 'Zástupci a kontakty zákazníka', pole: [
    { id: 'zastSmluvniJmeno', label: 'Ve věcech smluvních — jméno', verze: ['bo'], bind: 'ZAK.zastupci.smluvniJmeno', src: 'hlavička zakázky' },
    { id: 'zastSmluvniPozice', label: '— pozice (podepisuje smlouvu)', verze: ['bo'], bind: 'ZAK.zastupci.smluvniPozice', src: 'hlavička zakázky' },
    { id: 'zastSmluvniTel', label: '— telefon', verze: ['bo'], bind: 'ZAK.zastupci.smluvniTel', src: 'hlavička zakázky' },
    { id: 'zastSmluvniEmail', label: '— e-mail', verze: ['bo'], bind: 'ZAK.zastupci.smluvniEmail', src: 'hlavička zakázky' },
    { id: 'zastObchodniJmeno', label: 'Ve věcech obchodních — jméno', verze: ['bo'], bind: 'ZAK.zastupci.obchodniJmeno', src: 'hlavička zakázky' },
    { id: 'zastObchodniTel', label: '— telefon', verze: ['bo'], bind: 'ZAK.zastupci.obchodniTel', src: 'hlavička zakázky' },
    { id: 'zastObchodniEmail', label: '— e-mail', verze: ['bo'], bind: 'ZAK.zastupci.obchodniEmail', src: 'hlavička zakázky' },
    /* U technického zástupce chceme VŽDY aspoň jeden kontakt (zadání J. V.):
     * bez telefonu i e-mailu se na stavbě nemá kdo ozvat. Hlídá kontroly.js. */
    { id: 'zastTechnickyJmeno', label: 'Ve věcech technických — jméno', verze: ['bo', 'techdata'], bind: 'ZAK.zastupci.technickyJmeno', src: 'hlavička zakázky' },
    { id: 'zastTechnickyTel', label: '— telefon (nutný telefon NEBO e-mail)', verze: ['bo', 'techdata'], bind: 'ZAK.zastupci.technickyTel', src: 'hlavička zakázky' },
    { id: 'zastTechnickyEmail', label: '— e-mail (nutný telefon NEBO e-mail)', verze: ['bo', 'techdata'], bind: 'ZAK.zastupci.technickyEmail', src: 'hlavička zakázky' },
    { id: 'zastFakturyEmail', label: 'Fakturace — e-mail', verze: ['bo'], bind: 'ZAK.zastupci.fakturyEmail', src: 'hlavička zakázky' },
    { id: 'zastFakturyTel', label: 'Fakturace — telefon', verze: ['bo'], bind: 'ZAK.zastupci.fakturyTel', src: 'hlavička zakázky' },
  ] },

  { sekce: 'Typ smlouvy a produktu', pole: [
    { id: 'typSmlouvy', label: 'Typ smlouvy', verze: ['bo'], typ: 'radio', o: ['Naše bez úprav', 'Naše s úpravami', 'Cizí'], prefill: () => 'Naše bez úprav', src: 'výchozí' },
    /* KL-3: formulář zná i třetí možnost „Projekce". Čistě projekční zakázka
     * (OCK nula, PROJ oceněné) se nesmí označit jako šachta. Zůstává textové
     * pole, ne přepínač – kombinovaná zakázka se do tří škatulek nevejde. */
    { id: 'typProduktu', label: 'Typ produktu / služby', verze: ['bo', 'techdata'], prefill: c => c.typProduktu, src: 'z kalkulace (OCK + PROJ)' },
  ] },
  { sekce: 'Platební podmínky', pole: [
    { id: 'splatnostDni', label: 'Splatnost faktur (dní)', verze: ['bo'], prefill: () => '14', src: 'výchozí' },
    /* #147: šablona nabídky měla platnost („2 měsíce") napsanou natvrdo, takže
     * ji nešlo u konkrétní zakázky změnit jinak než ručně ve Wordu. Pole nese
     * celé sousloví včetně jednotky, ne jen číslo — čeština skloňuje
     * („1 měsíc / 2 měsíce / 5 měsíců") a dopočítávat tvar by znamenalo hádat.
     * Krycí list PROJ má totéž pole už od začátku. */
    /* Firemní standardy (10. 8. 2026). Do té doby tu stála věta natvrdo v kódu
     * a obchodník ji v každé zakázce viděl jako pole k přepsání. Mění se ale
     * jednou za rok a pro celou firmu — proto se berou z Nastavení → Firma.
     * Náhradní hodnota zůstává pro starší konfigurace, kde to pole ještě není. */
    { id: 'platnostNabidky', label: 'Platnost nabídky', verze: ['bo'],
      prefill: c => firmaHodnota(c.firma, 'platnostNabidky') || '2 měsíce',
      src: 'Nastavení → Firma' },
    /* Způsob fakturace výběrem (P10.5, rozhodnutí J. V. 29. 9. 2026: „náš
     * standard je 50, 40, 10"; „většinou po milnících, ale může být
     * i měsíční"). Milníky a procenta nesou pole záloha / dílčí / konečná
     * faktura níž. Dosavadní výchozí „Náš standard / měsíční" z Nastavení si
     * s milníky odporovalo — čte se jako „Po milnících". */
    { id: 'zpusobFakturace', label: 'Způsob fakturace', verze: ['bo'], typ: 'vyber', o: KRYCI_FAKTURACE,
      prefill: c => {
        const f = firmaHodnota(c.firma, 'zpusobFakturaceOck');
        return (!f || f === KRYCI_FAKTURACE_STARY_VYCHOZI) ? KRYCI_FAKTURACE[0] : f;
      },
      src: 'Nastavení → Firma' },
    { id: 'zaloha1', label: 'Záloha / dílčí faktura č. 1', verze: ['bo'],
      typ: 'vyber', o: KRYCI_ZALOHY, prefill: () => KRYCI_ZALOHY[2], src: 'výchozí' },
    { id: 'faktura2', label: 'Dílčí faktura č. 2', verze: ['bo'], prefill: () => '40 % – po zahájení montáže', src: 'výchozí' },
    { id: 'fakturaKonc', label: 'Konečná faktura', verze: ['bo'], prefill: () => '10 % – po předání', src: 'výchozí' },
    /* KL-5: ve formuláři jsou dva samostatné řádky, každý s vlastním procentem
     * („ANO do odstranění VaN | %" a „ANO po dobu záruky | %"). Původní id
     * `zadrzne` zůstává (nic se neodstraňuje), jen se zúžilo na první řádek;
     * starý volný text převede kryciMigraceZadrzne() níže. */
    { id: 'zadrzne', label: 'Zádržné – do odstranění vad a nedodělků', verze: ['bo'], typ: 'radio', o: ['Ano', 'Ne'], prefill: () => 'Ano', src: 'výchozí' },
    { id: 'zadrzneProc', label: 'Zádržné do odstranění VaN – %', verze: ['bo'], ph: 'např. 10' },
    { id: 'zadrzneZaruka', label: 'Zádržné – po dobu záruky', verze: ['bo'], typ: 'radio', o: ['Ano', 'Ne'], prefill: () => 'Ne', src: 'výchozí' },
    { id: 'zadrzneZarukaProc', label: 'Zádržné po dobu záruky – %', verze: ['bo'], ph: 'např. 5' },
    /* Smluvní pokuty: od 10. 8. 2026 výběr, ne volné pole (rozhodnutí J. V.).
     * Volné pole svádělo k překlepu, který se propsal do nabídky i do krycího
     * listu — a pokuta je jediný údaj v podmínkách, který se v případě sporu
     * čte doslova. Předvyplněná je nula, tedy BEZ pokuty: dřív tu stálo
     * 0,05 % / den a sjednávalo se to i tam, kde to nikdo nechtěl.
     * Poslední volba nechá zapsat vlastní znění, ať jde vyhovět zákazníkovi,
     * který si prosadí jinou sazbu. */
    { id: 'pokutaDodavka', label: 'Smluvní pokuta – prodlení dodávky', verze: ['bo', 'techdata'],
      typ: 'vyber', o: KRYCI_POKUTY, prefill: () => KRYCI_POKUTY[0], src: 'výchozí' },
    { id: 'pokutaSplatnost', label: 'Smluvní pokuta – prodlení splatnosti', verze: ['bo', 'techdata'],
      /* Předvyplněných 0,05 % / den od 12. 8. 2026 (rozhodnutí J. V.). Do té
       * doby nula, tedy bez pokuty — jenže prodlení se splatností je jediné
       * prodlení, které nezpůsobíme my, a nechávat ho bez sankce znamenalo
       * odesílat nabídky, kde na pozdní platbu není žádná páka. */
      typ: 'vyber', o: KRYCI_POKUTY, prefill: () => KRYCI_POKUTY[1], src: 'výchozí' },
    { id: 'pokutaLimit', label: 'Limit smluvních pokut', verze: ['bo', 'techdata'],
      typ: 'vyber', o: KRYCI_LIMIT_POKUT, prefill: () => KRYCI_LIMIT_POKUT[0], src: 'výchozí' },
    { id: 'pokutyJine', label: 'Jiné', verze: ['bo'], typ: 'textarea' },
    { id: 'platceDph', label: 'Plátce DPH', verze: ['bo'], typ: 'radio', o: ['Ano', 'Ne'], prefill: () => 'Ano', src: 'výchozí' },
    /* KL-7 (hlášení 5. 8. 2026): „Sazba DPH nemůže být přepisovatelná, ale musí
     * být volitelná 12/21 % a navázaná na hlavičku kalkulace."
     * Do té doby to bylo obyčejné textové pole s předvyplněnou hodnotou —
     * dalo se do něj napsat cokoli a krycí list pak nesl jinou sazbu, než
     * jakou se v hlavičce počítalo „Celkem s DPH". Typ `dph` proto kreslí
     * výběr 12/21 % a `dphBind` říká, do které sazby v hlavičce zapisuje;
     * ruční přepis se u takového pole vůbec nečte (viz kryciHodnota). */
    { id: 'sazbaDph', label: 'Sazba DPH', verze: ['bo'], typ: 'dph', dphBind: 'C.dph',
      prefill: c => c.dph + ' %', src: 'z hlavičky kalkulace OCK' },
    { id: 'zarukaMesicu', label: 'Doba trvání záruky (měsíců)', verze: ['bo'], prefill: () => '60', src: 'výchozí' },
  ] },
  /* TERMÍN DODÁNÍ (21. 8. 2026, zadání J. V.: „atyp = + 4 týdny v CN termín").
   * Vlastní sekce, ne řádek mezi datumovými termíny: jako jediná z termínů
   * patří do cenové nabídky (je v KRYCI_NABIDKA_SEKCE), takže z ní vzniká
   * symbol {{PODM_TERMIN_DODANI}} do šablony. Datumy převzetí a předání
   * se do nabídky nedávají — ty se domlouvají až u smlouvy. */
  { sekce: 'Termín dodání', pole: [
    { id: 'terminDodani', label: 'Termín dodání OCK', verze: ['bo', 'techdata'],
      prefill: c => kryciTerminDodani(c), src: 'Nastavení → Firma (+ ATYP)',
      /* ruční „10" odejde jako „10 týdnů" (P8b) */
      normalizuj: v => kryciTerminSJednotkou(v) },
  ] },
  { sekce: 'Termíny', pole: [
    /* `sod`: termín jde i do smlouvy o dílo (P9.2, rozhodnutí J. V.
     * 29. 9. 2026 „data z krycího listu"). Prázdný zůstane ve Wordu {{…}}. */
    { id: 'terminPrevzeti', label: 'Převzetí staveniště k montáži šachty', verze: ['bo', 'techdata'], typ: 'date',
      sod: 'SOD_TERMIN_MONTAZ_OD' },
    { id: 'terminMontaz', label: 'Ukončení montáže šachty a předání montáži výtahu', verze: ['bo', 'techdata'], typ: 'date' },
    { id: 'terminPredani', label: 'Konečné předání díla', verze: ['bo', 'techdata'], typ: 'date',
      sod: 'SOD_TERMIN_DOKONCENI' },
    { id: 'terminJine', label: 'Jiné termíny', verze: ['bo', 'techdata'], typ: 'textarea' },
  ] },
  { sekce: 'Rozsah a odchylky', pole: [
    { id: 'odchylky', label: 'Jiné odchylky oproti smluvnímu standardu', verze: ['bo'], typ: 'textarea', ph: 'popis odchylek…' },
    /* KL-4: zaměření prostor je položka kalkulace (3D skener v režii OCK,
     * v technické specifikaci pole `sken3d`). Není důvod se na ně ptát znovu. */
    { id: 'zamereniStrojovna', label: 'Zaměření strojovna', verze: ['bo', 'techdata'], typ: 'radio', o: ['Ano', 'Ne'], prefill: c => c.sken3d, src: 'z technické specifikace (3D zaměření)' },
    { id: 'situacniFoto', label: 'Situační fotografie', verze: ['bo', 'techdata'], prefill: () => 'Ve složce', src: 'výchozí' },
    { id: 'cenaNezahrnuje', label: 'Cena nezahrnuje', verze: ['bo'], prefill: () => 'dle CN', src: 'výchozí' },
    { id: 'rozsah', label: 'Rozsah', verze: ['bo'],
      prefill: c => firmaHodnota(c.firma, 'rozsahDefinice') || 'je definován přílohou ke smlouvě (specifikace)',
      src: 'Nastavení → Firma' },
    { id: 'typProjektu', label: 'Typ projektu', verze: ['bo', 'techdata'], typ: 'radio', o: ['Nový projekt (novostavba)', 'Rekonstrukce objektu'], prefill: () => 'Nový projekt (novostavba)', src: 'výchozí' },
    /* KL-4: obojí je oceněná sekce kalkulace PROJ – prováděcí dokumentace je
     * DPS, DSP odpovídá dokumentaci pro povolení záměru (DPZ). Oceněná sekce
     * = ANO, neoceněná = NE. */
    { id: 'provadeciDok', label: 'Prováděcí dokumentace', verze: ['bo', 'techdata'], typ: 'radio', o: ['Ano', 'Ne'], prefill: c => c.projAno('dps'), src: 'z kalkulace PROJ (DPS)' },
    { id: 'dsp', label: 'DSP', verze: ['bo', 'techdata'], typ: 'radio', o: ['Ano', 'Ne'], prefill: c => c.projAno('dpz'), src: 'z kalkulace PROJ (DPZ)' },
  ] },
  { sekce: 'Technická specifika', pole: [
    { id: 'typSachty', label: 'Typ šachty', verze: ['techdata'], prefill: c => c.ext ? 'Exteriérová' : 'Interiérová', src: 'z kalkulace OCK' },
    { id: 'popisProjektu', label: 'Stručný popis projektu', verze: ['techdata'], typ: 'textarea', prefill: () => 'Viz info CN', src: 'výchozí' },
    { id: 'dodavatelStavby', label: 'Dodavatel stavby (kontakt email / telefon)', verze: ['techdata'] },
    { id: 'dodavatelVytahu', label: 'Dodavatel výtahu (kontakt email / telefon)', verze: ['techdata'] },
  ] },
  { sekce: 'Atypy OCK', pole: [
    { id: 'atypMustky', label: 'Můstky (rozměr, napojení stavba ↔ OCK)', verze: ['techdata'], typ: 'textarea' },
    { id: 'atypOplasteni', label: 'Typ a způsob opláštění', verze: ['techdata'], typ: 'textarea' },
    { id: 'atypHlava', label: 'Napojení hlavy OCK', verze: ['techdata'], typ: 'textarea' },
    { id: 'atypStavbaVyska', label: 'Napojení na stavbu po výšce šachty', verze: ['techdata'], typ: 'textarea' },
    { id: 'atypPodchozi', label: 'Podchozí OCK', verze: ['techdata'], typ: 'textarea' },
    { id: 'atypProhluben', label: 'Atyp napojení u prohlubně', verze: ['techdata'], typ: 'textarea' },
    { id: 'atypTvar', label: 'Netradiční tvar OCK (např. 5 stěn)', verze: ['techdata'], typ: 'textarea' },
    { id: 'atypJiny', label: 'Jiný atyp (domluva na schůzce na stavbě)', verze: ['techdata'], typ: 'textarea' },
  ] },
  /* PODPISY A KOPIE DO SMLOUVY REALIZACE (P9.4, rozhodnutí J. V. 29. 9. 2026:
   * „podpisy a kontakty objednatele i do SoD OCK"). Dosud je nesl jen krycí
   * list PROJ, takže SoD realizace nechávala {{OBJEDNATEL_PODPIS2_*}}
   * a kopie faktur vždy prázdné. Co už obchodník vyplnil v krycím listu
   * PROJ, se sem předvyplní — objednatel je u obou smluv týž. */
  { sekce: 'Smlouva o dílo — podpisy a kopie (SoD realizace)', pole: [
    { id: 'objPodpisFirma', label: 'Zákazník — firma v podpisové doložce', verze: ['bo'], sod: 'OBJEDNATEL_PODPIS_FIRMA',
      prefill: c => kryciZKrycihoListuProj(c, 'objPodpisFirma') || (c.zak && c.zak.objednatel) || '',
      src: 'krycí list PROJ / hlavička zakázky' },
    { id: 'objPodpis2Jmeno', label: 'Druhý podepisující za zákazníka — jméno', verze: ['bo'], sod: 'OBJEDNATEL_PODPIS2_JMENO',
      prefill: c => kryciZKrycihoListuProj(c, 'objPodpis2Jmeno'), src: 'u SVJ podepisují zpravidla dva členové výboru' },
    { id: 'objPodpis2Funkce', label: '— funkce druhého podepisujícího', verze: ['bo'], sod: 'OBJEDNATEL_PODPIS2_FUNKCE',
      prefill: c => kryciZKrycihoListuProj(c, 'objPodpis2Funkce'), src: 'krycí list PROJ' },
    { id: 'objKopie1', label: 'Faktury v kopii na (1)', verze: ['bo'], sod: 'OBJEDNATEL_KONTAKT_KOPIE1',
      prefill: c => kryciZKrycihoListuProj(c, 'objKopie1'), src: 'krycí list PROJ' },
    { id: 'objKopie2', label: 'Faktury v kopii na (2)', verze: ['bo'], sod: 'OBJEDNATEL_KONTAKT_KOPIE2',
      prefill: c => kryciZKrycihoListuProj(c, 'objKopie2'), src: 'krycí list PROJ' },
  ] },
  /* KL-7: patička z předlohy. 20. 8. 2026 (zadání J. V.) přejmenovaná na
   * „Ostatní" — nejsou to podpisy, ale doprovodné údaje listu; „Dne" se
   * předvyplňuje DATEM TISKU (ručně přepsatelné jako každé jiné pole)
   * a „Informován" se rozpadl na dvě oddělení, protože se běžně liší. */
  { sekce: 'Ostatní', pole: [
    { id: 'podpisDne', label: 'Dne', verze: ['bo', 'techdata'], typ: 'date',
      prefill: () => kryciDnesIso(), src: 'datum tisku' },
    { id: 'podpisObchodnik', label: 'Obchodník', verze: ['bo', 'techdata'], prefill: c => kryciObchodnikJmeno(c.firma), src: 'přihlášený uživatel / Nastavení → Firma' },
    { id: 'podpisInformovanBo', label: 'Informováno Backoffice', verze: ['bo', 'techdata'], ph: 'kdo z BO byl o zakázce informován…' },
    { id: 'podpisInformovanTech', label: 'Informováno Technické odd.', verze: ['bo', 'techdata'], ph: 'kdo z technického oddělení byl informován…' },
  ] },
];

/* KL-5: převod starého jednořádkového „Zádržné" na nové rozdělené řádky.
 * Volá se při importu zakázky (zakazka.js). Hodnota bývala volný text typu
 * „ANO do odstranění vad a nedodělků"; přepínač zná jen Ano/Ne, takže text,
 * který se nedá bezpečně přeložit, se přesune do procentního pole, aby se
 * ručně zadaný údaj neztratil. */
/* Nabízené sazby DPH na jednom místě — hlavička kalkulace i řádek v podmínkách
 * je berou odsud, aby se při další změně sazeb nerozešly. Kdyby v hlavičce
 * byla uložená jiná sazba (starší zakázka, dřívější právní stav), výběr ji
 * ukáže navíc, aby ji přepnutím tiše nezměnil na jinou. */
const KRYCI_DPH_SAZBY = [12, 21];

/* KL-7: řádek „Sazba DPH" byl do 5. 8. 2026 volný text, takže v zakázkách
 * můžou být uložené ruční hodnoty („21%", „19 %"). Od té doby se nečtou, ale
 * není důvod je vozit zakázkou dál — jen by mátly při pohledu do dat. */
/* ---------- dopočet dílčí faktury č. 2 (19. 8. 2026) ----------
 * Záloha + dílčí č. 2 + konečná = 100 %. Zadání J. V.: prostřední fakturu
 * dopočítávej podle toho, kolik zbývá po volbě zálohy, resp. po změně
 * konečné faktury. Dovětek („– po zahájení montáže") se zachovává; když
 * procenta nejdou přečíst nebo zbytek nedává smysl, vrací se null a nic
 * se nepřepisuje — vymyšlené číslo do platebních podmínek nepatří. */
function kryciFaktura2Dopocet(zaloha1, fakturaKonc, stavajici) {
  const proc = t => {
    const s = String(t == null ? '' : t);
    if (/bez\s+zálohy/i.test(s)) return 0;
    const m = /^\s*(\d+(?:[.,]\d+)?)\s*%/.exec(s);
    return m ? parseFloat(m[1].replace(',', '.')) : null;
  };
  const a = proc(zaloha1), b = proc(fakturaKonc);
  if (a == null || b == null) return null;
  const zbytek = Math.round((100 - a - b) * 100) / 100;
  if (!(zbytek >= 0 && zbytek <= 100)) return null;
  const m = /^\s*\d+(?:[.,]\d+)?\s*%\s*(.*)$/.exec(String(stavajici == null ? '' : stavajici));
  const dovetek = (m && m[1].trim()) ? m[1].trim() : '– po zahájení montáže';
  const cislo = (zbytek % 1) ? String(zbytek).replace('.', ',') : String(zbytek);
  return cislo + ' % ' + dovetek;
}

/* Totéž nad ručními hodnotami krycího listu: kde ruční hodnota není, platí
 * výchozí znění polí (záloha KRYCI_ZALOHY[2], konečná „10 % – po předání"). */
function kryciFaktura2Sync(hodnoty) {
  const h = hodnoty || {};
  const zal = (h.zaloha1 != null && h.zaloha1 !== '') ? h.zaloha1 : KRYCI_ZALOHY[2];
  const kon = (h.fakturaKonc != null && h.fakturaKonc !== '') ? h.fakturaKonc : '10 % – po předání';
  const sta = (h.faktura2 != null && h.faktura2 !== '') ? h.faktura2 : '40 % – po zahájení montáže';
  return kryciFaktura2Dopocet(zal, kon, sta);
}

function kryciMigraceSazbaDph(h) {
  if (h && h.sazbaDph !== undefined) delete h.sazbaDph;
  return h;
}

function kryciMigraceZadrzne(h) {
  if (!h || h.zadrzne == null) return h;
  const p = String(h.zadrzne).trim();
  if (p === 'Ano' || p === 'Ne') return h;        // už převedeno
  if (/^\s*ano\b/i.test(p)) h.zadrzne = 'Ano';
  else if (/^\s*ne\b/i.test(p)) h.zadrzne = 'Ne';
  else if (p === '') { delete h.zadrzne; return h; }
  else { h.zadrzne = 'Ano'; }
  const proc = p.match(/(\d+(?:[.,]\d+)?)\s*%/);  // „ANO 10 %" → procento do vlastního pole
  if (proc && !h.zadrzneProc) h.zadrzneProc = proc[1];
  return h;
}

/* Celé koruny, jen když částka haléře nemá (N55, hloubkový test 24. 9.
 * 2026): při vypnutém obchodním zaokrouhlení nese cena haléře a nabídka je
 * tiskne, kdežto krycí list je zaokrouhlil na celé Kč — dva dokumenty téže
 * zakázky tak uváděly jinou cenu. */
const kryciKc = n => {
  const x = Math.round((+n || 0) * 100) / 100;
  return (Number.isInteger(x) ? x.toLocaleString('cs-CZ')
    : x.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + ' Kč';
};

/* KL-4: „Zaměření strojovna" se v aplikaci už jednou zadává – jako 3D zaměření
 * v technické specifikaci. Čte se přes tsHodnota(), aby platilo stejné pořadí
 * ruční > z kalkulace > výchozí jako v samotné technické specifikaci. */
function kryciSken3d(d, rOck) {
  try {
    if (typeof TECHSPEC_DEF === 'undefined' || typeof tsHodnota !== 'function') return '';
    let pole = null;
    TECHSPEC_DEF.forEach(s => (s.pole || []).forEach(p => { if (p.id === 'sken3d') pole = p; }));
    if (!pole) return '';
    const ts = d.techspec && d.techspec.hodnoty ? d.techspec : { hodnoty: {} };
    const t = String(tsHodnota(pole, ts, rOck, d.ock.zadani, d.cenik).text || '');
    return /^\s*ano/i.test(t) ? 'Ano' : (/^\s*ne/i.test(t) ? 'Ne' : '');
  } catch (e) { return ''; }
}

/* kontext pro prefill: zakázka + odvozené hodnoty z NABÍDKY (KL-1).
 * KL-2: hodnota zakázky = ocelová konstrukce po schválené slevě, tedy JEN
 * část OCK. Tenhle krycí list je podkladem pro objednávku / SoD na dodávku
 * konstrukce; projekční část má vlastní krycí list PROJ s vlastní hodnotou,
 * takže sčítat obě části by znamenalo mít stejné peníze ve dvou smlouvách.
 * Příplatky se do hodnoty nezapočítávají – nabízejí se zvlášť. */
function kryciCtx(zak, varianta, jekly) {
  /* #122: výpočet je schválně obalený v try/catch, aby rozbitá kalkulace
   * neshodila celý krycí list — jenže zadání a ceník se dřív četly MIMO ten
   * blok. Varianta bez ceníku (poškozený import, ručně sestavená zakázka)
   * proto neshodila jeden řádek, ale celou stránku, a obchodník neviděl ani
   * ta pole, která se z kalkulace vůbec neberou.
   *
   * Náhrady jsou prázdné objekty, ne vymyšlená čísla: chybějící ceník znamená
   * „nevíme", a to se v krycím listu projeví pomlčkou u hodnoty, ne nulou. */
  const d = (varianta && varianta.data) || {};
  const Zv = (d.ock && d.ock.zadani) || {};
  const Cv = d.cenik || {};
  let priplatky = '—', ockKc = null, projKc = null, rOck = null;
  const projSekce = {};
  try {
    /* Odeslaná nabídka vydá svůj otisk (A1). */
    rOck = (typeof vypocetZ === 'function') ? vypocetZ(varianta, jekly)
      : vypocet(Zv, Cv, jekly, d.ock.fixes);
    /* Hodnota krycího listu musí být přesně to, co je v nabídce – tedy včetně
     * obchodního zaokrouhlení (#38). Skládá ji zaokrouhleni.js. */
    const cn = (typeof cenaNabidkyOck === 'function') ? cenaNabidkyOck(rOck, d.sleva || {}, d.zaokr) : null;
    const podil = (typeof slevaPodil === 'function') ? slevaPodil(d.sleva || {}) : 0;
    ockKc = cn ? cn.cena : rOck.souhrn.zakladCena * (1 - podil);
    const vynech = Zv.priplatkyVynechat || [];
    const zahrn = (rOck.priplatky || []).filter(pp => !vynech.includes(pp.key));
    priplatky = zahrn.length ? (zahrn.length + ' – ' + zahrn.map(pp => pp.nazev).join(', ')) : 'bez příplatků';
  } catch (e) {}
  try {
    const rp = (typeof vypocetProjZ === 'function' ? vypocetProjZ(varianta) : vypocetProj(d.proj.zadani, d.proj.cenik));
    rp.sekce.forEach(s => { projSekce[s.key] = s.celkem; });
    projKc = rp.souhrn.celkem;
  } catch (e) {}

  const hodnota = (ockKc != null) ? kryciKc(ockKc) : '—';
  // KL-3: čistě projekční zakázka není šachta
  const sachta = (Zv.typSachty === 'exteriérová') ? 'Exteriérová šachta' : 'Interiérová šachta';
  const typProduktu = (ockKc > 0)
    ? (projKc > 0 ? sachta + ' + projekce' : sachta)
    : (projKc > 0 ? 'Projekce' : sachta);

  const firma = (typeof firmaAktualni === 'function') ? firmaAktualni() : {};
  return {
    zak, varianta, ext: Zv.typSachty === 'exteriérová', dph: Math.round((Cv.dph || 0) * 100),
    /* ATYP z otevřené varianty — termín dodání se podle něj prodlužuje. */
    atyp: !!Zv.atyp,
    hodnota, priplatky, firma, typProduktu,
    sken3d: kryciSken3d(d, rOck),
    projAno: key => (projSekce[key] > 0 ? 'Ano' : 'Ne'),
    /* Podmínky zmrazené při odeslání (P9.5) — platí jen, dokud je varianta
     * zamčená; po odemčení nebo v klonu se předvyplňuje zase z Nastavení. */
    zmrazeno: (varianta && varianta.zamek && varianta.zamek.zamceno && d.kryci && d.kryci.zmrazeno) || null,
  };
}
/* ---------- termín dodání a přirážka za ATYP (21. 8. 2026) ----------
 *
 * Zadání J. V.: „atyp = + 4 týdny v CN termín." Standardní lhůta je firemní
 * údaj (Nastavení → Firma), o kolik ji ATYP prodlouží taky — v kódu není ani
 * jedno číslo, aby se to dalo změnit bez nové dávky.
 *
 * Prodlužuje se PRVNÍ ČÍSLO v textu, ne celý text: lhůta se píše jako věta
 * („12 týdnů od podpisu smlouvy") a zbytek věty musí zůstat, jak je.
 * Když v ní žádné číslo není (nebo lhůta není vyplněná vůbec), NIC SE
 * NEVYMÝŠLÍ — vrátí se, co tam je, a k tomu poznámka o atypu; termín pak
 * doplní člověk. Stejné pravidlo jako u cen. */
/* JEDNOTKA U HOLÉHO ČÍSLA (P8b, rozhodnutí J. V. 29. 9. 2026: „číslo
 * doplnit o týdnů"). Termín se v aplikaci počítá v týdnech (ATYP přičítá
 * týdny k prvnímu číslu), holé „12" tedy jsou týdny — jen to v nabídce
 * nestálo („Termín dodání: 12") a termín s ATYP se nedal přeložit. Doplňuje
 * se jen k holému číslu (případně „cca 12"); věta s vlastní jednotkou nebo
 * datem zůstává, jak ji kdo napsal. */
function kryciTydnu(n) {
  const k = Math.abs(parseInt(n, 10) || 0);
  return k === 1 ? 'týden' : (k >= 2 && k <= 4 ? 'týdny' : 'týdnů');
}
function kryciTerminSJednotkou(text) {
  const t = String(text == null ? '' : text).trim();
  const m = t.match(/^(cca\s*)?(\d+)$/i);
  return m ? (m[1] ? 'cca ' : '') + m[2] + ' ' + kryciTydnu(m[2]) : t;
}
function kryciTerminDodaniText(zakladniText, atyp, tydnyNavic) {
  const zaklad = kryciTerminSJednotkou(zakladniText);
  const navic = Math.round(+String(tydnyNavic == null ? '' : tydnyNavic).replace(',', '.')) || 0;
  if (!atyp || navic <= 0) return zaklad;
  const m = zaklad.match(/\d+/);
  if (!m) return zaklad ? (zaklad + ' + ' + navic + ' týdnů (ATYP)') : '';
  const nove = parseInt(m[0], 10) + navic;
  /* „2 týdny" + 4 = „6 týdnů": tvar slova za číslem se srovná s novým číslem. */
  const zbytek = zaklad.slice(m.index + m[0].length)
    .replace(/^(\s+)týd(?:en|ny|nů)(?=$|[\s,.;:)])/, (x, mezera) => mezera + kryciTydnu(nove));
  return zaklad.slice(0, m.index) + nove + zbytek + ' (vč. ' + navic + ' týdnů za ATYP)';
}

function kryciTerminDodani(c) {
  const f = (c && c.firma) || {};
  const zaklad = (typeof firmaHodnota === 'function') ? firmaHodnota(f, 'terminDodaniOck') : (f.terminDodaniOck || '');
  const tydny = (typeof firmaHodnota === 'function') ? firmaHodnota(f, 'terminAtypTydny') : (f.terminAtypTydny || '');
  return kryciTerminDodaniText(zaklad, !!(c && c.atyp), tydny);
}

/* hodnota pole: ruční přepis (data.kryci.hodnoty) > prefill > '' */
function kryciHodnota(pole, kl, c) {
  /* `dphBind` je totéž provázání jako `bind`, jen mířené do sazby DPH
   * v hlavičce kalkulace — ruční přepis se proto nečte ani tady. */
  if (!pole.bind && !pole.dphBind) {   // provázaná pole (bind) čtou přímo ze ZAK, ne z ručních přepisů
    const h = (kl && kl.hodnoty) || {};
    if (h[pole.id] !== undefined && h[pole.id] !== '')
      return typeof pole.normalizuj === 'function' ? pole.normalizuj(h[pole.id]) : h[pole.id];
    /* zamčená varianta: předvyplnění z doby odeslání (P9.5) */
    if (c && c.zmrazeno && c.zmrazeno[pole.id] !== undefined) return c.zmrazeno[pole.id];
  }
  if (pole.prefill) { try { const v = pole.prefill(c); if (v != null && v !== '') return v; } catch (e) {} }
  return '';
}
/* data pro Word danou verzi: {nadpis, sekce:[{sekce,radky:[[label,val]]}], nazevSouboru} */
function kryciData(zak, varianta, jekly, verze) {
  const c = kryciCtx(zak, varianta, jekly);
  const kl = varianta.data.kryci || { hodnoty: {} };
  const sekce = KRYCI_SEKCE.map(s => {
    const radky = s.pole.filter(p => p.verze.includes(verze)).map(p => [p.label, kryciHodnota(p, kl, c)]);
    return radky.length ? { sekce: s.sekce, radky } : null;
  }).filter(Boolean);
  const verzeNazev = verze === 'techdata' ? 'Techdata' : 'Backoffice';
  const cislo = (zak.cislo || 'CN').replace(/\s+/g, '');
  const nazevSouboru = ('KRYCI_LIST_' + verzeNazev + '_' + cislo).replace(/[\\/:*?"<>|]+/g, '-');
  return { nadpis: 'Krycí list objednávky / SoD — ' + verzeNazev, sekce, nazevSouboru, verze, verzeNazev };
}

/* registrace obou verzí do jednotného registru dokumentů (generují se od nuly) */
if (typeof dokumentRegistruj === 'function') {
  [['bo', 'Backoffice'], ['techdata', 'Techdata']].forEach(([verze, label]) => {
    dokumentRegistruj('kryci_' + verze, {
      nazev: 'Krycí list – ' + label,
      generate: (zak, varianta, jekly) => {
        const d = kryciData(zak, varianta, jekly, verze);
        return { blob: docxDokumentBlob(d.nadpis, d.sekce), nazevSouboru: d.nazevSouboru, data: d };
      },
    });
  });
}

/* Které sekce krycího listu se zobrazují i v souhrnu cenové nabídky (pod
 * „Celkem s DPH"). Zadání 5. 8. 2026: obchodník má smluvní a platební podmínky
 * vidět a upravovat rovnou u nabídky, ne až v krycím listu. Není to kopie —
 * souhrn nabídky vykresluje TYTÉŽ řádky odsud a zapisuje do TÉHOŽ úložiště
 * (varianta.data.kryci.hodnoty), takže se změna projeví na obou místech.
 * Názvy musí přesně odpovídat `sekce` v KRYCI_SEKCE výše; test_nabidka_podminky.js
 * to hlídá, aby přejmenování sekce nabídku tiše nevyprázdnilo. */
const KRYCI_NABIDKA_SEKCE = ['Typ smlouvy a produktu', 'Platební podmínky', 'Termín dodání'];

/* ---------- symboly {{PODM_…}} do šablony nabídky (5. 8. 2026, #147) --------
 *
 * Zadání: „Navaž v šabloně % platebních podmínek a splatností na informaci
 * z kalkulace sekce smluvní a platební podmínky."
 *
 * Do teď byla procenta splátek (50 % / 40 % / zbytek) i splatnost (14 dní)
 * natvrdo vepsaná v .docx šabloně. Obchodník je mohl v souhrnu nabídky nebo
 * v krycím listu přepsat, jenže dokument o tom nevěděl — ze stejné zakázky pak
 * odešla nabídka s jinými podmínkami, než jaké nesl krycí list pro backoffice.
 *
 * Symboly se nevypisují ručně, ale odvozují se z KRYCI_NABIDKA_SEKCE, tedy
 * z týchž sekcí, které obchodník vidí pod „Celkem s DPH". Přidané pole tak
 * dostane symbol samo od sebe a nemůže zůstat bez vazby na šablonu.
 *
 * Ke každému poli vznikají tři podoby, protože v šabloně jsou tři různá místa:
 *   {{PODM_ZALOHA1}}        celý text pole tak, jak ho obchodník vidí
 *                           („50 % – po podpisu smlouvy")
 *   {{PODM_ZALOHA1_PROC}}   samotné procento („50 %") do věty, která už slovo
 *                           „ve výši" obsahuje
 *   {{PODM_ZALOHA1_CISLO}}  holé číslo („50") tam, kde za ním v šabloně stojí
 *                           jednotka („… {{PODM_SPLATNOST_DNI_CISLO}} dní …")
 */
const PODM_PREFIX = 'PODM_';

/* `splatnostDni` → `SPLATNOST_DNI`, `fakturaKonc` → `FAKTURA_KONC`.
 * Číslice se od písmen neoddělují, aby `zaloha1` zůstalo `ZALOHA1`. */
function kryciSymbolId(id) {
  return String(id == null ? '' : id).replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
}

/* První číslo v textu. Desetinná čárka zůstává česky — do dokumentu jde tak,
 * jak ji obchodník napsal, nic se nepřevádí na tečku. */
function kryciCisloZTextu(t) {
  const m = String(t == null ? '' : t).match(/-?\d+(?:[.,]\d+)?/);
  return m ? m[0] : '';
}

/* Procento se pozná POUZE podle znaku %. „14" ve splatnosti jsou dny; kdyby
 * z toho tahle funkce udělala „14 %", odešla by nabídka s platební podmínkou,
 * kterou nikdo nezadal. Totéž pravidlo jako u cen: co v datech není, se
 * nedopočítává — symbol zůstane prázdný a člověk to ve Wordu doplní. */
function kryciProcentoZTextu(t) {
  const m = String(t == null ? '' : t).match(/(-?\d+(?:[.,]\d+)?)\s*%/);
  return m ? m[1] + ' %' : '';
}

/* Společný stavitel symbolů pro OCK i PROJ. `hodnota(pole)` si každá strana
 * dodá vlastní (kryciHodnota / kryciProjHodnota nad svým úložištěm), aby se
 * podmínky obou částí zakázky nikde nepotkaly. */
function kryciSymbolyZeSekci(sekce, nazvy, hodnota, P) {
  const prelozit = (typeof P === 'function') ? P : (x => x);
  const pole = (sekce || [])
    .filter(s => (nazvy || []).indexOf(s.sekce) >= 0)
    .reduce((a, s) => a.concat(s.pole), []);
  const texty = pole.map(p => {
    let h = '';
    try { h = hodnota(p); } catch (e) { h = ''; }
    return String(h == null ? '' : h);
  });
  const out = {};
  /* Napřed skutečná pole. Teprve pak odvozené tvary, a jen pokud si tím
   * nepřepíšou pole se stejným jménem: krycí list má vedle přepínače
   * „Zádržné po dobu záruky" ještě samostatné pole `zadrzneZarukaProc`,
   * jehož symbol se jmenuje stejně jako odvozený _PROC symbol přepínače.
   * Vyhrát musí zadané číslo, ne prázdno odvozené ze slova „Ano". */
  pole.forEach((p, i) => { out[PODM_PREFIX + kryciSymbolId(p.id)] = prelozit(texty[i]); });
  pole.forEach((p, i) => {
    const zaklad = PODM_PREFIX + kryciSymbolId(p.id);
    if (!((zaklad + '_CISLO') in out)) out[zaklad + '_CISLO'] = kryciCisloZTextu(texty[i]);
    if (!((zaklad + '_PROC') in out)) out[zaklad + '_PROC'] = kryciProcentoZTextu(texty[i]);
  });
  return out;
}

/* Ruční hodnota z krycího listu PROJ téže varianty (P9.4 — podpisy a kopie
 * se do krycího listu OCK předvyplní, ať se nepíšou dvakrát). */
function kryciZKrycihoListuProj(c, id) {
  const d = (c && c.varianta && c.varianta.data) || {};
  const h = (d.kryciProj && d.kryciProj.hodnoty) || {};
  return String(h[id] == null ? '' : h[id]).trim();
}
function kryciDatumCz(iso) {
  const m = String(iso == null ? '' : iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? m[3] + '.' + m[2] + '.' + m[1] : String(iso == null ? '' : iso);
}

/* Symboly smlouvy o dílo realizace z krycího listu OCK (P9.2, P9.4): pole
 * s klíčem `sod`. Plní se jen neprázdné — co chybí, zůstane ve Wordu {{…}}
 * k doplnění (prázdné plnění by symbol beze stopy smazalo). Datum ve tvaru
 * jako v nabídce (DD.MM.RRRR). */
function kryciSodSymboly(zak, varianta, jekly, placeholders) {
  const P = placeholders || {};
  const c = kryciCtx(zak, varianta, jekly);
  const kl = (varianta && varianta.data && varianta.data.kryci) || { hodnoty: {} };
  KRYCI_SEKCE.forEach(s => s.pole.forEach(p => {
    if (!p.sod) return;
    let v = String(kryciHodnota(p, kl, c) || '').trim();
    if (v && p.typ === 'date') v = kryciDatumCz(v);
    if (v) P[p.sod] = v;
  }));
  return P;
}

/* ZÁMEK DRŽÍ I PŘEDVYPLNĚNÉ PODMÍNKY (P9.5, rozhodnutí J. V. 29. 9. 2026).
 * Po odeslání zamrzly jen ruční přepisy krycího listu (jsou v datech
 * varianty); co bylo předvyplněné z Nastavení (platnost, fakturace, termín,
 * obchodník, datum), se počítalo znovu — smlouva vystavená po změně
 * Nastavení tak mohla nést jiné podmínky, než jaké odešly v nabídce.
 * Při prvním zamčení se proto předvyplněné hodnoty opíšou do
 * data.kryci.zmrazeno; data zamčené varianty hlídá server, takže je nikdo
 * nepřepíše. Pole provázaná se zakázkou (bind) se nezmrazují — mají vlastní
 * zdroj. Vrací počet zmrazených polí. */
function kryciZmrazPodminky(zak, varianta, jekly) {
  if (!varianta || !varianta.data) return 0;
  const d = varianta.data;
  if (!d.kryci || typeof d.kryci !== 'object') d.kryci = { hodnoty: {} };
  const h = d.kryci.hodnoty || {};
  const c = kryciCtx(zak, varianta, jekly);
  c.zmrazeno = null;                         // čerstvě z Nastavení, ne ze staršího zmrazení
  const out = {};
  KRYCI_SEKCE.forEach(s => s.pole.forEach(p => {
    if (p.bind || p.dphBind || typeof p.prefill !== 'function') return;
    if (h[p.id] !== undefined && h[p.id] !== '') return;      // ruční přepis už je v datech
    let v = '';
    try { v = p.prefill(c); } catch (e) { v = ''; }
    if (v != null && v !== '') out[p.id] = String(v);
  }));
  d.kryci.zmrazeno = out;
  /* Značka pravidel platebních podmínek, pod kterými nabídka odešla (D1/D2,
   * 30. 9. 2026) — zamčená varianta bez ní odešla dřív a tiskne se jako
   * dřív (kryciPlatbyStary). */
  d.kryci.pravidlaPlateb = KRYCI_PRAVIDLA_PLATEB;
  return Object.keys(out).length;
}

/* ---------- PLATEBNÍ PODMÍNKY NABÍDKY OCK (etapa A, část 1 — 30. 9. 2026) ----------
 *
 * D1 (nález K18-N94): volba „Bez zálohy" dala ve Wordu větu „1. dílčí daňový
 * doklad ve výši  (bez DPH)…" bez procenta. Šablona CN v13 má tři pevné věty
 * a do první dosazuje {{PODM_ZALOHA1_PROC}}, které u „Bez zálohy" nic nenese.
 * Splátka s 0 % se proto vynechá celá a zbylé dílčí doklady se přečíslují
 * podle pořadí (návrh platebních podmínek 29. 9. 2026, oddíl 2: „doklad se
 * pojmenuje sám podle pořadí") — dílčí faktura 2 (100 % − záloha − konečná,
 * kryciFaktura2Dopocet) se pak tiskne jako 1. dílčí daňový doklad.
 *
 * D2 (rozhodnutí J. V. 29. 9. 2026, pokyn 30. 9.: „teď už by to mělo být
 * možné, prověř to a nastav"): měsíční fakturace z krycího listu se do
 * nabídky promítne schválenou větou místo vět o splátkách. Milníky zůstávají
 * tři firemní, věty o podmínce úhrady u 1. a 2. splátky jako dnes.
 *
 * Znění vět je znění šablony CN v13 — slovník (preklad.js) je zná, v cizím
 * jazyce je přeloží vzor s pořadím a procentem. Věty skládá aplikace pro
 * šablonu CN v14 ({{PODM_PLATEBNI_KALENDAR}} — řádek tabulky za větu,
 * {{PODM_FAKTURACE_MESICNE}} — tabulka měsíční fakturace; vyrábí je
 * nastroje/vyrob_sablony.js --cn-v14). Dosavadní symboly {{PODM_ZALOHA1_PROC}}
 * a spol. se plní beze změny, takže šablona v13 tiskne jako dřív; co
 * nevytiskne, hlásí kontrola platbyWordOck.
 *
 * ODESLANÁ NABÍDKA SE NEMĚNÍ (P9.5 / A1): zamčená varianta bez značky
 * `pravidlaPlateb` odešla pod dřívějším pravidlem („měsíční fakturace se do
 * nabídky nepromítne, tiskne se 50/40/10") a tiskne se dál přesně větami v13
 * (i s prázdným procentem, jak odešla). Značku zapíše kryciZmrazPodminky při
 * prvním zamčení. */
const KRYCI_PRAVIDLA_PLATEB = 1;
const KRYCI_FAKTURACE_MESICNE_VETA = 'Fakturace probíhá měsíčně podle skutečně provedených prací.';
const kryciVetaZalohy = (poradi, proc) => poradi + '. dílčí daňový doklad ve výši ' + proc
  + ' (bez DPH) z celkové ceny díla bude vystaven po podpisu SoD. Úhrada tohoto daňového dokladu je podmínkou pro dodržení předem dohodnutých realizačních termínů.';
const kryciVetaFaktury2 = (poradi, proc) => 'Po ukončení výroby, dodání materiálu na stavbu a po zahájení prací bude vystaven '
  + poradi + '. dílčí daňový doklad ve výši ' + proc + ' (bez DPH) z celkové ceny díla. Úhrada tohoto daňového dokladu je podmínkou pro předání díla objednateli.';
const KRYCI_VETA_KONECNA = 'Po ukončení všech výše uvedených prací a po řádném předání a převzetí celého díla předávacím protokolem '
  + 'bude vystaven konečný daňový doklad na zbývající část celkové ceny díla s vyúčtováním DPH v zákonné výši.';
/* Věty šablony CN v13 se symboly — klíče slovníku, ze kterých vznikly EN/DE/FR v13. */
const KRYCI_VETY_V13 = [kryciVetaZalohy(1, '{{PODM_ZALOHA1_PROC}}'), kryciVetaFaktury2(2, '{{PODM_FAKTURA2_PROC}}'), KRYCI_VETA_KONECNA];

/* Procento splátky z textu krycího listu: „Bez zálohy" = 0, jinak první číslo
 * se znakem % (kryciProcentoZTextu); text bez procenta = neznámé (null) —
 * nic se nedopočítává. */
function kryciPlatbaProcento(text) {
  const t = String(text == null ? '' : text);
  if (/bez\s+zálohy/i.test(t)) return { pct: 0, proc: '' };
  const proc = kryciProcentoZTextu(t);
  const pct = proc ? parseFloat(proc.replace(',', '.')) : NaN;
  return isFinite(pct) ? { pct, proc } : { pct: null, proc: '' };
}

/* Zamčená varianta, která odešla před pravidly D1/D2 (bez značky). */
function kryciPlatbyStary(varianta) {
  const d = (varianta && varianta.data) || {};
  return !!(varianta && varianta.zamek && varianta.zamek.zamceno) && !(d.kryci && +d.kryci.pravidlaPlateb >= 1);
}

/* PLATEBNÍ KALENDÁŘ NABÍDKY z krycího listu varianty:
 * { stary, mesicne, splatky: [{ id, text, pct, proc, poradi }], vynechane: [id],
 *   necitelne: [id], hodnoty: { zaloha1, faktura2, fakturaKonc, zpusobFakturace } }.
 * `poradi` = pořadí dílčího dokladu (1, 2), u konečného null. Kontext je
 * lehký: pole platebních podmínek předvyplňuje jen Firma a zmrazení
 * odeslané varianty — výpočet nabídky, který spouští kryciCtx, tu netřeba
 * (test_platby_ock.js hlídá, že hodnoty sedí se symboly {{PODM_…}}). */
function kryciPlatebniKalendar(zak, varianta, jekly) {
  const d = (varianta && varianta.data) || {};
  const kl = d.kryci || { hodnoty: {} };
  const c = { zak, varianta, firma: (typeof firmaAktualni === 'function') ? firmaAktualni() : {},
    zmrazeno: (varianta && varianta.zamek && varianta.zamek.zamceno && d.kryci && d.kryci.zmrazeno) || null };
  const pole = {};
  KRYCI_SEKCE.forEach(s => s.pole.forEach(p => { pole[p.id] = p; }));
  const hodn = id => {
    let v = '';
    try { v = pole[id] ? kryciHodnota(pole[id], kl, c) : ''; } catch (e) { v = ''; }
    return String(v == null ? '' : v);
  };
  const hodnoty = { zaloha1: hodn('zaloha1'), faktura2: hodn('faktura2'), fakturaKonc: hodn('fakturaKonc'),
    zpusobFakturace: hodn('zpusobFakturace') };
  const stary = kryciPlatbyStary(varianta);
  /* Jen volba „Měsíční" z výběru. Vlastní znění (i dřívější „Náš standard
   * / měsíční", P10.5) je dohoda, kterou aplikace nečte. */
  const mesicne = !stary && hodnoty.zpusobFakturace.trim().toLowerCase() === KRYCI_FAKTURACE[1].toLowerCase();
  const splatky = [], vynechane = [], necitelne = [];
  let poradi = 0;
  ['zaloha1', 'faktura2', 'fakturaKonc'].forEach(id => {
    const text = hodnoty[id];
    const konecna = id === 'fakturaKonc';
    const { pct, proc } = kryciPlatbaProcento(text);
    if (pct === 0) { vynechane.push(id); return; }
    if (pct === null && !konecna) {
      necitelne.push(id);
      if (!text.trim()) return;                    // prázdné pole se netiskne (prázdno není nula)
    }
    splatky.push({ id, text, pct, proc, poradi: konecna ? null : ++poradi });
  });
  return { stary, mesicne, splatky, vynechane, necitelne, hodnoty };
}

/* Symboly pro šablonu CN v14 (a online náhled) z kalendáře. P = překlad
 * hodnot do jazyka nabídky (tr), lang jen kvůli francouzské dvojtečce.
 * Konečný doklad nese větu „na zbývající část" — procento nepotřebuje;
 * dílčí doklad bez čitelného procenta dostane řádek „1. dílčí faktura:
 * <text krycího listu>" (vlastní znění zůstane, jak ho obchodník napsal). */
function kryciPlatebniSymboly(kal, P, lang) {
  const tr_ = (typeof P === 'function') ? P : (x => x);
  if (!kal) return {};
  if (kal.stary) {
    const h = kal.hodnoty || {};
    const vety = KRYCI_VETY_V13.map(v => String(tr_(v))
      .replace('{{PODM_ZALOHA1_PROC}}', () => kryciProcentoZTextu(h.zaloha1))
      .replace('{{PODM_FAKTURA2_PROC}}', () => kryciProcentoZTextu(h.faktura2)));
    return { PODM_PLATEBNI_KALENDAR: vety.join('\n'), PODM_FAKTURACE_MESICNE: '' };
  }
  if (kal.mesicne) return { PODM_PLATEBNI_KALENDAR: '', PODM_FAKTURACE_MESICNE: tr_(KRYCI_FAKTURACE_MESICNE_VETA) };
  const dvojtecka = lang === 'fr' ? ' : ' : ': ';
  const vety = (kal.splatky || []).map(s => {
    if (s.id === 'fakturaKonc') return tr_(KRYCI_VETA_KONECNA);
    if (s.pct === null) return tr_(s.poradi + '. dílčí faktura') + dvojtecka + tr_(s.text);
    return tr_(s.id === 'zaloha1' ? kryciVetaZalohy(s.poradi, s.proc) : kryciVetaFaktury2(s.poradi, s.proc));
  });
  return { PODM_PLATEBNI_KALENDAR: vety.join('\n'), PODM_FAKTURACE_MESICNE: '' };
}

function kryciPodminkoveSymboly(zak, varianta, jekly, P) {
  const c = kryciCtx(zak, varianta, jekly);
  const kl = (varianta && varianta.data && varianta.data.kryci) || { hodnoty: {} };
  return kryciSymbolyZeSekci(KRYCI_SEKCE, KRYCI_NABIDKA_SEKCE, p => kryciHodnota(p, kl, c), P);
}

if (typeof module !== 'undefined')
  module.exports = { kryciKc, KRYCI_SEKCE, KRYCI_NABIDKA_SEKCE, KRYCI_DPH_SAZBY, KRYCI_POKUTY, KRYCI_FAKTURACE, kryciCtx, kryciHodnota,
    kryciData, kryciMigraceZadrzne, kryciMigraceSazbaDph,
    PODM_PREFIX, kryciSymbolId, kryciCisloZTextu, kryciProcentoZTextu,
    kryciTerminDodani, kryciTerminDodaniText, kryciTerminSJednotkou, kryciTydnu,
    kryciSymbolyZeSekci, kryciPodminkoveSymboly, kryciSodSymboly, kryciZmrazPodminky, kryciDatumCz,
    kryciZKrycihoListuProj,
    kryciFaktura2Dopocet, kryciFaktura2Sync,
    KRYCI_PRAVIDLA_PLATEB, KRYCI_FAKTURACE_MESICNE_VETA, KRYCI_VETY_V13, kryciPlatbaProcento, kryciPlatbyStary,
    kryciPlatebniKalendar, kryciPlatebniSymboly };
