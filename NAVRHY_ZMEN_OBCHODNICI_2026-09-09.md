# Návrhy změn obchodníci – 9. 9. 2026

Stav řešení úkolů ze schůzky. Aktualizováno 10. 9. 2026, verze aplikace 9.9.7.

Legenda stavu: HOTOVO = nasazeno a ověřené testy · ZJIŠTĚNO = odpověď níž, čeká
na rozhodnutí · ČEKÁ = zadané, ještě neřešené.

---

## 1. Překlady CZ→DE se nabízely i u českých zakázek — HOTOVO

**Co bylo špatně.** V nové zakázce OCK pro ČR se v sekci REŽIE ukazoval řádek
PŘEKLADY CZ→DE, přestože patří jen k zahraničním zakázkám.

**Proč se to dělo.** O tom, že položka do české nabídky nepatří, rozhodovalo
zaškrtávátko „jen zahr." v ceníku. Dokud ho někdo nezaškrtl (nebo se ztratilo
při zveřejnění ceníku či obnově ze zálohy), řádek se v české nabídce objevil.
Poznámka v ceníku přitom tvrdila opak — dvě různá místa, dvě různé pravdy.

**Co se změnilo.** Překlady jsou nově vedené jako položka, která v tuzemské
zakázce neexistuje, a to napevno. V české nabídce se nezobrazí za žádných
okolností, v zahraniční zůstávají beze změny. Zaškrtávátko v ceníku funguje
dál a umí skrýt i další položku, ale tuhle sadu už nejde omylem zrušit.

**Co to znamená pro vás.** Nic nemusíte přenastavovat. Cestovní náklady se
nemění — po ČR se jezdí taky, jen mají do zahraničí jinou sazbu. V ceníku je
u překladů zaškrtávátko „jen zahr." nově zaškrtnuté a zamčené, aby bylo
vidět, že o téhle položce se už nerozhoduje ručně.

---

## 2. Co všechno se počítá při zaškrtnutí „Průchozí šachta" — ZJIŠTĚNO

Ověřeno měřením na výpočtu (dva průchody, se zaškrtnutím a bez něj).

**Přímý dopad — jediný řádek.** Do sekce OPLÁŠTĚNÍ přibude položka
STŘÍŠKA NAD VSTUPEM NA DVŮR (PRŮCHOZÍ EXT), množství 1 × ceníková sazba.
Nic jiného se do kalkulace nepřidává.

**Jen u exteriérové šachty.** U interiérové zaškrtnutí s cenou neudělá vůbec
nic — ověřeno, rozdíl je 0 Kč.

**Nepřímý dopad — proto vychází víc, než je cena stříšky.** Řádek vstupuje do
základu, ze kterého se počítá:

- REZERVA (u vás 10 % základu) — rezerva se zvedne o 10 % ceny stříšky,
- PŘIRÁŽKA (globální, u vás 30 %) — počítá se z nákladu včetně té rezervy,
- zaokrouhlení celkové ceny nahoru na tisíce.

Vzorec: dopad na cenu = cena stříšky × (1 + rezerva %) × (1 + přirážka %),
pak zaokrouhlení nahoru na tisíce.

Příklad na zkušebních číslech (stříška 10 000 Kč, rezerva 10 %, přirážka 30 %):
náklad +11 000 Kč, přirážka +3 300 Kč, cena +14 300 Kč, po zaokrouhlení
+15 000 Kč. V režimu Model 2 je efekt o něco vyšší (přirážka +3 390 Kč),
protože se tam rezerva počítá z ceny včetně přirážky.

**Co se naopak NEmění.** Přirážka za ATYP se nezvedne — ta se počítá jen
z nákladu sekce Režie, kam stříška nepatří.

**Vedle ceny.** Zaškrtnutí předvyplní dvě pole technické specifikace:
PRŮCHOZÍ KABINA na „průchozí kabina" a PROSKLENÁ STŘÍŠKA na „nad výstupem
na dvůr". Na cenu to nemá vliv.

**Vyřešeno** živým popiskem pod položkou — viz bod 6. Od verze 9.9.5 se navíc
stříška zadává počtem kusů a na průchozí šachtě už nezávisí (bod 15), zato
průchozí šachta nově řídí počet nástupišť A / C a počet pater (bod 14).

---

## 3. Zasklení mezi příčníky = +4 hodiny projekce — HOTOVO

Při volbě „mezi příčníky (lišty)" se k projekci přičtou 4 hodiny navíc —
sklo do rámečku znamená navrhnout a zakreslit lišty.

**Jak to poznáte.** Řádek DÍLENSKÁ DOKUMENTACE ukáže vyšší počet hodin než
máte v poli „Projekce – základ" a v poznámce bude uvedeno
„+ 4 hod za zasklení mezi příčníky (lišty)".

**Vaše pole zůstává vaše.** Hodiny se přičítají ve výpočtu, do pole
„Projekce – základ" se nezapisují. Po přepnutí zpět na terče je řádek zase
původní, nic za sebou nezůstane.

**Sazba je v ceníku.** Položka „Projekce navíc – zasklení mezi příčníky"
v sekci REŽIE. Dokud v ní nic nevyplníte, počítá se se čtyřmi hodinami —
stejně tak u starších zakázek, které tuhle položku v ceníku ještě nemají.
Změna hodnoty je běžná úprava ceníku, nová verze aplikace na ni není potřeba.

---

## 4. Klikací šipky u číselných polí — HOTOVO

Šipky u všech číselných polí jsou pryč. Ubíraly šířku pole a daly se trefit
omylem při rolování. Zadávání z klávesnice je beze změny; kdo je zvyklý
používat klávesy šipka nahoru/dolů přímo v poli, funguje mu to dál.

---

## 5. Nová nabídka začíná s nulovými rozměry — HOTOVO

Nová cenová nabídka měla dosud v zadání šachty předvyplněné rozměry vzorové
stavby (přejezd 2,7 m, zdvih 17,325 m a další). Vypadaly jako vyplněné, takže
se daly přehlédnout a v nabídce zůstala cizí šachta.

Nově je **horní přejezd, zdvih, prohlubeň, vnitřní šířka a vnitřní hloubka
na nule** — nula je vidět a musí se přepsat. Ostatní pole zůstávají
předvyplněná: svislá rozteč příčníků, počet rohových sloupků i počet
nástupišť jsou konstrukční předvolby, ne rozměry konkrétní stavby.

Týká se to jen **nově zakládané** nabídky. Klon varianty i načtená zakázka si
svoje rozměry nesou dál.

---

## 6. Popisek u „Průchozí šachta" — HOTOVO

Pod zaškrtávátkem je nově živý popisek. Než zaškrtnete, řekne, co zaškrtnutí
udělá; po zaškrtnutí potvrdí, co se přidalo:

> **Přidáno do opláštění:** 1 ks stříška nad vstupem na dvůr.

U **interiérové** šachty popisek upozorní, že se stříška nepřidává — položka
existuje jen pro exteriérovou. Dřív šlo zaškrtnutí u interiérové šachty
provést a v ceně se neprojevilo nic, aniž by o tom aplikace řekla slovo.

---

## 7. Nová verze aplikace během práce nabídku neztratí — HOTOVO

Když se během vaší práce nasadí nová verze aplikace, položí se přes obrazovku
výzva k obnovení stránky. Nově se **rozpracovaná nabídka nejdřív sama uloží**
do online databáze a teprve pak jde stránku obnovit. Tlačítko *Obnovit
stránku* je do dokončení uložení zhasnuté, aby obnovení nepřišlo doprostřed
zápisu.

Výzva vždy řekne, jak to dopadlo:

- „Rozpracovaná nabídka je uložená v online databázi." — můžete obnovit,
- „Rozpracované změny nemáte." — nebylo co ukládat,
- „Uložit teď nejde (důvod)." — například nejste přihlášeni nebo je zakázka
  jen ke čtení; změny pak drží záloha v prohlížeči a aplikace je po obnovení
  sama nabídne.

---

## 8. Výchozí profily podle typu šachty — HOTOVO

Po přepnutí typu šachty se dosadí dimenze profilů odpovídající tomu typu.
Interiérová šachta nenese vítr ani sníh, takže vystačí se subtilnějšími profily:

| Profil | Exteriérová | Interiérová |
|---|---|---|
| Sloupek | 80x80 / 4 | 80x40 / 4 |
| Příčníky bok a zadek | 80x80 / 3 | 80x40 / 3 |
| Sloupek portálu | 40x40 / 3 | 40x40 / 3 |
| Příčníky portálu | 80x40 / 3 | 80x40 / 3 |
| Spojka sloupků | 70x70 / 3 | 70x30 / 3 |

Přepnutí typu **přepíše i dimenze, které jste si upravil**, a napíše to
v liště. Po přepnutí si je tedy zkontrolujte.

**Lemování ext. šachty** se u interiérové šachty ukazuje jako pomlčka —
do ceny nevstupuje, protože položka „Profily – lemování šachty" je jen pro
exteriérovou.

---

## 9. Zasklení podle typu šachty — HOTOVO

Nově se materiál skla řídí typem šachty a způsobem zasklení:

| Šachta a zasklení | Boky a zadní stěna | Čelní stěna |
|---|---|---|
| Exteriérová | dvojsklo (dle ceníku) | VSG 4.4.1 |
| Interiérová, na terče | VSG 4.4.2 | VSG 4.4.2 |
| Interiérová, mezi příčníky | VSG 4.4.1 | VSG 4.4.1 |

Interiérová šachta stojí uvnitř budovy a dvojsklo kvůli tepelné izolaci
nepotřebuje, proto jsou obě plochy z téhož VSG.

**V ceníku přibyla položka „Sklo VSG 4.4.2"** (sekce OPLÁŠTĚNÍ) a stávající
„Sklo čelní stěna" se jmenuje „Sklo VSG 4.4.1". Dokud sazbu pro 4.4.2
nevyplníte, počítá se cenou 4.4.1 — nabídka nespadne na nulu, ale je to
potřeba doplnit.

V kalkulaci se řádek jmenuje **MATERIÁL VSG 4.4.1** nebo **MATERIÁL VSG 4.4.2**,
slova „čelní stěna" v názvu už nejsou.

> **Pozor u rozpracovaných zakázek.** Interiérové nabídky se přepočítají —
> mění se materiál i sazba. U nabídek, kde jste sklo ručně vyřadil z výpočtu
> nebo přepsal množství, se nastavení automaticky převede na nové názvy, ale
> vyplatí se to zkontrolovat.

---

## 10. Přirážka za ATYP zmizela ze zadání šachty — HOTOVO

Pole „Přirážka za ATYP" i dlouhé vysvětlení pod ním je z karty Zadání šachty
pryč. Sazba zůstává v **ceníku** (sekce ATYP), kde se jí dá měnit stejně jako
dosud — pořád platí jen pro tu jednu nabídku a starší nabídky nepřepočítává.
Zaškrtávátko ATYP zůstává v zadání.

---

## 11. Otevřená karta zůstane otevřená — HOTOVO

Karta „Dimenze profilů" se po každé změně sama zavírala, takže při úpravě
šesti profilů se zavřela šestkrát. Nově zůstane otevřená, dokud ji sami
nezavřete. Platí pro všechny karty; po obnovení stránky se aplikace vrátí
do výchozího uspořádání.

---

## 12. Přechodové plechy v nabídce jako jedna položka — HOTOVO

V cenové nabídce pro zákazníka se materiál a montáž přechodových plechů
slučují do jedné položky **„Přechodové plechy"** se součtem obou cen.
V kalkulaci zůstávají obě položky zvlášť — potřebujete je vidět a vyřadit
nezávisle. Když je v nabídce jen jedna z nich, ukáže se sama a beze změny.

---

## 13. Hlavička zadání šachty ve čtyřech sloupcích — HOTOVO

Zadání šachty se přeskládalo do čtyř sloupců, takže se celá hlavička vejde
na obrazovku bez rolování. Pod hlavičkou zmizel dlouhý vysvětlující text.
Na užších monitorech se sloupce samy sloučí na dva, na tabletu na jeden.
Žádná položka se neztratila, jen se přesunula.

---

## 14. Počet nástupišť A / C a počet pater u průchozí šachty — HOTOVO

Když zaškrtnete **Průchozí šachta**, objeví se dvě nová pole:

- **Počet nástupišť A / C** — A je čelní stěna, C zadní stěna. Celkový počet
  nástupišť se z nich sečte sám a pole „Počet nástupišť" už nejde přepsat
  ručně, jen ukazuje součet.
- **Počet pater** — zadáte ho ručně. Slouží k výpočtu výšky podlaží, kterou
  u průchozí šachty nelze z počtu nástupišť odvodit.

**Na co si dát pozor.** U rozpracované nabídky, kde průchozí šachtu teprve
zaškrtnete, spadne celkový počet nástupišť na nulu, dokud A a C nevyplníte.
Je to záměr, ne chyba — aplikace nemá jak uhodnout, jak se nástupiště dělí
mezi obě stěny. Dokud je počet pater menší než 2, aplikace na to upozorní
a výšku podlaží nepočítá.

Počet nástupišť A / C se propisuje i do technické specifikace, hned pod
řádek „Počet stanic / nástupišť". U neprůchozí šachty tam zůstane pomlčka.

---

## 15. Stříška se zadává počtem kusů — HOTOVO

Zaškrtávátko u stříšky nahradilo číselné pole **Stříška nad nástupiště**
s výchozí hodnotou 0. Zadáte-li číslo, výpočet se spustí sám a cena i náklad
se násobí počtem kusů. Stříška už není vázaná na exteriérovou průchozí
šachtu — může být u jakéhokoli typu a na kterékoli straně.

V technické specifikaci se podle počtu doplní „nad nástupištěm", případně
„3× nad nástupišti".

---

## 16. Výchozí hodnoty v nové nabídce — HOTOVO

- **Počet nástupišť**: 5 ks.
- **Přechodové plechy** a **Světlík nad šachetními dveřmi**: odškrtnuto.
- U počtu nástupišť a počtu sloupků se nově ukazuje jednotka **ks**.

---

## 17. Popisné texty ze zadání šachty jsou v detailu výpočtu — HOTOVO

Vysvětlivky pod poli (u stříšky a u dopočítaného počtu nástupišť) zabíraly
v hlavičce celý řádek. Zmizely a jejich obsah je v záložce **Detail výpočtu**,
v kroku 1 „Vstupní zadání (šachta)". Přibyly tam řádky Průchozí šachta,
nástupiště A, nástupiště C, počet pater a Stříška nad nástupiště, každý
s vysvětlením ve sloupci vpravo.

V zadání zůstalo vysvětlení jako **bublina po najetí myší** na pole. Varování
u počtu pater zůstalo beze změny — není to popiska, ale upozornění, že bez
aspoň dvou pater vyjdou rozměry nulové.

---

## 18. Nula v poli se nemusí mazat — HOTOVO

Klikněte do pole, ve kterém je nula, a nula se celá označí. První číslice,
kterou napíšete, ji přepíše. Konec „025" místo „25".

Označuje se **jen nula**. Ve vyplněném poli kliknutím dál nastavíte kurzor
a opravíte jednu číslici, jak jste zvyklí.

---

## 19. Každý řádek detailu výpočtu říká, odkud se bere — HOTOVO

Podnětem byl dotaz, odkud se bere 15 kusů oplechování dveří, když se takový
počet nikde nezadává. Odpověď je 3 kusy na nástupiště, jenže ve sloupci
vzorců stála prázdná buňka.

Nově má **vysvětlení každý řádek** v Detailu výpočtu OCK i PROJ. U vstupních
údajů je uvedeno, že jsou ze zadání a co ovlivňují. U odvozených čísel je
vzorec. U zkratek, které nesou název řádku (spoje typu `zadniRoh`), je navíc
česky, co znamenají a kolik kilogramů připadá na jeden spoj.

Sloupec se zapíná zaškrtávátkem **„zobrazit vzorce a poznámky"** nahoře
v Detailu výpočtu. Zapnutý je od začátku, tisk do PDF ho respektuje.

---

## Přehled

| # | Bod | Stav |
|---|---|---|
| 1 | Překlady CZ→DE jen u zahraničních zakázek | HOTOVO (v9.9.2) |
| 2 | Rozbor výpočtu u „Průchozí šachta" | ZJIŠTĚNO — zobrazení vyřešeno bodem 6 |
| 3 | Zasklení mezi příčníky: +4 h projekce | HOTOVO (v9.9.2) |
| 4 | Odstranění klikacích šipek u číselných polí | HOTOVO (v9.9.2) |
| 5 | Nulové rozměry v nové nabídce | HOTOVO (v9.9.3) |
| 6 | Živý popisek u „Průchozí šachta" | HOTOVO (v9.9.3) |
| 7 | Uložení nabídky před vynuceným obnovením | HOTOVO (v9.9.3) |
| 8 | Výchozí profily podle typu šachty, lemování u interiérové | HOTOVO (v9.9.4) |
| 9 | Zasklení podle typu šachty, nová položka VSG 4.4.2 | HOTOVO (v9.9.4) |
| 10 | Přirážka za ATYP jen v ceníku | HOTOVO (v9.9.4) |
| 11 | Otevřená karta zůstane otevřená | HOTOVO (v9.9.4) |
| 12 | Přechodové plechy v nabídce jako jedna položka | HOTOVO (v9.9.4) |
| 13 | Přeskládání hlavičky do čtyř sloupců | HOTOVO (v9.9.5) |
| 14 | Počet nástupišť A / C a počet pater u průchozí šachty | HOTOVO (v9.9.5) |
| 15 | Stříška se zadává počtem kusů | HOTOVO (v9.9.5) |
| 16 | Výchozí hodnoty v nové nabídce (5 ks, odškrtnuto, jednotky) | HOTOVO (v9.9.5) |
| 17 | Popisné texty ze zadání šachty do detailu výpočtu | HOTOVO (v9.9.6) |
| 18 | Nula v poli se nemusí mazat | HOTOVO (v9.9.6) |
| 19 | Vysvětlení u každého řádku detailu výpočtu OCK i PROJ | HOTOVO (v9.9.7) |

Změny se projeví po obnovení stránky (aplikace si o ně sama řekne — a od
verze 9.9.3 si před tím rozpracovanou nabídku uloží).
