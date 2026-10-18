/* POKUS AUDITU KOLA 26 (17. 10. 2026) k nálezu B178 — viz podklady/AUDIT_2026-10-17_v16.10.5.md.
 * Jen čte: paměťové úložiště, zkušební ceník, smyšlené údaje. Úvod převzatý
 * z podklady/AUDIT25_pokus_B155_rozsah.mjs (jeho kontroly se vypíšou jako OK).
 * Spuštění: node podklady/AUDIT26_pokus_B178_vyska.mjs */
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
const obsah = (z) => VY.vyjimkyObsah(d0(z), VY.vyjimkyDnesniZProgramu(platny(), d0(z)), zk.zakazkaVyrazenaStrana(z) || '');
const pasJine = (z, sazba) => { d0(z).ock.zadani.oplasteni = { rezim: 'poStenach', steny: { A: { odM: 0, pasy: [{ typ: 'jine', nazev: 'Deska', naklad: sazba, doM: null }] } } }; };
/* Úprava S11 (16. 10. 2026): jediný pás je vždy poslední a jádro jeho doM
 * nečte (sahá až nahoru tak jako tak) — reálný úzký pás je 0–1 m s ceníkovým
 * pásem nad ním; roztažení = ceníkový pás pryč, „jiné" až nahoru. */

/* ---------- POKUS B178: výška šachty roztáhne schválený pás „až nahoru" ----------
 * Pás „jiné" pod ceníkovou sazbou je POSLEDNÍ (doM null = až nahoru) nad
 * ceníkovým pásem do 11 m. Při zdvihu 9 m + přejezdu 3,2 m je úzký (1,2 m).
 * Vedoucí ho schválí, obchodník pak zvedne zdvih na 40 m a zamkne (tisk). */
const celkem = (z) => { const r = zam.zamekVysledekSpocti(z.varianty[0], JEKLY, 'x');
  return r && r.ock && r.ock.souhrn ? Math.round(r.ock.souhrn.zakladCena) : NaN; };
/* Stěny jako výchozí návrh aplikace, boční stěna B: Cetris do 11 m, nad ní „jiné". */
const pasyVysoko = (z) => { const st = globalThis.oplasteniStenyVychozi(d0(z).ock.zadani, d0(z).cenik);
  st.B = { odM: 0, pasy: [{ typ: 'C.cetrisKc', doM: 11 }, { typ: 'jine', nazev: 'Deska', naklad: 1, doM: null }] };
  d0(z).ock.zadani.oplasteni = { rezim: 'poStenach', steny: st }; };
/* Plocha levného pásu (m²) z výpočtu jádra. */
const plocha = (z) => { const r = globalThis.vypocet(d0(z).ock.zadani, d0(z).cenik, JEKLY, d0(z).ock.fixes);
  const m = JSON.stringify(r.sekce).match(/"nazev":"OPLÁŠTĚNÍ - DESKA"[^{}]*?"mnozstvi":(-?[0-9.]+)/); return m ? +(+m[1]).toFixed(2) : NaN; };
{
  const z = nova('B178 výška'); pasyVysoko(z);
  const r1 = await uloz(z, cO);
  test('příprava: obchodník uloží zakázku s levným pásem nahoře (200)', r1.status === 200, r1);
  const gV = await nacti(r1.soubor, cV); const b = zk.importZakazka(kopie(gV));
  const o1 = obsah(b);
  VY.vyjimkaSchval(d0(b), o1, 'Ved'); const r2 = await uloz(b, cV, gV.uloRazitko);
  test('příprava: vedoucí výjimku schválí (200)', r2.status === 200, r2);
  const g = await nacti(r1.soubor, cO); const a = zk.importZakazka(kopie(g));
  const pred = celkem(a), plPred = plocha(a);
  d0(a).ock.zadani.zdvih = 40;
  const o2 = obsah(a);
  const po = celkem(a), plPo = plocha(a);
  console.log('plocha levného pásu: zdvih 9 m', plPred, 'm² → zdvih 40 m', plPo, 'm²');
  test('B178: plocha levného pásu vzrostla víc než desetkrát', plPo > 10 * plPred, [plPred, plPo]);
  console.log('obsah před', o1.obsah, '\nobsah po  ', o2.obsah, '\nshoda', o1.obsah === o2.obsah);
  console.log('cena OCK bez DPH (zkušební ceník): zdvih 9 m', pred, '→ zdvih 40 m', po);
  test('B178: zdvih 9 → 40 m nemění obsah výjimky (schválení platí dál)', o1.obsah === o2.obsah, [o1.obsah, o2.obsah]);
  test('B178: schválení po změně zdvihu platí (vyjimkaPlati)', VY.vyjimkaPlati(d0(a).cenovaVyjimka, o2), d0(a).cenovaVyjimka);
  zamkni(a);
  const r3 = await uloz(a, cO, g.uloRazitko);
  test('B178: obchodník zamkne (tisk) se zdvihem 40 m bez nového schválení → 200', r3.status === 200, r3);
}
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
