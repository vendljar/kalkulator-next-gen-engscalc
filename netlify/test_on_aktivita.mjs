/* ČAS POSLEDNÍ AKTIVITY UŽIVATELE — KDO JE ONLINE (#ON, zadání J. V. 19. 11. 2026)
 *
 * Správce vidí v Nastavení → Uživatelé, kdo je právě online. Sada hlídá
 * serverovou stranu:
 *
 *  1) zápis: přihlášení i běžné volání API (/api/ja) zapíše čas aktivity;
 *     uloží se JEN čas ({ kdy }) — žádná IP adresa ani prohlížeč;
 *  2) rozestup: nejvýš jeden zápis za minutu na účet; po minutě znovu;
 *  3) výpis: posledniAktivita / odhlaseni / online jen v GET /api/uzivatele
 *     pro Administrátora; Obchodník a Vedoucí 403 bez údaje, /api/ja ho
 *     nenese nikomu;
 *  4) online = aktivita v posledních 5 min bez pozdějšího odhlášení;
 *     odhlášení zapíše čas a zapomene rozestup (nové přihlášení hned online);
 *  5) best-effort: selhání i zaseknutí úložiště aktivity požadavek neshodí
 *     ani nezdrží; výpis účtů bez údaje nespadne;
 *  6) smazání účtu smaže i jeho aktivitu.
 *
 * Pojistka proti prázdnému testu: každé „nezapsalo se" má proti sobě
 * „zapsalo se" za stejných podmínek (jiný čas / jiná role). Před změnou
 * (bez zápisu aktivity) sada padá na 1), 3) a 4).
 * Účty jsou smyšlené (@priklad.cz).
 */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
const pamet = new Map();
let zapisyAktivity = [];
let rezimAktivity = 'ok';            // 'ok' | 'chyba' | 'visi'
const zaseknute = [];                // uvolní se po zkoušce „visi“
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) {
    if (nazev === 'aktivita' && rezimAktivity === 'chyba') throw new Error('úložiště aktivity nedostupné');
    return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null;
  },
  async zapis(k, v) {
    if (nazev === 'aktivita') {
      if (rezimAktivity === 'chyba') throw new Error('úložiště aktivity nedostupné');
      if (rezimAktivity === 'visi') return new Promise(r => zaseknute.push(r));
      zapisyAktivity.push(k);
    }
    pamet.set(nazev + '/' + k, JSON.stringify(v));
  },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
    .map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
let TED = Date.parse('2026-11-19T09:00:00.000Z');
globalThis.__TEST_TED = () => TED;
let neosetrene = 0;                   // neošetřená odmítnutí (best-effort musí chybu spolknout)
process.on('unhandledRejection', () => { neosetrene++; });

import './pomoc_test_admin.mjs';
import prihlaseni from './functions/prihlaseni.mjs';
import odhlaseni from './functions/odhlaseni.mjs';
import uzivatele from './functions/uzivatele.mjs';
import ja from './functions/ja.mjs';
import { ADMIN_EMAIL, aktivitaDobehni, aktivitaOnline, AKTIVITA_ROZESTUP_MS, ONLINE_OKNO_MS } from './lib/sdilene.mjs';

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
const post = (fn, url, telo, cookie, hlav) => fn(new Request(url, { method: 'POST',
  headers: Object.assign({}, cookie ? { cookie } : {}, hlav || {}), body: JSON.stringify(telo) }));
const get = (fn, url, cookie, hlav) => fn(new Request(url, { headers: Object.assign({}, cookie ? { cookie } : {}, hlav || {}) }));
const api = async (telo, cookie) => { const r = await post(uzivatele, 'http://x/api/uzivatele', telo, cookie);
  return Object.assign({ status: r.status }, await r.json()); };
const seznam = async (cookie) => { const r = await get(uzivatele, 'http://x/api/uzivatele', cookie);
  return Object.assign({ status: r.status }, await r.json()); };
async function prihlas(email, heslo) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email, heslo });
  const t = await r.clone().json();
  if (!t.ok) throw new Error('Přihlášení selhalo pro ' + email + ': ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const aktivita = (e) => JSON.parse(pamet.get('aktivita/a/' + e) || 'null');
const odhl = (e) => JSON.parse(pamet.get('aktivita/o/' + e) || 'null');
const radek = (o, e) => (o.uzivatele || []).find(u => u.email === e);
const POLE = ['posledniAktivita', 'odhlaseni', 'online'];

const HESLO = 'ZkusebniHeslo1';
const cHlavni = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
const zaloz = (email, role) => api({ akce: 'zaloz', email, jmeno: 'Účet ON', role, heslo: HESLO }, cHlavni);
test('založení obchodníka', (await zaloz('obchodnik.on@priklad.cz', 'Obchodník')).ok);
test('založení vedoucího', (await zaloz('vedouci.on@priklad.cz', 'Vedoucí')).ok);
test('založení kolegy ke smazání', (await zaloz('odchazi.on@priklad.cz', 'Obchodník')).ok);
await aktivitaDobehni();

/* 1) zápis při přihlášení — jen čas, žádná IP ani prohlížeč */
const E = 'obchodnik.on@priklad.cz';
{
  test('před přihlášením obchodník aktivitu nemá', aktivita(E) === null);
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: E, heslo: HESLO }, null,
    { 'x-forwarded-for': '203.0.113.77', 'x-nf-client-connection-ip': '203.0.113.77', 'user-agent': 'ProhlizecZkouska/9.9' });
  await aktivitaDobehni();
  const a = aktivita(E);
  test('přihlášení zapíše čas aktivity', a && a.kdy === new Date(TED).toISOString(), a);
  test('záznam aktivity nese jen čas (žádná IP ani prohlížeč)', a && Object.keys(a).join() === 'kdy', a);
  const vse = [...pamet.entries()].filter(([k]) => k.startsWith('aktivita/')).map(([, v]) => v).join(' ');
  test('úložiště aktivity neobsahuje IP ani prohlížeč', !vse.includes('203.0.113.77') && !vse.includes('ProhlizecZkouska'));
  globalThis.cObch = (r.headers.get('set-cookie') || '').split(';')[0];
}
const cObch = globalThis.cObch;
const cVed = await prihlas('vedouci.on@priklad.cz', HESLO);
await aktivitaDobehni();

/* 2) rozestup: nejvýš jednou za minutu na účet */
{
  zapisyAktivity = [];
  TED += 10 * 1000;
  test('volání API (ja) projde', (await get(ja, 'http://x/api/ja', cObch)).status === 200);
  TED += 20 * 1000;
  await get(ja, 'http://x/api/ja', cObch);
  TED += 29 * 1000;                                  // 59 s po přihlášení
  await get(ja, 'http://x/api/ja', cObch);
  await aktivitaDobehni();
  test('do minuty od posledního zápisu se aktivita nezapisuje', zapisyAktivity.filter(k => k === 'a/' + E).length === 0, zapisyAktivity);
  TED += 2 * 1000;                                   // 61 s
  await get(ja, 'http://x/api/ja', cObch);
  await get(ja, 'http://x/api/ja', cObch);
  await aktivitaDobehni();
  test('po minutě se aktivita zapíše znovu — jednou', zapisyAktivity.filter(k => k === 'a/' + E).length === 1, zapisyAktivity);
  test('zapsaný čas je čas volání', aktivita(E).kdy === new Date(TED).toISOString(), aktivita(E));
  test('rozestup je 1 minuta a okno online 5 minut', AKTIVITA_ROZESTUP_MS === 60000 && ONLINE_OKNO_MS === 300000);
  /* jiný účet má vlastní rozestup */
  zapisyAktivity = [];
  await get(ja, 'http://x/api/ja', cVed);
  await aktivitaDobehni();
  test('rozestup je na účet (vedoucí se zapíše i hned po obchodníkovi)',
    zapisyAktivity.includes('a/vedouci.on@priklad.cz'), zapisyAktivity);
}

/* 3) výpis jen pro Administrátora */
{
  const o = await seznam(cHlavni);
  const r = radek(o, E);
  test('správce: výpis nese posledniAktivita, odhlaseni a online', o.status === 200 && r
    && POLE.every(p => p in r), r);
  test('správce: obchodník aktivní před chvílí je online', r && r.online === true && r.posledniAktivita === aktivita(E).kdy, r);
  const nikdy = radek(o, 'odchazi.on@priklad.cz');
  test('správce: účet bez přihlášení není online a čas je prázdný', nikdy && nikdy.online === false && nikdy.posledniAktivita === '', nikdy);
  for (const [kdo, c] of [['Obchodník', cObch], ['Vedoucí', cVed]]) {
    const x = await seznam(c);
    const txt = JSON.stringify(x);
    test(kdo + ': výpis účtů 403 a bez údaje o aktivitě', x.status === 403
      && !POLE.some(p => txt.includes(p)) && !txt.includes(aktivita(E).kdy), x);
  }
  for (const [kdo, c] of [['Obchodník', cObch], ['Vedoucí', cVed], ['Administrátor', cHlavni]]) {
    const t = await (await get(ja, 'http://x/api/ja', c)).text();
    test(kdo + ': /api/ja údaj o aktivitě nenese', !POLE.some(p => t.includes('"' + p + '"')), t.slice(0, 200));
  }
}

/* 4) online okno a odhlášení */
{
  TED += ONLINE_OKNO_MS - 1000;
  let r = radek(await seznam(cHlavni), E);
  test('4 min 59 s po aktivitě je pořád online', r.online === true, r);
  TED += 2000;
  r = radek(await seznam(cHlavni), E);
  test('po 5 minutách bez aktivity už online není', r.online === false && r.posledniAktivita !== '', r);
  test('aktivitaOnline: odhlášení po aktivitě = offline',
    aktivitaOnline('2026-11-19T09:00:00.000Z', '2026-11-19T09:00:00.000Z', Date.parse('2026-11-19T09:01:00.000Z')) === false
    && aktivitaOnline('2026-11-19T09:00:30.000Z', '2026-11-19T09:00:00.000Z', Date.parse('2026-11-19T09:01:00.000Z')) === true);

  await get(ja, 'http://x/api/ja', cVed);
  await aktivitaDobehni();
  r = radek(await seznam(cHlavni), 'vedouci.on@priklad.cz');
  test('vedoucí po volání API online', r.online === true, r);
  TED += 1000;
  const o = await post(odhlaseni, 'http://x/api/odhlaseni', {}, cVed, { 'content-type': 'application/json' });
  test('odhlášení projde', o.status === 200);
  await aktivitaDobehni();
  test('odhlášení zapíše čas odhlášení', odhl('vedouci.on@priklad.cz') && odhl('vedouci.on@priklad.cz').kdy === new Date(TED).toISOString());
  r = radek(await seznam(cHlavni), 'vedouci.on@priklad.cz');
  test('po odhlášení není online a výpis nese čas odhlášení', r.online === false && r.odhlaseni === new Date(TED).toISOString(), r);
  TED += 5000;                                       // nové přihlášení do minuty od posledního zápisu
  await prihlas('vedouci.on@priklad.cz', HESLO);
  await aktivitaDobehni();
  r = radek(await seznam(cHlavni), 'vedouci.on@priklad.cz');
  test('nové přihlášení hned po odhlášení je zase online', r.online === true, r);
}

/* 5) best-effort */
{
  TED += 2 * AKTIVITA_ROZESTUP_MS;
  rezimAktivity = 'chyba';
  let r = await get(ja, 'http://x/api/ja', cObch);
  await new Promise(res => setTimeout(res, 50));    // ať se případné neošetřené odmítnutí ohlásí
  await aktivitaDobehni();
  test('selhání úložiště aktivity: chyba se spolkne (žádné neošetřené odmítnutí)', neosetrene === 0, neosetrene);
  test('selhání úložiště aktivity: běžné volání API projde (200)', r.status === 200);
  const o = await seznam(cHlavni);
  test('selhání úložiště aktivity: výpis účtů projde bez údaje', o.status === 200 && radek(o, E)
    && radek(o, E).posledniAktivita === '' && radek(o, E).online === false, radek(o, E));
  rezimAktivity = 'visi';
  TED += 2 * AKTIVITA_ROZESTUP_MS;
  const start = Date.now();
  const vysl = await Promise.race([get(ja, 'http://x/api/ja', cObch).then(x => x.status),
    new Promise(res => setTimeout(() => res('ZASEKNUTO'), 2000))]);
  test('zaseknutý zápis aktivity odpověď nezdrží', vysl === 200 && Date.now() - start < 2000, vysl);
  const p = await Promise.race([prihlaseni(new Request('http://x/api/prihlaseni', { method: 'POST',
    body: JSON.stringify({ email: E, heslo: HESLO }) })).then(x => x.status),
    new Promise(res => setTimeout(() => res('ZASEKNUTO'), 3000))]);
  test('zaseknutý zápis aktivity nezdrží ani přihlášení', p === 200, p);
  test('zápis aktivity se opravdu zasekl (pojistka zkoušky)', zaseknute.length >= 2, zaseknute.length);
  rezimAktivity = 'ok';
  zaseknute.forEach(r => r());
}

/* 6) smazání účtu smaže i aktivitu */
{
  TED += 2 * AKTIVITA_ROZESTUP_MS;
  await prihlas('odchazi.on@priklad.cz', HESLO);
  await aktivitaDobehni();
  test('kolega ke smazání má aktivitu', aktivita('odchazi.on@priklad.cz') !== null);
  const s = await api({ akce: 'smaz', email: 'odchazi.on@priklad.cz' }, cHlavni);
  test('smazání účtu projde', s.ok === true, s);
  test('smazání účtu smaže jeho aktivitu', aktivita('odchazi.on@priklad.cz') === null && odhl('odchazi.on@priklad.cz') === null);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
