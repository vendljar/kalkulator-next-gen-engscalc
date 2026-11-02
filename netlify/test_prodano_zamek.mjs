/* PB #547 — PRODÁNO NAD ODESLANOU (ZAMČENOU) NABÍDKOU — serverová pojistka.
 *
 * J. V. 2. 11. 2026: „Systém musí být schopen jako prodanou označit zakázku
 * s odeslanou cenovou nabídkou a ne k ní tvořit klon." Ověřuje, že uložení
 * zakázky s NOVĚ prodanou zamčenou variantou projde (prodServer + porovnání
 * zamčených dat nebere záznam prodeje jako změnu dokladu) — tak, jak ho pošle
 * prohlížeč: uložená verze + jen `v.prodano` (resp. odemčení vedoucím) —
 * a že obchodník pod záminkou prodeje nezmění zamčená data, krycí list
 * nabídky ani hlavičku; po prodeji je krycí list zmrazený celý.
 * Model výjimky zámku čtení (prodJedinaZmena, prodNeulozenoText) hlídá
 * src/test_prodano_zamek.js, celý tok v prohlížeči overit_prodano_zamek.mjs.
 *
 * Paměťové úložiště, zkušební ceník, smyšlené údaje.
 * Spuštění: node netlify/test_prodano_zamek.mjs */
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
const { default: program } = await import(R + 'netlify/functions/program.mjs');
const { default: zakazky } = await import(R + 'netlify/functions/zakazky.mjs');
const { default: uzivatele } = await import(R + 'netlify/functions/uzivatele.mjs');
const { ADMIN_EMAIL } = await import(R + 'netlify/lib/sdilene.mjs');
const { jadro } = await import(R + 'netlify/lib/jadro.mjs');
const { JEKLY } = await jadro();
const { createRequire } = await import('node:module');
const require = createRequire(R + 'netlify/x.mjs');
const zk = require(R + 'src/zakazka.js');
const zam = require(R + 'src/zamek.js');
const ZC = require(R + 'src/zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 500)); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const kopie = x => JSON.parse(JSON.stringify(x));
async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  const t = await r.clone().json(); if (!t.ok) throw new Error(e + ' ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const uloz = async (zak, c, razitko) => { const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: zak, ocekavaneRazitko: razitko }, c); return { status: r.status, ...(await r.json()) }; };
const nacti = async (soubor, c) => (await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(soubor), c)).json()).zakazka;

const NASTSL = { minMarze: 0, maxGlobalni: 1, stropy: { 'Obchodník': 0.05, 'Vedoucí': 0.15, 'Administrátor': 1 } };
const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
const rp = await (await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(), slevy: NASTSL, poznamka: 'pb547' }, cA)).json();
if (!rp.ok) throw new Error('program ' + JSON.stringify(rp));
for (const [email, role] of [['obch.pb547@priklad.cz', 'Obchodník'], ['cizi.pb547@priklad.cz', 'Obchodník'], ['ved.pb547@priklad.cz', 'Vedoucí']]) {
  const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email, jmeno: 'Test ' + role, role, heslo: 'Heslo12345x' }, cA)).json();
  if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
}
const cO = await prihlas('obch.pb547@priklad.cz', 'Heslo12345x');
const cC = await prihlas('cizi.pb547@priklad.cz', 'Heslo12345x');
const cV = await prihlas('ved.pb547@priklad.cz', 'Heslo12345x');

const platny = () => JSON.parse(pamet.get('program/db')).platny;
const ROZMERY = { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 };
let n = 8721;   // vlastní rozsah 8721–8760 (číslo z hlášení J. V.)
const OBJ = require(R + 'src/objednane.js');
const DNES = OBJ.objDnes();   // pražský dnešek (týž jako server)
/* Odeslaná nabídka OCK uložená obchodníkem; vrací uloženou verzi tak, jak ji
 * načte prohlížeč (importZakazka) — výchozí bod Prodáno. */
async function odeslana(nazev) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++); z.nazevAkce = 'TEST ' + nazev;
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, ROZMERY);
  v.data.cenik = kopie(platny().cenik); v.data.proj.cenik = kopie(platny().cenikProj);
  v.data.kryci = { hodnoty: { jmenoPrijmeni: 'Zkušební Kontakt', zaloha1: '30 % – po podpisu smlouvy' } };
  zam.zamkniVariantu(v, { typ: 'nabidkaTisk', kdy: new Date().toISOString(), kdo: 'Test PB',
    cislo: zam.variantaCislo(z, v), vysledek: zam.zamekVysledekSpocti(v, JEKLY, 'v-pb547') });
  const r = await uloz(z, cO);
  if (r.status !== 200) throw new Error('příprava ' + r.status + ' ' + r.chyba);
  const g = await nacti(r.soubor, cO);
  return { soubor: r.soubor, razitko: g.uloRazitko, zak: zk.importZakazka(kopie(g)) };
}
const prodej = (z, datum) => { z.varianty[0].prodano = { datum: datum || DNES, kdo: 'podvrh@priklad.cz', kdy: '2000-01-01T00:00:00.000Z',
  pipedrive: { stav: 'odeslano', kdy: '2000-01-01T00:00:00.000Z' } }; return z; };

console.log('===== Prodáno nad odeslanou nabídkou =====');
{
  const o = await odeslana('prodej autor');
  const r = await uloz(prodej(o.zak), cO, o.razitko);
  test('autor: uložená verze + jen záznam prodeje zamčené varianty → 200 (žádný klon)', r.status === 200, r);
  const g = await nacti(o.soubor, cO);
  const p = g.varianty[0].prodano || {};
  test('…po znovunačtení je varianta prodaná k zadanému datu', p.datum === DNES, p);
  test('…razítka a stav Pipedrive „čeká" píše server (podvrh kdo/kdy/stav neprojde)',
    p.kdo === 'obch.pb547@priklad.cz' && p.kdy !== '2000-01-01T00:00:00.000Z' && p.pipedrive && p.pipedrive.stav === 'ceka', p);
  test('…stopa v prodejHistorie', Array.isArray(g.prodejHistorie) && g.prodejHistorie.length === 1 && g.prodejHistorie[0].akce === 'prodano', g.prodejHistorie);
  test('…zámek varianty i data dokladu beze změny', !!(g.varianty[0].zamek && g.varianty[0].zamek.zamceno)
    && JSON.stringify(g.varianty[0].data.ock.zadani) === JSON.stringify(o.zak.varianty[0].data.ock.zadani));

  /* Po prodeji je krycí list zmrazený celý — i volné pole mimo nabídku. */
  const a = zk.importZakazka(kopie(g));
  a.varianty[0].data.kryci.hodnoty.jmenoPrijmeni = 'Po prodeji';
  const r2 = await uloz(a, cO, g.uloRazitko);
  test('po prodeji: ani volné pole krycího listu se nezmění (409)', r2.status === 409, r2);

  /* Odemčení prodeje: obchodník ne, vedoucí s důvodem ano. */
  const b = zk.importZakazka(kopie(g));
  delete b.varianty[0].prodano; b.prodejOdemknout = { varianta: b.varianty[0].id, duvod: 'Zákazník odstoupil' };
  const r3 = await uloz(kopie(b), cO, g.uloRazitko);
  test('odemčení prodeje obchodníkem → 403', r3.status === 403 && /vedoucí/.test(r3.chyba || ''), r3);
  const r4 = await uloz(kopie(b), cV, g.uloRazitko);
  test('odemčení prodeje vedoucím s důvodem → 200', r4.status === 200, r4);
  const g4 = await nacti(o.soubor, cV);
  test('…varianta zase neprodaná, zamčená a v historii je odemčení s důvodem',
    !g4.varianty[0].prodano && g4.varianty[0].zamek && g4.varianty[0].zamek.zamceno
      && (g4.prodejHistorie || []).some(h => h.akce === 'odemceno' && h.duvod === 'Zákazník odstoupil'), g4.prodejHistorie);
}

console.log('===== prodej není záminka ke změně dokladu =====');
{
  const o = await odeslana('prodej + cena');
  const z = prodej(o.zak); z.varianty[0].data.ock.zadani.zdvih = 12;
  const r = await uloz(z, cO, o.razitko);
  test('prodej + změna kalkulace zamčené varianty → 409, nic se neuloží', r.status === 409 && /uzamčené/.test(r.chyba || ''), r);
  test('…uložená verze zůstala neprodaná', !(await nacti(o.soubor, cO)).varianty[0].prodano);
}
{
  const o = await odeslana('prodej + záloha');
  const z = prodej(o.zak); z.varianty[0].data.kryci.hodnoty.zaloha1 = '10 % – po podpisu smlouvy';
  const r = await uloz(z, cO, o.razitko);
  test('prodej + změna pole nabídky v krycím listu → 409', r.status === 409, r);
}
{
  const o = await odeslana('prodej + hlavička');
  const z = prodej(o.zak); z.nazevAkce = 'Přejmenovaná akce';
  const r = await uloz(z, cO, o.razitko);
  test('prodej + změna názvu akce v hlavičce → 409', r.status === 409 && /hlavička/.test(r.chyba || ''), r);
}
{
  const o = await odeslana('prodej cizí');
  const r = await uloz(prodej(o.zak), cC, o.razitko);
  test('cizí obchodník prodej nezapíše (403)', r.status === 403 && /obchodník zakázky/.test(r.chyba || ''), r);
}
{
  const o = await odeslana('prodej budoucnost');
  const r = await uloz(prodej(o.zak, '2999-01-01'), cO, o.razitko);
  test('datum prodeje v budoucnosti → 400', r.status === 400, r);
}
console.log('===== K37-N2: pole SoD po Prodáno do prvního tisku SoD =====');
{
  const o = await odeslana('prodej SoD');
  const r0 = await uloz(prodej(o.zak), cO, o.razitko);
  test('K37-N2: příprava — prodáno (200)', r0.status === 200, r0);
  let g = await nacti(o.soubor, cO);
  /* Obchodník po Prodáno doplní číslo SoD a datum podpisu (před tiskem smlouvy). */
  let a = zk.importZakazka(kopie(g));
  Object.assign(a.varianty[0].data.kryci.hodnoty, { cisloSod: 'SoD-8730/2026', sodDatumPodpisu: DNES });
  const r1 = await uloz(a, cO, g.uloRazitko);
  test('K37-N2: po Prodáno jdou číslo SoD a datum podpisu zapsat (200)', r1.status === 200, r1);
  g = await nacti(o.soubor, cO);
  test('…a uložila se', g.varianty[0].data.kryci.hodnoty.cisloSod === 'SoD-8730/2026', g.varianty[0].data.kryci.hodnoty);
  /* První tisk smlouvy o dílo: záznam tisku + opis polí SoD (jako zamekPoTisku). */
  a = zk.importZakazka(kopie(g));
  const v = a.varianty[0];
  delete v.data.kryci.hodnoty.sodDatumPodpisu;   // opíše ho až tisk (kryciZmrazSod)
  if (typeof globalThis.kryciZmrazSod === 'function') globalThis.kryciZmrazSod(a, v, JEKLY);
  if (!v.data.kryci.hodnoty.sodDatumPodpisu) v.data.kryci.hodnoty.sodDatumPodpisu = DNES;
  zam.zamkniVariantu(v, { typ: 'sod', kdy: new Date().toISOString(), kdo: 'Test PB', cislo: zam.variantaCislo(a, v) });
  const r2 = await uloz(a, cO, g.uloRazitko);
  test('K37-N2: první tisk SoD po Prodáno se uloží (200, ne 409)', r2.status === 200, r2);
  g = await nacti(o.soubor, cO);
  test('…záznam tisku SoD je v zámku a varianta zůstala prodaná', (g.varianty[0].zamek.tisky || []).some(t => t && t.typ === 'sod')
    && !!g.varianty[0].prodano, g.varianty[0].zamek.tisky);
  a = zk.importZakazka(kopie(g));
  a.varianty[0].data.kryci.hodnoty.cisloSod = 'SoD-JINE/2026';
  const r3 = await uloz(a, cO, g.uloRazitko);
  test('K37-N2: po tisku SoD změna čísla SoD → odmítnuto (409)', r3.status === 409, r3);
  a = zk.importZakazka(kopie(g));
  a.varianty[0].data.kryci.hodnoty.sodDatumPodpisu = '2026-10-28';
  const r4 = await uloz(a, cO, g.uloRazitko);
  test('K37-N2: po tisku SoD změna data podpisu → odmítnuto (409)', r4.status === 409, r4);
}
{
  const o = await odeslana('prodej SoD jiné pole');
  await uloz(prodej(o.zak), cO, o.razitko);
  const g = await nacti(o.soubor, cO);
  const a = zk.importZakazka(kopie(g));
  Object.assign(a.varianty[0].data.kryci.hodnoty, { cisloSod: 'SoD-8731/2026', jmenoPrijmeni: 'Schovaný přepis' });
  const r = await uloz(a, cO, g.uloRazitko);
  test('K37-N2: číslo SoD nepropustí přepis jiného pole krycího listu (409)', r.status === 409, r);
}

console.log('===== K37-N4: dolní mez data prodeje =====');
{
  const o = await odeslana('prodej 2001');
  const r = await uloz(prodej(o.zak, '2001-01-01'), cO, o.razitko);
  test('K37-N4: datum prodeje 2001-01-01 (před odesláním nabídky) → 400 s důvodem', r.status === 400 && /dřív než odeslání nabídky/.test(r.chyba || ''), r);
  test('…uložená verze zůstala neprodaná', !(await nacti(o.soubor, cO)).varianty[0].prodano);
  /* Klient si čas odeslání neposune: dolní mez bere server z ULOŽENÉHO zámku. */
  const z = prodej(kopie(o.zak), '2001-01-01'); z.varianty[0].zamek.kdy = '2000-01-01T00:00:00.000Z';
  const r2 = await uloz(z, cO, o.razitko);
  test('K37-N4: posunutý čas zámku v požadavku mez neobejde (400, mez z uloženého zámku)', r2.status === 400 && /dřív než odeslání nabídky/.test(r2.chyba || ''), r2);
  const od = OBJ.prodDatumOd(o.zak.varianty[0]);
  const r3 = await uloz(prodej(o.zak, od), cO, o.razitko);
  test('K37-N4: datum prodeje = den odeslání nabídky → 200', r3.status === 200 && od === DNES, [r3.status, r3.chyba, od]);
}
{
  /* Neodeslaná varianta: prodat nejde ani přes server. */
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++); z.nazevAkce = 'TEST neodeslaná';
  Object.assign(z.varianty[0].data.ock.zadani, ROZMERY);
  z.varianty[0].data.cenik = kopie(platny().cenik); z.varianty[0].data.proj.cenik = kopie(platny().cenikProj);
  z.varianty[0].prodano = { datum: DNES };
  const r = await uloz(z, cO);
  test('neodeslaná (nezamčená) varianta se prodat nedá (400)', r.status === 400 && /odeslaná/.test(r.chyba || ''), r);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
