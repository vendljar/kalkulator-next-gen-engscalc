# Prompt pro kódové sezení — celé testovací kolo nad `test` v14.10.5 (noc 14./15. 10. 2026)

Komunikace česky, nikdy AskUserQuestion: u nejasností zvol výchozí návrh a uveď ho v závěrečné zprávě. Platí `CLAUDE.md` a skill `testovaci-procedura-kng`.

Proč: `test` = v14.10.5 (krycí list odeslané nabídky se dá doplňovat, větev `claude/kryci-odemceny-14-10`) šel do `test` jen po sadách (244/0/1) a cílených mutacích. Celé kolo s mutacemi nad ním zatím neběželo. Kód se v téhle dávce NEMĚNÍ, pokud kolo nenajde chybu.

1. Založ větev `claude/kolo-14-10-5` nad `origin/test` (při zadání 3538875; posunul-li se `test`, vezmi aktuální a napiš to). Do `test-draft`, `test` ani `main` nic.
2. Podklady do vlastní složky mimo repozitář (`/home/user/kng_podklady_kolo-14-10-5`): firemní šablony z Google Drive (konektor Google Drive) — CN v7, v11 (+EN, DE), v13/v14/v15 (+EN/DE/FR), PROJ v3 (+EN/DE/FR, kopie i jako `Sablona_NABIDKA_PROJ.docx`), PROJ v4 (+EN/DE/FR), SoD realizace a projekce v1 i v2, plná moc. Stahování nech subagentovi (velké soubory jdou do `…/tool-results/…txt` jako base64), každý soubor ověř `zipfile.testzip` a velikostí. Příručku sestav ze snímků pro aktuální verzi: `KNG_NEZVYSOVAT_VERZI=1 python3 build.py`, `NODE_PATH=$(npm root -g) node manual/snimky_auto.mjs <složka>/snimky.json`, `bash manual/sestav.sh <složka>/snimky.json <složka>`. Playwright: `mkdir node_modules && ln -s $(npm root -g)/playwright node_modules/playwright` (nikdy odkaz na celou složku node_modules).
3. Kolo odpojeně: `KNG_PODKLADY=<složka> NODE_PATH=$(npm root -g) setsid nohup bash -c "bash nastroje/testovaci_kolo.sh; echo KOLO_KONEC_KOD=\$?" > <scratchpad>/kolo.log 2>&1 < /dev/null &`. Hlídat until-smyčkou nad logem na pozadí (`until grep -q KOLO_KONEC_KOD …; do sleep 30; done`, timeout max 2 h — po vypršení spustit znovu; ne `pgrep`). Mutace nikdy nepřerušovat a během nich v pracovní kopii nic necommitovat (stop-hook hlásí dočasné mutace jako necommitnuté změny — ignorovat).
4. Musí být VŠE ZELENÉ (sady, mutace jádra 202/202, mutace serveru 400/400, statické 3/3). Při selhání: rozbor, oprava ve větvi s pojistkou (test před opravou selže, po ní projde), znovu dotčený krok; verze podle dne commitu (14. 10. → v14.10.9, 15. 10. → v15.10.4 — nižší čísla drží souběžné dávky I1, O1 a P1).
5. Výsledek do CHANGELOG (oddíl v14.10.5 → odstavec „Celé kolo nad …") a nahoru do PREDAVKA; commit a push do `claude/kolo-14-10-5`.
6. Kontext: `get_session` (bez id) → `context_usage` na konci; nad 60 % upozornit, nad 75 % přepsat PREDAVKA a doporučit nové sezení.
7. Zpráva J. V.: výsledek kola s počty a časem, případné opravy, odkaz na release v14.10.5 (`python3 nastroje/release_odkaz.py 14.10.5 <plný SHA test>`, popis dočistit) a verze bez releasu (ověřit přes GitHub).

Pokud J. V. mezitím schválí sloučení slovníku (dávka I1), tahle dávka odpadá — kolo pustí I1 nad sloučeným stavem.
