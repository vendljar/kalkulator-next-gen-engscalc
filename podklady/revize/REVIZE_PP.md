# Revize dávky PP (připomínky, krycí list PROJ, nálezy kola 61)

Poradce Fable, 25. 11. 2026. Větev `claude/pp-pripominky-kl`, HEAD c0a72f5 (kód 92973f3),
základ integrace ebca8ebd. Do revidované větve nic necommitováno.

## Verdikt: OPRAVIT (jedna malá oprava S1), jinak připraveno ke sloučení

Ověřeno v odděleném pracovním stromu: `test_pp_pripominky` 59/0, `test_pp_k61` 16/0,
`test_objednavka_proj` 82/0, `test_vs_kontroly` 52/0, `netlify/test_pp_znacky` 29/0.
Pojistky: po vrácení `kontroly.js`, `objednavka_proj.js`, `kryci.js` a `pripominky.mjs`
na základ selže 1 + 1 + 8 + 13 testů. Kolo a mutace jsem znovu nepouštěl (převzato ze zprávy dávky).

## S1 — #791: podpis objednatele může zůstat sám na třetí straně (Word i PDF)

Zkušební objednávka se všemi činnostmi (7 řádků, 8 plateb, 10 termínů) vyjde ve Wordu
(převod LibreOffice) na 2 strany, ale podpis končí asi 45 bodů nad dolním okrajem. Stačí
čtyři řádky textu navíc (sonda: +4 řádky Termínů) a dokument má 3 strany — na třetí je
jen „Datum / Podpis objednatele“ a zápatí. Reálně to nastane u varianty s projednáním,
geodetem, kolaudací, cestovným nebo delšími názvy. Tvrzení „≤ 2 strany“ tedy neplatí
obecně a osamocený podpis je horší než stav před #791 (podpis byl hned pod cenou).

Oprava (malá): ve Wordu svázat podpis s předchozím textem — `keep` (keepNext, `objDocxOdst`
ho umí) na odstavec „Vystavil“, prázdný odstavec před podpisem a poslední blok
(Termíny / kalendář / poznámka, podle toho, co je poslední); v tisku `.vystavil` a poslední
odstavec `.pozn` dostanou `break-after: avoid`. Test s pojistkou: XML posledních odstavců
nese `w:keepNext`. Počet stran nejde slíbit (J. V. 19. 11.: plný rozsah i za cenu dalších
stran) — v CHANGELOG a #791 nepsat „≤ 2 strany“, ale „podpis nikdy sám na straně“.

## Bez výhrad

- **#781 značky — bezpečnost.** Server ověří seznam před výhradní sekcí (jen 5 známých polí,
  celá čísla 0–1000, ≤ 20, min. 5 ‰, bez přesahu); chyba = 400 a číslo připomínky se
  nespotřebuje. Ukládá se jen očištěná kopie spolu se snímkem, takže značky čte jen správce
  přes `?snimek=`, nejdou do pohledu autora, zálohy ani ke koordinaci a zmizí se snímkem.
  Při čtení se ověřují znovu. SVG skládá `pripominkaZnackySvg` jen z ověřených čísel a tvaru
  ze seznamu — vstup uživatele se do HTML nedostane (XSS nehrozí ani u poškozeného záznamu).
  Limit těla 800 kB platí i se značkami (test).
- **#793 náhled Pipedrive jen administrátor.** Skrytí je jen v UI (`pdnUiNahledSmi`), server
  `/api/pd/nanecisto` se nemění — nic nového nezpřístupňuje ani nezakazuje. Zápis prodeje
  (#597) a odeslání (#116) nejsou dotčené: potvrzovací tabulka se zápisem jde jinou cestou
  (`prodPdUiHtml`), skrytý je jen suchý náhled, který se kreslí, když zápis není možný.
- **#802 kontrola SoD.** Pravidla mlčí jen při `jenProj` / `jenOck`, tedy u vyřazené strany
  (`zakazkaVyrazenaStrana`, stejný příznak jako 19 dalších pravidel). U kombinované zakázky
  není vyřazená žádná strana a obě kontroly SoD hlásí dál.
- **#804 datum česky.** Mění jen výstup krycího listu (`kryciData` / `kryciProjData`); uložená
  hodnota a symboly smlouvy zůstávají. Řádky krycího listu jdou i do podkladu zápisu prodeje —
  převod data v `pd_prevod.mjs` český tvar „25. 11. 2026“ čte, zápis do Pipedrive se nemění.
- **#792, #801, #803** — jen UI, bez připomínek.

## Poznámky

- N1 (#793): kdo má právo `crm.pipedrive` a není administrátor, může suchý náhled dál zavolat
  přímo na serveru (stejně jako před dávkou). Pokud má být náhled administrátorský i na
  serveru, je to rozhodnutí J. V. (bezpečnostní mez) — doporučuji nechat, jak je.
- N2 (PD2): PD2 sahá do `sod_ui.js`, `kryci.js`, `kryci_proj.js` a `pd_nanecisto_ui.js`.
  Po sloučení PP si PD2 musí vzít novou integraci dřív, než začne kreslit řádky „ponechá se“
  (brána `pdnUiNahledSmi`, společná karta PROJ) a počítat s datem v řádcích krycího listu
  v českém tvaru.
- N3: popis v kartě říká „Objednávka je jednostránková“ — po #791 a rozhodnutí o plném
  rozsahu neplatí; upravit text při opravě S1.
