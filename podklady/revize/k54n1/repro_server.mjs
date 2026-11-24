/* ============================================================
 * K54-N1 (#750, J. V. 24. 11. 2026) — SMAZANÁ KALKULACE SE ULOŽENÍM
 * NEVZKŘÍSÍ (server, netlify/functions/zakazky.mjs)
 *
 * Nález na testu (CN-432): kalkulace smazaná v Seznamu zakázek zůstala
 * otevřená a první uložení ji na serveru založilo znovu ze staré kopie
 * (zamčená varianta, ceník, protokol) — a webhook Pipedrive ji pak bral
 * jako existující. Pojistka: uložení, které nese razítko a jméno záznamu
 * (`ocekavaneRazitko`, `ocekavanySoubor`), pod nímž na serveru nic neleží,
 * server odmítne 409 `smazana` (ani `prepsat` to neobejde). Dál funguje:
 * nová zakázka (i pod číslem smazané), přečíslování načtené zakázky,
 * starší tělo bez `ocekavanySoubor`, a webhook založí novou čerstvou
 * kalkulaci s `pdCerstva`.
 * Klient (zavření smazané otevřené kalkulace) hlídá src/test_k54n1_smazani_ui.js.
 * Pojistka: na 0fd6410 (před opravou) padají testy „409 smazana“.
 * Spuštění: node netlify/test_k54n1_smazana.mjs
 * ============================================================ */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
for (const k of ['PIPEDRIVE_SIMULATOR_SCENAR', 'PIPEDRIVE_TOKEN', 'PIPEDRIVE_DOMENA', 'PROSTREDI', 'PIPEDRIVE_WEBHOOK_KLIC',
  'NETLIFY', 'SITE_ID', 'SITE_NAME', 'DEPLOY_ID', 'CONTEXT', 'BRANCH', 'HEAD', 'URL', 'DEPLOY_URL', 'DEPLOY_PRIME_URL']) delete process.env[k];
process.env.PIPEDRIVE_SIMULATOR = '1';
const KLIC = 'kng-test-webhook-klic-k54n1-0123456789abcdefghijk';
process.env.PIPEDRIVE_WEBHOOK_KLIC = KLIC;

const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
const venku = [];
globalThis.fetch = async (url) => { venku.push(String(url)); throw new Error('síť je v testu zakázaná: ' + url); };
const puvodniLog = console.log;
console.log = (...a) => { if (typeof a[0] === 'string' && a[0].startsWith('pd_webhook: ')) return; puvodniLog(...a); };

const A = await import('../../../netlify/lib/ares_server.mjs');
A.ARES_SIT.fetch = async () => new Response('{}', { status: 404 });
const { default: webhook } = await import('../../../netlify/functions/pd_webhook.mjs');
const { default: prihlaseni } = await import('../../../netlify/functions/prihlaseni.mjs');
const { default: zakazky } = await import('../../../netlify/functions/zakazky.mjs');
const { ADMIN_EMAIL } = await import('../../../netlify/lib/sdilene.mjs');
const SIM = await import('../../../netlify/lib/pipedrive_simulator.mjs');
const { jadro } = await import('../../../netlify/lib/jadro.mjs');
await jadro();
const G = globalThis;

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info).slice(0, 700))); }
};
const kopie = (x) => JSON.parse(JSON.stringify(x));
const odpoved = async (r) => { let j = {}; try { j = JSON.parse(await r.text()); } catch (e) { j = {}; } return { status: r.status, ...j }; };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const postJ = async (fn, url, telo, cookie) => odpoved(await post(fn, url, telo, cookie));
const smaz = async (soubor, cookie) => odpoved(await zakazky(new Request('http://x/api/zakazky?soubor=' + encodeURIComponent(soubor) + '&ismazatOdeslane=1',
  { method: 'DELETE', headers: { cookie } })));
const nacti = async (soubor, cookie) => odpoved(await zakazky(new Request('http://x/api/zakazky?soubor=' + encodeURIComponent(soubor), { headers: { cookie } })));
const login = async (e, h) => ((await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h })).headers.get('set-cookie') || '').split(';')[0];
const zakazka = (soubor) => JSON.parse(pamet.get('zakazky/z/' + soubor) || 'null');
const rejstrik = () => (JSON.parse(pamet.get('zakazky/_rejstrik') || 'null') || { zakazky: [] }).zakazky.map(z => z.soubor);
async function volej(dealId) {
  const r = await webhook(new Request('https://testweb.example/api/pd/webhook', { method: 'POST',
    headers: { 'content-type': 'application/json', 'x-kalkulator-klic': KLIC }, body: JSON.stringify({ dealId }) }));
  return odpoved(r);
}

const cA = await login(ADMIN_EMAIL, 'Docasne.Heslo.123');
test('příprava: přihlášení', !!cA);


const D = SIM.pdSimStav().data;
const deal = D.dealy.find((x) => x.status === 'open' && x.org_id && x.person_id && /^CN-\d+ /.test(x.title));
let r = await volej(deal.id); const W = r.soubor;
let o = await nacti(W, cA);
const okno = G.importZakazka(o.zakazka); const raz = G.uloRazitko(okno);
delete okno.pdCerstva; okno.adresa = 'STARA KOPIE';
await smaz(W, cA);
// A) krok Zpět / záloha / import: stará kopie bez razítka a bez jména
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: kopie(okno), ocekavaneRazitko: '', ocekavanySoubor: '' }, cA);
console.log('A) stará kopie s prázdným razítkem (Zpět, záloha, import):', r.status, '| na serveru adresa =', zakazka(W) && zakazka(W).adresa);
r = await volej(deal.id);
console.log('   webhook poté: akce =', r.akce, '| pdCerstva =', zakazka(W).pdCerstva);
await smaz(W, cA);
// B) přečíslování staré kopie
const pre = kopie(okno); pre.cislo = String(pre.cislo) + '-X';
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: pre, ocekavaneRazitko: raz, ocekavanySoubor: W }, cA);
console.log('B) přečíslovaná stará kopie:', r.status, r.soubor, r.chyba || '');
if (r.soubor) await smaz(r.soubor, cA);
// C) webhook mezitím založil čerstvou; staré okno uloží → kolize → Přepsat
r = await volej(deal.id);
console.log('C) webhook po smazání:', r.akce, '| pdCerstva =', zakazka(W).pdCerstva);
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: kopie(okno), ocekavaneRazitko: raz, ocekavanySoubor: W }, cA);
console.log('   staré okno uloží:', r.status, 'kolize =', r.kolize, 'smazana =', r.smazana, '|', r.chyba);
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: kopie(okno), ocekavaneRazitko: r.naDisku, ocekavanySoubor: W }, cA);
console.log('   „Přepsat serverovou verzi“ (razítko naDisku):', r.status, r.chyba || '', '| adresa =', zakazka(W).adresa, '| pdCerstva =', zakazka(W).pdCerstva);
process.exit(0);
