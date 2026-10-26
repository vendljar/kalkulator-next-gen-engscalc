Dávka O2 #517 — zbylá rozhodnutí J. V. z dialogu K8/S1 (26. 10. 2026: „ostatní podle návrhu“) + dokončení #319 (T4). Komunikace česky, platí CLAUDE.md, skilly kalkulator-next-gen a testovaci-procedura-kng. Koordinace: session_01TMQ5bLDJuS5k5NWWYy7jLx.

Větev `claude/o2-rozhodnuti` nad SHA_O1 (= integrace po sloučení O1 #516, v26.10.1). **Cílová verze v26.10.2** (pokud commity vzniknou až 27. 10., pak v27.10.1 — podle kontroly verze). Číslo roadmapy **#517**.

## Rozhodnutí J. V. (dialog https://claude.ai/artifact/V288Ytg33SpoYPfp3aTw3L, návrhy platí)
Podrobnosti, místa v kódu a návrhy oprav: `podklady/K8_AUDIT_24_10.md`, `podklady/SEC_AUDIT_24_10.md`, reprodukce `podklady/S1_pokusy/`.
1. **K8-K2 + K8-K3 = A:** tisk během kolize verzí / v náhledu role → dialog `ONLINE_TISK_NEULOZEN` (s `opts.fronta` v cestách kolize/náhledu), v `onlineKolizeNacti` varovat, je-li v ZAK zámek, který v `posledni` není; po zápisu se změnou během letu nevolat `historieZalohaHotovo` a „uloženo“ nastavit na odeslaný otisk (varování při zavření okna a záloha zůstanou).
2. **K8-K4 = A:** bez přihlášení (a v režimu složky) se po tisku nečeká na uložení (jako u souboru); hláška zmíní přihlášení.
3. **SEC-S3 = A:** v tiskovém náhledu se zámkem jsou cenové prvky dokumentu (`nabidkaTisk`, `nabidkaProjTisk`) `contenteditable="false"`; ostatní text zůstává upravitelný. Test podle `podklady/S1_pokusy/klient/tisk_uprava_ceny.mjs`.
4. **SEC-S5 = A:** kontrola součtu splátek OCK = 100 % (jako `planPlateb100` u PROJ) — upozornění v krycím listu a blok tisku SoD; dílčí faktura č. 2 se neztratí tiše. Test podle `podklady/S1_pokusy/funkce/p2_ock_splatky.js`.
5. **SEC-I7 = A:** smazání, vypnutí, archivace a snížení role jiného (ne hlavního) administrátora vyžaduje heslo správce (jako u hlavního; `netlify/functions/uzivatele.mjs`).
6. **#319 T4:** dokončit převod zbylých harnessů na společné zaokrouhlení/kontroly (viz pozn. #319 a `podklady/` k T4) a #319 uzavřít.
7. **Jen zapsat (nic neprogramovat):** SEC-PD (SEC-S7, N9, I15, I16, I17) → do roadmapy #115 jako podmínky zadání (hodnota dealu po SoD = cena díla, jinak cena nabídky); SEC-I8 → do BEZPECNOST_MEZE.md „až při vlastní doméně“; REPO (SEC-V1/V2/S4) → ruční kroky J. V. (posun main/test-draft, smazat větev claude/testovani-po-opravach, zrušit sdílení odkazu na vlákno Pipedrive, staré tagy ponechat) do PREDAVKA.

Každá oprava: test s pojistkou (před opravou selže, po ní projde — do commitu), mutace k pravidlům (filtr „#517“, nikdy `--help`), dotčené Node sady, `bash nastroje/testovaci_kolo.sh --jen build,staticke`. CHANGELOG, příručka „Co je nového“ (srozumitelně pro obchodníky — nový dialog po tisku, kontrola 100 % splátek OCK, needitovatelné ceny v náhledu), roadmapa #517 (+ uzavřít #319), PREDAVKA.md (tabulka ✅/⬜). Bez cen a osobních údajů.

Vyhýbej se příkazům, které potřebují schválení; prohlížečové sady ručně nepouštěj (cílené Playwright pokusy k testům ano). Na Google Disk nic, do živého Pipedrive nic. Pushuj jen do své větve (průběžně), neslučuj; hotovo a problémy hlas koordinaci přes send_message (session_01TMQ5bLDJuS5k5NWWYy7jLx). Dlouhé běhy neposílej na pozadí a nekonči tah, dokud neskončí. `KNG_NEZVYSOVAT_VERZI=1` jen u sestavení, neexportovat.
