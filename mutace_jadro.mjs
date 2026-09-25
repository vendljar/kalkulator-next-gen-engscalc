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
const JADRA = ['engine.js', 'engine_proj.js', 'zaokrouhleni.js', 'marze.js', 'sablony_online.js'];
/* Filtr = první argument, který není přepínač (stejně jako netlify/mutace.mjs). */
const filtr = (process.argv.slice(2).find(a => !a.startsWith('--')) || '').toLowerCase();
/* --kontrola (23. 9. 2026, nález N19): jen ověří, že každý hledaný úsek je
 * v jádře právě jednou — bez spouštění sad, za zlomek vteřiny. Pouští ji CI
 * i spust_testy.sh, aby mutace nemířily do prázdna, když se jádro změní. */
const JEN_KONTROLA = process.argv.includes('--kontrola');

/* Sady, které se pouštějí nejdřív. Nejsou lepší než ostatní — jen nejrychleji
 * chytají chyby v jádře, a protože se běh zastaví na první červené sadě,
 * ušetří to u rozbité mutace většinu času. */
const PRIORITA = [
  'test.js', 'test_proj.js', 'test_zaokrouhleni.js', 'test_atyp.js',
  'test_sleva.js', 'test_marze.js', 'test_kontroly.js', 'test_porovnani.js',
  'test_prepisy.js', 'test_atyp_katalog.js', 'test_ukazkove.js',
];

/* Které sady vůbec pouštět: všechny, které si berou některé z obou jader.
 * Seznam se skládá sám z obsahu složky, aby nová sada nezůstala roky nespuštěná
 * jen proto, že ji sem nikdo nedopsal (přesně na tohle doplácel starý glob
 * `test_*.js`, který míjel `test.js` — viz komentář ve spust_testy.sh). */
function najdiSady() {
  const vse = readdirSync(SRC).filter(f => /^test.*\.js$/.test(f));
  const dotykaSeJadra = f => {
    const t = readFileSync(resolve(SRC, f), 'utf8');
    return JADRA.some(j => t.includes(j));
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
  { nazev: 'N58: materiál opláštění se nepočítá jako sklo stěny', soubor: 'engine.js',
    hledej: "const VYPLN_SKLENA = v => v === 'sklo' || v === 'material';",
    nahrad: "const VYPLN_SKLENA = v => v === 'sklo';",
    proc: 'volba „materiál opláštění" by nechala pole nad dveřmi neocenené' },
  { nazev: 'N58: plechové nadpraží bez hmotnosti plechu', soubor: 'engine.js',
    hledej: "    mkItem('PLECHY - OPLECH. DVEŘÍ A PODEST (MATERIÁL)', oplDvereKg + podestKg + vyplnPlechKg,",
    nahrad: "    mkItem('PLECHY - OPLECH. DVEŘÍ A PODEST (MATERIÁL)', oplDvereKg + podestKg,",
    proc: 'plech nad dveřmi by se neocenil — stejná díra jako N58' },
  { nazev: 'N58: plechové nadpraží bez práce', soubor: 'engine.js',
    hledej: "nastupist * (3 + nadPlech + bokyPlech)",
    nahrad: "nastupist * 3",
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
    hledej: "    svetlik: ((svetlik || nadPlech) - 1) * nastupist * 0.2,",
    nahrad: "    svetlik: (svetlik - 1) * nastupist * 0.2,",
    proc: 'plech nad dveřmi by se montoval zadarmo a ještě by ubral hodiny' },
  { nazev: 'N58b: plechové boky zůstanou i ve skle', soubor: 'engine.js',
    hledej: "  const svetlikBokKs = bokySklo * kratkePricniky;",
    nahrad: "  const svetlikBokKs = kratkePricniky;",
    proc: 'boční pole z plechu by se zaplatilo dvakrát — jako sklo i jako plech' },

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
    hledej: "    ext ? mkPrip('skn', 'Sklo SKN 176 (Ug=1,1) (EXT)', sknM2, pp.sknM2, { cenaPath: 'C.priplatky.sknM2' }) : null,",
    nahrad: '    null,',
    proc: 'nejčastěji poptávaný příplatek exteriérové šachty by z nabídky tiše zmizel' },

  /* N50 a N52 (hloubkový test 24. 9. 2026) */
  { nazev: 'N50: po stěnách se VSG počítá ze standardního zasklení', soubor: 'engine.js',
    hledej: "    ? oplPasy.reduce((a, p) => a + (OPL_SKLA.indexOf(p.typ) >= 0 ? p.m2 : 0), 0) : skloCelkemM2;",
    nahrad: "    ? skloCelkemM2 : skloCelkemM2;",
    proc: 'fólie VSG by se účtovala i za stěny z Cetrisu nebo dodané stavbou' },
  { nazev: 'N50: SKN po stěnách i z jiného skla než dvojskla', soubor: 'engine.js',
    hledej: "    ? oplPasy.reduce((a, p) => a + (p.typ === 'C.skloBokyKc' ? p.m2 : 0), 0) : skloBokyZadniM2;",
    nahrad: "    ? oplPasy.reduce((a, p) => a + (OPL_SKLA.indexOf(p.typ) >= 0 ? p.m2 : 0), 0) : skloBokyZadniM2;",
    proc: 'SKN (náhrada dvojskla) by se účtovalo i za čelní VSG 4.4.1' },
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
