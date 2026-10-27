/* SEC-M / server-A — PŮVOD / CSRF / CORS / GET s vedlejším účinkem (bod 5),
 * + brzda per IP (bod 3). Reprodukce pokusem; smyšlené účty, paměť, bez sítě.
 *
 * Pozn.: v náhradě pro testy nemá Request hlavičku Host, proto se posílá
 * `x-forwarded-host` (čte ji hostitel()) — jinak by cizihoPuvodu() neměl proti
 * čemu Origin porovnat. Content-Type se posílá VÝSLOVNĚ (undici jinak u string
 * těla sám nastaví text/plain, což je samo o sobě „jiný typ" z B159).
 * Spuštění z kořene repa:  node podklady/SECM_pokusy/server_a/pokus_puvod.mjs
 */
import { F, S, req, prihlas, priprav, pripravData, zakazkaCislo, HESLO_ADMIN } from '../../S1_pokusy/server/harness.mjs';

const U = await priprav();
await pripravData(U.admin.cookie);
let PASS = 0, FAIL = 0;
const ok = (b, t) => { if (b) { PASS++; console.log('  OK  ' + t); } else { FAIL++; console.log(' FAIL ' + t); } };
const HOST = 'app.example';
const base = { 'x-forwarded-host': HOST };
/* legit = stejný původ + JSON; foreign = cizí Origin; nullO = Origin null; ct = jiný typ těla */
const hdr = ({ origin, ct } = {}) => ({ ...base, ...(ct ? { 'content-type': ct } : { 'content-type': 'application/json' }), ...(origin !== undefined ? { origin } : {}) });
const cObch = U.obch.cookie;
const zak = () => ({ zakazka: zakazkaCislo('2026-OCK-CN-7001') });

/* ---------- 1) zápis (POST) z různých původů ---------- */
console.log('\n[1] Zápis (POST) — původ:');
let o;
o = await req(F.zakazky, 'POST', '/api/zakazky', zak(), cObch, hdr({ origin: 'https://app.example' }));
ok(o.status === 200 || o.status === 409, 'stejný Origin + JSON → projde (200/409) [' + o.status + ']');
o = await req(F.zakazky, 'POST', '/api/zakazky', zak(), cObch, hdr({ origin: 'https://utocnik.example' }));
ok(o.status === 401, 'cizí Origin → 401 (B17) [' + o.status + ']');
o = await req(F.zakazky, 'POST', '/api/zakazky', zak(), cObch, hdr({ origin: 'null' }));
ok(o.status === 401, 'Origin: null → 401 (B159) [' + o.status + ']');
o = await req(F.zakazky, 'POST', '/api/zakazky', zak(), cObch, { ...base, 'content-type': 'application/json' }); // bez Origin
ok(o.status === 200 || o.status === 409, 'chybějící Origin (curl/testy) → projde [' + o.status + ']');

/* ---------- 2) typ těla u zápisu (s hlavičkou Origin) ---------- */
console.log('\n[2] Typ těla u zápisu (jen application/json projde):');
for (const ct of ['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x']) {
  const x = await req(F.zakazky, 'POST', '/api/zakazky', zak(), cObch, hdr({ origin: 'https://app.example', ct }));
  ok(x.status === 401, 'Origin + Content-Type ' + ct + ' → 401 (B159) [' + x.status + ']');
}

/* ---------- 3) DELETE z cizího původu ---------- */
console.log('\n[3] DELETE z cizího původu:');
const d = await req(F.zakazky, 'DELETE', '/api/zakazky?soubor=cokoliv', undefined, U.admin.cookie, hdr({ origin: 'https://utocnik.example' }));
ok(d.status === 401, 'DELETE cizí Origin → 401 [' + d.status + ']');

/* ---------- 4) přihlášení / odhlášení z cizího původu (B78) ---------- */
console.log('\n[4] Přihlášení a odhlášení z cizího původu:');
const p1 = await prihlas(U.obch.email, U.obch.heslo, hdr({ origin: 'https://utocnik.example' }));
ok(p1.stav === 403, 'přihlášení z cizí stránky → 403 [' + p1.stav + ']');
const p2 = await prihlas(U.obch.email, U.obch.heslo, hdr({ origin: 'https://app.example', ct: 'application/x-www-form-urlencoded' }));
ok(p2.stav === 403, 'přihlášení s form-urlencoded → 403 [' + p2.stav + ']');
const pNull = await prihlas(U.obch.email, U.obch.heslo, hdr({ origin: 'null' }));
ok(pNull.stav === 403, 'přihlášení z Origin: null → 403 [' + pNull.stav + ']');
const odh = await req(F.odhlaseni, 'POST', '/api/odhlaseni', {}, cObch, hdr({ origin: 'https://utocnik.example' }));
ok(odh.status === 403, 'odhlášení z cizí stránky → 403 [' + odh.status + ']');

/* ---------- 5) CORS preflight (OPTIONS) — žádné Access-Control-* ---------- */
console.log('\n[5] CORS preflight (OPTIONS) — žádné Access-Control-* hlavičky:');
for (const [n, fn, url] of [['zakazky', F.zakazky, '/api/zakazky'], ['prihlaseni', F.prihlaseni, '/api/prihlaseni'], ['ja', F.ja, '/api/ja']]) {
  const x = await req(fn, 'OPTIONS', url, undefined, null, hdr({ origin: 'https://utocnik.example' }));
  const ac = [...x.headers.keys()].filter(k => k.toLowerCase().startsWith('access-control'));
  ok(ac.length === 0, n + ' OPTIONS → žádná Access-Control-* (status ' + x.status + ')');
}

/* ---------- 6) GET s vedlejším účinkem: controlling/export ---------- */
console.log('\n[6] GET s vedlejším účinkem — /api/controlling/export:');
const sProg = await (await import('../../../netlify/lib/sdilene.mjs')).uloziste('program');
const pred = await sProg.cti('controlling_exporty');
const predN = (pred && pred.zaznamy && pred.zaznamy.length) || 0;
const ge = await req(F.controlling_export, 'GET', '/api/controlling/export?vse=1&oblast=obe&rada=obe&pd=vse', undefined, U.admin.cookie, hdr({ origin: 'https://utocnik.example' }));
const po = await sProg.cti('controlling_exporty');
const poN = (po && po.zaznamy && po.zaznamy.length) || 0;
ok(ge.status === 200, 'GET export s CIZÍM Origin projde (cizihoPuvodu hlídá jen zápisové metody) → 200 [' + ge.status + ']');
ok(poN > predN, 'GET přidal záznam do protokolu (zápis na GET): ' + predN + ' → ' + poN);
console.log('  pozn.: data (nákupní ceny) čtečka z cizí domény kvůli chybějícímu CORS nepřečte; zápis a spotřeba zdrojů ale proběhnou.');
const pdCizi = await req(F.pd_dealy, 'GET', '/api/pd/dealy', undefined, U.admin.cookie, hdr({ origin: 'https://utocnik.example' }));
ok(pdCizi.status === 403, 'srovnání: /api/pd/dealy GET cizí Origin → 403 (pdPristup hlídá i GET) [' + pdCizi.status + ']');

/* ---------- 7) brzda per IP (POKUSY_IP_MAX=60 → 429) ---------- */
console.log('\n[7] Brzda per IP (limit adresy):');
const ipHl = (ip) => ({ ...base, 'content-type': 'application/json', 'x-nf-client-connection-ip': ip, origin: 'https://app.example' });
let posledni = 0, prvni429 = -1;
for (let i = 0; i < 64; i++) {
  const x = await prihlas('ip-pokus-' + i + '@example.com', 'ZleHeslo' + i, ipHl('203.0.113.77'));
  posledni = x.stav;
  if (x.stav === 429 && prvni429 < 0) prvni429 = i + 1;
}
console.log('  první 429 u pokusu č. ' + prvni429 + ', poslední kód ' + posledni);
ok(prvni429 > 0 && prvni429 <= 62, 'limit adresy (429) kolem POKUSY_IP_MAX=60');
const jinaIp = await prihlas('cisty@example.com', 'ZleHeslo', ipHl('198.51.100.9'));
ok(jinaIp.stav === 401, 'jiná adresa limitem zasažena není (401, ne 429) [' + jinaIp.stav + ']');

console.log('\n=== VÝSLEDEK pokus_puvod: PASS=' + PASS + ' FAIL=' + FAIL + ' ===');
