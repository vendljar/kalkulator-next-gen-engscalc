# Stav Pipedrive v hlavičce kalkulace — zadání pro „Pipedrive API integrace“ (22. 10. 2026)

Rozhodnutí J. V. 22. 10. 2026 (náhled: https://claude.ai/artifact/UHqdUv62Kax3NCLGHWXcb1).

## Co vzniká v kalkulaci

- Nové pole **„Stav Pipedrive“** v pravém sloupci sdílené hlavičky zakázky (OCK i PROJ), **úplně nahoře**;
  ostatní řádky (Otevřená varianta, Režim výpočtu, Globální přirážka, Ceník…) se posunou o řádek níž.
- Hodnoty přesně podle Pipedrive: **Otevřené, Ztracené, Vyhrané, Smazané** (deal `status`: `open`, `lost`,
  `won`, `deleted`) + barevný štítek u popisku. Zakázka bez propojeného dealu (`zak.pdDealId` prázdné):
  pole šedé „— zakázka nemá deal —“.
- **Jen ke čtení:** stav jde z Pipedrive, v kalkulaci ho **nesmí měnit nikdo**; **vidí ho všichni**, kdo vidí
  zakázku. Pod polem žádný doplňující šedý text.
- **Stav v kalkulaci nic neovlivňuje** (cena, zámek, SoD, export) — je to informace z Pipedrive a pro
  potřeby controllingu.

## Co je potřeba od integrace Pipedrive (přenos stavů)

1. **Čtení stavu dealu** podle `zak.pdDealId` (deal propojený se zakázkou; dnes ho zapisuje propis nabídky
   do CRM, ručně jen administrátor — C4). Endpoint na serveru (Netlify funkce), klíč Pipedrive jen na
   serveru; prohlížeč dostane jen `{status, nacteno}`.
2. **Kdy:** při otevření zakázky (a případně tlačítkem „načíst znovu“ — jen pokud bude potřeba); výsledek
   uložit k zakázce jako poslední známý stav (`zak.pdStav = {status, nacteno}`), aby se ukázal i offline
   a šel do exportu pro controlling.
3. **Smazaný deal:** Pipedrive smazaný deal po 30 dnech odstraní úplně — pak API stav nevrátí; kalkulace
   ukáže poslední známý stav „Smazané“ (nepřepisovat na „nepropojeno“).
4. **Export pro controlling:** doplnit sloupec „Stav Pipedrive“ (poslední známý stav + datum načtení) —
   jen informace, filtry exportu se nemění.
5. Bez zápisu do Pipedrive (žádná změna stavu z kalkulace); chyby API (deal nenalezen, 401, výpadek)
   jen tiše ponechají poslední známý stav.

## Stav

**Hotovo v22.10.2 (dávka P1, větev `claude/p1-stav-pipedrive`, roadmapa #501)** — viz CHANGELOG. Řešení přenosu:
`GET /api/pd/stav?soubor=…` při otevření zakázky, poslední známý stav v úložišti `pd_stav`, k zakázce ho připojuje
server (čtení, uložení, hromadný export).

Původně: čekalo na odsouhlasení náhledu J. V. → pak dávka do aplikace (UI hlavičky + serverové čtení + test
s pojistkou + mutace). Koordinace: session_01X93Edh1U8MQru6HV28FdBY.
