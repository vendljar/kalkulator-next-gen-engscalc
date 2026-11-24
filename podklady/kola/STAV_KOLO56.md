# STAV kola 56 — vidí porovnání main × test všechny cenové a dokumentové rozdíly? (24. 11. 2026)

- **Sezení:** testovací (`kalkulator-testovani`), větev `claude/testovani-kolo56` nad `origin/test` 6722ad9 (v24.11.5)
- **Proti:** `origin/main` cda289e (v19.11.11); mezi nimi ~140 commitů (v21.11.1 – v24.11.5)
- **Zápis:** testengscalc ani ostrý web se v tomto kole **nepoužily** (vše lokálně nad sestavením main a test,
  serverové funkce nad úložištěm v paměti, simulátor Pipedrive). Pipedrive bez zápisu.
- **Bez cen a osobních údajů** — v textu jen pole, případy a počty.

## Souhrn

| | před kolem 56 | po rozšíření (K56-1) |
|---|---|---|
| main × test, pevná sada | **SHODA 367/367** | **387 rozdílných, 387 očekávaných, 0 neočekávaných** — JEN OČEKÁVANÉ ROZDÍLY |
| pojistka (mutace textu krycího listu `kryciHodinyText`) | SHODA (nevidí) | 87 rozdílů (`kryci-bo`, `kryci-proj-bo`) |
| test × test | SHODA | SHODA (147 bez fuzzu) |
| self-test nástroje `test_porovnej_sestaveni.sh` | 16/0 | 16/0 |
| #733 kalkulace z webhooku (prohlížeč, nový nástroj) | — | main = vada K53-N2, test = Nová zakázka |

**Doporučení „do main“: ANO, po doplnění** — sloučit tuto větev (rozšířený nástroj + seznam očekávaných
rozdílů) do integrace, aby se příští porovnání pouštělo už s ní; do main pak test **beze změny kódu aplikace**.
Žádný neočekávaný cenový ani dokumentový rozdíl se nenašel. Před zapnutím zápisu do Pipedrive na ostrém
(`PIPEDRIVE_ZAPIS`) zůstává ruční zkouška PV #597 na dealu TEST (sada ji nevidí). Ceny main × test ověřuje J. V.

## K56-I1 (informativní) — slepá místa staré sady

1. **Krycí list OCK:** `kryciData` se volala bez verze (`bo`/`techdata`) → 0 řádků v obou stranách; každá
   změna krycího listu byla neviditelná (nepřímo jen popisky v poli `pd`).
2. **PROJ:** výsledek, cena, symboly nabídky PROJ, krycí list PROJ, SoD projekce, plná moc a objednávka PROJ
   se nepočítaly vůbec.
3. **Kompletní náhled podkladů** (`nwBloky`, online náhled N7) se nepočítal.
4. **Cizí jazyky:** SoD EN/DE, specifikace EN a smyčka šachet Wordu (`sachtyWord`) chyběly; Word jen CZ.
5. **Scénáře:** žádná kalkulace s částkou lakovny (#666), snímkem zpracovatele (#665), výchozími názvy víc
   šachet (#648) ani slevou / prodejem PROJ (#683, D8).
6. Případ, který spadne stejnou chybou na obou stranách, se počítá jako shoda (zůstává; nová pole PROJ a
   objednávky mají proto vlastní scénáře se zamčenou variantou, aby nekončily chybou).

Rozšíření je svěřené rozhodnutí **K56-1** (`podklady/SVERENA_ROZHODNUTI.md`); návod
`podklady/POROVNANI_SESTAVENI.md` doplněn.

## Rozdíly main × test (rozšířená sada, rozebrané na surových výstupech)

| vzor | případů | pole | vysvětlení | stav |
|---|---|---|---|---|
| téměř vše | 345 + 21 + 7 | `nahled-np-cz/en` | NPT-N1 #690 (řádek SVĚTLÍKY U ŠACHETNÍCH DVEŘÍ vypuštěn), NPT-N3 #691 (EN nadpisy s dvojtečkou), PG-N1 | očekávané |
| `lak:*` | 10 | cena, řádky, vyp, vypZ, zámek, ctrl, pd, všechny dokumenty | LAK #666 — main částku z nabídky lakovny nezná a počítá z ceníku | očekávané |
| `vs:vychozi-nazvy` | 1 | `sod-en`, `sod-de`, `vs-word-en`, náhled EN | DS #648 — „Šachta N“ → „Shaft N / Schacht N“ | očekávané |
| `dotisk:se-snimkem-*` | 1 | ph CZ/EN, docx, SoD CZ/EN/DE, ph PROJ, SoD PROJ, objednávka PROJ, náhled | #665/#715 — zpracovatel ze snímku zámku | očekávané, viz K56-I2 |
| `proj:sleva-100`, `proj:prodana-sleva-100` | 2 | `kryci-proj-bo/-tech` | #683 — KL PROJ při slevě 100 % ukazuje činnost „ANO“ (podle ceny před slevou), u prodané i termíny D8 | očekávané |

Pravidlo `* nahled-np-cz,nahled-np-en` je hrubé (celé pole). Proto byly surové výstupy obou stran
prošlé řádek po řádku: všechny rozdíly náhledu podkladů jsou jen NPT-N1, NPT-N3, #648 a #665 (**K56-I3**,
návrh: příště otisk náhledu po blocích, aby šlo pravidlo zúžit).

## K56-I2 (informativní, pro J. V.) — #665 mění i smlouvy a objednávku PROJ

CHANGELOG u #665/#715 jmenuje jen nabídku (Word a online). Snímek zpracovatele ze zámku se ale propíše
i do **SoD realizace (CZ/EN/DE), SoD projekce** (`ZPRAC_*`, `FIRMA_ZPRACOVAL*`) a do **objednávky PROJ**
(„vystavil“). Vypadá to konzistentně (ZPRAC = zpracovatel nabídky), ale je to text smlouvy → potvrdit J. V.
Doporučení: ponechat (smlouva k odeslané nabídce nese stejného zpracovatele jako nabídka).

## #733 — kalkulace z webhooku Pipedrive (krok 3, lokálně)

Nástroj `nastroje/porovnani_pd_webhook.mjs` (nový, svěřené K56-1): skutečné serverové funkce stromu nad
úložištěm v paměti, simulátor Pipedrive, `dist/kalkulacka.html` stromu; zveřejní zkušební ceník, založí
Novou zakázku, pošle webhook, otevře kalkulaci odkazem (`?zakazka=`) se závodem z provozu.

| | main v19.11.11 | test v24.11.5 |
|---|---|---|
| webhook | 200, založeno | 200, založeno |
| marže OCK / PROJ po otevření | **0 / 0** (Nová zakázka má zveřejněnou) | = Nová zakázka |
| cena „dle nabídky“ (zábrany) | **0** | = Nová zakázka |
| cena nabídky OCK | **jiná než Nová zakázka** | = Nová zakázka |
| cenové symboly nabídky | **5 ze 14 jiných** (CENA_BEZ_DPH, …_SACHTA, CENA_PRED_SLEVOU, CENA_S_DPH, DPH_KC) | shodné (liší se jen NAZEV_AKCE z dealu) |
| zadání OCK, ceník a zadání PROJ | jiné | = Nová zakázka |
| otevřeno z odkazu | jen ke čtení | k úpravám (#728) |

Závěr: oprava #733/#728 v testu potvrzena; **main dnes vadu K53-N2 má** — kalkulace založené webhookem
na ostrém a už uložené člověkem oprava zpětně nezmění — doporučení: po nasazení je projít (marže 0).

## Pokrytí změn v19.11.11 → v24.11.5 (cena / text dokumentu / Pipedrive)

| změna (verze) | co mění | podmínka | pokrytí |
|---|---|---|---|
| LAK #666 (v22.11.8) | cena OCK, všechny dokumenty, controlling, pd | částka z nabídky lakovny na řádku LAKOVÁNÍ | **sada `lak:*`** (nové); serverová mez B112 jen `netlify/test_666_lakovani.mjs` |
| PD #733/#732/#728 (v23.11.5) | marže, ceny dle nabídky, cena, protokol | kalkulace z webhooku dealu | **`porovnani_pd_webhook.mjs`** (nové, mimo sadu) |
| PD #729 (v23.11.5) | Kontaktní osoba = jen jméno | kalkulace z webhooku | jen `netlify/test_pd_cerstva.mjs` — návrh: přidat do snímku nástroje #733 |
| PD „Nabídku vypracoval“ / „Odpovědná osoba za projekci“ (v23.11.5) | pole dealu | zápis do Pipedrive | jen serverové sady; ověřit na dealu TEST |
| PV #597 (v23.11.7) | hodnota dealu, pole KL v dealu | `PIPEDRIVE_ZAPIS=ano`, vazba potvrzena, Prodáno | **nepokryto sadou** (server skládá ze zakázky) — ruční zkouška na dealu TEST před zapnutím |
| #734 autor z webhooku (v23.11.7) | vlastník kalkulace (nepřímo kdo tiskne) | webhook | jen serverové sady |
| CN #727, RA #724 (v23.11.2–3) | číslo nabídky / PROJ (zábrany změn) | odeslaná / prodaná | UI + server; text dokumentu nemění |
| RA #726, #723 | upozornění, oprávnění | — | bez dopadu na cenu a text |
| RJ #715 / #665 (v22.11.7, v22.11.1) | zpracovatel v nabídce, SoD, objednávce PROJ | dotisk odeslané kolegou | **sada `dotisk:*`** (nové), K56-I2 |
| RJ #704 (2) B232, BZ B231 (v22.11.3, v22.11.7) | který zámek / strana platí | zastaralá stránka, `jenProj/jenOck` po zámku | server (`test_bz_bezpecnost`, `test_rj_rozhodnuti`); sada jen pole `zamek` |
| JT #713 (v22.11.6) | jazyk hlavičky specifikace OCK | Jazyk tisku ≠ CZ | funkce `spec-en` v sadě; přepnutí z UI jen `overit_jt_jazyk_tisku.mjs` |
| VZD #673 (v22.11.1) | pd podklad z pohledu řídícího zákazníka | víc zákazníků | **nepokryto** — návrh scénáře `vz:ridici` |
| VZD #674 (v22.11.1) | plná moc (hlídač VZ), IČO s úvodní nulou | víc zákazníků / IČO 0… | pole `pm` (nové) bez VZ scénáře — návrh `vz:ico-nula` |
| VZD #683 / D8 | KL PROJ „nabízí“ | sleva PROJ 100 % | **sada `proj:*`** (nové) |
| DOS NPT-N1..N4, PG-N1 (v21.11.2–4) | Kompletní náhled podkladů | světlíky, EN, vlastní řádky | **pole `nahled-np-*`** (nové) |
| DO-N1 #680 | číselník návrhů | — | UI, bez dopadu na dokument |
| DS #648 (v21.11.3) | název šachty EN/DE v nabídce, SoD, Word | víc šachet, cizí jazyk | **sada `vs:*`, pole `sod-en/de`, `vs-word-*`** (nové) |
| OP1 #682 (v21.11.2) | Word CN EN/DE/FR — prázdný pruh sekce | Word v cizím jazyce | **nepokryto** (docx jen CZ) — návrh pole `docx-en` |
| OP1 D3-N1 (v21.11.2) | rozvržení Wordu objednávky PROJ | objednávka | data `obj-proj` ano, rozvržení ne — `test_objednavka_proj.js` |
| SB šablony CN v18 / PROJ v9 | text Wordu | zveřejněné šablony | mimo sadu (zkušební šablona) — plné kolo stupně 3 |
| SA B270–B272, NN, BZ B233–B236, K54-N1 #750 | validace, server, mazání | — | bez dopadu na cenu a text platné kalkulace |

## Návrhy (jen návrh, mimo svěřené)

1. **Krycí list a náhled** — hotovo v K56-1 (krycí list s verzí BO/techdata OCK i PROJ, Kompletní náhled
   podkladů CZ/EN). Online tisk v prohlížeči (N7, `nabidkaNahledSekce` z UI) pole `nahled-cz/en` pokrývá
   na úrovni dat; vykreslení zůstává harnessům `overit_*`.
2. Otisk `nahled-np` po blocích (K56-I3), aby pravidlo očekávaných rozdílů nemuselo krýt celé pole.
3. Scénáře `vz:ridici` (#673) a `vz:ico-nula` (#674), pole `docx-en` (#682).
4. Nástroj #733 doplnit o Kontaktní osobu (#729) a pustit ho v kole stupně 3 proti main i test.

## Úkoly

| úkol | stav |
|---|---|
| CHANGELOG v19.11.11 → v24.11.5: změny ceny / textu / Pipedrive s podmínkou | ✅ |
| Pokrytí pevnou sadou a návrh scénářů | ✅ |
| Nepokryté případy lokálně: LAK #666 (sada), #733 (prohlížeč) — main × test | ✅ |
| Rozšíření nástroje (krycí list, náhled, PROJ, jazyky) — svěřené K56-1 | ✅ |
| LAK přes UI a server na testengscalc | ⬜ (bez souhlasu se zápisem; serverovou mez hlídá sada) |
| PV #597 na dealu TEST | ⬜ (ruční zkouška před zapnutím zápisu) |
| Push větve | viz zpráva sezení |
