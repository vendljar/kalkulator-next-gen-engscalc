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
