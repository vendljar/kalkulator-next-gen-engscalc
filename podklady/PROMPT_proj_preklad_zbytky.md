# Prompt pro kódové sezení — P1: zbytky češtiny v online nabídce PROJ v EN/DE/FR (jen neshody slovníku)

Komunikace česky, nikdy AskUserQuestion. Platí `CLAUDE.md`. Navazuje na soupis z dávky v14.10.4 (`PREDAVKA.md` ve větvi `claude/slovnik-14-10`, oddíl „Co v online nabídce PROJ v EN/DE/FR dál zůstává česky").

**Rozsah — jen řádky, které slovník zná (nebo jsou krátké a jednoznačné), ale do nabídky nedoléhají:**
- CENA NEZAHRNUJE: text v `src/nabidka_proj.js` „Součástí ceny není řešení samostatných řízení vyplývajících … péče, a řešení …" × slovník „… vyplývající … péče a řešení …" — sjednotit (výchozí: slovníkový klíč podle textu nabídky, překlad beze změny);
- INŽENÝRSKÁ ČINNOST: „Podání a projednání na dotčených orgánech … STAVEBNÍM ÚŘADEM (Hasičský záchranný sbor, …)" × slovník bez závorky — doplnit celou větu (závorku přeložit podle šablon PROJ v4/v5 EN/DE/FR, jsou na Drive);
- popis ceny DPZ „Zpracování projektu pro DPZ, včetně PBŘ, STATIKY a ELEKTRO PROJEKTU" je ve slovníku, a přesto zůstává česky — zjistit proč (cesta bez `P()`?) a opravit;
- bez překladu: popis ceny DPS „Zpracování prováděcí dokumentace, včetně STATICKÉ ČÁSTI a ELEKTRO PROJEKTU", hvězdička DPZ „Cena je platná v případě návaznosti na STUDII PROVEDITELNOSTI.", IČ „V průběhu celého řízení komunikujeme …", „Vyřízení POVOLENÍ ZÁMĚRU (dle platného stavebního zákona a požadavků stavebního úřadu)" a štítek části 2 DPZ („Požárně bezpečnostní řešení …" v závorce) — znění vzít z přeložených šablon PROJ v4/v5, kde existuje; jinak návrh překladu označit v komentáři „NÁVRH PŘEKLADU — čeká na kontrolu J. V.".

**Mimo rozsah (nesahat):** souvislá próza `{ cz: … }` (úvody bloků STUDIE / DPZ / DPS, poznámky pod studií, řádky rozsahu) — záměrně česky, překlad jen na pokyn J. V.; zápis v obchodním rejstříku se nepřekládá (rozhodnutí J. V. 14. 10.).

1. Větev `claude/proj-preklad-zbytky` nad `origin/claude/slovnik-14-10` (navazuje na tamní změny `src/preklad.js`; posunul-li se mezitím `test` o sloučení slovníku, vezmi `origin/test` a napiš to). Do `test-draft` / `test` / `main` nic.
2. Nejdřív test (pojistka): rozšiř `src/test_proj_ad_preklad.js` nebo nová sada — online nabídka PROJ (všechny činnosti, AD nabízený) v EN/DE/FR: vyjmenované řádky jsou přeložené (`trStav(…).prelozeno`, bez české diakritiky); `{ cz }` próza zůstává česky (hlídá, že se rozsah nerozlezl). Doložit selhání před opravou.
3. Šablony PROJ v4/v5 EN/DE/FR stáhni konektorem Google Drive (subagent, ověřit ZIP) do složky mimo repozitář jen kvůli znění.
4. Verze podle dne commitu: 14. 10. → v14.10.8, 15. 10. → v15.10.3. CHANGELOG oddíl `## v<verze> — zbytky češtiny v nabídce PROJ (větev claude/proj-preklad-zbytky)`, PREDAVKA nahoru.
5. `./spust_testy.sh --smoke` zelené, `python3 nastroje/kontrola_udaju.py`, commity po bodech s počty před/po, push po každém bodu.
6. Zpráva J. V.: co přeloženo (s návrhy k odsouhlasení), testy před/po, co zůstává česky a proč; o sloučení rozhodne J. V.
