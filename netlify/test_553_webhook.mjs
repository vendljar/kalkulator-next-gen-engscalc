/* ============================================================
 * #553 — WEBHOOK „VYGENEROVAT NABÍDKU“ Z PIPEDRIVE (varianta A, J. V. 3. 11. 2026)
 *
 * Hlídá POST /api/pd/webhook (netlify/functions/pd_webhook.mjs) proti
 * simulátoru Pipedrive (PIPEDRIVE_SIMULATOR=1, nic nejde do sítě):
 *   1. klíč: bez proměnné 503, bez klíče / špatný klíč / klíč v adrese 401 —
 *      a do Pipedrive se přitom nesáhne; Bearer i Basic projdou;
 *   2. tělo: neplatný JSON a neplatné ID dealu → 400 bez dotazu do PD;
 *   3. založení kalkulace se zadáním z dealu (bez ceníku — ceník doplní
 *      prohlížeč), odkaz do dealu jediným PATCH;
 *   4. opakované doručení: počet zakázek, razítko i deal beze změny;
 *   5. cena a další pole v těle se ignorují;
 *   6. aktualizace nezamčené varianty a hlavičky; co obchodník změnil, zůstane;
 *   7. zamčená varianta (i hlavička zakázky se zamčenou variantou) nedotčená;
 *   8. vlastník dealu podle CN (409), deal bez čísla (422), neznámý (404),
 *      projekce do hlavičky PROJ;
 *   9. strop volání (429 bez dotazu do PD);
 *  10. žádný e-mail, telefon ani token v odpovědi;
 *  11. obchodník kalkulaci založenou webhookem otevře a uloží (200).
 * Spuštění: node netlify/test_553_webhook.mjs
 * ============================================================ */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
for (const k of ['PIPEDRIVE_SIMULATOR_SCENAR', 'PIPEDRIVE_TOKEN', 'PIPEDRIVE_DOMENA', 'PROSTREDI', 'PIPEDRIVE_WEBHOOK_KLIC',
  'NETLIFY', 'SITE_ID', 'SITE_NAME', 'DEPLOY_ID', 'CONTEXT', 'BRANCH', 'HEAD', 'URL', 'DEPLOY_URL', 'DEPLOY_PRIME_URL']) delete process.env[k];
process.env.PIPEDRIVE_SIMULATOR = '1';

const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
    .map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
const venku = [];
globalThis.fetch = async (url) => { venku.push(String(url)); throw new Error('síť je v testu zakázaná: ' + url); };

/* ARES (K40c #581): webhook se ptá ARES ze serveru. Tady ARES „subjekt
 * nezná" (404) — firma zůstane z dealu jako před K40c; ARES samotný hlídá
 * netlify/test_k40c_webhook.mjs. Do sítě se nesmí nic (bod „do sítě nic"). */
const aresDotazy = [];
(await import('./lib/ares_server.mjs')).ARES_SIT.fetch = async (url) => { aresDotazy.push(String(url)); return new Response('{}', { status: 404 }); };
const { default: webhook } = await import('./functions/pd_webhook.mjs');
const { default: prihlaseni } = await import('./functions/prihlaseni.mjs');
const { default: program } = await import('./functions/program.mjs');
const { default: zakazky } = await import('./functions/zakazky.mjs');
const { default: uzivatele } = await import('./functions/uzivatele.mjs');
const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');
const SIM = await import('./lib/pipedrive_simulator.mjs');
const W = await import('./lib/pd_webhook.mjs');
const { pdHashZNazvu } = await import('./lib/pd_mapa.mjs');
const { jadro } = await import('./lib/jadro.mjs');
await jadro();
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
const ZC = require('../src/zkusebni_cenik.js');
const G = globalThis;

let ok = 0, fail = 0; const selhalo = [];
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; selhalo.push(n); console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info).slice(0, 600))); }
};
const kopie = (x) => JSON.parse(JSON.stringify(x));
const KLIC = 'kng-test-webhook-klic-0123456789abcdefghijklmnop';
const odpovedi = [];   // všechny texty odpovědí webhooku (bod 10)
async function volej(telo, hlavicky = { 'x-kalkulator-klic': KLIC }, url = 'https://testweb.example/api/pd/webhook', metoda = 'POST') {
  const r = await webhook(new Request(url, { method: metoda, headers: { 'content-type': 'application/json', ...hlavicky },
    body: metoda === 'GET' ? undefined : (typeof telo === 'string' ? telo : JSON.stringify(telo)) }));
  const text = await r.text();
  odpovedi.push(text);
  let j = {}; try { j = JSON.parse(text); } catch (e) { j = {}; }
  return { status: r.status, ...j };
}
const pdPozadavky = () => SIM.pdSimStav().pozadavky.length;
const pdPatche = () => SIM.pdSimStav().pozadavky.filter((x) => x.startsWith('PATCH')).length;
const zakazkyKlice = () => [...pamet.keys()].filter((k) => k.startsWith('zakazky/z/'));
const zakazka = (soubor) => JSON.parse(pamet.get('zakazky/z/' + soubor) || 'null');
const zapisZakazku = (soubor, z) => pamet.set('zakazky/z/' + soubor, JSON.stringify(z));
const D = () => SIM.pdSimStav().data;
const H = (nazev) => pdHashZNazvu(nazev);
const HASH_CN = H('Číslo nabídky (CN)'), HASH_ODKAZ = H('Odkaz na kalkulaci'), HASH_ADRESA = H('Adresa realizace'),
  HASH_TERMIN = H('Předpokládané datum ukončení realizace');

/* Vybrané dealy simulátoru: otevřený s CN v názvu, organizací a osobou. */
const deal = (pred) => D().dealy.find((d) => d.status === 'open' && d.org_id && d.person_id && pred(d));
const D1 = deal((d) => /^CN-\d+ /.test(d.title));
const D2 = deal((d) => /^CN-\d+ /.test(d.title) && d.id !== D1.id);
const D3 = deal((d) => /^CN-\d+ /.test(d.title) && ![D1.id, D2.id].includes(d.id));
const DPROJ = deal((d) => /^OVP-CN-\d+ /.test(d.title));
const DBEZ = D().dealy.find((d) => d.status === 'open' && /^Poptávka /.test(d.title));
test('příprava: v simulátoru jsou vhodné dealy', !!(D1 && D2 && D3 && DPROJ && DBEZ), [D1, D2, D3, DPROJ, DBEZ].map((d) => d && d.id));
const org = (d) => D().organizace.find((o) => o.id === d.org_id);

/* ---------- 1. KLÍČ ---------- */
console.log('\n===== KLÍČ =====\n');
SIM.pdSimReset();
let r = await volej({ dealId: D1.id });
test('bez proměnné PIPEDRIVE_WEBHOOK_KLIC → 503, bez dotazu do PD', r.status === 503 && pdPozadavky() === 0, r);
process.env.PIPEDRIVE_WEBHOOK_KLIC = 'kratky-klic';
r = await volej({ dealId: D1.id }, { 'x-kalkulator-klic': 'kratky-klic' });
test('klíč kratší než 32 znaků = nenastavený → 503', r.status === 503 && pdPozadavky() === 0, r);
process.env.PIPEDRIVE_WEBHOOK_KLIC = KLIC;
r = await volej({ dealId: D1.id }, {});
test('bez klíče → 401, do Pipedrive se nesáhne', r.status === 401 && pdPozadavky() === 0, r);
r = await volej({ dealId: D1.id }, { 'x-kalkulator-klic': KLIC.slice(0, -1) + 'X' });
test('špatný klíč (liší se posledním znakem) → 401, bez dotazu do PD', r.status === 401 && pdPozadavky() === 0, r);
r = await volej({ dealId: D1.id }, {}, 'https://testweb.example/api/pd/webhook?klic=' + KLIC);
test('klíč v adrese se nepřijímá → 401', r.status === 401 && pdPozadavky() === 0, r);
r = await volej({ dealId: D1.id }, { authorization: 'Bearer ' + KLIC + 'x' });
test('špatný Bearer → 401', r.status === 401 && pdPozadavky() === 0, r);
r = await volej(null, { 'x-kalkulator-klic': KLIC }, undefined, 'GET');
test('GET → 405', r.status === 405);
test('401 nesnědl strop volání (počítadlo nevzniklo)', !pamet.has('pd_cache/strop:webhook:' + W.PD_WEBHOOK_AUTOR));

/* ---------- 2. TĚLO ---------- */
console.log('\n===== TĚLO =====\n');
for (const [popis, telo] of [['není JSON', '{dealId:'], ['prázdné', ''], ['bez dealId', { deal: 5 }],
  ['dealId text', { dealId: 'abc' }], ['záporné', { dealId: -1 }], ['desetinné', { dealId: 1.5 }], ['nula', { dealId: 0 }],
  ['přes int32', { dealId: 2147483648 }], ['objekt', { dealId: { toString: 1 } }], ['pole', [D1.id]], ['1e3', { dealId: '1e3' }]]) {
  r = await volej(telo);
  test('neplatné tělo (' + popis + ') → 400, bez dotazu do PD', r.status === 400 && pdPozadavky() === 0, r);
}
r = await volej('x'.repeat(W.PD_WEBHOOK_TELO_MAX + 10));
test('příliš velké tělo → 413', r.status === 413 && pdPozadavky() === 0, r);
test('pdWebhookDealId: dealId, deal_id i obecný webhook v2', W.pdWebhookDealId({ dealId: '12' }) === '12'
  && W.pdWebhookDealId({ deal_id: 13 }) === '13' && W.pdWebhookDealId({ meta: { entity: 'deal' }, data: { id: 14 } }) === '14'
  && W.pdWebhookDealId({ meta: { entity: 'person' }, data: { id: 14 } }) === null);

/* ---------- 3. ZALOŽENÍ ---------- */
console.log('\n===== ZALOŽENÍ KALKULACE =====\n');
const pred = zakazkyKlice().length;
r = await volej({ dealId: D1.id });
test('platný klíč a deal → 200, akce „zalozeno"', r.status === 200 && r.ok === true && r.akce === 'zalozeno', r);
const S1 = r.soubor;
const z1 = zakazka(S1);
test('zakázka v databázi, navázaná na deal (pdDealId)', !!z1 && z1.pdDealId === String(D1.id) && zakazkyKlice().length === pred + 1, z1 && z1.pdDealId);
test('číslo nabídky z názvu dealu (CN-…)', z1 && z1.cislo === D1.title.split(' ')[0], z1 && z1.cislo);
test('název akce, zákazník (organizace dealu), IČO a kontakt z dealu',
  z1 && z1.nazevAkce === D1.title.split(' ').slice(1).join(' ') && z1.objednatel === org(D1).name
  && /^\d{8}$/.test(z1.ico) && z1.kontakt.length > 0, z1 && [z1.nazevAkce, z1.objednatel, z1.ico]);
test('adresa realizace z dealu', z1 && z1.adresa === String(D1.custom_fields[HASH_ADRESA] || ''), z1 && z1.adresa);
test('nová kalkulace je bez ceníku (doplní ho prohlížeč z platného)', z1 && z1.cenikyVynechany === true
  && z1.varianty.length === 1 && !z1.varianty[0].data.cenik && !!z1.varianty[0].data.cenikVynechan
  && z1.varianty[0].data.cenikVynechan.rozdil.length === 0);
test('autor a razítko: webhook, ne přihlášený účet', z1 && z1.autor === W.PD_WEBHOOK_AUTOR && z1.upravil === W.PD_WEBHOOK_AUTOR && !!z1.uloRazitko);
test('otisky zadání bez hodnot (16 hex)', z1 && z1.pdZadani && z1.pdZadani.deal === String(D1.id)
  && Object.values(z1.pdZadani.otisk).every((x) => /^[0-9a-f]{16}$/.test(x))
  && !JSON.stringify(z1.pdZadani).includes(org(D1).name));
const rej = JSON.parse(pamet.get('zakazky/_rejstrik'));
test('zakázka je v rejstříku', rej.zakazky.some((x) => x.soubor === S1 && x.cislo === z1.cislo), rej.zakazky.map((x) => x.soubor));
test('odkaz na kalkulaci: <web>/?zakazka=<soubor>', r.odkaz === 'https://testweb.example/?zakazka=' + encodeURIComponent(S1), r.odkaz);
test('odkaz zapsán do dealu jedním PATCH (jen pole odkazu)', r.odkazDoDealu === 'zapsano' && pdPatche() === 1
  && D().dealy.find((d) => d.id === D1.id).custom_fields[HASH_ODKAZ] === r.odkaz, [r.odkazDoDealu, pdPatche()]);
test('do sítě nic', venku.length === 0, venku);
process.env.URL = 'https://testengscalc.example';
test('odkaz bere web z proměnné URL', W.pdWebhookOdkaz('a.json', new Request('https://jinde.example/x')) === 'https://testengscalc.example/?zakazka=a.json');
delete process.env.URL;

/* ---------- 4. OPAKOVANÉ DORUČENÍ ---------- */
console.log('\n===== OPAKOVANÉ DORUČENÍ =====\n');
const razitko1 = z1.uloRazitko, pocet1 = zakazkyKlice().length, patch1 = pdPatche();
for (let i = 0; i < 3; i++) r = await volej({ dealId: D1.id });
test('3× totéž → akce „bezeZmeny", stejný soubor', r.status === 200 && r.akce === 'bezeZmeny' && r.soubor === S1, r);
test('počet zakázek beze změny', zakazkyKlice().length === pocet1);
test('razítko zakázky beze změny (otevřené okno obchodníka nekoliduje)', zakazka(S1).uloRazitko === razitko1);
test('odkaz v dealu už je → žádný další PATCH (update_time se neposune)', pdPatche() === patch1 && r.odkazDoDealu === 'beze-zmeny', [pdPatche(), r.odkazDoDealu]);
test('deal_id v jiném tvaru (text) → tatáž kalkulace', (await volej({ deal_id: String(D1.id) })).soubor === S1);

/* ---------- 5. CENA A DALŠÍ POLE V TĚLE ---------- */
console.log('\n===== CENA A DALŠÍ POLE V TĚLE =====\n');
const podvrh = { dealId: D2.id, value: 987654321, cena: 123456789, currency: 'EUR', title: 'CN-777 Podvrženo',
  nazevAkce: 'Podvržená akce', adresa: 'Podvržená 1', cislo: 'CN-666', custom_fields: { [HASH_CN]: 'CN-555' },
  zakazka: { varianty: [] }, pdDealId: 1 };
r = await volej(podvrh);
const z2 = zakazka(r.soubor);
const t2 = JSON.stringify(z2);
test('podvržená pole těla se ignorují: číslo, název a adresa z dealu', r.status === 200 && z2.cislo === D2.title.split(' ')[0]
  && z2.nazevAkce !== 'Podvržená akce' && z2.adresa !== 'Podvržená 1' && z2.pdDealId === String(D2.id), [r.status, z2 && z2.cislo]);
test('cena z těla ani z CRM se do kalkulace nedostane', !t2.includes('987654321') && !t2.includes('123456789')
  && !t2.includes(String(D2.value)) && !t2.includes('EUR'));

/* ---------- 6. AKTUALIZACE ---------- */
console.log('\n===== AKTUALIZACE NEZAMČENÉ VARIANTY =====\n');
const d1 = D().dealy.find((d) => d.id === D1.id);
d1.custom_fields[HASH_ADRESA] = 'Nová Zkušební 99, Zkušebnice';
d1.custom_fields[HASH_TERMIN] = '2027-03-15';
r = await volej({ dealId: D1.id });
let z = zakazka(S1);
test('změněná adresa dealu → „aktualizovano", adresa přepsána', r.akce === 'aktualizovano' && z.adresa === 'Nová Zkušební 99, Zkušebnice'
  && r.zmeneno.includes('adresa'), r);
test('konečné předání díla v krycím listu nezamčené varianty', z.varianty[0].data.kryci.hodnoty.terminPredani === '2027-03-15'
  && r.zmeneno.includes('terminPredani'));
test('razítko se změnilo, počet zakázek ne', z.uloRazitko !== razitko1 && zakazkyKlice().length === pocet1 + 1);
/* Obchodník si název akce a termín v kalkulaci přepsal → webhook je nepřepíše. */
z.nazevAkce = 'Vlastní název obchodníka'; z.varianty[0].data.kryci.hodnoty.terminPredani = '2027-06-30';
zapisZakazku(S1, z);
d1.title = d1.title.split(' ')[0] + ' Přejmenovaná akce'; d1.custom_fields[HASH_TERMIN] = '2027-04-01';
d1.custom_fields[HASH_ADRESA] = 'Ještě novější 7, Zkušebnice';
r = await volej({ dealId: D1.id });
z = zakazka(S1);
test('ruční změna obchodníka zůstane (název akce, termín) — hlášeno jen názvem pole',
  z.nazevAkce === 'Vlastní název obchodníka' && z.varianty[0].data.kryci.hodnoty.terminPredani === '2027-06-30'
  && r.ponechano.includes('nazevAkce') && r.ponechano.includes('terminPredani'), r);
test('… a pole bez ruční změny se dál aktualizuje', z.adresa === 'Ještě novější 7, Zkušebnice');
/* Prázdné pole obchodník smazal → webhook ho zase vyplní. */
z.nazevAkce = ''; zapisZakazku(S1, z);
r = await volej({ dealId: D1.id });
test('prázdné pole se doplní z dealu', zakazka(S1).nazevAkce === 'Přejmenovaná akce' && r.zmeneno.includes('nazevAkce'), zakazka(S1).nazevAkce);

/* ---------- 7. ZAMČENÁ VARIANTA ---------- */
console.log('\n===== ZAMČENÁ VARIANTA =====\n');
z = zakazka(S1);
const v2 = kopie(z.varianty[0]); v2.id = z.varianty[0].id + 'b'; v2.nazev = 'Varianta 2'; v2.ridici = false; v2.pripona = 2;
v2.data.kryci.hodnoty.terminPredani = '';
z.varianty[0].zamek = { zamceno: true, kdy: '2026-11-03T08:00:00.000Z', kdo: 'Obch Test <obch@priklad.cz>', cislo: z.cislo };
z.varianty.push(v2);
zapisZakazku(S1, z);
const zamcenaPred = JSON.stringify(zakazka(S1).varianty[0]);
const hlavickaPred = JSON.stringify([z.adresa, z.objednatel, z.nazevAkce, z.kontakt]);
d1.custom_fields[HASH_ADRESA] = 'Po odeslání 1, Zkušebnice'; d1.custom_fields[HASH_TERMIN] = '2027-09-09';
r = await volej({ dealId: D1.id });
z = zakazka(S1);
test('zakázka se zamčenou variantou: odpověď „zamceno"', r.status === 200 && r.zamceno === true, r);
test('zamčená varianta bajt po bajtu beze změny', JSON.stringify(z.varianty[0]) === zamcenaPred);
test('hlavička zakázky se zamčenou variantou beze změny', JSON.stringify([z.adresa, z.objednatel, z.nazevAkce, z.kontakt]) === hlavickaPred);
test('nezamčená varianta 2 dostala termín z dealu', z.varianty[1].data.kryci.hodnoty.terminPredani === '2027-09-09');
/* Nejtěsnější případ: zamčená varianta nese PRÁVĚ tu hodnotu, kterou tam dal
 * minulý webhook (otisk sedí, u nezamčené varianty by se tedy přepsala) —
 * zámek ji přesto musí uchránit. */
z = zakazka(S1);
z.varianty[0].data.kryci.hodnoty.terminPredani = '2027-09-09';   // = poslední hodnota z dealu, otisk sedí
zapisZakazku(S1, z);
const zamcenaPred2 = JSON.stringify(zakazka(S1).varianty[0]);
d1.custom_fields[HASH_TERMIN] = '2028-01-31';
r = await volej({ dealId: D1.id });
z = zakazka(S1);
test('zamčená varianta s hodnotou z minulého webhooku zůstane (otisk sedí, zámek přednost)',
  JSON.stringify(z.varianty[0]) === zamcenaPred2 && z.varianty[0].data.kryci.hodnoty.terminPredani === '2027-09-09', r);
test('… a nezamčená varianta novou hodnotu dostala', z.varianty[1].data.kryci.hodnoty.terminPredani === '2028-01-31');

test('pojistka pdWebhookZamkyPoruseny pozná změnu zamčené varianty', (() => {
  const a = zakazka(S1), b = kopie(a); b.varianty[0].data.kryci.hodnoty.terminPredani = '2000-01-01';
  return W.pdWebhookZamkyPoruseny(a, b).length === 1 && W.pdWebhookZamkyPoruseny(a, kopie(a)).length === 0
    && W.pdWebhookZamkyPoruseny(a, { varianty: a.varianty.slice(1) }).length === 1;
})());

/* ---------- 8. VLASTNÍK DEALU, ČÍSLO, PROJEKCE ---------- */
console.log('\n===== VLASTNÍK DEALU A ČÍSLO NABÍDKY =====\n');
const rz = zakazka(S1).uloRazitko, pz = zakazkyKlice().length, ptch = pdPatche();
d1.custom_fields[HASH_CN] = 'CN-99999';
r = await volej({ dealId: D1.id });
test('CN v dealu jiné než číslo navázané kalkulace → 409, nic se nezmění',
  r.status === 409 && zakazka(S1).uloRazitko === rz && zakazkyKlice().length === pz && pdPatche() === ptch, r);
delete d1.custom_fields[HASH_CN];
/* Číslo z CN dealu D3 patří kalkulaci jiného dealu (D2). */
const d3 = D().dealy.find((d) => d.id === D3.id);
d3.custom_fields[HASH_CN] = zakazka(Object.keys(Object.fromEntries(zakazkyKlice().map((k) => [k.slice(10), 1])))
  .find((s) => zakazka(s).pdDealId === String(D2.id))).cislo;
r = await volej({ dealId: D3.id });
test('číslo nabídky má kalkulace jiného dealu → 409, nic nového', r.status === 409 && zakazkyKlice().length === pz, r);
d3.custom_fields[HASH_CN] = 'CN-3333';
r = await volej({ dealId: D3.id });
test('CN vyplněné v dealu má přednost před názvem', r.status === 200 && zakazka(r.soubor).cislo === 'CN-3333', r);
r = await volej({ dealId: DBEZ.id });
test('deal bez čísla nabídky → 422, nic se nezaloží', r.status === 422 && zakazkyKlice().length === pz + 1, r);
r = await volej({ dealId: 999999 });
test('neznámý deal → 404', r.status === 404, r);
r = await volej({ dealId: DPROJ.id });
const zp = zakazka(r.soubor);
test('projekce (Typ zakázky „Projekce") → hlavička PROJ', r.status === 200 && zp.projHlavicka.cislo === DPROJ.title.split(' ')[0]
  && zp.projHlavicka.objednatel === org(DPROJ).name && !G.uloCisloVyplneno(zp.cislo), [r.status, zp && zp.projHlavicka]);
/* Kalkulace se stejným číslem, ale bez vazby na deal → webhook ji naváže (CN sedí). */
const volna = G.novaZakazka(); volna.cislo = 'CN-4444'; volna.nazevAkce = 'Ručně založená';
const sVolna = G.uloJmenoSouboru(volna); zapisZakazku(sVolna, volna);
d3.custom_fields[HASH_CN] = 'CN-4444';
const d3Index = pamet.get('pd_webhook/deal:' + D3.id); pamet.delete('pd_webhook/deal:' + D3.id);
r = await volej({ dealId: D3.id });
test('kalkulace s týmž číslem bez vazby → naváže se, ruční název zůstane', r.status === 200 && r.soubor === sVolna
  && zakazka(sVolna).pdDealId === String(D3.id) && zakazka(sVolna).nazevAkce === 'Ručně založená', r);
if (d3Index) pamet.set('pd_webhook/deal:' + D3.id, d3Index);

/* ---------- 9. STROP ---------- */
console.log('\n===== STROP VOLÁNÍ =====\n');
const klicStropu = 'pd_cache/strop:webhook:' + W.PD_WEBHOOK_AUTOR;
test('platná volání se počítají do stropu', JSON.parse(pamet.get(klicStropu) || '{}').pocet > 5, pamet.get(klicStropu));
pamet.set(klicStropu, JSON.stringify({ od: Date.now(), pocet: W.PD_WEBHOOK_MAX }));
const pp = pdPozadavky();
r = await volej({ dealId: D1.id });
test('nad stropem → 429 bez dotazu do Pipedrive', r.status === 429 && pdPozadavky() === pp, r);
pamet.set(klicStropu, JSON.stringify({ od: Date.now() - W.PD_WEBHOOK_OKNO_MS - 1, pocet: W.PD_WEBHOOK_MAX }));
r = await volej({ dealId: D1.id });
test('po hodině strop zase pustí', r.status === 200, r);
pamet.delete(klicStropu);
/* Souběh: 100 doručení téhož dealu najednou → jedna kalkulace, strop drží. */
pamet.set(klicStropu, JSON.stringify({ od: Date.now(), pocet: 0 }));
const pk = zakazkyKlice().length;
const naraz = await Promise.all(Array.from({ length: 100 }, () => volej({ dealId: D2.id })));
test('100 souběžných doručení: nejvýš strop projde, zbytek 429', naraz.filter((x) => x.status === 200).length === W.PD_WEBHOOK_MAX
  && naraz.filter((x) => x.status === 429).length === 100 - W.PD_WEBHOOK_MAX, naraz.map((x) => x.status).join(','));
test('… a nevznikla žádná další kalkulace', zakazkyKlice().length === pk);
pamet.delete(klicStropu);

/* ---------- 10. ŽÁDNÉ OSOBNÍ ÚDAJE ANI TOKEN V ODPOVĚDI ---------- */
console.log('\n===== ODPOVĚDI =====\n');
const vse = odpovedi.join('\n');
test('v odpovědích není e-mail', !/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(vse), (vse.match(/[\w.+-]+@[\w.-]+\.\w+/) || [])[0]);
test('… ani telefon kontaktu', !/\+420 000/.test(vse));
test('… ani klíč webhooku nebo token', !vse.includes(KLIC) && !vse.includes(KLIC.slice(0, 20)) && !/x-api-token/i.test(vse));
test('… ani hash pole Pipedrive', !vse.includes(HASH_ODKAZ) && !vse.includes(HASH_ADRESA));

/* ---------- 11. OBCHODNÍK KALKULACI OTEVŘE A ULOŽÍ ---------- */
console.log('\n===== OBCHODNÍK =====\n');
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const login = async (e, h) => ((await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h })).headers.get('set-cookie') || '').split(';')[0];
const cA = await login(ADMIN_EMAIL, 'Docasne.Heslo.123');
await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
  slevy: { minMarze: 0, maxGlobalni: 0.3, stropy: {} }, poznamka: 'x' }, cA);
await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'obch@priklad.cz', jmeno: 'Obch Test', role: 'Obchodník', heslo: 'Heslo12345x' }, cA);
const cO = await login('obch@priklad.cz', 'Heslo12345x');
const sO = zakazkyKlice().map((k) => k.slice('zakazky/z/'.length)).find((s) => zakazka(s).pdDealId === String(D2.id));
const go = await zakazky(new Request('http://x/api/zakazky?soubor=' + encodeURIComponent(sO), { headers: { cookie: cO } }));
const ulozena = (await go.json()).zakazka;
G.cenikDnesniProVariantu = () => ({ cenik: ZC.zkusebniCenik(), proj: { cenik: ZC.zkusebniCenikProj() } });
const vOkne = G.importZakazka(kopie(ulozena));
delete G.cenikDnesniProVariantu;
test('prohlížeč doplní ceník z platného (cena nevzniká na serveru)', !!vOkne.varianty[0].data.cenik
  && vOkne.varianty[0].data.cenik.zkusebni === ZC.zkusebniCenik().zkusebni && vOkne.varianty[0].data.cenik.montazHodKc === ZC.zkusebniCenik().montazHodKc
  && !vOkne.varianty[0].data.cenikVynechan, vOkne.varianty[0].data.cenik && vOkne.varianty[0].data.cenik.montazHodKc);
vOkne.varianty[0].data.ock.zadani.zdvih = 12;
const ul = await post(zakazky, 'http://x/api/zakazky', { zakazka: vOkne, ocekavaneRazitko: G.uloRazitko(ulozena) }, cO);
const ulj = await ul.json();
test('obchodník kalkulaci z webhooku uloží (200), vazba na deal zůstane', ul.status === 200 && zakazka(sO).pdDealId === String(D2.id)
  && zakazka(sO).autor === W.PD_WEBHOOK_AUTOR, [ul.status, ulj.chyba]);
r = await volej({ dealId: D2.id });
test('webhook po uložení obchodníka: beze změny zadání, zdvih obchodníka zůstal', r.status === 200
  && zakazka(sO).varianty[0].data.ock.zadani.zdvih === 12, r);
const dup = G.zakazkaDuplikuj(zakazka(sO), 'CN-5555');
test('duplikát zakázky nenese vazbu ani otisky zadání z dealu', !dup.pdDealId && !dup.pdZadani);

test('do sítě za celý běh nic', venku.length === 0, venku);
console.log('\n' + ok + ' OK, ' + fail + ' FAIL' + (fail ? '\nSelhalo:\n  ' + selhalo.join('\n  ') : ''));
process.exit(fail ? 1 : 0);
