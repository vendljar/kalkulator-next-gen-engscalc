// PoC čočky NS (audit 20. 11. 2026): „Smazat sloučené větve“
// (nastroje/sloucene_vetve.sh) proti zlomyslným NÁZVŮM VĚTVÍ a vstupům
// formuláře (vynechat, stari_hodin). Otázka: dá se názvem větve nebo vstupem
// spustit příkaz, nebo smazat main / test / test-draft / claude/integrace-*?
// Lokálně: holý „origin“ + klon, skutečné mazání proti místnímu originu.
// Spuštění: node podklady/audit_2026-11-20/poc_NS_sloucene_vetve_jmena.mjs
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ZDROJ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKRIPT = join(ZDROJ, 'nastroje/sloucene_vetve.sh');
const T = mkdtempSync(join(tmpdir(), 'poc_ns_sv_'));
const STOPA = join(T, 'SPUSTENO');
const STARY = '2026-01-01T00:00:00';
const env = { ...process.env, GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.com', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_DATE: STARY, GIT_COMMITTER_DATE: STARY, GITHUB_ACTIONS: '', GITHUB_REF: '', GITHUB_STEP_SUMMARY: join(T, 'souhrn.md') };
const K = join(T, 'k');
const g = (...a) => execFileSync('git', a, { cwd: K, env, encoding: 'utf8' }).trim();

execFileSync('git', ['init', '-q', '--bare', '-b', 'main', join(T, 'origin.git')], { env });
execFileSync('git', ['clone', '-q', join(T, 'origin.git'), K], { env, stdio: 'ignore' });
let c = 0;
const commit = () => { writeFileSync(join(K, 's' + (++c) + '.txt'), String(c)); g('add', '-A'); g('commit', '-qm', 'c' + c); };
commit(); g('push', '-q', 'origin', 'main');

// Zlomyslné názvy: každý by při vložení do shellu vytvořil soubor STOPA.
// (Git v názvu nedovolí mezeru, ~ ^ : ? * [ \ ani „..“ — proto ${IFS}.)
const ZLE = [
  'x$(touch${IFS}' + STOPA + ')',
  'x`touch${IFS}' + STOPA + '`',
  'x;touch${IFS}' + STOPA + ';y',
  'x|touch${IFS}' + STOPA,
  'x&&touch${IFS}' + STOPA,
  '-x',                                  // vypadá jako volba
  '--delete',
  'a"b\'c',
  'main/x', 'test/..x'.replace('..', '.'), // podobné chráněným
  'refs/heads/main',                     // větev refs/heads/refs/heads/main
  'claude/integrace', 'Main', 'TEST',
  "x'$(touch${IFS}" + STOPA + ")'",
];
// Staré sloučené větve (merge commitem do test) se zlomyslnými názvy.
g('checkout', '-q', '-b', 'test', 'main');
const vytvorene = [];
for (const z of ZLE) {
  const r = spawnSync('git', ['update-ref', 'refs/heads/' + z, 'HEAD'], { cwd: K, env });
  if (r.status !== 0) continue;
  g('checkout', '-q', 'refs/heads/' + z); commit(); const sha = g('rev-parse', 'HEAD');
  g('update-ref', 'refs/heads/' + z, sha);
  g('checkout', '-q', 'test'); g('merge', '-q', '--no-ff', '-m', 'sloučena', sha);
  vytvorene.push(z);
}
// Chráněné: všechny celé v test a staré (kdyby ochrana selhala, smazaly by se).
commit();
for (const ch of ['test-draft', 'claude/integrace-19-11']) g('update-ref', 'refs/heads/' + ch, 'test~1^2');
g('update-ref', 'refs/heads/main', 'test~1^2');
g('push', '-q', '--force', 'origin', '+refs/heads/*:refs/heads/*');
const vzdalene = () => execFileSync('git', ['ls-remote', '--heads', join(T, 'origin.git')], { env, encoding: 'utf8' })
  .split('\n').filter(Boolean).map(r => r.replace(/^.*\trefs\/heads\//, ''));
const pred = vzdalene();

// Zlomyslné vstupy formuláře (ve workflow jdou přes env → argumenty).
const VSTUPY = [
  ['--stari-hodin', '24', '--vynechat', '$(touch ' + STOPA + ') `touch ' + STOPA + '` ; touch ' + STOPA],
  ['--stari-hodin', '24; touch ' + STOPA, '--vynechat', ''],
  ['--stari-hodin', '$(touch ' + STOPA + ')', '--vynechat', ''],
  ['--stari-hodin', 'a[$(touch ' + STOPA + ')]', '--vynechat', ''],      // aritmetická injekce bash
  ['--stari-hodin', '1', '--vynechat', '* main test --zaklad main'],
];
const kody = [];
for (const v of VSTUPY) {
  const r = spawnSync('bash', [SKRIPT, ...v], { cwd: K, env, encoding: 'utf8' });
  kody.push(r.status);
}
const po = vzdalene();
const CHRANENE = ['main', 'test', 'test-draft', 'claude/integrace-19-11'];
const chraneneZiji = CHRANENE.every(ch => po.includes(ch));
const spusteno = existsSync(STOPA);
const smazane = pred.filter(v => !po.includes(v));

console.log('Zlomyslných názvů větví vytvořeno: ' + vytvorene.length + ' z ' + ZLE.length + ' (zbytek odmítl Git)');
console.log('Návratové kódy běhů se zlomyslnými vstupy: ' + kody.join(', ') + ' (0 = běh, 2 = odmítnuté zadání)');
console.log('Smazané větve (' + smazane.length + '): ' + smazane.map(s => JSON.stringify(s)).join(' '));
console.log('Chráněné větve po bězích existují: ' + (chraneneZiji ? 'ano' : 'NE') + ' — ' + CHRANENE.join(', '));
console.log('Vedlejší příkaz spuštěn (soubor stopy): ' + (spusteno ? 'ANO' : 'ne'));
rmSync(T, { recursive: true, force: true });
if (smazane.length === 0) { console.log('PoC neměří — skript nic nesmazal, ochrana se neprověřila.'); process.exit(2); }
console.log(!spusteno && chraneneZiji ? 'ODOLNÉ' : 'ZRANITELNÉ');
