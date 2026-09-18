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

---

# Dodatek 2 — upřesnění J. V. 17. 9. 2026 večer

## A. Dodatkový text je na POLOŽCE CENÍKU

Rozhodnuto: text se váže na ceníkovou položku, ne na zakázku, **a bude se
opakovat**. „Skla s vyšší energetickou reflexí" mají popis pokaždé stejný.

```
C.priplatky.sknM2        550          ← sazba, jak je dnes
C.popisy['C.priplatky.sknM2'] = "Provedení vnějších skel opláštění …"
```

**Proč zvlášť, a ne jako další sloupec u sazby:** popisy jsou dlouhé texty,
kdežto ceník je tabulka čísel, která se zveřejňuje, verzuje a porovnává
(`cenikRozdily`). Kdyby popis ležel mezi cenami, hlásila by se změna
formulace jako změna ceníku. Vlastní mapa u téhož záznamu to odděluje,
a přitom se **veze se zveřejněním** — nová verze ceníku nese i texty.

**V zakázce se nic neukládá.** Nabídka si text vezme z ceníku, který k ní
patří (zakázka nese vlastní kopii ceníku, takže starší nabídka má text
takový, jaký platil tehdy — to je přesně chování, které chceme).

**Kde se edituje:** pod řádkem příplatkové i volitelné položky v kalkulaci,
jak bylo zadáno. Uloží se do ceníku varianty; do sdíleného ceníku se dostane
běžnou cestou přes zveřejnění. Obchodník tedy může text upravit pro svou
nabídku a správce ho ustálí pro všechny.

**V nabídce nahradí dnešní řádek `množství: 88,626`.** Když text není
vyplněný, řádek se neukazuje vůbec — prázdný popis je lepší než dopočítané
číslo, které zákazníkovi nic neříká.

## B. Opláštění po stěnách — rolovací sekce

Sekce se stěnami je **skrytá**, dokud se nepřepne na „po stěnách". Ve
standardním režimu obchodník o čtyřech stěnách vůbec neví.

## C. Řádek stěny: typ · po celé výšce · od · do

Mezi typ a „od" patří zaškrtávátko **„po celé výšce"**. Zaškrtnuté (výchozí)
schová „od" i „do" — většina stěn je celá stejná a dvě prázdná pole by jen
mátla. Odškrtnutím se pole objeví.

## D. Číselník typů opláštění

Bere se **z ceníku podle pravidel interiér/exteriér**, která už platí pro
zasklení dnes (`skloVolba` v `engine.js`):

| typ | odkud | kdy se nabízí |
|---|---|---|
| sklo podle zasklení | `C.skloCelniKc` / `C.skloVsg442Kc` | interiér |
| dvojsklo | `C.skloBokyKc` | exteriér — boky a záda |
| VSG 4.4.1 | `C.skloCelniKc` | exteriér — čelní stěna |
| **Cetris** | `C.cetrisKc` | vždy *(přidáno 17. 9. 2026)* |
| **jiné** | zadá obchodník ručně | vždy |

**„Jiné"** je únikový východ: obchodník napíše název a **náklad za m²**
rovnou do zadání. Dnes se takový případ řeší tak, že se do nabídky dopisuje
vlastní položka — tohle mu dovolí říct to na správném místě a nechat to
spočítat. Ručně zadaný náklad **vždycky znamená atyp**, stejně jako dnes
ručně přepsané množství.

Číselník je tedy dynamický: nabídne se jen to, co dává pro daný typ šachty
smysl, plus Cetris a jiné. Tím se drží pravidlo, že sazbu určuje ceník, ne
kód — a nové sklo v ceníku se objeví ve výběru samo.

## E. Co z toho plyne pro pořadí prací

Beze změny proti dodatku 1: **nejdřív rozpojit plochy na čtyři stěny beze
změny výsledku**, teprve pak pustit režim po stěnách do zadání. Dodatkový
text (oddíl A) na tom ale **nezávisí** — dá se udělat hned a samostatně,
protože se nedotýká výpočtu ploch.

---

# Dodatek 3 — dva pásy na stěnu (18. 9. 2026)

J. V.: *„většinou stačí jeden souvislý pás, ale může nastat i situace, kdy
budou dvě varianty opláštění."*

## Klíčové rozhodnutí: ukládá se DĚLICÍ VÝŠKA, ne dva rozsahy

Nabízí se zapsat dva pásy jako dva nezávislé rozsahy `od`–`do`. Nedělal bych
to. Dvě nezávislé dvojice čísel umí popsat i stavy, které nedávají smysl:

```
pás 1:  0 → 2,5      pás 2:  2,0 → nahoru     překryv 0,5 m
pás 1:  0 → 2,0      pás 2:  2,5 → nahoru     díra 0,5 m
```

Obojí by se muselo hlídat a hlásit, a obojí by šlo uložit ze staršího
souboru nebo ze serveru. **Lepší je takový stav nejít zapsat.**

Stěna se proto ukládá jako **jedna dolní mez a seznam pásů se stropem**:

```
B: {
  odM: -1.2,                      // kde opláštění začíná; záporné = do prohlubně
  pasy: [
    { typ: 'dvojsklo', doM: 2.2 },   // od odM do 2,2 m
    { typ: 'cetris',   doM: null },  // od 2,2 m až nahoru
  ]
}
```

Pás začíná tam, kde skončil předchozí. **Překryv ani mezera nemůžou
vzniknout — není je z čeho složit.** Hlídá se jediné: dělicí výšky musí
růst a ležet nad `odM`.

**Mezera se nezadává jako mezera.** Když se část stěny oplášťovat nemá, je
to pás typu „bez — dodá stavba". Tím zůstane v zadání vidět, že se na to
myslelo, místo aby to vypadalo jako zapomenutý úsek.

## Co to znamená pro „po celé výšce"

Zaškrtnuté = `odM: 0` a jediný pás s `doM: null`. Rozsah i tlačítko
„přidat pás" jsou schované. Odškrtnutím se objeví dolní mez a seznam pásů,
zpočátku s tím jedním, který tam byl.

## Kolik pásů povolit

**Technicky neomezeně, v rozhraní po jednom.** Datový tvar je seznam, takže
tři pásy nic nestojí navíc; tlačítko „přidat pás" prostě přidá další řádek.
Nezavádět umělý strop dvou — kdyby se objevila stěna se třemi pásy, bylo by
to zbytečné omezení, a kontrola „dělicí výšky rostou" platí pro libovolný
počet stejně.

## Dopad na výpočet

Plocha stěny se počítá po pásech a sečte se podle **typu**, ne podle stěny:
dvojsklo ze všech stěn dohromady jde do jednoho řádku kalkulace, Cetris do
druhého. Řádky kalkulace tedy zůstávají tytéž jako dnes, jen se plní
z jiného zdroje — to je dobře, protože nabídka se tím nerozdrobí na osm
skoro stejných řádků.

**Terče a lišty** se počítají jen z pásů se sklem. To je vedlejší účinek,
který dnes nejde zadat vůbec: u stěny z Cetrisu dnes aplikace terče počítá,
protože o jiném opláštění neví.

## Otevřené k rozhodnutí

1. **Sazby po pásech, nebo po stěnách?** Návrh počítá plochu po pásech
   a účtuje ji sazbou toho typu. Je to tak správně i pro práci opláštění
   a tmelení, nebo se ty počítají z celé plochy bez ohledu na typ?
2. **Dělicí výška proti rozteči příčníků** — pořád tatáž otázka jako
   u prohlubně: když dělicí výška nepadne na rozteč, počítá se skutečná
   plocha (ořez), nebo celá tabule? U dvou pásů je to naléhavější, protože
   dělicí výšku volí obchodník ručně.
