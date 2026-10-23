/* O-K8 #514 — OPRAVY NÁLEZŮ AUDITŮ K8 A S1 NA SERVERU (24. 10. 2026).
 *
 * Opravy, které nemění chování mimo souběh a vadný vstup (pokyn J. V.
 * k dialogu S1, SEC-7). Hlídá se:
 *  1) SEC-S1 — souběžné uložení starší kopie zakázky nesmaže zámek odeslané
 *     nabídky: a) zápis jiné instance mezi čtením a zápisem → 409;
 *     b) dvě uložení v téže instanci se řadí za sebe → nikdy obě 200 se
 *     ztraceným zámkem; c) smazání v témže výhradním úseku;
 *  2) SEC-S2 — souběžná změna vlastního hesla nevrátí snížení role,
 *     vypnutí ani smazání účtu (podklady/S1_pokusy/server/p2…);
 *  3) SEC-N1 — objekt v textovém poli účtů, šablon a programu → 400, ne 500;
 *  4) K8-S1, K8-S8 — objekt v čísle nabídky / názvu či id varianty → 400,
 *     prvek `null` ve variantách → 400 bez textu výjimky;
 *  5) SEC-I1 — odpovědi API nesou `Cache-Control: no-store` a `nosniff`;
 *  6) SEC-I3 — klíč `__proto__` se do uložené zakázky nedostane;
 *  7) SEC-I4 — klíč z adresy s lomítkem nebo řídicím znakem → 400;
 *  8) SEC-I5 — /api/vypocet nevrací text výjimky;
 *  9) SEC-N2 — dva souběžné začátky obnovy: jen jeden projde.
 *
 * Paměťové úložiště, smyšlené účty, zkušební ceník, bez sítě.
 * Spuštění: node netlify/test_ok8.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
const pamet = new Map();
/* Háčky okna souběhu (jako podklady/S1_pokusy/server/harness.mjs). */
const hacky = { poCteni: null, predZapisem: null };
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) {
    const h = pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null;
    if (hacky.poCteni) await hacky.poCteni(nazev, k);
    return h;
  },
  async zapis(k, v) {
    if (hacky.predZapisem) await hacky.predZapisem(nazev, k, v);
    pamet.set(nazev + '/' + k, JSON.stringify(v));
  },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
    .map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
globalThis.fetch = async (u) => { throw new Error('SÍŤ ZAKÁZÁNA: ' + u); };

const F = {};
for (const n of ['prihlaseni', 'uzivatele', 'program', 'firma', 'zakazky', 'zakaznici', 'sablony', 'vypocet', 'obnova', 'zdravi', 'ja'])
  F[n] = (await import('./functions/' + n + '.mjs')).default;
const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
const ZC = require('../src/zkusebni_cenik.js');
const zam = require('../src/zamek.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info))); } };
const req = (fn, metoda, url, telo, cookie) => fn(new Request('http://x' + url, {
  method: metoda, headers: cookie ? { cookie } : {},
  ...(telo !== undefined ? { body: typeof telo === 'string' ? telo : JSON.stringify(telo) } : {}) }));
const jsonOf = async (r) => { try { return await r.clone().json(); } catch (e) { return {}; } };
const cekej = (ms) => new Promise(r => setTimeout(r, ms));
const HESLO_ADMIN = 'Docasne.Heslo.123';
async function prihlas(email, heslo) {
  const r = await req(F.prihlaseni, 'POST', '/api/prihlaseni', { email, heslo });
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const ucet = (e) => JSON.parse(pamet.get('uzivatele/' + e) || 'null');

const cA = await prihlas(ADMIN_EMAIL, HESLO_ADMIN);
test('příprava: přihlášení správce', !!cA);
const U = {};
for (const [k, role] of [['obch', 'Obchodník'], ['obch2', 'Obchodník'], ['admin2', 'Administrátor']]) {
  const email = 'ok8.' + k + '@example.com', heslo = 'Ok8Heslo-' + k;
  const r = await jsonOf(await req(F.uzivatele, 'POST', '/api/uzivatele',
    { akce: 'zaloz', email, jmeno: 'Ok8 ' + k, role, heslo, hesloSpravce: HESLO_ADMIN }, cA));
  U[k] = { email, heslo, cookie: await prihlas(email, heslo) };
  test('příprava: účet ' + k, r.ok === true && !!U[k].cookie, r);
}
await req(F.program, 'POST', '/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
  slevy: { minMarze: 0, maxGlobalni: 1, stropy: { 'Obchodník': 0.03, 'Vedoucí': 0.12, 'Administrátor': 1 } } }, cA);
await req(F.zakazky, 'GET', '/api/zakazky', undefined, cA);   // načte jádro na globalThis
const G = globalThis;

function nova(cislo) {
  const z = G.novaZakazka();
  z.cislo = cislo; z.nazevAkce = 'Akce ' + cislo;
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.cenik = ZC.zkusebniCenik(); v.data.proj.cenik = ZC.zkusebniCenikProj();
  return z;
}
const kopie = (x) => JSON.parse(JSON.stringify(x));
const zamkni = (z) => { const v = z.varianty[0];
  zam.zamkniVariantu(v, { cislo: zam.variantaCislo(z, v), typ: 'nabidka', kdy: new Date().toISOString(), kdo: 'Ok8 A' }); return z; };
const ulozZak = (z, cookie, razitko) => req(F.zakazky, 'POST', '/api/zakazky',
  { zakazka: z, ...(razitko !== undefined ? { ocekavaneRazitko: razitko } : {}) }, cookie);
const zamcena = (soubor) => { const z = JSON.parse(pamet.get('zakazky/z/' + soubor) || 'null');
  return !!(z && z.varianty[0].zamek && z.varianty[0].zamek.zamceno); };

/* ---------- 1) SEC-S1: souběh nad z/<soubor> ---------- */
{
  const r0 = await jsonOf(await ulozZak(nova('2026 - OPR - CN - 8101'), U.obch.cookie, ''));
  test('S1 příprava: nezamčená zakázka uložena', r0.ok === true, r0);
  const soubor = r0.soubor, klic = 'z/' + soubor;
  const ulozena = JSON.parse(pamet.get('zakazky/' + klic));
  const zA = zamkni(kopie(ulozena));
  const zB = kopie(ulozena); zB.varianty[0].data.ock.zadani.zdvih = 12; zB.nazevAkce = 'Přepsáno kolegou';

  /* a) zápis jiné instance (výhradní úsek ho nevidí) mezi čtením a zápisem B */
  let jednou = true;
  hacky.poCteni = async (n, k) => {
    if (n === 'zakazky' && k === klic && jednou) {
      jednou = false;
      const jina = kopie(zA); jina.uloRazitko = G.uloRazitkoNove ? G.uloRazitkoNove() : 'jina-instance';
      pamet.set('zakazky/' + klic, JSON.stringify(jina));        // „jiná instance" zamkla
    }
  };
  const rB = await ulozZak(zB, U.obch2.cookie, ulozena.uloRazitko);
  hacky.poCteni = null;
  const tB = await jsonOf(rB);
  test('S1a: uložení starší kopie po zápisu jiné instance → 409 kolize', rB.status === 409 && tB.kolize === true, [rB.status, tB]);
  test('S1a: zámek odeslané nabídky drží', zamcena(soubor));
  test('S1a: data odeslané nabídky nepřepsána',
    JSON.parse(pamet.get('zakazky/' + klic)).varianty[0].data.ock.zadani.zdvih === 9);

  /* b) dvě uložení v téže instanci: B zdržené těsně před zápisem, A mezitím
   *    zamyká. Bez výhradního úseku by B zámek A přepsalo. */
  pamet.set('zakazky/' + klic, JSON.stringify(ulozena));
  let drz = true;
  hacky.predZapisem = async (n, k, v) => {
    if (n === 'zakazky' && k === klic && drz && v && v.nazevAkce === 'Přepsáno kolegou') { drz = false; await cekej(60); }
  };
  const pB = ulozZak(zB, U.obch2.cookie, ulozena.uloRazitko);
  await cekej(5);
  const rA = await ulozZak(zA, U.obch.cookie, ulozena.uloRazitko);
  const rB2 = await pB;
  hacky.predZapisem = null;
  const tA = await jsonOf(rA);
  test('S1b: obě souběžná uložení neprojdou (jedno 409)', !(rA.status === 200 && rB2.status === 200), [rA.status, rB2.status]);
  test('S1b: prošlo-li zamčení, zámek v databázi drží', rA.status !== 200 || zamcena(soubor), [rA.status, tA]);
  test('S1b: bez souběhu pozdější kopie dostane kolizi (A 409)', rA.status === 409 && tA.kolize === true, [rA.status, tA]);

  /* c) smazání se řadí za probíhající uložení: tisk zamyká (zdržený zápis),
   *    smazání bez potvrzení odeslané nabídky musí zámek vidět → 409. */
  pamet.set('zakazky/' + klic, JSON.stringify(ulozena));
  drz = true;
  hacky.predZapisem = async (n, k, v) => {
    if (n === 'zakazky' && k === klic && drz && v && v.varianty && v.varianty[0].zamek) { drz = false; await cekej(60); }
  };
  const pA = ulozZak(zamkni(kopie(ulozena)), U.obch.cookie, ulozena.uloRazitko);
  await cekej(5);
  const rDel = await req(F.zakazky, 'DELETE', '/api/zakazky?soubor=' + encodeURIComponent(soubor), undefined, cA);
  const rA2 = await pA;
  hacky.predZapisem = null;
  test('S1c: smazání souběžné se zamčením → 409 (odeslaná nabídka)', rA2.status === 200 && rDel.status === 409,
    [rA2.status, rDel.status]);
  test('S1c: zamčená zakázka zůstala', zamcena(soubor));
}

/* ---------- 2) SEC-S2: mojeheslo × zásah správce ---------- */
{
  hacky.predZapisem = async (n, k) => { if (n === 'pokusy' && k === 'e:' + U.admin2.email && hacky.drzS2) await cekej(80); };
  async function scenar(nazev, zasah, ztraceno) {
    hacky.drzS2 = true;
    const mh = req(F.uzivatele, 'POST', '/api/uzivatele', { akce: 'mojeheslo', stare: U.admin2.heslo, nove: U.admin2.heslo }, U.admin2.cookie);
    await cekej(10);
    const z = await jsonOf(await req(F.uzivatele, 'POST', '/api/uzivatele', zasah, cA));
    const r = await mh;
    hacky.drzS2 = false;
    if (r.headers.get('set-cookie')) U.admin2.cookie = r.headers.get('set-cookie').split(';')[0];
    const po = ucet(U.admin2.email);
    const ja = await jsonOf(await req(F.ja, 'GET', '/api/ja', undefined, U.admin2.cookie));
    test('S2 ' + nazev + ': zásah správce prošel', z.ok === true, z);
    test('S2 ' + nazev + ': zásah drží (změna hesla ho nevrátila)', !(await ztraceno(po, ja)), [r.status, po && { role: po.role, aktivni: po.aktivni }, ja.ok]);
  }
  /* Reset hesla správcem: platí heslo ze resetu, ne to ze souběžné změny. */
  await scenar('reset hesla', { akce: 'heslo', email: U.admin2.email, heslo: 'Ok8Reset-Heslo1', hesloSpravce: HESLO_ADMIN },
    async () => !(await prihlas(U.admin2.email, 'Ok8Reset-Heslo1')));
  U.admin2.heslo = 'Ok8Reset-Heslo1'; U.admin2.cookie = await prihlas(U.admin2.email, U.admin2.heslo);
  await scenar('snížení role', { akce: 'role', email: U.admin2.email, role: 'Obchodník' }, (po) => !po || po.role === 'Administrátor');
  await scenar('vypnutí', { akce: 'aktivni', email: U.admin2.email, aktivni: false }, (po, ja) => !po || po.aktivni !== false || ja.ok);
  /* Smazání: účet znovu zapnout, ať mojeheslo projde až k zápisu. */
  await req(F.uzivatele, 'POST', '/api/uzivatele', { akce: 'aktivni', email: U.admin2.email, aktivni: true }, cA);
  U.admin2.cookie = await prihlas(U.admin2.email, U.admin2.heslo);
  await scenar('smazání', { akce: 'smaz', email: U.admin2.email }, (po, ja) => !!po || ja.ok);
  hacky.predZapisem = null;
  /* Mimo souběh beze změny: heslo se změní, nová cookie platí. */
  const r = await req(F.uzivatele, 'POST', '/api/uzivatele', { akce: 'mojeheslo', stare: U.obch.heslo, nove: 'Ok8NoveHeslo-1' }, U.obch.cookie);
  const c = (r.headers.get('set-cookie') || '').split(';')[0];
  test('S2: změna hesla mimo souběh dál projde a vydá cookie', r.status === 200 && !!c);
  if (c) { U.obch.cookie = c; U.obch.heslo = 'Ok8NoveHeslo-1'; }
  test('S2: nová cookie platí', (await jsonOf(await req(F.ja, 'GET', '/api/ja', undefined, U.obch.cookie))).ok === true);
}

/* ---------- 3) SEC-N1: objekt v textovém poli → 400 ---------- */
{
  const O = { toString: 1 };
  const pripady = [
    ['obch', 'uzivatele', { akce: 'mojeheslo', stare: O, nove: 'Xyz12345678' }],
    ['obch', 'uzivatele', { akce: 'profil', email: O }],
    ['obch', 'uzivatele', { akce: 'profil', jmeno: O }],
    ['obch', 'uzivatele', { akce: 'profil', telefon: O }],
    ['obch', 'uzivatele', { akce: 'podpis', obrazek: O }],
    ['admin', 'uzivatele', { akce: 'zaloz', email: O, role: 'Obchodník', heslo: 'Xyz12345678' }],
    ['admin', 'uzivatele', { akce: 'heslo', email: U.obch2.email, heslo: O }],
    ['admin', 'uzivatele', { akce: 'prevod', email: U.obch2.email, na: O }],
    ['admin', 'uzivatele', { akce: 'smaz', email: O }],
    ['admin', 'uzivatele', { email: O }],
    ['admin', 'sablony', { akce: 'zverejnit', data: O }],
    ['admin', 'program', { poznamka: O }],
    ['admin', 'program', { build: O }],
    ['admin', 'program', { rada: O }],
  ];
  for (const [kdo, fn, telo] of pripady) {
    let st = 0, chyba = '';
    try { const r = await req(F[fn], 'POST', '/api/' + fn, telo, kdo === 'admin' ? cA : U.obch.cookie); st = r.status; chyba = (await jsonOf(r)).chyba || ''; }
    catch (e) { st = 500; chyba = e.message; }
    test('N1 ' + fn + ' ' + JSON.stringify(telo).slice(0, 60) + ' → 400', st === 400 && !/primitive/.test(chyba), [st, chyba]);
  }
}

/* ---------- 4) K8-S1, K8-S8: tvar čísla a variant ---------- */
{
  const zkus = async (uprav) => {
    const z = nova('2026 - OPR - CN - 8102'); uprav(z);
    let st = 0, chyba = '';
    try { const r = await ulozZak(z, U.obch.cookie, ''); st = r.status; chyba = (await jsonOf(r)).chyba || ''; }
    catch (e) { st = 500; chyba = e.message; }
    return { st, chyba };
  };
  for (const [n, f] of [['cislo objekt', z => { z.cislo = { toString: 1 }; }],
                        ['cislo pole', z => { z.cislo = ['2026 - OPR - CN - 8102']; }],
                        ['varianty[].nazev objekt', z => { z.varianty[0].nazev = { toString: 1 }; }],
                        ['varianty[].id objekt', z => { z.varianty[0].id = { toString: 1 }; }]]) {
    const v = await zkus(f);
    test('K8-S1 ' + n + ' → 400', v.st === 400 && !/primitive/.test(v.chyba), v);
  }
  const v = await zkus(z => { z.varianty.push(null); });
  test('K8-S8 varianta null → 400 bez textu výjimky', v.st === 400 && !/Cannot|properties|undefined|null \(/.test(v.chyba), v);
  const ok8102 = await zkus(() => {});
  test('K8-S1 platná zakázka dál projde', ok8102.st === 200, ok8102);
}

/* ---------- 5) SEC-I1: hlavičky odpovědí ---------- */
{
  const r1 = await req(F.zakazky, 'GET', '/api/zakazky', undefined, U.obch.cookie);
  const r2 = await req(F.uzivatele, 'GET', '/api/uzivatele', undefined, cA);
  const r3 = await req(F.zdravi, 'GET', '/api/zdravi');
  const r4 = await req(F.vypocet, 'GET', '/api/vypocet', undefined, cA);
  for (const [n, r] of [['zakazky', r1], ['uzivatele', r2], ['zdravi', r3], ['vypocet', r4]]) {
    test('I1 ' + n + ': Cache-Control no-store', r.headers.get('cache-control') === 'no-store', r.headers.get('cache-control'));
    test('I1 ' + n + ': X-Content-Type-Options nosniff', r.headers.get('x-content-type-options') === 'nosniff');
  }
}

/* ---------- 6) SEC-I3: prototypové klíče ---------- */
{
  const z = nova('2026 - OPR - CN - 8103');
  const telo = JSON.stringify({ zakazka: z, ocekavaneRazitko: '' })
    .replace('"sirka":', '"__proto__":{"zneuzito":1},"constructor":{"prototype":{"zneuzito":1}},"sirka":');
  const r = await req(F.zakazky, 'POST', '/api/zakazky', telo, U.obch.cookie);
  const t = await jsonOf(r);
  const ulozeny = pamet.get('zakazky/z/' + t.soubor) || '';
  test('I3: zakázka s prototypovými klíči se uloží', r.status === 200, [r.status, t]);
  test('I3: uložená zakázka nenese __proto__ ani constructor s objektem',
    ulozeny && !ulozeny.includes('"__proto__"') && !ulozeny.includes('"constructor":{'), ulozeny.slice(0, 0));
  test('I3: Object.prototype čistý', ({}).zneuzito === undefined);
}

/* ---------- 7) SEC-I4: klíč z adresy ---------- */
{
  for (const k of ['a/b', '../_rejstrik', 'x%0Ay']) {
    const r = await req(F.zakazky, 'GET', '/api/zakazky?soubor=' + k, undefined, U.obch.cookie);
    test('I4 GET zakázky ?soubor=' + k + ' → 400', r.status === 400, r.status);
    const r2 = await req(F.zakaznici, 'GET', '/api/zakaznici?klic=' + k, undefined, U.obch.cookie);
    test('I4 GET zákazníka ?klic=' + k + ' → 400', r2.status === 400, r2.status);
  }
  const rd = await req(F.zakazky, 'DELETE', '/api/zakazky?soubor=a%2Fb', undefined, cA);
  test('I4 DELETE zakázky s lomítkem → 400', rd.status === 400, rd.status);
  const rz = await req(F.zakaznici, 'DELETE', '/api/zakaznici?klic=a%2Fb', undefined, cA);
  test('I4 DELETE zákazníka s lomítkem → 400', rz.status === 400, rz.status);
  const rok = await req(F.zakazky, 'GET', '/api/zakazky?soubor=neexistuje-8199.json', undefined, U.obch.cookie);
  test('I4 běžné jméno dál projde (404 neexistuje)', rok.status === 404, rok.status);
}

/* ---------- 8) SEC-I5: /api/vypocet bez textu výjimky ---------- */
{
  const r = await req(F.vypocet, 'POST', '/api/vypocet', '{"zakazka":{"schema":2,"varianty":[null]}}', U.obch.cookie);
  const t = await jsonOf(r);
  test('I5: vadný vstup → 400', r.status === 400, r.status);
  test('I5: odpověď nenese text výjimky', !/Cannot|properties|is not|undefined/.test(t.chyba || ''), t.chyba);
}

/* ---------- 9) SEC-N2: dva souběžné začátky obnovy ---------- */
{
  const telo = { faze: 'zacatek', rezim: 'doplnit', potvrzeni: 'OBNOVIT' };
  const [a, b] = await Promise.all([req(F.obnova, 'POST', '/api/obnova', telo, cA), req(F.obnova, 'POST', '/api/obnova', telo, cA)]);
  const tokeny = [...pamet.keys()].filter(k => k.startsWith('zalohy/obnova-'));
  test('N2: z dvou souběžných začátků projde jeden', [a.status, b.status].sort().join(',') === '200,409', [a.status, b.status]);
  test('N2: v úložišti je jediný token obnovy', tokeny.length === 1, tokeny);
  /* b) jiná instance (výhradní úsek ji nevidí) zapsala starší token mezi
   *    kontrolou zámku a naším zápisem → náš začátek ustoupí s 409. */
  for (const k of [...pamet.keys()]) if (k.startsWith('zalohy/obnova-')) pamet.delete(k);
  const CIZI = 'f'.repeat(32);
  let jednou = true;
  hacky.predZapisem = async (n, k, v) => {
    if (n === 'zalohy' && k.startsWith('obnova-') && k !== 'obnova-' + CIZI && jednou && v && v.otiskSePorizuje) {
      jednou = false;
      pamet.set('zalohy/obnova-' + CIZI, JSON.stringify({ ...v, id: CIZI, kdo: 'jina.instance@priklad.cz',
        zacatek: new Date(Date.now() - 1000).toISOString(), naposled: new Date().toISOString() }));
    }
  };
  const c = await req(F.obnova, 'POST', '/api/obnova', telo, cA);
  hacky.predZapisem = null;
  const tokeny2 = [...pamet.keys()].filter(k => k.startsWith('zalohy/obnova-'));
  test('N2b: starší token jiné instance → náš začátek 409', c.status === 409, c.status);
  test('N2b: zůstal jen token jiné instance', tokeny2.length === 1 && tokeny2[0] === 'zalohy/obnova-' + CIZI, tokeny2);
}

console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
process.exit(fail ? 1 : 0);
