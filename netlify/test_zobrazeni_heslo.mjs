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
 * B188 (audit 18. 10. 2026, v18.10.15): totéž heslo chce obnova části
 * „zobrazeni" ze zálohy — ze souboru, z otisku i v dávce rozpracované obnovy.
 * Pojistka: proti cdca5f3 (v18.10.14) selhalo 7 kontrol oddílu B188 (obnova
 * bez hesla i se špatným heslem matici zapsala s 200).
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
const { default: obnova } = await import(R + 'netlify/functions/obnova.mjs');
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

/* 6. B188: obnova části „zobrazeni" ze zálohy chce totéž heslo. */
const matOb = (v) => ({ 'tab.detail': { 'Obchodník': v, 'Vedoucí': v } });
const souborZ = (v) => ({ porizena: '2026-10-18T08:00:00.000Z', zdroj: 'x', zobrazeni: { matice: matOb(v), kdo: 'x', kdy: '2026-10-18' } });
const obn = async (telo) => { const r = await post(obnova, 'http://x/api/obnova', telo, cA); return { status: r.status, ...(await r.json()) }; };
const zalohyKlice = () => [...pamet.keys()].filter(k => k.startsWith('zalohy/')).sort().join(',');
const ostra = (zdroj, navic) => ({ rezim: 'prepsat', casti: ['zobrazeni'], potvrzeni: 'OBNOVIT', zdroj, ...(navic || {}) });
const vychozi = JSON.stringify(ulozeno());
let kliceZaloh = zalohyKlice();

r = await obn(ostra({ soubor: souborZ(false) }));
test('B188: obnova matice ze souboru bez hesla → 401 (kod hesloSpravce)', r.status === 401 && r.kod === 'hesloSpravce', r);
test('B188: obnova bez hesla matici nezapsala', JSON.stringify(ulozeno()) === vychozi, ulozeno());
test('B188: obnova bez hesla nepořídila otisk ani nezamkla (odmítnutí před zámkem)', zalohyKlice() === kliceZaloh, zalohyKlice());
r = await obn(ostra({ soubor: souborZ(false) }, { hesloSpravce: 'Spatne.Heslo.999' }));
test('B188: obnova matice ze souboru se špatným heslem → 401, nezapsáno', r.status === 401
  && JSON.stringify(ulozeno()) === vychozi, { r, z: ulozeno() });

/* Otisk na serveru (vrácení starší, volnější matice). */
pamet.set('zalohy/2026-10-01', JSON.stringify(souborZ(false)));
kliceZaloh = zalohyKlice();
r = await obn(ostra({ otisk: '2026-10-01' }));
test('B188: obnova matice z otisku bez hesla → 401, nezapsáno', r.status === 401 && r.kod === 'hesloSpravce'
  && JSON.stringify(ulozeno()) === vychozi && zalohyKlice() === kliceZaloh, { r, z: ulozeno() });

/* Náhled nic nezapisuje a heslo nechce. */
r = await obn({ rezim: 'prepsat', casti: ['zobrazeni'], nahled: true, zdroj: { soubor: souborZ(false) } });
test('B188: náhled obnovy matice bez hesla → 200, nezapsáno', r.status === 200 && JSON.stringify(ulozeno()) === vychozi, r);

/* Obnova po dávkách: dávka s maticí bez hesla 401, s heslem zapíše. */
const zac = await obn({ faze: 'zacatek', rezim: 'prepsat', casti: ['zobrazeni'], potvrzeni: 'OBNOVIT' });
r = await obn({ ...ostra({ soubor: souborZ(false) }), obnovaId: zac.obnovaId });
test('B188: dávka obnovy s maticí bez hesla → 401, nezapsáno', r.status === 401
  && JSON.stringify(ulozeno()) === vychozi, { r, zac });
r = await obn({ ...ostra({ soubor: souborZ(false) }), obnovaId: zac.obnovaId, hesloSpravce: HESLO });
test('B188: dávka obnovy s maticí a správným heslem → 200, zapsáno', r.status === 200
  && ulozeno().matice['tab.detail']['Obchodník'] === false, { r, z: ulozeno() });
await obn({ faze: 'konec', obnovaId: zac.obnovaId });

/* Jednorázová obnova se správným heslem zapíše; heslo se do záznamu nedostane. */
r = await obn(ostra({ soubor: souborZ(true) }, { hesloSpravce: HESLO }));
test('B188: obnova matice ze souboru se správným heslem → 200, zapsáno', r.status === 200
  && ulozeno().matice['tab.detail']['Obchodník'] === true && !JSON.stringify(ulozeno()).includes(HESLO), { r, z: ulozeno() });

/* Záloha bez matice (jiná část, nebo `zobrazeni: null`) heslo nechce. */
r = await obn({ rezim: 'prepsat', casti: ['zobrazeni'], potvrzeni: 'OBNOVIT',
  zdroj: { soubor: { porizena: '2026-10-18T08:00:00.000Z', zdroj: 'x', zobrazeni: null } } });
test('B188: záloha bez matice heslo nechce (200)', r.status === 200, r);

/* 7. Limit pokusů je tentýž jako u B77: po sérii špatných hesel 429. */
let posledni = null;
for (let i = 0; i < 12; i++) posledni = await zkus({ matice: M(false), hesloSpravce: 'Spatne.Heslo.' + i });
test('B168: série špatných hesel narazí na limit pokusů (429, kod hesloSpravce)',
  posledni.status === 429 && posledni.kod === 'hesloSpravce', posledni);
test('B168: ani po limitu se matice nezměnila', ulozeno().matice['tab.detail']['Obchodník'] === true, ulozeno());

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
