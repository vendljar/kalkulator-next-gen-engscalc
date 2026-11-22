# STAV – zkouška BZ (opravy bezpečnostního auditu B231, B234, B235/B236, v22.11.3) na testu, 22. 11. 2026

## Hlavička

- **Test:** v22.11.5 (`origin/test` 05a496d), dávka BZ = v22.11.3 (+ v22.11.4 jen test).
- **Souhlas:** trvalý souhlas J. V. se zápisem na test (19. 11. 2026). Zadání od koordinace.
- **Kdo:** testovací sezení Claude v Playwrightu. Dva různé účty: **správce** (Administrátor) a **obchodník**.
- **Pipedrive:** `/api/pd*` blokováno (kromě suchého běhu). V této zkoušce nebylo potřeba nic.
- **Harness:** `podklady/kola/harness_testovani/bz.js`. Navazuje na `vzd.js` (`cisla.json`) a používá pomůcky `vzd_spolecne.js`. Části volí `BZ_CAST=1,2`.
- **Běhy:**
  - Běh 1 spadl na chybě harnessu (`surove` bez argumentu), ještě před zápisem.
  - Běh 2 doběhl část 1 a spadl na začátku části 2: obchodník otevřel kartu dřív, než se načetl seznam karet.
  - Běh 3 a 4 dělaly jen část 2 (úplná, 15/0). Běh 4 jen zpřesnil kontrolu 2j.
- **Zakázky:**
  - `TEST - 2026 - OPR - CN - 9830` (správce, odeslaná ve VZD, tady prodaná);
  - `TEST - 2026 - OPR - CN - 9832` (nová, obchodník);
  - `TEST - 2026 - OVP - CN - 9830` (nová, PROJ ze zadání 7650-K29-N50, `jenProj` vypnuté, stranu určuje číslo).
- **Karty:** `TEST BZ karta správce s.r.o.` (IČO 99832011), `TEST BZ karta obchodník s.r.o.` (IČO 99832020), smyšlené údaje. Na konci smazané.

## Výsledky

### B231 — strana zakázky po zámku

| bod | výsledek | důkaz |
|---|---|---|
| nový zámek nese snímek strany | ✅ | 9830 po CN: `zamek.strana` = `{jenProj:false, jenOck:false, vyrazena:"proj"}`. OVP 9830: `{…, vyrazena:"ock"}`. |
| odeslaná OCK, správce, klient | ✅ | `set('ZAK.jenProj'/'ZAK.jenOck', true)` se nezmění, hláška „Zakázka má odeslanou (uzamčenou) nabídku — strana zakázky (jen projekce / jen realizace, vedoucí strana podle čísla nabídky) se už nemění …“. Zaškrtávátko „jen PROJ“ v Kalkulaci není `disabled`, důvod se hlásí při změně (podle CHANGELOG). |
| odeslaná OCK, správce, server | ✅ | Obchvat klienta (`ZAK.jenProj = true`, resp. `jenOck`) → `POST /api/zakazky` **403** „Neuloženo: Zakázka má odeslanou (uzamčenou) nabídku — strana zakázky …“ (jedna předpona „Neuloženo:“). |
| odeslaná OCK obchodníka (autor 9832) | ✅ | Klient: oba příznaky odmítnuty s týmž důvodem. Server: `jenProj` i `jenOck` → **403** se stejnou hláškou. |
| cizí odeslaná OCK, obchodník (klient) | ✅ | Na 9830 se příznak nezmění. Brání už zámek čtení (dialog „Varianta … je uzamčená“). |
| prodaná OCK (9830 po Prodáno) | ✅ | Prodáno klikem v KL: 200, bez 409. Potom klient správce oba příznaky odmítne a server `jenProj` → **403** „strana zakázky“. |
| odeslaná PROJ (OVP 9830) | ✅ | Klient: `jenOck` i `jenProj` odmítnuty. Server (správce): `jenProj` → 403 „strana zakázky“. Číslo `OVP → ÓVP` (R2) → **403** „strana zakázky“. |
| doplnění čísla druhé strany | ✅ PROJ / ℹ OCK | PROJ: doplnění čísla OCK (OVP do hlavičky PROJ, OPR do čísla zakázky) → **403**. Odmítne ho už dřívější kontrola B153/D6 („Neuloženo: dokument strany PROJ (nabidkaProj) — kalkulace PROJ je u téhle zakázky uzamčená a vynulovaná …“), ne hláška B231. OCK: doplnění čísla PROJ k odeslané OCK 9830 **prošlo (200)**, vyřazená strana zůstala `proj`. Podle pravidla R2 je to správně (vedoucí strana OCK se nemění, D6e), viz BZ-I1. Číslo se hned vrátilo (200). |

### B234 — karta zákazníka

| bod | výsledek | důkaz |
|---|---|---|
| 2a založení | ✅ | Správce založí kartu přes UI (`zakaznikUloz`). Autora píše server = účet správce. |
| 2b cizí karta → návrh | ✅ | Obchodník kartu otevře a v UI vidí poznámku „Kartu mění jen její autor … a administrátor …“. Změna kontaktu se uloží jako **návrh**: na kartě je 1 návrh a kontakt beze změny. Hláška „Vaše úprava se uložila jako návrh změny. Převezme ji autor karty nebo administrátor.“ |
| 2c návrh nepřevezme cizí | ✅ | `navrhPrijmout` od obchodníka → **403** „Návrh změny karty převezme nebo zamítne jen autor karty nebo administrátor.“ V UI obchodník tlačítka Převzít/Zamítnout nemá. |
| 2d/2f převzetí a zamítnutí | ✅ | Správce převezme návrh tlačítkem „Převzít“: kontakt změněn a návrh pryč („Návrh změny převzat do karty.“). Druhý návrh zamítne: karta beze změny a návrh pryč. |
| 2e/2i/2j historie | ✅ | Po převzetí: 1 verze s `proc` „návrh …“ a předchozím kontaktem. Karta obchodníka: autor ji mění přímo (2g, „Uloženo.“) a správce jako admin také přímo bez návrhu (2h). Historie má 2 verze `úprava`. „Historie verzí (2)“ se vykreslí po tlačítku (`zakaznikHistorieUI`). |
| 2k/2l/2m smazání | ✅ | Obchodník kartu nesmaže (**403**, „K této akci je potřeba role: Administrátor.“). Správce smaže obě karty (200): karta i historie jsou pryč (`historie=1` → []). Nová karta se stejným IČO historii nezdědí (R5), pak se smazala. |

### B235/B236 — vypínač zápisu do Pipedrive (`PIPEDRIVE_ZAPIS`)

| bod | výsledek | poznámka |
|---|---|---|
| odkaz / poznámka jen varují | ⚠ **NEOVĚŘENO** | Zápisové cesty potřebují zakázku navázanou na deal: poznámka dealu při uložení, vítěz `/api/pd/organizace`, zrušení vazby `/api/pd/vazba` a odkaz z webhooku. Navrhovaná sonda (TEST zakázka s vymyšleným číslem dealu) nebyla v sezení povolena: nic do živého Pipedrive, ostatní `/api/pd*` blokované. Zbývá ověřit na dealu TEST nebo v simulátoru Pipedrive. Kódem: `pdZavolej` odmítne každé ne-GET volání do skutečného Pipedrive (503 „Zápis do Pipedrive je vypnutý …“), vítěz vrátí 503 s touž větou a poznámka dealu tiše `stav: 'bez'` **bez varování**. Formulace „jen varují“ tedy u poznámky neplatí, ta se nehlásí vůbec (`pd_poznamka.mjs`: „ani se nehlásí“). |

## Nálezy a informace

- Nová vysoká ani cenová vada se nenašla.
- **BZ-I1 (informace):** k odeslané (i prodané) OCK zakázce jde na serveru doplnit číslo PROJ (`projHlavicka.cislo`). Strana se nemění, vedoucí zůstává OCK, takže to B231 neporušuje.
  - Zadání koordinace čekalo „doplnění čísla druhé strany odmítnuto“. To platí jen tam, kde by číslo stranu přepnulo (PROJ → doplněné OCK).
  - Jestli se má hlavička PROJ po odeslané CN OCK zmrazit, rozhodne J. V. / koordinace.
- **BZ-I2 (informace):** PROJ s doplněným číslem OCK odmítá dřívější kontrola B153/D6 (dokument vyřazené strany), ne hláška B231. Výsledek je stejný (403), jen důvod je jiný.
- **BZ-I3 (neověřeno):** vypínač `PIPEDRIVE_ZAPIS` na testu. Viz tabulka, potřebuje deal TEST nebo simulátor.

## Úklid

- Zakázky na testu:
  - `TEST - 2026 - OPR - CN - 9830`: odeslaná a **prodaná**.
    - Prodáno mohlo připravit zápis do Pipedrive jako „čeká na odeslání“ (jako u D8). Nic neodešlo, `/api/pd*` blokováno.
    - Číslo PROJ bylo jednou doplněno a vráceno.
  - `TEST - 2026 - OPR - CN - 9832` (obchodník): odeslaná CN.
  - `TEST - 2026 - OVP - CN - 9830`: odeslaná CN PROJ.
- Karty zákazníků `TEST BZ …`: všechny smazané a historie také (ověřeno GET).
- Firma, ceník, šablony, číselníky ani vypínače se neměnily.
- Zápisy:
  - `POST /api/zakazky`: 200, záměrná 403;
  - `POST /api/zakaznici`: 200, záměrná 403;
  - `DELETE /api/zakaznici`: 200, záměrná 403;
  - `POST /api/analytika`: 200.
