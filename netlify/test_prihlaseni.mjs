/* PŘIHLAŠOVÁNÍ JAKO CELEK — B75, B76, B77, B78 (hloubkový test 24. 9. 2026,
 * opraveno 25. 9. 2026).
 *
 *   B75  brzda proti hádání hesel se dala obejít: (a) nad limitem adresy se
 *        dál počítal scrypt a správné heslo prošlo; (b) IPv6 se klíčovala
 *        celou adresou — jeden stroj má /64 a každý pokus poslal z jiné;
 *        (c) úspěšné přihlášení VLASTNÍHO účtu vynulovalo počítadlo adresy,
 *        takže útočník s jedním účtem hádal cizí hesla bez omezení;
 *   B76  účet bez verze hesla má verzi 0: smazaný a znovu založený účet
 *        (nebo vypnutý a zapnutý) přijal cookie vydanou před smazáním;
 *   B77  změna vlastního hesla (`mojeheslo`) neměla brzdu — kdo měl cookie
 *        nebo odemčený počítač, hádal staré heslo bez omezení;
 *   B78  odhlášení nekontrolovalo původ požadavku (Origin, Content-Type).
 *
 * Paměťové úložiště, žádná síť. Spuštění: node netlify/test_prihlaseni.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
if (!process.env.ADMIN_EMAIL) process.env.ADMIN_EMAIL = 'spravce@priklad.cz';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

import prihlaseni from './functions/prihlaseni.mjs';
import odhlaseni from './functions/odhlaseni.mjs';
import ja from './functions/ja.mjs';
import uzivatele from './functions/uzivatele.mjs';
import * as sdilene from './lib/sdilene.mjs';
const { ADMIN_EMAIL, POKUSY_MAX, POKUSY_IP_MAX } = sdilene;
/* Pomocné funkce B75 se berou tolerantně: proti kódu bez opravy (pojistka
 * proti prázdnému testu) má sada SELHAT v jednotlivých testech, ne spadnout
 * při importu. */
const pokusyIpKlic = (a) => (typeof sdilene.pokusyIpKlic === 'function' ? sdilene.pokusyIpKlic(a) : 'chybí:' + a);
const ipv6Prefix64 = (a) => (typeof sdilene.ipv6Prefix64 === 'function' ? sdilene.ipv6Prefix64(a) : 'chybí:' + a);
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const KOREN = dirname(fileURLToPath(import.meta.url));

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info))); } };
const post = (fn, url, telo, hlavicky) => fn(new Request(url, { method: 'POST', headers: hlavicky || {}, body: JSON.stringify(telo) }));
const prihlas = (email, heslo, ip) => post(prihlaseni, 'http://x/api/prihlaseni', { email, heslo }, ip ? { 'x-nf-client-connection-ip': ip } : {});
const cookieZ = (r) => (r.headers.get('set-cookie') || '').split(';')[0];
const kdoJsem = (cookie) => ja(new Request('http://x/api/ja', { headers: { cookie } }));
const zaloz = (cAdmin, email, heslo, role) => post(uzivatele, 'http://x/api/uzivatele',
  { akce: 'zaloz', email, jmeno: 'Účet ' + email, role: role || 'Obchodník', heslo }, { cookie: cAdmin });

const rAdmin = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
const cAdmin = cookieZ(rAdmin);
test('administrátor přihlášen (bootstrap)', rAdmin.status === 200);
test('účty založeny', (await (await zaloz(cAdmin, 'utocnik@priklad.cz', 'UtocnikHeslo1')).json()).ok === true
  && (await (await zaloz(cAdmin, 'obet@priklad.cz', 'ObetHeslo1')).json()).ok === true);

/* ---------- B75 (a): nad limitem adresy 429 bez ověření hesla ---------- */
console.log('\n===== B75: limit adresy =====');
{
  const IP = '198.51.100.7';
  let posledni = 0;
  for (let i = 0; i <= POKUSY_IP_MAX; i++) posledni = (await prihlas('nikdo' + i + '@example.com', 'spatne', IP)).status;
  test('po ' + (POKUSY_IP_MAX + 1) + ' špatných pokusech z jedné adresy je 429', posledni === 429, posledni);
  const spravne = await prihlas('obet@priklad.cz', 'ObetHeslo1', IP);
  test('B75a: z adresy nad limitem se odmítne i SPRÁVNÉ heslo (429, bez ověření)', spravne.status === 429, spravne.status);
  test('B75a: hláška říká, že jde o adresu', /adres/.test((await spravne.json()).chyba || ''));
  test('B75a: z jiné adresy se majitel přihlásí (limit adresy není zámek účtu)',
    (await prihlas('obet@priklad.cz', 'ObetHeslo1', '198.51.100.8')).status === 200);
  const kod = readFileSync(resolve(KOREN, 'functions', 'prihlaseni.mjs'), 'utf8');
  test('B75a: o limitu adresy se ve zdroji rozhoduje PŘED ověřením hesla (scrypt se nepočítá)',
    kod.indexOf('pokusyAdresaNadLimit(') > 0 && kod.indexOf('pokusyAdresaNadLimit(') < kod.indexOf('hesloSedi('));
  test('#92 dál platí pro e-mail: o 429 podle počítadla e-mailu se rozhoduje až po ověření hesla',
    kod.indexOf('hesloSedi(') < kod.indexOf('> POKUSY_MAX'));
}

/* ---------- B75 (b): IPv6 po /64 ---------- */
console.log('\n===== B75: IPv6 po /64 =====');
{
  test('ipv6Prefix64: plná i zkrácená adresa dají týž prefix',
    ipv6Prefix64('2001:0db8:0001:0002:0003:0004:0005:0006') === '2001:db8:1:2::/64'
    && ipv6Prefix64('2001:db8:1:2::1') === '2001:db8:1:2::/64' && ipv6Prefix64('2001:db8:1:2:aaaa::') === '2001:db8:1:2::/64',
    [ipv6Prefix64('2001:0db8:0001:0002:0003:0004:0005:0006'), ipv6Prefix64('2001:db8:1:2::1')]);
  test('pokusyIpKlic: dvě adresy z téhož /64 mají jeden klíč, jiný /64 jiný',
    pokusyIpKlic('2001:db8:1:2:aaaa::1') === pokusyIpKlic('2001:db8:1:2:bbbb:0:0:2')
    && pokusyIpKlic('2001:db8:1:2::1') !== pokusyIpKlic('2001:db8:1:3::1'));
  test('pokusyIpKlic: IPv4 zapsaná jako IPv6 (::ffff:) je IPv4', pokusyIpKlic('::ffff:192.0.2.1') === pokusyIpKlic('192.0.2.1'));
  test('pokusyIpKlic: identifikátor zóny (%eth0) se nepočítá do klíče', pokusyIpKlic('fe80::1%eth0') === pokusyIpKlic('fe80::2'));
  test('pokusyIpKlic: neplatný zápis se nepřevádí, ale klíč má', pokusyIpKlic('2001:::1').length > 4 && pokusyIpKlic('') === 'ip:');
  /* Chování: pokusy rozprostřené po adresách jednoho /64 se sčítají. */
  let posledni = 0;
  for (let i = 0; i <= POKUSY_IP_MAX; i++)
    posledni = (await prihlas('nekdo' + i + '@example.com', 'spatne', '2001:db8:aa:bb:' + (i + 1).toString(16) + '::' + (i + 1).toString(16))).status;
  test('B75b: ' + (POKUSY_IP_MAX + 1) + ' pokusů z různých adres jednoho /64 skončí 429', posledni === 429, posledni);
  test('B75b: sousední /64 není dotčený', (await prihlas('nekdo@example.com', 'spatne', '2001:db8:aa:bc::1')).status === 401);
}

/* ---------- B75 (c): úspěch vlastního účtu nenuluje počítadlo adresy ---------- */
console.log('\n===== B75: úspěch cizího účtu a počítadlo adresy =====');
{
  const IP = '198.51.100.20';
  for (let i = 0; i < POKUSY_IP_MAX - 1; i++) await prihlas('cizi' + i + '@example.com', 'spatne', IP);
  test('útočník se z téže adresy přihlásí vlastním účtem (200)', (await prihlas('utocnik@priklad.cz', 'UtocnikHeslo1', IP)).status === 200);
  const prvni = (await prihlas('cizi-a@example.com', 'spatne', IP)).status;
  const druhy = (await prihlas('cizi-b@example.com', 'spatne', IP)).status;
  test('B75c: po úspěchu se počítadlo adresy nevynulovalo — druhý další špatný pokus je 429 (dřív 401)',
    prvni === 401 && druhy === 429, [prvni, druhy]);
}

/* ---------- B76: verze hesla při založení, vypnutí a archivaci ---------- */
console.log('\n===== B76: stará cookie po znovuzaložení, vypnutí a archivaci účtu =====');
{
  await zaloz(cAdmin, 'znovu@priklad.cz', 'ZnovuHeslo1');
  const c1 = cookieZ(await prihlas('znovu@priklad.cz', 'ZnovuHeslo1'));
  test('cookie účtu platí', (await kdoJsem(c1)).status === 200);
  test('účet smazán', (await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'smaz', email: 'znovu@priklad.cz' }, { cookie: cAdmin })).json()).ok === true);
  test('po smazání cookie neplatí', (await kdoJsem(c1)).status === 401);
  test('účet se stejným e-mailem založen znovu', (await (await zaloz(cAdmin, 'znovu@priklad.cz', 'ZnovuHeslo2')).json()).ok === true);
  test('B76: stará cookie po znovuzaložení účtu NEPLATÍ (401)', (await kdoJsem(c1)).status === 401);
  test('B76: nové přihlášení novým heslem projde', (await prihlas('znovu@priklad.cz', 'ZnovuHeslo2')).status === 200);
  const ucet = await globalThis.__TEST_ULOZISTE('uzivatele').cti('znovu@priklad.cz');
  test('B76: nový účet nese nenulovou verzi hesla', ucet && +ucet.hesloVerze > 0, ucet && ucet.hesloVerze);

  await zaloz(cAdmin, 'vypnuty2@priklad.cz', 'VypnutyHeslo1');
  const c2 = cookieZ(await prihlas('vypnuty2@priklad.cz', 'VypnutyHeslo1'));
  await post(uzivatele, 'http://x/api/uzivatele', { akce: 'aktivni', email: 'vypnuty2@priklad.cz', aktivni: false }, { cookie: cAdmin });
  test('vypnutý účet: cookie neplatí', (await kdoJsem(c2)).status === 401);
  await post(uzivatele, 'http://x/api/uzivatele', { akce: 'aktivni', email: 'vypnuty2@priklad.cz', aktivni: true }, { cookie: cAdmin });
  test('B76: po zapnutí účtu stará cookie dál NEPLATÍ (401)', (await kdoJsem(c2)).status === 401);
  test('B76: po zapnutí jde přihlásit znovu', (await prihlas('vypnuty2@priklad.cz', 'VypnutyHeslo1')).status === 200);

  await zaloz(cAdmin, 'arch2@priklad.cz', 'ArchivHeslo1');
  const c3 = cookieZ(await prihlas('arch2@priklad.cz', 'ArchivHeslo1'));
  await post(uzivatele, 'http://x/api/uzivatele', { akce: 'archiv', email: 'arch2@priklad.cz', archiv: true }, { cookie: cAdmin });
  await post(uzivatele, 'http://x/api/uzivatele', { akce: 'archiv', email: 'arch2@priklad.cz', archiv: false }, { cookie: cAdmin });
  await post(uzivatele, 'http://x/api/uzivatele', { akce: 'aktivni', email: 'arch2@priklad.cz', aktivni: true }, { cookie: cAdmin });
  test('B76: po archivaci a vrácení stará cookie NEPLATÍ (401)', (await kdoJsem(c3)).status === 401);
  test('B76: účet po vrácení z archivu funguje novým přihlášením', (await prihlas('arch2@priklad.cz', 'ArchivHeslo1')).status === 200);
}

/* ---------- B77: brzda na změnu vlastního hesla ---------- */
console.log('\n===== B77: brzda na mojeheslo =====');
{
  await zaloz(cAdmin, 'heslar@priklad.cz', 'HeslarHeslo1');
  const c = cookieZ(await prihlas('heslar@priklad.cz', 'HeslarHeslo1', '198.51.100.30'));
  const zmen = (stare, nove, ip) => post(uzivatele, 'http://x/api/uzivatele', { akce: 'mojeheslo', stare, nove },
    { cookie: c, 'x-nf-client-connection-ip': ip || '198.51.100.30' });
  const stavy = [];
  for (let i = 0; i < POKUSY_MAX; i++) stavy.push((await zmen('spatne-stare', 'NoveHeslo123')).status);
  test('prvních ' + POKUSY_MAX + ' špatných starých hesel dostane 401', stavy.every(s => s === 401), stavy.join(','));
  const pres = await zmen('spatne-stare', 'NoveHeslo123');
  test('B77: pokus nad limit dostane 429', pres.status === 429, pres.status);
  test('B77: hláška mluví o počtu pokusů', /mnoho/i.test((await pres.json()).chyba || ''));
  test('B77: brzda se počítá společně s přihlášením (login s heslem po limitu je 429)',
    (await prihlas('heslar@priklad.cz', 'spatne', '198.51.100.31')).status === 429);
  const dobre = await zmen('HeslarHeslo1', 'HeslarHeslo2');
  test('B77 (#92): majitel se správným starým heslem projde i nad limitem (200) a dostane novou cookie',
    dobre.status === 200 && /^relace=.+/.test(cookieZ(dobre)), dobre.status);
  const c2 = cookieZ(dobre);
  const poUspechu = await post(uzivatele, 'http://x/api/uzivatele', { akce: 'mojeheslo', stare: 'spatne', nove: 'NoveHeslo123' },
    { cookie: c2, 'x-nf-client-connection-ip': '198.51.100.30' });
  test('B77: úspěch počítadlo vynuloval (další špatný pokus je zase 401)', poUspechu.status === 401, poUspechu.status);
  const zAdresyNadLimit = await post(uzivatele, 'http://x/api/uzivatele', { akce: 'mojeheslo', stare: 'HeslarHeslo2', nove: 'HeslarHeslo3' },
    { cookie: c2, 'x-nf-client-connection-ip': '198.51.100.7' });
  test('B77: z adresy nad limitem (z oddílu B75) je změna hesla 429 i se správným starým heslem', zAdresyNadLimit.status === 429, zAdresyNadLimit.status);
  const kod = readFileSync(resolve(KOREN, 'functions', 'uzivatele.mjs'), 'utf8');
  const vetev = kod.slice(kod.indexOf("t.akce === 'mojeheslo'"));
  test('B77: ve větvi mojeheslo se pokus započítá před ověřením starého hesla',
    vetev.indexOf('pokusyZacatek(') > 0 && vetev.indexOf('pokusyZacatek(') < vetev.indexOf('hesloSedi('));
}

/* ---------- B78: odhlášení jen z aplikace ---------- */
console.log('\n===== B78: původ požadavku na odhlášení =====');
{
  const c = cookieZ(await prihlas('obet@priklad.cz', 'ObetHeslo1', '198.51.100.40'));
  const odhlas = (hlavicky) => odhlaseni(new Request('http://x/api/odhlaseni', { method: 'POST', headers: Object.assign({ cookie: c, host: 'x' }, hlavicky || {}), body: '{}' }));
  test('B78: cizí Origin → 403', (await odhlas({ origin: 'https://zly.example' })).status === 403);
  test('B78: Origin null (sandboxovaný rámec) → 403', (await odhlas({ origin: 'null' })).status === 403);
  test('B78: formulářové tělo → 403', (await odhlas({ 'content-type': 'application/x-www-form-urlencoded' })).status === 403);
  test('B78: vlastní Origin projde', (await odhlas({ origin: 'http://x', 'content-type': 'application/json' })).status === 200);
  const bez = await odhlas({});
  test('B78: požadavek bez Origin (aplikace, starší klient) projde a smaže cookie',
    bez.status === 200 && /Max-Age=0/.test(bez.headers.get('set-cookie') || ''));
  test('B78: GET se dál odmítá (405)', (await odhlaseni(new Request('http://x/api/odhlaseni', { headers: { cookie: c } }))).status === 405);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
