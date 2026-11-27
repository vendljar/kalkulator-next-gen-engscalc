# Revize rychlých oprav z kola 70A (K70-N1, K70-I3)

Poradce Fable, 27. 11. 2026. Do revidovaných větví nic necommitováno.

## 1. K70-N1 — planý dialog „Dotisk se změněným slovníkem“

Větev `claude/rychla-K70-N1`, HEAD 1140e47, základ integrace 7c2d42e.

### Verdikt: OPRAVIT (dvě malé věci, S1 a S2), jinak v pořádku

Ověřeno v odděleném stromu: `test_k70n1_slovnik_dialog` 55/0. Vlastní sonda nad fixturou zámku
vyrobeného kódem main (13 případů).

**Co je v pořádku**

- Skutečná změna překladu dál varuje. Shoda se počítá otiskem dnešního slovníku bez vyjmenovaných
  přidaných hesel; změněný překlad existujícího hesla, smazané heslo, další nové heslo mimo seznam
  i jiná zveřejněná verze dají neshodu → dialog. Sonda: všech pět případů varuje.
- Bez dat varianty se nic neodebere (dialog zůstane).
- Ruční položka s jednotkou `bm` / `kpl` / `m²` varuje, i když je v šachtě 2 (víc šachet).
  Jednotka se v tisku bere jen přesnou shodou s výčtem (`rpJednotka`), takže přesné porovnání sedí.
- Vlastní příplatek nebo ruční položka se jménem „Engineering“ a nová kalkulace varují.
- Dvojče K66-I1 se odebere jen tehdy, když má dnes stejný překlad jako starý tvar.
- Žádné pevné otisky v kódu — platí na testu i na ostrém webu.

**S1 (střední → malá oprava): průchod daty selže „naprázdno“.** `slovnikDataVarianty` má strop
hloubky 12 a 20 000 uzlů a po jeho dosažení tiše skončí. Co za stropem leží, se nenajde a heslo
se odebere. Sonda: 25 000 uzlů před větví `ock` + ruční položka s jednotkou `kpl` → shoda (bez
dialogu); totéž při zanoření 13. Běžná data jsou malá (fixtura 106 uzlů), ale funkce má při
dosažení stropu vrátit „nevím“ a volající heslo neodebrat (dialog zůstane). Test s pojistkou.

**S2 (nízká): tvrzení „prokazatelně nepoužije“ neplatí pro volné texty.** Vlastní řádky technické
specifikace (`techspec.extra`, název i hodnota) jdou přes překlad celé — řádek s názvem
„ENGINEERING“ nebo hodnotou „kpl“ se po přidání hesel přeloží jinak než při odeslání, a detektor
ho nevidí (sonda: shoda bez dialogu; `tr('Engineering','en')` = „TECHNICAL ENGINEERING“).
Návrh: místo vyjmenovaných míst projít všechny textové hodnoty dat varianty (po řádcích, stejnou
normalizací jako slovník, mimo větve ceníku, kde je „Engineering“ název položky a netiskne se
přeložený) a heslo odebrat jen tehdy, když se mu žádný text nerovná. Pokryje ruční položky,
příplatky, vlastní řádky specifikace i krycí list jedním pravidlem. Když to do soboty nejde,
aspoň přidat `techspec.extra` a v komentáři nepsat „prokazatelně“.

**Poznámky**

- N1 Dopad přehlédnutí je malý (dialog je jen upozornění, lišit by se mohlo jedno slovo nebo
  jednotka), proto S2 jen nízká. Dopad na cenu žádný.
- N2 Seznam `SLOVNIK_PRIDANA_HESLA` je ruční. Do pravidel kola: každé nové zabudované heslo buď
  do seznamu s podmínkou, nebo vědomě nechat dialog; hlídat to testem „rozdíl PREKLAD proti
  poslednímu main = seznam“.
- N3 Otisk je 32bitový; náhodná shoda je zanedbatelná a nic se tím nemění proti dosavadnímu stavu.

## 2. K70-I3 — dotisk staré odeslané nabídky s ruční položkou (předběžně)

Větev `claude/rychla-K70-I3`, rozpracovaný commit 186b8c6 — jen předběžné čtení, verdikt až nad
hotovým SHA.

- Směr je správný a drží vzor `pd2Tisk` / `txTisk`: značka `rpTisk` ve snímku podmínek, bez ní
  se zamčená nabídka tiskne bez řádků ruční položky a bez rozpisu ceny; cena se nemění.
- K ověření v hotové verzi:
  1. online tisk (`nahled_word.js`, `data.rucni`) a víc šachet (`nabidkaVsData` s `RP: null`)
     dávají u starého zámku totéž co main — včetně cizích jazyků;
  2. smlouva o dílo ze staré odeslané nabídky (data jdou přes `nabidkaData`) — text jako main;
  3. krycí list: řádek „Ruční položky v ceně“ značkou řízený není — je to interní doklad, ale
     proti main se u starého zámku liší; rozhodnout, jestli vadí (seznam očekávaných rozdílů);
  4. nabídky odeslané z testu mezi 24. 11. a opravou s ruční položkou odešly s rozpisem a dotisk
     ho ztratí — jen testovací data, uvést ve STAV;
  5. první tisk ze stránky načtené před nasazením: snímek bez `rpTisk` × server (hláška s Ctrl+F5);
  6. porovnání sestavení main × test: u starých odeslaných s ruční položkou SHODA dokumentů,
     seznam očekávaných rozdílů se o tyto případy zkrátí.
- K70-N1 a K70-I3 spolu: u starého zámku se ruční položky netisknou vůbec, takže podmínka
  „jednotka ruční položky“ v K70-N1 je pak přísnější, než je nutné — neškodí.
