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

## Informativní nálezy B89–B95 (#347, 15. 10. 2026)

Hloubkový test 24. 9. 2026 (v24.9.2) vedl sedm informativních nálezů, audit
12. 10. 2026 je měl jako „trvá" (B89 „částečně"). Rozhodnutí po nálezech:

| Nález | Rozhodnutí | Doklad |
|---|---|---|
| B89 analytika: regex argumentů, texty o anonymitě | opraveno v15.10.2 | `src/test_analytika.js` (B89), mutace ×2 |
| B90 záloha rozpracované zakázky přežije odhlášení | **vědomá mez** (níže) | — |
| B91 `__proto__` v importu slovníku | opraveno v revizi #401 (v12.10.3, a95e1a3) | `src/test_slovnik.js` („#401", „rev #401 N2"), mutace „rev #401 N2" |
| B92 převod zakázek vrací souběžnou změnu účtu | opraveno v15.10.2 | `netlify/test_ucty_informativni.mjs`, mutace |
| B93 obnova hesla z otisku nechá verzi hesla | opraveno v15.10.2 (zbytek níže) | `netlify/test_ucty_informativni.mjs`, `test_obnova` B31, mutace |
| B94 scrypt s výchozími parametry, bez parametrů v otisku | **vědomá mez** (níže) | — |
| B95 jméno napodobí razítko „jméno <e-mail>" | opraveno v15.10.2 | `netlify/test_ucty_informativni.mjs`, mutace ×2 |

### B90 — záloha rozpracované zakázky v prohlížeči přežije odhlášení

**Cesta zneužití:** kdo se po odhlášení posadí k témuž prohlížeči (sdílený
počítač pod jedním účtem operačního systému), otevře aplikaci a ve žluté
liště „Pokračovat v rozpracované kalkulaci" dostane poslední rozpracovanou
zakázku — i s ceníkem zakázky, tedy s nákladovými sazbami (B88). Záloha
leží v `localStorage` (`kng_rozpracovano_v1`) nejdéle týden, pak se uklidí.

**Proč se neopravuje:** záloha je pojistka proti ztrátě NEULOŽENÉ práce (F5,
pád prohlížeče, výpadek sítě). Odhlášení se na neuloženou práci neptá
(`onlineOdhlas`), takže smazání zálohy při odhlášení by ji tiše zahodilo —
právě v situaci, kvůli které záloha existuje. Aplikace navíc běží i bez
přihlášení (místní režim) a záloha patří prohlížeči, ne účtu. Tentýž
prohlížeč drží i stažené nabídky a sešity ve složce Stažené soubory, takže
sdílený profil prohlížeče není hranice, kterou by šlo zálohou zabezpečit.
Předpoklad: každý obchodník pracuje pod vlastním účtem počítače.

**Možné zpřísnění (na pokyn J. V.):** při odhlášení se zeptat „Smazat
rozpracovanou zálohu z tohoto prohlížeče?" (výchozí ano, když zakázka nemá
neuložené změny), nebo zálohu šifrovat klíčem z relace — pak by ji ale po
vypršení relace nešlo obnovit ani majiteli.

### B93 — zbytek: obnova z otisku vrací staré heslo

Od 15. 10. 2026 obnova, která účtu mění otisk hesla, zvedne verzi hesla
(dosavadní relace skončí) a v upozornění vyjmenuje dotčené účty. **Zůstává
vědomě:** heslo z doby otisku po obnově zase platí — to je smysl obnovy
účtů. Kdo by tudy chtěl kolegovi vrátit staré heslo, které zná, potřebuje
vlastní heslo správce (B77, 13. 10. 2026) a otisk na serveru, který nejde
podvrhnout (B98).

### B94 — scrypt s výchozími parametry Node, parametry nejsou v otisku

**Cesta zneužití:** kdo získá úložiště účtů (Netlify Blobs — správce webu,
nebo serverový otisk zálohy), může hesla lámat offline. Otisk je
`sůl:hash`, scrypt N = 2^14, r = 8, p = 1 (16 MiB), délka 64 B — pod
doporučením OWASP (N = 2^17). Parametry v otisku nejsou, takže je nejde
zvednout bez rozbití dosavadních hesel.

**Proč se neopravuje teď:** k úložišti se bez správce Netlify nedostane nikdo
(stažená záloha otisky hesel nenese — B27); otisk je solený (16 B náhodné
soli), heslo má nejméně 8 znaků a přihlášení brzdu (B75). Zvýšení N stojí
čas a paměť KAŽDÉHO přihlášení, ověření hesla správce (B77) i zástupného
otisku (#93) a přechod potřebuje nový formát otisku a přepočet při
přihlášení — změna v cestě přihlášení s vlastními testy a mutacemi, větší
než to, co chrání, dokud úložiště neunikne.

**Postup, až se do toho půjde (na pokyn J. V.):** formát
`scrypt$N$r$p$sůl$hash`; `hesloSedi` čte oba tvary (starý = 2^14/8/1);
po úspěšném přihlášení se otisk ve starém tvaru přepočítá na nový;
kontrola tvaru otisku v obnově (`u.heslo.includes(':')`) a v zálohách se
rozšíří; `maxmem` pro scrypt nastavit podle N (N = 2^17 potřebuje 128 MiB).

---

## Třída „koncová cena bez schválení" (B96, B111, B112 — 29. 9. 2026; B113, B114, B117 — 6. 10. 2026; B133–B137, B145 — 12. 10. 2026)

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
- **#398** (12. 10. 2026, audit 22. kola — server přepočítal tatáž
  zmanipulovaná data a dal zámku razítko „shoda"):
  - **B134** — procenta a počty zadání OCK, které jádro násobí (rezervy
    `rezerva*Pct`, oplechování ostatní, engineering, stříšky, atypická
    zámečnická práce, počty světlíků a nástupišť, výšky pásů opláštění):
    nikdy záporné, **nikdo, ani administrátor** (`uloZaporneVZadani`,
    seznam `ULO_ZADANI_BEZ_ZAPORU`; úplnost proti `DEFAULT_ZADANI` drží
    `src/test_uloziste.js`). Pole % v UI mají `min="0"`.
  - **B135 / B145** — čísla ve vstupech jádra (ceník varianty OCK i PROJ,
    přepisy, vlastní položky, rezervy, hodiny N56, vlastní % sekce PROJ)
    jen ve tvaru, který `+x` čte jako člověk: číslo, prázdno, text
    s desetinnou **tečkou**. Text s čárkou („100,0") je pro jádro NaN → 0;
    nově 400 pro všechny. B112 porovnává hodnoty sémantikou jádra.
    Zadání mimo vstupy jádra (rozměry můstku) čárku dál snese.
  - **B133** — varianta, jejíž část je celý ceník sestavení (uložená verze
    i jiná varianta), nevstupuje do skupin B128 po položkách: smí zůstat
    celá sestavením (B113), nebo přejít na celou zveřejněnou verzi. Klon
    takové varianty smí ceník sestavení nést celý.
  - **B136** — „ceník má ceny" (#395 V3) počítá jen klíče vzoru
    (`DEFAULT_CENIK` / `DEFAULT_CENIK_PROJ`) dané části; volné klíče
    (`jenZahr`, `popisyJazyky`, `rada`) se nepočítají.
  - **Revize #398** — `cenik.jenZahr` jen podmnožina značek kandidátů
    (N1); `nepocitat` a Model 1 (`ock.fixes`) mění jen administrátor
    (`uloModelProblemy`, N2); sazba pásu opláštění „jiné" nikdy záporná
    (N3); dotisk dokumentu jiné strany k uloženému zámku se posoudí jako
    nový zámek (N4).
  - **B137** — rozměry šachty (pravidla `kontrolyRozmery` v `kontroly.js`,
    tatáž funkce jako zábrana „rozmery"): záporné číslo, číslo nečitelné
    pro jádro a zdvih nad 99 m server neuloží nikdy, **nikomu**; nulu
    a prázdno (nová zakázka začíná s nulovými rozměry, `ZADANI_NOVA`) uloží,
    ale **nový zámek** strany OCK (ne u zakázky jen projekce) z nich
    nevznikne — ani administrátorovi (zábranu v prohlížeči nepřekročí ani on).

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
  **#395 V3 (8. 10. 2026):** zábrana `ukazkovyCenik` po znovuotevření
  zakázky mlčí (server značky strhne, klient je podle obsahu nepřidává)
  a vlastní položka obejde `cenaNula` — proto server odmítne NOVÝ zámek
  role bez práva obou ceníků, když ceník varianty nemá ceny nebo cena
  nabídky vyjde ≤ 0 (část, jejíž platný zveřejněný ceník ceny má). Uložit
  takovou zakázku obchodník dál smí; vytištěná nabídka mu v prohlížeči
  vznikne, ale zámek (doklad odeslání) se neuloží.
- **B114 — co se u položek PROJ nehlídá:** vyřazení položky (`vyrazeno`)
  mění rozsah, ne cenu (vyřazená činnost se v nabídce neuvádí) — v UI je
  to sloupec administrátora, server ho nehlídá. Standardní položka se páruje
  podle sekce a `fixKey`, jinak typu a názvu; pořadí položek se nehlídá.
  Obchodník smí trvalou položku smazat a přidat vlastní položku s libovolnou
  cenou — to je vědomé (`kalk.pridatPolozku`) a ve výpočtu je vidět.
  Totéž platí pro vyřazení standardní položky a vlastní položku téhož
  názvu (#395 S2) — výsledek je stejný jako vyřazení + vlastní položka
  s jiným názvem, tedy vědomá mez, ne nová díra. Trvalá položka (kid) se
  od #395 hlídá v každém výskytu, i ve starším poli `volitelneVlastni`,
  a katalog PROJ se bere z uložených variant, ne z příchozího ceníku.
- **Sazba DPH** se nehlídá — vybírá ji v hlavičce každý a cenu bez DPH,
  kterou hlídá schvalování, nemění. (Od B135 jen musí být číslo, které jádro
  přečte — „0,21" neprojde.)
- **#398 — výjimky administrátora, které zůstávají:** globální přirážka
  ceníku (`marze`) a vlastní % sekce PROJ (`prirazkaPct`) smějí být
  i záporné — nastavuje je administrátor a role s právem (`pole.prirazka`,
  `sloupce.naklad`), ostatním je drží B112 proti uložené verzi. Ceník
  varianty smí administrátor měnit libovolně (jen ve tvaru čísla podle
  jádra). Rezervy, množství a rozměry šachty záporné nesmí nikdo.
- **#398 — věcné meze rozměrů a počtů nejsou** (revize, střední): server
  hlídá jen zápor, tvar čísla a zdvih nad 99 m. Zdvih 0,001 m, hloubka
  0,01 m, nástupiště 0 nebo 0,5, sloupky 2,5, čistý vstup širší než
  šachta — to vše jde zadat i v UI a cenu sníží (−4 až −40 %). Meze musí
  určit J. V. (otázka v předávce); do té doby je chrání jen to, že
  nabídku tiskne člověk, který rozměry vidí.
- **#398 — kladná ruční sazba pásu „jiné"** (1 Kč/m²) je vědomá funkce UI
  („ruční sazba znamená atyp") — obchodní otázka pro J. V.
- **#398 — výjimka B113 zůstává:** nová zakázka s celým ceníkem sestavení
  se uloží (test B113 e4), i když už je ceník zveřejněný. Zadání #398 ji
  navrhovalo zrušit; po opravě B133 (směs) a B136 (#395 V3) z ní ale
  nevznikne ani směs, ani zámek, a aplikace ji v legitimním toku stejně
  přepočítá (`progPouzij` → `cenikPrepoctiRozpracovane`). Otázka pro J. V.
  je v předávce.
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

### B119 — přísné ověření nového zámku

Od 6. 10. 2026 se zmrazený výsledek NOVÉHO zámku porovnává vždy přísně
(nespárovaný řádek je rozdíl, jádro nese i součty příplatků a volitelných).
Původní návrh porovnával volně, když výsledek uváděl jinou verzi aplikace —
nezávislá revize 6. 10. ukázala, že verzi posílá klient, takže to byl
obchvat; zrušeno. Zbývající mez: stránka načtená před nasazením verze, která
mění tvar výsledku (přidaný nebo ubraný řádek), dostane u poctivé nabídky
„nesouhlasí" — hláška po uložení radí obnovit stránku a vytisknout znovu.

### B149 — obnova ověřuje zámek ze zálohy volně (vědomá mez, 12. 10. 2026)

Při ukládání se nový zámek porovnává přísně (B119, B146). Obnova ze zálohy
zámek nezakládá — nese zámek, který vznikl dřív a možná jinou verzí
aplikace —, proto jeho zmrazený výsledek ověřuje volně (P6): jiný tvar
výsledku ani nespárovaný řádek rozdílem nejsou. Přísné ověření by
u poctivé starší nabídky hlásilo falešné „nesouhlasí". Zbývá mez: kdo si
upraví soubor zálohy, může do zámku vložit řádek navíc nebo pole jiného
tvaru a obnova ho zapíše s razítkem „shoda". Obnovu smí jen administrátor,
čísla (součty, ceny řádků, které se spárují) se porovnávají i volně, zámek
ze souboru, který neprošel, je ve výsledku obnovy vypsaný jako sporný
a otisk na serveru (B98) se nedá upravit vůbec. Výchozí návrh: ponechat;
přísné ověření i u obnovy jen na pokyn J. V.
