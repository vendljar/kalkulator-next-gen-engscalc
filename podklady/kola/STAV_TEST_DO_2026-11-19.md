# STAV – zkouška DO (dotazy obchodníků D1, D2, D4–D7, roadmapa #675) na testu, 19. 11. 2026

## Hlavička

- **Test:** v19.11.6 (`origin/test` 6092af3). **Main:** v11.11.1, jen čtení (zápisy blokované, i `/api/analytika`).
- **Souhlas:** trvalý souhlas J. V. z 19. 11. potvrdil J. V. přímo v tomto sezení (dialog).
- **Kdo:** testovací sezení Claude v Playwrightu. Správce `KNG_TEST_*` a obchodník `KNG_TEST_OBCHODNIK_*` jsou dvě relace.
  Klikalo se na obrazovce (zaškrtávátka, výběr pásu, textová pole, tlačítko „navrhnout do číselníku“). Funkce aplikace se volaly
  jen tam, kde obrazovka vede na tutéž funkci (`oplOdSet`, `oplPasSet`, `cenikPopisySber`, `cenikPopisPrevzit`).
- **Pipedrive:** blokováno. **Vypínače:** žádný se neměnil.
- **Harness:** `podklady/kola/harness_testovani/do.js`. Výsledný běh (7.) dal **59 OK, 1 FAIL**. Běhy 1–6 padaly na harnessu:
  dialog `volba` „neuložené změny“ při otevírání, založení zakázky obchodníka z cizí otevřené nabídky.
- **Zakázky (nové):**
  - `TEST - 2026 - OPR - CN - 9815` („TEST DO – opláštění“, adresa smyšlená, zadání z TEST 9603, založil správce);
  - `TEST - 2026 - OPR - CN - 9816` („TEST DO – obchodník bez adresy“, čistá nová zakázka, založil obchodník).
- **Číselník dodatkových textů:** položky „PŘECHODOVÉ PLECHY - NEREZ (MATERIÁL)“ a „PŘECHODOVÉ PLECHY - NEREZ“ dostaly
  dočasně testovací text a pak se vrátily na původní stav (byly prázdné, bez překladů). Server ověřen po každém kroku.
  V `popisy_historie` zůstaly mezistavy.

## Výsledky

| bod | výsledek | poznámka |
|---|---|---|
| D1 po celé výšce | ✅ 6/6 | Výchozí stěna B má 1 pás a „Opláštění začíná“ je vidět i u stěny po celé výšce (0). Po „Opláštit i prohlubeň“ zůstává „po celé výšce“ zaškrtnuté, začátek −1,1 a prohlubeň je opláštěná. Odškrtnutí klikem dá 2 pásy, začátek −1,1 zůstane. Zaškrtnutí klikem dá 1 pás, začátek se nevrátí na 0 a prohlubeň zůstane opláštěná. Cena po kliknutí sem a tam je beze změny. Začátek −3 m se ohlásí „pod dnem prohlubně“ i u stěny po celé výšce. |
| D2 bez opláštění | ✅ | **Výběr:** Izolační dvojsklo / Sklo VSG 4.4.1 / Cetris / **bez opláštění** / jiné (klíč `bez`). „dodá stavba“ není nikde v kalkulaci. **Nižší pás** „bez opláštění“ zvolený na obrazovce má do (m) = 0 v datech i v poli. Žluté „nemá dělicí výšku“ nevznikne, hodnota jde přepsat (0,5). **Nákres:** pás bez opláštění od −1,1 po 0. **Cena:** do = 0 dává tutéž cenu jako prázdná výška. **CN (Word)** CZ / EN / DE / FR: „bez opláštění (stěny B, C)“ / „Without cladding“ / „Ohne Verkleidung“ / „Sans bardage“; „dodá stavba“ nikde. **Obrazovky:** kalkulace, detail, specifikace, specifikace-data mají „bez opláštění“. „dodá stavba“ je jen v záložce Zakázka, a to v názvu cizí TEST zakázky (K18-Z13), ne v textu aplikace. **SoD** CZ / EN / DE / FR a **krycí listy** BO a Techdata materiál opláštění vůbec neuvádějí (ani „dodá stavba“), takže tu není co přejmenovat. |
| D2 cena | ✅ | Stejná data 9815 (B: spodní pás „bez“ do 0, C celá „bez“, prohlubeň, plechy) jsme spočítali na **main v11.11.1** a na testu. Základ, celý souhrn, příplatky i volitelné vyšly **shodně**, s přepisem i bez něj. |
| D4 přechodové plechy | ✅ | Ve Volitelných je pořadí prechodove, prechMont, lešení… Řádek „PŘECHODOVÉ PLECHY - NEREZ (MATERIÁL)“ má hned pod sebou „… (MONTÁŽ)“. Klíč ruční úpravy zůstává „PŘECHODOVÉ PLECHY - NEREZ“. **Starší přepis** množství pod dosavadním klíčem platí (7, přepsáno, cena se změní) a cena se shoduje s main. **Starší dodatkový text** pod dosavadním klíčem je u řádku (pole ho ukazuje). V CN se plechy v základu tisknou pevným řádkem „PŘECHODOVÉ PLECHY V NÁSTUPIŠTÍCH“, dodatkový text volitelné položky se v CN netiskne. Na main jsme to neověřili, protože main odmítl CN z dat testu (ceník je směs, „cenová výjimka“). Příplatek jen s materiálem se v CN CZ tiskne jako „PŘECHODOVÉ PLECHY - NEREZ (MATERIÁL)“. CN EN je bez české „PŘECHODOVÉ“. |
| D5 příplatky | ✅ 7/7 | Klikalo se na zaškrtávátka. Zaškrtnutý materiál zaškrtne i montáž, odškrtnutý odškrtne obě. Montáž jde samostatně odškrtnout (materiál zůstane) i zaškrtnout bez materiálu. Základní cena se klikáním nezmění. **Zamčená nabídka** (TEST 9949-K49, varianta vytištěná jako CN): klik na materiál vyvolá hlášku o uzamčené variantě a `priplatkyVynechat` se nezmění. Čtecí relace, nic se neukládalo. |
| D6 správce | ✅ | Správce u pole nevidí „jen pro tuto zakázku“ ani tlačítko. Po zápisu se ukáže **„uloženo pro všechny nové zakázky“**, po ~4 s zmizí a text je na serveru v číselníku. Ověřeno u příplatku i u volitelné položky. |
| D6 obchodník | ✅ | Obchodník vidí **„jen pro tuto zakázku“**. Bez vlastního textu tlačítko není, s vlastním textem je **„navrhnout do číselníku“**. Po kliknutí se ukáže „navrženo do číselníku — administrátor ho uvidí po uložení zakázky“ a návrh je ve variantě (`popisyNavrhy`). Číselník se nezměnil. Uložení (obchodník, vlastní zakázka) vrátilo 200. |
| D6 číselník a převzetí | ⚠ **nález DO-N1** | **Volitelná položka „PŘECHODOVÉ PLECHY - NEREZ“:** po „Najít texty v uložených zakázkách“ vidí správce u řádku štítek **návrh** (návrh je první) a tlačítko „převzít“. Převzetí zapíše text do číselníku ✅. **Příplatek „PŘECHODOVÉ PLECHY - NEREZ (MATERIÁL)“:** server návrh vrátí (první, `navrh: true`, počítá se do „Nalezeno u N položek“), ale **číselník tu položku nemá mezi řádky**, takže se štítek ani „převzít“ nezobrazí. Návrh obchodníka u tohoto příplatku správce v Ceník → číselník neuvidí, přestože obchodník dostal „administrátor ho uvidí“. `cenikPopisPrevzit` volaný přímo funguje. |
| D7 sloupec Akce | ✅ | Online seznam (`onlineRadekZakazky`, sdílí ho i Přehled CN): **tučně adresa** „Zkušební 15, …“, pod ní **šedě** (rgb 107, 118, 134) „TEST DO – opláštění“. Živá obrazovka (záložka Zakázka): řádek 9815 má tučnou adresu (700) a šedou akci. Seznam ve složce (`ulozisteRadekHtml`): totéž. Zakázka bez adresy (9816) má jen název akce tučně. |

## Nálezy

- **DO-N1 (D6, nízká až střední):** návrh dodatkového textu u položky, kterou číselník nevypisuje, správce v Ceník → číselník neuvidí.
  Ověřeno na příplatku „PŘECHODOVÉ PLECHY - NEREZ (MATERIÁL)“.
  Řádky číselníku staví `popisyCiselnik` z `DEFAULT_ZADANI`, kde jsou plechy v základu (`prechodovePlechy: true`). Příplatek prechMat
  tam proto nevznikne. `cenikPopisyKandidati` se vypisuje jen pod řádky (a osiřelé texty mají jen klíče se společným textem).
  Server návrh vrací a započítá ho do „Nalezeno u N položek“, obrazovka ho ale nevykreslí. Obchodníkovi přitom aplikace slíbila
  „administrátor ho uvidí“. Doporučení: vypsat kandidáty sběru i pro klíče bez řádku v číselníku (oddíl „Návrhy k položkám mimo
  číselník“), nebo doplnit řádky číselníku o příplatky ze zadání bez plechů v základu. Druhá cesta mění jen obrazovku číselníku,
  cenu ne. Rozhoduje J. V. / koordinace.
- **DO-I1 (informace, D4):** materiál plechů se teď na obrazovce jmenuje ve Volitelných i v Příplatcích stejně, „PŘECHODOVÉ PLECHY -
  NEREZ (MATERIÁL)“. Dodatkové texty jsou ale pod dvěma klíči: volitelná položka pod „PŘECHODOVÉ PLECHY - NEREZ“ (tak se jmenuje
  i řádek číselníku), příplatek pod „… (MATERIÁL)“. Obchodník může čekat, že jeden text platí pro obojí. Je to záměr (klíč beze změny),
  nejde o vadu.

## Úklid

- 9815 a 9816 zůstávají v TEST sadě. 9815: plechy jako příplatek, B spodní pás „bez“ do 0, C „bez“, prohlubeň opláštěná,
  bez přepisů a dodatkových textů. 9816: texty plechů i návrhy (`popisyNavrhy`) smazané dodatečným úklidem obchodníka (uloženo 200).
  Sběr `/api/popisy?sber=1` po úklidu nemá od 9815/9816 nic k plechům. Zůstal jen text „Sklo VSG s mléčnou fólií“ v 9816.
  Ten přišel ze zveřejněného ceníku testu (starší testovací text), ne ze zkoušky.
- Číselník: obě položky vráceny na prázdný text (ověřeno GET `/api/popisy`).
- Zápisy správce: `POST /api/zakazky`, `/api/popisy`, `/api/analytika` (vše 200). Obchodník: `POST /api/zakazky`, `/api/analytika`.
  Main: nic (blokováno).
