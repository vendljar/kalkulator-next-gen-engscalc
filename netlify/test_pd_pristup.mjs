/* ============================================================
 * B80 — PŘÍSTUP K /api/pd/* (dávka S1, 15. 10. 2026, roadmapa #345)
 *
 * Nález auditu 24. 9. 2026 (trvá podle auditu 12. 10. 2026): funkce
 * `pd_dealy`, `pd_deal` a `pd_pole` jsou nasazené, klient je nevolá, a přesto
 * je smí volat KAŽDÝ přihlášený. S nastaveným tokenem Pipedrive tak obchodník
 * jedním skriptem (DevTools s vlastní cookie) projde `/api/pd/deal?id=1…N`
 * a odnese si celé CRM — objednatele, IČO, jména, e-maily a telefony kontaktů.
 * Detail se navíc necachoval: každé načtení stálo 6 tokenů denního rozpočtu
 * Pipedrive, takže tatáž smyčka odstavila integraci celé firmě.
 *
 * Oprava (zapsaná v CHANGELOG v15.10.1 a v15.10.7):
 *   1. čtení jen s právem z matice zobrazení `crm.pipedrive` — výchozí
 *      Obchodník ano, Vedoucí ano (rozhodnutí J. V. 15. 10. 2026: „zatím
 *      všem uživatelům"); administrátor ho může v Nastavení odebrat;
 *   2. požadavek z cizího původu se odmítne (403) i u GET;
 *   3. detail dealu se drží 90 s v cache a čerstvá načtení mají strop na
 *      uživatele a hodinu (429);
 *   4. číslo případu musí být kladné celé číslo.
 *
 * Pipedrive je nahrazený náhradním `fetch` — žádné volání ven.
 * ============================================================ */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
if (!process.env.ADMIN_EMAIL) process.env.ADMIN_EMAIL = 'spravce@priklad.cz';

const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
    .map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

const { default: prihlaseni } = await import('./functions/prihlaseni.mjs');
const { default: uzivatele } = await import('./functions/uzivatele.mjs');
const { default: pdPole } = await import('./functions/pd_pole.mjs');
const { default: pdDealy } = await import('./functions/pd_dealy.mjs');
const { default: pdDeal } = await import('./functions/pd_deal.mjs');
const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');
const PD = await import('./lib/pipedrive.mjs');

let ok = 0, fail = 0; const selhalo = [];
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; selhalo.push(n); console.log('FAIL ' + n, info === undefined ? '' : info); }
};
const get = (fn, url, cookie, hlavicky = {}) =>
  fn(new Request(url, { headers: { ...(cookie ? { cookie } : {}), ...hlavicky } }));
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST',
  headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));

/* ---------- náhradní Pipedrive: každé id dealu existuje ---------- */
let volani = [];
globalThis.fetch = async (url) => {
  volani.push(String(url));
  const u = new URL(String(url));
  const odp = (data) => new Response(JSON.stringify({ success: true, data,
    additional_data: { next_cursor: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  if (/Fields$/.test(u.pathname)) return odp([]);
  if (u.pathname === '/api/v2/deals') return odp([{ id: 1, title: 'CN-1 Zkušební', status: 'open' }]);
  const md = /^\/api\/v2\/deals\/(\d+)$/.exec(u.pathname);
  if (md) return odp({ id: Number(md[1]), title: 'CN-' + md[1] + ' Zkušební', org_id: 900, person_id: 800,
    custom_fields: {} });
  if (/^\/api\/v2\/organizations\/\d+$/.test(u.pathname)) return odp({ id: 900, name: 'Zkušební s.r.o.' });
  if (/^\/api\/v2\/persons\/\d+$/.test(u.pathname))
    return odp({ id: 800, first_name: 'Jan', last_name: 'Zkušební',
      emails: [{ value: 'jan.zkusebni@priklad.cz' }], phones: [] });
  return new Response('{}', { status: 404 });
};
process.env[PD.PD_TOKEN_PROMENNA] = 'zkusebni-token-jen-pro-test';
process.env[PD.PD_DOMENA_PROMENNA] = 'zkusebni-firma';

/* ---------- účty ---------- */
const cookie = (r) => (r.headers.get('set-cookie') || '').split(';')[0];
const cAdmin = cookie(await post(prihlaseni, 'http://x/api/prihlaseni',
  { email: ADMIN_EMAIL, heslo: 'Docasne.Heslo.123' }));
for (const [email, role, heslo] of [['obchod@example.com', 'Obchodník', 'ObchodHeslo1'],
                                    ['vedouci@example.com', 'Vedoucí', 'VedouciHeslo1']])
  await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email, jmeno: role, role, heslo }, cAdmin);
const cObch = cookie(await post(prihlaseni, 'http://x/api/prihlaseni',
  { email: 'obchod@example.com', heslo: 'ObchodHeslo1' }));
const cVed = cookie(await post(prihlaseni, 'http://x/api/prihlaseni',
  { email: 'vedouci@example.com', heslo: 'VedouciHeslo1' }));
test('příprava: tři přihlášené účty', !!(cAdmin && cObch && cVed));

const CESTY = [
  ['seznam', pdDealy, 'http://x/api/pd/dealy?stav=vse'],
  ['detail', pdDeal, 'http://x/api/pd/deal?id=1'],
  ['mapa polí', pdPole, 'http://x/api/pd/pole'],
];

console.log('\n===== 1) VÝCHOZÍ MATICE: ČTOU VŠICHNI PŘIHLÁŠENÍ =====\n');
/* Rozhodnutí J. V. 15. 10. 2026: právo crm.pipedrive zatím mají všichni
 * uživatelé (výchozí Obchodník ano, Vedoucí ano); administrátor ho může
 * v Nastavení → Zobrazení odebrat — to hlídá oddíl 2. */
for (const [n, fn, url] of CESTY) {
  for (const [kdo, c] of [['obchodník', cObch], ['vedoucí', cVed], ['administrátor', cAdmin]]) {
    const r = await get(fn, url, c);
    test('B80: výchozí matice — ' + kdo + ' čte ' + n + ' → 200', r.status === 200, r.status);
  }
}
for (const [n, fn, url] of CESTY)
  test('B80: nepřihlášený — ' + n + ' → 401', (await get(fn, url)).status === 401);

console.log('\n===== 2) ODEBRANÉ PRÁVO Z MATICE =====\n');
/* Matice uložená administrátorem (/api/zobrazeni ukládá do program/zobrazeni):
 * obchodníkovi právo odebráno, vedoucímu ponecháno. */
pamet.set('program/zobrazeni', JSON.stringify({ matice: { 'crm.pipedrive': { 'Obchodník': false, 'Vedoucí': true } } }));
for (const [n, fn, url] of CESTY) {
  volani = [];
  const r = await get(fn, url, cObch);
  test('B80: obchodník s odebraným právem — ' + n + ' → 403', r.status === 403, r.status);
  test('B80: … a do Pipedrive se nešlo (' + n + ')', volani.length === 0, volani);
  const v = await get(fn, url, cVed);
  test('B80: vedoucí, kterému právo zůstalo — ' + n + ' → 200', v.status === 200, v.status);
  const a = await get(fn, url, cAdmin);
  test('B80: administrátor má právo vždy — ' + n + ' → 200', a.status === 200, a.status);
}
/* Zbytek sady zkouší obchodníkem — právo se mu vrací. */
pamet.delete('program/zobrazeni');

console.log('\n===== 3) CIZÍ PŮVOD =====\n');
for (const [n, fn, url] of CESTY) {
  volani = [];
  const r = await get(fn, url, cAdmin, { origin: 'https://utocnik.example', host: 'kalkulator.example' });
  test('B80: GET z cizího původu — ' + n + ' → 403 (i administrátor)', r.status === 403, r.status);
  test('B80: … a do Pipedrive se nešlo (' + n + ', cizí původ)', volani.length === 0, volani);
  const s = await get(fn, url, cAdmin, { origin: 'https://kalkulator.example', host: 'kalkulator.example' });
  test('B80: GET z vlastního původu — ' + n + ' → 200', s.status === 200, s.status);
}

console.log('\n===== 4) ČÍSLO PŘÍPADU =====\n');
for (const id of ['-1', '1.5', '0', '1e3', '99999999999', '%201']) {
  volani = [];
  const r = await get(pdDeal, 'http://x/api/pd/deal?id=' + id, cObch);
  test('B80: neplatné číslo případu „' + decodeURIComponent(id) + '" → 400', r.status === 400, r.status);
  test('B80: … a do Pipedrive se nešlo (id ' + id + ')', volani.length === 0, volani);
}

console.log('\n===== 5) ROZPOČET PIPEDRIVE =====\n');
volani = [];
await get(pdDeal, 'http://x/api/pd/deal?id=7', cObch);
const prvni = volani.length;
volani = [];
const znovu = await get(pdDeal, 'http://x/api/pd/deal?id=7', cObch);
test('B80: totéž načtení do 90 s jde z cache, ne do Pipedrive',
  znovu.status === 200 && prvni > 0 && volani.length === 0, { prvni, znovu: volani.length });

const MAX = PD.PD_DEAL_MAX || 30;
let odmitnuto = 0, poslednich = 0;
for (let i = 0; i < MAX + 5; i++) {
  volani = [];
  const r = await get(pdDeal, 'http://x/api/pd/deal?id=' + (1000 + i), cObch);
  if (r.status === 429) { odmitnuto++; poslednich += volani.length; }
}
test('B80: procházení CRM po jednom dealu narazí na strop (429)', odmitnuto >= 5, odmitnuto);
test('B80: … a nad stropem se do Pipedrive nejde', odmitnuto > 0 && poslednich === 0, poslednich);
volani = [];
const jinyUzivatel = await get(pdDeal, 'http://x/api/pd/deal?id=5000', cAdmin);
test('B80: strop je na uživatele — jiný účet načítá dál', jinyUzivatel.status === 200, jinyUzivatel.status);
volani = [];
const zCache = await get(pdDeal, 'http://x/api/pd/deal?id=7', cObch);
test('B80: nad stropem se pořád smí načíst případ, který je v cache',
  zCache.status === 200 && volani.length === 0, { stav: zCache.status, volani: volani.length });

console.log('\n===== 6) SOUBĚH STROPU (B158) =====\n');
/* B158 (audit 25, 15. 10. 2026): počítadlo stropu se četlo a zapisovalo bez
 * zámku — 200 souběžných požadavků přečetlo tutéž hodnotu a všech 200 prošlo
 * do Pipedrive. Vedoucí má strop zatím skoro nevyčerpaný (jen pár načtení
 * z oddílů 1–3), každé číslo případu je nové, takže z cache nic nejde. */
volani = [];
const soubezne = await Promise.all(Array.from({ length: 200 }, (_, i) =>
  get(pdDeal, 'http://x/api/pd/deal?id=' + (20000 + i), cVed)));
const prosloSoubezne = soubezne.filter(r => r.status === 200).length;
const dealuVolano = volani.filter(u => /\/api\/v2\/deals\/\d+/.test(u)).length;
test('B158: 200 souběžných čerstvých načtení — projde nejvýš strop', prosloSoubezne <= MAX,
  { proslo: prosloSoubezne, MAX });
test('B158: … ostatní dostanou 429', soubezne.filter(r => r.status === 429).length >= 200 - MAX,
  soubezne.filter(r => r.status === 429).length);
test('B158: … a do Pipedrive jde nejvýš strop načtení dealu', dealuVolano <= MAX, dealuVolano);

console.log(`\n${ok} prošlo, ${fail} selhalo`);
if (fail) console.log('\nSelhalo:\n - ' + selhalo.join('\n - '));
process.exit(fail ? 1 : 0);
