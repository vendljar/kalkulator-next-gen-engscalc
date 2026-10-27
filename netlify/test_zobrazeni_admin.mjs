/* #539 (27. 10. 2026): sloupec Administrátor v matici zobrazení — server.
 *
 * POST /api/zobrazeni musí odmítnout matici, která by administrátorovi
 * skryla prvek nutný k návratu (Nastavení, Zobrazení, Uživatelé, …):
 * 400 s kod 'adminZamek', uložená matice zůstane beze změny. Odškrtnutí
 * nezamčeného prvku projde. Stará matice bez sloupce se uloží a sloupec
 * Administrátor v ní je po očistě zaškrtnutý. Skrytí je jen zobrazení —
 * právo administrátora na náklady (GET /api/program) zůstává.
 *
 * Pojistka: proti 62ea0c8 (v27.10.1) uloží server matici se skrytým
 * Nastavením s 200 (selže 5 kontrol: čtyři odmítnutí a zachování matice); po změně projde vše.
 *
 * Paměťové úložiště. Spuštění: node netlify/test_zobrazeni_admin.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
const R = new URL('..', import.meta.url).pathname;
const { default: prihlaseni } = await import(R + 'netlify/functions/prihlaseni.mjs');
const { default: zobrazeni } = await import(R + 'netlify/functions/zobrazeni.mjs');
const { ADMIN_EMAIL } = await import(R + 'netlify/lib/sdilene.mjs');
const { createRequire } = await import('module');
const ZOB = createRequire(import.meta.url)('../src/zobrazeni.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 400)); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  const t = await r.clone().json(); if (!t.ok) throw new Error(e + ' ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const HESLO = 'Docasne.Heslo.123';
const cA = await prihlas(ADMIN_EMAIL, HESLO);
const ulozeno = () => pamet.has('program/zobrazeni') ? JSON.parse(pamet.get('program/zobrazeni')) : null;
const zkus = async (matice) => {
  const r = await post(zobrazeni, 'http://x/api/zobrazeni', { matice, hesloSpravce: HESLO }, cA);
  return { status: r.status, ...(await r.json()) };
};
const A = 'Administrátor';

/* 1. Odškrtnutí nezamčeného prvku projde. */
let r = await zkus({ 'tab.cenik': { [A]: false }, 'tab.detail': { 'Obchodník': true } });
test('#539 nezamčený prvek jde administrátorovi skrýt (200)', r.status === 200 && r.ok === true, r);
test('#539 uložená matice nese skrytí ve sloupci Administrátor',
  ulozeno() && ulozeno().matice['tab.cenik'][A] === false, ulozeno());
test('#539 zamčené prvky jsou v uložené matici zaškrtnuté',
  ZOB.zobrazeniAdminZamcene().every(k => ulozeno().matice[k][A] === true));

/* 2. Odebrání zamčeného prvku server odmítne. */
for (const k of ['nastaveni.otevrit', 'nastaveni.zobrazeni', 'nastaveni.uzivatele', 'zaloha.vynucena']) {
  r = await zkus({ 'tab.cenik': { [A]: true }, [k]: { [A]: false } });
  test('#539 matici skrývající adminovi „' + k + '" server odmítne (400 adminZamek)',
    r.status === 400 && r.kod === 'adminZamek' && Array.isArray(r.zamcene) && r.zamcene.includes(k), r);
}
test('#539 po odmítnutí zůstala uložená předchozí matice',
  ulozeno().matice['tab.cenik'][A] === false && ulozeno().matice['nastaveni.otevrit'][A] === true, ulozeno());

/* 3. Stará matice bez sloupce Administrátor = vše viditelné. */
r = await zkus({ 'tab.detail': { 'Obchodník': true, 'Vedoucí': false } });
test('#539 stará matice bez sloupce se uloží', r.status === 200, r);
test('#539 a administrátor v ní vidí všechno',
  ZOB.ZOBRAZENI_PRVKY.every(p => ulozeno().matice[p.klic][A] === true), ulozeno());

/* 4. Skrytí je jen zobrazení: právo administrátora se nemění. */
const skryto = {}; ZOB.ZOBRAZENI_PRVKY.forEach(p => { if (!p.adminZamek) skryto[p.klic] = { [A]: false }; });
r = await zkus(skryto);
test('#539 matice skrývající adminovi vše nezamčené se uloží', r.status === 200, r);
test('#539 práva administrátora (zobrazeniSmi) zůstávají i se skrytím',
  ZOB.ZOBRAZENI_PRVKY.every(p => ZOB.zobrazeniSmi(A, p.klic, ulozeno().matice) === true));
{
  const { default: program } = await import(R + 'netlify/functions/program.mjs');
  const g = await program(new Request('http://x/api/program', { headers: { cookie: cA } }));
  test('#539 administrátor se skrytými náklady dál čte ceník ze serveru (GET /api/program 200)',
    g.status === 200, g.status);
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
