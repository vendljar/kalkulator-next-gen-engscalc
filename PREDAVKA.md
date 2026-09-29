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
| B111 | vysoká | ✅ opraveno | a25edfd | v29.9.2 | test_zaporne 3 OK/19 FAIL → 24/0; overit_zaporne 5/10 → 15/0; test_kontroly 97/8 → 105/0 | mutace +3, chycené 3/3 |
| B96 | vysoká | ✅ opraveno | (tento commit) | v29.9.3 | test_prava 587/7 → 595/0; test_uloziste 161/1 → 172/0; overit_zaokrouhleni 12/4 → 16/0 | mutace +2, chycené; bod 4 jen návrh |
| B112 | vysoká | ⬜ další na řadě | | | | |
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

## Kontrola po B111 (pred_pushem.sh = kolo bez mutací)
185 prošlo, 4 selhalo, 1 přeskočeno (test.js — skutečný ceník). Selhání:
`overit_lista` (čekal 19 pravidel — doplněno na 20, opraveno druhým commitem),
`overit_manual` (příručka pro v29.9.2 na Disku není → krok 0.7),
`overit_nabidka_proj_word` a `overit_sablony_online` (šablona PROJ v3 je
novější než kód → PROJ v2_opravena jako v 21. kole). Po úpravě podkladů
a harnessu: overit_lista 271/271, overit_manual 37/37,
overit_nabidka_proj_word 51/51, overit_sablony_online 53/53. Statické
kontroly 3 z 3.

## B96 — co je hotovo (v29.9.3)
- Pravidlo 0 potvrzeno: obchodník, sleva 0 %, `zaokr {krok: 490001, smer:
  'dolu'}` → 200 a cena OCK 980 000 → 490 001 Kč.
- Server `uloZaokrProblemy()` (přes `uloProVarianty()`), volání hned za B111.
  UI setterů jen z výčtu, `<select>` ukáže hodnotu mimo výčet.
  `overit_zaokrouhleni.mjs` přešel z kroku 100 000 (mimo výčet) na 10 000.
- **Bod 4 — návrh, nerealizováno (čeká na J. V.):** serverová kontrola marže
  z KONCOVÉ ceny (`cenaNabidkyOck/Proj`), kdykoli je nižší než základ, i bez
  platné slevy. Pokryla by B96 a u B112 změnu přirážky; **nepokryla by B111**
  ani změnu jednotkové ceny v ceníku (náklad klesne stejným poměrem jako
  cena, marže vyjde stejná). Proto každá cesta má vlastní kontrolu a bod 4
  je jen obrana do hloubky — hlavně pro zaokrouhlení z výčtu (u PROJ až
  9 999 Kč × počet činností). Zapsáno v `BEZPECNOST_MEZE.md`.

## Rozhodnutí podle výchozího návrhu — čekají na potvrzení J. V.
- **B111:** zápornou položku, množství ani hodiny nesmí nikdo, ani
  administrátor (dobropis ne; jako N56).
- **B96 bod 4:** marže z koncové ceny i bez slevy — jen návrh, nerealizováno.

## Co čeká na J. V.
- Spustit `node nastroje/detekce_zneuziti.mjs <záloha ostré databáze>`
  (Nastavení → Databáze → Zálohovat teď) — najde dřívější zneužití
  (záporné položky B111, krok/směr zaokrouhlení mimo výčet B96, i
  v odeslaných nabídkách).
- Rozhodnout bod 4 B96 (marže z koncové ceny i bez slevy).
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
  CN v13 + EN/DE/FR, CN v11 (= kopie v13), **PROJ = `Sablona_NABIDKA_PROJ_v2_opravena`**
  (v3 je novější než kód této větve — nese symboly `{{BLOK_NAVIC_ZAC}}`,
  `{{PROJ_POLOZKY_NAVIC}}`, které kód v26.9.1 nezná; leží vedle jako `.bak`),
  SoD realizace/projekce, plná moc, příručka v25.9.3 — **před každým kolem
  kopie s přepsaným číslem verze** (krok 0.7 skillu,
  `2026-09-29_kalkulator_v<verze>_MANUAL_OBCHODNIK.html`). Stahuje se
  konektorem Drive (hledat podle názvu).
- `ADMIN_EMAIL=spravce@priklad.cz`; `node_modules/playwright` →
  `$(npm root -g)/playwright`, `playwright-core` →
  `…/playwright/node_modules/playwright-core`.
- Mutace jen jeden běh naráz na pozadí, nikdy nepřerušit; potom
  `git status` a `grep -rn "if (false)" netlify src`.

## Další krok
B112 (příloha C): ceník varianty a přepisy proti uložené verzi / zveřejněnému
ceníku / jiné variantě podle role a matice (`uloCenikProblemy` přes
`uloProVarianty`, volání hned za B96), testy v `netlify/test_prava.mjs`,
pak **celé kolo č. 1** (`KNG_PODKLADY=/home/user/kng_podklady bash
nastroje/testovaci_kolo.sh`, před tím kopie příručky pro aktuální verzi).
