# Předávka koordinace dávek 15. 10. 2026 (pro nové koordinační sezení)

Předchozí koordinační sezení: session_0191A71yUFarU952Vy7h2hc5 (končí kvůli kontextu). Komunikace česky, nikdy AskUserQuestion. Platí `CLAUDE.md`. **Pokyny J. V. platné pro koordinaci:** dávky spouštět v samostatných sezeních (`create_session`), hlídat je průběžně a nenechat stát, hotové se zelenými sadami slučovat do `test` (po sadách nad sloučeným stavem), nakonec celé kolo s mutacemi nad `test`. **Do `main` nic, dokud to J. V. nepotvrdí.** `test-draft` beze změny.

## Stav při předání (15. 10. ~14:25 UTC)

- `main` = eff7724 (v14.10.3). `test` = **8f7be40 (v15.10.4)**: S1 B80, S2 B89–B95, S3 P12, S5 červená lišta (sady 252/0/1).
- **Integrační větev `claude/integrace-15-10` = 9ead7b5** (nad test): + úprava P12 podle J. V. (S3 93b6a02 — náklady výchozí všem, admin skryje; prodejní sazba, v15.10.5), + audit S4 (B151, B152, B167, `podklady/AUDIT_2026-10-15_v15.10.6.md`, v15.10.6), + úprava B80 podle J. V. (S1 51d4cbf — čtení z Pipedrive výchozí všem). `verze.txt` = 15.10.6. **Do test zatím nešla.**
- Sady nad 9ead7b5: 1 selhání `overit_verzi.mjs` — jen proto, že komentář v `src/zobrazeni.js` nese „v15.10.7" a verze je 15.10.6. Vyřeší se sloučením S1 commitu 38996f2 (verze → 15.10.7).
- **Ještě nesloučené zápisové commity** (jen CHANGELOG/PREDAVKA/verze/roadmapa, bez kódu): `claude/b80-pipedrive` 38996f2 (v15.10.7, roadmapa #345, NASAZENI), `claude/p12-naklady` 1f2a365 (výsledky po úpravě, mutace 13/13, smoke 248/0/2), `claude/kolo25-audit` dcc3d5f (smoke 247/0/6).
- **Další krok:** do `claude/integrace-15-10` sloučit 38996f2, 1f2a365, dcc3d5f (konflikty jen v dokumentaci — novější oddíl nahoru, `verze.txt` = 15.10.7, příručka `manual/obsah.json` verze + nadpis „Co je nového ve verzi v15.10.7"), `--kontrola` mutací, sestavit, příručka ze snímků, `spust_testy.sh --smoke` s podklady → zelené → zápis do CHANGELOG → push `claude/integrace-15-10` a fast-forward `test` (`git merge-base --is-ancestor origin/test HEAD`).

## PŘEDÁNÍ 16. 10. ~13:10 UTC → nové koordinační sezení (staré session_01NQjWzfqv1obHAg7DWPHAKH končí kvůli kontextu 66 %)

- **Řiď se `podklady/PLAN_VIKEND_16_10.md`** (plán + rozhodnutí J. V. + okna). Kokpit převezmi (skill `kokpit-koordinace` ve větvi `claude/integrace-15-10`, šablona `podklady/KOKPIT_koordinace.html`; publikovat do URL https://claude.ai/artifact/LLLBVLxKcWDHhd8axapiU2 přes `url`).
- `main` = `test` = 1cbab3a (v15.10.14). Integrační větev pro nové dávky: založ `claude/integrace-16-10` nad `origin/test` a nejdřív do ní slouč `origin/claude/integrace-15-10` (nese skill kokpitu, release_odkaz.py je už v test — jen doc commity).
- Běžící dávky (pošli jim zprávu, že koordinaci převzalo nové sezení): **S11** session_015fBoTjo5sPVrotmk1h5Nvz `claude/b155-rozsah-pasu` (v16.10.1; zatím 2b03b31, souhrn nepřišel) · **S12** session_01ARSMBgZ2uFKva4VC1kj1qJ `claude/leseni-spec-radek` (v16.10.2; bod 2 hotový d64e149, bod 3 rozpracovaný) · **S13** session_01Stc6SXBihwz8ewqcX84f6k `claude/cena-dle-nabidky` (v16.10.3; 4b7a2ec — CHANGELOG/PREDAVKA, souhrn čekej).
- Šablony z Disku: v novém kontejneru stáhnout znovu subagentem (seznam v `_SPOLECNE_15_10.md`; ID souborů SoD v `podklady/POSTUP_SABLONY_SOD_15_10.md`).
- Hodinová kontrola: vytvoř si vlastní naplánovanou úlohu (cron hodinově) do svého sezení; vypni ji po O9.
- Push do `test` je schválený (J. V.: „vše co proběhne standardně otestuj a rovnou pošli do test“) — auto-mode ho chce mít výslovně v zadání sezení.

## Stav 16. 10. ~12:20 UTC (koordinace session_01NQjWzfqv1obHAg7DWPHAKH, kontext 63 %)

- `main` = `test` = 1cbab3a (v15.10.14, release vydán). Šablona SoD projekce v3 nahraná J. V. do aplikace.
- Běží: **S11** session_015fBoTjo5sPVrotmk1h5Nvz (`claude/b155-rozsah-pasu`, v16.10.1, B155 rozsah pásu — první commit 2b03b31), **S12** session_01ARSMBgZ2uFKva4VC1kj1qJ (`claude/leseni-spec-radek`, v16.10.2, e-mail D. S. body 2 a 3), **S13** session_01Stc6SXBihwz8ewqcX84f6k (`claude/cena-dle-nabidky`, v16.10.3, „cena dle nabídky“, návrh https://claude.ai/artifact/3eaLDMphHDZCqWTK66TEfc schválen).
- **Pokyn J. V. 16. 10.: „až vše dokončíš, proveď rovnou sloučení do test“** — po souhrnech S11–S13 sloučit do integrace (S11 a S13 obě sahají do `src/vyjimky.js` / schvalování — pozor na konflikty), sady, celé kolo s mutacemi, fast-forward `test`, release odkaz (`release_odkaz.py` hlídá tag). Do `main` jen na pokyn.
- Soupis změn pro obchodníky (main v14.10.3 → v15.10.14): https://claude.ai/artifact/DMWk88SYC2TphF3FJ7zSQS
- Kokpit: https://claude.ai/artifact/LLLBVLxKcWDHhd8axapiU2 (skill `.claude/skills/kokpit-koordinace`, nově pole `celkem` = odhad do konce úkolu; týdenní limit se nezobrazuje).

## ZÁVĚR noci 15./16. 10. (05:45 UTC) — vše hotovo

- `test` = **55f0690 v15.10.14**, celé kolo s mutacemi **VŠE ZELENÉ** (257/0/1, jádro 205/205, server 449/449, statické 3/3). Obsahuje S1–S10.
- Release: vydat **v15.10.14** (odkaz v koordinačním sezení / kokpitu). v15.10.12 (vydání nabízeno) je obsažená v v15.10.14 — stačí vydat jen v15.10.14.
- Čeká na J. V.: (1) release v15.10.14; (2) šablona SoD projekce s číslem: `node nastroje/vyrob_sablony.js --sod-proj-cislo <složka>` → v3 na Disk a do Nastavení → Šablony (`podklady/POSTUP_SABLONY_SOD_15_10.md`); (3) `main` jen po potvrzení J. V.
- Poučení z noci: restart kontejneru přeruší kolo a může nechat v pracovní kopii kola nevrácenou mutaci → před dalším během `git checkout -- .` v pracovní kopii kola.
- Hodinová kontrola trig_01GwrzYRDzbmqK5GXCYEaLLY vypnuta.

## Stav 15. 10. ~16:00 UTC (koordinace session_01NQjWzfqv1obHAg7DWPHAKH)

- `test` = 06937a3 **v15.10.10** (S1, S3, S4, S7, S8; release v15.10.10 i v15.10.7 vydány).
- `claude/integrace-15-10` = **v15.10.12** (S6 B153/B154 jako v15.10.8 + release_odkaz.py hlídá tag + skill `.claude/skills/kokpit-koordinace`); sady běží → fast-forward test → release v15.10.12.
- Běží jen **S9** (session_01CPcwsQaNofMcXf5Z8t2kzz, `claude/sod-proj-cislo`, v15.10.11 — číslo SoD do šablon SoD projekce). Po jejím souhrnu sloučit (verze integrace pak **v15.10.13**, protože test už nese vydanou v15.10.12), sady, test, pak **celé kolo s mutacemi** nad test (~4 h), release, závěrečná zpráva.
- Pokyn J. V. 15. 10. ~15:55: „dokonči běžící úkoly a testování a vše odešli do test; při vyčerpání limitu pokračuj automaticky v dalším okně; počítač J. V. bude v noci odpojen“. Hodinová kontrola: naplánovaná úloha trig_01GwrzYRDzbmqK5GXCYEaLLY (vypnout po dokončení).
- Otevřené otázky na J. V.: žádné (výchozí volby S8 bere J. V. na vědomí).
- Šablony z Disku v kontejneru: /home/user/kng_podklady_koord (30 souborů); nový kontejner je musí stáhnout znovu.

## Kokpit koordinace (pokyn J. V. 15. 10. 2026 — platí pro KAŽDÉ koordinační sezení)

- Živý kokpit: **https://claude.ai/artifact/LLLBVLxKcWDHhd8axapiU2** (artefakt „Kokpit dávek KNG"). Zdroj stránky je `podklady/KOKPIT_koordinace.html` (data v bloku `<script id="data">` JSON).
- Nové koordinační sezení: přečíst artefakt (`Artifact action=read url=…`), uložit si ho do scratchpadu a dál **publikovat do stejné URL** (`url` = odkaz výše), ne nový.
- Aktualizovat po každé události (nový commit dávky, souhrn, sloučení, výsledek sad, posun test, kolo) a nejméně při každé kontrole (~20 min): „Čeká na vás", dlaždice větví, tabule dávek (fáze kód→testy→mutace→souhrn→integrace→sady→test, **odhad zbývajícího času**, **čerpání kontextu** z `get_session` → `external_metadata.context_usage`), deník.
- Při předávce zkopírovat aktuální stránku do `podklady/KOKPIT_koordinace.html`.

## Push do test (pokyn J. V. 15. 10. 2026 ~15:00)

„Pushni do test a slučuj dávky do test jako dřív." — fast-forward `test` po zelených sadách je schválený; auto-mode klasifikátor ho bez výslovné věty v sezení odmítá, proto ji v promptu nového koordinačního sezení zopakovat.

## Běžící dávky (sezení)

| Dávka | Sezení | Větev (nad integrace-15-10) | Verze | Zadání |
|---|---|---|---|---|
| S6 B153 + B154 (varianta a: celý obsah výjimky), uzavřít B155/B156 jako vědomé meze (rozhodnutí J. V.) | session_011ZCoyaDoTgLnAoNZHPKkWg | `claude/b153-b154` | **v15.10.8** | `podklady/PROMPT_b153_b154.md` |
| S7 „Krycí list zakázky OCK" + pole Číslo SoD (OCK i PROJ) | session_01AQ3FR8TVBZv7DiLGztwWTn | `claude/kryci-cislo-sod` | **v15.10.9** | `podklady/PROMPT_kryci_cislo_sod.md` |
| **S8 hodiny v krycím listu jen za vlastní stranu** — SPUSTIT (nové zadání J. V.) | — | `claude/hodiny-po-listech` | **v15.10.10** | `podklady/PROMPT_hodiny_po_listech.md` |

Hotová sezení: S1 session_01XDeCFTDhtGnF4nonTV68Mw, S2 session_01FFrnq17zRKzZosaaEF1yKF, S3 session_01N6KWKuYEUeqkVB9yymEWrq, S4 session_016bb3zpWfiWTkuoJdEdU1xt, S5 session_015W9XRCKoKeM5rys1nMFB3y. J. V. s nimi občas mluví napřímo (rozhodnutí B90, B94, P12, B80) — po každém novém commitu v jejich větvi zkontrolovat, zda nejde o změnu kódu, a sloučit.

Hned po startu pošli S6, S7 (a nově S8) `send_message`, že koordinaci převzalo nové sezení (tvé session id) a že sloučení do test dělá ono.

## Postup koordinace

1. Hlídat větve: smyčka na pozadí (`run_in_background`, timeout 2 h) — `git ls-remote origin` pro `test` a všechny `claude/…` výše každých 60 s, skončí při změně → notifikace; po každé notifikaci znovu spustit. Navíc `ScheduleWakeup` cca 15–20 min jako záloha. **Pozor:** `pkill -f <vzor>` zabije i vlastní příkaz, pokud vzor obsahuje jeho text.
2. Hotovou dávku (sezení idle, poslední commit = zápis výsledku sad, nebo zpráva do koordinace) sloučit do `claude/integrace-15-10` merge commitem; konflikty: `verze.txt` = nejvyšší, CHANGELOG/PREDAVKA oddíly obou stran (novější nahoře), `netlify/mutace.mjs` — seznam `SADY` sloučit (všechny sady), `MUTACE` obě strany; `manual/obsah.json` verze + nadpis novinek na výslednou verzi. Ověřit `node netlify/mutace.mjs --kontrola`, `node mutace_jadro.mjs --kontrola`, `python3 build.py --kontrola-verze`, `roadmapa.py --kontrola`.
3. Sady: `KNG_NEZVYSOVAT_VERZI=1 python3 build.py`, příručka ze snímků (`node manual/snimky_auto.mjs <podklady>/snimky.json`, `bash manual/sestav.sh …`), `KNG_PODKLADY=<podklady> NODE_PATH=$(npm root -g) bash spust_testy.sh --smoke` na pozadí. Zelené → zápis do CHANGELOG (oddíl verze, odstavec „Integrace do test") → push do `test`.
4. Podklady: nové sezení nemá `/home/user/kng_podklady_*` — stáhnout šablony z Google Drive subagentem (seznam a ID v `podklady/_SPOLECNE_15_10.md`; ID souborů viz předchozí předávky / hledání `title contains 'Sablona_'`), ověřit zipfile.testzip. Playwright: `mkdir node_modules && ln -s $(npm root -g)/playwright node_modules/playwright`.
5. Po sloučení S6, S7, S8: **celé kolo s mutacemi** nad `test` (`nastroje/testovaci_kolo.sh`, setsid nohup, until-smyčka nad logem, ~4 h, mutace nepřerušovat, v pracovní kopii kola nic necommitovat — dělat v odděleném worktree). VŠE ZELENÉ → výsledek do CHANGELOG + PREDAVKA, release odkaz (`python3 nastroje/release_odkaz.py`, popis dočistit; releasy v14.10.4–v14.10.8 už J. V. vydal? ověřit přes GitHub) a závěrečná zpráva J. V. (verze, testy, otevřené body: B157–B166 nízké/informativní z auditu, #366 návrh řady čísel SoD, #355/#356 můstky, #380 Q7, `{ cz }` próza PROJ).
6. Kontext: `get_session` → context_usage; nad 60 % upozornit, nad 75 % přepsat tuto předávku a založit další koordinační sezení.
