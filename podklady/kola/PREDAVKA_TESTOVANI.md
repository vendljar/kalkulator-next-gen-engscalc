# Předávka testovacího sezení (19. 11. 2026, 15:05)

Sezení session_018mwHQHo9Cn3M89xMN6Bghq, větev `claude/testovani`. Kontext 73 %, doporučeno nové sezení.

## Pravidla a souhlasy

- **Trvalý souhlas J. V. (19. 11.):** zápis na test (testengscalc) v plném rozsahu u zkoušek od koordinace, až do odvolání.
  Main jen čtení, Pipedrive jen simulátor nebo deal TEST (`podklady/ROZHODNUTI_LOG.md`).
  Pozor: CLAUDE.md chce souhlas „přímo v tom sezení“. Nové sezení si ho proto nechá od J. V. jednou potvrdit.
- Přihlášení přes proměnné `KNG_TEST_*`, `KNG_TEST_OBCHODNIK_*`, `KNG_MAIN_*`. Hodnoty nikdy nevypisovat.
- Playwright: `ln -sfn /opt/node-tools/node_modules/playwright node_modules/playwright` (necommitovat).

## Hotovo (STAV v `podklady/kola/`)

KOLO49, TEST_VZF1, TEST_T1, KOLO50 (+ dodatek K50-N1 opraven ve v19.11.3), TEST_VZF2, ŠABLONY-STRÁNKY (CN OCK má v záhlaví
pevnou „1“ místo pole PAGE, oprava v šabloně), `nahled_vs_word_2026-11-19/`.
TEST sada: 320 zakázek „TEST -“ (nové 9811 F1, 9812 T1, 9813 F2, 9814 F2 PROJ, 9949 K49).

## Zkouška DO (#675) — hotovo 19. 11. (sezení session_018mwHQHDKy7bWRVzn9hc6nq)

`STAV_TEST_DO_2026-11-19.md`: 59 OK, nález DO-N1 (návrh obchodníka u příplatku „… (MATERIÁL)“ správce v číselníku nevidí).
Nové TEST 9815 (správce), 9816 (obchodník). Souhlas J. V. potvrzen v sezení. Harness `do.js` (opakovatelný, sám uklidí).

## Zkouška D8 (#677) — hotovo 19. 11.

`STAV_TEST_D8_2026-11-19.md`: vše ✅, informace D8-I1 (text DPZ „od schválení studie“ u vyřazené studie, i na main).
TEST OVP 9817–9820, lhůty PROJ ve Firmě vráceny na výchozí a zveřejněny. Harness `d8.js` (s pojistkou návratu lhůt), `d8_text.js`.
Čeká: ON a NP (pošle koordinace).

## Harnessy (`podklady/kola/harness_testovani/`, spouštět z kořene repa)

- `vzf1.js`, `vzf2.js`, `t1.js`: zkoušky VZ v živé stránce (přihlášení, `T(typ)` = tisk cestou tlačítek bez zámku, kanárky,
  blokace `/api/pd*`). **Pozor:** po neuložené změně `onlineOtevri` zamrzne na dialogu. Proto `onlineAutoPrepni(false)` a obnovit
  stránku. Tiché uložení po tisku se nestihne, pokud se stránka zavře do 10 s; po tisku volat `onlineUloz()`.
- `export.js`: export TEST sady a main bez zakázek (kolo). `sab_kolo.js`: šablony pod jmény balíčku. `run_kolo50.sh`: kolo s regresí Tp.
- `do.js`: zkouška DO. Na dialog `volba` (neuložené změny) odpovídá „zahodit“, jinak `onlineOtevri` tiše nic neotevře.
- `xver.js`: zámek napříč verzemi. Globální ceník vkládat jako v `h.mjs`, protože konstanty nejsou na `window`.
- `nvw.js`: náhled × Word se začerněním. `pole.py`: pole PAGE v docx. `kanarky.py`: hledání kanárků. `jazyk.py`: čeština v šablonách.
- Balíček kola (harness h/hw/hvs/hvz, plány) je mimo repo: `KNG_KOLO_BALICEK_K49.zip` od J. V.
