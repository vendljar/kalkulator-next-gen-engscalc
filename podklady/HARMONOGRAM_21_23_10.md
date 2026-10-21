# Plán koordinace 21. 10. odpoledne – pá 23. 10. ráno (J. V. 21. 10. ~14:15 UTC)

Koordinace: „ŘÍDÍCÍ 21.10 noc“ session_016CbSudw1q9GXrrtfiJKvAG (hloubka 0). Časy UTC (Praha = UTC+2).
Kokpit: https://claude.ai/artifact/LLLBVLxKcWDHhd8axapiU2

## Pokyny J. V. (21. 10. ~14:15)

- **Vše hotové a ověřené rovnou do `test`** (fast-forward) + release odkaz. **`main` jen na výslovný pokyn J. V.** (ráno návrh).
- **Hotové dávky archivovat** sama koordinace (bez otevřených otázek, po sloučení do test). Nearchivovat V3 session_01GyotCYY7DhFnyXhceNA3de a „Pipedrive API integrace“.
- **Novou koordinaci zakládá koordinace sama** při kontextu nad 75 % (předávka sem + do PREDAVKA_KOORDINACE_15_10.md, kontroly send_later).
- **Stará koordinace ŘÍDÍCÍ 21.10** session_013EFud9jETTivWTCJNmbAX4: archivovat, až doběhne O12 a předá SHA (pokyn J. V.).
- **22. 10. J. V. celý den u počítače NEBUDE** → zítra jen dávky bez jeho rozhodnutí; otázky se jen sbírají do „Čeká na vás“. #19 zítra nedělat.
- **Týdenní limit: do pátku 23. 10. rána nepřekročit 90 % (max +2 %).** Stav 21. 10. 14:15 = **63 %**, obnova **so 24. 10. 7:00** (Praha).

## Rozpočet limitu (kalibrace koordinace)

- Spotřeba všech sezení od obnovy (so 17. 10. 05:00 UTC) ≈ 745 $ ekvivalentu (cost_usd z `list_sessions`, rozpočítané v čase) = 63 % → **1 % ≈ 11,8 $** (konzervativně: ostatní používání J. V. mimo sezení zvyšuje skutečnou hodnotu).
- Výchozí stav nákladů 21. 10. 14:10 UTC: C3 20,3 $, K5 11,7 $, stará koordinace 9,6 $, S11 5,1 $, koordinace 2,5 $. **Odhad % = 63 + (součet přírůstků cost_usd všech sezení od 14:10) / 11,8.**
- Cíl pá 06:00 UTC **≤ 88 %** (≈ +25 % ≈ 295 $), tvrdá mez 90 %.

| Úsek | Odhad | Odhad % na konci |
|---|---|---|
| Noc 21./22. 10. (C3/C6, S11, O13, K5 dokončení, O12, sloučení v21.10.5 + v21.10.6, K6, koordinace) | ~130 $ | ~74 % |
| Den 22. 10. (D1, D2, podmíněně D3, koordinace) | ~60 $ | ~79 % |
| Noc 22./23. 10. (podmíněně K7, koordinace s řidšími kontrolami) | ~35 $ | ~82 % |
| Rezerva (R1–R3 jen při odhadu ≤ 80 % v poledne 22. 10.) | ~70 $ | ≤ 88 % |

**Brzdy:** odhad ≥ 84 % → žádná nová dávka, jen dokončit rozběhnuté; ≥ 87 % → kontroly koordinace jen po ~2 h, nic nového; 90 % = stop (rozběhnuté dávky požádat o zápis WIP a ukončení). Kontrola odhadu při každé kontrole koordinace.

## Harmonogram

### Noc 21./22. 10.

| Čas UTC | Co | Kdo |
|---|---|---|
| 14:00–15:30 | kolo C5 ve větvi C3; O12 (stará koordinace) | C3 session_01JtioiPRsGUDpkKu1m66Rdt, ŘÍDÍCÍ 21.10 |
| 15:30–17:00 | **v21.10.5 = C5 + O12** → integrace, kolo `--bez-mutaci` + cílené mutace (#447 C, O12) → **test** + release odkaz | koordinace |
| ~16:00 | K5 doběhne (mutace serveru 734) → výsledek nad v21.10.4 | K5 session_01162HK7JqEFF32eE31rMeaU |
| 14:10–17:00 | **O13**: K5-S1, K5-K1, K5-W1, K5-W2 + „(DPZ)*“ v jazykové verzi | O13 session_011JErifeDYRjmfEhbv3EoWN |
| 14:00–18:30 | C6 kód SoD (`sodObjednaneSymboly`) + S11 šablona SoD realizace v4 (vyplnění ověří nad C6) | C3, S11 session_01UYfLxJt1UUBU9Ygd5A2mw7 |
| 18:30–20:30 | **v21.10.6 = C6 + S11 (nástroj) + O13** → integrace, kolo + cílené mutace → **test** + release odkaz | koordinace |
| 20:30–05:00 | **K6** celé kolo s mutacemi + audit diffu 7652bb9..v21.10.6 nad test (kandidát pro main) | nová dávka |
| 05:00–06:00 | ranní souhrn (artefakt), návrh main, „Čeká na vás“ | koordinace |

### Den 22. 10. (J. V. pryč — nic, co čeká na jeho rozhodnutí)

| Čas UTC | Co | Kdo |
|---|---|---|
| 06:00–09:00 | **D1** roadmapa dorovnat (meta, pořadí v18.10.12–v21.10.6, uzavřít hotové, #473 K5, #447 C5/C6) + soupis novinek pro obchodníky v20.10.2–v21.10.6 + ukázkový XLSX exportu v2 (zkušební data, z kódu) → soubor pro J. V. | nová dávka |
| 06:00–09:00 | **D2** podklad k #367 P10 (platební podmínky z krycího listu): návrh odpovědí, prototyp, otázky — bez kódu, k projití s J. V. po návratu | nová dávka |
| 08:00–12:00 | **D3** (jen když K6 něco najde): opravy nálezů K6 bez J. V. + přeživší mutace → v22.10.1 → kolo + mutace → test | nová dávka |
| 12:00 | kontrola rozpočtu; při odhadu ≤ 80 % rezervní dávky R1–R3 | koordinace |

Rezerva (jen při rozpočtu): **R1** #28 MCP — jen návrh rozhraní (role, bez ceníků a nákladů) k rozhodnutí; **R2** informativní nálezy K5/K6, které jdou jen testem; **R3** příručka — kontrola snímků a textů u nových funkcí (Controlling, objednané příplatky).

### Noc 22./23. 10.

| Čas UTC | Co | Kdo |
|---|---|---|
| 16:00–04:00 | **K7** celé kolo s mutacemi jen pokud se po K6 měnil kód (D3/R2); jinak jen kolo `--bez-mutaci` koordinací | nová dávka / koordinace |
| průběžně | kontroly koordinace po 60–90 min | koordinace |
| 05:00 | páteční souhrn: verze, testy, odhad limitu, návrh main, co čeká na J. V. | koordinace |

## Co čeká na J. V. (sbírá se, neblokuje)

- `main` (dnes v20.10.1): návrh posunu na ověřenou verzi po K6.
- Nahrát šablonu SoD realizace v4 (CZ+EN/DE/FR) na test po v21.10.6 (průvodce, všechny čtyři najednou); EN/DE/FR k SoD realizace v2 / projekce v3 po O12.
- K5-W3 (zbytek K4-N2), rozhodnutí z K6.
- #367 P10 projít podle podkladu D2; tlačítko „Smazat sloučené větve“ (po main).
