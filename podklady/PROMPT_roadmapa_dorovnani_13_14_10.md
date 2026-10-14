# Prompt pro kódové sezení — R2: dorovnání roadmapy za dávky 13.–14. 10. 2026

Komunikace česky, nikdy AskUserQuestion. Jen zápis do roadmapy, kód aplikace se nemění. Postupuj podle skillu `roadmapa-kng`; editovat jen `roadmapa/roadmap.json` (vkládat textově, soubor nepřeformátovávat — viz `podklady/PROMPT_roadmapa_405_406.md` bod 2), `ROADMAPA.html` / `ROADMAPA.md` jsou generované.

**Spustit až po dávce R1** (`claude/k24-roadmapa-p5`, #405/#406). Větev `claude/roadmapa-13-14-10` nad `origin/claude/k24-roadmapa-p5` (nebo nad `origin/test`, pokud už R1 sloučil J. V.). Do `test-draft` / `test` / `main` nic.

Roadmapa stojí na `meta.stavKDatu` 12. 10. 2026 (v12.10.4). Dorovnat podle CHANGELOG (oddíly v13.10.1 až v14.10.5 na `origin/test`, plus nesloučené větve `claude/slovnik-14-10` v14.10.4 a případné noční dávky):
1. U každé dávky dohledat, které položky roadmapy uzavřela nebo posunula (čísla v CHANGELOG a zprávách commitů) → `stav`, `hotovoV`, `pozn`. Položky ve stavu `ceka` / `blokovano`, které už jsou podle CHANGELOG hotové (např. ověřit #345, #366, #367, #369, #380), uzavřít jen s doložením (commit / oddíl CHANGELOG); nejisté vypsat do zprávy, neměnit.
2. Nové položky (další volná čísla po #406; ověř větve `claude/*`): #404 lišta (už je?), autorský dozor jen když se nabízí (v14.10.2), název akce specifikace z hlavičky, sokl ve specifikaci, hodiny z kalkulace v krycím listu BO, K23T-N1 opláštěná prohlubeň (v14.10.2/3), krycí list odeslané nabídky se dá doplňovat (v14.10.5), zápis v OR se nepřekládá + řádek AD ve slovníku (v14.10.4, nesloučeno — stav podle skutečnosti), nález „jiné znění" obchází zámek (O1). Před založením zkontrolovat, zda už položka neexistuje.
3. `meta.poradi`: řádky za 13. a 14. 10.; `meta.stavKDatu` a `meta.build` na poslední verzi v `test`.
4. `cd roadmapa && python3 roadmapa.py --kontrola && python3 roadmapa.py`; `git diff --stat` jen `roadmapa/roadmap.json`.
5. Jeden commit („Roadmapa: dorovnání za 13.–14. 10. 2026"), push, zpráva J. V.: co uzavřeno, co nově, co nejisté (k rozhodnutí); o sloučení rozhodne J. V. Verzi nezvyšovat.
