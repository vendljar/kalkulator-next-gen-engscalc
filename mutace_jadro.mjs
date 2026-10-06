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
const JADRA = ['engine.js', 'engine_proj.js', 'zaokrouhleni.js', 'marze.js', 'sablony_online.js', 'kontroly.js', 'plan_plateb.js'];
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
    hledej: '    .map(k => PROFILY_NAZVY[k] + \': \' + pr[k].dim + \' / \' + pr[k].tl + \' mm\');',
    nahrad: '    .map(k => PROFILY_NAZVY[k] + \': \' + pr[k].dim + \' / \' + pr[k].tl + \' mm\').slice(0, 0);',
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
    hledej: "      const vysoky = spatne.indexOf('zdvih') < 0 && zdvih > KONTROLY_ZDVIH_MAX_M;",
    nahrad: '      const vysoky = false;',
    proc: 'zdvih 1 000 000 000 m by zase dal nabídku za biliony korun bez jediného varování' },
  { nazev: 'K17-N91: zdvih přesně 99 m se zastaví', soubor: 'kontroly.js',
    hledej: "      const vysoky = spatne.indexOf('zdvih') < 0 && zdvih > KONTROLY_ZDVIH_MAX_M;",
    nahrad: "      const vysoky = spatne.indexOf('zdvih') < 0 && zdvih >= KONTROLY_ZDVIH_MAX_M;",
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
