/* ============================================================
 * DÁVKA RJ (22. 11. 2026) — zapracování rozhodnutí J. V. z 22. 11. 2026
 *
 *   #704-2  nový zámek s výsledkem „nesouhlasi" (B232) → 409 s radou Ctrl+F5
 *   #704-3  vedoucí strana po zámku zmrazená i při změně čísla (potvrzení R2)
 *   #665    dotisk kolegou: sken podpisu PŮVODNÍHO autora ze snímku zámku
 *   #710-4  klíč koordinace nemění připomínku uzavřenou správcem (403, B257)
 * (#704-4/-6/-7 Pipedrive: netlify/test_bz_pipedrive.mjs, test_vsd_pd_poznamka.mjs.)
 *
 * Skutečné funkce netlify/functions nad PAMĚŤOVÝM úložištěm, bez sítě.
 * Smyšlené kontakty …@priklad.cz. `node netlify/test_rj_rozhodnuti.mjs`.
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
    slevy: { minMarze: 0, maxGlobalni: 1, stropy: { 'Obchodník': 0.03, 'Vedoucí': 0.12, 'Administrátor': 1 } }, poznamka: 'RJ' }, cA)).json();
  if (!rp.ok) throw new Error('program ' + JSON.stringify(rp));
  for (const [e, j, r] of [['rj.obch1@priklad.cz', 'Obch Jedna', 'Obchodník'], ['rj.obch2@priklad.cz', 'Obch Dva', 'Obchodník'], ['rj.ved@priklad.cz', 'Ved Test', 'Vedoucí']]) {
    const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: e, jmeno: j, role: r, heslo: 'Heslo12345x' }, cA)).json();
    if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
  }
}
const cO = await prihlas('rj.obch1@priklad.cz', 'Heslo12345x');
const cO2 = await prihlas('rj.obch2@priklad.cz', 'Heslo12345x');
const cV = await prihlas('rj.ved@priklad.cz', 'Heslo12345x');

let n = 9500;
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
console.log('\n===== #704-2: NOVÝ ZÁMEK „NESOUHLASI" → 409 =====\n');
{
  const z = nova('RJ 704-2'); zamkni(z, z.varianty[0]);
  z.varianty[0].zamek.vysledek.ock.souhrn.zakladSDph = 1;   // stránka se starším jádrem / upravený klient
  const r = await uloz(z, cO);
  test('#704-2: nový zámek s rozporem → 409, kód zamekNesouhlasi', r.status === 409 && r.kod === 'zamekNesouhlasi', JSON.stringify(r).slice(0, 300));
  test('#704-2: hláška radí obnovit stránku (Ctrl+F5) a vytisknout znovu', /Ctrl\+F5/.test(r.chyba || '') && /vytiskněte znovu/.test(r.chyba || '')
    && /nesouhlasí s výpočtem serveru/.test(r.chyba || ''), r.chyba);
  test('#704-2: zakázka se neuložila', !pamet.has('zakazky/z/' + G.uloJmenoSouboru(z)));
  test('#704-2: hláška je táž funkce jádra (zamekNesouhlasiText)', typeof zam.zamekNesouhlasiText === 'function'
    && r.chyba === zam.zamekNesouhlasiText(z.varianty[0].zamek.cislo, G.zamekOvereni(z.varianty[0], JEKLY, ((r.chyba || '').match(/server běží na ([^)]+)\)/) || [])[1], undefined, { prisne: true })));
  /* Pojistka: týž zámek s poctivým výsledkem projde (shoda). */
  const z2 = nova('RJ 704-2 poctivý'); zamkni(z2, z2.varianty[0]);
  const r2 = await uloz(z2, cO); const g2 = r2.status === 200 ? await nacti(r2.soubor, cO) : null;
  test('#704-2: poctivý zámek projde (shoda, bez varování)', r2.status === 200 && !r2.varovani && g2 && g2.varianty[0].zamek.overeni.stav === 'shoda', JSON.stringify(r2).slice(0, 200));
  /* P6: poctivý výsledek s textem / příznakem navíc dál „shoda". */
  const z3 = nova('RJ 704-2 P6'); zamkni(z3, z3.varianty[0]);
  const vy = z3.varianty[0].zamek.vysledek; vy.ock.klicZeStarsiVerze = { poznamka: 'jen ve starší verzi', priznak: true };
  const r3 = await uloz(z3, cO); const g3 = r3.status === 200 ? await nacti(r3.soubor, cO) : null;
  test('#704-2: tolerance P6 — text a příznak navíc = shoda, uloženo', r3.status === 200 && g3 && g3.varianty[0].zamek.overeni.stav === 'shoda', JSON.stringify(r3).slice(0, 200));
}

/* ============================================================ */
console.log('\n===== #704-3: VEDOUCÍ STRANA ZMRAZENÁ I PŘI ZMĚNĚ ČÍSLA (R2) =====\n');
{
  /* Zakázka s číslem OVP (vedoucí PROJ, OCK vyřazená), zámek nabídky PROJ; autor
   * pak číslo přepíše na OPR (vedoucí OCK) — strana podle čísla je zmrazená (R2). */
  const z = nova('RJ 704-3'); z.cislo = '2026 - OVP - CN - ' + (n++) + ' - TEST'; zamkni(z, z.varianty[0], 'nabidkaProj');
  const r = await uloz(z, cO);
  test('#704-3: příprava — zámek PROJ u čísla OVP', r.status === 200, r.status + ' ' + (r.chyba || ''));
  if (r.status === 200) {
    const g = await nacti(r.soubor, cO);
    const a = kopie(g); a.cislo = a.cislo.replace('OVP', 'ÓVP');
    const ra = await uloz(a, cO, g.uloRazitko);
    test('#704-3: autor změnou čísla vedoucí stranu odeslané zakázky nepřepne (403)', ra.status === 403 && /strana zakázky/.test(ra.chyba || ''), ra.status + ' ' + (ra.chyba || ''));
    test('#704-3: uložená zakázka beze změny čísla', (await nacti(r.soubor, cO)).cislo === g.cislo);
    /* Pojistka: číslo změněné tak, že vedoucí strana zůstane (mezera navíc), projde. */
    const b = kopie(g); b.kontakt = 'Jiný kontakt';
    const rb = await uloz(b, cO, g.uloRazitko);
    test('#704-3: pojistka — změna bez dopadu na stranu projde', rb.status === 200, rb.status + ' ' + (rb.chyba || ''));
  }
  /* Model: doplněné číslo OCK k zakázce jen s PROJ (vyřazená strana z čísla). */
  const st = { jenProj: false, jenOck: false, cislo: '', projHlavicka: { cislo: '2026 - OVP - CN - 1' }, varianty: [{ id: 'v', zamek: { zamceno: true } }] };
  test('#704-3: model — doplněné číslo OCK k zakázce jen s PROJ je změna strany', !!zam.zamekStranaZmena(st, Object.assign(kopie(st), { cislo: '2026 - OPR - CN - 1' })),
    G.zakazkaVyrazenaStrana ? [G.zakazkaVyrazenaStrana(st), G.zakazkaVyrazenaStrana(Object.assign(kopie(st), { cislo: '2026 - OPR - CN - 1' }))] : 'bez funkce');
  test('#704-3: model — smazané číslo PROJ u zakázky jen s PROJ je změna strany', !!zam.zamekStranaZmena(st, Object.assign(kopie(st), { projHlavicka: { cislo: '' } })));
  test('#704-3: model — bez zámku se strana měnit smí', zam.zamekStranaZmena(Object.assign(kopie(st), { varianty: [{ id: 'v' }] }),
    Object.assign(kopie(st), { cislo: '2026 - OPR - CN - 1', varianty: [{ id: 'v' }] })) === '');
}

/* ============================================================ */
console.log('\n===== #665: PODPIS PŮVODNÍHO ZPRACOVATELE VE SNÍMKU ZÁMKU =====\n');
{
  const PNG = (x) => 'data:image/png;base64,' + Buffer.from('PODPIS-' + x).toString('base64');
  const podpis = async (c, obr) => (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'podpis', obrazek: obr }, c)).status;
  test('#665: příprava — obchodník nahraje podpis', (await podpis(cO, PNG('jedna-v1'))) === 200);
  const z = nova('RJ 665'); zamkni(z, z.varianty[0]);
  z.varianty[0].zamek.zpracovatel = { email: 'rj.obch1@priklad.cz', jmeno: 'Podvrh', podpisOtisk: 'f'.repeat(32) };   // podvrh z prohlížeče
  const r = await uloz(z, cO);
  const g = r.status === 200 ? await nacti(r.soubor, cO) : null;
  const zs = g && g.varianty[0].zamek.zpracovatel;
  test('#665: nový zámek nese otisk podpisu zpracovatele (server, podvrh zahozen)', !!zs && /^[0-9a-f]{32}$/.test(zs.podpisOtisk || '')
    && zs.podpisOtisk !== 'f'.repeat(32) && zs.jmeno === 'Obch Jedna', JSON.stringify(zs));
  const kopieKlic = zs ? 'podpisy/zamek/' + zs.podpisOtisk : '';
  test('#665: zmrazená kopie skenu v úložišti podpisů (zamek/<otisk>)', !!zs && pamet.has(kopieKlic)
    && JSON.parse(pamet.get(kopieKlic)).obrazek === PNG('jedna-v1'));
  test('#665: sken v zakázce není (jen otisk)', !!g && !JSON.stringify(g).includes(PNG('jedna-v1')));
  const ctiPodpis = async (soubor, varId, c) => { const x = await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(soubor) + '&podpisZamku=' + encodeURIComponent(varId), c);
    return { status: x.status, ...(await x.json()) }; };
  const k1 = g ? await ctiPodpis(r.soubor, g.varianty[0].id, cO2) : {};
  test('#665: kolega (jiný obchodník) dostane sken PŮVODNÍHO zpracovatele', k1.status === 200 && k1.obrazek === PNG('jedna-v1'), JSON.stringify(k1).slice(0, 200));
  /* Autor podpis v účtu vymění — odeslaná nabídka drží původní. */
  await podpis(cO, PNG('jedna-v2'));
  const k2 = g ? await ctiPodpis(r.soubor, g.varianty[0].id, cO2) : {};
  test('#665: po výměně podpisu v účtu dotisk dál nese původní sken', k2.status === 200 && k2.obrazek === PNG('jedna-v1'));
  /* Další uložení kolegou otisk nezmění (drží uloZamekRazitkaDrz). */
  if (g) {
    const a = kopie(g); a.varianty[0].zamek.zpracovatel.podpisOtisk = 'a'.repeat(32); a.kontakt = 'Jiný kontakt';
    const ra = await uloz(a, cA, g.uloRazitko);
    const g2 = await nacti(r.soubor, cA);
    test('#665: uložení s podvrženým otiskem projde a otisk se drží', ra.status === 200 && g2.varianty[0].zamek.zpracovatel.podpisOtisk === zs.podpisOtisk,
      ra.status + ' ' + JSON.stringify(g2.varianty[0].zamek.zpracovatel));
  }
  /* Nezamčená varianta / cizí zakázka / bez podpisu → 404. */
  const zn = nova('RJ 665 nezamčená'); const rn = await uloz(zn, cO);
  test('#665: nezamčená varianta podpis nevydá (404)', (await ctiPodpis(rn.soubor, zn.varianty[0].id, cO2)).status === 404);
  test('#665: neznámá varianta 404', g ? (await ctiPodpis(r.soubor, 'neni', cO2)).status === 404 : false);
  const zb = nova('RJ 665 bez podpisu'); zamkni(zb, zb.varianty[0]); const rb = await uloz(zb, cO2);
  const gb = rb.status === 200 ? await nacti(rb.soubor, cO2) : null;
  test('#665: zpracovatel bez podpisu — snímek bez otisku, 404 (jako dřív)', !!gb && !gb.varianty[0].zamek.zpracovatel.podpisOtisk
    && (await ctiPodpis(rb.soubor, gb.varianty[0].id, cO)).status === 404);
  test('#665: bez přihlášení podpis nevydá (401)', g ? (await ctiPodpis(r.soubor, g.varianty[0].id, undefined)).status === 401 : false);
}

//RJ-DALSI

console.log(`\n${ok} prošlo, ${fail} selhalo`);
if (fail) console.log('\nSelhalo:\n - ' + selhalo.join('\n - '));
process.exit(fail ? 1 : 0);
