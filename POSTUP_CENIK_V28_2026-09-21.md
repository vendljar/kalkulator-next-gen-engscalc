# Postup: zveřejnit ceník verze 28 (oprava ČR sloupce)

**Pro administrátora. Zpracováno 21. 9. 2026 k nálezům N1, N20 a N6.**
**Ceník tímto postupem NEZVEŘEJŇUJEME my — dělá to administrátor sám.**

> Konkrétní sazby, položky a jejich hodnoty jsou ve vyhodnocovacím sešitu na
> Drive (složka `Testovani`, list „Ceník v26→v27"). Do repozitáře ani do
> tohoto souboru nepatří — proto se tu mluví o položkách obecně.

---

## Co se stalo

V ostré databázi je jako platný zveřejněný **ceník OCK verze 27**
(17. 9. 2026, poznámka „17-8-1", otisk `758b08df`). Jeho **ČR sloupec nese
u čtrnácti položek hodnoty zahraniční řady**.

Není to překlep. Vzniklo to cestou, kterou aplikace sama nabízela:

1. varianta se přepnula na řadu **Zahraničí**,
2. přepnutí vtiskne zahraniční ceny **přímo do ceníku varianty** (tak to má
   být — varianta má jen jednu řadu a počítá se z ní),
3. nad toutéž variantou někdo klikl na **„Zveřejnit ceník této varianty jako
   platný"** a podklad se vzal z jejího ceníku.

Verze 27 to na sobě nese: `cenik.rada = "zahr"`, značky `jenZahr` a šestnáct
ze sedmnácti zahraničních hodnot v ČR sloupci.

**Správné ČR hodnoty jsou ve verzi 26** (14. 9. 2026, otisk `90b47f02`).

## Co je od 21. 9. 2026 opravené v aplikaci

Než začnete, nasaďte dávku **v21.9.2** — jinak se stejná chyba může opakovat.

| Opraveno | Jak se to projeví |
|---|---|
| Zveřejnění z varianty přepnuté na **Zahraničí** je **zakázané** | Aplikace zveřejnění zastaví a napíše proč. Hlídá to i server, takže to nejde obejít. |
| **Pojistka na shodu** | Když se ČR cena shoduje se zahraniční u více než **5 položek**, zveřejnění se zastaví a položky se vypíšou. |
| Dialog zveřejnění | Ukáže **řadu varianty** a rozdíly **zvlášť pro ČR a zvlášť pro ZAHR**. Dřív to bylo jedno číslo, ve kterém tahle chyba nebyla vidět. |
| Klíče `rada` a `jenZahr` | Do zveřejněného ceníku se už nezapisují vůbec. |
| Historie verzí | Každá nová verze nese **počty změn** proti předchozí, zvlášť ČR a zvlášť ZAHR. |
| Falešné varování o ručním zásahu | Zmizelo. Vzorec otisku se dvakrát změnil (#181, #267), takže varování svítilo u **všech 27 verzí** a nedalo se brát vážně. Nově si každá verze pamatuje, kterým vzorcem byla orazítkovaná, a porovnává se jen se shodným. |

## Cíl

**Verze 28** = ČR ceník z **v26** + zahraniční řada z **v27**.

Konkrétně: `cenik`, `cenikProj`, `katalog` a `slevy` z v26; `zahranicni`
z v27.

## Postup

### 1. Nejdřív na testovacím webu

Ceník se mezi weby přenáší souborem (Nastavení → Databáze → přenos ceníku).
Nacvičte si to tam, kde chyba nikomu neublíží.

### 2. Připravit podklad z verze 26

1. **Nastavení → Databáze → Verze ceníku programu**
2. U **verze 26** rozbalit **Rozdíly** a dát **„Převzít tento ceník do
   aktivní varianty"**.
3. **Ověřit, že varianta je na řadě ČR.** Přepínač řady je vpravo v hlavičce
   kalkulace. Pokud je na Zahraničí, přepněte na ČR — jinak vás aplikace
   stejně zastaví (a bude mít pravdu).

### 3. Zkontrolovat zahraniční řadu

Zahraniční odchylky **nejsou** součástí ceníku varianty — jsou to samostatná
tabulka, kterou spravujete v **Nastavení → Ceník**, sloupec Zahraničí.
Převzetím v26 se **nezmění**, takže by tam měly zůstat ty z v27. Projděte je
a ověřte, že odpovídají tomu, co má do zahraničí platit.

### 4. Zveřejnit

1. **„Zveřejnit ceník této varianty jako platný"**
2. V dialogu **si přečtěte rozpis**: řada varianty musí být **ČR**, počet
   změn v tuzemské řadě musí zhruba odpovídat čtrnácti opravovaným položkám
   a v zahraničních odchylkách by nemělo být nic nebo jen to, co jste sami
   změnili.
3. Do zdůvodnění napsat něco, co dává smysl i za rok — například:
   *„v28: oprava ČR sloupce, do kterého se ve v27 dostaly zahraniční ceny
   (nález N1); ČR hodnoty převzaty z v26, zahraniční řada ponechána."*
   Poznámka typu „17-8-1" je přesně to, co u v27 znemožnilo zpětně pochopit,
   co se stalo.
4. Potvrdit.

### 5. Ověřit po zveřejnění

- V historii verzí u **v28** zkontrolovat řádek **„Proti verzi 27: N změn
  v tuzemské řadě, M v zahraničních odchylkách."**
- Založit **novou ČR zakázku** a ověřit, že se položka **Překlady CZ→DE**
  (a další se značkou „jen zahraniční") **v kalkulaci neobjeví**.
- Založit **zahraniční zakázku** a ověřit, že se počítá ze zahraniční řady.

## Co tenhle postup neřeší

**Zakázky spočítané z vadné verze 27 se samy nepřepočítají.** Rozpracovaná
varianta se při otevření nabídne přepočítat; **uzamčené (odeslané) nabídky
zůstanou, jak jsou** — a to je správně, protože to je doklad o tom, co
zákazník dostal.

Projděte prosím nabídky vystavené mezi **17. a 21. 9. 2026** a u těch, které
ještě neodešly, ověřte cenu. Kterých se to týká, se pozná podle razítka
verze ceníku u varianty.

**Zbývá rozhodnout (nález N6):** položka „Překlady CZ→DE" má příznak „jen
zahraniční", ale ve verzi 27 má vyplněnou i ČR hodnotu. Oprava, aby se
příznak respektoval úplně všude (i při přepočtu na dnešní ceník a při
převzetí ceníku z historie), je vedená jako **P4** a v téhle dávce není.
