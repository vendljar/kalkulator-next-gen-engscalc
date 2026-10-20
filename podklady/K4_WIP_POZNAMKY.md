Čočka 3 (CI/W2): 0 krit, 0 vys, 2 stř, 3 níz, 5 info
- W-N1 stř: sloucene_vetve.sh:88-89 stáří z committer date špičky → čerstvá větev nad starou špičkou test se smaže (pokus e1). Oprava: nemazat větev se špičkou = origin/test|test-draft; test.
- W-N2 stř: :99 delete bez lease (TOCTOU), pokus e2. Oprava --force-with-lease=refs/heads/$v:$sha --delete refs/heads/$v
- W-N3 níz: krátké jméno (-x, refs/heads/main, kolize s tagem) → jen chyba, fail-safe; plný ref.
- W-N4 níz: stari_hodin přetečení (:51-53,:64) → fail-open; 08 → chyba. Omezit ≤8760, 10#.
- W-N5 níz/info: yml:6 workflow lze spustit z libovolné větve (Use workflow from) se skriptem z té větve + contents:write. if: github.ref=='refs/heads/main'.
- W-N6 info: for c in $VYNECHAT glob (:76); bez set -e, prázdné cas → fail-open (:88).
- W-N7 info J.V.: Rulesets Restrict deletions pro main/test/test-draft/claude/integrace-* — doporučeno ano.
- W-N8 info: co znamená celá v test (force-push test), fetch-depth 0 ok.
- W-N9 info: kokpit t.s, s.stav do class bez esc (ř. 397, 405) — mimo rozsah.
- OK: žádná script injection (env + pole), checkout připnutý SHA, testy.yml contents:read, concurrency, timeout; package/lock/netlify.toml beze změny; tajemství žádná.
- Test nehlídá: N1-N4, cestu smazání selhalo (mutant ||true prošel 17/0), workflow if.

Čočka 1 (server): 0/0/0 stř, 2 níz?, 4 info. Regrese K3-N1,N4,N5,N8,N12,N13,N14,N19 OPRAVENO.
- S-1 níz: limit vynucených otisků obejitelný souběhem (zaloha_vynuceno.mjs:73-75, zalohovani.mjs:159-187), pokus 5×200; MEZE :850-851 podceňuje. Rezervační klíč / opravit MEZE.
- S-2 info/níz: String(obj s toString ne-fce) → 500 (zaloha_vynuceno.mjs:51,58,71), jen admin.
- S-3 info J.V.: pojistka K3-N13 zastaví retenci jen jednu noc (zalohovani.mjs:344-351), pokus; doporučení držet do potvrzení správcem.
- S-4 info: záznam kopie smí odkazovat libovolně starý otisk (zalohovani.mjs:466), chce heslo; omezit na 7 nejnovějších.
- S-5 info: automatická kopie po přihlášení otevírá dialog s heslem (online_ui.js:373,1804-1810,1749); soubor na Disk zapsán před ověřením hesla (:1758,1763 vs :1765).
- S-6 info: okno hesla po obnově od konce obnovy (online_ui.js:2963).
- Test nehlídá: paralelní POST, 403 kopie-disk obchodník, objekty v polích, druhá noc, stáří otisku, auto dialog, 401 po zápisu, zámek převzetí >10 s.

Čočka 2 (klient/dokumenty): regrese K3-N3,6,7,9,10,11,16,17,18 OPRAVENO; K3-N2 ČÁSTEČNĚ.
- D-1 stř (ověřeno sám): kapitoly IV.-VI. a doložky OCK (FIRMA_NAB_*) se nezmrazují nabidka.js:371-372; snímek jen ['vety'] kryci.js:942, ['nabidkaProj'] kryci_proj.js:502; MEZE :858-859 tvrdí, že odeslané nezasáhne. {FIRMA} ve zmrazených doložkách PROJ z aktuálního názvu nabidka_proj.js:777-782. MEZE opravit hned; zmrazení kapitol J.V. (doporučeno ano).
- D-2 (ověřeno sám) → snížit na nízkou: vyjezdKcPrepis mimo B112 (uloziste.js:1470 jen prirazkaPct/sazbaPrepis/cenaPrepis), UI každé roli kalk_proj.js:569-583, engine_proj.js:266-270; ale přepínač akceMimoPrahu dá týž efekt → ochrana by musela krýt oba. B135 tvar ne. J.V.: kdo smí výjezd (doporučení: přepis jen s sloupce.naklad, přepínač obchodník smí).
- D-3 níz: nabídka PROJ v7 blokyPryc BLOK_STUDIE_* bez značek → bez chyby (nabidka_proj.js:1121-1123, docxgen.js:384-390), pokus p_n3.js.
- D-4 níz: U1 „Zapsat výchozí hodnoty“ zveřejní celou NAST.firma bez potvrzení (podminky_ui.js:73-83, online_ui.js:666,672).
- D-5 níz: prázdný test test_d2_proj_sikora.js:199-200 (!dz || …), zámek bez zamceno.
- D-6 info J.V.: staré výjimky (celé m²) platí bez časového omezení vyjimky.js:272-277 (doporučení ponechat).
- D-7 info: snímek v každé zamčené variantě × strop 500 kB → 413 se zavádějící hláškou (zakazka_kontrola.mjs:39).
- D-8 info: V7-N2 drží (sodDphRezim zmrazen kryci.js:924-945); B189 se bez DIČ už nespustí.
- B183 OK: server razí obsah sám vyjimky.js:540, pokus 2M hodnot.
- Statické OK. Test nehlídá: K4-N1, zmrazenoPodminky na serveru, výjezd od role, v7 bez značek, U1 nezveřejněné změny, klient staré verze B183, snímek × limit.

KOLO: sady 286/0/6 (18 min 49 s), statické 4/4. Jádro 393/394 (394 mutací), otisky jader souhlasí.
- Přeživší jádro: „DPH: prohlášení o snížené sazbě i mimo stavbu pro bydlení“ (sod.js:140). Prázdný test po V7-N2: test_sod_en.js:206-207 ceskaAdm = fn({sodMistoPlneni:'administrativní budova'}) bez sodDphRezim → výchozí teď přenesená → kontrola OZNAMENI projde vždy. Oprava: přidat sodDphRezim: KRYCI_DPH_REZIMY[0]. Kód OK. → K4-N22 nízká, bez J.V.
- W2 workflow NENÍ v origin/main (ověřeno) → tlačítko zatím nejde; opravit K4-N2/N3 před posunem test→main.
