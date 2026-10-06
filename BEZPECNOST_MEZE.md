# Známé meze zabezpečení

Soupis věcí, které aplikace **vědomě nehlídá**, nebo hlídá jen jako práh proti
omylu. Nejsou to díry, které se čekají na opravu. Jsou to meze, se kterými se
počítá, a proto mají být napsané: pojistka, která se vydává za zábranu, je
horší než žádná.

Založeno 23. 9. 2026 z revize změn v22.9.9 (nálezy B65–B68). Každá položka
říká, co pojistka dělá, co nedělá a proč to tak zůstává.

---

## B65 — pojistka zveřejnění ceníku (B55) je práh, ne zábrana

**Co dělá:** při zveřejnění ceníku server porovná tuzemský sloupec se
zahraničními odchylkami. Když se víc než pět položek shoduje se zahraniční
cenou, zveřejnění odmítne (`netlify/functions/program.mjs`,
`src/cenik_rady.js`). Chrání tak před omylem, kterým vznikl ceník v27:
zveřejněním ze zahraniční varianty.

**Co nedělá:**
- porovnává přesnou rovnost, takže cena o korunu jiná shodou není,
- položky s nezměněnou tuzemskou cenou se nepočítají,
- příchozí odchylky přebíjejí uložené.

Administrátor, který chce zveřejnit cokoli, to dokáže.

**Proč to tak zůstává:** zveřejňovat ceník smí jen administrátor. Pojistka
je proti chybě ruky, ne proti němu. Na tom, jaký ceník platí, se stejně
musí domluvit lidé.

## B66 — změnu čísla odeslané nabídky zapisuje do protokolu jen aplikace

**Co dělá:** číslo uzamčené (odeslané) nabídky smí změnit jen
administrátor. Server to vynucuje (B56) a srovná razítko v zámku. Aplikace
změnu zapíše do protokolu zakázky.

**Co nedělá:** volání API mimo aplikaci změnu provede, ale do protokolu ji
nezapíše. Stopou zůstane jen `upravil` a čas uložení.

**Proč to tak zůstává:** jde jen o administrátora a původní soubor s
původním číslem zůstává v databázi (jiné číslo = jiné jméno souboru), takže
stopa se neztratí. Kdyby bylo potřeba to doložit, zapíše to server.

## B67 — verze vzorce otisku ceníku se čte ze záznamu samotného

**Co dělá:** zveřejněný ceník nese otisk. Při načtení se ověřuje, že ho
nikdo nezměnil.

**Co nedělá:** verzi vzorce otisku (`otiskVerze`) čte ze záznamu. Kdo ručně
upraví `_program.json` a verzi přepíše, místo „otisk nesedí“ uvidí
„netknutost doložit nejde“. Varování zůstane, jen mírnější.

**Proč to tak zůstává:** týká se jen **režimu složky**, který je od
18. 8. 2026 vypnutý (`ULO_SLOZKA_POVOLENA = false`). Online ceník drží
server a upravit se dá jen zveřejněním.

## B68 — texty kapitol IV.–VI. a doložek (opraveno 23. 9. 2026)

Revize upozornila, že se texty ukládají bez kontroly typu a délky. Vykreslení
bylo bezpečné (`esc()` v aplikaci, `xmlEscRadky` ve Wordu), ale záznam firmy
se čte při každém přihlášení, takže objekt místo textu nebo obří pole by
zpomalilo všechny. Od 23. 9. 2026 `firmaLzeZverejnit` (`src/firma.js`) pustí
k zapsání jen text, číslo nebo ano/ne. Délku omezuje na 2 000 znaků, u textů
kapitol na 20 000. Stejnou kontrolou jde klient i server (`/api/firma`).

---

## Třída „koncová cena bez schválení" (B96, B111, B112 — 29. 9. 2026; B113, B114, B117 — 6. 10. 2026)

Komplexní test 29. 9. 2026 našel tři cesty, jak obchodník snížil cenu
nabídky bez schválení slevy. Každá má vlastní serverovou kontrolu hned za
typy polí (`zakazkaServerKontrola`, uložení i obnova):

- **B111** — záporná částka, množství nebo hodiny (`uloZaporneProblemy`):
  nikdo, ani administrátor.
- **B96** — krok a směr obchodního zaokrouhlení jen z výčtu `ZAOKR_KROKY` ×
  `ZAOKR_SMERY` (`uloZaokrProblemy`). Sémantika `zaokrKrok` v jádře se
  nezměnila — změnila by cenu už odeslaných nabídek.
- **B112** — ceník varianty a skryté přepisy podle role (`uloCenikProblemy`):
  role bez práva v matici uložené na serveru (`tab.cenik`, `tab.cenikproj`,
  `pole.prirazka`; přepisy `sloupce.naklad`) smí mít v ceníku jen hodnoty
  z uložené verze téže varianty, ze zveřejněného ceníku (platná i dřívější
  verze) nebo z jiné uložené varianty; přepisy nezmění. Administrátor smí
  vždy.
- **B114** (6. 10. 2026, #374) — identita standardních položek PROJ
  (`typ`, `sazba`, `sazbaKc`, `fixKey`, `cena`, `hodiny`, `rezerva`) a cena
  trvalé položky s `kid` v zadání OCK i PROJ, tamtéž (`uloCenikProblemy`,
  pod právem `sloupce.naklad`): role bez práva je proti uložené verzi
  (u nové varianty proti výchozímu zadání, katalogu a jiné uložené
  variantě) nezmění; standardní položku nesmaže ani nepřeznačí na vlastní.
  Trvalou položku smí smazat (jen v této zakázce), u OCK změnit množství.
  Vlastní položka (`vlastni:true` bez `kid`) se nehlídá.
- **B113** (6. 10. 2026, #374) — celý ceník sestavení (samé nuly) projde
  jen u nové zakázky a u varianty, jejíž uložená verze ho sama nese;
  projekce za 0 Kč s co prodávat zastaví dokumenty PROJ i v kombinované
  nabídce (zábrana `cenaNula`).

**Co zůstává vědomě (roadmapa #38 „nic se neblokuje"):**
- **B117 — zaokrouhlení *z výčtu* směrem dolů podteče minimální marži**
  (zbytek #38, #374 bod 3; vědomě ponecháno 6. 10. 2026). Smí cenu snížit
  o méně než jeden krok — nejvýš 9 999,99 Kč u OCK (krok 10 000 Kč); u PROJ
  se zaokrouhluje každá činnost zvlášť, takže až 9 999,99 Kč × počet
  činností. Minimální marže (B71, `schvalovani.js`, `sleva.js`) se počítá
  z ceny PŘED zaokrouhlením, zaokrouhlí se až koncová cena
  (`zaokrouhleni.js`), takže sleva těsně na hranici marže + krok dolů
  skončí pod ní. Lišta marže to jen ohlásí. Proč zůstává: krok i směr jsou
  z výčtu (B96), mez je shora omezená a viditelná v nabídce; obranu do
  hloubky by dal bod 4 B96 (marže z koncové ceny, návrh
  `podklady/NAVRH_B96_MARZE_2026-10-06.md`).
- Server nepočítá marži z **koncové** ceny (po zaokrouhlení) — kontrola
  marže B71 (`schvalovaniServerMarze`) běží jen u platné slevy a počítá
  z ceny před zaokrouhlením. Návrh (bod 4 zadání B96, nerealizováno, čeká
  na rozhodnutí J. V.): kdykoli je koncová cena nižší než základ, ověřit
  marži z koncové ceny i bez slevy. Pokryl by B96 (náklad se nemění, cena
  klesne) a u B112 změnu přirážky, **nepokryl by** B111 ani změnu
  jednotkové ceny v ceníku (záporná položka nebo nižší sazba sníží náklad
  i cenu stejným poměrem, marže vyjde stejná) — proto každá cesta potřebuje
  vlastní kontrolu a bod 4 je jen obrana do hloubky.
- Varianta zamčená už v uložené verzi se neposuzuje (doklad, B53). Starší
  zneužití v databázi najde `nastroje/detekce_zneuziti.mjs` (jen čte).
- **B112 porovnává po položkách, ne celý ceník:** přepočet jen vybraných
  položek na novou verzi je běžná práce, takže ceník smí být směsí uložené
  verze, zveřejněných verzí a jiných variant. Role bez práva si tak může
  u jednotlivé položky vybrat nižší z hodnot, které kdy schválil
  administrátor — nikdy hodnotu, kterou nikdo nezveřejnil.
- **Ceník sestavení se bere jen celý** (zakázka založená bez načteného
  ceníku; v repozitáři samé nuly, nabídku zastaví zábrana `ukazkovyCenik`,
  a protože server značky ukázkových dat strhne, i `cenaNula`) a od B113
  jen u nové zakázky nebo varianty, jejíž uložená verze ho nese; u klíče,
  který zveřejněný ceník nemá, hodnota ze sestavení. Dokud se žádný ceník
  nezveřejnil, ceník se nehlídá (není s čím porovnat).
- **B114 — co se u položek PROJ nehlídá:** vyřazení položky (`vyrazeno`)
  mění rozsah, ne cenu (vyřazená činnost se v nabídce neuvádí) — v UI je
  to sloupec administrátora, server ho nehlídá. Standardní položka se páruje
  podle sekce a `fixKey`, jinak typu a názvu; pořadí položek se nehlídá.
  Obchodník smí trvalou položku smazat a přidat vlastní položku s libovolnou
  cenou — to je vědomé (`kalk.pridatPolozku`) a ve výpočtu je vidět.
- **Sazba DPH** se nehlídá — vybírá ji v hlavičce každý a cenu bez DPH,
  kterou hlídá schvalování, nemění.
- **Hlídá se jen zápis. Čtecí strana B88 zůstává**: ceník a náklady jsou
  v DOM každé role (výpočet běží v prohlížeči), matice zobrazení je pro
  čtení věc pohodlí, ne bezpečnosti.
- **Zbývající v třídě (#374):** zaokrouhlení z výčtu (B117, výše — vědomá
  mez) a marže z koncové ceny (bod 4 B96 — jen návrh, čeká na J. V.).

---

## Obnova ze zálohy: soubor × otisk (B98, 29. 9. 2026)

**Soubor zálohy** jde upravit v editoru, proto se z něj neobnovují účty ani
podpisy (B27), razítko ověření nového zámku se počítá znovu a odemčení,
které v databázi není, zakázku přeskočí. **Otisk na serveru** klient
upravit nemůže — z něj se razítka zámku, ověření i odemčení přebírají, jak
jsou. Vědomě zůstává:
- kdo má přístup k úložišti Netlify Blobs (správce webu), může otisk
  změnit — obnova z otisku mu věří, stejně jako databáze sama;
- obnova ze souboru přeskočí i zakázku s odemčením v historii, když se
  obnovuje do prázdné databáze — taková zakázka se obnoví z otisku;
- zámek, který v databázi už je, se obnovou neposuzuje (doklad, B53).

---

## Zbytkové meze uzavřených nálezů

### B61 — zámek pod jiným jménem souboru

Od 23. 9. 2026 server odmítne **nový** zámek, jehož číslo nesedí na data
zakázky nebo nemá značku `cisloPapir`. Výsledek nového zámku navíc přepočítá
(B59). Zbývá jedna mez: kdo si upraví klienta, může změnit číslo zakázky
**i** číslo v zámku tak, aby spolu seděly. Vznikne tím nová zakázka pod
novým jménem souboru, ale původní soubor s původním číslem zůstane
nedotčený, takže se stopa neztratí. Server navíc na razítko ověření napíše,
jestli čísla výsledku sedí na data.

### B62 — razítka existujícího zámku

Od 23. 9. 2026 bere server `kdo`, `popis` a `sablona` u existujícího zámku
z uložené verze. U `tisky[]` a `odemceni[]` platí uložený začátek, přidávat
se smí. Nové záznamy do `tisky[]` ale dodává klient. Server hlídá, že se nic
nepřepíše ani neubere, ne kdo dotisk provedl.

### B119 — přísné ověření nového zámku platí jen pro tutéž verzi

Od 6. 10. 2026 se zmrazený výsledek NOVÉHO zámku porovnává přísně
(nespárovaný řádek je rozdíl, jádro nese i součty příplatků a volitelných),
ale jen když výsledek nese tutéž verzi aplikace jako server. Stránka
načtená před nasazením nové verze se porovná volně jako dřív (P6), aby
poctivá nabídka nedostala falešné „nesouhlasí". Verzi ve výsledku posílá
klient — upravený klient může uvést jinou a dostat volné porovnání. Razítko
pak nese `volne: true` a verzi, kterou klient uvedl, takže je to dohledatelné
(a volné porovnání dál hlídá všechny spárované řádky a jádro šesti částek).
