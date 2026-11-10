# Skript Google Apps Script — noční kopie zálohy na Disk (#577 AS)

Návod pro nastavení: [`podklady/NAVOD_ZALOHA_APPS_SCRIPT.md`](../../podklady/NAVOD_ZALOHA_APPS_SCRIPT.md).

| Soubor | K čemu |
|---|---|
| `kopie_disk.gs` | skript (vkládá se celý do `Kód.gs` projektu na script.google.com) |
| `appsscript.json` | manifest: pásmo Europe/Prague, V8, oprávnění |
| `vloz_retenci.py` | vloží `src/retence_zaloh.js` do bloku na konci `kopie_disk.gs` (spustit po každé změně retence; `--kontrola` jen ověří) |

Server: `netlify/functions/zaloha_disk.mjs` + `netlify/lib/kopie_skript.mjs`
(`GET` metadata, `POST {akce:'priprav'}` po krocích, `GET ?kus=i&otisk=` kusy
po 3 MiB, `POST {akce:'potvrdit'}`, `POST {akce:'varovani'}`), token
`KNG_DISK_TOKEN` v hlavičce `Authorization: Bearer`.

Průběh běhu: metadata → (kopie nejnovějšího nočního otisku už potvrzená? konec)
→ příprava `.json.gz` na serveru → obnovitelné nahrávání Drive API kus po kuse
(kus 3 MiB = 12 × 256 KiB jde rovnou jako blob, nic se neskládá v paměti; blob
Apps Scriptu má strop 50 MB) → ověření velikosti a SHA-256 (`sha256Checksum`
Disku, jinak po kusech) → potvrzení serveru → `posledni_kopie_<prostředí>.json`
→ úklid starých kopií (`retenceZalohDiskVyber`, pojistka `retenceZalohPokles`).
Běh nad 4,5 min se uloží do vlastností skriptu (`KNG_STAV_MAIN`) a naváže
spouštěčem `kopieDiskPokracuj`.

Testy: `netlify/test_577_apps_script.mjs` (skript ve vm s náhradami
UrlFetchApp / DriveApp / Drive API / PropertiesService / ScriptApp / MailApp,
server ve vlákně), `netlify/test_577_kopie_skript.mjs` (server, otisk > 60 MB),
`src/test_577_jmeno_kopie.js` (jméno kopie, hlídka, shoda retence).
