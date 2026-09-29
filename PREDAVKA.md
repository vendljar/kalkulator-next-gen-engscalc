# Předávka — větev `claude/oprava-sesti-nalezu-v29.9.1` (29. 9. 2026)

Oprava šesti nálezů komplexního testu 29. 9. 2026 (21. kolo, v29.9.1).
Zadání: `podklady/PROMPT_oprava_sesti_nalezu_v29.9.1.md` na `test-draft`
(platí beze změny, včetně příloh A–F). Větev vznikla z **9a48ee8** (tag
v29.9.1 = hlava `claude/pensive-curie-s6yzs3`, kód = v26.9.1). Pushuje se
jen sem; o sloučení do `test-draft` rozhoduje J. V. Podrobnosti nálezů:
`git show 4505aa4:PREDAVKA.md` (větev `claude/komplexni-test-v29.9.1`).
Roadmapa v této větvi: 366 položek, nová **#373** (tahle oprava).

Předchozí obsah předávky (stav větví k 29. 9., zadání komplexního testu) je
v `git show 9a48ee8:PREDAVKA.md`.

## Stav šesti nálezů

| ID | Vážnost | Stav | Commit | Verze | Testy před / po | Poznámka |
|----|---------|------|--------|-------|-----------------|----------|
| B111 | vysoká | ✅ opraveno | (tento commit) | v29.9.2 | test_zaporne 3 OK/19 FAIL → 24/0; overit_zaporne 5/10 → 15/0; test_kontroly 97/8 → 105/0 | mutace +3, chycené 3/3 |
| B96 | vysoká | ⬜ další na řadě | | | | |
| B112 | vysoká | ⬜ | | | | |
| — | — | ⬜ celé kolo č. 1 | | | | po B112 |
| B97 | střední | ⬜ | | | | |
| B98 | střední | ⬜ | | | | |
| B99 | střední | ⬜ | | | | podklady z Disku jsou (viz níže) |
| — | — | ⬜ celé kolo č. 2 | | | | po B99 |

## B111 — co je hotovo (v29.9.2)
- Pravidlo 0 potvrzeno: server 980 000 → 617 000 Kč (OCK), 271 200 → 162 720
  Kč (PROJ), uložení 200; v prohlížeči totéž (harness před opravou).
- Server: `uloZaporneProblemy()` + společná `uloProVarianty()` (přeskočení
  varianty zamčené v uložené verzi, cesty „varianta X: …") v `src/uloziste.js`;
  volání v `netlify/lib/zakazka_kontrola.mjs` hned za `uloTypyProblemy`.
  **B96 a B112 mají použít `uloProVarianty()` a volat se hned za B111.**
- UI: `min="0"`, `zaporneOdmitni()` v setterech, `HODINY_BEZ_ZAPORU` + cena
  PROJ; odmítnutí serveru se nově ukáže u tlačítka „Uložit zakázku"
  (`zakUlozUI`) — dřív jen v panelu Databáze (využije i B112).
- Kontroly: `zapornaPolozka` (zábrana), pravidel je 20.
- `nastroje/detekce_zneuziti.mjs <zaloha.json>` — jen čte; B96 do něj
  přidá kontrolu kroku zaokrouhlení.

## Rozhodnutí podle výchozího návrhu — čekají na potvrzení J. V.
- **B111:** zápornou položku, množství ani hodiny nesmí nikdo, ani
  administrátor (dobropis ne; jako N56).

## Co čeká na J. V.
- Spustit `node nastroje/detekce_zneuziti.mjs <záloha ostré databáze>`
  (Nastavení → Databáze → Zálohovat teď) — najde dřívější zneužití
  (záporné položky, i v odeslaných nabídkách).
- Potvrdit rozhodnutí výše.

## Při slučování do test-draft (očekávaný konflikt)
- V `test-draft` stojí serverový blok **#372** (neznámý rozměr profilu, tamní
  číslování; v této větvi #365) hned za `uloTypyProblemy` v
  `netlify/lib/zakazka_kontrola.mjs` a je tam i razítko `upravilJmeno` (P7).
  Volání B111 / B96 / B112 a blok #372 se zařadí za sebe — konflikt na tomto
  místě je očekávaný. #372 je opravený jen v test-draft, tady se neopravuje.
- Roadmapa: v test-draft je 372 položek; zdejší #364/#365 = tamní #371/#372,
  nová položka této větve je **#373** (v test-draft volné číslo).
- CHANGELOG: oddíly v29.9.2+ této větve se v test-draft zařadí nad v29.9.4.

## Odložené nálezy (neopravovat, jen evidovat)
Zbytek B77, B100–B110, zbytek B32, B4 souběh, B6, N59–N61 (viz 4505aa4).
N46 se neopravuje bez pokynu J. V.

## Prostředí (pro další sezení)
- Podklady (mimo repozitář, necommitovat): `/home/user/kng_podklady` —
  CN v13 + EN/DE/FR, CN v11 (= kopie v13), PROJ = `Sablona_NABIDKA_PROJ_v3`
  z Disku, SoD realizace/projekce, plná moc, příručka v25.9.3. Stahuje se
  konektorem Drive (hledat podle názvu). Seznam: scratchpad `podklady.md`.
- `ADMIN_EMAIL=spravce@priklad.cz`; `node_modules/playwright` →
  `$(npm root -g)/playwright`, `playwright-core` →
  `…/playwright/node_modules/playwright-core`.
- Mutace jen jeden běh naráz na pozadí, nikdy nepřerušit; potom
  `git status` a `grep -rn "if (false)" netlify src`.

## Další krok
B96 (příloha B): krok a směr zaokrouhlení z výčtu na serveru
(`uloZaokrProblemy` přes `uloProVarianty`), UI setterů a `<select>`,
detekce v `nastroje/detekce_zneuziti.mjs`, testy v `netlify/test_prava.mjs`.
