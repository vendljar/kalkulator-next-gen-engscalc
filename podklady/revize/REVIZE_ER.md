# Revize ER — celý rozdíl (#757, #758, #761, automat ATYP)

- **Datum:** 24. 11. 2026
- **Rozdíl:** `git diff 7339a9e..3f3162f` (větev `claude/er-engineering-rezerva`, základ = integrace v24.11.6)
- **Rozsah:** 28 souborů, +631 / −35; jádro `engine.js`, `vice_sachet.js`, `controlling.js`, `objednane.js`,
  `zakazka.js`, `zobrazeni.js`, `uloziste.js`, `techspec.js`, `preklad.js`, `ui/kalk_ock.js`
- **Revize nic neopravovala** ve větvi ER; žádný zápis na weby, do Pipedrive ani na Disk.

## Verdikt: SLOUČIT PO OPRAVÁCH

Staré kalkulace se nemění (doloženo třemi nezávislými cestami, viz oddíl 6). Nové chování odpovídá
rozhodnutím J. V. z 24. 11. Před sloučením doporučuji opravit **N1** (engineering u víc šachet se
liší mezi součtem a objednanými příplatky) a nechat J. V. potvrdit **N2** (součet příplatků s rezervou
se oproti dřívějšímu součtu liší zaokrouhlením). Ostatní nálezy jsou nízké a mohou jít do následné dávky.

## Nálezy

| # | Závažnost | Oblast | Nález | Návrh |
|---|-----------|--------|-------|-------|
| N1 | **střední** (cena / dokument, jen víc šachet) | #757 `vice_sachet.js` × `objednane.js` | „Jednou za variantu“ bere každé místo z jiné šachty. Součet (`vsSoucet`) vezme **první šachtu, která příplatek má** — bez ohledu na sloupec Nabídka a i když má množství přepsané na 0. Objednané příplatky (`objNabidnute`, SoD) vezmou **první šachtu, kde je v nabídce a má nenulovou cenu**. Rozejde se to, když se šachty liší: (a) š1 množství 0, š2 automaticky → kalkulace a nabídka 0 Kč, objednané/SoD 12 000 Kč; (b) š1 rezerva 0 %, š2 30 % a engineering zaškrtnutý jen v š2 → součet 12 000, objednané 16 000; (c) š2 množství přepsané na 3 → v součtu 1 × (u jedné šachty přepis platí: 3 ×). | Jedno pravidlo na jednom místě (např. `vsPriplatekJednou(vys, zadani)` ve `vice_sachet.js`): první šachta, která má příplatek **v nabídce**; když žádná, první, která ho má. `objednane.js` ať volá totéž (teď má vlastní kopii seznamu `['engineering']`). Test se dvěma **různými** šachtami (dnes jsou v testu shodné — mutace „objednané bere poslední šachtu“ přežije, ověřeno). |
| N2 | **střední** (cena — k potvrzení J. V.) | #758 `engine.js` mkPrip | Součet příplatků nové kalkulace **není** roven dřívějšímu součtu. Dřív: Σ zaokrouhlených položek + rezerva, pak ↑ tisíce. Nově: každá položka ↑ tisíce až s rezervou. Na 800 náhodných případech (400 zadání × Model 1 a 2, rezerva 5–30 %, zkušební ceník) se součet liší v 599: od −6 000 do +4 000 Kč, v průměru −407 Kč (nově spíš níž). Plyne to z rozhodnutí „rezerva v ceně položky“, ale v CHANGELOG ani v logu rozhodnutí to řečeno není. | Neopravovat kód. Říct J. V. výslovně: „součet příplatků s rezervou se oproti dřívějšku liší o zaokrouhlení, řádově tisíce Kč oběma směry“ a doplnit větu do CHANGELOG. |
| N3 | nízká–střední (integrita ceny) | příznak `kalkVerze` | Server hlídá jen **tvar** (2 nebo chybí), ne **změnu**. U nezamčené varianty jde příznak přidat nebo ubrat (upravený klient, ručně upravený soubor při importu) a cena se změní **tiše**: na vzorku základ 1 204 000 → 1 198 000, příplatky 398 000 → 413 000. V aplikaci není nikde vidět, zda je kalkulace „nová“, ani to nenese historie. Běžnou cestou (klon, duplikát, nová varianta, šachta 2+, import staré, obnova ze zálohy, webhook) se příznak nezmění — ověřeno. Zamčená varianta je mimo (zmrazený výsledek). | Otázka pro J. V. (bezpečnostní mez): (a) **doporučuji** server odmítne uložení, kde se `kalkVerze` u existující varianty / šachty liší od uloženého stavu (výjimka obnova); (b) drobný štítek v Práce a režie nebo v controllingu „výpočet: nový (ER)“. Bez (a) jde o stejnou třídu jako změna jiného vstupu oprávněným uživatelem. |
| N4 | nízká | #758 B automat ATYP, víc šachet | Ruční značky (`data.zadaniRucni`) jsou **na variantu**, ne na šachtu. Ruční rezerva v šachtě 1 tak zabrání automatu dosadit předlohu ATYP i v šachtě 2, kde ji nikdo nepsal. Značka se navíc nikdy neruší — pole přepsané kdysi dávno (třeba na 0) zůstane po automatickém zapnutí ATYP bez přirážky; dřív ho automat přepsal na 30 %. Druhé je přímý důsledek rozhodnutí, první ne. | Zapsat do roadmapy; při řešení vést značky po šachtách. J. V. sdělit, že automaticky zapnutý ATYP může mít rezervu nižší než předloha, když ji obchodník kdykoli dřív psal ručně. |
| N5 | nízká (testy) | mutace [ER] | Chybí mutace na: kontrolu příznaku u šachet 2+ (`uloziste.js`), výběr šachty v `objednane.js` (viz N1), výběr šachty ve `vsSoucet`. Ruční mutace revize: 6 ze 7 chyceno (kontrola šachty 2+, hodnoty sloučeného řádku, prodej řádku rezervy, UI přepínače, `kalkNova ≥ 1`, sdílený seznam), přežila jen „objednané: poslední šachta“. | Doplnit s opravou N1. |
| N6 | nízká (dokumentace) | podklady | Zastaralé názvy: `SVERENA_ROZHODNUTI.md` ER-1, roadmapa #757 (`detail`) a komentář v `nastroje/zlata_ocista_er.js` mluví o příznaku `engineeringPriplatek` a o sadě `src/test_engineering_priplatek.js` — obojí už neexistuje (`kalkVerze`, `test_er_nova_kalkulace.js`). `overit_proj17.mjs:41` a `overit_zaporne.mjs:135` odkazují na #759 (přečíslováno na #761). Hlavička seznamu očekávaných rozdílů uvádí základ c89e872 (v24.11.5), kolo běží proti v24.11.6. | Opravit texty jedním commitem. |
| N7 | informace | pojistka testu | Pojistka „proti c89e872 padá“ je hrubá: sada skončí na prvním testu (`kalkNova` chybí), jednotlivé testy tím doložené nejsou. Dokládají je mutace 25/25. | Bez akce. |

### Vedlejší pozorování mimo rozsah ER (stejné na základu 7339a9e)

U víc šachet tiskne nabídka příplatky podle sloupce Nabídka **šachty 1** (`nabidka.js:497`), kdežto krycí
list a objednané příplatky podle sjednocení šachet (`vsPriplatkyVNabidce`). Příplatek zaškrtnutý jen
v šachtě 2 je tedy na krycím listu a v Pipedrive, ale v nabídce ne (ověřeno na ventilátoru na základu
i na ER). Engineering to zviditelní, protože je „za variantu“ a přitom se zaškrtává po šachtách.
Doporučuji samostatný nález do roadmapy — není to chyba ER.

## Co bylo prověřeno

### 1. Příznak `kalkVerze`

- Vzniká jen v `ZADANI_NOVA` → `novaVariantaData()` (nová zakázka, `pdCerstvaPriprav`, webhook přes
  `novaZakazka()`). `DEFAULT_ZADANI` ho nenese.
- Nová varianta v zakázce = vždy klon aktivní (`klonujVariantu`), šachta 2+ = kopie existující šachty
  (`vsKopieDat`) → příznak se dědí, smíšená varianta běžnou cestou nevznikne.
- Import a duplikát příznak nedoplní ani nesmažou (testy oddíl 6 a 12).
- Server: jiná hodnota než 2 = chyba tvaru, i u šachet 2+; zamčené varianty přeskakuje. Změnu nehlídá → N3.
- Smíšená varianta (š1 stará, š2 nová — jen podvrhem): engineering jednou v Režii a jednou v příplatcích,
  bez pádu.
- Zastaralá stránka po nasazení: aplikace má hlídku verze serveru (`ONLINE_STAV.serverVerze`).

### 2. Engineering jednou za variantu

- 1 šachta ks = 2 i 2 šachty (3 + 2 ks): řádek 1 × 10 000, ostatní příplatky × ks, „Příplatky celkem“ =
  součet řádků. Model 1 u víc šachet počítá jen šachtu 1 (dřívější chování).
- Objednané příplatky, krycí list (jen když je v nabídce), controlling (příplatky, mimo základ),
  nabídka CZ/EN/DE/FR (přeložený název, cena s rezervou), zámek (přepočet shodný, zmrazený výsledek nese
  `rezerva*`) — v pořádku pro shodné šachty. Různé šachty → N1.
- Překlad klíče „ENGINEERING“ nezměnil žádný dokument staré kalkulace (viz oddíl 6).

### 3. Rezerva v položkách

- Cena položky = ↑ tisíce((náklad + rezerva) × (1 + m)); Model 2 z nákladu, Model 1 z ceny. Náklad položky
  beze změny. Souhrnná rezerva se u nové nepřičítá podruhé.
- Controlling: prodej položky bez rezervy + řádek REZERVA PŘÍPLATKY; Σ prodej = Σ cen položek, i ze zámku
  a u víc šachet (rezerva × ks). Stará kalkulace: řádek z procenta jako dosud.
- Sleva a měna: beze změny kódu (sleva jde na základní cenu, EUR se převádí z `sMarzi` položky).
- Součet proti dřívějšku → N2.

### 4. Automat ATYP

- Automat nechá pole s ruční značkou, ostatní dostanou předlohu; ruční klik dosadí vše; vypnutí ruční
  hodnotu drží. `test_atyp_idempotence.js` 37 OK (úprava testu jen rozšiřuje vzor volání, neoslabuje).
- Víc šachet a staré značky → N4.

### 5. Přepínače

- Stará kalkulace: přepínače Engineering, Výstup ze zaměření a statika opláštění v UI zůstávají a platí.
- Nová: místo nich poznámka „v příplatkových položkách“; jádro uložené hodnoty přepínačů ignoruje;
  specifikace „výstup ze zaměření: ano“.

### 6. Porovnání a staré kalkulace

Tři nezávislé důkazy, že stará kalkulace zůstala bajt po bajtu:

1. Kolo — porovnání sestavení proti integraci: viz „Běh kola“ níže.
2. Zlaté sady #560 a VS: scénáře s odebraným příznakem dávají **nepřegenerované** otisky.
3. Vlastní rozdílový běh revize: 300 náhodných starých kalkulací (engineering 0/1/2, výstup ano/ne,
   statika ano/ne/výchozí, rezervy, ATYP, Model 1 i 2, třetina víc šachet) × výsledek, nabídka CZ/EN/DE/FR,
   controlling, krycí list, zámek, objednané příplatky — základ 7339a9e × ER: **0 rozdílů**.

Seznam očekávaných rozdílů maskuje celé skupiny `scenar`, `k29`, `k36`, `k40`, `k50`, `ukazka` (`*`).
Je to široké, ale všechny tyto případy vznikají přes `novaZakazka()`; staré cesty hlídají body 2 a 3.
Starou kalkulaci seznam nemaskuje.

### 7. Svěřené rozhodnutí ER-1

Zlaté sady se nepřegenerovaly, jen se před výpočtem odebere příznak a klíč `engineering` ze seznamu
vynechaných. Sady tím dál dokazují starou cestu bit po bitu — neoslabeno. Nová cesta nemá zlatý otisk
celého výsledku, jen `test_er_nova_kalkulace.js` (89 testů) a mutace. Přijatelné; spadá do svěřených
rozhodnutí (jen testy, vratné jedním commitem). Texty záznamu → N6.

### 8. Testy a mutace

- `src/test_er_nova_kalkulace.js` 89 OK, `src/test_atyp_idempotence.js` 37 OK.
- Mutace [ER] 25 (dávka hlásí 25/25); revize je znovu nepouštěla celé, jen 7 vlastních ručních → N5.

## Běh kola

`bash nastroje/testovaci_kolo.sh --bez-mutaci --proti origin/claude/integrace-16-10 --ocekavane podklady/porovnani/ocekavane_er_2026-11-24.txt`

VYSLEDEK_KOLA
