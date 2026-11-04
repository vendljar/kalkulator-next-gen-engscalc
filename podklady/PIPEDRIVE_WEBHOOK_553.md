# Webhook „Vygenerovat nabídku“ — podklad pro integrátora (#553)

> **Interní verze.** Integrátorovi odešla 4. 11. 2026 (J. V.) zkrácená verze
> bez interních částí — „Webhook Vygenerovat nabídku — podklad pro Pipedrive“
> (Word; zdroj https://claude.ai/artifact/LYRpkUSMvM5xd7cTNH7pbT). Kontrolní
> seznam pro J. V. (část 5) je jen interní. Pravidlo J. V.: v ničem, co jde
> integrátorovi, se nezmiňuje externí nástroj pro scénáře — pro tento proces se nepoužívá.

Rozhodnutí J. V. 3. 11. 2026: **varianta A** z návrhu #553. Kalkulátor podle
ID dealu deal sám načte, založí nebo aktualizuje kalkulaci a do dealu vrátí
odkaz. **Nabídku (dokument) generuje obchodník v prohlížeči jako dosud** —
na serveru žádný dokument nevzniká a **cena se z CRM ani z webhooku nikdy
nebere**; vzniká výhradně výpočtem v kalkulaci.

Stav: hotovo v kódu (větev `claude/pw-553-webhook`), **na webu zatím
nenasazeno**. Pole v Pipedrive a automatizaci zakládá integrátor, proměnnou
prostředí nastavuje J. V. (kontrolní seznam na konci).

---

## 1. Co má integrátor založit v Pipedrive

### 1.1 Dvě vlastní pole dealu

| pole dealu | typ | kdo plní | k čemu |
|---|---|---|---|
| **Vygenerovat nabídku** | podle volby integrátora (výběr „Ano/Ne“, zaškrtávátko, text i datum projdou) | obchodník v Pipedrive | **jediný spouštěč** automatizace. Kalkulátor ho nečte. |
| **Odkaz na kalkulaci** | krátký text (`varchar`) | **zapisuje kalkulátor** | adresa kalkulace; obchodník z dealu klikne a kalkulace se mu otevře. |

Názvy polí jsou **smlouva**: kalkulátor páruje pole přesně podle názvu (bez
ohledu na velikost písmen, mezery a druh pomlčky). Přejmenované pole se
v Nastavení → Mapa polí CRM ukáže jako „chybí v CRM“ a odkaz se nezapíše
(kalkulace se přesto založí a webhook to vrátí ve `varovani`).

### 1.2 Automatizace

Spouštěč: **změna pole „Vygenerovat nabídku“** na dealu. Akce: HTTP požadavek

```
POST https://<web kalkulátoru>/api/pd/webhook
x-kalkulator-klic: <tajný klíč, hodnota od J. V.>
Content-Type: application/json

{ "dealId": {{deal.id}} }
```

Klíč jde poslat i jako `Authorization: Bearer <klíč>` nebo heslem HTTP Basic
(jméno je libovolné). **V adrese (query) se klíč nepřijímá** — adresy se
logují.

---

## 2. ⚠️ Varování před smyčkou

Kalkulátor zapíše do dealu odkaz na kalkulaci, a tím **posune `update_time`
dealu**. Proto:

- automatizace se smí spouštět **jen změnou pole „Vygenerovat nabídku“**;
- **nikdy** spouštěčem „deal aktualizován“ / „změna jakéhokoli pole“ —
  vznikla by smyčka (zápis odkazu → aktualizace dealu → nový webhook → …);
- na změnu pole „Odkaz na kalkulaci“ nesmí reagovat žádná automatizace.

Pojistka na naší straně: **strop 60 volání za hodinu** (pak 401/429, viz
níž). Smyčka tedy nevyčerpá denní rozpočet tokenů Pipedrive, ale zastaví se
až po šedesátém volání — spouštěč je potřeba nastavit správně.

Opakované doručení téhož dealu je bezpečné: druhé a další doručení
**nezaloží druhou kalkulaci** a když se nic nezměnilo, do dealu se nic
nezapisuje (odpověď `"akce": "bezeZmeny"`, `"odkazDoDealu": "beze-zmeny"`).

---

## 3. Co kalkulátor udělá

1. Ověří klíč (v konstantním čase). Bez klíče nebo se špatným klíčem **401
   a do Pipedrive se vůbec nesáhne**.
2. Z těla si vezme **jen ID dealu**. Cokoli dalšího v těle (cena, název,
   adresa, pole) se **ignoruje**.
3. Deal si načte z Pipedrive sám (`GET /api/v2/deals/<id>` + organizace
   a osoba dealu), mapa polí podle názvu — tatáž cesta jako „Načíst
   z Pipedrivu“ v hlavičce kalkulace.
4. Najde kalkulaci podle vazby na deal, jinak podle čísla nabídky; jinak ji
   **založí**. Přenese zadání z dealu (§12 / #113):
   číslo nabídky a název akce, adresu realizace, zákazníka (organizace
   dealu), IČO, kontakt (osoba dealu) a podle **Typu zakázky** stranu
   (Projekce… → hlavička PROJ, ostatní → OCK) a *Konečné předání díla*
   z „Předpokládané datum ukončení realizace“.
5. Do dealu zapíše **odkaz na kalkulaci** — jediný zápis do Pipedrive.

**Co kalkulátor nikdy neudělá:** nepřepíše odeslanou (zamčenou) nabídku ani
hlavičku zakázky, která už nějakou odeslanou nabídku obsahuje; nepřepíše,
co obchodník v kalkulaci změnil ručně (přepíše jen prázdné pole nebo
hodnotu, kterou tam dal minulý webhook — pole vypisuje v `ponechano`);
nepřevezme cenu; nevytvoří dokument.

---

## 4. Odpověď

200 (`Content-Type: application/json`):

```json
{ "ok": true, "akce": "zalozeno", "dealId": "1042",
  "soubor": "CN-123.json", "odkaz": "https://…/?zakazka=CN-123.json",
  "zmeneno": ["nazevAkce", "adresa"], "ponechano": [], "zamceno": false,
  "odkazDoDealu": "zapsano", "varovani": [] }
```

- `akce`: `zalozeno` · `aktualizovano` · `bezeZmeny`
- `zmeneno` / `ponechano`: **názvy polí**, nikdy hodnoty
- `odkazDoDealu`: `zapsano` · `beze-zmeny` · `nezapsano`
- Odpověď **nenese** e-maily ani telefony z CRM, token Pipedrive, klíč
  webhooku ani hashe polí Pipedrive (podmínka K8-S3 / SEC-PD z #115).

### Chybové kódy

| kód | kdy | co s tím |
|---|---|---|
| **400** | tělo není JSON nebo chybí platné `dealId` (kladné celé číslo) | opravit mapování `{{deal.id}}` v automatizaci |
| **401** | chybí klíč, špatný klíč, klíč jen v adrese | zkontrolovat hlavičku v automatizaci; **do Pipedrive se nesáhlo** |
| **404** | Pipedrive deal nezná | — |
| **405** | jiná metoda než POST | — |
| **409** | deal patří jiné nabídce (jiné „Číslo nabídky (CN)“), číslo nabídky už má kalkulace jiného dealu, deal je smazaný, nebo kalkulaci právě někdo uložil | srovnat číslo nabídky v dealu; poslední případ = poslat znovu. **Nic se nezměnilo.** |
| **413** | tělo nad 16 kB | posílat jen `dealId` |
| **422** | deal nemá číslo nabídky (pole CN prázdné a název nezačíná `CN-…`, `OVP-CN-…` ani `OPR…`) | doplnit číslo v Pipedrive a změnit pole znovu |
| **429** | strop 60 volání za hodinu | nejčastěji špatný spouštěč (smyčka) — viz část 2 |
| **502** | Pipedrive neodpověděl nebo odmítl token | zkusit později; token řeší J. V. |
| **503** | webhook nebo napojení na Pipedrive není nastavené (chybí proměnná) | nastavení v Netlify, viz část 5 |

Opakování: u 429, 502 a 503 má smysl zkusit znovu později (ne ve smyčce).
U 4xx opakování nepomůže.

---

## 5. Kontrolní seznam pro J. V. (nasazení na testovací web)

- [ ] **Vymyslet klíč** — náhodných **aspoň 32 znaků** (kratší se bere jako
      nenastavený a webhook vrací 503). Např. v terminálu
      `openssl rand -base64 36`. Klíč **nepatří** do repozitáře, do chatu ani
      do e-mailu; integrátorovi se předává zvlášť (do pole v automatizaci ho
      vloží on, nebo mu ho vložíte vy).
- [ ] **Netlify → projekt `testengscalc` → Project configuration →
      Environment variables → Add a variable:**
      `PIPEDRIVE_WEBHOOK_KLIC` = klíč, zaškrtnout „Contains secret values“,
      rozsah aspoň **Functions**.
- [ ] Ověřit, že v témže projektu je **`PIPEDRIVE_TOKEN` a `PIPEDRIVE_DOMENA`**
      (postup `podklady/PIPEDRIVE_TOKEN_POSTUP.md`) — bez nich webhook vrací
      503. Dokud je nastavený `PIPEDRIVE_SIMULATOR`, pracuje webhook se
      smyšlenými daty a do skutečného CRM nejde nic.
- [ ] **Nové nasazení** (proměnná se projeví až po něm): Netlify → Deploys →
      Trigger deploy → *Deploy site*.
- [ ] Požádat integrátora o **obě pole** (část 1.1) a o automatizaci
      (část 1.2) — **jen** na změnu pole „Vygenerovat nabídku“.
- [ ] V kalkulátoru **Nastavení → Mapa polí CRM → Obnovit z CRM**: obě nová
      pole musí být **spárovaná**.
- [ ] **Zkouška na dealu „TEST – integrace kalkulačky“:** vyplnit v něm
      „Číslo nabídky (CN)“, přepnout pole „Vygenerovat nabídku“ →
      v Pipedrive se do „Odkaz na kalkulaci“ objeví adresa; po kliknutí se po
      přihlášení otevře kalkulace s číslem, názvem akce, adresou,
      zákazníkem, IČO a kontaktem z dealu. **Cena je nulová, dokud ji
      obchodník nedopočítá** — tak to má být.
- [ ] Přepnout pole **ještě jednou**: v databázi musí být **pořád jedna**
      kalkulace a v dealu týž odkaz.
- [ ] Na **ostrý web (schaftscalc / engscalc) se klíč nevkládá**, dokud
      zkouška na testu neproběhne a J. V. nerozhodne.
