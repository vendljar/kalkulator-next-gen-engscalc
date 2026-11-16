# Prompt VZ — společná pravidla pro všechny etapy „víc zákazníků na jedné zakázce“

Čte se s každým `PROMPT_VZ_E*.md`. Návrh: `podklady/NAVRH_VICE_ZAKAZNIKU.md` (v3, rozhodnutí J. V. 16. 11. 2026).
Vzhled a chování: prototyp `podklady/vz_prototyp/` (https://claude.ai/artifact/8qc59CQ4prtV1a4cNQjY4V) — je to
podklad, ne kód k převzetí (prototyp přepisuje hlavičku a obaluje čísla; ostrá verze to dělá podle návrhu).
Programování spouští koordinace až po souhlasu J. V. zprávou „SPUSŤ VZ-E<n> nad <SHA>“.

## Pořadí a větve

E0 → E1 → E2 → E3 → E4 → E5b → E6; E5 souběžně s E1–E3 (nejdřív po sloučení E0). Báze první etapy je integrace
`8462aea83545de31dfec673b80c5bb37a1fea16a` (v12.11.7), každá další nad SHA od koordinace. Větev `claude/vz-e<n>`
(E5b: `claude/vz-e5b`). Do `test-draft`, `test` ani `main` nic; weby, Disk ani Pipedrive nic. Čísla roadmapy
a mezí (`BEZPECNOST_MEZE.md`) přidělí koordinace — před zápisem ověř, že jsou volná. Verzi a CHANGELOG veď podle
`CLAUDE.md` (koordinace přečísluje).

## Závazná pravidla

1. **Vypínač.** Vše za `viceZakazniku` (`netlify/lib/funkce.mjs` `FUNKCE_ZNAME`, Nastavení → Zkušební funkce, jen
   administrátor, výchozí VYP, rozhoduje server). Vzor je víc šachet (#570): `src/vice_sachet.js`,
   `src/ui/vice_sachet_ui.js`, `onlineNactiFunkce`.
2. **VYP = dnešek bajt po bajtu.** Zlaté sady beze změny otisků; harness porovná stránku s bází znak po znaku
   (vzor `overit_vs_zadani.mjs` s `KNG_DIST_ZAKLAD`). **ZAP s jedním zákazníkem** se liší jen tlačítkem
   „Přidat zákazníka“ u pole Zákazník; data, dokumenty a rejstřík stejné.
3. **Žádný klíč navíc, dokud je zákazník jeden.** `vzRidici` a `dalsiZakaznici` vzniknou přidáním druhého zákazníka
   a zmizí odstraněním posledního dalšího. Pole psaná jen serverem (`pdPoznamkaZakaznici`, `pdOrgVitez`) do toho nepatří.
4. **Hlavička zakázky = řídící zákazník.** Co dnes čte `zak.objednatel`, `zak.ico`… (Pipedrive, webhook, K40c,
   rejstřík, controlling), se nemění.
5. **Únik údajů.** Dokument se tvoří jen z pohledu zákazníka (`vzPohled`). V generátorech dokumentů
   (`nabidka*.js`, `sod.js`, `kryci*.js`, `docxgen.js`, `dokumenty.js`, `nazvy_souboru.js`) se nesmí objevit
   `dalsiZakaznici` — hlídá statická kontrola a test s kanárky (E2), který každá další etapa rozšíří o svoje výstupy.
6. **Jména funkcí.** Sestavení je jeden `<script>`: funkce stejného jména z jiného souboru tiše přepíše jinou.
   Nové funkce s předponou `vz`; před přidáním `grep -rn "function <jméno>" src`.
7. **Server nevěří prohlížeči.** Role, autor, zámky, razítka tisků a `platna` se berou z relace a z uložené verze
   (`netlify/lib/zakazka_kontrola.mjs`, vzor `uloZamekRazitkaDrz`).
8. **Testy.** Každý nový test má pojistku proti prázdnému testu — do commitu napiš, že před změnou selže a po ní
   projde. Smyšlené kontakty jen s řádkem v `nastroje/povolene_kontakty.txt`; žádné skutečné ceny ani osobní údaje.
   Testy Pipedrive jen proti `netlify/lib/pipedrive_simulator.mjs`, ARES jen předaným `fetch`. Síť se nevolá nikdy.
9. **Mutace.** Ke každé etapě mutace se značkou „[VZ E<n>]“ v `mutace_jadro.mjs` / `netlify/mutace.mjs`; pouštěj jen
   svoje (po částech podle `CLAUDE.md`), celé mutace jsou v E6. Mutační běh se nepřerušuje.
10. **Kolo.** Na konci `bash nastroje/testovaci_kolo.sh --bez-mutaci` (hlas „VŠE ZELENÉ“ s počty do PREDAVKA).
    Na začátku `bash nastroje/instaluj_hooky.sh`; `git push --no-verify` je zakázané.
11. **PREDAVKA.md** ve své větvi po každé ucelené části; `context_usage` přes `get_session` na konci, nad 60 % upozorni.
12. **Co do etapy nepatří, nedělej.** Nápad mimo rozsah zapiš do PREDAVKA jako otevřený bod.

## Konec etapy — zpráva koordinaci

SHA, větev, co je hotovo a co ne, výsledek kola a mutací s počty, změny proti návrhu (s důvodem), otevřené body
pro J. V. Etapy označené v návrhu § 10 „revize poradce“ koordinace před sloučením pošle poradci.
