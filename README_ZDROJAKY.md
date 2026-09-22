# Kalkulačka OCK / PROJ – zdrojové soubory

Verzi tohohle archivu nese soubor **`verze.txt`** — tam je vždycky pravda.

> Dřív tu stálo číslo natvrdo („v7.9.2") a zůstalo stát, zatímco archiv byl
> o víc než sto dávek dál. Číslo napsané na dvou místech se dřív nebo později
> rozejde, a to na tom, které je vidět první. Proto tu žádné není.

## Co je uvnitř

- `src/` – všechny zdrojové JavaScripty, šablona `app_template.html`, katalog `jekly.json`
  a jednotkové testy `test_*.js`
- `src/ui/` – uživatelské rozhraní rozdělené po záložkách
- `build.py` – sestavovací skript
- `verze.txt` – aktuální číslo verze (tvar DEN.MĚSÍC.pořadí)
- `podklady/` – **závazné popisy, jak se má aplikace chovat a vypadat**
  (např. `OBRAZOVKA_OPLASTENI.md`). Čte se na začátku práce; co je jen
  v chatu, se dřív nebo později ztratí. Návod je v `podklady/README.md`.
- `roadmapa/roadmap.json` – co se má udělat a co se čeká na rozhodnutí

## Jak sestavit aplikaci

    python3 build.py

Skript poskládá všechny zdroje do jednoho HTML souboru a vytvoří:

- `dist/kalkulacka.html` – vždy poslední sestavení
- `dist/kalkulacka_vXX.X.X.html` – archivní kopie s číslem verze
- `dist/index.html`

Výsledek je jediný soubor bez jakýchkoli závislostí – stačí ho otevřít v prohlížeči.

## Jak spustit testy

    ./spust_testy.sh

Skript pustí všechny sady a na konci vypíše souhrn; návratový kód 0 znamená,
že prošlo všechno. Testy se pouštějí **před** `python3 build.py`.

Ručně (kdyby nebyl k dispozici bash):

    cd src
    node test.js                              # 41 testů shody jádra s Excelem
    for f in test_*.js; do node "$f"; done    # ostatní sady

Pozor na to, že `test.js` **nespadá** pod glob `test_*.js`. Dřívější návod
pouštěl jen `test_*.js`, takže sada hlídající shodu výpočtu se šablonou VZOR
se tiše přeskakovala a rozbité jádro mohlo projít jako „zelené".

## Kouřový test v prohlížeči

    python3 build.py
    ./spust_testy.sh --smoke

Node sady ověřují jádro, ale nikdy nespustí prohlížeč. Jednosouborový build
přitom umí selhat způsobem, který se v Node neprojeví: zapomenutý modul
v `CORE`/`UI` v `build.py`, špatné pořadí souborů, překlep v inline `onclick`,
výjimka při prvním `render()`. `smoke.mjs` otevře opravdu sestavený
`dist/kalkulacka.html` v Chromiu a projde start, všechny záložky, Zpět/Znovu,
zálohu do prohlížeče i panely nastavení.

Potřebuje playwright (`npm i -g playwright`); bez něj se krok jen přeskočí,
sady v Node běží dál. Samostatně:

    NODE_PATH=$(npm root -g) node smoke.mjs

### Cílené harnessy (`overit_*.mjs`)

Vedle kouřového testu leží v kořeni repozitáře sada cílených kontrol —
každá otevře sestavený build v Chromiu a prověří jednu oblast: lištu
kalkulací, opláštění, zámek a odeslané nabídky, přihlášení a role, ceník
a jeho řady, nabídky a jejich DPH, zálohu a obnovu, analytiku a další.
Dnes je jich 37 a `./spust_testy.sh --smoke` pouští **všechny**; seznam se
nikde neudržuje ručně, běží se přes `overit_*.mjs`.

**Proč to stojí za zmínku (nález N16, 22. 9. 2026):** do 22. 9. měly CI
a místní běh dva ručně psané seznamy. V CI jich běželo deset z třiceti
sedmi — a právě ve zbylých vyšly tři nálezy 19. testovacího kola. Seznam se
proto na obou stranách nahradil globem: nový harness se přidá sám tím, že
vznikne soubor.

Samostatně:

    NODE_PATH=$(npm root -g) node overit_lista.mjs

`overit_lista.mjs` je cílená kontrola klouzající lišty kalkulací (Zpět/Znovu
+ kotvy sekcí, sticky chování), přejmenované záložky Přehled cenových nabídek
a karet obou nabídek v ní (od v29.7.5). Od v29.7.6 kontroluje i modrou barvu
lišty (shodnou s lištami názvů sekcí) a zadané krátké názvy kotev v liště
PROJ. Od v29.7.7 navíc hlídá ztlumený vzhled: rámeček lišty nesmí být plná
akcentová modř a stín nesmí být modrý ani rozlitý (žádná „luminiscence“).
Stejnou kontrolou prochází i ovládací lišta v Detailu výpočtu – porovnává se
přímo s klouzající lištou (podklad, rámeček, barva písma, stín, bílé pilulky
kotev), aby obě zůstaly stejné.

**Harnessy, které potřebují firemní podklady** (šablony smluv a nabídek,
vygenerovaná ROADMAPA.html, ruční příručka) se v repozitáři nenacházejí —
jsou to firemní dokumenty. Takový harness se **přeskočí a řekne, co mu
chybí**; nepadá a nepředstírá, že prošel. Cestu k podkladům lze předat
proměnnou `KNG_PODKLADY`.

`ADMIN_EMAIL` je potřeba u harnessů, které se přihlašují
(`ADMIN_EMAIL=spravce@priklad.cz`). Bez ní serverové cesty správně odmítnou
obsluhu — od 22. 9. 2026 návratovým kódem 503, viz nález B54 v CHANGELOGu.
