# RP — ruční položky kalkulace OCK v nabídce CN a krycím listu (#736, #740)

Větev `claude/rp-rucni-polozky` nad d655295, sloučeno s integrací 0fd6410 (v24.11.1); pracovní v24.11.2 (číslo přidělí
koordinace). Rozhodnutí J. V. 23. 11., prototyp a doporučení a)–f) odsouhlaseny 24. 11. (přes koordinaci).

**Stav 24. 11.: HOTOVO, k revizi Fable (dokument + cena).** Prototyp https://claude.ai/artifact/N9Ro3detwDcydtf1XtDjxu.

**Kolo** `--bez-mutaci --proti origin/claude/integrace-16-10 --ocekavane podklady/porovnani/ocekavane_rp_rucni_polozky_2026-11-24.txt`:
VŠE ZELENÉ (sady 536/0/6, hodiny 435/0/1, statické 12/12); porovnání 367: 230 SHODA, 137 očekávaných, 0 neočekávaných —
jen text CN/SoD a rozpis ceny (CENA_SACHTA_BEZ_DPH, CENA_BEZ_DPH_SACHTA, CENA_BEZ_DPH_CELKEM), cena a výsledek beze změny.
Důkaz: s `rucniPolozkyVysledku → []` SHODA 367/367. Mutace [RP] 18/18, `mutace_jadro.mjs --kontrola` 1351/1351.

**Převod sekcí:** Hrubá OCK, ATYP, Spojovací, Lakování → KONSTRUKČNÍ ŘEŠENÍ ŠACHTY; Opláštění → OPLÁŠTĚNÍ ŠACHTY;
Volitelné → DOPLŇKOVÉ KONSTRUKCE; Můstky → MŮSTKY MEZI BUDOVOU A OCK (cena odečtena z řádku můstků); Režie → PROJEKČNÍ…

**K potvrzení J. V.:** řádek `rucniPolozky` v tabulce zmrazení KL (podklady/ZMRAZENI_KL_VOLBY_JV_22_10.json) zařazen
jako Příplatky v nabídce (editovatelne).

**Kód:** `src/rucni_polozky.js`, nabidka.js, docxgen.js (`__radkyNavic`), nahled_word.js, zakazka_ui.js, kryci.js,
pd_nanecisto.js, kontroly.js (`rucniPolozkaCesky`), kalk_ock.js, zamek_ui.js, preklad.js. Testy test_rp_rucni_polozky.js (41),
test_np_nahled_word.js G; upravené test_kontroly, test_kryci, test_platby_ock, zlatá sada VS, cisla_vydani.json, overit_lista.
Kolo vyžadovalo `node_modules/playwright` → /opt/node-tools (necommitováno).
