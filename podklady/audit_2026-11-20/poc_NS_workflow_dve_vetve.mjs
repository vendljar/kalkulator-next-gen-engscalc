// PoC čočky NS (audit 20. 11. 2026): druhá vrstva kontroly údajů
// (.github/workflows/kontrola_udaju.yml, krok „Pushnuté commity“) při pushi
// DVOU NOVÝCH VĚTVÍ se stejnými commity naráz nezkontroluje nic: běh pro větev A
// vyloučí commity dosažitelné z origin/B a naopak → rozsah je prázdný.
// Údaj vložený a dalším commitem smazaný (špička čistá) nebo údaj ve zprávě
// commitu tak druhou vrstvou projde. Krok se bere DOSLOVA z workflow v repu.
// Lokálně, bez sítě; smyšlený e-mail se skládá za běhu.
// Spuštění: node podklady/audit_2026-11-20/poc_NS_workflow_dve_vetve.mjs
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ZDROJ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const T = mkdtempSync(join(tmpdir(), 'poc_ns_wf_'));
const env = { ...process.env, GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.com', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
const K = join(T, 'k');
const g = (cwd, ...a) => execFileSync('git', a, { cwd, env, encoding: 'utf8' }).trim();

// Krok workflow doslova (blok `run: |` kroku „Pushnuté commity“).
const yml = readFileSync(join(ZDROJ, '.github/workflows/kontrola_udaju.yml'), 'utf8').split('\n');
const od = yml.findIndex(r => /name: Pushnuté commity/.test(r));
const run = yml.findIndex((r, i) => i > od && /^\s+run: \|/.test(r));
const krok = yml.slice(run + 1).filter(r => r.trim() !== '').map(r => r.replace(/^ {10}/, '')).join('\n');
if (od < 0 || !/--rozsah "\$PO" --not \$jine/.test(krok)) { console.log('PoC neměří — krok workflow nenalezen.'); process.exit(2); }

execFileSync('git', ['init', '-q', '--bare', '-b', 'main', join(T, 'origin.git')], { env });
execFileSync('git', ['clone', '-q', join(T, 'origin.git'), K], { env, stdio: 'ignore' });
mkdirSync(join(K, 'nastroje'), { recursive: true });
for (const f of ['kontrola_udaju.py', 'povolene_kontakty.txt']) cpSync(join(ZDROJ, 'nastroje', f), join(K, 'nastroje', f));
writeFileSync(join(K, 'README.md'), 'základ\n');
g(K, 'add', '-A'); g(K, 'commit', '-qm', 'základ'); g(K, 'push', '-q', 'origin', 'main');

const EMAIL = 'jan.novak' + '@' + 'skutecna-firma-audit' + '.cz';
function vetev(jmeno) {            // commit s údajem, další ho smaže (špička čistá) + údaj ve zprávě
  g(K, 'checkout', '-q', '-b', jmeno, 'origin/main');
  writeFileSync(join(K, 'pozn.md'), EMAIL + '\n'); g(K, 'add', '-A'); g(K, 'commit', '-qm', 'poznámka');
  writeFileSync(join(K, 'pozn.md'), 'bez údaje\n'); g(K, 'add', '-A'); g(K, 'commit', '-qm', 'oprava, psal ' + EMAIL);
}
// Běh workflow = čerstvý klon se všemi větvemi (checkout fetch-depth: 0) na pushnutém SHA.
function behWorkflow(ref, po) {
  const W = mkdtempSync(join(T, 'beh_'));
  execFileSync('git', ['clone', '-q', join(T, 'origin.git'), W], { env, stdio: 'ignore' });
  g(W, 'checkout', '-q', '--detach', po);
  const r = spawnSync('bash', ['-e', '-c', krok], { cwd: W, encoding: 'utf8',
    env: { ...env, PRED: '0'.repeat(40), PO: po, REF: 'refs/heads/' + ref } });
  return { kod: r.status, vystup: (r.stdout + r.stderr).trim().split('\n').pop() };
}

// 1) pojistka: jedna nová větev → workflow údaj najde.
vetev('jedna'); g(K, 'push', '-q', '--no-verify', 'origin', 'jedna');
const k1 = behWorkflow('jedna', g(K, 'rev-parse', 'jedna'));
console.log('1) jedna nová větev:        kód ' + k1.kod + ' — ' + (k1.kod === 1 ? 'nález (správně)' : k1.vystup));
if (k1.kod !== 1) { console.log('PoC neměří — kontrolní případ workflow nezachytil.'); process.exit(2); }

// 2) dvě nové větve se stejnými commity jedním pushem.
vetev('dve-a'); g(K, 'branch', 'dve-b', 'dve-a'); g(K, 'push', '-q', '--no-verify', 'origin', 'dve-a', 'dve-b');
const po = g(K, 'rev-parse', 'dve-a');
const a = behWorkflow('dve-a', po), b = behWorkflow('dve-b', po);
console.log('2) dvě nové větve naráz, běh pro dve-a: kód ' + a.kod + ' — ' + a.vystup);
console.log('                         běh pro dve-b: kód ' + b.kod + ' — ' + b.vystup);

rmSync(T, { recursive: true, force: true });
const zranitelne = a.kod === 0 && b.kod === 0;
console.log(zranitelne
  ? 'ZRANITELNÉ (oba běhy workflow hlásí „čisté“ s 0 commity, údaj je přitom v historii obou větví)'
  : 'ODOLNÉ');
