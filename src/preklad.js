/* ============================================================
 * PŘEKLADY – jazykové mutace CZ / EN / DE / FR  (úkol N1)
 * Zdroje slovníku:
 *   – EngineersCZ_Vocabulary_3_Fable.xlsx, list „Vocab" (CZ/EN/DE/FR)
 *   – TechSpec_CZENDE_3_Fable.xlsx, list „CHECKLIST SMLOUVA" (CZ/EN/DE)
 *   – tamtéž listy „_data add struct elem" a „_out of scope" (CZ/EN)
 * Formát: klíč = český originál, hodnota = [EN, DE, FR]; prázdný řetězec
 * znamená „zatím nepřeloženo" – tr() v takovém případě vrátí češtinu
 * a heslo se zapíše do PREKLAD_CHYBI (podklad pro překladatele).
 * Slovník je určen k uložení do konfigurace.json (SET-2 / úkol N3),
 * takže se dá doplňovat bez zásahu do kódu.
 * ============================================================ */

const JAZYKY = [
  { kod: 'cz', nazev: 'Čeština', vlajka: 'CZ' },
  { kod: 'en', nazev: 'English', vlajka: 'EN' },
  { kod: 'de', nazev: 'Deutsch', vlajka: 'DE' },
  { kod: 'fr', nazev: 'Français', vlajka: 'FR' },
];
const JAZYK_IDX = { en: 0, de: 1, fr: 2 };

/* klíč = český originál, hodnota = [EN, DE, FR] */
const PREKLAD = {

  /* ---- doplněno ručně (obecná slova, která ve zdrojových tabulkách nebyla) ---- */
  "ano": ["yes", "ja", "oui"],
  "ne": ["no", "nein", "non"],
  /* obchodní část nabídky – běžné výrazy, ne odborná terminologie */
  "množství": ["quantity", "Menge", "quantité"],
  /* Sloučená položka přechodových plechů v nabídce (9. 9. 2026) — v kalkulaci
   * zůstávají materiál a montáž zvlášť, zákazník vidí jednu položku. */
  "Přechodové plechy": ["Transition plates", "Übergangsbleche", "Tôles de transition"],
  "materiál a montáž": ["material and installation", "Material und Montage", "matériel et pose"],
  "v základní ceně": ["included in the base price", "im Grundpreis enthalten", "inclus dans le prix de base"],
  "je součástí dodávky": ["included in the delivery", "im Lieferumfang enthalten", "inclus dans la livraison"],
  "není součástí nabídky": ["not included in the offer", "nicht im Angebot enthalten", "non inclus dans l'offre"],
  "nabízeno jako příplatek": ["offered as an extra charge", "als Aufpreis angeboten", "proposé en supplément"],

  /* Kapitoly III.–VI. nabídky (#282). Anglické a německé nadpisy jsou
   * PŘEVZATÉ ze vzorových nabídek J. V. (CZ/EN/DE), ne přeložené tady —
   * u smluvního dokumentu se znění nevymýšlí. Francouzština u nadpisů
   * navazuje na hesla, která ve slovníku už byla; TĚLA kapitol se
   * nepřekládají vůbec a francouzská nabídka je vytiskne česky
   * s viditelným upozorněním (rozhodnutí J. V. 21. 9. 2026). */
  "III. PLATEBNÍ PODMÍNKY": ["III. BILLING PLAN", "III. ZAHLUNGSBEDINGUNGEN", "III. CONDITIONS DE PAIEMENT"],
  "IV. POŽADAVKY PRO PROVEDENÍ REALIZACE": ["IV. REQUIREMENTS FOR PROJECT REALIZATION",
    "IV. VORAUSSETZUNGEN FÜR DIE PROJEKTREALISIERUNG", "IV. CONDITIONS PRÉALABLES À LA RÉALISATION"],
  "V. TERMÍNY REALIZACE": ["V. INSTALLATION SCHEDULE", "V. INSTALLATIONSZEITPLAN", "V. CALENDRIER DE RÉALISATION"],
  "VI. PŘEDÁNÍ DÍLA": ["VI. HANDOVER OF COMPLETE INSTALLATION",
    "VI. ÜBERGABE DER KOMPLETTEN INSTALLATION", "VI. REMISE DE L’OUVRAGE"],
  "DOLOŽKY": ["CLAUSES", "KLAUSELN", "CLAUSES"],
  "1. dílčí faktura": ["1st partial invoice", "1. Teilrechnung", "1re facture partielle"],
  "2. dílčí faktura": ["2nd partial invoice", "2. Teilrechnung", "2e facture partielle"],
  "Konečná faktura": ["Final invoice", "Schlussrechnung", "Facture finale"],
  "Splatnost faktur (dní)": ["Invoices are due (days)", "Zahlungsziel (Tage)", "Échéance des factures (jours)"],
  "Způsob fakturace": ["Invoicing method", "Abrechnungsweise", "Mode de facturation"],
  "Překlad do tohoto jazyka nebyl dodán — text je česky.": [
    "No translation supplied for this language — the text is in Czech.",
    "Für diese Sprache wurde keine Übersetzung geliefert — der Text ist auf Tschechisch.",
    "Aucune traduction n’a été fournie pour cette langue — le texte est en tchèque."],
  "snížená": ["reduced", "ermäßigt", "réduit"],
  "nulová": ["zero", "Null", "zéro"],
  "základní": ["standard", "Regelsatz", "normal"],

  /* ---- hesla používaná aplikací ---- */
  "** parametry profilů se mohou změnit po zpracování statického posouzení": ["** Beam size may differ based on final static calculation of all structure.", "** Die Trägergröße kann je nach endgültiger statischer Berechnung der gesamten Konstruktion abweichen.", "** La dimension des profilés peut être modifiée selon le calcul statique final de toute la structure."],
  "4x rohový sloupek, ocelový uzavřený profil": ["4 corner columns, closed profile", "4 Eckstiele, geschlossenes Stahlprofil", "4 montants d’angle, profilé creux en acier"],
  "bez světlíků": ["Without glass portals", "ohne Oberlichter", "sans impostes vitrées"],
  "bezúplatně zajistí majitel objektu": ["by building owner (no extra cost)", "durch den Gebäudeeigentümer (ohne Aufpreis)", "par le propriétaire du bâtiment (sans frais)"],
  "CELKOVÁ VÝŠKA KONSTRUKCE [m] *": ["TOTAL HEIGHT [m] *", "GESAMTHÖHE [m] *", "HAUTEUR TOTALE [m] *"],
  "DEMONTÁŽ PORTÁLŮ": ["LANDING ENTRANCE DISMANTLING", "DEMONTAGE DES PODESTEINGANGS", "DÉMONTAGE DES PORTAILS DE PALIER"],
  "DEMONTÁŽ PŮVODNÍHO OHRAZENÍ": ["ORIGINAL SHAFT DISMANTLING", "DEMONTAGE DES ORIGINALSCHACHTS", "DÉMONTAGE DE L’ANCIENNE ENCEINTE DE GAINE"],
  "DEMONTÁŽ PŮVODNÍHO VÝTAHU": ["ORIGINAL LIFT DISMANTLING", "DEMONTAGE DES ORIGINALAUFZUGS", "DÉMONTAGE DE L’ANCIEN ASCENSEUR"],
  "Diagonálně průchozí kabina": ["Corner entry through-type car", "Kabine mit Eckzugang", "Cabine traversante en diagonale"],
  "dokrytí lakovaným plechem": ["Covered with painted metal sheet", "verkleidet mit lackiertem Metallblech", "recouvrement en tôle laquée"],
  "DOLNÍ PŘEJEZD [mm]": ["PIT [mm]", "SCHACHTGRUBE [mm]", "Fosse [mm]"],
  "DOPLŇKOVÉ KONSTRUKCE": ["ADDITIONAL STRUCTURAL ELEMENTS", "ZUSÄTZLICHE STRUKTURELEMENTE", "ÉLÉMENTS DE STRUCTURE SUPPLÉMENTAIRES"],
  "DOZDĚNÍ KOLEM ŠACHETNÍCH DVEŘÍ": ["CONSTRUCTION WORK ON LANDING DOOR","BAUARBEITEN AN DER SCHACHTTÜR","TRAVAUX DE MAÇONNERIE AUTOUR DES PORTES PALIÈRES"],
  "HORNÍ PŘEJEZD [mm]": ["OVERHEAD [mm]", "SCHACHTKOPF [mm]", "Hauteur libre supérieure [mm]"],
  "HÁKY PRO ČIŠTĚNÍ ŠACHTY": ["LIFTING HOOKS FOR SHAFT CLEANING", "HEBEHAKEN FÜR DIE SCHACHTREINIGUNG", "CROCHETS DE LEVAGE POUR NETTOYAGE DE LA GAINE"],
  "je součástí dodávky pouze po dobu stavby šachty": ["In scope of shaft delivery – for period of shaft installation only","Im Umfang der Schachtlieferung - nur für den Zeitraum der Schachtmontage","Compris dans la fourniture de la gaine – uniquement pendant le montage de la gaine"],
  "KONSTRUKČNÍ ŘEŠENÍ ŠACHTY": ["SHAFT SOLUTION", "SCHACHTGERÜST-LÖSUNG", "SOLUTION DE LA GAINE"],
  "kontaktní, přes chemické kotvy do zdiva": ["Contact, with chemical anchors", "Kontakt, mit chemischen Ankern", "contact, ancrages chimiques dans la maçonnerie"],
  "KOTVENÍ KONSTRUKCE (POLOHA)": ["ANCHORING POSITION", "VERANKERUNG (POSITION)", "POSITION DE L’ANCRAGE"],
  "KOTVENÍ KONSTRUKCE (TYP)": ["ANCHORING TYPE", "VERANKERUNG (ART)", "TYPE D’ANCRAGE"],
  "lesklý ochranný lak v barvě RAL dle výběru objednatele": ["Glossy painting in RAL colour of customer's choice", "Glänzender Schutzlack in RAL-Farbe nach Wahl des Kunden", "laque de protection brillante, teinte RAL au choix du client"],
  "LEŠENÍ - UVNITŘ ŠACHTY": ["SCAFFOLDING - INSIDE SHAFT STRUCTURE", "GERÜST - INNERHALB DES SCHACHTS", "ÉCHAFAUDAGE – À L’INTÉRIEUR DE LA GAINE"],
  "LEŠENÍ - VNĚ ŠACHTY": ["SCAFFOLDING - OUTSIDE SHAFT STRUCTURE", "GERÜST - AUSSERHALB DES SCHACHTBAUWERKS", "ÉCHAFAUDAGE – À L’EXTÉRIEUR DE LA GAINE"],
  "MATERIÁL OPLÁŠTĚNÍ": ["CLADDING MATERIAL", "VERKLEIDUNGSMATERIAL", "MATÉRIAU DE L’HABILLAGE"],
  "materiály DP1, opláštění bez deklarované požární odolnosti": ["Steel structure DP1, cladding without declared fire resistance", "Stahlkonstruktion DP1, Verkleidung ohne deklarierten Feuerwiderstand", "structure en acier DP1, habillage sans résistance au feu déclarée"],
  "montovaná, průběžná": ["Mounted, continuous", "montiert, durchgehend", "montée (assemblée), continue"],
  "MONTÁŽNÍ NOSNÍK NEBO OKA": ["INSTALLATION BEAM OR LIFTING EYE","MONTAGEBALKEN ODER HEBEHAKEN","POUTRE DE MONTAGE OU ANNEAUX DE LEVAGE"],
  "na dně prohlubně výtahové šachty": ["On the shaft pit floor", "Auf der Schachtgrubensohle", "au fond de la fosse de la gaine"],
  "Na horním nosném rámu OCK": ["On the top frame of the steel structure","Auf dem oberen Rahmen der Stahlkonstruktion","Sur le cadre supérieur de la structure métallique"],
  "na zasklívací terče": ["Glazing fixing points", "Befestigungspunkte der Verglasung", "sur pastilles de vitrage"],
  "na zpevněné hraně stěn prohlubně výtahové šachty": ["on the reinforced pit edge", "Am verstärkten Grubenrand", "sur le bord renforcé de la fosse"],
  "NAPOJENÍ ŠACHETNÍCH DVEŘÍ": ["LANDING DOOR COVER PLATE", "SCHACHTTÜR-ABDECKPLATTE", "TÔLE DE RECOUVREMENT DES PORTES PALIÈRES"],
  "neprůchozí kabina": ["Single entrance car", "Kabine mit einem Eingang", "Cabine à entrée simple"],
  "NUCENÉ VĚTRÁNÍ ŠACHTY VENTILÁTOREM": ["VENTILATION FAN IN THE SHAFT","ZWANGSBELÜFTUNG DES SCHACHTS MIT VENTILATOR","VENTILATION FORCÉE DE LA GAINE PAR VENTILATEUR"],
  "ODBĚRNÉ MÍSTO EL. ENERGIE PO DOBU REALIZACE": ["ELECTRIC POWER LINE FOR INSTALLATION", "STROMLEITUNG FÜR DIE INSTALLATION", "ALIMENTATION ÉLECTRIQUE POUR LE MONTAGE"],
  "ODVĚTRÁNÍ ŠACHTY": ["SHAFT VENTILATION","SCHACHTBELÜFTUNG","VENTILATION DE LA GAINE"],
  "OHRAZENÍ ŠACHTY PROTI PÁDU": ["SAFETY BARRIER AROUND SHAFT","SICHERHEITSBARRIERE UM DEN SCHACHT","BARRIÈRE DE SÉCURITÉ AUTOUR DE LA GAINE"],
  "OPLÁŠTĚNÍ NADSVĚTLÍKŮ": ["TRANSOM PANEL CLADDING (ABOVE ENTRANCE)", "OBERLICHT-VERKLEIDUNG (ÜBER DEM EINGANG)", "HABILLAGE DES IMPOSTES (AU-DESSUS DE L’ENTRÉE)"],
  "OPLÁŠTĚNÍ PORTÁLŮ NÁSTUPIŠŤ": ["LANDING DOOR ENTRANCE CLADDING", "VERKLEIDUNG DER EINGANGSPORTALE", "HABILLAGE DES PORTAILS DE PALIER"],
  "OPLÁŠTĚNÍ ČELA POD NÁSTUPIŠTĚM": ["FRONT CLADDING BELOW LANDINGS", "VERKLEIDUNG DER FRONT UNTER DEN ZUGANGSSTELLEN", "HABILLAGE DE LA FAÇADE SOUS LES PALIERS"],
  "OPLÁŠTĚNÍ ŠACHTY": ["SHAFT CLADDING", "SCHACHTAUSKLEIDUNG", "HABILLAGE DE LA GAINE"],
  "OSVĚTLENÍ NÁSTUPIŠŤ": ["LANDING LIGHTS","BELEUCHTUNG DER ZUGANGSSTELLEN","ÉCLAIRAGE DES PALIERS"],
  "OVĚŘOVACÍ STATICKÝ VÝPOČET KONSTRUKCE": ["STATIC CALCULATION", "STATISCHE BERECHNUNGEN", "CALCUL STATIQUE DE VÉRIFICATION"],
  "plnostěnné": ["Full wall","Vollwand","Plein"],
  "PODCHOZÍ NOSNÁ OCK": ["SUPPORT FOR OPEN SPACE UNDER SHAFT", "STÜTZE FÜR DEN FREIRAUM UNTER DEM SCHACHT", "STRUCTURE PORTEUSE POUR ESPACE LIBRE SOUS LA GAINE"],
  "POVRCHOVÁ ÚPRAVA OPLÁŠTĚNÍ": ["CLADDING FINISHING", "OBERFLÄCHENBEHANDLUNG DER VERKLEIDUNG", "FINITION DE L’HABILLAGE"],
  "POČET NÁSTUPIŠŤ A / C": ["NUMBER OF LANDINGS A / C", "ANZAHL DER ZUGANGSSTELLEN A / C", "Nombre de paliers A / C"],
  "POČET STANIC / NÁSTUPIŠŤ": ["NUMBER OF STOPS / LANDINGS", "ANZAHL DER HALTESTELLEN / ZUGANGSSTELLEN", "Nombre d’arrêts / de paliers"],
  "POŽÁRNÍ KLASIFIKACE KONSTRUKCE": ["FIRE CLASS", "BRANDKLASSE", "CLASSE DE RÉACTION AU FEU"],
  "pravoúhlý tvar": ["rectangular shape", "rechteckige Form", "forme rectangulaire"],
  "PROFIL PŘÍČNÍKŮ **": ["HORIZONTAL BEAM SIZE **", "HORIZONTALRIEGEL GRÖSSE", "DIMENSION DES TRAVERSES **"],
  "PROFIL SLOUPKŮ **": ["VERTICAL BEAM SIZE **", "ECKSTIELE GRÖSSE", "DIMENSION DES MONTANTS **"],
  "PROHLUBEŇ PRO ZALOŽENÍ OCK VE SPRÁVNÉ POZICI A ROZMĚRU": ["PIT READINESS", "VORBEREITUNG DER SCHACHTGRUBE", "PRÉPARATION DE LA FOSSE"],
  "PROJEKČNÍ A PŘÍPRAVNÉ PRÁCE": ["PREPARATORY AND DESIGN WORK", "VORBEREITENDE UND PLANERISCHE ARBEITEN", "TRAVAUX PRÉPARATOIRES ET D’ÉTUDES"],
  "PROSKLENÁ PŘÍČKA VEDLE ŠACHTY": ["GLASS WALL NEXT TO THE SHAFT","GLASWAND NEBEN DEM SCHACHT","CLOISON VITRÉE À CÔTÉ DE LA GAINE"],
  "PROSKLENÁ STŘÍŠKA": ["GLASS CANOPY","GLASVORDACH","AUVENT VITRÉ"],
  "průchozí kabina": ["Through type car", "Durchgangskabine", "Cabine traversante"],
  "PŘECHODOVÉ PLECHY V NÁSTUPIŠTÍCH": ["LANDING SILL EXTENSION PLATES", "SCHWELLENVERLÄNGERUNGSPLATTEN", "TÔLES DE PROLONGEMENT DE SEUIL AUX PALIERS"],
  "přisazena k podestám (dle odchylky podest od svislice)": ["Attached to the landings platforms (follow vertical deviation)", "an die Podeste angesetzt (gemäß Abweichung der Podeste von der Senkrechten)", "accolée aux paliers (selon l’écart des paliers à la verticale)"],
  "příčníky z ocelových uzavřených profilů": ["Steel beam from closed profile", "Riegel aus geschlossenen Stahlprofilen", "traverses en profilés creux en acier"],
  "PŮDORYSNÉ ŘEŠENÍ ŠACHTY": ["FLOOR PLAN", "GRUNDRISS", "Plan d’étage"],
  "ROZSAH OPLÁŠTĚNÍ": ["CLADDING RANGE", "VERKLEIDUNGSBEREICH", "ÉTENDUE DE L’HABILLAGE"],
  "SOUČÁSTÍ DODÁVKY NENÍ": ["OUT OF SCOPE", "NICHT IM LIEFERUMFANG ENTHALTEN", "NON COMPRIS DANS LA LIVRAISON"],
  "STAVEBNÍ A PŘÍPRAVNÉ PRÁCE": ["CONSTRUCTION AND PREPARATORY WORK", "BAU- UND VORBEREITUNGSARBEITEN", "TRAVAUX DE CONSTRUCTION ET PRÉPARATOIRES"],
  "STAVEBNÍ PŘÍPRAVA": ["SITE READINESS","BAUSTELLENBEREITSCHAFT","PRÉPARATION DU CHANTIER"],
  "STŘECHA ŠACHTY": ["SHAFT ROOF", "SCHACHTDACH", "TOIT DE LA GAINE"],
  "svislá rozteč příčníků": ["vertical distance", "vertikaler Abstand", "entraxe vertical des traverses"],
  "SVISLÉ NOSNÉ PRVKY": ["VERTICAL STRUCTURE ELEMENTS", "ECKSTIELE", "ÉLÉMENTS PORTEURS VERTICAUX"],
  "TYP OPLÁŠTĚNÍ": ["CLADDING TYPE", "VERKLEIDUNGSTYP", "TYPE D’HABILLAGE"],
  "ULOŽENÍ KONSTRUKCE": ["SHAFT STRUCTURE BASE", "BASIS DER SCHACHTSTAHLKONSTRUKTION", "BASE DE LA STRUCTURE DE LA GAINE"],
  "UMÍSTĚNÍ VÝTAHOVÉHO STROJE": ["LIFT MACHINE LOCATION", "STANDORT DER AUFZUGSMASCHINE", "EMPLACEMENT DE LA MACHINE D’ASCENSEUR"],
  "UMÍSTĚNÍ ŠACHTY": ["SHAFT LOCATION", "STANDORT DES SCHACHTGERÜSTS", "EMPLACEMENT DE LA GAINE"],
  "USAZENÍ OCK - BOČNÍ STĚNY": ["SHAFT STRUCTURE FIXING - SIDE WALLS", "BEFESTIGUNG DES SCHACHTGERÜSTS - SEITENWÄNDE", "Fixation de la structure de gaine - parois latérales"],
  "USAZENÍ OCK - ČELNÍ STĚNA": ["SHAFT STRUCTURE FIXING - FRONT WALL", "BEFESTIGUNG DES SCHACHTGERÜSTS - VORDERWAND", "Fixation de la structure de gaine - paroi avant"],
  "VODOROVNÉ NOSNÉ PRVKY": ["HORIZONTAL STRUCTURE ELEMENTS", "HORIZONTALRIEGEL", "ÉLÉMENTS PORTEURS HORIZONTAUX"],
  "VZHLED KOTVENÍ ZASKLENÍ": ["CLADDING FIXING ELEMENT", "VERKLEIDUNGSBEFESTIGUNGSELEMENT", "ÉLÉMENT DE FIXATION DE L’HABILLAGE"],
  "VÝSTUP ZE ZAMĚŘENÍ PRO OBJEDNATELE": ["SITE SURVEY OUTPUT FOR CUSTOMER","AUSGABE DES LAGEPLANS FÜR DEN KUNDEN","LIVRABLE DU RELEVÉ POUR LE CLIENT"],
  "ZAMĚŘENÍ PROSTORŮ 3D SKENEREM": ["3D SCANNER SITE SURVEY", "VERMESSUNG DES GELÄNDES MIT EINEM 3D-SCANNER", "RELEVÉ DU SITE PAR SCANNER 3D"],
  "ZDVIH VÝTAHU [m] *": ["TRAVEL [m] *", "FÖRDERHÖHE [m] *", "Course de l’ascenseur [m] *"],
  "ZPRACOVÁNÍ DÍLENSKÉ DOKUMENTACE": ["SHOP / ASSEMBLY DRAWING COMPLETION", "FERTIGSTELLUNG VON WERKSTATT-/MONTAGEZEICHNUNGEN", "ÉLABORATION DES PLANS D’ATELIER / DE MONTAGE"],
  "ZPŮSOB KOTVENÍ OPLÁŠTĚNÍ": ["CLADDING FIXING", "VERKLEIDUNGSBEFESTIGUNG", "FIXATION DE L’HABILLAGE"],
  "ZÁBRADLÍ NA PODESTÁCH": ["HANDRAIL ON EACH FLOOR", "HANDLAUF AUF JEDER ETAGE", "GARDE-CORPS À CHAQUE ÉTAGE"],
  "ZÁBRADLÍ NA SCHODIŠTI": ["STAIRCASE HANDRAIL", "HANDLAUF IM TREPPENHAUS", "MAIN COURANTE DE L’ESCALIER"],
  "ZÁBRANY DO DVEŘNÍCH VSTUPŮ": ["BARRIER TO DOOR OPENING", "BARRIERE ZUR TÜRÖFFNUNG", "BARRIÈRES DES OUVERTURES DE PORTES"],
  "ZÁKLADNÍ PARAMETRY ŠACHTY": ["SHAFT CORE PARAMETERS", "PARAMETER DES SCHACHTGERÜSTS", "PARAMÈTRES DE BASE DE LA GAINE"],
  "ÚLOŽNÉ PROSTORY": ["STORAGE LOCATION", "LAGERPLATZ", "AIRE DE STOCKAGE"],
  "ÚPRAVA A OPRAVA SCHODNIC": ["STAIRCASE STEPS MODIF. / REPAIR", "UMBAU / REPARATUR VON TREPPENSTUFEN", "MODIFICATION / RÉPARATION DES MARCHES D’ESCALIER"],
  "ÚPRAVA PŮVODNÍCH OKOPŮ": ["KICKPLATES MODIFICATION", "ÄNDERUNG DER TRITTBLECHE", "MODIFICATION DES PLINTHES D’ORIGINE"],
  "čiré sklo": ["Clear glass", "Klarglas", "verre clair"],
  "ŘEŠENÍ PORTÁLŮ (PROSTOROVÉ)": ["LANDING ENTRANCE SOLUTION (SPACE)", "LÖSUNG DES TÜREINGANGS (RAUM)", "SOLUTION D’ENTRÉE D’ÉTAGE (ESPACE)"],
  "ŘEŠENÍ PORTÁLŮ (ČLENĚNÍ)": ["LANDING ENTRANCE SOLUTION (SEGMENT)", "LÖSUNG DES TÜREINGANGS (SEGMENT)", "SOLUTION D’ENTRÉE D’ÉTAGE (SEGMENT)"],

  /* ---- ostatní hesla ze slovníku (rezerva pro nabídky a smlouvy) ---- */
  "(tato technická specifikace bude použita jako příloha Smlouvy o Dílo nebo závazné objednávky)": ["(this document will be used as an annex to a contract or a binding order)", "(Dieses Dokument wird als Anhang zu einem Vertrag oder einer verbindlichen Bestellung verwendet)", "(Ce document sera utilisé comme annexe à un contrat ou une commande ferme)"],
  "* Uvažované rozměry nabízené šachty vychází z projektové dokumentace objednatele. Po přesném zaměření výšek a svislice zhotovitelem se mohou změnit!": ["* Shaft structure parameters for tender are based on project documentation provided by customer. It can be modified according to proper 3D scan survey provided by shaft supplier!", "* Die Parameter der Schachtstruktur für die Ausschreibung basieren auf der vom Kunden bereitgestellten Projektdokumentation. Sie können entsprechend der vom Schachtlieferanten zur Verfügung gestellten 3D-Vermessung geändert werden!", "* Les dimensions proposées de la gaine sont basées sur la documentation du projet fournie par le client. Elles peuvent être modifiées après une mesure précise des hauteurs et de la verticalité par le fournisseur de la gaine."],
  "* Uvažované rozměry nabízené šachty vychází ze zadání objednatele. Po přesném zaměření skutečného stavu zhotovitelem se mohou změnit!": ["* The shaft dimensions offered are based on the client's brief. They may change after a precise survey of the actual conditions carried out by the contractor!", "* Die angebotenen Schachtabmessungen beruhen auf den Vorgaben des Auftraggebers. Nach der genauen Vermessung des Ist-Zustands durch den Auftragnehmer können sie sich ändern!", "* Les dimensions proposées de la gaine sont basées sur le cahier des charges du client. Elles peuvent être modifiées après le relevé précis de l'état réel effectué par l'entrepreneur !"],
  "standardní dvojsklo čiré Ug=2,6": ["Standard clear double glazing Ug=2.6", "Standard-Isolierglas, klar, Ug=2,6", "Double vitrage standard clair Ug=2,6"],
  /* P8 (K13-N60 + K12-N49, 24. 9. 2026): texty, které cizojazyčná nabídka
   * tiskla česky. NÁVRH PŘEKLADU — čeká na odbornou kontrolu J. V. */
  "přirozené, do prostoru schodiště": ["Natural, into the stairwell", "Natürlich, in den Treppenhausraum", "Naturelle, vers la cage d'escalier"],
  "nejsou součástí dodávky, viz příplatkové ceny": ["Not included in the delivery, see surcharge prices", "Nicht im Lieferumfang, siehe Aufpreise", "Non inclus dans la fourniture, voir les prix des suppléments"],
  "žádné příplatky nejsou vybrány": ["no surcharges selected", "keine Zuschläge ausgewählt", "aucun supplément sélectionné"],
  "TECHNICKÁ ČÁST – SPECIFIKACE DODÁVKY": ["TECHNICAL PART – SCOPE OF DELIVERY", "TECHNISCHER TEIL – LIEFERUMFANG", "PARTIE TECHNIQUE – ÉTENDUE DE LA FOURNITURE"],
  "přirozené, větrací mřížka v horní i dolní části zadní stěny výtahové šachty": ["Natural, ventilation grille in the upper and lower part of the rear wall of the lift shaft", "Natürlich, Lüftungsgitter im oberen und unteren Bereich der Rückwand des Aufzugsschachts", "Naturelle, grille de ventilation en partie haute et basse de la paroi arrière de la gaine d'ascenseur"],
  "1.  předávací protokol bude požadován po dokončení montáže ocelové konstrukce": ["1. Handover protocol will be used when shaft steel structure is completed.", "1. Das Übergabeprotokoll wird verwendet, wenn die Schachtstahlkonstruktion fertiggestellt ist.", "1. Le protocole de remise sera établi après l’achèvement du montage de la structure métallique."],
  "1. dílčí daňový doklad - 40 % (bez DPH) z celkové ceny díla bude vystaven po podpisu SoD. Úhrada tohoto daňového dokladu je podmínkou pro dodržení předem dohodnutých realizačních termínů.": ["1st partial invoice – 40 % (without VAT) of total price is released when contract is signed. In time payment is mandatory condition for compliance with the pre-agreed delivery milestones.", "1. Teilrechnung – 40 % (ohne MwSt.) des Gesamtpreises wird bei Vertragsunterzeichnung freigegeben. Die rechtzeitige Zahlung ist zwingende Voraussetzung für die Einhaltung der im Voraus vereinbarten Liefertermine.", "1re facture partielle – 40 % (hors TVA) du prix total, émise à la signature du contrat. Le paiement dans les délais est une condition impérative du respect des échéances convenues."],
  "2.  předávací protokol bude požadován po provedení opláštění výtahové šachty": ["2. Handover protocol will be used when shaft cladding is completed.", "2. Das Übergabeprotokoll wird verwendet, wenn die Schachtverkleidung abgeschlossen ist.", "2. Le protocole de remise sera établi après la réalisation de l’habillage de la gaine."],
  "2. dílčí daňový doklad - 50 % (bez DPH) z celkové ceny díla bude vystaven po dodání materiálu na stavbu a zahájení instalačních prací. Úhrada tohoto daňového dokladu je podmínkou pro předání díla objednateli.": ["2nd partial invoice – 50% (without VAT) of total price is released when material delivered on site and installation work start. In time payment is mandatory condition for handover of complete shaft.", "2. Teilrechnung – 50% (ohne MwSt.) des Gesamtpreises werden freigegeben, wenn das Material auf der Baustelle angeliefert wird und die Montagearbeiten beginnen. Die rechtzeitige Zahlung ist zwingende Voraussetzung für die Übergabe des kompletten Schachtes.", "2e facture partielle – 50 % (hors TVA) du prix total, émise à la livraison du matériel sur le chantier et au début du montage. Le paiement dans les délais est une condition impérative de la remise de l’ouvrage."],
  "2026-OPR-CN-01xx": ["2026-OPR-CN-01xx","2026-OPR-CN-01xx","2026-OPR-CN-01xx"],
  "3 ks montážních ok pro výškové práce": ["3 pcs of lifting eyes","3 Stk. Hebehaken","3 anneaux de levage pour travaux en hauteur"],
  "3.  předávací protokol bude požadován po provedení dokončovacích prací při předání a převzetí díla.": ["3. Handover protocol will be used when finishing works are done for final handover of completed shaft.", "3. Das Übergabeprotokoll wird verwendet, wenn die Abschlussarbeiten für die endgültige Übergabe des fertigen Schachtes durchgeführt werden.", "3. Le protocole de remise sera établi après les travaux de finition, lors de la remise et réception de l’ouvrage."],
  "3. konečný daňový doklad – 10% (bez DPH)  z celkové ceny díla bude vystaven po ukončení všech výše uvedených prací a po řádném předání a převzetí celého díla předávacím protokolem.": ["3rd final invoice – 10% (without VAT) of total price is released when all work is completed, shaft is fully handed over and handover protocol is signed.", "3. Schlussrechnung – 10% (ohne MwSt.) des Gesamtpreises werden freigegeben, wenn alle Arbeiten abgeschlossen sind, der Schacht vollständig übergeben und das Übergabeprotokoll unterzeichnet ist.", "3e facture finale – 10 % (hors TVA) du prix total, émise après l’achèvement de tous les travaux et la remise de l’ouvrage avec protocole signé."],
  "5 let záruka na celé dílo.": ["5 years warranty for the whole shaft structure and cladding.", "5 Jahre Garantie für die gesamte Schachtstruktur und Verkleidung.", "Garantie de 5 ans sur l’ensemble de l’ouvrage."],
  "a. cena vychází z technické specifikace nabídky – viz výše": ["a. final price is based on technical specification specified in this tender", "a. Der Endpreis basiert auf den technischen Spezifikationen, die in diesem Angebot angegeben sind", "a. le prix final est basé sur la spécification technique indiquée dans cette offre"],
  "Adresa stavby:": ["Site address:", "Baustellenadresse:", "Adresse du chantier :"],
  "aktualizace": ["updated", "Aktualisierung", "mise à jour"],
  "Autorská práva – EngineersCZ si vyhrazuje vlastnické a autorské právo k ilustracím, výkresům, skicám a jiným dokumentům a vzorkům. Tyto musí být na požádání neprodleně vráceny a nesmí být předány třetím stranám bez souhlasu EngineersCZ.": ["Copyright - EngineersCZ reserves the ownership and copyright of illustrations, drawings, sketches and other documents and samples. These must be returned immediately on request and may not be passed on to third parties without EngineersCZ's consent.", "Urheberrechte: - An Abbildungen, Zeichnungen, Skizzen, sonstigen Unterlagen und Mustern behält sich EngineersCZ die Eigentums- und Urheberrechte vor; sie sind auf Verlangen unverzüglich zurückzusenden und dürfen nicht an Dritte ohne Einverständnis von EngineersCZ weitergegeben werden.", "Droits d’auteur – EngineersCZ se réserve la propriété et les droits d’auteur des illustrations, dessins, croquis et autres documents et échantillons. Ceux-ci doivent être restitués immédiatement sur demande et ne peuvent être transmis à des tiers sans l’accord d’EngineersCZ."],
  "b. k úpravě celkové ceny může dojít po přesném zaměření a vyhodnocení statiky": ["b. based on full site survey and statics report the final price may be modified", "b. Auf der Grundlage der vollständigen Vermessung vor Ort und des Statikberichts kann der Endpreis angepasst werden", "b. le prix final peut être ajusté après le relevé complet du site et le rapport de calcul statique"],
  "bez DPH": ["Without VAT", "Ohne MwSt.", "hors TVA"],
  "Bez časového omezení v běžné pracovní době, možnost práce o víkendech": ["No time restrictions during normal working hours, possibility of working at weekends.", "Keine zeitlichen Einschränkungen während der normalen Arbeitszeiten, Möglichkeit der Arbeit an Wochenenden.", "Sans restriction horaire pendant les heures ouvrées normales, possibilité de travailler le week-end."],
  "cca": ["approx.", "ca.", "env."],
  "CHLAZENÍ POMOCÍ VENTILÁTORU": ["VENTILATION FAN IN THE SHAFT", "VENTILATOR IM SCHACHT", "VENTILATEUR DANS LA GAINE"],
  "CO NENÍ SOUČÁSTÍ DODÁVKY": ["OUT OF SCOPE","NICHT IM LIEFERUMFANG ENTHALTEN","HORS FOURNITURE"],
  "Datum:": ["Date:", "Datum:", "Date :"],
  "DEMONTÁŽ PŮVODNÍHO OHRAZENÍ ŠACHTY": ["DISMANTLING OF ORIGINAL STEEL SHAFT", "DEMONTAGE DER ORIGINALEN SCHACHTSTAHLKONSTRUKTION", "DÉMONTAGE DE L’ANCIENNE GAINE MÉTALLIQUE"],
  "DEMONTÁŽ STÁVAJÍCÍ ŠACHTY": ["DISMANTLING OF THE EXISTING SHAFT", "DEMONTAGE DES BESTEHENDEN SCHACHTES", "DÉMONTAGE DE LA GAINE EXISTANTE"],
  "DEMONTÁŽ STÁVAJÍCÍHO VÝTAHU": ["DISMANTLING OF THE EXISTING LIFT", "DEMONTAGE DES BESTEHENDEN AUFZUGS", "DÉMONTAGE DE L’ASCENSEUR EXISTANT"],
  "Demontáž, odvoz a likvidace původního ohrazení kolem výtahu v prostoru schodiště (z lešení po stavebních úpravách prohlubně)": ["Dismantling, removal and disposal of the original steel shaft.", "Demontage, Ausbau und Entsorgung des originalen Stahlschachtes.", "Démontage, évacuation et élimination de l’ancienne gaine métallique."],
  "Demontáž, odvoz a likvidace původního výtahu": ["Dismantling, removal and disposal of the original elevator.", "Demontage, Entfernung und Entsorgung des Originalaufzugs.", "Démontage, évacuation et élimination de l’ancien ascenseur."],
  "Dohoda ohledně termínů realizace a součinnosti s dodavatelem technologie výtahu": ["Installation time schedule for key project milestones will be aligned with elevator supplier.", "Der Zeitplan für die Installation wichtiger Projektmeilensteine wird mit dem Aufzugslieferanten abgestimmt.", "Le calendrier de montage des principales étapes du projet sera coordonné avec le fournisseur de l’ascenseur."],
  "Dojde-li v průběhu realizace díla k VÝRAZNÉMU zvýšení cen vstupních materiálů, oceli, skla a dopravného a paliv, může zhotovitel cenu díla zvýšit o tento rozdíl. Pro posouzení cenových změn se přihlíží k cenám platným v době uzavření smlouvy o dílo (nebo objednávky) ve srovnání s cenami platnými v době, kdy byl zhotovitel povinen dílo provést.": ["If the price of input materials, steel, glass, freight and fuel increase SIGNIFICANTLY during the project realization, the contractor may increase the price by the difference. For the purpose of assessing price changes, the prices at the time of conclusion of the contract (or order) shall be taken into account compared to the prices at the time of project completion.", "Wenn die Preise für Vormaterialien, Stahl, Glas, Fracht und Kraftstoff während der Projektrealisierung ERHEBLICH steigen, kann der Auftragnehmer den Preis um die Differenz erhöhen. Für die Beurteilung von Preisänderungen werden die Preise zum Zeitpunkt des Vertragsabschlusses (bzw. der Bestellung) mit den Preisen zum Zeitpunkt des Projektabschlusses verglichen.", "Si les prix des matériaux, de l’acier, du verre, du transport et des carburants augmentent de manière SIGNIFICATIVE pendant la réalisation du projet, l’entrepreneur peut augmenter le prix de cette différence. Pour l’évaluation des variations de prix, les prix en vigueur à la date de conclusion du contrat (ou de la commande) sont comparés aux prix en vigueur à la date d’achèvement du projet."],
  "DOKONČENÍ NÁSTUPIŠŤ VČETNĚ NAPOJENÍ K ŠACHETNÍM DVEŘÍM": ["LANDING ENTRANCE FLOOR COMPLETION", "FERTIGSTELLUNG DES BODENS IM EINGANGSBEREICH", "FINITION DES SOLS DES PALIERS Y COMPRIS RACCORD AUX PORTES PALIÈRES"],
  "Dokončovací práce do cca 2 týdny po ukončení montáže technologie výtahu – šachetních dveří.": ["Finishing work (mainly landing door entrance portals) will be done within 2 weeks after elevator installation is completed.", "Die abschließenden Arbeiten (vor allem die Portale der Schachttüren) werden innerhalb von 2 Wochen nach Abschluss der Aufzugsmontage durchgeführt.", "Les travaux de finition (principalement les portails des portes palières) seront réalisés dans les 2 semaines suivant l’achèvement du montage de l’ascenseur."],
  "Doprava, stavba a pronájem lešení (vnitřního i vnějšího) po dobu realizace šachty": ["Rental, transport and construction of scaffolding (inside and outside around shaft construction) for duration of the shaft installation.", "Vermietung, Transport und Aufbau eines Gerüstes (innen und außen um das Schachtbauwerk) für die Dauer der Schachtmontage.", "Location, transport et montage de l’échafaudage (intérieur et extérieur autour de la gaine) pendant la durée du montage."],
  "DPH": ["VAT","MwSt","TVA"],
  /* ---- PLATEBNÍ PODMÍNKY (#283, rozhodnutí J. V. 21. 9. 2026) ----
   * Kapitola III. brala hodnoty z krycího listu, a ty jsou volný text —
   * slovníkem prošly beze změny, takže anglická nabídka měla nadpisy
   * anglicky a hodnoty česky („50 % – po podpisu smlouvy", „2 měsíce").
   * Rozhodnutí: české podmínky se do cizojazyčné nabídky tisknou PŘELOŽENÉ.
   * Překládá se konečná sada PŘEDVYPLNĚNÝCH hodnot (rozbalovátka a výchozí
   * texty); co obchodník napíše ručně, projde dál beze změny — vymýšlet
   * překlad cizí věty se nesmí. Pomlčka je půlčtverčíková (–), jak ji
   * zapisuje `KRYCI_ZALOHY`; kopie s obyčejným spojovníkem by se nenašla. */
  "Bez zálohy": ["No advance payment", "Keine Anzahlung", "Sans acompte"],
  "30 % \u2013 po podpisu smlouvy": ["30 % \u2013 upon signature of the contract", "30 % \u2013 nach Vertragsunterzeichnung", "30 % \u2013 \u00e0 la signature du contrat"],
  "50 % \u2013 po podpisu smlouvy": ["50 % \u2013 upon signature of the contract", "50 % \u2013 nach Vertragsunterzeichnung", "50 % \u2013 \u00e0 la signature du contrat"],
  "70 % \u2013 po podpisu smlouvy": ["70 % \u2013 upon signature of the contract", "70 % \u2013 nach Vertragsunterzeichnung", "70 % \u2013 \u00e0 la signature du contrat"],
  "40 % \u2013 po zah\u00e1jen\u00ed mont\u00e1\u017ee": ["40 % \u2013 upon start of installation", "40 % \u2013 nach Montagebeginn", "40 % \u2013 au d\u00e9but du montage"],
  "10 % \u2013 po p\u0159ed\u00e1n\u00ed": ["10 % \u2013 upon handover", "10 % \u2013 nach \u00dcbergabe", "10 % \u2013 \u00e0 la r\u00e9ception"],
  "1 m\u011bs\u00edc": ["1 month", "1 Monat", "1 mois"],
  "2 m\u011bs\u00edce": ["2 months", "2 Monate", "2 mois"],
  "3 m\u011bs\u00edce": ["3 months", "3 Monate", "3 mois"],
  "6 m\u011bs\u00edc\u016f": ["6 months", "6 Monate", "6 mois"],
  "N\u00e1\u0161 standard / m\u011bs\u00ed\u010dn\u00ed": ["Our standard / monthly", "Unser Standard / monatlich", "Notre standard / mensuel"],
  "Uplatn\u011bn limit 10 %": ["10 % cap applied", "Haftungsgrenze 10 % angewendet", "Plafond de 10 % appliqu\u00e9"],
  "NEUPLATN\u011aN limit 10 %": ["10 % cap NOT applied", "Haftungsgrenze 10 % NICHT angewendet", "Plafond de 10 % NON appliqu\u00e9"],
  "0,05 % / den": ["0.05 % / day", "0,05 % / Tag", "0,05 % / jour"],
  "0,1 % / den": ["0.1 % / day", "0,1 % / Tag", "0,1 % / jour"],
  "DŘEVĚNÁ MADLA NA BOČNÍCH STĚNÁCH OCK": ["WOODEN HANDLE ON THE SIDE OF SHAFT STRUCTURE", "HOLZGRIFF AN DER SEITE DER SCHACHTSTAHLKONSTRUKTION", "MAINS COURANTES EN BOIS SUR LES PAROIS LATÉRALES DE LA GAINE"],
  "Firma, s.r.o.": ["Firma, s.r.o.","Firma, s.r.o.","Firma, s.r.o."],
  "Harmonogram montáže bude vypracován cca 3 týdny po podpisu smlouvy.": ["The shaft installation schedule will be compiled within approx. 3 weeks after the contract is signed.", "Der Zeitplan für die Schachtinstallation wird innerhalb von ca. 3 Wochen nach Vertragsunterzeichnung erstellt.", "Le calendrier de montage sera établi env. 3 semaines après la signature du contrat."],
  "hloubka kabiny": ["car depth", "Kabinentiefe", "profondeur de cabine"],
  "Hloubka vnitřní": ["Internal depth", "Innere Tiefe", "Profondeur intérieure"],
  "Hloubka vnější": ["External depth", "Äußere Tiefe", "Profondeur extérieure"],
  "Klempířské provedení střechy výtahové šachty z Cu plechu": ["Shaft roof made of copper sheet.", "Schachtdachlösung aus Kupferblech.", "Toit de la gaine réalisé en tôle de cuivre."],
  "kontaktní, hmoždinky do ŽB konstrukcí": ["Dowels for reinforced concrete structure", "Kontakt, Dübel in Stahlbetonkonstruktionen", "contact, chevilles dans les structures en béton armé"],
  "LEŠENÍ PRO REALIZACI ŠACHTY": ["SCAFFOLDING FOR SHAFT INSTALLATION","GERÜST FÜR DEN SCHACHTEINBAU","ÉCHAFAUDAGE POUR LA RÉALISATION DE LA GAINE"],
  "MADLO NA ŠACHTĚ": ["HANDRAIL ON THE SHAFT","HANDLAUF AUF DEM SCHACHT","MAIN COURANTE SUR LA GAINE"],
  "matná bílá folie": ["matt white foil", "mattweiße Folie", "film blanc mat"],
  "mléčné (matné) sklo": ["frosted glass", "Mattglas", "verre dépoli (mat)"],
  "MONTOVANÉ ocelové konstrukce": ["MOUNTED steel structure", "montierte Stahlkonstruktion", "structure métallique MONTÉE"],
  "Montáž ocelové konstrukce výtahové šachty cca 1-2 týdny.": ["Installation of the steel shaft structure takes approx. 1–2 weeks.", "Die Montage der Stahlschachtkonstruktion dauert 1-2 Wochen.", "Le montage de la structure métallique de la gaine dure env. 1 à 2 semaines."],
  "MĚDĚNÁ STŘEŠNÍ KRYTINA": ["COPPER ROOFING", "KUPFER-DACHEINDECKUNG", "COUVERTURE DE TOIT EN CUIVRE"],
  "měřítko": ["scale", "Maßstab", "échelle"],
  "nabídková cena": ["tender price", "Angebotssumme", "prix de l’offre"],
  "Nad venkovním vstupem do výtahu bude umístěna prosklená stříška v šířce celé OCK.": ["Glass canopy over exterior elevator entrance. Canopy width is equal to shaft construction width.", "Über dem Außeneingang zum Aufzug wird ein Glasvordach in der Breite der Schachtstahlkonstruktion angebracht.", "Un auvent vitré sera installé au-dessus de l’entrée extérieure, sur toute la largeur de la structure de la gaine."],
  "nadzemní patro": ["upper floor", "Obergeschoss (OG)", "étage supérieur"],
  "NAPÁJENÍ VÝTAHU VČET. REVIZNÍ ZPRÁVY": ["INSPECTED EL. POWER SUPPLY FOR LIFT", "GEPRÜFTE STROMVERSORGUNG FÜR DEN AUFZUG (inkl. Revisionsbericht)", "ALIMENTATION ÉLECTRIQUE DE L’ASCENSEUR CONTRÔLÉE (rapport de révision incl.)"],
  "NEREZOVÁ MADLA NA BOČNÍCH STĚNÁCH OCK": ["STAINLESS STEEL HANDLE ON THE SIDE OF SHAFT STRUCTURE", "EDELSTAHLGRIFF AN DER SEITE DER SCHACHTSTAHLKONSTRUKTION", "MAINS COURANTES EN INOX SUR LES PAROIS LATÉRALES DE LA GAINE"],
  "nerezový plech dle zaměření ve všech nástupištích": ["Stainless steel metal sheet in each floor (based on site survey)","Edelstahlbleche in jedem Stockwerk (auf der Grundlage der Vermessung vor Ort)","Tôle inox selon relevé, à tous les arrêts"],
  "Nerezový plech ve tvaru dle individuálního zaměření spojující podestu nástupiště s prahem šachetních dveří v šířce vstupu": ["Stainless steel plate connecting the platform with landing door sill. Designed according to site survey.", "Edelstahlplatte, die die Plattform mit der Schwelle der Schachttür verbindet. Entworfen nach ordnungsgemäßer Standortvermessung.", "Tôle en inox reliant le palier au seuil des portes palières, réalisée selon le relevé sur site."],
  "Nosnost": ["load", "Tragkraft", "charge utile"],
  "NOVÁ PROHLUBEŇ": ["NEW PIT", "NEUE GRUBE", "NOUVELLE FOSSE"],
  "NOVÉ ZÁBRADLÍ/MADLA NA ŠACHTĚ": ["NEW HANDRAIL ON THE SHAFT", "NEUER HANDLAUF AM SCHACHT", "NOUVELLE MAIN COURANTE SUR LA GAINE"],
  "Nutná koordinace s celkovým harmonogramem stavby.": ["Coordination with overall site installation schedule is mandatory.", "Die Koordinierung mit dem gesamten Zeitplan für die Installation vor Ort ist obligatorisch.", "La coordination avec le calendrier général du chantier est obligatoire."],
  "nutná stavební příprava kabelových elektrorozvodů včetně jističů pro připojení přímotopu – zajistí stavba v rámci přípravy elektroinstalace pro připojení výtahu, výkon přímotopu max. 2 kW": ["Delivery consists of heater, sensor and thermostat. Site to prepare the necessary wiring and circuit breaker installation in cooperation with the elevator supplier. Heater power max. 2 kW.", "Die Lieferung besteht aus Heizung, Sensor und Thermostat. Bauseitige Vorbereitung der erforderlichen Verkabelung und Installation der Leistungsschalter in Zusammenarbeit mit dem Aufzugslieferanten. Heizleistung max. 2 kW.", "La livraison comprend le chauffage, le capteur et le thermostat. Le chantier prépare le câblage nécessaire et l’installation des disjoncteurs en coopération avec le fournisseur de l’ascenseur. Puissance max. 2 kW."],
  "Nutná stavební příprava kabelových elektrorozvodů včetně jističů pro připojení ventilátoru – zajistí stavba v rámci přípravy elektroinstalace pro připojení výtahu, nutná spolupráce při návrhu": ["Delivery consists of fan, sensor and thermostat. Site to prepare the necessary wiring and circuit breaker installation in cooperation with the elevator supplier.", "Die Lieferung besteht aus Ventilator, Sensor und Thermostat. Bauseitige Vorbereitung der erforderlichen Verkabelung und Installation der Leistungsschalter in Zusammenarbeit mit dem Aufzugslieferanten.", "La livraison comprend le ventilateur, le capteur et le thermostat. Le chantier prépare le câblage nécessaire et l’installation des disjoncteurs en coopération avec le fournisseur de l’ascenseur."],
  "Následné opláštění konstrukce šachty cca 1-2 týdny.": ["Shaft cladding installation takes approx. 1–2 weeks.", "Die Montage der Schachtverkleidung dauert 1-2 Wochen.", "L’habillage de la gaine dure env. 1 à 2 semaines."],
  "nástupiště": ["landing", "Zugangsstelle", "palier"],
  "NÁSTUPNÍ MŮSTKY": ["LANDING ACCESS BRIDGES", "ZUGANGSBRÜCKEN", "PASSERELLES D’ACCÈS AUX PALIERS"],
  "NÁTĚR BOKŮ SCHODIŠTĚ": ["STAIRS SIDE PAINTING", "ANSTRICH DER TREPPENSEITE", "PEINTURE DES CÔTÉS DE L’ESCALIER"],
  "Název akce:": ["Project name:", "Projektname:", "Nom du projet :"],
  "NĚJAKÝ DALŠÍ DOPLŇKOVÝ PRVEK": ["ADDITIONAL SHAFT CUSTOM ITEM(S)", "WEITERE KUNDENSPEZIFISCHE ZUSATZELEMENTE", "AUTRES ÉLÉMENTS SUPPLÉMENTAIRES SUR MESURE"],
  "Objednatel:": ["Customer:", "Kunde:", "Client :"],
  "OCELOVÁ PROHLUBEŇ": ["STEEL PIT", "STAHLGRUBE", "FOSSE EN ACIER"],
  "ocelový profil": ["steel profile", "Stahlprofil", "profilé en acier"],
  "Ochrana proti pádu nesmí bránit naší instalaci": ["Fall protection must not impede our installation.","Die Absturzsicherung darf unsere Montage nicht behindern.","La protection antichute ne doit pas gêner notre montage."],
  "ochrana před sluncem": ["sun protection", "Sonnenschutz", "protection solaire"],
  "Od výškové úrovně": ["Cladding starts at level","Verkleidung beginnt auf Ebene","À partir du niveau"],
  "OPLECHOVÁNÍ SOKLU PROHLUBNĚ": ["METAL SHEET COVER ON PIT EDGE", "BLECHABDECKUNG AM GRUBENRAND", "COUVERTINE EN TÔLE SUR LE BORD DE LA FOSSE"],
  "OPLÁŠTĚNÍ HLAVY ŠACHTY": ["SHAFT HEAD CLADDING", "SCHACHTKOPF-VERKLEIDUNG", "HABILLAGE DE LA TÊTE DE GAINE"],
  "Oprava nátěru na konstrukci šachty po dokončení instalace výtahu": ["Painting correction on steel structure of the shaft after elevator installation is completed.", "Ausbesserung der Lackierung an der Stahlkonstruktion des Schachts nach Abschluss der Aufzugsmontage.", "Retouche de peinture sur la structure métallique de la gaine après l’achèvement du montage de l’ascenseur."],
  "OPRAVA NÁTĚRU": ["PAINTING CORRECTION AND FIXING", "AUSBESSERUNG DER LACKIERUNG", "RETOUCHE DE PEINTURE"],
  "OPRAVA NÁŤERU": ["PAINTING CORRECTION AND FIXING", "AUSBESSERUNG DER LACKIERUNG", "RETOUCHE DE PEINTURE"],
  "OPRAVA OMÍTKY PODEST": ["LANDING PLASTER FIXING","AUSBESSERUNG DES PUTZES AN DEN PODESTEN","REPRISE DE L'ENDUIT DES PALIERS"],
  "Parkovací místo v bezprostřední blízkosti stavby pro potřeby montáže a vykládání materiálu.": ["Parking space next to the building for the purpose of installation and unloading of material.","Parkplatz neben dem Gebäude für die Montage und das Abladen des Materials.","Place de stationnement à proximité immédiate du chantier pour le montage et le déchargement du matériel."],
  "patro": ["floor (stop)", "Etage", "étage"],
  "PLATEBNÍ PODMÍNKY": ["BILLING PLAN","ZAHLUNGSBEDINGUNGEN","CONDITIONS DE PAIEMENT"],
  "Platnost této nabídky je 3 měsíce od data uvedeného v záhlaví": ["Tender validity is 3 months from date of issue.", "Dieses Angebot ist 3 Monate ab Ausstellungsdatum gültig.", "La validité de cette offre est de 3 mois à compter de la date indiquée en en-tête."],
  "Podkroví, půda": ["Attic, Penthouse", "Dachgeschoss (DG)", "combles, attique"],
  "pohled (na vykrese)": ["view", "Ansicht", "vue (sur le plan)"],
  "Pokud montáž nezačne dle plánu z důvodu opoždění stavby – musí se konstrukce uskladnit. Částka bude účtována pokud stavba nezajistí bezplatné a bezpečné uskladnění.": ["If the installation does not start as planned due to construction delays - the shaft structure must be stored. The amount will be charged if the customer does not provide free and safe storage.", "Wenn die Installation aufgrund von Bauverzögerungen nicht wie geplant beginnen kann, muss das Schachtbauwerk gelagert werden. Der Betrag wird in Rechnung gestellt, wenn der Kunde nicht für eine kostenlose und sichere Lagerung sorgt.", "Si le montage ne commence pas comme prévu en raison de retards du chantier, la structure doit être stockée. Le montant sera facturé si le client n’assure pas un stockage gratuit et sûr."],
  "POVRCHOVÁ ÚPRAVA": ["STEEL STRUCTURE FINISHING", "SCHACHTGERÜST-LACKIERUNG", "FINITION DE LA STRUCTURE MÉTALLIQUE"],
  "pozinkování": ["Zincoated", "Verzinkt", "galvanisé"],
  "POŽADAVKY PRO PROVEDENÍ REALIZACE:": ["REQUIREMENTS FOR PROJECT REALIZATION:", "VORAUSSETZUNGEN FÜR DIE PROJEKTREALISIERUNG:", "EXIGENCES POUR LA RÉALISATION DU PROJET :"],
  "Pro dokončení projekční části je nutné poskytnout finální dispoziční výkresy výtahové technologie": ["Final and approved layout drawings of the elevator technology are needed to complete the shaft design.", "Endgültige und genehmigte Anordnungszeichnungen (Layouts) der Aufzugstechnik sind erforderlich, um die Schachtplanung abzuschließen.", "Les plans d’implantation définitifs et approuvés de la technologie d’ascenseur sont nécessaires pour finaliser l’étude de la gaine."],
  "Pro zasklení OCK výše uvedeným způsobem bude použito čirých skel vrstvených na mléčnou bezpečnostní fólii": ["Clear glass layered with frosted safety foil.", "Klarglas mit mattierter Sicherheitsfolie überzogen.", "Verre clair feuilleté avec film de sécurité dépoli."],
  "PROHLUBEŇ": ["pit", "Grube / Schachtgrube", "fosse"],
  "Prohlubeň a nástupní můstky ve všech nástupištích": ["Shaft pit and distance bridges in each floor", "Schachtgrube und Distanzbrücken in jeder Etage", "Fosse et passerelles d’accès à tous les paliers"],
  "PROSKLENÁ STŘÍŠKA NAD VENKOVNÍM VSTUPEM DO VÝTAHU": ["GLASS CANOPY OVER OUTDOOR ELEVATOR ENTRANCE", "GLASVORDACH ÜBER DEM AUSSENEINGANG ZUM AUFZUG", "AUVENT VITRÉ AU-DESSUS DE L’ENTRÉE EXTÉRIEURE DE L’ASCENSEUR"],
  "PROSKLENÍ ŠACHTY MLÉČNÝMI SKLY": ["SHAFT CLADDING WITH FROSTED GLASS", "SCHACHTVERKLEIDUNG MIT SATINIERTEM GLAS", "HABILLAGE DE LA GAINE EN VERRE DÉPOLI"],
  "Prostor pro skladování materiálu a nářadí během montáže": ["Storage location for materials and tools during installation.", "Lagerplatz für Material und Werkzeug während der Montage.", "Espace de stockage pour le matériel et l’outillage pendant le montage."],
  "Provedení vnějších skel opláštění výtahové šachty s vyšším koeficientem tepelné reflexe kvůli zmírnění přehřívání interiéru šachty vlivem slunečního svitu": ["Cladding glass with a higher coefficient of thermal resistance to mitigate shaft interior overheating due to sunlight.", "Verkleidungsglas mit einem höheren Wärmewiderstandskoeffizienten, um die Überhitzung des Schachtinneren durch Sonnenlicht zu verringern.", "Vitrage d’habillage avec un coefficient de réflexion thermique plus élevé pour limiter la surchauffe de l’intérieur de la gaine due au soleil."],
  "průběžná, vedle podest": ["Continuous, next to the platforms", "durchgehend, neben den Podesten", "continue, le long des paliers"],
  "PŘECHODOVÉ PLECHY VE VŠECH NÁSTUPIŠTÍCH": ["SILL EXTENSION PLATES IN ALL LANDINGS", "SCHWELLENVERLÄNGERUNGSPLATTEN IN ALLEN PODESTEN", "TÔLES DE PROLONGEMENT DE SEUIL À TOUS LES PALIERS"],
  "PŘEDÁNÍ DÍLA:": ["HANDOVER OF COMPLETE INSTALLATION:", "ÜBERGABE DER KOMPLETTEN INSTALLATION:", "REMISE DE L’OUVRAGE :"],
  "přejezd": ["OVERHEAD", "Schachtkopf", "réserve supérieure (hauteur libre)"],
  "Připojení na elektřinu 230V": ["Electric power line of 230V for installation needs.", "Stromanschluss mit 230 V für die Installation.", "Raccordement électrique 230 V pour les besoins du montage."],
  "PŘÍMOTOP S ČIDLEM A TERMOSTATEM": ["HEATING WITH SENSOR AND THERMOSTAT", "HEIZUNG MIT SENSOR UND THERMOSTAT", "CHAUFFAGE AVEC CAPTEUR ET THERMOSTAT"],
  "příplatky": ["extra charge", "Mehrpreis", "suppléments"],
  "PŘÍPRAVA PRO DALŠÍ DODAVATELE": ["PREPARATORY FOR OTHER SUBCONTRACTORS","VORBEREITUNGEN FÜR ANDERE SUBUNTERNEHMER","PRÉPARATION POUR LES AUTRES FOURNISSEURS"],
  /* NÁZEV AKCE PO JEDNÉ VARIANTĚ (nález D3, 15. 9. 2026).
   *
   * Řetězce s lomítkem („přístavba/vestavba…") nesly obě možnosti naráz
   * a slovník je poctivě přeložil celé — v anglické specifikaci pro Konstanz
   * proto stálo „extension / built-in installation…" a obchodník jednu půlku
   * mazal ve Wordu. Čtyři samostatné varianty odpovídají číselníku
   * TS_C.nazevAkce; obě staré podoby ZŮSTÁVAJÍ, aby se starší zakázky pořád
   * přeložily. */
  "přístavba nové prosklené OCK výtahové šachty": ["extension of a building with a new glazed steel elevator shaft structure", "Anbau eines neuen verglasten Aufzugsschachtgerüsts", "extension par une nouvelle structure métallique vitrée de gaine d'ascenseur"],
  "vestavba nové prosklené OCK výtahové šachty": ["built-in installation of a new glazed steel elevator shaft structure", "Einbau eines neuen verglasten Aufzugsschachtgerüsts", "intégration d'une nouvelle structure métallique vitrée de gaine d'ascenseur"],
  "přístavba nové OCK výtahové šachty včetně opláštění": ["extension of a building with a new steel elevator shaft structure incl. cladding", "Anbau eines neuen Aufzugsschachtgerüsts einschließlich Verkleidung", "extension par une nouvelle gaine d'ascenseur en acier, habillage compris"],
  "vestavba nové OCK výtahové šachty včetně opláštění": ["built-in installation of a new steel elevator shaft structure incl. cladding", "Einbau eines neuen Aufzugsschachtgerüsts einschließlich Verkleidung", "intégration d'une nouvelle gaine d'ascenseur en acier, habillage compris"],
  "přístavba/vestavba nové prosklené OCK výtahové šachty": ["extension / built-in installation of a new glazed steel elevator shaft structure", "Anbau/Einbau eines neuen verglasten Aufzugsschachtgerüsts", "extension / intégration d'une nouvelle structure métallique vitrée de gaine d'ascenseur"],
  "přístavba/vestavba nové OCK výtahové šachty včetně opláštění": ["extension / built-in installation of a new steel elevator shaft structure incl. cladding", "Anbau/Einbau eines neuen Aufzugsschachtgerüsts einschließlich Verkleidung", "extension/intégration d’une nouvelle gaine d’ascenseur en acier, habillage compris"],
  "přízemí": ["ground floor","Erdgeschoss (EG)","rez-de-chaussée"],
  "příčka": ["HORIZONTAL BEAM", "Horizontalriegel", "traverse"],
  "příčník": ["crossbar", "Querriegel", "traverse"],
  "půdorys": ["floor plan", "Grundriss", "plan (vue en plan)"],
  "Reference:": ["References:","Referenzen:","Références :"],
  "Reflexní vrstva na vnější straně skel opláštění výtahové šachty kvůli zvýšení neprůhlednosti celé šachty": ["Reflective cladding glass for reducing transparency of the entire shaft.", "Reflektierendes Verkleidungsglas zur Reduzierung der Transparenz des gesamten Schachtes.", "Vitrage réfléchissant pour réduire la transparence de l’ensemble de la gaine."],
  "rohový sloupek": ["corner column", "Eckstiel", "montant d’angle"],
  "Rovná nerezová trubka se zaslepenými konci (celkem 2 kusy)": ["Stainless steel tube with end covers (2 pcs per floor)", "Edelstahlrohr mit Enddeckeln (2 Stück pro Etage)", "Tube en inox avec embouts (2 pièces par étage)"],
  "Rovný profil z tvrdého dřeva, čirý lak (celkem 2 kusy na každé mezipatro)": ["Hard wood handle with painted finishing (2pcs per floor)", "Hartholzgriff mit lackierter Oberfläche (2 Stück pro Etage)", "Profil en bois dur, vernis clair (2 pièces par demi-étage)"],
  "ROZMĚR ŠACHTY [mm] *": ["SHAFT SIZE [mm] *", "SCHACHTGRÖSSE [mm] *", "DIMENSIONS DE LA GAINE [mm] *"],
  "SKLA S VNĚJŠÍ POVRCHOVOU ÚPRAVOU (Stopsol, apod.)": ["CLADDING GLASS WITH ADDITIONAL FINISHING (Stopsol, etc.)", "SONNENSCHUTZVERGLASUNG (Stopsol usw.)", "VITRAGE AVEC TRAITEMENT DE SURFACE EXTÉRIEUR (Stopsol, etc.)"],
  "SKLA S VYŠŠÍ ENERGETICKOU REFLEXÍ": ["HIGH ENERGY RESISTANCE CLADDING GLASS", "HOCHENERGIEBESTÄNDIGES VERKLEIDUNGSGLAS", "VITRAGE À HAUTE RÉFLEXION THERMIQUE"],
  "Sloupko-příčková fasáda": ["Post-and-Rail Façade", "Pfosten-Riegel-Fassade", "façade à montants et traverses"],
  "Splatnost faktur 14 dní ode dne vystavení": ["Invoices are due 14 days from the date of issue.", "Alle Zahlungen verstehen sich 14 Tage netto ohne Abzug.", "Les factures sont payables à 14 jours à compter de leur date d’émission."],
  "Statika objektu a zkušební statika": ["Building statics and test statics.", "Gebäudestatik und Prüfstatik.", "Statique du bâtiment et statique d’essai."],
  "stavba": ["site","Baustelle","chantier"],
  "STAVEBNÍK": ["building owner", "BAUHERR", "MAÎTRE D’OUVRAGE"],
  "Strojovna": ["Machine room", "Triebwerksraum", "local des machines"],
  "Stručný popis doplňkového prvku nabízené šachty.": ["Description to be added here.", "Beschreibung muss hier hinzugefügt werden.", "Description à compléter ici."],
  /* Stříška se od 9. 9. 2026 zadává počtem kusů (položka nabídky i hodnota
   * v technické specifikaci). Množné číslo řeší vzor v PREKLAD_VZORY. */
  "STŘÍŠKA NAD NÁSTUPIŠTĚ": ["CANOPY OVER LANDING", "VORDACH ÜBER DER ZUGANGSSTELLE", "AUVENT AU-DESSUS DU PALIER"],
  "nad nástupištěm": ["over the landing", "über der Zugangsstelle", "au-dessus du palier"],
  "STŘECHA NAD NÁSTUPIŠTĚM": ["CANOPY OVER ENTRANCE", "VORDACH ÜBER DEM EINGANG", "AUVENT AU-DESSUS DE L’ENTRÉE"],
  "Suterén": ["basement", "Untergeschoss (UG)", "sous-sol"],
  "Technická specifikace výtahové šachty": ["Elevator steel shaft technical specification", "Technische Spezifikation des Aufzugsschachtgerüsts", "Spécification technique de la gaine d’ascenseur"],
  "TERMÍNY REALIZACE:": ["INSTALLATION SCHEDULE:", "INSTALLATIONSZEITPLAN:", "CALENDRIER DE RÉALISATION :"],
  "TYP KONSTRUKCE": ["SHAFT STRUCTURE TYPE", "SCHACHTSTAHLKONSTRUKTION TYP", "TYPE DE STRUCTURE DE GAINE"],
  "Ulice orientační/popisné, Město": ["Street name, bldg nr, town, Germany","Straßenname, Hausnummer, Ort, Deutschland","Rue et numéro, Ville"],
  "UMÍSTĚNÍ OPLÁŠTĚNÍ": ["CLADDING POSITION", "POSITION DER VERKLEIDUNG", "POSITION DE L’HABILLAGE"],
  "USAZENÍ ZADNÍ STĚNY OCK": ["SHAFT STRUCTURE FIXING - REAR WALL", "BEFESTIGUNG DES SCHACHTGERÜSTS - RÜCKWAND", "Fixation de la structure de gaine - paroi arrière"],
  "USKLADNĚNÍ MATERIÁLU Z DŮVODU OPOŽDĚNÍ MONTÁŽE": ["MATERIAL STORAGE DUE TO INSTALLATION DELAYS", "MATERIALLAGERUNG AUFGRUND VON MONTAGEVERZÖGERUNGEN", "STOCKAGE DU MATÉRIEL EN CAS DE RETARD DU MONTAGE"],
  "VENTILÁTOR S ČIDLEM A TERMOSTATEM": ["FAN WITH SENSOR AND THERMOSTAT", "VENTILATOR MIT SENSOR UND THERMOSTAT", "VENTILATEUR AVEC CAPTEUR ET THERMOSTAT"],
  "VNITŘNÍ LEŠENÍ PRO MONTÁŽ OCK": ["INSTALLATION SCAFFOLDING - INSIDE SHAFT", "EINBAUGERÜST - INNERHALB DES SCHACHTS", "ÉCHAFAUDAGE DE MONTAGE – À L’INTÉRIEUR DE LA GAINE"],
  "VNĚJŠÍ LEŠENÍ PRO ZASKLENÍ ŠACHTY": ["INSTALLATION SCAFFOLDING - AROUND SHAFT", "EINBAUGERÜST - RUND UM DEN SCHACHT", "ÉCHAFAUDAGE DE MONTAGE – AUTOUR DE LA GAINE"],
  "vrchní (konečný) nátěr": ["top coat", "Deckanstrich", "couche de finition"],
  "vstup": ["entrance", "Eingang", "entrée"],
  "VYBUDOVÁNÍ NOVÉ PROHLUBNĚ": ["NEW PIT","ERSTELLUNG EINER NEUEN SCHACHTGRUBE","RÉALISATION D'UNE NOUVELLE CUVETTE"],
  "vypracoval": ["compiled by","Zusammengestellt von","établi par"],
  "VYTÁPĚNÍ POMOCÍ PŘÍMOTOPU": ["SHAFT HEATING", "SCHACHTHEIZUNG", "CHAUFFAGE DE LA GAINE"],
  "výtahová šachta": ["shaft", "Schacht", "gaine"],
  "X / X": ["X / X","X / X","X / X"],
  "XX,XXX": ["XX,XXX","XX,XXX","XX,XXX"],
  "XX.XX.2026": ["XX.XX.2026","XX.XX.2026","XX.XX.2026"],
  "xxxx": ["xxxx","xxxx","xxxx"],
  "XXXXX": ["XXXXX","XXXXX","XXXXX"],
  "Zahájení montáže cca 12 týdnů po podpisu SoD a odsouhlasení finálních dispozičních výkresů celé technologie výtahu a šachty.": ["Installation will start approx. 12 weeks from contract signature AND final approved elevator and shaft layout drawings.", "Die Installation beginnt ca. 12 Wochen nach Vertragsunterzeichnung UND endgültiger Genehmigung der Aufzugs- und Schachtgrundrisszeichnungen.", "Le montage commencera env. 12 semaines après la signature du contrat ET l’approbation définitive des plans d’implantation de l’ascenseur et de la gaine."],
  "Zajištění montážního lešení": ["Provide installation scaffolding.", "Bereitstellung eines Montagegerüsts.", "Mise à disposition d’un échafaudage de montage."],
  "Zajištění přístupu na místo realizace a do všech prostor s realizací díla souvisejících včetně transportních cest (nutné dojednat před zahájením přípravných prací)": ["Ensuring access to the site and to all areas related to installation, including transport routes (to be arranged before the start of pre-work).", "Sicherstellung des Zugangs zur Baustelle und zu allen mit der Installation zusammenhängenden Bereichen, einschließlich der Transportwege (vor Beginn der Vorarbeiten zu vereinbaren).", "Assurer l’accès au site et à tous les espaces liés à la réalisation, y compris les voies de transport (à convenir avant le début des travaux préparatoires)."],
  "ZDVIH": ["TRAVEL","FÖRDERHÖHE","COURSE"],
  "Zjevné chyby v nabídkovém řízení mohou být opraveny před podpisem smlouvy.": ["Obvious errors in the tendering procedure may be corrected before the contract is signed.", "Offensichtliche Angebotsfehler können vor Auftragsannahme berichtigt werden.", "Les erreurs manifestes de l’offre peuvent être corrigées avant la signature du contrat."],
  "změna": ["revision / change", "Änderungen", "modification"],
  "zrcadlo schodiště": ["Stairwell Void", "Treppenauge", "jour d’escalier"],
  "ZÁBRADLÍ VEDLE ŠACHTY": ["HANDRAIL NEXT TO THE SHAFT","HANDLAUF NEBEN DEM SCHACHT","GARDE-CORPS À CÔTÉ DE LA GAINE"],
  "základní nátěr": ["primer","Grundierung","couche primaire"],
  "ZÁKLADOVÁ DESKA PRO ZALOŽENÍ NOSNÉ PODCHOZÍ KONSTRUKCE": ["FOUNDATION SLAB FOR SHAFT SUB-STRUCTURE", "FUNDAMENTPLATTE FÜR SCHACHTUNTERKONSTRUKTION", "DALLE DE FONDATION POUR LA SOUS-STRUCTURE DE LA GAINE"],
  "ÚPRAVA PROHLUBNĚ NA NOVÝ ROZMĚR": ["PIT MODIFICATION TO NEW DIMENSIONS", "ANPASSUNG DER SCHACHTGRUBE AUF NEUE ABMESSUNGEN", "MODIFICATION DE LA FOSSE AUX NOUVELLES DIMENSIONS"],
  "Číslo nabídky:": ["Tender number:", "Angebots-Nr.:", "Numéro de l’offre :"],
  "řez": ["section", "Schnitt", "coupe"],
  "šířka kabiny": ["car width", "Kabinenbreite", "largeur de cabine"],
  "Šířka vnitřní": ["Internal width", "Innere Breite", "Largeur intérieure"],
  "Šířka vnější": ["External width", "Äußere Breite", "Largeur extérieure"],

  /* ---- doplněno 2026-07-26: technická specifikace vč. rolovacích seznamů (úkol N1b) ---- */
  "1250-1500 mm": ["1250-1500 mm","1250-1500 mm","1250-1500 mm"],
  "4x rohový sloupek + 1x sloupek v zadní stěně, ocelové uzavřené profily": ["4 corner columns + 1 column in the rear wall, closed steel profiles","4 Eckstiele + 1 Stiel in der Rückwand, geschlossene Stahlprofile","4 poteaux d'angle + 1 poteau dans la paroi arrière, profilés acier fermés"],
  "4x rohový sloupek + 2x sloupek v bočních stěnách, ocelové uzavřené profily": ["4 corner columns + 2 columns in the side walls, closed steel profiles","4 Eckstiele + 2 Stiele in den Seitenwänden, geschlossene Stahlprofile","4 poteaux d'angle + 2 poteaux dans les parois latérales, profilés acier fermés"],
  "6x sloupek ve vrcholech 6-ti úhelníkového půdorysu": ["6 columns at the corners of the hexagonal plan","6 Stiele an den Ecken des sechseckigen Grundrisses","6 poteaux aux sommets du plan hexagonal"],
  "8x sloupek ve vrcholech 8-mi úhelníkového půdorysu": ["8 columns at the corners of the octagonal plan","8 Stiele an den Ecken des achteckigen Grundrisses","8 poteaux aux sommets du plan octogonal"],
  "ano, oválné otvory pro kotvení konzolí vodítek a šachetních dveří v příčnících OCK včetně dodávky T šroubů M12 s podložkou": ["Yes, oval holes in the cross beams of the steel structure for fixing the guide rail brackets and landing doors, including supply of M12 T-bolts with washers","Ja, Langlöcher in den Querträgern der Stahlkonstruktion zur Befestigung der Führungsschienenbügel und der Schachttüren, inkl. Lieferung von T-Schrauben M12 mit Unterlegscheibe","Oui, trous oblongs dans les traverses de la structure pour la fixation des consoles de guides et des portes palières, y compris la fourniture de boulons en T M12 avec rondelle"],
  "bez dokrytí": ["Without cover plate","Ohne Abdeckung","Sans recouvrement"],
  "bez opláštění, komplet dozdí stavba": ["Without cladding, fully bricked up by the building contractor","Ohne Verkleidung, komplett bauseits zugemauert","Sans bardage, entièrement rebouché en maçonnerie par l'entreprise"],
  "bez opláštění": ["Without cladding","Ohne Verkleidung","Sans bardage"],
  "bez předsazených portálů": ["Without projecting entrance portals","Ohne vorgesetzte Eingangsportale","Sans entrées d'étage en saillie"],
  "bez zastřešení (OCK končí pod stropem)": ["Without roofing (the steel structure ends below the ceiling)","Ohne Bedachung (die Stahlkonstruktion endet unter der Decke)","Sans toiture (la structure se termine sous le plafond)"],
  "bezúplatně zajistí objednatel": ["Provided by the customer free of charge","Wird vom Besteller kostenlos zur Verfügung gestellt","Fourni gratuitement par le client"],
  "cementotřískové desky včetně zateplení": ["Cement-bonded particle boards including thermal insulation","Zementspanplatten einschließlich Wärmedämmung","Panneaux de particules liées au ciment avec isolation thermique"],
  "cementotřískové desky": ["Cement-bonded particle boards","Zementspanplatten","Panneaux de particules liées au ciment"],
  "čiré sklo - hrany strojově broušeny": ["Clear glass - machine-ground edges","Klarglas - maschinell geschliffene Kanten","Verre clair - chants polis à la machine"],
  "do L profilů mezi příčníky": ["Into L profiles between the cross beams","In L-Profile zwischen den Querträgern","Dans des cornières entre les traverses"],
  "do rámečku z plechových lišt": ["Into a frame made of sheet metal trims","In einen Rahmen aus Blechleisten","Dans un cadre en baguettes de tôle"],
  "DOKONČENÍ PODLAH NÁSTUPIŠŤ A NAPOJENÍ K PRAHŮM Š. DVEŘÍ": ["LANDING FLOOR COMPLETION AND CONNECTION TO LANDING DOOR SILLS","FERTIGSTELLUNG DER PODESTBÖDEN UND ANSCHLUSS AN DIE SCHACHTTÜRSCHWELLEN","FINITION DES SOLS DES PALIERS ET RACCORDEMENT AUX SEUILS DES PORTES PALIÈRES"],
  "dokončení provede stavba": ["Completion by the building contractor","Fertigstellung bauseits","Finition réalisée par l'entreprise de construction"],
  "dokrytí nerezovým plechem": ["Covered with stainless steel sheet","Verkleidet mit Edelstahlblech","Recouvrement en tôle inox"],
  "DOSTATEČNÉ PŘÍSTUPOVÉ A MANIPULAČNÍ PROSTORY": ["SUFFICIENT ACCESS AND HANDLING SPACE","AUSREICHENDE ZUGANGS- UND MANIPULATIONSFLÄCHEN","ESPACES D'ACCÈS ET DE MANUTENTION SUFFISANTS"],
  "dveřní vstup ze dvora (diagonálně průchozí kabina)": ["Door entrance from the courtyard (corner entry through-type car)","Türzugang vom Hof (Kabine mit Eckzugang)","Accès par la cour (cabine traversante à angle)"],
  "dveřní vstup ze dvora (průchozí kabina)": ["Door entrance from the courtyard (through-type car)","Türzugang vom Hof (Durchladekabine)","Accès par la cour (cabine traversante)"],
  "hydraulický agregát v samostatné místnosti mimo šachtu": ["Hydraulic power unit in a separate room outside the shaft","Hydraulikaggregat in einem separaten Raum außerhalb des Schachts","Centrale hydraulique dans un local séparé hors de la gaine"],
  "individuální řešení": ["Individual solution","Individuelle Lösung","Solution individuelle"],
  "izolační dvojskla vsazená do lakovaných rámečků": ["Insulating double glazing set in painted frames","Isolierverglasung in lackierte Rahmen eingesetzt","Double vitrage isolant posé dans des cadres laqués"],
  "izolační dvojsklo v kombinaci s vrstveným bezpečnostním sklem VSG": ["Insulating double glazing combined with laminated safety glass VSG","Isolierverglasung in Kombination mit Verbundsicherheitsglas VSG","Double vitrage isolant combiné avec du verre feuilleté de sécurité VSG"],
  "je součástí dodávky na celou dobu stavby": ["Included in the delivery for the whole construction period","Im Lieferumfang für die gesamte Bauzeit","Inclus dans la fourniture pour toute la durée du chantier"],
  "je součástí dodávky pro dokončení opláštění v horním přejezdu": ["Included in the delivery for completing the cladding in the top overrun","Im Lieferumfang für die Fertigstellung der Verkleidung im oberen Schachtkopf","Inclus dans la fourniture pour la finition du bardage en partie haute de la gaine"],
  "je součástí dodávky pro provedení kompletního opláštění šachty": ["Included in the delivery for carrying out the complete shaft cladding","Im Lieferumfang für die Ausführung der kompletten Schachtverkleidung","Inclus dans la fourniture pour la réalisation du bardage complet de la gaine"],
  "je součástí dodávky pro stavbu šachty i montáž výtahu": ["Included in the delivery for both the shaft erection and the lift installation","Im Lieferumfang für den Schachtbau und die Aufzugsmontage","Inclus dans la fourniture pour le montage de la gaine et de l'ascenseur"],
  "kabina se třemi vstupy": ["Car with three entrances","Kabine mit drei Zugängen","Cabine à trois accès"],
  "kompletní opláštění šachty": ["Complete shaft cladding","Komplette Schachtverkleidung","Bardage complet de la gaine"],
  /* Opláštění po stěnách (#268, 3. krok, 21. 9. 2026). Věta o rozsahu se
     skládá z proměnlivého počtu kusů, takže ji slovník nemůže trefit celou —
     překládají se jednotlivé kusy a `tsOplasteniRozsah` je složí v cílovém
     jazyce. Proto jsou tu i krátká slova jako „do" nebo „výš": samostatně
     vypadají divně, ve větě o stěně dávají smysl. */
  "opláštění po stěnách": ["Cladding by walls","Verkleidung nach Wänden","Bardage par parois"],
  "stěna": ["Wall","Wand","Paroi"],
  "do výšky": ["up to","bis","jusqu'à"],
  "od výšky": ["from","ab","à partir de"],
  "výš": ["above","darüber","au-dessus"],
  "tedy do prohlubně": ["i.e. into the pit","also in die Schachtgrube","c'est-à-dire dans la cuvette"],
  "jiné opláštění": ["Other cladding","Andere Verkleidung","Autre bardage"],
  "Dvojsklo (boky + záda)": ["Double glazing (sides + rear)","Isolierverglasung (Seiten + Rückwand)","Double vitrage (côtés + arrière)"],
  "Sklo VSG 4.4.1": ["Laminated safety glass VSG 4.4.1","Verbundsicherheitsglas VSG 4.4.1","Verre feuilleté de sécurité VSG 4.4.1"],
  "Sklo VSG 4.4.2": ["Laminated safety glass VSG 4.4.2","Verbundsicherheitsglas VSG 4.4.2","Verre feuilleté de sécurité VSG 4.4.2"],
  "Cetris": ["Cement-bonded particle board","Zementgebundene Spanplatte","Panneau de particules lié au ciment"],
  "bez — dodá stavba": ["None — supplied by the building contractor","Ohne — wird bauseits geliefert","Sans — fourni par l'entreprise de construction"],
  "kontaktní, hmoždiny do ŽB konstrukcí": ["Contact, dowels into reinforced concrete structures","Kontakt, Dübel in Stahlbetonkonstruktionen","Contact, chevilles dans les structures en béton armé"],
  "kontaktní, přes antivibrační podložky": ["Contact, via anti-vibration pads","Kontakt, über Schwingungsdämpfer","Contact, via des plots antivibratoires"],
  "kontaktní, přivařením k ocelovým nosníkům": ["Contact, welded to steel beams","Kontakt, an Stahlträger angeschweißt","Contact, soudé aux poutres métalliques"],
  "kotvené na vnější stranu ocelové konstrukce": ["Fixed to the outer side of the steel structure","An der Außenseite der Stahlkonstruktion befestigt","Fixé sur la face extérieure de la structure métallique"],
  "kotvy do otvorů vrtaných ve skle": ["Anchors into holes drilled in the glass","Anker in im Glas gebohrte Löcher","Ancrages dans des trous percés dans le verre"],
  "kruhový terč průměr 70 mm, lakovaný, zapuštěný pozink šroub": ["Round point fixing dia. 70 mm, painted, countersunk galvanised screw","Runder Punkthalter Ø 70 mm, lackiert, versenkte verzinkte Schraube","Patère ronde Ø 70 mm, laquée, vis galvanisée à tête fraisée"],
  "kruhový terč průměr 70 mm, nerezový, zapuštěný šroub": ["Round point fixing dia. 70 mm, stainless steel, countersunk screw","Runder Punkthalter Ø 70 mm, Edelstahl, versenkte Schraube","Patère ronde Ø 70 mm, inox, vis à tête fraisée"],
  "kruhový tvar": ["Circular shape","Runde Form","Forme circulaire"],
  "lakované lišty po obvodu skla": ["Painted trims along the glass perimeter","Lackierte Leisten am Glasumfang","Baguettes laquées sur le pourtour du verre"],
  "lesklý ochranný lak, odstín RAL 7016": ["Glossy protective paint, RAL 7016","Glänzender Schutzlack, RAL 7016","Peinture de protection brillante, teinte RAL 7016"],
  "LEŠENÍ KOLEM OCK PRO PROVEDENÍ OPLÁŠTĚNÍ": ["SCAFFOLDING AROUND THE STRUCTURE FOR CLADDING WORKS","GERÜST UM DIE STAHLKONSTRUKTION FÜR DIE VERKLEIDUNGSARBEITEN","ÉCHAFAUDAGE AUTOUR DE LA STRUCTURE POUR LA POSE DU BARDAGE"],
  "lichoběžník": ["Trapezoid","Trapez","Trapèze"],
  "lze doplnit - viz „Příplatky“": ["Can be added - see \"Surcharges\"","Kann ergänzt werden - siehe „Aufpreise“","Peut être ajouté - voir « Suppléments »"],
  "materiály DP1, opláštění s deklarovanou požární odolností EI": ["DP1 materials, cladding with declared fire resistance EI","Materialien DP1, Verkleidung mit deklariertem Feuerwiderstand EI","Matériaux DP1, bardage avec résistance au feu déclarée EI"],
  "materiály DP1, opláštění s deklarovanou požární odolností EW": ["DP1 materials, cladding with declared fire resistance EW","Materialien DP1, Verkleidung mit deklariertem Feuerwiderstand EW","Matériaux DP1, bardage avec résistance au feu déclarée EW"],
  "materiály DP1": ["DP1 materials","Materialien DP1","Matériaux DP1"],
  "matný ochranný lak v barvě RAL dle výběru objednatele": ["Matt painting in RAL colour of customer's choice","Matter Schutzlack im RAL-Farbton nach Wahl des Bestellers","Peinture de protection mate dans la teinte RAL au choix du client"],
  "matný ochranný lak, odstín RAL 7016": ["Matt protective paint, RAL 7016","Matter Schutzlack, RAL 7016","Peinture de protection mate, teinte RAL 7016"],
  "max 1500 mm": ["max 1500 mm","max. 1500 mm","max. 1500 mm"],
  "mezera 5-10 cm": ["Gap 5-10 cm","Spalt 5-10 cm","Jeu 5-10 cm"],
  "mezera max. 5 cm": ["Gap max. 5 cm","Spalt max. 5 cm","Jeu max. 5 cm"],
  "minerální izolace, VPC omítka + fasádní barva": ["Mineral insulation, lime-cement plaster + facade paint","Mineraldämmung, Kalkzementputz + Fassadenfarbe","Isolation minérale, enduit chaux-ciment + peinture de façade"],
  "mléčné sklo - hrany skel strojově broušeny": ["Opal glass - machine-ground glass edges","Milchglas - maschinell geschliffene Glaskanten","Verre opale - chants polis à la machine"],
  "mléčné sklo": ["Opal glass","Milchglas","Verre opale"],
  "na nosné základové desce nad úrovní dvora": ["On a load-bearing foundation slab above courtyard level","Auf einer tragenden Fundamentplatte über dem Hofniveau","Sur une dalle de fondation porteuse au-dessus du niveau de la cour"],
  "na nosné základové desce v úrovni dvora": ["On a load-bearing foundation slab at courtyard level","Auf einer tragenden Fundamentplatte auf Hofniveau","Sur une dalle de fondation porteuse au niveau de la cour"],
  "na nosné základové desce": ["On a load-bearing foundation slab","Auf einer tragenden Fundamentplatte","Sur une dalle de fondation porteuse"],
  "na zpevněné hraně stěn spodní části výtahové šachty": ["On the reinforced edge of the lower shaft walls","Auf dem verstärkten Rand der unteren Schachtwände","Sur le bord renforcé des parois de la partie inférieure de la gaine"],
  "NAPÁJENÍ VÝTAHU VČETNĚ REVIZNÍ ZPRÁVY": ["LIFT POWER SUPPLY INCLUDING INSPECTION REPORT","STROMVERSORGUNG DES AUFZUGS EINSCHLIESSLICH PRÜFBERICHT","ALIMENTATION ÉLECTRIQUE DE L'ASCENSEUR AVEC RAPPORT DE CONTRÔLE"],
  "nástupní můstky u protilehlých nástupišť": ["Access bridges at the opposite landings","Zugangsbrücken an den gegenüberliegenden Zugangsstellen","Passerelles d'accès aux arrêts opposés"],
  "nejsou součástí konstrukce": ["Not part of the structure","Nicht Bestandteil der Konstruktion","Ne fait pas partie de la structure"],
  "není požadováno": ["Not required","Nicht erforderlich","Non requis"],
  "není řešeno": ["Not addressed","Nicht vorgesehen","Non traité"],
  "není součást dodávky, lze doplnit viz příplatkové ceny": ["Not included in the delivery, can be added - see surcharge prices","Nicht im Lieferumfang, kann ergänzt werden - siehe Aufpreise","Non inclus dans la fourniture, peut être ajouté - voir les prix des suppléments"],
  "není součást dodávky, zajistí objednatel před montáží šachty": ["Not included in the delivery, provided by the customer before the shaft installation","Nicht im Lieferumfang, wird vom Besteller vor der Schachtmontage sichergestellt","Non inclus dans la fourniture, à la charge du client avant le montage de la gaine"],
  "není součástí dodávky, zajistí objednatel": ["Not included in the delivery, provided by the customer","Nicht im Lieferumfang, wird vom Besteller sichergestellt","Non inclus dans la fourniture, à la charge du client"],
  "nepravidelný tvar (viz nákres)": ["Irregular shape (see drawing)","Unregelmäßige Form (siehe Zeichnung)","Forme irrégulière (voir plan)"],
  "nerezové držáky do otvorů ve skle": ["Stainless steel holders into holes in the glass","Edelstahlhalter in Löcher im Glas","Fixations inox dans les trous du verre"],
  "nerezové lišty po obvodu skla": ["Stainless steel trims along the glass perimeter","Edelstahlleisten am Glasumfang","Baguettes inox sur le pourtour du verre"],
  "obdélníkový terč 80x50, lakovaný RAL 7016, zapuštěné pozink šrouby": ["Rectangular point fixing 80x50, painted RAL 7016, countersunk galvanised screws","Rechteckiger Punkthalter 80x50, lackiert RAL 7016, versenkte verzinkte Schrauben","Patère rectangulaire 80x50, laquée RAL 7016, vis galvanisées à tête fraisée"],
  "obdélníkový terč 80x50, nerezový, zapuštěné pozink šrouby": ["Rectangular point fixing 80x50, stainless steel, countersunk galvanised screws","Rechteckiger Punkthalter 80x50, Edelstahl, versenkte verzinkte Schrauben","Patère rectangulaire 80x50, inox, vis galvanisées à tête fraisée"],
  "ochranný vypalovaný lak, odstín RAL 7016": ["Baked protective paint (powder coating), RAL 7016","Einbrennschutzlack, RAL 7016","Peinture de protection thermolaquée, teinte RAL 7016"],
  "osmiúhelník": ["Octagon","Achteck","Octogone"],
  "plech v barvě shodné s nátěrem celé OCK": ["Sheet metal in the same colour as the whole steel structure","Blech in der gleichen Farbe wie die gesamte Stahlkonstruktion","Tôle de la même teinte que l'ensemble de la structure"],
  "plech v celé ploše podesty": ["Sheet metal over the whole landing area","Blech über die gesamte Podestfläche","Tôle sur toute la surface du palier"],
  "plechové lišty na bocích podest": ["Sheet metal trims on the landing sides","Blechleisten an den Podestseiten","Baguettes en tôle sur les côtés des paliers"],
  "plochá pultová střecha se sklonem na budovu, RAL 3011": ["Flat mono-pitch roof sloping towards the building, RAL 3011","Flaches Pultdach mit Gefälle zum Gebäude, RAL 3011","Toiture monopente plate inclinée vers le bâtiment, RAL 3011"],
  "plochá pultová střecha se sklonem na dvůr přetažená i přes nástupní můstek až k fasádě budovy, žlab není uvažován": ["Flat mono-pitch roof sloping towards the courtyard, extended over the access bridge up to the building facade, gutter not considered","Flaches Pultdach mit Gefälle zum Hof, über die Zugangsbrücke bis zur Gebäudefassade verlängert, Rinne nicht vorgesehen","Toiture monopente plate inclinée vers la cour, prolongée au-dessus de la passerelle jusqu'à la façade du bâtiment, gouttière non prévue"],
  "plochá pultová střecha se sklonem na dvůr, RAL 3011": ["Flat mono-pitch roof sloping towards the courtyard, RAL 3011","Flaches Pultdach mit Gefälle zum Hof, RAL 3011","Toiture monopente plate inclinée vers la cour, RAL 3011"],
  "portál mezi sloupky šachty (nepředsazený na podestu)": ["Portal between the shaft columns (not projecting onto the landing)","Portal zwischen den Schachtstielen (nicht auf das Podest vorgesetzt)","Entrée entre les poteaux de la gaine (sans saillie sur le palier)"],
  "POVRCHOVÁ ÚPRAVA KONSTRUKCE": ["STRUCTURE FINISHING","OBERFLÄCHENBEHANDLUNG DER KONSTRUKTION","FINITION DE LA STRUCTURE MÉTALLIQUE"],
  "pravoúhlý tvar, zkosené zadní rohy konstrukce": ["Rectangular shape, chamfered rear corners of the structure","Rechteckige Form, abgeschrägte hintere Ecken der Konstruktion","Forme rectangulaire, angles arrière de la structure chanfreinés"],
  "prohlubeň, podesty ve všech nástupištích a hlava šachty": ["Pit, landings at all floors and shaft head","Schachtgrube, Podeste an allen Zugangsstellen und Schachtkopf","Cuvette, paliers à tous les arrêts et tête de gaine"],
  "prohlubeň, všechny podesty, hlava šachty a sloupky zadní stěny do schodnic": ["Pit, all landings, shaft head and rear wall columns into the stair stringers","Schachtgrube, alle Podeste, Schachtkopf und Rückwandstiele in die Treppenwangen","Cuvette, tous les paliers, tête de gaine et poteaux de la paroi arrière dans les limons d'escalier"],
  "prosklení nade dveřmi a jedné straně vedle dveří": ["Glazing above the door and on one side next to the door","Verglasung über der Tür und an einer Seite neben der Tür","Vitrage au-dessus de la porte et d'un côté de la porte"],
  "prosklení nade dveřmi a obou stranách vedle dveří": ["Glazing above the door and on both sides next to the door","Verglasung über der Tür und an beiden Seiten neben der Tür","Vitrage au-dessus de la porte et des deux côtés de la porte"],
  "protisluneční sklo Cool Lite, Ug=1,1 W/m2.K": ["Solar control glass Cool Lite, Ug=1.1 W/m2.K","Sonnenschutzglas Cool Lite, Ug=1,1 W/m2.K","Verre de contrôle solaire Cool Lite, Ug=1,1 W/m2.K"],
  "provede kompletně stavba po montáži šachetních dveří": ["Carried out entirely by the building contractor after the landing doors are installed","Wird nach der Montage der Schachttüren komplett bauseits ausgeführt","Entièrement réalisé par l'entreprise de construction après la pose des portes palières"],
  "průběžná, vedle podest, k jedné podestě nástupní můstek": ["Continuous, next to the landings, with an access bridge to one landing","Durchgehend, neben den Podesten, zu einem Podest mit Zugangsbrücke","Continue, le long des paliers, avec une passerelle vers un palier"],
  "průběžná, vedle schodiště/podest": ["Continuous, next to the staircase / landings","Durchgehend, neben der Treppe / den Podesten","Continue, le long de l'escalier / des paliers"],
  "předsazené před ocelovou konstrukci o cca 30 mm": ["Mounted approx. 30 mm in front of the steel structure","Ca. 30 mm vor die Stahlkonstruktion vorgesetzt","Posé en saillie d'environ 30 mm devant la structure métallique"],
  "předsazený portál": ["Projecting portal","Vorgesetztes Portal","Entrée en saillie"],
  "PŘÍPRAVA PRO KOTVENÍ VÝTAHU": ["PREPARATION FOR LIFT FIXING","VORBEREITUNG FÜR DIE AUFZUGSBEFESTIGUNG","PRÉPARATION POUR LA FIXATION DE L'ASCENSEUR"],
  "přisazena k fasádě (bez opláštění)": ["Attached to the facade (without cladding)","An die Fassade angebaut (ohne Verkleidung)","Accolée à la façade (sans bardage)"],
  "přisazena k fasádě (dle odchylky podest od svislice)": ["Attached to the facade (following the vertical deviation of the landings)","An die Fassade angebaut (entsprechend der Lotabweichung der Podeste)","Accolée à la façade (selon l'écart de verticalité des paliers)"],
  "přisazena k fasádě, v nejvyšším nástupišti přes můstek": ["Attached to the facade, at the topmost landing via an access bridge","An die Fassade angebaut, an der obersten Zugangsstelle über eine Brücke","Accolée à la façade, à l'arrêt le plus haut par une passerelle"],
  "přisazena k podestám, v některých nástupištích přes můstky": ["Attached to the landings, at some floors via access bridges","An die Podeste angebaut, an einigen Zugangsstellen über Brücken","Accolée aux paliers, à certains arrêts par passerelles"],
  "reflexní vrstva pro omezení přehřívání interiéru šachty vlivem slunečního svitu": ["Reflective coating to limit overheating of the shaft interior caused by sunlight","Reflexionsschicht zur Begrenzung der Aufheizung des Schachtinnenraums durch Sonneneinstrahlung","Couche réfléchissante limitant la surchauffe intérieure de la gaine due au soleil"],
  "rovnoměrné rozdělení dle podlaží": ["Even distribution according to the floors","Gleichmäßige Verteilung nach Geschossen","Répartition régulière selon les étages"],
  "ROZMĚR ŠACHTY – VNĚJŠÍ [mm] *": ["SHAFT DIMENSIONS – EXTERNAL [mm] *","SCHACHTABMESSUNGEN – AUSSEN [mm] *","DIMENSIONS DE LA GAINE – EXTÉRIEURES [mm] *"],
  "ROZMĚR ŠACHTY – VNITŘNÍ [mm] *": ["SHAFT DIMENSIONS – INTERNAL [mm] *","SCHACHTABMESSUNGEN – INNEN [mm] *","DIMENSIONS DE LA GAINE – INTÉRIEURES [mm] *"],
  "řeší objednatel": ["Handled by the customer","Wird vom Besteller ausgeführt","Réalisé par le client"],
  "řeší stavba": ["Provided by the building contractor","Wird bauseits ausgeführt","Réalisé par l'entreprise de construction"],
  "s nástupními můstky ve všech nadzemních nástupištích": ["With access bridges at all above-ground landings","Mit Zugangsbrücken an allen oberirdischen Zugangsstellen","Avec passerelles d'accès à tous les arrêts en étage"],
  "sádrovláknité desky": ["Gypsum fibre boards","Gipsfaserplatten","Plaques de fibres-gypse"],
  "standardní čirá skla, Ug=2,6 W/m2.K": ["Standard clear glass, Ug=2.6 W/m2.K","Standard-Klarglas, Ug=2,6 W/m2.K","Verre clair standard, Ug=2,6 W/m2.K"],
  "stávající zděný portál": ["Existing masonry portal","Bestehendes gemauertes Portal","Entrée maçonnée existante"],
  "stejné jako šachta": ["Same as the shaft","Wie der Schacht","Identique à la gaine"],
  "svařovaná": ["Welded","Geschweißt","Soudée"],
  "světlík na jedné straně š. dveří": ["Transom light on one side of the landing door","Oberlicht an einer Seite der Schachttür","Imposte vitrée d'un côté de la porte palière"],
  "světlík na obou stranách š. dveří": ["Transom light on both sides of the landing door","Oberlicht an beiden Seiten der Schachttür","Imposte vitrée des deux côtés de la porte palière"],
  "světlík nade dveřmi a na jedné straně š. dveří": ["Transom light above the door and on one side of the landing door","Oberlicht über der Tür und an einer Seite der Schachttür","Imposte vitrée au-dessus de la porte et d'un côté de la porte palière"],
  "světlík nade dveřmi a na obou stranách š. dveří": ["Transom light above the door and on both sides of the landing door","Oberlicht über der Tür und an beiden Seiten der Schachttür","Imposte vitrée au-dessus de la porte et des deux côtés de la porte palière"],
  "světlík nade dveřmi": ["Transom light above the door","Oberlicht über der Tür","Imposte vitrée au-dessus de la porte"],
  /* N58, N58b (24. 9. 2026): výplň nad dveřmi a vedle nich. NÁVRH PŘEKLADU —
   * čeká na odbornou kontrolu J. V. */
  /* P7 / K13-N59 (25. 9. 2026): můstky. NÁVRH PŘEKLADU — kontrola J. V. */
  /* P6 / K13-N57 (schváleno J. V. 25. 9. 2026): popis záměru a věta o opláštění.
   * NÁVRH PŘEKLADU — kontrola J. V. */
  "Přístavba výtahu v nové ocelové konstrukci výtahové šachty k fasádě objektu.": ["Addition of a lift in a new steel lift shaft structure attached to the building facade.","Anbau eines Aufzugs in einer neuen Stahlkonstruktion des Aufzugsschachts an der Gebäudefassade.","Ajout d'un ascenseur dans une nouvelle structure métallique de gaine accolée à la façade du bâtiment."],
  "Vestavba výtahu v nové ocelové konstrukci výtahové šachty do vnitřního prostoru objektu.": ["Installation of a lift in a new steel lift shaft structure inside the building.","Einbau eines Aufzugs in einer neuen Stahlkonstruktion des Aufzugsschachts im Gebäudeinneren.","Installation d'un ascenseur dans une nouvelle structure métallique de gaine à l'intérieur du bâtiment."],
  "Šachta je průchozí – nástupiště jsou na čelní i zadní straně.": ["The shaft is a through-type shaft – landings are on both the front and the rear side.","Der Schacht ist ein Durchladeschacht – Zugangsstellen befinden sich an der Vorder- und der Rückseite.","La gaine est traversante – les paliers se trouvent en façade avant et arrière."],
  "MŮSTKY MEZI BUDOVOU A OCK": ["BRIDGES BETWEEN THE BUILDING AND THE STEEL STRUCTURE","BRÜCKEN ZWISCHEN GEBÄUDE UND STAHLKONSTRUKTION","PASSERELLES ENTRE LE BÂTIMENT ET LA STRUCTURE MÉTALLIQUE"],
  "přisazena k fasádě, v jednom nástupišti přes můstek": ["Attached to the facade, at one landing via an access bridge","An die Fassade angebaut, an einer Zugangsstelle über eine Brücke","Accolée à la façade, à un palier par une passerelle"],
  "přisazena k podestám, v jednom nástupišti přes můstek": ["Attached to the landings, at one landing via an access bridge","An die Podeste angebaut, an einer Zugangsstelle über eine Brücke","Accolée aux paliers, à un palier par une passerelle"],
  "plechové nadpraží nade dveřmi": ["Sheet-metal panel above the door","Blechpaneel über der Tür","Panneau en tôle au-dessus de la porte"],
  "nadpraží z materiálu opláštění stěny": ["Panel above the door in the wall cladding material","Paneel über der Tür aus dem Verkleidungsmaterial der Wand","Panneau au-dessus de la porte dans le matériau du bardage de la paroi"],
  "nadpraží nade dveřmi zajistí objednatel": ["Panel above the door provided by the client","Paneel über der Tür stellt der Auftraggeber","Panneau au-dessus de la porte fourni par le maître d'ouvrage"],
  "plechová výplň na obou stranách dveří": ["Sheet-metal infill on both sides of the door","Blechfüllung an beiden Seiten der Tür","Remplissage en tôle des deux côtés de la porte"],
  "plechová výplň na jedné straně dveří": ["Sheet-metal infill on one side of the door","Blechfüllung an einer Seite der Tür","Remplissage en tôle d'un côté de la porte"],
  "výplň vedle dveří z materiálu opláštění stěny": ["Infill beside the door in the wall cladding material","Füllung neben der Tür aus dem Verkleidungsmaterial der Wand","Remplissage à côté de la porte dans le matériau du bardage de la paroi"],
  "výplň vedle dveří zajistí objednatel": ["Infill beside the door provided by the client","Füllung neben der Tür stellt der Auftraggeber","Remplissage à côté de la porte fourni par le maître d'ouvrage"],
  "lakovaný ocelový plech": ["Painted steel sheet","Lackiertes Stahlblech","Tôle d'acier laquée"],
  "šestiúhelník": ["Hexagon","Sechseck","Hexagone"],
  "tmelené a broušené styky desek, bílý nátěr aplikovaný na stavbě": ["Filled and sanded board joints, white paint applied on site","Verspachtelte und geschliffene Plattenstöße, weißer Anstrich bauseits","Joints de panneaux enduits et poncés, peinture blanche appliquée sur chantier"],
  "TYP KONSTRUKCE (ENG-M)": ["STRUCTURE TYPE (ENG-M)","KONSTRUKTIONSTYP (ENG-M)","TYPE DE STRUCTURE (ENG-M)"],
  "USAZENÍ OCK – LEVÁ BOČNÍ STĚNA": ["SHAFT STRUCTURE POSITION – LEFT SIDE WALL","POSITIONIERUNG DER SCHACHTKONSTRUKTION – LINKE SEITENWAND","FIXATION DE LA STRUCTURE DE GAINE – PAROI LATÉRALE GAUCHE"],
  "USAZENÍ OCK – PRAVÁ BOČNÍ STĚNA": ["SHAFT STRUCTURE POSITION – RIGHT SIDE WALL","POSITIONIERUNG DER SCHACHTKONSTRUKTION – RECHTE SEITENWAND","FIXATION DE LA STRUCTURE DE GAINE – PAROI LATÉRALE DROITE"],
  "USAZENÍ OCK – ZADNÍ STĚNA": ["SHAFT STRUCTURE POSITION – REAR WALL","POSITIONIERUNG DER SCHACHTKONSTRUKTION – RÜCKWAND","FIXATION DE LA STRUCTURE DE GAINE – PAROI ARRIÈRE"],
  "v exteriéru, přisazena k fasádě přes nástupní můstky + podchozí nosná OCK": ["Outdoor, attached to the facade via access bridges + supporting structure with a walk-through space beneath","Im Außenbereich, über Zugangsbrücken an die Fassade angebaut + Stützkonstruktion mit Durchgang darunter","À l'extérieur, accolée à la façade par des passerelles d'accès + structure porteuse avec passage en dessous"],
  "v exteriéru, přisazena k fasádě přes nástupní můstky": ["Outdoor, attached to the facade via access bridges","Im Außenbereich, über Zugangsbrücken an die Fassade angebaut","À l'extérieur, accolée à la façade par des passerelles d'accès"],
  "v exteriéru, přisazena k fasádě, umístěna na podchozí nosné OCK": ["Outdoor, attached to the facade, placed on a supporting structure with a walk-through space beneath","Im Außenbereich, an die Fassade angebaut, auf einer Stützkonstruktion mit Durchgang darunter","À l'extérieur, accolée à la façade, posée sur une structure porteuse avec passage en dessous"],
  "v exteriéru, přisazena k fasádě": ["Outdoor, attached to the facade","Im Außenbereich, an die Fassade angebaut","À l'extérieur, accolée à la façade"],
  "v exteriéru": ["Outdoor","Im Außenbereich","À l'extérieur"],
  "v horní části OCK výtahové šachty (bezstrojovnový výtah)": ["In the upper part of the lift shaft steel structure (machine-room-less lift)","Im oberen Teil der Aufzugsschacht-Stahlkonstruktion (maschinenraumloser Aufzug)","Dans la partie supérieure de la structure de gaine (ascenseur sans local des machines)"],
  "v interiéru - v ATRIU domu": ["Indoor – in the building ATRIUM","Im Innenbereich – im ATRIUM des Gebäudes","À l'intérieur – dans l'ATRIUM du bâtiment"],
  "v interiéru - v zrcadle schodiště": ["Indoor – in the stairwell void","Im Innenbereich – im Treppenauge","À l'intérieur – dans le jour d'escalier"],
  "v interiéru": ["Indoor","Im Innenbereich","À l'intérieur"],
  "v prohlubni výtahové šachty (bezstrojovnový výtah)": ["In the lift shaft pit (machine-room-less lift)","In der Schachtgrube (maschinenraumloser Aufzug)","Dans la cuvette de la gaine (ascenseur sans local des machines)"],
  "v původní strojovně nad šachtou": ["In the original machine room above the shaft","Im ursprünglichen Maschinenraum über dem Schacht","Dans le local des machines d'origine au-dessus de la gaine"],
  "v samostatné části vedle výtahové šachty": ["In a separate area next to the lift shaft","In einem separaten Bereich neben dem Aufzugsschacht","Dans une zone séparée à côté de la gaine d'ascenseur"],
  "viz příplatky": ["See surcharges","Siehe Aufpreise","Voir suppléments"],
  "vložené mezi ocelové profily konstrukce": ["Inserted between the steel profiles of the structure","Zwischen die Stahlprofile der Konstruktion eingesetzt","Inséré entre les profilés acier de la structure"],
  "VNĚJŠÍ OPLÁŠTĚNÍ ŠACHTY": ["EXTERNAL SHAFT CLADDING","AUSSENVERKLEIDUNG DES SCHACHTS","BARDAGE EXTÉRIEUR DE LA GAINE"],
  "vodorovné zakrytí horního rámu plechem v barvě OCK": ["Horizontal covering of the top frame with sheet metal in the colour of the steel structure","Waagerechte Abdeckung des oberen Rahmens mit Blech in der Farbe der Stahlkonstruktion","Couverture horizontale du cadre supérieur par une tôle dans la teinte de la structure"],
  "vrstvené bezp. sklo ESG (kalené) s vrtanými otvory": ["Toughened safety glass ESG with drilled holes","Einscheibensicherheitsglas ESG (gehärtet) mit gebohrten Löchern","Verre de sécurité trempé ESG avec trous percés"],
  "vrstvené bezpečnostní sklo VSG (v souladu i s ČSN 74 3305)": ["Laminated safety glass VSG (also compliant with ČSN 74 3305)","Verbundsicherheitsglas VSG (auch nach ČSN 74 3305)","Verre feuilleté de sécurité VSG (conforme également à la ČSN 74 3305)"],
  "vrstvené bezpečnostní sklo VSG vsazené do rámečků": ["Laminated safety glass VSG set in frames","Verbundsicherheitsglas VSG in Rahmen eingesetzt","Verre feuilleté de sécurité VSG posé dans des cadres"],
  "vrstvené bezpečnostní sklo VSG": ["Laminated safety glass VSG","Verbundsicherheitsglas VSG","Verre feuilleté de sécurité VSG"],
  "vycentrováno do prostoru zrcadla schodiště": ["Centred in the stairwell void","Im Treppenauge zentriert","Centrée dans le jour d'escalier"],
  "zajistí objednatel v rámci SP": ["Provided by the customer as part of the site preparation","Wird vom Besteller im Rahmen der Bauvorbereitung sichergestellt","À la charge du client dans le cadre de la préparation du chantier"],
  "zajistí objednatel": ["Provided by the customer","Wird vom Besteller sichergestellt","À la charge du client"],
  "zůstane zachováno": ["Will be retained","Bleibt erhalten","Sera conservé"],

  /* ---- ZAK-2: porovnání variant vedle sebe (tiskový pohled) ---- */
  "Porovnání variant": ["Comparison of options","Variantenvergleich","Comparatif des variantes"],
  "řídící varianta": ["governing option","maßgebende Variante","variante de référence"],
  "rozdíl": ["difference","Differenz","écart"],
  "Rozdíl je počítán proti řídící variantě.": ["Differences are calculated against the governing option.","Die Differenzen beziehen sich auf die maßgebende Variante.","Les écarts sont calculés par rapport à la variante de référence."],
  "Ceny jsou v Kč.": ["Prices are in CZK.","Preise in CZK.","Prix en CZK."],
  "Tisk / Uložit jako PDF": ["Print / Save as PDF","Drucken / Als PDF speichern","Imprimer / Enregistrer en PDF"],
  "Základní cena OCK bez DPH": ["Base price of the steel shaft structure excl. VAT","Grundpreis der Aufzugsschachtkonstruktion ohne MwSt.","Prix de base de la structure métallique de gaine HT"],
  "Schválená sleva": ["Approved discount","Genehmigter Rabatt","Remise approuvée"],
  "Sleva v Kč": ["Discount in CZK","Rabatt in CZK","Remise en CZK"],
  "Schválená sleva OCK": ["Approved discount – shaft","Genehmigter Rabatt – Schachtgerüst","Remise approuvée – gaine"],
  "Sleva OCK v Kč": ["Shaft discount in CZK","Rabatt Schachtgerüst in CZK","Remise gaine en CZK"],
  "Základní cena PROJ bez DPH": ["Design works, base price excl. VAT","Planungsleistungen, Grundpreis ohne MwSt.","Prestations d'études, prix de base HT"],
  "Schválená sleva PROJ": ["Approved discount – design works","Genehmigter Rabatt – Planungsleistungen","Remise approuvée – études"],
  "Sleva PROJ v Kč": ["Design works discount in CZK","Rabatt Planungsleistungen in CZK","Remise études en CZK"],
  "Cena OCK po slevě": ["Price of the steel shaft structure after discount","Preis der Aufzugsschachtkonstruktion nach Rabatt","Prix de la structure métallique de gaine après remise"],
  "Náklad OCK": ["Cost of the steel shaft structure","Kosten der Aufzugsschachtkonstruktion","Coût de la structure métallique de gaine"],
  "Marže OCK po slevě": ["Margin on the steel shaft structure after discount","Marge der Aufzugsschachtkonstruktion nach Rabatt","Marge sur la structure métallique de gaine après remise"],
  "Marže OCK po slevě v %": ["Margin on the steel shaft structure after discount in %","Marge der Aufzugsschachtkonstruktion nach Rabatt in %","Marge sur la structure métallique de gaine après remise en %"],
  "Kalkulace PROJ celkem": ["Design works, total","Planungsleistungen gesamt","Prestations d'études, total"],
  "Z toho obchodní zaokrouhlení": ["Of which commercial rounding","Davon kaufmännische Rundung","Dont arrondi commercial"],
  "Cena před slevou": ["Price before discount","Preis vor Rabatt","Prix avant remise"],
  "Sleva": ["Discount","Rabatt","Remise"],
  "Obchodní zaokrouhlení": ["Commercial rounding","Kaufmännische Rundung","Arrondi commercial"],
  "Spočtená cena": ["Calculated price","Berechneter Preis","Prix calculé"],
  "Celkem bez DPH": ["Total excl. VAT","Gesamt ohne MwSt.","Total HT"],
  "Sazba DPH": ["VAT rate","MwSt.-Satz","Taux de TVA"],
  "DPH v Kč": ["VAT in CZK","MwSt. in CZK","TVA en CZK"],
  /* DPH po částech v porovnání variant (audit 1. 8. 2026, N3). Odvozeno
   * ze schválených hesel „Sazba DPH" / „DPH v Kč"; do slovníku (xlsx) zanést
   * při nejbližší synchronizaci. */
  "Sazba DPH OCK": ["VAT rate (shaft steel structure)","MwSt.-Satz (Schachtstahlkonstruktion)","Taux de TVA (structure de la gaine)"],
  "DPH OCK v Kč": ["VAT in CZK (shaft steel structure)","MwSt. in CZK (Schachtstahlkonstruktion)","TVA en CZK (structure de la gaine)"],
  "Sazba DPH PROJ": ["VAT rate (design work)","MwSt.-Satz (Planungsleistungen)","Taux de TVA (études)"],
  "DPH PROJ v Kč": ["VAT in CZK (design work)","MwSt. in CZK (Planungsleistungen)","TVA en CZK (études)"],
  "Celkem s DPH": ["Total incl. VAT","Gesamt inkl. MwSt.","Total TTC"],
  "Příplatky nad rámec základní ceny": ["Optional extras beyond the base price","Aufpreise über den Grundpreis hinaus","Suppléments au-delà du prix de base"],

  /* ---- ZAK-2b: detail konkrétních položek, které se mezi variantami liší ---- */
  "Detail položek": ["Line item detail","Positionsdetail","Détail des postes"],
  "Název": ["Name","Bezeichnung","Désignation"],
  "Stav": ["Status","Status","Statut"],
  "Položka": ["Item","Position","Poste"],
  "Jednotková cena": ["Unit price","Einheitspreis","Prix unitaire"],
  "Cena položky": ["Item price","Positionspreis","Prix du poste"],
  "Náklad položky": ["Item cost","Positionskosten","Coût du poste"],
  "přidáno": ["added","hinzugefügt","ajouté"],
  "odebráno": ["removed","entfernt","supprimé"],
  "změněno": ["changed","geändert","modifié"],
  "beze změny": ["unchanged","unverändert","inchangé"],
  "Hrubá stavba OCK": ["Steel shaft structure – shell","Aufzugsschachtkonstruktion – Rohbau","Structure métallique de gaine – gros œuvre"],
  "Opláštění": ["Cladding","Verkleidung","Habillage"],
  "Volitelné položky": ["Optional items","Optionale Positionen","Postes optionnels"],
  "Režie a přípravné práce": ["Overheads and preparatory works","Gemeinkosten und Vorarbeiten","Frais généraux et travaux préparatoires"],
  "Varianta je položkově shodná s řídící variantou.": ["This option is identical to the governing option at line item level.","Diese Variante ist auf Positionsebene mit der maßgebenden Variante identisch.","Cette variante est identique à la variante de référence au niveau des postes."],
  "Položky beze změny se neuvádějí.": ["Unchanged items are not listed.","Unveränderte Positionen werden nicht aufgeführt.","Les postes inchangés ne sont pas listés."],

  /* ---- SET-3: firemní údaje zhotovitele (Nastavení → Firma, sekce DODAVATEL) ----
   * Pozor: „Vypracoval“ se ZÁMĚRNĚ nedoplňuje – ve slovníku už je heslo
   * „vypracoval“ a vyhledávání je necitlivé na velikost písmen (kolize). */
  "DODAVATEL": ["SUPPLIER","LIEFERANT","FOURNISSEUR"],
  "Název firmy": ["Company name","Firmenname","Raison sociale"],
  "IČO": ["Company ID No.","Ident.-Nr.","N° d'identification"],
  "DIČ": ["VAT No.","USt-IdNr.","N° de TVA"],
  "Zápis v obchodním rejstříku": ["Commercial register entry","Handelsregistereintrag","Inscription au registre du commerce"],
  "Sídlo": ["Registered office","Firmensitz","Siège social"],
  "Korespondenční adresa": ["Mailing address","Postanschrift","Adresse postale"],
  "Bankovní spojení": ["Bank details","Bankverbindung","Coordonnées bancaires"],
  "Telefon": ["Phone","Telefon","Téléphone"],
  "E-mail": ["E-mail","E-Mail","E-mail"],
  "Web": ["Website","Web","Site web"],
  "Česká republika": ["Czech Republic","Tschechische Republik","République tchèque"],

  /* ---- tiskový náhled celé cenové nabídky (N1 – jazykové mutace) ---- */
  "Podklady nabídky": ["Quotation data","Angebotsunterlagen","Données de l'offre"],
  "Přesně tyto hodnoty se vyplní do šablony nabídky. Tlačítkem výše vytisknete do PDF.": ["These exact values are inserted into the quotation template. Use the button above to print to PDF.","Genau diese Werte werden in die Angebotsvorlage übernommen. Mit der Schaltfläche oben drucken Sie als PDF.","Ce sont exactement ces valeurs qui seront insérées dans le modèle d'offre. Le bouton ci-dessus permet d'imprimer en PDF."],
  "HLAVIČKA NABÍDKY": ["QUOTATION HEADER","ANGEBOTSKOPF","EN-TÊTE DE L'OFFRE"],
  "Kontaktní osoba": ["Contact person","Ansprechpartner","Personne de contact"],
  "B. OBCHODNÍ ČÁST – CENOVÁ NABÍDKA": ["B. COMMERCIAL SECTION – PRICE QUOTATION","B. KAUFMÄNNISCHER TEIL – PREISANGEBOT","B. PARTIE COMMERCIALE – OFFRE DE PRIX"],
  "Výtahová šachta (bez DPH)": ["Lift shaft (excl. VAT)","Aufzugsschacht (ohne MwSt.)","Gaine d'ascenseur (hors TVA)"],
  "CELKEM za nabídku (včetně DPH)": ["TOTAL for the quotation (incl. VAT)","GESAMT für das Angebot (inkl. MwSt.)","TOTAL de l'offre (TVA comprise)"],
  "ROZŠÍŘENÍ CENOVÉ NABÍDKY – PŘÍPLATKY": ["QUOTATION EXTENSIONS – SURCHARGES","ERWEITERUNG DES ANGEBOTS – ZUSCHLÄGE","EXTENSIONS DE L'OFFRE – SUPPLÉMENTS"],
  "Tisk specifikace / PDF": ["Print specification / PDF","Spezifikation drucken / PDF","Imprimer la spécification / PDF"],
  "šířka": ["width","Breite","largeur"],
  "hloubka": ["depth","Tiefe","profondeur"],
  "sazba": ["rate","Satz","taux"],

  /* ---- názvy příplatků a volitelných položek v nabídce ---- */
  "Sklo VSG s mléčnou fólií": ["Laminated safety glass with opal film","VSG-Glas mit Milchfolie","Verre feuilleté avec film opalin"],
  "Sklo SKN 176 (Ug=1,1) (EXT)": ["SKN 176 glass (Ug=1.1) (EXT)","Glas SKN 176 (Ug=1,1) (EXT)","Verre SKN 176 (Ug=1,1) (EXT)"],
  "MADLA NA BOČNÍCH STĚNÁCH (dřevo, lak)": ["HANDRAILS ON SIDE WALLS (wood, lacquered)","HANDLÄUFE AN DEN SEITENWÄNDEN (Holz, lackiert)","MAINS COURANTES SUR LES PAROIS LATÉRALES (bois, laqué)"],
  "MADLA NA ZADNÍ STĚNĚ (dřevo, lak)": ["HANDRAILS ON THE REAR WALL (wood, lacquered)","HANDLÄUFE AN DER RÜCKWAND (Holz, lackiert)","MAINS COURANTES SUR LA PAROI ARRIÈRE (bois, laqué)"],
  "PŘÍPLATEK ZA STŘECHU V MĚDI (EXT)": ["SURCHARGE FOR COPPER ROOF (EXT)","ZUSCHLAG FÜR KUPFERDACH (EXT)","SUPPLÉMENT POUR TOITURE EN CUIVRE (EXT)"],
  "VENTILÁTOR (EXT)": ["FAN (EXT)","VENTILATOR (EXT)","VENTILATEUR (EXT)"],
  "MONTÁŽ ŠACHETNÍCH DVEŘÍ": ["LANDING DOOR INSTALLATION","MONTAGE DER SCHACHTTÜREN","MONTAGE DES PORTES PALIÈRES"],
  "LEŠENÍ - dokončení hlavy šachty": ["SCAFFOLDING – shaft head completion","GERÜST – Fertigstellung des Schachtkopfes","ÉCHAFAUDAGE – finition de la tête de gaine"],
  "LEŠENÍ - vnější": ["SCAFFOLDING – external","GERÜST – außen","ÉCHAFAUDAGE – extérieur"],
  /* PŘÍPLATKY BEZ PŘEKLADU (#335, nález K10-N38 z 10. kola, 24. 9. 2026).
   * V cizojazyčné nabídce se tiskly česky — „LEŠENÍ - vnitřní" stálo vedle
   * „SCAFFOLDING – external". Názvy drží terminologii sousedních hesel
   * (SILL EXTENSION PLATES, SCAFFOLDING – …, METAL SHEET COVER ON PIT EDGE).
   * Úplnost hlídá test_preklad_priplatky.js nad názvy přímo z engine.js. */
  "PŘECHODOVÉ PLECHY - NEREZ (MATERIÁL)": ["SILL EXTENSION PLATES - STAINLESS STEEL (MATERIAL)","SCHWELLENVERLÄNGERUNGSPLATTEN - EDELSTAHL (MATERIAL)","TÔLES DE PROLONGEMENT DE SEUIL - INOX (MATÉRIAU)"],
  "PŘECHODOVÉ PLECHY - NEREZ (MONTÁŽ)": ["SILL EXTENSION PLATES - STAINLESS STEEL (INSTALLATION)","SCHWELLENVERLÄNGERUNGSPLATTEN - EDELSTAHL (MONTAGE)","TÔLES DE PROLONGEMENT DE SEUIL - INOX (MONTAGE)"],
  "ZÁBRANY PROTI PÁDU DO ŠACHTY": ["FALL PROTECTION BARRIERS AT THE SHAFT","ABSTURZSICHERUNGEN AM SCHACHT","BARRIÈRES ANTICHUTE AUTOUR DE LA GAINE"],
  "DEMONTÁŽ STÁVAJÍCÍHO OHRAZENÍ": ["DISMANTLING OF THE EXISTING SHAFT ENCLOSURE","DEMONTAGE DER BESTEHENDEN SCHACHTUMWEHRUNG","DÉMONTAGE DE L’ENCEINTE DE GAINE EXISTANTE"],
  "MALBA SCHODNIC": ["PAINTING OF STAIR STRINGERS","ANSTRICH DER TREPPENWANGEN","PEINTURE DES LIMONS D’ESCALIER"],
  "NÁTĚR CELÉHO OHRAZENÍ": ["COATING OF THE ENTIRE SHAFT ENCLOSURE","ANSTRICH DER GESAMTEN SCHACHTUMWEHRUNG","PEINTURE DE TOUTE L’ENCEINTE DE GAINE"],
  "NÁTĚR POUZE OKOPOVÝCH PLECHŮ": ["COATING OF KICK PLATES ONLY","ANSTRICH NUR DER TRITTSCHUTZBLECHE","PEINTURE DES PLINTHES DE PROTECTION UNIQUEMENT"],
  "PROSKLENÁ STĚNA VEDLE ŠACHTY": ["GLAZED WALL NEXT TO THE SHAFT","VERGLASTE WAND NEBEN DEM SCHACHT","PAROI VITRÉE À CÔTÉ DE LA GAINE"],
  "DEŠŤOVÝ SVOD": ["RAINWATER DOWNPIPE","REGENFALLROHR","DESCENTE D’EAUX PLUVIALES"],
  "LEŠENÍ - vnitřní": ["SCAFFOLDING – internal","GERÜST – innen","ÉCHAFAUDAGE – intérieur"],
  "ÚPRAVY/NAPOJENÍ ZÁBRADLÍ (INT)": ["HANDRAIL ADJUSTMENTS/CONNECTION (INT)","ANPASSUNG/ANSCHLUSS DES HANDLAUFS (INT)","ADAPTATION/RACCORDEMENT DU GARDE-CORPS (INT)"],
  "HÁKY NA MYTÍ ŠACHTY (EXT)": ["SHAFT CLEANING HOOKS (EXT)","HAKEN FÜR DIE SCHACHTREINIGUNG (EXT)","CROCHETS POUR LE NETTOYAGE DE LA GAINE (EXT)"],
  "OPLECHOVÁNÍ SOKLU PROHLUBNĚ (EXT)": ["METAL SHEET COVER ON PIT EDGE (EXT)","BLECHABDECKUNG AM GRUBENRAND (EXT)","COUVERTINE EN TÔLE SUR LE BORD DE LA FOSSE (EXT)"],
  /* PEVNÉ TEXTY ŠABLONY NABÍDKY OCK v10/v11 (#334, nález K10-N36 z 10. kola).
   * Mutace EN/DE vyrobená z šablony překladačem (Nastavení → Šablony) je
   * nechávala česky — v nabídce 0664 to bylo 31 řádků ze 184. Adresu, IČ
   * a web firmy slovník schválně nemá: ty se nepřekládají (prekladNeutral). */
  "Kancelář:": ["Office:","Büro:","Bureau :"],
  "A. TECHNICKÁ ČÁST NABÍDKY:": ["A. TECHNICAL PART OF THE QUOTATION:","A. TECHNISCHER TEIL DES ANGEBOTS:","A. PARTIE TECHNIQUE DE L’OFFRE :"],
  "B. OBCHODNÍ ČÁST NABÍDKY:": ["B. COMMERCIAL PART OF THE QUOTATION:","B. KAUFMÄNNISCHER TEIL DES ANGEBOTS:","B. PARTIE COMMERCIALE DE L’OFFRE :"],
  "I. TECHNICKÁ SPECIFIKACE VÝTAHOVÉ ŠACHTY": ["I. TECHNICAL SPECIFICATION OF THE ELEVATOR SHAFT","I. TECHNISCHE SPEZIFIKATION DES AUFZUGSSCHACHTS","I. SPÉCIFICATION TECHNIQUE DE LA GAINE D’ASCENSEUR"],
  "I. CENOVÁ NABÍDKA:": ["I. PRICE QUOTATION:","I. PREISANGEBOT:","I. OFFRE DE PRIX :"],
  "II. ROZŠÍŘENÍ CENOVÉ NABÍDKY – Příplatky:": ["II. QUOTATION EXTENSIONS – Surcharges:","II. ERWEITERUNG DES ANGEBOTS – Zuschläge:","II. EXTENSIONS DE L’OFFRE – Suppléments :"],
  "Pohled na objekt z ulice:": ["View of the building from the street:","Ansicht des Gebäudes von der Straße:","Vue du bâtiment depuis la rue :"],
  "Přístavba výtahu do nové prosklené ocelové konstrukce výtahové šachty ke dvorní fasádě bytového domu na výše uvedené adrese.": ["Addition of an elevator in a new glazed steel elevator shaft structure at the courtyard facade of the residential building at the above address.","Anbau eines Aufzugs in eine neue verglaste Stahlkonstruktion des Aufzugsschachts an der Hoffassade des Wohnhauses unter der oben genannten Adresse.","Ajout d’un ascenseur dans une nouvelle structure métallique vitrée de gaine d’ascenseur sur la façade côté cour de l’immeuble d’habitation à l’adresse susmentionnée."],
  /* Šablona nabídky OCK v12 (25. 9. 2026, P6): věta bez materiálu opláštění —
   * ten doplňuje {{OPLASTENI_VETA}} v samostatném odstavci. Překlad z hesla v11. */
  "Naše nabídka obsahuje výrobu, dodání a stavbu MONTOVANÉ ocelové konstrukce výtahové šachty včetně jejího opláštění. Specifikace provedení nabízené šachty je v technické části této nabídky.": ["Our quotation includes the manufacture, delivery and erection of a PREFABRICATED steel elevator shaft structure, including its cladding. The specification of the offered shaft is given in the technical part of this quotation.","Unser Angebot umfasst Herstellung, Lieferung und Montage einer MONTIERTEN Stahlkonstruktion des Aufzugsschachts einschließlich ihrer Verkleidung. Die Ausführungsspezifikation des angebotenen Schachts befindet sich im technischen Teil dieses Angebots.","Notre offre comprend la fabrication, la livraison et le montage d’une structure métallique PRÉFABRIQUÉE de gaine d’ascenseur, y compris son habillage. La spécification de la gaine proposée figure dans la partie technique de la présente offre."],
  "Naše nabídka obsahuje výrobu, dodání a stavbu MONTOVANÉ ocelové konstrukce výtahové šachty, včetně jejího opláštění izolačním dvojsklem v kombinaci s čirým vrstveným bezpečnostním sklem VSG. Specifikace provedení nabízené šachty je v technické části této nabídky.": ["Our quotation includes the manufacture, delivery and erection of a PREFABRICATED steel elevator shaft structure, including its cladding with insulating double glazing combined with clear laminated safety glass (VSG). The specification of the offered shaft is given in the technical part of this quotation.","Unser Angebot umfasst Herstellung, Lieferung und Montage einer MONTIERTEN Stahlkonstruktion des Aufzugsschachts einschließlich ihrer Verkleidung mit Isolierverglasung in Kombination mit klarem Verbundsicherheitsglas (VSG). Die Ausführungsspezifikation des angebotenen Schachts befindet sich im technischen Teil dieses Angebots.","Notre offre comprend la fabrication, la livraison et le montage d’une structure métallique PRÉFABRIQUÉE de gaine d’ascenseur, y compris son habillage en double vitrage isolant combiné à du verre feuilleté de sécurité clair (VSG). La spécification de la gaine proposée figure dans la partie technique de la présente offre."],
  "Nabídka se skládá z Technické a Obchodní části. Objednatelem odsouhlasená Technická část bude použita jako příloha smlouvy o dílo nebo závazné objednávky.": ["The quotation consists of a Technical and a Commercial part. The Technical part approved by the client will be used as an annex to the contract for work or to the binding order.","Das Angebot besteht aus einem technischen und einem kaufmännischen Teil. Der vom Auftraggeber genehmigte technische Teil wird als Anlage zum Werkvertrag oder zur verbindlichen Bestellung verwendet.","L’offre se compose d’une partie technique et d’une partie commerciale. La partie technique approuvée par le maître d’ouvrage servira d’annexe au contrat d’entreprise ou à la commande ferme."],
  "rozsah dodávky dle Technické části nabídky - A. TECHNICKÁ SPECIFIKACE VÝTAHOVÉ ŠACHTY": ["scope of supply according to the Technical part of the quotation - A. TECHNICAL SPECIFICATION OF THE ELEVATOR SHAFT","Lieferumfang gemäß technischem Teil des Angebots - A. TECHNISCHE SPEZIFIKATION DES AUFZUGSSCHACHTS","étendue de la fourniture selon la partie technique de l’offre - A. SPÉCIFICATION TECHNIQUE DE LA GAINE D’ASCENSEUR"],
  "CELKEM za nabídku": ["TOTAL for the quotation","GESAMT für das Angebot","TOTAL de l’offre"],
  "Poznámky k cenové nabídce: a. cena vychází z technické specifikace nabídky – viz výše": ["Notes on the price quotation: a. the price is based on the technical specification of the quotation – see above","Hinweise zum Preisangebot: a. Der Preis basiert auf der technischen Spezifikation des Angebots – siehe oben","Remarques sur l’offre de prix : a. le prix est basé sur la spécification technique de l’offre – voir ci-dessus"],
  "b. DPH bude účtováno dle aktuálně platných daňových předpisů": ["b. VAT will be charged in accordance with the tax regulations in force","b. Die MwSt. wird nach den jeweils geltenden Steuervorschriften berechnet","b. la TVA sera facturée conformément à la réglementation fiscale en vigueur"],
  "c. k úpravě celkové ceny může dojít po přesném zaměření a vyhodnocení statiky": ["c. the total price may be adjusted after a precise site survey and evaluation of the structural analysis","c. Der Gesamtpreis kann nach genauem Aufmaß und Auswertung der Statik angepasst werden","c. le prix total peut être ajusté après un relevé précis et l’évaluation de l’étude statique"],
  "Cena díla je splatná v následujících dílčích splátkách:": ["The price of the work is payable in the following instalments:","Der Werkpreis ist in folgenden Teilzahlungen fällig:","Le prix de l’ouvrage est payable selon les acomptes suivants :"],
  "Po ukončení všech výše uvedených prací a po řádném předání a převzetí celého díla předávacím protokolem bude vystaven konečný daňový doklad na zbývající část celkové ceny díla s vyúčtováním DPH v zákonné výši.": ["After completion of all the above work and proper handover and acceptance of the entire work by a handover report, a final tax invoice will be issued for the remaining part of the total price of the work, with VAT charged at the statutory rate.","Nach Abschluss aller oben genannten Arbeiten und ordnungsgemäßer Übergabe und Abnahme des gesamten Werks mit Übergabeprotokoll wird eine Schlussrechnung über den verbleibenden Teil des Gesamtpreises mit Abrechnung der MwSt. in gesetzlicher Höhe ausgestellt.","Après l’achèvement de tous les travaux susmentionnés et la réception en bonne et due forme de l’ensemble de l’ouvrage par procès-verbal, une facture finale sera émise pour le solde du prix total de l’ouvrage, avec la TVA au taux légal."],
  "Poznámky k platebním podmínkám: v případě podepsané rámcové nebo subdodavatelské smlouvy, platí dohodnuté podmínky z těchto smluv. Bude-li potřeba upravit tyto standardní platební podmínky, jsme připraveni k jejich projednání na úrovni vedení společnosti.": ["Notes on payment terms: if a framework or subcontract agreement has been signed, the terms agreed in that agreement apply. Should these standard payment terms need to be adjusted, we are prepared to discuss them at management level.","Hinweise zu den Zahlungsbedingungen: Bei einem unterzeichneten Rahmen- oder Nachunternehmervertrag gelten die darin vereinbarten Bedingungen. Sollten diese Standard-Zahlungsbedingungen angepasst werden müssen, sind wir bereit, dies auf Ebene der Geschäftsleitung zu besprechen.","Remarques sur les conditions de paiement : en cas de contrat-cadre ou de contrat de sous-traitance signé, les conditions convenues dans ce contrat s’appliquent. Si ces conditions de paiement standard doivent être adaptées, nous sommes prêts à en discuter au niveau de la direction."],
  "Splatnost faktur a platnost nabídky:": ["Invoice due dates and validity of the quotation:","Zahlungsziel der Rechnungen und Gültigkeit des Angebots:","Échéance des factures et validité de l’offre :"],
  "Zahájení montáže cca 12 týdnů po podpisu SoD a předání finálních dispozičních výkresů celé technologie výtahu včetně silových účinků technologie výtahu na šachtu.": ["Installation will start approx. 12 weeks after the contract is signed and the final layout drawings of the entire elevator equipment, including the loads of the elevator equipment on the shaft, are handed over.","Die Montage beginnt ca. 12 Wochen nach Vertragsunterzeichnung und Übergabe der endgültigen Grundrisszeichnungen der gesamten Aufzugstechnik einschließlich der Lasten der Aufzugstechnik auf den Schacht.","Le montage commencera env. 12 semaines après la signature du contrat et la remise des plans d’implantation définitifs de l’ensemble de l’ascenseur, y compris les efforts de l’ascenseur sur la gaine."],
  "Montáž ocelové konstrukce výtahové šachty cca 2-3 týdny.": ["Installation of the steel shaft structure takes approx. 2–3 weeks.","Die Montage der Stahlschachtkonstruktion dauert ca. 2–3 Wochen.","Le montage de la structure métallique de la gaine dure env. 2 à 3 semaines."],
  "Následné opláštění konstrukce šachty cca 2 týdny.": ["Subsequent cladding of the shaft structure takes approx. 2 weeks.","Die anschließende Verkleidung der Schachtkonstruktion dauert ca. 2 Wochen.","L’habillage de la structure de la gaine dure ensuite env. 2 semaines."],
  "Dokončovací práce do cca 3 týdnů po ukončení montáže technologie výtahu – všech šachetních dveří.": ["Finishing work will be done within approx. 3 weeks after installation of the elevator equipment – all landing doors – is completed.","Die abschließenden Arbeiten werden innerhalb von ca. 3 Wochen nach Abschluss der Montage der Aufzugstechnik – aller Schachttüren – durchgeführt.","Les travaux de finition seront réalisés dans un délai d’env. 3 semaines après l’achèvement du montage de l’ascenseur – de toutes les portes palières."],
  "Předávací protokol z bodů 1. a 2. lze nahradit oboustranně podepsaným zápisem do montážního deníku.": ["The handover reports under items 1 and 2 may be replaced by an entry in the installation log signed by both parties.","Die Übergabeprotokolle zu den Punkten 1 und 2 können durch einen von beiden Seiten unterzeichneten Eintrag im Montagetagebuch ersetzt werden.","Les procès-verbaux de réception des points 1 et 2 peuvent être remplacés par une mention dans le journal de montage signée par les deux parties."],

  /* ---- TS-1: kontrola vyplnění technické specifikace (jen upozornění) ---- */
  "Kontrola vyplnění": ["Completeness check","Vollständigkeitsprüfung","Contrôle de complétude"],
  "Všechna povinná pole jsou vyplněna.": ["All mandatory fields are filled in.","Alle Pflichtfelder sind ausgefüllt.","Tous les champs obligatoires sont remplis."],
  "Nevyplněná povinná pole": ["Unfilled mandatory fields","Nicht ausgefüllte Pflichtfelder","Champs obligatoires non remplis"],
  "Upozornění nic neblokuje – dokument lze vytisknout i takto.": ["This is a warning only – the document can still be printed.","Dies ist nur ein Hinweis – das Dokument kann trotzdem gedruckt werden.","Il s'agit d'un simple avertissement – le document peut être imprimé tel quel."],
  "nevyplněno": ["not filled in","nicht ausgefüllt","non rempli"],
  "HLAVIČKA DOKUMENTU": ["DOCUMENT HEADER","DOKUMENTKOPF","EN-TÊTE DU DOCUMENT"],

  /* ---- B1: cenová nabídka PROJ (OVP-CN) podle VZORu ENGINEERS CZ ----
   * Přeloženy jsou NADPISY oddílů, cenové popisky a krátké obchodní výrazy.
   * Souvislá právní a technická próza (odstavce, poznámky) zůstává záměrně
   * česky – viz { cz: … } v nabidka_proj.js. Podrobné popisy rozsahu činností
   * zatím přeložené nejsou; objeví se v exportu chybějících hesel jako
   * podklad pro překladatele (nic se nevymýšlí). */
  "CENOVÁ NABÍDKA": ["PRICE QUOTATION","PREISANGEBOT","OFFRE DE PRIX"],
  "Popis záměru": ["Project description","Beschreibung des Vorhabens","Description du projet"],
  "Popis záměru zatím není vyplněn – doplňte jej v kartě Zakázka.": ["The project description has not been filled in yet – add it in the Order tab.","Die Beschreibung des Vorhabens ist noch nicht ausgefüllt – ergänzen Sie sie im Reiter Auftrag.","La description du projet n'est pas encore renseignée – complétez-la dans l'onglet Affaire."],
  "Naše NABÍDKA a doporučení": ["Our OFFER and recommendation","Unser ANGEBOT und unsere Empfehlung","Notre OFFRE et nos recommandations"],
  "ROZSAH NABÍDKY": ["SCOPE OF THE OFFER","LEISTUNGSUMFANG DES ANGEBOTS","ÉTENDUE DE L'OFFRE"],
  "ROZŠÍŘENÁ NABÍDKA": ["EXTENDED OFFER","ERWEITERTES ANGEBOT","OFFRE ÉTENDUE"],
  "ZAMĚŘENÍ A ZPRACOVÁNÍ VÝSTUPŮ (ZA)": ["SURVEY AND PROCESSING OF OUTPUTS (ZA)","AUFMASS UND AUSWERTUNG (ZA)","RELEVÉ ET TRAITEMENT DES LIVRABLES (ZA)"],
  "CENA ZA ZAMĚŘENÍ A ZPRACOVÁNÍ VÝSTUPŮ": ["PRICE FOR THE SURVEY AND PROCESSING OF OUTPUTS","PREIS FÜR AUFMASS UND AUSWERTUNG","PRIX DU RELEVÉ ET DU TRAITEMENT DES LIVRABLES"],
  "STUDIE PROVEDITELNOSTI (ST)": ["FEASIBILITY STUDY (ST)","MACHBARKEITSSTUDIE (ST)","ÉTUDE DE FAISABILITÉ (ST)"],
  "CENA ZA STUDII PROVEDITELNOSTI – část 1": ["PRICE FOR THE FEASIBILITY STUDY – part 1","PREIS FÜR DIE MACHBARKEITSSTUDIE – Teil 1","PRIX DE L'ÉTUDE DE FAISABILITÉ – partie 1"],
  "CENA ZA STUDII PROVEDITELNOSTI – část 2": ["PRICE FOR THE FEASIBILITY STUDY – part 2","PREIS FÜR DIE MACHBARKEITSSTUDIE – Teil 2","PRIX DE L'ÉTUDE DE FAISABILITÉ – partie 2"],
  "CENA ZA STUDII PROVEDITELNOSTI – část 3": ["PRICE FOR THE FEASIBILITY STUDY – part 3","PREIS FÜR DIE MACHBARKEITSSTUDIE – Teil 3","PRIX DE L'ÉTUDE DE FAISABILITÉ – partie 3"],
  "STUDIE PROVEDITELNOSTI – variantní řešení": ["FEASIBILITY STUDY – alternative solutions","MACHBARKEITSSTUDIE – Variantenlösung","ÉTUDE DE FAISABILITÉ – solutions variantes"],
  "ZAMĚŘENÍ a zpracování výstupů": ["SURVEY and processing of outputs","AUFMASS und Auswertung","RELEVÉ et traitement des livrables"],
  "Vypracování STUDIE PROVEDITELNOSTI": ["Preparation of the FEASIBILITY STUDY","Erstellung der MACHBARKEITSSTUDIE","Élaboration de l'ÉTUDE DE FAISABILITÉ"],
  "DOKUMENTACE PRO POVOLENÍ ZÁMĚRU (DPZ)": ["DOCUMENTATION FOR THE PROJECT PERMIT (DPZ)","UNTERLAGEN FÜR DIE VORHABENGENEHMIGUNG (DPZ)","DOSSIER DE DEMANDE D'AUTORISATION (DPZ)"],
  "CENA ZA DOKUMENTACI PRO POVOLENÍ ZÁMĚRU (DPZ)": ["PRICE FOR THE DOCUMENTATION FOR THE PROJECT PERMIT (DPZ)","PREIS FÜR DIE UNTERLAGEN ZUR VORHABENGENEHMIGUNG (DPZ)","PRIX DU DOSSIER DE DEMANDE D'AUTORISATION (DPZ)"],
  "INŽENÝRSKÁ ČINNOST (IČ)": ["ENGINEERING SERVICES (IČ)","INGENIEURLEISTUNGEN (IČ)","ASSISTANCE ADMINISTRATIVE (IČ)"],
  "CENA ZA INŽENÝRSKOU ČINNOST (IČ)": ["PRICE FOR THE ENGINEERING SERVICES (IČ)","PREIS FÜR DIE INGENIEURLEISTUNGEN (IČ)","PRIX DE L'ASSISTANCE ADMINISTRATIVE (IČ)"],
  "Vyřízení POVOLENÍ ZÁMĚRU": ["Obtaining the PROJECT PERMIT","Erwirkung der VORHABENGENEHMIGUNG","Obtention de l'AUTORISATION DU PROJET"],
  "DOKUMENTACE PRO PROVEDENÍ STAVBY (DPS)": ["DETAILED DESIGN DOCUMENTATION (DPS)","AUSFÜHRUNGSPLANUNG (DPS)","DOSSIER D'EXÉCUTION (DPS)"],
  "CENA ZA DOKUMENTACI PRO PROVEDENÍ STAVBY (DPS)": ["PRICE FOR THE DETAILED DESIGN DOCUMENTATION (DPS)","PREIS FÜR DIE AUSFÜHRUNGSPLANUNG (DPS)","PRIX DU DOSSIER D'EXÉCUTION (DPS)"],
  "EKONOMICKÁ ZADÁVACÍ ČÁST (EZC)": ["TENDER COST DOCUMENTS (EZC)","WIRTSCHAFTLICHER AUSSCHREIBUNGSTEIL (EZC)","PIÈCES ÉCONOMIQUES DE CONSULTATION (EZC)"],
  "CENA ZA EKONOMICKOU ZADÁVACÍ ČÁST (EZC)": ["PRICE FOR THE TENDER COST DOCUMENTS (EZC)","PREIS FÜR DEN WIRTSCHAFTLICHEN AUSSCHREIBUNGSTEIL (EZC)","PRIX DES PIÈCES ÉCONOMIQUES DE CONSULTATION (EZC)"],
  "Ekonomická zadávací část (rozpočet a výkaz výměr)": ["Tender cost documents (budget and bill of quantities)","Wirtschaftlicher Ausschreibungsteil (Kostenermittlung und Leistungsverzeichnis)","Pièces économiques de consultation (budget et métré)"],
  "ZAJIŠTĚNÍ KOLAUDAČNÍHO ŘÍZENÍ": ["ARRANGING THE FINAL BUILDING APPROVAL","ABWICKLUNG DER BAUABNAHME","ORGANISATION DE LA RÉCEPTION DES TRAVAUX"],
  "CENA ZA ZAJIŠTĚNÍ KOLAUDAČNÍHO ŘÍZENÍ": ["PRICE FOR ARRANGING THE FINAL BUILDING APPROVAL","PREIS FÜR DIE ABWICKLUNG DER BAUABNAHME","PRIX DE L'ORGANISATION DE LA RÉCEPTION DES TRAVAUX"],
  "KOLAUDAČNÍ ŘÍZENÍ": ["Final building approval procedure","Bauabnahmeverfahren","Procédure de réception des travaux"],
  "GEODETICKÉ ZAMĚŘENÍ": ["LAND SURVEY","GEODÄTISCHE VERMESSUNG","RELEVÉ GÉOMÈTRE"],
  "CENA ZA GEODETICKÉ ZAMĚŘENÍ": ["PRICE FOR THE LAND SURVEY","PREIS FÜR DIE GEODÄTISCHE VERMESSUNG","PRIX DU RELEVÉ GÉOMÈTRE"],
  "Geodetické zaměření a geometrický plán": ["Land survey and cadastral plan","Geodätische Vermessung und Lageplan","Relevé géomètre et plan de bornage"],
  "AUTORSKÝ DOZOR (AD)": ["DESIGNER'S SITE SUPERVISION (AD)","PLANERISCHE OBJEKTÜBERWACHUNG (AD)","SUIVI ARCHITECTURAL (AD)"],
  "MĚSÍČNÍ SAZBA ZA AUTORSKÝ DOZOR (AD)": ["MONTHLY RATE FOR THE DESIGNER'S SITE SUPERVISION (AD)","MONATSSATZ FÜR DIE PLANERISCHE OBJEKTÜBERWACHUNG (AD)","TARIF MENSUEL DU SUIVI ARCHITECTURAL (AD)"],
  "CENA NEZAHRNUJE": ["THE PRICE DOES NOT INCLUDE","IM PREIS NICHT ENTHALTEN","LE PRIX NE COMPREND PAS"],
  "POŽADOVÁNO OD INVESTORA": ["REQUIRED FROM THE CLIENT","VOM BAUHERRN BENÖTIGT","REQUIS DE LA PART DU MAÎTRE D'OUVRAGE"],
  "DPH, SPLATNOST FAKTUR A PLATNOST NABÍDKY": ["VAT, PAYMENT TERMS AND VALIDITY OF THE OFFER","MWST., ZAHLUNGSZIEL UND GÜLTIGKEIT DES ANGEBOTS","TVA, DÉLAI DE PAIEMENT ET VALIDITÉ DE L'OFFRE"],
  "Současně platná sazba DPH": ["Currently applicable VAT rate","Derzeit gültiger MwSt.-Satz","Taux de TVA en vigueur"],
  "Splatnost faktur": ["Invoice due date","Zahlungsziel der Rechnungen","Échéance des factures"],
  "Platnost nabídky": ["Validity of the offer","Gültigkeit des Angebots","Validité de l'offre"],
  "Termín dodání": ["Delivery time","Lieferzeit","Délai de livraison"],
  "PLATEBNÍ PODMÍNKY ZAMĚŘENÍ": ["PAYMENT TERMS – SURVEY","ZAHLUNGSBEDINGUNGEN – AUFMASS","CONDITIONS DE PAIEMENT – RELEVÉ"],
  "PLATEBNÍ PODMÍNKY STUDIE PROVEDITELNOSTI (SP)": ["PAYMENT TERMS – FEASIBILITY STUDY (SP)","ZAHLUNGSBEDINGUNGEN – MACHBARKEITSSTUDIE (SP)","CONDITIONS DE PAIEMENT – ÉTUDE DE FAISABILITÉ (SP)"],
  "PLATEBNÍ PODMÍNKY DPZ": ["PAYMENT TERMS – DPZ","ZAHLUNGSBEDINGUNGEN – DPZ","CONDITIONS DE PAIEMENT – DPZ"],
  "PLATEBNÍ PODMÍNKY INŽENÝRSKÉ ČINNOSTI (IČ)": ["PAYMENT TERMS – ENGINEERING SERVICES (IČ)","ZAHLUNGSBEDINGUNGEN – INGENIEURLEISTUNGEN (IČ)","CONDITIONS DE PAIEMENT – ASSISTANCE ADMINISTRATIVE (IČ)"],
  "PLATEBNÍ PODMÍNKY DPS A EZC": ["PAYMENT TERMS – DPS AND EZC","ZAHLUNGSBEDINGUNGEN – DPS UND EZC","CONDITIONS DE PAIEMENT – DPS ET EZC"],
  "PLATEBNÍ PODMÍNKY PRO ZAJIŠTĚNÍ KOLAUDAČNÍHO ŘÍZENÍ": ["PAYMENT TERMS – FINAL BUILDING APPROVAL","ZAHLUNGSBEDINGUNGEN – BAUABNAHME","CONDITIONS DE PAIEMENT – RÉCEPTION DES TRAVAUX"],
  "PLATEBNÍ PODMÍNKY AUTORSKÉHO DOZORU": ["PAYMENT TERMS – DESIGNER'S SITE SUPERVISION","ZAHLUNGSBEDINGUNGEN – PLANERISCHE OBJEKTÜBERWACHUNG","CONDITIONS DE PAIEMENT – SUIVI ARCHITECTURAL"],
  "TERMÍNY": ["SCHEDULE","TERMINE","DÉLAIS"],
  "REKAPITULACE CENOVÉ NABÍDKY": ["SUMMARY OF THE PRICE QUOTATION","ZUSAMMENFASSUNG DES PREISANGEBOTS","RÉCAPITULATIF DE L'OFFRE DE PRIX"],
  /* "CELKEM bez DPH" / "CELKEM s DPH" se NEpřidávají – normalizace klíčů
   * (prekladNorm) je case-insensitive, takže se použijí již existující hesla
   * "Celkem bez DPH" / "Celkem s DPH" výše. Duplicitní zápis by byl kolize. */
  "není součástí této nabídky": ["not included in this offer","nicht Bestandteil dieses Angebots","non compris dans la présente offre"],
  "1 varianta": ["1 alternative","1 Variante","1 variante"],
  "měsíc": ["month","Monat","mois"],
  "měsíce": ["months","Monate","mois"],
  "dní": ["days","Tage","jours"],
  /* názvy sekcí Kalkulace PROJ (rekapitulace nabídky) */
  "ZAMĚŘENÍ": ["SURVEY","AUFMASS","RELEVÉ"],
  "ST – STUDIE": ["ST – FEASIBILITY STUDY","ST – STUDIE","ST – ÉTUDE"],
  "PROJEDNÁNÍ STUDIE": ["APPROVAL OF THE STUDY","ABSTIMMUNG DER STUDIE","INSTRUCTION DE L'ÉTUDE"],
  "DPZ – DOKUMENTACE PRO POVOLENÍ ZÁMĚRU": ["DPZ – DOCUMENTATION FOR THE PROJECT PERMIT","DPZ – UNTERLAGEN FÜR DIE VORHABENGENEHMIGUNG","DPZ – DOSSIER DE DEMANDE D'AUTORISATION"],
  "IČ – INŽENÝRSKÁ ČINNOST": ["IČ – ENGINEERING SERVICES","IČ – INGENIEURLEISTUNGEN","IČ – ASSISTANCE ADMINISTRATIVE"],
  "DPS – DOKUMENTACE PRO PROVEDENÍ STAVBY": ["DPS – DETAILED DESIGN DOCUMENTATION","DPS – AUSFÜHRUNGSPLANUNG","DPS – DOSSIER D'EXÉCUTION"],
  /* popisy u cenových řádků (krátké obchodní věty – překládají se) */
  /* PŘIBYLO 15. 9. 2026 (nález B) – nový řetězec, žádný stávající překlad se
   * nemění. Stojí místo částky u „části 1" studie, aby se tatáž cena
   * netiskla v nabídce dvakrát. */
  "viz CENA ZA ZAMĚŘENÍ A ZPRACOVÁNÍ VÝSTUPŮ výše": ["see PRICE FOR SURVEY AND PROCESSING OF OUTPUTS above","siehe PREIS FÜR AUFMASS UND AUSWERTUNG DER ERGEBNISSE oben","voir PRIX DU RELEVÉ ET DU TRAITEMENT DES RÉSULTATS ci-dessus"],
  "Cena ZAMĚŘENÍ zamýšleného prostoru pro umístění výtahu, stavebně technický průzkum a zpracování výstupů.": ["Price for the SURVEY of the space intended for the lift, the building-technical inspection and processing of its outputs.","Preis für das AUFMASS des für den Aufzug vorgesehenen Raums, die bautechnische Untersuchung und die Auswertung der Ergebnisse.","Prix du RELEVÉ de l'espace destiné à l'ascenseur, de l'étude technique du bâtiment et du traitement des résultats."],
  "Projednání STUDIE PROVEDITELNOSTI na odboru památkové péče HMP": ["Approval of the FEASIBILITY STUDY at the Prague heritage preservation department","Abstimmung der MACHBARKEITSSTUDIE beim Denkmalschutzamt der Hauptstadt Prag","Instruction de l'ÉTUDE DE FAISABILITÉ auprès du service du patrimoine de la Ville de Prague"],
  "Vypracování každé jedné další varianty řešení požadované Odborem památkové péče": ["Preparation of each further design alternative required by the heritage preservation department","Ausarbeitung jeder weiteren vom Denkmalschutzamt geforderten Lösungsvariante","Élaboration de chaque variante supplémentaire demandée par le service du patrimoine"],
  "Zpracování projektu pro DPZ, včetně PBŘ, STATIKY a ELEKTRO PROJEKTU": ["Preparation of the DPZ design, including fire safety, structural and electrical design","Erstellung der DPZ-Planung einschließlich Brandschutz-, Statik- und Elektroplanung","Établissement du dossier DPZ, y compris sécurité incendie, structure et électricité"],
  "Zpracování podle částí 1–3": ["Prepared according to parts 1–3","Bearbeitung gemäß Teilen 1–3","Traitement selon les parties 1–3"],
  "Sazbu je možné určit i celkovou částkou za určité období, hradí se měsíčně. Obsahuje maximálně 30 hodin výkonu AD za měsíc.": ["The rate may also be agreed as a lump sum for a given period, invoiced monthly. It covers a maximum of 30 hours of site supervision per month.","Der Satz kann auch als Pauschale für einen bestimmten Zeitraum vereinbart und monatlich abgerechnet werden. Er umfasst maximal 30 Stunden Objektüberwachung pro Monat.","Le tarif peut également être convenu au forfait pour une période donnée, facturé mensuellement. Il couvre au maximum 30 heures de suivi par mois."],
  /* ---- Šablona nabídky PROJ v2 – pevné texty (25. 9. 2026) ----
   * Zadání J. V.: „přelož i šablonu projekce do zbývajících jazykových
   * mutací". Texty jsou přesně z Sablona_NABIDKA_PROJ_v2.docx (i s jejími
   * překlepy, aby se našly). Terminologie navazuje na blok B1 výš: české
   * zkratky ST/SP, DPZ, IČ, DPS, EZC a AD zůstávají, jak jsou v nadpisech. */
  "REALIZUJEME I MONTOVANÉ VÝTAHOVÉ ŠACHTY": ["WE ALSO SUPPLY PREFABRICATED LIFT SHAFTS", "WIR REALISIEREN AUCH MONTIERTE AUFZUGSSCHÄCHTE", "NOUS RÉALISONS ÉGALEMENT DES GAINES D'ASCENSEUR PRÉFABRIQUÉES"],
  "Termíny zpracování můžou být upraven dle volných kapacit zhotovitele v okamžiku objednání.": ["Processing times may be adjusted according to the contractor's available capacity at the time of the order.", "Die Bearbeitungsfristen können je nach freien Kapazitäten des Auftragnehmers zum Zeitpunkt der Bestellung angepasst werden.", "Les délais de traitement peuvent être ajustés en fonction des capacités disponibles du prestataire au moment de la commande."],
  "*) Termíny pro vyjádření dotčených orgánů a stavebního úřadu nejsou závazné. Jedná se o termíny, které nemůže zhotovitel z velké části ovlivnit.": ["*) The deadlines for the opinions of the authorities concerned and of the building authority are not binding. They are largely beyond the contractor's control.", "*) Die Fristen für die Stellungnahmen der betroffenen Behörden und des Bauamts sind nicht verbindlich. Der Auftragnehmer kann sie größtenteils nicht beeinflussen.", "*) Les délais d'avis des autorités concernées et du service de l'urbanisme ne sont pas contraignants. Le prestataire ne peut en grande partie pas les influencer."],
  "do 2 týdnů od zpracování projektu pro provedení stavby": ["within 2 weeks of completion of the detailed design documentation", "innerhalb von 2 Wochen nach Fertigstellung der Ausführungsplanung", "dans les 2 semaines suivant l'achèvement du dossier d'exécution"],
  "Ekonomická Zadávací Část (EZC) - zpracování položkového rozpočtu a výkazu výměr": ["Tender Cost Documents (EZC) – itemised budget and bill of quantities", "Wirtschaftlicher Ausschreibungsteil (EZC) – Kostenberechnung nach Positionen und Leistungsverzeichnis", "Pièces économiques de consultation (EZC) – budget détaillé et métré"],
  "Zpracování Dokumentace pro Provedení Stavby (DPS)": ["Preparation of the Detailed Design Documentation (DPS)", "Erstellung der Ausführungsplanung (DPS)", "Élaboration du dossier d'exécution (DPS)"],
  "+ 1 měsíc na nabytí právní moci povolení záměru (reálné termíny jsou závislé na vytížení státní správy)": ["+ 1 month for the project permit to become final (actual deadlines depend on the workload of the state administration)", "+ 1 Monat bis zur Rechtskraft der Vorhabengenehmigung (die tatsächlichen Fristen hängen von der Auslastung der Behörden ab)", "+ 1 mois pour que l'autorisation du projet devienne définitive (les délais réels dépendent de la charge de l'administration)"],
  "Inženýrská Činnost (IČ) - vyřízení povolení záměru": ["Engineering Services (IČ) – obtaining the project permit", "Ingenieurleistungen (IČ) – Erwirkung der Vorhabengenehmigung", "Assistance administrative (IČ) – obtention de l'autorisation du projet"],
  "po obdržení souhlasných stanovisek dotčených orgánů (+ 14 dní v případě nutnosti zapracování podmínek dotčených orgánů do dokumentace)": ["after receipt of the approving opinions of the authorities concerned (+ 14 days if the authorities' conditions have to be incorporated into the documentation)", "nach Erhalt der zustimmenden Stellungnahmen der betroffenen Behörden (+ 14 Tage, falls deren Auflagen in die Unterlagen eingearbeitet werden müssen)", "après réception des avis favorables des autorités concernées (+ 14 jours s'il faut intégrer leurs conditions dans le dossier)"],
  "Podání žádosti o povolení záměru": ["Submission of the application for the project permit", "Einreichung des Antrags auf Vorhabengenehmigung", "Dépôt de la demande d'autorisation du projet"],
  "Proběhne v průběhu lhůty vyjádření dotčených orgánů": ["Takes place during the period for the opinions of the authorities concerned", "Erfolgt während der Frist für die Stellungnahmen der betroffenen Behörden", "A lieu pendant le délai d'avis des autorités concernées"],
  "Dopracování Dokumentace pro Povolení Záměru (čistopis DPZ)": ["Completion of the Documentation for the Project Permit (final DPZ)", "Fertigstellung der Unterlagen für die Vorhabengenehmigung (Reinschrift DPZ)", "Finalisation du dossier de demande d'autorisation (DPZ définitif)"],
  "(v případě potřeby stanoviska hygieny a/nebo památkové péče cca do 2,5 měsíce)": ["(if opinions of the public health authority and/or heritage preservation are required, approx. up to 2.5 months)", "(falls Stellungnahmen des Gesundheitsamts und/oder des Denkmalschutzes erforderlich sind, ca. bis zu 2,5 Monate)", "(si des avis de l'autorité sanitaire et/ou du patrimoine sont nécessaires, environ jusqu'à 2,5 mois)"],
  "Zajištění stanovisek dotčených orgánů": ["Obtaining the opinions of the authorities concerned", "Einholung der Stellungnahmen der betroffenen Behörden", "Obtention des avis des autorités concernées"],
  "do 10-12 týdnů od schválení studie investorem a objednání": ["within 10–12 weeks of approval of the study by the client and the order", "innerhalb von 10–12 Wochen nach Genehmigung der Studie durch den Bauherrn und Bestellung", "dans les 10 à 12 semaines suivant l'approbation de l'étude par le maître d'ouvrage et la commande"],
  "Zpracování dokumentace pro dotčené orgány (hrubopis DPZ)": ["Preparation of the documentation for the authorities concerned (draft DPZ)", "Erstellung der Unterlagen für die betroffenen Behörden (Entwurf DPZ)", "Élaboration du dossier pour les autorités concernées (DPZ provisoire)"],
  "Do cca 2-3 měsíců od podání žádosti – záleží na vytíženosti úředníků STÁTNÍ SPRÁVY": ["Approx. 2–3 months from submission of the application – depends on the workload of the STATE ADMINISTRATION officials", "Ca. 2–3 Monate nach Antragstellung – abhängig von der Auslastung der BEHÖRDEN", "Environ 2 à 3 mois après le dépôt de la demande – selon la charge des services de l'ADMINISTRATION"],
  "Projednání s odborem památkové péče HMP": ["Approval by the Prague heritage preservation department", "Abstimmung mit dem Denkmalschutzamt der Hauptstadt Prag", "Instruction auprès du service du patrimoine de la Ville de Prague"],
  "do 10-12 týdnů od zpracování výstupů ze zaměření": ["within 10–12 weeks of processing of the survey outputs", "innerhalb von 10–12 Wochen nach Auswertung des Aufmaßes", "dans les 10 à 12 semaines suivant le traitement des livrables du relevé"],
  "Zpracování Studie Proveditelnosti (SP)": ["Preparation of the Feasibility Study (SP)", "Erstellung der Machbarkeitsstudie (SP)", "Élaboration de l'étude de faisabilité (SP)"],
  "Zpracování VÝSTUPŮ do 4-6 týdnů od zaměření": ["Processing of the OUTPUTS within 4–6 weeks of the survey", "Auswertung der ERGEBNISSE innerhalb von 4–6 Wochen nach dem Aufmaß", "Traitement des LIVRABLES dans les 4 à 6 semaines suivant le relevé"],
  "ZAMĚŘENÍ na stavbě do 4 týdnů od objednání a předání plné moci": ["On-site SURVEY within 4 weeks of the order and handover of the power of attorney", "AUFMASS vor Ort innerhalb von 4 Wochen nach Bestellung und Übergabe der Vollmacht", "RELEVÉ sur site dans les 4 semaines suivant la commande et la remise de la procuration"],
  "Provedení detailního zaměření a stavebně technického průzkumu": ["Detailed survey and building-technical inspection", "Detailliertes Aufmaß und bautechnische Untersuchung", "Relevé détaillé et diagnostic technique du bâtiment"],
  "*fakturováno měsíčně": ["*invoiced monthly", "*monatlich abgerechnet", "*facturé mensuellement"],
  "100 % z celkové ceny za tuto činnost*": ["100 % of the total price for this service*", "100 % des Gesamtpreises für diese Leistung*", "100 % du prix total de cette prestation*"],
  "Platba po zajištění autorského dozoru a součtu hodin": ["Payment after the designer's site supervision has been provided and the hours totalled", "Zahlung nach erbrachter planerischer Objektüberwachung und Summierung der Stunden", "Paiement après réalisation du suivi architectural et décompte des heures"],
  "50 % z celkové ceny za tuto činnost": ["50 % of the total price for this service", "50 % des Gesamtpreises für diese Leistung", "50 % du prix total de cette prestation"],
  "Platba po vydání kolaudačního rozhodnutí": ["Payment after the final building approval decision has been issued", "Zahlung nach Erteilung des Bauabnahmebescheids", "Paiement après délivrance de la décision de réception des travaux"],
  "Platba před zahájením kolaudačního řízení": ["Payment before the final building approval procedure starts", "Zahlung vor Beginn des Bauabnahmeverfahrens", "Paiement avant le début de la procédure de réception des travaux"],
  "50 % z nabídkové ceny za tuto činnost": ["50 % of the quoted price for this service", "50 % des Angebotspreises für diese Leistung", "50 % du prix proposé pour cette prestation"],
  "Platba po předání ekonomické zadávací části (EZC)": ["Payment after handover of the tender cost documents (EZC)", "Zahlung nach Übergabe des wirtschaftlichen Ausschreibungsteils (EZC)", "Paiement après remise des pièces économiques de consultation (EZC)"],
  "Platba po podpisu objednávky ekonomické zadávací části (EZC)": ["Payment after signing the order for the tender cost documents (EZC)", "Zahlung nach Unterzeichnung der Bestellung des wirtschaftlichen Ausschreibungsteils (EZC)", "Paiement après signature de la commande des pièces économiques de consultation (EZC)"],
  "Platba po předání kompletního dokumentace pro provedení stavby (DPS)": ["Payment after handover of the complete detailed design documentation (DPS)", "Zahlung nach Übergabe der vollständigen Ausführungsplanung (DPS)", "Paiement après remise du dossier d'exécution complet (DPS)"],
  "Platba po podpisu objednávky dokumentace pro provedení stavby (DPS)": ["Payment after signing the order for the detailed design documentation (DPS)", "Zahlung nach Unterzeichnung der Bestellung der Ausführungsplanung (DPS)", "Paiement après signature de la commande du dossier d'exécution (DPS)"],
  "20 % z nabídkové ceny za IČ": ["20 % of the quoted price for IČ", "20 % des Angebotspreises für IČ", "20 % du prix proposé pour l'IČ"],
  "Platba po vydání povolení záměru": ["Payment after the project permit has been issued", "Zahlung nach Erteilung der Vorhabengenehmigung", "Paiement après délivrance de l'autorisation du projet"],
  "30 % z nabídkové ceny za IČ": ["30 % of the quoted price for IČ", "30 % des Angebotspreises für IČ", "30 % du prix proposé pour l'IČ"],
  "Platba po získání stanovisek dotčených orgánů a po podání dokumentace na stavební úřad a zahájení řízení": ["Payment after obtaining the opinions of the authorities concerned, submitting the documentation to the building authority and opening of the procedure", "Zahlung nach Erhalt der Stellungnahmen der betroffenen Behörden, Einreichung der Unterlagen beim Bauamt und Einleitung des Verfahrens", "Paiement après obtention des avis des autorités concernées, dépôt du dossier auprès du service de l'urbanisme et ouverture de la procédure"],
  "50 % z nabídkové ceny za IČ": ["50 % of the quoted price for IČ", "50 % des Angebotspreises für IČ", "50 % du prix proposé pour l'IČ"],
  "Platba po podpisu objednávky": ["Payment after signing the order", "Zahlung nach Unterzeichnung der Bestellung", "Paiement après signature de la commande"],
  "20 % z nabídkové ceny za DPZ": ["20 % of the quoted price for DPZ", "20 % des Angebotspreises für DPZ", "20 % du prix proposé pour le DPZ"],
  "v rozsahu pro podání na stavební úřad": ["to the extent required for submission to the building authority", "im für die Einreichung beim Bauamt erforderlichen Umfang", "dans l'étendue requise pour le dépôt auprès du service de l'urbanisme"],
  "Platba po dokončení dokumentace pro povolení záměru": ["Payment after completion of the documentation for the project permit", "Zahlung nach Fertigstellung der Unterlagen für die Vorhabengenehmigung", "Paiement après achèvement du dossier de demande d'autorisation"],
  "30 % z nabídkové ceny za DPZ": ["30 % of the quoted price for DPZ", "30 % des Angebotspreises für DPZ", "30 % du prix proposé pour le DPZ"],
  "v rozsahu pro podání na dotčené orgány": ["to the extent required for submission to the authorities concerned", "im für die Einreichung bei den betroffenen Behörden erforderlichen Umfang", "dans l'étendue requise pour le dépôt auprès des autorités concernées"],
  "50 % z nabídkové ceny za DPZ": ["50 % of the quoted price for DPZ", "50 % des Angebotspreises für DPZ", "50 % du prix proposé pour le DPZ"],
  "10 % z celkové ceny za studii": ["10 % of the total price for the study", "10 % des Gesamtpreises für die Studie", "10 % du prix total de l'étude"],
  "Platba po předání vyjádření odboru památkové péče HMP": ["Payment after handover of the opinion of the Prague heritage preservation department", "Zahlung nach Übergabe der Stellungnahme des Denkmalschutzamts der Hauptstadt Prag", "Paiement après remise de l'avis du service du patrimoine de la Ville de Prague"],
  "40 % z celkové ceny za studii": ["40 % of the total price for the study", "40 % des Gesamtpreises für die Studie", "40 % du prix total de l'étude"],
  "Platba po předání studie proveditelnosti": ["Payment after handover of the feasibility study", "Zahlung nach Übergabe der Machbarkeitsstudie", "Paiement après remise de l'étude de faisabilité"],
  "50 % z celkové ceny za studii": ["50 % of the total price for the study", "50 % des Gesamtpreises für die Studie", "50 % du prix total de l'étude"],
  "Platba po podpisu objednávky studie proveditelnosti": ["Payment after signing the order for the feasibility study", "Zahlung nach Unterzeichnung der Bestellung der Machbarkeitsstudie", "Paiement après signature de la commande de l'étude de faisabilité"],
  "50 % z celkové ceny za zaměření": ["50 % of the total price for the survey", "50 % des Gesamtpreises für das Aufmaß", "50 % du prix total du relevé"],
  "Platba po ZHOTOVENÍ VÝSTUPŮ ze ZAMĚŘENÍ": ["Payment after COMPLETION OF THE OUTPUTS of the SURVEY", "Zahlung nach FERTIGSTELLUNG DER ERGEBNISSE des AUFMASSES", "Paiement après RÉALISATION DES LIVRABLES du RELEVÉ"],
  "Platba po podpisu objednávky zaměření": ["Payment after signing the order for the survey", "Zahlung nach Unterzeichnung der Bestellung des Aufmaßes", "Paiement après signature de la commande du relevé"],
  "Platnost nabídky ENGINEERS CZ": ["Validity of the ENGINEERS CZ offer", "Gültigkeit des Angebots von ENGINEERS CZ", "Validité de l'offre ENGINEERS CZ"],
  "Součinnost investora, investorská schválení potřebných podkladů a návrhů": ["Cooperation of the client, client approvals of the necessary documents and designs", "Mitwirkung des Bauherrn, Freigabe der erforderlichen Unterlagen und Entwürfe durch den Bauherrn", "Collaboration du maître d'ouvrage, validation des documents et propositions nécessaires"],
  "Zajištění přístupu do objektu": ["Access to the building", "Zugang zum Gebäude", "Accès au bâtiment"],
  "Plná moc k přístupu do archivu stavebního úřadu": ["Power of attorney for access to the building authority archive", "Vollmacht für den Zugang zum Archiv des Bauamts", "Procuration pour l'accès aux archives du service de l'urbanisme"],
  "Součástí ceny není řešení samostatných řízení vyplývající z podmínek stanovisek DOSS, zejména pak Odboru památkové péče a řešení námitek nebo odvolání účastníků řízení.": ["The price does not include separate procedures arising from the conditions in the opinions of the authorities concerned, in particular the heritage preservation department, nor dealing with objections or appeals of the parties to the procedure.", "Der Preis umfasst keine gesonderten Verfahren, die sich aus den Auflagen der Stellungnahmen der betroffenen Behörden ergeben, insbesondere des Denkmalschutzamts, und keine Bearbeitung von Einwendungen oder Berufungen der Verfahrensbeteiligten.", "Le prix ne comprend pas les procédures distinctes découlant des conditions des avis des autorités concernées, en particulier du service du patrimoine, ni le traitement des objections ou recours des parties à la procédure."],
  "Správní poplatky úřadům, správcům sítí a za KOLAUDACI": ["Administrative fees payable to authorities, utility network operators and for the FINAL BUILDING APPROVAL", "Verwaltungsgebühren an Behörden, Netzbetreiber und für die BAUABNAHME", "Frais administratifs dus aux autorités, aux gestionnaires de réseaux et pour la RÉCEPTION DES TRAVAUX"],
  "Případné studie a průzkumy nad rámec nabídky": ["Any studies and surveys beyond the scope of the offer", "Etwaige Studien und Untersuchungen über den Angebotsumfang hinaus", "Études et investigations éventuelles au-delà du périmètre de l'offre"],
  "V případě požadavku účasti projektanta na kontrolních dnech nebo v případě požadavku klienta v průběhu realizace. Autorský dozor doporučujeme v rámci stavby objednat.": ["If the designer is required to attend site inspection meetings or if the client so requests during construction. We recommend ordering the designer's site supervision for the construction.", "Falls die Teilnahme des Planers an Baubesprechungen verlangt wird oder der Kunde dies während der Ausführung wünscht. Wir empfehlen, die planerische Objektüberwachung für die Bauausführung zu beauftragen.", "Si la présence du concepteur aux réunions de chantier est requise ou si le client le demande pendant les travaux. Nous recommandons de commander le suivi architectural pour le chantier."],
  "Zpracování geometrického plánu": ["Preparation of the cadastral plan", "Erstellung des Lageplans (Teilungsplan)", "Établissement du plan de bornage"],
  "Provedení zaměření geodetem": ["Survey by a land surveyor", "Vermessung durch einen Geodäten", "Relevé par un géomètre"],
  "Cena KOLAUDACE platí v případě uskutečnění KOLAUDACE do 2 let od nabytí právní moci povolení záměru.": ["The price of the FINAL BUILDING APPROVAL applies if the FINAL BUILDING APPROVAL takes place within 2 years of the project permit becoming final.", "Der Preis der BAUABNAHME gilt, wenn die BAUABNAHME innerhalb von 2 Jahren nach Rechtskraft der Vorhabengenehmigung erfolgt.", "Le prix de la RÉCEPTION DES TRAVAUX s'applique si la RÉCEPTION DES TRAVAUX a lieu dans les 2 ans suivant la date à laquelle l'autorisation du projet est devenue définitive."],
  "Vedení kolaudace bez nutnosti účasti stavebníka": ["Managing the final building approval without the builder having to attend", "Durchführung der Bauabnahme ohne Anwesenheit des Bauherrn", "Conduite de la réception des travaux sans la présence du maître d'ouvrage"],
  "Kontrola kompletnosti dokladů ze strany zhotovitelů": ["Checking the completeness of the contractors' documents", "Prüfung der Vollständigkeit der Unterlagen der ausführenden Firmen", "Vérification de l'exhaustivité des documents des entreprises"],
  "Zajištění termínu kolaudace se stavebním úřadem a s dotčenými orgány": ["Arranging the date of the final building approval with the building authority and the authorities concerned", "Terminvereinbarung der Bauabnahme mit dem Bauamt und den betroffenen Behörden", "Fixation de la date de réception des travaux avec le service de l'urbanisme et les autorités concernées"],
  "obsahuje kontrolu rozpočtu hlavním inženýrem projektu": ["includes a review of the budget by the chief project engineer", "einschließlich Prüfung der Kostenberechnung durch den leitenden Projektingenieur", "comprend le contrôle du budget par l'ingénieur en chef du projet"],
  "VÝKAZ VÝMĚR (neoceněný výkaz výměr) pro nacenění prací od zhotovitele": ["BILL OF QUANTITIES (unpriced) for pricing of the works by the contractor", "LEISTUNGSVERZEICHNIS (unbepreist) für das Angebot der ausführenden Firma", "MÉTRÉ (non chiffré) pour le chiffrage des travaux par l'entreprise"],
  "ROZPOČET (oceněný výkaz výměr) jednotlivých profesí a všech stavebních prací": ["BUDGET (priced bill of quantities) for the individual trades and all construction works", "KOSTENBERECHNUNG (bepreistes Leistungsverzeichnis) der einzelnen Gewerke und aller Bauarbeiten", "BUDGET (métré chiffré) des différents corps d'état et de tous les travaux de construction"],
  "EZC": ["EZC", "EZC", "EZC"],
  "Zpracování podle částí 1 - 3": ["Prepared according to parts 1 - 3", "Bearbeitung gemäß Teilen 1 - 3", "Traitement selon les parties 1 - 3"],
  "realizační technická zpráva elektro": ["electrical technical report for construction", "technischer Bericht Elektro für die Ausführung", "rapport technique d'exécution électricité"],
  "realizační projekt elektro pro návrh nového rozvodu a hlavního jističe pro připojení výtahové technologie": ["electrical construction design of the new distribution and main circuit breaker for connecting the lift technology", "Elektro-Ausführungsplanung der neuen Verteilung und des Hauptschalters für den Anschluss der Aufzugstechnik", "projet d'exécution électricité pour la nouvelle distribution et le disjoncteur général de raccordement de l'ascenseur"],
  "Elektro prováděcí projekt:": ["Electrical construction design:", "Elektro-Ausführungsplanung:", "Projet d'exécution électricité :"],
  "Dokumentace pro provedení stavby – část 3:": ["Detailed design documentation – part 3:", "Ausführungsplanung – Teil 3:", "Dossier d'exécution – partie 3 :"],
  "statická realizační zpráva": ["structural construction report", "statischer Ausführungsbericht", "note de calcul d'exécution"],
  "výkresy armování, detaily kotvících prvků atd.": ["reinforcement drawings, anchoring element details, etc.", "Bewehrungspläne, Details der Verankerungselemente usw.", "plans de ferraillage, détails des éléments d'ancrage, etc."],
  "Statická prováděcí část:": ["Structural construction part:", "Statischer Ausführungsteil:", "Partie structure d'exécution :"],
  "Dokumentace pro provedení stavby – část 2:": ["Detailed design documentation – part 2:", "Ausführungsplanung – Teil 2:", "Dossier d'exécution – partie 2 :"],
  "realizační technická zpráva": ["technical report for construction", "technischer Ausführungsbericht", "rapport technique d'exécution"],
  "výpis nových prvků": ["schedule of new elements", "Aufstellung der neuen Bauteile", "liste des nouveaux éléments"],
  "popis a postup provádění stavebních prací": ["description and sequence of construction works", "Beschreibung und Ablauf der Bauarbeiten", "description et déroulement des travaux de construction"],
  "detailní rozpracování stavební části projektu včetně potřebných konstrukčních detailů": ["detailed elaboration of the building part of the design including the necessary construction details", "detaillierte Ausarbeitung des baulichen Teils der Planung einschließlich der erforderlichen Konstruktionsdetails", "développement détaillé de la partie bâtiment du projet, y compris les détails constructifs nécessaires"],
  "Stavební prováděcí část:": ["Building construction part:", "Baulicher Ausführungsteil:", "Partie bâtiment d'exécution :"],
  "Dokumentace pro provedení stavby – část 1:": ["Detailed design documentation – part 1:", "Ausführungsplanung – Teil 1:", "Dossier d'exécution – partie 1 :"],
  "Prováděcí projekt obsahuje tyto části:": ["The detailed design contains the following parts:", "Die Ausführungsplanung umfasst folgende Teile:", "Le dossier d'exécution comprend les parties suivantes :"],
  "Eliminuje vznik víceprací, nevhodný způsob provádění a zbytečné protažení realizace.": ["It prevents additional works, unsuitable execution and unnecessary delays in construction.", "Sie verhindert Mehrarbeiten, ungeeignete Ausführung und unnötige Verzögerungen der Realisierung.", "Il évite les travaux supplémentaires, une exécution inadaptée et un allongement inutile du chantier."],
  "Detailní prováděcí projekt, jehož zpracování doporučujeme, jasně určí rozsah, způsob provádění, detaily konstrukčních řešení a položky stavebních prací.": ["A detailed construction design, which we recommend, clearly defines the scope, method of execution, details of the structural solutions and the items of construction work.", "Eine detaillierte Ausführungsplanung, die wir empfehlen, legt Umfang, Ausführungsweise, Details der Konstruktionslösungen und die Positionen der Bauarbeiten eindeutig fest.", "Un dossier d'exécution détaillé, que nous recommandons, définit clairement l'étendue, le mode d'exécution, les détails des solutions constructives et les postes de travaux."],
  "DPS": ["DPS", "DPS", "DPS"],
  "(dle platného stavebního zákona a požadavků stavebního úřadu)": ["(in accordance with the applicable Building Act and the requirements of the building authority)", "(gemäß dem geltenden Baugesetz und den Anforderungen des Bauamts)", "(conformément à la loi sur la construction en vigueur et aux exigences du service de l'urbanisme)"],
  "V průběhu celého řízení komunikujeme s dotčenými orgány i stavebním úřadem, obratem řešíme případné dotazy, tak aby se nezdržel průběh řízení": ["Throughout the procedure we communicate with the authorities concerned and the building authority and deal with any queries promptly so that the procedure is not delayed", "Während des gesamten Verfahrens kommunizieren wir mit den betroffenen Behörden und dem Bauamt und beantworten Rückfragen umgehend, damit sich das Verfahren nicht verzögert", "Pendant toute la procédure, nous communiquons avec les autorités concernées et le service de l'urbanisme et traitons rapidement les éventuelles questions afin de ne pas retarder la procédure"],
  "Zkompletování podkladů potřebných pro POVOLENÍ ZÁMĚRU, podání žádosti": ["Compiling the documents required for the PROJECT PERMIT, submission of the application", "Zusammenstellung der für die VORHABENGENEHMIGUNG erforderlichen Unterlagen, Antragstellung", "Constitution des pièces nécessaires à l'AUTORISATION DU PROJET, dépôt de la demande"],
  "(Hasičský záchranný sbor, Hygienická stanice, Odbor životního prostředí, Národní památkový ústav, Odbor památkové péče, a případné další )": ["(Fire and Rescue Service, Public Health Authority, Environmental Department, National Heritage Institute, Heritage Preservation Department and others as applicable)", "(Feuerwehr, Gesundheitsamt, Umweltamt, Nationales Denkmalinstitut, Denkmalschutzamt und ggf. weitere)", "(Service d'incendie et de secours, autorité sanitaire, service de l'environnement, Institut national du patrimoine, service du patrimoine et autres le cas échéant)"],
  "Podání a projednání na dotčených orgánech a zajištění stanovisek dotčených orgánů požadovaných STAVEBNÍM ÚŘADEM": ["Submission to and negotiation with the authorities concerned and obtaining the opinions required by the BUILDING AUTHORITY", "Einreichung und Abstimmung bei den betroffenen Behörden und Einholung der vom BAUAMT geforderten Stellungnahmen", "Dépôt et instruction auprès des autorités concernées et obtention des avis exigés par le SERVICE DE L'URBANISME"],
  "Kompletace podkladů pro vyjádření dotčených orgánů včetně plných mocí": ["Compiling the documents for the opinions of the authorities concerned, including powers of attorney", "Zusammenstellung der Unterlagen für die Stellungnahmen der betroffenen Behörden einschließlich Vollmachten", "Constitution des pièces pour les avis des autorités concernées, y compris les procurations"],
  "* Cena je platná v případě návaznosti na STUDII PROVEDITELNOSTI": ["* The price applies if it follows on from the FEASIBILITY STUDY", "* Der Preis gilt bei Anschluss an die MACHBARKEITSSTUDIE", "* Le prix s'applique dans la continuité de l'ÉTUDE DE FAISABILITÉ"],
  "Dokumentace bude zaslána v elektronické podobě objednavateli na emailovou adresu. Objednavatel má po předání díla 5 pracovních dní na případnou kontrolu a připomínky. V případě, že v této lhůtě nebudou zaslány žádné připomínky, je dohodnuto, že je dílo převzato bez výhrad": ["The documentation will be sent to the client electronically to their e-mail address. After handover the client has 5 working days for any review and comments. If no comments are sent within this period, it is agreed that the work has been accepted without reservation", "Die Unterlagen werden dem Auftraggeber elektronisch an seine E-Mail-Adresse gesendet. Nach der Übergabe hat der Auftraggeber 5 Arbeitstage für eine etwaige Prüfung und Anmerkungen. Gehen innerhalb dieser Frist keine Anmerkungen ein, gilt das Werk als vorbehaltlos abgenommen", "Le dossier sera envoyé au client sous forme électronique à son adresse e-mail. Après la remise, le client dispose de 5 jours ouvrés pour un éventuel contrôle et ses remarques. Si aucune remarque n'est envoyée dans ce délai, il est convenu que l'ouvrage est accepté sans réserve"],
  "Zhotovitel předá objednavateli dílo v počtu 2 paré tištěné dokumentace včetně elektronické podoby v pdf": ["The contractor will hand over the work to the client in 2 printed copies of the documentation together with an electronic version in PDF", "Der Auftragnehmer übergibt dem Auftraggeber das Werk in 2 gedruckten Ausfertigungen der Unterlagen einschließlich elektronischer Fassung als PDF", "Le prestataire remettra l'ouvrage au client en 2 exemplaires imprimés du dossier, avec une version électronique en PDF"],
  "technická zpráva elektro v rozsahu pro stavební povolení": ["electrical technical report to the extent required for the building permit", "technischer Bericht Elektro im für die Baugenehmigung erforderlichen Umfang", "rapport technique électricité dans l'étendue requise pour le permis de construire"],
  "návrh nového rozvodu a hlavního jističe pro připojení výtahové technologie": ["design of the new distribution and main circuit breaker for connecting the lift technology", "Planung der neuen Verteilung und des Hauptschalters für den Anschluss der Aufzugstechnik", "conception de la nouvelle distribution et du disjoncteur général de raccordement de l'ascenseur"],
  "Elektro projekt:": ["Electrical design:", "Elektroplanung:", "Projet électricité :"],
  "Dokumentace pro povolení záměru – část 4:": ["Documentation for the project permit – part 4:", "Unterlagen für die Vorhabengenehmigung – Teil 4:", "Dossier de demande d'autorisation – partie 4 :"],
  "technická zpráva statika": ["structural technical report", "technischer Bericht Statik", "rapport technique structure"],
  "statické posouzení souvisejících stavebních úprav": ["structural assessment of the related building modifications", "statische Beurteilung der zugehörigen baulichen Änderungen", "vérification structurelle des travaux de modification associés"],
  "posouzení reakcí výtahu na okolní konstrukce": ["assessment of the lift reactions on the surrounding structures", "Beurteilung der Aufzugslasten auf die umgebenden Konstruktionen", "vérification des réactions de l'ascenseur sur les structures environnantes"],
  "statické výpočty nových konstrukcí": ["structural calculations of the new structures", "statische Berechnungen der neuen Konstruktionen", "calculs structurels des nouvelles structures"],
  "Statický výpočet realizovatelnosti záměru:": ["Structural calculation of the project's feasibility:", "Statische Berechnung der Realisierbarkeit des Vorhabens:", "Calcul structurel de faisabilité du projet :"],
  "Dokumentace pro povolení záměru – část 3:": ["Documentation for the project permit – part 3:", "Unterlagen für die Vorhabengenehmigung – Teil 3:", "Dossier de demande d'autorisation – partie 3 :"],
  "technická zpráva požárně bezpečnostního řešení": ["fire safety technical report", "technischer Bericht Brandschutz", "rapport technique de sécurité incendie"],
  "stanovení požadavků na novou konstrukci, technologii a požární úseky dle stávajících norem": ["definition of requirements for the new structure, technology and fire compartments according to current standards", "Festlegung der Anforderungen an die neue Konstruktion, die Technik und die Brandabschnitte nach geltenden Normen", "définition des exigences relatives à la nouvelle structure, à la technologie et aux compartiments coupe-feu selon les normes en vigueur"],
  "posouzení nové konstrukce z požárního hlediska a případné rozdělení objektu na nové požární úseky": ["assessment of the new structure from the fire safety point of view and, if necessary, division of the building into new fire compartments", "Beurteilung der neuen Konstruktion aus Brandschutzsicht und ggf. Aufteilung des Gebäudes in neue Brandabschnitte", "évaluation de la nouvelle structure du point de vue incendie et, le cas échéant, division du bâtiment en nouveaux compartiments coupe-feu"],
  "Požárně bezpečnostní řešení nového výtahu a výtahové šachty:": ["Fire safety design of the new lift and lift shaft:", "Brandschutzkonzept für den neuen Aufzug und Aufzugsschacht:", "Conception de la sécurité incendie du nouvel ascenseur et de sa gaine :"],
  "Dokumentace pro povolení záměru – část 2:": ["Documentation for the project permit – part 2:", "Unterlagen für die Vorhabengenehmigung – Teil 2:", "Dossier de demande d'autorisation – partie 2 :"],
  "průvodní, souhrnná a technická zpráva": ["accompanying, summary and technical report", "Begleit-, Zusammenfassungs- und technischer Bericht", "notice de présentation, rapport de synthèse et rapport technique"],
  "- grafický návrh nového stavu umístění výtahu u objektu, návrh šachty a návrh stavebních úprav včetně naznačení rozsahu stavebních prací": ["- graphic design of the new state – lift location at the building, shaft design and design of the building modifications, including an outline of the scope of the construction works", "- grafischer Entwurf des neuen Zustands – Lage des Aufzugs am Gebäude, Schachtentwurf und Entwurf der baulichen Änderungen einschließlich Darstellung des Umfangs der Bauarbeiten", "- conception graphique de l'état projeté – emplacement de l'ascenseur au bâtiment, conception de la gaine et des travaux de modification, avec indication de l'étendue des travaux"],
  "dokumentace nového stavu": ["documentation of the new state", "Dokumentation des neuen Zustands", "dossier de l'état projeté"],
  "- zakreslení rozsahu a postupu bouracích prací": ["- drawing of the scope and sequence of the demolition works", "- Darstellung von Umfang und Ablauf der Abbrucharbeiten", "- représentation de l'étendue et du déroulement des travaux de démolition"],
  "bourací dokumentace": ["demolition documentation", "Abbruchplanung", "dossier de démolition"],
  "- stav vycházející ze zaměření a původní dokumentace": ["- state based on the survey and the original documentation", "- Zustand auf Grundlage des Aufmaßes und der ursprünglichen Unterlagen", "- état établi à partir du relevé et du dossier d'origine"],
  "dokumentace stávajícího stavu": ["documentation of the existing state", "Dokumentation des Bestands", "dossier de l'état existant"],
  "- v rozsahu požadovaném pro řízení o povolení záměru": ["- to the extent required for the project permit procedure", "- im für das Genehmigungsverfahren erforderlichen Umfang", "- dans l'étendue requise pour la procédure d'autorisation du projet"],
  "situace stavby": ["site plan", "Lageplan", "plan de situation"],
  "Stavební část projektu:": ["Building part of the design:", "Baulicher Teil der Planung:", "Partie bâtiment du projet :"],
  "Dokumentace pro povolení záměru – část 1:": ["Documentation for the project permit – part 1:", "Unterlagen für die Vorhabengenehmigung – Teil 1:", "Dossier de demande d'autorisation – partie 1 :"],
  "Dokumentace povolení záměru obsahuje tyto části:": ["The documentation for the project permit contains the following parts:", "Die Unterlagen für die Vorhabengenehmigung umfassen folgende Teile:", "Le dossier de demande d'autorisation comprend les parties suivantes :"],
  "Dokumentace pro povolení záměru (DPZ) navazuje na vzájemně odsouhlasenou STUDII PROVEDITELNOSTI. Ta rozpracovává dokumentaci, dle platné vyhlášky do legislativou požadované úrovně s autorizacemi inženýrů dle příslušných oborů.": ["The documentation for the project permit (DPZ) follows on from the mutually agreed FEASIBILITY STUDY. It develops the documentation in accordance with the applicable decree to the level required by legislation, with the authorisations of engineers in the relevant disciplines.", "Die Unterlagen für die Vorhabengenehmigung (DPZ) bauen auf der gemeinsam abgestimmten MACHBARKEITSSTUDIE auf. Sie arbeiten die Dokumentation gemäß geltender Verordnung bis zum gesetzlich geforderten Niveau aus, mit Autorisierung der Ingenieure der jeweiligen Fachrichtungen.", "Le dossier de demande d'autorisation (DPZ) s'appuie sur l'ÉTUDE DE FAISABILITÉ validée d'un commun accord. Il développe la documentation conformément au décret en vigueur jusqu'au niveau exigé par la législation, avec les agréments des ingénieurs des disciplines concernées."],
  "DPZ": ["DPZ", "DPZ", "DPZ"],
  "TATO SKUTEČNOST JE ZOHLEDNĚNA V CENĚ NAVAZUJÍCÍHO PROJEKTU.": ["THIS IS REFLECTED IN THE PRICE OF THE FOLLOW-UP DESIGN.", "DIES IST IM PREIS DER FOLGEPLANUNG BERÜCKSICHTIGT.", "CECI EST PRIS EN COMPTE DANS LE PRIX DU PROJET SUIVANT."],
  "V případě, že se investor rozhodne pro zpracování STUDIE PROVEDITELNOSTI, navazující projekt pro POVOLENÍ ZÁMĚRU se zhotovuje rozšířením této studie do legislativně požadované úrovně.": ["If the client decides to have a FEASIBILITY STUDY prepared, the follow-up design for the PROJECT PERMIT is produced by extending this study to the level required by legislation.", "Entscheidet sich der Bauherr für die Erstellung einer MACHBARKEITSSTUDIE, wird die anschließende Planung für die VORHABENGENEHMIGUNG durch Erweiterung dieser Studie auf das gesetzlich geforderte Niveau erstellt.", "Si le maître d'ouvrage opte pour une ÉTUDE DE FAISABILITÉ, le projet suivant pour l'AUTORISATION DU PROJET est réalisé en complétant cette étude jusqu'au niveau exigé par la législation."],
  "CENA ZA STUDII PROVEDITELNOSTI – části 1": ["PRICE FOR THE FEASIBILITY STUDY – parts 1", "PREIS FÜR DIE MACHBARKEITSSTUDIE – Teile 1", "PRIX DE L'ÉTUDE DE FAISABILITÉ – parties 1"],
  "CENA ZA STUDII PROVEDITELNOSTI (SP):": ["PRICE FOR THE FEASIBILITY STUDY (SP):", "PREIS FÜR DIE MACHBARKEITSSTUDIE (SP):", "PRIX DE L'ÉTUDE DE FAISABILITÉ (SP) :"],
  "zajištění závazného stanoviska od odboru památkové péče HMP k předložené STUDII PROVEDITELNOSTI.": ["obtaining the binding opinion of the Prague heritage preservation department on the submitted FEASIBILITY STUDY.", "Einholung der verbindlichen Stellungnahme des Denkmalschutzamts der Hauptstadt Prag zur vorgelegten MACHBARKEITSSTUDIE.", "obtention de l'avis conforme du service du patrimoine de la Ville de Prague sur l'ÉTUDE DE FAISABILITÉ présentée."],
  "příprava podkladů pro jednání s odborem památkové péče HMP": ["preparation of documents for negotiations with the Prague heritage preservation department", "Vorbereitung der Unterlagen für die Verhandlungen mit dem Denkmalschutzamt der Hauptstadt Prag", "préparation des documents pour les échanges avec le service du patrimoine de la Ville de Prague"],
  "díky obsahu a zpracování je možné naší STUDII PROVDITELNOSTI projednat v této fázi na odboru památkové péče HMP": ["thanks to its content and elaboration, our FEASIBILITY STUDY can already be discussed with the Prague heritage preservation department at this stage", "dank Inhalt und Ausarbeitung kann unsere MACHBARKEITSSTUDIE bereits in dieser Phase mit dem Denkmalschutzamt der Hauptstadt Prag abgestimmt werden", "grâce à son contenu et à son niveau d'élaboration, notre ÉTUDE DE FAISABILITÉ peut être présentée dès ce stade au service du patrimoine de la Ville de Prague"],
  "STUDIE PROVEDITELNOSTI:": ["FEASIBILITY STUDY:", "MACHBARKEITSSTUDIE:", "ÉTUDE DE FAISABILITÉ :"],
  "Projednání": ["Approval", "Abstimmung", "Instruction"],
  "Studie proveditelnosti – část 3:": ["Feasibility study – part 3:", "Machbarkeitsstudie – Teil 3:", "Étude de faisabilité – partie 3 :"],
  "TECHNICKÁ ZPRÁVA - obsahující popis řešení": ["TECHNICAL REPORT – containing a description of the solution", "TECHNISCHER BERICHT – mit Beschreibung der Lösung", "RAPPORT TECHNIQUE – comprenant la description de la solution"],
  "(grafický návrh nového stavu umístění výtahu v objektu, návrh šachty a návrh stavebních úprav včetně naznačení rozsahu stavebních prací)": ["(graphic design of the new state – lift location in the building, shaft design and design of the building modifications, including an outline of the scope of the construction works)", "(grafischer Entwurf des neuen Zustands – Lage des Aufzugs im Gebäude, Schachtentwurf und Entwurf der baulichen Änderungen einschließlich Darstellung des Umfangs der Bauarbeiten)", "(conception graphique de l'état projeté – emplacement de l'ascenseur dans le bâtiment, conception de la gaine et des travaux de modification, avec indication de l'étendue des travaux)"],
  "návrh na úpravy prostoru pro výtahovou šachtu, portálu dveří a dalších návazných nutných stavebních úprav": ["proposal for modifications of the space for the lift shaft, the door portal and other related necessary building modifications", "Vorschlag für Anpassungen des Raums für den Aufzugsschacht, des Türportals und weiterer notwendiger baulicher Folgeänderungen", "proposition d'aménagement de l'espace pour la gaine d'ascenseur, du portail de porte et des autres travaux de modification nécessaires"],
  "NAVRHOVANÝ STAV - zpracování řešení": ["PROPOSED STATE – design of the solution", "GEPLANTER ZUSTAND – Ausarbeitung der Lösung", "ÉTAT PROJETÉ – élaboration de la solution"],
  "grafické naznačení možného rozsahu bourání s ohledem na statiku objektu": ["graphic indication of the possible extent of demolition with regard to the building's structural system", "grafische Darstellung des möglichen Abbruchumfangs unter Berücksichtigung der Statik des Gebäudes", "représentation graphique de l'étendue possible des démolitions compte tenu de la structure du bâtiment"],
  "ROZSAH BOURÁNÍ": ["EXTENT OF DEMOLITION", "ABBRUCHUMFANG", "ÉTENDUE DES DÉMOLITIONS"],
  "průmět reality z průzkumu s původní dokumentací stavby": ["comparison of the inspection findings with the original building documentation", "Abgleich der Untersuchungsergebnisse mit den ursprünglichen Bauunterlagen", "confrontation des constats du diagnostic avec le dossier d'origine du bâtiment"],
  "PŮVODNÍ STAV - grafický výstup ze zaměření": ["ORIGINAL STATE – graphic output of the survey", "BESTAND – grafische Auswertung des Aufmaßes", "ÉTAT EXISTANT – restitution graphique du relevé"],
  "Návrh grafické studie:": ["Graphic study design:", "Grafischer Studienentwurf:", "Conception graphique de l'étude :"],
  "Studie proveditelnosti – část 2:": ["Feasibility study – part 2:", "Machbarkeitsstudie – Teil 2:", "Étude de faisabilité – partie 2 :"],
  "pořízení detailní fotodokumentace": ["detailed photo documentation", "detaillierte Fotodokumentation", "reportage photographique détaillé"],
  "vizuální prohlídka objektu stavebně technických návazností, které mají vliv na úpravu výtahové šachty v objektu": ["visual inspection of the building-technical connections of the building that affect the lift shaft modifications in the building", "Sichtprüfung der bautechnischen Gegebenheiten des Gebäudes, die die Anpassung des Aufzugsschachts im Gebäude beeinflussen", "inspection visuelle des interfaces techniques du bâtiment ayant une incidence sur l'aménagement de la gaine d'ascenseur"],
  "zpracování výstupu ze zaměření": ["processing of the survey outputs", "Auswertung des Aufmaßes", "traitement des livrables du relevé"],
  "(ověření reálných rozměrů pro eliminaci chyby původní PD k objektu)": ["(verification of the actual dimensions to eliminate errors in the original building documentation)", "(Überprüfung der tatsächlichen Maße, um Fehler der ursprünglichen Bauunterlagen auszuschließen)", "(vérification des dimensions réelles pour éliminer les erreurs du dossier d'origine du bâtiment)"],
  "detailní zaměření 3D skenerem dotčených částí objektu": ["detailed 3D laser scan survey of the affected parts of the building", "detailliertes Aufmaß der betroffenen Gebäudeteile mit 3D-Scanner", "relevé détaillé au scanner 3D des parties concernées du bâtiment"],
  "zajištění původní dokumentace stavby v potřebném rozsahu od investora nebo z archivu stavebního úřadu": ["obtaining the original building documentation to the necessary extent from the client or from the building authority archive", "Beschaffung der ursprünglichen Bauunterlagen im erforderlichen Umfang vom Bauherrn oder aus dem Archiv des Bauamts", "obtention du dossier d'origine du bâtiment dans l'étendue nécessaire auprès du maître d'ouvrage ou des archives du service de l'urbanisme"],
  "Stavebně technický průzkum a zaměření:": ["Building-technical inspection and survey:", "Bautechnische Untersuchung und Aufmaß:", "Diagnostic technique et relevé :"],
  "Studie proveditelnosti – část 1:": ["Feasibility study – part 1:", "Machbarkeitsstudie – Teil 1:", "Étude de faisabilité – partie 1 :"],
  "Studie proveditelnosti – podoba úprav domu, umístění výtahové šachty a technologie výtahu, se zpracovává jako prvotní dokumentace, do které se zapracují veškeré požadavky investora v kombinaci s realizovatelností záměru a legislativních požadavků. Tím se docílí podkladu, který poté slouží nejen pro projednání záměru na stavebním úřadě, ale také je možné ho dále rozpracovat do dalších stupňů projektových dokumentací.": ["Feasibility study – the form of the building modifications, the location of the lift shaft and the lift technology – is prepared as the initial documentation incorporating all of the client's requirements together with the feasibility of the project and the legislative requirements. The result is a basis that serves not only for discussing the project with the building authority but can also be developed further into the subsequent stages of the design documentation.", "Machbarkeitsstudie – Gestaltung der Gebäudeanpassungen, Lage des Aufzugsschachts und Aufzugstechnik – wird als erste Dokumentation erstellt, in die alle Anforderungen des Bauherrn zusammen mit der Realisierbarkeit des Vorhabens und den gesetzlichen Anforderungen eingearbeitet werden. So entsteht eine Grundlage, die nicht nur der Abstimmung des Vorhabens mit dem Bauamt dient, sondern auch in die weiteren Planungsphasen weiterentwickelt werden kann.", "Étude de faisabilité – forme des aménagements du bâtiment, emplacement de la gaine et technologie de l'ascenseur – élaborée comme document initial intégrant toutes les exigences du maître d'ouvrage ainsi que la faisabilité du projet et les exigences légales. On obtient ainsi une base qui sert non seulement à l'instruction du projet auprès du service de l'urbanisme, mais qui peut aussi être développée dans les phases suivantes du projet."],
  "ST": ["ST", "ST", "ST"],
  "POHLED NA OBJEKT": ["VIEW OF THE BUILDING", "ANSICHT DES GEBÄUDES", "VUE DU BÂTIMENT"],
  "Navazující PROJEKTOVÉ a INŽENÝRSKÉ ČINNOSTI": ["Follow-up DESIGN and ENGINEERING SERVICES", "Anschließende PLANUNGS- und INGENIEURLEISTUNGEN", "PRESTATIONS DE CONCEPTION et D'INGÉNIERIE ultérieures"],
};

/* ---- normalizace klíče (tolerance k mezerám, diakritickým uvozovkám,
 *      koncové dvojtečce/hvězdičce a velikosti písmen) ---- */
function prekladNorm(s) {
  return String(s == null ? '' : s)
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u201e\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\s:.*]+$/, '')
    .toLowerCase();
}

/* rejstřík normalizovaný klíč → [EN, DE, FR] (staví se jednou při načtení) */
const PREKLAD_IDX = {};
Object.keys(PREKLAD).forEach(k => { PREKLAD_IDX[prekladNorm(k)] = PREKLAD[k]; });

/* ---- vzory pro řetězce s čísly, které se generují za běhu ----
 * (rozměry, rozteče, počty – slovník je pokrýt nemůže) */
const PREKLAD_VZORY = [
  { re: /^jekl\s+(\d+x\d+)$/i, en: 'SHS $1', de: 'Hohlprofil $1', fr: 'profilé creux $1' },
  /* Termín dodání z krycího listu (#330): „cca 12 týdnů", „16 týdnů (vč.
   * 4 týdnů za ATYP)". Stojí PŘED obecným „cca …", jinak by z něj vyšlo
   * „approx. 12 týdnů" — půl věty česky. Náhrada je funkce, protože
   * předpona i dovětek za ATYP jsou nepovinné. */
  { re: /^(cca\s+)?(\d+)\s+týdn[ůy](?:\s+\(vč\.\s+(\d+)\s+týdn[ůy]\s+za\s+ATYP\))?$/i,
    en: (m, c, n, a) => (c ? 'approx. ' : '') + n + ' weeks' + (a ? ' (incl. ' + a + ' weeks for the non-standard design)' : ''),
    de: (m, c, n, a) => (c ? 'ca. ' : '') + n + ' Wochen' + (a ? ' (inkl. ' + a + ' Wochen für die Sonderausführung)' : ''),
    fr: (m, c, n, a) => (c ? 'env. ' : '') + n + ' semaines' + (a ? ' (dont ' + a + ' semaines pour l\u2019exécution spéciale)' : '') },
  { re: /^cca\s+(.+)$/i, en: 'approx. $1', de: 'ca. $1', fr: 'env. $1' },
  { re: /^šířka\s+(.+?)\s+×\s+hloubka\s+(.+)$/i,
    en: 'width $1 × depth $2', de: 'Breite $1 × Tiefe $2', fr: 'largeur $1 × profondeur $2' },
  { re: /^(\d+)x\s+sloupek,\s+ocelové uzavřené profily$/i,
    en: '$1× column, steel hollow sections', de: '$1× Stütze, Stahlhohlprofile',
    fr: '$1× poteau, profilés creux en acier' },
  /* Můstky (P7, 25. 9. 2026): „2 ks, hloubka 900 mm, šířka 1300 mm" a usazení
   * „přisazena k fasádě, v 3 nástupištích přes můstky". */
  { re: /^(\d+) ks(?:, hloubka (\d+) mm)?(?:, šířka (\d+) mm)?$/i,
    en: (m, n, h, s) => n + ' pcs' + (h ? ', depth ' + h + ' mm' : '') + (s ? ', width ' + s + ' mm' : ''),
    de: (m, n, h, s) => n + ' Stk.' + (h ? ', Tiefe ' + h + ' mm' : '') + (s ? ', Breite ' + s + ' mm' : ''),
    fr: (m, n, h, s) => n + ' pcs' + (h ? ', profondeur ' + h + ' mm' : '') + (s ? ', largeur ' + s + ' mm' : '') },
  { re: /^přisazena k (fasádě|podestám), v (\d+) nástupištích přes můstky$/i,
    en: (m, k, n) => 'Attached to the ' + (k === 'fasádě' ? 'facade' : 'landings') + ', at ' + n + ' landings via access bridges',
    de: (m, k, n) => 'An ' + (k === 'fasádě' ? 'die Fassade' : 'die Podeste') + ' angebaut, an ' + n + ' Zugangsstellen über Brücken',
    fr: (m, k, n) => 'Accolée ' + (k === 'fasádě' ? 'à la façade' : 'aux paliers') + ', à ' + n + ' paliers par des passerelles' },
  { re: /^(\d+)×\s*nad nástupišti$/i,
    en: '$1× over the landings', de: '$1× über den Zugangsstellen',
    fr: '$1× au-dessus des paliers' },
  { re: /^(\d+)\s*ks závěsných ok pro výškové práce$/i,
    en: '$1 pcs of anchor eyes for work at height',
    de: '$1 Stk. Anschlagösen für Höhenarbeiten',
    fr: '$1 pcs d\u2019anneaux d\u2019ancrage pour travaux en hauteur' },
];

/* řetězce, které se nepřekládají (čísla, prázdné pomlčky, kódy RAL apod.) */
function prekladNeutral(s) {
  const t = String(s == null ? '' : s).trim();
  if (!t || t === '-' || t === '–') return true;
  if (/^[\d\s.,/x×+\-]+$/i.test(t) || /^RAL\s*\d+$/i.test(t)) return true;
  /* Evidenční čísla a kódy typu „2026 - OPR - CN - 001“ nebo „DPS/2026/14“.
   * Jsou to identifikátory, ne text – překládat se nesmějí a nemá smysl je
   * hlásit jako chybějící heslo. Podmínky schválně úzké:
   *   – musí obsahovat číslici,
   *   – jen ASCII velká písmena, číslice a oddělovače (žádná diakritika,
   *     takže české nadpisy jako „DODAVATEL“ ani „B. OBCHODNÍ ČÁST“ neprojdou),
   *   – žádné písmenné slovo delší než 4 znaky (slova = text, ne kód). */
  if (/\d/.test(t) && /^[A-Z0-9][A-Z0-9\s.,:;/\\_+\-]*$/.test(t)
    && !/[A-Z]{5,}/.test(t)) return true;
  /* KONTAKTNÍ BLOK FIRMY v patičce šablony (K10-N36, 24. 9. 2026): web,
   * telefon, IČ/DIČ, PSČ s městem, ulice s číslem popisným/orientačním,
   * název firmy s právní formou a oddělovací čára. Překládat se nemají —
   * a dokud je překladač hlásil jako chybějící, mutace šablony vypadala
   * nedodělaná, i když byla v pořádku. Vzory jsou úzké: ulice musí mít
   * číslo s lomítkem, PSČ tvar „123 45 Město", název firmy právní formu. */
  if (/^(www\.|https?:\/\/)\S+$/i.test(t)) return true;
  if (/^(Tel|Mob|Fax)\.?\s*:?\s*[+\d][\d\s]+$/i.test(t)) return true;
  if (/^(IČO?|DIČ)\s*:?\s*(CZ)?[\d\s]+$/i.test(t)) return true;
  if (/^\d{3}\s?\d{2}\s+\S.*$/.test(t) && t.length <= 40) return true;
  if (/^\S.* \d+\/\d+[a-z]?$/.test(t) && t.length <= 40) return true;
  if (/^[A-Z][A-Z0-9 &.-]+ (s\.r\.o\.|a\.s\.|spol\. s r\.o\.)$/.test(t)) return true;
  if (/^[_\-=–—\s]{5,}$/.test(t)) return true;
  /* Kontaktní řádky hlavičky šablony PROJ (25. 9. 2026): e-mail, IČ
   * s překlepem „lČ" (malé L) tak, jak je v šabloně, ulice s PSČ v jednom
   * řádku a řádek složený z několika kontaktů oddělených mezerami
   * (zarovnání tabulátorem nahradila řada mezer). Řádek se složenými údaji
   * je neutrální jen tehdy, když je neutrální KAŽDÝ jeho díl — věta
   * s mezerami navíc tudy neproklouzne. */
  if (/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(t)) return true;
  if (/^[lI]ČO?\s*:?\s*(CZ)?[\d\s]+$/.test(t)) return true;
  if (/^\S.* \d+\/\d+[a-z]?,\s*\d{3}\s?\d{2}\s+\S.*$/.test(t) && t.length <= 60) return true;
  if (/\S\s{3,}\S/.test(t)) {
    const dily = t.split(/\s{3,}/);
    if (dily.length > 1 && dily.every(d => prekladNeutral(d))) return true;
  }
  return false;
}

/* evidence chybějících hesel – podklad pro překladatele i pro report */
const PREKLAD_CHYBI = {};
function prekladZaznamChybi(cz, lang) {
  const k = lang + '\u0000' + cz;
  PREKLAD_CHYBI[k] = { jazyk: lang, cz: cz, pocet: (PREKLAD_CHYBI[k] ? PREKLAD_CHYBI[k].pocet : 0) + 1 };
}

/* ---- hlavní překladová funkce ----
 * tr('UMÍSTĚNÍ ŠACHTY', 'en') → 'SHAFT LOCATION'
 * Není-li překlad, vrací český originál (nikdy prázdno). */
function tr(cz, lang) {
  return trStav(cz, lang).text;
}

/* podrobná varianta: { text, prelozeno, zdroj } */
function trStav(cz, lang) {
  const orig = String(cz == null ? '' : cz);
  if (!lang || lang === 'cz') return { text: orig, prelozeno: true, zdroj: 'cz' };
  const i = JAZYK_IDX[lang];
  if (i === undefined) return { text: orig, prelozeno: true, zdroj: 'cz' };
  if (prekladNeutral(orig)) return { text: orig, prelozeno: true, zdroj: 'neutrální' };

  const hit = PREKLAD_IDX[prekladNorm(orig)];
  if (hit && hit[i]) return { text: hit[i], prelozeno: true, zdroj: 'slovník' };

  for (const v of PREKLAD_VZORY) {
    const m = orig.trim().match(v.re);
    if (m && v[lang]) return { text: orig.trim().replace(v.re, v[lang]), prelozeno: true, zdroj: 'vzor' };
  }

  prekladZaznamChybi(orig, lang);
  return { text: orig, prelozeno: false, zdroj: 'nepřeloženo' };
}

/* ---- údržba slovníku (admin) ---- */
function prekladNastav(cz, lang, text) {
  const i = JAZYK_IDX[lang];
  if (i === undefined) return false;
  if (!PREKLAD[cz]) PREKLAD[cz] = ['', '', ''];
  PREKLAD[cz][i] = String(text == null ? '' : text);
  PREKLAD_IDX[prekladNorm(cz)] = PREKLAD[cz];
  return true;
}
function prekladSmaz(cz) {
  if (!PREKLAD[cz]) return false;
  delete PREKLAD[cz];
  delete PREKLAD_IDX[prekladNorm(cz)];
  return true;
}
function prekladPocet(lang) {
  const i = JAZYK_IDX[lang];
  const ks = Object.keys(PREKLAD);
  if (i === undefined) return ks.length;
  return ks.filter(k => PREKLAD[k][i]).length;
}

/* ---- pokrytí: kolik z předaných řetězců umíme přeložit ---- */
function prekladPokryti(seznam, lang) {
  const uniq = [];
  const videno = {};
  (seznam || []).forEach(s => {
    const t = String(s == null ? '' : s).trim();
    if (!t || prekladNeutral(t)) return;
    const n = prekladNorm(t);
    if (videno[n]) return;
    videno[n] = 1; uniq.push(t);
  });
  const chybi = [];
  let ok = 0;
  uniq.forEach(t => { if (trStav(t, lang).prelozeno) ok++; else chybi.push(t); });
  return { celkem: uniq.length, prelozeno: ok, chybi: chybi,
    procenta: uniq.length ? Math.round(ok / uniq.length * 100) : 100 };
}

/* ---- export/import pro konfigurace.json (SET-2 / N3) ---- */
function prekladExport() {
  const out = {};
  Object.keys(PREKLAD).forEach(k => { out[k] = PREKLAD[k].slice(); });
  return { verze: 1, jazyky: JAZYKY.map(j => j.kod), hesla: out };
}
function prekladImport(data) {
  if (!data || !data.hesla) return 0;
  let n = 0;
  Object.keys(data.hesla).forEach(k => {
    const v = data.hesla[k];
    if (!Array.isArray(v)) return;
    PREKLAD[k] = [v[0] || '', v[1] || '', v[2] || ''];
    PREKLAD_IDX[prekladNorm(k)] = PREKLAD[k];
    n++;
  });
  return n;
}

if (typeof module !== 'undefined')
  module.exports = { JAZYKY, JAZYK_IDX, PREKLAD, PREKLAD_IDX, PREKLAD_VZORY, PREKLAD_CHYBI,
    tr, trStav, prekladNorm, prekladNeutral, prekladNastav, prekladSmaz, prekladPocet,
    prekladPokryti, prekladExport, prekladImport };
