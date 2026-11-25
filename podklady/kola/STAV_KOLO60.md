# STAV kola 60 — A8 z PIPEDRIVE_SPUSTENI: vazba z webhooku a vypnutý zápis (test v25.11.3, 5c42ca1)

Stav: **ROZPRACOVÁNO** (TESTOVÁNÍ 5, 25. 11.) — bod 1 hotový, bod 2 čeká na vypnutí PIPEDRIVE_ZAPIS. Kolo poběží v novém testovacím sezení (J. V. 25. 11.: kontext
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

## Průběh (WIP, TESTOVÁNÍ 5)

- Souhlas J. V. v sezení 25. 11.: „souhlasím, deal založ“; automatizace webhooku zůstává trvale zapnutá (TEST ve jménech nabídek).
- Deal TEST 439 založen sezením (CN = TEST 9878, filtr 432). Automatizace „Pojmenování nového dealu v4“ při založení
  přepsala CN na „CN-439“ → webhook založil novou kalkulaci CN-439 (vazba „webhook“). Pak CN v dealu ručně = TEST 9878
  a nové „Vygenerovat nabídku“ → vazba „ceka“ u TEST 9878.
- Bod 1: OK (podrobnosti doplním).
