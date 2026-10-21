# Bezpečnostní audit K6 — Kalkulator Next Gen v21.10.5

- **Datum:** 21. 10. 2026 (dávka K6, roadmapa #475; koordinace „ŘÍDÍCÍ 21.10 noc 2“). Zadání: celé kolo s mutacemi + audit jako podmínka návrhu posunu `test` → `main`.
- **Kód:** `7fac477` (v21.10.5 = `test`); zápis ve větvi `claude/k6-kolo`. Kód aplikace se v dávce neměnil.
- **Navazuje na:** `podklady/K5_AUDIT_21_10.md` (K5-S1…K5-W7) a `podklady/K4_AUDIT_20_10.md`.
- **Rozsah:** `git diff 7652bb9..7fac477` (v21.10.4 → v21.10.5; 42 souborů, 27 commitů): O12 #474 (průvodce šablon — jazykové verze k platné češtině), S11 (šablona SoD realizace v4, `vyrob_sablony.js --sod-real-v4`), Controlling C5 (export v2) + C6 #447 (objednané příplatky — `src/objednane.js`, `objKontrola` na serveru, krycí list, export `podle=prodej`, SoD), O13 (opravy K5-S1, K5-K1 + K5-K3, K5-W1, K5-W2; „(DPZ)*“ v jazykové verzi), zápis K5.
- **Metoda:** jen čtení ve třech čočkách třemi nezávislými subagenty — (1) server, autorizace, úložiště; (2) klient, dokumenty, XSS, zámek a integrita odeslané nabídky; (3) nástroje, W2, CI, supply chain, tajemství. Pokusy nad kopiemi stromu (`git archive 7fac477`) s úložištěm v paměti, W2 nad lokálním holým repem s podvrženým `gh`; nikdy proti GitHubu ani síti. Nálezy K6-S1, K6-S3, K6-K1, K6-K2, K6-W1 a K6-W2 ověřeny druhým, vlastním čtením kódu. Opravy kódu se v dávce nedělaly (zadání).
- Ceny ani osobní údaje v auditu nejsou.

## Testovací kolo

Celé kolo nad `7fac477` (v21.10.5), 21. 10. 2026 od 16:30 UTC; `ADMIN_EMAIL=spravce@priklad.cz`, `KNG_NEZVYSOVAT_VERZI` do kola NEexportováno:

| Krok | Výsledek | Pozn. |
|---|---|---|
| Kontrola verze + sestavení | ✓ | `bash nastroje/testovaci_kolo.sh --jen build,sady,staticke` |
| Sady (`spust_testy.sh --smoke`) | **296 prošlo / 0 selhalo / 6 přeskočeno** (302 sad) | 19 min 0 s; přeskočené `test.js` (ostrý ceník) + 5 harnessů bez `KNG_PODKLADY` (`overit_manual`, `overit_nabidka_proj_word`, `overit_sablona`, `overit_sablony_online`, `overit_sod`) |
| Statické kontroly | **4/4** | verze, CRLF, osobní údaje a tajemství, test výběru větví W2 51/0 |
| Mutace jádra (`mutace_jadro.mjs`) | _běží_ | 417 mutací, samostatný `git worktree` nad `7fac477` |
| Mutace serveru (`netlify/mutace.mjs`) | _běží_ | 753 mutací, 64 souborů = 64 částí filtrem podle cesty souboru ve třech frontách (3 `git worktree` nad `7fac477`); `--kontrola` 753/753 |

## Verdikt

_Doplní se po doběhnutí mutací._

| | Počet | Nálezy |
|---|---|---|
| Kritické | 0 | — |
| Vysoké | 0 | — |
| Střední | 1 | K6-K1 |
| Nízké | 9 | K6-S1, K6-S2, K6-S3, K6-K3, K6-K4, K6-W1, K6-W2, K6-W3, K6-W4 |
| Informativní | 12 | K6-S4 … K6-S7, K6-K2, K6-K5 … K6-K9, K6-W5, K6-W6 |

## Nálezy — opravit bez J. V.

_(rozpis doplním)_

## Nálezy — rozhodnutí J. V.

_(rozpis doplním)_
