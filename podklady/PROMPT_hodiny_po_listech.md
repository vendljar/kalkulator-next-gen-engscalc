# Dávka S8 — hodiny v krycím listu jen za vlastní stranu (verze v15.10.10)

Nejdřív přečti `podklady/_SPOLECNE_15_10.md` (stejná větev) — platí celé. Větev `claude/hodiny-po-listech` **nad `origin/claude/integrace-15-10`** (nebo nad `origin/test`, pokud už obsahuje v15.10.7+).

Zadání J. V. 15. 10. 2026 (se snímkem tabulky „Hodiny z kalkulace" se sloupci OCK i PROJ): „V krycím listu zakázky hodinách PROJ a OCK zobrazuj vždy jen tu část, která patří do konkrétního krycího listu. Pokud je to krycí list OCK, tak jen část hodin z OCK. Pokud je to krycí list PROJ, tak jen odpovídající část hodin z kalkulace PROJ. Dnes se nám do hodin propisuje vše z OCK i PROJ a to i v případě, že druhá kalkulace PROJ, resp. OCK není počítána a měla by být uzamčená."

Kód: `kryciHodiny(zak, varianta, jekly)` a `kryciHodinySekce(…)` v `src/kryci.js` (vrací `{ sloupce: ['', 'OCK', 'PROJ'], radky }`), `kryciHodinyBlok(kde)` v `src/ui/kryci_ui.js` (volá se s `'ock'` a `'proj'`), výstupy krycího listu (tisk, Word `docxgen.js` — tabulka hodin, `kryciData`/`kryciProjData` verze BO). Rozhodnutí v14.10.2 („v kombinaci s P6 vyplňuje tabulka hodin jen sloupec vedoucí strany") tímto zadáním nahrazuje pravidlo: **každý list jen svou stranu**.

1. `kryciHodiny` dostane stranu (`'ock'` | `'proj'`) a vrátí jen její řádky a jeden sloupec hodnot (`sloupce: ['', 'OCK']` resp. `['', 'PROJ']`, celkem jen za tu stranu). Krycí list OCK → jen hodiny z Kalkulace OCK; krycí list PROJ → jen z Kalkulace PROJ (AD dál „max. 30 h / měsíc", do celku se nepočítá).
2. Když je strana listu vyřazená / uzamčená (P6: číslo OPR → PROJ vynulovaná, číslo OVP → OCK vynulovaná; `jenProj`/`jenOck`; `stranaZamcena`), tabulka hodin v jejím listu se nevypíše vůbec (žádné nuly ani čárky).
3. Všechny výstupy stejně: obrazovka, tisk, Word krycího listu (docxgen — ověř, že tabulka s jedním sloupcem hodnot vyjde; mutace HOD 14. 10. v `mutace_jadro.mjs` upravit, ať dál míří na skutečnou podmínku), verze BO/Tech.
4. Testy: jednotkové (OCK list = jen OCK, PROJ list = jen PROJ, vyřazená strana = bez tabulky, zakázka s oběma stranami), harness v prohlížeči (oba listy, číslo OPR i OVP), Word krycího listu; pojistka před/po; mutace k nové podmínce.
5. Verze **v15.10.10**, CHANGELOG, příručka (kapitola 24 — hodiny v krycím listu), PREDAVKA, roadmapa (#414 hodiny z kalkulace — poznámka o změně), smoke, push.
