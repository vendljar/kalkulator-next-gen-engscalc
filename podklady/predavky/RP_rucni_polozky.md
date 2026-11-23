# RP — ruční položky kalkulace OCK v nabídce CN a krycím listu (#736 prac.)

Větev `claude/rp-rucni-polozky` nad integrací d655295, pracovní v23.11.5. Rozhodnutí J. V. 23. 11. 2026 (podnět CN-431).

**Stav 23. 11.:** KROK 1 prototyp hotov (commit 3bed52c), artefakt https://claude.ai/artifact/N9Ro3detwDcydtf1XtDjxu,
odkaz a otázky a)–f) poslány koordinaci. Čeká se na připomínky J. V.

**Převod sekcí:** Hrubá OCK, ATYP, Spojovací, Lakování → KONSTRUKČNÍ ŘEŠENÍ ŠACHTY; Opláštění → OPLÁŠTĚNÍ ŠACHTY;
Volitelné → DOPLŇKOVÉ KONSTRUKCE; Režie → PROJEKČNÍ A PŘÍPRAVNÉ PRÁCE; (návrh) Můstky → MŮSTKY MEZI BUDOVOU A OCK.

**Kód:** `src/rucni_polozky.js` (nový, v build.py za techspec.js), nabidka.js (rozpis ceny jen s ruční položkou,
`nabidkaRucniCenaKlon`, řádky přes docxRadkyNavic, víc šachet `__radkyNavic` ve smyčce docxgen), nahled_word.js,
zakazka_ui.js, kryci.js (`rucniPolozky`, `jenKdyz`, `mimoPipedrive`), pd_nanecisto.js, kontroly.js
(`rucniPolozkaCesky`), kalk_ock.js (`rpPodRadek`, `rpJazykSet` v ZAMEK_CHRANENE), preklad.js (bm, kpl, m² — návrh).

**KROK 2 (po odsouhlasení):** test `src/test_rp_rucni_polozky.js` s pojistkou (na d655295 selže); upravit
test_kontroly (počet pravidel), test_kryci (pole s `jenKdyz`), přegenerovat zlatou sadu VS (rozdíly jen se ruční
položkou); mutace [RP]; kolo `--bez-mutaci --proti origin/claude/integrace-16-10` + `--ocekavane`; CHANGELOG,
příručka, roadmapa #736; revize Fable.
