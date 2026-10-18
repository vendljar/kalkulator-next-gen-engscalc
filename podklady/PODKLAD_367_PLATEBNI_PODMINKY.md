# Podklad #367 — výchozí platební podmínky v krycím listu a SoD (18. 10. 2026)

Pro J. V. k projití v pondělí 19. 10. 2026 (dávka V2, zadání koordinace
„ŘÍDÍCÍ 16.10“). Kód se neměnil. Stav kódu: `claude/integrace-16-10` @ `0dbec56`.
Artefakt se schématy: https://claude.ai/artifact/1Szx195YEHNcmTwXGh1Doi

**Otázka:** krycí list je od 29. 9. jediný zdroj a vyhrává. Odkud se do něj
dostanou *výchozí* hodnoty? PROJ: plán plateb z Nastavení → Firma (hotovo,
etapa B, #383 = 70 % + zbytek). OCK: většina natvrdo v kódu.

## 1. Kde se co zadává

| podmínka | OCK výchozí / zdroj | PROJ výchozí / zdroj | Firma | Pipedrive (`pd_mapa.mjs`) |
|---|---|---|---|---|
| splatnost | 14 dní, kód `kryci.js:163` | 14 dní, kód `nabidka_proj.js:38` | ne | mapováno |
| platnost | 2 měsíce, Firma | 2 měsíce, Firma | ano | ne |
| způsob fakturace | Po milnících, Firma | z předvolby plánu | ano | „Měsíční fakturace“ nemapováno |
| splátky | 50/40/10 jako 3 texty, kód `kryci.js:188–190` | plán plateb, Firma | jen PROJ | 1. a 2. splátka, 3. dopočet |
| zádržné | Ano bez % / Ne, kód `kryci.js:195–198` | — | ne | jedno pole |
| záruka | 60 měs., kód `kryci.js:227` + věta „5 let“ ve Firmě | — | jen věta | mapováno |
| pokuta splatnost | 0,05 %/den z číselníku | totéž | ne | jedno pole pro dvě pokuty |

Pipedrive čte jen server (`pd_deal.mjs`), výběr dealu v UI není (`zobrazeni.js:438`).

## 2. Nesoulady

- **N1 (vysoká)** součet splátek OCK nehlídá nic — dopočet faktury 2 jen v UI
  (`kryci_ui.js:15`), v `kontroly.js` pravidlo pro OCK není; CN tiskne „zbývající
  část“, SoD „zbývajících X %“ (`kryci.js:931, 1060, 1071`).
- **N2 (vysoká)** druhý milník OCK třikrát jinak: krycí list „po zahájení montáže“
  (`kryci.js:189`), CN „po ukončení výroby, dodání materiálu…“ (`:929`), SoD v1
  čtyři jiné milníky (`:1033–1036`); staré heslo slovníku 40/50 (`preklad.js:171–177`).
- **N3** splátky OCK jsou text, procento se vyčítá regexem; kalendář z 29. 9. chybí.
- **N4** SoD realizace v1 neumí měsíční fakturaci ani víc splátek; v2 čeká na nahrání.
- **N5** záruka na dvou místech (krycí list 60 × `firma.js:290–292` „5 let“).
- **N6** zádržné výchozí „Ano“ bez % bez upozornění; online nabídka ani SoD ho netisknou.
- **N7** splatnost ve dvou místech kódu, ne ve Firmě.
- **N8** zastaralá hesla slovníku (`preklad.js:277` 3 měsíce, `:327`, překlep `:987`),
  různé texty milníků PROJ (`nabidka_proj.js:324–345` × `plan_plateb.js:54`).
- **N9** věty `planZpusobFakturace` (`plan_plateb.js:383–392`) nejsou ve slovníku.
- **N10** Pipedrive ≠ model aplikace (jedna pokuta, procenta bez milníků).

## 3. Varianty

| | varianta | hodnocení | pracnost |
|---|---|---|---|
| A | natvrdo v kódu (dnes) | nedoporučuji | 0 |
| **B** | **firemní standard v Nastavení → Firma (jako plán PROJ)** | **doporučuji** | 3 dávky |
| C | profil podle typu zakázky (nadstavba B) | jen při potřebě | +1 |
| D | předvyplnění z Pipedrive (nadstavba B) | později, s výběrem dealu | +1 |
| E | prázdná pole + „Použít standard“ | nedoporučuji | malá |

Přednost: ruční zápis v KL → Pipedrive → profil typu → Firma → pojistka v kódu.
Odeslané/vytištěné zmrazené (P9.5, #366); rozpracované se přizpůsobí (jako K20-N1).

Balíky: **P1** Firma (splatnost, záruka, zádržné, předvolby kalendáře OCK) M;
**P2** kalendář OCK v KL + převod 3 polí + zábrana 100 % + CN v14 L;
**P3** SoD realizace v2, vyřazení v1, sjednocení milníků, slovník M;
P4 profily (C) M; P5 Pipedrive (D) M.

Testy: nové — zábrana součtu OCK (pojistka před/po), shoda milníků KL × CN × SoD;
rozšířit `test_standardy`, `test_platby_ock`, `test_kryci`, `test_sod_realizace`,
`netlify/test_funkce.mjs`, `overit_podminky`, `overit_plan_plateb`; mutace.

## 4. Otázky pro J. V. (doporučení)

1. Odkud výchozí OCK? → Nastavení → Firma (B), kód jen pojistka.
2. Liší se podmínky podle typu zakázky? → zatím ne; profily až při potřebě.
3. Přebírat z Pipedrive? → ano později, jen předvyplnění při spárování, KL má přednost.
4. OCK 3 textová pole → kalendář „procento + milník“? → ano (návrh 29. 9. odd. 2), převod starých.
5. Znění 2. milníku? → „po ukončení výroby, dodání materiálu na stavbu a zahájení prací“ všude.
6. Součet ≠ 100 %? → zábrana jako `planPlateb100`.
7. Splatnost? → jedna společná ve Firmě (14 dní), přepsatelná v KL.
8. Záruka? → 60 měs. ve Firmě, větu „5 let“ z kapitoly termínů odstranit.
9. Zádržné? → výchozí stav a % ve Firmě (určí J. V.), „Ano“ bez % = upozornění.
10. SoD realizace v2 místo v1? → ano; sezení vyrobí, J. V. nahraje.
11. Změna standardu i pro rozpracované? → ano jako K20-N1; odeslané beze změny.
12. Pořadí? → P1 → P2 → P3; P5 s výběrem dealu; P4 podle ot. 2.
