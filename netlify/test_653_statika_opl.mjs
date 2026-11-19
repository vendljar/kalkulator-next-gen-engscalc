/* STATIKA OPLÁŠTĚNÍ NA SERVERU (#653, J. V. 18. 11. 2026; revize poradce 18. 11.).
 *
 * Hlídá se přes skutečné funkce /api/zakazky a /api/program (úložiště v paměti):
 *   1) zámek jedné šachty se statikou opláštění: obchodník uloží a zamkne
 *      (200), ověření výsledku „shoda", řádek nese cestu C.statikaOplKc;
 *   2) víc šachet: statika odškrtnutá ve DRUHÉ šachtě — zámek 200 a „shoda";
 *      výsledek spočtený, jako by šachta 2 statiku měla, server pozná
 *      („nesouhlasí") — přepočet na serveru bere zaškrtnutí šachty 2;
 *   3) revize N2: stará rozpracovaná varianta s potvrzenou cenou z nabídky
 *      u C.statikaKc a ceníkem bez klíče statikaOplKc se uloží (200)
 *      a zamkne (200) — server sazbu i záznam migruje stejně jako prohlížeč;
 *   4) tvar zaškrtnutí: jiná hodnota než true / false / null → 400.
 * Čísla jsou smyšlená (zkušební ceník).
 *
 *   5) N3 (J. V. 18. 11.): nula z nabídky bez zdroje → zámek 403 (schválení),
 *      se zdrojem → potvrzení stačí (200); stará zamčená varianta
 *      s potvrzeným záznamem bez zdroje se nemění a ověření zůstává „shoda".
 *   6) dorevize R1: klon staré odeslané nabídky (cena z nabídky u statiky,
 *      záznam statiky opláštění chybí) se uloží i zamkne (200); R2: 403
 *      u ceny bez zdroje říká, co doplnit.
 * Pojistka R1/R2: proti ab6b29c padá oddíl 6.
 * Pojistka: proti 3c42353 (před revizí N2) padá krok 3 (403 „Ceník varianty
 * smí měnit jen administrátor … statikaOplKc").
 */
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
const { default: funkce } = await import(R + 'netlify/functions/funkce.mjs');
const { ADMIN_EMAIL } = await import(R + 'netlify/lib/sdilene.mjs');
const { jadro } = await import(R + 'netlify/lib/jadro.mjs');
const { JEKLY } = await jadro();
const { createRequire } = await import('node:module');
const require = createRequire(R + 'netlify/x.mjs');
const zk = require(R + 'src/zakazka.js');
const zam = require(R + 'src/zamek.js');
const CS = require(R + 'src/cenik_stari.js');
const ZC = require(R + 'src/zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 500)); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const kopie = x => JSON.parse(JSON.stringify(x));
async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  const t = await r.clone().json(); if (!t.ok) throw new Error(e + ' ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const nacti = async (soubor, c) => (await (await zakazky(new Request('http://x/api/zakazky?soubor=' + encodeURIComponent(soubor), { headers: { cookie: c } }))).json()).zakazka;
const uloz = async (zak, c) => { const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: zak }, c); return { status: r.status, ...(await r.json()) }; };
const blok = async (f) => { try { await f(); } catch (e) { fail++; console.log('FAIL výjimka v bloku: ' + (e && e.stack)); } };

const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
const V1 = ZC.zkusebniCenik(); V1.statikaOplHod = 6; V1.statikaKc = 1000; V1.statikaOplKc = 1000;   // smyšlené
{ const r = await post(program, 'http://x/api/program', { cenik: V1, cenikProj: ZC.zkusebniCenikProj(),
    slevy: { minMarze: 0, maxGlobalni: 1, stropy: { 'Obchodník': 0.05, 'Vedoucí': 0.15, 'Administrátor': 1 } }, poznamka: '#653' }, cA);
  test('příprava: ceník zveřejněn', r.status === 200, await r.json()); }
const OBCH = 'obch.statika@priklad.cz';
{ const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: OBCH, jmeno: 'Obch Statika', role: 'Obchodník', heslo: 'Heslo12345x' }, cA)).json();
  if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x)); }
const cO = await prihlas(OBCH, 'Heslo12345x');
const platny = () => JSON.parse(pamet.get('program/db')).platny;

const ROZMERY = { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4, typSachty: 'exteriérová' };
let n = 9646;
function nova(nazev) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++); z.nazevAkce = 'TEST statika ' + nazev;
  Object.assign(z.varianty[0].data.ock.zadani, ROZMERY);
  z.varianty[0].data.cenik = kopie(platny().cenik);
  z.varianty[0].data.proj.cenik = kopie(platny().cenikProj);
  CS.cenikOznacJakoDnesni(z.varianty[0].data, { verze: platny().verze });
  return z;
}
const d0 = (z) => z.varianty[0].data;
const zamkni = (z, vysledek) => { const v = z.varianty[0];
  zam.zamkniVariantu(v, { typ: 'nabidka', kdy: new Date().toISOString(), kdo: 'Test statika',
    cislo: zam.variantaCislo(z, v), vysledek: vysledek || zam.zamekVysledekSpocti(v, JEKLY, 'v-646') });
  return z; };
const radkyOpl = (vys) => JSON.stringify(vys || {}).split('STATICKÉ POSOUZENÍ OPLÁŠTĚNÍ').length - 1;

console.log('===== 1. zámek jedné šachty se statikou opláštění =====');
await blok(async () => {
  const z = nova('jedna šachta');
  const r1 = await uloz(z, cO);
  test('uložení (200)', r1.status === 200, r1);
  const g = await nacti(r1.soubor, cO);
  const rz = await uloz(zamkni(g), cO);
  test('zámek (200)', rz.status === 200, rz);
  const u = await nacti(r1.soubor, cO);
  const zm = u && u.varianty[0].zamek;
  test('ověření výsledku „shoda"', zm && zm.overeni && zm.overeni.stav === 'shoda', zm && zm.overeni);
  test('zmrazený výsledek nese řádek statiky opláštění s cestou C.statikaOplKc',
    zm && radkyOpl(zm.vysledek) > 0 && JSON.stringify(zm.vysledek).includes('"C.statikaOplKc"'));
});

console.log('===== 2. víc šachet: statika odškrtnutá ve druhé šachtě =====');
await blok(async () => {
  const rv = await post(funkce, 'http://x/api/funkce', { viceSachet: true }, cA);
  test('příprava: víc šachet zapnuto', rv.status === 200, await rv.json());
  const z = nova('dvě šachty');
  const ock = d0(z).ock; ock.nazev = 'Výtah A';
  ock.dalsi = [{ id: 's_b1', nazev: 'Výtah B', ks: 1, zadani: Object.assign(kopie(ock.zadani), { statikaOpl: false }) }];
  const r1 = await uloz(z, cO);
  test('uložení se zaškrtnutím v šachtě 2 (200)', r1.status === 200, r1);
  const g = await nacti(r1.soubor, cO);
  test('úložiště nese odškrtnutí jen u šachty 2', g.varianty[0].data.ock.dalsi[0].zadani.statikaOpl === false
    && g.varianty[0].data.ock.zadani.statikaOpl === undefined);
  const vys = zam.zamekVysledekSpocti(g.varianty[0], JEKLY, 'v-646');
  /* Podvrh: výsledek spočtený, jako by šachta 2 statiku měla. */
  const g2 = kopie(g); g2.varianty[0].data.ock.dalsi[0].zadani.statikaOpl = true;
  const vysPodvrh = zam.zamekVysledekSpocti(g2.varianty[0], JEKLY, 'v-646');
  test('příprava: výsledky se liší (šachta 2 bez / se statikou)', JSON.stringify(vys) !== JSON.stringify(vysPodvrh));
  const rp = await uloz(zamkni(kopie(g), vysPodvrh), cO);
  const up = rp.status === 200 ? await nacti(r1.soubor, cO) : null;
  const ovP = up && up.varianty[0].zamek && up.varianty[0].zamek.overeni;
  test('výsledek, který odškrtnutí v šachtě 2 nerespektuje, server nepřijme jako „shodu"',
    rp.status !== 200 || (ovP && ovP.stav !== 'shoda'), { status: rp.status, ov: ovP });
  /* Poctivý zámek (nová zakázka, ať podvrh výš nic neovlivní). */
  const z3 = nova('dvě šachty poctivě'); const o3 = d0(z3).ock;
  o3.dalsi = [{ id: 's_b1', nazev: 'Výtah B', ks: 1, zadani: Object.assign(kopie(o3.zadani), { statikaOpl: false }) }];
  const r3 = await uloz(z3, cO);
  const g3 = await nacti(r3.soubor, cO);
  const rz = await uloz(zamkni(g3), cO);
  test('zámek dvou šachet s odškrtnutou statikou v šachtě 2 (200)', rz.status === 200, rz);
  const u3 = await nacti(r3.soubor, cO);
  const ov = u3 && u3.varianty[0].zamek && u3.varianty[0].zamek.overeni;
  test('ověření výsledku „shoda"', ov && ov.stav === 'shoda', ov);
});

console.log('===== 3. revize N2: stará varianta s cenou z nabídky u statiky =====');
await blok(async () => {
  const z = nova('stará cena z nabídky');
  const d = d0(z);
  delete d.cenik.statikaOplKc;                       // uloženo před #653
  d.cenik.statikaKc = 800;                           // cena z nabídky (kryla obě statiky)
  d.rucniCeny = { 'C.statikaKc': { hodnota: 800, dodavatel: 'Statik Příklad s.r.o.', cislo: 'N-646', datum: '2026-11-02',
    platnostDo: '', zaklad: null, potvrdil: { jmeno: 'x' } } };
  const r1 = await uloz(z, cO);
  test('uložení (200) — sazba i záznam se migrují na statiku opláštění', r1.status === 200, r1);
  const g = r1.status === 200 ? await nacti(r1.soubor, cO) : null;
  const rec = g && g.varianty[0].data.rucniCeny && g.varianty[0].data.rucniCeny['C.statikaOplKc'];
  test('úložiště: záznam u C.statikaOplKc s razítkem serveru', !!rec && rec.hodnota === 800 && rec.potvrdil && rec.potvrdil.email === OBCH, rec);
  test('úložiště: sazba statiky opláštění = cena z nabídky (cena se nezměnila)', g && g.varianty[0].data.cenik.statikaOplKc === 800);
  if (g) {
    const rz = await uloz(zamkni(g), cO);
    test('zámek (200)', rz.status === 200, rz);
    const u = await nacti(r1.soubor, cO);
    const ov = u && u.varianty[0].zamek && u.varianty[0].zamek.overeni;
    test('ověření výsledku „shoda"', ov && ov.stav === 'shoda', ov);
  }
});

console.log('===== 5. N3 (J. V. 18. 11.): potvrzení ceny z nabídky jen se zdrojem =====');
await blok(async () => {
  const sNulou = (nazev, zdroj) => { const z = nova(nazev); const d = d0(z);
    d.cenik.statikaOplKc = 0;
    d.rucniCeny = { 'C.statikaOplKc': Object.assign({ hodnota: 0, dodavatel: '', cislo: '', datum: '', platnostDo: '',
      zaklad: null, potvrdil: { jmeno: 'x' } }, zdroj || {}) };
    return z; };
  /* a) bez zdroje: uložit jde, potvrzení server nedá, zámek chce schválení */
  const r1 = await uloz(sNulou('nula bez zdroje'), cO);
  test('nula bez zdroje: rozpracované uložení projde (200)', r1.status === 200, r1);
  const g1 = await nacti(r1.soubor, cO);
  test('nula bez zdroje: server potvrzení neorazítkuje', g1.varianty[0].data.rucniCeny['C.statikaOplKc'].potvrdil === null,
    g1.varianty[0].data.rucniCeny);
  const rz1 = await uloz(zamkni(g1), cO);
  test('nula bez zdroje: zámek odmítnut — cenová výjimka ke schválení (403)', rz1.status === 403 && /schválen|výjimk/i.test(rz1.chyba || ''), rz1);
  /* b) se zdrojem: potvrzení obchodníkem stačí */
  const r2 = await uloz(sNulou('nula se zdrojem', { cislo: 'N-2026-653' }), cO);
  test('nula se zdrojem: uložení (200) a razítko serveru', r2.status === 200, r2);
  const g2 = await nacti(r2.soubor, cO);
  const rec2 = g2.varianty[0].data.rucniCeny['C.statikaOplKc'];
  test('nula se zdrojem: potvrzeno serverem', rec2.potvrdil && rec2.potvrdil.email === OBCH, rec2);
  const rz2 = await uloz(zamkni(g2), cO);
  test('nula se zdrojem: zámek (200)', rz2.status === 200, rz2);
  /* c) stará data: zamčená varianta s potvrzeným záznamem BEZ zdroje se nemění */
  const klic = [...pamet.keys()].find(k => k.endsWith(r2.soubor));
  const ul = JSON.parse(pamet.get(klic));
  ul.varianty[0].data.rucniCeny['C.statikaOplKc'].cislo = '';                // jako před N3
  pamet.set(klic, JSON.stringify(ul));
  const g3 = await nacti(r2.soubor, cO);
  const r3 = await uloz(g3, cO);
  test('stará zamčená varianta bez zdroje: další uložení projde (200)', r3.status === 200, r3);
  const g4 = await nacti(r2.soubor, cO);
  const rec4 = g4.varianty[0].data.rucniCeny['C.statikaOplKc'];
  test('… záznam zamčené varianty beze změny (razítko zůstalo)', rec4.potvrdil && rec4.potvrdil.email === OBCH && rec4.cislo === '', rec4);
  test('… ověření zámku dál „shoda"', g4.varianty[0].zamek.overeni && g4.varianty[0].zamek.overeni.stav === 'shoda', g4.varianty[0].zamek.overeni);
});

console.log('===== 6. dorevize R1 a R2 =====');
await blok(async () => {
  /* R1: stará ODESLANÁ varianta s potvrzenou cenou z nabídky u statiky
   * (zdroj vyplněn), uložená před #653 — klon v prohlížeči a jeho zámek. */
  const z = nova('R1 klon');
  const d = d0(z); d.cenik.statikaKc = 800; d.cenik.statikaOplKc = 800;
  d.rucniCeny = { 'C.statikaKc': { hodnota: 800, dodavatel: 'Statik Příklad s.r.o.', cislo: 'N-661', datum: '', platnostDo: '',
      zaklad: null, potvrdil: { jmeno: 'x' } },
    'C.statikaOplKc': { hodnota: 800, dodavatel: 'Statik Příklad s.r.o.', cislo: 'N-661', datum: '', platnostDo: '',
      zaklad: null, potvrdil: { jmeno: 'x' } } };
  const r1 = await uloz(z, cO);
  test('R1 příprava: uložení (200)', r1.status === 200, r1);
  const rz = await uloz(zamkni(await nacti(r1.soubor, cO)), cO);
  test('R1 příprava: zámek (200)', rz.status === 200, rz);
  /* Data jako před #653: zamčená varianta bez klíče statikaOplKc a bez jeho záznamu. */
  const klic = [...pamet.keys()].find(k => k.endsWith(r1.soubor));
  const ul = JSON.parse(pamet.get(klic));
  delete ul.varianty[0].data.cenik.statikaOplKc; delete ul.varianty[0].data.rucniCeny['C.statikaOplKc'];
  pamet.set(klic, JSON.stringify(ul));
  /* Prohlížeč: otevřít (import = migrace), naklonovat, uložit, zamknout klon. */
  const g = zk.importZakazka(await nacti(r1.soubor, cO));
  test('R1: zamčená varianta po importu: sazba ano, záznam statiky opláštění ne (doklad)',
    g.varianty[0].data.cenik.statikaOplKc === 800 && !g.varianty[0].data.rucniCeny['C.statikaOplKc']);
  const klon = zam.klonujVariantu(g, g.varianty[0].id);
  const r2 = await uloz(g, cO);
  test('R1: uložení zakázky s klonem (200)', r2.status === 200, r2);
  const g2 = await nacti(r1.soubor, cO);
  const vk = g2.varianty.find(v => v.id === klon.id);
  const rk = vk && vk.data.rucniCeny && vk.data.rucniCeny['C.statikaOplKc'];
  test('R1: klon nese záznam statiky opláštění s razítkem serveru', !!rk && rk.hodnota === 800 && rk.potvrdil && !!rk.potvrdil.email, rk);
  zam.zamkniVariantu(vk, { typ: 'nabidka', kdy: new Date().toISOString(), kdo: 'Test statika',
    cislo: zam.variantaCislo(g2, vk), vysledek: zam.zamekVysledekSpocti(vk, JEKLY, 'v-646') });
  const r3 = await uloz(g2, cO);
  test('R1: zámek klonu (200)', r3.status === 200, r3);
  /* R2: 403 u ceny bez zdroje říká, co doplnit. */
  const zb = nova('R2 bez zdroje'); const db = d0(zb);
  db.cenik.statikaOplKc = 1200;
  db.rucniCeny = { 'C.statikaOplKc': { hodnota: 1200, dodavatel: '', cislo: '', datum: '', platnostDo: '', zaklad: null, potvrdil: null } };
  const rb = await uloz(zb, cO);
  const rbz = await uloz(zamkni(await nacti(rb.soubor, cO)), cO);
  test('R2: zámek ceny bez zdroje 403 se srozumitelnou větou (doplňte dodavatele nebo číslo nabídky, bez „směsi")',
    rbz.status === 403 && /doplňte dodavatele nebo číslo nabídky/.test(rbz.chyba || '') && !/směs/.test(rbz.chyba || ''), rbz);
});

console.log('===== 4. tvar zaškrtnutí =====');
await blok(async () => {
  const z = nova('špatný tvar'); d0(z).ock.zadani.statikaOpl = 'ano';
  const r = await uloz(z, cO);
  test('jiná hodnota než true / false / null → 400', r.status === 400 && /statikaOpl/.test(r.chyba || ''), r);
  const z2 = nova('null'); d0(z2).ock.zadani.statikaOpl = null;
  const r2 = await uloz(z2, cO);
  test('null (výchozí) → 200', r2.status === 200, r2);
});

console.log(`\n${ok} OK, ${fail} FAIL`);
if (fail) process.exit(1);
