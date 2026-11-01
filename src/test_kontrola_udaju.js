/* ROZSAH STATICKÉ KONTROLY OSOBNÍCH ÚDAJŮ (K6-W2, dávka D3 21. 10. 2026).
 *
 * nastroje/kontrola_udaju.py nečetla podklady/ ani .claude/ — e-mail,
 * telefon i token v předávkách, auditech a datech kokpitu prošly jako čisté.
 * Test se ptá samotného skriptu (funkce soubory()), co čte, a ověří, že
 * vzorový token ve skillu by kontrola chytila. Žádný soubor nezapisuje. */
const path = require('path');
const { spawnSync } = require('child_process');
const KOREN = path.join(__dirname, '..');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 300)); }
};
const py = (kod) => spawnSync('python3', ['-I', '-c', 'import sys; sys.path.insert(0, "nastroje"); import kontrola_udaju as K\n' + kod],
  { cwd: KOREN, encoding: 'utf8' });

const r = py('import os\nfor c in K.soubory(): print(os.path.relpath(c, K.KOREN).replace(os.sep, "/"))');
const cte = (r.stdout || '').split('\n').filter(Boolean);
test('skript vypíše čtené soubory', r.status === 0 && cte.length > 100, r.stderr);
test('K6-W2: čte podklady/', cte.some(f => f.startsWith('podklady/')), cte.filter(f => /^podklady/.test(f)).length);
test('K6-W2: čte .claude/ (skill kokpitu i jeho šablonu)', cte.includes('.claude/skills/kokpit-koordinace/SKILL.md')
  && cte.includes('.claude/skills/kokpit-koordinace/kokpit_sablona.html'));
test('src/ a nastroje/ čte dál', cte.includes('src/objednane.js') && cte.includes('nastroje/kontrola_udaju.py'));
/* Vzorek tokenu tvaru GitHub (smyšlený, skládá se až za běhu, aby sám test
 * nebyl nálezem) — kontrola ho musí poznat. */
const t = py('vzor = "gh" + "p_" + "A" * 36\nprint(any(r.search(vzor) for _, r in K.TAJEMSTVI))');
test('token tvaru ghp_… kontrola pozná', (t.stdout || '').trim() === 'True', t.stderr);
/* K7-W5 (#507): token Pipedrive v adrese i v hlavičce (smyšlený, skládá se za běhu). */
const pd = py('h = "ab12" * 10\nvz = ["https://x.pipedrive.com/api/v1/deals?api" + "_token=" + h, "headers: { \'x-api" + "-token\': \'" + h + "\' }", "api" + "_token=kratky"]\n'
  + 'print([any(r.search(v) for _, r in K.TAJEMSTVI) for v in vz])');
test('K7-W5: token Pipedrive v adrese i v hlavičce kontrola pozná, krátký text ne',
  (pd.stdout || '').trim() === '[True, True, False]', [pd.stdout, pd.stderr]);

/* K7-W1 (#508): sdílecí odkaz na sezení Claude Code (smyšlený, skládá se za běhu). Před doplněním
 * vzoru 1 FAIL ([False, False, False]), po něm OK. Zmínka bez ID („cshk_…") nálezem není. */
const sh = py('vz = ["https://claude.ai/code/" + "cshk" + "_" + "Ab3dE5fG7h", "claude.ai/code/" + "cshk" + "_\u2026", "https://claude.ai/code/session_01ABCDEFGH"]\n'
  + 'print([any(r.search(v) for _, r in K.TAJEMSTVI) for v in vz])');
test('K7-W1: sdílecí odkaz claude.ai/code/cshk_<id> kontrola pozná, zmínku bez ID a ID sezení ne',
  (sh.stdout || '').trim() === '[True, False, False]', [sh.stdout, sh.stderr]);

/* K8-W4 + SEC-N4 (#514, audity K8 a S1 24. 10. 2026): další tvary tajemství
 * (smyšlené, skládané za běhu, aby sám test nebyl nálezem). Před opravou
 * [False × 9], po ní všechny True; poslední dva řádky nálezem nejsou. */
const dalsi = py('h = "ab12" * 10\n'
  + 'vz = ["\\"api" + "_token\\": \\"" + h + "\\"", "PIPEDRIVE_API" + "_TOKEN=" + h, "api" + "_token: \'" + h + "\'",'
  + ' "\\"api" + "Token\\": \\"" + h + "\\"", "PIPEDRIVE_API" + "_TOKEN: " + h, "x?api" + "_token%3D" + h,'
  + ' "github" + "_pat_" + "A1" * 15, "sk-" + "ant-" + "api03-" + "B2" * 12, "https://claude.ai/" + "share/" + "0f1e2d3c-4b5a",'
  + ' "api" + "_token=kratky", "PIPEDRIVE_API" + "_TOKEN = process.env.X"]\n'
  + 'print([any(r.search(v) for _, r in K.TAJEMSTVI) for v in vz])');
test('K8-W4/SEC-N4: JSON, YAML, bez uvozovek, apiToken, %3D, github_pat_, sk-ant-, claude.ai/share; krátký text a env ne',
  (dalsi.stdout || '').trim() === '[True, True, True, True, True, True, True, True, True, False, False]', [dalsi.stdout, dalsi.stderr]);
const tel = py('vz = ["tel. 6" + "02-590-945", "+42" + "1 905 123 456", "+42" + "1905123456", "rok 2026-10-24", "+420 6" + "02 590 945"]\n'
  + 'print([any(r.search(v) for r in (K.TELEFON_POMLCKY, K.TELEFON_ZAHR)) for v in vz])');
test('SEC-N4: telefon s pomlčkami a +421 pozná, datum ne (+420 hlídá dosavadní vzor)',
  (tel.stdout || '').trim() === '[True, True, True, False, False]', [tel.stdout, tel.stderr]);
test('SEC-N4: čte .patch, .xlsx, .csv a .env (přípony)', /'\.patch'/.test(py('print(K.PRIPONY + K.ZIP_PRIPONY)').stdout)
  && cte.includes('podklady/PIPEDRIVE_UPRAVY_SERVERU_2026-09-22.patch') && cte.some(f => /^podklady\/controlling\/UKAZKA_2026-CONTROLLING-EXPORT_v[\d.]+\.xlsx$/.test(f))
  && /'\.csv'/.test(py('print(K.PRIPONY)').stdout) && /'\.env'/.test(py('print(K.PRIPONY)').stdout));
/* Sešit Office: e-mail uvnitř sharedStrings.xml kontrola přečte (dočasný soubor mimo repo). */
const os = require('os'), fs = require('fs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ku-'));
const xl = py('import zipfile\nz = zipfile.ZipFile(' + JSON.stringify(path.join(tmp, 'a.xlsx')) + ', "w")\n'
  + 'z.writestr("xl/sharedStrings.xml", "<sst><si><t>skutecny" + "@" + "neznama-firma.cz</t></si></sst>")\nz.close()\n'
  + 'print("@neznama-firma.cz" in K.precti(' + JSON.stringify(path.join(tmp, 'a.xlsx')) + '))');
fs.rmSync(tmp, { recursive: true, force: true });
test('K8-W4: e-mail v .xlsx (sharedStrings) kontrola přečte', (xl.stdout || '').trim() === 'True', [xl.stdout, xl.stderr]);
/* SEC-N4: celou doménou jen rezervované/zkušební domény. */
const dom = py('e, d, t = K.nacti_povolene()\nprint(sorted(d))');
test('SEC-N4: celodoménově povoleno jen example.com, priklad.cz, zkusebni.cz',
  (dom.stdout || '').trim() === "['example.com', 'priklad.cz', 'zkusebni.cz']", dom.stdout);

/* SEC-N5 (#514): .gitignore nepustí .env, kořenové exporty ani seznam negativní
 * kontroly — a ukázkový sešit v podklady/ukazky/ dál verzuje. Před opravou FAIL. */
const ign = (f) => spawnSync('git', ['check-ignore', '-q', f], { cwd: KOREN }).status === 0;
test('SEC-N5: .gitignore zná .env, .env.local, cenik.xlsx, nabidka.docx, export.csv, negativni_kontrola.json',
  ['.env', '.env.local', 'cenik.xlsx', 'nabidka.docx', 'export.csv', 'negativni_kontrola.json'].every(ign),
  ['.env', '.env.local', 'cenik.xlsx', 'nabidka.docx', 'export.csv', 'negativni_kontrola.json'].filter(f => !ign(f)));
/* #540: stará ukázka v podklady/ukazky/ smazána — hlídá se nová v podklady/controlling/ a sešit v podklady/ukazky/ obecně. */
test('SEC-N5: ukázkové sešity v podklady/ukazky/ a podklady/controlling/ se neignorují', !ign('podklady/ukazky/ukazka.xlsx')
  && !ign('podklady/controlling/UKAZKA_2026-CONTROLLING-EXPORT_v1.1.1.xlsx'));

/* SEC-M11 (#542, security test SEC-M 28. 10. 2026): mezery detekce. Každý případ
 * v čerstvém dočasném stromu (kopie nástroje a povoleného seznamu, mimo Git —
 * soubory() pak čte celý strom) s JEDNÍM smyšleným údajem složeným za běhu.
 * Před opravou 10 z 11 FAIL (kód 0), po ní kód 1 u všech; čistý strom 0. */
const A36 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJ', HEX40 = ('0123456789abcdef'.repeat(3)).slice(0, 40);
const GH = 'gh' + 'p_' + A36, NPM = 'np' + 'm_' + A36;
const JWT = 'ey' + 'JhbGciOiJIUzI1NiJ9.' + 'ey' + 'JzdWIiOiJwb2t1cyJ9.' + 'c2lnbmF0dXJhLXBva3VzLXNt';
const mezera = (rel, obsah) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ku-m11-'));
  try {
    fs.mkdirSync(path.join(d, 'nastroje'));
    for (const f of ['kontrola_udaju.py', 'povolene_kontakty.txt']) fs.copyFileSync(path.join(KOREN, 'nastroje', f), path.join(d, 'nastroje', f));
    if (rel) { fs.mkdirSync(path.dirname(path.join(d, rel)), { recursive: true }); fs.writeFileSync(path.join(d, rel), obsah); }
    return spawnSync('python3', ['-I', path.join(d, 'nastroje', 'kontrola_udaju.py')], { encoding: 'utf8' }).status;
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
};
test('SEC-M11: čistý dočasný strom → kód 0 (test měří)', mezera(null) === 0);
for (const [n, rel, obsah] of [
  ['nová kořenová složka', 'novaslozka/poznamka.md', 'token: ' + GH + '\n'],
  ['kořenový .npmrc s _authToken', '.npmrc', '//registry.npmjs.org/:_auth' + 'Token=' + NPM + '\n'],
  ['vzor npm_', 'src/x.js', "const t = '" + NPM + "';\n"],
  ['soubor bez přípony (Makefile)', 'Makefile', 'TOKEN=' + GH + '\n'],
  ['přípona .ts', 'src/x.ts', "const t = '" + GH + "';\n"],
  ['JWT', 'src/x.js', "const jwt = '" + JWT + "';\n"],
  ['klíč Google AIza', 'src/x.js', "const k = '" + 'AI' + 'za' + 'SyA' + A36.slice(0, 32) + "';\n"],
  ['klíč sk-proj-', 'src/x.js', "const k = '" + 's' + 'k-proj-' + A36 + A36 + "';\n"],
  ['40 hex v konstantě s názvem klíče', 'netlify/x.mjs', "const PD_KLIC = '" + HEX40 + "';\n"],
  ['hex ve „zkušební" hodnotě process.env', 'netlify/y.mjs', "process.env.PIPEDRIVE_API_TOKEN = 'pokus" + HEX40 + "';\n"],
]) test('SEC-M11: ' + n + ' → nález (kód 1)', mezera(rel, obsah) === 1);
test('SEC-M11: binární soubor s NUL se přeskočí (žádný nález ani pád)', mezera('obr.png', Buffer.concat([Buffer.from([0x89, 0, 0, 0]), Buffer.from(GH)])) === 0);
/* SEC-M1: výpis nálezu tajemství ho celé neopakuje (log Actions je veřejný). */
const mk = py('import re\nprint(K.maskuj("x " + "gh" + "p_" + "B" * 36 + " y", K.TAJEMSTVI[1][1]))');
test('SEC-M1: maskuj() ukáže jen začátek tokenu', /skryto/.test(mk.stdout) && !/B{20}/.test(mk.stdout), mk.stdout);

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
if (fail) process.exit(1);
