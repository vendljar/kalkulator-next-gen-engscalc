/* PoC AU (audit 20. 11. 2026, čočka AU): relace, role a správa účtů — sada
 * útoků, u kterých se čeká ODOLNÉ. Každý řádek je jeden pokus; „DRŽÍ" =
 * server odmítl, „PRŮNIK" = prošlo, co projít nemělo.
 *
 *   node podklady/audit_2026-11-20/poc_AU_relace_a_prava.mjs
 *   KNG_STROM=<export origin/main> node …/poc_AU_relace_a_prava.mjs
 * Bez sítě: paměťové úložiště, smyšlené účty @priklad.cz. */
import { pathToFileURL } from 'node:url';
import { createHmac } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
const R = path.resolve(process.env.KNG_STROM || new URL('../..', import.meta.url).pathname) + '/';
const imp = (p) => import(pathToFileURL(R + p).href);
const TAJ = 'poc-tajemstvi-jen-pro-lokalni-beh';
process.env.TAJEMSTVI_RELACE = TAJ;
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = 'spravce@priklad.cz';
delete process.env.PROSTREDI;
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { if (v === null) pamet.delete(nazev + '/' + k); else pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
const { default: prihlaseni } = await imp('netlify/functions/prihlaseni.mjs');
const { default: odhlaseni } = await imp('netlify/functions/odhlaseni.mjs');
const { default: ja } = await imp('netlify/functions/ja.mjs');
const { default: uzivatele } = await imp('netlify/functions/uzivatele.mjs');
const S = await imp('netlify/lib/sdilene.mjs');

let drzi = 0, prunik = 0;
const radek = (nazev, ok, info) => { if (ok) drzi++; else prunik++;
  console.log((ok ? 'DRŽÍ   ' : 'PRŮNIK ') + nazev + (info ? '  [' + info + ']' : '')); };
const J = { 'content-type': 'application/json' };
const post = (fn, cesta, telo, h) => fn(new Request('http://x' + cesta, { method: 'POST', headers: { ...J, ...(h || {}) }, body: JSON.stringify(telo) }));
const prihlas = (email, heslo, h) => post(prihlaseni, '/api/prihlaseni', { email, heslo }, h);
const cookieZ = (r) => (r.headers.get('set-cookie') || '').split(';')[0];
const kdo = async (cookie, h) => { const r = await ja(new Request('http://x/api/ja', { headers: { cookie, ...(h || {}) } })); return { s: r.status, d: await r.json() }; };
const uz = async (cookie, telo, h) => { const r = await post(uzivatele, '/api/uzivatele', telo, { cookie, ...(h || {}) }); return { s: r.status, d: await r.json() }; };
const ucet = (e) => JSON.parse(pamet.get('uzivatele/' + e) || 'null');

const rA = await prihlas('spravce@priklad.cz', 'Docasne.Heslo.123');
const cA = cookieZ(rA);
console.log('cookie: ' + (rA.headers.get('set-cookie') || '').replace(/relace=[^;]+/, 'relace=<…>'));
await uz(cA, { akce: 'zaloz', email: 'obchodnik@priklad.cz', jmeno: 'Ob Chodník', role: 'Obchodník', heslo: 'ObchodnikHeslo1' });
await uz(cA, { akce: 'zaloz', email: 'kolega@priklad.cz', jmeno: 'Ko Lega', role: 'Obchodník', heslo: 'KolegaHeslo123' });
await uz(cA, { akce: 'zaloz', email: 'vedouci@priklad.cz', jmeno: 'Ve Doucí', role: 'Vedoucí', heslo: 'VedouciHeslo12' });
const cO = cookieZ(await prihlas('obchodnik@priklad.cz', 'ObchodnikHeslo1'));
const cV = cookieZ(await prihlas('vedouci@priklad.cz', 'VedouciHeslo12'));

console.log('\n== 1. Obchodník / Vedoucí proti správě účtů ==');
for (const [kdoTo, c] of [['Obchodník', cO], ['Vedoucí', cV]]) {
  const pokusy = [
    ['zaloz účet správce', { akce: 'zaloz', email: 'novy@priklad.cz', jmeno: 'N', role: 'Administrátor', heslo: 'NoveHeslo1234' }],
    ['role sobě', { akce: 'role', email: kdoTo === 'Obchodník' ? 'obchodnik@priklad.cz' : 'vedouci@priklad.cz', role: 'Administrátor' }],
    ['reset hesla kolegy', { akce: 'heslo', email: 'kolega@priklad.cz', heslo: 'PrevzatyUcet12' }],
    ['vypnutí kolegy', { akce: 'aktivni', email: 'kolega@priklad.cz', aktivni: false }],
    ['archivace kolegy', { akce: 'archiv', email: 'kolega@priklad.cz', archiv: true }],
    ['převod zakázek', { akce: 'prevod', email: 'kolega@priklad.cz', na: 'obchodnik@priklad.cz' }],
    ['smazání kolegy', { akce: 'smaz', email: 'kolega@priklad.cz' }],
    ['profil kolegy', { akce: 'profil', email: 'kolega@priklad.cz', jmeno: 'Podvržené' }],
    ['podpis kolegy', { akce: 'podpis', email: 'kolega@priklad.cz', obrazek: 'data:image/png;base64,AAAA' }],
    ['profil kolegy (velká písmena, mezery)', { akce: 'profil', email: '  KOLEGA@priklad.cz ', jmeno: 'Podvržené' }],
  ];
  for (const [n, t] of pokusy) { const o = await uz(c, t); radek(kdoTo + ': ' + n, o.s === 403, 'HTTP ' + o.s); }
  const g = await uzivatele(new Request('http://x/api/uzivatele', { headers: { cookie: c } }));
  radek(kdoTo + ': výpis účtů (GET)', g.status === 403, 'HTTP ' + g.status);
}
/* hromadné přiřazení: vlastní profil s poli navíc */
const pred = ucet('obchodnik@priklad.cz');
const o1 = await uz(cO, { akce: 'profil', jmeno: 'Ob Chodník', role: 'Administrátor', aktivni: true, heslo: 'x', hesloVerze: 0,
  email: 'obchodnik@priklad.cz', archiv: false, zalozil: 'x', __proto__: { role: 'Administrátor' }, constructor: { prototype: { role: 'Administrátor' } } });
const po = ucet('obchodnik@priklad.cz');
radek('vlastní profil s poli role/heslo/hesloVerze/aktivni navíc nezmění nic než profil',
  po.role === 'Obchodník' && po.heslo === pred.heslo && po.hesloVerze === pred.hesloVerze && po.email === pred.email, 'HTTP ' + o1.s + ', role ' + po.role);
radek('po pokusu má /api/ja pořád roli Obchodník', (await kdo(cO)).d.role === 'Obchodník');

console.log('\n== 2. Role z požadavku (náhled role, hlavička, parametr, cookie) ==');
const r2 = await ja(new Request('http://x/api/ja?role=Administr%C3%A1tor&nahledRole=Administr%C3%A1tor', { headers: { cookie: cO,
  'x-role': 'Administrator', 'x-nahled-role': 'Administrator', 'x-kng-role': 'Administrator' } }));
radek('parametr a hlavičky s rolí: /api/ja vrací roli z účtu', (await r2.json()).role === 'Obchodník');
const g2 = await uzivatele(new Request('http://x/api/uzivatele?role=Administr%C3%A1tor', { headers: { cookie: cO + '; role=Administrátor; nahledRole=Administrátor' } }));
radek('cookie „role" vedle relace: výpis účtů odmítnut', g2.status === 403, 'HTTP ' + g2.status);
/* přepsané tělo cookie se starým podpisem */
const [telo, pod] = cO.slice('relace='.length).split('.');
const obsah = JSON.parse(Buffer.from(telo, 'base64url').toString());
const telo2 = Buffer.from(JSON.stringify({ ...obsah, role: 'Administrátor', email: 'spravce@priklad.cz' })).toString('base64url');
radek('cookie s přepsaným tělem a původním podpisem', (await kdo('relace=' + telo2 + '.' + pod)).s === 401);
radek('cookie bez podpisu', (await kdo('relace=' + telo2 + '.')).s === 401);
radek('cookie s podpisem prázdným klíčem', (await kdo('relace=' + telo2 + '.' + createHmac('sha256', '').update(telo2).digest('base64url'))).s === 401);
/* role v PLATNĚ podepsané cookie se nepoužije: správce sníží roli, stará cookie nese „Vedoucí" */
await uz(cA, { akce: 'role', email: 'vedouci@priklad.cz', role: 'Obchodník' });
const kv = await kdo(cV);
radek('snížení role platí hned i pro starou cookie (role z účtu, ne z cookie)', kv.d.role === 'Obchodník', 'cookie nese ' + JSON.parse(Buffer.from(cV.slice(7).split('.')[0], 'base64url')).role + ', server ' + kv.d.role);

console.log('\n== 3. Životnost relace ==');
const cO2 = cookieZ(await prihlas('obchodnik@priklad.cz', 'ObchodnikHeslo1'));   // druhé zařízení
await post(odhlaseni, '/api/odhlaseni', {}, { cookie: cO });
radek('po odhlášení stará cookie neplatí', (await kdo(cO)).s === 401);
radek('odhlášení ukončí i druhé zařízení („odhlásit všude")', (await kdo(cO2)).s === 401);
const cO3 = cookieZ(await prihlas('obchodnik@priklad.cz', 'ObchodnikHeslo1'));
const zm = await post(uzivatele, '/api/uzivatele', { akce: 'mojeheslo', stare: 'ObchodnikHeslo1', nove: 'NoveObchodnik12' }, { cookie: cO3 });
radek('po změně hesla stará cookie neplatí', (await kdo(cO3)).s === 401);
radek('změna hesla vydá novou platnou cookie', (await kdo(cookieZ(zm))).s === 200);
const cK = cookieZ(await prihlas('kolega@priklad.cz', 'KolegaHeslo123'));
await uz(cA, { akce: 'heslo', email: 'kolega@priklad.cz', heslo: 'ResetKolega123', hesloSpravce: 'Docasne.Heslo.123' });
radek('po resetu hesla správcem stará cookie neplatí', (await kdo(cK)).s === 401);
const cK2 = cookieZ(await prihlas('kolega@priklad.cz', 'ResetKolega123'));
await uz(cA, { akce: 'aktivni', email: 'kolega@priklad.cz', aktivni: false });
radek('vypnutý účet: cookie neplatí', (await kdo(cK2)).s === 401);
radek('vypnutý účet: přihlášení správným heslem odmítnuto', (await prihlas('kolega@priklad.cz', 'ResetKolega123')).status === 401);
await uz(cA, { akce: 'aktivni', email: 'kolega@priklad.cz', aktivni: true });
radek('po zapnutí cookie z doby před vypnutím neožije', (await kdo(cK2)).s === 401);
const cK3 = cookieZ(await prihlas('kolega@priklad.cz', 'ResetKolega123'));
await uz(cA, { akce: 'smaz', email: 'kolega@priklad.cz' });
await uz(cA, { akce: 'zaloz', email: 'kolega@priklad.cz', jmeno: 'Nový Kolega', role: 'Obchodník', heslo: 'UplneJineHeslo1' });
radek('smazaný a znovu založený účet: stará cookie neožije', (await kdo(cK3)).s === 401);
/* vypršelá cookie se správným podpisem */
const stare = Buffer.from(JSON.stringify({ email: 'spravce@priklad.cz', role: 'Administrátor', hv: ucet('spravce@priklad.cz').hesloVerze, exp: Date.now() - 1000 })).toString('base64url');
radek('vypršelá cookie (správný podpis)', (await kdo('relace=' + stare + '.' + createHmac('sha256', TAJ).update(stare).digest('base64url'))).s === 401);

console.log('\n== 4. Cookie z testovacího webu na ostrém (stejné tajemství) ==');
/* test podepisuje „test|<tělo>"; ostrý web (bez PROSTREDI) podepisuje jen tělo.
 * Pokus: předložit ostrému webu tělo „test|<tělo>" s podpisem z testu. */
const hv = ucet('spravce@priklad.cz').hesloVerze;
const teloT = Buffer.from(JSON.stringify({ email: 'spravce@priklad.cz', role: 'Administrátor', hv, exp: Date.now() + 3600e3 })).toString('base64url');
const podT = createHmac('sha256', TAJ).update('test|' + teloT).digest('base64url');      // tak by ji vydal testovací web
radek('testovací cookie předložená ostrému webu jak je', (await kdo('relace=' + teloT + '.' + podT)).s === 401);
radek('testovací cookie s tělem „test|<tělo>" (podpis pak sedí)', (await kdo('relace=test|' + teloT + '.' + podT)).s === 401,
  'ověření podpisu: ' + (S.relaceOver('relace=test|' + teloT + '.' + podT) ? 'PROŠLO' : 'odmítnuto (tělo nejde přečíst jako JSON)'));

console.log('\n== 5. Původ požadavku (CSRF) ==');
const cA2 = cA;
const csrf = async (h, telo, n) => { const o = await uz(cA2, telo || { akce: 'profil', telefon: '000' }, h); radek(n, o.s === 401, 'HTTP ' + o.s); };
await csrf({ origin: 'https://utocnik.priklad.cz', host: 'x' }, null, 'POST s cizím Origin');
await csrf({ origin: 'null', host: 'x' }, null, 'POST s Origin: null');
{ const r = await uzivatele(new Request('http://x/api/uzivatele', { method: 'POST', headers: { cookie: cA2, origin: 'http://x', host: 'x', 'content-type': 'text/plain' }, body: JSON.stringify({ akce: 'profil', telefon: '000' }) }));
  radek('POST text/plain se stejným Origin (tvar „jednoduchého" požadavku)', r.status === 401, 'HTTP ' + r.status); }
{ const r = await prihlas('spravce@priklad.cz', 'Docasne.Heslo.123', { origin: 'https://utocnik.priklad.cz', host: 'x' });
  radek('přihlášení z cizího původu (login CSRF)', r.status === 403, 'HTTP ' + r.status); }
{ const r = await post(odhlaseni, '/api/odhlaseni', {}, { cookie: cA2, origin: 'https://utocnik.priklad.cz', host: 'x' });
  radek('odhlášení z cizího původu', r.status === 403 && (await kdo(cA2)).s === 200, 'HTTP ' + r.status); }
{ const r = await odhlaseni(new Request('http://x/api/odhlaseni', { headers: { cookie: cA2 } }));
  radek('odhlášení přes GET (odkaz)', r.status === 405 && (await kdo(cA2)).s === 200, 'HTTP ' + r.status); }
{ const r = await ja(new Request('http://x/api/ja', { headers: { cookie: cA2, origin: 'https://utocnik.priklad.cz', host: 'x' } }));
  const h = [...r.headers.keys()].filter(k => k.startsWith('access-control'));
  radek('odpovědi nenesou žádnou hlavičku Access-Control-* (CORS vypnutý)', h.length === 0, h.join(',') || 'žádná'); }

console.log('\n== 6. Chybí tajemství relace ==');
delete process.env.TAJEMSTVI_RELACE;
let vyj = '';
try { const o = await kdo(cA2); vyj = 'HTTP ' + o.s; } catch (e) { vyj = 'výjimka: ' + String(e.message).slice(0, 60) + '…'; }
radek('bez TAJEMSTVI_RELACE se cookie neověří (žádný výchozí klíč)', /výjimka/.test(vyj) || /HTTP (401|500|503)/.test(vyj), vyj);
process.env.TAJEMSTVI_RELACE = 'testovaci-kratke';
try { const o = await kdo(cA2); vyj = 'HTTP ' + o.s; } catch (e) { vyj = 'výjimka'; }
radek('tajemství kratší než 16 znaků se odmítne', vyj === 'výjimka', vyj);
process.env.TAJEMSTVI_RELACE = TAJ;

console.log('\n== 7. Výčet účtů z odpovědi ==');
{ const a = await prihlas('obchodnik@priklad.cz', 'spatneheslo1'); const b = await prihlas('neexistuje@priklad.cz', 'spatneheslo1');
  const ta = await a.text(), tb = await b.text();
  radek('špatné heslo: existující a neexistující účet mají stejnou odpověď', a.status === b.status && ta === tb, a.status + ' / ' + b.status);
  const mer = async (e) => { const t = []; for (let i = 0; i < 12; i++) { const t0 = process.hrtime.bigint(); await prihlas(e + '', 'spatneheslo' + i, { 'x-nf-client-connection-ip': '192.0.2.' + (i + 1) }); t.push(Number(process.hrtime.bigint() - t0) / 1e6); } t.sort((x, y) => x - y); return t[6]; };
  const m1 = await mer('vedouci@priklad.cz'), m2 = await mer('nikdo-takovy@priklad.cz');
  radek('čas odpovědi (medián z 12): existující ' + m1.toFixed(1) + ' ms, neexistující ' + m2.toFixed(1) + ' ms', Math.abs(m1 - m2) < Math.max(m1, m2) * 0.35); }

console.log('\n' + (prunik === 0 ? 'ODOLNÉ: všech ' + drzi + ' pokusů server odmítl.' : 'ZRANITELNÉ: ' + prunik + ' pokusů prošlo (' + drzi + ' odmítnuto).'));
process.exit(0);
