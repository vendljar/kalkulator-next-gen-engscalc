# #367 fáze 2b — překlady ke kontrole rodilými mluvčími

Dávka V8b (v19.10.7, větev `claude/v8-367-firma`), 19. 10. 2026. Rozhodnutí J. V.
k Q3: „Prázdný jazyk přelož — žádný prázdný jazyk s českou zálohou.“ Obsah se
nemění, rodilý mluvčí kontroluje jazyk a termíny. Opravy se zapisují **do
Nastavení → Smlouvy / Šablony** (pole jazyka), ne do kódu: výchozí text v kódu je
jen továrna pro prázdné Nastavení.

## 1. Kapitoly nabídky OCK IV.–VI. a doložky — FRANCOUZŠTINA (NOVĚ)

Do v19.10.6 FR výchozí text neměla a francouzská nabídka tiskla češtinu
s upozorněním. Od v19.10.7 jsou výchozí texty v `src/firma.js`
(`DEFAULT_FIRMA.kapPozadavkyFr`, `kapTerminyFr`, `kapPredaniFr`, `dolozkyFr`),
přeložené z CZ s oporou o EN/DE. Uložená firma bez FR polí je dostane při
načtení (doplnění výchozích textů, dávka O3). **Ke kontrole celé.**

| Kapitola | Česky (zdroj) | Francouzsky (návrh) |
|---|---|---|
| IV. | Pro dokončení projekční části je nutné poskytnout finální dispoziční výkresy výtahové technologie | Les plans d’implantation définitifs et approuvés de la technologie de l’ascenseur sont nécessaires pour achever la conception de la gaine. |
| IV. | Dohoda ohledně termínů realizace a součinnosti s dodavatelem technologie výtahu | Le calendrier de montage des étapes clés du projet sera coordonné avec le fournisseur de l’ascenseur. |
| IV. | Nutná koordinace s celkovým harmonogramem stavby. | La coordination avec le calendrier général du chantier est obligatoire. |
| IV. | Zajištění přístupu na místo realizace … (nutné dojednat před zahájením přípravných prací) | Garantir l’accès au chantier et à toutes les zones liées au montage, y compris les voies de transport (à convenir avant le début des travaux préparatoires). |
| IV. | Ochrana proti pádu nesmí bránit naší instalaci | La protection antichute ne doit pas gêner notre montage. |
| IV. | Zajištění montážního lešení | Mise à disposition d’un échafaudage de montage. |
| IV. | Prostor pro skladování materiálu a nářadí během montáže | Espace de stockage pour le matériel et l’outillage pendant le montage. |
| IV. | Parkovací místo v bezprostřední blízkosti stavby … | Place de stationnement à proximité immédiate du bâtiment pour le montage et le déchargement du matériel. |
| IV. | Připojení na elektřinu 230V | Raccordement électrique 230 V pour les besoins du montage. |
| IV. | Bez časového omezení v běžné pracovní době, možnost práce o víkendech | Aucune restriction horaire pendant les heures de travail normales, possibilité de travailler le week-end. |
| IV. | WC | WC |
| IV. | Statika objektu a zkušební statika | Statique du bâtiment et statique d’essai. *(termín „zkušební statika“ — ověřit, EN „test statics“)* |
| V. | Zahájení montáže cca 12 týdnů po podpisu SoD a odsouhlasení finálních dispozičních výkresů … | Le montage commencera environ 12 semaines après la signature du contrat ET l’approbation des plans d’implantation définitifs de l’ascenseur et de la gaine. |
| V. | Montáž ocelové konstrukce výtahové šachty cca 1-2 týdny. | Le montage de la structure métallique de la gaine dure 1 à 2 semaines. |
| V. | Následné opláštění konstrukce šachty cca 1-2 týdny. | Le montage du bardage de la gaine dure 1 à 2 semaines. |
| V. | Dokončovací práce do cca 2 týdny po ukončení montáže technologie výtahu – šachetních dveří. | Les travaux de finition (principalement les encadrements des portes palières) seront réalisés dans les 2 semaines suivant l’achèvement du montage de l’ascenseur. |
| V. | Harmonogram montáže bude vypracován cca 3 týdny po podpisu smlouvy. | Le planning de montage de la gaine sera établi environ 3 semaines après la signature du contrat. |
| VI. | 1. předávací protokol … po dokončení montáže ocelové konstrukce | 1.  Un procès-verbal de réception sera établi à l’achèvement de la structure métallique de la gaine. |
| VI. | 2. předávací protokol … po provedení opláštění výtahové šachty | 2.  Un procès-verbal de réception sera établi à l’achèvement du bardage de la gaine. |
| VI. | 3. předávací protokol … při předání a převzetí díla | 3.  Un procès-verbal de réception sera établi à l’achèvement des travaux de finition, lors de la réception définitive de la gaine terminée. |
| Doložky | Zjevné chyby v nabídkovém řízení mohou být opraveny před podpisem smlouvy. | Les erreurs manifestes dans l’offre peuvent être corrigées avant la signature du contrat. |
| Doložky | Autorská práva – {FIRMA} si vyhrazuje … bez souhlasu {FIRMA}. | Droits d’auteur – {FIRMA} se réserve la propriété et les droits d’auteur sur les illustrations, plans, croquis et autres documents et échantillons. Ceux-ci doivent être restitués sans délai sur demande et ne peuvent être transmis à des tiers sans l’accord de {FIRMA}. |

Věta „5 let záruka na celé dílo.“ z kapitoly V. zmizela ve všech jazycích (Q6, P10.7):
záruku nese pole krycího listu (Nastavení → OCK → Doba záruky).

**Pozor při slučování s O3 (TD1):** O3 dává do kapitoly V. značku `{TERMIN}`; FR text
výše ji nemá — po sloučení doplnit FR stejně jako CZ/EN/DE.

## 2. Věty platebního kalendáře OCK (nabídka a smlouva o dílo)

Bez vlastního znění v Nastavení se tisknou **dosavadní překlady ze slovníku**
(`src/preklad.js`, vzory s pořadím a procentem; šablona CN v13 a její překlady).
Žádná věta v EN/DE/FR nezůstává česky (hlídá `src/test_podminky_texty.js`).
Rodilý mluvčí kontroluje tyto věty v náhledu nabídky / smlouvy; opravené znění
vloží administrátor do Nastavení → OCK → Věty platebního kalendáře (pole
jazyka, značky `{PORADI}` a `{PROC}` zachovat). Seznam vět:

| Klíč | Česky (továrna) |
|---|---|
| zaloha | {PORADI} dílčí daňový doklad ve výši {PROC} (bez DPH) z celkové ceny díla bude vystaven po podpisu SoD. Úhrada tohoto daňového dokladu je podmínkou pro dodržení předem dohodnutých realizačních termínů. |
| faktura2 | Po ukončení výroby, dodání materiálu na stavbu a po zahájení prací bude vystaven {PORADI} dílčí daňový doklad ve výši {PROC} (bez DPH) z celkové ceny díla. Úhrada tohoto daňového dokladu je podmínkou pro předání díla objednateli. |
| konecna | Po ukončení všech výše uvedených prací a po řádném předání a převzetí celého díla předávacím protokolem bude vystaven konečný daňový doklad na zbývající část celkové ceny díla s vyúčtováním DPH v zákonné výši. |
| mesicne | Fakturace probíhá měsíčně podle skutečně provedených prací. |
| sodZaloha | při uzavření této smlouvy o dílo |
| sodKonecna | po provedení celého díla zhotovitele a jeho předání a převzetí bez vad a nedodělků bránících provozu výtahu |
| sodZbyvajici | zbývajících |
| sodZCeny | z celkové ceny díla |

## 3. Texty nabídky PROJ (Cena nezahrnuje, Požadováno od investora, Termíny)

Stejně jako věty: bez vlastního znění se tiskne dosavadní překlad ze slovníku
(všechny řádky EN/DE/FR přeložené; zkratka „IČ“ zůstává záměrně). Doložky PROJ
jsou prázdné a vypnuté — až je J. V. zapne a napíše, potřebují překlad do
EN/DE/FR (pole v Nastavení → PROJ → Texty nabídky PROJ → DOLOŽKY).
