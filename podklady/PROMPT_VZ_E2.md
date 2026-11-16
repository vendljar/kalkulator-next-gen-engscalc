# Prompt VZ-E2 — čísla s písmenem, tisk z pohledu zákazníka, test úniku

Společná pravidla: `PROMPT_VZ_SPOLECNE.md`. Návrh § 3, § 4, § 9 (R1, R2). Větev `claude/vz-e2` nad SHA od
koordinace (po E1). Odhad: 1–2 sezení. **RIZIKOVÁ — po dokončení revize poradce** (únik údajů mezi zákazníky).

## Cíl

Každý dokument se tiskne pro jednoho zákazníka, nese jeho číslo s písmenem a neobsahuje nic od jiného zákazníka.

## Krok 0

`src/zakazka.js` (`cisloSVariantou`, `sodCisloNavrh`), `src/zamek.js` (`variantaCislo`, `zamekCisloZakladSedi`),
`src/nazvy_souboru.js`, `src/nabidka.js` (`nabidkaData`), `src/ui/zakazka_ui.js` (`nabidkaNahled`, `nabidkaVarianta`),
`src/dokumenty.js`, `src/kontroly.js` (pravidla a zábrany, vzor `vsSablona`), `src/kryci.js`, `src/sod.js`,
`netlify/lib/pd_webhook.mjs` (`pdWebhookCisloKlic`).

## Co udělat

1. **Číslo:** `…9940`, `…9940-B`, `…9940.2-B`. Písmeno bere `variantaCislo` / `cisloSVariantou` z pohledu
   (`zak.vzPohledZakaznika`); bez pohledu a s jedním zákazníkem beze změny. `zamekCisloZakladSedi` přijme i příponu
   `-P`; `sodCisloNavrh` písmeno zachová; `nazvy_souboru.js` píše číslo s písmenem. Ověř testem, že webhook podle
   čísla s písmenem i bez něj najde tutéž zakázku (`pdWebhookCisloKlic`) a že kontrola duplicit čísla
   (`zakazkaDuplicita`, server) písmeno ignoruje.
2. **Jediný vstup dokumentů = `vzPohled`.** Náhled, Word CN, CN PROJ, krycí listy, SoD, plná moc, technická
   specifikace, porovnání a podklady dostanou pohled otevřeného zákazníka. Generátory se nemění — dál čtou
   `zak.objednatel`. U zakázky s jedním zákazníkem je pohled = zakázka (týž objekt, žádná kopie → zlatá sada).
3. **Zábrany tisku** (nová pravidla v `kontroly.js`): varianta, na kterou zákazník neukazuje, se pro něj netiskne;
   sdílený tištěný text (popis záměru, popis úvodní fotky, název akce, adresa) ani název varianty nesmí obsahovat
   název nebo IČO jiného zákazníka zakázky. Porovnání variant a podklady jen z variant tohoto zákazníka.
4. **PROJ:** u zakázky s dalšími zákazníky se dokumenty PROJ tisknou jen pro řídícího (zábrana s vysvětlením, R5).
5. **Obrazovka:** pruh v kartě „Cenová nabídka (CN)“ „Náhled a tisk platí pro zákazníka X — nabídka …-B“ (jen 2+);
   v kartě Zákazníci zakázky číslo s písmenem a tlačítko Tisk CN (otevře zákazníka a spustí dnešní tisk).
6. **Statická kontrola** do statických kontrol kola: v `nabidka*.js`, `sod.js`, `kryci*.js`, `docxgen.js`,
   `dokumenty.js`, `nazvy_souboru.js` se nevyskytuje `dalsiZakaznici`.

## Test úniku (jádro etapy)

`src/test_vz_unik.js`: tři zákazníci, každý s jedinečným kanárkem v každém poli (název, sídlo, IČO, DIČ, kontakt,
všichni zástupci, název a poznámka vlastní varianty, cena vlastní varianty jako neobvyklé číslo). Pro každý typ
dokumentu × každého zákazníka × CZ/EN/DE/FR projdi celý výstup (XML Wordu po rozbalení, HTML náhledu, symboly,
název souboru, JSON podkladů) a ověř, že v něm není žádný kanárek jiného zákazníka. Pojistka: s vypnutým pohledem
(tisk z celé zakázky) test selže. V prohlížeči `overit_vz_tisk.mjs` totéž pro živý náhled a přepnutí zákazníka.
Dále `src/test_vz_cisla.js`, rozšíření `test_vz_zlata.js` o (d) pohled prvního zákazníka = dokumenty téže zakázky
s jedním zákazníkem. Mutace „[VZ E2]“ musí zabít i vynechání pohledu u kteréhokoli dokumentu.

## Co nedělat

Razítka zámku a stav „odeslána“ po zákaznících (E3), prodej (E4), Pipedrive.
