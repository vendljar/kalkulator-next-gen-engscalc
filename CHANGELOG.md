# Změny Kalkulátoru Next Gen

Zapisují se sem dávky a to, co v nich bylo opravené. Verze nese konvenci
`vDEN.MĚSÍC.pořadí` (`v21.9.2` = 21. září, druhá dávka toho dne).

Podrobné zdůvodnění každé opravy je ve zprávě commitu a v komentáři u kódu —
tenhle soupis slouží k rychlé orientaci, ne jako náhrada za ně.

---

## Nezávislá revize oprav A–C (6. 10. 2026) — v integrační větvi claude/davka-6-10

Dva revizoři (jen čtení nad čistou kopií), vysoké nálezy dvakrát nezávisle
přečtené. Opraveno v téže větvi:

- **B119 — vždy přísně.** První verze porovnávala volně, když výsledek
  uváděl jinou verzi aplikace; verzi ale posílá klient → obchvat. Teď nový
  zámek vždy přísně (`src/zamek.js`), viz oddíl dávky B a `BEZPECNOST_MEZE.md`.
- **Kontrola obsahu šablon (B115) — další obchvaty:** CDATA a komentáře
  se před rozborem normalizují (zakázané pole v CDATA, falešný konec pole
  v komentáři), sirotci kódu pole se kontrolují i jednotlivě, atributy
  vztahu `Type`/`Target`/`TargetMode` se čtou přesně a návnadový atribut
  jiné velikosti písmen nebo s prefixem vztah odmítne, pole, jehož typ dodá
  symbol `{{…}}`, se odmítne (`src/sablona_obsah.js`). Test
  `src/test_sablona_obsah.js` 52/6 → 58/0; všech 15 firemních šablon
  (CN v14 + EN/DE/FR, CN v11, PROJ v3, PROJ v4 + EN/DE/FR, SoD realizace
  a projekce v1 i v2, plná moc) projde. Mutace jádra +4.
- **Rejstřík — strop pro všechna textová pole** (N4; dávka B ho dala jen
  adrese): číslo, název akce, objednatel, autor, jméno autora, datum,
  razítko (`src/uloziste.js`). `netlify/test_rejstrik.mjs` 19/2 → 21/0.
- **#374 — doprava sekcí PROJ (V1):** km, ruční příplatek a „mimo Prahu"
  jsou součástí identity B114 (role bez `sloupce.naklad` je proti uložené
  verzi nezmění) a km i příplatek nesmějí být záporné (ani u správce).
- **#374 — záporná `sazbaKc` / `naklad` (V2)** položky PROJ se odmítne
  (vlastní hodinová položka se sazbou mimo ceník snižovala náklad).
- **#374 — duplicitní klíč sekce PROJ (S1)** se odmítne (kontroly viděly
  jen poslední sekci téhož klíče).
- **#374 — čísla v identitě jako v jádře (N1):** „24,0" je pro jádro 0,
  kontrola ho už nebere jako 24.
- Testy `netlify/test_prava.mjs` (blok „Revize 6. 10. 2026"): před opravou
  1 / 6, po opravě 7 / 0; celá sada 691 / 0. Mutace serveru +6, všechny
  chycené.
- **Neopraveno, k rozhodnutí J. V. (roadmapa #395):** V3 — nová zakázka
  s ceníkem sestavení + vlastní položka nastaví cenu libovolně (zákaz
  ceníku sestavení u nové zakázky při zveřejněném ceníku by dnes shodil
  legitimní toky; výchozí návrh: server u nové zakázky obchodníka nahradí
  ceník sestavení zveřejněným, samostatná dávka); S2 — vyřazení položky
  + vlastní položka téhož názvu (vědomá mez); N2/N3 revize A (duplicitní
  kid, `volitelneVlastni`, katalog z příchozího ceníku); nízké nálezy
  revize C (kódování XML bez BOM, strop dekomprese ZIPu, komentář EOCD,
  ověření souborů platných verzí šablon po obnově).

## Drobnosti z mailů D. Sikory (2. a 3. 10. 2026) — v integrační větvi claude/davka-6-10

Pokyn J. V. 6. 10. 2026 („přidej do oprav tyto drobnosti"). Roadmapa #394.

- **S1 — poznámka „*) Termíny pro vyjádření dotčených orgánů …" jen
  s inženýrskou činností.** Hvězdičku nesou jen řádky IČ; nabídka PROJ bez IČ
  (např. jen zaměření a studie) poznámku už netiskne (online nabídka
  a náhled, `src/nabidka_proj.js`). Wordová šablona PROJ má poznámku pevně
  v textu — tam zůstává.
- **S2 — „Co není součástí dodávky" v EN/DE/FR začíná velkým písmenem.**
  Hodnoty `TS_NENI_*` v cizím jazyce dostanou velké první písmeno (online
  i Word); česká nabídka beze změny (`src/nabidka.js`).
- **S3 — „Po milnících" anglicky „Follow project milestones"**
  (`src/preklad.js`). Záruka „60 měsíců" se v testu překládá už od
  K18-N93 (v2.10.1) — D. Sikora zkoušel ostrou v30.9.1.
- **S4 — název souboru v jazyce nabídky:** EN `PRICE_QUOTATION_…`,
  DE `ANGEBOT_…`, FR `DEVIS_…` (OCK i PROJ, přípona jazyka zůstává);
  česky dál `NABÍDKA_…`.
- Test `src/test_sikora_drobnosti.js`: před úpravou 7 prošlo / 13 selhalo,
  po úpravě 20 / 0. `src/test_docx_preklad.js` upraven na velké písmeno
  (51 / 0).

## Dávka E — testy a CI (B124, B125), 6. 10. 2026 — v integrační větvi claude/davka-6-10

- **B125 (informativní) — CI:** `.github/workflows/testy.yml` má
  `permissions: contents: read`, akce připnuté na celý SHA commitu (značka
  v komentáři: checkout v5.1.0, setup-node v5.0.0, setup-python v6.3.0,
  upload-artifact v5.0.0) a Playwright pevně 1.56.1. Hlídá
  `src/test_build_info.js`: před úpravou 42 / 3, po ní 45 / 0.
- **B124 (informativní) — `overit_xss.mjs` otravuje data období:** plán
  plateb v zakázce (vlastní milník = volné znění splátky), firemní plán
  plateb (katalog milníků), číselník dodatkových textů i s jazykovými
  variantami (klíč i texty), materiál „jiné" v opláštění po stěnách a nově
  i **tiskové náhledy** (nabídka OCK a PROJ, krycí listy OCK a PROJ ve dvou
  verzích, detail výpočtu, porovnání variant — do rámu v téže stránce,
  dialogy se odpovídají samy, strop 4 s na náhled, zábrany dokumentů se pro
  účel testu vypínají). Vada v kódu nenalezena; sada 215 → 299 kontrol,
  0 selhalo. Pojistka proti prázdnému testu: u každé oblasti se ověřuje, že
  se payload do stránky (i do náhledů) opravdu dostal, a že se otevřelo
  všech 9 náhledů — první běh bez cen PROJ a bez parametru verze krycího
  listu tyto kontroly shodil (47 selhání), než se přípravná data opravila.

## větev claude/vsg-skn-prepis-skla (neuvolněno)

Dávka D (6. 10. 2026) z `test-draft` (v2.10.1). Rozhodovací list otevřených
otázek s výchozími odpověďmi: `podklady/ROZHODNUTI_2026-10-06.md`.

### #392 — příplatky VSG a SKN z ručně přepsané plochy skla

- Navazuje na P3 (K19-N105): ve standardním režimu se příplatek **Sklo VSG
  s mléčnou fólií** počítá z efektivního skla celkem (přepis řádku skla
  boků/zad a čelního skla, jinak vypočtená plocha) a **Sklo SKN 176 (EXT)**
  z efektivního skla boků a zad. Bez přepisu beze změny (Model 1 1:1,
  `nastroje/porovnani_modelu.js` před i po shodný), režim po stěnách beze
  změny, ruční přepis množství příplatku má dál přednost.
- Detail výpočtu, krok 8 Zasklení: při přepisu skla řádek „Příplatek … —
  z ručně přepsané plochy skla"; příplatky nesou značku `zPrepisuSkla`
  (SKN jen při přepisu skla boků).
- Testy: nová sada `src/test_vsg_skn_prepis.js` — před opravou 32 OK /
  24 FAIL, po opravě 56 OK / 0 FAIL; `src/test_prepis_skla_prace.js`
  53/0 (kontrola „VSG beze změny" obrácena na „VSG z přepsané plochy").
  Mutace jádra +5 (#392), dvě mutace N50 přizpůsobené novému tvaru kódu.

### K20-N1 — dodatek k #383 (vědomé chování)

- Rozpracovaná varianta PROJ s uloženou předvolbou „Záloha" **bez
  uloženého procenta** se řídí aktuálním firemním procentem — po #383 tedy
  70/30 místo dřívějších 50/50, včetně dopočtu plateb SoD PROJ. Platí
  rozhodnutí J. V. k #383 („výchozí plán platí i pro rozpracované
  zakázky … jako každá změna firemního plánu"). Ručně zvolené procento
  (i 50 %) platí dál, zamčené varianty nesou snímek plánu a nemění se,
  vlastní plán firmy (Nastavení → Firma) má přednost. Kód beze změny;
  zachovat 50 % by šlo jen na výslovný pokyn J. V.
- Test `src/test_plan_plateb_k20n1.js` 15/0; s novou mutací jádra
  „K20-N1: záloha bez procenta zůstane na 50 %" 11/4.
## větev claude/audit-b119-b122 (neuvolněno)

Dávka B (6. 10. 2026) z `test-draft` (v2.10.1): nálezy bezpečnostního auditu
20. kola (2. 10. 2026), výchozí ANO z rozhodovacího listu. Roadmapa #393.

- **B119 (střední) — přísné ověření nového zámku.** Uvolnění P6 přeskakovalo
  řádek zmrazeného výsledku bez protějšku: příplatek s vymyšleným
  `origNazev` a jinou cenou dostal razítko „shoda" a dotisk odeslané nabídky
  bral podvrženou cenu. Nový zámek při uložení se teď porovnává přísně,
  pokud výsledek spočítala tatáž verze jako server: nespárovaný řádek je
  rozdíl (i řádek, který chybí), pole po pořadí s jinou délkou je rozdíl
  a k jádru přibyly `ock.souhrn.priplatkyCena` a
  `ock.souctySekci.volitelne.sMarzi`. Porovnává se přísně **vždy** —
  nezávislá revize 6. 10. ukázala, že první verze opravy (volně, když
  výsledek uvádí jinou verzi aplikace) šla obejít, protože verzi posílá
  klient. Stránka načtená před nasazením verze, která mění tvar výsledku,
  může dostat „nesouhlasí" (mez v `BEZPECNOST_MEZE.md`). Starší zámky
  a obnova beze změny (`src/zamek.js`, `netlify/lib/zakazka_kontrola.mjs`).
  Test `netlify/test_prava.mjs` (blok B119) před opravou 3 OK / 5 FAIL, po
  opravě 8 / 0; celá sada 684 / 0. Mutace serveru 4 (všechny chycené).
- **B120 (střední) — obnova přenese jazykové varianty dodatků.** Obnova
  části „popisy" skládala záznam jen z `texty`, `kdo`, `kdy`; `jazyky`
  (EN/DE/FR, #379) se ztratily. Teď projdou `popisyJazykyOciste` a drží se
  jen u položek s českým textem (`netlify/functions/obnova.mjs`). Test
  cyklu záloha → obnova → shoda v `netlify/test_obnova.mjs`: před opravou
  2 OK / 3 FAIL, po opravě 5 / 0 (sada 185 / 0). Mutace serveru +2.
- **B121 (nízká) — adresa v rejstříku se stropem a kontrolou typu.**
  `uloRejstrikAdresa` (strop 300 znaků, jiný typ než text nebo číslo dá
  prázdnou adresu) v záznamu, normalizaci i dávkovém doplnění starších
  záznamů (`src/uloziste.js`, `netlify/functions/zakazky.mjs`). Test
  `netlify/test_rejstrik.mjs`: před opravou 15 / 3, po opravě 18 / 0.
  Mutace serveru +2.
- **B122 (nízká) — symbol v uživatelském textu plateb se nerozvine.**
  Řádky seznamu plateb (vlastní milník, katalog milníků, volné znění
  splátky) se vkládají před hlavním průchodem náhrady; `nahradPlaceholdery`
  teď zapisuje složenou závorku z hodnoty jako znakovou entitu `&#123;`
  (Word ji vykreslí doslova, další průchod ji za symbol nepovažuje).
  Test v `src/test_plan_plateb_sod.js`: před opravou 3 / 2, po opravě 5 / 0.
  `docxgen.js` patří od teď k jádru mutací (`mutace_jadro.mjs`), mutace +1.
## větev claude/koncova-cena-374 (neuvolněno) — dávka A: #374 „koncová cena bez schválení" (B113, B114), 6. 10. 2026

Dávka A koordinačního sezení 6. 10. 2026 (výchozí odpovědi schválené
konvencí; doporučení auditů 30. 9. a 2. 10. 2026). Větev z `test-draft`
(v2.10.1 + PREDAVKA); o sloučení do `claude/davka-6-10` rozhoduje
koordinační sezení. Roadmapa #374 → priorita vysoká, stav hotovo.

### B114 — identita položek PROJ a cena trvalých položek hlídá server

- **Příčina:** B112 hlídal jen přepisová pole. Jádro PROJ bere hodnotu
  z dat zakázky, když ceník klíč nemá (`sazba` → `sazbaKc`, `fixKey` →
  `cena`), takže obchodník ručním požadavkem přepsal klíč sazby na
  neexistující + `sazbaKc=1`, odebral `fixKey` + `cena=1` nebo vynuloval
  hodiny a rezervu — projekce −35 až −65 %, vše 200. Totéž cena trvalé
  položky s `kid` (OCK i PROJ).
- **Oprava (`src/uloziste.js`, `uloCenikProblemy`):** role bez práva
  `sloupce.naklad` nezmění proti uložené verzi (nová varianta: výchozí
  zadání, jiná uložená varianta) u standardní položky PROJ `typ`, `sazba`,
  `sazbaKc`, `fixKey`, `cena`, `hodiny`, `rezerva`; standardní položku
  nesmaže ani nepřeznačí na vlastní. Trvalá položka s `kid`: přítomná musí
  nést hodnoty z uložené verze, jiné varianty nebo katalogu (PROJ: ceník
  varianty a zveřejněné ceníky; OCK: zveřejněný katalog a katalog
  sestavení — u OCK jen jednotková cena), smazat ji smí. Vlastní položka
  (`vlastni:true` bez `kid`) dál smí vše. Administrátor smí vždy.
  Vyřazení položky (rozsah, ne cena) se nehlídá — `BEZPECNOST_MEZE.md`.
- **UI (`src/ui/kalk_ock.js`, `radekKalk`):** cenu trvalé položky OCK
  v hlavních sekcích mohl obchodník přepsat (u volitelných a v PROJ ne) —
  sjednoceno: cena jen administrátor, obchodník množství a smazání jen
  v této zakázce.

### B113 — celý ceník sestavení a projekce za 0 Kč

- **Příčina:** výjimka „celý ceník sestavení" (`uloCenikProblemy`) platila
  pro každou zakázku; server značky ukázkového ceníku před uložením strhne,
  takže obchodník nahradil ceník uložené varianty nulami (200) a protože
  PROJ = 0 Kč v kombinované nabídce zábranu `cenaNula` nespustilo, dokument
  PROJ vznikl.
- **Oprava:** výjimka jen pro novou zakázku a pro variantu, jejíž uložená
  verze ceník sestavení sama nese; jinak 403. Zábrana `cenaNula`
  (`src/kontroly.js`) zastaví dokumenty PROJ (nabídka, náhled, SoD, krycí
  list PROJ) i v kombinované nabídce, když projekce má co prodávat
  (položka ani vyřazená, ani vypnutá nulou) a vyjde 0 Kč. Dokumenty OCK
  nezastaví. **Počet pravidel kontroly beze změny: 32.**

### B117 a bod 4 B96

- B117 (zaokrouhlení z výčtu dolů podteče minimální marži nejvýš o krok − 1)
  zapsáno jako vědomá mez do `BEZPECNOST_MEZE.md`.
- Bod 4 B96 (marže z koncové ceny i bez slevy) — jen návrh
  `podklady/NAVRH_B96_MARZE_2026-10-06.md`, kód beze změny.

### Testy

- `netlify/test_prava.mjs`, oddíl „#374 (B113, B114)": 31 nových testů —
  před opravou 660 prošlo / 16 selhalo (všech 16 útoků 200), po opravě
  676 / 0. Dvě starší fixtury obchodníka (B45 název sekce, B51 tvar kid
  příplatku) narážely na nové pravidlo (zadání bez standardních položek,
  příplatek mimo katalog) — převedeny pod správce, ověřují tvar, ne práva.
- `src/test_kontroly.js`: 5 nových testů zábrany PROJ za 0 Kč — před
  opravou 134 / 1, po opravě 135 / 0.
- Mutace serveru +8 (B113, B114), mutace jádra +2 (B113 v `kontroly.js`).
## větev claude/sablony-obsah-b115 (neuvolněno) — B115, B116, B100 kontrola obsahu šablon, 6. 10. 2026

Dávka C koordinačního sezení 6. 10. 2026 (doporučení auditu 30. 9. 2026, výchozí ANO). Větev z `test-draft` (v2.10.1); o sloučení do `claude/davka-6-10` rozhoduje koordinační sezení.

### B115 (střední) — kontrola obsahu šablony (B99) byla obejitelná

- **Příčina:** `src/sablona_obsah.js` dekódoval jen pět pojmenovaných entit (ne `&#NN;` / `&#xNN;`), `TargetMode` porovnával syrově, pole hledal jen s prefixem `w:` a jen ve `word/<jeden segment>.xml`, vložené objekty jen ve `word/embeddings/` a pole `LINK` neznal. Audit 30. 9. doložil pět obchvatů, kterými se útok B99 (vzdálená šablona s makry, únik otisku hesla NTLM) plně obnoví.
- **Oprava:** entity jako v XML (pojmenované i číselné, jedním průchodem); atributy i s „>" v uvozovkách; prvky a atributy bez ohledu na prefix; prochází se každá část ZIPu, která je XML podle obsahu (i mimo `word/`, i pod jiným názvem, i v UTF-16); vztah je vnější i bez `TargetMode`, když cíl nese schéma nebo síťovou cestu; zakázané typy vztahů rozšířené o ActiveX/VBA data; `embeddings/`, `oleObject*`, `vbaProject*`, `activeX` v kterékoli složce; typ obsahu oleObject/activeX; prvky OLEObject, altChunk, subDoc; pole se skládají po celých kódech (fldChar begin/separate/end, vnořená pole) — zakázané INCLUDETEXT, INCLUDEPICTURE, INCLUDE, IMPORT, LINK, DDE, DDEAUTO a pole, jehož typ dodá vnořené pole; DOCTYPE/ENTITY se odmítá.
- **Testy:** `src/test_sablona_obsah.js` 33/19 → 52/0 (20 obchvatů včetně pěti z auditu, 4 legitimní tvary, které projít musí); s `KNG_PODKLADY` navíc 13 firemních šablon (CN v14 + EN/DE/FR, CN v11, PROJ v3, PROJ v4 + EN/DE/FR, SoD realizace, SoD projekce, plná moc) — všechny projdou (s podklady 46/19 → 65/0). Bez podkladů se část přeskočí. `netlify/test_sablony.mjs`: obchvat s číselnými entitami → 400.
- **Mutace jádra:** `sablona_obsah.js` přidán mezi jádra `mutace_jadro.mjs`, +11 mutací (entity, prefix, rozsah částí, embeddings, LINK, „>" v atributu, vnořené pole, cíl bez TargetMode, UTF-16, DOCTYPE, rozdělený kód pole).

### B116 (nízká) — vrácení starší verze šablony bez kontroly obsahu

- **Oprava:** `netlify/functions/sablony.mjs`, akce `vratit` — soubor vracené verze projde touž kontrolou jako nové zveřejnění; vadná verze → 400, nová verze nevznikne.
- **Testy:** `netlify/test_sablony.mjs` 26/2 → 28/0 (vadná v1 podstrčená do úložiště jako po zveřejnění před B99). Mutace serveru +1.

### B100 (střední) — obnova šablon ze zálohy bez kontroly obsahu

- **Oprava:** `netlify/functions/obnova.mjs` — soubory šablon (`data/…`) ze souboru i z otisku projdou kontrolou obsahu; vadný nebo ne-.docx se přeskočí s důvodem v bilanci. Ověření v `obnovMapu` se nově čeká (`await`).
- **Testy:** `netlify/test_obnova.mjs` 181/4 → 185/0. Mutace serveru +2.

---

## v2.10.1 — nálezy 19. kola P1–P6 (větev claude/k19-nalezy), 2. 10. 2026

Sloučeno do `test-draft` nad v1.10.2 a převedeno do `test` na pokyn J. V. 2. 10. 2026 („souhlasím s výchozími návrhy, zapracuj P2, P4, P6; P5 — statiku udělej tak, jak jsem navrhoval, ve dvou řádcích … P3 ok; P1 OK. připrav, otestuj a pošli do testu"). Integrační větev `claude/davka-2-10`, konflikty jen v CHANGELOG a PREDAVKA.

**Ověřeno celým kolem:** celé kolo nad ca02d5f (kód = bd43ad5, další commity jen dokumentace) VŠE ZELENÉ (77 min 32 s): sady 218 prošlo, 0 selhalo, 1 přeskočeno (test.js — skutečný ceník v repozitáři není), mutace jádra 138 z 138, mutace serveru 211 z 211, statické kontroly 3 z 3; s firemními podklady (KNG_PODKLADY: šablony CN v14, CN v11, PROJ v3, SoD, plná moc, příručka přejmenovaná na v2.10.1). Předchozí dva běhy: první visel na overit_dialogy.mjs (harness neobsloužil nový dotaz P6, přerušeno před mutacemi), druhý selhal jen v overit_lista.mjs (32 pravidel; zakázané zaškrtávátko P2) — obojí opraveno.

Nálezy 19. kola (1. 10. 2026, ostrá v30.9.1 + test v1.10.1) podle promptu
J. V. Větev z `b5253c9` (v1.10.1); o sloučení rozhoduje J. V. Označení
P1–P6 z promptu, v závorce číslo nálezu kola.

**Ověřeno celým kolem:** celé kolo nad b2b901b (kód P1 + P3; další commity jen dokumentace) VŠE ZELENÉ (64 min 16 s): sady 215 prošlo, 0 selhalo, 1 přeskočeno (test.js — skutečný ceník v repozitáři není), mutace jádra 130 z 130, mutace serveru 211 z 211, statické kontroly 3 z 3; s firemními podklady (KNG_PODKLADY: šablony CN v14, CN v11, PROJ v3, SoD, plná moc, příručka přejmenovaná na v1.10.1). Po kole `git status` čistý, `grep "if (false)"` jen komentář v test_prava.mjs.

### P1 (K19-N102) — pojistka #372 a nově zamčená varianta

- **Příčina:** `netlify/lib/zakazka_kontrola.mjs` přeskakoval v kontrole
  neznámého rozměru profilu (#372) každou variantu, která do serveru PŘIŠLA
  zamčená. Porovnání zamčených variant s uloženou verzí bere jen varianty
  zamčené v uložené verzi, takže zámek, který server ještě neviděl, prošel
  oběma kontrolami. V ostré v30.9.1 tak tisk se zámkem uložil 10 zakázek
  s profilem mimo katalog jeklů, v testu v1.10.1 záměrná zkouška K19T-C070
  (zámek bez dokumentu + uložení).
- **Oprava:** při uložení se přeskakuje jen varianta zamčená UŽ V ULOŽENÉ
  VERZI (stejné `id`, `variantaUzamcena`); nově zamčená se kontroluje jako
  nezamčená. Obnova ze zálohy beze změny — zámek ze zálohy je doklad (stejně
  jako u ostatních pojistek v režimu obnovy).
- **Testy** (`netlify/test_obnova.mjs`): (a) nová zakázka se zámkem jen
  v příchozích datech a spojkou 70x40 / 3 mm → 400 a v databázi nic;
  (a2) uložená zakázka, zámek přidaný až v požadavku → 400, uložená verze
  beze změny; (b) varianta zamčená už v uložené verzi s profilem, který
  katalog (po změně) nemá → uloží se; (c) nezamčená → 400 jako dřív. Před
  opravou 176 OK / 4 FAIL (a, a2), po opravě 180 OK / 0 FAIL. Nová mutace
  serveru „K19-N102 (P1)" chycena (4 selhání), kotva mutace „#372 kontroluje
  profily i v odeslané variantě" posunuta na `zamcenaDriv` (chycena testem b).
- **Prověřeno, zda další kontroly téhož souboru nepřeskakují varianty
  zamčené jen v příchozích datech:** ne. Typy polí (`uloTypyProblemy`),
  záporné hodnoty (B111), zaokrouhlení (B96), ceník a přepisy podle role
  (B112, přes `uloProVarianty`), minimální marže (`schvalovaniServerMarze`),
  shoda dat zamčené varianty (N43) i razítka zámku (B59, B61) se řídí
  zámkem v ULOŽENÉ verzi; nový zámek navíc projde ověřením čísla z papíru
  a výsledku. **Návrh (neměněno):** obnova ze SOUBORU (B98 — soubor jde
  upravit) bere zámek ze zálohy jako doklad i pro #372; kdo by v editoru
  připsal zámek k variantě s profilem mimo katalog, obnovou ji do databáze
  dostane (obnovu smí jen administrátor). Výchozí návrh: ponechat; přísnější
  varianta = u `zeSouboru` kontrolovat jen zámek, který leží v databázi.

### P3 (K19-N105) — ruční přepis plochy skla posune PRÁCI OPLÁŠTĚNÍ a TMELENÍ

- **Příčina:** v Excelu je PRÁCE OPLÁŠTĚNÍ součtem ploch skel a TMELENÍ
  navazuje na sklo, takže ruční úprava plochy skla posune i práci.
  V aplikaci platil ruční přepis množství (`mnozstviPrepis[název]`) jen na
  řádku skla; `oplPlochaCelkem` se ve standardním režimu brala z geometrie
  (K19T-C071: sklo boků přepsáno na 93,2 m², práce 213,8 m², Excel
  120,6 m²; K19T-C088 +11,5 % proti Excelu). Ruční přepis skla nese 13
  převedených zakázek.
- **Oprava (`src/engine.js`):** ve standardním režimu se pro PRÁCI
  a TMELENÍ berou efektivní plochy skel — přepis řádku skla boků/zad
  a čelního skla (týž klíč a táž sémantika „prázdno není nula" jako
  u řádku), jinak vypočtená hodnota. Ruční přepis přímo na řádku PRÁCE
  OPLÁŠTĚNÍ / TMELENÍ má dál přednost. Režim po stěnách beze změny.
  V Detailu výpočtu (krok 11, sekce OPLÁŠTĚNÍ) nese řádek PRÁCE / TMELENÍ
  poznámku „(z ručně přepsané plochy skla)"; značku `zPrepisuSkla` dostane
  jen řádek, kde přepis skla platí, takže výstup bez přepisu se nemění.
- **Dopad na uložené zakázky:** bez ručního přepisu skla žádný (Model 1
  zůstává 1:1 — `nastroje/porovnani_modelu.js` před i po opravě shodný
  výstup, předlohy v sadách beze změny). Odeslané (zamčené) nabídky drží
  zmrazený výsledek. **Rozpracovaná (nezamčená) zakázka s ručním přepisem
  skla se po otevření přepočítá** — PRÁCE a TMELENÍ se srovnají s přepsaným
  sklem (to je smysl opravy; ověření J. V.: K19T-C088 v klonu varianty).
- **Testy:** nová sada `src/test_prepis_skla_prace.js` (exteriér
  i interiér × Model 1 i 2: bez přepisu beze změny; přepis skla boků →
  PRÁCE i TMELENÍ = přepsané sklo boků + čelní sklo; přepis čelního skla;
  přepis přímo na PRÁCI vyhrává; interiér bez tmelení jen PRÁCE; prázdný
  přepis nic nemění; po stěnách beze změny). Před opravou 31 OK / 22 FAIL,
  po opravě 53 OK / 0 FAIL.
- **Doporučení k příplatkům VSG a SKN (neměněno):** `vsgFolieM2`
  (standardně celé sklo) a `sknM2` (sklo boků a zad) se ve standardním
  režimu dál berou z geometrie. Fólie VSG i SKN jsou úpravou TÉHOŽ skla,
  takže by logicky měly sledovat efektivní plochu stejně jako PRÁCE
  (VSG = přepsané sklo boků + čelní, SKN = přepsané sklo boků). Výchozí
  návrh: sjednotit v další dávce; příplatky mají vlastní ruční přepis
  množství, takže dnes je obchodník dorovná ručně. Dopad jen na zakázky
  s ručním přepisem skla a zaškrtnutým příplatkem.

### P5 (K19-N109) — statické posouzení ve dvou řádcích (rozhodnutí J. V. 2. 10. 2026)

- **Zadání:** „statiku udělej tak, jak jsem navrhoval — ve dvou řádcích"
  (Excel 2026: statika OCK + statika opláštění).
- **Ceník:** nová položka „Statické posouzení opláštění – hodin"
  (`C.statikaOplHod`, sekce REŽIE, výchozí 0). Sazba je společná se
  statikou OCK (`C.statikaKc`). **Hodiny nastaví J. V. v Ceníku OCK
  a zveřejní** — ceník se ve větvi nemění.
- **Jádro (`src/engine.js`):** řádek „STATICKÉ POSOUZENÍ OPLÁŠTĚNÍ" hned za
  statikou OCK, jen u šachty s opláštěním (plocha PRÁCE OPLÁŠTĚNÍ > 0;
  po stěnách se samými „bez" a světlíky od stavby ne) a jen při hodinách
  > 0. Ceník bez položky nebo s nulou = seznam položek i cena beze změny
  (Model 1 1:1). Ruční přepis hodin funguje jako u každé položky.
- **Kontrola `statikaDvakrat`** (upozornění, ne zábrana): ručně přepsané
  hodiny STATICKÉ POSOUZENÍ a zároveň řádek statiky opláštění — převod
  z Excelu dorovnával statiku ručně (10–20 h), takže by se opláštění
  zaplatilo dvakrát.
- **Dopad na ostrou databázi:** do zveřejnění ceníku s hodinami žádný.
  Pak dostanou řádek rozpracované (nezamčené) varianty, které převezmou
  nový ceník; odeslané (zamčené) drží zmrazený výsledek. Testovací
  zakázky kola 19 jsou všechny zamčené — beze změny. Ručně dorovnanou
  statiku nese 13 z nich (K19-C032, C034, C045, C069, C086, C093, C094,
  C099, C103, C104, C105, C109, C112 = 9532 … 9612); v klonu by kontrola
  upozornila na dvojí statiku.
- **Testy:** nová sada `src/test_statika_oplasteni.js` (exteriér
  i interiér × Model 1 i 2; ceník bez položky / s nulou beze změny;
  6 h → řádek, sazba, pořadí, cena; přepis hodin; šachta bez opláštění;
  kontrola upozorní / mlčí). Před zavedením 16 OK / 22 FAIL, po něm 38 OK /
  0 FAIL. `test_kontroly.js`: pravidel 32. Tři nové mutace jádra chyceny
  (3 z 3).

### P2 (K19-N104) — zkratka „Prosklít i prohlubeň" (rozhodnutí J. V. 2. 10. 2026: výchozí návrh)

- **Zadání šachty:** pod polem Prohlubeň zaškrtávátko „Prosklít i
  prohlubeň". Zaškrtnutí nastaví všem čtyřem stěnám „Opláštění začíná" =
  −prohlubeň a jednotné opláštění přepne na opláštění po stěnách
  s výchozími typy stěn (ty skládá jádro, `oplasteniStenyVychozi`).
  Odškrtnutí vrátí meze, které začínají v −prohlubeň, na 0 (rozdělení
  stěn a režim po stěnách zůstávají). Změna hloubky prohlubně meze posune,
  dokud zkratka platí; ruční mez u jedné stěny ji zruší. Stav se odvozuje
  z mezí (`oplasteniProhlubenVse`), žádný příznak v datech. Pole Prohlubeň
  i zaškrtávátko nesou nápovědu. U nulové prohlubně se zaškrtávátko
  nezakazuje (vstupy kalkulace mají zůstat živé — `overit_lista.mjs`),
  zaškrtnutí jen vysvětlí, že není co prosklít. Zámek varianty obě
  obsluhy hlídá (`zamek_ui.js`).
- **Výpočet beze změny:** jádro počítá dnešní cestou po stěnách (plocha pod
  nulou skutečnou šířkou stěny); nezaškrtnuté = dnešní stav, Model 1 1:1.
- **Detail výpočtu** (krok 8): řádek „Prosklená prohlubeň — všechny stěny
  od −X m". Technická specifikace beze změny (ROZSAH OPLÁŠTĚNÍ už píše „od
  výšky −X m, tedy do prohlubně").
- **Testy:** nová sada `src/test_prohluben_sklo.js` 33 OK / 0 FAIL (před
  zavedením padá — funkce v jádře chyběly); `overit_oplasteni.mjs` +7
  kontrol v prohlížeči (po sloučení s v1.10.2 91 OK / 0 FAIL). Dvě nové mutace jádra
  chyceny (2 z 2).

### P4 (K19-N107) — nápověda „jiné sklo = opláštění po stěnách" (rozhodnutí J. V. 2. 10. 2026: výchozí návrh B)

- Druh skla ve standardním režimu dál určuje typ šachty a způsob zasklení
  (`skloVolba`); jiné sklo jde přes opláštění po stěnách (typ skla
  z ceníku nebo „jiné" s vlastním názvem a sazbou). Věta to teď říká
  v bublině u názvu řádku skla boků/zad i čelního skla (jen ve standardním
  režimu), u volby Opláštění v zadání šachty a v Detailu výpočtu u řádku
  „Které sklo se počítá". Výpočet ani dokumenty beze změny.
- **Testy:** `overit_oplasteni.mjs` +2 kontroly (řádky skla nápovědu nesou,
  PRÁCE OPLÁŠTĚNÍ ne, volba opláštění ano), 80 OK / 0 FAIL.

### P6 (K19-N114) — přepnutí na zahraniční ceník nabídne „jen realizace" (rozhodnutí J. V. 2. 10. 2026: výchozí návrh A)

- Po přepnutí varianty na zahraniční řadu ceníku se aplikace zeptá
  „Zakázka jen realizace — projekci nepočítat?" (výchozí Ano). Ano nastaví
  `ZAK.jenOck` (strana PROJ zešedne, krycí list PROJ, SoD PROJ a plán
  plateb PROJ se nepoužijí, kontroly projekce mlčí) a zapíše to do
  protokolu. Dialog říká, že volba platí pro celou zakázku (všechny
  varianty) a jak ji vrátit („Počítat i tuhle stranu"). Po návratu VŠECH
  variant na tuzemský ceník nabídne opak (výchozí Ne). Nenabízí se, když
  zakázka nese číslo projekce (OVP ve společném čísle nebo vlastní číslo
  ve starší hlavičce PROJ), když je už jen realizace / jen projekce, nebo
  když obchodník vědomě zvolil počítat obě strany. Rozhoduje
  `zahrJenRealizaceNabidnout` (`src/zakazka.js`), zápis jde přes `set()`
  (zámek i náhled ho hlídají). Kontrola `projZahranici` beze změny.
- **Testy:** nová sada `src/test_zahr_jen_realizace.js` 12 OK / 0 FAIL (před
  zavedením padá — funkce chyběla); `overit_zahranicni.mjs` +5 kontrol
  (dotaz, Ano, návrat, Ne, OVP) a test dialogu s dopadem hledá svůj text
  mezi dialogy, 45 OK / 0 FAIL (před 40).
  `overit_dialogy.mjs` (skutečné modály): přepnutí na zahraniční ceník teď
  otevře druhý modál, který harness dřív neobsloužil a čekal donekonečna
  (první celé kolo nad v2.10.1 se na něm zastavilo — přerušeno ještě před
  mutacemi a spuštěno znovu); +2 kontroly (dotaz na celou zakázku, odpověď
  Ne), 26 OK / 0 FAIL.

### P2, P4, P5, P6 — rozbor (1. 10. 2026; rozhodnuto 2. 10., viz oddíly výš)

Body „prověřit + návrh" — rozbor s variantami a výchozími návrhy
v `podklady/K19_ROZBOR_2026-10-01.md`, čeká na rozhodnutí J. V.:
P2 prosklená prohlubeň (výchozí: zkratka „prosklít i prohlubeň" pro
všechny stěny + nápověda), P4 volba druhu skla (výchozí: nápověda „jiné
sklo = po stěnách", volba skla až po rozhodnutí o položkách ceníku),
P5 statika opláštění (výchozí: jen hodiny `statikaHod` v ceníku), P6
projekce u zahraniční zakázky (výchozí: přepnutí na zahraniční řadu
nabídne „jen realizace").

---

## v1.10.2 — dávka 1. 10. 2026 odpoledne: výchozí plán plateb PROJ, zarovnání polí opláštění, zbytek mezery vedle dveří (1. 10. 2026)

Zadání J. V. 1. 10. 2026 odpoledne (navazující sezení po v1.10.1): „Nastav
plán plateb viz příloha jako výchozí standard. Zarovnej datová pole
u různého opláštění zprava viz např. modrá linka obr. ve výpočtu šířky
světlíků zřejmě nezohledňujeme šířku rámu dveří x2 (rám obchází dveře
okolo), prověř to. Text vedle dveří zůstane 1,50 m je podle mně špatně.
Prověř to a dej mi vědět. Ad tvoje otázky: 1) nech to tak jak to aktuálně
je, 2) Nezobrazuj nápovědu. aktualizuj roadmapu a zopakuj mi otevřené
body znovu.“ Každý úkol vlastní větev z `test-draft` (b5253c9), integrace
`claude/davka-1-10-2` (bez konfliktů), převod do `test-draft` a `test` rychlým
posunem na pokyn J. V. („po zeleném kole to pošli do testu“). Roadmapa #383–#385, #381.

**Ověřeno celým kolem:** VŠE ZELENÉ (84 min 29 s) nad 7d544b7 — sady 214 prošlo, 0 selhalo, 1 přeskočeno (test.js — skutečný ceník v repozitáři není), mutace jádra 131 z 131, mutace serveru 210 z 210, statické kontroly 3 z 3; s firemními podklady (KNG_PODKLADY: šablony CN v14, CN v11, PROJ v3, SoD, plná moc, příručka). Převod do `test-draft` a `test` rychlým posunem na pokyn J. V. 1. 10. 2026: „po zeleném kole to pošli do testu“.

### Plán plateb PROJ: výchozí předvolba Záloha 70 % + zbytek po předání (#383)

Větev `claude/plan-plateb-zaloha-70`. Snímek J. V.: krycí list PROJ
s předvolbou „Záloha + zbytek po předání“ a zálohou 70 %.

- **Výchozí plán z kódu** (`PLAN_PROJ_VYCHOZI` v `src/plan_plateb.js`):
  výchozí předvolba Standard po činnostech → **Záloha + zbytek po
  předání**, záloha v předvolbě 50 % → **70 %**. Nová zakázka má u každé
  nabízené činnosti 70 % po podpisu smlouvy a 30 % po předání činnosti,
  způsob fakturace „záloha 70 % po podpisu smlouvy, zbytek po předání
  jednotlivých stupňů dokumentace“, smlouva o dílo PROJ to dopočítá.
- Platí i pro **rozpracovanou** variantu, která předvolbu nemá uloženou
  (plán je řídký — jako u každé změny firemního plánu). Odeslané nabídky
  mají snímek plánu a nemění se. Firma s vlastním plánem v Nastavení →
  Firma má vlastní výchozí předvolbu a zálohu, ty mají přednost.
- Šablona nabídky PROJ v3 má platební podmínky natvrdo (Standard) — u nové
  zakázky s v3 teď varuje pravidlo „Plán plateb se ve Wordu neukáže“;
  řešením je šablona PROJ v4.
- **Testy** (proti původnímu kódu → po změně): `test_plan_plateb.js`
  4 FAIL → 70/0 (nový úsek 0 — výchozí předvolba, řádky 70/30, popis,
  věta fakturace, dopočet SoD); `test_plan_plateb_kryci.js` 3 FAIL → 66/0;
  `test_plan_plateb_sod.js` 1 FAIL → 49/0; `test_sablona_proj_v4.js`
  1 FAIL → 33/0; `overit_plan_plateb.mjs` 4 FAIL → 49/0. Testy Standardu
  běží nad firmou s výchozím Standardem. Příručka (Plán plateb).

### Opláštění po stěnách: pole stěny v pevných sloupcích (#384)

Větev `claude/oplasteni-zarovnani-poli`. Snímek J. V. s modrou linkou:
materiál pásu „až nahoru“ přečníval materiál ostatních pásů.

- **Příčina:** pole řádku stěny se skládala za sebe, každý jinak široký
  prvek posunul ty před sebou (vedle pásu „až nahoru“ je místo pole výšky
  kratší text „po horní hranu“; „Opláštění začíná“ nemělo křížek;
  název a sazba „jiné“ byly mimo sloupce).
- **Oprava** (`src/ui/kalk_ock.js`, `src/app_template.html`): rastr
  `.opl-sloupce` materiál (190 px) | výška (90 px) | křížek (30 px),
  zarovnaný doprava; řádky bez materiálu (hlavička rozdělené stěny,
  „+ přidat pás“, „Opláštění začíná“) mají jen sloupce výška | křížek,
  takže popisek se na užším okně nezalomí víc než dřív. „jiné“: název
  pod materiálem, sazba pod výškou, jednotka Kč/m². Výpočet beze změny.
- **Test:** `overit_oplasteni.mjs` nový úsek „ZAROVNÁNÍ POLÍ STĚNY“ (měří
  hrany z obrazovky) — proti sestavení před úpravou 77 OK / 5 FAIL, po ní
  82 / 0; `overit_xss.mjs` 215/0, `smoke.mjs` 50/0.

### Šířka bočního světlíku: zbytek mezery u jedněch dveří; rám dveří ověřen (#385)

Větev `claude/svetlik-zbytek-vedle-dveri`.

- **Rám dveří** se do mezery vedle dveří počítá **dvakrát už teď**: otvor
  dveří = čistý vstup + 2 × šířka rámu + 2 × 20 mm (`sirkaDveri`, vzorec
  z Excelu, oba modely), mezera = šířka skla − otvor − 40 mm. Zakázka ze
  snímku: 800 + 2 × 100 + 40 = 1 040 mm; 1 680 − 1 040 − 40 = 600 mm.
  Kód se nemění; nový úsek testu 4b to drží (pojistka dočasnou mutací
  „rám jednou“: 4 kontroly selžou).
- **Věta o zbytku** (`kontrolyBokySirka`, jen Model 2 s ruční šířkou):
  „Vedle dveří zůstane 1,50 m šířky…“ nesla součet přes všechny dveře
  a zněla jako zbytek u jedněch dveří. Nově „Vedle každých dveří zůstane
  neoceněných 300 mm (mezera 600 mm − světlík 300 mm), u 5 dveří celkem
  1,50 m.“; dva u dveří „− 2 světlíky po … mm“; smíšené rozložení jen
  součet a z čeho vznikl; dveře bez světlíku se do zbytku nepočítají
  (hlásí je pravidlo počtu). Cena ani zábrany se nemění.
- **Testy:** `test_svetliky_sirka.js` — proti původnímu kódu 61/8, po
  změně 69/0; `overit_svetliky_sirka.mjs` 23/1 → 24/0; mutace jádra +3
  úseky (věta nese součet, dveře bez světlíku podruhé, rám jednou).

### Rozhodnutí J. V. k #381 (1. 10. 2026 odpoledne)

- Mezera vedle dveří u zasklení mezi příčníky dál vychází ze šířky skla
  mezi sloupky (shodně s Excelem a Modelem 1) — **ponechat**.
- Nápověda s výpočtem mezery („šířka skla … − otvor dveří … − 40 mm“) se
  **nezobrazuje** — nic se nepřidává.

---

## v1.10.1 — dávka 1. 10. 2026: SoD podle šablon, zábrany blokují dokumenty, šířka bočního světlíku, dodatkové texty (1. 10. 2026)

Zadání J. V. 1. 10. 2026 (úkoly 1–4) a jeho rozhodnutí během dne: návrh SoD
— výchozí odpovědi platí, datum podpisu = aktuální datum; „s návrhem šířky
bočního světlíku souhlasím, zapracuj ho pro model 2 (modelu 1 nic neměň)
a vše pošli do testu"; kontrola dodatkového textu, který se v testu
nepropisoval. Každý úkol vlastní větev z `test-draft` (643faa8), integrace
`claude/davka-1-10`, převod do `test-draft` a `test` rychlým posunem.
Roadmapa #377–#382.

**Ověřeno celým kolem:** finální celé kolo nad d596290 VŠE ZELENÉ (59 min 7 s): sady 214 prošlo, 0 selhalo, 1 přeskočeno (test.js), mutace jádra 128 z 128, mutace serveru 210 z 210, statické 3 z 3; kód v1.10.1 (373861f) je s d596290 shodný, liší se jen CHANGELOG, PREDAVKA a roadmapa; na pokyn J. V. „potřeboval bych to už odeslat do testu" převedeno ještě před doběhnutím mutací serveru, výsledek dopsán po doběhnutí; předchozí celé kolo nad a7889c5 (úkoly 1–4 bez SoD rozhodnutí, #381 a #382) VŠE ZELENÉ: sady 210/0/1, mutace jádra 121 z 121, serveru 210 z 210, statické 3 z 3.

### Dodatkové texty: číselník má přednost před zveřejněným ceníkem

Hlášení J. V. 1. 10. 2026: „proč se mi při načtení nové zakázky nepropisuje
dodatkový text přestože v ceníku ho mám … Tento problém eviduju jen v testu,
v main text propsaný mám." Větev `claude/ciselnik-prednost-dodatku`
z integrační `claude/davka-1-10`; roadmapa #382.

- **Příčina:** dodatkové texty mají dva zdroje — číselník (`/api/popisy`)
  a kopii ve zveřejněném ceníku. `popisyVlij` vlévala číselník do výchozího
  ceníku jen tam, kde zveřejněný ceník vlastní text neměl (rozhodnutí
  22. 9. 2026, ještě před zavedením číselníku). Zveřejněný ceník v testu nese
  u SKN starší krátký text, takže každá nová zakázka dostala ten a dlouhá
  věta z číselníku se nepropsala; v ostrém ceníku tam text zřejmě není,
  proto to ostrá verze nevykazuje. Úprava textu v číselníku platila jen do
  obnovení stránky.
- **Oprava:** číselník má přednost (jak slibuje jeho popis „nezávisle na
  verzi ceníku"); text zveřejněného ceníku zůstává náhradou u položek, pro
  které číselník text nemá. Překlady staré věty se u přepsaného textu
  zahodí a doplní se ty z číselníku (#379). Rozpracované a odeslané
  zakázky se nemění (mají vlastní kopii).
- **Číselník** ukáže, když zveřejněný ceník nese jiný text, a u otevřené
  zakázky s jiným textem nabídne tlačítko **použít text z číselníku
  v otevřené zakázce** (jen rozpracovaná varianta; zámek a náhled hlídá
  ZAMEK_CHRANENE).
- **Testy:** `src/test_cenik_popisy.js` (přednost číselníku, náhrada ceníku,
  záznam odlišných textů, překlady) — před opravou 4 z 28 selhaly, po opravě
  28 OK; nový `overit_popisy_prednost.mjs` — před opravou 5 z 9 selhalo, po
  opravě 11 OK. Příručka (kapitola o dodatkových textech).

### Šířka bočního světlíku při ručním počtu (#381, Model 2)

Rozhodnutí J. V. 1. 10. 2026: „s návrhem šířky bočního světlíku souhlasím,
zapracuj ho pro model 2 (modelu 1 nic neměň)“ (návrh
https://claude.ai/artifact/7tNaMb8Fu1tNt9ADCyYheL; výchozí odpovědi otázek
1–6 a 8 platí, otázka 7 změněna: **jen Model 2**). Větev
`claude/sirka-bocniho-svetliku-381` (nad integrační větví
`claude/davka-1-10`), roadmapa #381 hotovo.

Proč: podle #375 stojí dveře s jedním bočním světlíkem u sloupku a světlík
vyplní celou mezeru vedle dveří, takže plocha boků je od D do 2D světlíků
stejná (zakázka ze snímku J. V.: 5 × 0,60 m × 2,2 m = 6,60 m² pro 5 i 10 ks).
Obchodník to na obrazovce neviděl a nemohl změnit.

- **Data:** `Z.svetlikyBokySirkaMm` — prázdno / chybí = předpočítaná šířka,
  číslo = ruční šířka jednoho bočního světlíku v celých mm (prázdno není
  nula). Starší zakázky klíč nemají → cena beze změny. Server ho hlídá jako
  číslo (`ULO_CISLA_NAVIC`).
- **Jádro** (`src/engine.js`): jen v **Modelu 2** při ručním počtu, N > 0
  a platné šířce W je plocha boků N × W × 2,2 m — čte ji sklo, plech (kg
  i lakování), materiál opláštění, „zajistí stavba“, průchozí šachta i režim
  po stěnách. Konstrukce a montáž dál po kusech. **Model 1 šířku nečte**
  (ani při uložené hodnotě), automatický počet ji ignoruje v obou modelech.
  Výsledek vydává `zaskleni.vypln.sirkaPredpocitana` (dnešní plocha /
  (2,2 × N)), `sirkaRucne` (v Modelu 1 vždy null) a `sirka` (použitá).
- **Zadání šachty:** řádek **Šířka bočního světlíku** (mm) hned pod počtem —
  jen Model 2, výplň ≠ „bez“, ruční počet, N > 0. Hodnota = ruční šířka
  nebo zaokrouhlená předpočítaná; ruční nese štítek „ručně“ a ↺. Pod řádkem
  nápověda („předpočítáno z mezery vedle dveří 600 mm: 5 dveří s jedním
  (600 mm)“, smíšené „… → průměr“; nebo „zadáno ručně; předpočítaná šířka
  … mm“) a červená / oranžová věta z kontroly. ↺ u počtu ruční šířku smaže.
  `bokySirkaSet`, `bokySirkaZpet` jsou v `ZAMEK_CHRANENE`.
- **Kontrola** `bokyDveri` (jen Model 2, jen s ruční šířkou — model pozná
  z výsledku jádra, takže platí i pro zmrazený otisk a server): světlík
  širší než mezera nebo N × W > D × M = **zábrana**, která zastaví nabídku,
  SoD i krycí list OCK (brána dokumentů #377, pravidlo má `zabranaMozna`);
  jinak zbytek mezery nad 5 mm = upozornění „Vedle dveří zůstane … m šířky,
  kterou nic neoceňuje.“ Tolerance zaokrouhlení 0,5 mm na světlík
  (zaokrouhlená předpočítaná šířka zábranu nespustí).
- **Detail mezivýpočtů:** mezera vedle dveří, předpočítaná / použitá šířka
  a plocha boků se vzorcem. **Specifikace a nabídka:** „Světlíky na bocích
  dveří: 5 ks, šířka 300 mm, sklo VSG 4.4.1, na terče“ jen při ruční šířce;
  překlad EN/DE/FR vzorem s obecným heslem „šířka“, které slovník už má
  (NÁVRH PŘEKLADU — ke kontrole J. V.).
- **Testy (pojistka proti prázdnému testu):** nová `src/test_svetliky_sirka.js`
  (60 kontrol: zakázka ze snímku 6,60 → 3,30 / 4,95 m², plech v kg, Model 1
  se šířkou v datech bajt po bajtu shodný ve 1 120 zadáních, automatika,
  smíšené 7 ks = 5 · 0,6 / 7 m, kontrola 750 / 700 / 10 × 400 / 300 mm,
  specifikace, překlad, nabídka, server) — před opravou 16 prošlo / 44
  selhalo, po ní 60 / 0. Nový harness `overit_svetliky_sirka.mjs`
  (24 kontrol) — proti sestavení před opravou 6 OK / 18 FAIL, po ní 24 / 0.
  `overit_xss.mjs` + pole šířky. Upravené: `test_kontroly.js` (bokyDveri
  mezi pravidly se zábranou), `test_profil_neznamy.js` (tři nová pole
  `vypln` mimo otisk — otisky beze změny).
- **Porovnání jader:** 13 824 zadání (oba modely, int/ext, terče/lišty,
  všechny výplně, starší tvar boků, počty, šířky, průchozí, po stěnách)
  proti jádru před #381 — rozdíl jen u Modelu 2 s ručním počtem a šířkou
  (2 976 zadání), všude jinde bajt po bajtu shoda.
- **Mutace jádra:** +7 úseků „#381: …“ (Model 1 čte šířku, automatika čte
  šířku, plocha z jedné tabule, předpočítaná z poloviny výšky, kontrola
  šířky vypnutá, širší než mezera se nepozná, zábrana jen upozorní);
  filtrovaný běh `node mutace_jadro.mjs "#381"`: **chycených 7 z 7**
  (všechny `test_svetliky_sirka.js`), pracovní kopie po běhu beze změny;
  `--kontrola` 128 úseků.
- `./spust_testy.sh --smoke` (s `KNG_PODKLADY`): 212 prošlo, 0 selhalo,
  1 přeskočeno (`test.js` — skutečný ceník v repozitáři není).
- Podklad #149: 14. rozdíl M1 × M2; `nastroje/porovnani_modelu.js` vzor H
  a složka „Plocha boků vedle dveří“. Příručka (Zadání šachty, kapitola
  zábran).

### Model 2 neubírá montáž u nadsvětlíku „bez“

Zadání J. V. 1. 10. 2026: „v modelu 2 přestaň ubírat 0,2h montáže na
nástupiště v případě nadsvětlík bez“. Větev `claude/model2-nadsvetlik-bez`
(nad `test-draft` v30.9.4), roadmapa #378 hotovo.

- **Jádro** (`src/engine.js`, `hn.svetlik`): odpočet −0,2 h × nástupiště
  při světlíku nad dveřmi „bez“ se dělá **jen v Modelu 1** (1:1 Excel —
  nemění se ani o korunu). Model 2 neubírá u žádné volby; „zajistí stavba“
  neubírá v žádném modelu dál (#375).
- **Testy:** `test_nadprazi.js` — nový úsek 3b (oba modely, interiér
  i exteriér, rozdíl M2 − M1 = 0,2 h × nástupiště) a úsek „zajistí stavba“
  pro oba modely; `test_svetliky_boky.js` — úsek 6 rozdělen po modelech.
  Před opravou 6 selhání (4 + 2), po ní 0.
- **Mutace jádra:** nové úseky „#378: Model 2 zase ubírá montáž při ‚bez‘“
  a „#378: Model 1 přestane ubírat“ — oba chycené (test_nadprazi.js,
  test_kornpfortstrasse.js); úseky N58 a #375 přepsané na nový tvar řádku
  (chycené dál).
- **Nápověda a texty:** Detail mezivýpočtů (`src/ui/detail_ui.js`) popisuje
  odpočet podle modelu; příručka (světlík nad dveřmi); podklad #149
  (13. rozdíl M1 × M2); `nastroje/porovnani_modelu.js` — vzor G a složka
  „Montáž — hodiny navíc za světlík nad dveřmi“.

### Překlady dodatkových textů do cizojazyčné nabídky, K18-N96

Větev `claude/k18-n96-dodatky-preklady` (nad `test-draft` 643faa8, v30.9.4).
Nález K18-N96, J. V. ho zvýšil na STŘEDNÍ: v ostrém ceníku je u SKN
skutečná firemní věta, slovník ji nezná, takže v každé anglické, německé
i francouzské nabídce zůstala česky (v30.9.4 o tom jen varovala kontrola
`dodatekCesky`). Firemní věty do slovníku nepatří — překlad dodá
administrátor. Roadmapa #379 (navazuje na #267) hotovo.

**Číselník dodatkových textů (Ceník OCK)**
- Pod českým textem položky jsou pole **EN / DE / FR** (nepovinná, jen
  administrátor; obchodník vidí vyplněné překlady jako text). Každé pole se
  uloží hned po opuštění (`onlinePopisJazykyUloz` → `POST /api/popisy
  { klic, jazyky }`), český text se tím nemění. Bez českého textu se pole
  nekreslí.
- V Kalkulaci OCK pod polem dodatkového textu štítek „Překlad do nabídky:
  EN, DE…", má-li text v zakázce překlad.

**Data a nabídka**
- Vedle `cenik.popisy` stojí `cenik.popisyJazyky` (klíč → `{ en, de, fr }`),
  společná mapa na serveru nese `jazyky` vedle `texty`. Starší data platí
  beze změny.
- Překlad patří ke konkrétnímu českému znění: do výchozího ceníku
  i rozpracované zakázky se doplní jen k témuž textu (`popisyVlij`,
  `popisyJazykyDoplnChybejici`, otevření zakázky v `cenik_stari.js`),
  přepis textu v zakázce překlady u položky zahodí (`popisJazykySrovnej`
  v `popisSet`). Existující překlad zakázky se nepřepisuje.
- Výpočet dává překlady příplatku jako `popisNabidkaJazyky` (jen když
  existují — výstup bez nich je beze změny, Model 1 netknutý), takže se
  zmrazí s odeslanou nabídkou: co odešlo, to drží.
- `nabidkaData` v EN/DE/FR tiskne překlad jazyka tisku — online náhled
  i Word jdou toutéž cestou. Bez překladu dosavadní chování (slovník →
  jinak česky) a varování `dodatekCesky` jen tehdy; jeho text nově radí
  doplnit překlad v číselníku.

**Server**
- `/api/popisy`: tvar `{ klic, jazyky }` bez `text` mění jen překlady
  (po jazycích, prázdný smaže), celá mapa smí nést `jazyky`. Očista
  `popisyJazykyOciste` (src/cenik.js, týž kód v prohlížeči): jen klíče
  en/de/fr, jen řetězce, řídicí znaky pryč (zalomení → mezera), strop 300
  znaků jako u českého textu, překlad položky bez českého textu se zahodí
  (smazání českého textu vezme překlady s sebou). Práva jako u českého
  textu (jen administrátor).
- B112: `popisyJazyky` je volný text ceníku zakázky (jako `popisy`) —
  obchodníkovi se kvůli překladům odneseným z výchozího ceníku uložení
  neodmítne.

**Testy**
- `src/test_n96_dodatky_jazyky.js` (nová sada, 35 testů): před opravou
  15 + 3 FAIL, po opravě 35 OK.
- `netlify/test_prava.mjs`: blok N96 (10 testů) před opravou 4 FAIL a pád
  sady, B112 `popisyJazyky` před opravou 403; po opravě 645 prošlo, 0 selhalo.
- `overit_online.mjs` oddíl 4a2b (7 testů): se starým UI FAIL „pole EN,
  DE a FR", po opravě 197 OK.
- Mutace serveru: 3 nové (N96), filtrovaný běh 3/3 chycené. Mutace jádra:
  N96 kontrola upravena na nový kód + 2 nové; filtrovaný běh `k18-n96`
  5/5 chycených.

---

### Smlouvy o dílo podle aktuálních šablon: K18-N100, K18-N101, dvojí procento

Zadání J. V. 1. 10. 2026 (úkoly 3 a 4): „připrav návrh úpravy sod a aktualizaci
online generátoru cenových nabídek a sod, aby funkčně odpovídal aktuálním
šablonám" + nálezy K18-N100 a K18-N101 z 18. kola na ostré (v30.9.1).
Větev `claude/sod-generator-sablony` z `test-draft` (643faa8). Rozbor
symbolů všech aktuálních šablon a návrh pro J. V. je v artefaktu (odkaz
v PREDAVKA.md); šablony v repozitáři nejsou.

**K18-N100 — SoD realizace: záruka, splátky, předání k montáži**
- Záruka z krycího listu OCK do `{{SOD_ZARUKA_MESICU}}` (jen číslo, šablona
  píše „měsíců" sama); ruční přepis platí, zamčená varianta drží odeslané.
- Splátky z TÉHOŽ platebního kalendáře jako nabídka (`kryciPlatebniKalendar`,
  nová `kryciSodPlatby`): šablona v1 (čtyři pevné věty) dostane 1 ← záloha,
  2 ← dílčí faktura, 4 ← konečná; věta 3 (druhá dílčí platba, kterou krycí
  list nemá) a věta zálohy při „Bez zálohy" zmizí celé. Měsíční fakturaci
  v1 vyjádřit neumí — smlouva nevznikne a řekne proč.
- Nová šablona **SoD realizace v2** (`node nastroje/vyrob_sablony.js
  --sod-real <podklady>`): místo čtyř vět jeden odstavec
  `{{SOD_PLATEBNI_KALENDAR}}`, aplikace ho zopakuje za každou splátku
  (bez zálohy = dvě věty, měsíční = věta o měsíční fakturaci).
- Pole krycího listu „Ukončení montáže šachty a předání montáži výtahu"
  plní `{{SOD_TERMIN_PREDANI_K_MONTAZI}}`.

**K18-N101 — SoD projekce: platby k nenabízené činnosti, součet**
- Tester zkoušel P18 na ostré **v30.9.1** (před plánem plateb, šablona
  SOD_PROJEKCE v1). Ve v30.9.4 zbývalo: věta staré šablony o platbě, kterou
  plán nemá, zůstala s `{{SODP_PLATBAn_KC}}` (u projekce bez zaměření
  „… při předání 2D výstupů ze zaměření"); ruční splátky odeslané nabídky
  z doby před plánem se proti ceně díla nekontrolovaly.
- Generátor Wordu umí odstranit odstavec, o kterém builder řekne, že do
  dokumentu nepatří (`odstavcePryc`, `odstranOdstavceSeSymboly`); stará
  šablona tak nese jen věty plateb, které plán má.
- Se šablonou v ruce builder vždy kontroluje součet plateb proti ceně díla
  (plán i ruční splátky); ruční splátka k nenabízené činnosti smlouvu
  zastaví s vysvětlením. Náhled bez šablony se neodmítá.

**Dvojí procento ve smlouvách** — šablony SoD píšou „{{PODM_POKUTA_SPLATNOST_PROC}} %",
symbol ale nese „0,05 %" → „0,05 % %". Generátor znak z hodnoty vypustí,
když za symbolem v témže odstavci % následuje.

**Rozhodnutí J. V. 1. 10. 2026** (k návrhu SoD: souhlas s výchozími
odpověďmi, u bodu 10 změna) — ve větvi `claude/sod-generator-sablony`:
- Krycí list OCK, sekce **Termíny** — nová nepovinná data bez předvyplnění,
  pořadí podle průběhu stavby: *Finální podklady od dodavatele výtahu do*
  (`{{SOD_TERMIN_PODKLADY_VYTAH}}`, jen šablona v2), *Stavební připravenost
  zákazníka do* (`{{SOD_TERMIN_PRIPRAVENOST}}`), *Konec montáže ocelové
  konstrukce* (`{{SOD_TERMIN_MONTAZ_DO}}`), *Opláštění od / do*
  (`{{SOD_TERMIN_OPLASTENI_OD/DO}}`), *Osazení šachetních dveří zákazníkem
  do* (`{{SOD_TERMIN_DVERE}}`). Prázdné pole symbol neplní (zůstane `{{…}}`),
  datum jde do smlouvy jako DD.MM.RRRR.
- Sekce „Smlouva o dílo — podpisy a kopie (SoD realizace)" se jmenuje
  **„Smlouva o dílo (SoD realizace)"** a přibyly v ní: **místo plnění**
  (výběr bytový dům / rodinný dům / administrativní budova / jiné znění, bez
  předvyplnění → `{{SOD_MISTO_PLNENI_DRUH}}`; výběr bez předvyplnění začíná
  volbou „— nevybráno —"), **denní pokuta za prodlení zákazníka** (stavební
  připravenost, převzetí díla; bez předvyplnění → `{{SOD_POKUTA_DENNI}}`)
  a **datum podpisu smlouvy** (předvyplněné datem tisku →
  `{{SOD_DATUM_PODPISU}}`; zamčení varianty ho NEzmrazí — smlouva tištěná
  později nese den tisku, ne den odeslání nabídky; ruční přepis platí).
  Nic z toho nejde do cenové nabídky (sekce nejsou v `KRYCI_NABIDKA_SEKCE`).
- **Pokuta za prodlení zhotovitele** ve šablonách v2 z krycího listu:
  SoD realizace `{{PODM_POKUTA_DODAVKA_PROC}}` (prodlení dodávky), SoD PROJ
  `{{PODM_POKUTA_TERMIN_PROC}}` (prodlení s odevzdáním); věta o prodlení
  objednatele s placením zůstává se splatností. Pokuta „0" (i „0 %",
  „bez pokuty") větu ze smlouvy vypustí (`odstavcePryc`, jen když ji šablona
  má), vlastní znění bez procenta nechá symbol viditelný `{{…}}`. Šablony
  v1 beze změny.
- **Výroba šablon v2** (`nastroje/vyrob_sablony.js --sod-real / --sod-proj`):
  přepojení symbolu pokuty ve větě o prodlení zhotovitele a v SoD realizace
  pevné datum „19.06.2026" ve větě o podkladech dodavatele výtahu →
  `{{SOD_TERMIN_PODKLADY_VYTAH}}`. Datum je v XML rozdělené do běhů — přepisuje
  se po znacích, formátování zůstává; když ve větě není právě jedno datum na
  jejím konci, výroba skončí chybou. Skript vypíše, co nahradil, a ověří
  symboly i XML.

**Testy:** `src/test_sod_realizace.js` (nová sada, 25: před opravou 10
selhalo a sada spadla, po opravě 0), `src/test_plan_plateb_sod.js`
(oddíl 7, 11 nových: před opravou 8 selhalo, po 0), `src/test_docxgen.js`
(3 nové: před 1 selhal, po 0), `overit_sod.mjs` se skutečnými šablonami
(4 nové: před opravou 2 z 31 selhaly, po 31 OK). Mutace jádra: nový úsek
K18-N101 (plan_plateb.js) — chycená. K rozhodnutí J. V. 1. 10.:
`src/test_rozhodnuti_sod.js` (nová sada, 72: před úpravou 25 selhalo
a sada spadla, po úpravě 0), `src/test_sod_realizace.js` (výroba v2 s novými
kotvami: před 1 selhal, po 0), `overit_sod.mjs` (18 nových nad skutečnou
šablonou v1, v2 z ní vyrobenou a krycím listem v aplikaci: před úpravou 12
z 39 selhalo a harness spadl, po úpravě 49 OK).

### Zábrany z kontroly před nabídkou blokují dokumenty (#377)

Větev `claude/zabrany-blokuji-dokumenty` nad `test-draft` (643faa8, v30.9.4).
Pokyn J. V. 1. 10. 2026 k návrhu #377: „2. je za mě OK, nepotřebujeme k tomu
nález". Pravidla se zábranou psala „Dokument nevznikne, dokud se to
neopraví", ale brána dokumentů `dokumentZabrana` je nečetla — zdvih −5 m
i 1 000 000 000 m dal nabídku (ověřeno ve v30.9.4).

**Co se změnilo**
- `kontrolyZabranaDokumentu(vysl, typ)` v `src/kontroly.js` rozhoduje, který
  dokument která zábrana zastaví; nález nese `strany` (OCK / PROJ):

  | zábrana | zastaví |
  |---|---|
  | `rozmery` (i zdvih nad 99 m), `profilNeznamy`, `sleva` nad stropem | nabídka OCK (Word i náhled/tisk), SoD OCK, krycí list OCK |
  | `slevaProj` nad stropem | nabídka PROJ (Word i náhled/tisk), SoD PROJ, krycí list PROJ |
  | `zapornaPolozka`, `cenaNula` | dokumenty té strany, kde nález je |
  | `ukazkovyCenik` (prázdný), `planPlateb100/Soucet` | beze změny — vlastní brány |
  | plná moc | žádná zábrana z kontrol |
  | „Kompletní náhled podkladů" | nic — kontrolní pohled na vstupy, ne dokument |

  Pravidla nad symboly šablon stahovanými na pozadí (`slevaWord`,
  `platbyWordOck`, `slevaWordProj`, `polozkyNavicWordProj`, `cenaWordProj`,
  `planPlatebWordProj`) a `dodatekCesky` zůstávají varováním — neblokují.
- `dokumentZabrana(typ, varianta)` (`src/ui/ukazkove_ui.js`) se ptá kontrol nad
  variantou, ZE KTERÉ dokument vzniká (`kontrolyStavVarianta` v
  `src/ui/kontroly_ui.js`; řídící varianta po odpovědi „Ne" se posoudí nad
  vlastními daty, zamčená nad zmrazeným výsledkem).
- Tlačítka dostala typ dokumentu (`ukazkoveZabranaAttr(typ)`): náhled a Word
  nabídky OCK i PROJ, SoD OCK a PROJ, plná moc, tisk krycích listů. Hláška =
  název pravidla + text nálezu, stejná v bublině zhasnutého tlačítka i při
  pokusu o tisk (`dokumentZabranaHlas` — hláška místo „Chyba:" z registru).
  Vedlejší účinek typu u tlačítek: vadný plán plateb PROJ teď zhasne
  i tlačítka nabídky a smlouvy PROJ (do teď zůstala živá a zastavilo je až
  generování).
- Panel kontrol značí zábrany ⛔ (červeně) a pod seznamem říká, že dokument
  nevznikne a zábrana se neodklepává; „Beru na vědomí" zůstává pro varování.
- Příručka (kapitola 23 a slovníček hlášek): dokument nevznikne, dokud
  zábrana trvá.
- Nová zakázka má rozměry nulové = zábrana `rozmery`: dokumenty OCK vzniknou
  až po vyplnění rozměrů. Harnessy, které tiskly z čerstvé zakázky
  (`overit_dialogy`, `overit_lista`, `overit_nabidky_dph`, `overit_online`,
  `overit_plan_plateb`, `overit_sod`), proto vyplní rozměry vzorové šachty
  (nabídky DPH i zkušební ceník OCK; P2 v `overit_online` bránu vypne — testuje
  dotaz na odemčení, ne zábrany).

**Testy:** `src/test_kontroly.js` +15 (před opravou 1 selhání — funkce
chyběla, po opravě 130/0); nový `overit_zabrany_dokumenty.mjs` (před opravou
11 selhání z 24, po opravě 24/0); mutace jádra +5 úseků „#377" (kontroly.js,
`--kontrola` 116 úseků v pořádku, běh jen úseku #377: chycených 5 z 5).

**Otázka pro J. V.:** zábrana platí i pro zamčenou (odeslanou) variantu —
dotisk odeslané nabídky s historicky „neplatnými" daty neprojde (cesta: klon
a oprava). Výchozí odpověď: tak to nechat.

## v30.9.4 — světlíky u šachetních dveří (#375), nálezy 18. kola, platební podmínky OCK, zdvih nejvýš 99 m (30. 9. 2026)

Pokyn J. V. 30. 9. 2026: „co máme aktuálně v draftu pošli už do testu"
(`test` = v30.9.3, cd7a1ec), „s tvými návrhy řešení bočních světlíků
souhlasím", odpočet −0,2 h u nadsvětlíku „zajistí stavba" zrušit, svázat
zaměření v kalkulaci s položkou krycího listu, opravit K18-N92 až N97,
opláštění po stěnách „změň na standard", měsíční fakturaci „prověř a
nastav", maximální zdvih 99 m. Práce ve čtyřech paralelních větvích
z `test-draft`, sloučených v integrační větvi `claude/davka-k18-svetliky`:
`claude/svetliky-u-dveri-375` (#375), `claude/k18-drobnosti` (B1–B3),
`claude/k18-nalezy-word-preklady` (N92, N93, N95–N97) a
`claude/ock-platebni-podminky-nabidka` (N94 + měsíční fakturace, #367
etapa A část 1). Roadmapa #375 a #376 hotovo, #367 doplněno, nová #377.

**Světlíky u šachetních dveří (#375)**
- Světlíky na bocích dveří mají tytéž volby jako světlík nad dveřmi (bez,
  sklo, plech, materiál opláštění, zajistí stavba); nová zakázka začíná na
  „bez". Pod nimi pole **Celkem světlíků na bocích dveří** — automaticky
  nástupiště × 2, ručně se štítkem „ručně" a ↺ (`bokyPocet*`,
  `Z.svetlikyBokyKs`).
- Ocenění po dveřích (dveře se dvěma / jedním / žádným světlíkem), plocha
  min(N, D) × mezera × 2,2, konstrukce na kus světlíku; plech 8,5 kg/m²
  lakovaný z obou stran. **Sklo** = sklo stěny s dveřmi (po stěnách
  převažující sklo stěny A, jinak standardní sklo čelní stěny),
  **materiál opláštění** = převažující materiál stěn B, C, D (Cetris za m²
  bez lišt a terčů), **zajistí stavba** = naše konstrukce, výplň 0 Kč.
  Po stěnách už světlíky nejsou v pásech stěny A, mají vlastní řádky.
- Nadsvětlík **„zajistí stavba" už neubírá 0,2 h montáže na nástupiště**
  (oba modely); „bez" ubírá dál (Model 1 = Excel).
- Kontrola **bokyDveri** (31. pravidlo): mezera vedle dveří při „bez",
  N = 0, N > 2 × dveře, N < dveře. Specifikace: nový řádek SVĚTLÍKY
  U ŠACHETNÍCH DVEŘÍ a symbol `{{TS_SVETLIKY_DVERI}}` (šablona CN ho zatím
  nemá); překlad EN/DE/FR je návrh ke kontrole. Detail výpočtu ukazuje
  počet, rozložení a materiál. Server ověřuje `nadDvermi`/`bokyDveri`
  výčtem a `svetlikyBokyKs` jako číslo.
- Starší zakázky se převedou beze změny ceny (`svetlikyBokyMigrace`
  v importZakazka u všech variant; ověřeno 29 760 konfiguracemi proti
  předchozímu jádru, commitnutý test 192 zadání). **Cena se mění** jen
  u rozpracovaných zakázek: materiál opláštění u světlíků (dřív sklo
  čelní stěny), sklo po stěnách s nesklenou stěnou A, nadsvětlík
  „zajistí stavba" (+0,2 h × nástupiště) a oprava chyby (strany 0
  s uloženou výplní „plech" už neúčtují práci na plech). Zamčené
  varianty drží zmrazený výsledek.

**Drobnosti B1–B3 (rozhodnutí J. V. 30. 9. 2026)**
- **B1 — zaměření:** ZAMĚŘENÍ PROSTORŮ 3D SKENEREM ve specifikaci je
  odvozené jako statika z položky ZAMĚŘENÍ 3D SKENEREM v Režii OCK
  (`tsSken3dVCene`; množství 0 nebo vyřazení = „ne"); řádek **Zaměření
  strojovna** krycího listu OCK je odvozený taky (`odvozene` v
  `KRYCI_SEKCE`, jen ke čtení, dřívější ruční „Ano" se ohlásí jako
  neplatné; zamčená varianta drží, co se odeslalo).
- **B2 — po stěnách není atyp:** `standardVyhodnot` už nehlásí režim po
  stěnách jako mimo standard; posuzuje se stejně jako jednotné opláštění.
  Automaticky zaškrtnutý ATYP uklidí `standardAtypUklid`; ručně
  zaškrtnutý ATYP ani odeslané nabídky se nemění.
- **B3 — zdvih nejvýš 99 m (K17-N91):** `KONTROLY_ZDVIH_MAX_M = 99`
  v pravidle „rozmery" (zábrana), pole Zdvih má max 99 a upozornění;
  hodnota se neořezává. Server beze změny (odmítnutí by zastavilo
  ukládání rozpracované zakázky).

**Nálezy 18. kola**
- **K18-N92:** šablona PROJ v4 (`nastroje/vyrob_sablony.js --proj-v4`)
  má pod seznamem geodetických prací cenovou tabulku v bloku
  `{{CENA_GEODET_ZAC}}…{{CENA_GEODET_KON}}` se symbolem
  `{{PROJ_CENA_GEODET_BLOK}}` (bez geodetu blok zmizí). Kontrola
  **cenaWordProj**: nabízená činnost s cenou, pro kterou šablona nemá
  symbol → varování.
- **K18-N93:** záruka v cizojazyčné online nabídce OCK jde přes překlad
  („Warranty 60 months").
- **K18-N94 + měsíční fakturace (#367 etapa A část 1):** nabídka OCK
  tiskne platební kalendář z krycího listu — splátka s 0 % se vynechá
  a doklady se přečíslují, způsob fakturace „Měsíční" dá větu
  „Fakturace probíhá měsíčně podle skutečně provedených prací." místo
  50/40/10 (`kryciPlatebniKalendar`, `{{PODM_PLATEBNI_KALENDAR}}`,
  `{{PODM_FAKTURACE_MESICNE}}`, `rozvinRadkyZaRadek` v docxgen). Umí to
  šablona **CN v14** (`--cn-v14`, 112 symbolů); se starší šablonou
  varuje kontrola **platbyWordOck**. Odeslaná varianta bez značky
  `pravidlaPlateb` tiskne věty v13 jako dřív.
- **K18-N95:** úvod a termíny nabídky PROJ v EN/DE/FR přeložené
  (23 hesel slovníku, návrh ke kontrole); mutace šablony PROJ v4 bez
  napůl českých řádků.
- **K18-N96:** kontrola **dodatekCesky** — dodatkový text z ceníku, který
  slovník nepřeloží, v cizojazyčné nabídce → varování s výčtem položek.
- **K18-N97:** materiál opláštění po stěnách vyjmenuje specifikace
  i nabídka se stěnami („Sklo VSG 4.4.1 (stěna A); Cetris (stěny B, D)…").

**Šablony (mimo repozitář, předány J. V.):** Sablona_NABIDKA_CN_v14.docx
a Sablona_NABIDKA_PROJ_v4.docx, obě s mutacemi EN/DE/FR.

**Příručka:** světlíky u dveří, nadsvětlík „zajistí stavba", po stěnách
není atyp, platební podmínky OCK, 3D zaměření a Zaměření strojovna;
`podklady/OBRAZOVKA_OPLASTENI.md` opravený.

**Zjištěno, neopraveno (#377, čeká na J. V.):** zábrany z kontroly
(rozmery včetně stropu zdvihu, profilNeznamy, zapornaPolozka, cenaNula…)
neblokují tlačítka dokumentů — `dokumentZabrana()` hlídá jen ukázkový
ceník a plán plateb PROJ.

Testy (pojistka proti prázdnému testu, podrobně v commitech větví):
test_svetliky_boky 19/88 → 107/0, test_platby_ock 11/47 → 77/0,
test_k18_nalezy (oddíly N92–N97) vše selhávalo → 71/0,
test_sablona_proj_v4 25/12 → 40/0, test_specifikace_cena 57/14 → 71/0,
test_kryci 119/3 → 127/0 (dvě dávky), test_oplasteni_steny 26/11 → 37/0,
test_kontroly (31 pravidel), overit_oplasteni 64/7 → 71/0,
overit_specifikace_cena 17/6 → 25/0, overit_zadani_detail 39/3 → 53/0,
overit_sablona (sekce v14) → 102/0, overit_lista → 31 pravidel.
Mutace jádra 88 → 111 úseků (+2 B3, +3 platbyWordOck, +3 N92, +3 N96,
+12 #375), všechny nové chycené.

**Ověřeno celým kolem** (`nastroje/testovaci_kolo.sh`, nad d7e2f32): VŠE ZELENÉ
za 62 min 5 s — sady 207 prošlo, 0 selhalo, 1 přeskočeno (test.js); mutace
jádra 111 z 111; mutace serveru 207 z 207; statické kontroly 3 z 3. Po kole
strom čistý. Převedeno do `test-draft` (fast-forward), `test` zůstává na
v30.9.3 a `main` na v30.9.1.

---

## v30.9.3 — Q5: dřívější záloha se přepne na předvolbu sama; `main` = v30.9.1 (30. 9. 2026)

Větev `claude/etapa-b-q5-zaloha-automaticky` (z `test-draft` v30.9.2).
Rozhodnutí J. V. 30. 9. 2026 k otázkám etapy B: **Q5 — „zálohu přepni
automaticky"**; Q9 a Q10 potvrzeny; Q1, Q2, Q4, Q11 a Q12 bez námitky
(platí výchozí návrh); body revize a (brána v korunách) a b (server
nekontroluje tvar plánu ve variantě) „zatím OK"; **Q8 „ponechat"** —
firemní Standard po činnostech se dál mění převzetím splátek z krycího
listu otevřené zakázky (tlačítko v Nastavení), bez zvláštního editoru. Týž den na pokyn J. V. „pošli aktuální test do main": **`main`
fast-forward na `test`** (fde25ff, v30.9.1 — tag i release existují).

- **Dřívější záloha krycího listu PROJ** (uložená volba „Bez zálohy" /
  „Záloha 30 / 50 / 70 %") se u rozpracované zakázky, jejíž plán plateb
  ještě nemá předvolbu, přepne na předvolbu „Záloha X % + zbytek po
  předání" sama — do té doby ji nabízelo tlačítko. Líně jako ruční splátky
  (`planZalohaZeStarych` v `planPlatebVarianty`, bez zápisu do dat); první
  zápis do plánu převod zhmotní. Plán s vlastní předvolbou ani odeslaná
  nabídka z doby před plánem se nepřepínají; upravené splátky zůstanou.
  Vlastní znění, které předvolba neumí (třeba 40 %), se jen ohlásí.
  Tlačítko „Použít jako předvolbu" a `planKlpZalohaZeStare` zrušeny.
- Příručka: věta u hesla „Plán plateb".
- Testy (pojistka proti prázdnému testu): nové testy nad kódem bez úpravy
  selhaly — `test_plan_plateb_kryci` 6 z 65, `overit_plan_plateb` 2 z 47;
  po úpravě prošly. Mutace jádra +1 „dřívější záloha se nepřepne"
  (chycená, kotev 88).

**Ověřeno celým kolem** (`nastroje/testovaci_kolo.sh`, nad 8cb2534): VŠE ZELENÉ
za 71 min 53 s — sady 204 prošlo, 0 selhalo, 1 přeskočeno (test.js); mutace
jádra 88 z 88; mutace serveru 207 z 207; statické kontroly 3 z 3. Po kole
strom čistý. Převedeno do `test-draft` (fast-forward), `test` a `main`
zůstávají na v30.9.1.

---

## v30.9.2 — etapa B platebních podmínek: plán plateb projekce (30. 9. 2026)

Větev `claude/etapa-b-plan-plateb-v30.9.1` (z `test-draft` v30.9.1, pokyn
J. V. 30. 9. 2026 „pokračuj etapou B v nové větvi … výstup pošli zatím do
test-draft"). Roadmapa **#367** (etapa B hotová, etapa A zbývá) a **#366**
(bod P9.3 — dopočet plateb SoD PROJ). Rozhodnutí J. V. 29. 9. 2026: čtyři
předvolby, výchozí Standard po činnostech, splátky SoD PROJ se stejným
milníkem sečtené, šablona SoD PROJ se seznamem plateb jedním symbolem.
Plán plateb je JEDEN (krycí list PROJ); nabídka PROJ, tištěný krycí list,
smlouva o dílo PROJ a Nastavení → Firma ho jen čtou.

- **Jádro `src/plan_plateb.js`** (CORE za `zpracovatel.js`, i mezi jádry
  mutačního testu): katalog 14 milníků, předvolby Standard po činnostech
  (= dnešní procenta nabídky), Záloha + zbytek po předání (0/30/50/70 %),
  100 % po dokončení stupně, Vlastní; dopočet plateb smlouvy (procento ×
  cena činnosti po slevě, celé koruny, zaokrouhlení nese poslední splátka
  činnosti, stejný milník sečtený, ruční přepis, osiřelé přepisy); kontroly
  (100 % u činnosti, kladná procenta, známý milník, součet = cena díla);
  plán varianty (rozpracovaná → firemní plán, odeslaná → snímek, odeslaná
  bez snímku → jako dřív); snímek při prvním zamčení; převod starších
  ručních splátek; kontrola tvaru firemního plánu.
- **Nastavení → Smlouvy / Šablony → Plán plateb projekce** (administrátor):
  výchozí předvolba, záloha, Standard po činnostech (převzetím z otevřené
  zakázky — výchozí návrh Q8), milník „po předání", katalog milníků (text,
  přidat, odebrat jen nepoužitý), vady plánu. Zveřejňuje se s firemními
  údaji (`firmaKZverejneni`, kontrola tvaru na serveru i v prohlížeči).
- **Krycí list PROJ**: karta Plán plateb (předvolba, splátky nabízených
  činností — procento, milník z katalogu nebo vlastní text, ↑ ↓ ✕,
  + splátka, ↺ předvolba, součet 100 %, nedostatky) a v sekci „Smlouva
  o dílo — splátky" tabulka plateb (milník, složení, dopočet, ruční částka,
  ↺, součet proti ceně díla). Záloha, fakturace po stupních, způsob
  fakturace (nově z předvolby, Q10) a ruční splátky 1–8 zůstávají jen
  u odeslané nabídky z doby před plánem; tisk nese řádky „Plán plateb".
- **Nabídka PROJ** (online i Word): bloky „PLATEBNÍ PODMÍNKY …" jen
  nabízených činností z plánu (DPS a EZC zvlášť, nově i projednání
  a geodet); symboly `{{PROJ_PLATBY_<ČINNOST>}}` a `{{PROJ_PLATEBNI_PODMINKY}}`
  pro šablonu **PROJ v4** — vyrobí ji `node nastroje/vyrob_sablony.js
  --proj-v4 <podklady>` z PROJ v3 (i EN/DE/FR). Překlady nadpisů, řádků
  „Platba …" a vzor „N % z nabídkové ceny za …".
- **Smlouva o dílo PROJ**: `{{SODP_PLATEBNI_KALENDAR}}` — odstavec (odrážka)
  za každou platbu větou „Platba ve výši … + DPH proběhne …"; šablonu
  **SoD PROJ v2** vyrobí `node nastroje/vyrob_sablony.js --sod-proj
  <podklady>` ze stávající. Stará šablona s osmi pevnými platbami dostane
  `SODP_PLATBAn_KC` u plateb se stejným milníkem; plán s platbou, kterou
  neumí, smlouvu nevyrobí (s vysvětlením).
- **Zábrany** (J. V.: dokument nevznikne, odklepnout nejde): pravidla
  `planPlateb100` a `planPlatebSoucet`, varování `planPlatebWordProj`
  (šablona bez plánu a plán jiný než Standard); skutečná brána v
  `dokumentZabrana(typ)` pro nabídku PROJ (Word i náhled) a smlouvu o dílo
  PROJ. Pravidel kontroly 27.
- **Převod starších zakázek** (Q5): ruční splátky `sodpPlatba1–8` platí jako
  ruční částky plateb se stejným milníkem (nečitelná se ohlásí), dřívější
  záloha se nabídne tlačítkem jako předvolba; nic se nepřepisuje samo.
- Výpočet cen činností nabídky PROJ vyčleněn do `nabidkaProjCeny` (beze
  změny chování) — plán počítá z téže ceny po slevě jako nabídka.

**Výchozí návrhy použité do rozhodnutí J. V.** (podklad oddíl 5): Q1
projednání 100 % po předání vyjádření OPP HMP; Q2 geodet 100 % po předání
zaměření; Q4 celé koruny, poslední splátka dorovná; Q5 starší zálohu
nepřepínat, nabídnout; Q8 Standard převzetím z otevřené zakázky; Q10
způsob fakturace z předvolby; Q11 řádek smlouvy větou dřívější šablony;
Q12 řádky „Platba … / N % z nabídkové ceny za …".

**Testy (pojistka proti prázdnému testu — každý doložen selháním před
změnou ve zprávách commitů):** `src/test_plan_plateb.js` 65,
`src/test_plan_plateb_kryci.js` 41, `src/test_plan_plateb_sod.js` 24,
`src/test_sablona_proj_v4.js` 20, `src/test_firma.js` +8,
`netlify/test_funkce.mjs` +2, `overit_plan_plateb.mjs` 40 (prohlížeč),
`overit_sod.mjs` (SoD PROJ z nové šablony), upravené `test_kontroly`,
`test_kryci_proj_model`, `test_nabidka_proj`, `overit_lista` (27 pravidel).
Mutace jádra +5, serveru +1 — chycené všechny (mutace „neoceněná činnost"
byla nejdřív NECHYCENÁ, doplněn cílený test).

**Revize před sloučením (30. 9. 2026).** Dvě nezávislé revize celé etapy
(výpočet a dokumenty; obrazovky, zámek a ukládání) — obě vážné vady našly
obě. Opraveno v 843ff63, verze zůstává v30.9.2 (sestavení f4094a5 nikam
neodešlo):
- **Snímek plánu u klonu a po odemčení** (blokující): snímek se bere při
  každém prvním zamčení. Klon odeslané varianty i varianta odemčená
  správcem nesly snímek předlohy — zamčené pak tiskly a smlouvu dopočítaly
  z cizího plánu a činnost navíc zablokovala zábrana natrvalo.
- **Brána dokumentu hlídá variantu, ze které dokument vzniká** (závažná):
  Word nabídky PROJ i smlouva po odpovědi „Ne" vznikají z řídící varianty;
  brána kontrolovala otevřenou (vadnou řídící pustila, zdravou zastavila
  kvůli jiné). Plán, který nejde spočítat, dokument zastaví.
- menší: převod dřívější zálohy pozná uložené „Záloha 30 %" (tlačítko jen
  u 0/30/50/70 %, před zahozením upravených splátek se zeptá); zamčená
  varianta pod firemním Standardem se nehlásí „upraveno"; varování
  `planPlatebWordProj` srovnává se Standardem z kódu (co tiskne šablona
  v2/v3 — firemní Standard i přepsaný text milníku varují); symboly
  `{{PODM_…}}` nabídky PROJ jen z viditelných polí (skrytá záloha a
  fakturace po stupních se neplní, způsob fakturace z předvolby); smlouva
  starší odeslané nabídky s novou šablonou dostane seznam plateb z ručních
  splátek a prázdný seznam symbol nesmaže; poškozený snímek ani firemní
  plán nic neshodí (pole splátek oříznuté na 10, Nastavení s vysvětlením
  a „Vrátit výchozí"); odebrání nepoužitého milníku z katalogu se zeptá.
Nové testy napsané před opravou nad f4094a5 selhaly (`test_plan_plateb_kryci`
10 z 56, `test_plan_plateb_sod` 5 z 30, `overit_plan_plateb` 8 z 49, nový test
v `test_kryci_proj_model`), po opravě prošly; mutace jádra +2 (kotev 87).

**Ověřeno celým kolem** (`nastroje/testovaci_kolo.sh`): nad f4094a5 (před
revizí) VŠE ZELENÉ za 70 min 40 s — sady 204 prošlo, 0 selhalo,
1 přeskočeno (test.js — shoda s Excelem není v exportu); mutace jádra 85
z 85; mutace serveru 207 z 207; statické kontroly 3 z 3. Nad 843ff63
(s opravami revize) VŠE ZELENÉ za 72 min 17 s — sady 204 prošlo, 0 selhalo,
1 přeskočeno; mutace jádra 87 z 87; mutace serveru 207 z 207; statické
kontroly 3 z 3. Po kole strom čistý, `if (false)` mimo zadání mutací a testy
nikde. Větev převedena do `test-draft` (fast-forward), `test` beze změny.

---

## v30.9.1 — sloučení do test-draft: opravy šesti nálezů 21. kola (B111, B96, B112, B97, B98, B99) (30. 9. 2026)

Na pokyn J. V. 30. 9. 2026 („pushni novinky do testu“) sloučena do
`test-draft` větev `claude/oprava-sesti-nalezu-v29.9.1` (hlava 148e1c4,
roadmapa **#373**) a výsledek převeden do `test`. Větev vznikla nad 9a48ee8
(v29.9.1 ve větvi `claude/pensive-curie-s6yzs3`, jen předávka — kód jako
v26.9.1), tedy před sloučením v29.9.4; její opravy nesly vlastní čísla
v29.9.2–v29.9.7, která se kryjí s čísly v `test-draft`. Záznamy větve jsou
proto níže jako podkapitoly s číslem „ve větvi“. Tag `v30.9.1`.
Rozpracovaná etapa B platebních podmínek (`claude/etapa-b-plan-plateb-proj`,
v29.9.5 ve větvi) zůstává ve své větvi, dokud nebude hotová.

**Při sloučení:**
- `netlify/lib/zakazka_kontrola.mjs` (sloučeno bez konfliktu, ověřeno
  čtením): kontroly B111 (záporné), B96 (zaokrouhlení) a B112 (ceník
  a přepisy) stojí za kontrolou typů polí a před kontrolou neznámého rozměru
  profilu (#372); obnova ze souboru (B98) a razítko `upravilJmeno` (P7) vedle
  sebe beze změny.
- Pravidel kontroly je 24 (23 z `test-draft` + `zapornaPolozka`), zábrany
  v pořadí rozmery, profilNeznamy, zapornaPolozka, cenaNula, sleva,
  slevaProj, ukazkovyCenik (`src/test_kontroly.js`, `overit_lista.mjs`).
- `netlify/test_obnova.mjs`: bloky #372 a B98 nesly stejná čísla zakázek
  (0790–0794, sdílená databáze sady) — B98 přečíslován na 0800–0804.
- `src/docxgen.js` exportuje `docxObsahZkontroluj` (B99) i
  `odstranPrazdneBloky` / `docxZnackyBloku` (P8A); sady mutací serveru nesou
  `test_rejstrik.mjs` i `test_zaporne.mjs`.
- Roadmapa: #373 hotovo, #374 (zbývající cesty třídy „koncová cena“) čeká;
  čísla z větve jsou v `test-draft` volná, nic se nepřečíslovalo.

**Ověřeno celým kolem** `nastroje/testovaci_kolo.sh` 30. 9. 2026 nad
sloučeným stavem (commit 6ee8e83): VŠE ZELENÉ (69 min 50 s) — kontrola
verze + sestavení ✓; sady 199 prošlo, 0 selhalo, 1 přeskočeno z 200
(test.js — shoda s Excelem není v exportu pro GitHub; overit_manual.mjs
a overit_sod.mjs běžely s podklady přes KNG_PODKLADY); mutace jádra
chycených 80 z 80; mutace serveru 206 z 206 (192 z `test-draft` + 14
z větve oprav); statické kontroly 3 z 3. Šablony pro harnessy: CN v13
(+EN/DE/FR) a PROJ v3.

### B99: šablony Wordu bez maker, vložených objektů a vnějších vztahů (ve větvi v29.9.7, 29. 9. 2026)

Šestý ze šesti nálezů 21. kola (větev `claude/oprava-sesti-nalezu-v29.9.1`).
Roadmapa #373.

**Nález B99 (střední, integrita dokumentů).** Server ověřil jen začátek ZIPu
(„UEsDB"), průvodce text, jazyk, symboly a strukturu XML; generátor
i překlad kopírují zbytek ZIPu beze změny. Syntetická šablona s
`word/_rels/settings.xml.rels` → `attachedTemplate`
`https://example.invalid/x.dotm` (`TargetMode="External"`) prošla
zveřejněním (200) i kontrolami průvodce a generátor ji přenesl do
vygenerované nabídky — EN nabídka by si u zákazníka stáhla cizí šablonu
s makry.

- **Nový modul `src/sablona_obsah.js`** (CORE v `build.py` hned za
  `sablony_online.js`, na serveru v `jadro_moduly.cjs` ve stejném pořadí):
  `sablonaObsahVadyZipu()` nad rozbaleným ZIPem, `sablonaObsahVady()` pro
  ArrayBuffer / base64. Odmítá vnější vztahy kromě hypertextových odkazů
  **http(s) a mailto** (mailto nese dnešní šablona PROJ — bez něj by
  neprošla; odkaz Word sám nestahuje), typy vztahů attachedTemplate,
  oleObject, package, aFChunk, vbaProject, frame, subDocument, části
  `word/embeddings/*`, `vbaProject*.bin`, ActiveX, typ obsahu macroEnabled
  a pole INCLUDETEXT, INCLUDEPICTURE, DDE, DDEAUTO (i rozdělená do běhů).
- Volá ho **server** při zveřejnění (`/api/sablony` → 400 s českou hláškou,
  co vadí; nečitelný ZIP je taky vada), **průvodce** (`sablKontrolaSouboru`,
  i „Nahrát vlastní verzi") a **generátor i překlad** (`docxVyplnSablonu`,
  `docxPrelozSablonu` — obrana do hloubky: odmítnout, ne tiše vyhodit).
- Dnešní firemní šablony (CN v13 + EN/DE/FR, CN v11, PROJ v2_opravena i v3,
  SoD realizace a projekce, plná moc) kontrolou projdou.
- Serverové sady posílaly jako šablonu jen řetězec „UEsDB…" — teď skutečný
  minimální .docx z generátoru (`test_sablony`, `test_funkce`, řádek matice
  v `test_prava`).

**Testy (pojistka proti prázdnému testu):** `src/test_sablona_obsah.js`
(nová, 27 kontrol; před opravou 1 prošlo / 1 selhalo — modul neexistoval,
s modulem bez zapojení 25 / 2), `netlify/test_sablony.mjs` (+3; před
opravou 19 / 3 — zveřejnění s attachedTemplate 200 → 22 / 0). Mutace
serveru +1 („kontrola obsahu šablony se na serveru nevolá") — chycená.
Harnessy s firemními šablonami: overit_sablona 60, overit_sablony_online
53, overit_sod 25, overit_nabidka_proj_word 51 — vše OK.

### B98: obnova ze souboru nepřebírá razítka zámku a odemčení (ve větvi v29.9.6, 29. 9. 2026)

Pátý ze šesti nálezů 21. kola (větev `claude/oprava-sesti-nalezu-v29.9.1`).
Roadmapa #373.

**Nález B98 (střední) — podvržený doklad na jméno jiného správce.** Obnova
ze SOUBORU zálohy převzala (a) razítko ověření nového zámku — zmrazený
výsledek se `zakladCena = 1` a razítkem „shoda" na hlavního správce se
zapsal jako shoda, ačkoli běžné uložení dá „nesouhlasi"; (b) odemčení
odeslané nabídky s razítkem na hlavního správce a libovolným datem. Soubor
jde upravit v editoru — přesně hrozba, kvůli které B27 zakázal obnovu účtů
a podpisů ze souboru.

- `netlify/functions/obnova.mjs` předává `zeSouboru` (zdroj = nahraný
  soubor, i po dávkách).
- `netlify/lib/zakazka_kontrola.mjs`: ze souboru se ověření každého nového
  zámku spočítá **vždy znovu** (`zamekOvereni`); nesouhlas se zapíše jako
  „nesouhlasi" a náhled obnovy ho ukáže u zakázky (`upozorneni`).
  **Odemčení, které v databázi není** (i u zakázky, která v databázi vůbec
  není), zakázku přeskočí s důvodem — výchozí návrh J. V.
- Obnova z **otisku** (serverová záloha, klient ji upravit nemůže) přebírá
  razítka dál, jak byla. Jedna kontrola pro uložení i obnovu (B72/P4) platí
  dál; kotva mutace P4 „obnova nedoplní ověření" přešla na nový blok.

**Testy (pojistka proti prázdnému testu):** `netlify/test_obnova.mjs`
oddíl „B98" (8 kontrol; před opravou 160 OK / 6 FAIL → 166 / 0; dvě kontroly
obnovy z otisku procházejí před i po — hlídají, že se nezměnila). Mutace
serveru +2 („obnova nechá ověření ze souboru", „obnova převezme odemčení
ze souboru") — chycené 2 z 2; mutace P4 ×5 dál chycené.

### B97: e-mailový klíč brzdy přihlášení už nezasáhne počítadlo adresy (ve větvi v29.9.5, 29. 9. 2026)

Čtvrtý ze šesti nálezů 21. kola (větev `claude/oprava-sesti-nalezu-v29.9.1`).
Roadmapa #373, #345. Vážnost střední (výchozí návrh, čeká na potvrzení J. V.).

**Nález B97 — anonym zablokoval přihlášení celé cizí adrese.** Počítadlo
e-mailu (klíč = e-mail malými písmeny) a počítadlo adresy (`ip:<adresa>`,
`ip6:<prefix>::/64`) ležela v témže úložišti `pokusy` bez předpony. 61×
„přihlášení" s e-mailem `ip:198.51.100.55` z jiné adresy zvedlo počítadlo
adresy oběti a ta dostala 429 i se správným heslem (od B75 se limit adresy
rozhoduje před ověřením hesla); totéž „Změnit moje heslo".

- `netlify/lib/sdilene.mjs`: e-mailový klíč nese předponu **`e:`**, funkce
  nad syrovým klíčem (`pokusyStavKlic`, `pokusyNeuspechKlic`,
  `pokusyResetKlic`, `pokusyUber`) a e-mailové (`pokusyStav`,
  `pokusyNeuspech`, `pokusyReset`) jsou oddělené. Migrace není potřeba —
  počítadla žijí čtvrt hodiny.
- `pokusyZacatek`: e-mail neplatného tvaru (`emailPlatny`) žádné e-mailové
  počítadlo nezakládá ani nezvedá; počítadlo adresy se započítá vždy.
  Odpověď stejná 401 jako u špatného hesla. Platí pro přihlášení
  i `mojeheslo`.
- Oprava B75 (429 před scryptem, IPv6 po /64, cizí úspěch nenuluje) platí
  dál; kotva mutace B75 „úspěch nuluje i adresu" přešla na
  `pokusyResetKlic`, aby dál zkoušela totéž.

**Testy (pojistka proti prázdnému testu):** `netlify/test_prihlaseni.mjs`
oddíl „B97" (7 kontrol; před opravou 45 prošlo / 5 selhalo → 50 / 0).
Mutace serveru +2 („e-mailový klíč bez předpony", „neplatný e-mail zvedá
e-mailové počítadlo") — chycené 2 z 2; mutace B75 ×3 dál chycené.

### B112: ceník varianty a skryté přepisy podle role hlídá server (ve větvi v29.9.4, 29. 9. 2026)

Třetí ze šesti nálezů 21. kola (větev `claude/oprava-sesti-nalezu-v29.9.1`),
zápisová strana B88. Roadmapa #373, #345, nová #374 (zbývající cesty třídy).

**Vysoký nález B112 — obchodník ručním požadavkem snížil cenu nabídky o
25–42 % bez schválení.** Přirážka varianty 0,20 → −0,10: OCK 980 000 →
735 000 Kč (−25 %); přirážka PROJ −0,30: 271 200 → 158 200 Kč (−41,7 %);
cena profilů 100 → 1 Kč/kg: −14,2 %; přepis množství hlavních položek
a vlastní % sekce PROJ −50 — vše 200. V prohlížeči `set('C.marze', -0.1)`
z konzole a běžné uložení → uloženo. Ceník a přepisy hlídala jen matice
zobrazení v UI.

- **Server:** `uloCenikProblemy()` v `src/uloziste.js` (přes
  `uloProVarianty()`), volaná hned za kontrolou B96, odmítnutí **403**
  „Ceník varianty smí měnit jen administrátor nebo role, které to povoluje
  matice zobrazení …". Administrátor smí vždy; ostatním rozhoduje matice
  uložená na serveru (`program/zobrazeni`, jinak výchozí): bez `tab.cenik`
  / `tab.cenikproj` musí každá hodnota ceníku OCK / PROJ být z uložené verze
  téže varianty, ze zveřejněného ceníku (platná i dřívější verze, složená
  pro řadu varianty, po týchž migracích jako import) nebo z jiné uložené
  varianty (klon); přirážka se uvolní právem `pole.prirazka`. Porovnává se
  po položkách — přepočet jen vybraných položek je běžná práce. Dodatkové
  texty (popisy) a sazba DPH se nehlídají. Přepisy (`mnozstviPrepis`,
  `cenyPrepis`, PROJ `prirazkaPct`, `sazbaPrepis`, `cenaPrepis`) smí měnit
  jen role s právem `sloupce.naklad` — v UI se zadávají jen ve sloupcích,
  které to právo ukazuje (i ruční množství příplatků). Varianta zamčená
  v uložené verzi se přeskakuje; bez zveřejněného ceníku se ceník nehlídá.
- `netlify/functions/zakazky.mjs` čte pro kontrolu matici zobrazení (jen
  u neadministrátora) a předává zveřejněné ceníky.
- **Testy upravené kvůli realistickým datům:** fixtury `test_prava.mjs`
  (`zakazkaCislo`, `zakazkaSCeny`) nesou ceník jako aplikace po přihlášení
  — platný zveřejněný; B26 (tvar `kid` trvalé položky) a očista značek
  ceníku v `test_funkce.mjs` ukládají pod administrátorem (trvalou položku
  i vlastní ceník varianty zakládá jen on).

**Testy (pojistka proti prázdnému testu):** `netlify/test_prava.mjs` oddíl
„B112" (28 kontrol; před opravou 608 prošlo / 15 selhalo → 623 / 0 —
všechny útoky i hranice rolí dnes 200), `overit_cenik_prava.mjs` (nový
harness, 6 kontrol; před opravou 4 / 2 — podvrh uložen, cena 735 000 Kč).
Mutace serveru +4 („ceník varianty se nehlídá", „přepis množství se
nehlídá", „matice se na serveru nečte", „zveřejněný ceník se nebere za
kandidáta") — chycené 4 z 4.

### B96: krok obchodního zaokrouhlení hlídá server (ve větvi v29.9.3, 29. 9. 2026)

Druhý ze šesti nálezů 21. kola (větev `claude/oprava-sesti-nalezu-v29.9.1`).
Roadmapa #373, #38.

**Vysoký nález B96 — obchodník krokem zaokrouhlení snížil cenu nabídky
skoro o polovinu bez schválení.** Varianta bez slevy s `zaokr = { krok:
⌊z/2⌋+1, smer: 'dolu' }`: cena OCK 980 000 → 490 001 Kč (marže −66 %),
uložení 200, nový zámek dostal „shoda" (zaokrouhlení do výsledku jádra
nevstupuje), rejstřík schvalování nic. Výčet `ZAOKR_KROKY`/`ZAOKR_SMERY`
platil jen pro `<select>`; `zaokrSetKrok(490001)` z konzole prošel.

- **Server:** `uloZaokrProblemy()` v `src/uloziste.js` (přes společnou
  `uloProVarianty()`), volaná hned za kontrolou B111. `data.zaokr`
  i `data.zaokrProj` musí být objekt s krokem z výčtu (číslo i číslo jako
  text) a směrem z výčtu; chybějící nastavení se toleruje, nic se
  nepřevádí. Odmítnutí 400 „… obchodní zaokrouhlení mimo nabídku (varianta
  X: zaokr.krok) …". Varianta zamčená v uložené verzi se přeskakuje.
  Sémantika `zaokrKrok` v jádře beze změny (princip dokladu).
- **UI:** `zaokrSetKrok`, `zaokrProjSetKrok`, `zaokrSetSmer`,
  `zaokrProjSetSmer` přijmou jen hodnoty z výčtu (jinak hláška); uložená
  hodnota mimo výčet se v `<select>` ukáže jako „mimo nabídku — nepovolené"
  místo zavádějícího „bez zaokrouhlení".
- **Detekce:** `nastroje/detekce_zneuziti.mjs` hledá i krok/směr mimo výčet
  (i v zamčených variantách).
- **Bod 4 (marže z koncové ceny i bez slevy)** jen jako návrh do
  `BEZPECNOST_MEZE.md` a `PREDAVKA.md` — nerealizováno, čeká na J. V.
- `overit_zaokrouhleni.mjs` zkoušel oddělení OCK/PROJ krokem 100 000 Kč
  (mimo výčet) — přepnuto na 10 000 Kč; zámek se zkouší krokem z výčtu.

**Testy (pojistka proti prázdnému testu):** `netlify/test_prava.mjs` oddíl
„B96" (13 kontrol; před opravou 587 prošlo / 7 selhalo → 595 / 0, kontrola
detekčního skriptu přibyla po opravě), `src/test_uloziste.js` (+11; před
opravou 161 / 1 — funkce neexistovala), `overit_zaokrouhleni.mjs` (+4; před
opravou 12 OK / 4 FAIL → 16 / 0). Mutace serveru +2 („kontrola zaokrouhlení
se nevolá", „výčet kroků se nekontroluje") — chycené; sdílenou mutaci
přeskakování zamčené varianty chytá nově i `test_prava`.

### B111: záporná vlastní položka, množství ani hodiny neprojdou (ve větvi v29.9.2, 29. 9. 2026)

Větev `claude/oprava-sesti-nalezu-v29.9.1` (z v29.9.1 = 9a48ee8), první ze
šesti nálezů 21. kola. Roadmapa #373 (nová), #33.

**Vysoký nález B111 — obchodník v běžném UI snížil cenu nabídky bez
schválení.** „+ přidat položku" s cenou −302 167 Kč: cena OCK 980 000 →
617 000 Kč (−37 %), PROJ „+ přidat fixní položku" −90 400 Kč: 271 200 →
162 720 Kč (−40 %); uložení 200, žádná lišta, rejstřík schvalování nic.
Záporná položka sníží vykázaný náklad i cenu stejným poměrem, takže marže
vypadala zdravě (B71 ji nepozná) a v dokumentu po ní nezůstala stopa.

- **Server (hranice):** nová `uloZaporneProblemy()` v `src/uloziste.js`,
  volaná v `zakazkaServerKontrola` hned za `uloTypyProblemy` (uložení
  i obnova, B72/P4). Odmítne 400 „Zakázka nese zápornou částku nebo
  množství (varianta X: <cesta>)" u ceny a množství vlastních položek OCK
  (`vlastniPolozky.<sekce>[]`, `volitelneVlastni[]`, `priplatkyVlastni[]`,
  i typ polí), u přepisů `mnozstviPrepis`/`cenyPrepis`, hodin N56 (dosud
  jen v UI) a u PROJ `cena`, `hodiny`, `rezerva`, `cenaPrepis`,
  `sazbaPrepis`. Výjimku nemá nikdo, ani administrátor (výchozí návrh,
  čeká na potvrzení J. V.). Varianta zamčená už v uložené verzi se
  přeskakuje (doklad) — společná pomocná `uloProVarianty()` pro B111, B96
  a B112.
- **UI:** `min="0"` u polí vlastních položek, příplatků a přepisů OCK
  i PROJ; `zaporneOdmitni()` v `vlastniSet`, `priplatekVlastniSet`,
  `mnozstviSet`, `cenaSet`, `pjPrepis` a `HODINY_BEZ_ZAPORU` rozšířené
  o `polozky.N.cena` — hláška „Částka ani množství nemohou být záporné.
  Snížení ceny zadejte jako slevu — ta jde přes schvalování."
- **Odmítnutí serveru je vidět u tlačítka „Uložit zakázku"** — dosud se
  „Neuloženo online: …" psalo jen do panelu Databáze.
- **Kontroly:** nové pravidlo `zapornaPolozka` (zábrana) pro už uložené
  zakázky — dokument nevznikne, dokud se položka neopraví.
- **Detekce dřívějšího zneužití:** `nastroje/detekce_zneuziti.mjs
  <zaloha.json>` (jen čte; spustí J. V.) vypíše varianty se zápornou
  položkou, množstvím nebo hodinami, i zamčené.

**Testy (pojistka proti prázdnému testu):** `netlify/test_zaporne.mjs`
(nová, 24 kontrol; proti kódu před opravou 3 OK / 19 FAIL — dvě kontroly
detekčního skriptu přibyly po opravě), `overit_zaporne.mjs` (nový harness,
15 kontrol; před opravou 5 prošlo / 10 selhalo), `src/test_kontroly.js`
(+7; před opravou 8 selhalo včetně počtu pravidel). Mutace serveru +3
(„záporná položka projde", „záporné číslo se nepozná", „zamčená varianta se
nepřeskakuje") — chycené 3 z 3.

---

## v29.9.4 — sloučení do test-draft: testovací sekvence A1–A5 (#371) a neznámý rozměr profilu (#372) (29. 9. 2026)

Na pokyn J. V. 29. 9. 2026 sloučeny do `test-draft` větve
`claude/pensive-curie-s6yzs3` (v26.9.1 — testovací sekvence A1–A5 a opravy
B72/P4, B75–B78, N43 na serveru, záznam níže) a `claude/stoic-cerf-j915ax`
(oprava #372, ve větvi v29.9.1 — záznam následuje). Tag `v29.9.4`.

**Při sloučení:**
- Roadmapa: položky z větví přečíslovány — #364 → **#371**, #365 → **#372**
  (v `test-draft` jsou #364 a #365 jiné úkoly); odkazy „#365" v kódu,
  testech a názvech mutací opraveny na #372.
- Razítko „kdo naposledy uložil" jménem (`upravilJmeno`, P7 z v25.9.7) se
  s ostatními pojistkami uložení přestěhovalo do společné
  `netlify/lib/zakazka_kontrola.mjs` (jen při uložení; obnova nechá razítko
  ze zálohy); mutace P7 přesměrována tamtéž.
- Pravidel kontroly je 23 (22 z `test-draft` + `profilNeznamy`); sady mutací
  serveru nesou i `test_rejstrik.mjs`; mutací jádra 80, serveru 192.

**Ověřeno celým kolem** `nastroje/testovaci_kolo.sh` 29. 9. 2026:
VŠE ZELENÉ (47 min 2 s) — kontrola verze + sestavení ✓; sady 193 prošlo,
0 selhalo, 3 přeskočeno z 196 (test.js — shoda s Excelem není v exportu
pro GitHub; overit_manual.mjs a overit_sod.mjs — firemní podklad mimo
repozitář); mutace jádra chycených 80 z 80; mutace serveru 192 z 192;
statické kontroly 3 z 3. Šablony pro harnessy: CN v13 (+EN/DE/FR)
a PROJ v3 přes KNG_PODKLADY.

### #372 — zakázka s neznámým rozměrem profilu jde otevřít

Roadmapa #372 hotovo (nález A2-1 z 26. 9. 2026). Větev
`claude/stoic-cerf-j915ax` nad `claude/pensive-curie-s6yzs3` (v26.9.1);
rozsah jen #372, N46 se neopravuje. **Pravidlo 0:** nález trval —
`vypocet()` padal na „Neznámá dimenze profilu: 999x999" / „Dimenze 80x80
nemá tloušťku 99 mm", `ui/kalk_ock.js` sám na `JEKLY[p.dim].kg`
(`renderInputs` i `zkontrolujTl`) a server takovou zakázku uložil
i obnovil — pak se nikomu neotevřela.

**Opraveno:**
- **Výpočet nespadne, ale chybu nezamlčí.** `jekl()` v `src/engine.js`
  u rozměru mimo katalog jeklů (nebo tloušťky, kterou rozměr nemá) dosadí
  nulovou hmotnost i plochu a profil zapíše do `vysledek.profily.nezname`
  („sloupek: 999x999 / 4 mm"). Seznam dává nová `profilyNezname(zadani,
  jekly)`; lemování jen u exteriérové šachty (interiérová ho nepočítá).
  Platná data se nezměnila ani o korunu — otisky výsledku výchozího
  zadání (interiér i exteriér, Model 1 i 2) jsou stejné jako před změnou.
- **Kontrola `profilNeznamy` = ZÁBRANA** (`src/kontroly.js`,
  `zabranaMozna`): „Rozměr profilu … není v katalogu jeklů — vyberte
  platný. Dokument nevznikne, dokud se to neopraví." Cena s nulovým
  profilem se tak nikdy nevytiskne. Pravidel je 20.
- **Zadání šachty ukáže pravdu** (`src/ui/kalk_ock.js`): ve výběru navíc
  zvýrazněná volba „neznámý rozměr: 999x999" (u tloušťky „neznámá: 99")
  a štítek „mimo katalog"; ostatní volby jsou platné rozměry. Po výběru
  platného rozměru `zkontrolujTl()` dosadí platnou tloušťku jako dřív,
  u neznámého nic nemění a nepadá.
- **Server odmítne nová špatná data, stará nezablokuje**
  (`netlify/lib/zakazka_kontrola.mjs`, uložení i obnova): neznámý rozměr
  nebo tloušťka v NEUZAMČENÉ variantě → 400 „… rozměr profilu není
  v katalogu jeklů (CN … — sloupek: 999x999 / 4 mm). Vyberte v zadání
  šachty platný rozměr"; obnova zakázku přeskočí s důvodem. Uzamčená
  (odeslaná) varianta se nemění, proto se nekontroluje. Katalog je týž
  `JEKLY` z `jadro()`, seznam dává táž funkce jádra.

**Testy — každý doložen selháním před opravou (ve zprávě commitu):**
- nová sada `src/test_profil_neznamy.js` (22 testů; bez opravy 5 prošlo,
  14 selhalo — prošly jen otisky platných dat), `src/test_kontroly.js`
  (bez opravy 2 selhání) a `overit_lista.mjs` (20 pravidel);
- `overit_xss.mjs` (A2) otravuje nově i `dim` a `tl` — komentář o nálezu
  A2-1 smazán; bez opravy UI 4 ✕ „vykreslení nespadlo" (`reading 'kg'`),
  teď 207 OK;
- nový harness `overit_profil_neznamy.mjs` (10 kontrol v prohlížeči; bez
  opravy UI 5 ✕);
- `netlify/test_obnova.mjs` — blok #372 (bez opravy 4 selhání, teď 165 OK);
- mutace: jádro +4 (`JADRA` nově i `kontroly.js` — zábrana je jediné, co
  brání vytisknout nulový profil), server +2 (neznámý rozměr se
  nekontroluje; kontroluje se i odeslaná varianta). `--kontrola`: jádro
  80, server 189 úseků, každý právě jednou.

**Ověřeno celým kolem ve větvi** `nastroje/testovaci_kolo.sh` 29. 9. 2026:
VŠE ZELENÉ (62 min 51 s) — kontrola verze + sestavení ✓; sady 187 prošlo,
0 selhalo, 3 přeskočeno z 190 (test.js — shoda s Excelem není v exportu
pro GitHub; overit_manual.mjs a overit_sod.mjs — firemní podklad mimo
repozitář, KNG_PODKLADY); mutace jádra chycených 80 z 80 (4 nové); mutace
serveru 189 z 189 (2 nové); statické kontroly 3 z 3.

---

## v29.9.3 — prázdné kapitoly ve Wordu, šablony CN v13 a PROJ v3, návrh platebních podmínek (29. 9. 2026)

Větev `test-draft`.

- **Prázdná kapitola zmizí z Wordu i s nadpisem (P8 varianta A, #365).**
  Generátor zná značky bloků: šablona obalí kapitolu odstavci
  `{{KAP_IV_ZAC}}` … `{{KAP_IV_KON}}` a když jsou všechny symboly uvnitř
  prázdné, zmizí celý blok (nadpis, rámeček, u VI. i věta o předávacím
  protokolu); jinak zmizí jen značky. Starší šablona bez značek se chová
  jako dřív — texty kontrol a Nastavení to teď říkají poctivě.
- **Šablona CN v13 (CZ/EN/DE/FR)** = v12 + značky kapitol IV., V., VI.
  a doložek + věty o dílčích daňových dokladech „(bez DPH)" (P10.4).
- **Šablona PROJ v3 (CZ/EN/DE/FR, #370)** = v2 + rekapitulace před
  „Vypracoval" (cena před slevou, sleva, CELKEM bez DPH — řádky slevy bez
  slevy zmizí) a blok vlastních položek `{{PROJ_POLOZKY_NAVIC}}` (zmizí,
  když žádné nejsou). Se šablonou v3 stojí činnosti ve Wordu za cenu před
  slevou jako v online nabídce (#364).
- Šablony vyrábí `nastroje/vyrob_sablony.js` z dodaných v12 / PROJ v2
  a jazykové mutace týmž překladem šablon jako aplikace; každý soubor
  ověří (platné XML, symboly shodné s češtinou, nic česky). **Soubory
  předány J. V. — nahrát v Nastavení → Šablony** (šablony nejsou
  v repozitáři).
- **Návrh platebních podmínek z krycího listu** (P10.3, P10.6, P9.1, P9.3)
  v `podklady/NAVRH_PLATEBNI_PODMINKY_2026-09-29.md` — čeká na odsouhlasení.

Testy: nová sada `src/test_bloky_sablony.js` 19 (bez opravy padá),
`overit_sablona` +10 (šablona v13: 83/83), `overit_nabidka_proj_word` +9
(šablona v3: 63/63); se staršími šablonami v12 / PROJ v2 dál 73/73 a 54/54.

---

## v29.9.2 — rozhodnutí J. V. k rozboru D: termín, smlouva, platební podmínky, PROJ u zahraničí (29. 9. 2026)

Větev `test-draft`. Podklad: tabulka rozhodnutí v `podklady/K16_ROZBOR_2026-09-25.md`.

- **Termín dodání v týdnech (P8b, #365).** Holé číslo termínu dostane
  jednotku: „12" → „12 týdnů", „cca 3" → „cca 3 týdny" (česky skloňované,
  po přičtení ATYP srovnané s novým číslem: „2 týdny" + 4 → „6 týdnů").
  Platí i pro ruční přepis v krycím listu. Termín s ATYP se tím dá přeložit
  celý (dřív „16 (vč. 4 týdnů za ATYP)" zůstalo v cizí nabídce česky).
- **Platnost 2 měsíce, splatnost z krycího listu (P10.1, P10.2, #367).**
  Náhled nabídky PROJ tiskne splatnost a platnost z krycího listu PROJ
  (přepis 45 dní dřív viděl jen Word). Náhradní platnost PROJ 2 měsíce
  (dřív 3), počet měsíců se skloňuje („5 měsíců", ne „5 měsíce"). Slovník
  zná lhůty „N měsíc/e/ů" a „N dní" obecně.
- **Způsob fakturace po milnících, nebo měsíční (P10.5).** Pole v krycím
  listu OCK je výběr, výchozí „Po milnících" (standard 50 / 40 / 10 nesou
  pole záloha, dílčí a konečná faktura). Dosavadní výchozí „Náš standard /
  měsíční" uložené v Nastavení se čte jako „Po milnících".
- **Záruka z krycího listu (P10.7).** Kapitola V. nabídky (online i Word)
  nese „Záruka: N měsíců" z krycího listu; věta o záruce z textu Firmy
  („5 let záruka na celé dílo.") se vynechá — krycí list má přednost.
- **Věty „(bez DPH)" ve slovníku (P10.4).** Obě věty o dílčích daňových
  dokladech ve znění „(bez DPH)" pro šablonu CN v13 (EN/DE/FR).
- **Smlouva o dílo realizace z krycího listu (P9.2, P9.4, #366).** Termín
  převzetí staveniště → `{{SOD_TERMIN_MONTAZ_OD}}`, konečné předání →
  `{{SOD_TERMIN_DOKONCENI}}`; nová sekce krycího listu OCK „Smlouva o dílo —
  podpisy a kopie" (firma v podpisové doložce, druhý podepisující, kopie
  faktur) se předvyplní z krycího listu PROJ. Nevyplněné zůstane ve Wordu
  `{{…}}` k doplnění.
- **Zámek drží i podmínky předvyplněné z Nastavení (P9.5).** Při prvním
  zamčení po tisku se předvyplněné hodnoty krycích listů OCK i PROJ opíšou
  do zakázky; dokud je varianta zamčená, platí ony, ne dnešní Nastavení.
  Server je uloží a zámek dál ověří jako shodný.
- **Projekci u zahraničí nerealizujeme (P11, #368).** Nová kontrola před
  nabídkou (varování): zahraniční ceník + oceněná projekce → vyřadit
  projekci, nebo vrátit tuzemský ceník. Dialog přepnutí ceníku říká totéž.
  Pravidel kontrol je 22.

Testy (každý bod bez opravy selže): nová sada `src/test_rozhodnuti_k16.js`
50, `test_sod` +7, `overit_online` +1 (zmrazené podmínky uloží server);
upravené `test_nabidka_kapitoly`, `test_standardy`, `test_kontroly`,
`overit_lista` na nové chování. Server ani jádro výpočtu se neměnily.

---

## v29.9.1 — nabídka PROJ se slevou sčítá rekapitulaci; rozhodnutí k rozboru D (29. 9. 2026)

Větev `test-draft`.

- **Nabídka PROJ se slevou: činnosti za cenu před slevou (#364).** Nález
  J. V. 29. 9. 2026: „DPZ a IČ by mělo být za cenu před slevou" a „chyba
  v součtu při udělení slevy". Rekapitulace vypisovala činnosti už po slevě
  (DPZ 70 100 + IČ 28 000) a pod nimi „Cena před slevou 114 100 − Sleva
  16 000 = CELKEM 98 100" — řádky se do ceny před slevou nesečetly. Online
  nabídka a Word se šablonou, která má řádek slevy (`{{PROJ_SLEVA_KC}}`),
  teď vypisují činnosti za cenu před slevou (tutéž jako bez slevy):
  činnosti → cena před slevou → sleva → CELKEM bez DPH. Šablona PROJ v2
  (bez řádku slevy) a smlouva o dílo PROJ nesou ceny po slevě jako dosud —
  jinak by součet v nich neodpovídal ceně, kterou zákazník platí. Karta
  nabídky PROJ v aplikaci ukazuje v rekapitulaci taky cenu před slevou
  a slevu. Ceny činností jsou zaokrouhlené obchodním zaokrouhlením PROJ
  (na stokoruny nahoru) stejně jako bez slevy — DPZ 81 510 Kč z kalkulace
  je v nabídce 81 600 Kč; sleva je rozdíl zaokrouhlených částek.
- **Rozhodnutí J. V. k rozboru D** jsou zapsaná na začátku
  `podklady/K16_ROZBOR_2026-09-25.md`; roadmapa #363 uzavřená, práce podle
  rozhodnutí v nových položkách #365–#370.

Testy: nová sada `src/test_proj_sleva_nabidka.js` 13 (bez opravy 6
selže), `overit_nabidky_dph` +5 (bez opravy nesedí součet).

---

## v26.9.1 — testovací sekvence z hloubkového testu (A1–A5) a opravy B72, B75–B78, N43 na serveru (26. 9. 2026)

Roadmapa #371 (nová), #342 hotovo, #345 z části. Zadání J. V. 25. 9. 2026
„testovací sekvence do repa": každý nález se nejdřív ověřil v aktuálním kódu
(Pravidlo 0), každý nový test má doloženo, že před opravou selže.

**Pravidlo 0 — už opravené dřív, přeskočeno:** B69, B70, B71, N47, N53, N54
(v25.9.4), B73, B74, N43 klient, N44 (v24.9.4), N45, N51 (v24.9.6), N56,
N57 (v24.9.7), N48, N49, N50, N52, N55 (v25.9.5). **N46 se neopravuje** bez
pokynu J. V. — fuzz rozdíl jen hlásí (INFO), „čeká na rozhodnutí J. V.".

**Opraveno:**
- **N43 na serveru — server migruje zakázku stejnými moduly jako prohlížeč.**
  `netlify/lib/jadro_moduly.cjs` neměl `kryci.js`, `kryci_proj.js`,
  `poznamky.js` a `protokol.js`; starší odeslaná zakázka se po otevření
  a uložení v prohlížeči (kde migrace doběhly) na serveru porovnala s
  nemigrovanou podobou a skončila 409 „data uzamčené varianty se změnila".
- **B72 / P4 — obnova ze zálohy prochází stejnými kontrolami jako uložení.**
  Nová `netlify/lib/zakazka_kontrola.mjs`: `zakazkaPrijmi()` +
  `zakazkaServerKontrola(stara, nova, relace, {rezim})` volají `/api/zakazky`
  i `obnova.mjs`. Obnova už nepustí slevu pod marží ani „schválenou"
  vymyšleným jménem, nepřepíše číslo odeslané nabídky, nezapíše značky
  ukázkových dat, doplní chybějící ověření zámku a nechá razítka i autora
  být. Sleva a marže se porovnávají proti migrované uložené podobě (jinak
  uložení zakázky z doby před 12. 8. razítkovalo slevu znovu).
- **B75–B78 — přihlášení jako celek.** Nad limitem adresy 429 PŘED ověřením
  hesla (scrypt se nepočítá); IPv6 po /64; úspěch cizího účtu počítadlo
  adresy nenuluje; `hesloVerze` při založení, vypnutí i archivaci účtu
  (stará cookie neplatí); brzda i u změny vlastního hesla; odhlášení odmítá
  cizí Origin, `null` a formulářový Content-Type.

**Nové testy (A1–A5), každý s pojistkou proti prázdnému testu:**
- A1 `src/test_fuzz_invarianty.js` — deterministický fuzz (seed 20260925,
  2000 zadání OCK a PROJ): žádné NaN, součty, tisíce, DPH a zahraniční
  řada, jedinečné klíče (N52), volitelné položky (delta), „nepočítat",
  přepis nákladu, po stěnách vs. jednotné, zrcadlení stěn, N46 jen INFO.
  Pojistka: 8 záměrných rozbití jádra, všech 8 chyceno.
- A2 `src/test_escape.js` — hlídač ČLENSKÝCH VÝRAZŮ bez ohledu na jméno
  (přesně tvar B69: `Z.typPortalu`, `C.dph`, `p.hodiny`), 63 prověřených
  výrazů s důvodem. `overit_xss.mjs` — otráví VŠECHNA pole zakázky i ostatní
  zdroje dat (firma, profil, účty, rejstřík, kartotéka, zálohy, žádosti,
  standard), obě role, 13 záložek + všechny panely Nastavení; 207 kontrol.
  Pojistka: čtyři rozbitá místa → 16 selhání se jmény cest.
- A3 `src/test_zamek_historie.js` + `src/fixtury/` (3 historické tvary
  zakázek z 8. 8., 17. 9. a 23. 9.): klient otevře → server uloží (200) →
  změna 409 → obnova nanečisto bez hlášky o zámku. Před opravou jádra
  serveru 3 selhání.
- A4 `nastroje/kontrola_udaju.py` + `nastroje/povolene_kontakty.txt` —
  e-maily, telefony a tajemství mimo povolený seznam (B79 ponecháno
  rozhodnutím J. V., výskyty jsou v seznamu). Pojistka: podstrčený soubor
  s 5 nálezy → 5 hlášeno.
- A5 `nastroje/testovaci_kolo.sh` — celá sekvence jedním příkazem
  (sestavení → všechny sady a harnessy → mutace jádra → mutace serveru →
  statické kontroly → souhrn s počty, nenulový kód). `pred_pushem.sh` je
  obal, CI volá tentýž skript — žádný druhý seznam kroků.
- `netlify/test_prihlaseni.mjs` (43; proti kódu před opravou 21 selhalo),
  9 testů B72 v `test_obnova.mjs` (před P4 4 + 3 selhaly), 14 nových
  mutací serveru (P4 5, B75–B78 9), `test_mutace.mjs` čte cíl mutace ze
  seznamu (po přesunu B59 do lib měřil prázdno).

**Nálezy mimo zadání (k rozhodnutí J. V.):** #372 zakázka s neznámým
rozměrem profilu (mimo tabulku JEKLY) nejde otevřít; skutečný telefon
a jméno kolegy v `overit_nabidka_proj_word.mjs` (dočasně v povoleném
seznamu, viz #346). CSP bez `'unsafe-inline'` zůstává jen návrhem.

Ověřeno: celé kolo `nastroje/testovaci_kolo.sh` 26. 9. 2026 (38 min): kontrola verze + sestavení ✓; sady 182 prošlo, 0 selhalo, 6 přeskočeno (test.js — skutečný ceník není v repozitáři; overit_manual, overit_nabidka_proj_word, overit_sablona, overit_sablony_online, overit_sod — firemní podklady mimo repozitář, KNG_PODKLADY); mutace jádra chycených 76 z 76; mutace serveru 187 z 187 (z toho 14 nových); statické kontroly 3 z 3. Dvě předchozí kola téhož dne našla a bylo opraveno: `test_mutace.mjs` po přesunu B59 měřil prázdno; mutace „vypnutý účet se nepozná“ přežila (dvě nezávislé pojistky, jeden test — doplněn cílený test v `test_prava.mjs`); dva testy struktury CI četly workflow (přesměrovány na testovaci_kolo.sh, kontrola verze přesunuta na začátek kola); souhrn kola nevypisoval přeskočené sady (pole v podshellu).

---

## v25.9.8 — dávka C kola 16: překlad šablon kolem symbolů, nabídka PROJ s vlastními položkami (25. 9. 2026)

Roadmapa #362, větev `k16-nalezy`.

- **Cizojazyčné šablony bez českých zbytků (P3 / K14-N63, K16-N84).**
  Mutace šablony CN v12 do EN/DE/FR nechávala česky 15 odstavců se symbolem
  (PROJ v2 dvanáct): hlavičku „Číslo nabídky: {{…}}", „Email:", „Tel:",
  „{{CENA_S_DPH}} včetně DPH", jednotky u cen PROJ („/ měsíc", „dní")
  a věty platebních podmínek. Odstavec se symbolem se teď překládá po
  úsecích mezi symboly, tabulátory a zalomeními a každý úsek zůstává ve
  svém běhu — tabulátory mezi popiskem a symbolem ani zalomení pod cenou se
  nepohnou (dosavadní překlad celého odstavce by text přestěhoval přes ně).
  Všechno, nebo nic: neznámý úsek nechá odstavec česky a průvodce šablon
  ho vypíše. Nová hesla slovníku (platnost nabídky, splatnost, obě věty
  dílčích daňových dokladů, řádek DPH se sazbou, „včetně DPH" …) jsou
  **návrh překladu ke kontrole J. V.**; „bez DPH" je nově „excl. VAT" /
  „zzgl. MwSt." (ladí s „including VAT" / „inkl. MwSt."). Výsledek: CN v12
  i PROJ v2 do EN/DE/FR bez jediného českého odstavce, XML bez vad.
  **Po nasazení je potřeba jazykové mutace v Nastavení → Šablony
  přegenerovat** — dodané soubory CN v12 EN/DE nesou 6 českých odstavců.
- **Vlastní položky v nabídce PROJ (P4 / K14-N64).** Položka přidaná do
  sekce PROJ („+ přidat položku") nebo trvalá z ceníku PROJ byla v ceně
  sekce, ale text nabídky o ní mlčel. Online nabídka ji vypíše pod popisem
  ceny své sekce; pro Word jdou symboly `{{PROJ_POLOZKY_NAVIC}}` (souhrnně)
  a `{{PROJ_NAVIC_<SEKCE>}}`.
- **Sleva a součet ve Wordu PROJ (P4 / K15-N66).** Aplikace součet a slevu
  posílá (`PROJ_CELKEM_BEZ_DPH`, `PROJ_CENA_PRED_SLEVOU`, `PROJ_SLEVA_PROC`,
  `PROJ_SLEVA_KC`, `PROJ_DPH_KC`, `PROJ_CELKEM_S_DPH`), šablona PROJ v2 je
  nemá. Řádky slevy PROJ ve wordové tabulce zmizí, když sleva není. Nové
  kontroly před nabídkou „Sleva projekce se ve Wordu neukáže" a „Vlastní
  položky projekce se ve Wordu neukážou". **Úkol pro šablonu PROJ (J. V.):**
  doplnit tabulku součtu se symboly výš a `{{PROJ_POLOZKY_NAVIC}}`.

Testy (každý bod bez opravy selže): `test_docx_preklad` +15,
`overit_sablona` +12 (šablona CN v12, EN/DE/FR), `overit_nabidka_proj_word`
+3, nová sada `src/test_k16_proj_word.js` 30, `overit_nabidky_dph` +1;
počet pravidel kontrol 19 → 21.

Mutace serveru nad v25.9.7 (spuštěné po pushi dávky B): **176 ze 176
chyceno** — i nové P6 (chybějící jádro dokumentu), P7 (jméno „kdo uložil"
od klienta), P15 (nedoplněné adresy rejstříku) a přepsaná B59. Dávka C
server ani jádro výpočtu nemění, mutační běh se pro ni neopakuje.

**Rozbor D (#363)** — `podklady/K16_ROZBOR_2026-09-25.md`: prázdné kapitoly
nabídky ve Wordu a termín bez jednotky (P8), symboly smlouvy o dílo z nabídky
(P9), jedno znění platebních podmínek (P10), PROJ u zahraniční varianty (P11),
náklady u obchodníka (P12 — kalkulace PROJ ukazuje obchodníkovi nákladové
sazby). Kód se nemění, čeká se na rozhodnutí J. V.

---

## v25.9.7 — dávka B kola 16: neuložené změny, ověření zámku, dialogy, adresa, zalomení ve Wordu (25. 9. 2026)

Roadmapa #361, větev `k16-nalezy`.

- **Žádné falešné „neuložené změny" (P5 / K14-N65, K14-N62).** Nová zakázka
  posune otisk „naposledy uloženo" — do teď se porovnávala s tou předchozí,
  takže prohlížeč při zavření okna varoval a dialog „Otevřít jinou zakázku"
  se ptal na změny, které nikdo neudělal. Dotaz „Nová zakázka" mluví
  o neuložených změnách jen tehdy, když nějaké jsou. Razítko platného ceníku,
  které aplikace sama vtiskne otevřené zakázce (po zveřejnění ceníku,
  po přihlášení), se za práci uživatele nepočítá — rozepsanou práci to ale
  neschová.
- **Bez čísla nabídky se neukládá (P5 / K15-N69).** Uložení z karty Databáze
  nebo z dialogu „Otevřít jinou zakázku → Uložit změny" založilo záznam
  „bez-cisla-….json", který v seznamu nikdo nenajde. Teď aplikace odmítne
  s hláškou „vyplňte číslo nabídky v hlavičce"; autosave uložené zakázky,
  které někdo číslo vymazal, počká (dřív by zapsal nový soubor vedle).
- **Ověření odeslané nabídky jen nad penězi a množstvím (P6 / K15-N67).**
  Lišta zámku hlásila „čísla nesouhlasí" i u poctivých nabídek tištěných ze
  stránky načtené před nasazením nové verze — porovnávaly se i texty,
  příznaky a klíče, které přidala nebo ubrala jiná verze. Teď se porovnávají
  čísla, řádky se párují podle názvu a klíč jen v jednom výsledku se
  přeskočí. Jádro dokumentu (cena bez DPH, DPH, s DPH, cena a celkem PROJ,
  kurz EUR) musí být v obou — podvrh bez souhrnu dál neprojde.
- **Dialogy říkají, co tlačítka udělají (P7 / K15-N68).** Dialog uzamčené
  varianty radil „OK = založit klon…, Zrušit = …", ale modál má tlačítka
  Ano / Ne. Teď „Založit klon a pokračovat v něm" / „Nechat beze změny";
  totéž u dvou dialogů složky _DB. Nový hlídač v `test_dialogy.js`.
- **Kolize verzí jmenuje člověka (P7 / K16-N87).** „Zakázku mezitím uložil
  jan@firma.cz" → „Zakázku mezitím uložil(a) Jan Novák v 14:32"; týž účet
  v jiném okně se pozná („váš účet — jiné okno nebo záložka"). Jméno píše
  server z relace (`upravilJmeno`), u starších zakázek ho dohledá v účtech.
- **Hledání podle adresy stavby (P15 / K16-N85).** Rejstřík nese adresu
  stavby; hledání v Přehledu cenových nabídek i v okně Zakázky online ji
  prohledává, našeptávač ji nabízí a seznam ji ukazuje pod názvem akce.
  **Starší zakázky** doplňuje server po dávkách při ukládání (25 najednou),
  takže se podle adresy najdou po několika uloženích kohokoli. „strasse"
  najde „Straße".
- **Zalomení řádků ve Wordu (P14 / K16-N81).** Víceřádkové hodnoty (kapitoly
  nabídky, patička, dodatkové texty) se spojovaly značkou `<w:br/>` uvnitř
  textu `<w:t>`, kde ji Word nevykreslí — skončily na jednom řádku. Teď se
  text před zalomením uzavře (`</w:t><w:br/><w:t>`); totéž v krycích listech
  generovaných od nuly.

Testy (každý bod bez opravy selže): nový harness `overit_neulozene.mjs` 24,
nová serverová sada `netlify/test_rejstrik.mjs` 14, `test_ulozeni` +9,
`test_zamek_otisk` +17, `test_prava` +10, `test_uloziste` +11,
`test_docxgen` +6, `test_dialogy` +1, `overit_dialogy` +4,
`overit_zobrazeni` +1, `overit_sablona` zpřísněný na šabloně CN v12.
Nové serverové mutace: P6 (jádro dokumentu), P7 (jméno z relace), P15
(doplnění adres); mutace B59 přepsaná na nový kód porovnání.

Ověřeno: sady v Node 143/0 (1 přeskočená — test.js není v exportu),
`nastroje/pred_pushem.sh`: verze, CRLF, 40 ze 42 harnessů se šablonami
CN v12 a PROJ v2 (`overit_manual` a `overit_sod` přeskočeny — chybí
příručka a šablony SoD). Mutace serveru běžely po uzavření dávky (výsledek
v další dávce).

---

## v25.9.6 — dávka A kola 16: role slevy, zábrana nesmyslné nabídky, náhled (25. 9. 2026)

- **Sleva nad strop už nejde „schválit" volbou role (P1 / K16-N73, K16-N74).**
  Výběr „Role zadavatele" z karty slevy zmizel — roli určuje přihlášený,
  který zadal procenta (karta ji jen ukáže). Server roli přepíše z relace
  a cizí žádost „čeká na schválení" se uložením nadřízeného už neschválí
  (bez změny procent se vrátí uložený stav). Sleva „schválená automaticky"
  nad stropem role zadavatele zastaví tisk dokumentu.
- **Nabídka s nesmyslným zadáním nebo nulovou cenou nevznikne (P2 / K16-N75,
  K14-N61).** Nulový nebo záporný rozměr a nová kontrola „cena nabídky je
  nulová nebo není číslo" jsou zábrana (odklepnout nejde). Nová prázdná
  zakázka tedy tisknout nejde, dokud se nevyplní zdvih, šířka a hloubka.
  Chybějící cena v ceníku už v součtu nedá NaN.
- **Během náhledu se automaticky neukládá (P13 / K16-N77)**; ruční uložení
  v rolovém náhledu se zeptá, že se zapíše pod administrátorem.
- **„Smazat vybrané…" jen s právem mazat (N89)**, i v rolovém náhledu.
- Nová serverová sada `netlify/test_obchodnik.mjs` — 24 scénářů pohledu
  obchodníka z kola 16 (S5 před opravou selhával), zařazená i do mutací.

Ověřeno: sady v Node, test_obchodnik 24/24, harnessy (kromě příručky a SoD),
mutace jádra 76/76, mutace serveru 173/173 (z toho 2 nové pro P1).

---

## v25.9.5 — dokumenty souhlasí s cenou, překlad smluv se symboly (25. 9. 2026)

Roadmapa #344 (F4 z hloubkového testu) a první část #350.

- **Specifikace a krycí list neslibují vyřazené položky (N48).** 3D sken,
  dílenská dokumentace, střecha, větrací mřížka a montážní nosník se řídí
  tím, jestli jsou v ceně („ne" / „není součástí nabídky"); přechodové
  plechy podle volby v ceně. Ruční volba ve specifikaci dál vyhrává.
- **Nabízený příplatek ve specifikaci (N49):** zábrany do vstupů, ohrazení
  proti pádu a ventilátor mají u nabízeného příplatku znění „lze doplnit –
  viz příplatkové ceny" (schválené J. V.), jinak jako dřív.
- **VSG fólie a SKN po stěnách (N50)** se počítají jen ze skleněných pásů;
  SKN (náhrada dvojskla) jen z pásů „Dvojsklo". Standardní režim beze změny.
- **Dva pásy „jiné" stejného názvu (N52)** — druhý řádek dostane pořadí
  v závorce, ruční přepis jednoho nezasáhne druhý.
- **Sleva v přehledu variant a v otisku zámku jako v dokumentu (N55)**;
  krycí list OCK nese haléře, pokud je cena má.
- **Překladač šablon přeloží i odstavec se symbolem {{…}} (#350)**, když ho
  slovník zná a překlad nese tytéž symboly; ostatní průvodce vypíše zvlášť
  (u smluv o dílo jsou to články s cenou, platbami a pokutami).

Ověřeno: sady v Node zelené, všechny harnessy (kromě příručky a SoD —
chybí podklady), mutace jádra 76/76 (3 nové).

---

## v25.9.4 — server hlídá minimální marži a typy polí zakázky, drobné nálezy 20. kola (25. 9. 2026)

Dávka F2 + F3 z hloubkového testu 24. 9. 2026 (roadmapa #340, #341).

- **Minimální marži u slevy ověřuje i server (#341, B71).** Do teď ji hlídal
  jen prohlížeč; upravený klient uložil slevu pod firemním minimem jako
  „schváleno automaticky". Server teď přepočítá základ části (OCK, PROJ
  včetně dopravy) týmž jádrem a takovou slevu neuloží. Odeslané nabídky
  (zamčené už dřív) se nepřepočítávají. Hláška číslo minima neprozradí.
- **Server hlídá typy polí zadání a ceníku (#340, návrh P1).** Číslo musí být
  číslo, prázdno nebo číslo jako text; volby (typ šachty, portál, zasklení,
  režim opláštění, typ pásu, lakování) z nabídky; dimenze profilu tvaru
  „80x80". Nic se nepřevádí — co nesedí, zastaví uložení a hláška řekne kde.
  Druhá vrstva proti uloženému skriptu (B69, B70); platí i pro obnovu.
- **Krycí list a smlouva PROJ u odeslané nabídky počítají ze zmrazeného
  výsledku (N47)**, ne dnešním kódem — tvrdily jinou cenu, než odešla.
- **Kontrola „méně než dvě nástupiště" zná průchozí šachtu (N53)** — sčítá
  nástupiště A + C.
- **Nová varianta se jmenuje podle svého čísla (N54)** — po smazání varianty
  už nevzniknou dvě „Varianta 3".
- **Tiskové okno (B84):** JSON ve skriptu se nedá ukončit značkou, jazyk
  dokumentu jde přes escapování.
- **Symbol v názvu příplatku se ve Wordu nerozvine (B86).**
- Nastavení → Šablony: pod číslem verze i **název nahraného souboru**
  (číslo je pořadí zveřejnění, ne číslo z názvu souboru).
- Nasazení: připnutý Node 22.23.2 v `netlify.toml` (build padal na
  kompilaci 22.23.3 ze zdrojů).

Ověřeno: sady v Node zelené (test_schvalovani +13, test_uloziste +19,
test_kontroly +2, test_kryci_proj_model +2, test_pripona_prvni +3,
test_docxgen +3), test_prava 579, všechny prohlížečové harnessy včetně
šablon CN v12 (60/60) a PROJ v2; mutace serveru 171/171 chycených (z toho 5 nových).

---

## v25.9.3 — dodatkové texty se neztrácejí, číselník, vlastní jazyková verze, šablona PROJ EN/DE/FR (25. 9. 2026)

- **Dodatkové texty se ztrácely — dvě příčiny, obě opravené.**
  - Server při uložení textu přepsal celou mapu tím, co měl prohlížeč
    načteno při přihlášení. Druhé okno (nebo karta otevřená od rána) tak
    smazalo texty zapsané jinde. Teď se posílá jen měněný text a server ho
    sloučí; celá mapa smí mazat jen s razítkem posledního stavu (jinak
    409), starší prohlížeč jen doplňuje. Předchozí stavy (30) leží
    v `popisy_historie`.
  - Rozpracované zakázky společné texty nedostávaly (jen nové). Teď se
    při otevření doplní tam, kde zakázka u položky text nemá; odeslané se
    nemění, vědomě smazaný text se nevrací.
- **Číselník dodatkových textů v Ceníku OCK** (karta pod ceníkem): všechny
  příplatky a volitelné položky (EXT/INT) na jednom místě, administrátor
  zapisuje, ostatní vidí. Texty k položkám, které výpočet už nezná, se
  ukazují zvlášť. Tlačítko **Najít texty v uložených zakázkách**
  (`/api/popisy?sber=1`) — záchrana ztracených textů, převzetí po jednom.
- **Průvodce šablon: Nahrát vlastní verzi** u každého jazyka v kroku
  Jazykové verze. Kontrola jazyka a symbolů proti nové češtině, překlad
  aplikace jde vrátit, v záznamu „vlastní soubor k české verzi N“.
- **Kontrola poškozeného souboru** (`docxXmlVady`): průvodce odmítne
  šablonu s rozbitým XML. Šablona PROJ v2 z dopoledne ho měla (Word ji
  otevřel jen s opravou) — předána opravená.
- **Slovník šablony PROJ:** 162 hesel, EN/DE/FR pokrytí 100 %; kontaktní
  řádky hlavičky jsou neutrální. `#350` zbývá jen pro smlouvy o dílo.
- **K13-P1 v aplikaci:** Nastavení → Databáze → *Kontrola čísla první
  varianty* — kontrola jen čte, oprava neodeslaných běžným uložením.
- **Roadmapa:** body 3 a 4 k můstkům jako `#355` (přechodové plechy)
  a `#356` (zastřešení) s detailem výpočtu a otázkami; `#357` tato dávka.
- Testy: `test_popisy_trvale.js` 19, `test_docx_struktura.js` 5,
  `test_pripona_prvni` +8, `test_prava` +12, `overit_online` +9,
  `overit_sablony_online` +5, `overit_nabidka_proj_word` +7, mutace
  serveru +3.

---

## v25.9.2 — rozhodnutí J. V. k rozboru K13, můstky počtem, šablony v12 (25. 9. 2026)

- **Větev k13-nalezy sloučená do testu** (P1–P11 z 13. kola, viz oddíl
  níže). Rozhodnutí J. V.: P1 oprava dat podle návrhu, P2 varianta A,
  P5/P6/P10/P11 podle návrhu, P7 přes počet můstků.
- **Můstky mezi budovou a OCK počtem kusů (P7 / K13-N59).**
  - Pole v Zadání šachty hned pod čistým vstupem, výchozí 0. Stará
    zakázka se zaškrtnutým můstkem = 1 ks.
  - Nová ceníková položka *Můstek mezi budovou a OCK* (Kč/ks, Hrubá OCK)
    a řádek v hrubé OCK. Řádek vzniká jen u zakázky s můstky.
  - Specifikace: usazení čelní stěny podle počtu, střecha přes můstek
    a nový řádek MŮSTKY (Word `{{TS_MUSTKY}}`, online nabídka).
  - Kontrola před nabídkou `mustky`: chybějící cena, víc můstků než
    nástupišť. Kontrola standardu počítá s počtem.
  - Testy: `test_mustky.js` 30, `overit_zadani_detail` +3, mutace jádra +4.
- **Sleva ve Wordu (P5):** bez slevy jsou `SLEVA_PROC` a `SLEVA_KC`
  prázdné a docxgen vyhodí řádky slevy.
- **Popis záměru (P6)** v online nabídce OCK a pole v kartě nabídky OCK.
  Překlady vět jsou návrh ke kontrole.
- **Úvod nabídky PROJ podle rozsahu (P11)**, pro šablonu symbol
  `{{UVOD_NABIDKY_PROJ}}`. Test `test_uvod_proj.js` 11.
- **Šablony (mimo repozitář, předané J. V.):**
  - `Sablona_NABIDKA_CN_v12.docx`: popis záměru a věta o opláštění ze
    zakázky, řádky slevy, příčka, stříška a můstky;
  - jazykové verze EN/DE/FR se 100 % pokrytím slovníku;
  - `Sablona_NABIDKA_PROJ_v2.docx` s podmíněným úvodem;
  - `overit_sablona.mjs` má kontroly v12.
- **P1 data:** `podklady/K13_pripona_oprava.mjs` (náhled + soubor pro
  obnovu; odeslané zakázky se vypíší k ruční opravě).
- Rozbor `podklady/K13_ROZBOR_2026-09-24.md` revidovaný (rozhodnutí,
  dopad můstků, postup nahrání šablon).

---

## v25.9.1 — Zadání šachty: pořadí polí (25. 9. 2026)

Zadání J. V. obrázkem:

- 2. sloupec: vnitřní šířka, hloubka, **počet nástupišť** (na místě typu
  portálů), **počet sloupků**, stříška.
- 3. sloupec: způsob zasklení, opláštění, **typ portálů** (na místě počtu
  sloupků), světlík nad dveřmi, světlíky na bocích.
- 4. sloupec: rozteč, šířka rámu, čistý vstup, **přechodové plechy**,
  můstek, ATYP.

Výpočet ani data se nemění. Harness `overit_zadani_detail` hlídá pořadí
ve všech třech sloupcích.

---

## v24.9.7 — dávka N58 (24. 9. 2026 večer): co je nad dveřmi a vedle nich

Rozhodnutí J. V. 24. 9. večer (vizuální návrh odsouhlasen: výchozí plech,
sazby podle návrhu, boční pole ve stejné dávce).

- **Nad šachetními dveřmi volba výplně (N58).** Do 24. 9. bylo
  zaškrtávátko a bez něj se pole nad dveřmi (šířka stěny × (světlá výška
  − 2,3 m) na každé nástupiště) neocenilo vůbec. Teď rolovací menu:
  - *bez*: 0 Kč, kontrola před nabídkou upozorní na otvor;
  - *sklo*: dřívější světlík (sklo stěny, lišty/terče);
  - *plech*: 8,5 kg/m² do plechů dveří, práce +1 ks na nástupiště,
    lakování obou stran, montáž jako u světlíku; záporná výška se ořízne
    na nulu v obou modelech;
  - *materiál opláštění*: materiál stěny (ve standardu sklo stěny,
    v režimu po stěnách typ pásu);
  - *zajistí stavba*: 0 Kč a věta ve specifikaci.
  Výchozí volba nové zakázky je plech. Starší zakázky se převádějí beze
  změny ceny (zaškrtnuto = sklo, nezaškrtnuto = bez) v obou modelech.
- **Boční pole vedle dveří (N58b).** Pod *Světlíky na bocích dveří* se
  s počtem stran objeví *Výplň boků dveří* (sklo, plech, materiál
  opláštění, zajistí stavba). Plech a stavba berou plochu ze skla stěny,
  portálové sloupky zůstávají. Chybějící volba = sklo jako dřív.
- **Zadání šachty (úprava podle návrhu).** Světlík nad dveřmi je ve
  3. sloupci mezi počtem sloupků a světlíky na bocích. Můstek mezi budovou
  a OCK se přesunul do 4. sloupce na jeho dřívější místo.
- **Specifikace:** ŘEŠENÍ PORTÁLŮ (ČLENĚNÍ) a OPLÁŠTĚNÍ NADSVĚTLÍKŮ podle
  výplně. Skleněné kombinace mají dosavadní znění, nové texty se překládají
  po částech. Nová hesla EN/DE/FR jsou **návrh, čeká na kontrolu J. V.**
- Testy: `src/test_nadprazi.js` 48, `overit_zadani_detail` +6,
  `test_kontroly` (16 pravidel), mutace jádra +8. Upraveny `overit_oplasteni`
  (nová zakázka má plech, sklo se volí hodnotou) a `overit_lista`
  (16 pravidel).

---

## Nálezy 13. kola — větev k13-nalezy (sloučeno do testu 25. 9. 2026, schválil J. V.)

Nálezy 13. testovacího kola (24. 9. 2026, test v24.9.6). Označení P1–P11
podle zadání větve, v závorce číslo nálezu ze sešitu kola.

- **P1 (K13-N53) — první varianta dostala po uložení příponu .3.** Nová
  zakázka zakládala první variantu bez pole `pripona`. Po klonu založeném
  před prvním uložením (klon .2) ji `zajistiZamek` při importu bral jako
  chybějící a dal jí první volné číslo nad maximem. Vytištěná nabídka
  „…9140“ se tak v aplikaci změnila na „…9140.3“. Obchodníkovi server
  uložení odmítl (B56, 403), administrátorovi číslo v zámku tiše přepsal.
  Oprava: první varianta má příponu 0 od založení a varianta bez přípony
  na prvním místě dostane 0, pokud ji v zakázce ještě nikdo nemá. Testy:
  `src/test_pripona_prvni.js` (bez opravy 6 z 12 selže), `test_prava`
  +6 (bez opravy obchodník dostane 403). Uložená data se nemění; výpis
  dotčených zakázek ze zálohy dělá `podklady/K13_pripona_vypis.mjs`.
- **P2 (K13-N54) — tisk ze zakázky otevřené jen ke čtení zamkl variantu
  jen v prohlížeči.** Tlačítka tisku leží mimo šedé bloky režimu čtení.
  Word i tisk z náhledu proto variantu zamkly, uložení se ale odmítlo
  a odeslaná nabídka zůstala na serveru odemčená. Oprava (varianta A):
  před dokumentem, který zamyká, se aplikace zeptá „Tisk odešle nabídku
  a uzamkne variantu. K tomu je potřeba zakázku odemknout.“ s volbami
  Odemknout a tisknout / Zrušit. Kdo odemknout nesmí, dostane důvod
  a dokument nevznikne. Platí pro Word OCK i PROJ, smlouvy o dílo a tisk
  z náhledu nabídky OCK i PROJ; náhled se ptá před otevřením okna. Dotisk
  už zamčené varianty se neptá, plná moc a interní podklady beze změny.
  Harness `overit_online.mjs` +10 (bez opravy 6 selže).
- **P3 (K13-N55) — falešný dialog „Ceník se změnil, změnily se 2 ceny“
  u každé nové zakázky.** Příčina potvrzena: server při importu doplní
  klíč, který v ceníku zakázky chybí, nulou (`cenikDoplnKlice`). Platný
  ceník testu je ale starší než klíče `cetrisKc` a `zaskleniListyProjHod`
  a nenese je vůbec. `cenikRozdily` pak bral 0 proti ničemu jako změnu
  a přepočet klíče ze zakázky smazal. Oprava v `cenikRozdily` (varianta a):
  chybějící klíč se porovnává jako nula, tedy stejně jako ho doplňuje
  import. Nenulová hodnota proti chybějící i změna z nenuly na nulu se
  hlásí dál. Varianta b (doplnit klíče do platného ceníku při načtení)
  by změnila otisk platného ceníku, a tím zneplatnila dříve potvrzené
  „ceny jsou dohodnuté“.
- **P4 (K13-N58) — ruční sazba DPH se hlásila jako rozdíl ceníku.**
  `cenikPrehled` nefiltroval zakázkové hodnoty (přirážka, DPH), přestože
  je automatický přepočet vynechává. Varování i jeho souhrn je teď
  nepočítají; v okně přepočtu zůstávají. Věta varování říká směr stejně
  jako okno přepočtu: „nejvíc „X“ (dnes +25 % proti kalkulaci)“.
  Testy: `src/test_k13_cenik.js` 16 (bez opravy 8 selže). Upraveno
  `test_cenik_stari` (přirážka projekce už se do varování nepočítá)
  a fixtura `overit_lista.mjs` (varování #35 potřebuje skutečnou cenu).
- **P9 (K12-N48) — online nabídka tiskla „šířka - × hloubka -“.** Řádek
  „ROZMĚR ŠACHTY – VNĚJŠÍ“ se v náhledu nabídky vynechá, když chybí obě
  hodnoty (ruční přepis není vyplněný). Word ho vynechával už dřív.
- **P10 (K12-N46) — stříšky v ceně, ale ne v nabídce.** Nové zástupce
  `TS_PROSKLENA_STRISKA` a `TS_PROSKLENA_PRICKA` v datech nabídky. Když
  pole nic neříká, jsou prázdné a řádek zmizí. Náhled nabídky má oba
  řádky v sekci DOPLŇKOVÉ KONSTRUKCE. Šablona v11 na ně zatím symbol
  nemá, doplní se se šablonou. Testy: `src/test_k13_nabidka.js` 10
  (bez opravy 8 selže), `test_nabidka` (13 řádků základních parametrů).
- **P8 (K13-N60 + K12-N49) — nepřeložené texty cizojazyčné nabídky.**
  Nová hesla EN/DE/FR pro „TECHNICKÁ ČÁST – SPECIFIKACE DODÁVKY“,
  „žádné příplatky nejsou vybrány“, „nejsou součástí dodávky, viz
  příplatkové ceny“ a „přirozené, do prostoru schodiště“. **Návrh
  překladu, čeká na odbornou kontrolu J. V.** Test pokrytí
  `src/test_k13_preklad.js` projde všechny hodnoty specifikace v nabídce
  (TS_*) pro 16 zadání (interiér / exteriér, průchozí, přechodové plechy,
  lešení) a pevné texty online nabídky. Bez nových hesel selže právě na
  těchto čtyřech textech. Tisková lišta (netiskne se) a názvy ze
  zkušebního ceníku jsou z testu vyjmuté.
- **P5 (K13-N56) — Word nabídka neukazuje schválenou slevu (prověřeno,
  návrh v `podklady/K13_ROZBOR_2026-09-24.md`).** Aplikace symboly
  `CENA_PRED_SLEVOU`, `SLEVA_PROC` a `SLEVA_KC` vydává, šablona v11 je
  nemá a jiná cesta slevu do Wordu nevkládá (`ZAOKROUHLENI_KC` je vždy
  prázdný). Nová kontrola před nabídkou `slevaWord`: varianta má platnou
  slevu a šablona, ze které se tiskne, nemá `{{SLEVA_KC}}` → „Word slevu
  neukáže, zákazník uvidí jen konečnou cenu“. Symboly šablony se zjišťují
  na pozadí (stažení jen u varianty se slevou, cache podle verze), dokud
  nejsou známé, pravidlo mlčí. Testy `src/test_k13_kontroly.js` 9,
  `test_kontroly` (16 pravidel).
- **P6 (K13-N57) — pevný „Popis záměru“ a věta o opláštění ve Wordu
  (prověřeno, návrh v rozboru K13).** Šablona v11 tiskne natvrdo přístavbu
  k dvorní fasádě a izolační dvojsklo i u interiérových šachet s čistým
  VSG. Připravení zástupci pro upravenou šablonu: `POPIS_ZAMERU_OCK`
  (vlastní text z hlavičky zakázky, jinak věta podle typu šachty
  a průchodnosti) a `OPLASTENI_VETA` (z materiálu opláštění ve
  specifikaci). Šablona v11 je zatím nepoužívá. **Znění vět je návrh ke
  schválení J. V.**, překlady přibudou po schválení. Test
  `test_k13_nabidka.js` +6.

---

## v24.9.6 — dávka F4a (24. 9. 2026 večer): průchozí šachta, lešení, záporné hodiny

Rozhodnutí J. V. 24. 9. večer.

- **Průchozí šachta podle pravidla nástupišť (N46, N45).** Zadání:
  „Nástupiště obsahuje světlíky, dveře, portály s plechy a nástupní plechy.
  Nástupiště je všude tam, kde jsou dveře. Kde dveře nejsou, je provedeno
  opláštění zvoleným materiálem po celé ploše.“
  - Platí stejně pro čelní (A) i zadní (C) stěnu, ve standardu i v režimu
    po stěnách (#295 „stejné pravidlo platí i po stěnách“).
  - Stěna se dělí podle skutečných výšek. Patra pod nejvyšší stanicí mají
    pás o výšce podlaží, nejvyšší patro pás hlavy (přejezd). Prohlubeň do
    stěn nepatří, má vlastní sokl.
  - Pás s dveřmi má sklo jen ve světlících, pás bez dveří se opláští celý.
  - Každá stěna má jedno sklo a světlíky jsou z téhož skla jako jejich
    stěna.
  - Boční světlíky patří ke stěně s dveřmi (N45). Spojovací plechy
    čelního rámu se počítají podle počtu stěn s dveřmi.
  - Neprůchozí šachta se nemění. Zrcadlová šachta (A4C0 × A0C4) má
    zrcadlové stěny. Zapnutí režimu po stěnách zase nehne cenou.
  - Zadání nese jen počty dveří, proto se u nejvyššího patra předpokládají
    dveře vpředu, má-li čelní stěna nějaké dveře.
  - Detail výpočtu ukazuje rozpad stěn A a C na nástupiště a patra bez
    dveří.
  - Rozpracované průchozí zakázky se přecení (odsouhlaseno), odeslané
    nabídky se zmrazeným výsledkem ne.
- **Lešení při přepisu množství (N51, schváleno):** ve volitelných
  položkách i v příplatcích se počítá metry × sazba + celá fixní část.
  Přepis na 0 m = 0 Kč; dřív ve volitelných zůstal fix.
- **Záporné hodiny ručně zadat nejde (N56):** hodiny montáže a projekce
  (základ i ATYP) a hodiny i rezerva položek PROJ. Aplikace vrátí hlášku
  a pole mají `min="0"`. Korekce hodin montáže od referenční šachty
  (21 m, 6 nástupišť) zůstávají. Výpočet sám do minusu nejde.
- Testy:
  - nová sada `test_nastupiste.js` (20 kontrol, proti dosavadnímu jádru
    13 selže);
  - na nové pravidlo přepsány `test_oplasteni_zapnuti`,
    `test_pruchozi_zadni`, `test_sklo_steny` a `test_prepisy`;
  - `overit_zadani_detail` +5;
  - mutace jádra +5.

---

## v24.9.5 — dávka G1 (24. 9. 2026 večer): nová správa šablon dokumentů

Podle vizuálního návrhu, který J. V. 24. 9. večer odsouhlasil („návrh
správy šablon vypadá super, ten nahraj do testu").

- **Proč.** Jako česká šablona nabídky OCK se zveřejnil soubor
  `…_v11_DE.docx` (verze 9) a jazykové verze EN/DE hlásily „zastaralá“,
  i když byly nahrané moderní šablony. Příčiny:
  - tlačítko „Nahrát .docx“ nahrávalo vždy do češtiny a jazyk
    nekontrolovalo;
  - doladěnou jazykovou verzi nešlo nahrát k jazyku;
  - zastaralost se poznávala podle data zveřejnění a server stejný
    soubor podruhé nezveřejní, takže hláška nešla odstranit.
- **Nastavení → Šablony (online)** ukazuje jednu tabulku dokument ×
  CZ/EN/DE/FR se stavem ze serveru. Po kliknutí na dokument se zobrazí
  jeho detail s jazykovými verzemi a historií.
- **Průvodce novou českou verzí:** vybere se soubor a proběhne kontrola:
  - jazyk souboru (německý soubor se jako čeština nepustí a aplikace
    nabídne „Uložit jako DE verzi“);
  - symboly `{{…}}` a rozdíl proti platné verzi (chybějící symboly
    ohlásí).

  Pak aplikace sama vyrobí jazykové verze (ukáže, kolik procent se
  přeložilo) a vše se zveřejní najednou.
- **Jazykové verze u dokumentu:** „Přegenerovat z češtiny“, „Nahrát
  doladěný soubor“ (aplikace zkontroluje, že je opravdu v tom jazyce a má
  symboly platné češtiny), „Stáhnout“, „Nepřeložené fráze (CSV)“.
- **Zastaralá podle obsahu:** jazyková verze nese otisk české verze, ze
  které vznikla (`zdrojOtisk`). Server ho přijme jen k platné češtině
  (jinak 409). Stejný soubor k nové češtině se dá zveřejnit znovu.
  Starší záznamy bez otisku se posuzují postaru podle času.
- **Vrátit:** starší verze se zveřejní znovu jako nová verze s poznámkou
  „vráceno z verze N“. Nic se nepřepisuje ani nemaže.
- Bez přihlášení k serveru zůstává původní obrazovka.
- Testy:
  - `test_sablony_online` +23;
  - nová serverová sada `netlify/test_sablony.mjs` (19 kontrol, bez
    opravy 10 selže);
  - `overit_sablony_online` +20 (celkem 47): celý průvodce v prohlížeči
    nad skutečnou šablonou CN v11 včetně vrácení verze;
  - mutace jádra +3, serveru +3.
- **Zjištěno při zkoušce na skutečných šablonách:** slovník přeloží
  nabídku OCK na 100 %, nabídku PROJ jen na 26 % a smlouvy o dílo na
  0–3 %. Jejich jazykové verze by tedy vyšly skoro celé česky. Průvodce
  to ukáže (u verze pod 90 % varování); doplnění slovníku je v roadmapě.

---

## v24.9.4 — dávka F1 (24. 9. 2026): bezpečnost a ztráta práce z hloubkového testu

Opravy nejzávažnějších nálezů 20. kola (hloubkový test 24. 9. 2026). Ke
každé opravě je test. Každý test byl spuštěn i proti kódu bez opravy
a v tom běhu selhal.

- **Uložená zakázka nespustí cizí skript (B69, B70, B87).** Hodnoty ze
  zakázky, které šly do obrazovky bez escapování, se teď escapují. Jde
  o prostřední sloupec detailu výpočtu, sazbu DPH, hodiny a rezervu PROJ
  a spojky a počty v odvozených parametrech. Typ pásu opláštění jádro
  bere jen z číselníku. Cesta ceny v obsluze změny je escapovaná.
  `set`/`pjSet`/`cenikSet` odmítnou `__proto__`, `constructor`
  a `prototype`. Nová prohlížečová sada `overit_xss.mjs` (27 kontrol):
  vkládá payload do dat zakázky a vykresluje všechny záložky pro
  obchodníka i administrátora, místo aby četla zdroják (B87).
- **Příloha nespustí skript (B82).** Obsah přílohy smí být jen `data:`
  adresa. Server zakázku s `javascript:` v příloze neuloží ani neobnoví
  a tlačítko Stáhnout takovou přílohu odmítne.
- **Odeslanou nabídku ve starším tvaru dat jde uložit (N43).** Server
  porovnával migrovaná data zamčené varianty s nemigrovanou uloženou
  verzí a vracel 409 celé zakázce, i práci na odemčených variantách.
  Teď porovnává migrované s migrovaným, stejně tak obnova. Skutečná
  změna odeslané nabídky se dál odmítne. Do zamčené varianty klient
  nedoplňuje katalog ani kurz. Nová sada `netlify/test_stary_tvar.mjs` (9).
- **Klon varianty a alternativa nepřebírají schválení slevy (N44).**
  Obchodník zakázku s klonem schválené varianty dřív neuložil (403).
  Vedoucí se jejím uložením stal schvalovatelem slevy, kterou nikdy
  neviděl. Kopie si teď nese procenta a poznámku, stav a schvalovatele
  ne (stejně jako duplikát). Nová sada `netlify/test_klon_sleva.mjs` (13).
- **Zadání bez volitelných položek neshodí výpočet (N57).** Import doplní
  prázdný objekt a jádro samo nespadne. U běžné zakázky se výsledek
  nemění. Nová sada `src/test_volitelne_chybi.js` (18).
- **Autora existující zakázky server nebere od klienta (B73).** Uložením
  se zakázka nedá přestěhovat jinému obchodníkovi. Nová sada
  `netlify/test_autor.mjs` (11).
- **Zapnutí a archiv účtu berou jen true/false (B74).** Hodnota `0` nebo
  `""` obešla pojistky a vypnula i hlavní nebo vlastní účet. Teď vrátí 400.
- **Přihlášení z cizí stránky se odmítne (B78).** Cizí Origin, Origin
  `null` a formulářové tělo vrátí 403. Cizí stránka tak už nepřihlásí
  prohlížeč obchodníka do účtu útočníka.
- Příručka obchodníka má snímky a číslo verze pro v24.9.4, obsah je beze
  změny.

---

## v24.9.3 — dávka E4 (24. 9. 2026): obnova nanečisto, zámek, FR kapitoly, T4

- **Zkouška obnovy nanečisto a postup obnovy (#152, 2. část).** Nová sada
  `netlify/test_obnova_nanecisto.mjs` (20 kontrol) simuluje úplnou havárii
  ve dvou krocích:
  - Zmizí celá ostrá databáze a noční otisky zůstanou. Administrátor se
    přihlásí náhradním heslem a obnoví noční otisk. Vrátí se zakázky
    (i se zámkem odeslané nabídky), ceník v2, firma i účty; obchodník se
    přihlásí původním heslem.
  - Zmizí i zálohy. Obnova ze staženého souboru vrátí zakázky, ceník
    a firmu. Účty ne, protože soubor otisky hesel nenese.

  `podklady/POSTUP_OBNOVY_ZALOHY.md` popisuje tytéž situace s názvy
  tlačítek z aplikace a čtvrtletní ruční náhled na testu.
- **Vykreslení nezapisuje do zamčené varianty (N41d, ověřeno).**
  `oplZadani()` a `oplStena()` doplňovaly chybějící opláštění, stěny
  a pásy přímo do zadání i u odeslané nabídky. Pouhé otevření tak
  přepsalo data dokladu. U zamčené varianty se výchozí podoba jen
  spočítá. `overit_oplasteni.mjs` má 2 nové kontroly; bez opravy jedna
  selže.
- **Odstup světlé výšky 0,2 m je pojmenovaná konstanta (#327, K9-N35).**
  Konstanta `SVETLA_VYSKA_ODSTUP_M` nese vysvětlení, že 0,25 m v předloze
  0216 je překlep. Hodnota ani ceny se nemění. Mutace jádra 52/52.
- **Francouzské kapitoly nabídky (N41c).** Nastavení → Firma má FR pole
  kapitol IV.–VI. a doložek, bez výchozího textu (smluvní podmínky se
  nevymýšlejí). Vyplněné FR znění se ve francouzské nabídce použije.
  Prázdné pole dál spadne na češtinu s upozorněním a nic se nevypustí.
  `test_nabidka_kapitoly` má 6 nových kontrol.
- **T4, další krok.** Popisky zadání a detail výpočtu ověřuje prohlížeč
  (`overit_zadani_detail.mjs`, 21 kontrol), ne regulární výrazy nad
  zdrojákem. Sada hlídá i to, že má každý řádek detailu OCK a PROJ
  vysvětlení. Obráceně: vyprázdněné vysvětlení sada chytí.
  `test_zadani_popisky.js` si ponechal jen čistou funkci `nulaOznac`.
- **Podklady Pipedrive** z nesloučené větve jsou v `podklady/` (návrh
  zápisu a patch serverových funkcí, do kódu se zatím nepouští).

---

## v24.9.2 — dávka E3 (24. 9. 2026): cizojazyčná nabídka podle 10. kola

- **13 příplatků má překlad EN/DE/FR (#335, K10-N38).** V anglické
  nabídce se dosud tisklo česky třeba „LEŠENÍ - vnitřní" vedle
  „SCAFFOLDING – external". Názvy drží terminologii sousedních hesel.
  Nová sada `test_preklad_priplatky.js` (50 kontrol) bere názvy příplatků
  přímo ze zdrojáku jádra, takže nový příplatek bez překladu ji shodí.
  Obráceně: bez nových hesel selže 35 kontrol.
- **Pevné texty šablony nabídky OCK jsou ve slovníku (#334, K10-N36).**
  Jde o 24 textů v EN/DE/FR: nadpisy A./B./I./II., úvod, poznámky k ceně,
  platební podmínky, kapitola V. šablony v10 a věta o předávacím
  protokolu. Kontaktní blok firmy (web, telefon, IČ, PSČ a město, ulice,
  název s právní formou, oddělovací čára) se nově pozná jako text, který
  se nepřekládá. Vzory jsou úzké a test hlídá, že běžný text s číslem
  pořád jde do překladu. Překladač šablony teď nad v10 i v11 nenechá
  česky nic: v anglické i německé mutaci chybí 0 textů (dříve 31 u v10
  a 27 u v11).
- **Pojistka zastaralé jazykové mutace (#334, K10-N36/N37).** Mutace
  EN/DE/FR zveřejněná dřív než platná česká šablona je zastaralá. V ostré
  šlo o mutaci z v8 proti české v10: 17 % textu bylo česky a chyběl
  řádek soklu. V přísném režimu se z takové mutace netiskne; hláška řekne
  proč a že ji administrátor přegeneruje. Česká nabídka tím zastavená
  není. V měkkém režimu se tiskne dál, ale s upozorněním. Nastavení →
  Šablony u mutace ukáže „⚠ zastaralá". `overit_sablony_online.mjs` má
  7 nových kontrol (28/28); obráceně bez pojistky selžou 3.
- **Příručka obchodníka nezmiňuje testovací web** (pokyn J. V.:
  obchodníkům přístupný nebude). Kapitola 4, heslo ve slovníčku a zmínky
  v úvodu jsou pryč. Kapitoly jsou přečíslované (33 → 32) i se 40 odkazy
  v textu. Kontrola v `manual/overit.js` je obrácená a nad starou
  příručkou selže. Příručka nese v24.9.2.
- **Postup vydání ve třech krocích:** 1) `test-draft` (rozpracované,
  Netlify ho nenasazuje), 2) `test` (testovací web, před nahráním
  `nastroje/pred_pushem.sh`), 3) `main` (ostrý web, CI běží samo).

---

## 24. 9. 2026 — dávka E2: příručka obchodníka pro v24.9.1 (aplikace beze změny)

- **Text příručky (`manual/obsah.json`) odpovídá v24.9.1.** Poslední
  příručka byla z v17.9.3. Přibyl rámeček „Co je nového od příručky ze
  17. 9. 2026" a upravilo se 18 kapitol. Hlavní témata:
  - zmrazený Model 1 a nová podkapitola „Režim výpočtu";
  - termín dodání s ATYP v kapitole V. a kontrola před nabídkou;
  - kapitoly III.–VI. v nabídce;
  - opláštění po stěnách;
  - zakázka jen ke čtení a jedno číslo varianty;
  - DPH 0 % u zahraničí;
  - obnovení stránky bez ztráty práce;
  - nové hlášky ve slovníčku.
- **Snímky se pořizují automaticky (`manual/snimky_auto.mjs`).** Dosud se
  fotily ručně v prohlížeči nad testovacím webem. Nástroj spustí aplikaci
  lokálně se zkušebním ceníkem a vymyšlenými zakázkami, přihlásí se jako
  obchodník a za zhruba 30 s pořídí všech 21 snímků (3 nové: režim
  výpočtu, kapitola V. nabídky, panel kontrol). Snímky nenesou skutečné
  ceny a příručka to říká. Výstup jde mimo repozitář; hotová příručka se
  do repozitáře dál neukládá.
- **`overit_manual.mjs` je přepsaný na nový tvar příručky (N17).** Do teď
  hlídal srpnový tvar s 25 zapečenými PNG a nad každou novou příručkou
  hlásil 13 falešných selhání. Nově pouští v Chromiu `manual/overit.js`
  a přidává kontrolu verze proti `verze.txt` a povinná témata. Nad novou
  příručkou prošlo 37 kontrol z 37. Nad starou v17.9.3 selhávají 4 kontroly
  a všechny právem: stará verze, chybějící témata E1 a tři vysvětlivky,
  které tam mířily na text, jenž na snímcích nebyl.
- **CI:** automaticky běží jen při nahrání na main, jinak ručně (viz
  záznam níž).

---

## 24. 9. 2026 — testy lokálně, CI jen při nahrání na main (aplikace beze změny)

- **GitHub Actions běží automaticky jen při nahrání na main** (rozhodnutí
  J. V. 24. 9. 2026: „testovat lokálně", CI „když řeknu nahraj na main").
  Na main se nahrává jen na pokyn, tedy při vydání na ostrý web; CI tam
  poběží celé včetně mutací. Na větvi test se nespouští, ručně jde pustit
  vždy (GitHub → Actions → Testy → Run workflow). Do té doby běželo při
  každém pushi na test i main a opakovalo to, co už proběhlo v sezení.
- **Nový `nastroje/pred_pushem.sh`** dělá totéž co CI, a to před pushem:
  kontrolu verze proti dni commitu, kontrolu CRLF, sady v Node a všechny
  prohlížečové harnessy. S přepínačem `--mutace` pustí i celý mutační běh
  serveru a jádra (jen když se měnil server nebo jádro). Firemní šablony
  se předávají přes `KNG_PODKLADY`.
- **Jedna dávka = jeden push na test** na jejím konci (každý push je
  nasazení na Netlify). Do main jen na pokyn „slouč".

---

## v24.9.1 — dávka E1 (24. 9. 2026): rozhodnutí J. V. k #149 a #277

- **Model 1 je zmrazený pro ne-administrátory (#332).** Rozhodnutí J. V.
  z 24. 9.: dál se rozvíjí jen Model 2 a na Model 1 nepůjde přepnout.
  Na Model 1 přepne jen administrátor. Pojistka je v `set()`, takže ji
  neobejde ani jiné volání než přepínač. Zakázka, která v Modelu 1 už je,
  se počítá dál beze změny ceny. Obchodník ji smí převést na Model 2,
  zpátky ne, a u volby vidí štítek „Model 1 (zmrazený)". Harness
  `overit_zobrazeni.mjs` +4. Ověřeno i obráceně: bez pojistky 2 selhání,
  bez úpravy přepínače 2 selhání.
- **Termín dodání s ATYP je v nabídce (#330, nález TD1).** Termín dodání
  z krycího listu (`{{PODM_TERMIN_DODANI}}`) je první odrážkou kapitoly V.
  v náhledu i v PDF. Zahrnuje prodloužení za ATYP i ruční přepis. Zbytek
  kapitoly zůstává textem z Firmy. Když lhůta ve Firmě chybí, odrážka se
  vynechá (nic se nevymýšlí). Překlad EN/DE/FR zajišťuje nový vzor, který
  stojí před obecným „cca …", aby nevznikla půlka věty česky.
  Nové 15. pravidlo kontrol před nabídkou **„Termín dodání u atypické
  zakázky"** hlásí dva případy: kapitola V. z Firmy uvádí jinou lhůtu než
  termín ze zakázky, nebo ve Firmě chybí standardní lhůta. Testy:
  `test_nabidka_kapitoly` +11, `test_kontroly` +8. Obráceně: bez opravy
  8 a 5 selhání.
- **Šablona CN v11 (#331) — kapitoly ze symbolů, ne natvrdo.** Šablona je
  připravená mimo repozitář a nahraje ji administrátor. Kapitoly IV.–VI.
  a nové DOLOŽKY v ní plní `{{FIRMA_NAB_POZADAVKY}}`,
  `{{FIRMA_NAB_PREDANI}}` a `{{FIRMA_NAB_DOLOZKY}}`. Kapitola V. je jeden
  symbol `{{NAB_KAP_TERMINY}}`: termín dodání ze zakázky plus text z Firmy.
  Jde o jeden symbol, aby při nevyplněné lhůtě nezůstal prázdný řádek
  tabulky. Word i náhled teď tisknou kapitoly ze stejného zdroje.
  `overit_sablona.mjs` má novou sadu pro v11+ (v11: 54/54). U starší
  šablony sadu přeskočí a řekne to. `test_nabidka_kapitoly` +4.
- **Hlídka noční zálohy (#152, první část).** Administrátor při přihlášení
  dnešní otisk dopořídí sám, takže přehled záloh vypadal zdravě, i když
  noční funkce neběžela. Nová `uloZalohaHlidka()` v `src/uloziste.js`
  sleduje zvlášť poslední **noční** otisk. Když je starší než 48 hodin
  (dvě zmeškané noci) nebo chybí, administrátor dostane varování po
  přihlášení i v Nastavení → Databáze. Jinak tam vidí klidný řádek
  s datem poslední noční zálohy. Obchodník hlídku nevidí. Testy:
  `test_uloziste` +8, `overit_online` +5. Obráceně: bez filtru na noční
  otisk 4 a 2 selhání. Zkouška obnovy nanečisto (2. část #152) zůstává
  otevřená.

---

## v23.9.3 — dávka D3 (23. 9. 2026 večer): nástroje a testy, aplikace beze změny

- **Mutační testování jádra je v repozitáři (N19).** `mutace_jadro.mjs`
  (převzato ze zdrojáků v21.8.1, bez cen) do té doby v repozitáři chybělo,
  takže ho nespustilo CI ani cloud. Šest kotev mířilo do prázdna, protože
  se jádro od 17. 8. změnilo. Kotvy jsou opravené a přibyl rychlý režim
  `--kontrola`, který pouští `spust_testy.sh` i CI. V CI je nový job
  `mutace-jadro` s plným během.
- **První běh ukázal 11 nechycených mutací z 52.** Dřív je hlídaly sady
  shody s Excelem, které potřebují skutečný ceník a v repozitáři nejsou.
  Nová sada `src/test_jadro_pojistky.js` (24 kontrol nad zkušebním ceníkem)
  je hlídá chováním: DPH ze zaokrouhleného základu, sazby plechů podle
  provedení, sazba statiky, zaokrouhlení příplatků, rozdíly Modelu 1
  ($D$3, lemování, podesty, D19/D18), doprava, rezerva hodin a sazba
  zaměření v PROJ. Teď je chyceno **52/52**.
- **Harness šablony nabídky bere nejnovější verzi.** `overit_sablona.mjs`
  hledal napevno v8/v7, a tak kontroloval šablonu, se kterou se už netiskne.
  Nově ji vybírá `najdiNejnovejsi` (v10 porazí v9 jako číslo). Od v9 je
  titulní obrázek rámečkem úvodní fotky, proto harness dodá i fotku.
  Výsledek: v10 42/42, v7 42/42.
- **T4, první krok.** Kontroly obrazovek zaokrouhlení OCK × PROJ se
  přestaly ověřovat čtením zdrojáku (`test_zaokrouhleni.js`) a ověřuje je
  nový harness `overit_zaokrouhleni.mjs` (12 kontrol, se sabotáží 3
  selhání). Ostatní testy tvaru zdrojáku se přepisují postupně.

---

## v23.9.3 — 23. 9. 2026 (noční dávka D1 + D2)

### D1 — drobnosti z 9. testovacího kola a revize v22.9.9

- **Varování, když chybí kapitoly IV.–VI. (#324, K9-N32).** Prázdná kapitola
  se z nabídky OCK vypouští i s nadpisem, takže odešla bez požadavků, termínů
  a předání díla a nikdo o tom nevěděl. Nově je v kontrolách před nabídkou
  pravidlo „Nevyplněné kapitoly nabídky“ (varování, jazyk podle tisku)
  a Nastavení → Firma → Kapitoly nabídky ukazuje, které české kapitoly chybí.
  `firmaKapitolyPrazdne` v `src/firma.js`. Test: `test_kontroly.js` (+8).
- **Zablokované vyskakovací okno (#328, K6).** Osm tiskových náhledů padalo
  na `w.document`, když prohlížeč okno zablokoval, a obchodník neviděl nic.
  Teď přes `oknoNahledu()` dostane hlášku, jak okna povolit. Test:
  `overit_dialogy.mjs` (+3, bez opravy 2 selhání).
- **Technická specifikace vypisuje jen započítané pásy (N41b).** Věta
  o opláštění po stěnách se skládá z pásů, které jádro opravdu spočítalo.
  Pás nad horní hranou prosklení nebo pod předchozím pásem už ve specifikaci
  není. Test: `test_oplasteni_zapnuti.js` (+5, bez opravy 2 selhání).
- **Hlavní správce v Nastavení (#278).** Administrátor v Nastavení →
  Uživatelé vidí, jestli je na serveru nastavená proměnná `ADMIN_EMAIL`.
  Pokud chybí, dostane varování s návodem.

### D2 — bezpečnost (B57, B58, B61, B62, B68) a meze v dokumentaci

- **B57:** `/api/zdravi` už anonymně nehlásí, jestli je nastavený hlavní
  správce. Údaj dostává jen administrátor v `/api/ja` a v odpovědi na
  přihlášení (viz #278).
- **B58:** kniha smazaných účtů jde s oběma zálohami. Obnova ze serverového
  otisku ji doplní, existující záznam nepřepíše a u e-mailu, pod kterým žije
  účet, nic nezapíše.
- **B61:** server odmítne nový zámek, jehož číslo nesedí na data zakázky
  nebo nemá značku `cisloPapir`. Dřív tudy prošla „odeslaná“ nabídka pod
  novým číslem bez porovnání. Administrátorovi při změně čísla server
  razítko dál srovná (B56).
- **B62:** u existujícího zámku bere server `kdo`, `popis` a `sablona`
  z uložené verze. Z `tisky[]` a `odemceni[]` platí uložený začátek:
  přidávat se smí, přepsat ani ubrat ne (`uloZamekRazitkaDrz`).
- **B68:** textová pole firmy mají kontrolu typu a délky (2 000 znaků,
  u kapitol 20 000).
- Nový dokument **`BEZPECNOST_MEZE.md`**: B65–B67 a zbytkové meze B61/B62.

Testy: `test_prava.mjs` (534, +12), `test_obnova.mjs` (+4), `test_firma.js`
(+4), `overit_zobrazeni.mjs` (+2). Šest nových mutací (150 celkem), všechny
chycené. Testy, které zakládaly zámek bez čísla, teď dělají zámek stejně
jako aplikace. Staré zámky zapisují rovnou do úložiště, jako by tam ležely
odjakživa.

---

## v23.9.2 — 23. 9. 2026

### Skrýt / srolovat u všech karet Kalkulace OCK; skrytí se obchodníkovi projeví hned

Zadání J. V.: „přidej skrývací a rolovací tlačítka do všech sekcí kalkulace
OCK a prověř funkčnost skrývání pro obchodníky. Přijde mi, že když vyberu
skrýt, tak obchodník sekci stále vidí."

**Co bylo špatně.** Volbu zobrazit / skrýt / srolovat měly jen sekce
tabulky (Hrubá OCK, Opláštění, Volitelné, Režie), Příplatky, Detail
mezivýpočtů a Interní poznámky. Karty Zadání šachty, Opláštění po stěnách,
Dimenze profilů, Práce a režie, Cenová kalkulace, Sleva, Obchodní
zaokrouhlení a Cenová nabídka (CN) ji neměly vůbec. A hlavně: obchodník
dostával nastavení zobrazení jen při přihlášení. Kdo měl aplikaci otevřenou
(stránka běží i celé dny), viděl skrytou sekci dál až do obnovení stránky.
Změřeno v prohlížeči: v jednom okně skrytí fungovalo, u už přihlášeného
obchodníka se neprojevilo.

**Co platí teď.**
- Všechny karty Kalkulace OCK mají v nadpisu stejný select a u srolované
  karty tlačítko „▸ rozbalit" (stejný vzhled jako Detail mezivýpočtů).
  Dimenze profilů zůstávají ve výchozím stavu sbalené. U PROJ se nic
  nemění.
- Přihlášený obchodník nebo vedoucí si nastavení zobrazení načte znovu
  každé 3 minuty a při každém návratu do okna (nejčastěji jednou za
  minutu). Překreslí se, jen když se něco změnilo. Administrátora to
  vynechává, aby mu stažení nepřepsalo neuložené zaškrtnutí.
- Kotva skryté sekce zmizí i z klouzající lišty (OCK i PROJ), aby
  neukazovala do prázdna.

Skrytá sekce se dál počítá, jen není vidět. Skrytím Zadání šachty by
obchodník přišel o možnost zadat rozměry, takže tuto volbu používejte
s rozmyslem.

Testy: `overit_zobrazeni.mjs` (+13 kontrol: select u každé karty, rozbalení,
skrytá karta i kotva u přihlášeného obchodníka, změna za chodu a její
vrácení).

### CI: harness overit_verzi nepadá den po commitu

Běh CI na main (commit 94a7267 z 22. 9., spuštěný 23. 9.) selhal ve dvou
harnessech, ačkoli týž commit na testu den předtím prošel. `overit_verzi.mjs`
vrací verzi z gitu příkazem `build.py --ver …` a pojistka data (od 20. 8.)
verzi ze včerejška odmítla — i v bloku `finally`. V `dist/` tak zůstala verze
z lokálního buildu a `overit_zobrazeni.mjs` narazil na blokující překryv
„nesoulad verzí". Aplikace ani ostrý web to nezasáhlo (Netlify verzi jen
přebírá). Návrat verze teď pojistku vědomě obchází (`KNG_VERZE_MIMO_DEN=1`).
Ověřeno nad stavem main: bez opravy harness spadne, s ní 7/7 a
overit_zobrazeni 121/0.

---

## v23.9.1 — 23. 9. 2026

### Nová tuzemská zakázka už nehlásí falešný rozdíl ceníku (K9-N31)

Nález z 9. testovacího kola. **Co bylo špatně:** každá nová tuzemská
zakázka hned po založení ukazovala lištu „Ceník v této kalkulaci se liší od
dnešního ceníku aplikace – 1 položka … −100 %". Šlo o položku označenou
„jen zahraničí": přehled ji srovnává s ceníkem složeným pro tuzemskou řadu,
kde je nulová, kdežto nová zakázka brala holý ceník aplikace. Na cenu to
vliv nemělo, obchodník ale dostával planý poplach.

**Co platí teď:** nová zakázka i nová varianta dostanou ceník už složený pro
tuzemskou řadu — položky „jen zahraničí" se zahraniční cenou jsou na nule,
stejně jako po přepočtu (`novaVariantaData` v `zakazka.js`). Test:
`test_cenik_rady.js` (4 kontroly; bez opravy dvě selžou).

---

## v22.9.22 — 22. 9. 2026

### Jedno číslo varianty — platí číslo na papíře (#320)

Rozhodnutí J. V.: „platí číslo na papíře, nové klony dostanou příponu shodnou
s pořadím a odeslaným nabídkám zůstane číslo, se kterým odešly."

**Co bylo špatně.** Varianta měla dvě čísla. Dokumenty (nabídky OCK i PROJ,
krycí listy) číslovaly podle POŘADÍ v zakázce — druhá varianta …555.2 —
kdežto zámek odeslané nabídky, seznam variant, archiv, hlášky i serverová
kontrola čísla (B56) podle přípony klonu, kterou první klon dostal .1.
Změřeno: druhá varianta odešla zákazníkovi jako 0555.2, v zámku stála
0555.1 a číslo 0555.2 v aplikaci patřilo jiné nabídce než na papíře. Číslo
podle pořadí se navíc posouvalo: po smazání dřívější varianty nesl dotisk
téže odeslané nabídky jiné číslo, než jaké odešlo.

**Co platí teď.** Číslo je jedno — přípona varianty — a berou ho odsud
dokumenty, zámek, seznamy i server. Nová varianta (klon, alternativa
z archivu, duplikát) dostane příponu podle pořadí: druhá .2, třetí .3.
Po smazání varianty se její číslo znovu nepoužije — další dostane číslo
nad maximem (…555.4 místo uvolněného .3), protože číslo, které jednou
padlo, nesmí patřit jiné nabídce. Název klonu nese totéž číslo
(„Varianta 3" = .3).

**Uložené zakázky.** Při prvním načtení se jednou přečíslují podle pořadí
— tedy na přesně to číslo, které jim dosud tiskly dokumenty. Týká se to
i odeslaných variant: jejich papír nesl číslo podle pořadí. Od té chvíle se
číslo nemění ani po smazání jiné varianty (značka `priponySchema`).
Samotného zámku se migrace nedotkne — `zamek.cislo` je v klíči zámku
a zůstává, jak byl pořízen; lišta zámku ale ukazuje číslo z papíru.

**Server (B56).** Nový zámek nese značku `cisloPapir` (je v klíči zámku,
nedá se sundat) a server u něj hlídá celé číslo včetně přípony —
přečíslovat odeslanou nabídku .2 na .7 obchodník nesmí. U starých zámků se
hlídá jen základ čísla; jinak by migrace sama zablokovala každé uložení
zakázky se starou odeslanou variantou.

**Mez.** Nabídka odeslaná před touto změnou, u níž se mezitím smazala
dřívější varianta, nese na papíře jiné číslo, než jaké jí dává pořadí dnes.
Kolik variant tehdy existovalo, se nikde nezapisovalo — zůstává jí číslo,
které aplikace ukazovala naposledy.

Testy: `test_zamek.js` oddíl #320 (20 kontrol: dokument = zámek u každé
varianty, číslo drží po smazání dřívější varianty, znovunačtení
nepřečísluje, migrace starého zámku bez zásahu do klíče, duplikáty
z v22.9.16 se třemi nulami, značka v klíči), `test_prava.mjs` (10: stará
zakázka se starým zámkem se po migraci uloží, změna základu u starého
zámku i přečíslování přípony u nového se odmítnou, sundaná značka → 409),
`overit_online.mjs` 10e (stará zakázka v prohlížeči: lišta i dokument
nesou .2), `overit_lista.mjs` (klon .2 a nabídka ho vytiskne pod týmž
číslem). Upravena očekávání starého číslování v `test_archiv`, `test_seznam`
a `test_zakazka_duplikace`. Tři nové mutace, serverových mutací je 144.

---

## v22.9.21 — 22. 9. 2026

### Dávka R5 z revize v22.9.9 — testy říkají pravdu o tom, co neověřily

Aplikace se v této dávce nemění; mění se to, co o ní hlásí testy.

**Přeskočený harness už není „prošlo" (T3).** Harness bez firemního
podkladu (wordové šablony, příručka obchodníka) končil kódem 0, takže CI
psalo „OK" a `spust_testy.sh` „✓ prošlo". Souhrn hlásil „všechny prošly",
zatímco pět harnessů — příručka, nabídka PROJ ve Wordu, šablona nabídky,
šablony online a smlouvy — v CI nikdy neběželo. `preskoc()` teď končí
vlastním kódem 4; `spust_testy.sh` ho počítá jako PŘESKOČENO s důvodem
a CI ho vypíše jako „PŘESKOČENO" i jako upozornění v přehledu běhu. Souhrn
místo „159 prošlo" říká „155 prošlo, 6 přeskočeno" a vyjmenuje je.

**Selhání před přeskočením se nezamete (T2).** `overit_sablony_online.mjs`
pouští pět kontrol přísného režimu ještě před hledáním šablony — a když
šablona chyběla (v CI vždy), skončil kódem 0 i se selháním. Harness teď
předává `preskoc()` svůj stav a selhání před přeskočením je selháním
harnessu. Že to dělá každý harness s kontrolou nad přeskočením, hlídá
nová sada.

**Chybějící playwright (T5).** Kód 2 se dosud nepočítal nikam a harness,
který playwright importuje (ESM proměnnou `NODE_PATH` nečte), padal bez
místního `node_modules/playwright` jako selhání s radou „npm i -g
playwright", která mu nepomůže. Obojí je teď přeskočení s radou
„v kořeni: npm i playwright".

**Obnova proměnné v testu (T5).** `test_prava.mjs` po bloku B54 vracel
`ADMIN_EMAIL` přiřazením — u nenastavené proměnné tím zapsal řetězec
„undefined". Nenastavená teď zůstane nenastavená.

Nová sada `src/test_harness_podklady.js` nezkouší text skriptů, ale jejich
chování: spouští skutečné `preskoc()`, skutečný krok z workflow a skutečnou
funkci `spust_prohlizec` nad podstrčenými harnessy s kódy 0, 1, 2, 4
a s chybějícím playwrightem. Nad skripty před opravou 16 selhání z 21.

---

## v22.9.20 — 22. 9. 2026

### Dávka R4 z revize v22.9.9 — server a mutační nástroj

**Výsledek nově odeslané nabídky ověří server (B59).** Oprava B53 chrání
zmrazený výsledek odeslané nabídky PO zamčení, jenže ten výsledek do té doby
pořizoval jedině prohlížeč a server ho při vzniku zámku převzal, jak přišel.
Upravený klient tak mohl zamknout nabídku s jinými čísly, než dávají data
(třeba s větší slevou, než smí schválit), a B53 ji pak chránil jako pravdu.

Server teď výsledek každého NOVÉHO zámku přepočítá tímž jádrem a porovnání
zapíše do zámku jako razítko: shoda / nesouhlasí / neověřeno. Výsledek skládá
jediná funkce `zamekVysledekSpocti` v `zamek.js` — tou ho pořizuje prohlížeč
při tisku i tou ho ověřuje server, aby se dva opisy téhož vzorce časem
nerozešly. Razítko píše výhradně server: u nového zámku ho spočítá, u zámku,
který už v databázi je, ho převezme z uložené verze. Klient ho tedy
nepodvrhne ani nesmaže.

Rozpor uložení **neodmítne** — vědomé rozhodnutí. Papír v tu chvíli už
odešel a odmítnutí by jen nechalo variantu v databázi odemčenou a dál
upravitelnou, což je horší stopa než zámek s rozporem zapsaným natrvalo.
A poctivého obchodníka se stránkou načtenou těsně před nasazením nové verze
by zablokovalo: jeho čísla spočítalo starší jádro a papír nese právě ta.
Rozpor proto hlásí hned hláška po uložení a trvale lišta zámku u každého,
kdo variantu otevře (i se jménem verze, která výsledek spočítala).

Ověřeno v prohlížeči: nabídka zamčená skutečným tiskovým náhledem má
u serveru shodu (po cestě přes síť i přes `importZakazka`), upravený klient
dostane varování a rozpor v liště.

**Mutace na větev role u B56 (T5).** Dosavadní mutace vypínala celou
kontrolu čísla odeslané nabídky; nově se zkouší i to, že by kontrola běžela,
ale nikoho nezastavila. Přibyly čtyři mutace B59. Serverových mutací je 141.

**Přerušený mutační běh vrátí zmutovaný soubor (T5).** V 19. kole zůstal
po přerušení v pracovní kopii rozbitý serverový soubor. `mutace.mjs` teď
na SIGINT, SIGTERM i SIGHUP nejdřív vrátí právě zmutovaný soubor, pak
ukončí běžící sadu, počká na ni (jinak po ní v kontejneru visí zombie)
a skončí kódem 130. Sady se kvůli tomu spouštějí asynchronně — se
synchronním `execFileSync` by se obsluha signálu dostala ke slovu až po
doběhnutí všech mutací. Hlídá to nová sada `netlify/test_mutace.mjs`:
skutečný běh s podstrčenou čekající sadou, oba signály, soubor bajt po
bajtu, žádný visící proces.

---

## v22.9.19 — 22. 9. 2026

### Dávka R3 z revize v22.9.9 — pojistky ceníku

**Značka prázdného ceníku se sundávala sama (N33).** Pravidlo „jediné
nenulové číslo dokazuje skutečné ceny" počítalo s tím, že vynulovaný ceník
má nuly všude. Sestavení ale nese skutečné sazby DPH (zákonné, ne firemní
data) — OCK 12 % a předvolby, PROJ 21 %. Každý ceník tak „měl čísla" a při
otevření zakázky se značka prázdného ceníku sundala; u uzamčené varianty
natrvalo, i s červenou lištou a zábranou tisku nad nulovými cenami. Za
důkaz cen se nově nepočítají sazby a předvolby DPH, přirážka, procenta
a kurz. Test se ptá přímo výchozích ceníků ze sestavení, ne umělé fixtury
s `dph: 0`.

Harness `overit_program` na té chybě nevědomky stál: jeho „ceník projekce
s čísly" byl ve skutečnosti samé nuly se sazbou DPH. Dostal jednu
smyšlenou hodinovou sazbu a přibyl případ ceníku PROJ samých nul se sazbou
DPH, kterému značka zůstat musí.

**Návrat do tuzemska u položky jen pro zahraničí (N38).** Tuzemská řada má
u takové položky nulu, návrat ale dosazoval hodnotu z ČR sloupce ceníku
(změřeno: 50 000 místo 0). Přepočet při dalším otevření pak hlásil „Změnila
se 1 cena", ačkoli se nic nezměnilo. Návrat bere hodnotu ze složené
tuzemské řady — tatáž funkce jako přepočet.

---

## v22.9.18 — 22. 9. 2026

### Dávka R2 z revize v22.9.9 — kde se ztrácela nebo tiše ukládala práce

Všechny čtyři nálezy revize ověřila čtením kódu; tady jsou poprvé
**změřené v prohlížeči** — každý test nad kódem před opravou selže.

**Ruční přihlášení po vypršení relace (N34).** Posluchače „uživatel něco
udělal" sedí na celém dokumentu a přihlašovací okno je v tomtéž dokumentu:
napsání hesla značku nastavilo dřív, než se člověk přihlásil. Poslední
zakázka se pak neotevřela (změřeno: místo ní prázdná zakázka s firemní
přirážkou) a aplikace hlásila neuložené změny, které nikdo neudělal. Oprava
N12/N13 tak platila jen pro F5 se živou relací. Události z přihlašovacího
okna se nově nepočítají; ochrana rozdělané práce zůstává.

**Společné dodatkové texty po nasazení ceníku (N35).** Nasazení platného
ceníku vyměňuje výchozí ceník celý — a texty vlité po přihlášení tím
zmizely, podle toho, který požadavek doběhl dřív; po zveřejnění nového
ceníku pokaždé. Texty se teď vlévají znovu po každé výměně ceníku.

**Duplikace s neuloženými změnami (N36).** Dotaz se ptal jen režimu složky,
který je vypnutý — v online režimu se nepoložil nikdy a duplikace práci
tiše zahodila. Nově se ptá jako otevření jiné zakázky (uložit / zahodit /
zůstat) a od předlohy se odpojí toutéž funkcí jako „Nová zakázka", která
ruší i naplánovaný autosave předchozí zakázky.

**„Vrátit původní ceny" v obnovené záloze (N37).** Větev vrácení prohlásila
zakázku za uloženou — u zálohy z prohlížeče, která na serveru není, tím
autosave i varování při zavření okna ztichly. U zálohy se to už neděje;
u zakázky ze serveru ano (jinak by první klik uložil odmítnuté ceny).

---

## v22.9.17 — 22. 9. 2026

### Dávka R1 z revize v22.9.9 — rychlé opravy

Pořadí dávek schválil J. V. („ano, začni dávkou R1"). Tři z oprav jdou za
mnou: B60 a protokol poznámek vznikly s jediným textovým polem poznámek
(#311), a B63 s tím, že dodatkový text vidí každý (#310).

**Duplikace zakázky (N32 + B60).** Všechny varianty duplikátu dostávaly
příponu 0, tedy v zámku, v seznamu variant i v hláškách tři nabídky pod
holým číslem; test to dokonce zafixoval. Nově přípony podle pořadí (holé
číslo, .1, .2) a nejvyšší přípona odpovídá duplikátu, ne předloze. Duplikát
navíc nesl celé jediné textové pole poznámek — zápisky o jednání s jiným
zákazníkem —, ačkoli dialog tvrdí, že se poznámky nekopírují. Už nenese.

**Dodatkový text v zamčené zakázce (B63).** Pole textu pod položkou se ptalo
jen na zámek varianty. V zakázce jen ke čtení text přijalo a po F5 byl pryč;
v náhledu cizího uživatele by ho administrátor zapsal i na server. Teď ho
hlídá týž obal jako ostatní zápisy (náhled, zámek čtení, zámek varianty).

**Varování u stěny s nulovou plochou (N39).** Tvrdilo, že se čelní stěna
bere ze světlíků — stav před #295. Dnes říká pravý důvod: otvory dveří
a portálů zaberou celou stěnu (nízká šachta s mnoha nástupišti), a totéž
umí i u zadní stěny průchozí šachty.

**Protokol zakázky vidí úpravu poznámky (N41).** Od #311 se poznámka píše do
jediného pole a protokol porovnával jen počty v seznamech — úprava v něm
nebyla vůbec. Zapisuje se, že se poznámka změnila a o kolik znaků, nikdy
obsah. Porovnává se text, který uživatel vidí, takže první uložení pole
u starší zakázky se za změnu nevydává.

**Obnova společných dodatkových textů ze zálohy (B64).** Zapisovala je
doslova; nově projdou toutéž očistou jako běžný zápis (strop délky, počtu
a tvaru). Nová mutace to hlídá, chycená — celkem 136.

**Cenový test režimu po stěnách (T1).** Dosavadní kontrola byla rovnost
z konstrukce a cenu neměřila — proto prošel N31. Nově: na 128 zadáních
(oba modely) se náklad opláštění hýbe stejným směrem jako plocha, a regrese
N31 — u průchozí šachty zaškrtnutí světlíku nad dveřmi v režimu po stěnách
nemění základ čelní ani zadní stěny a cenu nesníží. Ověřeno, že nad jádrem
v22.9.9 sada padá (24 selhání), nad dnešním prochází.

Každá oprava je ověřená i opačně: test nad kódem před opravou selže.

**Mimo R1 se při práci ukázal nový nález, ne k opravě bez rozhodnutí:**
číslo varianty v dokumentu (index v zakázce: druhá varianta „.2") se liší
od čísla v zámku, v hláškách a na serveru (přípona klonu: první klon „.1").
U odeslané nabídky tak zákazník má na papíře jiné číslo, než jaké o ní
aplikace ukazuje. Zapsáno do roadmapy jako #320 s otázkou.

---

## v22.9.16 — 22. 9. 2026

### Vnější lešení je u interiérové šachty zase příplatkem

Pokyn J. V. večer: „vnější lešení vrať do příplatkových položek."

Oprava K1 z odpoledne (v22.9.12) ho u interiérové šachty vyřadila ze
základní ceny **i z příplatků**. Rozhodnutí přitom znělo „primárně
nenabízet" — tedy nedávat do základní ceny, ne zakázat. U interiérové šachty
je teď vnější lešení **vždycky příplatkem**: do základní ceny se tam dostat
nemůže, zákazník si ho ale doobjedná. Cena příplatku je tatáž jako na
exteriérové šachtě (obvod lešení × výška + fixní část). Nabídka u něj tiskne
cenu, specifikace „lze doplnit viz příplatkové ceny" a kapitola IV. dál žádá
lešení po objednateli, dokud si ho neobjedná.

### Technická specifikace se řídí cenou (P8/6 statika, P8/7 lešení)

**Statika:** „statiku nastav tak, ať dokument respektuje to, co je v ceně."
Pole OVĚŘOVACÍ STATICKÝ VÝPOČET KONSTRUKCE mělo pevné „ano" a šlo přepsat na
„ne", zatímco statika v ceně zůstala — a naopak. Nově je **odvozené**: „ano",
když je v Kalkulaci OCK položka STATICKÉ POSOUZENÍ s nenulovým množstvím,
jinak „ne". Na obrazovce je jen ke čtení a říká, kde se statika vypíná
(množstvím 0). Statika zdarma (cena 0, množství nenulové) je pořád „ano" —
dělá se.

**Lešení kolem OCK:** schválený návrh k P8/7 chtěl srovnat specifikaci
i kapitolu IV.; oprava K1 srovnala jen kapitolu. U exteriérové šachty
s lešením v ceně tak dokument tvrdil v jedné sekci „je součástí dodávky"
a v sekci SOUČÁSTÍ DODÁVKY NENÍ „zajistí objednatel". Ten řádek se teď
v tom případě **vynechá** — stejně jako sokl od 16. 9. Mimo tenhle případ
volí text dál obchodník.

**Ruční hodnota se nemaže.** Zůstává v datech a obrazovka ukáže, že se
nepoužije. Vrátí se, kdyby cena přestala rozhodovat.

U odeslané nabídky se znění řídí zmrazeným výsledkem, takže se zpětně
nezmění — kromě případu, kdy ruční text ceně odporoval; takový dokument si
odporoval už při odeslání.

### P8/5 montáž — uzavřeno bez zásahu

„Počet lidí na montáž neřeš." Čtyřka v kódu zůstává. Tím je uzavřených všech
devět voleb P8 (#285).

---

## v22.9.15 — 22. 9. 2026

### Zahraniční zakázka má po přepnutí sazbu DPH 0 %

J. V. ke snímku zahraniční zakázky se sazbou 12 %: „sazba DPH se při
přepnutí na zahraniční ceník nepřepíná na 0 % … to by bylo optimální."

Pole pro zahraniční sazbu DPH přibylo dávkou N18 (v22.9.13), jenže
zveřejněný ceník ho nemá vyplněné a ceník se během testu nemění. Přepnutí
tedy sazbu nechalo tuzemskou. **Prázdná zahraniční sazba DPH teď znamená
0 %**, ne „jako v ČR" — dodávka s montáží do zahraničí se běžně fakturuje
bez české daně. Výslovně zadaná sazba v ceníku má přednost; kdo chce
i v zahraničí českou sazbu, zapíše ji. Návrat zakázky do tuzemska vrátí
tuzemskou sazbu a ruční volba obchodníka se nepřepisuje nikdy (#177).

**Výchozí nula se do ceníku neukládá**, takže nemění jeho otisk ani verzi.
Doplňuje se na třech místech, která musí mluvit stejně: přepnutí varianty,
dnešní ceník pro přepočet při otevření a složení zahraniční řady. Kdyby ji
znalo jen přepnutí, přepočet by prázdné zakázce při příštím otevření vrátil
tuzemskou sazbu.

Nabídka měla u sazby podmínku „do 15 % snížená, jinak základní" a tiskla by
**„DPH 0 % (snížená sazba)"**. Nulová sazba má teď vlastní jméno — nulová,
v angličtině *zero*, v němčině *Null*.

Přepnutí se dál odmítne nad zahraničním ceníkem, který nemá **žádnou
výslovnou** odchylku — samotná výchozí nula k přepnutí nestačí, jinak by se
zakázka tvářila jako zahraniční s tuzemskými cenami.

Zakázky přepnuté do zahraničí před touhle dávkou si svou sazbu nechávají.
Nulu dostanou přepnutím zpět do tuzemska a znovu do zahraničí, nebo výběrem
v hlavičce.

---

## v22.9.14 — 22. 9. 2026

### V zamčené zakázce se uložení nenabízí, odemyká se na jednom místě (N25)

Tohle očekávání se během dvou dnů změnilo dvakrát, a proto stojí za to mít
celý vývoj pohromadě.

Do 21. 9. bylo tlačítko „Uložit zakázku" v zakázce jen ke čtení **mrtvé**:
vypadalo jako tlačítko a kliknutí neudělalo nic. Jediná zmínka o tom, proč,
skončila v kartě Databáze, kam se v tu chvíli nikdo nedívá — uživatel
odcházel s dojmem, že je práce uložená (nález N4).

21. 9. se tedy oživilo a přejmenovalo na „🔒 Odemknout a uložit". Jenže ani
to akci nedokončilo: zůstala hláška o režimu čtení, nic se neuložilo
a otevřel se panel Zakázky online. Uživatel měl před sebou tlačítko, které
slibovalo dvě věci a neudělalo ani jednu (N25).

Rozhodnutí J. V. 22. 9.: **tlačítko u otevřené zakázky nenabízet.** V režimu
čtení se proto nekreslí vůbec a lišta začíná „Načíst zakázku". Odemčení má
jedno místo — lištu zámku nad Kalkulací OCK, Kalkulací PROJ i oběma ceníky,
kde je i důvod, smí-li odemykat jen někdo jiný.

**Zábrana zápisu zůstala v kódu, ne v nedostupnosti prvku.** `zakUlozUI()` se
dál ptá `zamekCteniStop()`: vede sem i automatické ukládání a klávesnice.
Odznak „jen ke čtení" už neposílá na tlačítko, které neexistuje.

### Dialog o přepočtu mluví česky (K5)

Vycházelo z něj „přepočítala se na **nová verze**. **Změnilo se 3** ceny."
Číslo verze se skládalo v 1. pádě a dosazovalo do věty, která žádá 4. pád,
a sloveso bylo napsané jednou pro všechny tvary počtu.

Věta je teď samostatná funkce, takže se dá změřit testem bez otevírání
dialogu a bez vyrábění zakázky s přesným počtem změněných cen. **Nula patří
do tvaru „0 cen"**, ne mezi 2–4; dosavadní podmínka `zmen < 5` to nehlídala.

### N28 — odpověď, ne oprava

Dvě zakázky v ostré databázi nesou uvnitř uloženého ceníku značku zahraniční
řady, ačkoli jejich varianta je česká. **Na výpočet to nemá vliv** (o řadě
rozhoduje `cenikRada`, značka v ceníku je až druhá v pořadí) a klon počítá
správně. **Na zveřejnění ceníku taky ne**, a to dvakrát pojištěně: podklad se
od značek čistí před odesláním a nad tím stojí pojistka, která zveřejnění
zastaví, kdyby se zahraniční ceník vydával za tuzemský.

Rozhodnutí J. V.: **migrace ostré databáze se nedělá** — riziko převyšuje
užitek. U odemčené zakázky značka zmizí sama při nejbližším uložení; u
odeslané je uložený ceník doklad o tom, co odešlo zákazníkovi. Zapsáno do
roadmapy jako #316, v kódu se nemění nic.

---

## v22.9.13 — 22. 9. 2026

### Zahraniční řada ceníku umí i sazbu DPH (N18)

Po přepnutí zakázky na zahraniční ceník naskočila zahraniční globální
přirážka a ceny se přepsaly, ale **sazba DPH zůstala tuzemská**. Zahraniční
nabídka se tiskla v eurech s českou sazbou.

Nebylo to chybějící pravidlo, ale **chybějící pole**. Sazba DPH je sledovaná
ceníková cesta úplně stejně jako globální přirážka, takže mechanismus pro ni
existoval. Administrátor ji ale neměl kam zadat: sloupec „Cena Zahraničí" se
kreslí jen u řádků tabulky a sazba DPH v tabulce není, je to hodnota
hlavičky. Dialog přepnutí přitom sliboval správně, že se sazba přepne, má-li
pro ni ceník odchylku.

Pole je teď v obou cenících, u přirážky. **Nula je platná hodnota**,
přenesená daňová povinnost, a od prázdného pole se liší: prázdné znamená
„jako v ČR". Ověřeno testem, ne čtením kódu, protože přesně tenhle rozdíl se
v pravdivostní podmínce ztratí.

Poznámka u ceníku PROJ tvrdila, že sazby DPH jsou celé společné s OCK.
Společné jsou **předvolby**; vybraná sazba nabídky zůstává projekci vlastní,
a proto má i vlastní zahraniční odchylku.

**Ceník se touhle dávkou nezveřejňuje.** Sazbu do ostrého ceníku zadá J. V.
sám, až bude oprava odsouhlasená.

---

## v22.9.12 — 22. 9. 2026

### Interiérová šachta neplatí lešení, které se u ní nestaví (K1, P8/7)

Rozhodnutí J. V.: „u interiérové šachty vnější lešení primárně nenabízet."

Dělení volitelných položek podle typu šachty v jádře existovalo od začátku,
háky a sokl jen venku, zábradlí jen uvnitř. **Vnější lešení do něj nikdo
nedopsal**, takže ho interiérová zakázka platila v základní ceně. Nově se
u ní nenabízí ani mezi volitelnými, ani mezi příplatky.

Dvě místa se musela srovnat spolu s tím. Nabídka vracela u chybějícího
příplatku vždycky „v základní ceně", což by u interiérové šachty tvrdilo, že
lešení v ceně je, ačkoli v kalkulaci není vůbec; teď rozlišuje **„je
v základní ceně"** od **„u téhle šachty neexistuje"** a v druhém případě
tiskne pomlčku. Technická specifikace u interiérové šachty říká, že lešení
zajistí objednatel, místo dosavadního odkazu na příplatkové ceny.

**Kapitola IV. si přestala odporovat se specifikací.** Žádala po objednateli
zajištění montážního lešení i tehdy, když specifikace u téže zakázky říkala,
že vnější lešení je součástí dodávky. Zákazník si mohl vybrat výklad, který
je pro něj levnější. Odrážka teď zmizí, právě když je lešení v dodávce, a to
ve všech třech jazycích kapitoly.

**Testy:** čtrnáct kontrol, které bez opravy padají. Interiérová zakázka
o položku zlevní a přepínač s ní nehne, exteriérová se nezmění, a to v obou
režimech výpočtu.

---

## v22.9.11 — 22. 9. 2026

### Světlík se počítá k té stěně, na které je nástupiště (#296)

Rozhodnutí J. V.: „zadní světlíky patří pochopitelně na zadní stěnu."

Počet světlíků byl správný, je jich tolik, kolik je nástupišť. Všechny se
ale sčítaly do položky **čelní stěny**, a zadní stěna si svůj pás odečítala,
aby se plocha nepočítala dvakrát. Dvě věci na tom byly špatně. U průchozí
šachty vycházela položka čelní stěny **větší než celá čelní stěna**, na ostré
zakázce 75,16 m² proti 37,9 m². A protože čelní a zadní stěna mají
u exteriérové šachty jiné sklo, počítaly se zadní světlíky **sazbou čelního
skla**.

Nově nese čelní položka jen nástupiště A a pás nad zadními dveřmi je
obyčejné sklo zadní stěny. Od zadní stěny se proto odečítají už jen dveře.

**Celková plocha skla se nemění**, přesouvá se jen podíl mezi stěnami.
Změřeno na zkušební průchozí šachtě 2 plus 2, obojí 71,97 m²:

| šachta | před | po |
|---|---|---|
| exteriérová | 978 000 Kč | 986 000 Kč |
| interiérová | 804 000 Kč | 804 000 Kč |

Exteriérová podražila proto, že zadní sklo je dražší než čelní, a zadní
světlíky se teď počítají tím, čím doopravdy jsou. Interiérová má obě stěny
ze stejného skla, takže se nehne vůbec. Neprůchozí šachty se změna netýká,
nemají nástupiště C.

Zamčené nabídky zůstávají, jak jsou, mají zmrazený výsledek. Rozpracovaná
průchozí exteriérová zakázka se po otevření přepočítá.

---

## v22.9.10 — 22. 9. 2026

### Roadmapa se dá vydat z repozitáře (#312)

Generátor roadmapy v repozitáři nebyl. Žil v pracovní kopii mimo GitHub,
což mělo dva důsledky. Kdo měl po ruce jen repozitář, stránku přegenerovat
neuměl, a roadmapa proto zůstala na **v17.9.2**, zatímco aplikace byla o pět
buildů dál. A prohlížečový harness, který stránku kontroluje, se **od svého
vzniku jen přeskakoval** — třináct kontrol, které nikdy neběžely.

Z vydané stránky ze 16. 9. je nově **šablona**: vyříznutá data nahradila
značka, kam je generátor vkládá. Vzhled a vykreslení se tedy mění v šabloně,
data v JSONu, a obojí je v repozitáři.

```
python3 roadmapa/roadmapa.py --kontrola   # jen pravidla, nic nezapíše
python3 roadmapa/roadmapa.py              # → ROADMAPA.html + ROADMAPA.md
```

**Výstupy se necommitují** (stejný důvod jako u `dist/`): rozcházely by se
se zdrojem a každá dávka by nafoukla diff o půl megabajtu. Sada
`./spust_testy.sh --smoke` i CI si stránku před prohlížečovými harnessy
vyrobí samy, takže `overit_roadmapu.mjs` běží. Prošel napoprvé, 13 kontrol.

Kontrola pravidel je ve skriptu i v Node sadě. Dvě místa schválně: sada
hlídá repozitář v CI, skript hlídá i toho, kdo generuje mimo něj.

---

## v22.9.9 — 22. 9. 2026

### Sazba ATYP se bere vždy z ceníku, drobnosti v poznámkách, roadmapa (#298)

**#298 je rozhodnuté a zavedené.** Hlášený rozdíl 5 versus 6 hodin nevznikal
jiným vzorcem, ale jiným zdrojem sazby: zaškrtnutí ATYP sáhlo při chybějící
sazbě po náhradě ze sestavení, kdežto přepočet na platný ceník hodiny nechal,
jak byly. Rozhodnutí J. V.: sazba se bere vždy z ceníku, ať se ATYP spustí
automaticky nebo ručně, a co si obchodník přepíše, je jeho věc.

Obě cesty teď čtou touž hodnotu týmž způsobem. **Když ceník sazbu má, a to je
normální stav, dávají obě totéž** a rozdíl nemá jak vzniknout. Ruční přepis
zůstává nedotčený a uzamčené ani kvitované varianty se do přepočtu vůbec
nedostanou, takže odeslanými nabídkami to nehne.

**Interní poznámky v Kalkulaci PROJ dostaly ovládání sekce** (zobrazit,
srolovat, skrýt) stejně jako v Kalkulaci OCK. Vysvětlivka pod polem se
zkrátila na to podstatné: karta se netiskne.

**Roadmapa doplněna ke stavu v22.9.9.** Chyběly v ní položky **#267**
(dodatkový text místo množství v nabídce, v18.9.1) a **#268** (opláštění po
stěnách ve třech krocích, v18.9.2 až v21.9.4) — čísla padla v commitech
z 18. a 21. 9., ale záznam v pořadníku k nim nikdo nezaložil. Doplněny
z commitů, ne z odhadu. Pořadník končil 17. 9.; přibyly dávky z 18., 21.
a 22. 9. a hlavička je na dnešku.

---

## v22.9.8 — 22. 9. 2026

### Dodatkové texty zůstávají v aplikaci, zápisník je jedno pole (#310, #311)

**Dodatkový text pod položkou teď platí pro celou firmu (#310).** Od #267
se text píše do ceníku, jenže ceník se **zveřejňuje** — vydat kvůli jedné
větě novou verzi ceníku znamená novou verzi pro všechny budoucí nabídky.
Nikdo to nedělal, takže text zůstal v zakázce toho, kdo ho napsal, a nikdo
jiný ho neviděl. Pole navíc viděl jedině administrátor.

Nově jsou dvě úrovně, přesně podle zadání:

- **Aplikace.** Co napíše administrátor, se uloží na server a od příštího
  přihlášení se předvyplňuje všem. Zveřejněný ceník má přednost: kdyby ho
  společná mapa přebíjela, správce by změnu ve vydané verzi nikdy
  neprosadil.
- **Zakázka.** Pole vidí a upraví každý, ale jeho změna platí jen pro jeho
  nabídku. Výchozí text tím nikdo nepřepíše nedopatřením.

Odeslané nabídky se tím nemění. Zakázka si nese vlastní kopii ceníku, takže
pozdější úprava textu nesahá na to, co už zákazník dostal.

Texty putují i do **zálohy a obnovy**. Nový klíč, který záloha nenese, by
obnova tiše smazala — přesně kvůli tomu vznikl nález B9.

**Interní poznámky jsou jedno textové pole (#311).** Z karty zmizely štítky
druhu poznámky, zápisník jednotlivých záznamů i nahrávání příloh. V provozu
se zápisník používal jako jeden odstavec pod druhým, takže druh, autor a čas
u každé věty byly režie navíc; přílohy se navíc nosily přímo v souboru
zakázky a nafukovaly ho na hranici odeslatelnosti e-mailem.

**Nic se nesmazalo.** Model umí dál všechno, co uměl. Starší zakázky se
svými záznamy se v poli ukážou jako předvyplněný text a přílohy, které v nich
už jsou, jdou pořád stáhnout — jen nové přibývat nemůžou. Čtení přitom
zakázku nemění: kdyby se pole materializovalo při vykreslení, zakázka by se
sama označila za neuloženou, což je táž past jako u dnešních nálezů N12/N13.

**Karta se přestěhovala nahoru** — v Kalkulaci OCK mezi souhrn zakázky
a Zadání šachty, v Kalkulaci PROJ mezi souhrn a Cenovou kalkulaci PROJ.
Dosud stála úplně dole pod Detailem mezivýpočtů, kam obchodník musel projet
celou kalkulaci. Je to **jeden zápisník zakázky**, ne dva: co se napíše
v OCK, je vidět i v PROJ.

**Testy:** sedm serverových k novým textům a pět k úplnosti zálohy,
jedenáct modelových k očistě a přednosti ceníku, deset k textovému poli
a pět ke stavu obrazovky. Prohlížečový harness ověřuje obě nové polohy karty
i to, že se text nedostane do žádného dokumentu. Dvě nové mutace, celkem 135.

---

## v22.9.7 — 22. 9. 2026

### Mutace se teď kontrolují za vteřinu, ne za sedmnáct minut (#309)

**Co se stalo.** Dávka 4 změnila dva řádky, na které mířily starší mutace.
Mutace se tím staly nespustitelnými — jejich hledaný úsek se v kódu už
nenašel. Sady i harnessy v CI byly zelené, mutační job červený, a to až
po sedmnácti minutách běhu.

Je to chyba v **zadání mutace**, ne v kódu. Obě mutace jsou srovnané a obě
znovu ověřené jednotlivě: chytají se.

**Oprava u kořene.** Mutační skript umí `--kontrola`: projde všechna zadání
a ověří, že každé najde svůj úsek právě jednou. Nespustí přitom ani jednu
testovou sadu, takže je hotov za vteřinu. Běží nově v CI jako krok **před**
plným během a taky v běžné sadě `./spust_testy.sh` — tedy dřív, než se
vůbec dá pushnout.

Celý mutační běh po opravě: **131 ze 131 chycených**, žádné chybné zadání.
Mezi nimi všechny čtyři dnešní: zmrazený výsledek (B53), ADMIN_EMAIL (B54),
odchylky ceníku (B55) i číslo odeslané nabídky (B56).

---

## v22.9.6 — 22. 9. 2026

### Dávka 5: drobnosti, na kterých ale stojí důvěra v běh (#307, #308)

**Repozitář dostal `package-lock.json` (B11).** Jediná závislost byla
zapsaná rozsahem, takže si každé sestavení na Netlify mohlo vzít jinou
verzi, aniž by se v repozitáři cokoli změnilo. Zámek se generoval v čistém
adresáři: na místě by do něj `npm` zapsal i symbolické odkazy na globální
playwright z tohohle prostředí a jinde by pak `npm ci` spadl.

**Pravidla pořadníku teď kontroluje Node sada (N18).** `roadmap.json` je
jediný zdroj pravdy o tom, co je hotové, ale jeho pravidla hlídal jedině
generátor, který v repozitáři není. Dnes se soubor rozbil dvakrát a pokaždé
se to našlo ručně. Nová sada ověřuje přesně to, co vypisuje README
v roadmapě — nic navíc, aby nebyla přísnější než dohoda.

První běh rovnou našel položku **#295** ve stavu „hotovo", která si držela
„čeká na J. V.". Odpověď z dnešního rána je teď zapsaná přímo u ní, čekání
je pryč.

**Popisky tří bloků v matici práv nesly čísla, která už patří jinému
auditu.** Testy z 23. 8. se jmenovaly stejně jako nálezy z 9. 9.
Přeznačeny na řadu L, jak je to od začátku v souboru mutací.

**Návod ke zdrojákům popisoval dva prohlížečové testy, ne třicet sedm.**
Sekce dopsaná podle skutečného stavu: co harnessy pokrývají, že se pouštějí
globem (a proč), které se bez firemních podkladů přeskočí a co k tomu
potřebují za prostředí.

**N14 se sem nevrací** — vyřešila ji už dávka 2: nebyla to chyba kódu, ale
zastaralé očekávání testu.

---

## v22.9.5 — 22. 9. 2026

### Dávka 4: tři serverové pojistky (#304, #305, #306)

Společné všem třem: pravidlo existovalo, ale server ho neuplatňoval — hlídal
ho prohlížeč, nastavení webu nebo obsah požadavku.

**Prázdná `ADMIN_EMAIL` tiše vypnula ochrany hlavního účtu (B54).** Všechny
jsou psané jako „e-mail se rovná hlavnímu"; proti prázdné hodnotě se
nerovná žádná skutečná adresa. Vedlejší správce tedy směl hlavnímu účtu
změnit roli, vypnout ho, smazat ho, resetovat heslo i přepsat podpis — a
nikde se nic neozvalo. Že to hlásí kontrola zdraví, je málo: hlášení si
někdo musí přečíst, kdežto oslabení platí hned. **Tahle větev v testech
nikdy neběžela**, protože CI i mutační běh proměnnou vždycky dosadí.

Nově se chráněné cesty neobsluhují (503 — chyba není u volajícího, ale
v nastavení webu): správa uživatelů a obnova ze zálohy. **Přihlášení
a změna vlastního hesla zůstávají funkční schválně** — bez nich by se
závada nedala opravit zevnitř.

**Pojistku zveřejnění ceníku šlo vypnout vynecháním pole (B55).** Shoda ČR
ceny se zahraniční odchylkou se porovnávala výhradně proti odchylkám
z téhož požadavku. Stačilo je neposlat a pojistka mlčky vypadla — přitom
takový podklad je nejpodezřelejší. Server přitom uložené odchylky zná
vždycky a prohlížeč proti nim porovnával odjakživa.

Porovnává se proti sloučení uložených a příchozích. Samotné sloučení by ale
**umělo ceník zamknout**: kdo ruší víc než pět odchylek naráz, by neprošel,
protože se pořád porovnává proti tomu, co ruší. Proto se nepočítá položka,
jejíž ČR cena se tímhle zveřejněním nemění — taková z přepnuté varianty
pocházet nemůže, v ceníku je už dnes.

**Číslo odeslané nabídky hlídal jen prohlížeč (B56).** Server u něj
kontroloval jen délku. U čísla je to zákeřné: číslo určuje jméno souboru,
takže se změněným číslem spadne zakázka pod jiné jméno, uložená verze
k porovnání neexistuje a **všechny kontroly zámku se přeskočí**. Odeslaná
nabídka tak mohla dostat jiné číslo, než jaké má zákazník na papíře.

Pozná se to ze zámku samotného — drží si číslo z okamžiku odeslání — takže
kontrola funguje i tam, kde není s čím porovnávat. Neshoda: administrátor
smí (rozhodnutí z 15. 9.), ostatním se to odmítne. Zámky pořízené dřív
razítko čísla nemají a přeskakují se.

**Mez, kterou to nezavře:** kdo si upraví klienta, přepíše číslo i razítko
najednou. Výsledek je ale nová zakázka pod novým jménem a původní soubor
zůstává nedotčený, takže se stopa neztrácí.

**Testy:** devět kontrol k B54, třináct k B55 (osm modelových, pět
serverových přes skutečnou cestu) a sedm k B56. U všech tří ověřeno, že bez
opravy padají. Tři nové mutace, celkem 133.

---

## v22.9.4 — 22. 9. 2026

### Dávka 3: čísla už odeslané nabídky šlo přepsat beze stopy (#303)

Jediný **vysoký** nález bezpečnostního auditu. Od 15. 9. si zámek varianty
ukládá **celý výsledek výpočtu** a všechny dokumenty i přehledy berou částky
odtud. Otisk zámku ho ale nezahrnoval.

Dvě varianty lišící se **pouze** ve zmrazeném výsledku měly tedy shodný
klíč, kontrola zámku vrátila „v pořádku" a serverová pojistka porovnávala
jen `data` — ta jsou shodná. Razítko „kdo" se u existujícího zámku záměrně
přeskakuje, takže se nezměnilo ani ono.

**Cesta zneužití:** obchodník si stáhne vlastní zakázku, v JSONu změní
jedině `varianty[i].zamek.vysledek.ock` a pošle ji zpět. Od té chvíle tisk
téže „neměnné" nabídky, krycí list i celý přehled ukazují jiné peníze, než
jaké dostal zákazník — **bez jediné stopy**, protože `tisky[]` ani
`odemceni[]` nepřibudou. Táž mezera byla v obnově ze zálohy.

Změřeno před opravou: cena v zámku **912 000 → 1**, klíč zámku **shodný**,
kontrola v pořádku, `data` shodná.

Do klíče zámku proto přibyl **celý zmrazený výsledek**. První verze opravy
tam dávala jen krátký otisk (FNV‑1a, 32 bitů), aby se nepracovalo s 25 kB
na variantu — jenže FNV není kryptografická funkce a její kód je v každé
vydané stránce, takže kdo chce částky přepsat, dopočítá si k nim výplň se
shodným otiskem. U kontroly, která má hlídat podvrh, je to málo. Přesné
porovnání skulinu nemá a je to totéž, čím se o řádek vedle porovnávají
`data` uzamčené varianty. Zaplatí se to jen při ukládání, ne při
vykreslování, a celá zakázka se u téhož uložení stejně serializuje.

**Obě cesty jsou pokryté naráz** — ukládání i obnova volají tutéž kontrolu,
takže stačilo opravit klíč. **Starší zakázky se nerozbily:** klíč se skládá
čerstvě pro obě strany porovnání, takže zámek bez zmrazeného výsledku dává
null proti null. Ověřeno vlastní kontrolou.

Pět serverových kontrol včetně pojistky proti prázdnému testu (podvrh se smí
lišit **výhradně** ve zmrazeném výsledku, jinak by ho zastavila jiná
kontrola a test by neměřil B53). Ověřeno, že bez opravy dvě z nich padají.
Plus mutace „zmrazený výsledek se bere, jak přijde".

---

## v22.9.3 — 22. 9. 2026

### Dávka 2: po F5 se ztrácela rozdělaná práce (#301, #302)

**N12 a N13 byla jedna chyba se dvěma projevy.** Po obnovení stránky se
vracel prázdný formulář, ačkoli zakázka ležela na serveru — a s ní se
„ztrácela" ruční přirážka 40 %, kterou obchodník viděl přepsanou na
firemních 0,42.

Návrat k poslední zakázce se ptal, jestli se zakázka liší od otisku
pořízeného **při startu stránky**. Jenže mezi startem a tím dotazem proběhne
přihlášení, a to do čerstvé zakázky samo nasype **platný ceník** a **matici
zobrazení**. Zakázka se tím od otisku liší vždycky — takže se návrat
neprovedl **nikdy**.

Změřeno po refreshi: rozdíl proti otisku byl `marze` 0 → 0,42,
`montazHodKc` 0 → 1234, zmizely značky `ukazkove`/`prazdny` a přibylo
`cenikRazitko`. Ani jedné z těch změn se uživatel nedotkl.

**Přirážka se přitom nikdy neztratila** — ověřeno dotazem na server, kde
ležela správně i se značkou „nastavil jsem si ji sám". Jen se k té zakázce
nikdo nevrátil.

**Táž příčina byla i o úroveň níž — a projevila se jako nestabilita.**
Otevření zakázky se na totéž ptá taky a otevře nad tím **dialog** „máte
neuložené změny". Obě automatické synchronizace přitom běží v jednom
`Promise.all`, takže záleželo na jejich pořadí: sada padala zhruba **jednou
ze tří**. To je nejhorší druh chyby — takovému testu lidé přestanou věřit.

Opraveno u kořene: ptáme se `ONLINE_STAV.zmenaUzivatele` místo otisku,
a otisk se srovnává až **po všech načteních**, takže na pořadí nezáleží.
Ověřeno pěti běhy po sobě. Ten
příznak je v souboru odjakživa a nastavují ho posluchače na `input`,
`change` a klik — tedy **události od člověka**, schválně ne `set()`, protože
„zakázkou hýbe i sama aplikace". Táž věta platí i pro návrat k zakázce.
Ochrana rozdělané práce zůstává: kdo do formuláře sáhl nebo si kliknutím
obnovil zálohu, má příznak nastavený.

**N14 nebyla chyba, ale zastaralé očekávání testu.** Kód se chová přesně
tak, jak to 21. 9. vědomě zavedla dávka P2: značka „ukázkový / prázdný
ceník" se smí srovnat i u uzamčené varianty, ale **jen když jí obsah
odporuje** — u opravdu prázdného ceníku zůstane. Test přepsán na skutečné
pravidlo a měří teď i to, co starou kontrolu znepokojovalo: že se ceny
uzamčené varianty nezmění a že se doklad o prázdném ceníku nepřepisuje.

---

## v22.9.2 — 22. 9. 2026

### Dávka 1: harnessy, které nikde neběžely (#299, #300)

**Dva harnessy od 14. 9. vůbec nenastartovaly.** `overit_sod.mjs`
a `overit_nabidka_proj_word.mjs` končily hned při načtení chybou
*Cannot access 'KOREN' before initialization* — `const KOREN` stálo až pod
prvním použitím. `import` se vytahuje nahoru sám, `const` ne. **Sedm kontrol
smluv o dílo a plné moci tím osm dní neběželo nikde**, ani lokálně, ani
v CI, protože v CI tyhle sady nebyly. Změřeno před opravou: oba skončily
kódem 1.

**Ani po opravě by se ale nespustily** — wordové šablony mají napevno cestu
z cizího prostředí. Vznikl proto `nastroje/harness_podklady.mjs`: podklady
mimo repozitář se hledají i v adresáři z proměnné `KNG_PODKLADY`, a když
nejsou, harness se přeskočí **s vysvětlením** a kódem 0.

Táž vada byla ve čtyřech dalších a dvě z nich by **shodily CI**:
`overit_manual.mjs` padal na ENOENT nad neexistující složkou,
`overit_sablony_online.mjs` četl šablonu bez kontroly, takže padal uprostřed
běhu po polovině kontrol. `overit_roadmapu.mjs` mířil na cizí `file://`
cestu. A `overit_sablona.mjs` hledal výhradně šablonu CN **v7, která už
neexistuje** — bere se nejdřív v8 a vypisuje se, která to byla; „prošlo" nad
starou šablonou totiž nejde odlišit od ověření.

**CI pouštělo 10 harnessů z 37 — nově všechny.** Právě ve zbylých dvaceti
sedmi vyšly nálezy N12, N13 a N14. Jádro opravy ale není *doplnit seznam*,
nýbrž **zrušit ho**: týž příběh se odehrál už 21. 9., kdy se dva ruční
seznamy srovnaly — a zůstaly ruční. Harnessy se proto berou **globem**, a to
v `spust_testy.sh --smoke` i ve workflow. Nový soubor je v sadě sám od sebe.

Job „harnessy" je pouští v jednom kroku se `::group::` na soubor, takže se
**pokračuje i po prvním selhání** a v logu je vidět všechno rozbité najednou.
Limit zvednut na 45 minut. Job „testy" si nechává jen kouřový test.

---

## v22.9.1 — 22. 9. 2026

### P11: rozdíl 5 vs 6 hodin u ATYP pojmenován a zajištěn testem (#298)

Vzorec je v obou cestách **týž**. Liší se **zdroj sazby**:

- **zaškrtnutí ATYP** (ruční i automatické) vezme sazbu z ceníku, a když ji
  ceník nemá, použije **náhradu ze sestavení**;
- **přepočet na platný ceník** při otevření zakázky vrátí u chybějící sazby
  `null` a hodiny **vůbec nepřepočítá**.

Jedna cesta tedy má záchrannou hodnotu a druhá ne. Změřená citlivost
zaokrouhlení (základ 24 h, hodiny navíc −3,25): sazba 0,30 → **6 h**,
sazba 0,25 → **5 h**. Hlášený rozdíl vznikne i při nezměněné geometrii.

**Nesjednotil jsem to** — dát přepočtu tutéž náhradu znamená začít
přepočítávat tam, kde se dosud nepřepočítávalo, a to hne cenou existujících
zakázek. Čeká na rozhodnutí. Rozdíl mezi cestami teď drží test, aby se
nezměnil nikým nepozorovaně.

`README_ZDROJAKY.md` přestal psát číslo verze natvrdo — stálo v něm
„v7.9.2", zatímco archiv byl o víc než sto dávek dál.

---

## v21.9.18 — 21. 9. 2026

### Rozhodnutí J. V.: plocha čelní stěny a překlad platebních podmínek (#295, #283)

**Čelní stěna se v režimu po stěnách počítá jako celá stěna mínus otvory
dveří a portálů.** Varianta (b) z #295. Vzorec není nový — přesně tak se už
počítá zadní stěna u průchozí šachty, takže obě strany s nástupišti se teď
počítají stejně. `sirkaDveri` už obsahuje rámy, takže „dveře a portály" jsou
v jednom čísle. **Standardní režim se tím nemění ani o haléř** — je to
samostatný základ, který platí jen v režimu po stěnách.

Tím padla dosavadní podmínka, že zapnutí režimu nesmí hnout cenou. **A hnula
oběma směry, což stojí za pozornost:**

- šachta **bez světlíků** → čelní stěna dosud vycházela na **0 m²**, teď má
  plochu, takže cena jde **nahoru** (to byl původní nález);
- **průchozí** šachta → cena jde **dolů**, změřeno −92 000 Kč u 16 z 32
  zkušebních zadání.

Ten druhý případ má vlastní příčinu: `svetlikM2` počítá světlíky ze **všech**
nástupišť včetně zadních, takže u průchozí šachty vyjde plocha světlíků
**větší než celá stěna** — změřeno 75,16 m² proti 37,9 m² skutečné stěny. Je
to táž vada předlohy, kvůli které umí ta plocha vyjít i záporně (nález N14).
Režim po stěnách ji nově nedědí; ve standardu zůstává. **Jestli se má opravit
i tam, je otázka — #296.**

**Do zahraničních nabídek se platební podmínky tisknou přeložené (#283).**
Kapitola III. brala hodnoty z krycího listu a ty šly slovníkem beze změny,
takže anglická nabídka měla nadpisy anglicky a hodnoty česky. Přeložila se
konečná sada předvyplněných hodnot — zálohy, dílčí i konečná faktura,
platnost nabídky, způsob fakturace, limit i sazby pokut. **Co obchodník
napíše ručně, projde beze změny**; vymýšlet překlad cizí věty se nesmí.

Zapsána dvě rozhodnutí bez zásahu do kódu: **terče a lišty** se zatím na typ
opláštění vázat nebudou (#287) a **sazba plechů pro interiérovou šachtu**
zůstává — je to aktualizace, ne zbytek po poškozeném ceníku (#297). Ověřeno
měřením, že **interiérová šachta se netmelí** — aplikace to tak už dělá.

---

## v21.9.17 — 21. 9. 2026

### Čelní stěna se v režimu po stěnách počítala za nulu (#294)

Nález J. V. ze snímku: stěna A vyšla na **3,36 m²**, zatímco B, C i D přes
38 m². Změřeno a potvrzeno — a příčina je horší, než vypadá.

Plocha se v režimu po stěnách bere z dosavadního výpočtu a pásy si ji dělí
poměrem výšek, aby zapnutí režimu nehnulo cenou. **U čelní stěny je ale tou
dosavadní plochou jen světlík nad dveřmi a po stranách** — zbytek zabírají
dveře a portály. Šachta bez světlíků má tedy plochu čelní stěny **nulovou**:
obchodník si vybere sklo přes celou stěnu, nákres mu ji vybarví celou,
specifikace ji zákazníkovi slíbí — a v ceně nebude ani koruna. Těch 3,36 m²
byla jen část pod úrovní nástupiště, tedy prohlubeň.

Změřeno: šachta bez světlíků, stěna A celá ze skla od −2 m do 23 m → **0 m²
nad nulou**, stěny B, C a D přes 40 m² každá.

**Obrazovka to teď řekne.** Varování pojmenuje, že se z té stěny do ceny
nedostane nic, a proč. Hlásí se až naposled — chybějící dělicí výška nebo
„jiné" bez sazby jsou konkrétní chyby, se kterými obchodník něco udělá hned,
kdežto tohle je vlastnost výpočtu, kterou sám nespraví.

**Čím plochu čelní stěny nahradit, je obchodní rozhodnutí** (kolik z ní
ukrojí dveře a portály), ne otázka pro kód — zapsáno jako **#295**. Dokud
nepadne, musí být aspoň vidět.

Při té příležitosti ověřeno měřením v prohlížeči, že **P12** (nová varianta
v režimu jen ke čtení nabídne odemčení místo mlčení) a **P15** (nová zakázka
shodí zámek čtení i vazbu na soubor) jsou hotové. P15 má nově test na řetěz,
na kterém stojí.

---

## v21.9.16 — 21. 9. 2026

### Opláštění: pořadí řádků, popisky — a místo, kde zadání přežije (#293)

**„Opláštění začíná" se přesunulo pod „+ přidat pás".** Je to spodní hrana
opláštění, takže nad pásy působilo, že se sloupec čte zdola nahoru a pak
zase shora dolů — a šel proti nákresu vedle sebe. Tlačítko zůstává hned pod
pásy, protože se týká jich.

**Popisky bez pomlčky, velkým písmenem:** `Pás 1` místo `— pás 1`. Totéž
u můstku (`Hloubka můstku`, `Šířka můstku`). Pomlčku dál nese jen
`— (jen exteriérová šachta)` u lemování — tam není popisek, ale hodnota ve
smyslu „neuplatní se".

**A hlavně: vzniklo `podklady/`.** Vizuál opláštění se dnes ztratil proto, že
byl popsaný jen v chatu — a chat se u dlouhého sezení shrnuje, takže zadání,
které žije jen tam, zanikne zákonitě. Co leží v repozitáři, se naopak čte
znovu na začátku každé práce. `podklady/OBRAZOVKA_OPLASTENI.md` je teď
závazný popis té obrazovky; `podklady/README.md` říká, kam co ukládat.

Dokument sám ale nestačí — **pojistkou je test.** `overit_oplasteni.mjs`
nově měří pořadí řádků i tvar popisků a je ověřeno, že při návratu ke staré
podobě spadne.

---

## v21.9.15 — 21. 9. 2026

### Pojistka, která se dá tiše vypnout, potřebuje vlastní test (#292)

Oprava z v21.9.13 — zveřejnění nesmí umazat ČR hodnotu, ze které dědí
zahraniční řada — sedí v `programZaznam` za `typeof` strážemi. **V prohlížeči
jsou ta jména globální vždycky, na serveru je skládá `jadro_moduly.cjs`:**
kdyby tam někdo změnil pořadí načítání nebo modul vynechal, stráž by prošla
a oprava by se **tiše vypnula**. Jádro by mělo dál zelené testy a chyba by
se vrátila jen serverovou cestou.

Ověřeno proti skutečné serverové funkci `/api/program`, že tou cestou
oprava opravdu platí (dosud to bylo jen doložené na jádře, ne na serveru),
a doplněna mutace — takže je ověřené i to, že by testy odstranění té
pojistky poznaly. Že test umí selhat, jsem změřil: s vypnutou opravou
padají dvě kontroly.

---

## v21.9.14 — 21. 9. 2026

### Hláška, která tvrdila nepravdu — a test, který ji nechytil (#291)

Dialog o přepočtu odmítne vrátit původní ceny, když se zakázka mezi
dotazem a odpovědí vymění. Odmítnout je správně, ale vysvětlení bylo
špatné: **stejná věta se ukazovala i uživateli, který si jen vzal krok
Zpět.** „Zpět" dosadí jiný objekt téže zakázky, takže se do téhle větve
dostane taky — a věta „Mezitím se otevřela jiná zakázka. Otevřete tu
původní znovu" mu tvrdí nepravdu a radí něco, co mu nepomůže. Dva různé
důvody teď mají dvě různé věty; odmítnutí platí v obou (vrácení snímku by
ten krok zpět tiše zahodilo).

**Kontrola v harnessu tu chybu nemohla odhalit, protože ji sama měla.** Za
„cizí zakázku" vydávala re-import **téže** zakázky — případ opravdu jiné
zakázky se tedy neměřil vůbec. Rozdělena na oba případy: jiné číslo → jiná
zakázka, stejné číslo → změnila se.

Nalezl závěrečný běh revize; zpřístupnila to dnešní oprava, která dialog
zavedla i k obnově zálohy z prohlížeče.

---

## v21.9.13 — 21. 9. 2026

### Třetí kolo revize — a regrese, kterou zavedla dnešní oprava (#290)

Revize dnešních oprav našla pět věcí. **Jednu z nich jsem zavedl dnes já,
a stála by obchodníka rozhodnutí podle čísla, které není pravda.**

**Dopad přepočtu na cenu počítal projekci i tam, kde se projekce nenabízí.**
Zakázka může být jen OCK, jen PROJ, nebo obojí. Ranní oprava přičítala
projekci vždy, takže každá zakázka „jen OCK" nesla fantomovou cenu projekce
z výchozího zadání. Horší než nafouknutá částka je ale druhý následek:
kdyby nová verze ceníku hnula **jen sazbou projektanta**, dialog by
u čistě ocelářské nabídky hlásil pohyb ceny, který se nestal — změřeno
**160 961 Kč při nezměněné nabízené ceně**. Obchodník by podle toho klikl
„Vrátit původní ceny" a vrátil si zastaralý ceník kvůli změně, která se ho
netýká. Počítá se teď jen strana, která jde do nabídky. Ve stejném místě:
když výpočet spadne, nezůstane v součtu půlka varianty (dřív vycházelo
`cena` z varianty hlášené jako chyba).

**Kopie zakázky dědila schválenou slevu i s razítkem schvalovatele.** Táž
úvaha jako u kvitance, ale s tvrdšími následky — změřeno na obou koncích:
obchodník duplikát **vůbec neuloží** (server vidí rozhodnutí jako nové a
odmítne ho, aniž by aplikace řekla proč), a vedoucí, který ho uloží, se
stane schvalovatelem slevy, kterou nikdy neviděl. Procenta a poznámka
zůstávají, zahazuje se jen rozhodnutí — nic se tiše neuplatní ani neztratí.

**Kopie dědila i číslo nabídky PROJ** (řada OVP). Je to identifikátor jiného
dokumentu a kontrola duplicit ho neodhalí — porovnává jen stranu OCK. Dvě
zakázky tak vystupovaly navenek pod týmž číslem.

**Zveřejnění ceníku umělo umazat cenu, která se dědí do zahraničí.**
Zahraniční řada je řídká tabulka odchylek: co v ní není, dědí se z ČR
sloupce. Varianta vedená v řadě ČR má ale takovou položku záměrně na nule —
a zveřejnění z ní tu nulu zapsalo do platného ceníku. Dokud odchylka
existuje, nepozná se nic; jakmile ji správce zruší v dobré víře, že se
hodnota zdědí, **zdědí se nula**. Opravit to v editoru nejde: ČR pole je
zašedlé „neplatí v ČR". Zveřejnění proto tu hodnotu přebírá z dosud platné
verze. Změna přes tabulku odchylek funguje dál.

**Obnova zálohy z prohlížeče se teď ptá stejně jako otevření ze složky.**
Dialog o přepočtu (#284) u ní chyběl — a přitom je to táž situace, spíš
horší: záloha mohla ležet od minulého ceníku.

Dva testy navíc byly prázdné a nic neměřily — kontrola „projekce se do
součtu započítá" procházela i bez projekce a „zahraniční řada cenu drží"
si hodnotu dosazovala ručně, takže skutečné zveřejnění jí neprocházelo.
Obojí přepsáno tak, aby měřilo.

---

## v21.9.12 — 21. 9. 2026

### Červené CI tří dávek za sebou — kontrola hledala slovo, ne protokol (#289)

Lokálně bylo zeleno, v CI červeno. **`./spust_testy.sh --smoke` pouštěl
jinou sadu prohlížečových harnessů než CI** — šest jich lokálně nikdy
neběželo. Tři dávky tak odešly s červeným CI, aniž by o tom kdokoli věděl.

Padalo `overit_lista.mjs`, kontrola „protokol se do dokumentů nedostane".
Ta procházela sestavená data výrazem `/protokol/i` — a **dnešní kapitola
V. TERMÍNY REALIZACE mluví v němčině o „Protokolle der Schachttüren"**,
tedy o předávacích protokolech šachetních dveří. Se záznamem o změnách to
nemá nic společného; kontrola padala na vlastním textu nabídky. Jediná
cesta, jak ji „spravit" beze změny kontroly, by byla přepsat větu, kterou
dostane zákazník.

**Žádná data neunikla** — ověřeno měřením: v dokumentech není klíč
`"protokol"`, není tam `protokolKlic` zakázky ani id jediného záznamu.

Kontrola teď hledá to, co ven opravdu nesmí: klíč struktury, klíč
protokolu, id záznamů a texty záznamů. Že umí selhat, je ověřeno — po
vložení id záznamu do textu kontrola zabere. Přibyla u ní pojistka proti
prázdnému měření (musí existovat aspoň jeden citlivý záznam). *Poctivá mez:
hodnoty kratší než čtyři znaky se nehledají — dvojciferná sazba se
v dokumentu plném čísel neodliší od běžného údaje.*

**A hlavně: `--smoke` teď pouští přesně to, co CI.** Seznam je v obou
souborech záměrně shodný a je to u něj napsané.

---

## v21.9.11 — 21. 9. 2026

### Druhé kolo nezávislé revize — sedm nálezů (#288)

Revize pokračovala i na dávkách v21.9.8–v21.9.10. Sedm nálezů: **dvě braly
peníze z ceny, jedna mohla přepsat cizí zakázku.**

**Položka „jen zahraniční" mizela z ceny OBOU řad.** Zahraniční ceník je
**řídká tabulka odchylek** — co v ní není, dědí se z českého sloupce.
Zveřejnění ale nulovalo český sloupec u každé takové položky bez ohledu na
to, jestli odchylka existuje. Změřeno: bez odchylky vyjde `cr → 0` a
zveřejněný ceník pak dá i `zahr → 0`. Nově se nuluje jen tam, kde
zahraniční cena opravdu je. *Očekávání v `test_jen_zahranicni.js` se proto
změnilo — dřív se nulování vyžadovalo vždy; to bylo špatně.*

**Dialog přepočtu mohl obnovit zálohu do jiné zakázky.** Volba „vrátit
zálohu" se držela v modulové proměnné, takže mezi otevřením dialogu a
kliknutím stačilo přepnout zakázku a záloha se zapsala jinam. Identita
zakázky i zálohy se teď zachytí **před** čekáním na odpověď a při neshodě
se obnova odmítne s hláškou. `importZakazka` je navíc v try/catch — dřív
by selhání zůstalo tiché.

**Dialog tvrdil „na celkovou cenu to nemělo vliv" i tam, kde měl.** Součet
dopadu počítal jen OCK, přestože přepočet mění i ceník projekce. U zakázky,
kde se hnula jen PROJ, dostal obchodník falešné ujištění — a to je horší
než mlčení.

**Kopie zakázky si brala protokol a kvitanci ceníku originálu.** Vypadala
tak, že u ní někdo odsouhlasil ceník a že má za sebou historii, kterou
nemá. Duplikace teď protokol i kvitanci zahazuje.

**Jazykové symboly kapitol nesly do Wordu značku `{FIRMA}`.** Formulář
v Nastavení nabízí `{{FIRMA_NAB_DOLOZKY_DE}}`, ale vydával se syrový text
pole — v dokumentu pak stálo „…von {FIRMA} weitergegeben…". Jazykové
symboly se nově prohánějí přes stejné zpracování jako české.

**Německá doložka vynechávala „die Eigentums-".** Z věty zmizelo vyhrazení
**vlastnického** práva a zůstalo jen autorské. Srovnáno se zdrojovým
dokumentem.

**Přehled rozdílů mezi řadami hlásil rozdíly, které nejsou.** Do porovnání
šel celý objekt databáze místo platného ceníku. Změřeno 1 → 0.

Testy: `test_jen_zahranicni.js` (20), `test_cenik_dopad.js` (17),
`test_zakazka_duplikace.js` (29), `test_nabidka_kapitoly.js` (99),
`overit_prepocet_dialog.mjs` (27). Celkem 120 sad zeleně.

---

## v21.9.10 — 21. 9. 2026

### Opravy z nezávislé revize dnešních změn (#286)

Revizi dnešních úprav dělal jiný model (Fable 5.1) se zadáním „hledej
skutečné chyby, ne stylistiku". Našel šest věcí, které stojí za opravu —
**a jednu z nich jsem zavedl dnes já**.

**Zaškrtnutí „po celé výšce" zpět smazalo ruční název i sazbu u typu
„jiné".** Dopolední oprava zaškrtávátka zakládala nový pás holý
(`{ typ, doM }`), a protože se při slučování bere **první** pás, dvě
kliknutí stěnu tiše zlevnila na nulu — v kalkulaci zůstal řádek „JINÉ" za
0 Kč. Nově se kopíruje celý pás; totéž u tlačítka „+ přidat pás".

**Technická specifikace tiskla větu o rozsahu opláštění česky i v EN/DE/FR.**
`techspec_ui.js` volal `tsHodnota` **bez jazyka**, takže se nová cesta
z dnešní dávky uplatnila jen v nabídce, ne ve specifikaci. Ta věta se navíc
objevovala v exportu „chybějící překlady", přestože přeložená je.

**Text na kartě sliboval, co kód nedělá.** Stálo tam „Terče a lišty se
počítají jen z pásů se sklem" — změřeno: u čtyř stěn ze skla, z Cetrisu
i „bez" vyjde řádek TERČE/LIŠTY **stejně**. Slib v obrazovce, který kód
neplní, je horší než mlčení. Text opraven; jestli se terče a lišty **mají**
vázat na sklo, je otázka na J. V. (#287).

**Dvě stěny „jiné" se stejným názvem a různou sazbou se slily do jedné
sazby.** Klíč byl jen název, sazba se brala z prvního pásu — druhá stěna se
spočítala za cenu té první, tiše a bez stopy. Klíč nově nese i sazbu.
**Tohle některým zakázkám cenu zvedne — na správnou.**

**Chyběla varování u zadání, které výpočet mlčky spolkne:** dolní mez nad
horní hranou stěny (stěna z ceny zmizí celá), dolní mez pod dnem prohlubně
(počítá se plocha, která neexistuje), dělicí výška nad horní hranou (pásy
nad ní zmizí, ale specifikace je zákazníkovi dál slibuje) a typ „jiné" bez
sazby.

**Nákres si ořezával spodní pás.** Minimum 2 px na pás přeteklo pruh
s `overflow:hidden`. Výška pruhu se nově počítá ze **skutečných** výšek pásů
a kóty se umisťují podle nich, ne lineárním přepočtem z metrů.

Sada `overit_oplasteni.mjs` narostla na **46 kontrol**.

### Ověření

120 sad prošlo / 0 selhalo (1 přeskočena).

---

## v21.9.9 — 21. 9. 2026

### P5 — tichý přepočet na dnešní ceník má konečně dialog (#284)

*Nálezy N7 a N22*

Rozpracovaná zakázka se po otevření přepočítá na platný ceník — to je
správně, staré ceny v ní nejsou doklad, ale past. Dělo se to ale **potichu**:
do lišty se napsala věta, kterou je snadné přehlédnout, a hlavně neříkala to
podstatné. **„12 změněných položek" může znamenat stokorunu i sto tisíc.**

Nově se otevře dialog, který řekne:

- na kterou **verzi ceníku** se přepočítalo,
- **kolik cen** se změnilo,
- a hlavně **o kolik se hnula cena nabídky** — v korunách, před i po.

A nabídne **vrácení původních cen**. Bez toho je to jen hlášení hotové věci.
Vrací se ze zálohy pořízené *před* přepočtem; dopočítávat staré ceny zpětně
by znamenalo druhý výpočet, který by se s tím prvním mohl rozejít.

Nabídka vrátit je **jednorázová** — příště se zakázka zeptá znovu, protože
se tím nic trvalého nerozhodlo. Dialog proto sám ukáže na trvalé řešení:
potvrdit u varianty „ceny jsou dohodnuté".

**Escape a klik mimo znamenají „nic nedělej", tedy ponechat přepočet.**
Zavřít okno je útěk z dialogu, ne rozhodnutí — kdyby Escape vracel ceny,
ztratil by obchodník přepočet, o kterém se ještě nerozhodl.

Po vrácení se obnoví i otisky pro autosave. Bez toho by první klik kamkoli
uložil zakázku s cenami, které uživatel právě odmítl (týž mechanismus jako
nález V35).

Nové sady: `src/test_cenik_dopad.js` (13 kontrol na součet cen) a
`overit_prepocet_dialog.mjs` (21 kontrol v prohlížeči — text dialogu, obě
tlačítka, Escape i to, že se bez změn neotevře vůbec).

### Ověření

120 sad prošlo / 0 selhalo (1 přeskočena).

---

## v21.9.8 — 21. 9. 2026

### P7 — nabídka končila cenou, chyběly čtyři kapitoly (#282)

*Nálezy N15 a N16; mail D. Sikory: „nám tam schází úplně — platební
podmínky, požadavky na provedení realizace, termíny realizace, předání
díla."*

Wordová šablona ty kapitoly měla, aplikace ne — dokument z aplikace se tedy
s tím, co zákazník dostal, neshodoval. Nově se tisknou všechny čtyři
a k nim závěrečné doložky (oprava zjevných chyb, autorská práva).

**Dva zdroje, záměrně různé:**

- **III. PLATEBNÍ PODMÍNKY se skládá z údajů zakázky** — zálohy, splatnost,
  platnost nabídky a způsob fakturace už v krycím listu jsou. Druhý opis
  týchž vět by se dřív nebo později rozešel s tím, co obchodník nastavil.
- **IV., V., VI. a doložky jsou firemní standard** (Nastavení → Smlouvy
  / Šablony → *Kapitoly nabídky III.–VI.*). Jeden řádek = jedna odrážka.

**Každý jazyk má vlastní pole.** Smluvní podmínky se nepřekládají strojově —
totéž pravidlo jako u cen: co nikdo nenapsal, si aplikace nevymyslí. Výchozí
znění v češtině, angličtině a němčině je převzaté z nabídek dodaných J. V.
Nevyplněný jazyk se z nabídky **vypustí i s nadpisem**; francouzština se
podle rozhodnutí zatím neřeší a vytiskne češtinu **s viditelným
upozorněním** — tiché vytištění češtiny cizímu zákazníkovi je horší, protože
se to nikdo nedozví.

Název firmy v doložce o autorských právech zastupuje značka `{FIRMA}`:
firemní údaje jsou v repozitáři schválně ukázkové a skutečné bydlí mimo něj.

Nová sada `src/test_nabidka_kapitoly.js` (**72 kontrol**) hlídá i to, že
všechny tři jazyky mají u každé kapitoly **stejný počet odrážek** — jinak
by se někde při přepisu ztratil řádek a cizí zákazník by dostal kratší
podmínky než český.

**Při psaní testů se našla chyba v mé vlastní logice:** prázdné pole
a nedodaný jazyk byly jedním příznakem, takže prázdná *česká* kapitola
hlásila „překlad nebyl dodán". Jsou to dvě různé věci a teď je rozlišuje
`prazdne` / `jazykChybi`.

### Ověření

118 sad prošlo / 0 selhalo (1 přeskočena).

---

## v21.9.7 — 21. 9. 2026

### Nákres stěny u opláštění po stěnách (#281)

Zadání J. V. po prvním proklikání: *„kalkulace opláštění postrádá
vizualizaci, takhle je to nepřehledné."* Tabulka pásů řekne, co je zadané —
neřekne, jak stěna **vypadá**. Čtyři stěny po dvou pásech si člověk musí
v hlavě skládat a záporná dolní mez v prohlubni se z čísel nepozná vůbec.

U každé stěny proto stojí **schematický nákres**:

- svislý pruh rozdělený na pásy **v poměru skutečných výšek**,
- **barva podle typu** opláštění, název materiálu v pásu,
- **kóty** u horní hrany, každého rozhraní pásů i dolní meze,
- **čárkovaná čára úrovně nástupu (0 m)**, takže je vidět, co sahá do
  prohlubně; záporné kóty jsou hnědé,
- `bez — dodá stavba` je **šrafa, ne barva** — není to materiál,
- pod nákresem **plocha stěny**, nebo výslovné **„bez plochy k opláštění"**.

Pod kartou přibyla **legenda s plochami podle typu** a celkovou plochou —
tatáž čísla, která jdou do kalkulace.

**Nákres kreslí pásy, které spočítalo jádro** (`r.oplasteni.pasy`, nově se
vydávají z `vypocet()`), ne vlastní přepočet zadání. Jádro dělicí výšku
ořezává a plochu pod nulou bere jinak než nad ní; obrázek, který by si to
počítal po svém, by při první změně pravidel ukazoval něco jiného, než
z čeho vyšla cena.

**Proč je ta plocha pod nákresem důležitá:** čelní stěna nese dveřní
portály, takže její plocha k opláštění jsou jen světlíky nad dveřmi — a bez
nich vyjde **nula**. Barevné pásy by pak slibovaly materiál, za který se nic
nepočítá. S číslem je to na první pohled vidět.

Sada `overit_oplasteni.mjs` narostla na **36 kontrol**; ověřeno negativně —
bez nákresu jich 7 padá. Kontroly měří skutečné rozměry vykreslených prvků
(poměry výšek pruhů proti výškám pásů), ne přítomnost tříd.

Mimochodem: první pokus měl u výpočtu zálohu přes `vypocet()`, která by
obcházela zámek odeslané nabídky. **Chytil to `test_zamek_otisk.js`** dřív,
než se to stihlo dostat do commitu.

### Ověření

117 sad prošlo / 0 selhalo (1 přeskočena).

---

## v21.9.6 — 21. 9. 2026

### P9 — nabídka si u soklu prohlubně odporovala (#279, nález N17)

Oprava z 16. 9. znala u oplechování soklu jen dva stavy: v základní ceně →
sekce *Doplňkové konstrukce*, jinak → „není součástí nabídky". Jenže **od
16. 9. se sokl nabízí i mezi příplatky** a ty se do nabídky dávají všechny,
dokud je obchodník ve sloupci „Nabídka" nevyřadí.

Výchozí exteriérová nabídka proto zákazníkovi tvrdila **obojí naráz**:
kapitola II. mu sokl nabízela za cenu a tabulka specifikace u téhož řádku
psala „není součástí nabídky".

Třetí stav má nově vlastní větu — **„nabízeno jako příplatek"** (přeloženo do
EN/DE/FR). Řádek zůstává v sekci *Součástí dodávky není*, protože v základní
ceně opravdu není, ale místo popření odkazuje na příplatek. Rozhoduje týž
seznam, ze kterého se sází kapitola II., takže se obě místa nemůžou rozejít.

Dvě sady musely změnit očekávání, protože stará věta byla nepravdivá:
`test_nabidka.js` a `test_docx_preklad.js`. U druhé se navíc zkouška
zpevnila — místo hledání konkrétních anglických slov se ověřuje, že hodnota
prochází slovníkem.

### P6 — migrace stříšky: nález se nereprodukuje, ale chyběl test (#280)

N10 hlásí, že staré zakázky nesou obě položky stříšky naráz a počítají ji
dvakrát. **Na dnešním kódu se to nereprodukuje** — migrace z #240
(`zakazka.js`) dosadí starší zakázce přesně jeden kus a ve výpočtu stojí
řádek právě jednou. Ověřeno i to nejpodezřelejší: **idempotence**, tedy že
pětinásobné načtení zakázky (ze serveru, z historie kroků, ze souboru) nedá
pět stříšek.

Skutečná díra byla jinde: **migrace neměla jedinou kontrolu**. Je to přesně
ten druh kódu, který se rozbije nepozorovaně — běží jen nad starými daty,
která nikdo v testech nemá, a pozná se to až na ceně u zákazníka. Nová sada
`src/test_migrace_striska.js` (14 kontrol) správné chování přibíjí, včetně
toho, že ručně zadaná nula ani dvojka se migrací nepřepíše.

### Adresa testovacího webu v dokumentaci

Návod uváděl `engscalc-test.netlify.app`; skutečná adresa je
**`testengscalc.netlify.app`** — `test` jako předpona. Kvůli tomu se marně
hledalo `/api/zdravi`.

### Ověření

117 sad prošlo / 0 selhalo (1 přeskočena).

---

## v21.9.5 — 21. 9. 2026

### Opláštění po stěnách: dvě chyby z prvního proklikání (#276)

J. V. zapnul režim po stěnách na testovacím webu a narazil na obojí hned:

- **Zaškrtávátko „po celé výšce" nešlo odškrtnout**, takže stěnu nebylo jak
  rozdělit na pásy — celá funkce po stěnách byla nedostupná. „Po celé výšce"
  je **odvozený** stav (dolní mez 0, jediný pás až nahoru), ne příznak
  v datech. Odškrtnutí ale pásy jen přepsalo zase na jeden jediný, takže se
  ze stejných dat odvodilo znovu „po celé výšce" a zaškrtávátko se okamžitě
  vrátilo. Nově odškrtnutí stěnu **opravdu rozdělí**: přidá druhý pás stejně
  jako tlačítko „+ přidat pás". Dělicí výška zůstává prázdná a obrazovka
  rovnou řekne, že ji má obchodník vyplnit.
- **Vizuál se rozsypal.** `.inputs .card .body` je mřížka
  `repeat(auto-fill, minmax(300px,1fr))`, která sází do sloupců **každý
  `.row` zvlášť** — hlavičky čtyř stěn tedy stály vedle sebe v ~290px
  sloupcích, popisek „Stěna A — čelní stěna" se lámal do svislého proužku
  a „po celé výšce" se trhalo na dva kusy. Po rozdělení stěny na pásy by se
  navíc hlavička, dolní mez a pásy rozletěly do různých sloupců a vedle sebe
  by stály pásy různých stěn. Stěna je nově **jeden blok** ve vlastní mřížce
  (`.opl-steny` / `.opl-stena`), dva sloupce na širokém okně, jeden pod
  1100 px.

**Nová sada `overit_oplasteni.mjs` (23 kontrol) v prohlížeči.** Jádro obě
chyby vidět nemohlo — `src/test_oplasteni_zapnuti.js` hlídá, že zapnutí
režimu nehne cenou, a to platilo dál. Obojí bylo čistě v obrazovce. Sada je
zapojená do `spust_testy.sh --smoke` i do CI.

Ověřeno i **negativně**: nad neopraveným kódem sada padá (5 kontrol na
rozložení, 4 na zaškrtávátko), takže nehlídá naprázdno.

### Ověření

116 sad prošlo / 0 selhalo (1 přeskočena), včetně prohlížečových.

---

## v21.9.4 — 21. 9. 2026

### Opláštění po stěnách — obrazovka, specifikace a překlady (#268, 3. krok)

Výpočet, typy i kontrola standardu přišly dvěma dávkami 18. 9. 2026. Chyběla
**obrazovka** — režim se dal zapnout jedině ruční úpravou JSON, takže ho
obchodník neměl jak použít a kód ležel v aplikaci nečinně.

- **Přepínač „Opláštění"** v Zadání šachty (jednotné / po stěnách A–D).
  Karta se stěnami se kreslí **až po přepnutí**; ve standardním režimu
  obchodník o čtyřech stěnách vůbec neví.
- **Řádek stěny:** typ · „po celé výšce" · dolní mez · pásy. Zaškrtnuté „po
  celé výšce" schová rozsah i pásy — většina stěn je celá stejná.
- **Pásy** se přidávají a odebírají po jednom, bez umělého stropu. Ukládá se
  **dělicí výška**, ne dva nezávislé rozsahy, takže překryv ani mezera nejdou
  zapsat. Úsek, který se oplášťovat nemá, se zadá jako pás **„bez — dodá
  stavba"**; zůstane tak vidět, že se na to myslelo.
- **Záporná dolní mez** sahá do prohlubně. **„Jiné"** dovolí napsat název
  a náklad za m² rovnou do zadání.
- **Varování**, když dělicí výška chybí nebo neroste. Výpočet takový pás
  přeskočí — ale mlčky, a tiché přeskočení se pozná až u zákazníka.
- **Technická specifikace** nově popisuje rozsah opláštění po stěnách
  (řádek ROZSAH OPLÁŠTĚNÍ), a to **ve všech čtyřech jazycích**. Věta se
  skládá z proměnlivého počtu kusů, takže ji slovník nemůže trefit celou —
  `tsOplasteniRozsah` ji proto staví rovnou v cílovém jazyce a tisk přes ni
  nepouští `tr()` podruhé.
- Výchozí podobu stěn skládá **jádro** (`oplasteniStenyVychozi`), ne
  obrazovka. Jedině tak platí slib dávky #268, že **zapnutí režimu beze změny
  zadání nehne cenou** — doloženo na 32 zadáních napříč typem šachty,
  zasklením, průchozí šachtou, prohlubní i ATYP.

Nová sada: `src/test_oplasteni_zapnuti.js` (31 kontrol).

### Rozhodnutí J. V. k opláštění (21. 9. 2026)

Obě otázky, které u #268 zůstávaly otevřené, jsou zodpovězené — a obě
**potvrzují dnešní stav**, takže se nic nepřepočítává:

- Sazby **práce a tmelení** se počítají **po celé ploše** bez ohledu na typ
  opláštění.
- U **dělicí výšky**, která nepadne na rozteč příčníků, se počítá **skutečná
  plocha**, ne celá tabule.

Obojí si J. V. vyhradil k pozdější úpravě. Zapsáno do roadmapy (#275), aby se
o tom podruhé nespekulovalo.

### Testy k P1–P3: tři díry, které samy testy neukázaly

Kontrola po dokončení P1–P4 — otázka zněla, jestli oprava ceníku opravdu
nemůže znovu propadnout. Našly se **tři místa, kde se opravené chování
nehlídalo vůbec**, a jedno, kde se hlídalo jen naoko:

- **Serverová pojistka P1 neměla test.** Zákaz zveřejnit ceník z varianty
  přepnuté na Zahraničí byl v `netlify/functions/program.mjs`, ale žádná
  sada ho nevolala. Doplněno 8 kontrol na konec `netlify/test_funkce.mjs`
  (203 prošlo / 0 selhalo).
- **Zámek jen ke čtení neměl kontrolu v prohlížeči.** `overit_online.mjs`
  nově ověřuje, že tlačítka „nová varianta" a „kopie" v režimu čtení
  **nejsou mrtvá** a řeknou, co udělají — přesně ta chyba, která se u P3
  jednou už stala (135/0 → **140/0**).
- **Žádná z oprav P1–P3 neměla mutaci.** Doplněno 5 mutací do
  `netlify/mutace.mjs`.

**A pak mutace odhalila čtvrtou, nepříjemnější věc.** Ze 128 mutací zůstala
jediná nechycená: „klíče řady se zapíšou do platného ceníku". Test na to
existoval — jenže ověřoval čištění nad **čistým zkušebním ceníkem, který
`rada` ani `jenZahr` vůbec neobsahoval**. Čištění nemělo co odebrat, takže
kontrola prošla i s vypnutým čištěním. Test, který platí vždycky, je horší
než žádný: tvářil se, že hlídá přesně tu chybu z v27. Podklad teď klíče
skutečně nese (tak, jak je do něj přidá `cenikSlozRadu` u každé varianty)
a k tomu stojí kontrola, že je tam opravdu má. Mutace je po opravě chycená.

Navíc: `netlify/mutace.mjs` si doplní `ADMIN_EMAIL` sám, stejně jako to už
umí `spust_testy.sh`. Bez něj se ručně spuštěný běh zastavil hned na „sady
nejsou zelené ani bez mutace" a vypadalo to jako rozbitý kód.

### Ověření

115 sad prošlo / 0 selhalo (1 přeskočena), včetně prohlížečových. Harnessy:
`overit_lista` 268/0, `overit_atyp` 57/0, `overit_zobrazeni` 121/0,
`overit_ock_cela_cesta` 42/0, `overit_vypnuty_radek` 21/0,
`overit_online` 140/0, kouřový test 50/0.

Mutační testování serveru: **127 z 128 chycených**; jediná nechycená byla ta
popsaná výše. Po opravě testu je chycená i ona — ověřeno cíleným během
`node netlify/mutace.mjs "klíče řady"` (1 z 1).

---

## v21.9.3 — 21. 9. 2026

### P4 — Položky „jen pro zahraničí" už nezdražují české zakázky

*Nález N6*

- **Příčina byla v pořadí, ne ve filtru.** Základ **přirážky za ATYP** se
  počítal z celého pole `rezie`, a to o pár řádků **nad** filtrem, který
  skryté a vyřazené položky odstraňuje. Řádek PŘEKLADY CZ→DE se v tuzemské
  kalkulaci správně neukázal, ale jeho cena přesto vstupovala do přirážky —
  a přes ni ještě jednou do rezervy. Po otevření zakázky a přepočtu „na
  ceník, který platí dnes" cena vyskočila, aniž by přibyl jediný viditelný
  řádek.
- Základ přirážky nově bere `jenPocitane(rezie)`, tedy přesně ty řádky,
  které jdou do součtu. **Týká se to i ručně vyřazených položek**
  (`nepocitat`) — ty přirážku nafukovaly úplně stejně.
- **V tuzemské řadě taková položka nemá cenu.** Obě funkce, které skládají
  ceník pro danou řadu (`cenikSlozRadu`, `cenikDnesniProRadu`), ji nulují.
  Protože nulují obě, nemá přepočet při otevření zakázky co hlásit.
- Sjednoceny dva zdroje pravdy: značky `jenZahr` od administrátora a pevný
  seznam `CENIK_JEN_ZAHR`. Jádro je spojovalo, skládání řady znalo jen
  značky — a z té nerovnosti nález plynul.
- **V editoru ceníku je tuzemské pole u takové položky zašedlé** („neplatí
  v ČR"). Vadná hodnota ve verzi 27 se tam dala prostě napsat.

**Ceny některých zakázek se tím MĚNÍ — vždy dolů.** Týká se to tuzemských
zakázek se zaškrtnutým ATYP, které měly buď položku „jen zahraniční"
s vyplněnou ČR cenou, nebo ručně vyřazený řádek v režii. Uzamčené nabídky
se nepřepočítávají, ale jejich cena se v aplikaci zobrazuje z dat — u takové
nabídky proto bude nově nižší než na vytištěném PDF, které odešlo
zákazníkovi. Rozhodující je PDF; aplikace teď ukazuje, kolik ta nabídka měla
stát.

Nová sada: `src/test_jen_zahranicni.js` (17 kontrol).

### Ověření

112 sad prošlo / 0 selhalo (1 přeskočena), s `--smoke` 114. Harnessy:
`overit_lista` 268/0, `overit_atyp` 57/0, `overit_zobrazeni` 121/0,
`overit_ock_cela_cesta` 42/0, `overit_vypnuty_radek` 21/0,
`overit_online` 135/0.

---

## v21.9.2 — 21. 9. 2026

Opravy z **kola 6** testování (zakázky CN-0383 a CN-0377/377), priorita 1.
Vyhodnocení testů je ve sešitu na Drive; konkrétní sazby do repozitáře
nepatří.

### P1 — Ceník: zahraniční ceny se nedostanou do tuzemské řady

*Nálezy N1, N20, N6 (částečně)*

- **Zveřejnění ceníku z varianty přepnuté na řadu Zahraničí je zakázané.**
  Takhle vznikl vadný platný ceník verze 27, který měl u čtrnácti položek
  v ČR sloupci zahraniční hodnoty. Hlídá to aplikace i server — dialog jde
  obejít, server ne.
- **Druhá pojistka:** shoduje-li se ČR cena se zahraniční odchylkou u více
  než pěti položek, zveřejnění se zastaví a položky se vypíšou. Chytí
  i podklad, ze kterého někdo značku řady odstranil.
- **Klíče `rada` a `jenZahr`** se do zveřejněného ceníku nezapisují.
  U varianty je pokaždé znovu složí `cenikSlozRadu`.
- **Dialog zveřejnění** ukazuje řadu varianty a rozdíly **zvlášť pro ČR
  a zvlášť pro ZAHR**. Dřív to bylo jedno číslo, ve kterém tahle chyba
  nebyla vidět.
- **Historie verzí** nese počty změn proti předchozí verzi (ČR / ZAHR).
- **Falešné varování „do souboru někdo sáhl ručně" zmizelo.** Vzorec otisku
  se dvakrát změnil (#181, #267), takže varování svítilo u všech 27 verzí
  a přestalo něco znamenat. Každá verze si nově pamatuje verzi vzorce
  a porovnává se jen se shodnou; skutečný ruční zásah se pozná dál.
- Postup k vydání opravené verze 28: `POSTUP_CENIK_V28_2026-09-21.md`.
  **Ceník sami nezveřejňujeme.**

Nová sada: `src/test_cenik_zverejneni.js` (26 kontrol).

### P2 — Značky ukázkového a prázdného ceníku

*Nálezy N2, N3*

- **Příčina:** server při uložení zakázky doplňoval chybějící klíče ceníku
  z `DEFAULT_CENIK` ze sestavení, které je pro GitHub vynulované a nese
  `ukazkove: true` i `prazdny: true`. Vtisklo je to do každé varianty, i když
  je klient neposlal. U uzamčených variant, které se při otevření
  nepřepočítávají, tam zůstaly napořád — červená lišta „Ceník není nahraný"
  a **vypnutý tisk nabídky u ostrých zakázek 0383 a 377**.
- `cenikDoplnKlice` značky ze vzoru **nedoplňuje** (jedno místo pro klienta
  i server). Chybějící ceny doplňuje dál — nález V38 platí.
- Server **odstraňuje značky před zápisem**, a to i z kopie uložené zakázky,
  kterou drží jen pro porovnání. Jinak by kontrola „nesmí se změnit data
  uzamčené nabídky" odmítla legitimní uložení.
- Aplikace si značku **srovná podle skutečného obsahu i u uzamčené varianty**
  — bez přepočtu cen. Nenulové ceny dokazují, že ceník prázdný není.
  Záměrně jen odebírá, nikdy nepřidává.
- Hromadná náprava starších zakázek: `nastroje/migrace_znacky.mjs`
  (náhled → potvrzení → zápis, nic nemaže, zapisuje do protokolu zakázky).

Nová sada: `src/test_ukazkove_znacky.js` (24 kontrol) + serverové kontroly
v `netlify/test_funkce.mjs`.

### P3 — Zámek „jen ke čtení" nesmí tiše zahazovat práci

*Nálezy N4, N5*

- **„+ Nová varianta" a kopie ⧉** v zakázce otevřené jen ke čtení variantu
  vyrobily, ale neměl ji kdo uložit — po `Ctrl+F5` byla pryč. Obojí teď
  nabídne odemknutí.
- **Tlačítko uložení** v tomhle stavu nic nezapsalo a vysvětlení šlo jen do
  karty Databáze. Nově se jmenuje **„🔒 Odemknout a uložit"** a nabídne
  odemknutí.
- **Odmítnutí dialogu vrátí pole**, aby na obrazovce nezůstala hodnota,
  která v datech není.
- **Stav „jen ke čtení" má výrazný štítek v liště** nad kalkulací (jantarový;
  červená už znamená odeslanou nabídku — dvě různé věci nesmějí mít stejnou
  barvu).
- **Nová akce „Duplikovat jako novou zakázku"** v Přehledu. Kopíruje
  hlavičku, zadání a ceníky; **nekopíruje** zámky, doklady o odemčení,
  poznámky ani přílohy a nedědí identitu uložené předlohy. Dřív na to nebyla
  cesta a lidé si starou zakázku přepisovali.

Nová sada: `src/test_zakazka_duplikace.js` (23 kontrol).

### Opraveno při práci na dávce

- **Aplikace se vůbec nespouštěla.** Seznam `CENIK_NEDOPLNOVAT` v `engine.js`
  sahal na konstanty z `ukazkove.js`, který v sestaveném souboru stojí až za
  ním — odkaz padl do dočasné mrtvé zóny a výjimka ukončila vyhodnocení
  celého skriptu. `typeof` před tím nechrání: u proměnné v TDZ hází taky.
  Chytil to kouřový test v prohlížeči.

- **Tlačítko uložení bylo v režimu čtení mrtvé, ne jen špatně pojmenované.**
  Lišta „Zakázka a varianta" dává v režimu čtení všem tlačítkům
  `pointer-events:none` kromě těch se značkou `cteni-ok` — a tlačítko
  uložení ji nemělo. Přejmenování samo by nepomohlo, dialog by se neměl jak
  otevřít. Odhalil to `overit_online.mjs` v CI; jeho očekávání „tlačítko je
  nedostupné" se změnilo na „je klikatelné a říká, co se stane" — nedostupné
  tlačítko není vysvětlení. Zápis dál hlídá `zamekCteniStop()`.
- **`spust_testy.sh --smoke` nově pouští i `overit_online.mjs`** (pokyn
  J. V.): dvě chyby této dávky chytil až prohlížeč v CI. Skript si zároveň
  sám doplní smyšlený `ADMIN_EMAIL`, když v prostředí chybí — stejně jako
  CI; bez něj serverové sady padaly na „Nepřihlášen" a vypadalo to jako
  rozbitý kód.

### Ověření

111 testovacích sad prošlo, 0 selhalo (1 přeskočena — `test.js` potřebuje
skutečný ceník mimo repozitář); s `--smoke` 113. Kouřový test 50/0,
`overit_online` 135/0. Prohlížečové harnessy: `overit_lista` 268/0,
`overit_zobrazeni` 121/0, `overit_ock_cela_cesta` 42/0,
`overit_vypnuty_radek` 21/0.

---

## v21.9.1 — 21. 9. 2026

- Kouřový test si držel starý výchozí model výpočtu a shazoval CI sedm běhů
  po sobě. Při opravě vyšlo najevo, že testu podstrkované řetězce
  `'fix'`/`'compat'` nikdy nic nepřepnuly (`fixes` je boolean), takže se
  varovná větev štítku režimu za celou dobu ani jednou neproběhla.
