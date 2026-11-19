# STAV – zkouška VZ-F1 (víc zákazníků, opakování nálezů) a C7 na testu, 19. 11. 2026

## Hlavička

- **Test:** https://testengscalc.netlify.app, verze v19.11.1 (obsahuje VZ-F1 v18.11.8 a C7+NS).
- **Kdo:** testovací sezení Claude, administrátorský účet `KNG_TEST_*`. Zápis na test potvrdil J. V. v chatu 19. 11.
- **Ovládání:** stránka se ovládala funkcemi aplikace v Playwrightu. Pole krycích listů se plnila přes skutečné `input` na stránce
  (`change`), CN se odesílala přes `nabidkaWord()` se zámkem a SoD DE přes `sodWord()`. Ostatní dokumenty vznikaly cestou tlačítek,
  tedy `dokumentZabrana` + `vzTiskVstup` + `dokumentVygeneruj`, bez zámku. Text každého dokumentu (Word i náhled krycího listu) se prohledal na kanárky.
- **Pipedrive:** zápisy `/api/pd*` blokované (1× `POST /api/pd/organizace` při Prodáno zachycen a zahozen), mimo test nic.
- **Vypínač „Víc zákazníků“:** na začátku ZAP. Kvůli bodu A7 se vypnul a znovu zapnul. Na konci ZAP.
- **Zákazníci (smyšlení):** A, B a C = „TEST VZ F1 Zákazník A/B/C s.r.o.“, smyšlená IČO 99811014 / 99811022 / 99811031 (platný kontrolní součet),
  kanárky `KANAR-A-…`, `KANAR-B-…`, `KANAR-C-…`.

## Výsledky A (opakování nálezů)

| bod | výsledek | poznámka |
|---|---|---|
| A1 N3 (vysoká) | ✅ **opraveno** | U otevřeného C se pole „Ve věcech smluvních – jméno“ a DIČ v KL OCK i KL PROJ vážou na `ZAK.dalsiZakaznici[C].zastupci` / `.hlavicka.dic`. Hlavička řídícího A kanárka C neobsahuje. Po odeslání CN A, B, C nese **SoD A, KL A (BO i Techdata) a plná moc A jen kanárky A**. SoD C a KL C nesou kanárky C (zástupce, DIČ, kontakt, IČO). |
| A1 po výměně řídícího | ✅ | Řídícím se stal C. Do A (teď další zákazník) se zapsal zástupce `KANAR-A2-ZASTUPCE` a uložil se do `dalsiZakaznici[A]`, ne do hlavičky. SoD a KL C (řídící) A2 nenesou, SoD a KL A ano. B nese jen B. Plná moc jde jen řídícímu (A před výměnou, C po ní). |
| A2 KL BO, Techdata, PROJ BO | ✅ | **KL BO** tiskne sekci Zástupci a pole Bankovní spojení / Číslo účtu / Zápis v rejstříku zákazníka. Ověřeno kanárky: 1 zákazník OCK (9949-K49), **KL PROJ BO** u TEST OVP zakázky 7650-K29-N50, další zákazník C u 9811 (Word i náhled). **Techdata** podle návrhu nese jen technický kontakt, bankovní údaje ne. Totéž s vypínačem VYP: KL 9603 VYP × ZAP shodný. |
| A2 pozn. | ℹ | „Bankovní spojení zhotovitele“ je v KL prázdné, protože ve Firmě na testu chybí banka, účet i IBAN (data testu, ne vada). |
| A3 N1 | ✅ **opraveno** | Přidání zákazníka se stejným IČO jako B odmítnuto: „Zákazník s tímto IČO už v zakázce je (TEST VZ F1 Zákazník B s.r.o.).“ Počet zákazníků beze změny. |
| A4 N2 | ✅ **opraveno** | Výběr variant v hlavičce: u A i B jen „Varianta 1“, u C jen jeho „Varianta 2“. |
| A5 N4 | ✅ **opraveno** | KL vlastní varianty C: `KRYCI-LIST_TEST-2026-OPR-CN-9811.2-C-OCK-…` (CN `…9811.2-C`, SoD `…9811.2-C`). |
| A6 controlling | ✅ | Po Prodáno zákazníkovi B: `ctrlExportVarianty` → strana OCK s číslem `TEST - 2026 - OPR - CN - 9811-B`. Prodaná zakázka: hlavička řídícího jen ke čtení s hláškou „Zakázka je prodaná…“ (správně). |
| A7 regrese (VYP, 1 zákazník) | ✅ | TEST 9603-K19T-C103: CN, KL BO, KL Techdata, SoD a plná moc jsou s vypínačem VYP a ZAP **znak po znaku shodné**. CN, SoD a plná moc jsou shodné i s výstupem z 18. 11. (v18.11.6/7). |

## B — úklid TEST VZ zakázek z 18. 11.

| zakázka | řídící | hlavička řídícího | akce |
|---|---|---|---|
| TEST - 2026 - OPR - CN - 9801 (TEST VZ – 1) | Skanska a.s. | bez cizích kanárků v zástupcích | nic (řídící varianta zamčená) |
| TEST - 2026 - OPR - CN - 9802 (TEST VZ – 2) | TEST VZ Zákazník E s.r.o. | bez cizích kanárků v zástupcích | nic (řídící varianta zamčená) |

Žádná hodnota se nemazala. Zástupci zapsaní 18. 11. před opravou v hlavičkách řídících dnes nejsou.

## C — C7 ruční zkouška SoD DE

- TEST 9949-K49, varianta .2, tisk skutečným tlačítkem (`tiskJazykNastav('de')` + `sodWord('sod')`), šablona `sod_de` v3 (`…_v6_DE`).
- Dokument `SOD_TEST-2026-OPR-CN-9949-K49.2-OCK-DE.docx` je **německý** („Auftraggeber/Auftragnehmer“, 0× `{{`). Česky je jen 12 ze 147 odstavců:
  jména, adresa, (IČ)/(DIČ) a 4× „Šachta“ (výchozí název šachty, viz #649 / K49-I6).
- **Zámek:** varianta .1 beze změny (zamčená, 1 tisk). Varianta .2 zůstala zamčená a přibyl jen záznam tisku (1 → 2), nic se nezamklo navíc.
  Do zavření okna (10 s) skript neviděl žádné uložení záznamu tisku na server. Jestli se uloží až později tichým uložením, jsem neověřoval.

## Nálezy

| ID | co | závažnost |
|---|---|---|
| VZF1-I1 | Název souboru plné moci u zakázky OPR je `PLNA-MOC_2026-OPR-CN-PROJ-CZ`, chybí číslo zakázky (bere prázdné `projHlavicka.cislo` = předloha „2026 - OPR - CN - “). Viděno u 9811, 9603 i 9949. | nízká |
| VZF1-I2 | Záznam tisku SoD DE (C7) se během 10 s neuložil na server; ověřit, že tiché uložení po tisku proběhne (K7-K1) | informace, neověřeno |

Nálezy VZ-N1, VZ-N2, VZ-N3 a VZ-N4 jsou na v19.11.1 opravené. Poznámka k controllingu z 18. 11. je vyřešená (#…9811-B).

## Zápisy na test (úklid)

- **Nová zakázka:** `TEST - 2026 - OPR - CN - 9811` („TEST VZ – F1“). Zákazníci A, B, C, varianta .1 (A, B) a .2 (C), CN odeslána
  A, B i C. Řídící se vyměnil A → C, pak Prodáno zákazníkovi B (řídící B). **TEST sada má teď 317 zakázek „TEST -“.** Zadání a krycí list
  jsou zkopírované z 9603 (proto KL ukazuje „Číslo SoD“ z 9603; je to artefakt přípravy, ne vada).
- **Kanárky doplněné do hlaviček:** 9949-K49 (`KANAR-K49-BANKA/UCET/ZAPIS/ZASTUPCE`) a TEST 7650-K29-N50 (OVP, `KANAR-P-…`).
  9811 má u C `KANAR-C-BANKA/UCET/ZAPIS`.
- **SoD DE** u 9949-K49 .2 přidala záznam tisku do zámku.
- Vypínač „Víc zákazníků“ na konci ZAP, „Víc šachet“ nezměněn.
