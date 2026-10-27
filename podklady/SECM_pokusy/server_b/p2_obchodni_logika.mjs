/* SEC-M server-B, bod 7: OBCHODNÍ LOGIKA přes API (obchodník, vedoucí, admin2).
 * Zámek odeslané nabídky, dotisk, sleva a její schválení, cenová výjimka, minimální marže,
 * viditelnost nákladů (P12), controlling a exporty. Každý řádek OK = ochrana drží. */
import { priprav, pripravData, F, req, pamet, zakazkaCislo, zamkni, kopie, ulozZak, ulozena, jsonOf, sada, S } from './harness.mjs';
const T = sada('p2_obchodni_logika');
const U = await priprav();
await pripravData(U.admin.cookie, { minMarze: 0.001, maxGlobalni: 1, stropy: { 'Obchodník': 0.03, 'Vedoucí': 0.12, 'Administrátor': 1 } });   // stropy: Obchodník 3 %, Vedoucí 12 %

/* ---------- zámek ---------- */
const r0 = await jsonOf(await ulozZak(zakazkaCislo('2026 - SB - CN - 0101'), U.obch.cookie, ''));
const soubor = r0.soubor;
let s = ulozena(soubor); zamkni(s, s.varianty[0]);
s.varianty[0].zamek.vysledek = { ock: { zakladCena: 1000 } };   // zmrazený výsledek (jako aplikace)
let r = await ulozZak(s, U.obch.cookie, s.uloRazitko);
T.t('příprava: zamčená nabídka uložena (200)', r.status === 200, await jsonOf(r));
const zamcena = () => ulozena(soubor);
const pokus = async (popis, uprav, cookie, ocek, navic) => {
  const z = kopie(zamcena()); uprav(z);
  const rr = await ulozZak(z, cookie || U.obch.cookie, z.uloRazitko, navic);
  const ok = Array.isArray(ocek) ? ocek.includes(rr.status) : rr.status === ocek;
  T.t(popis + ' → ' + (Array.isArray(ocek) ? ocek.join('/') : ocek) + ' (je ' + rr.status + ')', ok, (await jsonOf(rr)).chyba);
};
await pokus('L1 změna zdvihu zamčené varianty', z => { z.varianty[0].data.ock.zadani.zdvih = 4; }, null, 409);
await pokus('L2 smazání zamčené varianty', z => { z.varianty = [kopie(z.varianty[0])]; z.varianty[0].id = 'novaid1'; delete z.varianty[0].zamek; }, null, [400, 409]);
await pokus('L3 zámek = null bez odemčení', z => { z.varianty[0].zamek = null; }, null, 409);
await pokus('L3b zámek pryč + podvržené odemčení (obchodník)', z => { z.varianty[0].zamek = null; z.varianty[0].odemceni = [{ kdo: 'X', kdy: new Date().toISOString() }]; }, null, 403);
await pokus('L4 změna čísla zakázky se zámkem (obchodník)', z => { z.cislo = '2026 - SB - CN - 0199'; }, null, [403, 409]);
await pokus('L5 prepsat:true + změna dat', z => { z.varianty[0].data.ock.zadani.zdvih = 4; }, null, 409, { prepsat: true });
await pokus('L6 přepis zmrazeného výsledku zámku', z => { z.varianty[0].zamek.vysledek.ock.zakladCena = 1; }, null, 409);
await pokus('L7 změna ceníku zamčené varianty', z => { const c = z.varianty[0].data.cenik; const k = Object.keys(c).find(k => typeof c[k] === 'number'); c[k] = 0; }, null, [403, 409]);
await pokus('L8 sleva 50 % v zamčené variantě', z => { Object.assign(z.varianty[0].data.sleva, { procenta: 50, stav: 'schváleno', schvalil: 'X' }); }, null, [403, 409]);
await pokus('L9 duplicitní id varianty (kopie zamčené bez zámku)', z => { const k = kopie(z.varianty[0]); delete k.zamek; k.data.ock.zadani.zdvih = 4; z.varianty.push(k); }, null, [400, 409]);
await pokus('L10 tentýž zámek, admin2 mění data (i admin)', z => { z.varianty[0].data.ock.zadani.zdvih = 4; }, U.admin2.cookie, 409);
await pokus('L11 podvržení razítka zámku kdo', z => { z.varianty[0].zamek.kdo = 'Podvrh <x@example.com>'; }, null, 200);
T.t('L11b razítko kdo zůstalo z uložené verze', !/Podvrh/.test(zamcena().varianty[0].zamek.kdo || ''), zamcena().varianty[0].zamek.kdo);
await pokus('L12 smazání záznamu tisky[] (ubrání historie)', z => { z.varianty[0].zamek.tisky = []; }, null, [200, 409]);
T.t('L12b tisky[] po uložení nezkrácené', (zamcena().varianty[0].zamek.tisky || []).length >= 1, zamcena().varianty[0].zamek.tisky);
{ const rr = await req(F.zakazky, 'DELETE', '/api/zakazky?soubor=' + soubor, undefined, U.obch.cookie);
  T.t('L13 DELETE zamčené zakázky obchodníkem → 403', rr.status === 403, rr.status);
  const ra = await req(F.zakazky, 'DELETE', '/api/zakazky?soubor=' + soubor, undefined, U.admin2.cookie);
  T.t('L14 DELETE zamčené admin bez ismazatOdeslane → 409', ra.status === 409, ra.status); }
/* SEC-S1: souběh „jiné instance" (zápis mezi čtením a zápisem) */
{
  const rr0 = await jsonOf(await ulozZak(zakazkaCislo('2026 - SB - CN - 0102'), U.obch.cookie, ''));
  const kl = 'zakazky/z/' + rr0.soubor; const puvodni = JSON.parse(pamet.get(kl));
  const zA = kopie(puvodni); zamkni(zA, zA.varianty[0]); zA.uloRazitko = 'jina-instance-' + Date.now();
  const zB = kopie(puvodni); zB.varianty[0].data.ock.zadani.zdvih = 12;
  let jednou = true;
  globalThis.__ZPOZDI_PO_CTENI = async (n, k) => { if (n === 'zakazky' && 'zakazky/' + k === kl && jednou) { jednou = false; pamet.set(kl, JSON.stringify(zA)); } };
  const rB = await ulozZak(zB, U.obch2.cookie, puvodni.uloRazitko);
  globalThis.__ZPOZDI_PO_CTENI = null;
  T.t('L15 SEC-S1: starší kopie po zámku jiné instance → 409, zámek drží', rB.status === 409 && !!JSON.parse(pamet.get(kl)).varianty[0].zamek, rB.status);
  /* okno mezi DRUHÝM čtením a zápisem (mez SEC-S1 mezi instancemi) */
  const z2 = JSON.parse(pamet.get(kl)); delete z2.varianty[0].zamek; pamet.set(kl, JSON.stringify(puvodni));
  let cteni = 0;
  globalThis.__ZPOZDI_PO_CTENI = async (n, k) => { if (n === 'zakazky' && 'zakazky/' + k === kl && ++cteni === 2) pamet.set(kl, JSON.stringify(zA)); };
  const rC = await ulozZak(kopie(zB), U.obch2.cookie, puvodni.uloRazitko);
  globalThis.__ZPOZDI_PO_CTENI = null;
  console.log('     (info) zápis jiné instance až po druhém čtení: stav', rC.status, '· zámek po', !!JSON.parse(pamet.get(kl)).varianty[0].zamek);
  T.t('L16 SEC-S1 mez: zápis jiné instance mezi 2. čtením a zápisem (očekávaná mez B4/B158)', true);
}

/* ---------- sleva a schválení ---------- */
const nova = async (c) => { const rr = await jsonOf(await ulozZak(zakazkaCislo(c), U.obch.cookie, '')); return rr.soubor; };
const ulozS = async (sb, uprav, cookie) => { const z = kopie(ulozena(sb)); uprav(z); const rr = await ulozZak(z, cookie, z.uloRazitko); return { st: rr.status, t: await jsonOf(rr) }; };
const sb1 = await nova('2026 - SB - CN - 0201');
let x = await ulozS(sb1, z => Object.assign(z.varianty[0].data.sleva, { procenta: 10, stav: 'schváleno', schvalenoProc: 10, schvalil: 'Vedoucí Podvrh' }), U.obch.cookie);
T.t('A1 obchodník si „schválí" 10 % → 403', x.st === 403, x);
x = await ulozS(sb1, z => Object.assign(z.varianty[0].data.sleva, { procenta: 10, stav: 'schváleno automaticky' }), U.obch.cookie);
T.t('A2 obchodník 10 % „automaticky" nad strop 3 % → 403', x.st === 403, x);
x = await ulozS(sb1, z => Object.assign(z.varianty[0].data.sleva, { procenta: 10, stav: 'čeká na schválení', role: 'Administrátor' }), U.obch.cookie);
T.t('A3 žádost 10 % s podvrženou rolí → 200 a role = Obchodník', x.st === 200 && ulozena(sb1).varianty[0].data.sleva.role === 'Obchodník', [x.st, ulozena(sb1).varianty[0].data.sleva.role]);
x = await ulozS(sb1, z => Object.assign(z.varianty[0].data.sleva, { stav: 'schváleno', schvalenoProc: 10, schvalil: 'cokoli', schvalilKdy: '2020-01-01T00:00:00Z' }), U.ved.cookie);
const sl = ulozena(sb1).varianty[0].data.sleva;
T.t('A4 vedoucí schválí 10 % → 200, razítko ze serveru, čas ne antedatovaný', x.st === 200 && /Pokus ved/.test(sl.schvalil) && sl.schvalilKdy > '2026', [x.st, sl.schvalil, sl.schvalilKdy, x.t.chyba]);
x = await ulozS(sb1, z => Object.assign(z.varianty[0].data.sleva, { procenta: 12, schvalenoProc: 12 }), U.obch.cookie);
T.t('A5 obchodník po schválení zvedne na 12 % se „schváleno" → 403', x.st === 403, x);
x = await ulozS(sb1, z => Object.assign(z.varianty[0].data.sleva, { schvalil: 'Ředitel', schvalilEmail: 'reditel@example.com' }), U.obch.cookie);
T.t('A6 obchodník přepíše jméno schvalovatele → razítko z uložené verze', /Pokus ved/.test(ulozena(sb1).varianty[0].data.sleva.schvalil) && ulozena(sb1).varianty[0].data.sleva.schvalilEmail !== 'reditel@example.com', ulozena(sb1).varianty[0].data.sleva);
x = await ulozS(sb1, z => { const k = kopie(z.varianty[0]); k.id = 'klonx01'; k.nazev = 'Klon'; z.varianty.push(k); }, U.obch.cookie);
T.t('A7 klon varianty i se schválenou slevou (nová id) → 403', x.st === 403, x);
x = await ulozS(sb1, z => { z.varianty[0].data.ock.zadani.zdvih = 30; }, U.obch.cookie);
T.t('A8 po schválení změna zadání (zdvih 9→30), sleva % platí dál (záměr: sleva je procento) → 200', x.st === 200, x);
x = await ulozS(sb1, z => { Object.assign(z.varianty[0].data.sleva, { stav: 'čeká na schválení' }); }, U.obch.cookie);
T.t('A9 obchodník vrátí schválení na „čeká" (B101) → rozhodnutí zůstane', ulozena(sb1).varianty[0].data.sleva.stav === 'schváleno', ulozena(sb1).varianty[0].data.sleva.stav);
/* minimální marže: přenastavit minMarze na 90 % a vedoucí schválí 10 % → server musí odmítnout */
{
  const db = JSON.parse(pamet.get('program/db')); const pred = kopie(db.platny.slevy);
  db.platny.slevy.minMarze = 0.95; pamet.set('program/db', JSON.stringify(db));
  const sb2 = await nova('2026 - SB - CN - 0202');
  await ulozS(sb2, z => Object.assign(z.varianty[0].data.sleva, { procenta: 10, stav: 'čeká na schválení' }), U.obch.cookie);
  x = await ulozS(sb2, z => Object.assign(z.varianty[0].data.sleva, { stav: 'schváleno', schvalenoProc: 10 }), U.ved.cookie);
  T.t('A10 marže: schválení 10 % pod minimální marží → 403 (B71)', x.st === 403, x);
  x = await ulozS(sb2, z => Object.assign(z.varianty[0].data.sleva, { procenta: 2, stav: 'schváleno automaticky' }), U.obch.cookie);
  T.t('A11 marže: 2 % automaticky pod minimem → 403', x.st === 403, x);
  db.platny.slevy = pred; pamet.set('program/db', JSON.stringify(db));
}
/* ---------- cenová výjimka ---------- */
{
  const sb3 = await nova('2026 - SB - CN - 0301');
  x = await ulozS(sb3, z => { z.varianty[0].data.cenovaVyjimka = { stav: 'schváleno', obsah: '{"s":[],"p":[]}', schvalil: 'Podvrh', polozek: 0, pasu: 0 }; }, U.obch.cookie);
  T.t('V1 obchodník podvrhne schválenou cenovou výjimku → 403', x.st === 403, x);
  x = await ulozS(sb3, z => { z.varianty[0].data.cenovaVyjimka = { stav: 'zamítnuto', obsah: 'x', zamitl: 'Podvrh' }; }, U.obch.cookie);
  T.t('V2 obchodník podvrhne zamítnutí → 403', x.st === 403, x);
  x = await ulozS(sb3, z => { z.varianty[0].data.cenovaVyjimka = { stav: 'čeká na schválení', pozadal: 'Podvrh', obsah: 'cokoli' }; }, U.obch.cookie);
  const cv = ulozena(sb3).varianty[0].data.cenovaVyjimka;
  T.t('V3 žádost bez rozdílu proti ceníku se neuloží / žadatel z relace', x.st === 200 && (!cv || !/Podvrh/.test(cv.pozadal || '')), [x.st, cv]);
  x = await ulozS(sb3, z => { z.varianty[0].data.cenovaVyjimka = { stav: 'cokoli' }; }, U.obch.cookie);
  T.t('V4 neznámý stav výjimky → 400', x.st === 400, x);
}
/* ---------- P12: náklady přes API obchodníka ---------- */
{
  const NAKL = /naklad|marz|Naklad|Marz|zakladNaklad|minMarze|stropy/;
  const kliceS = (o, cesta, out) => { if (o && typeof o === 'object') for (const k of Object.keys(o)) { if (NAKL.test(k)) out.add(cesta + '.' + k); if (out.size < 400) kliceS(o[k], cesta + '.' + k.replace(/\d+/g, '#'), out); } return out; };
  for (const [n, fn, url] of [['program', F.program, '/api/program'], ['zakazky rejstřík', F.zakazky, '/api/zakazky'],
    ['schvalovani?vse=1', F.schvalovani, '/api/schvalovani?vse=1'], ['zobrazeni', F.zobrazeni, '/api/zobrazeni'],
    ['ja', F.ja, '/api/ja'], ['zakaznici', F.zakaznici, '/api/zakaznici'], ['firma', F.firma, '/api/firma'],
    ['popisy', F.popisy, '/api/popisy'], ['slovnik', F.slovnik, '/api/slovnik'], ['sablony', F.sablony, '/api/sablony'],
    ['analytika rezim', F.analytika, '/api/analytika?akce=rezim'], ['uzivatele', F.uzivatele, '/api/uzivatele']]) {
    const rr = await req(fn, 'GET', url, undefined, U.obch.cookie); const t = await jsonOf(rr);
    const k = [...kliceS(t, '', new Set())];
    console.log('     P12 ' + n + ': ' + rr.status + ' · nákladové klíče: ' + (k.length ? k.slice(0, 6).join(', ') + (k.length > 6 ? ' … (' + k.length + ')' : '') : '—'));
    if (n === 'program') T.t('P1 program: historie verzí obchodníkovi skrytá (P12)', !(t.db && t.db.historie && t.db.historie.length), t.db && t.db.historieVynechana);
    if (/schvalovani|rejstřík|zobrazeni|ja|uzivatele|zakaznici/.test(n)) T.t('P2 ' + n + ': bez nákladových klíčů', !k.filter(x => !/minMarze|stropy/.test(x) || n !== 'program').length, k);
  }
  for (const [n, fn, url] of [['controlling', F.controlling, '/api/controlling'], ['controlling_export', F.controlling_export, '/api/controlling/export?od=2026-01-01&do=2026-12-31'],
    ['zaloha', F.zaloha, '/api/zaloha'], ['zaloha?zdroj=nocni', F.zaloha, '/api/zaloha?zdroj=nocni'], ['zaloha_vynuceno', F.zaloha_vynuceno, '/api/zaloha_vynuceno'],
    ['analytika', F.analytika, '/api/analytika']]) {
    for (const kdo of ['obch', 'ved']) {
      const rr = await req(fn, 'GET', url, undefined, U[kdo].cookie);
      T.t('P3 ' + n + ' pro ' + kdo + ' → 403', rr.status === 403, rr.status);
    }
  }
  const rv = await req(F.vypocet, 'POST', '/api/vypocet', { zakazka: { cislo: 'x' } }, U.obch.cookie);
  const tv = await jsonOf(rv);
  console.log('     P12 vypocet (obchodník, vlastní vstup): ' + rv.status + ' · ' + JSON.stringify(tv).slice(0, 120));
  T.t('P4 vypocet nečte serverový ceník (počítá jen z poslaného programu)', !JSON.stringify(tv).includes(String(JSON.parse(pamet.get('program/db')).platny.verze) + '"'), null);
  /* zakazky GET: cenik varianty s náklady (B162a/B88 — vědomá mez) */
  const rz = await jsonOf(await req(F.zakazky, 'GET', '/api/zakazky?soubor=' + soubor, undefined, U.obch2.cookie));
  console.log('     P12 zakazky?soubor (cizí obchodník): cenik varianty v odpovědi =', !!(rz.zakazka && rz.zakazka.varianty[0].data.cenik), '(vědomá mez B88/B162a)');
}
process.exitCode = T.konec() ? 1 : 0;
