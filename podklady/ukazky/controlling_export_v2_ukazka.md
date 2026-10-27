# Ukázka exportu pro controlling

Stará ukázka (verze struktury 2, generátor `vyrob_controlling_export_v2.js` a sešit
`controlling_export_v2_ukazka.xlsx`) byla smazána — po změně výchozího výběru exportu už nic nevyvážela.

Aktuální ukázku vyrábí dnešním kódem nástroj **`nastroje/ukazka_controlling_export.js`**
(`node nastroje/ukazka_controlling_export.js` → `podklady/controlling/UKAZKA_2026-CONTROLLING-EXPORT_v<verze>.xlsx`);
popis listů a zakázek je v `podklady/controlling/POPIS.md`. Nástroj hlídá v každém testovacím kole
`src/test_ukazka_controlling.js`.
