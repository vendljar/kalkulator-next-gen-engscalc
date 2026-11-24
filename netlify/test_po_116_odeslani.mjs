/* ============================================================
 * PO #116 (CRM-17) — ODESLÁNÍ NABÍDKY DO DEALU V PIPEDRIVE (J. V. 24. 11. 2026)
 *
 * POST /api/pd/odeslani (functions/pd_odeslani.mjs) JEN proti simulátoru:
 *   1. náhled: tabulka „dnes v Pipedrive / nově“, jen GET; pole krycího listu
 *      bez sekcí SoD; hodnota dealu = cena odeslané varianty (server); fáze
 *      22 → 23; poznámka bez e-mailů a telefonů; datum nabídky = datum zámku;
 *   2. zápis po potvrzení: PATCH jen změn + stage_id 23, nikdy status;
 *      poznámka jedna (opakování ji neduplikuje); stav v zak.pdOdeslani + protokol;
 *   3. fáze jen dopředu podle order_nr (24/25/26 ponechá, vyhraný ponechá,
 *      ztracený zastaví, chybějící pořadí nehýbe);
 *   4. zámek neuložený / jiný dokument → 409; souběh (otisk) → 409;
 *   5. soubor Wordu: přiložení, název ze serveru, ne-docx 400, nad limit 413,
 *      opakování bez druhého souboru, nedoručená odpověď → dohledání;
 *   6. práva, vazba, cizí CN, vypnutý zápis, pdOdeslani z prohlížeče se zahodí.
 * Spuštění: node netlify/test_po_116_odeslani.mjs
 * ============================================================ */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
for (const k of ['PIPEDRIVE_SIMULATOR_SCENAR', 'PIPEDRIVE_TOKEN', 'PIPEDRIVE_DOMENA', 'PROSTREDI', 'PIPEDRIVE_WEBHOOK_KLIC', 'PIPEDRIVE_ZAPIS',
  'PIPEDRIVE_FAZE_PRODANO', 'PIPEDRIVE_FAZE_ODESLANO', 'NETLIFY', 'SITE_ID', 'SITE_NAME', 'DEPLOY_ID', 'CONTEXT', 'BRANCH', 'HEAD', 'URL', 'DEPLOY_URL', 'DEPLOY_PRIME_URL']) delete process.env[k];
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
const puvodniLog = console.log;
console.log = (...a) => { const t = a.join(' '); if (!t.startsWith('pd_webhook: ')) puvodniLog(...a); };

const { default: webhook } = await import('./functions/pd_webhook.mjs');
const { default: prihlaseni } = await import('./functions/prihlaseni.mjs');
const { default: program } = await import('./functions/program.mjs');
const { default: zakazky } = await import('./functions/zakazky.mjs');
const { default: uzivatele } = await import('./functions/uzivatele.mjs');
const { default: odeslaniFn } = await import('./functions/pd_odeslani.mjs');
const PO = await import('./lib/pd_odeslani.mjs');
const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');
const SIM = await import('./lib/pipedrive_simulator.mjs');
const PP = await import('./lib/pd_prodej.mjs');
const { pdHashZNazvu, POLE_DEALU } = await import('./lib/pd_mapa.mjs');
const { pdZapisDealu } = await import('./lib/pd_prevod.mjs');
const { jadro } = await import('./lib/jadro.mjs');
const { JEKLY } = await jadro();
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
for (const f of ['plan_plateb.js', 'nabidka_proj.js', 'pd_nanecisto.js']) Object.assign(globalThis, require('../src/' + f));
const zk = require('../src/zakazka.js');
const zam = require('../src/zamek.js');
const ZC = require('../src/zkusebni_cenik.js');
const OBJ = require('../src/objednane.js');
const G = globalThis;

let ok = 0, fail = 0; const selhalo = [];
const test = (n, cond, info) => {
  if (cond) { ok++; puvodniLog('OK  ' + n); }
  else { fail++; selhalo.push(n); puvodniLog('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 700)); }
};
const kopie = (x) => JSON.parse(JSON.stringify(x));
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const login = async (e, h) => ((await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h })).headers.get('set-cookie') || '').split(';')[0];
const zakazka = (soubor) => JSON.parse(pamet.get('zakazky/z/' + soubor) || 'null');
const zapisZakazku = (soubor, z) => pamet.set('zakazky/z/' + soubor, JSON.stringify(z));
const texty = [];
async function odesl(telo, cookie) {
  const r = await post(odeslaniFn, 'http://x/api/pd/odeslani', telo, cookie);
  const t = await r.text(); texty.push(t);
  return { status: r.status, ...JSON.parse(t) };
}
const D = () => SIM.pdSimStav().data;
const pozadavky = () => SIM.pdSimStav().pozadavky;
const jePatch = (t) => t.pozadavek.startsWith('PATCH /api/v2/deals/') && !/"custom_fields":\{"[0-9a-f]+":"https:\/\/testweb/.test(t.telo);
const tela = () => SIM.pdSimStav().tela.filter(jePatch);
const patche = () => tela().map((t) => t.pozadavek);
const HASH_CN = pdHashZNazvu('Číslo nabídky (CN)'), HASH_ODKAZ = pdHashZNazvu('Odkaz na kalkulaci');

SIM.pdSimReset();
const U = D().uzivatele;
const PETRA = U[1].email;
const cA = await login(ADMIN_EMAIL, 'Docasne.Heslo.123');
await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
  slevy: { minMarze: 0, maxGlobalni: 0.3, stropy: {} }, poznamka: 'po116' }, cA);
for (const [email, jmeno] of [[PETRA, 'Petra Ukázková'], ['obch.cizi116@priklad.cz', 'Cizí Obchodník']]) {
  const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email, jmeno, role: 'Obchodník', heslo: 'Heslo12345x' }, cA)).json();
  if (!x.ok) throw new Error('účet ' + JSON.stringify(x));
}
const cP = await login(PETRA, 'Heslo12345x');
const cC = await login('obch.cizi116@priklad.cz', 'Heslo12345x');
const platny = () => JSON.parse(pamet.get('program/db')).platny;

/* Deal Petry ve fázi `faze` → webhook založí kalkulaci (autor Petra) → doplní
 * a vytiskne cenovou nabídku (první zámek = odeslání) → uloží. */
const pouzite = [];
async function odeslanaZakazka({ faze = 22, typ = 'nabidka' } = {}) {
  const deal = D().dealy.find((d) => d.status === 'open' && d.org_id && d.person_id && d.pipeline_id === 1
    && d.owner_id === U[1].id && /^CN-\d+ /.test(d.title) && !pouzite.includes(d.id));
  pouzite.push(deal.id);
  deal.stage_id = faze;
  const w = await (await webhook(new Request('https://testweb.example/api/pd/webhook', { method: 'POST',
    headers: { 'content-type': 'application/json', 'x-kalkulator-klic': KLIC }, body: JSON.stringify({ dealId: deal.id }) }))).json();
  if (!w.ok) throw new Error('webhook ' + JSON.stringify(w));
  const soubor = w.soubor;
  const g = zakazka(soubor);
  G.cenikDnesniProVariantu = () => ({ cenik: kopie(platny().cenik), proj: { cenik: kopie(platny().cenikProj) } });
  const z = zk.importZakazka(kopie(g));
  delete G.cenikDnesniProVariantu;
  delete z.pdCerstva;
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.kryci = { hodnoty: { jmenoPrijmeni: 'Zkušební Kontakt' } };
  zam.zamkniVariantu(v, { typ, kdy: new Date().toISOString(), kdo: 'Test PO', cislo: zam.variantaCislo(z, v),
    vysledek: zam.zamekVysledekSpocti(v, JEKLY, 'v-po116'), snimek: zam.zamekSnimekSpocti(v), datumNabidky: '2026-11-24' });
  const r = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: z, ocekavaneRazitko: g.uloRazitko }, cP)).json();
  if (!r.ok) throw new Error('uložení ' + JSON.stringify(r));
  const u = zakazka(soubor);
  return { soubor, deal: D().dealy.find((d) => d.id === deal.id), varianta: u.varianty[0].id, zamekKdy: u.varianty[0].zamek.kdy };
}
const zaklad = (A) => ({ soubor: A.soubor, varianta: A.varianta, zamekKdy: A.zamekKdy });
const radek = (d, k) => (d.radky || []).find((x) => x.klic === k) || {};
const stav = (soubor) => zakazka(soubor).pdOdeslani || null;
const cenaVarianty = (soubor) => { const z = zk.importZakazka(kopie(zakazka(soubor))); const v = z.varianty[0];
  return Math.round(G.cenaNabidkyOck(G.vypocetZ(v, JEKLY), v.data.sleva, v.data.zaokr).cena * 100) / 100; };
/* Minimální platný docx (zip: [Content_Types].xml + word/document.xml, bez komprese). */
function docx(navic = 0) {
  const soubory = [['[Content_Types].xml', '<Types/>'], ['word/document.xml', '<w:document/>' + ' '.repeat(navic)]];
  const casti = [];
  for (const [jm, obsah] of soubory) {
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(jm.length, 26);
    const b = Buffer.from(obsah); h.writeUInt32LE(b.length, 18); h.writeUInt32LE(b.length, 22);
    casti.push(h, Buffer.from(jm), b);
  }
  return Buffer.concat(casti).toString('base64');
}
const souboryDealu = (id) => (D().soubory || []).filter((f) => f.deal_id === id);

/* ---------- 1. NÁHLED ---------- */
puvodniLog('\n===== 1. NÁHLED =====\n');
const A = await odeslanaZakazka();
const cena = cenaVarianty(A.soubor);
test('(příprava: odeslaná zakázka z dealu Petry ve fázi 22, zámek uložen, zpracovatel = Petra)', cena > 0 && A.deal.stage_id === 22
  && zakazka(A.soubor).varianty[0].zamek.zpracovatel && zakazka(A.soubor).varianty[0].zamek.zpracovatel.email === PETRA,
  [cena, A.deal.stage_id, zakazka(A.soubor).varianty[0].zamek.zpracovatel]);
let pred = pozadavky().length;
let n = await odesl({ ...zaklad(A), akce: 'nahled' }, cP);
test('náhled → 200, otisk, zápis povolen, něco k zápisu', n.status === 200 && /^[0-9a-f]{32}$/.test(n.otisk) && n.zapisPovolen === true
  && n.nicKZapisu === false && !n.zastaveno, [n.status, n.chyba, n.zastaveno]);
test('náhled do Pipedrive jen čte (žádný PATCH ani POST)', pozadavky().slice(pred).every((x) => /^GET /.test(x)), pozadavky().slice(pred));
test('hodnota dealu = cena odeslané varianty ze serveru', Math.abs(((radek(n, 'hodnotaDealu').hodnota || {}).value || 0) - cena) < 0.01
  && radek(n, 'hodnotaDealu').posle === true, radek(n, 'hodnotaDealu'));
test('fáze 22 → 23 „Nabídka odeslána“', radek(n, 'fazeDealu').hodnota === 23 && radek(n, 'fazeDealu').posle === true, radek(n, 'fazeDealu'));
test('pole smlouvy o dílo v tabulce nejsou', !(n.radky || []).some((r) => PO.PD_ODESLANI_BEZ_SOD.includes(r.klic)), (n.radky || []).map((r) => r.klic));
test('Číslo nabídky (CN) mezi zapisovanými poli', radek(n, 'cisloNabidky').posle === true, radek(n, 'cisloNabidky'));
test('datum nabídky = datum zámku (24. 11. 2026) v náhledu i poznámce', n.datum === '2026-11-24' && /ze dne 24\. 11\. 2026/.test(n.poznamka), [n.datum, n.poznamka]);
test('poznámka: číslo, cena, Vypracoval (jméno), odkaz, značka zakázky', n.poznamka.startsWith('Nabídka odeslána: ') && /Vypracoval: .*Petra Ukázková/.test(n.poznamka)
  && /Kalkulace: https?:\/\/.*zakazka=/.test(n.poznamka) && /OCK [\d ]+ Kč bez DPH/.test(n.poznamka)
  && n.poznamka.endsWith('\n— nabídka ' + zakazka(A.soubor).cislo) && n.poznamka.includes(zakazka(A.soubor).varianty[0].zamek.cislo), n.poznamka);
test('poznámka bez e-mailů a telefonů', !/@|\+420/.test(n.poznamka), n.poznamka);
test('e-maily uživatelů Pipedrive se klientovi nevracejí', ![U[0], U[2], U[3]].some((u) => texty[texty.length - 1].includes(u.email)));

/* ---------- 2. ZÁPIS ---------- */
puvodniLog('\n===== 2. ZÁPIS PO POTVRZENÍ =====\n');
let r = await odesl({ ...zaklad(A), akce: 'zapis', otisk: 'f'.repeat(32) }, cP);
test('jiný otisk než z náhledu → 409 „zmeneno“, žádný PATCH', r.status === 409 && r.kod === 'zmeneno' && patche().length === 0, r);
r = await odesl({ ...zaklad(A), akce: 'zapis' }, cP);
test('zápis bez otisku → 400', r.status === 400, r);
r = await odesl({ ...zaklad(A), akce: 'zapis', otisk: n.otisk, stav: 'won' }, cP);
test('parametr stav → 400', r.status === 400, r);
const dealPred = kopie(D().dealy.find((d) => d.id === A.deal.id));
r = await odesl({ ...zaklad(A), akce: 'zapis', otisk: n.otisk }, cP);
test('zápis → 200 zapsano, poznámka založena', r.status === 200 && r.stav === 'zapsano' && r.poznamka === 'zalozeno'
  && r.zapsano.includes('Hodnota dealu') && r.zapsano.includes('Fáze dealu'), r);
const telo = JSON.parse((tela()[0] || {}).telo || '{}');
test('jediný PATCH: stage_id 23, value = cena, NIKDY status, jen změněná pole', patche().length === 1 && telo.stage_id === 23
  && Math.abs(telo.value - cena) < 0.01 && !('status' in telo)
  && Object.entries(telo.custom_fields || {}).every(([k, v]) => PP.pdProdejKlic(v) !== PP.pdProdejKlic(dealPred.custom_fields[k])), telo);
const dealPo = D().dealy.find((d) => d.id === A.deal.id);
test('deal v simulátoru: fáze 23, stav open, CN zapsáno', dealPo.stage_id === 23 && dealPo.status === 'open'
  && String(dealPo.custom_fields[HASH_CN] || '').length > 0, [dealPo.stage_id, dealPo.status, dealPo.custom_fields[HASH_CN]]);
const pozn = () => (D().poznamky || []).filter((p) => p.deal_id === A.deal.id && /^Nabídka odeslána/.test(p.content));
test('k dealu právě jedna poznámka „Nabídka odeslána“, HTML escapované řádky', pozn().length === 1 && /<br>/.test(pozn()[0].content), pozn());
test('zak.pdOdeslani: pole i poznámka zapsáno, id poznámky', stav(A.soubor) && stav(A.soubor).pole.stav === 'zapsano'
  && stav(A.soubor).poznamka.stav === 'zapsano' && stav(A.soubor).poznamka.id === pozn()[0].id && r.razitko === zakazka(A.soubor).uloRazitko, stav(A.soubor));
test('protokol: „Zápis odeslání nabídky … zapsáno“', (zakazka(A.soubor).protokol || []).some((p) => /Zápis odeslání nabídky .* do dealu \d+: zapsáno/.test(p.co)),
  (zakazka(A.soubor).protokol || []).slice(-2));
n = await odesl({ ...zaklad(A), akce: 'nahled' }, cP);
test('nový náhled: nic k zápisu, fáze ponechána, stav z dřívějška', n.status === 200 && n.nicKZapisu === true
  && radek(n, 'fazeDealu').stav === 'ponechano' && n.stav && n.stav.pole.stav === 'zapsano', [n.nicKZapisu, radek(n, 'fazeDealu'), n.stav]);
r = await odesl({ ...zaklad(A), akce: 'zapis', otisk: n.otisk }, cP);
test('opakovaný zápis: žádný další PATCH, poznámka beze změny, pořád jedna', r.status === 200 && patche().length === 1
  && r.poznamka === 'beze-zmeny' && pozn().length === 1, [r, patche().length, pozn().length]);
/* Ztracené id poznámky (např. odemčení): úprava najde naši poznámku podle úvodu a značky. */
{ const z = zakazka(A.soubor); z.pdOdeslani.poznamka = { stav: 'ceka', kdy: '' }; zapisZakazku(A.soubor, z); }
A.deal.custom_fields[HASH_CN] = String(dealPo.custom_fields[HASH_CN]);
D().dealy.find((d) => d.id === A.deal.id).value = 1;   // ať je co zapsat
n = await odesl({ ...zaklad(A), akce: 'nahled' }, cP);
r = await odesl({ ...zaklad(A), akce: 'zapis', otisk: n.otisk }, cP);
test('bez uloženého id: poznámka se dohledá a upraví, ne založí druhá', r.status === 200 && r.poznamka === 'upraveno' && pozn().length === 1, [r, pozn().length]);

/* Poznámku obchodník v Pipedrive ručně přepsal (úvod i značka pryč): zápis ji najde podle uloženého id a upraví. */
{ const pz = pozn()[0]; const id = pz.id;
  pz.content = 'Ručně upraveno obchodníkem';
  const z = zakazka(A.soubor); z.pdOdeslani.poznamka.otisk = '0'.repeat(16); zapisZakazku(A.soubor, z);
  n = await odesl({ ...zaklad(A), akce: 'nahled' }, cP);
  r = await odesl({ ...zaklad(A), akce: 'zapis', otisk: n.otisk }, cP);
  const vsechny = (D().poznamky || []).filter((p) => p.deal_id === A.deal.id && p.active_flag !== false);
  test('ručně přepsaná poznámka: upraví se podle uloženého id, druhá nevznikne', r.status === 200 && r.poznamka === 'upraveno'
    && vsechny.filter((p) => p.id === id && /^Nabídka odeslána/.test(p.content)).length === 1 && pozn().length === 1, [r, vsechny.map((p) => p.id)]);
}

/* ---------- 3. FÁZE JEN DOPŘEDU ---------- */
puvodniLog('\n===== 3. FÁZE JEN DOPŘEDU =====\n');
for (const f of [24, 25, 26]) {
  const B = await odeslanaZakazka({ faze: f });
  const p0 = patche().length;
  const nb = await odesl({ ...zaklad(B), akce: 'nahled' }, cP);
  const rb = await odesl({ ...zaklad(B), akce: 'zapis', otisk: nb.otisk }, cP);
  const t = JSON.parse((tela()[tela().length - 1] || {}).telo || '{}');
  test('deal ve fázi ' + f + ': fáze „ponechá se“, PATCH bez stage_id, pole se zapíšou, deal zůstal v ' + f,
    radek(nb, 'fazeDealu').stav === 'ponechano' && rb.status === 200 && patche().length === p0 + 1 && !('stage_id' in t)
    && D().dealy.find((d) => d.id === B.deal.id).stage_id === f, [radek(nb, 'fazeDealu'), rb.status, t.stage_id]);
}
{ /* Pořadí podle order_nr, ne podle id: fáze 24 přesunutá před 23 → deal v 24 se posune do 23. */
  const B = await odeslanaZakazka({ faze: 24 });
  const f24 = D().faze.find((f) => f.id === 24), puv = f24.order_nr;
  f24.order_nr = 0;
  const nb = await odesl({ ...zaklad(B), akce: 'nahled' }, cP);
  test('order_nr rozhoduje (24 přeřazená před 23): přesun 24 → 23', radek(nb, 'fazeDealu').hodnota === 23 && radek(nb, 'fazeDealu').stav === 'zapise', radek(nb, 'fazeDealu'));
  delete f24.order_nr;
  const nc = await odesl({ ...zaklad(B), akce: 'nahled' }, cP);
  test('chybí pořadí fáze → fáze se nemění (nelze), zápis polí nezastaven', radek(nc, 'fazeDealu').stav === 'nelze' && !nc.zastaveno, radek(nc, 'fazeDealu'));
  f24.order_nr = puv;
}
{ const B = await odeslanaZakazka({ faze: 22 });
  D().dealy.find((d) => d.id === B.deal.id).status = 'won';
  const nb = await odesl({ ...zaklad(B), akce: 'nahled' }, cP);
  test('vyhraný deal: fáze ponechána, pole se zapíšou (nezastaveno)', radek(nb, 'fazeDealu').stav === 'ponechano' && !nb.zastaveno, radek(nb, 'fazeDealu'));
  D().dealy.find((d) => d.id === B.deal.id).status = 'lost';
  const nl = await odesl({ ...zaklad(B), akce: 'nahled' }, cP);
  const p0 = patche().length;
  const rl = await odesl({ ...zaklad(B), akce: 'zapis', otisk: nl.otisk }, cP);
  test('ztracený deal: zastaveno, zápis 409 bez PATCH, stav chyba', /ztracený/.test(nl.zastaveno) && rl.status === 409 && patche().length === p0
    && stav(B.soubor).pole.stav === 'chyba', [nl.zastaveno, rl, stav(B.soubor)]);
  D().dealy.find((d) => d.id === B.deal.id).status = 'open';
}
test('PIPEDRIVE_FAZE_ODESLANO: číslo = id, text = název, prázdné = „Nabídka odeslána“',
  PO.pdOdeslaniFazeKonfigurace({ PIPEDRIVE_FAZE_ODESLANO: '23' }).id === 23 && PO.pdOdeslaniFazeKonfigurace({ PIPEDRIVE_FAZE_ODESLANO: 'Jiná' }).nazev === 'Jiná'
  && PO.pdOdeslaniFazeKonfigurace({}).nazev === 'Nabídka odeslána');

/* ---------- 4. ZÁMEK A SOUBĚH ---------- */
puvodniLog('\n===== 4. ZÁMEK A SOUBĚH =====\n');
r = await odesl({ ...zaklad(A), zamekKdy: '2020-01-01T00:00:00.000Z', akce: 'nahled' }, cP);
test('zámek v prohlížeči ≠ uložený → 409 „zamekNeulozen“', r.status === 409 && r.kod === 'zamekNeulozen', r);
const S = await odeslanaZakazka({ typ: 'sod' });
r = await odesl({ ...zaklad(S), akce: 'nahled' }, cP);
test('varianta poprvé zamčená smlouvou (ne CN) → 409 „neniNabidka“', r.status === 409 && r.kod === 'neniNabidka', r);
{ const B = await odeslanaZakazka();
  const nb = await odesl({ ...zaklad(B), akce: 'nahled' }, cP);
  D().dealy.find((d) => d.id === B.deal.id).update_time = '2026-11-24T23:59:00Z';
  const p0 = patche().length;
  const rb = await odesl({ ...zaklad(B), akce: 'zapis', otisk: nb.otisk }, cP);
  test('deal se po náhledu změnil (update_time) → 409 „zmeneno“, nic se nezapsalo', rb.status === 409 && rb.kod === 'zmeneno' && patche().length === p0, rb);
}

/* ---------- 5. SOUBOR NABÍDKY ---------- */
puvodniLog('\n===== 5. SOUBOR =====\n');
r = await odesl({ ...zaklad(A), akce: 'soubor', obsah: docx(), nazev: '../podvrh.exe' }, cP);
const sA = souboryDealu(A.deal.id);
test('soubor → 200, u dealu jeden soubor .docx, název ze serveru (ne od klienta)', r.status === 200 && r.stav === 'zapsano' && sA.length === 1
  && /^CN_[A-Za-z0-9._-]+_2026-11-24\.docx$/.test(sA[0].name) && sA[0].file_type.includes('wordprocessingml'), [r, sA]);
test('zak.pdOdeslani.soubor = zapsano s názvem a velikostí; protokol', stav(A.soubor).soubor.stav === 'zapsano' && stav(A.soubor).soubor.nazev === sA[0].name
  && stav(A.soubor).soubor.velikost === sA[0].file_size && (zakazka(A.soubor).protokol || []).some((p) => /Soubor nabídky .* přiložen k dealu/.test(p.co)), stav(A.soubor));
r = await odesl({ ...zaklad(A), akce: 'soubor', obsah: docx() }, cP);
test('opakované přiložení: „už přiloženo“, žádný další soubor', r.status === 200 && r.uz === true && souboryDealu(A.deal.id).length === 1, r);
r = await odesl({ ...zaklad(A), akce: 'soubor', obsah: Buffer.from('%PDF-1.4 ahoj světe, tohle není docx').toString('base64') }, cP);
test('soubor, který není docx → 400', r.status === 400 && /Wordu/.test(r.chyba), r);
r = await odesl({ ...zaklad(A), akce: 'soubor', obsah: 'není base64!' }, cP);
test('neplatné base64 → 400', r.status === 400, r);
r = await odesl({ ...zaklad(A), akce: 'soubor', obsah: docx(PO.PD_ODESLANI_SOUBOR_MAX + 10) }, cP);
test('soubor nad limit → 413', r.status === 413, r);
{ const B = await odeslanaZakazka();
  SIM.pdSimNastav({ scenar: 'zapisVisi' });
  const rb = await odesl({ ...zaklad(B), akce: 'soubor', obsah: docx() }, cP);
  SIM.pdSimNastav({ scenar: '' });
  test('odpověď na nahrání nedorazila → 504, stav chyba (soubor u dealu ale je)', rb.status === 504 && stav(B.soubor).soubor.stav === 'chyba'
    && souboryDealu(B.deal.id).length === 1, [rb, stav(B.soubor)]);
  const rc = await odesl({ ...zaklad(B), akce: 'soubor', obsah: docx() }, cP);
  test('další pokus soubor u dealu najde → zapsano, pořád jediný soubor', rc.status === 200 && rc.uz === true && souboryDealu(B.deal.id).length === 1
    && stav(B.soubor).soubor.stav === 'zapsano', [rc, souboryDealu(B.deal.id).length]);
  const C = await odeslanaZakazka();
  const nc = await odesl({ ...zaklad(C), akce: 'nahled' }, cP);
  await odesl({ ...zaklad(C), akce: 'zapis', otisk: nc.otisk }, cP);
  SIM.pdSimNastav({ poPozadavku: (x) => { if (x === 'POST /api/v1/files') SIM.pdSimNastav({ scenar: 'vypadek' }); } });
  const rd = await odesl({ ...zaklad(C), akce: 'soubor', obsah: docx() }, cP);
  SIM.pdSimNastav({ scenar: '', poPozadavku: null });
  test('pole zapsaná, soubor selhal → stav pole zapsano, soubor chyba s pevnou větou', rd.status === 502 && stav(C.soubor).pole.stav === 'zapsano'
    && stav(C.soubor).soubor.stav === 'chyba' && /neodpovídá/.test(stav(C.soubor).soubor.duvod), [rd, stav(C.soubor)]);
}

/* ---------- 6. PRÁVA, VAZBA, CIZÍ CN, VYPNUTÝ ZÁPIS, DRŽENÍ STAVU ---------- */
puvodniLog('\n===== 6. PRÁVA A OCHRANY =====\n');
r = await odesl({ ...zaklad(A), akce: 'nahled' }, cC);
test('cizí obchodník (ne autor, neodeslal) → 403', r.status === 403, r);
r = await odesl({ ...zaklad(A), akce: 'soubor', obsah: docx() }, cC);
test('…ani soubor → 403', r.status === 403, r);
r = await odesl({ ...zaklad(A), akce: 'nahled' }, cA);
test('administrátor smí', r.status === 200, r);
{ const C = await odeslanaZakazka();
  const zc = zakazka(C.soubor); delete zc.pdVazbaWebhook; zapisZakazku(C.soubor, zc);
  C.deal.custom_fields[HASH_ODKAZ] = '';
  const p0 = patche().length;
  const nc = await odesl({ ...zaklad(C), akce: 'nahled' }, cP);
  test('bez vazby z webhooku a bez odkazu v dealu → náhled 409 „neovereno“', nc.status === 409 && nc.stav === 'neovereno', nc);
  const rc = await odesl({ ...zaklad(C), akce: 'zapis', otisk: 'a'.repeat(32) }, cP);
  test('…zápis 409, žádný PATCH, stav chyba', rc.status === 409 && rc.kod === 'neovereno' && patche().length === p0 && stav(C.soubor).pole.stav === 'chyba', [rc, stav(C.soubor)]);
  const rs = await odesl({ ...zaklad(C), akce: 'soubor', obsah: docx() }, cP);
  test('…soubor 409, nic se nepřiložilo', rs.status === 409 && souboryDealu(C.deal.id).length === 0, rs);
}
{ const C = await odeslanaZakazka();
  C.deal.custom_fields[HASH_CN] = 'CN-77777';
  const nc = await odesl({ ...zaklad(C), akce: 'nahled' }, cP);
  const p0 = patche().length;
  const rc = await odesl({ ...zaklad(C), akce: 'zapis', otisk: nc.otisk }, cP);
  test('cizí číslo nabídky v dealu → zastaveno, zápis 409 bez PATCH (převzetí jen u prodeje)', /CN-77777/.test(nc.zastaveno) && nc.cizi && rc.status === 409
    && patche().length === p0, [nc.zastaveno, rc]);
}
{ const C = await odeslanaZakazka();
  const zc = zakazka(C.soubor); delete zc.pdDealId; zapisZakazku(C.soubor, zc);
  const rc = await odesl({ ...zaklad(C), akce: 'nahled' }, cP);
  test('zakázka bez dealu → 409 „bezDealu“ s jasnou hláškou', rc.status === 409 && rc.kod === 'bezDealu' && /není navázaná/.test(rc.chyba), rc);
}
pamet.set('pd_cache/strop:odeslani-zapis:deal:' + A.deal.id, JSON.stringify({ od: Date.now(), pocet: PO.PD_ODESLANI_STROP }));
r = await odesl({ ...zaklad(A), akce: 'zapis', otisk: 'a'.repeat(32) }, cP);
test('strop pokusů o zápis na deal → 429', r.status === 429, r);
pamet.delete('pd_cache/strop:odeslani-zapis:deal:' + A.deal.id);
delete process.env.PIPEDRIVE_SIMULATOR;
process.env.PIPEDRIVE_TOKEN = 'testovaci-token-nikam-nejde';
process.env.PIPEDRIVE_DOMENA = 'zkusebni';
{ const v0 = venku.length;
  r = await odesl({ ...zaklad(A), akce: 'zapis', otisk: 'a'.repeat(32) }, cP);
  test('bez PIPEDRIVE_ZAPIS=ano → zápis 503, do sítě nic, stav chyba', r.status === 503 && /vypnutý/.test(r.chyba) && venku.length === v0
    && stav(A.soubor).pole.stav === 'chyba', [r, venku.slice(v0)]);
  r = await odesl({ ...zaklad(A), akce: 'soubor', obsah: docx() }, cP);
  test('…i soubor 503, do sítě nic', r.status === 503 && venku.length === v0, r);
}
delete process.env.PIPEDRIVE_TOKEN; delete process.env.PIPEDRIVE_DOMENA;
process.env.PIPEDRIVE_SIMULATOR = '1';
{ /* Stav zápisu píše jen server: podvržený pdOdeslani z prohlížeče se při uložení zahodí. */
  const g = zakazka(A.soubor);
  const z = kopie(g);
  z.pdOdeslani = { deal: '999', varianta: 'x', zamekKdy: 'x', pole: { stav: 'zapsano', kdy: 'podvrh' } };
  const x = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: z, ocekavaneRazitko: g.uloRazitko }, cP)).json();
  test('pdOdeslani z prohlížeče se zahodí (platí uložený)', x.ok && stav(A.soubor).deal === String(A.deal.id) && stav(A.soubor).pole.kdy !== 'podvrh', [x.ok, x.chyba, stav(A.soubor)]);
  const k = zk.zakazkaDuplikuj(zakazka(A.soubor), '9999');
  test('kopie zakázky (Duplikovat) stav zápisu nepřebírá', k && !k.pdOdeslani, k && k.pdOdeslani);
}
test('docx: tvar a název souboru', !PO.pdOdeslaniDocx(docx()).chyba && PO.pdOdeslaniDocx(Buffer.from('PK\u0003\u0004xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx').toString('base64')).status === 400
  && PO.pdOdeslaniNazevSouboru('0555.2 B/x', '2026-11-24') === 'CN_0555.2_B_x_2026-11-24.docx');

test('do sítě za celý běh nic', venku.length === 0, venku);
puvodniLog('\n' + ok + ' OK, ' + fail + ' FAIL' + (fail ? '\nSelhalo:\n  ' + selhalo.join('\n  ') : ''));
process.exit(fail ? 1 : 0);
