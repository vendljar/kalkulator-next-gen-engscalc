# Prototyp — víc zákazníků na jedné zakázce

Jen podklad k rozhodnutí J. V., **není součást aplikace** (nic z této složky se nesestavuje do `dist/`).
Návrh: `podklady/NAVRH_VICE_ZAKAZNIKU.md`. Zveřejněno jako soukromý artefakt:
https://claude.ai/artifact/8qc59CQ4prtV1a4cNQjY4V

- `prototyp.js`, `prototyp.css` — klouzavá lišta nahoře (situace, role, kroky, „▶ Přehrát“), panel „Co se mění“
  (před → po se štítky, co se zapíše do dealu v Pipedrive, náhled nabídky pro zvoleného zákazníka s kontrolou
  úniku, řádek rejstříku, protokol) a karta „Zákazníci zakázky“ s přepínačem zákazníků vložená do skutečné
  aplikace. Pipedrive je jen napodobený v paměti stránky, data jsou smyšlená, nic se nikam neposílá.
- `sestav.mjs` — vloží panel za sestavenou aplikaci:
  `KNG_NEZVYSOVAT_VERZI=1 python3 build.py && node podklady/vz_prototyp/sestav.mjs dist/kalkulacka.html <výstup.html>`
  (sestaveno nad `aa445a1`, v11.11.1; výstup má tvar pro artefakt — bez obalu dokumentu). Ceny jdou ze
  zkušebního ceníku testů (`src/zkusebni_cenik.js`, kulatá smyšlená čísla) — aplikace sama ceník nenese.
- `snimky.mjs` — ověření v headless Chromiu (25 kontrol, 1600 × 1000 a 400 × 800) a snímky:
  `node podklady/vz_prototyp/snimky.mjs <výstup.html>`.
- `snimky/` — 1–8 desktop (výchozí stav, přidaný zákazník, tatáž varianta odeslaná oběma, náhled nabídky pro
  zákazníka, vlastní varianta, potvrzení prodeje, prodáno se změnou řídícího zákazníka, změna organizace dealu),
  9–11 mobil 400 px.

Situace: (1) stejná varianta pro víc zákazníků, (2) vlastní varianta zákazníka, (3) prodej druhému zákazníkovi.

Jak prototyp sahá do aplikace (v ostré verzi to bude jinak, viz návrh § 1 a § 4): zakázku, kopii varianty, zámek
a prodej dělá vlastními funkcemi aplikace; hlavičku přepisuje údaji zvoleného zákazníka, aby skutečný živý náhled
v kartě „Cenová nabídka (CN)“ ukazoval nabídku tohoto zákazníka; písmeno zákazníka přidává obalem kolem
`variantaCislo` a `cisloSVariantou`. Tlačítka aplikace pro uložení a tisk do souboru v artefaktu nic neudělají.
