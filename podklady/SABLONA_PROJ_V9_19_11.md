# Šablona nabídky PROJ (OVP-CN) v9 — DALŠÍ UJEDNÁNÍ — CZ + EN + DE + FR (19. 11. 2026)

Dávka PG #3 (zadání J. V. 19. 11. 2026, větev `claude/pg-tisk`). Předchozí krok: `SABLONA_PROJ_V8_20_10.md`.

> **v9 = v8 + blok DALŠÍ UJEDNÁNÍ za termíny, nic jiného.** Šablonu vyrobí a nahraje **J. V.** (firemní šablony
> v repozitáři nejsou, toto sezení je nemá). Na **test** až s verzí aplikace, která DALŠÍ UJEDNÁNÍ PROJ umí
> (dávka PG); na **main** až s ní v main.

## 1. Co v9 přidává

Hned za značku `{{BLOK_TERMINY_KON}}` (tedy za tabulku TERMÍNY a obě poznámky pod ní, před blok doložek):

```
{{BLOK_DALSI_UJEDNANI_ZAC}}
(prázdný odstavec — mezera jako před doložkami)
[ DALŠÍ UJEDNÁNÍ:                     |                              ]   ← nadpisový řádek tabulky TERMÍNY
[ {{PROJ_DALSI_UJEDNANI_NAZEV}}       | {{PROJ_DALSI_UJEDNANI_TEXT}} ]   ← řádek termínů se symboly
{{BLOK_DALSI_UJEDNANI_KON}}
```

- Tabulka je **kopie tabulky TERMÍNY** (šířky, rámečky, písmo zůstanou), jen nadpis zní „DALŠÍ UJEDNÁNÍ:"
  a symboly termínů se přejmenují. Kopie nenese `w14:paraId` (identifikátory se v dokumentu nezdvojí).
- Aplikace řádek zopakuje za každý vlastní řádek obchodníka (popisek vlevo, text vpravo — `rozvinRadkyZaRadek`).
- **Bez vlastních řádků blok zmizí i s nadpisem** — dokument je pak stejný jako z v8 (ověřeno testem
  `src/test_pg_proj_dalsi.js`, „Word v9 bez řádků = Word v8").
- Proti v8 přibudou přesně **4 symboly**: `PROJ_DALSI_UJEDNANI_NAZEV`, `PROJ_DALSI_UJEDNANI_TEXT`,
  `BLOK_DALSI_UJEDNANI_ZAC`, `BLOK_DALSI_UJEDNANI_KON`; ubude 0.

## 2. Výroba

```
node nastroje/vyrob_sablony.js --proj-v9 <složka s v8> <výstupní složka>
```

- Vstup: `Sablona_NABIDKA_PROJ_v8.docx` a, jsou-li ve složce, `Sablona_NABIDKA_PROJ_v8_EN.docx`, `_DE`, `_FR`
  (zveřejněné jazykové v8 ze serveru — Nastavení → Šablony → stáhnout).
- **Jazykové v9 vznikají přímo z jazykové v8** téhož jazyka: zbytek textu zůstane znak po znaku, nadpis je ze
  slovníku aplikace bez dvojtečky, stejně jako ostatní přeložené nadpisy (EN „OTHER ARRANGEMENTS",
  DE „WEITERE VEREINBARUNGEN", FR „AUTRES DISPOSITIONS"). Chybí-li jazyková v8, vznikne v9 toho jazyka
  strojovým překladem české v9 (výpis to řekne).
- Výstup: `Sablona_NABIDKA_PROJ_v9.docx`, `_EN`, `_DE`, `_FR`. Výpis u každého souboru: počet symbolů,
  vady XML (musí být žádné), rozdíl symbolů proti CZ (musí být +0 −0). Kód 1 = něco nesedí, nenahrávat.
- Nástroj nic nehádá: odmítne vstup, který už DALŠÍ UJEDNÁNÍ má, vstup bez cestovného (není v8), chybějící nebo
  zdvojený blok `{{BLOK_TERMINY_ZAC/_KON}}`, víc tabulek v něm a tabulku termínů jiné stavby než v6
  (nadpis + řádek `{{PROJ_TERMINY_CINNOST}} | {{PROJ_TERMINY_TERMIN}}`).

## 3. Postup nahrání (J. V.)

0. Web běží na verzi aplikace s dávkou PG (test po sloučení koordinací; main až po nasazení).
1. Administrátor → **Nastavení → Šablony → Šablona cenové nabídky PROJ (OVP-CN)** → „Nahrát novou českou
   verzi…" → `Sablona_NABIDKA_PROJ_v9.docx`. Kontrola průvodce: proti v8 **přibyly 4, ubylo 0**, jazyk čeština, bez vad.
2. Jazykové verze: nahrát `…_v9_EN/_DE/_FR.docx` z výroby → **Zveřejnit**.
3. Tabulka šablon: OVP-CN v9 a EN/DE/FR „✓ z v9", nic „zastaralá".
4. Zkouška: zakázka PROJ, v kartě Cenová nabídka (PROJ) „+ přidat vlastní řádek" (dva řádky, jeden jen
   s popiskem) → Word CZ + EN: tabulka DALŠÍ UJEDNÁNÍ za termíny, řádky v pořadí, žádné `{{PROJ_…}}`.
   Zakázka bez vlastních řádků: Word bez nadpisu DALŠÍ UJEDNÁNÍ.

## 4. Starší šablona a starší aplikace

- **Aplikace s PG + šablona v8 (nebo starší):** nabídka vznikne, DALŠÍ UJEDNÁNÍ je jen v online náhledu.
  Kontrola před nabídkou ukáže varování **„Word nabídky PROJ neuvede DALŠÍ UJEDNÁNÍ"** (`dalsiUjednaniWordProj`)
  — až obchodník nějaký vlastní řádek má. Zábrana to není.
- **Aplikace bez PG + šablona v9:** symboly DALŠÍ UJEDNÁNÍ aplikace nezná → v dokumentu by zůstal blok
  s `{{PROJ_DALSI_UJEDNANI_…}}`. ⇒ **v9 nahrávat až s verzí aplikace s PG**.

## 5. Ke kontrole rodilými mluvčími

Nadpis ze slovníku: EN „OTHER ARRANGEMENTS", DE „WEITERE VEREINBARUNGEN", FR „AUTRES DISPOSITIONS" (stejný jako
u DALŠÍ UJEDNÁNÍ v nabídce OCK). Vlastní text obchodníka se překládá jen tam, kde ho slovník zná celý.
