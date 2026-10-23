# Zadání pro řídící sezení: kontrola větve `claude/eager-carson-1xznt2` a platby v zápisu do Pipedrive (#115) — 23. 10. 2026

Pracuj česky a podle `CLAUDE.md`. Nejdřív si přečti `PREDAVKA.md` ve větvi `claude/eager-carson-1xznt2` (oddíl
22.–23. 10. „Stav Pipedrive“) a `podklady/NAVRH_PIPEDRIVE_ZAPIS_2026-09-22.md` §10–§12. Sloučení do `test-draft`,
`test` a `main` jen na pokyn J. V.

## Stav větve

- **#114 Pipedrive** (091a775 až 6ba5ece): párování polí podle přesného názvu a typu (`netlify/lib/pd_mapa.mjs`),
  převod hodnot krycího listu pro zápis (`netlify/lib/pd_prevod.mjs`), jediný vlastník pole, zákazník = Organizace
  dealu. Testy `netlify/test_pipedrive.mjs`, `test_pd_prevod.mjs`, `test_pd_pristup.mjs`.
- **Stav Pipedrive v hlavičce** (4b63ad7, 2da16e1, 252c49f; v22.10.2, roadmapa #504) je duplicita s P1 ve větvi
  `claude/integrace-16-10`.
- **Jen dokumentace** 22.–23. 10.: aea6bf8, c73770f, b4ef5fc, 0e80b39, 78348f6, 02da489 a commit s tímto zadáním.
- **Testy na 252c49f:** sady 302 prošlo, 0 selhalo, 6 přeskočeno; mutace jádra 432/432; statické 4/4 (22. 10.).
  Mutace serveru 527 z 808 chycených, mutace 528–808 nikde celé neběžely. Testy #194 v Actions to nedoplnily:
  `ubuntu-latest` = Ubuntu 26.04, limit 45 min.
- **Statická kontrola verze je od 23. 10. červená:** `verze.txt` je 22.10.2, ale commity s dokumentací jsou z 23. 10.

## Rozhodnutí J. V. 23. 10. (formulář https://claude.ai/artifact/SVr2vABm81nq5LDs7jGezs)

1. Směr dat podle §12 platí: zadání z Pipedrive se čte, krycí list se zapisuje, nic oběma směry.
2. Hodnota dealu se zapisuje (podrobně úkol B).
3. Stav Pipedrive: platí verze P1, verze z této větve se vrátí a do P1 se převedou tři opravy (úkol A).
4. Zákazník je vždy Organizace dealu. API token bude z účtu J. V., který vidí všechny dealy. Změny přes API se proto
   v historii dealu ukážou pod jeho jménem.
5. Platby 1–8 kalkulátor neplní vůbec, ani zpětně u starších nabídek. Místo nich nové pole „Platební kalendář SoD
   PROJ“ (Velký text).
6. Integrátorovi (Ing. Drda) odešel 23. 10. e-mail se šesti prosbami: volba „Zjišťuje se“, návrh vyvolání cenové
   nabídky z Pipedrive (způsob necháváme na něm, o Make se nemluví), sekce „Krycí list“, čtyři volby „Způsob
   fakturace“ pro projekci, „Hlavní projektant“ jako Text, pole „Platební kalendář SoD PROJ“.

## Úkol A — kontrola větve (řídící sezení)

1. `git cherry origin/test origin/claude/eager-carson-1xznt2`: `git log origin/test..` ukazuje i starší commity
   (#286–#293 a dál), které jsou v `test` pod jiným SHA. Ověř, že nic nepřijde dvakrát.
2. **Stav Pipedrive vrátit** revert commity, ne přepisem historie: 4b63ad7 a 2da16e1 celé, z 252c49f blok mutací
   „Stav Pipedrive“ v `netlify/mutace.mjs` (s `test_pd_stav.mjs` v `SADY` a kotvou B80 `>= max`), oddíl CHANGELOG
   „v22.10.2 — Stav Pipedrive“, roadmapu #504 a „Co je nového v22.10.2“ v `manual/obsah.json`.
3. **Do P1 převést tři opravy**, nejdřív ověř, co P1 už má:
   - Sazba DPH v hlavičce `na-konec` (`src/ui/common.js`), jinak u zahraniční zakázky s kurzem sjede datum vytvoření
     o 38 px,
   - smazaný deal: detail vrátí 404 → dotaz na seznam `status=deleted&ids=<id>` (deal v koši do 30 dní); deal
     odstraněný úplně si nechá poslední známý stav,
   - stav se obnoví i po otevření zakázky ze souboru, po obnově zálohy a po přihlášení (v této větvi `pdStavHlidej`
     v `src/ui/online_ui.js`).
   K opravám převezmi testy z `netlify/test_pd_stav.mjs` a `overit_pd_stav.mjs`, které na P1 sedí. Pojistka: před
   převodem selžou.
4. **#114 zachovat:** po revertu musí projít `test_pipedrive.mjs`, `test_pd_prevod.mjs`, `test_pd_pristup.mjs`
   a `test_prava.mjs` (matice funkcí bez `pd_stav.mjs` této větve).
5. **Verze a evidence:** číslo verze přidělí slučování (`test` má v23.10.1, integrace v23.10.2). Roadmapa: #501–#503
   z této větve, #504 po revertu zrušit nebo sloučit s položkou P1.
6. **Celé kolo** po sloučení. Mutace serveru dokončit podle `podklady/PROMPT_mutacni_beh_23_10.md` (výběr části běhu,
   matrix v Actions). Runner `ubuntu-24.04` už je v integraci (f3b5d42).

## Úkol B — platby v zápisu do Pipedrive (#115)

Rozešli jako dávku do paralelní větve (např. `claude/platby-115`) nad commitem, který určíš po úkolu A.

1. **Platby 1–8 nezapisovat:** `platba1`–`platba8` v `netlify/lib/pd_mapa.mjs` (dnes `zapis` se `stary: ['proj']`)
   převést na směr `nic`. Pole zůstanou v mapě, aby je přehled nehlásil jako nezařazená. Totéž PROJ část „První
   splátka (%)“: u `zaloha1Proc` odebrat `proj: 'zaloha'` a `stary: ['proj']`, OCK beze změny.
2. **Nové pole „Platební kalendář SoD PROJ“** (druh `text`, typ Velký text, směr `zapis`, zdroj PROJ): text z
   `planSodKalendar(dopocet, fmt)` v `src/plan_plateb.js`, jeden řádek za platbu („Platba ve výši … Kč + DPH proběhne
   <milník>.“), ze stejného dopočtu jako smlouva o dílo řídící varianty. Dokud ho integrátor nezaloží, přehled mapy
   ho hlásí jako chybějící a nic se nezapisuje.
3. **Hodnota dealu** (`value` + `currency`): cena řídící varianty bez DPH v měně zakázky, u kombinované zakázky součet
   OCK a PROJ, v potvrzení zápisu „stará → nová“. Cena je vždy výsledek kalkulace, nikdy se nevymýšlí.
4. **Až po odpovědi integrátora:** „Hlavní projektant“ z druhu `uzivatel` na `text`; čtyři volby „Způsob fakturace“
   pro PROJ („Po předání stupňů dokumentace“, „Záloha, zbytek po předání stupňů dokumentace“, „Po milnících činností
   (plán plateb)“, „Podle dohodnutého plánu plateb“) jako synonyma k větám `planZpusobFakturace`.

Testy v `test_pd_prevod.mjs` a `test_pipedrive.mjs`: Platby 1–8 se nepošlou ani u starší nabídky, kalendář = text
dopočtu, hodnota dealu u OCK, PROJ i kombinované zakázky. Ke každému pravidlu mutace v `netlify/mutace.mjs`.
Pojistka: před úpravou selžou. Do živého Pipedrive nic bez potvrzení J. V.; zkušební zápis jen na dealu „TEST –
integrace kalkulačky“ po domluvě termínu s integrátorem. Dokumentace: CHANGELOG, roadmapa #115, `PREDAVKA.md`, konec
dávky tabulkou úkolů ✅ / ⬜.

## Podklady mimo repozitář

- souhrn a rozhodnutí, schéma Platby 1–8: https://claude.ai/artifact/XSFa1QVnFCWXoLpzx7yD8u
- Výsledek testu polí (aktualizováno 23. 10.): https://claude.ai/artifact/RCVznN7Dn2goRM8TmuAZfz
- mapovací tabulka `Pipedrive_Kalkulator_mapa_poli_2026-10-23.xlsx` má J. V. (generátor jen ve scratchpadu sezení
  `claude/eager-carson-1xznt2`; čte `POLE_DEALU` z commitu)
