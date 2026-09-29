# Návrh: platební podmínky z krycího listu (29. 9. 2026)

Pro J. V. — k rozhodnutím **P10.3** („potřebujeme dotahovat vše z krycího
listu, připrav návrh jak by to mohlo fungovat a vypadat"), **P10.6** („to je
chaotické, můžeš zkusit navrhnout koncept?"), **P9.1** (číslo smlouvy =
vlastní řada) a **P9.3** (splátky SoD PROJ z krycího listu a dopočítat)
z rozboru D kola 16 (`podklady/K16_ROZBOR_2026-09-25.md`). Roadmapa #367
a #366. **Odsouhlaseno J. V. 29. 9. 2026 — rozhodnutí v oddílu 7**
(po vyzkoušení prototypu https://claude.ai/artifact/6sbxbaAsBpphfPfE2wnM3a).

Co už platí od v29.9.2: platnost 2 měsíce, splatnost a platnost v nabídce
PROJ z krycího listu, způsob fakturace „Po milnících / Měsíční", záruka
z krycího listu, věty „(bez DPH)" (šablona CN v13).

---

## 1. Princip: jeden zdroj, ostatní jen čtou

```
Nastavení → Firma (firemní standard)  ──předvyplní──▶  KRYCÍ LIST zakázky  ──čtou──▶  nabídka online
                                                          (obchodník upraví)           Word nabídky
                                                                                       smlouva o dílo
                                                                                       krycí list (tisk)
```

- **Krycí list je jediné místo**, kde se platební podmínky zakázky zadávají.
  Při rozporu vyhrává krycí list (rozhodnutí J. V. 10.5, 10.7).
- **Nastavení → Firma** dává jen výchozí hodnoty (firemní standard 50 / 40 / 10).
- **Šablona ani kód nenesou procenta ani milníky natvrdo.** Dnes je nese
  šablona CN (věty o dílčích dokladech s pevným milníkem) a kód nabídky PROJ
  (procenta po činnostech) — proto se rozcházejí s krycím listem.
- Odeslaná nabídka má podmínky zmrazené (P9.5, hotovo v29.9.2), takže
  pozdější smlouva nese totéž, co odešlo.

---

## 2. OCK — platební kalendář v krycím listu (P10.3)

### Jak by vypadal krycí list

```
PLATEBNÍ PODMÍNKY
  Způsob fakturace     (•) Po milnících    ( ) Měsíční
  Předvolba            [ Náš standard 50 / 40 / 10  ▼ ]   (Bez zálohy 90 / 10 · 30 / 60 / 10 · vlastní)

  Platební kalendář                                                     součet 100 % ✓
  ┌───┬───────┬──────────────────────────────┬──────────────────────────────────────────────────────────┐
  │ # │   %   │ doklad                       │ vystaví se (milník)                                      │
  ├───┼───────┼──────────────────────────────┼──────────────────────────────────────────────────────────┤
  │ 1 │  50 % │ 1. dílčí daňový doklad       │ [po podpisu smlouvy o dílo                          ▼]   │
  │ 2 │  40 % │ 2. dílčí daňový doklad       │ [po ukončení výroby, dodání materiálu na stavbu      ▼]   │
  │   │       │                              │  a zahájení prací                                        │
  │ 3 │  10 % │ konečný daňový doklad        │ [po řádném předání díla                             ▼]   │
  └───┴───────┴──────────────────────────────┴──────────────────────────────────────────────────────────┘
  [+ přidat splátku]

  Splatnost faktur     [14] dní          Platnost nabídky   [2 měsíce]
  Zádržné …  Smluvní pokuty …  Záruka [60] měsíců     (beze změny)
```

- **Milník** se vybírá ze seznamu firemních milníků (Nastavení → Firma, každý
  s překladem EN/DE/FR a volitelnou větou o podmínce úhrady), nebo se napíše
  vlastní — u vlastního kontrola upozorní, že se do cizí nabídky nepřeloží.
- **Doklad** (1. dílčí / 2. dílčí / konečný) se pojmenuje sám podle pořadí.
- **„Bez zálohy"** přestane být volba jednoho pole — je to kalendář bez
  první splátky (např. 90 / 10). Dnes dává ve Wordu „ve výši  (+ DPH)".
- **Měsíční fakturace** kalendář schová; do dokumentů jde jedna věta (znění
  viz otázka 2).
- Součet ≠ 100 % → **zábrana** před nabídkou (nabídka s chybným kalendářem
  nesmí odejít).

### Jak by to vypadalo v nabídce (online i Word, česky)

> **III. PLATEBNÍ PODMÍNKY**
> Cena díla je splatná v následujících dílčích splátkách:
> 1. dílčí daňový doklad ve výši 50 % (bez DPH) z celkové ceny díla bude
>    vystaven po podpisu smlouvy o dílo. Úhrada tohoto dokladu je podmínkou
>    pro dodržení předem dohodnutých realizačních termínů.
> 2. dílčí daňový doklad ve výši 40 % (bez DPH) z celkové ceny díla bude
>    vystaven po ukončení výroby, dodání materiálu na stavbu a zahájení prací.
>    Úhrada tohoto dokladu je podmínkou pro předání díla objednateli.
> Konečný daňový doklad ve výši 10 % (bez DPH) z celkové ceny díla bude
> vystaven po řádném předání díla.
> Splatnost faktur 14 dní ode dne vystavení. Platnost této nabídky je 2 měsíce.

Anglicky (automaticky, z přeložených milníků):
> The 1st partial tax invoice amounting to 50 % (excl. VAT) of the total
> contract price will be issued after the contract for work is signed. …

- **Word:** šablona CN v14 místo pevných vět jeden symbol
  `{{PODM_PLATEBNI_KALENDAR}}` (věty skládá aplikace v jazyce nabídky).
  Věty se tím nemohou rozejít s krycím listem ani s online nabídkou.
- **Smlouva o dílo OCK:** týž symbol, a když ho šablona SoD chce, i částky
  splátek `{{SOD_PLATBA1_KC}}` … (procento × cena díla po slevě).
- **Starší zakázky:** dnešní pole „50 % – po podpisu smlouvy", „40 % – po
  zahájení montáže", „10 % – po předání" se převedou na řádky kalendáře
  (procento + milník) — nic se neztratí.

---

## 3. PROJ — plán plateb po činnostech (P10.6, P9.3)

### Proč je to dnes chaotické

Tentýž plán plateb projekce je napsaný čtyřikrát a každé znění je jiné:

| kde | dnešní znění | kdo ho mění |
|---|---|---|
| nabídka PROJ (online + Word) | procenta po činnostech: ZA 50/50, SP 50/40/10, DPZ 50/30/20, IČ 50/30/20, DPS 50/50, EZC 50/50, kolaudace 50/50, AD 100 % měsíčně | natvrdo v kódu / šabloně |
| krycí list PROJ | „Záloha 50 %", zaměření / DPZ / DPS „100 % po …" | obchodník |
| smlouva o dílo PROJ | 8 plateb v Kč podle milníků (podpis, 2D výstupy, DOSS, SÚ, povolení, DPS, EZC, výběr dodavatele) | obchodník ručně |
| Nastavení → Firma | „po dokončení jednotlivých stupňů dokumentace" | administrátor |

J. V.: „mohou to být všechny 4" — podle zakázky platí kterékoli z nich.

### Koncept: jeden plán v krycím listu PROJ, čtyři pohledy na něj

Plán plateb = pro každou **nabízenou** činnost (jen oceněné sekce) seznam
splátek „procento + milník". Výchozí plán dává Nastavení → Firma (dnešní
procenta z kódu se tam přestěhují); obchodník volí **předvolbu** a může ji
upravit:

```
PLÁN PLATEB (projekce)       Předvolba [ Standard po činnostech ▼ ]
                             (Standard po činnostech · Záloha + zbytek po předání ·
                              100 % po dokončení stupně · Vlastní)
  činnost     │ splátka │   %  │ milník
  ZAMĚŘENÍ    │    1    │ 50 % │ po podpisu smlouvy / objednávky
              │    2    │ 50 % │ po zhotovení výstupů ze zaměření
  DPZ         │    1    │ 50 % │ po podpisu smlouvy / objednávky
              │    2    │ 30 % │ po dokončení DPZ v rozsahu pro podání na dotčené orgány
              │    3    │ 20 % │ po dokončení DPZ v rozsahu pro podání na stavební úřad
  IČ          │    1    │ 50 % │ po podpisu smlouvy / objednávky
              │    2    │ 30 % │ po podání na stavební úřad a zahájení řízení
              │    3    │ 20 % │ po vydání pravomocného povolení záměru
  …           (součet u každé činnosti 100 % ✓)
```

Z plánu se odvodí všechna čtyři znění — nikde se nepíše znovu:

1. **Nabídka PROJ** (online i Word PROJ v4): bloky „PLATEBNÍ PODMÍNKY DPZ" …
   jen pro nabízené činnosti, texty z plánu (dnes natvrdo).
2. **Krycí list PROJ** (tisk): shrnutí plánu jednou větou za činnost.
3. **Smlouva o dílo PROJ — splátky dopočítané (P9.3):** každá splátka =
   procento × cena činnosti **po slevě**; splátky se **stejným milníkem**
   napříč činnostmi se sečtou do jedné platby smlouvy (např. „Platba 1 — po
   podpisu smlouvy: 50 % ZA + 50 % DPZ + 50 % IČ = … Kč"). Ruční přepis
   částky zůstává možný; kontrola hlídá, že součet plateb = cena díla.
4. **Nastavení → Firma:** místo věty „po dokončení jednotlivých stupňů"
   výchozí plán (předvolby).

Předvolby pokryjí všechna čtyři dnešní znění: *standard po činnostech*
(= dnešní nabídka), *záloha + zbytek po předání* (= dnešní krycí list),
*100 % po dokončení stupně* (= dnešní Nastavení) a *vlastní* (smlouva
s milníky podle dohody).

---

## 4. Číslo smlouvy — vlastní řada (P9.1)

- Formát obdobný číslu nabídky, např. **`2026 - OPR - SOD - 0001`** (realizace)
  a **`2026 OVP SOD 0001`** (projekce).
- Číslo přidělí **server** při prvním vygenerování smlouvy k variantě
  (počítadlo po letech a druhu smlouvy — dva obchodníci nedostanou totéž),
  uloží se k variantě a tiskne jako `{{SOD_CISLO_SMLOUVY}}`. Další tisk téže
  smlouvy nese stejné číslo; klon varianty dostane nové.
- Varianta: ruční pole „Číslo smlouvy" v krycím listu s návrhem dalšího
  volného čísla — jednodušší, ale bez záruky, že se čísla nezdvojí.

---

## 5. Etapy a náročnost

| etapa | obsah | náročnost |
|---|---|---|
| A | OCK platební kalendář: krycí list, online nabídka, kontrola součtu, převod starých polí, symbol pro Word + šablona CN v14 (CZ/EN/DE/FR), SoD OCK | L |
| B | PROJ plán plateb: model v krycím listu PROJ, předvolby v Nastavení, nabídka PROJ online + šablona PROJ v4, dopočet splátek SoD PROJ | L |
| C | Číslo smlouvy ze serverové řady | M |

Doporučené pořadí A → B → C; C je nezávislá a jde udělat kdykoli.

---

## 6. Otázky pro J. V.

1. **OCK milníky:** souhlasí tři firemní milníky výše („po podpisu smlouvy
   o dílo", „po ukončení výroby, dodání materiálu na stavbu a zahájení
   prací", „po řádném předání díla")? Mají mít věty o podmínce úhrady?
2. **Měsíční fakturace:** jaké znění věty do nabídky a smlouvy (např.
   „Fakturace probíhá měsíčně podle skutečně provedených prací.")?
3. **PROJ:** souhlasí čtyři předvolby a sčítání splátek SoD PROJ podle
   milníku? Kterou předvolbu dát jako výchozí?
4. **Číslo smlouvy:** formát řady, počáteční číslo (navazuje na dosavadní
   papírové smlouvy?), serverové počítadlo, nebo ruční pole?
5. **Pořadí etap** A → B → C?

---

## 7. Rozhodnutí J. V. 29. 9. 2026

Odpovědi z prototypu (oddíl „Otázky"), doslova převzaté volby:

| # | otázka | rozhodnutí |
|---|---|---|
| 1 | milníky OCK | tři firemní milníky, jak jsou; věty o podmínce úhrady **ano — u 1. a 2. splátky jako dnes** |
| 2 | měsíční fakturace | znění „Fakturace probíhá měsíčně podle skutečně provedených prací." |
| 3 | plán plateb PROJ | čtyři předvolby **souhlas**; splátky smlouvy se stejným milníkem **sečíst do jedné platby**; výchozí předvolba **Standard po činnostech**; šablona SoD PROJ: **seznam plateb jedním symbolem** místo 8 pevných řádků |
| 4 | číslo smlouvy | **ruční pole s návrhem dalšího čísla** (ne serverová řada); formát realizace `2026 - OPR - SOD - 0001`, projekce `2026 OVP SOD 0001`; počáteční číslo **navázat na papírové smlouvy** |
| 5 | pořadí etap | **B → A → C** |

Co z toho plyne pro práci:

- **Etapa B (první)** — PROJ plán plateb: model v krycím listu PROJ,
  předvolby v Nastavení → Firma (výchozí Standard po činnostech), nabídka
  PROJ online + šablona PROJ v4 z plánu, dopočet splátek SoD PROJ sečtených
  podle milníku a nový symbol se seznamem plateb pro šablonu SoD PROJ
  (8 pevných řádků `SODP_PLATBA1_KC` … `SODP_PLATBA8_KC` nahradí; převod
  starších zakázek zachová ručně zadané částky).
- **Etapa A (druhá)** — OCK platební kalendář podle oddílu 2 beze změny;
  věty o podmínce úhrady jen u milníků „po podpisu smlouvy o dílo"
  a „po ukončení výroby, dodání materiálu na stavbu a zahájení prací".
- **Etapa C (třetí)** — číslo smlouvy jako ruční pole v krycím listu:
  aplikace navrhne další číslo podle uložených smluv (a čísla, na které se
  navazuje), obchodník ho může přepsat. Serverové počítadlo odpadá; proti
  zdvojení doporučuji aspoň kontrolu jedinečnosti při uložení (prototyp
  ukazuje, jak ke zdvojení dojde) — k potvrzení při etapě C.
- **Chybí:** poslední číslo papírové smlouvy realizace (OPR) a projekce
  (OVP), na které se má navázat — v odpovědi „v poznámce", poznámka
  nepřišla.
