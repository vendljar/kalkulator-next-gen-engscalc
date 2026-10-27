# Koncept upomínky integrátorovi Pipedrive (#536 → #509, #510)

Připraveno 27. 10. 2026 pro J. V. — **odesílá J. V.** (nic se neodeslalo).
Bez osobních údajů a cen; jména a adresy doplní J. V. Navazuje na otázky
z 21. 10. 2026 (`podklady/NAVRH_PIPEDRIVE_ZAPIS_2026-09-22.md` §11.9);
co mezitím rozhodl J. V., je v textu už jako sdělení, ne otázka.

---

**Předmět:** Pipedrive × kalkulátor — doplnění k polím z 21. 10. a zkušební zápis

Dobrý den,

ještě jednou díky za založení polí dealu 21. 10. Čtením jsme ověřili, že
53 z 54 nových polí a všechny 4 úpravy sedí názvem, typem i volbami.
Kalkulátor je na napojení připravený (párování polí, převod hodnot, náhled
„co by se zapsalo" a simulátor pro vývoj) — **zapisovat do Pipedrive
začneme až po Vašich odpovědích** níže a po zkušebním zápisu na
testovacím dealu. Prosím o krátké odpovědi, stačí k číslům.

**A. Co od Vás potřebujeme doplnit v Pipedrive**

1. **Nové pole „Platební kalendář SoD PROJ"** — typ *Velký text*, u dealu.
   Rozhodli jsme, že pevné „Platba 1–8" kalkulátor plnit nebude (nové
   nabídky projekce mají proměnný plán plateb); místo nich zapíše jeden
   text s celým kalendářem plateb ze smlouvy. Pole „Platba 1–8"
   nechte, jak jsou — kalkulátor do nich nesahá.
2. **Volba „Zjišťuje se"** v poli „Objekt v památkové ochraně" (dnes jen
   Ano / Ne; kalkulace tu volbu zná).
3. **„Způsob fakturace" u projekce** — kalkulace projekce má předvolby
   plánu plateb („záloha X % po podpisu, zbytek po předání stupňů",
   „po milnících jednotlivých činností", „podle dohodnutého plánu plateb"),
   pole v Pipedrive jen tři volby. Doplníte volby, nebo pole změníme na
   text? (Názvy polí a voleb prosím neměňte bez domluvy — kalkulátor páruje
   pole **přesně podle názvu**; přejmenované pole se mu jeví jako chybějící.)

**B. Otázky (rozhodují, jestli zápis proběhne bez ztráty)**

4. **Automatizace:** co v Make (nebo jinde) reaguje na **změnu dealu**
   nebo jeho vlastních polí? Před prvním zápisem potřebujeme vědět, jestli
   zápis z kalkulace něco nespustí (e-mail, úkol, posun fáze, kopii jinam).
5. **„Typ produktu / služby"** (č. 10 tabulky) se nezaložil — nahrazuje ho
   stávající „Typ zakázky" se stejnými volbami? Kalkulátor ho jen čte.
6. **Viditelnost polí OCK / PROJ:** tabulka počítala s viditelností podle
   pipeline, účet má ale jedinou pipeline „Obchod" — jak má být
   viditelnost nastavená?
7. **Zákazník** = Organizace a Osoba dealu; „Zdroj poptávky – Organizace /
   Osoba" bereme jen jako informaci, kdo poptávku přinesl. Je Organizace
   dealu vždy smluvní partner?
8. **„Hlavní projektant"** je typu Uživatel — projektant, který není
   uživatelem Pipedrive, se nezapíše (kalkulace ho drží jako text). Je to
   v pořádku, nebo má být pole textové?
9. **„Informováno Backoffice / Technické odd."** (datum) — plní ho
   automatizace? Kalkulátor ho nezapisuje.
10. **Zádržné** jen 5 / 10 / 15 / 20 % — stačí tyto hodnoty?
11. **Číslo nabídky (CN)** chodí s mezerami a u varianty s příponou „.2"
    (např. „2026 - OPR - CN - 0123.2") — pole prosím nevalidujte vzorem.
12. **Vícevýběr** („Dokumentace v rozsahu") vyprazdňujeme hodnotou `null`
    (API v2 nepřijme `[]`) — vadí to něčemu v Make?
13. **Limit smluvních pokut** „neuplatněn" posíláme jako 0 — souhlasí?
14. **Převod starého ANO / NE** u „Způsob fakturace" — jak se převáděly
    dosavadní hodnoty?
15. **„Stav kalkulace" a webhook** (návrh §3.8) — je to ve Vašem plánu,
    a kdy?

**C. Zkušební zápis (náš krok, potřebujeme Váš souhlas)**

16. Po odpovědi na bod 4 bychom na **samostatném dealu** „TEST – integrace
    kalkulačky" zapsali po jedné hodnotě od každého typu pole (text, velký
    text, číslo, datum, výběr, vícevýběr, měna, uživatel), přečetli je zpět
    a deal smazali. Řádově 15 tokenů denního rozpočtu. Souhlasíte, případně
    chcete u toho být nebo deal připravit sami?
17. Pro napojení doporučujeme **samostatného uživatele pro integraci**
    (token je vázaný na člověka). Je to z Vaší strany možné a kdo ho zakládá?
    Uživatel potřebuje vidět všechny dealy, organizace a osoby a číst seznam
    uživatelů.

Děkujeme a předem díky za odpověď.

S pozdravem
[jméno, firma — doplní J. V.]

---

## Poznámky pro J. V. (do e-mailu nepatří)

- Body 1–3 jsou úkoly, 4–15 otázky z 21. 10. (č. 9 z §11.9 už rozhodnuto
  23. 10. — #512 — proto je teď úkolem v bodě 1), 16–17 souvisí s #510.
- Na bodě 4 závisí #510 (zkušební zápis) i #115 (zápis z aplikace).
- Bod 13: pokud integrátor řekne ne, změní se jen převod v
  `netlify/lib/pd_prevod.mjs` (`prevod: 'limit'`).
- Odpovědi zapsat do #509 a promítnout do `netlify/lib/pd_mapa.mjs`
  (názvy, typy, volby) — přehled v Nastavení → Mapa polí CRM pak ukáže, zda
  vše sedí.
