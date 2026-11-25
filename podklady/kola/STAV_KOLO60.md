# STAV kola 60 — A8 z PIPEDRIVE_SPUSTENI: vazba z webhooku a vypnutý zápis (test v25.11.3, 5c42ca1)

Stav: **HOTOVO** (TESTOVÁNÍ 5, 25. 11. 2026) — oba body OK, žádná vada aplikace; 1 informace (K60-I1). Bez dopadu na cenu. Kolo poběží v novém testovacím sezení (J. V. 25. 11.: kontext
sezení TESTOVÁNÍ 3 je nad 75 %). Tenhle soubor je zadání pro to sezení.

## Zadání (koordinace 25. 11.)

1. **Vazba kalkulace na deal z webhooku:** lišta „čeká na potvrzení správcem“; „V pořádku“ smí jen administrátor.
   Obchodník tlačítko nevidí a API mu vrátí 403 (`/api/pd/vazba`, `netlify/functions/pd_vazba.mjs`). „Zrušit vazbu“
   smí autor zakázky a administrátor. Potvrzení i zrušení se musí objevit v protokolu zakázky.
2. **Vypnutý zápis:** když na testu není PIPEDRIVE_ZAPIS = ano, odeslání ani prodej nic do dealu nezapíšou
   a aplikace to srozumitelně řekne. Po zapnutí zpět vše funguje jako dřív (CN-432 / CN-437).

K59-I1 (stará chybná částka v dealu 437) se v tomto kole neopravuje, čeká na J. V.

## Souhlas a pravidla J. V.

- J. V. 25. 11.: „se zápisy na testu souhlasím vždy a v jakémkoliv rozsahu. jen ve jméně cenové nabídky vždy
  uváděj slovo TEST“. Nové sezení si souhlas potvrdí u J. V. přímo u sebe (pravidlo CLAUDE.md).
- Pipedrive: jen dealy TEST (432, 437, případně nový TEST deal pro tohle kolo).
- Přihlášení obchodníka: proměnné prostředí `KNG_TEST_OBCHODNIK_*` (už jsou nastavené).
- PIPEDRIVE_ZAPIS v Netlify testu přepíná J. V. na pokyn sezení. Po zkoušce ho zapne zpět.

## Jak vyrobit vazbu „čeká“ (pokyn pro J. V.)

Vazba `ceka` vznikne, jen když webhook naváže **existující** kalkulaci bez dealu. Deal 437 už patří CN-437:
změna jeho čísla nabídky by skončila 409. Proto se použije nový TEST deal:

1. Sezení vybere existující TEST zakázku bez dealu (např. `TEST - 2026 - OPR - CN - 9878` z kola 59) a nahlásí její číslo.
2. J. V. (nebo sezení přes Pipedrive, deal TEST) založí deal „TEST K60 vazba“ a do pole **„Číslo nabídky (CN)“**
   vloží přesně to číslo.
3. J. V. v Pipedrive → Automatizace zapne automatizaci webhooku (spouštěč **jen změna pole „Vygenerovat
   nabídku“**, nikdy „deal aktualizován“; `podklady/PIPEDRIVE_WEBHOOK_553.md` část 1.2).
4. V dealu „TEST K60 vazba“ přepne pole **„Vygenerovat nabídku“**. Webhook vrátí odkaz do pole „Odkaz na kalkulaci“.
5. J. V. automatizaci hned zase zastaví. Sezení pak ověří lištu, práva a protokol.

## Úklid po kole

Deal „TEST K60 vazba“ a zakázky TEST 9877 / 9878 mazat jen na pokyn J. V. PIPEDRIVE_ZAPIS musí být zpět „ano“.

## Hlavička (výsledek)

- Test v25.11.3 (`/api/zdravi`, beze změny verze i po dvou nasazeních kvůli PIPEDRIVE_ZAPIS). Main nic.
- Kdo: testovací sezení TESTOVÁNÍ 5, větev `claude/testovani-5` (z bbba510). Účty: testovací správce (`KNG_TEST_*`)
  a obchodník (`KNG_TEST_OBCHODNIK_*`). Pipedrive jen dealy TEST 432 a nový 439.
- **Souhlas J. V. v sezení 25. 11.:** „souhlasím, deal založ“ (zápisy na test, deal TEST pro kolo). Automatizace
  webhooku „Vygenerovat nabídku → poslat do kalkulátoru“ zůstává trvale zapnutá (J. V.: v testovacích nabídkách vždy TEST).
- Harnessy (Playwright + curl, mimo repo): `k60_ui.js` (lišta vazby obchodník / správce, klik „V pořádku“),
  `k60_zapis_ui.js` (karty Odeslání a Prodej s vypnutým zápisem).

## Výsledky

| bod | úkol | výsledek | poznámka |
|---|---|---|---|
| 1a | webhook naváže existující kalkulaci bez dealu → „čeká“ | OK | Deal 439, CN = `TEST - 2026 - OPR - CN - 9878` → zakázka 9878 `pdVazbaWebhook.stav = ceka`, protokol „Navázáno na deal 439 podle čísla nabídky …; doplněno: nic; ponecháno … název akce“. Napoprvé nešlo — viz K60-I1. |
| 1b | lišta pro obchodníka | OK | Žlutá lišta s textem vazby, „čeká na potvrzení správcem“ + „Vazba je chybná“; „V pořádku“ ani „Zrušit vazbu“ nevidí. |
| 1c | server obchodníkovi | OK | `POST /api/pd/vazba` potvrdit → 403 „Vazbu na deal potvrzuje jen administrátor…“; zrušit (není autor) → 403. |
| 1d | lišta pro správce, „V pořádku“ v prohlížeči | OK | Správce vidí „V pořádku“ + „Zrušit vazbu“; klik → stav `potvrzeno`, lišta zmizí, protokol „Vazbu na deal 439 (číslo nabídky …) potvrdil („V pořádku“)“. |
| 1e | „Zrušit vazbu“ | OK | CN-439 (autor J. V.): obchodník 403, správce 200, `odkazVDealu = smazano`, deal odmítnutý, protokol „Vazbu na deal 439 zrušil; … údaje doplněné webhookem zůstaly: název akce“. Stejně u 9878 po zapnutí zápisu (16:14). U potvrzené vazby lišta ani tlačítko nejsou (podle kódu: zrušit jde jen u „čeká“ nebo nahlášené) — zrušeno přes API. |
| 2a | vypnutý zápis — server | OK | PIPEDRIVE_ZAPIS = ne + nové nasazení: náhled odeslání i prodeje CN-432 `zapisPovolen = false`; zápis odeslání i prodeje → 503 „Zápis do Pipedrive je vypnutý (proměnná PIPEDRIVE_ZAPIS v Netlify) — do Pipedrive se nic neodeslalo.“; obojí v protokolu zakázky. |
| 2b | vypnutý zápis — deal beze změny | OK | Deal 432: `update_time`, počet poznámek (4) a souborů (1) stejné před i po. |
| 2c | vypnutý zápis — aplikace | OK | Karty „Odeslání do Pipedrive“ a „Prodej“: červeně „Zápis do Pipedrive je na serveru vypnutý (PIPEDRIVE_ZAPIS) — nic se neodešle.“, „Potvrdit a zapsat do Pipedrive“ zašedlé; uložený stav kroku „NEPOVEDLO SE / zápis selhal — …“ s důvodem. |
| 2d | po zapnutí jako dřív | OK | PIPEDRIVE_ZAPIS = ano + nasazení: náhledy `zapisPovolen = true`, zápis odeslání a prodeje CN-432 → 200 (deal už měl vše, „beze změny“ jako v kole 59); skutečný PATCH ověřen zrušením vazby 9878 ↔ 439 (odkaz v dealu smazán). CN-437 se nezkoušela (stejná cesta kódu). |

## Nálezy

### K60-I1 — Automatizace „Pojmenování nového dealu v4“ přepíše číslo nabídky nového dealu (informace, cena ne)

- Kroky: nový deal s „Číslo nabídky (CN)“ = číslo existující kalkulace → „Vygenerovat nabídku“.
- Stalo se: Pipedrive automatizace (mimo kalkulátor) při založení přepsala CN na `CN-<id dealu>` a název dealu;
  webhook proto založil NOVOU kalkulaci CN-439 místo navázání existující. Aplikace se zachovala správně.
- Dopad pro ostrý provoz: existující kalkulaci nejde navázat novým dealem, jen dodatečnou změnou CN v dealu
  (pak „čeká“ a potvrzení správcem funguje). Rozhodne J. V., zda je to žádoucí (pak jen do návodu) nebo upravit automatizaci.

## Úkoly a úklid

- PIPEDRIVE_ZAPIS na testu je zpět `ano` (J. V. 25. 11., nasazeno).
- Deal TEST 439 („CN-439 - TEST“): CN = TEST 9878, odkaz prázdný, fáze 22. Kalkulace CN-439 (název akce „TEST“, vazba zrušena)
  a TEST 9878 (vazba na 439 zrušena, deal 439 odmítnutý). Mazat jen na pokyn J. V. (s 9877).
- Dealy 432 / 437 beze změny (437 se v kole nepoužil). K59-I1 neřešeno.
