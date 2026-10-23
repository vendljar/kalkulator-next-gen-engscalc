/* ============================================================
 * VÝBĚR ČÁSTI MUTAČNÍHO BĚHU (P2, 23. 10. 2026;
 * zadání podklady/PROMPT_mutacni_beh_23_10.md)
 *
 * Hlídá nastroje/mutace_cast.mjs, který používají netlify/mutace.mjs
 * i mutace_jadro.mjs:
 *   - `--cast K/N`: části 1..N dohromady pokryjí každou mutaci právě jednou,
 *   - `--od N`: běh začne N-tou mutací (pořadí v MUTACE od 1),
 *   - filtr podle názvu se uplatní PO výběru a pořadí zůstává globální,
 *   - neplatný zápis (0/4, 5/4, abc, --od 0) skončí chybou — nikdy celý běh,
 *   - proměnné prostředí KNG_MUTACE_CAST / KNG_MUTACE_OD (testovací kolo),
 *   - souhrn nikdy netvrdí, že prošlo všech N, když běžela jen část.
 * Spuštění: node netlify/test_mutace_cast.mjs
 * ============================================================ */
const { mutaceCast } = await import('../nastroje/mutace_cast.mjs');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

const MUT = Array.from({ length: 23 }, (_, i) => ({ nazev: 'mutace ' + (i + 1) + (i % 5 === 0 ? ' pd' : ''), soubor: 'x.js' }));
const filtrJmen = (f) => (m) => !f || m.nazev.toLowerCase().includes(f);
const vyber = (argv, env = {}, f = '') => mutaceCast(MUT, argv, env, filtrJmen(f));

/* Bez voleb: všechny, pořadí 1..N, popis bez „část". */
const vse = vyber([]);
test('bez voleb vybere všech 23 v pořadí 1..23', vse.vybrane.length === 23 && vse.vybrane.every((x, i) => x.poradi === i + 1), vse.vybrane.map(x => x.poradi));
test('bez voleb je to celý běh (cely: true)', vse.cely === true && vse.chyba === null, vse);

/* Části pokryjí každou mutaci právě jednou. */
for (const N of [1, 2, 3, 4, 7, 23, 30]) {
  const pocty = new Array(MUT.length + 1).fill(0);
  for (let K = 1; K <= N; K++) for (const x of vyber(['--cast', K + '/' + N]).vybrane) pocty[x.poradi]++;
  test('části 1..' + N + ' pokryjí každou mutaci právě jednou', pocty.slice(1).every(p => p === 1), pocty.slice(1));
}
const c2 = vyber(['--cast', '2/4']);
test('--cast 2/4 = 2., 6., 10., … mutace', JSON.stringify(c2.vybrane.map(x => x.poradi)) === '[2,6,10,14,18,22]', c2.vybrane.map(x => x.poradi));
test('--cast 2/4: popis „část 2/4: 6 z 23 mutací", cely: false', c2.popis === 'část 2/4: 6 z 23 mutací' && c2.cely === false, c2.popis);
test('--cast=2/4 (se rovnítkem) platí taky', vyber(['--cast=2/4']).vybrane.length === 6);
test('části se rozloží rovnoměrně (23 na 4 → 6, 6, 6, 5)',
  JSON.stringify([1, 2, 3, 4].map(K => vyber(['--cast', K + '/4']).vybrane.length)) === '[6,6,6,5]');

/* --od N. */
const od = vyber(['--od', '18']);
test('--od 18 začne 18. mutací a doběhne do konce', JSON.stringify(od.vybrane.map(x => x.poradi)) === '[18,19,20,21,22,23]', od.vybrane.map(x => x.poradi));
test('--od 18: popis „od 18.: 6 z 23 mutací"', od.popis === 'od 18.: 6 z 23 mutací' && od.cely === false, od.popis);
test('--od 1 je celý běh', vyber(['--od', '1']).cely === true);
const kombi = vyber(['--cast', '1/2', '--od', '10']);
test('--cast 1/2 --od 10 = liché od 11', JSON.stringify(kombi.vybrane.map(x => x.poradi)) === '[11,13,15,17,19,21,23]', kombi.vybrane.map(x => x.poradi));

/* Filtr podle názvu po výběru, pořadí globální. */
const f = vyber(['--cast', '1/2'], {}, 'pd');
test('filtr „pd" s částí 1/2 nechá jen liché s „pd" (1, 11, 21) a globální pořadí',
  JSON.stringify(f.vybrane.map(x => x.poradi)) === '[1,11,21]', f.vybrane.map(x => x.poradi));
test('filtr bez části: cely false (není to celý běh)', vyber([], {}, 'pd').cely === false);

/* Proměnné prostředí (testovací kolo). */
const e = vyber([], { KNG_MUTACE_CAST: '3/4' });
test('KNG_MUTACE_CAST=3/4 = --cast 3/4', JSON.stringify(e.vybrane.map(x => x.poradi)) === JSON.stringify(vyber(['--cast', '3/4']).vybrane.map(x => x.poradi)));
test('KNG_MUTACE_OD=20 = --od 20', vyber([], { KNG_MUTACE_OD: '20' }).vybrane.length === 4);
test('volba z příkazové řádky má přednost před prostředím', vyber(['--cast', '1/4'], { KNG_MUTACE_CAST: '3/4' }).vybrane[0].poradi === 1);
test('prázdná proměnná prostředí = bez výběru', vyber([], { KNG_MUTACE_CAST: '', KNG_MUTACE_OD: '' }).cely === true);

/* Neplatný zápis → chyba, žádná vybraná mutace (nikdy celý běh). */
for (const [popis, argv, env] of [['0/4', ['--cast', '0/4']], ['5/4', ['--cast', '5/4']], ['abc', ['--cast', 'abc']],
  ['2/0', ['--cast', '2/0']], ['1.5/4', ['--cast', '1.5/4']], ['--cast bez hodnoty', ['--cast']],
  ['--od 0', ['--od', '0']], ['--od abc', ['--od', 'abc']], ['--od 24 (za koncem)', ['--od', '24']],
  ['--od bez hodnoty', ['--od']], ['KNG_MUTACE_CAST=x/4', [], { KNG_MUTACE_CAST: 'x/4' }], ['KNG_MUTACE_OD=-1', [], { KNG_MUTACE_OD: '-1' }]]) {
  const r = vyber(argv, env);
  test('neplatné ' + popis + ' → chyba a nic vybráno', typeof r.chyba === 'string' && r.chyba.length > 0 && r.vybrane.length === 0, r);
}

/* K8-W3 (#514): neznámá volba → chyba s nápovědou, nikdy celý běh. */
for (const argv of [['--help'], ['-h'], ['--cast2/4'], ['--cats', '2/4'], ['pd', '--od5']]) {
  const r = vyber(argv);
  test('neznámá volba ' + argv.join(' ') + ' → chyba a nic vybráno', typeof r.chyba === 'string' && /Neznámá volba/.test(r.chyba) && r.vybrane.length === 0, r);
}
test('--kontrola je povolená volba', vyber(['--kontrola']).chyba === null);
/* K8-W2 (#514): prázdný výběr → chyba (ne „Chycených 0 z 0" s kódem 0). */
for (const [popis, argv, f] of [['--cast 2/4 --od 23', ['--cast', '2/4', '--od', '23']], ['filtr bez shody', [], 'nic-takoveho'],
  ['část bez shody s filtrem', ['--cast', '2/4', '--od', '7'], 'pd']]) {
  const r = vyber(argv, {}, f);
  test('prázdný výběr (' + popis + ') → chyba', typeof r.chyba === 'string' && r.chyba.length > 0 && r.vybrane.length === 0, r);
}
/* K8-W8 (#514): samotný filtr má popis, aby souhrn řekl „NE celý běh". */
test('filtr bez části: popis „filtr: 5 z 23 mutací"', vyber([], {}, 'pd').popis === 'filtr: 5 z 23 mutací', vyber([], {}, 'pd').popis);

/* K8-W9 (#514): --od jen nad čistou kopií (git diff src netlify). */
{
  const { navazaniChyba } = await import('../nastroje/mutace_cast.mjs');
  const spinave = () => 1, ciste = () => 0;
  test('--od nad změněnou kopií → chyba', /zbytek přerušené/.test(navazaniChyba('.', vyber(['--od', '5']), {}, spinave)));
  test('--od nad čistou kopií → bez chyby', navazaniChyba('.', vyber(['--od', '5']), {}, ciste) === '');
  test('bez --od se kopie nekontroluje', navazaniChyba('.', vyber(['--cast', '2/4']), {}, spinave) === '');
  test('KNG_MUTACE_SPINAVE=1 kontrolu vědomě vypne', navazaniChyba('.', vyber(['--od', '5']), { KNG_MUTACE_SPINAVE: '1' }, spinave) === '');
  test('KNG_MUTACE_OD z prostředí se kontroluje taky', /zbytek/.test(navazaniChyba('.', vyber([], { KNG_MUTACE_OD: '3' }), {}, spinave)));
}

/* Filtr se nesmí plést s hodnotou volby: `--cast 2/4 pd` → filtr „pd", ne „2/4". */
const { filtrZArgv } = await import('../nastroje/mutace_cast.mjs');
test('filtr z argumentů přeskočí hodnoty voleb', filtrZArgv(['--cast', '2/4', 'pd']) === 'pd' && filtrZArgv(['--od', '5']) === ''
  && filtrZArgv(['sleva']) === 'sleva' && filtrZArgv(['--kontrola']) === '' && filtrZArgv(['--cast=1/2', 'P2']) === 'p2');

/* Workflow: matrix obou mutačních jobů = části 1..N téhož N, fail-fast vypnutý,
 * a část jde do kola proměnnou KNG_MUTACE_CAST. */
const { readFileSync } = await import('node:fs');
const wf = readFileSync(new URL('../.github/workflows/testy.yml', import.meta.url), 'utf8');
for (const job of ['mutace-server', 'mutace-jadro']) {
  const i = wf.indexOf('\n  ' + job + ':');
  const blok = i < 0 ? '' : wf.slice(i, (wf.indexOf('\n  # ', i + 5) + 1 || wf.length + 1) - 1);
  const m = /cast: \[([^\]]*)\]/.exec(blok);
  const casti = m ? m[1].split(',').map(x => x.trim().replace(/'/g, '')) : [];
  const N = casti.length;
  test('workflow ' + job + ': matrix části 1/' + N + ' … ' + N + '/' + N + ', fail-fast: false, KNG_MUTACE_CAST',
    N > 1 && casti.every((c, k) => c === (k + 1) + '/' + N) && /fail-fast: false/.test(blok)
    && /KNG_MUTACE_CAST: \$\{\{ matrix\.cast \}\}/.test(blok) && /--jen mutace-/.test(blok), { casti, blok: blok.slice(0, 80) });
}

console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
if (fail) process.exit(1);
