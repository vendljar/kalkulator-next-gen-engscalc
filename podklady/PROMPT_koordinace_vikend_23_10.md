# Zadání pro koordinační sezení „ŘÍDÍCÍ víkend 23.–26. 10.“ (převzetí od „ŘÍDÍCÍ 22.10“ session_013yuBUKmpUYvEnjxWjGi5kj)

Komunikace česky. Platí `CLAUDE.md`, skill `kokpit-koordinace` (kokpit https://claude.ai/artifact/LLLBVLxKcWDHhd8axapiU2 — převzít: Artifact read → uložit do scratchpadu → publish se stejným `url`; do `koordinace` své id, do deníku „Koordinaci převzalo …“), skill `roadmapa-kng`. **J. V. je přes víkend nedostupný** — otázky jen do dialogového artefaktu (vzor https://claude.ai/artifact/RPJjZGcvwg3bPQHj2kCtNL, capability db+user, kolekce `odpovedi`, nevyplněné = návrh) a do kokpitu „Čeká na vás“.

## Hned po startu
1. Přečti `podklady/HARMONOGRAM_23_26_10.md` (ZÁVAZNÝ plán do po 26. 10. 05:00 UTC = 6:00 Praha) a oddíl „STAV 23. 10.“ v `podklady/PREDAVKA_KOORDINACE_15_10.md`.
2. `git fetch origin claude/integrace-16-10 test`; pracuj na `claude/integrace-16-10`. V kořeni pracovní kopie vytvoř `ln -s $(npm root -g) node_modules` (jinak se ~44 prohlížečových harnessů přeskočí „chybí playwright“).
3. Převezmi kokpit. Pošli `send_message` běžícím dávkám (viz níže), že koordinaci převzalo tvoje id a hlášení mají posílat tobě.
4. Naplánuj si kontroly řetězem `send_later` (~60 min, v noci a o víkendu po 2–3 h) a **pondělní souhrn** `send_later` na 2026-10-26T05:00:00Z (stará koordinace své kontroly zrušila).

## Stav při předání (23. 10. ~12:20 UTC)
- **main = v22.10.1** (aea832a) — jen na výslovný pokyn J. V.; návrh main se dává v pondělí ráno.
- **test = v23.10.2** (f3b5d42, release vydán). **Integrace** = test + roadmapa (plán víkendu #512–#515, `meta.planVikend` — vlny v plánu modře) + harmonogram + tento soubor.
- **Běží P2** session_01AfziUzv7TFTP5SuGtbi1Sy (`claude/p2-pd114-prevzeti` nad f3b5d42, **v23.10.3**): úkol A zadání `podklady/PROMPT_koordinace_kontrola_vetve_platby_23_10.md` z větve `claude/eager-carson-1xznt2` — převzetí #114 jako diff, Stav PD větve nepřebírat (platí P1), 3 opravy do P1, roadmapa #509–#511. Má poslat SHA commitu s převzetím #114 (pro B1) a finální hlášení.
- **Větev `claude/eager-carson-1xznt2` (vlákno „Pipedrive API integrace“, NEARCHIVOVAT) má starou historii repozitáře (kořen deb9551 „Prvni davka“, 157 commitů mimo test) → NIKDY merge do integrace/test/main.** Při slučování P2/B1 ověř `git rev-list --max-parents=0 HEAD` (nesmí přibýt kořen deb9551) a `git log --oneline origin/test..HEAD`.
- Ne 25. 10. 21:00 UTC běží naplánovaná aktualizace příručky (trig_01FdyoZ7vGPSnvyQoCPuSfbW, samostatné sezení) — nic nedělat.

## Plán (podrobně v harmonogramu)
1. **B1 #512** (úkol B téhož zadání — platby #115): založ hned po SHA #114 z P2, větev `claude/b1-platby-115` nad tím SHA, cílová verze podle pořadí sloučení (P2 = v23.10.3 → B1 = v23.10.4). Platby 1–8 a PROJ zaloha1Proc směr „nic“, nové pole „Platební kalendář SoD PROJ“ (planSodKalendar), hodnota dealu value+currency (řídící varianta bez DPH, kombinovaná OCK+PROJ, „stará → nová“); Hlavní projektant/Způsob fakturace až po integrátorovi. Do živého Pipedrive nic.
2. **P2 → integrace** → `--kontrola` mutací → kolo `bash nastroje/testovaci_kolo.sh --bez-mutaci` (ADMIN_EMAIL=spravce@priklad.cz NODE_PATH=$(npm root -g), na pozadí `setsid nohup … &`, PID z `ps`, čekat `while kill -0 $PID`) → cílené mutace (P2, Pipedrive) → fast-forward test + release odkaz (krátký `…/releases/new?tag=vX&target=<SHA>&title=vX` + text popisu zvlášť z CHANGELOG; tag ověřit `git ls-remote --tags origin`). Totéž B1 → v23.10.4.
3. **K8 #513** (celé kolo s mutacemi + audit 3394b2b..test → `podklady/K8_AUDIT_24_10.md`) a **S1 #515** (hloubkový security test + funkční logika nad test: lokální instance v kontejneru, živý testengscalc.netlify.app jen šetrně a jen pokud J. V. povolí doménu — síťová politika ji teď blokuje (403); rozsah podle dialogu https://claude.ai/artifact/VTamxkz2Xum9uMq7nuBRiM — přečti `ArtifactData list odpovedi`, nevyplněné = návrh; výstup `podklady/SEC_AUDIT_24_10.md`) — obě dávky souběžně přes noc nad SHA test po B1.
4. **O-K8 #514** so ráno: opravy nálezů K8 + kritických/vysokých S1 bez J. V. → kolo → test **v24.10.1**; zbytek otázek do nového dialogu.
5. **Po 05:00 UTC souhrn** (artefakt) + kokpit + PREDAVKA_KOORDINACE + roadmapa (planVikend uzavřít).

## Pravidla a limit
- J. V. 23. 10.: **týdenní limit smí být do so 24. 10. 05:00 UTC vyčerpán**; po obnově běžný provoz (rozumně, souhrn v pondělí).
- Do KAŽDÉHO promptu dávky: „Vyhýbej se příkazům, které potřebují schválení (instalace, síť mimo git, mazání mimo pracovní kopii); prohlížečové sady ručně nepouštěj — celé kolo pustí koordinace. Na Google Disk nic nezapisuj. Pushuj jen do své větve, neslučuj do integrace ani test, hotovo a problémy hlas koordinaci přes send_message.“ + „**Dlouhé běhy (mutace) neposílej na pozadí a nekonči tah, dokud neskončí** — kontejner nečinného sezení se po ~4 min uvolní a procesy na pozadí zabije (K7 2×).“ + cílová verze + předem přidělené číslo roadmapy (poslední: #515). Dávky zakládej s plným SHA (`source_revision`).
- Hotové dávky (bez otevřených otázek, po posunu test) archivuj. Slučování do integrace dělá jen koordinace.
- Poučení: `pgrep -f` v čekací smyčce najde sám sebe — čekat na PID; `node netlify/mutace.mjs --help` spustí všechny mutace; `python3 build.py` bez `KNG_NEZVYSOVAT_VERZI=1` zvýší verzi; během mutací pracovní kopii neměnit (zápisy přes `git worktree`); commit z nového dne = nová verze vDD.MM.N; kokpit před publikací `python3 .claude/skills/kokpit-koordinace/kontrola.py`, znak `<` jako `<`.
