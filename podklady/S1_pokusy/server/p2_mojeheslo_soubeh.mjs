/* Souběh „mojeheslo" × zásah správce (rozšíření B156).
 * Okno mezi čtením účtu (uzivatele.mjs:97) a zápisem (:125) tvoří v ostrém
 * běhu zápisy počítadel pokusů + pockej(zpozdeniMs(n)) (až 2000 ms, když si
 * uživatel předem nahoní neúspěchy) + scrypt. V testovacím úložišti je
 * pockej() vypnutý, proto okno nahrazuje zdržení zápisu do úložiště „pokusy"
 * pro e-mail oběti (stejné místo v toku: po čtení účtu, před zápisem). */
import { priprav, F, req, pamet, S } from './harness.mjs';
const U = await priprav();
const ucet = (e) => JSON.parse(pamet.get('uzivatele/' + e) || 'null');
console.log('zpozdeniMs(11) =', S.zpozdeniMs(11), 'ms (po 10 neúspěších, i se SPRÁVNÝM heslem)');
const ZDRZ = 80;
globalThis.__ZPOZDI_ZAPIS = async (n, k) => { if (n === 'pokusy' && k === 'e:' + U.admin2.email && globalThis.__drz) await new Promise(r => setTimeout(r, ZDRZ)); };

async function scenar(nazev, zasah, kontrola) {
  globalThis.__drz = true;
  const mh = req(F.uzivatele, 'POST', '/api/uzivatele', { akce: 'mojeheslo', stare: U.admin2.heslo, nove: U.admin2.heslo }, U.admin2.cookie);
  await new Promise(r => setTimeout(r, 10));
  const z = await (await req(F.uzivatele, 'POST', '/api/uzivatele', zasah, U.admin.cookie)).json();
  const poZasahu = ucet(U.admin2.email);
  const r = await mh; const t = await r.json();
  globalThis.__drz = false;
  if (r.headers.get('set-cookie')) U.admin2.cookie = r.headers.get('set-cookie').split(';')[0];
  const po = ucet(U.admin2.email);
  console.log('\n== ' + nazev + ' ==');
  console.log('zásah správce:', JSON.stringify(z));
  console.log('účet hned po zásahu:', poZasahu ? JSON.stringify({ role: poZasahu.role, aktivni: poZasahu.aktivni }) : 'null (smazán)');
  console.log('mojeheslo:', r.status, JSON.stringify(t));
  console.log('účet na konci:', po ? JSON.stringify({ role: po.role, aktivni: po.aktivni }) : 'null');
  const ja = await (await req(F.ja, 'GET', '/api/ja', undefined, U.admin2.cookie)).json();
  console.log('/api/ja s cookie z mojeheslo:', JSON.stringify({ ok: ja.ok, role: ja.role }));
  console.log('VÝSLEDEK:', kontrola(po, ja) ? 'ZÁSAH ZTRACEN' : 'zásah drží');
}
await scenar('snížení role Administrátor → Obchodník', { akce: 'role', email: U.admin2.email, role: 'Obchodník' }, (po) => po && po.role === 'Administrátor');
await scenar('vypnutí účtu', { akce: 'aktivni', email: U.admin2.email, aktivni: false }, (po, ja) => po && po.aktivni !== false && ja.ok);
await scenar('smazání účtu (bez zakázek)', { akce: 'smaz', email: U.admin2.email }, (po, ja) => !!po && ja.ok);
console.log('kniha smazaných po smazání:', pamet.get('smazani/' + U.admin2.email));
