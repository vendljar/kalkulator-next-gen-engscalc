# Etapa B — plán plateb PROJ: podklad k implementaci (29. 9. 2026)

Zdroj `origin/test-draft` 57ebc02 (v29.9.4); větev `claude/etapa-b-plan-plateb-proj`. Podklady:
`podklady/NAVRH_PLATEBNI_PODMINKY_2026-09-29.md` odd. 3 a 7, roadmapa #367, #366 (P9.3), PREDAVKA úkol 2,
prototyp https://claude.ai/artifact/6sbxbaAsBpphfPfE2wnM3a (katalog milníků, texty, `rozpocitej()`, `projSplatky()`).

## 1. Co je závazné (J. V. 29. 9. + koncept odd. 3)

- **Jeden plán v krycím listu PROJ**, ostatní jen čtou: nabídka PROJ (online i Word PROJ v4), krycí list
  (tisk, věta za činnost), SoD PROJ (dopočet), Nastavení → Firma (výchozí plán). Plán = pro každou
  **nabízenou** činnost (sekce s cenou) splátky **procento + milník** (z katalogu, nebo vlastní text).
- **Čtyři předvolby:** Standard po činnostech (= dnešní procenta v `nabidka_proj.js`), Záloha + zbytek po
  předání (= dnešní krycí list: záloha 30/50/70 % nebo bez), 100 % po dokončení stupně (= dnešní věta
  v Nastavení), Vlastní. **Výchozí Standard.** Předvolba jde upravit (štítek „upraveno").
- **SoD PROJ (P9.3):** splátka = procento × **cena činnosti po slevě**; splátky se **stejným milníkem**
  napříč činnostmi **sečíst do jedné platby**; **zaokrouhlení nese poslední splátka** činnosti; **ruční
  přepis částky** zůstává (prázdné = dopočet, ↺ vrátí).
- **Zábrany:** součet plateb SoD = cena díla; u každé nabízené činnosti součet 100 % (kladná %, známý milník);
  dokument nevznikne, odklepnout nejde. **Autorský dozor** 100 % měsíčně, **mimo splátky** SoD (v plánu jen info).
- **Šablona SoD PROJ: seznam plateb jedním symbolem** místo `SODP_PLATBA1_KC…8_KC` (prototyp
  `{{SODP_PLATEBNI_KALENDAR}}`). Bez `Sablona_SOD_PROJEKCE.docx` (#350, Disk) udělat dopočet + symbol
  a úpravu šablony nechat na J. V. (napsat to). Nabídka PROJ v4 přes `vyrob_sablony.js` i EN/DE/FR.
- **Převod starších zakázek** (`zaloha`, `faktZamereni/faktDpz/faktDps`, `sodpPlatba1–8`) bez ztráty ručních
  částek; odeslané (zamčené) nabídky se nesmí změnit (P9.5, A1). Roadmapa: #367 B hotová, nové položky od #373.

**Nedělat:** etapa A (OCK kalendář v krycím listu OCK, milníky OCK s EN/DE/FR a větami o podmínce úhrady,
věta o měsíční fakturaci, `{{PODM_PLATEBNI_KALENDAR}}`, šablona CN v14, `SOD_PLATBAn_KC`, převod
`zaloha1/faktura2/fakturaKonc` — `kryci.js`, `nabidka.js`); etapa C (číslo smlouvy; chybí čísla OPR/OVP); N46.

## 2. Dnešní stav kódu (test-draft)

**Nabídka PROJ — `src/nabidka_proj.js`**
- Pevné bloky `typ:'pary'` 296–327: ZA 296–299 (50/50, „z celkové ceny za zaměření"), SP 300–304 (sekce
  `studie`, 50/40/10, 10 % „po předání vyjádření odboru památkové péče HMP"), DPZ 305–309 (50/30/20),
  IČ 310–314 (50/30/20, „po vydání povolení záměru"), **DPS+EZC v jednom bloku** 315–320, kolaudace
  321–324 (50/50), AD 325–327 (bez `sekce` → vždy). Pro `projednani` a `geodet` blok **není**.
- Viditelnost `vRozsahu` 510, `blokVRozsahu/radekVRozsahu` 516–521, render `pary` 603–604 (online náhled
  generický, `src/ui/nabidka_proj_ui.js:231–233`); obchodní blok 294 → 592–602.
- Ceny: `cenyPo[k] = zaokrouhli(s.celkem × (1 − pSleva), zaokrProjZ(d))` 407–415 (EN/DE/FR eura po
  sekcích), `pSleva` jen schválená 404–405, `slevaZvlast` 425–427 (SoD = `false` → po slevě), cena díla
  `celkemBezDph = Σ cenyPo` nabízených 438 (= `PROJ_CELKEM_BEZ_DPH` 715). Placeholders 666–739, PODM 751,
  návrat 762–773, registrace `sablonaSymboly:true` 785–793 (builder zná symboly šablony), exporty 796.
- `s.celkem` = (náklad + doprava) × (1 + % sekce) (`src/engine_proj.js:216–223`); `zaokrouhli`
  `src/zaokrouhleni.js:120–131` (vypnuto → haléře); `cenaNabidkyProj` 215–242 (táž cena, po činnostech).

**Krycí list PROJ — `src/kryci_proj.js`, `src/ui/kryci_proj_ui.js`**
- „Platební podmínky" 190–228: `zpusobFakturace` 199–201 (prefill `firmaHodnota(zpusobFakturaceProj)` || „po dokončení
  jednotlivých stupňů dokumentace"), `faktZamereni` 202 („100 % po předání výstupů"), `faktDpz` 203 a `faktDps` 204
  („100 % po odevzdání dokumentace"), `zaloha` 209–210 (`KRYCI_PROJ_ZALOHY` 29: Bez zálohy/30/50/70 %, výchozí 50 %).
- „Smlouva o dílo — splátky" 271–290: `sodpPlatba1…8` (`sod:'SODP_PLATBAn_KC'`, ruční text; nápověda `kryciProjSekceKc`
  403–406 z ceny **před slevou**); poplatky, pokuta 288–289 zůstávají. Komentář 257–270 („ZÁMĚRNĚ nedopočítávají") zastará.
- Hodnota: ruční `data.kryciProj.hodnoty` > `zmrazeno` (zamčená) > prefill (`kryciProjHodnota` 430–441);
  `kryciProjCtx` 323–372; `kryciProjZmrazPodminky` 375–392 (z `zamekPoTisku`, `src/ui/zamek_ui.js:236–240`);
  `kryciProjSodSymboly` 410–420 plní jen neprázdné (prázdný symbol zůstane `{{…}}`).
- PODM symboly ze sekcí „Typ smlouvy" + „Platební podmínky" (`KRYCI_PROJ_NABIDKA_SEKCE` 475, 481–487 →
  `src/kryci.js:593–616`): mj. `PODM_ZALOHA(_PROC)`, `PODM_FAKT_ZAMERENI/DPZ/DPS`, `PODM_ZPUSOB_FAKTURACE`.
- UI: `klpSet/klpReset` 8–14 (`KLP = v.data.kryciProj`, `common.js:46`), `klpRow` 34–75 (read-only typ **chybí**),
  karta podmínek v nabídce `kryciProjPodminkyBlok` 82–102, `renderKryciProj` 104–151.

**SoD PROJ — `src/sod.js`** `sodProjData` 104–119 = `nabidkaProjData(…, {slevaZvlast:false})` + objednatel
+ `kryciProjSodSymboly` (116); `SODP_PLATBAn_KC` jen z ručních polí; registrace 151–154 bez `sablonaSymboly`;
karta `src/ui/sod_ui.js:121–135`; SoD se tiskne v jazyce tisku (`sodJazyk` 29–33).

**Nastavení → Firma** `src/firma.js`: `zpusobFakturaceProj` 69 (`FIRMA_FAKTURACE_PROJ`), výchozí věta 275;
UI `src/ui/nastaveni_ui.js` `nastSmluvniStandardy` 840–869, `firmaSet` 90–99. Zveřejnění: `firmaLzeZverejnit`
461–491 **odmítne ne-řetězec** v poli `FIRMA_POLE` (478–484), `firmaKZverejneni` 499–508 **kopíruje jen
`FIRMA_POLE` + logo**, `firmaShodaSOnline` 539–551; server `netlify/functions/firma.mjs:46–48` (mutace
`netlify/mutace.mjs:765–766` páruje přesný text — neměnit). `src/konfigurace.js:47–51`: firma se z výchozích
**nedoplňuje** → chybějící klíč = záloha v kódu.

**Data, migrace, zámek, brány**
- Migrace KL PROJ `src/zakazka.js:797–799`; server migruje týmž kódem (`netlify/lib/jadro_moduly.cjs:59–63`,
  pořadí = CORE `build.py:26–33`) a zamčené varianty porovná „migrované s migrovaným"
  (`zakazka_kontrola.mjs:121–125, 154–161` → 409; hlídá `src/test_zamek_historie.js`). Po odeslání nejdou měnit data
  varianty vč. `kryciProj` (`klpSet/klpReset` v `ZAMEK_CHRANENE`, `src/ui/zamek_ui.js:53`); výsledek PROJ zamčené
  z otisku (`src/zamek.js:187–193`); protokol změn `src/protokol.js:286`.
- `kontrolyProved` (`src/kontroly.js:628–654`, úroveň 1 = zábrana, 49) jen hlásí; dokument zastaví jen
  `dokumentZabrana(typ)` v `dokumentVygeneruj` (`src/dokumenty.js:28–31`; dnes jen prázdný ceník,
  `src/ui/ukazkove_ui.js:96–101`) a náhled PROJ (`nabidka_proj_ui.js:197`). Šablonová pravidla PROJ
  `kontroly.js:510–544` + `kontrolySablonaNabidkaProj` (`src/ui/kontroly_ui.js:107–112`).
- `nastroje/vyrob_sablony.js`: CN v13 + PROJ v3 z CN v12/PROJ v2 (`projV3` 110–153, main 188–209,
  `znacka()` 62–63, mutace `docxPrelozSablonu`); šablony v repu ani kontejneru nejsou. Blok se značkami
  zmizí i s nadpisem, když je prázdný (`src/docxgen.js:196–217`); `\n` → `<w:br/>` (116–122).
- Překlady: nadpisy bloků `src/preklad.js:764–770`, celé věty řádků 827–858, vzory `PREKLAD_VZORY`
  1013–1056. Zahraniční PROJ nerealizujeme (`kontroly.js:545–562`).

## 3. Návrh

**3.1 Nový modul `src/plan_plateb.js`** (bez DOM; CORE za `zpracovatel.js`, na serveru do `jadro_moduly.cjs`
za `firma.js`): `PLAN_PROJ_VYCHOZI` (katalog + předvolby), `PLAN_PROJ_PUVODNI` (doslovná kopie bloků
296–324), `PLAN_SODP_LEGACY`, `planPlatebEfektivni(v, firma)`, `planPlatebDopocet(ceny, plan, katalog)`,
`planPlatebKontrola()`, `planPlatebBloky(…, P)`, `planPlatebSodText()`, `planCastkaZTextu()`, `planPlatebZmraz()`,
`planPlatebZabrana(typ, zak, v)`. Validátor firemní části `planPlatebFirmaPlatny()` do `firma.js`.

**3.2 Data varianty** — `varianta.data.kryciProj.planPlateb` (chybí = výchozí; klon zdědí):
```
{ v:1, predvolba:'std'|'zaloha'|'sto'|'vlastni', zaloha:50,          // zaloha jen u 'zaloha' (0/30/50/70)
  cinnosti:{ dpz:[{p:40,m:'podpis'},{p:60,m:'dpz_su'}], ic:[{p:100,m:'vlastni',t:'po …'}] },  // jen upravené
  prepis:{ podpis:95880, 'v:po …':12000 } }                           // ruční částky plateb SoD (Kč)
```
Řídký přepis (jako „ruční > prefill"): chybí `cinnosti[k]` → řádky z předvolby; ↺ smaže přepis činnosti,
změna předvolby smaže přepisy (s potvrzením). Sčítání podle milníku napevno. Snímek při prvním zamčení
`data.kryciProj.zmrazenoPlan = {predvolba, zaloha, cinnosti:{<nabízené>:[{p,m,t:text milníku}]}}` — čte se
jen u zamčené (P9.5); samostatný klíč (test P9.5 čeká v `zmrazeno` jen id polí).

**3.3 Katalog a předvolby** — `NAST.firma.planPlatebProj`:
```
{ v:1, vychozi:'std', zalohaPct:50, milniky:[{id:'podpis', cz:'po podpisu smlouvy / objednávky'}, …],
  standard:{ zamereni:[{p:50,m:'podpis'},{p:50,m:'za_vystupy'}], … },
  predani:{ zamereni:'za_vystupy', studie:'sp_predani', projednani:'sp_pamatky', dpz:'dpz_su',
            ic:'ic_povoleni', dps:'dps_predani', ezc:'ezc_predani', kolaudace:'kol_po', geodet:'geo_predani' } }
```
- Katalog z prototypu (id stálé, pořadí = pořadí plateb SoD): `podpis`, `za_vystupy` (po zhotovení výstupů ze zaměření),
  `sp_predani` (po předání studie proveditelnosti), `sp_pamatky` (po předání vyjádření odboru památkové péče HMP),
  `dpz_doss`/`dpz_su` (po dokončení dokumentace pro povolení záměru v rozsahu pro podání na dotčené orgány / na stavební
  úřad), `ic_podani` (po získání stanovisek dotčených orgánů a po podání dokumentace na stavební úřad a zahájení řízení),
  `ic_povoleni` (po vydání pravomocného povolení záměru), `dps_predani` (po předání kompletní dokumentace pro provedení
  stavby (DPS)), `ezc_predani` (po předání ekonomické zadávací části (EZC)), `vyber` (po doporučení dodavatele realizace),
  `kol_pred` (před zahájením kolaudačního řízení), `kol_po` (po vydání kolaudačního rozhodnutí), `geo_predani` (po předání
  geodetického zaměření).
- Standard: ZA 50 podpis/50 za_vystupy; studie 50/40/10 (podpis, sp_predani, sp_pamatky); DPZ 50/30/20
  (podpis, dpz_doss, dpz_su); IČ 50/30/20 (podpis, ic_podani, ic_povoleni); DPS a EZC 50/50; kolaudace 50/50
  (kol_pred, kol_po); geodet 100 geo_predani; projednání Q1. Záloha: `[z% podpis, (100−z)% predani[k]]`,
  bez zálohy a 100 %: `[100% predani[k]]`; Vlastní: přepisy, chybějící činnost spadne na Standard.
- Zveřejnění: `firmaKZverejneni` nese i `planPlatebProj` (po validaci: typy, id `^[a-z0-9_]{1,30}$`, p 0–100,
  stropy řádků a délek, odkazy na existující id), `firmaLzeZverejnit` ho validuje, `firmaShodaSOnline` porovná
  JSON, `DEFAULT_FIRMA.planPlatebProj = PLAN_PROJ_VYCHOZI`. Odebrat milník jen nepoužitý v předvolbách;
  neznámé id ve variantě = zábrana. UI v `nastSmluvniStandardy`: výchozí předvolba, záloha %, katalog
  (text, přidat, odebrat), Standard (min. shrnutí + „převzít z otevřené zakázky") — rozsah Q8.

**3.4 Výpočet** (`ceny` = `cenyPo` nabízených, pro SoD `slevaZvlast:false`):
- Činnost k: `kc_i = Math.round(cena_k × p_i / 100)` pro i < n, poslední `= round2(cena_k − Σ)` → Σ činnosti
  = cena činnosti na haléř, Σ všech = `celkemBezDph` (prototyp: celé Kč; Q4).
- Skupina = id milníku, vlastní `'v:' + text.trim().toLowerCase()`; řazení dle katalogu, vlastní na konci;
  `casti:[{k,p,kc}]` pro „složení" (50 % ZA + 50 % DPZ …). `castka = prepis[klic] ?? vypocet`;
  `sedi = Math.round(soucet×100) === Math.round(cena×100)`. Přepis bez skupiny = osiřelý (varování, nepočítá
  se). V EUR dokumentu jen dopočet (přepis v Kč neplatí, varování).

**3.5 Výstupy**
- **Nabídka online:** místo 296–324 záznam `{typ:'platby'}`, při skládání bloků (541–645) rozvinout (flatMap)
  na `pary` za každou nabízenou činnost: „PLATEBNÍ PODMÍNKY " + ZAMĚŘENÍ / STUDIE PROVEDITELNOSTI (SP) / DPZ /
  INŽENÝRSKÉ ČINNOSTI (IČ) / DPS / EZC / PRO ZAJIŠTĚNÍ KOLAUDAČNÍHO ŘÍZENÍ / GEODETICKÉHO ZAMĚŘENÍ (+ projednání),
  řádky `['Platba ' + milník, p + ' % z nabídkové ceny ' + za]` (za zaměření, za studii, za DPZ, za IČ, za DPS,
  za EZC, za tuto činnost, za geodetické zaměření). AD 325–327 beze změny. Zamčená bez snímku → `PLAN_PROJ_PUVODNI`.
- **Word PROJ v4:** `PROJ_PLATBY_<SEKCE>` (ZAMERENI…GEODET, řádky `\n`, prázdné u nenabízené) v bloku
  `{{PLATBY_<SEKCE>_ZAC}}` nadpis + symbol `{{PLATBY_<SEKCE>_KON}}`; navíc souhrn `PROJ_PLATEBNI_PODMINKY`.
  `projV4` ve `vyrob_sablony.js`: rozsah od „PLATEBNÍ PODMÍNKY ZAMĚŘENÍ" po „…AUTORSKÉHO DOZORU" nahradí
  bloky (styl nadpisu klonovat), bez kotev chyba; vstup PROJ v3 (má-li `PROJ_SLEVA_KC`, v3 přeskočit), výstup
  `Sablona_NABIDKA_PROJ_v4` + `_EN/_DE/_FR`. Tvar plateb ve v3 (tabulky × odstavce) ověřit na skutečném souboru.
- **SoD PROJ:** `SODP_PLATEBNI_KALENDAR` = řádky „Platba 1 po podpisu smlouvy / objednávky: 95 880,00 Kč"
  (`mena.fmt`) z `d.platbyProj` (připojit k návratu `nabidkaProjData`); `SODP_PLATBAn_KC` dál jen z ručních částek
  (stará šablona beze změny); registraci `sodProj` dát `sablonaSymboly:true`. Věta o AD — Q7.
- **Krycí list:** v „Platební podmínky" místo `zaloha/fakt*` editor plánu (vlastní karta, i v
  `kryciProjPodminkyBlok`); tisk řádky „Plán plateb — ZA: 50 % po podpisu … · 50 % po …" jako pevná read-only
  pseudo-pole `plan_<k>` (počty řádků v testech zůstanou deterministické); „SoD — splátky": milník / složení /
  dopočet / ve smlouvě (přepis) / ↺ + součet vs cena díla. `zpusobFakturace` z předvolby (Q10). Používá-li PROJ v3
  `PODM_ZALOHA`/`PODM_FAKT_*` (ověřit `sablonaSymboly`), plnit je shrnutím plánu.

**3.6 Zábrany a varování** — pravidla v `KONTROLY` (za `polozkyNavicWordProj`, `zabranaMozna:true`): `planPlateb100`
(≠ 100 %, p ≤ 0, bez milníku, neznámé id) a `planPlatebSoucet` (Σ SoD ≠ cena díla) úrovně 1; varování: ruční přepis,
osiřelý přepis, vlastní milník v cizím jazyce, šablona bez nových symbolů při plánu ≠ Standard (vzor `slevaWordProj`).
Skutečná brána `planPlatebZabrana` pro `nabidkaProj`, `nabidkaProjTisk`, `sodProj` z `dokumentZabrana(typ)`/
`dokumentVygeneruj` (náhled předá typ); kontext kontrol (`kontroly_ui.js:32–93`) doplnit o plán (jedno `nabidkaProjData`).

**3.7 Převod starších zakázek (líně, bez zápisu v `importZakazka`)** — kvůli paritě prohlížeč × server
a 409 u zamčených; nic nečíst z NAST (server má `DEFAULT_FIRMA`). `planPlatebEfektivni`: `planPlateb` →
(zamčená) `zmrazenoPlan` → (zamčená bez snímku) `PLAN_PROJ_PUVODNI` → výchozí předvolba Firmy.
- `sodpPlatbaN` → přepis skupiny dle `PLAN_SODP_LEGACY` = [podpis, za_vystupy, dpz_doss, dpz_su, ic_povoleni,
  dps_predani, ezc_predani, vyber]; `planCastkaZTextu` („95 880 Kč", nbsp, čárka), nečitelné → varování,
  nezahodit; chybí skupina (typicky 8 `vyber`) → osiřelá částka + zábrana součtu. Při první úpravě plánu
  (jen odemčená) zhmotnit do `planPlateb.prepis`, staré klíče přesunout (zapíše protokol).
- `zaloha`, `fakt*`: nechat v datech, v kartě „dřívější znění krycího listu" + tlačítko „použít jako předvolbu
  Záloha X %"; automaticky nepřepínat (Q5).

**3.8 Kam co zapojit**

| místo | změna |
|---|---|
| `src/plan_plateb.js` (nový), `build.py:26–33`, `jadro_moduly.cjs:61` | modul, CORE, server |
| `src/nabidka_proj.js:296–324, 541–645, 666–739, 762–773, 796` | `{typ:'platby'}`, bloky, symboly, `platbyProj` |
| `src/sod.js:104–119, 151–154` | `SODP_PLATEBNI_KALENDAR`, `sablonaSymboly:true` |
| `src/kryci_proj.js:190–228, 257–290, 323–420, 481–487` | pole, pseudo-pole, snímek, legacy symboly |
| `src/ui/kryci_proj_ui.js:82–151`, `src/ui/sod_ui.js:121–135` | editor plánu, tabulka plateb, texty |
| `src/ui/zamek_ui.js:22–53, 236–240` | nové settery do `ZAMEK_CHRANENE`, `planPlatebZmraz` |
| `src/firma.js:69, 270–281, 461–551`, `src/ui/nastaveni_ui.js:840–869` | výchozí, validace, UI |
| `src/kontroly.js:510–562`, `src/ui/kontroly_ui.js:32–112` | pravidla, kontext, šablona SoD |
| `src/dokumenty.js:28–45`, `src/ui/ukazkove_ui.js:96–101`, `nabidka_proj_ui.js:197` | brána |
| `src/protokol.js:286`, `src/preklad.js:764–858, 1013–1056` | `planPlateb` v protokolu; překlady, vzor % |
| `nastroje/vyrob_sablony.js:110–209` | `projV4` + mutace |

## 4. Testy

**Dotčené (upravit s odůvodněním):** `src/test_nabidka_proj.js:75–77` (7 pevných bloků); `src/test_sod.js`
71–72, 146–157 (legacy `SODP_PLATBA1_KC` má platit dál); `src/test_kryci_proj_model.js:372–381` (`PODM_ZALOHA`,
`PODM_FAKT_ZAMERENI`) a 403–406 (počty řádků); `src/test_standardy.js:55–69, 134–137` (`zpusobFakturaceProj`),
198–213 (výběr zálohy PROJ); `src/test_nabidka_plat.js:170–178` (PROJ `PODM_ZPUSOB_FAKTURACE` ≠ OCK);
`src/test_rozhodnuti_k16.js:133–171` (P9.5); `src/test_kontroly.js:166` (23 pravidel), 365–367 (seznam zábran);
`overit_proj17.mjs:147–151` (nadpisy „PLATEBNÍ PODMÍNKY ZAMĚŘENÍ/STUDIE" zachovat), `overit_sod.mjs:171–172`,
`overit_nabidka_proj_word.mjs`, `overit_podminky.mjs`, `overit_xss.mjs:185–187, 211, 217` (do fixtury plán
s vlastním milníkem + katalog), `overit_lista.mjs:295–302` (nové settery). Regresně: `test_proj_sleva_nabidka`,
`test_mena` (EUR), `test_uvod_proj`, `test_k16_proj_word`, `test_nabidka_proj_duplicita/_polozky`,
`test_kryci_proj_docx`, `test_zamek_historie`, `test_fuzz_invarianty`, `netlify/test_funkce.mjs:181–200`.

**Nové (každý doložit FAIL před / OK po, zapsat do commitu):**
1. `src/test_plan_plateb.js`: Standard = dnešní procenta všech bloků, výchozí `std`; Záloha 30 %, Bez zálohy,
   100 %; dopočet z ceny po slevě (sleva 10 %); poslední splátka nese zaokrouhlení (cena s haléři); sčítání
   `podpis` přes ZA+DPZ+IČ; pořadí dle katalogu, vlastní na konci a sečtené podle textu; neoceněná činnost mimo;
   přepis, ↺, osiřelý přepis; kontrola 90 % / p ≤ 0 / bez milníku / neznámé id; převod `sodpPlatba1` → `podpis`,
   `sodpPlatba8` bez skupiny → varování; `planCastkaZTextu`.
2. Nabídka: bloky jen nabízených činností, AD vždy, `PROJ_PLATBY_*` prázdné právě u nenabízených; zamčená bez
   snímku dává bloky **shodné** s dnešními (kopie 296–327).
3. Snímek: zamčení → `zmrazenoPlan`; změna Firmy nezmění zamčenou nabídku ani SoD, po odemčení platí Firma;
   fixtura se starým KL PROJ (`sodpPlatbaN`, `zaloha`) v zamčené variantě do `src/fixtury/` (uložení bez 409).
4. SoD: `SODP_PLATEBNI_KALENDAR` i bez ručních částek, Σ = `PROJ_CELKEM_BEZ_DPH`; `planPlatebZabrana('sodProj')`
   dá důvod při nesouhlasu a `dokumentVygeneruj` vyhodí chybu.
5. Kontroly: nová pravidla úrovně 1, zdravá zakázka mlčí. 6. Firma: výchozí `planPlatebProj`, nese ho `firmaKZverejneni`,
   validátor odmítne vadný tvar, `firmaShodaSOnline` pozná změnu, server round-trip `/api/firma`. 7. Fuzz P6: Σ plateb =
   cena díla, Σ činnosti = cena činnosti, nic záporného ani NaN.
8. Šablona: syntetické XML (vzor `test_bloky_sablony.js`) pro `projV4` — bloky se značkami, nenabízená činnost
   zmizí s nadpisem, AD nedotčen, chybějící kotva = chyba.
9. Překlad EN/DE/FR nových nadpisů, 14 milníků a vzoru „N % z nabídkové ceny za …"; 10. protokol „Plán plateb PROJ".
Volitelně mutace jádra pro `plan_plateb.js` (poslední splátka, sčítání, sleva, neoceněná činnost).

## 5. Rizika a otevřené otázky

**Rizika**
- Historie: zamčené nabídky musí tisknout totéž (`PLAN_PROJ_PUVODNI` + snímek); SoD starší zamčené varianty
  s částečnými ručními splátkami narazí na zábranu součtu → jen z klonu (Q6).
- Parita prohlížeč × server (N43/409): žádný zápis v migraci, nic z NAST, modul v CORE i `jadro_moduly.cjs`.
- Firemní předvolby se dnes na server nedostanou (`firmaKZverejneni`), ne-řetězec odmítne validace; obchodník do
  zveřejnění uvidí výchozí z kódu; text `firma.mjs:46–48` neměnit (mutace). Po odeslání nabídky nejde plán ani
  přepis měnit (zámek dat varianty) → ruční částky SoD před odesláním, jinak klon.
- Šablony nejsou v kontejneru (PROJ v3, SoD PROJ) → jen syntetické testy, harnessy bez `KNG_PODKLADY` přeskočí;
  do nahrání v4 tiskne Word pevné standardní podmínky → varování/zábrana.
- Viditelné změny rozpracovaných nabídek: obecnější znění řádků, DPS a EZC zvlášť, nové bloky GEODET/PROJEDNÁNÍ,
  IČ „pravomocného povolení"; nové řetězce do slovníku EN/DE/FR.
- Haléře při vypnutém obchodním zaokrouhlení; EUR × ruční přepis v Kč; XSS (vlastní milník a katalog escapovat
  v UI i tisku); výkon (`nabidkaProjData` vícekrát na vykreslení).
- Konflikty s `claude/oprava-sesti-nalezu-v29.9.1` (`kontroly.js` počet pravidel, `docxgen.js`, `zamek.js`,
  `kalk_proj.js`, `uloziste.js`); čísla roadmapy od #373.

**Otázky pro J. V.** (navržená výchozí odpověď kurzívou)
- Q1 Projednání studie (`projednani`) — vlastní plán? *Standard 100 % „po předání vyjádření OPP HMP".*
- Q2 Geodet 100 % „po předání geodetického zaměření" (dnes bez podmínek)? *Ano.*
- Q3 SP 10 % „po předání vyjádření OPP HMP", i když projednání není nabízeno? *Ponechat, upozornit.*
- Q4 Splátky na celé koruny, poslední dorovná (i haléře)? *Ano (jako prototyp).*
- Q5 Rozpracovaná starší zakázka s ruční „Záloha 30 %" — přepnout předvolbu? *Nepřepínat, nabídnout.*
- Q6 Starší zamčená varianta, ruční splátky nesedí s cenou — zábrana, nebo varování? *Zábrana, klon.*
- Q7 Věta o AD ve SoD symbolem `SODP_AUTORSKY_DOZOR`, nebo napevno v šabloně? *V šabloně.*
- Q8 Upravuje administrátor i procenta Standardu, nebo stačí katalog + výchozí předvolba? *Obojí (převzetím).*
- Q9 Milníky projekce jen česky, cizí jazyk přes slovník, vlastní milník česky s varováním? *Ano.*
- Q10 Větu „Způsob fakturace — projekce" nahradit předvolbou, `PODM_ZPUSOB_FAKTURACE` z předvolby? *Ano, pole skrýt.*
- Q11 Dodat `Sablona_SOD_PROJEKCE.docx` (#350) a potvrdit formát řádku seznamu plateb.
- Q12 Znění řádků „Platba {milník} | N % z nabídkové ceny za {činnost}" místo dnešních vět? *Ano.*
