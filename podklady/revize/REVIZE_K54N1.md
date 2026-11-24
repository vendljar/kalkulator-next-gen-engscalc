# Nezávislá revize K54-N1 (#750) — smazaná otevřená kalkulace se zavře a uložením nevzkřísí

- Revidovaný rozdíl: `git diff 0fd6410..b23e832`, větev `claude/rychla-K54-N1` (základ `0fd6410` = integrace = test v24.11.1).
- Datum: 24. 11. 2026. Revize nic neměnila v revidované větvi, na webech, v Pipedrive ani na Disku.
- Reprodukce nálezů: `podklady/revize/k54n1/repro_ui.js` (`node podklady/revize/k54n1/repro_ui.js .`)
  a `podklady/revize/k54n1/repro_server.mjs` (skutečné handlery, úložiště v paměti, simulátor Pipedrive).

## Verdikt: SLOUČIT PO OPRAVÁCH

Oprava je správným směrem a proti v24.11.1 nic nezhoršuje: falešné odmítnutí legitimního uložení jsem
nenašel, cena ani dokumenty se nemění, testy mají pojistku. Rozhodnutí J. V. („server odmítne uložení
smazané kalkulace ze staré kopie“) ale v jednom běžném případě neplatí: **v tomtéž okně, kde se kalkulace
smazáním zavřela, ji jeden krok Zpět (Ctrl+Z) vrátí a automatické uložení ji založí znovu** — přesně
příznaky K54-N1 (N1). Oprava N1 je malá a čistě klientská; doporučuji ji doplnit před sloučením.
N2–N4 jsou zbylé cesty, které je potřeba vědomě přijmout nebo zapsat do roadmapy; N5–N8 drobnosti.

## Co jsem ověřil (spuštěno)

| Kontrola | Výsledek |
|---|---|
| `netlify/test_k54n1_smazana.mjs` na `b23e832` | 17 OK / 0 FAIL |
| `src/test_k54n1_smazani_ui.js` na `b23e832` | 12 OK / 0 FAIL |
| Pojistka: tytéž sady nad základem `0fd6410` | server 6 FAIL, UI 8 FAIL — souhlasí s commitem |
| Porovnání sestavení `--jen porovnani --proti origin/test` (`0fd6410`) | SHODA 367/367 |
| `src/test_roadmapa.js` | 26 OK / 0 FAIL |
| `kontrola_udaju.py --rozsah 0fd6410..b23e832` | čisté |
| Mutace `node netlify/mutace.mjs K54N1` | 8 z 8 chycených (jen filtr K54N1, ne celý běh) |
| `PREDAVKA.md` | 13,1 kB (limit 15 kB) |

Celé kolo (`testovaci_kolo.sh --bez-mutaci`) jsem znovu nepouštěl — beru údaj z předávky (sady 536/1 a hodiny
435/1 kvůli `test_roadmapa`, opraveno druhým commitem; `test_roadmapa` jsem ověřil zvlášť).

## Nálezy

### N1 — STŘEDNÍ až VYSOKÁ: krok Zpět (Ctrl+Z) po zavření smazanou kalkulaci vrátí a uložení ji vzkřísí

`zakNovaZakazkaProved()` končí `render()` → `historieTik()` zařadí otisk právě zavřené (smazané) kalkulace do
zásobníku Zpět. Tlačítko Zpět je po zavření aktivní. Ctrl+Z nasadí starou kopii zpět do okna
(`historieObnov`), `ONLINE_STAV.soubor` i razítko jsou po `zakOdpojUlozeni()` prázdné, hlavička je vyplněná →
brána automatického ukládání ji pustí (stisk klávesy = `zmenaUzivatele`). Tělo odejde s
`ocekavaneRazitko: ''`, `ocekavanySoubor: ''`; server ho bere jako novou zakázku a zapíše.

Reprodukce (`repro_ui.js`, skutečné funkce z `online_ui.js`, `zakazka_ui.js`, `zakulozeni_ui.js`, `historie.js`):

```
po smazání: ZAK.cislo="" | zpráva: Kalkulace CN-432 byla smazána. | kroků Zpět: 2
po Zpět: ZAK.cislo=CN-432 | zamčená varianta: true | ONLINE_STAV.soubor=""
odesláno: ocekavaneRazitko="" ocekavanySoubor="" | zakazka.cislo=CN-432 | protokol: ["stary"] | zámek: true
```

Server (`repro_server.mjs`, oddíl A): stará kopie s prázdným razítkem → **200**, další webhook dealu
`aktualizovano`, `pdCerstva` chybí — tedy původní vada.

Proč je to pravděpodobné: kalkulace po smazání z okna „zmizí“ a Zpět je první reflex. U tlačítka Nová zakázka
tatáž cesta nevadí (záznam na serveru leží, prázdné razítko narazí na kolizi B10); vadí jen po smazání.

Návrh (malé, jen klient): v `onlineSmazVybrane` po zavření smazané otevřené kalkulace zahodit historii kroků
(`HIST.zpet.length = 0; HIST.znovu.length = 0`) a nouzovou zálohu v prohlížeči (`historieZalohaHotovo()`, viz
N2) — nejlépe jednou funkcí v `historie.js` (např. `historieZapomen()`), volanou jen z cesty smazání, ne
z tlačítka Nová zakázka. Test s pojistkou do `src/test_k54n1_smazani_ui.js`: po smazání je zásobník Zpět
prázdný a `historieZpet()` starou kopii nevrátí; mutace „historie se po smazání nezahodí“.

### N2 — STŘEDNÍ: záloha v prohlížeči nabídne „Pokračovat v rozpracované kalkulaci“ se smazanou kopií

Měla-li smazaná otevřená kalkulace neuložené změny (nebo je měla druhá karta / kolega), leží její kopie
v nouzové záloze prohlížeče (`kng_rozpracovano_v1`). Zavření ji neuklidí — prázdná nová zakázka zálohu
s obsahem nepřepíše (`uloZalohaSmiPrepsat`) — a žlutá lišta ji po F5 nabídne k pokračování. Obnovená kopie
se uloží jako nová (prázdné razítko, viz N1 oddíl A). Záloha, jejíž aktivní varianta je zamčená tiskem, se
nenabízí (`uloZalohaOdeslana`), takže u CN-432 z nálezu by se neuplatnila; u kalkulace s rozpracovanou
aktivní variantou ano. V `repro_ui.js` je vidět, že záloha po zavření starou kopii dál nese (pravidlo
`uloZalohaSmiPrepsat` je tam zjednodušená náhrada, žlutou lištu jsem v prohlížeči nezkoušel).

Návrh: v okně, které mazalo, vyřešit společně s N1. Druhou kartu a kolegu to neřeší — viz N4.

### N3 — STŘEDNÍ: „Přepsat serverovou verzi“ přepíše čerstvou kalkulaci z webhooku starou kopií

Pořadí smazání → webhook založí novou čerstvou kalkulaci pod týmž jménem → staré okno (druhá karta, kolega)
uloží. Pod jménem už záznam leží, takže nová pojistka mlčí a nastoupí běžná kolize B10 s hláškou
„Zakázku mezitím uložil(a) Pipedrive (webhook)“ a tlačítkem Přepsat. Po stisku:

```
C) webhook po smazání: zalozeno | pdCerstva = true
   staré okno uloží: 409 kolize = true | Zakázku mezitím uložil(a) Pipedrive (webhook). …
   „Přepsat serverovou verzi“ (razítko naDisku): 200 | adresa = STARA KOPIE | pdCerstva = undefined
```

Výsledek je týž jako u K54-N1 (stará prodaná varianta, starý ceník a protokol místo čerstvé kalkulace), jen
po vědomém kliknutí — a hláška uživateli neřekne, že na serveru leží JINÁ kalkulace, ne novější verze té
jeho. Totéž platí, když pod číslem smazané mezitím někdo založil Novou zakázku. Chování je stejné jako
před opravou (oprava ho nezhoršila).

Návrh: rozhodnutí pro J. V. / roadmapu, ne pro rychlou cestu. Čisté řešení je totožnost záznamu
(např. serverem psané `zalozenoId` při prvním zápisu; klient ho vrací, server při neshodě odpoví
409 „pod tímto číslem je jiná kalkulace“ bez tlačítka Přepsat). Mění formát uložených dat → samostatná dávka.

### N4 — NÍZKÁ až STŘEDNÍ (přijatelné, zapsat jako mez): zbylé cesty, kterými stará kopie smazanou kalkulaci založí

Pojistka pozná jen tělo, které nese razítko **a** `ocekavanySoubor` rovný cílovému jménu. Dál projde:

| Cesta | Výsledek | Hodnocení |
|---|---|---|
| Přečíslování v okně se smazanou kalkulací (druhá karta, kolega) | 200 pod novým číslem (oddíl B), celá stará kopie včetně `pdDealId` | přijatelné jako vědomý krok; vzniknou dvě kalkulace téhož dealu, webhook pod původním číslem založí čerstvou |
| Import ze souboru JSON, „Uložit jako“ / duplikát, klon | nová zakázka bez razítka → 200 | přijatelné — vědomá záchrana práce, jediná cesta, jak smazanou kalkulaci z kopie vrátit |
| Kalkulace bez razítka (`uloRazitko` chybí — záznamy z doby před B10, pokud nějaké zbyly a nikdo je od té doby neuložil) | 200 | okrajové; jeden zápis razítko doplní |
| Správcovská oprava přípon (`priponyOprav`) a ukázková data (`testDataSyp`) — těla bez `ocekavanySoubor` | beze změny | okno mezi načtením a zápisem jsou milisekundy; přijatelné |
| Souběh DELETE × POST ve dvou instancích funkce | POST, který četl před smazáním, zapíše po něm | známá mez (`BEZPECNOST_MEZE`, Blobs bez podmíněného zápisu); beze změny |

Úložiště běží s `consistency: 'strong'` (`sdilene.mjs`), takže zpožděné čtení Blobs pojistku neobejde ani
falešně nespustí.

Návrh: doplnit do `BEZPECNOST_MEZE.md` odstavec „K54-N1 chrání přímé uložení z okna, které kalkulaci
načetlo; vědomé kroky (přečíslování, import, duplikát) starou kopii založit umí“. Robustní varianta pro
roadmapu: náhrobek smazané kalkulace na serveru (razítko poslední verze při DELETE; POST na neexistující
cíl, jehož `zakazka.uloRazitko` sedí na náhrobek, → 409) — pokryl by N1, N2 i přečíslování, ale zavřel by
i záchranu importem ze souboru, proto je to rozhodnutí J. V.

### N5 — NÍZKÁ: okno se smazanou kalkulací po 409 dál zkouší ukládat

Klient odpověď `smazana` nijak nerozlišuje: padne do obecné větve „Neuloženo online: …“. Automatické ukládání
se nezastaví (na rozdíl od kolize), takže každá další změna pošle nový POST a dostane 409; hláška v liště je
jediný signál a další zpráva ji přepíše. Po tisku (`fronta`) se text ukáže v dialogu — to je v pořádku.

Návrh (může jít s N1, nebo zvlášť): `e.data.smazana` ošetřit jako trvalý stav — zastavit časovač, držet
hlášku, nabídnout tlačítko „Zavřít (Nová zakázka)“.

### N6 — NÍZKÁ: potvrzení mazání neřekne, že se zavře otevřená kalkulace s neuloženými změnami

Dialog „Opravdu smazat N zakázek“ neupozorní, že mezi vybranými je právě otevřená kalkulace; ta se po smazání
zavře bez dotazu i s neuloženou prací a administrátor je přepnut ze Seznamu zakázek na kartu Kalkulace
(`prepniTab('kalk')`) — i uprostřed hromadného úklidu. Odpovídá rozhodnutí J. V. („jako Nová zakázka“),
jen to uživatel předem neví.

Návrh: do textu potvrzení doplnit řádek „Mezi vybranými je právě otevřená kalkulace <číslo> — zavře se
(neuložené změny se ztratí).“ Text hlášky = rozhodnutí J. V.

### N7 — NÍZKÁ: mazání nečeká na rozběhnuté uložení a neruší naplánovaný autosave

`onlineSmazVybrane` nezkoumá `ONLINE_STAV.ukladaBeh` ani `ONLINE_STAV.timer`. Autosave naplánovaný před
potvrzením může vystřelit během mazání: po smazání dostane 409 (pojistka drží), před smazáním projde a záznam
se pak smaže — obojí neškodné. Zbývá úzké okno: odpověď letícího uložení dorazí až po zavření a
`onlineUloz().then` zapíše `ONLINE_STAV.soubor` a `ZAK.uloRazitko` do nové prázdné zakázky. Stejné okno má
i tlačítko Nová zakázka (není to regrese).

Návrh: na začátku mazání zrušit časovač a počkat na `ukladaBeh`.

### N8 — INFO: drobnosti bez dopadu

- Větev `else if (… zakOdpojUlozeni)` v `onlineSmazVybrane` je v sestavené aplikaci nedosažitelná (obě funkce
  jsou vždy přítomné); mutace „nezavře“ díky ní padá zpět na staré chování, což test chytí — v pořádku.
- Podmínka `ONLINE_STAV.soubor === otevrena` (mezitím otevřená jiná zakázka) nemá vlastní test ani mutaci;
  během mazání je `pracuje = true`, takže je to spíš pojistka.
- `roadmap.json`: nový záznam #750 začíná čárkou na samostatném řádku (kosmetika, JSON platný).
  `stav: hotovo` s `verze: v24.11.2` je předběžné — po přidělení verze koordinací srovnat.
- Hláška 409 uvádí číslo z těla požadavku (`zak.cislo`), ne ze serveru — u smazaného záznamu jiné není.

## Odpovědi na zadané otázky

1. **Obejití pojistky.** Jiné jméno souboru / přečíslování: projde (N4). Prázdné razítko: projde — a je to
   cesta kroku Zpět a zálohy v prohlížeči (N1, N2), tu považuji za nepřijatelnou v okně, které mazalo.
   Import souboru, varianta/kopie, „Uložit jako“: projde, přijatelné (vědomý krok). Víc zákazníků: ukládá
   týmž `onlineUloz`, jiná cesta zápisu celé zakázky není (ostatní serverové funkce — `pd_vazba`, `pd_prodej`,
   `pd_organizace`, `pd_org_vitez` — čtou záznam ze serveru a smazaný nezaloží). Nastavení: `priponyOprav`
   a `testDataSyp` pole neposílají, chování beze změny, přijatelné. Navíc N3 (Přepsat přes čerstvou).
2. **Falešné odmítnutí.** Nenašel jsem. Nová zakázka pod číslem smazané: prázdné razítko → uloží se (test).
   Obnova ze zálohy: `obnova.mjs` zapisuje přímo, POST nepoužívá; po obnově záznam leží a okno pokračuje
   běžnou cestou (shoda razítka, nebo kolize s Přepsat). Přejmenování / změna čísla: cíl ≠ `ocekavanySoubor`
   → pojistka mlčí, kolize jmen řeší B10 jako dosud; server při přečíslování starý záznam nemaže (jediné
   `smaz('z/…')` je administrátorské DELETE). Opakované uložení po výpadku: záznam leží → nejvýš kolize jako
   dosud, nikdy „smazána“. Souběh dvou karet: druhá dostane „smazána“ jen tehdy, když záznam opravdu neleží.
   Webhook: POST nepoužívá; po smazání založí čerstvou (`zalozeno`, `pdCerstva`) — ověřeno testem i reprodukcí.
   Silná konzistence úložiště vylučuje falešné „neleží“ těsně po zápisu.
3. **UI.** Zavírá se jen při úspěšném DELETE otevřeného záznamu (i `existovala: false` — záznam už neleží,
   správně); nepovedené smazání a smazání jiné zakázky nezavírá (testy + mutace). Hromadné smazání včetně
   otevřené: zavřeno, hláška nese souhrn. Neuložená práce se zahodí bez dotazu (N6). Krok Zpět ji vrátí (N1).
4. **Testy.** Pojistka doložena (viz tabulka). Serverová sada volá skutečné handlery včetně webhooku; UI sada
   spouští skutečné funkce vyňaté ze zdroje v pískovišti a hlídá chování (stav okna, odeslané tělo, hlášky),
   ne tvar kódu. Mezera: krok Zpět a záloha po smazání (N1, N2), odpověď `smazana` v klientu (N5).
5. **Cena a dokumenty.** Beze změny: rozdíl sahá jen do `src/ui/online_ui.js`, `src/ui/zakazka_ui.js`
   a `netlify/functions/zakazky.mjs` (větev před zápisem); S3 SHODA 367/367 potvrzena vlastním během.

## Doporučení koordinaci

1. Před sloučením doplnit do `claude/rychla-K54-N1` opravu N1 (zahodit historii kroků a zálohu po smazání
   otevřené kalkulace) s testem a mutací; N2 se tím v mazajícím okně vyřeší zároveň.
2. N5–N7 lze přibalit (malé, klientské, bez dopadu na cenu), nebo zapsat do roadmapy.
3. N3 a robustní varianta N4 (totožnost záznamu / náhrobek) → otázka pro J. V. a samostatná položka roadmapy.
4. Po nasazení do testu zkusit ručně i: smazat otevřenou → Ctrl+Z → nic se nevrátí a neuloží.

---

# Dorevize oprav (24. 11. 2026) — rozdíl `b23e832..b6fb16b`

Kód `189a334`, `b6fb16b` jen test a dokumentace. Reprodukce: `podklady/revize/k54n1/repro_n3.mjs` (nová pojistka N3),
`repro_server.mjs` a `repro_ui.js` (původní nálezy; `repro_ui.js` upraveno, aby běželo nad starou i novou verzí).
Reprodukce se pouštějí nad pracovní kopií revidované větve (do ní zkopírovat složku `podklady/revize/k54n1/`).

## Verdikt dorevize: SLOUČIT PO OPRAVÁCH (D1, D2 — obě malé, týž řádek serveru)

N1, N2, N5–N8 jsou opravené a ověřené. Nová pojistka N3 dělá, co J. V. rozhodl (stará kopie čerstvou kalkulaci
z Pipedrive nepřepíše), ale jako totožnost záznamu bere razítko verze v datech těla — a to dává **dvě falešná
odmítnutí řádného prvního uložení čerstvé kalkulace** (D1, D2). Obojí končí trvalým stavem okna bez možnosti
uložit. Pipedrive na `main` ještě neběží (#730), takže dopad je teď jen na testu; přesto doporučuji opravit před
sloučením — oprava je jedna podmínka na serveru a test.

## Co jsem ověřil (spuštěno nad `b6fb16b`)

| Kontrola | Výsledek |
|---|---|
| `netlify/test_k54n1_smazana.mjs` | 25 OK / 0 FAIL |
| `src/test_k54n1_smazani_ui.js` | 30 OK / 0 FAIL |
| Pojistka: tytéž sady nad `b23e832` (před opravami) | server 6 FAIL, UI 15 FAIL |
| Porovnání sestavení `--proti origin/test` | SHODA 367/367 |
| Mutace `node netlify/mutace.mjs K54N1` | 24 z 24 chycených (jen filtr K54N1, ne celý běh) |
| Původní reprodukce N1/N2 (`repro_ui.js`) | po smazání 0 kroků Zpět, Ctrl+Z nic nevrátí, záloha smazané pryč |
| Původní reprodukce N3 (`repro_server.mjs`, oddíl C) | staré okno i „Přepsat“ → 409 `pdCerstvaJina`, čerstvá zůstala |

Celé kolo jsem nepouštěl (údaj dávky: SHODA 367/367 potvrzuji vlastním během porovnání).

## Stav původních nálezů

| Nález | Stav | Poznámka |
|---|---|---|
| N1 Zpět po zavření | opraveno | `historieZapomen` jen v cestě smazání; test i mutace |
| N2 záloha v prohlížeči | opraveno | maže se jen záloha smazaného záznamu, cizí rozpracovaná zůstane (test) |
| N3 Přepsat přes čerstvou | opraveno s výhradou | viz D1, D2 |
| N4 vědomé kroky | přijato | zapsáno v `BEZPECNOST_MEZE.md` |
| N5 opakované 409 | opraveno | trvalý stav okna; zbytek viz D4 |
| N6 potvrzení, přepnutí karty | opraveno | text potvrzení = rozhodnutí J. V. |
| N7 rozběhnuté uložení | opraveno | časovač zrušen, čeká se na `ukladaBeh` |
| N8 drobnosti | vyřízeno | |

## Nové nálezy dorevize

### D1 — STŘEDNÍ: aktualizace čerstvé kalkulace webhookem zablokuje okno, které ji řádně otevřelo

Webhook při změně v dealu čerstvou kalkulaci aktualizuje (`aktualizovano`): nové razítko, příznak `pdCerstva`
zůstává. Okno, které ji mezitím řádně otevřelo a ještě neuložilo, pak nese razítko předchozí verze téže kalkulace:

```
E) webhook nad otevřenou čerstvou: aktualizovano | pdCerstva = true | razítko změněno: true
   první uložení okna, které ji řádně načetlo: 409 pdCerstvaJina = true | Kalkulaci mezitím znovu založil Pipedrive …
```

Hláška je nepravdivá (nikdo ji znovu nezaložil), stav je trvalý (N5) a „Načíst znovu / Přepsat“ se nenabídne —
rozpracovaná úprava v okně je ztracená. Před opravou tu byla běžná kolize s oběma tlačítky. Okno je krátké
(od založení do prvního uložení člověkem), ale právě tehdy obchodník deal v Pipedrive dolaďuje a automatizace
posílá další doručení. Opakované doručení beze změny razítko nemění (`bezeZmeny`) — to je v pořádku.

### D2 — STŘEDNÍ (podmíněná): souběžné ukládání do složky přepíše razítko v datech a první uložení čerstvé neprojde

`uloUlozDoSlozky` (`src/ui/uloziste_ui.js`, krok „vlastní zápis“) píše `ZAK.uloRazitko = razitko` — vlastní
razítko souboru ve složce. `render()` volá `uloTik()` i `onlineTik()`, oba kanály ukládají nezávisle. Má-li
přihlášený uživatel připojenou složku se zapnutým automatickým ukládáním, zápis do složky změní razítko v datech
okna dřív, než odejde online uložení:

```
F) okno načetlo čerstvou, razítko v datech přepsal zápis do složky: 409 pdCerstvaJina = true
```

Výsledek: čerstvou kalkulaci z Pipedrive takové okno neuloží nikdy (po znovuotevření se totéž opakuje podle
pořadí časovačů). Serverovou část jsem reprodukoval; že se oba kanály v jednom okně opravdu sejdou, plyne z kódu
(`common.js` volá oba tiky, `uloTik` nehledí na přihlášení) — v prohlížeči jsem to nezkoušel. Jestli někdo
složku vedle online databáze používá, ví J. V.; pokud ne, je dopad nulový, ale pojistka by na tom neměla stát.

**Návrh společný pro D1 a D2:** totožnost čerstvého záznamu nebrat z razítka verze, ale z údaje, který se
aktualizací nemění a který nepřepisuje žádná jiná cesta. Dvě možnosti:

1. `pdVazbaWebhook.kdy` — čas založení vazby, webhook ho při aktualizaci drží (`vazbaPlati.kdy`), nově založená
   kalkulace má jiný; okno ho dostane při načtení a klient ho nemění. Podmínka: `stara.pdCerstva === true` a
   vazba v těle má jiné `kdy` (nebo žádnou) → 409 `pdCerstvaJina`; stejné `kdy` → běžná cesta (shoda razítka,
   jinak kolize B10 s „Načíst znovu / Přepsat“ — přepsat aktualizaci webhooku vlastní připravenou kopií téže
   kalkulace je legitimní). `prepsat: true` bez shodné vazby dál neprojde. Čte se z těla PŘED `pdVazbaDrz`.
2. Zvláštní pole těla (např. `nactenoRazitko`), které klient nastaví jen při otevření a po úspěšném uložení
   (ne v „Přepsat“, ne při zápisu do složky). Řeší D2, D1 jen s další podmínkou.

Doporučuji 1. Test s pojistkou: (a) aktualizace webhookem nad otevřenou čerstvou → první uložení dá kolizi
s tlačítky, ne `pdCerstvaJina`; (b) tělo s jiným `zakazka.uloRazitko`, ale se správnou vazbou a očekávaným
razítkem → 200; (c) stará kopie smazané kalkulace z webhooku (jiné `kdy`) → 409 jako dnes.

### D3 — INFO: razítko čerstvé kalkulace jde zjistit bez jejího načtení (rejstřík)

Rejstřík (`GET /api/zakazky`, vidí ho každý přihlášený) nese razítko poslední verze v poli `upraveno`:

```
G) rejstřík nese razítko čerstvé (pole upraveno): true
   cizí zakázka s razítkem z rejstříku (bez načtení čerstvé): 200 | nazevAkce = STARA KOPIE
```

Běžný klient to neudělá — razítko z rejstříku do dat zakázky nikde nepřebírá a „Přepsat serverovou verzi“ mění
jen očekávané razítko. Pojistka je tedy ochrana proti omylu, ne bezpečnostní mez (kdo smí zakázku načíst, smí ji
i uložit — stávající mez NN B237). Věta v `BEZPECNOST_MEZE.md` „smí uložit jen okno, které ji načetlo“ je
silnější než skutečnost; navrhuji doplnit „ochrana proti omylu, ne proti úmyslně sestavenému požadavku“.
Platí i pro variantu s `pdVazbaWebhook.kdy` (je v načtené zakázce, ne v rejstříku — o něco lepší).

### D4 — NÍZKÁ: trvalý stav „smazána“ má dvě mezery

- Nová zakázka pod číslem čerstvé kalkulace (okno bez jména záznamu): po 409 `pdCerstvaJina` se značka nastaví
  na jméno z odpovědi, ale strážce porovnává s `ONLINE_STAV.soubor` (prázdné) → automatické ukládání se
  nezastaví a 409 se opakuje při každé změně. Jen šum, nic se nezapíše.
- Značku neruší odhlášení (`ONLINE_STAV.soubor = ''` v obsluze odhlášení) ani úspěšné uložení. Po odhlášení
  a přihlášení v témž okně projde uložení staré kopie jako nové (prázdné razítko — cesta N4) a hned poté
  značka znovu sedí na jméno → další uložení okno falešně odmítá jako „smazána“. Okrajové.

Návrh: značku rušit i v `.then` úspěšného uložení a při odhlášení; strážce u okna bez jména porovnávat se
jménem, které by uložení dalo (`uloJmenoSouboru(ZAK)`).

### D5 — INFO: zbylé chování, které je v pořádku

- Dvě karty s čerstvou: první uloží (200, příznak zmizí), druhá dostane běžnou kolizi s tlačítky (oddíl H).
- Opakování uložení po ztracené odpovědi: běžná kolize, ne `pdCerstvaJina` (příznak už na serveru není).
- Webhook po uložení člověkem: `bezeZmeny` / aktualizace bez `pdCerstva`, práce člověka zůstává.
- Akce nad čerstvou, které píší na serveru (`/api/pd/vazba`, `/api/pd/organizace`), po sobě zakázku znovu
  načtou (`onlineOtevri`), „vítěz“ přepíše obě razítka — razítko v datech se jimi nerozejde.
- Ukázková data (`testDataSyp`, `prepsat: true`) čerstvou kalkulaci pod týmž číslem nepřepíšou (409) — jen test.
- Po prvním uložení člověkem platí zase B10 včetně „Přepsat“ — stará kopie pak kalkulaci přepsat může;
  rozhodnutí J. V. se týká jen čerstvé, zapsáno v `BEZPECNOST_MEZE.md`.

## Doporučení koordinaci

1. Do `claude/rychla-K54-N1` doplnit opravu D1 + D2 (totožnost čerstvé kalkulace podle `pdVazbaWebhook.kdy`,
   testy a mutace), případně D4; D3 = jedna věta v `BEZPECNOST_MEZE.md`.
2. Pokud koordinace rozhodne sloučit do testu hned (Pipedrive na `main` neběží): D1 a D2 zapsat jako nález
   s vazbou na #730 a opravit před spuštěním Pipedrive na `main`.
3. Ruční zkouška na testu po nasazení: otevřít čerstvou z dealu → změnit pole v dealu (další webhook) →
   uložit v okně: očekává se kolize s tlačítky, ne „znovu založil Pipedrive“.

---

# Druhá dorevize (24. 11. 2026) — rozdíl `b6fb16b..7e13c08`

## Verdikt: SLOUČIT

D1–D4 jsou opravené podle návrhu a ověřené vlastním během; nové falešné odmítnutí ani nové obejití jsem nenašel.
Zbývají jen přijaté meze (N4, D3) a dvě poznámky níž (P1, P2), které sloučení nebrání.

## Co jsem ověřil (spuštěno nad `7e13c08`)

| Kontrola | Výsledek |
|---|---|
| `netlify/test_k54n1_smazana.mjs` | 30 OK / 0 FAIL |
| `src/test_k54n1_smazani_ui.js` | 34 OK / 0 FAIL |
| Pojistka: tytéž sady nad `b6fb16b` | server 3 FAIL, UI 3 FAIL |
| Porovnání sestavení `--proti origin/test` | SHODA 367/367 |
| Mutace `node netlify/mutace.mjs K54N1` | 27 z 27 chycených (jen filtr K54N1, ne celý běh) |
| `kontrola_udaju.py --rozsah b23e832..7e13c08` | čisté |
| `PREDAVKA.md` | 13,2 kB (limit 15 kB) |

Celé kolo jsem nepouštěl.

## Reprodukce `repro_n3.mjs` nad `7e13c08` (rozšířená o oddíly I–M)

| Případ | Výsledek | Hodnocení |
|---|---|---|
| E — webhook aktualizuje čerstvou, kterou má okno řádně otevřenou | 409 běžná kolize B10 („mezitím uložil(a) Pipedrive (webhook)“) s tlačítky | D1 opraveno |
| F — razítko v datech přepsal zápis do složky | 200 | D2 opraveno |
| H — dvě karty, opakování po ztracené odpovědi | první 200, další běžná kolize | beze změny, v pořádku |
| J — nová zakázka pod číslem čerstvé s `prepsat` | 409 `pdCerstvaJina` | drží |
| J — stará kopie s vazbou z jiného založení (jiné `kdy`) | 409 `pdCerstvaJina` | drží |
| K — smazání → nové založení → stará kopie s razítkem z disku a `prepsat` | 409 `pdCerstvaJina`; nové založení má jiný čas vazby | N3 drží |
| C (`repro_server.mjs`) — staré okno a „Přepsat“ | 409 `pdCerstvaJina`, čerstvá zůstala | N3 drží |
| L — opakované doručení webhooku nad čerstvou | `bezeZmeny`, příznak i čas vazby zůstávají; řádné první uložení 200, příznak zmizí, čas vazby drží | v pořádku |
| I — je čas vazby v rejstříku? | ne (odpověď `GET /api/zakazky` ho neobsahuje) | lepší než razítko (to tam je) |
| J — úmyslně podvržená vazba (čas opsaný z načtené čerstvé) | 200 | přijatá mez D3: ochrana proti omylu; zapsáno v `BEZPECNOST_MEZE.md` |
| M — čerstvá bez vazby (stav vyrobený uměle zásahem do úložiště) | pojistka mlčí → 200 s `prepsat` | viz P1 |

Řádek G z první dorevize (razítko z rejstříku) už nic neukazuje — po F je kalkulace uložená člověkem a čerstvá není;
nahrazují ho oddíly I a J.

## Odpovědi na otázky koordinace

- **Čerstvá bez vazby — pojistka mlčí, je to přijatelné?** Ano. Webhook při založení vazbu s časem píše vždy
  (jediné místo, které nastavuje `pdCerstva`), zrušení vazby (`/api/pd/vazba`, akce `zrusit`) jen mění stav na
  `zruseno` a záznam s časem ponechá, obnova z otisku bere příznak i vazbu společně. Stav „čerstvá bez vazby“
  jsem uměl vyrobit jen přímým zásahem do úložiště. Mlčení je navíc bezpečnější směr než odmítat všechno
  (řádné okno by jinak čerstvou neuložilo nikdy) — platí pak běžná B10.
- **Podvržená vazba, je čas zjistitelný z rejstříku?** Z rejstříku ne, jen z načtené zakázky. Kdo ji načte, může
  čas opsat do jiného těla a projde — ochrana proti omylu, ne bezpečnostní mez; v `BEZPECNOST_MEZE.md` je to
  teď řečeno přesně.
- **Opakované doručení webhooku.** Beze změny `bezeZmeny` (razítko i čas vazby drží); se změnou `aktualizovano`
  a otevřené okno dostane běžnou kolizi s tlačítky; po uložení člověkem webhook práci nepřepisuje.

## Poznámky (nebrání sloučení)

- **P1 — INFO:** pojistka stojí na tom, že záznam s `pdCerstva` má vždy vazbu s časem. Dnes to platí; kdyby
  budoucí změna webhooku nebo zrušení vazby čas z čerstvého záznamu odstranila, N3 se potichu vypne. Stačila
  by věta u `pdCerstva` ve webhooku nebo test „čerstvá založená webhookem má `pdVazbaWebhook.kdy`“ (serverová
  sada to dnes ověřuje jen nepřímo).
- **P2 — INFO:** po kolizi z případu E smí řádné okno zvolit „Přepsat serverovou verzi“ — jeho připravená kopie
  pak přepíše údaje, které webhook mezitím doplnil z dealu. Je to běžné chování B10 (vědomá volba) a další
  doručení webhooku údaje znovu nabídne; jen ať se s tím počítá při ruční zkoušce.
- Trvalý stav „smazána“ (D4): značku ruší úspěšné uložení i odhlášení, okno bez jména se porovnává se jménem
  z čísla nabídky — po změně čísla se uložení zase pustí, což je správně (N4, vědomý krok).

## Doporučení koordinaci

Sloučit do integrace a testu rychlou cestou. Ruční zkoušky pro J. V. na testu: (1) smazat otevřenou → Ctrl+Z nic
nevrátí; (2) druhá karta se smazanou → „byla mezitím smazána“, další uložení se neposílá; (3) smazání → webhook
založí čerstvou → staré okno neuloží ani přes „Přepsat“; (4) čerstvá otevřená z dealu → změna v dealu → uložení
v okně dá kolizi s tlačítky, ne „znovu založil Pipedrive“.
