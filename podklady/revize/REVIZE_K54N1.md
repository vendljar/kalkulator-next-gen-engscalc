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
