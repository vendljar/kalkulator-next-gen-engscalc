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

---

# Dodatek 17. 9. 2026 — opláštění po stěnách A–D

*Rozhodnutí J. V. 17. 9. 2026: **třetí model se tvořit nebude**, pracuje se
jen s Modelem 2. Zasklení prohlubně se odkládá — „je to velká změna, musím
se nad tím pořádně zamyslet". Tenhle dodatek je podklad k tomu zamyšlení.*

## Myšlenka

Rozdělit šachtu na čtyři stěny a u každé zvlášť vybrat **typ opláštění**
a **rozsah (výšku)**. Značení po směru hodinových ručiček, když stojím na
nástupišti čelem ke dveřím výtahu:

```
            C  (zadní)
        ┌───────────┐
        │           │
 D      │           │   B
(boční) │           │  (boční)
        │           │
        └───────────┘
            A  (čelní — dveře)
```

**Proč to sedí k tomu, co už v aplikaci je.** Nástupiště se takhle značí
dneska (A / C u průchozí šachty), takže se nezavádí nová abeceda — jen se
dotahuje na stěny. U průchozí šachty jsou dveře na A i na C, takže obě
mají portál; B a D jsou boční vždy.

## Čím je to lepší než parametr na prohlubeň

Návrh z 14. 9. řešil **jednu** otázku: jak hluboko dolů sahá sklo. Stěny
A–D řeší **obecnější** věc a prohlubeň z ní vypadne jako zvláštní případ:

> „Zasklít prohlubeň" = stěnám dát dolní mez −prohlubeň místo 0.

Jedna datová struktura místo dvou. Kdyby se udělal nejdřív parametr na
prohlubeň a pak stěny, máme v zadání dvě pole, která si můžou odporovat
(co když je „zasklení prohlubně = celá" a stěna A má rozsah od 0?).

**Zároveň to otevírá případy, které dnes nejdou zadat vůbec:**

- zadní stěna u zdi budovy → **plech místo skla**, boky sklo
- šachta v rohu → dvě stěny plné, dvě prosklené
- sklo jen do výšky parapetu, nad tím plech
- prohlubeň zasklená jen ze strany, kde je vidět

Dnes se všechny tyhle případy zadávají jako ATYP a dopočítávají ručně.

## Navržený tvar dat

```
opllasteni: {
  rezim: 'standard' | 'poStenach',      // výchozí 'standard'
  steny: {
    A: { typ: 'sklo', odM: 0, doM: null },   // null = až nahoru
    B: { typ: 'sklo', odM: 0, doM: null },
    C: { typ: 'sklo', odM: 0, doM: null },
    D: { typ: 'sklo', odM: 0, doM: null },
  }
}
```

- `typ`: `sklo` · `plech` · `bez` (dodá stavba) — číselník, ať jde rozšířit
- `odM`: od jaké výšky proti úrovni nástupu; **záporné číslo = do prohlubně**
- `doM`: do jaké výšky; `null` = po horní hranu prosklené části

**Výchozí `rezim: 'standard'` znamená, že se nepočítá nic nového** — jádro
jede dnešní cestou a žádná uložená zakázka se nezmění. To je stejná
pojistka, jakou má dnešní návrh přes `zaskleniProhlubne: 'ne'`.

## Co to znamená pro jádro (tady je ta práce)

Dnes se plocha skla počítá ze **tří** čísel, ne ze čtyř stěn:

| dnešní veličina | co obsahuje |
|---|---|
| `bocniM2` | obě boční stěny dohromady (B + D) |
| `zadniPlneM2` | zadní stěna bez portálů (C) |
| `skloCelniM2` | světlík nad dveřmi a po stranách (část A) |

Přechod na stěny znamená **rozpojit `bocniM2` na B a D** a začít u každé
stěny počítat z vlastního rozsahu. To je zásah do místa, kde se počítají
peníze — tedy přesně tam, kam se podle pravidel projektu nesahá bez
rozmyslu. **Odhad: dvě dávky**, ne jedna:

1. rozpojit plochy na čtyři stěny **beze změny výsledku** (regrese na všech
   19 zakázkách musí sedět na haléř — to je ta pojistka),
2. teprve pak pustit režim `poStenach` do zadání a do dokumentů.

## Co se tím ještě posune

- **Terče a lišty** se počítají z rámů a tabulí — u stěny bez skla nemají
  co dělat, takže se musí počítat po stěnách taky.
- **Tmelení** jde z celkové plochy skla; ta se změní sama.
- **Lešení** stojí na `H`, ne na ploše skla — nemění se. *(Otázka 4
  z původního návrhu tím padá: lešení se řeší zvlášť, ať už se prohlubeň
  zasklí, nebo ne.)*
- **Technická specifikace** dostane čtyři řádky místo jednoho „Způsob
  zasklení". Potřebuje překlad do EN/DE/FR.
- **Kontrola standardu** dostane nové pravidlo: *režim `poStenach` je vždy
  atyp*, protože standard zná jen jednotné opláštění. To je konzistentní
  s tím, co standard dělá dnes.

## Co je potřeba rozhodnout

1. **Značení stěn** — je A vždy stěna s dveřmi (a u průchozí tedy A i C),
   nebo se A určuje podle stavby a dveře můžou být kdekoliv?
2. **Číselník typů** — stačí `sklo / plech / bez`, nebo je potřeba víc
   (perforovaný plech, mřížka, zdivo stavby…)?
3. **Rozsah na stěnu, nebo pásy?** Návrh výš umí jeden souvislý pás
   (`od`–`do`). Případ „sklo dole, plech nahoře, sklo pod střechou" by
   potřeboval víc pásů na jednu stěnu. **Doporučuji začít jedním pásem** —
   dva pásy umí zadat i dvě sousední stěny a víc než dva jsem v zakázkách
   neviděl.
4. **Ořez tabulí** — pořád stejná otázka jako v původním návrhu: když pás
   nekončí na rozteči příčníků, počítá se skutečná plocha, nebo celá tabule?

## Můj názor

Stojí to za to, ale **ne teď**. Je to zásah do výpočtu ploch skla, tedy do
míst, kde se tvoří cena, a přichází to ve chvíli, kdy se právě přepnul
výchozí model na 2 a čeká nás kolo testů. Pořadí, které dává smysl:

1. **kolo testů nad Modelem 2** (běží),
2. **rozpojit plochy na čtyři stěny beze změny výsledku** — samo o sobě
   neviditelné, ale dá se ověřit regresí na haléř,
3. **teprve pak** režim po stěnách do zadání, dokumentů a standardu.

Krok 2 se dá udělat kdykoliv a nic nerozbije; je to příprava, ne změna.
