# Audit: každá položka vlastní cena (#653, 18. 11. 2026)

Zadání J. V. 18. 11. 2026 (paušální pravidlo): každá položka kalkulace OCK musí mít vlastní cenu nezávislou na ostatních
a obchodník u ní musí jít zadat jinou cenu (i nulovou). Audit prošel jádro `src/engine.js` (všechny řádky
`mkItem` s `cenaPath`, výpočet pro exteriér/interiér × terče/lišty × průchozí, Model 1 i 2, všechny volitelné položky
a příplatky) a statický výčet `cenaPath` v kódu. Částky v souboru nejsou.

Jak dnes funguje „cena z nabídky“ (#561): tlačítko „✎ cena z nabídky“ je u každého řádku s ceníkovou cestou v Kč
(`rucniCenaSmi`) a cenu zapíše do ceníku varianty na té cestě. Dvě položky se stejnou cestou proto mají vždy stejnou
cenu — ruční cena u jedné změní i druhou a tlačítko se ukáže jen u první.

## A. Sdílená ceníková cesta (dvě různé položky, jedna sazba)

| # | cesta | položky | stav | návrh |
|---|---|---|---|---|
| A1 | `C.statikaKc` | STATICKÉ POSOUZENÍ + STATICKÉ POSOUZENÍ OPLÁŠTĚNÍ | **opraveno v #653** | vlastní `C.statikaOplKc`, migrace = `statikaKc`, cena beze změny |
| A2 | `C.priplatky.madlaBmKc` | MADLA NA BOČNÍCH STĚNÁCH + MADLA NA ZADNÍ STĚNĚ | k rozhodnutí J. V. | (a) ponechat — tentýž výrobek a dodavatel (**doporučeno**); (b) vlastní klíč `madlaZadniBmKc` stejným vzorem jako statika. Příplatek: sahá i do objednaných příplatků SoD (souběh SL) — proto v #653 ne |
| A3 | `C.leseniFix` (pole `fix`) | fixní část LEŠENÍ vnitřní i vnější (volitelné i příplatek) | k rozhodnutí J. V. | fix nemá vlastní tlačítko „cena z nabídky“ (řádek nese cestu metrové sazby). (a) ponechat (**doporučeno**, jedna mobilizace lešenáře); (b) tlačítko i pro fix; (c) vlastní fix pro vnější lešení |
| A4 | `C.profilasKgKc` | PROFILY - HLAVNÍ NOSNÉ PRVKY + sloupy můstků (skladebný model) | k rozhodnutí J. V. | (a) ponechat — tatáž ocel (**doporučeno**); (b) vlastní sazba sloupů můstků |
| A5 | `C.powertechExt` / `C.powertechInt` | 4 řádky PLECHY (hlavní, zasklení, oplech. dveří a podest, ostatní) | ponechat | tentýž plech v Kč/kg — cena z nabídky má platit pro všechny |
| A6 | `C.oplechPracKc` | PLECHY - OPLECH. DVEŘÍ A PODEST (PRÁCE) + OPLECHOVÁNÍ OSTATNÍ (PRÁCE) | ponechat | tatáž hodinová sazba dílny |
| A7 | `C.skloCelniKc`, `C.skloVsg442Kc` | sklo čelní + boční a zadní stěna (týž typ skla) | ponechat | totéž sklo v Kč/m² |
| A8 | `C.hakyKc`, `C.zabradliKc`, `C.soklBmKc`, `C.priplatky.leseniHlavaKc`, `C.prechodoveKgKc`, `C.priplatky.prechMontKc`, `C.leseniVnitrniKc`, `C.leseniVnejsiKc`, `C.mustekKc`, `C.mustekMontazHodKc` | táž položka jako volitelná / jako příplatek, nebo ve starém / skladebném modelu můstků | není problém | v jedné kalkulaci je vždy jen jeden z řádků |

## B. Položky bez „ceny z nabídky“

| # | položka | proč | návrh |
|---|---|---|---|
| B1 | SPOJOVACÍ MATERIÁL (`C.spojovaci.*`) | souhrnný řádek skupiny, žádná jedna cesta | k rozhodnutí J. V.: (a) ponechat (**doporučeno**, drobný materiál); (b) cena z nabídky u souhrnu = vlastní částka řádku |
| B2 | LAKOVÁNÍ (`C.lak.*`) a lak sloupů můstků | souhrnný řádek skupiny (lakovna / Tomáš) | k rozhodnutí J. V.: (a) ponechat; (b) cena z nabídky lakovny jako částka řádku (**doporučeno**, lakovna dává nabídku na zakázku) |
| B3 | PŘIRÁŽKA ZA ATYP | procento z režie (`C.atypPrirazka`), ne cena | není problém |
| B4 | PRÁCE ZÁMEČNÍKA - OSTATNÍ (ATYP) | cena se zadává přímo v zadání (`Z.zamecnikAtypKc`) | není problém |
| B5 | hodinové a množstevní klíče (`C.statikaHod`, `C.statikaOplHod`, `C.stavbyvedouciHod` …) | nejsou ceny; mění se množství (ruční přepis) | není problém |
| B6 | nulová cena u kterékoli položky | do #653 „cena z nabídky“ i server nulu odmítaly | **opraveno v #653** (nula platí, záporná ne, prázdné pole nulou není) |
| B7 | kalkulace PROJ (`engine_proj.js`) | mimo zadání auditu (sazby a položky se tam zadávají po činnostech) | případně samostatný audit |

Ověření, že nic jiného cestu nesdílí: výčet `grep -o "cenaPath: '[^']*'" src/engine.js | sort | uniq -c` (14 cest
dvakrát — A2, A4, A6, A8) a výpočet všech řádků přes 8 typů šachet × 2 modely (A5, A7, B1–B3).
