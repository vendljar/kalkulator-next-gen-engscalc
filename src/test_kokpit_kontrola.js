/* KONTROLA DAT KOKPITU (K6-W1, dávka D3 21. 10. 2026).
 *
 * .claude/skills/kokpit-koordinace/kontrola.py hledala jen malé „</script>“;
 * prohlížeč ale datový blok <script type="application/json"> ukončí na
 * „</script“ v jakékoli velikosti písmen — jméno větve s „</ScRiPt>“ prošlo
 * jako „kokpit JSON OK“. Kontrola teď odmítne jakýkoli „<“ v datech
 * (zapisuje se jako <). Běží nad šablonou kokpitu a jejími kopiemi
 * v dočasné složce. */
const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');
const KOREN = path.join(__dirname, '..');
const KONTROLA = path.join(KOREN, '.claude/skills/kokpit-koordinace/kontrola.py');
const SABLONA = fs.readFileSync(path.join(KOREN, '.claude/skills/kokpit-koordinace/kokpit_sablona.html'), 'utf8');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 300)); }
};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kng-kokpit-'));
const zkus = (html) => {
  const f = path.join(dir, 'k' + (ok + fail) + '.html');
  fs.writeFileSync(f, html);
  const r = spawnSync('python3', [KONTROLA, f], { encoding: 'utf8' });
  return { kod: r.status, out: (r.stdout || '') + (r.stderr || '') };
};
/* Jméno větve vložené do prvního sezení v datech. */
const sVetvi = (vetev) => SABLONA.replace('"aktualizace": "', '"vetevTest": ' + JSON.stringify(vetev) + ',\n "aktualizace": "');

const r0 = zkus(SABLONA);
test('šablona kokpitu projde („kokpit JSON OK“)', r0.kod === 0 && /kokpit JSON OK/.test(r0.out), r0);
const r1 = zkus(sVetvi('claude/x</ScRiPt><svg/onload=alert(1)>'));
test('K6-W1: „</ScRiPt>“ ve jméně větve kontrola odmítne', r1.kod !== 0 && !/kokpit JSON OK/.test(r1.out), r1);
const r2 = zkus(sVetvi('claude/x<!--'));
test('K6-W1: „<!--“ v datech kontrola odmítne', r2.kod !== 0, r2);
const r3 = zkus(SABLONA.replace('"aktualizace": "', '"vetevTest": "claude/x\\u003c/ScRiPt>",\n "aktualizace": "'));
test('K6-W1: totéž jméno zapsané jako \\u003c projde', r3.kod === 0 && /kokpit JSON OK/.test(r3.out), r3);
const r4 = zkus(SABLONA.replace('"aktualizace": "', '"aktualizace": , "'));
test('poškozený JSON dál neprojde', r4.kod !== 0, r4);

fs.rmSync(dir, { recursive: true, force: true });
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
if (fail) process.exit(1);
