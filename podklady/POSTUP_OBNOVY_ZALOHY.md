# Postup obnovy databáze ze zálohy — pro případ nouze

> Sepsáno 24. 9. 2026 (#152, 2. část). Každý krok je ověřený automatickou
> zkouškou `netlify/test_obnova_nanecisto.mjs`, která simuluje úplnou havárii
> a běží při každé kontrole před nahráním (`nastroje/pred_pushem.sh`). Když
> se postup a aplikace rozejdou, zkouška spadne dřív, než se na to přijde
> v nouzi.

## Co se zálohuje a kde to leží

| Záloha | Kde | Co obsahuje | Kdy vzniká |
|---|---|---|---|
| **Noční otisk** | Netlify Blobs, úložiště `zalohy`, klíč = datum | celá databáze **včetně účtů a otisků hesel** | každou noc ve 2:00 UTC sám (funkce `zaloha_nocni`) |
| **Otisk při přihlášení** | totéž | totéž | administrátor se přihlásí a dnešní otisk ještě není |
| **Otisk před obnovou** | totéž, klíč `…-pred-obnovou` | stav těsně před každou obnovou | automaticky při obnově |
| **Stažená záloha** | u vás v počítači / na Disku (tlačítko „Stáhnout zálohu", „Odlít zálohu do složky") | zakázky, ceník, firma, šablony, matice — **účty bez hesel** | ručně |

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

Zbývá soubor stažený přes „Stáhnout zálohu" nebo odlitý na Disk
(`zaloha_online_*.json`).

1. Přihlášení náhradním heslem jako v B).
2. Obnovit ze zálohy… → zdroj **stažený soubor** → vyberte poslední
   stažený soubor → režim **doplnit** → Zobrazit náhled → Obnovit databázi.
3. Vrátí se zakázky, ceník, firemní údaje, šablony a nastavení zobrazení.
4. **Účty se ze souboru neobnoví** — soubor záměrně nenese otisky hesel
   (kdo by ho našel, nesmí z něj hádat hesla). Administrátor obchodníkům
   založí účty znovu (Nastavení → Uživatelé) a předá jim nová hesla.

## Zkouška nanečisto

- **Automaticky** při každém nahrání na test: `netlify/test_obnova_nanecisto.mjs`
  projde případy B) a C) nad paměťovou databází (20 kontrol).
- **Ručně jednou za čtvrt roku** na testovacím webu (ne na ostrém):
  Nastavení → Databáze → Obnovit ze zálohy… → poslední noční otisk →
  **jen Zobrazit náhled**. Počty zakázek a verze ceníku v náhledu mají odpovídat
  tomu, co v aplikaci vidíte. Nic se nezapisuje.

## Kontakty a přístupy, které jsou k obnově potřeba

- přístup do Netlify (proměnné `ADMIN_EMAIL`, `ADMIN_INIT_HESLO`, Blobs),
- poslední stažená záloha (Disk / počítač administrátora).
