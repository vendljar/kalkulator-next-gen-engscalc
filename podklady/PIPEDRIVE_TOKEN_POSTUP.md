# Pipedrive — kontrolní seznam pro vložení tokenu (#536, 27. 10. 2026)

Pro J. V. Token nikdy neposílejte do konverzace, e-mailu ani do repozitáře —
vkládá se jen do proměnných prostředí v Netlify. Postup platí pro
**testovací web testengscalc** (větev `test`). Na ostrý web (schaftscalc)
se token nevkládá, dokud neproběhne zkušební zápis (#510) a nerozhodne se
#115.

## 0. Než začnete

- [ ] Rozhodnout, **čí token**. Token Pipedrive je osobní a dává přístup ke
      **všem datům** toho uživatele. Doporučení (#113): samostatný uživatel
      pro integraci (např. „Kalkulátor – integrace"), ne osobní účet — jeho
      přegenerování pak nerozbije jiná napojení a v historii dealů je vidět,
      co zapsala kalkulačka.
- [ ] Ověřit, že ten uživatel **vidí všechny dealy**, organizace a osoby,
      které má kalkulačka číst, a má právo číst seznam uživatelů
      (`users:read` — pole „Nabídku vypracoval" a „Hlavní projektant").
- [ ] Před prvním **zápisem** (ne čtením) potvrzení integrátora, co v Make
      reaguje na změnu dealu (upomínka `PIPEDRIVE_UPOMINKA_INTEGRATOR.md`,
      otázka 4). Samotné čtení nic nespouští.

## 1. Kde token vytvořit

Pipedrive → vpravo nahoře účet → **Osobní předvolby → API** → zkopírovat
„Váš osobní API token". (Tlačítko „Vygenerovat nový" starý token okamžitě
zneplatní — viz bod 5.)

## 2. Kam ho vložit (jen testovací web)

Netlify → projekt **testengscalc** → **Project configuration → Environment
variables → Add a variable**:

| proměnná | hodnota | poznámka |
|---|---|---|
| `PIPEDRIVE_TOKEN` | token z bodu 1 | zaškrtnout „Contains secret values"; rozsah (scope) aspoň **Functions** |
| `PIPEDRIVE_DOMENA` | doména firmy v Pipedrive, např. `mojefirma` | stačí první část adresy `mojefirma.pipedrive.com`; aplikace snese i celou adresu |
| `PIPEDRIVE_SIMULATOR` | **smazat**, pokud je nastavená | zapnutý simulátor má přednost i před tokenem — s ním by se do Pipedrive nešlo |

Kontrola, že jste ve správném projektu: v témže projektu musí být
`PROSTREDI=test` (červený pruh „TESTOVACÍ PROSTŘEDÍ").

Pak **Deploys → Trigger deploy → Deploy project** — proměnné se do funkcí
propíšou až novým nasazením.

## 3. Jak ověřit, že napojení funguje (bez prozrazení tokenu)

Token se nikde nevypisuje — ani v odpovědích serveru, ani v aplikaci.

1. **`https://testengscalc.netlify.app/api/zdravi`** — musí odpovědět
   `"ok": true` a `"prostredi": "test"`. (Tahle adresa o Pipedrive záměrně nic
   neříká: je veřejná, takže neprozrazuje ani to, zda je token nastavený.)
2. Přihlásit se jako administrátor → **Nastavení → Mapa polí CRM** →
   **Obnovit z CRM**:
   - souhrn polí se načte a nahoře **není** červený pruh „SIMULÁTOR
     PIPEDRIVE" → aplikace mluví se skutečným Pipedrive;
   - „Pipedrive odmítl přístupový token…" → špatný nebo přegenerovaný token
     (bod 5);
   - „Napojení na Pipedrive zatím není nastavené" → chybí jedna z proměnných
     nebo neproběhlo nové nasazení (bod 2).
   Obnovení mapy stojí 20 tokenů denního rozpočtu Pipedrive.
3. Očekávaný stav mapy: spárované všechny pole kromě **„Platební kalendář
   SoD PROJ"** (integrátor ho ještě nezaložil, #512). Jiné „chybí v CRM" nebo
   „jiný typ" = otázka pro integrátora.
4. Krycí list zakázky → karta **„Co by se zapsalo do Pipedrive"** →
   „Ukázat, co by se zapsalo": režim má říkat „proti skutečnému Pipedrive
   (jen čtení)". U zakázky s vyplněným číslem obchodního případu
   (Controlling → „Pipedrive deal id") ukáže i sloupec „Dnes v Pipedrive".
   **Nic se nezapisuje** — funkce jen čte.

## 4. Co se stane po zapnutí

Na testovacím webu, s tokenem (stav kódu 27. 10. 2026):

- **Čtení** (seznam a detail dealů, mapa polí, stav dealu u zakázky,
  náhled zápisu) začne chodit do skutečného Pipedrive — jen čtení, se
  stropem na uživatele a s krátkou cache, aby se nevyčerpal denní rozpočet.
- Stav dealu se začne ukazovat v hlavičce zakázek, které mají vyplněné
  číslo obchodního případu.
- **Zápis do Pipedrive v aplikaci není** — tlačítko pro zápis (#115) zatím
  neexistuje. Náhled „Co by se zapsalo" nic neodesílá.
- Testovací web má vlastní databázi zakázek, ale **Pipedrive je jeden** —
  co testovací web přečte, je skutečné CRM firmy.
- Kdo smí číst: administrátor vždy, ostatní podle práva „Čtení obchodních
  případů z Pipedrive" (Nastavení → Zobrazení, dnes výchozí pro všechny).

## 5. Jak token zrušit nebo vyměnit

- **Vyměnit** (únik, odchod člověka, pravidelná výměna): v Pipedrive
  Osobní předvolby → API → **Vygenerovat nový** (starý okamžitě přestane
  platit) → v Netlify přepsat `PIPEDRIVE_TOKEN` → **Trigger deploy** →
  ověřit bodem 3.2.
- **Vypnout napojení** bez rušení tokenu: v Netlify smazat
  `PIPEDRIVE_TOKEN` (nebo `PIPEDRIVE_DOMENA`) → Trigger deploy. Aplikace pak
  slušně hlásí „Napojení na Pipedrive zatím není nastavené".
- **Zrušit token úplně**: vygenerovat nový v Pipedrive a nikam ho nevložit.
- Mezi vygenerováním nového tokenu a novým nasazením hlásí aplikace
  „Pipedrive odmítl přístupový token" (bez odhlášení uživatelů) — to je
  v pořádku, zmizí po nasazení.

## 6. Simulátor místo tokenu (vývoj a zkoušky)

Kde token ještě není, jde napojení zkoušet se smyšlenými daty:

| proměnná | hodnota | účinek |
|---|---|---|
| `PIPEDRIVE_SIMULATOR` | `1` | místo Pipedrive odpovídá simulátor (230 smyšlených dealů, organizace, osoby, uživatelé, pole podle dohodnuté tabulky) |
| `PIPEDRIVE_SIMULATOR_SCENAR` | `token` / `limit` / `limit2` / `vypadek` | vyrobí chybu 401 / 429 / dvakrát 429 / 500 |
| `PIPEDRIVE_SIMULATOR_ROZPOCET` | číslo | denní rozpočet tokenů simulátoru (výchozí 30 000) |

- Simulátor se **odmítne zapnout na ostrém webu**: nasazení z větve `main`,
  web schaftscalc, nebo Netlify bez `PROSTREDI=test`. Odmítnutí vidí
  administrátor v Nastavení → Mapa polí CRM.
- Zapnutý simulátor má přednost i před tokenem — s ním nejde nic do
  skutečného CRM. Aplikace to hlásí červeným pruhem „SIMULÁTOR PIPEDRIVE".
- Kód: `netlify/lib/pipedrive_simulator.mjs`, test
  `netlify/test_pd_simulator.mjs`.
