# Prompt VZ-E3 — zámek po zákaznících a odstranění zákazníka s odeslanou nabídkou

Společná pravidla: `PROMPT_VZ_SPOLECNE.md`. Návrh § 5, § 2a (tabulka odstranění), § 1.1 (písmeno z razítek).
Větev `claude/vz-e3` nad SHA od koordinace (po E2). Odhad: 1 sezení. **RIZIKOVÁ — po dokončení revize poradce**
(zámek, serverové pojistky).

## Cíl

Je vidět, komu která nabídka odešla; dotisk jde pro konkrétního zákazníka; zákazníka s odeslanou nabídkou odstraní
jen administrátor a doklad o odeslání v zakázce zůstane.

## Krok 0

`src/zamek.js` (`zamkniVariantu`, `zamekSnimekSpocti`, `zamekNabidkaPohled`, `zamekZakCestaZmrazena`,
`zamekZakHlavickaOznac`), `src/uloziste.js` (`uloZamekRazitkaDrz`), `netlify/lib/zakazka_kontrola.mjs`,
`src/ui/zakazka_ui.js` (`varSmaz`, právo `varianta.smazatUzamcenou`), `src/test_vs_zamek.js` (vzor testů).

## Co udělat

1. **Razítko „komu“:** každý záznam `zamek.tisky[]` u zakázky s víc zákazníky nese
   `zakaznik: { id, pismeno, cislo, objednatel, ico }` (snímek adresáta v okamžiku tisku). S jedním zákazníkem klíč
   chybí. Server razítka drží z uložené verze; nový tisk ověří, že zákazník existuje a ukazuje na tuto variantu,
   a snímek si složí sám z uložené zakázky.
2. **Stav nabídky zákazníka** (`vzStavNabidky`): odeslána = v zámku jeho varianty je tisk s jeho id; jinak
   rozpracovaná. `vzPlatna(zak, id)` = poslední odeslaná nabídka (varianta, číslo z razítka, den, cena ze
   zmrazeného výsledku) — počítá se, neukládá.
3. **Sdílená zamčená varianta:** tisk dalšímu zákazníkovi je „další tisk“ (obsah a cena ze zmrazeného výsledku),
   jen přidá razítko. **Dotisk** pro zákazníka: zmrazený výsledek + snímek adresáta z jeho razítka (ne z dnešní
   hlavičky).
4. **Vlastní varianta** ze zamčené sdílené: `klonujVariantu` + ukazatel; dosavadní odeslaná nabídka zůstává
   `vzPlatna`, dokud neodejde nová.
5. **Zmrazení:** název akce a adresa stavby se u zakázky s víc zákazníky zmrazí po první odeslané nabídce komukoli;
   údaje dalšího zákazníka po odeslání jemu nejdou měnit kromě kontaktní osoby (snímek adresáta je v razítku).
6. **Odstranění zákazníka s odeslanou nabídkou** (rozhodnutí J. V.): **jen administrátor** — server ověří roli
   z relace a „odešla nabídka“ z razítek ULOŽENÉ verze, ostatní 403; v obrazovce tlačítko zhasnuté s vysvětlením.
   Razítka zůstávají. Vlastní zamčená varianta zůstává v zakázce (doklad, pravidlo #34); její číslo se od té
   chvíle skládá z razítka (`zamek.cislo` + písmeno z razítka), ne ze seznamu zákazníků. Smazat ji lze jen dnešní
   cestou (`varianta.smazatUzamcenou`). Zákazník bez odeslané nabídky: jako v E1.
7. **Písmeno:** `vzPismenoDalsi` teď skutečně čte razítka — písmeno odstraněného zákazníka s odeslanou nabídkou se
   nepřidělí znovu, bez odeslané se uvolní.
8. **Server:** `dalsiZakaznici[i]` se zamčeným tiskem nesmí zmizet ani změnit písmeno bez výslovné akce odstranění
   administrátorem; podvržené razítko nebo `zakaznik` v tisku z prohlížeče se zahodí.
9. Karta Zákazníci zakázky: stav „odeslána D. M.“ / „rozpracovaná (platí …)“; potvrzení odstranění podle prototypu
   (snímek `v3_3_*`).

## Testy

`src/test_vz_zamek.js` (razítka, stav, platná nabídka, dotisk se starým názvem adresáta po jeho přejmenování,
písmena), `netlify/test_vz_server.mjs` rozšířit (odstranění: obchodník 403, autor 403, administrátor 200; podvržená
razítka; smazání zamčené varianty bez práva), `overit_vz_zamek.mjs`, rozšířit `test_vz_unik.js` o dotisk a o variantu
odstraněného zákazníka. Zlatá sada beze změny. Mutace „[VZ E3]“.

## Co nedělat

Řídící zákazník a prodej (E4), rejstřík (E6), Pipedrive (E5, E5b).
