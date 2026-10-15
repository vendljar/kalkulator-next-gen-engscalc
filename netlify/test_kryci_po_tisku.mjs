/* KRYCÍ LIST ODESLANÉ NABÍDKY SE DÁ DOPLŇOVAT — serverová pojistka
 * (J. V. 14. 10. 2026: „věci, které nejsou v cenové nabídce, by mělo být
 * možné v krycím listu upravovat i po vytištění nabídky").
 *
 * Server do 14. 10. odmítl (409) JAKOUKOLI změnu `data` zamčené varianty,
 * tedy i doplněný kontakt v krycím listu. Nově porovnává bez ručních hodnot
 * polí krycího listu mimo cenovou nabídku (zamekDataPorovnani, zámek
 * z ULOŽENÉ verze). Pole nabídky (zálohy, splatnost, splátky SoD PROJ, plán
 * plateb) a cokoli po tisku smlouvy o dílo dál vracejí 409.
 *
 * Pojistka proti prázdnému testu: nad kódem před opravou doplnění pole mimo
 * nabídku vrací 409 (testy „200" selžou), odmítnutí platí před i po.
 *
 * Paměťové úložiště, zkušební ceník, smyšlené údaje.
 * Spuštění: node netlify/test_kryci_po_tisku.mjs */
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
const { default: obnova } = await import(R + 'netlify/functions/obnova.mjs');
const { ADMIN_EMAIL } = await import(R + 'netlify/lib/sdilene.mjs');
const { jadro } = await import(R + 'netlify/lib/jadro.mjs');
const { JEKLY, ULO } = await jadro();
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
const rp = await (await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(), slevy: NASTSL, poznamka: 'kryci' }, cA)).json();
if (!rp.ok) throw new Error('program ' + JSON.stringify(rp));
const x0 = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'obch.kryci@priklad.cz', jmeno: 'Obch Krycí', role: 'Obchodník', heslo: 'Heslo12345x' }, cA)).json();
if (!x0.ok) throw new Error('uzivatel ' + JSON.stringify(x0));
const cO = await prihlas('obch.kryci@priklad.cz', 'Heslo12345x');

/* Platný ceník tak, jak ho aplikace dává nové zakázce (z úložiště). */
const platny = () => JSON.parse(pamet.get('program/db')).platny;
const ROZMERY = { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 };
let n = 9900;   // vlastní rozsah 9900–9949
function nova(nazev) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++); z.nazevAkce = 'TEST ' + nazev;
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, ROZMERY);
  v.data.cenik = kopie(platny().cenik); v.data.proj.cenik = kopie(platny().cenikProj);
  return z;
}
const d0 = (z) => z.varianty[0].data;
const sestaveni = (z, jen) => {
  if (jen !== 'proj') d0(z).cenik = kopie(globalThis.DEFAULT_CENIK);
  if (jen !== 'ock') d0(z).proj.cenik = kopie(globalThis.DEFAULT_CENIK_PROJ);
};
const zamkni = (z, typ, v) => { v = v || z.varianty[0];
  zam.zamkniVariantu(v, { typ: typ || 'nabidka', kdy: new Date().toISOString(), kdo: 'Test krycí',
    cislo: zam.variantaCislo(z, v), vysledek: zam.zamekVysledekSpocti(v, JEKLY, 'v-kryci') });
  return z; };
/* Uloží zamčenou zakázku, načte ji jako prohlížeč, provede změnu a uloží znovu. */
async function poTisku(z, zmena, cookie) {
  const r = await uloz(z, cookie);
  if (r.status !== 200) return { status: 'příprava ' + r.status, chyba: r.chyba };
  const g = await nacti(r.soubor, cookie);
  const a = zk.importZakazka(kopie(g));
  zmena(a.varianty[0].data, a);
  return uloz(a, cookie, g.uloRazitko);
}
const h = (d, list) => { d[list] = d[list] || { hodnoty: {} }; d[list].hodnoty = d[list].hodnoty || {}; return d[list].hodnoty; };

console.log('===== nabídka OCK vytištěná =====');
{
  const r = await poTisku(zamkni(nova('OCK kontakt'), 'nabidkaTisk'), d => {
    h(d, 'kryci').jmenoPrijmeni = 'Zkušební Kontakt'; h(d, 'kryci').atypMustky = 'Ukázkový můstek'; }, cO);
  test('OCK: doplněné pole krycího listu mimo nabídku se uloží (200)', r.status === 200, r);
}
{
  const r = await poTisku(zamkni(nova('OCK záloha'), 'nabidkaTisk'), d => { h(d, 'kryci').zaloha1 = '10 % – po podpisu smlouvy'; }, cO);
  test('OCK: změněná záloha (pole nabídky) → 409', r.status === 409 && /uzamčené/.test(r.chyba || ''), r);
}
{
  const r = await poTisku(zamkni(nova('OCK termín'), 'nabidka'), d => { h(d, 'kryci').terminDodani = '99 týdnů'; }, cO);
  test('OCK: změněný termín dodání (pole nabídky) → 409', r.status === 409 && /uzamčené/.test(r.chyba || ''), r);
}
{
  const r = await poTisku(zamkni(nova('OCK kalkulace'), 'nabidka'), d => { d.ock.zadani.zdvih = 12; h(d, 'kryci').jmenoPrijmeni = 'Zkušební'; }, cO);
  test('OCK: změna kalkulace schovaná za doplněný krycí list → 409', r.status === 409 && /uzamčené/.test(r.chyba || ''), r);
}

console.log('===== nabídka PROJ vytištěná =====');
const novaProj = (nazev) => { const z = nova(nazev); z.cislo = '2026 - OVP - CN - ' + (n++); return z; };
{
  const r = await poTisku(zamkni(novaProj('PROJ odpovědný'), 'nabidkaProjTisk'), d => { h(d, 'kryciProj').odpovednyJmeno = 'Ukázková Osoba'; }, cO);
  test('PROJ: doplněná odpovědná osoba (mimo nabídku) se uloží (200)', r.status === 200, r);
}
{
  const r = await poTisku(zamkni(novaProj('PROJ splatnost'), 'nabidkaProjTisk'), d => { h(d, 'kryciProj').splatnostDni = '60'; }, cO);
  test('PROJ: změněná splatnost (pole nabídky) → 409', r.status === 409 && /uzamčené/.test(r.chyba || ''), r);
}
{
  const r = await poTisku(zamkni(novaProj('PROJ splátka'), 'nabidkaProjTisk'), d => { h(d, 'kryciProj').sodpPlatba1 = '100 % po podpisu'; }, cO);
  test('PROJ: splátka SoD projekce (u starších dat jde do nabídky) → 409', r.status === 409 && /uzamčené/.test(r.chyba || ''), r);
}
{
  const r = await poTisku(zamkni(novaProj('PROJ plán'), 'nabidkaProjTisk'), d => { d.kryciProj.planPlateb = { predvolba: 'zaloha', zaloha: 0.5 }; }, cO);
  test('PROJ: změněný plán plateb → 409', r.status === 409 && /uzamčené/.test(r.chyba || ''), r);
}

console.log('===== po smlouvě o dílo =====');
{
  const z = zamkni(nova('SoD kontakt'), 'nabidka'); zamkni(z, 'sod');
  const r = await poTisku(z, d => { h(d, 'kryci').jmenoPrijmeni = 'Zkušební Kontakt'; }, cA);
  test('SoD vytištěná: ani pole mimo nabídku se nemění (409)', r.status === 409 && /uzamčené/.test(r.chyba || ''), r);
}
{
  /* Klient si SoD ze seznamu tisků „sundat" nemůže — razítka zámku drží
   * server z uložené verze (B62) a porovnání bere zámek z ní. */
  const z = zamkni(nova('SoD sundaná'), 'nabidka'); zamkni(z, 'sod');
  const r = await poTisku(z, (d, a) => { a.varianty[0].zamek.tisky = []; h(d, 'kryci').jmenoPrijmeni = 'Zkušební Kontakt'; }, cA);
  test('SoD vytištěná: smazaný záznam tisku SoD zápis nepovolí (409)', r.status === 409 && /uzamčené/.test(r.chyba || ''), r);
}

console.log('===== typ hodnot krycího listu (B152) =====');
/* B152 (audit 15. 10. 2026): volné pole odeslané nabídky přijalo objekt
 * ({toString:0}) — esc() při vykreslení krycího listu i kryciData pro Word
 * pak vyhodí výjimku. Hodnota je text (číslo a pravda u starších dat). */
{
  const r = await poTisku(zamkni(nova('typ objekt'), 'nabidkaTisk'), d => { h(d, 'kryci').jmenoPrijmeni = { toString: 0 }; }, cO);
  test('B152: objekt ve volném poli krycího listu odeslané nabídky → 400', r.status === 400 && /kryci/.test(r.chyba || ''), r);
}
{
  const r = await poTisku(zamkni(novaProj('typ pole'), 'nabidkaProjTisk'), d => { h(d, 'kryciProj').odpovednyJmeno = ['a']; }, cO);
  test('B152: pole (array) ve volném poli krycího listu PROJ → 400', r.status === 400 && /kryciProj/.test(r.chyba || ''), r);
}
{
  const z = nova('typ rozpracovaná'); h(d0(z), 'kryci').jmenoPrijmeni = { a: 1 };
  const r = await uloz(z, cO);
  test('B152: objekt v krycím listu rozpracované varianty → 400', r.status === 400, r);
}
{
  const z = nova('typ text'); Object.assign(h(d0(z), 'kryci'), { jmenoPrijmeni: 'Zkušební', zaloha1: 10, souhlas: true });
  const r = await uloz(z, cO);
  test('B152: text, číslo a pravda v krycím listu projdou (200)', r.status === 200, r);
}

console.log('===== B157: cizí obchodník a volná pole odeslané nabídky (záměrné chování) =====');
/* Rozhodnutí J. V. 15. 10. 2026: „ano, smí (cizí obchodník smí měnit volná
 * pole krycího listu u odeslané nabídky), možná to bude i třeba; pokud je to
 * tak dnes nastavené, tak to neměň." Test chování dokládá (nic neopravuje):
 * volné pole cizí odeslané nabídky 200, pole nabídky dál 409. */
{
  const xB = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'obch2.kryci@priklad.cz', jmeno: 'Obch Druhý', role: 'Obchodník', heslo: 'Heslo12345x' }, cA)).json();
  if (!xB.ok) throw new Error('uzivatel ' + JSON.stringify(xB));
  const cB = await prihlas('obch2.kryci@priklad.cz', 'Heslo12345x');
  const r0 = await uloz(zamkni(nova('B157 cizí'), 'nabidka'), cO);
  const g = await nacti(r0.soubor, cB);
  const a = zk.importZakazka(kopie(g));
  Object.assign(h(d0(a), 'kryci'), { sodPokutaDenni: '0,1 %', terminPredani: '12/2026', jmenoPrijmeni: 'Zkušební Kontakt' });
  const r1 = await uloz(a, cB, g.uloRazitko);
  const g1 = await nacti(r0.soubor, cA);
  test('B157: cizí obchodník uloží volná pole krycího listu odeslané nabídky (200, autor zůstává)',
    r0.status === 200 && r1.status === 200 && h(d0(g1), 'kryci').sodPokutaDenni === '0,1 %' && g1.autor === 'obch.kryci@priklad.cz', [r0.status, r1, g1.autor]);
  const b = zk.importZakazka(kopie(g1)); h(d0(b), 'kryci').terminDodani = '99 týdnů';
  const r2 = await uloz(b, cB, g1.uloRazitko);
  test('B157: pole nabídky cizí odeslané nabídky dál zamčené (409)', r2.status === 409, r2);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
