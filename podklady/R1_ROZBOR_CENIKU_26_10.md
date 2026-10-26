# R1 — Rozbor přeuspořádání ceníku OCK (#525, vlna F)

26. 10. 2026 · podklad k rozhodnutí J. V. · v kódu aplikace se nic neměnilo.
Stránka s filtrem a otázkami: https://claude.ai/artifact/FcujxfqjghFmhHTpgVdFDf
Bez cen — jen kódy, názvy a jednotky.

Pokyn J. V. (26. 10. 2026): *„přeuspořádání ceníků na montáže a jednotlivé stávající sekce, které budou
nově zahrnovat jen materiál“*. Počítá se se souběžnou dávkou #354 (můstky: `C.mustekKc` → Kč/bm materiálu
a nové buňky `C.mustekRefSirkaMm`, `C.mustekMontazHodKc`, `C.mustekMontazZakladHod`, `C.mustekMontazBmHod`,
`C.mustekMontazMinHod`).

## Shrnutí

- Ceník OCK má dnes **99 položek ve 12 skupinách**, #354 přidá 5. Z nich **16 je čistá práce**
  (budou v nové sekci **Montáž a práce**), **36 materiál** (zůstanou ve stávajících sekcích), **27 smíšených
  nebo služeb** (subdodávky, pronájem lešení, doprava, lakovna, položky „za akci“) a **25 beze změny**
  (Režie = práce kanceláře, ATYP, DPH, kurz).
- **Skupina ceníku je jen zobrazení.** Výpočet, zakázky, zveřejnění, porovnání verzí, zahraniční ceník,
  příznak „cena dle nabídky“ i controlling pracují s **kódem buňky**, ne se skupinou. Přesun řádku
  nezmění žádnou cenu, otisk ceníku ani uloženou zakázku a **nevyžaduje novou verzi ceníku**.
- **Jediná skutečná vazba na název skupiny** je párování trvalých (vlastních) položek katalogu
  v záložce Ceník (`CENIK_GRP_SEKCE` v `src/ui/cenik_ui.js`, odvozeno z `KATALOG_SEKCE_NAZEV`
  v `src/katalog.js`). Stávající skupiny se proto **nesmí přejmenovat**, jinak u nich zmizí tlačítko
  a seznam trvalých položek (v katalogu i v zakázkách zůstanou, jen je admin neuvidí v ceníku).
- Matice zobrazení (práva) **nepracuje po skupinách** ceníku — jen po záložkách a prvcích
  (`src/zobrazeni.js`), přesun ji neovlivní.
- **Kalkulace a nabídka se nemění**: sekce výpočtu (Hrubá OCK, Opláštění, Volitelné, Režie, Příplatky)
  jsou v jádře samostatně (`src/engine.js`), zákazník dál vidí jednu ocelovou konstrukci.
- Doporučení: **fáze 1 = jen přesun řádků** (S), **rozdělení** smíšených položek až po rozhodnutí J. V.
  a jen tam, kde práci dělají naši lidé (kandidát č. 1 tmelení; M za položku).

## 1. Úplná tabulka položek

Druh: **Montáž a práce** = jde do nové sekce · **Materiál** = zůstává ve stávající sekci ·
**Smíšené / služby** = materiál + práce nebo subdodávka, navržená nová sekce **Dodávky s montáží
a služby** · **Beze změny** = Režie (práce kanceláře), ATYP, parametry.

Zdroje: `src/cenik.js` (názvy, poznámky), `src/engine.js` (řádky výpočtu `cenaPath`),
`src/controlling.js` (výchozí mapování a rozhodnutí J1–J11), `podklady/CONTROLLING_NAVRH_20_10.md`,
`src/preklad.js` (texty nabídky, např. lešení = „doprava, stavba a pronájem“), příručka.

| Kód | Název | Jednotka | Dnešní skupina | Navržená skupina | Druh | Co je v ceně | Jistota |
|---|---|---|---|---|---|---|---|
| `C.profilasKgKc` | Profily – hlavní nosné prvky | Kč/kg | HRUBÁ OCK | HRUBÁ OCK | Materiál ve stávající sekci | materiál – ocelové profily (kg) | jisté |
| `C.montazniNosnik` | Montážní nosník | Kč/ks | HRUBÁ OCK | HRUBÁ OCK | Materiál ve stávající sekci | materiál – profil montážního nosníku (řádek „PROFILY – MONTÁŽNÍ NOSNÍK“) | ověřit u J. V. (koupě, nebo zápůjčka) |
| `C.lemovaniKgKc` | Lemování šachty (ext) | Kč/kg | HRUBÁ OCK | HRUBÁ OCK | Materiál ve stávající sekci | materiál – lemování (řádek „PROFILY – LEMOVÁNÍ“) | jisté |
| `C.powertechExt` | Plechy – exteriérová šachta | Kč/kg | HRUBÁ OCK | HRUBÁ OCK | Materiál ve stávající sekci | materiál – plechy (kg) | jisté |
| `C.powertechInt` | Plechy – interiérová šachta | Kč/kg | HRUBÁ OCK | HRUBÁ OCK | Materiál ve stávající sekci | materiál – plechy (kg) | jisté |
| `C.oplechPracKc` | Oplechování – práce | Kč/hod | HRUBÁ OCK | MONTÁŽ A PRÁCE | Montáž a práce | práce – hodinová sazba oplechování (2 řádky „… (PRÁCE)“) | jisté |
| `C.spodniRamKc` | Zámečník – spodní rám (int) | Kč | HRUBÁ OCK | MONTÁŽ A PRÁCE | Montáž a práce | práce zámečníka (kooperace); materiál rámu je v profilech | ověřit u J. V. (nedodává zámečník i materiál?) |
| `C.cilkoKc` | Zámečník – čílka (int) | Kč/ks | HRUBÁ OCK | MONTÁŽ A PRÁCE | Montáž a práce | práce zámečníka (kooperace) | ověřit u J. V. (nedodává zámečník i materiál?) |
| `C.nytKc` | Zámečník – nýtování | Kč/nýt | HRUBÁ OCK | MONTÁŽ A PRÁCE | Montáž a práce | práce zámečníka – nýtování; nýtovací matice jsou ve Spojovacím materiálu | jisté |
| `C.montazHodKc` | Montáž na stavbě | Kč/hod | HRUBÁ OCK | MONTÁŽ A PRÁCE | Montáž a práce | práce – hodinová sazba montáže na stavbě (4 osoby) | jisté |
| `C.vetraciMrizkaKc` | Větrací mřížka (ext) | Kč/ks | HRUBÁ OCK | HRUBÁ OCK | Materiál ve stávající sekci | materiál – 2 ks na šachtu; osazení v hodinách montáže | ověřit u J. V. (zahrnuje cena osazení?) |
| `C.transportKc` | Interní transport | Kč/cesta | HRUBÁ OCK | DODÁVKY S MONTÁŽÍ A SLUŽBY | Smíšené / služby | služba – doprava (2 cesty); controlling „dopravné“ | jisté |
| `C.zastreseniM2Kc` | Zastřešení šachty (ext) | Kč/m² | HRUBÁ OCK | DODÁVKY S MONTÁŽÍ A SLUŽBY | Smíšené / služby | materiál + práce (střecha ext.), dodavatel neznámý | ověřit u J. V. (náš montážník, nebo klempíř za jednu cenu?) |
| `C.mustekKc` | Můstek mezi budovou a OCK | Kč/ks | HRUBÁ OCK | HRUBÁ OCK | Materiál ve stávající sekci | dnes paušál vč. montáže; po #354 materiál můstku vč. zábradlí (Kč/bm) | jisté (rozhodnutí 26. 10., #354) |
| `C.mustekRefSirkaMm` | Můstky – referenční šířka | mm | — (nová, #354) | HRUBÁ OCK | Materiál ve stávající sekci | parametr – šířka, pro kterou platí cena materiálu za bm | jisté (rozhodnutí 26. 10., #354) |
| `C.mustekMontazHodKc` | Montáž můstků | Kč/hod | — (nová, #354) | MONTÁŽ A PRÁCE | Montáž a práce | práce – sazba montáže můstků | jisté (rozhodnutí 26. 10., #354) |
| `C.mustekMontazZakladHod` | Montáž můstků – základ | hod/ks | — (nová, #354) | MONTÁŽ A PRÁCE | Montáž a práce | parametr – hodiny na kus | jisté (rozhodnutí 26. 10., #354) |
| `C.mustekMontazBmHod` | Montáž můstků – za metr délky | hod/bm | — (nová, #354) | MONTÁŽ A PRÁCE | Montáž a práce | parametr – hodiny za metr | jisté (rozhodnutí 26. 10., #354) |
| `C.mustekMontazMinHod` | Montáž můstků – minimum | hod/ks | — (nová, #354) | MONTÁŽ A PRÁCE | Montáž a práce | parametr – minimum hodin | jisté (rozhodnutí 26. 10., #354) |
| `C.oplechFasadaBmKc` | Oplechování k fasádě (ext) | Kč/bm | HRUBÁ OCK | DODÁVKY S MONTÁŽÍ A SLUŽBY | Smíšené / služby | materiál + práce (klempířský prvek, bm) | ověřit u J. V. (náš montážník, nebo klempíř?) |
| `C.zamecnikAtypKc` | Zámečník – ostatní práce (atyp) – sazba za kus | Kč/j. | ATYP – PRVKY A PRÁCE NAVÍC | ATYP – PRVKY A PRÁCE NAVÍC | Beze změny (režie, parametry) | práce zámečníka atyp – jen model 1:1 u starších nabídek | jisté (navrženo nechat v ATYP) |
| `C.atypPrirazka` | ATYP: přirážka za projekční a koordinační práce | % | ATYP – PRVKY A PRÁCE NAVÍC | ATYP – PRVKY A PRÁCE NAVÍC | Beze změny (režie, parametry) | parametr – % z Režie (projekce a koordinace) | jisté |
| `C.atypMontazPct` | ATYP: montáž navíc – podíl z hodin montáže | % | ATYP – PRVKY A PRÁCE NAVÍC | ATYP – PRVKY A PRÁCE NAVÍC | Beze změny (režie, parametry) | parametr – předvyplní hodiny montáže atyp | jisté |
| `C.atypProjekcePct` | ATYP: projekce navíc – podíl z hodin projekce | % | ATYP – PRVKY A PRÁCE NAVÍC | ATYP – PRVKY A PRÁCE NAVÍC | Beze změny (režie, parametry) | parametr – předvyplní hodiny projekce atyp | jisté |
| `C.atypZamecnikKc` | ATYP: zámečník atyp – předvyplněná částka | Kč | ATYP – PRVKY A PRÁCE NAVÍC | ATYP – PRVKY A PRÁCE NAVÍC | Beze změny (režie, parametry) | parametr – předvyplněná částka práce zámečníka atyp | jisté (navrženo nechat v ATYP) |
| `C.atypRezervaZakladPct` | ATYP: rezerva základ | % | ATYP – PRVKY A PRÁCE NAVÍC | ATYP – PRVKY A PRÁCE NAVÍC | Beze změny (režie, parametry) | parametr – rezerva | jisté |
| `C.atypRezervaPriplatkyPct` | ATYP: rezerva příplatky | % | ATYP – PRVKY A PRÁCE NAVÍC | ATYP – PRVKY A PRÁCE NAVÍC | Beze změny (režie, parametry) | parametr – rezerva | jisté |
| `C.skloBokyNazev` | Izolační dvojsklo – typ | — | OPLÁŠTĚNÍ | OPLÁŠTĚNÍ | Materiál ve stávající sekci | text – typ skla | jisté |
| `C.skloBokyKc` | Izolační dvojsklo | Kč/m² | OPLÁŠTĚNÍ | OPLÁŠTĚNÍ | Materiál ve stávající sekci | materiál – sklo; osazení je „Práce opláštění“ | jisté |
| `C.skloCelniNazev` | Sklo VSG 4.4.1 – typ | — | OPLÁŠTĚNÍ | OPLÁŠTĚNÍ | Materiál ve stávající sekci | text – typ skla | jisté |
| `C.skloCelniKc` | Sklo VSG 4.4.1 | Kč/m² | OPLÁŠTĚNÍ | OPLÁŠTĚNÍ | Materiál ve stávající sekci | materiál – sklo | jisté |
| `C.skloVsg442Kc` | Sklo VSG 4.4.2 | Kč/m² | OPLÁŠTĚNÍ | OPLÁŠTĚNÍ | Materiál ve stávající sekci | materiál – sklo | jisté |
| `C.cetrisKc` | Cetris (cementotřísková deska) | Kč/m² | OPLÁŠTĚNÍ | OPLÁŠTĚNÍ | Materiál ve stávající sekci | materiál – deska Cetris | jisté |
| `C.praceOplasteniKc` | Práce opláštění | Kč/m² | OPLÁŠTĚNÍ | MONTÁŽ A PRÁCE | Montáž a práce | práce – osazení opláštění (m²) | jisté |
| `C.plastKotvyKc` | Plastové kotvy (zasklení na terče) | Kč | OPLÁŠTĚNÍ | OPLÁŠTĚNÍ | Materiál ve stávající sekci | materiál – kotvy (za zakázku) | jisté |
| `C.tmeleniKc` | Tmelení – materiál + práce (ext) | Kč/m² | OPLÁŠTĚNÍ | DODÁVKY S MONTÁŽÍ A SLUŽBY | Smíšené / služby | materiál + práce (název „materiál + práce“); controlling J6 | jisté – kandidát na rozdělení |
| `C.striskaDvurKc` | Stříška nad vstupem na dvůr (průchozí ext) | Kč | OPLÁŠTĚNÍ | DODÁVKY S MONTÁŽÍ A SLUŽBY | Smíšené / služby | dodávka prosklené stříšky, pravděpodobně vč. osazení | ověřit u J. V. |
| `C.cestovniKc` | Cestovní náklady | Kč | OPLÁŠTĚNÍ | DODÁVKY S MONTÁŽÍ A SLUŽBY | Smíšené / služby | služba – cestovní náklady (zahraničí); controlling „cestovné“ | jisté |
| `C.cisteniKc` | Čištění | Kč | OPLÁŠTĚNÍ | MONTÁŽ A PRÁCE | Montáž a práce | práce – úklid po montáži (paušál) | ověřit u J. V. (naši lidé, nebo úklidová firma?) |
| `C.prechodoveKgKc` | Přechodové plechy – nerez | Kč/kg | VOLITELNÉ POLOŽKY | VOLITELNÉ POLOŽKY | Materiál ve stávající sekci | materiál – nerez (kg); montáž je „Přechodové plechy – montáž“ | jisté |
| `C.leseniVnitrniKc` | Lešení vnitřní | Kč/m výšky | VOLITELNÉ POLOŽKY | DODÁVKY S MONTÁŽÍ A SLUŽBY | Smíšené / služby | subdodávka – doprava, stavba a pronájem lešení (text nabídky) | jisté |
| `C.leseniFix` | Lešení – fixní část (společná pro všechna lešení) | Kč | VOLITELNÉ POLOŽKY | DODÁVKY S MONTÁŽÍ A SLUŽBY | Smíšené / služby | subdodávka – fixní část lešení | jisté |
| `C.leseniVnejsiKc` | Lešení vnější | Kč/m² | VOLITELNÉ POLOŽKY | DODÁVKY S MONTÁŽÍ A SLUŽBY | Smíšené / služby | subdodávka – doprava, stavba a pronájem lešení | jisté |
| `C.hakyKc` | Háky na mytí šachty (ext) | Kč/ks | VOLITELNÉ POLOŽKY | VOLITELNÉ POLOŽKY | Materiál ve stávající sekci | materiál – 3 ks háků; osazení v montáži | ověřit u J. V. (zahrnuje cena osazení?) |
| `C.zabradliKc` | Úpravy/napojení zábradlí (int) | Kč/nástupiště | VOLITELNÉ POLOŽKY | MONTÁŽ A PRÁCE | Montáž a práce | převážně práce (úpravy a napojení zábradlí na nástupišti), drobný materiál | ověřit u J. V. |
| `C.soklBmKc` | Oplechování soklu prohlubně (ext) | Kč/bm | VOLITELNÉ POLOŽKY | DODÁVKY S MONTÁŽÍ A SLUŽBY | Smíšené / služby | materiál + práce (oplechování soklu, bm); controlling „stavební práce“ | ověřit u J. V. (náš montážník, nebo klempíř?) |
| `C.sken3dKc` | Zaměření 3D skenerem | Kč | REŽIE | REŽIE | Beze změny (režie, parametry) | interní práce – zaměření (J3: dělá náš technik) | jisté |
| `C.vystupZamereniKc` | Výstup ze zaměření pro zákazníka | Kč | REŽIE | REŽIE | Beze změny (režie, parametry) | interní práce – dokumentace ze zaměření | jisté |
| `C.engineeringKc` | Engineering | Kč | REŽIE | REŽIE | Beze změny (režie, parametry) | interní práce kanceláře | jisté |
| `C.projekceHodKc` | Dílenská dokumentace | Kč/hod | REŽIE | REŽIE | Beze změny (režie, parametry) | interní práce – dílenská dokumentace (Kč/hod) | jisté |
| `C.zaskleniListyProjHod` | Projekce navíc – zasklení mezi příčníky | hod | REŽIE | REŽIE | Beze změny (režie, parametry) | parametr – hodiny projekce navíc | jisté |
| `C.statikaHod` | Statické posouzení – hodin | hod | REŽIE | REŽIE | Beze změny (režie, parametry) | parametr – hodiny statiky | jisté |
| `C.statikaOplHod` | Statické posouzení opláštění – hodin | hod | REŽIE | REŽIE | Beze změny (režie, parametry) | parametr – hodiny statiky opláštění | jisté |
| `C.statikaKc` | Statické posouzení – sazba | Kč/hod | REŽIE | REŽIE | Beze změny (režie, parametry) | práce statika (Kč/hod) | jisté |
| `C.rezieKancelareKc` | Režie kanceláře | Kč | REŽIE | REŽIE | Beze změny (režie, parametry) | příspěvek na správní režii (J1) | jisté |
| `C.stavbyvedouciHod` | Stavbyvedoucí – hodin | hod | REŽIE | REŽIE | Beze změny (režie, parametry) | parametr – hodiny stavbyvedoucího | ověřit u J. V. (nechat v Režii, nebo do Montáže a práce?) |
| `C.stavbyvedouciKc` | Stavbyvedoucí – sazba | Kč/hod | REŽIE | REŽIE | Beze změny (režie, parametry) | práce stavbyvedoucího (Kč/hod); controlling „stavební práce“ | ověřit u J. V. (nechat v Režii, nebo do Montáže a práce?) |
| `C.prekladyKc` | Překlady CZ→DE (smlouvy, zprávy) | Kč | REŽIE | REŽIE | Beze změny (režie, parametry) | služba – překlady (jen zahraničí) | jisté |
| `C.vychMontazZakladHod` | Výchozí: montáž – základ (1 os.) | hod | REŽIE | MONTÁŽ A PRÁCE | Montáž a práce | parametr – výchozí hodiny montáže nové zakázky | jisté |
| `C.vychProjekceZakladHod` | Výchozí: projekce – základ | hod | REŽIE | REŽIE | Beze změny (režie, parametry) | parametr – výchozí hodiny projekce | jisté |
| `C.vychOplechOstatniKg` | Výchozí: oplechování ostatní – materiál | kg | REŽIE | HRUBÁ OCK | Materiál ve stávající sekci | parametr – výchozí kg plechu (materiál) | jisté |
| `C.vychOplechOstatniHod` | Výchozí: oplechování ostatní – práce | hod | REŽIE | MONTÁŽ A PRÁCE | Montáž a práce | parametr – výchozí hodiny oplechování | jisté |
| `C.spojovaci.riplockM10` | Riplock M10 | Kč/ks | SPOJOVACÍ MATERIÁL | SPOJOVACÍ MATERIÁL | Materiál ve stávající sekci | materiál | jisté |
| `C.spojovaci.riplockM8` | Riplock M8 | Kč/ks | SPOJOVACÍ MATERIÁL | SPOJOVACÍ MATERIÁL | Materiál ve stávající sekci | materiál | jisté |
| `C.spojovaci.nordlock` | NordLock | Kč/ks | SPOJOVACÍ MATERIÁL | SPOJOVACÍ MATERIÁL | Materiál ve stávající sekci | materiál | jisté |
| `C.spojovaci.nytM10` | Nýtovací matice M10 | Kč/ks | SPOJOVACÍ MATERIÁL | SPOJOVACÍ MATERIÁL | Materiál ve stávající sekci | materiál | jisté |
| `C.spojovaci.nytM8` | Nýtovací matice M8 | Kč/ks | SPOJOVACÍ MATERIÁL | SPOJOVACÍ MATERIÁL | Materiál ve stávající sekci | materiál | jisté |
| `C.spojovaci.nytM6` | Nýtovací matice M6 | Kč/ks | SPOJOVACÍ MATERIÁL | SPOJOVACÍ MATERIÁL | Materiál ve stávající sekci | materiál | jisté |
| `C.spojovaci.tSrouby` | T šrouby | Kč/ks | SPOJOVACÍ MATERIÁL | SPOJOVACÍ MATERIÁL | Materiál ve stávající sekci | materiál | jisté |
| `C.spojovaci.sroubM10` | Šrouby M10 | Kč/ks | SPOJOVACÍ MATERIÁL | SPOJOVACÍ MATERIÁL | Materiál ve stávající sekci | materiál | jisté |
| `C.spojovaci.sroubM8` | Šrouby M8 | Kč/ks | SPOJOVACÍ MATERIÁL | SPOJOVACÍ MATERIÁL | Materiál ve stávající sekci | materiál | jisté |
| `C.spojovaci.sroubM6` | Šrouby M6 | Kč/ks | SPOJOVACÍ MATERIÁL | SPOJOVACÍ MATERIÁL | Materiál ve stávající sekci | materiál | jisté |
| `C.spojovaci.zavitTyc` | Závitové tyče M12 | Kč/ks | SPOJOVACÍ MATERIÁL | SPOJOVACÍ MATERIÁL | Materiál ve stávající sekci | materiál | jisté |
| `C.spojovaci.chemKotva` | Chemické kotvy | Kč/ks | SPOJOVACÍ MATERIÁL | SPOJOVACÍ MATERIÁL | Materiál ve stávající sekci | materiál | jisté |
| `C.lak.rezim` | Počítat dle ceníku | — | LAKOVÁNÍ | LAKOVÁNÍ | Beze změny (režie, parametry) | přepínač ceníku lakovny | jisté |
| `C.lak.lakovnaProfilBm` | Lakovna – profily | Kč/bm | LAKOVÁNÍ | LAKOVÁNÍ | Smíšené / služby | subdodávka lakovny (práce + barva) – nerozdělovat | jisté |
| `C.lak.lakovnaListaBm` | Lakovna – lišty | Kč/bm | LAKOVÁNÍ | LAKOVÁNÍ | Smíšené / služby | subdodávka lakovny (práce + barva) – nerozdělovat | jisté |
| `C.lak.lakovnaM2` | Lakovna – plechy/oplechování/terče | Kč/m² | LAKOVÁNÍ | LAKOVÁNÍ | Smíšené / služby | subdodávka lakovny (práce + barva) – nerozdělovat | jisté |
| `C.lak.tomasProfilM2` | Lakovna B – profily | Kč/m² | LAKOVÁNÍ | LAKOVÁNÍ | Smíšené / služby | subdodávka lakovny (práce + barva) – nerozdělovat | jisté |
| `C.lak.tomasListaBm` | Lakovna B – lišty | Kč/bm | LAKOVÁNÍ | LAKOVÁNÍ | Smíšené / služby | subdodávka lakovny (práce + barva) – nerozdělovat | jisté |
| `C.lak.tomasPlechKs` | Lakovna B – konstrukční plechy | Kč/ks | LAKOVÁNÍ | LAKOVÁNÍ | Smíšené / služby | subdodávka lakovny (práce + barva) – nerozdělovat | jisté |
| `C.lak.tomasOplechM2` | Lakovna B – oplechování | Kč/m² | LAKOVÁNÍ | LAKOVÁNÍ | Smíšené / služby | subdodávka lakovny (práce + barva) – nerozdělovat | jisté |
| `C.lak.tomasTercKs` | Lakovna B – terče | Kč/ks | LAKOVÁNÍ | LAKOVÁNÍ | Smíšené / služby | subdodávka lakovny (práce + barva) – nerozdělovat | jisté |
| `C.priplatky.vsgFolieM2` | Sklo VSG s mléčnou fólií (příplatek) | Kč/m² | PŘÍPLATKOVÉ POLOŽKY | PŘÍPLATKOVÉ POLOŽKY | Materiál ve stávající sekci | materiál – sklo (příplatek) | jisté |
| `C.priplatky.sknM2` | Sklo SKN 176 (Ug=1,1) (EXT) | Kč/m² | PŘÍPLATKOVÉ POLOŽKY | PŘÍPLATKOVÉ POLOŽKY | Materiál ve stávající sekci | materiál – sklo (příplatek) | jisté |
| `C.priplatky.medStrechaM2` | Střecha venkovní šachty v mědi (příplatek) | Kč/m² | PŘÍPLATKOVÉ POLOŽKY | PŘÍPLATKOVÉ POLOŽKY | Materiál ve stávající sekci | materiál – měděná střecha (příplatek) | ověřit u J. V. (je v ceně i klempířská práce?) |
| `C.priplatky.ventilatorKc` | Ventilátor (ext) | Kč/ks | PŘÍPLATKOVÉ POLOŽKY | PŘÍPLATKOVÉ POLOŽKY | Materiál ve stávající sekci | materiál – ventilátor | ověřit u J. V. (zahrnuje osazení?) |
| `C.priplatky.zabranyDvereKc` | Zábrany do dveřních vstupů | Kč/ks | PŘÍPLATKOVÉ POLOŽKY | PŘÍPLATKOVÉ POLOŽKY | Materiál ve stávající sekci | materiál – zábrany | ověřit u J. V. (zahrnuje osazení?) |
| `C.priplatky.madlaBmKc` | Madla – tvrdé dřevo, čirý lak | Kč/bm | PŘÍPLATKOVÉ POLOŽKY | PŘÍPLATKOVÉ POLOŽKY | Materiál ve stávající sekci | materiál – madla (bm) | ověřit u J. V. (zahrnuje osazení?) |
| `C.priplatky.montazDveriKc` | Montáž šachetních dveří (ruční položka) | Kč/ks | PŘÍPLATKOVÉ POLOŽKY | MONTÁŽ A PRÁCE | Montáž a práce | práce – montáž šachetních dveří (ruční položka) | jisté |
| `C.priplatky.prechMontKc` | Přechodové plechy – montáž | Kč/ks | PŘÍPLATKOVÉ POLOŽKY | MONTÁŽ A PRÁCE | Montáž a práce | práce – montáž přechodových plechů | jisté |
| `C.priplatky.leseniHlavaKc` | Lešení – dokončení hlavy šachty | Kč/m | PŘÍPLATKOVÉ POLOŽKY | DODÁVKY S MONTÁŽÍ A SLUŽBY | Smíšené / služby | subdodávka – nástavba lešení | jisté |
| `C.priplatky.zabranyPadKc` | Zábrany proti pádu do šachty | Kč | PŘÍPLATKOVÉ POLOŽKY | DODÁVKY S MONTÁŽÍ A SLUŽBY | Smíšené / služby | za akci – dodávka vč. montáže, cena dle nabídky dodavatele | ověřit u J. V. |
| `C.priplatky.demontazOhrazeniKc` | Demontáž stávajícího ohrazení | Kč | PŘÍPLATKOVÉ POLOŽKY | DODÁVKY S MONTÁŽÍ A SLUŽBY | Smíšené / služby | za akci – demontáž, odvoz a likvidace (text nabídky) | jisté |
| `C.priplatky.malbaSchodnicKc` | Malba schodnic | Kč | PŘÍPLATKOVÉ POLOŽKY | DODÁVKY S MONTÁŽÍ A SLUŽBY | Smíšené / služby | za akci – práce + barva | ověřit u J. V. (naši lidé, nebo malíř?) |
| `C.priplatky.naterOhrazeniKc` | Nátěr celého ohrazení | Kč | PŘÍPLATKOVÉ POLOŽKY | DODÁVKY S MONTÁŽÍ A SLUŽBY | Smíšené / služby | za akci – práce + barva | ověřit u J. V. (naši lidé, nebo malíř?) |
| `C.priplatky.naterOkopovychKc` | Nátěr pouze okopových plechů | Kč | PŘÍPLATKOVÉ POLOŽKY | DODÁVKY S MONTÁŽÍ A SLUŽBY | Smíšené / služby | za akci – práce + barva | ověřit u J. V. (naši lidé, nebo malíř?) |
| `C.priplatky.prosklenaStenaKc` | Prosklená stěna vedle šachty | Kč | PŘÍPLATKOVÉ POLOŽKY | DODÁVKY S MONTÁŽÍ A SLUŽBY | Smíšené / služby | za akci – subdodávka vč. montáže, cena dle nabídky | jisté |
| `C.priplatky.demontazVytahuKc` | Demontáž stávajícího výtahu | Kč | PŘÍPLATKOVÉ POLOŽKY | DODÁVKY S MONTÁŽÍ A SLUŽBY | Smíšené / služby | za akci – demontáž, odvoz a likvidace výtahu | jisté |
| `C.priplatky.destovySvodKc` | Dešťový svod | Kč | PŘÍPLATKOVÉ POLOŽKY | DODÁVKY S MONTÁŽÍ A SLUŽBY | Smíšené / služby | za akci – materiál + klempířská práce | ověřit u J. V. |
| `C.dphZakladni` | DPH základní | % | SAZBY DPH | SAZBY DPH | Beze změny (režie, parametry) | parametr | jisté |
| `C.dphSnizena` | DPH snížená | % | SAZBY DPH | SAZBY DPH | Beze změny (režie, parametry) | parametr | jisté |
| `C.dphNulova` | DPH nulová (bez DPH) | % | SAZBY DPH | SAZBY DPH | Beze změny (režie, parametry) | parametr | jisté |
| `C.kurzEurKc` | Kurz EUR | Kč/EUR | CIZÍ MĚNA | CIZÍ MĚNA | Beze změny (režie, parametry) | parametr – kurz | jisté |

**PROJ (jen pro úplnost, přeuspořádání se jich netýká):**

| Kód | Název | Jednotka | Skupina | Co je v ceně |
|---|---|---|---|---|
| `PC.sazby.projektant` | Sazba – projektant | Kč/hod | HODINOVÉ SAZBY (ZAMĚŘENÍ / STUDIE / DPZ / DPS) | interní práce (hodinová sazba) |
| `PC.sazby.statik` | Sazba – statik | Kč/hod | HODINOVÉ SAZBY (ZAMĚŘENÍ / STUDIE / DPZ / DPS) | interní práce (hodinová sazba) |
| `PC.sazby.zamereni` | Sazba – zaměření | Kč/hod | HODINOVÉ SAZBY (ZAMĚŘENÍ / STUDIE / DPZ / DPS) | interní práce (hodinová sazba) |
| `PC.fixy.pamatkari` | Památkáři | Kč | PROJEDNÁNÍ STUDIE | subdodávka / poplatek (fixní částka) |
| `PC.fixy.uzemniRozvoj` | Územní rozvoj | Kč | PROJEDNÁNÍ STUDIE | subdodávka / poplatek (fixní částka) |
| `PC.fixy.pbr` | PBŘ (požárně bezpečnostní řešení) | Kč | DPZ – DOKUMENTACE PRO POVOLENÍ ZÁMĚRU | subdodávka / poplatek (fixní částka) |
| `PC.fixy.studieOsvitu` | Studie osvitu (Praha 4 a 6) | Kč | DPZ – DOKUMENTACE PRO POVOLENÍ ZÁMĚRU | subdodávka / poplatek (fixní částka) |
| `PC.fixy.elektroDpz` | Elektro projekt (DPZ) | Kč | DPZ – DOKUMENTACE PRO POVOLENÍ ZÁMĚRU | subdodávka / poplatek (fixní částka) |
| `PC.fixy.ic` | Inženýrská činnost | Kč | IČ – INŽENÝRSKÁ ČINNOST | subdodávka / poplatek (fixní částka) |
| `PC.fixy.elektroDps` | Elektro projekt (DPS) | Kč | DPS – DOKUMENTACE PRO PROVEDENÍ STAVBY | subdodávka / poplatek (fixní částka) |
| `PC.fixy.ezc` | Ekonomická zadávací část | Kč | EZC – EKONOMICKÁ ZADÁVACÍ ČÁST | subdodávka / poplatek (fixní částka) |
| `PC.fixy.kolaudace` | Kolaudace | Kč | KOLAUDACE A GEODET | subdodávka / poplatek (fixní částka) |
| `PC.fixy.geodet` | Geodetické zaměření | Kč | KOLAUDACE A GEODET | subdodávka / poplatek (fixní částka) |
| `PC.dopravaKmKc` | Doprava – sazba za km | Kč/km | DOPRAVA | služba – doprava |
| `PC.dopravaHodKc` | Cesta mimo Prahu – hodina cesty | Kč/h | DOPRAVA | služba – doprava |
| `PC.vyjezdTechnikKc` | Akce mimo Prahu – 1 výjezd technika | Kč | DOPRAVA | služba – doprava |

## 2. Kde skupiny ceníku hrají roli

| Místo | Soubor | Závisí na skupině? | Co se přesunem stane / co upravit |
|---|---|---|---|
| Výpočet OCK (kalkulace, nabídka, techspec) | `src/engine.js`, `src/nabidka.js` | **ne** — čte ceník podle cesty `C.…`; sekce kalkulace jsou vlastní | nic |
| Data ceníku, zakázky, verze | `DEFAULT_CENIK`, `cenikGet/Set` | **ne** — vnořené objekty `C.spojovaci.*`, `C.lak.*`, `C.priplatky.*` podle kódu | nic; přesun `C.priplatky.x` do jiné skupiny cestu nemění |
| Záložka Ceník OCK — vykreslení | `src/ui/cenik_ui.js` `cenikRows` | ano, jen pořadí a nadpis skupiny | automaticky podle `CENIK_DEF` |
| **Párování trvalých položek (ATYP a další)** | `src/ui/cenik_ui.js` `CENIK_GRP_SEKCE` ← `src/katalog.js` `KATALOG_SEKCE_NAZEV` | **ano — podle názvu skupiny** | stávající názvy nechat; nové skupiny nemají sekci katalogu (bez „+ přidat“) — v pořádku. Doporučeno nahradit odvození z názvu pevnou mapou skupina → sekce katalogu (S) |
| Matice zobrazení / práva | `src/zobrazeni.js`, `nastaveni_ui.js` | **ne** — prvky `tab.cenik`, `cenik.zverejnit`, `cenik.import`… | nic. Kdyby měl někdo vidět jen sazby práce, šlo by o nový prvek matice (mimo #525) |
| Příznak „cena dle nabídky“ | `src/cenik.js` `cenikDleNabidkySmi` | **ne** — podle kódu `C.priplatky.*` | zaškrtávátko zůstane i u příplatku v nové sekci; v příručce kap. 17 opravit větu „jen u položek sekce příplatků“ |
| Zahraniční ceník, „jen zahr.“ | `src/cenik_rady.js`, `CENIK_JEN_ZAHR` | **ne** — podle kódu | nic |
| Export do Excelu | `src/cenik.js` `cenikSheetRows` | sloupec **Kategorie** = název skupiny, pořadí řádků | změní se text a pořadí — žádná chyba |
| Import z Excelu | `src/cenik.js` `cenikDiffZeSheets` | **ne** — čte sloupce Klíč a Hodnota | staré exporty jdou importovat beze změny |
| Zveřejnění, otisk, porovnání verzí | `src/program.js`, `src/cenik_stari.js` | **ne** pro data; `skupina` se jen vypisuje (odvozená z aktuální `CENIK_DEF`) | starší verze se v historii ukážou pod novými názvy skupin; otisk beze změny → přesun nevyžaduje zveřejnění |
| Stáří ceníku | `src/ui/cenik_stari_ui.js` | jen popisek „skupina · OCK“ | automaticky |
| Controlling (mapování, export předkalkulace) | `src/controlling.js` | mapování **podle kódu**; `ctrlPopisKlice` vrací `sekce` = skupina (jen zobrazení) | nic; u rozdělených položek mapovat nové kódy (test úplnosti to vynutí) |
| Server (Netlify) | `netlify/*` | **ne** — `CENIK_DEF` nepoužívá | nic |
| Slovníky EN/DE/FR | `src/preklad.js`, `src/slovnik.js` | **ne** — záložka Ceník je jen česky, názvy skupin se nepřekládají | nic; u rozdělení nové řádky kalkulace/nabídky přeložit |
| Příručka a snímky | `manual/obsah.json`, `manual/snimky_auto.mjs` | snímek ceníku není (obchodník záložku nevidí) | kap. 17 (věta o sekci příplatků), krátká zmínka v novinkách pro administrátora |
| Testy | viz níž | 2 místa se skupinou | upravit (viz níž) |

**Testy, které přesun ovlivní:**

- `src/test_controlling.js:248` — očekává `sekce: 'HRUBÁ OCK'` u `C.transportKc`; transport jde do Dodávek
  a služeb → upravit očekávání.
- `overit_cenik_barvy.mjs:142` — bere `CENIK_DEF[0][0]` jako skupinu s trvalými položkami; pokud by nová
  sekce stála první, neměla by sekci katalogu → přepsat na `'HRUBÁ OCK'` (nebo nové skupiny nedávat první).
- Beze změny projdou: `test_cenik_uplnost.js` (každá `cenaPath` má řádek), `test_atyp_katalog.js`,
  `test_cenik_barvy.js`, `test_cenik_xlsx.js`, `test_cenik_stari.js`, `test_program.js`, mutace a fuzz
  (přesun nemění chování).

## 3. Návrh

### 3.1 Cílové skupiny ceníku OCK (pořadí)

1. **HRUBÁ OCK** — jen materiál (profily, montážní nosník, lemování, plechy, větrací mřížka, můstek –
   materiál vč. zábradlí, referenční šířka můstku, výchozí kg oplechování).
2. **ATYP – PRVKY A PRÁCE NAVÍC** — beze změny (parametry ATYP, trvalé atyp položky; název nutný kvůli
   párování).
3. **OPLÁŠTĚNÍ** — jen materiál (skla a jejich typy, Cetris, plastové kotvy).
4. **VOLITELNÉ POLOŽKY** — jen materiál (přechodové plechy nerez, háky).
5. **SPOJOVACÍ MATERIÁL** — beze změny.
6. **PŘÍPLATKOVÉ POLOŽKY** — jen materiál (skla, měď, ventilátor, zábrany do dveří, madla).
7. **MONTÁŽ A PRÁCE** *(nová)* — montáž na stavbě, výchozí hodiny montáže a oplechování, oplechování –
   práce, zámečník (spodní rám, čílka, nýtování), práce opláštění, úpravy zábradlí, čištění, montáž
   šachetních dveří, přechodové plechy – montáž, montáž můstků (4 buňky z #354).
8. **LAKOVÁNÍ** — beze změny (subdodávka lakovny; práce + barva se nedělí).
9. **DODÁVKY S MONTÁŽÍ A SLUŽBY** *(nová)* — smíšené a subdodávky: zastřešení, oplechování k fasádě,
   sokl, tmelení, stříška, lešení (vnitřní, vnější, fix, hlava), interní transport, cestovní náklady,
   položky „za akci“ (zábrany proti pádu, demontáže, nátěry, malba, prosklená stěna, dešťový svod).
10. **REŽIE** — práce kanceláře: zaměření, výstup, engineering, dílenská dokumentace, statika,
    stavbyvedoucí, režie kanceláře, překlady, výchozí hodiny projekce.
11. **SAZBY DPH**, 12. **CIZÍ MĚNA** — beze změny.

Příplatky přesunuté do nových sekcí (montáž dveří, montáž přechodových plechů, lešení – hlava, položky
„za akci“) zůstávají **v kalkulaci příplatky** — v ceníku dostanou do poznámky „v kalkulaci mezi
příplatky“, ať admin ví, kde je hledat.

### 3.2 Smíšené položky — rozdělit, nebo nechat jako službu

| Položka | Doporučení | Nové buňky při rozdělení |
|---|---|---|
| `C.tmeleniKc` Tmelení – materiál + práce | **rozdělit**, až J. V. dodá hodnoty (controlling to chtěl, J6 odloženo) | `C.tmeleniKc` = materiál (Kč/m²) + `C.tmeleniPraceM2Kc` (Kč/m²) v Montáži a práci |
| `C.zastreseniM2Kc` Zastřešení | rozdělit **jen když montuje náš montážník**; jinak služba | `C.zastreseniPraceM2Kc` (Kč/m²) |
| `C.oplechFasadaBmKc`, `C.soklBmKc` | totéž (klempíř → služba) | `C.oplechFasadaPraceBmKc`, `C.soklPraceBmKc` (Kč/bm) |
| `C.priplatky.destovySvodKc`, `C.striskaDvurKc` | nechat jako službu (za akci / kus) | — |
| Lešení (`C.leseni*`, `C.priplatky.leseniHlavaKc`) | **nechat** — subdodávka vč. pronájmu, jedna faktura | — |
| Lakování (`C.lak.*`) | **nechat** — subdodávka lakovny | — |
| Transport, cestovní náklady | **nechat** — služba | — |
| Položky „za akci“ (demontáže, nátěry, malba, prosklená stěna, zábrany proti pádu) | **nechat** — cena dle nabídky dodavatele | — |

**Jak rozdělit bez rozbití starých zakázek (vzor #354):** kód stávající buňky zůstává a nově znamená
materiál; nová buňka nese práci. Výpočet pozná starý ceník podle toho, že novou buňku nemá — pak počítá
starou buňku jako dosud (smíšeně). Zamčené varianty se nepřepočítávají vůbec, rozpracované se po
zveřejnění nové verze přepočítají jako u každé změny ceníku. Kalkulace dostane dva řádky (… – materiál,
… – práce), nabídka zůstane jedním řádkem. Prázdná nová buňka = „položka bez ceny“ (prázdno není nula).

**Levnější varianta B (bez nových cen):** u smíšené položky jen **podíl práce v %** jako parametr
controllingu; ceník i kalkulace beze změny, export předkalkulace řádek rozdělí. Hodí se, když jde jen
o porovnání práce × materiál v controllingu, ne o samostatné sazby.

### 3.3 Pořadí kroků a pracnost

| Krok | Obsah | Pracnost |
|---|---|---|
| 0 | Počkat na sloučení #354 (oba upravují blok HRUBÁ OCK v `src/cenik.js` — jinak konflikt) | — |
| 1 | Přesun řádků v `CENIK_DEF` + 2 nové skupiny; poznámka u přesunutých příplatků; pevná mapa skupina → sekce katalogu místo odvození z názvu; úprava 2 testů; nový test skupin; příručka kap. 17 + novinky; CHANGELOG. Bez nové verze ceníku. | **S** |
| 2 | Buňky montáže můstků z #354 do Montáže a práce (pokud je #354 nezaloží rovnou tam) | **S** |
| 3 | Rozdělení tmelení (a dalších dle odpovědí): nové buňky, detekce starého ceníku, 2 řádky kalkulace, controlling mapování, překlady řádků, testy staré zakázky | **M** za položku |
| 4 | Varianta B místo kroku 3 (podíl práce v controllingu) | **M** celkem |

Celkem: fáze 1 **S** (cca půl dávky), s rozdělením tmelení **M**.

### 3.4 Rizika

- **Přejmenování stávající skupiny** rozbije párování trvalých položek (zmizí z ceníku). → Názvy nechat,
  nebo nejdřív zavést pevnou mapu (krok 1).
- **Konflikt s #354** ve stejném bloku `src/cenik.js`. → Dělat po sloučení #354.
- **Admin hledá příplatek v sekci Příplatky** a nenajde ho. → Poznámka u řádku, novinka v příručce.
- U rozdělení: **dvojí význam staré buňky** podle verze ceníku; controlling mapuje podle kódu a verzi
  nezná (stará zamčená varianta by smíšenou částku vykázala jako materiál). → Test na starou zakázku,
  v exportu předkalkulace u starého ceníku ponechat původní skupinu.
- U rozdělení: **nula v nové buňce** po zveřejnění bez hodnoty = práce zdarma. → Kontrola „položka bez
  ceny“ a červené probarvení už existují; zveřejnit až s hodnotou.

### 3.5 Testy

- Nový `src/test_cenik_skupiny.js`: množina kódů `CENIK_DEF` po přesunu = před přesunem (pevný seznam),
  každý kód právě jednou; žádný kód z druhu „práce“ mimo Montáž a práci a naopak; každá sekce katalogu má
  skupinu ceníku (trvalé položky mají kde být); `cenikOtisk` a `cenikRozdily` stejného ceníku před a po =
  beze změny; export → import Excelu = žádné změny.
- Pojistka proti prázdnému testu: test spustit před přesunem (selže na práci v Hrubé OCK) a po přesunu
  (projde); zapsat do commitu.
- Úpravy: `test_controlling.js:248`, `overit_cenik_barvy.mjs:142`; celé testovací kolo (`nastroje/testovaci_kolo.sh`,
  mutace po částech).
- U rozdělení navíc: vzorec, stará zakázka beze změny, zamčená varianta beze změny, controlling úplnost.

## 4. Otázky pro J. V. (s doporučenou odpovědí)

1. **Názvy nových sekcí „MONTÁŽ A PRÁCE“ a „DODÁVKY S MONTÁŽÍ A SLUŽBY“?** — doporučeno: Ano.
2. **Stávající sekce nepřejmenovávat (Hrubá OCK, Opláštění… jen bez práce)?** — doporučeno: Ano — název páruje trvalé položky; případný dovětek „– materiál“ až po zavedení pevné mapy.
3. **Smíšené položky: ve fázi 1 jen přesunout, rozdělit až s hodnotami?** — doporučeno: Ano. Rozdělit nejdřív tmelení (materiál Kč/m² + práce Kč/m²), hodnoty dodá J. V.
4. **Zastřešení, oplechování k fasádě, sokl, dešťový svod, stříška: montuje náš montážník, nebo klempíř/dodavatel za jednu cenu?** — doporučeno: Pokud dodavatel → služba bez rozdělení; pokud naši lidé → rozdělit jako tmelení.
5. **Větrací mřížka, háky, ventilátor, madla, zábrany do dveří: obsahuje cena osazení?** — doporučeno: Ne — materiál; osazení je v hodinách montáže na stavbě.
6. **Zámečník (spodní rám, čílka, nýtování): jen práce, nebo i materiál?** — doporučeno: Jen práce (materiál je v profilech a spojovacím materiálu) → Montáž a práce.
7. **Stavbyvedoucí: nechat v Režii, nebo do Montáže a práce?** — doporučeno: Nechat v Režii (řízení zakázky), controlling ho má dál ve „stavebních pracích“ podle kódu.
8. **Čištění a úpravy zábradlí: dělají naši lidé?** — doporučeno: Ano → Montáž a práce.
9. **Lakování nechat samostatnou sekcí (subdodávka)?** — doporučeno: Ano.
10. **Kalkulace a cenová nabídka beze změny — přeuspořádá se jen záložka Ceník?** — doporučeno: Ano.
11. **Pořadí sekcí: materiál → Montáž a práce → Lakování → Dodávky a služby → Režie → DPH → měna?** — doporučeno: Ano.
12. **Montážní nosník: kupuje se, nebo zapůjčuje?** — doporučeno: Materiál (koupě), v Hrubé OCK.
13. **Příplatky „práce“ (montáž dveří, montáž přechodových plechů, demontáže, nátěry) přesunout do nových sekcí s poznámkou „v kalkulaci mezi příplatky“?** — doporučeno: Ano.
14. **Sekci ATYP nechat celou (vč. zámečníka atyp a procent)?** — doporučeno: Ano.
15. **Rozdělení novými cenami (vzor #354), nebo jen podíl práce v % pro controlling (varianta B)?** — doporučeno: Novými cenami jen u tmelení; jinde varianta B až na žádost controllingu.
