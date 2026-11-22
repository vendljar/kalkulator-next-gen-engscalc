# Čočka DO — dokumenty a šablony (Word, PDF, tisk)

Noční bezpečnostní audit KNG 20. 11. 2026 · stav `origin/test` v19.11.11 (cda289e) · jen čtení kódu a lokální PoC (Node, paměťové úložiště, bez sítě).

**Souhrn:** kritická 0 · vysoká 0 · střední 0 · nízká 5 · informativní 5.
Cesta šablon a dokumentů je po B99 / B115 / B139–B143 / #395 dobře zajištěná: zveřejnit šablonu smí jen Administrátor, server pouští tutéž kontrolu obsahu jako klient (klienta obejít nejde), generátor ji pouští znovu a výsledný dokument skládá z rozebraných částí. Vkládání dat zakázky do XML Wordu nešlo prolomit žádnou z 12 nepřátelských hodnot. Nálezy jsou zbytkové mezery v kontrole šablony (vše vyžaduje účet administrátora nebo soubor od třetí strany, který administrátor zveřejní) a hygiena.

PoC (vše spuštěno, výstupy níže):
- `podklady/audit_2026-11-20/poc_DO_sablona_server.mjs` — 28 pokusů o zveřejnění šablony na serveru
- `podklady/audit_2026-11-20/poc_DO_vkladani.mjs` — nepřátelská data do všech cest generátoru
- `podklady/audit_2026-11-20/poc_DO_obrazek_regex.mjs` — `r:id` ze šablony v regulárním výrazu

## Tabulka nálezů

| ID | Závažnost | Nález | Kde | PoC | main dotčen |
|---|---|---|---|---|---|
| DO-1 | nízká | Výjimka pro hypertextový odkaz je širší, než říká komentář: projde vnější odkaz s RELATIVNÍM cílem (`..\..\Downloads\x.hta`) a pole `HYPERLINK` na `\\server\…` / `file:` (u vztahu se totéž odmítá). | `src/sablona_obsah.js:58, 302–307, 194–204` | `poc_DO_sablona_server.mjs` (C1, C3) | ano |
| DO-2 | nízká (chování Wordu neověřeno) | Vnější vztah typu `hyperlink` na `https:` projde, i když na jeho Id neodkazuje odkaz, ale `a:blip r:link` (odkazovaný obrázek) — kontrola neváže povolený vztah na prvek, který ho používá. | `src/sablona_obsah.js:302–307` | `poc_DO_sablona_server.mjs` (C2) | ano |
| DO-3 | nízká | Symbol `{{…}}` uvnitř kódu pole (`HYPERLINK "{{X}}"`) kontrola pustí a generátor do něj dosadí data zakázky: uvozovka z dat ukončí argument a přidá přepínač, cíl (`\\server\…`, `file:`) se nekontroluje. | `src/docxgen.js:153–156, 194–211`; `src/sablona_obsah.js:200` | `poc_DO_vkladani.mjs` | ano |
| DO-4 | nízká | Server přijme nekanonický base64 (`=` uprostřed + cokoli): zkontroluje jen část před `=`, uloží celý řetězec; prohlížeč (`atob`) pak šablonu nenačte → dokument daného typu nejde nikomu vytvořit. | `netlify/functions/sablony.mjs:73–83, 121`; `src/sablona_obsah.js:324–327`; `src/ui/online_ui.js:622` | `poc_DO_sablona_server.mjs` (C8) | ano |
| DO-5 | nízká | Název souboru a poznámka šablony nemají na serveru žádný strop ani čištění (prošlo 200 kB + 500 kB, i `..\`, CRLF, NUL) — jdou do rejstříku, který stahuje každý přihlášený, a název do `a.download`. | `netlify/functions/sablony.mjs:61, 109–121`; `src/sablony_online.js:85–101`; `src/ui/sablony_sprava_ui.js:55` | `poc_DO_sablona_server.mjs` (C9, C10) | ano |
| DO-6 | informativní | Názvy položek ZIPu se nekontrolují (`../../x`, `/etc/x`, zpětná lomítka, dvě položky téhož jména) a generátor je beze změny zapíše do dokumentu pro zákazníka. | `src/docxgen.js:93, 108, 1414`; `src/sablona_obsah.js:258–265` | `poc_DO_sablona_server.mjs` (C5, C6) | ano |
| DO-7 | informativní | Seznam zakázaných polí nezná pole, která při aktualizaci prozradí údaje autora (`FILENAME \p`, `USERNAME`, `AUTHOR`, `USERADDRESS`). | `src/sablona_obsah.js:59` | `poc_DO_sablona_server.mjs` (C7) | ano |
| DO-8 | informativní | Šablona těsně pod stropem rozbalení (60 MB XML v ~60 kB ZIPu) projde a kontrola na serveru trvá ~1,9 s a drží stovky MB paměti (jen administrátor; navazuje na přijatou mez SEC-M17). | `src/docxgen.js:33, 100–104`; `netlify/functions/sablony.mjs:83` | `poc_DO_sablona_server.mjs` (C12) | ano |
| DO-9 | informativní | `r:id` tvaru ze šablony jde bez escapování do `new RegExp` — šablona s `r:id="rId7("` projde kontrolou a generování s podpisem spadne výjimkou. | `src/docxgen.js:1207` | `poc_DO_obrazek_regex.mjs` | ano |
| DO-10 | informativní | Hlídač escapování má slepá místa: `T` je v seznamu „bezpečných obalů“, ačkoli neescapuje (vrací text slovníku), a HTML náhledu Wordu se skládá v `src/nahled_word.js` mimo hlídaný adresář. Dnes bez zneužitelného výskytu. | `src/test_escape.js:180, 451–502, 672–676`; `src/ui/common.js:452`; `src/nahled_word.js:316–383` | ne (čtení kódu + `node src/test_escape.js` 42 OK) | `T` ano; náhled Wordu ne (na main není) |

## Detail nálezů

### DO-1 — výjimka pro hypertextový odkaz je širší než zamýšlená (nízká)

**Předpoklady:** účet Administrátora, nebo soubor od třetí strany (překladatel EN/DE/FR — přesně scénář, kvůli kterému B99 vznikl), který administrátor zveřejní. Oběť (zákazník nebo obchodník) musí na odkaz kliknout a potvrdit varování Wordu.

**Co je v kódu.** Komentář modulu říká, že vnější vztah se odmítá „kromě hypertextového odkazu na http:, https: nebo mailto:“ (`sablona_obsah.js:14–17`). Podmínka ale zní `cile.every(c => !SABLONA_CIL_VNEJSI.test(c) || SABLONA_ODKAZ_POVOLENY.test(c))` (`:305`) — cíl bez schématu a bez `\\` (relativní cesta) se za vnější nepovažuje a projde, i když má `TargetMode="External"`. Pole `HYPERLINK` se nekontroluje vůbec (není v `SABLONA_POLE_ZAKAZANA`, `:59`), takže tentýž cíl, který se u vztahu odmítne (`file:///…`, `\\server\sdílení`), projde zapsaný jako kód pole.

**PoC** (`poc_DO_sablona_server.mjs`):
```
B10  | odmítnout  | odmítnuto   | hypertextový odkaz file:// → 400 … vnější vztah hyperlink s nepovolenou adr
C1   | odmítnout? | PŘIJATO     | odkaz External s RELATIVNÍM cílem na spustitelný soubor (..\..\x.hta)
C3   | odmítnout? | PŘIJATO     | pole HYPERLINK na síťovou cestu \\server (bez vztahu)
```

**Dopad:** odkaz v nabídce nebo smlouvě, který po kliknutí otevře místní soubor relativně k umístění dokumentu nebo síťovou cestu (při `\\server` odchází otisk hesla NTLM). Vyžaduje kliknutí; Word u souborů a síťových cest varuje. Nejde o automatické načtení při otevření.

**Návrh opravy:** u vztahu `hyperlink` s `TargetMode` jiným než `Internal` vyžadovat, aby KAŽDÝ cíl odpovídal `SABLONA_ODKAZ_POVOLENY` (tj. vypustit větev `!SABLONA_CIL_VNEJSI.test(c)`); u pole `HYPERLINK` rozebrat první argument a pustit jen `http(s):`, `mailto:` a přepínač `\l` (záložka). Test s pojistkou: vzory C1 a C3.

### DO-2 — povolený vztah `hyperlink` není vázaný na prvek odkazu (nízká, chování Wordu neověřeno)

**Předpoklady:** jako DO-1.

**Co je v kódu.** Kontrola posuzuje vztah jen podle jeho vlastních atributů `Type` / `Target` / `TargetMode` (`sablona_obsah.js:281–307`). Kdo na Id vztahu v dokumentu odkazuje, se nezjišťuje. Vztah `Type=…/hyperlink`, `Target="https://…/obrazek.png"`, `TargetMode="External"` proto projde, i když ho dokument použije jako `<a:blip r:link="rId5"/>` (odkazovaný obrázek, který Word stahuje při otevření).

**PoC:** `C2 | PŘIJATO | vztah typu hyperlink (https) použitý jako ODKAZOVANÝ OBRÁZEK (a:blip r:link)`.

**Neověřeno:** zda Word obrázek přes vztah s nesouhlasným typem opravdu načte — v sezení není Word a zadání zakazuje spekulovat. Pokud ano, dopad je sledovací volání na cizí server při otevření nabídky (IP adresa a čas otevření u zákazníka); schéma je omezené na `http(s):`, takže únik NTLM přes `\\server` touto cestou nejde.

**Návrh opravy:** po rozboru vztahů projít XML části a ověřit, že Id vnějšího vztahu `hyperlink` se vyskytuje jen v atributu `r:id` prvků `hyperlink` / `hlinkClick` / `hlinkHover`; jiné použití (`r:link`, `r:embed`, `r:pict`, `r:id` jiného prvku) = vada. Levnější varianta: odmítnout atribut `r:link` v jakékoli části (firemní šablony odkazované obrázky nepotřebují).

### DO-3 — data zakázky v kódu pole (nízká)

**Předpoklady:** šablona, která má symbol uvnitř kódu pole (např. e-mail nebo web zpracovatele jako klikací odkaz: `HYPERLINK "mailto:{{ZPRAC_EMAIL}}"`). Pak stačí kdokoli, kdo ovlivní hodnotu symbolu — obchodník, nebo text převzatý z CRM / od zákazníka. **Neověřeno**, zda některá dnes zveřejněná firemní šablona symbol v kódu pole má (šablony nejsou v repu; `nastroje/vyrob_sablony.js` vyrábí jen pole `PAGE`, `:835–864`).

**Co je v kódu.** `sablonaPoleVada` odmítá jen pole, jehož TYP dodá symbol (`sablona_obsah.js:200`); symbol v argumentu projde. `nahradPlaceholdery` dosazuje do celého XML části bez ohledu na to, zda je místo v `w:t` nebo v `w:instrText` (`docxgen.js:194–211`). `xmlEsc` uvozovku zapíše jako `&quot;` (`:153–156`) — pro XML správně, ale Word kód pole čte po dekódování, takže uvozovka z dat argument ukončí.

**PoC** (`poc_DO_vkladani.mjs`):
```
Kód pole po dosazení (jak ho přečte Word): " HYPERLINK \"https://priklad.cz\" \\l \"x\" "
VADA data nemění stavbu kódu pole (symbol uvnitř HYPERLINK "…") — uvozovka z dat ukončila argument a přidala přepínač \l
Cíl odkazu z dat (schéma se nekontroluje): " HYPERLINK \"\\\\utocnik.priklad.cz\\s\\a.docx\" "
```

**Dopad:** hodnota z dat změní cíl nebo přepínače odkazu v dokumentu pro zákazníka (klik → cizí adresa, síťová cesta). Typ pole změnit nejde (první slovo je ze šablony), nové pole z dat nevznikne (ověřeno — viz „Co je v pořádku“).

**Návrh opravy:** v `sablonaPoleVady` odmítnout jakýkoli `{{…}}` uvnitř kódu pole (nejjednodušší a v souladu s tím, jak se pole v šablonách používají), nebo v `nahradPlaceholdery` hodnotu dosazovanou do `w:instrText` zbavit uvozovek a zpětných lomítek a u `HYPERLINK` ověřit schéma.

### DO-4 — nekanonický base64: kontroluje se jiný obsah, než se uloží (nízká)

**Předpoklady:** účet Administrátora (nebo jeho ukradená relace).

**Co je v kódu.** Server ověří jen začátek řetězce (`UEsDB`, `sablony.mjs:76`) a délku (`:78`); kontrola obsahu dekóduje přes `Buffer.from(s, 'base64')` (`sablona_obsah.js:326`), který na prvním `=` skončí a znaky mimo abecedu přeskočí. Uloží se ale celý původní řetězec (`sablony.mjs:121`) a otisk se počítá z něj. Prohlížeč dekóduje přes `atob` (`online_ui.js:622`), který na `=` uprostřed nebo na `-`/`_` vyhodí výjimku.

**PoC:** `C8 | PŘIJATO | base64 s „=" uprostřed + smetí (server čte jen začátek, atob v prohlížeči spadne)`.

**Dopad:** platná verze šablony, kterou žádný prohlížeč nenačte — v přísném režimu nejde vytvořit daný dokument nikomu, dokud administrátor nevrátí starší verzi. Škodlivý obsah se touto cestou k uživateli nedostane (prohlížeč soubor nepřečte; kdyby ho přečetl, generátor pouští kontrolu obsahu znovu, `docxgen.js:1381`). Slabina je v tom, že „zkontrolováno“ ≠ „uloženo“ — každý další čtenář úložiště s jiným dekodérem (záloha, obnova, budoucí funkce) by viděl jiný soubor než kontrola.

**Návrh opravy:** na serveru před kontrolou ověřit kanonický tvar (`/^[A-Za-z0-9+/]*={0,2}$/` a délka dělitelná 4), nebo ukládat `Buffer.from(data,'base64').toString('base64')` a otisk počítat z něj.

### DO-5 — název a poznámka šablony bez stropu (nízká)

**Předpoklady:** účet Administrátora.

**Co je v kódu.** `textovaPoleChyba` hlídá jen typ (`netlify/lib/sdilene.mjs:433–440`), `sablonyZverejni` název jen ořízne o mezery (`sablony_online.js:87`) a poznámku převede na text (`:101`). Obojí jde do rejstříku, který `GET /api/sablony` vrací každému přihlášenému při startu. Název se použije jako jméno stahovaného souboru (`sablony_sprava_ui.js:55`); v HTML je escapovaný (`:146, 153`).

**PoC:** `C9 | PŘIJATO | název 200 kB a poznámka 500 kB` · `C10 | PŘIJATO | název souboru s ../, CRLF a NUL`.

**Dopad:** nafouknutí rejstříku (každé zveřejnění přidá záznam do historie, která se nemaže) → pomalý start všem; řídicí znaky v názvu. Cestu ani hlavičku tím ovlivnit nejde (server název nikam do hlaviček nedává, prohlížeč jméno v `download` čistí).

**Návrh opravy:** strop a čištění na serveru (název ≤ 200 znaků, bez řídicích znaků a lomítek; poznámka ≤ 500 znaků) — stejné meze, jaké mají texty zámku.

### DO-6 — názvy položek ZIPu (informativní)

`zipPrecti` vezme název položky z adresáře tak, jak je (`docxgen.js:93, 108`), kontrola obsahu název jen čte kvůli vzorům `embeddings/`, `vbaProject`, `activeX` (`sablona_obsah.js:258–265`) a `zipZapis` ho zapíše do výsledného dokumentu (`:1414`). PoC C5 (`../../mimo.xml`, `/etc/x.xml`, `word\document.xml`) a C6 (dvě položky `word/document.xml`) server přijal. Word takové položky ignoruje; riziko je jen u toho, kdo by dokument rozbaloval naivním nástrojem. Nástroje v repu (`vyrob_sablony.js`, `preklad_sod.js`) názvy položek jako cesty na disk nepoužívají (ověřeno čtením — zapisují jen do složky z argumentu pod pevnými jmény). Obsah obou stejnojmenných položek kontrolou prochází. **Návrh:** odmítnout položku s `..`, začínající `/` nebo `\`, se zpětným lomítkem, s řídicím znakem a duplicitní název (bez ohledu na velikost písmen).

### DO-7 — pole prozrazující údaje autora (informativní)

`FILENAME \p`, `USERNAME`, `USERINITIALS`, `USERADDRESS`, `AUTHOR`, `LASTSAVEDBY` nejsou v `SABLONA_POLE_ZAKAZANA` (`sablona_obsah.js:59`); PoC C7 prošel. Při aktualizaci polí (tisk s volbou „aktualizovat pole“, F9) se do dokumentu propíše cesta k souboru a jméno uživatele Wordu toho, kdo dokument právě otevřel — obchodníka před odesláním, případně zákazníka u sebe. Nic neodchází po síti. **Návrh:** přidat do seznamu, nebo nechat jako vědomou mez (stejná úvaha jako B172).

### DO-8 — čas a paměť kontroly těsně pod stropem (informativní)

Strop rozbalení 64 MB (`docxgen.js:33`) platí; 80 MB bomba je odmítnuta za 0,3 s (B11). Šablona s 60 MB XML ale projde a kontrola trvá ~1,9 s (C12) — rozbalené bajty + text (2 B/znak) + normalizovaná kopie + několik průchodů regulárními výrazy; u jazykové verze se rozbaluje podruhé (`sablonaOdstavce`, `sablony.mjs:88`). Jen administrátor, jednorázově na požadavek. Firemní šablony mají rozbalené jednotky MB — strop 64 MB je zbytečně vysoko. **Návrh:** snížit `ZIP_ROZBALENO_MAX` pro šablony na ~16 MB (ceník v Excelu, který čtečku sdílí, si může nechat vyšší) a přidat strop počtu položek (dnes až 65 535).

### DO-9 — `r:id` ze šablony v regulárním výrazu (informativní)

`new RegExp('<Relationship[^>]*Id="' + mId[1] + '"[^>]*>')` (`docxgen.js:1207`) — Id z atributu `r:id` tvaru s alternativním textem `{{ZPRAC_PODPIS}}` (šablona) jde do výrazu bez escapování. PoC: šablona s `r:id="rId7("` projde kontrolou obsahu a `docxVyplnSablonu` spadne na `SyntaxError: Invalid regular expression` — nabídku s podpisem z takové šablony nejde vytvořit. Jen spolehlivost, autor šablony = administrátor. Tečka v běžném Id (`rId1.2`) by navíc mohla vybrat jiný vztah. **Návrh:** Id escapovat (`replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`) nebo vztah hledat rozborem atributů (`sablonaAtributyPresne`).

### DO-10 — slepá místa hlídače escapování (informativní)

1. `OBALY` v `src/test_escape.js:180` obsahuje `T`. `T(cz)` (`src/ui/common.js:452`) vrací `tr(cz, jazyk())`, tedy text slovníku, a neescapuje. Slovník jde měnit (`src/preklad.js:1595`, import z Excelu). Výraz `${T(x)}` v HTML by hlídač pustil. Dnes takový výskyt není (grep: 0× `${T(` mimo `esc(...)` v `src/`), všechna volání jsou `esc(T(...))`; `tsPrelozText` escapuje sám (`src/ui/techspec_ui.js:174–178`).
2. HTML náhledu Wordu (nové, 19. 11.) se skládá v `src/nahled_word.js:324–383` funkcí `nwHtml` s vlastním `nwEsc` — mimo `src/ui/`, které hlídač prochází (`test_escape.js:451–502`). Pojistka „mimo src/ui/ se do stránky nesází HTML“ (`:672–676`) hledá jen `innerHTML` / `document.write`, takže skládání řetězce HTML v jádře nevidí. Ručně ověřeno: všechny hodnoty z dat jdou přes `nwEsc` / `nwP`; neescapované jsou jen třídy a úrovně nadpisů z konstant (`nahled_word.js:198–291`), fotka a podpis jen `data:image/(png|jpeg|webp);base64,…` (`:320–322`).

**Návrh:** `T` z `OBALY` vyjmout (nebo přidat sondu, že `T` escapuje, jako u `dlgEsc`); hlídač rozšířit o `src/nahled_word.js` a `nwEsc` / `nwP` přidat mezi obaly se sondou.

## Co je v pořádku (ověřeno, drží)

**Kdo smí šablonu nahrát a co kontroluje server (otázka 1).**
- Zveřejnit, vrátit verzi a přepnout režim smí jen Administrátor (`netlify/functions/sablony.mjs:54`); obchodník 403, nepřihlášený 401, čtení jen přihlášený (`:29`). PoC A1–A3. Mutace „šablony může zveřejnit kdokoli přihlášený“ a „šablony si přečte i nepřihlášený“ (`netlify/mutace.mjs:2136, 2141`).
- Klienta obejít nejde: server pouští tutéž funkci `sablonaObsahVady` (`sablony.mjs:83`), při vrácení verze znovu (`:147`), při obnově ze zálohy taky (`netlify/functions/obnova.mjs:884–886, 938–939`), a generátor v prohlížeči ji pouští nad každou šablonou včetně místní (`src/docxgen.js:1263–1270, 1381`).
- Odmítnuto serverem (PoC B1–B13): `attachedTemplate` na vnější adresu, vzdálený obrázek, `vbaProject.bin`, `.docm` přejmenovaný na `.docx` (typ obsahu `macroEnabled`), `DOCTYPE`/`ENTITY` (XXE i „billion laughs“), pole `INCLUDETEXT` a `DDEAUTO`, `altChunk`, vložený objekt, odkaz `file://`, ZIP bomba 80 MB, useknutý ZIP, druhý archiv připojený za první.
- XML se nikde nerozebírá parserem, který by řešil entity nebo vnější zdroje: v `src/`, `netlify/`, `nastroje/` není žádný `DOMParser` ani `parseFromString` (grep) — rozbor je textový, deklarace `DOCTYPE`/`ENTITY` je vada (`src/sablona_obsah.js:269`).
- ZIP: strop rozbalení 64 MB průběžně přes všechny položky (`docxgen.js:33–52, 100–105`), jednoznačný konec adresáře (`:66–83, 113–115`), neznámá komprese = chyba (`:104`); čtení mimo soubor skončí výjimkou `DataView` a šablona se odmítne („soubor nejde rozbalit“, `sablona_obsah.js:346`).
- Rozdíl „kontrola čte jiný ZIP než Word“ nemá dopad na zákazníka: dokument se skládá z položek, které kontrola viděla (`zipZapis(polozky)`, `docxgen.js:1414`), ne z původních bajtů.

**Vkládání dat do Wordu (otázka 2)** — `poc_DO_vkladani.mjs`, 12 nepřátelských hodnot do všech cest (hlavní průchod, symbol rozdělený mezi běhy, atribut, smyčka šachet, příplatky, řádky navíc, řádek / odstavec za řádek, rozpis, blok kapitoly):
```
OK   hodnota „XML značky"            OK   hodnota „uvozovky a apostrof"
OK   hodnota „symbol jiného pole"    OK   hodnota „řídicí znaky"
OK   hodnota „symbol přes entitu"    OK   hodnota „osamělý náhradní pár"
OK   hodnota „značka bloku"          OK   hodnota „soukromé značky"
OK   hodnota „značka smyčky"         OK   hodnota „víceřádkové"
OK   hodnota „CDATA a komentář"      OK   hodnota „entita"
OK   docxDokumentBlob s nepřátelskými texty
OK   obrázek z dat (dataUrlNaBajty) — SVG=odmítnuto, HTML=odmítnuto, http=odmítnuto, javascript=odmítnuto, PNG=přijato
```
U každé hodnoty ověřeno: XML je vyvážené, žádný znak nepovolený v XML 1.0, žádný osamělý náhradní pár, výstup je platné UTF-8, nevznikl nový prvek ani pole, a kanárek `FIRMA_ICO` je v dokumentu právě 1× (žádné dvojí rozvinutí `{{…}}` z dat).
- Jediné místo vstupu textu do XML je `xmlEsc` (`docxgen.js:152–156`: `&`, `<`, `>`, `"`, `'`, řídicí znaky, U+FFFE/FFFF); `{` z dat jde jako `&#123;` (`:210`, B122), značka bloku z entity se nerozpozná (`:264–272`), smyčka a příplatky mají vlastní ochranu (`:913, 1000–1004`).
- Dokumenty od nuly (krycí listy, objednávka) jdou přes `docxEsc` (`:1422–1425`).
- Obrázky z dat: jen `data:image/png|jpeg;base64` (`:1030–1052`), SVG a adresy ne; do dokumentu se nevkládá nový vztah, jen se přepíší bajty existující části.
- Hypertextové odkazy z dat se do vztahů (`.rels`) nedostanou — generátor plní jen `word/document|header|footer.xml` (`:1387`). Výjimkou je symbol v kódu pole (DO-3).

**Nástroje (otázka 3).** `nastroje/vyrob_sablony.js` a `nastroje/preklad_sod.js`: žádný `child_process` / `exec` / `eval` / síť (grep), `require` jen `fs`, `path` a moduly ze `src/` pod pevnými jmény (`vyrob_sablony.js:255–262, 1584`; `preklad_sod.js:58–62`). Čtou a zapisují jen do složek z argumentů příkazové řádky pod pevnými jmény souborů (`vyrob_sablony.js:284–285, 809, 903, 1591…`; `preklad_sod.js:527–575`); názvy položek ZIPu se jako cesty nepoužívají. Vstupní .docx čtou přes `zipPrecti` (strop rozbalení platí). Žádné závislosti z npm.

**Překlad (otázka 4).** Přeložený text jde do XML šablony přes `xmlEsc` (`docxgen.js:1649, 1684, 1705`; `preklad_sod.js:69, 211, 487`). V HTML je překlad vždy escapovaný (`esc(T(…))`, `tsPrelozText` — `src/ui/techspec_ui.js:174–178`). Vložení nového symbolu `{{…}}` slovníkem je známá přijatá mez B173.

**Tisk a PDF (otázka 5).** Náhledy se otevírají přes `oknoNahledu()` (`src/ui/dialog.js:155`, `window.open('', '_blank')`) a plní `document.write`; okno je téhož původu a `window.opener` je dostupný záměrně (zámek po tisku, `src/ui/common.js:2486–2519`). Všechny interpolace v `src/ui/` hlídá `src/test_escape.js` (spuštěno: 42 OK, 0 FAIL). Skript s daty v náhledu (`neprelozenoSkript`) serializuje přes `JSON.stringify` s `<` → `<` (`common.js:2651`). Nový náhled Wordu ručně prověřen (viz DO-10 bod 2).

**Názvy souborů (otázka 6).** Jména dokumentů skládá `nazevExportu` → `nazevCast` (`src/nazvy_souboru.js:48–57`): jen `[A-Za-z0-9.+-]`, každá část nejvýš 200 znaků — ověřeno během (`..\..\x/../y` + CRLF + NUL + U+202E + 5000 znaků → `NABIDKA_x-..-y-gnp.exeAAA…`, 206 znaků, bez lomítek a řídicích znaků). Server u šablon žádnou hlavičku `Content-Disposition` neposílá (data jdou v JSON; grep v `netlify/` bez výskytu). Příloha poznámky se stahuje jen z `data:` adresy (`src/ui/poznamky_ui.js:83–90`, B82).

## Co testy/mutace NEhlídají

- **Mezery DO-1 až DO-9 nemají test ani mutaci:** relativní vnější odkaz, pole `HYPERLINK` s `file:`/`\\`, vztah `hyperlink` použitý přes `r:link`, symbol v kódu pole, kanonický base64, délka názvu a poznámky, názvy položek ZIPu, `r:id` v regulárním výrazu. `src/test_sablona_obsah.js` zná u odkazů jen kladné případy `https`, `mailto` a pole `HYPERLINK` na https a záložku (`:73–74, 175`).
- **`xmlEsc` — escapování `&`, `<`, `>`, uvozovek:** v `mutace_jadro.mjs` není mutace, která by některou náhradu vypustila (hlídané jsou jen řídicí znaky `XML_RIDICI`, `:2539`, a `{` → `&#123;` u splátek a vlastních řádků). Test existuje (`src/test_docxgen.js:53`), ale bez důkazu mutací. Totéž `docxEsc`.
- **Obrana do hloubky v generátoru** (`docxObsahZkontroluj` ve `docxVyplnSablonu`, `docxgen.js:1381`): žádná mutace — vypuštění volání by kolo nepoznalo (serverová větev mutaci má: `netlify/mutace.mjs:2250, 2256, 4294`).
- **Strop velikosti šablony na serveru** (`data.length > g.SABLONA_MAX_B64`, `sablony.mjs:78`): bez testu v `netlify/test_sablony.mjs` i bez mutace.
- **Výjimka pro odkaz** (`SABLONA_ODKAZ_POVOLENY`, `sablona_obsah.js:58, 305`): bez mutace — rozšíření seznamu schémat (např. o `file:`) by prošlo jen díky jednomu testu B99, zúžení podmínky nikdo nehlídá.
- **Ochrana `{` ve smyčce šachet a u příplatků** (`bezSymbolu`, `docxgen.js:913, 1000`): bez mutace; komentář v `mutace_jadro.mjs:534` odkazuje jen na test `test_vs_docx_v17.js`. Protože `nahradPlaceholdery` závorku převádí sama (`:210`), jde o druhou vrstvu.
- **`netlify/test_prava.mjs`** u šablon ověřuje jen role (rejstřík, zveřejnění, přepnutí režimu — `:619–631`), ne obsah; akce `vratit` v matici práv chybí (roli hlídá `netlify/test_sablony.mjs`, „obchodník vracet nesmí“).
- **Kontrola češtiny v jazykové verzi (C7)** je při nečitelném textu otevřená: `sablonaOdstavce` vrací při chybě `[]` (`sablona_obsah.js:363, 369`) a `sablonaCestinaKontrola` s prázdným seznamem nic nezabrání (`sablony_online.js:268–274`). Text čte jen z `word/document|header|footer.xml` (`docxgen.js:1742`); dokument s hlavní částí pod jiným jménem zábranou projde. Je to pojistka proti omylu, ne bezpečnostní mez — test na tento případ není.
- **Hlídač escapování** nevidí HTML skládané mimo `src/ui/` a `T` má za bezpečný obal (DO-10).
- **Chování Wordu** (zda načte obrázek přes vztah typu `hyperlink`, jak naloží s položkami `../`) žádná sada neověřuje a v tomto auditu ověřeno nebylo.
- Známé přijaté meze, které jsem znovu nehlásil: B172 (`w:delInstrText`), B173 (slovník vloží nový symbol), SEC-M17 (kvadratické výrazy nad šablonami). Žádná se proti záznamu v `BEZPECNOST_MEZE.md` nezhoršila.
