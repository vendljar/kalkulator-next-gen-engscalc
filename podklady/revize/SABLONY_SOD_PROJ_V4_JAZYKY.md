# Šablona SoD projekce v4 — jazykové verze proti české (#795, poradce, 25. 11. 2026)

## Závěr: OK — jazykové verze jsou úplné, nic nechybí

Rozdíl velikosti (česká ~124 kB, EN/DE/FR ~16 kB) je **jen způsob uložení**: český soubor je uložený bez komprese
(všech 12 částí metodou „stored“), jazykové verze komprimovaně. Rozbalený obsah je stejně velký
(`word/document.xml` 87 kB česky, 88–90 kB v jazycích). Žádný obrázek ani část navíc v české verzi není.

## Co jsem porovnal

Soubory z Disku (jen čtení), složka šablon: `Sablona_SOD_PROJEKCE_v4.docx` (upraveno 22. 11. 2026) a `_EN`, `_DE`,
`_FR` (21. 10. 2026). Porovnání strojem nad rozbaleným obsahem; znění překladu jsem nehodnotil.

| | CZ | EN | DE | FR |
|---|---|---|---|---|
| částí v souboru | 12 | 12 | 12 | 12 |
| odstavců (včetně prázdných) | 241 | 241 | 241 | 241 |
| odstavců s textem | 134 | 134 | 134 | 134 |
| tabulek | 0 | 0 | 0 | 0 |
| symbolů `{{…}}` (výskytů / různých) | 76 / 56 | 76 / 56 | 76 / 56 | 76 / 56 |
| žlutě podbarvených míst | 38 | 38 | 38 | 38 |
| číslovaných odstavců | 52 | 52 | 52 | 52 |
| zápatí s číslem stránky | ano | ano | ano | ano |

- **Symboly:** v každém jazyce stejná sada, stejný počet výskytů a **stejné symboly ve stejném odstavci** jako
  v české verzi (241 odstavců porovnáno po jednom, nula rozdílů). To zahrnuje i značky činností
  `CIN_…_ZAC` / `CIN_…_KON` (sedm činností, každá dvakrát — předmět díla a termíny), podle kterých aplikace
  vypouští nenabízené činnosti.
- **Vše, co aplikace dosazuje, v šablonách je:** všech 56 symbolů aplikace zná (strany smlouvy, číslo smlouvy,
  nabídka a datum, cena, platební kalendář, pokuty, správní poplatky, kontakty, podpisy, rozsah díla v příloze).
  Žádný symbol, který by aplikace neuměla vyplnit, a žádný, který by v jazykové verzi chyběl.
- **Překlad:** žádný odstavec jazykové verze není shodný s českým (kromě řádku teček pro podpisy). České znaky jsou
  jen ve zkratkách „IČO“ a „DIČ“ v závorce za cizojazyčným označením — záměr.

## Co jsem neověřoval

- Věcnou správnost a právní znění překladu.
- Jestli jsou soubory na Disku totožné s tím, co je zveřejněné v aplikaci na testu a na ostrém.
- Česká verze je o měsíc novější (22. 11.) než jazykové. Stavbou a symboly si odpovídají, takže úprava z 22. 11.
  nepřidala ani neubrala odstavec ani symbol; drobnou změnu českého znění uvnitř odstavce by toto porovnání
  nepoznalo. Pokud se 22. 11. měnil text některého článku, je potřeba ho promítnout do překladů ručně.

## Doporučení

Nic neopravovat. Chcete-li mít soubory stejně velké, stačí českou verzi otevřít a znovu uložit ve Wordu (uloží se
komprimovaně); na funkci to nemá vliv.
