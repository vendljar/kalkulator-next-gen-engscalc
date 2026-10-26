# K9 #526 — nezávislý audit zálohování (26. 10. 2026)

Noční plán J. V. 26. 10. 2026, bod 3. Základ: `claude/z2-retence-zaloh` @ `67f4d3b` (obsahuje Z1 #522
v26.10.8 a Z2 #523 v26.10.9). Finální `origin/claude/z2-retence-zaloh` byl před uzavřením znovu stažen —
**proti 67f4d3b beze změny** (žádný nový commit), audit tedy platí pro finální stav Z2.

Jen audit a reprodukce, **žádná oprava kódu**. Vše lokálně na paměťovém úložišti (`podklady/K9_pokusy/`);
na ostrém webu, na Disku Google ani v Pipedrive nic.

## Verdikt

**Kritický nález žádný.** Retence v Blobs nesmaže nejnovější noční otisk, otisk „před obnovou", souhrny
ani části mimo svůj otisk, a nemaže bez hotového dnešního nočního otisku a bez čerstvé podložené kopie
na Disku — ověřeno simulací 15 měsíců provozu s výpadky nocí (R1) a cílenými přelomy (rok, měsíc,
týden, letní/zimní čas, zářijové klíče, budoucí a neplatná data). Otisk po částech se na objemu ostrého
engscalc (792 zakázek, ~118 MB) vejde do limitů s rezervou (noční 1 běh ~15 s, vynucený 3 požadavky
≤ 5,7 s, i v pesimistickém modelu Blobs) a obnova z otisku po částech běží po výřezech ~1 s na požadavek.
Otisky hesel ven nejdou, všechny cesty jsou jen pro Administrátora.

**Jeden vysoký nález (K9-V1):** obnova — i jen náhled — ze **starého jednolitého** otisku (vše do
v26.10.7, po retenci Z2 hlavně měsíční 1. 9. / 1. 10.) jde z prohlížeče jedním požadavkem a u velké
databáze nestihne limit 10 s (náhled 54 s). Server výřez starého otisku umí, klient ho nepoužívá.
Hlášeno koordinaci hned (send_message).

**Šest středních:** pojistka „zálohy se mají zvětšovat" jde obejít pozvolným úbytkem (porovnává jen
se včerejškem) a nepotvrzené varování přepíše další varování; retence smaže zdroj rozběhnuté obnovy;
přehled záloh čte staré otisky bez souhrnu celé; úklid Disku věří hodinám prohlížeče.

| závažnost | počet | nálezy |
|---|---|---|
| K | 0 | — |
| V | 1 | K9-V1 |
| S | 6 | K9-S1, K9-S2 (+S2b), K9-S4, K9-S5, K9-S6 |
| N | 7 | K9-N1 … K9-N7 |
| I | 9 | K9-I1 … K9-I9 |

(K9-S3 při rozboru přeřazen na K9-N7 — reálně jen první noc.)

## Měření (R3, R3b, R7)

Smyšlená databáze v tvaru aplikace: 792 zakázek (`novaZakazka`, ~10 kB textu), 47 s přílohou 1–3,5 MB
(náhodná base64 → komprimuje se jako PDF/JPEG), šablony, podpisy, 300 zákazníků, 8 účtů; celkem 118 MB.
Model Blobs: latence na operaci + čas na MB přenosu.

| co | 40 ms/op + 20 ms/MB | 60 ms/op + 100 ms/MB | limit |
|---|---|---|---|
| noční otisk | 1 běh, 15,3 s (6,4 s CPU) | 2 běhy, nejdelší 20,7 s | 30 s, 8 běhů |
| vynucený otisk | 3 požadavky, nejdelší 5,6 s | 6 požadavků, nejdelší 6,6 s | 10 s |
| části / gzip | 38 částí, 120,5 MB dat → 79,8 MB uloženo (66 %) | totéž | — |
| kopie na Disk po stránkách | 38 stránek, max 3,7 MB, max 0,6 s | — | 6 MB, 10 s |
| náhled obnovy po výřezech (nový otisk) | 105 požadavků, max 1,1 s, celkem 65 s | — | 10 s |
| **náhled ze starého jednolitého otisku jedním požadavkem** | **53,9 s** (CPU 3,4 s) | — | 10 s |
| výřez starého otisku `cast: 0` (server umí) | 3,4 s / požadavek, 75 požadavků | — | 10 s |
| přehled záloh se starým otiskem bez souhrnu | 3,3 s za každý takový otisk | — | 10 s |
| paměť: čtení jednolitého otisku 112 MB (R3b, čerstvý proces) | Buffer 112 MB + parse +352 MB ≈ 525 MB | — | 1024 MB |
| 20 zakázek u stropu 4 MB v jedné dávce (R7) | — | krok 13,2 s | 10 s |

RSS celého testovacího procesu (458–772 MB) obsahuje i paměťové úložiště s daty — pro funkci platí odhad
z R3b. Poměr `velikostB` nového manifestu ku staré velikosti (JSON celého otisku) = **1,0000** a gzip
velikost dat nemění (R6) → první noc po přechodu pojistka nedá falešné varování ani úbytek nezakryje.

## Nálezy

Každý nález: reprodukce (`node podklady/K9_pokusy/<pokus>.mjs`, vše najednou `bash podklady/K9_pokusy/spust_vse.sh`
[`--objem`]), místo v kódu, návrh opravy s testem (pojistka: test před opravou selže, po ní projde),
„mění chování".

### K9-V1 (V) — obnova i náhled ze starého jednolitého otisku jedním požadavkem

- **Reprodukce:** `r3_objem_mereni.mjs` oddíl 5 — starý otisk 118 MB (tvar do v26.10.7, bez `casti`):
  `{ zdroj: { otisk }, nahled: true }` jedním požadavkem 53,9 s (latence 792 sekvenčních čtení; CPU 3,4 s).
  Obnova by zapisovala stejně dlouho → funkce skončí na limitu uprostřed (otisk před obnovou ji jistí,
  nic se neztratí, ale obnova je napůl a náhled vůbec nevznikne).
- **Kde:** `src/ui/online_ui.js:3274` `onlineObnovaCastiOtisku()` vrací 0, když přehled nemá `casti`
  (starý otisk — souhrn z #151 N3 ani otisk bez souhrnu `casti` nenese) → `:3312` náhled
  a `:3402` obnova jedním `onlineObnovaTelo` bez `cast`. Server (`obnova.mjs` → `ctiOtisk` celý).
- **Dopad:** z velkých starých otisků (po retenci Z2 zůstanou měsíční 1. 9. a 1. 10. — 6 měsíců) nejde
  v aplikaci obnovovat. Na engscalc staré otisky podle zadání nejsou (žádná záloha nevznikla), na
  schaftscalc ano (19 MB; stovky zakázek → také přes limit).
- **Návrh:** klient počítá starý otisk jako 1 část: `return ot ? (+ot.casti > 0 ? +ot.casti : 1) : 0`
  a jede `onlineObnovaPoCastech` (server už vrací pro `cast: 0` celý starý otisk a `otiskVyrez` ho
  krájí; ~3,4 s a ~525 MB na požadavek). Lépe navíc: přehled u starého otisku nese `stary: true`.
- **Test:** do `netlify/test_zalohy_objem.mjs` starý jednolitý otisk (z `ctiOtisk` uložený jedním blobem)
  + obnova přes klientskou smyčku (úsek `onlineObnovaPoCastech` ve vm jako `src/test_z2_disk_retence.js`)
  pod simulovaným limitem: dnes první požadavek „Task timed out", po opravě projde a doplní smazané zakázky.
- **Mění chování:** ano (jen klient — obnova starého otisku po výřezech).

### K9-S1 (S) — pojistka úbytku porovnává jen se včerejškem (pozvolný úbytek projde)

- **Reprodukce:** `r2_pojistka.mjs` R2a — každou noc −4 % zakázek a −8 % dat: 14 nocí bez varování,
  800 → 447 zakázek, 114 → 35 MB, retence mezitím smazala 33 otisků.
- **Kde:** `netlify/lib/zalohovani.mjs:752` `retencePokles` — první předchozí noční a konec.
- **Dopad:** pravidlo J. V. „zálohy se musí v čase zvětšovat" platí jen noc od noci. Data z doby před
  úbytkem dál drží týdenní (8 t) a měsíční (6 m) otisky, ale denní odcházejí bez schválení.
- **Návrh:** porovnat nový noční i s **referencí** — nejstarším nočním otiskem v denním okně (14 dní)
  nebo s posledním otiskem, ke kterému bylo varování potvrzeno; kumulativní úbytek pod prahy = varování.
  Prahy (kumulativní 90 % / 95 %?) rozhodne J. V.
- **Test:** R2a jako tabulka v `netlify/test_z2_retence.mjs`: dnes 0 varování, po opravě varování
  nejpozději 2.–3. noc a retence stojí.
- **Mění chování:** ano (víc varování, retence častěji stojí).

### K9-S2 (S) — nepotvrzené varování přepíše další varování (správce uvidí jen poslední)

- **Reprodukce:** R2b — noc 1: 800 → 400 zakázek (varování A, nepotvrzené); noc 2: 400 → 370 →
  záznam přepsán, text jen „400 → 370". R2b2 (K9-S2b): nepotvrzené varování z Disku (kopie 33 %) přepíše
  noční varování — po jeho potvrzení se úbytek na Disku už neukáže.
- **Kde:** `netlify/lib/zalohovani.mjs:799` (`retenceProved` zapisuje bez ohledu na nepotvrzené
  varování); endpoint `retence-varovani-disk` už nepřepisuje (správně), noční ano.
- **Dopad:** správce potvrdí malý úbytek a nevědomky i velký, který mezitím zmizel z hlídky — retence
  se rozběhne.
- **Návrh:** nepotvrzené varování nepřepisovat; doplnit `historie: [...]` (nebo držet `pred` prvního
  a `nove` posledního: „800 → 370 od 21. 11.") a hlídka/dialog ukáže všechna; potvrzení potvrzuje celé.
- **Test:** R2b/R2b2: dnes text bez „800" / bez Disku, po opravě obsahuje obojí a `retence-potvrdit`
  s `den` druhé noci potvrdí celý záznam (nebo 409, dokud správce nevidí vše).
- **Mění chování:** ano (text a tvar záznamu varování, potvrzení).

### K9-S4 (S) — přehled záloh čte starý otisk bez souhrnu celý

- **Reprodukce:** `r3_objem_mereni.mjs` oddíl 5 — `seznamOtisku(14)` se starým otiskem 118 MB bez
  souhrnu: 3,3 s a ~525 MB paměti (R3b) **na každý** takový otisk a každý GET přehledu (obrazovka
  Databáze, po přihlášení `onlineZalohaAuto`).
- **Kde:** `netlify/lib/zalohovani.mjs:638` (`s.cti(den)` celého otisku kvůli dvěma počtům);
  podobně `otiskPocty` (jen když chybí souhrn) a `posledniNocniKlic` (čte otisk i se souhrnem — u nového formátu jen malý manifest, u starého celý blob, dokud nejnovější noční není nový).
- **Dopad:** otisky pořízené do 19. 10. (bez souhrnu #151 N3) — po retenci Z2 měsíční 1. 9. a 1. 10.,
  6 měsíců v přehledu. Dva velké = 2 × 3,3 s + zbytek → blízko 10 s a 1 GB; přehled pak spadne
  a obrazovka hlásí „zatím žádná záloha" (přesně příznak z engscalc).
- **Návrh:** při prvním dočtení starého otisku zapsat jeho souhrn (`souhrn/<klíč>` — počty, `velikostB`,
  `stary: true`); další GET už čte jen souhrn. Případně jednorázově v noční funkci pro otisky bez souhrnu.
- **Test:** `netlify/test_zalohy.mjs`: starý otisk bez souhrnu, dva GET přehledu, počítadlo přečtených
  bajtů — dnes 2× celý otisk, po opravě 1× (a souhrn existuje).
- **Mění chování:** ne (jen výkon; souhrn navíc v úložišti).

### K9-S5 (S) — retence smaže zdroj rozběhnuté obnovy

- **Reprodukce:** `r4_soubehy.mjs` R4a — obnova z otisku 2026-10-02 (denní, mimo pravidlo) po
  výřezech; mezi dávkami noční retence → otisk pryč, další dávka „Otisk 2026-10-02 (část 0) na serveru
  není", obnoveno 8 ze 120 zakázek.
- **Kde:** `netlify/lib/zalohovani.mjs:771` `retenceProved` nezná tokeny obnovy `obnova-*`;
  `obnova.mjs` nezapisuje do tokenu, ze kterého otisku obnovuje.
- **Dopad:** obnova velkého otisku trvá desítky minut (105 požadavků ~65 s jen náhled, obnova víc);
  zahájená večer nebo v noci (správce řeší havárii) narazí na okno 2:00–3:45 UTC. Obnova skončí napůl
  (cesta zpátky = otisk před obnovou platí). Stejně kopie na Disk („mezitím zmizel").
- **Návrh:** dokud existuje živý token obnovy (`beziciObnova`), retence nemaže (`ceka: 'obnova běží'`);
  přesněji: první dávka zapíše do tokenu `zdroj` a retence vynechá jen ten klíč.
- **Test:** R4a do `netlify/test_z2_retence.mjs`: dnes otisk smazán a dávka 404, po opravě otisk zůstane
  a retence hlásí, že čeká.
- **Mění chování:** ano (retence počká na konec obnovy).

### K9-S6 (S) — úklid kopií na Disku bere „dnes" z hodin prohlížeče

- **Reprodukce:** `r5_prava_disk.mjs` — složka 33 kopií (týdenní od května + posledních 7 dní):
  správné hodiny smažou 14, hodiny o rok napřed 31 (zůstane nejnovější a právě zapsaná).
- **Kde:** `src/ui/online_ui.js:2130` volá `kopieDiskUklid(h, …)` bez `ted` → `:2080`
  `new Date(Date.now())` prohlížeče. Server přitom v odpovědi vrací svůj čas (`z.kopieDisk.kdy`).
- **Dopad:** nevratné mazání řízené hodinami počítače správce; Disk drží smazané 30 dní v koši.
- **Návrh:** předat `ted = Date.parse(z.kopieDisk.kdy)` (čas serveru) a nemazat, když se hodiny
  prohlížeče liší od serveru o víc než 1 den (hláška).
- **Test:** `src/test_z2_disk_retence.js`, simulovaná složka a `Date.now` posunutý o rok: dnes smaže
  31, po opravě stejně jako se správnými hodinami (nebo nic s hláškou).
- **Mění chování:** ne (se správnými hodinami stejné).

### K9-N1 (N) — potvrzení úbytku přepíše varování zapsané během ověření hesla

- **Reprodukce:** R2d — během `potvrdHesloSpravce` (čtení účtu, zpoždění pokusů) zapíše noc nové
  varování B; potvrzení zapíše `{ ...A, potvrzeno }` → B zmizí, retence běží.
- **Kde:** `netlify/functions/zaloha_vynuceno.mjs:124–134` (čtení–změna–zápis bez druhé kontroly).
- **Návrh:** po ověření hesla záznam přečíst znovu a zapsat jen při shodě `den` + `kdy`, jinak 409.
- **Test:** R2d (hook na čtení účtu): dnes `ok: true` a B pryč, po opravě 409 a B drží retenci.
- **Mění chování:** ne (jen souběh).

### K9-N2 (N) — varování bez platného `kdy` retenci nezastaví

- **Reprodukce:** R2e — `{ den, text }` bez `kdy` → `retenceDrzena` vrátí null, retence smaže 5 otisků.
  Nečitelný JSON naopak retenci zastaví (správně).
- **Kde:** `netlify/lib/zalohovani.mjs:720` (`if (!Number.isFinite(t)) return null`).
- **Návrh:** nepotvrzený objekt bez platného `kdy` = drženo (`{ dnu: 0 }`) — fail-closed jako u nečitelného.
- **Test:** R2e: dnes smaže, po opravě `drzeno`. **Mění chování:** ne (jen poškozený záznam).

### K9-N3 (N) — druhý noční běh po dokončení prvního smaže hotový dnešní otisk

- **Reprodukce:** R4b — běh B prošel `cti(den)` dřív, než A zapsal manifest; když B volá krok po
  dokončení A (stav už smazán), `porizOtiskKrok` hotový otisk smaže a pořizuje znovu.
- **Kde:** `netlify/lib/zalohovani.mjs:467`; `zaloha_nocni.mjs:61`. Souběh jen při „Run now"
  v Netlify nebo opakovaném spuštění — plánované běhy po 15 min se nepřekrývají.
- **Návrh:** volba `prepsatHotovy` jen pro výslovné přepořízení; noční volá bez ní a hotový vrátí jako hotovo.
- **Test:** R4b: dnes otisk zmizí, po opravě zůstane. **Mění chování:** ne.

### K9-N4 (N) — retence neověří, že nový otisk je celý

- **Reprodukce:** R4c — dnešnímu otisku chybí poslední část (ctiOtisk i kopie na Disk ji odhalí),
  retence přesto smaže 13 otisků; stačí manifest/souhrn.
- **Kde:** `netlify/lib/zalohovani.mjs:774`.
- **Návrh:** v `retenceProved` porovnat počet klíčů `casti/<novyKlic>/` (seznam už je v ruce) s
  `manifest.casti`; nesedí-li, `ceka`.
- **Test:** R4c: dnes smaže, po opravě `ceka`. **Mění chování:** ne (jen poškozený otisk).

### K9-N5 (N) — jednorázová obnova (bez fází) pořizuje otisk před obnovou naráz

- **Reprodukce:** R4e — POST `/api/obnova` bez `faze`/`obnovaId`: otisk před obnovou má `kroku: 1`
  (porizOtisk bez rozpočtu); u 118 MB ~15–20 s → nad 10 s (5xx, nic se nezapíše, zůstane rozpracovaný).
- **Kde:** `netlify/functions/obnova.mjs:523`. Klient tu cestu nepoužívá (jen API).
- **Návrh:** ostrou obnovu bez fází odmítnout 409 s odkazem na `faze: 'zacatek'`, nebo krokovat.
- **Test:** test_zalohy_objem pod limitem: dnes timeout, po opravě 409. **Mění chování:** ano (jen API).

### K9-N6 (N) — rozpočet kroku se hlídá po dávce 20 záznamů, ne po bajtech

- **Reprodukce:** `r7_davka_velkych.mjs` — 20 po sobě jdoucích zakázek u stropu 4 MB, pesimistický
  model Blobs: krok vynuceného otisku 13,2 s (limit 10 s). Postup se uloží po každé části, takže
  další krok naváže, ale prohlížeč dostane chybu a ruční záloha skončí hláškou.
- **Kde:** `netlify/lib/zalohovani.mjs:504` (kontrola času jen po dávce).
- **Návrh:** po zápisu každé části (`uloz`) zkontrolovat rozpočet a vrátit rozpracováno.
- **Test:** R7: dnes > 10 s, po opravě každý krok < 10 s. **Mění chování:** ne.

### K9-N7 (N) — bez předchozího nočního otisku se nový neporovná s ničím

- **Reprodukce:** R2f — jen vynucené otisky (800 zakázek) a první noční s 10 zakázkami: žádné
  varování, vynucené starší 7 dní se smažou. Když předchozí noční existuje (i měsíc starý), porovná se.
- **Kde:** `netlify/lib/zalohovani.mjs:752`. Reálně jen první noc po nasazení / po výpadku nočních
  otisků delším než všechny držené denní klíče.
- **Návrh:** bez nočního porovnat s nejnovějším vynuceným otiskem se souhrnem.
- **Test:** R2f: dnes bez varování, po opravě varování. **Mění chování:** ano (vzácně varování navíc).

### Informativní

- **K9-I1** Klíč vynuceného otisku nese UTC datum (0:30 Praha → předchozí den); „7 dní" ±1 den. R1.
- **K9-I2** Záznam kopie na Disk s `velikostB: 1` server přijme a odemkne retenci (R5) — obsah se
  s manifestem neporovnává. Je to záměr K3-N1 (heslo správce), ale levná kontrola „kopie ≥ 50 %
  `ulozenoB` otisku" by zachytila chybu klienta. Mění chování: ano.
- **K9-I3** Otisky „před obnovou" se nemažou nikdy a v aplikaci není nástroj, jak je smazat ručně;
  přehled ukazuje jen posledních 10. Každá obnova velké DB = ~80 MB navždy. Rozhodnutí J. V.
- **K9-I4** Otisk po krocích není okamžitý snímek (známá mez v kódu): zakázka přejmenovaná (nový klíč)
  mezi plánem a čtením v otisku chybí celá; noční otisk na 2 běhy trvá 15 min.
- **K9-I5** Složka na Disku se pozná jen podle jména „_Zaloha Netlify DB" — stejnojmenná místní složka
  mimo Disk Google projde a odemkne retenci.
- **K9-I6** Retence ukončená mezi smazáním manifestu a souhrnu nechá osiřelý `souhrn/<klíč>`;
  `uklidRozpracovane` uklízí jen části. Neviditelné, malé.
- **K9-I7** Úbytek potvrzuje a kopii na Disk zapisuje kterýkoli Administrátor svým heslem, ne jen hlavní
  účet. Otázka pro J. V.
- **K9-I8** Kopie na Disku nenese otisky hesel, podpisy a obnova ze souboru nebere ani knihu smazaných —
  po úplné ztrátě Netlify = účty a podpisy znovu (rozhodnutí J. V. 19. 10.; připomenutí).
- **K9-I9** `zaloha_nocni` nemá `path`; Netlify plánované funkce v produkci přes URL nevolá — ověřit
  na ostrém (J. V.), jinak by šlo noční běh (a K9-N3) spustit zvenku.

## Co drží (ověřeno)

- **Výběr retence (R1):** 15 měsíců simulace (10 % výpadků nocí, vynucené, „před obnovou"): nejnovější
  noční ani „před obnovou" nesmazány nikdy; výběr stabilní (co se smaže dnes, zítra by pravidlo
  nedrželo); vždy 8 týdnů s otiskem v posledních 56 dnech a každý z 5 předchozích měsíců; přelom roku
  (neděle 3. 1. 2027 drží týden, 31. 12. ne), měsíční 1. 12. a 1. 1.; noční okno 2:00–3:45 UTC je
  v Praze vždy týž den (i 25. 10. a 28. 3.); zářijové otisky → zůstane 1. 9., 1. 10. a nejnovější;
  souhrny, části, rozpracované, rezervace, tokeny a `…-pred-obnovou` (i starý tvar bez času) výběr
  nevidí; budoucí a neplatné datum se nemaže.
- **Pojistky retence:** nemaže bez dnešního hotového otisku (noční funkce jen po `cti(den)`), bez
  podložené kopie na Disk < 7 dní z 7 nejnovějších nočních, při nepotvrzeném nebo nečitelném varování.
  Potvrzení: bez hesla 401, špatné heslo odmítnuto, jiný den 409, podruhé 409; hlášení z Disku přepíše
  potvrzené varování a retence zase stojí (R2g).
- **Velikost pro pojistku** = nekomprimovaná data; gzip ani přechod ze starého formátu ji nemění (R6).
- **Otisk po částech:** přerušení uprostřed kroku neztratí víc než jednu část (test_zalohy_objem);
  úklid nesahá na živý rozpracovaný otisk (R4d); otisk bez části = výjimka s číslem části, kopie na Disk
  i obnova ji odmítnou (R4c).
- **Obnova:** dávky až po hotovém otisku před obnovou; zámky odeslaných nabídek přes společnou
  `zakazkaServerKontrola` i u obnovy z otisku po částech; účty a podpisy jen z otisku a s heslem
  (test_obnova 235/0, test_obnova_nanecisto 20/0).
- **Disk:** maže jen `otisk_RRRR-MM-DD.json(.gz)` v „_Zaloha Netlify DB", nikdy právě zapsanou ani
  nejnovější, jen po kopii přijaté serverem se sedící velikostí a SHA-256, nepotvrzené varování úklid
  zastaví; bez CompressionStream `.json`, bez DecompressionStream předchozí `.gz` → úklid skončí chybou
  a nesmaže nic (src/test_z2_disk_retence 43/0).
- **Práva (R5):** zálohy, přehled, vynucený otisk, potvrzení i obnova jen Administrátor (Vedoucí,
  Obchodník, nepřihlášený 401/403); žádná odpověď záloh (stažení, kopie na Disk, přehled, i staré cesty
  bez stránek) nenese otisk hesla; kopie na Disk má `podpisy: null`.

## Doporučené pořadí oprav

1. K9-V1 (klient, malé) — jinak nejde obnovovat ze starých otisků.
2. K9-S2 + K9-S1 + K9-N1 + K9-N2 — pojistka úbytku jako celek (prahy kumulace rozhodne J. V.).
3. K9-S5, K9-S6, K9-S4.
4. N a I podle kapacity; otázky pro J. V.: K9-S1 (kumulativní prahy), K9-I3 (nástroj na mazání
   otisků před obnovou), K9-I7 (kdo smí potvrzovat), K9-I9 (ověřit URL plánované funkce).

## Reprodukce

`podklady/K9_pokusy/` — `spolecne.mjs` (paměťové úložiště s binárními bloby, latencí, háčky, posunem
hodin), `r1_retence_simulace`, `r2_pojistka`, `r3_objem_mereni` (+ výstupy `r3_vystup_40ms.txt`,
`r3_vystup_pesimisticky.txt`), `r3b_pamet_jednolity` (+ `r3b_vystup.txt`), `r4_soubehy`,
`r5_prava_disk`, `r6_velikost_formaty`, `r7_davka_velkych`, `spust_vse.sh`. Každý nález vypíše
„REPRODUKOVÁNO K9-…"; kontroly „co drží" OK/FAIL. Stav 26. 10.: všechny nálezy reprodukovány,
kontroly 31 OK / 0 FAIL.
