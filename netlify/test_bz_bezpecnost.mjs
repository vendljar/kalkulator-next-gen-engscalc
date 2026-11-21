/* ============================================================
 * DÁVKA BZ (21. 11. 2026) — opravy nálezů bezpečnostního auditu 20. 11. 2026
 * (podklady/2026-11-20_BEZPECNOSTNI_AUDIT_v19.11.11.md), rozhodnutí J. V.
 *
 *   B231  příznak strany zakázky (jenProj / jenOck) po zámku a Prodáno
 *   B232  přísné ověření zmrazeného výsledku vyžaduje všechna čísla
 *   B233  počítadla pokusů o přihlášení při souběhu
 *   B234  karta zákazníka: mění jen autor a správce, historie verzí
 *   B235/B236  zápis do Pipedrive jen k dealu vlastní zakázky, strop na uživatele
 *   B195  nulová ruční cena jen se zdrojem
 *
 * Skutečné funkce netlify/functions nad PAMĚŤOVÝM úložištěm, bez sítě. Scénáře
 * jsou PoC auditu (podklady/audit_2026-11-20/poc_*.mjs) převedené na testy:
 * před opravou každý test selže (ZRANITELNÉ), po opravě projde (ODOLNÉ).
 * Smyšlené kontakty …@priklad.cz. Spouští se `node netlify/test_bz_bezpecnost.mjs`.
 * ============================================================ */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';

const pamet = new Map();
/* Počítadla pokusů s 2 ms zpožděním čtení a zápisu (Blobs je síťové volání) — B233. */
const cekej = (nazev) => (nazev === 'pokusy' ? new Promise(r => setTimeout(r, 2)) : Promise.resolve());
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { await cekej(nazev); return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { await cekej(nazev); pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

import './pomoc_test_admin.mjs';
import prihlaseni from './functions/prihlaseni.mjs';
import program from './functions/program.mjs';
import zakazky from './functions/zakazky.mjs';
import uzivatele from './functions/uzivatele.mjs';
import { ADMIN_EMAIL, POKUSY_IP_MAX, pokusyIpKlic } from './lib/sdilene.mjs';
import { jadro } from './lib/jadro.mjs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { JEKLY } = await jadro();
const zk = require('../src/zakazka.js');
const zam = require('../src/zamek.js');
const ZC = require('../src/zkusebni_cenik.js');
const G = globalThis;

let ok = 0, fail = 0; const selhalo = [];
function test(nazev, podminka, detail) {
  if (podminka) { ok++; console.log('  ✓ ' + nazev); }
  else { fail++; selhalo.push(nazev); console.log('  ✗ ' + nazev + (detail ? ' — ' + detail : '')); }
}
const kopie = x => JSON.parse(JSON.stringify(x));
const post = (fn, url, telo, cookie, hlavicky) => fn(new Request(url, { method: 'POST',
  headers: Object.assign(cookie ? { cookie } : {}, hlavicky || {}), body: typeof telo === 'string' ? telo : JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  const t = await r.clone().json(); if (!t.ok) throw new Error(e + ' ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const uloz = async (zak, c, razitko) => {
  const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: zak, ocekavaneRazitko: razitko }, c);
  let t; try { t = await r.json(); } catch (e) { t = {}; }
  return { status: r.status, ...t };
};
const nacti = async (soubor, c) => (await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(soubor), c)).json()).zakazka;

const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
{
  const rp = await (await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
    slevy: { minMarze: 0, maxGlobalni: 1, stropy: { 'Obchodník': 0.03, 'Vedoucí': 0.12, 'Administrátor': 1 } }, poznamka: 'BZ' }, cA)).json();
  if (!rp.ok) throw new Error('program ' + JSON.stringify(rp));
  for (const [e, j, r] of [['bz.obch1@priklad.cz', 'Obch Jedna', 'Obchodník'], ['bz.obch2@priklad.cz', 'Obch Dva', 'Obchodník'], ['bz.ved@priklad.cz', 'Ved Test', 'Vedoucí']]) {
    const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: e, jmeno: j, role: r, heslo: 'Heslo12345x' }, cA)).json();
    if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
  }
}
const cO = await prihlas('bz.obch1@priklad.cz', 'Heslo12345x');
const cO2 = await prihlas('bz.obch2@priklad.cz', 'Heslo12345x');
const cV = await prihlas('bz.ved@priklad.cz', 'Heslo12345x');

let n = 9800;
function nova(nazev) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++) + ' - TEST'; z.nazevAkce = 'TEST ' + nazev;
  z.objednatel = 'TEST – TESTOVACÍ ODBĚRATEL s.r.o.';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.cenik = ZC.zkusebniCenik(); v.data.proj.cenik = ZC.zkusebniCenikProj();
  return z;
}
/* Zamčení jako prohlížeč po tisku (zamekPoTisku): zmrazený výsledek + snímek. */
const zamkni = (z, v, typ) => {
  const vysledek = zam.zamekVysledekSpocti(v, JEKLY, 'BZ');
  zam.zamkniVariantu(v, { typ: typ || 'nabidka', kdy: new Date().toISOString(), kdo: 'Obch Jedna',
    cislo: zam.variantaCislo(z, v), vysledek, snimek: zam.zamekSnimekSpocti(v) });
};
const dnes = new Date().toISOString().slice(0, 10);
const imp = z => G.importZakazka(kopie(z));
const strany = (g) => { const z = imp(g); const v = z.varianty[0];
  const pd = G.prodPdZapis(z, v, JEKLY); const ce = G.ctrlExportVarianty(z, v, { jekly: JEKLY });
  return { pd: pd.hodnota.map(h => h.oblast).join('+'), ctrl: ce.ok ? ce.strany.map(s => s.oblast).join('+') : 'chyba' }; };

/* ============================================================ */
console.log('\n===== B231: STRANA ZAKÁZKY PO ZÁMKU A PRODÁNO =====\n');
{
  /* PoC poc_AZ_1 část A: prodaná nabídka OCK, cizí obchodník přepne jenProj. */
  const z = nova('B231 A'); zamkni(z, z.varianty[0], 'nabidka');
  const r = await uloz(z, cO); let g = await nacti(r.soubor, cO);
  test('B231: nový zámek nese snímek strany zakázky (zamek.strana, píše server)',
    !!(g.varianty[0].zamek.strana && g.varianty[0].zamek.strana.jenProj === false && g.varianty[0].zamek.strana.vyrazena === 'proj'),
    JSON.stringify(g.varianty[0].zamek.strana));
  let a = kopie(g); a.varianty[0].prodano = { datum: dnes }; const rp = await uloz(a, cO, g.uloRazitko);
  test('B231: Prodáno poctivé nabídky projde', rp.status === 200, rp.status + ' ' + rp.chyba);
  g = await nacti(r.soubor, cO); const pred = strany(g);
  a = kopie(g); a.jenProj = true;
  const rc = await uloz(a, cO2, g.uloRazitko);
  test('B231: cizí obchodník NEpřepne jenProj prodané zakázky (403)', rc.status === 403, rc.status + ' ' + (rc.chyba || ''));
  a = kopie(g); a.jenProj = true;
  const rv = await uloz(a, cO, g.uloRazitko);
  test('B231: ani autor NEpřepne jenProj prodané zakázky (403)', rv.status === 403, String(rv.status));
  a = kopie(g); a.jenOck = true;
  const ra = await uloz(a, cA, g.uloRazitko);
  test('B231: ani administrátor bez odemčení NEpřepne jenOck (403)', ra.status === 403, String(ra.status));
  const g2 = await nacti(r.soubor, cO); const po = strany(g2);
  test('B231: controlling a hodnota dealu zůstávají na straně ze zámku', pred.pd === po.pd && pred.ctrl === po.ctrl && po.pd === 'OCK',
    JSON.stringify({ pred, po }));
  /* Zámek uložený klientem bez změny příznaku dál jde (žádná falešná 403). */
  a = kopie(g2); a.varianty[0].data.kryci = a.varianty[0].data.kryci || {};
  const rok = await uloz(a, cO, g2.uloRazitko);
  test('B231: běžné uložení prodané zakázky beze změny strany projde', rok.status === 200, rok.status + ' ' + (rok.chyba || ''));
  /* Klient nesundá ani nepřepíše snímek strany (razítko mimo klíč, drží server). */
  const g3 = await nacti(r.soubor, cO); a = kopie(g3); a.varianty[0].zamek.strana = { jenProj: true, jenOck: false, vyrazena: 'ock' };
  const rs = await uloz(a, cO, g3.uloRazitko); const g4 = await nacti(r.soubor, cO);
  test('B231: podvržený snímek strany server nahradí uloženým', rs.status === 200 && g4.varianty[0].zamek.strana.jenProj === false,
    rs.status + ' ' + JSON.stringify(g4.varianty[0].zamek.strana));
  /* Klient: set('ZAK.jenProj') u zakázky se zámkem hlásí důvod (model zamekZakCestaZmrazena). */
  test('B231: klientský model zmrazí ZAK.jenProj i ZAK.jenOck u zamčené zakázky',
    !!G.zamekZakCestaZmrazena(imp(g4), 'ZAK.jenProj') && !!G.zamekZakCestaZmrazena(imp(g4), 'ZAK.jenOck'));
  const bez = nova('B231 bez zámku');
  test('B231: bez zámku se příznak strany měnit smí (model)', G.zamekZakCestaZmrazena(bez, 'ZAK.jenProj') === '');
}
{
  /* PoC poc_AZ_1 část B a poc_overeni_AZ1 scénář 6: zámek PROJ s jenProj=true,
   * OCK nese nepotvrzenou ruční cenu; vypnutí jenProj → Prodáno. */
  const cesta = 'C.montazniNosnik';
  const z = nova('B231 B'); z.jenProj = true; const v = z.varianty[0];
  v.data.cenik.montazniNosnik = 1;
  v.data.rucniCeny = { [cesta]: { hodnota: 1, dodavatel: 'Dodavatel TEST', cislo: 'N-1', datum: '', platnostDo: '', zaklad: null, potvrdil: null } };
  zamkni(z, v, 'nabidkaProj');
  const r = await uloz(z, cO);
  test('B231: zámek PROJ s vyřazenou OCK projde', r.status === 200, r.status + ' ' + (r.chyba || ''));
  let g = await nacti(r.soubor, cO);
  let a = kopie(g); a.jenProj = false;
  const r2 = await uloz(a, cO, g.uloRazitko);
  test('B231: vypnutí jenProj po zámku odmítne server (403)', r2.status === 403, r2.status + ' ' + (r2.chyba || ''));
  test('B231: hláška říká proč (strana zakázky se po odeslání nemění)', /strana zakázky/.test(r2.chyba || ''), r2.chyba);
  g = await nacti(r.soubor, cO);
  test('B231: příznak v databázi zůstal', g.jenProj === true);
  /* Správce variantu odemkne (v témže uložení) → příznak smí změnit. */
  a = kopie(g); G.odemkniVariantu(a.varianty[0], { jeAdmin: true, kdo: 'správce', duvod: 'BZ test' }); a.jenProj = false;
  const r3 = await uloz(a, cA, g.uloRazitko);
  test('B231: po odemčení správcem se strana změnit smí', r3.status === 200, r3.status + ' ' + (r3.chyba || ''));
}
{
  /* Zakázka z doby před B231 (příznak přepnutý po zámku už v databázi):
   * dotisk OCK s nepotvrzenou ruční cenou se zdrojem neprojde (rucniCenyZamekProblem
   * i v dotisku, poc_overeni_AZ1 6d/6e). */
  const cesta = 'C.montazniNosnik';
  const z = nova('B231 C'); z.jenProj = true; const v = z.varianty[0];
  v.data.cenik.montazniNosnik = 1;
  v.data.rucniCeny = { [cesta]: { hodnota: 1, dodavatel: 'Dodavatel TEST', cislo: 'N-2', datum: '', platnostDo: '', zaklad: null, potvrdil: null } };
  zamkni(z, v, 'nabidkaProj');
  const r = await uloz(z, cO);
  const klic = [...pamet.keys()].find(k => k.startsWith('zakazky/') && k.endsWith(r.soubor));
  const ulozena = JSON.parse(pamet.get(klic)); ulozena.jenProj = false; pamet.set(klic, JSON.stringify(ulozena));   // stav před B231
  const g = await nacti(r.soubor, cO);
  const a = kopie(g); a.varianty[0].zamek.tisky = (a.varianty[0].zamek.tisky || []).concat([{ typ: 'nabidka', kdy: new Date().toISOString() }]);
  const rd = await uloz(a, cO, g.uloRazitko);
  test('B231: dotisk OCK s nepotvrzenou ruční cenou (zakázka před B231) odmítne server (403)',
    rd.status === 403 && /není potvrzená/.test(rd.chyba || ''), rd.status + ' ' + (rd.chyba || ''));
}

/* ============================================================ */
console.log('\n===== B232: PŘÍSNÉ OVĚŘENÍ VYŽADUJE VŠECHNA ČÍSLA =====\n');
{
  const z0 = nova('B232 poctivý'); zamkni(z0, z0.varianty[0]); const r0 = await uloz(z0, cO); const g0 = await nacti(r0.soubor, cO);
  test('B232: poctivý zámek dostane razítko „shoda"', g0.varianty[0].zamek.overeni.stav === 'shoda', JSON.stringify(g0.varianty[0].zamek.overeni));
  /* PoC poc_AZ_2: vypuštěná čísla mimo jádro. */
  const z = nova('B232 vypuštěno'); zamkni(z, z.varianty[0]);
  const vy = z.varianty[0].zamek.vysledek; delete vy.ock.souhrn.zakladNaklad;
  const r = await uloz(z, cO); const g = await nacti(r.soubor, cO);
  test('B232: výsledek s vypuštěným číslem (náklad) dostane „nesouhlasi"', g.varianty[0].zamek.overeni.stav === 'nesouhlasi',
    JSON.stringify(g.varianty[0].zamek.overeni));
  test('B232: a uložení vrátí varování', !!r.varovani, JSON.stringify(r).slice(0, 200));
  const z2 = nova('B232 přidáno'); zamkni(z2, z2.varianty[0]);
  z2.varianty[0].zamek.vysledek.ock.souhrn.mustkyCena = 1;
  const r2 = await uloz(z2, cO); const g2 = await nacti(r2.soubor, cO);
  test('B232: výsledek s přidaným číslem dostane „nesouhlasi"', g2.varianty[0].zamek.overeni.stav === 'nesouhlasi',
    JSON.stringify(g2.varianty[0].zamek.overeni));
  /* Model: volné porovnání (starší zámek, obnova) dál klíč jen na jedné straně přeskočí. */
  const a = { ock: { souhrn: { zakladCena: 1, zakladDph: 1, zakladSDph: 2, x: 5 } }, proj: { souhrn: { cena: 1, celkem: 1 } }, kurzEurKc: 25 };
  const b = kopie(a); delete b.ock.souhrn.x;
  test('B232: volné porovnání beze změny (klíč jen v jednom výsledku přeskočí)', zam.zamekVysledekRozdily(a, b).pocet === 0);
  test('B232: přísné porovnání číslo jen v jednom výsledku počítá', zam.zamekVysledekRozdily(a, b, 5, { prisne: true }).pocet >= 1);
  const c = kopie(a); c.ock.souhrn.x = null;
  test('B232: přísné porovnání číslo proti null počítá', zam.zamekVysledekRozdily(a, c, 5, { prisne: true }).pocet >= 1);
}

/* ============================================================ */
console.log('\n===== B233: POČÍTADLA POKUSŮ PŘI SOUBĚHU =====\n');
{
  /* PoC poc_AU_soubeh_pocitadla: vlna souběžných pokusů z jedné adresy. */
  const IP = '198.51.100.233', N = 150;
  const vlna = await Promise.all(Array.from({ length: N }, (_, i) => post(prihlaseni, 'http://x/api/prihlaseni',
    { email: 'nikdo' + i + '@priklad.cz', heslo: 'Spatne' + i + 'xx' }, null, { 'x-nf-client-connection-ip': IP })));
  const stavy = {}; vlna.forEach(r => { stavy[r.status] = (stavy[r.status] || 0) + 1; });
  const proslo = N - (stavy[429] || 0);
  test('B233: vlna ' + N + ' souběžných pokusů z jedné adresy — ověřeno nejvýš ' + POKUSY_IP_MAX + ' hesel',
    proslo <= POKUSY_IP_MAX, JSON.stringify(stavy));
  const st = JSON.parse(pamet.get('pokusy/' + pokusyIpKlic(IP)) || '{}');
  test('B233: počítadlo adresy po vlně nese všechny pokusy (žádný ztracený zápis)', st.n === N, 'n=' + st.n);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
if (fail) console.log('\nSelhalo:\n - ' + selhalo.join('\n - '));
process.exit(fail ? 1 : 0);
