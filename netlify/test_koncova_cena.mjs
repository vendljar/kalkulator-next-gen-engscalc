/* #398 „KONCOVÁ CENA 2" — B133–B137, B145 (audit 12. 10. 2026).
 *
 * Pět vysokých nálezů z 22. kola, každý potvrzený dvěma nezávislými pokusy
 * nad paměťovým úložištěm: server uložil NOVÝ ZÁMEK odeslané nabídky se
 * sníženou cenou, bez slevy a mimo schvalování, s razítkem „shoda" —
 * protože cenu přepočítal týmž jádrem z týchž zmanipulovaných dat.
 *   B134 záporné procentní rezervy (−0,999 → −99,9 %), i v běžném UI;
 *   B133 dvoukrok přes ceník sestavení (OCK −55,7 %, PROJ přes klon −64,6 %);
 *   B135 číslo v ceníku varianty jako text s čárkou („100,0" = NaN → 0);
 *   B136 volný klíč ceníku (jenZahr, popisyJazyky, rada) obešel #395 V3;
 *   B137 rozměry šachty ≤ 0 hlídala jen zábrana v prohlížeči;
 *   B145 přepis „12,5" (jádro čte NaN) — nízká, jen administrátor.
 *
 * Pojistka proti prázdnému testu: proti kódu před opravou (v12.10.2,
 * d562da1) útoky vracejí 200; legitimní toky (zámek z platného ceníku,
 * rozpracovaná zakázka s nulovými rozměry, ceník sestavení celý, přechod
 * na celou zveřejněnou verzi, klon) musejí projít před opravou i po ní.
 *
 * Paměťové úložiště, zkušební ceník. Spuštění: node netlify/test_koncova_cena.mjs */
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
const rp = await (await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(), slevy: NASTSL, poznamka: '#398' }, cA)).json();
if (!rp.ok) throw new Error('program ' + JSON.stringify(rp));
const x0 = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'obch.koncova@priklad.cz', jmeno: 'Obch Koncová', role: 'Obchodník', heslo: 'Heslo12345x' }, cA)).json();
if (!x0.ok) throw new Error('uzivatel ' + JSON.stringify(x0));
const cO = await prihlas('obch.koncova@priklad.cz', 'Heslo12345x');

/* Platný ceník tak, jak ho aplikace dává nové zakázce (z úložiště). */
const platny = () => JSON.parse(pamet.get('program/db')).platny;
const ROZMERY = { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 };
let n = 9800;   // vlastní rozsah 9800–9899
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
  zam.zamkniVariantu(v, { typ: typ || 'nabidka', kdy: new Date().toISOString(), kdo: 'Test 398',
    cislo: zam.variantaCislo(z, v), vysledek: zam.zamekVysledekSpocti(v, JEKLY, 'v-398') });
  return z; };
const vlastniOck = (z, cena) => { const zd = d0(z).ock.zadani;
  zd.vlastniPolozky = Object.assign({}, zd.vlastniPolozky, { hrubaOck: [{ nazev: 'Vlastní 398', mnozstvi: 1, cena }] }); };
const vlastniProj = (z, cena) => d0(z).proj.zadani.sekce.find(s => s.key === 'studie').polozky
  .push({ nazev: 'Vlastní fix 398', typ: 'fix', cena, vlastni: true });
const cenaOck = (v) => { try { return globalThis.vypocet(v.data.ock.zadani, v.data.cenik, JEKLY, {}).souhrn.zakladCena; } catch (e) { return 'výjimka'; } };
/* Uloží `priprava` (cookie `kdoPriprava`), načte, provede `zmena` a uloží znovu. */
async function dvakrat(priprava, zmena, cookie, kdoPriprava) {
  const r = await uloz(priprava, kdoPriprava || cookie);
  if (r.status !== 200) return { status: 'příprava ' + r.status, chyba: r.chyba };
  const g = await nacti(r.soubor, cookie);
  const a = zk.importZakazka(kopie(g));
  zmena(a);
  return uloz(a, cookie, g.uloRazitko);
}
const je4xx = (r) => r.status === 400 || r.status === 403;

console.log('===== B134: záporné procentní rezervy a další vstupy jádra =====');
{
  const z = nova('B134 útok'); const pred = cenaOck(z.varianty[0]);
  d0(z).ock.zadani.rezervaZakladPct = -0.999; const po = cenaOck(z.varianty[0]);
  zamkni(z);
  const r = await uloz(z, cO);
  test('B134: obchodník — rezervaZakladPct −0,999 + nový zámek → 400 (cena OCK ' + pred + ' → ' + po + ')',
    r.status === 400 && /rezervaZakladPct/.test(r.chyba || ''), r);
}
for (const k of ['rezervaProfilyPct', 'rezervaPlechyPct', 'rezervaPriplatkyPct', 'rezervaZakladPct']) {
  const z = nova('B134 ' + k); d0(z).ock.zadani[k] = -0.5;
  const r = await uloz(z, cO);
  test('B134: obchodník — ' + k + ' −0,5 (bez zámku) → 400', r.status === 400 && new RegExp(k).test(r.chyba || ''), r);
}
for (const k of ['oplechOstatniKg', 'oplechOstatniHod', 'engineeringKs']) {
  const z = nova('B134 ' + k); d0(z).ock.zadani[k] = -1;
  const r = await uloz(z, cO);
  test('B134: obchodník — ' + k + ' −1 → 400', r.status === 400 && new RegExp(k).test(r.chyba || ''), r);
}
{ const z = nova('B134 admin'); d0(z).ock.zadani.rezervaZakladPct = -0.999; zamkni(z);
  const r = await uloz(z, cA);
  test('B134: ani administrátor zápornou rezervu neuloží (400)', r.status === 400, r); }
{ const z = nova('B134 text'); d0(z).ock.zadani.rezervaPriplatkyPct = '0,3';
  const r = await uloz(z, cA);
  test('B134/B135: rezerva jako text s čárkou („0,3" — jádro čte NaN) → 400', r.status === 400, r); }
{ const z = nova('B134 opláštění'); d0(z).ock.zadani.oplasteni = { rezim: 'poStenach', steny: { A: { odM: -5, pasy: [{ typ: 'bez', doM: null }] } } };
  const r = await uloz(z, cA);
  test('B134: opláštění po stěnách — záporná výška pásu (odM −5) → 400', r.status === 400 && /odM/.test(r.chyba || ''), r); }
{ const z = nova('B134 ATYP'); Object.assign(d0(z).ock.zadani, { rezervaZakladPct: 0.3, rezervaPriplatkyPct: 0.3, atyp: true });
  zamkni(z);
  const r = await uloz(z, cO);
  test('B134: legitimní kladné rezervy (ATYP 30 %) + nový zámek → 200', r.status === 200, r); }
{ const f = ULO.uloZaporneVZadani;
  const nal = f({ rezervaZakladPct: -0.2, engineeringKs: 1 }, null).filter(p => p.duvod === 'zaporne');
  test('B134: zábrana zapornaPolozka (uloZaporneVZadani) vidí zápornou rezervu', nal.some(p => /rezervaZakladPct/.test(p.kde)), nal); }

console.log('===== B133: dvoukrok přes ceník sestavení =====');
/* Platný ceník OCK s nejdražšími položkami vynulovanými. */
const drahe = (c, kolik) => { Object.keys(c).filter(k => typeof c[k] === 'number' && c[k] > 0 && !/^(dph|marze|kurz)/.test(k) && !/Pct$/.test(k))
  .sort((a, b) => c[b] - c[a]).slice(0, kolik).forEach(k => { c[k] = 0; }); return c; };
{
  const z = nova('B133 krok 1'); sestaveni(z);
  const r1 = await uloz(z, cO);
  test('B133 krok 1: nová zakázka s ceníkem sestavení projde (200 — výjimka B113, dokument zastaví zábrana)', r1.status === 200, r1);
  const g = await nacti(r1.soubor, cO);
  const a = zk.importZakazka(kopie(g));
  d0(a).cenik = drahe(kopie(platny().cenik), 8);
  const r2 = await uloz(kopie(a), cO, g.uloRazitko);
  test('B133 krok 2: platný ceník s drahými položkami = 0 nad uloženým ceníkem sestavení → 403', r2.status === 403 && /cenik\./.test(r2.chyba || ''), r2);
}
{ /* 2 + 3 v jednom požadavku (vlastní zakázka, ať nezávisí na výsledku kroku 2) */
  const z = nova('B133 2+3'); sestaveni(z);
  let cena = null;
  const r3 = await dvakrat(z, a => { d0(a).cenik = drahe(kopie(platny().cenik), 15); d0(a).proj.cenik = kopie(platny().cenikProj); cena = cenaOck(a.varianty[0]); zamkni(a); }, cO);
  test('B133: krok 2 + 3 v jednom požadavku (směs + nový zámek) → 403 (cena OCK z platného ' + cenaOck(nova('x').varianty[0]) + ' → ' + cena + ')', r3.status === 403, r3);
}
{ /* legitimní: přechod na CELOU platnou verzi (progPouzij → cenikPrepoctiRozpracovane) */
  const z = nova('B133 přechod'); sestaveni(z);
  const r4 = await dvakrat(z, b => { d0(b).cenik = kopie(platny().cenik); d0(b).proj.cenik = kopie(platny().cenikProj); }, cO);
  test('B133: uložený ceník sestavení → celá zveřejněná verze (200)', r4.status === 200, r4);
}
{ /* PROJ přes klon: varianta A s ceníkem sestavení, klon B s platným ceníkem PROJ s nulami */
  const z = nova('B133 klon'); sestaveni(z);
  const r = await dvakrat(z, a => {
    a.varianty[0].nazev = 'A'; const kl = zam.klonujVariantu(a, a.varianty[0].id);
    kl.data.cenik = kopie(platny().cenik);
    const pc = kopie(platny().cenikProj); if (pc.sazby) Object.keys(pc.sazby).forEach(k => { pc.sazby[k] = 0; });
    kl.data.proj.cenik = pc;
  }, cO);
  test('B133: klon — ceník PROJ složený z platného a nul uložené varianty se sestavením → 403', r.status === 403 && /proj\.cenik/.test(r.chyba || ''), r);
}
{ /* klon varianty s ceníkem sestavení celým — legitimní (zůstává celý) */
  const z = nova('B133 klon celý'); sestaveni(z);
  const r = await dvakrat(z, a => { a.varianty[0].nazev = 'A'; zam.klonujVariantu(a, a.varianty[0].id); }, cO);
  test('B133: klon varianty, která ceník sestavení nese celý (200)', r.status === 200, r);
}
{ /* jen PROJ: OCK platný, PROJ sestavení → PROJ s vybranými nulami */
  const z = nova('B133 PROJ'); sestaveni(z, 'proj');
  const r = await dvakrat(z, a => { const pc = kopie(platny().cenikProj); if (pc.sazby) Object.keys(pc.sazby).forEach(k => { pc.sazby[k] = 0; }); d0(a).proj.cenik = pc; }, cO);
  test('B133: uložený ceník PROJ ze sestavení → platný PROJ s nulovými sazbami → 403', r.status === 403, r);
}

console.log('===== B135: číslo v ceníku jako text s čárkou =====');
/* Celá kladná čísla (text „120,0" — jako by ho napsal člověk s čárkou). */
const ciselne = (c) => Object.keys(c).filter(k => Number.isInteger(c[k]) && c[k] > 0 && !/^(dph|kurz|marze)/.test(k));
{ const z = nova('B135 jeden'); const c = d0(z).cenik; const k = ciselne(c).sort((a, b) => c[b] - c[a])[0];
  c[k] = String(c[k]) + ',0';
  const r = await uloz(z, cO);
  test('B135: obchodník — jeden klíč ceníku jako „…,0" → 4xx', je4xx(r) && new RegExp(k).test(r.chyba || ''), r); }
{ const z = nova('B135 25'); const c = d0(z).cenik; const pred = cenaOck(z.varianty[0]);
  const kl = ciselne(c).slice(0, 25); kl.forEach(k => { c[k] = String(c[k]) + ',0'; });
  const po = cenaOck(z.varianty[0]); zamkni(z);
  const r = await uloz(z, cO);
  test('B135: obchodník — ' + kl.length + ' klíčů „…,0" + nový zámek → 4xx (cena OCK ' + pred + ' → ' + po + ')', je4xx(r), r); }
{ const z = nova('B135 admin'); const c = d0(z).cenik; c[ciselne(c)[0]] = '100,0';
  const r = await uloz(z, cA);
  test('B135: administrátor — ceník „100,0" (jádro čte NaN) → 400', r.status === 400, r); }
{ const z = nova('B135 PROJ'); const pc = d0(z).proj.cenik.sazby; const k = ciselne(pc)[0];
  pc[k] = String(pc[k]) + ',0';
  const r = await uloz(z, cO);
  test('B135: obchodník — ceník PROJ „…,0" → 4xx', je4xx(r), r); }
{ const z = nova('B135 PROJ admin'); const pc = d0(z).proj.cenik.sazby; pc[ciselne(pc)[0]] = '100,0';
  const r = await uloz(z, cA);
  test('B135: administrátor — ceník PROJ „100,0" → 400', r.status === 400 && /proj\.cenik/.test(r.chyba || ''), r); }
{ const z = nova('B135 % sekce'); d0(z).proj.zadani.sekce[0].prirazkaPct = '10,5';
  const r = await uloz(z, cA);
  test('B135: administrátor — vlastní % sekce PROJ „10,5" (jádro čte NaN) → 400', r.status === 400 && /prirazkaPct/.test(r.chyba || ''), r); }
{ /* #340 po B135: ceník hlídá přísnější uloCisloJadro; pole zadání mimo
   * vstupy jádra (rozměry můstku) dál obecná kontrola tvaru čísla. */
  const z = nova('#340 text'); d0(z).ock.zadani.mustekSirkaMm = '<img src=x onerror=alert(1)>';
  const r = await uloz(z, cA);
  test('#340: skript v číselném poli zadání mimo vstupy jádra → 400', r.status === 400 && /mustekSirkaMm/.test(r.chyba || ''), r); }
{ const z = nova('B135 tečka'); const c = d0(z).cenik; const k = ciselne(c)[0]; c[k] = String(c[k]);
  const r = await uloz(z, cO);
  test('B135: číslo jako text s desetinnou tečkou (jádro čte stejně) projde (200)', r.status === 200, r); }
{ /* B112 porovnává hodnotu tak, jak ji čte jádro — přímé volání bez typové kontroly */
  const z = nova('B135 B112'); const st = kopie(z);
  const c = d0(z).cenik; const k = ciselne(c)[0]; c[k] = String(c[k]) + ',0';
  const pr = ULO.uloCenikProblemy(z, st, { role: 'Obchodník', matice: null, program: JSON.parse(pamet.get('program/db')), importuj: globalThis.importZakazka });
  test('B135: B112 bere „…,0" jako NaN, ne jako totéž číslo', pr.some(p => new RegExp(k).test(p.kde)), pr); }

console.log('===== B136: volný klíč ceníku obešel #395 V3 =====');
for (const [popis, uprava] of [['jenZahr: 5', c => { c.jenZahr = 5; }], ['popisyJazyky s číslem', c => { c.popisyJazyky = { x: 5 }; }],
  ['rada: 5', c => { c.rada = 5; }]]) {
  const z = nova('B136 ' + popis); sestaveni(z); uprava(d0(z).cenik); uprava(d0(z).proj.cenik);
  vlastniOck(z, 1); vlastniProj(z, 1); zamkni(z);
  const r = await uloz(z, cO);
  /* jenZahr: 5 od revize N1 zastaví už typová kontrola (400) — jinak 403 z #395 V3. */
  test('B136: obchodník — ceník sestavení + ' + popis + ' + vlastní položka 1 Kč + nový zámek → 4xx', je4xx(r) && /ceník|jenZahr/.test(r.chyba || ''), r);
}
{ const z = nova('B136 OCK+PROJ'); sestaveni(z, 'proj'); d0(z).proj.cenik.jenZahr = 5; vlastniProj(z, 1); zamkni(z, 'nabidkaProj');
  const r = await uloz(z, cO);
  test('B136: obchodník — OCK platný + PROJ sestavení (+ jenZahr) + zámek nabídky PROJ → 403', r.status === 403, r); }
{ const f = globalThis.ukazkoveMaCisla;
  const s = Object.assign(kopie(globalThis.DEFAULT_CENIK), { jenZahr: 5, rada: 7, popisyJazyky: { a: 3 } });
  test('B136: ukazkoveMaCisla — volné klíče nejsou cena (se vzorem i bez něj)', !f(s, globalThis.DEFAULT_CENIK) && !f(s), s);
  test('B136: ukazkoveMaCisla — platný ceník ceny má', f(platny().cenik, globalThis.DEFAULT_CENIK) && f(platny().cenikProj, globalThis.DEFAULT_CENIK_PROJ)); }
{ const z = nova('B136 legit'); vlastniOck(z, 1234); zamkni(z);
  const r = await uloz(z, cO);
  test('B136: nový zámek z platného ceníku s vlastní položkou (200)', r.status === 200, r); }

console.log('===== B137: rozměry šachty ≤ 0 =====');
for (const [k, h] of [['zdvih', -1], ['roztec', -1], ['hloubka', -1], ['sirka', -0.5], ['prejezd', -1], ['prohluben', -1], ['rohoveSloupky', -4]]) {
  const z = nova('B137 ' + k); const pred = cenaOck(z.varianty[0]); d0(z).ock.zadani[k] = h; const po = cenaOck(z.varianty[0]);
  zamkni(z);
  const r = await uloz(z, cO);
  test('B137: obchodník — ' + k + ' ' + h + ' + nový zámek → 400 (cena OCK ' + pred + ' → ' + po + ')', r.status === 400 && new RegExp(k).test(r.chyba || ''), r);
}
{ const z = nova('B137 bez zámku'); d0(z).ock.zadani.zdvih = -1;
  const r = await uloz(z, cO);
  test('B137: zdvih −1 i bez zámku (rozpracovaná) → 400', r.status === 400, r); }
{ const z = nova('B137 vysoký'); d0(z).ock.zadani.zdvih = 150;
  const r = await uloz(z, cO);
  test('B137: zdvih 150 m (nad hranicí 99 m) → 400', r.status === 400 && /zdvih/.test(r.chyba || ''), r); }
{ const z = nova('B137 čárka'); d0(z).ock.zadani.zdvih = '9,5';
  const r = await uloz(z, cA);
  test('B137: zdvih „9,5" (jádro čte NaN) → 400', r.status === 400, r); }
{ const z = nova('B137 admin'); d0(z).ock.zadani.roztec = -1;
  const r = await uloz(z, cA);
  test('B137: ani administrátor zápornou rozteč neuloží (400)', r.status === 400, r); }
{ const z = nova('B137 nula zámek'); d0(z).ock.zadani.zdvih = 0; zamkni(z);
  const r = await uloz(z, cO);
  test('B137: nový zámek nabídky OCK se zdvihem 0 → 400', r.status === 400 && /zdvih/.test(r.chyba || ''), r); }
{ const z = nova('B137 prázdno zámek'); d0(z).ock.zadani.hloubka = ''; zamkni(z);
  const r = await uloz(z, cA);
  test('B137: nový zámek s prázdnou hloubkou → 400 (i administrátor)', r.status === 400 && /hloubka/.test(r.chyba || ''), r); }
{ const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++); z.nazevAkce = 'TEST B137 rozpracovaná';
  d0(z).cenik = kopie(platny().cenik); d0(z).proj.cenik = kopie(platny().cenikProj);
  const r = await uloz(z, cO);
  test('B137: rozpracovaná nová zakázka s nulovými rozměry (ZADANI_NOVA) se uloží (200)', r.status === 200, r);
  const r2 = await dvakrat(nova('B137 prázdné'), a => { d0(a).ock.zadani.prejezd = ''; d0(a).ock.zadani.sirka = null; }, cO);
  test('B137: rozpracovaná zakázka s prázdným rozměrem se uloží (200 — prázdno není nula)', r2.status === 200, r2); }
{ const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++); z.nazevAkce = 'TEST B137 jen projekce'; z.jenProj = true;
  d0(z).cenik = kopie(platny().cenik); d0(z).proj.cenik = kopie(platny().cenikProj); zamkni(z, 'nabidkaProj');
  const r = await uloz(z, cO);
  test('B137: jen projekce — zámek nabídky PROJ s nulovými rozměry OCK (200)', r.status === 200, r); }
{ /* jen projekce + zámek bez známého typu dokumentu (strana se nepozná → obě) */
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++); z.nazevAkce = 'TEST B137 jen projekce bez typu'; z.jenProj = true;
  d0(z).cenik = kopie(platny().cenik); d0(z).proj.cenik = kopie(platny().cenikProj); zamkni(z, 'neznamy');
  const r = await uloz(z, cO);
  test('B137: jen projekce — zámek neznámého typu s nulovými rozměry OCK (200 — šachtu nikdo neprodává)', r.status === 200, r); }
{ const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++); z.nazevAkce = 'TEST B137 nabídka PROJ';
  d0(z).cenik = kopie(platny().cenik); d0(z).proj.cenik = kopie(platny().cenikProj); zamkni(z, 'nabidkaProj');
  const r = await uloz(z, cO);
  test('B137: zámek nabídky PROJ (zakázka OCK + PROJ) s nevyplněnými rozměry OCK (200 — zábrana rozměrů je jen strany OCK)', r.status === 200, r); }
{ /* doklad: varianta zamčená už v uložené verzi s nesmyslným rozměrem */
  const z = nova('B137 doklad'); const r = await uloz(z, cO);
  const klic = 'zakazky/z/' + r.soubor; const ul = JSON.parse(pamet.get(klic)); const v = ul.varianty[0];
  v.data.ock.zadani.zdvih = -1; zamkni(ul, 'nabidka', v); pamet.set(klic, JSON.stringify(ul));
  const g = await nacti(r.soubor, cO); const a = zk.importZakazka(kopie(g)); a.nazevAkce += ' (poznámka)';
  const r2 = await uloz(a, cO, g.uloRazitko);
  test('B137: odeslaná varianta, která nesmyslný rozměr už nese, se beze změny uloží (200 — doklad)', r2.status === 200, r2); }
{ const z = nova('B137 obnova'); d0(z).ock.zadani.zdvih = -1;
  const jm = z.cislo.replace(/\s+/g, '') + '.json';
  const o = await (await post(obnova, 'http://x/api/obnova', { zdroj: { soubor: { porizena: new Date().toISOString(), zakazky: { [jm]: z } } },
    rezim: 'prepsat', potvrzeni: 'OBNOVIT', casti: ['zakazky'] }, cA)).json();
  const zk2 = o.casti && o.casti.zakazky;
  test('B137: obnova ze zálohy se zdvihem −1 → zakázka přeskočena s důvodem', o.ok === true && zk2 && zk2.preskocene === 1 && /rozměr/.test(JSON.stringify(zk2.duvody || [])), zk2 || o); }

console.log('===== Nezávislá revize #398 (12. 10. 2026): N1 jenZahr, N2 nepocitat, N3 pás „jiné", Model 1, N4 dotisk =====');
/* Nálezy dvou nezávislých revizí po opravě B133–B137, každý potvrzený dvěma
 * pokusy (revize + vlastní ověření). Před opravou útoky 200 se zámkem „shoda". */
{ const z = nova('N1 jenZahr'); const pred = cenaOck(z.varianty[0]);
  d0(z).cenik.jenZahr = { 'C.montazHodKc': true, 'C.profilasKgKc': true, 'C.powertechExt': true }; const po = cenaOck(z.varianty[0]); zamkni(z);
  const r = await uloz(z, cO);
  test('N1: obchodník — cenik.jenZahr skryje tuzemské řádky + nový zámek → 403 (cena OCK ' + pred + ' → ' + po + ')', r.status === 403 && /jenZahr/.test(r.chyba || ''), r); }
{ const r = await dvakrat(nova('N1 dvoukrok'), a => { d0(a).cenik.jenZahr = { 'C.montazHodKc': true }; }, cO);
  test('N1: obchodník — značka jenZahr přidaná do uložené varianty → 403', r.status === 403, r); }
{ const z = nova('N1 typ'); d0(z).cenik.jenZahr = { 'C.montazHodKc': 1 };
  const r = await uloz(z, cA);
  test('N1: jenZahr s hodnotou jinou než true → 400 (i administrátor)', r.status === 400 && /jenZahr/.test(r.chyba || ''), r); }
{ const z = nova('N2 nepocitat'); const pred = cenaOck(z.varianty[0]);
  d0(z).ock.zadani.nepocitat = ['MONTÁŽ NA STAVBĚ', 'DOPRAVA']; const po = cenaOck(z.varianty[0]); zamkni(z);
  const r = await uloz(z, cO);
  test('N2: obchodník — nepocitat (vyřazené řádky OCK) + nový zámek → 403 (cena OCK ' + pred + ' → ' + po + ')', r.status === 403 && /nepocitat/.test(r.chyba || ''), r); }
{ const r = await dvakrat(nova('N2 dvoukrok'), a => { d0(a).ock.zadani.nepocitat = ['PROFILY - HLAVNÍ NOSNÉ PRVKY']; }, cO);
  test('N2: obchodník — nepocitat přidané do uložené varianty → 403', r.status === 403, r); }
{ const z = nova('N2 admin'); d0(z).ock.zadani.nepocitat = ['MONTÁŽ NA STAVBĚ'];
  const r = await dvakrat(z, a => { a.nazevAkce += ' (poznámka)'; d0(a).ock.zadani.nepocitat = []; }, cO, cA);
  test('N2: obchodník zakázku, které správce řádek vyřadil, uloží a smí ho vrátit (200)', r.status === 200, r); }
{ const { default: zobrazeni } = await import(R + 'netlify/functions/zobrazeni.mjs');
  await post(zobrazeni, 'http://x/api/zobrazeni', { matice: { vychozi: { 'ock.pocitat:MONTÁŽ NA STAVBĚ': false } } }, cA);
  const z = nova('N2 matice'); d0(z).ock.zadani.nepocitat = ['MONTÁŽ NA STAVBĚ'];
  const r = await uloz(z, cO);
  test('N2: nová zakázka s nepocitat podle matice Výchozí (200)', r.status === 200, r);
  await post(zobrazeni, 'http://x/api/zobrazeni', { matice: {} }, cA); }
{ const z = nova('N3 pás'); const pred = cenaOck(z.varianty[0]); const st = {};
  ['A', 'B', 'C', 'D'].forEach(k => { st[k] = { odM: 0, pasy: [{ typ: 'jine', nazev: 'x', naklad: -3000, doM: null }] }; });
  d0(z).ock.zadani.oplasteni = { rezim: 'poStenach', steny: st }; const po = cenaOck(z.varianty[0]); zamkni(z);
  const r = await uloz(z, cO);
  test('N3: obchodník — pás „jiné" se sazbou −3 000 Kč/m² + nový zámek → 400 (cena OCK ' + pred + ' → ' + po + ')', r.status === 400 && /naklad/.test(r.chyba || ''), r); }
{ const z = nova('N3 text'); d0(z).ock.zadani.oplasteni = { rezim: 'poStenach', steny: { A: { odM: 0, pasy: [{ typ: 'jine', nazev: 'x', naklad: '1500,5', doM: null }] } } };
  const r = await uloz(z, cA);
  test('N3: sazba pásu „1500,5" (jádro čte NaN) → 400', r.status === 400, r); }
{ const z = nova('N3 legit'); d0(z).ock.zadani.oplasteni = { rezim: 'poStenach', steny: { A: { odM: 0, pasy: [{ typ: 'jine', nazev: 'x', naklad: 2500, doM: null }] } } };
  const r = await uloz(z, cO);
  test('N3: kladná ruční sazba pásu se uloží (200)', r.status === 200, r); }
{ const z = nova('Model 1'); d0(z).ock.fixes = false; zamkni(z);
  const r = await uloz(z, cO);
  test('Model 1: obchodník — nová zakázka v Modelu 1 (zmrazený) → 403', r.status === 403 && /fixes/.test(r.chyba || ''), r); }
{ const r = await dvakrat(nova('Model 1 přepnutí'), a => { d0(a).ock.fixes = false; }, cO);
  test('Model 1: obchodník přepne uloženou variantu na Model 1 → 403', r.status === 403, r); }
{ const z = nova('Model 1 správce'); d0(z).ock.fixes = false;
  const r = await dvakrat(z, a => { a.nazevAkce += ' (poznámka)'; a.varianty[0].nazev = 'A'; zam.klonujVariantu(a, a.varianty[0].id); }, cO, cA);
  test('Model 1: variantu v Modelu 1 (od správce) obchodník uloží i naklonuje (200)', r.status === 200, r);
  const r2 = await dvakrat(nova('Model 1 → 2'), a => { d0(a).ock.fixes = true; }, cO, cA);
  test('Model 1: převod Modelu 1 na Model 2 smí obchodník (200)', r2.status === 200, r2); }
{ const z = nova('Model typ'); d0(z).ock.fixes = 'ano';
  const r = await uloz(z, cA);
  test('Model: ock.fixes, které není pravda/nepravda → 400', r.status === 400, r); }
{ /* N4: zámek nabídky PROJ z nulových rozměrů OCK, pak dotisk nabídky OCK */
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++); z.nazevAkce = 'TEST N4 dotisk';
  d0(z).cenik = kopie(platny().cenik); d0(z).proj.cenik = kopie(platny().cenikProj); zamkni(z, 'nabidkaProj');
  const r0 = await uloz(z, cO);
  test('N4: příprava — zámek nabídky PROJ s nevyplněnou šachtou (200)', r0.status === 200, r0);
  const g = await nacti(r0.soubor, cO);
  const a = zk.importZakazka(kopie(g)); zamkni(a, 'nabidka');
  const r1 = await uloz(a, cO, g.uloRazitko);
  test('N4: dotisk nabídky OCK k zámku PROJ z nulových rozměrů → 400', r1.status === 400 && /dotisk/.test(r1.chyba || ''), r1);
  const g2 = await nacti(r0.soubor, cO);   // čerstvě — před opravou dotisk OCK výš prošel a změnil razítko
  const b = zk.importZakazka(kopie(g2)); zamkni(b, 'nabidkaProj');
  const r2 = await uloz(b, cO, g2.uloRazitko);
  test('N4: dotisk dokumentu téže strany (PROJ) projde (200)', r2.status === 200, r2); }

console.log('===== revize 13. 10.: schválení a hned tisk (B105 × zámek) =====');
/* Regrese B105 (revize 13. 10.): server orazítkoval čas schválení vlastním
 * časem, prohlížeč držel čas kliknutí — nabídka vytištěná hned po schválení
 * pak při dalším uložení z téhož okna skončila 409 („změnila by se data
 * uzamčené nabídky"). */
{
  const z = zk.importZakazka(nova('B105 tisk po schválení'));   // jako v prohlížeči (doplněné klíče)
  const S = require(R + 'src/schvalovani.js');
  d0(z).sleva = Object.assign({}, d0(z).sleva || {}, { procenta: 0.04, role: 'Administrátor' });
  S.schvalovaniSchval(d0(z).sleva, 'Admin', new Date().toISOString());
  const r1 = await uloz(z, cA);
  test('B105: schválení uloženo (200)', r1.status === 200, r1);
  /* Prohlížeč si slevy z odpovědi převezme (onlineSlevyZeServeru). */
  (r1.slevy || []).forEach(s => { const v = z.varianty.find(x => x.id === s.id); if (v && s.sleva) v.data.sleva = kopie(s.sleva); if (v && s.slevaProj) v.data.slevaProj = kopie(s.slevaProj); });
  zamkni(z);
  const r2 = await uloz(z, cA, r1.razitko);
  test('B105: tisk hned po schválení — zámek uložen (200)', r2.status === 200, r2);
  z.nazevAkce += ' (poznámka)';
  const r3 = await uloz(z, cA, r2.razitko);
  test('B105: další uložení z téhož okna projde (200, ne 409)', r3.status === 200, r3);
  test('B105: odpověď nese slevy tak, jak je server uložil', Array.isArray(r1.slevy) && r1.slevy.some(s => s.sleva && s.sleva.stav === 'schváleno'), r1.slevy);
}

console.log('===== B138: dvoukrok se starší zveřejněnou verzí ceníku =====');
/* Audit 12. 10. 2026 (střední): (1) nová zakázka se STARŠÍ zveřejněnou verzí
 * celou projde (skupina kZv); (2) další uložení nese platný ceník + klíč,
 * který starší verze neměla (import ho doplnil nulou — tady hodiny statiky
 * opláštění) = 0. Skupina „uložená verze + platný ceník" nulu pustila, protože
 * seděla s uloženou verzí; −0,7 až −1,7 %, i se zámkem. Rozhodnutí J. V.
 * 12. 10.: opravit — klíč chybějící ve starší verzi nesmí ve směsi zůstat
 * nula (bez výjimky „přepočet vybraných položek"). Musí jít dál: uložit
 * zakázku se starší verzí beze změny i přejít na platný ceník celý.
 * Zveřejňuje se nová verze, proto na konci sady. */
{
  const starsi = kopie(platny().cenik);           // zkušební ceník bez statikaOplHod
  test('B138: příprava — starší verze klíč statikaOplHod nemá', !('statikaOplHod' in starsi), Object.keys(starsi).length);
  const V2 = ZC.zkusebniCenik(); V2.statikaOplHod = 6; V2.montazHodKc = (+V2.montazHodKc || 0) + 100;   // nová verze se liší i jinde
  const r0 = await (await post(program, 'http://x/api/program', { cenik: V2, cenikProj: ZC.zkusebniCenikProj(), slevy: NASTSL, poznamka: 'B138' }, cA)).json();
  test('B138: příprava — zveřejněna verze s hodinami statiky opláštění', r0.ok === true, r0);
  const staraZak = (nazev) => { const z = nova(nazev); d0(z).cenik = kopie(starsi); return z; };
  const smes = (a, v) => { v = v || a.varianty[0]; v.data.cenik = kopie(platny().cenik); v.data.cenik.statikaOplHod = 0; };
  { const r = await uloz(staraZak('B138 krok 1'), cO);
    test('B138 krok 1: nová zakázka se starší zveřejněnou verzí celou (200)', r.status === 200, r); }
  { const r = await dvakrat(staraZak('B138 krok 2'), a => smes(a), cO);
    test('B138 krok 2: platný ceník + klíč, který starší verze neměla, = 0 → 403', r.status === 403 && /statikaOplHod/.test(r.chyba || ''), r); }
  { const r = await dvakrat(staraZak('B138 2+3'), a => { smes(a); zamkni(a); }, cO);
    test('B138: krok 2 + 3 (směs + nový zámek) → 403', r.status === 403, r); }
  { const r = await dvakrat(staraZak('B138 klon'), a => { const id = zam.klonujVariantu(a, a.varianty[0].id);
      smes(a, a.varianty.find(v => v.id === id) || a.varianty[a.varianty.length - 1]); }, cO);
    test('B138: nová varianta (klon) ve starší zakázce se směsí → 403', r.status === 403 && /statikaOplHod/.test(r.chyba || ''), r); }
  { const r = await dvakrat(staraZak('B138 beze změny'), a => { a.nazevAkce += ' (poznámka)'; }, cO);
    test('B138: zakázka se starší verzí — uložení beze změny ceníku dál projde (200)', r.status === 200, r); }
  { const r = await dvakrat(staraZak('B138 přechod'), a => { d0(a).cenik = kopie(platny().cenik); }, cO);
    test('B138: přechod na platný ceník celý (200)', r.status === 200, r); }
  { const r = await dvakrat(staraZak('B138 výběr'), a => { smes(a); d0(a).cenik.statikaOplHod = 6; }, cO);
    test('B138: směs, kde chybějící klíč nese hodnotu platného ceníku (200)', r.status === 200, r); }
  /* Revize 13. 10. (audit dávky): (a) starší verze nese nulu VÝSLOVNĚ —
   * aplikace chybějící klíč při zveřejnění doplní nulou (progKontext, V38);
   * výjimka „nula některé verze" pustila útok znovu (−0,7 %, i se zámkem).
   * (b) mrtvý klíč ceníku PROJ (dopravaPausalKc), který klient přepočítat
   * neumí, nesmí zakázku po přepočtu zablokovat. */
  const Vz = ZC.zkusebniCenik(); Vz.statikaOplHod = 0; Vz.montazHodKc = (+Vz.montazHodKc || 0) + 50;
  const VzP = ZC.zkusebniCenikProj(); delete VzP.dopravaPausalKc;
  await post(program, 'http://x/api/program', { cenik: Vz, cenikProj: VzP, slevy: NASTSL, poznamka: 'B138 nula výslovně' }, cA);
  const starsiZ = kopie(platny().cenik), starsiZP = kopie(platny().cenikProj);
  const Vp = ZC.zkusebniCenik(); Vp.statikaOplHod = 7; Vp.montazHodKc = (+Vp.montazHodKc || 0) + 150;
  const VpP = ZC.zkusebniCenikProj(); VpP.dopravaPausalKc = 100;
  await post(program, 'http://x/api/program', { cenik: Vp, cenikProj: VpP, slevy: NASTSL, poznamka: 'B138 platný' }, cA);
  const staraZ = (nazev) => { const z = nova(nazev); d0(z).cenik = kopie(starsiZ); d0(z).proj.cenik = kopie(starsiZP); return z; };
  { const r = await dvakrat(staraZ('B138 nula výslovně'), a => { d0(a).cenik = kopie(platny().cenik); d0(a).cenik.statikaOplHod = 0; zamkni(a); }, cO);
    test('revize B138: nula, kterou starší verze nesla výslovně, ve směsi s platným ceníkem + zámek → 403',
      r.status === 403 && /statikaOplHod/.test(r.chyba || ''), r); }
  { const r = await dvakrat(staraZ('B138 mrtvý klíč'), a => { d0(a).proj.cenik = kopie(platny().cenikProj); d0(a).proj.cenik.dopravaPausalKc = 0; }, cO);
    test('revize B138: mrtvý klíč PROJ (klient ho nepřepočítá) přepočet nezablokuje (200)', r.status === 200, r); }
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
