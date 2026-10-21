# Kontrola rozhodnutí J. V. z 15.–16. 10. 2026 — kód, příručka, EN/DE/FR (dávka V4)

- **Dávka:** V4 (zadání koordinace „ŘÍDÍCÍ 16.10“, session_011B3ruyPigNEMSUdesbk4Hd), větev
  `claude/v4-kontrola-rozhodnuti` nad `origin/claude/integrace-16-10` (= test v15.10.14), verze **v16.10.5**.
- **Zdroje rozhodnutí:** CHANGELOG v15.10.3–v15.10.14, `podklady/AUDIT_2026-10-15_v15.10.6.md`,
  `BEZPECNOST_MEZE.md`, `podklady/PREDAVKA_KOORDINACE_15_10.md` (rozhodnutí 16. 10. a plán víkendu), roadmapa.
- **Rozsah:** jen nálezy a drobné opravy (texty, překlady, příručka, roadmapa). Změny chování nejsou.
  S11–S13 (B155 rozsah pásu, lešení ve specifikaci, cena dle nabídky) se nekontrolují (běží souběžně).
- **Jak se kontrolovalo:** čtení kódu (`src/`, `netlify/`), `manual/obsah.json` (kapitoly i „Co je nového"),
  roadmapa `roadmapa/roadmap.json`; překlady skenem celé online nabídky PROJ v EN/DE/FR (všechny
  činnosti zapnuté, AD nabízený — každý řetězec dat nabídky s českým písmenem) a sadami
  `test_proj_zbytky_preklad`, `test_proj_ad_preklad`, `test_preklad`, `test_slovnik`.

**Sloupce EN / DE / FR:** většina rozhodnutí se týká jen obrazovky, krycích listů nebo serveru, které
jsou jen česky (krycí list, SoD — SoD v EN je #157 na víkend) — tam „n/a". Do cizojazyčných dokumentů
sahají jen nabídka PROJ a platební symboly.

## Souhrn

| | Počet |
|---|---|
| Rozhodnutí 15. 10. zkontrolováno | 16 |
| Rozhodnutí 16. 10. (jen zápis v roadmapě) | 6 |
| Nálezy | 5 (V4-1 až V4-5) |
| Opraveno v této dávce | 3 (V4-1, V4-2, V4-3) |
| Předáno / jen informace | 2 (V4-4, V4-5) |

## Rozhodnutí 15. 10. 2026 × kód / příručka / EN / DE / FR

| # | Rozhodnutí (zdroj) | Kód | Příručka | EN | DE | FR | Stav | Nález |
|---|---|---|---|---|---|---|---|---|
| 1 | **B80** čtení z Pipedrive výchozí všem; strop 30/h a cache 90 s OK (v15.10.7) | ✓ `src/zobrazeni.js` `crm.pipedrive` výchozí ano/ano; `NASAZENI_NETLIFY.md` ✓ | ✓ Co je nového | n/a | n/a | n/a | promítnuto | V4-4 (audit B158 píše „výchozí stav ne") |
| 2 | **P12** náklady výchozí všem, admin skryje, obchodník vidí prodejní sazbu (v15.10.3 úprava) | ✓ `naklady.ceniky` výchozí ano/ano; sloupec „Prodejní sazba Kč/h · cena" (`src/ui/kalk_proj.js`) | ✓ kap. 28; Co je nového doplněno | n/a | n/a | n/a | promítnuto | V4-3 (opraveno) |
| 3 | **P12** `kontroly.cisla` rozhoduje o částkách v kontrolách (v15.10.3) | ✓ (testy P12) | — (chování pro správce, příručka obchodníka ho nepotřebuje) | n/a | n/a | n/a | promítnuto | — |
| 4 | **B89** klíč prvku v analytice, karta Analytika nepíše „anonymní" (v15.10.2) | ✓ (žádné „čistě anonymní" ve zdrojích) | ✓ Co je nového (Správce … Analytika) | n/a | n/a | n/a | promítnuto | — |
| 5 | **B90** záloha přežije odhlášení — vědomá mez, nezpřísňovat | ✓ beze změny | ✓ (nic opačného) | n/a | n/a | n/a | `BEZPECNOST_MEZE.md` ✓ | — |
| 6 | **B91–B93, B95** opraveno (v15.10.2) | ✓ (sady, mutace 449/449 v kole v15.10.14) | ✓ B95 jméno bez < > | n/a | n/a | n/a | promítnuto | — |
| 7 | **B94** scrypt — varianta A, neměnit | ✓ beze změny | n/a | n/a | n/a | n/a | `BEZPECNOST_MEZE.md` ✓ | — |
| 8 | **B153** dotisk druhé strany = výjimka + min. marže (varianta podle doporučení) | ✓ server `zakazka_kontrola.mjs`, prohlížeč `vyjimkyDotiskZabrana` | ✓ kap. 19, Co je nového | n/a | n/a | n/a | promítnuto | — |
| 9 | **B154** varianta (a): celý obsah výjimky, stará rozhodnutí neplatná | ✓ `cenovaVyjimka.obsah`, `vyjimkyFnv` zrušen | ✓ kap. 19, Co je nového („schválit znovu") | n/a | n/a | n/a | promítnuto | — |
| 10 | **B155, B156** uzavřeny jako vědomé meze | ✓ beze změny (B155 rozsah řeší S11 — nekontrolováno) | n/a | n/a | n/a | n/a | `BEZPECNOST_MEZE.md` ✓, audit ✓, #420 ✓ | — |
| 11 | **B157** záměrné chování (cizí obchodník smí měnit volná pole) | ✓ beze změny, `netlify/test_kryci_po_tisku.mjs` | n/a | n/a | n/a | n/a | `BEZPECNOST_MEZE.md` ✓ | — |
| 12 | **Krycí list zakázky OCK** (přejmenování, v15.10.9) | ✓ záložka, nadpis, dokument, `ZAMEK_DOKUMENTY` | ✓ kap. 24, Co je nového | n/a | n/a | n/a | promítnuto | V4-5 (registr dokumentů, jen informace) |
| 13 | **Číslo SoD** v obou krycích listech, ruční, zamkne tisk SoD (v15.10.9) | ✓ `cisloSod` v `KRYCI_SEKCE` i `KRYCI_PROJ_SEKCE` → `SOD_CISLO_SMLOUVY` | ✓ kap. 24, Co je nového | n/a | n/a | n/a | promítnuto | — |
| 14 | **Číslo SoD v šablonách SoD projekce** (v15.10.11/13) | ✓ `vyrob_sablony.js --sod-proj-cislo`; v3 nahrál J. V. 16. 10. | ✓ kap. 24 | n/a | n/a | n/a | promítnuto | — |
| 15 | **Hodiny v krycím listu jen za vlastní stranu** (v15.10.10) | ✓ `kryciHodiny(…, strana)`, obrazovka / tisk / Word | ✓ kap. 24, Co je nového | n/a | n/a | n/a | promítnuto; #414 nese „ZMĚNA 15. 10." | — |
| 16 | **Červená lišta ceníku až po ověření** (v15.10.4) | ✓ `ukazkoveListaRozhodni`, 5 s | ✓ kap. 4; Co je nového doplněno | n/a | n/a | n/a | promítnuto | V4-3 (opraveno) |
| 17 | **Zbytky češtiny v nabídce PROJ EN/DE/FR** (překlady schválil J. V. 15. 10.) | ✓ `src/preklad.js`, `nabidka_proj.js` | ✓ Co je nového | ✗→✓ | ✗→✓ | ✗→✓ | rekapitulace měla 2 české řádky | **V4-1 (opraveno)** |
| 18 | **„Jiné znění" v krycím listu respektuje zámek** (v14.10.7, v test od v14.10.8) | ✓ `klVyber`, `klpVyber` v `ZAMEK_CHRANENE` i `ZAMEK_KRYCI_FUNKCE` | ✓ (beze změny, platí kap. 24) | n/a | n/a | n/a | promítnuto | — |

## Rozhodnutí 16. 10. 2026 — zápis v roadmapě (provádí se o víkendu)

| Rozhodnutí | Roadmapa před V4 | Po V4 |
|---|---|---|
| **#355** výpočet beze změny, jen upozornit | ✗ `cekaNa` „potvrdit detail výpočtu"; `hotovoKdyz` s opačným výpočtem (plechy = nástupiště − můstky) | ✓ detail „ROZHODNUTO J. V. 16. 10.", nové `hotovoKdyz`, `cekaNa` odebráno |
| **#356** plochu přes nejvyšší můstek připočítat do zastřešení | ✗ `cekaNa` „potvrdit detail" | ✓ detail, `cekaNa` odebráno |
| **B165** schvalovatel vidí ceníkovou vs. použitou sazbu a dopad v % | ✗ v #420 jen „schvalovatel nevidí částky" | ✓ detail #420 |
| **#366** aplikace navrhne další číslo SoD z řady podle čísla nabídky, obchodník přepíše | ✗ jen rozhodnutí 29. 9. (ruční pole s návrhem) | ✓ detail |
| **#367** odloženo na 19. 10. | ✗ | ✓ detail „ODLOŽENO" |
| **#157** SoD EN = překlad české šablony ke kontrole rodilými mluvčími | ✗ „čeká na právní znění od právníka" (detail, `pozn`, `hotovoKdyz`) | ✓ detail, `pozn`, `hotovoKdyz` |

## Nálezy

| ID | Vážnost | Kde | Nález | Návrh | Stav |
|---|---|---|---|---|---|
| **V4-1** | nízká (překlad) | `src/nabidka_proj.js` rekapitulace, `src/preklad.js` | Rekapitulace nabídky PROJ bere názvy sekcí z Kalkulace PROJ; „EZC – EKONOMICKÁ ZADÁVACÍ ČÁST (celý projekt)" a „KOLAUDACE (pro 1 ks výtahu)" slovník neznal → v EN/DE/FR náhledu a tisku česky. | Dvě hesla do slovníku. | **OPRAVENO** v16.10.5 — **NÁVRH PŘEKLADU, čeká na kontrolu J. V.**: EN „EZC – TENDER COST DOCUMENTS (entire project)", „FINAL BUILDING APPROVAL (for 1 lift)"; DE „EZC – WIRTSCHAFTLICHER AUSSCHREIBUNGSTEIL (gesamtes Projekt)", „BAUABNAHME (für 1 Aufzug)"; FR „EZC – PIÈCES ÉCONOMIQUES DE CONSULTATION (projet complet)", „RÉCEPTION DES TRAVAUX (pour 1 ascenseur)". Test `src/test_proj_zbytky_preklad.js` 70/3 → 73/0. |
| **V4-2** | nízká (evidence) | `roadmapa/roadmap.json` | Rozhodnutí 16. 10. v roadmapě chyběla; #355 popisoval opačný výpočet, #157 čekal na právníka, #355/#356 „čekaly na J. V." | Zapsat. | **OPRAVENO** (tabulka výš). |
| **V4-3** | nízká (příručka) | `manual/obsah.json`, „Co je nového ve verzi v15.10.14" | Chyběly novinky P12 (správce může skrýt nákladové sazby PROJ, pak prodejní sazba) a čekání červené lišty při startu — v kapitolách 28 a 4 popsané byly. | Dvě odrážky. | **OPRAVENO** (příručka ze snímků se přegeneruje při integraci). |
| **V4-4** | informativní (dokumentace) | `podklady/AUDIT_2026-10-15_v15.10.6.md`, řádek B158 | Popis B158 (souběh stropu 30 načtení dealu) říká „Týká se jen účtu s právem `crm.pipedrive` (výchozí stav ne)". Od B80 v15.10.7 má právo výchozí **každý** obchodník a vedoucí — dopad B158 se tím rozšířil na všechny účty (pořád jen rozpočet volání Pipedrive, ne data). | Zohlednit v dávce A1, která B158 právě řeší; v auditu doplnit poznámku „od v15.10.7 výchozí všem". V4 audit needitovala (souběh s A1). | předáno koordinaci |
| **V4-5** | informativní | `src/kryci.js:704` | Registr dokumentů nese u krycího listu OCK `nazev: 'Krycí list – Backoffice / Techdata'` (PROJ má „Krycí list PROJ – …"). Jméno se nikde nezobrazuje (`dokumentDef` mimo registr nikdo nevolá), proto bez dopadu. | Při nejbližší úpravě `kryci.js` sjednotit na „Krycí list zakázky OCK – …". | jen zapsáno |

## Co sken nabídky PROJ v EN/DE/FR dál ukazuje česky (záměrně, beze změny)

- Souvislá próza `{ cz }` a řádky rozsahu (úvody STUDIE / DPZ / DPS, „– situace stavby …" apod.) —
  rozhodnutí z v14.10.8: překlad jen na pokyn J. V.
- Zkratka „IČ" v nadpisech a platbách — jako v přeložených šablonách PROJ.
- Firemní texty `FIRMA_*` — ve zkušebním prostředí výchozí (smyšlená) firma bez cizojazyčných textů;
  ve skutečnosti je plní Nastavení → Firma.
- Interní data plánu plateb (`platbyProj.dopocet`, `milniky.cz`) — do dokumentu jdou přes přeložené
  `PROJ_PLATEBNI_PODMINKY` / `PROJ_PLATBY_*`.

## Testy

- `src/test_proj_zbytky_preklad.js`: +4 kontroly rekapitulace — před opravou **70/3**, po **73/0**.
- `./spust_testy.sh --smoke`: viz CHANGELOG v16.10.5.
- Mutace: nová kontrola hlídá data slovníku, ne logiku — sada PROJ překladů v `SADY` mutací není
  a mutace hesla slovníku by byla jen smazání řádku, které test chytá přímo (pojistka 70/3); cílené
  mutace se proto nepouštěly.
- `python3 nastroje/kontrola_udaju.py` čistá, `python3 build.py --kontrola-verze`, `roadmapa.py --kontrola` čistá.
