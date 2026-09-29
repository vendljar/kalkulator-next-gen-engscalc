/* ============================================================
 * PŘESKOČENÝ HARNESS NENÍ „PROŠLO" (nálezy T2, T3 a T5 revize v22.9.9,
 * 22. 9. 2026)
 *
 * T3: harness bez firemního podkladu (šablony, příručka) končil kódem 0,
 *     takže CI psalo „OK" a `spust_testy.sh` „✓ prošlo". Souhrn hlásil
 *     „všechny prošly", zatímco pět harnessů v CI nikdy neběželo.
 * T2: `overit_sablony_online.mjs` pouští pět kontrol PŘED přeskočením —
 *     a přeskočení je přebilo: i se selháním skončil kódem 0.
 * T5: kód 2 (chybí playwright) se nepočítal nikam a harness, který
 *     playwright importuje (ESM ignoruje NODE_PATH), padal jako selhání.
 *
 * Sada nezkouší text skriptů, ale jejich CHOVÁNÍ: spouští skutečné
 * `preskoc()`, skutečný blok z CI (vyňatý z .github/workflows/testy.yml)
 * a skutečnou funkci `spust_prohlizec` ze `spust_testy.sh` nad podstrčenými
 * harnessy s danými návratovými kódy.
 * ============================================================ */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const KOREN = path.resolve(__dirname, '..');
let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

/* ---------- 1) preskoc(): kód 4, a 1 při dřívějším selhání ---------- */
const PODKLADY = path.join(KOREN, 'nastroje/harness_podklady.mjs');
function preskocS(argumenty) {
  const kod = "import { preskoc } from " + JSON.stringify(PODKLADY) + "; preskoc(" + argumenty + ");";
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', kod], { encoding: 'utf8' });
  return { kod: r.status, vystup: String(r.stdout || '') + String(r.stderr || '') };
}
{
  const a = preskocS("'šablona X', ['/nikde']");
  test('T3: přeskočení končí vlastním kódem 4, ne 0', a.kod === 4, a);
  test('T3: a řekne, co chybí a kde se hledalo', /PŘESKOČENO – chybí: šablona X\./.test(a.vystup)
    && /\/nikde/.test(a.vystup), a.vystup);
  const b = preskocS("'šablona X', ['/nikde'], { ok: 3, fail: 0 }");
  test('T2: po zelených kontrolách je to pořád přeskočení (4)', b.kod === 4, b);
  test('T2: a řekne, kolik kontrol před ním prošlo', /3 prošlo, 0 selhalo/.test(b.vystup), b.vystup);
  const c = preskocS("'šablona X', ['/nikde'], { ok: 3, fail: 2 }");
  test('T2: selhání před přeskočením = selhání harnessu (kód 1)', c.kod === 1, c);
  test('T2: a řekne proč', /SELHALO 2 z 5/.test(c.vystup), c.vystup);
}

/* ---------- 2) harness s kontrolami PŘED přeskočením předává svůj stav ----------
 * Jinak by se T2 vrátilo s prvním dalším harnessem, který si kontrolu
 * přidá nad `preskoc(…)`. */
{
  const harnessy = fs.readdirSync(KOREN).filter(f => /^overit_.*\.mjs$/.test(f));
  const sKontrolouPred = [];
  harnessy.forEach(f => {
    const kod = fs.readFileSync(path.join(KOREN, f), 'utf8').split('\n')
      .filter(l => !/^\s*(\*|\/\*|\/\/)/.test(l)).join('\n');
    const iPresk = kod.search(/\bpreskoc\(/);
    if (iPresk < 0) return;
    const iTest = kod.search(/\btest\(\s*['"`]/);
    if (iTest < 0 || iTest > iPresk) return;
    sKontrolouPred.push(f);
    const volani = kod.slice(iPresk, kod.indexOf(';', iPresk) + 1);
    test('T2: ' + f + ' kontroluje před přeskočením, tak mu předává svůj stav { ok, fail }',
      /\{\s*ok\s*,\s*fail\s*\}/.test(volani), volani);
  });
  test('T2: hlídač opravdu něco měří (overit_sablony_online má kontroly před přeskočením)',
    sKontrolouPred.indexOf('overit_sablony_online.mjs') >= 0, sKontrolouPred);
}

/* ---------- 3) CI a testovací kolo: přeskočení se hlásí i v GitHub Actions ----------
 * Do 26. 9. 2026 měl workflow vlastní smyčku přes harnessy a tenhle oddíl ji
 * pouštěl s podstrčenými harnessy. Od té doby (A5) workflow jen volá
 * nastroje/testovaci_kolo.sh a harnessy pouští spust_testy.sh --smoke —
 * mechaniku přeskočení (kódy 4 a 2, PŘESKOČENO místo prošlo) hlídá oddíl 4
 * na skutečné funkci spust_prohlizec. Tady se hlídá, co by jinak mohlo tiše
 * zmizet: že CI kolo opravdu volá (a nemá vlastní seznam), že kolo pouští
 * harnessy globem přes spust_testy.sh --smoke a že přeskočené sady vypíše
 * jmenovitě i jako upozornění běhu (::warning) — přeskočená kontrola,
 * o které se mlčí, je totéž co kontrola, která neexistuje (T3). */
function podstrcHarnessy(dir, kody) {
  Object.entries(kody).forEach(([jmeno, kod]) => {
    const telo = kod === 'playwright'
      ? "console.error(\"Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'playwright' imported from x\"); process.exit(1);"
      : 'console.log("harness ' + jmeno + '"); process.exit(' + kod + ');';
    fs.writeFileSync(path.join(dir, jmeno), telo);
  });
}
{
  const yml = fs.readFileSync(path.join(KOREN, '.github/workflows/testy.yml'), 'utf8');
  const kolo = fs.readFileSync(path.join(KOREN, 'nastroje/testovaci_kolo.sh'), 'utf8');
  test('T3: CI volá testovací kolo (--bez-mutaci = sady i harnessy)',
    /run: bash nastroje\/testovaci_kolo\.sh --bez-mutaci/.test(yml));
  test('T3: CI nemá vlastní smyčku přes harnessy ani vlastní výčet sad',
    !/for f in overit_\*\.mjs/.test(yml) && !/bash \.\/spust_testy\.sh/.test(yml));
  test('T3: kolo pouští harnessy globem přes spust_testy.sh --smoke',
    /^\s*bash \.\/spust_testy\.sh --smoke/m.test(kolo));
  test('T3: kolo vypíše přeskočené sady jmenovitě a v GitHub Actions i jako ::warning',
    /Přeskočené sady \(nic neověřily\)/.test(kolo) && /GITHUB_ACTIONS/.test(kolo)
    && /::warning[^\n]*[Pp]řeskočen/.test(kolo));
  test('T3: souhrn kola přebírá počet přeskočených ze spust_testy.sh (nikdy je nepočítá jako prošlé)',
    /prošlo, \[0-9\]\* selhalo, \[0-9\]\* přeskočeno/.test(kolo));
}

/* ---------- 4) spust_testy.sh --smoke — skutečná funkce spust_prohlizec ---------- */
function funkceZeSkriptu() {
  const sh = fs.readFileSync(path.join(KOREN, 'spust_testy.sh'), 'utf8');
  const i = sh.indexOf('spust_prohlizec() {');
  const j = sh.indexOf('\n}\n', i);
  return (i >= 0 && j > i) ? sh.slice(i, j + 3) : null;
}
{
  const fce = funkceZeSkriptu();
  test('T5: funkce spust_prohlizec se ve skriptu našla', !!fce);
  if (fce) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kng-sh-'));
    fs.mkdirSync(path.join(dir, 'src'));
    podstrcHarnessy(dir, { 'overit_ok.mjs': 0, 'overit_podklad.mjs': 4, 'overit_pw.mjs': 2,
                           'overit_esm.mjs': 'playwright', 'overit_chyba.mjs': 1 });
    const skript = 'proslo=0; selhalo=0; preskoceno=0; seznam_selhani=(); seznam_preskocenych=()\n'
      + fce + '\n'
      + 'for f in overit_ok.mjs overit_podklad.mjs overit_pw.mjs overit_esm.mjs overit_chyba.mjs; do spust_prohlizec "$f"; done\n'
      + 'echo "SOUCET $proslo/$selhalo/$preskoceno"\n'
      + 'printf "PRESK:%s\\n" "${seznam_preskocenych[@]}"\n'
      + 'printf "SELH:%s\\n" "${seznam_selhani[@]}"\n';
    const r = spawnSync('bash', ['-c', skript], { cwd: path.join(dir, 'src'), encoding: 'utf8' });
    fs.rmSync(dir, { recursive: true, force: true });
    const v = String(r.stdout || '');
    test('T3/T5: prošlo 1, selhalo 1, přeskočeno 3', /SOUCET 1\/1\/3/.test(v), v);
    test('T3: kód 4 = přeskočeno s důvodem „chybí firemní podklad"',
      /PRESK:overit_podklad\.mjs \(chybí firemní podklad/.test(v), v);
    test('T5: kód 2 se počítá do přeskočených', /PRESK:overit_pw\.mjs \(chybí playwright\)/.test(v), v);
    test('T5: ESM harness bez playwrightu je přeskočení, ne selhání',
      /PRESK:overit_esm\.mjs \(chybí playwright\)/.test(v) && !/SELH:overit_esm/.test(v), v);
    test('T5: a rada už neposílá na npm i -g', !/npm i -g/.test(fce));
    test('T5: skutečné selhání zůstává selháním', /SELH:overit_chyba\.mjs/.test(v), v);
  }
}

/* ---------- nejnovější verze šablony (23. 9. 2026) ----------
 * Harness šablony CN bere soubor s nejvyšším číslem verze. „v10" musí
 * porazit „v9" jako číslo, ne jako text, a KNG_PODKLADY má přednost. */
{
  const fs = require('fs'), os = require('os');
  const d1 = fs.mkdtempSync(path.join(os.tmpdir(), 'kng-sab-'));
  const d2 = fs.mkdtempSync(path.join(os.tmpdir(), 'kng-sab-'));
  ['Sablona_NABIDKA_CN_v7.docx', 'Sablona_NABIDKA_CN_v9.docx', 'Sablona_NABIDKA_CN_v10.docx', 'Sablona_NABIDKA_PROJ.docx']
    .forEach(f => fs.writeFileSync(path.join(d1, f), 'x'));
  fs.writeFileSync(path.join(d2, 'Sablona_NABIDKA_CN_v11.docx'), 'x');
  const zavolej = (env) => require('child_process').execFileSync('node', ['--input-type=module', '-e',
    "import { najdiNejnovejsi } from " + JSON.stringify(PODKLADY) + ";"
    + "const r = najdiNejnovejsi(/^Sablona_NABIDKA_CN_v(\\d+)\\.docx$/, [" + JSON.stringify(d2) + "]);"
    + "console.log(JSON.stringify(r));"], { encoding: 'utf8', env: Object.assign({}, process.env, env) });
  const r1 = JSON.parse(zavolej({ KNG_PODKLADY: d1 }));
  test('šablona: v10 porazí v9 (číslo, ne text)', r1 && r1.verze === 10 && /_v10\.docx$/.test(r1.cesta), JSON.stringify(r1));
  test('šablona: KNG_PODKLADY má přednost před dalšími složkami', r1 && r1.cesta.startsWith(d1), JSON.stringify(r1));
  const r2 = JSON.parse(zavolej({ KNG_PODKLADY: '' }));
  test('šablona: bez KNG_PODKLADY se hledá v dalších složkách', r2 && r2.verze === 11, JSON.stringify(r2));
  const r3 = JSON.parse(zavolej({ KNG_PODKLADY: '/nikde-neni' }) || 'null');
  test('šablona: neexistující KNG_PODKLADY nespadne a jde dál', r3 && r3.verze === 11, JSON.stringify(r3));
}

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
