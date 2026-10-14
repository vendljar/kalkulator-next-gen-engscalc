# Prompt pro kódové sezení — I1: sloučení `claude/slovnik-14-10` do `test` (JEN po schválení J. V.)

Komunikace česky, nikdy AskUserQuestion. Platí `CLAUDE.md`. **Spusť jen, pokud J. V. sloučení slovníku výslovně schválil** (bez schválení místo toho běží dávka K1).

Stav při zadání: `test` = 3538875 (v14.10.5, krycí list odeslané nabídky), `claude/slovnik-14-10` = v14.10.4 nad v14.10.3 (zápis v OR se nepřekládá, řádek autorského dozoru „100 % z celkové ceny…, fakturováno měsíčně" ve slovníku EN/DE/FR + odstavec AD se překládá, výchozí volby v14.10.2 rozhodnuté). Celé kolo nad slovníkem: viz CHANGELOG té větve.

1. Větev `claude/integrace-14-10c` nad `origin/test`; `git merge --no-ff origin/claude/slovnik-14-10` (bez rebase). Konflikty čekej v `CHANGELOG.md` (oba oddíly ponechat, novější nahoře), `PREDAVKA.md` (ruční sloučení, nový oddíl nahoru), `manual/obsah.json` (úvod „Co je nového" — obě novinky, oprava věty o zápisu v OR) a `verze.txt` → nová verze podle dne commitu (14. 10. → v14.10.6; 15. 10. → v15.10.1; ověř `python3 build.py --kontrola-verze`).
2. Rychlé ověření: `./spust_testy.sh --smoke`, `node mutace_jadro.mjs --kontrola`, `node netlify/mutace.mjs --kontrola`, `python3 nastroje/kontrola_udaju.py`.
3. Celé kolo s mutacemi odpojeně (postup jako v `podklady/PROMPT_kolo_v14_10_5.md` body 2–4: podklady z Drive, příručka ze snímků pro novou verzi, setsid + until-smyčka, mutace nepřerušovat). Musí být VŠE ZELENÉ.
4. Teprve po zeleném kole: výsledek do CHANGELOG a PREDAVKA, fast-forward `test` na integrační větev (`git push origin HEAD:test`, ověř `merge-base --is-ancestor`). `test-draft` a `main` beze změny.
5. Zpráva J. V.: commity, konflikty a jak vyřešené, kolo, odkaz na release nové verze s popisem (`nastroje/release_odkaz.py`), verze bez releasu (GitHub), větve ke smazání (`claude/slovnik-14-10` po sloučení — odkaz `…/branches/all?query=…`).
