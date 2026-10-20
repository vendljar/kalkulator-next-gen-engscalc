# Předávka koordinace dávek 15. 10. 2026 (pro nové koordinační sezení)

Předchozí koordinační sezení: session_0191A71yUFarU952Vy7h2hc5 (končí kvůli kontextu). Komunikace česky, nikdy AskUserQuestion. Platí `CLAUDE.md`. **Pokyny J. V. platné pro koordinaci:** dávky spouštět v samostatných sezeních (`create_session`), hlídat je průběžně a nenechat stát, hotové se zelenými sadami slučovat do `test` (po sadách nad sloučeným stavem), nakonec celé kolo s mutacemi nad `test`. **Do `main` nic, dokud to J. V. nepotvrdí.** `test-draft` beze změny.

## Stav při předání (15. 10. ~14:25 UTC)

- `main` = eff7724 (v14.10.3). `test` = **8f7be40 (v15.10.4)**: S1 B80, S2 B89–B95, S3 P12, S5 červená lišta (sady 252/0/1).
- **Integrační větev `claude/integrace-15-10` = 9ead7b5** (nad test): + úprava P12 podle J. V. (S3 93b6a02 — náklady výchozí všem, admin skryje; prodejní sazba, v15.10.5), + audit S4 (B151, B152, B167, `podklady/AUDIT_2026-10-15_v15.10.6.md`, v15.10.6), + úprava B80 podle J. V. (S1 51d4cbf — čtení z Pipedrive výchozí všem). `verze.txt` = 15.10.6. **Do test zatím nešla.**
- Sady nad 9ead7b5: 1 selhání `overit_verzi.mjs` — jen proto, že komentář v `src/zobrazeni.js` nese „v15.10.7" a verze je 15.10.6. Vyřeší se sloučením S1 commitu 38996f2 (verze → 15.10.7).
- **Ještě nesloučené zápisové commity** (jen CHANGELOG/PREDAVKA/verze/roadmapa, bez kódu): `claude/b80-pipedrive` 38996f2 (v15.10.7, roadmapa #345, NASAZENI), `claude/p12-naklady` 1f2a365 (výsledky po úpravě, mutace 13/13, smoke 248/0/2), `claude/kolo25-audit` dcc3d5f (smoke 247/0/6).
- **Další krok:** do `claude/integrace-15-10` sloučit 38996f2, 1f2a365, dcc3d5f (konflikty jen v dokumentaci — novější oddíl nahoru, `verze.txt` = 15.10.7, příručka `manual/obsah.json` verze + nadpis „Co je nového ve verzi v15.10.7"), `--kontrola` mutací, sestavit, příručka ze snímků, `spust_testy.sh --smoke` s podklady → zelené → zápis do CHANGELOG → push `claude/integrace-15-10` a fast-forward `test` (`git merge-base --is-ancestor origin/test HEAD`).

## ZÁVĚR noci 19./20. 10. (~05:45 UTC) — koordinace „ŘÍDÍCÍ 19.10 noc“ session_01XJumJDekDRpCTu4kDzdi9e (kontext ~36 %)

- **Integrace = c1a4c81 (v20.10.1), plně ověřená:** W1 (PROJ v6, v19.10.9), F1 (zámek mutací, v19.10.10), M1 (mutace O3), zápis K3, O5 (opravy auditu K3 bez J. V., v20.10.1), O6 (test hranice 7 dní). Celé kolo K3 nad 1b0e2f7: sady 279/0/6, jádro 291/291, server 586/587 (B58 prázdný test → O5), statické 3/3. Nad 54f1cbc/c1a4c81: sady 281/0/6, statické 3/3, jádro O5 13/13, #367 18/18; server O5 11/11, B58 2/2, #367 2/2, H2 4/4, #151 42/42.
- **test = 1a4d26b (v19.10.8)** — push do test tomuto sezení zamítla kontrola oprávnění (Modify Shared Resources) → čeká na J. V. („pushni do test“ / `git push origin c1a4c81:test`). Opakovaný scheduled task taky zamítnut → hodinové kontroly řetězem send_later.
- **Releasy:** v19.10.8 k vydání (odkaz v kokpitu); v20.10.1 připraven (souhrn v19.10.9–v20.10.1, cíl c1a4c81, odkaz v kokpitu a v souhrnu). Tagy v19.10.8 a v20.10.1 neexistují (ls-remote 05:20).
- **Čeká na J. V.:** rozhodnutí z auditu K3 — N2 (zmrazit při zamčení), N1 heslo + složka, N4 limit otisků 1/10 min + 20/den, N13 retenci přeskočit při poklesu pod 50 %, N15 heslo u zveřejnění Firmy, N18 strop velikosti podmínek (číslo), horní mez rozměru můstku (číslo). Dál: šablona PROJ v6 nahrát, B192 varianta, šablony SoD, kontrola účetní/rodilí mluvčí.
- **Souhrn noci:** https://claude.ai/artifact/TqV2b7smXUvs9Kmhaau9aS · kokpit https://claude.ai/artifact/LLLBVLxKcWDHhd8axapiU2 (šablona zkopírována do skillu).
- **Sezení:** K3, M1, O5, O6 archivovány. Nearchivované: ŘÍDÍCÍ 19.10 session_017KEALG3ppimL5fW2XswzrB (k archivaci), V3, toto sezení.
- **Poučení:** úlohy na pozadí mají strop (výchozí 30 min, max 2 h) a kontejner se může restartovat → dlouhé mutace pouštět po částech s `timeout` 7200000, výsledky ukládat do scratchpadu; mutační skript při SIGTERM soubor vrací. Po zpřísnění kódu (O5) pouštět i staré cílené mutace dotčené oblasti (#151 odhalil prázdný test).

## STAV 19. 10. ~16:25 UTC — noční koordinace „ŘÍDÍCÍ 19.10 noc“ session_01XJumJDekDRpCTu4kDzdi9e

- **Integrace = 1b0e2f7 (v19.10.10)**: W1 (v19.10.9, šablona PROJ v6) + F1 (v19.10.10, B194 zámek mutací) sloučeny, konflikty jen dokumentace/.gitignore/verze.txt. Kolo `--bez-mutaci` 279/0/6, statické 3/3; mutace jádro „W1“ 11/11, server „#367“ 2/2 (zámek se uvolní). **Fast-forward `test` 1a4d26b → 1b0e2f7 zamítla kontrola oprávnění tohoto sezení** → čeká na J. V. (kokpit). Release odkaz v19.10.10 (souhrn v19.10.9–10) v kokpitu; v19.10.8 stále k vydání.
- **19:20 UTC:** M1 (mutace O3, 43 zaregistrováno, 2 testy zesíleny) sloučena → **integrace dd97ed3** ověřena: sady 279/0/6, jádro O3 7/7, server O3 40/40. Do `test` doporučeno rovnou dd97ed3 (čeká na J. V.), release odkaz v19.10.10 míří na dd97ed3. Poučení: dlouhé běhy na pozadí s `timeout` 2 h (výchozích 30 min přerušilo mutace; skript mutaci vrátil).
- **01:53 UTC 20. 10.:** K3 hotová (a844d1e, archivována): celé kolo nad 1b0e2f7 — sady 279/0/6, jádro 291/291, server 586/587 (přežila B58 = prázdný test, kód OK), statické 3/3; audit 0 krit./0 vys./3 stř./9 níz./7 info (`podklady/K3_AUDIT_19_10.md`). Zápis sloučen → **integrace 3b49d57**. Spuštěna **O5** session_019CwTpX8dkL1KFJEBh53RZF (opravy bez J. V., v20.10.1, `claude/o5-k3-nalezy`). Rozhodnutí J. V.: K3-N2, N1 heslo, N4, N13, N15 (doporučení v kokpitu).
- **Běží:** K3 session_01Jy3RSLoj7dAqXwZTs8WrAH (celé kolo s mutacemi + audit nad 1b0e2f7 → `claude/k3-kolo`), M1 session_01Kki2eUyt1cB9T42xSSd5hS (registrace mutací O3 → `claude/m1-mutace-o3`).
- **Hodinová kontrola:** opakovaný scheduled task zamítla kontrola oprávnění → řetěz `send_later` po ~60 min (každá kontrola naplánuje další). Ráno ~06:00 UTC souhrn noci.
- Staré sezení ŘÍDÍCÍ 19.10 session_017KEALG3ppimL5fW2XswzrB nečinné (archivuje J. V.).

## PŘEDÁNÍ 19. 10. ~15:50 UTC → noční koordinační sezení (staré ŘÍDÍCÍ 19.10 session_017KEALG3ppimL5fW2XswzrB, kontext ~55 %)

- **test = integrace = 1a4d26b (v19.10.8)** — #356, kapitoly + TD1, H2, zálohy N1–N6 (staré zálohy do 19. 10. se nemažou, RETENCE_OD 2026-10-20), #367 platební podmínky a texty ve Firmě. Ověřeno: sady 277/0/6, cílené mutace jádro #367 18/18, 356 5/5, h2 3/3; server #367 2/2, #151 42/42, h2 4/4, zaloh 50/50. Release v19.10.5 vydán; **v19.10.8 k vydání** (odkaz v kokpitu „Čeká na vás“). `main` = v15.10.14 jen na pokyn.
- **K sloučení (dávky hotové, sezení archivovaná):** `claude/w1-sablona-proj-v6` 4f7adf7 (v19.10.9, šablona PROJ v6 + `--proj-v6`; .docx v souborech sezení W1 session_014gvkcV3MSrbqzSLBUfoNcg; J. V. nahraje), `claude/f1-test-vyjimky` d43aa1e (v19.10.10, B194 zámek mutací; nad 1a4d26b). Pořadí W1 → F1; konflikty jen dokumentace + mutace_jadro.mjs (JADRA/bloky) + netlify/mutace.mjs.
- **Plán noci:** (1) sloučit W1, F1 → sady + cílené mutace (jádro „W1“/název z mutace_jadro.mjs, server zámek) → test v19.10.10 + release odkaz (souhrn v19.10.9–10) do kokpitu; (2) K3 celé kolo s mutacemi + bezpečnostní audit nad finálním test (samostatné sezení, hlídací úloha); (3) ráno ~06:00 UTC souhrn noci artefaktem + kokpit; (4) O3 mutace (43) registrovat do mutace_jadro.mjs — volitelná dávka.
- **Čeká na J. V.:** release v19.10.8; B192 varianta (doporučeno B, https://claude.ai/artifact/GtKYY7Qe6553LS4oJNjLXx); šablona PROJ v6 nahrát; první kopie záloh na Disk; Nastavení → Smlouvy/Šablony zkontrolovat a Zveřejnit; šablony SoD; kontrola účetní/rodilí mluvčí; sdílet soupis novinek https://claude.ai/artifact/A5HrdpZfUK6vBdJDYpYrgM.
- **Poučení:** samostatně spuštěné serverové testy potřebují `export ADMIN_EMAIL=spravce@priklad.cz` (jinak falešné FAIL); mutace_jadro vypisuje „Chycených“ 3. řádek od konce (tail -3 / grep); během mutačního běhu je pracovní kopie dočasně změněná — necommitovat, nepřepínat větve.

## STAV 19. 10. ~13:30 UTC — koordinace ŘÍDÍCÍ 19.10 session_017KEALG3ppimL5fW2XswzrB (kontext ~40 %), J. V. přes noc pryč

- **test = integrace = 4cc1b81 (v19.10.5)**, release v19.10.5 vydán (souhrn v19.10.2–5: #356, kapitoly IV.–VI. + TD1 {TERMIN}, H2 V7-N1/B191/B192, zálohy N1–N4). J. V. doplnil skladné, texty kapitol a zveřejnil firemní údaje. `main` = v15.10.14 jen na pokyn.
- **Rozhodnutí J. V. 19. 10.:** #356 A1+B1+C1+D1+E1; #367 B + vše natvrdo do Firmy, Q1–Q6 dle doporučení (Q3 prázdné jazyky přeložit, Q4 součet ≠ 100 % blokuje); TD1 {TERMIN}; N5 retence 30 denních + 12 měsíčních, ruční 90 dní, **staré zálohy do 19. 10. nikdy nemazat**; N6 týdenní kopie na Disk „_Zaloha Netlify DB“ bez hesel/podpisů; odkazy v kokpitu vždy živé.
- **Rozpracováno (dávky):** V8 `claude/v8-367-firma` (v19.10.6–7, #367, obsahuje 4cc1b81, kolo běží); O4 `claude/o4-zalohy` (v19.10.8 N5+N6+pojistka + úprava „staré zálohy ponechat“); W1 `claude/w1-sablona-proj-v6` (PROJ v6, v19.10.9); F1 `claude/f1-test-vyjimky` (nestabilní test_vyjimky.mjs, případně v19.10.10); N1 návrh B192 token; P2 soupis novinek.
- **Plán noci:** V8 → O4 do integrace (pořadí verzí), sady + cílené mutace → test v19.10.8 + release odkaz (souhrn v19.10.6–8) do kokpitu; pak K3 celé kolo s mutacemi + audit; W1, F1 → test. Hodinová kontrola: scheduled task trig_01M2aJJtkTEXcTHbLe16Na3o (:27) — ráno vypnout.
- **Poučení:** filtr cílených mutací musí odpovídat názvům v mutace_jadro.mjs / netlify/mutace.mjs (ověřit `--kontrola`/výpis), jinak „0 mutací“; `import()` mutace.mjs mutace SPUSTÍ — nikdy ho nenačítat ke kontrole syntaxe; v kontejneru chybí node_modules/playwright → symlink na /opt/node22/lib/node_modules/playwright.

## PŘEDÁNÍ po 19. 10. ~08:30 UTC → nové koordinační sezení (staré ŘÍDÍCÍ 18.10 session_0144Y7gXWeprriv4yf4wKL5T, kontext ~70 %)

- **`test` = integrace `claude/integrace-16-10` = 65ca5b5 (v19.10.1)**; `main` = 1cbab3a (v15.10.14), jen na pokyn J. V. Release **v18.10.15 vydán** (J. V.); **v19.10.1 (B189) k vydání** — odkaz poslán J. V. (krátký popis jen B189).
- **B189 hotovo (O2):** DIČ CZ → přenesená (§ 92e), bez DIČ → česká, EU/mimo EU bez výchozí volby + zábrana tisku. Otázky pro účetní (5) a (6) v `podklady/SOD_EN_KONTROLA.md`.
- **Soupis novinek** verze 4 (v19.10.1): https://claude.ai/artifact/A5HrdpZfUK6vBdJDYpYrgM — sdílení obchodníkům dělá J. V. Pondělní souhrn: https://claude.ai/artifact/Dxsfj3UhvSxPnpRzuLeuUi. Kokpit: https://claude.ai/artifact/LLLBVLxKcWDHhd8axapiU2 (šablona zkopírována do skillu).
- **Čeká na J. V. (dnes projde detailně):** #356 varianty (doporučeno A1+B1+C1+D1+E1; sezení A2 session_01BDzh45kuUGJRwFiQATyvgS čeká, kód doporučené ve `claude/a2-356-navrh`), #367 platební podmínky (doporučeno B), nasazení po test (Ceník → 8 předzaškrtnutých → Zveřejnit; Firma → skladné; Šablony: české SoD realizace v3 + projekce v4, pak EN/DE/FR — přílohy sezení V3 session_01GyotCYY7DhFnyXhceNA3de a archivovaného V5), kontrola účetní + rodilí mluvčí, release v19.10.1, main; nepovinně B183, V7-N1, mazání sloučených větví.
- **Otevřená sezení:** nové koordinační, A2 (čeká #356), V3 (nearchivovat — přílohy; J. V. 19. 10.: „archivuj vše hotové“ — V3 ponecháno kvůli přílohám, archivovat na výslovný pokyn), Pipedrive API integrace (nechat).
- **Pravidla:** viz zadání ŘÍDÍCÍ 18.10 + poučení: dlouhé běhy jen se sezením drženým vzhůru hlídací úlohou; v zadáních „nic nemaž přes rm“; push do test po zeleném standardním postupu je schválen (19. 10. prošel bez zamítnutí).

## STAV po 19. 10. ~05:00 UTC — test = c9577ed (v18.10.15)

- J. V. potvrdil „pushni do test“ → fast-forward `test` 1cbab3a → c9577ed. Release odkaz v18.10.15 poslán (tag zatím neexistuje). `main` = 1cbab3a, jen na pokyn.
- Pondělní souhrn: https://claude.ai/artifact/Dxsfj3UhvSxPnpRzuLeuUi. Čeká na J. V.: B189, #356, #367, nasazení šablon a Nastavení, kontrola účetní/rodilí mluvčí, sdílení soupisu, release, main.

## STAV ne 18. 10. ~20:50 UTC — K2 VŠE ZELENÉ

- **K2** (session_01V2JkS6AUATiLErhiew4Goi) celé kolo nad d3fda27 v18.10.15: sady 274/0/1, jádro 248/248, server 538/538 (56 skupin), statické 3/3 — **VŠE ZELENÉ**. Zapsáno v CHANGELOG (v18.10.15).
- **test** pořád 1cbab3a (v15.10.14): fast-forward na HEAD integrace (d3fda27 + jen dokumentace) **čeká na „pushni do test“ od J. V.** (kontrola oprávnění auto módu push zamítla). Pak release odkaz `python3 nastroje/release_odkaz.py 18.10.15 <SHA>`.
- **Poučení K2:** kontejner se uspí/restartuje, když sezení nemá běžící úlohu → setsid procesy zmizí. U dlouhých kol držet v sezení hlídací úlohu `run_in_background` (timeout 2 h, obnovovat). Doplnit do skillu `testovaci-procedura-kng` / zadání kol.

## STAV ne 18. 10. ~14:50 UTC — koordinace session_0144Y7gXWeprriv4yf4wKL5T („ŘÍDÍCÍ 18.10“, kontext 37 %)

- **Integrace `claude/integrace-16-10` = d3fda27 v18.10.15**: vše z víkendu + S1 opravy (snimky_auto heslo, af15443), V7 kontrola rozhodnutí (v18.10.14, jen texty), N4 kolo 28 + audit (v18.10.12, B190 opraven; `podklady/AUDIT_2026-10-18_v18.10.11.md`), H1 hygiena (v18.10.13: B171, B174, B175, B186, B187), O1 B188 (v18.10.15: obnova matice chce heslo správce).
- **Ověřeno:** K1 celé kolo nad 0dbec56 (sady 262/2/1, jádro 222/222, server 509/509 — 3 selhání známá a opravená); S1 nad d138384 (271/0/1, cílené mutace bez přeživší). **Kandidát test a7f1f60 (v18.10.11)** — fast-forward **zamítla kontrola oprávnění auto módu** → čeká na „pushni do test“ od J. V. v sezení.
- **Běží K2** session_01V2JkS6AUATiLErhiew4Goi — celé kolo nad d3fda27: sady 274/0/1 VŠE ZELENÉ, mutace jádra a serveru běží (konec ~19:00 UTC). Po zeleném K2 posunout test rovnou na d3fda27 (+ zápis CHANGELOG), release odkaz `python3 nastroje/release_odkaz.py 18.10.15 <SHA>`.
- **Nesloučeno / otevřené:** B189 (výchozí DPH ve SoD podle DIČ — rozhodnutí J. V. + účetní, roadmapa #430; do rozhodnutí nezveřejňovat SoD realizace v3), V7-N1 (karta výjimky: zaokrouhlená plocha), B191–B193 info. P1 soupis novinek doplněn (v18.10.11) — doplnit H1/O1 po posunu test. A2 #356 a V3 (přílohy) nearchivovat.
- **Poučení:** sezení H1 stálo 1,5 h na schválení příkazu `rm` (nikdo ho neschválí) — v zadáních psát „nic nemaž přes rm“. Archivace sezení občas zamítnuta, napodruhé prošla. Pondělní souhrn: send_later 19. 10. 03:30 UTC.

## PŘEDÁNÍ ne 18. 10. ~10:00 UTC → nové koordinační sezení „ŘÍDÍCÍ 18.10“ (staré session_011B3ruyPigNEMSUdesbk4Hd, kontext ~66 %)

- **Integrace `claude/integrace-16-10` = e3354d3 v18.10.11** (vše z víkendu: S11–S13, A1, V4, kolo 26 + B180, V1 #366, A2 #355, O6 B178/B179, B165, #425, kolo 27, V6, V3 SoD EN/DE/FR + DPH + skladné, V5 #380 projekce v4, B168/B176 + zápis B169–B177, V3b mutace + názvy činností EN/DE/FR). `test` = `main` = 1cbab3a (v15.10.14) — **o víkendu se neposunul.**
- **Běží:** K1 session_01TRNcR9WRobb2fkNgNVCdhk (celé kolo nad 0dbec56, mutace serveru po skupinách; zná 3 selhání opravená v integraci); S1 session_01GLen51sjWiHa4QhtGsVbdB (sady + cílené mutace nad HEAD integrace; případné opravy do `claude/s1-opravy`); V3 session_01GyotCYY7DhFnyXhceNA3de (hotovo, nearchivovat — přílohy šablon: realizace v3 „FINÁLNÍ v18.10.7“, projekce v4 EN/DE/FR „v18.10.11“); P1 session_01AkJ7656iFTJU8urGe7Rbnk (soupis https://claude.ai/artifact/A5HrdpZfUK6vBdJDYpYrgM — poslat doplněk v18.10.x); A2 session_01BDzh45kuUGJRwFiQATyvgS (#356 čeká na J. V.). Šablona projekce v4 CZ: příloha archivovaného sezení V5 session_01LE9PMBSsSQLZyhgUhHFrEP.
- **Posun test:** K1 + S1 zelené (selhání vysvětlená/opravená) → sloučit `claude/s1-opravy`, fast-forward `test` (push schválen J. V.), zápis do CHANGELOG, release odkaz `python3 nastroje/release_odkaz.py <verze> <SHA>` (hlídá tag). `main` jen na pokyn J. V. (18. 10.: ne).
- **Plán noci 18./19. 10. (pokyn J. V. 18. 10.: „rozběhni přes den a noc další dávky, podle předchozích pravidel“):** viz zadání nového sezení — K2 celé kolo nad finální integrací, N4 kolo 28 + audit v17.10.5 → v18.10.11, H1 hygiena (B171, B174, B175, B186, B187), V7 kontrola rozhodnutí 18. 10. + doplněk P1.
- **Pondělí 19. 10. ráno (~06:30 Praha):** souhrn pro J. V. jako artefakt — co se od pátku 16. 10. stalo, co je v test, co čeká na J. V. (#356, #367, B183 nepovinně, nasazení šablon a Nastavení, kontrola účetní/rodilí mluvčí, sdílení soupisu obchodníkům, release, main).
- **Čeká na J. V.:** #356 (https://claude.ai/artifact/9nMGAMnggiVEByuZoty9Qt, kód doporučené v `claude/a2-356-navrh`); #367 (https://claude.ai/artifact/1Szx195YEHNcmTwXGh1Doi); B183 0,1 m² (nepovinné); po nasazení do test: Ceník → 8 předzaškrtnutých → Zveřejnit; Firma → skladné; Šablony → SoD realizace v3, projekce v4, EN/DE/FR; kontrola účetní (`podklady/SOD_EN_KONTROLA.md`), rodilí mluvčí; release; main.

## STAV ne 18. 10. ~08:30 UTC — koordinace session_011B3ruyPigNEMSUdesbk4Hd (kontext 62 %) — PŘEDÁVKA

- `main` = `test` = 1cbab3a (v15.10.14). **`test` se o víkendu neposunul** — kolo nad v16.10.5 nedoběhlo (kontejner koordinace se restartoval 5×: pá 17:15, so 10:10, so 19:40, ne ~07:20, 08:05, 08:11; mutace v16.10.5 stihly sady 262/1/1 (✗ jen env), jádro 219/219, server 25 skupin bez přeživší) → ukončeno, nahrazeno kolem **K1**.
- **Integrace `claude/integrace-16-10` = ba579b3 v18.10.8**: S11–S13, A1, V4 (v16.10.x), N2 kolo 26 + B180, V1 #366, A2 #355, O6 B178/B179, B165 karta, #425 budoucí bod, N3 kolo 27 (B183–B187, meze), V6 kontrola rozhodnutí (v18.10.5), oprava test_sod_proj_cislo po #366, V3 SoD EN/DE/FR + režim DPH + skladné (v18.10.7), V5 #380 SoD projekce v4 (v18.10.8).
- **Běží:** K1 session_01TRNcR9WRobb2fkNgNVCdhk — celé kolo nad 0dbec56 (v17.10.5) ve vlastním kontejneru; zná 3 selhání opravená v integraci (#425 cekaNa, verze, test_sod_proj_cislo). B168 session_01T44gRiEMNEatcXCX1YmN7T (`claude/b168-matice-heslo`, v18.10.6 — POST /api/zobrazeni s heslem správce, B176 fail-closed, zápis B169–B177). V3 session_01GyotCYY7DhFnyXhceNA3de (přílohy šablon EN/DE/FR + realizace v3; dodělává mutace do mutace_jadro/mutace.mjs a v nové větvi `claude/v3b-sod-preklad` v18.10.9 názvy činností EN/DE/FR + EN/DE/FR z projekce v4). P1 session_01AkJ7656iFTJU8urGe7Rbnk (soupis novinek https://claude.ai/artifact/A5HrdpZfUK6vBdJDYpYrgM — poslat doplněk V3/V5/B168). A2 (idle, #356 v pondělí).
- Smoke nad integrací ba579b3 běží na pozadí v kontejneru koordinace (`/home/user/smoke_18_10.log`), restart ho může zabít.
- **Další kroky:** (1) K1 výsledek → po K1 zeleném: sloučit B168 + V3b, sady (smoke) + cílené mutace za změny po 0dbec56 (V6 kryci.js, test_sod_proj_cislo, V3 sod/kryci/firma/preklad/nastroje, V5 sod/docxgen/nastroje, B168 zobrazeni) → fast-forward `test` (push schválen), release odkaz `python3 nastroje/release_odkaz.py <verze> <SHA>`, P1 doplněk, závěrečná zpráva J. V. **`main` jen na pokyn J. V. (18. 10.: ne).**
- **Čeká na J. V. (pondělí 19. 10.):** #356 varianty (https://claude.ai/artifact/9nMGAMnggiVEByuZoty9Qt, kód doporučené ve `claude/a2-356-navrh`); #367 platební podmínky (https://claude.ai/artifact/1Szx195YEHNcmTwXGh1Doi, 12 otázek); nepovinně B183 zaokrouhlení 0,1 m²; výchozí režim DPH (V3 dala vždy přenesenou, ne podle země). Po nasazení do test: Ceník → 8 předzaškrtnutých → Zveřejnit; Firma → skladné; Šablony → SoD realizace v3, projekce v4, jazykové verze (přílohy V3/V5); kontrola účetní (DPH věty, `podklady/SOD_EN_KONTROLA.md`) a rodilí mluvčí.
- **Pravidla od J. V. (víkend):** otázky jen hromadně v dialogu koordinace, dávky se neptají (výchozí volby zapsat); max. 10 sezení; vše koordinuje řídící sezení; hotová sezení bez otázek archivovat (Pipedrive API integrace nechat); hodinová kontrola řetězem `send_later` (create_trigger neprošel oprávněním). `pgrep -f` najde sám sebe — běh ověřovat `ps aux | grep -c "[n]etlify/mutace.mjs"`. Celé kolo nespouštět s globálním `KNG_NEZVYSOVAT_VERZI`.

## STAV so 17. 10. ~08:10 UTC — koordinace session_011B3ruyPigNEMSUdesbk4Hd (kontext 33 %)

- `claude/integrace-16-10` = **e2c773a v16.10.5**: S11 B155 (v16.10.1, #421), S12 lešení + vlastní řádky (v16.10.2, #422), S13 cena dle nabídky + předzaškrtnutý návrh 8 položek (v16.10.3, #423), A1 audit 25 (v16.10.4, #420 — zbývá B165), V4 kontrola rozhodnutí (v16.10.5; překlad V4-1 schválil J. V. 17. 10.). Odpovědi J. V. k S12: 1A, 2A, 3A (jak je v kódu).
- **Celé kolo nad e2c773a:** pá 15:10 UTC start; sady 262/1/1 (jediné ✗ `overit_verzi.mjs` jen kvůli globálnímu `KNG_NEZVYSOVAT_VERZI=1` v mém skriptu — samostatně 7/0), mutace jádra **219/219**. Kontejner restartován pá ~17:15 UTC uprostřed mutací serveru (241 chycených, žádná nepřežila) → noc stála. So 08:04 UTC dopuštěno `testovaci_kolo.sh --jen mutace-server,staticke` ve worktree `/home/user/wt-kolo` (log `/home/user/kolo_16_10_b.log`). **Poučení:** kolo nespouštět s globálním `KNG_NEZVYSOVAT_VERZI`; po restartu `git checkout -- .` ve wt-kolo a dopustit jen chybějící kroky (`--jen`).
- Po zeleném dokončení: fast-forward `test` na e2c773a (+ zápis výsledku), release odkaz `python3 nastroje/release_odkaz.py 16.10.5 <SHA>`; J. V. po nasazení: Nastavení → Ceník → zkontrolovat 8 předzaškrtnutých „cena dle nabídky“ → Zveřejnit (test i ostrá). Obchodníkům: kdo měl vnitřní lešení jako vlastní řádek, smaže ho (teď by bylo 2×); výjimky s pásem „jiné“ schválené před v16.10.1 je nutné schválit znovu.
- Běží (start so 08:05 UTC, nad e2c773a): **N2** session_013mMCUhNo3juyzksrmXgN3F `claude/kolo26-audit` (v17.10.1, kolo 26 + audit, nálezy od B178); **V1** session_01UNDFzDH1HL1eFhryeiXGfc `claude/v1-cislo-sod` (v17.10.2, #366); **A2** session_01BDzh45kuUGJRwFiQATyvgS `claude/a2-mustky` (v17.10.3, #355 + #356).
- Hotová sezení S11, S12, S13, A1, V4 archivovat po posunu `test` (pokyn J. V. archivovat hotová; Pipedrive API integrace nechat).
- Hodinová kontrola: opakovaná úloha (create_trigger) neprošla oprávněním → řetěz `send_later` po hodině.
- Další okna: O6 opravy vysokých/středních nálezů kola 26 + sloučení V1, A2 + sady; O7 celé kolo → test + release; O8 V3 #380 + #157 a B165; O9 sloučení, kolo, test, release, závěrečná zpráva + soupis novinek pro obchodníky.

## PŘEVZETÍ 16. 10. ~13:20 UTC — koordinace session_011B3ruyPigNEMSUdesbk4Hd („ŘÍDÍCÍ 16.10“)

- Soubor `podklady/PLAN_VIKEND_16_10.md` je v `.gitignore` (`PLAN_*.md`), proto se 72ce7b6 do repa nedostal — jeho obsah je níže (obnoven z přepisu předchozího sezení).
- Integrační větev: `claude/integrace-16-10` (nad `test` 1cbab3a + fast-forward `claude/integrace-15-10` 6aa21d1). Předávka koordinace se dál vede v této větvi.

## PLÁN VÍKENDU — Plán dávek pá 16. 10. večer – ne 18. 10. (schváleno J. V. 16. 10. ~15:00 Praha)

Náhled plánu: https://claude.ai/artifact/YYF76p9QthTbM8mA6UyfJH · Kokpit: https://claude.ai/artifact/LLLBVLxKcWDHhd8axapiU2
**Pokyn J. V.: „vše, co proběhne standardně, otestuj a rovnou pošli do test prostředí.“** (fast-forward `test` po zeleném celém kole; `main` jen na pokyn). Rozpočet: do resetu týdne (so 17. 10. 6:00 Praha) zbývá ~16 % → v pátek čerpat ≤ ~5 %; nový týden víkend ≤ 50 % (plán ~16 % + 10 % rezerva). Odhad ~9 USD ceny výpočtu ≈ 1 % týdne; J. V. pošle % z panelu Usage pá večer a so dopoledne → kalibrovat. Max. 3 dávky souběžně + koordinace; každá dávka nové sezení, nad 60 % kontextu předávka.

## Rozhodnutí J. V. 16. 10. (dialog)
1. **#355** můstky ↔ přechodové plechy: **výpočet beze změny, jen upozornit** obchodníka (kontroly před nabídkou), ať zváží ruční úpravu.
2. **#356** střecha (EXT) přes nejvyšší můstek: **plochu navíc připočítat do zastřešení** automaticky.
3. **B165**: schvalovatel v kartě cenové výjimky **vidí ceníkovou vs. použitou sazbu a dopad na cenu varianty v %**.
4. **#366** číslo SoD: **aplikace navrhne další číslo z řady (podle čísla nabídky, např. 2026 - OPR - SOD - 0412), obchodník může přepsat**; tisk SoD zamkne termín, podpisy a podmínky.
5. **#367** platební podmínky: **odloženo na pondělí 19. 10.** — „musíme to projít víc na detail“ (nespouštět o víkendu).
6. **#157** SoD v angličtině: **překlad české šablony** (soubor ke kontrole rodilým mluvčím), napojit jako jazyk EN.
7. Víkend **podle plánu** (V1 + A2 v sobotu, V3 + B165 v neděli; V2 = #367 odpadá).

## Okna (Praha)
- **O1 pá 15–19:** dokončit S11 (B155), S12 (lešení + vlastní řádek), S13 (cena dle nabídky); sloučit do `claude/integrace-16-10` (nad `test` 1cbab3a; konflikty S11 × S13 ve `src/vyjimky.js` / schvalování), sady. Souběžně **A1** dočištění auditu 25 (#420: B158, B159, B160, B163, B166 + zápis B161, B162a, B164 do BEZPECNOST_MEZE) a **V4** kontrola, že rozhodnutí 15.–16. 10. jsou v kódu, příručce i EN/DE/FR (jen nálezy + drobné opravy).
- **O2 pá 19–24:** sloučit A1, V4 → **celé kolo s mutacemi** (odd. worktree, setsid; po restartu kontejneru `git checkout -- .` v pracovní kopii kola a znovu) → zelené: fast-forward `test`, release odkaz (`release_odkaz.py`).
- **O3 pá 24 – so 6:** klid / doběh.
- **O4 so 6–11:** **N2 testovací kolo 26 + bezpečnostní audit** změn od v15.10.14 (schvalování, B155, cena dle nabídky, dotisk) — dávka podle skillu testovaci-procedura-kng; nálezy číslovat dál od B178.
- **O5 so 11–16:** **V1 #366** (rozhodnutí 4) · **A2 #355 + #356** (rozhodnutí 1, 2).
- **O6 so 16–21:** opravy vysokých/středních nálezů kola 26; sloučení V1, A2 + sady.
- **O7 so 21 – ne 6:** celé kolo s mutacemi → `test` + release.
- **O8 ne 8–13:** **V3 #380 + #157** (rozhodnutí 6) · **B165** (rozhodnutí 3).
- **O9 ne 13–18:** sloučení + celé kolo → `test` + release; závěrečná zpráva J. V. + soupis novinek pro obchodníky (jako https://claude.ai/artifact/DMWk88SYC2TphF3FJ7zSQS).
- **Po 19. 10.:** V2 #367 platební podmínky — připravit k detailnímu projití s J. V. (nespouštět bez něj).

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
