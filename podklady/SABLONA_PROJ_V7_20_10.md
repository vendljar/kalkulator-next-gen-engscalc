# Šablona nabídky PROJ (OVP-CN) v7 — CZ + EN + DE + FR (20. 10. 2026)

Artefakt pro J. V.: https://claude.ai/artifact/5RqvHSPuuun2dcUg26UwUD

Dávka S10 (větev `claude/s10-sablona-proj-v7` nad `claude/d1-sikora` 8c912a7, v20.10.3), zadání J. V.
20. 10. 2026: „vyrob mi teď v7 pro ostrou verzi". Kód aplikace beze změny a bez nové verze; změněn jen
nástroj `nastroje/vyrob_sablony.js` (viz bod 3) a přibyl test `src/test_sablona_proj_v7_preklad.js`.

> **Šablonu v7 nahrávat na ostrou verzi (main) až PO nasazení v20.10.3 (D1) do main.**
> Dnešní main v20.10.1 nové symboly nezná — ověřeno, viz bod 5.

## 1. Soubory

| Soubor | Jazyk | Symbolů | base64 | Kde je |
|---|---|---|---|---|
| `Sablona_NABIDKA_PROJ_v7.docx` | CZ | 95 | 1,39 MB | soubor sezení S10 (`podklady/sablony_vystup/`, gitignore) |
| `Sablona_NABIDKA_PROJ_v7_EN.docx` | EN | 95 | 1,40 MB | soubor sezení S10 |
| `Sablona_NABIDKA_PROJ_v7_DE.docx` | DE | 95 | 1,40 MB | soubor sezení S10 |
| `Sablona_NABIDKA_PROJ_v7_FR.docx` | FR | 95 | 1,40 MB | soubor sezení S10 |

Na Disk (Kalkulator NextGen → Sablony) nenahráno: konektor Google Drive bere obsah jen jako parametr
volání (~1,4 MB base64 na soubor), stejně jako u S9 to neprojde. Uložit ručně ze souborů sezení.

## 2. Jak vznikly

1. Disk → Sablony: `Sablona_NABIDKA_PROJ_v5.docx` (ID 1OBMAlYMqC9KO3gWLKWa8A13vcB9jNgxR) a pro kontrolu
   `Sablona_NABIDKA_PROJ_v6.docx`, kterou J. V. na Disk nahrál dnes v 11:47 (ID 1Vj2Voo87T5NpjyBDxzLMC2mX8qzXlJgk).
2. `node nastroje/vyrob_sablony.js --proj-v6 <podklady> <výstup>` → v6 + EN/DE/FR, přeloženo 198 z 209,
   bez problémů. **`word/document.xml` vyrobené v6 je bajtově shodný s v6 na Disku** (SHA-256 7f007ccd…),
   jazykové verze v6 se po opravě nástroje nezměnily (bajtově shodné s výrobou před opravou).
3. `node nastroje/vyrob_sablony.js --proj-v7 <podklady s v6> <výstup>` → **česká v7 prošla na skutečné
   šabloně napoprvé** (všechny kotvy nalezeny: úvod DPZ, titul „STUDIE PROVEDITELNOSTI" v řádku s
   `{{NAZEV_AKCE}}`, „Navazující PROJEKTOVÉ a INŽENÝRSKÉ ČINNOSTI", hvězdička u ceny DPZ, poznámka
   „* Cena je platná…", bloky ST / cena SP / poznámka o studii). **Jazykové verze ale hlásily problém:**
   nadpis „CENA ZA DOKUMENTACI PRO POVOLENÍ ZÁMĚRU (DPZ){{PROJ_DPZ_HVEZDICKA_ZNACKA}}:" zůstal v EN/DE/FR česky.

## 3. Oprava nástroje (proč a jak)

- **Příčina:** `docxPrelozUseky` v `src/docxgen.js` před překladem úseku mezi symboly odřízne koncové znaky
  mimo písmena a `:.!?*` — tedy i „)". Slovník pak hledá „CENA ZA … ZÁMĚRU (DPZ" a nezná ho. V v6 stála
  hvězdička jako text („(DPZ)*:") a odstavec se přeložil celý; v7 dala hned za „)" symbol. Syntetická
  šablona D1 to nezachytila (test D1 kontroluje jen českou v7).
- **Oprava (jen nástroj, kód aplikace se v dávce šablon nemění):** `trStavSeZavorkou` obalí slovník po dobu
  výroby jazykových verzí — nepřeložený text s jednou neuzavřenou „(" zkusí i s „)" a z překladu koncovou
  „)" vezme (v dokumentu zůstává za přeloženým úsekem). `prelozSablonu` obal nasadí a po překladu
  (i po chybě) vrátí původní `trStav`. Nic jiného se nemění.
- **Test:** `src/test_sablona_proj_v7_preklad.js` 13/0; **před opravou selže** (1 OK, 1 FAIL — nástroj obal
  neexportuje). Hlídá i stav aplikace: bez obalu nadpis zůstane česky — kdyby se docxgen opravil, test to
  ohlásí a obal půjde pryč.
- **Návrh do kódové dávky (ne teď):** stejná past je v aplikaci — Nastavení → Šablony → „vyrobit jazykovou
  verzi" by z české v7 vyrobil EN/DE/FR s tímto nadpisem česky (průvodce ho vypíše mezi „zůstalo česky").
  Oprava v `docxPrelozUseky`: nezařezávat „)" (resp. vyvážené závorky) do `za`. Proto **nahrávat hotové
  EN/DE/FR z tohoto sezení, nevyrábět je v aplikaci.**

Výsledek po opravě: v7 CZ + EN/DE/FR, přeloženo **195 z 206** odstavců v každém jazyce (zbylých 11 jsou
neutrální — čísla, zkratky, samotné symboly), „česky zůstalo" nic. Česky v EN/DE/FR zůstává jen zkratka
„IČ" (inženýrská činnost, IČO v zápatí) — stejně jako v v6.

## 4. Ověření (stejné funkce jako server `sablony.mjs` a průvodce)

| Soubor | .docx | base64 ≤ 5 MB | `sablonaObsahVady` | XML | jazyk (odhad) | symboly proti CZ |
|---|---|---|---|---|---|---|
| v7 CZ | ano | 1,39 MB | prázdné | bez vad | cz 100 % | — (95) |
| v7 EN | ano | 1,40 MB | prázdné | bez vad | en 100 % | +0 −0 |
| v7 DE | ano | 1,40 MB | prázdné | bez vad | de 96 % | +0 −0 |
| v7 FR | ano | 1,40 MB | prázdné | bez vad | fr 100 % | +0 −0 |

(v6 CZ/EN/DE/FR stejně: vše prázdné, jazyk sedí, 82 symbolů.)

**v7 proti v6: přibylo přesně 13 symbolů D1, ubylo 0** — `PROJ_TITUL_STUDIE`, `PROJ_TITUL_CINNOSTI`,
`PROJ_DPZ_UVOD`, `PROJ_DPZ_HVEZDICKA_ZNACKA`, `PROJ_DPZ_HVEZDICKA` a značky `BLOK_DPZ_HVEZDICKA_ZAC/_KON`,
`BLOK_STUDIE_ROZSAH_ZAC/_KON`, `BLOK_STUDIE_CENA_ZAC/_KON`, `BLOK_STUDIE_POZN_ZAC/_KON`. Přesně tohle má
ukázat průvodce v kroku „Kontrola" („přibylo 13, ubylo 0").

**Vyplnění kódem D1 (v20.10.3)** — `docxVyplnSablonu` s daty `nabidkaProjData` jako `dokumentVygeneruj`,
zkušební ceník, CZ/EN/DE/FR, se studií i bez ní:
- bez studie: titul „PROJEKTOVÉ a INŽENÝRSKÉ ČINNOSTI" / „DESIGN and ENGINEERING SERVICES" /
  „PLANUNGS- und INGENIEURLEISTUNGEN" / „PRESTATIONS DE CONCEPTION et D'INGÉNIERIE", úvod DPZ bez navázání,
  nadpis ceny DPZ bez hvězdičky, **žádná zmínka o studii**;
- se studií: „Název akce: … STUDIE PROVEDITELNOSTI" (FEASIBILITY STUDY / MACHBARKEITSSTUDIE / ÉTUDE DE
  FAISABILITÉ), „Navazující …", úvod DPZ s navázáním, „(DPZ)*:" a poznámka „* Cena je platná…";
- ze symbolů v7 nezůstal ani jeden. Zbylé `{{PODM_SPLATNOST_DNI_CISLO}}`, `{{PODM_PLATNOST_NABIDKY}}`,
  `{{ZPRAC_*}}` plní v aplikaci krycí list a profil přihlášeného — v6 je má v téže zkoušce stejně (základna).

Testy: `test_d1_dpz_bez_studie` 92/0, `test_sablona_proj_v6` se skutečnou v5 (`KNG_PODKLADY`) 35/0,
`test_sablona_proj_v4` 33/0, `test_sablona_proj_v7_preklad` 13/0, `kontrola_udaju.py` čisté; celé kolo viz
CHANGELOG/předávka.

## 5. Co udělá dnešní main (v20.10.1) se šablonou v7 — ověřeno

Stejná zkouška kódem `origin/main` (5dc28d1, v20.10.1):
- **Nahrání projde** — server ani průvodce symboly neporovnávají se seznamem známých (kontrola „přibylo 13"
  je jen informativní), obsah je bez vad.
- **Word nabídka PROJ vznikne, ale s viditelnými značkami:** `{{PROJ_TITUL_STUDIE}}` za názvem akce,
  `{{PROJ_TITUL_CINNOSTI}}` místo titulu, `{{PROJ_DPZ_UVOD}}` místo celého úvodu DPZ,
  „(DPZ){{PROJ_DPZ_HVEZDICKA_ZNACKA}}:" a `{{PROJ_DPZ_HVEZDICKA}}` — v CZ i EN/DE/FR, se studií i bez ní.
  Značky bloků v20.10.1 umí (`odstranPrazdneBloky`), ale bloky studie nezná, takže **bez studie zůstane
  v nabídce celá studie** (tabulka ST, cena SP, poznámka) — tedy hůř než s v6.
- **Přísný režim tisk kvůli v7 NEZASTAVÍ** — hlídá jen chybějící / zastaralou šablonu a jazykovou verzi
  starší než čeština, ne neznámé symboly. Nabídka by tak odešla zákazníkovi s `{{…}}`. Zastaví jen tehdy,
  když se nahraje česká v7 bez EN/DE/FR (jazykové verze v6 jsou pak „zastaralé" → cizojazyčná nabídka
  nevznikne) — proto nahrávat všechny čtyři najednou.
- S v20.10.3 a starou v6 v databázi: nabídka vznikne jako dnes a kontrola `dpzUvodWordProj` (D1) u DPZ bez
  studie varuje, že je potřeba šablona v7.

## 6. Postup nahrání (test, ověřit, pak main — každý web má vlastní úložiště šablon)

0. **Podmínka:** na webu běží **v20.10.3 nebo novější** (patička / `/api/zdravi`). Na main až po nasazení D1.
1. Přihlásit se jako administrátor → **Nastavení → Šablony → Šablona cenové nabídky PROJ (OVP-CN)**.
2. „Nahrát novou českou verzi…" → `Sablona_NABIDKA_PROJ_v7.docx`. Kontrola musí ukázat proti v6
   **přibylo 13** (seznam v bodě 4), **ubylo 0**, jazyk čeština, bez vad obsahu.
3. Krok jazykových verzí: nahrát `…_v7_EN.docx`, `…_v7_DE.docx`, `…_v7_FR.docx` (ne „vyrobit" v aplikaci —
   viz bod 3) → **Zveřejnit**.
4. Tabulka šablon: OVP-CN v7 a EN/DE/FR „✓ z v7", nic „⚠ zastaralá".
5. Zkouška: zakázka PROJ s DPZ **bez studie** a **se studií**, Word CZ + EN: titul, úvod DPZ, hvězdička
   a bloky studie podle bodu 4, v dokumentu žádné `{{PROJ_…}}`.

Navazující D2 (v20.10.4) připravuje PROJ v8 nad v7 (cestovné mimo Prahu) — v7 je pro ni vstupem.

## 7. Ke kontrole rodilými mluvčími (nové texty v7)

Texty dosazuje aplikace ze slovníku (`src/preklad.js`, D1); šablona nese jen symboly. Strojový překlad
projektu — **ke kontrole rodilým mluvčím (EN, DE, FR)**:

| CZ | EN | DE | FR |
|---|---|---|---|
| STUDIE PROVEDITELNOSTI (titul) | FEASIBILITY STUDY | MACHBARKEITSSTUDIE | ÉTUDE DE FAISABILITÉ |
| Navazující PROJEKTOVÉ a INŽENÝRSKÉ ČINNOSTI | Follow-up DESIGN and ENGINEERING SERVICES | Anschließende PLANUNGS- und INGENIEURLEISTUNGEN | PRESTATIONS DE CONCEPTION et D'INGÉNIERIE ultérieures |
| PROJEKTOVÉ a INŽENÝRSKÉ ČINNOSTI (bez studie; **znění čeká na potvrzení J. V.**) | DESIGN and ENGINEERING SERVICES | PLANUNGS- und INGENIEURLEISTUNGEN | PRESTATIONS DE CONCEPTION et D'INGÉNIERIE |
| Dokumentace pro povolení záměru (DPZ) navazuje na vzájemně odsouhlasenou STUDII PROVEDITELNOSTI. Ta rozpracovává dokumentaci dle platné vyhlášky do legislativou požadované úrovně s autorizacemi inženýrů dle příslušných oborů. | The documentation for the project permit (DPZ) follows on from the mutually agreed FEASIBILITY STUDY. It develops the documentation in accordance with the applicable decree to the level required by legislation, with the authorisations of engineers in the relevant disciplines. | Die Unterlagen für die Vorhabengenehmigung (DPZ) bauen auf der gemeinsam abgestimmten MACHBARKEITSSTUDIE auf. Sie arbeiten die Dokumentation gemäß geltender Verordnung bis zum gesetzlich geforderten Niveau aus, mit Autorisierung der Ingenieure der jeweiligen Fachrichtungen. | Le dossier de demande d'autorisation (DPZ) s'appuie sur l'ÉTUDE DE FAISABILITÉ validée d'un commun accord. Il développe la documentation conformément au décret en vigueur jusqu'au niveau exigé par la législation, avec les agréments des ingénieurs des disciplines concernées. |
| Dokumentace pro povolení záměru (DPZ) rozpracovává dokumentaci dle platné vyhlášky … (bez studie) | The documentation for the project permit (DPZ) is prepared in accordance with the applicable decree to the level required by legislation, with the authorisations of engineers in the relevant disciplines. | Die Unterlagen für die Vorhabengenehmigung (DPZ) werden gemäß geltender Verordnung bis zum gesetzlich geforderten Niveau ausgearbeitet, mit Autorisierung der Ingenieure der jeweiligen Fachrichtungen. | Le dossier de demande d'autorisation (DPZ) est élaboré conformément au décret en vigueur jusqu'au niveau exigé par la législation, avec les agréments des ingénieurs des disciplines concernées. |
| Dokumentace pro povolení záměru obsahuje tyto části: | The documentation for the project permit contains the following parts: | Die Unterlagen für die Vorhabengenehmigung umfassen folgende Teile: | Le dossier de demande d'autorisation comprend les parties suivantes : |
| * Cena je platná v případě návaznosti na STUDII PROVEDITELNOSTI | * The price applies if it follows on from the FEASIBILITY STUDY | * Der Preis gilt bei Anschluss an die MACHBARKEITSSTUDIE | * Le prix s'applique dans la continuité de l'ÉTUDE DE FAISABILITÉ |

Drobnost k rodilé kontrole FR: nadpis „PRIX DU DOSSIER … (DPZ)*:" má dvojtečku bez mezery (ve v6 stejně
— dvojtečka stojí v šabloně za symbolem, mimo přeložený úsek).

## 8. Znovu vyrobit

```
# složka podkladů: Sablona_NABIDKA_PROJ_v5.docx z Disku
node nastroje/vyrob_sablony.js --proj-v6 <podklady> <podklady>     # v6 (= v6 na Disku)
node nastroje/vyrob_sablony.js --proj-v7 <podklady> <výstup>      # v7 + EN/DE/FR
```
