// PoC čočky NS (audit 20. 11. 2026): co hook pre-push + nastroje/kontrola_udaju.py
// NEzachytí. Běží jen lokálně v dočasné složce (holý „origin“ + klon s kopií
// nastroje/), bez sítě. Všechny „tajné“ hodnoty jsou smyšlené a skládají se až
// za běhu, aby tenhle soubor sám nebyl nálezem.
// Spuštění: node podklady/audit_2026-11-20/poc_NS_kontrola_mezery.mjs
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, appendFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ZDROJ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const T = mkdtempSync(join(tmpdir(), 'poc_ns_'));
const env = { ...process.env, GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.com', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
const K = join(T, 'k');
const git = (...a) => spawnSync('git', a, { cwd: K, env, encoding: 'utf8' });
const g = (...a) => execFileSync('git', a, { cwd: K, env, encoding: 'utf8' });

execFileSync('git', ['init', '-q', '--bare', '-b', 'main', join(T, 'origin.git')], { env });
execFileSync('git', ['clone', '-q', join(T, 'origin.git'), K], { env, stdio: 'ignore' });
mkdirSync(join(K, 'nastroje/hooky'), { recursive: true });
for (const f of ['kontrola_udaju.py', 'povolene_kontakty.txt', 'instaluj_hooky.sh', 'hooky/pre-push'])
  cpSync(join(ZDROJ, 'nastroje', f), join(K, 'nastroje', f));
writeFileSync(join(K, 'README.md'), 'základ\n');
g('add', '-A'); g('commit', '-qm', 'základ'); g('push', '-q', 'origin', 'main');
execFileSync('bash', ['nastroje/instaluj_hooky.sh'], { cwd: K, env, stdio: 'ignore' });

// Smyšlené hodnoty (skládané za běhu).
const HEX = 'c0ffee'.repeat(8).slice(0, 44);                       // „tajemství relace“
const EMAIL = 'jan.novak' + '@' + 'skutecna-firma-audit' + '.cz';  // mimo povolený seznam
const SKRIPT = 'https://script.google' + '.com/macros/s/' + 'AKfycbPOKUS'.padEnd(40, 'x') + '/exec';
const URLHESLO = 'https://' + 'uzivatel' + ':' + 'Hesl0Pokusne' + '@' + 'db.priklad.cz/x';

let n = 0, zranitelne = 0;
function pokus(popis, priprav, { tag } = {}) {
  n++;
  const v = 'poc-' + n;
  g('checkout', '-q', '-b', v, 'origin/main');
  priprav();
  const cil = tag ? ['origin', tag] : ['origin', v];
  const r = git('push', ...cil);
  const proslo = r.status === 0;
  if (proslo) zranitelne++;
  console.log((proslo ? '  PROŠLO (kontrola NEzachytila) ' : '  zastaveno (kontrola zachytila)  ') + popis);
  return proslo;
}
const soubor = (rel, obsah) => { mkdirSync(dirname(join(K, rel)), { recursive: true }); writeFileSync(join(K, rel), obsah); };
const commit = (z) => { g('add', '-A', '-f'); g('commit', '-qm', z); };

console.log('Kontrolní pokus (pojistka, že PoC měří):');
const kontrola = pokus('e-mail mimo seznam v src/x.js', () => { soubor('src/x.js', '// ' + EMAIL + '\n'); commit('x'); });
if (kontrola) { console.log('PoC neměří — hook nezastavil ani kontrolní případ.'); process.exit(2); }

console.log('Mezery:');
pokus('a) e-mail ve složce dist/ přidané přes git add -f (VYNECHAT_SLOZKY platí i v --rozsah)',
  () => { soubor('podklady/dist/export.txt', EMAIL + '\n'); commit('a'); });
pokus('b) e-mail v souboru UTF-16 (export z Excelu; NUL → „binární“, přeskočí se)',
  () => { soubor('podklady/export.csv', Buffer.from('﻿jmeno;' + EMAIL + '\n', 'utf16le')); commit('b'); });
pokus('c) TAJEMSTVI_RELACE=<hodnota> bez uvozovek (tvar .env / výpis prostředí)',
  () => { soubor('podklady/prostredi.txt', 'TAJEMSTVI' + '_RELACE=' + HEX.replace(/[0-9a-f]{3}/g, m => m + 'Q') + '\n'); commit('c'); });
pokus('d) "ADMIN_INIT_HESLO": "<hodnota>" (JSON / YAML s dvojtečkou)',
  () => { soubor('podklady/prostredi.json', '{ "ADMIN_INIT' + '_HESLO": "Pokusne-Heslo-2026!" }\n'); commit('d'); });
pokus('e) adresa Apps Script …/macros/s/<id>/exec',
  () => { soubor('podklady/pozn.md', SKRIPT + '\n'); commit('e'); });
pokus('f) heslo v adrese (schema://uživatel:heslo@host)',
  () => { soubor('podklady/pozn2.md', URLHESLO + '\n'); commit('f'); });
pokus('g) e-mail ve zprávě ANOTOVANÉHO tagu (čte se jen zpráva commitu)',
  () => { g('tag', '-a', 'v99.99.1', '-m', 'release ' + EMAIL, 'origin/main'); }, { tag: 'v99.99.1' });
pokus('h) týž push přidá e-mail i řádek *@doména do povoleného seznamu (kontrola čte seznam z pracovní kopie)',
  () => { appendFileSync(join(K, 'nastroje/povolene_kontakty.txt'), '*@skutecna-firma-audit.cz\n'); soubor('src/y.js', '// ' + EMAIL + '\n'); commit('h'); });
pokus('i) e-mail v base64 (očekávaná mez každé kontroly vzorem)',
  () => { soubor('podklady/b64.txt', Buffer.from(EMAIL).toString('base64') + '\n'); commit('i'); });
n++;
{ // j) hook vypnutý jednorázově bez --no-verify
  g('checkout', '-q', '-b', 'poc-j', 'origin/main'); soubor('src/z.js', '// ' + EMAIL + '\n'); commit('j');
  const r = git('-c', 'core.hooksPath=/dev/null', 'push', 'origin', 'poc-j');
  if (r.status === 0) zranitelne++;
  console.log((r.status === 0 ? '  PROŠLO (kontrola NEzachytila) ' : '  zastaveno                        ')
    + 'j) git -c core.hooksPath=/dev/null push (není --no-verify, hook se nespustí)');
}

rmSync(T, { recursive: true, force: true });
console.log('\nVýsledek: ' + zranitelne + ' z ' + (n - 1) + ' mezer prošlo přes hook pre-push.');
console.log(zranitelne > 0 ? 'ZRANITELNÉ (kontrola údajů má doložené mezery)' : 'ODOLNÉ');
