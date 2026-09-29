# Pokyny pro Claude — Kalkulator Next Gen

Komunikace česky. Know-how projektu je ve skillech `kalkulator-next-gen`,
`roadmapa-kng` a `testovaci-procedura-kng`.

## Větve (pokyn J. V. 25. 9. 2026, upraveno 29. 9. 2026)

- **Od 29. 9. 2026 (pravidlo J. V.): úpravy se dělají vždy promptem do
  paralelní větve** (`claude/…`, založená nad commitem, který určí prompt).
  Větev zůstává, o sloučení do `test-draft` rozhoduje J. V. Určuje-li prompt
  větev a zakazuje `test-draft`, platí prompt.
- `test-draft` je integrační větev: slučuje se do ní na pokyn J. V. (sezení
  při tom řeší konflikty a pouští celé testovací kolo).
- Do `test` jen na pokyn J. V., do `main` až po jeho odsouhlasení.
- Staré pomocné větve relací (`main-xxxx`, `k13-nalezy` apod.) se po
  sloučení mažou (viz Tagy, releasy a mazání větví).
- **Výjimka schválená J. V. 25. 9. 2026: `k16-nalezy`** — pracovní větev pro
  dávky B, C a rozbor D kola 16 (roadmapa #361–#363). Vznikla z `test-draft`
  (v25.9.6). Pracuje se v ní a pushuje se do ní; do `test-draft` se převádí
  (fast-forward nebo merge) po každé ucelené dávce, dál platí `test` a `main`
  jen na pokyn J. V. Po dokončení #361–#363 se sloučí do `test-draft`
  a smaže. `PREDAVKA.md` se vede v té větvi, ve které se právě pracuje.
  (Splněno: sloučeno do `test-draft`, čeká jen na smazání — viz níže.)
- **Trvalá předávací větev je `test-draft`** — nové sezení bez jiného pokynu
  začíná z ní (`PREDAVKA.md` + `CLAUDE.md`); paralelní větev si vede vlastní
  `PREDAVKA.md` (u slučování se sloučí ručně).

## Tagy, releasy a mazání větví (pokyn J. V. 29. 9. 2026)

- Z cloudového sezení nejde pushnout tag ani smazat vzdálenou větev (proxy
  vrací HTTP 403) — neobcházet, udělá to J. V.
- **Ke každé verzi, která má dostat tag, poslat J. V. odkaz** na nový release
  s předvyplněným tagem a cílem:
  `https://github.com/vendljar/kalkulator-next-gen-engscalc/releases/new?tag=vD.M.N&target=<plný SHA>&title=…`
  a na konci dávky vypsat verze, které release ještě nemají (tagy a releasy
  ověřit přes GitHub, ne odhadem).
- Tagy jsou jednoduché (lightweight) ve tvaru `vDEN.MĚSÍC.pořadí`.
- Sloučené pomocné větve maže J. V. — poslat odkaz
  `https://github.com/vendljar/kalkulator-next-gen-engscalc/branches/all?query=<větev>`.
  Ke smazání navrhnout jen větev, která je celá v `test-draft`
  (`git merge-base --is-ancestor origin/<větev> origin/test-draft`).

## Předávací soubor `PREDAVKA.md`

Cloudové sezení může spadnout (25. 9. 2026: „Prompt is too long“ po
1,58 M tokenů) a s ním zmizí vše, co není na GitHubu. Proto:

1. **Na začátku sezení** přečíst `PREDAVKA.md` na `test-draft`.
2. **Po každé ucelené dávce** (a vždy před delší prací) přepsat
   `PREDAVKA.md`: co je hotovo, co je rozdělané, na co se čeká, otevřené
   otázky pro J. V., další krok. Commitnout a pushnout do větve, ve které
   se pracuje (u sloučení do `test-draft`).
3. **Hlídat limit sezení:** zjistit `context_usage` nástrojem `get_session`
   (bez `session_id`) na konci každé dávky. Nad 60 % limitu upozornit J. V.,
   nad 75 % aktualizovat `PREDAVKA.md` a doporučit nové sezení.
4. Rozdělanou práci nenechávat jen v kontejneru — radši commit „WIP“ do
   své větve než ztráta.

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
