/* PoC čočky IN (audit 20. 11. 2026) — klient Pipedrive (netlify/lib/pipedrive.mjs):
 *  a) PIPEDRIVE_DOMENA se nevaliduje — hodnota s „#“/„@“/„:“ pošle token na cizí hostitele (IN-3),
 *  b) čtecí volání nemají výchozí časový limit (IN-4),
 *  c) org_id / person_id z odpovědi Pipedrive jdou v pd_deal.mjs do cesty bez Number() (IN-5),
 *  d) token se nedostane do odpovědi klientovi ani při chybě.
 * Jen lokálně: globalThis.fetch je náhrada, do sítě nejde nic.
 * Spuštění: node podklady/audit_2026-11-20/poc_IN_pipedrive_klient.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-poc-in-tajemstvi-jen-lokalne';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = 'spravce@priklad.cz';
for (const k of ['PIPEDRIVE_SIMULATOR', 'PIPEDRIVE_SIMULATOR_SCENAR', 'PROSTREDI', 'NETLIFY', 'SITE_ID', 'SITE_NAME', 'DEPLOY_ID', 'CONTEXT', 'BRANCH', 'HEAD', 'URL']) delete process.env[k];
const TOKEN = 'smysleny-token-poc-in-0000000000000000';
process.env.PIPEDRIVE_TOKEN = TOKEN;
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
const volani = [];
let rezim = 'ok';
const J = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(String(url));
  volani.push({ host: u.host, cesta: u.pathname, token: (init.headers || {})['x-api-token'] === TOKEN });
  if (rezim === 'visi') return new Promise(() => {});
  if (rezim === 'chyba') return J({ success: false, error: 'Bad request detail from CRM' }, 400);
  if (/\/dealFields$|\/organizationFields$/.test(u.pathname)) return J({ success: true, data: [] });
  if (/\/deals\/\d+$/.test(u.pathname)) return J({ success: true, data: { id: 7, title: 'CN-7 TEST', org_id: '5/../../v1/users', person_id: '9?x=1' } });
  return J({ success: true, data: {} });
};
const R = new URL('../..', import.meta.url).pathname;
const imp = (p) => import(R + p);
const PD = await imp('netlify/lib/pipedrive.mjs');
const { default: prihlaseni } = await imp('netlify/functions/prihlaseni.mjs');
const { default: pdDeal } = await imp('netlify/functions/pd_deal.mjs');
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const cA = ((await post(prihlaseni, 'http://x/api/prihlaseni', { email: 'spravce@priklad.cz', heslo: 'Docasne.Heslo.123' })).headers.get('set-cookie') || '').split(';')[0];
const vysledky = [];
const bod = (nazev, odolne, info) => { vysledky.push(odolne); console.log((odolne ? 'ODOLNÉ    ' : 'ZRANITELNÉ ') + nazev + (info ? '  [' + info + ']' : '')); };

/* a) doména z prostředí */
const cizi = [];
for (const d of ['mojefirma', 'https://mojefirma.pipedrive.com/', 'cizi.example#', 'uzivatel@priklad.cz:443#', 'cizi.example?x=']) {
  process.env.PIPEDRIVE_DOMENA = d; volani.length = 0;
  try { await PD.pdZavolej('/api/v2/deals/1'); } catch (e) { /* nic */ }
  const v = volani[0] || {};
  if (v.host && !/\.pipedrive\.com$/.test(v.host) && v.token) cizi.push(d + ' → ' + v.host);
}
bod('PIPEDRIVE_DOMENA: token jde jen na *.pipedrive.com', cizi.length === 0, cizi.join(' ; '));
process.env.PIPEDRIVE_DOMENA = 'mojefirma';

/* b) výchozí časový limit čtení */
rezim = 'visi';
const t0 = Date.now();
const v = await Promise.race([PD.pdZavolej('/api/v2/deals/1').then(() => 'hotovo', () => 'chyba'), new Promise((h) => setTimeout(() => h('stále čeká'), 1500))]);
bod('pdZavolej bez volby casLimitMs má vlastní časový limit', v !== 'stále čeká', v + ' po ' + (Date.now() - t0) + ' ms');
const v2 = await Promise.race([PD.pdZavolej('/api/v2/deals/1', { casLimitMs: 300 }).then(() => 'hotovo', (e) => 'chyba ' + e.stav), new Promise((h) => setTimeout(() => h('stále čeká'), 1500))]);
bod('pdZavolej s casLimitMs skončí včas (504)', v2 === 'chyba 504', v2);
rezim = 'ok';

/* c) id z odpovědi Pipedrive v cestě (pd_deal.mjs) */
volani.length = 0;
let r = await pdDeal(new Request('http://x/api/pd/deal?id=7', { headers: { cookie: cA } }));
const cesty = volani.map((x) => x.cesta);
bod('pd_deal: org_id / person_id z odpovědi jdou do cesty jen jako číslo', !cesty.some((c) => /\/v1\/users|x=1/.test(c)) && cesty.every((c) => !/\.\./.test(c)), cesty.join(' ; '));
bod('pd_deal: všechna volání zůstala na hostiteli Pipedrive', volani.every((x) => /\.pipedrive\.com$/.test(x.host)), [...new Set(volani.map((x) => x.host))].join(','));

/* d) token v odpovědích */
let texty = await r.text();
rezim = 'chyba';
for (const id of ['abc', '1/../2', '8?x', '8']) { r = await pdDeal(new Request('http://x/api/pd/deal?id=' + encodeURIComponent(id), { headers: { cookie: cA } })); texty += await r.text(); }
bod('token Pipedrive není v žádné odpovědi /api/pd/deal (úspěch, 400, chyba CRM)', !texty.includes(TOKEN), '');
bod('id dealu s „/“, „?“ nebo písmeny se odmítne dřív, než se sáhne na síť', !volani.some((x) => /abc|\.\.|x/.test(x.cesta.replace('/api/v2/', ''))), '');
console.log('\n' + (vysledky.every(Boolean) ? 'ODOLNÉ' : 'ZRANITELNÉ') + ' — ' + vysledky.filter(Boolean).length + '/' + vysledky.length + ' bodů odolných');
