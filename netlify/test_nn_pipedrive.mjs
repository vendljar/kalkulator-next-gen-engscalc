/* ============================================================
 * DÁVKA NN (22. 11. 2026) — Pipedrive: B245 a B246 (audit 20. 11. 2026, #702).
 *
 *   B245  PIPEDRIVE_DOMENA se validuje — hodnota s #, ?, @, :, tečkou nesmí
 *         poslat token na cizího hostitele (SEC-M14).
 *   B246  každé volání Pipedrive má výchozí časový limit (PD_CAS_LIMIT_MS),
 *         i čtecí (webhook, detail, seznam, mapa polí, stav).
 *
 * Bez sítě: fetch je podvržený a hlídaný. Smyšlený token.
 * Pojistka: před opravou `zlo.example#` dalo hostitele zlo.example (token
 * odešel ven) a neodpovídající fetch visel bez limitu (test čeká 1,5 × limit).
 * ============================================================ */
for (const k of ['PIPEDRIVE_SIMULATOR_SCENAR', 'PIPEDRIVE_TOKEN', 'PIPEDRIVE_DOMENA', 'PIPEDRIVE_ZAPIS', 'PROSTREDI',
  'NETLIFY', 'SITE_ID', 'SITE_NAME', 'DEPLOY_ID', 'CONTEXT', 'BRANCH', 'HEAD', 'URL']) delete process.env[k];
const sit = [];
let rezim = 'ok';
globalThis.fetch = (url, init) => {
  sit.push(String(url));
  if (rezim === 'visi') return new Promise((_, ne) => { if (init && init.signal) init.signal.addEventListener('abort', () => ne(new Error('abort'))); });
  return Promise.resolve(new Response(JSON.stringify({ success: true, data: { id: 1 } }), { status: 200 }));
};
const PD = await import('./lib/pipedrive.mjs');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n + (info !== undefined ? ' ' + JSON.stringify(info) : '')); } };
process.env.PIPEDRIVE_TOKEN = 'smysleny-token-jen-pro-test';

/* B245 */
for (const [d, ocek] of [['mojefirma', 'https://mojefirma.pipedrive.com'], ['mojefirma.pipedrive.com', 'https://mojefirma.pipedrive.com'],
  ['https://moje-firma.pipedrive.com/', 'https://moje-firma.pipedrive.com']]) {
  process.env.PIPEDRIVE_DOMENA = d;
  let z; try { z = PD.pdZaklad(); } catch (e) { z = 'chyba ' + e.message; }
  test('B245: platná doména „' + d + '“ → ' + ocek, z === ocek, z);
}
for (const d of ['zlo.example#', 'zlo.example?', 'utocnik@priklad.cz', 'zlo.example:443', 'a.b', 'fir ma', '-firma']) {
  process.env.PIPEDRIVE_DOMENA = d;
  let z; try { z = PD.pdZaklad(); } catch (e) { z = e instanceof PD.PdChyba ? 'odmitnuto' : 'jina ' + e.message; }
  test('B245: neplatná doména „' + d + '“ se odmítne', z === 'odmitnuto', z);
}
sit.length = 0;
process.env.PIPEDRIVE_DOMENA = 'zlo.example#';
try { await PD.pdZavolej('/api/v1/users/me'); } catch (e) { /* odmítnuto */ }
test('B245: s neplatnou doménou žádné síťové volání (token neodejde)', sit.length === 0, sit);

/* B246 */
process.env.PIPEDRIVE_DOMENA = 'mojefirma';
test('B246: výchozí limit je pod limitem funkce Netlify (≤ 9 s)', PD.PD_CAS_LIMIT_MS > 0 && PD.PD_CAS_LIMIT_MS <= 9000, PD.PD_CAS_LIMIT_MS);
rezim = 'visi';
const t0 = Date.now();
const vysl = await Promise.race([
  PD.pdZavolej('/api/v1/deals/1').then(() => 'ok', (e) => (e instanceof PD.PdChyba ? e.stav : 'jina')),
  new Promise(h => setTimeout(() => h('visi'), PD.PD_CAS_LIMIT_MS * 1.5)),
]);
test('B246: čtení bez volby casLimitMs na neodpovídajícím Pipedrive skončí 504 do limitu', vysl === 504 && Date.now() - t0 < PD.PD_CAS_LIMIT_MS * 1.5, vysl);
rezim = 'ok';
const r = await PD.pdZavolej('/api/v1/deals/1');
test('B246: běžné čtení dál vrací data', r && r.id === 1, r);

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
