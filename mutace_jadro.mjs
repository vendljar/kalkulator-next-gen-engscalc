/* ============================================================
 * MUTAČNÍ TESTOVÁNÍ VÝPOČETNÍHO JÁDRA (src/engine.js, src/engine_proj.js)
 *
 * PROČ TOHLE EXISTUJE
 *
 * U serverové vrstvy jde o to, kdo se kam dostane. Tady jde o čísla, která
 * odcházejí zákazníkovi v nabídce. Zelená sada testů říká jen tolik, že testy
 * prošly — neříká, jestli by zčervenaly, kdyby se v jádře přehodily dvě sazby,
 * vypadla doprava ze součtu nebo se marže začala odečítat. Přesně to je otázka,
 * na které záleží: špatně spočítaná nabídka nespadne, ona se v klidu odešle.
 *
 * Nástroj proto jádro schválně rozbíjí. Vezme jedno místo ve výpočtu, provede
 * v něm PRÁVĚ JEDNU záměnu, spustí testovací sady a čeká, že aspoň jedna
 * spadne. Když spadne, mutace je „chycená" a víme, že tenhle kus výpočtu někdo
 * hlídá. Když všechny sady projdou, je to díra: takovou chybu by dnes nikdo
 * nezachytil — ani před odesláním nabídky.
 *
 * JAK TO ČÍST
 *   chycená    … výpočet je v tomhle místě pokrytý testem, dobře
 *   NECHYCENÁ  … testům chybí kontrola právě tohohle; buď se doplní test,
 *                nebo se vědomě zapíše, proč se to nehlídá
 *   CHYBA ZADÁNÍ … hledaný úsek se v jádře nenašel (nebo vícekrát). Kód se
 *                mezitím změnil a mutace míří do prázdna — nic neověřuje.
 *
 * BEZPEČNOST PRACOVNÍ KOPIE
 * Původní znění obou souborů se drží v paměti a vrací se zpátky v `finally`,
 * takže ho nezničí ani pád sady, ani Ctrl-C (viz `obnovVse`). Na konci se
 * porovná otisk SHA-256 před a po — kdyby se soubory jakkoli lišily, skript
 * to nahlásí jako chybu, ne jako výsledek měření.
 *
 * BEZPEČNOST DAT
 * V tomhle souboru nejsou žádné ceny, sazby ani náklady. Mutace pracují se
 * VZORY V KÓDU (názvy proměnných, tvary výrazů), ne s hodnotami z ceníku.
 * Jediná čísla, která tu stojí, jsou konstanty, které v `src/engine.js` a
 * `src/engine_proj.js` už dnes veřejně jsou (zaokrouhlení na tisíce, zákonná
 * sazba DPH, výchozí procento přirážky za ATYP).
 *
 * PŘESKOČENÉ SADY
 * `src/test.js` a `src/test_proj.js` ověřují shodu s excelovou předlohou a
 * potřebují k tomu skutečný ceník, který v repozitáři záměrně není. Bez něj
 * skončí návratovým kódem 3 = „přeskočeno". Kód 3 NENÍ chycená mutace; takové
 * sady se z běhu vyřadí hned na začátku a nahlásí se zvlášť, protože bez nich
 * je měření slabší (hlavně u mutací, které opravují napodobené chyby Excelu).
 *
 * Spouští se `node mutace_jadro.mjs` (volitelně s částí názvu mutace nebo
 * souboru jako filtrem, např. `node mutace_jadro.mjs sleva`).
 * ============================================================ */

import { readFileSync, writeFileSync, readdirSync, statSync, utimesSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOREN = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(KOREN, 'src');
/* Od 12. 8. 2026 (#134) sem patří i zaokrouhleni.js a marze.js: sleva se
 * skládá s cenou právě tam a rozdělení slev OCK/PROJ se hlídá stejně
 * přísně jako samotný výpočet. */
/* kontroly.js od 29. 9. 2026 (#372): zábrana „profilNeznamy" je jediné, co
 * brání vytisknout cenu s nulovým profilem — patří k jádru jako výpočet sám. */
/* plan_plateb.js od 30. 9. 2026 (etapa B platebních podmínek): dopočítává
 * částky plateb smlouvy o dílo PROJ — čísla, která jdou zákazníkovi. */
/* docxgen.js od 6. 10. 2026 (B122): náhrada symbolů skládá text smlouvy
 * a nabídky — druhotné rozvinutí symbolu z uživatelského textu se hlídá.
 * sablona_obsah.js (B115, 6. 10. 2026): kontrola obsahu šablony Wordu —
 * jediná pojistka proti šabloně, která si u zákazníka stáhne makra. */
/* techspec.js (14. 10. 2026): název akce specifikace z hlavičky zakázky
 * a oplechování soklu prohlubně — text přílohy smlouvy. */
/* kryci.js a kryci_proj.js (15. 10. 2026, v15.10.10): hodiny z kalkulace
 * v krycím listu — každý list jen svou stranu (podklad pro backoffice). */
/* sod.js a nástroje šablon SoD (18. 10. 2026, #157 / v18.10.7): smlouva
 * o dílo v jazyce tisku, režim DPH a skladné — text smlouvy, která se
 * podepisuje; nástroje vyrábějí šablony, ze kterých se tiskne. Cesty
 * k nástrojům jsou relativní ke src/. */
const JADRA = ['engine.js', 'engine_proj.js', 'zaokrouhleni.js', 'marze.js', 'sablony_online.js', 'kontroly.js', 'plan_plateb.js', 'docxgen.js', 'sablona_obsah.js', 'techspec.js',
  'kryci.js', 'kryci_proj.js', 'sod.js', '../nastroje/preklad_sod.js', '../nastroje/vyrob_sablony.js',
  /* podminky.js (#367 fáze 2, 19. 10. 2026): výchozí platební podmínky
   * krycích listů z Nastavení → Firma — splatnost, splátky, záruka, pokuty
   * v každé nabídce a smlouvě. */
  'podminky.js',
  /* nabidka_proj.js (W1, 19. 10. 2026): symboly textů nabídky PROJ pro
   * šablonu Wordu v6 — termíny jen nabízených činností, dvojice sloupců. */
  'nabidka_proj.js'];
/* Filtr = první argument, který není přepínač (stejně jako netlify/mutace.mjs). */
const filtr = (process.argv.slice(2).find(a => !a.startsWith('--')) || '').toLowerCase();
/* --kontrola (23. 9. 2026, nález N19): jen ověří, že každý hledaný úsek je
 * v jádře právě jednou — bez spouštění sad, za zlomek vteřiny. Pouští ji CI
 * i spust_testy.sh, aby mutace nemířily do prázdna, když se jádro změní. */
const JEN_KONTROLA = process.argv.includes('--kontrola');

/* ZÁMEK (B194, 19. 10. 2026): druhý mutační běh v téže pracovní kopii by
 * pouštěl sady nad cizí mutací a — horší — níž by si do zálohy ZALOHA uložil
 * cizí zmutované jádro a na konci ho „vrátil". Proto zámek dřív, než se
 * cokoli přečte; `--kontrola` jen čte, zámek nepotřebuje. */
if (!JEN_KONTROLA) {
  const { zamkniMutace, zamekHlaska } = await import('./nastroje/mutace_zamek.mjs');
  const drzi = zamkniMutace('mutace_jadro.mjs ' + process.argv.slice(2).join(' '));
  if (drzi) { console.log(zamekHlaska(drzi)); process.exit(2); }
}

/* Sady, které se pouštějí nejdřív. Nejsou lepší než ostatní — jen nejrychleji
 * chytají chyby v jádře, a protože se běh zastaví na první červené sadě,
 * ušetří to u rozbité mutace většinu času. */
const PRIORITA = [
  'test.js', 'test_proj.js', 'test_zaokrouhleni.js', 'test_atyp.js',
  'test_sleva.js', 'test_marze.js', 'test_kontroly.js', 'test_porovnani.js',
  'test_prepisy.js', 'test_atyp_katalog.js', 'test_ukazkove.js',
  /* rychlé sady smlouvy o dílo (#157, 18. 10. 2026) — chytají mutace sod.js a nástrojů šablon */
  'test_sod_en.js', 'test_sod_real_v3.js', 'test_preklad_sod.js',
];

/* Které sady vůbec pouštět: všechny, které si berou některé z obou jader.
 * Seznam se skládá sám z obsahu složky, aby nová sada nezůstala roky nespuštěná
 * jen proto, že ji sem nikdo nedopsal (přesně na tohle doplácel starý glob
 * `test_*.js`, který míjel `test.js` — viz komentář ve spust_testy.sh). */
function najdiSady() {
  const vse = readdirSync(SRC).filter(f => /^test.*\.js$/.test(f));
  const dotykaSeJadra = f => {
    const t = readFileSync(resolve(SRC, f), 'utf8');
    return JADRA.some(j => t.includes(basename(j)));
  };
  const sady = vse.filter(dotykaSeJadra);
  const poradi = f => { const i = PRIORITA.indexOf(f); return i === -1 ? PRIORITA.length : i; };
  return sady.sort((a, b) => poradi(a) - poradi(b) || a.localeCompare(b, 'cs'));
}

/* ============================================================
 * MUTACE
 *
 * Každá má:
 *   nazev  … co se rozbilo, česky a stručně
 *   soubor … který soubor jádra se mění
 *   hledej … úsek, který musí být v souboru PRÁVĚ JEDNOU
 *   nahrad … čím se nahradí (právě jedna záměna, ne přepis půlky funkce)
 *   proc   … co by se v praxi pokazilo, kdyby tuhle chybu někdo udělal doopravdy
 * ============================================================ */
const MUTACE = [
  /* ---------- #157: smlouva o dílo v jazyce tisku (17. 10. 2026, v17.10.6) ---------- */
  { nazev: '#157: smlouva v cizím jazyce vznikne i bez jazykové šablony', soubor: 'sod.js',
    hledej: "  if ((typ !== 'sod' && typ !== 'sodProj') || !L || L === 'cz' || maMutaci) return '';",
    nahrad: "  if ((typ !== 'sod' && typ !== 'sodProj') || !L || L === 'cz' || maMutaci || true) return '';",
    proc: 'anglická smlouva by vyšla z české šablony — český právní text s anglickými hodnotami' },
  { nazev: '#157: druh místa plnění se v cizí smlouvě nepřeloží', soubor: 'sod.js',
    hledej: "  if (!placeholders || !L || L === 'cz' || typeof tr !== 'function') return placeholders;\n  SOD_PREKLAD_HODNOT",
    nahrad: "  return placeholders;\n  SOD_PREKLAD_HODNOT",
    proc: '„The place of performance of the Work is bytový dům …"' },
  { nazev: '#157: platby SoD PROJ v cizí smlouvě česky', soubor: 'sod.js',
    hledej: "  sodProjPlatby(d, sablona, L);",
    nahrad: "  sodProjPlatby(d, sablona, 'cz');",
    proc: 'anglická smlouva PROJ by nesla „Platba ve výši € … + DPH proběhne …"' },
  { nazev: '#157: splátky SoD realizace v cizí smlouvě česky', soubor: 'kryci.js',
    hledej: "    if (L !== 'cz') {\n      /* „<milník> – [zbývajících] N % z celkové ceny díla\"",
    nahrad: "    if (false) {\n      /* „<milník> – [zbývajících] N % z celkové ceny díla\"",
    proc: 'seznam splátek anglické smlouvy by byl česky' },
  { nazev: '#157: platby SoD PROJ bez překladu DPH', soubor: 'plan_plateb.js',
    hledej: "+ ' – ' + f(x.castka) + ' + ' + P('DPH') + '.'",
    nahrad: "+ ' – ' + f(x.castka) + ' + DPH.'",
    proc: '„Payment … – € … + DPH."' },
  { nazev: '#380/#157: rozsah díla SoD PROJ bez vlastního překladu zaměření', soubor: 'sod.js',
    hledej: "    return (c && c.preklad && L && c.preklad[L]) ? c.preklad[L] : P(t); })",
    nahrad: "    return P(t); })",
    proc: 'anglická smlouva PROJ by měla v příloze „sURVEY and processing of outputs" (nadpis nabídky ze slovníku)' },
  /* ---------- režim DPH a skladné (18. 10. 2026, v18.10.7) ---------- */
  { nazev: 'DPH: prohlášení o snížené sazbě i při přenesené daňové povinnosti', soubor: 'sod.js',
    hledej: "placeholders.SOD_DPH_PROHLASENI = P(k === 'ceska' && bydleni ?",
    nahrad: "placeholders.SOD_DPH_PROHLASENI = P(bydleni ?",
    proc: 'vrátil by se rozpor šablony v2 (přenesená povinnost + snížená sazba v jedné smlouvě)' },
  { nazev: 'DPH: prohlášení o snížené sazbě i mimo stavbu pro bydlení', soubor: 'sod.js',
    hledej: "placeholders.SOD_DPH_PROHLASENI = P(k === 'ceska' && bydleni ?",
    nahrad: "placeholders.SOD_DPH_PROHLASENI = P(k === 'ceska' ?",
    proc: 'administrativní budova by dostala prohlášení o stavbě pro bydlení a snížené sazbě' },
  { nazev: 'DPH: věta režimu se v cizí smlouvě nepřeloží', soubor: 'sod.js',
    hledej: "  placeholders.SOD_DPH_REZIM = P(SOD_DPH_VETY[k]);",
    nahrad: "  placeholders.SOD_DPH_REZIM = SOD_DPH_VETY[k];",
    proc: 'anglická smlouva by měla článek o DPH česky' },
  { nazev: 'DPH: vlastní znění režimu dostane větu', soubor: 'sod.js',
    hledej: "  if (!k || !placeholders) return placeholders;",
    nahrad: "  if (!placeholders) return placeholders;",
    proc: 'nečitelný režim by dal „undefined" místo viditelného {{…}} k doplnění' },
  { nazev: 'DPH: výchozí režim nepodle DIČ (vždy přenesená)', soubor: 'kryci.js',
    hledej: "prefill: c => kryciDphRezimVychozi(c && c.zak),",
    nahrad: "prefill: () => KRYCI_DPH_REZIMY[0],",
    proc: 'český plátce i zákazník z ciziny by dostali českou DPH bez ohledu na DIČ' },
  /* B189 (rozhodnutí J. V. 19. 10. 2026): DIČ CZ → přenesená, bez DIČ → česká,
   * cizí DIČ → bez výchozí volby a smlouva bez režimu nevznikne. Hlídá test_sod_en (2c). */
  { nazev: 'B189: DIČ CZ dostane českou DPH', soubor: 'kryci.js',
    hledej: "  return dic.slice(0, 2) === 'CZ' ? KRYCI_DPH_REZIMY[1] : '';",
    nahrad: "  return dic.slice(0, 2) === 'CZ' ? KRYCI_DPH_REZIMY[0] : '';",
    proc: 'český plátce by dostal českou DPH místo přenesené povinnosti § 92e (stav před B189)' },
  { nazev: 'B189: cizí DIČ dostane výchozí režim', soubor: 'kryci.js',
    hledej: "  return dic.slice(0, 2) === 'CZ' ? KRYCI_DPH_REZIMY[1] : '';",
    nahrad: "  return dic.slice(0, 2) === 'CZ' ? KRYCI_DPH_REZIMY[1] : KRYCI_DPH_REZIMY[0];",
    proc: 'zákazník z EU nebo mimo EU by dostal českou DPH bez rozhodnutí obchodníka podle místa stavby' },
  /* V7-N2 (rozhodnutí J. V. 20. 10. 2026): bez DIČ → přenesená daňová
   * povinnost (tuzemsko), obchodník ji může změnit. Nahrazuje mutaci
   * „B189: bez DIČ přenesená povinnost". Hlídá test_sod_en (2c). */
  { nazev: 'V7-N2: bez DIČ česká DPH (stav B189)', soubor: 'kryci.js',
    hledej: "  if (!dic) return KRYCI_DPH_REZIMY[1];   // V7-N2: bez DIČ jako tuzemsko",
    nahrad: "  if (!dic) return KRYCI_DPH_REZIMY[0];",
    proc: 'zakázka bez DIČ by dostala českou DPH místo přenesené povinnosti, kterou J. V. určil pro ČR' },
  { nazev: 'V7-N2: bez DIČ bez výchozí volby', soubor: 'kryci.js',
    hledej: "  if (!dic) return KRYCI_DPH_REZIMY[1];   // V7-N2: bez DIČ jako tuzemsko",
    nahrad: "  if (!dic) return '';",
    proc: 'smlouva se zákazníkem bez DIČ by nevznikla, dokud obchodník režim nevybere' },
  { nazev: 'V7-N2: ruční volba režimu DPH se nepropíše do smlouvy', soubor: 'sod.js',
    hledej: "  const k = sodDphRezimKlic(rezimText);",
    nahrad: "  const k = sodDphRezimKlic(rezimText) && 'prenesena';",
    proc: 'obchodník by ve smlouvě nezměnil výchozí přenesenou povinnost na českou DPH' },
  { nazev: 'B189: DIČ s mezerou nebo malými písmeny se nepozná', soubor: 'kryci.js',
    hledej: "  const dic = String((zak && zak.dic) || '').replace(/\\s/g, '').toUpperCase();\n  if (!dic)",
    nahrad: "  const dic = String((zak && zak.dic) || '');\n  if (!dic)",
    proc: '„ cz 123…" by nedalo přenesenou povinnost' },
  { nazev: 'B189: smlouva bez režimu DPH vznikne', soubor: 'sod.js',
    hledej: "  if (zabranaDph) throw new Error(zabranaDph);",
    nahrad: "  if (false) throw new Error(zabranaDph);",
    proc: 'smlouva se zákazníkem z ciziny by se vytiskla s viditelným {{SOD_DPH_REZIM}} bez rozhodnutí o DPH' },
  { nazev: 'B189: zábrana DPH vždy mlčí', soubor: 'sod.js',
    hledej: "  if (String(kryciPoleHodnota(zak, varianta, 'sodDphRezim') || '').trim()) return '';",
    nahrad: "  if (true) return '';",
    proc: 'ani registr, ani tlačítko by smlouvu bez režimu DPH nezastavily' },
  { nazev: 'B189: vlastní znění režimu smlouvu zastaví', soubor: 'sod.js',
    hledej: "  if (String(kryciPoleHodnota(zak, varianta, 'sodDphRezim') || '').trim()) return '';",
    nahrad: "  if (sodDphRezimKlic(kryciPoleHodnota(zak, varianta, 'sodDphRezim'))) return '';",
    proc: 'obchodník s dohodnutým vlastním zněním by smlouvu nevytiskl' },
  { nazev: 'B189: hláška zamění EU a mimo EU', soubor: 'sod.js',
    hledej: "  const eu = typeof KRYCI_EU_DIC !== 'undefined' && KRYCI_EU_DIC.indexOf(pre) >= 0;",
    nahrad: "  const eu = false;",
    proc: 'obchodník by dostal zavádějící důvod zábrany' },
  { nazev: 'SKLADNE: v cizí měně bez zaokrouhlení nahoru', soubor: 'sod.js',
    hledej: "  else placeholders.SOD_SKLADNE = mena.fmt(mena.na(kc));",
    nahrad: "  else placeholders.SOD_SKLADNE = mena.fmt(Math.round(kc / 25));",
    proc: 'skladné by se zaokrouhlilo jinak než ceny (#155)' },
  { nazev: 'SKLADNE: v cizí smlouvě v korunách', soubor: 'sod.js',
    hledej: "  if (!L || L === 'cz' || !mena || !mena.eur) placeholders.SOD_SKLADNE",
    nahrad: "  if (true) placeholders.SOD_SKLADNE",
    proc: 'anglická smlouva v eurech by uvedla skladné v Kč' },
  { nazev: 'SKLADNE: prázdná částka se vyplní', soubor: 'sod.js',
    hledej: "  if (!(kc > 0) || !placeholders) return placeholders;",
    nahrad: "  if (!placeholders) return placeholders;",
    proc: 'bez částky v Nastavení by smlouva uvedla „0,- Kč" místo viditelného {{…}}' },
  /* ---------- dávka H2 (v19.10.4): B191 (V7-N1 a B192 v netlify/mutace.mjs) ---------- */
  { nazev: 'H2 B191: nevyvážený blok ze seznamu tiše zůstane', soubor: 'docxgen.js',
    hledej: "    if (pryc.indexOf(a.jmeno) >= 0 && !docxVyvazene(uvnitr)) throw new Error(docxBlokNejdeText(a.jmeno));",
    nahrad: "",
    proc: 'smlouva SoD PROJ z ručně upravené šablony by vyjmenovala nenabízenou činnost (B191)' },
  { nazev: 'H2 B191: blok ze seznamu bez páru tiše zůstane', soubor: 'docxgen.js',
    hledej: "  if (zbyle) throw new Error(docxBlokNejdeText(zbyle.jmeno));",
    nahrad: "",
    proc: 'značka bloku bez páru by zmizela a text činnosti zůstal (B191)' },
  { nazev: 'H2 B191: chyba i u bloku mimo seznam', soubor: 'docxgen.js',
    hledej: "  const zbyle = docxZnackyBloku(xml).find(z => pryc.indexOf(z.jmeno) >= 0);",
    nahrad: "  const zbyle = docxZnackyBloku(xml)[0];",
    proc: 'nevyvážená kapitola nabídky (blok mimo seznam) by nově shodila tisk' },
  { nazev: 'B190: skladné s tečkou tisíců', soubor: 'sod.js',
    hledej: "  const m = s.match(/^(\\d+)(?:[.,](\\d{1,2}))?$/);",
    nahrad: "  const m = s.replace(',', '.').match(/^(\\d+)(?:\\.(\\d+))?/);",
    proc: '„1.500" Kč za den by ve smlouvě dalo „2,- Kč" (B190)' },
  { nazev: 'SoD v3: číslo „3." odstavce DPH se smaže', soubor: '../nastroje/vyrob_sablony.js',
    hledej: "body = body.slice(0, o.sp.zac) + prepisUsekOdstavce(o.p, zac, o.t.length, '{{SOD_DPH_PROHLASENI}}')",
    nahrad: "body = body.slice(0, o.sp.zac) + prepisUsekOdstavce(o.p, 0, o.t.length, '{{SOD_DPH_PROHLASENI}}')",
    proc: 'odkazy „bod 4" by mířily vedle (číslování 1, 2, 4)' },
  { nazev: 'SoD v3: dvě částky ve větě o skladném projdou', soubor: '../nastroje/vyrob_sablony.js',
    hledej: "  if (castky.length !== 1) chyba(",
    nahrad: "  if (!castky.length) chyba(",
    proc: 'nástroj by tiše nahradil jen první z částek' },
  { nazev: 'SoD v3: kotva odstavce může být víckrát', soubor: '../nastroje/vyrob_sablony.js',
    hledej: "    if (sp.length !== 1) chyba('SoD realizace: čekám právě jeden odstavec ' + popis",
    nahrad: "    if (!sp.length) chyba('SoD realizace: čekám právě jeden odstavec ' + popis",
    proc: 'změněná šablona by se přepsala na nečekaném místě' },
  /* ---------- nástroj překladu šablon SoD (17.–18. 10. 2026) ---------- */
  { nazev: 'preklad_sod: překlad s jiným symbolem projde', soubor: '../nastroje/preklad_sod.js',
    hledej: "      : symbolySerazene(en) !== symbolySerazene(cz) ?",
    nahrad: "      : false ?",
    proc: 'přeložená šablona by tiše ztratila symbol (cena, termín) — ve smlouvě by chyběl' },
  { nazev: 'preklad_sod: překlad bez tabulátoru projde', soubor: '../nastroje/preklad_sod.js',
    hledej: "      : podpisOddelovacu(bezZnacek(en)) !== podpisOddelovacu(bezZnacek(cz)) ?",
    nahrad: "      : false ?",
    proc: 'rozsypané řádky hlavičky smlouvy' },
  { nazev: 'preklad_sod: překlad z pole en i pro DE/FR', soubor: '../nastroje/preklad_sod.js',
    hledej: "    if (!z || !String(z[L] || '').trim()) { chybi.push(cz); continue; }",
    nahrad: "    if (!z || !String(z.en || z[L] || '').trim()) { chybi.push(cz); continue; }",
    proc: 'německá šablona by obsahovala „undefined" místo nepřeloženého odstavce' },
  { nazev: 'preklad_sod: pojmenované místo se nerozvine', soubor: '../nastroje/preklad_sod.js',
    hledej: "    const en = rm.text;",
    nahrad: "    const en = String(z[L]);",
    proc: 'v šabloně by zůstalo „[[SKLADNE]]"' },
  { nazev: 'preklad_sod: odhad jazyka nehlídá', soubor: '../nastroje/preklad_sod.js',
    hledej: "  if (jazyk.jazyk !== L) problemy.push",
    nahrad: "  if (false) problemy.push",
    proc: 'zkopírovaná čeština bez diakritiky by prošla jako překlad' },
  { nazev: 'preklad_sod: písmo symbolu se ztratí', soubor: '../nastroje/preklad_sod.js',
    hledej: "(symRPr[kus] != null ? symRPr[kus] : rPr)",
    nahrad: "rPr",
    proc: 'žlutě podbarvené symboly k doplnění by v přeložené šabloně nebyly vidět' },
  { nazev: 'K18-N101: věta staré šablony SoD PROJ o zaměření patří ke všemu', soubor: 'plan_plateb.js',
    hledej: "const PLAN_SODP_STARE_CINNOST = { podpis: null, za_vystupy: 'zamereni', dpz_doss: 'dpz', dpz_su: 'dpz',",
    nahrad: "const PLAN_SODP_STARE_CINNOST = { podpis: null, za_vystupy: null, dpz_doss: 'dpz', dpz_su: 'dpz',",
    proc: 'smlouva PROJ bez zaměření by dostala větu „… při předání 2D výstupů ze zaměření" (K18-N101)' },

  /* ---------- #377: zábrany blokují dokumenty, kterých se týkají (1. 10. 2026) ---------- */
  { nazev: '#377: brána dokumentů zábrany z kontrol nepouští dál', soubor: 'kontroly.js',
    hledej: "  if (!zab.length) return '';\n  return 'Kontrola před nabídkou",
    nahrad: "  if (true) return '';\n  return 'Kontrola před nabídkou",
    proc: 'zdvih −5 m nebo 1 000 000 000 m by zase dal nabídku — stav před #377' },
  { nazev: '#377: zábrana OCK zastaví i dokumenty PROJ (strana se nehlídá)', soubor: 'kontroly.js',
    hledej: '    && (!Array.isArray(n.strany) || n.strany.indexOf(strana) >= 0));',
    nahrad: '    && true);',
    proc: 'nesmyslný zdvih v OCK by zablokoval nabídku i smlouvu projekce, které s ním nemají nic společného' },
  { nazev: '#377: záporná položka se přiřadí vždy oběma stranám', soubor: 'kontroly.js',
    hledej: "        strany: [ock ? 'ock' : '', proj ? 'proj' : ''].filter(Boolean),",
    nahrad: "        strany: ['ock', 'proj'],",
    proc: 'záporná položka v kalkulaci PROJ by zastavila i nabídku OCK' },
  { nazev: '#377: plán plateb se hlásí dvakrát (brána jinde se nepřeskočí)', soubor: 'kontroly.js',
    hledej: "    && KONTROLY_BRANA_JINDE.indexOf(n.kod) < 0",
    nahrad: "    && true",
    proc: 'plán plateb by zastavil i dokumenty, které podle jeho brány smějí vzniknout (nabídka PROJ při nesedícím součtu plateb smlouvy)' },
  { nazev: '#377: krycí list OCK zábranu nehlídá', soubor: 'kontroly.js',
    hledej: "  ock: ['nabidka', 'nabidkaTisk', 'sod', 'kryci'],",
    nahrad: "  ock: ['nabidka', 'nabidkaTisk', 'sod'],",
    proc: 'nesmyslný rozměr by odešel do backoffice a výroby krycím listem' },
  /* ---------- B113 (#374, 6. 10. 2026): projekce za 0 Kč v kombinované nabídce ---------- */
  { nazev: 'B113: projekce za 0 Kč v kombinované nabídce dokument nezastaví', soubor: 'kontroly.js',
    hledej: "          || ((ctx.jenProj || kontrolyProjProdava(ctx.projVysledek)) && !(Number(pj) > 0))))",
    nahrad: "          || ((ctx.jenProj) && !(Number(pj) > 0))))",
    proc: 'ceník PROJ samé nuly (ceník sestavení bez značky) by dal nabídku projekce za nula korun — B113' },
  { nazev: 'B113: vyřazená položka se počítá za prodávanou', soubor: 'kontroly.js',
    hledej: "    && s.polozky.some(p => p && !p.vyrazeno && !vypnuta(p)));",
    nahrad: "    && s.polozky.some(p => p && !vypnuta(p)));",
    proc: 'zakázka, která projekci neprodává (vše vyřazené), by nedostala ani dokument OCK… PROJ — zábrana by svítila zbytečně' },
  /* ---------- K18-N92: cena činnosti ve Wordu PROJ (30. 9. 2026) ---------- */
  { nazev: 'K18-N92: šablona bez symbolu ceny nabízené činnosti se nepozná', soubor: 'kontroly.js',
    hledej: '    return !ma.some(x => symboly.indexOf(x) >= 0);',
    nahrad: '    return false;',
    proc: 'Word PROJ ze šablony v3 by tiskl činnosti, které se nesečtou do CELKEM (P09: 18 200 Kč × 41 600 Kč), bez varování' },
  { nazev: 'K18-N92: blok ceny (…_BLOK) se za symbol ceny nepočítá', soubor: 'kontroly.js',
    hledej: "    const ma = [mapa[s.key], mapa[s.key] + '_BLOK'];",
    nahrad: '    const ma = [mapa[s.key]];',
    proc: 'šablona PROJ v4 s cenou geodetu v bloku by dál hlásila, že cenu nemá — varování by svítilo pořád' },
  { nazev: 'K18-N92: „část 1" studie se počítá za cenu zaměření i vedle studie', soubor: 'kontroly.js',
    hledej: "    if (s.key === 'zamereni' && !nabizena('studie') && !nabizena('projednani')) ma.push('PROJ_CENA_SP1');",
    nahrad: "    if (s.key === 'zamereni') ma.push('PROJ_CENA_SP1');",
    proc: 'u zaměření se studií nese „část 1" jen odkaz na cenu výše — šablona bez ceny zaměření by prošla' },
  /* ---------- autorský dozor jen když se nabízí (14. 10. 2026) ---------- */
  { nazev: 'AD 14. 10.: varování o AD ve Wordu i u varianty, která AD nabízí', soubor: 'kontroly.js',
    hledej: "      if (!ctx.projZadani || ctx.projZadani.nabizetAD !== false) return null;",
    nahrad: "      if (!ctx.projZadani) return null;",
    proc: 'varování „Word vytiskne AD, i když se nenabízí" by svítilo u každé nabídky PROJ včetně starých — obchodník by si ho přestal všímat' },
  { nazev: 'AD 14. 10.: šablona PROJ v5 se značkami AD se nepozná', soubor: 'kontroly.js',
    hledej: "      if (s.symboly.indexOf('PROJ_CENA_AD_BLOK') >= 0 || s.symboly.indexOf('PROJ_CENA_AD') < 0) return null;",
    nahrad: "      if (s.symboly.indexOf('PROJ_CENA_AD') < 0) return null;",
    proc: 'po nahrání šablony PROJ v5 by varování dál tvrdilo, že Word AD vytiskne — rada „nahrajte v5" by nešla splnit' },
  /* ---------- název akce specifikace z hlavičky zakázky (14. 10. 2026) ---------- */
  { nazev: 'NA 14. 10.: uložený název akce starší specifikace se zahodí', soubor: 'techspec.js',
    hledej: "  const rucne = t.nazevAkceRucne === true\n    || (t.nazevAkceRucne === undefined && !tsPrazdna(t.nazevAkce));",
    nahrad: "  const rucne = t.nazevAkceRucne === true;",
    proc: 'odeslaná specifikace z doby před 14. 10. by při dotisku nesla jiný název akce, než odešel' },
  { nazev: 'NA 14. 10.: kontrola hlavičky nevidí převzatý název akce', soubor: 'techspec.js',
    hledej: "    const val = p.id === 'nazevAkce' ? tsNazevAkce(t, zak).text : p.zdroj === 'techspec' ? t[p.id] : zak[p.id];",
    nahrad: "    const val = p.zdroj === 'techspec' ? t[p.id] : zak[p.id];",
    proc: 'každá nová specifikace by hlásila „název akce nevyplněn", i když ho hlavička má — varování by přestalo nést informaci' },
  /* ---------- oplechování soklu prohlubně ve specifikaci (14. 10. 2026) ---------- */
  { nazev: 'SOKL 14. 10.: sokl se počítá za dodávku i nezahrnutý', soubor: 'techspec.js',
    hledej: "  const vDodavce = !!(r && (r.volitelneKatalog || []).some(x => x.key === 'sokl' && x.zahrnuto));",
    nahrad: "  const vDodavce = !!(r && (r.volitelneKatalog || []).some(x => x.key === 'sokl'));",
    proc: 'nabídka i příloha smlouvy by slibovaly oplechování soklu, které zákazník v ceně nemá' },
  { nazev: 'SOKL 14. 10.: příplatek soklu se ve specifikaci zamlčí', soubor: 'techspec.js',
    hledej: "  return { vDodavce, text: tsPriplatekNabizen(r, Z, 'sokl') ? 'nabízeno jako příplatek' : 'není součástí nabídky' };",
    nahrad: "  return { vDodavce, text: 'není součástí nabídky' };",
    proc: 'kapitola II. by sokl nabízela za příplatek a tabulka specifikace by tvrdila „není součástí nabídky" (N17)' },
  { nazev: 'SOKL 14. 10.: řádek soklu stojí v obou sekcích specifikace', soubor: 'techspec.js',
    hledej: "      odvozene: (r, Z) => { const s = tsSoklRadek(r, Z); return s.vDodavce ? '' : s.text; },",
    nahrad: "      odvozene: (r, Z) => { const s = tsSoklRadek(r, Z); return s.text; },",
    proc: 'specifikace by zákazníkovi tvrdila obojí naráz: v dodávce je i není' },
  /* ---------- lešení ve specifikaci řízené kalkulací (D. S. 15. 10. 2026, bod 2; v16.10.2) ---------- */
  { nazev: 'LEŠ 16. 10.: lešení se počítá za dodávku i nezahrnuté', soubor: 'techspec.js',
    hledej: "  const vDodavce = !!(r && (r.volitelneKatalog || []).some(x => x.key === key && x.zahrnuto));",
    nahrad: "  const vDodavce = !!(r && (r.volitelneKatalog || []).some(x => x.key === key));",
    proc: 'řádek lešení by z „Součástí dodávky není" zmizel, i když lešení v ceně není' },
  { nazev: 'LEŠ 16. 10.: příplatek lešení se ve specifikaci zamlčí', soubor: 'techspec.js',
    hledej: "  return { vDodavce, text: tsPriplatekNabizen(r, Z, key) ? 'nabízeno jako příplatek' : TS_LESENI_NENI_VYCHOZI };",
    nahrad: "  return { vDodavce, text: TS_LESENI_NENI_VYCHOZI };",
    proc: 'kapitola II. by lešení nabízela za příplatek a tabulka by tvrdila „zajistí objednatel" (D. S. bod 2)' },
  { nazev: 'LEŠ 16. 10.: lešení kolem OCK zase jen výchozí text', soubor: 'techspec.js',
    hledej: "      prefill: (r, Z) => tsLeseniNeniRadek(r, Z, 'leseniVnejsi').text,",
    nahrad: "",
    proc: 'řádek by se kalkulací neřídil — štítek „výchozí" ze snímku obchodníka' },
  { nazev: 'LEŠ 16. 10.: vnitřní lešení v ceně zůstane i v „není"', soubor: 'techspec.js',
    hledej: "      odvozene: (r, Z) => tsLeseniNeniRadek(r, Z, 'leseniVnitrni').vDodavce ? '' : null,",
    nahrad: "      odvozene: (r, Z) => null,",
    proc: 'příloha smlouvy by tvrdila obojí: vnitřní lešení je v dodávce i není (P8/7)' },
  { nazev: 'LEŠ 16. 10.: Word řádky navíc nevkládá', soubor: 'docxgen.js',
    hledej: "        po = docxRadkyNavic(po, volby && volby.radkyNavic);",
    nahrad: "",
    proc: 'vnitřní lešení a vlastní řádky by ve Wordu nabídky chyběly (D. S. body 2 a 3)' },
  { nazev: 'LEŠ 16. 10.: Word klonuje řádek i pro šablonu se symbolem', soubor: 'docxgen.js',
    hledej: "    && !(x.symbol && klicePlaceholderu(xml).indexOf(x.symbol) >= 0));",
    nahrad: "    );",
    proc: 'nová šablona se symbolem by měla řádek dvakrát' },
  { nazev: 'LEŠ 16. 10.: Word vloží i řádek s prázdnou hodnotou', soubor: 'docxgen.js',
    hledej: "    && (x.pruh || x.vzdy || !jePrazdnaHodnota(x.hodnota))",
    nahrad: "    && (true)",
    proc: 'lešení v ceně by ve Wordu zůstalo v „není" s prázdnou hodnotou' },
  { nazev: 'LEŠ 16. 10.: Word vkládá řádek za kotvu místo před ni', soubor: 'docxgen.js',
    hledej: "      if (x.pred) predBlok += novy; else zaBlok += novy;",
    nahrad: "      zaBlok += novy;",
    proc: 'pořadí řádků ve Wordu by se rozešlo se specifikací a náhledem' },
  /* ---------- vlastní řádky specifikace v nabídce (D. S. 15. 10. 2026, bod 3; v16.10.2) ---------- */
  { nazev: 'VLR 16. 10.: pruh DALŠÍ UJEDNÁNÍ se klonuje z datového řádku', soubor: 'docxgen.js',
    hledej: "        if (!klicePlaceholderu(r).length) return r;",
    nahrad: "        return r;",
    proc: 'nadpis DALŠÍ UJEDNÁNÍ by ve Wordu vypadal jako řádek tabulky, ne jako pruh sekce' },
  { nazev: 'VLR 16. 10.: vlastní text se ve Wordu rozvine jako symbol', soubor: 'docxgen.js',
    hledej: "    return '<w:t xml:space=\"preserve\">' + xmlEsc(text).replace(/\\{/g, '&#123;') + '</w:t>';",
    nahrad: "    return '<w:t xml:space=\"preserve\">' + xmlEsc(text) + '</w:t>';",
    proc: 'obchodníkův text „{{CENA_S_DPH}}" by Word nahradil cenou (vzor B122)' },
  { nazev: 'VLR 16. 10.: prázdná sekce nad DALŠÍ UJEDNÁNÍ zůstane', soubor: 'docxgen.js',
    hledej: "  'DALŠÍ UJEDNÁNÍ'];",
    nahrad: "  ];",
    proc: 'nabídka by nesla prázdný pruh SOUČÁSTÍ DODÁVKY NENÍ' },
  { nazev: 'VLR 16. 10.: vlastní řádek bez hodnoty se do Wordu nevloží', soubor: 'docxgen.js',
    hledej: "    && (x.pruh || x.vzdy || !jePrazdnaHodnota(x.hodnota))",
    nahrad: "    && (x.pruh || !jePrazdnaHodnota(x.hodnota))",
    proc: 'řádek, který obchodník napsal jen popiskem, by ve Wordu chyběl' },
  /* ---------- hodiny z kalkulace v krycím listu BO (14. 10. 2026) ---------- */
  /* Od 15. 10. (v15.10.10) má tabulka hodin jediný sloupec hodnot — mutace
   * míří na novou hranici (dva sloupce), dřívější `> 3` by už nic neměnila. */
  { nazev: 'HOD 14. 10.: Word krycího listu zahodí záhlaví tabulky hodin', soubor: 'docxgen.js',
    hledej: "    if (Array.isArray(s.sloupce) && s.sloupce.length >= 2) {",
    nahrad: "    if (Array.isArray(s.sloupce) && s.sloupce.length > 2) {",
    proc: 'backoffice by ve Wordu dostal tabulku hodin bez záhlaví — nepoznal by, ke které straně hodiny patří' },
  { nazev: 'HOD 15. 10.: krycí list PROJ vypíše hodiny z Kalkulace OCK', soubor: 'kryci_proj.js',
    hledej: "kryciHodinySekce(zak, varianta, jekly, verze, 'proj')",
    nahrad: "kryciHodinySekce(zak, varianta, jekly, verze, 'ock')",
    proc: 'list PROJ by nesl montáž a dílnu z OCK — přesně to, co J. V. 15. 10. vytkl' },
  { nazev: 'HOD 15. 10.: krycí list OCK sečte i hodiny PROJ', soubor: 'kryci.js',
    hledej: "  const rOck = strana === 'ock' ? r : null, rProj = strana === 'proj' ? r : null;",
    nahrad: "  const rOck = strana === 'ock' ? r : null, rProj = strana === 'proj' ? r : vysledekStrany(zak, varianta, 'proj', jekly);",
    proc: 'list OCK by znovu míchal hodiny projekce, i když PROJ není počítaná' },
  { nazev: 'HOD 15. 10.: vyřazená strana dostane tabulku hodin', soubor: 'kryci.js',
    hledej: "  try { r = (typeof vysledekStrany === 'function') ? vysledekStrany(zak, varianta, strana, jekly) : null; } catch (e) { r = null; }",
    nahrad: "  try { r = strana === 'ock' ? vypocetZ(varianta, jekly) : vypocetProjZ(varianta); } catch (e) { r = null; }",
    proc: 'uzamčená (vynulovaná) strana by v krycím listu ukazovala hodiny, které se nenabízejí' },
  /* ---------- K23T-N1: opláštění pod dnem prohlubně (14. 10. 2026) ---------- */
  { nazev: 'K23T-N1: opláštění pod dnem prohlubně hlásí obecnou zápornou částku', soubor: 'kontroly.js',
    hledej: "      if (nal.every(p => p.podProhlubni)) {",
    nahrad: "      if (false) {",
    proc: 'obchodník by místo začátku opláštění hledal slevu — zábrana by neřekla, co opravit' },
  /* ---------- K18-N96: dodatkový text v cizojazyčné nabídce (30. 9. 2026) ---------- */
  { nazev: 'K18-N96: český dodatkový text v cizí nabídce se nepozná', soubor: 'kontroly.js',
    hledej: "          return !trStav(t, jaz).prelozeno;",
    nahrad: '          return false;',
    proc: 'anglická nabídka by odešla s českou větou pod příplatkem a nikdo by se to nedozvěděl' },
  { nazev: 'K18-N96: vynechaný příplatek se hlásí, i když se netiskne', soubor: 'kontroly.js',
    hledej: '      const vNabidce = r.priplatky.filter(p => p && !vynech.includes(p.key));',
    nahrad: '      const vNabidce = r.priplatky.filter(p => p);',
    proc: 'varování by svítilo kvůli textu, který v nabídce vůbec není — přestalo by se číst' },
  { nazev: 'K18-N96: sloučené přechodové plechy hlásí svůj text', soubor: 'kontroly.js',
    hledej: "      const slouceny = plechy.every(k => vNabidce.some(p => p.key === k));",
    nahrad: '      const slouceny = false;',
    proc: 'sloučené plechy tisknou „materiál a montáž", ne svůj text — varování by lhalo' },
  /* ---------- K18-N96 / #379: jazykové varianty dodatků (1. 10. 2026) ---------- */
  { nazev: 'K18-N96: kontrola nevidí jazykovou variantu dodatku', soubor: 'kontroly.js',
    hledej: "          if (typeof j === 'string' && j.trim()) return false;     // jazyková varianta (#379)",
    nahrad: '',
    proc: 'varování by svítilo i u textu, který má překlad — přestalo by se číst' },
  { nazev: 'K18-N96: výpočet nenese jazykové varianty dodatku', soubor: 'engine.js',
    hledej: '    if (j) it.popisNabidkaJazyky = j;',
    nahrad: '',
    proc: 'německá nabídka by i s vyplněným překladem tiskla českou větu' },
  /* B122 (audit 2. 10. 2026): uživatelský text v seznamu plateb se nerozvine jako symbol. */
  { nazev: 'B122: {{SYMBOL}} z textu splátky se ve Wordu rozvine', soubor: 'docxgen.js',
    hledej: "    return xmlEscRadky(hodnota, /\\n/.test(hodnota) ? docxUvnitrTextu(xml, pos) : true).replace(/\\{/g, '&#123;');",
    nahrad: "    return xmlEscRadky(hodnota, /\\n/.test(hodnota) ? docxUvnitrTextu(xml, pos) : true);",
    proc: 'vlastní milník nebo znění splátky se symbolem by ve smlouvě vytisklo hodnotu jiného symbolu' },
  /* ---------- plán plateb projekce (etapa B, 30. 9. 2026) ---------- */
  /* K20-N1 (6. 10. 2026): rozpracovaná „Záloha" bez procenta jde za firemním procentem. */
  { nazev: 'K20-N1: záloha bez procenta zůstane na 50 %', soubor: 'plan_plateb.js',
    hledej: "    let z = plan && plan.zaloha != null && plan.zaloha !== '' ? +plan.zaloha : +f.zalohaPct;",
    nahrad: "    let z = plan && plan.zaloha != null && plan.zaloha !== '' ? +plan.zaloha : 50;",
    proc: 'rozpracovaná varianta s předvolbou Záloha by tiše zůstala na dřívějších 50 % místo firemního procenta' },
  { nazev: 'plán plateb: poslední splátka nenese zaokrouhlení', soubor: 'plan_plateb.js',
    hledej: '      const kc = i < radky.length - 1 ? Math.round(c * (r.p || 0) / 100) : planHal(zbyva);',
    nahrad: '      const kc = Math.round(c * (r.p || 0) / 100);',
    proc: 'součet plateb smlouvy by se lišil od ceny díla o haléře až koruny — smlouva by nesouhlasila s nabídkou' },
  { nazev: 'plán plateb: splátky se stejným milníkem se nesečtou', soubor: 'plan_plateb.js',
    hledej: '      const klic = planKlicPlatby(r);',
    nahrad: "      const klic = planKlicPlatby(r) + '|' + k;",
    proc: 'smlouva by měla „po podpisu" zvlášť za každou činnost místo jedné platby (rozhodnutí J. V. 29. 9.)' },
  { nazev: 'plán plateb: neoceněná činnost dostane splátky', soubor: 'plan_plateb.js',
    hledej: '    if (!(c > 0) || !isFinite(c)) return;',
    nahrad: '    if (!isFinite(c)) return;',
    proc: 'smlouva by vypsala platby za činnost, která není součástí nabídky' },
  { nazev: 'plán plateb: součet činnosti mimo 100 % se nepozná', soubor: 'plan_plateb.js',
    hledej: "    if (Math.round(soucet * 100) !== 10000)\n      out.push({ kod: 'procenta'",
    nahrad: "    if (false)\n      out.push({ kod: 'procenta'",
    proc: 'nabídka i smlouva by odešly se splátkami na 90 % ceny činnosti' },
  /* Revize etapy B (30. 9. 2026). */
  { nazev: 'plán plateb: varování ve Wordu srovnává s firemním Standardem', soubor: 'plan_plateb.js',
    hledej: '    const vzor = PLAN_PROJ_VYCHOZI.standard[k];',
    nahrad: '    const vzor = (f.standard && f.standard[k]) || PLAN_PROJ_VYCHOZI.standard[k];',
    proc: 'šablona v3 tiskne Standard z kódu — firemní Standard by ve Wordu chyběl bez varování' },
  { nazev: 'plán plateb: zamčený plán se srovnává s dnešním Standardem', soubor: 'plan_plateb.js',
    hledej: '  if (plan && Array.isArray(plan.upravene)) return plan.upravene.indexOf(k) >= 0;',
    nahrad: '  if (false) return false;',
    proc: 'odeslaná nabídka pod firemním Standardem by v krycím listu hlásila „upraveno“' },
  /* Q5 (rozhodnutí J. V. 30. 9. 2026). */
  { nazev: 'plán plateb: dřívější záloha se nepřepne na předvolbu', soubor: 'plan_plateb.js',
    hledej: "  const zal = zalohaZeStarych && zalohaZeStarych.lze ? { predvolba: 'zaloha', zaloha: zalohaZeStarych.pct } : null;",
    nahrad: '  const zal = null;',
    proc: 'starší zakázka se zálohou 30 % by tiskla Standard — obchodník by zálohu musel znovu nastavit ručně' },
  /* ---------- platební podmínky OCK ve Wordu (etapa A, D1 + D2, 30. 9. 2026) ---------- */
  { nazev: 'platbyWordOck: měsíční fakturace se šablonou v13 nevaruje', soubor: 'kontroly.js',
    hledej: "  if (kal.mesicne) return ['měsíční fakturaci neukáže (vytiskne splátky)'];",
    nahrad: '  if (kal.mesicne) return [];',
    proc: 'Word by se šablonou v13 tiskl splátky 50/40/10 místo měsíční fakturace a nikdo by o tom nevěděl' },
  { nazev: 'platbyWordOck: nabídka bez zálohy se šablonou v13 nevaruje', soubor: 'kontroly.js',
    hledej: "  if (vyn.indexOf('zaloha1') >= 0) out.push(",
    nahrad: '  if (false) out.push(',
    proc: 'nabídka by odešla s větou „1. dílčí daňový doklad ve výši  (bez DPH)" bez varování (K18-N94)' },
  { nazev: 'platbyWordOck: šablona bez {{PODM_FAKTURACE_MESICNE}} se u měsíční nepozná', soubor: 'kontroly.js',
    hledej: "      const chybi = ['PODM_PLATEBNI_KALENDAR'].concat(kal.mesicne ? ['PODM_FAKTURACE_MESICNE'] : [])",
    nahrad: "      const chybi = ['PODM_PLATEBNI_KALENDAR'].concat([])",
    proc: 'vlastní šablona s kalendářem, ale bez věty o měsíční fakturaci by u měsíční nabídky vytiskla prázdnou kapitolu III.' },
  { nazev: 'plán plateb: vada plánu jen varuje, nezastaví dokument', soubor: 'kontroly.js',
    hledej: "      return { uroven: KONTROLY_UROVEN_ZABRANA,\n        text: 'Plán plateb projekce: '",
    nahrad: "      return { uroven: KONTROLY_UROVEN,\n        text: 'Plán plateb projekce: '",
    proc: 'varování jde odklepnout — nabídka se splátkami mimo 100 % by vznikla' },
  /* ---------- neznámý rozměr profilu (#372, nález A2-1, 29. 9. 2026) ---------- */
  { nazev: '#372: jekl u neznámého rozměru vyhodí výjimku místo náhrady', soubor: 'engine.js',
    hledej: '    return { kg: 0, m2: 0, A: j ? j.A : (m ? +m[1] : 0), B: j ? j.B : (m ? +m[2] : 0) };',
    nahrad: "    throw new Error('Neznámá dimenze profilu: ' + (p || {}).dim);",
    proc: 'zakázka s rozměrem mimo katalog jeklů by znovu shodila celé vykreslení a nešla otevřít' },
  { nazev: '#372: neznámé profily se do výsledku nezapíšou', soubor: 'engine.js',
    hledej: "    .map(k => PROFILY_NAZVY[k] + ': ' + (maRozmer(pr[k]) ? pr[k].dim + ' / ' + pr[k].tl + ' mm' : 'rozměr chybí'));",
    nahrad: "    .map(k => PROFILY_NAZVY[k] + ': ' + (maRozmer(pr[k]) ? pr[k].dim + ' / ' + pr[k].tl + ' mm' : 'rozměr chybí')).slice(0, 0);",
    proc: 'cena s nulovou hmotností profilu by prošla bez zábrany až do nabídky; server by ji uložil' },
  { nazev: '#372: kontrola profilNeznamy nehlásí', soubor: 'kontroly.js',
    hledej: '      if (!Array.isArray(nez) || !nez.length) return null;',
    nahrad: '      return null;',
    proc: 'nabídka s nulovou cenou profilu by se vytiskla a odešla zákazníkovi' },
  { nazev: '#372: neznámý profil jen varuje, nezastaví dokument', soubor: 'kontroly.js',
    hledej: "      return { uroven: KONTROLY_UROVEN_ZABRANA,\n        text: 'Rozměr profilu '",
    nahrad: "      return { uroven: KONTROLY_UROVEN,\n        text: 'Rozměr profilu '",
    proc: 'varování jde odklepnout — dokument s nulovým profilem by vznikl' },
  /* ---------- horní hranice zdvihu 99 m (K17-N91, 30. 9. 2026) ---------- */
  { nazev: 'K17-N91: zdvih nad 99 m projde bez zábrany', soubor: 'kontroly.js',
    /* Od #398 (12. 10. 2026) žije hranice v kontrolyRozmery (sdílí ji server). */
    hledej: "  out.vysoky = !vadnyZdvih && +z.zdvih > KONTROLY_ZDVIH_MAX_M;",
    nahrad: '  out.vysoky = false;',
    proc: 'zdvih 1 000 000 000 m by zase dal nabídku za biliony korun bez jediného varování' },
  { nazev: 'K17-N91: zdvih přesně 99 m se zastaví', soubor: 'kontroly.js',
    hledej: "  out.vysoky = !vadnyZdvih && +z.zdvih > KONTROLY_ZDVIH_MAX_M;",
    nahrad: "  out.vysoky = !vadnyZdvih && +z.zdvih >= KONTROLY_ZDVIH_MAX_M;",
    proc: 'maximální zdvih je 99 m včetně (rozhodnutí J. V.) — šachta s přesně 99 m by nešla vytisknout' },
  /* ---------- centrální šablony (sablony_online.js, #139) ---------- */
  /* N46, N51 (24. 9. 2026): pravidlo nástupišť u průchozí šachty, lešení. */
  { nazev: 'N46: patra bez dveří se neopláští', soubor: 'engine.js',
    hledej: '      return plochaNaMetr * ((nizsich - dole) * vpPas + (nahore ? 0 : z.prejezd));',
    nahrad: '      return 0;',
    proc: 'průchozí A0C4 by měla čelní stěnu bez opláštění — levnější než zrcadlová A4C0' },
  { nazev: 'N46: hlava se počítá vždy k patru bez dveří', soubor: 'engine.js',
    hledej: '      return plochaNaMetr * ((nizsich - dole) * vpPas + (nahore ? 0 : z.prejezd));',
    nahrad: '      return plochaNaMetr * ((nizsich - dole) * vpPas + z.prejezd);',
    proc: 'hlava nad nejvyšší stanicí by se opláštila i tam, kde je nástupiště' },
  { nazev: 'N45: boční světlíky všech dveří na čelní stěně', soubor: 'engine.js',
    hledej: '      A: svetlikM2 + bokNaDvere * nA + plne(nA, horniA),',
    nahrad: '      A: svetlikM2 + bokNaDvere * nastupist + plne(nA, horniA),',
    proc: 'boční světlíky zadních dveří by se počítaly podruhé na čelní stěně' },
  { nazev: 'N46: spoje čelního rámu zdvojené i bez dveří vpředu', soubor: 'engine.js',
    hledej: '    ? Math.max((nastupisteCelkem(z) - nastupistC > 0 ? 1 : 0) + (nastupistC > 0 ? 1 : 0), 1)',
    nahrad: '    ? (nastupistC > 0 ? 2 : 1)',
    proc: 'A0C4 by nesla spojovací plechy za stěnu, na které žádné dveře nejsou' },
  { nazev: 'N51: přepis lešení na 0 m nechá fix', soubor: 'engine.js',
    hledej: '      naklad = (prepisJe && mn === 0) ? 0 : mn * cenaEff + opts.fix;',
    nahrad: '      naklad = mn * cenaEff + opts.fix;',
    proc: '„lešení nenabízíme" by v příplatcích stálo fixní částku' },

  /* N58, N58b (24. 9. 2026): výplň nad dveřmi a vedle nich. */
  { nazev: 'N58: stará zakázka se světlíkem se převede na „bez"', soubor: 'engine.js',
    hledej: "  return (z && z.svetlikNadDvermi) ? 'sklo' : 'bez';",
    nahrad: "  return 'bez';",
    proc: 'všem starým zakázkám se světlíkem by zmizelo sklo nad dveřmi a spadla cena' },
  /* Od #375 (30. 9. 2026) rozhoduje o skle světlíku svetlikRozres; značka
   * VYPLN_SKLENA zůstala jen jako excelová buňka D19 (hloubka bočního
   * zasklení v Modelu 1). Mutace proto míří na obojí zvlášť. */
  { nazev: 'N58: materiál opláštění ze skla se ocení jako deska', soubor: 'engine.js',
    hledej: "    return out(OPL_SKLA.indexOf(m.typ) >= 0 ? 'sklo' : 'deska', m.typ, m.nazev, m.naklad);",
    nahrad: "    return out('deska', m.typ, m.nazev, m.naklad);",
    proc: 'světlík z materiálu opláštění (sklo boků) by přišel o lišty a terče a ve standardu o plochu skla' },
  { nazev: 'N58/#375: D19 v Modelu 1 — materiál se nebere jako zaškrtnutý světlík', soubor: 'engine.js',
    hledej: "const VYPLN_SKLENA = v => v === 'sklo' || v === 'material';",
    nahrad: "const VYPLN_SKLENA = v => v === 'sklo';",
    proc: 'v Modelu 1 by se u materiálu nad dveřmi změnila hloubka bočního zasklení proti sklu (napodobená chyba D19)' },
  { nazev: 'N58: plechové nadpraží bez hmotnosti plechu', soubor: 'engine.js',
    hledej: "    mkItem('PLECHY - OPLECH. DVEŘÍ A PODEST (MATERIÁL)', oplDvereKg + podestKg + vyplnPlechKg,",
    nahrad: "    mkItem('PLECHY - OPLECH. DVEŘÍ A PODEST (MATERIÁL)', oplDvereKg + podestKg,",
    proc: 'plech nad dveřmi by se neocenil — stejná díra jako N58' },
  { nazev: 'N58: plechové nadpraží bez práce', soubor: 'engine.js',
    hledej: "nastupist * (3 + nadPlech) + bokyPlech * (bokyDvereDva + bokyDvereJeden)",
    nahrad: "nastupist * 3 + bokyPlech * (bokyDvereDva + bokyDvereJeden)",
    proc: 'osazení plechu nad dveřmi by nikdo nezaplatil' },
  { nazev: 'N58: plech lakovaný jen z jedné strany', soubor: 'engine.js',
    hledej: "    + vyplnPlechM2 * 2;",
    nahrad: "    + vyplnPlechM2;",
    proc: 'lakování plechu nad dveřmi by vyšlo poloviční' },
  { nazev: 'N58: záporná výška plechu se neořízne', soubor: 'engine.js',
    hledej: "  const nadPlechM2 = nadPlech * nastupist * g.sir * Math.max(svetlaVyska - 2.3, 0);",
    nahrad: "  const nadPlechM2 = nadPlech * nastupist * g.sir * (svetlaVyska - 2.3);",
    proc: 'u nízkého podlaží by plech odečítal kilogramy (chyba N14 znovu)' },
  { nazev: 'N58: plechové nadpraží ubere montáž jako „bez"', soubor: 'engine.js',
    hledej: "    svetlik: (!fixes && nadV === 'bez' ? -1 : 0) * nastupist * 0.2,",
    nahrad: "    svetlik: (!fixes && nadV === 'bez' || nadV === 'plech' ? -1 : 0) * nastupist * 0.2,",
    proc: 'plech nad dveřmi by se montoval zadarmo a ještě by ubral hodiny' },
  { nazev: 'N58b: plechové boky zůstanou i ve skle', soubor: 'engine.js',
    hledej: "  const svetlikBokM2 = bokySklo ? bokyM2 : 0;",
    nahrad: "  const svetlikBokM2 = bokyM2;",
    proc: 'boční pole z plechu by se zaplatilo dvakrát — jako sklo i jako plech' },

  /* #375 (30. 9. 2026): světlíky u šachetních dveří — počet bočních světlíků,
   * rozložení po dveřích, materiál, převod starších zakázek, kontrola. */
  { nazev: '#375: automatický počet bočních světlíků = nástupiště (ne × 2)', soubor: 'engine.js',
    hledej: "function bokyPocetAuto(z) { return 2 * Math.max(0, nastupisteCelkem(z)); }",
    nahrad: "function bokyPocetAuto(z) { return Math.max(0, nastupisteCelkem(z)); }",
    proc: 'nová volba boků by nacenila polovinu světlíků, než kolik jich u dveří je' },
  { nazev: '#375: dveře se dvěma světlíky bez stropu 2 × dveře', soubor: 'engine.js',
    hledej: "  const bokyDvereDva = Math.max(0, Math.min(bokyKs, 2 * dvereCelkem) - dvereCelkem);",
    nahrad: "  const bokyDvereDva = Math.max(0, bokyKs - dvereCelkem);",
    proc: 'víc než dva světlíky na dveře by zvětšily plochu výplně nad mezeru vedle dveří' },
  { nazev: '#375: světlík u dveří s jedním má jen půl mezery', soubor: 'engine.js',
    hledej: "    ? (4 * bokyDvereDva) * (bokMezera / 2) * 1.1 + (2 * bokyDvereJeden) * bokMezera * 1.1 : 0;",
    nahrad: "    ? (4 * bokyDvereDva) * (bokMezera / 2) * 1.1 + (2 * bokyDvereJeden) * (bokMezera / 2) * 1.1 : 0;",
    proc: 'u dveří u sloupku by zůstala polovina mezery neoceněná (otázka 1 návrhu)' },
  { nazev: '#375: převod jedné strany nechá počet na automatice', soubor: 'engine.js',
    hledej: "  else z.svetlikyBokyKs = strany * nastupisteCelkem(z);",
    nahrad: "  else z.svetlikyBokyKs = '';",
    proc: 'starší zakázce se světlíky na jedné straně by se po převodu zdvojily světlíky i cena' },
  { nazev: '#375: materiál opláštění ve standardu = sklo čelní stěny', soubor: 'engine.js',
    hledej: "    if (oplRezim !== 'poStenach') return { typ: oplVychoziTyp('B'), nazev: '', naklad: null };",
    nahrad: "    if (oplRezim !== 'poStenach') return { typ: oplVychoziTyp('A'), nazev: '', naklad: null };",
    proc: 'u exteriéru by materiál opláštění zase počítal VSG 4.4.1 místo dvojskla stěn B, C, D' },
  { nazev: '#375: sklo po stěnách nečte typ skla stěny A', soubor: 'engine.js',
    hledej: "    if (oplRezim !== 'poStenach') return std;\n    const vahy = {};",
    nahrad: "    return std;\n    const vahy = {};",
    proc: 'světlík by nebral sklo, které obchodník zvolil pro stěnu s dveřmi' },
  { nazev: '#375: světlíky po stěnách zůstanou i v pásech stěny', soubor: 'engine.js',
    hledej: "  const oplZakladPasu = stenyBezSvetliku;",
    nahrad: "  const oplZakladPasu = oplZakladSteny;",
    proc: 'plocha světlíků by se po stěnách zaplatila dvakrát — v pásech stěny A i materiálem světlíku' },
  { nazev: '#375: deska z materiálu opláštění nese lišty a terče', soubor: 'engine.js',
    hledej: "  const kratkePricnikyZasklene = bokyRozres.A.druh === 'deska' ? 0 : kratkePricniky;",
    nahrad: "  const kratkePricnikyZasklene = kratkePricniky;",
    proc: 'boky z Cetrisu by platily zasklívací terče a lišty, které nemají (otázka 5 návrhu)' },
  { nazev: '#375: plechové boky — práce na nástupiště místo na dveře se světlíky', soubor: 'engine.js',
    hledej: "nastupist * (3 + nadPlech) + bokyPlech * (bokyDvereDva + bokyDvereJeden)",
    nahrad: "nastupist * (3 + nadPlech) + bokyPlech * nastupist",
    proc: 'oplechování by se platilo i u dveří, které boční světlík nemají' },
  { nazev: '#375: nad dveřmi „zajistí stavba" zase ubírá montáž', soubor: 'engine.js',
    hledej: "    svetlik: (!fixes && nadV === 'bez' ? -1 : 0) * nastupist * 0.2,",
    nahrad: "    svetlik: (!fixes && nadV === 'bez' || nadV === 'stavba' ? -1 : 0) * nastupist * 0.2,",
    proc: 'v rozporu s rozhodnutím J. V. 30. 9. 2026 — montáž rámu pro výplň stavby by se nezaplatila' },
  /* #378 (1. 10. 2026): odpočet 0,2 h × nástupiště při „bez" jen v Modelu 1. */
  { nazev: '#378: Model 2 zase ubírá montáž při „bez" nad dveřmi', soubor: 'engine.js',
    hledej: "    svetlik: (!fixes && nadV === 'bez' ? -1 : 0) * nastupist * 0.2,",
    nahrad: "    svetlik: (nadV === 'bez' ? -1 : 0) * nastupist * 0.2,",
    proc: 'v rozporu s rozhodnutím J. V. 1. 10. 2026 — Model 2 by dál ubíral 0,2 h montáže na nástupiště' },
  { nazev: '#378: Model 1 přestane ubírat montáž při „bez" nad dveřmi', soubor: 'engine.js',
    hledej: "    svetlik: (!fixes && nadV === 'bez' ? -1 : 0) * nastupist * 0.2,",
    nahrad: "    svetlik: 0,",
    proc: 'Model 1 by se odchýlil od předlohy (1:1 Excel se nesmí změnit)' },
  { nazev: '#375: kontrola boků „bez" nehlásí mezeru vedle dveří', soubor: 'kontroly.js',
    hledej: "        if (!mezeraJe || !(dvere > 0)) return null;",
    nahrad: "        return null;",
    proc: 'mezera vedle dveří by zůstala neoceněná bez jediného upozornění (otázka 2 návrhu)' },

  /* #381 (1. 10. 2026): šířka bočního světlíku při ručním počtu — jen Model 2. */
  { nazev: '#381: ruční šířka bočního světlíku platí i v Modelu 1', soubor: 'engine.js',
    hledej: "  const bokySirkaPlati = !!fixes && bokyPocetRucne(z) && bokyKs > 0 && bokySirkaMm != null;",
    nahrad: "  const bokySirkaPlati = bokyPocetRucne(z) && bokyKs > 0 && bokySirkaMm != null;",
    proc: 'Model 1 (1:1 Excel) by změnil cenu — v rozporu s rozhodnutím J. V. 1. 10. 2026 „modelu 1 nic neměň"' },
  { nazev: '#381: ruční šířka platí i při automatickém počtu světlíků', soubor: 'engine.js',
    hledej: "  const bokySirkaPlati = !!fixes && bokyPocetRucne(z) && bokyKs > 0 && bokySirkaMm != null;",
    nahrad: "  const bokySirkaPlati = !!fixes && bokyKs > 0 && bokySirkaMm != null;",
    proc: 'po ↺ u počtu (automatika nástupiště × 2) by zapomenutá šířka dál měnila cenu, kterou obrazovka neukazuje' },
  { nazev: '#381: plocha boků s ruční šířkou jen z jedné tabule 1,1 m', soubor: 'engine.js',
    hledej: "  const bokyM2 = bokySirkaPlati ? bokyKs * bokySirkaRucne * 2.2 : bokyM2Rozlozeni;",
    nahrad: "  const bokyM2 = bokySirkaPlati ? bokyKs * bokySirkaRucne * 1.1 : bokyM2Rozlozeni;",
    proc: 'sklo, plech i materiál boků by se při ruční šířce ocenily jen do poloviny výšky světlíku' },
  { nazev: '#381: předpočítaná šířka z poloviny výšky světlíku', soubor: 'engine.js',
    hledej: "  const bokySirkaPredpocitana = bokyKs > 0 ? bokyM2Rozlozeni / (2.2 * bokyKs) : 0;",
    nahrad: "  const bokySirkaPredpocitana = bokyKs > 0 ? bokyM2Rozlozeni / (1.1 * bokyKs) : 0;",
    proc: 'pole by předvyplnilo dvojnásobnou šířku — obchodník by ji potvrdil a kontrola by hlásila, že se nevejde' },
  { nazev: '#381: kontrola šířky bočního světlíku proti mezeře vypnutá', soubor: 'kontroly.js',
    hledej: "  if (!v || v.sirkaRucne === null || v.sirkaRucne === undefined) return out;",
    nahrad: "  return out;",
    proc: 'světlík širší než mezera (nebo světlíky, které se vedle dveří nevejdou) by prošel do nabídky se sklem navíc' },
  { nazev: '#381: světlík širší než mezera vedle dveří se nepozná', soubor: 'kontroly.js',
    hledej: "  const sirsi = wMm > mMm + 0.5;",
    nahrad: "  const sirsi = false;",
    proc: 'nabídka by dostala jen obecnou větu o součtu, ne co přesně opravit (otázka 5 návrhu)' },
  { nazev: '#381: zábrana šířky bočního světlíku dokument nezastaví', soubor: 'kontroly.js',
    hledej: "        return { uroven: KONTROLY_UROVEN_ZABRANA, text: vety.join(' ') + ' Dokument nevznikne, dokud se to neopraví.' };",
    nahrad: "        return { text: vety.join(' ') + ' Dokument nevznikne, dokud se to neopraví.' };",
    proc: 'šachta, která se postavit nedá, by odešla v nabídce — varování se dá odklepnout (otázka 5 návrhu)' },
  /* Zbytek mezery a rám dveří (dotazy J. V. 1. 10. 2026). */
  { nazev: 'zbytek mezery: věta zase nese součet místo zbytku u dveří', soubor: 'kontroly.js',
    hledej: "          + ' zůstane neoceněných ' + mm(mMm - po * wMm) + ' mm (mezera '",
    nahrad: "          + ' zůstane neoceněných ' + mm(zbytek) + ' mm (mezera '",
    proc: 'obchodník by zase četl „vedle dveří zůstane 1 500 mm" u šachty široké 1,5 m (J. V. 1. 10. 2026)' },
  { nazev: 'zbytek mezery: dveře bez světlíku se do zbytku počítají podruhé', soubor: 'kontroly.js',
    hledej: "    const sSvetlikem = dva + jeden;",
    nahrad: "    const sSvetlikem = d;",
    proc: 'mezera u dveří bez světlíku by se hlásila dvakrát (pravidlo počtu i zbytek) a zbytek by vyšel větší, než je' },
  { nazev: 'rám dveří se do otvoru počítá jen jednou', soubor: 'engine.js',
    hledej: "  const sirkaDveri = (z.cistyVstupMm + 2 * z.sirkaRamuMm + 2 * 20) / 1000;",
    nahrad: "  const sirkaDveri = (z.cistyVstupMm + z.sirkaRamuMm + 2 * 20) / 1000;",
    proc: 'mezera vedle dveří i boční světlíky by vyšly o šířku rámu větší (dotaz J. V. 1. 10. 2026 — rám obchází dveře z obou stran)' },

  /* P7 / K13-N59 (25. 9. 2026): můstky počtem kusů. */
  { nazev: 'P7: stará zakázka se zaškrtnutým můstkem = 0 ks', soubor: 'engine.js',
    hledej: "  return (z && z.mustek) ? 1 : 0;",
    nahrad: "  return 0;",
    proc: 'zakázky s můstkem z doby před 25. 9. by ho ztratily z ceny i specifikace' },
  { nazev: 'P7: můstky se v ceně neobjeví', soubor: 'engine.js',
    hledej: "    mustky > 0 ? mkItem('MŮSTKY MEZI BUDOVOU A OCK', mustky, c.mustekKc, { cenaPath: 'C.mustekKc' }) : null,",
    nahrad: "    null,",
    proc: 'zpátky nález K13-N59 — můstek zadaný, v nabídce bez ceny' },
  { nazev: 'P7: počítá se jen jeden můstek', soubor: 'engine.js',
    hledej: "mkItem('MŮSTKY MEZI BUDOVOU A OCK', mustky,",
    nahrad: "mkItem('MŮSTKY MEZI BUDOVOU A OCK', 1,",
    proc: 'u šachty se třemi můstky by se dva nezaplatily' },
  { nazev: 'P7: záporný počet můstků odečítá cenu', soubor: 'engine.js',
    hledej: "return Math.max(0, Math.floor(+n));",
    nahrad: "return Math.floor(+n);",
    proc: 'překlep „-2" by nabídku zlevnil o dva můstky' },

  /* #355 / #356 (rozhodnutí J. V. 16. 10. 2026, dávka A2 17. 10. 2026;
   * #356 varianty A1+B1+C1+D1+E1 schválil J. V. 19. 10. 2026). */
  { nazev: '#356: střecha přes nejvyšší můstek se nepřipočte', soubor: 'engine.js',
    hledej: "  const strechaM2 = (z.sirka + 0.2) * (z.hloubka + 0.1) + strechaMustekM2;",
    nahrad: "  const strechaM2 = (z.sirka + 0.2) * (z.hloubka + 0.1);",
    proc: 'střecha přetažená přes můstek k fasádě by se zaplatila jen nad šachtou' },
  { nazev: '#356: střecha nad můstkem bez přesahu do šířky', soubor: 'engine.js',
    hledej: "? (mustekSirka + 0.2) * mustekHloubka : 0;",
    nahrad: "? mustekSirka * mustekHloubka : 0;",
    proc: 'chyběl by přesah 0,2 m jako u šachty' },
  { nazev: '#356: střechu přes můstek dostane i šachta s můstky jen níž', soubor: 'engine.js',
    hledej: "mustky > 0 && nastupist > 1 && mustky >= nastupist - 1;",
    nahrad: "mustky > 0;",
    proc: 'nižší můstky kryje můstek nad nimi — střecha by se naúčtovala navíc' },
  { nazev: '#356: příplatek za měď nezná střechu nad můstkem', soubor: 'engine.js',
    hledej: "mkPrip('medStrecha', 'PŘÍPLATEK ZA STŘECHU V MĚDI (EXT)', strechaM2,",
    nahrad: "mkPrip('medStrecha', 'PŘÍPLATEK ZA STŘECHU V MĚDI (EXT)', (z.sirka + 0.2) * (z.hloubka + 0.1),",
    proc: 'měděná střecha by měla menší plochu než střecha, kterou nahrazuje' },
  { nazev: '#356: chybějící rozměry můstku se hlásí vždy', soubor: 'kontroly.js',
    hledej: "!r.strecha.mustekNahore || r.strecha.mustekM2 > 0) return null;",
    nahrad: "!r.strecha.mustekNahore) return null;",
    proc: 'upozornění by svítilo i u zadaných rozměrů a obchodníci by ho přestali číst' },
  { nazev: '#355: plechy u můstků se neohlásí', soubor: 'kontroly.js',
    hledej: "      if (!zaklad.length && !prip.length) return null;\n      const co = rows",
    nahrad: "      return null;\n      const co = rows",
    proc: 'obchodník by se nedozvěděl, že plechy v nástupišti s můstkem platí zákazník' },
  { nazev: '#355: příplatek vynechaný z nabídky se hlásí', soubor: 'kontroly.js',
    hledej: "+x.mnozstvi > 0 && !vyn.includes(x.key));",
    nahrad: "+x.mnozstvi > 0);",
    proc: 'planý poplach u plechů, které v nabídce vůbec nejsou' },
  { nazev: '#355: upozornění zastaví dokument', soubor: 'kontroly.js',
    hledej: "      return { text: 'Šachta má ' + mustkyTxt",
    nahrad: "      return { uroven: KONTROLY_UROVEN_ZABRANA, text: 'Šachta má ' + mustkyTxt",
    proc: 'rozhodnutí J. V. 16. 10.: jen upozornit, tisk nesmí blokovat' },

  /* ---------- B115 (6. 10. 2026): obchvaty kontroly obsahu šablony ---------- */
  /* Revize 6. 10. 2026 (S1–S4): obchvaty kontroly obsahu šablony. */
  { nazev: 'revize S1/S2: šablona se rozebírá bez normalizace CDATA a komentářů', soubor: 'sablona_obsah.js',
    hledej: "    const xml = sablonaNormalizuj(text, neuzavrene);",
    nahrad: "    const xml = text;",
    proc: 'zakázané pole v CDATA nebo falešný konec pole v komentáři by kontrolou prošly' },
  { nazev: 'revize S2: sirotci kódu pole se kontrolují jen dohromady', soubor: 'sablona_obsah.js',
    hledej: "    else { sirotci += text; vady.push(sablonaPoleVada(text)); }   // každý sirotek i dohromady (S2)",
    nahrad: "    else sirotci += text;",
    proc: 'neškodný první sirotek by schoval zakázaný typ v dalším' },
  { nazev: 'revize S3: návnadový atribut vztahu se nehlídá', soubor: 'sablona_obsah.js',
    hledej: "      if (nejasne.length || ['Type', 'Target', 'TargetMode'].some(k => (presne[k] || []).length > 1)) {",
    nahrad: "      if (false) {",
    proc: 'atribut type=hyperlink před skutečným Type by z vnějšího obrázku udělal povolený odkaz' },
  { nazev: 'revize S4: typ pole ze symbolu projde', soubor: 'sablona_obsah.js',
    hledej: "  if (/^\"?\\{/.test(t)) return 'pole, jehož typ dodá symbol {{…}}';",
    nahrad: "  ;",
    proc: 'typ pole by doplnila až data zakázky — např. INCLUDETEXT ve výsledné nabídce' },
  { nazev: 'B115: číselné entity se nedekódují', soubor: 'sablona_obsah.js',
    hledej: "/&(#[xX][0-9a-fA-F]+|#[0-9]+|lt|gt|quot|apos|amp);/g",
    nahrad: "/&(lt|gt|quot|apos|amp);/g",
    proc: 'attachedTempl&#97;te + Ex&#116;ernal by prošlo — vzdálená šablona s makry u zákazníka (audit 30. 9., obchvat 1)' },
  { nazev: 'B115: pole jen s prefixem w:', soubor: 'sablona_obsah.js',
    hledej: "new RegExp('<(' + SABLONA_PREFIX + ')(fldChar|instrText|fldSimple)",
    nahrad: "new RegExp('<(w:)(fldChar|instrText|fldSimple)",
    proc: '<x:instrText> INCLUDETEXT by prošlo (obchvat 2)' },
  { nazev: 'B115: kontroluje se jen word/<jeden segment>.xml', soubor: 'sablona_obsah.js',
    hledej: "    if (!jeRels && !/\\.xml$/.test(male) && !sablonaJeXml(text)) return;",
    nahrad: "    if (!jeRels && !/^word\\/[^/]+\\.xml$/.test(male)) return;",
    proc: 'dokument ve word2/ nebo word/glossary/ by unikl (obchvat 3)' },
  { nazev: 'B115: vložené objekty jen ve word/embeddings/', soubor: 'sablona_obsah.js',
    hledej: "/(^|\\/)embeddings\\//.test(male)",
    nahrad: "/^word\\/embeddings\\//.test(male)",
    proc: 'vložený objekt ve word2/embeddings/ by prošel (obchvat 3)' },
  { nazev: 'B115: pole LINK se nehlídá', soubor: 'sablona_obsah.js',
    hledej: "'IMPORT', 'LINK', 'DDEAUTO'",
    nahrad: "'IMPORT', 'DDEAUTO'",
    proc: 'LINK na \\\\server\\share by při aktualizaci polí prozradil otisk hesla NTLM (obchvat 5)' },
  { nazev: 'B115: „>" v uvozovkách ukončí značku', soubor: 'sablona_obsah.js',
    hledej: "const SABLONA_ATRIBUTY = '(?:[^>\"\\']|\"[^\"]*\"|\\'[^\\']*\\')*';",
    nahrad: "const SABLONA_ATRIBUTY = '[^>]*';",
    proc: 'Target=\"a>b\" před Type by attachedTemplate skryl' },
  { nazev: 'B115: typ pole z vnořeného pole projde', soubor: 'sablona_obsah.js',
    hledej: "  if (t[0] === '\\u0001') return 'pole, jehož typ dodá vnořené pole';",
    nahrad: "  ;",
    proc: '{ { QUOTE \"INCLUDETEXT\" } url } by prošlo' },
  { nazev: 'B115: vnější cíl bez TargetMode se nepozná', soubor: 'sablona_obsah.js',
    hledej: " || cile.some(c => SABLONA_CIL_VNEJSI.test(c));",
    nahrad: " || false;",
    proc: 'obrázek na \\\\server\\share bez TargetMode by se načetl ze sítě' },
  /* ---------- B139–B143 (12. 10. 2026): obchvaty kontroly obsahu šablony, konec ZIPu ---------- */
  { nazev: 'B139: prefix jmenného prostoru jen z ASCII znaků', soubor: 'sablona_obsah.js',
    hledej: "const SABLONA_PREFIX = '(?:[^\\\\s<>/=\"\\':!?]+:)?';",
    nahrad: "const SABLONA_PREFIX = '(?:[\\\\w.-]+:)?';",
    proc: '<é:instrText> INCLUDETEXT by prošlo a generátor by pole přenesl do nabídky (B139)' },
  { nazev: 'B139: jméno atributu jen z ASCII znaků', soubor: 'sablona_obsah.js',
    hledej: "const SABLONA_ATRIBUT_RE = /(?<![^\\s\"'])([^\\s<>/=\"']+)\\s*=",
    nahrad: "const SABLONA_ATRIBUT_RE = /(?<![^\\s\"'])([\\w.:-]+)\\s*=",
    proc: '<é:fldSimple é:instr=\" INCLUDETEXT …\"> by kontrola četla bez kódu pole (B139)' },
  { nazev: 'B140: návnada atributu pole v cizím jmenném prostoru projde', soubor: 'sablona_obsah.js',
    hledej: "      if (a.nejasny) vady.push(",
    nahrad: "      if (false) vady.push(",
    proc: 'q:instr=\" PAGE \" před w:instr=\" INCLUDETEXT …\" — kontrola a Word by četly jiné pole (B140)' },
  { nazev: 'B140: atribut pole lišící se jen prefixem není návnada', soubor: 'sablona_obsah.js',
    hledej: "  const cizi = Object.keys(presne).filter(k => k !== ocek && k.split(':').pop().toLowerCase() === jmeno.toLowerCase());",
    nahrad: "  const cizi = Object.keys(presne).filter(k => k !== ocek && k.toLowerCase() === ocek.toLowerCase());",
    proc: 'q:instr / q:fldCharType v ignorovaném jmenném prostoru by kontrola nehlásila (B140)' },
  { nazev: 'B141: pole DATABASE a RD se nehlídají', soubor: 'sablona_obsah.js',
    hledej: "'DDEAUTO', 'DDE', 'DATABASE', 'RD'];",
    nahrad: "'DDEAUTO', 'DDE'];",
    proc: 'DATABASE spustí dotaz na cizí databázi, RD načte cizí dokument (B141)' },
  { nazev: 'B141: hromadná korespondence s připojením projde', soubor: 'sablona_obsah.js',
    hledej: "    if (new RegExp('<' + SABLONA_PREFIX + 'mailMerge(?=[\\\\s/>])').test(xml)",
    nahrad: "    if (false",
    proc: 'settings.xml s connectString/query by při otevření nabídky sahal do cizí databáze (B141)' },
  { nazev: 'B141: vztah mailMergeSource projde', soubor: 'sablona_obsah.js',
    hledej: "  'mailMergeSource', 'mailMergeHeaderSource'];",
    nahrad: "  ];",
    proc: 'zdroj dat hromadné korespondence by šel s šablonou k zákazníkovi (B141)' },
  { nazev: 'B142: nevěrohodný podpis konce ZIPu se tiše přeskočí', soubor: 'docxgen.js',
    hledej: "  if (neverohodne.some(i => i > kandidati[0]))",
    nahrad: "  if (false)",
    proc: 'škodlivý archiv za čistým: kontrola by četla čistý, Python zipfile a unzip škodlivý (B142)' },
  { nazev: 'R1: každý nevěrohodný podpis konce ZIPu archiv odmítne', soubor: 'docxgen.js',
    hledej: "  if (neverohodne.some(i => i > kandidati[0]))",
    nahrad: "  if (neverohodne.length)",
    proc: 'čistá šablona s bajty PK\\x05\\x06 v obrázku by nešla zveřejnit (revize 12. 10., R1)' },
  { nazev: 'R1: podpis konce uvnitř dat položky dělá archiv nejednoznačným', soubor: 'docxgen.js',
    hledej: "  if (kandidati.slice(1).some(i => !rozsahy.some(([a, b]) => i >= a && i + 4 <= b)))",
    nahrad: "  if (kandidati.length > 1)",
    proc: 'čistá šablona s bajty PK\\x05\\x06 v obrázku by nešla zveřejnit (revize 12. 10., R1)' },
  { nazev: 'B142: komentář konce ZIPu smí přesahovat soubor', soubor: 'docxgen.js',
    hledej: "    if (i + 22 <= u8.length && i + 22 + dv.getUint16(i + 20, true) <= u8.length",
    nahrad: "    if (i + 22 <= u8.length",
    proc: 'konec s přetékajícím komentářem by se bral za věrohodný (B142)' },
  { nazev: 'B142: velikost adresáře se u konce ZIPu nehlídá', soubor: 'docxgen.js',
    hledej: "        && dv.getUint32(i + 16, true) + dv.getUint32(i + 12, true) <= i) kandidati.push(i);",
    nahrad: "        && dv.getUint32(i + 16, true) <= i) kandidati.push(i);",
    proc: 'adresář, který zasahuje do konce, by se četl (podvržený konec v datech)' },
  { nazev: 'B142: položka STORE bez stropu rozbalení', soubor: 'docxgen.js',
    hledej: "      if (komprimovana.length > zbyva) throw new Error",
    nahrad: "      if (false) throw new Error",
    proc: 'nekomprimované položky by obešly strop 64 MB' },
  { nazev: 'B142: strop rozbalení platí na každou položku zvlášť', soubor: 'docxgen.js',
    hledej: "    zbyva -= data.length;",
    nahrad: "    ;",
    proc: 'deset položek po 60 MB by prošlo stropem 64 MB' },
  { nazev: 'B143: neuzavřený komentář nebo CDATA není vada', soubor: 'sablona_obsah.js',
    hledej: "      if (vady) vady.push({ cdata: 'neuzavřená sekce CDATA'",
    nahrad: "      if (false) vady.push({ cdata: 'neuzavřená sekce CDATA'",
    proc: 'zbytek části za neuzavřeným komentářem by kontrola nečetla a šablonu pustila (B143)' },
  { nazev: 'B143: značka vztahu bez „>" není vada', soubor: 'sablona_obsah.js',
    hledej: "    if (!t) { if (vady) vady.push('neuzavřená značka <' + m[1] + m[2] + '>'); break; }",
    nahrad: "    if (!t) break;",
    proc: '<Relationship bez „>" opakovaná 1 MB → kontrola na minuty (B143, DoS)' },
  { nazev: 'B143: pole bez „>" není vada', soubor: 'sablona_obsah.js',
    hledej: "    if (!t) { vady.push('neuzavřená značka <' + prefix + druh + '>'); break; }   // B143",
    nahrad: "    if (!t) break;",
    proc: '<w:fldChar bez „>" opakovaná 1 MB → kontrola na minuty (B143, DoS)' },
  { nazev: 'B143: neuzavřený instrText se čte do konce souboru', soubor: 'sablona_obsah.js',
    hledej: "    if (!k) { vady.push('neuzavřená značka <' + prefix + 'instrText>'); break; }",
    nahrad: "    if (!k) break;",
    proc: 'neuzavřený <w:instrText> opakovaný 1 MB → kontrola na minuty (B143, DoS)' },
  { nazev: 'B143: jméno atributu se hledá od každého znaku', soubor: 'sablona_obsah.js',
    hledej: "const SABLONA_ATRIBUT_RE = /(?<![^\\s\"'])(",
    nahrad: "const SABLONA_ATRIBUT_RE = /(",
    proc: 'dlouhé jméno atributu bez „=" → kvadratický čas kontroly (B143)' },
  /* ---------- B126 (12. 10. 2026): profil, který není objekt ---------- */
  { nazev: 'B126: profil bez objektu se za neznámý nebere', soubor: 'engine.js',
    hledej: "    .filter(k => { if (!maRozmer(pr[k])) return true;",
    nahrad: "    .filter(k => { if (!maRozmer(pr[k])) return false;",
    proc: 'profily.sloupek = null by dal nulovou hmotnost a cenu bez schvalování (B126)' },
  { nazev: 'B126: lemování se hlásí i u interiérové šachty', soubor: 'engine.js',
    hledej: "    .filter(k => k !== 'lemovani' || ext)",
    nahrad: "    .filter(k => true)",
    proc: 'interiérová šachta bez lemování (výchozí stav) by nešla vytisknout' },
  /* ---------- #395 (8. 10. 2026): kódování, ZIP bomba, konec ZIPu v komentáři ---------- */
  { nazev: '#395: UTF-16 bez BOM se pozná jen podle „<" na začátku', soubor: 'sablona_obsah.js',
    hledej: "  else if (u8.length > 3 && u8[0] !== 0 && u8[1] === 0 && u8[3] === 0) le = true;",
    nahrad: "  else if (false) le = true;",
    proc: 'část v UTF-16 bez BOM, která začíná koncem řádku, by kontrola četla jako UTF-8 s nulami' },
  { nazev: '#395: deklarované kódování se nehlídá', soubor: 'sablona_obsah.js',
    hledej: "  if (m && !/^\\s*utf-?(8|16(le|be)?)\\s*$/i.test(m[1])) return",
    nahrad: "  if (false) return",
    proc: 'UTF-7 zapíše „<" jako „+ADw-" — zakázané pole by kontrola neviděla' },
  { nazev: '#395: UTF-32 se nehlídá', soubor: 'sablona_obsah.js',
    hledej: "    return 'XML v kódování UTF-32';",
    nahrad: "    return '';",
    proc: 'část v UTF-32 by kontrola nepřečetla' },
  { nazev: 'rev #401 N3: U+FFFE / U+FFFF projdou do XML Wordu', soubor: 'docxgen.js',
    hledej: "const XML_RIDICI = /[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\uFFFE\\uFFFF]/g;",
    nahrad: "const XML_RIDICI = /[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]/g;",
    proc: 'překlad s U+FFFE by udělal z nabídky dokument, který Word neotevře' },
  { nazev: '#395: rozbalení ZIPu bez stropu', soubor: 'docxgen.js',
    hledej: "    if (n > zbyva) {",
    nahrad: "    if (false) {",
    proc: 'ZIP bomba (100 kB → stovky MB) by na serveru vyčerpala paměť' },
  { nazev: '#395: konec ZIP adresáře podle prvního podpisu od konce', soubor: 'docxgen.js',
    hledej: "  if (kandidati.slice(1).some(i => !rozsahy.some(([a, b]) => i >= a && i + 4 <= b)))",
    nahrad: "  if (false)",
    proc: 'podvržený konec v komentáři by kontrole ukázal jiný (čistý) adresář než Wordu' },
  { nazev: 'B115: UTF-16 se čte jako UTF-8', soubor: 'sablona_obsah.js',
    hledej: "  if (u8[0] === 0xFF && u8[1] === 0xFE) { le = true; od = 2; }",
    nahrad: "  if (false) { le = true; od = 2; }",
    proc: 'část v UTF-16 by kontrola nepřečetla, Word ano' },
  { nazev: 'B115: DOCTYPE / ENTITY projde', soubor: 'sablona_obsah.js',
    hledej: "    if (/<!(DOCTYPE|ENTITY)\\b/i.test(text)) pridej(",
    nahrad: "    if (false) pridej(",
    proc: 'vlastní entita by zakázaný typ vztahu skryla' },
  { nazev: 'B115: kód pole rozdělený do běhů bez fldChar se nespojí', soubor: 'sablona_obsah.js',
    hledej: "  vady.push(sablonaPoleVada(sirotci));",
    nahrad: "  ;",
    proc: 'INCLU + DEPICTURE v samostatných instrText by prošlo (B99)' },

  /* #348 (24. 9. 2026): zdroj jazykové verze a jazyk souboru. */
  { nazev: 'šablony: mutace k jiné češtině se tváří jako aktuální', soubor: 'sablony_online.js',
    hledej: "    return { stav: m.zdrojOtisk === cz.otisk ? 'aktualni' : 'zastarala', meta: m,",
    nahrad: "    return { stav: 'aktualni', meta: m,",
    proc: 'po nové češtině by se tiskla anglická nabídka ze starého znění' },
  { nazev: 'šablony: zdrojOtisk se nezapíše', soubor: 'sablony_online.js',
    hledej: '    t.platna.zdrojOtisk = info.zdrojOtisk;',
    nahrad: '    ;',
    proc: 'mutace by nevěděla, ze které češtiny vznikla — zpátky k falešnému „zastaralá"' },
  { nazev: 'šablony: německý text se počítá jako čeština', soubor: 'sablony_online.js',
    hledej: "  cz: /[ěřůťďň]/gi, de: /[äöüß]/gi, fr: /[àâçèêëîïôûœ]/gi, en: null,",
    nahrad: "  cz: /[ěřůťďňäöüß]/gi, de: null, fr: /[àâçèêëîïôûœ]/gi, en: null,",
    proc: 'německý soubor by prošel jako česká šablona (stalo se 24. 9.)' },
  { nazev: 'šablony: projde i vymyšlený typ', soubor: 'sablony_online.js',
    hledej: '  if (SABLONY_ONLINE_TYPY.includes(typ)) return true;',
    nahrad: '  return true;',
    proc: 'do úložiště by šel zapsat soubor pod libovolným klíčem — včetně cesty, která rozbije rejstřík' },

  { nazev: 'šablony: za Word se vydává cokoli', soubor: 'sablony_online.js',
    hledej: "  return typeof b64 === 'string' && b64.indexOf('UEsDB') === 0;",
    nahrad: "  return typeof b64 === 'string' && b64.length > 0;",
    proc: 'omylem nahrané PDF by prošlo zveřejněním a spadlo až obchodníkovi při tisku' },

  { nazev: 'šablony: nová verze nezvyšuje číslo', soubor: 'sablony_online.js',
    hledej: '  const verze = (t.platna ? t.platna.verze : 0) + 1;',
    nahrad: '  const verze = 1;',
    proc: 'druhé zveřejnění by přepsalo soubor verze 1 — historie by lhala a stará nabídka by se nedala doložit' },

  { nazev: 'šablony: překlep přepne režim', soubor: 'sablony_online.js',
    hledej: "  if (!rej || (rezim !== 'prisny' && rezim !== 'mekky')) return rej;",
    nahrad: '  if (!rej) return rej;',
    proc: 'nesmyslná hodnota režimu by tiše vypnula přísný režim — a s ním záruku, že se netiskne ze starých šablon' },

  /* ---------- zaokrouhlení koncové ceny (engine.js) ---------- */
  { nazev: 'základní cena se zaokrouhluje matematicky, ne nahoru', soubor: 'engine.js',
    hledej: 'const zakladCenaZaokr = CEIL(zakladCena, 1000);',
    nahrad: 'const zakladCenaZaokr = Math.round(zakladCena / 1000) * 1000;',
    proc: 'nabídka by šla ven pod spočtenou cenou — pokaždé, když je zbytek pod polovinou tisícovky' },

  { nazev: 'základní cena se zaokrouhluje na stovky místo na tisíce', soubor: 'engine.js',
    hledej: 'const zakladCenaZaokr = CEIL(zakladCena, 1000);',
    nahrad: 'const zakladCenaZaokr = CEIL(zakladCena, 100);',
    proc: 'kalkulace a odeslaná nabídka by ukazovaly jiné číslo než krycí list' },

  { nazev: 'CEIL zaokrouhluje dolů', soubor: 'engine.js',
    hledej: 'const CEIL = (x, m) => Math.ceil(x / m - 1e-9) * m;',
    nahrad: 'const CEIL = (x, m) => Math.floor(x / m + 1e-9) * m;',
    proc: 'každá zaokrouhlená částka v programu by spadla o skoro celý krok dolů' },

  { nazev: 'cena s DPH se počítá z nezaokrouhleného základu', soubor: 'engine.js',
    hledej: '    zakladSDph: zakladCenaZaokr * (1 + dph),',
    nahrad: '    zakladSDph: zakladCena * (1 + dph),',
    proc: 'základ, daň a součet v nabídce by nedávaly dohromady — účetní to vrátí' },

  /* ---------- marže a přirážky (engine.js) ---------- */
  { nazev: 'marže se od nákladu odečítá místo přičítá', soubor: 'engine.js',
    hledej: '             naklad, marze: naklad * m, sMarzi: naklad * (1 + m),',
    nahrad: '             naklad, marze: naklad * m, sMarzi: naklad * (1 - m),',
    proc: 'prodávali bychom pod nákladem a v souhrnu by to vypadalo jako sleva' },

  { nazev: 'rezerva se v opraveném režimu počítá z ceny s marží', soubor: 'engine.js',
    hledej: '    const naklad = nakladBezRezervy * z.rezervaZakladPct;',
    nahrad: '    const naklad = sMarziBezRezervy * z.rezervaZakladPct;',
    proc: 'do opraveného režimu by se vrátila chyba šablony: marže z marže, tedy rezerva vyšší, než kolik si zadal obchodník' },

  { nazev: 'rezerva plechů se počítá procentem pro profily', soubor: 'engine.js',
    hledej: '  const plechyKgRez = plechyKg * (1 + rezPl);',
    nahrad: '  const plechyKgRez = plechyKg * (1 + rezP);',
    proc: 'dvě různá pole rezervy by ovlivňovala tutéž položku a jedno z nich by nedělalo nic' },

  /* ---------- záměna sazeb a položek ceníku (engine.js) ---------- */
  { nazev: 'plechy: prohozená sazba exteriér ↔ interiér', soubor: 'engine.js',
    hledej: "mkItem('PLECHY - HLAVNÍ KONSTRUKČNÍ PLECHY', plechyKgRez, ext ? c.powertechExt : c.powertechInt,",
    nahrad: "mkItem('PLECHY - HLAVNÍ KONSTRUKČNÍ PLECHY', plechyKgRez, ext ? c.powertechInt : c.powertechExt,",
    proc: 'nejtěžší položka kalkulace by se u každé šachty ocenila cenou toho druhého provedení' },

  { nazev: 'statické posouzení se účtuje sazbou stavbyvedoucího', soubor: 'engine.js',
    hledej: "mkItem('STATICKÉ POSOUZENÍ', c.statikaHod, c.statikaKc,",
    nahrad: "mkItem('STATICKÉ POSOUZENÍ', c.statikaHod, c.stavbyvedouciKc,",
    proc: 'dvě sazby ceníku by se prohodily a v Nastavení by změna sazby statiky neměla žádný účinek' },

  /* Od 11. 8. 2026 má lešení jedinou fixní částku (C.leseniFix). Mutace se
   * proto ptá jinak: co když ji příplatková větev vezme odjinud než větev
   * volitelných? Přesně to se dělo v předloze (18 000 vs 15 000) a přesunutí
   * lešení mezi sekcemi tiše měnilo cenu. */
  { nazev: 'lešení: příplatek počítá fixní část z jiného zdroje než volitelné', soubor: 'engine.js',
    hledej: "      { cenaPath: 'C.leseniVnitrniKc', fix: c.leseniFix }),",
    nahrad: "      { cenaPath: 'C.leseniVnitrniKc', fix: 15000 }),",
    proc: 'přesun lešení ze základní ceny do příplatků by změnil cenu, aniž by o tom kdokoli věděl' },

  { nazev: 'lešení: hlava šachty by dostala vlastní fixní část', soubor: 'engine.js',
    hledej: "    v.leseniHlava ? null : mkPrip('leseniHlava', 'LEŠENÍ - dokončení hlavy šachty', z.prejezd, pp.leseniHlavaKc,\n      { cenaPath: 'C.priplatky.leseniHlavaKc' }),",
    nahrad: "    v.leseniHlava ? null : mkPrip('leseniHlava', 'LEŠENÍ - dokončení hlavy šachty', z.prejezd, pp.leseniHlavaKc,\n      { cenaPath: 'C.priplatky.leseniHlavaKc', naklad: z.prejezd * pp.leseniHlavaKc + 5000 }),",
    proc: 'nástavba už postaveného lešení by se účtovala, jako by se stavělo znovu' },

  { nazev: 'lešení: fixní část se do nákladu nepřičte', soubor: 'engine.js',
    hledej: '    if (opts.fix != null) naklad = (prepisJe && mn === 0) ? 0 : mn * cenaEff + opts.fix;',
    nahrad: '    if (opts.fix != null) naklad = (prepisJe && mn === 0) ? 0 : mn * cenaEff;',
    proc: 'postavení a složení lešení bychom vozili zdarma u každé zakázky' },

  /* ---------- vynechání položky nebo celé sekce ze součtu (engine.js) ---------- */
  { nazev: 'interní transport vypadne z hrubé OCK', soubor: 'engine.js',
    hledej: "    mkItem('INTERNÍ TRANSPORT', 2, c.transportKc, { cenaPath: 'C.transportKc' }),",
    nahrad: '    null,',
    proc: 'dopravu konstrukce na stavbu bychom zaplatili ze svého a v kalkulaci by po ní nezbyla stopa' },

  { nazev: 'sekce Režie vypadne ze součtu nákladů', soubor: 'engine.js',
    hledej: '  const nakladBezRezervy = s1.naklad + s2.naklad + s3.naklad + s4.naklad;',
    nahrad: '  const nakladBezRezervy = s1.naklad + s2.naklad + s3.naklad;',
    proc: 'projekce, statika a kancelář by se v nabídce ukázaly, ale do nákladové ceny by se nezapočítaly' },

  { nazev: 'příplatek za sklo SKN se nenabízí', soubor: 'engine.js',
    hledej: "    ext ? sknZPrepisu(mkPrip('skn', 'Sklo SKN 176 (Ug=1,1) (EXT)', sknM2, pp.sknM2, { cenaPath: 'C.priplatky.sknM2' })) : null,",
    nahrad: '    null,',
    proc: 'nejčastěji poptávaný příplatek exteriérové šachty by z nabídky tiše zmizel' },

  /* N50 a N52 (hloubkový test 24. 9. 2026) */
  { nazev: 'N50: po stěnách se VSG počítá ze standardního zasklení', soubor: 'engine.js',
    hledej: "    ? oplSkloPlochy.reduce((a, p) => a + (OPL_SKLA.indexOf(p.typ) >= 0 ? p.m2 : 0), 0)\n",
    nahrad: "    ? skloCelkemM2\n",
    proc: 'fólie VSG by se účtovala i za stěny z Cetrisu nebo dodané stavbou' },
  { nazev: 'N50: SKN po stěnách i z jiného skla než dvojskla', soubor: 'engine.js',
    hledej: "    ? oplSkloPlochy.reduce((a, p) => a + (p.typ === 'C.skloBokyKc' ? p.m2 : 0), 0)\n",
    nahrad: "    ? oplSkloPlochy.reduce((a, p) => a + (OPL_SKLA.indexOf(p.typ) >= 0 ? p.m2 : 0), 0)\n",
    proc: 'SKN (náhrada dvojskla) by se účtovalo i za čelní VSG 4.4.1' },
  /* P3 (K19-N105, 1. 10. 2026): ruční přepis plochy skla posune PRÁCI a TMELENÍ. */
  { nazev: 'P3 (K19-N105): PRÁCE a TMELENÍ ignorují ruční přepis plochy skla', soubor: 'engine.js',
    hledej: "  const oplZPrepisuSkla = skloBokyPrepis != null || skloCelniPrepis != null;",
    nahrad: "  const oplZPrepisuSkla = false;",
    proc: 'po ruční úpravě plochy skla by se práce opláštění a tmelení dál účtovaly z geometrie (K19T-C071: 213,8 místo 120,6 m²)' },
  { nazev: 'P3 (K19-N105): přepis čelního skla se do PRÁCE nepromítne', soubor: 'engine.js',
    hledej: " + (skloCelniPrepis != null ? skloCelniPrepis : skloCelniM2)",
    nahrad: " + skloCelniM2",
    proc: 'ručně upravené čelní sklo by se v práci opláštění počítalo z geometrie' },
  /* #392 (6. 10. 2026): příplatky VSG a SKN z ručně přepsané plochy skla. */
  { nazev: '#392: VSG ignoruje ruční přepis plochy skla', soubor: 'engine.js',
    hledej: "    : (oplZPrepisuSkla ? skloBokyEfM2 + skloCelniEfM2 : skloCelkemM2);",
    nahrad: "    : skloCelkemM2;",
    proc: 'po ruční úpravě plochy skla by se fólie VSG dál účtovala z geometrie' },
  { nazev: '#392: SKN ignoruje ruční přepis skla boků', soubor: 'engine.js',
    hledej: "    : skloBokyEfM2;",
    nahrad: "    : skloBokyZadniM2;",
    proc: 'po ruční úpravě skla boků by se SKN dál účtovalo z geometrie' },
  { nazev: '#392: přepis čelního skla se do VSG nepromítne', soubor: 'engine.js',
    hledej: "  const skloCelniEfM2 = skloCelniPrepis != null ? skloCelniPrepis : skloCelniM2;",
    nahrad: "  const skloCelniEfM2 = skloCelniM2;",
    proc: 'ručně upravené čelní sklo by se ve fólii VSG počítalo z geometrie' },
  { nazev: '#392: SKN bez značky přepisu skla', soubor: 'engine.js',
    hledej: "  const sknZPrepisu = (it) => (skloBokyPrepis != null ? sPlochouSkla(it) : it);",
    nahrad: "  const sknZPrepisu = (it) => it;",
    proc: 'Detail výpočtu by u SKN neřekl, že množství je z ručně přepsané plochy skla' },
  { nazev: '#392: SKN ze skla celkem místo boků', soubor: 'engine.js',
    hledej: "  const skloBokyEfM2 = skloBokyPrepis != null ? skloBokyPrepis : skloBokyZadniM2;",
    nahrad: "  const skloBokyEfM2 = skloBokyPrepis != null ? skloBokyPrepis + skloCelniM2 : skloBokyZadniM2;",
    proc: 'SKN (náhrada dvojskla boků) by se s přepisem účtovalo i za čelní sklo' },
  /* P5 (K19-N109, 2. 10. 2026): statika ve dvou řádcích. */
  { nazev: 'P5 (K19-N109): řádek statiky opláštění nevznikne', soubor: 'engine.js',
    hledej: "    (+c.statikaOplHod || 0) > 0 && oplPlochaCelkem > 0",
    nahrad: "    false",
    proc: 'statika opláštění z ceníku by se do nabídky nedostala' },
  { nazev: 'P5 (K19-N109): statika opláštění i u šachty bez opláštění', soubor: 'engine.js',
    hledej: "    (+c.statikaOplHod || 0) > 0 && oplPlochaCelkem > 0",
    nahrad: "    (+c.statikaOplHod || 0) > 0",
    proc: 'šachta, jejíž plášť dodá stavba, by platila statiku opláštění' },
  { nazev: 'P5 (K19-N109): kontrola dvojí statiky mlčí', soubor: 'kontroly.js',
    hledej: "      if (!ock || !opl || !ock.prepsano) return null;",
    nahrad: "      return null;",
    proc: 'ručně dorovnaná statika z převodu by se s novým řádkem opláštění zaplatila dvakrát bez upozornění' },
  /* P6 / K19-N114 (13. 10. 2026): zámek strany v kontrolách. */
  { nazev: 'P6 (K19-N114): kontroly hlídají i vyřazenou stranu', soubor: 'kontroly.js',
    hledej: "  ctx = kontrolyCtxStrany(ctx);",
    nahrad: "  ;",
    proc: 'OCK zakázka s číslem OPR by dál hlásila projekci u zahraničí a plán plateb PROJ (K21-N1)' },
  { nazev: 'P6 (K19-N114): vyřazená PROJ v kontrolách nese výsledek', soubor: 'kontroly.js',
    hledej: "    c.projZadani = null; c.projVysledek = null; c.slevaProj = null; c.platbyProj = null;",
    nahrad: "    ;",
    proc: 'cenaNula a slevaProj by hlídaly projekci, která se nenabízí' },
  { nazev: 'P6 (K19-N114): dokument vyřazené strany nezablokovaný', soubor: 'kontroly.js',
    hledej: "  if (zakazkaVyrazenaStrana(zak) !== strana) return '';",
    nahrad: "  return '';",
    proc: 'nabídka PROJ by šla vytisknout u zakázky OCK' },
  { nazev: 'P6 (K19-N114): upozornění „dřív obě strany" mlčí', soubor: 'kontroly.js',
    hledej: "      if (!zak || typeof zakazkaDrivObeStrany !== 'function' || !zakazkaDrivObeStrany(zak)) return null;",
    nahrad: "      return null;",
    proc: 'starší zakázka by bez varování přišla o cenu druhé strany v přehledech' },
  /* P2 (K19-N104, 2. 10. 2026): zkratka „prosklít i prohlubeň". */
  { nazev: 'P2 (K19-N104): změna hloubky posune i ručně nastavené meze stěn', soubor: 'engine.js',
    hledej: "  if (!oplasteniProhlubenVse(Object.assign({}, z, { prohluben: hlStara }))) return false;",
    nahrad: "  ;",
    proc: 'změna prohlubně by přepsala dolní mez, kterou obchodník u stěny zadal ručně' },
  { nazev: 'P2 (K19-N104): zkratka nastaví mez jen některým stěnám', soubor: 'engine.js',
    hledej: "      o.steny[k].odM = hl > 0 ? -hl : 0;",
    nahrad: "      if (k !== 'D') o.steny[k].odM = hl > 0 ? -hl : 0;",
    proc: 'jedna stěna by zůstala bez prosklené prohlubně a cena by neseděla s Excelem' },
  { nazev: 'N52: dva řádky „jiné" téhož názvu', soubor: 'engine.js',
    hledej: "      const nazev = pouzite[zaklad] > 1 ? zaklad + ' (' + pouzite[zaklad] + ')' : zaklad;",
    nahrad: "      const nazev = zaklad;",
    proc: 'ruční cena jednoho pásu „jiné" by přepsala i druhý se stejným názvem' },

  { nazev: 'příplatky se nezaokrouhlují nahoru', soubor: 'engine.js',
    hledej: "             naklad, sMarzi: CEIL(naklad * (1 + m), 1000), pozn: opts.pozn || ''",
    nahrad: "             naklad, sMarzi: naklad * (1 + m), pozn: opts.pozn || ''",
    proc: 'ceny příplatků by v nabídce vycházely na koruny místo na tisíce' },

  { nazev: 'rezerva příplatků se do jejich celkové ceny nezapočte', soubor: 'engine.js',
    hledej: '  const priplatkyCenaCelkem = CEIL(priplatkyCena + priplatkyRez, 1000);',
    nahrad: '  const priplatkyCenaCelkem = CEIL(priplatkyCena, 1000);',
    proc: 'zadaná rezerva u příplatků by se spočítala, ukázala a pak zahodila' },

  /* ---------- DPH (engine.js) ---------- */
  { nazev: 'OCK počítá DPH sazbou projekční části', soubor: 'engine.js',
    hledej: '  const dph = c.dph;',
    nahrad: '  const dph = 0.21;',
    proc: 'na ocelovou konstrukci by se použila sazba projekce a doklad by měl špatnou daň' },

  /* ---------- ATYP (engine.js) ---------- */
  { nazev: 'přirážka za ATYP se počítá ze základu s marží', soubor: 'engine.js',
    hledej: '    const atypZaklad = jenPocitane(rezie).reduce((a, r) => a + r.naklad, 0);',
    nahrad: '    const atypZaklad = jenPocitane(rezie).reduce((a, r) => a + r.sMarzi, 0);',
    proc: 'poznámka u řádku by tvrdila „procento z nákladu režie" a číslo by bylo z ceny — marže dvakrát' },

  { nazev: 'ATYP: nulová sazba v ceníku se bere jako nevyplněná', soubor: 'engine.js',
    hledej: '  const atypSazba = z.atyp ? (c.atypPrirazka != null ? +c.atypPrirazka : 0.30) : 0;',
    nahrad: '  const atypSazba = z.atyp ? (+c.atypPrirazka || 0.30) : 0;',
    proc: 'vědomé rozhodnutí „za atyp nepřirážíme" by se přebilo výchozími třiceti procenty' },

  { nazev: 'ATYP zámečník: prázdný přepis sazby se bere jako nula', soubor: 'engine.js',
    hledej: "  const _prepisZadan = v => !(v === undefined || v === null || v === '');",
    nahrad: '  const _prepisZadan = v => !!v;',
    proc: 'dohodnutá nulová sazba („tohle uděláme zdarma") by se tiše přepsala ceníkovou — zákazník dostane jinou cenu, než na čem jsme se domluvili' },

  { nazev: 'přepis množství: nula se bere jako nevyplněno', soubor: 'engine.js',
    /* Tatáž řádka je od 18. 9. 2026 i u příplatků — kotva proto bere i konec
     * komentáře nad ní, ať míří na položky kalkulace (mkItem). */
    hledej: "dřív by z něj bylo množství 0, teď platí spočtené. */\n    const prepis = z.mnozstviPrepis ? z.mnozstviPrepis[nazev] : null;\n    const prepisJe = (typeof prepisPlati === 'function') ? prepisPlati(prepis) : prepis != null;",
    nahrad: "dřív by z něj bylo množství 0, teď platí spočtené. */\n    const prepis = z.mnozstviPrepis ? z.mnozstviPrepis[nazev] : null;\n    const prepisJe = !!prepis;",
    proc: 'ručně vynulovaná položka („tuhle věc tady neděláme") by se vrátila ve spočteném množství' },

  /* ---------- kompatibilní režim: opravy napodobených chyb Excelu ----------
   * Jádro schválně napodobuje osm zdokumentovaných chyb původní šablony, aby
   * kompatibilní režim (fixes=false) počítal 1:1 jako Excel. Tyhle mutace tu
   * napodobeninu OPRAVUJÍ. Vypadá to jako zlepšení, ale je to rozejití se
   * vzorem — a přesně tomu má sada shody s Excelem zabránit. */
  { nazev: 'kompat: opravená chyba D51/D52 (obrácené int/ext u spodního rámu a kotvení)', soubor: 'engine.js',
    hledej: "      const inv = (r.key === 'spodniRamRoh' || r.key === 'kotveni');",
    nahrad: '      const inv = false;',
    proc: 'kompatibilní režim by se rozešel s excelovou předlohou a starší zakázky by se po otevření přepočítaly na jinou cenu' },

  { nazev: 'kompat: opravená chyba $D$3 (kotvení vždy exteriérovou plochou)', soubor: 'engine.js',
    hledej: '      m2Na1 = (r.key === \'kotveni\') ? s.ext.m2 : s[strana].m2; // $D$3 bug -> vždy ext',
    nahrad: '      m2Na1 = s[strana].m2;',
    proc: 'totéž jinou cestou — u interiérové šachty by kompatibilní režim počítal jinou plochu k lakování než předloha' },

  { nazev: 'kompat: lemování se do lakování profilů započítá i bez oprav', soubor: 'engine.js',
    hledej: '  const lakProfM2 = profM2 + (fixes ? lemM2 : 0);',
    nahrad: '  const lakProfM2 = profM2 + lemM2;',
    proc: 'cena lakování v kompatibilním režimu by přestala sedět s předlohou a rozdíl by nikdo nečekal' },

  { nazev: 'kompat: podesty se do lakování berou jen po opravě', soubor: 'engine.js',
    hledej: '  const lakOplechM2 = oplDvereM2 + (fixes ? podestM2 : podM21 * podestKs0)',
    nahrad: '  const lakOplechM2 = oplDvereM2 + podestM2',
    proc: 'zmizel by rozdíl mezi oběma režimy u lakování oplechování, který je dokumentovaný a testovaný' },

  { nazev: 'kompat: opravená chyba D19/D18 (hloubka bočního zasklení)', soubor: 'engine.js',
    hledej: '  const bocniHl = fixes ? g.hl : (svetlik ? gTerc.hl : gLis.hl);   // chyba šablony: D19 místo D18',
    nahrad: '  const bocniHl = g.hl;',
    proc: 'u lištového zasklení by se plocha bočních skel rozešla s předlohou a s ní i cena skla' },

  /* ---------- montáž přechodových plechů: vlastní přepínač (#131) ---------- */
  { nazev: 'montáž přechodových plechů ignoruje vlastní přepínač', soubor: 'engine.js',
    hledej: '  const prechMontAno = (zVol.prechMont != null) ? !!zVol.prechMont : prechodoveAno;',
    nahrad: '  const prechMontAno = prechodoveAno;',
    proc: 'montáž by se nedala zaškrtnout ani odškrtnout samostatně – přesně to, co dělá vzorec v předloze' },

  { nazev: 'prázdný přepínač montáže se bere jako vypnuto', soubor: 'engine.js',
    hledej: '  const prechMontAno = (zVol.prechMont != null) ? !!zVol.prechMont : prechodoveAno;',
    nahrad: '  const prechMontAno = !!zVol.prechMont;',
    proc: 'montáž by zmizela ze všech starších zakázek, které přepínač ještě nemají – zase prázdno zaměněné za nulu' },

  { nazev: 'N57: chybějící volitelné položky shodí výpočet', soubor: 'engine.js',
    hledej: "  const zVol = (z.volitelne && typeof z.volitelne === 'object') ? z.volitelne : {};",
    nahrad: '  const zVol = z.volitelne;',
    proc: 'zakázka bez objektu volitelných (poškozený soubor) by nešla otevřít — prázdná obrazovka' },

  /* ---------- oddělení slev OCK a PROJ (#134, 12. 8. 2026) ---------- */
  /* Po #141 jsou souhrn.cena a souhrn.celkem totéž číslo (jedno procento,
   * doprava v obou), takže dřívější záměna celkem→cena by nic nezměnila.
   * Mutace proto nově míří na náklad — jediný jiný „základ", který se nabízí. */
  { nazev: 'sleva projekce se počítá z nákladu místo z ceny', soubor: 'zaokrouhleni.js',
    hledej: `function cenaNabidkyProj(vysl, sleva, zaokr) {
  if (!vysl || !vysl.souhrn) return null;
  const zaklad = vysl.souhrn.celkem;`,
    nahrad: `function cenaNabidkyProj(vysl, sleva, zaokr) {
  if (!vysl || !vysl.souhrn) return null;
  const zaklad = vysl.souhrn.naklad;`,
    proc: 'sleva projekce by se počítala z jiné částky, než ze které se doopravdy dává — a nabídka by odešla hluboko pod cenou' },

  /* Kotvy níž míří do cenaNabidkyProj, která se 12. 8. 2026 přepsala na
   * zaokrouhlování jednotlivých činností (#135). Kus kódu, kterým se od
   * cenaNabidkyOck odlišuje, je řádek se `sekce` — na ten se proto vážou. */
  { nazev: 'sleva projekce se do ceny nepropíše', soubor: 'zaokrouhleni.js',
    hledej: `    ? sekce.reduce((a, s) => a + zaokrouhli((+s.celkem || 0) * (1 - p), zaokr), 0)`,
    nahrad: `    ? sekce.reduce((a, s) => a + zaokrouhli((+s.celkem || 0), zaokr), 0)`,
    proc: 'schválená sleva na projekci by se zákazníkovi nikdy neukázala v ceně — slíbili bychom ji a neposkytli' },

  { nazev: 'neschválená sleva projekce se přesto propíše', soubor: 'zaokrouhleni.js',
    hledej: `  const podil = (typeof slevaPodil === 'function') ? slevaPodil(sleva || {}) : 0;
  const p = Math.max(0, Math.min(1, +podil || 0));
  const slevaKc = zaklad * p;
  const pred = zaklad - slevaKc;
  /* Bez seznamu sekcí`,
    nahrad: `  const podil = (+(sleva && sleva.procenta) || 0) / 100;
  const p = Math.max(0, Math.min(1, +podil || 0));
  const slevaKc = zaklad * p;
  const pred = zaklad - slevaKc;
  /* Bez seznamu sekcí`,
    proc: 'do nabídky by odešla sleva, kterou nikdo neschválil — obchodník by ji zadal a zákazník dostal' },

  /* #135: zaokrouhlení se přesunulo z celku na jednotlivé činnosti. Kdyby se
   * vrátilo na celek, začaly by se v nabídce lišit ceny činností od jejich
   * součtu — a dorovnávací řádek, který má být pryč, by zase chyběl. */
  { nazev: 'PROJ: zaokrouhluje se až součet, ne jednotlivé činnosti', soubor: 'zaokrouhleni.js',
    hledej: `  const cena = sekce
    ? sekce.reduce((a, s) => a + zaokrouhli((+s.celkem || 0) * (1 - p), zaokr), 0)
    : zaokrouhli(pred, zaokr);`,
    nahrad: `  const cena = zaokrouhli(pred, zaokr);`,
    proc: 'nabídka by ukazovala činnosti, jejichž součet nedává uvedenou celkovou cenu' },

  { nazev: 'marže projekce se poměřuje s cenou před slevou', soubor: 'marze.js',
    hledej: "  const cn = (typeof cenaNabidkyProj === 'function') ? cenaNabidkyProj(vysl, sleva, zaokr) : null;",
    nahrad: "  const cn = (typeof cenaNabidkyProj === 'function') ? cenaNabidkyProj(vysl, null, zaokr) : null;",
    proc: 'hlídání marže by mlčelo právě u nabídek, kde se slevovalo nejvíc' },

  { nazev: 'obě části dostanou touž slevu', soubor: 'marze.js',
    hledej: '  const p = marzeStavProj(proj, slevaProj, nast, zaokrProj === undefined ? zaokr : zaokrProj);',
    nahrad: '  const p = marzeStavProj(proj, sleva, nast, zaokrProj === undefined ? zaokr : zaokrProj);',
    proc: 'marže projekce by se počítala se slevou dohodnutou na výtahovou šachtu — dvě různé zakázky v jednom čísle' },

  /* ---------- PROJEKCE: přirážka sekcí (engine_proj.js) ----------
   * Sleva se od 12. 8. 2026 (#134) do výpočtu neplete vůbec — odečítá se až
   * od hotové ceny v zaokrouhleni.js. Mutace na slevu proto sedí tam. */
  { nazev: 'PROJ: vlastní % sekce se ignoruje', soubor: 'engine_proj.js',
    hledej: '    const pct = (s.prirazkaPct != null ? s.prirazkaPct / 100 : (+c.marze || 0));',
    nahrad: '    const pct = (+c.marze || 0);',
    proc: 'ruční úprava přirážky v konkrétní sekci by neudělala nic — obchodník by ji zadal a cena by se nehnula' },

  { nazev: 'PROJ: nulové vlastní % sekce spadne na globální přirážku', soubor: 'engine_proj.js',
    hledej: '    const pct = (s.prirazkaPct != null ? s.prirazkaPct / 100 : (+c.marze || 0));',
    nahrad: '    const pct = (s.prirazkaPct ? s.prirazkaPct / 100 : (+c.marze || 0));',
    proc: 'vědomé „u téhle sekce nepřirážíme nic" by přebila globální přirážka — prázdno zaměněné za nulu' },

  { nazev: 'PROJ: sekce nedostane globální přirážku z ceníku', soubor: 'engine_proj.js',
    hledej: '    const pct = (s.prirazkaPct != null ? s.prirazkaPct / 100 : (+c.marze || 0));',
    nahrad: '    const pct = (s.prirazkaPct != null ? s.prirazkaPct / 100 : 0);',
    proc: 'sekce bez vlastního procenta by přišly o přirážku — nabídka projekce by odešla o desítky procent levnější' },

  { nazev: 'PROJ: přirážka se odečítá místo přičítá', soubor: 'engine_proj.js',
    hledej: '    const cena = naklad + marze;                      // nabídková cena sekce (bez dopravy)',
    nahrad: '    const cena = naklad - marze;',
    proc: 'z přirážky by se stala sleva a každá nabídka projekce by odešla pod cenou' },

  { nazev: 'PROJ: do ceny sekce se nedostane doprava', soubor: 'engine_proj.js',
    hledej: '    const celkem = cenaSDopravou;                     // celková cena sekce',
    nahrad: '    const celkem = cena;',
    proc: 'kilometry a paušál by se počítaly naprázdno — doprava by šla z marže firmy' },


  { nazev: 'PROJ: doprava dostane marži', soubor: 'engine_proj.js',
    hledej: '    const cenaSDopravou = cena + dopravaKc;',
    nahrad: '    const cenaSDopravou = cena + dopravaKc * (1 + c.marze);',
    proc: 'doprava se podle předlohy přeprodává bez přirážky; s marží by se cena rozešla s excelovým vzorem' },

  { nazev: 'PROJ: příplatek mimo Prahu se nezapočítá', soubor: 'engine_proj.js',
    hledej: '        + (s.doprava.mimoPrahu ? km / 60 * dopravaHodinaKc(c) : 0)',
    nahrad: '        + 0',
    proc: 'zaškrtnutí „mimo Prahu" by nic nedělalo — přesně slepota, která se opravovala 2. 8. 2026' },

  { nazev: 'PROJ: vzorec mimo Prahu s jinou sazbou', soubor: 'engine_proj.js',
    hledej: '        + (s.doprava.mimoPrahu ? km / 60 * dopravaHodinaKc(c) : 0)',
    nahrad: '        + (s.doprava.mimoPrahu ? km / 60 * dopravaHodinaKc(c) / 10 : 0)',
    proc: 'vzorec je km / 60 × hodinová sazba z ceníku (dopravaHodinaKc) — desetinová chyba by zlevnila každou mimopražskou cestu' },

  /* ---------- PROJEKCE: náklad položek (engine_proj.js) ---------- */
  { nazev: 'PROJ: rezerva hodin se do položky nepřičte', soubor: 'engine_proj.js',
    hledej: '        const hodiny = (+p.hodiny || 0) + (+p.rezerva || 0);',
    nahrad: '        const hodiny = (+p.hodiny || 0);',
    proc: 'hodiny zadané jako rezerva by zůstaly ve formuláři, ale nikdo by je nezaplatil' },

  { nazev: 'PROJ: vyřazená hodinová položka se přesto počítá', soubor: 'engine_proj.js',
    hledej: '                 naklad: vyrazeno ? 0 : hodiny * sazba };',
    nahrad: '                 naklad: hodiny * sazba };',
    proc: 'položka škrtnutá jako „tohle u téhle stavby neděláme" by se do ceny sečetla dál' },

  { nazev: 'PROJ: prázdný přepis sazby se bere jako nula', soubor: 'engine_proj.js',
    hledej: "  return !(v === undefined || v === null || v === '');",
    nahrad: '  return !!v;',
    proc: 'sjednaná nulová sazba („tuhle činnost děláme zdarma") by se přepsala ceníkovou — a naopak' },

  { nazev: 'PROJ: zaměření se účtuje sazbou projektanta', soubor: 'engine_proj.js',
    hledej: "        { nazev: 'Zaměření', typ: 'hod', sazba: 'zamereni', hodiny: 5, rezerva: 0, vyrazeno: true },",
    nahrad: "        { nazev: 'Zaměření', typ: 'hod', sazba: 'projektant', hodiny: 5, rezerva: 0, vyrazeno: true },",
    proc: 'dvě hodinové sazby ceníku by se prohodily a sazba za zaměření by se nikde neuplatnila' },

  { nazev: 'PROJ: projekce počítá DPH sazbou OCK', soubor: 'engine_proj.js',
    hledej: '  dph: 0.21,                         // zákonná sazba DPH projekční části (nezávislá na ceníku OCK)',
    nahrad: '  dph: 0.12,                         // zákonná sazba DPH projekční části (nezávislá na ceníku OCK)',
    proc: 'na projekční práce by se použila sazba ocelové konstrukce — obě sazby prohozené, doklad špatně' },
  /* ---------- S13 (16. 10. 2026): příznak ceníku „cena dle nabídky" (engine.js) ---------- */
  { nazev: 'S13: doplnění klíčů přidá starému ceníku příznaky', soubor: 'engine.js',
    hledej: "const CENIK_NEDOPLNOVAT = ['ukazkove', 'prazdny', 'dleNabidky'];",
    nahrad: "const CENIK_NEDOPLNOVAT = ['ukazkove', 'prazdny'];",
    proc: 'starý zveřejněný ceník by po importu tvrdil zaškrtnutí, které správce nikdy nezveřejnil' },
  { nazev: 'S13: prosklená stěna není ve výchozím ceníku zaškrtnutá', soubor: 'engine.js',
    hledej: "    'C.priplatky.naterOkopovychKc': true, 'C.priplatky.prosklenaStenaKc': true,",
    nahrad: "    'C.priplatky.naterOkopovychKc': true,",
    proc: 'položka z e-mailu D. S. by v novém ceníku zůstala hlídaná jako běžná cena' },

  /* ---------- #367 fáze 2 (19. 10. 2026): platební podmínky z Nastavení → Firma ---------- */
  { nazev: '#367: Firma se při čtení ignoruje (vždy továrna)', soubor: 'podminky.js',
    hledej: '      out[pole] = podmKopie(ok ? v : T[k][pole]);',
    nahrad: '      out[pole] = podmKopie(T[k][pole]);',
    proc: 'administrátor změní splatnost nebo záruku a krycí listy dál tisknou kód — přesně to, co J. V. odmítl' },
  { nazev: '#367: neplatná uložená hodnota se do krycího listu propustí', soubor: 'podminky.js',
    hledej: '      const ok = v !== undefined && pravidla[pole](v, sazby);',
    nahrad: '      const ok = v !== undefined;',
    proc: 'poškozená firma (splatnost „abc", záruka 999 měsíců) by šla rovnou do nabídky' },
  { nazev: '#367: součet splátek OCK ≠ 100 % zveřejnění neblokuje', soubor: 'podminky.js',
    hledej: '  if (s.blokuje) v.push(',
    nahrad: '  if (false) v.push(',
    proc: 'standard 50 / 45 / 10 by se rozeslal všem a nabídka by odporovala smlouvě' },
  { nazev: '#367: přepínač Q4 vypnutý (součet jen upozorní)', soubor: 'podminky.js',
    hledej: 'const PODMINKY_SOUCET_BLOKUJE = true;',
    nahrad: 'const PODMINKY_SOUCET_BLOKUJE = false;',
    proc: 'rozhodnutí J. V. k Q4 zatím zní „blokovat" — změna musí být vědomá' },
  { nazev: '#367: výchozí záloha mimo volby rozbalovátka', soubor: 'podminky.js',
    hledej: '  if (ef.ock.zalohyProc.indexOf(ef.ock.zalohaProc) < 0)',
    nahrad: '  if (false)',
    proc: 'krycí list by předvyplnil zálohu, kterou výběr nenabízí' },
  { nazev: '#367: pokuta mimo upravený číselník zůstane', soubor: 'podminky.js',
    hledej: "      if (/^pokuta(?!Limit)/.test(pole) && sazby.indexOf(out[pole]) < 0) out[pole] = sazby[0];",
    nahrad: "      if (false) out[pole] = sazby[0];",
    proc: 'krycí list by předvyplnil sazbu, kterou administrátor z číselníku vyřadil' },
  { nazev: '#367: splatnost OCK zase natvrdo z továrny', soubor: 'kryci.js',
    hledej: "      prefill: c => String(kryciPodmEf(c && c.firma).ock.splatnostDni), src: 'Nastavení → Firma' },",
    nahrad: "      prefill: c => String(KRYCI_PODM_TOVARNA.ock.splatnostDni), src: 'Nastavení → Firma' },",
    proc: 'změna firemní splatnosti by se do krycího listu OCK nepropsala' },
  { nazev: '#367: zamčená varianta dostane procento zádržného z nové Firmy', soubor: 'kryci.js',
    hledej: "      prefill: c => (c && c.zmrazeno) ? '' : String(kryciPodmEf(c && c.firma).ock.zadrzneVanProc), src: 'Nastavení → Firma' },",
    nahrad: "      prefill: c => String(kryciPodmEf(c && c.firma).ock.zadrzneVanProc), src: 'Nastavení → Firma' },",
    proc: 'odeslaná nabídka by po změně Firmy tiskla jiné zádržné, než s jakým odešla (P9.5)' },
  { nazev: '#367: splatnost PROJ zase natvrdo z továrny', soubor: 'kryci_proj.js',
    hledej: "      prefill: c => String(kryciProjPodmEf(c && c.firma).proj.splatnostDni), src: 'Nastavení → Firma' },",
    nahrad: "      prefill: c => String(kryciProjPodm().podminkyEf({}).proj.splatnostDni), src: 'Nastavení → Firma' },",
    proc: 'změna firemní splatnosti projekce by se do krycího listu PROJ nepropsala' },
  { nazev: '#367: limit pokut OCK ignoruje volbu Firmy', soubor: 'kryci.js',
    hledej: "      prefill: c => { const ef = kryciPodmEf(c && c.firma); return kryciPodm().podminkyLimitText(ef, ef.ock.pokutaLimit); },",
    nahrad: "      prefill: c => { const ef = kryciPodmEf(c && c.firma); return kryciPodm().podminkyLimitText(ef, 'uplatnen'); },",
    proc: 'firma s „NEUPLATNĚN limit" by v krycím listu měla uplatněný limit' },
  /* ---------- #367 fáze 2b (19. 10. 2026): věty, texty PROJ, rozšíření ---------- */
  { nazev: '#367b: vlastní cizí znění věty se ignoruje', soubor: 'podminky.js',
    hledej: '  if (z[L]) return podmDosad(z[L], L, poradi, proc);',
    nahrad: '',
    proc: 'administrátor přeloží větu a anglická nabídka dál tiskne překlad výchozí věty' },
  { nazev: '#367b: česká věta z Firmy se ignoruje', soubor: 'podminky.js',
    hledej: "  if (L === 'cz') return podmDosad(z.cz, 'cz', poradi, proc);",
    nahrad: "  if (L === 'cz') return podmDosad(PODMINKY_VYCHOZI.vety[klic].cz, 'cz', poradi, proc);",
    proc: 'změněná věta zálohy by se do nabídky nepropsala' },
  { nazev: '#367b: anglické pořadí dokladu „1." místo „1st"', soubor: 'podminky.js',
    hledej: "  if (jaz === 'en') { const d = k % 100;",
    nahrad: "  if (false) { const d = k % 100;",
    proc: 'anglická věta „Invoice 1.: …" — česká interpunkce v cizí nabídce' },
  { nazev: '#367b: bez cizího znění se tiskne čeština', soubor: 'podminky.js',
    hledej: "  return typeof P === 'function' ? P(cesky) : cesky;",
    nahrad: '  return cesky;',
    proc: 'česká věta v anglické nabídce — přesně to, co J. V. zakázal (Q3)' },
  { nazev: '#367b: cizí znění textů PROJ se ignoruje', soubor: 'podminky.js',
    hledej: "  if (L !== 'cz' && z[L]) return z[L].slice();",
    nahrad: '',
    proc: 'vlastní anglické „Cena nezahrnuje" by se do nabídky nedostalo' },
  /* ---------- W1 (19. 10. 2026): šablona PROJ v6, texty PROJ ve Wordu ---------- */
  { nazev: 'W1: Cena nezahrnuje se nerozvíjí po řádcích', soubor: 'docxgen.js',
    hledej: "const DOCX_RADKY_ZA_RADEK = ['PODM_PLATEBNI_KALENDAR', 'PROJ_CENA_NEZAHRNUJE', ",
    nahrad: "const DOCX_RADKY_ZA_RADEK = ['PODM_PLATEBNI_KALENDAR', ",
    proc: 'odrážky by ve Wordu skončily v jednom řádku tabulky' },
  { nazev: 'W1: řádek termínu jen s textem vpravo vypadne', soubor: 'docxgen.js',
    hledej: "filter(i => hodnoty.some(h => String(h[i] || '').trim() !== ''));",
    nahrad: "filter(i => hodnoty.every(h => String(h[i] || '').trim() !== ''));",
    proc: 'sloupce termínů by se rozjely nebo by termín chyběl' },
  { nazev: 'W1: dvojice termínů se rozvíjí jen podle prvního sloupce', soubor: 'docxgen.js',
    hledej: "klice.reduce((o, k, j) => { o[k] = hodnoty[j][i] || ''; return o; }, {})",
    nahrad: "{ [klice[0]]: hodnoty[0][i] || '' }",
    proc: 'vpravo by v každém řádku stály všechny termíny najednou' },
  { nazev: 'W1: činnosti termínů bez filtru nabízených', soubor: 'nabidka_proj.js',
    hledej: "    PROJ_TERMINY_CINNOST: textProj('terminy').filter(radekVRozsahu).map(x => x[0]).join('\\n'),",
    nahrad: "    PROJ_TERMINY_CINNOST: textProj('terminy').map(x => x[0]).join('\\n'),",
    proc: 'Word by vypsal nenabízené činnosti a posunul termíny o řádek' },
  { nazev: 'W1: termín = činnost', soubor: 'nabidka_proj.js',
    hledej: "    PROJ_TERMINY_TERMIN: textProj('terminy').filter(radekVRozsahu).map(x => x[1]).join('\\n'),",
    nahrad: "    PROJ_TERMINY_TERMIN: textProj('terminy').filter(radekVRozsahu).map(x => x[0]).join('\\n'),",
    proc: 'pravý sloupec termínů by opakoval činnost' },
  { nazev: 'W1: v6 nepozná šablonu, která už v6 je', soubor: '../nastroje/vyrob_sablony.js',
    hledej: "  if (sym.indexOf('PROJ_CENA_NEZAHRNUJE') >= 0 || sym.indexOf('PROJ_DOLOZKY') >= 0)",
    nahrad: '  if (false)',
    proc: 'druhý průchod by hlásil matoucí chybu nebo blok zdvojil' },
  { nazev: 'W1: dvě tabulky s nadpisem projdou', soubor: '../nastroje/vyrob_sablony.js',
    hledej: "    if (nalez.length !== 1) chyba('PROJ: čekám právě jednu tabulku s nadpisem",
    nahrad: "    if (!nalez.length) chyba('PROJ: čekám právě jednu tabulku s nadpisem",
    proc: 'upravená šablona by se přepsala na nečekaném místě' },
  { nazev: 'W1: poznámky pod termíny mimo blok', soubor: '../nastroje/vyrob_sablony.js',
    hledej: '        kon = top[j].kon; j++;',
    nahrad: '        j++;',
    proc: 'poznámky o termínech by zůstaly, i když blok termínů zmizí' },
  { nazev: 'W1: řádek se symbolem nese w14:paraId', soubor: '../nastroje/vyrob_sablony.js',
    hledej: '  return bezW14(radek.replace(/<w:tc[\\s>][\\s\\S]*?<\\/w:tc>/g, tc => {',
    nahrad: '  return (radek.replace(/<w:tc[\\s>][\\s\\S]*?<\\/w:tc>/g, tc => {',
    proc: 'aplikace řádek zopakuje — zdvojená id, Word hlásí poškozený soubor' },
  { nazev: 'W1: písmo z prázdného odstavce buňky', soubor: '../nastroje/vyrob_sablony.js',
    hledej: '    const vzor = odst.find(p => textPrvku(p)) || odst[0];',
    nahrad: '    const vzor = odst[0];',
    proc: 'termín by se tiskl bez písma šablony' },
  { nazev: 'W1: doložky před termíny', soubor: '../nastroje/vyrob_sablony.js',
    hledej: "  const konTerminu = body.indexOf(znacka('BLOK_TERMINY_KON')) + znacka('BLOK_TERMINY_KON').length;",
    nahrad: "  const konTerminu = body.indexOf(znacka('BLOK_TERMINY_ZAC'));",
    proc: 'doložky by stály uprostřed podmínek místo za termíny' },
  /* ---------- D1 (20. 10. 2026): úvod DPZ bez studie (postřeh D. Sikory) ---------- */
  { nazev: 'D1: úvod DPZ se neřídí studií', soubor: 'nabidka_proj.js',
    hledej: '      const uvod = (b.uvod || []).map(o => (o && o.sekce && !vRozsahu(o.sekce))',
    nahrad: '      const uvod = (b.uvod || []).map(o => (o && o.sekce && false)',
    proc: 'nabídka bez studie by dál psala, že DPZ navazuje na odsouhlasenou studii' },
  { nazev: 'D1: bez studie úvod DPZ zmizí celý', soubor: 'nabidka_proj.js',
    hledej: '        ? (o.jinak !== undefined ? { cz: o.jinak } : null) : o).filter(Boolean);',
    nahrad: '        ? null : o).filter(Boolean);',
    proc: 'oddíl DPZ by ztratil úvodní větu i výčet částí' },
  { nazev: 'D1: úvod DPZ podle projednání místo studie', soubor: 'nabidka_proj.js',
    hledej: "    { cz: NABIDKA_PROJ_DPZ_UVOD.studie + ' ' + NABIDKA_PROJ_DPZ_UVOD.zaver, sekce: 'studie',",
    nahrad: "    { cz: NABIDKA_PROJ_DPZ_UVOD.studie + ' ' + NABIDKA_PROJ_DPZ_UVOD.zaver, sekce: 'projednani',",
    proc: 'samotné projednání bez studie by navázalo DPZ na studii, kterou nenabízíme' },
  { nazev: 'D1: Word úvod DPZ vždy se studií', soubor: 'nabidka_proj.js',
    hledej: "    PROJ_DPZ_UVOD: P(vRozsahu('studie') ?",
    nahrad: '    PROJ_DPZ_UVOD: P(true ?',
    proc: 'Word nabídka bez studie by si větu o navázání nechala' },
  { nazev: 'D1: Word úvod DPZ nepřeložený', soubor: 'nabidka_proj.js',
    hledej: "    PROJ_DPZ_UVOD: P(vRozsahu('studie') ? NABIDKA_PROJ_DPZ_UVOD.studie : NABIDKA_PROJ_DPZ_UVOD.bez)",
    nahrad: "    PROJ_DPZ_UVOD: (vRozsahu('studie') ? NABIDKA_PROJ_DPZ_UVOD.studie : NABIDKA_PROJ_DPZ_UVOD.bez)",
    proc: 'anglická/německá/francouzská nabídka by měla úvod DPZ česky' },
  { nazev: 'D1: Word úvod DPZ bez výčtu částí', soubor: 'nabidka_proj.js',
    hledej: "      + ' ' + P(NABIDKA_PROJ_DPZ_UVOD.zaver),",
    nahrad: ',',
    proc: 've Wordu by chyběla věta „obsahuje tyto části:" před seznamem' },
  { nazev: 'D1: v7 nepozná šablonu, která už v7 je', soubor: '../nastroje/vyrob_sablony.js',
    hledej: "  if (sym.indexOf('PROJ_DPZ_UVOD') >= 0) chyba(",
    nahrad: '  if (false) chyba(',
    proc: 'druhý průchod by hlásil matoucí chybu „odstavec chybí"' },
  { nazev: 'D1: v7 bere i šablonu starší než v6', soubor: '../nastroje/vyrob_sablony.js',
    hledej: "  if (sym.indexOf('PROJ_DOLOZKY') < 0) chyba('PROJ: vstup není PROJ v6 (chybí",
    nahrad: "  if (false) chyba('PROJ: vstup není PROJ v6 (chybí",
    proc: 'v7 by vznikla bez textů z Firmy (přeskočená v6)' },
  { nazev: 'D1: v7 projde se dvěma odstavci úvodu DPZ', soubor: '../nastroje/vyrob_sablony.js',
    hledej: "  if (sp.length !== 1) chyba('PROJ: čekám právě jeden odstavec úvodu DPZ",
    nahrad: "  if (!sp.length) chyba('PROJ: čekám právě jeden odstavec úvodu DPZ",
    proc: 'upravená šablona by se přepsala na nečekaném místě' },
  { nazev: 'D1: v7 nahradí jen začátek odstavce', soubor: '../nastroje/vyrob_sablony.js',
    hledej: "prepisUsekOdstavce(p, 0, delkaTextu(p), '{{PROJ_DPZ_UVOD}}')",
    nahrad: "prepisUsekOdstavce(p, 0, 10, '{{PROJ_DPZ_UVOD}}')",
    proc: 'za dosazenou větou by zůstal zbytek staré věty o studii' },
  { nazev: 'D1: kontrola úvodu DPZ hlásí i s nabízenou studií', soubor: 'kontroly.js',
    hledej: "      if (!nabizena('dpz') || nabizena('studie')) return null;",
    nahrad: "      if (!nabizena('dpz')) return null;",
    proc: 'obchodník by dostal falešné varování u každé nabídky se studií' },
  { nazev: 'D1: kontrola úvodu DPZ hlásí i bez DPZ', soubor: 'kontroly.js',
    hledej: "      if (!nabizena('dpz') || nabizena('studie')) return null;",
    nahrad: "      if (nabizena('studie')) return null;",
    proc: 'varování o větě DPZ u nabídky, která DPZ vůbec nemá' },
  { nazev: 'D1: kontrola úvodu DPZ nepozná šablonu v7', soubor: 'kontroly.js',
    hledej: "      if (s.symboly.indexOf('PROJ_DPZ_UVOD') >= 0) return null;",
    nahrad: '',
    proc: 'varování by zůstalo i po nahrání opravené šablony' },
  { nazev: "D1 Q1: hvězdička ceny DPZ i bez studie", soubor: "nabidka_proj.js",
    hledej: "hvezdicka: b.hvezdicka && (!b.hvezdickaJenSe || vRozsahu(b.hvezdickaJenSe)) ?",
    nahrad: "hvezdicka: b.hvezdicka ?",
    proc: "nabídka bez studie by psala, že cena DPZ platí jen s návazností na studii" },
  { nazev: "D1 Q1: hvězdička se v definici neváže na studii", soubor: "nabidka_proj.js",
    hledej: "STUDII PROVEDITELNOSTI.', hvezdickaJenSe: 'studie' },",
    nahrad: "STUDII PROVEDITELNOSTI.' },",
    proc: "hvězdička by se vrátila do nabídek bez studie" },
  { nazev: "D1 Q2: podmíněný termín se tiskne vždy", soubor: "nabidka_proj.js",
    hledej: "(m[2] === '+' ? !!cenaSekce(m[3]) : !cenaSekce(m[3]))",
    nahrad: "true",
    proc: "v termínech by stály oba hrubopisy DPZ pod sebou" },
  { nazev: "D1 Q2: „bez studie\" = se studií", soubor: "nabidka_proj.js",
    hledej: ": !cenaSekce(m[3]))",
    nahrad: ": !!cenaSekce(m[3]))",
    proc: "nabídka bez studie by termín DPZ ztratila úplně" },
  { nazev: "D1 Q2: klíč „dpz-studie\" se nepozná", soubor: "nabidka_proj.js",
    hledej: "/^([a-z]+)([+-])([a-z]+)$/",
    nahrad: "/^([a-z]+)([+])([a-z]+)$/",
    proc: "termín DPZ bez studie by se nevytiskl nikdy" },
  { nazev: "D1 Q2: Firma odmítne podmíněné klíče termínů", soubor: "podminky.js",
    hledej: " || PODMINKY_PROJ_SEKCE_PODMINENE.indexOf(r[2]) >= 0",
    nahrad: "",
    proc: "uložené termíny se studií / bez studie by se tiše vrátily na továrnu" },
  { nazev: "D1 Q1: Word hvězdička u nadpisu vždy", soubor: "nabidka_proj.js",
    hledej: "PROJ_DPZ_HVEZDICKA_ZNACKA: vRozsahu('studie') ? '*' : '',",
    nahrad: "PROJ_DPZ_HVEZDICKA_ZNACKA: '*',",
    proc: "ve Wordu by u ceny DPZ visela hvězdička bez poznámky" },
  { nazev: "D1 Q1: Word poznámka hvězdičky vždy", soubor: "nabidka_proj.js",
    hledej: "    PROJ_DPZ_HVEZDICKA: vRozsahu('studie') ?",
    nahrad: "    PROJ_DPZ_HVEZDICKA: true ?",
    proc: "Word bez studie by tiskl „Cena je platná v případě návaznosti na STUDII\"" },
  { nazev: "D1 Q3: titul STUDIE vždy", soubor: "nabidka_proj.js",
    hledej: "PROJ_TITUL_STUDIE: nabiziStudii ?",
    nahrad: "PROJ_TITUL_STUDIE: true ?",
    proc: "titul nabídky by sliboval studii, kterou nenabízíme" },
  { nazev: "D1 Q3: titul studie s dvojtečkou ze slovníku", soubor: "nabidka_proj.js",
    hledej: ".replace(/\\s*:\\s*$/, '') : '',",
    nahrad: " : '',",
    proc: "cizojazyčný titul by končil dvojtečkou" },
  { nazev: "D1 Q3: titul činností vždy „Navazující\"", soubor: "nabidka_proj.js",
    hledej: "P(nabiziStudii ? 'Navazující",
    nahrad: "P(true ? 'Navazující",
    proc: "bez studie by titul mluvil o navazujících činnostech" },
  { nazev: "D1 Q3: poznámka o studii ve Wordu zůstane", soubor: "nabidka_proj.js",
    hledej: "  if (!vRozsahu('studie')) blokyPryc.push('BLOK_STUDIE_POZN');",
    nahrad: "",
    proc: "Word bez studie by tiskl „V případě, že se investor rozhodne pro STUDII\"" },
  { nazev: "D1 Q3: rozsah a cena studie ve Wordu zůstanou", soubor: "nabidka_proj.js",
    hledej: "  if (!nabiziStudii) blokyPryc.push(",
    nahrad: "  if (false) blokyPryc.push(",
    proc: "Word bez studie by tiskl celý blok studie s „není součástí\"" },
  { nazev: "D1 Q3: studie se neřídí projednáním", soubor: "nabidka_proj.js",
    hledej: "const nabiziStudii = vRozsahu('studie') || vRozsahu('projednani');",
    nahrad: "const nabiziStudii = vRozsahu('studie');",
    proc: "nabídka jen na projednání by ve Wordu ztratila rozsah, který online ukazuje" },
  { nazev: "D1 Q3: smlouva PROJ dědí bloky nabídky", soubor: "sod.js",
    hledej: "  d.blokyPryc = [];\n  const L = d.jazyk || 'cz';",
    nahrad: "  const L = d.jazyk || 'cz';",
    proc: "smlouva o dílo PROJ v4 by bez studie nevznikla (chybí blok)" },
  { nazev: "D1 Q3: v7 snese titul třikrát", soubor: "../nastroje/vyrob_sablony.js",
    hledej: "  if (sp.length < 1 || sp.length > 2 ||",
    nahrad: "  if (sp.length < 1 ||",
    proc: "symbol by se vložil i do nečekaného odstavce" },
  { nazev: "D1 Q1: v7 nehlídá nadpis ceny DPZ", soubor: "../nastroje/vyrob_sablony.js",
    hledej: "    if (h.length !== 1) chyba('PROJ: čekám právě jeden nadpis „CENA ZA DOKUMENTACI",
    nahrad: "    if (false) chyba('PROJ: čekám právě jeden nadpis „CENA ZA DOKUMENTACI",
    proc: "šablona bez hvězdičky by spadla nesrozumitelnou chybou nebo se upravila jinde" },
  { nazev: "D1 Q3: v7 nehlídá „TATO SKUTEČNOST\"", soubor: "../nastroje/vyrob_sablony.js",
    hledej: "    if (!t2[j] || t2[j].tag !== 'p' || !/^TATO SKUTEČNOST JE ZOHLEDNĚNA/.test(txt(t2[j])))",
    nahrad: "    if (!t2[j])",
    proc: "blok poznámky by spolkl tabulku DPZ" },
  { nazev: "D1 Q3: v7 nehlídá tabulku cen SP", soubor: "../nastroje/vyrob_sablony.js",
    hledej: "    if (!t2[j] || t2[j].tag !== 'tbl' || body.slice(t2[j].zac, t2[j].kon).indexOf('PROJ_CENA_SP1') < 0)",
    nahrad: "    if (!t2[j])",
    proc: "blok ceny studie by obalil cizí tabulku" },
  { nazev: "D1 Q3: blok poznámky jen první odstavec", soubor: "../nastroje/vyrob_sablony.js",
    hledej: "obal('BLOK_STUDIE_POZN', t2[i].zac, t2[j].kon);",
    nahrad: "obal('BLOK_STUDIE_POZN', t2[i].zac, t2[i].kon);",
    proc: "„TATO SKUTEČNOST JE ZOHLEDNĚNA…\" by zůstala bez studie" },
  { nazev: "D1 Q3: blok ceny SP jen nadpis", soubor: "../nastroje/vyrob_sablony.js",
    hledej: "obal('BLOK_STUDIE_CENA', t2[i].zac, t2[j].kon);",
    nahrad: "obal('BLOK_STUDIE_CENA', t2[i].zac, t2[i].kon);",
    proc: "tabulka cen studie by zůstala bez nadpisu" },
  { nazev: 'D1 #442: specifikace píše „šířka“ místo „šířka skla“', soubor: 'techspec.js',
    hledej: "v.sirkaRucne != null ? ', šířka skla ' + Math.round(v.sirkaRucne * 1000) + ' mm' : '');",
    nahrad: "v.sirkaRucne != null ? ', šířka ' + Math.round(v.sirkaRucne * 1000) + ' mm' : '');",
    proc: 'zákazník by šířku tabule skla přes sloupky četl jako světlo vedle dveří (postřeh D. Sikory)' },
  { nazev: 'D1 Q2: znění termínu bez studie jiné než rozhodl J. V.', soubor: 'podminky.js',
    hledej: "const PODMINKY_TERMIN_DPZ_BEZ_STUDIE = 'do 12 týdnů od zpracování výstupů ze zaměření';",
    nahrad: "const PODMINKY_TERMIN_DPZ_BEZ_STUDIE = 'do 10–12 týdnů od schválení studie investorem a objednání';",
    proc: 'nabídka bez studie by dál psala o schválení studie' },
  /* ---------- D2 (20. 10. 2026): šablona PROJ D. Sikory — cestovné, úvod, jednostupňová ---------- */
  { nazev: 'D2: výjezd i u vyřazené sekce', soubor: 'engine_proj.js',
    hledej: "    if (kde.indexOf(s.key) < 0 || !(s.naklad > 0)) return;",
    nahrad: "    if (kde.indexOf(s.key) < 0) return;",
    proc: "vyřazená činnost by se vrátila do nabídky jen kvůli cestě" },
  { nazev: 'D2: výjezd se nepřičte k ceně', soubor: 'engine_proj.js',
    hledej: "    s.celkem = s.cenaSDopravou + vyjezd;",
    nahrad: "    s.celkem = s.cenaSDopravou;",
    proc: "nabídka by slibovala výjezd v ceně, která ho neobsahuje" },
  { nazev: 'D2: studie dostane výjezd i se zaměřením', soubor: 'engine_proj.js',
    hledej: "  return (zam && zam.naklad > 0) ? VYJEZD_SEKCE.filter(k => k !== 'studie') : VYJEZD_SEKCE.slice();",
    nahrad: "  return VYJEZD_SEKCE.slice();",
    proc: "zákazník by platil tutéž cestu dvakrát" },
  { nazev: 'D2: přepis ceny výjezdu se ignoruje', soubor: 'engine_proj.js',
    hledej: "  const v = _prepisPlati(zadani.vyjezdKcPrepis) ? +zadani.vyjezdKcPrepis :",
    nahrad: "  const v = false ? +zadani.vyjezdKcPrepis :",
    proc: "sjednaná cena výjezdu by neplatila" },
  { nazev: 'D2: výjezd i v Praze', soubor: 'engine_proj.js',
    hledej: "  if (!zadani || !zadani.akceMimoPrahu) return 0;",
    nahrad: "  if (!zadani) return 0;",
    proc: "pražská zakázka by zdražila o cestu" },
  { nazev: 'D2: DPZ bez dovětku o dalších cestách', soubor: 'nabidka_proj.js',
    hledej: "  dpz: { symbol: 'DPZ', vety: ['zahrnuje', 'dalsi'], prictene: true },",
    nahrad: "  dpz: { symbol: 'DPZ', vety: ['zahrnuje'], prictene: true },",
    proc: "chyběla by věta, že další cesty se fakturují" },
  { nazev: 'D2: věta IČ jen s přičteným výjezdem', soubor: 'nabidka_proj.js',
    hledej: "  ic: { symbol: 'IC', vety: ['ic'] },",
    nahrad: "  ic: { symbol: 'IC', vety: ['ic'], prictene: true },",
    proc: "u IČ by chyběla cena výjezdu" },
  { nazev: 'D2: věta i u nenabízené činnosti', soubor: 'nabidka_proj.js',
    hledej: "    else if (!cenaSekce(k)) return [];",
    nahrad: "    else if (false) return [];",
    proc: "nabídka by mluvila o cestě k činnosti, která v ní není" },
  { nazev: 'D2: věta AD i bez autorského dozoru', soubor: 'nabidka_proj.js',
    hledej: "    if (k === 'ad') { if (!nabidkaProjNabiziAD(varianta)) return []; }",
    nahrad: "    if (k === 'ad') { }",
    proc: "Word by tiskl cestovné AD, který se nenabízí" },
  { nazev: 'D2: ruční úvod se ignoruje', soubor: 'nabidka_proj.js',
    hledej: "  const uvodRucne = L === 'cz' ? nabidkaProjUvodRucne(pj.zadani) : '';",
    nahrad: "  const uvodRucne = '';",
    proc: "úprava obchodníka by se nevytiskla" },
  { nazev: 'D2: ruční český úvod i v cizí nabídce', soubor: 'nabidka_proj.js',
    hledej: "  const uvodRucne = L === 'cz' ? nabidkaProjUvodRucne(pj.zadani) : '';",
    nahrad: "  const uvodRucne = nabidkaProjUvodRucne(pj.zadani);",
    proc: "anglická nabídka by měla český úvod" },
  { nazev: 'D2: nesedící ruční úvod mlčí', soubor: 'nabidka_proj.js',
    hledej: "  return typeof z === 'string' && z.trim() !== String(vychoziCz || '').trim();",
    nahrad: "  return false;",
    proc: "po změně činností by nikdo nevěděl, že úvod nesedí" },
  { nazev: 'D2: jednostupňová dokumentace mlčí', soubor: 'kontroly.js',
    hledej: "      if (!ctx.projZadani || !ctx.projZadani.jednostupnova) return null;",
    nahrad: "      if (true) return null;",
    proc: "nabídka by odešla bez ruční úpravy DPZ+DPS" },
  { nazev: 'D2: přepis 0 hlásí chybějící cenu', soubor: 'kontroly.js',
    hledej: "      if (prepis) return null;",
    nahrad: "",
    proc: "vědomé „cestu neúčtujeme\" by se hlásilo jako chyba" },
  { nazev: 'D2: šablona v8 se hlásí jako bez cestovného', soubor: 'kontroly.js',
    hledej: "      if (s.symboly.some(k => /^PROJ_CESTOVNE_/.test(k))) return null;",
    nahrad: "      if (false) return null;",
    proc: "falešné varování i se správnou šablonou" },
  { nazev: 'D2: v8 podruhé projde', soubor: '../nastroje/vyrob_sablony.js',
    hledej: "  if (sym.some(k => /^PROJ_CESTOVNE_/.test(k))) chyba(",
    nahrad: "  if (false) chyba(",
    proc: "bloky cestovného by se zdvojily" },
  { nazev: 'D2: v8 přijme cenu ve dvou tabulkách', soubor: '../nastroje/vyrob_sablony.js',
    hledej: "    if (kde.length !== 1) chyba('PROJ: symbol {{'",
    nahrad: "    if (!kde.length) chyba('PROJ: symbol {{'",
    proc: "věta by se vložila na nečekané místo" },
  { nazev: 'D2: v8 bez bloku ZAC/KON', soubor: '../nastroje/vyrob_sablony.js',
    hledej: "    body = body.slice(0, v.kon) + znacka('BLOK_CESTOVNE_' + v.x + '_ZAC') + odstavecCestovne(v.x)",
    nahrad: "    body = body.slice(0, v.kon) + odstavecCestovne(v.x)",
    proc: "v Praze by ve Wordu zůstal prázdný odstavec" },
  { nazev: '#367b: věta zálohy bez {PROC} projde', soubor: 'podminky.js',
    hledej: '  return (podmMa(PODMINKY_VETY_TOKENY, klic) ? PODMINKY_VETY_TOKENY[klic] : []).every(t => v.indexOf(t) >= 0);',
    nahrad: '  return true;',
    proc: 'věta bez procenta by vytiskla zálohu bez částky' },
  { nazev: '#367b: „z celkové ceny díla" ve smlouvě natvrdo', soubor: 'kryci.js',
    hledej: "    return milnik + ' ' + sp.proc + ' ' + V('sodZCeny');",
    nahrad: "    return milnik + ' ' + sp.proc + ' ' + KRYCI_SOD_Z_CENY;",
    proc: 'změna znění ve Firmě by se do smlouvy o dílo nepropsala' },
  { nazev: '#367b: licence PD zase natvrdo', soubor: 'kryci_proj.js',
    hledej: "      prefill: c => kryciProjPodmEf(c && c.firma).proj.licence, src: 'Nastavení → Firma' },",
    nahrad: "      prefill: () => 'nevýhradní, pro účel stavby dle smlouvy', src: 'Nastavení → Firma' },",
    proc: 'firemní licence by se do krycího listu PROJ nepropsala' },
  /* ---------- O3 / TD1 (19. 10. 2026, v19.10.3): kontrola terminAtyp se značkou {TERMIN} ----------
   * Registrace M1 (19. 10. 2026): dávka O3 ověřila mutace ručně a nezapsala je. */
  { nazev: 'O3: terminAtyp zase jen u atypické zakázky', soubor: 'kontroly.js',
    hledej: "      if (ctx.jenProj || !z || !ctx.nast || !ctx.nast.firma) return null;",
    nahrad: "      if (ctx.jenProj || !z || !z.atyp || !ctx.nast || !ctx.nast.firma) return null;",
    proc: 'běžná zakázka bez termínu by v kapitole V. tiskla „dle dohody" a kontrola by mlčela' },
  { nazev: 'O3: terminAtyp nerozezná text se značkou {TERMIN}', soubor: 'kontroly.js',
    hledej: "      if (kapV && kapV.termin) {",
    nahrad: "      if (false) {",
    proc: 'u textu se značkou by kontrola radila nahradit číslo, které v textu není' },
  { nazev: 'O3: terminAtyp se značkou mlčí i bez termínu zakázky', soubor: 'kontroly.js',
    hledej: "        if (termin) return null;",
    nahrad: "        return null;",
    proc: 'nabídka by uvedla „dle dohody" / lhůtu bez ATYP bez jediného upozornění' },
  { nazev: 'O3: terminAtyp nehlásí „dle dohody" bez standardní lhůty', soubor: 'kontroly.js',
    hledej: "        if (!hodn('terminDodaniOck'))\n          return { text: 'Nabídka uvede v kapitole V. místo",
    nahrad: "        if (false)\n          return { text: 'Nabídka uvede v kapitole V. místo",
    proc: 'kapitola V. by zákazníkovi slíbila „dle dohody" a nikdo by to neviděl' },
  { nazev: 'O3: terminAtyp hlásí smazaný termín i u běžné zakázky', soubor: 'kontroly.js',
    hledej: "        if (!z.atyp) return null;\n        return { text: 'Zakázka je atypická, ale termín dodání v krycím listu je smazaný",
    nahrad: "        return { text: 'Zakázka je atypická, ale termín dodání v krycím listu je smazaný",
    proc: 'běžná zakázka se standardní lhůtou by dostala falešné varování o ATYP' },
  { nazev: 'O3: terminAtyp radí starý postup (vypustit číslo)', soubor: 'kontroly.js',
    hledej: "Nahraďte číslo v textu kapitoly V. značkou {TERMIN} ",
    nahrad: "Vypusťte číslo z textu kapitoly V. ",
    proc: 'administrátor by číslo smazal a kapitola V. by termín neuvedla vůbec' },
  { nazev: 'O3: terminAtyp nehledá kolizi v textu kapitoly V.', soubor: 'kontroly.js',
    hledej: "      const kap = kapV ? kapV.radky.join('\\n') : '';",
    nahrad: "      const kap = '';",
    proc: 'starý text „cca 12 týdnů" u ATYP s 16 týdny by v nabídce nesl dva termíny bez varování' },  /* O5 (20. 10. 2026): nálezy auditu K3 — K3-N3/N10/N11 (docxgen), K3-N6/N7/N9 (podmínky), K3-N16, K3-N17. */
  { nazev: "O5: K3-N3 chybějící blok ze seznamu pryč projde", soubor: "docxgen.js",
    hledej: "  if (chybi) throw new Error(docxBlokChybiText(chybi));",
    nahrad: "  void chybi;",
    proc: "smlouva ze šablony bez značek CIN_* by vyjmenovala nenabízenou činnost" },
  { nazev: "O5: K3-N3 šablona jen se symbolem rozsahu se nekontroluje", soubor: "docxgen.js",
    hledej: "  if (!klice.some(k => k === 'SODP_ROZSAH_DILA' || /^CIN_[A-Z0-9_]+_(?:ZAC|KON)$/.test(k))) return null;",
    nahrad: "  if (!klice.some(k => /^CIN_[A-Z0-9_]+_(?:ZAC|KON)$/.test(k))) return null;",
    proc: "v4, ze které zmizely všechny značky, by prošla" },
  { nazev: "O5: K3-N3 kontrola bloků i u šablony v3", soubor: "docxgen.js",
    hledej: "  if (!klice.some(k => k === 'SODP_ROZSAH_DILA' || /^CIN_[A-Z0-9_]+_(?:ZAC|KON)$/.test(k))) return null;",
    nahrad: "  if (false) return null;",
    proc: "stará šablona v3 (bez značek) by přestala tisknout" },
  { nazev: "O5: K3-N10 značka bloku z entity &#123; se rozpozná", soubor: "docxgen.js",
    hledej: "    if (DOCX_ZAVORKA_ENTITOU_RE.test(odst)) return null;",
    nahrad: "    void 0;",
    proc: "text obchodníka ve tvaru {{X_KON}} by rozpároval kapitolu" },
  { nazev: "O5: K3-N11 vyváženost bez kontroly zbytku zásobníku", soubor: "docxgen.js",
    hledej: "  return zas.length === 0;",
    nahrad: "  return true;",
    proc: "blok přes buňky by se odstranil a buňky sloučil" },
  { nazev: "O5: K3-N11 prázdný odstavec se počítá jako otevřený", soubor: "docxgen.js",
    hledej: "    if (!m[1] && /\\/$/.test(m[3])) continue;                     // <w:p/>, <w:p …/>",
    nahrad: "",
    proc: "blok s prázdným odstavcem by nešel odstranit (falešná chyba)" },
  { nazev: "O5: K3-N6 neznámé pole podmínek přes prototyp", soubor: "podminky.js",
    hledej: "      if (!podmMa(pravidla, pole)) { v.push(jm + ': neznámé pole „' + pole + '\"'); return; }",
    nahrad: "      if (!pravidla[pole]) { v.push(jm + ': neznámé pole „' + pole + '\"'); return; }",
    proc: "__proto__ v podmínkách by shodil /api/firma (HTTP 500)" },
  { nazev: "O5: K3-N6 neznámý blok textů PROJ přes prototyp", soubor: "podminky.js",
    hledej: "      if (!podmMa(PODMINKY_VYCHOZI.nabidkaProj, k)) {",
    nahrad: "      if (!PODMINKY_VYCHOZI.nabidkaProj[k]) {",
    proc: "blok __proto__ / constructor by prošel kontrolou jako známý" },
  { nazev: "O5: K3-N7 volby zálohy bez převodu na čísla", soubor: "podminky.js",
    hledej: "  ef.ock.zalohyProc = ef.ock.zalohyProc.map(podmCislo);",
    nahrad: "  void 0;",
    proc: "volba „NaN % – po podpisu smlouvy\" v krycím listu" },
  { nazev: "O5: K3-N7 čistá kopie ukládá procenta textem", soubor: "podminky.js",
    hledej: "      PODMINKY_OCK_PROC.forEach(pole => { if (podmProcPlatne(c[pole])) c[pole] = podmCislo(c[pole]); });",
    nahrad: "      void 0;",
    proc: "na server by šlo „12,5\" a krycí listy by počítaly s NaN" },
  { nazev: "O5: K3-N9 konec řádku v položce textů PROJ projde", soubor: "podminky.js",
    hledej: " && !/[\\r\\n]/.test(x);",
    nahrad: ";",
    proc: "činnosti a termíny PROJ by se ve Wordu rozjely" },
  { nazev: "O5: K3-N17 nekonečný rozměr můstku projde", soubor: "engine.js",
    hledej: "  const mustekRozmer = v => (Number.isFinite(+v) && +v > 0 ? +v / 1000 : 0);",
    nahrad: "  const mustekRozmer = v => (+v > 0 ? +v / 1000 : 0);",
    proc: "nekonečná plocha střechy a cena nabídky" },
  { nazev: "O5: K3-N16 doložky PROJ dosazují název firmy řetězcem", soubor: "nabidka_proj.js",
    hledej: "String(x).replace(/\\{FIRMA\\}/g, () => nazevFirmy || '{FIRMA}')",
    nahrad: "String(x).replace(/\\{FIRMA\\}/g, nazevFirmy || '{FIRMA}')",
    proc: "„$&\" v názvu firmy by do doložky vložil okolní text" },
  /* O7 (20. 10. 2026): rozhodnutí J. V. k auditu K3 — K3-N2 (zmrazení vět
   * a textů PROJ při prvním zamčení), K3-N18 (strop podmínek), K3-N17
   * (upozornění na rozměr můstku). */
  { nazev: "O7: K3-N2 zmrazení vět OCK se nezapíše", soubor: "kryci.js",
    hledej: "  d.kryci.zmrazenoPodminky = kryciPodm().podminkySnimek(c.firma, ['vety']);",
    nahrad: "",
    proc: "dotisk odeslané nabídky by nesl nové věty z Firmy" },
  { nazev: "O7: K3-N2 tisk OCK nečte snímek", soubor: "kryci.js",
    hledej: "  return snimek ? kryciPodm().podminkyEfZmrazene(f, snimek) : kryciPodm().podminkyEf(f);",
    nahrad: "  return kryciPodm().podminkyEf(f);",
    proc: "odeslaná nabídka i SoD by po změně Firmy tiskly jiné věty" },
  { nazev: "O7: K3-N2 snímek platí i pro nezamčenou variantu", soubor: "kryci.js",
    hledej: "  const snimek = varianta && varianta.zamek && varianta.zamek.zamceno && d && d.kryci && d.kryci.zmrazenoPodminky;",
    nahrad: "  const snimek = d && d.kryci && d.kryci.zmrazenoPodminky;",
    proc: "klon odeslané varianty by nepřevzal nové věty Firmy" },
  { nazev: "O7: K3-N2 kalendář nabídky OCK ignoruje snímek", soubor: "kryci.js",
    hledej: "  const ef = kal.podmEf || kryciPodmEf(), V",
    nahrad: "  const ef = kryciPodmEf(), V",
    proc: "věty kalendáře v dotisku z aktuální Firmy" },
  { nazev: "O7: K3-N2 splátky SoD ignorují snímek", soubor: "kryci.js",
    hledej: "  const ef = kryciPodmEfVarianty(varianta), V = klic =>",
    nahrad: "  const ef = kryciPodmEf(), V = klic =>",
    proc: "smlouva z odeslané nabídky by nesla nové díly vět" },
  { nazev: "O7: K3-N2 zmrazení textů PROJ se nezapíše", soubor: "kryci_proj.js",
    hledej: "  d.kryciProj.zmrazenoPodminky = kryciProjPodm().podminkySnimek(c.firma, ['nabidkaProj']);",
    nahrad: "",
    proc: "dotisk nabídky PROJ by nesl nové texty a doložky" },
  { nazev: "O7: K3-N2 nabídka PROJ nečte snímek", soubor: "nabidka_proj.js",
    hledej: "  return snimek ? P.podminkyEfZmrazene(f, snimek) : P.podminkyEf(f);",
    nahrad: "  return P.podminkyEf(f);",
    proc: "zapnuté doložky by se objevily v odeslané nabídce" },
  { nazev: "O7: K3-N2 nabídka PROJ bez varianty", soubor: "nabidka_proj.js",
    hledej: "  const podmEf = nabidkaProjPodmEf(varianta);",
    nahrad: "  const podmEf = nabidkaProjPodmEf();",
    proc: "texty odeslané nabídky PROJ z aktuální Firmy" },
  { nazev: "O7: K3-N2 snímek se nepoužije", soubor: "podminky.js",
    hledej: "    if (snimek[k] && typeof snimek[k] === 'object' && !Array.isArray(snimek[k])) ef[k] = z[k];",
    nahrad: "    void 0;",
    proc: "zmrazené znění by se nikdy netisklo" },
  { nazev: "O7: K3-N2 snímek je syrová Firma místo efektivního znění", soubor: "podminky.js",
    hledej: "    if (PODMINKY_ZMRAZ_CASTI.indexOf(k) >= 0) out[k] = podmKopie(ef[k]);",
    nahrad: "    if (PODMINKY_ZMRAZ_CASTI.indexOf(k) >= 0) out[k] = podmKopie((firma && firma.podminky && firma.podminky[k]) || {});",
    proc: "nabídka odeslaná za továrny by po úpravě Firmy převzala nové znění" },
  { nazev: "O7: K3-N18 strop velikosti podmínek vypnutý", soubor: "podminky.js",
    hledej: "  if (velikost > PODMINKY_MAX_B)",
    nahrad: "  if (false)",
    proc: "megabajtové podmínky by šly do každé zálohy a načtení aplikace" },
  { nazev: "O7: K3-N18 strop o bajt posunutý", soubor: "podminky.js",
    hledej: "  if (velikost > PODMINKY_MAX_B)",
    nahrad: "  if (velikost >= PODMINKY_MAX_B)",
    proc: "přesně 500 kB by neprošlo" },
  { nazev: "O7: K3-N18 velikost ve znacích místo bajtů", soubor: "podminky.js",
    hledej: "  return (typeof TextEncoder !== 'undefined') ? new TextEncoder().encode(t).length : unescape(encodeURIComponent(t)).length;",
    nahrad: "  return t.length;",
    proc: "česká diakritika by strop obešla (až dvojnásobek)" },
  { nazev: "O7: K3-N17 velký rozměr můstku bez upozornění", soubor: "kontroly.js",
    hledej: "        else if (c > KONTROLY_MUSTEK_MAX_MM) potize.push(",
    nahrad: "        else if (false) potize.push(",
    proc: "překlep 13 000 mm by prošel bez povšimnutí" },
  { nazev: "O7: K3-N17 hranice 6000 mm upozorní", soubor: "kontroly.js",
    hledej: "        else if (c > KONTROLY_MUSTEK_MAX_MM) potize.push(",
    nahrad: "        else if (c >= KONTROLY_MUSTEK_MAX_MM) potize.push(",
    proc: "běžný rozměr 6000 mm by hlásil falešné varování" },
  { nazev: "O7: K3-N17 nečíselný rozměr bez upozornění", soubor: "kontroly.js",
    hledej: "        if (!Number.isFinite(c) || c < 0) potize.push(",
    nahrad: "        if (false) potize.push(",
    proc: "obchodník by nevěděl, že se rozměr bere jako prázdný" },
];

/* ============================================================
 * BĚH
 * ============================================================ */

/* Otisk souboru — porovnáním před a po se ověří, že jsme pracovní kopii
 * nepoškodili. Nestačí „snažili jsme se vrátit"; musí to jít doložit. */
const otisk = txt => createHash('sha256').update(txt, 'utf8').digest('hex');

const ZALOHA = new Map();     // soubor -> původní obsah
const CASY = new Map();       // soubor -> původní časy (atime, mtime)
for (const j of JADRA) {
  ZALOHA.set(j, readFileSync(resolve(SRC, j), 'utf8'));
  const st = statSync(resolve(SRC, j));
  CASY.set(j, [st.atime, st.mtime]);
}
const OTISKY_PRED = new Map([...ZALOHA].map(([j, t]) => [j, otisk(t)]));

/* Zápis obsahu + vrácení původního času úpravy. V repozitáři může souběžně
 * pracovat někdo jiný a jeho nástroje (sledování změn, sestavení, editor)
 * se řídí časem úpravy, ne obsahem. Vrácený soubor má proto vypadat úplně
 * netknutě — jinak by mutační běh cizí práci zbytečně rozhýbal. */
function zapisPuvodni(j) {
  const cesta = resolve(SRC, j);
  writeFileSync(cesta, ZALOHA.get(j), 'utf8');
  const [at, mt] = CASY.get(j);
  try { utimesSync(cesta, at, mt); } catch (e) { /* čas je jen kosmetika, obsah sedí */ }
}

let obnovaHotova = false;
function obnovVse() {
  /* Vrátí obě jádra do původního stavu. Volá se v `finally` po každé mutaci
   * i při přerušení běhu; opakované volání nevadí. */
  for (const j of ZALOHA.keys()) {
    try { zapisPuvodni(j); } catch (e) { /* nic lepšího už neuděláme */ }
  }
}
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => { obnovVse(); obnovaHotova = true; process.exit(130); });
}
process.on('uncaughtException', e => {
  obnovVse(); obnovaHotova = true;
  console.error('PŘERUŠENO chybou skriptu (jádra vrácena zpátky):', e && e.message);
  process.exit(1);
});

const KOD_PRESKOCENO = 3;

/* Spustí jednu sadu. Vrací:
 *   { stav: 'ok' }            … prošlo
 *   { stav: 'preskoceno' }    … kód 3, sada potřebuje skutečný ceník
 *   { stav: 'spadlo', kod }   … cokoli jiného než 0 a 3 (i pád bez výstupu) */
function spustSadu(sada) {
  try {
    execFileSync('node', [sada], {
      cwd: SRC, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000,
    });
    return { stav: 'ok' };
  } catch (e) {
    const kod = (e && typeof e.status === 'number') ? e.status : -1;
    if (kod === KOD_PRESKOCENO) return { stav: 'preskoceno' };
    return { stav: 'spadlo', kod };
  }
}

/* Projde sady a zastaví se na první, která spadne — u rozbité mutace nemá
 * smysl dopočítávat zbytek. Přeskočené sady (kód 3) se ignorují: nic
 * neověřily, takže z nich nesmí být ani „chycená", ani „prošlo". */
function spustSady(sady) {
  for (const s of sady) {
    const v = spustSadu(s);
    if (v.stav === 'spadlo') return { chycena: true, kde: s + (v.kod === -1 ? ' (spadla)' : ' (kód ' + v.kod + ')') };
  }
  return { chycena: false };
}

if (JEN_KONTROLA) {
  const spatne = [];
  for (const m of MUTACE) {
    let txt = null;
    try { txt = readFileSync(resolve(SRC, m.soubor), 'utf8'); } catch (e) { /* ohlásí se níž */ }
    const n = txt == null ? -1 : txt.split(m.hledej).length - 1;
    if (!JADRA.includes(m.soubor) || n !== 1)
      spatne.push(m.nazev + ' — src/' + m.soubor + (n === -1 ? ' neexistuje' : ': úsek nalezen ' + n + '×'));
  }
  if (spatne.length) {
    console.log('Zadání mutací jádra NESEDÍ na kód (' + spatne.length + ' z ' + MUTACE.length + '):');
    spatne.forEach(x => console.log(' - ' + x));
    process.exit(1);
  }
  console.log('Zadání mutací jádra je v pořádku: všech ' + MUTACE.length + ' úseků se v kódu našlo právě jednou.');
  process.exit(0);
}

const vsechnySady = najdiSady();

console.log('MUTAČNÍ TESTOVÁNÍ VÝPOČETNÍHO JÁDRA');
console.log('Jádra: ' + JADRA.map(j => 'src/' + j).join(', '));
console.log('Sad, které se jádra dotýkají: ' + vsechnySady.length);

/* Nejdřív se zjistí, které sady se přeskakují (chybí skutečný ceník) a jestli
 * je zbytek zelený. Kdyby testy padaly už bez mutace, byla by každá „chycená"
 * mutace jen ozvěnou toho původního selhání. */
const preskocene = [];
const zelene = [];
const rozbite = [];
for (const s of vsechnySady) {
  const v = spustSadu(s);
  if (v.stav === 'preskoceno') preskocene.push(s);
  else if (v.stav === 'spadlo') rozbite.push(s);
  else zelene.push(s);
}

if (preskocene.length) {
  console.log('\nPŘESKOČENÉ SADY (kód 3 – chybí skutečný ceník, není to chycená mutace):');
  for (const s of preskocene) console.log('  – src/' + s);
  console.log('  Bez nich se neověřuje shoda s excelovou předlohou; mutace, které');
  console.log('  opravují napodobené chyby Excelu, tím pádem nemá co chytit.');
}
if (rozbite.length) {
  console.log('\nPŘERUŠENO: tyhle sady padají už BEZ mutace, měření by nic neznamenalo:');
  for (const s of rozbite) console.log('  ✗ src/' + s);
  process.exit(1);
}
console.log('\nVýchozí stav: ' + zelene.length + ' sad zelených'
  + (preskocene.length ? ', ' + preskocene.length + ' přeskočeno' : '') + '.');

const vybrane = MUTACE.filter(m => !filtr
  || m.nazev.toLowerCase().includes(filtr) || m.soubor.toLowerCase().includes(filtr));
console.log('Mutací k ověření: ' + vybrane.length + (filtr ? ' (filtr: „' + filtr + '")' : '') + '\n');
if (filtr && !vybrane.length) {
  /* Překlep ve filtru by jinak vypadal jako čistý běh bez jediného nálezu. */
  console.log('Filtr „' + filtr + '" neodpovídá žádné mutaci — nic se neověřilo.');
  process.exit(1);
}

let chycene = 0;
const nechycene = [];
const chybne = [];

for (const m of vybrane) {
  const cesta = resolve(SRC, m.soubor);
  const puvodni = ZALOHA.get(m.soubor);
  if (puvodni == null) {
    chybne.push(m.nazev + ' — soubor ' + m.soubor + ' není mezi jádry');
    console.log('CHYBA ZADÁNÍ  ' + m.nazev + ' (neznámý soubor ' + m.soubor + ')');
    continue;
  }
  const pocet = puvodni.split(m.hledej).length - 1;
  if (pocet !== 1) {
    chybne.push(m.nazev + ' — hledaný úsek v src/' + m.soubor + ' nalezen ' + pocet + '×');
    console.log('CHYBA ZADÁNÍ  ' + m.nazev + ' (úsek nalezen ' + pocet + '×)');
    continue;
  }
  try {
    writeFileSync(cesta, puvodni.replace(m.hledej, m.nahrad), 'utf8');
    const v = spustSady(zelene);
    if (v.chycena) { chycene++; console.log('chycená      ' + m.nazev + '   → ' + v.kde); }
    else { nechycene.push(m); console.log('NECHYCENÁ    ' + m.nazev + '   → ' + m.proc); }
  } finally {
    zapisPuvodni(m.soubor);                      // vrátit vždy, i při pádu
  }
}

/* ---------- návrat do původního stavu a jeho doložení ---------- */
if (!obnovaHotova) obnovVse();
const poskozene = [];
for (const j of JADRA) {
  const ted = otisk(readFileSync(resolve(SRC, j), 'utf8'));
  if (ted !== OTISKY_PRED.get(j)) poskozene.push(j);
}

console.log('\n============================================================');
console.log('Chycených ' + chycene + ' z ' + (chycene + nechycene.length)
  + (chybne.length ? '   (chybně zadaných mutací: ' + chybne.length + ')' : ''));

if (nechycene.length) {
  console.log('\nNECHYCENÉ MUTACE — tohle by dnes testy nezachytily:');
  for (const m of nechycene) console.log(' - ' + m.nazev + ' (src/' + m.soubor + ')\n     ' + m.proc);
}
if (chybne.length) {
  console.log('\nCHYBNĚ ZADANÉ MUTACE (kód jádra se změnil, mutace míří do prázdna):');
  for (const c of chybne) console.log(' - ' + c);
}
if (preskocene.length) {
  console.log('\nPŘESKOČENÉ SADY (neběžely, nic neověřily): ' + preskocene.map(s => 'src/' + s).join(', '));
}

if (poskozene.length) {
  console.log('\nPOZOR: tyhle soubory se nepodařilo vrátit do původního stavu: '
    + poskozene.map(j => 'src/' + j).join(', '));
  console.log('Obnovte je z gitu, než budete pokračovat.');
  process.exit(2);
}
console.log('\nOtisky obou jader po doběhnutí souhlasí s otisky před během – pracovní kopie je beze změny.');

process.exitCode = (nechycene.length || chybne.length) ? 1 : 0;
