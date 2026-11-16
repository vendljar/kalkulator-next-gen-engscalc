# Prompt VZ-E4 — řídící zákazník, Prodáno u zákazníka, krycí list a SoD

Společná pravidla: `PROMPT_VZ_SPOLECNE.md`. Návrh § 2, § 4 (krycí list, SoD). Větev `claude/vz-e4` nad SHA od
koordinace (po E3). Odhad: 1 sezení.

## Cíl

Řídícího zákazníka jde změnit ručně; „Prodáno“ u zákazníka z něj udělá řídícího a jeho variantu řídící (#563);
krycí list a SoD jdou pro prodaného zákazníka.

## Krok 0

`src/objednane.js` (`prodNastav`, `prodRidiciSrovnej`, `prodRidiciZamceno`, `prodServer`, `prodOdemkni`),
`src/zamek.js` (`zamekZakStav`, `zamekZakCestaZmrazena`, `variantaProdana`), `src/kryci.js` (pole s `bind ZAK.*`),
`src/sod.js`, `src/controlling.js` (`ctrlPdDealKontrola` — kdo smí měnit vazbu: autor a administrátor).

## Co udělat

1. **Ruční změna řídícího** (přepínač v kartě): autor zakázky a administrátor (server z uložené verze a relace,
   ostatní 403; u zakázky založené webhookem jen administrátor — stejně jako změna vazby v K40c). `vzVymenRidiciho`;
   u prodané zakázky zhasnuté. Server po každém uložení `vzSrovnej`.
2. **Prodáno u zákazníka:** tlačítko v kartě (a dnešní tlačítko na krycím listu se u 2+ zákazníků zeptá na
   zákazníka podle otevřeného). Potvrzení na stránce se seznamem před → po podle prototypu (řídící zákazník, řídící
   varianta, hodnota a číslo v dealu, organizace dealu, poznámka). V jednom uložení: `prodNastav` nad jeho
   variantou, `prodano.zakaznik = { id, pismeno }` (kvůli sdílené variantě), výměna řídícího, `prodRidiciSrovnej`.
   Server totéž ověří a srovná sám (`prodServer`): prodat jde jen zákazníkovi, kterému ta varianta odešla.
3. **Po prodeji:** hlavička nese vítěze a je zmrazená jako dnes; řídícího nejde přepnout (`prodRidiciZamceno`);
   prodaného zákazníka nejde odstranit; ostatní ano (s odeslanou nabídkou jen administrátor, E3). Odemčení prodeje
   (vedoucí, administrátor) řídícího nevrací.
4. **Krycí list a SoD:** z pohledu prodaného (nebo otevřeného) zákazníka; krycí list je jeden na variantu, pole
   s `bind ZAK.*` se čtou z pohledu. U sdílené varianty upozornění, že smluvní pole krycího listu jsou společná pro
   všechny její zákazníky a odlišné podmínky = vlastní varianta. SoD jen pro zákazníka, kterému nabídka odešla.
5. **Controlling:** jedna zakázka = jeden řádek s řídícím zákazníkem; zámky sdílené varianty se nepočítají víckrát.
6. Po uložení prodeje u zakázky s víc zákazníky zavolá obrazovka akci „organizace = vítěz“ — **jen háček**
   (`vzPoProdeji()`), který E5b naplní; v této etapě nic nevolá.

## Testy

`src/test_vz_prodej.js` (prodej prvnímu, druhému, zákazníkovi sdílené varianty; výměna řídícího smaže otisky
webhooku; invariant; odemčení), `netlify/test_vz_server.mjs` rozšířit (kdo smí měnit řídícího; prodej zákazníkovi
bez odeslané nabídky odmítnut; podvržené `prodano.zakaznik`), `overit_vz_prodej.mjs`, rozšířit `test_vz_unik.js`
o krycí list a SoD, test webhooku: po výměně řídícího webhook firmu v hlavičce nepřepíše (`netlify/test_pd_webhook*`).
Mutace „[VZ E4]“.

## Co nedělat

Zápis do Pipedrive (E5, E5b), rejstřík a Přehled (E6).
