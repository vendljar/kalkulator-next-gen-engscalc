/* ============================================================
 * K40c #581 — VAZBA Z WEBHOOKU, ARES NA SERVERU A OPRAVA FIRMY V PIPEDRIVE
 * (rozhodnutí J. V. 11. 11. 2026, podklady/PROMPT_K40_OPRAVY_v3.md, meze B208–B209)
 *
 * Proti simulátoru Pipedrive (PIPEDRIVE_SIMULATOR=1) a mocku ARES
 * (ARES_SIT.fetch) — do sítě nejde nic (globální fetch v testu hází):
 *   1. ARES modul: kontrolní číslice, čistá odpověď, jiné IČO, řídicí znaky,
 *      HTML, přerostlá odpověď, ne-JSON, 500, 404, časový limit;
 *   2. navázání existující kalkulace: protokol, pdVazbaWebhook „ceka“,
 *      firma z ARES, kontakt z dealu, ručně upravené pole zůstane, rozdíly
 *      ARES × Pipedrive; druhé doručení bez změny IČO ARES nevolá;
 *   3. pole dřív zapsané webhookem z dealu přepíše hodnota z ARES (změna IČO);
 *   4. výpadky ARES → webhook 200 s varováním a údaji z dealu (i pomalý mock
 *      pod limitem funkce); neplatné IČO → žádný dotaz; zmrazená hlavička →
 *      žádný dotaz ani změna;
 *   5. V pořádku / Vazba je chybná / Zrušit vazbu (autor, administrátor, cizí
 *      obchodník 403, podvržený autor nepomůže), po zrušení 409 bez zápisu,
 *      odkaz v dealu smazán jen když je náš, zamčená varianta beze změny;
 *   6. pole psaná jen serverem: podvržené pdVazbaWebhook / pdDealyOdmitnute
 *      od klienta se ignorují; změna dealu autorem 200, cizím 403;
 *   7. oprava organizace: role, právo Pipedrive, organizace dealu, shoda IČO
 *      (409 bez ARES i PATCH), jen potvrzená a lišící se pole, DIČ přeskočeno,
 *      druhý zápis bez rozdílů nic neposílá.
 * Spuštění: node netlify/test_k40c_webhook.mjs
 * ============================================================ */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
for (const k of ['PIPEDRIVE_SIMULATOR_SCENAR', 'PIPEDRIVE_TOKEN', 'PIPEDRIVE_DOMENA', 'PROSTREDI', 'PIPEDRIVE_WEBHOOK_KLIC',
  'NETLIFY', 'SITE_ID', 'SITE_NAME', 'DEPLOY_ID', 'CONTEXT', 'BRANCH', 'HEAD', 'URL', 'DEPLOY_URL', 'DEPLOY_PRIME_URL']) delete process.env[k];
process.env.PIPEDRIVE_SIMULATOR = '1';
const KLIC = 'kng-test-webhook-klic-k40c-0123456789abcdefghijk';
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

const A = await import('./lib/ares_server.mjs');
/* ---------- mock ARES ---------- */
const ares = { rezim: 'ok', volani: 0, url: [], subjekty: new Map() };
const odpoved = (telo, status = 200, hl = {}) => new Response(typeof telo === 'string' ? telo : JSON.stringify(telo), { status, headers: hl });
A.ARES_SIT.fetch = async (url, init) => {
  ares.volani++; ares.url.push(String(url));
  const ico = String(url).split('/').pop();
  const r = ares.rezim;
  if (r === 'pomaly') return new Promise(() => {});                  // neodpoví nikdy (signál ignoruje)
  if (r === '500') return odpoved('{}', 500);
  if (r === '404') return odpoved('{"kod":"NENALEZENO"}', 404);
  if (r === 'nejson') return odpoved('<html>chyba</html>');
  if (r === 'jineIco') return odpoved({ ico: '25596641', obchodniJmeno: 'Cizí firma (smyšlená)' });
  if (r === 'velka') return odpoved({ ico, obchodniJmeno: 'X'.repeat(A.ARES_ODPOVED_MAX + 10) });
  if (r === 'presmerovani') { if (init && init.redirect === 'error') throw new TypeError('redirect'); return odpoved({ ico, obchodniJmeno: 'Přesměrováno' }); }
  const s = ares.subjekty.get(ico);
  return s ? odpoved(s) : odpoved('{}', 404);
};

const { default: webhook } = await import('./functions/pd_webhook.mjs');
const { default: vazbaFn } = await import('./functions/pd_vazba.mjs');
const { default: orgFn } = await import('./functions/pd_organizace.mjs');
const { default: prihlaseni } = await import('./functions/prihlaseni.mjs');
const { default: program } = await import('./functions/program.mjs');
const { default: zakazky } = await import('./functions/zakazky.mjs');
const { default: uzivatele } = await import('./functions/uzivatele.mjs');
const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');
const SIM = await import('./lib/pipedrive_simulator.mjs');
const W = await import('./lib/pd_webhook.mjs');
const V = await import('./lib/pd_vazba.mjs');
const { pdHashZNazvu } = await import('./lib/pd_mapa.mjs');
const { pdPoleMapa } = await import('./functions/pd_pole.mjs');
const { jadro } = await import('./lib/jadro.mjs');
await jadro();
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
const ZC = require('../src/zkusebni_cenik.js');
const G = globalThis;

let ok = 0, fail = 0; const selhalo = [];
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; selhalo.push(n); console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info).slice(0, 700))); }
};
const kopie = (x) => JSON.parse(JSON.stringify(x));
const odpovedi = [];
async function volej(dealId) {
  const r = await webhook(new Request('https://testweb.example/api/pd/webhook', { method: 'POST',
    headers: { 'content-type': 'application/json', 'x-kalkulator-klic': KLIC }, body: JSON.stringify({ dealId }) }));
  const text = await r.text(); odpovedi.push(text);
  let j = {}; try { j = JSON.parse(text); } catch (e) { j = {}; }
  return { status: r.status, ...j };
}
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const postJ = async (fn, url, telo, cookie) => { const r = await post(fn, url, telo, cookie); const t = await r.text(); odpovedi.push(t);
  let j = {}; try { j = JSON.parse(t); } catch (e) { j = {}; } return { status: r.status, ...j }; };
const vazba = (soubor, akce, cookie, navic) => postJ(vazbaFn, 'https://testweb.example/api/pd/vazba', { soubor, akce, ...(navic || {}) }, cookie);
const opravOrg = (soubor, akce, cookie, navic) => postJ(orgFn, 'https://testweb.example/api/pd/organizace', { soubor, akce, ...(navic || {}) }, cookie);
const login = async (e, h) => ((await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h })).headers.get('set-cookie') || '').split(';')[0];
const zakazka = (soubor) => JSON.parse(pamet.get('zakazky/z/' + soubor) || 'null');
const zapisZakazku = (soubor, z) => pamet.set('zakazky/z/' + soubor, JSON.stringify(z));
const D = () => SIM.pdSimStav().data;
const pdPatche = (co) => SIM.pdSimStav().pozadavky.filter((x) => x.startsWith('PATCH') && (!co || x.includes(co))).length;
const HASH_CN = pdHashZNazvu('Číslo nabídky (CN)'), HASH_ODKAZ = pdHashZNazvu('Odkaz na kalkulaci');
const HASH_IC = pdHashZNazvu('IČ');

/* Platné (smyšlené) IČO: 7 číslic + kontrolní. */
function icoS(zaklad7) {
  let s = 0; for (let i = 0; i < 7; i++) s += (+zaklad7[i]) * (8 - i);
  const z = s % 11; return zaklad7 + String(z === 0 ? 1 : (z === 1 ? 0 : 11 - z));
}
const ICO1 = icoS('9100001'), ICO2 = icoS('9100002'), ICO3 = icoS('9100003'), ICO0 = icoS('0910004');
const subjekt = (ico, nazev, extra) => ({ ico, obchodniJmeno: nazev, dic: 'CZ' + ico,
  sidlo: { textovaAdresa: 'Zkušební ' + ico.slice(-2) + ', 110 00 Vzorov' }, ...(extra || {}) });
ares.subjekty.set(ICO1, subjekt(ICO1, 'Zkušební Stavby a.s. (smyšlené)'));
ares.subjekty.set(ICO2, subjekt(ICO2, 'Druhá Zkušební s.r.o. (smyšlené)'));
ares.subjekty.set(ICO0, subjekt(ICO0, 'Nulová Zkušební s.r.o. (smyšlené)'));
ares.subjekty.set(ICO3, subjekt(ICO3, '<img src=x onerror=alert(1)>\u0007Jed "s.r.o."', { dic: 'CZ<script>' }));

/* ---------- 1. ARES MODUL ---------- */
console.log('\n===== 1. ARES MODUL =====\n');
test('aresIcoPlatne = icoPlatne jádra (10 000 čísel)', (() => {
  for (let i = 0; i < 10000; i++) { const t = String(10000000 + i * 8999).slice(0, 8); if (A.aresIcoPlatne(t) !== G.icoPlatne(t)) return false; }
  return true;
})());
test('IČO: mezery a úvodní nuly (číslo z Pipedrive) se normalizují', A.aresIcoNorm(' 1 000 ') === '00001000' && A.aresIcoNorm(1000) === '00001000'
  && A.aresIcoNorm('CZ12345678') === '' && A.aresIcoNorm('123456789') === '');
/* Režim mocku platí jen pro jedno volání (i u mocku, který nikdy neodpoví). */
const mf = (rezim) => (u, i) => { const p = ares.rezim; ares.rezim = rezim; try { return A.ARES_SIT.fetch(u, i); } finally { ares.rezim = p; } };
let n0 = ares.volani;
let a = await A.aresNacti('12345678', { fetch: mf('ok') });
test('neplatná kontrolní číslice → „neplatne“ a žádný dotaz', a.stav === 'neplatne' && ares.volani === n0, [a, ares.volani - n0]);
a = await A.aresNacti(ICO1, { fetch: mf('ok') });
test('platné IČO → subjekt (název, sídlo, IČO, DIČ), adresa jen pevný základ + IČO',
  a.stav === 'ok' && a.subjekt.nazev === 'Zkušební Stavby a.s. (smyšlené)' && a.subjekt.ico === ICO1 && a.subjekt.dic === 'CZ' + ICO1
  && ares.url[ares.url.length - 1] === 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/' + ICO1, [a, ares.url.slice(-1)]);
for (const [rez, ocek] of [['404', 'nenalezeno'], ['500', 'vypadek'], ['nejson', 'vypadek'], ['jineIco', 'nenalezeno'], ['velka', 'vypadek'], ['presmerovani', 'vypadek']]) {
  a = await A.aresNacti(ICO1, { fetch: mf(rez) });
  test('ARES ' + rez + ' → ' + ocek, a.stav === ocek, a);
}
let t0 = Date.now();
/* Pojistka testu: kdyby limit nefungoval, test nečeká donekonečna (mutace). */
const hlidka = (p, ms) => Promise.race([p, new Promise((res) => setTimeout(() => res({ stav: 'VISI' }), ms))]);
a = await hlidka(A.aresNacti(ICO1, { fetch: mf('pomaly'), timeoutMs: 200 }), 1500);
test('mock, který neodpoví → „vypadek“ po časovém limitu', a.stav === 'vypadek' && Date.now() - t0 < 1500, [a, Date.now() - t0]);
test('výchozí časový limit je 3 s, strop odpovědi 200 kB', A.ARES_TIMEOUT_MS === 3000 && A.ARES_ODPOVED_MAX === 200 * 1024);
a = await A.aresNacti(ICO3, { fetch: mf('ok') });
test('řídicí znaky z názvu pryč, HTML zůstane jen jako text (escapuje UI), neplatné DIČ prázdné',
  a.stav === 'ok' && !/[\u0000-\u001f]/.test(a.subjekt.nazev) && a.subjekt.dic === '', a);
test('cizí typy v odpovědi (objekt místo názvu) → nenalezeno, ne „[object Object]“',
  A.aresSubjektCisty({ ico: ICO1, obchodniJmeno: { a: 1 } }, ICO1) === null);
test('zaniklý subjekt se převezme se značkou', (A.aresSubjektCisty({ ico: ICO1, obchodniJmeno: 'Zaniklá', datumZaniku: '2020-01-01' }, ICO1) || {}).zanikla === true);
test('do sítě nic (modul)', venku.length === 0, venku);

/* ---------- příprava: účty, ceník, dealy ---------- */
const cA = await login(ADMIN_EMAIL, 'Docasne.Heslo.123');
await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
  slevy: { minMarze: 0, maxGlobalni: 0.3, stropy: {} }, poznamka: 'x' }, cA);
for (const [e, j] of [['obch.autor@priklad.cz', 'Autor Test'], ['obch.cizi@priklad.cz', 'Cizí Test']])
  await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: e, jmeno: j, role: 'Obchodník', heslo: 'Heslo12345x' }, cA);
const cAutor = await login('obch.autor@priklad.cz', 'Heslo12345x');
const cCizi = await login('obch.cizi@priklad.cz', 'Heslo12345x');
test('příprava: přihlášení tří účtů', !!(cA && cAutor && cCizi));

const pouzite = new Set();
const dealS = (pred) => {
  const d = D().dealy.find((x) => x.status === 'open' && x.org_id && x.person_id && /^CN-\d+ /.test(x.title) && !pouzite.has(x.org_id) && pred(x));
  if (d) pouzite.add(d.org_id);
  return d;
};
const D1 = dealS(() => true), D2 = dealS(() => true), D3 = dealS(() => true), D4 = dealS(() => true), D5 = dealS(() => true);
const D6 = dealS(() => true);
test('příprava: šest dealů s různými organizacemi', !!(D1 && D2 && D3 && D4 && D5 && D6));
const org = (d) => D().organizace.find((o) => o.id === d.org_id);
const nastavIco = (d, ico) => { org(d).custom_fields[HASH_IC] = Number(ico); };

/* Zakázka obchodníka uložená přes /api/zakazky (autor = obchodník). */
async function zalozRucne(cislo, uprav, cookie = cAutor) {
  const z = G.novaZakazka(); z.cislo = cislo; if (uprav) uprav(z);
  G.cenikDnesniProVariantu = () => ({ cenik: ZC.zkusebniCenik(), proj: { cenik: ZC.zkusebniCenikProj() } });
  const v = G.importZakazka(kopie(z));
  delete G.cenikDnesniProVariantu;
  const r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: v }, cookie);
  return r;
}
async function ulozJako(soubor, zmena, cookie) {
  const z = zakazka(soubor);
  const v = G.importZakazka(kopie(z)); zmena(v);
  return postJ(zakazky, 'http://x/api/zakazky', { zakazka: v, ocekavaneRazitko: G.uloRazitko(z) }, cookie);
}

/* ---------- 2. NAVÁZÁNÍ EXISTUJÍCÍ KALKULACE ---------- */
console.log('\n===== 2. NAVÁZÁNÍ EXISTUJÍCÍ KALKULACE =====\n');
const cn1 = D1.title.split(' ')[0];
nastavIco(D1, ICO1);
const r0 = await zalozRucne(cn1, (z) => { z.adresaObjednatele = 'Ručně psané sídlo 1, Vzorov'; z.nazevAkce = 'Ruční název'; });
test('obchodník uloží vlastní kalkulaci (200)', r0.status === 200 && !!r0.soubor, r0);
const S1 = r0.soubor;
n0 = ares.volani;
let r = await volej(D1.id);
let z1 = zakazka(S1);
test('webhook naváže existující kalkulaci (200, „aktualizovano“)', r.status === 200 && r.akce === 'aktualizovano' && r.soubor === S1, r);
test('pdVazbaWebhook: stav „ceka“, deal, číslo, ARES ok', z1.pdVazbaWebhook && z1.pdVazbaWebhook.stav === 'ceka'
  && z1.pdVazbaWebhook.deal === String(D1.id) && z1.pdVazbaWebhook.cislo === cn1 && z1.pdVazbaWebhook.ares === 'ok', z1.pdVazbaWebhook);
test('protokol: záznam pipedrive-webhook (deal, číslo, doplněná pole, ARES)', (z1.protokol || []).some((p) => p.kdo === W.PD_WEBHOOK_AUTOR
  && p.co.includes('Navázáno na deal ' + D1.id) && p.co.includes(cn1) && /doplněno: /.test(p.co) && /ARES/.test(p.co)), (z1.protokol || []).slice(-1));
test('… v protokolu ani ve vazbě nejsou kontakty (e-mail, telefon, jméno osoby)', !/@|\+420/.test(JSON.stringify([z1.protokol, z1.pdVazbaWebhook])));
test('firma z ARES: zákazník, IČO, DIČ', z1.objednatel === 'Zkušební Stavby a.s. (smyšlené)' && z1.ico === ICO1 && z1.dic === 'CZ' + ICO1, [z1.objednatel, z1.ico, z1.dic]);
test('kontakt z dealu', z1.kontakt.length > 0 && z1.kontakt !== 'Zkušební Stavby a.s. (smyšlené)', z1.kontakt);
test('ručně upravené pole (sídlo, název akce) se nepřepíše — rozdíl v odpovědi', z1.adresaObjednatele === 'Ručně psané sídlo 1, Vzorov'
  && z1.nazevAkce === 'Ruční název' && r.ponechano.includes('adresaObjednatele') && r.ponechano.includes('nazevAkce'), r.ponechano);
test('rozdíly ARES × Pipedrive (jen názvy polí): název a adresa organizace', r.aresRozdily.includes('nazev') && r.aresRozdily.includes('adresa')
  && JSON.stringify(z1.pdVazbaWebhook.aresRozdily) === JSON.stringify(r.aresRozdily), r.aresRozdily);
test('ARES volán jednou', ares.volani === n0 + 1, ares.volani - n0);
test('odkaz zapsán do dealu', D().dealy.find((d) => d.id === D1.id).custom_fields[HASH_ODKAZ] === r.odkaz);
const raz1 = z1.uloRazitko;
r = await volej(D1.id);
test('druhé doručení bez změny IČO: ARES se nevolá, „bezeZmeny“, razítko stejné', ares.volani === n0 + 1 && r.akce === 'bezeZmeny'
  && zakazka(S1).uloRazitko === raz1, [ares.volani - n0, r.akce]);

/* ---------- 3. POLE ZAPSANÉ WEBHOOKEM Z DEALU PŘEPÍŠE ARES ---------- */
console.log('\n===== 3. ZMĚNA IČO: Z DEALU → Z ARES =====\n');
nastavIco(D2, '1000');                       // neplatné IČO → ARES se nevolá, firma z dealu
n0 = ares.volani;
r = await volej(D2.id);
const S2 = r.soubor;
let z2 = zakazka(S2);
test('nová kalkulace z webhooku s neplatným IČO: 200, firma z dealu, žádný dotaz do ARES, varování',
  r.status === 200 && r.akce === 'zalozeno' && ares.volani === n0 && z2.objednatel === org(D2).name && r.ares === 'neplatne'
  && r.varovani.some((x) => /kontrolní číslicí/.test(x)), [r.status, r.ares, ares.volani - n0, r.varovani]);
test('kalkulace založená webhookem: vazba „webhook“ (nečeká na potvrzení)', z2.pdVazbaWebhook.stav === 'webhook', z2.pdVazbaWebhook);
nastavIco(D2, ICO2);
r = await volej(D2.id);
z2 = zakazka(S2);
test('změna IČO dealu → dotaz do ARES; zákazník dřív z dealu přepsán hodnotou z ARES',
  ares.volani === n0 + 1 && z2.objednatel === 'Druhá Zkušební s.r.o. (smyšlené)' && z2.ico === ICO2 && z2.adresaObjednatele && z2.dic === 'CZ' + ICO2
  && r.zmeneno.includes('objednatel'), [ares.volani - n0, z2.objednatel, r.zmeneno]);
org(D2).name = 'Přejmenovaná v Pipedrive';
r = await volej(D2.id);
test('… přejmenování organizace v Pipedrive firmu z ARES nepřepíše (ARES se nevolá)', zakazka(S2).objednatel === 'Druhá Zkušební s.r.o. (smyšlené)'
  && ares.volani === n0 + 1, [zakazka(S2).objednatel, ares.volani - n0]);

/* Revize K40c N2: vazba z doby před K40c (pdDealId bez pdVazbaWebhook) nečeká na „V pořádku“. */
const cn6 = D6.title.split(' ')[0];
nastavIco(D6, '1000');
const r6 = await zalozRucne(cn6);
{ const z6 = zakazka(r6.soubor); z6.pdDealId = String(D6.id); zapisZakazku(r6.soubor, z6); }
r = await volej(D6.id);
test('N2: stará vazba (pdDealId bez pdVazbaWebhook) dostane stav „webhook“, ne „ceka“', r.status === 200
  && zakazka(r6.soubor).pdVazbaWebhook.stav === 'webhook' && zakazka(r6.soubor).protokol.some((p) => /Aktualizace z dealu/.test(p.co)),
  [r.status, zakazka(r6.soubor).pdVazbaWebhook]);

/* ---------- 4. VÝPADKY ARES A ZMRAZENÁ HLAVIČKA ---------- */
console.log('\n===== 4. VÝPADKY ARES =====\n');
let k = 0;
for (const rez of ['404', '500', 'nejson', 'jineIco', 'velka', 'pomaly']) {
  const ico = icoS('92' + String(10000 + (++k)));
  nastavIco(D4, ico);
  ares.rezim = rez;
  n0 = ares.volani;
  t0 = Date.now();
  r = await hlidka(volej(D4.id), 8000);
  const ms = Date.now() - t0;
  if (r.stav === 'VISI') { test('ARES ' + rez + ': webhook nevisí (časový limit ARES)', false, ms); ares.rezim = 'ok'; break; }
  ares.rezim = 'ok';
  const z4 = zakazka(r.soubor);
  test('ARES ' + rez + ' → webhook 200 s varováním a firmou z dealu', r.status === 200 && ares.volani === n0 + 1
    && ['nenalezeno', 'vypadek'].includes(r.ares) && r.varovani.some((x) => /ARES/.test(x)) && z4.objednatel === org(D4).name
    && z4.pdVazbaWebhook.ares === r.ares, [r.status, r.ares, r.varovani, z4 && z4.objednatel]);
  if (rez === 'pomaly') test('… pomalý ARES: webhook doběhne do 3 s limitu + rezervy (< 6 s, limit funkce 10 s)', ms >= 2900 && ms < 6000, ms);
}
/* Revize K40c N1: po výpadku ARES se otisk IČO neukládá — další doručení se ptá znovu. */
{
  const icoV = icoS('9300001');
  ares.subjekty.set(icoV, subjekt(icoV, 'Po Výpadku a.s. (smyšlené)'));
  nastavIco(D4, icoV);
  ares.rezim = '500'; n0 = ares.volani;
  r = await volej(D4.id);
  ares.rezim = 'ok';
  test('N1: výpadek ARES → firma z dealu', r.status === 200 && r.ares === 'vypadek' && ares.volani === n0 + 1, [r.status, r.ares]);
  r = await volej(D4.id);
  test('N1: po výpadku se další doručení se stejným IČO zeptá ARES znovu a firmu převezme', ares.volani === n0 + 2 && r.ares === 'ok'
    && zakazka(r.soubor).objednatel === 'Po Výpadku a.s. (smyšlené)', [ares.volani - n0, r.ares, zakazka(r.soubor).objednatel]);
  r = await volej(D4.id);
  test('N1: … a po úspěchu už se se stejným IČO neptá', ares.volani === n0 + 2, ares.volani - n0);
}
/* Zmrazená hlavička: zamčená varianta → ARES se nevolá, hlavička beze změny. */
const z4 = zakazka(r.soubor);
z4.varianty[0].zamek = { zamceno: true, kdy: '2026-11-03T08:00:00.000Z', kdo: 'Obch Test', cislo: z4.cislo };
zapisZakazku(r.soubor, z4);
const hl4 = JSON.stringify([z4.objednatel, z4.ico, z4.dic, z4.adresaObjednatele]);
const zam4 = JSON.stringify(z4.varianty[0]);
nastavIco(D4, ICO1);
n0 = ares.volani;
r = await volej(D4.id);
test('zmrazená hlavička (zamčená varianta): žádný dotaz do ARES, hlavička i zamčená varianta beze změny',
  ares.volani === n0 && JSON.stringify([zakazka(r.soubor).objednatel, zakazka(r.soubor).ico, zakazka(r.soubor).dic, zakazka(r.soubor).adresaObjednatele]) === hl4
  && JSON.stringify(zakazka(r.soubor).varianty[0]) === zam4, [ares.volani - n0]);
test('hlavickaZmrazena v pdWebhookPouzij drží hlavičku i bez zamčené varianty', (() => {
  const zz = G.novaZakazka(); zz.objednatel = '';
  const zm = W.pdWebhookPouzij(zz, { strana: 'ock', cislo: 'CN-1', pole: { objednatel: 'X' }, terminPredani: '' }, '5', '', { hlavickaZmrazena: true });
  return zz.objednatel === '' && zm.zamceno === true;
})());

/* ---------- 5. V POŘÁDKU / VAZBA JE CHYBNÁ / ZRUŠIT VAZBU ---------- */
console.log('\n===== 5. AKCE NAD VAZBOU =====\n');
r = await vazba(S1, 'zrusit', cCizi);
test('„Zrušit vazbu“ cizí obchodník → 403', r.status === 403, r);
/* Podvržený autor v příchozích datech nepomůže (server bere autora z uložené verze). */
r = await ulozJako(S1, (v) => { v.autor = 'obch.cizi@priklad.cz'; v.poznamkaTest = 1; }, cCizi);
test('cizí obchodník uloží zakázku s podvrženým autorem — autor zůstane', zakazka(S1).autor === 'obch.autor@priklad.cz', [r.status, zakazka(S1).autor]);
r = await vazba(S1, 'zrusit', cCizi);
test('… a zrušit vazbu pořád nesmí (403)', r.status === 403, r);
r = await vazba(S1, 'chybna', cCizi);
z1 = zakazka(S1);
test('„Vazba je chybná“ cizím obchodníkem → 200, příznak nahlaseno z relace, protokol', r.status === 200
  && z1.pdVazbaWebhook.nahlaseno && z1.pdVazbaWebhook.nahlaseno.kdo === 'obch.cizi@priklad.cz' && z1.pdVazbaWebhook.stav === 'ceka'
  && z1.protokol.some((p) => /nahlásil jako chybnou/.test(p.co)), [r.status, z1.pdVazbaWebhook]);
{
  const pocet = zakazka(S1).protokol.length, raz = zakazka(S1).uloRazitko;
  const r2 = await vazba(S1, 'chybna', cCizi);
  test('N4: už nahlášenou vazbu nejde nahlásit znovu (409, protokol ani razítko beze změny)', r2.status === 409
    && zakazka(S1).protokol.length === pocet && zakazka(S1).uloRazitko === raz, r2);
}
const rejNahl = (JSON.parse(pamet.get('zakazky/_rejstrik')).zakazky || []).find((x) => x.soubor === S1);
test('… příznak je v rejstříku (Přehled cenových nabídek)', rejNahl && rejNahl.pdNahlaseno === true, rejNahl);
/* Podvržená pole vazby od klienta se ignorují. */
r = await ulozJako(S1, (v) => { v.pdVazbaWebhook = { deal: '1', stav: 'potvrzeno', kdy: '2026-01-01T00:00:00Z', cislo: 'X' }; v.pdDealyOdmitnute = ['777']; }, cAutor);
z1 = zakazka(S1);
test('podvržené pdVazbaWebhook a pdDealyOdmitnute od klienta: uložení 200, pole z uložené verze', r.status === 200
  && z1.pdVazbaWebhook.stav === 'ceka' && z1.pdVazbaWebhook.deal === String(D1.id) && !z1.pdDealyOdmitnute, [r.status, z1.pdVazbaWebhook, z1.pdDealyOdmitnute]);
r = await ulozJako(S1, (v) => { delete v.pdVazbaWebhook; }, cAutor);
test('… ani smazání vazby klientem neprojde', r.status === 200 && zakazka(S1).pdVazbaWebhook && zakazka(S1).pdVazbaWebhook.stav === 'ceka');
/* Zamčená varianta + zrušení: varianta beze změny. */
z1 = zakazka(S1);
const v2 = kopie(z1.varianty[0]); v2.id = z1.varianty[0].id + 'z'; v2.nazev = 'Zamčená'; v2.ridici = false; v2.pripona = 2;
v2.zamek = { zamceno: true, kdy: '2026-11-03T08:00:00.000Z', kdo: 'Autor Test', cislo: z1.cislo };
z1.varianty.push(v2); zapisZakazku(S1, z1);
const zamS1 = JSON.stringify(zakazka(S1).varianty[1]);
const hlS1 = JSON.stringify([z1.objednatel, z1.ico, z1.dic, z1.kontakt, z1.adresaObjednatele]);
const pPred = pdPatche('/deals/' + D1.id);
r = await vazba(S1, 'zrusit', cAutor, { razitko: 'jine-razitko' });
test('zrušení se starým razítkem → 409', r.status === 409, r);
r = await vazba(S1, 'zrusit', cAutor);
z1 = zakazka(S1);
test('„Zrušit vazbu“ autorem → 200; pdDealId, pdStav a pdZadani pryč', r.status === 200 && !z1.pdDealId && !z1.pdStav && !z1.pdZadani, [r.status, r.chyba]);
test('… vazba „zruseno“, deal v pdDealyOdmitnute', z1.pdVazbaWebhook.stav === 'zruseno' && z1.pdDealyOdmitnute.includes(String(D1.id)), [z1.pdVazbaWebhook, z1.pdDealyOdmitnute]);
test('… doplněné údaje zůstaly (nevracejí se)', JSON.stringify([z1.objednatel, z1.ico, z1.dic, z1.kontakt, z1.adresaObjednatele]) === hlS1);
test('… index pd_webhook/deal:<id> smazán', !pamet.has('pd_webhook/deal:' + D1.id));
test('… náš odkaz v dealu smazán (jeden PATCH)', r.odkazVDealu === 'smazano' && pdPatche('/deals/' + D1.id) === pPred + 1
  && !D().dealy.find((d) => d.id === D1.id).custom_fields[HASH_ODKAZ], [r.odkazVDealu, pdPatche('/deals/' + D1.id) - pPred]);
test('… protokol se seznamem polí, která zůstala', z1.protokol.some((p) => /zrušil/.test(p.co) && /zůstaly: /.test(p.co) && /zákazník/.test(p.co)));
test('… zamčená varianta beze změny', JSON.stringify(z1.varianty[1]) === zamS1);
const rejS1 = (JSON.parse(pamet.get('zakazky/_rejstrik')).zakazky || []).find((x) => x.soubor === S1);
test('… rejstřík přepsán (bez příznaku nahlášení)', rejS1 && !rejS1.pdNahlaseno && rejS1.upravil !== undefined ? true : !!rejS1 && !rejS1.pdNahlaseno, rejS1);
const razZ = z1.uloRazitko; n0 = ares.volani; const pp = pdPatche();
r = await volej(D1.id);
test('další webhook po zrušení → 409, žádný zápis, dotaz do ARES ani PATCH', r.status === 409 && zakazka(S1).uloRazitko === razZ
  && ares.volani === n0 && pdPatche() === pp && !pamet.has('pd_webhook/deal:' + D1.id), [r.status, r.chyba]);
r = await vazba(S1, 'zrusit', cAutor);
test('zrušená vazba se nedá zrušit znovu (409)', r.status === 409);

/* Odkaz v dealu se maže, jen když je náš; administrátor smí zrušit u webhookové zakázky. */
r = await vazba(S2, 'zrusit', cAutor);
test('webhooková zakázka: autor-obchodník vazbu nezruší (403 — jen administrátor)', r.status === 403, r);
D().dealy.find((d) => d.id === D2.id).custom_fields[HASH_ODKAZ] = 'https://jinde.example/?zakazka=cizi.json';
const pp2 = pdPatche('/deals/' + D2.id);
r = await vazba(S2, 'zrusit', cA);
test('administrátor zruší (200); cizí odkaz v dealu zůstane, žádný PATCH', r.status === 200 && r.odkazVDealu === 'cizi'
  && D().dealy.find((d) => d.id === D2.id).custom_fields[HASH_ODKAZ] === 'https://jinde.example/?zakazka=cizi.json' && pdPatche('/deals/' + D2.id) === pp2, r);

/* V pořádku: nová vazba existující kalkulace. */
const cn5 = D5.title.split(' ')[0];
nastavIco(D5, ICO1);
const r5 = await zalozRucne(cn5);
const S5 = r5.soubor;
await volej(D5.id);
r = await vazba(S5, 'potvrdit', cCizi);
test('„V pořádku“ (kdokoli přihlášený) → 200, stav „potvrzeno“, protokol', r.status === 200 && zakazka(S5).pdVazbaWebhook.stav === 'potvrzeno'
  && zakazka(S5).protokol.some((p) => /potvrdil/.test(p.co)), [r.status, zakazka(S5).pdVazbaWebhook]);
r = await vazba(S5, 'potvrdit', cCizi);
test('… podruhé 409 (není co potvrzovat)', r.status === 409);
r = await volej(D5.id);
test('webhook po potvrzení vazbu nevrátí do „ceka“', zakazka(S5).pdVazbaWebhook.stav === 'potvrzeno', zakazka(S5).pdVazbaWebhook);
r = await vazba(S5, 'neco', cAutor);
test('neznámá akce → 400', r.status === 400);
r = await vazba('../z/x', 'potvrdit', cAutor);
test('jméno zakázky s cestou → 400', r.status === 400);

/* ---------- 6. ZMĚNA DEALU RUČNĚ (C4) ---------- */
console.log('\n===== 6. ZMĚNA DEALU RUČNĚ =====\n');
const rv = await zalozRucne('CN-88001');
r = await ulozJako(rv.soubor, (v) => { v.pdDealId = '4711'; }, cAutor);
test('autor změní deal své zakázky (200)', r.status === 200 && zakazka(rv.soubor).pdDealId === '4711', r);
r = await ulozJako(rv.soubor, (v) => { v.pdDealId = '4712'; }, cCizi);
test('cizí obchodník deal nezmění (403)', r.status === 403 && /deal id/.test(r.chyba || ''), r);
r = await ulozJako(S2, (v) => { v.pdDealId = '4713'; }, cAutor);
test('u zakázky založené webhookem obchodník deal nezmění (403)', r.status === 403, r);
r = await ulozJako(S2, (v) => { v.pdDealId = '4714'; }, cA);
test('… administrátor ano (200)', r.status === 200, r);

/* Revize K40c N5: zakázka bez uloženého autora — deal, vazbu a firmu mění jen administrátor. */
{
  const bez = (soubor) => { const z = zakazka(soubor); const a = z.autor; z.autor = ''; zapisZakazku(soubor, z); return a; };
  const vrat = (soubor, a) => { const z = zakazka(soubor); z.autor = a; zapisZakazku(soubor, z); };
  const zrv = bez(rv.soubor);
  r = await ulozJako(rv.soubor, (v) => { v.pdDealId = '4721'; }, cAutor);
  test('N5: zakázka bez autora — obchodník deal nezmění (403)', r.status === 403, r);
  vrat(rv.soubor, zrv);
  const z5 = bez(S5);
  r = await vazba(S5, 'zrusit', cAutor);
  test('N5: zakázka bez autora — obchodník vazbu nezruší (403)', r.status === 403, r);
  vrat(S5, z5);
}

/* ---------- 7. OPRAVA ORGANIZACE ---------- */
console.log('\n===== 7. OPRAVIT FIRMU V PIPEDRIVE =====\n');
const cn3 = D3.title.split(' ')[0];
nastavIco(D3, ICO1);
const r3 = await zalozRucne(cn3);
const S3 = r3.soubor;
r = await volej(D3.id);
test('příprava: kalkulace autora navázaná na deal s IČO ' + ICO1, r.status === 200 && zakazka(S3).ico === ICO1, [r.status, zakazka(S3).ico]);
const orgPred = kopie(org(D3));
{
  const zz = zakazka(S3); const a = zz.autor; zz.autor = ''; zapisZakazku(S3, zz);
  const rb = await opravOrg(S3, 'nahled', cAutor);
  test('N5: zakázka bez autora — obchodník firmu neopraví (403)', rb.status === 403, rb);
  const zz2 = zakazka(S3); zz2.autor = a; zapisZakazku(S3, zz2);
}
n0 = ares.volani; let pO = pdPatche('/organizations/');
r = await opravOrg(S3, 'nahled', cCizi);
test('náhled cizím obchodníkem → 403', r.status === 403, r);
pamet.set('program/zobrazeni', JSON.stringify({ matice: { 'crm.pipedrive': { 'Obchodník': false } } }));
r = await opravOrg(S3, 'nahled', cAutor);
test('autor bez práva Pipedrive (matice B80) → 403', r.status === 403, r);
pamet.delete('program/zobrazeni');
test('… a do ARES ani Pipedrive se nešlo', ares.volani === n0 && pdPatche('/organizations/') === pO);
r = await opravOrg(S3, 'nahled', cAutor);
test('náhled autorem: rozdíly název a adresa, DIČ chybí v účtu → věta v dialogu', r.status === 200
  && r.rozdily.map((x) => x.klic).join() === 'nazev,adresa' && r.dicChybi === true && /DIČ se do Pipedrive nezapíše/.test(r.dicVeta)
  && r.organizace === D3.org_id && pdPatche('/organizations/') === pO, r);
r = await opravOrg(S3, 'zapis', cAutor, { organizace: org(D2).id, pole: ['nazev'] });
test('zápis s organizací, která nepatří dealu zakázky → 403, žádný PATCH', r.status === 403 && pdPatche('/organizations/') === pO, r);
r = await opravOrg(S3, 'zapis', cAutor, { organizace: D3.org_id, pole: ['nazev'], nove: { nazev: 'Podvrh klienta' }, rozdily: [{ klic: 'adresa', nove: 'Podvrh' }] });
test('zápis jen potvrzeného pole (název) z ARES — hodnoty od klienta se nepoužijí', r.status === 200 && r.zapsano.join() === 'nazev'
  && org(D3).name === 'Zkušební Stavby a.s. (smyšlené)' && JSON.stringify(org(D3).address) === JSON.stringify(orgPred.address)
  && pdPatche('/organizations/') === pO + 1, [r, org(D3).name]);
test('… protokol zakázky: kdo a která pole', zakazka(S3).protokol.some((p) => /Opravil organizaci/.test(p.co) && /Název organizace/.test(p.co)));
test('… rozdíly ve vazbě zúžené na zbytek', JSON.stringify(zakazka(S3).pdVazbaWebhook.aresRozdily) === '["adresa"]', zakazka(S3).pdVazbaWebhook.aresRozdily);
r = await opravOrg(S3, 'zapis', cAutor, { organizace: D3.org_id, pole: ['nazev'] });
test('druhý zápis bez rozdílů nic neposílá', r.status === 200 && r.zapsano.length === 0 && pdPatche('/organizations/') === pO + 1, r);
/* Účet s polem DIČ: zapíše se i DIČ. */
D().pole.organizace.push({ field_code: pdHashZNazvu('DIČ'), field_name: 'DIČ', field_type: 'varchar', is_custom_field: true, is_writable: true, options: null });
await pdPoleMapa(true);
r = await opravOrg(S3, 'nahled', cA);
test('účet s polem DIČ: náhled administrátora nabídne adresu a DIČ', r.status === 200 && r.rozdily.map((x) => x.klic).join() === 'adresa,dic' && !r.dicChybi, r);
r = await opravOrg(S3, 'zapis', cA, { organizace: D3.org_id, pole: ['adresa', 'dic', 'ico'] });
test('… zápis adresy a DIČ (IČ organizace se nikdy nemění)', r.status === 200 && r.zapsano.join() === 'adresa,dic'
  && org(D3).custom_fields[pdHashZNazvu('DIČ')] === 'CZ' + ICO1 && org(D3).custom_fields[HASH_IC] === Number(ICO1)
  && /Zkušební/.test(org(D3).address.value), [r, org(D3)]);
/* Shoda IČO organizace a hlavičky. */
const zS3 = zakazka(S3);
const shoda = async (popis, upravHl, upravOrg, ocek = 409) => {
  const z = zakazka(S3); const zal = kopie(z); upravHl(z); zapisZakazku(S3, z);
  const icoPred = org(D3).custom_fields[HASH_IC]; if (upravOrg) upravOrg(org(D3));
  const n = ares.volani, p = pdPatche('/organizations/');
  const a1 = await opravOrg(S3, 'nahled', cA);
  const a2 = await opravOrg(S3, 'zapis', cA, { organizace: D3.org_id, pole: ['nazev', 'adresa', 'dic'], ico: ICO1, zakazka: { ico: ICO1 } });
  test(popis, a1.status === ocek && a2.status === ocek && (ocek !== 409 || (ares.volani === n && pdPatche('/organizations/') === p)),
    [a1.status, a2.status, a1.chyba, ares.volani - n, pdPatche('/organizations/') - p]);
  zapisZakazku(S3, zal); org(D3).custom_fields[HASH_IC] = icoPred;
};
await shoda('IČO organizace ≠ IČO hlavičky → náhled i zápis 409, žádný ARES ani PATCH (podvržené IČO v požadavku nepomůže)', (z) => { z.ico = ICO2; });
await shoda('hlavička bez IČO → 409', (z) => { z.ico = ''; });
await shoda('organizace bez IČ → 409', () => {}, (o) => { delete o.custom_fields[HASH_IC]; });
await shoda('neplatná kontrolní číslice v hlavičce → 409', (z) => { z.ico = '12345678'; });
ares.subjekty.set(ICO0, subjekt(ICO0, 'Zkušební Stavby a.s. (smyšlené)'));
await shoda('IČO lišící se jen úvodní nulou a mezerami → projde (200)', (z) => { z.ico = ' ' + ICO0.slice(0, 3) + ' ' + ICO0.slice(3) + ' '; },
  (o) => { o.custom_fields[HASH_IC] = Number(ICO0); }, 200);
test('zakázka po testech shody IČO beze změny', JSON.stringify(zakazka(S3).ico) === JSON.stringify(zS3.ico));
r = await opravOrg(S1, 'nahled', cAutor);
test('zakázka bez dealu (zrušená vazba) → 409', r.status === 409, r);

/* ---------- 7b. ODMÍTNUTÝ DEAL ZNOVU RUČNĚ (revize K40c N7) ---------- */
console.log('\n===== 7b. ODMÍTNUTÝ DEAL ZNOVU RUČNĚ =====\n');
r = await ulozJako(S1, (v) => { v.pdDealId = String(D1.id); }, cCizi);
test('N7: cizí obchodník odmítnutý deal znovu nezadá (403), seznam beze změny', r.status === 403
  && zakazka(S1).pdDealyOdmitnute.includes(String(D1.id)), r);
r = await ulozJako(S1, (v) => { v.pdDealId = String(D1.id); }, cAutor);
test('N7: autor ručně znovu zadá odmítnutý deal → 200 a deal vypadne ze seznamu odmítnutých', r.status === 200
  && zakazka(S1).pdDealId === String(D1.id) && !(zakazka(S1).pdDealyOdmitnute || []).includes(String(D1.id)), [r.status, zakazka(S1).pdDealyOdmitnute]);
r = await volej(D1.id);
test('N7: … a webhook s tímto dealem zase projde (200)', r.status === 200 && r.soubor === S1, r);

/* ---------- 8. ODPOVĚDI ---------- */
console.log('\n===== 8. ODPOVĚDI =====\n');
const vse = odpovedi.join('\n');
test('v odpovědích není e-mail kontaktu ani telefon', !/[A-Za-z0-9._%+-]+@(?!priklad\.cz)[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(vse) && !/\+420 000/.test(vse));
test('… ani klíč webhooku a hashe polí', !vse.includes(KLIC) && !vse.includes(HASH_ODKAZ) && !vse.includes(HASH_IC));
test('do sítě za celý běh nic', venku.length === 0, venku);
console.log('\n' + ok + ' OK, ' + fail + ' FAIL' + (fail ? '\nSelhalo:\n  ' + selhalo.join('\n  ') : ''));
process.exit(fail ? 1 : 0);
