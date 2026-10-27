/* SEC-M, čočka „regrese“ (bod 11b): VLASTNÍ MUTACE BEZPEČNOSTNÍCH STRÁŽCŮ,
 * které v netlify/mutace.mjs ani mutace_jadro.mjs nejsou (ověřeno porovnáním
 * `hledej` všech 919 serverových a 528 jaderných mutací s řádky strážců).
 *
 * Každá mutace = jedna záměna v kódu; pak se pustí sady a čeká se, že aspoň
 * jedna spadne (chycená). Přeživší = strážce, kterého žádný test nehlídá.
 *
 * MĚNÍ ZDROJÁKY NA MÍSTĚ → pouští se VÝHRADNĚ nad kopií stromu:
 *   node podklady/SECM_pokusy/regrese/vlastni_mutace.mjs --strom <kopie> [filtr]
 * (kopie = `git archive efa61c1 | tar -x` + `git init && git add -A && git commit`).
 * Nad stromem, ve kterém skript sám leží, odmítne běžet. Soubor se vrací
 * v `finally` i při SIGINT/SIGTERM; po přerušení `git -C <kopie> status`.
 * Žádná síť, jen úložiště v paměti ze sad, ADMIN_EMAIL=spravce@priklad.cz. */
import { readFileSync, writeFileSync, realpathSync, readdirSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TADY = dirname(fileURLToPath(import.meta.url));
const MUJ_KOREN = realpathSync(resolve(TADY, '../../..'));
const argv = process.argv.slice(2);
const iS = argv.indexOf('--strom');
if (iS < 0 || !argv[iS + 1]) { console.log('Chybí --strom <kopie stromu>. VÝSLEDEK: NESPUŠTĚNO'); process.exit(2); }
const KOREN = realpathSync(argv[iS + 1]);
if (KOREN === MUJ_KOREN) { console.log('Odmítnuto: mutace se nad pracovní kopií repa nepouštějí. VÝSLEDEK: NESPUŠTĚNO'); process.exit(2); }
const filtr = (argv.filter((a, i) => !a.startsWith('--') && i !== iS + 1)[0] || '').toLowerCase();
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';

/* typ 'server' = serverové sady (netlify/test_*.mjs bez testů mutačních nástrojů)
 *               + src sady, které mutace.mjs pouští také;
 * typ 'klient' = všechny src/test_*.js. */
const M = [
  // ---- účty (functions/uzivatele.mjs) ----
  { id: 'R-M1', typ: 'server', soubor: 'netlify/functions/uzivatele.mjs', nazev: 'cizí profil smí měnit i obchodník',
    hledej: "if (cil !== relace.email && relace.role !== 'Administrátor')", nahrad: 'if (false)' },
  { id: 'R-M2', typ: 'server', soubor: 'netlify/functions/uzivatele.mjs', nazev: 'cizí profil bez kontroly nastavení hlavního účtu',
    hledej: 'if (cil !== relace.email) { const stop = bezHlavnihoUctu(); if (stop) return stop; }', nahrad: '' },
  { id: 'R-M3', typ: 'server', soubor: 'netlify/functions/uzivatele.mjs', nazev: 'správce si sníží vlastní roli (B15)',
    hledej: "if (email === relace.email && t.role !== 'Administrátor')", nahrad: 'if (false)' },
  { id: 'R-M4', typ: 'server', soubor: 'netlify/functions/uzivatele.mjs', nazev: 'povýšení na Administrátora bez hesla správce (B77)',
    hledej: "if (t.role === 'Administrátor' && ucet.role !== 'Administrátor') {", nahrad: 'if (false) {' },
  { id: 'R-M5', typ: 'server', soubor: 'netlify/functions/uzivatele.mjs', nazev: 'hlavní účet jde archivovat',
    hledej: 'if (email === ADMIN_EMAIL && t.archiv)', nahrad: 'if (false)' },
  { id: 'R-M6', typ: 'server', soubor: 'netlify/functions/uzivatele.mjs', nazev: 'správce smaže sám sebe',
    hledej: "      if (email === relace.email)\n        return json({ ok: false, chyba: 'Sám sebe smazat",
    nahrad: "      if (false)\n        return json({ ok: false, chyba: 'Sám sebe smazat" },
  { id: 'R-M7', typ: 'server', soubor: 'netlify/functions/uzivatele.mjs', nazev: 'změna vlastního hesla bez zpoždění brzdy',
    hledej: '      await pockej(zpozdeniMs(pokusy.email.n));\n', nahrad: '\n' },
  // ---- přihlášení a potvrzení heslem ----
  { id: 'R-M8', typ: 'server', soubor: 'netlify/functions/prihlaseni.mjs', nazev: 'přihlášení bez zpoždění brzdy',
    hledej: 'await pockej(zpozdeniMs(pokusy.email.n));', nahrad: '' },
  { id: 'R-M9', typ: 'server', soubor: 'netlify/lib/sdilene.mjs', nazev: 'heslo správce bez zpoždění brzdy',
    hledej: 'await pockej(zpozdeniMs(pokusy.email.n));', nahrad: '' },
  { id: 'R-M10', typ: 'server', soubor: 'netlify/lib/sdilene.mjs', nazev: 'odpovědi API bez nosniff (SEC-I1)',
    hledej: "'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });", nahrad: "'Cache-Control': 'no-store' });" },
  { id: 'R-M11', typ: 'server', soubor: 'netlify/lib/sdilene.mjs', nazev: 'Origin/Host podle X-Forwarded-Host z požadavku (bez Host)',
    hledej: "return String(req.headers.get('x-forwarded-host') || req.headers.get('host') || '').toLowerCase();",
    nahrad: "return String(req.headers.get('x-forwarded-host') || '').toLowerCase();" },
  { id: 'R-M12', typ: 'server', soubor: 'netlify/functions/odhlaseni.mjs', nazev: 'odhlášení přijme Origin null (B78)',
    hledej: "if (cizihoPuvodu(req) || origin === 'null'", nahrad: 'if (cizihoPuvodu(req)' },
  // ---- role na jednotlivých endpointech ----
  { id: 'R-M13', typ: 'server', soubor: 'netlify/functions/obnova.mjs', nazev: 'obnovu spustí kdokoli přihlášený',
    hledej: "  if (req.method !== 'POST') return json({ ok: false, chyba: 'Použijte POST.' }, 405);\n  const { chyba, relace } = await vyzadujRoli(req, 'Administrátor');",
    nahrad: "  if (req.method !== 'POST') return json({ ok: false, chyba: 'Použijte POST.' }, 405);\n  const { chyba, relace } = await vyzadujRoli(req);" },
  { id: 'R-M14', typ: 'server', soubor: 'netlify/functions/analytika.mjs', nazev: 'souhrn analytiky vidí kdokoli přihlášený',
    hledej: "    const { chyba } = await vyzadujRoli(req, 'Administrátor');", nahrad: '    const { chyba } = await vyzadujRoli(req);' },
  { id: 'R-M15', typ: 'server', soubor: 'netlify/functions/analytika.mjs', nazev: 'režim sběru analytiky přepne kdokoli',
    hledej: "  if (t.akce === 'rezim') {\n    const { chyba, relace } = await vyzadujRoli(req, 'Administrátor');",
    nahrad: "  if (t.akce === 'rezim') {\n    const { chyba, relace } = await vyzadujRoli(req);" },
  { id: 'R-M16', typ: 'server', soubor: 'netlify/functions/zakaznici.mjs', nazev: 'kartu zákazníka smaže kdokoli přihlášený',
    hledej: "const { chyba: ch } = await vyzadujRoli(req, 'Administrátor');", nahrad: 'const { chyba: ch } = await vyzadujRoli(req);' },
  { id: 'R-M17', typ: 'server', soubor: 'netlify/functions/zobrazeni.mjs', nazev: 'matici zobrazení uloží kdokoli přihlášený',
    hledej: "vyzadujRoli(req, 'Administrátor')", nahrad: 'vyzadujRoli(req)' },
  { id: 'R-M18', typ: 'server', soubor: 'netlify/functions/zaloha_vynuceno.mjs', nazev: 'přehled/vynucený otisk záloh pro kohokoli (varianta role)',
    hledej: "vyzadujRoli(req, 'Administrátor')", nahrad: 'vyzadujRoli(req)' },
  { id: 'R-M19', typ: 'server', soubor: 'netlify/functions/pd_pole.mjs', nazev: 'obnovu mapy polí Pipedrive spustí kdokoli',
    hledej: "if (obnovit && relace.role !== 'Administrátor')", nahrad: 'if (false)' },
  { id: 'R-M20', typ: 'server', soubor: 'netlify/functions/zakazky.mjs', nazev: 'matice zobrazení se při uložení neuplatní ani obchodníkovi (B112 na serveru)',
    hledej: "const zobr = relace.role === 'Administrátor' ? null : await sProg.cti('zobrazeni');", nahrad: 'const zobr = null;' },
  // ---- obnova ----
  { id: 'R-M21', typ: 'server', soubor: 'netlify/functions/obnova.mjs', nazev: 'token obnovy jiného správce se přijme',
    hledej: 'if (!z || z.kdo !== relace.email)', nahrad: 'if (!z)' },
  { id: 'R-M22', typ: 'server', soubor: 'netlify/functions/obnova.mjs', nazev: 'dávka obnovy po převzetí jiným správcem pokračuje',
    hledej: 'if (!stale || stale.kdo !== relace.email) {', nahrad: 'if (!stale) {' },
  { id: 'R-M23', typ: 'server', soubor: 'netlify/functions/obnova.mjs', nazev: 'obnova účtů z otisku bez hesla správce',
    hledej: "const hesloUctu = zdrojPopis.typ === 'otisk' && casti.includes('uzivatele') && maVlastni(zaloha, 'uzivatele');",
    nahrad: 'const hesloUctu = false;' },
  { id: 'R-M24', typ: 'server', soubor: 'netlify/functions/obnova.mjs', nazev: 'obnova nechá hlavní účet vypnutý',
    hledej: 'if (email === ADMIN_EMAIL) novy.aktivni = true;', nahrad: '' },
  // ---- klient: escapování ----
  { id: 'R-K1', typ: 'klient', soubor: 'src/ui/common.js', nazev: 'esc() → identita',
    hledej: "const esc = s => String(s ?? '')\n  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')\n  .replace(/\"/g, '&quot;').replace(/'/g, '&#39;');",
    nahrad: "const esc = s => String(s ?? '');" },
  { id: 'R-K2', typ: 'klient', soubor: 'src/ui/common.js', nazev: 'esc() bez apostrofu',
    hledej: ".replace(/\"/g, '&quot;').replace(/'/g, '&#39;');", nahrad: ".replace(/\"/g, '&quot;');" },
  { id: 'R-K3', typ: 'klient', soubor: 'src/ui/common.js', nazev: 'esc() bez uvozovek',
    hledej: ".replace(/\"/g, '&quot;').replace(/'/g, '&#39;');", nahrad: ".replace(/'/g, '&#39;');" },
  { id: 'R-K4', typ: 'klient', soubor: 'src/ui/common.js', nazev: 'escJs() neescapuje apostrof',
    hledej: "const escJs = s => esc(String(s ?? '').replace(/\\\\/g, '\\\\\\\\').replace(/'/g, \"\\\\'\")",
    nahrad: "const escJs = s => esc(String(s ?? '').replace(/\\\\/g, '\\\\\\\\')" },
  { id: 'R-K5', typ: 'klient', soubor: 'src/docxgen.js', nazev: 'xmlEsc() bez &lt;',
    hledej: ".replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')\n    .replace(/\"/g, '&quot;')",
    nahrad: ".replace(/&/g, '&amp;').replace(/>/g, '&gt;')\n    .replace(/\"/g, '&quot;')" },
];

const NESERVER = new Set(['test_mutace.mjs', 'test_mutace_cast.mjs', 'test_mutace_zamek.mjs']);
const sadyServer = readdirSync(join(KOREN, 'netlify')).filter(f => /^test_.*\.mjs$/.test(f) && !NESERVER.has(f)).sort()
  .map(f => 'netlify/' + f);
const sadyKlient = readdirSync(join(KOREN, 'src')).filter(f => /^test_.*\.js$/.test(f)).sort().map(f => 'src/' + f);
/* Serverové mutace: nejdřív serverové sady, pak src (některé src sady čtou netlify/lib). */
const SADY = { server: [...sadyServer, ...sadyKlient], klient: sadyKlient };

let aktivni = null, dite = null;
const vrat = () => { if (aktivni) { writeFileSync(aktivni.cesta, aktivni.puvodni, 'utf8'); aktivni = null; } };
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { vrat(); try { dite && dite.kill('SIGKILL'); } catch (e) {} console.log('PŘERUŠENO, soubor vrácen'); process.exit(130); });
process.on('exit', vrat);

function spust(sada) {
  return new Promise(ok => {
    dite = execFile('node', [join(KOREN, sada)], { cwd: dirname(join(KOREN, sada)), encoding: 'utf8', timeout: 180000,
      maxBuffer: 64 * 1024 * 1024, env: { ...process.env } }, (chyba, out) => { dite = null; ok({ chyba, out: String(out || '') }); });
  });
}
async function sady(typ) {
  for (const s of SADY[typ]) {
    const { chyba, out } = await spust(s);
    const m = /(\d+) (?:prošlo|OK), (\d+) (?:selhalo|FAIL)/.exec(out);
    if (m && +m[2] > 0) return { padla: s + ': ' + m[2] + ' selhalo' };
    if (chyba && chyba.code !== 3) return { padla: s + ' (kód ' + (chyba.code ?? chyba.signal) + ')' };
  }
  return { padla: null };
}

const vyber = M.filter(m => !filtr || (m.id + ' ' + m.nazev + ' ' + m.soubor).toLowerCase().includes(filtr));
console.log('Vlastní mutace bezpečnostních strážců — strom ' + KOREN + ', mutací ' + vyber.length);
const t0 = Date.now();
for (const typ of new Set(vyber.map(m => m.typ))) {
  const v = await sady(typ);
  if (v.padla) { console.log('VÝCHOZÍ STAV NENÍ ZELENÝ (' + typ + '): ' + v.padla + '\nVÝSLEDEK: NESPUŠTĚNO'); process.exit(1); }
}
console.log('Výchozí stav zelený (' + Math.round((Date.now() - t0) / 1000) + ' s).');
const vysl = [];
for (const m of vyber) {
  const cesta = join(KOREN, m.soubor);
  const puvodni = readFileSync(cesta, 'utf8');
  const n = puvodni.split(m.hledej).length - 1;
  if (n !== 1) { console.log(m.id + '  CHYBA ZADÁNÍ (úsek ' + n + '×)  ' + m.nazev); vysl.push({ ...m, stav: 'CHYBA' }); continue; }
  const t = Date.now();
  try {
    aktivni = { cesta, puvodni };
    writeFileSync(cesta, puvodni.replace(m.hledej, m.nahrad), 'utf8');
    const v = await sady(m.typ);
    const s = Math.round((Date.now() - t) / 1000);
    if (v.padla) { console.log(m.id + '  chycená     ' + m.nazev + '  → ' + v.padla + '  (' + s + ' s)'); vysl.push({ ...m, stav: 'chycená' }); }
    else { console.log(m.id + '  NECHYCENÁ   ' + m.nazev + '  (' + s + ' s)'); vysl.push({ ...m, stav: 'NECHYCENÁ' }); }
  } finally { vrat(); }
}
const ne = vysl.filter(v => v.stav === 'NECHYCENÁ'), ch = vysl.filter(v => v.stav === 'CHYBA');
console.log('\nChycených ' + vysl.filter(v => v.stav === 'chycená').length + ' z ' + (vysl.length - ch.length)
  + (ch.length ? ', chybně zadaných ' + ch.length : '') + ', čas ' + Math.round((Date.now() - t0) / 60000) + ' min');
console.log('VÝSLEDEK: ' + (ne.length ? 'NECHYCENÉ ' + ne.map(v => v.id).join(', ') : 'všechny vlastní mutace chycené'));
process.exitCode = ne.length || ch.length ? 1 : 0;
