# Pokyny pro Claude — Kalkulator Next Gen

Komunikace česky. Know-how projektu je ve skillech `kalkulator-next-gen`,
`roadmapa-kng` a `testovaci-procedura-kng`.

## Větve (pokyn J. V. 25. 9. 2026)

- Změny se nahrávají VŽDY do `test-draft`.
- Do `test` jen na pokyn J. V., do `main` až po jeho odsouhlasení.
- Pomocné větve relací (`main-xxxx`, `k13-nalezy` apod.) se nepoužívají;
  práce z nich se přenese do `test-draft` a větev se smaže.
- **Výjimka schválená J. V. 25. 9. 2026: `k16-nalezy`** — pracovní větev pro
  dávky B, C a rozbor D kola 16 (roadmapa #361–#363). Vznikla z `test-draft`
  (v25.9.6). Pracuje se v ní a pushuje se do ní; do `test-draft` se převádí
  (fast-forward nebo merge) po každé ucelené dávce, dál platí `test` a `main`
  jen na pokyn J. V. Po dokončení #361–#363 se sloučí do `test-draft`
  a smaže. `PREDAVKA.md` se vede v té větvi, ve které se právě pracuje.
- **Trvalá předávací větev je `test-draft`** — nové sezení bez jiného pokynu
  začíná z ní (`PREDAVKA.md` + `CLAUDE.md`).

## Předávací soubor `PREDAVKA.md`

Cloudové sezení může spadnout (25. 9. 2026: „Prompt is too long“ po
1,58 M tokenů) a s ním zmizí vše, co není na GitHubu. Proto:

1. **Na začátku sezení** přečíst `PREDAVKA.md` na `test-draft`.
2. **Po každé ucelené dávce** (a vždy před delší prací) přepsat
   `PREDAVKA.md`: co je hotovo, co je rozdělané, na co se čeká, otevřené
   otázky pro J. V., další krok. Commitnout a pushnout do `test-draft`.
3. **Hlídat limit sezení:** zjistit `context_usage` nástrojem `get_session`
   (bez `session_id`) na konci každé dávky. Nad 60 % limitu upozornit J. V.,
   nad 75 % aktualizovat `PREDAVKA.md` a doporučit nové sezení.
4. Rozdělanou práci nenechávat jen v kontejneru — radši commit „WIP“ do
   `test-draft` než ztráta.

## Testy (od 26. 9. 2026)

- Jediný seznam kroků je `nastroje/testovaci_kolo.sh` (sestavení bez zvýšení
  verze → `spust_testy.sh --smoke` → mutace jádra → mutace serveru → statické
  kontroly → souhrn s počty, nenulový kód při selhání). `nastroje/pred_pushem.sh`
  je obal (`--mutace` = celé kolo), CI volá tentýž skript. Mutační běh se
  nikdy nepřerušuje.
- Každý nový test musí mít pojistku proti prázdnému testu: doložit, že před
  opravou selže a po opravě projde (napsat do commitu).
- Statická kontrola osobních údajů a tajemství: `nastroje/kontrola_udaju.py`,
  povolený seznam `nastroje/povolene_kontakty.txt` (nový smyšlený kontakt v
  testu se tam zapíše s důvodem; skutečný do repa nepatří).
- N46 (nástupiště A ↔ C u zrcadlové šachty) se neopravuje bez pokynu J. V. —
  fuzz `src/test_fuzz_invarianty.js` rozdíl jen hlásí jako INFO.
