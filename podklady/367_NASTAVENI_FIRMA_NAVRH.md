# #367 — platební podmínky do Nastavení → Firma (návrh, fáze 1)

Dávka V8, 19. 10. 2026, větev `claude/v8-367-firma` (nad `origin/claude/integrace-16-10` @ `e3995e6`).
Kód se v této fázi **neměnil** — jen návrh, mapa a náhled obrazovky.

**Rozhodnutí J. V. 19. 10. 2026:** „Varianta B + z kódu vše převést do Firma. Nechceme mít tato data
natvrdo v kódu. Ukaž mi nejdříve, jak by to v Nastavení vypadalo. Asi bychom v sekci Šablony smlouvy
měli mít přepínač mezi OCK a PROJ.“

Vizuální náhled (světlé i tmavé téma): https://claude.ai/artifact/UZC5zQB14xBBvkN1MMdnPE („Platební podmínky ve Firmě“)
Předchozí podklad s variantami A–E a 12 otázkami: https://claude.ai/artifact/1Szx195YEHNcmTwXGh1Doi

---

## 1. Mapa natvrdo zapsaných údajů (stav `e3995e6`)

Legenda „Kam“: **OCK** / **PROJ** = karta přepínače v Nastavení → Smlouvy / Šablony, **Spol.** = společný blok
nad přepínačem. Všechna data se ukládají do `NAST.firma` (záznam Firma, zveřejňuje `/api/firma`).

### 1a. Platební a smluvní podmínky — OCK (krycí list OCK, CN v13/v14, SoD realizace v1–v3)

| # | Soubor:řádek | Dnešní hodnota | Kam (nové pole) |
|---|---|---|---|
| O1 | `src/kryci.js:185` | splatnost `14` dní | OCK · `podminky.ock.splatnostDni` |
| O2 | `src/kryci.js:34–35` `KRYCI_ZALOHY` | volby Bez zálohy / 30 / 50 / 70 % – po podpisu smlouvy | OCK · `podminky.ock.zalohy[]` |
| O3 | `src/kryci.js:210` | výchozí záloha `KRYCI_ZALOHY[2]` = 50 % – po podpisu smlouvy | OCK · `podminky.ock.zalohaVychozi` |
| O4 | `src/kryci.js:211`, `:435` | dílčí faktura 2 `40 % – po zahájení montáže` | OCK · `podminky.ock.faktura2` (procento + milník) |
| O5 | `src/kryci.js:212`, `:434` | konečná `10 % – po předání` | OCK · `podminky.ock.fakturaKonc` (procento + milník) |
| O6 | `src/kryci.js:38` `KRYCI_FAKTURACE` | Po milnících / Měsíční | zůstává číselník v kódu (logika „Měsíční“ na něm stojí); výchozí volba už je ve Firmě (`zpusobFakturaceOck`) |
| O7 | `src/kryci.js:217–220` | zádržné VaN `Ano` bez %, zádržné po dobu záruky `Ne` bez % | OCK · `zadrzneVan`, `zadrzneVanProc`, `zadrzneZaruka`, `zadrzneZarukaProc` |
| O8 | `src/kryci.js:249` | záruka `60` měsíců | OCK · `zarukaMesicu` |
| O9 | `src/kryci.js:229` | pokuta za prodlení dodávky `0` | OCK · `pokutaDodavka` (z číselníku Spol.) |
| O10 | `src/kryci.js:235` | pokuta za prodlení splatnosti `0,05 % / den` | OCK · `pokutaSplatnost` |
| O11 | `src/kryci.js:237` | limit pokut `Uplatněn limit 10 %` | OCK · `pokutaLimit` |
| O12 | `src/kryci.js:952` | věta měsíční fakturace (CN, SoD) | OCK · `vety.mesicne.{cz,en,de,fr}` |
| O13 | `src/kryci.js:953–954` | věta zálohy CN „N. dílčí daňový doklad ve výši … po podpisu SoD …“ | OCK · `vety.zaloha` se značkami `{PORADI}`, `{PROC}` |
| O14 | `src/kryci.js:955–956` | věta faktury 2 CN „Po ukončení výroby, dodání materiálu …“ | OCK · `vety.faktura2` |
| O15 | `src/kryci.js:957–958` | věta konečné faktury CN | OCK · `vety.konecna` |
| O16 | `src/kryci.js:1067–1072` | SoD: „při uzavření této smlouvy o dílo“, „z celkové ceny díla“, konečná „po provedení celého díla … zbývajících“ | OCK · `vety.sodZaloha`, `vety.sodZCeny`, `vety.sodKonecna` |
| O17 | `src/preklad.js:58–64`, `:1184–1199`, `:1323–1327` | EN/DE/FR znění vět O12–O16 | výchozí hodnoty jazykových polí vět (viz kap. 5) |

### 1b. Platební a smluvní podmínky — PROJ (krycí list PROJ, OVP-CN v4, SoD projekce v2–v4)

| # | Soubor:řádek | Dnešní hodnota | Kam |
|---|---|---|---|
| P1 | `src/nabidka_proj.js:38` (`NABIDKA_PROJ_SAZBY.splatnostDni`), `src/kryci_proj.js:205`, `:387` | splatnost `14` dní (dvě kopie) | PROJ · `podminky.proj.splatnostDni` |
| P2 | `src/nabidka_proj.js:41`, `:738`, `src/kryci_proj.js:211` | platnost 2 měsíce (náhradní) | Spol. · `platnostNabidky` (pole už ve Firmě je; náhrada z kódu zmizí) |
| P3 | `src/kryci_proj.js:225` | způsob fakturace „po dokončení jednotlivých stupňů dokumentace“ (náhrada) | PROJ · pole už ve Firmě je (`zpusobFakturaceProj`); náhrada z kódu → výchozí Firma |
| P4 | `src/plan_plateb.js:46–96` `PLAN_PROJ_VYCHOZI` | plán plateb: Záloha 70 % + zbytek, 14 milníků, Standard po činnostech | PROJ · už ve Firmě (`planPlatebProj`); konstanta zůstává jen jako továrna výchozí hodnoty (kap. 4) |
| P5 | `src/kryci_proj.js:245` | pokuta za prodlení s odevzdáním `0` | PROJ · `pokutaTermin` |
| P6 | `src/kryci_proj.js:248` | pokuta za prodlení splatnosti `0,05 % / den` | PROJ · `pokutaSplatnost` |
| P7 | `src/kryci_proj.js:250` | limit pokut `Uplatněn limit 10 %` | PROJ · `pokutaLimit` |
| P8 | `src/kryci_proj.js:29`, `:235` | `KRYCI_PROJ_ZALOHY`, výchozí 50 % | **nemigruje se** — pole `stary: true`, platí jen pro odeslané nabídky před plánem plateb |
| P9 | `src/kryci_proj.js:227–229`, `src/nabidka_proj.js:324–350` | pevné bloky „Fakturace – …“ a platebních podmínek činností | **nemigruje se** — `stary: true`, tiskne se jen zmrazená nabídka (P9.5) |

### 1c. Společné číselníky

| # | Soubor:řádek | Dnešní hodnota | Kam |
|---|---|---|---|
| S1 | `src/kryci.js:27` `KRYCI_POKUTY`, kopie `src/kryci_proj.js:23` | sazby pokut `0`, `0,05 % / den`, `0,1 % / den` | Spol. · `podminky.sazbyPokut[]` |
| S2 | `src/kryci.js:46` `KRYCI_LIMIT_POKUT`, kopie `src/kryci_proj.js:31` | `Uplatněn limit 10 %` / `NEUPLATNĚN limit 10 %` | Spol. · `podminky.limitPokutProc` (= 10), texty voleb skládá kód |

### 1d. Rozšíření — další firemní údaje natvrdo (označeno zvlášť, mimo jádro #367)

| # | Soubor:řádek | Dnešní hodnota | Doporučení |
|---|---|---|---|
| R1 | `src/kryci.js:178`, `src/kryci_proj.js:195` | typ smlouvy „Naše bez úprav“ | do Firmy (OCK i PROJ) — levné, stejný vzor |
| R2 | `src/kryci.js:239`, `src/kryci_proj.js:252` | plátce DPH „Ano“ | **ponechat** — je to údaj zákazníka, ne firmy |
| R3 | `src/kryci_proj.js:198` | licence k PD „nevýhradní, pro účel stavby dle smlouvy“ | do Firmy (PROJ) |
| R4 | `src/kryci_proj.js:258` | pojištění projektanta „ANO – dle pojistné smlouvy zhotovitele“ | do Firmy (PROJ) |
| R5 | `src/kryci_proj.js:202`, `src/kryci.js:307` | „Cena nezahrnuje“ (PROJ věta, OCK „dle CN“) | do Firmy (OCK i PROJ) |
| R6 | `src/nabidka_proj.js:34–37` | paušály autorského dozoru, max. hodin, další varianta SP, záložní DPH | **ne do Firmy** — jsou to ceny; patří do ceníku PROJ (samostatná položka roadmapy) |
| R7 | `src/firma.js` `DEFAULT_FIRMA.kapTerminy*` | věta „5 let záruka na celé dílo.“ v kapitole V. | odstranit z výchozího textu, záruku nese jen pole O8 (P10.7) |
| R8 | `src/kryci.js:306, 311, 320`, `src/kryci_proj.js:119, 196, 271` | „Ve složce“, „Viz info CN“, typ projektu, předmět, počet výtahů | **ponechat** — výchozí obsah zakázky, ne firemní standard |

Šablony `.docx` (CN v14, OVP-CN v4, SoD realizace v3, SoD projekce v4, EN/DE/FR) v repozitáři nejsou
(firemní text, Disk). Platební údaje do nich jdou jen symboly `{{PODM_*}}`, `{{SOD_*}}`, `{{SODP_*}}`;
pevný text šablon se ověří ve fázi 2 nástrojem `vyrob_sablony.js` (výpis symbolů) — návrh na šablony nesahá.

---

## 2. Obrazovka

**Nastavení → Smlouvy / Šablony** (klíč `nastaveni.sablony`), nahoře:

1. **Společné** (bez přepínače): platnost nabídky, číselník sazeb pokut, limit pokut v %, logo.
2. **Přepínač `OCK · ocelová konstrukce | PROJ · projekce`** (segmentové tlačítko). Volba se pamatuje v `NAST.panelPodminky`.
   - **OCK:** Smluvní standardy (způsob fakturace, rozsah, termín dodání, skladné) → **Platební podmínky OCK**
     (splatnost, volby zálohy + výchozí, dílčí faktura 2 a konečná jako *procento + milník*, živý součet
     100 %, zádržné ×2, záruka, pokuty, limit) → **Věty platebního kalendáře** (CZ/EN/DE/FR, rozbalovací)
     → Kapitoly nabídky IV.–VI. → šablony CN OCK, SoD realizace.
   - **PROJ:** splatnost, způsob fakturace, pokuty, licence, pojištění → **Plán plateb projekce** (dnešní karta
     beze změny) → šablony OVP-CN, SoD projekce, plná moc.
3. Šablony dokumentů (tabulka správy šablon) se filtrují podle přepínače; tlačítko „Všechny“ ukáže celou tabulku.

U každého pole: zástupná značka `{{FIRMA_PODM_…}}`, štítek **výchozí** (shodné s továrnou) / **upraveno**
a odkaz ↺ „vrátit výchozí“. Nahoře pruh „Platí v aplikaci: zveřejněno <kdo> <kdy> · místní změny: N polí“
(stejný mechanismus jako `firmaShodaSOnline`).

Na **Nastavení → Firma** zůstane identifikace, sídlo, banka, kontakty, zástupci; přibude jen odkaz
„Platební a smluvní podmínky → Smlouvy / Šablony“.

## 3. Validace

| Pole | Pravidlo | Kde se hlídá |
|---|---|---|
| splatnost | celé číslo 1–120 | formulář (hned), `firmaLzeZverejnit` (server) |
| procenta záloh, faktura 2, konečná | číslo 0–100, nejvýš 2 desetinná místa | formulář, server |
| součet výchozí záloha + faktura 2 + konečná | **= 100 %** (jinak zveřejnění odmítnuto, lokálně červený součet) | formulář, server; v zakázce dál zábrana #367 P2 |
| volby záloh | 1–6 voleb, jedinečné procento, „Bez zálohy“ vždy první | formulář, server |
| milník | neprázdný text, max 200 znaků | formulář, server |
| zádržné | Ano/Ne; při Ano % 0–20 (prázdné = upozornění, ne chyba — dnešní stav) | formulář |
| záruka | celé číslo 0–240 měsíců | formulář, server |
| pokuty | hodnota musí být z číselníku sazeb | formulář, server |
| sazby pokut | 1–6 položek, první je `0`, tvar „N % / den“ | server |
| věty CN | CZ povinná; věta zálohy a faktury 2 musí obsahovat `{PROC}`; cizí jazyk může být prázdný | formulář, server |
| délky | text ≤ 2000 znaků, věta ≤ 1000 | server (`FIRMA_POLE_MAX`) |

Plán plateb PROJ: beze změny (`planPlatebFirmaVady`).

## 4. Migrace a „nic natvrdo“

- Nový modul `src/podminky.js` (čistá logika, vzor `plan_plateb.js`): `PODMINKY_VYCHOZI` (= dnešní hodnoty
  z tabulek 1a–1c, jediné místo v kódu), `podminkyEf(firma)` = sloučení Firmy s výchozími,
  `podminkyVady(p)`, `podminkyCiste(p)`.
- Všechna místa z kap. 1 čtou **jen** `podminkyEf(c.firma)` — konstanty `'14'`, `'60'`, `KRYCI_ZALOHY[2]`,
  `NABIDKA_PROJ_SAZBY.splatnostDni` atd. z prefillů zmizí. Test „žádný literál v prefillech platebních
  polí“ (grep v `test_podminky.js`) to hlídá.
- **Prázdná Firma** (nová instalace, starší `_nastaveni.json`, starší online záznam) → `podminkyEf` vrátí
  výchozí = dnešní výstup beze změny. Pojistka: snímkový test CN v14 / OVP-CN / SoD v3 / v4 se starou
  konfigurací dává bajtově totéž co dnes.
- V Nastavení tlačítko **„Zapsat výchozí hodnoty do Firmy“** — zkopíruje továrnu do `NAST.firma.podminky`,
  aby šlo zveřejnit a od té doby platí jen Firma. Bez kliknutí se nic nemění.
- Stará data zakázek se nemigrují: ruční přepisy v krycím listu zůstávají, zmrazené varianty (P9.5, #366)
  čtou zmrazené hodnoty. Rozpracované varianty bez ručního přepisu převezmou změněný standard (K20-N1).
- Pole `stary: true` (P8, P9) a věty v13 pro odeslané nabídky zůstávají v kódu — tisknou jen zmrazené
  dokumenty a měnit se nesmí.

## 5. Zástupné značky, šablony, překlady

- Šablony dál berou **`{{PODM_*}}` / `{{SOD_*}}` / `{{SODP_*}}` z krycího listu** (krycí list má přednost).
  Zveřejněné šablony se **nemění a nepřezveřejňují**.
- Nově navíc `{{FIRMA_PODM_OCK_SPLATNOST_DNI}}`, `{{FIRMA_PODM_OCK_ZARUKA_MESICU}}`,
  `{{FIRMA_PODM_PROJ_SPLATNOST_DNI}}` … (firemní standard bez zakázky — pro VOP / obchodní podmínky,
  nápověda v Nastavení). Test `test_firma.js` hlídá prefix `FIRMA_`.
- Věty platebního kalendáře (O12–O16) mají pole CZ/EN/DE/FR; výchozí cizí znění = dnešní slovník.
  Prázdné cizí pole → slovník → česky s upozorněním (vzor `FIRMA_KAP_ZALOHA_CZ`). Když administrátor změní
  českou větu a cizí nechá, ukáže se „EN/DE/FR odpovídá dřívější češtině“ (uložený otisk české věty).
- Milníky se překládají slovníkem jako dnes; nový milník bez překladu hlásí kontrola před nabídkou
  (stejně jako `platbyWordOck`).

## 6. Kdo smí měnit

| Role | Vidí záložku | Mění místně | Zveřejní online |
|---|---|---|---|
| Administrátor | ano | ano (`jeAdmin()`) | ano (`/api/firma`, server `vyzadujRoli('Administrátor')`) |
| Vedoucí | podle matice `nastaveni.sablony` (výchozí ano) | ne — jen čtení, pole zašedlá | ne |
| Obchodník | podle matice (výchozí ano, návrh ne) | ne | ne |

Žádné nové heslo; platí matice zobrazení a role ze serveru. Obchodník mění hodnoty jen v krycím listu zakázky.

## 7. Fáze 2 (po schválení náhledu)

1. `src/podminky.js` + `test_podminky.js` (výchozí = dnešek, vady, čistá kopie, ef sloučení).
2. Prefilly OCK (O1–O11) a PROJ (P1–P7) přes `podminkyEf`; věty O12–O16 přes Firmu s jazykovými poli.
3. `firmaLzeZverejnit` / `firmaKZverejneni` / `firmaShodaSOnline` rozšířit o `podminky`; server beze změny
   (volá tytéž funkce) + `netlify/test_funkce.mjs` (vadné podmínky odmítne).
4. UI: přepínač OCK | PROJ v `nastSablony()`, karta Platební podmínky OCK, filtr šablon.
5. Testy: snímek výstupu se starou konfigurací (pojistka „výstup se nezměnil“), změna Firmy → změna
   krycího listu rozpracované varianty, zamčená varianta beze změny; prohlížeč `overit_podminky_firma.mjs`;
   cílené mutace (`'14'` v prefillu, součet 100 %, kontrola role). Každý nový test doložen před/po.
6. Verze `vDEN.MĚSÍC.pořadí` podle dne commitu, příručka (Nastavení), CHANGELOG, roadmapa #367.

Odhad: 1 dávka (jádro + UI + doplnění kapitol 8b) + 1 dávka (věty v jazycích, texty PROJ 8c, rozšíření R1, R3–R5).

## 8. Kapitoly nabídky IV.–VI. a doložky (doplněk koordinace 19. 10.)

**Hlášení J. V.:** v produkčním Nastavení jsou kapitoly IV.–VI. a doložky česky nevyplněné a nabídka je
vypouští, ač výchozí texty v `src/firma.js` (`DEFAULT_FIRMA.kapPozadavky … dolozkyDe`, ř. 295–306) jsou.

### 8a. Proč se výchozí texty do uloženého Nastavení nedostaly

1. Výchozí texty vznikly 21. 9. 2026 (#282). Firemní záznam produkce (`_DB/_nastaveni.json`
   a zveřejněná kopie `/api/firma`) je starší — klíče kapitol v něm **vůbec nejsou** (ne prázdný řetězec).
2. Načtení firmy obsah **celý nahradí**: `konfigNahradVMiste(NAST.firma, …)` nejdřív smaže všechny klíče
   a pak vloží uložené (`src/konfigurace.js:107–116`; volá se při importu konfigurace `:201`, při načtení
   složky _DB a při nasazení online firmy `src/ui/online_ui.js:1887`). Výchozí `DEFAULT_FIRMA` tím zmizí.
3. Dorovnání chybějících klíčů po načtení (`konfigDorovnejNast`) se týká jen `KONFIG_DOPLNIT_KLICE =
   ['tabViditelnost', 'kpiViditelne', 'zobrazeni']` (`src/konfigurace.js:51`) — **`firma` v seznamu není**.
   Je to záměr: plošné doplnění by do skutečné firmy vrátilo ukázkový název, IČO a adresu.
4. `firmaKZverejneni` kopíruje jen klíče, které v objektu jsou (`src/firma.js:525–539`), takže každé další
   zveřejnění chybějící kapitoly zase vynechá.
5. `firmaKapitola` pak čte `undefined` jako prázdno → `prazdne: true` → nabídka kapitolu vypustí
   a kontrola `firmaKapitolyPrazdne` ji hlásí. Prázdný řetězec (vědomé smazání) a chybějící klíč (nikdy
   nevyplněno) dnes nejdou rozlišit.

Totéž by potkalo nové platební podmínky, kdyby se spoléhaly na uložené klíče — proto `podminkyEf`
slučuje Firmu s továrnou **při čtení** (kap. 4), ne při ukládání.

Ověření na produkci (fáze 2, bez zásahu): v Nastavení → Smlouvy / Šablony u kapitol svítí „nevyplněno“
a v `_nastaveni.json` klíč `kapPozadavky` chybí. Kdyby tam byl jako `""`, platí bod 8b/2 (tlačítko).

### 8b. Návrh nápravy

> **Pozor (koordinace 19. 10.):** body 1–4 a značku `{TERMIN}` v kapitole V. (TD1) dělá souběžná dávka
> O3 (`claude/o3-kapitoly-vychozi`, v19.10.3). Fáze 2 #367 je vynechá a převezme stav po O3.

1. **Automatické doplnění chybějících (ne smazaných) textů.** Nová funkce `firmaDoplnVychoziTexty(f)`:
   pro bílou listinu klíčů (kapitoly IV.–VI. + doložky ve všech jazycích, nové `podminky`, texty PROJ z 8c)
   doplní hodnotu z `DEFAULT_FIRMA` **jen když klíč chybí** (`undefined`). Identifikační údaje (název, IČO,
   adresa, banka) se nikdy nedoplňují — jsou ukázkové. Volá se po každém `konfigNahradVMiste(NAST.firma, …)`.
   Prázdný řetězec zůstane prázdný (vědomé smazání).
2. **Tlačítko „Doplnit výchozí text“** u každé kapitoly a jazyka (jen administrátor) — naplní i pole se
   `""`; u vyplněného pole se zeptá „Nahradit vlastní text výchozím?“ (potvrzení v aplikaci, ne `confirm()`).
   Nahoře souhrnné „Doplnit všechny prázdné kapitoly“.
3. Po doplnění pruh „místní změny: N polí → Zveřejnit“ (`firmaShodaSOnline`), aby to dostali i obchodníci.
4. Testy: (a) načtení starého záznamu bez klíčů → kapitoly z výchozích, název firmy zůstane; (b) `""` se
   nepřepíše; (c) tlačítko přepíše jen vybraný jazyk; pojistka před/po (dnes test a) selže).

### 8c. Kapitoly ve stejné obrazovce s přepínačem OCK ↔ PROJ

- **OCK:** dnešní kapitoly IV. Požadavky pro provedení realizace, V. Termíny realizace, VI. Předání díla,
  Doložky (CZ/EN/DE/FR) přejdou pod kartu OCK vedle platebních podmínek.
- **PROJ dnes kapitoly z Firmy nemá**, ale má jejich obdobu **natvrdo v kódu** `src/nabidka_proj.js`:
  - ř. 304–308 „CENA NEZAHRNUJE“ (3 odrážky),
  - ř. 309–313 „POŽADOVÁNO OD INVESTORA“ (3 odrážky) = obdoba kap. IV.,
  - ř. 352–354 platební podmínky autorského dozoru,
  - ř. 356–367 „TERMÍNY“ (10 řádků vázaných na činnost) = obdoba kap. V.,
  - předání díla ani doložky nemá.
- **Návrh:** karta PROJ dostane „Texty nabídky PROJ“: Cena nezahrnuje, Požadováno od investora, Termíny
  (řádek = činnost + text, činnost určuje, zda se řádek tiskne), Doložky. Výchozí = dnešní texty z kódu,
  překlady jako dnes ze slovníku (jazyková pole jako u OCK). **Doložky PROJ výchozí prázdné**, aby se výstup
  nezměnil; zda je PROJ má tisknout (autorská práva ke studii a PD dávají smysl), rozhodne J. V. (Q5).
- Předání díla (kap. VI.) PROJ nepotřebuje — předání dokumentace řeší SoD projekce čl. III.

## 9. Otázky pro J. V. (s doporučením)

1. **Umístění:** data ve Firmě, editace v Nastavení → Smlouvy / Šablony s přepínačem OCK | PROJ a společným
   blokem nahoře; splatnost zvlášť pro OCK a PROJ (14 / 14)? — *Doporučení: ano (náhled).*
2. **Rozpracované zakázky:** změna standardu se propíše do rozpracovaných variant bez ručního přepisu,
   odeslané a zamčené zůstanou? — *Ano, jako plán plateb PROJ (K20-N1).*
3. **Věty platebních podmínek (CN, SoD) i v EN/DE/FR do Firmy?** — *Ano, výchozí znění = dnešní
   slovník; FR jako u kapitol (prázdné → čeština s upozorněním).*
4. **Součet ≠ 100 % ve firemním standardu:** zablokovat zveřejnění? — *Ano, blokovat; místně jen červený součet.*
5. **Kapitoly:** chybějící texty kapitol doplnit při načtení automaticky (ručně smazané ne) + tlačítko
   „Doplnit výchozí text“; PROJ dostane vlastní texty (Cena nezahrnuje, Požadováno od investora, Termíny)
   z dnešního kódu; doložky v nabídce PROJ? — *Ano; doložky PROJ zatím prázdné, zapnout je až rozhodnutím.*
6. **Rozšíření:** typ smlouvy, licence PD, pojištění, „Cena nezahrnuje“ OCK do Firmy v téže dávce;
   ceny AD a variant SP ne (patří do ceníku PROJ), věta „5 let záruka“ z kapitoly V. pryč? — *Ano.*
