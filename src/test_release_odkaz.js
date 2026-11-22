/* Test nástroje nastroje/release_odkaz.py (pravidlo J. V. 13. 10. 2026:
 * každý odkaz na nový release nese i popis změn z CHANGELOG).
 *
 * Ověřuje na umělém CHANGELOG: odkaz má tag, cíl, titulek a URL-kódovaný
 * `body`; popis sebere VŠECHNY oddíly verze (paralelní větve), ne cizí
 * verzi; nese čísla nálezů a výsledek kola; řádek s částkou vynechá;
 * neplatná verze / SHA se odmítne; --upravit vrátí odkaz na úpravu;
 * --chybejici hlásí jen verze, které prošly do main (J. V. 18. 11. 2026:
 * tag a release jen pro stav, který jde do main), a od 22. 11. 2026 jen
 * verzi NASAZENOU (HEAD main) — mezilehlé verze z historie main ne. */
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

const py = (args, tagy, vMain) => spawnSync('python3', ['-I', NASTROJ, '--changelog', CL, ...args], { encoding: 'utf-8', env: Object.assign({}, process.env, { KNG_TAGY: tagy === undefined ? 'v14.10.0' : tagy, KNG_VERZE_MAIN: vMain === undefined ? '14.10.1,14.10.2' : vMain }) });
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

// Hlídání dvojího vydání (J. V. 15. 10. 2026): existující tag → žádný odkaz na nový release.
const dvoji = py(['14.10.2', SHA], 'v14.10.1,v14.10.2');
test('existující tag: odkaz na nový release nevznikne (kód 3)', dvoji.status === 3 && !dvoji.stdout.includes('/releases/new'), dvoji.stdout);
test('existující tag: odkaz na vydaný release a jeho úpravu', dvoji.stdout.includes('/releases/tag/v14.10.2') && dvoji.stdout.includes('/releases/edit/v14.10.2'), dvoji.stdout);
const chyb = py(['--chybejici'], 'v14.10.1');
test('--chybejici: vypíše verzi bez tagu, ne otagovanou', chyb.status === 0 && chyb.stdout.includes('v14.10.2') && !chyb.stdout.includes('v14.10.1'), chyb.stdout);
// S7 (J. V. 18. 11. 2026): verze jen v testu nebo integraci (tu v14.10.2) se nehlásí, i když tag nemá.
const jenMain = py(['--chybejici'], '', '14.10.1');
test('--chybejici: hlásí verzi, která prošla do main', jenMain.status === 0 && /: v14\.10\.1\b/.test(jenMain.stdout), jenMain.stdout);
test('--chybejici: verzi jen v testu nebo integraci nehlásí', !jenMain.stdout.includes('v14.10.2'), jenMain.stdout);
const nicVMain = py(['--chybejici'], '', '');
test('--chybejici: nic v main → žádná', nicVMain.status === 0 && /: žádná/.test(nicVMain.stdout), nicVMain.stdout);

// J. V. 22. 11. 2026: tag jen pro verzi nasazenou do main (HEAD), ne pro
// mezilehlé verze, které do main přišly s ní (fast-forward na test).
// Umělý git: main 14.10.1 → 14.10.2 → 14.10.3 (HEAD), žádný tag.
{
  const repo = path.join(dir, 'repo-main');
  fs.mkdirSync(repo);
  const g = (...a) => execFileSync('git', ['-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t',
    '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...a], { encoding: 'utf-8' });
  g('init', '-q', '-b', 'main');
  ['14.10.1', '14.10.2', '14.10.3'].forEach(v => {
    fs.writeFileSync(path.join(repo, 'verze.txt'), v + '\n'); g('add', 'verze.txt'); g('commit', '-q', '-m', v);
  });
  const CL3 = path.join(dir, 'CHANGELOG_main.md');
  fs.writeFileSync(CL3, ['# Changelog', '', '## v14.10.3 — nasazená', '- a', '', '## v14.10.2 — mezilehlá', '- b', '',
    '## v14.10.1 — mezilehlá', '- c', ''].join('\n'));
  const env = Object.assign({}, process.env, { KNG_TAGY: '', KNG_REPO: repo, KNG_MAIN_REF: 'main' });
  delete env.KNG_VERZE_MAIN;
  const r = spawnSync('python3', ['-I', NASTROJ, '--changelog', CL3, '--chybejici'], { encoding: 'utf-8', env });
  test('--chybejici: hlásí nasazenou verzi (HEAD main) bez tagu', r.status === 0 && /: v14\.10\.3$/m.test(r.stdout), r.stdout + r.stderr);
  test('--chybejici: mezilehlé verze z historie main nehlásí', !/v14\.10\.[12]\b/.test(r.stdout), r.stdout);
  const r2 = spawnSync('python3', ['-I', NASTROJ, '--changelog', CL3, '--chybejici'], { encoding: 'utf-8',
    env: Object.assign({}, env, { KNG_TAGY: 'v14.10.3' }) });
  test('--chybejici: nasazená verze s tagem → žádná', r2.status === 0 && /: žádná/.test(r2.stdout), r2.stdout);
}

// Skutečný CHANGELOG: poslední verze se dá vyrobit a popis se vejde.
const realny = spawnSync('python3', ['-I', NASTROJ, fs.readFileSync(path.join(__dirname, '..', 'verze.txt'), 'utf-8').trim(), '--jen-text'], { encoding: 'utf-8' });
test('popis aktuální verze ze skutečného CHANGELOG', realny.status === 0 && realny.stdout.length > 50 && realny.stdout.length <= 1800, realny.stdout.slice(0, 200));

fs.rmSync(dir, { recursive: true, force: true });
console.log(`\n${ok} OK / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
