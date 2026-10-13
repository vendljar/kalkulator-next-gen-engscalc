/* Test nástroje nastroje/release_odkaz.py (pravidlo J. V. 13. 10. 2026:
 * každý odkaz na nový release nese i popis změn z CHANGELOG).
 *
 * Ověřuje na umělém CHANGELOG: odkaz má tag, cíl, titulek a URL-kódovaný
 * `body`; popis sebere VŠECHNY oddíly verze (paralelní větve), ne cizí
 * verzi; nese čísla nálezů a výsledek kola; řádek s částkou vynechá;
 * neplatná verze / SHA se odmítne; --upravit vrátí odkaz na úpravu. */
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info || ''); } };

const NASTROJ = path.join(__dirname, '..', 'nastroje', 'release_odkaz.py');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kng-release-'));
const CL = path.join(dir, 'CHANGELOG.md');
fs.writeFileSync(CL, [
  '# Změny', '', '---', '',
  '## v14.10.2 — druhá dávka (větev claude/druha)', '',
  'Úvod oddílu.', '',
  '- **B151 (střední) — první oprava.** Delší popis,',
  '  který pokračuje.',
  '- **B152 (nízká) — sleva 12 500 Kč.** Tohle do popisu nepatří.',
  '- **B153 — cena skla 1 200,- Kč.** Ani tohle.',
  '- Odrážka bez tučného začátku. Druhá věta se nebere.',
  '', '**Celé kolo nad abc1234 VŠE ZELENÉ (100 min):** sady 1/0/0, mutace jádra 2/2. Další věta.', '',
  '## v14.10.2 — paralelní větev, oprava 4 500 Kč (větev claude/paralelni)', '',
  '- **#402 — nástroj na odkazy.** Text.', '',
  '## v14.10.1 — starší verze', '',
  '- **B099 — cizí verze.** Nesmí se objevit.', '',
].join('\n'));

const py = (args) => spawnSync('python3', ['-I', NASTROJ, '--changelog', CL, ...args], { encoding: 'utf-8' });
const SHA = 'a'.repeat(40);

const r = py(['14.10.2', SHA]);
test('odkaz vznikne (kód 0)', r.status === 0, r.stderr || r.stdout);
const url = (r.stdout || '').trim();
let u = null;
try { u = new URL(url); } catch (e) { /* níž FAIL */ }
test('odkaz je platná URL na releases/new', u && u.pathname.endsWith('/releases/new'), url);
const q = u ? u.searchParams : new URLSearchParams();
test('tag vD.M.N', q.get('tag') === 'v14.10.2', q.get('tag'));
test('cíl = plný SHA', q.get('target') === SHA);
test('titulek s verzí a názvem prvního oddílu (bez větve)', q.get('title') === 'v14.10.2 — druhá dávka', q.get('title'));
const body = q.get('body') || '';
test('odkaz nese body', body.length > 0);
test('body je v URL zakódované (žádná mezera ani nový řádek v URL)', !/[\s]/.test(url));
test('popis nese nález B151', body.includes('B151 (střední) — první oprava'), body);
test('popis nese oba oddíly verze (paralelní větev #402)', body.includes('#402 — nástroj na odkazy'), body);
test('cizí verze se nepřimíchá', !body.includes('B099'), body);
test('výsledek kola je v popisu', /Testy: Celé kolo nad abc1234 VŠE ZELENÉ \(100 min\): sady 1\/0\/0, mutace jádra 2\/2/.test(body), body);
test('další věta za výsledkem kola se nebere', !body.includes('Další věta'), body);
test('řádek s částkou v Kč se vynechá (i „1 200,- Kč" a částka v titulku oddílu)', !/Kč/.test(body) && !body.includes('B152') && !body.includes('B153') && !/4 500/.test(body), body);
test('odrážka bez tučného začátku jen první větou', body.includes('- Odrážka bez tučného začátku') && !body.includes('Druhá věta'), body);
test('odkaz na CHANGELOG na konci', /Podrobně: CHANGELOG\.md, oddíl v14\.10\.2\.\n$/.test(body), JSON.stringify(body.slice(-60)));

test('neexistující verze se odmítne', py(['1.1.1', SHA]).status !== 0);
test('zkrácený SHA se odmítne', py(['14.10.2', 'abc1234']).status !== 0);
test('nesmyslná verze se odmítne', py(['latest', SHA]).status !== 0);
const up = py(['14.10.2', '--upravit']);
test('--upravit: odkaz na úpravu vydaného releasu', up.status === 0 && up.stdout.startsWith('https://github.com/vendljar/kalkulator-next-gen-engscalc/releases/edit/v14.10.2\n'), up.stdout);
test('--upravit: text k vložení obsahuje popis', up.stdout.includes('B151 (střední) — první oprava'));

// Skutečný CHANGELOG: poslední verze se dá vyrobit a popis se vejde.
const realny = spawnSync('python3', ['-I', NASTROJ, fs.readFileSync(path.join(__dirname, '..', 'verze.txt'), 'utf-8').trim(), '--jen-text'], { encoding: 'utf-8' });
test('popis aktuální verze ze skutečného CHANGELOG', realny.status === 0 && realny.stdout.length > 50 && realny.stdout.length <= 1800, realny.stdout.slice(0, 200));

fs.rmSync(dir, { recursive: true, force: true });
console.log(`\n${ok} OK / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
