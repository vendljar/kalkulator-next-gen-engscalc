/* ============================================================
 * PV #734 — AUTOR KALKULACE ZALOŽENÉ WEBHOOKEM = VLASTNÍK DEALU
 * (J. V. 23. 11. 2026)
 *
 * Proti simulátoru Pipedrive (nic do sítě):
 *   1. vlastník dealu má aktivní účet se stejným e-mailem → autorem je on
 *      (jméno z účtu), vazba nese `zalozil`, odpověď ani log nenesou e-mail;
 *   2. vlastník kalkulaci odemkne a uloží (#728), jiný obchodník jen čte;
 *   3. opakované doručení (i se změněným vlastníkem v Pipedrive) autora nemění;
 *   4. bez účtu / vypnutý účet / bez e-mailu / dva uživatelé s týmž e-mailem /
 *      deal bez vlastníka → technický účet pipedrive-webhook + varování + log;
 *   5. pdWebhookAutor: výpadek seznamu uživatelů → „chyba“, v1 user_id {id};
 *   6. zápis do dealu (pd_overeni): vazba „webhook“ s příznakem `zalozil`
 *      dokládá zápis i u autora = vlastník; bez příznaku ne; klient příznak
 *      nepodvrhne (pdVazbaDrz bere vazbu z uložené verze).
 * Spuštění: node netlify/test_pv_734_autor.mjs
 * ============================================================ */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
for (const k of ['PIPEDRIVE_SIMULATOR_SCENAR', 'PIPEDRIVE_TOKEN', 'PIPEDRIVE_DOMENA', 'PROSTREDI', 'PIPEDRIVE_WEBHOOK_KLIC', 'PIPEDRIVE_ZAPIS',
  'NETLIFY', 'SITE_ID', 'SITE_NAME', 'DEPLOY_ID', 'CONTEXT', 'BRANCH', 'HEAD', 'URL', 'DEPLOY_URL', 'DEPLOY_PRIME_URL']) delete process.env[k];
process.env.PIPEDRIVE_SIMULATOR = '1';
const KLIC = 'kng-test-webhook-klic-0123456789abcdefghijklmnop';
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
(await import('./lib/ares_server.mjs')).ARES_SIT.fetch = async () => new Response('{}', { status: 404 });
const logy = [];
const puvodniLog = console.log;
console.log = (...a) => { const t = a.join(' '); if (t.startsWith('pd_webhook: ')) logy.push(t); else puvodniLog(...a); };

const { default: webhook } = await import('./functions/pd_webhook.mjs');
const { default: prihlaseni } = await import('./functions/prihlaseni.mjs');
const { default: program } = await import('./functions/program.mjs');
const { default: zakazky } = await import('./functions/zakazky.mjs');
const { default: uzivatele } = await import('./functions/uzivatele.mjs');
const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');
const SIM = await import('./lib/pipedrive_simulator.mjs');
const W = await import('./lib/pd_webhook.mjs');
const VZ = await import('./lib/pd_vazba.mjs');
const { pdDealPatriZakazce } = await import('./lib/pd_overeni.mjs');
const { jadro } = await import('./lib/jadro.mjs');
await jadro();
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
const ZC = require('../src/zkusebni_cenik.js');
const G = globalThis;

let ok = 0, fail = 0; const selhalo = [];
const test = (n, cond, info) => {
  if (cond) { ok++; puvodniLog('OK  ' + n); }
  else { fail++; selhalo.push(n); puvodniLog('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 600)); }
};
const kopie = (x) => JSON.parse(JSON.stringify(x));
const odpovedi = [];
async function volej(dealId) {
  const r = await webhook(new Request('https://testweb.example/api/pd/webhook', { method: 'POST',
    headers: { 'content-type': 'application/json', 'x-kalkulator-klic': KLIC }, body: JSON.stringify({ dealId }) }));
  const text = await r.text();
  odpovedi.push(text);
  return { status: r.status, ...JSON.parse(text) };
}
const zakazka = (soubor) => JSON.parse(pamet.get('zakazky/z/' + soubor) || 'null');
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const login = async (e, h) => ((await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h })).headers.get('set-cookie') || '').split(';')[0];

const D = () => SIM.pdSimStav().data;
SIM.pdSimReset();
const U = D().uzivatele;   // 1 Jan, 2 Petra, 3 Tomáš, 4 Eva (smyšlení)
const PETRA = U[1].email;
const dealyOtevrene = D().dealy.filter((d) => d.status === 'open' && d.org_id && d.person_id && /^CN-\d+ /.test(d.title));
const dealVlastnika = (uid, krome = []) => dealyOtevrene.find((d) => d.owner_id === uid && !krome.includes(d.id));

/* Účty kalkulátoru: Petra (aktivní, obchodník), Eva (vypnutá), cizí obchodník. Tomáš účet nemá. */
const cA = await login(ADMIN_EMAIL, 'Docasne.Heslo.123');
await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
  slevy: { minMarze: 0, maxGlobalni: 0.3, stropy: {} }, poznamka: 'pv734' }, cA);
for (const [email, jmeno] of [[U[1].email, 'Petra Ukázková'], [U[3].email, 'Eva Smyšlená'], ['obch.cizi734@priklad.cz', 'Cizí Obchodník']]) {
  const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email, jmeno, role: 'Obchodník', heslo: 'Heslo12345x' }, cA)).json();
  if (!x.ok) throw new Error('účet ' + JSON.stringify(x));
}
{ const k = 'uzivatele/' + U[3].email; const u = JSON.parse(pamet.get(k)); u.aktivni = false; pamet.set(k, JSON.stringify(u)); }
const cPetra = await login(U[1].email, 'Heslo12345x');

/* ---------- 1. VLASTNÍK MÁ ÚČET ---------- */
puvodniLog('\n===== 1. VLASTNÍK DEALU MÁ ÚČET =====\n');
const DP = dealVlastnika(U[1].id);
test('příprava: deal Petry v simulátoru', !!DP, DP && DP.id);
let r = await volej(DP.id);
const SP = r.soubor;
let z = zakazka(SP);
test('#734: založeno, autorem je vlastník dealu (e-mail účtu), jméno z účtu', r.status === 200 && r.akce === 'zalozeno'
  && z.autor === U[1].email && z.autorJmeno === 'Petra Ukázková', [r.status, z && z.autor, z && z.autorJmeno]);
test('#734: upravil zůstává technický účet webhooku (zapsal ho webhook, ne člověk)', z.upravil === W.PD_WEBHOOK_AUTOR);
test('#734: vazba „webhook“ nese příznak zalozil', z.pdVazbaWebhook && z.pdVazbaWebhook.stav === 'webhook' && z.pdVazbaWebhook.zalozil === true, z.pdVazbaWebhook);
test('#734: odpověď webhooku: autor „vlastnik“, bez e-mailu a bez varování o autorovi', r.autor === 'vlastnik'
  && !odpovedi[odpovedi.length - 1].includes('@') && !(r.varovani || []).some((v) => /autorem/.test(v)), r);
test('#734: protokol zakázky: „autor: vlastník dealu“ (jméno, bez e-mailu)', (z.protokol || []).some((p) => /autor: vlastník dealu Petra Ukázková/.test(p.co))
  && !(z.protokol || []).some((p) => String(p.co).includes('@')), (z.protokol || []).map((p) => p.co));
test('#734: log funkce: autor „vlastnik“, bez e-mailu', /"autor":"vlastnik"/.test(logy[logy.length - 1]) && !logy[logy.length - 1].includes('@'), logy[logy.length - 1]);
test('#734: rejstřík zakázek nese autora = vlastník', (JSON.parse(pamet.get('zakazky/_rejstrik')).zakazky || []).some((x) => x.soubor === SP && x.autor === U[1].email));

/* ---------- 2. VLASTNÍK ODEMKNE A ULOŽÍ, CIZÍ JEN ČTE ---------- */
puvodniLog('\n===== 2. ODEMČENÍ A ULOŽENÍ =====\n');
test('#728/#734: vlastník (obchodník) smí kalkulaci odemknout', G.zamekCteniSmiOdemknout(z, { email: U[1].email, role: 'Obchodník' }) === true);
test('#734: jiný obchodník ji nesmí odemknout (jen čte)', G.zamekCteniSmiOdemknout(z, { email: 'obch.cizi734@priklad.cz', role: 'Obchodník' }) === false);
{
  const go = await zakazky(new Request('http://x/api/zakazky?soubor=' + encodeURIComponent(SP), { headers: { cookie: cPetra } }));
  const ulozena = (await go.json()).zakazka;
  G.cenikDnesniProVariantu = () => ({ cenik: ZC.zkusebniCenik(), proj: { cenik: ZC.zkusebniCenikProj() } });
  const vOkne = G.importZakazka(kopie(ulozena));
  delete G.cenikDnesniProVariantu;
  delete vOkne.pdCerstva;
  vOkne.varianty[0].data.ock.zadani.zdvih = 13;
  vOkne.pdVazbaWebhook = Object.assign({}, vOkne.pdVazbaWebhook, { stav: 'potvrzeno' });   // podvrh klienta se zahodí
  const ul = await post(zakazky, 'http://x/api/zakazky', { zakazka: vOkne, ocekavaneRazitko: G.uloRazitko(ulozena) }, cPetra);
  const ulj = await ul.json();
  z = zakazka(SP);
  test('#734: vlastník kalkulaci uloží (200), autor zůstane, zdvih uložen', ul.status === 200 && z.autor === U[1].email
    && z.varianty[0].data.ock.zadani.zdvih === 13, [ul.status, ulj.chyba]);
  test('#734: vazbu (stav, zalozil) klient nepřepíše — z uložené verze', z.pdVazbaWebhook.stav === 'webhook' && z.pdVazbaWebhook.zalozil === true, z.pdVazbaWebhook);
}

/* ---------- 3. OPAKOVANÉ DORUČENÍ ---------- */
puvodniLog('\n===== 3. OPAKOVANÉ DORUČENÍ =====\n');
{
  const deal = D().dealy.find((d) => d.id === DP.id);
  deal.owner_id = U[0].id;   // vlastník se v Pipedrive změnil
  const pocetUsers = SIM.pdSimStav().pozadavky.filter((x) => x.startsWith('GET /api/v1/users')).length;
  r = await volej(DP.id);
  z = zakazka(SP);
  test('#734: opakované doručení autora nemění (i po změně vlastníka v Pipedrive)', r.status === 200 && r.akce !== 'zalozeno'
    && z.autor === U[1].email && z.autorJmeno === 'Petra Ukázková', [r.akce, z.autor]);
  test('#734: u existující kalkulace se uživatelé Pipedrive nečtou', SIM.pdSimStav().pozadavky.filter((x) => x.startsWith('GET /api/v1/users')).length === pocetUsers);
  test('#734: odpověď opakovaného doručení nenese autora', r.autor === undefined, r.autor);
}

/* ---------- 4. TECHNICKÝ ÚČET ---------- */
puvodniLog('\n===== 4. NEJASNÝ VLASTNÍK → TECHNICKÝ ÚČET =====\n');
const pouzite = [DP.id];
async function technicky(popis, priprava, stav) {
  const d = dealyOtevrene.find((x) => !pouzite.includes(x.id) && x.owner_id === U[0].id);
  pouzite.push(d.id);
  const dd = D().dealy.find((x) => x.id === d.id);
  const obnov = priprava(dd) || (() => {});
  const r2 = await volej(d.id);
  const z2 = zakazka(r2.soubor);
  const log = logy[logy.length - 1];
  test('#734 ' + popis + ': autor zůstal technický účet', r2.status === 200 && r2.akce === 'zalozeno' && z2.autor === W.PD_WEBHOOK_AUTOR
    && z2.autorJmeno === W.PD_WEBHOOK_AUTOR_JMENO, [r2.status, z2 && z2.autor]);
  test('#734 ' + popis + ': varování v odpovědi a v logu, stav „' + stav + '“, bez e-mailu', r2.autor === 'technicky'
    && (r2.varovani || []).some((v) => /autorem kalkulace zůstal technický účet/.test(v)) && log.includes('"autor":"' + stav + '"')
    && !log.includes('@') && !odpovedi[odpovedi.length - 1].includes('@'), [r2.varovani, log]);
  test('#734 ' + popis + ': vazba přesto „webhook“ se zalozil (zápis dokládá, jako dřív)', z2.pdVazbaWebhook.zalozil === true
    && !!VZ.pdVazbaDokladaZapis(z2, (x) => G.ctrlPdDealIdNorm(x)));
  test('#734 ' + popis + ': jiný obchodník (ani vlastník) kalkulaci neodemkne — práva se nerozšířila',
    G.zamekCteniSmiOdemknout(z2, { email: 'obch.cizi734@priklad.cz', role: 'Obchodník' }) === false
    && G.zamekCteniSmiOdemknout(z2, { email: PETRA, role: 'Obchodník' }) === false);
  obnov();
}
await technicky('vlastník bez účtu', (d) => { d.owner_id = U[2].id; }, 'nenalezen');
await technicky('vypnutý účet vlastníka', (d) => { d.owner_id = U[3].id; }, 'nenalezen');
await technicky('vlastník bez e-mailu v Pipedrive', (d) => { d.owner_id = U[1].id; const e = U[1].email; U[1].email = ''; return () => { U[1].email = e; }; }, 'bez-emailu');
await technicky('dva uživatelé Pipedrive s týmž e-mailem', (d) => { d.owner_id = U[1].id;
  U.push({ id: 77, name: 'Duplicita', email: U[1].email.toUpperCase(), active_flag: true }); return () => { U.pop(); }; }, 'nejednoznacny');
await technicky('deal bez vlastníka', (d) => { delete d.owner_id; delete d.user_id; }, 'bez-vlastnika');
await technicky('vlastník mezi uživateli Pipedrive není', (d) => { d.owner_id = 999; }, 'nenalezen');

/* ---------- 5. ČISTÁ FUNKCE ---------- */
puvodniLog('\n===== 5. pdWebhookAutor =====\n');
{
  const ucet = async (e) => (e === 'a@priklad.cz' ? { email: 'a@priklad.cz', jmeno: 'A <x>', aktivni: true } : null);
  let v = await W.pdWebhookAutor({ owner_id: 5 }, { nactiUzivatele: async () => { throw new Error('výpadek'); }, ucet });
  test('výpadek seznamu uživatelů → „chyba“', v.stav === 'chyba', v);
  v = await W.pdWebhookAutor({ user_id: { id: 5 } }, { nactiUzivatele: async () => [{ id: 5, email: ' A@Priklad.cz ' }], ucet });
  test('v1 user_id { id } a e-mail s mezerami / velkými písmeny → vlastník, jméno bez < >', v.stav === 'vlastnik'
    && v.autor === 'a@priklad.cz' && v.autorJmeno === 'A x', v);
  v = await W.pdWebhookAutor({ owner_id: 5 }, { nactiUzivatele: async () => [{ id: 5, email: 'a@priklad.cz' }],
    ucet: async () => ({ email: 'jiny@priklad.cz' }) });
  test('účet nese jiný e-mail než klíč → nejednoznačný', v.stav === 'nejednoznacny', v);
  v = await W.pdWebhookAutor({ owner_id: 5 }, { nactiUzivatele: async () => ({ chyba: 1 }), ucet });
  test('seznam uživatelů jiného tvaru → „chyba“', v.stav === 'chyba', v);
  v = await W.pdWebhookAutor({ owner_id: 5 }, { nactiUzivatele: async () => [{ id: 5, email: W.PD_WEBHOOK_AUTOR }], ucet });
  test('e-mail „pipedrive-webhook“ se jako vlastník nebere', v.stav === 'nenalezen', v);
  test('pdWebhookVlastnikId: owner_id má přednost, neplatné → 0', W.pdWebhookVlastnikId({ owner_id: 3, user_id: 4 }) === 3
    && W.pdWebhookVlastnikId({ owner_id: '1e3' }) === 0 && W.pdWebhookVlastnikId(null) === 0);
}

/* ---------- 6. ZÁPIS DO DEALU (pd_overeni) ---------- */
puvodniLog('\n===== 6. VAZBA DOKLÁDÁ ZÁPIS =====\n');
{
  const n = (x) => G.ctrlPdDealIdNorm(x);
  const zp = zakazka(SP);
  test('#734: vazba „webhook“ + zalozil + autor = vlastník dokládá zápis', !!VZ.pdVazbaDokladaZapis(zp, n));
  const bez = kopie(zp); delete bez.pdVazbaWebhook.zalozil;
  test('#734: bez příznaku zalozil a s lidským autorem zápis nedokládá (RJ N1 beze změny)', VZ.pdVazbaDokladaZapis(bez, n) === null);
  const stary = kopie(bez); stary.autor = W.PD_WEBHOOK_AUTOR;
  test('#734: starší kalkulace (autor pipedrive-webhook, bez příznaku) dokládá zápis jako dřív', !!VZ.pdVazbaDokladaZapis(stary, n));
  const ov = await pdDealPatriZakazce(zp, zp.pdDealId, {}, G);
  test('#734: pdDealPatriZakazce: zdroj „vazba“ bez čtení Pipedrive', ov.ok === true && ov.zdroj === 'vazba', ov);
  test('#734: pdVazbaNorm nese zalozil jen jako true', VZ.pdVazbaNorm(Object.assign({}, zp.pdVazbaWebhook, { zalozil: 'ano' })).zalozil === undefined
    && VZ.pdVazbaNorm(zp.pdVazbaWebhook).zalozil === true);
}

test('do sítě za celý běh nic', venku.length === 0, venku);
puvodniLog('\n' + ok + ' OK, ' + fail + ' FAIL' + (fail ? '\nSelhalo:\n  ' + selhalo.join('\n  ') : ''));
process.exit(fail ? 1 : 0);
