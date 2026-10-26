# Postup obnovy databáze ze zálohy — pro případ nouze

> Sepsáno 24. 9. 2026 (#152, 2. část), doplněno 26. 10. 2026 (#522 — velká databáze; #523 — kolik záloh se drží, kopie na Disku `.json.gz`). Každý krok je ověřený automatickou
> zkouškou `netlify/test_obnova_nanecisto.mjs`, která simuluje úplnou havárii
> a běží při každé kontrole před nahráním (`nastroje/pred_pushem.sh`). Když
> se postup a aplikace rozejdou, zkouška spadne dřív, než se na to přijde
> v nouzi.

## Co se zálohuje a kde to leží

| Záloha | Kde | Co obsahuje | Kdy vzniká |
|---|---|---|---|
| **Noční otisk** | Netlify Blobs, úložiště `zalohy`, klíč = datum (od v26.10.8 manifest + části `casti/<datum>/…`) | celá databáze **včetně účtů a otisků hesel** | každou noc sám, 2:00–3:45 UTC po 15 min (funkce `zaloha_nocni` — běhy navazují, dokud není hotový) |
| **Otisk při přihlášení** | totéž | totéž | administrátor se přihlásí a dnešní otisk ještě není |
| **Otisk před obnovou** | totéž, klíč `…-pred-obnovou` | stav těsně před každou obnovou | automaticky při obnově |
| **Kopie na Disku Google** | složka **_Zaloha Netlify DB**, soubor `otisk_RRRR-MM-DD.json.gz` (od v26.10.9 komprimovaný; starší `otisk_…json`) | poslední noční otisk — **účty bez hesel, bez podpisů** | tlačítko „Zkopírovat zálohu na Disk teď" (jednou týdně připomene) |
| **Stažená záloha** | u vás v počítači / na Disku (tlačítko „Stáhnout zálohu", „Odlít zálohu do složky") | zakázky, ceník, firma, šablony, matice — **účty bez hesel** | ručně |

**Kolik záloh se drží (od v26.10.9, #523, rozhodnutí J. V. 26. 10. 2026).**

| Kde | Drží se | Maže se |
|---|---|---|
| Netlify — noční otisky | posledních **14 dní**; z každého týdne nedělní (chybí-li, nejbližší starší v týdnu) **8 týdnů**; z každého měsíce první **6 měsíců** | ostatní, každou noc po hotovém otisku |
| Netlify — „Zálohovat teď" a otisky při přihlášení | **7 dní** | starší |
| Netlify — otisky před obnovou | **navždy** (smaže jen člověk) | nikdy |
| Netlify — staré otisky do 19. 10. 2026 | jen **první z každého měsíce**, i ten nejvýš 6 měsíců | ostatní (výjimka „staré nikdy" je zrušená) |
| Disk Google — kopie | posledních **7 dní**; z týdne nedělní **8 týdnů**; z měsíce první **6 měsíců** | ostatní, po každé úspěšné kopii (jen soubory `otisk_RRRR-MM-DD.json(.gz)`; Disk je drží 30 dní v koši) |

Nejnovější záloha se nesmaže nikdy. V Netlify se maže jen tehdy, když je na
Disku podložená kopie mladší než 7 dní a nová noční záloha nenese méně než
polovinu zakázek nebo účtů než předchozí (jinak mazání stojí a Nastavení →
Databáze varuje). Na Disku se maže jen po úspěšné kopii, kterou server přijal
a jejíž soubor sedí velikostí i kontrolním součtem — výsledek („Na Disku
smazáno N starších kopií…") ukáže hláška po kopii.

**Komprese (od v26.10.9).** Části nočních otisků v Netlify se ukládají
komprimované (gzip, o 30–40 % méně místa) — obnova a stažení je čtou samy,
starší nekomprimované otisky taky. Kopie na Disku je soubor `.json.gz`:
**obnova „ze souboru" ho načte přímo** (Chrome, Edge). Kdo ho chce otevřít
mimo aplikaci, rozbalí ho běžným programem (7-Zip, `gunzip`) na `.json`.

**Velká databáze (od v26.10.8, #522).** Do v26.10.8 se otisk pořizoval
najednou a u ostrého engscalc (~800 zakázek) se do limitu funkce nevešel —
nevznikl žádný. Teď se otisk skládá z částí (nejvýš 4 MB) a pořizuje se po
krocích: noční funkce běží v okně 2:00–3:45 UTC každých 15 minut a navazuje,
„Zálohovat teď" i otisk před obnovou dopořizuje aplikace sama (vidíte průběh
„zpracováno X z Y záznamů"). Otisk existuje (a je vidět v přehledu) až když
je celý. Když se pokus nepovede, Nastavení → Databáze ukáže **poslední pokus
o zálohu** s důvodem; v Netlify → Logs → Functions → `zaloha_nocni` /
`zaloha_vynuceno` je chyba celá. Stažení zálohy a kopie na Disk se stahují po
stránkách a skládají v prohlížeči — soubor má stejný tvar jako dřív.
Obnova z otisku po částech běží po dávkách (15 záznamů) sama.

Že noční otisky vznikají, hlídá aplikace sama: administrátor dostane po
přihlášení varování, když poslední noční otisk chybí nebo je starší než
48 hodin (Nastavení → Databáze, od v24.9.1).

## A) Pokazila se data, zálohy jsou (nejčastější případ)

Příklad: někdo přepsal zakázky, zmizela firma, smazal se obchodník.

1. Přihlaste se jako administrátor.
2. **Nastavení → Databáze → Obnovit ze zálohy…**
3. Zdroj: **otisk na serveru** — vyberte noční otisk ze dne, kdy bylo vše v pořádku.
4. Režim:
   - **doplnit** — vrátí jen to, co chybí; nic, co na serveru je, nepřepíše.
     Začněte vždy tímhle.
   - **přepsat** — vrátí vybrané části přes stávající stav. Jen když víte,
     že současná data jsou špatně.
5. Části: nechte zaškrtnuté, co se má vrátit (zakázky, ceník, firma, účty…).
6. Klikněte na **Zobrazit náhled** a zkontrolujte čísla (kolik zakázek nových,
   přepsaných, přeskočených a proč). Náhled nic nezapisuje.
7. Klikněte na **Obnovit databázi** a potvrďte dotaz. Před zápisem vznikne otisk
   „před obnovou" — obnovu jde tedy vrátit obnovou z něj.

Odeslané (uzamčené) nabídky se obnovou nikdy nepřepíšou — jsou to doklady.

## B) Zmizela celá databáze, noční otisky zůstaly

1. Na přihlašovací stránce zadejte adresu hlavního administrátora
   (proměnná `ADMIN_EMAIL` v Netlify) a **náhradní heslo z proměnné
   `ADMIN_INIT_HESLO`** (Netlify → Site configuration → Environment
   variables). Prázdná databáze ho přijme a účet administrátora založí.
2. Dál přesně jako v A): Obnovit ze zálohy… → poslední noční otisk →
   režim **doplnit** → Zobrazit náhled → Obnovit databázi.
3. Vrátí se všechno včetně účtů: obchodníci se přihlásí **svými původními
   hesly**.
4. Hned poté si administrátor změní heslo v Můj profil (náhradní heslo
   z proměnné už nemá platit jako běžné).

## C) Zmizelo všechno včetně nočních otisků

Zbývá kopie na Disku Google ve složce **_Zaloha Netlify DB**
(`otisk_RRRR-MM-DD.json.gz`, starší `otisk_…json`) nebo soubor stažený přes
„Stáhnout zálohu" či odlitý na Disk (`zaloha_online_*.json`). Komprimovaný
`.json.gz` se vybírá stejně jako `.json` — aplikace ho sama rozbalí.

1. Přihlášení náhradním heslem jako v B).
2. Obnovit ze zálohy… → zdroj **stažený soubor** → vyberte poslední
   stažený soubor → režim **doplnit** → Zobrazit náhled → Obnovit databázi.
3. Vrátí se zakázky, ceník, firemní údaje, šablony a nastavení zobrazení.
4. **Účty se ze souboru neobnoví** — soubor záměrně nenese otisky hesel
   (kdo by ho našel, nesmí z něj hádat hesla). Administrátor obchodníkům
   založí účty znovu (Nastavení → Uživatelé) a předá jim nová hesla.

## D) Záloha nevzniká (přehled „Zálohy databáze: zatím žádná")

1. Nastavení → Databáze → řádek **Poslední pokus o zálohu**: hotovo /
   rozpracováno (kolik záznamů z kolika) / chyba s důvodem.
2. **Zálohovat teď** — aplikace pokračuje sama, dokud otisk není celý
   (u ~800 zakázek desítky vteřin, víc požadavků za sebou). Okno nechte otevřené.
3. Netlify → Logs → Functions → `zaloha_nocni`: v noci 2:00–3:45 UTC má být
   řádek `otisk <datum> rozpracován — X/Y záznamů …` (pokračuje další běh)
   a nakonec `otisk <datum> — … ms, … kB (uloženo gzip … kB), … zakázek` a řádek retence
   (`retence smazala N otisků: …`; když toho je hodně — první noc po v26.10.9 —
   `retence pokračuje v dalším běhu — zbývá N otisků` a další běh téže noci dokončí).
   „Task timed out" u nového kódu znamená, že jeden krok nestihl 30 s — postup
   se neztratí, další běh naváže; opakuje-li se každou noc, ozvěte se vývoji.
4. U funkce musí být v Netlify značka **Scheduled** s rozvrhem `*/15 2-3 * * *`.

## Zkouška nanečisto

- **Automaticky** při každém nahrání na test: `netlify/test_obnova_nanecisto.mjs`
  projde případy B) a C) nad paměťovou databází (20 kontrol);
  `netlify/test_zalohy_objem.mjs` (#522) totéž při objemu ostrého provozu
  (900 zakázek, ~20 MB, simulovaný limit funkce): otisk po krocích, přerušení,
  hlášení chyby, stažení po stránkách, kopie na Disk a obnova po částech;
  `netlify/test_z2_retence.mjs` a `src/test_z2_disk_retence.js` (#523) přesný
  výběr mazaných záloh v Netlify i na Disku, komprese a obnova z `.json.gz`.
- **Ručně jednou za čtvrt roku** na testovacím webu (ne na ostrém):
  Nastavení → Databáze → Obnovit ze zálohy… → poslední noční otisk →
  **jen Zobrazit náhled**. Počty zakázek a verze ceníku v náhledu mají odpovídat
  tomu, co v aplikaci vidíte. Nic se nezapisuje.

## Kontakty a přístupy, které jsou k obnově potřeba

- přístup do Netlify (proměnné `ADMIN_EMAIL`, `ADMIN_INIT_HESLO`, Blobs),
- poslední kopie na Disku Google (složka _Zaloha Netlify DB) nebo stažená záloha (počítač administrátora).
