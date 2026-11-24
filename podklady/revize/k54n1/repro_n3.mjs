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
 * kalkulaci s `pdCerstva`. N3 (J. V. 24. 11.): čerstvou kalkulaci z webhooku
 * (`pdCerstva`) smí uložit jen okno, které ji načetlo (razítko v těle = razítko
 * záznamu); „Přepsat serverovou verzi“ ze staré kopie ani `prepsat` → 409.
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


// Dorevize N3 (b6fb16b): pojistka čerstvé kalkulace z Pipedrive
const D = SIM.pdSimStav().data;
const dealy = D.dealy.filter((x) => x.status === 'open' && x.org_id && x.person_id && /^CN-\d+ /.test(x.title));
const deal = dealy[0];
let r = await volej(deal.id); const W = r.soubor;
// D) řádné první otevření a uložení
let o = await nacti(W, cA);
let okno = G.importZakazka(o.zakazka); const raz = G.uloRazitko(okno);
delete okno.pdCerstva; okno.adresa = 'Uprava v okne';
// E) okno má čerstvou otevřenou, webhook ji mezitím AKTUALIZUJE (změna v dealu)
const dd = D.dealy.find(x => x.id === deal.id); dd.title = dd.title + ' zmena';
r = await volej(deal.id);
console.log('E) webhook nad otevřenou čerstvou:', r.akce, '| pdCerstva =', zakazka(W).pdCerstva, '| razítko změněno:', G.uloRazitko(zakazka(W)) !== raz);
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: kopie(okno), ocekavaneRazitko: raz, ocekavanySoubor: W }, cA);
console.log('   první uložení okna, které ji řádně načetlo:', r.status, 'kolize =', r.kolize, 'pdCerstvaJina =', r.pdCerstvaJina, '|', r.chyba);
// F) souběžné ukládání do složky přepíše razítko v datech okna (uloziste_ui.js: ZAK.uloRazitko = razitko)
o = await nacti(W, cA); okno = G.importZakazka(o.zakazka); const raz2 = G.uloRazitko(okno); delete okno.pdCerstva;
const sloz = kopie(okno); sloz.uloRazitko = new Date(Date.now() + 5).toISOString();
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: sloz, ocekavaneRazitko: raz2, ocekavanySoubor: W }, cA);
console.log('F) okno načetlo čerstvou, razítko v datech přepsal zápis do složky:', r.status, 'pdCerstvaJina =', r.pdCerstvaJina);
// G) podvržené razítko: je v rejstříku?
const rej = await odpoved(await zakazky(new Request('http://x/api/zakazky', { headers: { cookie: cA } })));
const zaz = ((rej.rejstrik && rej.rejstrik.zakazky) || []).find(z => z.soubor === W) || {};
console.log('G) rejstřík nese razítko čerstvé (pole upraveno):', zaz.upraveno === G.uloRazitko(zakazka(W)));
const stara = G.novaZakazka(); stara.cislo = zakazka(W).cislo; stara.nazevAkce = 'STARA KOPIE'; stara.uloRazitko = zaz.upraveno;
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: G.importZakazka(kopie(stara)), ocekavaneRazitko: zaz.upraveno, ocekavanySoubor: W }, cA);
console.log('   cizí zakázka s razítkem z rejstříku (bez načtení čerstvé):', r.status, r.chyba || '', '| nazevAkce =', zakazka(W).nazevAkce);
// H) řádné uložení, pak dvě karty / výpadek
r = await volej(dealy[1].id); const W2 = r.soubor;
o = await nacti(W2, cA); const a = G.importZakazka(o.zakazka), b = G.importZakazka(kopie(o.zakazka)); const rz = G.uloRazitko(a);
delete a.pdCerstva; delete b.pdCerstva; a.adresa = 'Karta A'; b.adresa = 'Karta B';
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: kopie(a), ocekavaneRazitko: rz, ocekavanySoubor: W2 }, cA);
console.log('H) karta A první uložení:', r.status, '| pdCerstva po uložení =', zakazka(W2).pdCerstva);
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: kopie(a), ocekavaneRazitko: rz, ocekavanySoubor: W2 }, cA);
console.log('   opakování téhož po ztracené odpovědi:', r.status, 'kolize =', r.kolize, 'pdCerstvaJina =', r.pdCerstvaJina);
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: kopie(b), ocekavaneRazitko: rz, ocekavanySoubor: W2 }, cA);
console.log('   karta B:', r.status, 'kolize =', r.kolize, 'pdCerstvaJina =', r.pdCerstvaJina);
r = await volej(dealy[1].id);
console.log('   opakované doručení webhooku po uložení člověkem:', r.akce, '| pdCerstva =', zakazka(W2).pdCerstva, '| adresa =', zakazka(W2).adresa);

// ---- druhá dorevize (7e13c08): totožnost podle pdVazbaWebhook.kdy ----
// I) vazba je v rejstříku?
{ const rej2 = await odpoved(await zakazky(new Request('http://x/api/zakazky', { headers: { cookie: cA } })));
  const kdyW = zakazka(W) && zakazka(W).pdVazbaWebhook ? zakazka(W).pdVazbaWebhook.kdy : '';
  console.log('I) čas vazby čerstvé je v odpovědi rejstříku:', !!kdyW && JSON.stringify(rej2).includes(kdyW)); }
// J) nová čerstvá (třetí deal): stará kopie bez vazby / s cizí vazbou / s podvrženou vazbou
r = await volej(dealy[2].id); const W3 = r.soubor; const cer = zakazka(W3);
const cizi = G.novaZakazka(); cizi.cislo = cer.cislo; cizi.nazevAkce = 'STARA KOPIE';
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: G.importZakazka(kopie(cizi)), ocekavaneRazitko: '', ocekavanySoubor: '', prepsat: true }, cA);
console.log('J) nová zakázka pod číslem čerstvé, prepsat:', r.status, 'pdCerstvaJina =', r.pdCerstvaJina);
const sCizi = kopie(cizi); sCizi.pdDealId = cer.pdDealId; sCizi.pdVazbaWebhook = Object.assign({}, cer.pdVazbaWebhook, { kdy: '2026-01-01T00:00:00.000Z' });
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: G.importZakazka(kopie(sCizi)), ocekavaneRazitko: G.uloRazitko(cer), ocekavanySoubor: W3, prepsat: true }, cA);
console.log('   stará kopie s vazbou z jiného založení (jiné kdy):', r.status, 'pdCerstvaJina =', r.pdCerstvaJina);
const podvrh = kopie(cizi); podvrh.pdDealId = cer.pdDealId; podvrh.pdVazbaWebhook = kopie(cer.pdVazbaWebhook);
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: G.importZakazka(kopie(podvrh)), ocekavaneRazitko: G.uloRazitko(cer), ocekavanySoubor: W3 }, cA);
console.log('   úmyslně podvržená vazba (kdy opsané z načtené čerstvé):', r.status, r.chyba || '', '| nazevAkce =', zakazka(W3).nazevAkce);
// K) smazání → nové založení: čas vazby se liší, stará kopie neprojde ani s Přepsat
r = await volej(dealy[3].id); const W4 = r.soubor;
o = await nacti(W4, cA); const st = G.importZakazka(o.zakazka); delete st.pdCerstva; const kdy1 = zakazka(W4).pdVazbaWebhook.kdy;
await smaz(W4, cA); await new Promise(x => setTimeout(x, 5)); r = await volej(dealy[3].id);
console.log('K) po smazání webhook:', r.akce, '| čas vazby jiný:', zakazka(W4).pdVazbaWebhook.kdy !== kdy1);
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: kopie(st), ocekavaneRazitko: G.uloRazitko(zakazka(W4)), ocekavanySoubor: W4, prepsat: true }, cA);
console.log('   stará kopie (razítko z disku + prepsat):', r.status, 'pdCerstvaJina =', r.pdCerstvaJina);
// L) opakované doručení beze změny nad čerstvou + řádné uložení
r = await volej(dealy[3].id); console.log('L) opakované doručení nad čerstvou:', r.akce, '| pdCerstva =', zakazka(W4).pdCerstva);
o = await nacti(W4, cA); const ok4 = G.importZakazka(o.zakazka); delete ok4.pdCerstva; ok4.adresa = 'Radne ulozeni';
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: kopie(ok4), ocekavaneRazitko: G.uloRazitko(ok4), ocekavanySoubor: W4 }, cA);
console.log('   řádné první uložení:', r.status, '| pdCerstva =', zakazka(W4).pdCerstva, '| vazba.kdy drží:', zakazka(W4).pdVazbaWebhook.kdy === o.zakazka.pdVazbaWebhook.kdy);
// M) čerstvá BEZ vazby (uměle — webhook ji vždy píše): pojistka mlčí
{ const key = 'zakazky/z/' + W3; const z = JSON.parse(pamet.get(key)); delete z.pdVazbaWebhook; pamet.set(key, JSON.stringify(z));
  r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: G.importZakazka(kopie(cizi)), ocekavaneRazitko: '', ocekavanySoubor: '', prepsat: true }, cA);
  console.log('M) čerstvá bez vazby (umělý stav) + nová zakázka s prepsat:', r.status, 'pdCerstvaJina =', r.pdCerstvaJina, r.chyba || ''); }
process.exit(0);
