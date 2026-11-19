/* ÚPRAVA EXISTUJÍCÍHO ÚČTU SPRÁVCEM (#UE, zadání J. V. 18. 11. 2026)
 *
 * Nastavení → Uživatelé → Upravit…: správce opraví u existujícího účtu titul,
 * jméno a příjmení, funkci a telefon (akce 'profil' s cizím e-mailem). Sada
 * hlídá serverovou stranu:
 *
 *  1) zápis cizího účtu jen Administrátor — Obchodník i Vedoucí 403, data
 *     beze změny;
 *  2) validace a meze délek TYTÉŽ jako při založení (jméno 120 bez < >,
 *     titul 40, funkce 80, telefon 40; objekt v poli 400);
 *  3) e-mail, role, aktivita ani heslo se úpravou nezmění (pole navíc
 *     v těle se ignorují) — e-mail je přihlašovací jméno a klíč, odkazují na
 *     něj zakázky (autor), prodeje (prodano.kdo) a razítka zámků;
 *  4) hlavní účet: kontaktní údaje upraví on sám, jiný správce ne (B28);
 *     snížení role a vypnutí hlavního účtu dál 400;
 *  5) razítko `zmenil` nese kdo, kdy a seznam změněných polí (bez hodnot);
 *  6) odeslaná (zamčená) zakázka v úložišti se úpravou účtu nezmění.
 *
 * Pojistka proti prázdnému testu: každá kontrola „nezměnilo se" má proti
 * sobě kontrolu, že táž úprava správcem změnu opravdu provede.
 * Účty jsou smyšlené (@priklad.cz).
 */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
    .map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

import './pomoc_test_admin.mjs';
import prihlaseni from './functions/prihlaseni.mjs';
import uzivatele from './functions/uzivatele.mjs';
import { ADMIN_EMAIL } from './lib/sdilene.mjs';

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST',
  headers: cookie ? { cookie } : {}, body: typeof telo === 'string' ? telo : JSON.stringify(telo) }));
const api = async (telo, cookie) => { const r = await post(uzivatele, 'http://x/api/uzivatele', telo, cookie);
  return Object.assign({ status: r.status }, await r.json()); };
async function prihlas(email, heslo) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email, heslo });
  const t = await r.clone().json();
  if (!t.ok) throw new Error('Přihlášení selhalo pro ' + email + ': ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const ucet = (e) => JSON.parse(pamet.get('uzivatele/' + e) || 'null');

const HLAVNI_HESLO = 'Docasne.Heslo.123';
const cHlavni = await prihlas(ADMIN_EMAIL, HLAVNI_HESLO);
const zaloz = (email, role, extra) => api(Object.assign({ akce: 'zaloz', email, jmeno: 'Petr Původní', titul: 'Ing.',
  funkce: 'Obchodní technik', telefon: '+420 000 000 111', role, heslo: 'ZkusebniHeslo1' }, extra || {}), cHlavni);
test('založení obchodníka', (await zaloz('obchodnik.ue@priklad.cz', 'Obchodník')).ok);
test('založení druhého obchodníka', (await zaloz('kolega.ue@priklad.cz', 'Obchodník')).ok);
test('založení vedoucího', (await zaloz('vedouci.ue@priklad.cz', 'Vedoucí')).ok);
test('založení druhého správce', (await zaloz('spravce2.ue@priklad.cz', 'Administrátor', { hesloSpravce: HLAVNI_HESLO })).ok);
const cObch = await prihlas('obchodnik.ue@priklad.cz', 'ZkusebniHeslo1');
const cVed = await prihlas('vedouci.ue@priklad.cz', 'ZkusebniHeslo1');
const cSpr2 = await prihlas('spravce2.ue@priklad.cz', 'ZkusebniHeslo1');

/* Odeslaná (zamčená) zakázka obchodníka — razítko „jméno <e-mail>". */
const ZAK_KLIC = 'zakazky/z/ue-zamcena.json';
pamet.set(ZAK_KLIC, JSON.stringify({ cislo: '2026 - OPR - CN - 911', autor: 'kolega.ue@priklad.cz',
  varianty: [{ id: 'v1', zamek: { zamceno: true, kdy: '2026-11-18T08:00:00.000Z',
    kdo: 'Petr Původní <kolega.ue@priklad.cz>' }, data: { kryci: { zmrazeno: { obchodnik: 'Ing. Petr Původní' } } } }],
  prodano: { kdo: 'kolega.ue@priklad.cz' } }));
const zakPred = pamet.get(ZAK_KLIC);

const NOVE = { titul: 'Bc.', jmeno: 'Petr Opravený', funkce: 'Vedoucí obchodu', telefon: '+420 000 000 222' };

/* 1) práva */
{
  const pred = pamet.get('uzivatele/kolega.ue@priklad.cz');
  const r = await api(Object.assign({ akce: 'profil', email: 'kolega.ue@priklad.cz' }, NOVE), cObch);
  test('obchodník upravuje cizí účet → 403', r.status === 403 && r.ok === false, r);
  test('po 403 obchodníka je cizí účet beze změny', pamet.get('uzivatele/kolega.ue@priklad.cz') === pred);
  const r2 = await api(Object.assign({ akce: 'profil', email: 'kolega.ue@priklad.cz' }, NOVE), cVed);
  test('vedoucí upravuje cizí účet → 403', r2.status === 403, r2);
  test('po 403 vedoucího je cizí účet beze změny', pamet.get('uzivatele/kolega.ue@priklad.cz') === pred);
  const r3 = await api(Object.assign({ akce: 'profil', email: 'kolega.ue@priklad.cz' }, NOVE));
  test('nepřihlášený → 401', r3.status === 401, r3);
}

/* 2) správce upraví titul, jméno, funkci a telefon */
{
  const pred = ucet('kolega.ue@priklad.cz');
  const r = await api(Object.assign({ akce: 'profil', email: 'kolega.ue@priklad.cz' }, NOVE), cSpr2);
  const po = ucet('kolega.ue@priklad.cz');
  test('správce upraví cizí účet → 200', r.status === 200 && r.ok === true, r);
  test('odpověď nese nové údaje', r.jmeno === NOVE.jmeno && r.titul === NOVE.titul && r.funkce === NOVE.funkce
    && r.telefon === NOVE.telefon, r);
  test('uloženo: titul, jméno, funkce, telefon', po.titul === 'Bc.' && po.jmeno === 'Petr Opravený'
    && po.funkce === 'Vedoucí obchodu' && po.telefon === '+420 000 000 222', po);
  test('e-mail, role, aktivita a heslo beze změny', po.email === pred.email && po.role === pred.role
    && po.aktivni === pred.aktivni && po.heslo === pred.heslo && po.hesloVerze === pred.hesloVerze, po);
  test('razítko zmenil: kdo z relace, kdy, seznam polí', po.zmenil && po.zmenil.kdo === 'spravce2.ue@priklad.cz'
    && !!Date.parse(po.zmenil.kdy) && JSON.stringify(po.zmenil.pole) === JSON.stringify(['jmeno', 'titul', 'funkce', 'telefon']), po.zmenil);
  test('razítko nenese hodnoty (osobní údaje jen jednou)', !/Petr|000 000 222/.test(JSON.stringify(po.zmenil)), po.zmenil);
  const r2 = await api({ akce: 'profil', email: 'kolega.ue@priklad.cz', telefon: '+420 000 000 333' }, cSpr2);
  const po2 = ucet('kolega.ue@priklad.cz');
  test('dílčí úprava: jen telefon, ostatní zůstává', r2.ok && po2.telefon === '+420 000 000 333' && po2.jmeno === 'Petr Opravený'
    && JSON.stringify(po2.zmenil.pole) === '["telefon"]', po2);
  const seznam = await (await uzivatele(new Request('http://x/api/uzivatele', { headers: { cookie: cSpr2 } }))).json();
  const radek = (seznam.uzivatele || []).find(x => x.email === 'kolega.ue@priklad.cz');
  test('seznam účtů ukazuje nové jméno', radek && radek.jmeno === 'Petr Opravený' && radek.titul === 'Bc.', radek);
}

/* 3) e-mail ani role se úpravou nezmění */
{
  const pred = ucet('kolega.ue@priklad.cz');
  const r = await api({ akce: 'profil', email: 'kolega.ue@priklad.cz', jmeno: 'Petr Opravený',
    novyEmail: 'jiny@priklad.cz', role: 'Administrátor', aktivni: false, heslo: 'CiziHeslo123', archiv: true }, cSpr2);
  const po = ucet('kolega.ue@priklad.cz');
  test('pole navíc (novyEmail, role, aktivni, heslo, archiv) se ignorují', r.ok && po.email === 'kolega.ue@priklad.cz'
    && po.role === 'Obchodník' && po.aktivni === true && !po.archiv && po.heslo === pred.heslo, po);
  test('žádný nový účet pod jiným e-mailem nevznikl', !pamet.has('uzivatele/jiny@priklad.cz'));
}

/* 4) validace a meze délek jako při založení */
{
  const r = await api({ akce: 'profil', email: 'kolega.ue@priklad.cz', jmeno: 'J'.repeat(500), titul: 'T'.repeat(100),
    funkce: 'F'.repeat(200), telefon: '9'.repeat(100) }, cSpr2);
  const po = ucet('kolega.ue@priklad.cz');
  test('meze délek: jméno 120, titul 40, funkce 80, telefon 40', r.ok && po.jmeno.length === 120 && po.titul.length === 40
    && po.funkce.length === 80 && po.telefon.length === 40, [po.jmeno.length, po.titul.length, po.funkce.length, po.telefon.length]);
  const z = await zaloz('meze.ue@priklad.cz', 'Obchodník', { jmeno: 'J'.repeat(500), titul: 'T'.repeat(100),
    funkce: 'F'.repeat(200), telefon: '9'.repeat(100) });
  const zu = ucet('meze.ue@priklad.cz');
  test('meze délek shodné se založením účtu', z.ok && ['jmeno', 'titul', 'funkce', 'telefon'].every(k => zu[k] === po[k]),
    ['jmeno', 'titul', 'funkce', 'telefon'].map(k => [k, zu[k].length, po[k].length]));
  const r2 = await api({ akce: 'profil', email: 'kolega.ue@priklad.cz', jmeno: 'Jan <reditel@priklad.cz>',
    titul: '<img src=x onerror=alert(1)>' }, cSpr2);
  const po2 = ucet('kolega.ue@priklad.cz');
  test('jméno bez < > (B95 — nenapodobí razítko)', r2.ok && !/[<>]/.test(po2.jmeno) && po2.jmeno === 'Jan reditel@priklad.cz', po2.jmeno);
  test('titul s HTML se uloží jako text (escapuje UI a Word, ne server)', po2.titul === '<img src=x onerror=alert(1)>', po2.titul);
  const r3 = await api({ akce: 'profil', email: 'kolega.ue@priklad.cz', jmeno: { x: 1 } }, cSpr2);
  test('objekt v poli jméno → 400', r3.status === 400, r3);
  const r4 = await api({ akce: 'profil', email: 'kolega.ue@priklad.cz', telefon: ['1'] }, cSpr2);
  test('pole v poli telefon → 400', r4.status === 400, r4);
  const r5 = await api({ akce: 'profil', email: 'neni.ue@priklad.cz', jmeno: 'Nikdo' }, cSpr2);
  test('neexistující účet → 404 a nic nevznikne', r5.status === 404 && !pamet.has('uzivatele/neni.ue@priklad.cz'), r5);
}

/* 5) hlavní účet */
{
  const pred = pamet.get('uzivatele/' + ADMIN_EMAIL);
  const r = await api({ akce: 'profil', email: ADMIN_EMAIL, jmeno: 'Podvržené Jméno' }, cSpr2);
  test('jiný správce upravuje hlavní účet → 403 (B28)', r.status === 403, r);
  test('hlavní účet po 403 beze změny', pamet.get('uzivatele/' + ADMIN_EMAIL) === pred);
  const r2 = await api({ akce: 'profil', email: ADMIN_EMAIL, titul: 'Ing.', jmeno: 'Hlavní Správce',
    funkce: 'Jednatel', telefon: '+420 000 000 999' }, cHlavni);
  const h = ucet(ADMIN_EMAIL);
  test('hlavní účet si kontaktní údaje upraví sám', r2.ok && h.jmeno === 'Hlavní Správce' && h.telefon === '+420 000 000 999', h);
  test('hlavní účet zůstal Administrátor a aktivní', h.role === 'Administrátor' && h.aktivni !== false, h);
  const r3 = await api({ akce: 'role', email: ADMIN_EMAIL, role: 'Obchodník' }, cSpr2);
  test('snížení role hlavního účtu dál 400', r3.status === 400 && ucet(ADMIN_EMAIL).role === 'Administrátor', r3);
  const r4 = await api({ akce: 'aktivni', email: ADMIN_EMAIL, aktivni: false }, cSpr2);
  test('vypnutí hlavního účtu dál 400', r4.status === 400 && ucet(ADMIN_EMAIL).aktivni !== false, r4);
}

/* 6) odeslaná zakázka */
test('odeslaná (zamčená) zakázka po úpravách účtu bajt po bajtu beze změny', pamet.get(ZAK_KLIC) === zakPred);
test('pojistka: zakázka v úložišti opravdu leží (test není prázdný)', JSON.parse(pamet.get(ZAK_KLIC)).varianty[0].zamek.zamceno === true);

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
