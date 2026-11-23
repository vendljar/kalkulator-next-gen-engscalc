# Revize dávky PD (#733, #728, #729, pd_prevod uzivatel) — druhé čtení

- Datum: 23. 11. 2026, poradce-revizor
- Rozsah: `git diff 173ab6a..ac99910` (větev `claude/pd-webhook-uprava`), důraz na opravy `52ec1ab..ac99910`
- Kód needitován, nic na weby ani do Pipedrive (vše lokálně, simulátor, paměťové úložiště).

## Verdikt: SLOUČIT PO OPRAVÁCH

Jádro opravy (#733 příprava jako Nová zakázka, příznak jen ze serveru, #728, #729,
`uzivatel()`) je správně a rozdělané zakázky nemění. Oprava N1 z první revize je ale
**neúplná**: v opravdovém prohlížeči jde nepřipravenou čerstvou kalkulaci pořád uložit
s marží 0 (N1) a dopříprava po pozdním nasazení ceníku v prohlížeči nikdy neproběhne (N2).
Obojí jsem zopakoval v harnessu `overit_pd_cerstva.mjs` upraveném o výpadek `/api/program`.

## Co jsem ověřil

| Kontrola | Výsledek |
|---|---|
| `testovaci_kolo.sh --jen build,porovnani --proti 173ab6a` | **SHODA**, 367/367 kalkulací, 0 rozdílných |
| `netlify/test_pd_cerstva.mjs` | 29/0 |
| `src/test_pd_cerstva_ui.js` | 21/0 |
| `src/test_zamek_prepnuti.js` | 35/0 |
| `netlify/test_pd_prevod.mjs` | 161/0 |
| `overit_pd_cerstva.mjs` (Chromium, skutečné serverové funkce) | 16/0 |
| Pojistky: tytéž testy nad kódem 173ab6a | všechny čtyři sady selžou (2× pád importu, 1 FAIL prevod, 1 FAIL zámek) |
| Sonda: výpadek `/api/program` při otevření čerstvé kalkulace z odkazu | viz N1, N2 |

Neověřeno: celé kolo ani mutace [PD] jsem nepouštěl (jen přečetl jejich seznam).

## Nálezy

### N1 — STŘEDNÍ (cena): nepřipravenou čerstvou kalkulaci lze ručně odemknout a uložit s marží 0

- Kde: `src/ui/common.js:2097` (`zamekCteniOdemkniUI`), `src/ui/common.js:2025` (`zamekCteniStop`),
  `netlify/lib/pd_vazba.mjs:129` (server příznak mlčky zahodí).
- Oprava z první revize hlídá jen **automatické** odemčení (`pripraveno > 0` v `onlineOtevri`).
  Ruční „Odemknout k úpravám“ příznak `pdCerstva` nezná.
- Zopakováno: `/api/program` při přihlášení selže → čerstvá kalkulace se otevře nepřipravená
  (marže 0, jen ke čtení, `pdCerstva: true`) → `zamekCteniOdemkniUI()` → úprava adresy →
  `onlineUloz()` vrátí `true` → na serveru **marže 0, příznak pryč**. Další otevření už
  s platným ceníkem: marže zůstává 0 natrvalo (zakázka je „rozdělaná“). To je přesně vada #733.
- Podmínka: platný ceník se při otevření nenačetl (přechodná chyba sítě, nebo žádný zveřejněný
  ceník) a odemyká administrátor nebo vedoucí. Úzké, ale následek je trvalý a tichý.
- Návrh opravy (obě vrstvy):
  1. Server: uložení z prohlížeče, které nese `pdCerstva === true`, **odmítnout** (409 s větou
     „Kalkulace z Pipedrive ještě není připravená nad platným ceníkem — otevřete ji znovu.“)
     v `netlify/lib/zakazka_kontrola.mjs` před `pdVazbaDrz` (mimo obnovu). Připravený klient
     příznak maže, takže příznak v těle = nepřipravená kalkulace. Kryje i klon, duplikát
     a zálohu z prohlížeče.
  2. Klient: `zamekCteniOdemkniUI` a `zamekCteniStop` při `ZAK.pdCerstva === true` neodemknou
     a řeknou proč.
  3. Test s pojistkou na obojí + krok do `overit_pd_cerstva.mjs`.

### N2 — STŘEDNÍ (cena, funkce opravy N1): dopříprava `onlineCerstvaDopriprav` v prohlížeči nikdy neproběhne

- Kde: `src/ui/online_ui.js:1768` (podmínka `JSON.stringify(ZAK) === ONLINE_STAV.posledni`).
- Po otevření se `ZAK` od `ONLINE_STAV.posledni` liší i bez zásahu uživatele: překreslení doplní
  `sleva.zamitl / zamitlKdy / zamitnutoDuvod`, `slevaProj.*`, `proj.cenik.vlastniPolozky`
  a dotaz na stav dealu doplní `pdStav`. Podmínka „beze změny“ je tedy vždy nepravda.
- Zopakováno: po výpadku `/api/program` a jeho pozdějším načtení (`onlineNactiProgram(); render()`)
  zůstala marže 0 a `pdCerstva: true`. Když jsem `posledni` ručně srovnal, dopříprava proběhla
  (marže 0,3) — chyba je jen v podmínce.
- Test to nehlídá: `src/test_pd_cerstva_ui.js:95` nastavuje `posledni = JSON.stringify(ZAK)` ručně
  v pískovišti bez překreslení.
- Návrh: místo porovnání textu rozhodovat zámkem — dopřipravit, když `ZAK.pdCerstva === true`
  a `zamekCteniJe()` (zamčeným oknem uživatel nic změnit nemohl). Doplnit scénář „ceník dorazí
  později“ do `overit_pd_cerstva.mjs`.

### N3 — NÍZKÁ (cena, projeví se po opravě N2): dopříprava bez ověření, že platný ceník opravdu platí

- Kde: `src/ui/online_ui.js:3034–3035`. `progPouzij(ONLINE_STAV.db.platny)` při `platny == null`
  nic neudělá (`program_ui.js:148`), dopříprava se přesto zavolá → připravila by nad ceníkem
  ze sestavení a lišta by tvrdila „platný ceník“.
- Návrh: v `onlineCerstvaDopriprav` stejná podmínka jako v `onlineCenikNasadHned`
  (`progJede()` nebo `PROG_STAV.pouzita.verze === db.platny.verze`).

### N4 — NÍZKÁ (testy): jediná zkouška v opravdovém prohlížeči není v kole

- `overit_pd_cerstva.mjs` leží v kořeni repa a nevolá ho `testovaci_kolo.sh`, `spust_testy.sh`
  ani CI (jen zmínky v komentářích). N2 ukazuje, že pískoviště samo nestačí.
- Návrh: zařadit do kola (nebo aspoň do cílené sady PD) a přesunout k ostatním `overit_*`.

### N5 — INFO: lišta slibuje, co se nestane

- `src/ui/online_ui.js:1936`: „připraví se, jakmile se ceník načte (jinak ji otevřete znovu)“.
  Po selhání `/api/program` se ceník sám znovu nenačítá a opětovné otevření zakázky nepomůže
  (`ONLINE_STAV.db` zůstane prázdné do nového přihlášení / obnovení stránky). Text upravit
  na „obnovte stránku“.

## Odpovědi na zadané otázky

1. **Cena.** Běžná cesta (ceník načtený při přihlášení) je v pořádku: ceník se nasadí před
   importem, příprava = Nová zakázka (ověřeno v prohlížeči proti Nové zakázce pole po poli),
   první uložení zapíše zveřejněnou marži a server příznak zahodí. Souběh `onlineTik` ×
   otevření je ošetřen (N3 první revize: `cenikPouzit`). Díra zůstává jen při nenačteném
   ceníku — N1 a N2. Tisk dokumentu nad ceníkem ze sestavení brání stávající zábrana
   ukázkového ceníku; tu jsem zvlášť nezkoušel.
2. **Rozdělané zakázky.** Porovnání sestavení SHODA 367/367. `pdCerstvaPriprav` bez příznaku
   nic nedělá, zamčenou variantu přeskočí; v `onlineOtevri` se u zakázky bez příznaku
   nenasazuje ani nepřipravuje nic navíc (test i mutace to hlídají).
3. **Práva.** Příznak píše jen webhook při založení (`functions/pd_webhook.mjs:249`).
   Uložení z prohlížeče jde vždy přes `pdVazbaDrz` (`zakazka_kontrola.mjs:430`), které ho
   zahodí; výjimka je jen obnova z otisku serveru (`functions/obnova.mjs`, administrátor).
   Podvržení z prohlížeče tedy neprojde. Automatické odemčení vyžaduje `zOdkazu`, čerstvou
   a připravenou kalkulaci, žádný náhled a `zamekCteniSmiOdemknout` — zámek neobchází.
   Pozn.: autor je `pipedrive-webhook`, takže odemkne jen administrátor a vedoucí; obchodník
   dostane kalkulaci z odkazu jen ke čtení a odemknout ji nemůže. Otázka pro J. V. (autor =
   vlastník dealu) už je v roadmapě u #728.
4. **Testy.** Pojistky drží (na 173ab6a padají). Mutace [PD] pokrývají příznak, přípravu,
   nasazení ceníku, odemčení i opravy revize. Slabé místo je N2 (test dopřípravy si podmínku
   splní sám) a N4.

## Další poznámky (bez nálezu)

- #729: u existující nezmrazené kalkulace, kde kontakt zůstal tak, jak ho zapsal webhook
  („jméno, e-mail, telefon“), ho další doručení webhooku zkrátí na jméno. Odpovídá zadání
  („nové plnění z webhooku“), ale mění text kontaktní osoby v dokumentu — říct J. V.
- Kalkulace založené webhookem před nasazením příznak nemají a zůstanou s marží 0, dokud je
  někdo ručně neopraví nebo se nezaloží znovu (na testu deal TEST z kola 53).
- `uzivatel()`: e-mail z textu má přednost, při neshodě jméno před čárkou; samotný neznámý
  e-mail dává důvod. V pořádku.

---

## Dorevize oprav N1–N5 (`git diff ac99910..ca45d69`, 23. 11. 2026)

### Verdikt: SLOUČIT

| Kontrola nad ca45d69 | Výsledek |
|---|---|
| `testovaci_kolo.sh --jen build,porovnani --proti ac99910` | **SHODA**, 367/367 |
| `netlify/test_pd_cerstva.mjs` | 30/0 |
| `netlify/test_553_webhook.mjs`, `netlify/test_k40c_webhook.mjs` | 77/0, 118/0 |
| `src/test_pd_cerstva_ui.js`, `src/test_zamek_prepnuti.js` | 26/0, 35/0 |
| `overit_pd_cerstva.mjs` (Chromium) | 24/0 |

Celé kolo a mutace jsem znovu nepouštěl (předávka dávky hlásí VŠE ZELENÉ nad 31b8083).

- **N1 opraveno.** Server: `netlify/lib/zakazka_kontrola.mjs:433` odmítne 409 každé uložení
  z prohlížeče s `pdCerstva === true` (mimo obnovu) — jediná cesta zápisu z prohlížeče
  (`functions/zakazky.mjs:200`), takže kryje i klon, duplikát a zálohu z prohlížeče. Webhook
  touto kontrolou nejde, zakládání funguje. Odpověď nenese `kolize`, klient ji ukáže doslova
  (žádná nabídka „Přepsat serverovou verzi“). Klient: `zamekCteniOdemkniUI` i `zamekCteniStop`
  nepřipravenou kalkulaci neodemknou a řeknou proč. V prohlížeči ověřeno: odemčení neproběhne,
  přímý zápis vrátí 409, na serveru zůstane příznak.
- **N2 opraveno.** `onlineCerstvaDopriprav` rozhoduje zámkem čtení, ne otiskem. Scénář „ceník
  dorazí později“ v `overit_pd_cerstva.mjs` si podmínku **nesplňuje sám**: jen zavolá
  `onlineNactiProgram(); render()` a čeká — otisk ani zámek neupravuje. Na ac99910 by selhal
  (moje sonda tam dala marži 0).
- **N3 opraveno.** Dopříprava jen nad nasazenou platnou verzí (`PROG_STAV.pouzita.verze ===
  db.platny.verze`) nebo pod složkou.
- **N5 opraveno** (věta lišty: obnovit stránku F5).
- **N4 zůstává** (nízká, nebrání sloučení): `overit_pd_cerstva.mjs` pořád není v
  `testovaci_kolo.sh` ani v CI; pouští se ručně.

Nová díra v ceně: nenašel jsem. Dvě drobnosti bez vlivu na cenu (server je zastaví):

- `zamekKryciCteniUvolni` (`src/ui/zamek_ui.js:121`) a duplikace zakázky zámek čtení shazují bez
  dotazu na `pdCerstva`. U nepřipravené kalkulace by pak uživatel psal a uložení skončilo 409;
  dopříprava už neproběhne (okno není zamčené), pomůže až F5. Stačí časem doplnit tutéž
  podmínku; týká se jen stavu „ceník se nenačetl“.
