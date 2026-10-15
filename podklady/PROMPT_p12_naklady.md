# Dávka S3 — #369 P12: obchodník nevidí náklady (verze v15.10.3)

Nejdřív přečti `podklady/_SPOLECNE_15_10.md` (stejná větev) — platí celé. Větev `claude/p12-naklady`.

Roadmapa #369: „Až přijde čas: sloupec sazby v Kalkulaci PROJ jen s právem na náklady (klíč matice zobrazení), opravit kontroly.cisla, stažení JSON zakázky bez ceníků; případně GET /api/program bez historie verzí (varianty v `podklady/K16_ROZBOR_2026-09-25.md`, P12)." Hotovo, až obchodník v zobrazení nevidí nákladové sazby ani náklady.

1. Projdi rozbor P12 v `podklady/K16_ROZBOR_2026-09-25.md` a dnešní matici zobrazení (`src/zobrazeni.js`, `netlify/functions/zobrazeni.mjs`, právo na náklady). Sepiš, kde obchodník dnes náklady vidí (obrazovka, kontroly, stažený JSON, `/api/program`).
2. Výchozí rozsah (bez dalšího schvalování): (a) sloupec sazby / nákladů v Kalkulaci PROJ jen s právem na náklady; (b) `kontroly.cisla` bez nákladových čísel pro roli bez práva; (c) stažení JSON zakázky obchodníkem bez ceníků variant (import zpět musí dál fungovat — ceník se doplní z platného); (d) `GET /api/program` pro roli bez práva bez historie verzí ceníku. Nic z toho nesmí změnit cenu ani dokumenty — test otisku nabídky před/po. Co by změnilo chování pro administrátora nebo vedoucího, neměň.
3. Testy: jednotkové + harness v prohlížeči (obchodník vs. administrátor), server (`netlify/test_*.mjs`), pojistka, mutace, sady do `SADY`.
4. Příručka (`manual/obsah.json`), pokud se mění, co obchodník vidí. Roadmapa #369 → `hotovo` (`hotovoV` v15.10.3); `roadmapa.py --kontrola`.
5. Verze **v15.10.3**, CHANGELOG, PREDAVKA, smoke, push.
