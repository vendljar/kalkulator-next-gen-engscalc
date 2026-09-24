/* Kontrola hotové příručky obchodníka (…_kalkulator_v*_MANUAL_OBCHODNIK.html)
 *
 * PŘEPSÁNO 24. 9. 2026 (dávka E2, nález N17). Do té doby harness hlídal
 * příručku ze srpna: 25 zapečených PNG, „Obrázek N." v textu a obsah psaný
 * ručně do HTML. Od 17. 9. 2026 se příručka skládá jinak (manual/sestav.sh):
 * snímky jsou živý DOM ve shadow rootu a kapitoly vykresluje šablona z
 * manual/obsah.json. Stará kontrola tak nad každou novou příručkou hlásila
 * 13 selhání, i když byla v pořádku — a varování, které svítí pořád, nikdo
 * nečte.
 *
 * Kontroly nad vykreslenou stránkou už existují v manual/overit.js (psaný
 * tak, aby šel vložit do konzole prohlížeče i bez Node). Tenhle harness ho
 * pouští v Chromiu, takže se obě cesty nemohou rozejít, a přidává to, co
 * se dá ověřit jen proti repozitáři: verzi proti verze.txt a témata, která
 * v příručce musí být kvůli posledním změnám aplikace.
 *
 * Spuštění:  KNG_PODKLADY=<složka s příručkou> node overit_manual.mjs
 */
import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';

import { najdiSlozku, preskoc } from './nastroje/harness_podklady.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

/* Složka s hotovými výstupy. Hledá se i v `KNG_PODKLADY` (N15, 22. 9. 2026);
 * bez ní se harness přeskočí — v CI příručka není a být nemá (nese snímky
 * kalkulace a do repozitáře se neukládá). */
const KAM = najdiSlozku(['/home/claude/work/deliver']);
if (!KAM) preskoc('složka s příručkou obchodníka',
  ['/home/claude/work/deliver', '$KNG_PODKLADY']);
/* Verze se řadí čísly, ne abecedou: textově je „v5.8.9“ větší než „v5.8.15“. */
const cislaVerze = (f) => (f.match(/v(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
const soubor = readdirSync(KAM)
  .filter((f) => /^MANUAL_OBCHODNIK_v.*\.html$/.test(f)
    || /^\d{4}-\d{2}-\d{2}_kalkulator_v.*_MANUAL_OBCHODNIK\.html$/.test(f))
  /* Nejdřív podle DATA v názvu, teprve pak podle čísla verze: verze je
   * DEN.MĚSÍC.pořadí, takže „v1.9.1" je číselně menší než „v31.8.5". */
  .sort((a, b) => {
    const d = (f) => (f.match(/^(\d{4}-\d{2}-\d{2})/) || ['', ''])[1];
    if (d(a) !== d(b)) return d(a) < d(b) ? -1 : 1;
    const x = cislaVerze(a), y = cislaVerze(b);
    for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
    return 0;
  }).pop();
if (!soubor) preskoc('příručka obchodníka (…_MANUAL_OBCHODNIK.html)', [KAM]);
const html = readFileSync(KAM + '/' + soubor, 'utf8');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : info); }
};

/* ---------- 1) statické kontroly nad souborem ---------- */

/* Verze se hlídá proti verze.txt, ne proti napsanému číslu (20. 8. 2026):
 * pevné číslo v testu znamenalo, že zastaralá příručka procházela zeleně
 * ještě dva týdny po vydání nové aplikace. */
const verzeApp = readFileSync(new URL('./verze.txt', import.meta.url), 'utf8').trim();
test('příručka nese AKTUÁLNÍ verzi aplikace (v' + verzeApp + ')',
  html.includes('v' + verzeApp), verzeApp);
test('příručka je nového tvaru (šablona manual/, ne zapečené PNG)',
  /window\.PRIRUCKA\s*=/.test(html) && !/src="data:image\/png;base64,/.test(html));
test('soubor je jednosouborový (žádný odkaz mimo data: a kotvy)',
  !/(?:src|href)="(?!data:|#)[^"]+"/.test(html.replace(/href="https?:[^"]*"/g, '')),
  (html.match(/(?:src|href)="(?!data:|#)[^"]+"/g) || []).slice(0, 3).join(' '));
test('žádné skutečné ceníkové soubory v textu', !/cenik_skutecny|_soukrome/.test(html));
test('žádná hesla v textu', !/ObchodniHeslo1|Zkusebni\.Heslo|TAJEMSTVI_RELACE/.test(html));

/* ---------- 2) vykreslená příručka ---------- */

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}).listen(0);
const port = server.address().port;

const prohlizec = await chromium.launch();
const stranka = await prohlizec.newPage();
const chyby = [];
stranka.on('pageerror', (e) => chyby.push(String(e)));
stranka.on('console', (m) => { if (m.type() === 'error') chyby.push(m.text()); });
await stranka.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'load' });
await stranka.waitForTimeout(300);

/* Kontroly vykreslení z manual/overit.js — tentýž kód, který se vkládá do
 * konzole prohlížeče. Vrací { proslo, selhalo, radky }. */
const vysl = await stranka.evaluate(readFileSync(new URL('./manual/overit.js', import.meta.url), 'utf8'));
if (!vysl || !Array.isArray(vysl.radky)) {
  test('manual/overit.js doběhl', false, String(vysl));
} else {
  for (const r of vysl.radky) test('[vykreslení] ' + r.replace(/^(OK|CHYBA)\s+/, ''), /^OK /.test(r));
}
test('žádná chyba JavaScriptu', chyby.length === 0, chyby.slice(0, 2).join(' | '));

/* ---------- 3) témata, která v příručce být MUSÍ ----------
 * Každé stojí na změně, kterou obchodník uvidí hned první den. Text se čte
 * i ze snímků (shadow DOM), stejně jako v manual/overit.js. */
const text = await stranka.evaluate(() => document.body.innerText + [...document.querySelectorAll('.snimek-plocha')]
  .map(h => h.shadowRoot ? [...h.shadowRoot.children].map(u => u.tagName === 'STYLE' ? '' : (u.textContent || '')).join(' ') : '')
  .join('\n'));
test('kapitola o červené liště je uvnitř', /Vidím červenou lištu/.test(text));
test('příručka popisuje obnovu rozpracované kalkulace',
  /Rozpracovanou kalkulaci neztratíte|Obnovit rozpracovanou kalkulaci/.test(text));
test('příručka popisuje skryté a srolované sekce', /srolovat|srolovan/i.test(text));
test('příručka popisuje databázi zákazníků', /Zákazníci/.test(text));
test('příručka popisuje slevu a její schválení', /Sleva a její schválení/.test(text));
test('příručka popisuje Můj profil a blok Vypracoval', /Můj profil/.test(text) && /Vypracoval/.test(text));
/* Od 24. 9. 2026 (E1): Model 1 zmrazený, termín dodání v kapitole V. */
test('příručka říká, že Model 1 je zmrazený a počítá se Modelem 2',
  /Model 1/.test(text) && /zmrazen/i.test(text) && /Model 2/.test(text));
test('příručka popisuje termín dodání v nabídce vč. prodloužení za ATYP',
  /Termín dodání/.test(text) && /ATYP/.test(text) && /V\. TERMÍNY REALIZACE|kapitol\w* V\./.test(text));

const vyska = await stranka.evaluate(() => document.body.scrollHeight);
test('stránka není prázdná', vyska > 3000, vyska);

await prohlizec.close();
server.close();

console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo  (' + soubor + ')');
process.exit(fail ? 1 : 0);
