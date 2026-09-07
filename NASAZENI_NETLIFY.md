# Nasazení na Netlify (engscalc.netlify.app) — krok za krokem

Netlify neprovozuje trvale běžící server. Funguje to tak, že si při každém
nasazení SÁM sestaví web z GitHub repozitáře (spustí `python3 build.py` nad
vynulovanými zdrojáky — žádná ceníková hodnota v repozitáři není a není ani
ve výsledném webu) a adresy `/api/…` obsluhují serverové funkce ze složky
`netlify/functions`. Vše je připravené v repozitáři: `netlify.toml`, funkce
(`/api/zdravi`, `/api/vypocet` a od v4.8.1 celá online databáze) a
`package.json` se závislostí `@netlify/blobs` (Netlify si ji nainstaluje sám).

## Dva weby, dva repozitáře (7. 9. 2026)

Tenhle repozitář (`vendljar/kalkulator-next-gen-engcalc`) nasazuje web
**engscalc.netlify.app** (Netlify projekt `engscalc`, tým `vendl-jaroslav`).
Sesterský repozitář `vendljar/kalkulator-next-gen` patří webu
schaftscalc.netlify.app. Kód je společný a **žádnou adresu nemá zapsanou
natvrdo**: texty v aplikaci si ji berou z adresy stránky, záloha si do pole
`zdroj` zapisuje skutečný web, ze kterého vznikla, a kontrola původu
požadavku porovnává hlavičky Origin a Host. (Do 7. 9. 2026 byla doména
schaftscalc v kódu napevno, takže zálohy z engscalc tvrdily, že jsou odjinud,
a nadpis karty Online databáze ukazoval cizí adresu.)

## Propojení (jednorázově, ~5 minut)

1. Na netlify.com otevři svůj tým → **Add new project → Import an existing
   project → GitHub** → povol Netlify přístup a vyber repozitář
   `vendljar/kalkulator-next-gen-engcalc`.
2. Netlify si přečte `netlify.toml`, takže **Build command** (`python3 build.py`)
   i **Publish directory** (`dist`) budou předvyplněné — nic neměň, jen
   **Deploy**. (Kdyby se build command nepředvyplnil, zadej ho ručně.)
3. V **Project configuration → Project details → Change project name** nastav
   `engscalc`, ať adresa je engscalc.netlify.app (pokud už projekt s tímhle
   jménem máš založený, propoj repozitář v něm).
4. Kontrola: `https://engscalc.netlify.app/api/zdravi` musí odpovědět
   `{ ok: true, verze: …, beh: "netlify" }` a kořen webu musí otevřít
   přihlašovací obrazovku kalkulačky.

## Proměnné prostředí

Hodnoty si nastavuješ VÝHRADNĚ sám v Netlify (**Project configuration →
Environment variables → Add a variable**); nikdy se neposílají konverzací ani
nepatří do repozitáře. Do funkcí se propíšou **až dalším nasazením**: buď
nahraj novou dávku, nebo dej **Deploys → Trigger deploy → Deploy project**
(tlačítko je vpravo nad seznamem nasazení).

| Proměnná | Povinná | K čemu |
|---|---|---|
| `TAJEMSTVI_RELACE` | ano | podpis přihlašovacích relací; libovolný náhodný text, **aspoň 16 znaků** |
| `ADMIN_INIT_HESLO` | jednorázově | počáteční heslo administrátora (aspoň 8 znaků); po prvním přihlášení smazat |
| `PIPEDRIVE_TOKEN` | jen pro CRM | osobní API token Pipedrive (Nastavení → Osobní předvolby → API) |
| `PIPEDRIVE_DOMENA` | jen pro CRM | doména firmy, např. `mojefirma` nebo `mojefirma.pipedrive.com` |
| `PROSTREDI` | jen testovací web | `test` → červený pruh „TESTOVACÍ PROSTŘEDÍ" na každé záložce i v PDF |
| `PROSTREDI_POPIS` | ne | nepovinný text do pruhu |

`TAJEMSTVI_RELACE`: kdo ho zná, mohl by se vydávat za přihlášeného — nikomu
ho nesděluj a nikam nezapisuj. Náhodnou hodnotu vyrobíš třeba v PowerShellu:

    powershell -NoProfile -Command "[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')"

Pipedrive: token dává přístup ke VŠEM datům uživatele, proto žije jen
v proměnné prostředí a nikdy nejde do prohlížeče (`netlify/lib/pipedrive.mjs`).
Bez obou proměnných napojení na CRM neběží (funkce `/api/pd_*` to ohlásí);
zbytek aplikace tím není dotčený.

## Přihlášení a založení administrátora

1. Nastav `TAJEMSTVI_RELACE` a `ADMIN_INIT_HESLO`, dej **Trigger deploy**.
2. Otevři web. **Přihlašovací obrazovka je to první, co se ukáže** — celá
   aplikace je za přihlášením. (Dřívější cesta „záložka Zakázka → karta
   Online databáze" už neplatí.) Přihlas se jako
   `vendl.jaroslav@engineers-cz.cz` — je to konstanta `ADMIN_EMAIL`
   v `netlify/lib/sdilene.mjs`, jiná adresa první účet nezaloží — s heslem
   z `ADMIN_INIT_HESLO`. **Prvním přihlášením se účet založí** (heslo se
   uloží jen jako otisk).
3. Potom `ADMIN_INIT_HESLO` z Netlify **smaž** — dokud tam je, leží
   v konfiguraci platné heslo administrátora. Redeploy kvůli tomu nutný není.
   Heslo si změníš v aplikaci v **Nastavení → Uživatelé** („Nové heslo…"
   u svého účtu).
4. Uvnitř aplikace je stav online databáze, přihlášení a zálohy
   v **Nastavení → Databáze**; v horní liště je tlačítko „Přihlásit se".
5. První naplnění: připoj složku `_DB`, na záložce Ceník dej **„Zveřejnit
   ceník této varianty online"** a zakázky ulož tlačítkem **„Uložit online"**.
   Do té doby aplikace hlásí „Ceník není nahraný a firemní údaje nejsou
   skutečné" — to je čekaný stav prázdné databáze.

Bez `TAJEMSTVI_RELACE` skončí přihlášení chybou, i když je heslo správné; bez
`ADMIN_INIT_HESLO` se nemá jak založit první účet (databáze nového webu je
prázdná).

## Co funguje

- Celá kalkulačka v prohlížeči, odkudkoli a z jakéhokoli zařízení.
- Online databáze: zakázky i platný ceník na serveru po přihlášení; správa
  účtů (role Obchodník / Vedoucí / Administrátor, reset hesla administrátorem).
- Zálohy: denní odlévání do připojené složky na Disku Google + noční otisk
  na serveru (plánovaná funkce ve 2:00 UTC). Stažená záloha nese v poli
  `zdroj` adresu webu, ze kterého vznikla — při obnově se pozná, jestli je
  z ostrého, nebo z testovacího webu.
- **Obnova ze zálohy** (7. 9. 2026): Nastavení → Databáze → karta Online
  databáze → **Obnovit ze zálohy…** (jen administrátor). Zdroj = stažený
  soubor nebo serverový otisk podle dne; režim „doplnit" (jen chybějící)
  nebo „přepsat"; volitelně po částech. Nejdřív náhled (nic nezapíše),
  teprve pak obnova s potvrzením. Před obnovou se pořídí otisk současného
  stavu (`<den>-pred-obnovou`), uzamčené nabídky se nepřepíšou, nic se
  nemaže. Účty jdou obnovit jen z otisku (soubor nenese otisky hesel).
- Přechodné období: dokud je připojená složka `_DB`, má přednost — všechno
  se chová jako dosud. Bez složky vládne online databáze.
- Poznámka: pokud je web zaheslovaný ochranou Netlify (odpovídá 401), vypni
  ji v Project configuration → Site protection — aplikace už má vlastní
  přihlašování.

## Testovací web s vlastní databází (20. 8. 2026)

Netlify Blobs jsou vázané na konkrétní projekt, takže **druhý web má vlastní
databázi automaticky** — zakázky, ceníky, účty i matice zobrazení jsou dvě
oddělené sady. Pro testovací kalkulačku tedy stačí:

0. Tenhle repozitář zatím větev `test` **nemá** (stav 7. 9. 2026) — nejdřív
   ji založ z `main` a nahraj na GitHub, teprve pak ji jde v Netlify vybrat.
1. Netlify → **Add new project → Import an existing project** → týž repozitář;
   v *Build & deploy → Branches* nastav *Production branch* na `test`.
2. Environment variables toho nového projektu:
   - `TAJEMSTVI_RELACE` — **jiné než na ostrém webu** (jinak by cookie z testu
     platila i v ostré aplikaci),
   - `ADMIN_INIT_HESLO` — první přihlášení zakládá účet; jde jen o adresu
     `vendl.jaroslav@engineers-cz.cz` (konstanta `ADMIN_EMAIL`),
   - `PROSTREDI=test` — aplikace pak na každé záložce ukáže **červený pruh
     „TESTOVACÍ PROSTŘEDÍ"**; pruh se tiskne i do PDF, aby se dokument z testu
     nedal splést s ostrým,
   - `PROSTREDI_POPIS` — nepovinný text do pruhu.
3. **Deploys → Trigger deploy** — proměnné se do funkcí propíšou až nasazením.

Odpovídá-li web 401, je zapnutá ochrana Netlify — vypni ji v *Site
protection*, aplikace má vlastní přihlašování.

## Každá další verze

Nahraješ dávky na GitHub (jako dosud) → Netlify si změny sám stáhne,
sestaví a nasadí. Žádný další ruční krok. Číslo verze se při serverovém
sestavení **přebírá** z `verze.txt` a nezvyšuje — co je v gitu, to hlásí
web (`/api/zdravi`) i hlavička aplikace.
