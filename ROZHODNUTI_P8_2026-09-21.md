# P8 — devět voleb k rozhodnutí (kolo 6)

**Pro:** J. V. · **Datum:** 21. 9. 2026 · **Stav aplikace:** v21.9.9

Zadání kola 6 u P8 říká výslovně: *„Je to podklad k ROZHODNUTÍ, ne
k nasazení."* Tenhle dokument tedy **nic nemění**. U každé volby stojí,
co aplikace dělá dnes, čeho se otázka týká, co doporučuji a proč.

**Žádné částky.** Kde je potřeba číslo, odkazuji na klíč ceníku — konkrétní
sazby jsou ve vyhodnocovacím sešitu na Drive, do repozitáře nepatří.

**Čemu nerozumím, to píšu.** Detaily nálezů N8, N9, N11–N14 a N18 jsou
v hodnoticím sešitu, ke kterému odsud nemám přístup. U voleb, kde mi chybí
vaše měření, to říkám nahlas místo abych si domýšlel — označené **⚠**.

---

## 1. Výchozí model výpočtu

**Dnes:** nová zakázka začíná **Modelem 2** (`zakazka.js`: `fixes: true`).
Přepnuto 17. 9. 2026 vaším rozhodnutím; štítek v hlavičce varuje barvou,
jen když je zapnutý Model 1.

**Otázka:** má to tak zůstat?

**Doporučení: ANO, ponechat Model 2.** Změřeno 16. 9. 2026 (#149): Model 1
předražuje atypové zakázky o jednotky procent — při marži 30 % a rezervě
30 % o 6,55 % — a celý rozdíl dělá **dvojitá marže v rezervě**. Model 2 je
tedy opravený výpočet, ne alternativa. Model 1 má smysl jen jako nástroj na
srovnání s Excelem a pro otevření starých zakázek.

**Riziko nulové:** uložené varianty si svůj model nesou v datech, takže se
rozhodnutím nic zpětně nepřepočítá.

---

## 2. Automatický ATYP

**Dnes:** kontrola standardu OCK po každé změně zadání sama zapíná
a vypíná ATYP (`standardAtypAutomat` v `src/ui/common.js`). Ručně zaškrtnutý
ATYP automatika nepřepisuje. Při otevření zakázky navíc `standardAtypUklid`
odškrtne ATYP, který už nemá oporu v kontrole standardu — a **řekne to
nahlas, protože to mění cenu**.

**Otázka:** má automatika zůstat, nebo se má ATYP zapínat jen ručně?

**Doporučení: ponechat automatiku, ale nikdy tiše.** Hlavní argument pro
automatiku je, že zapomenutý ATYP znamená nabídku pod cenou — a to se
pozná až po podpisu. Hlavní argument proti je, že automatika mění cenu bez
zásahu člověka. Dnešní kompromis (automatika + hlasité ohlášení + přednost
ruční volby) drží oba konce.

**⚠ Co potřebuji od vás:** nález N9 podle zadání mluví o automatickém ATYPu.
Pokud jste v testu viděl konkrétní zakázku, kde automatika rozhodla špatně,
pošlete mi její číslo — pravidlo kontroly standardu se pak dá upravit
cíleně, místo aby se vypínala celá automatika.

---

## 3. Výchozí volitelné položky

**Dnes** má nová zakázka zapnuté: **lešení vnitřní**, **háky na mytí**
(exteriér) a **úpravy zábradlí** (interiér). Vypnuté: lešení vnější, lešení
hlavy šachty, oplechování soklu prohlubně, přechodové plechy.

Sloupec **Výchozí** v tabulce položek to umí měnit pro celou firmu
(`vychoziZakladVolitelne` v `zakazka.js`); od 16. 9. 2026 funguje správně
i pro přechodové plechy.

**Otázka:** je tahle výchozí sada správná?

**Doporučení: rozhodnout podle četnosti, ne podle ceny.** Položka, která je
ve více než polovině zakázek, patří do základu; ostatní mezi příplatky. To
je pravidlo, které se dá později ověřit z dat — v aplikaci je analytika po
zakázkách, takže po pár měsících ostrého provozu půjde spočítat, jak často
se která položka doopravdy zaškrtává.

**Do té doby bych neměnil nic.** Dnešní sada odpovídá Excelu, ze kterého
kalkulačka vzešla, a změna výchozího stavu je změna ceny každé nové nabídky.

---

## 4. Tmelení

**Dnes:** řádek *TMELENÍ (MAT. + PRÁCE) (EXT)* se počítá **jen u exteriérové
šachty**, sazbou `C.tmeleniKc` za m², **po celé ploše opláštění bez ohledu
na typ** (to jste potvrdil 21. 9. 2026 u opláštění po stěnách).

**Otázka:** má se tmelit i u interiérové šachty?

**Doporučení: ponechat jen exteriér — ale je to otázka na dílnu, ne na mě.**
Tmelení spár je u venkovní šachty otázka těsnosti proti vodě; uvnitř budovy
tenhle důvod odpadá. Pokud se ale interiérové šachty tmelí kvůli vzhledu
nebo akustice, je dnešní stav chyba, která podhodnocuje každou interiérovou
nabídku.

**⚠ Co potřebuji:** jednu větu od montážníků — tmelí se interiérová šachta,
nebo ne? Podle odpovědi je to buď dvouřádková změna, nebo se jen zapíše, že
to tak má být.

---

## 5. Montáž

**Dnes:** `montazHod1 = montazZakladHod + hodinyNavic + montazAtypHod`
a **celkové hodiny = montazHod1 × 4**, tedy počítá se se **čtyřčlennou
partou**. Základ je 24 hodin na osobu (`DEFAULT_ZADANI.montazZakladHod`),
příplatkové hodiny se dopočítávají ze zadání.

**Otázka:** je čtyřčlenná parta správný předpoklad pro všechny zakázky?

**Doporučení: udělat z počtu lidí POLE, ne konstantu.** Dnes je čtyřka
zadrátovaná v jádře (`* 4`). Malá interiérová šachta se dá postavit ve třech,
velká venkovní potřebuje pět lidí — a obchodník to o konkrétní stavbě ví.
Změna je malá: nové pole v zadání s výchozí hodnotou 4, takže se **žádná
existující zakázka nezmění**, a do technické specifikace se doplní řádek
o velikosti party.

Kdyby vás to nelákalo, druhá možnost je nechat to být: dnešní čtyřka je
z Excelu a roky funguje. Ale pak to patří do komentáře jako vědomé
rozhodnutí, ne jako konstanta bez vysvětlení.

---

## 6. Statika

**Dnes:** položka *STATICKÉ POSOUZENÍ* se počítá vždy, množství
`C.statikaHod` × sazba `C.statikaKc`. V technické specifikaci je pole
*OVĚŘOVACÍ STATICKÝ VÝPOČET KONSTRUKCE* s výchozí hodnotou **„ano"** — to je
ale jen text do dokumentu, **s cenou nijak nesouvisí**.

**To je podle mě skutečná chyba, ne jen otázka:** obchodník může
v specifikaci napsat „ne" a v ceně statika zůstane. Dvě místa, která si
mohou odporovat — přesně jako u oplechování soklu (nález N17, opraveno
dnes).

**Doporučení: svázat je.** Buď statiku převést mezi volitelné položky
(zaškrtávátko řídí cenu i specifikaci), nebo z pole specifikace udělat
odvozenou hodnotu z výpočtu. **Doporučuji první variantu** — statika se
u některých zakázek opravdu neobjednává a obchodník pro to potřebuje
vypínač.

---

## 7. Lešení

**Dnes** jsou tři samostatné položky: **vnitřní** (v základu zapnuté,
množství `leseniVez` = výška konstrukce), **vnější** (vypnuté, množství
`leseniU` — obvod lešení kolem šachty) a **dokončení hlavy šachty**
(vypnuté). Ke všem třem se připočítává jediná fixní částka `C.leseniFix`
(sjednoceno 11. 8. 2026).

V technické specifikaci přitom stojí, že **lešení kolem OCK pro provedení
opláštění zajistí objednatel** — a v kapitole IV. nabídky je požadavek
*„Zajištění montážního lešení"*.

**Otázka:** kdo tedy lešení dodává?

**Doporučení: dotáhnout to na jednom místě.** Dnešní stav se dá číst dvěma
způsoby a zákazník si vybere ten levnější. Navrhuji: když je *lešení vnější*
zaškrtnuté, musí řádek specifikace „LEŠENÍ KOLEM OCK…" říct, že je
v dodávce, a odpovídající odrážka v kapitole IV. zmizet. Je to týž
mechanismus, jaký dnes funguje u soklu.

**⚠ Co potřebuji:** potvrzení, že to takhle má být. Je to změna dokumentu,
který jde zákazníkovi.

---

## 8. DPH u zahraniční řady

**Dnes** má ceník **jedinou sazbu DPH** (`C.dph`) a používá se bez ohledu na
to, jestli varianta počítá tuzemskou, nebo zahraniční řadou. Zahraniční
nabídka se tiskne v eurech (kurz z ceníku), ale s českou sazbou DPH.

**To je věcně špatně u většiny zahraničních dodávek.** Dodání s montáží do
jiného členského státu EU se běžně fakturuje v **režimu přenesené daňové
povinnosti** — tedy bez DPH, s doložkou o reverse charge. Česká sazba na
zahraniční nabídce je číslo, které zákazník uvidí a nebude mu rozumět.

**Doporučení: dát zahraniční řadě vlastní sazbu DPH + doložku.** Konkrétně:
druhé pole v ceníku (sazba pro zahraniční řadu, výchozí 0) a v nabídce místo
řádku DPH věta o přenesené daňové povinnosti.

**⚠ Tohle je jediná z devíti voleb, kde doporučuji zeptat se účetní**, ne
rozhodovat podle toho, co dává smysl programátorovi. Režim se liší podle
země, podle toho, jestli je odběratel plátce, a podle toho, jestli je to
dodání s montáží, nebo bez. Naprogramovat to jde snadno; vědět, co tam má
stát, je jiná věc.

---

## 9. Hmotnost spojky

**Dnes** se spojky nepočítají jako kusy s vlastní hmotností, ale jako
**0,4 m profilu na spojku** (`engine.js`: `dSpojky = spojky * 0.4`). Ta délka
se přičte k celkové délce profilů a hmotnost z ní vyjde podle použitého
jeklu. Počet spojek je `⌈výška/4⌉ × rohové sloupky + rohové sloupky`.

**Otázka:** je 0,4 m správná náhrada za skutečnou hmotnost spojky?

**Doporučení: ponechat, dokud nebude čím to nahradit.** Výhoda dnešního
řešení je, že hmotnost spojky **sama sleduje profil** — u silnějšího jeklu
vyjde těžší, což odpovídá skutečnosti. Pevná hmotnost v kilogramech by tuhle
vazbu zrušila a musela by se udržovat pro každý profil zvlášť.

**⚠ Co potřebuji:** pokud máte z dílny skutečnou hmotnost spojky pro pár
běžných profilů, spočítám, o kolik se dnešních 0,4 m liší. Teprve to je
odpověď — dnes je to odhad, který nikdo neověřil, a to je na něm to
nepříjemné, ne to číslo samo.

---

## Souhrn

| # | Volba | Doporučení | Čeká na |
|---|---|---|---|
| 1 | Výchozí model výpočtu | Ponechat Model 2 | — |
| 2 | Automatický ATYP | Ponechat, nikdy tiše | ⚠ číslo zakázky z N9 |
| 3 | Výchozí volitelné položky | Zatím neměnit, pak rozhodnout z dat | — |
| 4 | Tmelení | Ponechat jen exteriér | ⚠ dotaz na dílnu |
| 5 | Montáž | Udělat z počtu lidí pole (dnes je 4 natvrdo) | vaše volba |
| 6 | Statika | **Svázat cenu se specifikací** — dnes si můžou odporovat | vaše volba |
| 7 | Lešení | Sjednotit dodávku napříč dokumentem | ⚠ potvrzení |
| 8 | DPH u zahraniční řady | Vlastní sazba + doložka o přenesené povinnosti | ⚠ účetní |
| 9 | Hmotnost spojky | Ponechat 0,4 m profilu | ⚠ údaj z dílny |

**Nejnaléhavější jsou #6 a #8.** Obě znamenají, že dnes může odejít
dokument, který si odporuje nebo uvádí špatné daňové zacházení — a to jsou
chyby, které se poznají až u zákazníka. Ostatní volby jsou o nastavení,
ne o chybách.

**Nic z toho jsem neprogramoval.** Až u každé volby padne rozhodnutí,
vznikne z nich samostatná dávka.
