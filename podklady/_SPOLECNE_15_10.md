# Společná pravidla dávek 15. 10. 2026 (pokyn J. V.: „rozběhni testy a kola, kde mě nepotřebuješ")

- Komunikace česky, nikdy AskUserQuestion: u nejasností zvol výchozí návrh, zapiš ho do CHANGELOG / PREDAVKA a uveď v závěrečné zprávě.
- Platí `CLAUDE.md`. Větev `claude/…` nad `origin/test` (při zadání 5a42369, v14.10.8). Do `test-draft`, `test` ani `main` nic — sloučení do `test` a celé kolo s mutacemi nad výsledkem dělá koordinační sezení J. V. (session_0191A71yUFarU952Vy7h2hc5). Celé kolo proto NESPOUŠTĚJ; stačí `./spust_testy.sh --smoke` a cílené mutace k novým kontrolám (`node netlify/mutace.mjs "<filtr>"`, `node mutace_jadro.mjs "<filtr>"`), obě `--kontrola`.
- Každý nový test s pojistkou: před opravou selže, po ní projde (počty do commitu). Ke každé nové kontrole významová mutace; nová sada, která ji hlídá, patří do `SADY` v `netlify/mutace.mjs` (u jádra do sad mutace_jadro), jinak mutace nic nechytí.
- Žádné skutečné ceny, sazby ani osobní údaje (`python3 nastroje/kontrola_udaju.py`); v testech jen `src/zkusebni_cenik.js`; `dist/*` se needituje; N46 neopravovat.
- Verze podle dne commitu (`python3 build.py --kontrola-verze`); číslo má každá dávka přidělené v zadání. CHANGELOG oddíl `## v<verze> — <co> (větev <větev>)`, PREDAVKA nahoru.
- Podklady pro harnessy (šablony z Google Drive konektorem, subagent, ověřit `zipfile.testzip`): CN v11 (+EN/DE), v13/v14/v15 (+EN/DE/FR), PROJ v3 (+EN/DE/FR, kopie jako `Sablona_NABIDKA_PROJ.docx`), PROJ v4 (+EN/DE/FR), SoD realizace/projekce (bez čísla i v2), plná moc, CN v7 — do složky mimo repozitář, `KNG_PODKLADY=<složka>`. Playwright: `mkdir node_modules && ln -s $(npm root -g)/playwright node_modules/playwright`; když verze nesedí na Chromium v kontejneru, `npm i playwright@1.56.1` do vlastní složky mimo repozitář.
- Commity po bodech, push po každém bodu. Commity končí řádky Co-Authored-By a Claude-Session podle pokynů prostředí.
- Na konci zpráva: commity, testy před/po, mutace, výchozí volby, otevřené otázky.
