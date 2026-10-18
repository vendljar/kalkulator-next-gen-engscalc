# Smlouvy o dílo v angličtině, němčině a francouzštině — kontrolní seznam pro rodilé mluvčí

Dávka V3 (#157): EN 17. 10. 2026 (v17.10.6), DE a FR 18. 10. 2026
(v18.10.7, rozhodnutí J. V. 18. 10.). Rozhodnutí J. V. 16. 10. 2026:
cizojazyčná smlouva o dílo = **věrný překlad české šablony**, ne nové právní
znění; rodilý mluvčí kontroluje jazyk a termíny, obsah se nemění.

## Soubory (mimo repozitář — firemní texty)

| Česká šablona | Jazykové šablony | Slovníky překladu |
|---|---|---|
| Sablona_SOD_REALIZACE_v3.docx (z v2 nástrojem) | …_v3_EN.docx, …_v3_DE.docx, …_v3_FR.docx | Sablona_SOD_REALIZACE_v3.preklad_en/de/fr.json |
| Sablona_SOD_PROJEKCE_v3.docx | …_v3_EN.docx, …_v3_DE.docx, …_v3_FR.docx | Sablona_SOD_PROJEKCE_v3.preklad_en/de/fr.json |

Předány J. V. jako přílohy sezení V3 (session_01GyotCYY7DhFnyXhceNA3de;
EN 17. 10., DE/FR a EN slovník s pojmenovanými místy 18. 10.). Opravy
rodilého mluvčího se zapisují **do slovníku** (pole `en` / `de` / `fr`,
`pozn`) a šablona se vyrobí znovu:

```
node nastroje/preklad_sod.js --kostra --jazyk de <složka>   # nové/změněné odstavce české šablony
node nastroje/preklad_sod.js --jazyk de <složka>            # → …_DE.docx + kontrola (bez --jazyk = en)
```

## Režim DPH a skladné (rozhodnutí J. V. 18. 10. 2026) — KE KONTROLE ÚČETNÍ

Česká šablona **SoD realizace v3** (`node nastroje/vyrob_sablony.js
--sod-real-v3 <složka>` z v2) nese v čl. V místo pevných vět symboly
a věty dosazuje aplikace podle pole krycího listu OCK **Režim DPH ve
smlouvě**; jazykové verze přeloží slovník aplikace (`src/preklad.js`).

| Režim (krycí list) | `{{SOD_DPH_REZIM}}` (čl. V odst. 2) |
|---|---|
| česká DPH v zákonné sazbě — výchozí při DIČ CZ / bez DIČ / mimo EU | K ceně díla bude připočtena DPH v zákonné sazbě platné ke dni uskutečnění zdanitelného plnění. |
| přenesená daňová povinnost (tuzemsko) | DPH bude účtováno dle platných předpisů v režimu přenesené daňové povinnosti. *(věta šablony v2; tuzemský reverse charge u stavebních prací)* |
| reverse charge EU (zákazník z jiného státu EU) — výchozí při DIČ státu EU | Plnění není předmětem české DPH; daň přizná a odvede objednatel v režimu přenesení daňové povinnosti (reverse charge) podle čl. 196 směrnice Rady 2006/112/ES. |

`{{SOD_DPH_PROHLASENI}}` (čl. V odst. 3, číslo „3." zůstává): při české DPH
a místě plnění *bytový dům* / *rodinný dům* prohlášení o snížené sazbě DPH
podle § 48 zákona o DPH (věta šablony v2); jinak „Objednatel se zavazuje,
že o každé změně skutečností rozhodných pro režim DPH podle odst. 2 tohoto
článku bude zhotovitele písemně informovat do tří dnů ode dne, kdy taková
změna nastane." (druhá věta původního odstavce, zobecněná).

**K posouzení účetní:** (1) věta reverse charge EU — u stavebních prací je
místem plnění místo nemovitosti, takže u stavby v ČR a zákazníka z EU
může jít o českou DPH; (2) přenesená daňová povinnost — ustanovení ZDPH
(§ 92a / § 92e u stavebních prací) a zda nemá být prohlášení zákazníka
o registraci k DPH; (3) zda prohlášení o snížené sazbě patří jen k české
DPH u bytového a rodinného domu; (4) výchozí volba podle předpony DIČ
objednatele.

**Skladné** `{{SOD_SKLADNE}}` (čl. VI): částka z Nastavení → Firma
(Kč za den, bez výchozí hodnoty) — česky „N,- Kč" jako dosud, v EN/DE/FR
smlouvě v eurech kurzem ceníku (celá eura nahoru).

Ve slovnících v3 je skladné pojmenované místo `[[SKLADNE]]`
(„{{SOD_SKLADNE}} per day" / „pro Tag" / „par jour"); změna znění =
přepis jednoho záznamu a nové vyrobení šablony. Místa DPH ze slovníků v2
zanikla — věty dodává aplikace.

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

## Němčina a francouzština — použité termíny

Navazují na hesla, která aplikace už používá v nabídkách (Vorhabengenehmigung /
autorisation du projet, Ausführungsplanung / dossier d’exécution …).

| Česky | Německy | Francouzsky | Pozn. |
|---|---|---|---|
| Smlouva o dílo | Werkvertrag | contrat d’entreprise | |
| objednatel / zhotovitel | Auftraggeber / Auftragnehmer | Client / Entrepreneur | FR alt. maître d’ouvrage |
| dílo | Werk | Ouvrage | |
| smluvní pokuta | Vertragsstrafe | pénalité contractuelle | |
| odstoupení od smlouvy | Rücktritt vom Vertrag | résolution du contrat | FR alt. résiliation |
| ocelová konstrukce výtahové šachty | Stahlkonstruktion des Aufzugsschachts | structure métallique de la gaine d’ascenseur | |
| opláštění | Verkleidung | habillage | FR alt. bardage |
| šachetní dveře | Schachttüren | portes palières | |
| stavební připravenost | Baubereitschaft | préparation du chantier | prověřit |
| kolaudační řízení | Abnahmeverfahren (Kollaudierung) | réception administrative (conformité) | prověřit |
| vícepráce | Mehrleistungen | travaux supplémentaires | |
| stavební / montážní deník | Bau-/Montagetagebuch | journal de chantier/de montage | |
| vady a nedodělky | Mängel und Restarbeiten | défauts et travaux inachevés | FR alt. réserves |
| ověření shody | Konformitätsbewertung | évaluation de la conformité | |
| skladovatel | Verwahrer | dépositaire | prověřit |
| záruka | Garantie | garantie | DE alt. Gewährleistung |
| započtení | Aufrechnung | compensation | |
| soudní znalec | gerichtlich bestellter Sachverständiger | expert judiciaire | |
| jednatel | Geschäftsführer | gérant | |
| povolení záměru | Vorhabengenehmigung | autorisation du projet | alt. Baugenehmigung / permis de construire |
| inženýrská činnost DOSS | Ingenieurleistungen DOSS | prestations d’ingénierie DOSS | |
| dokumentace pro provedení stavby | Ausführungsplanung | dossier d’exécution | |
| ekonomická zadávací část | wirtschaftlicher Ausschreibungsteil | pièces économiques de consultation | |
| slepý rozpočet a výkaz výměr | Blankett-LV und Mengenermittlung | DQE non chiffré et métré | prověřit |
| SVJ | Eigentümergemeinschaft | syndicat des copropriétaires | |
| IČ / DIČ | Ident.-Nr. (IČ) / USt-IdNr. (DIČ) | N° d’identification (IČ) / N° de TVA (DIČ) | |

## Místa, kde překlad věrně opakuje českou šablonu (k posouzení J. V.)

Obsah se neměnil; tyto věci vypadají v češtině i v překladech sporně
(body 1 a 2 jsou pojmenovaná místa výš — J. V. je upraví):

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

Hodnoty, které do cizojazyčné smlouvy dosazuje aplikace (seznam splátek SoD
realizace, platby SoD PROJ, druh místa plnění), jsou ve slovníku aplikace
(`src/preklad.js`, oddíl „Smlouva o dílo v cizím jazyce (#157)“) — opravy
termínů tam pošle J. V. stejně jako u nabídek.
