# Pipedrive — nová pole dealu od integrátora × kalkulátor (rozbor)

**6. 10. 2026.** Rozbor návrhu integrátora `Pipedrive_nova_pole_dealu.xlsx`
(54 nových polí dealu + 4 úpravy stávajících polí) proti tomu, co zná
kalkulátor.

**Stav: jen rozbor. Kód, Pipedrive ani soubor na Disku se neměnily.**
Navržená vyjádření jsou zapsaná jen v kopii tabulky
(`Pipedrive_nova_pole_dealu_NAVRH_VYJADRENI_2026-10-06.xlsx`), odeslat ji
integrátorovi rozhodne J. V.

**Z čeho:**

- návrh integrátora: Google Disk, `Pipedrive_nova_pole_dealu.xlsx` (listy
  Legenda, Nová pole, Úpravy stávajících polí);
- kód (čistá kopie): `src/kryci.js` (`KRYCI_SEKCE`, `KRYCI_FAKTURACE`,
  `KRYCI_POKUTY`, `KRYCI_LIMIT_POKUT`, `KRYCI_DPH_SAZBY`, termín dodání + ATYP),
  `src/kryci_proj.js` (`KRYCI_PROJ_SEKCE`, pole `stary`/`plan`),
  `src/plan_plateb.js` (`PLAN_PROJ_MILNIKY`, předvolby, `planZpusobFakturace`),
  `src/sod.js`, `src/zakazka.js` (hlavička, tvar čísla nabídky),
  `src/firma.js`, `src/cenik_rady.js` (0 % DPH u zahraničí),
  `netlify/lib/pd_mapa.mjs`, `netlify/functions/pd_deal.mjs`;
- podklady: `podklady/NAVRH_PIPEDRIVE_ZAPIS_2026-09-22.md` (§5 tři vrstvy,
  §6 tok požadavku, §8 otázky A, G–L), roadmapa #16 a #113–#117.
  `PLAN_PIPEDRIVE*` v `podklady/` není;
- Pipedrive (jen čtení, `getAccountContext`): definice polí dealu, organizace
  a osoby a pipeline. Hodnoty dealů jsem nečetl.

**Stav účtu (6. 10. 2026):** jedna nástěnka „Obchod“ s pěti fázemi (beze
změny proti 22. 9.). Stávající vlastní pole dealu: Typ zakázky (Realizace /
Realizace - OCK AKU / Realizace - Zahraničí / Projekce - Výtah + OCK /
Projekce - Velké projekty), Předpokládané datum ukončení realizace, Adresa
realizace, Zdroj poptávky - Organizace / - Osoba, Podmínky a technická
specifikace zakázky, SM Poznámky, Priorita, Vygenerovat podklady k nabídce,
Odkaz na podklady k nabídce, Měsíční fakturace (ANO/NE), Splatnost faktur
(dny), **První / Druhá / Třetí splátka (%)**, Doba trvání záruky (počet
měsíců), Zádržné (Ne / 5 / 10 / 15 / 20 %), Smluvní pokuty den prodlení (%).
Osoba má mj. Datum narození, Pozice, Poštovní adresa; organizace IČ a Role.

**Souhrn vyjádření:** nová pole Schváleno 26 · Upravit 19 · Zamítnout 9; úpravy stávajících Schváleno 3 · Upravit 1 · Zamítnout 0; **celkem Schváleno 29 · Upravit 20 · Zamítnout 9** (z 58).

---

## 1) Tabulka polí

Sloupec *Kalkulátor plní* = jestli může hodnotu do dealu poslat kalkulátor
při zápisu řídící varianty (#115): **ano** / **částečně** (převod textu na
číslo nebo volbu, ne vždy jde) / **ne** (osoba, organizace: kalkulátor je jen
čte, viz §5.2 vrstva 2).

### 1a) Nová pole (54)

| # | Pole | Odkud ho kalkulátor zná | Sedí typ a volby? | Vyjádření | Komentář | Kalkulátor plní |
|---|---|---|---|---|---|---|
| 1 | Číslo nabídky (CN) | `cisloCN` (OCK i PROJ, bind `ZAK.cislo`, přípona varianty `.N` přes `cisloSVariantou`); `{{PODM_…}}` ne; dnes v titulku dealu (pd_mapa `pdCisloZNazvu`) | Typ ano. Formát ne úplně: aplikace píše „2026 - OPR - CN - 0290“ s mezerami a u varianty ≥ 2 s příponou „.2“. | **Upravit** | Text OK. Formát přesně podle aplikace (mezery, přípona varianty .2) – plní kalkulátor z řídící varianty; regulárním výrazem nekontrolovat. | ano |
| 2 | Nabídku vypracoval | `dodZpracoval` / `obchodnik` (přihlášený uživatel, `zpracovatel.js`; náhrada Nastavení → Firma) | Typ Uživatel: aplikace zná svého uživatele, ne ID uživatele Pipedrive. Podle §5.2 (nativní pole) je obchodník = vlastník dealu. | **Upravit** | Jen pokud se liší od vlastníka dealu. Kalkulátor potřebuje párování uživatel aplikace ↔ uživatel Pipedrive (e-mail). | částečně |
| 3 | Příplatky v nabídce | `priplatkyNabidka` (OCK, z výpočtu: „N – názvy“ / „bez příplatků“) | Ano (text). | **Schváleno** | OK – plní kalkulátor z nabídky OCK. | ano |
| 4 | Hlavní projektant | `hlavniProjektant` (PROJ, sekce Dodavatel, volný text „jméno, autorizace“) | Ne: aplikace má volný text, projektant nemusí mít účet v Pipedrive. | **Upravit** | Typ Text (nebo výběr), ne Uživatel – projektant nemusí mít licenci Pipedrive. Aplikace má volný text jméno + autorizace. | ano (jako text) |
| 5 | Odpovědná osoba za projekci | `odpovednyJmeno`, `odpovednyTel`, `odpovednyEmail` (PROJ, volný text) | Částečně: aplikace má jméno, telefon a e-mail jako text, ne uživatele. | **Upravit** | Uživatel jen pokud mají účet všichni projektanti; jinak Text. Aplikace drží jméno, tel. a e-mail zvlášť. | částečně |
| 6 | Kontakt – ve věcech smluvních | `zastSmluvniJmeno` / `…Pozice` / `…Tel` / `…Email` (bind `ZAK.zastupci.*`, OCK i PROJ) | Model ano (osoba s pozicí). Aplikace ale drží text, ne ID osoby. | **Schváleno** | OK jako osoba. Kalkulátor osoby nezakládá ani nemění (vrstva 2), umí je jen načíst pro předvyplnění. | ne (čtení ano) |
| 7 | Kontakt – ve věcech obchodních | `zastObchodniJmeno` / `…Tel` / `…Email` | Jako č. 6. | **Schváleno** | OK jako osoba; kalkulátor jen čte. | ne (čtení ano) |
| 8 | Kontakt – ve věcech technických | `zastTechnickyJmeno` / `…Tel` / `…Email` (nutný tel. NEBO e-mail, hlídá `kontroly.js`) | Jako č. 6. | **Schváleno** | OK jako osoba; kalkulátor jen čte. Chybí kontakt pro fakturaci (zastFakturyEmail/Tel). | ne (čtení ano) |
| 9 | Typ smlouvy | `typSmlouvy` (OCK i PROJ, radio `Naše bez úprav` / `Naše s úpravami` / `Cizí`, výchozí první); `{{PODM_TYP_SMLOUVY}}` | Typ ano, volba ne: aplikace „Cizí“, návrh „Smlouva zákazníka“. | **Upravit** | Sjednotit popisek 3. volby (aplikace „Cizí“ × návrh „Smlouva zákazníka“). Jinak OK, plní kalkulátor. | ano |
| 10 | Typ produktu / služby | `typProduktu` (OCK, odvozený z kalkulace: Exteriérová/Interiérová šachta, „… + projekce“, Projekce) | Volby neúplné: aplikace zná 5 hodnot. Překryv se stávajícím polem „Typ zakázky“. | **Upravit** | Volby: Exteriérová šachta / Interiérová šachta / Exteriérová šachta + projekce / Interiérová šachta + projekce / Projekce. Vyjasnit vztah k poli Typ zakázky. | ano |
| 11 | Typ projektu | `typProjektu` (OCK i PROJ, radio `Nový projekt (novostavba)` / `Rekonstrukce objektu`; výchozí OCK novostavba, PROJ rekonstrukce) | Ano, volby přesně sedí. OCK a PROJ mají každý svou hodnotu. | **Schváleno** | Volby sedí s aplikací. Přístavbu aplikace nezná – přidat jen na obou stranách současně. | ano |
| 12 | Objekt v památkové ochraně | `pamatkovaOchrana` (PROJ, radio `Ano` / `Ne` / `Zjišťuje se`) | Ne: chybí volba „Zjišťuje se“. | **Upravit** | Doplnit třetí volbu „Zjišťuje se“ (aplikace ji má). | ano |
| 13 | Licence k projektové dokumentaci | `autorskaPrava` (PROJ, volný text, výchozí „nevýhradní, pro účel stavby dle smlouvy“) | Částečně: aplikace má volný text, ne výběr. | **Upravit** | Volby OK, ale aplikace má volný text – buď pole Text, nebo aplikace přejde na výběr se stejnými 2 volbami (+ jiné znění). | částečně |
| 14 | Platnost nabídky (měsíce) | `platnostNabidky` (OCK i PROJ, celé sousloví „2 měsíce“ z Nastavení → Firma) | Částečně: aplikace drží text s jednotkou, číslo se z něj vyčte jen u měsíců. | **Schváleno** | OK v měsících. Kalkulátor vezme číslo z textu „2 měsíce“; jiné znění zůstane jen v poznámce. | částečně |
| 15 | Zádržné – po dobu záruky | `zadrzneZaruka` (Ano/Ne, výchozí Ne) + `zadrzneZarukaProc` (volné %) – jen OCK | Ne: aplikace dovolí libovolné %, návrh jen pevné stupně 5–20 %. | **Upravit** | Aplikace má Ano/Ne + volné %. Raději Číselné % (0 = bez zádržného), nebo doplnit volbu „jiné % (viz poznámka)“. | ano / částečně |
| 16 | Smluvní pokuta – prodlení splatnosti (% / den) | `pokutaSplatnost` (OCK i PROJ, výběr `KRYCI_POKUTY`: 0 / 0,05 % / den / 0,1 % / den + vlastní znění) | Ano (číslo z výběru). Vlastní znění nemusí jít převést. | **Schváleno** | OK. Kalkulátor převede výběr na číslo; vlastní znění zůstane v poznámce. Pozor: OCK a PROJ mají vlastní hodnotu. | ano |
| 17 | Limit smluvních pokut (%) | `pokutaLimit` (OCK i PROJ, výběr `KRYCI_LIMIT_POKUT`: „Uplatněn limit 10 %“ / „NEUPLATNĚN limit 10 %“) | Částečně: aplikace má dvě volby, ne číslo; „0 = bez limitu“ se plete s nulovým limitem. | **Upravit** | Raději Jedna možnost: Uplatněn 10 % / Neuplatněn (jako aplikace). „0 = bez limitu“ je dvojznačné. | ano |
| 18 | Platební podmínky – jiné | `pokutyJine` (OCK i PROJ, „Jiné“ v sekci Platební podmínky, textarea) | Ano. | **Schváleno** | OK – plní kalkulátor. | ano |
| 19 | Sazba DPH | `sazbaDph` (typ `dph`, `KRYCI_DPH_SAZBY` = 12/21 %, OCK → `C.dph`, PROJ → `PC.dph`) + `platceDph`; 0 % jen ze zahraničního ceníku | Částečně: 21/12 % sedí; 0 % PDP aplikace jako samostatnou volbu nemá; OCK a PROJ mají každý svou sazbu. | **Upravit** | Volby OK, ale OCK a PROJ mají v aplikaci každá vlastní sazbu – dvě pole, nebo pravidlo. 0 % PDP aplikace zná jen ze zahraničního ceníku. | částečně |
| 20 | Pojištění odpovědnosti projektanta | `pojisteni` (PROJ, volný text, výchozí „ANO – dle pojistné smlouvy zhotovitele“) | Částečně: volný text; výchozí znění odpovídá volbě „Ano – …“. | **Schváleno** | OK. Kalkulátor mapuje podle začátku textu (ANO/NE); jiné znění zůstane v poznámce. | částečně |
| 21 | Termín dodání OCK (týdny) | `terminDodani` (OCK, text z `terminDodaniOck` + ATYP `terminAtypTydny`, `kryciTerminDodani`); `{{PODM_TERMIN_DODANI}}` | Částečně: aplikace drží větu („12 týdnů od podpisu…“), první číslo už ATYP obsahuje. | **Schváleno** | OK – kalkulátor pošle první číslo z termínu (už včetně ATYP). Věta s datem nebo bez čísla se nepřevede. | částečně |
| 22 | ATYP | příznak varianty `Zv.atyp` (kontext krycího listu `c.atyp`) | Ano. Prodloužení „+4 týdny“ je nastavení firmy, ne pevné číslo. | **Schváleno** | OK – plní kalkulátor. Prodloužení (dnes 4 týdny) je nastavení firmy, nepsat ho natvrdo. | ano |
| 23 | Datum podpisu smlouvy | OCK `sodDatumPodpisu` (`{{SOD_DATUM_PODPISU}}`, předvyplněno DATEM TISKU); PROJ `terminZahajeni` („Zahájení prací (podpis smlouvy)“) | Typ ano. U OCK je předvyplněná hodnota datum tisku, ne skutečný podpis. | **Upravit** | Kalkulátor pošle jen ručně zadané datum (OCK předvyplňuje datum tisku, to není podpis). U PROJ = Zahájení prací. | částečně |
| 24 | Převzetí staveniště k montáži šachty | `terminPrevzeti` (OCK, date, `{{SOD_TERMIN_MONTAZ_OD}}`) | Ano. | **Schváleno** | OK – plní kalkulátor. | ano |
| 25 | Ukončení montáže šachty a předání montáži výtahu | `terminMontaz` (OCK, date, `{{SOD_TERMIN_PREDANI_K_MONTAZI}}`) | Ano. | **Schváleno** | OK – plní kalkulátor. Dalších 6 termínů OCK v návrhu chybí. | ano |
| 26 | Předání výstupů ze zaměření | `terminZamereni` (PROJ, date) | Ano. | **Schváleno** | OK – plní kalkulátor. | ano |
| 27 | Odevzdání studie proveditelnosti | `terminStudie` (PROJ, date) | Ano. | **Schváleno** | OK – plní kalkulátor. | ano |
| 28 | Odevzdání DPZ | `terminDpz` (PROJ, date) | Ano. | **Schváleno** | OK – plní kalkulátor. | ano |
| 29 | Předpoklad povolení záměru | `terminPovoleni` (PROJ, date) | Ano. | **Schváleno** | OK – plní kalkulátor. | ano |
| 30 | Odevzdání DPS | `terminDps` (PROJ, date) | Ano. | **Schváleno** | OK – plní kalkulátor. | ano |
| 31 | Jiné termíny | `terminJine` (OCK i PROJ, textarea) | Ano; u kombinované zakázky dvě hodnoty. | **Schváleno** | OK. U zakázky OCK+PROJ kalkulátor obě hodnoty spojí. | ano |
| 32 | Odchylky oproti smluvnímu standardu | `odchylky` (OCK, textarea) | Ano. | **Schváleno** | OK – plní kalkulátor. | ano |
| 33 | Zaměření strojovny | `zamereniStrojovna` (OCK, Ano/Ne, ODVOZENO z kalkulace – 3D sken) | Ano. | **Schváleno** | OK – odvozeno z kalkulace, plní kalkulátor. | ano |
| 34 | Situační fotografie | `situacniFoto` (OCK, volný text, výchozí „Ve složce“) | Částečně: aplikace má volný text. | **Schváleno** | Volby OK. Aplikace má zatím volný text – převedeme na výběr se stejnými volbami. | částečně |
| 35 | Dokumentace v rozsahu | `dsp` (Ano/Ne z PROJ DPZ) + `provadeciDok` (Ano/Ne z PROJ DPS), OCK, odvozeno | Ano (dva přepínače → vícevýběr). DSP = v aplikaci DPZ. | **Schváleno** | OK. Kalkulátor složí ze dvou přepínačů; prázdný výběr maže null, ne []. Zvážit popisek „DSP / DPZ“. | ano |
| 36 | Cena nezahrnuje | `cenaNezahrnuje` (OCK výchozí „dle CN“; PROJ textarea s výchozím textem) | Ano; OCK a PROJ mají každý svůj text. | **Schváleno** | OK. U zakázky OCK+PROJ kalkulátor oba texty spojí. | ano |
| 37 | Jiné dohodnuté činnosti | `rozsahJine` (PROJ, textarea) | Ano. | **Schváleno** | OK – plní kalkulátor. | ano |
| 38 | Platba 1 – po podpisu smlouvy | `sodpPlatba1` (`stary` – jen nabídky před plánem plateb), `{{SODP_PLATBA1_KC}}`; nově milník `podpis` v `PLAN_PROJ_MILNIKY`, `{{SODP_PLATEBNI_KALENDAR}}` | Ne: pevných 8 plateb neodpovídá plánu plateb (proměnný počet, další milníky ST, IČ podání, kolaudace, geodet). | **Zamítnout** | Aplikace má od etapy B plán plateb s proměnným počtem plateb (14 milníků, sčítání podle milníku); 8 pevných plateb jen u starých nabídek. Nahradit jedním textovým polem „Platební kalendář SoD PROJ“. | ne (text ano) |
| 39 | Platba 2 – při předání 2D výstupů ze zaměření | `sodpPlatba2` (`stary` – jen nabídky před plánem plateb), `{{SODP_PLATBA2_KC}}`; nově milník `za_vystupy` v `PLAN_PROJ_MILNIKY`, `{{SODP_PLATEBNI_KALENDAR}}` | Ne: pevných 8 plateb neodpovídá plánu plateb (proměnný počet, další milníky ST, IČ podání, kolaudace, geodet). | **Zamítnout** | Viz č. 38 – nahradit jedním textovým polem s platebním kalendářem z plánu plateb. | ne (text ano) |
| 40 | Platba 3 – DPZ pro podání na dotčené orgány | `sodpPlatba3` (`stary` – jen nabídky před plánem plateb), `{{SODP_PLATBA3_KC}}`; nově milník `dpz_doss` v `PLAN_PROJ_MILNIKY`, `{{SODP_PLATEBNI_KALENDAR}}` | Ne: pevných 8 plateb neodpovídá plánu plateb (proměnný počet, další milníky ST, IČ podání, kolaudace, geodet). | **Zamítnout** | Viz č. 38 – nahradit jedním textovým polem s platebním kalendářem z plánu plateb. | ne (text ano) |
| 41 | Platba 4 – DPZ pro podání na stavební úřad | `sodpPlatba4` (`stary` – jen nabídky před plánem plateb), `{{SODP_PLATBA4_KC}}`; nově milník `dpz_su` v `PLAN_PROJ_MILNIKY`, `{{SODP_PLATEBNI_KALENDAR}}` | Ne: pevných 8 plateb neodpovídá plánu plateb (proměnný počet, další milníky ST, IČ podání, kolaudace, geodet). | **Zamítnout** | Viz č. 38 – nahradit jedním textovým polem s platebním kalendářem z plánu plateb. | ne (text ano) |
| 42 | Platba 5 – po vydání pravomocného povolení záměru | `sodpPlatba5` (`stary` – jen nabídky před plánem plateb), `{{SODP_PLATBA5_KC}}`; nově milník `ic_povoleni` v `PLAN_PROJ_MILNIKY`, `{{SODP_PLATEBNI_KALENDAR}}` | Ne: pevných 8 plateb neodpovídá plánu plateb (proměnný počet, další milníky ST, IČ podání, kolaudace, geodet). | **Zamítnout** | Viz č. 38 – nahradit jedním textovým polem s platebním kalendářem z plánu plateb. | ne (text ano) |
| 43 | Platba 6 – po předání kompletní DPS | `sodpPlatba6` (`stary` – jen nabídky před plánem plateb), `{{SODP_PLATBA6_KC}}`; nově milník `dps_predani` v `PLAN_PROJ_MILNIKY`, `{{SODP_PLATEBNI_KALENDAR}}` | Ne: pevných 8 plateb neodpovídá plánu plateb (proměnný počet, další milníky ST, IČ podání, kolaudace, geodet). | **Zamítnout** | Viz č. 38 – nahradit jedním textovým polem s platebním kalendářem z plánu plateb. | ne (text ano) |
| 44 | Platba 7 – po dokončení ekonomické zadávací části | `sodpPlatba7` (`stary` – jen nabídky před plánem plateb), `{{SODP_PLATBA7_KC}}`; nově milník `ezc_predani` v `PLAN_PROJ_MILNIKY`, `{{SODP_PLATEBNI_KALENDAR}}` | Ne: pevných 8 plateb neodpovídá plánu plateb (proměnný počet, další milníky ST, IČ podání, kolaudace, geodet). | **Zamítnout** | Viz č. 38 – nahradit jedním textovým polem s platebním kalendářem z plánu plateb. | ne (text ano) |
| 45 | Platba 8 – po doporučení dodavatele realizace | `sodpPlatba8` (`stary` – jen nabídky před plánem plateb), `{{SODP_PLATBA8_KC}}`; nově milník `vyber` v `PLAN_PROJ_MILNIKY`, `{{SODP_PLATEBNI_KALENDAR}}` | Ne: pevných 8 plateb neodpovídá plánu plateb (proměnný počet, další milníky ST, IČ podání, kolaudace, geodet). | **Zamítnout** | Viz č. 38 – nahradit jedním textovým polem s platebním kalendářem z plánu plateb. | ne (text ano) |
| 46 | Správní poplatky stavebnímu úřadu (nad rámec ceny) | `sodpSpravniPoplatky` (PROJ, volný text, `{{SODP_SPRAVNI_POPLATKY}}`) | Částečně: aplikace má text, ne částku. | **Schváleno** | OK jako Měna. Aplikace má volný text – číslo převedeme, jiné znění zůstane v poznámce. | částečně |
| 47 | Pokuta za prodlení zákazníka se součinností (Kč / den) | PROJ `sodpPokutaDenni` (`{{SODP_POKUTA_DENNI}}`); OCK obdoba `sodPokutaDenni` (`{{SOD_POKUTA_DENNI}}`) | Typ ano; platí i pro OCK. | **Upravit** | Platí pro OCK + PROJ – aplikace má denní pokutu zákazníka i v SoD realizace (sodPokutaDenni). | ano |
| 48 | Podepisující firma (pokud jiná) | `objPodpisFirma` (OCK i PROJ, text, `{{OBJEDNATEL_PODPIS_FIRMA}}`) | Částečně: aplikace drží text; navíc se název střetne s párováním polí (viz rozpory). | **Upravit** | Platí OCK + PROJ. Typ Organizace kalkulátor nevyplní (jen čte). Název pole nám předem potvrdit – koliduje s mapou polí. | ne (čtení ano) |
| 49 | Druhý podepisující za zákazníka | `objPodpis2Jmeno` + `objPodpis2Funkce` (OCK i PROJ, text) | Částečně: aplikace drží text; platí i OCK. | **Upravit** | Platí OCK + PROJ (aplikace má i v SoD realizace). Osobu kalkulátor jen čte. | ne (čtení ano) |
| 50 | Faktury v kopii na (1) | `objKopie1` (OCK i PROJ, text, `{{OBJEDNATEL_KONTAKT_KOPIE1}}`) | Ano; platí i OCK. | **Upravit** | Platí OCK + PROJ (aplikace má i v SoD realizace). Jinak OK. | ano |
| 51 | Faktury v kopii na (2) | `objKopie2` (OCK i PROJ, text, `{{OBJEDNATEL_KONTAKT_KOPIE2}}`) | Ano; platí i OCK. | **Upravit** | Platí OCK + PROJ. Jinak OK. | ano |
| 52 | Zmocnitel (plná moc) | `pmZmocnitel` + `pmZmocnitelNarozen` + `pmZmocnitelBytem` (PROJ, `{{PM_ZMOCNITEL…}}`) | Částečně: text; datum narození a bydliště jsou osobní údaje. | **Zamítnout** | Plná moc je dokument – údaje (datum narození, bydliště) nekopírovat do CRM; zůstanou v kalkulátoru a v příloze. | ne |
| 53 | Informováno Backoffice | `podpisInformovanBo` (OCK i PROJ, TEXT „kdo z BO byl informován“) | Ne: aplikace drží kdo, návrh datum. | **Upravit** | Aplikace drží KDO (text), návrh DATUM. Datum může doplnit automatizace při zápisu; „kdo“ zůstává v krycím listu. | částečně |
| 54 | Informováno Technické odd. | `podpisInformovanTech` (OCK i PROJ, TEXT) | Jako č. 53. | **Upravit** | Jako č. 53 – datum automatizací, „kdo“ v krycím listu. | částečně |

### 1b) Úpravy stávajících polí (4)

| # | Pole / úprava | Odkud ho kalkulátor zná | Sedí typ a volby? | Vyjádření | Komentář | Kalkulátor plní |
|---|---|---|---|---|---|---|
| 1 | Měsíční fakturace → „Způsob fakturace“ | OCK `zpusobFakturace` výběr `KRYCI_FAKTURACE` = `Po milnících` / `Měsíční` (starý výchozí „Náš standard / měsíční“ se čte jako Po milnících); PROJ odvozeno z plánu plateb (`planZpusobFakturace`, předvolby Standard po činnostech / Záloha + zbytek po předání / 100 % po dokončení stupně / Vlastní) | Ne: „Náš standard“ aplikace nezná (P10.5 ho zrušil), u PROJ rozhoduje předvolba plánu plateb. | **Upravit** | Volby: Po milnících / Měsíční / Po dokončení stupňů dokumentace (PROJ). „Náš standard“ aplikace od 29. 9. nemá. Převod: ANO→Měsíční, NE→Po milnících. | ano |
| 2 | Zádržné → „Zádržné – do odstranění VaN“ | `zadrzne` (Ano/Ne, výchozí Ano) + `zadrzneProc` (volné %) – OCK | Název ano; volby jen pevné stupně, aplikace volné %. | **Schváleno** | Přejmenování OK. Nestandardní % (mimo 5–20) zůstane v poznámce; bez vyplněného % kalkulátor pole nepošle. | ano / částečně |
| 3 | Smluvní pokuty den prodlení (%) → „Smluvní pokuta – prodlení dodávky / odevzdání (% / den)“ | OCK `pokutaDodavka`, PROJ `pokutaTermin` (výběr `KRYCI_POKUTY`) | Ano. | **Schváleno** | OK – OCK prodlení dodávky, PROJ prodlení s odevzdáním. Nové názvy nám předem pošlete (párování polí podle názvu). | ano |
| 4 | Předpokládané datum ukončení realizace – ověřit význam | `terminPredani` „Konečné předání díla“ (OCK, `{{SOD_TERMIN_DOKONCENI}}`); dnes ho čte `pd_mapa` jako `terminPlneni` | Ano (datum). | **Schváleno** | Ano, odpovídá „Konečné předání díla“ (OCK). Kalkulátor přepíše jen vyplněným datem. | ano |

### 1c) Podrobnosti k porovnání, o které šlo v zadání

| oblast | aplikace | návrh integrátora | závěr |
|---|---|---|---|
| typ smlouvy | `Naše bez úprav` / `Naše s úpravami` / `Cizí` (OCK i PROJ) | … / `Smlouva zákazníka` | jen popisek třetí volby, sjednotit |
| zádržné | dva řádky: do odstranění VaN (Ano/Ne + volné %, výchozí Ano bez %), po dobu záruky (Ano/Ne + volné %, výchozí Ne); jen OCK | dvě pole „Jedna možnost“ Ne / 5–20 % | pevné stupně nepojmou libovolné % a výchozí „Ano“ bez procenta nejde převést; doporučuji Číselné % |
| sazba DPH | 12 / 21 % (`KRYCI_DPH_SAZBY`), zvlášť OCK (`C.dph`) a PROJ (`PC.dph`); 0 % jen ze zahraničního ceníku; navíc `platceDph` Ano/Ne | 21 / 12 / 0 % PDP, jedno pole OCK + PROJ | volby OK, ale jedno pole na dvě sazby nestačí u kombinované zakázky; „PDP“ aplikace jako volbu nezná |
| způsob fakturace | OCK `KRYCI_FAKTURACE` = Po milnících / Měsíční (P10.5, 29. 9.); PROJ odvozeno z předvolby plánu plateb (4 předvolby) | Náš standard / Měsíční / Po dokončení stupňů dokumentace | „Náš standard“ už neexistuje (čte se jako Po milnících) |
| termín dodání + ATYP | text „N týdnů …“ z Nastavení → Firma, ATYP přičte `terminAtypTydny` (dnes 4) k prvnímu číslu; holé číslo dostane jednotku | číslo v týdnech (vč. ATYP) + ATYP Ano/Ne | sedí; kalkulátor pošle první číslo, ATYP z varianty |
| platnost nabídky | text s jednotkou („2 měsíce“) z Nastavení → Firma, OCK i PROJ | číslo v měsících | sedí, dokud firma píše měsíce |
| smluvní pokuty | výběr 0 / 0,05 % / den / 0,1 % / den + vlastní znění; limit = Uplatněn / NEUPLATNĚN limit 10 % | čísla; limit „10, 0 = bez limitu“ | pokuty OK; limit raději jako dvě volby, 0 je dvojznačná |
| licence | volný text, výchozí „nevýhradní, pro účel stavby dle smlouvy“ | výběr Nevýhradní / Výhradní | volby OK, aplikace musí přejít na výběr, nebo pole Text |
| pojištění | volný text, výchozí „ANO – dle pojistné smlouvy zhotovitele“ | výběr Ano – … / Ne | OK, mapovat podle začátku textu |
| splátky SoD PROJ | od etapy B **plán plateb**: pro každou činnost splátky „procento + milník“ (14 milníků, až 10 splátek na činnost), platby se stejným milníkem se sčítají, počet plateb je proměnný; do SoD jde `{{SODP_PLATEBNI_KALENDAR}}`; 8 pevných polí `sodpPlatba1–8` jen u nabídek odeslaných před plánem | 8 pevných polí Měna podle staré šablony | nesedí – zamítnout, nahradit textovým platebním kalendářem |

---

## 2) Co aplikace nemá (návrh počítá s něčím, co kalkulátor nezná)

1. **Odkazy na entity Pipedrive.** Pole typu Uživatel (#2, #4, #5), Osoba
   (#6–#8, #49, #52) a Organizace (#48) — aplikace drží jména, telefony
   a e-maily jako text v `ZAK.zastupci.*` a podobně, ne ID z Pipedrive.
   Zapisovat je neumí a podle §5.2 (vrstva 2) ani nemá; umí je jen **číst**
   a předvyplnit z nich hlavičku (#113).
2. **Párování uživatelů.** Aplikace zná přihlášeného uživatele, ne jeho ID
   v Pipedrive — #2 by potřeboval párování (např. podle e-mailu).
3. **Samostatnou volbu 0 % – přenesená daňová povinnost.** 0 % vzniká jen
   u zahraničního ceníku (`cenik_rady.js`), v krycím listu je výběr 12/21 %.
4. **Pevné stupně zádržného** (5–20 %) — aplikace má libovolné procento.
5. **Osm pevných plateb SoD PROJ** — aplikace je od etapy B nahradila
   plánem plateb; staré pole zůstávají jen pro starší odeslané nabídky.
6. **Datum „Informováno BO / Tech.“** — aplikace drží, *kdo* byl informován
   (text), ne datum.
7. **Výběry tam, kde má aplikace volný text:** licence (#13), pojištění
   (#20), situační fotografie (#34), správní poplatky jako částka (#46),
   platnost nabídky jako číslo (#14). Převod jde u výchozích znění, ne vždy.
8. **Nástěnky OCK a PROJ.** Legenda říká „pole budou zobrazena pouze
   v příslušné nástěnce“ — v účtu je jen jedna nástěnka „Obchod“
   a aplikace má **jednu zakázku s oběma částmi** (OCK i PROJ) a jednu vazbu
   na deal (plán `ZAK.pdDealId`).
9. **Jednu hodnotu pro OCK i PROJ.** Typ projektu, sazba DPH, pokuty, limit,
   cena nezahrnuje, jiné termíny, typ smlouvy a platnost mají v aplikaci
   **dvě nezávislé hodnoty** (krycí list OCK a PROJ). Pole „OCK + PROJ“ je na
   dealu jedno — u kombinované zakázky musí být pravidlo, která vyhraje.
10. **Produkty v Pipedrive** (činnosti PROJ jako produkty, list Legenda) —
    kalkulátor s produkty dealu nepracuje a připojený konektor nemá ani právo
    číst produkty (`products:read`).

**Opačně — co aplikace má a návrh ne** (ke zvážení, ne vše musí být pole):

- **služební pole z §5.2:** druh kalkulace (OCK / PROJ / OCK+PROJ), řídící
  varianta, kalkulace zapsána (datum) a hlavně **Stav kalkulace**
  (Zadáno / Vyřizuje se / Vyřízeno) — bez něj nefunguje tok požadavku
  z §6.2 (otázka G);
- šest termínů OCK: podklady dodavatele výtahu, stavební připravenost, konec
  montáže OK, opláštění od / do, osazení šachetních dveří zákazníkem
  (konečné předání řeší úprava #4);
- místo plnění — druh stavby (`sodMistoPlneni`), denní pokuta zákazníka
  v SoD realizace (`sodPokutaDenni`, viz #47), plátce DPH (`platceDph`);
- plán plateb PROJ: předvolba (Standard po činnostech / Záloha + zbytek po
  předání / 100 % po dokončení stupně / Vlastní) a záloha %;
- kontakt pro fakturaci (`zastFakturyEmail`, `zastFakturyTel`);
- PROJ: předmět, počet oceněných činností, činnosti mimo nabídku
  (`predmet`, `ocenenoCinnosti`, `mimoNabidku`) — integrátor je chce řešit
  produkty.

---

## 3) Rozpory s §5 návrhu z 22. 9. 2026

1. **Rozsah.** §5.2 počítal s ~10 novými poli (vrstva 1) a celým krycím
   listem BO jako poznámkou + přílohou (vrstva 3). Integrátor navrhuje
   **54 nových polí** — vrací se tím k problému, kvůli kterému §5.1 sto
   dvanáct polí odmítl: na deal jde i to, co je podklad pro dokument
   (splátky, podpisy, plná moc). Otázka H (potvrzení tří vrstev) je stále
   otevřená a tenhle návrh je fakticky odpověď „víc do vrstvy 1“.
2. **Chybí služební pole** z §5.2 (druh kalkulace, řídící varianta,
   kalkulace zapsána, stav požadavku). Tok požadavek → kalkulace → zápis
   z §6.2 a webhook z §3.8 stojí na poli **Stav kalkulace** (otázka G).
3. **Stávající pole splátek.** §5.2 předpokládal pole „záloha“ a „dílčí
   faktura“ a že konečná faktura v CRM pole nemá (`pdZbytekDoSta`). Účet má
   ve skutečnosti **První / Druhá / Třetí splátka (%)** — třetí splátka tedy
   pole má. Mapa polí (`pd_mapa.mjs`) první a druhou splátku dnes vůbec
   nespáruje (vzory hledají „záloh“ a „dílčí … 2“) — vedlejší nález pro #114.
4. **Termín.** §5.2 chtěl `terminDodani` (OCK) a `terminDps` (PROJ) psát do
   stávajícího datumového pole. Návrh integrátora je přesnější: termín
   dodání jako číslo týdnů (#21), Odevzdání DPS samostatně (#30) a stávající
   pole = Konečné předání díla (úprava #4). §5.2 je v tomhle bodě přežitý.
5. **Typ produktu.** §5.2: „ověřit, jestli to není Typ zakázky“. Integrátor
   zakládá nové pole vedle stávajícího Typu zakázky → dvě pole s překryvem.
6. **Typ smlouvy:** §5.2 má „Cizí“ (shodně s aplikací), integrátor
   „Smlouva zákazníka“.
7. **Vrstva 2 (osoby, organizace):** integrátor ji modeluje správně jako
   odkazy na osoby a organizace (v souladu s §5.2 — údaje patří na kartu
   osoby / organizace), ale tím vznikají pole, která kalkulátor **nikdy
   nevyplní** (§7.2: vrstvu 2 nezapisujeme). Je to v pořádku, jen to musí
   vědět obě strany.
8. **Nástěnky.** §6.1 počítá s jedinou nástěnkou, legenda návrhu
   s nástěnkami OCK a PROJ. Nové nástěnky by změnily trychtýř, ID fází
   (otázka I) a vazbu zakázka ↔ deal (kombinovaná zakázka = dva dealy?).
9. **Párování polí podle názvu se rozbije** (ověřeno spuštěním
   `pdMapaZPoli` z `pd_mapa.mjs` nad stávajícími + navrženými názvy):

   | klíč mapy | dnes | po návrhu | správně |
   |---|---|---|---|
   | `zarukaMesicu` | Doba trvání záruky (počet měsíců) | **Zádržné – po dobu záruky** | Doba trvání záruky |
   | `pokutaProcDen` | Smluvní pokuty den prodlení (%) | **Limit smluvních pokut (%)** | prodlení dodávky / odevzdání |
   | `objednatelFirma` | (nespárováno) | **Podepisující firma (pokud jiná)** | — (`pd_deal.mjs` by z ní bral objednatele) |

   Vzory berou nejkratší název, který vyhoví. **Než integrátor pole založí
   nebo přejmenuje, musí se upravit mapa** (#114) — jinak by čtení dealu
   (`/api/pd/deal`) tiše plnilo krycí list ze špatných polí.
10. **Produkty místo polí pro činnosti PROJ** — v §5 vůbec nebylo. Je to
    nová práce (`deal-products` v2, právo k produktům) a pozor na **Hodnotu
    dealu**: když ji Pipedrive počítá z produktů, střetne se se zápisem
    `value` z kalkulace (§3.4, §5.2).

---

## 4) Doporučení pro integrátora

1. **Vyjasnit nástěnky** — dnes je jen „Obchod“. Buď zůstane jedna
   a viditelnost polí se řeší jinak (např. podle Typu zakázky), nebo vzniknou
   nástěnky OCK a PROJ — pak říct, jak se kombinovaná zakázka (OCK + PROJ)
   promítne do dealů (jeden, nebo dva).
2. **Doplnit služební pole** pro napojení kalkulátoru: *Stav kalkulace*
   (Zadáno / Vyřizuje se / Vyřízeno), *Řídící varianta* (text),
   *Kalkulace zapsána* (datum), *Druh kalkulace* (OCK / PROJ / OCK+PROJ).
3. **Splátky SoD PROJ (#38–#45) nezakládat.** Místo nich jedno pole
   Velký text „Platební kalendář SoD PROJ“ (kalkulátor ho vyplní ze svého
   plánu plateb), případně výběr „Plán plateb PROJ – předvolba“ se čtyřmi
   volbami a číslo „Záloha PROJ (%)“.
4. **Sjednotit volby s aplikací:** typ smlouvy (popisek třetí volby), typ
   produktu (5 hodnot podle aplikace), památková ochrana (+ „Zjišťuje se“),
   způsob fakturace (Po milnících / Měsíční / Po dokončení stupňů
   dokumentace — bez „Náš standard“), limit pokut jako dvě volby.
5. **Zádržné (obě pole) jako číslo v %** (0 = bez zádržného), nebo
   k pevným stupňům přidat „jiné % (viz poznámka)“.
6. **Sazba DPH:** buď dvě pole (OCK a PROJ), nebo potvrdit, že deal nese
   vždy jen jednu část. Obdobně u ostatních polí „OCK + PROJ“ dohodnout,
   která hodnota platí u kombinované zakázky.
7. **Pole typu Uživatel (#2, #4, #5)** jen tam, kde mají všichni dotčení
   účet v Pipedrive; hlavní projektant může být externí → Text.
8. **Pole #47–#51 (pokuta zákazníka, podpisy, kopie faktur) platí i pro
   OCK** — aplikace je má i ve smlouvě realizace.
9. **Osobní údaje zmocnitele (#52)** do CRM nepřenášet; plná moc zůstane
   dokumentem (příloha dealu).
10. **Před založením nebo přejmenováním polí poslat finální seznam názvů
    a API klíčů** — kalkulátor páruje pole podle názvu a tři navržené názvy
    by se dnes spárovaly špatně (§3 bod 9). Bez úpravy mapy nic
    nepřejmenovávat.
11. **Produkty pro činnosti PROJ** jen po dohodě, jak se počítá Hodnota
    dealu (z produktů, nebo zápisem z kalkulátoru) — ne obojí.
12. Typ **Více možností (#35)**: vymazání jen `null`, ne prázdným seznamem
    (§3.4) — pro automatizace na straně integrátora.

---

## 5) Otevřené otázky pro J. V. (s výchozí odpovědí)

| | otázka | výchozí odpověď, pokud neřekneš jinak |
|---|---|---|
| P1 | Rozsah polí: 54 od integrátora, nebo ~10 podle §5.2 (otázka H)? | **Střed:** pole, která kalkulátor plní a podle kterých Back Office filtruje (tabulka: 29 schváleno + 20 upravit); dokumentové údaje (splátky, plná moc) zůstávají v poznámce a příloze |
| P2 | Nástěnky OCK a PROJ, nebo jedna? Jeden deal na zakázku? | **Jedna nástěnka, jeden deal na zakázku** (i kombinovanou); pole se ukazují podle Typu zakázky |
| P3 | Pole „OCK + PROJ“ s rozdílnými hodnotami v obou krycích listech | u kombinované zakázky **platí krycí list OCK**, hodnota PROJ jde do poznámky; **sazba DPH dvě pole** |
| P4 | Typ smlouvy: „Cizí“, nebo „Smlouva zákazníka“? | **„Smlouva zákazníka“** — popisek se v aplikaci změní (s převodem uložených hodnot) |
| P5 | Splátky SoD PROJ (8 polí) | **Zamítnout**, nahradit textovým platebním kalendářem |
| P6 | Datum narození a bydliště zmocnitele do CRM? | **Ne** |
| P7 | „Předpokládané datum ukončení realizace“ = Konečné předání díla? | **Ano** |
| P8 | Stav kalkulace a služební pole (otázka G) — chtít je po integrátorovi teď? | **Ano**, v téže dávce |
| P9 | Typ produktu vedle stávajícího Typu zakázky | **Obě pole** — Typ zakázky obchodní kategorie (ručně), Typ produktu plní kalkulátor |
| P10 | Zádržné: pevné stupně, nebo číslo %? | **Číslo %** |
| P11 | Informováno BO / Tech.: datum, nebo kdo? | **Datum v Pipedrive** (automatizace), „kdo“ zůstává v krycím listu |
| P12 | Odeslat vyjádření integrátorovi v podobě vyplněné kopie tabulky? | **Ano**, po tvé kontrole |

---

## 6) Co z toho plyne pro roadmapu (bez zápisu)

- **#114** (mapa polí): opravit vzory `zarukaMesicu`, `pokutaProcDen`,
  `objednatelFirma` a doplnit páry pro První / Druhá / Třetí splátka (%)
  **dřív, než integrátor pole založí** — jinak čtení dealu plní krycí list
  ze špatných polí.
- **#115** (zápis): převody text → číslo / volba (platnost, termín dodání,
  pokuty, limit, zádržné, licence, pojištění, situační fotografie) a pravidlo
  pro kombinovanou zakázku; datum podpisu jen ručně zadané.
- **Odpovědi P4, P10 a #13/#34** můžou znamenat drobné změny krycích listů
  (výběr místo textu) — každá je samostatná položka, ne součást rozboru.

*Roadmapa ani kód se tímto rozborem neměnily.*
