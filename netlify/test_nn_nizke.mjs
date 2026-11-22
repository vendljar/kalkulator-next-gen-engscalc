/* ============================================================
 * DÁVKA NN (22. 11. 2026) — nízké nálezy bezpečnostního auditu 20. 11. 2026
 * (podklady/2026-11-20_BEZPECNOSTNI_AUDIT_v19.11.11.md, #702) a revize BZ (#705).
 *
 *   B237  razítko verze zakázky je povinné (tělo bez pole = 409 nad existující)
 *   B239  strop počtu variant a názvu varianty; /api/vypocet strop těla a tvaru
 *   B243  objekt místo textu → 400 / 0, ne 500 (karta zákazníka, analytika)
 *   B244  strop počtu karet zákazníků; `zalozen` píše server a má strop
 *   #705  dvojče karty pod jiným klíčem (R6); výhradní úsek návrhů a historie (R7)
 *
 * Skutečné funkce netlify/functions nad PAMĚŤOVÝM úložištěm, bez sítě.
 * Pojistka: před opravou každý blok selže (popsáno u bloku), po opravě projde.
 * Smyšlené kontakty …@priklad.cz. Spouští se `node netlify/test_nn_nizke.mjs`.
 * ============================================================ */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';

const pamet = new Map();
/* Zápis zákazníků se 2 ms zpožděním — souběh návrhů (R7) se tak projeví. */
const cekej = (nazev) => (nazev === 'zakaznici' ? new Promise(r => setTimeout(r, 2)) : Promise.resolve());
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
import zakaznici, { ZAKAZNICI_MAX } from './functions/zakaznici.mjs';
import vypocet from './functions/vypocet.mjs';
import analytika from './functions/analytika.mjs';
import { ADMIN_EMAIL } from './lib/sdilene.mjs';
import { ZAKAZKA_VARIANT_MAX, VARIANTA_NAZEV_MAX } from './lib/zakazka_kontrola.mjs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const zk = require('../src/zakazka.js');
const ZC = require('../src/zkusebni_cenik.js');

let ok = 0, fail = 0; const selhalo = [];
function test(nazev, podminka, detail) {
  if (podminka) { ok++; console.log('  ✓ ' + nazev); }
  else { fail++; selhalo.push(nazev); console.log('  ✗ ' + nazev + (detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 400) : '')); }
}
const kopie = x => JSON.parse(JSON.stringify(x));
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST',
  headers: cookie ? { cookie } : {}, body: typeof telo === 'string' ? telo : JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const odp = async (r) => { let t; try { t = await r.json(); } catch (e) { t = {}; } return { status: r.status, ...t }; };
async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  const t = await r.clone().json(); if (!t.ok) throw new Error(e + ' ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}

const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
{
  const rp = await (await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
    slevy: { minMarze: 0, maxGlobalni: 1, stropy: { 'Obchodník': 0.03, 'Vedoucí': 0.12, 'Administrátor': 1 } }, poznamka: 'NN' }, cA)).json();
  if (!rp.ok) throw new Error('program ' + JSON.stringify(rp));
  for (const [e, j] of [['nn.obch1@priklad.cz', 'Obch Jedna'], ['nn.obch2@priklad.cz', 'Obch Dva']]) {
    const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: e, jmeno: j, role: 'Obchodník', heslo: 'Heslo12345x' }, cA)).json();
    if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
  }
}
const cO = await prihlas('nn.obch1@priklad.cz', 'Heslo12345x');
const cO2 = await prihlas('nn.obch2@priklad.cz', 'Heslo12345x');

let n = 9900;
function nova(nazev) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++) + ' - TEST'; z.nazevAkce = 'TEST ' + nazev;
  z.objednatel = 'TEST – TESTOVACÍ ODBĚRATEL s.r.o.';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.cenik = ZC.zkusebniCenik(); v.data.proj.cenik = ZC.zkusebniCenikProj();
  return z;
}
const uloz = async (telo, c) => odp(await post(zakazky, 'http://x/api/zakazky', telo, c));
const nacti = async (soubor, c) => (await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(soubor), c)).json()).zakazka;

/* ============================================================ */
console.log('\n===== B237: RAZÍTKO VERZE JE POVINNÉ =====\n');
/* Pojistka: před opravou tělo BEZ pole ocekavaneRazitko přepsalo cizí zakázku (200). */
{
  const z = nova('B237'); const k = kopie(z.varianty[0]); k.id = 'vdruha1'; k.ridici = false; k.pripona = 1; k.nazev = 'Varianta 2'; z.varianty.push(k);
  const r = await uloz({ zakazka: z, ocekavaneRazitko: '' }, cO);
  test('B237: nová zakázka se uloží', r.status === 200, r);
  const g = await nacti(r.soubor, cO);
  const utok = nova('B237 podvrh'); utok.cislo = z.cislo; utok.objednatel = 'TEST – jiný odběratel';
  const r2 = await uloz({ zakazka: utok }, cO2);
  test('B237: tělo BEZ pole ocekavaneRazitko nad existující zakázkou = 409 kolize', r2.status === 409 && r2.kolize === true, r2.status + ' ' + r2.chyba);
  const g2 = await nacti(r.soubor, cO);
  test('B237: zakázka zůstala nedotčená (2 varianty, původní objednatel)', g2.varianty.length === 2 && g2.objednatel === g.objednatel);
  const r3 = await uloz({ zakazka: kopie(g2), ocekavaneRazitko: g2.uloRazitko }, cO);
  test('B237: se správným razítkem se uloží dál', r3.status === 200, r3.status + ' ' + r3.chyba);
  const g3 = await nacti(r.soubor, cO);
  const r4 = await uloz({ zakazka: kopie(g3), ocekavaneRazitko: 'cokoli', prepsat: true }, cO);
  test('B237: vědomé přepsání (prepsat:true) zůstává (mez — práva nerozšiřuje)', r4.status === 200, r4.status + ' ' + r4.chyba);
}

/* ============================================================ */
console.log('\n===== B239: STROPY ZAKÁZKY A /api/vypocet =====\n');
/* Pojistka: před opravou 51 variant i název 300 000 znaků prošly (200);
 * /api/vypocet přijal 2 MB a pole jako tělo (200 / 400 až z jádra). */
{
  const z = nova('B239 varianty'); const v0 = z.varianty[0];
  for (let i = 0; i < ZAKAZKA_VARIANT_MAX; i++) { const k = kopie(v0); k.id = 'vx' + i; k.ridici = false; k.pripona = i + 1; k.nazev = 'V' + i; z.varianty.push(k); }
  const r = await uloz({ zakazka: z, ocekavaneRazitko: '' }, cO);
  test('B239: zakázka s ' + (ZAKAZKA_VARIANT_MAX + 1) + ' variantami = 400', r.status === 400 && /variant/.test(r.chyba || ''), r.status + ' ' + r.chyba);
  const z2 = nova('B239 název'); z2.varianty[0].nazev = 'V'.repeat(VARIANTA_NAZEV_MAX + 1);
  const r2 = await uloz({ zakazka: z2, ocekavaneRazitko: '' }, cO);
  test('B239: název varianty nad ' + VARIANTA_NAZEV_MAX + ' znaků = 400', r2.status === 400, r2.status + ' ' + r2.chyba);
  const z3 = nova('B239 běžná'); z3.varianty[0].nazev = 'Varianta s rozumným názvem';
  const r3 = await uloz({ zakazka: z3, ocekavaneRazitko: '' }, cO);
  test('B239: běžná zakázka projde', r3.status === 200, r3.status + ' ' + r3.chyba);
  const V = 'http://x/api/vypocet';
  const velke = JSON.stringify({ zakazka: nova('B239 v'), program: {}, vata: 'x'.repeat(1100000) });
  test('B239: /api/vypocet nad 1 MB = 413', (await post(vypocet, V, velke, cO)).status === 413);
  test('B239: /api/vypocet s polem jako tělem = 400', (await post(vypocet, V, '[1,2]', cO)).status === 400);
  let hl = '1'; for (let i = 0; i < 200; i++) hl = '{"a":' + hl + '}';
  test('B239: /api/vypocet s hlubokým vnořením = 400', (await post(vypocet, V, hl, cO)).status === 400);
  const zv = nova('B239 vyp'); const w0 = zv.varianty[0];
  for (let i = 0; i < ZAKAZKA_VARIANT_MAX; i++) { const k = kopie(w0); k.id = 'vy' + i; k.ridici = false; k.pripona = i + 1; zv.varianty.push(k); }
  test('B239: /api/vypocet s ' + (ZAKAZKA_VARIANT_MAX + 1) + ' variantami = 400', (await post(vypocet, V, { zakazka: zv, program: {} }, cO)).status === 400);
  const ro = await odp(await post(vypocet, V, { zakazka: nova('B239 ok'), program: {} }, cO));
  test('B239: /api/vypocet s běžnou zakázkou dál počítá (200)', ro.status === 200 && ro.ok === true, ro.status + ' ' + ro.chyba);
}

/* ============================================================ */
console.log('\n===== B243: OBJEKT MÍSTO TEXTU =====\n');
/* Pojistka: před opravou nazev = {"toString":1} shodil funkci výjimkou (500 / throw). */
{
  const U = 'http://x/api/zakaznici';
  let stav; try { stav = (await post(zakaznici, U, { zakaznik: { nazev: { toString: 1 }, ico: '12345679' } }, cO)).status; }
  catch (e) { stav = 'výjimka ' + e.message; }
  test('B243: karta zákazníka s objektem v poli = 400', stav === 400, stav);
  try { stav = (await post(zakaznici, U, { zakaznik: 'text' }, cO)).status; } catch (e) { stav = 'výjimka ' + e.message; }
  test('B243: karta zákazníka jako text = 400', stav === 400, stav);
  const G = require('../src/zakaznici.js');
  let o; try { o = G.zakaznikOciste({ nazev: { toString: 1 }, poznamka: [1], zalozen: { valueOf: 1, toString: 1 } }, 'x@priklad.cz', '2026-11-22T00:00:00Z'); }
  catch (e) { o = 'výjimka ' + e.message; }
  test('B243: očista karty (sdílená s prohlížečem) objekt nezhroutí — prázdný text', o && o.nazev === '' && o.poznamka === '' && o.zalozen === '2026-11-22T00:00:00Z', o);
  const A = require('../src/analytika.js');
  let c; try { c = A.analytikaSlij(null, A.analytikaDavkaOcisti({ pocty: { zakazky: { valueOf: 1, toString: 1 }, kalkulace: 3 } })); } catch (e) { c = 'výjimka ' + e.message; }
  test('B243: slití dávky analytiky objekt nezhroutí (0), číslo projde', c && typeof c === 'object' && (c.pocty || {}).kalkulace === 3 && (c.pocty || {}).zakazky === 0, c);
  const ra = await post(analytika, 'http://x/api/analytika', { akce: 'udalosti', den: { pocty: { zakazky: { valueOf: 1, toString: 1 } } } }, cO);
  test('B243: POST /api/analytika s objektem v počtu ≠ 500', ra.status !== 500, ra.status);
}

/* ============================================================ */
console.log('\n===== B244: STROP KARET A POLE zalozen =====\n');
/* Pojistka: před opravou `zalozen` od klienta 1 000 000 znaků uloženo celé a karet bez stropu. */
{
  const U = 'http://x/api/zakaznici';
  const r = await odp(await post(zakaznici, U, { zakaznik: { nazev: 'NN Velké pole', zalozen: 'x'.repeat(100000) } }, cO2));
  test('B244: nová karta — zalozen píše server (čas ISO), ne klient', r.status === 200 && /^\d{4}-\d\d-\d\dT/.test(r.zakaznik.zalozen) && r.zakaznik.zalozen.length < 40,
    r.status + ' ' + String(r.zakaznik && r.zakaznik.zalozen).slice(0, 60));
  const G = require('../src/zakaznici.js');
  test('B244: očista drží zalozen nejvýš 40 znaků', G.zakaznikOciste({ nazev: 'x', zalozen: 'y'.repeat(5000) }, 'a', 'b').zalozen.length === 40);
  const pred = [...pamet.keys()].filter(k => k.startsWith('zakaznici/z/')).length;
  for (let i = pred; i < ZAKAZNICI_MAX; i++) pamet.set('zakaznici/z/n-nn-vypln-' + i, JSON.stringify({ nazev: 'NN výplň ' + i, autor: 'nn.obch2@priklad.cz' }));
  const r2 = await odp(await post(zakaznici, U, { zakaznik: { nazev: 'NN nad stropem' } }, cO2));
  test('B244: nad ' + ZAKAZNICI_MAX + ' kartami nová karta = 400', r2.status === 400 && /plný/.test(r2.chyba || ''), r2.status + ' ' + r2.chyba);
  const r3 = await odp(await post(zakaznici, U, { zakaznik: { nazev: 'NN Velké pole', poznamka: 'úprava existující' } }, cO2));
  test('B244: úprava existující karty nad stropem projde', r3.status === 200, r3.status + ' ' + r3.chyba);
  for (const k of [...pamet.keys()]) if (k.startsWith('zakaznici/z/n-nn-vypln-')) pamet.delete(k);
}

/* ============================================================ */
console.log('\n===== #705: DVOJČE KARTY (R6) A SOUBĚH NÁVRHŮ (R7) =====\n');
/* Pojistka R6: před opravou obch2 založil kartu téže firmy bez IČO (klíč z názvu) — 200.
 * Pojistka R7: před opravou ze 2 souběžných návrhů zůstal na kartě jen jeden. */
{
  const U = 'http://x/api/zakaznici';
  const r = await odp(await post(zakaznici, U, { zakaznik: { nazev: 'NN Dvojče s.r.o.', ico: '27074358', ucet: '111/0100' } }, cO));
  test('#705: obch1 založí kartu s IČO', r.status === 200 && r.klic === '27074358', r);
  const r2 = await odp(await post(zakaznici, U, { zakaznik: { nazev: 'NN Dvojče s.r.o.', ucet: '999/0100' } }, cO2));
  test('#705 R6: obch2 nezaloží dvojče téže firmy bez IČO (klíč z názvu) — 409', r2.status === 409 && r2.dvojce === '27074358', r2.status + ' ' + r2.chyba);
  const r3 = await odp(await post(zakaznici, U, { zakaznik: { nazev: 'NN Bez IČO a.s.' } }, cO));
  const r4 = await odp(await post(zakaznici, U, { zakaznik: { nazev: 'NN Bez IČO a.s.', ico: '25596641', ucet: '999/0100' } }, cO2));
  test('#705 R6: obch2 nezaloží dvojče karty bez IČO pod IČO — 409', r3.status === 200 && r4.status === 409, r3.status + ' / ' + r4.status + ' ' + r4.chyba);
  const r5 = await odp(await post(zakaznici, U, { zakaznik: { nazev: 'NN Bez IČO a.s.', ico: '25596641' } }, cO));
  test('#705 R6: autor původní karty dvojče (doplnění IČO) založit smí', r5.status === 200, r5.status + ' ' + r5.chyba);
  const r6 = await odp(await post(zakaznici, U, { zakaznik: { nazev: 'NN Dvojče s.r.o.', ico: '45274649' } }, cO2));
  test('#705 R6: jiná firma se stejným názvem a JINÝM IČO dvojče není (200)', r6.status === 200, r6.status + ' ' + r6.chyba);
  const r7 = await odp(await post(zakaznici, U, { zakaznik: { nazev: 'NN Dvojče s.r.o.', ico: '27074358', ucet: '999/0100' } }, cO2));
  test('#705: úprava cizí karty pod stejným klíčem jde dál jako návrh', r7.status === 200 && r7.navrh === true, r7);
  /* R7: dva souběžné návrhy od dvou lidí — oba musí na kartě zůstat. */
  await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'nn.obch3@priklad.cz', jmeno: 'Obch Tři', role: 'Obchodník', heslo: 'Heslo12345x' }, cA);
  const cO3 = await prihlas('nn.obch3@priklad.cz', 'Heslo12345x');
  await Promise.all([
    post(zakaznici, U, { zakaznik: { nazev: 'NN Dvojče s.r.o.', ico: '27074358', banka: 'Banka Dva' } }, cO2),
    post(zakaznici, U, { zakaznik: { nazev: 'NN Dvojče s.r.o.', ico: '27074358', banka: 'Banka Tři' } }, cO3),
  ]);
  const karta = JSON.parse(pamet.get('zakaznici/z/27074358'));
  const kdo = (karta.navrhy || []).map(x => x.kdo).sort().join(',');
  test('#705 R7: souběžné návrhy dvou lidí se nepřepíšou (oba na kartě)', kdo === 'nn.obch2@priklad.cz,nn.obch3@priklad.cz', kdo);
  /* R7: souběžná úprava autorem — historie má obě předchozí verze. */
  await Promise.all([
    post(zakaznici, U, { zakaznik: { nazev: 'NN Dvojče s.r.o.', ico: '27074358', ucet: '222/0100' } }, cO),
    post(zakaznici, U, { zakaznik: { nazev: 'NN Dvojče s.r.o.', ico: '27074358', ucet: '333/0100' } }, cO),
  ]);
  const h = JSON.parse(pamet.get('zakaznici/h/27074358') || '[]');
  test('#705 R7: dvě souběžné úpravy autorem = dva záznamy historie', h.length === 2, h.length);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
if (fail) { console.log('Selhalo:\n - ' + selhalo.join('\n - ')); process.exit(1); }
