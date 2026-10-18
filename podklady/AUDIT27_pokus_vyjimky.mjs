/* POKUS AUDITU KOLA 27 (18. 10. 2026) — cenové výjimky v17.10.5 (B165, B178): obcházení
 * plochy, zaokrouhlení, souběh, únik sazeb, XSS. Viz podklady/AUDIT_2026-10-18_v17.10.5.md.
 * Jen čte: paměťové úložiště, zkušební ceník, smyšlené údaje. Úvod z AUDIT26_pokus_B178_vyska.mjs.
 * Spuštění: node podklady/AUDIT27_pokus_vyjimky.mjs */
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
const pasJine = (z, sazba) => { d0(z).ock.zadani.oplasteni = { rezim: 'poStenach', steny: { A: { odM: 0, pasy: [{ typ: 'jine', nazev: 'Deska', naklad: sazba, doM: null }] } } }; };
/* Úprava S11 (16. 10. 2026): jediný pás je vždy poslední a jádro jeho doM
 * nečte (sahá až nahoru tak jako tak) — reálný úzký pás je 0–1 m s ceníkovým
 * pásem nad ním; roztažení = ceníkový pás pryč, „jiné" až nahoru. */


/* ================= POKUSY KOLA 27 (v17.10.5) =================
 * Obsah tak, jak ho od v17.10.5 počítá prohlížeč i server (s katalogem JEKLY). */
const obsahJ = (z) => VY.vyjimkyObsah(d0(z), VY.vyjimkyDnesniZProgramu(platny(), d0(z)), zk.zakazkaVyrazenaStrana(z) || '', JEKLY);
const pasyVysoko = (z) => { const st = globalThis.oplasteniStenyVychozi(d0(z).ock.zadani, d0(z).cenik);
  st.B = { odM: 0, pasy: [{ typ: 'C.cetrisKc', doM: 2 }, { typ: 'jine', nazev: 'Deska', naklad: 1, doM: null }] };
  d0(z).ock.zadani.oplasteni = { rezim: 'poStenach', steny: st }; };
const pasM2 = (z) => { const r = globalThis.vypocet(d0(z).ock.zadani, d0(z).cenik, JEKLY, d0(z).ock.fixes);
  const p = r.oplasteni.pasy.find(x => x.typ === 'jine'); return p ? +p.m2 : NaN; };
const cenaOck = (z) => { const r = globalThis.vypocet(d0(z).ock.zadani, d0(z).cenik, JEKLY, d0(z).ock.fixes); return r.souhrn.zakladCena; };
async function schvalena(nazev) {
  const z = nova(nazev); pasyVysoko(z);
  const r1 = await uloz(z, cO);
  const gV = await nacti(r1.soubor, cV); const b = zk.importZakazka(kopie(gV));
  VY.vyjimkaSchval(d0(b), obsahJ(b), 'Ved'); const r2 = await uloz(b, cV, gV.uloRazitko);
  if (r1.status !== 200 || r2.status !== 200) throw new Error('příprava ' + JSON.stringify([r1, r2]));
  const g = await nacti(r1.soubor, cO);
  return { a: zk.importZakazka(kopie(g)), g, soubor: r1.soubor };
}

/* P1 — regrese B178: zdvih 9 → 40 m po schválení. */
{
  const { a, g } = await schvalena('K27 P1');
  const o1 = obsahJ(a);
  test('P1 příprava: schválení platí', VY.vyjimkaPlati(d0(a).cenovaVyjimka, o1));
  d0(a).ock.zadani.zdvih = 40;
  const o2 = obsahJ(a);
  test('P1 B178: zdvih 40 m změní obsah', o1.obsah !== o2.obsah);
  zamkni(a);
  const r = await uloz(a, cO, g.uloRazitko);
  test('P1 B178: zámek po změně zdvihu → 403', r.status === 403, r);
}

/* P2 — zaokrouhlení plochy na celé m²: změny profilu příčníku a způsobu
 * zasklení posouvají vnější rozměr stěny; hledá se největší nárůst plochy
 * levného pásu, při kterém obsah zůstane stejný (schválení platí). */
{
  const { a, g } = await schvalena('K27 P2');
  const zad = d0(a).ock.zadani;
  const o1 = obsahJ(a), m0 = pasM2(a);
  const profily = [];
  Object.keys(JEKLY).forEach(dim => Object.keys((JEKLY[dim] && JEKLY[dim].kg) || {}).forEach(tl => profily.push({ dim, tl: +tl })));
  let nej = { d: 0 };
  for (const zask of ['na terče', 'mezi příčníky', zad.zaskleni]) for (const p of profily) {
    const k = kopie(a); const zz = d0(k).ock.zadani;
    zz.zaskleni = zask; zz.profily = Object.assign({}, zz.profily || {}, { precnikBok: p });
    let m; try { m = pasM2(k); } catch (e) { continue; }
    if (!isFinite(m)) continue;
    if (globalThis.profilyNezname(zz, JEKLY).length) continue;
    if (obsahJ(k).obsah === o1.obsah && m - m0 > nej.d) nej = { d: m - m0, m, p: p.dim + '/' + p.tl, po: p, zask };
  }
  console.log('P2 výchozí plocha', m0.toFixed(3), 'm²; největší nárůst se stejným obsahem', nej.d.toFixed(3), 'm²', nej.p || '', nej.zask || '');
  test('P2 info: nárůst plochy se stejným obsahem je menší než 1 m² (mez zaokrouhlení)', nej.d < 1, nej);
  /* Přímý důkaz meze ±0,5 m² vs. < 1 m²: plocha schválená těsně nad x,5
   * a později těsně pod (x+1),5 dá týž obsah (Math.round). */
  const r = x => Math.round(x);
  test('P2 B183: 2,50 m² a 3,49 m² dají v obsahu totéž (rozdíl 0,99 m², ne 0,5)', r(2.50) === r(3.49));
  if (nej.p) {
    const k = kopie(a); d0(k).ock.zadani.zaskleni = nej.zask;
    d0(k).ock.zadani.profily = Object.assign({}, d0(k).ock.zadani.profily || {}, { precnikBok: nej.po });
    zamkni(k);
    const rr = await uloz(k, cO, g.uloRazitko);
    console.log('P2 zámek se změněným profilem (bez nového schválení):', rr.status, rr.chyba || '');
  }
}

/* P3 — ruční množství řádku levného pásu (mnozstviPrepis) obsah nemění.
 * Obchodník bez práva sloupce.naklad ho uložit nesmí (B112); role s ním
 * přepíše i cenu kterékoli položky, výjimka ji neomezuje. */
{
  const { a, g } = await schvalena('K27 P3');
  const o1 = obsahJ(a), c1 = cenaOck(a);
  const r0 = globalThis.vypocet(d0(a).ock.zadani, d0(a).cenik, JEKLY, d0(a).ock.fixes);
  const radek = JSON.stringify(r0.sekce).match(/"nazev":"(OPLÁŠTĚNÍ - DESKA)"/);
  d0(a).ock.zadani.mnozstviPrepis = Object.assign({}, d0(a).ock.zadani.mnozstviPrepis, { 'OPLÁŠTĚNÍ - DESKA': 500 });
  const o2 = obsahJ(a), c2 = cenaOck(a);
  console.log('P3 řádek nalezen:', !!radek, '; cena OCK (zkušební ceník) poměr po/před', (c2 / c1).toFixed(3));
  test('P3 info: ruční množství řádku pásu obsah výjimky nemění', o1.obsah === o2.obsah);
  zamkni(a);
  const r = await uloz(a, cO, g.uloRazitko);
  test('P3: obchodník bez sloupce.naklad ruční množství neuloží (403)', r.status === 403, r);
}

/* P4 — zdvih jako text („9"): jádro sčítá z.zdvih + z.prejezd bez převodu. */
{
  const z = nova('K27 P4'); pasyVysoko(z);
  d0(z).ock.zadani.zdvih = '9';
  const r = await uloz(z, cO);
  console.log('P4 rozpracované uložení se zdvihem „9" (text):', r.status, '; cena jádra', cenaOck(z));
  const g = await nacti(r.soubor, cO); const a = zk.importZakazka(kopie(g));
  test('P4: import nechá zdvih textem (jádro sčítá řetězce)', typeof d0(a).ock.zadani.zdvih === 'string');
  zamkni(a);
  const rz = await uloz(a, cO, g.uloRazitko);
  test('P4: zámek (tisk) varianty se zdvihem textem a cenou NaN → odmítnut', rz.status === 400 || rz.status === 403, rz);
}

/* P5 — souběh: vedoucí schvaluje starou verzi, obchodník mezitím změní zdvih
 * a uloží; schválení z prohlížeče vedoucího nese razítko starší verze. */
{
  const z = nova('K27 P5'); pasyVysoko(z);
  const r1 = await uloz(z, cO);
  const gV = await nacti(r1.soubor, cV); const b = zk.importZakazka(kopie(gV));
  const g = await nacti(r1.soubor, cO); const a = zk.importZakazka(kopie(g));
  d0(a).ock.zadani.zdvih = 40;
  const ra = await uloz(a, cO, g.uloRazitko);
  VY.vyjimkaSchval(d0(b), obsahJ(b), 'Ved'); const rb = await uloz(b, cV, gV.uloRazitko);
  test('P5 příprava: obchodník uloží změnu (200)', ra.status === 200, ra);
  test('P5: schválení nad starší verzí odmítnuto (409)', rb.status === 409, rb);
  /* Vedoucí obejde razítko: vezme obchodníkovu verzi a vloží do ní STARÉ schválení. */
  const g2 = await nacti(r1.soubor, cV); const c = zk.importZakazka(kopie(g2));
  d0(c).cenovaVyjimka = kopie(d0(b).cenovaVyjimka);
  const rc = await uloz(c, cV, g2.uloRazitko);
  const g3 = await nacti(r1.soubor, cO); const e = zk.importZakazka(kopie(g3));
  /* Vedoucí smí rozhodnout: server bere uložení jako NOVÉ schválení a obsah
   * dopočítá sám z aktuálních dat (nevěří obsahu z prohlížeče). */
  test('P5: server přepíše obsah schválení na aktuální (nevěří klientovi)', rc.status === 200 && d0(e).cenovaVyjimka && d0(e).cenovaVyjimka.obsah === obsahJ(e).obsah, [rc.status, d0(e).cenovaVyjimka]);
  /* Obchodník totéž udělat nesmí. */
  const g4 = await nacti(r1.soubor, cO); const f = zk.importZakazka(kopie(g4));
  d0(f).ock.zadani.zdvih = 41; d0(f).cenovaVyjimka = kopie(d0(e).cenovaVyjimka);
  zamkni(f);
  const rf = await uloz(f, cO, g4.uloRazitko);
  test('P5: obchodník se starým schválením na zdvihu 41 m zamkne → 403', rf.status === 403, rf);
}

/* P6 — únik sazeb přes API: co obchodník dostane z /api/program (B88, čtecí
 * strana). Karta B165 čísla skrývá jen v zobrazení. */
{
  const r = await get(program, 'http://x/api/program', cO);
  const t = await r.json();
  const maCenik = !!(t && t.db && t.db.platny && t.db.platny.cenik);
  console.log('P6 /api/program pro obchodníka:', r.status, 'ceník v odpovědi:', maCenik);
  test('P6 info: obchodník platný ceník z API dostane (B88, výpočet v prohlížeči)', r.status === 200 && maCenik, t && Object.keys(t));
}

/* P7 — XSS v kartě: název pásu a hodnota textové položky jdou přes esc(). */
{
  const z = nova('K27 P7'); pasyVysoko(z);
  d0(z).ock.zadani.oplasteni.steny.B.pasy[1].nazev = '<img src=x onerror=alert(1)>';
  const o = obsahJ(z);
  const d = VY.vyjimkyDopad(d0(z), o, VY.vyjimkyDnesniZProgramu(platny(), d0(z)), JEKLY);
  test('P7: dopad pásu se spočítá (číslo)', d.pasy.length === 1 && typeof d.pasy[0].dopadKc === 'number', d.pasy);
  test('P7: text dopadu je jen čísla a znaky', /^[-+−0-9 ,.%()Kč  ]*$/.test(VY.vyjimkyDopadText(d.pasy[0])), VY.vyjimkyDopadText(d.pasy[0]));
}
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
