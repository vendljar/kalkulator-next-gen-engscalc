# Předávka dávky JT — jazyk hlavičky specifikace = Jazyk tisku (22. 11. 2026)

Větev `claude/jt-jazyk-tisku` nad integrací `05a496d` (v22.11.5). Pracovní verze v22.11.6, pracovní číslo
roadmapy #713 (alias JT) — přečísluje koordinace. Zadání J. V. 22. 11. 2026 přes koordinaci.

## Co je hotové

- `src/ui/techspec_ui.js`: vlajky „Jazyk dokumentu“ volají `tsJazykPrepni(k)` = `tiskJazykNastav(k)` +
  `jazykSet(k)`. Karta „Cenová nabídka (OCK)“ je ve funkci `tsNabidkaKarta()` a kreslí ji česká verze
  i cizojazyčný náhled (pod „Print specification / PDF“) — tentýž `nabidkaDokumentyBlok()`: fotka,
  `kontrolyPanel()`, `ukazkoveZabranaPanel()`, zábrany u tlačítek, tři tlačítka se svými funkcemi.
- `src/ui/common.js`: `tiskJazykNastavOck(v)` (Jazyk tisku u nabídky OCK přepne náhled specifikace,
  „dle Nastavení“ nic) a `tiskJazykVyber('ock')`; bez parametru (PROJ, SoD) beze změny. Select má třídu
  `tiskJazyk`.
- `src/ui/zakazka_ui.js`: `nabidkaDokumentyBlok` volá `tiskJazykVyber('ock')`.
- Uložení: nic nového. Jazyk tisku jen pro relaci (#143), jazyk dokumentu `NAST.jazyk` v Nastavení
  jako dosud (vlajky ho ukládaly i předtím). Zvažováno pamatovat u varianty — nezavedeno (zdvojení stavu).

## Testy

- `src/test_jt_jazyk_tisku.js` 23 OK (nad 05a496d 10 FAIL / 5 OK), `overit_jt_jazyk_tisku.mjs` 19 OK
  (nad 05a496d selže body 1 a 3), mutace jádra `[JT]` 9/9.
- Kolo: viz zpráva koordinaci / CHANGELOG v22.11.6.

## Co ověřit na testu

1. Zakázka OCK → Technická specifikace → vlajka EN: náhled EN, dole karta Cenová nabídka (OCK),
   Jazyk tisku = anglicky; Word a „Kompletní náhled a tisk nabídky“ vyjdou anglicky (EUR).
2. Žlutý blok „Než nabídku odešlete…“ v EN náhledu (např. chybějící EN varianta dodatkového textu).
3. Odeslaná (zamčená) nabídka z EN náhledu: stejné dotazy zámku jako v CZ.
4. Zpět CZ: editace, Jazyk tisku česky. Jazyk tisku „německy“ v CZ přepne náhled na DE.
5. PROJ: Jazyk tisku v nabídce PROJ jazyk specifikace nemění.
