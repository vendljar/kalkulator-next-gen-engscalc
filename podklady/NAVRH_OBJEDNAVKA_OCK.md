# Návrh: Objednávka OCK (realizace šachty) z odeslané cenové nabídky — #790

Poradce Fable, 25. 11. 2026. Podklad pro rozhodnutí J. V.; kód se tímto nemění.
Zadání: J. V. 25. 11. 2026 (ROZHODNUTI_LOG) — „Objednávka OCK: založit a připravit návrh“.
Vzor: objednávka PROJ (D3 #688/#689, `src/objednavka_proj.js`, `src/ui/objednavka_proj_ui.js`).

## 1. Shrnutí

Objednávka OCK je dokument, který zákazník podepíše **místo smlouvy o dílo**. Vzniká
z odeslané (zamčené) cenové nabídky OCK, nese číslo `…-OBJ-…` odvozené z čísla
nabídky a vypadá jako objednávka PROJ (rozvržení „Přijaté objednávky“ účetního
systému). Ceny se nepočítají znovu — bere je z téhož výpočtu jako nabídka a smlouva.

Proti objednávce PROJ jsou u OCK tři věci navíc, a ty rozhodují o rozsahu práce:

1. **Objednané příplatky** (#447) — cena díla = nabídka + to, co zákazník objednal.
   Dnes se zaškrtávají při tisku SoD a jejich otisk leží v záznamu tisku `sod`.
2. **Režim DPH** (česká / přenesená / EU) — smlouva bez něj nevznikne (B189).
3. **Důsledky podpisu**: tisk SoD zmrazí krycí list a hlavičku, controlling
   a Pipedrive berou „cenu díla podle SoD“ ze záznamu tisku `sod`.

Doporučení: objednávka OCK se **pro zámek, objednané příplatky, controlling
a Pipedrive chová jako smlouva o dílo** (otázka 1). Jinak by prodej přes objednávku
nesl v Pipedrive a exportu cenu bez objednaných příplatků.

## 2. Rozvržení dokumentu

Dvě strany A4 (u víc šachet nebo mnoha příplatků tři). Podpis objednatele je vždy
na konci poslední strany — stejně jako nově u objednávky PROJ (#791).

### Strana 1 — hlava a cena

| Blok | Obsah | Zdroj |
|---|---|---|
| Název a číslo | „Objednávka / Smlouva“, číslo dokladu OBJ, číslo zakázky (když je vyplněné), datum vystavení | `nabidkaData` (CISLO_NABIDKY), krycí list |
| Dodavatel | firma, sídlo, IČO, DIČ, banka | Nastavení → Firma |
| Objednatel | název, sídlo, IČO, DIČ, zástupce | hlavička zakázky (`sodObjednatelDoplna`) |
| Místo určení | název akce, adresa stavby | hlavička zakázky |
| Řádky | viz níže | výpočet nabídky (u odeslané ze zmrazeného výsledku) |
| Součty | základ, DPH podle režimu, celkem; rámeček „Celkem“ | `objCenaDila`, `sodDphSymboly` |
| Odkaz | „Nedílnou součástí je cenová nabídka č. … ze dne … včetně technické specifikace.“ | datum nabídky (`nabidkaDatum`) |

Řádky tabulky (sloupce jako PROJ: Č., Označení, Popis dodávky, Množ., MJ, J. cena,
C. cena, Celkem bez DPH, DPH %, Celkem s DPH):

- **Jedna šachta:** jeden řádek „Ocelová konstrukce výtahové šachty — dodávka
  a montáž“ za cenu nabídky před slevou; pod názvem tři až pět řádků stručné
  specifikace (rozměr, počet stanic, opláštění, povrchová úprava, kotvení).
- **Víc šachet:** řádek na variantu šachty (název, ks, cena) podle rozpočtu R7 —
  tytéž částky jako `{{SACHTY_SOD_ROZPIS}}` ve smlouvě.
- **Příplatky v ceně nabídky** se nevypisují zvlášť (jsou v ceně řádku šachty,
  jako v nabídce).
- **Objednané příplatky:** každý objednaný příplatek vlastní řádek (tytéž položky
  jako `{{SOD_PRIPLATKY_OBJEDNANE}}`).
- **Sleva:** vlastní řádek (jako PROJ), takže „Celkem“ = cena díla na korunu.
- Eura: jen pokud se rozhodne o jazykových verzích (otázka 3); zaokrouhlení jako
  smlouva (celá eura nahoru po položkách, #155).

### Strana 2 — podmínky a podpis

| Blok | Obsah | Zdroj |
|---|---|---|
| Technická specifikace | zkrácený výpis sekcí nabídky (u víc šachet po šachtách) | `nabidkaNahledSekce`, `tsSachtaTechspec` |
| Platební podmínky | splátky s milníky a částkami | `kryciPlatebniKalendar` (totéž co SoD, K18-N100) |
| Termíny | termín dodání a montáže, zahájení | krycí list (`kryciTerminDodani`, `kryciSodSymboly`) |
| Předání díla | jedna věta: předání protokolem, vady a nedodělky nebránící užívání | nový pevný text (otázka 4) |
| Záruka, pokuty, zádržné | hodnoty z podmínek nabídky, bez právního výkladu | `kryciPodminkoveSymboly` |
| Režim DPH | věta podle režimu; u snížené sazby prohlášení objednatele | `SOD_DPH_VETY`, `SOD_DPH_PROHLASENI_*` |
| Vystavil | kdo dokument tiskne (K56-I2, ne snímek zámku) | `zpracovatelTiskneDoklad` |
| Podpis | „V … dne …“, objednatel (jméno, funkce), razítko | krycí list (podpisy SoD) |

Nevyplněná místa (datum, jméno podepisujícího) dostanou tečky „……“ jako smlouva
(C3 #584), ne prázdné místo.

## 3. Číslování

Stejné pravidlo jako PROJ: v čísle nabídky se část `CN` nahradí `OBJ`, pořadí
i verze varianty zůstanou (`RRRR-OVP-CN-nnnn.v` → `RRRR-OVP-OBJ-nnnn.v`). Číslo bez
části `CN` se nevymýšlí — dokument nevznikne a obchodník dostane důvod. Funkci
`objednavkaProjCislo` jde použít beze změny (přejmenovat na společnou).

Kombinovaná zakázka OCK + PROJ: obě objednávky by měly stejné číslo OBJ, protože
číslo PROJ vychází z téhož pořadí. U více zákazníků (písmeno zákazníka v čísle)
se písmeno přenese samo. Viz otázka 5.

## 4. Jazyky

Objednávka PROJ je jen česky (J. V. 19. 11.). Smlouva OCK má čtyři jazyky, ale
jen přes ručně přeložené šablony — objednávka se generuje bez šablony, takže
cizí jazyk by znamenal přeložit pevné texty v kódu (nadpisy sloupců, věta
o předání, DPH). Doporučení: **nejdřív jen česky**; jiný jazyk tisku tlačítko
zhasne s důvodem (vzor `sodJazykZabrana`). Otázka 3.

## 5. Vztah ke smlouvě o dílo OCK a k zámku

Dnes: tisk `sod` zamyká variantu, zmrazí krycí list (kromě plné moci) a hlavičku
zákazníka, zapíše otisk objednaných příplatků a cenu díla do záznamu tisku
(`objSodSnimek`), po podpisu mění objednané jen administrátor. Objednávka PROJ
nezamyká nic.

Navrhuji nový typ dokumentu `objednavkaOck` se stejnými důsledky jako `sod`:

- **Zábrana:** jen z odeslané (zamčené) nabídky OCK; bez režimu DPH nevznikne
  (`sodDphZabrana`); víc zákazníků jen řídící varianta; zámek strany a kontroly
  přes `dokumentVygeneruj` jako ostatní dokumenty.
- **Objednané příplatky:** tatáž obrazovka výběru jako u SoD (`ui/sod_ui.js`),
  tentýž záznam `zak.objednane`; tisk objednávky zapíše otisk a cenu díla.
- **Zmrazení krycího listu a hlavičky** jako po tisku SoD (`ZAMEK_KRYCI_SMLOUVY`,
  `vzTiskSmlouva`).
- **Dotisk** nese objednané a cenu z prvního tisku (jako SoD, K6-K4).
- **Obojí na jedné variantě** (objednávka i SoD): povolit; druhý dokument je
  dotisk téhož stavu — stejné objednané, stejná cena. Rozdíl by hlásila kontrola.

Důsledek pro rozsah: zasahuje server (`zakazka_kontrola.mjs`, `objSodZaznamyServer`),
zámek, controlling a Pipedrive — je to dávka velikosti L a podle CLAUDE.md patří
do kategorie „dokumenty + bezpečnost“ (návrh postupu poradcem, revize před sloučením).

Lehčí varianta (jako PROJ — jen dokument, žádné důsledky) je hotová za zlomek
práce, ale cena díla s objednanými příplatky by se do controllingu a Pipedrive
dostala jen tehdy, když obchodník vytiskne i smlouvu.

## 6. Pipedrive

Zápis do Pipedrive dělá až tlačítko Prodáno (PV #597), ne tisk dokumentu — to se
nemění. Mění se jen zdroj hodnoty dealu: `ctrlCenaDilaSod` čte záznam tisku `sod`;
u varianty prodané přes objednávku musí číst i záznam tisku objednávky. Fáze
„Vyhrané k podpisu SoD“ zůstává (přejmenování fáze je věc J. V., nenavrhuji).
Datum podpisu a „Číslo SoD“ v krycím listu: u objednávky se do pole Číslo SoD
propíše číslo OBJ, jen pokud to J. V. chce (otázka 6).

## 7. Umístění v aplikaci

Krycí list OCK, společná sekce se smlouvou o dílo a plnou mocí (soulad s #792
u PROJ): pořadí Objednávka (náhled a tisk / Word) → Plná moc → Smlouva o dílo
jako poslední. Karta ukáže číslo OBJ, stav (z které nabídky, datum) a důvod,
když je tlačítko zhasnuté.

## 8. Technické řešení (pro prompt dávky)

- Nový modul `src/objednavka_ock.js` (data + Word bez šablony) a
  `src/ui/objednavka_ock_ui.js` (karta, náhled, tisk). Pomocníky Wordu
  (`objDocxBunka`, `objDocxOdst`, `objDocxTabulka`) a číslo sdílet s PROJ.
- Data z `nabidkaData(…, { zive: true })` + `objCenaDila` + `kryciPlatebniKalendar`
  + `sodDphSymboly` — žádný vlastní výpočet ceny.
- Testy s pojistkou: součet řádků = cena díla smlouvy (Kč i víc šachet), číslo,
  zábrany, režimy DPH, objednané příplatky, dotisk, záznam tisku na serveru.
- Porovnání sestavení: stávající dokumenty musí dát „SHODA“ (nový dokument nic
  nemění na nabídce ani smlouvě).
- Texty dokumentu (věta o předání, odkaz na nabídku, DPH) schvaluje J. V. před
  sloučením — jsou to právní texty.

## 9. Otázky pro J. V. (doporučená varianta první)

1. **Důsledky objednávky OCK.**
   a) *Doporučuji:* chová se jako smlouva o dílo — výběr objednaných příplatků,
   zmrazení krycího listu, cena díla do controllingu a Pipedrive.
   b) Jen dokument bez důsledků (jako PROJ); cena díla se řídí dál jen smlouvou.
2. **Rozsah technické specifikace.**
   a) *Doporučuji:* stručný výpis na 2. straně (hlavní parametry šachty) a odkaz
   na nabídku jako nedílnou součást.
   b) Plná technická specifikace z nabídky (objednávka pak má 3–4 strany).
   c) Žádná specifikace, jen odkaz na nabídku (objednávka na 1–2 strany).
3. **Jazyky.** a) *Doporučuji:* jen česky. b) I EN/DE/FR s cenou v eurech
   (pevné texty je nutné nechat přeložit a schválit).
4. **Smluvní texty.** Objednávka nenese články smlouvy (odpovědnost, odstoupení,
   vyšší moc…).
   a) *Doporučuji:* krátké věty k předání díla, záruce a pokutám s hodnotami
   z nabídky + věta „ostatní se řídí cenovou nabídkou a občanským zákoníkem“;
   znění dodá nebo schválí J. V.
   b) Odkaz na obchodní podmínky firmy (pokud existují jako dokument).
5. **Číslo u kombinované zakázky OCK + PROJ.**
   a) *Doporučuji:* obě objednávky stejné číslo OBJ, liší se názvem
   („Objednávka / Smlouva — realizace“ × „— projekční práce“).
   b) Rozlišit příponou v čísle (např. `-R` / `-P`).
6. **Číslo zakázky a Číslo SoD.**
   a) *Doporučuji:* do krycího listu OCK přidat pole „Číslo zakázky“ (z účetnictví)
   jako u PROJ; prázdné = kolonka se netiskne; pole Číslo SoD zůstává jen pro smlouvu.
   b) Bez nového pole.
7. **Smí vzniknout objednávka i smlouva o dílo z téže varianty?**
   a) *Doporučuji:* ano, druhý dokument je dotisk téhož stavu.
   b) Ne — po objednávce tlačítko smlouvy zhasne (a naopak).

## 10. Maketa

Maketa první a poslední části dokumentu se smyšlenými údaji je v soukromém
artefaktu (odkaz ve zprávě koordinaci); do repa nepatří.
