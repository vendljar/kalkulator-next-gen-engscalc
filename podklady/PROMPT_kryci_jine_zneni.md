# Prompt pro kódové sezení — O1: „jiné znění" v krycím listu obchází zámek odeslané nabídky

Komunikace česky, nikdy AskUserQuestion. Platí `CLAUDE.md`. Nález z dávky v14.10.5 (krycí list odeslané nabídky se dá doplňovat).

Chyba: `klVyber` (`src/ui/kryci_ui.js`) a `klpVyber` (`src/ui/kryci_proj_ui.js`) při volbě „jiné znění" (`KL_JINE_ZNENI`) rovnou `delete KL.hodnoty[id]` / `KLP.hodnoty[id]` a `render()` — bez dotazu na zámek. U pole cenové nabídky (např. typ smlouvy, způsob fakturace) zamčené varianty tak tiše smaže ruční hodnotu; server pak uložení odmítne „Neuloženo: změnila by se data uzamčené (odeslané) nabídky" a obchodník neví proč. Ostatní zápisy krycího listu hlídá obal v `src/ui/zamek_ui.js` (`ZAMEK_CHRANENE`, `ZAMEK_KRYCI_FUNKCE`, model `zamekKryciPoleVolne` v `src/zamek.js`).

1. Větev `claude/kryci-jine-zneni` nad `origin/test` (při zadání 3538875, v14.10.5). Do `test-draft` / `test` / `main` nic.
2. Nejdřív test (pojistka): rozšiř `overit_kryci_po_tisku.mjs` (případně `src/test_kryci_po_tisku.js`) o případy: zamčená varianta, `klVyber('<pole nabídky>', KL_JINE_ZNENI)` hodnotu nesmaže a ukáže dialog „Uzamčená varianta"; u pole mimo nabídku „jiné znění" projde; po tisku SoD nic. Doložit, že nad v14.10.5 selže.
3. Oprava: `klVyber` a `klpVyber` do `ZAMEK_CHRANENE` i do `ZAMEK_KRYCI_FUNKCE` (list `kryci` / `kryciProj`) — výchozí návrh; jiné řešení zdůvodni. Ověř, že `overit_lista.mjs` (kontrola obalení) projde a že `klpVyber` → `klpSet` neukáže dialog dvakrát.
4. Mutace: ke každé nové kontrole významová mutace (`netlify/mutace.mjs` u serveru, harness u UI — pokud mutace UI nejde, napiš proč).
5. Verze podle dne commitu: 14. 10. → v14.10.7, 15. 10. → v15.10.2 (v14.10.6 / v15.10.1 drží integrace I1) (`python3 build.py --kontrola-verze`). CHANGELOG oddíl `## v<verze> — „jiné znění" v krycím listu respektuje zámek (větev claude/kryci-jine-zneni)`, PREDAVKA nahoru, příručka jen pokud se mění chování popsané v ní.
6. `./spust_testy.sh --smoke` zelené (KNG_PODKLADY se šablonami z Drive, viz `podklady/PROMPT_kolo_v14_10_5.md` bod 2), commit s počty před/po, push. Celé kolo s mutacemi jen pokud zbude čas do 14:00 (jinak napiš, že čeká na integraci).
7. Zpráva J. V.: co, testy před/po, otevřené otázky; o sloučení rozhodne J. V.
