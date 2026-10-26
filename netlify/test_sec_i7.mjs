/* ============================================================
 * SEC-I7 — ZÁSAH DO JINÉHO SPRÁVCE JEN S HESLEM SPRÁVCE (#517)
 *
 * Rozhodnutí J. V. 26. 10. 2026 (dialog K8/S1, A). Smazání, vypnutí,
 * archivace a snížení role JINÉHO (ne hlavního) administrátora nechtěly
 * heslo správce (rozsah B77 je jen založení, povýšení a reset hesla) —
 * s ukradenou cookie správce šlo nevratně smazat všechny účty kromě
 * hlavního. Teď vyžadují pole `hesloSpravce` jako u B77 (401 s kódem
 * hesloSpravce bez něj nebo se špatným).
 *
 * Hlídá se pro každou ze čtyř akcí: bez hesla 401 (a účet se nezměnil),
 * se špatným 401, se správným 200. Zásah do obchodníka heslo nechce
 * (beze změny) a zapnutí / návrat z archivu / povýšení zůstávají, jak byly.
 *
 * Spuštění: node netlify/test_sec_i7.mjs
 * ============================================================ */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';

const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) {
    return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
      .map(x => x.slice(nazev.length + 1));
  },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

const { default: prihlaseni } = await import('./functions/prihlaseni.mjs');
const { default: uzivatele } = await import('./functions/uzivatele.mjs');
const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info))); }
};
const post = (fn, url, telo, cookie) => fn(new Request(url, {
  method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const ulz = (n) => globalThis.__TEST_ULOZISTE(n);
async function prihlas(email, heslo) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email, heslo });
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const HESLO_ADMIN = 'Docasne.Heslo.123';
const cAdmin = await prihlas(ADMIN_EMAIL, HESLO_ADMIN);
test('příprava: hlavní administrátor přihlášen', !!cAdmin);
const akce = (telo, cookie) => post(uzivatele, 'http://x/api/uzivatele', telo, cookie || cAdmin);
const kod = async (r) => { try { return (await r.clone().json()).kod || ''; } catch (e) { return ''; } };

/* Vedlejší správce, který zasahuje (sám se přihlašuje), a oběti. */
const HESLO_V = 'VedlejsiHeslo1';
await akce({ akce: 'zaloz', email: 'vedlejsi.i7@priklad.cz', jmeno: 'Vedlejší', role: 'Administrátor',
  heslo: HESLO_V, hesloSpravce: HESLO_ADMIN });
const cV = await prihlas('vedlejsi.i7@priklad.cz', HESLO_V);
test('příprava: vedlejší správce přihlášen', !!cV);
const zalozSpravce = (email) => akce({ akce: 'zaloz', email, jmeno: 'Obětní správce', role: 'Administrátor',
  heslo: 'ObetniHeslo12', hesloSpravce: HESLO_ADMIN });
const ucet = (email) => ulz('uzivatele').cti(email);

/* Pro každou akci: [popis, e-mail oběti, tělo, kontrola beze změny] */
const PRIPADY = [
  ['smazání', 'smaz.i7@priklad.cz', e => ({ akce: 'smaz', email: e }), async e => !!(await ucet(e))],
  ['vypnutí', 'vypni.i7@priklad.cz', e => ({ akce: 'aktivni', email: e, aktivni: false }), async e => (await ucet(e)).aktivni !== false],
  ['archivace', 'archiv.i7@priklad.cz', e => ({ akce: 'archiv', email: e, archiv: true }), async e => !(await ucet(e)).archiv],
  ['snížení role', 'role.i7@priklad.cz', e => ({ akce: 'role', email: e, role: 'Obchodník' }), async e => (await ucet(e)).role === 'Administrátor'],
];
for (const [jm, email, telo, bezeZmeny] of PRIPADY) {
  await zalozSpravce(email);
  const r1 = await akce(telo(email), cV);
  test(`SEC-I7 ${jm} jiného správce bez hesla → 401 hesloSpravce`, r1.status === 401 && (await kod(r1)) === 'hesloSpravce', r1.status);
  test(`SEC-I7 ${jm}: účet se bez hesla nezměnil`, await bezeZmeny(email));
  const r2 = await akce(Object.assign(telo(email), { hesloSpravce: 'spatne-heslo-123' }), cV);
  test(`SEC-I7 ${jm} se špatným heslem → 401`, r2.status === 401, r2.status);
  test(`SEC-I7 ${jm}: účet se se špatným heslem nezměnil`, await bezeZmeny(email));
  const r3 = await akce(Object.assign(telo(email), { hesloSpravce: HESLO_V }), cV);
  test(`SEC-I7 ${jm} se správným heslem → 200`, r3.status === 200, r3.status);
  test(`SEC-I7 ${jm}: provedeno`, !(await bezeZmeny(email)));
}

/* Hlavní správce zasahuje do vedlejšího — heslo chce taky (cookie hlavního
 * ukradnout jde stejně). */
await zalozSpravce('hlavni.zasah.i7@priklad.cz');
const rh = await akce({ akce: 'aktivni', email: 'hlavni.zasah.i7@priklad.cz', aktivni: false });
test('SEC-I7 i hlavní správce potřebuje heslo k vypnutí jiného správce', rh.status === 401, rh.status);

/* Obchodník: beze změny (heslo nechce). */
await akce({ akce: 'zaloz', email: 'obchodnik.i7@priklad.cz', jmeno: 'Obchodník', role: 'Obchodník', heslo: 'ObchodHeslo12' });
const ro = await akce({ akce: 'aktivni', email: 'obchodnik.i7@priklad.cz', aktivni: false }, cV);
test('vypnutí obchodníka heslo nechce (200)', ro.status === 200, ro.status);
const ra = await akce({ akce: 'archiv', email: 'obchodnik.i7@priklad.cz', archiv: true }, cV);
test('archivace obchodníka heslo nechce (200)', ra.status === 200, ra.status);
const rs = await akce({ akce: 'smaz', email: 'obchodnik.i7@priklad.cz' }, cV);
test('smazání obchodníka heslo nechce (200)', rs.status === 200, rs.status);

/* Opačné směry jiného správce zůstávají beze hesla. */
await zalozSpravce('zpet.i7@priklad.cz');
await akce({ akce: 'archiv', email: 'zpet.i7@priklad.cz', archiv: true, hesloSpravce: HESLO_ADMIN });
const rz = await akce({ akce: 'archiv', email: 'zpet.i7@priklad.cz', archiv: false }, cV);
test('návrat jiného správce z archivu heslo nechce (200)', rz.status === 200, rz.status);
const rzap = await akce({ akce: 'aktivni', email: 'zpet.i7@priklad.cz', aktivni: true }, cV);
test('zapnutí jiného správce heslo nechce (200)', rzap.status === 200, rzap.status);

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
