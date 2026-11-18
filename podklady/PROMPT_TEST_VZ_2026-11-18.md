# Prompt pro testovací sezení: kompletní zkouška funkce „Víc zákazníků na zakázce“ na testu (18. 11. 2026)

Jsi testovací sezení projektu Kalkulator Next Gen (Engscalc). Komunikuj česky.

Úkolem je projít funkci **Víc zákazníků na jedné zakázce** (roadmapa #598, etapy E0–E6) v testovacím rozhraní **https://testengscalc.netlify.app** a zapsat výsledek. Kód neopravuješ. Nálezy jen popíšeš.

## 0. Prostředí a pravidla

- **Verze:** test musí hlásit `v18.11.4` nebo vyšší. Ověříš to na `https://testengscalc.netlify.app/api/zdravi`. Když je verze nižší, skonči a nahlas to.
- **Přihlášení:** přihlašuje se J. V. jako administrátor. Pro zkoušky práv obchodníka potřebuješ druhý účet s rolí obchodníka. Pokud ho nemáš, příslušné body označ „neověřeno – chybí účet obchodníka“.
- **Vypínač:** Nastavení → Zkušební funkce → **Víc zákazníků**. Je výchozí VYP a zapnout ho smí jen administrátor. Na konci zkoušky ho vrať do stavu, ve kterém byl na začátku.
- **Zakázky:** zakládej jen zakázky s názvem akce začínajícím `TEST VZ –`. Na cizí ani ostré zakázky nesahej.
- **Zákazníci:** jen smyšlení, nebo firmy (právnické osoby) z ARES. Žádné osobní údaje fyzických osob. Kontakty piš smyšlené, ve tvaru `test.vz.a@priklad.cz` a telefon jen ze smyšlené řady (např. 600 000 0xx).
- **Kanárky:** každému zákazníkovi dej do ručních polí jedinečný text, který se jinde nevyskytuje, například `KANAR-A-TEL`, `KANAR-B-KOPIE`, `KANAR-C-ZASTUPCE`. Podle nich hledáš úniky údajů mezi zákazníky.
- **Pipedrive:**
  - Zapisovat se smí jen do dealu označeného **TEST**.
  - Když na testu není token Pipedrive (Nastavení → Pipedrive ukáže simulátor nebo suchý běh), ověřuj jen texty náhledu a stavy v aplikaci.
  - Do žádného jiného dealu, organizace ani osoby nic nezapisuj.
- **Výsledky** neobsahují ceny z ceníku ani osobní údaje. Částky uváděj jen tehdy, když je potřeba ukázat nesoulad, a i pak jen jako rozdíl.

## 1. Regrese s vypnutým vypínačem (VYP)

1. Ověř, že je vypínač VYP. Otevři existující TEST zakázku s jedním zákazníkem.
   - **Očekávání:** v hlavičce není tlačítko „Přidat zákazníka“ ani přepínač zákazníků.
2. Vytiskni CN (Word), krycí list a SoD.
   - **Očekávání:** číslo nabídky je bez písmene a dokumenty vypadají jako před verzí v18.11.2.
3. V Přehledu cenových nabídek se u zakázky neobjeví štítek „N zákazníci“.

## 2. Zapnutí a jeden zákazník

4. Zapni vypínač. Založ novou zakázku `TEST VZ – 1` s jedním zákazníkem A, s IČO z ARES.
   - **Očekávání:** v hlavičce přibude jen tlačítko **„Přidat zákazníka“** bez ikony „+“, na stejném řádku jako popisek „Zákazník“. Nic jiného se nemění.
5. Vytiskni CN.
   - **Očekávání:** vypadá stejně jako s vypnutým vypínačem a číslo je bez písmene.

## 3. Přidání zákazníků

6. „Přidat zákazníka“ → zákazník B přes **ARES** (IČO), zákazník C ručně a zákazník D vybraný z databáze, pokud v ní nějaký je.
   - **Očekávání:**
     - ARES doplní název, sídlo a DIČ;
     - zákazníci dostanou písmena B, C, D;
     - objeví se přepínač zákazníků a karta „Zákazníci zakázky“.
7. Zkus přidat zákazníka se stejným IČO, jaké už v zakázce je.
   - **Očekávání:** aplikace to odmítne nebo na to upozorní.
8. Mezi zákazníky přepínej.
   - **Očekávání:** hlavička ukazuje otevřeného zákazníka a řídící zákazník je zřetelně označený.

## 4. Varianty: sdílená a vlastní

9. Variantu .1 nech sdílenou pro A, B i C. Zákazníkovi C založ vlastní variantu .2.
   - **Očekávání:** v pohledu zákazníka A ani B se varianta .2 nenabízí; v pohledu C ano.
10. Pojmenuj variantu jménem jiného zákazníka, například „Varianta pro <název B>“, a zkus ji vytisknout pro A.
    - **Očekávání:** zábrana nebo upozornění „text jmenuje jiného zákazníka“.

## 5. Tisk dokumentů pro jednotlivé zákazníky

11. Zákazníkům A, B a C vyplň v krycím listu ruční pole: telefon, e-mail, druhý podepisující, kopie faktur a zástupce. Vlož do nich kanárky.
    - **Očekávání:** pole se ukládají zvlášť pro otevřeného zákazníka. Po přepnutí na jiného zákazníka vidíš jeho hodnoty, ne cizí.
12. Pro každého zákazníka vytiskni CN (Word i online náhled), krycí list, specifikaci, SoD a plnou moc.
    - **Očekávání:**
      - číslo nabídky má písmeno (…-B, …-C), řídící zákazník je bez písmene;
      - hlavičku tvoří údaje tohoto zákazníka;
      - název souboru odpovídá tomuto zákazníkovi;
      - v dokumentu B není žádný kanárek A ani C a naopak. **Prohledej text každého dokumentu.**
13. Totéž zopakuj pro jazyk EN (u jednoho zákazníka i DE).
    - **Očekávání:** stejné zábrany a žádné úniky.

## 6. Odeslání, zámek a zmrazení

14. Odešli nabídku (tisk se zámkem) zákazníkům A a B. Pak zkus změnit:
    - a) název nebo IČO zákazníka B,
    - b) název akce nebo adresu stavby,
    - c) kontakt zákazníka B.

    **Očekávání:** a) a b) aplikace odmítne s vysvětlením (údaje jsou zmrazené), c) projde.
15. Dotiskni nabídku A i B.
    - **Očekávání:** dotisk nese údaje ze dne odeslání, správné písmeno a správného adresáta.

## 7. Odstranění zákazníka

16. Odstraň zákazníka D (nemá odeslanou nabídku).
    - **Očekávání:** jde to. Jeho písmeno se smí uvolnit.
17. **Jako obchodník** zkus odstranit zákazníka B (má odeslanou nabídku).
    - **Očekávání:** odmítnuto (403 nebo zhasnuté tlačítko s vysvětlením).
18. **Jako administrátor** totéž.
    - **Očekávání:** povoleno, s potvrzením. Odeslané nabídky B zůstanou v historii a písmeno B se už nikomu nepřidělí.
19. Zkus smazat variantu, na kterou ukazuje některý zákazník.
    - **Očekávání:** zábrana s vysvětlením.

## 8. Výměna řídícího zákazníka

20. Jako autor zakázky (nebo administrátor) udělej řídícím zákazníka C.
    - **Očekávání:**
      - hlavička zakázky nese C;
      - ruční hodnoty krycího listu zůstávají každému zákazníkovi jeho (zkontroluj kanárky);
      - staré tisky zůstávají původním adresátům.
21. **Jako obchodník, který není autor,** zkus totéž.
    - **Očekávání:** odmítnuto.
22. Po výměně dotiskni nabídku A.
    - **Očekávání:** adresát je pořád A.

## 9. Prodáno u dalšího zákazníka

23. U zákazníka B dej „Prodáno“ na variantu, která mu byla odeslaná.
    - **Očekávání:** potvrzení na stránce ukazuje před → po (řídící zákazník, řídící varianta, hodnota a číslo v dealu, organizace dealu, poznámka). Po potvrzení je B řídící a jeho varianta řídící.
24. Zkus dát „Prodáno“ zákazníkovi a variantě, která mu odeslaná nebyla.
    - **Očekávání:** odmítnuto.
25. Po prodeji zkontroluj:
    - řídícího nejde přepnout;
    - prodaného zákazníka nejde odstranit;
    - krycí list a SoD jdou pro vítěze B s jeho údaji;
    - u sdílené varianty ukazuje krycí list údaje vítěze, i když je otevřený jiný zákazník.
26. Odemkni prodej (vedoucí nebo administrátor).
    - **Očekávání:** řídící se nevrací automaticky.

## 10. Pipedrive (jen deal TEST, nebo simulátor / suchý běh)

27. Poznámka dealu „Další zákazníci na zakázce“.
    - **Očekávání:**
      - obsahuje název, číslo nabídky, den a cenu ODESLANÉ nabídky dalších zákazníků;
      - řídící zákazník v ní není;
      - nejsou v ní kontakty, IČO ani slevy.
28. Po prodeji B: organizace dealu se přepíše na B (najde ji podle IČO, nebo ji založí).
    - **Očekávání:**
      - aplikace upozorní: „Doplňte v Pipedrive kontaktní osobu vítězného zákazníka před posunem dealu na Vyhráno.“;
      - kontaktní osoba dealu se nemění.
29. **Situace T1 (jen pozoruj, nález zapiš):** po ruční výměně řídícího BEZ prodeje se podívej, co uvádí poznámka v dealu. Uvádí nového řídícího?
30. Zákazník bez IČO, nebo s IČO, které ARES nezná.
    - **Očekávání:** organizace se nezaloží a aplikace zobrazí srozumitelnou chybu „IČO v ARES není…“.

## 11. Přehled, hledání, controlling

31. V Přehledu cenových nabídek se u zakázky zobrazí štítek „N zákazníci“, ale jen při ZAP. Zakázku najdeš i podle názvu dalšího zákazníka.
32. Controlling: zakázka má jeden řádek s řídícím zákazníkem a počet zákazníků. Nic se nepočítá dvakrát.

## 12. Víc šachet × víc zákazníků

33. Zakázka `TEST VZ – 2` se 2 šachtami a 2 zákazníky.
    - **Očekávání:**
      - CN pro B má šachty a písmeno B;
      - SoD pro B vyjmenuje šachty;
      - v dealu jsou obě poznámky (šachty i další zákazníci).

## 13. Vypnutí vypínače u zakázky s víc zákazníky

34. Vypni vypínač a otevři `TEST VZ – 1`.
    - **Očekávání:**
      - zakázka se otevře;
      - tisk jde jen za řídícího zákazníka;
      - další zákazníci zůstávají v datech (po opětovném zapnutí jsou zpět);
      - nic se neztratí.
35. Vypínač vrať do původního stavu.

## 14. Výstup

Zapiš `STAV_TEST_VZ_2026-11-18.md` do složky **Testovani** na Disku (koordinace ho převezme do `podklady/kola/`). Obsah:

- **Hlavička:** verze testu, datum, kdo testoval, zda byl k dispozici účet obchodníka a token Pipedrive.
- **Tabulka:** bod (1–35) × výsledek (OK / NÁLEZ / NEOVĚŘENO) × poznámka.
- **Nálezy:** číslo VZ-N1, VZ-N2…, vážnost (vysoká = únik údajů jiného zákazníka nebo špatná cena či adresát; střední = chybné chování; nízká = text nebo vzhled), přesné kroky k zopakování, co se stalo a co se mělo stát. Případně snímek obrazovky bez osobních údajů.
- **T1:** co poznámka v dealu uvádí po výměně řídícího bez prodeje.
- **Úklid:** které TEST VZ zakázky zůstaly a v jakém stavu je vypínač.

Nic neopravuj a do repa nic nepushuj.
