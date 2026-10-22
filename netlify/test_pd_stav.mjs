/* ============================================================
 * STAV PIPEDRIVE V HLAVIČCE KALKULACE (22. 10. 2026)
 * Zadání J. V.: podklady/PIPEDRIVE_STAV_DEALU_22_10.md.
 *
 * Hlídá serverovou část:
 *   1. /api/pd/stav — čtení stavu dealu (open, lost, won, deleted), co
 *      dostane prohlížeč (jen stav a čas), cache, smazaný deal (detail 404
 *      → seznam smazaných), deal, který Pipedrive odstranil úplně (poslední
 *      známý stav zůstává), chyby Pipedrive (nikdy 401), přístup a strop;
 *   2. uložení zakázky — stav je údaj serveru: co pošle prohlížeč, se
 *      zahodí, uloží se záznam serveru nebo stav z uložené verze téhož dealu.
 * Hromadný export (novější stav ze serveru) hlídá netlify/test_controlling.mjs,
 * čisté funkce src/test_controlling.js, hlavičku overit_pd_stav.mjs.
 *
 * Pojistka: před úpravou funkce /api/pd/stav neexistuje (import selže)
 * a uložení zakázky stav poslaný prohlížečem uloží beze změny.
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
const { default: pdStav } = await import('./functions/pd_stav.mjs');
const { default: pdDeal } = await import('./functions/pd_deal.mjs');
const { default: zakazky } = await import('./functions/zakazky.mjs');
const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');
const { jadro } = await import('./lib/jadro.mjs');
const PD = await import('./lib/pipedrive.mjs');
await jadro();
const G = globalThis;

let ok = 0, fail = 0; const selhalo = [];
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; selhalo.push(n); console.log('FAIL ' + n, info === undefined ? '' : info); }
};
const get = (fn, url, cookie, hlavicky = {}) =>
  fn(new Request(url, { headers: { ...(cookie ? { cookie } : {}), ...hlavicky } }));
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST',
  headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const stav = async (deal, c, hlavicky) => {
  const r = await get(pdStav, 'http://x/api/pd/stav?deal=' + deal, c, hlavicky);
  let o = null; try { o = await r.json(); } catch (e) { o = null; }
  return { st: r.status, o: o || {} };
};
const zaznam = (id) => (pamet.has('pipedrive/stav/' + id) ? JSON.parse(pamet.get('pipedrive/stav/' + id)) : null);
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/* ---------- náhradní Pipedrive ----------
 * Objekt = deal (detail 200); 'smazany' = detail 404 a seznam smazaných ho
 * najde; 'zmizely' = detail 404 a seznam prázdný (po 30 dnech v koši);
 * číslo = stavový kód odpovědi. Neuvedené id = otevřený deal. */
const DEALY = {
  4711: { id: 4711, title: 'CN-4711 Tajný název akce', value: 487500, currency: 'CZK', status: 'lost',
    person_id: 800, org_id: 900, custom_fields: {} },
  4712: { id: 4712, title: 'CN-4712', status: 'won', is_deleted: true },
  4713: 'smazany',
  4714: 'zmizely',
  4715: 401,
  4716: 403,
  4717: { id: 4717, status: 'nesmysl' },
  4718: { id: 4718, status: 'won' },
};
let volani = [];
let tokeny = [];
globalThis.fetch = async (url, init) => {
  volani.push(String(url));
  tokeny.push(init && init.headers ? init.headers['x-api-token'] : undefined);
  const u = new URL(String(url));
  const odp = (data, st = 200) => new Response(JSON.stringify(st === 200
    ? { success: true, data, additional_data: { next_cursor: null } } : { success: false, error: 'chyba ' + st }),
    { status: st, headers: { 'Content-Type': 'application/json' } });
  if (/Fields$/.test(u.pathname)) return odp([]);
  if (u.pathname === '/api/v2/deals') {
    const id = Number(u.searchParams.get('ids'));
    return odp(u.searchParams.get('status') === 'deleted' && DEALY[id] === 'smazany'
      ? [{ id, title: 'CN-' + id, status: 'won', is_deleted: true }] : []);
  }
  const md = /^\/api\/v2\/deals\/(\d+)$/.exec(u.pathname);
  if (md) {
    const d = DEALY[Number(md[1])];
    if (d === 'smazany' || d === 'zmizely') return odp(null, 404);
    if (typeof d === 'number') return odp(null, d);
    return odp(d || { id: Number(md[1]), title: 'CN-' + md[1], status: 'open', custom_fields: {} });
  }
  if (/^\/api\/v2\/organizations\/\d+$/.test(u.pathname)) return odp({ id: 900, name: 'Zkušební s.r.o.' });
  if (/^\/api\/v2\/persons\/\d+$/.test(u.pathname))
    return odp({ id: 800, first_name: 'Jan', last_name: 'Zkušební', emails: [], phones: [] });
  return odp(null, 404);
};

/* ---------- účty ---------- */
const cookie = (r) => (r.headers.get('set-cookie') || '').split(';')[0];
const cAdmin = cookie(await post(prihlaseni, 'http://x/api/prihlaseni',
  { email: ADMIN_EMAIL, heslo: 'Docasne.Heslo.123' }));
await post(uzivatele, 'http://x/api/uzivatele',
  { akce: 'zaloz', email: 'obchod@example.com', jmeno: 'Obchodník', role: 'Obchodník', heslo: 'ObchodHeslo1' }, cAdmin);
const cObch = cookie(await post(prihlaseni, 'http://x/api/prihlaseni',
  { email: 'obchod@example.com', heslo: 'ObchodHeslo1' }));
test('příprava: přihlášený administrátor i obchodník', !!(cAdmin && cObch));

console.log('\n===== 1) BEZ NASTAVENÉHO NAPOJENÍ =====\n');
delete process.env[PD.PD_TOKEN_PROMENNA];
delete process.env[PD.PD_DOMENA_PROMENNA];
volani = [];
{ const r = await stav(4711, cObch);
  test('bez tokenu: odpověď „nenastaveno", žádný stav', r.st === 200 && r.o.ok === true && r.o.nastaveno === false
    && r.o.status === null, r);
  test('bez tokenu: do Pipedrive se nešlo', volani.length === 0, volani); }

process.env[PD.PD_TOKEN_PROMENNA] = 'zkusebni-token-jen-pro-test';
process.env[PD.PD_DOMENA_PROMENNA] = 'zkusebni-firma';

console.log('\n===== 2) PŘÍSTUP A ČÍSLO DEALU =====\n');
test('nepřihlášený → 401', (await stav(4711)).st === 401);
volani = [];
{ const r = await stav(4711, cAdmin, { origin: 'https://utocnik.example', host: 'kalkulator.example' });
  test('cizí původ → 403 (i administrátor) a do Pipedrive se nešlo', r.st === 403 && volani.length === 0, r.st); }
pamet.set('program/zobrazeni', JSON.stringify({ matice: { 'crm.pipedrive': { 'Obchodník': false, 'Vedoucí': true } } }));
volani = [];
{ const r = await stav(4711, cObch);
  test('odebrané právo crm.pipedrive → 403 a do Pipedrive se nešlo', r.st === 403 && volani.length === 0, r.st); }
pamet.delete('program/zobrazeni');
for (const id of ['', 'abc', '0', '-1', '1.5', '1e3', '99999999999', '2147483648', '%201']) {
  volani = [];
  const r = await stav(id, cObch);
  test('neplatné číslo dealu „' + decodeURIComponent(id) + '" → 400 bez Pipedrive', r.st === 400 && volani.length === 0, r.st);
}

console.log('\n===== 3) ČTENÍ STAVU =====\n');
volani = []; tokeny = [];
const s1 = await stav(4711, cObch);
test('stav dealu se přečte (Ztracené = lost)', s1.st === 200 && s1.o.ok === true && s1.o.nastaveno === true
  && s1.o.status === 'lost' && ISO.test(s1.o.nacteno || ''), s1);
test('prohlížeč dostane jen stav a čas — žádný název, částku ani kontakty',
  Object.keys(s1.o).sort().join(',') === 'nacteno,nastaveno,ok,status'
  && !/Tajný|487500|Zkušební|900|800/.test(JSON.stringify(s1.o)), s1.o);
test('stav stojí jeden dotaz (detail dealu, ne organizace ani osoba)',
  volani.length === 1 && /\/api\/v2\/deals\/4711$/.test(new URL(volani[0]).pathname), volani);
test('token jde v hlavičce, ne v adrese', tokeny[0] === 'zkusebni-token-jen-pro-test'
  && volani.every(u => !u.includes('zkusebni-token')), volani);
const z1 = zaznam(4711);
test('server si stav pamatuje v úložišti pipedrive (stav/<id>)', !!z1 && z1.status === 'lost'
  && z1.nacteno === s1.o.nacteno && z1.overeno === s1.o.nacteno, z1);
test('záznam stavu není v pd_cache (noční úklid ho nesmaže)', ![...pamet.keys()].some(k => k.startsWith('pd_cache/') && k.includes('4711')));

volani = [];
const s2 = await stav(4711, cObch);
test('opakované otevření do 10 minut jde bez Pipedrive', s2.st === 200 && s2.o.status === 'lost'
  && s2.o.nacteno === s1.o.nacteno && volani.length === 0, { s2, volani });
pamet.set('pipedrive/stav/4711', JSON.stringify(Object.assign(zaznam(4711),
  { overeno: new Date(Date.now() - PD.PD_STAV_CACHE_MS - 1000).toISOString() })));
DEALY[4711] = Object.assign({}, DEALY[4711], { status: 'won' });
volani = [];
const s3 = await stav(4711, cObch);
test('po 10 minutách se stav přečte znovu (Vyhrané)', s3.o.status === 'won' && volani.length === 1
  && Date.parse(s3.o.nacteno) >= Date.parse(s1.o.nacteno), s3);

const s4 = await stav(4712, cObch);
test('smazaný deal v koši (is_deleted) je „Smazané", ne původní „Vyhrané"', s4.o.status === 'deleted', s4);

volani = [];
const s5 = await stav(4713, cObch);
test('detail smazaného dealu 404 → seznam smazaných ho najde (Smazané)', s5.st === 200 && s5.o.status === 'deleted'
  && volani.length === 2 && new URL(volani[1]).searchParams.get('status') === 'deleted'
  && new URL(volani[1]).searchParams.get('ids') === '4713', { s5, volani });

/* Po 30 dnech Pipedrive smazaný deal odstraní úplně — stav už nevrátí. */
DEALY[4713] = 'zmizely';
pamet.set('pipedrive/stav/4713', JSON.stringify(Object.assign(zaznam(4713),
  { overeno: new Date(Date.now() - PD.PD_STAV_CACHE_MS - 1000).toISOString() })));
volani = [];
const s6 = await stav(4713, cObch);
test('deal zmizel i z koše → zůstává poslední známý stav „Smazané"', s6.st === 200 && s6.o.status === 'deleted'
  && s6.o.nacteno === s5.o.nacteno && s6.o.nenalezen === true && volani.length === 2, { s6, volani });
test('… a záznam serveru stav nezahodí', zaznam(4713).status === 'deleted' && zaznam(4713).nacteno === s5.o.nacteno);
volani = [];
const s6b = await stav(4713, cObch);
test('… další dotaz do 10 minut už do Pipedrive nejde', s6b.o.status === 'deleted' && volani.length === 0, volani);

const s7 = await stav(4714, cObch);
test('deal, který Pipedrive nezná a nikdo ho neviděl → stav neznámý (null)', s7.st === 200 && s7.o.status === null
  && s7.o.nenalezen === true, s7);
const s8 = await stav(4717, cObch);
test('neznámá hodnota stavu z Pipedrive se nevymýšlí (null)', s8.o.status === null, s8);

for (const [id, popis] of [[4715, 'špatný token (401)'], [4716, 'odepřený přístup (403)']]) {
  const r = await stav(id, cObch);
  test('chyba Pipedrive — ' + popis + ' → 502, nikdy 401 (prohlížeč by odhlásil)', r.st === 502 && r.o.ok === false, r);
  test('… a záznam stavu nevznikl', zaznam(id) === null, zaznam(id));
}
{ /* Chyba při obnově známého stavu ho nepřepíše. */
  pamet.set('pipedrive/stav/4715', JSON.stringify({ status: 'open', nacteno: '2026-10-01T08:00:00.000Z', overeno: '2026-10-01T08:00:00.000Z' }));
  const r = await stav(4715, cObch);
  test('chyba Pipedrive poslední známý stav nepřepíše', r.st === 502 && zaznam(4715).status === 'open'
    && zaznam(4715).nacteno === '2026-10-01T08:00:00.000Z', zaznam(4715)); }

console.log('\n===== 4) STROP NA UŽIVATELE =====\n');
{ const MAX = PD.PD_STAV_MAX;
  let proslo = 0, odmitnuto = 0, volaniNad = 0;
  for (let i = 0; i < MAX + 3; i++) {
    volani = [];
    const r = await stav(30000 + i, cAdmin);
    if (r.st === 200) proslo++;
    if (r.st === 429) { odmitnuto++; volaniNad += volani.length; }
  }
  test('čerstvá čtení stavu mají strop na uživatele (429)', proslo <= MAX && odmitnuto >= 3, { proslo, odmitnuto, MAX });
  test('… nad stropem se do Pipedrive nejde', odmitnuto > 0 && volaniNad === 0, volaniNad);
  volani = [];
  const r = await stav(4718, cObch);
  test('strop je na uživatele — obchodník čte stav dál', r.st === 200 && r.o.status === 'won', r);
  volani = [];
  const d = await get(pdDeal, 'http://x/api/pd/deal?id=31000', cAdmin);
  test('strop stavu nesdílí strop detailu dealu (detail dál 200)', d.status === 200, d.status);
  volani = [];
  const zc = await stav(4711, cAdmin);
  test('nad stropem se dál smí vrátit stav, který server zná z posledních 10 minut',
    zc.st === 200 && zc.o.status === 'won' && volani.length === 0, zc); }

console.log('\n===== 5) ULOŽENÍ ZAKÁZKY: STAV JE ÚDAJ SERVERU =====\n');
const uloz = async (zak, c, extra) => {
  const r = await post(zakazky, 'http://x/api/zakazky', Object.assign({ zakazka: zak }, extra || {}), c);
  return Object.assign({ status: r.status }, await r.json());
};
const ulozena = (soubor) => JSON.parse(pamet.get('zakazky/z/' + soubor));
const podvrh = { status: 'won', nacteno: '2030-01-01T00:00:00.000Z' };
const znovu = async (soubor, zmena, c) => {
  const g = ulozena(soubor);
  const a = G.importZakazka(JSON.parse(JSON.stringify(g)));
  zmena(a);
  return uloz(a, c, { ocekavaneRazitko: g.uloRazitko });
};

{ const z = G.novaZakazka();
  z.cislo = '2026 - OPR - CN - 7101'; z.nazevAkce = 'Stav Pipedrive'; z.pdDealId = '4799';
  z.pdStav = podvrh;
  volani = [];
  const r = await uloz(z, cAdmin);
  test('uložení: zakázka s dealem se uloží', r.status === 200 && !!r.soubor, r);
  test('uložení: stav poslaný prohlížečem se bez záznamu serveru neuloží (ani administrátorovi)',
    ulozena(r.soubor).pdStav === undefined, ulozena(r.soubor).pdStav);
  test('uložení: do Pipedrive se při ukládání nechodí', volani.length === 0, volani);
  const soubor = r.soubor;

  const s = await stav(4799, cObch);   // neuvedené id = otevřený deal
  test('příprava: server přečetl stav dealu 4799 (Otevřené)', s.o.status === 'open', s);
  const r2 = await znovu(soubor, a => { a.pdStav = podvrh; a.nazevAkce = 'Stav Pipedrive — úprava'; }, cObch);
  test('uložení obchodníkem projde', r2.status === 200, r2);
  test('uložení: podvržené „Vyhrané" nahradí stav, který zná server (Otevřené)',
    JSON.stringify(ulozena(soubor).pdStav) === JSON.stringify({ status: 'open', nacteno: s.o.nacteno }), ulozena(soubor).pdStav);

  const r3 = await znovu(soubor, a => { delete a.pdStav; a.nazevAkce = 'Stav Pipedrive — bez stavu'; }, cObch);
  pamet.delete('pipedrive/stav/4799');
  const r4 = await znovu(soubor, a => { a.pdStav = podvrh; a.nazevAkce = 'Stav Pipedrive — bez záznamu'; }, cObch);
  test('uložení bez stavu i bez záznamu serveru: stav z uložené verze téhož dealu zůstane',
    r3.status === 200 && r4.status === 200 && ulozena(soubor).pdStav && ulozena(soubor).pdStav.status === 'open'
    && ulozena(soubor).pdStav.nacteno === s.o.nacteno, ulozena(soubor).pdStav);

  pamet.set('pipedrive/stav/4799', JSON.stringify({ status: 'lost', nacteno: '2026-10-01T08:00:00.000Z', overeno: '2026-10-01T08:00:00.000Z' }));
  await znovu(soubor, a => { a.nazevAkce = 'Stav Pipedrive — starší záznam'; }, cObch);
  test('starší záznam serveru novější uložený stav nepřepíše', ulozena(soubor).pdStav.status === 'open', ulozena(soubor).pdStav);

  const r5 = await znovu(soubor, a => { a.pdDealId = '4718'; a.pdStav = podvrh; }, cAdmin);
  test('změna dealu (administrátor): uloží se stav, který server zná pro nový deal',
    r5.status === 200 && ulozena(soubor).pdDealId === '4718' && ulozena(soubor).pdStav
    && ulozena(soubor).pdStav.status === 'won' && ulozena(soubor).pdStav.nacteno === zaznam(4718).nacteno, ulozena(soubor).pdStav);
  const r5b = await znovu(soubor, a => { a.pdDealId = '4790'; }, cAdmin);
  test('změna na deal, o kterém server nic neví: stav předchozího dealu se nepřenese',
    r5b.status === 200 && ulozena(soubor).pdDealId === '4790' && ulozena(soubor).pdStav === undefined, ulozena(soubor).pdStav);

  const r6 = await znovu(soubor, a => { a.pdDealId = ''; a.pdStav = podvrh; }, cAdmin);
  test('zakázka bez dealu stav nenese', r6.status === 200 && ulozena(soubor).pdStav === undefined, ulozena(soubor).pdStav);

  const r7 = await znovu(soubor, a => { a.pdStav = { status: { toString: 1 }, nacteno: [] }; }, cObch);
  test('nesmyslný tvar stavu uložení neshodí', r7.status === 200 && ulozena(soubor).pdStav === undefined, r7); }

console.log(`\n${ok} prošlo, ${fail} selhalo`);
if (fail) console.log('\nSelhalo:\n - ' + selhalo.join('\n - '));
process.exit(fail ? 1 : 0);
