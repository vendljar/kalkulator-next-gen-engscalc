# Návrhy změn obchodníci – 9. 9. 2026

Stav řešení úkolů ze schůzky. Aktualizováno 9. 9. 2026, verze aplikace 9.9.2.

Legenda stavu: HOTOVO = nasazeno a ověřené testy · ZJIŠTĚNO = odpověď níž, čeká
na rozhodnutí · ČEKÁ = zadané, ještě neřešené.

---

## 1. Překlady CZ→DE se nabízely i u českých zakázek — HOTOVO

**Co bylo špatně.** V nové zakázce OCK pro ČR se v sekci REŽIE ukazoval řádek
PŘEKLADY CZ→DE, přestože patří jen k zahraničním zakázkám.

**Proč se to dělo.** O tom, že položka do české nabídky nepatří, rozhodovalo
zaškrtávátko „jen zahr." v ceníku. Dokud ho někdo nezaškrtl (nebo se ztratilo
při zveřejnění ceníku či obnově ze zálohy), řádek se v české nabídce objevil.
Poznámka v ceníku přitom tvrdila opak — dvě různá místa, dvě různé pravdy.

**Co se změnilo.** Překlady jsou nově vedené jako položka, která v tuzemské
zakázce neexistuje, a to napevno. V české nabídce se nezobrazí za žádných
okolností, v zahraniční zůstávají beze změny. Zaškrtávátko v ceníku funguje
dál a umí skrýt i další položku, ale tuhle sadu už nejde omylem zrušit.

**Co to znamená pro vás.** Nic nemusíte přenastavovat. Cestovní náklady se
nemění — po ČR se jezdí taky, jen mají do zahraničí jinou sazbu.

---

## 2. Co všechno se počítá při zaškrtnutí „Průchozí šachta" — ZJIŠTĚNO

Ověřeno měřením na výpočtu (dva průchody, se zaškrtnutím a bez něj).

**Přímý dopad — jediný řádek.** Do sekce OPLÁŠTĚNÍ přibude položka
STŘÍŠKA NAD VSTUPEM NA DVŮR (PRŮCHOZÍ EXT), množství 1 × ceníková sazba.
Nic jiného se do kalkulace nepřidává.

**Jen u exteriérové šachty.** U interiérové zaškrtnutí s cenou neudělá vůbec
nic — ověřeno, rozdíl je 0 Kč.

**Nepřímý dopad — proto vychází víc, než je cena stříšky.** Řádek vstupuje do
základu, ze kterého se počítá:

- REZERVA (u vás 10 % základu) — rezerva se zvedne o 10 % ceny stříšky,
- PŘIRÁŽKA (globální, u vás 30 %) — počítá se z nákladu včetně té rezervy,
- zaokrouhlení celkové ceny nahoru na tisíce.

Vzorec: dopad na cenu = cena stříšky × (1 + rezerva %) × (1 + přirážka %),
pak zaokrouhlení nahoru na tisíce.

Příklad na zkušebních číslech (stříška 10 000 Kč, rezerva 10 %, přirážka 30 %):
náklad +11 000 Kč, přirážka +3 300 Kč, cena +14 300 Kč, po zaokrouhlení
+15 000 Kč. V režimu Model 2 je efekt o něco vyšší (přirážka +3 390 Kč),
protože se tam rezerva počítá z ceny včetně přirážky.

**Co se naopak NEmění.** Přirážka za ATYP se nezvedne — ta se počítá jen
z nákladu sekce Režie, kam stříška nepatří.

**Vedle ceny.** Zaškrtnutí předvyplní dvě pole technické specifikace:
PRŮCHOZÍ KABINA na „průchozí kabina" a PROSKLENÁ STŘÍŠKA na „nad výstupem
na dvůr". Na cenu to nemá vliv.

**Zbývá rozhodnout.** Jak přesně to obchodníkovi ukázat — nabízí se poznámka
u zaškrtávátka s vypočtenou částkou („přidá stříšku za X Kč, s rezervou
a přirážkou Y Kč"). Zatím nezaprogramováno, čeká na zadání.

---

## 3. Zasklení mezi příčníky = +4 hodiny projekce — HOTOVO

Při volbě „mezi příčníky (lišty)" se k projekci přičtou 4 hodiny navíc —
sklo do rámečku znamená navrhnout a zakreslit lišty.

**Jak to poznáte.** Řádek DÍLENSKÁ DOKUMENTACE ukáže vyšší počet hodin než
máte v poli „Projekce – základ" a v poznámce bude uvedeno
„+ 4 hod za zasklení mezi příčníky (lišty)".

**Vaše pole zůstává vaše.** Hodiny se přičítají ve výpočtu, do pole
„Projekce – základ" se nezapisují. Po přepnutí zpět na terče je řádek zase
původní, nic za sebou nezůstane.

**Sazba je v ceníku.** Položka „Projekce navíc – zasklení mezi příčníky"
v sekci REŽIE, výchozí hodnota 4 hodiny. Dá se změnit stejně jako každá jiná
cena, takže na úpravu není potřeba nová verze aplikace. Starší zakázky bez
této položky v ceníku počítají se čtyřmi hodinami.

---

## 4. Klikací šipky u číselných polí — HOTOVO

Šipky u všech číselných polí jsou pryč. Ubíraly šířku pole a daly se trefit
omylem při rolování. Zadávání z klávesnice je beze změny; kdo je zvyklý
používat klávesy šipka nahoru/dolů přímo v poli, funguje mu to dál.

---

## Přehled

| # | Bod | Stav |
|---|---|---|
| 1 | Překlady CZ→DE jen u zahraničních zakázek | HOTOVO (v9.9.2) |
| 2 | Rozbor výpočtu u „Průchozí šachta" | ZJIŠTĚNO — zobrazení čeká na zadání |
| 3 | Zasklení mezi příčníky: +4 h projekce | HOTOVO (v9.9.2) |
| 4 | Odstranění klikacích šipek u číselných polí | HOTOVO (v9.9.2) |

Změny se projeví po obnovení stránky (aplikace si o ně sama řekne).
