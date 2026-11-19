/* PoC AU-1 (audit 20. 11. 2026, čočka AU): brzda proti hádání hesel a SOUBĚH.
 *
 * Počítadla pokusů (e-mail i adresa) jsou čtení–změna–zápis bez výhradního
 * úseku (`vyhradne` je nemá, na rozdíl od stropu Pipedrive B158). Požadavky
 * poslané NAJEDNOU přečtou tutéž hodnotu a zapíšou n+1 — limit adresy (60 za
 * 15 min, rozhoduje se před ověřením hesla) ani zpoždění tak neplatí pro
 * útočníka, který hesla posílá souběžně. PoC měří, kolik hesel jde z JEDNÉ
 * adresy vyzkoušet v jedné vlně a jestli mezi nimi projde to správné.
 *
 * Úložiště: paměť se zpožděním 2 ms na čtení i zápis (Netlify Blobs je síťové
 * volání; bez zpoždění se PoC pouští s KNG_BEZ_ZPOZDENI=1).
 *   node podklady/audit_2026-11-20/poc_AU_soubeh_pocitadla.mjs
 *   KNG_STROM=<export origin/main> node …/poc_AU_soubeh_pocitadla.mjs
 * Bez sítě, smyšlené účty @priklad.cz. */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const R = path.resolve(process.env.KNG_STROM || new URL('../..', import.meta.url).pathname) + '/';
const imp = (p) => import(pathToFileURL(R + p).href);
process.env.TAJEMSTVI_RELACE = 'testovaci-poc-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = 'spravce@priklad.cz';
const ZPOZDENI = process.env.KNG_BEZ_ZPOZDENI ? 0 : 2;
const cekej = () => (ZPOZDENI ? new Promise(r => setTimeout(r, ZPOZDENI)) : Promise.resolve());
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { await cekej(); return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { await cekej(); if (v === null) pamet.delete(nazev + '/' + k); else pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
const { default: prihlaseni } = await imp('netlify/functions/prihlaseni.mjs');
const { default: uzivatele } = await imp('netlify/functions/uzivatele.mjs');
const S = await imp('netlify/lib/sdilene.mjs');

const IP = '198.51.100.77';
const prihlas = (email, heslo, ip) => prihlaseni(new Request('http://x/api/prihlaseni', { method: 'POST',
  headers: { 'content-type': 'application/json', ...(ip ? { 'x-nf-client-connection-ip': ip } : {}) },
  body: JSON.stringify({ email, heslo }) }));
const cookieZ = (r) => (r.headers.get('set-cookie') || '').split(';')[0];

const rA = await prihlas(process.env.ADMIN_EMAIL, 'Docasne.Heslo.123', '203.0.113.1');
const cA = cookieZ(rA);
const HESLO_OBETI = 'Leto2026x';
await uzivatele(new Request('http://x/api/uzivatele', { method: 'POST', headers: { cookie: cA, 'content-type': 'application/json' },
  body: JSON.stringify({ akce: 'zaloz', email: 'obet@priklad.cz', jmeno: 'Oběť', role: 'Obchodník', heslo: HESLO_OBETI }) }));

/* ---- kontrola: popořadě brzda drží ---- */
let stavy = [];
for (let i = 0; i < S.POKUSY_IP_MAX + 5; i++) stavy.push((await prihlas('obet@priklad.cz', 'spatne-' + i, '198.51.100.10')).status);
const poporade429 = stavy.filter(s => s === 429).length;
console.log('popořadě z jedné adresy: ' + stavy.length + ' pokusů, z toho 429: ' + poporade429
  + ' (limit adresy ' + S.POKUSY_IP_MAX + ', limit e-mailu ' + S.POKUSY_MAX + ')');
/* počítadlo e-mailu vynulovat, ať vlna začíná z čistého stavu */
await S.pokusyReset('obet@priklad.cz');

/* ---- útok: jedna vlna N souběžných pokusů z jedné adresy ---- */
const N = 400;
const slovnik = Array.from({ length: N }, (_, i) => 'Heslo' + i + 'xx');
slovnik[N - 37] = HESLO_OBETI;                       // správné heslo je v dávce až mezi posledními
const t0 = Date.now();
const odp = await Promise.all(slovnik.map(h => prihlas('obet@priklad.cz', h, IP).then(r => ({ h, s: r.status }))));
const ms = Date.now() - t0;
const pocty = odp.reduce((a, o) => (a[o.s] = (a[o.s] || 0) + 1, a), {});
const uhodnuto = odp.some(o => o.s === 200 && o.h === HESLO_OBETI);
const ipStav = JSON.parse(pamet.get('pokusy/' + S.pokusyIpKlic(IP)) || '{}');
const eStav = JSON.parse(pamet.get('pokusy/e:obet@priklad.cz') || '{}');
console.log('vlna ' + N + ' souběžných pokusů z ' + IP + ' (' + ms + ' ms): stavy ' + JSON.stringify(pocty));
console.log('počítadlo adresy po vlně: n=' + ipStav.n + ' (mělo být ' + N + '), počítadlo e-mailu: n=' + eStav.n);
console.log('ověřeno hesel scryptem (401/200, ne 429 adresy): ' + ((pocty[401] || 0) + (pocty[200] || 0)) + ' z ' + N
  + '; správné heslo ve vlně ' + (uhodnuto ? 'PROŠLO (200)' : 'neprošlo'));

/* druhá vlna hned poté: počítadlo adresy je pořád hluboko pod limitem */
const odp2 = await Promise.all(Array.from({ length: N }, (_, i) => prihlas('jiny' + (i % 7) + '@priklad.cz', 'Druha' + i + 'vlna', IP).then(r => r.status)));
const pocty2 = odp2.reduce((a, s) => (a[s] = (a[s] || 0) + 1, a), {});
const ipStav2 = JSON.parse(pamet.get('pokusy/' + S.pokusyIpKlic(IP)) || '{}');
console.log('druhá vlna ' + N + ' (jiné e-maily, táž adresa): stavy ' + JSON.stringify(pocty2) + ', počítadlo adresy n=' + ipStav2.n);

const overeno = (pocty[401] || 0) + (pocty[200] || 0);
const zranitelne = overeno > S.POKUSY_IP_MAX + 1 && uhodnuto;
console.log('\n' + (zranitelne
  ? 'ZRANITELNÉ: z jedné adresy šlo v jedné vlně ověřit ' + overeno + ' hesel (limit ' + S.POKUSY_IP_MAX + ' za 15 min) a správné heslo prošlo.'
  : 'ODOLNÉ: souběžná vlna limit adresy nepřekročila.'));
process.exit(0);
