/* CENOVÉ VÝJIMKY VARIANTY VE SCHVALOVÁNÍ (rozhodnutí J. V. 13. 10. 2026).
 *
 *  – „Ano, směs do schvalování": ceník varianty, který se ve sledovaných
 *    položkách (mimo přirážku a DPH) liší od platného ceníku — typicky
 *    přepočet jen vybraných položek u zakázky se starší verzí —, smí role
 *    bez práva ceníku odeslat (nový zámek = tisk) jen se schválením.
 *  – „Ponechat se schvalováním": ruční sazba pásu opláštění „jiné" nižší
 *    než nejnižší ceníková sazba opláštění — totéž schválení.
 * Rozpracované uložení beze zámku projde vždy. Schválit smí administrátor
 * a role s právem „Schvalování slevy nad strop role" (sleva.schvalovani);
 * razítka a obsah píše server, změna směsi nebo sazby po schválení
 * schválení zruší (obsah). Administrátor a role s právem ceníku výjimku
 * nepotřebují.
 *
 * Pojistka proti prázdnému testu: proti v13.10.2 (0512c51) vracely zámky
 * směsi i pásu bez schválení 200 a podvržené schválení obchodníka prošlo.
 *
 * Paměťové úložiště, zkušební ceník. Spuštění: node netlify/test_vyjimky.mjs */
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
const { default: zobrazeni } = await import(R + 'netlify/functions/zobrazeni.mjs');
const { default: schvalovani } = await import(R + 'netlify/functions/schvalovani.mjs');
const { ADMIN_EMAIL } = await import(R + 'netlify/lib/sdilene.mjs');
const { jadro } = await import(R + 'netlify/lib/jadro.mjs');
const { JEKLY } = await jadro();
const { createRequire } = await import('node:module');
const require = createRequire(R + 'netlify/x.mjs');
const zk = require(R + 'src/zakazka.js');
const zam = require(R + 'src/zamek.js');
const VY = require(R + 'src/vyjimky.js');
const SCHV = require(R + 'src/schvalovani.js');
const ZC = require(R + 'src/zkusebni_cenik.js');
const slevaPlatiT = (sl) => !!sl && +sl.procenta > 0 && /^schváleno/.test(sl.stav || '');

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
const zverejni = async (cenik, cenikProj, pozn) => {
  const r = await (await post(program, 'http://x/api/program', { cenik, cenikProj, slevy: NASTSL, poznamka: pozn }, cA)).json();
  if (!r.ok) throw new Error('program ' + JSON.stringify(r));
};
const zaloz = async (email, jmeno, role) => {
  const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email, jmeno, role, heslo: 'Heslo12345x' }, cA)).json();
  if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
  return prihlas(email, 'Heslo12345x');
};
const cO = await zaloz('obch.vyjimky@priklad.cz', 'Obch Výjimka', 'Obchodník');
const cV = await zaloz('ved.vyjimky@priklad.cz', 'Ved Výjimka', 'Vedoucí');
const matice = async (m) => { const r = await post(zobrazeni, 'http://x/api/zobrazeni', { hesloSpravce: 'Docasne.Heslo.123', matice: m }, cA); if (r.status !== 200) throw new Error('matice ' + r.status); };
/* Vedoucí smí schvalovat (navrh matice), ceník ne — výchozí stav sady. */
await matice({ 'sleva.schvalovani': { 'Vedoucí': true } });

/* Starší verze (V1) a platná (V2) — liší se ve dvou položkách OCK a v sazbě
 * projektanta (PROJ). */
const V1 = ZC.zkusebniCenik(), V1P = ZC.zkusebniCenikProj();
await zverejni(V1, V1P, 'výjimky V1');
const V2 = ZC.zkusebniCenik(); V2.montazHodKc = V1.montazHodKc + 100; V2.profilasKgKc = V1.profilasKgKc + 5;
V2.nytKc = V1.nytKc + 1;
const V2P = ZC.zkusebniCenikProj(); V2P.sazby.projektant = V1P.sazby.projektant + 200;
await zverejni(V2, V2P, 'výjimky V2');
const platny = () => JSON.parse(pamet.get('program/db')).platny;

const ROZMERY = { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 };
let n = 9900;   // vlastní rozsah 9900–9999
function nova(nazev, cenik, cenikProj) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++); z.nazevAkce = 'TEST výjimka ' + nazev;
  Object.assign(z.varianty[0].data.ock.zadani, ROZMERY);
  z.varianty[0].data.cenik = kopie(cenik || platny().cenik);
  z.varianty[0].data.proj.cenik = kopie(cenikProj || platny().cenikProj);
  return z;
}
const d0 = (z) => z.varianty[0].data;
const zamkni = (z, typ) => { const v = z.varianty[0];
  zam.zamkniVariantu(v, { typ: typ || 'nabidka', kdy: new Date().toISOString(), kdo: 'Test výjimky',
    cislo: zam.variantaCislo(z, v), vysledek: zam.zamekVysledekSpocti(v, JEKLY, 'v-vyj') });
  return z; };
/* Uložená zakázka se STARŠÍ verzí celou, pak přepočet jen montáže na
 * platný ceník (směs „uložená verze + platný ceník", B128 ji pustí). */
async function smesUlozena(nazev, kdo) {
  const r = await uloz(nova(nazev, V1, V1P), kdo || cO);
  if (r.status !== 200) throw new Error('příprava ' + JSON.stringify(r));
  const g = await nacti(r.soubor, cO);
  const a = zk.importZakazka(kopie(g));
  d0(a).cenik.montazHodKc = V2.montazHodKc;            // přepočtená položka
  return { a, soubor: r.soubor, razitko: g.uloRazitko };
}
/* Obsah výjimky tak, jak ho spočítá i prohlížeč (týž záznam programu). */
const obsah = (z) => VY.vyjimkyObsah(d0(z), VY.vyjimkyDnesniZProgramu(platny(), d0(z)), zk.zakazkaVyrazenaStrana(z) || '', JEKLY);
const pasJine = (z, sazba) => { d0(z).ock.zadani.oplasteni = { rezim: 'poStenach', steny: {
  A: { odM: 0, pasy: [{ typ: 'jine', nazev: 'Deska', naklad: sazba, doM: null }] } } }; };

console.log('===== směs ceníku: bez schválení =====');
{ const s = await smesUlozena('směs bez zámku');
  const r = await uloz(s.a, cO, s.razitko);
  test('směs: obchodník uloží rozpracovanou směs bez zámku (200)', r.status === 200, r);
  const o = obsah(s.a);
  test('směs: obsah výjimky — 2 položky OCK (profil, nýty) se liší od platného, montáž ne; PROJ vyřazená číslem OPR (P6)',
    o.polozek === 2 && o.smes.map(x => x.cesta).join() === 'C.nytKc,C.profilasKgKc' && o.pasu === 0, o);
  const z2 = kopie(s.a); z2.cislo = z2.cislo.replace('OPR', 'OVP'); const o2 = obsah(z2);
  test('směs: u čísla OVP (OCK vyřazená) se posuzuje jen PROJ (sazba projektanta)',
    o2.polozek === 1 && o2.smes[0].cesta === 'PC.sazby.projektant', o2); }
{ const s = await smesUlozena('směs + zámek'); zamkni(s.a);
  const r = await uloz(s.a, cO, s.razitko);
  test('směs: obchodník — nový zámek bez schválení → 403 se slovem „směs"', r.status === 403 && /směs/.test(r.chyba || '') && /schválení/.test(r.chyba || ''), r); }
{ const r = await uloz(zamkni(nova('celá starší verze', V1, V1P)), cO);
  test('výklad: celá starší verze se od platného ceníku liší — zámek obchodníka bez schválení → 403', r.status === 403, r); }
{ const r = await uloz(zamkni(nova('platný ceník')), cO);
  test('platný ceník celý — zámek obchodníka bez schválení (200)', r.status === 200, r); }
{ const z = nova('přirážka'); d0(z).cenik.marze = 0.35; d0(z).cenikRucni = { 'C.marze': true }; zamkni(z);
  const o = obsah(z);
  test('zakázková přirážka do výjimky nepatří (obsah prázdný)', o.prazdny, o); }
{ const s = await smesUlozena('směs admin'); zamkni(s.a);
  const r = await uloz(s.a, cA, s.razitko);
  test('směs: administrátor — nový zámek bez schválení (200)', r.status === 200, r); }

console.log('===== směs ceníku: žádost, schválení, zámek =====');
{ const s = await smesUlozena('směs schválení');
  const o = obsah(s.a);
  VY.vyjimkaPozadej(d0(s.a), o, 'podvrh jména', '2000-01-01T00:00:00.000Z');
  const r1 = await uloz(s.a, cO, s.razitko);
  const vy1 = (r1.slevy || []).map(x => x.cenovaVyjimka).find(Boolean) || {};
  test('žádost obchodníka uložena (200), server orazítkoval žadatele a obsah',
    r1.status === 200 && vy1.stav === VY.VYJ_CEKA && /Obch Výjimka/.test(vy1.pozadal || '') && !!o.obsah && vy1.obsah === o.obsah
    && vy1.pozadalKdy !== '2000-01-01T00:00:00.000Z', vy1);
  /* Rejstřík napříč zakázkami: výjimka bez cen a bez obsahu. */
  const rj = await (await get(schvalovani, 'http://x/api/schvalovani', cV)).json();
  const zad = (rj.zadosti || []).find(x => x.cast === 'vyjimka' && x.cislo === s.a.cislo);
  test('rejstřík: čekající výjimka je v přehledu (počet položek, bez obsahu a hodnot)',
    !!zad && zad.vyjimka.polozek === 2 && !('obsah' in zad.vyjimka) && !('otisk' in zad.vyjimka) && !JSON.stringify(zad).includes(String(V1.profilasKgKc)), zad);
  test('rejstřík: klient pole výjimky zná (žádné neznámé klíče)', SCHV.schvalovaniRejstrikNeznameKlice(rj.zadosti).length === 0,
    SCHV.schvalovaniRejstrikNeznameKlice(rj.zadosti));
  const zr = SCHV.schvalovaniSeznamRejstrik(rj.zadosti).find(x => x.cast === 'vyjimka');
  test('rejstřík: převod pro záložku — kategorie „čeká", počet položek', !!zr && zr.kategorie === 'ceka' && zr.polozek === 2, zr);
  /* Obchodník si schválení nepodvrhne. */
  const g = await nacti(r1.soubor, cO);
  const a = zk.importZakazka(kopie(g));
  VY.vyjimkaSchval(d0(a), obsah(a), 'Vedoucí (podvrh)');
  const r2 = await uloz(a, cO, g.uloRazitko);
  test('obchodník si schválení nepodvrhne (403)', r2.status === 403 && /nadřízený/.test(r2.chyba || ''), r2);
  /* Vedoucí schválí. */
  const gV = await nacti(r1.soubor, cV);
  const b = zk.importZakazka(kopie(gV));
  VY.vyjimkaSchval(d0(b), obsah(b), 'cokoli', '1999-01-01T00:00:00.000Z');
  d0(b).cenovaVyjimka.obsah = 'podvrh';            // obsah z prohlížeče se nebere — razí ho server
  const r3 = await uloz(b, cV, gV.uloRazitko);
  const vy3 = (r3.slevy || []).map(x => x.cenovaVyjimka).find(Boolean) || {};
  test('vedoucí schválí (200) — jméno, e-mail a čas razí server, žadatel zůstává',
    r3.status === 200 && vy3.stav === VY.VYJ_SCHVALENO && /Ved Výjimka \(Vedoucí\)/.test(vy3.schvalil || '')
    && vy3.schvalilEmail === 'ved.vyjimky@priklad.cz' && vy3.schvalilKdy !== '1999-01-01T00:00:00.000Z'
    && /Obch Výjimka/.test(vy3.pozadal || '') && vy3.obsah === o.obsah, vy3);
  /* Obchodník vytiskne — zámek projde. */
  const g4 = await nacti(r1.soubor, cO);
  const c4 = zk.importZakazka(kopie(g4)); zamkni(c4);
  const r4 = await uloz(c4, cO, g4.uloRazitko);
  test('se schválením: nový zámek obchodníka (200)', r4.status === 200, r4);
  c4.kontakt = (c4.kontakt || '') + ' (poznámka)';   // Z1: název akce je po odeslání zmrazený
  (r4.slevy || []).forEach(x => { const v = c4.varianty.find(y => y.id === x.id); if (v && x.cenovaVyjimka) v.data.cenovaVyjimka = kopie(x.cenovaVyjimka); });
  const r5 = await uloz(c4, cO, r4.razitko);
  test('další uložení z téhož okna po tisku projde (200, ne 409)', r5.status === 200, r5); }
{ /* Změna směsi po schválení schválení zruší. */
  const s = await smesUlozena('změna po schválení');
  const r1 = await uloz(s.a, cO, s.razitko);
  const gV = await nacti(r1.soubor, cV); const b = zk.importZakazka(kopie(gV));
  VY.vyjimkaSchval(d0(b), obsah(b), 'Ved'); const r2 = await uloz(b, cV, gV.uloRazitko);
  test('příprava: vedoucí schválil (200)', r2.status === 200, r2);
  const g = await nacti(r1.soubor, cO); const a = zk.importZakazka(kopie(g));
  d0(a).cenik.nytKc = V2.nytKc;              // další přepočtená položka — jiná směs
  zamkni(a);
  const r3 = await uloz(a, cO, g.uloRazitko);
  test('změna směsi po schválení + zámek → 403 (obsah nesedí)', r3.status === 403 && /směs/.test(r3.chyba || ''), r3);
  const g2 = await nacti(r1.soubor, cO); const a2 = zk.importZakazka(kopie(g2));
  delete d0(a2).cenovaVyjimka;
  const r4 = await uloz(a2, cO, g2.uloRazitko);
  const g3 = await nacti(r1.soubor, cO);
  test('obchodník platné schválení uložením nesmaže (uložená verze ho drží)',
    r4.status === 200 && d0(g3).cenovaVyjimka && d0(g3).cenovaVyjimka.stav === VY.VYJ_SCHVALENO, d0(g3).cenovaVyjimka); }
{ /* Zamítnutí drží. */
  const s = await smesUlozena('zamítnutí');
  const r1 = await uloz(s.a, cO, s.razitko);
  const gV = await nacti(r1.soubor, cV); const b = zk.importZakazka(kopie(gV));
  VY.vyjimkaZamitni(d0(b), obsah(b), 'Ved', null, 'drahé sklo'); const r2 = await uloz(b, cV, gV.uloRazitko);
  test('vedoucí zamítne (200, důvod uložen)', r2.status === 200
    && ((r2.slevy || []).map(x => x.cenovaVyjimka).find(Boolean) || {}).zamitnutoDuvod === 'drahé sklo', r2);
  const g = await nacti(r1.soubor, cO); const a = zk.importZakazka(kopie(g));
  VY.vyjimkaPozadej(d0(a), obsah(a), 'Obch');
  const r3 = await uloz(a, cO, g.uloRazitko);
  const g3 = await nacti(r1.soubor, cO);
  test('obchodník zamítnutí žádostí nepřepíše (vrátí se uložené)', r3.status === 200 && d0(g3).cenovaVyjimka.stav === VY.VYJ_ZAMITNUTO, d0(g3).cenovaVyjimka);
  zamkni(a);
  const r4 = await uloz(a, cO, r3.razitko);
  test('zamítnutá výjimka + zámek → 403 (věta říká „zamítnuta")', r4.status === 403 && /zamítnuta/.test(r4.chyba || ''), r4); }
{ /* Vedoucí bez práva schvalovat. */
  await matice({ 'sleva.schvalovani': { 'Vedoucí': false } });
  const s = await smesUlozena('vedoucí bez práva');
  const r1 = await uloz(s.a, cO, s.razitko);
  const gV = await nacti(r1.soubor, cV); const b = zk.importZakazka(kopie(gV));
  VY.vyjimkaSchval(d0(b), obsah(b), 'Ved'); const r2 = await uloz(b, cV, gV.uloRazitko);
  test('vedoucí bez práva „Schvalování slevy nad strop role" neschválí (403)', r2.status === 403, r2);
  await matice({ 'sleva.schvalovani': { 'Vedoucí': true } }); }
{ /* Role s právem ceníku výjimku nepotřebuje. */
  await matice({ 'sleva.schvalovani': { 'Vedoucí': true }, 'tab.cenik': { 'Vedoucí': true }, 'tab.cenikproj': { 'Vedoucí': true } });
  const s = await smesUlozena('vedoucí s právem ceníku', cV); zamkni(s.a);
  const r = await uloz(s.a, cV, s.razitko);
  test('role s právem obou ceníků — nový zámek směsi bez schválení (200)', r.status === 200, r);
  await matice({ 'sleva.schvalovani': { 'Vedoucí': true } }); }
{ /* Neznámý stav. */
  const z = nova('neznámý stav'); d0(z).cenovaVyjimka = { stav: 'xyz' };
  const r = await uloz(z, cA);
  test('neznámý stav cenové výjimky → 400 (i administrátor)', r.status === 400, r); }
{ /* Klon schválenou výjimku nepřenese. */
  const s = await smesUlozena('klon');
  const r1 = await uloz(s.a, cO, s.razitko);
  const gV = await nacti(r1.soubor, cV); const b = zk.importZakazka(kopie(gV));
  VY.vyjimkaSchval(d0(b), obsah(b), 'Ved'); await uloz(b, cV, gV.uloRazitko);
  const g = await nacti(r1.soubor, cO); const a = zk.importZakazka(kopie(g));
  const kl = zam.klonujVariantu(a, a.varianty[0].id);
  test('klon varianty schválenou výjimku nepřenese', !!kl && !('cenovaVyjimka' in kl.data) && !!a.varianty[0].data.cenovaVyjimka);
  const r2 = await uloz(a, cO, g.uloRazitko);
  test('zakázka s klonem se uloží (200)', r2.status === 200, r2); }

console.log('===== pás opláštění „jiné" pod ceníkovou sazbou =====');
const minSazba = VY.vyjimkyMinSazbaOpl(Object.assign({}, ROZMERY, { typSachty: 'exteriérová' }), platny().cenik);
test('příprava: nejnižší ceníková sazba opláštění exteriéru je kladná', minSazba > 1, minSazba);
{ const z = nova('pás 1 Kč'); pasJine(z, 1); zamkni(z);
  const r = await uloz(z, cO);
  test('pás „jiné" 1 Kč/m² — obchodník, nový zámek bez schválení → 403 se slovem „jiné"', r.status === 403 && /jiné/.test(r.chyba || ''), r); }
{ const z = nova('pás rozpracovaný'); pasJine(z, 1);
  const r = await uloz(z, cO);
  test('pás „jiné" 1 Kč/m² — rozpracované uložení (200)', r.status === 200, r); }
{ const z = nova('pás nad mezí'); pasJine(z, minSazba); zamkni(z);
  const r = await uloz(z, cO);
  test('pás „jiné" se sazbou rovnou nejnižší ceníkové — zámek bez schválení (200)', r.status === 200, r); }
{ const z = nova('pás admin'); pasJine(z, 1); zamkni(z);
  const r = await uloz(z, cA);
  test('pás „jiné" 1 Kč/m² — administrátor, zámek bez schválení (200)', r.status === 200, r); }
{ const z = nova('pás schválení'); pasJine(z, 1);
  const r1 = await uloz(z, cO);
  const gV = await nacti(r1.soubor, cV); const b = zk.importZakazka(kopie(gV));
  VY.vyjimkaSchval(d0(b), obsah(b), 'Ved'); const r2 = await uloz(b, cV, gV.uloRazitko);
  test('pás: vedoucí schválí (200)', r2.status === 200, r2);
  const g = await nacti(r1.soubor, cO); const a = zk.importZakazka(kopie(g));
  d0(a).ock.zadani.oplasteni.steny.A.pasy[0].naklad = 2; zamkni(a);
  const r3 = await uloz(a, cO, g.uloRazitko);
  test('pás: změna sazby po schválení (1 → 2 Kč/m²) + zámek → 403', r3.status === 403, r3);
  const g2 = await nacti(r1.soubor, cO); const a2 = zk.importZakazka(kopie(g2)); zamkni(a2);
  const r4 = await uloz(a2, cO, g2.uloRazitko);
  test('pás: beze změny se schválením — zámek obchodníka (200)', r4.status === 200, r4); }
{ const z = nova('pás + směs'); pasJine(z, 1); d0(z).cenik.profilasKgKc = V1.profilasKgKc;
  const o = obsah(z);
  test('jedno schválení kryje směs i pás (obsah zahrnuje obojí)', o.polozek === 1 && o.pasu === 1
    && o.obsah !== VY.vyjimkyObsah(d0(nova('x')), VY.vyjimkyDnesniZProgramu(platny(), d0(nova('x'))), '').obsah, o); }

console.log('===== B155: rozsah pásu „jiné" ve schválené výjimce =====');
const pripis = (z, typ) => { const v = z.varianty[0];
  v.zamek.tisky = (v.zamek.tisky || []).concat([{ typ, kdy: new Date().toISOString(), kdo: 'x' }]); return z; };
/* Pokus kola 25 na v15.10.13 (podklady/AUDIT25_pokus_B155_rozsah.mjs):
 * schválený úzký pás 0–1 m po schválení roztažený na celou stěnu dostal
 * zámek 200. Pojistka: proti v15.10.14 (1cbab3a) vracely zámky po roztažení
 * a po posunu začátku 200. */
const pasUzky = (z) => { d0(z).ock.zadani.oplasteni = { rezim: 'poStenach', steny: {
  A: { odM: 0, pasy: [{ typ: 'jine', nazev: 'Deska', naklad: 1, doM: 1 }, { typ: 'C.cetrisKc', doM: null }] } } }; };
async function pasSchvaleny(nazev) {
  const z = nova(nazev); pasUzky(z);
  const r1 = await uloz(z, cO);
  const gV = await nacti(r1.soubor, cV); const b = zk.importZakazka(kopie(gV));
  VY.vyjimkaSchval(d0(b), obsah(b), 'Ved'); const r2 = await uloz(b, cV, gV.uloRazitko);
  test('B155 příprava: obchodník uložil pás 0–1 m, vedoucí schválil (200)', r1.status === 200 && r2.status === 200, [r1, r2]);
  return r1.soubor;
}
{ const soubor = await pasSchvaleny('B155 rozsah');
  const vezmi = async () => { const g = await nacti(soubor, cO); return { a: zk.importZakazka(kopie(g)), razitko: g.uloRazitko }; };
  { const { a, razitko } = await vezmi(); const st = d0(a).ock.zadani.oplasteni.steny.A;
    st.pasy = [st.pasy[0]]; st.pasy[0].doM = null;
    test('B155: kategorie po roztažení na celou stěnu = „čeká znovu"', VY.vyjimkaKategorie(d0(a).cenovaVyjimka, obsah(a)) === 'ceka');
    const r = await uloz(zamkni(a), cO, razitko);
    test('B155: schválený pás 0–1 m roztažený na celou stěnu (doM null) + zámek → 403', r.status === 403 && /jiné/.test(r.chyba || ''), r); }
  { const { a, razitko } = await vezmi(); d0(a).ock.zadani.oplasteni.steny.A.pasy[0].doM = 3;
    const r = await uloz(zamkni(a), cO, razitko);
    test('B155: pás 0–1 m posunutý na 0–3 m + zámek → 403', r.status === 403, r); }
  { const { a, razitko } = await vezmi(); d0(a).ock.zadani.oplasteni.steny.A.odM = -1.2;
    const r = await uloz(zamkni(a), cO, razitko);
    test('B155: posun začátku stěny (odM 0 → −1,2 m) + zámek → 403', r.status === 403, r); }
  { const { a, razitko } = await vezmi(); d0(a).ock.zadani.oplasteni.steny.A.pasy[1].doM = 5;
    test('B155: horní mez ceníkového pásu nad ním obsah nemění', obsah(a).obsah === (await vezmi()).a.varianty[0].data.cenovaVyjimka.obsah);
    const st = d0(a).ock.zadani.oplasteni.steny.A; st.pasy[0].doM = '1'; st.odM = '0';
    const r = await uloz(zamkni(a), cO, razitko);
    test('B155: beze změny rozsahu, zápis „1" místo 1 — zámek se schválením (200)', r.status === 200, r); } }
{ /* B153 + B155: pás roztažený po schválení, zámek PROJ pod jenProj
   * (OCK se neposuzuje), vypnutí, dotisk nabídky OCK → 403. */
  const dotisk = async (nazev, roztahni) => {
    const soubor = await pasSchvaleny(nazev);
    const g0 = zk.importZakazka(kopie(await nacti(soubor, cO)));
    if (roztahni) { const st = d0(g0).ock.zadani.oplasteni.steny.A; st.pasy = [st.pasy[0]]; st.pasy[0].doM = null; }
    g0.jenProj = true; zamkni(g0, 'nabidkaProj');
    const r1 = await uloz(g0, cO, (await nacti(soubor, cO)).uloRazitko);
    const g1 = zk.importZakazka(kopie(await nacti(soubor, cO))); g1.jenProj = false;
    const r2 = await uloz(g1, cO, r1.razitko);
    const g2 = await nacti(soubor, cO);
    const r3 = await uloz(pripis(zk.importZakazka(kopie(g2)), 'nabidka'), cO, g2.uloRazitko);
    test('B155 příprava (' + nazev + '): zámek PROJ s jenProj a vypnutí (200)', r1.status === 200 && r2.status === 200, [r1, r2]);
    return r3; };
  const r = await dotisk('B155 dotisk roztažený', true);
  test('B155: dotisk nabídky OCK s pásem roztaženým po schválení → 403', r.status === 403 && /dotisk/.test(r.chyba || ''), r);
  const r0 = await dotisk('B155 dotisk beze změny', false);
  test('B155: dotisk nabídky OCK se schváleným rozsahem (200)', r0.status === 200, r0); }

console.log('===== B178: zdvih a rozměry stěny u schváleného pásu „jiné" =====');
/* Pokus kola 26 na v17.10.1 (podklady/AUDIT26_pokus_B178_vyska.mjs): pás
 * „jiné" až nahoru nad Cetrisem do 11 m (zdvih 9 m = 1,2 m), vedoucí schválí,
 * obchodník zvedne zdvih na 40 m a zamkne → 200 (plocha 26×). Pojistka:
 * proti v17.10.1 (54174ee) vracely zámky po změně zdvihu i hloubky 200. */
{ const pasyVysoko = (z) => { const st = globalThis.oplasteniStenyVychozi(d0(z).ock.zadani, d0(z).cenik);
    st.B = { odM: 0, pasy: [{ typ: 'C.cetrisKc', doM: 11 }, { typ: 'jine', nazev: 'Deska', naklad: 1, doM: null }] };
    d0(z).ock.zadani.oplasteni = { rezim: 'poStenach', steny: st }; };
  const z = nova('B178 výška'); pasyVysoko(z);
  const r1 = await uloz(z, cO);
  const gV = await nacti(r1.soubor, cV); const b = zk.importZakazka(kopie(gV));
  VY.vyjimkaSchval(d0(b), obsah(b), 'Ved'); const r2 = await uloz(b, cV, gV.uloRazitko);
  test('B178 příprava: obchodník uložil pás nahoře, vedoucí schválil (200)', r1.status === 200 && r2.status === 200, [r1, r2]);
  const vezmi = async () => { const g = await nacti(r1.soubor, cO); return { a: zk.importZakazka(kopie(g)), razitko: g.uloRazitko }; };
  { const { a, razitko } = await vezmi(); d0(a).ock.zadani.zdvih = 40;
    test('B178: kategorie po zdvihu 9 → 40 m = „čeká znovu"', VY.vyjimkaKategorie(d0(a).cenovaVyjimka, obsah(a)) === 'ceka');
    const r = await uloz(zamkni(a), cO, razitko);
    test('B178: zdvih 9 → 40 m po schválení + zámek → 403', r.status === 403 && /jiné/.test(r.chyba || ''), r); }
  { const { a, razitko } = await vezmi(); d0(a).ock.zadani.hloubka = 3;
    const r = await uloz(zamkni(a), cO, razitko);
    test('B178: hloubka 1,8 → 3 m (délka stěny B) po schválení + zámek → 403', r.status === 403, r); }
  { const { a, razitko } = await vezmi(); d0(a).ock.zadani.prejezd = 4.5;
    const r = await uloz(zamkni(a), cO, razitko);
    test('B178: přejezd 3,2 → 4,5 m po schválení + zámek → 403', r.status === 403, r); }
  { const { a, razitko } = await vezmi();
    const r = await uloz(zamkni(a), cO, razitko);
    test('B178: beze změny rozměrů — zámek se schválením (200)', r.status === 200, r); } }

console.log('===== B178 zbytek: plocha z jádra v obsahu (v17.10.5) =====');
/* Pojistka: proti v17.10.4 (9bb7caf) vracely zámky po změně zasklení
 * (vnější rozměr stěny) a po přidání nástupišť (světlíky „jiné" u dveří)
 * 200. Od v20.10.5 (B183 volba b) nese obsah plochu na 0,1 m² nahoru —
 * nekrytý nárůst je těsně pod 0,1 m² (do v20.10.4 těsně pod 1 m²). */
{ const zaskl = x => (x === 'na terče' ? 'mezi příčníky' : 'na terče');
  const priprav = async (nazev, uprav) => {
    const z = nova(nazev); uprav(d0(z).ock.zadani, z);
    const r1 = await uloz(z, cO);
    const gV = await nacti(r1.soubor, cV); const b = zk.importZakazka(kopie(gV));
    VY.vyjimkaSchval(d0(b), obsah(b), 'Ved'); const r2 = await uloz(b, cV, gV.uloRazitko);
    const vezmi = async () => { const g = await nacti(r1.soubor, cO); return { a: zk.importZakazka(kopie(g)), razitko: g.uloRazitko }; };
    return { ok: r1.status === 200 && r2.status === 200, vezmi, r: [r1, r2] }; };
  const celaB = (zd, z) => { const st = globalThis.oplasteniStenyVychozi(zd, d0(z).cenik);
    st.B = { odM: 0, pasy: [{ typ: 'jine', nazev: 'Deska', naklad: 1, doM: null }] };
    zd.oplasteni = { rezim: 'poStenach', steny: st }; };
  { const P = await priprav('B178 zasklení', celaB);
    test('B178 zbytek příprava: pás „jiné" přes celou stěnu B schválen (200)', P.ok, P.r);
    const { a, razitko } = await P.vezmi(); const zd = d0(a).ock.zadani; zd.zaskleni = zaskl(zd.zaskleni);
    const r = await uloz(zamkni(a), cO, razitko);
    test('B178 zbytek: změna zasklení (vnější rozměr stěny) po schválení + zámek → 403', r.status === 403 && /jiné/.test(r.chyba || ''), r);
    const b = await P.vezmi(); const rb = await uloz(zamkni(b.a), cO, b.razitko);
    test('B178 zbytek: beze změny — zámek se schválením (200)', rb.status === 200, rb); }
  { const P = await priprav('B178 světlíky', (zd, z) => { zd.nadDvermi = 'material'; zd.nastupiste = 2;
      const st = globalThis.oplasteniStenyVychozi(zd, d0(z).cenik);
      ['B', 'C', 'D'].forEach(k => { st[k] = { odM: 0, pasy: [{ typ: 'jine', nazev: 'Deska', naklad: 1, doM: null }] }; });
      zd.oplasteni = { rezim: 'poStenach', steny: st }; });
    test('B178 zbytek příprava: světlíky z materiálu „jiné" — schváleno (200)', P.ok, P.r);
    const { a, razitko } = await P.vezmi(); d0(a).ock.zadani.nastupiste = 3;
    test('B178 zbytek: obsah nese světlíky „jiné" u dveří', Array.isArray(JSON.parse(obsah(a).obsah).l) && JSON.parse(obsah(a).obsah).l.length > 0, obsah(a).obsah);
    const r = await uloz(zamkni(a), cO, razitko);
    test('B178 zbytek: víc nástupišť (větší světlíky „jiné") po schválení + zámek → 403', r.status === 403, r); }
  { const P = await priprav('B178 drobnost', (zd, z) => { const st = globalThis.oplasteniStenyVychozi(zd, d0(z).cenik);
      st.B = { odM: 0, pasy: [{ typ: 'C.cetrisKc', doM: 11 }, { typ: 'jine', nazev: 'Deska', naklad: 1, doM: null }] };
      zd.oplasteni = { rezim: 'poStenach', steny: st }; });
    const { a, razitko } = await P.vezmi(); const zd = d0(a).ock.zadani; zd.zaskleni = zaskl(zd.zaskleni);
    const r = await uloz(zamkni(a), cO, razitko);
    test('B183: změna zasklení u pásu 1,2 m (posun o desetiny m²) — dřív platilo, od v20.10.5 → 403', P.ok && r.status === 403, r); } }

console.log('===== B183: plocha na 0,1 m², dřív schválené výjimky platí starým tvarem (v20.10.5) =====');
/* Pojistka: proti v20.10.1 (5dc28d1) spadne zasklení u pásu 1,2 m (200),
 * značka tvaru v obsahu i zámek se záznamem starého tvaru (obsah na celé
 * m² bez značky, jak ho server razil do v20.10.4 — tady přepsaný přímo
 * v úložišti): starý kód obsah starého tvaru nezná a vrátí 403. */
{ const prepisUlozene = (cislo, fn) => { let n = 0;
    for (const [k, v] of pamet) { let x; try { x = JSON.parse(v); } catch (e) { continue; }
      if (!x || x.cislo !== cislo || !Array.isArray(x.varianty)) continue;
      fn(x.varianty[0].data); pamet.set(k, JSON.stringify(x)); n++; }
    return n; };
  const celaA = (z) => { const st = globalThis.oplasteniStenyVychozi(d0(z).ock.zadani, d0(z).cenik);
    st.A = { odM: 0, pasy: [{ typ: 'jine', nazev: 'Deska', naklad: 1, doM: null }] };
    d0(z).ock.zadani.oplasteni = { rezim: 'poStenach', steny: st }; };
  const schvalena = async (nazev) => {
    const z = nova(nazev); celaA(z); const r1 = await uloz(z, cO);
    const gV = await nacti(r1.soubor, cV); const b = zk.importZakazka(kopie(gV));
    VY.vyjimkaSchval(d0(b), obsah(b), 'Ved'); const r2 = await uloz(b, cV, gV.uloRazitko);
    const g = await nacti(r1.soubor, cO);
    return { ok: r1.status === 200 && r2.status === 200, soubor: r1.soubor, cislo: z.cislo, g, r: [r1, r2] }; };
  { const S = await schvalena('B183 nový tvar');
    const rec = d0(S.g).cenovaVyjimka || {};
    test('B183: server razí obsah se značkou tvaru v=2 a plochou na 0,1 m²', S.ok && rec.stav === VY.VYJ_SCHVALENO
      && JSON.parse(rec.obsah).v === VY.VYJ_OBSAH_TVAR && JSON.parse(rec.obsah).p.every(p => Math.round(p[7] * 10) === p[7] * 10), [S.r, rec.obsah]);
    /* Obchodník si schválení „starým tvarem" sám nepřepíše (podvrh). */
    const a = zk.importZakazka(kopie(S.g)); d0(a).cenovaVyjimka.obsah = obsah(a).obsahStary;
    const r = await uloz(zamkni(a), cO, S.g.uloRazitko);
    test('B183: obchodník přepíše schválení na starý tvar sám → 403', r.status === 403, r); }
  { const S = await schvalena('B183 starý tvar');
    const a0 = zk.importZakazka(kopie(S.g)); const st = obsah(a0).obsahStary;
    const n = prepisUlozene(S.cislo, d => { d.cenovaVyjimka.obsah = st; });
    const g = await nacti(S.soubor, cO); const a = zk.importZakazka(kopie(g));
    test('B183 příprava: uložené schválení přepsané na starý tvar (celé m², bez značky)', S.ok && n === 1
      && d0(a).cenovaVyjimka.obsah === st && !('v' in JSON.parse(st)), [S.r, n]);
    const rs = await uloz(kopie(a), cO, g.uloRazitko);
    const g2 = await nacti(S.soubor, cO);
    test('B183: rozpracované uložení obchodníkem dřív schválenou výjimku nechá (stav i starý obsah)', rs.status === 200
      && d0(g2).cenovaVyjimka.stav === VY.VYJ_SCHVALENO && d0(g2).cenovaVyjimka.obsah === st, [rs, d0(g2).cenovaVyjimka]);
    const c = zk.importZakazka(kopie(g2)); VY.vyjimkaVrat(d0(c), obsah(c));
    const rc = await uloz(c, cO, g2.uloRazitko);
    const g3 = await nacti(S.soubor, cO);
    test('B183: obchodník pošle „čeká" s novým obsahem — server vrátí dřív schválenou (B101)', rc.status === 200
      && d0(g3).cenovaVyjimka.stav === VY.VYJ_SCHVALENO && d0(g3).cenovaVyjimka.obsah === st, [rc, d0(g3).cenovaVyjimka]);
    const r = await uloz(zamkni(zk.importZakazka(kopie(g3))), cO, g3.uloRazitko);
    test('B183: dřív schválená výjimka (starý tvar) beze změny — zámek obchodníkem 200', r.status === 200, r); }
  { const S = await schvalena('B183 starý tvar změna');
    const a0 = zk.importZakazka(kopie(S.g)); const st = obsah(a0).obsahStary;
    prepisUlozene(S.cislo, d => { d.cenovaVyjimka.obsah = st; });
    const g = await nacti(S.soubor, cO); const a = zk.importZakazka(kopie(g));
    d0(a).ock.zadani.oplasteni.steny.A.pasy[0].naklad = 0.5;
    const r = await uloz(zamkni(a), cO, g.uloRazitko);
    test('B183: dřív schválená výjimka po změně sazby pásu — zámek → 403', r.status === 403, r); } }

console.log('===== B153: dotisk strany vyřazené při zámku (jenProj → vypnutí → dotisk OCK) =====');
/* Pokus auditu 15. 10. 2026 (podklady/AUDIT25_pokus_B153_dotisk.mjs). Zakázka
 * „jen projekce": zámek nabídky PROJ posoudí jen PROJ; vypnutí jenProj
 * zámek nemění; dotisk nabídky OCK pak nesmí obejít výjimku ani marži. */
async function jenProjZamekVypnuti(nazev, priprav) {
  const s = await smesUlozena(nazev);
  d0(s.a).proj.cenik = kopie(platny().cenikProj);        // PROJ podle platného — zámek PROJ výjimku nepotřebuje
  let razitko = s.razitko;
  if (priprav) razitko = await priprav(s, razitko);
  const g0 = zk.importZakazka(kopie(await nacti(s.soubor, cO)));
  g0.jenProj = true; d0(g0).proj.cenik = kopie(platny().cenikProj);
  if (!priprav) d0(g0).cenik.montazHodKc = V2.montazHodKc;
  zamkni(g0, 'nabidkaProj');
  const r1 = await uloz(g0, cO, razitko);
  const g1 = zk.importZakazka(kopie(await nacti(s.soubor, cO))); g1.jenProj = false;
  const r2 = await uloz(g1, cO, r1.razitko);
  const g2raw = await nacti(s.soubor, cO);
  return { r1, r2, h: pripis(zk.importZakazka(kopie(g2raw)), 'nabidka'), razitko: g2raw.uloRazitko, soubor: s.soubor };
}
{ const x = await jenProjZamekVypnuti('B153 bez schválení');
  test('B153 příprava: zámek PROJ s jenProj (200) a vypnutí jenProj (200)', x.r1.status === 200 && x.r2.status === 200, [x.r1, x.r2]);
  const r3 = await uloz(x.h, cO, x.razitko);
  test('B153: dotisk nabídky OCK se směsí bez schválení → 403 (výjimka)', r3.status === 403 && /směs/.test(r3.chyba || '') && /dotisk/.test(r3.chyba || ''), r3);
  const g = await nacti(x.soubor, cO);
  test('B153: dotisk se nezapsal (tisky beze změny)', (g.varianty[0].zamek.tisky || []).every(t => t.typ !== 'nabidka'), g.varianty[0].zamek.tisky);
  const xA = zk.importZakazka(kopie(g)); pripis(xA, 'nabidka');
  const r5 = await uloz(xA, cA, g.uloRazitko);
  test('B153: administrátor dotiskne OCK i bez schválení (200)', r5.status === 200, r5); }
{ /* Schválení celé směsi před zámkem (jenProj vypnuté) → dotisk projde. */
  const x = await jenProjZamekVypnuti('B153 se schválením', async (s, razitko) => {
    const r = await uloz(s.a, cO, razitko);
    const gV = await nacti(s.soubor, cV); const b = zk.importZakazka(kopie(gV));
    VY.vyjimkaSchval(d0(b), obsah(b), 'Ved'); const r2 = await uloz(b, cV, gV.uloRazitko);
    test('B153 příprava: vedoucí schválil směs OCK (200)', r.status === 200 && r2.status === 200, [r, r2]);
    return r2.razitko; });
  test('B153 příprava: zámek PROJ a vypnutí jenProj (200)', x.r1.status === 200 && x.r2.status === 200, [x.r1, x.r2]);
  const r3 = await uloz(x.h, cO, x.razitko);
  test('B153: dotisk nabídky OCK se schválenou směsí (200)', r3.status === 200, r3); }
{ /* Marže: sleva OCK zadaná pod jenProj se neposuzovala. */
  const NAST95 = Object.assign({}, NASTSL, { minMarze: 0.95 });
  const V3 = kopie(V2); V3.nytKc += 1;                   // zveřejnit jde jen změněný ceník
  const r0 = await (await post(program, 'http://x/api/program', { cenik: V3, cenikProj: V2P, slevy: NAST95, poznamka: 'minimum marže' }, cA)).json();
  test('B153 příprava: zveřejněno minimum marže', !!r0.ok, r0);
  const z = nova('B153 marže'); z.jenProj = true;
  d0(z).sleva = { procenta: 4, stav: 'schváleno automaticky', role: 'Obchodník' };
  zamkni(z, 'nabidkaProj');
  const r1 = await uloz(z, cO);
  const g1 = zk.importZakazka(kopie(await nacti(r1.soubor, cO))); g1.jenProj = false;
  const r2 = await uloz(g1, cO, r1.razitko);
  test('B153 příprava: zámek PROJ se slevou OCK pod jenProj (200), vypnutí (200)', r1.status === 200 && r2.status === 200
    && slevaPlatiT(d0(g1).sleva), [r1, r2, d0(g1).sleva]);
  const g2 = await nacti(r1.soubor, cO);
  const r3 = await uloz(pripis(zk.importZakazka(kopie(g2)), 'nabidka'), cO, g2.uloRazitko);
  test('B153: dotisk nabídky OCK se slevou pod minimální marží → 403', r3.status === 403 && /marž/.test(r3.chyba || ''), r3);
  await zverejni(V2, V2P, 'výjimky V2 bez minima'); }

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
