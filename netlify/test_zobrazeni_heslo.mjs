/* B168 (audit 15. 10. 2026, zadání 18. 10. 2026): změna matice zobrazení chce
 * heslo správce.
 *
 * Matice neřídí jen to, co se kreslí — podle ní server pouští i do CRM
 * (pipedrive.mjs), ke čtení nákladového ceníku (program.mjs) a k úpravám
 * ceníku v zakázce (zakazka_kontrola.mjs). Kdo získal cookie správce, by si
 * jedním POST otevřel tyhle cesty obyčejnému účtu. Proto stejné potvrzení
 * jako citlivé akce účtů (B77): pole `hesloSpravce`, odmítnutí 401 s
 * `kod: 'hesloSpravce'`, tentýž limit pokusů. Čtení (GET) se nemění.
 *
 * Pojistka proti prázdnému testu: proti v17.10.5 (0dbec56) uložil POST bez
 * hesla i se špatným heslem matici s 200 (selhalo 6 kontrol).
 *
 * Paměťové úložiště. Spuštění: node netlify/test_zobrazeni_heslo.mjs */
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

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 500)); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  const t = await r.clone().json(); if (!t.ok) throw new Error(e + ' ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const HESLO = 'Docasne.Heslo.123';
const cA = await prihlas(ADMIN_EMAIL, HESLO);
const ulozeno = () => pamet.has('program/zobrazeni') ? JSON.parse(pamet.get('program/zobrazeni')) : null;
const M = (v) => ({ 'tab.detail': { 'Obchodník': v, 'Vedoucí': false } });
const zkus = async (telo) => { const r = await post(zobrazeni, 'http://x/api/zobrazeni', telo, cA); return { status: r.status, ...(await r.json()) }; };

/* 1. Bez hesla. */
let r = await zkus({ matice: M(true) });
test('B168: POST matice bez hesla → 401', r.status === 401, r);
test('B168: odmítnutí bez hesla nese kod hesloSpravce', r.kod === 'hesloSpravce', r);
test('B168: matice bez hesla se neuložila', ulozeno() === null, ulozeno());

/* 2. Špatné heslo. */
r = await zkus({ matice: M(true), hesloSpravce: 'Spatne.Heslo.999' });
test('B168: POST matice se špatným heslem → 401', r.status === 401, r);
test('B168: odmítnutí špatného hesla nese kod hesloSpravce', r.kod === 'hesloSpravce', r);
test('B168: matice se špatným heslem se neuložila', ulozeno() === null, ulozeno());

/* 3. Správné heslo. */
r = await zkus({ matice: M(true), hesloSpravce: HESLO });
test('B168: POST matice se správným heslem → 200', r.status === 200 && r.ok === true, r);
const z = ulozeno();
test('B168: matice se správným heslem je uložená', !!(z && z.matice && z.matice['tab.detail']['Obchodník'] === true), z);
test('B168: heslo se do záznamu matice neukládá', !!z && !JSON.stringify(z).includes(HESLO), z);

/* 4. Další špatné heslo nesmí přepsat uloženou matici. */
r = await zkus({ matice: M(false), hesloSpravce: 'Spatne.Heslo.999' });
test('B168: špatné heslo nepřepíše uloženou matici', r.status === 401
  && ulozeno().matice['tab.detail']['Obchodník'] === true, { r, z: ulozeno() });

/* 5. GET beze změny — stačí přihlášení, heslo nechce. */
const g = await get(zobrazeni, 'http://x/api/zobrazeni', cA);
const gt = await g.json();
test('B168: GET matice dál bez hesla → 200 s uloženou maticí', g.status === 200
  && gt.zobrazeni && gt.zobrazeni.matice['tab.detail']['Obchodník'] === true, gt);

/* 6. Limit pokusů je tentýž jako u B77: po sérii špatných hesel 429. */
let posledni = null;
for (let i = 0; i < 12; i++) posledni = await zkus({ matice: M(false), hesloSpravce: 'Spatne.Heslo.' + i });
test('B168: série špatných hesel narazí na limit pokusů (429, kod hesloSpravce)',
  posledni.status === 429 && posledni.kod === 'hesloSpravce', posledni);
test('B168: ani po limitu se matice nezměnila', ulozeno().matice['tab.detail']['Obchodník'] === true, ulozeno());

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
