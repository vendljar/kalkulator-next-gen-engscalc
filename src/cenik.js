/* ============================================================
 * CENÍK – definice položek (jeden zdroj pravdy) + import/export Excel.
 * CENIK_DEF / CENIK_DEF_PROJ: kategorie → [cesta, popis, jednotka, pozn, typ?].
 * cesta je „C.klic" / „C.skupina.klic" (OCK) nebo „PC.…" (PROJ).
 * typ: undefined = číslo, 'text' = řetězec, 'selLak' = výběr (tomas/lakovna),
 *      'pct' = procento (v datech desetinný podíl 0,30 – zadává se 30).
 * Používá záložka Ceník (cenik_ui.js) i Excel import/export.
 * ============================================================ */

/* POLOŽKY, KTERÉ V TUZEMSKÉ ZAKÁZCE NEEXISTUJÍ (9. 9. 2026, hlášeno J. V.:
 * „i když mám zvolenou novou zakázku OCK pro ČR, ve výběru se mi zobrazují
 * překlady; ty by měly být nabízeny pouze pro zahraniční zakázky").
 *
 * Do 9. 9. o tom rozhodovala JEN značka `jenZahr`, kterou administrátor
 * zaškrtává u zahraničního ceníku — takže dokud ji nikdo nezaškrtl (nebo se
 * ztratila při zveřejnění či obnově ze zálohy), překlady se v české nabídce
 * ukázaly, přestože poznámka v ceníku slibovala opak. Dva zdroje pravdy:
 * text v tabulce a data v ceníku.
 *
 * Teď je zdroj jeden. Co je tady, je jen zahraniční VŽDY, bez ohledu na
 * ceník; administrátorova značka může přidat další položku, ale tuhle sadu
 * nemůže omylem zrušit. Cestovní náklady sem schválně NEPATŘÍ — po ČR se
 * jezdí taky a jejich zahraniční odchylka je jen jiná cena, ne jiná položka. */
const CENIK_JEN_ZAHR = ['C.prekladyKc'];

const CENIK_DEF = [
  ['HRUBÁ OCK', [
    ['C.profilasKgKc', 'Profily – hlavní nosné prvky', 'Kč/kg', 'aktualizováno 3.5.2023'],
    ['C.montazniNosnik', 'Montážní nosník', 'Kč/ks', ''],
    ['C.lemovaniKgKc', 'Lemování šachty (ext)', 'Kč/kg', ''],
    ['C.powertechExt', 'Plechy – exteriérová šachta', 'Kč/kg', 'aktualizováno 26.1.2026'],
    ['C.powertechInt', 'Plechy – interiérová šachta', 'Kč/kg', 'aktualizováno 26.1.2026'],
    ['C.oplechPracKc', 'Oplechování – práce', 'Kč/hod', ''],
    ['C.spodniRamKc', 'Zámečník – spodní rám (int)', 'Kč', ''],
    ['C.cilkoKc', 'Zámečník – čílka (int)', 'Kč/ks', ''],
    ['C.nytKc', 'Zámečník – nýtování', 'Kč/nýt', ''],
    ['C.montazHodKc', 'Montáž na stavbě', 'Kč/hod', 'počítá se se 4 osobami'],
    ['C.vetraciMrizkaKc', 'Větrací mřížka (ext)', 'Kč/ks', ''],
    ['C.transportKc', 'Interní transport', 'Kč/cesta', ''],
    ['C.zastreseniM2Kc', 'Zastřešení šachty (ext)', 'Kč/m²', ''],
    ['C.mustekKc', 'Můstek mezi budovou a OCK', 'Kč/ks', 'jeden můstek včetně montáže; počet se zadává v Zadání šachty'],
    ['C.oplechFasadaBmKc', 'Oplechování k fasádě (ext)', 'Kč/bm', ''],
  ]],
  /* ATYP (#7). Skupina se jmenuje stejně jako katalogová sekce `atyp` –
   * záložka Ceník podle názvu skupiny páruje trvalé vlastní položky
   * (viz CENIK_GRP_SEKCE v ui/cenik_ui.js), takže sem půjde přidávat
   * i konkrétní atypické prvky, ne jen tuhle jednu sazbu.
   * Do kalkulace a do nabídky přitom všechno spadá do HRUBÉ OCK –
   * zákazník má vidět jednu ocelovou konstrukci, ne účet za „něco navíc". */
  ['ATYP – PRVKY A PRÁCE NAVÍC', [
    /* Dvě zámečnické položky, dvě různé věci (vysvětleno 1. 9. 2026):
     * tahle je SAZBA ZA KUS a uplatní se jen v modelu 1:1 jako Excel u starších
     * nabídek, které mají uložený počet kusů. V opraveném modelu se nepoužívá
     * vůbec. Dnešní zakázka bere částku z pole v kalkulaci, které předvyplní
     * `C.atypZamecnikKc` o pár řádků níž. */
    ['C.zamecnikAtypKc', 'Zámečník – ostatní práce (atyp) – sazba za kus', 'Kč/j.',
     'jen model 1:1 Excel u starších nabídek s uloženými kusy; dnešní zakázka počítá z částky'],
    /* Co se stane po zaškrtnutí ATYP (zadání J. V. 31. 8. 2026: „do ceníku OCK
     * v sekci atyp přidej ještě možnost editovat atypické položky"). Do teď
     * byla všechna tahle čísla napsaná v kódu (ui/kalk_ock.js, atypPrepni)
     * a firma je nemohla změnit bez nového sestavení. Hodnoty se do zakázky
     * jen PŘEDVYPLNÍ — obchodník je pak v kalkulaci doladí a jeho čísla už
     * nikdo nepřepíše (zadání se přepočtem ceníku nemění nikdy). */
    ['C.atypPrirazka', 'ATYP: přirážka za projekční a koordinační práce', '%',
     'z nákladu celé sekce Režie; sazba jde v zakázce změnit', 'pct'],
    ['C.atypMontazPct', 'ATYP: montáž navíc – podíl z hodin montáže', '%',
     'předvyplní pole „Montáž – atyp navíc" (ze základu + hodin navíc dle konstrukce)', 'pct'],
    ['C.atypProjekcePct', 'ATYP: projekce navíc – podíl z hodin projekce', '%',
     'předvyplní pole „Projekce – atyp navíc"', 'pct'],
    ['C.atypZamecnikKc', 'ATYP: zámečník atyp – předvyplněná částka', 'Kč',
     'prázdné = nepředvyplňovat; v zakázce jde přepsat'],
    ['C.atypRezervaZakladPct', 'ATYP: rezerva základ', '%', 'předvyplní pole „REZERVA základ"', 'pct'],
    ['C.atypRezervaPriplatkyPct', 'ATYP: rezerva příplatky', '%', 'předvyplní pole „REZERVA příplatky"', 'pct'],
  ]],
  ['OPLÁŠTĚNÍ', [
    ['C.skloBokyNazev', 'Sklo boky + zadní stěna – typ', '', '', 'text'],
    ['C.skloBokyKc', 'Sklo boky + zadní stěna', 'Kč/m²', ''],
    ['C.skloCelniNazev', 'Sklo VSG 4.4.1 – typ', '', '', 'text'],
    /* Poznámky u obou VSG sjednoceny 14. 9. 2026 (nález V33/V38): sazbu řídí
     * TYP ŠACHTY (interiér = VSG, exteriér = dvojsklo na bocích), uvnitř
     * interiéru pak způsob zasklení. Dosavadní text „interiérová: vše při
     * zasklení mezi příčníky" popisoval jen půlku pravidla a neodpovídal
     * chování — u zasklení na terče jde celá interiérová šachta z VSG 4.4.2. */
    ['C.skloCelniKc', 'Sklo VSG 4.4.1', 'Kč/m²', 'exteriérová: čelní stěna · interiérová: celá šachta při zasklení mezi příčníky'],
    /* 9. 9. 2026, zadání J. V.: interiérová šachta zasklená na terče. Prázdná
     * položka = počítá se sazbou VSG 4.4.1 (viz skloVolba v engine.js). */
    ['C.skloVsg442Kc', 'Sklo VSG 4.4.2', 'Kč/m²', 'interiérová: celá šachta při zasklení na terče · prázdná sazba = v nabídce nula, nedosazuje se 4.4.1'],
    /* CETRIS (17. 9. 2026, zadání J. V.). Cementotřísková deska — neprůhledné
     * opláštění tam, kde sklo nedává smysl (stěna u zdi budovy, spodní pás).
     * Do výpočtu zatím NEVSTUPUJE: volí se až v připravovaném opláštění po
     * stěnách. Sazba se zadává jako u skel, aby byla v ceníku připravená
     * dřív, než ji začne kdo potřebovat — prázdná znamená „nemáme sazbu",
     * ne nulu (viz cenikVychozi). */
    ['C.cetrisKc', 'Cetris (cementotřísková deska)', 'Kč/m²', 'neprůhledné opláštění stěny · volí se v opláštění po stěnách'],
    ['C.praceOplasteniKc', 'Práce opláštění', 'Kč/m²', ''],
    ['C.plastKotvyKc', 'Plastové kotvy (zasklení na terče)', 'Kč', ''],
    ['C.tmeleniKc', 'Tmelení – materiál + práce (ext)', 'Kč/m²', ''],
    ['C.striskaDvurKc', 'Stříška nad vstupem na dvůr (průchozí ext)', 'Kč', ''],
    ['C.cestovniKc', 'Cestovní náklady', 'Kč', ''],
    ['C.cisteniKc', 'Čištění', 'Kč', ''],
  ]],
  ['VOLITELNÉ POLOŽKY', [
    ['C.prechodoveKgKc', 'Přechodové plechy – nerez', 'Kč/kg', ''],
    ['C.leseniVnitrniKc', 'Lešení vnitřní', 'Kč/m výšky', ''],
    ['C.leseniFix', 'Lešení – fixní část (společná pro všechna lešení)', 'Kč',
     'Jedno číslo pro vnitřní i vnější lešení, stejné ve volitelných položkách i v příplatcích.'],
    ['C.leseniVnejsiKc', 'Lešení vnější', 'Kč/m²', ''],
    ['C.hakyKc', 'Háky na mytí šachty (ext)', 'Kč/ks', ''],
    ['C.zabradliKc', 'Úpravy/napojení zábradlí (int)', 'Kč/nástupiště', ''],
    ['C.soklBmKc', 'Oplechování soklu prohlubně (ext)', 'Kč/bm', ''],
  ]],
  ['REŽIE', [
    ['C.sken3dKc', 'Zaměření 3D skenerem', 'Kč', ''],
    ['C.vystupZamereniKc', 'Výstup ze zaměření pro zákazníka', 'Kč', 'bez výstupu se účtuje 50 %'],
    ['C.engineeringKc', 'Engineering', 'Kč', ''],
    ['C.projekceHodKc', 'Dílenská dokumentace', 'Kč/hod', ''],
    /* 9. 9. 2026, zadání J. V.: sklo do rámečku znamená navrhnout a zakreslit
     * lišty. Hodiny se přičtou k zadání „Projekce – základ", nepřepisují ho. */
    ['C.zaskleniListyProjHod', 'Projekce navíc – zasklení mezi příčníky', 'hod', 'přičte se k projekci, jen u zasklení mezi příčníky (lišty)'],
    ['C.statikaHod', 'Statické posouzení – hodin', 'hod', ''],
    ['C.statikaKc', 'Statické posouzení – sazba', 'Kč/hod', ''],
    ['C.rezieKancelareKc', 'Režie kanceláře', 'Kč', ''],
    ['C.stavbyvedouciHod', 'Stavbyvedoucí – hodin', 'hod', ''],
    ['C.stavbyvedouciKc', 'Stavbyvedoucí – sazba', 'Kč/hod', ''],
    /* Zahraniční zakázky (#181, 31. 8. 2026). V tuzemské kalkulaci se
     * položka nezobrazuje vůbec — nese značku „jen pro zahraničí". */
    ['C.prekladyKc', 'Překlady CZ→DE (smlouvy, zprávy)', 'Kč', 'jen zahraniční zakázky'],
    /* Výchozí hodnoty zadání pro NOVOU zakázku (zadání J. V. 31. 8. 2026).
     * Nejsou to ceny, ale rozsahy práce, se kterými každá nová nabídka
     * začíná — do teď byly napsané v kódu (DEFAULT_ZADANI v engine.js).
     * Rozpracovanou nabídku nemění: zadání je práce obchodníka. */
    ['C.vychMontazZakladHod', 'Výchozí: montáž – základ (1 os.)', 'hod', 's čím začíná nová zakázka'],
    ['C.vychProjekceZakladHod', 'Výchozí: projekce – základ', 'hod', 's čím začíná nová zakázka'],
    ['C.vychOplechOstatniKg', 'Výchozí: oplechování ostatní – materiál', 'kg', 's čím začíná nová zakázka'],
    ['C.vychOplechOstatniHod', 'Výchozí: oplechování ostatní – práce', 'hod', 's čím začíná nová zakázka'],
  ]],
  ['SPOJOVACÍ MATERIÁL', [
    ['C.spojovaci.riplockM10', 'Riplock M10', 'Kč/ks', ''],
    ['C.spojovaci.riplockM8', 'Riplock M8', 'Kč/ks', ''],
    ['C.spojovaci.nordlock', 'NordLock', 'Kč/ks', ''],
    ['C.spojovaci.nytM10', 'Nýtovací matice M10', 'Kč/ks', ''],
    ['C.spojovaci.nytM8', 'Nýtovací matice M8', 'Kč/ks', ''],
    ['C.spojovaci.nytM6', 'Nýtovací matice M6', 'Kč/ks', ''],
    ['C.spojovaci.tSrouby', 'T šrouby', 'Kč/ks', ''],
    ['C.spojovaci.sroubM10', 'Šrouby M10', 'Kč/ks', ''],
    ['C.spojovaci.sroubM8', 'Šrouby M8', 'Kč/ks', ''],
    ['C.spojovaci.sroubM6', 'Šrouby M6', 'Kč/ks', ''],
    ['C.spojovaci.zavitTyc', 'Závitové tyče M12', 'Kč/ks', ''],
    ['C.spojovaci.chemKotva', 'Chemické kotvy', 'Kč/ks', ''],
  ]],
  ['LAKOVÁNÍ', [
    ['C.lak.rezim', 'Počítat dle ceníku', '', 'ceny ověřit u lakovny nebo Tomáše', 'selLak'],
    ['C.lak.lakovnaProfilBm', 'Lakovna – profily', 'Kč/bm', ''],
    ['C.lak.lakovnaListaBm', 'Lakovna – lišty', 'Kč/bm', ''],
    ['C.lak.lakovnaM2', 'Lakovna – plechy/oplechování/terče', 'Kč/m²', ''],
    ['C.lak.tomasProfilM2', 'Tomáš – profily', 'Kč/m²', ''],
    ['C.lak.tomasListaBm', 'Tomáš – lišty', 'Kč/bm', ''],
    ['C.lak.tomasPlechKs', 'Tomáš – konstrukční plechy', 'Kč/ks', ''],
    ['C.lak.tomasOplechM2', 'Tomáš – oplechování', 'Kč/m²', ''],
    ['C.lak.tomasTercKs', 'Tomáš – terče', 'Kč/ks', ''],
  ]],
  ['PŘÍPLATKOVÉ POLOŽKY', [
    ['C.priplatky.vsgFolieM2', 'Sklo VSG s mléčnou fólií (příplatek)', 'Kč/m²', ''],
    ['C.priplatky.sknM2', 'Sklo SKN 176 (Ug=1,1) (EXT)', 'Kč/m²', ''],
    ['C.priplatky.medStrechaM2', 'Střecha venkovní šachty v mědi (příplatek)', 'Kč/m²', ''],
    ['C.priplatky.ventilatorKc', 'Ventilátor (ext)', 'Kč/ks', ''],
    ['C.priplatky.zabranyDvereKc', 'Zábrany do dveřních vstupů', 'Kč/ks', ''],
    ['C.priplatky.madlaBmKc', 'Madla – tvrdé dřevo, čirý lak', 'Kč/bm', ''],
    /* Montáž šachetních dveří se od 2. 9. 2026 do příplatků NEPOČÍTÁ sama
     * (v excelové předloze pod čarou není). Cena tu zůstává jako vodítko
     * pro ruční položku, kterou si obchodník v kalkulaci přidá sám. */
    ['C.priplatky.montazDveriKc', 'Montáž šachetních dveří (ruční položka)', 'Kč/ks',
     'v příplatcích se nepočítá automaticky – obchodník ji přidá tlačítkem „+ přidat položku"'],
    ['C.priplatky.prechMontKc', 'Přechodové plechy – montáž', 'Kč/ks', ''],
    ['C.priplatky.leseniHlavaKc', 'Lešení – dokončení hlavy šachty', 'Kč/m',
     'Nástavba už postaveného lešení – fixní část se u ní neúčtuje.'],
      /* Osm položek z excelové předlohy (rozhodnutí J. V. 1. 9. 2026: „zaveď je
     * všechny, tak jak jsou"). Jsou to nabídkové položky za akci — v kalkulaci
     * mají množství 1 a cenu odsud; obchodník obojí v zakázce přepíše.
     * Cena se nevymýšlí: v repozitáři je nula, ostrá čísla zadá administrátor
     * v ceníku a zveřejní. */
    ['C.priplatky.zabranyPadKc', 'Zábrany proti pádu do šachty', 'Kč', 'za akci'],
    ['C.priplatky.demontazOhrazeniKc', 'Demontáž stávajícího ohrazení', 'Kč', 'za akci'],
    ['C.priplatky.malbaSchodnicKc', 'Malba schodnic', 'Kč', 'za akci'],
    ['C.priplatky.naterOhrazeniKc', 'Nátěr celého ohrazení', 'Kč', 'za akci'],
    ['C.priplatky.naterOkopovychKc', 'Nátěr pouze okopových plechů', 'Kč', 'za akci'],
    ['C.priplatky.prosklenaStenaKc', 'Prosklená stěna vedle šachty', 'Kč', 'za akci'],
    ['C.priplatky.demontazVytahuKc', 'Demontáž stávajícího výtahu', 'Kč', 'za akci'],
    ['C.priplatky.destovySvodKc', 'Dešťový svod', 'Kč', 'za akci'],
]],
  /* Kurz EUR (#155, 19. 8. 2026): jediná položka sekce Cizí měna. Kurz je
   * součást ceníku — verzuje se a zveřejňuje jako každá cena, takže u staré
   * nabídky jde doložit, jakým kurzem odešla. V dokumentu se kurz NIKDE
   * neukazuje (rozhodnutí J. V.), přepočítávají se jím jen částky. */
  /* Sazby DPH (1. 9. 2026, zadání J. V.: „přidej do obou ceníků nad sekci cizí
   * měna ještě sekci DPH … předvolby Standardní 21 %, Snížená 12 %, Bez DPH
   * 0 % a samozřejmě je potřebujeme editovat, kdyby se změnil zákon").
   * Sazba SAMOTNÉ zakázky zůstává zakázkovou hodnotou (`C.dph`, viz #177) —
   * tohle jsou PŘEDVOLBY, ze kterých se v hlavičce vybírá. */
  ['SAZBY DPH', [
    ['C.dphZakladni', 'DPH základní', '%', 'předvolba v hlavičce kalkulace; dnes 21 %', 'pct'],
    ['C.dphSnizena', 'DPH snížená', '%', 'předvolba v hlavičce kalkulace; dnes 12 %', 'pct'],
    ['C.dphNulova', 'DPH nulová (bez DPH)', '%', 'předvolba pro plnění bez daně', 'pct'],
  ]],
  ['CIZÍ MĚNA', [
    ['C.kurzEurKc', 'Kurz EUR', 'Kč/EUR',
     'přepočet cen pro nabídky v jiné než české mutaci; prázdné = cizojazyčný tisk se zastaví'],
  ]],
];

const CENIK_DEF_PROJ = [
  ['HODINOVÉ SAZBY (ZAMĚŘENÍ / STUDIE / DPZ / DPS)', [
    ['PC.sazby.projektant', 'Sazba – projektant', 'Kč/hod', 'dokumentace DOSS/SÚ/DPS, studie, výstup zaměření'],
    ['PC.sazby.statik', 'Sazba – statik', 'Kč/hod', 'statika v DPZ a DPS'],
    ['PC.sazby.zamereni', 'Sazba – zaměření', 'Kč/hod', '3D skener'],
  ]],
  ['PROJEDNÁNÍ STUDIE', [
    ['PC.fixy.pamatkari', 'Památkáři', 'Kč', 'fixní částka'],
    ['PC.fixy.uzemniRozvoj', 'Územní rozvoj', 'Kč', 'fixní částka'],
  ]],
  ['DPZ – DOKUMENTACE PRO POVOLENÍ ZÁMĚRU', [
    ['PC.fixy.pbr', 'PBŘ (požárně bezpečnostní řešení)', 'Kč', 'fixní částka'],
    ['PC.fixy.studieOsvitu', 'Studie osvitu (Praha 4 a 6)', 'Kč', 'fixní částka'],
    ['PC.fixy.elektroDpz', 'Elektro projekt (DPZ)', 'Kč', 'fixní částka'],
  ]],
  ['IČ – INŽENÝRSKÁ ČINNOST', [
    ['PC.fixy.ic', 'Inženýrská činnost', 'Kč', 'fixní částka'],
  ]],
  ['DPS – DOKUMENTACE PRO PROVEDENÍ STAVBY', [
    ['PC.fixy.elektroDps', 'Elektro projekt (DPS)', 'Kč', 'fixní částka'],
  ]],
  ['EZC – EKONOMICKÁ ZADÁVACÍ ČÁST', [
    ['PC.fixy.ezc', 'Ekonomická zadávací část', 'Kč', 'fixní částka za celý projekt'],
  ]],
  ['KOLAUDACE A GEODET', [
    ['PC.fixy.kolaudace', 'Kolaudace', 'Kč', 'pro 1 ks výtahu'],
    ['PC.fixy.geodet', 'Geodetické zaměření', 'Kč', 'fixní částka'],
  ]],
  ['DOPRAVA', [
    ['PC.dopravaKmKc', 'Doprava – sazba za km', 'Kč/km', 'po Praze 0 km'],
    /* Cesta mimo Prahu (8. 9. 2026, zadání J. V.): příplatek = km / 60 × sazba za
     * hodinu cesty. Do 8. 9. byla tisícovka natvrdo v jádře a v ceníku nebylo
     * co nastavit. Pevný paušál (dopravaPausalKc) z editoru zmizel 17. 8. 2026 —
     * číslo bez účinku je past; klíč v datech zůstává kvůli starým ceníkům. */
    ['PC.dopravaHodKc', 'Cesta mimo Prahu – hodina cesty', 'Kč/h',
      'příplatek „mimo Prahu" = km / 60 × tato sazba (hodina cesty při 60 km/h); prázdné nebo 0 = 1 000 Kč/h'],
  ]],
  /* Kurz EUR — viz poznámka u sekce Cizí měna v ceníku OCK (#155). */
  /* SAZBY DPH a KURZ EUR v ceníku PROJ NEJSOU (2. 9. 2026, pokyn J. V.:
   * „v ceníku PROJ používej stejné sazby DPH jako v ceníku OCK, tzn. jeden
   * zdroj pravdy, totéž platí i pro kurz EUR"). Dvě místa na tutéž hodnotu
   * znamenají, že se dřív nebo později rozejdou — a u kurzu by to bylo vidět
   * až na cizojazyčné nabídce, kde by projekce počítala jiným kurzem než
   * stavební část. Předvolby DPH i kurz se berou z ceníku OCK
   * (`C.dphZakladni` … a `C.kurzEurKc`); sazba SAMOTNÉ zakázky zůstává
   * u projekce vlastní (`PC.dph`) — projekční práce bývají v jiné sazbě. */
];

/* Ceníkové klíče, u kterých je prázdno platná hodnota („nenastaveno").
 * Dnes je množina prázdná: každá položka ceníku musí mít číslo, protože nula
 * v ceníku znamená položku zdarma a to se nemá stát omylem při importu
 * z tabulky. Mechanismus tu zůstává, aby se u prvního takového klíče nemusel
 * vymýšlet znovu. */
const CENIK_SMI_BYT_PRAZDNY = new Set([
  /* Kurz EUR (#155): prázdno = „nenastaveno" a je to platný stav — blokuje
   * jen cizojazyčný tisk. Nula od importu by naopak vypadala jako kurz. */
  'C.kurzEurKc', 'PC.kurzEurKc',
]);

/* ---- výchozí hodnoty zadání z ceníku (31. 8. 2026) ----
 *
 * Ceník nově nese i pár hodnot, které nejsou ceny: rozsahy práce, se kterými
 * začíná nová zakázka, a čísla, která předvyplní zaškrtnutí ATYP. Do teď byla
 * napsaná v kódu a firma je nemohla změnit bez nového sestavení.
 *
 * PRÁZDNO NEBO NULA ZNAMENÁ NENASTAVENO a platí hodnota ze sestavení.
 * Je to schválně: `pripravit_github.py` před nahráním na GitHub celý
 * DEFAULT_CENIK vynuluje (v repozitáři nesmí být firemní čísla), takže build
 * z repozitáře má tyhle položky nulové — a nová zakázka by pak začínala
 * s nulou hodin montáže. Nula jako firemní výchozí rozsah práce nedává
 * smysl, kdežto nula jako "tohle jsme nevyplnili" ano. */
/* DODATKOVÝ TEXT K POLOŽCE (#267, 18. 9. 2026, zadání J. V.).
 *
 * Do cenové nabídky se pod název položky tiskne popis, kterým obchodník
 * zákazníkovi vysvětlí, co si kupuje — místo dosavadního řádku
 * „množství: 88,626", který zákazníkovi neříkal nic.
 *
 * TEXT PATŘÍ K CENÍKOVÉ POLOŽCE, ne k zakázce (rozhodnutí J. V.): popis
 * „skel s vyšší energetickou reflexí" je pokaždé stejný, takže se u další
 * nabídky předvyplní sám. Zakázka si přitom nese vlastní kopii ceníku,
 * takže starší nabídka má text takový, jaký platil tehdy — nemusí se nic
 * zvlášť zamrazovat.
 *
 * VLASTNÍ MAPA, NE SLOUPEC U SAZBY. Ceník se verzuje a porovnává
 * (`cenikRozdily` nad `cenikSledovane`); kdyby popis ležel mezi cenami,
 * hlásila by se změna formulace jako změna ceny. Mapa `popisy` stojí vedle
 * a do porovnání cen nevstupuje — zato ji nese OTISK verze, jinak by
 * zveřejnění opravy překlepu databáze odmítla jako „beze změny" (táž past
 * jako #181 u zahraniční řady). */
function cenikPopis(c, cesta) {
  const p = (c && c.popisy) || null;
  const v = p ? p[String(cesta)] : null;
  return (typeof v === 'string') ? v : '';
}
function cenikPopisNastav(c, cesta, text) {
  if (!c) return;
  const t = String(text == null ? '' : text).trim();
  if (!c.popisy) c.popisy = {};
  /* Prázdný text se MAŽE, neukládá se jako prázdný řetězec. Jinak by ceník
   * postupně obrostl klíči, které nic neříkají, a diff verzí by hlásil
   * „přibyl popis", kde jen někdo klikl do pole a zase z něj vyjel. */
  if (t === '') delete c.popisy[String(cesta)];
  else c.popisy[String(cesta)] = t;
}

/* ---------- dodatkové texty platné pro celou aplikaci (22. 9. 2026) ------
 *
 * Zadání J. V.: „dodatkové texty pod příplatky a volitelnými položkami,
 * které jako administrátor zadám, mají zůstat v aplikaci uložené. Ostatní
 * uživatelé je mohou v případě potřeby upravovat, ale jen admin je může
 * zadat, resp. trvale přepisovat."
 *
 * Do 22. 9. text žil JEN v ceníku otevřené zakázky. Dokud správce ceník
 * nezveřejnil, nikdo jiný ho neviděl — a zveřejnit celý ceník kvůli jedné
 * větě znamená novou verzi ceníku se vším, co k tomu patří. Proto vedle
 * ceníku stojí samostatná mapa textů (`/api/popisy`), kterou smí zapsat
 * jen administrátor a která se při přihlášení vlije do výchozího ceníku.
 * Odtud si ji každá nová zakázka odnese ve své kopii, takže odeslaná
 * nabídka se pozdější změnou textu už nezmění.
 *
 * Očista je tady, v modelu, aby ji prohlížeč i server dělali TÝMŽ kódem —
 * stejně jako u matice zobrazení. Klíčem je PŮVODNÍ NÁZEV položky, ne
 * ceníková cesta (viz `popisZCeniku` v engine.js), takže se nedá ověřit
 * proti seznamu cest; hlídá se tedy tvar a délka. */
const POPISY_MAX_KLIC = 200;
const POPISY_MAX_TEXT = 300;
const POPISY_MAX_POLOZEK = 500;

function popisyOciste(vstup) {
  const v = (vstup && typeof vstup === 'object' && !Array.isArray(vstup)) ? vstup : {};
  const out = {};
  let kolik = 0;
  Object.keys(v).forEach(k => {
    if (kolik >= POPISY_MAX_POLOZEK) return;
    const klic = String(k == null ? '' : k).trim();
    if (!klic || klic.length > POPISY_MAX_KLIC) return;
    const t = (typeof v[k] === 'string') ? v[k].trim() : '';
    if (!t) return;                       // prázdný text se neukládá, viz cenikPopisNastav
    out[klic] = t.slice(0, POPISY_MAX_TEXT);
    kolik++;
  });
  return out;
}

/* Vlije texty do ceníku (na místě), ale JEN tam, kde ceník vlastní text
 * nemá. Zveřejněný ceník je konkrétnější zdroj: kdyby ho společná mapa
 * přebila, správce by změnu textu ve zveřejněné verzi nikdy neprosadil. */
function popisyVlij(cenik, texty) {
  if (!cenik) return cenik;
  const t = popisyOciste(texty);
  if (!cenik.popisy) cenik.popisy = {};
  Object.keys(t).forEach(k => {
    if (typeof cenik.popisy[k] !== 'string' || !cenik.popisy[k].trim()) cenik.popisy[k] = t[k];
  });
  return cenik;
}

/* Doplnění společných textů do ROZPRACOVANÉ zakázky (25. 9. 2026, hlášení
 * J. V. „dodatkové texty se mi v čase ztrácí").
 *
 * Do té doby se společné texty vlévaly jen do výchozího ceníku, tedy do
 * NOVÝCH zakázek. Kdo otevřel zakázku založenou dřív, než text napsal,
 * pole měl prázdné — a vypadalo to, že text zmizel. Teď se doplní i do
 * rozpracovaných variant, ale jen tam, kde klíč v ceníku varianty VŮBEC
 * NENÍ: vlastní text zakázky se nepřepisuje a prázdný řetězec je vědomé
 * „tady text nechci" (zapisuje ho `popisSet`, když obchodník text smaže).
 * Uzamčené (odeslané) varianty sem volající vůbec nepouští. Vrací počet
 * doplněných textů. */
function popisyDoplnChybejici(cenik, texty) {
  if (!cenik || !texty || typeof texty !== 'object') return 0;
  let n = 0;
  Object.keys(texty).forEach(k => {
    const t = (typeof texty[k] === 'string') ? texty[k].trim() : '';
    if (!t) return;
    if (!cenik.popisy || typeof cenik.popisy !== 'object') cenik.popisy = {};
    if (Object.prototype.hasOwnProperty.call(cenik.popisy, k)) return;
    cenik.popisy[k] = t;
    n++;
  });
  return n;
}

/* ČÍSELNÍK DODATKOVÝCH TEXTŮ (25. 9. 2026, zadání J. V.: „potřebujeme
 * samostatný číselník, resp. pole v ceníku nákladů OCK, aby je trvale
 * držel").
 *
 * Seznam všech položek, pod které se dodatkový text dá napsat — příplatky
 * a volitelné položky s ceníkovou vazbou — pro exteriér i interiér. Počítá
 * se výpočtem nad výchozím zadáním, ne ručním seznamem: nová položka v jádru
 * se v číselníku objeví sama a přejmenovaná nezůstane viset pod starým
 * názvem. Texty, jejichž položka už v jádru není, se nezahazují — vrací se
 * zvlášť (`osirele`), aby je administrátor viděl a mohl rozhodnout.
 *
 * `vypocetFn(zadani, cenik)` dodá volající (v prohlížeči `vypocet`
 * s JEKLY), díky tomu je funkce čistá a testuje se v Node. */
function popisyCiselnik(vypocetFn, zadaniVychozi, cenik, texty) {
  const radky = [], podle = {};
  const t = popisyOciste(texty);
  [['exteriérová', 'EXT'], ['interiérová', 'INT']].forEach(([typ, zn]) => {
    let r = null;
    try {
      const z = JSON.parse(JSON.stringify(zadaniVychozi || {}));
      z.typSachty = typ;
      r = vypocetFn(z, cenik);
    } catch (e) { r = null; }
    if (!r) return;
    const vloz = (it, skupina) => {
      if (!it || it.vlastni || !it.cenaPath) return;
      const klic = it.origNazev || it.nazev;
      if (!klic) return;
      if (!podle[klic]) {
        podle[klic] = { klic, skupina, cenaPath: it.cenaPath, typy: [], text: t[klic] || '' };
        radky.push(podle[klic]);
      }
      if (!podle[klic].typy.includes(zn)) podle[klic].typy.push(zn);
    };
    (r.priplatky || []).forEach(it => vloz(it, 'Příplatky'));
    (r.volitelneKatalog || []).forEach(x => vloz(x && (x.it || x), 'Volitelné položky'));
  });
  const osirele = Object.keys(t).filter(k => !podle[k]).map(k => ({ klic: k, text: t[k] }));
  return { radky, osirele };
}

function cenikVychozi(c, klic, zaklad) {
  const v = c ? c[klic] : null;
  return (typeof v === 'number' && isFinite(v) && v > 0) ? v : zaklad;
}

/* přístup do konkrétního ceníkového objektu podle cesty „C.a.b" / „PC.a.b" */
function cenikGet(obj, cesta) {
  const ks = cesta.split('.').slice(1);   // zahodit prefix C/PC
  return ks.reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function cenikSet(obj, cesta, val) {
  /* B70: segment cesty nesmí sáhnout na prototyp (viz cestaBezpecna v common.js). */
  if (String(cesta).split('.').some(k => k === '__proto__' || k === 'constructor' || k === 'prototype')) return;
  const ks = cesta.split('.').slice(1), last = ks.pop();
  const cil = ks.reduce((o, k) => (o[k] = o[k] || {}), obj);
  cil[last] = val;
}
function cenikTyp(def, cesta) {
  for (const [, items] of def) for (const it of items) if (it[0] === cesta) return it[4] || 'num';
  return 'num';
}

/* ---- Excel: sestavení řádků listu z definice + hodnot ceníku ---- */
const CENIK_HLAVICKA = ['Kategorie', 'Klíč', 'Popis', 'Jednotka', 'Hodnota', 'Poznámka'];
function cenikSheetRows(def, obj, extra) {
  const rows = [CENIK_HLAVICKA.slice()];
  (extra || []).forEach(e => rows.push(['', e.klic, e.popis, e.jed || '', e.hodnota, e.pozn || '']));
  def.forEach(([grp, items]) => items.forEach(([cesta, popis, jed, pozn]) =>
    rows.push([grp, cesta, popis, jed || '', cenikGet(obj, cesta), pozn || ''])));
  return rows;
}
/* ceníky OCK (C) + PROJ (PC) → sheets pro xlsxZapis */
function cenikToSheets(C, PC) {
  return [
    { nazev: 'Ceník OCK', rows: cenikSheetRows(CENIK_DEF, C, [
      { klic: 'C.marze', popis: 'GLOBÁLNÍ PŘIRÁŽKA OCK (podíl, 0.30 = 30 %)', hodnota: C.marze },
      { klic: 'C.dph', popis: 'Sazba DPH (podíl, 0.12 = 12 %)', hodnota: C.dph }]) },
    { nazev: 'Ceník PROJ', rows: cenikSheetRows(CENIK_DEF_PROJ, PC, [
      { klic: 'PC.marze', popis: 'GLOBÁLNÍ PŘIRÁŽKA PROJ (podíl)', hodnota: PC.marze }]) },
  ];
}

/* ---- Excel import: z listů spočítej změny proti aktuálnímu ceníku ----
 * Vrací { zmeny:[{cesta,popis,stara,nova}], chyby:[str], nezname:[cesta] }.
 * NEaplikuje – aplikace až po potvrzení přes cenikAplikuj(). */
function cenikDiffZeSheets(sheets, C, PC) {
  const cil = { 'C': { obj: C, def: CENIK_DEF }, 'PC': { obj: PC, def: CENIK_DEF_PROJ } };
  const znameKlice = new Set(['C.marze', 'C.dph', 'PC.marze']);
  [CENIK_DEF, CENIK_DEF_PROJ].forEach(def => def.forEach(([, items]) => items.forEach(it => znameKlice.add(it[0]))));
  const zmeny = [], chyby = [], nezname = [];
  (sheets || []).forEach(sh => {
    const rows = sh.rows || [];
    // najdi sloupce podle hlavičky (Klíč, Hodnota) – jinak předpokládej B a E
    let head = rows[0] || [];
    let ci = head.findIndex(x => /kl[ií]č/i.test(String(x)));
    let vi = head.findIndex(x => /hodnota/i.test(String(x)));
    if (ci < 0) ci = 1; if (vi < 0) vi = 4;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i] || []; const klic = String(r[ci] == null ? '' : r[ci]).trim();
      if (!klic) continue;
      if (!znameKlice.has(klic)) { nezname.push(klic); continue; }
      const prefix = klic.split('.')[0];
      const t = cil[prefix]; if (!t) { nezname.push(klic); continue; }
      let nova = r[vi];
      /* `pct` je v datech desetinný podíl, takže se importuje jako číslo
       * (v Excelu se zadává 0,3 = 30 %, stejně jako u globální přirážky). */
      let typ = klic === 'C.marze' || klic === 'C.dph' || klic === 'PC.marze'
        ? 'num' : cenikTyp(t.def, klic);
      if (typ === 'pct') typ = 'num';
      if (typ === 'num') {
        /* Prázdná buňka u klíče, který smí být nenastavený, není chyba —
         * je to platná hodnota „nenastaveno" (#132: výchozí přirážka sekce).
         * U ostatních čísel prázdno chyba je: tichá nula v ceníku znamená
         * položku zdarma. „Prázdno není nula" platí oběma směry. */
        const prazdno = nova == null || String(nova).trim() === '';
        /* Položka, kterou ceník ještě nezná, přijde v listu prázdná —
         * nově přidaný klíč ve starším zveřejněném ceníku prostě není
         * (31. 8. 2026, překlady CZ→DE). Prázdná buňka u položky, která
         * ani dnes hodnotu nemá, se proto přeskočí: není to chyba a není
         * to ani změna. Prázdno u položky, která hodnotu MÁ, chyba
         * zůstává — „prázdno není nula" platí dál. */
        if (prazdno && cenikGet(t.obj, klic) == null) continue;
        if (prazdno && CENIK_SMI_BYT_PRAZDNY.has(klic)) { nova = null; }
        else {
          if (typeof nova === 'string') nova = parseFloat(nova.replace(/\s/g, '').replace(',', '.'));
          if (typeof nova !== 'number' || !isFinite(nova)) { chyby.push('Neplatné číslo u ' + klic + ': „' + r[vi] + '"'); continue; }
        }
      } else { nova = String(nova == null ? '' : nova).trim(); }
      const stara = klic === 'C.marze' ? C.marze : klic === 'C.dph' ? C.dph : klic === 'PC.marze' ? PC.marze : cenikGet(t.obj, klic);
      /* Nenastaveno se dá zapsat třemi způsoby (chybí klíč, null, prázdná
       * buňka) a všechny znamenají totéž. Bez tohohle srovnání by import
       * hlásil změnu tam, kde se nic nezměnilo, a administrátor by odklikával
       * prázdné rozdíly. */
      const prazdneObe = CENIK_SMI_BYT_PRAZDNY.has(klic)
        && (stara == null || stara === '') && (nova == null || nova === '');
      if (!prazdneObe && String(stara) !== String(nova))
        zmeny.push({ cesta: klic, popis: String(r[2] == null ? '' : r[2]), stara, nova });
    }
  });
  return { zmeny, chyby, nezname };
}
/* Aplikuje spočítané změny do ceníků (in-place). */
function cenikAplikuj(zmeny, C, PC) {
  (zmeny || []).forEach(z => {
    if (z.cesta === 'C.marze') C.marze = z.nova;
    else if (z.cesta === 'C.dph') C.dph = z.nova;
    else if (z.cesta === 'PC.marze') PC.marze = z.nova;
    else if (z.cesta.split('.')[0] === 'PC') cenikSet(PC, z.cesta, z.nova);
    else cenikSet(C, z.cesta, z.nova);
  });
  return zmeny.length;
}

if (typeof module !== 'undefined')
  module.exports = { CENIK_DEF, CENIK_DEF_PROJ, CENIK_JEN_ZAHR, cenikGet, cenikSet, cenikTyp, cenikVychozi,
    cenikPopis, cenikPopisNastav,
    POPISY_MAX_KLIC, POPISY_MAX_TEXT, POPISY_MAX_POLOZEK, popisyOciste, popisyVlij, popisyDoplnChybejici, popisyCiselnik,
    cenikSheetRows, cenikToSheets, cenikDiffZeSheets, cenikAplikuj, CENIK_HLAVICKA };
