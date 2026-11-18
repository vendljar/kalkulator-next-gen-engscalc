# Šablona Smlouvy o dílo – realizace v6 — CZ + EN + DE + FR (18. 11. 2026)

Dávka SL (rozhodnutí J. V. 16. 11. 2026: žluté podbarvení nevyplněných míst i v SoD realizace), větev
`claude/sl-sod-sleva` nad integrací `8462aea` (test v12.11.7). Verze kódu v18.11.3 (číslo potvrdí koordinace).

> **v6 = v5 + žluté podbarvení symbolů.** Na **test** až s kódem této dávky (generátor, který podbarvení
> u vyplněných údajů sejme — se starším kódem by ve smlouvě svítily žlutě i vyplněné údaje). Na **main** až s kódem
> víc šachet, jako v5. Nahrávat **všechny čtyři jazyky najednou** průvodcem.

## 1. Soubory

Vznikly nástrojem z v4 na Disku (Kalkulator NextGen / Sablony, staženo bajtově, testzip OK) přes v5 (v5 z nástroje
= v5 z podkladu 11. 11. bajt po bajtu, sha256 shodné). Výstup sezení (scratchpad) — J. V. je dostal v sezení
(SendUserFile). **Do repa ani na Disk se nedávají.**

| Soubor | Jazyk | Symbolů | Bajtů | sha256 | Vznikl z v5 (sha256) |
|---|---|---|---|---|---|
| `Sablona_SOD_REALIZACE_v6.docx` | CZ | 61 | 407 682 | f7fc164a…98a8 | 752674d4…f59f6 |
| `Sablona_SOD_REALIZACE_v6_EN.docx` | EN | 61 | 351 861 | 57c6c788…055d | f9b5f2f7…17ee58 |
| `Sablona_SOD_REALIZACE_v6_DE.docx` | DE | 61 | 354 547 | b6084799…8978 | d9603b62…c0e37c |
| `Sablona_SOD_REALIZACE_v6_FR.docx` | FR | 61 | 354 967 | c8d2c11f…fa77 | 633c9b27…0df86b |

## 2. Co se mění

- Každý výskyt symbolu `{{…}}` má **žluté podbarvení** (`<w:highlight w:val="yellow"/>` ve vlastnostech běhu,
  na místě podle schématu OOXML) — stejně jako SoD projekce v4 a plná moc. 64 výskytů 61 symbolů.
- Běh, ve kterém je symbol spolu s pevným textem (např. „IČ: {{OBJEDNATEL_ICO}}“) nebo s dalším symbolem, se
  **rozdělí** — žlutý je jen symbol, okolní text ne (CZ 47 běhů, EN/DE/FR 21). Písmo každého úseku zůstává.
- Text, symboly ani nic jiného se nemění.

**Ve vytištěné smlouvě (aplikace od v18.11, po revizi poradce L1/L2):** v dokumentech s tečkami (SoD realizace,
SoD projekce, plná moc) je žluté **právě nevyplněné místo „……“** — generátor (`docxPodbarveniTecek`) po dosazení
hodnot dá každé tečce vlastní žlutý běh a ze všeho ostatního podbarvení sejme (vyplněné údaje, rozpisy, pevný text;
i u plně vyplněné smlouvy). Platí to i pro šablony SoD projekce v4 a plnou moc, které podbarvují celé běhy, část
symbolů a pevný text („Objednatel:“, „zmocnitel“) — ověřeno nad skutečnými soubory z Disku. Nabídky beze změny.
Podbarvení v šabloně v6 tak slouží hlavně administrátorovi a obchodníkovi při čtení šablony; šablony v6 se kvůli
revizi nepřegenerovávaly.

**Jedna šachta:** odstavce šachet zmizí jako ve v5; smlouva z v6 = smlouva z v5 znak po znaku kromě podbarvení
teček (test D nad skutečnými šablonami CZ/EN/DE/FR).

## 3. Výroba

```
node nastroje/vyrob_sablony.js --sod-real-v6 <složka s v5 (nebo v4) CZ/EN/DE/FR> [výstupní složka]
```

Tvrdé kontroly nástroje (kód 1 při nálezu): symboly = v5 (+0 −0, jazyky = CZ), text odstavců = v5, document.xml
**mimo podbarvení = v5** (značky mimo běhy, text a písmo každého úseku; rozdělení běhu ani podbarvení to nezmění,
jiná změna ano — test), každý symbol v podbarveném běhu, `docxXmlVady` čisté, odhad jazyka sedí.

## 4. Ověření

| Soubor | testzip | `sablonaObsahVadyZipu` | XML | jazyk | symboly proti v5 | mimo podbarvení = v5 | symboly bez podbarvení |
|---|---|---|---|---|---|---|---|
| v6 CZ | OK | prázdné | bez vad | cz 100 % | +0 −0 | ano | žádné |
| v6 EN | OK | prázdné | bez vad | en 99 % | +0 −0 | ano | žádné |
| v6 DE | OK | prázdné | bez vad | de 96 % | +0 −0 | ano | žádné |
| v6 FR | OK | prázdné | bez vad | fr 100 % | +0 −0 | ano | žádné |

`KNG_PODKLADY=<v4+v5+v6> node src/test_sod_v5.js` → 72/0 (oddíl D: jedna šachta v6 = v5 bez podbarvení; víc šachet
z v6 žluté jen tečky, žádný `{{`).

## 5. Nahrání (administrátor)

Šablony dokumentů → *Šablona smlouvy o dílo — REALIZACE (OCK)* → česká **Sablona_SOD_REALIZACE_v6.docx**
(kontrola: přibylo 0, ubylo 0, čeština, bez vad), pak **_EN, _DE, _FR najednou** (ne *Vyrobit z češtiny*) a
**Zveřejnit**. Zkouška na testu: smlouva zakázky bez IČO zákazníka má žluté „……“ u IČO a vyplněný název
zákazníka bez podbarvení.
