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
  (v1 nad `aa445a1`, v2 nad `8462aea`; výstup má tvar pro artefakt — bez obalu dokumentu). Ceny jdou ze
  zkušebního ceníku testů (`src/zkusebni_cenik.js`, kulatá smyšlená čísla) — aplikace sama ceník nenese.
- `snimky.mjs` — ověření v headless Chromiu (v2: 28 kontrol, 1600 × 1000 a 400 × 800) a snímky:
  `node podklady/vz_prototyp/snimky.mjs <výstup.html>`.
- `snimky/v2_*` — v2: 1–10 desktop (standardní kalkulace jen s tlačítkem, formulář, co se objeví s druhým
  zákazníkem, vlastní varianta, potvrzení odstranění, návrat do standardního pohledu, odstranění zákazníka
  s odeslanou nabídkou a doklad po něm, tatáž varianta oběma, prodej druhému zákazníkovi), 11–13 mobil 400 px.
  Snímky bez předpony `v2_` jsou z v1 (12. 11. 2026, karta viditelná i s jedním zákazníkem — překonáno).

**Verze 2 (připomínky J. V. 16. 11. 2026), sestaveno nad integrací `8462aea` (v12.11.7):** s jedním zákazníkem je
aplikace jako dnes, navíc jen tlačítko „+ Přidat zákazníka“ u pole Zákazník; přepínač a karta se objeví až s druhým
zákazníkem; každý další zákazník má „Odstranit“ s potvrzením; po odstranění posledního se aplikace vrátí do
standardního pohledu (ověřeno: hlavička znak po znaku jako na začátku).

**Verze 3 (rozhodnutí J. V. 16. 11. 2026):** ostatní zákazníci jsou v jedné přepisované poznámce u dealu (ne
v poli); při Prodáno jinému zákazníkovi se organizace dealu přepíše na vítěze sama (v situaci „prodej“ jde
přepínačem „Pipedrive“ zkusit výpadek a „Zkusit zápis znovu“); zákazníka, kterému odešla nabídka, odstraní jen
administrátor. Ověření 33 kontrol; snímky `snimky/v3_*` (dotčené kroky), ostatní `v2_*` platí dál.

Situace: (1) přidat a odstranit zákazníka, (2) odstranit zákazníka s odeslanou nabídkou, (3) stejná varianta pro
víc zákazníků, (4) prodej druhému zákazníkovi.

Jak prototyp sahá do aplikace (v ostré verzi to bude jinak, viz návrh § 1 a § 4): zakázku, kopii varianty, zámek
a prodej dělá vlastními funkcemi aplikace; hlavičku přepisuje údaji zvoleného zákazníka, aby skutečný živý náhled
v kartě „Cenová nabídka (CN)“ ukazoval nabídku tohoto zákazníka; písmeno zákazníka přidává obalem kolem
`variantaCislo` a `cisloSVariantou`. Tlačítka aplikace pro uložení a tisk do souboru v artefaktu nic neudělají.
