# STAV kola 66 — datové úkoly na testu: #805 překlep v šabloně PROJ, #726 bod 1 termíny DPZ (26. 11. 2026)

- **Sezení:** TESTOVÁNÍ 4 (`kalkulator-testovani`, session_018mwHQHn8gkmk4ksTXk6caP), Playwright na testengscalc, účet testera (administrátor).
- **Verze:** test v25.11.6. Ostrý web ani Disk Google jsem nezapisoval.
- **Souhlas se zápisy na test:** J. V. přímo v tomto sezení (25. 11.): „se zápisy na testu souhlasím vždy a v jakémkoliv rozsahu“. Zadání #805 („805 překlep oprav ty“, J. V. 26. 11.) přes koordinaci.

## 1) #805 překlep „PROVDITELNOSTI“ v šabloně nabídky PROJ — HOTOVO na testu

| krok | výsledek |
|---|---|
| stažení zveřejněných šablon z testu | `Sablona_NABIDKA_PROJ_v9.docx` (čeština v7, otisk 2abd9a08d81b216e) + EN/DE/FR v6 |
| hledání překlepu (všechny XML části, 4 jazyky) | jen **čeština**, `word/document.xml`, 1 výskyt v jednom textovém běhu: „díky obsahu a zpracování je možné naší STUDII **PROVDITELNOSTI** projednat v této fázi na odboru památkové péče HMP“ (odstavec Studie proveditelnosti – část 2, Projednání). EN/DE/FR překlep nemají. |
| oprava | „STUDII PROVDITELNOSTI“ → „STUDII PROVEDITELNOSTI“ (+1 znak). ZIP přestavěn se stejným pořadím a kompresí položek; **liší se jen `word/document.xml`**, ostatní části bajt po bajtu stejné. |
| kontrola šablon | `sablonaObsahVady` 0 vad; průvodce Nastavení → Smlouvy / Šablony: jazyk česky 100 %, 117 symbolů, „Symboly stejné jako v platné verzi“. |
| zveřejnění na testu | **čeština v8**, otisk **25adbd5f985a734f**, poznámka „#805 oprava překlepu …“. |
| jazykové verze | Po nové češtině je administrace označila jako „zastaralé“ (tisk to neblokuje). Stejné soubory jsem průvodcem „čeština shodná → jen jazykové verze“ přiřadil k v8: **EN/DE/FR v7**, otisky beze změny (ea80bb40… / 5afad752… / 9447ea0e…), stav „aktuální“. Obsah jazykových verzí nezměněn. |
| ověření | Kontrola šablon nad zveřejněnými v8 / v7: 0 vad. Dotisk nabídky PROJ (9967) z testu: šablona v8, text „STUDII PROVEDITELNOSTI“ všude, překlep pryč. |

**Soubor pro J. V. na main — do větve NEULOŽEN.** Šablona obsahuje skutečný firemní kontakt (e-mail v těle) a ve vlastnostech jména zaměstnanců;
`nastroje/kontrola_udaju.py` ji odmítne a CLAUDE.md skutečné kontakty do repa nepouští. Postup pro main:
Test → Nastavení → Smlouvy / Šablony → Šablona cenové nabídky PROJ → **Stáhnout .docx** (platná v8) → na main „Nahrát novou českou verzi…“ a k ní
přiřadit stávající EN/DE/FR (průvodce „Zveřejnit jazykové verze k platné češtině“). Kontrolní údaje souboru: velikost 1 049 917 B,
SHA-256 `3d0ade2fcb00b272a92ad3ec2cd6acf42a90de0acb8cb78bd68ef19b0ea5a7a5`, otisk aplikace `25adbd5f985a734f`
(původní v7: SHA-256 `8eb0157e52558e811bff7bdc77430add7fa70d127d4e980ca79da90870fc1165`, otisk `2abd9a08d81b216e`). Předpoklad: main má stejnou češtinu v9 jako test v7 (test ji 23. 11. převzal „Z main“).

## 2) #726 bod 1 — termíny DPZ ve Firmě testu — BEZ ZÁSAHU (už v pořádku)

- Firma na testu (`/api/firma`, zapsáno 23. 11. 2026 13:36, převzetí z main) má `podminky.nabidkaProj` **bez vlastního pole TERMÍNY** → platí výchozí znění
  s oběma řádky „dpz+studie“ a „dpz-studie“. Zastaralý řádek „dpz“ (hrubopis) tam už není.
- `podminkyTerminyDpzVarovani` nad Firmou ze serveru i nad `firmaAktualni()` vrací prázdný text → upozornění v aplikaci nesvítí.
- Ověření tiskem (online náhled nabídky PROJ, neuložená zakázka): **bez studie** „Zpracování dokumentace pro dotčené orgány (hrubopis DPZ) — do 12 týdnů od předání podkladů“;
  **se studií** „— do 10–12 týdnů od schválení studie investorem a objednání“. Správně.
- Nic jsem nezapisoval (není co opravit). Bod 3 (#726, main) zůstává na J. V.

## Informace

- **K66-I1:** Slovník překladů má klíč s týmž překlepem: `src/preklad.js:1242` „… naší STUDII PROVDITELNOSTI projednat …“. Po opravě šablony se český text s klíčem
  neshoduje. Jazykové šablony jsou samostatně přeložené (tisk EN/DE/FR to neovlivní). Slovník ale může tu frázi hlásit jako nepřeloženou („Nepřeložené fráze (CSV)“).
  Doporučení: v další dávce opravit klíč ve slovníku (kód, mimo testovací sezení).
- Na testu přibyly verze šablony (čeština v8, EN/DE/FR v7). Návrat: Nastavení → Smlouvy / Šablony → Historie → „Vrátit“ v7 / v6.
