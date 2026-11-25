/* ============================================================
 * PD2 #782 — POLE KRYCÍHO LISTU DO DEALU „JEN DO PRÁZDNÉHO“, DOHLEDÁNÍ OSOB
 * A ORGANIZACÍ, INFORMOVÁNO, K53-N3, #777, #779 (J. V. 25. 11. 2026; revize
 * návrhu Fable U1–U9). JEN proti simulátoru Pipedrive:
 *   1. čistá logika: pdPrazdne podle typu, #777 jen řádek „nelze“,
 *      pdDohledej (přesná shoda e-mailu / jména / názvu, org dealu, podvržení
 *      kandidáti, víc shod, deal bez organizace, limit, lhůta, důvody bez hodnoty);
 *   2. zápis prodeje: kontakty / podpisy / Informováno do prázdných polí,
 *      vyplněné se nepřepíše („ponechá se“), jen GET + jediný PATCH (žádný
 *      POST / PUT / DELETE), souběh (pole vyplněno mezi náhledem a zápisem) → 409;
 *   3. pomalé hledání → „nelze ověřit“, ostatní pole se zapíšou;
 *   4. K53-N3: Nabídku vypracoval = uživatel PD podle e-mailu ze snímku zámku;
 *      zámek bez snímku = dřívější chování; neaktivní uživatel PD se nebere;
 *   5. odeslání: kontakty jen do prázdných, podpisy / Informováno se nepíšou,
 *      jen GET + PATCH (+ poznámka), #779 značka poznámky.
 * Před PD2 sada selže (kontakty „cteni“, simulátor bez hledání osob, žádný
 * pd_dohledani.mjs). Spuštění: node netlify/test_pd2_pole.mjs
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
const { default: odeslaniFn } = await import('./functions/pd_odeslani.mjs');
const DOH = await import('./lib/pd_dohledani.mjs');
const PRE = await import('./lib/pd_prevod.mjs');
const POZ = await import('./lib/pd_poznamka.mjs');
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
  slevy: { minMarze: 0, maxGlobalni: 0.3, stropy: {} }, poznamka: 'pd2' }, cA);
for (const [email, jmeno] of [[PETRA, 'Petra Ukázková'], ['obch.cizi782@priklad.cz', 'Cizí Obchodník']]) {
  const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email, jmeno, role: 'Obchodník', heslo: 'Heslo12345x' }, cA)).json();
  if (!x.ok) throw new Error('účet ' + JSON.stringify(x));
}
const cP = await login(PETRA, 'Heslo12345x');
const cC = await login('obch.cizi782@priklad.cz', 'Heslo12345x');
const platny = () => JSON.parse(pamet.get('program/db')).platny;
const DNES = OBJ.objDnes();
const zamkni = (z, v) => zam.zamkniVariantu(v, { typ: 'nabidkaTisk', kdy: new Date().toISOString(), kdo: 'Test PD2',
  cislo: zam.variantaCislo(z, v), vysledek: zam.zamekVysledekSpocti(v, JEKLY, 'v-pd2'), snimek: zam.zamekSnimekSpocti(v) });

/* Deal Petry → webhook založí kalkulaci (autor Petra, #734) → doplní, vytiskne (zámek), prodá. */
const pouzite = [];
async function prodanaZakazka(prodat = true, upravit = null) {
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
  if (upravit) upravit(z, v, D().dealy.find((d) => d.id === deal.id));
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
const radek = (d, k) => (d.radky || []).find((x) => x.klic === k) || {};
const hash = (nazev) => pdHashZNazvu(nazev);
const H = {
  smluvni: hash('Kontakt – ve věcech smluvních'), obchodni: hash('Kontakt – ve věcech obchodních'),
  technicky: hash('Kontakt – ve věcech technických'), firma: hash('Podepisující firma (pokud jiná)'),
  podpis2: hash('Druhý podepisující za zákazníka'), bo: hash('Informováno Backoffice'), tech: hash('Informováno Technické odd.'),
  vypracoval: hash('Nabídku vypracoval'),
};
const DEF = Object.fromEntries(POLE_DEALU.map((d) => [d.klic, d]));
const DNES_PRAHA = PRE.pdDnesPraha();
async function odesl(telo, cookie) {
  const r = await post(odeslaniFn, 'http://x/api/pd/odeslani', telo, cookie);
  const t = await r.text(); texty.push(t);
  return { status: r.status, ...JSON.parse(t) };
}
const jenGetAJedenPatch = (od, dealId) => {
  const p = pozadavky().slice(od);
  const zapisy = p.filter((x) => !/^GET /.test(x));
  return zapisy.length === 1 && zapisy[0] === 'PATCH /api/v2/deals/' + dealId ? '' : p.join(' | ');
};

/* ---------- 1. ČISTÁ LOGIKA ---------- */
puvodniLog('\n===== 1. ČISTÁ LOGIKA =====\n');
test('pdPrazdne: null, \'\', mezery, 0, \'0\', [], {value:null}, {id:0} = prázdné',
  [null, undefined, '', '  ', 0, '0', [], { value: null }, { id: 0 }, { value: '' }, {}].every(PRE.pdPrazdne));
test('pdPrazdne: id osoby, objekt osoby, datum, text, částka = vyplněné',
  [7, '7', { value: 7, name: 'X' }, { id: 3 }, '2026-11-25', 'Jan', { value: 5, currency: 'CZK' }, false].every((x) => !PRE.pdPrazdne(x)));
{
  /* #777 na STARÝCH hodnotách KL (správní poplatky / pokuta) — jen řádek „nelze“, zápis ostatních běží. */
  const defs = POLE_DEALU.filter((d) => ['spravniPoplatky', 'pokutaSoucinnost', 'splatnostDni'].includes(d.klic));
  const mapa = Object.fromEntries(defs.map((d) => [d.klic, hash(d.nazev)]));
  const popisy = Object.fromEntries(defs.map((d) => [d.klic, { typ: d.typ[0], volby: null, zapisovatelne: true }]));
  for (const [sp, po] of [['5.000 Kč', '-500 Kč'], ['12.000', '−1 000 Kč/den']]) {
    const z = PRE.pdZapisDealu(defs, { proj: { hodnoty: { sodpSpravniPoplatky: sp, sodpPokutaDenni: po, splatnostDni: '14' } } }, { mapa, popisy });
    test('#777: „' + sp + '“ / „' + po + '“ → dva řádky „nelze“ s důvodem, splatnost se zapíše',
      z.duvody.filter((x) => x.klic !== 'hodnotaDealu').length === 2 && z.duvody.some((x) => /oddělovač tisíců/.test(x.duvod)) && z.duvody.some((x) => /záporná/.test(x.duvod))
      && z.custom_fields[mapa.splatnostDni] === 14 && Object.keys(z.custom_fields).length === 1, z);
  }
}
{
  /* pdDohledej proti simulátoru (jen GET). */
  SIM.pdSimReset();
  const d0 = D();
  const deal = d0.dealy.find((d) => d.org_id && d.status === 'open');
  const jedinecne = (o, seznam) => seznam.filter((x) => x.org_id === o.org_id && x.name === o.name).length === 1;
  if (!d0.osoby.some((o) => o.org_id === deal.org_id && jedinecne(o, d0.osoby)))
    d0.osoby.push({ id: 9951, first_name: 'Jedinečná', last_name: 'Osoba', name: 'Jedinečná Osoba', org_id: deal.org_id,
      emails: [{ value: 'jedinecna.osoba1@priklad.cz', primary: true }], phones: [] });
  const vOrg = d0.osoby.filter((o) => o.org_id === deal.org_id && jedinecne(o, d0.osoby));
  const jinde = d0.osoby.find((o) => o.org_id !== deal.org_id);
  const pole = { mapa: Object.fromEntries(POLE_DEALU.map((d) => [d.klic, hash(d.nazev)])) };
  const strany = (h) => ({ ock: { hodnoty: h } });
  const dohl = (h, dl = deal, volby) => DOH.pdDohledej(POLE_DEALU, strany(h), pole, dl, (c, o) => G.__pdZavolej(c, o), volby);
  const { pdZavolej } = await import('./lib/pipedrive.mjs');
  G.__pdZavolej = (c, o) => pdZavolej(c, { ...o, casLimitMs: 2000, pokusu: 1 });
  let r = await dohl({ zastSmluvniJmeno: 'X', zastSmluvniEmail: jinde.emails[0].value.toUpperCase() + ' ' });
  test('kontakt podle e-mailu (velikost písmen a mezery nerozhodují) → ID osoby, text „Jméno (Organizace)“',
    r.dohledano.kontaktSmluvni && r.dohledano.kontaktSmluvni.id === jinde.id
    && r.dohledano.kontaktSmluvni.text === jinde.name + ' (' + d0.organizace.find((o) => o.id === jinde.org_id).name + ')', r);
  r = await dohl({ zastObchodniJmeno: 'Jan', zastObchodniEmail: 'nikdo.neni@priklad.cz' });
  test('kontakt s neznámým e-mailem → důvod bez e-mailu (nic se nezakládá)', r.dohledano.kontaktObchodni
    && r.dohledano.kontaktObchodni.duvod === DOH.PD_DOHLEDANI_DUVODY.nenalezenaEmail && !/nikdo/.test(JSON.stringify(r)), r);
  r = await dohl({ zastTechnickyJmeno: 'Jan' });
  test('kontakt bez e-mailu v KL → důvod „chybí e-mail“, žádné hledání', r.dohledano.kontaktTechnicky
    && r.dohledano.kontaktTechnicky.duvod === DOH.PD_DOHLEDANI_DUVODY.bezEmailu && r.hledani === 0, r);
  /* Dvě osoby se stejným e-mailem → víc shod. */
  const dvojnik = Object.assign(kopie(jinde), { id: 9901 });
  d0.osoby.push(dvojnik);
  r = await dohl({ zastSmluvniJmeno: 'X', zastSmluvniEmail: jinde.emails[0].value });
  test('e-mail dvou osob → „víc osob“, nezapíše se', r.dohledano.kontaktSmluvni.duvod === DOH.PD_DOHLEDANI_DUVODY.viceEmail, r);
  d0.osoby.pop();
  /* Hledání vrátí i podvržené kandidáty (e-mail nesedí) — server je zahodí. */
  d0.hledaniOsobNavic = [vOrg[0].id];
  r = await dohl({ zastSmluvniJmeno: 'X', zastSmluvniEmail: jinde.emails[0].value });
  test('podvržený kandidát hledání (jiný e-mail) se zahodí — dál právě jedna shoda', r.dohledano.kontaktSmluvni.id === jinde.id, r);
  d0.hledaniOsobNavic = [];
  r = await dohl({ objPodpis2Jmeno: ' ' + vOrg[0].name.toUpperCase() + ' ' });
  test('(příprava: osoba s jedinečným jménem v organizaci dealu)', vOrg.length > 0);
  test('druhý podepisující podle jména mezi osobami organizace dealu → ID', r.dohledano.podpis2 && r.dohledano.podpis2.id === vOrg[0].id, r);
  test('…hledá se s organization_id dealu a fields=name', pozadavky().some((x) => /persons\/search\?.*fields=name.*organization_id=/.test(x)
    && x.includes('organization_id=' + deal.org_id)), pozadavky().slice(-3));
  r = await dohl({ objPodpis2Jmeno: jinde.name });
  test('jméno osoby z JINÉ organizace → nenalezena (jen organizace dealu)', r.dohledano.podpis2.duvod === DOH.PD_DOHLEDANI_DUVODY.nenalezenaJmeno, r);
  d0.hledaniOsobNavic = [jinde.id];
  r = await dohl({ objPodpis2Jmeno: jinde.name });
  test('podvržený kandidát z jiné organizace (jméno sedí) se zahodí — ověřuje se org_id', r.dohledano.podpis2.duvod === DOH.PD_DOHLEDANI_DUVODY.nenalezenaJmeno, r);
  d0.hledaniOsobNavic = [];
  r = await dohl({ objPodpis2Jmeno: vOrg[0].name }, Object.assign({}, deal, { org_id: null }));
  test('deal bez organizace → „nelze“ s důvodem, bez hledání', r.dohledano.podpis2.duvod === DOH.PD_DOHLEDANI_DUVODY.bezOrganizace && r.hledani === 0, r);
  const org = d0.organizace[2];
  r = await dohl({ objPodpisFirma: org.name.toLowerCase() });
  test('podepisující firma podle přesného názvu → ID organizace', r.dohledano.podpisFirma && r.dohledano.podpisFirma.id === org.id
    && r.dohledano.podpisFirma.text === org.name, r);
  d0.organizace.push(Object.assign(kopie(org), { id: 9902 }));
  r = await dohl({ objPodpisFirma: org.name });
  test('název dvou organizací → „víc organizací“', r.dohledano.podpisFirma.duvod === DOH.PD_DOHLEDANI_DUVODY.viceFirma, r);
  d0.organizace.pop();
  /* Obsazené pole dealu se nehledá vůbec. */
  const plny = Object.assign(kopie(deal), { custom_fields: Object.assign({}, deal.custom_fields, { [H.firma]: org.id }) });
  const p0 = pozadavky().length;
  r = await dohl({ objPodpisFirma: org.name }, plny);
  test('pole dealu vyplněné → žádné hledání, nic dohledáno', !r.dohledano.podpisFirma && r.hledani === 0 && pozadavky().length === p0, r);
  r = await dohl({ zastSmluvniEmail: jinde.emails[0].value, zastObchodniEmail: vOrg[0].emails[0].value, objPodpisFirma: org.name },
    deal, { max: 2 });
  test('limit hledání na požadavek (zde 2): třetí pole „nad limit“', Object.values(r.dohledano).filter((x) => x.duvod === DOH.PD_DOHLEDANI_DUVODY.limit).length === 1
    && r.hledani === 2, r);
  test('výchozí limit hledání = 6', DOH.PD_DOHLEDANI_MAX === 6);
  d0.hledaniVisi = true;
  const t0 = Date.now();
  r = await dohl({ zastSmluvniEmail: jinde.emails[0].value, objPodpisFirma: org.name }, deal, { lhutaMs: 300 });
  test('visící hledání → po lhůtě „nelze ověřit“ u obou, bez čekání na odpověď', Date.now() - t0 < 1500
    && r.dohledano.kontaktSmluvni.duvod === DOH.PD_DOHLEDANI_DUVODY.casem && r.dohledano.podpisFirma.duvod === DOH.PD_DOHLEDANI_DUVODY.casem,
    [Date.now() - t0, r]);
  d0.hledaniVisi = false;
  test('důvody dohledání nikdy nenesou hledanou hodnotu (pevné věty)', Object.values(DOH.PD_DOHLEDANI_DUVODY).every((t) => !/@|\{/.test(t)));
}

{
  /* A3: Odchylky i u PROJ (zdroj KL PROJ „odchylky“). */
  const d = DEF.odchylky;
  const z = PRE.pdZapisDealu([d], { proj: { hodnoty: { odchylky: 'Splatnost 30 dní dle rámcové smlouvy' } } },
    { mapa: { odchylky: hash(d.nazev) }, popisy: { odchylky: { typ: 'text', volby: null, zapisovatelne: true } } });
  test('A3: Odchylky PROJ se zapíšou do pole „Odchylky oproti smluvnímu standardu“', d.kl.proj === 'odchylky'
    && z.custom_fields[hash(d.nazev)] === 'Splatnost 30 dní dle rámcové smlouvy', z);
}

/* ---------- 2. ZÁPIS PRODEJE ---------- */
puvodniLog('\n===== 2. ZÁPIS PRODEJE: JEN DO PRÁZDNÉHO =====\n');
SIM.pdSimReset();
let osobaE, osobaJ, firma;
const A = await prodanaZakazka(true, (z, v, deal) => {
  osobaE = D().osoby.find((o) => o.org_id !== deal.org_id);
  /* Simulátor má v organizaci i jmenovce — bere se osoba s jedinečným jménem v organizaci dealu. */
  osobaJ = D().osoby.find((o) => o.org_id === deal.org_id && D().osoby.filter((x) => x.org_id === o.org_id && x.name === o.name).length === 1);
  if (!osobaJ) { osobaJ = { id: 9950, first_name: 'Jedinečná', last_name: 'Osoba', name: 'Jedinečná Osoba', org_id: deal.org_id,
    emails: [{ value: 'jedinecna.osoba@priklad.cz', primary: true }], phones: [] }; D().osoby.push(osobaJ); }
  firma = D().organizace.find((o) => o.id !== deal.org_id);
  z.zastupci = Object.assign(z.zastupci || {}, { smluvniJmeno: 'Smluvní Zástupce', smluvniEmail: osobaE.emails[0].value,
    obchodniJmeno: 'Obchodní Zástupce', obchodniEmail: 'neexistuje.v.pd@priklad.cz', technickyJmeno: 'Technik', technickyEmail: osobaE.emails[0].value });
  Object.assign(v.data.kryci.hodnoty, { objPodpisFirma: firma.name, objPodpis2Jmeno: osobaJ.name,
    podpisInformovanBo: 'Backoffice informován', podpisInformovanTech: 'Technik informován' });
  /* Technický kontakt a Informováno Tech jsou v dealu už vyplněné — nepřepisují se. */
  deal.custom_fields[H.technicky] = 3;
  deal.custom_fields[H.tech] = '2026-01-15';
});
let pred = pozadavky().length;
let n = await prodej({ soubor: A.soubor, akce: 'nahled' }, cP);
test('náhled prodeje → 200', n.status === 200 && /^[0-9a-f]{32}$/.test(n.otisk), [n.status, n.chyba]);
test('kontakt smluvní: zapíše se ID osoby podle e-mailu, „Jméno (Organizace)“', radek(n, 'kontaktSmluvni').stav === 'zapise'
  && radek(n, 'kontaktSmluvni').hodnota === osobaE.id && radek(n, 'kontaktSmluvni').hodnotaText.startsWith(osobaE.name + ' ('), radek(n, 'kontaktSmluvni'));
test('kontakt obchodní (e-mail v PD není) → nelze s důvodem, bez e-mailu v důvodu', radek(n, 'kontaktObchodni').stav === 'nelze'
  && !/neexistuje/.test(radek(n, 'kontaktObchodni').duvod), radek(n, 'kontaktObchodni'));
test('kontakt technický vyplněný v dealu → „ponechá se“, nepřepíše', radek(n, 'kontaktTechnicky').stav === 'ponechano'
  && radek(n, 'kontaktTechnicky').posle === false && /nepřepisuje/.test(radek(n, 'kontaktTechnicky').duvod), radek(n, 'kontaktTechnicky'));
test('podepisující firma → ID organizace; druhý podepisující → ID osoby organizace dealu',
  radek(n, 'podpisFirma').hodnota === firma.id && radek(n, 'podpis2').hodnota === osobaJ.id, [radek(n, 'podpisFirma'), radek(n, 'podpis2')]);
test('Informováno BO = datum zápisu (Praha); Informováno Tech vyplněné → ponechá se',
  radek(n, 'informovanoBo').hodnota === DNES_PRAHA && radek(n, 'informovanoTech').stav === 'ponechano', [radek(n, 'informovanoBo'), radek(n, 'informovanoTech')]);
test('K53-N3: Nabídku vypracoval = uživatel Pipedrive podle e-mailu ze snímku zámku (Petra)',
  radek(n, 'nabidkuVypracoval').stav === 'zapise' && radek(n, 'nabidkuVypracoval').hodnota === U[1].id, radek(n, 'nabidkuVypracoval'));
test('náhled do Pipedrive jen GET', pozadavky().slice(pred).every((x) => /^GET /.test(x)), pozadavky().slice(pred));
test('odpověď nenese e-maily uživatelů Pipedrive', ![U[0], U[2], U[3]].some((u) => texty[texty.length - 1].includes(u.email)));
pred = pozadavky().length;
let r = await prodej({ soubor: A.soubor, akce: 'zapis', otisk: n.otisk }, cP);
test('zápis → 200 zapsano', r.status === 200 && r.stav === 'zapsano', r);
test('U3: celý zápis jen GET a jediný PATCH /deals/N (žádné POST / PUT / DELETE)', jenGetAJedenPatch(pred, A.deal.id) === '', jenGetAJedenPatch(pred, A.deal.id));
let deal = D().dealy.find((d) => d.id === A.deal.id);
test('deal: smluvní kontakt, firma, druhý podepisující, Informováno BO zapsané', deal.custom_fields[H.smluvni] === osobaE.id
  && deal.custom_fields[H.firma] === firma.id && deal.custom_fields[H.podpis2] === osobaJ.id && deal.custom_fields[H.bo] === DNES_PRAHA,
  deal.custom_fields);
test('deal: vyplněný technický kontakt a Informováno Tech zůstaly', deal.custom_fields[H.technicky] === 3 && deal.custom_fields[H.tech] === '2026-01-15');
test('deal: obchodní kontakt (nenalezen) nezapsán', PRE.pdPrazdne(deal.custom_fields[H.obchodni]));
test('protokol nenese e-mail ani jméno z KL', !(zakazka(A.soubor).protokol || []).some((p) => /@|Smluvní Zástupce/.test(p.co)));
/* Druhý náhled: vše „jen do prázdného“ už je obsazené → ponechá se, PATCH nic z toho nenese. */
n = await prodej({ soubor: A.soubor, akce: 'nahled' }, cP);
test('opakovaný náhled: kontakt, firma, podpis, Informováno BO teď „ponechá se“',
  ['kontaktSmluvni', 'podpisFirma', 'podpis2', 'informovanoBo'].every((k) => radek(n, k).stav === 'ponechano'),
  ['kontaktSmluvni', 'podpisFirma', 'podpis2', 'informovanoBo'].map((k) => radek(n, k).stav));

/* U1: mezi náhledem a zápisem někdo pole v Pipedrive vyplní → 409, nic se nepřepíše. */
puvodniLog('\n===== 3. SOUBĚH A LHŮTA =====\n');
const B = await prodanaZakazka(true, (z, v, dl) => {
  z.zastupci = Object.assign(z.zastupci || {}, { smluvniJmeno: 'S', smluvniEmail: D().osoby.find((o) => o.org_id !== dl.org_id).emails[0].value });
});
n = await prodej({ soubor: B.soubor, akce: 'nahled' }, cP);
test('(příprava: smluvní kontakt se zapíše)', radek(n, 'kontaktSmluvni').stav === 'zapise', radek(n, 'kontaktSmluvni'));
deal = D().dealy.find((d) => d.id === B.deal.id);
deal.custom_fields[H.smluvni] = 4;
deal.update_time = '2026-11-25T10:00:00Z';
const pp = patche().length;
r = await prodej({ soubor: B.soubor, akce: 'zapis', otisk: n.otisk }, cP);
test('U1: pole vyplněné mezi náhledem a zápisem → 409 „zmeneno“, žádný PATCH, pole zůstalo', r.status === 409 && r.kod === 'zmeneno'
  && patche().length === pp && D().dealy.find((d) => d.id === B.deal.id).custom_fields[H.smluvni] === 4, r);
/* Stejný update_time (Pipedrive čas nezměnil): rozhoduje deal čtený při zápisu — otisk PATCH nesedí. */
const C = await prodanaZakazka(true, (z, v, dl) => {
  z.zastupci = Object.assign(z.zastupci || {}, { smluvniJmeno: 'S', smluvniEmail: D().osoby.find((o) => o.org_id !== dl.org_id).emails[0].value });
});
n = await prodej({ soubor: C.soubor, akce: 'nahled' }, cP);
D().dealy.find((d) => d.id === C.deal.id).custom_fields[H.smluvni] = 5;   // update_time beze změny
r = await prodej({ soubor: C.soubor, akce: 'zapis', otisk: n.otisk }, cP);
test('U1: i bez změny update_time rozhodne deal čtený při zápisu → 409, nepřepíše', r.status === 409
  && D().dealy.find((d) => d.id === C.deal.id).custom_fields[H.smluvni] === 5, r);
/* U5: visící hledání — náhled doběhne, osoby „nelze ověřit“, ostatní pole se zapíšou. */
const E = await prodanaZakazka(true, (z, v, dl) => {
  z.zastupci = Object.assign(z.zastupci || {}, { smluvniJmeno: 'S', smluvniEmail: D().osoby.find((o) => o.org_id !== dl.org_id).emails[0].value });
  v.data.kryci.hodnoty.objPodpisFirma = D().organizace[1].name;
});
D().hledaniVisi = true;
const t0 = Date.now();
n = await prodej({ soubor: E.soubor, akce: 'nahled' }, cP);
const trvalo = Date.now() - t0;
D().hledaniVisi = false;
test('U5: visící hledání → náhled 200 pod časovou mezí funkce', n.status === 200 && trvalo < 6000, [n.status, n.chyba, trvalo]);
test('U5: kontakt a firma „nelze ověřit“, ostatní pole (CN, hodnota, fáze) se zapíšou',
  /nelze ověřit/.test(radek(n, 'kontaktSmluvni').duvod) && /nelze ověřit/.test(radek(n, 'podpisFirma').duvod)
  && radek(n, 'hodnotaDealu').posle === true && radek(n, 'fazeDealu').posle === true, [radek(n, 'kontaktSmluvni'), radek(n, 'podpisFirma')]);

/* ---------- 4. K53-N3 ---------- */
puvodniLog('\n===== 4. K53-N3 NABÍDKU VYPRACOVAL =====\n');
{
  const F = await prodanaZakazka(true);
  const g = zakazka(F.soubor);
  delete g.varianty[0].zamek.zpracovatel;   // starší zámek bez snímku zpracovatele
  zapisZakazku(F.soubor, g);
  n = await prodej({ soubor: F.soubor, akce: 'nahled' }, cP);
  test('K53-N3: zámek bez snímku → dřívější chování (hodnota z předvyplnění, ne uživatel Petra)',
    n.status === 200 && radek(n, 'nabidkuVypracoval').hodnota !== U[1].id, radek(n, 'nabidkuVypracoval'));
  /* Ruční hodnota KL má přednost i před snímkem zámku (zakázka se snímkem Petry). */
  const F2 = await prodanaZakazka(true);
  const g2 = zakazka(F2.soubor);
  test('(příprava: zámek nese snímek zpracovatele)', !!(g2.varianty[0].zamek && g2.varianty[0].zamek.zpracovatel && g2.varianty[0].zamek.zpracovatel.email));
  g2.varianty[0].data.kryci.hodnoty.dodZpracoval = 'Tomáš Zkušební, ' + U[2].email;
  zapisZakazku(F2.soubor, g2);
  n = await prodej({ soubor: F2.soubor, akce: 'nahled' }, cP);
  test('K53-N3: ruční hodnota KL má přednost před snímkem zámku', radek(n, 'nabidkuVypracoval').hodnota === U[2].id, radek(n, 'nabidkuVypracoval'));
  D().uzivatele[2].active_flag = false;
  n = await prodej({ soubor: F2.soubor, akce: 'nahled' }, cP);
  test('U6: neaktivní uživatel Pipedrive se nebere (nelze)', radek(n, 'nabidkuVypracoval').stav === 'nelze', radek(n, 'nabidkuVypracoval'));
  D().uzivatele[2].active_flag = true;
}
{
  const { pdnZpracovatelZeZamku } = require('../src/pd_nanecisto.js');
  test('snímek zámku → „Titul Jméno, telefon, e-mail“; bez e-mailu / nezamčený = nic',
    pdnZpracovatelZeZamku({ zamek: { zamceno: true, zpracovatel: { titul: 'Ing.', jmeno: 'Jan, Vzor', telefon: '123', email: 'a@b.cz' } } }) === 'Ing. Jan Vzor, 123, a@b.cz'
    && pdnZpracovatelZeZamku({ zamek: { zamceno: true, zpracovatel: { jmeno: 'X' } } }) === ''
    && pdnZpracovatelZeZamku({ zamek: { zamceno: false, zpracovatel: { email: 'a@b.cz' } } }) === '');
}

/* ---------- 5. ODESLÁNÍ ---------- */
puvodniLog('\n===== 5. ODESLÁNÍ NABÍDKY =====\n');
{
  let oE;
  const O = await prodanaZakazka(false, (z, v, dl) => {
    oE = D().osoby.find((o) => o.org_id !== dl.org_id);
    z.zastupci = Object.assign(z.zastupci || {}, { smluvniJmeno: 'S', smluvniEmail: oE.emails[0].value });
    Object.assign(v.data.kryci.hodnoty, { objPodpisFirma: D().organizace[1].name, podpisInformovanBo: 'BO' });
  });
  const g = zakazka(O.soubor);
  const zaklad = { soubor: O.soubor, varianta: g.varianty[0].id, zamekKdy: g.varianty[0].zamek.kdy };
  pred = pozadavky().length;
  const no = await odesl({ ...zaklad, akce: 'nahled' }, cP);
  test('odeslání náhled → 200; kontakt smluvní se zapíše (jen do prázdného)', no.status === 200 && radek(no, 'kontaktSmluvni').stav === 'zapise'
    && radek(no, 'kontaktSmluvni').hodnota === oE.id, [no.status, no.chyba, radek(no, 'kontaktSmluvni')]);
  test('odeslání: podpisy, Informováno a Platby se nepíšou (patří prodeji)', !['podpisFirma', 'podpis2', 'zmocnitel', 'informovanoBo', 'platba1']
    .some((k) => (no.radky || []).some((x) => x.klic === k)));
  test('#779: značka poznámky odeslání = číslo, kterým se zakázka prokazuje (vedoucí strana)',
    no.poznamka.trim().endsWith('— nabídka ' + G.zakazkaCisloVedouci(zakazka(O.soubor))), no.poznamka.slice(-80));
  const ro = await odesl({ ...zaklad, akce: 'zapis', otisk: no.otisk }, cP);
  const zapisy = pozadavky().slice(pred).filter((x) => !/^GET /.test(x));
  test('U3 odeslání: mimo GET jen jeden PATCH dealu a poznámka (POST /api/v1/notes) — žádné osoby ani organizace',
    ro.status === 200 && zapisy.length === 2 && zapisy[0] === 'PATCH /api/v2/deals/' + O.deal.id && zapisy[1] === 'POST /api/v1/notes', [ro.status, zapisy]);
  test('odeslání: deal má smluvní kontakt', D().dealy.find((d) => d.id === O.deal.id).custom_fields[H.smluvni] === oE.id);
}
{
  /* #779 na PROJ: zakázka vedená stranou PROJ → značka s číslem PROJ; stará značka (zak.cislo) se dál pozná. */
  const zak = { cislo: '2026 - OPR - CN - ', proj: { cislo: 'CN-437' } };
  const Gx = { zakazkaCisloVedouci: () => 'CN-437' };
  test('#779: pdPoznamkaZnackaOdeslani u PROJ = „— nabídka CN-437“', POZ.pdPoznamkaZnackaOdeslani(zak, Gx) === ' — nabídka CN-437');
  const puv = G.zakazkaCisloVedouci;
  G.zakazkaCisloVedouci = () => 'CN-437';
  test('#779: poznámka s novou i se starou značkou je „naše“ (úprava, ne nová poznámka)',
    POZ.pdPoznamkaOdeslJeNase('Nabídka odeslána: CN-437\n— nabídka CN-437', zak)
    && POZ.pdPoznamkaOdeslJeNase('Nabídka odeslána: X\n— nabídka 2026 - OPR - CN -', zak)
    && !POZ.pdPoznamkaOdeslJeNase('Nabídka odeslána: X\n— nabídka CN-999', zak));
  G.zakazkaCisloVedouci = puv;
}

/* ---------- 6. NÁLEZY REVIZE PV N1–N5 (#752) ---------- */
puvodniLog('\n===== 6. REVIZE PV N1–N5 =====\n');
{
  const { pdWebhookAutor } = await import('./lib/pd_webhook.mjs');
  const a = await pdWebhookAutor({ owner_id: 2 }, { nactiUzivatele: async () => [{ id: 2, email: 'vypnuty@priklad.cz', active_flag: false }],
    ucet: async (e) => ({ email: e, jmeno: 'Vypnutý', aktivni: true }) });
  test('PV N1: vypnutý uživatel Pipedrive (active_flag false) autorem nebude', a.stav === 'nenalezen', a);
  const { pdPoleMapa } = await import('./functions/pd_pole.mjs');
  const volano = [];
  await pdPoleMapa(true, async (c, o) => { volano.push(c); const { pdZavolej } = await import('./lib/pipedrive.mjs'); return pdZavolej(c, o); });
  test('PV N2: pdPoleMapa volá definice polí přes zavolej volajícího (časový rozpočet)',
    volano.includes('/api/v2/dealFields') && volano.includes('/api/v2/organizationFields'), volano);
  /* N3: vazba jen odkazem v dealu (bez vazby z webhooku) → deal se čte jednou. */
  const Q = await prodanaZakazka(true);
  const gq = zakazka(Q.soubor); delete gq.pdVazbaWebhook; zapisZakazku(Q.soubor, gq);
  const p0 = pozadavky().length;
  const logy = [];
  const puvLog = console.log;
  console.log = (...x) => { const t = x.join(' '); if (t.startsWith('pd_prodej: ')) logy.push(t); else puvLog(...x); };
  /* Odkaz v dealu zapsal webhook pro https://testweb.example — náhled z téže adresy. */
  const rq = await prodejFn(new Request('https://testweb.example/api/pd/prodej', { method: 'POST', headers: { cookie: cP },
    body: JSON.stringify({ soubor: Q.soubor, akce: 'nahled' }) }));
  n = { status: rq.status, ...(await rq.json()) };
  console.log = puvLog;
  const cteni = pozadavky().slice(p0).filter((x) => x === 'GET /api/v2/deals/' + Q.deal.id);
  test('PV N3: ověření odkazem vrátí deal — náhled ho čte jen jednou', n.status === 200 && cteni.length === 1, [n.status, n.chyba, cteni]);
  test('PV N5: jeden řádek logu „pd_prodej: …“ s dealId, akcí a počtem polí, bez e-mailů a jmen',
    logy.length === 1 && /"dealId":"\d+"/.test(logy[0]) && /"akce":"nahled"/.test(logy[0]) && !/@|Petra|Zástupce/.test(logy[0]), logy);
}

puvodniLog('\n' + ok + ' OK, ' + fail + ' FAIL');
if (fail) { puvodniLog('Selhalo:\n  ' + selhalo.join('\n  ')); process.exit(1); }
