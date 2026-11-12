# Prompt K40c — vazba z webhooku, ARES a oprava firmy v Pipedrive (v3, 11. 11. 2026)

**Nahrazuje bod 6 promptu v1 a oddíl G dodatku v2** (`PROMPT_K40_OPRAVY.md`, `PROMPT_K40_OPRAVY_v2.md`). Společná
pravidla z v1 a z oddílů A a J dodatku v2 platí dál (větev, zlaté sady, mutace, příručky, konec dávky).
Podklad k chování: prototyp `podklady/k40_w1_prototyp/` (https://claude.ai/artifact/NpHRKtzJC8CqzmoNP3JxNV).
Podle rozhodnutí J. V. z 11. 11. 2026, jak je předala koordinace (programování schváleno); spouští koordinace
**po sloučení K40b** zprávou „SPUSŤ K40c nad <SHA>“.

- **Větev:** `claude/k40c-webhook` nad SHA od koordinace. **Roadmapa #581** (souhrnná #567), **meze B208–B209**
  a úprava oddílu „PW #553“ v `BEZPECNOST_MEZE.md`. Před zápisem ověř, že čísla jsou volná.
- **Krok 0:** řádky hledej podle jmen funkcí. Místa nad `c664c9e`: `netlify/functions/pd_webhook.mjs` (kroky 4–7),
  `netlify/lib/pd_webhook.mjs` (`PD_WEBHOOK_POLE`, `pdWebhookPouzij`, `pdWebhookOdkaz`), `netlify/lib/pd_mapa.mjs`
  (`pdDealNaNase`, pole organizace — dnes jen IČ, v účtu typu číslo), `src/ares.js` (`aresUrl`, `aresZpracuj`,
  `ARES_POLE`, `aresRozdily`), `src/ui/ares_ui.js`, `src/controlling.js` (`ctrlPdDealKontrola`),
  `src/zamek.js` (`zamekZakCestaZmrazena`), `netlify/lib/zakazka_kontrola.mjs`, `netlify/lib/pipedrive_simulator.mjs`.

## Rozhodnutí J. V. (11. 11. 2026)

1. **Webhook se chová jako dnes:** hned doplní hlavičku a krycí list a zapíše odkaz do dealu. Varianta „jen vazba,
   údaje až po potvrzení“ se nedělá.
2. **Zrušení vazby je jen pojistka** proti navázání na cizí deal (překlep v čísle nabídky): deal je u kalkulace
   odmítnutý, další webhook dostane 409 a **náš** odkaz v dealu se smaže. Doplněné údaje se nevracejí.
3. **Rušit nebo měnit vazbu smí autor zakázky a administrátor.** Jiný obchodník jen nahlásí „Vazba je chybná“.
   Roli ověřuje server.
4. **ARES:** firma (zákazník, sídlo, IČO, DIČ) jde do hlavičky z ARES podle IČO z dealu, kontakt a termín z dealu.
5. **„Opravit firmu v Pipedrive“:** tlačítko pro autora a administrátora, zápis jen po potvrzení, nikdy automaticky.
6. **Doplnění 11. 11. 15:35 (předala koordinace):** deal zakázky smí měnit autor i administrátor — autor jen
   u zakázek, které sám založil; u zakázek založených webhookem dál jen administrátor. Když pole DIČ u organizace
   v Pipedrive není, oprava firmy ho **přeskočí a oznámí to v dialogu**. Programování podle tohoto promptu
   a prototypu v4 je schválené.

## 1. Vazba, upozornění a pojistka

- **Při navázání existující kalkulace webhookem** (dnes `if (bezVazby) zak.pdDealId = dealId`):
  - zapiš do protokolu zakázky záznam `kdo: 'pipedrive-webhook'` (deal, číslo nabídky, která pole se doplnila, výsledek
    ARES); jen názvy polí, žádné kontakty;
  - ulož `zak.pdVazbaWebhook = { deal, kdy, cislo, stav: 'ceka' }`.
- **Upozornění při otevření**, dokud je `stav: 'ceka'` (i u zamčené, prodané a jen-ke-čtení zakázky): kdy a na který
  deal se kalkulace navázala, která pole se doplnila, výsledek ARES a rozdíly proti Pipedrive.
  - **„V pořádku“** — každý s právem ukládat; `stav: 'potvrzeno'`, záznam v protokolu.
  - **„Zrušit vazbu“** — jen **autor zakázky** (`zak.autor` z **uložené** verze = e-mail relace) **nebo administrátor**;
    ostatní 403. Smaže `pdDealId`, `pdStav`, `pdZadani` a index `pd_webhook/deal:<id>`, přepíše rejstřík, zapíše
    `stav: 'zruseno'`, přidá deal do `zak.pdDealyOdmitnute` (strop 50) a zapíše protokol včetně seznamu polí, která
    po webhooku zůstala. **Hodnoty hlavičky ani krycího listu nevrací.**
  - **Odkaz v dealu:** po zrušení server pole „Odkaz na kalkulaci“ vymaže, **jen když v něm je odkaz na tuto
    kalkulaci** (porovnej s `pdWebhookOdkaz`). Jiná hodnota zůstane. Chyba Pipedrive zrušení nezastaví — vrátí varování
    a zapíše se do protokolu.
  - **„Vazba je chybná“** — ostatní uživatelé: záznam v protokolu a příznak `pdVazbaWebhook.nahlaseno = { kdo, kdy }`
    (z relace). Autor a administrátor ho vidí v upozornění a v Přehledu cenových nabídek (příznak do rejstříku).
    E-mail se neposílá.
- **Odmítnutý deal:** webhook kontroluje `pdDealyOdmitnute` **před** jakýmkoli zápisem (zakázka, index, PATCH dealu,
  dotaz do ARES) → 409 s vysvětlením, zakázka beze změny.
- **Změna vazby ručně** (`ctrlPdDealKontrola`, pravidlo C4): nově smí i autor zakázky, ne jen administrátor.
  Autor jen u zakázek, které sám založil (`zak.autor` z uložené verze = e-mail relace); u zakázky založené
  webhookem (autor `pipedrive-webhook`) dál jen administrátor. Potvrzeno J. V. 11. 11.
- **Pole psaná jen serverem:** `pdVazbaWebhook` a `pdDealyOdmitnute` se při běžném uložení berou z uložené verze
  (vzor `uloZamekRazitkaDrz` / interní poznámky), mění je jen výslovná akce. Obnova ze souboru je nepřebírá.
  Zamčená varianta se nemění (vazba je v hlavičce zakázky).

## 2. ARES na serveru

**Pravidlo přepisu (rozhodnutí poradce, zdůvodnění níž):** zdroj hodnot pro `objednatel`, `adresaObjednatele`, `ico`
a `dic` je ARES; pravidlo, **kdy** se pole smí zapsat, zůstává dnešní pravidlo webhooku (`smi()` v `pdWebhookPouzij`):
pole je prázdné, **nebo** nese hodnotu, kterou tam naposledy zapsal webhook (otisk v `pdZadani.otisk`).

- Důsledek: u nové vazby ARES přepíše i to, co dřív webhook vyplnil z dealu (otisk sedí). Pole, které člověk po
  uložení upravil, se nepřepíše nikdy (otisk nesedí) — rozdíl se jen ukáže v upozornění a jde převzít dnešním
  tlačítkem „Najít firmu v ARES“ (potvrzení člověkem).
- Proč ne „ARES přepíše vše“: u cizí kalkulace (překlep CN) by webhook přepsal ručně zadaného zákazníka cizí firmou
  a zrušení vazby by to nevrátilo. Proč ne „jen prázdná“: oprava v ARES nebo v dealu by se do kalkulace už nedostala.
- `PD_WEBHOOK_POLE` se tím rozšiřuje o `adresaObjednatele` a `dic` (otisky i pro ně). `kontakt`, `adresa` (stavby),
  `nazevAkce` a termín předání dál z dealu.
- **Zmrazená hlavička** (`zamekZakCestaZmrazena`, po tisku SoD) a zakázka se zamčenou variantou: webhook hlavičku
  nemění jako dnes — ARES se pak nevolá vůbec (rozdíl by neměl kam jít).

**Dotaz:**
- IČO se bere z organizace dealu (`mapaOrganizace.ico`; v Pipedrive je to číslo — doplň úvodní nuly jako dnes).
  Nejdřív kontrolní číslice (`icoPlatne` / `aresUrl`); neplatné IČO se do ARES neposílá.
- Nový modul `netlify/lib/ares_server.mjs`: `aresNacti(ico, { fetch, timeoutMs })`. Pevná adresa z `ARES_ZAKLAD`
  (IČO jen `\d{8}` po normalizaci — nic z dealu se do URL jinak nedostane), **jeden pokus, časový limit 3 s**
  (`AbortController`), bez přesměrování na jiný host, strop velikosti odpovědi (např. 200 kB), JSON přes `try`.
  `fetch` se předává parametrem — testy nikdy nevolají síť.
- Volá se **jen** při nové vazbě nebo když se IČO dealu změnilo proti otisku — ne při každém doručení. Celý webhook
  se musí vejít do limitu funkce Netlify i s výpadkem ARES (změř v testu s pomalým mockem).
- Serverová funkce si kvůli `ares.js` nesmí tahat celé jádro — malý `.cjs` obal v `netlify/lib/` (pravidlo
  z `jadro_moduly.cjs`, hlídá `netlify/test_funkce.mjs`).

**Odpověď ARES je nedůvěryhodný vstup:**
- přes `aresZpracuj`; vrácené `ico` musí být shodné s dotazovaným, jinak „nenalezeno“;
- jen řetězce, ořez, odstranění řídicích znaků, délkové stropy (název 200, adresa 300), DIČ jen tvar `^[A-Z]{2}[0-9A-Z]{2,12}$`,
  jinak prázdné; prázdná hodnota z ARES nikdy nic nemaže (jako `aresRozdily`);
- do zakázky jdou jen čtyři pole z `ARES_POLE`; v UI vše přes `esc`, v dialogu přes `escJs`; do `overit_xss.mjs`
  otrávený název firmy z ARES i z Pipedrive;
- zaniklý subjekt (`datumZaniku`) = údaje se převezmou a upozornění to řekne.

**Když ARES nepomůže** (neplatné IČO, 404, časový limit, chyba, nesmysl v odpovědi): webhook **neselže**, použije
údaje z dealu jako dnes, do odpovědi a protokolu dá varování a `pdVazbaWebhook.ares = 'neplatne' | 'nenalezeno' | 'vypadek'`.
Upozornění v aplikaci nabídne ověření tlačítkem „Najít firmu v ARES“.

**Rozdíly ARES × Pipedrive** (název, adresa, DIČ organizace): spočítá server, uloží jen **názvy lišících se polí**
do `pdVazbaWebhook.aresRozdily`, zapíše do protokolu a ukáže v upozornění.

## 3. „Opravit firmu v Pipedrive“

- Tlačítko v upozornění (a u řádku Stav Pipedrive), jen když je vazba živá a ARES při posledním ověření odpověděl.
  Vidí ho autor zakázky a administrátor; server ověří totéž z relace a uložené zakázky a navíc právo Pipedrive
  z matice (B80). Ostatní 403.
- **Dva kroky, obojí na serveru** (nová funkce, např. `netlify/functions/pd_organizace.mjs`):
  1. `nahled`: server znovu načte deal, jeho organizaci a ARES (klientem poslaným hodnotám nevěří) a vrátí rozdíly
     „v Pipedrive je × podle ARES bude“ jen pro pole, která umí zapsat: název, adresa a ta vlastní pole organizace,
     která mapa polí zná (IČ; DIČ jen když v účtu takové pole je — **pole se nikdy nezakládá**). Chybí-li pole DIČ,
     náhled to řekne větou v dialogu („DIČ se do Pipedrive nezapíše — organizace takové pole nemá“) a zápis ho přeskočí
     (rozhodnutí J. V. 11. 11.).
  2. `zapis`: po potvrzení v dialogu aplikace PATCH `/api/v2/organizations/<id>` **jen změněných polí**; server si
     rozdíly spočítá znovu a zapíše jen to, co klient potvrdil a co se pořád liší. Organizace musí patřit dealu
     navázanému na tuto zakázku.
- **Shoda IČO (slučitelnost s budoucí funkcí víc zákazníků, poradce VZ, `claude/vz-navrh` e0e007d):** náhled i zápis
  server povolí **jen když IČO organizace dealu = IČO hlavičky zakázky** (obě po normalizaci, s doplněním úvodních nul;
  hlavička ze **uložené** verze zakázky). Jinak **409 s vysvětlením** a nic se nečte z ARES ani nezapisuje. Totéž platí,
  když organizace IČ nemá, hlavička IČO nemá nebo některé z nich neprojde kontrolní číslicí: rozdílné nebo
  neověřitelné IČO = nezapisovat. Tlačítko v aplikaci je pak zhasnuté a ukáže důvod (klient si shodu spočítá stejně,
  rozhoduje server). Důsledek: oprava organizace nikdy nezmění IČ organizace — zapisuje jen název, adresu a DIČ.
- Nikdy automaticky, nikdy z webhooku. Záznam do protokolu (kdo, která pole). Po zápisu smaž cache detailu dealu.
- Počítá se do denního rozpočtu Pipedrive; opakovaný klik bez rozdílů nic neposílá.
- **Testy jen proti `pipedrive_simulator.mjs`** (doplnit PATCH organizace) — do ostrého Pipedrive ani do ARES se
  z testů nesahá.

## 4. Meze (`BEZPECNOST_MEZE.md`)

- **Oddíl PW #553 — upravit:** věta „zápis do CRM je jediný (odkaz)“ už neplatí. Nově: odkaz (webhook), vymazání
  našeho odkazu (zrušení vazby) a oprava organizace (jen na výslovný pokyn autora nebo administrátora). Doplnit popis
  vazby, upozornění, odmítnutých dealů a toho, že zrušení doplněné údaje nevrací (rozhodnutí J. V. 11. 11.).
- **B208 — webhook volá ARES ze serveru:** pevná adresa, jen IČO s platnou kontrolní číslicí, limit 3 s, jeden pokus,
  strop odpovědi, odpověď jako nedůvěryhodný vstup; výpadek webhook neshodí; bez přihlášení jde vyvolat jen klíčem
  webhooku a nejvýš jednou na novou vazbu nebo změnu IČO.
- **B209 — zápis organizace do Pipedrive z kalkulátoru:** jen autor zakázky a administrátor s právem Pipedrive, jen
  po potvrzení, jen lišící se pole, hodnoty z ARES načtené serverem; kdo smí zakázku s dealem navázat, tím určuje,
  kterou organizaci jde opravit — proto kontrola, že organizace patří navázanému dealu, a že IČO organizace je
  shodné s IČO hlavičky zakázky (jinak 409; připraveno na víc zákazníků v zakázce).
- **CSP a síť:** hlavička CSP v `netlify.toml` platí pro prohlížeč a `connect-src` už `https://ares.gov.cz` má —
  **neměnit**. Dotaz ze serveru CSP neřídí; nová funkce nepotřebuje žádnou novou proměnnou prostředí ani klíč.
  `netlify/test_prava.mjs` (matice přístupu k funkcím, KLICEM_CHRANENE) doplň o novou funkci.

## 5. Testy a mutace

Každý nový test: doložit v commitu, že před opravou selže a po ní projde.

- **Vazba:** navázání existující kalkulace → protokol + `pdVazbaWebhook`; potvrzení; zrušení autorem a administrátorem
  200, jiným obchodníkem 403, podvržený autor v příchozích datech nepomůže; po zrušení zůstanou doplněná pole,
  zmizí `pdDealId`/`pdStav`/`pdZadani`/index, odkaz v dealu se smaže jen když je náš (test s cizí hodnotou);
  další webhook 409 a žádný zápis ani dotaz do ARES; „Vazba je chybná“ → protokol a příznak; podvržené
  `pdVazbaWebhook` / `pdDealyOdmitnute` od klienta se ignoruje; zamčená varianta beze změny; změna dealu autorem
  200, cizím obchodníkem 403.
- **ARES:** platné IČO → čtyři pole z ARES, kontakt z dealu; ručně upravené pole se nepřepíše a rozdíl je v odpovědi;
  pole dřív zapsané webhookem z dealu se přepíše hodnotou z ARES; neplatná kontrolní číslice → žádný dotaz;
  404, časový limit (mock, který neodpoví), 500, ne-JSON, odpověď s jiným IČO, přerostlá odpověď, řídicí znaky
  a HTML v názvu → webhook 200 s varováním a údaji z dealu; zmrazená hlavička → žádný dotaz, žádná změna;
  druhé doručení bez změny IČO → žádný dotaz (počítadlo volání mocku).
- **Oprava organizace:** náhled a zápis jen změněných polí; cizí role 403; bez práva Pipedrive 403; organizace,
  která nepatří dealu zakázky, 403; hodnoty poslané klientem se nepoužijí; druhý zápis bez rozdílů nic neposílá;
  chybějící pole DIČ v účtu se přeskočí. **Shoda IČO:** IČO organizace ≠ IČO hlavičky → náhled i zápis 409 a žádný
  dotaz do ARES ani PATCH (počítadla mocku); organizace bez IČ → 409; hlavička bez IČO → 409; IČO lišící se jen
  úvodními nulami nebo mezerami → projde; podvržené IČO hlavičky v požadavku nepomůže (bere se uložená verze).
- **Klient:** upozornění a tlačítka podle role, dialog s rozdíly, `overit_xss.mjs` s otrávenými názvy.
- **Mutace (server):** „vazba bez záznamu v protokolu“, „zrušení vazby kýmkoli“, „webhook naváže znovu po zrušení“,
  „odkaz v dealu se maže i cizí“, „ARES bez časového limitu“, „ARES přepíše ručně upravené pole“, „odpověď ARES
  s jiným IČO se přijme“, „oprava organizace bez kontroly role“, „oprava zapíše všechna pole“, „oprava bez kontroly,
  že organizace patří dealu“, „oprava bez kontroly shody IČO organizace a hlavičky“ (musí ji chytit náhled i zápis). Starší mutace #553 po zásahu zkontroluj (`--kontrola`).
- Zlaté sady (víc šachet, můstky) beze změny otisků — K40c do výpočtu nesahá.

## 6. Na konci vypiš

- co bylo při kroku 0 jinak, než čeká tento prompt (hlavně pole organizace v mapě Pipedrive a existence pole DIČ),
- soubor:řádek změn, výsledky sad a mutací,
- otevřené otázky pro J. V., pokud nějaké vzniknou. Dvě otázky z návrhu jsou rozhodnuté (rozhodnutí 6 nahoře):
  autor smí měnit deal u vlastních zakázek; chybějící pole DIČ se přeskočí a oznámí v dialogu.
