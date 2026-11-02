# Zadání: Pipedrive po odpovědi integrátora (2. 11. 2026)

Pracuj česky a podle `CLAUDE.md`. Založ paralelní větev `claude/pd-odpoved-02-11` nad `origin/claude/integrace-16-10`
(141b92f, v2.11.2), pokud koordinace neurčí jiný commit. Do `test-draft`, `test` ani `main` nic, slučuje koordinace
na pokyn J. V. Nejdřív si přečti `PREDAVKA.md` v integraci a oddíl 2. 11. v `PREDAVKA.md` větve
`claude/eager-carson-1xznt2`.

## Co se stalo

Integrátor 2. 11. odpověděl na e-mail J. V. z 23. 10. Sezení `claude/eager-carson-1xznt2` výsledek ověřilo
čtením v Pipedrive (konektor, bez zápisu):

| Bod | Odpověď | Stav v Pipedrive 2. 11. |
| --- | --- | --- |
| „Typ zakázky“ místo pole #10 | ano | volby: Realizace, Realizace - OCK AKU, Realizace - Zahraničí, Projekce, Projekce - Výtah + OCK, Projekce - Velké projekty |
| „Objekt v památkové ochraně“: „Zjišťuje se“ | hotovo | Ano / Ne / Zjišťuje se |
| „Způsob fakturace“: čtyři volby pro projekci | hotovo | Náš standard, Měsíční, Po dokončení stupňů dokumentace, Po předání stupňů dokumentace, Záloha, zbytek po předání stupňů dokumentace, Po milnících činností (plán plateb), Podle dohodnutého plánu plateb |
| „Hlavní projektant“ jako Text | hotovo | `varchar` |
| „Platební kalendář SoD PROJ“ | hotovo | `text` (Velký text) |
| sekce „Krycí list“ a bez „důležitosti“ nových polí | nastaví kolega integrátora | API neukazuje |
| vyvolání cenové nabídky z Pipedrive | návrh: vlastní pole „Vygenerovat nabídku“, automatizace Pipedrive pošle webhook s ID dealu, kalkulátor načte data a vygeneruje dokument | pole zatím není |

Mapa polí z integrace (`POLE_DEALU`, 67 polí) se se skutečným účtem páruje u **66 ze 67** názvem i typem. Nesedí jen
„Hlavní projektant“: kalkulátor čeká `user`, účet má `varchar`.

## Úkol

1. **„Hlavní projektant“ jako text:** v `netlify/lib/pd_mapa.mjs` změnit druh `hlavniProjektant` z `uzivatel` na `text`
   (zdroj PROJ `hlavniProjektant`, „jméno, autorizace“ z krycího listu). `varchar` pojme nejvýš 255 znaků, delší
   hodnota se nepošle s důvodem jako u ostatních textů. „Nabídku vypracoval“ a „Odpovědná osoba za projekci“ zůstávají
   Uživatel.
2. **„Platební kalendář SoD PROJ“ je založený:** z `PD_DOSUD_NEZALOZENA` ho odebrat, ať ho simulátor i přehled mapy
   polí berou jako existující.
3. **Volby účtu v simulátoru** (`PD_VOLBY_UCTU` v `pd_mapa.mjs`): „Způsob fakturace“ všech sedm voleb, „Objekt
   v památkové ochraně“ s „Zjišťuje se“, „Typ zakázky“ všech šest voleb (texty z tabulky výše).
4. **Převod vět kalkulace PROJ na nové volby „Způsobu fakturace“** (`planZpusobFakturace` v `src/plan_plateb.js` →
   `pdVolba` v `netlify/lib/pd_prevod.mjs`):
   - „podle dohodnutého plánu plateb“ → „Podle dohodnutého plánu plateb“ (shoda po normalizaci, ověřit testem),
   - „po předání jednotlivých stupňů dokumentace“ → „Po předání stupňů dokumentace“,
   - „záloha X % po podpisu smlouvy, zbytek po předání jednotlivých stupňů dokumentace“ (X proměnné) → „Záloha,
     zbytek po předání stupňů dokumentace“,
   - „po milnících jednotlivých činností podle plánu plateb“ → „Po milnících činností (plán plateb)“,
   - „po dokončení jednotlivých stupňů dokumentace“ → „Po dokončení stupňů dokumentace“ (synonymum už je).

   Pozor na synonymum OCK `po milnicich` → „Náš standard“: věta PROJ „po milnících jednotlivých činností…“ se na něj
   nesmí chytit. Neznámá věta se dál nepošle s důvodem.
5. **Roadmapa:** #509 uzavřít (odpovědi integrátora jsou, co z nich plyne, je v `pd_mapa.mjs` / `pd_prevod.mjs`).
   Novou položku „Webhook Vygenerovat nabídku“ založit jako **návrh k rozhodnutí J. V.**, bez kódu: doporučená varianta
   A — kalkulátor podle ID dealu deal sám načte (data z webhooku nebere), založí nebo aktualizuje kalkulaci se zadáním
   podle §12 (#113) a do dealu vrátí odkaz. Nabídku vygeneruje obchodník po dopočítání, cena vzniká jen výpočtem
   a dokumenty se tvoří v prohlížeči. Webhook chrání tajný klíč v proměnné prostředí Netlify, nastavuje ho J. V.
   Navazuje na #113 a #117. Musí splnit podmínky SEC-PD a K8-S3 z #115 a `BEZPECNOST_MEZE.md` (kořen repozitáře). Číslo položky
   přidělí koordinace.

## Testy a pojistky

- `netlify/test_pd_prevod.mjs`, `test_pipedrive.mjs`, `test_pd_simulator.mjs`, `test_pd_nanecisto.mjs`,
  `test_pd_mapa_prehled.mjs`: Hlavní projektant jako text (a delší než 255 znaků se nepošle), Platební kalendář
  v simulátoru existuje, pět vět PROJ → správné volby, věta PROJ „po milnících…“ ≠ „Náš standard“. Ke každému pravidlu
  mutace v `netlify/mutace.mjs`. Pojistka: na 141b92f nové testy selžou (napsat do commitu).
- Celé kolo `nastroje/testovaci_kolo.sh`. Mutace serveru po částech (#543, 16 částí). Statické kontroly až po commitu.
- Do živého Pipedrive nic. Čtení přes konektor jen se souhlasem J. V.

## Mimo tuto dávku (čeká na J. V.)

- Zkušební zápis na dealu „TEST – integrace kalkulačky“: J. V. ho navrhl integrátorovi na týden od 2. 11. Dva kroky:
  (a) přes konektor Pipedrive v sezení s potvrzením J. V. — založit, zapsat po hodnotě každého typu, přečíst, smazat;
  (b) z testovacího webu po vložení tokenu do Netlify (podle `podklady/PIPEDRIVE_TOKEN_POSTUP.md`).
- Rozhodnutí o dvou kalkulacích na jednom dealu (`podklady/PIPEDRIVE_ROZHODNUTI_115.md`, doporučeno B).
- Rozhodnutí o webhooku „Vygenerovat nabídku“ (varianta A, nebo B: dokument na serveru — nedoporučeno).
- Koncept upomínky `podklady/PIPEDRIVE_UPOMINKA_INTEGRATOR.md` už není potřeba (integrátor odpověděl).

## Podklady mimo repozitář

- souhrn se stavem k 2. 11., schématy a konceptem odpovědi integrátorovi: https://claude.ai/artifact/XSFa1QVnFCWXoLpzx7yD8u
- Výsledek testu polí: https://claude.ai/artifact/RCVznN7Dn2goRM8TmuAZfz
- mapovací tabulka `Pipedrive_Kalkulator_mapa_poli_2026-11-02.xlsx` má J. V.
