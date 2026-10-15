# Dávka S7 — krycí list: název „Krycí list zakázky OCK" a pole „Číslo SoD" (verze v15.10.8)

Nejdřív přečti `podklady/_SPOLECNE_15_10.md` (stejná větev) — platí celé. Větev `claude/kryci-cislo-sod` **nad `origin/claude/integrace-15-10`**.

Zadání J. V. 15. 10. 2026 (se snímky obou krycích listů): „Krycí list objednávky / SoD přejmenuj na Krycí list zakázky OCK. Pod číslo nabídky přidej i položku a okno Číslo SOD. To platí jak pro OCK, tak pro PROJ."

1. **Přejmenování:** nadpis stránky `src/ui/kryci_ui.js` („Krycí list objednávky / SoD") → **„Krycí list zakázky OCK"**; totéž v nadpisu dokumentu `src/kryci.js` (`kryciData`: „Krycí list objednávky / SoD — <verze>" → „Krycí list zakázky OCK — <verze>"), v `ZAMEK_DOKUMENTY.kryci.popis` (`src/zamek.js`), v komentářích a textech, které uživatel vidí (záložka už se jmenuje „Krycí list zakázky OCK"), v příručce (`manual/obsah.json`). Jméno souboru Wordu/tisku sjednotit, pokud nese starý název. Harnessy a testy, které hledají starý text, upravit.
2. **Pole „Číslo SoD"** v sekci *Základní údaje* hned pod *Číslo nabídky (CN)* — v `KRYCI_SEKCE` (`src/kryci.js`) i `KRYCI_PROJ_SEKCE` (`src/kryci_proj.js`): `{ id: 'cisloSod', label: 'Číslo SoD', verze: ['bo', 'techdata'], src: 'ručně' }` — ruční textové pole bez předvyplnění (návrh dalšího čísla řady z #366 čeká na čísla papírových smluv — mimo rozsah). Každý krycí list má své (OCK = SoD realizace, PROJ = SoD projekce).
   - Sekce *Základní údaje* není v `KRYCI_NABIDKA_SEKCE` → pole jde doplnit i po odeslání nabídky (zámek v14.10.5) a zamkne se tiskem SoD. Ověř testem (`src/test_kryci_po_tisku.js`).
   - **SoD:** pokud šablony smluv o dílo (realizace i projekce, v1 i v2 — `KNG_PODKLADY`) mají symbol pro číslo smlouvy, naplnit ho z tohoto pole (`kryciSodSymboly` / `kryciProjSodSymboly`); pokud žádný nemají, přidat symbol `{{SOD_CISLO}}` do seznamu symbolů SoD a zapsat do CHANGELOG, že šablonu doplní J. V. (vyrob_sablony.js jen pokud je to jednoduché). Prázdné pole = symbol prázdný, jako dnes.
   - Pole se objeví i ve výstupech krycího listu (tisk, Word, verze BO/Tech) podle `verze`.
3. Testy: jednotkové (pole v obou sekcích za `cisloCN`, nadpisy), harness v prohlížeči (pole je vidět pod Číslem nabídky v obou listech, zápis se uloží, u odeslané nabídky jde doplnit bez dialogu), pojistka před/po, mutace k nové kontrole (pokud nějaká vznikne).
4. Verze **v15.10.8**, CHANGELOG, příručka, roadmapa (#366 poznámka: ruční pole Číslo SoD hotové v15.10.8, návrh řady dál čeká), PREDAVKA, smoke, push.
