# Prompt OBJ-PROJ — objednávka projekčních prací místo smlouvy o dílo (NÁVRH poradce, 16. 11. 2026)

> **Návrh — nespouštět bez odsouhlasení J. V.** Čeká na odpovědi na otázky v části 9; výchozí varianty jsou označené
> „výchozí“. Vizuál návrhu je v soukromém artefaktu „Objednávka PROJ — návrh“ (odkaz má koordinace).

Jsi vývojové sezení projektu Kalkulator Next Gen (model Opus 5.5). Komunikuj česky. Na začátku přečti `CLAUDE.md`
a `PREDAVKA.md` (oddíl koordinace). Spusť `bash nastroje/instaluj_hooky.sh`. Nikdy AskUserQuestion — u nejasnosti zvol
výchozí variantu a napiš ji do závěrečné zprávy.

| | |
|---|---|
| větev | `claude/obj-proj` |
| báze | `0a9866371363195bfb8fa63454072d1f389ec0c6` (integrace v12.11.7) nebo SHA ze zprávy koordinace |
| roadmapa | **#607** (přidělila koordinace 16. 11. 2026; #598–#606 drží víc zákazníků ve větvi `claude/integrace-vz`, proto nejsou v integraci 16-10 vidět — před zápisem ověř, že je #607 volné v obou) |
| meze B | žádná nová se nečeká (server se mění jen o typ dokumentu v zámku a v šablonách); kdyby přece, další volná je B218 |
| odhad | 8–10 h |
| riziko | **složitá** — smluvní dokument, zámek varianty. Před sloučením revize poradce nad celým diffem |

Do `test-draft`, `test`, `main` ani do integrace nic. Nic do Pipedrive, na Disk nic nezapisuj. Žádné ceny, osobní údaje
ani `.docx` do repa. `git push --no-verify` je zakázané.

## 1. Zadání J. V. (16. 11. 2026)

„V případě projekce častěji než smlouvu řešíme pouze objednávku … navrhni šablonu objednávky, kterou bychom namísto
smlouvy mohli používat.“ Vzorem jsou „Přijaté objednávky“ z účetního systému (jedna strana A4: strany, řádky prací
s cenou bez DPH a s DPH, součet, podpis objednatele, poznámka „podmínky se řídí cenovou nabídkou č. … ze dne …“,
vystavil). Vzory nesou údaje skutečných zákazníků — do repa ani do testů nepatří; struktura je popsaná tady.

## 2. Co vznikne

Nový typ dokumentu **`objednavkaProj`** — „Objednávka projekčních prací (Word)“ — vedle `sodProj`. Jedna strana A4.
Všechna čísla bere z nabídky PROJ (žádný druhý výpočet), stejně jako smlouva: builder je obálka nad `sodProjData`
/ `nabidkaProjData`.

Pozor na jména: `src/objednane.js` a předpona `obj…` / `SOD_OBJ_…` patří **objednaným příplatkům** OCK. Objednávka
PROJ proto používá typ `objednavkaProj`, funkce `objProj…` nepoužívej — piš `objednavkaProj…`, symboly `OBJP_…`.

## 3. Šablona `Sablona_OBJEDNAVKA_PROJ.docx`

Stavba (shora dolů), viz vizuál:

1. **Hlavička:** „OBJEDNÁVKA projekčních a inženýrských prací“, vpravo číslo objednávky `{{OBJP_CISLO}}`, „ze dne
   `{{DATUM}}`“, „číslo objednávky objednatele: `{{OBJP_CISLO_OBJEDNATELE}}`“.
2. **Strany** (dvousloupcová tabulka): OBJEDNATEL — `{{OBJEDNATEL}}`, `{{OBJEDNATEL_SIDLO}}`, `{{OBJEDNATEL_ICO}}`,
   `{{OBJEDNATEL_DIC}}`, `{{OBJEDNATEL_KONTAKT}}`; ZHOTOVITEL — `{{FIRMA_NAZEV}}`, `{{FIRMA_SIDLO}}`, `{{FIRMA_ICO}}`,
   `{{FIRMA_DIC}}`, `{{FIRMA_TELEFON}}`, `{{FIRMA_EMAIL}}`.
3. **Věta předmětu:** „Objednáváme u vás práce podle cenové nabídky č. `{{CISLO_NABIDKY}}` ze dne
   `{{OBJP_DATUM_NABIDKY}}` pro akci „`{{NAZEV_AKCE}}`“, místo stavby `{{ADRESA}}`.“
4. **Tabulka řádků** — jeden řádek šablony, aplikace ho zopakuje za každou nabízenou činnost: `{{OBJP_RADEK_C}}` |
   `{{OBJP_RADEK_NAZEV}}` + `{{OBJP_RADEK_POPIS}}` | `{{OBJP_RADEK_BEZ_DPH}}` | `{{OBJP_RADEK_DPH}}` |
   `{{OBJP_RADEK_S_DPH}}`. Součtový řádek `{{PROJ_CELKEM_BEZ_DPH}}`, `{{PROJ_DPH_SAZBA}}`, `{{PROJ_CELKEM_S_DPH}}`, pod
   ním „DPH `{{PROJ_DPH_SAZBA}}` %: `{{PROJ_DPH_KC}}`“. Se slevou nebo zaokrouhlením přibude řádek před součtem
   (`{{PROJ_SLEVA_KC}}`, `{{PROJ_ZAOKROUHLENI_KC}}`; bez nich řádek zmizí) — součet řádků musí vždy sedět na celek.
5. **Termíny plnění:** dvousloupcový řádek `{{PROJ_TERMINY_CINNOST}}` | `{{PROJ_TERMINY_TERMIN}}` (rozvíjí se už dnes
   — `DOCX_RADKY_ZA_RADEK`), blok mezi značkami, ať zmizí, když termíny nejsou.
6. **Platební podmínky:** `{{SODP_PLATEBNI_KALENDAR}}` (odstavec na platbu, už dnes) + „Splatnost daňových dokladů
   `{{PODM_SPLATNOST_DNI}}` dní.“
7. **Ostatní ujednání** (pevný text): „Rozsah prací, termíny plnění, platební a ostatní smluvní podmínky se řídí
   cenovou nabídkou č. … ze dne …, která je nedílnou součástí této objednávky. Podpisem objednatel potvrzuje, že se
   s nabídkou seznámil a objednává práce v uvedeném rozsahu.“
8. **Podpisy:** ZA OBJEDNATELE — místo, datum, `{{OBJEDNATEL_PODPIS_JMENO}}`, `{{OBJEDNATEL_PODPIS_FUNKCE}}`, podpis;
   OBJEDNÁVKU PŘIJAL (ZHOTOVITEL) — datum, `{{ZPRAC_JMENO}}`, podpis. Obrázek podpisu zhotovitele jen pokud ho
   šablona nese jako tvar s alternativním textem (#146) — výchozí bez obrázku.
9. **Zápatí:** „Vystavil: `{{ZPRAC_JMENO}}`, `{{ZPRAC_TEL}}`, `{{ZPRAC_EMAIL}}` · Objednávka č. `{{OBJP_CISLO}}`“.

Šablonu vyrob nástrojem (`nastroje/vyrob_sablony.js --objednavka-proj <výstupní složka>` — vzniká od nuly, žádný
vstup z Disku; stavba v kódu nástroje, texty jen ty výše). Výstup do `podklady/sablony_vystup/` (gitignore), pošli
J. V. v sezení; do repa ani na Disk nejde. Podklad `podklady/SABLONA_OBJEDNAVKA_PROJ.md` podle vzoru
`podklady/SABLONA_SOD_REALIZACE_V4_21_10.md` (symboly, návod na nahrání v Nastavení → Šablony).

## 4. Data — odkud se co bere (`src/sod.js`, nový builder `objednavkaProjData`)

| symbol | zdroj |
|---|---|
| strany, akce, adresa, číslo a datum nabídky | hlavička PROJ a `nabidkaProjData` (už dnes) |
| `OBJP_RADEK_*` | nabízené činnosti nabídky PROJ (`nabizeneSekce`, `rekapitulace`): název jako v rekapitulaci nabídky, popis = krátký rozsah činnosti (texty, kterými smlouva skládá `SODP_ROZSAH_DILA` / `SODP_CINNOSTI`), cena bez DPH činnosti, sazba DPH zakázky, cena s DPH. Vlastní položky nabídky (`PROJ_POLOZKY_NAVIC`) jako další řádky |
| součty, DPH | `souhrn` nabídky PROJ — nikdy nepočítat znovu; cena s DPH po řádcích se dopočte tak, aby součet řádků = `PROJ_CELKEM_S_DPH` (zaokrouhlení do posledního řádku, nebo sloupec „s DPH“ jen v součtu — rozhodni podle toho, co sedí s `cenaSDph`, a popiš) |
| termíny | `PROJ_TERMINY_CINNOST` / `PROJ_TERMINY_TERMIN` (jen nabízené činnosti) |
| platby | `sodProjPlatby` → `SODP_PLATEBNI_KALENDAR` (plán plateb PROJ, zmrazený po odeslání) |
| `OBJP_CISLO` | viz část 5 |
| `OBJP_DATUM_NABIDKY` | datum odeslané nabídky ze zámku varianty (ne dnešní datum) |
| `OBJP_CISLO_OBJEDNATELE`, podpis objednatele | nová nepovinná pole krycího listu PROJ; prázdná → tečky |
| zpracovatel | `ZPRAC_*` (už dnes) |

**Tečky:** nevyplněné symboly dostanou „……“ stejnou cestou jako smlouvy (`sodNevyplnene`, volba `nevyplnene`
generátoru, `sablonaSymboly: true` u registrace). Kontrola před tiskem: pravidlo `objednavkaProjNevyplneno` jako
upozornění, nikdy zábrana; nepovinná pole (číslo objednávky objednatele, DIČ) podle toho, jak J. V. rozhodne
u smluv (volba (b) k SoD v5) — do té doby je vypisuj zvlášť jako nepovinná.

**Jedna strana:** s mnoha činnostmi se dokument může přelít. Test hlídá, že objednávka se dvěma až čtyřmi činnostmi
je na jedné straně (počet stran ověř převodem, je-li v prostředí LibreOffice; jinak počtem řádků).

## 5. Číslo objednávky (výchozí; otázka 1)

**Odvozené z čísla nabídky:** řada `OBJ` místo `CN`, stejné pořadové číslo i přípona varianty —
`2026-OVP-CN-0376.2` → `2026-OVP-OBJ-0376.2`. Žádné nové počítadlo, objednávka je na první pohled spárovaná
s nabídkou, dotisk nese stejné číslo. Funkce na jednom místě (vedle `variantaCislo`), test na všechny tvary čísel
(s mezerami, s příponou, řada OPR × OVP, neplatný tvar → číslo nabídky s předponou „OBJ “). Číslo dokladu z účetního
systému se do šablony nedává (vzniká až po přijetí objednávky); pro párování je nepovinné pole krycího listu PROJ
„Číslo dokladu v účetnictví“ — jen evidence, do Wordu nejde.

## 6. Kde se objednávka vybere (výchozí; otázka 3)

- Krycí list PROJ, sekce smlouvy: nové pole **„Smluvní dokument“** — `Objednávka` / `Smlouva o dílo` (výchozí
  **Objednávka**, u starých zakázek bez hodnoty **Smlouva o dílo**, ať se nic nezmění).
- Karta dokumentů PROJ (`src/ui/sod_ui.js`, `sodProjKarta`): hlavní tlačítko podle volby („Vytvořit objednávku PROJ
  (Word)“ / „Vytvořit smlouvu o dílo PROJ (Word)“), druhý dokument zůstává dostupný menším tlačítkem. Plná moc beze
  změny.
- Pole krycího listu, která objednávka nepoužívá (pokuty, správní poplatky…), se u volby Objednávka neskrývají,
  jen kontrola je nevypisuje.

## 7. Zámek, snímek, práva, šablony, jazyky

- `src/zamek.js`: typ `objednavkaProj` s `zamyka: true`, popis „Objednávka projekčních prací (Word)“; patří do
  `ZAMEK_KRYCI_SMLOUVY` (zmrazení podmínek krycího listu jako u `sodProj`) a do seznamu dokumentů strany `proj`
  v kontrolách. Tisk objednávky zamkne variantu a zapíše záznam tisku stejně jako smlouva; dotisk dává totéž.
  Všechna místa, která dnes vyjmenovávají `sodProj` (zámek, kontroly, zábrany `dokumentZabrana`, zábrana ukázkového
  ceníku, názvy souborů `nazevExportu`, příručky), projdi `git grep -n "sodProj"` a u každého rozhodni a zapiš,
  jestli se týká i objednávky.
- Server: typ šablony v `netlify/functions/sablony.mjs` / `src/sablony_online.js` (nový typ ve výčtu, práva jako
  ostatní šablony), kontrola zámku na serveru bere nový typ tisku. Výpočet ceny se nemění.
- Název souboru: `nazevExportu('objednavka', { oblast: 'proj', … })` podle `podklady/NAZVY_SOUBORU.md`.
- **Jazyky (výchozí; otázka 4): jen čeština.** Zábrana jako `sodJazykZabrana`: cizojazyčná objednávka nevznikne,
  dokud šablona toho jazyka není zveřejněná. EN/DE/FR verzi šablony připrav až na pokyn (texty řádků a plateb umí
  překlad aplikace, pevné texty šablony je potřeba přeložit a nechat zkontrolovat).
- Smlouva o dílo PROJ, plná moc, nabídky a výpočet: **beze změny** — zlaté sady a stávající sady SoD musí projít
  bez úprav očekávání.

## 8. Testy, mutace, dokumentace

- Nová sada `src/test_objednavka_proj.js` (syntetická šablona, smyšlená data), každý test s pojistkou (v commitu
  počty před/po): řádky = nabízené činnosti a jen ty; součet řádků = `PROJ_CELKEM_BEZ_DPH` i `PROJ_CELKEM_S_DPH`
  (se slevou, se zaokrouhlením, s vlastní položkou, sazba 21 % i 12 %); číslo objednávky pro všechny tvary; datum
  nabídky ze zámku; tečky u nevyplněných a žádné `{{`; termíny a platby jen nabízených činností; zámek po tisku
  a dotisk shodný; cizí jazyk → zábrana; stará zakázka bez volby → smlouva; smlouva o dílo PROJ beze změny.
- Server: `netlify/test_sablony.mjs` (nový typ šablony), sada zámku (tisk `objednavkaProj` zamyká, klon pokračuje).
- Harness v prohlížeči podle `overit_sod_proj_cislo.mjs` / `overit_plan_plateb.mjs`: volba na krycím listu přepne
  tlačítko, Word vznikne, varianta se zamkne.
- Mutace „[OBJ-PROJ]“ v `mutace_jadro.mjs` (odvození čísla, výběr řádků, součet, úroveň kontroly, výchozí volba
  u staré zakázky) a v `netlify/mutace.mjs` (typ šablony, zámek); `--kontrola` obou. Mutace jádra celé po částech —
  dávka sahá do `sod.js`, `zamek.js`, `kontroly.js`.
- `KNG_PODKLADY=<složka> bash nastroje/testovaci_kolo.sh --bez-mutaci` — počty do předávky.
- Příručka obchodníka (kapitola o smlouvách PROJ: kdy objednávka, kdy smlouva, co se doplní ve Wordu), příručka
  správce A5 (šablona objednávky, nahrání). `CHANGELOG.md`, `roadmapa/roadmap.json` (#607), `verze.txt`,
  `PREDAVKA.md`; průběžně commit + push, na konci `get_session` → `context_usage`.

## 9. Otázky pro J. V. (doporučená volba první)

1. **Číslo objednávky:** odvozené z čísla nabídky (`…-OVP-OBJ-0376.2`, doporučeno) / vlastní číselná řada objednávek /
   ručně zadané číslo dokladu z účetnictví.
2. **Rozsah dokumentu:** plná objednávka na jednu stranu — řádky, termíny, platby a odkaz na nabídku (doporučeno,
   nahradí smlouvu) / jen řádky a odkaz na nabídku jako dnešní doklad z účetnictví.
3. **Volba dokumentu:** pole „Smluvní dokument“ na krycím listu PROJ s výchozí Objednávkou, smlouva zůstává
   dostupná (doporučeno) / obě tlačítka vždy vedle sebe bez volby.
4. **Jazyky:** zatím jen čeština (doporučeno) / hned i EN, DE, FR.

## 10. Kolize

`src/sod.js`, `src/kontroly.js`, `src/ui/sod_ui.js`, `src/ui/kontroly_ui.js`, `nastroje/vyrob_sablony.js`,
`mutace_jadro.mjs` — stejné soubory jako C2+C3 (#583/#584, už v integraci) a jako případná úprava voleb (a)/(b)
k SoD v5. Počet pravidel kontrol je natvrdo na třech místech (`src/test_kontroly.js`, `overit_lista.mjs`,
`manual_vypocet/cisla_vydani.json`) — přibude jedno. Vždy `CHANGELOG.md`, `PREDAVKA.md`, `roadmapa/roadmap.json`,
`verze.txt`.
