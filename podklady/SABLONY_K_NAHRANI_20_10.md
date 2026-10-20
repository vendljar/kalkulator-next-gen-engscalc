# Šablony k nahrání do `test` a `main` (v20.10.1) — 20. 10. 2026

Artefakt pro J. V.: https://claude.ai/artifact/ChFFv9Y2pN92S87b3L1TAF

Dávka S9 (větev `claude/s9-sablony`, sezení session_01FeJSprZDeJmos6TvkDgHzD), zadání J. V.
20. 10. 2026: „připrav mi všechny šablony, které musím do main (i test) nahrát."
Bez změny kódu a verze — jen podklad. Stav: `main` = `test` = 5dc28d1 (v20.10.1).

## 1. Co aplikace zná (z kódu v20.10.1)

- Typy centrálních šablon: `nabidka`, `nabidkaProj`, `sod`, `sodProj`, `plnaMoc`
  (`SABLONY_ONLINE_TYPY` v `src/sablony_online.js`); jazykové verze `typ_en/_de/_fr`
  u všech kromě plné moci (`SABL_DOKUMENTY` v `src/ui/sablony_sprava_ui.js`, plná moc „vždy česky").
- **Krycí list (OCK i PROJ) šablonu nemá** — `kryci_bo` / `kryci_techdata` se generují
  od nuly (`dokumentVygeneruj`, režim A v `src/dokumenty.js`). Nic se nenahrává.
- Strop souboru 5 MB v base64 (`SABLONA_MAX_B64`); server navíc odmítne soubor s vnějšími
  vztahy, makry, vloženými objekty a poli INCLUDE/DDE (`sablonaObsahVady`, B99).
- **Test a main jsou dvě Netlify site s vlastními Blobs** (`NASAZENI_NETLIFY.md`, „Testovací
  web s vlastní databází") — úložiště `sablony` má každý web svoje. **Postup se dělá 2×.**
- Přísný režim (`sablonaProTisk` v `src/ui/common.js`): jazyková verze starší než platná
  čeština = „zastaralá" → cizojazyčný dokument se **zastaví**. Chybějící jazyková verze:
  SoD v cizím jazyce nevznikne (zábrana), nabídka vyjde z české šablony.
  ⇒ **Češtinu a EN/DE/FR nahrávat najednou průvodcem** (krok jazykových verzí), ne zvlášť.

## 2. Tabulka šablon (minimální verze pro v20.10.1)

| Dokument (typ) | Jazyk | Min. verze | Soubor | Kde je | Stav |
|---|---|---|---|---|---|
| CN OCK (`nabidka`) | CZ | v15 | `Sablona_NABIDKA_CN_v15.docx` | Disk → Kalkulator NextGen / Sablony (ID 1ZgnVksypvtb5WrahBMOk7EnVqv-VA-1C); kopie i v tomto sezení | na Disku, ověřeno (`overit_sablona` 99/99, kontrola obsahu bez vad, 113 symbolů) |
| CN OCK | EN / DE / FR | v15 | `Sablona_NABIDKA_CN_v15_EN/_DE/_FR.docx` | Disk / Sablony (ID 1jQM_SBf4JfzLM99lxSsiUVYmDZdgtedA, 1Y4AdZp4K2Okb1ta19o8TAm0zB_cEkd0U, 1PmceAoixHCt_Mu759CyTKTDzcD10-NJc) | na Disku (z 12. 10.) |
| OVP-CN PROJ (`nabidkaProj`) | CZ | **v6** | `Sablona_NABIDKA_PROJ_v6.docx` | soubor tohoto sezení (`podklady/sablony_vystup/`) | **vyrobeno** z v5 z Disku (`--proj-v6`), test v6 35/0 |
| OVP-CN PROJ | EN / DE / FR | v6 | `Sablona_NABIDKA_PROJ_v6_EN/_DE/_FR.docx` | soubory tohoto sezení | **vyrobeno** (přeloženo 198 z 209 odstavců, symboly shodné, jazyk rozpoznán) |
| SoD realizace (`sod`) | CZ | **v3** | `Sablona_SOD_REALIZACE_v3.docx` | soubor tohoto sezení | **vyrobeno** z v2 z Disku (`--sod-real-v3`), `test_sod_real_v3` 11/0 |
| SoD realizace | EN / DE / FR | v3 | `Sablona_SOD_REALIZACE_v3_EN/_DE/_FR.docx` | sezení **V3** session_01GyotCYY7DhFnyXhceNA3de, karta „SoD realizace v3 — FINÁLNÍ (v18.10.7)" | **ke stažení ze sezení V3** (slovníky překladu na Disku nejsou → znovu vyrobit nešlo) |
| SoD projekce (`sodProj`) | CZ | **v4** | `Sablona_SOD_PROJEKCE_v4.docx` | soubor tohoto sezení (stejný i v sezení V5 session_01LE9PMBSsSQLZyhgUhHFrEP) | **vyrobeno** z v3 z Disku (`--sod-proj-v4`), `test_sod_proj_rozsah` 46/0 |
| SoD projekce | EN / DE / FR | v4 | `Sablona_SOD_PROJEKCE_v4_EN/_DE/_FR.docx` | sezení **V3**, karta „SoD projekce v4 EN/DE/FR (v18.10.11)" | **ke stažení ze sezení V3** |
| Plná moc (`plnaMoc`) | CZ (jen) | v1 | `Sablona_PLNA_MOC.docx` | Disk → Output documents (ID 1_JIgInHn2cCkqwqDfIJy8XE_sypHGTGG) | na Disku, beze změny |
| Krycí list OCK / PROJ | — | — | — | generuje aplikace | nic se nenahrává |
| CN PROJ **v7** (D1) | CZ+EN/DE/FR | v7 | — | — | **po další verzi** (v20.10.3) |
| Cestovné (D2) | — | — | — | — | **po další verzi** (v20.10.4) |

Kontrolní výpis (stejné funkce jako server/průvodce, 20. 10. 2026): všech 7 souborů z
`podklady/sablony_vystup/` — `sablonaObsahVady` prázdné, `.docx` ano, odhad jazyka cz/en/de/fr
podle souboru, base64 0,17–1,40 MB (strop 5 MB).

## 3. Co se stane, když zůstane starší šablona

- **CN OCK < v15:** v14 nemá `TS_USAZENI_LEVA/_PRAVA` → levá a pravá boční stěna se slučují do
  jednoho řádku „boční stěny"; v13 nemá bloky platebního kalendáře (`PLATBY_SPLATKY/_MESICNE`)
  → pevné věty o třech dílčích dokladech; < v13 bez značek kapitol `KAP_*` → prázdná kapitola
  IV.–VI. zůstane s nadpisem. `{TERMIN}` v kapitole V. řeší text z Firmy přes `{{NAB_KAP_TERMINY}}`
  (od v11) — šablona kvůli tomu novější být nemusí.
- **OVP-CN PROJ < v6:** CENA NEZAHRNUJE, POŽADOVÁNO OD INVESTORA a TERMÍNY se tisknou pevně
  ze šablony (texty z Nastavení → Firma se do Wordu nedostanou), termíny všech 10 činností
  i nenabízených, DOLOŽKY nikdy. < v5: blok autorského dozoru vždy; < v4: pevné platební
  podmínky a bez ceny geodetického zaměření.
- **SoD realizace < v3:** věta o režimu DPH a prohlášení o snížené sazbě pevně (výchozí režim DPH
  podle DIČ — B189 — se do smlouvy nepromítne), skladné pevnou částkou místo z Firmy.
- **SoD projekce < v4:** rozsah díla vždy „DPZ+DSP …" a všech 7 činností v čl. II/III bez
  ohledu na nabídku; v2 bez čísla smlouvy (`SOD_CISLO_SMLOUVY`).
- **Jazykové verze starší než čeština:** v přísném režimu cizojazyčný dokument nevznikne
  (hláška „mutace … je starší než platná česká šablona").

## 4. Pořadí a postup (udělat na testu, ověřit, pak totéž na main)

0. Přihlásit se jako administrátor. **Nastavení → Firma:** vyplnit „Skladné" (Kč/den) a
   zkontrolovat texty kapitol a textů PROJ (Smlouvy / Šablony → Kapitoly nabídky, Texty nabídky
   PROJ; „↺ Doplnit všechny prázdné") → **Zveřejnit firemní údaje online**.
1. **Nastavení → Šablony → Šablona cenové nabídky OCK** — porovnat platnou verzi v tabulce:
   není-li `…CN_v15.docx` (a EN/DE/FR „✓ z vN" k ní), „Nahrát novou českou verzi…" → v15 →
   v kroku jazyků nahrát `_EN/_DE/_FR` z Disku → Zveřejnit.
2. **Šablona cenové nabídky PROJ (OVP-CN)** → „Nahrát novou českou verzi…" →
   `Sablona_NABIDKA_PROJ_v6.docx`; kontrola má ukázat proti v5 „přibylo" 13 symbolů
   (`PROJ_CENA_NEZAHRNUJE`, `PROJ_POZADOVANO_OD_INVESTORA`, `PROJ_TERMINY_CINNOST/_TERMIN`,
   `PROJ_DOLOZKY`, 8 značek `BLOK_…_ZAC/_KON`), nic neubylo → jazyky `_v6_EN/_DE/_FR` → Zveřejnit.
3. **Šablona smlouvy o dílo — REALIZACE (OCK)** → `Sablona_SOD_REALIZACE_v3.docx`; proti v2
   přibude `SOD_DPH_REZIM`, `SOD_DPH_PROHLASENI`, `SOD_SKLADNE` → jazyky v3 EN/DE/FR ze sezení V3 → Zveřejnit.
4. **Šablona smlouvy o dílo — PROJEKČNÍ PRÁCE** → `Sablona_SOD_PROJEKCE_v4.docx`; proti v3
   přibude `SODP_ROZSAH_DILA` a 14 značek `CIN_…` → jazyky v4 EN/DE/FR ze sezení V3 → Zveřejnit.
5. **Šablona plné moci** — jen zkontrolovat, že je zveřejněná (`Sablona_PLNA_MOC.docx`).
6. Tabulka šablon nesmí mít žádné „chybí" ani „⚠ zastaralá". Zkouška: nabídka OCK a PROJ
   (CZ + EN), SoD realizace a projekce (CZ + EN), plná moc.

Totéž znovu na druhém webu (main). Přenos „Obnova ze zálohy" by šablony přenesl také, ale
přepíše celou databázi — pro šablony ho nepoužívat.

## 5. Kde soubory jsou

- Vyrobené `.docx` (PROJ v6 ×4, SoD realizace v3, SoD projekce v4) a kopie CN v15 CZ:
  `podklady/sablony_vystup/` v kontejneru (gitignore), poslané jako soubory tohoto sezení.
  Na Disk nenahrány (konektor neunese ~1,4 MB base64) — cíl: Disk → Kalkulator NextGen → Sablony.
- Znovu vyrobit: stáhnout `Sablona_NABIDKA_PROJ_v5.docx`, `Sablona_SOD_REALIZACE_v2.docx`,
  `Sablona_SOD_PROJEKCE_v3.docx` do jedné složky a
  `node nastroje/vyrob_sablony.js --proj-v6|--sod-real-v3|--sod-proj-v4 <složka> <výstup>`.
- SoD EN/DE/FR: jen v sezení V3 (i se slovníky `*.preklad_<jazyk>.json`). Doporučení: stáhnout
  i slovníky a uložit na Disk do Sablony — bez nich je další sezení nevyrobí.
