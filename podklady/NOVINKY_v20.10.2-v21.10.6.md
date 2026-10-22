# Co je nového v Kalkulátoru — verze v20.10.2 až v21.10.6 (20.–21. 10. 2026)

Soupis pro obchodníky: co se změnilo v práci s kalkulačkou, nabídkami, smlouvami o dílo (SoD)
a nově s controllingem. Technické opravy, které práci nemění, jsou shrnuté jen na konci.

---

## 1. Smlouva o dílo a objednané příplatky (nové)

- **Krycí list OCK → Smlouva o dílo → „Objednané příplatky“.** Když zákazník k odeslané nabídce
  objedná některé příplatky (např. střechu v mědi, nátěr v jiném odstínu), zaškrtnete je tady
  a vyplníte datum prodeje (výchozí je datum podpisu smlouvy, jinak dnešek). Odeslaná nabídka
  se tím **nemění** — záznam je vedle ní.
- Nabízí se jen příplatky, které v zamčené (odeslané) variantě opravdu byly.
- **Smlouva o dílo realizace** pak počítá cenu díla jako *cena nabídky po slevě + objednané
  příplatky* (příplatky bez slevy, v ceně z nabídky), DPH z celkové částky. Nová šablona smlouvy
  (verze 4, CZ/EN/DE/FR) má pod celkovou cenou rozpis: cena dle nabídky, seznam objednaných
  příplatků a jejich součet. Bez objednaných příplatků vypadá smlouva jako dřív.
- V krycím listu je nové pole **„Objednané příplatky“** vedle „Příplatky v nabídce“.
- **Kdo smí měnit:** obchodník, který zakázku založil, vedoucí a administrátor. Po podpisu
  smlouvy (vyplněné datum podpisu v krycím listu) už jen administrátor.
- Opraveno hned v další verzi: šlo-li o **vlastní příplatek** (doplněný ručně), uložení zakázky
  selhalo, přestože se smlouva vytiskla. Teď se uloží. Název příplatku je ve smlouvě na jednom řádku.

## 2. Odeslaná nabídka zůstává taková, jaká odešla

- Při prvním zamčení varianty (odeslání nabídky) se do ní uloží znění **platebního kalendáře,
  vět smlouvy o dílo, textů nabídky PROJ** a nově i **kapitol IV.–VI. a doložek nabídky OCK**.
  Dotisk odeslané nabídky po pozdější změně firemních textů v Nastavení ukáže stále původní znění.
- Nabídky zamčené dřív (před touto úpravou) se tisknou s aktuálními texty jako doposud.

## 3. Nabídka a kalkulace PROJ

- **Akce mimo Prahu:** nový přepínač v Kalkulaci PROJ. Cena jednoho výjezdu technika je v ceníku
  PROJ a u zakázky ji lze přepsat (prázdné = ceník, 0 = neúčtovat). Výjezd se připočte k zaměření,
  DPZ, kolaudaci a studii; nabídka to vysvětlí větou o cestovních nákladech. V Praze se nic nemění.
  Přepsat cenu výjezdu smí jen role, která vidí náklady; obchodník vidí účinnou cenu a přepínač
  „Akce mimo Prahu“ ovládá dál.
- **Úvod „Naše NABÍDKA a doporučení“** si obchodník upraví u varianty, tlačítkem ↺ vrátí výchozí.
  Když se po úpravě změní nabízené činnosti, kalkulačka upozorní, že úvod nesedí.
- **Jednostupňová dokumentace:** nové zaškrtávátko; kalkulačka připomene, že nabídku je třeba
  ve Wordu doupravit ručně.
- **Nabídka bez studie proveditelnosti** už na studii neodkazuje: úvod DPZ, hvězdička u ceny DPZ,
  titul a bloky studie se přizpůsobí. Termín hrubopisu DPZ bez studie zní „do 12 týdnů od
  zpracování výstupů ze zaměření“.
- **Nová šablona nabídky PROJ ve Wordu (v8)** s cestovným a výše uvedenými změnami; nadpis
  „CENA ZA … (DPZ)*“ se v anglické, německé a francouzské verzi už přeloží.

## 4. Kalkulace OCK

- **Příplatek za střechu v mědi** se nabízí jen tehdy, když je v nabídce zastřešení šachty.
  Při ručně přepsané ploše zastřešení se měď počítá z přepsané plochy.
- **Boční světlík:** popisky teď říkají, že jde o šířku skla přes sloupky (výpočet beze změny).
- **Cenová výjimka:** plocha pásu a světlíku „jiné“ se pro schválení zaokrouhluje na 0,1 m²
  nahoru (dřív na celé m²). Karta výjimky ukazuje plochu ve tvaru schválení. Výjimky schválené
  dřív platí dál, dokud se zadání nezmění.

## 5. Smlouva o dílo — DPH a firemní podmínky

- **Výchozí režim DPH ve smlouvě o dílo realizace pro zákazníka v ČR je přenesená daňová
  povinnost** (i když zákazník nemá DIČ). Obchodník ho může u zakázky změnit; ↺ vrátí výchozí.
- **Nastavení → Smlouvy / Šablony:** tlačítko „Zapsat výchozí hodnoty“ platební podmínky rovnou
  zveřejní (jen administrátor). Na záložce svítí „Neuloženo online“, dokud změny nejsou
  zveřejněné. Řádky podmínek jsou zarovnané.
- **Jazykové verze šablon:** když administrátor nahraje stejnou (už platnou) češtinu a k ní
  anglickou, německou a francouzskou verzi, průvodce zveřejní jen jazykové verze. Dřív skončil
  hláškou, že není co zveřejňovat.

## 6. Controlling (nové, jen administrátor)

- **Nastavení → Controlling:** nákladové skupiny (kapitoly), přiřazení položek ceníku ke skupinám
  a export předkalkulace pro controlling. Při zveřejnění ceníku kalkulačka upozorní na položky,
  které ještě nejsou zařazené.
- **Export pro controlling** jde stáhnout pro jednu odeslanou variantu (i tlačítkem v Přehledu
  cenových nabídek) a hromadně za období (podle dne odeslání nebo podle data prodeje objednaných
  příplatků; OCK, PROJ nebo obojí; ČR, zahraničí nebo obojí).
- **Export verze 2:** list *Řádky* obsahuje jen náklady v ceně nabídky. Příplatky nabídnuté
  jako volba jsou na samostatném listu *Příplatky – volby*. Objednané příplatky jsou v Řádcích
  označené „Objednáno dodatečně“. Sloupce ukazují, zda jde o řídící variantu a zda jde o výsledek
  zmrazený při odeslání, nebo přepočtený.
- Číslo obchodního případu z Pipedrive zapisuje u zakázky jen administrátor.
- **Pro obchodníky se nic nemění** — export ani nastavení controllingu nevidí. Důležité je jen
  správně zaznamenat objednané příplatky (bod 1), protože z nich controlling počítá prodej.

## 7. Zálohy a bezpečnost (stručně)

- Když noční záloha zaznamená velký úbytek dat, starší zálohy se nemažou, dokud úbytek
  nepotvrdí správce. Ruční zálohy mají omezený počet, aby nevytlačily noční.
- Řada drobných oprav z bezpečnostních auditů (kontroly vstupů na serveru, ochrana exportů do CSV
  a Excelu). Na běžnou práci nemají vliv.

---

*Zdroj: CHANGELOG.md, oddíly v20.10.2 až v21.10.6. Podrobnosti ke každé změně jsou v příručce
(„Co je nového“). Soupis neobsahuje ceny ani osobní údaje.*
