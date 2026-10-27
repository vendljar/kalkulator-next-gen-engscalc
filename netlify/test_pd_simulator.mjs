/* ============================================================
 * SIMULÁTOR PIPEDRIVE (#536, 27. 10. 2026)
 *
 * 1. Pojistka: simulátor se zapne jen lokálně nebo s PROSTREDI=test; na
 *    ostrém webu (větev main, web schaftscalc, Netlify bez PROSTREDI=test)
 *    se odmítne zapnout.
 * 2. Zapnutý simulátor má přednost před tokenem — do sítě nejde nic.
 * 3. Funkce /api/pd/dealy, /api/pd/deal a /api/pd/pole proti simulátoru:
 *    stránkování (230 dealů > stránka 200), 404, 401, 429 s opakováním,
 *    denní rozpočet tokenů.
 * 4. Odmítnutý token se klientovi hlásí jako 502, ne 401 (401 by klient vzal
 *    za vypršelé přihlášení a odhlásil obchodníka) — nález simulátoru.
 * Nic se nevolá ven: `fetch` je nahrazený funkcí, která test shodí.
 * ============================================================ */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
if (!process.env.ADMIN_EMAIL) process.env.ADMIN_EMAIL = 'spravce@priklad.cz';
for (const k of ['PIPEDRIVE_SIMULATOR', 'PIPEDRIVE_SIMULATOR_SCENAR', 'PIPEDRIVE_SIMULATOR_ROZPOCET', 'PIPEDRIVE_TOKEN',
  'PIPEDRIVE_DOMENA', 'PROSTREDI', 'NETLIFY', 'SITE_ID', 'SITE_NAME', 'DEPLOY_ID', 'CONTEXT', 'BRANCH', 'HEAD', 'URL',
  'DEPLOY_PRIME_URL', 'DEPLOY_URL', 'NETLIFY_BLOBS_CONTEXT', 'AWS_LAMBDA_FUNCTION_NAME']) delete process.env[k];

const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
    .map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
let venku = [];
globalThis.fetch = async (url) => { venku.push(String(url)); throw new Error('síť je v testu zakázaná: ' + url); };

const { default: prihlaseni } = await import('./functions/prihlaseni.mjs');
const { default: pdPole } = await import('./functions/pd_pole.mjs');
const { default: pdDealy } = await import('./functions/pd_dealy.mjs');
const { default: pdDeal } = await import('./functions/pd_deal.mjs');
const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');
const PD = await import('./lib/pipedrive.mjs');
const SIM = await import('./lib/pipedrive_simulator.mjs');

let ok = 0, fail = 0; const selhalo = [];
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; selhalo.push(n); console.log('FAIL ' + n, info === undefined ? '' : info); }
};
const J = (x) => JSON.stringify(x);
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const vycistiCache = () => { for (const k of [...pamet.keys()]) if (/^(pd_cache|pipedrive)\//.test(k)) pamet.delete(k); };

console.log('\n===== POJISTKA: KDE SE SIMULÁTOR ZAPNE =====\n');
const st = (env) => SIM.pdSimulatorStav(env);
test('bez proměnné vypnuto', st({}).zapnuto === false && st({}).pozadovano === false);
test('PIPEDRIVE_SIMULATOR=0 vypnuto', st({ PIPEDRIVE_SIMULATOR: '0' }).pozadovano === false);
test('lokálně (bez známek Netlify) zapnuto', st({ PIPEDRIVE_SIMULATOR: '1' }).zapnuto === true);
test('testovací web (PROSTREDI=test, produkční kontext větve test) zapnuto',
  st({ PIPEDRIVE_SIMULATOR: '1', PROSTREDI: 'test', SITE_NAME: 'testengscalc', CONTEXT: 'production', BRANCH: 'test' }).zapnuto === true);
for (const [n, env] of [
  ['Netlify bez PROSTREDI', { SITE_ID: 'x', SITE_NAME: 'nejaky-web' }],
  ['Netlify s PROSTREDI=ostre', { NETLIFY: 'true', PROSTREDI: 'ostre' }],
  ['nasazení z větve main i s PROSTREDI=test', { PROSTREDI: 'test', BRANCH: 'main', SITE_ID: 'x' }],
  ['HEAD=main', { PROSTREDI: 'test', HEAD: 'main' }],
  ['ostrý web schaftscalc i s PROSTREDI=test', { PROSTREDI: 'test', URL: 'https://schaftscalc.netlify.app' }],
  ['SITE_NAME schaftscalc', { PROSTREDI: 'test', SITE_NAME: 'schaftscalc' }],
  ['lokálně s PROSTREDI=ostre', { PROSTREDI: 'ostre' }],
  ['běh v Lambdě bez PROSTREDI', { AWS_LAMBDA_FUNCTION_NAME: 'fn' }],
]) {
  const s = st({ PIPEDRIVE_SIMULATOR: '1', ...env });
  test('odmítne se: ' + n, s.zapnuto === false && s.pozadovano === true && /nezapnul/.test(s.duvod), J(s));
}

console.log('\n===== PŘEDNOST PŘED TOKENEM =====\n');
process.env.PIPEDRIVE_TOKEN = 'zkusebni-token-jen-pro-test';
process.env.PIPEDRIVE_DOMENA = 'zkusebni-firma';
test('bez simulátoru s tokenem: režim pipedrive', PD.pdRezim() === 'pipedrive' && PD.pdZaklad() === 'https://zkusebni-firma.pipedrive.com');
process.env.PIPEDRIVE_SIMULATOR = '1';
test('simulátor s tokenem: režim simulator, základ .invalid', PD.pdRezim() === 'simulator' && PD.pdZaklad() === SIM.PD_SIM_ZAKLAD);
venku = [];
const uz = await PD.pdZavolej('/api/v1/users');
test('simulátor odpovídá a do sítě nejde nic, ani s tokenem', Array.isArray(uz) && uz.length === 4 && venku.length === 0, venku);
delete process.env.PIPEDRIVE_TOKEN; delete process.env.PIPEDRIVE_DOMENA;
test('simulátor bez tokenu: napojení „nastavené"', PD.pdNastaveno() === true && PD.pdRezim() === 'simulator');
process.env.SITE_ID = 'ostry-web';
test('na Netlify bez PROSTREDI=test se simulátor nezapne a napojení není', PD.pdNastaveno() === false && PD.pdRezim() === 'vypnuto');
delete process.env.SITE_ID;

console.log('\n===== DATA =====\n');
const d1 = SIM.pdSimVychoziData(), d2 = SIM.pdSimVychoziData();
test('data jsou deterministická', J(d1) === J(d2));
test('230 dealů (víc než stránka 200)', d1.dealy.length === SIM.PD_SIM_POCET_DEALU && SIM.PD_SIM_POCET_DEALU > PD.PD_STRANKA);
const maily = J(d1).match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
test('všechny e-maily jsou na smyšlené doméně priklad.cz', maily.length > 30 && maily.every(m => m.endsWith('@priklad.cz')), maily.filter(m => !m.endsWith('@priklad.cz')));
const telefony = d1.osoby.flatMap(o => o.phones.map(p => p.value));
test('telefony jsou nepřidělená čísla +420 000 000 …', telefony.length > 10 && telefony.every(t => /^\+420 000 000 \d{3}$/.test(t)), telefony.slice(0, 3));
test('jsou všechny stavy dealů (open, won, lost, deleted)',
  ['open', 'won', 'lost', 'deleted'].every(s => d1.dealy.some(d => d.status === s)));
test('jsou dealy bez organizace, bez osoby i bez čísla v názvu',
  d1.dealy.some(d => !d.org_id) && d1.dealy.some(d => !d.person_id) && d1.dealy.some(d => /^Poptávka /.test(d.title)));

console.log('\n===== FUNKCE PROTI SIMULÁTORU =====\n');
SIM.pdSimReset();
const r1 = await post0(prihlaseni, 'http://x/api/prihlaseni', { email: ADMIN_EMAIL, heslo: 'Docasne.Heslo.123' });
const cAdmin = (r1.headers.get('set-cookie') || '').split(';')[0];
function post0(fn, url, telo) { return fn(new Request(url, { method: 'POST', body: JSON.stringify(telo) })); }

const otevrene = d1.dealy.filter(d => d.status === 'open').length;
const sez = await (await get(pdDealy, 'http://x/api/pd/dealy?stav=open&limit=200', cAdmin)).json();
test('seznam otevřených: celkem sedí přes obě stránky', sez.ok && sez.celkem === otevrene, [sez.celkem, otevrene]);
const vse = await (await get(pdDealy, 'http://x/api/pd/dealy?stav=vse&limit=200', cAdmin)).json();
test('stav vse = bez smazaných', vse.celkem === d1.dealy.filter(d => d.status !== 'deleted').length, vse.celkem);
test('seznam „vse" (221 dealů) šel přes dvě stránky, druhá s kurzorem',
  SIM.pdSimStav().pozadavky.filter(p => /^GET \/api\/v2\/deals\?limit/.test(p)).length === 2
  && SIM.pdSimStav().pozadavky.filter(p => /^GET \/api\/v2\/deals\?limit.*cursor=/.test(p)).length === 1,
  SIM.pdSimStav().pozadavky);
const hled = await (await get(pdDealy, 'http://x/api/pd/dealy?stav=open&hledat=cn-100', cAdmin)).json();
test('hledání v čísle nabídky', hled.ok && hled.dealy.length >= 1 && hled.dealy.every(d => /CN-100/i.test(d.celyNazev)), hled.dealy.map(d => d.celyNazev));

const det = await (await get(pdDeal, 'http://x/api/pd/deal?id=1001', cAdmin)).json();
test('detail dealu: číslo, zákazník, IČO s nulami, odkaz na .invalid',
  det.ok && det.deal.cislo === 'CN-100' && det.deal.objednatel === d1.organizace[0].name
  && det.deal.ico === '00001000' && det.deal.odkaz.startsWith(SIM.PD_SIM_ZAKLAD + '/deal/'), J(det.deal));
test('detail: typ zakázky a adresa z vlastních polí', !!det.deal.typZakazky && !!det.deal.adresa, J(det.deal));
const bezOrg = d1.dealy.find(d => !d.org_id && d.status !== 'deleted');
const detBez = await (await get(pdDeal, 'http://x/api/pd/deal?id=' + bezOrg.id, cAdmin)).json();
test('deal bez organizace: varování, zákazník prázdný', detBez.ok && detBez.deal.objednatel === ''
  && detBez.varovani.some(v => /organizace/.test(v)), detBez.varovani);
const r404 = await get(pdDeal, 'http://x/api/pd/deal?id=999999', cAdmin);
test('neznámý deal → 404 s českou větou', r404.status === 404 && /nezná/.test((await r404.json()).chyba));
const smazany = d1.dealy.find(d => d.status === 'deleted');
test('smazaný deal detail nevrátí (404)', (await get(pdDeal, 'http://x/api/pd/deal?id=' + smazany.id, cAdmin)).status === 404);

const mapa = await (await get(pdPole, 'http://x/api/pd/pole', cAdmin)).json();
test('mapa polí: režim simulator', mapa.ok && mapa.rezim === 'simulator' && mapa.simulatorOdmitnut === '', [mapa.rezim, mapa.simulatorOdmitnut]);
test('mapa polí: chybí jen dosud nezaložený Platební kalendář SoD PROJ',
  J(mapa.prehled.radky.filter(r => r.stav !== 'sparovano').map(r => r.klic)) === '["platebniKalendar"]',
  mapa.prehled.radky.filter(r => r.stav !== 'sparovano').map(r => r.klic));
test('mapa polí: IČ organizace spárované', mapa.mapaOrganizace && !!mapa.mapaOrganizace.ico);

console.log('\n===== CHYBY A LIMITY =====\n');
vycistiCache();
SIM.pdSimNastav({ scenar: 'token' });
const t401 = await get(pdDealy, 'http://x/api/pd/dealy?stav=won', cAdmin);
const t401b = await t401.json();
test('odmítnutý token: seznam odpoví 502 (ne 401 — klient by odhlásil)', t401.status === 502, t401.status);
test('odmítnutý token: věta říká, kde se token opravuje', /PIPEDRIVE_TOKEN/.test(t401b.chyba || ''), t401b.chyba);
const t401d = await get(pdDeal, 'http://x/api/pd/deal?id=1003', cAdmin);
test('odmítnutý token: detail odpoví 502', t401d.status === 502, t401d.status);
const t401p = await get(pdPole, 'http://x/api/pd/pole?obnovit=1', cAdmin);
test('odmítnutý token: mapa polí odpoví 502', t401p.status === 502, t401p.status);

vycistiCache();
SIM.pdSimNastav({ scenar: 'limit2' });
const pocetPred = SIM.pdSimStav().pozadavky.length;
const lim2 = await get(pdDeal, 'http://x/api/pd/deal?id=1004', cAdmin);
test('dvakrát 429, potřetí projde (opakování v pdZavolej)', lim2.status === 200, lim2.status);
test('…a opravdu se opakovalo', SIM.pdSimStav().pozadavky.length - pocetPred >= 4, SIM.pdSimStav().pozadavky.slice(pocetPred));
vycistiCache();
SIM.pdSimNastav({ scenar: 'limit' });
const lim = await get(pdDealy, 'http://x/api/pd/dealy?stav=lost', cAdmin);
test('trvalý limit → 429 s větou „vyčerpali jsme limit"', lim.status === 429 && /limit/.test((await lim.json()).chyba), lim.status);
vycistiCache();
SIM.pdSimNastav({ scenar: 'vypadek' });
const vyp = await get(pdDealy, 'http://x/api/pd/dealy?stav=lost', cAdmin);
test('výpadek Pipedrive → 502, ne prázdný seznam', vyp.status === 502 && (await vyp.json()).ok === false);

SIM.pdSimReset();
process.env.PIPEDRIVE_SIMULATOR_SCENAR = 'limit1';
const env1 = await PD.pdZavolej('/api/v1/users');
test('scénář z proměnné prostředí (limit1) se po opakování vzpamatuje', Array.isArray(env1));
delete process.env.PIPEDRIVE_SIMULATOR_SCENAR;

SIM.pdSimReset();
process.env.PIPEDRIVE_SIMULATOR_ROZPOCET = '25';
let rozpocetChyba = null;
try { for (let i = 0; i < 5; i++) await PD.pdZavolej('/api/v2/dealFields'); } catch (e) { rozpocetChyba = e; }
test('denní rozpočet tokenů: třetí seznam polí (3 × 10 > 25) skončí 429',
  rozpocetChyba && rozpocetChyba.stav === 429 && SIM.pdSimStav().tokeny === 20, [rozpocetChyba && rozpocetChyba.stav, SIM.pdSimStav().tokeny]);
delete process.env.PIPEDRIVE_SIMULATOR_ROZPOCET;

console.log('\n===== STRÁNKOVÁNÍ A ZÁPIS (pro vývoj #115) =====\n');
SIM.pdSimReset();
const vsechny = await PD.pdVsechny('/api/v2/deals', { status: 'open' });
test('pdVsechny složí obě stránky', vsechny.length === otevrene && new Set(vsechny.map(d => d.id)).size === otevrene);
let kurzorChyba = null;
try { await PD.pdZavolej('/api/v2/deals', { dotaz: { cursor: 'nesmysl' } }); } catch (e) { kurzorChyba = e; }
test('neplatný kurzor → 400', kurzorChyba && kurzorChyba.stav === 400);
const smaz = await PD.pdZavolej('/api/v2/deals', { dotaz: { status: 'deleted', ids: smazany.id } });
test('smazané dealy jen na výslovný dotaz status=deleted&ids', smaz.length === 1 && smaz[0].id === smazany.id);
const pole = SIM.pdSimStav().data.pole.deal;
const hSplatnost = pole.find(p => p.field_name === 'Splatnost faktur (dny)').field_code;
await PD.pdZavolej('/api/v2/deals/1001', { metoda: 'PATCH', telo: { custom_fields: { [hSplatnost]: 21 }, value: 123, currency: 'CZK' } });
const poZapisu = await PD.pdZavolej('/api/v2/deals/1001');
test('PATCH v simulátoru se drží v paměti', poZapisu.custom_fields[hSplatnost] === 21 && poZapisu.value === 123);
let nezname = null;
try { await PD.pdZavolej('/api/v2/deals/1001', { metoda: 'PATCH', telo: { custom_fields: { ['f'.repeat(40)]: 1 } } }); } catch (e) { nezname = e; }
test('PATCH do neznámého pole → 400', nezname && nezname.stav === 400);
await PD.pdZavolej('/api/v2/deals/1001', { metoda: 'PATCH', telo: { status: 'won' } });
test('PATCH stavu dealu (C4 „Prodáno") se drží', (await PD.pdZavolej('/api/v2/deals/1001')).status === 'won');
let spatnyStav = null;
try { await PD.pdZavolej('/api/v2/deals/1001', { metoda: 'PATCH', telo: { status: 'smazano' } }); } catch (e) { spatnyStav = e; }
test('PATCH s neznámým stavem → 400', spatnyStav && spatnyStav.stav === 400);
SIM.pdSimReset();
test('reset vrátí výchozí data', (await PD.pdZavolej('/api/v2/deals/1001')).custom_fields[hSplatnost] !== 21);
test('do sítě za celý běh nešlo nic', venku.length === 0, venku);

console.log(`\n${ok} prošlo, ${fail} selhalo`);
if (fail) console.log('\nSelhalo:\n - ' + selhalo.join('\n - '));
process.exit(fail ? 1 : 0);
