/* VÝBĚR ČÁSTI MUTAČNÍHO BĚHU (P2, 23. 10. 2026)
 *
 * Zadání: podklady/PROMPT_mutacni_beh_23_10.md. Mutací přibývá (server 880,
 * jádro 527) a celý běh se nevejde ani do dvouhodinového limitu úlohy na
 * pozadí v cloudovém sezení (server tam trvá ~5 h), ani do jobu v Actions
 * s rozumným timeoutem. Oba skripty dosud vybíraly jen podle názvu, takže
 * zbytek přerušeného běhu nešel pustit.
 *
 *   --cast K/N   každá N-tá mutace počínaje K-tou (části 1..N dohromady
 *                pokryjí každou mutaci právě jednou — matrix v Actions),
 *   --od N       pokračování přerušeného běhu od N-té mutace,
 *   prostředí    KNG_MUTACE_CAST / KNG_MUTACE_OD (nastroje/testovaci_kolo.sh);
 *                volba na příkazové řádce má přednost.
 * Pořadí je GLOBÁLNÍ (pozice v MUTACE od 1) — z řádku „[528/880]" v logu je
 * vidět, kde běh skončil, a `--od 529` naváže. Filtr podle názvu se uplatní
 * až po výběru. Neplatný zápis vrátí `chyba` a nic nevybere: překlep nesmí
 * spustit celý běh (ten by v Actions jen tiše vypršel). */

const CAST_TVAR = /^([1-9][0-9]{0,4})\/([1-9][0-9]{0,4})$/;
const OD_TVAR = /^[1-9][0-9]{0,5}$/;

/* Hodnota volby z argv (`--cast 2/4` i `--cast=2/4`); undefined = volba
 * chybí, null = volba je, ale bez hodnoty. */
function volba(argv, jmeno) {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === jmeno) return (i + 1 < argv.length && !argv[i + 1].startsWith('--')) ? argv[i + 1] : null;
    if (argv[i].startsWith(jmeno + '=')) return argv[i].slice(jmeno.length + 1);
  }
  return undefined;
}

/* Filtr podle názvu = první argument, který není volba ani hodnota volby. */
export function filtrZArgv(argv) {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--cast' || a === '--od') { i++; continue; }
    if (a.startsWith('--')) continue;
    return a.toLowerCase();
  }
  return '';
}

/* → { vybrane: [{ m, poradi }], popis, cely, chyba }
 *   popis — „část 2/4: 220 z 880 mutací", „od 529.: 352 z 880 mutací", nebo ''
 *   cely  — true jen tehdy, když běh pokrývá VŠECHNY mutace (bez části,
 *           bez --od > 1, bez filtru); souhrn podle toho nesmí tvrdit víc. */
export function mutaceCast(mutace, argv = [], env = {}, filtr = null) {
  const celkem = mutace.length;
  const nic = (chyba) => ({ vybrane: [], popis: '', cely: false, chyba });
  let castTxt = volba(argv, '--cast');
  if (castTxt === undefined && env.KNG_MUTACE_CAST) castTxt = String(env.KNG_MUTACE_CAST);
  let odTxt = volba(argv, '--od');
  if (odTxt === undefined && env.KNG_MUTACE_OD) odTxt = String(env.KNG_MUTACE_OD);

  let K = 1, N = 1, od = 1;
  if (castTxt !== undefined) {
    const m = CAST_TVAR.exec(String(castTxt || ''));
    if (!m) return nic('Neplatná část „' + castTxt + '" — zápis K/N, např. --cast 2/4.');
    K = Number(m[1]); N = Number(m[2]);
    if (K > N) return nic('Neplatná část „' + castTxt + '" — K musí být 1 až N.');
  }
  if (odTxt !== undefined) {
    if (!OD_TVAR.test(String(odTxt || ''))) return nic('Neplatné --od „' + odTxt + '" — kladné celé číslo, např. --od 529.');
    od = Number(odTxt);
    if (od > celkem) return nic('--od ' + od + ' je za koncem — mutací je ' + celkem + '.');
  }

  const vybrane = [];
  mutace.forEach((m, i) => {
    const poradi = i + 1;
    if (poradi < od || (poradi - K) % N !== 0) return;
    if (filtr && !filtr(m)) return;
    vybrane.push({ m, poradi });
  });
  const casti = [];
  if (N > 1) casti.push('část ' + K + '/' + N);
  if (od > 1) casti.push('od ' + od + '.');
  const popis = casti.length ? casti.join(', ') + ': ' + vybrane.length + ' z ' + celkem + ' mutací' : '';
  return { vybrane, popis, cely: vybrane.length === celkem, chyba: null };
}
