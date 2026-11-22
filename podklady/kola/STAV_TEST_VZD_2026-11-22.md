# STAV – zkouška VZD (drobnosti víc zákazníků a dokumentů, v22.11.1) na testu, 22. 11. 2026

## Hlavička

- **Test:** v22.11.5 (`origin/test` 05a496d), dávka VZD = v22.11.1 (#673, #674, #665, #683, #635).
- **Souhlas:** trvalý souhlas J. V. se zápisem na test (19. 11. 2026). Zadání od koordinace.
- **Kdo:** testovací sezení Claude v Playwrightu, dva různé účty: **správce** a **obchodník**. Obchodník nemá v profilu vyplněné jméno.
  - Bod (b) proto běží obráceně proti zadání: **X = správce** (autor, odešle CN), **Y = obchodník** (dotisk). Smysl zkoušky zůstává (dotisk pod jiným účtem).
- **Pipedrive:** povolen jen `POST /api/pd/nanecisto` bez `dealId` (suchý běh, režim `pipedrive` = server jen čte mapu polí).
  - Ostatní `/api/pd*` a POST zakázek bez čísla „TEST - …“ harness blokuje. Za celý běh nebyl potřeba žádný blok.
- **Harness:**
  - `podklady/kola/harness_testovani/vzd.js` (celý průběh) a `vzd_spolecne.js` (pomůcky nad `d3_spolecne.js`).
  - `vzd_d_sonda.js`: jen čtení, odkud nabídka PROJ bere řádek DPZ.
  - Nové zakázky mají čistou variantu: platný ceník a ze zdroje jen rozměry, zadání PROJ a techspec. S celými daty 9603 obchodník dostal 403 (`ock.zadani.nepocitat` a směs ceníků).
- **Běhy:**
  - Běh 1 a 2: 9830 se neuložila (403 obchodník) a harness hledal „Vypracoval“ v názvu akce.
  - Běh 3: úplný, 17 OK / 2 FAIL. Rozbor FAIL je níže.
- **Zakázky (nové):**
  - `TEST - 2026 - OPR - CN - 9830`: bod b, CN pod správcem.
  - `TEST - 2026 - OPR - CN - 9831`: body a, c, e. Zákazníci A, B, C (smyšlení, IČO 99831xxx).

## Výsledky

| bod | výsledek | důkaz |
|---|---|---|
| (a) suchý běh PD, víc zákazníků | ✅ OK | KL OCK, sdílená V1. A napsal `objKopie1` a B napsal `objKopie1` (pole obsazené A → `hodnotyZakaznika.z2`) a `objKopie2` (volné → `vzVlastnik z2`). `pdnUiSpust` → `/api/pd/nanecisto` 200, režim `pipedrive`, 35 řádků. Kanárky A (`KANAR-VZDA-1`, kontakt A) jsou v těle požadavku i v náhledu, kanárky B nejsou nikde. Totéž při otevřeném zákazníkovi B. Po výměně řídícího na B nese podklad B (`KANAR-VZDB-1/2`, kontakt B) a ne A. |
| (b) Vypracoval = X | ✅ OK | CN pod X: zámek nese snímek `zamek.zpracovatel` = X (`kdo` = účet X). Word CN: blok „Vypracoval:“ = jméno a e-mail X. Dotisk pod Y: `zpracovatelPlaceholders` i online tisk (`nabidkaData`) dávají X, ne Y. Word dotisku pod Y má v bloku „Vypracoval:“ jméno a e-mail X, e-mail Y tam není. Podpis: `zpracovatelObrazky` pod Y je prázdný, sken kolegy se nevloží (po RJ bude podpis autora vždy). Uložení razítka dotisku pod Y neproběhlo: zakázka je pro obchodníka jen ke čtení („Tuhle nabídku založil … Upravit ji může on, vedoucí nebo administrátor“), dokument přesto vznikl. |
| (c) výměna řídícího na B s CN | ✅ OK | CN zákazníkovi B (V1 zamčená), pak výměna řídícího na B (`vzT1ZakZmen`, potvrzení „Řídícím zákazníkem bude B …“). Uložení 200. Hlavička B: pole název a IČO `disabled` s titulkem „🔒 Zákazníkovi už odešla nabídka …“. `set()` názvu, IČO, DIČ i sídla odmítnut hláškou, kontakt jde změnit (uloženo 200). Obchvat klienta (název + IČO v datech) vrátil server **409** „Neuloženo: zákazníkovi „…B…“ už odešla nabídka — název, sídlo, IČO a DIČ se už nemění (objednatel, ico).“ **Právě jedna** předpona „Neuloženo:“ v odpovědi i v hlášce lišty („Neuloženo online: Neuloženo: …“ — „Neuloženo online:“ je lišta, ne zdvojení). Po znovuotevření je v hlavičce B. FAIL `c1` v logu je časování harnessu: kontrola běžela před async potvrzením. Výměnu dokládá `c6` a `a4`, harness je opravený (`await`). |
| (d) 7650-K29-N50, DPZ v nabídce × KL | ❌ nález **VZD-N1** | Varianta 1: studie celá vyřazená, `nabidkaProjNabizi('studie')` = false (hvězdička DPZ ne). KL PROJ: studie „není součástí nabídky“, `st_studie` NE, termín studie prázdný, DPZ „výstupy ze zaměření + 12 týdnů“. **Nabídka přesto tiskne „hrubopis DPZ – do 10–12 týdnů od schválení studie investorem a objednání“.** Pravidlo „nabízí“ (#683) už nabídka i KL sdílejí. Rozdíl je v textu termínů: sonda ukázala, že zveřejněné **podmínky Firmy na testu** (`NAST.firma.podminky.nabidkaProj.terminy`) mají u řádku hrubopisu DPZ klíč `dpz` místo `dpz+studie` a řádek `dpz-studie` (znění bez studie) chybí. Text se proto tiskne vždy, když se nabízí DPZ. Proto se příčina D8-I1 nedala reprodukovat z dat v repu: kód (výchozí `podminky.js`) je v pořádku. |
| (e) KL sdílené varianty → vlastní varianta | ✅ OK | U C na sdílené V1 ukazuje KL OCK upozornění „Varianta je sdílená zákazníky A, B, C — smluvní pole krycího listu … jsou společná …“ s tlačítkem `vzVlastniVarianta`. Klik založí Variantu 2 a C přejde na ni (otevřená). A a B zůstávají na V1. Po založení upozornění u C zmizí. Uložení 200. |

## Nálezy a informace

- **VZD-N1 (střední, text dokumentu, data testu):** zveřejněné podmínky Firmy na testu nesou starý řádek termínu hrubopisu DPZ.
  - Řádek má klíč `dpz`, ne `dpz+studie`, a chybí řádek `dpz-studie` z D1 (20. 10. 2026).
  - Následek: nabídka PROJ bez studie slibuje DPZ „od schválení studie“, kdežto krycí list počítá od výstupů ze zaměření.
  - Cenu to nemění. Týká se každé nabídky PROJ, která nabízí DPZ bez studie, dokud podmínky Firmy nese tento stav.
  - Doporučení:
    - (1) J. V. ověří stejný stav podmínek Firmy na ostrém webu (sezení ostrý web nečte).
    - (2) Oprava dat: obnovit řádky termínů DPZ z výchozích podmínek a zveřejnit.
    - (3) Zvážit kód: podmínky Firmy uložené před D1 doplnit o podmíněné klíče nebo na ně upozornit (statická kontrola nebo upozornění ve správě Firmy).
  - Rozhoduje J. V. (text nabídky). Navazuje na D8-I1 / #683.
- **VZD-I1 (informace):** obchodník nemá v profilu jméno. Kdyby odeslal CN on, blok „Vypracoval“ by nesl jen e-mail nebo nic (neověřováno).
  - Zkouška b proto běžela s X = správce. Doporučeno doplnit jméno testovacímu obchodníkovi (test, J. V. nebo jmenovaný kolega).
- **VZD-I2 (informace):** dotisk odeslané CN obchodníkem, který zakázku nezaložil: Word vznikne, ale razítko tisku se neuloží (zakázka jen ke čtení). Je to chování práv, ne vada VZD.

## Úklid

- Na testu zůstávají nové zakázky:
  - `TEST - 2026 - OPR - CN - 9830`: CN pod správcem. Pak ji BZ prodal a jednou do ní doplnil a vrátil číslo PROJ, viz STAV BZ.
  - `TEST - 2026 - OPR - CN - 9831`: A/B/C. C má vlastní Variantu 2, V1 je zamčená CN zákazníka B a řídící je B. Ruční pole KL nesou kanárky `KANAR-VZD*`, kontakt B je změněn.
- TEST 7650-K29-N50: jen čtena, neukládala se.
- Vypínač víc zákazníků: ZAP na začátku i na konci.
- Firma, ceník, šablony ani karty zákazníků se neměnily.
- Zápisy (běh 3; běh 2 navíc 2× `POST /api/zakazky` 200 u 9830, běh 1 jen 403):
  - `POST /api/zakazky`: 7× 200 a 1× 409 (záměrný obchvat);
  - `POST /api/pd/nanecisto`: 3× 200 (suchý běh);
  - `POST /api/analytika`: 200.
