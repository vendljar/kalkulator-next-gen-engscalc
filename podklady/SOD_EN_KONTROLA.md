# Smlouvy o dílo v angličtině — kontrolní seznam pro rodilého mluvčího

Dávka V3 (#157), 17. 10. 2026, v17.10.6. Rozhodnutí J. V. 16. 10. 2026:
anglická smlouva o dílo = **věrný překlad české šablony**, ne nové právní
znění; rodilý mluvčí kontroluje jazyk a termíny, obsah se nemění.

## Soubory (mimo repozitář — firemní texty)

| Česká šablona | Anglická šablona | Slovník překladu |
|---|---|---|
| Sablona_SOD_REALIZACE_v2.docx | Sablona_SOD_REALIZACE_v2_EN.docx | Sablona_SOD_REALIZACE_v2.preklad_en.json |
| Sablona_SOD_PROJEKCE_v3.docx | Sablona_SOD_PROJEKCE_v3_EN.docx | Sablona_SOD_PROJEKCE_v3.preklad_en.json |

Předány J. V. jako přílohy sezení V3 (session_01GyotCYY7DhFnyXhceNA3de).
Opravy rodilého mluvčího se zapisují **do slovníku** (pole `en`, `pozn`)
a šablona se vyrobí znovu:

```
node nastroje/preklad_sod.js --kostra <složka>   # nové/změněné odstavce české šablony
node nastroje/preklad_sod.js <složka>            # → …_EN.docx + kontrola
```

Ve slovníku: `<s1>…</s1>` = úsek jiným písmem (tučně, podtržení), `\t`
tabulátor, `{{…}}` symbol — musí zůstat beze změny (kontrola to hlídá).
Opravy přímo ve Wordu jdou také (nahrát v Nastavení → Šablony → EN →
„Nahrát vlastní verzi"), jen se při další změně české šablony ztratí.

## Termíny ke kontrole

Překladová rozhodnutí platná v obou smlouvách:

| Česky | Anglicky (použito) | Alternativy / pozn. |
|---|---|---|
| Smlouva o dílo | Contract for Work | Works Contract, Contract for Works |
| objednatel / zhotovitel | Client / Contractor | Customer, Employer |
| dílo | the Work | the Works |
| smluvní pokuta | contractual penalty | smlouva se řídí českým právem |
| odstoupení od smlouvy | withdrawal from the contract | rescission, termination |
| nabývá platnosti a účinnosti | enters into force and effect | |
| IČ / IČO, DIČ | Company ID (IČ), VAT ID (DIČ) | Reg. No., VAT No. |
| daňový doklad | tax document (invoice) | VAT invoice |
| k rukám | attention | Attn. |
| NOZ (zák. 89/2012 Sb.) | NOZ / Civil Code | |
| jednatel | Managing Director | Executive |

SoD realizace (OCK):

| Česky | Anglicky | Pozn. |
|---|---|---|
| ocelová konstrukce výtahové šachty | steel structure of a lift shaft | UK „lift“, US „elevator“ |
| opláštění | cladding | |
| šachetní dveře | landing doors | |
| stavební připravenost | construction readiness | site readiness? |
| kolaudační řízení | final building approval (occupancy permit) procedure | |
| vícepráce | additional works | variations, extra works |
| stavební / montážní deník | construction / installation log | site diary |
| vady a nedodělky | defects and unfinished items | snagging items |
| ověření shody | conformity assessment | |
| skladovatel (nebezpečí škody) | bailee | depositary |
| záruka | warranty | guarantee |
| započtení, promlčené pohledávky | set-off, statute-barred receivables | |
| soudní znalec | court-appointed expert | sworn expert |
| režim přenesené daňové povinnosti | reverse-charge regime | viz otázky níž |

SoD projekce (PROJ):

| Česky | Anglicky | Pozn. |
|---|---|---|
| povolení záměru (DPZ) | project permit; documentation for the project permit | building permit? |
| inženýrská činnost DOSS | engineering activities – DOSS | DOSS = dotčené orgány státní správy |
| dokumentace pro provedení stavby | documentation for the construction | construction documentation, detailed design |
| ekonomická zadávací část | economic tender part | |
| slepý rozpočet a výkaz výměr | blank bill of quantities and schedule of quantities | není to v angličtině zdvojené? |
| nabytí právní moci | becoming final and legally effective | |
| ČSN, ČKAIT | ponechány zkratky | |
| SVJ | owners’ association (SVJ) | |

## Místa, kde překlad věrně opakuje českou šablonu (k posouzení J. V.)

Obsah se neměnil; tyto věci vypadají v češtině i angličtině sporně:

1. **SoD realizace, čl. V:** věta o režimu přenesené daňové povinnosti
   a hned za ní prohlášení o snížené sazbě DPH pro bydlení — u zahraničního
   zákazníka může platit jiný režim DPH.
2. **SoD realizace, čl. VI:** skladovací poplatek je v české šabloně
   v korunách — v anglické verzi zůstal v CZK (smlouva jinak v eurech).
3. **SoD realizace, čl. IV a VII:** minimální teplota +5 °C a −5 °C —
   převzato, jak je.
4. **SoD realizace, čl. VIII (mlčenlivost):** česká věta střídá jednotné
   a množné číslo; v angličtině obě strany, poslední dvě věty jen objednatel
   (jako v češtině).
5. **SoD realizace, čl. XII:** věta o pokutě za stavební připravenost
   v češtině nemá slovo „smluvní pokutu“ — přeloženo, jak stojí.
6. **SoD PROJ, čl. VII:** odkaz „dle odst. 5. tohoto článku“ — článek tolik
   číslovaných odstavců nemá; převzato.
7. **SoD PROJ, příloha č. 1:** „DPZ+DSP“ natvrdo — mění se s #380 Q7.

Hodnoty, které do anglické smlouvy dosazuje aplikace (seznam splátek SoD
realizace, platby SoD PROJ, druh místa plnění), jsou ve slovníku aplikace
(`src/preklad.js`, oddíl „Smlouva o dílo v cizím jazyce (#157)“) — opravy
termínů tam pošle J. V. stejně jako u nabídek.
