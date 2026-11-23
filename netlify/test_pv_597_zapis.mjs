/* ============================================================
 * PV #597 — ZÁPIS PRODEJE DO DEALU V PIPEDRIVE (rozsah J. V., PIPEDRIVE_SPUSTENI B1)
 *
 * POST /api/pd/prodej (functions/pd_prodej.mjs) JEN proti simulátoru:
 *   1. náhled: tabulka pole / dnes v Pipedrive / nová hodnota, hodnota dealu
 *      ze SERVERU (podvržená cena / strana PROJ / kalendář se ignorují),
 *      fáze 26, otisk; do Pipedrive jen GET; e-maily uživatelů PD klientovi ne;
 *   2. zápis po potvrzení: jeden PATCH jen změněných polí, stage_id, value,
 *      nikdy status; záznam v.prodano.pipedrive = zapsano + protokol;
 *      opakovaně bez změn → bez PATCH;
 *   3. souběh (update_time) a jiný otisk → 409, nic se nezapíše;
 *   4. vlastník dealu podle CN (#115 B): cizí CN zastaví, převzetí s poznámkou;
 *      CN s příponou varianty a prázdné CN = náš deal;
 *   5. zastavení (ztracený deal), výpadek a visící Pipedrive → stav chyba
 *      s důvodem, prodej platí, „Zkusit znovu“ zapíše;
 *   6. vazba neověřená, cizí obchodník, neprodaná zakázka, strop, vypnutý zápis;
 *   7. hodnota dealu po SoD = cena díla; kombinovaná = součet; text nad 255.
 * Spuštění: node netlify/test_pv_597_zapis.mjs
 * ============================================================ */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
for (const k of ['PIPEDRIVE_SIMULATOR_SCENAR', 'PIPEDRIVE_TOKEN', 'PIPEDRIVE_DOMENA', 'PROSTREDI', 'PIPEDRIVE_WEBHOOK_KLIC', 'PIPEDRIVE_ZAPIS',
  'PIPEDRIVE_FAZE_PRODANO', 'NETLIFY', 'SITE_ID', 'SITE_NAME', 'DEPLOY_ID', 'CONTEXT', 'BRANCH', 'HEAD', 'URL', 'DEPLOY_URL', 'DEPLOY_PRIME_URL']) delete process.env[k];
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
const { default: prodejFn } = await import('./functions/pd_prodej.mjs');
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
async function prodej(telo, cookie) {
  const r = await post(prodejFn, 'http://x/api/pd/prodej', telo, cookie);
  const t = await r.text(); texty.push(t);
  return { status: r.status, ...JSON.parse(t) };
}
const D = () => SIM.pdSimStav().data;
const pozadavky = () => SIM.pdSimStav().pozadavky;
/* PATCH dealu od zápisu prodeje (webhook zapisuje odkaz — ten se nepočítá). */
const jePatchProdeje = (t) => t.pozadavek.startsWith('PATCH /api/v2/deals/') && !/"custom_fields":\{"[0-9a-f]+":"https:\/\/testweb/.test(t.telo);
const tela = () => SIM.pdSimStav().tela.filter(jePatchProdeje);
const patche = () => tela().map((t) => t.pozadavek);
const HASH_CN = pdHashZNazvu('Číslo nabídky (CN)'), HASH_ODKAZ = pdHashZNazvu('Odkaz na kalkulaci');

SIM.pdSimReset();
const U = D().uzivatele;
const PETRA = U[1].email;
const cA = await login(ADMIN_EMAIL, 'Docasne.Heslo.123');
await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
  slevy: { minMarze: 0, maxGlobalni: 0.3, stropy: {} }, poznamka: 'pv597' }, cA);
for (const [email, jmeno] of [[PETRA, 'Petra Ukázková'], ['obch.cizi597@priklad.cz', 'Cizí Obchodník']]) {
  const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email, jmeno, role: 'Obchodník', heslo: 'Heslo12345x' }, cA)).json();
  if (!x.ok) throw new Error('účet ' + JSON.stringify(x));
}
const cP = await login(PETRA, 'Heslo12345x');
const cC = await login('obch.cizi597@priklad.cz', 'Heslo12345x');
const platny = () => JSON.parse(pamet.get('program/db')).platny;
const DNES = OBJ.objDnes();
const zamkni = (z, v) => zam.zamkniVariantu(v, { typ: 'nabidkaTisk', kdy: new Date().toISOString(), kdo: 'Test PV',
  cislo: zam.variantaCislo(z, v), vysledek: zam.zamekVysledekSpocti(v, JEKLY, 'v-pv597'), snimek: zam.zamekSnimekSpocti(v) });

/* Deal Petry → webhook založí kalkulaci (autor Petra, #734) → doplní, vytiskne (zámek), prodá. */
const pouzite = [];
async function prodanaZakazka(prodat = true) {
  const deal = D().dealy.find((d) => d.status === 'open' && d.org_id && d.person_id && d.pipeline_id === 1 && d.stage_id !== 26
    && d.owner_id === U[1].id && /^CN-\d+ /.test(d.title) && !pouzite.includes(d.id));
  pouzite.push(deal.id);
  const w = await (await webhook(new Request('https://testweb.example/api/pd/webhook', { method: 'POST',
    headers: { 'content-type': 'application/json', 'x-kalkulator-klic': KLIC }, body: JSON.stringify({ dealId: deal.id }) }))).json();
  if (!w.ok) throw new Error('webhook ' + JSON.stringify(w));
  const soubor = w.soubor;
  let g = zakazka(soubor);
  G.cenikDnesniProVariantu = () => ({ cenik: kopie(platny().cenik), proj: { cenik: kopie(platny().cenikProj) } });
  const z = zk.importZakazka(kopie(g));
  delete G.cenikDnesniProVariantu;
  delete z.pdCerstva;
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.kryci = { hodnoty: { jmenoPrijmeni: 'Zkušební Kontakt' } };
  zamkni(z, v);
  let r = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: z, ocekavaneRazitko: g.uloRazitko }, cP)).json();
  if (!r.ok) throw new Error('uložení ' + JSON.stringify(r));
  if (prodat) {
    g = zakazka(soubor);
    const a = zk.importZakazka(kopie(g));
    if (OBJ.prodNastav(a, a.varianty[0], DNES, { kdo: PETRA })) throw new Error('prodNastav');
    r = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: a, ocekavaneRazitko: g.uloRazitko }, cP)).json();
    if (!r.ok) throw new Error('prodej ' + JSON.stringify(r));
  }
  return { soubor, deal: D().dealy.find((d) => d.id === deal.id) };
}
/* Podklad z prohlížeče (texty krycího listu prodané varianty) — jako prodUiPodklad. */
function podklad(soubor) {
  const z = zk.importZakazka(kopie(zakazka(soubor)));
  const p = OBJ.prodStav(z);
  const k = kopie(z);
  (k.varianty || []).forEach((x) => { x.ridici = x.id === p.v.id; });
  k.aktivni = p.v.id;
  const pod = G.pdnPodklad(k, JEKLY, { faze: 'prodano' });
  return { strany: pod.strany, zdroje: pod.zdroje };
}
const cenaProdane = (soubor) => { const z = zk.importZakazka(kopie(zakazka(soubor))); const v = OBJ.prodStav(z).v;
  return Math.round(G.cenaNabidkyOck(G.vypocetZ(v, JEKLY), v.data.sleva, v.data.zaokr).cena * 100) / 100; };
const radek = (d, k) => (d.radky || []).find((x) => x.klic === k) || {};
const pdStav = (soubor) => { const z = zakazka(soubor); const p = OBJ.prodStav(z); return p && p.prodano.pipedrive; };

/* ---------- 1. NÁHLED ---------- */
puvodniLog('\n===== 1. NÁHLED =====\n');
const A = await prodanaZakazka();
const cena = cenaProdane(A.soubor);
test('(příprava: prodaná zakázka z dealu Petry, cena > 0, deal otevřený mimo fázi 26)', cena > 0 && A.deal.status === 'open'
  && A.deal.stage_id !== 26 && pdStav(A.soubor).stav === 'ceka', [cena, A.deal.stage_id, pdStav(A.soubor)]);
const pod = podklad(A.soubor);
const podvrh = kopie(pod);
podvrh.strany.ock.cena = 1; podvrh.strany.ock.atyp = true;
podvrh.strany.proj = { hodnoty: { cisloCN: 'X' }, cena: 999999, kalendar: 'podvrh' };
let pred = pozadavky().length;
let n = await prodej({ soubor: A.soubor, akce: 'nahled', ...podvrh }, cP);
test('náhled → 200, otisk, zápis povolen (simulátor), něco k zápisu', n.status === 200 && /^[0-9a-f]{32}$/.test(n.otisk)
  && n.zapisPovolen === true && n.nicKZapisu === false && !n.zastaveno, [n.status, n.chyba, n.zastaveno]);
test('hodnota dealu = cena prodané varianty ze SERVERU (podvržená cena i PROJ ignorovány)', radek(n, 'hodnotaDealu').hodnota
  && Math.abs(radek(n, 'hodnotaDealu').hodnota.value - cena) < 0.01 && radek(n, 'hodnotaDealu').strana === 'ock'
  && radek(n, 'hodnotaDealu').posle === true, radek(n, 'hodnotaDealu'));
test('fáze → Vyhrané k podpisu SoD (26), dnes v Pipedrive je jiná fáze', radek(n, 'fazeDealu').hodnota === 26
  && radek(n, 'fazeDealu').posle === true && /\(\d+\)|fáze/.test(radek(n, 'fazeDealu').vCrm), radek(n, 'fazeDealu'));
test('ATYP ze serveru (podvržené „Ano“ se nebere)', radek(n, 'atyp').hodnotaKalkulace !== 'Ano', radek(n, 'atyp'));
test('platební kalendář PROJ z podvrhu se nezapisuje (zakázka je jen OCK)', !(n.radky || []).some((r) => r.klic === 'platebniKalendar' && r.stav === 'zapise'));
test('řádky nesou „dnes v Pipedrive“ (vCrm) a příznak posle / bezeZmeny', (n.radky || []).every((r) => 'vCrm' in r && typeof r.posle === 'boolean'));
test('náhled do Pipedrive jen čte (žádný PATCH ani POST)', pozadavky().slice(pred).every((x) => /^GET /.test(x)), pozadavky().slice(pred));
test('e-maily uživatelů Pipedrive se klientovi nevracejí', ![U[0], U[2], U[3]].some((u) => texty[texty.length - 1].includes(u.email)));
test('poznámky šachet / zákazníků nejsou v tabulce zápisu dealu', !(n.radky || []).some((r) => /^poznamka/.test(r.klic)));

/* ---------- 2. ZÁPIS ---------- */
puvodniLog('\n===== 2. ZÁPIS PO POTVRZENÍ =====\n');
let r = await prodej({ soubor: A.soubor, akce: 'zapis', ...pod, otisk: 'f'.repeat(32) }, cP);
test('jiný otisk než z náhledu → 409 „zmeneno“, žádný PATCH', r.status === 409 && r.kod === 'zmeneno' && patche().length === 0, r);
r = await prodej({ soubor: A.soubor, akce: 'zapis', ...pod }, cP);
test('zápis bez otisku → 400', r.status === 400, r);
const dealPred = kopie(D().dealy.find((d) => d.id === A.deal.id));
r = await prodej({ soubor: A.soubor, akce: 'zapis', ...podvrh, otisk: n.otisk }, cP);
test('zápis → 200 zapsano, seznam zapsaných polí', r.status === 200 && r.stav === 'zapsano' && r.zapsano.includes('Hodnota dealu')
  && r.zapsano.includes('Fáze dealu'), r);
test('jediný PATCH na deal zakázky', patche().length === 1 && patche()[0] === 'PATCH /api/v2/deals/' + A.deal.id, patche());
const telo = JSON.parse((tela()[0] || {}).telo || '{}');
test('tělo PATCH: stage_id 26, value = cena, CZK, NIKDY status', telo.stage_id === 26 && Math.abs(telo.value - cena) < 0.01
  && telo.currency === 'CZK' && !('status' in telo), telo);
test('tělo PATCH: jen změněná vlastní pole', Object.entries(telo.custom_fields || {}).every(([k, v]) => PP.pdProdejKlic(v) !== PP.pdProdejKlic(dealPred.custom_fields[k])),
  [telo.custom_fields, dealPred.custom_fields]);
const dealPo = D().dealy.find((d) => d.id === A.deal.id);
test('deal v simulátoru: fáze 26, hodnota = cena, stav zůstal otevřený', dealPo.stage_id === 26 && Math.abs(dealPo.value - cena) < 0.01
  && dealPo.status === 'open', [dealPo.stage_id, dealPo.value, dealPo.status]);
test('Číslo nabídky (CN) zapsáno do dealu', String(dealPo.custom_fields[HASH_CN] || '').startsWith(zakazka(A.soubor).cislo.split(' ')[0]), dealPo.custom_fields[HASH_CN]);
test('záznam prodeje: pipedrive = { stav: zapsano, kdy }, razítko vráceno', pdStav(A.soubor).stav === 'zapsano' && /^\d{4}-/.test(pdStav(A.soubor).kdy)
  && r.razitko === zakazka(A.soubor).uloRazitko && !pdStav(A.soubor).duvod, pdStav(A.soubor));
test('protokol zakázky: „Zápis prodeje do dealu … zapsáno“ (jen názvy polí)', (zakazka(A.soubor).protokol || []).some((p) => /Zápis prodeje do dealu \d+ .*zapsáno — /.test(p.co)),
  (zakazka(A.soubor).protokol || []).slice(-2));
test('prodej zůstal (zámek, datum), stav Pipedrive klient při uložení nepřepíše', (() => {
  return OBJ.prodStav(zakazka(A.soubor)).prodano.datum === DNES; })());
{
  const g = zakazka(A.soubor);
  const a = zk.importZakazka(kopie(g));
  a.varianty[0].prodano.pipedrive = { stav: 'ceka', kdy: 'x' };
  const u = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: a, ocekavaneRazitko: g.uloRazitko }, cP)).json();
  test('…uložení z prohlížeče s podvrženým stavem „ceka“ → zůstane „zapsano“ (píše jen server)', u.ok && pdStav(A.soubor).stav === 'zapsano', [u.chyba, pdStav(A.soubor)]);
}
n = await prodej({ soubor: A.soubor, akce: 'nahled', ...pod }, cP);
test('druhý náhled: nic k zápisu, všechny řádky „beze změny“', n.status === 200 && n.nicKZapisu === true
  && (n.radky || []).filter((x) => x.stav === 'zapise').every((x) => x.bezeZmeny), [n.nicKZapisu, (n.radky || []).filter((x) => x.posle).map((x) => x.klic)]);
r = await prodej({ soubor: A.soubor, akce: 'zapis', ...pod, otisk: n.otisk }, cP);
test('…potvrzení bez změn: 200 zapsano, žádný další PATCH', r.status === 200 && r.stav === 'zapsano' && patche().length === 1 && r.zapsano.length === 0, [r, patche()]);

/* ---------- 3. SOUBĚH ---------- */
puvodniLog('\n===== 3. SOUBĚH (update_time) =====\n');
{
  const dd = D().dealy.find((d) => d.id === A.deal.id);
  dd.value = 123; n = await prodej({ soubor: A.soubor, akce: 'nahled', ...pod }, cP);
  dd.update_time = '2030-01-01T00:00:00Z';   // někdo deal mezitím upravil v Pipedrive
  r = await prodej({ soubor: A.soubor, akce: 'zapis', ...pod, otisk: n.otisk }, cP);
  test('deal se po náhledu změnil (update_time) → 409 „zmeneno“, nic se nezapsalo', r.status === 409 && r.kod === 'zmeneno'
    && patche().length === 1 && dd.value === 123, [r, patche().length]);
  test('…stav zápisu se tím nemění (žádná chyba, jen nový náhled)', pdStav(A.soubor).stav === 'zapsano');
  n = await prodej({ soubor: A.soubor, akce: 'nahled', ...pod }, cP);
  r = await prodej({ soubor: A.soubor, akce: 'zapis', ...pod, otisk: n.otisk }, cP);
  test('nový náhled + potvrzení → zapíše jen hodnotu dealu', r.status === 200 && patche().length === 2
    && JSON.stringify(Object.keys(JSON.parse(tela()[tela().length - 1].telo)).sort()) === '["currency","value"]', [r, tela().pop()]);
}

/* ---------- 4. VLASTNÍK DEALU PODLE CN ---------- */
puvodniLog('\n===== 4. ČÍSLO NABÍDKY V DEALU (#115 B) =====\n');
{
  const dd = D().dealy.find((d) => d.id === A.deal.id);
  const nase = zakazka(A.soubor).cislo;
  dd.custom_fields[HASH_CN] = nase + '.2';
  dd.value = 5;
  n = await prodej({ soubor: A.soubor, akce: 'nahled', ...pod }, cP);
  test('CN v dealu s příponou varianty („.2“) = náš deal', n.status === 200 && n.cizi === null, n.cizi);
  test('pdProdejCnSedi: prázdné, shodné (mezery nerozhodují), cizí, zakázka bez čísla', PP.pdProdejCnSedi(nase, '', {}) && PP.pdProdejCnSedi(nase, ' ' + nase.replace(/ /g, '') + ' ', {})
    && !PP.pdProdejCnSedi(nase, 'CN-99999', {}) && !PP.pdProdejCnSedi('', 'CN-1', {}));
  dd.custom_fields[HASH_CN] = 'CN-99999';
  n = await prodej({ soubor: A.soubor, akce: 'nahled', ...pod }, cP);
  test('cizí CN v dealu → náhled hlásí „cizi“ s číslem', n.status === 200 && n.cizi && n.cizi.cislo === 'CN-99999', n.cizi);
  const p0 = patche().length;
  r = await prodej({ soubor: A.soubor, akce: 'zapis', ...pod, otisk: n.otisk }, cP);
  test('cizí CN bez převzetí → 409 „ciziCislo“, nic se nezapsalo', r.status === 409 && r.kod === 'ciziCislo' && r.cislo === 'CN-99999'
    && patche().length === p0 && dd.custom_fields[HASH_CN] === 'CN-99999', r);
  const pozn0 = (D().poznamky || []).length;
  r = await prodej({ soubor: A.soubor, akce: 'zapis', ...pod, otisk: n.otisk, prevzit: true }, cP);
  test('převzetí (prevzit) → 200, CN v dealu je naše', r.status === 200 && r.prevzato === true && patche().length === p0 + 1
    && String(dd.custom_fields[HASH_CN]).startsWith(nase.split(' ')[0]), [r, dd.custom_fields[HASH_CN]]);
  const pozn = (D().poznamky || []).slice(pozn0);
  test('převzetí: poznámka k dealu (kdo, kdy, z jaké nabídky, dříve), bez e-mailu', pozn.length === 1 && pozn[0].deal_id === dd.id
    && /Deal převzat nabídkou .* \(dříve CN-99999\) — Petra Ukázková/.test(pozn[0].content) && !pozn[0].content.includes('@'), pozn);
  test('převzetí: protokol zakázky „PŘEVZAT od nabídky CN-99999“', (zakazka(A.soubor).protokol || []).some((p) => /PŘEVZAT od nabídky CN-99999/.test(p.co)));
}

/* ---------- 5. ZASTAVENÍ A SELHÁNÍ ---------- */
puvodniLog('\n===== 5. ZASTAVENÍ, VÝPADEK, ZKUSIT ZNOVU =====\n');
const B = await prodanaZakazka();
const podB = podklad(B.soubor);
{
  B.deal.status = 'lost';
  n = await prodej({ soubor: B.soubor, akce: 'nahled', ...podB }, cP);
  test('ztracený deal → náhled „zastaveno“ (Prodáno přesouvá jen otevřený)', n.status === 200 && /ztracený/.test(n.zastaveno), n.zastaveno);
  const p0 = patche().length;
  r = await prodej({ soubor: B.soubor, akce: 'zapis', ...podB, otisk: n.otisk }, cP);
  test('…zápis → 409 „zastaveno“, žádný PATCH, stav chyba s důvodem', r.status === 409 && r.kod === 'zastaveno' && patche().length === p0
    && pdStav(B.soubor).stav === 'chyba' && /ztracený/.test(pdStav(B.soubor).duvod), [r, pdStav(B.soubor)]);
  B.deal.status = 'open';
  test('…prodej přitom platí (selhání zápisu prodej nezastaví)', !!OBJ.prodStav(zakazka(B.soubor)));
  n = await prodej({ soubor: B.soubor, akce: 'nahled', ...podB }, cP);
  SIM.pdSimNastav({ poPozadavku: (x) => { if (x.startsWith('PATCH ')) SIM.pdSimNastav({ scenar: 'vypadek' }); } });
  r = await prodej({ soubor: B.soubor, akce: 'zapis', ...podB, otisk: n.otisk }, cP);
  SIM.pdSimNastav({ scenar: '', poPozadavku: null });
  test('výpadek Pipedrive při PATCH → 502, stav chyba s důvodem, protokol', r.status === 502 && r.stav === 'chyba'
    && pdStav(B.soubor).stav === 'chyba' && /neodpovídá/.test(pdStav(B.soubor).duvod)
    && (zakazka(B.soubor).protokol || []).some((p) => /Zápis prodeje do dealu \d+ se nepovedl/.test(p.co)), [r, pdStav(B.soubor)]);
  {
    const g = zakazka(B.soubor);
    const a = zk.importZakazka(kopie(g));
    const u = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: a, ocekavaneRazitko: g.uloRazitko }, cP)).json();
    test('…uložení z prohlížeče stav „chyba“ i s důvodem zachová (prodOciste)', u.ok && pdStav(B.soubor).stav === 'chyba'
      && /neodpovídá/.test(pdStav(B.soubor).duvod || ''), [u.chyba, pdStav(B.soubor)]);
  }
  n = await prodej({ soubor: B.soubor, akce: 'nahled', ...podB }, cP);
  SIM.pdSimNastav({ poPozadavku: (x) => { if (x.startsWith('PATCH ')) SIM.pdSimNastav({ scenar: 'visi' }); } });
  const t0 = Date.now();
  r = await prodej({ soubor: B.soubor, akce: 'zapis', ...podB, otisk: n.otisk }, cP);
  const trvalo = Date.now() - t0;
  SIM.pdSimNastav({ scenar: '', poPozadavku: null });
  test('visící Pipedrive → 504 do časového limitu volání, stav chyba', r.status === 504 && trvalo < PP.PD_PRODEJ_VOLANI_MS + 1500
    && pdStav(B.soubor).stav === 'chyba', [r.status, trvalo, pdStav(B.soubor)]);
  n = await prodej({ soubor: B.soubor, akce: 'nahled', ...podB }, cP);
  r = await prodej({ soubor: B.soubor, akce: 'zapis', ...podB, otisk: n.otisk }, cP);
  test('„Zkusit zápis znovu“ (náhled + potvrzení) → zapsano, důvod pryč', r.status === 200 && pdStav(B.soubor).stav === 'zapsano'
    && !pdStav(B.soubor).duvod && B.deal.stage_id === 26, [r, pdStav(B.soubor)]);
}

/* ---------- 6. PRÁVA, VAZBA, STROP, VYPNUTÝ ZÁPIS ---------- */
puvodniLog('\n===== 6. PRÁVA, VAZBA, STROP, VYPNUTÝ ZÁPIS =====\n');
{
  r = await prodej({ soubor: A.soubor, akce: 'nahled', ...pod }, cC);
  test('cizí obchodník (není autor ani neprodal) → 403', r.status === 403, r);
  r = await prodej({ soubor: A.soubor, akce: 'nahled', ...pod }, cA);
  test('administrátor → 200', r.status === 200, r.chyba);
  const N = await prodanaZakazka(false);
  r = await prodej({ soubor: N.soubor, akce: 'nahled' }, cP);
  test('neprodaná zakázka → 409', r.status === 409 && /není prodaná/.test(r.chyba), r);
  r = await prodej({ soubor: A.soubor, akce: 'nahled', stav: 'won' }, cP);
  test('parametr stav (won) → 400 (#545)', r.status === 400, r);
  r = await prodej({ soubor: '../x', akce: 'nahled' }, cP);
  test('neplatný soubor → 400', r.status === 400);

  /* Vazba neověřená: zakázka bez vazby z webhooku a bez odkazu v dealu. */
  const C = await prodanaZakazka();
  const podC = podklad(C.soubor);
  const zc = zakazka(C.soubor); delete zc.pdVazbaWebhook; zapisZakazku(C.soubor, zc);
  C.deal.custom_fields[HASH_ODKAZ] = '';
  const p0 = patche().length;
  r = await prodej({ soubor: C.soubor, akce: 'nahled', ...podC }, cP);
  test('bez vazby z webhooku a bez odkazu v dealu → náhled 409 „neovereno“', r.status === 409 && r.stav === 'neovereno', r);
  r = await prodej({ soubor: C.soubor, akce: 'zapis', ...podC, otisk: 'a'.repeat(32) }, cP);
  test('…zápis 409, žádný PATCH, stav chyba s důvodem', r.status === 409 && r.kod === 'neovereno' && patche().length === p0
    && pdStav(C.soubor).stav === 'chyba' && /nepatří/.test(pdStav(C.soubor).duvod), [r, pdStav(C.soubor)]);

  pamet.set('pd_cache/strop:prodej-zapis:deal:' + B.deal.id, JSON.stringify({ od: Date.now(), pocet: PP.PD_PRODEJ_STROP }));
  r = await prodej({ soubor: B.soubor, akce: 'zapis', ...podB, otisk: 'a'.repeat(32) }, cP);
  test('strop pokusů o zápis na deal → 429', r.status === 429, r);
  pamet.delete('pd_cache/strop:prodej-zapis:deal:' + B.deal.id);

  /* Skutečný Pipedrive (token) bez PIPEDRIVE_ZAPIS → 503 dřív, než se sáhne na síť. */
  delete process.env.PIPEDRIVE_SIMULATOR;
  process.env.PIPEDRIVE_TOKEN = 'testovaci-token-nikam-nejde';
  process.env.PIPEDRIVE_DOMENA = 'zkusebni';
  const v0 = venku.length;
  r = await prodej({ soubor: B.soubor, akce: 'zapis', ...podB, otisk: 'a'.repeat(32) }, cP);
  test('bez PIPEDRIVE_ZAPIS=ano → 503 „Zápis do Pipedrive je vypnutý“, do sítě nic, stav chyba', r.status === 503
    && /vypnutý/.test(r.chyba) && venku.length === v0 && pdStav(B.soubor).stav === 'chyba', [r, venku.slice(v0)]);
  delete process.env.PIPEDRIVE_TOKEN; delete process.env.PIPEDRIVE_DOMENA;
  process.env.PIPEDRIVE_SIMULATOR = '1';
}

/* ---------- 7. HODNOTA DEALU: SoD, KOMBINOVANÁ, TEXT NAD 255 ---------- */
puvodniLog('\n===== 7. HODNOTA DEALU A PŘEVODY =====\n');
{
  const zs = zakazka(B.soubor);
  const v = OBJ.prodStav(zs).v;
  v.zamek.tisky = (v.zamek.tisky || []).concat([{ typ: 'sod', kdy: new Date().toISOString(), sod: { klice: ['x'], bezDphKc: 777777, mena: 'CZK' } }]);
  zapisZakazku(B.soubor, zs);
  n = await prodej({ soubor: B.soubor, akce: 'nahled', ...podB }, cP);
  test('po tisku SoD: hodnota dealu = cena díla s objednanými příplatky (SEC-I17)', n.status === 200 && n.hodnotaZdroj === 'sod'
    && radek(n, 'hodnotaDealu').hodnota && radek(n, 'hodnotaDealu').hodnota.value === 777777, [n.hodnotaZdroj, radek(n, 'hodnotaDealu')]);

  const stubG = { prodStav: () => ({ v: { id: 'v1' } }), ctrlCenaDilaSod: () => null,
    pdnPodklad: () => ({ ok: true, strany: { ock: { cena: 100.004, atyp: false, rucne: {} }, proj: { cena: 50, kalendar: 'K', rucne: {} } } }) };
  stubG.pdnPodklad = () => ({ ok: true, strany: { ock: { cena: 100.004, atyp: false, rucne: {}, hodnoty: { a: '1' } }, proj: { cena: 50, kalendar: 'K', rucne: {} } } });
  const ps = PP.pdProdejStrany({ varianty: [] }, stubG);
  const hz = pdZapisDealu(POLE_DEALU, ps.strany, { mapa: {}, popisy: {} }, {});
  test('kombinovaná OCK + PROJ: hodnota dealu = součet cen ze serveru (podvrh klienta ignorován)', hz.deal.value === 150
    && ps.strany.proj.kalendar === 'K' && ps.strany.ock.hodnoty.a === '1', [hz.deal, ps.strany]);
  test('pdProdejStrany bez prodeje → chyba', !!PP.pdProdejStrany({}, { prodStav: () => null }).chyba);
  test('pdProdejZmeny: status se neposílá nikdy, nezměněné vynechá', (() => {
    const z = PP.pdProdejZmeny({ status: 'won', custom_fields: { a: 1, b: [2, 1] }, value: 5, currency: 'CZK', stage_id: 26 },
      { custom_fields: { a: '1', b: [1, 2] }, value: 5, currency: 'CZK', stage_id: 26 });
    return z.patch === null && !z.hodnota && !z.faze; })());

  /* Revize PV V1: texty jdou z ULOŽENÉ zakázky — ruční přepisy krycího listu se nastaví v uložené variantě. */
  const zk7 = zakazka(B.soubor);
  const v7 = OBJ.prodStav(zk7).v;
  v7.data.kryci = v7.data.kryci || { hodnoty: {} }; v7.data.kryci.hodnoty = v7.data.kryci.hodnoty || {};
  v7.data.kryci.hodnoty.priplatkyNabidka = 'x'.repeat(300);
  v7.data.kryci.hodnoty.sodDphRezim = 'přenesená daňová povinnost (tuzemsko)';
  zapisZakazku(B.soubor, zk7);
  n = await prodej({ soubor: B.soubor, akce: 'nahled', ...podB }, cP);
  const rp = radek(n, 'priplatkyNabidka');
  test('text nad 255 znaků (Příplatky v nabídce): nezkracuje se a nepošle, důvod', rp.stav === 'nelze' && /255/.test(rp.duvod) && rp.posle === false, rp);
  test('Sazba DPH: přenesená → „0 % – přenesená daňová povinnost“', /^0 %/.test(radek(n, 'sazbaDph').hodnotaText || ''), radek(n, 'sazbaDph'));
}

/* ---------- 8. REVIZE PV: V1, S1, S2, S4 ---------- */
puvodniLog('\n===== 8. REVIZE PV (V1 podvržené texty, S1 převzetí bez odpovědi, S2 souběh, S4 text chyby) =====\n');
{
  /* V1: podvržené texty krycího listu (CN, splatnost, záruka, pokuty, příplatky) se ignorují. */
  const V = await prodanaZakazka();
  const podV = podklad(V.soubor);
  const nase = zakazka(V.soubor).cislo;
  const pv = kopie(podV);
  Object.assign(pv.strany.ock.hodnoty, { cisloCN: 'CN-PODVRH-1', splatnostDni: '99', zarukaMesicu: '1', pokutaSplatnost: '9 % / den',
    pokutaLimit: 'NEUPLATNĚN limit 10 %', priplatkyNabidka: 'podvrh' });
  n = await prodej({ soubor: V.soubor, akce: 'nahled', ...pv }, cP);
  test('V1: náhled s podvrženými texty → CN a splatnost z uložené zakázky', n.status === 200
    && radek(n, 'cisloNabidky').hodnotaText !== 'CN-PODVRH-1' && String(radek(n, 'cisloNabidky').hodnotaText).startsWith(nase.split(' ')[0])
    && radek(n, 'splatnostDni').hodnotaText !== '99', [radek(n, 'cisloNabidky'), radek(n, 'splatnostDni')]);
  const n0 = await prodej({ soubor: V.soubor, akce: 'nahled', ...podV }, cP);
  test('V1: náhled s podvrhem = náhled poctivý (týž otisk)', n.otisk === n0.otisk, [n.otisk, n0.otisk]);
  r = await prodej({ soubor: V.soubor, akce: 'zapis', ...pv, otisk: n.otisk }, cP);
  const t = JSON.parse(tela()[tela().length - 1].telo);
  test('V1: zápis s podvrženým tělem → do dealu serverové hodnoty (CN naše, žádný podvrh)', r.status === 200
    && String(t.custom_fields[HASH_CN] || '').startsWith(nase.split(' ')[0]) && !JSON.stringify(t).includes('PODVRH') && !JSON.stringify(t).includes('podvrh')
    && !Object.values(t.custom_fields || {}).includes(99), t);
  n = await prodej({ soubor: V.soubor, akce: 'nahled' }, cP);
  test('V1: náhled bez těla stran funguje (strany se z požadavku nečtou)', n.status === 200 && n.cizi === null && n.nicKZapisu === true, [n.status, n.cizi, n.nicKZapisu]);

  /* S1: převzetí — PATCH v Pipedrive proběhne, odpověď nedorazí. */
  const P = await prodanaZakazka();
  const podP = podklad(P.soubor);
  P.deal.custom_fields[HASH_CN] = 'CN-88888';
  n = await prodej({ soubor: P.soubor, akce: 'nahled', ...podP }, cP);
  test('(S1 příprava: cizí CN)', n.cizi && n.cizi.cislo === 'CN-88888', n.cizi);
  const pozn0 = (D().poznamky || []).length;
  SIM.pdSimNastav({ scenar: 'zapisVisi' });
  r = await prodej({ soubor: P.soubor, akce: 'zapis', ...podP, otisk: n.otisk, prevzit: true }, cP);
  SIM.pdSimNastav({ scenar: '' });
  test('S1: PATCH proveden bez odpovědi → 504, v dealu už naše CN, poznámka zatím žádná', r.status === 504
    && String(P.deal.custom_fields[HASH_CN]).startsWith(zakazka(P.soubor).cislo.split(' ')[0]) && (D().poznamky || []).length === pozn0, [r.status, P.deal.custom_fields[HASH_CN]]);
  test('S1: úmysl převzetí je v protokolu a v záznamu prodeje ještě PŘED PATCH', (zakazka(P.soubor).protokol || []).some((x) => /Převzetí dealu \d+ od nabídky CN-88888 — zahájeno/.test(x.co))
    && pdStav(P.soubor).prevzeti && pdStav(P.soubor).prevzeti.od === 'CN-88888' && pdStav(P.soubor).stav === 'chyba', pdStav(P.soubor));
  {
    const g = zakazka(P.soubor);
    const a = zk.importZakazka(kopie(g));
    const u = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: a, ocekavaneRazitko: g.uloRazitko }, cP)).json();
    test('S1: zahájené převzetí přežije uložení z prohlížeče (prodOciste)', u.ok && pdStav(P.soubor).prevzeti && pdStav(P.soubor).prevzeti.od === 'CN-88888', [u.chyba, pdStav(P.soubor)]);
  }
  n = await prodej({ soubor: P.soubor, akce: 'nahled', ...podP }, cP);
  test('S1: opakovaný náhled — deal už nese naše CN (cizi prázdné)', n.status === 200 && n.cizi === null, n.cizi);
  r = await prodej({ soubor: P.soubor, akce: 'zapis', ...podP, otisk: n.otisk }, cP);
  const pozn = (D().poznamky || []).slice(pozn0);
  test('S1: opakování dopíše poznámku k dealu a „PŘEVZAT od nabídky CN-88888“, záznam bez převzetí', r.status === 200 && r.prevzato === true
    && pozn.length === 1 && /dříve CN-88888/.test(pozn[0].content)
    && (zakazka(P.soubor).protokol || []).some((x) => /PŘEVZAT od nabídky CN-88888 \(dokončeno po nepotvrzeném pokusu\)/.test(x.co))
    && pdStav(P.soubor).stav === 'zapsano' && !pdStav(P.soubor).prevzeti, [r, pozn.length, pdStav(P.soubor)]);
  r = await prodej({ soubor: P.soubor, akce: 'zapis', ...podP, otisk: (await prodej({ soubor: P.soubor, akce: 'nahled' }, cP)).otisk }, cP);
  test('S1: další zápis už poznámku nepřidá', r.status === 200 && (D().poznamky || []).length === pozn0 + 1);

  /* S2: dva souběžné zápisy s převzetím. */
  const S = await prodanaZakazka();
  const podS = podklad(S.soubor);
  S.deal.custom_fields[HASH_CN] = 'CN-77777';
  n = await prodej({ soubor: S.soubor, akce: 'nahled', ...podS }, cP);
  const p0 = patche().length, q0 = (D().poznamky || []).length;
  const [r1, r2] = await Promise.all([
    prodej({ soubor: S.soubor, akce: 'zapis', otisk: n.otisk, prevzit: true }, cP),
    prodej({ soubor: S.soubor, akce: 'zapis', otisk: n.otisk, prevzit: true }, cP)]);
  test('S2: souběžné zápisy → jeden 200, druhý 409 „zmeneno“; jeden PATCH, jedna poznámka', [r1.status, r2.status].sort().join() === '200,409'
    && [r1, r2].some((x) => x.kod === 'zmeneno') && patche().length === p0 + 1 && (D().poznamky || []).length === q0 + 1,
    [r1.status, r2.status, patche().length - p0, (D().poznamky || []).length - q0]);
  test('S2: v protokolu jedno „PŘEVZAT od nabídky CN-77777“', (zakazka(S.soubor).protokol || []).filter((x) => /PŘEVZAT od nabídky CN-77777/.test(x.co)).length === 1);

  /* S4: text chyby Pipedrive (opakuje hodnotu) do záznamu prodeje a protokolu nejde. */
  const E = await prodanaZakazka();
  n = await prodej({ soubor: E.soubor, akce: 'nahled' }, cP);
  SIM.pdSimNastav({ scenar: 'odmitnuti' });
  r = await prodej({ soubor: E.soubor, akce: 'zapis', otisk: n.otisk }, cP);
  SIM.pdSimNastav({ scenar: '' });
  const ze = zakazka(E.soubor);
  test('S4: odmítnutý PATCH (400) → pevná věta v záznamu i protokolu, bez textu Pipedrive', r.status === 502 && pdStav(E.soubor).stav === 'chyba'
    && pdStav(E.soubor).duvod === PP.pdProdejChybaVeta({ stav: 400 }) && !JSON.stringify(ze).includes('odmitnuty@'), [r, pdStav(E.soubor)]);
  test('S4: surový text Pipedrive jen v odpovědi (podrobnost) tomu, kdo zapisoval', /odmitnuty@/.test(r.podrobnost || '') && !/odmitnuty@/.test(r.chyba), r);
  test('S4: pdProdejChybaVeta — pevné věty podle stavu', /neplatná hodnota/.test(PP.pdProdejChybaVeta({ stav: 422 }))
    && /neodpověděl včas/.test(PP.pdProdejChybaVeta({ stav: 504 })) && /neodpovídá/.test(PP.pdProdejChybaVeta({ stav: 500 }))
    && PP.pdProdejChybaVeta({ stav: 418, message: 'x@y.cz' }) === 'Zápis do Pipedrive se nepovedl.');
}

test('do sítě za celý běh nic', venku.length === 0, venku);
puvodniLog('\n' + ok + ' OK, ' + fail + ' FAIL' + (fail ? '\nSelhalo:\n  ' + selhalo.join('\n  ') : ''));
process.exit(fail ? 1 : 0);
