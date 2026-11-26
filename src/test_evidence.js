/* Test jedné evidence a přehledů (S6 + S8, #613, 18. 11. 2026).
 *
 * Nástroje: roadmapa/roadmapa.py (--kontrola nového schématu, --migrace,
 * --zive, --hledej), nastroje/prehled_stavu.py (PREHLED.md + PREHLED.json),
 * nastroje/novinky.py (NOVINKY.md) a jeho napojení na release_odkaz.py.
 * Všechno nad umělými daty v dočasné složce — skutečný roadmap.json ani
 * repozitář se nemění. Ceny: umělá položka s částkou ověřuje, že se do
 * přehledu ani novinek nedostane.
 *
 * Pojistka (zapsaná v commitu): s kontrolou S6 vypnutou, s přehledem, který
 * vady ceny nefiltruje podle main, a s novinkami bez filtru částek test padá.
 */
const { spawnSync, execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : String(info).slice(0, 400)); }
};

const KOREN = path.join(__dirname, '..');
const ROADMAPA = path.join(KOREN, 'roadmapa', 'roadmapa.py');
const PREHLED = path.join(KOREN, 'nastroje', 'prehled_stavu.py');
const NOVINKY = path.join(KOREN, 'nastroje', 'novinky.py');
const RELEASE = path.join(KOREN, 'nastroje', 'release_odkaz.py');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kng-evidence-'));
const py = (args, env) => spawnSync('python3', ['-I', ...args], {
  encoding: 'utf-8', cwd: dir, env: Object.assign({}, process.env, env || {}) });

/* ---------------- roadmapa.py: kontrola nového schématu ---------------- */
const zaklad = () => ({
  meta: { vlny: [{ id: 'F' }, { id: 'G' }] },
  polozky: [
    { id: '1', vlna: 'G', stav: 'hotovo', nazev: 'stará hotová', hotovoV: 'v1.1.1' },
    { id: '2', vlna: 'G', stav: 'ceka', typ: 'ukol', nazev: 'úkol', cekaNa: 'J. V.: rozhodnout' },
    { id: '3', vlna: 'G', stav: 'ceka', typ: 'nalez', nazev: 'nález', kolo: 40, dopadCena: 'ano',
      alias: ['K40-N1'], verze: 'v3.1.1', vetev: 'claude/rychla-k40n1', cekaNa: 'J. V.: ověřit' },
    { id: '4', vlna: 'G', stav: 'hotovo', typ: 'davka', nazev: 'dávka', verze: 'v2.1.1', alias: ['C9'] },
  ],
});
const RM = path.join(dir, 'roadmap.json');
const kontrola = db => { fs.writeFileSync(RM, JSON.stringify(db, null, 1)); return py([ROADMAPA, '--soubor', RM, '--kontrola']); };

let r = kontrola(zaklad());
test('platná evidence projde kontrolou', r.status === 0, r.stdout);

const porusit = [
  ['neznámý typ', db => { db.polozky[1].typ = 'ukolek'; }, /neznámý typ/],
  ['nehotová bez typu', db => { delete db.polozky[1].typ; }, /nemá typ/],
  ['nehotová bez cekaNa', db => { delete db.polozky[1].cekaNa; }, /neříká, na co čeká/],
  ['cekaNa bez „kdo: “', db => { db.polozky[1].cekaNa = 'rozhodnutí J. V.'; }, /nezačíná/],
  ['nález bez kola', db => { delete db.polozky[2].kolo; }, /bez čísla kola/],
  ['kolo není číslo', db => { db.polozky[2].kolo = 'čtyřicet'; }, /není číslo/],
  ['hotová s typem bez verze', db => { delete db.polozky[3].verze; }, /nemá verzi/],
  ['verze ve špatném tvaru', db => { db.polozky[3].verze = '2.1.1'; }, /vDEN/],
  ['verze dávky malými písmeny', db => { db.polozky[3].verze = 'g1'; }, /vDEN/],
  ['verze dávky příliš dlouhá', db => { db.polozky[3].verze = 'UKLID1'; }, /vDEN/],
  ['větev s mezerou', db => { db.polozky[2].vetev = 'moje větev'; }, /není platné jméno/],
  ['dopadCena jen ano/ne', db => { db.polozky[2].dopadCena = 'možná'; }, /dopadCena/],
  ['alias u dvou položek', db => { db.polozky[3].alias = ['k40-n1']; }, /mají #3 i #4/],
  ['alias je číslo', db => { db.polozky[3].alias = ['#12']; }, /je číslo/],
  ['alias není seznam', db => { db.polozky[3].alias = 'C9'; }, /seznam/],
  ['nová značka není číslo', db => { db.polozky[1].id = 'B8'; }, /jen čísla/],
];
/* Dočasná značka dávky (svěřené G1-T1): „G1“ kontrolou projde. */
{
  const db = zaklad(); db.polozky[3].verze = 'G1';
  const v = kontrola(db);
  test('kontrola pustí dočasnou verzi dávky „G1“', v.status === 0, v.stdout);
}
/* TX-T1 (26. 11. 2026): i značka bez číslice („TX“) — pojistka: s regexem G1-T1 (\d{1,2}) FAIL. */
{
  const db = zaklad(); db.polozky[3].verze = 'TX';
  const v = kontrola(db);
  test('kontrola pustí dočasnou verzi dávky „TX“ (bez číslice)', v.status === 0, v.stdout);
}
porusit.forEach(([nazev, uprav, vzor]) => {
  const db = zaklad(); uprav(db);
  const v = kontrola(db);
  test('kontrola chytí: ' + nazev, v.status === 1 && vzor.test(v.stdout), v.stdout);
});

/* ---------------- --migrace: jen dotčené položky, idempotentní ---------------- */
const STARY = [
  '{',
  ' "polozky" : [',
  '  {',
  '   "id" : "10",',
  '   "vlna" : "G",',
  '   "stav" : "blokovano",',
  '   "nazev" : "stará blokovaná",',
  '   "cekaNa" : "rozhodnutí J. V. 23. 8. 2026"',
  '  },',
  '  {"id": "11", "vlna": "G", "stav": "hotovo", "nazev": "hotová   s mezerami", "hotovoV": "v1.1.1"},',
  '  {',
  '   "id" : "12",',
  '   "vlna" : "G",',
  '   "stav" : "ceka",',
  '   "nazev" : "čeká na integrátora",',
  '   "cekaNa" : "odpověď integrátora"',
  '  }',
  ' ],',
  ' "meta" : { "vlny" : [ { "id" : "G" } ] }',
  '}', ''].join('\n');
fs.writeFileSync(RM, STARY);
r = py([ROADMAPA, '--soubor', RM, '--kontrola']);
test('stará data bez typu kontrolou neprojdou', r.status === 1, r.stdout);
r = py([ROADMAPA, '--soubor', RM, '--migrace', '--nanecisto']);
test('migrace nanečisto nic nezapíše', fs.readFileSync(RM, 'utf8') === STARY && /2 položek/.test(r.stdout), r.stdout);
r = py([ROADMAPA, '--soubor', RM, '--migrace']);
const migr = fs.readFileSync(RM, 'utf8');
const dbM = JSON.parse(migr);
test('migrace doplní typ a sjednotí cekaNa', dbM.polozky[0].typ === 'ukol'
  && dbM.polozky[0].cekaNa === 'J. V.: rozhodnutí J. V. 23. 8. 2026'
  && dbM.polozky[2].cekaNa === 'integrátor: odpověď integrátora', JSON.stringify(dbM.polozky));
test('migrace nechá nedotčenou položku znak po znaku',
  migr.indexOf('  {"id": "11", "vlna": "G", "stav": "hotovo", "nazev": "hotová   s mezerami", "hotovoV": "v1.1.1"},') >= 0
  && migr.indexOf(' "meta" : { "vlny" : [ { "id" : "G" } ] }') >= 0, migr);
test('dotčená položka je po migraci na jednom řádku', /\n  \{"id": "10", [^\n]*"typ": "ukol"[^\n]*\},\n/.test(migr), migr);
r = py([ROADMAPA, '--soubor', RM, '--kontrola']);
test('po migraci kontrola projde', r.status === 0, r.stdout);
py([ROADMAPA, '--soubor', RM, '--migrace']);
test('migrace je idempotentní (druhý běh nic nezmění)', fs.readFileSync(RM, 'utf8') === migr);

/* ---------------- --zive a --hledej ---------------- */
fs.writeFileSync(RM, JSON.stringify(zaklad()));
r = py([ROADMAPA, '--soubor', RM, '--zive']);
test('živý výpis: jen nehotové položky s „čeká na“', r.status === 0 && /#2 \[úkol\]/.test(r.stdout)
  && /#3 \[nález; K40-N1; kolo 40; CENA; v3\.1\.1\]/.test(r.stdout) && !/#1 |#4 /.test(r.stdout)
  && /čeká na: J\. V\.: ověřit/.test(r.stdout) && /Nehotových položek: 2\./.test(r.stdout), r.stdout);
r = py([ROADMAPA, '--soubor', RM, '--zive', '--json']);
let js = null; try { js = JSON.parse(r.stdout); } catch (e) { /* níž */ }
test('živý výpis --json', js && js.length === 2 && js[1].alias[0] === 'K40-N1', r.stdout);
r = py([ROADMAPA, '--soubor', RM, '--hledej', 'k40-n1']);
test('--hledej najde položku podle staré značky', r.status === 0 && /^#3 /.test(r.stdout), r.stdout);
r = py([ROADMAPA, '--soubor', RM, '--hledej', 'B99']);
test('--hledej neznámou značku → kód 1', r.status === 1, r.stdout);

/* ---------------- prehled_stavu.py nad umělým gitem ---------------- */
const repo = path.join(dir, 'repo');
fs.mkdirSync(repo);
const g = (...a) => execFileSync('git', ['-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t',
  '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...a], { encoding: 'utf-8' });
const verzeCommit = v => { fs.writeFileSync(path.join(repo, 'verze.txt'), v + '\n'); g('add', 'verze.txt'); g('commit', '-q', '-m', v); };
g('init', '-q', '-b', 'main');
verzeCommit('1.1.1'); verzeCommit('2.1.1');
g('checkout', '-q', '-b', 'test');
verzeCommit('3.1.1'); verzeCommit('4.1.1');
const dbP = {
  meta: { vlny: [{ id: 'F' }, { id: 'G' }] },
  polozky: [
    { id: '20', vlna: 'G', stav: 'hotovo', typ: 'ukol', nazev: 'v main i testu', verze: 'v2.1.1' },
    { id: '21', vlna: 'G', stav: 'hotovo', typ: 'ukol', nazev: 'jen v testu', verze: 'v3.1.1' },
    { id: '22', vlna: 'G', stav: 'hotovo', nazev: 'stará jen v testu', hotovoV: 'v4.1.1 (větev x)' },
    { id: '23', vlna: 'G', stav: 'ceka', typ: 'nalez', kolo: 40, dopadCena: 'ano', alias: ['K40-N1'],
      verze: 'v3.1.1', nazev: 'vada ceny opravená v testu', cekaNa: 'J. V.: ověřit rozdíly' },
    { id: '24', vlna: 'G', stav: 'hotovo', typ: 'nalez', kolo: 30, dopadCena: 'ano', verze: 'v2.1.1',
      nazev: 'vada ceny opravená i v main' },
    { id: '25', vlna: 'G', stav: 'ceka', typ: 'nalez', kolo: 48, dopadCena: 'ne', nazev: 'vada dokumentu',
      cekaNa: 'J. V.: pokyn' },
    { id: '26', vlna: 'G', stav: 'ceka', typ: 'nalez', kolo: 49, dopadCena: 'ano', nazev: 'otevřená vada, sleva 12 500 Kč',
      cekaNa: 'koordinace: oprava' },
    { id: '27', vlna: 'G', stav: 'ceka', typ: 'otazka', nazev: 'otázka', cekaNa: 'J. V.: rozhodnout do 1 200 Kč' },
    { id: '28', vlna: 'G', stav: 'ceka', typ: 'ukol', nazev: 'pro kolegu', cekaNa: 'kolega: nahrát šablonu' },
    { id: '29', vlna: 'F', stav: 'blokovano', typ: 'ukol', nazev: 'odložená', cekaNa: 'J. V.: odloženo' },
  ],
};
const RMP = path.join(dir, 'roadmap_prehled.json');
fs.writeFileSync(RMP, JSON.stringify(dbP));
const VYS = path.join(dir, 'vystup');
fs.mkdirSync(VYS);
const prehled = (...a) => py([PREHLED, '--repo', repo, '--main', 'main', '--test', 'test', '--roadmapa', RMP, '--vystup', VYS, ...a]);
r = prehled();
test('přehled se vyrobí', r.status === 0, r.stdout + r.stderr);
const md = fs.existsSync(path.join(VYS, 'PREHLED.md')) ? fs.readFileSync(path.join(VYS, 'PREHLED.md'), 'utf8') : '';
let pj = null; try { pj = JSON.parse(fs.readFileSync(path.join(VYS, 'PREHLED.json'), 'utf8')); } catch (e) { /* níž */ }
test('PREHLED.json je platný JSON', !!pj);
pj = pj || { main: {}, test: {}, v_testu_ne_v_main: [], vady_ceny: [], ceka_na_jv: [] };
test('verze main a testu z git', pj.main.verze === 'v2.1.1' && pj.test.verze === 'v4.1.1'
  && /\*\*v2\.1\.1\*\*/.test(md) && /\*\*v4\.1\.1\*\*/.test(md), JSON.stringify([pj.main, pj.test]));
test('test je napřed o 2 commity', pj.test_navic_commitu === 2, pj.test_navic_commitu);
const ids = a => (a || []).map(d => d.id).sort().join(',');
test('v testu a ne v main: položky s verzí jen v historii testu (i stará s hotovoV)',
  ids(pj.v_testu_ne_v_main) === '21,22,23', ids(pj.v_testu_ne_v_main));
test('vady ceny: opravená jen v testu a otevřená; opravená v main a vada dokumentu ne',
  ids(pj.vady_ceny) === '23,26', ids(pj.vady_ceny));
const v23 = (pj.vady_ceny || []).find(d => d.id === '23') || {};
test('vada opravená v testu nese stav „opraveno v testu, v main ne“ a starou značku',
  /opraveno v testu \(v3\.1\.1\), v main ne/.test(v23.stav) && (v23.alias || [])[0] === 'K40-N1'
  && /#23 \(dřív K40-N1\)/.test(md), JSON.stringify(v23));
test('čeká na J. V.: jen J. V., bez odložené (vlna F jen počtem)',
  ids(pj.ceka_na_jv) === '23,25,27' && pj.ceka_na_jv_odlozene === 1 && /1 odložených/.test(md), ids(pj.ceka_na_jv));
test('přehled nenese částky (název i „čeká na“ s Kč → „…“)',
  !/Kč/.test(md) && !/Kč/.test(JSON.stringify(pj)) && /sleva …/.test(md), md.match(/.*sleva.*/));
test('PREHLED.md má všechny oddíly', ['## Verze', '## V testu, ještě ne v main', '## Otevřené vady s dopadem na cenu',
  '## Čeká na J. V.', '## Nehotové položky evidence'].every(h => md.indexOf(h) >= 0));
prehled();
const cti = f => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null);
test('přehled je deterministický (druhý běh stejný)', md !== '' && cti(path.join(VYS, 'PREHLED.md')) === md);
r = prehled('--kontrola');
test('--kontrola: zapsaný přehled odpovídá', r.status === 0 && /odpovídá stavu/.test(r.stdout), r.stdout);
verzeCommit('5.1.1');
r = prehled('--kontrola');
test('--kontrola: po posunu testu upozorní (kód 0)', r.status === 0 && /UPOZORNĚNÍ: PREHLED\.md neodpovídá/.test(r.stdout), r.stdout);
r = py([PREHLED, '--repo', repo, '--main', 'origin/main', '--test', 'test', '--roadmapa', RMP, '--vystup', VYS, '--kontrola']);
test('--kontrola bez reference main: jen poznámka (mělký checkout)', r.status === 0 && /Poznámka/.test(r.stdout), r.stdout);
r = prehled('--neznama');
test('neznámá volba → kód 2', r.status === 2);

/* ---------------- novinky.py ---------------- */
const CL = path.join(dir, 'CHANGELOG.md');
fs.writeFileSync(CL, ['# Změny', '',
  '## v5.1.1 — pátá', '', '- **Pátá novinka z CHANGELOG.** Text.', '',
  '## v4.1.1 — čtvrtá', '', '- **Čtvrtá novinka z CHANGELOG.** Text.', '- **Sleva 3 000 Kč.** Nesmí ven.', '',
  '## v3.1.1 — třetí', '', '- **Třetí novinka z CHANGELOG.** Text.', '',
  '## v2.1.1 — druhá', '', '- **Druhá — nesmí se objevit.** Text.', ''].join('\n'));
const dbN = { meta: {}, polozky: [
  { id: '40', stav: 'hotovo', typ: 'ukol', verze: 'v5.1.1', dulezitost: 'vysoka', nazev: 'technický název',
    novinka: 'Přehled stavu je v souboru PREHLED.md', jinak: 'Po sloučení do main číst NOVINKY.md' },
  { id: '41', stav: 'hotovo', typ: 'nalez', kolo: 40, verze: 'v4.1.1', nazev: 'Oprava skla po přepnutí typu' },
  { id: '42', stav: 'hotovo', verze: 'v3.1.1', nazev: 'K39: opravy kola 39' },
  { id: '43', stav: 'hotovo', typ: 'ukol', verze: 'v2.1.1', nazev: 'Mimo rozsah — nesmí se objevit' },
  { id: '44', stav: 'hotovo', typ: 'ukol', verze: 'v4.1.1', nazev: 'Nová sleva 7 900 Kč' },
  { id: '45', stav: 'ceka', typ: 'ukol', verze: 'v5.1.1', nazev: 'Nehotová — nesmí se objevit', cekaNa: 'J. V.: x' },
] };
const RMN = path.join(dir, 'roadmap_novinky.json');
fs.writeFileSync(RMN, JSON.stringify(dbN));
const novinky = (...a) => py([NOVINKY, '--changelog', CL, '--roadmapa', RMN, ...a]);
r = novinky('2.1.1', '5.1.1');
const odr = (r.stdout || '').split('\n').filter(l => l.startsWith('- '));
test('novinky: kód 0 a nadpis s verzí', r.status === 0 && /^# Novinky v5\.1\.1\n/.test(r.stdout), r.stdout + r.stderr);
test('novinky: 5–10 řádků', odr.length >= 5 && odr.length <= 10, odr.length);
test('novinky: Nové z pole `novinka`, Opraveno z nálezu i staré opravy kola, Jinak z pole `jinak`',
  odr.some(l => l === '- Nové: Přehled stavu je v souboru PREHLED.md.')
  && odr.some(l => l === '- Opraveno: Oprava skla po přepnutí typu.') && odr.some(l => /^- Opraveno: K39/.test(l))
  && odr.some(l => l === '- Jinak: Po sloučení do main číst NOVINKY.md.'), odr.join('\n'));
test('novinky: rozsah bez <od> a bez nehotových', !/nesmí se objevit/.test(r.stdout), r.stdout);
test('novinky: bez cen', !/Kč/.test(r.stdout), r.stdout);
test('novinky: doplněno z CHANGELOG, když evidence nestačí', odr.some(l => /CHANGELOG/.test(l)), odr.join('\n'));
r = novinky('5.1.1', '2.1.1');
test('novinky: obrácený rozsah → kód 2', r.status === 2, r.stdout);
r = novinky('1.1.1', '5.1.1');
test('novinky: neznámá verze → kód 2', r.status === 2, r.stdout);
const NOV = path.join(dir, 'NOVINKY.md');
r = novinky('2.1.1', '5.1.1', '--zapsat', '--vystup', NOV);
test('novinky --zapsat vyrobí soubor', r.status === 0 && fs.existsSync(NOV), r.stdout);
/* Revize koordinace S2 (G1-T1): dočasná značka dávky v hotové položce → chyba novinky.py i release --od */
const RMG = path.join(dir, 'roadmap_g1.json');
fs.writeFileSync(RMG, JSON.stringify({ meta: {}, polozky: dbN.polozky.concat([{ id: '46', stav: 'hotovo', typ: 'ukol', verze: 'G1', nazev: 'Dávka bez čísla' }]) }));
r = py([NOVINKY, '--changelog', CL, '--roadmapa', RMG, '2.1.1', '5.1.1']);
test('novinky: dočasná značka „G1“ → kód 2 a „přepsat značku dávky na číslo verze“',
  r.status === 2 && /přepsat značku dávky na číslo verze/.test(r.stdout) && /#46 \(G1\)/.test(r.stdout), r.stdout + r.stderr);

/* ---------------- release_odkaz.py z téhož textu ---------------- */
const rel = (...a) => py([RELEASE, '--changelog', CL, ...a], { KNG_TAGY: '', KNG_VERZE_MAIN: '' });
r = rel('5.1.1', '--jen-text');
test('release: s NOVINKY.md stejné verze začíná popis jejími odrážkami',
  /^### Pro uživatele\n- Nové: Přehled stavu/.test(r.stdout)
  && odr.every(l => r.stdout.indexOf(l) >= 0), r.stdout);
r = rel('4.1.1', '--jen-text');
test('release: NOVINKY.md jiné verze se nepoužije', r.status === 0 && !/Pro uživatele/.test(r.stdout), r.stdout);
fs.unlinkSync(NOV);
fs.mkdirSync(path.join(dir, 'roadmapa'));
fs.copyFileSync(RMN, path.join(dir, 'roadmapa', 'roadmap.json'));
r = rel('5.1.1', '--jen-text', '--od', '3.1.1');
test('release --od: popis z novinky.py <od> <verze>', /^### Pro uživatele\n/.test(r.stdout)
  && /Opraveno: Oprava skla/.test(r.stdout) && !/K39/.test(r.stdout) && !/Kč/.test(r.stdout), r.stdout);
r = rel('5.1.1', 'a'.repeat(40), '--od', '3.1.1');
let body = '';
try { body = new URL(r.stdout.trim()).searchParams.get('body') || ''; } catch (e) { /* níž */ }
test('release --od: odkaz nese novinky v `body`', /Pro uživatele/.test(body) && /Přehled stavu/.test(body), r.stdout + r.stderr);
fs.copyFileSync(RMG, path.join(dir, 'roadmapa', 'roadmap.json'));
r = rel('5.1.1', '--jen-text', '--od', '3.1.1');
test('release --od: dočasná značka „G1“ v roadmapě → kód 2, přepsat značku', r.status === 2 && /přepsat značku dávky na číslo verze/.test(r.stdout), r.stdout + r.stderr);
fs.copyFileSync(RMN, path.join(dir, 'roadmapa', 'roadmap.json'));

/* ---------------- archiv hotových položek (#642, 22. 11. 2026) ----------------
 * `--archivuj` přesune hotové položky dokončené před víc než 60 dny do
 * `<jméno>_archiv.json` vedle zdroje; `--kontrola` vidí obojí (čísla se
 * nerecyklují, závislost na archivu není viselec), `--hledej` hledá i v
 * archivu a stránka se vyrábí z obojího. Vlastní podsložka, ať archiv
 * nepotká ostatní umělé soubory. */
const dirA = path.join(dir, 'archiv');
fs.mkdirSync(dirA);
const RA = path.join(dirA, 'roadmap.json');
const RAA = path.join(dirA, 'roadmap_archiv.json');
const ZIVY = [
  '{',
  ' "polozky" : [',
  '  {',
  '   "id" : "50",',
  '   "vlna" : "G",',
  '   "stav" : "hotovo",',
  '   "nazev" : "stará hotová (verze)",',
  '   "hotovoV" : "v1.8.2"',
  '  },',
  '  {"id": "51", "vlna": "G", "stav": "ceka", "typ": "ukol", "nazev": "otevřená stará", "cekaNa": "J. V.: rozhodnout", "zavisi": [{"id": "50", "typ": "tvrda", "proc": ""}]},',
  '  {"id": "52", "vlna": "G", "stav": "hotovo", "nazev": "stará hotová (datum)", "hotovoV": "zrušeno 3. 8. 2026"},',
  '  {"id": "53", "vlna": "G", "stav": "hotovo", "nazev": "čerstvá hotová", "hotovoV": "v20.11.1"},',
  '  {"id": "54", "vlna": "G", "stav": "hotovo", "nazev": "hotová bez data", "hotovoV": "hotovo"},',
  '  {"id": "55", "vlna": "G", "stav": "hotovo", "typ": "nalez", "kolo": 30, "alias": ["K30-N1"], "nazev": "starý nález", "verze": "v24.9.1"}',
  ' ],',
  ' "meta" : { "vlny" : [ { "id" : "G" } ] }',
  '}', ''].join('\n');
fs.writeFileSync(RA, ZIVY);
r = py([ROADMAPA, '--soubor', RA, '--archivuj', '--k', '22.11.2026', '--nanecisto']);
test('archivace nanečisto nic nezapíše', r.status === 0 && /2 položek/.test(r.stdout)
  && fs.readFileSync(RA, 'utf8') === ZIVY && !fs.existsSync(RAA), r.stdout);
r = py([ROADMAPA, '--soubor', RA, '--archivuj', '--k', '22.11.2026']);
const zivyPo = fs.readFileSync(RA, 'utf8');
let archPo = null; try { archPo = JSON.parse(fs.readFileSync(RAA, 'utf8')); } catch (e) { /* níž */ }
test('archivace přesune jen hotové starší 60 dní (verze i datum v hotovoV)', r.status === 0 && archPo
  && archPo.polozky.map(p => p.id).join(',') === '50,52'
  && JSON.parse(zivyPo).polozky.map(p => p.id).join(',') === '51,53,54,55', r.stdout);
test('archivace nechá zbylé položky a meta znak po znaku',
  zivyPo.indexOf(ZIVY.split('\n')[9]) >= 0 && zivyPo.indexOf(ZIVY.split('\n')[11]) >= 0
  && zivyPo.indexOf(' "meta" : { "vlny" : [ { "id" : "G" } ] }') >= 0 && /^\{\n "polozky" : \[\n  \{"id": "51"/.test(zivyPo), zivyPo);
test('archivovaná položka je v archivu beze změny', archPo && archPo.polozky[0].hotovoV === 'v1.8.2'
  && archPo.polozky[0].nazev === 'stará hotová (verze)', JSON.stringify(archPo));
r = py([ROADMAPA, '--soubor', RA, '--kontrola']);
test('po archivaci kontrola projde (závislost na archivované položce není viselec)',
  r.status === 0 && /4 položek \+ 2 v archivu/.test(r.stdout), r.stdout);
r = py([ROADMAPA, '--soubor', RA, '--hledej', '50']);
test('--hledej najde položku i v archivu', r.status === 0 && /^#50 /.test(r.stdout), r.stdout);
const dbA = JSON.parse(zivyPo);
dbA.polozky.push({ id: '52', vlna: 'G', stav: 'ceka', typ: 'ukol', nazev: 'recyklované číslo', cekaNa: 'J. V.: x' });
fs.writeFileSync(RA, JSON.stringify(dbA));
r = py([ROADMAPA, '--soubor', RA, '--kontrola']);
test('kontrola chytí číslo použité znovu (je v archivu)', r.status === 1 && /id 52 je použité dvakrát/.test(r.stdout), r.stdout);
dbA.polozky.pop(); dbA.polozky[0].zavisi = [{ id: '49', typ: 'tvrda', proc: '' }];
fs.writeFileSync(RA, JSON.stringify(dbA));
r = py([ROADMAPA, '--soubor', RA, '--kontrola']);
test('kontrola dál chytí viselce (ani v archivu není)', r.status === 1 && /#51 závisí na #49/.test(r.stdout), r.stdout);
dbA.polozky[0].zavisi = [];
fs.writeFileSync(RA, JSON.stringify(dbA));
const archZly = JSON.parse(JSON.stringify(archPo || { polozky: [{}, {}] }));
archZly.polozky[1].stav = 'ceka'; archZly.polozky[1].typ = 'ukol'; archZly.polozky[1].cekaNa = 'J. V.: x';
fs.writeFileSync(RAA, JSON.stringify(archZly));
r = py([ROADMAPA, '--soubor', RA, '--kontrola']);
test('kontrola chytí nehotovou položku v archivu', r.status === 1 && /#52 je v archivu, ale není hotová/.test(r.stdout), r.stdout);
fs.writeFileSync(RAA, JSON.stringify(archPo));
r = py([ROADMAPA, '--soubor', RA, '--archivuj', '--k', '22.11.2026']);
test('druhá archivace nic nepřesune (idempotentní)', r.status === 0 && /0 položek/.test(r.stdout)
  && JSON.parse(fs.readFileSync(RAA, 'utf8')).polozky.length === 2, r.stdout);
r = py([ROADMAPA, '--soubor', RA, '--archivuj', '--k', '25.11.2026']);
test('další archivace připojí do existujícího archivu', r.status === 0
  && JSON.parse(fs.readFileSync(RAA, 'utf8')).polozky.map(p => p.id).join(',') === '50,52,55'
  && JSON.parse(fs.readFileSync(RA, 'utf8')).polozky.map(p => p.id).join(',') === '51,53,54', r.stdout);
r = py([ROADMAPA, '--soubor', RA, '--hledej', 'K30-N1']);
test('--hledej najde v archivu i podle aliasu', r.status === 0 && /^#55 /.test(r.stdout), r.stdout);

fs.rmSync(dir, { recursive: true, force: true });
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
