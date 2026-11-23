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
import zakaznici from './functions/zakaznici.mjs';
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

{
  /* Revize Fable R1: pravdivá nebooleovská hodnota příznaku (1, "ano", {}, [1]). */
  const z = nova('B231 R1'); zamkni(z, z.varianty[0], 'nabidka');
  const r = await uloz(z, cO); let g = await nacti(r.soubor, cO);
  let a = kopie(g); a.varianty[0].prodano = { datum: dnes }; await uloz(a, cO, g.uloRazitko);
  g = await nacti(r.soubor, cO);
  const stavy = [];
  for (const h of [1, 'ano', {}, [1]]) { a = kopie(g); a.jenProj = h; stavy.push((await uloz(a, cO2, g.uloRazitko)).status); }
  const g2 = await nacti(r.soubor, cO);
  test('B231 R1: jenProj = 1 / "ano" / {} / [1] u prodané nabídky cizím obchodníkem → 403', stavy.every(x => x === 403)
    && strany(g2).ctrl === 'ock', JSON.stringify(stavy));
  const zn = nova('B231 R1 bez zámku'); zn.jenProj = 'ano';
  const rn = await uloz(zn, cO); const gn = await nacti(rn.soubor, cO);
  test('B231 R1: server ukládá příznak strany jen jako pravda / nepravda', gn.jenProj === true, JSON.stringify(gn.jenProj));
  const st1 = { jenProj: false, jenOck: false, cislo: '2026 - OPR - CN - 1', varianty: [{ id: 'v', zamek: { zamceno: true } }] };
  test('B231 R1: model — pravdivá nebooleovská hodnota příznaku je změna strany', ['ano', 1, {}].every(h => !!zam.zamekStranaZmena(st1, Object.assign(kopie(st1), { jenProj: h }))));
}
{
  /* Revize Fable R2: strana určená číslem nabídky (bez příznaků). „ÓVP" dává týž
   * soubor jako „OVP", ale vedoucí stranu OCK místo PROJ. */
  const z = nova('B231 R2'); z.cislo = '2026 - OVP - CN - ' + (n++) + ' - TEST'; zamkni(z, z.varianty[0], 'nabidkaProj');
  const r = await uloz(z, cO);
  test('B231 R2: příprava — zámek PROJ u čísla OVP (OCK vyřazená)', r.status === 200, r.status + ' ' + (r.chyba || ''));
  const g = await nacti(r.soubor, cA); const a = kopie(g); a.cislo = a.cislo.replace('OVP', 'ÓVP');
  const ra = await uloz(a, cA, g.uloRazitko);
  test('B231 R2: ani správce změnou čísla nabídky nepřepne vedoucí stranu odeslané zakázky (403)', ra.status === 403
    && /strana zakázky/.test(ra.chyba || ''), ra.status + ' ' + (ra.chyba || ''));
  const st = { jenProj: false, jenOck: false, cislo: '2026 - OVP - CN - 1', varianty: [{ id: 'v', zamek: { zamceno: true } }] };
  test('B231 R2: model — změna vyřazené strany číslem je změna strany', !!zam.zamekStranaZmena(st, Object.assign(kopie(st), { cislo: '2026 - ÓVP - CN - 1' }))
    && zam.zamekStranaZmena(st, Object.assign(kopie(st), { cislo: '2026 - OVP - CN - 1 ' })) === '');
}

/* ============================================================ */
console.log('\n===== B232: PŘÍSNÉ OVĚŘENÍ VYŽADUJE VŠECHNA ČÍSLA =====\n');
{
  const z0 = nova('B232 poctivý'); zamkni(z0, z0.varianty[0]); const r0 = await uloz(z0, cO); const g0 = await nacti(r0.soubor, cO);
  test('B232: poctivý zámek dostane razítko „shoda"', g0.varianty[0].zamek.overeni.stav === 'shoda', JSON.stringify(g0.varianty[0].zamek.overeni));
  /* PoC poc_AZ_2: vypuštěná čísla mimo jádro. */
  const z = nova('B232 vypuštěno'); zamkni(z, z.varianty[0]);
  const vy = z.varianty[0].zamek.vysledek; delete vy.ock.souhrn.zakladNaklad;
  /* RJ (#704-2, J. V. 22. 11. 2026): nový zámek s rozporem server odmítne 409
   * (kód zamekNesouhlasi, rada Ctrl+F5) — dřív uložil s razítkem a varoval. */
  const nesouhlasi = (z) => G.zamekOvereni(z.varianty[0], JEKLY, '', undefined, { prisne: true });
  const r = await uloz(z, cO);
  test('B232: výsledek s vypuštěným číslem (náklad) = „nesouhlasi"', nesouhlasi(z).stav === 'nesouhlasi', JSON.stringify(nesouhlasi(z)));
  test('B232 + RJ #704-2: a uložení server odmítne (409, zamekNesouhlasi, Ctrl+F5)', r.status === 409 && r.kod === 'zamekNesouhlasi'
    && /Ctrl\+F5/.test(r.chyba || ''), JSON.stringify(r).slice(0, 300));
  const z2 = nova('B232 přidáno'); zamkni(z2, z2.varianty[0]);
  z2.varianty[0].zamek.vysledek.ock.souhrn.mustkyCena = 1;
  const r2 = await uloz(z2, cO);
  test('B232: výsledek s přidaným číslem = „nesouhlasi" → odmítnuto 409', nesouhlasi(z2).stav === 'nesouhlasi' && r2.status === 409
    && r2.kod === 'zamekNesouhlasi', JSON.stringify(r2).slice(0, 200));
  /* Model: volné porovnání (starší zámek, obnova) dál klíč jen na jedné straně přeskočí. */
  const a = { ock: { souhrn: { zakladCena: 1, zakladDph: 1, zakladSDph: 2, x: 5 } }, proj: { souhrn: { cena: 1, celkem: 1 } }, kurzEurKc: 25 };
  const b = kopie(a); delete b.ock.souhrn.x;
  test('B232: volné porovnání beze změny (klíč jen v jednom výsledku přeskočí)', zam.zamekVysledekRozdily(a, b).pocet === 0);
  test('B232: přísné porovnání číslo jen v jednom výsledku počítá', zam.zamekVysledekRozdily(a, b, 5, { prisne: true }).pocet
    > zam.zamekVysledekRozdily(a, a, 5, { prisne: true }).pocet);
  const a2 = kopie(a); a2.ock.odvozene = { vyska: 3, sirka: 2 };
  const c = kopie(a2); c.ock.odvozene = null;
  const zaklad2 = zam.zamekVysledekRozdily(a2, a2, 5, { prisne: true }).pocet;   // přísné jádro chybí v obou → základ
  test('B232: přísné porovnání objekt s čísly proti null počítá', zam.zamekVysledekRozdily(a2, c, 5, { prisne: true }).pocet > zaklad2
    && zam.zamekVysledekRozdily(c, a2, 5, { prisne: true }).pocet > zaklad2, zaklad2);
  test('B232: volné porovnání objekt proti null dál přeskočí', zam.zamekVysledekRozdily(a2, c).pocet === 0);
  /* MT #735 (23. 11. 2026): B232 hlásí číslo, které chybí na JEDNÉ straně,
   * samo — jádro přísného porovnání (B119) tak navíc chytá jen součet, který
   * chybí v OBOU výsledcích (výsledek serveru jiného tvaru). Cesty jsou tu
   * napsané natvrdo, ne z ZAMEK_OVERENI_JADRO_PRISNE, aby prázdný seznam
   * test neobešel. */
  const bezPriplatku = zam.zamekVysledekRozdily(a, a, 5, { prisne: true });
  test('B119: přísné jádro — součet příplatků a volitelných chybějící v obou výsledcích je rozdíl',
    bezPriplatku.pocet === 2 && bezPriplatku.cesty.includes('ock.souhrn.priplatkyCena')
    && bezPriplatku.cesty.includes('ock.souctySekci.volitelne.sMarzi') && zam.zamekVysledekRozdily(a, a).pocet === 0, bezPriplatku);
  /* Revize Fable R3: podstrom s čísly zaměněný za text / true. */
  for (const nahrada of ['x', true]) {
    const d2 = kopie(a2); d2.ock.odvozene = nahrada;
    test('B232 R3: přísné porovnání objekt s čísly proti ' + JSON.stringify(nahrada) + ' počítá',
      zam.zamekVysledekRozdily(a2, d2, 5, { prisne: true }).pocet > zaklad2 && zam.zamekVysledekRozdily(d2, a2, 5, { prisne: true }).pocet > zaklad2);
  }
  /* Serverem: 53 podstromů → "x" (PoC revize) dostane „nesouhlasi". */
  const z3 = nova('B232 R3'); zamkni(z3, z3.varianty[0]);
  const vy3 = z3.varianty[0].zamek.vysledek; let nahrazeno = 0;
  const zamen = (o, h) => { if (!o || typeof o !== 'object' || h > 3) return; for (const k of Object.keys(o)) {
    if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k]) && k !== 'souhrn' && h >= 1) { o[k] = 'x'; nahrazeno++; } else zamen(o[k], h + 1); } };
  zamen(vy3.ock, 0);
  const r3 = await uloz(z3, cO);
  test('B232 R3: výsledek s podstromy zaměněnými za text (' + nahrazeno + ') = „nesouhlasi" → odmítnuto 409', nahrazeno > 0
    && nesouhlasi(z3).stav === 'nesouhlasi' && r3.status === 409 && r3.kod === 'zamekNesouhlasi', JSON.stringify(r3).slice(0, 200));
}

/* ============================================================ */
console.log('\n===== B195: NULOVÁ RUČNÍ CENA JEN SE ZDROJEM =====\n');
{
  /* J. V. 21. 11. 2026: nula z nabídky dodavatele je povolená, ale jen se zdrojem
   * (dodavatel nebo číslo nabídky) a potvrzením; bez zdroje neprojde nikomu
   * kromě správce (ruční cena bez zdroje = cenová výjimka ke schválení, N3). */
  const cesta = 'C.montazniNosnik';
  const pokus = async (c, zdroj) => {
    const z = nova('B195'); const v = z.varianty[0];
    v.data.cenik.montazniNosnik = 0;
    v.data.rucniCeny = { [cesta]: { hodnota: 0, dodavatel: zdroj, cislo: '', datum: '', platnostDo: '', zaklad: null,
      potvrdil: { jmeno: 'klient', email: 'klient', kdy: new Date().toISOString() } } };
    zamkni(z, v, 'nabidka');
    return uloz(z, c);
  };
  const o1 = await pokus(cO, '');
  test('B195: obchodník nulovou ruční cenu BEZ zdroje neodešle (403)', o1.status === 403 && /bez zdroje/.test(o1.chyba || ''), o1.status + ' ' + (o1.chyba || ''));
  const v1 = await pokus(cV, '');
  test('B195: ani vedoucí ne (403)', v1.status === 403, String(v1.status));
  const o2 = await pokus(cO, 'Dodavatel TEST');
  test('B195: obchodník nulovou ruční cenu SE zdrojem a potvrzením odešle (200)', o2.status === 200, o2.status + ' ' + (o2.chyba || ''));
  const a1 = await pokus(cA, '');
  test('B195: správce nulovou ruční cenu bez zdroje odeslat smí (200)', a1.status === 200, a1.status + ' ' + (a1.chyba || ''));
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

/* ============================================================ */
console.log('\n===== B234: KARTA ZÁKAZNÍKA — MĚNÍ AUTOR A SPRÁVCE, HISTORIE =====\n');
{
  const zk1 = async (telo, c) => { const r = await post(zakaznici, 'http://x/api/zakaznici', telo, c); return { status: r.status, ...(await r.json()) }; };
  const karta = { nazev: 'TEST – KARTA BZ s.r.o.', ico: '99999234', ucet: '111-1/0100', smluvniEmail: 'smluvni@priklad.cz' };
  const r1 = await zk1({ zakaznik: karta }, cO);
  test('B234: obchodník založí novou kartu (autor z relace)', r1.status === 200 && r1.zakaznik.autor === 'bz.obch1@priklad.cz', JSON.stringify(r1).slice(0, 200));
  /* PoC poc_AD_zakaznici AD-1: cizí obchodník přepíše číslo účtu. */
  const r2 = await zk1({ zakaznik: Object.assign({}, r1.zakaznik, { ucet: '999-UTOCNIK/0100' }) }, cO2);
  const ulozena = JSON.parse(pamet.get('zakaznici/z/' + r1.klic));
  test('B234: cizí obchodník kartu NEpřepíše (číslo účtu zůstává)', ulozena.ucet === '111-1/0100', ulozena.ucet);
  test('B234: jeho úprava se uloží jako návrh změny', r2.status === 200 && r2.navrh === true
    && Array.isArray(ulozena.navrhy) && ulozena.navrhy.length === 1 && ulozena.navrhy[0].zmeny.ucet === '999-UTOCNIK/0100'
    && ulozena.navrhy[0].kdo === 'bz.obch2@priklad.cz', JSON.stringify(ulozena.navrhy));
  const r2b = await zk1({ akce: 'navrhPrijmout', klic: r1.klic, id: ((ulozena.navrhy || [])[0] || {}).id }, cO2);
  test('B234: navrhovatel si vlastní návrh NEpřevezme (403)', r2b.status === 403, String(r2b.status));
  const r2c = await zk1({ zakaznik: Object.assign({}, ulozena, { ucet: '111-1/0100', navrhy: [] }) }, cV);
  test('B234: ani vedoucí kartu nepřepíše (beze změny polí = žádný návrh)', r2c.status === 200 && r2c.navrh === false
    && JSON.parse(pamet.get('zakaznici/z/' + r1.klic)).navrhy.length === 1, JSON.stringify(r2c).slice(0, 160));
  /* Autor kartu změní a návrhy mu klient nesmaže; předchozí verze jde do historie. */
  const r3 = await zk1({ zakaznik: Object.assign({}, r1.zakaznik, { smluvniEmail: 'novy@priklad.cz', navrhy: [] }) }, cO);
  const po3 = JSON.parse(pamet.get('zakaznici/z/' + r1.klic));
  test('B234: autor kartu změní', r3.status === 200 && !r3.navrh && po3.smluvniEmail === 'novy@priklad.cz', JSON.stringify(r3).slice(0, 160));
  test('B234: návrhy drží server (klient je prázdným polem nesmaže)', Array.isArray(po3.navrhy) && po3.navrhy.length === 1);
  let h = JSON.parse(pamet.get('zakaznici/h/' + r1.klic) || '[]');
  test('B234: změna autora uložila předchozí verzi do historie', h.length === 1 && h[0].verze.smluvniEmail === 'smluvni@priklad.cz'
    && h[0].kdo === 'bz.obch1@priklad.cz', JSON.stringify(h).slice(0, 200));
  /* Autor převezme návrh. */
  const r4 = await zk1({ akce: 'navrhPrijmout', klic: r1.klic, id: ((po3.navrhy || [])[0] || {}).id }, cO);
  const po4 = JSON.parse(pamet.get('zakaznici/z/' + r1.klic));
  test('B234: autor převezme návrh změny', r4.status === 200 && po4.ucet === '999-UTOCNIK/0100' && !po4.navrhy && po4.autor === 'bz.obch1@priklad.cz',
    JSON.stringify(r4).slice(0, 160));
  h = JSON.parse(pamet.get('zakaznici/h/' + r1.klic) || '[]');
  test('B234: převzetí návrhu přidá verzi do historie', h.length === 2 && h[1].verze.ucet === '111-1/0100', String(h.length));
  /* Správce kartu změní a zamítne návrh. */
  await zk1({ zakaznik: Object.assign({}, po4, { banka: 'Banka X' }) }, cO2);
  const po5 = JSON.parse(pamet.get('zakaznici/z/' + r1.klic));
  const r5 = await zk1({ akce: 'navrhZamitnout', klic: r1.klic, id: ((po5.navrhy || [])[0] || {}).id }, cA);
  const r6 = await zk1({ zakaznik: Object.assign({}, po4, { ucet: '222-2/0100' }) }, cA);
  const po6 = JSON.parse(pamet.get('zakaznici/z/' + r1.klic));
  test('B234: správce návrh zamítne a kartu změní', r5.status === 200 && r6.status === 200 && !r6.navrh
    && po6.ucet === '222-2/0100' && !po6.banka && !po6.navrhy, JSON.stringify(po6).slice(0, 200));
  const rh = await (await get(zakaznici, 'http://x/api/zakaznici?klic=' + encodeURIComponent(r1.klic) + '&historie=1', cO2)).json();
  test('B234: historie verzí jde přečíst (GET …&historie=1)', rh.ok && Array.isArray(rh.historie) && rh.historie.length === 3, JSON.stringify(rh).slice(0, 120));
  /* Podvržený návrh v těle od autora se neuloží (návrhy drží server). */
  await zk1({ zakaznik: Object.assign({}, po6, { navrhy: [{ id: 'x', kdo: 'podvrh@priklad.cz', kdy: '', zmeny: { ucet: '1' } }] }) }, cO);
  test('B234: podvržený návrh v těle se neuloží', !JSON.parse(pamet.get('zakaznici/z/' + r1.klic)).navrhy);
  /* Revize Fable R5: smazání karty smaže i její historii (nová karta ji nezdědí). */
  const rd = await zakaznici(new Request('http://x/api/zakaznici?klic=' + encodeURIComponent(r1.klic), { method: 'DELETE', headers: { cookie: cA } }));
  const rh2 = await (await get(zakaznici, 'http://x/api/zakaznici?klic=' + encodeURIComponent(r1.klic) + '&historie=1', cO2)).json();
  test('B234 R5: DELETE karty smaže i historii verzí', rd.status === 200 && !pamet.has('zakaznici/h/' + r1.klic)
    && Array.isArray(rh2.historie) && rh2.historie.length === 0, JSON.stringify(rh2).slice(0, 120));
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
if (fail) console.log('\nSelhalo:\n - ' + selhalo.join('\n - '));
process.exit(fail ? 1 : 0);
