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
 * razítka a otisk píše server, změna směsi nebo sazby po schválení
 * schválení zruší (otisk). Administrátor a role s právem ceníku výjimku
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
const matice = async (m) => { const r = await post(zobrazeni, 'http://x/api/zobrazeni', { matice: m }, cA); if (r.status !== 200) throw new Error('matice ' + r.status); };
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
const obsah = (z) => VY.vyjimkyObsah(d0(z), VY.vyjimkyDnesniZProgramu(platny(), d0(z)), zk.zakazkaVyrazenaStrana(z) || '');
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
  test('žádost obchodníka uložena (200), server orazítkoval žadatele a otisk',
    r1.status === 200 && vy1.stav === VY.VYJ_CEKA && /Obch Výjimka/.test(vy1.pozadal || '') && vy1.otisk === o.otisk
    && vy1.pozadalKdy !== '2000-01-01T00:00:00.000Z', vy1);
  /* Rejstřík napříč zakázkami: výjimka bez cen a bez otisku. */
  const rj = await (await get(schvalovani, 'http://x/api/schvalovani', cV)).json();
  const zad = (rj.zadosti || []).find(x => x.cast === 'vyjimka' && x.cislo === s.a.cislo);
  test('rejstřík: čekající výjimka je v přehledu (počet položek, bez otisku a hodnot)',
    !!zad && zad.vyjimka.polozek === 2 && !('otisk' in zad.vyjimka) && !JSON.stringify(zad).includes(String(V1.profilasKgKc)), zad);
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
  d0(b).cenovaVyjimka.otisk = 'podvrh';            // otisk z prohlížeče se nebere — razí ho server
  const r3 = await uloz(b, cV, gV.uloRazitko);
  const vy3 = (r3.slevy || []).map(x => x.cenovaVyjimka).find(Boolean) || {};
  test('vedoucí schválí (200) — jméno, e-mail a čas razí server, žadatel zůstává',
    r3.status === 200 && vy3.stav === VY.VYJ_SCHVALENO && /Ved Výjimka \(Vedoucí\)/.test(vy3.schvalil || '')
    && vy3.schvalilEmail === 'ved.vyjimky@priklad.cz' && vy3.schvalilKdy !== '1999-01-01T00:00:00.000Z'
    && /Obch Výjimka/.test(vy3.pozadal || '') && vy3.otisk === o.otisk, vy3);
  /* Obchodník vytiskne — zámek projde. */
  const g4 = await nacti(r1.soubor, cO);
  const c4 = zk.importZakazka(kopie(g4)); zamkni(c4);
  const r4 = await uloz(c4, cO, g4.uloRazitko);
  test('se schválením: nový zámek obchodníka (200)', r4.status === 200, r4);
  c4.nazevAkce += ' (poznámka)';
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
  test('změna směsi po schválení + zámek → 403 (otisk nesedí)', r3.status === 403 && /směs/.test(r3.chyba || ''), r3);
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
  test('jedno schválení kryje směs i pás (otisk zahrnuje obojí)', o.polozek === 1 && o.pasu === 1
    && o.otisk !== VY.vyjimkyObsah(d0(nova('x')), VY.vyjimkyDnesniZProgramu(platny(), d0(nova('x'))), '').otisk, o); }

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
