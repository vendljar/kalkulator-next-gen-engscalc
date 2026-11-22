# STAV – zkouška HN #646 (overit_sod.mjs nad skutečnými šablonami z testu), 22. 11. 2026

## Hlavička

- **Test:** v22.11.5 (`origin/test` 05a496d), dávka HN = v22.11.2 (#638, #644, #646, #647, #695). Zkouší se jen #646.
- **Kdo:** testovací sezení Claude, účet správce testu jen ke **čtení** šablon (`GET /api/sablony?typ=…`). Na test se nic nezapsalo.
- **Harness:**
  - `podklady/kola/harness_testovani/hn.sh`: worktree 05a496d, sestavení bez zvýšení verze (`KNG_NEZVYSOVAT_VERZI=1 python3 build.py`), stažení šablon, nový a starý harness.
  - `podklady/kola/harness_testovani/hn_sablony.js`: stáhne platné šablony smluv do složky pro `KNG_PODKLADY`.
- **Jak připravit podklady:** `overit_sod.mjs` hledá šablony přes `nastroje/harness_podklady.mjs` (`najdiSablonu`) v `$KNG_PODKLADY`.
  - Hledá jména `Sablona_SOD_REALIZACE[_v<N>].docx`, `Sablona_SOD_PROJEKCE[_v<N>].docx`, `Sablona_PLNA_MOC[_v<N>].docx` a bere nejvyšší N.
  - Chybí-li některá, vyrobí si syntetické (`nastroje/smlouvy_syntet.mjs`). Proto se musí stáhnout všechny tři, jinak běh tiše přejde na syntetické.
- **Šablony z testu (platné verze):**

| typ | verze na serveru | zveřejněný soubor | uloženo jako |
|---|---|---|---|
| `sod` | 5 | `Sablona_SOD_REALIZACE_v6.docx` | `Sablona_SOD_REALIZACE_v6.docx` |
| `sodProj` | 3 | `Sablona_SOD_PROJEKCE_v4.docx` | `Sablona_SOD_PROJEKCE_v4.docx` |
| `plnaMoc` | 2 | `Sablona_PLNA_MOC.docx` (bez čísla) | `Sablona_PLNA_MOC_v2.docx` (číslo = verze serveru; očekávání harnessu na verzi plné moci nezávisí) |

## Výsledky

| bod | výsledek | důkaz |
|---|---|---|
| HN1 `overit_sod.mjs` (05a496d) nad skutečnými šablonami z testu | ✅ OK **51/0** | Kód 0, „VŠECHNY KONTROLY (51) OK“. Harness vypsal `Šablona sod … _v6 (verze 6)`, `sodProj … _v4 (verze 4)`, `plnaMoc … _v2`, tedy skutečné šablony, ne syntetické. |
| HN2 pojistka: harness před HN (`cda289e:overit_sod.mjs`) nad týmiž šablonami | ✅ OK (padá) **46/5** | Kód 1. Padají tytéž kontroly jako v kole 18. 11.: K18-N100 splátky, stavební připravenost v1, věta o prodlení v1, symboly `SODP_*` a `PM_*` bez teček. |

**#646 se tímto uzavírá** i proti skutečným šablonám z testu (dávka HN ji uzavřela nad syntetickými).

## Nálezy a informace

- **HN-I1 (informace, nástroj):** v čistém worktree bez `node_modules` padá `overit_sod.mjs` na `ERR_MODULE_NOT_FOUND: playwright`.
  - Návod v hlavičce harnessu („`NODE_PATH=$(npm root -g) node overit_sod.mjs`“) u ESM `import` nepomůže, protože `NODE_PATH` čte jen `require`.
  - Obejito odkazem `node_modules` do worktree. V repu s `node_modules` (kolo, CI) to nevadí.
- **HN-I2 (informace, data testu):** plná moc je na testu zveřejněná jako `Sablona_PLNA_MOC.docx` bez čísla verze. Šablony SoD číslo nesou.
  - Kdo podklady stahuje ručně, musí soubor pojmenovat sám. Harness bere i jméno bez čísla.

## Úklid

- Na testu se nic neměnilo (jen 4× GET po přihlášení správce).
- Šablony leží jen v dočasné složce sezení, do repa nejdou (firemní dokumenty).
