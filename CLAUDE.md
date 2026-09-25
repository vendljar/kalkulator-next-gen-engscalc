# Pokyny pro Claude — Kalkulator Next Gen

Komunikace česky. Know-how projektu je ve skillech `kalkulator-next-gen`,
`roadmapa-kng` a `testovaci-procedura-kng`.

## Větve (pokyn J. V. 25. 9. 2026)

- Změny se nahrávají VŽDY do `test-draft`.
- Do `test` jen na pokyn J. V., do `main` až po jeho odsouhlasení.
- Pomocné větve relací (`main-xxxx`, `k13-nalezy` apod.) se nepoužívají;
  práce z nich se přenese do `test-draft` a větev se smaže.

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
