# Nezávislé ověření: příznaky strany `jenProj` / `jenOck` po zámku a po prodeji

Stav kódu: pracovní strom = `origin/test` v19.11.11 (`git diff origin/test HEAD -- netlify src server` je prázdný),
`origin/main` v11.11.1 vyexportován přes `git archive` do `overeni/main`. Jen čtení kódu a pokus v Node
nad paměťovým úložištěm. Složku `podklady/audit_2026-11-20/` ani `cocka_*.md` jsem nečetl.

Pokus: `overeni/pokus_strana.mjs` (argument = kořen stromu; `MINM=0.9` zapne minimální marži).
Výstupy: `overeni/vystup_test.txt`, `vystup_test_minm.txt`, `vystup_main.txt`, `vystup_main_minm.txt`.
Ve výstupech nejsou částky, jen HTTP kódy, strany a poměry.

## Souhrn

| | Závěr |
|---|---|
| (a) změna příznaku po zámku / po prodeji | **NEDRŽÍ** — server ji neposuzuje vůbec, projde autorovi i cizímu obchodníkovi (HTTP 200) |
| (b) dodatečné posouzení vyřazené strany | **NEDRŽÍ** — po vypnutí příznaku server stranu neposoudí; posoudí ji jen při dotisku, a i tam chybí kontrola potvrzení ruční ceny |
| (c) dopad na controlling / hodnotu dealu / dokumenty | **NEDRŽÍ** — vedoucí strana se bere z aktuálního příznaku, ne ze stavu při zámku / prodeji |
| (d) `origin/main` | **platí totéž, o stupeň hůř** — dotisk OCK projde i s ruční cenou bez zdroje |

## Jak to funguje (kód, test)

- Vyřazenou stranu určuje jediné pravidlo `zakazkaVedouciStrana` / `zakazkaVyrazenaStrana`
  (`src/zakazka.js:650-665`): příznaky mají přednost před číslem nabídky. U čísla řady OPR tedy
  `jenProj=true` znamená „vede PROJ, OCK vyřazená“ a `jenProj=false` „vede OCK, PROJ vyřazená“.
  Přepnutí příznaku u zakázky s číslem tedy stranu nepřidá, ale **prohodí**.
- Příznaky nejsou v datech varianty (`v.data`), takže je nehlídá porovnání zamčených dat
  (`netlify/lib/zakazka_kontrola.mjs:573-593`, `src/zamek.js:647`). Nejsou ani mezi zmrazenými cestami
  hlavičky: `zamekZakCesty` (`src/zamek.js:510-521`) bere jen pole krycích listů s `bind: 'ZAK.…'`
  a `ZAMEK_ZAK_PO_SOD` (`src/zamek.js:508`); `zamekZakZmeny` (`src/zamek.js:594-626`) porovnává jen tyto cesty.
- `prodServer` (`src/objednane.js:619-694`) hlídá jen záznam prodeje (tvar, zámek, jedna varianta, kdo smí
  prodat, datum, odemčení). Na příznaky strany ani na obsah vyřazené strany nesahá.
- `objKontrola`, `ctrlPdDealKontrola` a spol. příznaky neposuzují. V `zakazka_kontrola.mjs` se příznaky
  jen ČTOU (řádky 199-200, 208, 232, 243-244, 253) — k výběru, které kontroly vynechat.
- Obecné uložení nemá kontrolu vlastníka: autor se jen drží z uložené verze
  (`zakazka_kontrola.mjs:679-694`); vlastnictví se ptá jen prodej (`objednane.js:663`) a interní poznámky
  (`zakazka_kontrola.mjs:664-677`). Proto příznak změní i obchodník, který autorem není.

## (a) Změna příznaku obyčejným uložením — NEDRŽÍ

Předpoklady útočníka: přihlášená role Obchodník; stačí znát / načíst zakázku (GET `/api/zakazky?soubor=`
je pro každého přihlášeného) a poslat ji zpět s platným `ocekavaneRazitko` a jinou hodnotou příznaku.
Nemusí být autor. Stav zakázky: libovolný — zamčená varianta i Prodáno.

Výstup pokusu (test v19.11.11):

```
1b autor: uložení JEN se změnou jenProj true→false (zamčená varianta) → HTTP 200
2b CIZÍ obchodník: změna jenProj true→false u cizí zamčené zakázky → HTTP 200
   uloženo jenProj=false, autor=autor.strana@priklad.cz, upravil=cizi.strana@priklad.cz
2c CIZÍ obchodník: Prodáno u cizí zakázky → HTTP 403   (prodej hlídaný je)
2d CIZÍ obchodník: jenOck false→true u cizí zamčené zakázky → HTTP 200
3c AUTOR: jenProj false→true u PRODANÉ zakázky → HTTP 200
3d CIZÍ obchodník: jenProj true→false u PRODANÉ cizí zakázky → HTTP 200
3e CIZÍ obchodník: jenOck false→true u PRODANÉ cizí zakázky → HTTP 200
5b vypnutí jenOck po zámku (číslo OVP) → HTTP 200
```

Server o změně příznaku nezapíše žádnou vlastní stopu (jen `upravil` = poslední ukládající;
`prodejHistorie` zůstala na 1 záznamu). Klientský průvodce přitom u zakázky s odeslanou variantou
přepnutí `jenOck` záměrně nenabízí (`src/zakazka.js:736-742`, B129) — serverová obdoba chybí.
Zaškrtávátko `jenProj` v Kalkulaci PROJ (`src/ui/kalk_proj.js:529`) a `jenOck` (`src/ui/common.js:2122-2123`)
volají obyčejné `set('ZAK.…')`.

## (b) Kontroly vyřazené strany při zámku a po vypnutí příznaku — NEDRŽÍ

Při NOVÉM zámku s vyřazenou OCK (`jenProj=true`) server u strany OCK **vynechá**:

| Kontrola | Kde se vynechává |
|---|---|
| ceník bez cen, nulová / nečíselná cena OCK | `zamekNovyCenaProblem`, `zakazka_kontrola.mjs:199-201, 208-214` |
| rozměry šachty | `zamekNovyRozmeryProblem`, `zakazka_kontrola.mjs:232` |
| nepotvrzená ruční cena | `rucniCenyZamekProblem`, `src/rucni_ceny.js:375-378` (`if (vyr === 'ock') return ''`) |
| cenová výjimka (směs ceníku, pás „jiné“, ruční cena bez zdroje) | `vyjimkyZamekProblem` → `vyjimkyObsah(…, vyrazena)`, `src/vyjimky.js:607-609` |
| minimální marže platné slevy | `schvalovaniServerMarze`, `src/schvalovani.js:589-591` (platí při každém uložení, nejen při zámku) |

Server naopak **provede** bez ohledu na příznak: tvar a razítka ručních cen (`rucniCenyServer`,
`zakazka_kontrola.mjs:659-662` — nepotvrzenou cenu uloží jako nepotvrzenou), strop slevy podle role
(`schvalovaniServerKontrola`, ř. 642), práva na ceník B112 (ř. 479), typy / záporné hodnoty / profily,
číslo nového zámku (ř. 771-775), snímek (ř. 781-787) a přepočet zmrazeného výsledku OBOU stran
(`zamekOvereni` → `zamekVysledekSpocti`, `src/zamek.js:850-862, 978-992`). Ověření ale nic neodmítá —
jen zapíše razítko `shoda` / `nesouhlasi` a varování (`zakazka_kontrola.mjs:815-817`); v pokusu vyšlo `shoda`,
protože zmrazený výsledek OCK poctivě odpovídá datům s nepotvrzenou cenou.

Po vypnutí příznaku (strana OCK se stane vedoucí) server stranu **dodatečně neposoudí** — uložení je 200
a zamčená varianta se jako „zámek už byl“ přeskočí (`zakazka_kontrola.mjs:706-751`, `zamcenaDriv` ř. 504-508,
`vyjimkyServerKontrola`, `rucniCenyServer` i `schvalovaniServerMarze` zamčenou variantu vynechávají).
Jediné dodatečné posouzení je **dotisk dokumentu nové strany** (B153, ř. 715-748): cena, rozměry, cenová
výjimka, marže. **Chybí tam `rucniCenyZamekProblem`** — volá se jen ve větvi nového zámku (ř. 799).

Výstup pokusu (test v19.11.11; `0a/4a/4f/6a` jsou srovnávací přímé pokusy):

```
0a přímý nový zámek OCK, ruční cena bez zdroje a potvrzení → HTTP 403 [ruční cena z nabídky bez zdroje …]
1a nový zámek PROJ s jenProj=true; OCK nese ruční cenu bez zdroje → HTTP 200
   uloženo: jenProj=true, zámek=true, ověření=shoda, ruční cena potvrzena=false
1b uložení JEN se změnou jenProj true→false → HTTP 200   (vede OCK)
1c DOTISK dokumentu OCK (nabidka) → HTTP 403 [dotisk … ruční cena z nabídky bez zdroje …]
1d Prodáno nad touto variantou → HTTP 200
   ruční cena v prodané nabídce stále nepotvrzená a bez zdroje: true
   základní cena OCK v prodané nabídce / cena z ceníkové sazby = 0.890

6a přímý zámek OCK, ruční cena se zdrojem bez potvrzení → HTTP 403 [ruční cena položky není potvrzená …]
6b jenProj=true, zámek PROJ, OCK s nepotvrzenou ruční cenou se zdrojem → HTTP 200
6c vypnutí jenProj → HTTP 200
6d DOTISK cenové nabídky OCK (nabidka) → HTTP 200
6e DOTISK smlouvy o dílo OCK (sod) → HTTP 200
6f Prodáno → HTTP 200
   tisky: ["nabidkaProj","nabidka","sod"], prodáno=true, ruční cena potvrzena=false

4a přímý zámek OCK s nulovými rozměry → HTTP 400
4b jenProj=true, OCK nulové rozměry, zámek PROJ → 200;  4c vypnutí jenProj → 200
4d dotisk OCK → HTTP 400;  4e Prodáno bez dotisku → HTTP 200

MINM=0.9:
4f uložení slevy 5 % OCK pod minimální marží (bez příznaku) → HTTP 403
4g jenProj=true, tatáž sleva, zámek PROJ → HTTP 200 (stav „schváleno automaticky“)
4h vypnutí jenProj → 200;  4i dotisk OCK → HTTP 403;  4j Prodáno bez dotisku → HTTP 200
```

Odpověď na otázku „dá se tímto postupem dostat do odeslané nebo prodané nabídky cena, kterou by server
při přímém zamykání odmítl?“ — **ano**:

1. **Do PRODANÉ** zakázky: vždy (1d, 4e, 4j, 6f). Stačí zámek PROJ s `jenProj=true`, vypnout příznak, Prodáno.
   Projde ruční cena bez zdroje a potvrzení, nulové rozměry i sleva pod minimální marží. Zákazníkovi přitom
   jako záznam tisku odešla jen nabídka PROJ.
2. **Do ODESLANÉ nabídky OCK** (záznam tisku `nabidka` a `sod` v zámku): jen u ruční ceny **se zdrojem, ale bez
   potvrzení** (6d, 6e). Ruční cenu bez zdroje, nulové rozměry, ceník bez cen a slevu pod marží dotisk na
   testu zastaví (1c, 4d, 4i).

Předpoklady: role Obchodník; body 1–2 dělá autor zakázky (zakládá ji, tiskne a prodává; cizí obchodník
neprodá — 2c, ale příznak přepne a dotisk kontrolu vlastníka nemá). Zakázka musí mít číslo řady OPR
(bez „OVP“), aby po vypnutí `jenProj` vedla OCK, a PROJ s kladnou cenou (výchozí zadání PROJ ji má).
Požadavky se posílají přímo na `POST /api/zakazky`, zábrany v prohlížeči (`kontrolyStranaZabrana`,
`rucniCenaNepotvrzena`) se tím obcházejí.

## (c) Dopad — NEDRŽÍ

Všechny výstupy se řídí AKTUÁLNÍM příznakem, ne stavem při zámku / prodeji:

- controlling: `ctrlExportVarianty` (`src/controlling.js:646-648`) — vyřazená strana se nevyváží; serverový
  hromadný export `netlify/functions/controlling_export.mjs` volá totéž nad uloženou zakázkou;
- hodnota dealu a krycí listy pro Pipedrive: `prodPdZapis` (`src/objednane.js:705-726`),
  `pdnPodklad` (`src/pd_nanecisto.js:109-118`);
- dokumenty a krycí listy: `vysledekStrany` → `null` pro vyřazenou stranu (`src/zakazka.js:675-686`,
  `src/kryci.js:587, 610, 823`, `src/sod.js:287`, `src/nabidka_proj.js:643`); zmrazený výsledek v zámku se nemění.

Výstup pokusu (poctivě prodaná zakázka OCK, pak jen přepnutí příznaku):

```
3b autor: Prodáno → 200
   dopad PŘED: vedouci=ock  ctrl strany=["ock"]   pd hodnota=["OCK"]  kryci=["OCK"]
3c AUTOR: jenProj false→true u PRODANÉ zakázky → HTTP 200
   dopad PO:   vedouci=proj ctrl strany=["proj"]  pd hodnota=["PROJ"] kryci=["PROJ"]
   hodnota pro Pipedrive po/před = 0.285, cena v controllingu po/před = 0.285
3d CIZÍ obchodník: jenProj true→false u PRODANÉ cizí zakázky → HTTP 200
```

Tedy: kterýkoli obchodník jedním uložením změní, která strana (a jaká částka) prodané zakázky jde do exportu
controllingu a do podkladu hodnoty dealu; u zkušebních dat klesla hodnota na 28,5 % a prodaná šachta
z exportu zmizela. V opačném směru (scénář 1) se do controllingu a podkladu Pipedrive dostane cena OCK
s neschválenou ruční cenou (v pokusu 89 % ceny z ceníkové sazby). Zamčená data a zmrazený výsledek
zůstávají nedotčené, změna je vratná dalším uložením — ale server ji nezaznamená.

## (d) `origin/main` (v11.11.1) — platí totéž

Stejné pravidlo strany (`src/zakazka.js:650, 662`), stejné vynechání (`netlify/lib/zakazka_kontrola.mjs:197, 230`;
`src/rucni_ceny.js:345-347`; `src/vyjimky.js:591`; `src/schvalovani.js:589`), stejný `prodServer`
(`src/objednane.js:549`), `zamekZakZmeny` bez příznaků (`src/zamek.js:489, 549`), dotisk bez
`rucniCenyZamekProblem` (ř. 627-649 proti ř. 699), `ctrlExportVarianty` (`src/controlling.js:646`),
`prodPdZapis` (`src/objednane.js:619`).

Výstup pokusu nad exportem main je shodný s testem až na dva řádky:

```
0a přímý nový zámek OCK, ruční cena bez zdroje → HTTP 403 [ruční cena položky není potvrzená …]
1c DOTISK dokumentu OCK (nabidka) do zámku PROJ po vypnutí příznaku → HTTP 200
   tisky v zámku: ["nabidkaProj","nabidka"]
```

Na main tedy projde dotiskem do odeslané nabídky OCK i ruční cena **bez zdroje** (main ještě nemá pravidlo
„bez zdroje = cenová výjimka“, které na testu dotisk zachytí přes `vyjimkyZamekProblem`).

## Co jsem NEověřil

- chování v prohlížeči (zda `set('ZAK.jenProj')` u zamčené / prodané zakázky něco nezastaví; zámek čtení);
  pokus posílá požadavky přímo na funkci;
- skutečný zápis do Pipedrive (`/api/pd/nanecisto`, `/api/pd/deal`) — ověřen jen podklad `prodPdZapis`
  a výběr stran v `ctrlExportVarianty`; endpoint `controlling_export.mjs` jsem nevolal, jen četl;
- skutečné vytvoření dokumentů Word / tisku (jen záznam tisku v zámku a čtení `vysledekStrany`);
- obnovu ze zálohy (`/api/obnova`), místní server `server/server.js`, role Vedoucí a Administrátor;
- zakázky s víc šachtami / víc zákazníky (vypínače vypnuté), zahraniční řadu, zámek bez zmrazeného výsledku;
- změnu vedoucí strany jinou cestou než příznakem (`projHlavicka.cislo`) — mimo zadání;
- skutečné úložiště Netlify Blobs a souběh.
