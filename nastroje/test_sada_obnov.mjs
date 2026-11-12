/* OBNOVA TESTOVACÍ SADY ZAKÁZEK (C5, #585, 11. 11. 2026) — obal pro příkazovou řádku.
 *
 * Ze souboru exportu založí zakázky s číslem „TEST - …" v TESTOVACÍ databázi
 * přes běžné /api/zakazky jako přihlášený administrátor — stejnou cestou
 * a se stejnými kontrolami jako prohlížeč. Nic nepřepíše, nic nemaže, čísla
 * ani varianty nemění, zámky ponechá. Rozhodování je v test_sada_jadro.mjs.
 *
 * SPUŠTĚNÍ (návod: podklady/NAVOD_TEST_SADA_OBNOVA.md)
 *   node nastroje/test_sada_obnov.mjs --web https://testengscalc.netlify.app --export <soubor.json>
 *   node nastroje/test_sada_obnov.mjs --web https://testengscalc.netlify.app --zaloha <otisk.json.gz>
 *   … a totéž s --zapsat pro skutečný zápis (jinak jen náhled).
 *
 * E-mail a heslo se čtou jen z klávesnice (heslo bez ozvěny). Node 20+,
 * bez závislostí mimo repo, bez sestavení.
 * ============================================================ */
import { createInterface } from 'node:readline';
import { readFileSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { obnovSadu, cilPovolen, vyberZExportu, vyberZeZalohy, ocistiText } from './test_sada_jadro.mjs';

const NAPOVEDA = 'Použití:\n'
  + '  node nastroje/test_sada_obnov.mjs --web https://testengscalc.netlify.app --export <soubor.json> [--zapsat]\n'
  + '  node nastroje/test_sada_obnov.mjs --web https://testengscalc.netlify.app --zaloha <otisk.json(.gz)> [--zapsat]\n\n'
  + 'Bez --zapsat jen náhled — nic se nezapíše. Soubor patří mimo složku repa.';

function konec(kod, text) { if (text) console.error(text); process.exit(kod); }

/* ---------- přepínače (neznámý = kód 2) ---------- */
const S_HODNOTOU = ['--web', '--export', '--zaloha'];
const BEZ_HODNOTY = ['--zapsat'];
const volby = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (S_HODNOTOU.includes(a)) {
    if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) konec(2, 'Přepínač ' + a + ' potřebuje hodnotu.\n\n' + NAPOVEDA);
    if (volby[a] !== undefined) konec(2, 'Přepínač ' + a + ' je zadaný dvakrát.\n\n' + NAPOVEDA);
    volby[a] = argv[++i];
  } else if (BEZ_HODNOTY.includes(a)) volby[a] = true;
  else konec(2, 'Neznámý přepínač: ' + a + '\n\n' + NAPOVEDA);
}
if (!volby['--web']) konec(2, 'Chybí --web.\n\n' + NAPOVEDA);
if (!!volby['--export'] === !!volby['--zaloha']) konec(2, 'Zadejte právě jedno z --export a --zaloha.\n\n' + NAPOVEDA);

/* P1: cíl se posoudí jako první — před souborem i před heslem. */
const cil = cilPovolen(volby['--web']);
if (!cil.ok) konec(2, 'ODMÍTNUTO: ' + cil.chyba);

/* ---------- soubor ---------- */
const soubor = volby['--export'] || volby['--zaloha'];
if (!existsSync(soubor)) konec(2, 'Soubor neexistuje: ' + soubor + '\n\n' + NAPOVEDA);
let data;
try {
  let buf = readFileSync(soubor);
  if (buf[0] === 0x1f && buf[1] === 0x8b) buf = gunzipSync(buf);
  data = JSON.parse(buf.toString('utf8'));
} catch (e) { konec(2, 'Soubor se nepodařilo přečíst jako JSON (' + ocistiText(e && e.message) + ').'); }

const vyber = volby['--export'] ? vyberZExportu(data) : vyberZeZalohy(data);
data = null;   // zbytek zálohy (účty, ceník…) se dál nečte
if (!vyber.ok) {
  console.error(vyber.chyba);
  for (const c of (vyber.cizi || []).slice(0, 50))
    console.error('  #' + c.poradi + ' ' + (c.cislo || '(bez čísla)') + ' — ' + c.duvody.map(d => d.kde + ' ' + d.cislo).join('; '));
  if ((vyber.cizi || []).length > 50) console.error('  … a ' + (vyber.cizi.length - 50) + ' dalších');
  konec(2);
}
if (volby['--zaloha']) {
  console.log('Ze zálohy vybráno ' + vyber.zakazky.length + ' TEST zakázek; ostatních ' + vyber.ostatnich + ' se nečte.');
  for (const c of vyber.vyrazene) console.log('  vyřazeno ' + c.cislo + ' — ' + c.duvody.map(d => d.kde + ' ' + d.cislo).join('; '));
}

/* ---------- klávesnice ---------- */
const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: !!process.stdin.isTTY });
const zeptej = (otazka) => new Promise(r => rl.question(otazka, o => r(o)));
/* Heslo bez ozvěny (vzor migrace_znacky.mjs). */
function zeptejHeslo(otazka) {
  process.stdout.write(otazka);
  const stdin = process.stdin;
  rl.pause();
  const bylo = stdin.isRaw;
  if (stdin.isTTY) stdin.setRawMode(true);
  stdin.resume();
  let heslo = '';
  return new Promise(r => {
    const hotovo = () => {
      if (stdin.isTTY) stdin.setRawMode(!!bylo);
      stdin.removeListener('data', naData);
      process.stdout.write('\n');
      rl.resume();
      r(heslo);
    };
    const naData = (buf) => {
      for (const zn of buf.toString('utf8')) {
        if (zn === '\n' || zn === '\r' || zn === '\u0004') return hotovo();
        if (zn === '\u0003') { process.stdout.write('\n'); process.exit(130); }
        if (zn === '\u007f' || zn === '\b') { heslo = heslo.slice(0, -1); continue; }
        heslo += zn;
      }
    };
    stdin.on('data', naData);
  });
}

/* Ctrl+C během zápisu: dokončí se rozpracovaná zakázka, pak konec se souhrnem. */
let preruseno = false;
process.on('SIGINT', () => {
  if (preruseno) process.exit(130);
  preruseno = true;
  console.log('\n(Ctrl+C — dokončuji rozpracovanou zakázku; znovu Ctrl+C = okamžitý konec)');
});

const { kod } = await obnovSadu({
  web: cil.web, zakazky: vyber.zakazky, zapsat: !!volby['--zapsat'], fetch: globalThis.fetch,
  zeptej, zeptejHeslo, vypis: (s) => console.log(s), pauzaMs: 400, prerusit: () => preruseno,
});
rl.close();
process.exit(kod);
