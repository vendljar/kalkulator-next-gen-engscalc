# Revize rozdílu dávky PD2 (#782 — pole krycího listu do Pipedrive, vady CN)

Poradce Fable, 25. 11. 2026. Větev `claude/pd2-pole-kl`, HEAD 5ddb428, základ 5c42ca16.
Do revidované větve nic necommitováno.

## Verdikt: SLOUČIT (po PP), s poznámkami N1–N6; dvě věci potvrdí J. V.

Ověřeno v odděleném pracovním stromu: `netlify/test_pd2_pole` 60/0, `test_pd_prevod` 178/0,
`test_pv_597_zapis` 74/0, `test_pd_nanecisto` 92/0, `src/test_pd2_platby` 32/0,
`test_pd2_tisk_cn` 31/0, `test_pd2_md_nalezy` 4/0, `test_platby_ock` 77/0. Pojistky: po vrácení
`pd_prevod.mjs`, `pd_prodej.mjs`, `kryci.js` a `pd_nanecisto.js` na základ sady spadnou nebo
selžou. Kolo, porovnání sestavení a mutace jsem nepouštěl (převzato ze zprávy dávky).

## Splnění U1–U9 z revize návrhu

| Bod | Stav | Jak ověřeno |
|---|---|---|
| U1 jen do prázdného rozhoduje server, otisk / 409 | splněno | `pdJenPrazdneDuvod` čte deal načtený uvnitř výhradní sekce zápisu; dohledaná ID a datum jsou v PATCH a tím v otisku; testy „pole vyplněné mezi náhledem a zápisem → 409, žádný PATCH“ i varianta bez změny `update_time` |
| U2 přesná shoda, org_id | splněno | `fields=email` / `fields=name`, výsledek se znovu ověřuje (e-mail, jméno, organizace); testy s podvrženým kandidátem; deal bez organizace = nelze |
| U3 nic nezaložit | splněno | test: celý zápis prodeje jen GET a jediný PATCH `/deals/N`; u odeslání navíc stávající POST poznámky |
| U4 osobní údaje | splněno | důvody jsou pevné věty bez hledané hodnoty; protokol zakázky bez e-mailu a jména; nový log `pd_prodej` nese jen číslo dealu, akci, stav a počet polí |
| U5 časový rozpočet | splněno | hledání souběžně, lhůta 3 s, v rozpočtu 8 s požadavku; nedoběhlé = „nelze ověřit“, ostatní pole se zapíšou (test s visícím hledáním) |
| U6 „Jméno (Organizace)“, aktivní uživatel | splněno | `textOsoby`, filtr `active_flag` |
| U7 Platba 1–8 | splněno | částky ze snímku plánu zamčené varianty (test U7a), týž dopočet jako text kalendáře, nesedící součet / starý plán / EUR = nic, řádek „Mimo pole Platba 1–8“; U7e mazání podle rozhodnutí J. V. (PATCH `null`, řádek „vymaže se“) |
| U8 zrušený Způsob fakturace PROJ | splněno čtením kódu | odeslaná varianta čte hodnotu ze snímku krycího listu (`zmrazeno`); symbol `FIRMA_FAKTURACE_PROJ` není v žádné ze 17 šablon (ověřeno proti souborům z Disku); do Pipedrive se u PROJ „Způsob fakturace“ už neposílá — viz N2 |
| U9 snímek zpracovatele, #777 | splněno | ruční hodnota > snímek zámku > předvyplnění; zámek bez snímku = dřívější chování (test); „5.000“ a záporná částka = jen řádek „nelze“ |

## Dokumenty

- **Zlatá sada víc šachet** (`src/test_vs_zlata.json`): porovnal jsem starý a nový soubor —
  liší se jen otisky `ph-cz`, `ph-en`, `docx`, `sod` (316 scénářů); žádná jiná hodnota, tedy
  ceny ani výpočet se nezměnily.
- **Smlouva o dílo se nemění.** Otisk `sod` se změnil jen proto, že data smlouvy nesou i symbol
  nabídky `PODM_PLATEBNI_KALENDAR`. Šablony SoD realizace v6 (4 jazyky) ho nemají, používají
  `SOD_PLATEBNI_KALENDAR`, a ten se skládá jinou funkcí (`kryciSodPlatby`), které se V4 netýká.
- **Značka `pd2Tisk`.** V1, V2, V4 a #800 platí jen pro neodeslanou nabídku a pro nabídku
  odeslanou po PD2 (značka ve snímku podmínek). Stará odeslaná nabídka značku nemá a dotiskne
  se postaru; vlastnost v kalendáři je neviditelná, takže data starých nabídek zůstávají stejná.

## Potvrdí J. V.

- **J1 — znění V4 a překlady.** Nová česká věta konečné faktury („… bude vystaven N. konečný
  daňový doklad ve výši X % (bez DPH) …“) a její EN/DE/FR překlady jsou v kódu označené jako
  návrh. Je to text nabídky — před `main` potřebuje výslovné schválení J. V. (spolu s V3).
- **J2 — tabulka zmrazení krycího listu.** Dávka upravila `podklady/ZMRAZENI_KL_VOLBY_JV_22_10.json`
  (záznam voleb J. V.): nové pole KL PROJ „Jiné odchylky…“ je po odeslání editovatelné, stejně
  jako u OCK. Věcně souhlasím, ale je to jeho tabulka — prosím potvrdit a zapsat do ROZHODNUTI_LOG
  (stejně tak mazání Plateb U7e, pokud tam ještě není).

## Poznámky

- N1 Platba s částkou 0 (milník v plánu s 0 Kč) skončí řádkem „nelze — není kladná částka“
  a případná stará hodnota v Pipedrive se nevymaže. Okrajové; stačí brát nulu jako „milník chybí“.
- N2 U8 je doložené jen čtením kódu. Doplnit test: odeslaná stará nabídka PROJ + ve Firmě
  uložená vlastní věta → krycí list PROJ tiskne větu ze snímku, ne novou pevnou. Rozpracovaná
  (neodeslaná) nabídka se starým plánem větu změní — to je očekávané, patří do NOVINKY.
- N3 Seznam očekávaných rozdílů má vzory `*` pro `kryci-proj-bo` a `docx`. Zakryjí i jinou změnu
  v těchto výstupech; u příští dávky raději užší vzory.
- N4 Zbytkové riziko: mezi čtením dealu a PATCH uvnitř výhradní sekce může pole ručně vyplnit
  člověk přímo v Pipedrive (zlomek sekundy; Pipedrive podmíněný zápis nenabízí). Přijatelné.
- N5 Před zapnutím zápisu na ostrém účtu ověřit čtením (deal TEST), že `GET /api/v2/deals/N`
  vrací i prázdná pole typu osoba a organizace a v jakém tvaru vrací vyplněná. Chybějící klíč
  se bere jako prázdné pole — kdyby API vyplněné pole vynechalo, zapsalo by se do něj.
- N6 Zkušební sloučení s PP: konflikty jen v `CHANGELOG.md`, `netlify/mutace.mjs`
  a `roadmapa/roadmap.json`; zdrojové soubory (`sod_ui.js`, `kryci.js`, `kryci_proj.js`,
  `pd_nanecisto_ui.js`) se sloučí samy. Po sloučení pustit kolo znovu — PP mění tvar data
  v řádcích krycího listu (#804) a PD2 přidává do krycího listu PROJ pole, takže seznam
  očekávaných rozdílů se musí přepočítat proti nové integraci.
