# Předávka dávky PD — kalkulace z Pipedrive (#733, #732, #728, #729)

Větev `claude/pd-webhook-uprava` nad integrací `173ab6a` (v23.11.2), pracovní verze v23.11.3.
Zadání: koordinace 23. 11. 2026 (J. V. po zkoušce dealu TEST na testu v23.11.1, nález K53-N2).

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

## Otázka pro J. V. (#728)

Kalkulaci z webhooku (autor `pipedrive-webhook`) smí odemknout jen administrátor a vedoucí — obchodník
ji z dealu dostane jen ke čtení. Doporučení: autor = vlastník dealu (uživatel Pipedrive → e-mail účtu
kalkulátoru), samostatný úkol.

## Testy

`netlify/test_pd_cerstva.mjs` 28, `src/test_pd_cerstva_ui.js` 12, `overit_pd_cerstva.mjs` 16 (vynucený
závod s nasazením ceníku). Pojistka: na 173ab6a všechny tři padají. Mutace [PD] 12.
