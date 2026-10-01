# Předávka — stav k 1. 10. 2026 večer (v1.10.2 na test-draft i test, v30.9.1 na main)

Na `main`: **v30.9.1**. Na `test-draft` = `test`: **v1.10.2** (pokyn J. V.
1. 10. 2026: „po zeleném kole to pošli do testu“) — rychlý posun z integrační
větve **`claude/davka-1-10-2`** po zeleném celém kole. Releasy vydané do
**v1.10.1** včetně (ověřeno přes GitHub 1. 10. odpoledne); **v1.10.2 release
ani tag ještě nemá** — odkaz na release poslán J. V. (tag z cloudu pushnout
nejde — HTTP 403).
Sezení session_01RJSPgrM27cZ1mGsJWPdfWv navázalo na
session_01H73EkBoAG3hp8ic9PHKqwS.

## Hotovo v1.10.2 — dávka 1. 10. 2026 odpoledne (podrobně CHANGELOG.md)
Zadání J. V. (snímky): výchozí plán plateb, zarovnání polí opláštění,
prověřit rám dveří a větu „Vedle dveří zůstane 1,50 m“, odpovědi na
otázky k #381, roadmapa, otevřené body. Každý úkol vlastní větev
z `test-draft` (b5253c9), integrace bez konfliktů.

| Úkol | Větev | Roadmapa |
|---|---|---|
| Plán plateb PROJ: výchozí předvolba Záloha 70 % + zbytek po předání | `claude/plan-plateb-zaloha-70` | #383 |
| Opláštění po stěnách: pole stěny v pevných sloupcích (materiál / výška / křížek) | `claude/oplasteni-zarovnani-poli` | #384 |
| Věta o zbytku mezery u jedněch dveří + test rámu dveří (rám se počítá 2× už teď) | `claude/svetlik-zbytek-vedle-dveri` | #385 |
| Rozhodnutí J. V. k #381: mezeru mezi příčníky ponechat, nápovědu s výpočtem mezery nezobrazovat | (jen záznam) | #381 |

Vysvětlení pro J. V. (změna šířky bočního světlíku při přepnutí zasklení):
mezera vedle dveří se měří ze šířky skla — na terče 1 500 + 2 × 80 + 20 =
1 680 mm, mezi příčníky 1 500 − 2 × 80 − 8 = 1 332 mm; otvor dveří 800 +
2 × 100 + 40 = 1 040 mm; mezera 600 mm × 252 mm; plocha 6,600 × 2,772 m².

**Podklady v cloudu:** šablony CN v14, CN v11, PROJ v3 (jako
`Sablona_NABIDKA_PROJ.docx`), SoD realizace, SoD projekce, plná moc
a příručka v25.9.3 staženy konektorem Disku do `/home/user/kng_podklady`
(mimo repozitář). Pro `overit_manual.mjs` kopie příručky s verzí
přepsanou na v1.10.2 (`2026-10-01_kalkulator_v1.10.2_MANUAL_OBCHODNIK.html`
— postup ze skillu testovací procedury; skutečná příručka v1.10.2 se
v cloudu vyrobit nedá, chybí snímky z testovacího webu). Malé soubory
přijdou z Disku přímo ve výsledku nástroje — vytáhnout je z přepisu
sezení (JSONL), viz skript v sezení.

## Celé kolo nad v1.10.2
VŠE ZELENÉ (84 min 29 s) nad 7d544b7 — sady 214 prošlo, 0 selhalo, 1 přeskočeno (test.js — skutečný ceník v repozitáři není), mutace jádra 131 z 131, mutace serveru 210 z 210, statické kontroly 3 z 3; s firemními podklady (KNG_PODKLADY: šablony CN v14, CN v11, PROJ v3, SoD, plná moc, příručka). Dílčí ověření před integrací: ./spust_testy.sh v každé větvi
164/0/1; harnessy plan_plateb 49/0, oplasteni 82/0, svetliky_sirka 24/0,
xss 215/0, smoke 50/0; mutace jádra --kontrola 131 úseků.

## Čeká na J. V.
- Release v1.10.2 (odkaz poslán; tag z cloudu nejde).
- Převod v1.10.2 do `main` (výchozí: až po vyzkoušení v testu).
- #383: výchozí plán platí i pro rozpracované zakázky bez uložené
  předvolby (výchozí: ano, jako každá změna firemního plánu); je-li
  v Nastavení → Firma uložený vlastní plán firmy, má přednost — nastavit
  tam předvolbu a zálohu, nebo „Vrátit výchozí z kódu“; šablona nabídky
  PROJ v3 vytiskne natvrdo Standard → nahrát PROJ v4 (výchozí: nahrát).
- #385: znění věty o zbytku (výchozí: ponechat nové znění).
- SoD: znění rozsahu SoD PROJ (bod 7 návrhu), čísla papírových smluv OPR
  a OVP pro etapu C (#366); datum podpisu i v SoD PROJ (výchozí ano);
  slepené „V Praze, dne …" v šabloně SoD realizace (výchozí opravit ve v2);
  pokuta za prodlení splatnosti „0" (výchozí ve v2 větu vypustit).
- #381 zbývající otázky (výchozí: ponechat) — tolerance 0,5 mm, dvě věty
  kontroly, ruční šířka po změně počtu, zábrana i u „zajistí stavba",
  krycí list bez šířky.
- #377: zábrana platí i pro dotisk zamčené varianty (výchozí: ano).
- Vyplnit překlad firemní věty SKN v číselníku na ostrém webu (#379);
  nahrát šablony SoD v2.
- Smazat sloučené větve (celé v `test-draft`, ověřeno `git merge-base --is-ancestor` 1. 10. večer; mazání z cloudu nejde — HTTP 403): `claude/ciselnik-prednost-dodatku`, `claude/davka-1-10`, `claude/davka-k18-svetliky`, `claude/etapa-b-plan-plateb-v30.9.1`, `claude/etapa-b-q5-zaloha-automaticky`, `claude/k18-drobnosti`, `claude/k18-n96-dodatky-preklady`, `claude/k18-nalezy-word-preklady`, `claude/model2-nadsvetlik-bez`, `claude/ock-platebni-podminky-nabidka`, `claude/oprava-sesti-nalezu-v29.9.1`, `claude/sirka-bocniho-svetliku-381`, `claude/sod-generator-sablony`, `claude/stoic-cerf-j915ax`, `claude/svetliky-u-dveri-375`, `claude/zabrany-blokuji-dokumenty`, `claude/davka-1-10-2`, `claude/plan-plateb-zaloha-70`, `claude/oplasteni-zarovnani-poli`, `claude/svetlik-zbytek-vedle-dveri`. `k16-nalezy` celá v `test-draft` není (2 commity navíc: rozbor D kola 16, v25.9.8) — nemazat bez kontroly.

## Další krok
- Paralelní větev **`claude/k19-nalezy`** (nálezy 19. kola, P1–P6, z `b5253c9`)
  běží v samostatném sezení podle promptu J. V. — viz odkaz níž; o sloučení
  rozhoduje J. V.
- Čekat na odpovědi J. V. k otevřeným bodům výš.

## Předchozí stav (1. 10. 2026 dopoledne — v1.10.1 na test-draft i test, v30.9.1 na main)

Na `main`: **v30.9.1**. Na `test-draft` = `test`: **v1.10.1** (pokyn J. V.
1. 10. 2026: „s návrhem šířky bočního světlíku souhlasím, zapracuj ho pro
model 2 (modelu 1 nic neměň) a vše pošli do testu"). Převod rychlým posunem
z integrační větve `claude/davka-1-10` po zeleném celém kole (finální celé kolo nad d596290 VŠE ZELENÉ (59 min 7 s): sady 214 prošlo, 0 selhalo, 1 přeskočeno (test.js), mutace jádra 128 z 128, mutace serveru 210 z 210, statické 3 z 3; kód v1.10.1 (373861f) je s d596290 shodný, liší se jen CHANGELOG, PREDAVKA a roadmapa; na pokyn J. V. „potřeboval bych to už odeslat do testu" převedeno ještě před doběhnutím mutací serveru, výsledek dopsán po doběhnutí; předchozí celé kolo nad a7889c5 (úkoly 1–4 bez SoD rozhodnutí, #381 a #382) VŠE ZELENÉ: sady 210/0/1, mutace jádra 121 z 121, serveru 210 z 210, statické 3 z 3).
Releasy vydané do **v1.10.1** včetně (ověřeno přes GitHub 1. 10. — tag
v1.10.1 i release založil J. V.; z cloudu tag pushnout nejde — HTTP 403).
Sezení 1. 10. navázalo na session_01XFo3AzDzkjt8xGnMVH53p7.

## Hotovo v1.10.1 — dávka 1. 10. 2026 (podrobně CHANGELOG.md)
Každý úkol vlastní větev; integrace `claude/davka-1-10` (konflikty jen
v CHANGELOG, roadmapě, mutace_jadro.mjs, overit_sod.mjs a zamek_ui.js —
obě strany ponechány).

| Úkol | Větev | Roadmapa |
|---|---|---|
| Model 2: nadsvětlík „bez" bez odpočtu 0,2 h (Model 1 ubírá dál) | `claude/model2-nadsvetlik-bez` | #378 |
| Zábrany z kontroly blokují dokumenty své strany (OCK × PROJ) | `claude/zabrany-blokuji-dokumenty` | #377 |
| K18-N96: překlady dodatkových textů EN/DE/FR v číselníku | `claude/k18-n96-dodatky-preklady` | #379 |
| Návrh SoD + generátor podle šablon, K18-N100, K18-N101, „% %", rozhodnutí J. V. (termíny, místo plnění, denní pokuta, datum podpisu = datum tisku, pokuta zhotovitele, šablony v2) | `claude/sod-generator-sablony` | #380 |
| Šířka bočního světlíku při ručním počtu — jen Model 2 | `claude/sirka-bocniho-svetliku-381` | #381 |
| Dodatkové texty: číselník má přednost před zveřejněným ceníkem | `claude/ciselnik-prednost-dodatku` | #382 |

**Návrhy (artefakty):** SoD a šablony https://claude.ai/artifact/GXZGaJBMR9PQXnp9bz6Xwh,
šířka bočního světlíku https://claude.ai/artifact/7tNaMb8Fu1tNt9ADCyYheL.
Šablony SoD realizace v2 a SoD PROJ v2 poslány J. V. (vyrábí je
`nastroje/vyrob_sablony.js --sod-real | --sod-proj`, necommitují se) —
nahrát v Nastavení → Smlouvy / Šablony.

**K18-N101:** tester zkoušel P18 na ostré v30.9.1 (před plánem plateb).
**#382:** v testu nese zveřejněný ceník u SKN starší text — nově má
přednost číselník; zakázku založenou dřív srovná tlačítko v číselníku.

**Podklady v cloudu:** šablony CN v14, PROJ v4 (+EN/DE/FR), PROJ v3 (jako
Sablona_NABIDKA_PROJ.docx), SoD, plná moc a příručka staženy konektorem
Disku do `/home/user/kng_podklady` — velké soubory se uloží do
`…/tool-results/…txt` (JSON s base64), kontext nezahltí (viz skill).
Aktualizovaný skill (nové znění zásady o symbolech SoD + rozhodnutí 1. 10.)
poslán J. V. jako `2026-10-01_kalkulator_v1.10.1_skill.skill`.

## Čeká na J. V.
- Převod v1.10.1 do `main` (release v1.10.1 už vydán).
- SoD: znění rozsahu SoD PROJ (bod 7 návrhu), čísla papírových smluv OPR
  a OVP pro etapu C (#366); otázky agentů s výchozími odpověďmi (datum
  podpisu i v SoD PROJ — výchozí ano; slepené „V Praze, dne …" v šabloně
  SoD realizace — výchozí opravit ve v2; pokuta za prodlení splatnosti „0"
  — výchozí ve v2 větu vypustit).
- #381 otázky (výchozí: ponechat) — tolerance 0,5 mm, dvě věty kontroly,
  ruční šířka po změně počtu, zábrana i u „zajistí stavba", krycí list bez šířky.
- #377: zábrana platí i pro dotisk zamčené varianty (výchozí: ano).
- Vyplnit překlad firemní věty SKN v číselníku na ostrém webu (#379);
  nahrát šablony SoD v2.

## Další krok
- Navazující sezení (založené 1. 10. ze sezení session_01H73EkBoAG3hp8ic9PHKqwS)
  nejdřív vysvětlí J. V., proč se při přepnutí zasklení „na terče" →
  „mezi příčníky" změní předpočítaná šířka bočního světlíku (mezera vedle
  dveří se měří z šířky skleněné plochy: na terče vnitřní šířka + 2 × příčník
  + 0,02 m, mezi příčníky vnitřní šířka − 2 × sloupek − 0,008 m; v příkladu
  J. V. 600 mm × 252 mm) a nabídne otázku s výchozí odpovědí. Bez pokynu
  J. V. se nic nemění.

## Předchozí stav (30. 9. 2026)

Na `main`: **v30.9.1** (pokyn J. V. 30. 9. 2026 „pošli aktuální test do
main"; ostrá aplikace se z `main` nasazuje sama). Na `test`: **v30.9.3**
(pokyn J. V. 30. 9. odpoledne „co máme aktuálně v draftu pošli už do testu").
Na `test-draft`: **v30.9.4** — dávka K18 + světlíky u šachetních dveří
(integrační větev `claude/davka-k18-svetliky`, převod fast-forwardem po
zeleném celém kole). Do `test` a `main` jen na pokyn J. V.
Releasy do **v30.9.3** včetně vydané a odsouhlasené (J. V. 30. 9.; ověřeno
přes GitHub 30. 9. večer). **v30.9.4** — odkaz na release poslán J. V.
(tagy z cloudu pushnout nejde — proxy HTTP 403, viz CLAUDE.md).

**Větve k 30. 9. 2026 večer** (ověřeno `git merge-base --is-ancestor`):
- **Celé v `test-draft` — J. V. je smaže, až nebudou potřeba:**
  `claude/davka-k18-svetliky`, `claude/svetliky-u-dveri-375`,
  `claude/k18-drobnosti`, `claude/k18-nalezy-word-preklady`,
  `claude/ock-platebni-podminky-nabidka` (v30.9.4),
  `claude/etapa-b-q5-zaloha-automaticky` (v30.9.3),
  `claude/etapa-b-plan-plateb-v30.9.1` (v30.9.2),
  `claude/oprava-sesti-nalezu-v29.9.1` (v30.9.1), `k16-nalezy`
  a `claude/stoic-cerf-j915ax` (z dřívějška).
- **Nahrazená, ne celá v `test-draft`:** `claude/etapa-b-plan-plateb-proj`
  (etapa B z v29.9.4) — krok 1 přenesen do nové větve, zbytek hotový tam;
  k práci už není potřeba (smazání rozhodne J. V.).
- **Nesloučené, nemazat:** `claude/testovani-po-opravach` (předávka 22. kola
  nad v29.9.7 = kód v30.9.1: VYHOVUJE S NÁLEZY — 2 nové vysoké v třídě
  „koncová cena" #374, B99 obejitelná; čeká na rozhodnutí J. V.),
  `claude/pensive-curie-s6yzs3` (zbývá předávka fd1be2b),
  `claude/komplexni-test-v29.9.1` (výsledky 21. kola), `claude/opravy-v29.9.1`
  (předávka + prompt šesti oprav).
Roadmapa: `roadmapa/roadmap.json` (377 položek, nejvyšší #377), stránka se
generuje `python3 roadmapa/roadmapa.py`.

## Hotovo v30.9.4 — dávka K18 + světlíky u šachetních dveří (podrobně CHANGELOG.md)
Zadání J. V. 30. 9. 2026 odpoledne; čtyři paralelní větve z `test-draft`,
sloučené v `claude/davka-k18-svetliky` (konflikty sjednocené, pravidel
kontroly 31, mutace jádra 111 úseků):
- **#375 světlíky u dveří** (`claude/svetliky-u-dveri-375`; návrh
  https://claude.ai/artifact/2x3pM2fGfAQaXz7ziUVxbE odsouhlasen J. V.): boky
  mají tytéž volby jako nadsvětlík (nové zakázky „bez"), pole **Celkem
  světlíků na bocích dveří** (nástupiště × 2, ručně s ↺), ocenění po
  dveřích, sklo podle stěny s dveřmi, materiál podle stěn B–D, kontrola
  `bokyDveri`, řádek specifikace SVĚTLÍKY U ŠACHETNÍCH DVEŘÍ + symbol
  `{{TS_SVETLIKY_DVERI}}` (šablona CN ho zatím nemá — Word popisuje
  světlíky dál řádkem `{{TS_OPLASTENI_NADSVETLIKU}}` bez počtu), převod
  starších zakázek beze změny ceny. Nadsvětlík „zajistí stavba" už neubírá
  0,2 h montáže na nástupiště, „bez" odpočet drží (Model 1 = Excel).
- **B1–B3** (`claude/k18-drobnosti` + doplněk v integrační větvi): 3D
  zaměření ve specifikaci i řádek **Zaměření strojovna** v krycím listu OCK
  odvozené z položky ZAMĚŘENÍ 3D SKENEREM v Režii (množství 0 = ne, ruční
  přepis neplatí, zamčená varianta drží odeslané); opláštění po stěnách
  samo o sobě atyp nedělá; zdvih nejvýš 99 m (zábrana v kontrole „rozmery",
  pole max 99).
- **K18-N92, N93, N95–N97** (`claude/k18-nalezy-word-preklady`): šablona
  PROJ v4 s blokem ceny geodetu + kontrola `cenaWordProj`, záruka
  v cizojazyčné online nabídce přeložená, úvod a termíny PROJ přeložené
  (návrh), kontrola `dodatekCesky`, materiály po stěnách se stěnami.
- **K18-N94 + měsíční fakturace** (`claude/ock-platebni-podminky-nabidka`,
  #367 etapa A část 1): platební kalendář z krycího listu (0 % se vynechá,
  doklady se přečíslují; „Měsíční" = věta o měsíční fakturaci místo
  50/40/10), šablona **CN v14**, kontrola `platbyWordOck`.
- Šablony **CN v14** a **PROJ v4** (CZ + EN/DE/FR) vyrobené
  `nastroje/vyrob_sablony.js --cn-v14 / --proj-v4` z podkladů na Disku,
  poslány J. V. v sezení 30. 9. večer (v repozitáři nejsou).
- Příručka (`manual/obsah.json`) a `podklady/OBRAZOVKA_OPLASTENI.md`
  opravené; roadmapa #375 a #376 hotovo, #367 doplněno, **nová #377**.
- **Ověřeno celým kolem** nad d7e2f32 (62 min 5 s): VŠE ZELENÉ — sady 207
  prošlo, 0 selhalo, 1 přeskočeno (test.js); mutace jádra 111 z 111; mutace
  serveru 207 z 207; statické kontroly 3 z 3. Po kole strom čistý.

## Hotovo v30.9.2 — etapa B: plán plateb projekce (podrobně CHANGELOG.md)
Jeden plán plateb PROJ (krycí list PROJ), nabídka PROJ, tisk krycího listu,
smlouva o dílo PROJ a Nastavení ho jen čtou. Rozhodnutí J. V. 29. 9. 2026:
čtyři předvolby (Standard po činnostech = dosavadní procenta, Záloha +
zbytek po předání 0/30/50/70 %, 100 % po dokončení stupně, Vlastní),
výchozí Standard; splátky SoD PROJ se stejným milníkem sečtené, dopočet =
procento × cena činnosti po slevě, poslední splátka nese zaokrouhlení,
ruční přepis; zábrany (100 % u činnosti, součet plateb = cena díla).
- Jádro `src/plan_plateb.js` (v JADRA mutačního testu), firemní plán
  `NAST.firma.planPlatebProj` (Nastavení → Smlouvy / Šablony, zveřejnění
  s firmou, kontrola tvaru v prohlížeči i na serveru), karta plánu a tabulka
  plateb v krycím listu PROJ, snímek `kryciProj.zmrazenoPlan` při KAŽDÉM
  prvním zamčení (i klonu a po odemčení; dotisk ho nepřepíše), zábrany
  `planPlateb100` / `planPlatebSoucet`, varování `planPlatebWordProj`
  (proti Standardu z kódu), brána `dokumentZabrana(typ, varianta)` hlídá
  variantu, ze které dokument vzniká (pravidel kontroly 27).
- Word: nabídka PROJ symboly `{{PROJ_PLATBY_<ČINNOST>}}` mezi
  `{{PLATBY_<X>_ZAC/_KON}}` (šablona **PROJ v4**), smlouva o dílo PROJ
  `{{SODP_PLATEBNI_KALENDAR}}` — odstavec za platbu (šablona **SoD PROJ v2**;
  stará s osmi platbami dostane `SODP_PLATBAn_KC`, plán, který neumí,
  smlouvu nevyrobí). Šablony vyrábí `node nastroje/vyrob_sablony.js
  --proj-v4 | --sod-proj <podklady>`; vyrobené (CZ + EN/DE/FR, SoD) poslány
  J. V. v sezení — v repozitáři nejsou.
- Převod starších zakázek: ruční splátky `sodpPlatba1–8` = ruční částky
  plateb se stejným milníkem (líně, bez zápisu), dřívější záloha („Záloha
  30 %") nabídnutá tlačítkem; odeslaná nabídka bez snímku se chová jako
  dřív a nová šablona SoD z jejích ručních splátek dostane seznam plateb.
- **Revize před sloučením** (dvě nezávislé): opravy F1–F9 v 843ff63 —
  blokující snímek plánu u klonu / po odemčení, závažná brána podle
  varianty, sedm menších (převod zálohy, „upraveno" u zamčené, varování
  ve Wordu, `PODM_*` jen z viditelných polí, SoD starší nabídky, odolnost
  vůči poškozeným datům, odebrání milníku se zeptá).
- **Ověřeno celým kolem** 30. 9. 2026 nad 843ff63 (72 min 17 s): VŠE ZELENÉ —
  sady 204 prošlo, 0 selhalo, 1 přeskočeno (test.js); mutace jádra 87 z 87;
  mutace serveru 207 z 207; statické kontroly 3 z 3.
- **v30.9.3 — Q5:** dřívější záloha krycího listu se přepne na předvolbu
  plánu sama (líně, první zápis ji zhmotní). Celé kolo nad 8cb2534 VŠE
  ZELENÉ (71 min 53 s: sady 204/0/1, mutace jádra 88 z 88, serveru 207 z 207,
  statické 3 z 3).

## Hotovo v30.9.1 — opravy šesti nálezů 21. kola (podrobně CHANGELOG.md)
B111 záporné položky, B96 krok zaokrouhlení, B112 ceník varianty a přepisy
podle role (vysoké); B97 klíč brzdy přihlášení, B98 obnova ze souboru a
odemčení, B99 šablona bez maker a vnějších vztahů (střední). Ověřeno
celým kolem (sady 199/0/1, mutace jádra 80, serveru 206). Testování po
opravách (22. kolo): větev `claude/testovani-po-opravach` (viz výše).

## Hotovo dřív v test-draft (v29.9.1–v29.9.4)
- v29.9.4: sloučení #371 (testovací sekvence A1–A5, jedno testovací kolo,
  opravy B72/P4, B75–B78, N43) a #372 (neznámý rozměr profilu).
- v29.9.1–v29.9.3: #364 nabídka PROJ se slevou, rozhodnutí J. V. k rozboru
  D kola 16 (`podklady/K16_ROZBOR_2026-09-25.md`), P8b, P9.2/P9.4/P9.5,
  P10.x, P11 `projZahranici`, P8A značky bloků + šablony CN v13 a PROJ v3.

## Platební podmínky z krycího listu — ROZHODNUTO 29. 9. 2026
Návrh `podklady/NAVRH_PLATEBNI_PODMINKY_2026-09-29.md` (oddíl 7 =
rozhodnutí), podklad etapy B `podklady/ETAPA_B_PODKLAD_2026-09-29.md`,
prototyp https://claude.ai/artifact/6sbxbaAsBpphfPfE2wnM3a.
- OCK (etapa A): tři firemní milníky, jak jsou; věty o podmínce úhrady u 1.
  a 2. splátky jako dnes; měsíční fakturace větou „Fakturace probíhá měsíčně
  podle skutečně provedených prací."
- PROJ (etapa B): **hotovo ve v30.9.2** (viz výše).
- Číslo smlouvy (etapa C, #366): ruční pole v krycím listu s návrhem dalšího
  čísla, formát `2026 - OPR - SOD - 0001` (realizace) a `2026 OVP SOD 0001`
  (projekce), navázat na papírové smlouvy.
- **Pořadí etap: B → A → C.** A a C až na pokyn J. V.

## Otázky etapy B — rozhodnutí J. V. 30. 9. 2026
- **Q5 změněno:** dřívější záloha se přepne na předvolbu **automaticky**
  (hotovo ve v30.9.3).
- **Potvrzeno:** Q9 (nové texty přes slovník, vlastní text milníku zůstává
  v EN/DE/FR česky, bez varování), Q10 (způsob fakturace z předvolby),
  body revize a (brána počítá plán v korunách — nesedící ruční částka v Kč
  zastaví i cizojazyčnou smlouvu) a b (server nekontroluje tvar plánu ve
  variantě) — „zatím OK".
- **Bez námitky (platí výchozí návrh):** Q1 projednání 100 % „po předání
  vyjádření odboru památkové péče HMP", Q2 geodet 100 % „po předání
  geodetického zaměření", Q4 celé koruny, poslední splátka dorovná, Q11
  řádek smlouvy „Platba ve výši … + DPH proběhne …", Q12 řádky nabídky
  „Platba {milník} – N % z nabídkové ceny za {činnost}".
- **Q8 „ponechat":** firemní „Standard po činnostech" se dál mění převzetím
  splátek upravených v krycím listu otevřené zakázky (Nastavení → Smlouvy /
  Šablony → „Převzít Standard z otevřené zakázky"), bez zvláštního editoru.

## Rozhodnutí z oprav v30.9.1 podle výchozího návrhu — čekají na potvrzení J. V.
- **B111:** zápornou položku, množství ani hodiny nesmí nikdo, ani
  administrátor (dobropis ne; jako N56).
- **B96 bod 4:** marže z koncové ceny i bez slevy — jen návrh, nerealizováno.
- **B112:** vedeno jako nový nález (vysoká); B88 dál jen čtecí strana.
- **B97:** vážnost střední.
- **B98:** odemčení ze souboru, které v databázi není → zakázku přeskočit
  s důvodem v náhledu obnovy.
- **B99:** vnější odkazy `http(s):` a `mailto:` v šabloně zůstávají povolené.

## Čeká na J. V.
- **Release v30.9.4** (odkaz v závěrečné zprávě sezení 30. 9. večer)
  a **smazat větve**, které jsou celé v `test-draft` (seznam výše;
  https://github.com/vendljar/kalkulator-next-gen-engscalc/branches).
- **Nahrát šablony** (Nastavení → Šablony) až do verze s v30.9.4: nabídka
  OCK **CN v14** (+EN/DE/FR), nabídka PROJ **v4** (+EN/DE/FR — nová s cenou
  geodetu, nahrazuje v4 z etapy B) a SoD PROJ v2 z etapy B.
- **Otázky dávky K18 (výchozí odpovědi platí, dokud J. V. neřekne jinak):**
  (1) nadsvětlík „bez" dál ubírá 0,2 h na nástupiště (Model 1 = Excel) —
  ponechat; (2) #377 zábrany z kontroly do `dokumentZabrana()` — ano,
  v paralelní větvi; (3) řádek `{{TS_SVETLIKY_DVERI}}` do šablony CN
  (v15) — ano v další dávce; (4) předpoklady #375: terče a lišty u plechu
  a „zajistí stavba" zůstávají, „převažující" = podle plochy (materiál) /
  výšky pásu (sklo), specifikace exteriéru píše u nadsvětlíku se sklem VSG
  (dřív dvojsklo) — OK; (5) svázání zaměření vyloženo jako Režie OCK
  (ZAMĚŘENÍ 3D SKENEREM) ↔ specifikace a krycí list OCK, dílenská
  dokumentace ruční volbu drží — OK; (6) `cenaWordProj` a `dodatekCesky`
  jsou varování, ne zábrana — OK; (7) SoD realizace: bez zálohy a měsíční
  fakturace šablona SoD zatím neumí (symboly `SOD_SPLATKA*` se doplňují ve
  Wordu) — řešit s etapou A / soubory SoD (#350).
- **Odborná kontrola překladů** EN/DE/FR označených „NÁVRH PŘEKLADU"
  (světlíky u dveří, úvod a termíny PROJ, měsíční fakturace, „stěny").
- Pokyn ke zbytku etapy A (smlouva o dílo OCK, 10.3) a k etapě C (číslo
  smlouvy, #366).
- Rozhodnout nálezy 22. kola (`claude/testovani-po-opravach`), bod 4 B96
  a **#374** (zbývající cesty třídy „koncová cena": hodiny a rezerva
  standardních položek PROJ, cena trvalé položky s kid, zaokrouhlení
  z výčtu); množství příplatků obchodníkem vs. `sloupce.naklad`.
- Spustit `node nastroje/detekce_zneuziti.mjs <záloha ostré databáze>`
  (Nastavení → Databáze → Zálohovat teď) — najde dřívější zneužití B111
  a B96 i v odeslaných nabídkách.
- **Poslední číslo papírových smluv** realizace (OPR) a projekce (OVP)
  pro etapu C.
- Soubory SoD (#350) — bez nich nejde ověřit symboly smluv (i pro etapu B:
  symbol seznamu plateb v šabloně SoD PROJ). SoD PROJ v2 je vyrobená
  z `Sablona_SOD_PROJEKCE.docx` z Disku.
- Pokyn k přenosu `test-draft` (v30.9.4) do `test` (a dál do `main`).
- **N46** (nástupiště A ↔ C u zrcadlové šachty): neopraveno, fuzz hlásí INFO.
- Z dřívějška: rozhodnutí z dávky B kola 16 (bez čísla se neukládá; přepočet
  po zveřejnění ceníku není neuložená změna; „ß" = „ss") a překlady z dávky C;
  telefon a jméno kolegy v `overit_nabidka_proj_word.mjs` (#346 / B79);
  CSP bez `'unsafe-inline'`; #369 (vypnout náklady obchodníkovi).

## Odložené nálezy 21. kola (neopravovat, jen evidovat)
Zbytek B77, B100–B110, zbytek B32, B4 souběh, B6, N59–N61 (větev
`claude/komplexni-test-v29.9.1`). N46 se neopravuje bez pokynu J. V.

## Poznámky pro další sezení
- **Testy jedním příkazem:** `bash nastroje/testovaci_kolo.sh` (celé kolo
  ~70 min) nebo `--bez-mutaci`, `--jen sady` apod. Mutační běh nepřerušovat,
  spouštět na pozadí nástroje (ne setsid); po přerušení
  `grep -rn "if (false)" netlify src` a `git diff netlify src`. Počty
  k 30. 9. večer (v30.9.4): mutace jádra 111 úseků, mutace serveru 207,
  pravidel kontroly 31.
- Šablony pro harnessy: `KNG_PODKLADY=<složka>` s CN v13 (+EN/DE/FR) jako
  nejvyšší verzí, CN i jako `Sablona_NABIDKA_CN_v11.docx` a PROJ v3
  pojmenovanou `Sablona_NABIDKA_PROJ.docx`; SoD realizace/projekce, plná moc
  a příručka (kopie s číslem aktuální verze, krok 0.7 skillu). V novém
  sezení nejsou — konektor Disku (hledat podle názvu), nebo
  `node nastroje/vyrob_sablony.js <CN v12 a PROJ v2> [výstup]`; PROJ v4
  a SoD PROJ v2 přepínači `--proj-v4` / `--sod-proj` (testy si je vyrobí samy).
- Harnessy a serverové sady s `ADMIN_EMAIL=spravce@priklad.cz`
  (testovaci_kolo.sh ho nastaví sám); symlink `node_modules/playwright`
  → `$(npm root -g)/playwright` (a `playwright-core`).
- Pojistky uložení i obnovy stojí v `netlify/lib/zakazka_kontrola.mjs`
  (ne v `functions/zakazky.mjs`) — tam patří i nové kontroly zakázky.
  Pořadí: typy → B111 záporné → B96 zaokrouhlení → B112 ceník → #372 profil.
- **Od B112 test nebo harness, který ukládá zakázku se změněným ceníkem,**
  musí ukládat jako administrátor, nebo nejdřív zveřejnit ceník
  (vzor `overit_online.mjs`, `cenikPlatnyTed()` v `netlify/test_prava.mjs`).
- Plán plateb: data `varianta.data.kryciProj.planPlateb` (řídký),
  snímek `zmrazenoPlan` (+ `upravene`), firemní `NAST.firma.planPlatebProj`;
  pole krycího listu `stary` (dřívější záloha / fakturace / splátky 1–8)
  jsou vidět jen u odeslané nabídky bez snímku; zapisující `planKlp*` musí
  být v `ZAMEK_CHRANENE`.
- Testovací zakázky v `netlify/test_obnova.mjs` sdílejí jednu databázi —
  nový blok potřebuje volná čísla (obsazeno 0777–0785, 0790–0794,
  0800–0804, 0999).
- `profilyNezname()` z `engine.js` volá i server (přes `globalThis`).
- Server musí načítat v `jadro_moduly.cjs` tytéž moduly migrací jako
  prohlížeč (pořadí CORE v build.py) — hlídá `src/test_zamek_historie.js`.
- Nový smyšlený kontakt v testu → `nastroje/povolene_kontakty.txt`.
- Komentář uvnitř `KOD_STRANKY` v `overit_xss.mjs` nesmí obsahovat zpětné
  apostrofy; komentář s doslovnou uzavírací značkou skriptu v `src/`
  rozbije celou aplikaci; výčet `INCLUDE*/DDE` v blokovém komentáři ho
  ukončí (`*/`).
- Kontejner běží v UTC: verze vDEN.MĚSÍC se měří k datu posledního commitu.
- LibreOffice v kontejneru nemá Writer — .docx jen strukturou XML.
- Dvě nezávislé pojistky potřebují každá vlastní cílený test.
- Čísla roadmapy přiděluje ten, kdo slučuje — před přidáním položky zjistit
  nejvyšší id v cílové větvi.

## Další krok
Čeká se na J. V. (výše): release v30.9.4, šablony CN v14 a PROJ v4,
otázky dávky K18 (výchozí odpovědi), #377, pokyn ke zbytku etapy A
a k etapě C, rozhodnutí o nálezech 22. kola a pokyn ke sloučení
`test-draft` do `test`. Nová práce vždy v paralelní větvi (`claude/…`)
z `test-draft`.
