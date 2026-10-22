# D4 — slovníky překladu SoD podle revidovaného znění (22. 10. 2026, v22.10.1)

Dávka D4, větev `claude/d4-sod-slovniky` nad `test` = v21.10.6 (4c127f5). Rozhodnutí J. V. 21. 10. 2026
(uzavření V3 #380 + #157): revidované EN/DE/FR verze SoD ve složce šablon na Disku jsou **závazné znění**.
Slovníky `nastroje/preklad_sod.js` je teď reprodukují. Šablony ani slovníky v repozitáři nejsou
(firemní texty); do repa jde jen kód nástroje a test na smyšleném vzorku. Šablona v4 se kvůli K6-W3
znovu nevyráběla na Disk ani do aplikace (čeká na pokyn J. V.).

## Zdroje (Disk, Kalkulator NextGen / Sablony)

| Soubor | ID | Jak se dostal do sezení |
|---|---|---|
| `Sablona_SOD_REALIZACE_v3.docx` (CZ) | 1lMzwgBR5L4oHoaSd2SnQ6Gw3fsQPXJot | bajtově (testzip OK) |
| `Sablona_SOD_REALIZACE_v3_EN/_DE/_FR.docx` (revize 21. 10.) | 1RGNRPDiByNOJRmZI24bB7MfTYTKRNXLz, 1oU7nIanpioiQSF4IdT5TrB3CxRaZLc35, 1FIXz80dbQmhQzS1Y3GlHA0-JzHtkD6sE | bajtově |
| `Sablona_SOD_REALIZACE_v3.preklad_en/de/fr.json` (20. 10., strojový V3) | 1Snd3Y4GlrwYgCgVpvAt2-ZzIVL_QfOGR, 1MvSeg8nqDMak9Y1T1p55Sn1mBay2CRr5, 1oo6uORItk98CDeGai3z6yHElb3MJvBGi | bajtově |
| `Sablona_SOD_PROJEKCE_v4.docx` (CZ) | 1N3FVLERg1HGLhFPA1xW8aR_uNqvLGUNv | bajtově |
| `Sablona_SOD_PROJEKCE_v4_EN/_DE/_FR.docx` (revize 21. 10.) | 15UQKtz57-E9LAh5HJwjmQtKpOyhwyuPR, 1p3EXn8ZAJQ3FnSV5dM0ilJlaNplt5M9n, 15j4dkVo6DtR-JA0H7SGski-uZ98aWr2D | **jen text** (viz níže) |

Slovníky SoD projekce v4 na Disku nejsou (sezení V3/V5 je předalo jen jako přílohy) — vznikly nové.

**Omezení konektoru:** soubor pod ~50 kB vrací konektor jen přímo do odpovědi (base64), ne do souboru;
ruční přepis base64 projekce v4 EN (16 kB) se pokazil (CRC, chyba hned na 79. bajtu document.xml).
Projekce v4 se proto vzala jako text (`read_file_content`), přepsaný dvěma nezávislými subagenty —
oba přepisy jsou ve všech třech jazycích bajtově shodné.

## Výsledek — počty rozdílů po jazycích

Metrika `node nastroje/preklad_sod.js --porovnej`: odstavce ve stejném pořadí (document, záhlaví,
zápatí), rozdíl **textu**, **jen běhů** (stejný text, jiné písmo po sloučení sousedních běhů
stejného písma) a **w:pPr**; plus název dokumentu (docProps) a jazyk ve `styles.xml` / `settings.xml`.

### SoD realizace v3 (272 odstavců, 141 s textem) — přesně, bajtové zdroje

| Jazyk | Před: text / běhy / w:pPr / ostatní | Po: text / běhy / w:pPr / ostatní | Změněných záznamů |
|---|---|---|---|
| EN | 99 / 5 / 13 / 3 | **0 / 0 / 0 / 0** | 105 (z toho název + blok) |
| DE | 97 / 0 / 13 / 3 | **0 / 0 / 0 / 0** | 99 |
| FR | 117 / 2 / 12 / 3 | **0 / 0 / 0 / 0** | 121 |

„Před“ = původní nástroj (4c127f5) + strojové slovníky V3 z Disku. „Ostatní“ = prázdný název dokumentu
proti „CONTRACT FOR WORK“ / „WERKVERTRAG“ / „CONTRAT D'ENTREPRISE“, jazyk ve stylech a v nastavení.
Odvození (`--z-revize`): 0 vad, 0 sporných vět ve všech jazycích; pojmenované místo SKLADNE zůstalo.

Co revize dělá jinak než strojový překlad a co proto nástroj nově umí (stejně pro všechny jazyky):

- **text** 97–117 odstavců (např. „NOZ“ → „Civil Code“ / „BGB“ / „Code civil“, mezera za „Client:“,
  „Authorised representative“, „phone“);
- **w:lang cs-CZ → en-GB / de-DE / fr-FR** (15× v těle včetně značek odstavců, všechny `w:lang w:val`
  ve `styles.xml`, `themeFontLang` v `settings.xml`), **název dokumentu** v docProps;
- **w:keepNext** u 12 odstavců podpisového bloku (i prázdných řádků) → záznam `drzetSpolu` mezi
  kotvami „příloha č. 2 – pojistný certifikát zhotovitele“ a „{{OBJEDNATEL_PODPIS_FUNKCE}}jednatel…“;
- **písmo tabulátorů** podle češtiny (např. tučné, ne podtržené za „Client:“) → pomocné styly úseků bez
  písmen (`<sN>` za styly s písmeny; klíč slovníku se nemění);
- uvozovka za tučným slovem v základním písmu (`“<s1>Contract</s1>”`), sloučené běhy stejného písma,
  bez `w:rsid*` u běhů těla.

Zbytek proti revizi je jen v zápisu XML, ne v obsahu: revize nechává prázdné běhy bez textu
(12 odstavců) a XML deklaraci s apostrofy (`styles.xml`, `settings.xml`, `core.xml`).

### SoD realizace v4 (krok 3) — 275 odstavců

`node nastroje/vyrob_sablony.js --sod-real-v4` (a) postupem S11 z revidovaných v3 (vložení přeloženého
bloku) a (b) bez jazykových v3 jen ze slovníků výše + `SOD_REAL_V4_PREKLAD`: CZ v4 bajtově shodná,
EN/DE/FR (b) × (a) **0 / 0 / 0 / 0** ve všech jazycích. Soubory S11 samy v sezení nebyly (na Disk se
nenahrály) — (a) je tentýž postup nad stejnými vstupy. Nové odstavce rozpisu příplatků jsou přeložené
stejně v obou cestách (níže k ověření).

### SoD projekce v4 — jen na úrovni textu

| Jazyk | Odstavců (neprázdných) | Rozdíl textu (mezery sloučené) | Problémy kontroly nástroje | Záznamů slovníku |
|---|---|---|---|---|
| EN | 134 | **0** | 0 | 94 (93 vět + název) |
| DE | 134 | **0** | 0 | 94 |
| FR | 134 | **0** | 0 | 94 |

Neověřené (text z konektoru je nenese): písmo běhů (tučný úsek 20 vět — umístěný podle češtiny:
název činnosti před „ – “, „Design Documentation“, „Art. VI“ …), počet tabulátorů a mezer (#12 „CZK
account“, „In Prague on … In Prague on“, „For the Client: … For the Contractor:“ — tabulátory podle
češtiny), nezlomitelné mezery (FR před „:“), w:pPr / w:keepNext, jazyk stylů. Přesnou shodu ukáže
`--porovnej`, jakmile budou revidované soubory projekce v sezení bajtově (stačí je na Disku zabalit
do jednoho .zip > 50 kB, nebo nahrát `--z-revize` z jiného sezení) — nástroj je připravený.

## Výsledné slovníky — kde jsou a kam je uložit (J. V.)

**Platné (přesné) soubory = přílohy sezení D4** (session_01BXbjNzMGvJmNGvTVPasUd7, soubory sezení
`scratchpad/upload/`). Nezlomitelné mezery jsou v nich zapsané jako ` ` (čisté ASCII, načtou se
stejně; tak je nově zapisuje i `--z-revize`):

| Soubor | Bajtů | sha256 (12) | Ověření |
|---|---|---|---|
| `Sablona_SOD_REALIZACE_v3.preklad_en.json` | 66 168 | 4586ac9a6432 | `--porovnej` 0 rozdílů |
| `Sablona_SOD_REALIZACE_v3.preklad_de.json` | 68 292 | 5c6acffaf288 | `--porovnej` 0 rozdílů |
| `Sablona_SOD_REALIZACE_v3.preklad_fr.json` | 69 270 | 0356a4560675 | `--porovnej` 0 rozdílů |
| `Sablona_SOD_PROJEKCE_v4.preklad_en.json` | 34 058 | d59a6cd5d647 | 0 rozdílů textu |
| `Sablona_SOD_PROJEKCE_v4.preklad_de.json` | 35 380 | 7895d43a3ef4 | 0 rozdílů textu |
| `Sablona_SOD_PROJEKCE_v4.preklad_fr.json` | 35 956 | e4059b113174 | 0 rozdílů textu |

**Kam:** Disk → Kalkulator NextGen / Sablony (vedle šablon) pod jménem s datem
`…preklad_<jazyk>_2026-10-22.json`; originály z 20. 10. nepřepisovat. Pro použití nástrojem stáhnout pod
jménem bez data vedle šablony.

**Co na Disku dnes už je (vzniklo před pokynem koordinace „na Disk nic“; NEPOUŽÍVAT, nahradit
přílohami):** šest souborů s datem 2026-10-22 ve složce Sablony, vytvořených přepisem textu přes
konektor — přepis změnil všechny nezlomitelné mezery na obyčejné (jinak bajtově shodné, ověřeno
stažením u realizace):

| Na Disku | ID | Stav |
|---|---|---|
| `Sablona_SOD_REALIZACE_v3.preklad_en_2026-10-22.json` | 1Urtp-bqcMmsruWpeF5kiP-ftApQBXBgt | bez NBSP — prakticky funguje (0 rozdílů), ale není přesná |
| `Sablona_SOD_REALIZACE_v3.preklad_de_2026-10-22.json` | 1Hud7ejagBrTu9KIAgYxAJQPZM1i3trgH | bez NBSP — prakticky funguje (0 rozdílů), ale není přesná |
| `Sablona_SOD_REALIZACE_v3.preklad_fr_2026-10-22.json` | 1h6etYUxTY0vHLXZxSkmRbsWTfJ0QMHcn | **vadná** — 60 odstavců bez NBSP před „:“ apod. |
| `Sablona_SOD_PROJEKCE_v4.preklad_en_2026-10-22.json` | 1o1n83LgS7fh0Va2SZxoeGbpd4cI060eg | bez NBSP v klíčích (o 395 B kratší než příloha) |
| `Sablona_SOD_PROJEKCE_v4.preklad_de_2026-10-22.json` | 1b-p6NPbAOhhPwG0RdA-JQWp50JMBZBGx | totéž |
| `Sablona_SOD_PROJEKCE_v4.preklad_fr_2026-10-22.json` | 1qPo3nOtwSgn9afk2weCtQ7qkr95aS9XC | totéž |

Konektor Disku obsah existujícího souboru přepsat neumí (`update_file` mění jen metadata) a koš
vyžaduje schválení — proto je nahradí J. V.: u každého souboru „Spravovat verze → Nahrát novou verzi“
přílohou stejného jména (ID i odkaz zůstanou), nebo je smaže a nahraje přílohy.

Použití: soubor stáhnout pod jménem bez data (`Sablona_SOD_REALIZACE_v3.preklad_en.json` …) vedle šablony
a `node nastroje/preklad_sod.js --jazyk en <složka>` (projekce v4 stejně; realizace v4: `vyrob_sablony.js
--sod-real-v4` bez jazykových v3 ve složce vezme tyto slovníky).

## K ověření J. V. (sporné překlady)

1. **DE „BGB“ pro český občanský zákoník** (revize: „(nachfolgend „BGB“)“, „Gesetz Nr. 89/2012 Slg., BGB“).
   BGB je zavedená zkratka německého zákoníku — u smlouvy podle českého práva hrozí záměna. Návrh:
   „tschechisches BGB“ nebo „(nachfolgend „ZGB“)“. Ponecháno podle revize (závazné znění).
2. **FR „loi n° 89/2012 Sb.“** — česká zkratka sbírky (DE má „Slg.“, EN „Coll.“). Ponecháno.
3. **Nové odstavce SoD realizace v4** (rozpis objednaných příplatků, terminologie revize: EN Work /
   price quotation / excl. VAT, DE Werkpreis / Preisangebot / ohne MwSt., FR Ouvrage / offre de prix /
   HT; slovo „příplatky“ revize SoD nemá — vzato z nabídek):
   - EN „of which the price of the Work according to price quotation No. {{CISLO_NABIDKY}}:
     {{SOD_CENA_NABIDKY}} (excl. VAT)“ · „ordered surcharges:“ · „surcharges in total: {{SOD_PRIPLATKY_KC}} (excl. VAT)“
   - DE „davon Werkpreis gemäß Preisangebot Nr. {{CISLO_NABIDKY}}: {{SOD_CENA_NABIDKY}} (ohne MwSt.)“ ·
     „bestellte Zuschläge:“ · „Zuschläge insgesamt: {{SOD_PRIPLATKY_KC}} (ohne MwSt.)“
   - FR „dont prix de l’Ouvrage selon l’offre de prix n° {{CISLO_NABIDKY}} : {{SOD_CENA_NABIDKY}} (HT)“ ·
     „suppléments commandés :“ · „total des suppléments : {{SOD_PRIPLATKY_KC}} (HT)“
     (FR „suppléments“ revize používá i pro „travaux supplémentaires“ = vícepráce — ověřit, že nesplývá).
4. **SoD projekce v4:** tučné úseky a tabulátory umístěné podle češtiny (viz výše) — při otevření ve
   Wordu zkontrolovat čl. II/III (názvy činností tučně) a podpisový blok.
5. **„jednatel“** v podpisu → „Managing Director“ / „Geschäftsführer“ / „gérant“ (revize) — beze změny,
   jen pro úplnost.

## Kód a testy (repo)

- `nastroje/preklad_sod.js`: `--z-revize`, `--porovnej`, `slovnikZRevize`, `porovnejSRevizi`,
  `zapisZRevize`; jazyk dokumentu, název, bloky `drzetSpolu`, pomocné styly, sloučení běhů, bez `w:rsid*`.
- `src/test_sod_slovnik_revize.js` — test kruhem na smyšleném vzorku: před D4 (4c127f5) 0 prošlo /
  1 selhalo, po D4 **29 / 0** (zápis `\u00a0`: proti ad78da2 28 / 1). Stávající sady beze změny zelené (test_preklad_sod 19/0,
  test_sod_real_v4 20/0, test_sod_real_v3 11/0, test_sod_en 49/0, test_docx_preklad 52, test_sablony_online 85/0).
- `mutace_jadro.mjs`: 10 mutací „D4 slovník z revize“ — **10/10** (napoprvé 9/10, doplněn test ověření
  po složení); všechny mutace `preklad_sod` 16/16; `--kontrola` 432 úseků. Statická kontrola údajů čistá.
- Prohlížečové sady a celé kolo nepouštěny (pustí koordinace).
