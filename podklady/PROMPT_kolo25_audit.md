# Dávka S4 — testovací kolo 25 + bezpečnostní audit nad `test` (po S1–S3)

Komunikace česky, nikdy AskUserQuestion. Postupuj podle skillu `testovaci-procedura-kng` (komplexní testovací procedura + bezpečnostní audit kódu). Spouští koordinační sezení, až budou S1–S3 sloučené v `test`.

Rozsah: všechny změny od posledního auditu (`2026-10-12_kalkulator_BEZPECNOSTNI_AUDIT_v12.10.2.md` na Disku) — `git log v12.10.2..origin/test` / oddíly CHANGELOG v13.10.x–v15.10.x: lišta zakázky #404, zámek strany P6, cenové výjimky, autorský dozor, krycí list odeslané nabídky (klient + server `zamekDataPorovnani`), „jiné znění", slovník a překlady PROJ, hodiny v krycím listu, K23T-N1, B80, B89–B95, P12.

1. Větev `claude/kolo25-audit` nad `origin/test`. Do `test-draft` / `test` / `main` nic.
2. Audit: každý nový nebo změněný zápisový bod serveru a každá kontrola v prohlížeči — cesta zneužití, závažnost, doložení pokusem (paměťové úložiště, smyšlené údaje). Zvlášť: obejití zámku odeslané nabídky přes krycí list (volná pole vs. pole nabídky, SoD, `tisky[]`, obnova ze zálohy), práva rolí k nákladům po P12.
3. Výstup: `podklady/AUDIT_2026-10-15_v<verze>.md` (nálezy s id B… navazujícími na poslední číslo, závažnost, pokus, návrh opravy) a stejný soubor jako `2026-10-15_kalkulator_BEZPECNOSTNI_AUDIT_v<verze>.md` na Google Drive do složky Testovani (konektor; když zápis nejde, napiš to).
4. Nálezy **nízké a střední s jednoznačnou malou opravou** rovnou oprav (test s pojistkou, mutace, verze podle dne commitu, další volné číslo po S3). Vysoké a sporné jen popiš s návrhem — rozhodne J. V.
5. Zpráva: počet nálezů po závažnosti, co opraveno, co čeká na rozhodnutí.
