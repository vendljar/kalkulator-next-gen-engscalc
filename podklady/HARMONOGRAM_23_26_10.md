# Plán práce pá 23. 10. odpoledne – po 26. 10. 6:00 Praha (J. V. 23. 10. 2026)

Koordinace: „ŘÍDÍCÍ 22.10“ session_013yuBUKmpUYvEnjxWjGi5kj. Časy UTC (Praha = UTC+2, od ne 25. 10. 03:00 UTC+1; po 6:00 Praha = 05:00 UTC).
Roadmapa: položky plánu jsou v `meta.planVikend` a v pohledu Vlny modře (vlny B, D, E).

## Pokyny J. V. (23. 10.)
- Týdenní limit smí být do soboty rána (obnova so 24. 10. 05:00 UTC) vyčerpán celý. Po obnově běžný provoz.
- Hotové a ověřené → `test` + release odkaz; `main` jen na výslovný pokyn (návrh v pondělí ráno).
- Zadání z větve `claude/eager-carson-1xznt2`: `podklady/PROMPT_koordinace_kontrola_vetve_platby_23_10.md` (úkol A = P2, úkol B = B1). Větev nese starou historii (kořen deb9551) → nikdy merge, jen převzetí obsahu.

## Harmonogram
| Kdy (UTC) | Co | Kdo |
|---|---|---|
| pá 12:00–14:30 | **P2** (úkol A): převzetí #114 jako diff, Stav PD jen P1 + 3 opravy, roadmapa #509–#511 | session_01AfziUzv7TFTP5SuGtbi1Sy |
| pá od commitu #114 v P2 (~13:00) | **B1 #512** (úkol B): Platby 1–8 nic, Platební kalendář SoD PROJ, hodnota dealu | nová dávka nad commitem #114 z P2 |
| pá ~15:00–16:00 | P2 → integrace, kolo + mutace → **test v23.10.3** + release | koordinace |
| pá ~17:00–18:00 | B1 → integrace, kolo + mutace → **test v23.10.4** + release | koordinace |
| pá ~18:00 – so ~04:00 | **K8 #513**: celé kolo s mutacemi + audit 3394b2b..test (mutace serveru v Actions s matrix, pokud P2 připraví; jinak v cloudu s čekáním v popředí) | nová dávka |
| pá ~18:00 – so ~06:00 | **S1 #515** (souběžně s K8): hloubkový security test kódu a funkční logiky nad `test` — lokální instance v kontejneru; živý testengscalc.netlify.app jen šetrně a jen po povolení domény (dialog https://claude.ai/artifact/VTamxkz2Xum9uMq7nuBRiM, nevyplněné = návrh) → `podklady/SEC_AUDIT_24_10.md` | nová dávka |
| so 05:00 | obnova týdenního limitu | — |
| so ~05:30–09:00 | **O-K8 #514**: opravy nálezů K8 a kritických/vysokých nálezů S1 bez J. V. → kolo → **test v24.10.1** + release; otázky do dialogu | nová dávka |
| so–ne | kontroly koordinace po ~2–3 h; další práce jen na rozhodnutí J. V. (rezerva: #367 P10, #425) | koordinace |
| ne 21:00 | naplánovaná aktualizace příručky (trig_01FdyoZ7vGPSnvyQoCPuSfbW) — nic nedělat | samostatné sezení |
| **po 05:00** (6:00 Praha) | souhrn víkendu (artefakt), návrh main, co čeká na J. V. | koordinace |

## Poučení pro dávky (do promptů)
- Dlouhé běhy (mutace) v popředí, tah nekončit — kontejner nečinného sezení se uvolní za ~4 min.
- Koordinační kontejner: `ln -s $(npm root -g) node_modules`, jinak se prohlížečové harnessy přeskočí.
- Cílová verze vždy v promptu; release odkaz krátký + text popisu zvlášť.

## Předání koordinace (J. V. 23. 10. ~12:20)
Koordinace „ŘÍDÍCÍ 22.10“ měla kontext ~62 % → předáno novému sezení „ŘÍDÍCÍ víkend 23.–26. 10.“ podle `podklady/PROMPT_koordinace_vikend_23_10.md`. Naplánované kontroly přesunuty do nového sezení.
