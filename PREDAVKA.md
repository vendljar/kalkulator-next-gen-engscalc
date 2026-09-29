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
| B96 | vysoká | ✅ opraveno | 3c3dd6d | v29.9.3 | test_prava 587/7 → 595/0; test_uloziste 161/1 → 172/0; overit_zaokrouhleni 12/4 → 16/0 | mutace +2, chycené; bod 4 jen návrh |
| B112 | vysoká | ✅ opraveno | 57fe11f (+ harness) | v29.9.4 | test_prava 608/15 → 623/0; overit_cenik_prava 4/2 → 6/0 | mutace +4, chycené 4/4 |
| — | — | ✅ celé kolo č. 1 | | v29.9.4 | sady 189/1/1, mutace 76/76 + 196/196, statické 3/3 | selhal jen overit_online (fixtura B112) — opraveno, 189/0 |
| B97 | střední | ✅ opraveno | f3db355 | v29.9.5 | test_prihlaseni 45/5 → 50/0 | mutace +2, chycené 2/2; B75 ×3 chycené |
| B98 | střední | ✅ opraveno | b814ebb | v29.9.6 | test_obnova 160/6 → 166/0 | mutace +2, chycené 2/2; P4 ×5 chycené |
| B99 | střední | ✅ opraveno | 350cb1b | v29.9.7 | test_sablona_obsah 1/1 → 27/0; test_sablony 19/3 → 22/0 | mutace +1, chycená; firemní šablony projdou |
| — | — | ⬜ celé kolo č. 2 (běží) | | v29.9.7 | | po B99 |

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

## Kontrola po B96 (pred_pushem.sh)
189 prošlo, 0 selhalo, 1 přeskočeno (test.js); statické kontroly 3 z 3 —
VŠE ZELENÉ (podklady: PROJ v2_opravena, příručka s číslem v29.9.3).

## B112 — co je hotovo (v29.9.4)
- Pravidlo 0 potvrzeno: server — přirážka −0,10 (OCK −25 %), PROJ −0,30
  (−41,7 %), profily 100 → 1 Kč/kg (−14,2 %), přepisy — vše 200;
  prohlížeč — `set('C.marze', -0.1)` z konzole a uložení → uloženo.
- Server `uloCenikProblemy()` (přes `uloProVarianty()`), volání hned za B96,
  **403**. Admin vždy; jinak matice ze serveru: ceník OCK `tab.cenik`, PROJ
  `tab.cenikproj`, přirážka `pole.prirazka`, přepisy `sloupce.naklad`.
- **Ověřeno v UI, které přepisy obchodník legitimně smí:** žádný. Ruční
  množství (i u příplatků — zadání J. V. 2. 9.), ruční cena, sazba a fixní
  částka PROJ i vlastní % sekce se zadávají jen ve sloupcích, které ukazuje
  právo `sloupce.naklad` (`kalkSloupce()` → `col.admin`); výchozí matice ho
  nikomu nedává. Server se řídí týmž klíčem. **Otázka pro J. V.:** mají
  obchodníci upravovat množství příplatků (jak říká zadání z 2. 9.)? Pak
  jim dát `sloupce.naklad` (ukáže i náklady), nebo zavést samostatné právo.
- Ceník se porovnává po položkách (přepočet vybraných položek nechává
  směs); kandidáti: uložená verze téže varianty, zveřejněné ceníky (platná
  + historie, složené pro řadu, po týchž migracích jako import — lešení,
  fixy PROJ, doplnění klíčů), jiné uložené varianty (klon); ceník sestavení
  jen celý nebo u klíče, který zveřejněný ceník nemá. Popisy a DPH volně.
- Testy upravené kvůli realistickým datům (nikoli oslabené): fixtury
  `test_prava` nesou platný zveřejněný ceník; B26 v `test_prava`
  a očista značek v `test_funkce` ukládají pod administrátorem.

## Závěr: třída „koncová cena bez schválení" po B111 + B96 + B112
Tři doložené cesty jsou zavřené na serveru (záporná položka, krok
zaokrouhlení mimo výčet, ceník a přepisy bez práva) — při uložení i obnově.
**Třída tím zavřená není úplně**; zůstává (roadmapa **#374**):
1. hodiny a rezerva **standardních** položek PROJ a cena trvalé položky
   s `kid` v zadání — UI je ukazuje jen se `sloupce.naklad`, server nehlídá,
   kdo je změnil (stejná díra jako B112, jen jiná pole);
2. obchodní zaokrouhlení **z výčtu** dolů (OCK < 10 000 Kč, PROJ až
   9 999 Kč × počet činností) — vědomě podle #38;
3. bod 4 B96 (marže z koncové ceny i bez slevy) — obrana do hloubky,
   nerealizováno;
4. rozsah práce v kartě „Práce a režie" (hodiny montáže, projekce)
   zadává obchodník vědomě — to je rozhodnutí produktu, ne díra.
Poznámka: dokumenty (Word, PDF) vznikají v prohlížeči — upravený klient si
může vyrobit cokoli; server chrání uložený doklad, zámky a rejstřík.

## Celé kolo č. 1 (v29.9.4, commit 57fe11f; 64 min 34 s)
`KNG_PODKLADY=/home/user/kng_podklady bash nastroje/testovaci_kolo.sh`:
- kontrola verze + sestavení ✓;
- **sady 189 prošlo, 1 selhalo, 1 přeskočeno** (test.js — skutečný ceník);
  selhal `overit_online.mjs`: oddíl B59 si zkušební ceník podstrčil jen
  v prohlížeči obchodníka a ukládal — B112 to odmítl 403 a harness pak visel
  (ukončen po ~12 min, mutace ještě neběžely). Oprava: harness zkušební
  ceník nejdřív zveřejní pod administrátorem (commit po 57fe11f);
  `overit_online.mjs` pak **189 OK, 0 FAIL**;
- **mutace jádra 76 z 76**, **mutace serveru 196 z 196** (0 chybně zadaných);
- statické kontroly 3 z 3; strom po běhu čistý, `if (false)` nikde;
  `dist/kalkulacka_v29.9.5.html` (N61) smazán.
Tři serverové kontroly B111 → B96 → B112 na jednom místě se snesly.

## B97 — co je hotovo (v29.9.5)
- Pravidlo 0 potvrzeno: 61× e-mail „ip:198.51.100.55" z jiné adresy → majitel
  z napadené adresy 429 i se správným heslem; totéž IPv6 a „Změnit moje heslo".
- Předpona „e:" u e-mailového klíče; neplatný tvar e-mailu nezakládá
  e-mailové počítadlo, adresu počítá. Odložené B108 (klouzavé okno), zbytek
  B77, B106, B107, B4 souběh — neřešeno (jen evidence).

## B98 — co je hotovo (v29.9.6)
- Pravidlo 0 potvrzeno: obnova ze souboru zapsala podvrženou „shodu"
  zmrazeného výsledku (zakladCena 1) na jméno hlavního správce i odemčení
  odeslané nabídky s razítkem hlavního správce a libovolným datem.
- Ze souboru: ověření nového zámku vždy znovu (nesouhlas → „nesouhlasi"
  + upozornění v náhledu u zakázky); odemčení, které v databázi není →
  zakázka přeskočena s důvodem. Z otisku beze změny (BEZPECNOST_MEZE.md).
- Odložené B100 (firma/zákazníci/šablony bez očisty), zbytek B32, B104,
  B109 — neřešeno (jen evidence).

## B99 — co je hotovo (v29.9.7)
- Pravidlo 0 potvrzeno: syntetická šablona s vnějším `attachedTemplate`
  → zveřejnění 200, průvodce (docxXmlVady) nic nenašel, generátor i překlad
  přenesly `settings.xml.rels` s `example.invalid` do výsledku.
- `src/sablona_obsah.js` volá server, průvodce i generátor/překlad.
- **Odchylka od zadání:** vnější hypertextové odkazy se povolují na
  `http(s):` **i `mailto:`** — dnešní šablona PROJ nese 2× mailto (zadání
  chce, aby firemní šablony prošly); mailto Word sám neotevírá.
- **Vztahy ve firemních šablonách** (29. 9., podklady z Disku):
  CN v13 + EN/DE/FR a CN v11: header, footer, footnotes, endnotes,
  numbering, settings, styles, theme, webSettings, fontTable, image ×3,
  hyperlink (vnější, http) ×1; PROJ v2_opravena (i v3): totéž + customXml ×4,
  custom-properties, image ×12, hyperlink vnější http ×1 a mailto ×2, pole
  PAGE / MERGEFORMAT; SoD realizace: customXml, footer ×3, header, image ×1,
  pole PAGE; SoD projekce: footer, numbering, pole PAGE; plná moc: customXml,
  footer, pole PAGE. Žádná makra, vložené objekty, ActiveX ani pole
  INCLUDE/DDE. Všechny kontrolou projdou.

## Rozhodnutí podle výchozího návrhu — čekají na potvrzení J. V.
- **B111:** zápornou položku, množství ani hodiny nesmí nikdo, ani
  administrátor (dobropis ne; jako N56).
- **B96 bod 4:** marže z koncové ceny i bez slevy — jen návrh, nerealizováno.
- **B112:** vedeno jako nový nález B112 (vysoká); B88 dál jen čtecí strana
  (informativní).
- **B97:** vážnost střední.
- **B98:** odemčení ze souboru, které v databázi není → zakázku přeskočit
  s důvodem v náhledu obnovy (i zakázku, která v databázi není vůbec).

## Co čeká na J. V.
- Spustit `node nastroje/detekce_zneuziti.mjs <záloha ostré databáze>`
  (Nastavení → Databáze → Zálohovat teď) — najde dřívější zneužití
  (záporné položky B111, krok/směr zaokrouhlení mimo výčet B96, i
  v odeslaných nabídkách).
- Rozhodnout bod 4 B96 (marže z koncové ceny i bez slevy) a #374
  (zbývající cesty třídy „koncová cena").
- Množství příplatků obchodníkem (zadání 2. 9.) vs. právo `sloupce.naklad`.
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
**Celé kolo č. 2** nad v29.9.7 (před tím kopie příručky pro aktuální verzi),
výsledek sem, závěr pro J. V. Potom úkol 2 — etapa B platebních podmínek
v nové větvi `claude/etapa-b-plan-plateb-proj` z `origin/test-draft`.
