/* O3 #521 — SEC-Z2 (živý test S2 26. 10. 2026, nízký, mění chování: ne).
 *
 * Odpovědi serverových funkcí nenesly CSP ani Referrer-Policy: `[[headers]]`
 * z netlify.toml se na funkce s `config.path` neuplatní, takže je musí nést
 * každá odpověď sama (stejně jako `no-store` a `nosniff`, SEC-I1). Odpovědi
 * jsou JSON — `default-src 'none'` nic nerozbije, jen zakáže prohlížeči
 * cokoli spustit nebo načíst, kdyby se odpověď otevřela jako stránka;
 * `frame-ancestors 'none'` zakáže vložit ji do rámu. Hlídá se:
 *  1) společné hlavičky JSON_HLAVICKY a json() (i chybová odpověď);
 *  2) volající, který přebije jednu hlavičku, ostatní neztratí;
 *  3) skutečné funkce: zdravi (bez relace), zakazky 401, uzivatele 200,
 *     controlling/export (vlastní Response, dřív bez nosniff i CSP).
 *
 * Paměťové úložiště, smyšlené účty, bez sítě.
 * Spuštění: node netlify/test_sec_z2.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
    .map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
globalThis.fetch = async (u) => { throw new Error('SÍŤ ZAKÁZÁNA: ' + u); };

const S = await import('./lib/sdilene.mjs');
const F = {};
for (const n of ['prihlaseni', 'zdravi', 'zakazky', 'uzivatele', 'controlling_export'])
  F[n] = (await import('./functions/' + n + '.mjs')).default;

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info))); } };
const req = (fn, metoda, url, telo, cookie) => fn(new Request('http://x' + url, {
  method: metoda, headers: cookie ? { cookie } : {},
  ...(telo !== undefined ? { body: JSON.stringify(telo) } : {}) }));

const CSP = "default-src 'none'; frame-ancestors 'none'";
const hlidej = (n, r) => {
  test(n + ': Content-Security-Policy', r.headers.get('content-security-policy') === CSP, r.headers.get('content-security-policy'));
  test(n + ': Referrer-Policy no-referrer', r.headers.get('referrer-policy') === 'no-referrer', r.headers.get('referrer-policy'));
  test(n + ': Cache-Control no-store zůstává', r.headers.get('cache-control') === 'no-store', r.headers.get('cache-control'));
  test(n + ': nosniff zůstává', r.headers.get('x-content-type-options') === 'nosniff');
  test(n + ': Content-Type JSON', /^application\/json/.test(r.headers.get('content-type') || ''), r.headers.get('content-type'));
};

/* ---------- 1) společné hlavičky ---------- */
test('JSON_HLAVICKY nese CSP', S.JSON_HLAVICKY['Content-Security-Policy'] === CSP, S.JSON_HLAVICKY);
test('JSON_HLAVICKY nese Referrer-Policy', S.JSON_HLAVICKY['Referrer-Policy'] === 'no-referrer', S.JSON_HLAVICKY);
test('JSON_HLAVICKY je zmrazený', Object.isFrozen(S.JSON_HLAVICKY));
hlidej('json() 200', S.json({ ok: true }));
hlidej('json() 403', S.json({ chyba: 'x' }, 403));

/* ---------- 2) přebití jedné hlavičky ---------- */
{
  const r = S.json({ ok: true }, 200, { 'Cache-Control': 'private, max-age=60' });
  test('přebití Cache-Control platí', r.headers.get('cache-control') === 'private, max-age=60');
  test('přebití Cache-Control nezruší CSP', r.headers.get('content-security-policy') === CSP);
  test('přebití Cache-Control nezruší Referrer-Policy', r.headers.get('referrer-policy') === 'no-referrer');
}

/* ---------- 3) skutečné funkce ---------- */
hlidej('zdravi', await req(F.zdravi, 'GET', '/api/zdravi'));
{
  const r = await req(F.zakazky, 'GET', '/api/zakazky');
  test('zakazky bez relace → 401', r.status === 401, r.status);
  hlidej('zakazky 401', r);
}
const pr = await req(F.prihlaseni, 'POST', '/api/prihlaseni',
  { email: process.env.ADMIN_EMAIL, heslo: process.env.ADMIN_INIT_HESLO });
const cA = (pr.headers.get('set-cookie') || '').split(';')[0];
test('přihlášení správce', pr.status === 200 && !!cA, pr.status);
{
  const r = await req(F.uzivatele, 'GET', '/api/uzivatele', undefined, cA);
  test('uzivatele → 200', r.status === 200, r.status);
  hlidej('uzivatele 200', r);
}
{
  const r = await req(F.controlling_export, 'GET', '/api/controlling/export?od=2026-01-01&do=2026-12-31', undefined, cA);
  test('controlling/export → 200', r.status === 200, [r.status, await r.clone().text()]);
  hlidej('controlling/export 200', r);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
