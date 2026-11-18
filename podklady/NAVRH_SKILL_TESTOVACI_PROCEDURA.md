# Návrh osnovy skillu `testovaci-procedura-kng` (S7)

Zkopírováno beze změny z návrhu `podklady/NAVRH_REZIE_2026-11-18.md`, oddíl „Navržené změny textu
CLAUDE.md a skillu“ → „Skill `testovaci-procedura-kng` (návrh osnovy přepisu)“. Skill není v repu;
J. V. ho nahraje sám. Rozhodnutí 18. 11. 2026 k stupňům kol: automat po dávce + cílená sada, plné kolo
jen před main a po nasazení; kolo main-před × main-po u rychlé cesty dělá koordinace nástrojem.

```
1. Prostředí: git (větev a commit z promptu), `nastroje/testovaci_kolo.sh`,
   symlink `node_modules/playwright`. Žádné zipy z Disku.
2. Stupně kol (1 automat, 2 cílené, 3 plné) a kdy který.
3. Kolo main-před × main-po: dvě sestavení, stejná sada, stejný ceník;
   očekávané rozdíly se vypíší předem.
4. Sady: standardní, regresní, cílené, fuzz, tok Word a zámek, víc šachet.
5. Výstup: `podklady/kola/STAV_KOLOnn.md` (pevná osnova: verze, rozsah,
   výsledky, nálezy s ID z evidence, úkoly) a protokol xlsx bez cen z ceníku.
6. Nález = položka evidence (typ nález, kolo, vážnost, dopad na cenu ano/ne).
7. Bezpečnostní audit: beze změny, jen čtení.
```
