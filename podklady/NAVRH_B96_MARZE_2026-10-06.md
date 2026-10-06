# Návrh — B96 bod 4: marže z koncové ceny i bez slevy (6. 10. 2026)

Dávka A (#374), jen návrh — **kód se nemění, čeká na rozhodnutí J. V.**
Navazuje na audity 30. 9. 2026 (B117) a 2. 10. 2026 a na
`BEZPECNOST_MEZE.md` (třída „koncová cena bez schválení").

## Dnešní stav

- Minimální marže se na serveru hlídá jen u **platné slevy**
  (`schvalovaniServerMarze`, `src/schvalovani.js` ~ř. 488–510): bez slevy
  (`slevaPlati` = false) se marže nepočítá vůbec.
- Počítá se z **ceny před obchodním zaokrouhlením** (`schvalovaniZakladCasti`
  → `slevaVyhodnot(zakladCena, zakladNaklad, …)`); koncová cena po
  zaokrouhlení (`cenaNabidkyOck` / `cenaNabidkyProj`, `src/zaokrouhleni.js`)
  do kontroly nevstupuje.
- Důsledek (B117): sleva těsně na hranici minimální marže + zaokrouhlení
  z výčtu dolů (krok až 10 000 Kč) skončí pod marží o méně než jeden krok,
  u PROJ až krok × počet činností. Bez slevy se nehlídá ani to.

## Návrh

Na serveru (uložení i obnova, `zakazkaServerKontrola`) u každé neuzamčené
varianty a každé části (OCK, PROJ):

1. spočítat **koncovou cenu** tak, jak ji tiskne nabídka — sleva (je-li
   platná) a zaokrouhlení varianty (`zaokr`, `zaokrProj`);
2. je-li koncová cena **nižší než základ** (`zakladCena`), ověřit
   `(koncová − náklad) / koncová ≥ minMarze` **i bez slevy**;
3. při porušení 403 s větou „Zaokrouhlení dolů by stlačilo nabídku pod
   firemní minimální marži — zvolte zaokrouhlení nahoru nebo menší krok,
   případně slevu ke schválení."

Výjimky: administrátor (jako B112), varianta zamčená v uložené verzi
(doklad), `minMarze` nenastavené.

## Co to pokryje a co ne

| Cesta | Pokryje? | Proč |
|---|---|---|
| B117 zaokrouhlení z výčtu dolů | ano | náklad se nemění, cena klesne |
| B96 krok/směr mimo výčet | ano (obrana do hloubky; hlídá už B96) | totéž |
| B112 přirážka varianty | ano (obrana do hloubky; hlídá už B112) | přirážka snižuje cenu, ne náklad |
| B111 záporná položka | **ne** | sníží náklad i cenu stejným poměrem |
| B112/B114 jednotková cena, sazba, hodiny | **ne** | totéž — marže vyjde stejná |
| B113 nulový ceník | **ne** | náklad 0, cena 0 — hlídá zábrana `cenaNula` |

Bod 4 je tedy jen **obrana do hloubky**; každá cesta dál potřebuje vlastní
kontrolu (B111, B96, B112, B113, B114 ji od 6. 10. 2026 mají).

## Dopad a rizika

- **Uložené zakázky:** neuzamčená zakázka se zaokrouhlením dolů pod marží
  by se obchodníkovi přestala ukládat, dokud zaokrouhlení nezmění. Před
  zavedením projít ostrou databázi (jen čtení, `nastroje/detekce_zneuziti.mjs`
  rozšířit o tento případ) a vypsat dotčené zakázky.
- **UI:** lišta marže dnes podteč ohlásí jen varováním; s bodem 4 by se
  z varování u role bez práva stala zábrana uložení — sjednotit text.
- **Výkon:** jeden výpočet navíc na variantu (server ho pro B59/B71 už
  dělá — `schvalovaniZakladCasti`; zaokrouhlení je levné).
- **Testy:** `netlify/test_prava.mjs` (obchodník: zaokrouhlení dolů pod
  marží → 403; nahoru → 200; administrátor → 200; zamčená → 200), mutace
  serveru (kontrola se nevolá; marže z ceny před zaokrouhlením).

## Otázka pro J. V.

Zavést bod 4 (marže z koncové ceny i bez slevy) jako zábranu uložení?
**Výchozí: ne hned** — B117 je shora omezená mez (méně než krok) a ostatní
cesty třídy mají vlastní kontroly; zavést až s přehledem dotčených zakázek
z ostré databáze, pokud o to J. V. požádá.
