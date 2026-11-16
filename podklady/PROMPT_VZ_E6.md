# Prompt VZ-E6 — rejstřík a Přehled, controlling, překlady, příručky, celé kolo

Společná pravidla: `PROMPT_VZ_SPOLECNE.md`. Návrh § 6, § 8, § 9 (R5, R6). Větev `claude/vz-e6` nad SHA od
koordinace (po E5 a E5b). Odhad: 1–2 sezení. Vzor: závěr víc šachet (VS-E6, #596).

## Co udělat

1. **Rejstřík:** nepovinný klíč `zakaznici: [{ nazev, cislo, stav }]` jen u zakázek s víc zákazníky
   (`uloRejstrikZaznam`, `uloRejstrikNormalizuj`; vzor `uloRejstrikSachty`), strop počtu (9) a délek; `objednatel`
   zůstává řídící zákazník; **bez cen**. Zakázka s jedním zákazníkem = rejstřík beze změny.
2. **Přehled cenových nabídek:** štítek „N zákazníci“ u zákazníka (jen ZAP), hledání i podle názvu dalšího zákazníka
   (`seznam.js`, `ui/online_ui.js`).
3. **Controlling a exporty:** popis zakázky s počtem zákazníků; ověř, že se nic nepočítá dvakrát.
4. **Víc šachet × víc zákazníků:** jeden společný harness (tisk CN se šachtami pro druhého zákazníka, obě poznámky
   v dealu) — R6.
5. **Překlady** EN/DE/FR nových textů, které jdou do dokumentů (pozor na pravidlo slovníku: heslo bez ohledu na
   velikost písmen).
6. **Dokumentace:** manuál obchodníka (nová kapitola „Víc zákazníků na jedné zakázce“ se snímky), příručka správce
   (vypínač, poznámka a organizace v Pipedrive, kdo smí co), provozní dokumentace (`manual/kompletni/provoz.json`),
   `manual_vypocet/cisla_vydani.json` jen když se změnil počet pravidel kontrol.
7. **Roadmapa a CHANGELOG:** souhrn VZ, `roadmapa.py --kontrola`.
8. **Celé kolo s mutacemi po částech** podle `CLAUDE.md` (jádro N = 4, server N = 16), každá část v samostatném
   worktree; přeživší mutace vyřeš nebo zdůvodni.
9. **Závěrečná kontrola úniku:** `test_vz_unik.js` pokrývá všechny výstupy přidané v E2–E6 (rejstřík smí nést
   názvy, ne ceny ani kontakty).

## Testy

`netlify/test_vz_rejstrik.mjs`, rozšířené `overit_vz_*.mjs`, zlatá sada, harness VYP = báze znak po znaku nad
celou funkcí. Kolo: hlas „VŠE ZELENÉ“ jen po všech částech mutací.

## Otevřené body k předání J. V.

Ruční zkouška scénářů prototypu na testovacím webu se zapnutým vypínačem (včetně poznámky a organizace proti
simulátoru), založení ničeho v ostrém Pipedrive bez jeho pokynu, rozhodnutí o zapnutí na ostrém.
