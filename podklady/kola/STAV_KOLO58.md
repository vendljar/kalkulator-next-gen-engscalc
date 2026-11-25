# STAV kola 58 — TESTOVÁNÍ 3: úplný krycí list a zápis do Pipedrive OCK + PROJ (v25.11.1, 25. 11. 2026)

Stav: **HOTOVO** — A i B prošly; 2 nové nálezy (K58-N1, K58-N2), bez dopadu na cenu.

## Hlavička

- Test v25.11.1 (`origin/test` 7144623). Main jen čtení (nic).
- Kdo: testovací sezení, větev `claude/testovani-3-po`. Navazuje na kolo 55 (STAV_KOLO55).
- **Souhlas J. V. v sezení 25. 11.:** A (CN-432, deal 432) i B (nová nabídka PROJ); pro PROJ J. V. zvolil **nový TEST deal**
  (deal 432 vede prodanou OCK a zápis jde jen do dealu, který zakázce patří).
- Smyšlené hodnoty „TEST K57 …“, kontakty `test.k57.*@priklad.cz`, telefony `+420 600 000 0xx`, IČO 99857014.
- Harness `scratchpad/h3/kl_a.js` (Playwright): pole KL podle definice (`KRYCI_SEKCE` / `KRYCI_PROJ_SEKCE`), prázdná
  doplní, dopočty aplikace nepřepisuje.

## A · CN-432 (OCK) — úplný KL a opakovaný zápis prodeje

**Jak aplikace dovolí zápis zopakovat (nic se neobchází):** prodaná zakázka má KL zamčený. (1) Beze změny dat:
karta prodeje → „Porovnat s Pipedrive znovu“ → tabulka → „Potvrdit a zapsat“. (2) Se změnou KL: „Odemknout prodej“
(jen vedoucí / administrátor, povinný důvod do historie) → úprava KL → Prodáno → tabulka „dnes / nově“ → zápis.

| bod | výsledek | poznámka |
|---|---|---|
| A0 | OK | Odemknout prodej (důvod „TEST K57 …“) → prodáno = ne |
| A1 | OK | KL: 101 polí; doplněno 30 + 15 (zástupci, banka, účet, zápis — vazba na hlavičku), dopočty aplikace ponechány |
| A2 | OK | Prodáno → náhled zápisu prodeje: 35 polí mapy — zapíše 31, nelze 1, prázdné 3, kolize 1 (fáze nejde zpět) |
| A3 | OK | zápis 200: „Prodej zapsán … Platební podmínky – jiné, Převzetí staveniště, Ukončení montáže, Jiné termíny, Odchylky, Pokuta za prodlení zákazníka“; druhé kolo „deal už měl všechny hodnoty“ |
| Pipedrive | OK | deal 432: fáze 26 beze změny (nevrací se), stav open, hodnota a CN beze změny, poznámka „Nabídka odeslána“ stále **jedna** (4 poznámky celkem, žádná nová), 1 soubor |

**Výpis polí mapy (deal, OCK):** zapsáno / shodné — Způsob fakturace, Splatnost, 1.–3. splátka, Záruka, Zádržné VaN
i po dobu záruky, Pokuty (dodávka, splatnost, limit), CN, Příplatky v nabídce, Typ smlouvy, Typ projektu, Platnost,
Platební podmínky – jiné, Sazba DPH, Termín dodání OCK, ATYP, Převzetí staveniště, Ukončení montáže, Jiné termíny,
Odchylky, Zaměření strojovny, Situační foto, Dokumentace v rozsahu, Cena nezahrnuje, Pokuta za prodlení zákazníka,
Hodnota dealu, Fáze. **Nezapsáno:** Nabídku vypracoval — *nelze* (K53-N3, převod uživatele); Datum podpisu smlouvy —
*prázdné* (bere se ze SoD, SoD OCK se netiskla); Faktury v kopii na (1)/(2) — *prázdné* (pole KL `objKopie*` je dopočet
z objednávky, harness ho nepřepisoval). **Mimo mapu** (KL je má, deal ne): termíny přípravy (podklady výtahu,
připravenost, opláštění, dveře…), kontakty zákazníka a zástupců (mapa je čte z CRM, nepíše), banka, atypy.

## B · nová nabídka PROJ na TEST deal 437

| bod | výsledek | poznámka |
|---|---|---|
| B0 | OK | nový deal 437 (TEST org, Typ zakázky = Projekce); automatizace Pipedrive název upravila na „CN-437 [TEST] MoveEr - V háji 29“ a doplnila CN |
| B0b | OK | „Vygenerovat nabídku“ = Ano → webhook za ~10 s založil `CN-437.json`: vazba webhook, strana PROJ, číslo PROJ CN-437 |
| B1 | OK | KL PROJ doplněn (59 polí; termíny PROJ jsou dopočet z lhůt po prodeji); první tisk PROJ: Word `NABIDKA_CN-437-PROJ-CZ`, karta Dnes / Nově (28 řádků) |
| B2 | OK* | zápis odeslání 200, Word přiložen; deal: fáze 22 → 23, hodnota, CN-437, právě 1 poznámka „Nabídka odeslána“ — **ale s číslem „2026 - OPR - CN -“** (K58-N1) |
| B3 | OK | dotisk PROJ nic nezapsal |
| B4 | OK | Prodáno PROJ → náhled (33 polí: zapíše 30, nelze 2, prázdné 1) → zápis 200: Datum podpisu, termíny PROJ (zaměření, studie, DPZ, povolení, DPS), Platební kalendář SoD PROJ (Velký text), Správní poplatky (K58-N2), Pokuta, Faktury v kopii, fáze 23 → 26; stav open, poznámky 2 (1 automatická Pipedrive + 1 naše), soubor 1 |

**Nezapsáno (PROJ):** Nabídku vypracoval a Odpovědná osoba za projekci — *nelze* (K53-N3; u odpovědné osoby byl
v KL smyšlený e-mail mimo uživatele Pipedrive — očekávané); Způsob fakturace — *prázdné* (KL PROJ ho nemá vyplněný).

## Nálezy

- **K58-N1** (střední, cena ne; text v CRM a evidence zámku): nabídka PROJ v kalkulaci založené webhookem
  (strana PROJ) má v zámku `cislo` = „2026 - OPR - CN - “ (předloha čísla OCK), ne CN-437. Důsledek: poznámka v dealu
  „Nabídka odeslána: 2026 - OPR - CN - …“, řádek varianty i značka, název přiloženého Wordu
  `CN_2026_-_OPR_-_CN_-_2026-11-25.docx`; Word sám má „Číslo nabídky: CN-437“ správně, pole CN v dealu taky.
  Příčina: `src/ui/zamek_ui.js` `zamekPoTisku` → `cislo: variantaCislo(ZAK, v)` bere číslo OCK hlavičky i pro typ
  `nabidkaProj`; `pd_odeslani.mjs` bere `cisloPapir` ze zámku. Doporučení: u zámků PROJ (`nabidkaProj*`, SoD projekce,
  objednávka PROJ) brát číslo z `projHlavicka` (s příponou varianty); test s pojistkou na kalkulaci PROJ z webhooku;
  zkontrolovat i controlling / export (číslo zámku).
- **K58-N2** (nízká–střední, cena ne; hodnota v CRM): převod částky do Pipedrive (`netlify/lib/pd_prevod.mjs`
  `mena()` → `jedno()`) vezme jediné číslo z libovolného textu: KL „Správní poplatky“ = „TEST K57 – Správní poplatky
  stavebnímu úřadu…“ se zapsalo jako **57 CZK**. Reálně: „dle sazebníku, cca 2 týdny“ → 2 CZK. Doporučení: částku
  přijmout jen jako číslo s nepovinnou měnou / „Kč“ (a „bez DPH“), jinak „nelze převést“ s důvodem; totéž ověřit
  u `cislo()` / `procento()`.
- Přetrvává **K53-N3** (Nabídku vypracoval / Odpovědná osoba — převod uživatele).

## Úklid / co zůstává

- CN-432: KL doplněn smyšlenými hodnotami, prodaná (2× odemčeno a znovu prodáno, důvod v historii).
- Deal 432: fáze 26, pole KL zapsaná (smyšlené hodnoty), 4 poznámky, 1 soubor.
- **Nový deal 437** „CN-437 [TEST] MoveEr - V háji 29“ (TEST org): fáze 26, hodnota, pole KL PROJ, 2 poznámky, 1 soubor;
  kalkulace `CN-437.json` (PROJ, odeslaná a prodaná). Smazat deal 437 / kalkulaci jen na pokyn J. V.

## C · Srovnávací tabulka kalkulačka × Pipedrive (J. V. 25. 11.) — jen čtení

Zdroj: mapa `netlify/lib/pd_mapa.mjs` (69 polí: 47 zápis, 11 čtení z CRM, 11 nepíše), efektivní hodnoty KL ze serverových
dat (jako náhled zápisu), deal čtený přes Pipedrive API po zápisu prodeje. „mimo mapu“ = pole dealu, které kalkulačka
nezná. Smyšlené hodnoty „TEST K57 …“.

**Body, na které se ptal J. V.:**

| pole | CN-432 / deal 432 (OCK) | CN-437 / deal 437 (PROJ) | závěr |
|---|---|---|---|
| Dokumentace v rozsahu | KL: DSP Ne, prováděcí Ne → deal „-“ | mapa nemá zdroj PROJ | **shoda** — „-“ = nic nevybráno; zapíše se, až bude v KL DSP / DPS = Ano |
| Smluvní pokuta – prodlení dodávky | KL „0“ (výchozí OCK) → deal 0 | KL 0 → deal 0 | **shoda** — v KL je opravdu 0; jiná hodnota se musí vybrat v KL |
| Faktury v kopii (1)/(2) | KL prázdné (dopočet z objednávky) | zapsáno | OK — OCK se zapíše po vyplnění v KL |
| Podepisující firma | směr **čtení** (z CRM do KL) | totéž | mapa nepíše — návrh: rozhodnout, zda psát |
| Druhý podepisující | směr **čtení** | totéž | mapa nepíše |
| Zmocnitel (plná moc) | směr **nic** | totéž | mapa nepíše (KL pole nemá) |
| Informováno BO / Tech | směr **nic** | totéž | mapa nepíše (KL „podpisInformovan*“ existuje) — návrh: doplnit do mapy |
| Datum podpisu smlouvy | KL „dnes“ jen do tisku SoD → **nezapsáno** | zapsáno (zahájení) | OCK se zapíše po tisku SoD (#366) + „Porovnat s Pipedrive znovu“ |
| Datum nabídky | pole v mapě **chybí** (#763, zatím v poznámce) | totéž | čeká na založení pole v Pipedrive |
| Typ smlouvy / Typ projektu | zapsáno | zapsáno | shoda |
| Platnost nabídky | zapsáno (2) | zapsáno (2) | shoda |
| CN | CN-432 | CN-437 | shoda (pozor K58-N1 — poznámka/soubor PROJ) |
| Nabídku vypracoval | **nelze** (K53-N3) | **nelze** (K53-N3) | vada převodu uživatele |
| Odpovědná osoba za projekci | — | **nelze** (smyšlený e-mail) | očekávané u TEST |
| Hodnota / fáze | zapsáno, fáze 26 | zapsáno, fáze 26 | shoda |

**Celá tabulka (všechna vlastní pole dealu):**

### Deal 432 × CN-432 (OCK)

| pole Pipedrive | klíč mapy | směr | hodnota v KL | hodnota v dealu | stav |
|---|---|---|---|---|---|
| Typ zakázky | typZakazky | cteni |  | Realizace | mapa jen čte z CRM |
| Předpokládané datum ukončení realizace | terminPlneni | cteni | 2026-11-30 | 2026-11-30 | mapa jen čte z CRM |
| Adresa realizace | adresaStavby | cteni |  | V háji 29 | mapa jen čte z CRM |
| Zdroj poptávky - Organizace | zdrojFirma | cteni |  |  | mapa jen čte z CRM |
| Zdroj poptávky - Osoba | zdrojOsoba | cteni |  |  | mapa jen čte z CRM |
| Podmínky a technická specifikace zakázky | — | — |  |  | mimo mapu |
| SM Poznámky | — | — |  |  | mimo mapu |
| Priorita | — | — |  |  | mimo mapu |
| Systémové pole - nemazat | — | — |  |  | mimo mapu |
| Odkaz na podklady k nabídce | — | — |  |  | mimo mapu |
| Způsob fakturace | zpusobFakturace | zapis | Po milnících | Náš standard | shoda / zapsáno |
| Splatnost faktur (dny) | splatnostDni | zapis | 14 | 14 | shoda / zapsáno |
| První splátka (%) | zaloha1Proc | zapis | 50 % – po podpisu smlouvy | 50 | shoda / zapsáno |
| Druhá splátka (%) | faktura2Proc | zapis | 40 % – po zahájení montáže | 40 | shoda / zapsáno |
| Třetí splátka (%) | fakturaKoncProc | zapis | 10 % – po předání | 10 | shoda / zapsáno |
| Doba trvání záruky (počet měsíců) | zarukaMesicu | zapis | 60 | 60 | shoda / zapsáno |
| Zádržné – do odstranění VaN | zadrzneProc | zapis | Ne /  | Ne | shoda / zapsáno |
| Smluvní pokuta – prodlení dodávky / odevzdání (% / den) | pokutaProcDen | zapis | 0 | 0 | shoda / zapsáno |
| Číslo nabídky (CN) | cisloNabidky | zapis | CN-432 | CN-432 | shoda / zapsáno |
| Nabídku vypracoval | nabidkuVypracoval | zapis | Claude AI, <e-mail> |  | nezapsáno – nelze: „Claude AI, <e-mail>" mezi uživateli Pipedrive není |
| Odpovědná osoba za projekci | odpovednaOsoba | zapis |  |  | mapa pro OCK nemá zdroj |
| Kontakt – ve věcech smluvních | kontaktSmluvni | cteni | TEST K57 Osoba Smluvni |  | mapa jen čte z CRM |
| Kontakt – ve věcech obchodních | kontaktObchodni | cteni | TEST K57 Osoba Obchodni |  | mapa jen čte z CRM |
| Kontakt – ve věcech technických | kontaktTechnicky | cteni | TEST K57 Osoba Technicky |  | mapa jen čte z CRM |
| Typ smlouvy | typSmlouvy | zapis | Naše bez úprav | Naše bez úprav | shoda / zapsáno |
| Typ projektu | typProjektu | zapis | Nový projekt (novostavba) | Nový projekt (novostavba) | shoda / zapsáno |
| Objekt v památkové ochraně | pamatkovaOchrana | zapis |  |  | mapa pro OCK nemá zdroj |
| Licence k projektové dokumentaci | licence | zapis |  |  | mapa pro OCK nemá zdroj |
| Platnost nabídky (měsíce) | platnostMesicu | zapis | 2 měsíce | 2 | shoda / zapsáno |
| Zádržné – po dobu záruky | zadrzneZaruka | zapis | Ne /  | Ne | shoda / zapsáno |
| Smluvní pokuta – prodlení splatnosti (% / den) | pokutaSplatnost | zapis | 0,05 % / den | 0.05 | shoda / zapsáno |
| Limit smluvních pokut (%) | pokutaLimit | zapis | Uplatněn limit 10 % | 10 | shoda / zapsáno |
| Platební podmínky – jiné | podminkyJine | zapis | TEST K57 – Jiné | TEST K57 – Jiné | shoda / zapsáno |
| Sazba DPH | sazbaDph | zapis | 12 % / přenesená daňová povinnost (tuzemsko) | 0 % – přenesená daňová povinnost | shoda / zapsáno |
| Pojištění odpovědnosti projektanta | pojisteni | zapis |  |  | mapa pro OCK nemá zdroj |
| Termín dodání OCK (týdny) | terminDodaniTydny | zapis | 26 týdnů | 26 | shoda / zapsáno |
| ATYP | atyp | zapis | (atyp – dopočet) | Ne | shoda / zapsáno |
| Datum podpisu smlouvy | datumPodpisu | zapis | 2026-11-25 |  | až po tisku SoD (do té doby jen „dnes“, #366) |
| Převzetí staveniště k montáži šachty | terminPrevzeti | zapis | 2027-02-22 | 2027-02-22 | shoda / zapsáno |
| Ukončení montáže šachty a předání montáži výtahu | terminMontaz | zapis | 2027-04-19 | 2027-04-19 | shoda / zapsáno |
| Předání výstupů ze zaměření | terminZamereni | zapis |  |  | mapa pro OCK nemá zdroj |
| Odevzdání studie proveditelnosti | terminStudie | zapis |  |  | mapa pro OCK nemá zdroj |
| Odevzdání DPZ | terminDpz | zapis |  |  | mapa pro OCK nemá zdroj |
| Předpoklad povolení záměru | terminPovoleni | zapis |  |  | mapa pro OCK nemá zdroj |
| Odevzdání DPS | terminDps | zapis |  |  | mapa pro OCK nemá zdroj |
| Jiné termíny | terminJine | zapis | TEST K57 – Jiné termíny | TEST K57 – Jiné termíny | shoda / zapsáno |
| Odchylky oproti smluvnímu standardu | odchylky | zapis | TEST K57 – Jiné odchylky oproti smluvnímu standardu | TEST K57 – Jiné odchylky oproti smluvnímu standardu | shoda / zapsáno |
| Zaměření strojovny | zamereniStrojovna | zapis | Ano | Ano | shoda / zapsáno |
| Situační fotografie | situacniFoto | zapis | Ve složce | Ve složce | shoda / zapsáno |
| Dokumentace v rozsahu | dokumentace | zapis | Ne / Ne |  | shoda (DSP = Ne a DPS = Ne → prázdný výběr = „-“) |
| Cena nezahrnuje | cenaNezahrnuje | zapis | dle CN | dle CN | shoda / zapsáno |
| Jiné dohodnuté činnosti | rozsahJine | zapis |  |  | mapa pro OCK nemá zdroj |
| Platba 1 – po podpisu smlouvy | platba1 | nic |  |  | mapa nepíše |
| Platba 2 – při předání 2D výstupů ze zaměření | platba2 | nic |  |  | mapa nepíše |
| Platba 3 – DPZ pro podání na dotčené orgány | platba3 | nic |  |  | mapa nepíše |
| Platba 4 – DPZ pro podání na stavební úřad | platba4 | nic |  |  | mapa nepíše |
| Platba 5 – po vydání pravomocného povolení záměru | platba5 | nic |  |  | mapa nepíše |
| Platba 6 – po předání kompletní DPS | platba6 | nic |  |  | mapa nepíše |
| Platba 7 – po dokončení ekonomické zadávací části | platba7 | nic |  |  | mapa nepíše |
| Platba 8 – po doporučení dodavatele realizace | platba8 | nic |  |  | mapa nepíše |
| Správní poplatky stavebnímu úřadu (nad rámec ceny) | spravniPoplatky | zapis |  |  | mapa pro OCK nemá zdroj |
| Pokuta za prodlení zákazníka se součinností (Kč / den) | pokutaSoucinnost | zapis | 1 000 Kč | 1000 CZK | shoda / zapsáno |
| Podepisující firma (pokud jiná) | podpisFirma | cteni | [TEST] MoveEr |  | mapa jen čte z CRM |
| Druhý podepisující za zákazníka | podpis2 | cteni |  |  | mapa jen čte z CRM |
| Faktury v kopii na (1) | kopie1 | zapis |  |  | KL prázdné (dopočet z objednávky, OCK nevyplněno) |
| Faktury v kopii na (2) | kopie2 | zapis |  |  | KL prázdné (dopočet z objednávky, OCK nevyplněno) |
| Zmocnitel (plná moc) | zmocnitel | nic |  |  | mapa nepíše |
| Informováno Backoffice | informovanoBo | nic |  |  | mapa nepíše |
| Informováno Technické odd. | informovanoTech | nic |  |  | mapa nepíše |
| Hlavní projektant | hlavniProjektant | zapis |  |  | mapa pro OCK nemá zdroj |
| Vygenerovat nabídku | vygenerovatNabidku | nic |  |  | mapa nepíše |
| Odkaz na kalkulaci | odkazKalkulace | nic |  | https://testengscalc.netlify.app/?zakazka=CN-432.json | mapa nepíše |
| Platební kalendář SoD PROJ | platebniKalendar | zapis |  |  | mapa pro OCK nemá zdroj |
| Systémové pole - filtr - nemazat | — | — |  | 432 | mimo mapu |
| Příplatky v nabídce | priplatkyNabidka | zapis | 1 – LEŠENÍ - vnější | 1 – LEŠENÍ - vnější | shoda / zapsáno |
| Role | — | — |  |  | mimo mapu |
| IČ | — | — |  |  | mimo mapu |
| DIČ | — | — |  |  | mimo mapu |
| Instant Messenger | — | — |  |  | mimo mapu |
| Poštovní adresa | — | — |  |  | mimo mapu |
| Poznámky | — | — |  |  | mimo mapu |
| Datum narození | — | — |  |  | mimo mapu |
| Pozice | — | — |  |  | mimo mapu |
| Titul před jménem | — | — |  |  | mimo mapu |
| Status | — | — |  |  | mimo mapu |

### Deal 437 × CN-437 (PROJ)

| pole Pipedrive | klíč mapy | směr | hodnota v KL | hodnota v dealu | stav |
|---|---|---|---|---|---|
| Typ zakázky | typZakazky | cteni |  | Projekce | mapa jen čte z CRM |
| Předpokládané datum ukončení realizace | terminPlneni | cteni |  | 2027-03-31 | mapa jen čte z CRM |
| Adresa realizace | adresaStavby | cteni |  | V háji 29 | mapa jen čte z CRM |
| Zdroj poptávky - Organizace | zdrojFirma | cteni |  |  | mapa jen čte z CRM |
| Zdroj poptávky - Osoba | zdrojOsoba | cteni |  |  | mapa jen čte z CRM |
| Podmínky a technická specifikace zakázky | — | — |  |  | mimo mapu |
| SM Poznámky | — | — |  |  | mimo mapu |
| Priorita | — | — |  |  | mimo mapu |
| Systémové pole - nemazat | — | — |  |  | mimo mapu |
| Odkaz na podklady k nabídce | — | — |  |  | mimo mapu |
| Způsob fakturace | zpusobFakturace | zapis | záloha 70 % po podpisu smlouvy, zbytek po předání jednotlivých stupňů  |  | pole starého plánu plateb — u nového plánu skryté, nahrazuje ho Platební kalendář (zapsán) |
| Splatnost faktur (dny) | splatnostDni | zapis | 14 | 14 | shoda / zapsáno |
| První splátka (%) | zaloha1Proc | zapis |  | 50 | mapa pro PROJ nemá zdroj |
| Druhá splátka (%) | faktura2Proc | zapis |  | 40 | mapa pro PROJ nemá zdroj |
| Třetí splátka (%) | fakturaKoncProc | zapis |  |  | mapa pro PROJ nemá zdroj |
| Doba trvání záruky (počet měsíců) | zarukaMesicu | zapis |  |  | mapa pro PROJ nemá zdroj |
| Zádržné – do odstranění VaN | zadrzneProc | zapis |  |  | mapa pro PROJ nemá zdroj |
| Smluvní pokuta – prodlení dodávky / odevzdání (% / den) | pokutaProcDen | zapis | 0 | 0 | shoda / zapsáno |
| Číslo nabídky (CN) | cisloNabidky | zapis | CN-437 | CN-437 | shoda / zapsáno |
| Nabídku vypracoval | nabidkuVypracoval | zapis | Claude AI, <e-mail> |  | nezapsáno – nelze: „Claude AI, <e-mail>" mezi uživateli Pipedrive není |
| Odpovědná osoba za projekci | odpovednaOsoba | zapis | <e-mail> |  | nezapsáno – nelze: „<e-mail>" mezi uživateli Pipedrive není |
| Kontakt – ve věcech smluvních | kontaktSmluvni | cteni | TEST K57 Osoba Smluvni |  | mapa jen čte z CRM |
| Kontakt – ve věcech obchodních | kontaktObchodni | cteni | TEST K57 Osoba Obchodni |  | mapa jen čte z CRM |
| Kontakt – ve věcech technických | kontaktTechnicky | cteni | TEST K57 Osoba Technicky |  | mapa jen čte z CRM |
| Typ smlouvy | typSmlouvy | zapis | Naše bez úprav | Naše bez úprav | shoda / zapsáno |
| Typ projektu | typProjektu | zapis | Rekonstrukce objektu | Rekonstrukce objektu | shoda / zapsáno |
| Objekt v památkové ochraně | pamatkovaOchrana | zapis | Ano | Ano | shoda / zapsáno |
| Licence k projektové dokumentaci | licence | zapis | nevýhradní, pro účel stavby dle smlouvy | Nevýhradní – pro účel stavby dle smlouvy | shoda / zapsáno |
| Platnost nabídky (měsíce) | platnostMesicu | zapis | 2 měsíce | 2 | shoda / zapsáno |
| Zádržné – po dobu záruky | zadrzneZaruka | zapis |  |  | mapa pro PROJ nemá zdroj |
| Smluvní pokuta – prodlení splatnosti (% / den) | pokutaSplatnost | zapis | 0,05 % / den | 0.05 | shoda / zapsáno |
| Limit smluvních pokut (%) | pokutaLimit | zapis | Uplatněn limit 10 % | 10 | shoda / zapsáno |
| Platební podmínky – jiné | podminkyJine | zapis | TEST K57 – Jiné | TEST K57 – Jiné | shoda / zapsáno |
| Sazba DPH | sazbaDph | zapis | 21 % | 21 % | shoda / zapsáno |
| Pojištění odpovědnosti projektanta | pojisteni | zapis | ANO – dle pojistné smlouvy zhotovitele | Ano – dle pojistné smlouvy zhotovitele | shoda / zapsáno |
| Termín dodání OCK (týdny) | terminDodaniTydny | zapis |  |  | mapa pro PROJ nemá zdroj |
| ATYP | atyp | zapis |  |  | mapa pro PROJ nemá zdroj |
| Datum podpisu smlouvy | datumPodpisu | zapis | 2026-11-25 | 2026-11-25 | shoda / zapsáno |
| Převzetí staveniště k montáži šachty | terminPrevzeti | zapis |  |  | mapa pro PROJ nemá zdroj |
| Ukončení montáže šachty a předání montáži výtahu | terminMontaz | zapis |  |  | mapa pro PROJ nemá zdroj |
| Předání výstupů ze zaměření | terminZamereni | zapis | 2027-02-03 | 2027-02-03 | shoda / zapsáno |
| Odevzdání studie proveditelnosti | terminStudie | zapis | 2027-04-28 | 2027-04-28 | shoda / zapsáno |
| Odevzdání DPZ | terminDpz | zapis | 2027-07-21 | 2027-07-21 | shoda / zapsáno |
| Předpoklad povolení záměru | terminPovoleni | zapis | 2027-11-17 | 2027-11-17 | shoda / zapsáno |
| Odevzdání DPS | terminDps | zapis | 2027-12-29 | 2027-12-29 | shoda / zapsáno |
| Jiné termíny | terminJine | zapis | TEST K57 – Jiné termíny | TEST K57 – Jiné termíny | shoda / zapsáno |
| Odchylky oproti smluvnímu standardu | odchylky | zapis |  |  | mapa pro PROJ nemá zdroj |
| Zaměření strojovny | zamereniStrojovna | zapis |  |  | mapa pro PROJ nemá zdroj |
| Situační fotografie | situacniFoto | zapis |  |  | mapa pro PROJ nemá zdroj |
| Dokumentace v rozsahu | dokumentace | zapis |  |  | mapa pro PROJ nemá zdroj |
| Cena nezahrnuje | cenaNezahrnuje | zapis | správní poplatky, posudky nad rámec nabídky, činnosti neuvedené v nabí | správní poplatky, posudky nad rámec nabídky, činnosti neuvedené v nabí | shoda / zapsáno |
| Jiné dohodnuté činnosti | rozsahJine | zapis | TEST K57 – Jiné dohodnuté činnosti | TEST K57 – Jiné dohodnuté činnosti | shoda / zapsáno |
| Platba 1 – po podpisu smlouvy | platba1 | nic |  |  | mapa nepíše |
| Platba 2 – při předání 2D výstupů ze zaměření | platba2 | nic |  |  | mapa nepíše |
| Platba 3 – DPZ pro podání na dotčené orgány | platba3 | nic |  |  | mapa nepíše |
| Platba 4 – DPZ pro podání na stavební úřad | platba4 | nic |  |  | mapa nepíše |
| Platba 5 – po vydání pravomocného povolení záměru | platba5 | nic |  |  | mapa nepíše |
| Platba 6 – po předání kompletní DPS | platba6 | nic |  |  | mapa nepíše |
| Platba 7 – po dokončení ekonomické zadávací části | platba7 | nic |  |  | mapa nepíše |
| Platba 8 – po doporučení dodavatele realizace | platba8 | nic |  |  | mapa nepíše |
| Správní poplatky stavebnímu úřadu (nad rámec ceny) | spravniPoplatky | zapis | TEST K57 – Správní poplatky stavebnímu úřadu (nad rámec ceny) | 57 CZK | shoda / zapsáno |
| Pokuta za prodlení zákazníka se součinností (Kč / den) | pokutaSoucinnost | zapis | 1 000 Kč | 1000 CZK | shoda / zapsáno |
| Podepisující firma (pokud jiná) | podpisFirma | cteni | [TEST] MoveEr |  | mapa jen čte z CRM |
| Druhý podepisující za zákazníka | podpis2 | cteni | TEST K57 Osoba objPodpis2 |  | mapa jen čte z CRM |
| Faktury v kopii na (1) | kopie1 | zapis | TEST K57 – Faktury v kopii na (1) | TEST K57 – Faktury v kopii na (1) | shoda / zapsáno |
| Faktury v kopii na (2) | kopie2 | zapis | TEST K57 – Faktury v kopii na (2) | TEST K57 – Faktury v kopii na (2) | shoda / zapsáno |
| Zmocnitel (plná moc) | zmocnitel | nic |  |  | mapa nepíše |
| Informováno Backoffice | informovanoBo | nic |  |  | mapa nepíše |
| Informováno Technické odd. | informovanoTech | nic |  |  | mapa nepíše |
| Hlavní projektant | hlavniProjektant | zapis | TEST K57 Osoba hlavniProjektant | TEST K57 Osoba hlavniProjektant | shoda / zapsáno |
| Vygenerovat nabídku | vygenerovatNabidku | nic |  |  | mapa nepíše |
| Odkaz na kalkulaci | odkazKalkulace | nic |  | https://testengscalc.netlify.app/?zakazka=CN-437.json | mapa nepíše |
| Platební kalendář SoD PROJ | platebniKalendar | zapis | (kalendar – dopočet) | (platební kalendář 8 řádků) | shoda / zapsáno |
| Systémové pole - filtr - nemazat | — | — |  | 432 | mimo mapu |
| Příplatky v nabídce | priplatkyNabidka | zapis |  |  | mapa pro PROJ nemá zdroj |
| Role | — | — |  |  | mimo mapu |
| IČ | — | — |  |  | mimo mapu |
| DIČ | — | — |  |  | mimo mapu |
| Instant Messenger | — | — |  |  | mimo mapu |
| Poštovní adresa | — | — |  |  | mimo mapu |
| Poznámky | — | — |  |  | mimo mapu |
| Datum narození | — | — |  |  | mimo mapu |
| Pozice | — | — |  |  | mimo mapu |
| Titul před jménem | — | — |  |  | mimo mapu |
| Status | — | — |  |  | mimo mapu |

