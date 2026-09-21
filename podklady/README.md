# Podklady — kam ukládat průběžné informace, aby se neztratily

> Vzniklo 21. 9. 2026 na dotaz J. V.: „Jakým způsobem ti mám ukládat průběžné
> informace (viz např. vizuál kalkulace opláštění), aby nedocházelo k jejich
> ztrátě tak, jak se to stalo dnes?"

## Proč se to ztratilo

Vizuál opláštění byl popsaný **jen v chatu**. Chat je pracovní stůl, ne
archiv: u dlouhého sezení se starší část rozhovoru shrne, aby se vešel do
paměti, a z popisu obrazovky zbude věta typu „bylo tam něco s nákresem".
Zadání, které existuje jen v chatu, tedy **zanikne zákonitě** — není to
nehoda, je to vlastnost.

Co v chatu naopak zanikne **ne**: co leží v repozitáři. Repozitář se čte
znovu na začátku každého sezení.

## Pravidlo

**Cokoli, co má platit i zítra, patří do souboru v repozitáři.** Chat slouží
k domluvě, soubor k zapamatování.

## Kam co

| Co to je | Kam | Příklad |
|---|---|---|
| Jak má obrazovka vypadat a chovat se | `podklady/OBRAZOVKA_*.md` | pořadí řádků, popisky, nákres |
| Co se má udělat (úkol, priorita) | `roadmapa/roadmap.json` | #287 — terče a lišty |
| Rozhodnutí, o kterém se mám řídit | `podklady/ROZHODNUTI_*.md` | co je standard a co atyp |
| Co se změnilo v které dávce | `CHANGELOG.md` | píšu já, nemusíte |
| **Ceny, sazby, firemní údaje** | **Drive, složka Testovani** | **do repozitáře NE** |

Starší dokumenty leží zatím v kořeni (`NAVRH_*.md`, `ROZHODNUTI_P8_*.md`,
`DOPAD_*.md`). Nechávám je tam — nic se nepřesouvá bez Vašeho pokynu. Nové
zakládám sem.

## Nejjednodušší postup pro Vás

Nemusíte psát žádný formát. Stačí v chatu napsat:

> **„Tohle si zapiš do podkladů."**

Já z toho udělám soubor, doplním datum a důvod a commitnu ho. Od té chvíle to
přežije jakkoli dlouhé sezení.

Když pošlete **snímek obrazovky**, popište k němu jednou větou, co na něm má
být vidět — obrázek sám o sobě totiž neřekne, jestli je to „takhle to chci"
nebo „takhle to je špatně". Snímek bez cen můžu do repozitáře uložit
(v kořeni jich pár leží: `snimek_*.png`); snímek s cenami ne.

## Co jsem k tomu udělal navíc

Popis obrazovky ale není jen text — **hlavní pojistka je test.** Dokud je
pravidlo jen v dokumentu, může ho příští úprava porušit a nikdo si toho
nevšimne. Proto ke každému takovému rozhodnutí přidávám kontrolu do
`overit_*.mjs`, která v prohlížeči změří, že to tak opravdu je.

Pro opláštění je to `overit_oplasteni.mjs`: hlídá pořadí řádků i tvar popisků
a je ověřeno, že při návratu ke staré podobě **spadne**. Dokument říká proč,
test hlídá že.
