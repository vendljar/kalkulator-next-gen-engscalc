/* ============================================================
 * INFORMATIVNÍ NÁLEZY ÚČTŮ B92, B93, B95 (#347, 15. 10. 2026)
 *
 * Hloubkový test 24. 9. 2026 (v24.9.2) je vedl jako informativní, audit
 * 12. 10. 2026 jako „trvá". Opraveny malým zásahem; tahle sada je hlídá:
 *
 *  B92 — převod zakázek po kolegovi zapisoval NA KONCI účet odcházejícího
 *        přečtený NA ZAČÁTKU (mezi tím prošel všechny zakázky). Souběžná
 *        změna hesla, role nebo vypnutí účtu se tím tiše vrátila. Převod
 *        účet vůbec nemění, takže ho nezapisuje.
 *  B93 — obnova účtů z otisku vrátí účtu otisk hesla z doby otisku, ale
 *        `hesloVerze` nechala (max(server, otisk)): relace přihlášené
 *        heslem, které obnova právě zrušila, platily dál. Když obnova
 *        heslo účtu mění, zvedne verzi hesla jako každá jiná změna hesla.
 *  B95 — jméno v profilu mohlo napodobit cizí razítko „jméno <e-mail>"
 *        (zámek, odemčení). Ze jména se ostré závorky odstraní při zápisu
 *        (profil, založení) i při skládání razítka (účty z doby před opravou).
 *
 * Spuštění: node netlify/test_ucty_informativni.mjs
 * ============================================================ */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';

const pamet = new Map();
/* Háček pro B92: zavolá se před každým zápisem zakázky — simuluje souběžný
 * požadavek, který mezitím změní účet. */
globalThis.__PRED_ZAPISEM_ZAKAZKY = null;
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) {
    if (nazev === 'zakazky' && String(k).startsWith('z/') && globalThis.__PRED_ZAPISEM_ZAKAZKY) {
      const f = globalThis.__PRED_ZAPISEM_ZAKAZKY; globalThis.__PRED_ZAPISEM_ZAKAZKY = null; await f();
    }
    pamet.set(nazev + '/' + k, JSON.stringify(v));
  },
  async seznam(prefix) {
    return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
      .map(x => x.slice(nazev.length + 1));
  },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

import prihlaseni from './functions/prihlaseni.mjs';
import uzivatele from './functions/uzivatele.mjs';
import ja from './functions/ja.mjs';
import zalohaVynuceno from './functions/zaloha_vynuceno.mjs';
import obnova from './functions/obnova.mjs';
import * as SD from './lib/sdilene.mjs';
const { ADMIN_EMAIL, otiskHesla } = SD;
/* Před opravou B95 funkce neexistovala — test pak selže, nespadne. */
const razitkoKdo = SD.razitkoKdo || (() => null);

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info))); }
};
const post = (fn, url, telo, cookie) => fn(new Request(url, {
  method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const ulz = (n) => globalThis.__TEST_ULOZISTE(n);
async function prihlas(email, heslo) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email, heslo });
  return { status: r.status, cookie: (r.headers.get('set-cookie') || '').split(';')[0] };
}
const HESLO_ADMIN = 'Docasne.Heslo.123';
const cAdmin = (await prihlas(ADMIN_EMAIL, HESLO_ADMIN)).cookie;
test('příprava: administrátor přihlášen', !!cAdmin);
const zaloz = (email, jmeno, heslo, role = 'Obchodník') => post(uzivatele, 'http://x/api/uzivatele',
  { akce: 'zaloz', email, jmeno, role, heslo }, cAdmin);

/* ---------------- B92: převod nevrací souběžnou změnu účtu ---------------- */
await zaloz('odchazi.b92@example.com', 'Odchází', 'OdchaziHeslo1');
await zaloz('prebira.b92@example.com', 'Přebírá', 'PrebiraHeslo1');
for (const n of ['1', '2'])
  await ulz('zakazky').zapis('z/b92-' + n + '.json', { cislo: 'B92-' + n, autor: 'odchazi.b92@example.com', varianty: [] });
/* Během převodu (před zápisem první zakázky) správce jiným požadavkem
 * změní odcházejícímu roli a heslo — tak, jak by to udělal souběžný klik. */
globalThis.__PRED_ZAPISEM_ZAKAZKY = async () => {
  const u = await ulz('uzivatele').cti('odchazi.b92@example.com');
  u.role = 'Vedoucí'; u.heslo = otiskHesla('NoveHesloB92x'); u.hesloVerze = (+u.hesloVerze || 0) + 1;
  await ulz('uzivatele').zapis('odchazi.b92@example.com', u);
};
const prev = await (await post(uzivatele, 'http://x/api/uzivatele',
  { akce: 'prevod', email: 'odchazi.b92@example.com', na: 'prebira.b92@example.com' }, cAdmin)).json();
test('B92: převod proběhl', prev.ok === true && prev.prevedeno === 2, prev);
test('B92: háček souběžné změny se opravdu spustil', globalThis.__PRED_ZAPISEM_ZAKAZKY === null);
const poPrevodu = await ulz('uzivatele').cti('odchazi.b92@example.com');
test('B92: souběžná změna role převod nepřepsal', poPrevodu.role === 'Vedoucí', poPrevodu.role);
test('B92: nové heslo zůstalo platné (staré se nevrátilo)',
  (await prihlas('odchazi.b92@example.com', 'NoveHesloB92x')).status === 200
  && (await prihlas('odchazi.b92@example.com', 'OdchaziHeslo1')).status === 401);
test('B92: zakázky jsou u nového hospodáře',
  (await ulz('zakazky').cti('z/b92-1.json')).autor === 'prebira.b92@example.com');

/* ---------------- B93: obnova hesla z otisku zvedne verzi hesla ---------------- */
await zaloz('obnova.b93@example.com', 'Obnova', 'StareHesloB93');
await zaloz('beze.zmeny.b93@example.com', 'Beze změny', 'StaleHesloB93');
const vyn = await (await post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', {}, cAdmin)).json();
test('B93: otisk pořízen', vyn.ok === true, vyn);
/* Po otisku si uživatel heslo změní (třeba proto, že staré prozradil). */
const p1 = await prihlas('obnova.b93@example.com', 'StareHesloB93');
const zm = await (await post(uzivatele, 'http://x/api/uzivatele',
  { akce: 'mojeheslo', stare: 'StareHesloB93', nove: 'NoveHesloB93' }, p1.cookie)).json();
test('B93: změna hesla po otisku', zm.ok === true, zm);
const cNove = (await prihlas('obnova.b93@example.com', 'NoveHesloB93')).cookie;
const cStale = (await prihlas('beze.zmeny.b93@example.com', 'StaleHesloB93')).cookie;
test('B93: relace s novým heslem platí', (await get(ja, 'http://x/api/ja', cNove)).status === 200);
const verzePred = +(await ulz('uzivatele').cti('obnova.b93@example.com')).hesloVerze || 0;
const verzeStalePred = +(await ulz('uzivatele').cti('beze.zmeny.b93@example.com')).hesloVerze || 0;
const o = await (await post(obnova, 'http://x/api/obnova', { zdroj: { otisk: vyn.den }, rezim: 'prepsat',
  potvrzeni: 'OBNOVIT', casti: ['uzivatele'], hesloSpravce: HESLO_ADMIN }, cAdmin)).json();
test('B93: obnova účtů z otisku proběhla', o.ok === true, o);
const poObnove = await ulz('uzivatele').cti('obnova.b93@example.com');
test('B93: obnova vrátila heslo z doby otisku (to je její smysl)',
  (await prihlas('obnova.b93@example.com', 'StareHesloB93')).status === 200);
test('B93: verze hesla po obnově stoupla', (+poObnove.hesloVerze || 0) > verzePred,
  { pred: verzePred, po: poObnove.hesloVerze });
test('B93: relace přihlášená heslem, které obnova zrušila, už neplatí',
  (await get(ja, 'http://x/api/ja', cNove)).status === 401);
test('B93: účtu, kterému obnova heslo nemění, zůstane verze i relace',
  (+(await ulz('uzivatele').cti('beze.zmeny.b93@example.com')).hesloVerze || 0) === verzeStalePred
  && (await get(ja, 'http://x/api/ja', cStale)).status === 200);
test('B93: obnova to v upozornění řekne', (o.upozorneni || []).some(t => /hesl/.test(t) && /obnova\.b93/.test(t)), o.upozorneni);

/* ---------------- B95: jméno nenapodobí razítko „jméno <e-mail>" ---------------- */
const zb = await (await zaloz('razitko.b95@example.com', 'Jan Novák <reditel@example.com>', 'RazitkoHeslo1')).json();
test('B95: založení s podvrženým jménem projde', zb.ok === true, zb);
const uB = await ulz('uzivatele').cti('razitko.b95@example.com');
test('B95: založení ze jména odstraní ostré závorky', !/[<>]/.test(uB.jmeno) && /Jan Novák/.test(uB.jmeno), uB.jmeno);
const cB = (await prihlas('razitko.b95@example.com', 'RazitkoHeslo1')).cookie;
const pr = await (await post(uzivatele, 'http://x/api/uzivatele',
  { akce: 'profil', jmeno: 'Petr <vedouci@example.com>' }, cB)).json();
test('B95: profil ze jména odstraní ostré závorky', pr.ok === true && !/[<>]/.test(pr.jmeno)
  && !/[<>]/.test((await ulz('uzivatele').cti('razitko.b95@example.com')).jmeno), pr);
/* Účet z doby před opravou může mít závorky ve jméně uložené — razítko je
 * proto skládá ze očištěného jména. */
const r = razitkoKdo({ jmeno: 'Eva <reditel@example.com>', email: 'eva@example.com' });
test('B95: razítko ze starého jména bez závorek, s pravým e-mailem na konci',
  r === 'Eva reditel@example.com <eva@example.com>', r);
test('B95: razítko bez jména je e-mail', razitkoKdo({ jmeno: '', email: 'eva@example.com' }) === 'eva@example.com');
test('B95: jméno jen ze závorek → e-mail', razitkoKdo({ jmeno: ' <> ', email: 'eva@example.com' }) === 'eva@example.com');

console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
process.exit(fail ? 1 : 0);
