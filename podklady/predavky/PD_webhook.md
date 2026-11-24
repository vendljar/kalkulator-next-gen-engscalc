# Předávka dávky PD — kalkulace z Pipedrive (#733, #732, #728, #729)

Větev `claude/pd-webhook-uprava` nad integrací `173ab6a` (v23.11.2), verze v23.11.5 (koordinace).
Zadání: koordinace 23. 11. 2026 (nález K53-N2).

## Příčina K53-N2 (ověřeno v prohlížeči)

Webhook ukládá kalkulaci „bez ceníku“ (P12) s prázdným rozdílem. Prohlížeč při otevření doplní ceník
z `DEFAULT_CENIK` — jenže platný online ceník do něj nasazuje `onlineTik` odloženě (setTimeout), takže
otevření odkazem po přihlášení doplnilo ceník ze sestavení (marže 0). Pozdější `progPouzij` →
`progSrovnejNedotcene` → `cenikPrepoctiRozpracovane` bral zakázku s číslem a názvem akce jako rozdělanou:
ceny přepočetl (desítky změn = #732), marži/DPH a ceny „dle nabídky“ chránil (zůstaly 0). Výchozí
zaškrtnutí se pouští jen v `novaZakazkaUI`.

## Řešení

- Server: nová kalkulace z webhooku nese `pdCerstva = true`; `pdVazbaDrz` ho při uložení z prohlížeče
  vždy zahodí (obnova z otisku ho drží).
- Klient `onlineOtevri`: u čerstvé nejdřív `onlineCenikNasadHned()` (progPouzij platné verze, není-li
  nasazená), pak import a `pdCerstvaPriprav` (src/zakazka.js): ceník OCK/PROJ, zadání, cenikRada,
  cenikRucni, zadaniRucni z `novaVariantaData()` + `zobrazeniVychoziAplikuj(NAST.zobrazeni)`; příznak pryč.
  Hlavička a krycí list (datum z dealu) zůstanou. Bez platného online ceníku se nepřipravuje.
- #728: `onlineObnovPosledni` předá `{ zOdkazu }`; čerstvá + z odkazu + `zamekCteniSmiOdemknout` →
  `zamekCteniVypni`, jinak zámek čtení jako dřív.
- #729: `pdWebhookZadani` kontakt = jen jméno osoby.

## Revize Fable (52ec1ab): SLOUČIT PO OPRAVĚ → opraveno

N1 nepřipravená čerstvá kalkulace se neodemyká, dopříprava `onlineCerstvaDopriprav` po nasazení ceníku
v `onlineTik` (jen beze změn); N3 `cenikPouzit` po nasazení hned; N4 ne v náhledu; N5 test celých dat.
N2 = otázka níže. Bod 4 koordinace: `uzivatel()` v `pd_prevod.mjs` podle e-mailu v textu, jinak jménem.
Bod 5 (příplatky > 255) beze změny (rozhodnuto dřív).
Dorevize (claude/revize-pd-733, dfed775): N1 server 409 pro tělo s `pdCerstva` + klient neodemkne
(`zamekCteniCerstvaDuvod` v common.js); N2 dopříprava podle zámku čtení; N3 jen nad nasazenou
verzí; N4 harness už v kole (glob); N5 text „obnovte stránku (F5)“.

## Otázka pro J. V. (#728)

Kalkulaci z webhooku (autor `pipedrive-webhook`) smí odemknout jen administrátor a vedoucí — obchodník
ji z dealu dostane jen ke čtení. Doporučení: autor = vlastník dealu (uživatel Pipedrive → e-mail účtu
kalkulátoru), samostatný úkol.

## Testy

`netlify/test_pd_cerstva.mjs` 30, `src/test_pd_cerstva_ui.js` 26, `test_pd_prevod` +5, `overit_pd_cerstva.mjs` 24. Pojistka: na 173ab6a všechny tři padají. Mutace [PD] 24. Kolo 31b8083 --bez-mutaci proti d655295: VŠE ZELENÉ (528/0/6, hodiny 428/0/1, statické 12/12, S3 SHODA 367/367).
