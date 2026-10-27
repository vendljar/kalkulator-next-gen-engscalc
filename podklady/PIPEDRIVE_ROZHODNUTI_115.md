# #115 — Co když dvě kalkulace píšou do stejného dealu (rozhodovací podklad)

Připraveno 27. 10. 2026 (#536) pro J. V.; otázky položí koordinace v dialogu.
Nic se neprogramuje, dokud J. V. nerozhodne.

## O co jde

Zápis z kalkulace do Pipedrive (#115) bude jednosměrný a potvrzený:
obchodník uvidí tabulku „pole / dnes v Pipedrive / nová hodnota" a teprve
pak klikne (náhled už existuje — karta „Co by se zapsalo do Pipedrive"
v krycím listu, #536). Zapisuje se **řídící varianta** zakázky; vazbu na
deal nese zakázka (`pdDealId`, Controlling → „Pipedrive deal id").

Nic dnes nebrání tomu, aby **dvě různé zakázky** v kalkulátoru měly totéž
číslo dealu. Typické situace:

1. **Kopie zakázky** (klon pro jiného zákazníka nebo „na zkoušku") si
   ponese stejné `pdDealId`. *(Pozn.: duplikace zakázky (`zakazkaDuplikuj`) deal id maže —
   ale import ze souboru nebo ruční zadání ho přenese.)*
2. **Překlep** v čísle dealu — zakázka B se trefí do dealu zakázky A.
3. **Dvě nabídky na jednu poptávku** (např. dvě řešení šachty jako dvě
   zakázky místo dvou variant).
4. **OCK a PROJ jako dvě zakázky** — podle rozhodnutí P6 (1. 10. 2026) se
   v Pipedrive evidují zvlášť pod vlastním číslem, takže mají mít **dva
   dealy**; společný deal je tedy chyba v datech, ne běžný stav.

Bez pravidla vyhraje poslední zápis: deal střídavě nese podmínky jedné
a druhé zakázky („ping-pong"), hodnota dealu skáče a v CRM nejde poznat,
ze které nabídky čísla jsou. Varianty **jedné** zakázky problém nejsou —
píše vždy jen řídící.

## Varianty

### A — Poslední zápis vyhrává, jen s varováním
Zápis projde vždy; potvrzovací tabulka ukáže, co přepíše („v Pipedrive je
dnes 30, zapíše se 14"), a souběh (dva lidé najednou) hlídá `update_time`
dealu.
- **+** nejjednodušší (nic navíc), obchodník nic neblokuje.
- **−** ping-pong se nepozná: varování „přepíše" vypadá stejně u opravy
  vlastní hodnoty i u přepsání cizí zakázky. Chyba v datech se tiše šíří
  do CRM.
- Náročnost: **0** (je v #115).

### B — Vlastník dealu podle čísla nabídky v dealu *(doporučeno)*
Zápis už dnes posílá pole **„Číslo nabídky (CN)"**. Před zápisem server
dealu přečte (čte ho stejně kvůli „stará → nová"):
- pole CN v dealu je **prázdné** nebo **shodné** s číslem zakázky (bez
  přípony varianty) → zápis projde;
- je tam **jiné číslo** → zápis se zastaví s hláškou „Deal patří nabídce
  2026 - OPR - CN - 0123 (zapsáno 20. 10.). Převzít deal pro tuto nabídku?"
  — převzetí je vědomé tlačítko s potvrzením a zapíše se do protokolu
  zakázky.
- **+** ping-pong i překlep se zastaví hned u druhého zápisu; žádná nová
  data — vlastníka nese pole, které v CRM stejně je a které vidí i lidé
  v Pipedrive; funguje i proti zakázkám z jiného prostředí (testovací web).
- **−** kdo v Pipedrive CN ručně přepíše, změní vlastníka; prázdné CN se
  bere jako volné.
- Náročnost: **S** (jedno porovnání před PATCH + potvrzovací dialog + test
  a mutace).

### C — Jedna zakázka = jeden deal (hlídá databáze kalkulátoru)
Server při uložení zakázky odmítne `pdDealId`, které už má jiná zakázka
v databázi (jako dnes duplicitní číslo nabídky); převést vazbu smí jen
administrátor.
- **+** chyba se pozná už při zadání čísla dealu, ne až při zápisu.
- **−** potřebuje nový rejstřík deal → zakázka (dnes ho rejstřík nenese)
  a jeho údržbu při mazání, obnově ze zálohy a importu; nevidí zakázky
  z jiného prostředí ani ruční změny v CRM.
- Náročnost: **M**.

### D — Slučovat: každá zakázka píše jen „svá" pole
Pole OCK zapisuje zakázka OCK, pole PROJ zakázka PROJ, hodnota dealu
součet obou.
- **+** jeden deal pro realizaci i projekci.
- **−** jde proti rozhodnutí P6 (OCK a PROJ zvlášť pod vlastním číslem);
  společná pole (splatnost, DPH, číslo nabídky, hodnota) by stejně
  kolidovala; součet hodnoty z dvou zakázek je nové pravidlo pro
  controlling.
- Náročnost: **L**. Nedoporučuji.

## Doporučení

**B**, volitelně doplněné o **C jen jako varování** (ne blokace) při zadání
čísla dealu, pokud ho v databázi už má jiná zakázka — to lze přidat
později, až bude rejstřík nést `pdDealId`.

Dopad B: zápis (#115) přečte deal před PATCH (už plánované kvůli
„stará → nová" a `update_time`), porovná CN; převzetí dealu je zvláštní
akce s potvrzením a záznamem v protokolu. Náhled (#536) může totéž
ukázat dopředu jako kolizi „deal patří jiné nabídce".

## Otázky pro J. V. (s navrženými odpověďmi)

Odpovězte jen tam, kde se chcete odchýlit.

1. **Jak řešit dvě zakázky na jednom dealu?**
   a) A — poslední zápis vyhrává, jen varování;
   **b) B — vlastník podle „Čísla nabídky (CN)" v dealu, převzetí vědomým
   tlačítkem** *(navrženo)*;
   c) C — blokovat už při zadání čísla dealu v kalkulátoru;
   d) D — slučovat pole OCK a PROJ.
2. **Kdo smí deal převzít pro jinou nabídku?**
   **a) obchodník sám, s potvrzením a záznamem v protokolu** *(navrženo)*;
   b) jen vedoucí a administrátor;
   c) jen administrátor.
3. **Je prázdné „Číslo nabídky (CN)" v dealu volné pro zápis?**
   **a) ano — deal bez čísla ještě nikomu nepatří** *(navrženo)*;
   b) ne — u dealu bez čísla se taky zeptat.
4. **Má se při převzetí v Pipedrive zapsat poznámka** („Deal převzat
   nabídkou X, dříve Y")?
   **a) ano, poznámka k dealu** *(navrženo; poznámky jsou v API v1, 1 token)*;
   b) ne, stačí protokol v kalkulátoru.
5. **Varování už při zadání čísla dealu** (C jako varování), když ho má jiná
   zakázka v databázi?
   a) ano, hned teď (vyžaduje rejstřík deal → zakázka, náročnost M);
   **b) později, po zprovoznění zápisu** *(navrženo)*;
   c) ne.

## Rozhodnuto 27. 10. 2026 (dialog J. V.)

1. Vlastník dealu: podle „Čísla nabídky (CN)“ v dealu — jiné číslo zastaví zápis, převzetí jen vědomým tlačítkem.
2. Převzít smí obchodník, s potvrzením a záznamem v protokolu.
3. Prázdné CN v dealu = volný deal, zapíše se bez ptaní.
4. Při převzetí se zapíše poznámka k dealu v Pipedrive (kdo, kdy, z jaké zakázky) i protokol v kalkulátoru.
5. Varování už při zadání čísla dealu, které má jiná zakázka: až po zprovoznění skutečného zápisu (token).
