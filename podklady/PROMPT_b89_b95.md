# Dávka S2 — #347: informativní nálezy B89–B95 (verze v15.10.2)

Nejdřív přečti `podklady/_SPOLECNE_15_10.md` (stejná větev) — platí celé. Větev `claude/b89-b95`.

Roadmapa #347: „Informativní nálezy B89–B95 (analytika, localStorage, import slovníku, souběh převodu, obnova hesel, scrypt, razítka)" — hotovo, až je **každý nález rozhodnut: oprava, nebo vědomá mez v `BEZPECNOST_MEZE.md`**. Popisy: zpráva `2026-09-24_kalkulator_REPORT_hloubkovy_test_a_BEZPECNOSTNI_AUDIT_v24.9.2.md` na Google Drive (id 1lTNHbQTm9fwQ5VvKLo-YMpPHKrdFwcuB), stav v `2026-10-12_kalkulator_BEZPECNOSTNI_AUDIT_v12.10.2.md` (id 1d5W08MWoOWdVOj9pdm20z5bOd92f5rXX); čti konektorem Google Drive.

1. Ke každému z B89–B95: ověř v kódu, zda platí (cesta zneužití, dopad). Už opravené doložit (test nebo commit) a uzavřít.
2. Výchozí rozhodnutí: **opravit**, co jde opravit malým zásahem s testem (B91 `__proto__` v importu slovníku vždy — viz i #340); **vědomá mez** u toho, co by stálo víc, než chrání (s odůvodněním a cestou zneužití do `BEZPECNOST_MEZE.md`). Každá oprava: test s pojistkou, mutace, sada do `SADY`.
3. Roadmapa #347 → `hotovo` (`hotovoV` v15.10.2) s rozpisem po nálezech. `python3 roadmapa.py --kontrola`.
4. Verze **v15.10.2**, CHANGELOG, PREDAVKA, smoke, push.
