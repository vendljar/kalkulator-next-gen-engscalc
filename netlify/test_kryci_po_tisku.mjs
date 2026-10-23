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
  const r = await poTisku(z, d => { h(d, 'kryci').atypMustky = 'Ukázkový můstek'; }, cA);   // Z1-3: kontakt je po SoD volný
  test('SoD vytištěná: ani pole mimo nabídku se nemění (409)', r.status === 409 && /uzamčené/.test(r.chyba || ''), r);
}
{
  /* Klient si SoD ze seznamu tisků „sundat" nemůže — razítka zámku drží
   * server z uložené verze (B62) a porovnání bere zámek z ní. */
  const z = zamkni(nova('SoD sundaná'), 'nabidka'); zamkni(z, 'sod');
  const r = await poTisku(z, (d, a) => { a.varianty[0].zamek.tisky = []; h(d, 'kryci').atypMustky = 'Ukázkový můstek'; }, cA);
  test('SoD vytištěná: smazaný záznam tisku SoD zápis nepovolí (409)', r.status === 409 && /uzamčené/.test(r.chyba || ''), r);
}

console.log('===== plná moc po smlouvě o dílo (B163) =====');
/* B163 (audit 25, 16. 10. 2026): údaje zmocnitele plné moci (pm*) se po SoD
 * smějí doplnit — do 16. 10. vracel server 409. Jiné pole vedle nich dál 409. */
{
  const z = zamkni(novaProj('SoD PROJ plná moc'), 'nabidkaProjTisk'); zamkni(z, 'sodProj');
  const r = await poTisku(z, d => { Object.assign(h(d, 'kryciProj'), { pmZmocnitel: 'Zkušební Zmocnitel',
    pmZmocnitelNarozen: '1. 1. 1970', pmZmocnitelBytem: 'Ukázková 1', pmJednajici: 'Zkušební Zmocněnec' }); }, cO);
  test('B163: po SoD PROJ se údaje plné moci uloží (200)', r.status === 200, r);
}
{
  const z = zamkni(novaProj('SoD PROJ plná moc a jiné'), 'nabidkaProjTisk'); zamkni(z, 'sodProj');
  const r = await poTisku(z, d => { h(d, 'kryciProj').pmZmocnitel = 'Zkušební Zmocnitel';
    h(d, 'kryciProj').odpovednyJmeno = 'Ukázková osoba'; }, cO);
  test('B163: plná moc spolu s jiným polem krycího listu po SoD → 409', r.status === 409 && /uzamčené/.test(r.chyba || ''), r);
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

console.log('===== Z1: zmrazení po polích podle tabulky J. V. (22. 10. 2026) =====');
/* Zámek se snímkem (zamekPoTisku od v22.10.3): editovatelná pole nabídky
 * (podmínky, DPH, plán plateb) se uloží, zmrazená pole a hlavička (název akce,
 * adresa po CN; pole krycích listů v hlavičce po SoD) vrátí 409; snímek
 * nového zámku server ověří proti datům. Pojistka: nad v22.10.2 vrací
 * „200" případy 409 (pole nabídky byla zamčená celá) a hlavička prošla 200. */
const zamkniZ1 = (z, typ, v) => { v = v || z.varianty[0];
  const prvni = !zam.variantaUzamcena(v);
  zam.zamkniVariantu(v, { typ: typ || 'nabidka', kdy: new Date().toISOString(), kdo: 'Test Z1',
    cislo: zam.variantaCislo(z, v), vysledek: prvni ? zam.zamekVysledekSpocti(v, JEKLY, 'v-z1') : null,
    snimek: prvni ? zam.zamekSnimekSpocti(v) : null });
  return z; };
{
  const r = await poTisku(zamkniZ1(nova('Z1 záloha')), d => {
    Object.assign(h(d, 'kryci'), { zaloha1: '10 % – po podpisu smlouvy', splatnostDni: '60', terminDodani: '20 týdnů' }); }, cO);
  test('Z1: po tisku CN se změna zálohy, splatnosti a termínu dodání uloží (200)', r.status === 200, r);
}
{
  const jina = x => (Math.abs((+x || 0) - 0.12) < 1e-9 ? 0.21 : 0.12);   // vždy skutečná změna sazby
  const r = await poTisku(zamkniZ1(nova('Z1 DPH')), d => { d.cenik.dph = jina(d.cenik.dph); d.proj.cenik.dph = jina(d.proj.cenik.dph); }, cO);
  test('Z1: po tisku CN se změna sazby DPH OCK i PROJ uloží (200)', r.status === 200, r);
}
{
  const r = await poTisku(zamkniZ1(nova('Z1 obchodník')), d => { h(d, 'kryci').obchodnik = 'Jiný Obchodník'; }, cO);
  test('Z1: po tisku CN změna zmrazeného pole (obchodník) → 409', r.status === 409 && /uzamčené/.test(r.chyba || ''), r);
}
{
  const r = await poTisku(zamkniZ1(novaProj('Z1 projektant'), 'nabidkaProjTisk'), d => { h(d, 'kryciProj').hlavniProjektant = 'Jiný Projektant'; }, cO);
  test('Z1: po tisku CN PROJ změna hlavního projektanta → 409', r.status === 409 && /uzamčené/.test(r.chyba || ''), r);
}
{
  const r = await poTisku(zamkniZ1(novaProj('Z1 plán'), 'nabidkaProjTisk'), d => {
    d.kryciProj = d.kryciProj || {}; d.kryciProj.planPlateb = { predvolba: 'zaloha', zaloha: 0.5 };
    h(d, 'kryciProj').sodpPlatba1 = '100 % po podpisu'; h(d, 'kryciProj').typProjektu = 'Rekonstrukce'; }, cO);
  test('Z1: po tisku CN PROJ se plán plateb, splátka SoD a typ projektu uloží (200)', r.status === 200, r);
}
{
  const r = await poTisku(zamkniZ1(nova('Z1 kalkulace za DPH')), d => { d.cenik.dph = d.cenik.dph === 0.12 ? 0.21 : 0.12; d.ock.zadani.zdvih = 12; }, cO);
  test('Z1: změna kalkulace schovaná za změnu DPH → 409', r.status === 409 && /uzamčené/.test(r.chyba || ''), r);
}
{
  const r = await poTisku(zamkniZ1(nova('Z1 název')), (d, a) => { a.nazevAkce = 'TEST přejmenováno'; }, cO);
  test('Z1: po tisku CN změna ZAK.nazevAkce → 409', r.status === 409 && /hlavička/.test(r.chyba || '') && /nazevAkce/.test(r.chyba || ''), r);
}
{
  const r = await poTisku(zamkniZ1(nova('Z1 adresa admin')), (d, a) => { a.adresa = 'Jiná 2'; }, cA);
  test('Z1: po tisku CN změna ZAK.adresa i administrátorovi → 409', r.status === 409 && /adresa/.test(r.chyba || ''), r);
}
{
  const r = await poTisku(zamkniZ1(nova('Z1 DIČ po CN')), (d, a) => { a.dic = 'CZ00000000'; a.zastupci = Object.assign({}, a.zastupci, { banka: 'Ukázková banka' }); }, cO);
  test('Z1: po tisku CN se DIČ a banka v hlavičce uloží (200)', r.status === 200, r);
}
{
  const z = zamkniZ1(nova('Z1 DIČ po SoD')); zamkniZ1(z, 'sod');
  const r = await poTisku(z, (d, a) => { a.dic = 'CZ00000000'; }, cA);
  test('Z1: po tisku SoD změna DIČ v hlavičce → 409', r.status === 409 && /dic/.test(r.chyba || ''), r);
}
{
  /* Hlavička je jedna pro všechny varianty: odeslaná V1 drží název i tehdy,
   * když se ukládá změna z nezamčeného klonu. */
  const z = nova('Z1 klon'); const k = zam.klonujVariantu(z, z.varianty[0].id, { aktivovat: true });
  zamkniZ1(z, 'nabidka', z.varianty[0]);
  const r = await poTisku(z, (d, a) => { a.nazevAkce = 'TEST z klonu'; }, cO);
  test('Z1: název akce nezmění ani uložení z nezamčeného klonu (409)', r.status === 409 && !!k, r);
}
{
  const z = zamkniZ1(nova('Z1 podvržený snímek')); z.varianty[0].zamek.snimek.dph = 0;
  const r = await uloz(z, cO);
  test('Z1: nový zámek s podvrženým snímkem (DPH 0) → 409', r.status === 409 && /snímek/.test(r.chyba || ''), r);
}
{
  const z = zamkniZ1(nova('Z1 snímek uložen'));
  const r = await uloz(z, cO); const g = await nacti(r.soubor, cO);
  test('Z1: snímek nového zámku se uloží beze změny', r.status === 200 && JSON.stringify(g.varianty[0].zamek.snimek) === JSON.stringify(z.varianty[0].zamek.snimek), r);
  const a = zk.importZakazka(kopie(g)); a.varianty[0].zamek.snimek.kryci = { hodnoty: { zaloha1: 'Bez zálohy' } };
  const r2 = await uloz(a, cO, g.uloRazitko);
  test('Z1: přepsaný snímek uloženého zámku → 409', r2.status === 409, r2);
}

console.log('===== Z1-2 / Z1-3 (odpovědi J. V. 22. 10. 2026) =====');
/* Z1-2: název akce a adresa se zmrazí jen podle ŘÍDÍCÍ varianty. Z1-3: po SoD
 * zůstává kontaktní osoba zákazníka editovatelná (hlavička i krycí list).
 * Pojistka: nad v22.10.4 (f73f9ab) vrací všechny tři „200" případy 409. */
{
  const z = nova('Z1-2 neřídící'); const v1 = z.varianty[0];
  const v2 = zam.klonujVariantu(z, v1.id, { aktivovat: true });
  z.varianty.forEach(v => { v.ridici = v.id === v1.id; });
  zamkniZ1(z, 'nabidka', v2);
  const r = await poTisku(z, (d, a) => { a.nazevAkce = 'TEST Z1-2 přejmenováno'; }, cO);
  test('Z1-2: odeslaná NEŘÍDÍCÍ varianta název akce nezmrazí (200)', r.status === 200, r);
}
{
  const z = nova('Z1-2 řídící'); const v1 = z.varianty[0];
  const v2 = zam.klonujVariantu(z, v1.id, { aktivovat: true });
  z.varianty.forEach(v => { v.ridici = v.id === v2.id; });
  zamkniZ1(z, 'nabidka', v2);
  const r = await poTisku(z, (d, a) => { a.adresa = 'Jiná 3'; }, cO);
  test('Z1-2: odeslaná ŘÍDÍCÍ varianta adresu zmrazí (409)', r.status === 409 && /adresa/.test(r.chyba || ''), r);
}
/* K7-S2 (#508, J. V. 23. 10. 2026 „Zavřít"): hlavička po odeslání řídící varianty nejde obejít
 * přepnutím řídící na nezamčený klon. Pokus z auditu: (1) přepnout + přejmenovat, (2) přepnout zpět;
 * a třikrokově: přepnout, přejmenovat, přepnout zpět. Před opravou 0 / 4 (obě cesty 200, stopa
 * v uložené verzi nebyla), po opravě 5 / 5. */
{
  const z = nova('K7-S2 řídící'); const v1 = z.varianty[0];
  zamkniZ1(z, 'nabidka', v1);
  const v2 = zam.klonujVariantu(z, v1.id, { aktivovat: true });
  z.varianty.forEach(v => { v.ridici = v.id === v1.id; });
  const r0 = await uloz(z, cO);
  const g0 = await nacti(r0.soubor, cO);
  test('K7-S2: uložená odeslaná řídící nese stopu zamek.hlavicka (doplní server)', r0.status === 200
    && g0.varianty.find(v => v.id === v1.id).zamek.hlavicka === true, r0);
  const a1 = zk.importZakazka(kopie(g0)); a1.varianty.forEach(v => { v.ridici = v.id === v2.id; }); a1.nazevAkce = 'TEST K7-S2 obejito';
  const r1 = await uloz(a1, cO, g0.uloRazitko);
  test('K7-S2: přepnout řídící na nezamčený klon a přejmenovat v jednom uložení → 409', r1.status === 409 && /nazevAkce/.test(r1.chyba || ''), r1);
  const b1 = zk.importZakazka(kopie(g0)); b1.varianty.forEach(v => { v.ridici = v.id === v2.id; });
  b1.varianty.find(v => v.id === v1.id).zamek.hlavicka = false;          // upravený klient stopu sundá
  const rb1 = await uloz(b1, cO, g0.uloRazitko);
  const gb1 = await nacti(rb1.soubor, cO);
  test('K7-S2: samotné přepnutí projde, stopu klient nesundá', rb1.status === 200
    && gb1.varianty.find(v => v.id === v1.id).zamek.hlavicka === true, { st: rb1.status, ch: rb1.chyba });
  const b2 = zk.importZakazka(kopie(gb1)); b2.adresa = 'Jinde 7';
  const rb2 = await uloz(b2, cO, gb1.uloRazitko);
  test('K7-S2: po přepnutí řídící adresu změnit nejde (409)', rb2.status === 409 && /adresa/.test(rb2.chyba || ''), rb2);
  const b3 = zk.importZakazka(kopie(gb1)); b3.varianty.find(v => v.id === v1.id).zamek.hlavicka = false;   // jen sundat stopu
  const rb3 = await uloz(b3, cO, gb1.uloRazitko);
  const gb3 = rb3.status === 200 ? await nacti(rb3.soubor, cO) : null;
  test('K7-S2: uložení, které jen sundá stopu (řídící už je klon), ji na serveru nesundá', rb3.status === 200
    && gb3.varianty.find(v => v.id === v1.id).zamek.hlavicka === true, { st: rb3.status, ch: rb3.chyba });
}
{
  const z = zamkniZ1(nova('Z1-3 kontakt')); zamkniZ1(z, 'sod');
  const r = await poTisku(z, (d, a) => { a.kontakt = 'Ukázková Kontaktní';
    Object.assign(h(d, 'kryci'), { jmenoPrijmeni: 'Ukázková Kontaktní', kontaktZakaznikTel: '+420 000 000 000', kontaktZakaznikEmail: 'kontakt@priklad.cz' }); }, cO);
  test('Z1-3: po SoD se kontaktní osoba v hlavičce i v krycím listu uloží (200)', r.status === 200, r);
}
{
  const z = zamkniZ1(nova('Z1-3 IČO')); zamkniZ1(z, 'sod');
  const r = await poTisku(z, (d, a) => { a.kontakt = 'Ukázková Kontaktní'; a.ico = '00000019'; }, cO);
  test('Z1-3: po SoD změna IČO vedle kontaktu dál 409', r.status === 409 && /ico/.test(r.chyba || ''), r);
}

/* K7-S5 (#507, audit 23. 10. 2026): čas nového zámku ověřuje server — tvar
 * ISO, ne v budoucnosti, ne starší než 400 dní. Před opravou všechny 200
 * (`kdy:"xx"` zakázku z exportu za období tiše vyřadil, „2099" ji poslal
 * do budoucího). Pojistka: nad v22.10.6 pět FAIL. */
for (const [nazev, kdy] of [['nesmysl', 'xx'], ['budoucnost', '2099-01-01T00:00:00.000Z'],
  ['objekt', { toString: 1 }], ['neplatný den', '2026-02-30T10:00:00.000Z'],
  ['starší než 400 dní', new Date(Date.now() - 401 * 86400000).toISOString()]]) {
  const z = zamkni(nova('K7-S5 ' + nazev)); z.varianty[0].zamek.kdy = kdy;
  const r = await uloz(z, cO);
  test('K7-S5: nový zámek s časem „' + nazev + '" → 400', r.status === 400 && /čas odeslání/.test(r.chyba || ''), r);
}
{
  const z = zamkni(nova('K7-S5 před chvílí')); z.varianty[0].zamek.kdy = new Date(Date.now() - 3 * 86400000).toISOString();
  test('K7-S5: nový zámek vytištěný před třemi dny (bez sítě) se uloží', (await uloz(z, cO)).status === 200);
  test('K7-S5: model — hodiny počítače 5 min napřed projdou, 11 min ne',
    zam.zamekKdyProblem(new Date(Date.now() + 5 * 60000).toISOString()) === ''
    && /budoucnosti/.test(zam.zamekKdyProblem(new Date(Date.now() + 11 * 60000).toISOString())));
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
