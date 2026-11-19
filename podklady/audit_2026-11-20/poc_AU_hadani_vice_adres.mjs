/* PoC AU-3/AU-4 (audit 20. 11. 2026, čočka AU): co brzda přihlášení NEdělá.
 *
 *  (1) Počítadlo e-mailu nikdy nebrání správnému heslu (zásada #92) — heslo se
 *      ověřuje i po 10 neúspěších. Jediný tvrdý strop je tedy adresa
 *      (60 pokusů / 15 min, IPv6 po /64). Útočník s víc adresami (blok IPv6
 *      /48 = 65 536 bloků /64) hádá jedno heslo dál; PoC posílá POPOŘADĚ
 *      (žádný souběh) 40 pokusů z každého z 30 bloků /64.
 *  (2) Adresa klienta: bez hlavičky x-nf-client-connection-ip se bere první
 *      položka X-Forwarded-For (tu si klient píše sám) a bez obou se limit
 *      adresy nevede vůbec. Na Netlify hlavičku doplňuje platforma
 *      (neověřeno živě — audit nesmí na síť); týká se běhu mimo Netlify.
 *  (3) Síla hesla: hlídá se jen délka 8–200.
 *
 *   node podklady/audit_2026-11-20/poc_AU_hadani_vice_adres.mjs
 * Bez sítě, smyšlené účty @priklad.cz. */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const R = path.resolve(process.env.KNG_STROM || new URL('../..', import.meta.url).pathname) + '/';
const imp = (p) => import(pathToFileURL(R + p).href);
process.env.TAJEMSTVI_RELACE = 'testovaci-poc-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = 'spravce@priklad.cz';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { if (v === null) pamet.delete(nazev + '/' + k); else pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
const { default: prihlaseni } = await imp('netlify/functions/prihlaseni.mjs');
const { default: uzivatele } = await imp('netlify/functions/uzivatele.mjs');
const S = await imp('netlify/lib/sdilene.mjs');
const prihlas = (email, heslo, h) => prihlaseni(new Request('http://x/api/prihlaseni', { method: 'POST',
  headers: { 'content-type': 'application/json', ...(h || {}) }, body: JSON.stringify({ email, heslo }) }));
const cA = ((await prihlas('spravce@priklad.cz', 'Docasne.Heslo.123', { 'x-nf-client-connection-ip': '203.0.113.1' })).headers.get('set-cookie') || '').split(';')[0];
const zaloz = async (email, heslo) => { const r = await uzivatele(new Request('http://x/api/uzivatele', { method: 'POST', headers: { cookie: cA, 'content-type': 'application/json' },
  body: JSON.stringify({ akce: 'zaloz', email, jmeno: 'Účet', role: 'Obchodník', heslo }) })); return r.status; };
let zranitelne = 0;

/* ---- (1) jedno heslo, hodně adres, popořadě ---- */
await zaloz('obet@priklad.cz', 'Podzim2026!');
let overeno = 0, odmitnuto429adresa = 0, uhodl = false, pokus = 0;
for (let blok = 0; blok < 30 && !uhodl; blok++) {
  const ip = '2001:db8:77:' + blok.toString(16) + '::1';             // každý blok /64 má vlastní počítadlo
  for (let i = 0; i < 40; i++) {
    pokus++;
    const heslo = (pokus === 1150) ? 'Podzim2026!' : 'Tip-' + pokus + '-xx';
    const r = await prihlas('obet@priklad.cz', heslo, { 'x-nf-client-connection-ip': ip });
    const t = await r.text();
    if (r.status === 200) { uhodl = true; overeno++; break; }
    if (r.status === 429 && /z této adresy/.test(t)) odmitnuto429adresa++; else overeno++;   // 401 i 429 e-mailu = heslo se ověřilo
  }
}
const e = JSON.parse(pamet.get('pokusy/e:obet@priklad.cz') || '{}');
console.log('(1) ' + pokus + ' pokusů popořadě z 30 bloků /64 na jeden účet: heslo ověřeno ' + overeno + '×, odmítnuto limitem adresy '
  + odmitnuto429adresa + '×; správné heslo jako ' + (uhodl ? pokus + '. pokus PROŠLO' : 'neprošlo') + ' (počítadlo e-mailu před úspěchem > ' + S.POKUSY_MAX + ')');
if (uhodl && overeno > S.POKUSY_IP_MAX) zranitelne++;

/* ---- (2) adresa z X-Forwarded-For / bez adresy ---- */
await zaloz('druhy@priklad.cz', 'Jaro2026abc!');
let s2 = [];
for (let i = 0; i < 100; i++) s2.push((await prihlas('nikdo' + i + '@priklad.cz', 'spatne-heslo', { 'x-forwarded-for': '10.' + (i % 250) + '.0.9, 198.51.100.5' })).status);
const xff429 = s2.filter(x => x === 429).length;
let s3 = [];
for (let i = 0; i < 100; i++) s3.push((await prihlas('zadny' + i + '@priklad.cz', 'spatne-heslo')).status);
const bez429 = s3.filter(x => x === 429).length;
console.log('(2) 100 pokusů (různé e-maily) s vlastní první položkou X-Forwarded-For, bez x-nf-client-connection-ip: 429 = ' + xff429
  + '; 100 pokusů bez jakékoli adresy: 429 = ' + bez429 + ', klíčů „ip:" bez adresy v úložišti: '
  + [...pamet.keys()].filter(k => k === 'pokusy/ip:').length);
const sNf = [];
for (let i = 0; i < 70; i++) sNf.push((await prihlas('treti' + i + '@priklad.cz', 'spatne-heslo', { 'x-nf-client-connection-ip': '198.51.100.200', 'x-forwarded-for': '10.' + i + '.0.9' })).status);
console.log('    kontrola: s hlavičkou x-nf-client-connection-ip má ta přednost (X-Forwarded-For se střídá): 429 = ' + sNf.filter(x => x === 429).length + ' ze 70');
if (xff429 === 0 && bez429 === 0) zranitelne++;

/* ---- (3) síla hesla ---- */
const slaba = [];
for (const h of ['12345678', 'aaaaaaaa', 'heslo123', '        ', 'slabe@priklad.cz'.slice(0, 8)]) slaba.push(JSON.stringify(h) + '→' + await zaloz('slabe' + slaba.length + '@priklad.cz', h));
console.log('(3) založení účtu se slabým heslem (HTTP): ' + slaba.join(', '));

console.log('\n' + (zranitelne
  ? 'ZRANITELNÉ (mez návrhu): hádání hesla z více adres strop nemá a mimo Netlify jde limit adresy obejít hlavičkou (' + zranitelne + ' ze 2).'
  : 'ODOLNÉ: hádání z více adres i podvržená adresa narazily na limit.'));
process.exit(0);
