# Návod: automatická noční kopie zálohy na Disk Google (skript Apps Script, #577)

Pro J. V. — krok za krokem, jednou nastavit a dál to běží samo.

**Co to dělá:** každé ráno skript ve vašem Google účtu stáhne z kalkulátoru
poslední noční zálohu databáze (bez otisků hesel a bez podpisů — stejný obsah
jako dnešní kopie z prohlížeče), uloží ji do složky **„_Zaloha Netlify DB“**
jako `otisk_main_RRRR-MM-DD_HHMM.json.gz`, ověří velikost a kontrolní součet
SHA-256, ohlásí kopii serveru, zapíše `posledni_kopie_main.json` a staré kopie
uklidí do koše podle stejného pravidla jako aplikace (7 dní, nedělní 8 týdnů,
první v měsíci 6 měsíců; nejnovější nikdy; když nová záloha nese o víc než
10 % méně dat, nemaže nic a pošle e-mail). Bez prohlížeče, bez přihlášení,
bez klikání. Když se něco nepovede, přijde e-mail.

Tlačítko **Zkopírovat zálohu na Disk teď** v aplikaci zůstává jako záloha
záloh. Když skript kopii udělal, aplikace po přihlášení nic nekopíruje a nic
nehlásí; v Nastavení → Databáze uvidíte **„Poslední kopie na Disku: … (skript)“**.

> **Pozor — nejdřív nasazení.** Cesta `/api/zaloha_disk` existuje na webu až
> po nasazení této změny (větev `claude/as-zaloha-apps-script` sloučená do
> větve webu). Kroky 1–2 můžete udělat hned; krok 5 (první běh) až po nasazení.

---

## 1. Vyrobte token (tajný klíč) — pro každý web jiný

Token je dlouhé náhodné heslo, které zná jen Netlify a váš skript. **Nikdy ho
neposílejte do chatu, e-mailem ani do repozitáře.** Vyrobte ho na svém počítači
rovnou do schránky (na obrazovce se neukáže):

1. Otevřete **PowerShell** (Start → napište „PowerShell“ → Enter).
2. Vložte a spusťte (jeden řádek):

       $b = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b).TrimEnd('=').Replace('+','-').Replace('/','_') | Set-Clipboard

   Ve schránce je teď token o 64 znacích (písmena, číslice, `-`, `_`).
3. Hned ho vložte do Netlify (krok 2) a do skriptu (krok 4). Mezitím do
   schránky nic jiného nekopírujte. Až bude vložený na obou místech, schránku
   vyčistěte: `Set-Clipboard -Value ' '`.

Pro testovací web (`testengscalc`) vyrobte **druhý, jiný** token stejným postupem.

## 2. Nastavte token v Netlify (engscalc i testengscalc)

1. app.netlify.com → web **engscalc** → **Project configuration →
   Environment variables → Add a variable → Add a single variable**.
2. Key: `KNG_DISK_TOKEN`, Value: vložte token (Ctrl+V).
   Zaškrtněte **Contains secret values** (Netlify pak hodnotu nikomu neukáže),
   rozsah (Scopes) stačí **Functions**.
3. **Create variable**. Proměnná se do funkcí propíše až dalším nasazením:
   **Deploys → Trigger deploy → Deploy project**.
4. Totéž na webu **testengscalc** s druhým tokenem (je-li testovací web
   zapnutý ve skriptu — jinak ho vynechte).

Bez proměnné (nebo s tokenem kratším než 32 znaků) je cesta vypnutá a každý
požadavek dostane 403 — to je i způsob, jak kopii skriptem kdykoli vypnout.

## 3. Vložte skript na script.google.com

1. Přihlaste se do Google účtu, pod kterým je složka **„_Zaloha Netlify DB“**
   (stejný účet, do jehož Disku má kopie jít).
2. https://script.google.com → **Nový projekt**. Vlevo nahoře přejmenujte
   („Projekt bez názvu“) na **Kalkulátor – kopie zálohy na Disk**.
3. **Nastavení projektu** (ozubené kolo vlevo) → zaškrtněte **Zobrazit soubor
   manifestu „appsscript.json“ v editoru**.
4. Zpět v **Editoru** (`< >`) otevřete `appsscript.json`, smažte obsah
   a vložte obsah souboru
   [`nastroje/apps_script/appsscript.json`](../nastroje/apps_script/appsscript.json)
   (časové pásmo Europe/Prague a oprávnění).
5. Otevřete `Kód.gs` (Code.gs), smažte obsah a vložte **celý** soubor
   [`nastroje/apps_script/kopie_disk.gs`](../nastroje/apps_script/kopie_disk.gs)
   (na GitHubu tlačítko **Raw** → Ctrl+A → Ctrl+C). Uložte (Ctrl+S).

## 4. Nastavte vlastnosti skriptu (token a volby)

**Nastavení projektu → Vlastnosti skriptu (Script Properties) → Přidat
vlastnost skriptu**:

| Vlastnost | Hodnota | Povinná |
|---|---|---|
| `KNG_MAIN_TOKEN` | token ostrého webu (stejný jako `KNG_DISK_TOKEN` v engscalc) | ano |
| `KNG_TEST_TOKEN` | token testovacího webu | jen pro kopii testu |
| `KNG_SLOZKA_ID` | ID složky na Disku | ne — výchozí je `1g6vf8fLwjTWDiRVIU_Mw97Ts0Etg0lLO` („_Zaloha Netlify DB“) |
| `KNG_MAIN_URL` / `KNG_TEST_URL` | adresa webu | ne — výchozí `https://engscalc.netlify.app` / `https://testengscalc.netlify.app` |
| `KNG_HODINA` | hodina spouštěče 0–23 | ne — výchozí 6 |

ID složky je konec adresy složky v prohlížeči
(`drive.google.com/drive/folders/<ID>`). **Uložit vlastnosti skriptu.**

> Proč 6:00 a ne 4:00: noční záloha na serveru vzniká po částech mezi 3:00
> a 4:45 (v létě 4:00–5:45). Ve 4:00 by často ještě nebyla hotová — skript by
> tu dnešní zkopíroval až další den. Chcete-li přesto 4:00, nastavte
> `KNG_HODINA` = 4 a v kroku 6 spusťte `nastavitSpoustec` znovu.

## 5. Povolte oprávnění a spusťte první běh ručně

1. V editoru nahoře vyberte funkci **`kopieDiskRucne`** → **Spustit**.
2. Google se zeptá na oprávnění: **Zkontrolovat oprávnění** → vyberte svůj
   účet → „Google tuto aplikaci neověřil“ → **Rozšířené** → **Přejít na
   Kalkulátor – kopie zálohy na Disk (nebezpečné)** → **Povolit**. (Je to váš
   vlastní skript; oprávnění: Disk, připojení k externím službám — webu
   kalkulátoru, odeslání e-mailu vám samému, spouštěče.)
3. Dole v **Protokolu provádění** má být např.
   `main: zkopírováno otisk_main_2026-11-11_0312.json.gz (52,3 MB, SHA-256 ověřený Diskem). …`
   Velká záloha trvá pár minut; kdyby se nevešla do limitu 6 minut, skript si
   sám naplánuje navázání za minutu (`kopieDiskPokracuj`) — počkejte.
4. Kontrola:
   - ve složce „_Zaloha Netlify DB“ je nový soubor `otisk_main_….json.gz`
     a `posledni_kopie_main.json`;
   - v aplikaci (ostrý web) **Nastavení → Databáze**: „Poslední kopie na
     Disku (prostředí main): … (skript)“;
   - funkce **`kopieDiskStav`** vypíše nastavení (tokeny jen délkou) a posledních
     10 záznamů.

## 6. Nastavte denní spouštěč

V editoru vyberte funkci **`nastavitSpoustec`** → **Spustit** (jednou).
V levém panelu **Spouštěče** (budík) má být jeden spouštěč `kopieDiskNoc`,
„Časově řízený, denní, 6:00–7:00“. Opakované spuštění `nastavitSpoustec`
spouštěč neduplikuje (starý smaže).

## Když přijde e-mail o chybě

Předmět „[Kalkulátor] CHYBA — kopie zálohy kalkulátoru na Disk“ nebo
„Upozornění …“. V e-mailu je důvod a co dál. Nejčastěji:

| Hláška | Co udělat |
|---|---|
| `HTTP 403: Přístup odepřen …` | token ve skriptu nesedí s `KNG_DISK_TOKEN` v Netlify, nebo proměnná chybí / web nebyl po jejím nastavení znovu nasazen |
| `v Netlify chybí noční otisk …` | noční záloha na serveru neproběhla — Netlify → Logs → Functions → `zaloha_nocni` |
| `ve složce už je soubor … s jiným obsahem` | neúplná nebo cizí kopie stejného jména; přesuňte ji do koše, další běh kopii nahraje znovu |
| `… méně dat … nic se nesmazalo` | záloha je o víc než 10 % menší než předchozí — zkontrolujte data; byl-li úbytek záměrný, v aplikaci **Nastavení → Databáze → Úbytek byl záměrný** |
| `hlásí prostředí „main“, ve skriptu je nastavený jako „test“` | prohozené adresy nebo tokeny ve vlastnostech skriptu |

Zálohu záloh pořídíte kdykoli v aplikaci tlačítkem **Zkopírovat zálohu na
Disk teď**.

## Výměna nebo zrušení tokenu

- **Výměna** (např. podezření na únik): vyrobte nový token (krok 1), přepište
  `KNG_DISK_TOKEN` v Netlify + **Trigger deploy**, přepište `KNG_MAIN_TOKEN`
  ve vlastnostech skriptu.
- **Vypnutí**: smažte `KNG_DISK_TOKEN` v Netlify (+ Trigger deploy) a ve
  skriptu spouštěč (Spouštěče → ⋮ → Smazat).

## Co token umí a co ne

Umí jen: přečíst stav (poslední noční záloha, poslední kopie), připravit
a stáhnout **očištěnou** noční zálohu, potvrdit její kopii (jen soubor, který
server sám připravil — shoda SHA-256 a velikosti) a ohlásit úbytek dat na
Disku. Neumí nic smazat, obnovit, potvrdit úbytek dat ani se přihlásit do
aplikace. Podrobně: `BEZPECNOST_MEZE.md`, oddíl AS #577 (B210–B214).
