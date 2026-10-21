# #277 — Čtyři oddíly nabídky podle D. Sikory: skutečný stav a co zbývá

> Podklad k rozhodnutí, připraven 23. 9. 2026 večer (dávka D4).
> Zadání (mail D. Sikory, předán 21. 9. 2026): v nabídce chybí **PLATEBNÍ
> PODMÍNKY, POŽADAVKY NA PROVEDENÍ REALIZACE, TERMÍNY REALIZACE, PŘEDÁNÍ
> DÍLA**.

## Krátce

Všechny čtyři oddíly v nabídce OCK **dnes jsou**. Doplnila je 21. 9. položka
#282 (kolo 6, P7) a #277 zůstala v roadmapě otevřená jen proto, že se
nikdo nevrátil ji zavřít. Při kontrole se ale ukázaly **dvě skutečné díry**:

1. **Dvě cesty k dokumentu, dva zdroje textu.** Náhled a PDF z aplikace berou
   kapitoly IV.–VI. z Nastavení → Firma. Wordová šablona v10 je má **napsané
   natvrdo**. Co se změní v Nastavení, se do Wordu nedostane, a naopak.
2. **Termín dodání se do nabídky nedostane (nález TD1).** Aplikace umí
   termín dodání i s prodloužením za ATYP (+4 týdny, zadání 21. 8. 2026)
   a skládá z něj `{{PODM_TERMIN_DODANI}}`. Tento symbol ale nepoužívá
   **ani šablona v10, ani náhled v aplikaci**. Kapitola V. všude říká pevné
   „cca 12 týdnů“. U atypické zakázky tak zákazník dostane o 4 týdny kratší
   termín, než počítá krycí list.

## Stav oddílů po cestách

| Oddíl | Náhled / PDF z aplikace | Word (šablona CN v10) | Odkud se bere |
|---|---|---|---|
| III. Platební podmínky | ano | ano | **údaje zakázky** — zálohy, splatnost, platnost (`{{PODM_…}}`) |
| IV. Požadavky pro provedení realizace | ano | ano, **pevný text** | aplikace: Nastavení → Firma; Word: text v šabloně |
| V. Termíny realizace | ano, pevný text z Firmy | ano, **pevný text** | ani jedna cesta nebere termín ze zakázky (**TD1**) |
| VI. Předání díla | ano | ano, **pevný text** | aplikace: Nastavení → Firma; Word: text v šabloně |
| Doložky | ano | ne | Nastavení → Firma |

Ověřeno 23. 9. 2026 nad `src/nabidka.js`, `src/kryci.js` a šablonou
`Sablona_NABIDKA_CN_v10.docx` z Drive (šablona zůstala mimo repozitář).

Nabídka **PROJ** má vlastní platební podmínky a termíny pevně v šabloně
(zaměření, studie…) a kapitoly IV.–VI. nemá. Mail D. Sikory mířil na OCK,
proto se tu PROJ neřeší.

## Co navrhuji (výchozí odpovědi — odpovězte jen tam, kde se chcete odchýlit)

1. **Jeden zdroj textu: Nastavení → Firma.** Ve wordové šabloně nahradit
   pevné texty kapitol IV.–VI. symboly `{{FIRMA_NAB_POZADAVKY}}`,
   `{{FIRMA_NAB_TERMINY}}`, `{{FIRMA_NAB_PREDANI}}` a doplnit
   `{{FIRMA_NAB_DOLOZKY}}`. Aplikace je už vydává, včetně jazykových verzí.
   Upravenou šablonu (v11) připravím já, nahraje ji administrátor
   (Nastavení → Šablony). Do repozitáře nejde.
2. **TD1 opravit:** termín dodání (s ATYP +4 týdny) dát jako první odrážku
   kapitoly V. v náhledu i ve Wordu (`{{PODM_TERMIN_DODANI}}`). Zbytek
   kapitoly V. zůstane textem z Firmy. Pevné „cca 12 týdnů“ z textu Firmy
   pak vypustit, aby tam nebyla dvě různá čísla.
3. **Konkrétní data** z krycího listu (převzetí staveniště, ukončení
   montáže, konečné předání) do nabídky **nedávat** a nechat je smlouvě.
   Platí rozhodnutí z 21. 8. 2026: domlouvají se až u smlouvy. D. Sikora
   psal o oddílu „Termíny realizace“, ne o datech, a ten v nabídce je.
4. **„Požadavky na provedení realizace“** nechat jako firemní standard
   (Nastavení → Firma), ne jako pole zakázky. Šablony z mailu D. Sikory
   nemám. Pokud v nich je něco, co se liší zakázka od zakázky, pošlete je
   a doplním to.
5. **#277 uzavřít** v roadmapě s odkazem na #282. Body 1 a 2 vést jako
   nové položky (šablona v11, TD1).

## Co je potřeba od vás

- Souhlas s body 1–5, nebo odchylky.
- Pokud chcete bod 4 řešit podle šablon D. Sikory: poslat ty šablony
  (CZ/EN/DE).
