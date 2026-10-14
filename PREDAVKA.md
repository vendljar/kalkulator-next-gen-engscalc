# Předávka — 14. 10. 2026 večer: noční dávky, `test` = v14.10.6 (slovník + krycí list)

Pokyn J. V. 14. 10. večer: „slovník sluč a rozběhni vše, co jsi naplánoval na
dnešní noc i zítřek. Vše řádně otestuj a veškeré změny pošli rovnou do
prostředí test. Do main nic, dokud to nepotvrdím." Plán dávek:
`podklady/DAVKY_2026-10-14_noc.md` (větev `claude/davky-14-10`).

- **`main`** = eff7724 (v14.10.3), dál nic bez potvrzení J. V.
- **`test`** = v14.10.6: v14.10.5 (krycí list odeslané nabídky se dá
  doplňovat) + sloučená `claude/slovnik-14-10` (v14.10.4: zápis v OR se
  nepřekládá, řádek AD ve slovníku) — větev `claude/integrace-14-10c`.
- **Koordinační sezení** session_0191A71yUFarU952Vy7h2hc5 slučuje výsledky
  nočních dávek do `test` a nakonec pouští celé kolo s mutacemi nad výsledným
  stavem (K1 tím odpadá). Dávky v samostatných sezeních:
  R1 `claude/k24-roadmapa-p5` (session_01HvZWAVHqyk6PE8w5bNZxfo),
  O1 `claude/kryci-jine-zneni` (session_01HL2oQfXzE1yqypbQZ3TQaS),
  P1 `claude/proj-preklad-zbytky` (session_01JAUuerdfMdVrsDZxSRjRAj),
  R2 `claude/roadmapa-13-14-10` (spustí se po R1).
- `test-draft` beze změny (v14.10.1).
- Podklady pro kolo: `/home/user/kng_podklady_slovnik-14-10` (šablony
  z Disku) — příručku sestavit znovu pro výslednou verzi.

---

# Předávka — 14. 10. 2026 večer: větev `claude/slovnik-14-10` (v14.10.4), slovník a zápis v OR

Z `test` (v14.10.3, eff7724), zadání `podklady/PROMPT_slovnik_14_10.md`.
Do `test-draft` / `test` / `main` nic — o převodu rozhodne J. V.
Podrobnosti a testy před/po: CHANGELOG v14.10.4.

- **Hotovo (pushnuto):** bod 1 zápis v OR se nepřekládá (vrácen d9bedae,
  `test_firma_zapis.js` 19/72 → 91/0, příručka opravena); bod 2 řádek
  „100 % z celkové ceny za tuto činnost, fakturováno měsíčně" ve slovníku
  EN/DE/FR + odstavec AUTORSKÝ DOZOR (AD) se překládá
  (`test_proj_ad_preklad.js` 7/5 → 12/0).
- **Rozhodnuto J. V. 14. 10. 2026 („s tvými návrhy souhlasím") — výchozí
  volby dávky v14.10.2 platí, kód beze změny:**
  1. stará data bez volby AD (`proj.zadani.nabizetAD` chybí) = AD se tiskne;
  2. starší specifikace s vyplněným názvem akce = ruční přepis (nemění se);
  3. v kombinaci s P6 vyplňuje tabulka hodin krycího listu jen sloupec
     vedoucí strany (číslo OPR/OVP);
  4. AD v tabulce hodin „max. 30 h / měsíc", do celku se nepočítá.
- **Zápis v OR se nepřekládá** (J. V. 14. 10.) — platí trvale; nevracet
  vzory `PREKLAD_SOUDY`.
- **Co v online nabídce PROJ v EN/DE/FR dál zůstává česky (bez opravy,
  mimo zadání — k rozhodnutí J. V.):**
  - souvislá próza `{ cz }` záměrně česky: úvod bloků STUDIE PROVEDITELNOSTI,
    DPZ, DPS; poznámky pod studií (2 paré, 5 pracovních dní na připomínky,
    rozšíření studie do DPZ); řádky rozsahu studie a DPZ (vizuální
    prohlídka, PŮVODNÍ STAV, ROZSAH BOURÁNÍ, NAVRHOVANÝ STAV, situace
    stavby, dokumentace stávajícího/nového stavu, bourací dokumentace)
    a štítek části 2 DPZ („Požárně bezpečnostní řešení…" v závorce);
  - slovník je zná, ale znění se liší (pravděpodobně drobná neshoda textu):
    CENA NEZAHRNUJE „Součástí ceny není řešení samostatných řízení
    vyplývajících… péče, a řešení…" (slovník má „vyplývající… péče a"),
    INŽENÝRSKÁ ČINNOST „Podání a projednání… (Hasičský záchranný sbor, …)"
    (slovník bez závorky), popis ceny DPZ „Zpracování projektu pro DPZ,
    včetně PBŘ, STATIKY a ELEKTRO PROJEKTU" (ve slovníku je — prověřit,
    proč se nepoužije);
  - bez překladu: popis ceny DPS „Zpracování prováděcí dokumentace, včetně
    STATICKÉ ČÁSTI a ELEKTRO PROJEKTU", hvězdička DPZ „Cena je platná
    v případě návaznosti na STUDII PROVEDITELNOSTI.", IČ „V průběhu celého
    řízení komunikujeme…", „Vyřízení POVOLENÍ ZÁMĚRU (dle platného
    stavebního zákona…)".
- **Podklady:** `/home/user/kng_podklady_slovnik-14-10` (30 šablon z Disku
  — CN v7/v11/v13/v14/v15 + jazyky, PROJ v3/v4 + EN/DE/FR, SoD v1/v2, plná
  moc; příručka v14.10.4 ze snímků).
- **Další krok:** celé kolo s mutacemi nad touto větví (ověří i sloučený
  stav v14.10.3), výsledek do CHANGELOG a sem; release odkazy v14.10.3
  a v14.10.4.
# Předávka — 14. 10. 2026 večer: větev `claude/kryci-jine-zneni` (v14.10.7, O1)

- **`claude/kryci-jine-zneni`** nad `test` (v14.10.5, 3538875): „jiné znění"
  v krycím listu (`klVyber` / `klpVyber`) je nově v obalu zámku
  (`ZAMEK_CHRANENE` + `ZAMEK_KRYCI_FUNKCE`) — u pole nabídky zamčené
  varianty dialog „Uzamčená varianta", hodnota zůstane. Zadání
  `podklady/PROMPT_kryci_jine_zneni.md` (větev `claude/davky-14-10`).
- Testy: `overit_kryci_po_tisku.mjs` 19/27 → 27/27, `overit_lista.mjs`
  255/255, smoke 243/0/2 (přeskočeno `test.js` a `overit_manual.mjs` —
  příručka se v této dávce nesestavovala). Ruční mutace obalu 2/2 zabité.
  Server beze změny, mutace serveru netřeba.
- **Čeká na integraci:** celé kolo s mutacemi nad výsledným stavem pustí
  koordinační sezení J. V. při sloučení do `test`. Konflikty čekej
  v CHANGELOG, PREDAVKA a `verze.txt` (v14.10.6 drží I1).
- Podklady (šablony z Drive) `/home/user/kng_podklady_kryci-jine-zneni`.
  Na Disku je nová `Sablona_NABIDKA_PROJ_v5` (+EN/DE/FR, 14. 10.), ta se
  nestahovala. SoD v1 na Disku pod tím názvem není, místo ní jsou varianty
  bez čísla z 14. 8.

---

# Předávka — 14. 10. 2026 večer: `test` = v14.10.5 (krycí list odeslané nabídky), `main` = v14.10.3

- **`main`** = eff7724 (v14.10.3) — převod z `test` na pokyn J. V. 14. 10.
  („pošli aktuální test do main"), fast-forward.
- **`test`** = v14.10.5 z větve `claude/kryci-odemceny-14-10` (pokyn J. V.
  14. 10.: „krycí list by nemusel být zamčený … uprav a pošli do testu"):
  po tisku nabídky jsou v krycím listu zamčená jen pole nabídky, po SoD celý;
  sady 244/0/1, nové testy a mutace serveru 5/5 (CHANGELOG v14.10.5).
  Celé kolo s mutacemi nad v14.10.5 zatím neproběhlo — pustit při dalším
  sloučení. Podklady `/home/user/kng_podklady_kryci-14-10`.
- **`claude/slovnik-14-10`** (v14.10.4, nad v14.10.3): zápis v OR se
  nepřekládá, řádek AD ve slovníku, výchozí volby v14.10.2 rozhodnuté —
  nesloučeno, o převodu rozhodne J. V. Při sloučení do `test`: verze na
  další číslo, konflikty čekej v CHANGELOG, PREDAVKA, `manual/obsah.json`
  (úvod novinek) a `verze.txt`.
- `test-draft` beze změny.
- Pozn. mimo zadání: `klVyber` / `klpVyber` s volbou „jiné znění" mažou
  hodnotu pole bez dotazu na zámek (i u pole nabídky zamčené varianty →
  server pak uložení odmítne „Neuloženo"). Starší chování — opraveno ve
  větvi `claude/kryci-jine-zneni` (v14.10.7, nesloučeno).

---

# Předávka — 14. 10. 2026 odpoledne: `test` = v14.10.3 (připomínky obchodu + K23T-N1)

`test` = v14.10.3: sloučení `claude/pripominky-14-10` (v14.10.2, kolo zelené)
a `claude/k23-odm-prohluben` (v14.10.2, kolo zelené) na pokyn J. V. 14. 10.;
po sloučení kolo bez mutací VŠE ZELENÉ (sady 241/0/1, statické 3/3).
`test-draft` a `main` beze změny. Release v14.10.2 a v14.10.3 vydává J. V.

**Rozhodnutí J. V. 14. 10. k závěrečné zprávě v14.10.2:** výchozí volby
odsouhlaseny (AD u starých dat tisknout; starší název akce specifikace =
ruční; hodiny jen sloupec vedoucí strany; AD v hodinách „max. 30 h / měsíc"
mimo celek); **zápis v OR nepřekládat** (vrátit bod 6); řádek „100 % z celkové
ceny za tuto činnost, fakturováno měsíčně" doplnit do slovníku EN/DE/FR.
Řeší nové sezení ve větvi `claude/slovnik-14-10` nad `test` — zadání
`podklady/PROMPT_slovnik_14_10.md`; to sezení pustí i celé kolo s mutacemi
nad sloučeným stavem.

---

# Předávka — 14. 10. 2026: větev `claude/pripominky-14-10` (v14.10.2), připomínky obchodu

Z `test-draft` (v14.10.1, 823c61e). Připomínky D. Sikory a J. Laudy,
rozhodnutí J. V. 14. 10. Do `test-draft` / `test` / `main` nic — rozhodne J. V.
Podrobnosti a testy před/po: CHANGELOG v14.10.2.

- **Hotovo (pushnuto):** bod 1 autorský dozor jen když se nabízí (volba
  v kartě Cenová nabídka PROJ, výchozí NE, stará data jako dřív; šablona
  PROJ v5 `vyrob_sablony.js --proj-v5` — vyrobená v5 + EN/DE/FR je jen
  v `/home/user/kng_podklady_pripominky-14-10`, do aplikace ji nahraje J. V.);
  bod 2 název akce specifikace z hlavičky (ručně + ↺); bod 3 sokl ve
  specifikaci (společná `tsSoklRadek`); bod 6 zápis v OR v EN/DE/FR (vzor
  slovníku — návrh překladu ke kontrole); **hodiny z kalkulace** v krycích
  listech BO (zadání J. V. během dávky, návrh
  `podklady/NAVRH_HODINY_KRYCI_LIST_2026-10-14.md` odsouhlasen, celé hodiny);
  harness `overit_pripominky_14_10.mjs`; příručka (úvod v14.10.2).
- **Celé kolo VŠE ZELENÉ:** nad 1410141 mutace jádra 201/201, serveru 393/393,
  statické 3/3, sady 238/3/1 (dvojí id tabulky hodin, počet pravidel
  v overit_lista) → opraveno 8ffce8f, kolo bez mutací 241/0/1, statické 3/3.
  Podklady `/home/user/kng_podklady_pripominky-14-10`.
- **Převod do `test`** na pokyn J. V. 14. 10. (fast-forward z 823c61e);
  `test-draft` beze změny (rozhodne J. V.). Release odkaz v14.10.2 poslán.
- **Paralelně `claude/k23-odm-prohluben`** (K23T-N1, opláštěná prohlubeň P2):
  hotovo, kolo VŠE ZELENÉ, nesloučeno — čeká na J. V.
- **Výchozí volby k potvrzení:** stará data bez volby AD = AD se tiskne;
  starší specifikace s vyplněným názvem = ruční přepis (nemění se); v kombinaci
  s P6 má tabulka hodin vyplněný jen sloupec vedoucí strany (číslo OPR/OVP);
  AD v tabulce hodin „max. 30 h / měsíc", do celku se nepočítá.
- **Neřešeno dle zadání:** body 4, 5, 9; 7 prověřuje J. V.; 8 (Helios) jen návrh.
# Předávka — větev `claude/k23-odm-prohluben` (v14.10.2, 14. 10. 2026)

Z `test` (823c61e, v14.10.1). Oprava nálezu K23T-N1 (opláštěná prohlubeň P2
nejde uložit) — detaily v CHANGELOG v14.10.2 této větve. Do `test-draft`,
`test` ani `main` nic; **B134 (0af419c) se nesmí dostat do `main` bez téhle
opravy.** Ověření pro J. V. po nasazení na test: zakázka TEST s prohlubní
a „Opláštit i prohlubeň" se uloží, vytiskne a zamkne („shoda"); v kole 24
projdou C001, C018, C029, C035, C046, C063. **Celé kolo nad 4717864 VŠE
ZELENÉ** (sady 235/0/1, jádro 194/194, server 395/395, statické 3/3).
Při slučování s `claude/pripominky-14-10` (taky v14.10.2): konflikty čekej
v CHANGELOG, PREDAVKA, `mutace_jadro.mjs` (nové mutace obou větví) a verzi.

---

# Předávka — 14. 10. 2026 ráno: noční integrace v14.10.1 zelená (`claude/integrace-14-10`)

Noční větve `claude/listy-404`, `claude/bezpecnost-noc`,
`claude/vyjimky-schvalovani`, `claude/prirucka-13-10` (každá s vlastním
zeleným kolem) sloučeny do `claude/integrace-14-10` nad v13.10.2 = v13.10.4;
**celé kolo nad b51af9b VŠE ZELENÉ** (sady 235/0/1, jádro 193/193, server
393/393, statické 3/3); zápis výsledku = v14.10.1 (jen verze a dokumentace).

Čeká na J. V.: převod do `test-draft` a `test` (push do sdílených větví
zablokovalo oprávnění sezení — fast-forward z 1df7283, stačí převést
`claude/integrace-14-10`); `main` až po ověření na testu; release odkaz
v14.10.1 (zahrnuje v13.10.2–v13.10.4).

Otázky (výchozí): (1) celá starší verze ceníku u obchodníka = cenová výjimka
do schvalování (ano); (2) přidělit Vedoucímu právo sleva.schvalovani v matici
(ano); (3) mez pásu „jiné“ = nejnižší ceníková sazba opláštění pro typ šachty
(ano); (4) rozměr pod 0,6 m = 400 (ano); (5) chybné staré heslo u „Změnit
heslo“ odhlásí — opravit (ano, další dávka); (6) příručka: kurzíva (ano),
novou příručku na Disk nahraje J. V. Příručka v14.10.1 k nahrání se sestaví
`manual/sestav.sh` ze snímků (`node manual/snimky_auto.mjs`).

---

# Předávka — 13. 10. 2026 večer: v13.10.2 zelená, převod do test-draft a test; noční dávky

Integrace tří větví (`claude/davka-13-10`, `claude/cenik-barvy`,
`claude/k22-p2-p6`) = v13.10.2 ve větvi `claude/integrace-13-10b`, **celé kolo
VŠE ZELENÉ** (sady 232/0/1, jádro 193/193, server 358/358, statické 3/3).
Převod do `test-draft` a `test` (pokyn J. V.) — push zablokovalo oprávnění
sezení, čeká na J. V. (fast-forward z 1df7283). Do `main` až po ověření na testu.

Odpovědi J. V. z dialogu 13. 10. (artefakt „KNG rozhodnutí 13. 10.“):
lišty #404 ano dle návrhu; B35 cas/ jen pro existující zakázku; B77 citlivé
akce správce s heslem; směs ceníku do schvalování; pás „jiné“ do schvalování;
meze rozměrů jen zdvih, šířka, hloubka < 0,6 m (ostatní neřešit); test ano;
main po ověření na testu; větve NEmazat; popisy starších releasů NE;
příručka ano. Další dávka: všech šest bodů.

Noční větve (z `claude/integrace-13-10b`, každá s celým kolem):
| Větev | Stav |
|---|---|
| `claude/prirucka-13-10` | hotovo 846c502, kolo zelené |
| `claude/listy-404` | hotovo 181fdd1, kolo zelené |
| `claude/bezpecnost-noc` | hotovo 2f98268, kolo zelené |
| `claude/vyjimky-schvalovani` | běží |
Ráno: integrace nočních větví do nové verze, celé kolo, převod na pokyn J. V.

# Předávka — větev `claude/listy-404` (v13.10.3, noc 13./14. 10. 2026)

Z `claude/integrace-13-10b` (v13.10.2). Roadmapa #404 — lišty rozpracované
a odeslané zakázky podle návrhu odsouhlaseného J. V. 13. 10. 2026. Do
`test-draft` nic (rozhodne J. V.). Detaily a testy před/po: CHANGELOG v13.10.3.

- **Hotovo:** model `listaZakazkyRozhodni` (zamek.js) + Node test; jediná
  žlutá lišta „Rozpracovaná kalkulace" (Pokračovat / Založit novou, odkaz
  Zahodit zálohu), odeslaná jedním řádkem, modrý pruh Odemknout k úpravám
  jen s právem `zamek.odemknout`, cizí zakázka jen Založit novou; záloha
  odeslané nabídky se nenabízí; zakázka jen ke čtení nepřepisuje zálohu;
  příručka (kap. 8, 29, slovníček); harnessy overit_zaloha_lista, overit_online,
  overit_v23, overit_manual.
- **Kolo nad 7e19e40 VŠE ZELENÉ:** sady 233/0/1 (test.js), jádro 193/193, server 358/358, statické 3/3.
- **Výklady k potvrzení (výchozí v závorce):** odeslaná = aktivní varianta
  zamčená (ano — klon odeslané má žlutou lištu); v oranžové liště zůstalo
  „Založit novou zakázku" (ano); zápis do odeslané nabídky jen ke čtení
  nabídne klon místo odemknutí okna (ano).
- **Při slučování:** příručku obchodníka přegenerovat z `manual/obsah.json`
  (kopie podkladů pro kolo: `/home/user/kng_podklady_listy-404`, obsah
  příručky vložen z této větve).

---

# Předávka — větev `claude/bezpecnost-noc` (v13.10.3, noc 13./14. 10. 2026)

Subagent sezení session_01WrUq3gXEhsWk8cxRWfPvsg, z `claude/integrace-13-10b`
(v13.10.2). Zadání J. V. 13. 10. 2026 (obojí „Ano"): B35 a B77. Detaily
a testy před/po: CHANGELOG v13.10.3. Do `test-draft` nic — na pokyn J. V.

- **B35 hotovo** — klíč `cas/` v analytice jen pro zakázku z rejstříku.
- **B77 hotovo** — založení správce, povýšení na správce, reset cizího hesla
  a obnova účtů z otisku chtějí `hesloSpravce` (UI se ptá dialogem).
- **Celé kolo VŠE ZELENÉ** nad 9756817: sady 232/0/1, jádro 193/193,
  server 368/368, statické 3/3.
- Při slučování: konflikty čekej v `netlify/mutace.mjs` (nové mutace B35/B77),
  `netlify/test_prava.mjs` (matice + blok B77), `src/ui/online_ui.js`
  (onlineApi, správa účtů, obnova). Roadmapa needitována (B35 je v položce
  „Dlouhodobě otevřené nízké nálezy", B77 v F5) — doplní integrace.

# Předávka — 13. 10. 2026 noc: větev `claude/vyjimky-schvalovani` (v13.10.3)

Subagent sezení session_01WrUq3gXEhsWk8cxRWfPvsg. Větev z `claude/integrace-13-10b`
(v13.10.2, 0512c51). Do `test-draft`/`test`/`main` nic. Detaily: CHANGELOG v13.10.3.

## Hotovo (pushnuto)
- 801f2ff — mez 0,6 m pro zdvih, šířku a hloubku (nový zámek OCK 400, zábrana „rozmery").
- a168f6c — cenové výjimky (`src/vyjimky.js`): směs ceníku a pás „jiné" pod
  ceníkovou sazbou → schválení nadřízeným (karta „Cenové výjimky" v záložce
  Schvalování, server 403 u nového zámku bez schválení).
- 15f6a53 — testy #395 V3 / B136 čtou větu V3, overit_lista 34 pravidel.
- **Celé kolo nad 15f6a53 VŠE ZELENÉ** (sady 234/0/1, jádro 193/193, server 383/383, statické 3/3).

## Otázky pro J. V. (výchozí odpověď)
1. Celá starší verze ceníku (kvitance „ceny jsou dohodnuté") se taky liší od
   platného → u obchodníka do schvalování. *Výchozí: ano.*
2. Schvaluje tentýž nadřízený jako slevy (`sleva.schvalovani`, výchozí matice
   ho Vedoucímu nedává — jen administrátor). *Výchozí: ano, přidělit v matici.*
3. Mez pásu „jiné" = nejnižší kladná ceníková sazba opláštění šachty. *Výchozí: ano.*
4. Kód odmítnutí rozměru pod 0,6 m je 400 (jako B137), ne 403. *Výchozí: ponechat.*

---

# Větev `claude/prirucka-13-10` (v13.10.3) — příručka obchodníka

Z `claude/integrace-13-10b` (v13.10.2). Příručka (`manual/obsah.json`,
snímky, renderer) aktuální k v13.10.2: P6 zámek strany, P2, barvy ceníků,
B77-zbytek, B6, B101; detaily CHANGELOG v13.10.3. Hotové HTML jen
v `/home/user/kng_podklady_prirucka-13-10` (sestavit znovu:
`node manual/snimky_auto.mjs <mimo repo>/snimky.json` a
`bash manual/sestav.sh <snimky.json> <složka>`).
- **Navazující po integraci #404 (`claude/listy-404`):** kapitolu o lištách
  rozpracované/odeslané zakázky (kap. 6, 8, 29) přepsat podle nových lišt
  a přefotit snímky — tady se vědomě neměnila.
- Kolo: viz CHANGELOG v13.10.3.

# Předávka — 13. 10. 2026: dávka po 22. kole ve větvi `claude/davka-13-10` (v13.10.1)

Sezení session_01WrUq3gXEhsWk8cxRWfPvsg (založilo koordinační sezení 22. kola).
Větev z `test-draft` v12.10.4 (1df7283). Do `test-draft`/`test`/`main` nic —
na pokyn J. V. Detaily a testy před/po: CHANGELOG v13.10.1.

## Hotovo (pushnuto)
- Pravidlo J. V. 13. 10.: odkaz na release s popisem změn — `CLAUDE.md`,
  `nastroje/release_odkaz.py` (+ test). Skilly needitovány — pravidlo doplnit
  do skillu `kalkulator-next-gen` (oddíl releasy) ručně.
- A (#402) hlídač harnessů + `timeout` v `spust_testy.sh`.
- #400 zbytek: B138, B77-zbytek, B107 (+B42, B25), B129, B130 → #400 hotovo.
- F (#403): B83, B81, B103, B101, B105, B6, B35 — všechny body F hotové.

- Revize dávky (audit dvěma čočkami, jen čtení): vysoký nález žádný; opraveno
  regrese B105 (409 po tisku), obchvaty B101, B138 (výslovná nula), B103,
  souběh B6, drobnosti — CHANGELOG „Revize dávky".
- **Celé kolo nad dd9c24b VŠE ZELENÉ** (sady 228/0/1, jádro 189/189, server
  346/346, statické 3/3). Kolo nad ea34e65 bylo červené (B133 ×2, platnost
  relace, literál hesla) — opraveno.

## Běží / čeká
- Paralelně (subagenti tohoto sezení, zadání J. V. 13. 10. odpoledne):
  - `claude/k22-p2-p6` z 1df7283 — P2 „Opláštit i prohlubeň", P6 zámek strany
    (vynulování druhé strany, ruší „Počítat i tuhle stranu"); prompt
    `PROMPT_PARALELNI_VETEV_K22_P2_P6.md` (kopie mimo repo v kng_podklady/prompty).
    Konflikt čekej v `zahrJenRealizaceNabidnout` (B129 tady × P6 tam).
    **Hotovo:** a42f9ea, kolo zelené (sady 226/0/1, jádro 193/193, server
    345/345 po vyřazení nedosažitelné mutace B137 „dokument strany PROJ").
  - `claude/cenik-barvy` z 1df7283 — probarvení buněk ceníků (0/prázdné světle
    červeně, Kč > 40 000 světle oranžově), odebrání „Historická kalkulace".
    **Hotovo:** 10fd294, kolo zelené (sady 221/0/6 — 5 harnessů bez podkladů,
    jádro 189/189, server 333/333, statické 3/3).
  - Všechny tři větve nesou v13.10.1 → při integraci nová verze.
- #404 lišty — návrh níže, čeká na J. V.

## Návrh #404 — lišty rozpracované / odeslané zakázky (k odsouhlasení)
Dnes jsou to tři nezávislé mechanismy: (1) žlutá „V prohlížeči je
rozpracovaná kalkulace… Obnovit / Zahodit zálohu" (`historie.js`, záloha
v prohlížeči), (2) oranžová lišta zámku „odeslaná nabídka – needituje se…
Klonovat / Založit novou" (`zamek_ui.js`), (3) modrá „Nabídka je otevřená jen
ke čtení… Odemknout k úpravám" (`common.js` zamekCteniLista) + štítek dole.
Návrh (výchozí odpovědi J. V. v závorkách):
1. Neodeslaná zakázka (žádná varianta vytištěná): jediná žlutá lišta
   „Rozpracovaná kalkulace <číslo · název>, naposledy <kdy>" s tlačítky
   **Pokračovat v rozpracované kalkulaci** (= obnoví zálohu z prohlížeče, je-li
   novější, a odemkne režim jen ke čtení) a **Založit novou kalkulaci**.
   Modrá lišta „jen ke čtení" u neodeslané vlastní zakázky odpadá — tu
   roli převezme žlutá. Zahodit zálohu = malý odkaz v liště (ano).
2. Odeslaná zakázka: žádná žlutá lišta ani nabídka zálohy (záloha odeslané
   zakázky se tiše zahodí — ano). Zůstane jen jednořádková informace
   „Odeslaná nabídka (… vytištěno …) — needituje se" s tlačítky Klonovat
   a pokračovat / Založit novou (ano, bez dlouhého textu).
3. Administrátor (a vedoucí? — výchozí: jen role s právem `zamek.odemknout`
   v matici zobrazení, dnes administrátor) vidí u odeslané nabídky modrý pruh
   **Odemknout k úpravám** (odemkne zámek varianty s potvrzením a záznamem).
   Obchodník modrý pruh nevidí.
4. Cizí neodeslaná zakázka (autor jiný obchodník): žlutá lišta jen s
   „Založit novou kalkulaci" a větou, kdo ji založil (zachová B-pravidlo
   zamekCteniSmiOdemknout).
Rozsah: `historie.js`, `zamek_ui.js`, `common.js`, harnessy
overit_zaloha_lista / overit_online / overit_dialogy / overit_neulozene;
odhad 1 dávka (½ dne). Po odsouhlasení samostatná větev.

## Otázky pro J. V. (výchozí odpověď)
1. B6: odhlášení odhlásí účet na všech zařízeních (ano — jinak by server
   musel vést seznam relací).
2. B35: strop 5 000 zakázek s měřeným časem (ano).
3. #404 návrh lišt výše (ano, jak je napsáno).

# Předávka — 13. 10. 2026: větev `claude/cenik-barvy` (v13.10.1)

Paralelní větev z `test-draft` (1df7283, v12.10.4) podle zadání J. V. 13. 10. 2026:
1. **Probarvení buněk ceníků OCK a PROJ** — 0/prázdné světle červeně, > 40 000 Kč
   (jen položky s jednotkou „Kč…") světle oranžově; živě při psaní, jen vzhled.
2. **Odstraněno tlačítko „↩ Historická kalkulace…"** (lišta OCK/PROJ, seznam
   kalkulací) i s oknem a modelem archivu; `puvodPopis` zůstává pro staré varianty.
Výklad, testy před/po: CHANGELOG v13.10.1. Do `test-draft`/`test`/`main` nic —
o sloučení rozhoduje J. V. (u sloučení: verze se srovná, CHANGELOG/PREDAVKA ručně).
**Kolo VŠE ZELENÉ:** sady 221/0/6, mutace jádra 189/189, serveru 333/333, statické 3/3.
Otevřené: prázdná Cena Zahraničí („jako ČR") červeně nesvítí; pole přirážky a DPH
nad tabulkou se neprobarvují — výchozí výklad, změní se na pokyn.

# Předávka — 13. 10. 2026: paralelní větev `claude/k22-p2-p6` (P2 + P6, v13.10.1)

Subagent sezení session_01WrUq3gXEhsWk8cxRWfPvsg podle promptu J. V.
`PROMPT_PARALELNI_VETEV_K22_P2_P6.md`. Větev z `test-draft` = `1df7283`
(v12.10.4). Do `test-draft`/`test`/`main` nic; o sloučení rozhoduje J. V.
Netlify: produkční větve jsou `main` (ostrá) a `test` (testovací), branch
deploy pro `claude/…` v `netlify.toml` ani v `NASAZENI_NETLIFY.md` není.

| Bod | Stav |
|---|---|
| P2 — „Opláštit i prohlubeň" | hotovo (commit P2), test `src/test_oplastit_prohluben.js` (1/5 → 7/0) |
| P6 — zámek strany: vyřazená strana zamčená a vynulovaná | hotovo (commit P6), `src/test_zamek_strany.js` (17/31 → 52/0), server blok P6 v `netlify/test_koncova_cena.mjs` (74/5 → 82/0), UI v `overit_zahranicni.mjs` |
| celé testovací kolo | hotovo (2 části kvůli 2h limitu procesu): sady 226/0/1, mutace jádra 193/193, serveru 345/346 → nedosažitelná B137 mutace vyřazena s komentářem, statické 3/3 — CHANGELOG |

Rozhodnutí D6a–D6g a výklady: CHANGELOG, oddíl „větev claude/k22-p2-p6".
Další krok (J. V.): rozhodnout o sloučení do `test-draft` (verze se
sjednotí s v13.10.1 z `claude/davka-13-10`); po sloučení ověření podle
promptu (TEST zakázka OPR/OVP, K22-C001).

Otevřené otázky pro J. V. (s výchozí odpovědí, jak je ve větvi):
1. Serverové kontroly „nikomu" (záporné částky B111, rozměry B137 při
   uložení, typy #340) platí dál i pro data vyřazené strany — uvolněné jsou
   jen kontroly nového zámku. *Výchozí: ponechat.*
2. Otisk souhrnu nového zámku (`zamek.otisk`, z porovnání variant) nese
   u čísla OPR jen OCK (archiv „odesláno za"); zmrazený výsledek
   `zamek.vysledek` dál obě strany. *Výchozí: takto.*
3. Snímky obrazovky v příručce (lišta zámku strany) se nepřegenerovaly.
   *Výchozí: přegenerovat při příští dávce příručky.*
4. Zakázky v ostré, které dnes počítají obě strany (čísla obou stran,
   dřívější tlačítko), po nasazení ukážou druhou stranu vynulovanou
   a kontrola „stranyDriv" na to upozorní. *Výchozí: bez migrace dat.*

Souběžně: větev `claude/davka-13-10` mění `zahrJenRealizaceNabidnout`
(`src/zakazka.js`, B129: nic nenabídne u zakázky se zamčenou variantou) —
při slučování s P6 čekat konflikt v téže funkci (P6 přidává podmínku D6f
a mění návratovou hodnotu na `'zrusitJenOck'`); obě podmínky ponechat.


**Celé kolo nad b2181e9 VŠE ZELENÉ** (sady 232/0/1, jádro 193/193, server 358/358, statické 3/3).
---

# Předávka — 12. 10. 2026 noc: integrace N1–N3 ve větvi `claude/integrace-13-10` (v12.10.4)

Integrační subagent koordinačního sezení session_01CKiH2sXWq6U8xoJwqivhiN.
Větev z `test-draft` (v12.10.2) + merge N1 (`claude/koncova-cena-398`), N2
(`claude/sablony-399`), N3 (`claude/slovnik-hromadne`) a `claude/kolo22-v12.10.2`.
Konflikty a jejich řešení: CHANGELOG v12.10.4. Roadmapa: #398, #399 hotovo,
#400 čeká (B138, B77-zbytek, B107, B129, B130), #401 hotovo.
Do `test-draft`/`test`/`main` nic — převod dělá koordinátor po zeleném kole.
**Celé kolo VŠE ZELENÉ** (105 min 57 s): sady 224/0/1, mutace jádra 189/189,
serveru 333/333, statické 3/3. Další krok (koordinátor): převod do `test-draft`
a `test`, release odkaz v12.10.4 pro J. V.

---

# Předávka — 12. 10. 2026 večer: 22. kolo hotové, noční dávky N1–N3 běží

Koordinační sezení **session_01CKiH2sXWq6U8xoJwqivhiN** (22. kolo nad v12.10.2), větev
`claude/kolo22-v12.10.2`. `main` = v12.10.1 (86be538), `test-draft` = `test` = v12.10.2 (d562da1).

**Kolo VŠE ZELENÉ** (82 min): sady 222/0/1, mutace jádra 169/169, serveru 249/249, statické 3/3.
**Audit: 5 nových VYSOKÝCH** (B133–B137, obchodník zamkne nabídku se sníženou cenou bez schválení;
B134 záporná rezerva i v běžném UI) — platí i v ostré v12.10.1 (ověřeno pokusem). Celkem B133–B150;
roadmapa #398 (vysoké), #399 (střední), #400 (nízké/info). Na Disku (Testovani): audit
`2026-10-12_kalkulator_BEZPECNOSTNI_AUDIT_v12.10.2.md` (1d5W08MWoOWdVOj9pdm20z5bOd92f5rXX),
`TESTOVACI_PROTOKOL_2026-10-12_v12.10.2.xlsx`, `STAV_KOLO22_2026-10-12.md`.

**Pokyn J. V. 12. 10. (večer):** „souhlasím s výchozími, dokonči N3, spusť N1 a N2 po kole, následně
commit do test. stále platí do ostré main nic neposílej.“ Výchozí odpovědi: B138 opravit jako nález;
B137 server odmítne každé uložení s rozměry ≤ 0 (prázdné ≠ nula).

| # | Dávka | Sezení / větev | Stav |
|---|---|---|---|
| N1 | #398 B133–B137 (+ B145, mutace B128) | session_01D1a2z6V9wHr72cRN43yLjt / `claude/koncova-cena-398` | běží |
| N2 | #399 + část #400 (šablony B139–B143, B100-zbytek, B144, B146–B150) | session_01Jg4PxyyuYpMpQprT1UPipw / `claude/sablony-399` | běží |
| N3 | slovník: tabulka J. V. (44 znění), hromadné převzetí, slovník na serveru jako ceník (#401) | subagent tohoto sezení / `claude/slovnik-hromadne` | běží |
| N5 | integrace N1–N3 do `claude/integrace-13-10`, celé kolo, pak `test-draft` a `test` (NE `main`), release odkazy | toto sezení (nebo nástupce) | čeká |

Konflikty k čekání při integraci: `roadmapa/roadmap.json` (#398–#400 zde, #401 v N3), `CHANGELOG.md`,
`PREDAVKA.md`, `src/uloziste.js` (N1 i N2 B144), verze (každá větev v12.10.3 → při integraci nová verze dne).

Podklady v kontejneru: `/home/user/kng_podklady` (CN v14/v15, PROJ v3/v4, SoD v2, plná moc, příručka v12.10.2).
Worktree: `/home/user/kng_audit` (test-draft, jen čtení), `/home/user/kng_main` (main), `/home/user/kng_slovnik` (N3).

---

# Předávka — 12. 10. 2026 večer: větev `claude/koncova-cena-398` (v12.10.3, #398)

Noční dávka N1 (založilo koordinační sezení 22. kola session_01CKiH2sXWq6U8xoJwqivhiN,
pokyn J. V. 12. 10.). Větev z `test-draft` v12.10.2 (d562da1). Do `test-draft`,
`test` ani `main` se z této větve nic nepouštělo — integraci dělá koordinační
sezení. Roadmapa #398 je v koordinační větvi `claude/kolo22-v12.10.2`
(tady jen odkaz v CHANGELOG).

## Hotovo
- B134, B133, B135 (+B145), B136, B137, B150a — viz CHANGELOG v12.10.3;
  nová sada `netlify/test_koncova_cena.mjs`, mutace serveru doplněny.
- Nezávislá revize (2 subagenti): N1 `cenik.jenZahr`, N2 `nepocitat`,
  Model 1 (`ock.fixes`), N3 záporná sazba pásu „jiné", N4 dotisk jiné
  strany — opraveno (028edad); mutace jádra K17-N91 přesměrovány (c8aecb4).
- Kolo nad 0af419c: červené jen kvůli věcem opraveným v 028edad/c8aecb4
  a staré verzi příručky v podkladech (kopie přejmenována na v12.10.3).
- **Celé kolo nad 7291879 VŠE ZELENÉ** (sady 223/0/1, mutace jádra
  169/169, serveru 278/278, statické 3/3; 102 min 44 s).
- Nízký nález mimo zadání: `overit_online.mjs` po selhání testu B59 neskončí,
  ale visí (page.evaluate) — kolo pak stojí; výchozí: opravit v příští dávce.

## Otázky pro J. V. (s výchozí odpovědí)
1. **Výjimka B113** (nová zakázka s celým ceníkem sestavení se uloží, i když
   je ceník zveřejněný) — zadání ji navrhovalo zrušit, test e4 ji chce.
   Po B133 + B136 z ní nevznikne směs ani zámek. *Výchozí: ponechat.*
2. **Věcné meze rozměrů a počtů** (revize, střední): zdvih 0,001 m, hloubka
   0,01 m, nástupiště 0/0,5, sloupky 2,5, čistý vstup širší než šachta
   projdou (i v UI) a sníží cenu o 4–40 %. *Výchozí návrh: na novém zámku
   OCK zdvih ≥ 2 m, šířka i hloubka ≥ 0,8 m, rozteč ≥ 0,5 m, sloupky
   a nástupiště celé číslo ≥ 1 (sloupky ≥ 4), čistý vstup + 2× rám ≤ šířka —
   čísla potvrdí J. V.; do té doby beze změny.*
3. **Kladná ruční sazba pásu „jiné"** (1 Kč/m²) — funkce UI pro atyp,
   cenu sníží (−17 %). *Výchozí: ponechat jako obchodní rozhodnutí,
   případně do schvalování.*
4. **Záporná přirážka sekce PROJ / globální přirážka** administrátora —
   ponecháno jako vědomá výjimka (BEZPECNOST_MEZE.md). *Výchozí: ponechat.*

## Další krok
Koordinační sezení: sloučit `claude/koncova-cena-398` do `test-draft`
(po zeleném kole), release v12.10.3 dle pokynu J. V.

---

# Předávka — 12. 10. 2026 večer: noční dávka N2 ve větvi `claude/sablony-399` (v12.10.3)

Sezení N2 (založené koordinačním sezením 22. kola session_01CKiH2sXWq6U8xoJwqivhiN).
Větev z `test-draft` v12.10.2 (d562da1). Do `test-draft`/`test`/`main`
nic — integraci dělá koordinační sezení (souběžně N1 v `claude/koncova-cena-398`
mění `src/uloziste.js` a `lib/zakazka_kontrola.mjs`; N2 v `uloziste.js` jen
malý strop B144 v `uloZaporneVZadani`, `zakazka_kontrola.mjs` netknuta;
konflikt čekej ve `verze.txt`/CHANGELOG/PREDAVKA).

Hotovo (detail v CHANGELOG v12.10.3): B139, B140, B141, B142 (+ R1 z revize),
B143, B100-zbytek, B144, B146, B147, B148, B149 (mez), B150. Testy
před/po: test_sablona_obsah 77/23 → 114/0 (s podklady), test_obnova 192/8 →
200/0, test_profil 37/1 → 38/0, test_zaporne 30/3 → 33/0, test_prava 742/4 →
746/0, overit_xss 323/3 → 326/0. Revizní subagent (jen čtení): žádný obchvat
B139–B143; našel falešné odmítnutí (R1: bajty PK\x05\x06 v obrázku) —
opraveno tak, že B142 i #395 drží.

Celé kolo VŠE ZELENÉ: mutace jádra 188/188, serveru 275/275, statické 3/3,
sady 222/0/1 (opakované po přejmenování kopie příručky na v12.10.3).

Podklady v `/home/user/kng_podklady` (20 souborů vč. CN v15, SoD v2,
příručky přejmenované na v12.10.3) — firemní šablony kontrolou projdou všechny.

Otevřené (výchozí odpověď v závorce): B149 přísné ověření zámku i v obnově
(ne, ponechat jako mez); roadmapa #399/#400 — zápis nechávám koordinačnímu
sezení (ano).

---

# Předávka — 12. 10. 2026 večer: větev claude/slovnik-hromadne = v12.10.3 (#401)

Paralelní větev z `test-draft` v12.10.2 (d562da1); do `test-draft` jen na
pokyn J. V. Zadání J. V. 12. 10.: slovník ukládat jako ceník, hromadně převzít
odlišné znění, převzít jeho tabulku `SLOVNIK_ENG_2026-10-12.xlsx`.

Hotovo: tabulka převzata do `src/preklad.js` (44 rozdílných, 0 doplnit,
0 nových); tlačítko „Převzít všech N z tabulky"; `/api/slovnik` (zveřejnění
jen Administrátor, verze + historie, kontrola tvaru, strop 1 MB), klient
položí platný slovník po přihlášení, Nastavení → Slovník „Zveřejnit slovník";
slovník v záloze, otisku i obnově; roadmapa #401. Nálezy nezávislé revize
#401 (N1 razítko slovníku v zámku + upozornění při dotisku, N2–N7) opraveny
ve stejné větvi. Testy a výsledek kola (VŠE ZELENÉ nad d493a2b) v CHANGELOG
v12.10.3.

Čeká na J. V.: sloučení do `test-draft`; po nasazení slovník jednou
zveřejnit (tabulka je už v kódu, takže první verze ponese jen případné
další odchylky); odchylka od zadání — strop délky hesla 1000 místo 300
(zabudovaná hesla mají až 419 znaků).

---

# Předávka — 12. 10. 2026 odpoledne: main = v12.10.1, test = v12.10.2

`main` = **v12.10.1** (86be538, pokyn J. V. „pošli stávající test do main";
release vydán). `test-draft` = `test` = **v12.10.2** (B126 vysoká, B127,
B128, B131 z auditu 6. 10.; šablony CN v15; větev `claude/b126-cn-v15`).
Celé kolo zelené (sady 222/0/1, mutace jádra 169/169, serveru 249/249).

Šablony pro ostrou i test poslány J. V. (CN v15 + EN/DE/FR, PROJ v4 +
EN/DE/FR, SoD realizace v2, SoD projekce v2) — `nastroje/vyrob_sablony.js`
`--cn-v15`. V ostré byla platná CN v13: varování průvodce „chybí
PODM_ZALOHA1_PROC, PODM_FAKTURA2_PROC" je správně (od v14 platební kalendář).

Čeká na J. V.: release v12.10.2; 22. kolo (protokol + audit, B-čísla od
B133) — výchozí: další krok; zbytek auditu 6. 10.: B129, B130 (nízké),
B132 (info); smazání sloučených větví; převod v12.10.2 do main.

Prostředí: podklady v `/home/user/kng_podklady` (15 šablon + v15 + SoD v2 +
příručka přejmenovaná na v12.10.2). Klon kontejneru byl mělký — před
porovnáním s `main` `git fetch --unshallow origin`.

---

# Předávka — 12. 10. 2026: v12.10.1 v test-draft i test

`test-draft` = `test` = **v12.10.1** (pokyn J. V. 12. 10.: „po dokončení pošli
do testu a odkaz na release"). Obsahuje #395 (v8.10.1, větev
`claude/cenik-395`) a #396 (větev `claude/nabidka-usazeni-telefon`):
usazení OCK v nabídce podle specifikace (levá/pravá boční stěna, řádky bez
volby pryč; Word CN v14 je dostane do řádku „boční stěny"), tlačítko
Kontakt… u účtů. Telefon D. Sikory opravil J. V. v profilu (chyba v účtu).
`main` = v30.9.1. Release v6.10.1 a v12.10.1 čekají na J. V.

Čeká na J. V.: B126 (vysoká) + B127, B128, B131 z auditu 6. 10. (výchozí:
oprava v nové větvi), pak 22. kolo; šablona CN v15 s vlastními řádky levé
a pravé boční stěny (výchozí: není nutná, v14 funguje sloučeně); smazání
sloučených větví (`claude/cenik-395`, `claude/nabidka-usazeni-telefon`
a seznam z 8. 10.); převod do `main`.

---

# Předávka — stav k 8. 10. 2026 (#395 ve větvi claude/cenik-395, v8.10.1)

Sezení session_01DrQLceJMdr6XWCvRcFSjbY (založené ze session_01FbEVKCocjc6ZDk2hyoDe3k).
`main` = v30.9.1, `test` = `test-draft` = v6.10.1 (4bbceef). Release v6.10.1
zatím nevydán (odkaz J. V. poslán 8. 10.; releasy do v2.10.1 včetně).

Pokyn J. V. 8. 10.: „souhlasím s výchozími návrhy, začni #395". Mail
D. Sikory z 18. 9. (role zadavatele / sleva do CN) ověřen jako vyřešený:
v25.9.6 (volba role z karty slevy zmizela, server roli bere z relace)
a v29.9.1 #364 (činnosti PROJ v nabídce za cenu před slevou) — obojí v `main`.

## Hotovo ve větvi `claude/cenik-395` (z test-draft v6.10.1) — v8.10.1

| Bod | Co | Testy |
|---|---|---|
| V3 | server odmítne NOVÝ zámek role bez práva obou ceníků z ceníku bez cen / s cenou nabídky 0 (`zakazka_kontrola.mjs`, `zamekNovyCenaProblem`); odchylka od návrhu: výměnu ceníku server udělat nejde (zakázku nevrací) | test_prava 694/4 → 698/0 |
| N2/N3 | kid v každém výskytu + `volitelneVlastni`; katalog PROJ z uložených variant (`uloziste.js`) | test_prava 699/4 → 703/0 |
| S2 | vědomá mez (`BEZPECNOST_MEZE.md`) | — |
| šablony | kódování (UTF-16 bez BOM, UTF-32, deklarace ≠ UTF-8/16), strop ZIPu 64 MB, jednoznačný EOCD (bajty za koncem nevadí), ověření platných šablon po obnově | test_sablona_obsah 62/5 → 68/0, test_obnova 191/1 → 192/0 |

Fixtury test_funkce, test_obnova_nanecisto a overit_online (P2) dostaly
zveřejněný ceník + rozměry (zamykaly obchodníkem ceník bez cen). Mutace
serveru #395 9/9, B114 7/7; jádra #395 5/5. Rychlé kolo zelené po opravě
dvou harnessů. **Celé kolo nad 518532b VŠE ZELENÉ (84 min 57 s):** sady
221/0/1, mutace jádra 167 z 167, serveru 245 z 245, statické 3 z 3.

**Pozor — 21. kolo už proběhlo 6. 10. mimo tuto řadu sezení:** audit
`2026-10-06_kalkulator_BEZPECNOSTNI_AUDIT_v2.10.1_a_v30.9.1.md` (Disk/Testovani,
id 1ncRIsD3trEUaTiibGAXBNvPMI2geqnfC) a `VYHODNOCENI_TESTU_KOLO21_MAIN_TEST_2026-10-06.xlsx`.
Nové nálezy B126–B132: **B126 vysoká** (profil, který není objekt — `null`,
chybějící klíč, `profily = {}` — projde #372, jádro dá nulovou hmotnost;
`src/engine.js:668`, v claude/cenik-395 pořád živý), B127 a B128 střední,
B129–B131 nízké, B132 informativní. V repozitáři ani roadmapě zatím nejsou.
Příští kolo je tedy 22., B-čísla od B133.

## Čeká na J. V.

- Sloučení `claude/cenik-395` do `test-draft` (po zeleném celém kole).
- Release v6.10.1; ostatní body z předávky 6. 10. níž (rozhodovací list,
  Pipedrive P1–P12, šablony SoD v2 a PROJ v4 v testu i ostré, převod do main).
- Smazání sloučených větví (seznam a odkazy v hlášení 8. 10.); NEmazat
  `claude/oprava-sesti-nalezu-v29.9.1`, `claude/stoic-cerf-j915ax`,
  `k16-nalezy`, `claude/etapa-b-plan-plateb-proj`,
  `claude/komplexni-test-v29.9.1`, `claude/opravy-v29.9.1`,
  `claude/pensive-curie-s6yzs3`, `claude/testovani-po-opravach` (nejsou
  celé v test-draft).

## Další krok

Výchozí návrh J. V. (8. 10.): nejdřív B126 (+ B131, B127, B128) v nové
větvi z `claude/cenik-395`, pak 22. kolo (protokol +
`<datum>_kalkulator_BEZPECNOSTNI_AUDIT_v<verze>.md`, B-čísla od B133). Podklady v kontejneru: `/home/user/kng_podklady`
(všech 15 šablon + SoD v2 + příručka přejmenovaná na v8.10.1).

---

# Paralelní práce 6. 10. 2026 — koordinační sezení dávek na pozadí

Na pokyn J. V. 6. 10. 2026 („tag je releasnutý, vytvoř nové sezení a navrhni
další dávky k běhu na pozadí během tohoto dne") běží koordinační sezení
**session_01FbEVKCocjc6ZDk2hyoDe3k** („KNG — dávky na pozadí 6. 10. 2026",
založené ze session_01WRbkr4tfxtUB1k8PR37dUR). Každá dávka vlastní větev
z `test-draft` (v2.10.1), integrace do `claude/davka-6-10` (v6.10.1) s celým
kolem; do `test-draft` a `test` až na pokyn J. V. Release v2.10.1 vydán
6. 10. — release mají všechny verze.

| # | Dávka | Větev |
|---|---|---|
| G | rozhodovací list otevřených otázek | (v `podklady/` větve D) |
| D | #392 VSG/SKN z přepsané plochy skla + K20-N1 zapsat jako vědomé | `claude/vsg-skn-prepis-skla` |
| A | #374 koncová cena bez schválení (B113, B114) | `claude/koncova-cena-374` |
| C | B115, B116, B100 kontrola obsahu šablon | `claude/sablony-obsah-b115` |
| B | B120, B119, B121, B122 | `claude/audit-b119-b122` |
| E | B124, B125 + šablony SoD v2 na Disk | `claude/testy-ci-b124` |
| F | Pipedrive: návrh polí dealu × kalkulátor (rozbor) | `claude/pipedrive-pole-rozbor` |
| H | 21. kolo nad integrační větví (pokud zbude čas) | — |

Podklady 20. kola (2. 10., nad v1.10.2, Disk/Testovani): `STAV_KOLO20_2026-10-02.md`,
`VYHODNOCENI_TESTU_KOLO20_TEST_2026-10-02.xlsx`,
`2026-10-02_kalkulator_BEZPECNOSTNI_AUDIT_v1.10.2.md` — B118 (= K19-N102) je
opravené ve v2.10.1 (P1); otevřené vysoké B113, B114 řeší dávka A.
Nečinné sezení session_0152gTk16B8GKboeQJxTy49m (30. 9., opravy B113–B118)
je tímto plánem nahrazené.

---

# Předávka — stav k 6. 10. 2026 (v6.10.1 v integrační větvi claude/davka-6-10)

Na `main`: **v30.9.1**. Na `test-draft` = `test`: **v2.10.1**. Integrační
větev **`claude/davka-6-10`** = **v6.10.1** (pokyn J. V. 6. 10. 2026:
„nerozděluj … sezení" + „ano, sluč do claude/davka-6-10"; podřízená sezení
A a C zastavena a archivována J. V., jejich větve sloučeny). Do `test-draft`
a `test` až na pokyn J. V. Sezení session_01FbEVKCocjc6ZDk2hyoDe3k.

## Obsah v6.10.1 (podrobně CHANGELOG)

| Dávka | Co | Roadmapa | Stav |
|---|---|---|---|
| G | rozhodovací list `podklady/ROZHODNUTI_2026-10-06.md` (25 otázek s výchozími odpověďmi) | — | ✅ |
| D | #392 VSG/SKN z ručně přepsané plochy skla; K20-N1 jako vědomé chování (test) | #392 | ✅ |
| A | #374 B113, B114 (identita položek PROJ, cena trvalých položek, ceník sestavení, zábrana PROJ za 0 Kč); B117 mez; návrh B96 | #374 | ✅ |
| B | B119 přísné ověření nového zámku, B120 obnova překladů dodatků, B121 rejstřík, B122 symboly v textu plateb | #393 | ✅ |
| C | B115 kontrola obsahu šablon, B116 vrácení verze, B100 obnova šablon | — | ✅ |
| E | B124 overit_xss (215 → 299), B125 CI; šablony SoD v2 předány J. V. (SendUserFile) | — | ✅ |
| Sikora | poznámka *) jen s IČ, velká písmena v Out of scope, Follow project milestones, název souboru v jazyce | #394 | ✅ |
| Revize | dva nezávislí revizoři: B119 vždy přísně, šablony bez 5 dalších obchvatů, strop rejstříku, doprava PROJ, záporná sazbaKc, duplicitní sekce, čísla jako jádro | #395 (zbytky) | ✅ |
| F | rozbor polí Pipedrive `podklady/PIPEDRIVE_POLE_DEALU_ROZBOR_2026-10-06.md` + xlsx s návrhem vyjádření (SendUserFile) | — | ✅ |
| H | 21. kolo (protokol + audit na Disk) | — | ⬜ nestihlo se |

## Celé kolo

**Celé kolo nad b292d32 VŠE ZELENÉ (73 min 13 s):** sady 221 prošlo,
0 selhalo, 1 přeskočeno (test.js), mutace jádra 162 z 162, mutace serveru
236 z 236, statické 3 z 3; se všemi firemními šablonami. Předchozí kolo
nad 5b3213d selhalo jen na zadání mutace B59 (úsek změnil B119) — opraveno.

## Čeká na J. V.

- Rozhodovací list 6. 10. (`podklady/ROZHODNUTI_2026-10-06.md`) — odpovídá
  se jen tam, kde se chce odchýlit.
- **#395 V3 (vysoká):** nová zakázka obchodníka s ceníkem sestavení +
  vlastní položka nastaví cenu libovolně. Výchozí návrh: server u nové
  zakázky obchodníka při zveřejněném ceníku nahradí ceník sestavení
  zveřejněným + serverová zábrana nového zámku s cenou ≤ 0 (samostatná
  dávka; prostý zákaz by shodil legitimní toky).
- **F — Pipedrive:** otázky P1–P12 v rozboru (výchozí odpovědi tam);
  poslat vyplněnou kopii tabulky integrátorovi po kontrole J. V.
  Pozor: navržené názvy polí by rozbily párování `pd_mapa.mjs` (#114).
- Nahrát šablony SoD realizace v2 a SoD PROJ v2 a nabídky PROJ v4
  (Nastavení → Šablony) v testu i v ostré.
- Sikora S2: česká nabídka zůstala malými písmeny (výchozí: ponechat).
  Word PROJ má poznámku *) pevně v šabloně — zmizí jen z online nabídky
  (výchozí: v šabloně PROJ v5 nahradit symbolem).
- Převod v6.10.1 do `test-draft` a `test` („pošli do testu"), release
  v6.10.1 (odkaz pošle sezení po převodu), převod do `main`.
- Smazat sloučené větve: `claude/vsg-skn-prepis-skla`,
  `claude/audit-b119-b122`, `claude/koncova-cena-374`,
  `claude/sablony-obsah-b115`, `claude/testy-ci-b124` (až budou celé
  v `test-draft`), dál `claude/k19-nalezy`, `claude/davka-2-10` a seznam
  níž.

## Podklady v cloudu

`/home/user/kng_podklady` (CN v14, CN v11, PROJ v3 jako
Sablona_NABIDKA_PROJ.docx, SoD v1, plná moc, příručka přejmenovaná na
v6.10.1) a `/home/user/kng_podklady_jazyky` (navíc CN v14 EN/DE/FR, PROJ
v4 + EN/DE/FR, SoD v2) — mimo repozitář.

## Další krok

Čekat na pokyn J. V. („pošli do testu") — pak rychlý posun `test-draft`
a `test` na `claude/davka-6-10` a odkaz na release v6.10.1.

---

# Předávka — stav k 2. 10. 2026 (v2.10.1 na test-draft i test, v30.9.1 na main)

Na `main`: **v30.9.1**. Na `test-draft` = `test`: **v2.10.1** (pokyn J. V.
2. 10. 2026: „souhlasím s výchozími návrhy, zapracuj P2, P4, P6; P5 —
statiku udělej tak, jak jsem navrhoval, ve dvou řádcích. Vypiš, které
konkrétní zakázky z ostré verze tím budou dotčeny. P3 ok; P1 OK. připrav,
otestuj a pošli do testu. tag je releasnutý"). Paralelní větev
**`claude/k19-nalezy`** (z `b5253c9`) sloučena přes integrační větev
**`claude/davka-2-10`** nad v1.10.2 (8a7b069); konflikty jen v CHANGELOG
a PREDAVKA. Sezení session_01WRbkr4tfxtUB1k8PR37dUR.

## Hotovo v2.10.1 — nálezy 19. kola (podrobně CHANGELOG.md)

| # | Nález | Co | Testy |
|---|---|---|---|
| P1 | K19-N102 | #372 kontroluje i nově zamčenou variantu (zámek jen v příchozích datech) | test_obnova 176/4 → 180/0; mutace serveru +1 |
| P2 | K19-N104 | zkratka „Prosklít i prohlubeň" (všem stěnám odM = −prohlubeň) | test_prohluben_sklo 33/0; overit_oplasteni +7; mutace jádra +2 |
| P3 | K19-N105 | ruční přepis plochy skla posune PRÁCI OPLÁŠTĚNÍ a TMELENÍ | test_prepis_skla_prace 31/22 → 53/0; mutace jádra +2 |
| P4 | K19-N107 | nápověda „jiné sklo = opláštění po stěnách" | overit_oplasteni +2 |
| P5 | K19-N109 | statika ve dvou řádcích: nová položka ceníku `C.statikaOplHod` (výchozí 0), kontrola `statikaDvakrat` | test_statika_oplasteni 16/22 → 38/0; mutace jádra +3 |
| P6 | K19-N114 | přepnutí na zahraniční ceník nabídne „jen realizace" | test_zahr_jen_realizace 12/0; overit_zahranicni 40 → 45 |

Rozbor s variantami: `podklady/K19_ROZBOR_2026-10-01.md`.

## Celé kolo nad v2.10.1

Celé kolo nad ca02d5f (kód = bd43ad5, další commity jen dokumentace) VŠE ZELENÉ (77 min 32 s): sady 218 prošlo, 0 selhalo, 1 přeskočeno (test.js — skutečný ceník v repozitáři není), mutace jádra 138 z 138, mutace serveru 211 z 211, statické kontroly 3 z 3; s firemními podklady (KNG_PODKLADY: šablony CN v14, CN v11, PROJ v3, SoD, plná moc, příručka přejmenovaná na v2.10.1). Předchozí dva běhy: první visel na overit_dialogy.mjs (harness neobsloužil nový dotaz P6, přerušeno před mutacemi), druhý selhal jen v overit_lista.mjs (32 pravidel; zakázané zaškrtávátko P2) — obojí opraveno.

## Čeká na J. V.

- **P5:** nastavit v Ceníku OCK (REŽIE) „Statické posouzení opláštění –
  hodin" (např. 6) a zveřejnit — do té doby se nic nemění. Dotčené
  zakázky viz CHANGELOG v2.10.1 (testovací K19 jsou zamčené; 13 s ručně
  dorovnanou statikou hlídá kontrola `statikaDvakrat`).
- **P3:** příplatky VSG/SKN navázat na přepsanou plochu skla (výchozí:
  ano, další dávka).
- Release v2.10.1 (odkaz poslán; tag z cloudu nejde — HTTP 403). Releasy vydané do v1.10.2 včetně (ověřeno přes GitHub 2. 10.).
- Převod do `main` (výchozí: až po vyzkoušení v testu).
- Smazat sloučené větve `claude/k19-nalezy` a `claude/davka-2-10` (celé
  v `test-draft`) — mazání z cloudu nejde.
- Ostatní otevřené body z 1. 10. níž beze změny.

## Další krok

Čekat na vyzkoušení v testu: P1 novou TEST zakázkou, P3 K19T-C088
v klonu varianty proti „OCK – test × Excel", P2/P4/P6 proklikem, P5 po
nastavení hodin v ceníku.

---

# Předchozí stav (1. 10. 2026 večer — v1.10.2)

Na `main`: **v30.9.1**. Na `test-draft` = `test`: **v1.10.2** (pokyn J. V.
1. 10. 2026: „po zeleném kole to pošli do testu“) — rychlý posun z integrační
větve **`claude/davka-1-10-2`** po zeleném celém kole. Releasy vydané do
**v1.10.1** včetně (ověřeno přes GitHub 1. 10. odpoledne); **v1.10.2 release
ani tag ještě nemá** — odkaz na release poslán J. V. (tag z cloudu pushnout
nejde — HTTP 403).
Sezení session_01RJSPgrM27cZ1mGsJWPdfWv navázalo na
session_01H73EkBoAG3hp8ic9PHKqwS.

## Hotovo v1.10.2 — dávka 1. 10. 2026 odpoledne (podrobně CHANGELOG.md)
Zadání J. V. (snímky): výchozí plán plateb, zarovnání polí opláštění,
prověřit rám dveří a větu „Vedle dveří zůstane 1,50 m“, odpovědi na
otázky k #381, roadmapa, otevřené body. Každý úkol vlastní větev
z `test-draft` (b5253c9), integrace bez konfliktů.

| Úkol | Větev | Roadmapa |
|---|---|---|
| Plán plateb PROJ: výchozí předvolba Záloha 70 % + zbytek po předání | `claude/plan-plateb-zaloha-70` | #383 |
| Opláštění po stěnách: pole stěny v pevných sloupcích (materiál / výška / křížek) | `claude/oplasteni-zarovnani-poli` | #384 |
| Věta o zbytku mezery u jedněch dveří + test rámu dveří (rám se počítá 2× už teď) | `claude/svetlik-zbytek-vedle-dveri` | #385 |
| Rozhodnutí J. V. k #381: mezeru mezi příčníky ponechat, nápovědu s výpočtem mezery nezobrazovat | (jen záznam) | #381 |

Vysvětlení pro J. V. (změna šířky bočního světlíku při přepnutí zasklení):
mezera vedle dveří se měří ze šířky skla — na terče 1 500 + 2 × 80 + 20 =
1 680 mm, mezi příčníky 1 500 − 2 × 80 − 8 = 1 332 mm; otvor dveří 800 +
2 × 100 + 40 = 1 040 mm; mezera 600 mm × 252 mm; plocha 6,600 × 2,772 m².

**Podklady v cloudu:** šablony CN v14, CN v11, PROJ v3 (jako
`Sablona_NABIDKA_PROJ.docx`), SoD realizace, SoD projekce, plná moc
a příručka v25.9.3 staženy konektorem Disku do `/home/user/kng_podklady`
(mimo repozitář). Pro `overit_manual.mjs` kopie příručky s verzí
přepsanou na v1.10.2 (`2026-10-01_kalkulator_v1.10.2_MANUAL_OBCHODNIK.html`
— postup ze skillu testovací procedury; skutečná příručka v1.10.2 se
v cloudu vyrobit nedá, chybí snímky z testovacího webu). Malé soubory
přijdou z Disku přímo ve výsledku nástroje — vytáhnout je z přepisu
sezení (JSONL), viz skript v sezení.

## Celé kolo nad v1.10.2
VŠE ZELENÉ (84 min 29 s) nad 7d544b7 — sady 214 prošlo, 0 selhalo, 1 přeskočeno (test.js — skutečný ceník v repozitáři není), mutace jádra 131 z 131, mutace serveru 210 z 210, statické kontroly 3 z 3; s firemními podklady (KNG_PODKLADY: šablony CN v14, CN v11, PROJ v3, SoD, plná moc, příručka). Dílčí ověření před integrací: ./spust_testy.sh v každé větvi
164/0/1; harnessy plan_plateb 49/0, oplasteni 82/0, svetliky_sirka 24/0,
xss 215/0, smoke 50/0; mutace jádra --kontrola 131 úseků.

## Čeká na J. V.
- Release v1.10.2 (odkaz poslán; tag z cloudu nejde).
- Převod v1.10.2 do `main` (výchozí: až po vyzkoušení v testu).
- #383: výchozí plán platí i pro rozpracované zakázky bez uložené
  předvolby (výchozí: ano, jako každá změna firemního plánu); je-li
  v Nastavení → Firma uložený vlastní plán firmy, má přednost — nastavit
  tam předvolbu a zálohu, nebo „Vrátit výchozí z kódu“; šablona nabídky
  PROJ v3 vytiskne natvrdo Standard → nahrát PROJ v4 (výchozí: nahrát).
- #385: znění věty o zbytku (výchozí: ponechat nové znění).
- SoD: znění rozsahu SoD PROJ (bod 7 návrhu), čísla papírových smluv OPR
  a OVP pro etapu C (#366); datum podpisu i v SoD PROJ (výchozí ano);
  slepené „V Praze, dne …" v šabloně SoD realizace (výchozí opravit ve v2);
  pokuta za prodlení splatnosti „0" (výchozí ve v2 větu vypustit).
- #381 zbývající otázky (výchozí: ponechat) — tolerance 0,5 mm, dvě věty
  kontroly, ruční šířka po změně počtu, zábrana i u „zajistí stavba",
  krycí list bez šířky.
- #377: zábrana platí i pro dotisk zamčené varianty (výchozí: ano).
- Vyplnit překlad firemní věty SKN v číselníku na ostrém webu (#379);
  nahrát šablony SoD v2.
- Smazat sloučené větve (celé v `test-draft`, ověřeno `git merge-base --is-ancestor` 1. 10. večer; mazání z cloudu nejde — HTTP 403): `claude/ciselnik-prednost-dodatku`, `claude/davka-1-10`, `claude/davka-k18-svetliky`, `claude/etapa-b-plan-plateb-v30.9.1`, `claude/etapa-b-q5-zaloha-automaticky`, `claude/k18-drobnosti`, `claude/k18-n96-dodatky-preklady`, `claude/k18-nalezy-word-preklady`, `claude/model2-nadsvetlik-bez`, `claude/ock-platebni-podminky-nabidka`, `claude/oprava-sesti-nalezu-v29.9.1`, `claude/sirka-bocniho-svetliku-381`, `claude/sod-generator-sablony`, `claude/stoic-cerf-j915ax`, `claude/svetliky-u-dveri-375`, `claude/zabrany-blokuji-dokumenty`, `claude/davka-1-10-2`, `claude/plan-plateb-zaloha-70`, `claude/oplasteni-zarovnani-poli`, `claude/svetlik-zbytek-vedle-dveri`. `k16-nalezy` celá v `test-draft` není (2 commity navíc: rozbor D kola 16, v25.9.8) — nemazat bez kontroly.

## Další krok
- Paralelní větev **`claude/k19-nalezy`** (nálezy 19. kola, P1–P6, z `b5253c9`)
  běží v samostatném sezení podle promptu J. V. (pokyn 1. 10. 2026 „rozběhni
  následující prompt“): session_01WRbkr4tfxtUB1k8PR37dUR
  (https://claude.ai/code/session_01WRbkr4tfxtUB1k8PR37dUR). Vlastní
  `PREDAVKA.md` vede ve své větvi; o sloučení rozhoduje J. V.
- Čekat na odpovědi J. V. k otevřeným bodům výš.

## Předchozí stav (1. 10. 2026 dopoledne — v1.10.1 na test-draft i test, v30.9.1 na main)

Na `main`: **v30.9.1**. Na `test-draft` = `test`: **v1.10.1** (pokyn J. V.
1. 10. 2026: „s návrhem šířky bočního světlíku souhlasím, zapracuj ho pro
model 2 (modelu 1 nic neměň) a vše pošli do testu"). Převod rychlým posunem
z integrační větve `claude/davka-1-10` po zeleném celém kole (finální celé kolo nad d596290 VŠE ZELENÉ (59 min 7 s): sady 214 prošlo, 0 selhalo, 1 přeskočeno (test.js), mutace jádra 128 z 128, mutace serveru 210 z 210, statické 3 z 3; kód v1.10.1 (373861f) je s d596290 shodný, liší se jen CHANGELOG, PREDAVKA a roadmapa; na pokyn J. V. „potřeboval bych to už odeslat do testu" převedeno ještě před doběhnutím mutací serveru, výsledek dopsán po doběhnutí; předchozí celé kolo nad a7889c5 (úkoly 1–4 bez SoD rozhodnutí, #381 a #382) VŠE ZELENÉ: sady 210/0/1, mutace jádra 121 z 121, serveru 210 z 210, statické 3 z 3).
Releasy vydané do **v1.10.1** včetně (ověřeno přes GitHub 1. 10. — tag
v1.10.1 i release založil J. V.; z cloudu tag pushnout nejde — HTTP 403).
Sezení 1. 10. navázalo na session_01XFo3AzDzkjt8xGnMVH53p7.

## Hotovo v1.10.1 — dávka 1. 10. 2026 (podrobně CHANGELOG.md)
Každý úkol vlastní větev; integrace `claude/davka-1-10` (konflikty jen
v CHANGELOG, roadmapě, mutace_jadro.mjs, overit_sod.mjs a zamek_ui.js —
obě strany ponechány).

| Úkol | Větev | Roadmapa |
|---|---|---|
| Model 2: nadsvětlík „bez" bez odpočtu 0,2 h (Model 1 ubírá dál) | `claude/model2-nadsvetlik-bez` | #378 |
| Zábrany z kontroly blokují dokumenty své strany (OCK × PROJ) | `claude/zabrany-blokuji-dokumenty` | #377 |
| K18-N96: překlady dodatkových textů EN/DE/FR v číselníku | `claude/k18-n96-dodatky-preklady` | #379 |
| Návrh SoD + generátor podle šablon, K18-N100, K18-N101, „% %", rozhodnutí J. V. (termíny, místo plnění, denní pokuta, datum podpisu = datum tisku, pokuta zhotovitele, šablony v2) | `claude/sod-generator-sablony` | #380 |
| Šířka bočního světlíku při ručním počtu — jen Model 2 | `claude/sirka-bocniho-svetliku-381` | #381 |
| Dodatkové texty: číselník má přednost před zveřejněným ceníkem | `claude/ciselnik-prednost-dodatku` | #382 |

**Návrhy (artefakty):** SoD a šablony https://claude.ai/artifact/GXZGaJBMR9PQXnp9bz6Xwh,
šířka bočního světlíku https://claude.ai/artifact/7tNaMb8Fu1tNt9ADCyYheL.
Šablony SoD realizace v2 a SoD PROJ v2 poslány J. V. (vyrábí je
`nastroje/vyrob_sablony.js --sod-real | --sod-proj`, necommitují se) —
nahrát v Nastavení → Smlouvy / Šablony.

**K18-N101:** tester zkoušel P18 na ostré v30.9.1 (před plánem plateb).
**#382:** v testu nese zveřejněný ceník u SKN starší text — nově má
přednost číselník; zakázku založenou dřív srovná tlačítko v číselníku.

**Podklady v cloudu:** šablony CN v14, PROJ v4 (+EN/DE/FR), PROJ v3 (jako
Sablona_NABIDKA_PROJ.docx), SoD, plná moc a příručka staženy konektorem
Disku do `/home/user/kng_podklady` — velké soubory se uloží do
`…/tool-results/…txt` (JSON s base64), kontext nezahltí (viz skill).
Aktualizovaný skill (nové znění zásady o symbolech SoD + rozhodnutí 1. 10.)
poslán J. V. jako `2026-10-01_kalkulator_v1.10.1_skill.skill`.

## Čeká na J. V.
- Převod v1.10.1 do `main` (release v1.10.1 už vydán).
- SoD: znění rozsahu SoD PROJ (bod 7 návrhu), čísla papírových smluv OPR
  a OVP pro etapu C (#366); otázky agentů s výchozími odpověďmi (datum
  podpisu i v SoD PROJ — výchozí ano; slepené „V Praze, dne …" v šabloně
  SoD realizace — výchozí opravit ve v2; pokuta za prodlení splatnosti „0"
  — výchozí ve v2 větu vypustit).
- #381 otázky (výchozí: ponechat) — tolerance 0,5 mm, dvě věty kontroly,
  ruční šířka po změně počtu, zábrana i u „zajistí stavba", krycí list bez šířky.
- #377: zábrana platí i pro dotisk zamčené varianty (výchozí: ano).
- Vyplnit překlad firemní věty SKN v číselníku na ostrém webu (#379);
  nahrát šablony SoD v2.

## Další krok
- Navazující sezení (založené 1. 10. ze sezení session_01H73EkBoAG3hp8ic9PHKqwS)
  nejdřív vysvětlí J. V., proč se při přepnutí zasklení „na terče" →
  „mezi příčníky" změní předpočítaná šířka bočního světlíku (mezera vedle
  dveří se měří z šířky skleněné plochy: na terče vnitřní šířka + 2 × příčník
  + 0,02 m, mezi příčníky vnitřní šířka − 2 × sloupek − 0,008 m; v příkladu
  J. V. 600 mm × 252 mm) a nabídne otázku s výchozí odpovědí. Bez pokynu
  J. V. se nic nemění.

## Předchozí stav (30. 9. 2026)

Na `main`: **v30.9.1** (pokyn J. V. 30. 9. 2026 „pošli aktuální test do
main"; ostrá aplikace se z `main` nasazuje sama). Na `test`: **v30.9.3**
(pokyn J. V. 30. 9. odpoledne „co máme aktuálně v draftu pošli už do testu").
Na `test-draft`: **v30.9.4** — dávka K18 + světlíky u šachetních dveří
(integrační větev `claude/davka-k18-svetliky`, převod fast-forwardem po
zeleném celém kole). Do `test` a `main` jen na pokyn J. V.
Releasy do **v30.9.3** včetně vydané a odsouhlasené (J. V. 30. 9.; ověřeno
přes GitHub 30. 9. večer). **v30.9.4** — odkaz na release poslán J. V.
(tagy z cloudu pushnout nejde — proxy HTTP 403, viz CLAUDE.md).

**Větve k 30. 9. 2026 večer** (ověřeno `git merge-base --is-ancestor`):
- **Celé v `test-draft` — J. V. je smaže, až nebudou potřeba:**
  `claude/davka-k18-svetliky`, `claude/svetliky-u-dveri-375`,
  `claude/k18-drobnosti`, `claude/k18-nalezy-word-preklady`,
  `claude/ock-platebni-podminky-nabidka` (v30.9.4),
  `claude/etapa-b-q5-zaloha-automaticky` (v30.9.3),
  `claude/etapa-b-plan-plateb-v30.9.1` (v30.9.2),
  `claude/oprava-sesti-nalezu-v29.9.1` (v30.9.1), `k16-nalezy`
  a `claude/stoic-cerf-j915ax` (z dřívějška).
- **Nahrazená, ne celá v `test-draft`:** `claude/etapa-b-plan-plateb-proj`
  (etapa B z v29.9.4) — krok 1 přenesen do nové větve, zbytek hotový tam;
  k práci už není potřeba (smazání rozhodne J. V.).
- **Nesloučené, nemazat:** `claude/testovani-po-opravach` (předávka 22. kola
  nad v29.9.7 = kód v30.9.1: VYHOVUJE S NÁLEZY — 2 nové vysoké v třídě
  „koncová cena" #374, B99 obejitelná; čeká na rozhodnutí J. V.),
  `claude/pensive-curie-s6yzs3` (zbývá předávka fd1be2b),
  `claude/komplexni-test-v29.9.1` (výsledky 21. kola), `claude/opravy-v29.9.1`
  (předávka + prompt šesti oprav).
Roadmapa: `roadmapa/roadmap.json` (377 položek, nejvyšší #377), stránka se
generuje `python3 roadmapa/roadmapa.py`.

## Hotovo v30.9.4 — dávka K18 + světlíky u šachetních dveří (podrobně CHANGELOG.md)
Zadání J. V. 30. 9. 2026 odpoledne; čtyři paralelní větve z `test-draft`,
sloučené v `claude/davka-k18-svetliky` (konflikty sjednocené, pravidel
kontroly 31, mutace jádra 111 úseků):
- **#375 světlíky u dveří** (`claude/svetliky-u-dveri-375`; návrh
  https://claude.ai/artifact/2x3pM2fGfAQaXz7ziUVxbE odsouhlasen J. V.): boky
  mají tytéž volby jako nadsvětlík (nové zakázky „bez"), pole **Celkem
  světlíků na bocích dveří** (nástupiště × 2, ručně s ↺), ocenění po
  dveřích, sklo podle stěny s dveřmi, materiál podle stěn B–D, kontrola
  `bokyDveri`, řádek specifikace SVĚTLÍKY U ŠACHETNÍCH DVEŘÍ + symbol
  `{{TS_SVETLIKY_DVERI}}` (šablona CN ho zatím nemá — Word popisuje
  světlíky dál řádkem `{{TS_OPLASTENI_NADSVETLIKU}}` bez počtu), převod
  starších zakázek beze změny ceny. Nadsvětlík „zajistí stavba" už neubírá
  0,2 h montáže na nástupiště, „bez" odpočet drží (Model 1 = Excel).
- **B1–B3** (`claude/k18-drobnosti` + doplněk v integrační větvi): 3D
  zaměření ve specifikaci i řádek **Zaměření strojovna** v krycím listu OCK
  odvozené z položky ZAMĚŘENÍ 3D SKENEREM v Režii (množství 0 = ne, ruční
  přepis neplatí, zamčená varianta drží odeslané); opláštění po stěnách
  samo o sobě atyp nedělá; zdvih nejvýš 99 m (zábrana v kontrole „rozmery",
  pole max 99).
- **K18-N92, N93, N95–N97** (`claude/k18-nalezy-word-preklady`): šablona
  PROJ v4 s blokem ceny geodetu + kontrola `cenaWordProj`, záruka
  v cizojazyčné online nabídce přeložená, úvod a termíny PROJ přeložené
  (návrh), kontrola `dodatekCesky`, materiály po stěnách se stěnami.
- **K18-N94 + měsíční fakturace** (`claude/ock-platebni-podminky-nabidka`,
  #367 etapa A část 1): platební kalendář z krycího listu (0 % se vynechá,
  doklady se přečíslují; „Měsíční" = věta o měsíční fakturaci místo
  50/40/10), šablona **CN v14**, kontrola `platbyWordOck`.
- Šablony **CN v14** a **PROJ v4** (CZ + EN/DE/FR) vyrobené
  `nastroje/vyrob_sablony.js --cn-v14 / --proj-v4` z podkladů na Disku,
  poslány J. V. v sezení 30. 9. večer (v repozitáři nejsou).
- Příručka (`manual/obsah.json`) a `podklady/OBRAZOVKA_OPLASTENI.md`
  opravené; roadmapa #375 a #376 hotovo, #367 doplněno, **nová #377**.
- **Ověřeno celým kolem** nad d7e2f32 (62 min 5 s): VŠE ZELENÉ — sady 207
  prošlo, 0 selhalo, 1 přeskočeno (test.js); mutace jádra 111 z 111; mutace
  serveru 207 z 207; statické kontroly 3 z 3. Po kole strom čistý.

## Hotovo v30.9.2 — etapa B: plán plateb projekce (podrobně CHANGELOG.md)
Jeden plán plateb PROJ (krycí list PROJ), nabídka PROJ, tisk krycího listu,
smlouva o dílo PROJ a Nastavení ho jen čtou. Rozhodnutí J. V. 29. 9. 2026:
čtyři předvolby (Standard po činnostech = dosavadní procenta, Záloha +
zbytek po předání 0/30/50/70 %, 100 % po dokončení stupně, Vlastní),
výchozí Standard; splátky SoD PROJ se stejným milníkem sečtené, dopočet =
procento × cena činnosti po slevě, poslední splátka nese zaokrouhlení,
ruční přepis; zábrany (100 % u činnosti, součet plateb = cena díla).
- Jádro `src/plan_plateb.js` (v JADRA mutačního testu), firemní plán
  `NAST.firma.planPlatebProj` (Nastavení → Smlouvy / Šablony, zveřejnění
  s firmou, kontrola tvaru v prohlížeči i na serveru), karta plánu a tabulka
  plateb v krycím listu PROJ, snímek `kryciProj.zmrazenoPlan` při KAŽDÉM
  prvním zamčení (i klonu a po odemčení; dotisk ho nepřepíše), zábrany
  `planPlateb100` / `planPlatebSoucet`, varování `planPlatebWordProj`
  (proti Standardu z kódu), brána `dokumentZabrana(typ, varianta)` hlídá
  variantu, ze které dokument vzniká (pravidel kontroly 27).
- Word: nabídka PROJ symboly `{{PROJ_PLATBY_<ČINNOST>}}` mezi
  `{{PLATBY_<X>_ZAC/_KON}}` (šablona **PROJ v4**), smlouva o dílo PROJ
  `{{SODP_PLATEBNI_KALENDAR}}` — odstavec za platbu (šablona **SoD PROJ v2**;
  stará s osmi platbami dostane `SODP_PLATBAn_KC`, plán, který neumí,
  smlouvu nevyrobí). Šablony vyrábí `node nastroje/vyrob_sablony.js
  --proj-v4 | --sod-proj <podklady>`; vyrobené (CZ + EN/DE/FR, SoD) poslány
  J. V. v sezení — v repozitáři nejsou.
- Převod starších zakázek: ruční splátky `sodpPlatba1–8` = ruční částky
  plateb se stejným milníkem (líně, bez zápisu), dřívější záloha („Záloha
  30 %") nabídnutá tlačítkem; odeslaná nabídka bez snímku se chová jako
  dřív a nová šablona SoD z jejích ručních splátek dostane seznam plateb.
- **Revize před sloučením** (dvě nezávislé): opravy F1–F9 v 843ff63 —
  blokující snímek plánu u klonu / po odemčení, závažná brána podle
  varianty, sedm menších (převod zálohy, „upraveno" u zamčené, varování
  ve Wordu, `PODM_*` jen z viditelných polí, SoD starší nabídky, odolnost
  vůči poškozeným datům, odebrání milníku se zeptá).
- **Ověřeno celým kolem** 30. 9. 2026 nad 843ff63 (72 min 17 s): VŠE ZELENÉ —
  sady 204 prošlo, 0 selhalo, 1 přeskočeno (test.js); mutace jádra 87 z 87;
  mutace serveru 207 z 207; statické kontroly 3 z 3.
- **v30.9.3 — Q5:** dřívější záloha krycího listu se přepne na předvolbu
  plánu sama (líně, první zápis ji zhmotní). Celé kolo nad 8cb2534 VŠE
  ZELENÉ (71 min 53 s: sady 204/0/1, mutace jádra 88 z 88, serveru 207 z 207,
  statické 3 z 3).

## Hotovo v30.9.1 — opravy šesti nálezů 21. kola (podrobně CHANGELOG.md)
B111 záporné položky, B96 krok zaokrouhlení, B112 ceník varianty a přepisy
podle role (vysoké); B97 klíč brzdy přihlášení, B98 obnova ze souboru a
odemčení, B99 šablona bez maker a vnějších vztahů (střední). Ověřeno
celým kolem (sady 199/0/1, mutace jádra 80, serveru 206). Testování po
opravách (22. kolo): větev `claude/testovani-po-opravach` (viz výše).

## Hotovo dřív v test-draft (v29.9.1–v29.9.4)
- v29.9.4: sloučení #371 (testovací sekvence A1–A5, jedno testovací kolo,
  opravy B72/P4, B75–B78, N43) a #372 (neznámý rozměr profilu).
- v29.9.1–v29.9.3: #364 nabídka PROJ se slevou, rozhodnutí J. V. k rozboru
  D kola 16 (`podklady/K16_ROZBOR_2026-09-25.md`), P8b, P9.2/P9.4/P9.5,
  P10.x, P11 `projZahranici`, P8A značky bloků + šablony CN v13 a PROJ v3.

## Platební podmínky z krycího listu — ROZHODNUTO 29. 9. 2026
Návrh `podklady/NAVRH_PLATEBNI_PODMINKY_2026-09-29.md` (oddíl 7 =
rozhodnutí), podklad etapy B `podklady/ETAPA_B_PODKLAD_2026-09-29.md`,
prototyp https://claude.ai/artifact/6sbxbaAsBpphfPfE2wnM3a.
- OCK (etapa A): tři firemní milníky, jak jsou; věty o podmínce úhrady u 1.
  a 2. splátky jako dnes; měsíční fakturace větou „Fakturace probíhá měsíčně
  podle skutečně provedených prací."
- PROJ (etapa B): **hotovo ve v30.9.2** (viz výše).
- Číslo smlouvy (etapa C, #366): ruční pole v krycím listu s návrhem dalšího
  čísla, formát `2026 - OPR - SOD - 0001` (realizace) a `2026 OVP SOD 0001`
  (projekce), navázat na papírové smlouvy.
- **Pořadí etap: B → A → C.** A a C až na pokyn J. V.

## Otázky etapy B — rozhodnutí J. V. 30. 9. 2026
- **Q5 změněno:** dřívější záloha se přepne na předvolbu **automaticky**
  (hotovo ve v30.9.3).
- **Potvrzeno:** Q9 (nové texty přes slovník, vlastní text milníku zůstává
  v EN/DE/FR česky, bez varování), Q10 (způsob fakturace z předvolby),
  body revize a (brána počítá plán v korunách — nesedící ruční částka v Kč
  zastaví i cizojazyčnou smlouvu) a b (server nekontroluje tvar plánu ve
  variantě) — „zatím OK".
- **Bez námitky (platí výchozí návrh):** Q1 projednání 100 % „po předání
  vyjádření odboru památkové péče HMP", Q2 geodet 100 % „po předání
  geodetického zaměření", Q4 celé koruny, poslední splátka dorovná, Q11
  řádek smlouvy „Platba ve výši … + DPH proběhne …", Q12 řádky nabídky
  „Platba {milník} – N % z nabídkové ceny za {činnost}".
- **Q8 „ponechat":** firemní „Standard po činnostech" se dál mění převzetím
  splátek upravených v krycím listu otevřené zakázky (Nastavení → Smlouvy /
  Šablony → „Převzít Standard z otevřené zakázky"), bez zvláštního editoru.

## Rozhodnutí z oprav v30.9.1 podle výchozího návrhu — čekají na potvrzení J. V.
- **B111:** zápornou položku, množství ani hodiny nesmí nikdo, ani
  administrátor (dobropis ne; jako N56).
- **B96 bod 4:** marže z koncové ceny i bez slevy — jen návrh, nerealizováno.
- **B112:** vedeno jako nový nález (vysoká); B88 dál jen čtecí strana.
- **B97:** vážnost střední.
- **B98:** odemčení ze souboru, které v databázi není → zakázku přeskočit
  s důvodem v náhledu obnovy.
- **B99:** vnější odkazy `http(s):` a `mailto:` v šabloně zůstávají povolené.

## Čeká na J. V.
- **Release v30.9.4** (odkaz v závěrečné zprávě sezení 30. 9. večer)
  a **smazat větve**, které jsou celé v `test-draft` (seznam výše;
  https://github.com/vendljar/kalkulator-next-gen-engscalc/branches).
- **Nahrát šablony** (Nastavení → Šablony) až do verze s v30.9.4: nabídka
  OCK **CN v14** (+EN/DE/FR), nabídka PROJ **v4** (+EN/DE/FR — nová s cenou
  geodetu, nahrazuje v4 z etapy B) a SoD PROJ v2 z etapy B.
- **Otázky dávky K18 (výchozí odpovědi platí, dokud J. V. neřekne jinak):**
  (1) nadsvětlík „bez" dál ubírá 0,2 h na nástupiště (Model 1 = Excel) —
  ponechat; (2) #377 zábrany z kontroly do `dokumentZabrana()` — ano,
  v paralelní větvi; (3) řádek `{{TS_SVETLIKY_DVERI}}` do šablony CN
  (v15) — ano v další dávce; (4) předpoklady #375: terče a lišty u plechu
  a „zajistí stavba" zůstávají, „převažující" = podle plochy (materiál) /
  výšky pásu (sklo), specifikace exteriéru píše u nadsvětlíku se sklem VSG
  (dřív dvojsklo) — OK; (5) svázání zaměření vyloženo jako Režie OCK
  (ZAMĚŘENÍ 3D SKENEREM) ↔ specifikace a krycí list OCK, dílenská
  dokumentace ruční volbu drží — OK; (6) `cenaWordProj` a `dodatekCesky`
  jsou varování, ne zábrana — OK; (7) SoD realizace: bez zálohy a měsíční
  fakturace šablona SoD zatím neumí (symboly `SOD_SPLATKA*` se doplňují ve
  Wordu) — řešit s etapou A / soubory SoD (#350).
- **Odborná kontrola překladů** EN/DE/FR označených „NÁVRH PŘEKLADU"
  (světlíky u dveří, úvod a termíny PROJ, měsíční fakturace, „stěny").
- Pokyn ke zbytku etapy A (smlouva o dílo OCK, 10.3) a k etapě C (číslo
  smlouvy, #366).
- Rozhodnout nálezy 22. kola (`claude/testovani-po-opravach`), bod 4 B96
  a **#374** (zbývající cesty třídy „koncová cena": hodiny a rezerva
  standardních položek PROJ, cena trvalé položky s kid, zaokrouhlení
  z výčtu); množství příplatků obchodníkem vs. `sloupce.naklad`.
- Spustit `node nastroje/detekce_zneuziti.mjs <záloha ostré databáze>`
  (Nastavení → Databáze → Zálohovat teď) — najde dřívější zneužití B111
  a B96 i v odeslaných nabídkách.
- **Poslední číslo papírových smluv** realizace (OPR) a projekce (OVP)
  pro etapu C.
- Soubory SoD (#350) — bez nich nejde ověřit symboly smluv (i pro etapu B:
  symbol seznamu plateb v šabloně SoD PROJ). SoD PROJ v2 je vyrobená
  z `Sablona_SOD_PROJEKCE.docx` z Disku.
- Pokyn k přenosu `test-draft` (v30.9.4) do `test` (a dál do `main`).
- **N46** (nástupiště A ↔ C u zrcadlové šachty): neopraveno, fuzz hlásí INFO.
- Z dřívějška: rozhodnutí z dávky B kola 16 (bez čísla se neukládá; přepočet
  po zveřejnění ceníku není neuložená změna; „ß" = „ss") a překlady z dávky C;
  telefon a jméno kolegy v `overit_nabidka_proj_word.mjs` (#346 / B79);
  CSP bez `'unsafe-inline'`; #369 (vypnout náklady obchodníkovi).

## Odložené nálezy 21. kola (neopravovat, jen evidovat)
Zbytek B77, B100–B110, zbytek B32, B4 souběh, B6, N59–N61 (větev
`claude/komplexni-test-v29.9.1`). N46 se neopravuje bez pokynu J. V.

## Poznámky pro další sezení
- **Testy jedním příkazem:** `bash nastroje/testovaci_kolo.sh` (celé kolo
  ~70 min) nebo `--bez-mutaci`, `--jen sady` apod. Mutační běh nepřerušovat,
  spouštět na pozadí nástroje (ne setsid); po přerušení
  `grep -rn "if (false)" netlify src` a `git diff netlify src`. Počty
  k 30. 9. večer (v30.9.4): mutace jádra 111 úseků, mutace serveru 207,
  pravidel kontroly 31.
- Šablony pro harnessy: `KNG_PODKLADY=<složka>` s CN v13 (+EN/DE/FR) jako
  nejvyšší verzí, CN i jako `Sablona_NABIDKA_CN_v11.docx` a PROJ v3
  pojmenovanou `Sablona_NABIDKA_PROJ.docx`; SoD realizace/projekce, plná moc
  a příručka (kopie s číslem aktuální verze, krok 0.7 skillu). V novém
  sezení nejsou — konektor Disku (hledat podle názvu), nebo
  `node nastroje/vyrob_sablony.js <CN v12 a PROJ v2> [výstup]`; PROJ v4
  a SoD PROJ v2 přepínači `--proj-v4` / `--sod-proj` (testy si je vyrobí samy).
- Harnessy a serverové sady s `ADMIN_EMAIL=spravce@priklad.cz`
  (testovaci_kolo.sh ho nastaví sám); symlink `node_modules/playwright`
  → `$(npm root -g)/playwright` (a `playwright-core`).
- Pojistky uložení i obnovy stojí v `netlify/lib/zakazka_kontrola.mjs`
  (ne v `functions/zakazky.mjs`) — tam patří i nové kontroly zakázky.
  Pořadí: typy → B111 záporné → B96 zaokrouhlení → B112 ceník → #372 profil.
- **Od B112 test nebo harness, který ukládá zakázku se změněným ceníkem,**
  musí ukládat jako administrátor, nebo nejdřív zveřejnit ceník
  (vzor `overit_online.mjs`, `cenikPlatnyTed()` v `netlify/test_prava.mjs`).
- Plán plateb: data `varianta.data.kryciProj.planPlateb` (řídký),
  snímek `zmrazenoPlan` (+ `upravene`), firemní `NAST.firma.planPlatebProj`;
  pole krycího listu `stary` (dřívější záloha / fakturace / splátky 1–8)
  jsou vidět jen u odeslané nabídky bez snímku; zapisující `planKlp*` musí
  být v `ZAMEK_CHRANENE`.
- Testovací zakázky v `netlify/test_obnova.mjs` sdílejí jednu databázi —
  nový blok potřebuje volná čísla (obsazeno 0777–0785, 0790–0794,
  0800–0804, 0999).
- `profilyNezname()` z `engine.js` volá i server (přes `globalThis`).
- Server musí načítat v `jadro_moduly.cjs` tytéž moduly migrací jako
  prohlížeč (pořadí CORE v build.py) — hlídá `src/test_zamek_historie.js`.
- Nový smyšlený kontakt v testu → `nastroje/povolene_kontakty.txt`.
- Komentář uvnitř `KOD_STRANKY` v `overit_xss.mjs` nesmí obsahovat zpětné
  apostrofy; komentář s doslovnou uzavírací značkou skriptu v `src/`
  rozbije celou aplikaci; výčet `INCLUDE*/DDE` v blokovém komentáři ho
  ukončí (`*/`).
- Kontejner běží v UTC: verze vDEN.MĚSÍC se měří k datu posledního commitu.
- LibreOffice v kontejneru nemá Writer — .docx jen strukturou XML.
- Dvě nezávislé pojistky potřebují každá vlastní cílený test.
- Čísla roadmapy přiděluje ten, kdo slučuje — před přidáním položky zjistit
  nejvyšší id v cílové větvi.

## Další krok
Čeká se na J. V. (výše): release v30.9.4, šablony CN v14 a PROJ v4,
otázky dávky K18 (výchozí odpovědi), #377, pokyn ke zbytku etapy A
a k etapě C, rozhodnutí o nálezech 22. kola a pokyn ke sloučení
`test-draft` do `test`. Nová práce vždy v paralelní větvi (`claude/…`)
z `test-draft`.
