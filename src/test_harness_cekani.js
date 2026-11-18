/* ============================================================
 * ČEKÁNÍ HARNESSŮ NA STAV, NE NA ČAS (C9 #608, 16. 11. 2026)
 *
 * Testovací kolo 48: overit_klon_tisk.mjs (cekej → klikniProdano) a
 * overit_kryci_cislo_sod.mjs (TimeoutError) vypršely při souběhu s jinými
 * prohlížečovými běhy. Pevné pauzy a pevné limity (15 s, 30 s Playwrightu)
 * nahradil nastroje/harness_cekani.js: jedna konstanta
 * KNG_HARNESS_TIMEOUT_MS (výchozí 15000), limity jsou její násobky, a čeká
 * se na klid stránky (doběhlé sledované akce a uložení).
 *
 * Sada ověřuje chování pomocníka (konstanta, násobky, neplatná hodnota,
 * počítadlo akcí, klid stránky) a že harnessy C9 nemají pevnou pauzu ani
 * pevný limit.
 * ============================================================ */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const KOREN = path.resolve(__dirname, '..');
const MODUL = path.join(KOREN, 'nastroje/harness_cekani.js');
let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

/* Načtení modulu v samostatném procesu s danou proměnnou prostředí. */
function sEnv(hodnota, vyraz) {
  const env = Object.assign({}, process.env);
  delete env.KNG_HARNESS_TIMEOUT_MS;
  if (hodnota !== undefined) env.KNG_HARNESS_TIMEOUT_MS = hodnota;
  const kod = 'const m = require(' + JSON.stringify(MODUL) + '); console.log(JSON.stringify(' + vyraz + '));';
  const r = spawnSync(process.execPath, ['-e', kod], { encoding: 'utf8', env });
  return { kod: r.status, vystup: String(r.stdout || '').trim(), chyba: String(r.stderr || '') };
}

test('modul nastroje/harness_cekani.js existuje', fs.existsSync(MODUL));
if (!fs.existsSync(MODUL)) { console.log(`\n${ok} OK, ${fail} FAIL`); process.exit(1); }
const M = require(MODUL);

/* ---------- 1) jedna konstanta, násobky ---------- */
{
  const a = sEnv(undefined, '[m.HARNESS_TIMEOUT_MS, m.casLimit(), m.casLimit(2), m.casLimit(4)]');
  test('bez proměnné: základ 15000 ms, limity jsou násobky', a.vystup === '[15000,15000,30000,60000]', a);
  const b = sEnv('4000', '[m.HARNESS_TIMEOUT_MS, m.casLimit(), m.casLimit(2), m.casLimit(12)]');
  test('KNG_HARNESS_TIMEOUT_MS=4000 → všechny limity se posunou', b.vystup === '[4000,4000,8000,48000]', b);
  const c = sEnv('  ', 'm.HARNESS_TIMEOUT_MS');
  test('prázdná hodnota = výchozí', c.vystup === '15000', c);
  for (const spatne of ['abc', '0', '-5', '1.5', '15s']) {
    const d = sEnv(spatne, 'm.HARNESS_TIMEOUT_MS');
    test('neplatná hodnota „' + spatne + '" je chyba (žádné tiché výchozí)',
      d.kod !== 0 && /KNG_HARNESS_TIMEOUT_MS musí být celé kladné číslo/.test(d.chyba), d);
  }
  test('harnessTimeoutMs čte předané prostředí', M.harnessTimeoutMs({ KNG_HARNESS_TIMEOUT_MS: '2500' }) === 2500
    && M.harnessTimeoutMs({}) === M.VYCHOZI_TIMEOUT_MS);
}

/* ---------- 2) sledujAkce + klid stránky (podstrčená stránka) ---------- */
(async () => {
  /* page.evaluate spustí funkci tady — globalThis hraje window. */
  globalThis.window = globalThis;
  const page = { evaluate: async (fn, arg) => fn(arg) };
  let pust, odmitni;
  globalThis.akceA = () => new Promise(r => { pust = r; });
  globalThis.akceB = () => new Promise((_, r) => { odmitni = r; });
  globalThis.synchronni = () => 7;
  const puvodniA = globalThis.akceA;
  await M.sledujAkce(page, ['akceA', 'akceB', 'synchronni']);
  test('obal zachová původní funkci', globalThis.akceA._puvodni === puvodniA);
  test('klid bez akcí', M.klidStranky() === true);
  const pA = globalThis.akceA();
  test('běžící akce → stránka není v klidu', window.__kngAkce === 1 && M.klidStranky() === false, window.__kngAkce);
  const pB = globalThis.akceB().catch(() => {});
  test('dvě akce → počítadlo 2', window.__kngAkce === 2);
  pust(); await pA;
  await new Promise(r => setImmediate(r));
  test('doběhlá akce se odečte', window.__kngAkce === 1, window.__kngAkce);
  odmitni(new Error('x')); await pB;
  await new Promise(r => setImmediate(r));
  test('i odmítnutá akce se odečte → klid', window.__kngAkce === 0 && M.klidStranky() === true, window.__kngAkce);
  test('synchronní funkce vrací svou hodnotu a počítadlo nemění', globalThis.synchronni() === 7 && window.__kngAkce === 0);
  await M.sledujAkce(page, ['akceA']);
  test('opakované sledování neobalí podruhé', globalThis.akceA._puvodni === puvodniA);
  let chyba = '';
  try { await M.sledujAkce(page, ['neexistujiciFunkce']); } catch (e) { chyba = e.message; }
  test('chybějící funkce aplikace je chyba (ne tiché nesledování)', /chybí funkce neexistujiciFunkce/.test(chyba), chyba);
  globalThis.ONLINE_STAV = { ukladaBeh: Promise.resolve() };
  test('běžící uložení (ONLINE_STAV.ukladaBeh) → není klid', M.klidStranky() === false);
  globalThis.ONLINE_STAV.ukladaBeh = null;
  globalThis.ZAKULO_STAV = { uklada: true };
  test('běžící uložení zakázky (ZAKULO_STAV.uklada) → není klid', M.klidStranky() === false);
  globalThis.ZAKULO_STAV.uklada = false;
  test('po uložení klid', M.klidStranky() === true);
  let limit = null;
  await M.cekejNaKlid({ waitForFunction: async (fn, arg, o) => { limit = o.timeout; return fn(); } }, 2);
  test('cekejNaKlid: limit je násobek základu', limit === M.casLimit(2), limit);

  /* ---------- 3) harnessy C9 bez pevné pauzy a pevného limitu ---------- */
  for (const f of ['overit_klon_tisk.mjs', 'overit_kryci_cislo_sod.mjs', 'overit_prodano_zamek.mjs']) {
    const kod = fs.readFileSync(path.join(KOREN, f), 'utf8');
    test(f + ': žádné waitForTimeout (pevná pauza)', !/waitForTimeout\s*\(/.test(kod), (kod.match(/.*waitForTimeout.*/g) || []).slice(0, 3));
    test(f + ': žádný pevný číselný limit (timeout: 15000 …)', !/timeout:\s*\d/.test(kod), (kod.match(/.*timeout:\s*\d.*/g) || []).slice(0, 3));
    test(f + ': limity z harness_cekani.js', /harness_cekani\.js/.test(kod) && /setDefaultTimeout\(casLimit\(/.test(kod)
      && /setDefaultNavigationTimeout\(casLimit\(/.test(kod));
  }
  console.log(`\n${ok} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL výjimka', e && e.stack); process.exit(1); });
