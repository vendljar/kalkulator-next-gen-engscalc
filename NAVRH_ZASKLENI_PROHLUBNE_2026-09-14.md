# Zasklení prohlubně — návrh k rozhodnutí (V8 / úkol O5)

*14. 9. 2026. Návrh, ne implementace. Do aplikace nic z toho zatím nešlo.*

## O co jde

J. V. zvažuje třetí výpočtový model pro šachtu zasklenou zcela nebo částečně
i v prohlubni. Dnes aplikace počítá prosklenou část jako `zdvih + přejezd`,
tedy od úrovně nástupu nahoru. Prohlubeň do skla nevstupuje vůbec.

Předloha 01/2026 má v tom místě `= C6 + C5 + C7`, tedy zdvih + přejezd +
prohlubeň — což odpovídá volbě „celá prohlubeň".

## Doporučení: parametr, ne třetí model

**Přidat do Zadání šachty jedno pole, ne třetí sadu vzorců.**

Tři důvody:

1. **Třetí model by se musel udržovat celý.** Model 1 a Model 2 se liší
   v deseti místech jádra a každé z nich má vlastní testy v obou režimech.
   Třetí model znamená třetí větev v každém z nich a třetí sloupec ve všech
   testech, které dnes běží dvakrát.
2. **Nedá se zkombinovat s Modelem 2.** Model 2 jsou opravené chyby předlohy.
   Kdyby zasklená prohlubeň byla samostatný model, musel by si člověk vybrat
   mezi opravenými chybami a zasklenou prohlubní. To je falešná volba.
3. **Je to vlastnost šachty, ne způsob počítání.** Zasklená prohlubeň je něco,
   co ta konkrétní stavba má nebo nemá. Patří do zadání vedle typu šachty
   a způsobu zasklení, ne do přepínače „jak počítáme".

## Navržené datové pole

```
zaskleniProhlubne: 'ne' | 'castecne' | 'cela'     (výchozí 'ne')
zaskleniProhlubneM: číslo v metrech               (jen pro 'castecne')
```

Odvozená hodnota, ze které plyne všechno ostatní:

```
zasklenaProhlubenM =
    'ne'       → 0
    'castecne' → min(zaskleniProhlubneM, prohluben)
    'cela'     → prohluben

vyskaProsklene = zdvih + přejezd + zasklenaProhlubenM
```

Výchozí `'ne'` znamená nulu, takže **žádná uložená zakázka se nezmění** —
`vyskaProsklene` vyjde na dnešní `zdvih + přejezd`.

## Co se tím posune

`vyskaProsklene` dnes řídí čtyři věci a všechny se posunou samy:

| Co | Jak na tom závisí |
|---|---|
| Počet tabulí zadní stěny | `strop(výška prosklené / rozteč)` |
| Plocha skla zadní i bočních stěn | přes počet tabulí i přes spodní mez |
| Lišty a terče | počítají se z počtu rámů a tabulí |
| Práce opláštění a tmelení | počítají se z celkové plochy skla |

**Co se neposune a nemá:** výška konstrukce `H` (ta prohlubeň už obsahuje),
lešení, montážní hodiny za výšku, počet rámů. Ty stojí na `H`, ne na
prosklené části.

**Otevřená otázka k rozhodnutí:** u částečného zasklení se sklo nekryje
s roztečí příčníků. Buď se poslední tabule ořízne (plocha se počítá přesně),
nebo se počítá celá (plocha se zaokrouhlí nahoru na celou tabuli). Předloha
tuhle situaci neřeší, protože zná jen „celou prohlubeň". Doporučuji **ořez**,
tedy počítat skutečnou plochu — jinak by se u zasklení 0,3 m z 2,45 m
účtovala celá tabule.

## Dopad na Detail výpočtu

Krok 2 „Odvozené rozměry" dostane u řádku „Výška prosklené části" úplný
vzorec včetně prohlubně, stejně jako dnes lešení U-dokola. Krok 8 „Zasklení"
dostane řádek „z toho v prohlubni", aby šlo poznat, kolik skla přibylo.

## Dopad na technickou specifikaci

Nový řádek pod „Způsob zasklení": **ZASKLENÍ PROHLUBNĚ** s hodnotami
„ne · částečně (0,8 m) · celá prohlubeň". Potřebuje překlad do EN/DE/FR.

## Co je potřeba rozhodnout, než se to naprogramuje

1. Ořez poslední tabule u částečného zasklení — ano, nebo počítat celou?
2. Platí to pro obě větve, exteriér i interiér?
3. Mění se něco na práci opláštění a tmelení pod úrovní nástupu, nebo se
   počítají stejnou sazbou jako nad ní?
4. Má se u zasklené prohlubně měnit lešení? Dnes lešení U-dokola stojí na
   `zdvih + přejezd`, tedy taky bez prohlubně.

Po odsouhlasení je to práce na jednu dávku včetně testů v obou režimech.
