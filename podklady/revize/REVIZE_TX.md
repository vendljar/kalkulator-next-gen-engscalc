# Revize dávky TX (texty nabídky, datum krycího listu, uložení dotisku)

Poradce Fable, 26. 11. 2026. Větev `claude/tx-texty`, HEAD d5e3908, základ 2e5f90c.
Do revidované větve nic necommitováno.

## Verdikt: SLOUČIT; J1 a J2 potvrdí J. V., N1 doporučuji doplnit

Ověřeno v odděleném pracovním stromu: `test_tx_texty` 57/0, `test_pd2_tisk_cn` 34/0,
`test_np_nahled_word` 208/0, `test_platby_ock` 77/0, `test_pp_k61` 16/0,
`test_objednavka_proj` 86/0, `netlify/test_pd_prevod` 181/0. Kolo, porovnání a mutace jsem
nepouštěl (převzato ze zprávy dávky).

## #808 — uložení dotisku nad zakázkou jen ke čtení (bezpečnost)

- **Server se nemění.** Výjimka je jen v prohlížeči: `onlineUloz` pustí uložení, když je jedinou
  změnou záznam dotisku. Režim „jen ke čtení“ je ochrana před nechtěnou změnou v rozhraní, ne
  oprávnění — zmrazená data zámku, připsané tisky, práva a souběh hlídá server stejně jako dosud
  (`zakazka_kontrola.mjs`), takže přes výjimku nejde uložit nic, co by nešlo uložit i bez ní.
- **Detektor `zamekJenDotisk`** jsem zkoušel vlastní sondou (19 případů): pravda jen pro nové
  položky na konci `zamek.tisky` u varianty, která už byla zamčená, plus nové řádky protokolu.
  Nepravda pro: změnu zadání (i jiné varianty), změnu zmrazeného výsledku, přepis starého tisku,
  odemčení, smazaný nebo přepsaný řádek protokolu, novou či smazanou variantu, první tisk
  nezamčené varianty, změnu hlavičky, Prodáno, objednané příplatky, změnu `zamek.kdo`.
  Ignoruje jen `aktivni` a serverové razítko `prijato`.
- **N1 (doporučení, malé):** detektor nerozlišuje typ připsaného tisku. Záznam typu `sod` nebo
  `sodProj` projde také, pokud tisk smlouvy nezměnil žádná data (běžně je mění — zmrazí krycí
  list — a pak výjimka neplatí). Záměr je „dotisk odeslané nabídky“: omezit výjimku na typy,
  které varianta už v uložené verzi má (`zamek.typ` nebo dřívější `tisky`), s testem.
- **N2 (k vědomí):** dotisk kolegy, který zakázku nesmí odemknout, se teď do zakázky uloží
  (dřív se záznam ztratil). To je účel opravy; server dál pouští uložení každému přihlášenému
  (otevřená otázka #640).

## Dokumenty

- **Značka `txTisk`** ve snímku podmínek: V4 (nové znění), V5, V6, #815 a #814 platí jen pro
  neodeslanou nabídku a pro nabídku odeslanou po TX. Nabídka odeslaná po PD2 a před TX se
  dotiskne se zněním PD2, starší postaru. Nová věta konečné faktury se do cizích jazyků překládá
  vzorem nad českou větou, takže se u starých nabídek neobjeví.
- **V5 záruka:** z kapitoly V. zmizí jen tehdy, když šablona má symbol `{{NAB_ZARUKA}}`; šablona
  bez symbolu a online tisk zůstávají beze změny. U nabídky odeslané před TX je symbol prázdný
  a záruka zůstane v Termínech. Bezpečné pořadí nasazení: nejdřív kód, pak šablona.
- **#804** datum „25.11.2026“: převod do Pipedrive tenhle tvar čte (test doplněn).
- **Zlatá sada víc šachet:** porovnal jsem starý a nový soubor — liší se jen otisky `ph-cz`,
  `ph-en`, `docx`, `sod`; žádná cena ani výsledek výpočtu.

## Potvrdí J. V.

- **J1 — slovník mění i dotisk starých odeslaných cizojazyčných nabídek.** Překlad se dělá až
  při tisku, takže se u všech nabídek (i odeslaných před TX) změní:
  německý nadpis „OPLÁŠTĚNÍ ŠACHTY“ (Schachtauskleidung → Schachtverkleidung),
  francouzské „bez opláštění“ ve dvou heslech (bardage → habillage)
  a popisek „Vypracoval“ ve všech třech jazycích (nově s velkým písmenem a dvojtečkou).
  Jsou to opravy překladu a stejný postup měl precedens (#759), ale je to změna textu odeslaného
  dokumentu — prosím o výslovné potvrzení. Porovnání sestavení zachytí jen anglický online tisk;
  německý a francouzský dotisk v pevné sadě není, takže je potřeba ho ověřit v plném kole (bod A4).
- **J2 — znění ke schválení:** české věty #815 (požární klasifikace, odvětrání, vnější lešení
  u šachty bez opláštění) a překlady EN/DE/FR pro #815 a novou větu konečné faktury jsou v kódu
  označené jako návrh.

## Poznámky

- N3 V5 a #814 závisí na šabloně (blok `NAB_ZARUKA_ZAC` / `_KON`, textové pole fotky v PROJ v9).
  Do zadání plného kola: dotisk staré odeslané nabídky s NOVOU šablonou CN — záruka jen jednou
  (v Termínech), žádný prázdný bod.
- N4 Svěřené rozhodnutí TX-T1 a přegenerování zlaté sady jsou v mezích svěřených rozhodnutí
  (jen testy a nástroje).
- N5 Statické kontroly padají jen na verzi × den commitu — vyřeší přidělení verze koordinací.
