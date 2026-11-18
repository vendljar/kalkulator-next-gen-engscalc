# STAV – zkouška „Víc zákazníků na zakázce“ (VZ #598) na testu, 18. 11. 2026

## Hlavička

- **Test:** https://testengscalc.netlify.app, na začátku v18.11.4. Během zkoušky se nasadila v18.11.5 (kód aplikace beze změny). Stránka byla obnovena a zkouška běžela na v18.11.5.
- **Kdo:** testovací sezení Claude, v prohlížeči J. V. přihlášeném jako administrátor. Obrazovka se ovládala funkcemi aplikace v otevřené stránce.
- **Dokumenty:** vznikaly stejnou cestou jako z tlačítek (`dokumentVygeneruj` + `vzTiskVstup`). Do počítače se nic nestahovalo; text každého dokumentu se prohledal na kanárky.
- **Odeslání (bod 14) a jeho dotisk:** šly přes skutečné `nabidkaWord()` se zámkem.
- **Účet obchodníka:** nebyl k dispozici. Body 17 a 21 jsou ověřené jen v jádru.
- **Pipedrive:** na testu je napojení vypnuté (`/api/pd/pole` → režim „vypnuto“, bez tokenu i simulátoru). Ověřovaly se jen texty náhledu a stavy v aplikaci.
- **Vypínač:** na začátku ZAP. Během zkoušky se dvakrát vypnul a zapnul (body 1–3 a 34). Na konci je ZAP.
- **Zákazníci:**
  - A = ČEZ, a. s. (ARES),
  - B = Skanska a.s. (ARES),
  - C = „TEST VZ Zákazník C s.r.o.“ (ručně, smyšlený),
  - D = druhý záznam se stejným IČO jako B (bod 7),
  - u TEST VZ – 2 smyšlení E a F.
  - Kontakty jsou smyšlené (`kanar.x@priklad.cz`, `KANAR-X-…`).

## Výsledky bodů

| Bod | Výsledek | Poznámka |
|---|---|---|
| 1 | OK | VYP: v hlavičce TEST zakázky K28-C001 není „Přidat zákazníka“ ani přepínač. |
| 2 | OK | CN, krycí list a SoD: číslo bez písmene. Plnou moc v testu nejde vytvořit vůbec (VZ-N5, nesouvisí s VZ). |
| 3 | OK | Bez štítku. Ověřeno i u zakázky se 3 zákazníky při VYP (bod 34): štítků 0. |
| 4 | OK | Jen tlačítko „Přidat zákazníka“ bez „+“, ve stejném řádku jako popisek „Zákazník“. |
| 5 | OK | Text CN se zapnutým vypínačem = text s vypnutým, znak po znaku. Číslo bez písmene. |
| 6 | OK / NEOVĚŘENO | B přes ARES (doplnil název, sídlo, DIČ), C ručně. Písmena B, C, objevil se přepínač i karta. **D z databáze neověřeno** – databáze zákazníků na testu je prázdná. |
| 7 | **NÁLEZ VZ-N1** | Druhý zákazník se stejným IČO (26271303) se přidal bez upozornění, dostal písmeno D. |
| 8 | OK | Hlavička ukazuje otevřeného zákazníka, řídící má ★ a bublinu „řídící zákazník“. |
| 9 | **NÁLEZ VZ-N2** (nízká) | Tiskový pohled A a B variantu .2 nenese a tisk A z varianty .2 se zastaví zábranou. Výběr „Otevřená varianta“ v hlavičce ale nabízí variantu .2 i u otevřeného A nebo B. |
| 10 | OK | Zábrana: „Název varianty obsahuje název nebo IČO jiného zákazníka… dokument pro ‚ČEZ, a. s.‘ nevznikne.“ |
| 11 | **NÁLEZ VZ-N3** | Telefon, e-mail, druhý podepisující a kopie faktur se ukládají po zákaznících správně. **Zástupci („Ve věcech smluvních – jméno“ a další pole sekce Zástupci) ne:** zápis u otevřeného B nebo C přepíše zástupce řídícího A. |
| 12 | **NÁLEZ VZ-N3** | Pro A, B i C bez úniku a se správným číslem i hlavičkou: CN Word, online náhled CN, krycí list a specifikace. **SoD řídícího A nese zástupce zákazníka C** („KANAR-C-ZASTUPCE“, 2×). SoD před odesláním správně zastavena. Plná moc viz VZ-N5. |
| 13 | OK | Bez úniku: EN CN a krycí list pro A, B, C; DE CN a krycí list pro B; SoD DE a EN pro B. SoD v5 DE je nově řádně německá (10/146 odstavců s diakritikou = české údaje firmy) – K48-N1 vyřešen J. V. 18. 11. |
| 14 | OK | A i B odeslány (razítka „komu“ z1 a z2). a) Název a IČO B odmítnuto: „Zákazníkovi už odešla nabídka…“. b) Název akce a adresa stavby odmítnuto, pole zhasnutá. c) Kontakt B se uložil. |
| 15 | OK (s VZ-N3) | Dotisk A: číslo …9801, adresát ČEZ. Dotisk B: …9801-B, adresát Skanska. SoD A ale nese zástupce C (VZ-N3). |
| 16 | OK | D odstraněn. Potvrzení „písmeno -D uvolní se“, další volné písmeno je znovu D. |
| 17 | NEOVĚŘENO | Chybí účet obchodníka. Jádro (`vzOdstranDuvod` bez role administrátora) vrací „odstranit ho smí jen administrátor“. |
| 18 | OK | Administrátor: potvrzení na stránce („doklad zůstává“, „písmeno -B už se nepřidělí“). Po odstranění je další písmeno D, ne B. Razítka tisku B zůstala v zámku. Tlačítko Zpět B vrátilo – kvůli bodům 20–25. |
| 19 | OK | „Na variantu ukazuje zákazník TEST VZ Zákazník C s.r.o. — nejdřív mu přiřaďte jinou variantu nebo ho odstraňte.“ |
| 20 | OK | Řídící je C, hlavička nese C. Ruční hodnoty krycích listů beze změny (kanárky na místě). Staré tisky zůstaly z1 → ČEZ a z2 → Skanska. |
| 21 | NEOVĚŘENO | Chybí účet obchodníka. Jádro `vzRidiciSmiMenit` pro obchodníka, který není autor, vrací false. |
| 22 | OK | Po výměně: dotisk A má číslo …9801 a adresáta ČEZ. Název souboru nově nese „Varianta-1“. |
| 23 | OK | Potvrzení před → po: řídící C → B, řídící varianta 2 → 1, hodnota a číslo v dealu, organizace, poznámka. Po potvrzení je B řídící a jeho varianta řídící. Uloženo. |
| 24 | OK | C (neodeslaná) i B na variantě C: „Prodat jde jen odeslanou (zamčenou) nabídku — nejdřív ji vytiskněte.“ |
| 25 | OK | Řídícího nejde přepnout (prodaná). Prodaného B nejde odstranit. Krycí list a SoD jdou pro vítěze B (…9801-B). U sdílené varianty jdou údaje vítěze B i při otevřeném A. |
| 26 | OK | Odemčení prodeje (administrátor, s důvodem): řídící zůstal B. |
| 27 | OK | Náhled poznámky: další zákazníci s názvem, číslem, dnem a cenou odeslané nabídky, u neodeslaného „zatím neodeslána“. Řídící B v ní není, IČO, kontakty ani slevy také ne. |
| 28 | NEOVĚŘENO | Pipedrive na testu vypnutý a zakázka bez dealu. Aplikace po prodeji ukázala „Organizace dealu se nepřepsala — Zakázka není navázaná na deal v Pipedrive. Prodej je uložený.“ a tlačítko „Zkusit zápis znovu“. |
| 29 | T1 | Viz oddíl T1. |
| 30 | Částečně | ARES pro IČO 99999994: „Rejstřík ARES pod tímto IČO (99999994) žádný subjekt nevede…“. Prázdné IČO: „Nejdřív vyplňte IČO objednatele…“. Zápis organizace bez Pipedrive neověřen. |
| 31 | OK | Při ZAP štítek „3 zákazníci“ s názvy v bublině. Hledání „TEST VZ Zákazník C“ najde jen zakázku 9801. Při VYP 0 štítků. |
| 32 | OK | Hromadný export controllingu za 18. 11.: 1 zakázka, 1 řádek OCK, zákazník Skanska a.s. (řídící po prodeji), „3 zákazníci“, nic dvakrát. Poznámka: číslo strany je číslo varianty bez písmene (…9801). |
| 33 | OK | TEST VZ – 2 (2 šachty, zákazníci E a F). CN pro F: obě šachty, číslo …9802-B, údaje F bez E. SoD pro F: „2 varianty šachet, celkem 2 ks (Šachta 1 1 ks, Šachta 2 1 ks)“. Náhled dealu: poznámka šachet i poznámka dalších zákazníků. |
| 34 | OK | VYP: TEST VZ – 1 se otevře, karta jen ke čtení s lištou „funkce je vypnutá…“. Tisk jen za řídícího B, i když se otevře C. Zákazníci zůstali v datech a po zapnutí jsou zpět. |
| 35 | OK | Vypínač vrácen na ZAP (stav na začátku). |

## Nálezy

### VZ-N3 – vysoká: zástupci zákazníka v krycím listu se zapisují řídícímu zákazníkovi (únik do jeho SoD)

**Kroky:**
1. Zakázka s A (řídící), B a C, vypínač ZAP.
2. Krycí list OCK, otevřený zákazník C (přepínač).
3. Sekce „Zástupci a kontakty zákazníka“ → „Ve věcech smluvních — jméno“ = `KANAR-C-ZASTUPCE`.
4. Odeslat nabídku A a vytisknout SoD pro A.

**Co se stalo:**
- Pole jsou vázaná přímo na `ZAK.zastupci.*` (`set('ZAK.zastupci.smluvniJmeno', …)`), tedy na hlavičku řídícího. `vzCesta` přesměrovává jen pole firmy (VZ_HLAVICKA_POLE), zástupce ne.
- Zápis u B nebo C proto přepíše zástupce A. Obrazovka u B a C zároveň zobrazuje zástupce A (únik na obrazovce).
- `zastupci` dalších zákazníků zůstaly prázdné.
- SoD řídícího A pak obsahuje zástupce zákazníka C (2×).
- Po výměně řídícího (bod 20) údaj putoval s A (`dalsiZakaznici[z1].zastupci`), takže stav přetrvá.

**Co se mělo stát:** pole Zástupci u otevřeného dalšího zákazníka mají číst a zapisovat jeho `dalsiZakaznici[i].zastupci`. V proxy pro databázi a ARES (`vzZakaznikProxy`) to tak je, v krycím listu ne. Případně mají být pole u dalšího zákazníka jen ke čtení.

**Doplněk (není VZ):** vytištěný krycí list BO má pole sekce Zástupci prázdná, i když hlavička zástupce nese – platí i pro zakázku s jedním zákazníkem. Ověřit, zda je to záměr.

### VZ-N1 – střední: duplicitní IČO zákazníka bez upozornění (bod 7)

- **Kroky:** „Přidat zákazníka“ → IČO 26271303 (už má zákazník B) → ARES → Převzít → Přidat zákazníka.
- **Co se stalo:** zákazník se přidal jako D bez hlášky i bez potvrzení.
- **Co se mělo stát:** odmítnutí nebo upozornění „zákazník s tímto IČO už v zakázce je“.

### VZ-N2 – nízká: výběr „Otevřená varianta“ nabízí cizí vlastní variantu (bod 9)

- **Co se stalo:** při otevřeném A nebo B nabízí výběr variant v hlavičce i vlastní variantu .2 zákazníka C. Tisk se pak správně zastaví („Varianta… není nabídka zákazníka…“).
- **Co se mělo stát:** v pohledu zákazníka nabízet jen varianty, které mu patří (jako tiskový pohled), nebo je odlišit.

### VZ-N4 – nízká: názvy souborů

- Krycí list zákazníka C s vlastní variantou se jmenuje `KRYCI-LIST_…9801-C-…`, číslo nabídky je ale `…9801.2-C`. Chybí `.2` – u CN je správně `…9801.2-C`.
- Název souboru CN řídícího zákazníka nese jméno zákazníka, jen když ho varianta má v poli „zákazník“. U A bylo bez jména, u B a C se jménem. Jen pro úplnost.

### VZ-N5 – nízká (data testu, nesouvisí s VZ): plná moc

- Zveřejněná šablona plné moci v testu („VZOR plná moc ENGINEERS CZ_archiv.docx“, v1 z 16. 9.) nemá žádné symboly → „V šabloně nebyly nalezeny žádné symboly {{...}}“. Plnou moc v testu nejde vytvořit.
- U dalšího zákazníka plnou moc zastaví hláška „Dokumenty projekce (PROJ) se u zakázky s víc zákazníky tisknou jen pro řídícího zákazníka“. Stojí za ověření, zda má plná moc patřit k PROJ i u nabídky OCK.

### Poznámka k controllingu (bod 32)

Řádek controllingu u prodeje dalšímu zákazníkovi nese číslo varianty bez písmene (`…9801`), zatímco nabídka a deal mají `…9801-B`. Jen k posouzení.

## T1 – poznámka dealu po výměně řídícího bez prodeje

- Po výměně řídícího na C (bez prodeje) náhled poznámky „Další zákazníci na zakázce“ vyjmenuje B a A (s odeslanými nabídkami). Nového řídícího C v ní není.
- Organizace dealu se ale bez prodeje nemění (zůstává původní řídící), jak říká i potvrzení výměny.
- **Výsledek:** deal ukazuje organizaci, kterou poznámka zároveň vede jako „dalšího zákazníka“, a nový řídící C není v dealu nikde. Nesoulad k rozhodnutí: poznámka by po výměně bez prodeje mohla uvádět i „řídící zákazník zakázky: C“, nebo vynechat zákazníka, který je organizací dealu.

## Úklid

- **TEST VZ – 1** (`TEST - 2026 - OPR - CN - 9801`) zůstává:
  - 3 zákazníci, řídící B (Skanska), C s vlastní variantou .2, A (ČEZ),
  - varianta .1 zamčená (odeslána A a B), prodej B odemčen,
  - zákazník D odstraněn.
- **TEST VZ – 2** (`TEST - 2026 - OPR - CN - 9802`) zůstává: 2 šachty, zákazníci E (řídící) a F, nabídka F odeslána.
- TEST sada K28/K29/K36 beze změny (K28-C001 jen otevřena, neuložena).
- Vypínač „Víc zákazníků“: ZAP (jako na začátku). Vypínač „Víc šachet“ nezměněn (ZAP).
- Stránka v prohlížeči obnovena (zkušební úpravy stránky zrušeny).
