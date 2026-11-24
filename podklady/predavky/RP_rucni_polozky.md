# RP — ruční položky kalkulace OCK v nabídce CN a krycím listu (#736, #740)

Větev `claude/rp-rucni-polozky` nad d655295, sloučeno s integrací 0fd6410 (v24.11.1) a c89e872 (v24.11.5); verze v24.11.6
(koordinace). Rozhodnutí J. V. 23. 11., prototyp a doporučení a)–f) odsouhlaseny 24. 11. (přes koordinaci).

**Stav 24. 11.: dorevize Fable = SLOUČIT (b36b97a..e1fe98f); D2 doplněno (test H podvrh ks = 7, mutace chycená), D1 → #756 (nízké, neopraveno). Připraveno k fast-forwardu integrace.** Prototyp https://claude.ai/artifact/N9Ro3detwDcydtf1XtDjxu.

**Kolo** `--bez-mutaci --proti origin/claude/integrace-16-10 --ocekavane podklady/porovnani/ocekavane_rp_rucni_polozky_2026-11-24.txt`:
VŠE ZELENÉ (sady 536/0/6, hodiny 435/0/1, statické 12/12); porovnání 367: 230 SHODA, 137 očekávaných, 0 neočekávaných —
jen text CN/SoD a rozpis ceny (CENA_SACHTA_BEZ_DPH, CENA_BEZ_DPH_SACHTA, CENA_BEZ_DPH_CELKEM), cena a výsledek beze změny.
Důkaz: s `rucniPolozkyVysledku → []` SHODA 367/367. Mutace [RP] 18/18, `mutace_jadro.mjs --kontrola` 1351/1351.

**Převod sekcí:** Hrubá OCK, ATYP, Spojovací, Lakování → KONSTRUKČNÍ ŘEŠENÍ ŠACHTY; Opláštění → OPLÁŠTĚNÍ ŠACHTY;
Volitelné → DOPLŇKOVÉ KONSTRUKCE; Můstky → MŮSTKY MEZI BUDOVOU A OCK (cena odečtena z řádku můstků); Režie → PROJEKČNÍ…

**J. V. 24. 11.:** `rucniPolozky` v tabulce zmrazení KL editovatelné (jako Příplatky v nabídce) — potvrzeno.
**J. V. 24. 11. N1:** KL u šachty s ks > 1 „cena/ks × N ks = celkem“ (u 1 ks jen cena) — hotovo, ROZHODNUTI_LOG.
**Před main:** R1 ruční zkouška Wordu na skutečných šablonách CN v18 CZ/EN/DE/FR (testovací sezení; N3 prázdné
odstavce pod „CENA CELKEM“, N8 SoD beze změny).
**N7 (slepé místo nástroje, následná dávka — svěřené):** `nastroje/porovnani_sada.js` i `zlata_vs.js` volají
`kryciData(zak, v, J)` bez verze (0 sekcí) a `nabidkaNahledSekce` bez šachet a ručních položek — krycí list
a náhled porovnání nevidí; věta „krycí list beze změny“ v seznamu očekávaných proto není doložená. Návrh: volat
s verzí `bo` a s `data.sachty`, `data.rucni`, zlatou sadu přegenerovat.

**Kód:** `src/rucni_polozky.js`, nabidka.js, docxgen.js (`__radkyNavic`), nahled_word.js, zakazka_ui.js, kryci.js,
pd_nanecisto.js, kontroly.js (`rucniPolozkaCesky`), kalk_ock.js, zamek_ui.js, preklad.js. Testy test_rp_rucni_polozky.js (41),
test_np_nahled_word.js G; upravené test_kontroly, test_kryci, test_platby_ock, zlatá sada VS, cisla_vydani.json, overit_lista.
Kolo vyžadovalo `node_modules/playwright` → /opt/node-tools (necommitováno).
