/* ============================================================
 * ZK #755 (24. 11. 2026, J. V.): hromadné naplnění databáze zákazníků ze
 * zakázek — jen záznamy, kde data sedí podle ARES.
 *
 * Skutečné funkce netlify/functions nad PAMĚŤOVÝM úložištěm. Do ARES se
 * nesahá: ARES_SIT.fetch je zástupný fetch s odpověďmi podle IČO.
 * Smyšlené firmy, osoby a kontakty (…@priklad.cz), IČO jen s platnou
 * kontrolní číslicí vypočtenou tady.
 *
 * Pojistka: před ZK sada neprojde (funkce /api/zakaznici-ze-zakazek
 * ani lib/zakaznici_ze_zakazek.mjs neexistují → import selže); cílené mutace
 * [ZK] v netlify/mutace.mjs ukazují, že každá kontrola něco hlídá.
 * Spouští se `node netlify/test_zk_zakaznici_ze_zakazek.mjs`.
 * ============================================================ */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';

const pamet = new Map();
/* Revize R2: počítadlo čtení podle úložiště; R1: jednorázový pád zápisu klíče. */
const cteni = {};
let padniPriZapisu = '';
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { cteni[nazev] = (cteni[nazev] || 0) + 1; return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) {
    if (padniPriZapisu && padniPriZapisu === nazev + '/' + k) { padniPriZapisu = ''; throw new Error('simulovaný pád funkce'); }
    pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

import './pomoc_test_admin.mjs';
import prihlaseni from './functions/prihlaseni.mjs';
import uzivatele from './functions/uzivatele.mjs';
import zakaznici from './functions/zakaznici.mjs';
import zzFn, { ZZ_NASTAVENI } from './functions/zakaznici_ze_zakazek.mjs';
import { ZAKAZNICI_MAX } from './functions/zakaznici.mjs';
import * as ZZ from './lib/zakaznici_ze_zakazek.mjs';
import { ARES_SIT } from './lib/ares_server.mjs';
import { ADMIN_EMAIL } from './lib/sdilene.mjs';

let ok = 0, fail = 0;
function test(nazev, podminka, detail) {
  if (podminka) { ok++; console.log('  ✓ ' + nazev); }
  else { fail++; console.log('  ✗ ' + nazev + (detail ? ' — ' + detail : '')); }
}
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST',
  headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  const t = await r.clone().json(); if (!t.ok) throw new Error(e + ' ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const URL_ZZ = 'http://x/api/zakaznici-ze-zakazek';
const zz = async (telo, c) => { const r = await post(zzFn, URL_ZZ, telo, c); let j = {}; try { j = await r.json(); } catch (e) { /* */ } return { status: r.status, ...j }; };
/* Celý náhled: volá, dokud není hotový (strop 50 volání). */
async function nahledCely(c, znovuId) {
  let r = znovuId ? await zz({ akce: 'nahled', id: znovuId, znovu: true }, c) : await zz({ akce: 'nahled' }, c); let volani = 1;
  while (r.ok && r.navrh.faze !== 'hotovo' && volani < 50) { r = await zz({ akce: 'nahled', id: r.navrh.id }, c); volani++; }
  return { ...r, volani };
}

/* Celý zápis: volá, dokud server nehlásí hotovo (strop 50 volání). */
async function zalozitCely(id, c) {
  let r = await zz({ akce: 'zalozit', id }, c); let volani = 1;
  while (r.ok && !r.hotovo && volani < 50) { r = await zz({ akce: 'zalozit', id }, c); volani++; }
  return { ...r, volani };
}
/* IČO s platnou kontrolní číslicí ze 7 číslic. */
function ico(base) {
  const s = String(base).padStart(7, '0'); let sum = 0;
  for (let i = 0; i < 7; i++) sum += (+s[i]) * (8 - i);
  const z = sum % 11; return s + (z === 0 ? 1 : (z === 1 ? 0 : 11 - z));
}
const I = { A: ico(1000001), B: ico(1000002), C: ico(1000003), D: ico(1000004), E: ico(1000005),
  F: ico(1000006), G: ico(1000007), H: ico(1000008), J: ico(1000009) };
const spatneIco = I.A.slice(0, 7) + ((+I.A[7] + 1) % 10);

/* ---- zástupný ARES ---- */
const ARES_DATA = {
  [I.A]: { obchodniJmeno: 'Alfa Stavby s.r.o.', dic: 'CZ' + I.A, sidlo: { textovaAdresa: 'Zkušební 1522/53, Holešovice, 17000 Praha 7' } },
  [I.B]: { obchodniJmeno: 'Beta Development a.s.', sidlo: { textovaAdresa: 'Pokusná 10, 11000 Praha 1' } },
  [I.C]: { obchodniJmeno: 'Gama Byty s.r.o.', sidlo: { textovaAdresa: 'Vzorová 7, 60200 Brno' } },
  [I.D]: { obchodniJmeno: 'Delta Reality s.r.o.', datumZaniku: '2025-03-31', sidlo: { textovaAdresa: 'Smyšlená 3, 37001 České Budějovice' } },
  [I.F]: { obchodniJmeno: 'Fí Konstrukce s.r.o.', sidlo: { textovaAdresa: 'Testovací 44, 30100 Plzeň' } },
  [I.G]: { obchodniJmeno: 'Gé Holding a.s.', sidlo: { textovaAdresa: 'Ukázková 2, 12000 Praha 2' } },
  [I.H]: { obchodniJmeno: 'Hé Investice s.r.o.', dic: 'CZ' + I.H, sidlo: { textovaAdresa: 'nám. Pokusů 12, Vinohrady, 12000 Praha 2' } },
  [I.J]: { obchodniJmeno: 'Jota Stav s.r.o.', sidlo: { textovaAdresa: 'Modelová 9, 46001 Liberec' } },
};
let aresVypadek = new Set();
const aresDotazy = [];
ARES_SIT.fetch = async (url) => {
  const i = String(url).slice(-8);
  aresDotazy.push(i);
  if (aresVypadek.has(i)) throw new Error('síť nedostupná');
  const d = ARES_DATA[i];
  if (!d) return new Response('{"kod":"NENALEZENO"}', { status: 404 });
  return new Response(JSON.stringify({ ico: i, ...d }), { status: 200, headers: { 'content-type': 'application/json' } });
};
const pauzy = [];
ZZ_NASTAVENI.cekej = async (ms) => { pauzy.push(ms); };

/* ---- zakázky (rovnou do úložiště, jako by je uložila aplikace) ---- */
const zastupci = (jm) => ({ smluvniJmeno: jm + ' Smluvní', smluvniEmail: 'smluvni.' + jm.toLowerCase() + '@priklad.cz', banka: 'Testovací banka',
  ucet: '123-456/0100', technickyJmeno: '', obchodniJmeno: '' });
function zak(soubor, kdy, hl, dalsi) {
  const z = { cislo: soubor, nazevAkce: 'TEST ' + soubor, uloRazitko: kdy, objednatel: hl.objednatel || '', adresaObjednatele: hl.adresa || '',
    ico: hl.ico || '', dic: hl.dic || '', kontakt: hl.kontakt || '', zastupci: hl.zastupci || {}, varianty: [] };
  if (dalsi) z.dalsiZakaznici = dalsi.map((d, k) => ({ id: 'z' + (k + 2), pismeno: 'BCD'[k],
    hlavicka: { objednatel: d.objednatel, adresaObjednatele: d.adresa, ico: d.ico, dic: d.dic || '', kontakt: d.kontakt || '' }, zastupci: d.zastupci || {} }));
  pamet.set('zakazky/z/' + soubor, JSON.stringify(z));
}
// A: dvě zakázky; starší s jiným názvem, nejnovější sedí (jiný zápis právní formy, PSČ s mezerou, bez části obce)
zak('zk-a1', '2026-10-01T08:00:00.000Z', { objednatel: 'Alfa Stavby (stará firma)', adresa: 'Jinde 1, 11000 Praha 1', ico: I.A, kontakt: 'Ada Starší' });
zak('zk-a2', '2026-11-10T08:00:00.000Z', { objednatel: 'ALFA STAVBY, spol. s r.o.', adresa: 'Zkušební 1522/53, 170 00 Praha 7', ico: I.A.slice(0, 3) + ' ' + I.A.slice(3),
  dic: 'CZ99999999', kontakt: 'Ada Nová', zastupci: zastupci('Ada') });
zak('zk-b', '2026-11-01T08:00:00.000Z', { objednatel: 'Beta Development s.r.o.', adresa: 'Pokusná 10, 110 00 Praha 1', ico: I.B, kontakt: 'Bára Betová' });
zak('zk-c', '2026-11-02T08:00:00.000Z', { objednatel: 'Gama Byty s.r.o.', adresa: 'Jiná 8, 602 00 Brno', ico: I.C });
zak('zk-d', '2026-11-03T08:00:00.000Z', { objednatel: 'Delta Reality s.r.o.', adresa: 'Smyšlená 3, 370 01 České Budějovice', ico: I.D });
zak('zk-e', '2026-11-04T08:00:00.000Z', { objednatel: 'Epsilon s.r.o.', adresa: 'Nikde 1, 100 00 Praha 10', ico: I.E });
zak('zk-f', '2026-11-05T08:00:00.000Z', { objednatel: 'Fí Konstrukce s.r.o.', adresa: 'Testovací 44, 301 00 Plzeň', ico: I.F, kontakt: 'Filip Fíček' });
zak('zk-g', '2026-11-06T08:00:00.000Z', { objednatel: 'Gé Holding a.s.', adresa: 'Ukázková 2, 120 00 Praha 2', ico: I.G });
// H jen jako DALŠÍ zákazník; řídící zakázky je bez IČO; G ještě jednou jako další (počítá se jednou za zakázku)
zak('zk-h', '2026-11-07T08:00:00.000Z', { objednatel: 'SVJ bez IČO v hlavičce', adresa: 'Domovní 5, 140 00 Praha 4' },
  [{ objednatel: 'Hé Investice s. r. o.', adresa: 'náměstí Pokusů 12, 120 00 Praha 2', ico: I.H, kontakt: 'Hana Hájová', zastupci: zastupci('Hana') },
   { objednatel: 'Gé Holding a.s.', adresa: 'Ukázková 2, 120 00 Praha 2', ico: I.G }]);
zak('zk-g2', '2026-11-06T09:00:00.000Z', { objednatel: 'Gé Holding a.s.', adresa: 'Ukázková 2, 120 00 Praha 2', ico: I.G },
  [{ objednatel: 'Gé Holding a.s.', adresa: 'Ukázková 2, 120 00 Praha 2', ico: I.G }]);
zak('zk-x', '2026-11-08T08:00:00.000Z', { objednatel: 'Neplatné IČO s.r.o.', adresa: 'Kdesi 1, 100 00 Praha 10', ico: spatneIco });
zak('zk-j', '2026-11-09T08:00:00.000Z', { objednatel: 'Jota Stav s.r.o.', adresa: 'Modelová 9, 460 01 Liberec', ico: I.J, kontakt: 'Jan Jotový' });

/* ---- účty ---- */
const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
for (const [e, j, r] of [['zk.obch@priklad.cz', 'Obch Zk', 'Obchodník'], ['zk.ved@priklad.cz', 'Ved Zk', 'Vedoucí']]) {
  const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: e, jmeno: j, role: r, heslo: 'Heslo12345x' }, cA)).json();
  if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
}
const cO = await prihlas('zk.obch@priklad.cz', 'Heslo12345x');
const cV = await prihlas('zk.ved@priklad.cz', 'Heslo12345x');
/* G má kartu (založil obchodník ručně; IČO s mezerou) */
{ const r = await (await post(zakaznici, 'http://x/api/zakaznici', { zakaznik: { nazev: 'Gé Holding a.s.', ico: I.G.slice(0, 4) + ' ' + I.G.slice(4),
  kontaktOsoba: 'Gustav Ručně', sidlo: 'Ukázková 2, Praha' } }, cO)).json();
  if (!r.ok) throw new Error('karta G ' + JSON.stringify(r)); }
const kartaGPred = pamet.get('zakaznici/z/' + I.G);
const karetPred = () => [...pamet.keys()].filter(k => k.startsWith('zakaznici/z/')).length;

console.log('\n===== ZK: čistá logika (seskupení, normalizace, shoda) =====\n');
{
  const st = {};
  ZZ.zzSeskupPridej(st, 'a1', JSON.parse(pamet.get('zakazky/z/zk-a1')));
  ZZ.zzSeskupPridej(st, 'a2', JSON.parse(pamet.get('zakazky/z/zk-a2')));
  ZZ.zzSeskupPridej(st, 'g2', JSON.parse(pamet.get('zakazky/z/zk-g2')));
  ZZ.zzSeskupPridej(st, 'h', JSON.parse(pamet.get('zakazky/z/zk-h')));
  ZZ.zzSeskupPridej(st, 'x', JSON.parse(pamet.get('zakazky/z/zk-x')));
  test('seskupení: IČO s mezerou a bez mezery = jedna skupina, 2 zakázky', st.skupiny[I.A] && st.skupiny[I.A].pocet === 2, JSON.stringify(st.skupiny[I.A]));
  test('seskupení: nejnovější zakázka skupiny (podle razítka uložení)', st.skupiny[I.A].soubor === 'a2' && /ALFA/.test(st.skupiny[I.A].nazev));
  test('seskupení: další zákazník zakázky (dalsiZakaznici) má vlastní skupinu', !!st.skupiny[I.H]);
  test('seskupení: totéž IČO dvakrát v jedné zakázce = jedna zakázka', st.skupiny[I.G].pocet === 2, String(st.skupiny[I.G].pocet));
  test('seskupení: bez IČO a s neplatným IČO jen počet', st.bezIco === 1 && st.neplatneIco === 1 && !st.skupiny[spatneIco], st.bezIco + '/' + st.neplatneIco);
  test('seskupení: skupina nenese kontakty (osobní údaje)', !/Ada|smluvni|priklad/.test(JSON.stringify(st)));
  test('IČO: krátké číslo se doplní nulami a ověří', ZZ.zzIco('25596641') === '25596641' && ZZ.zzIco(' 255 966 41 ') === '25596641'
    && ZZ.zzIco('25596642') === null && ZZ.zzIco('') === '' && ZZ.zzIco('abc') === null);
  test('název: velikost písmen, čárka, „spol. s r.o.“ = „s.r.o.“', ZZ.zzNormNazev('ALFA STAVBY, spol. s r.o.') === ZZ.zzNormNazev('Alfa Stavby s.r.o.'));
  test('název: „a. s.“ = „a.s.“, „s. r. o.“ = „s.r.o.“', ZZ.zzNormNazev('Gé Holding a. s.') === ZZ.zzNormNazev('Gé Holding a.s.')
    && ZZ.zzNormNazev('Hé Investice s. r. o.') === ZZ.zzNormNazev('Hé Investice s.r.o.'));
  test('název: s.r.o. ≠ a.s. a diakritika se nezahazuje', ZZ.zzNormNazev('Beta s.r.o.') !== ZZ.zzNormNazev('Beta a.s.')
    && ZZ.zzNormNazev('Nový dům s.r.o.') !== ZZ.zzNormNazev('Novy dum s.r.o.'));
  const ar = 'Zkušební 1522/53, Holešovice, 17000 Praha 7';
  test('sídlo: PSČ s mezerou a bez části obce sedí', ZZ.zzAdresaSedi('Zkušební 1522/53, 170 00 Praha 7', ar));
  test('sídlo: jen číslo popisné sedí', ZZ.zzAdresaSedi('Zkušební 1522, Praha 7, 17000', ar));
  test('sídlo: jiné číslo popisné nesedí', !ZZ.zzAdresaSedi('Zkušební 1523/53, 170 00 Praha 7', ar));
  test('sídlo: chybí číslo popisné (jen orientační) → nesedí', !ZZ.zzAdresaSedi('Zkušební 53, 170 00 Praha 7', ar));
  test('sídlo: jiná ulice nesedí', !ZZ.zzAdresaSedi('Jiná 1522/53, 170 00 Praha 7', ar));
  test('sídlo: chybí PSČ → nesedí', !ZZ.zzAdresaSedi('Zkušební 1522/53, Praha 7', ar));
  test('sídlo: jiné PSČ → nesedí', !ZZ.zzAdresaSedi('Zkušební 1522/53, 170 01 Praha 7', ar));
  test('sídlo: „nám.“ = „náměstí“', ZZ.zzAdresaSedi('nám. Míru 12, 120 00 Praha 2', 'náměstí Míru 12, Vinohrady, 12000 Praha 2'));
  test('sídlo: prázdné nesedí', !ZZ.zzAdresaSedi('', ar));
  const sub = { nazev: 'Alfa Stavby s.r.o.', adresa: ar, ico: I.A, dic: '', zanikla: false };
  const hl = { nazev: 'Alfa Stavby, s. r. o.', sidlo: 'Zkušební 1522/53, 170 00 Praha 7' };
  test('shoda: sedí', ZZ.zzShoda(hl, { stav: 'ok', subjekt: sub }).stav === 'zalozit');
  test('shoda: jiný název', /jiný název/.test(ZZ.zzShoda({ ...hl, nazev: 'Alfa Stav s.r.o.' }, { stav: 'ok', subjekt: sub }).duvod));
  test('shoda: jiné sídlo', /jiné sídlo/.test(ZZ.zzShoda({ ...hl, sidlo: 'Jinde 1, 17000 Praha 7' }, { stav: 'ok', subjekt: sub }).duvod));
  test('shoda: zaniklý', /zanikl/.test(ZZ.zzShoda(hl, { stav: 'ok', subjekt: { ...sub, zanikla: true, datumZaniku: '2025-01-01' } }).duvod));
  test('shoda: neexistuje', ZZ.zzShoda(hl, { stav: 'nenalezeno' }).stav === 'nesedi');
  test('shoda: výpadek = zkusit znovu', ZZ.zzShoda(hl, { stav: 'vypadek' }).stav === 'vypadek');
}

console.log('\n===== ZK: právo — jen administrátor =====\n');
{
  test('nepřihlášený: GET 401', (await get(zzFn, URL_ZZ)).status === 401);
  test('obchodník: GET 403', (await get(zzFn, URL_ZZ, cO)).status === 403);
  test('vedoucí: POST náhled 403', (await zz({ akce: 'nahled' }, cV)).status === 403);
  test('obchodník: POST zalozit 403', (await zz({ akce: 'zalozit', id: 'x' }, cO)).status === 403);
  test('ne-admin nespustil žádný dotaz do ARES', aresDotazy.length === 0);
  test('neznámá akce 400', (await zz({ akce: 'smaz' }, cA)).status === 400);
  test('tělo pole 400', (await post(zzFn, URL_ZZ, [1], cA)).status === 400);
}

console.log('\n===== ZK: náhled (nic nezapisuje) =====\n');
let navrhId;
{
  aresVypadek = new Set([I.F]);
  ZZ_NASTAVENI.aresNaVolani = 3;
  const pred = karetPred();
  const r = await nahledCely(cA);
  navrhId = r.navrh.id;
  const P = Object.fromEntries(r.navrh.polozky.map(p => [p.ico, p]));
  test('náhled doběhne (víc volání, ARES po kouscích)', r.ok && r.navrh.faze === 'hotovo' && r.volani >= 3, r.volani + ' ' + JSON.stringify(r).slice(0, 200));
  test('A sedí → založit (2 zakázky)', P[I.A] && P[I.A].stav === 'zalozit' && P[I.A].pocet === 2, JSON.stringify(P[I.A]));
  test('B jiný název → nesedí s důvodem', P[I.B].stav === 'nesedi' && /jiný název/.test(P[I.B].duvod), JSON.stringify(P[I.B]));
  test('C jiné sídlo → nesedí s důvodem', P[I.C].stav === 'nesedi' && /jiné sídlo/.test(P[I.C].duvod), JSON.stringify(P[I.C]));
  test('D zaniklý → nesedí', P[I.D].stav === 'nesedi' && /zanikl/.test(P[I.D].duvod), JSON.stringify(P[I.D]));
  test('E v ARES neexistuje → nesedí', P[I.E].stav === 'nesedi' && /nevede/.test(P[I.E].duvod), JSON.stringify(P[I.E]));
  test('F výpadek ARES → zkusit znovu', P[I.F].stav === 'vypadek', JSON.stringify(P[I.F]));
  test('G má kartu → už existuje (IČO karty s mezerou)', P[I.G].stav === 'existuje', JSON.stringify(P[I.G]));
  test('H další zákazník zakázky → založit', P[I.H] && P[I.H].stav === 'zalozit', JSON.stringify(P[I.H]));
  test('počty v náhledu', JSON.stringify(r.navrh.pocty) === JSON.stringify({ zalozit: 3, existuje: 1, nesedi: 4, vypadek: 1, zbyva: 0 }), JSON.stringify(r.navrh.pocty));
  test('bez IČO / neplatné IČO jen počty', r.navrh.bezIco === 1 && r.navrh.neplatneIco === 1 && !P[spatneIco]);
  test('ARES se ptá jen na IČO bez karty, každé jednou', aresDotazy.length === 8 && !aresDotazy.includes(I.G) && !aresDotazy.includes(spatneIco), aresDotazy.join(','));
  test('nejvýš aresNaVolani dotazů za volání a pauza mezi dotazy', pauzy.length === 8 - Math.ceil(8 / 3) && pauzy.every(x => x === ZZ_NASTAVENI.pauzaMs), pauzy.length + '');
  test('náhled nezaložil ani nezměnil žádnou kartu', karetPred() === pred && pamet.get('zakaznici/z/' + I.G) === kartaGPred);
  const ulozeny = pamet.get('zakaznici_hromadne/zk-navrh') || '';
  test('uložený náhled nenese kontakty ze zakázek', ulozeny && !/Ada Nová|Hana Hájová|smluvni\.|Bára/.test(ulozeny));
  test('odpověď náhledu nenese soubory zakázek ani kontakty', !/zk-a2|Ada Nová|Hana/.test(JSON.stringify(r)));
  /* zkusit znovu: F už odpovídá */
  aresVypadek = new Set();
  const r2 = await nahledCely(cA, navrhId);
  const F = r2.navrh.polozky.find(p => p.ico === I.F);
  test('„zkusit znovu“: F se dotáže znovu a sedí', r2.navrh.id === navrhId && F.stav === 'zalozit' && aresDotazy.filter(x => x === I.F).length === 2, JSON.stringify(F));
  test('po „zkusit znovu“ nikdo další se neptal', aresDotazy.length === 9, aresDotazy.length + '');
}

console.log('\n===== ZK: zápis po potvrzení =====\n');
{
  test('zápis se starým / cizím id → 409', (await zz({ akce: 'zalozit', id: 'jine-id' }, cA)).status === 409);
  const r = await zalozitCely(navrhId, cA);
  test('zápis projde', r.ok && r.vysledek.zalozeno === 4, JSON.stringify(r).slice(0, 300));
  const kA = JSON.parse(pamet.get('zakaznici/z/' + I.A) || 'null');
  test('karta A: název, sídlo, IČO, DIČ z ARES', kA && kA.nazev === 'Alfa Stavby s.r.o.' && kA.sidlo === 'Zkušební 1522/53, Holešovice, 17000 Praha 7'
    && kA.ico === I.A && kA.dic === 'CZ' + I.A, JSON.stringify(kA));
  test('karta A: kontakt a zástupci z NEJNOVĚJŠÍ zakázky', kA.kontaktOsoba === 'Ada Nová' && kA.smluvniJmeno === 'Ada Smluvní' && kA.ucet === '123-456/0100');
  test('karta A: autor = administrátor, poznámka o ARES', kA.autor === ADMIN_EMAIL && /ARES/.test(kA.poznamka) && !!kA.zalozen);
  const kH = JSON.parse(pamet.get('zakaznici/z/' + I.H) || 'null');
  test('karta H (další zákazník): ARES + kontakt další strany', kH && kH.nazev === 'Hé Investice s.r.o.' && kH.kontaktOsoba === 'Hana Hájová', JSON.stringify(kH));
  const kF = JSON.parse(pamet.get('zakaznici/z/' + I.F) || 'null');
  test('karta F: prázdné DIČ v ARES = prázdné DIČ karty', kF && kF.dic === '', JSON.stringify(kF));
  test('nesedí s ARES → karta nevznikla (B, C, D, E)', [I.B, I.C, I.D, I.E].every(i => !pamet.has('zakaznici/z/' + i)));
  test('existující karta G se nepřepsala', pamet.get('zakaznici/z/' + I.G) === kartaGPred);
  const prot = JSON.parse(pamet.get('zakaznici_hromadne/zk-protokol'));
  const z = prot[prot.length - 1];
  test('protokol: kdo, kdy, počty', z.kdo === ADMIN_EMAIL && !!z.kdy && z.zalozeno === 4 && z.nesedi === 4 && z.existovalo === 1 && z.uzExistovalo === 0 && z.stav === 'dokončen'
    && z.bezIco === 1 && z.neplatneIco === 1 && z.zakazek === 12, JSON.stringify(z));
  test('protokol bez osobních údajů a názvů firem', !/Ada|Hana|Alfa|priklad\.cz.*priklad|smluvni/.test(JSON.stringify(prot).replace(ADMIN_EMAIL, '')));
  test('náhled se po zápisu smazal', !pamet.has('zakaznici_hromadne/zk-navrh'));
  const g = await (await get(zzFn, URL_ZZ, cA)).json();
  test('GET (admin): protokol a žádný náhled', g.ok && g.navrh === null && g.protokol.length === 1);
}

console.log('\n===== ZK: idempotence a změna mezi náhledem a zápisem =====\n');
{
  const dotazyPred = aresDotazy.length;
  const karty1 = karetPred();
  const r = await nahledCely(cA);
  const P = Object.fromEntries(r.navrh.polozky.map(p => [p.ico, p]));
  test('druhý běh: dříve založené jsou „už existuje“', [I.A, I.F, I.G, I.H, I.J].every(i => P[i].stav === 'existuje'), JSON.stringify(r.navrh.pocty));
  test('druhý běh: nesedící (B–E) se do ARES znovu neposílají, zakázka se nezměnila (R3)', aresDotazy.length - dotazyPred === 0
    && [I.B, I.C, I.D, I.E].every(i => P[i].stav === 'nesedi' && /ověřeno v ARES/.test(P[i].duvod)), String(aresDotazy.length - dotazyPred));
  const z = await zalozitCely(r.navrh.id, cA);
  test('druhý zápis nic nezaloží', z.ok && z.vysledek.zalozeno === 0 && karetPred() === karty1, JSON.stringify(z.vysledek));

  /* nová zakázka K sedí; mezi náhledem a zápisem se hlavička změní → nezaloží se */
  const IK = ico(1000010);
  ARES_DATA[IK] = { obchodniJmeno: 'Kapa Stavby s.r.o.', sidlo: { textovaAdresa: 'Kontrolní 4, 77900 Olomouc' } };
  zak('zk-k', '2026-11-20T08:00:00.000Z', { objednatel: 'Kapa Stavby s.r.o.', adresa: 'Kontrolní 4, 779 00 Olomouc', ico: IK, kontakt: 'Karel Kapa' });
  const r3 = await nahledCely(cA);
  test('K v náhledu sedí', r3.navrh.polozky.find(p => p.ico === IK).stav === 'zalozit');
  zak('zk-k', '2026-11-21T08:00:00.000Z', { objednatel: 'Kapa Stavby s.r.o.', adresa: 'Úplně jinde 1, 779 00 Olomouc', ico: IK, kontakt: 'Karel Kapa' });
  const z3 = await zalozitCely(r3.navrh.id, cA);
  test('zakázka změněná po náhledu → karta nevznikne (zmenenoMezitim)', z3.ok && z3.vysledek.zalozeno === 0 && z3.vysledek.zmenenoMezitim === 1
    && !pamet.has('zakaznici/z/' + IK), JSON.stringify(z3.vysledek));

  /* karta vzniklá ručně mezi náhledem a zápisem se nepřepíše */
  zak('zk-k', '2026-11-22T08:00:00.000Z', { objednatel: 'Kapa Stavby s.r.o.', adresa: 'Kontrolní 4, 779 00 Olomouc', ico: IK, kontakt: 'Karel Kapa' });
  const r4 = await nahledCely(cA);
  await post(zakaznici, 'http://x/api/zakaznici', { zakaznik: { nazev: 'Kapa Stavby s.r.o.', ico: IK, kontaktOsoba: 'Ručně Založil' } }, cO);
  const rucne = pamet.get('zakaznici/z/' + IK);
  const z4 = await zalozitCely(r4.navrh.id, cA);
  test('ručně založená karta mezi náhledem a zápisem se nepřepíše', z4.ok && z4.vysledek.zalozeno === 0 && pamet.get('zakaznici/z/' + IK) === rucne, JSON.stringify(z4.vysledek));
}

console.log('\n===== ZK: stropy dotazů do ARES a kola (R3) =====\n');
{
  const IL = ico(1000011), IM = ico(1000012);
  ARES_DATA[IL] = { obchodniJmeno: 'Lambda s.r.o.', sidlo: { textovaAdresa: 'Limitní 1, 50002 Hradec Králové' } };
  ARES_DATA[IM] = { obchodniJmeno: 'My s.r.o.', sidlo: { textovaAdresa: 'Limitní 2, 50002 Hradec Králové' } };
  zak('zk-l', '2026-11-23T08:00:00.000Z', { objednatel: 'Lambda s.r.o.', adresa: 'Limitní 1, 500 02 Hradec Králové', ico: IL });
  zak('zk-m', '2026-11-23T09:00:00.000Z', { objednatel: 'My s.r.o.', adresa: 'Limitní 2, 500 02 Hradec Králové', ico: IM });
  /* změněná zakázka nesedící firmy B → do ARES znovu (paměť „nesedí“ platí jen pro touž zakázku) */
  zak('zk-b', '2026-11-23T10:00:00.000Z', { objednatel: 'Beta Development s.r.o.', adresa: 'Pokusná 10, 110 00 Praha 1', ico: I.B, kontakt: 'Bára Betová' });
  const den = JSON.parse(pamet.get('zakaznici_hromadne/zk-den'));
  ZZ_NASTAVENI.aresMaxDen = den.pocet + 1;
  const pred = aresDotazy.length;
  const r = await nahledCely(cA);
  const zbyva = r.navrh.polozky.filter(p => p.stav === 'vypadek' && /denní strop/.test(p.duvod));
  test('denní strop: nad strop se nedotazuje, zbytek „zkusit znovu“', aresDotazy.length - pred === 1 && zbyva.length === 2, (aresDotazy.length - pred) + ' / ' + zbyva.length);
  test('změněná zakázka nesedící firmy jde do ARES znovu (B první ve frontě)', aresDotazy[aresDotazy.length - 1] === I.B);
  ZZ_NASTAVENI.aresMaxDen = 1500;
  ZZ_NASTAVENI.aresMaxNavrh = 1;
  const pred2 = aresDotazy.length;
  const r2 = await nahledCely(cA, r.navrh.id);
  test('„Zkusit znovu“ po denním stropu pokračuje, kde skončil (kolo 1 dotaz)', aresDotazy.length - pred2 === 1
    && r2.navrh.polozky.filter(p => /jedno kolo/.test(p.duvod)).length === 1, String(aresDotazy.length - pred2));
  const r3 = await nahledCely(cA, r.navrh.id);
  test('další kolo dotáže zbytek a nic znovu', aresDotazy.length - pred2 === 2 && r3.navrh.pocty.vypadek === 0
    && new Set(aresDotazy.slice(pred2)).size === 2, aresDotazy.slice(pred2).join(','));
  ZZ_NASTAVENI.aresMaxNavrh = 600;
  ZZ_NASTAVENI.aresNaVolani = 1;
  const r4 = await zz({ akce: 'nahled' }, cA);
  test('zápis nedokončeného náhledu → 409', r4.navrh.faze !== 'hotovo' && (await zz({ akce: 'zalozit', id: r4.navrh.id }, cA)).status === 409, r4.navrh.faze);
  test('pokračování náhledu s cizím id → 409', (await zz({ akce: 'nahled', id: 'cizi-id' }, cA)).status === 409);
  ZZ_NASTAVENI.aresNaVolani = 3;
  const r5 = await nahledCely(cA);
  const puvodniTed = ZZ_NASTAVENI.ted;
  ZZ_NASTAVENI.ted = () => Date.now() + 25 * 3600 * 1000;
  const z5 = await zz({ akce: 'zalozit', id: r5.navrh.id }, cA);
  ZZ_NASTAVENI.ted = puvodniTed;
  test('propadlý náhled (po 24 h) se nezapíše → 409', z5.status === 409 && !pamet.has('zakaznici/z/' + IL), JSON.stringify(z5));
  const r6 = await nahledCely(cA);
  ZZ_NASTAVENI.ted = () => Date.now() + 25 * 3600 * 1000;
  const g6 = await (await get(zzFn, URL_ZZ, cA)).json();
  ZZ_NASTAVENI.ted = puvodniTed;
  test('R5: GET propadlý náhled nevydá a smaže', g6.navrh === null && !pamet.has('zakaznici_hromadne/zk-navrh') && !!r6.navrh, JSON.stringify(g6).slice(0, 120));
  const r7 = await nahledCely(cA);
  const zr = await zz({ akce: 'zrusit' }, cA);
  test('zrušení náhledu', r7.ok && zr.ok && !pamet.has('zakaznici_hromadne/zk-navrh'));
}

console.log('\n===== ZK: zápis po kouscích, protokol i po přerušení (R1) =====\n');
{
  const N1 = ico(1000021), N2 = ico(1000022), N3 = ico(1000023);
  for (const [i, jm] of [[N1, 'Ný Jedna'], [N2, 'Ný Dva'], [N3, 'Ný Tři']]) {
    ARES_DATA[i] = { obchodniJmeno: jm + ' s.r.o.', sidlo: { textovaAdresa: 'Kousková 1, 53002 Pardubice' } };
    zak('zk-' + i, '2026-11-24T08:00:00.000Z', { objednatel: jm + ' s.r.o.', adresa: 'Kousková 1, 530 02 Pardubice', ico: i, kontakt: 'Kontakt ' + jm });
  }
  const r = await nahledCely(cA);
  const navrzeno = r.navrh.pocty.zalozit;
  ZZ_NASTAVENI.zapisNaVolani = 1;
  /* pád už při zápisu první karty — protokol musí existovat od začátku */
  const prvni = r.navrh.polozky.filter(p => p.stav === 'zalozit').map(p => p.ico).sort()[0];
  padniPriZapisu = 'zakaznici/z/' + prvni;
  let spadlo0 = false;
  try { await zz({ akce: 'zalozit', id: r.navrh.id }, cA); } catch (e) { spadlo0 = true; }
  const prot0 = JSON.parse(pamet.get('zakaznici_hromadne/zk-protokol') || '[]').filter(x => x.id === r.navrh.id);
  test('pád v prvním kousku: protokol už nese záznam „probíhá“ (kdo, kdy, navrženo)', spadlo0 && prot0.length === 1
    && prot0[0].stav === 'probíhá' && prot0[0].zalozeno === 0 && prot0[0].navrzeno === navrzeno && prot0[0].kdo === ADMIN_EMAIL, JSON.stringify(prot0));
  const z1 = await zz({ akce: 'zalozit', id: r.navrh.id }, cA);
  let prot = JSON.parse(pamet.get('zakaznici_hromadne/zk-protokol'));
  let posl = prot[prot.length - 1];
  test('zápis po kouscích: první volání 1 karta, nehotovo, protokol „probíhá“ se zbytkem', z1.ok && !z1.hotovo && z1.vysledek.zalozeno === 1
    && posl.stav === 'probíhá' && posl.zalozeno === 1 && posl.zbyva === navrzeno - 1, JSON.stringify(posl));
  const g1 = await (await get(zzFn, URL_ZZ, cA)).json();
  test('obrazovka (GET) ukáže skutečný stav zápisu', g1.navrh && g1.navrh.faze === 'zapis' && g1.navrh.zapis.zalozeno === 1 && g1.navrh.zapis.zbyva === navrzeno - 1, JSON.stringify(g1.navrh && g1.navrh.zapis));
  test('během zápisu nový náhled → 409', (await zz({ akce: 'nahled' }, cA)).status === 409);
  /* pád funkce po zápisu karty, před uložením průběžného stavu */
  padniPriZapisu = 'zakaznici_hromadne/zk-protokol';
  let spadlo = false;
  try { await zz({ akce: 'zalozit', id: r.navrh.id }, cA); } catch (e) { spadlo = true; }
  prot = JSON.parse(pamet.get('zakaznici_hromadne/zk-protokol')); posl = prot[prot.length - 1];
  test('po pádu protokol nese, co bylo zapsáno do posledního uloženého kousku', spadlo && posl.stav === 'probíhá' && posl.zalozeno === 1, JSON.stringify(posl));
  ZZ_NASTAVENI.zapisNaVolani = 100;
  const z2 = await zalozitCely(r.navrh.id, cA);
  prot = JSON.parse(pamet.get('zakaznici_hromadne/zk-protokol')); posl = prot[prot.length - 1];
  test('opakování doplní zbytek; karta z přerušeného volání se počítá jako založená', z2.ok && z2.hotovo && posl.stav === 'dokončen'
    && posl.zalozeno === navrzeno && posl.uzExistovalo === 0 && [N1, N2, N3].every(i => pamet.has('zakaznici/z/' + i)), JSON.stringify(posl));
  test('protokol má pro jeden zápis jediný záznam', prot.filter(x => x.id === r.navrh.id).length === 1);
}

console.log('\n===== ZK: hromadné čtení karet (R2) =====\n');
{
  for (const k of Object.keys(cteni)) delete cteni[k];
  const karet = [...pamet.keys()].filter(k => k.startsWith('zakaznici/z/')).length;
  await nahledCely(cA);
  test('náhled nečte karty (jen klíče)', (cteni.zakaznici || 0) === 0, JSON.stringify(cteni));
  for (const k of Object.keys(cteni)) delete cteni[k];
  const gl = await (await get(zakaznici, 'http://x/api/zakaznici', cA)).json();
  test('GET /api/zakaznici čte každou kartu nejvýš jednou', gl.ok && gl.zakaznici.length === karet && (cteni.zakaznici || 0) === karet, (cteni.zakaznici || 0) + ' / ' + karet);
  await zz({ akce: 'zrusit' }, cA);
}

console.log('\n===== ZK: dvojčata, tvar IČO karty, strop karet (R4) =====\n');
{
  /* karta se 7místným IČO (bez úvodní nuly) = táž firma jako 8místné IČO v zakázce */
  const I0 = ico(100031);   // 8 číslic s úvodní nulou
  test('pomocné IČO začíná nulou', I0[0] === '0', I0);
  ARES_DATA[I0] = { obchodniJmeno: 'Nula Stavby s.r.o.', sidlo: { textovaAdresa: 'Nulová 1, 25001 Brandýs nad Labem' } };
  zak('zk-nula', '2026-11-24T09:00:00.000Z', { objednatel: 'Nula Stavby s.r.o.', adresa: 'Nulová 1, 250 01 Brandýs nad Labem', ico: I0 });
  await post(zakaznici, 'http://x/api/zakaznici', { zakaznik: { nazev: 'Nula Stavby s.r.o.', ico: I0.slice(1) } }, cO);
  test('ruční karta je pod 7místným klíčem', pamet.has('zakaznici/z/' + I0.slice(1)));
  /* karta bez IČO se stejným názvem jako ARES */
  const IT = ico(1000041), IU = ico(1000042);
  ARES_DATA[IT] = { obchodniJmeno: 'Tau Dvojče s.r.o.', sidlo: { textovaAdresa: 'Dvojitá 1, 41201 Litoměřice' } };
  ARES_DATA[IU] = { obchodniJmeno: 'Ypsilon Dvojče s.r.o.', sidlo: { textovaAdresa: 'Dvojitá 2, 41201 Litoměřice' } };
  zak('zk-tau', '2026-11-24T09:00:00.000Z', { objednatel: 'Tau Dvojče s.r.o.', adresa: 'Dvojitá 1, 412 01 Litoměřice', ico: IT });
  zak('zk-ups', '2026-11-24T09:00:00.000Z', { objednatel: 'Ypsilon Dvojče s.r.o.', adresa: 'Dvojitá 2, 412 01 Litoměřice', ico: IU });
  await post(zakaznici, 'http://x/api/zakaznici', { zakaznik: { nazev: 'Tau Dvojče s.r.o.' } }, cO);
  const pred = aresDotazy.length;
  const r = await nahledCely(cA);
  const P = Object.fromEntries(r.navrh.polozky.map(p => [p.ico, p]));
  test('7místné IČO karty: „už existuje“ bez dotazu do ARES', P[I0].stav === 'existuje' && !aresDotazy.slice(pred).includes(I0), JSON.stringify(P[I0]));
  test('náhled: karta bez IČO se stejným názvem → „už existuje“', P[IT].stav === 'existuje' && /bez IČO/.test(P[IT].duvod), JSON.stringify(P[IT]));
  test('Ypsilon sedí', P[IU].stav === 'zalozit');
  /* mezi náhledem a zápisem vznikne karta Ypsilon bez IČO → zápis ji nezdvojí */
  await post(zakaznici, 'http://x/api/zakaznici', { zakaznik: { nazev: 'Ypsilon Dvojče s.r.o.' } }, cO);
  const z = await zalozitCely(r.navrh.id, cA);
  test('zápis: karta bez IČO se stejným názvem → nic nezaloží', z.ok && z.vysledek.zalozeno === 0 && z.vysledek.uzExistovalo === 1 && !pamet.has('zakaznici/z/' + IU), JSON.stringify(z.vysledek));
  /* strop počtu karet */
  const IS = ico(1000051);
  ARES_DATA[IS] = { obchodniJmeno: 'Sigma Strop s.r.o.', sidlo: { textovaAdresa: 'Stropní 1, 76001 Zlín' } };
  zak('zk-sigma', '2026-11-24T09:00:00.000Z', { objednatel: 'Sigma Strop s.r.o.', adresa: 'Stropní 1, 760 01 Zlín', ico: IS });
  const r2 = await nahledCely(cA);
  test('Sigma sedí', r2.navrh.polozky.find(p => p.ico === IS).stav === 'zalozit');
  const vyplne = [];
  for (let k = [...pamet.keys()].filter(x => x.startsWith('zakaznici/z/')).length; k < ZAKAZNICI_MAX; k++) {
    const kl = 'zakaznici/z/n-vypln-' + k; pamet.set(kl, '{}'); vyplne.push(kl);
  }
  const z2 = await zalozitCely(r2.navrh.id, cA);
  test('strop ZAKAZNICI_MAX: karta nevznikne, ve výsledku „strop“', z2.ok && z2.vysledek.strop === 1 && z2.vysledek.zalozeno === 0 && !pamet.has('zakaznici/z/' + IS), JSON.stringify(z2.vysledek));
  vyplne.forEach(k => pamet.delete(k));
}

console.log('\n===== ZK: dorevize D4 (autor přerušené karty, paměť 30 dní, smazání z paměti, přerušen, rozpočet ARES) =====\n');
{
  const memo = () => JSON.parse(pamet.get('zakaznici_hromadne/zk-nesedi') || '{}');
  /* (5) první dotaz do ARES jen, když zbývá čas */
  const IQ = ico(1000061);
  ARES_DATA[IQ] = { obchodniJmeno: 'Kvé Rozpočet s.r.o.', sidlo: { textovaAdresa: 'Časová 1, 58601 Jihlava' } };
  zak('zk-q', '2026-11-24T10:00:00.000Z', { objednatel: 'Kvé Rozpočet s.r.o.', adresa: 'Časová 1, 586 01 Jihlava', ico: IQ });
  const puvRozpocet = ZZ_NASTAVENI.rozpocetMs;
  ZZ_NASTAVENI.rozpocetMs = 0;
  const pred = aresDotazy.length;
  let r0 = await zz({ akce: 'nahled' }, cA);
  for (let k = 0; k < 200 && r0.navrh.faze === 'cteni'; k++) r0 = await zz({ akce: 'nahled', id: r0.navrh.id }, cA);
  r0 = await zz({ akce: 'nahled', id: r0.navrh.id }, cA);
  test('bez zbývajícího času se do ARES neptá (náhled pokračuje dalším voláním)', aresDotazy.length === pred && r0.navrh.faze === 'ares', (aresDotazy.length - pred) + ' ' + r0.navrh.faze);
  ZZ_NASTAVENI.rozpocetMs = puvRozpocet;
  /* (3) IČO, které začne sedět, zmizí z paměti „nesedí“ */
  test('C je v paměti „nesedí“', !!memo()[I.C]);
  zak('zk-c', '2026-11-24T10:30:00.000Z', { objednatel: 'Gama Byty s.r.o.', adresa: 'Vzorová 7, 602 00 Brno', ico: I.C });
  const r1 = await nahledCely(cA);
  test('opravená zakázka C sedí a C zmizí z paměti', r1.navrh.polozky.find(p => p.ico === I.C).stav === 'zalozit' && !memo()[I.C], JSON.stringify(memo()[I.C] || null));
  /* (1) karta jiného autora s toutéž poznámkou se nepočítá jako „naše“ */
  ZZ_NASTAVENI.zapisNaVolani = 1;
  const zz1 = await zz({ akce: 'zalozit', id: r1.navrh.id }, cA);
  const zbyvaIco = r1.navrh.polozky.filter(p => p.stav === 'zalozit').map(p => p.ico).sort().slice(1);
  const poznamka = 'Založeno hromadně ze zakázek, údaje ověřené v ARES ' + new Date().toISOString().slice(0, 10) + '.';
  const ciziIco = zbyvaIco[0];
  const ciziNazev = ARES_DATA[ciziIco].obchodniJmeno;
  const rc = await (await post(zakaznici, 'http://x/api/zakaznici', { zakaznik: { nazev: ciziNazev, ico: ciziIco, poznamka } }, cO)).json();
  ZZ_NASTAVENI.zapisNaVolani = 100;
  const zz2 = await zalozitCely(r1.navrh.id, cA);
  test('karta jiného autora s toutéž poznámkou = „už existovalo“, ne „založeno“', zz1.ok && rc.ok && zz2.hotovo
    && zz2.vysledek.uzExistovalo === 1 && zz2.vysledek.zalozeno === zbyvaIco.length, JSON.stringify(zz2.vysledek));
  /* (4) zahození rozpracovaného zápisu → protokol „přerušen“ */
  const IR = ico(1000062), IV = ico(1000063);
  for (const [i, jm] of [[IR, 'Ró Přerušení'], [IV, 'Vé Přerušení']]) {
    ARES_DATA[i] = { obchodniJmeno: jm + ' s.r.o.', sidlo: { textovaAdresa: 'Zahozená 1, 79601 Prostějov' } };
    zak('zk-' + i, '2026-11-24T11:00:00.000Z', { objednatel: jm + ' s.r.o.', adresa: 'Zahozená 1, 796 01 Prostějov', ico: i });
  }
  const r2 = await nahledCely(cA);
  ZZ_NASTAVENI.zapisNaVolani = 1;
  await zz({ akce: 'zalozit', id: r2.navrh.id }, cA);
  ZZ_NASTAVENI.zapisNaVolani = 100;
  await zz({ akce: 'zrusit' }, cA);
  const pz = JSON.parse(pamet.get('zakaznici_hromadne/zk-protokol')).find(x => x.id === r2.navrh.id);
  test('zahozený rozpracovaný zápis: protokol „přerušen“ s počtem založených', pz && /přerušen/.test(pz.stav) && pz.zalozeno === 1, JSON.stringify(pz));
  /* (2) paměť „nesedí“ platí nejvýš 30 dní */
  test('D, E jsou v paměti „nesedí“', !!memo()[I.D] && !!memo()[I.E]);
  const puvTed = ZZ_NASTAVENI.ted;
  ZZ_NASTAVENI.ted = () => Date.now() + 31 * 24 * 3600 * 1000;
  const pred3 = aresDotazy.length;
  await nahledCely(cA);
  ZZ_NASTAVENI.ted = puvTed;
  const nove3 = aresDotazy.slice(pred3);
  test('po 30 dnech paměť neplatí — nesedící IČO se dotážou znovu', nove3.includes(I.D) && nove3.includes(I.E), nove3.join(','));
  await zz({ akce: 'zrusit' }, cA);
}

console.log('\n' + (fail ? 'FAIL' : 'OK') + ' — ' + ok + ' prošlo, ' + fail + ' selhalo');
process.exit(fail ? 1 : 0);
