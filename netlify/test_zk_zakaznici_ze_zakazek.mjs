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
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

import './pomoc_test_admin.mjs';
import prihlaseni from './functions/prihlaseni.mjs';
import uzivatele from './functions/uzivatele.mjs';
import zakaznici from './functions/zakaznici.mjs';
import zzFn, { ZZ_NASTAVENI } from './functions/zakaznici_ze_zakazek.mjs';
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
  const r = await zz({ akce: 'zalozit', id: navrhId }, cA);
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
  test('protokol: kdo, kdy, počty', z.kdo === ADMIN_EMAIL && !!z.kdy && z.zalozeno === 4 && z.nesedi === 4 && z.uzExistovalo === 1
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
  test('druhý běh: ARES jen pro IČO bez karty (B, C, D, E)', aresDotazy.length - dotazyPred === 4, String(aresDotazy.length - dotazyPred));
  const z = await zz({ akce: 'zalozit', id: r.navrh.id }, cA);
  test('druhý zápis nic nezaloží', z.ok && z.vysledek.zalozeno === 0 && karetPred() === karty1, JSON.stringify(z.vysledek));

  /* nová zakázka K sedí; mezi náhledem a zápisem se hlavička změní → nezaloží se */
  const IK = ico(1000010);
  ARES_DATA[IK] = { obchodniJmeno: 'Kapa Stavby s.r.o.', sidlo: { textovaAdresa: 'Kontrolní 4, 77900 Olomouc' } };
  zak('zk-k', '2026-11-20T08:00:00.000Z', { objednatel: 'Kapa Stavby s.r.o.', adresa: 'Kontrolní 4, 779 00 Olomouc', ico: IK, kontakt: 'Karel Kapa' });
  const r3 = await nahledCely(cA);
  test('K v náhledu sedí', r3.navrh.polozky.find(p => p.ico === IK).stav === 'zalozit');
  zak('zk-k', '2026-11-21T08:00:00.000Z', { objednatel: 'Kapa Stavby s.r.o.', adresa: 'Úplně jinde 1, 779 00 Olomouc', ico: IK, kontakt: 'Karel Kapa' });
  const z3 = await zz({ akce: 'zalozit', id: r3.navrh.id }, cA);
  test('zakázka změněná po náhledu → karta nevznikne (zmenenoMezitim)', z3.ok && z3.vysledek.zalozeno === 0 && z3.vysledek.zmenenoMezitim === 1
    && !pamet.has('zakaznici/z/' + IK), JSON.stringify(z3.vysledek));

  /* karta vzniklá ručně mezi náhledem a zápisem se nepřepíše */
  zak('zk-k', '2026-11-22T08:00:00.000Z', { objednatel: 'Kapa Stavby s.r.o.', adresa: 'Kontrolní 4, 779 00 Olomouc', ico: IK, kontakt: 'Karel Kapa' });
  const r4 = await nahledCely(cA);
  await post(zakaznici, 'http://x/api/zakaznici', { zakaznik: { nazev: 'Kapa Stavby s.r.o.', ico: IK, kontaktOsoba: 'Ručně Založil' } }, cO);
  const rucne = pamet.get('zakaznici/z/' + IK);
  const z4 = await zz({ akce: 'zalozit', id: r4.navrh.id }, cA);
  test('ručně založená karta mezi náhledem a zápisem se nepřepíše', z4.ok && z4.vysledek.zalozeno === 0 && pamet.get('zakaznici/z/' + IK) === rucne, JSON.stringify(z4.vysledek));
}

console.log('\n===== ZK: stropy dotazů do ARES =====\n');
{
  const IL = ico(1000011), IM = ico(1000012);
  ARES_DATA[IL] = { obchodniJmeno: 'Lambda s.r.o.', sidlo: { textovaAdresa: 'Limitní 1, 50002 Hradec Králové' } };
  ARES_DATA[IM] = { obchodniJmeno: 'My s.r.o.', sidlo: { textovaAdresa: 'Limitní 2, 50002 Hradec Králové' } };
  zak('zk-l', '2026-11-23T08:00:00.000Z', { objednatel: 'Lambda s.r.o.', adresa: 'Limitní 1, 500 02 Hradec Králové', ico: IL });
  zak('zk-m', '2026-11-23T09:00:00.000Z', { objednatel: 'My s.r.o.', adresa: 'Limitní 2, 500 02 Hradec Králové', ico: IM });
  const den = JSON.parse(pamet.get('zakaznici_hromadne/zk-den'));
  ZZ_NASTAVENI.aresMaxDen = den.pocet + 2;
  const pred = aresDotazy.length;
  const r = await nahledCely(cA);
  const zbyva = r.navrh.polozky.filter(p => p.stav === 'vypadek' && /denní strop/.test(p.duvod));
  test('denní strop dotazů: nad strop se nedotazuje, položky „zkusit znovu“', aresDotazy.length - pred === 2 && zbyva.length === 4, (aresDotazy.length - pred) + ' / ' + zbyva.length);
  ZZ_NASTAVENI.aresMaxDen = 1500;
  ZZ_NASTAVENI.aresMaxNavrh = 1;
  const pred2 = aresDotazy.length;
  const r2 = await nahledCely(cA);
  test('strop dotazů na jeden náhled', aresDotazy.length - pred2 === 1 && r2.navrh.polozky.filter(p => /jeden náhled/.test(p.duvod)).length === 5, String(aresDotazy.length - pred2));
  ZZ_NASTAVENI.aresMaxNavrh = 600;
  const r3 = await zz({ akce: 'nahled' }, cA);
  test('zápis nedokončeného náhledu → 409', r3.navrh.faze !== 'hotovo' && (await zz({ akce: 'zalozit', id: r3.navrh.id }, cA)).status === 409, r3.navrh.faze);
  const r4 = await nahledCely(cA);
  const puvodniTed = ZZ_NASTAVENI.ted;
  ZZ_NASTAVENI.ted = () => Date.now() + 25 * 3600 * 1000;
  const z4 = await zz({ akce: 'zalozit', id: r4.navrh.id }, cA);
  ZZ_NASTAVENI.ted = puvodniTed;
  test('propadlý náhled (po 24 h) se nezapíše → 409', z4.status === 409 && !pamet.has('zakaznici/z/' + IL), JSON.stringify(z4));
  const zr = await zz({ akce: 'zrusit' }, cA);
  test('zrušení náhledu', zr.ok && !pamet.has('zakaznici_hromadne/zk-navrh'));
}

console.log('\n' + (fail ? 'FAIL' : 'OK') + ' — ' + ok + ' prošlo, ' + fail + ' selhalo');
process.exit(fail ? 1 : 0);
