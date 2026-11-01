/* NÁLEZY SECURITY TESTU SEC-M (28. 10. 2026) — serverová sada dávky O-SECM #542.
 *
 * Zpráva podklady/SEC_AUDIT_MAIN_28_10.md, pokusy podklady/SECM_pokusy/.
 * Každý oddíl odpovídá jednomu nálezu; před opravou v27.10.6 padal
 * (pojistka proti prázdnému testu, viz commit dávky), po ní projde:
 *   M2  hluboké vnoření těla → 400 (dřív RangeError → 500, i obchodník)
 *   M3  číslo nabídky 200 000 znaků „-.-.…" → 400 rychle (dřív sekundy)
 *   M4  číslo PROJ nad CISLO_MAX → 400 (dřív se uložil klíč, který nešel smazat)
 *   M5  GET exportu controllingu s cizím Origin → 403, protokol beze změny
 *   M6  `{"toString":1}` ve faze / obnovaId / rezim / zdroj.otisk → 400
 *   M7  `__proto__` ve slevách programu (POST i obnova ze souboru) se neuloží
 *   M8  jednorázová obnova drží zámek: souběžný začátek po dávkách → 409,
 *       po ní zámek volný
 *   M9  klíč zakázky ze souboru zálohy s „/", „..", řídicím znakem → přeskočen
 *
 * Paměťové úložiště, zkušební ceník, smyšlené účty. Spuštění: node netlify/test_secm.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
const pamet = new Map();
/* M8: zápis zakázky lze zdržet, aby šel souběh poskládat v jedné instanci. */
globalThis.__ZDRZ_ZAPIS = null;
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) {
    if (globalThis.__ZDRZ_ZAPIS) await globalThis.__ZDRZ_ZAPIS(nazev, k);
    pamet.set(nazev + '/' + k, JSON.stringify(v));
  },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
    .map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

const F = {};
for (const n of ['prihlaseni', 'uzivatele', 'program', 'zakazky', 'zaloha', 'obnova', 'controlling_export',
  'analytika', 'firma', 'popisy', 'sablony', 'zakaznici', 'zobrazeni', 'controlling', 'slovnik'])
  F[n] = (await import('./functions/' + n + '.mjs')).default;
const { ADMIN_EMAIL, hloubkaTela, TELO_HLOUBKA_MAX } = await import('./lib/sdilene.mjs');
const { CISLO_MAX } = await import('./lib/zakazka_kontrola.mjs');
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
const ZC = require('../src/zkusebni_cenik.js');
const zk = require('../src/zakazka.js');
const ULO = require('../src/uloziste.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info).slice(0, 400))); } };
/* Výjimka obsluhy = na Netlify HTTP 500. */
const volej = async (fn, url, { metoda = 'POST', telo, text, cookie, hlavicky = {} } = {}) => {
  const h = { ...hlavicky }; if (cookie) h.cookie = cookie;
  const init = { method: metoda, headers: h };
  if (metoda !== 'GET') init.body = text !== undefined ? text : JSON.stringify(telo);
  let r;
  try { r = await fn(new Request(url, init)); } catch (e) { return { st: 500, o: { chyba: 'VÝJIMKA ' + (e && e.message) } }; }
  let o = {}; try { o = await r.json(); } catch (e) { /* bez těla */ }
  return { st: r.status, o };
};
const login = async (e, h) => ((await F.prihlaseni(new Request('http://x/api/prihlaseni', { method: 'POST',
  body: JSON.stringify({ email: e, heslo: h }) }))).headers.get('set-cookie') || '').split(';')[0];

const cA = await login(ADMIN_EMAIL, 'Docasne.Heslo.123');
test('příprava: správce přihlášen', /^relace=/.test(cA));
await volej(F.uzivatele, 'http://x/api/uzivatele', { cookie: cA,
  telo: { akce: 'zaloz', email: 'obchodnik@priklad.cz', jmeno: 'Test Obchodník', role: 'Obchodník', heslo: 'ObchodHeslo1' } });
const cO = await login('obchodnik@priklad.cz', 'ObchodHeslo1');
test('příprava: obchodník přihlášen', /^relace=/.test(cO));
const pub = await volej(F.program, 'http://x/api/program', { cookie: cA, telo: { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
  slevy: { minMarze: 0.1, maxGlobalni: 0.3, stropy: { 'Obchodník': 0.05 } } } });
test('příprava: ceník zveřejněn', pub.st === 200, pub);

let poradi = 0;
const novaZak = (cislo) => { const z = zk.novaZakazka(); z.cislo = cislo; z.nazevAkce = 'Akce SEC-M';
  Object.assign(z.varianty[0].data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2 }); return z; };
const ulozZak = (z, cookie = cO) => volej(F.zakazky, 'http://x/api/zakazky', { cookie, telo: { zakazka: z, ocekavaneRazitko: '' } });
for (const c of ['2026 - SECM - CN - 0001', '2026 - SECM - CN - 0002']) {
  const u = await ulozZak(novaZak(c));
  test('příprava: zakázka ' + c + ' uložena', u.st === 200, u);
}

/* ---------- M2: hluboké vnoření ---------- */
console.log('\n--- SEC-M2: hluboké vnoření těla ---');
{
  let hluboke = []; for (let i = 0; i < 10000; i++) hluboke = [hluboke];
  const hl = typeof hloubkaTela === 'function' ? hloubkaTela : () => NaN;   // před opravou funkce není → FAIL, ne pád
  test('M2: hloubkaTela měří bez rekurze (10 000 úrovní → nad strop, bez výjimky)', hl(hluboke) > TELO_HLOUBKA_MAX);
  test('M2: běžná hloubka projde (zakázka)', hl(novaZak('X')) <= TELO_HLOUBKA_MAX, hl(novaZak('X')));
  const telo = (obal) => { let s = '0'; for (let i = 0; i < 10000; i++) s = '[' + s + ']'; return obal.replace('@', s); };
  const pripady = [
    ['zakazky {zakazka:[[…]]} (obchodník)', F.zakazky, '/api/zakazky', cO, '{"zakazka":@}'],
    ['zakazky {zakazka:{cislo,x:[[…]]}} (obchodník)', F.zakazky, '/api/zakazky', cO, '{"zakazka":{"cislo":"2026 - SECM - CN - 0099","x":@}}'],
    ['zakazky {…, navic:[[…]]} (obchodník)', F.zakazky, '/api/zakazky', cO, '{"zakazka":{"cislo":"2026 - SECM - CN - 0098"},"navic":@}'],
    ['program (správce)', F.program, '/api/program', cA, '{"cenik":@}'],
    ['obnova náhled soubor.zakazky (správce)', F.obnova, '/api/obnova', cA, '{"nahled":true,"rezim":"doplnit","zdroj":{"soubor":{"porizena":"2026-10-01T00:00:00Z","zakazky":{"a.json":@}}}}'],
    ['analytika', F.analytika, '/api/analytika', cO, '{"udalosti":@}'],
    ['firma', F.firma, '/api/firma', cA, '{"udaje":@}'],
    ['popisy', F.popisy, '/api/popisy', cA, '{"texty":@}'],
    ['sablony', F.sablony, '/api/sablony', cA, '{"typ":@}'],
    ['zakaznici', F.zakaznici, '/api/zakaznici', cO, '{"zakaznik":@}'],
    ['zobrazeni', F.zobrazeni, '/api/zobrazeni', cA, '{"matice":@}'],
    ['controlling', F.controlling, '/api/controlling', cA, '{"data":@}'],
    ['slovnik', F.slovnik, '/api/slovnik', cA, '{"hesla":@}'],
    ['uzivatele', F.uzivatele, '/api/uzivatele', cA, '{"akce":"profil","x":@}'],
  ];
  for (const [n, fn, cesta, cookie, obal] of pripady) {
    const r = await volej(fn, 'http://x' + cesta, { cookie, text: telo(obal) });
    test('M2: ' + n + ' → 400 „hluboké vnoření"', r.st === 400 && /hluboké vnoření/.test(r.o.chyba || ''), [r.st, r.o.chyba]);
  }
  const r = await ulozZak(novaZak('2026 - SECM - CN - 0003'));
  test('M2: běžná zakázka se dál uloží', r.st === 200, r);
}

/* ---------- M3, M4: délka čísla ---------- */
console.log('\n--- SEC-M3/M4: číslo nabídky ---');
{
  const dlouhe = 'A' + '-.'.repeat(100000) + 'x';
  let t0 = Date.now();
  ULO.uloKlicSouboru(dlouhe);
  const ms = Date.now() - t0;
  test('M3: uloKlicSouboru nad 200 000 znaky „-." je lineární (< 200 ms)', ms < 200, ms + ' ms');
  test('M3: uloKlicSouboru ořízne koncové „-" a „." jako dřív',
    ULO.uloKlicSouboru('-.a.-') === 'a' && ULO.uloKlicSouboru('Č. 2026 - ZB - CN - 0500.1') === 'C.-2026-ZB-CN-0500.1'
    && ULO.uloKlicSouboru('...') === '' && ULO.uloKlicSouboru('a--b..') === 'a-b');
  t0 = Date.now();
  const r = await ulozZak(novaZak(dlouhe));
  const ms2 = Date.now() - t0;
  test('M3: uložení s číslem 200 000 znaků → 400 bez sekund výpočtu (< 500 ms)', r.st === 400 && ms2 < 500, [r.st, ms2 + ' ms']);
  const z61 = novaZak(''); z61.projHlavicka = Object.assign(z61.projHlavicka || {}, { cislo: 'P'.repeat(CISLO_MAX + 1) });
  const r61 = await ulozZak(z61);
  test('M4: číslo PROJ s ' + (CISLO_MAX + 1) + ' znaky (číslo OCK prázdné) → 400', r61.st === 400 && /PROJ/.test(r61.o.chyba || ''), r61);
  const z5k = novaZak(''); z5k.projHlavicka = Object.assign(z5k.projHlavicka || {}, { cislo: 'A' + '0'.repeat(5000) });
  const r5k = await ulozZak(z5k);
  test('M4: číslo PROJ 5 001 znaků → 400 a nic se nezapsalo', r5k.st === 400
    && ![...pamet.keys()].some(k => k.startsWith('zakazky/z/A000')), r5k.st);
  const zObj = novaZak(''); zObj.projHlavicka = Object.assign(zObj.projHlavicka || {}, { cislo: { toString: 1 } });
  const rObj = await ulozZak(zObj);
  test('M4: číslo PROJ jako objekt → 400', rObj.st === 400, rObj);
  const z60 = novaZak(''); z60.projHlavicka = Object.assign(z60.projHlavicka || {}, { cislo: '2026 - SECM - PROJ - ' + '1'.repeat(CISLO_MAX - 21) });
  const r60 = await ulozZak(z60);
  test('M4: číslo PROJ přesně ' + CISLO_MAX + ' znaků se uloží', z60.projHlavicka.cislo.length === CISLO_MAX && r60.st === 200, [z60.projHlavicka.cislo.length, r60]);
}

/* ---------- M5: GET exportu controllingu a původ ---------- */
console.log('\n--- SEC-M5: export controllingu a původ ---');
{
  const prot = () => ((JSON.parse(pamet.get('program/controlling_exporty') || 'null') || {}).zaznamy || []).length;
  const pred = prot();
  const url = 'http://x/api/controlling/export?vse=1';
  const r = await volej(F.controlling_export, url, { metoda: 'GET', cookie: cA, hlavicky: { origin: 'https://utocnik.example', host: 'x' } });
  test('M5: GET s cizím Origin → 403', r.st === 403, r.st);
  test('M5: a protokol exportů beze změny', prot() === pred, [pred, prot()]);
  const r2 = await volej(F.controlling_export, url, { metoda: 'GET', cookie: cA, hlavicky: { origin: 'http://x', host: 'x' } });
  test('M5: GET z vlastního původu projde', r2.st === 200, r2);
  const r3 = await volej(F.controlling_export, url, { metoda: 'GET', cookie: cA });
  test('M5: GET bez Origin (navigace, curl) projde', r3.st === 200, r3);
}

/* ---------- M6: objekt v textovém poli obnovy ---------- */
console.log('\n--- SEC-M6: obnova a {"toString":1} ---');
{
  const O = '{"toString":1}';
  for (const [n, text] of [
    ['faze', '{"faze":' + O + '}'],
    ['obnovaId (konec)', '{"faze":"konec","obnovaId":' + O + '}'],
    ['obnovaId (zrusit)', '{"faze":"zrusit","obnovaId":' + O + '}'],
    ['rezim', '{"rezim":' + O + ',"nahled":true}'],
    ['zdroj.otisk', '{"rezim":"doplnit","nahled":true,"zdroj":{"otisk":' + O + '}}'],
  ]) {
    const r = await volej(F.obnova, 'http://x/api/obnova', { cookie: cA, text });
    test('M6: obnova ' + n + ' jako objekt → 400', r.st === 400, [r.st, r.o.chyba]);
  }
}

/* ---------- M7: __proto__ v programu ---------- */
console.log('\n--- SEC-M7: prototypové klíče v programu ---');
{
  const slevy = '{"minMarze":0.1,"maxGlobalni":0.3,"stropy":{"Obchodník":0.06},"__proto__":{"stropy":{"Obchodník":0.9}}}';
  const text = '{"cenik":' + JSON.stringify(ZC.zkusebniCenik()) + ',"cenikProj":' + JSON.stringify(ZC.zkusebniCenikProj())
    + ',"slevy":' + slevy + '}';
  test('M7: (podvrh opravdu nese klíč __proto__)', text.includes('"__proto__"'));
  const r = await volej(F.program, 'http://x/api/program', { cookie: cA, text });
  test('M7: zveřejnění projde (200)', r.st === 200, r);
  test('M7: `__proto__` se do program/db neuložil', !/"__proto__"/.test(pamet.get('program/db') || ''));
  const g = await volej(F.program, 'http://x/api/program', { metoda: 'GET', cookie: cO });
  test('M7: GET /api/program obchodníka ho nenese', g.st === 200 && !Object.prototype.hasOwnProperty.call((g.o.platny || g.o.program || {}).slevy || {}, '__proto__')
    && !JSON.stringify(g.o).includes('__proto__'), g.st);
  /* obnova ze souboru */
  const zal = (await volej(F.zaloha, 'http://x/api/zaloha', { metoda: 'GET', cookie: cA })).o.zaloha;
  test('M7: (záloha ke stažení je)', !!(zal && zal.program && zal.program.platny));
  const zalText = JSON.stringify(zal).replace('"slevy":{', '"slevy":{"__proto__":{"x":1},');
  test('M7: (podvržená záloha nese __proto__ ve slevách)', zalText.includes('"slevy":{"__proto__"'));
  const o = await volej(F.obnova, 'http://x/api/obnova', { cookie: cA,
    text: '{"rezim":"prepsat","potvrzeni":"OBNOVIT","casti":["program"],"zdroj":{"soubor":' + zalText + '}}' });
  test('M7: obnova programu ze souboru proběhne', o.st === 200, [o.st, o.o.chyba]);
  test('M7: a `__proto__` ze souboru se do program/db neuložil', !/"__proto__"/.test(pamet.get('program/db') || ''));
}

/* ---------- M9: klíče zakázek ze souboru zálohy ---------- */
console.log('\n--- SEC-M9: klíče zakázek ze souboru ---');
{
  const zal = (await volej(F.zaloha, 'http://x/api/zaloha', { metoda: 'GET', cookie: cA })).o.zaloha;
  const vzor = Object.values(zal.zakazky)[0];
  const soubor = { porizena: zal.porizena, zakazky: {} };
  const spatne = ['podslozka/x.json', '..', '.', 'c\u0001d.json', 'zpet\\x.json', 'a'.repeat(201)];
  spatne.forEach((k, i) => { const z = JSON.parse(JSON.stringify(vzor)); z.cislo = '2026 - SECM - CN - 05' + String(i).padStart(2, '0'); soubor.zakazky[k] = z; });
  const dobra = JSON.parse(JSON.stringify(vzor)); dobra.cislo = '2026 - SECM - CN - 0600';
  soubor.zakazky['2026-SECM-CN-0600.json'] = dobra;
  const n = await volej(F.obnova, 'http://x/api/obnova', { cookie: cA, telo: { rezim: 'doplnit', nahled: true, casti: ['zakazky'], zdroj: { soubor } } });
  const duvody = (n.o.casti && n.o.casti.zakazky && n.o.casti.zakazky.duvody) || [];
  test('M9: náhled uvede každý nepřijatelný klíč s důvodem', spatne.every(k => duvody.some(d => d.klic === k && /nepřijatelný klíč/.test(d.duvod))), duvody);
  const o = await volej(F.obnova, 'http://x/api/obnova', { cookie: cA, telo: { rezim: 'doplnit', potvrzeni: 'OBNOVIT', casti: ['zakazky'], zdroj: { soubor } } });
  test('M9: obnova proběhne', o.st === 200, [o.st, o.o.chyba]);
  const klice = [...pamet.keys()].filter(k => k.startsWith('zakazky/z/'));
  test('M9: žádný nepřijatelný klíč se nezapsal', !klice.some(k => /podslozka|\/\.\.?$|\u0001|\\|a{201}/.test(k)), klice);
  test('M9: platný klíč ze souboru se zapsal', klice.includes('zakazky/z/2026-SECM-CN-0600.json'), klice);
}

/* ---------- M8: jednorázová obnova drží zámek ---------- */
console.log('\n--- SEC-M8: zámek jednorázové obnovy ---');
{
  const zal = (await volej(F.zaloha, 'http://x/api/zaloha', { metoda: 'GET', cookie: cA })).o.zaloha;
  for (const z of Object.values(zal.zakazky)) z.nazevAkce = 'Akce SEC-M (ze zálohy)';   // ať obnova opravdu zapisuje
  /* Souběh deterministicky: při PRVNÍM zápisu zakázky obnovy A (A už
   * zapisuje) pošle háček začátek po dávkách a druhou jednorázovou obnovu. */
  let tokenyBehem = null, zac = null, dva = null;
  globalThis.__ZDRZ_ZAPIS = async (nazev, k) => {
    if (tokenyBehem || nazev !== 'zakazky' || !/^z\//.test(k)) return;
    tokenyBehem = [...pamet.keys()].filter(x => x.startsWith('zalohy/obnova-'));
    const ulozeny = globalThis.__ZDRZ_ZAPIS; globalThis.__ZDRZ_ZAPIS = null;
    zac = await volej(F.obnova, 'http://x/api/obnova', { cookie: cA, telo: { faze: 'zacatek', rezim: 'doplnit', potvrzeni: 'OBNOVIT' } });
    dva = await volej(F.obnova, 'http://x/api/obnova', { cookie: cA, telo: { rezim: 'prepsat', potvrzeni: 'OBNOVIT', casti: ['zakazky'], zdroj: { soubor: zal } } });
    globalThis.__ZDRZ_ZAPIS = ulozeny;
  };
  const a = await volej(F.obnova, 'http://x/api/obnova', { cookie: cA, telo: { rezim: 'prepsat', potvrzeni: 'OBNOVIT', casti: ['zakazky'], zdroj: { soubor: zal } } });
  globalThis.__ZDRZ_ZAPIS = null;
  test('M8: (háček souběhu se spustil — A zapisovala zakázky)', !!tokenyBehem && !!zac && !!dva);
  tokenyBehem = tokenyBehem || []; zac = zac || { o: {} }; dva = dva || { o: {} };
  test('M8: jednorázová obnova A proběhne', a.st === 200, [a.st, a.o.chyba]);
  test('M8: během ní drží token (zámek) v úložišti', tokenyBehem.length === 1, tokenyBehem);
  test('M8: začátek obnovy po dávkách během A → 409', zac.st === 409 && !!zac.o.obnovaBezi, [zac.st, zac.o.chyba]);
  test('M8: druhá jednorázová obnova během A → 409', dva.st === 409, [dva.st, dva.o.chyba]);
  if (zac.st === 200) await volej(F.obnova, 'http://x/api/obnova', { cookie: cA, telo: { faze: 'zrusit', obnovaId: zac.o.obnovaId } });
  test('M8: po A se zámek uvolní (žádný token)', ![...pamet.keys()].some(k => k.startsWith('zalohy/obnova-')));
  const po = await volej(F.obnova, 'http://x/api/obnova', { cookie: cA, telo: { faze: 'zacatek', rezim: 'doplnit', potvrzeni: 'OBNOVIT' } });
  test('M8: začátek po dávkách po A projde (200)', po.st === 200 && !!po.o.obnovaId, [po.st, po.o.chyba]);
  const jedn = await volej(F.obnova, 'http://x/api/obnova', { cookie: cA, telo: { rezim: 'prepsat', potvrzeni: 'OBNOVIT', casti: ['zakazky'], zdroj: { soubor: zal } } });
  test('M8: jednorázová obnova během rozpracované po dávkách → 409', jedn.st === 409, jedn.st);
  await volej(F.obnova, 'http://x/api/obnova', { cookie: cA, telo: { faze: 'zrusit', obnovaId: po.o.obnovaId } });
  /* zámek se uvolní i tehdy, když jednorázová obnova skončí chybou po založení tokenu */
  globalThis.__ZDRZ_ZAPIS = async (nazev, k) => { if (nazev === 'zalohy' && /pred-obnovou/.test(k)) throw new Error('simulovaný výpadek'); };
  const chyb = await volej(F.obnova, 'http://x/api/obnova', { cookie: cA, telo: { rezim: 'prepsat', potvrzeni: 'OBNOVIT', casti: ['zakazky'], zdroj: { soubor: zal } } });
  globalThis.__ZDRZ_ZAPIS = null;
  test('M8: nepovedený otisk před obnovou → 500 NEPROVEDLA', chyb.st === 500 && /NEPROVEDLA/.test(chyb.o.chyba || ''), [chyb.st, chyb.o.chyba]);
  test('M8: a zámek po ní nezůstal viset', ![...pamet.keys()].some(k => k.startsWith('zalohy/obnova-')),
    [...pamet.keys()].filter(k => k.startsWith('zalohy/obnova-')));
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
if (fail) process.exit(1);
