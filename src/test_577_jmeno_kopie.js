/* #577 AS — KLIENT A SDÍLENÁ PRAVIDLA NOČNÍ KOPIE SKRIPTEM (10. 11. 2026)
 *
 *   J  jméno kopie pro skript (retenceZalohDiskJmeno v src/retence_zaloh.js,
 *      skládá ho server) = jméno kopie z prohlížeče (uloKopieDiskJmeno,
 *      .json.gz) pro stovky časů včetně přechodu letní/zimní čas; neplatné
 *      vstupy = '';
 *   H  hlídka v Nastavení → Databáze: kopie skriptu nejnovějšího nočního
 *      otisku → potreba false (prohlížeč kopii nedělá ani nestraší), text
 *      „Poslední kopie na Disku: … (skript)"; stará kopie skriptu radí
 *      spouštěč a e-mail; kopie z prohlížeče beze změny;
 *   R  skript nese pravidlo retence BEZE ZMĚNY ze src/retence_zaloh.js
 *      (nastroje/apps_script/vloz_retenci.py --kontrola) a appsscript.json
 *      má pásmo Europe/Prague.
 * Pojistka: na 59c56b3 padá (retenceZalohDiskJmeno ani skript nejsou,
 * hlídka kopii skriptu nerozliší).
 * Spuštění: node src/test_577_jmeno_kopie.js */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const RZ = require('./retence_zaloh.js');
const U = require('./uloziste.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 500)); } };

try {
  /* ---------- J ---------- */
  test('J1 retenceZalohDiskJmeno je exportovaná funkce', typeof RZ.retenceZalohDiskJmeno === 'function');
  const casy = [];
  for (let i = 0; i < 400; i++) casy.push(Date.UTC(2026, 0, 1) + i * 22 * 3600 * 1000 + i * 61000);
  casy.push(Date.UTC(2026, 2, 29, 0, 59), Date.UTC(2026, 2, 29, 1, 0), Date.UTC(2026, 9, 25, 0, 59), Date.UTC(2026, 9, 25, 1, 0));   // přechody času
  const rozdil = [];
  for (const t of casy) for (const p of ['main', 'test', 'jiny']) {
    const den = new Date(t).toISOString().slice(0, 10);
    const a = RZ.retenceZalohDiskJmeno(den, p, new Date(t).toISOString());
    const b = U.uloKopieDiskJmeno(den, true, p, new Date(t).toISOString());
    if (a !== b || !a) rozdil.push({ t: new Date(t).toISOString(), p, a, b });
  }
  test('J2 jméno skriptu = jméno z prohlížeče (' + casy.length * 3 + ' kombinací, i přechody času)', !rozdil.length, rozdil.slice(0, 3));
  test('J3 jméno projde rozborem retence (nový tvar, .gz, prostředí, den)', (() => { const r = RZ.retenceZalohDiskRozeber(
    RZ.retenceZalohDiskJmeno('2026-11-10', 'main', '2026-11-10T02:05:00Z')); return r && !r.stary && r.gzip && r.prostredi === 'main'
    && r.den === '2026-11-10' && r.hhmm === '0305'; })());
  test('J4 neplatné prostředí, den nebo čas → ""', RZ.retenceZalohDiskJmeno('2026-11-10', 'ostry', '2026-11-10T02:05:00Z') === ''
    && RZ.retenceZalohDiskJmeno('2026-02-31', 'main', '2026-02-28T02:05:00Z') === '' && RZ.retenceZalohDiskJmeno('2026-11-10', 'main', 'nesmysl') === ''
    && RZ.retenceZalohDiskJmeno('', 'main', '2026-11-10T02:05:00Z') === '');

  /* ---------- H ---------- */
  const ted = Date.parse('2026-11-10T08:00:00Z');
  const otisky = [{ den: '2026-11-10', porizena: '2026-11-10T02:05:00Z', zdroj: 'nocni-otisk' }, { den: '2026-11-09', porizena: '2026-11-09T02:05:00Z', zdroj: 'nocni-otisk' }];
  const skript = { kdy: '2026-11-10T05:01:00Z', kdo: 'skript Apps Script', soubor: 'otisk_main_2026-11-10_0305.json.gz', otisk: '2026-11-10',
    puvod: 'nocni-otisk', potvrzeno: 'token-skript', zdroj: 'skript', prostredi: 'main', velikostB: 1, sha256: 'a'.repeat(64) };
  let s = U.uloKopieDiskStav(skript, ted, 'main', otisky);
  test('H1 kopie skriptu nejnovějšího otisku: prohlížeč kopii nedělá (potreba false) a nestraší', s.potreba === false && s.stara === false && s.skript === true, s);
  test('H2 text „Poslední kopie na Disku (prostředí main): … (otisk_main_…) (skript)."', /^Poslední kopie na Disku \(prostředí main\): .+ \(otisk_main_2026-11-10_0305\.json\.gz\) \(skript\)\.$/.test(s.text), s.text);
  s = U.uloKopieDiskStav({ ...skript, otisk: '2026-11-09', soubor: 'otisk_main_2026-11-09_0305.json.gz' }, ted, 'main', otisky);
  test('H3 skript potvrdil jen starší otisk → prohlížeč kopii udělá (záloha záloh)', s.potreba === true && s.skript === true, s);
  s = U.uloKopieDiskStav({ ...skript, kdy: '2026-11-05T05:01:00Z', otisk: '2026-11-05' }, ted, 'main', otisky);
  test('H4 stará kopie skriptu: varování radí spouštěč, e-mail a návod', s.stara === true && /skript Google Apps Script/.test(s.text)
    && /script\.google\.com/.test(s.text) && /NAVOD_ZALOHA_APPS_SCRIPT/.test(s.text) && /Zkopírovat zálohu na Disk teď/.test(s.text), s.text);
  s = U.uloKopieDiskStav({ ...skript, zdroj: undefined, potvrzeno: 'heslo-spravce', kdo: 'spravce@priklad.cz' }, ted, 'main', otisky);
  test('H5 kopie z prohlížeče: text beze změny („Poslední kopie záloh na Disku Google"), skript false', s.skript === false
    && /^Poslední kopie záloh na Disku Google \(prostředí main\): /.test(s.text) && !/skript/.test(s.text), s.text);
  s = U.uloKopieDiskStav({ ...skript, zdroj: undefined }, ted, 'main', otisky);
  test('H6 záznam se značkou token-skript se pozná i bez pole zdroj', s.skript === true);
  s = U.uloKopieDiskStav({ ...skript, prostredi: 'test' }, ted, 'main', otisky);
  test('H7 kopie skriptu JINÉHO prostředí se nebere (potreba, „zatím žádná")', s.potreba === true && /zatím žádná/.test(s.text), s.text);

  /* ---------- R ---------- */
  const koren = path.join(__dirname, '..');
  let kontrola = '';
  try { kontrola = execFileSync('python3', [path.join(koren, 'nastroje/apps_script/vloz_retenci.py'), '--kontrola'], { encoding: 'utf8' }); }
  catch (e) { kontrola = 'CHYBA ' + (e.stdout || e.message); }
  test('R1 skript nese aktuální pravidlo retence (vloz_retenci.py --kontrola)', /aktuální/.test(kontrola), kontrola);
  const gs = fs.readFileSync(path.join(koren, 'nastroje/apps_script/kopie_disk.gs'), 'utf8');
  test('R2 blok retence ve skriptu = src/retence_zaloh.js doslova', gs.includes(fs.readFileSync(path.join(__dirname, 'retence_zaloh.js'), 'utf8')));
  const man = JSON.parse(fs.readFileSync(path.join(koren, 'nastroje/apps_script/appsscript.json'), 'utf8'));
  test('R3 appsscript.json: pásmo Europe/Prague, V8, rozsahy Drive + externí požadavky + e-mail + spouštěče', man.timeZone === 'Europe/Prague'
    && man.runtimeVersion === 'V8' && ['drive', 'script.external_request', 'script.send_mail', 'script.scriptapp'].every(x => man.oauthScopes.some(o => o.endsWith('/' + x))));
  test('R4 ve skriptu není token ani e-mailová adresa (jen vlastnosti skriptu)', !/KNG_DISK_TOKEN\s*=|Bearer [A-Za-z0-9_-]{20,}/.test(gs)
    && !/[a-z0-9._-]+@[a-z0-9-]+\.[a-z]{2,}/i.test(gs.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')));
} catch (e) { fail++; console.log('FAIL výjimka', e && e.stack || e); }
console.log('\n#577 AS klient a sdílená pravidla: ' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
