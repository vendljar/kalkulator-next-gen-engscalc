# SEC-M — Matice oprávnění (server-A)

Automaticky vyrobeno `podklady/SECM_pokusy/server_a/matice.mjs` nad `main` (v25.10.1).
Buňka = skutečný HTTP kód. `✗` = odchylka od očekávaného kódu (očekávaný v závorce).
Role: anon = nepřihlášen, obch = Obchodník, ved = Vedoucí, admin2 = Administrátor (vedlejší), admin = hlavní správce (ADMIN_EMAIL).
Pipedrive není nastavené (nastaveno:false), ale přihlášení/původ/matice se ověří.

| Cesta + metoda/akce | anon | obch | ved | admin2 | admin | poznámka |
|---|---|---|---|---|---|---|
| prihlaseni POST (správné heslo obch) | 200 | 200 | 200 | 200 | 200 | anon se přihlásí; přihlášený také (bez cookie kontroly) |
| prihlaseni GET (špatná metoda) | 405 | 405 | 405 | 405 | 405 |  |
| odhlaseni POST | 200 | 200 | 200 | 200 | 200 | anon bez relace 200 (jen smaže cookie) |
| odhlaseni GET (špatná metoda) | 405 | 405 | 405 | 405 | 405 |  |
| ja GET | 401 | 200 | 200 | 200 | 200 |  |
| zdravi GET (veřejné) | 200 | 200 | 200 | 200 | 200 |  |
| zakazky GET rejstřík | 401 | 200 | 200 | 200 | 200 |  |
| zakazky GET vlastní | 401 | 200 | 200 | 200 | 200 |  |
| zakazky GET CIZÍ (IDOR čtení) | 401 | 200 | 200 | 200 | 200 | sdílená DB: čtení cizí zakázky je záměr (#103) |
| zakazky POST uložení (nové číslo) | 401 | 200 | 200 | 200 | 200 | zápis smí každý přihlášený (sdílená DB) |
| zakazky POST přepis CIZÍ (IDOR zápis) | 401 | 200 | 200 | 200 | 200 | přepis cizí zakázky obchodníkem je záměr (sdílená DB) |
| zakazky DELETE CIZÍ (IDOR mazání) | 401 | 403 | 403 | 200 | 200 | mazat smí jen admin → obch/ved 403 |
| zakazky PUT (špatná metoda) | 401 | 405 | 405 | 405 | 405 | metoda se kontroluje až po vyzadujRoli → anon 401 |
| zakaznici GET seznam | 401 | 200 | 200 | 200 | 200 |  |
| zakaznici GET CIZÍ karta | 401 | 200 | 200 | 200 | 200 |  |
| zakaznici POST uložení | 401 | 200 | 200 | 200 | 200 |  |
| zakaznici DELETE CIZÍ (IDOR) | 401 | 403 | 403 | 200 | 200 | mazat smí jen admin |
| uzivatele GET seznam | 401 | 403 | 403 | 200 | 200 |  |
| uzivatele POST mojeheslo (špatné staré) | 401 | 401 | 401 | 401 | 401 | přihlášený: staré nesouhlasí → 401; anon → 401 (nepřihlášen) |
| uzivatele POST profil VLASTNÍ | 401 | 200 | 200 | 200 | 200 |  |
| uzivatele POST profil CIZÍ (IDOR) | 401 | 403 | 403 | 200 | 200 | cizí profil jen admin → obch/ved 403 |
| uzivatele POST role (povýšení obch→admin bez hesla správce) | 401 | 403 | 403 | 401 | 401 | admin bez hesloSpravce → 401 (kód hesloSpravce) |
| uzivatele POST zaloz (bez hesloSpravce, role Obchodník) | 401 | 403 | 403 | 200 | 400 | obch/ved 403; admin2 založí (200), admin už existuje (400) — akce se potvrdila |
| uzivatele DELETE (špatná metoda) | 401 | 405 | 405 | 405 | 405 |  |
| obnova POST | 401 | 403 | 403 | 400 | 400 | admin: tělo bez platného režimu → 400 (auth prošla) |
| obnova GET (špatná metoda) | 405 | 405 | 405 | 405 | 405 | kontrola metody je PŘED auth → 405 i anonymovi |
| zaloha GET (stažení DB) | 401 | 403 | 403 | 200 | 200 |  |
| zaloha_vynuceno GET | 401 | 403 | 403 | 200 | 200 |  |
| zaloha_vynuceno POST (otisk) | 401 | 403 | 403 | 200 | 429 | admin2 otisk (200), admin v tomtéž okně limit 1/10 min (429) |
| zaloha_nocni PŘÍMÉ zavolání (bez plánovače) | 200 | 200 | 200 | 200 | 200 | nemá config.path; handler nemá žádnou kontrolu — viz SEC-I2 |
| program GET | 401 | 200 | 200 | 200 | 200 |  |
| program POST zveřejnit ceník | 401 | 403 | 403 | 200 | 400 | obch/ved 403; admin2 zveřejní prázdný ceník (200, mez B113), admin „neliší se" (400) |
| firma GET | 401 | 200 | 200 | 200 | 200 |  |
| firma POST | 401 | 403 | 403 | 400 | 400 |  |
| zobrazeni GET | 401 | 200 | 200 | 200 | 200 |  |
| zobrazeni POST (bez hesla správce) | 401 | 403 | 403 | 401 | 401 | změna matice chce hesloSpravce (B168) → admin bez něj 401 |
| popisy GET | 401 | 200 | 200 | 200 | 200 |  |
| popisy GET ?sber=1 (jen admin) | 401 | 403 | 403 | 200 | 200 |  |
| popisy POST | 401 | 403 | 403 | 200 | 200 |  |
| slovnik GET | 401 | 200 | 200 | 200 | 200 |  |
| slovnik POST (nic se neliší) | 401 | 403 | 403 | 400 | 400 |  |
| sablony GET rejstřík | 401 | 200 | 200 | 200 | 200 |  |
| sablony POST rezim | 401 | 403 | 403 | 200 | 200 |  |
| controlling GET | 401 | 403 | 403 | 200 | 200 |  |
| controlling POST (nic se neliší) | 401 | 403 | 403 | 400 | 400 |  |
| controlling/export GET (nákupní ceny) | 401 | 403 | 403 | 200 | 200 |  |
| analytika GET ?akce=rezim | 401 | 200 | 200 | 200 | 200 |  |
| analytika GET souhrn (jen admin) | 401 | 403 | 403 | 200 | 200 |  |
| analytika POST udalosti | 401 | 200 | 200 | 200 | 200 |  |
| analytika POST rezim (jen admin) | 401 | 403 | 403 | 200 | 200 |  |
| vypocet POST | 401 | 400 | 400 | 400 | 400 | přihlášený s prázdným vstupem → 400; anon → 401 |
| vypocet GET (špatná metoda) | 405 | 405 | 405 | 405 | 405 |  |
| pd/deal GET | 401 | 200 | 200 | 200 | 200 | právo crm.pipedrive výchozí = všichni (vychozi Obchodník/Vedoucí, rozhodnutí J. V. v15.10.7) |
| pd/dealy GET | 401 | 200 | 200 | 200 | 200 |  |
| pd/pole GET | 401 | 200 | 200 | 200 | 200 |  |
| pd/stav GET (bezPrava — vidí každý přihl.) | 401 | 200 | 200 | 200 | 200 | bezPrava:true → stačí přihlášení + vidět zakázku |

**Řádků: 56, odchylek od očekávání: 0.**
