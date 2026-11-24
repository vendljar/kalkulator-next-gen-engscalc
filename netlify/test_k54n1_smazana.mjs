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

const A = await import('./lib/ares_server.mjs');
A.ARES_SIT.fetch = async () => new Response('{}', { status: 404 });
const { default: webhook } = await import('./functions/pd_webhook.mjs');
const { default: prihlaseni } = await import('./functions/prihlaseni.mjs');
const { default: zakazky } = await import('./functions/zakazky.mjs');
const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');
const SIM = await import('./lib/pipedrive_simulator.mjs');
const { jadro } = await import('./lib/jadro.mjs');
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

/* ---------- 1. nová zakázka a uložení načtené ---------- */
console.log('\n===== 1. nová zakázka, uložení načtené =====\n');
const nova = G.novaZakazka(); nova.cislo = '2026 - OPR - CN - 5401'; nova.nazevAkce = 'Zkouška K54-N1';
let r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: G.importZakazka(kopie(nova)), ocekavaneRazitko: '', ocekavanySoubor: '' }, cA);
const S = r.soubor;
test('nová zakázka (bez razítka, bez jména) se uloží', r.status === 200 && !!S && !!zakazka(S), [r.status, r.chyba]);
let o = await nacti(S, cA);
let okno = G.importZakazka(o.zakazka), raz = G.uloRazitko(okno);
okno.nazevAkce = 'Zkouška K54-N1 — úprava';
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: okno, ocekavaneRazitko: raz, ocekavanySoubor: S }, cA);
test('uložení načtené zakázky (razítko + jméno) projde', r.status === 200 && zakazka(S).nazevAkce === 'Zkouška K54-N1 — úprava', [r.status, r.chyba]);

/* ---------- 2. smazaná kalkulace se nevzkřísí ---------- */
console.log('\n===== 2. uložení smazané kalkulace → 409 =====\n');
o = await nacti(S, cA);
okno = G.importZakazka(o.zakazka); raz = G.uloRazitko(okno);
const druheOkno = kopie(okno);   // jiná karta / kolega má tutéž verzi otevřenou
r = await smaz(S, cA);
test('příprava: kalkulace smazána (záznam i rejstřík)', r.status === 200 && !zakazka(S) && !rejstrik().includes(S), [r.status, r.chyba]);
okno.varianty.push(Object.assign(G.novaVarianta('Varianta 2'), { pripona: 1 }));   // „přidal variantu“
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: okno, ocekavaneRazitko: raz, ocekavanySoubor: S }, cA);
test('uložení smazané kalkulace odmítnuto 409 smazana', r.status === 409 && r.smazana === true && r.kolize !== true, [r.status, r.chyba]);
test('… hláška říká, že byla smazána, a nic se nezapsalo', /byla mezitím smazána/.test(r.chyba || '') && !zakazka(S) && !rejstrik().includes(S), r.chyba);
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: druheOkno, ocekavaneRazitko: raz, ocekavanySoubor: S, prepsat: true }, cA);
test('… ani vědomé přepsání (prepsat) ji nevzkřísí', r.status === 409 && r.smazana === true && !zakazka(S), [r.status, r.chyba]);

/* ---------- 3. co dál funguje ---------- */
console.log('\n===== 3. nová zakázka pod týmž číslem, přečíslování, starší tělo =====\n');
const znovu = G.novaZakazka(); znovu.cislo = nova.cislo; znovu.nazevAkce = 'Nová pod týmž číslem';
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: G.importZakazka(kopie(znovu)), ocekavaneRazitko: '', ocekavanySoubor: '' }, cA);
test('nová zakázka pod číslem smazané se uloží (Nová zakázka po zavření)', r.status === 200 && r.soubor === S && zakazka(S).nazevAkce === 'Nová pod týmž číslem'
  && zakazka(S).varianty.length === 1, [r.status, r.chyba]);
const bezRaz = G.novaZakazka(); bezRaz.cislo = '2026 - OPR - CN - 5403';
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: G.importZakazka(kopie(bezRaz)), ocekavaneRazitko: '', ocekavanySoubor: '2026-OPR-CN-5403.json' }, cA);
test('jméno záznamu bez razítka (načtení nic nedokládá) = nová zakázka, uloží se', r.status === 200 && r.soubor === '2026-OPR-CN-5403.json', [r.status, r.chyba, r.soubor]);
o = await nacti(S, cA);
okno = G.importZakazka(o.zakazka); raz = G.uloRazitko(okno);
okno.cislo = '2026 - OPR - CN - 5402';
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: okno, ocekavaneRazitko: raz, ocekavanySoubor: S }, cA);
test('přečíslování načtené zakázky (jiné jméno, razítko původní) se uloží jako dosud', r.status === 200 && !!r.soubor && r.soubor !== S && !!zakazka(r.soubor), [r.status, r.chyba]);
const S2 = r.soubor;
o = await nacti(S2, cA);
okno = G.importZakazka(o.zakazka); raz = G.uloRazitko(okno);
await smaz(S2, cA);
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: okno, ocekavaneRazitko: raz }, cA);
test('tělo bez ocekavanySoubor (jiné cesty ukládání) beze změny chování', r.status === 200 && !!zakazka(S2), [r.status, r.chyba]);

/* ---------- 4. webhook po smazání založí novou čerstvou ---------- */
console.log('\n===== 4. webhook Pipedrive po smazání =====\n');
const D = SIM.pdSimStav().data;
const deal = D.dealy.find((x) => x.status === 'open' && x.org_id && x.person_id && /^CN-\d+ /.test(x.title));
test('příprava: deal v simulátoru', !!deal);
r = await volej(deal.id);
const W = r.soubor;
test('webhook založí kalkulaci s pdCerstva', r.status === 200 && r.akce === 'zalozeno' && zakazka(W) && zakazka(W).pdCerstva === true, r);
o = await nacti(W, cA);
okno = G.importZakazka(o.zakazka); raz = G.uloRazitko(okno);
delete okno.pdCerstva; okno.adresa = 'Stará kopie v okně 1, Vzorov';   // jako po přípravě a úpravě v prohlížeči
await smaz(W, cA);
test('příprava: kalkulace z webhooku smazána', !zakazka(W));
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: okno, ocekavaneRazitko: raz, ocekavanySoubor: W }, cA);
test('stará kopie smazané kalkulace z webhooku se neuloží (409 smazana)', r.status === 409 && r.smazana === true && !zakazka(W), [r.status, r.chyba]);
r = await volej(deal.id);
test('další webhook dealu založí NOVOU čerstvou kalkulaci (zalozeno, pdCerstva, bez staré kopie)',
  r.status === 200 && r.akce === 'zalozeno' && zakazka(r.soubor) && zakazka(r.soubor).pdCerstva === true
  && zakazka(r.soubor).adresa !== 'Stará kopie v okně 1, Vzorov', r);
/* ---------- 5. N3 (J. V. 24. 11.): čerstvou kalkulaci z Pipedrive nepřepíše stará kopie ---------- */
console.log('\n===== 5. N3: Přepsat serverovou verzi nad čerstvou kalkulací z webhooku =====\n');
const deal2 = D.dealy.find((x) => x.status === 'open' && x.org_id && x.person_id && /^CN-\d+ /.test(x.title) && x.id !== deal.id);
r = await volej(deal2.id);
const W2 = r.soubor;
o = await nacti(W2, cA);
const stareOkno = G.importZakazka(o.zakazka); const razStare = G.uloRazitko(stareOkno);
delete stareOkno.pdCerstva; stareOkno.adresa = 'STARÁ KOPIE 1, Vzorov';
await smaz(W2, cA);
r = await volej(deal2.id);
const razCerstve = G.uloRazitko(zakazka(W2));
test('příprava: po smazání webhook založil čerstvou kalkulaci pod týmž jménem', r.akce === 'zalozeno' && zakazka(W2).pdCerstva === true && razCerstve !== razStare, r.akce);
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: stareOkno, ocekavaneRazitko: razStare, ocekavanySoubor: W2 }, cA);
test('N3: staré okno uloží → 409 „znovu založil Pipedrive“ bez kolize (tlačítko Přepsat se nenabídne)',
  r.status === 409 && r.pdCerstvaJina === true && r.kolize !== true, [r.status, r.chyba]);
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: stareOkno, ocekavaneRazitko: razCerstve, ocekavanySoubor: W2 }, cA);
test('N3: „Přepsat serverovou verzi“ (razítko z disku) čerstvou kalkulaci nepřepíše — 409 s hláškou',
  r.status === 409 && r.pdCerstvaJina === true && /znovu založil Pipedrive/.test(r.chyba || ''), [r.status, r.chyba]);
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: stareOkno, ocekavaneRazitko: razCerstve, ocekavanySoubor: W2, prepsat: true }, cA);
test('N3: ani prepsat: true', r.status === 409 && r.pdCerstvaJina === true, [r.status, r.chyba]);
const stejneCislo = G.novaZakazka(); stejneCislo.cislo = zakazka(W2).cislo;
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: G.importZakazka(kopie(stejneCislo)), ocekavaneRazitko: '', ocekavanySoubor: '', prepsat: true }, cA);
test('N3: ani nová zakázka pod týmž číslem s vědomým přepsáním', r.status === 409 && r.pdCerstvaJina === true, [r.status, r.chyba]);
test('N3: čerstvá kalkulace zůstala (pdCerstva, razítko, adresa z dealu)', zakazka(W2).pdCerstva === true && G.uloRazitko(zakazka(W2)) === razCerstve
  && zakazka(W2).adresa !== 'STARÁ KOPIE 1, Vzorov');
o = await nacti(W2, cA);
const sPrepsat = G.importZakazka(o.zakazka); delete sPrepsat.pdCerstva; delete sPrepsat.pdVazbaWebhook;
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: sPrepsat, ocekavaneRazitko: G.uloRazitko(sPrepsat), ocekavanySoubor: W2, prepsat: true }, cA);
test('N3: prepsat: true bez vazby čerstvé neprojde ani s jejím razítkem', r.status === 409 && r.pdCerstvaJina === true
  && zakazka(W2).pdCerstva === true, [r.status, r.chyba]);
test('N3: stará kopie nesla jinou vazbu (jiný čas založení) — test není prázdný',
  !!(stareOkno.pdVazbaWebhook && stareOkno.pdVazbaWebhook.kdy) && stareOkno.pdVazbaWebhook.kdy !== zakazka(W2).pdVazbaWebhook.kdy);
o = await nacti(W2, cA);
const radne = G.importZakazka(o.zakazka);
delete radne.pdCerstva; radne.adresa = 'Řádně otevřená 1, Vzorov';   // jako po pdCerstvaPriprav a úpravě
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: radne, ocekavaneRazitko: G.uloRazitko(radne), ocekavanySoubor: W2 }, cA);
test('N3: řádné první uložení čerstvé (načtená v okně) projde 200 a příznak zmizí', r.status === 200 && zakazka(W2).pdCerstva === undefined
  && zakazka(W2).adresa === 'Řádně otevřená 1, Vzorov', [r.status, r.chyba]);
/* ---------- 6. dorevize D1/D2: totožnost čerstvé = vazba z webhooku, ne razítko ---------- */
console.log('\n===== 6. dorevize D1/D2: aktualizace webhookem, cizí razítko v datech =====\n');
const deal3 = D.dealy.find((x) => x.status === 'open' && x.org_id && x.person_id && /^CN-\d+ /.test(x.title) && x.id !== deal.id && x.id !== deal2.id);
r = await volej(deal3.id);
const W3 = r.soubor;
o = await nacti(W3, cA);
const okno3 = G.importZakazka(o.zakazka); const raz3 = G.uloRazitko(okno3);
delete okno3.pdCerstva; okno3.adresa = 'Rozpracováno v okně 3, Vzorov';   // řádně otevřená, ještě neuložená
const osoba3 = D.osoby.find((x) => x.id === deal3.person_id);
osoba3.first_name = String(osoba3.first_name || '') + 'X';   // změna v dealu → webhook kalkulaci aktualizuje
r = await volej(deal3.id);
test('příprava D1: webhook otevřenou čerstvou aktualizoval (nové razítko, pdCerstva drží, vazba týž čas)',
  r.akce === 'aktualizovano' && zakazka(W3).pdCerstva === true && G.uloRazitko(zakazka(W3)) !== raz3
  && zakazka(W3).pdVazbaWebhook.kdy === okno3.pdVazbaWebhook.kdy, [r.akce, r.zmeneno]);
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: okno3, ocekavaneRazitko: raz3, ocekavanySoubor: W3 }, cA);
test('D1: první uložení okna, které ji řádně otevřelo → běžná kolize s tlačítky, ne pdCerstvaJina',
  r.status === 409 && r.kolize === true && r.pdCerstvaJina !== true, [r.status, r.chyba]);
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: okno3, ocekavaneRazitko: r.naDisku, ocekavanySoubor: W3 }, cA);
test('D1: „Přepsat serverovou verzi“ vlastní připravenou kopií téže kalkulace projde', r.status === 200
  && zakazka(W3).adresa === 'Rozpracováno v okně 3, Vzorov' && zakazka(W3).pdCerstva === undefined, [r.status, r.chyba]);
const deal4 = D.dealy.find((x) => x.status === 'open' && x.org_id && x.person_id && /^CN-\d+ /.test(x.title) && ![deal.id, deal2.id, deal3.id].includes(x.id));
r = await volej(deal4.id);
const W4 = r.soubor;
o = await nacti(W4, cA);
const okno4 = G.importZakazka(o.zakazka); const raz4 = G.uloRazitko(okno4);
delete okno4.pdCerstva; okno4.uloRazitko = '2026-11-24T09:09:09.000Z';   // razítko přepsal zápis do složky
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: okno4, ocekavaneRazitko: raz4, ocekavanySoubor: W4 }, cA);
test('D2: jiné razítko v datech (zápis do složky), správná vazba a očekávané razítko → 200', r.status === 200 && zakazka(W4).pdCerstva === undefined,
  [r.status, r.chyba]);
test('do sítě nic', venku.length === 0, venku);

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
