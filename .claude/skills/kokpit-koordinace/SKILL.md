---
name: kokpit-koordinace
description: Živý kokpit koordinace dávek Kalkulator Next Gen — artefakt „Kokpit dávek KNG“ s přehledem běžících sezení, fází, odhadu zbývajícího času, čerpání kontextu, větví (main / test / integrace / celé kolo), releasů a toho, co čeká na J. V. Použij VŽDY v koordinačním sezení (řídí dávky v samostatných sezeních, slučuje do test, pouští kola), hned na začátku a po každé události; i když J. V. řekne „kokpit“, „ukaž stav sezení“, „co běží“. Komunikace česky.
---

# Kokpit koordinace dávek (pokyn J. V. 15. 10. 2026)

J. V. chce **vizuální představu, co které sezení řeší a v jakém je stavu**, a to
**v každém koordinačním sezení, aktivní a dynamickou**. Kokpit je jeden trvalý
artefakt — každé koordinační sezení ho převezme a publikuje do **stejné URL**.

- Trvalá URL: **https://claude.ai/artifact/LLLBVLxKcWDHhd8axapiU2**
- Šablona stránky: `kokpit_sablona.html` (vedle tohoto souboru) — zdroj pravdy
  pro vzhled; data jsou v bloku `<script id="data" type="application/json">`.

## Převzetí v novém koordinačním sezení

1. `Artifact action=read url=<URL výše>` — vezmi aktuální data (živější než
   šablona). Ulož stránku do scratchpadu (`kokpit.html`).
2. Publikuj **s `url` = trvalá URL** (jinak vznikne nový artefakt). Při dalších
   publikacích ze stejného souboru už `url` netřeba.
3. Do deníku zapiš „Koordinaci převzalo session_…“, do `koordinace` své id.

## Kdy aktualizovat

Po **každé** události, jinak nejméně při každé kontrole (~20 min):
nový commit v dávkové větvi, souhrn ze sezení, sloučení do integrace, výsledek
sad, posun `test`, start/konec celého kola, release, rozhodnutí J. V., nová
otázka na J. V. Malé změny posílej jako `edits` na publish téhož souboru
(řetězce kopírovat přesně z JSON v souboru).

**Před každým publishem ověř data:** `python3 .claude/skills/kokpit-koordinace/kontrola.py <kokpit.html>`
— 15. 10. kokpit „havaroval“ (prázdná stránka) kvůli čárce navíc v JSON po smazání
řádků. Stránka teď poškozená data ohlásí v rámečku nahoře, ale kontrola má
chybu chytit dřív. Mazat celé objekty i s čárkou před nimi.

## Data (JSON) — co kam

| Pole | Obsah |
|---|---|
| `aktualizace` | „15. 10. 2026 15:25 UTC“ — čas posledního přepsání |
| `koordinace` | `{id, kontext}` — kontext v % z `get_session` (bez id) |
| `cekaNaJV` | jen věci, které opravdu čekají na J. V. (rozhodnutí, release k vydání, oprávnění); prázdné pole = zelený rámeček „Nic na vás nečeká“ |
| `dlazdice` | 4 dlaždice: main, test, integrace, celé kolo; `s` = ok / run / warn / bad / idle |
| `releasy` | jeden řádek: vydané / bez tagu (z `release_odkaz.py --chybejici` + GitHub `list_releases`) |
| `faze` | `["kód","testy","mutace","souhrn","integrace","sady","test"]` |
| `sezeni` | **všechna NEarchivovaná sezení** (`list_sessions mine:true`, status ≠ ARCHIVED) s **přesným názvem** (`title`): `nazev, id, role (koordinace / dávka / jiné), stav (run/ok/warn/bad/idle), stavText, faze (index 0–7 u dávek, jinak null), eta, kontext, co, dalsi` |
| `log` | `[čas, událost]`, nejnovější nahoře; stačí ~10 posledních |

- **Kontext** sezení: `get_session(session_id)` → `external_metadata.context_usage`
  (`used_tokens / max_tokens`, v %). Hodnota 0 / chybějící = `null` („kontext ?“).
  Nad 60 % žlutě, nad 75 % červeně → sezení upozornit, ať přepíše PREDAVKA.
- **Odhad zbývajícího času** dělá koordinace: kód+testy ~1 h, mutace ~20–40 min,
  sady nad integrací ~25 min, celé kolo s mutacemi ~4 h; uprav podle tempa sezení
  (`task_summary`, poslední commity). Vždy jako „~40 min“, „~1,5 h“, „hotovo“.
- **Fáze** podle důkazů: commit s kódem → testy; zmínka o mutacích → mutace;
  zpráva do koordinace → souhrn; merge do `claude/integrace-…` → integrace;
  běžící `spust_testy.sh --smoke` → sady; fast-forward `test` → 7.

## Co zobrazovat (J. V. 15. 10. 2026)

- **Hotová a archivovaná sezení nezobrazovat** — zmizí, jakmile je sezení
  archivované. Dávka hotová, ale ještě nearchivovaná, zůstává (s fází, dokud
  není v `test`).
- **Zobrazit všechna aktuálně nearchivovaná sezení s přesným názvem** — i ta,
  která koordinace nespustila (R1, R2, starší). Nečinná hotová sezení navrhnout
  J. V. k archivaci (v „Čeká na vás“); archivovat jen na jeho pokyn.

## Vzhled (neměnit bez pokynu)

Týdenní limit v kokpitu NE (J. V. 16. 10.): procento čerpání z prostředí nejde zjistit, odhad by byl zavádějící.


Úzký velín pro postranní okno Claude (~600 px): drobné písmo (12,5 px), IBM Plex
Sans / Mono, Barlow Condensed na čísla; světlé i tmavé téma přes tokeny; žádná
vodorovná posuvná lišta. Dávka = kompaktní karta (vlevo id + verze, uprostřed
co řeší + pruh fází, vpravo zbývá + kontext, dole „Další“). J. V. se líbí —
zachovat.

## Hlídání releasů (J. V. 15. 10. 2026)

Před každým odkazem na nový release `python3 nastroje/release_odkaz.py <verze> <SHA>`
— nástroj sám ověří tag v origin a u existujícího tagu odkaz nevyrobí (kód 3).
Stav releasů do kokpitu (`releasy`) z `--chybejici` a GitHub `list_releases`.
Release jde jen pro verzi, která je v `test`; mezilehlé verze (sloučené do
integrace a do `test` až s další) samostatný release nemají.

## Předávka

Při konci koordinačního sezení zkopíruj aktuální stránku do
`.claude/skills/kokpit-koordinace/kokpit_sablona.html` (data můžou zůstat — jsou
bez cen a osobních údajů) a odkaz uveď v předávce koordinace.
