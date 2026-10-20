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

**Rozhodnutí J. V. 15. 10. 2026: nezpřísňovat** (žádný dotaz při odhlášení,
žádné mazání ani šifrování zálohy). Mez zůstává, jak je popsaná výš.

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

**Rozhodnutí J. V. 15. 10. 2026: varianta A — neměnit** („zbytečný extrém,
měnit to nebudeme, rozhodně ne teď"). Postup níž je jen pro případ, že by
se k tomu J. V. někdy vrátil.

**Postup (jen na nový pokyn J. V.):** formát
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

## S13 — položky „cena dle nabídky" jsou mimo schvalování (rozhodnutí J. V. 16. 10. 2026)

**Co dělá:** u položky, kterou PLATNÝ ceník označil příznakem „cena dle
nabídky" (`cenik.dleNabidky`; výchozí návrh: osm nabídkových položek za akci
— zábrany proti pádu, demontáž ohrazení, malba schodnic, dva nátěry,
prosklená stěna, demontáž výtahu, dešťový svod), smí obchodník zadat
**libovolnou nezápornou cenu** a nabídku odeslat bez schválení: neposuzuje se
jako směs ceníku (`src/vyjimky.js`), kontrola ceníku na serveru ji pustí
(`uloCenikProblemy` v `src/uloziste.js`) a schvalovatel ji nevidí ani
informativně. Příznak se bere **jen z platného záznamu programu** — mapa
v ceníku zakázky se neporovnává ani nečte, takže si ji klient nemůže přidat
(test „podstrčený příznak", mutace S13).

**Co nedělá:** nehlídá výši ceny u těchto položek. Obchodník tak může
položku s příznakem nacenit hluboko pod orientační cenu (i na nulu) a snížit
tím cenu nabídky o její orientační hodnotu bez schválení. Záporná nebo
nečíselná cena projít nemůže (403).

**Proč to tak zůstává:** rozhodnutí J. V. 16. 10. 2026 (varianta A, e-mail
obchodníka D. S. 15. 10.): u těchto položek ceník reálnou cenu nemá, cenu
určuje nabídka dodavatele. Které položky do skupiny patří, určuje správce
zaškrtnutím v Nastavení → Ceník a zveřejněním ceníku; ostatní příplatky se
hlídají beze změny.

## Audit kola 25 — B155, B156 a B157 (vědomé meze a záměrné chování, rozhodnutí J. V. 15. 10. 2026)

Audit 15. 10. 2026 (`podklady/AUDIT_2026-10-15_v15.10.6.md`) vedl dva
střední nálezy. J. V. 15. 10. 2026: „155 a 156 řešit nebudeme a uzavři."
Oba byly uzavřené jako vědomé meze; B155 J. V. 16. 10. 2026 znovu otevřel
a je opravený ve v16.10.1. Nízký nález B157 J. V. téhož dne
uzavřel jako záměrné chování („ano, smí … neměň"); vysoké nálezy téže oblasti (B153,
B154) jsou opravené ve v15.10.8.

### B155 — rozsah pásu „jiné" v obsahu schválené výjimky — OPRAVENO v16.10.1

**Rozhodnutí J. V. 16. 10. 2026:** rozsah se do výjimky přidává (B155 se
znovu otevřel; 15. 10. byl uzavřen jako vědomá mez).

**Původní mez (do v15.10.14):** obsah výjimky nesl u pásu „jiné" stěnu,
pořadí, název a sazbu, ne rozsah (`odM`/`doM`). Schválený úzký levný pás
(0–1 m) šel po schválení roztáhnout na celou stěnu a schválení platilo
(pokus kola 25 na v15.10.13: zámek 200, cena OCK −11 % proti schválenému
stavu; `podklady/AUDIT25_pokus_B155_rozsah.mjs`).

**Oprava:** `vyjimkyPasyJine` vrací u pásu i rozsah tak, jak je zadaný
(`odM` = začátek stěny u prvního pásu, jinak horní mez předchozího; `doM`,
`null` = až nahoru), obsah `p` = `[stěna, i, název, sazba, odM, doM]`;
karta výjimek rozsah ukazuje. Rozhodnutí s pásem „jiné" vydaná před
v16.10.1 přešla do „čeká znovu" (jako u B154). Částky v kartě a princip
čtyř očí zůstávají u B165.

## Audit 15. 10. 2026 — B168–B178 (zapsáno dávkou B168, 18. 10. 2026, v18.10.6)

Audit 25. kola nad v15.10.4 (Disk `Testovani/2026-10-15_kalkulator_BEZPECNOSTNI_AUDIT_v15.10.4.md`)
přidělil B168–B178; do repa se do 18. 10. nedostal (jen věta v
`podklady/AUDIT_2026-10-17_v16.10.5.md`). Úkoly jsou v roadmapě (#426 hotovo,
#427 čeká), tady meze a stav. Kola 26 (N2) a 27 (N3, od B183) číslují samostatně.

### B168 — změna matice zobrazení bez hesla správce — OPRAVENO v18.10.6

`POST /api/zobrazeni` chce od v18.10.6 pole `hesloSpravce` (`potvrdHesloSpravce`,
týž limit pokusů jako B77). **Zbývající mez:** klient drží ověřené heslo
v paměti stránky 10 minut po posledním úspěšném uložení matice (jinak by
autosave panelu chtěl heslo u každého zaškrtnutí). Kdo v tom okně dostane
odemčený počítač správce, matici změní bez hesla; cookie sama (bez stránky)
nestačí. Odhlášením nebo odmítnutím serverem se heslo zahodí. Test
`netlify/test_zobrazeni_heslo.mjs`, mutace „B168: …“.

### B176 — neznámé právo znamenalo „povoleno“ — OPRAVENO v18.10.6

`zobrazeniSmi` nejdřív pustí administrátora, pak neznámý klíč ostatním
odmítne (fail-closed). Že kód nečeká klíč mimo seznam, hlídá statická
kontrola v `src/test_zobrazeni.js` (přímá volání `smiZobrazit`/`zobrazeniSmi`/
`smi('…')`, záložky, panely nastavení, `PD_PRAVO`, `ZOBRAZENI_KLIC_NAKLADY`).
**Mez:** klíč složený za běhu (proměnná z jiného seznamu) kontrola nevidí —
takový by po překlepu skryl prvek, ale nic neotevřel.

### B169 — mez B137: server nehlídá nástupiště, sloupky a horní mez čistého vstupu (vědomá mez)

Serverová kontrola rozměrů (B137, `kontrolyRozmery`) hlídá zápor, nečitelné
číslo a zdvih nad 99 m. Počet nástupišť, sloupky ani horní mez čistého
vstupu server nehlídá — nerealistické hodnoty zachytí jen kontroly
v prohlížeči a schvalování ceny. Proč zůstává: vstup mění rozsah a cenu
konstrukce, ne práva; nesmysl je v nabídce vidět. Oprava B137 je proto
„s výhradou“.

### B170 — překlad ze slovníku může změnit číslo v podmínkách (vědomá mez)

Slovník (`src/slovnik.js`, `netlify/functions/slovnik.mjs`) nahrazuje text
i uvnitř podmínek a může tak přepsat číslo (lhůtu, procento) bez upozornění.
Zapisuje ho jen administrátor; mez je proti omylu, ne útoku. Případná
pojistka: upozornit, když se po překladu liší čísla v textu.

### B171 — odhlášení odhlásí všechna zařízení, UI to neříká (úkol #427) — OPRAVENO v18.10.13

Oprava B6 zvedá při odhlášení `hesloVerze` (`netlify/functions/odhlaseni.mjs`),
takže odhlášení ukončí relace na všech zařízeních. V kódu záměr, v UI věta
chyběla; cizí platná cookie tak může uživatele odhlašovat všude (obtěžování,
ne převzetí — to zůstává jako vědomá mez).
**Oprava (dávka H1, 18. 10. 2026):** obě tlačítka Odhlásit nesou nápovědu
`ODHLASIT_TITULEK` („Odhlásí vás na všech zařízeních…“) a panel online větu
„Odhlášení platí pro všechna zařízení…“ (`src/ui/online_ui.js`). UI je jen
česky — překlady EN/DE/FR jsou u dokumentů, ne u rozhraní. Příručka to
uváděla už od 13. 10. (kap. 1). Test `src/test_odhlaseni_text.js`, mutace
B171 (2).

### B172 — `w:delInstrText` v kontrole šablon (vědomá mez)

Kontrola obsahu šablon (`src/sablona_obsah.js`) nezná `w:delInstrText`
(instrukce pole ve smazané revizi). Word smazanou revizi nevykoná, takže
jen informace; šablony zveřejňuje administrátor.

### B173 — slovník vloží nový symbol `{{…}}` (vědomá mez)

Překlad ze slovníku může vložit symbol `{{…}}` tam, kde dřív nebyl,
a generátor ho rozvine (navazuje na B122). Jen administrátor; symboly
nesou firemní a zakázkové údaje, ne tajemství.

### B174 — `pd_cache` a `strop:` bez mazání, osobní údaje z CRM (úkol #427) — OPRAVENO v18.10.13

`pd_cache/deal:<id>` (jméno, e-mail, telefon kontaktů z Pipedrive,
`netlify/functions/pd_deal.mjs`) a `strop:<email>` se zapisují bez mazání
a zůstávají v Blobs napořád; v zálohách nejsou. Navrženo: úklid starých
záznamů (stáří, nebo při smazání účtu).
**OPRAVENO v18.10.13 (dávka H1):** noční otisk (`functions/zaloha_nocni.mjs`)
po záloze volá `netlify/lib/uklid.mjs` → `pdCacheUklid`: smaže `deal:`,
`dealy:` a `strop:` starší **30 dní** (výchozí volba dávky, `PD_CACHE_UKLID_DNU`)
a záznam, u kterého stáří nejde zjistit. Chyba úklidu zálohu neohrozí.
Zbývá (vědomě): záznamy mladší 30 dní, mazání `strop:` hned při smazání
účtu se nedělá (úklid ho smaže do 30 dní). Test `netlify/test_uklid.mjs`,
mutace B174 (4).

### B175 — analytika: server klíče prvků jen ořízne (úkol #427) — OPRAVENO v18.10.13

Oprava B89 čistí klíče prvků jen v prohlížeči (`src/analytika.js`);
server (`netlify/functions/analytika.mjs`) je jen ořízne na délku. Záznamy
se jmény v klíčích z doby před v15.10.2 zůstávají až 24 měsíců.
Navrženo: serverová očista týmž kódem a jednorázový úklid.
**OPRAVENO v18.10.13 (dávka H1):** `analytikaKlicOrez` (`src/analytika.js`,
běží i na serveru) nahradí vše od první „(“ za „(…)“ — týž výraz jako
`analytikaKlic` v prohlížeči; čistí kliky, zdržení i prvky po uživatelích
při každém slití (zápis dne i souhrn za období). Uložené dny jednou projde
noční očista (`analytikaOcista` v `netlify/lib/uklid.mjs`), přepíše jen dny,
které ji potřebují (`analytikaDenOcisti`), a zapíše značku `ocista-b175`.
Testy `src/test_analytika.js` (B175), `netlify/test_uklid.mjs`, mutace B175 (4).

### B177 — podobné znaky ‹ › ＜ ＞ ve jménu u razítka (vědomá mez)

`jmenoText` a `razitkoKdo` (`netlify/functions/uzivatele.mjs`,
`netlify/lib/sdilene.mjs`) odstraní jen ASCII `< >`. Podobné znaky projdou;
skutečný e-mail je ale v razítku vždy na konci, takže jméno nikoho
nezamaskuje. Jen informace.

### Kolize čísla B178 — nechycená mutace B31 (audit 15. 10.) — UZAVŘENO v15.10.14

Audit 15. 10. přidělil B178 nechycené mutaci „B31: hesloVerze se obnovou
sníží“ (test B31 po B93 zkoušel jen obnovu s jiným heslem). Opraveno
v15.10.14 (S10, `6d9ecdb`), mutace chycena. **Není to B178 auditu 17. 10.**
(výška šachty / meze pásu „jiné“, opraveno O6 v17.10.4, níž) — v repu
platí B178 = nález 17. 10.; nález 15. 10. se uvádí jako „B178 (15. 10.) / B31“.

## Audit kola 26 — B178 a B179 (opraveno v17.10.4, rozhodnutí J. V. 17. 10. 2026)

### B178 — výška a rozměry stěny u schváleného pásu „jiné" — OPRAVENO v17.10.4

**Původní mez (do v17.10.1):** obsah výjimky nesl rozsah pásu tak, jak je
zadaný (poslední pás `doM: null`), ne horní hranu stěny. Schválený úzký pás
nahoře šel po schválení roztáhnout zvýšením zdvihu (pokus kola 26: 9 → 40 m,
plocha 2,37 → 62,79 m², zámek 200; `podklady/AUDIT26_pokus_B178_vyska.mjs`).

**Oprava:** meze pásů počítá jediná funkce `oplasteniPasyMeze`
(`src/engine.js`) pro výpočet i výjimku — horní hrana `zdvih + přejezd`,
ořez mezilehlých pásů, pás nulové výšky vypadne. Obsah `p` =
`[stěna, i, název, sazba, odM, doM po ořezu, délka stěny ze zadání]`
(A, C = šířka, B, D = hloubka). Karta výjimek ukazuje rozsah a **plochu
pásu v m² z výpočtu jádra** (`vyjimkyPasyPlochy`, navazuje B165). Výjimky
s pásem „jiné" schválené před v17.10.4 přešly do „čeká znovu".

**Zbytek opraven v17.10.5 (B165, rozhodnutí J. V. 17. 10. 2026):** obsah
výjimky s pásem „jiné“ nese i **plochu každého pásu z výsledku jádra**
a klíč `l` se **světlíky „jiné“ u dveří** (`[kde, stěna, název, sazba,
m²]`) — `vyjimkyPlochyJadra`, server i prohlížeč počítají `vypocet` týmž
katalogem JEKLY (`ctx.jekly`). Plocha je v obsahu **na 0,1 m² nahoru**
(B183 volba b, J. V. 20. 10. 2026, v20.10.5; do v20.10.4 na celé m²):
2,50 → 2,5; 2,51 i 2,60 → 2,6; 2,61 → 2,7 — schvalovatel vidí a schvaluje
vždy horší variantu (plochu nejvýš o necelou desetinu větší). Nekrytý
nárůst bez nového schválení je **< 0,1 m² na pás či světlík** × rozdíl
sazeb a vždy jen do plochy, kterou schvalovatel viděl (vědomá mez).
Obsah s pásem nese značku tvaru `v: 2`. **Výjimky schválené před v20.10.5**
(obsah na celé m², bez značky) platí dál, dokud se jejich obsah starého
tvaru nezmění (`obsahStary`, `vyjimkaObsahSedi` v prohlížeči i na serveru) —
u nich zůstává mez < 1 m², kterou schvalovatel tehdy schválil; první změna,
která obsah starého tvaru změní, je vrátí do „čeká“ a nové schválení už je
v novém tvaru. Nový tvar se starým zaokrouhlením nikdy neporovnává (značka),
nové schválení razí server vždy z nového obsahu a záznam starého tvaru
nejde podvrhnout (rozhodnutí bez práva = 403). Chyba výpočtu nebo chybějící
katalog = plocha `null` → obsah se liší od schváleného → zámek 403
(fail-closed). Obsah jen se směsí ceníku má tvar jako dřív (schválení
platí dál); výjimky s pásem „jiné“ schválené před v17.10.5 čekají znovu.

**Původní poznámka (do v17.10.4, vyřešeno v17.10.5):**
- Obsah nese **délku stěny ze zadání**, ne vnější rozměr, se kterým počítá
  jádro (profily a způsob zasklení ho mění o centimetry). Změna profilu nebo
  zasklení po schválení plochu pásu posune o jednotky procent, obsah ne.
- **Světlíky u dveří** berou materiál podle převažujícího typu pásů stěn
  B–D. Pás „jiné", který převažuje, se tak promítne i do světlíků; jejich
  plocha závisí na dveřích (počet nástupišť, šířka vstupu), které obsah
  výjimky nenese. Schválení pásu tak kryje i světlíky v počtu a velikosti,
  jaké má šachta později. Řešení by bylo dát do obsahu plochu světlíků
  z výsledku jádra (server ho umí spočítat, `zamekVysledekSpocti`).
- **Rozhodnutí J. V. 17. 10. 2026:** obě výše uvedené části zůstávají vědomou
  mezí; dořeší se spolu s B165 (plocha z výsledku jádra do obsahu výjimky).

### B165 — schvalovatel nevidí částky výjimky; vlastní schválení — ČÁST 1 OPRAVENA v17.10.5, ČÁST 2 VĚDOMÁ MEZ (#425)

**Část 1 (J. V. 16. 10. 2026):** karta Cenové výjimky ukazuje tomu, kdo smí
rozhodnout (administrátor, `sleva.schvalovani`), u každé položky směsi
**použitou a ceníkovou hodnotu** (platný ceník), u pásu „jiné“ použitou
a nejnižší ceníkovou sazbu, plochu a světlíky, a **dopad na cenu strany**
(OCK cena bez DPH, PROJ celkem) v % a Kč — položka po položce i celkem
(`vyjimkyDopad`: cena varianty − cena s ceníkovou hodnotou). Obchodník bez
práva rozhodovat čísla nevidí (ceníkové sazby platného ceníku mu karta
neprozradí). Vše přes `esc()`. Na obsah ani na cenu dopad vliv nemá.

**Část 2 (vědomá mez, rozhodnutí J. V. 18. 10. 2026):** role s právem
`sleva.schvalovani` (i administrátor) schválí výjimku, o kterou sama
požádala nebo kterou má ve vlastní zakázce — server porovnává jen právo, ne
osobu žadatele (`vyjimkyServerKontrola`). Návrh (server 403, když
schvalovatel = žadatel nebo autor zakázky; administrátor vždy) poslán
koordinaci 17. 10. 2026. **J. V. 18. 10.: „zatím ponechat“ — systém se
testuje, do budoucna se změní (roadmapa #425).** Do té doby se chování
nemění.

### B179 — příznak „cena dle nabídky" mimo příplatky a z ceníku varianty — OPRAVENO v17.10.4

**Původní mez (do v17.10.1):** očista mapy `dleNabidky` pustila každou
známou číselnou cestu OCK (i `C.montazHodKc`) a zveřejnění bralo mapu
z ceníku otevřené varianty — i té, kterou uložil obchodník (pokus kola 26:
montáž za 1 Kč/h bez schválení, zámek 200;
`podklady/AUDIT26_pokus_B179_priznak.mjs`).

**Oprava (J. V. 17. 10. 2026: příznak jen u příplatků):**
`cenikDleNabidkySmi` pustí jen `C.priplatky.*` — v očistě (server
i prohlížeč) i v `cenikDleNabidkyJe`, takže příznak u montáže v platné verzi
zveřejněné před opravou nic nepovolí. Mapa pro zveřejnění =
`cenikDleNabidkyProZverejneni(platný ceník, změny správce v relaci)`;
ceník varianty se nečte (`progKontext`, sloupec Nastavení → Ceník).

**Co zůstává:** server mapu od správce přijme tak, jak ji pošle (očištěnou
na příplatky) — správce smí příznak u příplatku vědomě nastavit. Starý
klient (před v17.10.4) by dál posílal mapu z varianty; server z ní pustí
jen příplatky.

### B181 — znění hlášky výjimky podle razítka ceníku z požadavku (mez znění)

Znění „<položka>: cena pod ceníkem" vs. „směs platného ceníku a starších
cen" se volí podle `cenikRazitko.verze` z těla požadavku — upravený klient
si vybere znění. Obsah výjimky ani platnost schválení to nemění (karta dál
vypisuje názvy položek). Zapsáno jako mez (audit kola 26).

### B157 — volná pole krycího listu cizí odeslané nabídky (záměrné chování)

**Co dělá:** po odeslání nabídky zůstávají v krycím listu volná pole (mimo
pole, která jsou v nabídce). Server je při uložení přijme od kteréhokoli
přihlášeného uživatele — autora zakázky nehlídá (zakázky na serveru
vlastníka nemají; `netlify/lib/zakazka_kontrola.mjs`). Pole nabídky zůstávají
zamčená pro všechny (409).

**Co nedělá:** neomezuje volná pole na autora, vedoucího nebo administrátora.
Cizí obchodník tak změní i pole, která půjdou do budoucí SoD (pokuta za den,
termíny, podpisy). Prohlížeč cizímu obchodníkovi úpravu odeslané varianty
nenabízí (`zamekCteniSmiOdemknout`), dovoluje ji jen server.

**Proč to tak zůstává:** rozhodnutí J. V. 15. 10. 2026: „ano, smí (cizí
obchodník smí měnit volná pole krycího listu u odeslané nabídky), možná to
bude i třeba; pokud je to tak dnes nastavené, tak to neměň." Chování dokládá
`netlify/test_kryci_po_tisku.mjs` (B157: 200, pole nabídky 409).

### B156 — odhlášení a uložení profilu zapisují celý účet

**Co dělá:** odhlášení (`netlify/functions/odhlaseni.mjs`) a uložení profilu
nebo podpisu (`netlify/functions/uzivatele.mjs`, akce `profil`/`podpis`)
přečtou celý záznam účtu, změní své pole a zapíšou ho celý zpět.

**Co nedělá:** zásah správce mezi čtením a zápisem (vypnutí účtu, reset
hesla — `hesloVerze`, snížení role) se tím přepíše starým stavem. Cesta
zneužití: obchodník, kterému správce účet vypíná nebo snižuje roli, ukládá
profil nebo se ve smyčce přihlašuje a odhlašuje; trefí-li zápis do okna
mezi čtením a zápisem správce, zásah se ztratí (pokus s pozdrženým zápisem:
vypnutý účet zůstal zapnutý, reset hesla se ztratil, Vedoucí zůstal
Vedoucím; přes odhlášení 7 ze 7). Pravděpodobnost na ostrých Netlify Blobs
neměřena. Stejná třída jako B92 (opraveno jen u převodu zakázek).

**Proč to tak zůstává:** rozhodnutí J. V. 15. 10. 2026. Postup pro
správce: po vypnutí účtu, resetu hesla nebo změně role si v seznamu
uživatelů ověřit, že změna drží (obnovit stránku); u sporného účtu zásah
zopakovat.

## Audit kola 25 — B158, B159, B161, B162a, B164 (dávka A1, 16. 10. 2026, v16.10.4)

Zadání koordinace (#420): B158 a B159 opravit, B161, B162a a B164 zapsat
jako vědomé meze. Opravy mají zbytkové meze, které jsou tu taky.

### B158 — zbytek: strop Pipedrive mezi instancemi funkce

**Co dělá:** od v16.10.4 se čtení a zápis počítadla stropu čerstvých
načtení dealu (30 za hodinu) řadí ve výhradním úseku (`vyhradne` v
`netlify/lib/sdilene.mjs`). 200 souběžných požadavků v jedné instanci
funkce pustí do Pipedrive nejvýš 30 (`netlify/test_pd_pristup.mjs`).

**Co nedělá:** dvě různé instance funkce (Netlify je při náporu spustí
souběžně) se navzájem nevidí — každá řadí jen své požadavky. Netlify Blobs
nemá atomický inkrement; podmíněný zápis (etag) v cloudu ověřit nejde
(stejná mez jako B4). Dopad: strop může přetéct o násobek počtu instancí,
u každého účtu s právem `crm.pipedrive` (od v15.10.7 výchozí všem
obchodníkům a vedoucím), jen rozpočet volání, ne data, a jen do vyčerpání
denního rozpočtu Pipedrive (ten hlídá Pipedrive sám).

### B159 — zbytek: požadavek bez hlavičky Origin

**Co dělá:** od v16.10.4 `prihlaseny()` u zápisu (ne GET/HEAD) s hlavičkou
Origin odmítne `Origin: null` a tělo jiného typu než `application/json`
(401). Aplikace posílá vždy JSON (`onlineApi`), DELETE bez těla.

**Co nedělá:** bez hlavičky Origin se nic neodmítá (curl, testy, starší
klienti) — stejná zásada jako u B17. Prohlížeč Origin u POST/DELETE posílá
vždy, takže CSRF z prohlížeče tudy nevede.

### B161 — hlavička odeslané nabídky v dotisku (vědomá mez)

**Co dělá:** pole krycího listu s `bind` (název akce, adresa, objednatel)
zapisují do hlavičky zakázky, která je ze zámku varianty vyjmutá záměrně
(6. 10. 2026) — hlavička patří celé zakázce, ne jedné odeslané variantě.

**Co nedělá:** dotisk odeslané nabídky bere `NAZEV_AKCE`, `ADRESA`
a `OBJEDNATEL` z dnešní hlavičky, takže může nést jiný text, než jaký
zákazník dostal. **Cena se nemění** (částky drží zmrazený výsledek zámku).
Doklad o tom, co odešlo, je soubor nabídky odeslaný zákazníkovi a záznam
`tisky[]` (datum, číslo). Řešit by šlo otiskem hlavičky do zámku; dnes
se nedělá (sporné, viz audit 25).

### B162a — starší verze ceníku v online zakázkách (doplnění vědomé meze)

**Co dělá:** P12(d) ořezává historii ceníku v `/api/program` pro role bez
práva na náklady.

**Co nedělá:** online zakázka nese ceník varianty z doby uložení (zmrazená
kopie — bez ní by se stará nabídka přepočítala jinak). Obchodník tak přes
`GET /api/zakazky?soubor=` dostane i **starší verze** ceníku (nákladové
sazby a marži té doby). Patří to pod vědomou mez „ceníky v online
zakázkách zůstávají" — jen ji doplňuje o starší verze. `test_p12_naklady`
hlídá jen `/api/program`.

### B164 — zámek SoD stojí na záznamu tisku od klienta (vědomá mez)

**Co dělá:** zámek krycího listu po smlouvě o dílo vzniká záznamem typu
`sod`/`sodProj` v `tisky[]`, který posílá klient při tisku. Zapsaný tisk
už smazat nejde (409) a od té chvíle server pole SoD hlídá.

**Co nedělá:** upravený klient může SoD vytisknout bez záznamu a pole
dál měnit. Stejná třída jako tisk nabídky (důvěra v klienta při tisku,
viz B62): server nemá jak poznat, že se v prohlížeči tisklo. Od v16.10.4
po SoD zůstávají volné jen údaje zmocnitele plné moci (`pm*`, B163).

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

### B184–B186 — vědomé meze (kolo 27, 18. 10. 2026)

- **B184:** ruční množství a cena řádku pásu nejsou v obsahu cenové výjimky.
  Obchodník je uložit nesmí (403); role s `sloupce.naklad` přepíše jakoukoli
  cenu i bez výjimky — stejná důvěra jako dosud.
- **B185:** opis čísla SoD a data podpisu do ručních hodnot při prvním tisku
  SoD dělá jen prohlížeč; server ho nevyžaduje (třída B164 — zámek po tisku
  závisí na klientu).
- **B186:** číselné pole zadání uložené jako text (např. zdvih „9“) projde
  uložením, jádro z něj dá NaN a zámek server odmítne (fail-closed). Starší
  stav; kandidát na drobnou dávku hygieny (převod čísel při importu).
  **OPRAVENO v18.10.13 (dávka H1):** `importZakazka` (`src/zakazka.js`,
  běží v prohlížeči i na serveru) převede `zadaniCislaZTextu` číselná pole
  zadání OCK a PROJ (klíče číselné ve výchozím zadání, i ve formátu v1)
  z textu na číslo — jen text, který celý je číslo s desetinnou tečkou.
  Desetinná čárka („9,5“) se nepřevádí a server ji dál odmítá 400 (B134,
  B137); nečíselný text zůstává. Testy `src/test_cisla_textem.js`,
  `netlify/test_koncova_cena.mjs` (B186), mutace B186 (4).
- **B187:** `overit_xss.mjs` neprocházel kartu výjimky v pohledu
  schvalovatele (sazby, dopad, světlíky „jiné“ s payloadem v názvu pásu).
  **OPRAVENO v18.10.13 (dávka H1):** oblast „B187: karta výjimky
  schvalovatele“ — pásy „jiné“ stěn B–D s payloadem v názvu, nad dveřmi
  materiál stěn; administrátor musí doložit vykreslení sazeb, dopadu
  i světlíků s payloadem (383/0). Pojistka: po odebrání `esc()` z názvu
  světlíku v `vyjimkyKarta` harness hlásí spuštěný payload (379/4).

## Audit kola 28 — B188–B193 (dávka N4, 18. 10. 2026, v18.10.11 → v18.10.12)

Zpráva `podklady/AUDIT_2026-10-18_v18.10.11.md`, pokusy `podklady/AUDIT28_pokus_*.mjs`.

### B188 — matice zobrazení přes obnovu ze zálohy bez hesla — OPRAVENO v18.10.15

Doplňuje B168: `POST /api/obnova` s částí `zobrazeni` zapisovala matici jen
po očistě, heslo správce chtěla jen u části `uzivatele`. Od v18.10.15
(roadmapa #429) chce obnova mimo náhled `potvrdHesloSpravce`, kdykoli by
matici zapsala (`obnovaNeseMatici`: část vybraná a záloha ji nese jako
objekt) — **ze souboru, z otisku i v dávce rozpracované obnovy**. Ověří se
před zámkem a otiskem; chybějící či špatné heslo → 401, série → 429, nic se
nezapíše. Náhled heslo nechce. Jiné serverové cesty zápisu
`program/zobrazeni` nejsou (jen `/api/zobrazeni`, B168); import konfigurace
v prohlížeči jde na server týmž `/api/zobrazeni`. Hlídá `test_zobrazeni_heslo`
(oddíl B188), pokus `AUDIT28_pokus_obnova_matice.mjs` P3 (401) a mutace „B188: …“.
Mez: části `program` (ceník) a `firma` heslo nechtějí ani na své přímé cestě —
to je otázka rozsahu B168, ne obejití.

### B189 — výchozí režim DPH ve SoD realizace podle DIČ — VYŘEŠENO v19.10.1 (rozhodnutí J. V. 19. 10. 2026)

`kryciDphRezimVychozi`: DIČ CZ → přenesená daňová povinnost (tuzemsko, § 92e
ZDPH, jako šablona v2), bez DIČ → česká DPH, DIČ jiného státu EU i mimo EU →
**bez výchozí volby** (místo plnění u stavby určuje adresa nemovitosti, ne DIČ).
Bez zvoleného režimu smlouva o dílo realizace **nevznikne** (fail-closed):
`sodDphZabrana` v `src/sod.js` — `sodData` hází, takže zastaví serverovou
i místní šablonu (obě jdou přes registr dokumentů), a `dokumentZabrana('sod')`
zhasne tlačítko s toutéž větou a odkazem na volbu v krycím listu. Ruční volba
má přednost; uložená volba i zmrazené předvyplnění zamčené varianty se
nemění. Vlastní znění režimu se počítá jako volba (symboly zůstanou `{{…}}`).
Hlídá `src/test_sod_en.js` (2c, oddíl B189; proti 62bd0b6 40/7 → 47/0),
pokus `AUDIT28_pokus_sod.mjs` P1 (otočen), mutace „B189: …“ (8 v jádru, 1
v `netlify/mutace.mjs`). **Mez:** znění vět je předběžné do kontroly účetní
(`podklady/SOD_EN_KONTROLA.md`, body 1–6); smlouvy vytištěné před v19.10.1
bez uložené volby se při dotisku řídí novou výchozí volbou (CZ → přenesená).

### B190 — skladné s tečkou tisíců — OPRAVENO v18.10.12

`sodSkladneKc` přijme jen celé číslo nebo 1–2 desetinná místa (mezery,
„,-“ a „Kč“ pomine); „1.500“ nebo „1.000,50“ se nevyplní a `{{SOD_SKLADNE}}`
zůstane k doplnění. Test `src/test_sod_en.js` (2c), mutace „B190: …“.

### B191–B193 — kolo 28 (B191 a B192 upraveny v19.10.4, dávka H2)

- **B191 — OPRAVENO v19.10.4:** blok `CIN_*` z `blokyPryc` s nevyváženými
  značkami (ručně upravená šablona — začátek v tabulce a konec za ní, značka
  bez páru) dřív v dokumentu zůstal a značky zmizely — smlouva vyjmenovala
  nenabízenou činnost. Teď `odstranPrazdneBloky` hází a dokument nevznikne
  (fail-closed, hláška „Opravte šablonu“). Blok mimo seznam (kapitoly
  nabídky) se řídí obsahem jako dřív — nevyvážený zůstane i se značkami pryč.
  Kontrola při zveřejnění šablony nepřibyla (doporučení zůstává). Test
  `src/test_sod_proj_rozsah.js` (2), mutace „H2 B191: …“.
- **B192 — zmírněno v19.10.4, mez trvá:** k mezi B168 — heslo správce leží
  v paměti stránky v čitelné podobě (`ZOBRAZENI_HESLO.h`). Skript vložený do
  stránky (XSS; CSP dovoluje `unsafe-inline`, B5) by ho přečetl, případně
  podvrhl `dotazHeslo`; cookie je HttpOnly, heslo jde ale použít i mimo
  relaci (přihlášení). Do úložiště prohlížeče ani do logu se nedostane.
  Od v19.10.4 se okno 10 minut počítá **od zadání hesla** — uložení matice
  ho neprodlouží (dřív klouzavě, při průběžném ukládání neomezeně). Test
  `src/test_zobrazeni_heslo_okno.js`, mutace „H2 B192: …“. Úplné řešení
  (heslo vůbec nedržet, např. krátkodobý token od serveru) je změna
  rozhraní — doporučení pro J. V., ne oprava bez rozhodnutí.
- **B193:** harnessy PROJ v3 (`test_sablona_proj_v4`, `overit_nabidka_proj_word`)
  čekají šablonu PROJ v3 pod jménem `Sablona_NABIDKA_PROJ.docx`; na Disku je
  pod tím jménem starší verze (podklad, ne kód).

## Audit K3 — #151 N5/N6, B194 (dávka O5, 20. 10. 2026, v20.10.1)

Podklad `podklady/K3_AUDIT_19_10.md` (K3-N14: tyto meze tu chyběly).

### #151 N6 — kopie zálohy na Disk Google (vědomá mez, rozhodnutí J. V. 19. 10. 2026)

- **Kopie nenese otisky hesel ani podpisy.** Po ztrátě webu i serverových
  otisků se z kopie na Disku obnoví data, ale účty dostanou nová hesla
  (obnova ze souboru hesla nebere, B27) a skeny podpisů se nahrají znovu.
- **Části vybírá povolený seznam** `KOPIE_DISK_CASTI`
  (`netlify/lib/zalohovani.mjs`, K3-N12 v20.10.1). Nové úložiště na Disk
  samo neodejde — zapisuje se do seznamu vědomě (test `test_zalohy.mjs` N6).
- **Kopii zapisuje prohlížeč správce** do složky, kterou vybere; server
  o kopii ví jen ze záznamu `kopie-disk`, který prohlížeč pošle. Složka
  jiného jména než „_Zaloha Netlify DB“ se jen varuje.

### #151 N5 — retenci odemyká záznam od klienta (zmírněno v20.10.1, mez trvá)

- Retence nočních a ručních otisků smaže něco jen při záznamu kopie na Disk
  mladším 7 dní. Od v20.10.1 (K3-N1) musí záznam popisovat kopii
  **nočního otisku, který v úložišti je** (původ `nocni-otisk`, jméno
  souboru k němu, velikost > 0, platný SHA-256) — nepodložený záznam
  („aktuální stav“, velikost 0, bez otisku) retenci neodemkne.
- **Trvá:** server nemá jak ověřit, že soubor na Disku opravdu leží (Netlify
  na Disk nedosáhne). Kdo má relaci správce, může POSTem s věrohodnými poli
  retenci odemknout. Dopad omezuje pravidlo retence (nic před 20. 10. 2026,
  denní otisky až po 30 dnech, první v měsíci 12 měsíců, nejnovější nikdy).
  Heslo správce u záznamu a podmínka na složku čekají na J. V. (K3-N1).

### B194 — zámek mutačních běhů (jen vývoj, ne produkce)

- Zámek `.mutace_bezi.json` chrání pracovní kopii před dvěma souběžnými
  mutačními běhy. Od v20.10.1 (K3-N5) vzniká atomicky (`linkSync`), mrtvý
  zámek smí smazat jen držitel výlučného zámku převzetí a záznam nese čas
  startu procesu (opětovné PID). **Mez:** bez `/proc` (jiný systém než Linux)
  se opětovné PID nepozná; zámek převzetí starší 10 s se považuje za
  mrtvý. Zámek chrání jen běhy v téže pracovní kopii, ne ruční zásahy do
  souborů během mutací.
