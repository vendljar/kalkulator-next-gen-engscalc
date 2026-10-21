/* ZÁLOHY — nálezy kontroly #151 (dávka O4, 19. 10. 2026).
 *
 * Podklad: podklady/151_ZALOHOVANI_KONTROLA_2026-10-19.md, oddíl 6.
 *
 *   N1  Ruční „Zálohovat teď" (a otisk při přihlášení správce) mířil pod
 *       dnešní datum, tedy PŘES noční otisk z 2:00 — ztráta posledního
 *       dobrého stavu a falešné varování hlídky (#152). Teď vlastní slot
 *       `<den>T<hhmmss>-rucne|-auto`, noční zůstává `YYYY-MM-DD`.
 *   N2  Otisk četl záznam po záznamu → riziko 30s limitu plánované funkce.
 *       Teď paralelně po dávkách, trvání a velikost v odpovědi i logu.
 *   N3  Přehled záloh četl celé otisky (~20 MB) kvůli dvěma počtům. Teď
 *       souhrn `souhrn/<klíč>` vedle otisku; starší otisky bez něj se dočtou.
 *   N4  Úplnost: každé úložiště a každý pevný klíč, který serverové funkce
 *       zapisují, musí být v otisku, nebo na výslovném seznamu výjimek.
 *       Stalo se třikrát (B9, B104, slovník #401), že nový klíč do zálohy
 *       nikdo nepřidal a obnova by ho tiše smazala.
 *   N5  Retence (rozhodnutí J. V. 19. 10.): noční 30 dní + první otisk měsíce
 *       12 měsíců zpět, vynucené 90 dní, před obnovou nikdy; jen po úspěšném
 *       zápisu nového otisku, nikdy nejnovější.
 *   N6  Kopie na Disk (rozhodnutí J. V. 19. 10.): /api/zaloha?zdroj=nocni
 *       vrátí poslední noční otisk bez otisků hesel a bez podpisů; záznam
 *       o kopii drží server (POST akce kopie-disk), GET ho vrací.
 *
 * Dávka O7 (rozhodnutí J. V. 20. 10. 2026, audit K3):
 *   K3-N1  záznam kopie-disk jen s heslem správce a ze složky
 *          „_Zaloha Netlify DB"; retenci odemkne jen takový záznam.
 *   K3-N4  vynucený otisk nejvýš 1 za 10 min a 20 za 24 h → 429 s časem;
 *          noční a „před obnovou" se nepočítají.
 *   K3-N13 nový noční otisk s < 50 % zakázek nebo účtů proti předchozímu
 *          nočnímu → retence se přeskočí, varování do logu a hlídky.
 *
 * Paměťové úložiště, žádná síť. Spuštění: node netlify/test_zalohy.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const pamet = new Map();
/* Počítadla čtení podle úložiště a klíče + souběh čtení (N2, N3). */
const cteni = [];
let soubezne = 0, nejvicSoubezne = 0;
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) {
    cteni.push(nazev + '/' + k);
    soubezne++; nejvicSoubezne = Math.max(nejvicSoubezne, soubezne);
    await new Promise(r => setTimeout(r, 1));
    soubezne--;
    return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null;
  },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
    .map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

import prihlaseni from './functions/prihlaseni.mjs';
import zalohaNocni from './functions/zaloha_nocni.mjs';
import zalohaVynuceno from './functions/zaloha_vynuceno.mjs';
import zalohaFn from './functions/zaloha.mjs';
import * as Z from './lib/zalohovani.mjs';
import { ADMIN_EMAIL } from './lib/sdilene.mjs';
const require = createRequire(import.meta.url);
const { uloZalohaHlidka } = require('../src/uloziste.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info))); } };
const zkus = async (n, fn) => { try { await fn(); } catch (e) { test(n + ' (výjimka)', false, String(e && e.stack || e)); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST',
  headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const ulz = (n) => globalThis.__TEST_ULOZISTE(n);
const ticho = async (fn) => { const l = console.log; console.log = () => {}; try { return await fn(); } finally { console.log = l; } };
const dnes = () => new Date().toISOString().slice(0, 10);
/* K3-N4 (O7): vynucený otisk má limit 1 za 10 minut. Sada jich pořizuje
 * několik za sebou — každý „o 11 minut později": hodiny se posunou jen na
 * dobu požadavku (klíč otisku i limit počítají z Date.now). */
let posunHodin = 0;
const postVynuceny = async (telo, ck, request) => {
  posunHodin += 11 * 60000;
  const puv = Date.now; Date.now = () => puv.call(Date) + posunHodin;
  try { return await (await (request ? zalohaVynuceno(request) : post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', telo, ck === undefined ? cookie : ck))).json(); }
  finally { Date.now = puv; }
};

const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: ADMIN_EMAIL, heslo: 'Docasne.Heslo.123' });
const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
test('administrátor se přihlásí', r.status === 200, r.status);
await ulz('zakazky').zapis('z/A.json', { nazev: 'Zakázka A' });
await ulz('program').zapis('firma', { udaje: { nazev: 'Před ruční zálohou s.r.o.' } });

/* ---------------- N1: ruční záloha nepřepíše noční otisk dne ---------------- */
await zkus('N1', async () => {
  const noc = await ticho(async () => (await zalohaNocni()).json());
  test('N1: noční otisk míří pod dnešní datum', noc.ok && noc.den === dnes(), noc);
  const nocniPred = await ulz('zalohy').cti(dnes());
  /* Dopoledne se data pokazí a správce zmáčkne „Zálohovat teď". */
  await ulz('program').zapis('firma', { udaje: { nazev: 'POKAŽENO' } });
  const ruc = await postVynuceny({ duvod: 'rucne' });
  test('N1: ruční otisk má vlastní klíč s časem (<den>T<hhmmss>-rucne)',
    ruc.ok && /^\d{4}-\d{2}-\d{2}T\d{6}-rucne$/.test(ruc.den) && ruc.den.startsWith(dnes() + 'T'), ruc);
  const nocniPo = await ulz('zalohy').cti(dnes());
  test('N1: noční otisk dne zůstal (zdroj, čas i stav před pokažením)',
    !!nocniPo && nocniPo.zdroj === 'nocni-otisk' && nocniPo.porizena === nocniPred.porizena
    && nocniPo.firma.udaje.nazev === 'Před ruční zálohou s.r.o.', nocniPo && { zdroj: nocniPo.zdroj, firma: nocniPo.firma });
  const rucni = await ulz('zalohy').cti(ruc.den);
  test('N1: ruční otisk nese aktuální stav, zdroj „vynuceno" a kdo', !!rucni && rucni.firma.udaje.nazev === 'POKAŽENO'
    && rucni.zdroj === 'vynuceno' && rucni.kdo === ADMIN_EMAIL);
  const aut = await postVynuceny({ duvod: 'auto' });
  test('N1: otisk při přihlášení má slot -auto', aut.ok && /^\d{4}-\d{2}-\d{2}T\d{6}-auto$/.test(aut.den), aut);
  const bezTela = await postVynuceny(null, null, new Request('http://x/api/zaloha_vynuceno',
    { method: 'POST', headers: { cookie } }));
  test('N1: POST bez těla = ruční slot, ne noční den', bezTela.ok && /-rucne$/.test(bezTela.den), bezTela);
  test('N1: OTISK_KLIC přijme noční, ruční, auto i před obnovou; odmítne cizí',
    ['2026-10-19', '2026-10-19T101010-rucne', '2026-10-19T101010-auto', '2026-10-19T101010-pred-obnovou',
     '2026-10-19-pred-obnovou'].every(k => Z.OTISK_KLIC.test(k))
    && !['2026-10-19T1010-rucne', 'souhrn/2026-10-19', '2026-10-19-rucne', 'obnova-x'].some(k => Z.OTISK_KLIC.test(k)));

  /* Kdo zálohuje ručně často, nesmí z přehledu vytlačit noční zálohy —
   * jinak hlídka (#152) mezi nimi noční nenajde a falešně varuje. */
  for (let i = 0; i < 15; i++) await Z.porizOtisk('vynuceno', ADMIN_EMAIL, Z.klicVynuceny('rucne', Date.now() + (i + 5) * 1000));
  const seznam = await (await get(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', cookie)).json();
  test('N1: přehled ukáže noční otisk dne i po 15 ručních zálohách', seznam.ok
    && seznam.otisky.some(o => o.den === dnes() && o.zdroj === 'nocni-otisk'), seznam.otisky && seznam.otisky.map(o => o.den));
  test('N1: vynucených je v přehledu nejvýš OTISKY_VYNUCENE_LIMIT',
    seznam.otisky.filter(o => /T\d{6}-(rucne|auto)$/.test(o.den)).length === Z.OTISKY_VYNUCENE_LIMIT);
  const hl = uloZalohaHlidka(seznam.otisky, Date.now());
  test('N1: hlídka noční zálohy po ručních zálohách nevaruje', hl && hl.stara === false && hl.posledni.den === dnes(), hl);
});

/* ---------------- N2: čtení po dávkách, trvání a velikost ---------------- */
await zkus('N2', async () => {
  for (let i = 0; i < 60; i++) await ulz('zakazky').zapis('z/D' + String(i).padStart(2, '0') + '.json', { i });
  nejvicSoubezne = 0;
  const v = await Z.porizOtisk('nocni-otisk', '', '2000-01-01');
  test('N2: otisk čte souběžně (víc než jedno čtení naráz)', nejvicSoubezne > 1, nejvicSoubezne);
  test('N2: souběh je omezený velikostí dávky', nejvicSoubezne <= Z.DAVKA_CTENI, nejvicSoubezne);
  const o = await ulz('zalohy').cti('2000-01-01');
  test('N2: po dávkách se nic neztratí (61 zakázek, správné hodnoty)', Object.keys(o.zakazky).length === 61
    && o.zakazky['D07.json'].i === 7 && o.zakazky['D59.json'].i === 59, Object.keys(o.zakazky).length);
  const poradi = await Z.ctiPoDavkach(ulz('zakazky'), ['z/D03.json', 'neni', 'z/D41.json']);
  test('N2: ctiPoDavkach drží pořadí klíčů a chybějící vrátí jako null',
    poradi[0].i === 3 && poradi[1] === null && poradi[2].i === 41, poradi);
  test('N2: odpověď nese trvání a velikost otisku', Number.isFinite(v.trvaniMs) && v.trvaniMs >= 0
    && v.velikostB === Buffer.byteLength(JSON.stringify(o)), v);
  const logy = [];
  const l = console.log; console.log = (...a) => logy.push(a.join(' '));
  try { await zalohaNocni(); } finally { console.log = l; }
  test('N2: noční funkce zapíše do logu trvání a velikost',
    logy.some(x => /zaloha_nocni: otisk \d{4}-\d{2}-\d{2} — \d+ ms, \d+ kB/.test(x)), logy);
});

/* ---------------- N3: přehled čte souhrny, ne celé otisky ---------------- */
await zkus('N3', async () => {
  const sh = await ulz('zalohy').cti(Z.souhrnKlic(dnes()));
  test('N3: k otisku se zapíše souhrn (zdroj, čas, počty, velikost)', !!sh && sh.zdroj === 'nocni-otisk'
    && sh.pocetZakazek === 61 && Number.isFinite(sh.velikostB), sh);
  test('N3: souhrn neveze data zakázek ani hesla', !JSON.stringify(sh).includes('Zakázka A') && !JSON.stringify(sh).includes('heslo'));
  /* Starší otisk bez souhrnu (pořízený před 19. 10.) */
  await ulz('zalohy').zapis('2026-01-02', { porizena: '2026-01-02T02:00:00.000Z', zdroj: 'nocni-otisk', kdo: '',
    zakazky: { a: {}, b: {} }, uzivatele: [{ email: 'x' }] });
  cteni.length = 0;
  const seznam = await Z.seznamOtisku(30);
  const celaCteni = cteni.filter(k => k.startsWith('zalohy/') && Z.OTISK_KLIC.test(k.slice(7)));
  test('N3: přehled nečte celý otisk, má-li souhrn (jen starý bez souhrnu)',
    celaCteni.length === 1 && celaCteni[0] === 'zalohy/2026-01-02', celaCteni);
  const stary = seznam.find(o => o.den === '2026-01-02');
  test('N3: starší otisk bez souhrnu má počty dočtené z otisku', !!stary && stary.pocetZakazek === 2 && stary.pocetUctu === 1, stary);
  const novy = seznam.find(o => o.den === dnes());
  test('N3: počty ze souhrnu', !!novy && novy.pocetZakazek === 61 && novy.zdroj === 'nocni-otisk', novy);
  test('N3: souhrny se v přehledu neobjeví jako otisky', !seznam.some(o => o.den.startsWith('souhrn/')));
  test('N3: přehled nese jen souhrnná pole', seznam.every(o =>
    JSON.stringify(Object.keys(o).sort()) === JSON.stringify(['den', 'kdo', 'pocetUctu', 'pocetZakazek', 'porizena', 'zdroj'])));
});

/* ---------------- N4: úplnost zálohy ---------------- */
/* Úložiště, která aplikace zapisuje: `cele` = otisk bere celé úložiště,
 * `klice` = otisk bere vyjmenované klíče (KLICE níž), jinak důvod výjimky.
 * NOVÉ ÚLOŽIŠTĚ = doplnit do porizOtisk/zalohaDoplnky (lib/zalohovani.mjs)
 * a sem; do výjimek jen s důvodem a vědomím J. V. */
const ULOZISTE = {
  program: 'klice', zakazky: 'klice',
  uzivatele: 'cele', sablony: 'cele', zakaznici: 'cele', podpisy: 'cele', smazani: 'cele',
  analytika: 'výjimka: statistiky použití, po havárii začnou od nuly (podklad #151, oddíl 3)',
  pd_cache: 'výjimka: cache Pipedrive s osobními daty, maže se po 30 dnech',
  pipedrive: 'výjimka: mapa polí Pipedrive, znovu se načte',
  pokusy: 'výjimka: krátkodobá počítadla pokusů přihlášení',
  zalohy: 'výjimka: otisky samy, tokeny obnovy',
};
/* Pevné klíče (literály a konstanty v `zapis(…)`) → úložiště a zda je otisk
 * nese. Prefixy končí lomítkem/čímkoli před `+`. */
const KLICE = {
  db: ['program', true], firma: ['program', true], zobrazeni: ['program', true], popisy: ['program', true],
  slovnik: ['program', true],
  popisy_historie: ['program', 'výjimka: historie 30 verzí dodatkových textů, platné popisy jsou v otisku'],
  'z/': ['zakazky', true], _rejstrik: ['zakazky', true],
  rejstrik: ['sablony', true],
  rezim: ['analytika', false], 'den/': ['analytika', false], 'ocista-b175': ['analytika', false],
  pole: ['pipedrive', false],
  'kopie-disk': ['zalohy', false],         // záznam o kopii na Disk (#151 N6), ne data
  'retence-varovani': ['zalohy', false],   // varování pojistky retence (K3-N13, O7), ne data
};
/* Dynamické výrazy v uloziste(…), které nejsou nové úložiště. */
const DYNAMICKE = {
  'mapy[cast]': 'obnova zapisuje zpět do úložišť z otisku',
  nazev: 'sdilene.mjs: samotná definice uloziste()',
};

await zkus('N4', async () => {
  const KOREN = dirname(fileURLToPath(import.meta.url));
  const soubory = ['functions', 'lib'].flatMap(d => readdirSync(join(KOREN, d))
    .filter(f => f.endsWith('.mjs')).map(f => join(d, f)));
  const zdroje = Object.fromEntries(soubory.map(f => [f, readFileSync(join(KOREN, f), 'utf8')]));
  const vse = Object.values(zdroje).join('\n');
  const konstanta = (jm) => { const m = vse.match(new RegExp('const ' + jm + "\\s*=\\s*'([^']+)'")); return m ? m[1] : null; };

  const nalezenaUloziste = new Map();   // název → soubory
  const nalezeneKlice = new Map();      // klíč → soubory
  const pridej = (mapa, k, f) => { if (!mapa.has(k)) mapa.set(k, new Set()); mapa.get(k).add(f); };
  for (const [f, t] of Object.entries(zdroje)) {
    for (const m of t.matchAll(/uloziste\(\s*([^)]*?)\s*\)/g)) {
      const vyraz = m[1];
      if (/^'[^']+'$/.test(vyraz)) pridej(nalezenaUloziste, vyraz.slice(1, -1), f);
      else if (/^[A-Z_]+$/.test(vyraz)) pridej(nalezenaUloziste, konstanta(vyraz) || ('?' + vyraz), f);
      else if (!(vyraz in DYNAMICKE)) pridej(nalezenaUloziste, '?' + vyraz, f);
    }
    for (const m of t.matchAll(/\.zapis\(\s*'([^']+)'\s*(\+)?/g)) pridej(nalezeneKlice, m[1], f);
    for (const m of t.matchAll(/\.zapis\(\s*([A-Z_]+)\s*,/g)) pridej(nalezeneKlice, konstanta(m[1]) || ('?' + m[1]), f);
  }
  test('N4: sken kódu našel úložiště i klíče (pojistka proti prázdnému skenu)',
    nalezenaUloziste.size >= 10 && nalezeneKlice.size >= 10, { u: [...nalezenaUloziste.keys()], k: [...nalezeneKlice.keys()] });
  const neznamaU = [...nalezenaUloziste.keys()].filter(u => !(u in ULOZISTE));
  test('N4: každé zapisované úložiště je v otisku, nebo na seznamu výjimek', neznamaU.length === 0,
    neznamaU.map(u => u + ' (' + [...nalezenaUloziste.get(u)].join(', ') + ') — doplňte do lib/zalohovani.mjs a test_zalohy.mjs'));
  const neznameK = [...nalezeneKlice.keys()].filter(k => !(k in KLICE));
  test('N4: každý pevný klíč zápisu je v otisku, nebo na seznamu výjimek', neznameK.length === 0,
    neznameK.map(k => k + ' (' + [...nalezeneKlice.get(k)].join(', ') + ') — doplňte do lib/zalohovani.mjs a test_zalohy.mjs'));

  /* Tvrzení tabulek ověří skutečný otisk: do každého zálohovaného úložiště
   * a klíče se zapíše značka a otisk ji musí nést. */
  const znacky = [];
  let n = 0;
  const vloz = async (ul, klic) => { const z = 'ZNACKA-UPLNOST-' + (++n); znacky.push([ul + '/' + klic, z]);
    await ulz(ul).zapis(klic, ul === 'uzivatele' ? { email: 'uplnost@priklad.cz', znacka: z } : { znacka: z }); };
  for (const [ul, druh] of Object.entries(ULOZISTE)) if (druh === 'cele') await vloz(ul, 'uplnost-' + ul);
  for (const [klic, [ul, zal]] of Object.entries(KLICE)) if (zal === true) await vloz(ul, /\/$/.test(klic) ? klic + 'uplnost' : klic);
  await Z.porizOtisk('test', '', '2000-01-02');
  const text = JSON.stringify(await ulz('zalohy').cti('2000-01-02'));
  const chybi = znacky.filter(([, z]) => !text.includes('"' + z + '"')).map(([k]) => k);
  test('N4: otisk opravdu nese všechna úložiště a klíče, které tabulka vede jako zálohované', chybi.length === 0, chybi);
  /* Kontrola testu samotného: výjimka se do otisku nedostane (jinak by
   * značky výše nic nedokazovaly). */
  await ulz('analytika').zapis('rezim', { znacka: 'ZNACKA-VYJIMKA' });
  await Z.porizOtisk('test', '', '2000-01-03');
  test('N4: kontrola testu — výjimka (analytika) v otisku není',
    !JSON.stringify(await ulz('zalohy').cti('2000-01-03')).includes('ZNACKA-VYJIMKA'));
});


/* ---------------- N5: retence ---------------- */
await zkus('N5', async () => {
  const V = Z.retenceVyber;
  const D = '2028-10-19';
  const v = (klice) => V(klice, D);
  test('N5: hranice 30. dne — věk 29 dní zůstane, 30 dní se smaže',
    JSON.stringify(v(['2028-10-19', '2028-09-20', '2028-09-19', '2028-09-05'])) === JSON.stringify(['2028-09-19']), v(['2028-10-19', '2028-09-20', '2028-09-19', '2028-09-05']));
  test('N5: z měsíce se drží první (nejstarší) otisk, ostatní staré se smažou',
    JSON.stringify(v(['2028-10-19', '2028-08-03', '2028-08-04', '2028-08-31'])) === JSON.stringify(['2028-08-04', '2028-08-31']));
  test('N5: hranice 12. měsíce — měsíc dneška + 12 zpět (říjen 2025) drží, září 2025 se smaže',
    JSON.stringify(v(['2028-10-19', '2027-10-01', '2027-09-01'])) === JSON.stringify(['2027-09-01']));
  test('N5: vynucené — 89 dní zůstane, 90 dní se smaže (ruční i při přihlášení)',
    JSON.stringify(v(['2028-10-19', '2028-07-22T101010-rucne', '2028-07-21T101010-rucne', '2028-07-21T090000-auto']))
      === JSON.stringify(['2028-07-21T090000-auto', '2028-07-21T101010-rucne']));
  test('N5: otisky před obnovou se nemažou nikdy (oba tvary)',
    v(['2028-10-19', '2026-01-01T101010-pred-obnovou', '2026-01-01-pred-obnovou']).length === 0);
  test('N5: nejnovější otisk se nesmaže, i když je starý',
    v(['2027-01-05']).length === 0 && JSON.stringify(v(['2027-01-05', '2027-01-06'])) === JSON.stringify(['2027-01-05']));
  test('N5: cizí klíče (souhrny, tokeny, kopie-disk) výběr nevidí',
    v(['2028-10-19', 'souhrn/2020-01-02', 'obnova-abc', 'kopie-disk', 'nesmysl']).length === 0);
  /* HRANICE (J. V. 19. 10. 2026: „Staré zálohy všechny ponech.") */
  test('N5 hranice: RETENCE_OD je 2026-10-20', Z.RETENCE_OD === '2026-10-20');
  test('N5 hranice: otisky 2026-08-01 a 2026-10-19 zůstanou, 2026-10-20 a dál podle pravidla',
    JSON.stringify(V(['2026-08-01', '2026-08-02', '2026-10-19', '2026-10-20', '2026-10-21', '2027-11-29'], '2027-11-30'))
      === JSON.stringify(['2026-10-20', '2026-10-21']), V(['2026-08-01', '2026-08-02', '2026-10-19', '2026-10-20', '2026-10-21', '2027-11-29'], '2027-11-30'));
  test('N5 hranice: staré otisky se nesmažou ani po letech (denní i vynucené)',
    V(['2026-08-01', '2026-10-19', '2026-10-19T235959-rucne', '2026-01-01T101010-auto', '2031-01-01'], '2031-01-02').length === 0);
  test('N5 hranice: vynucený 2026-10-20 a dál se po 90 dnech smaže',
    JSON.stringify(V(['2026-10-19T120000-rucne', '2026-10-20T000000-rucne', '2027-03-01'], '2027-03-01'))
      === JSON.stringify(['2026-10-20T000000-rucne']));
  test('N5: neplatný dnešek = nemaže se nic', V(['2020-01-01', '2020-01-02'], 'x').length === 0);

  /* Provedení nad úložištěm */
  const s = ulz('zalohy');
  for (const k of [...pamet.keys()]) if (k.startsWith('zalohy/')) pamet.delete(k);
  for (const k of ['2028-09-19', '2028-09-01', '2028-09-02', '2028-07-01T101010-rucne', '2028-01-01T101010-pred-obnovou'])
    { await s.zapis(k, { zdroj: 'x' }); await s.zapis(Z.souhrnKlic(k), { porizena: '2026', zdroj: 'x' }); }
  /* POJISTKA v19.10.8: bez čerstvé kopie na Disk (záznam mladší 7 dní) se nemaže. */
  await s.zapis('2028-10-19', { zdroj: 'nocni-otisk' }); await s.zapis(Z.souhrnKlic('2028-10-19'), { porizena: 'x' });
  const bezKopie = await Z.retenceProved('2028-10-19', D);
  test('N5 v19.10.8: bez záznamu kopie na Disk retence nic nesmaže a čeká',
    bezKopie.smazano.length === 0 && bezKopie.ceka === 'retence čeká na první kopii na Disk' && pamet.has('zalohy/2028-09-19'), bezKopie);
  const ted = Date.now();
  const kopiePodlozena = (kdy, otisk) => ({ kdy, soubor: 'otisk_' + otisk + '.json', velikostB: 1234,
    sha256: 'b'.repeat(64), otisk, puvod: 'nocni-otisk', slozka: '_Zaloha Netlify DB', potvrzeno: 'heslo-spravce' });
  /* O6 (20. 10. 2026): hranice 7 dní se ověřuje s PODLOŽENÝM záznamem —
   * nepodložený zastaví retenci už K3-N1 a stáří kopie by se netestovalo
   * (mutace „7 dní stará" a „lhůta 8 dní" po O5 přežily). Pojistka: se
   * starým nepodloženým záznamem obě mutace přežijí, s tímto jsou chycené. */
  for (const [dnu, popis] of [[7, 'přesně 7 dní'], [8, '8 dní']]) {
    await s.zapis(Z.KOPIE_DISK_KLIC, kopiePodlozena(new Date(ted - dnu * 86400000).toISOString(), '2028-09-01'));
    const staraKopie = await Z.retenceProved('2028-10-19', D, ted);
    test('N5 v19.10.8: podložená kopie stará ' + popis + ' nestačí — nic se nesmaže a čeká se na kopii',
      staraKopie.smazano.length === 0 && staraKopie.ceka === 'retence čeká na první kopii na Disk'
      && pamet.has('zalohy/2028-09-19'), staraKopie);
  }
  test('N5 v19.10.8: kopie stará přesně 7 dní není čerstvá, 6 dní ano',
    !Z.kopieDiskCerstva({ kdy: new Date(ted - 7 * 86400000).toISOString() }, ted)
    && Z.kopieDiskCerstva({ kdy: new Date(ted - 6 * 86400000).toISOString() }, ted));
  test('N5 v19.10.8: kopie stará 6 dní 23 h stačí', Z.kopieDiskCerstva({ kdy: new Date(ted - 7 * 86400000 + 3600000).toISOString() }, ted)
    && !Z.kopieDiskCerstva({ kdy: 'x' }, ted) && !Z.kopieDiskCerstva(null, ted)
    && !Z.kopieDiskCerstva({ kdy: new Date(ted + 86400000).toISOString() }, ted));
  pamet.delete('zalohy/2028-10-19'); pamet.delete('zalohy/souhrn/2028-10-19');
  /* K3-N1 (20. 10. 2026): retenci odemkne jen PODLOŽENÝ záznam — kopie
   * nočního otisku, který v úložišti je, s nenulovou velikostí a platným
   * SHA-256. Záznam s polem navíc/chybějícím z prohlížeče nestačí
   * (pomocník kopiePodlozena je výš, u hranice 7 dní). */
  await s.zapis(Z.KOPIE_DISK_KLIC, kopiePodlozena(new Date(ted - 3600000).toISOString(), '2028-09-01'));
  /* selhání zápisu → nic se nemaže */
  const bez = await Z.retenceProved('2028-10-19', D);
  test('N5: nový otisk chybí (zápis selhal) → nesmaže se nic',
    bez.smazano.length === 0 && bez.chyby.length === 1 && (await s.seznam()).length === 11, bez);
  await s.zapis('2028-10-19', { zdroj: 'nocni-otisk' }); await s.zapis(Z.souhrnKlic('2028-10-19'), { porizena: 'x' });
  const dobra = kopiePodlozena(new Date(ted - 3600000).toISOString(), '2028-09-01');
  const nepodlozene = {
    'velikost 0': { ...dobra, velikostB: 0 },
    'bez velikosti': { ...dobra, velikostB: undefined },
    'prázdné sha256': { ...dobra, sha256: '' },
    'sha256 v jiném tvaru': { ...dobra, sha256: 'B'.repeat(64) },
    'otisk null': { ...dobra, otisk: null, soubor: 'otisk_2028-10-19.json' },
    'původ aktuální stav': { ...dobra, puvod: 'aktualni-stav' },
    'otisk v úložišti není': { ...dobra, otisk: '2028-08-15', soubor: 'otisk_2028-08-15.json' },
    'jméno souboru k jinému otisku': { ...dobra, soubor: 'otisk_2028-10-19.json' },
    'vynucený otisk místo nočního': { ...dobra, otisk: '2028-07-01T101010-rucne' },
    /* K3-N1 O7 (J. V. 20. 10. 2026): heslo správce a složka. Záznam zapsaný
     * před v20.10.2 (bez značky potvrzeno) retenci neodemkne. */
    'bez potvrzení heslem (záznam před v20.10.2)': { ...dobra, potvrzeno: undefined },
    'potvrzeno jinak než heslem': { ...dobra, potvrzeno: 'cookie' },
    'jiná složka než _Zaloha Netlify DB': { ...dobra, slozka: 'Stažené soubory' },
    'bez složky': { ...dobra, slozka: '' },
  };
  for (const [popis, z] of Object.entries(nepodlozene)) {
    test('K3-N1: nepodložený záznam kopie (' + popis + ') retenci neodemkne', !Z.kopieDiskPodlozena(z, [...pamet.keys()].map(k => k.slice(7))));
    await s.zapis(Z.KOPIE_DISK_KLIC, z);
    const rr = await Z.retenceProved('2028-10-19', D, ted);
    test('K3-N1: s nepodloženým záznamem (' + popis + ') se nesmaže nic a retence čeká',
      rr.smazano.length === 0 && /retence čeká/.test(rr.ceka || '') && pamet.has('zalohy/2028-09-19'), rr);
  }
  test('K3-N1: podložený záznam retenci odemkne', Z.kopieDiskPodlozena(dobra, [...pamet.keys()].map(k => k.slice(7))));
  await s.zapis(Z.KOPIE_DISK_KLIC, dobra);
  const r = await Z.retenceProved('2028-10-19', D);
  test('N5: smaže jen vybrané otisky i s jejich souhrny',
    JSON.stringify(r.smazano) === JSON.stringify(['2028-07-01T101010-rucne', '2028-09-02', '2028-09-19'])
    && !pamet.has('zalohy/2028-09-19') && !pamet.has('zalohy/souhrn/2028-09-19'), r);
  test('N5: dnešní, první v měsíci, před obnovou a záznam kopie zůstaly',
    ['2028-10-19', '2028-09-01', '2028-01-01T101010-pred-obnovou', 'kopie-disk', 'souhrn/2028-09-01'].every(k => pamet.has('zalohy/' + k)));
  /* Noční funkce běží „dnes"; aby šlo zkoušet mazání za hranicí RETENCE_OD,
   * posune se Date.now (denDnes i pojistka kopie z něj počítají). */
  const realNow = Date.now;
  const posun = Date.parse('2028-10-19T03:00:00Z');
  Date.now = () => posun;
  pamet.set('zalohy/kopie-disk', JSON.stringify(kopiePodlozena(new Date(posun - 3600000).toISOString(), '2028-09-01')));
  try {
  /* noční funkce bez čerstvé kopie: nic nesmaže a zaloguje čekání (v19.10.8) */
  const kopieZaznam = pamet.get('zalohy/kopie-disk');
  pamet.delete('zalohy/kopie-disk');
  await s.zapis('2028-01-04T101010-rucne', { zdroj: 'vynuceno' });
  const logyCek = [];
  { const l = console.log; console.log = (...a) => logyCek.push(a.join(' '));
    try { await zalohaNocni(); } finally { console.log = l; } }
  test('N5 v19.10.8: noční funkce bez kopie na Disk nesmaže nic a zaloguje „retence čeká na první kopii na Disk"',
    pamet.has('zalohy/2028-01-04T101010-rucne') && logyCek.some(x => /retence čeká na první kopii na Disk/.test(x)), logyCek);
  pamet.set('zalohy/kopie-disk', kopieZaznam);
  /* noční funkce: retence až po otisku, loguje počet a klíče */
  await s.zapis('2028-01-02T101010-rucne', { zdroj: 'vynuceno' });
  const logy = [];
  const l = console.log; console.log = (...a) => logy.push(a.join(' '));
  let noc; try { noc = await (await zalohaNocni()).json(); } finally { console.log = l; }
  test('N5: noční funkce po otisku smaže prošlé a zaloguje počet i klíče',
    noc.ok && noc.retence.smazano.includes('2028-01-02T101010-rucne') && !pamet.has('zalohy/2028-01-02T101010-rucne')
    && noc.retence.smazano.includes('2028-01-04T101010-rucne')
    && logy.some(x => /retence smazala \d+ otisků: .*2028-01-02T101010-rucne/.test(x)), { noc: noc && noc.retence, logy });
  /* selhání otisku → retence vůbec neběží */
  await s.zapis('2028-01-03T101010-rucne', { zdroj: 'vynuceno' });
  const puvodni = globalThis.__TEST_ULOZISTE;
  globalThis.__TEST_ULOZISTE = (n) => { const u = puvodni(n);
    return n === 'zalohy' ? { ...u, zapis: async (k, x) => { if (/^\d{4}-\d{2}-\d{2}$/.test(k)) throw new Error('Blobs nedostupné'); return u.zapis(k, x); } } : u; };
  let padla = false;
  const ce = console.error; console.error = () => {};
  try { await zalohaNocni(); } catch (e) { padla = true; } finally { globalThis.__TEST_ULOZISTE = puvodni; console.error = ce; }
  test('N5: když zápis otisku selže, funkce skončí chybou a nic se nesmaže',
    padla && pamet.has('zalohy/2028-01-03T101010-rucne'));
  /* staré zálohy (před RETENCE_OD) noční funkce nesmaže ani v roce 2028 */
  await s.zapis('2026-08-01', { zdroj: 'nocni-otisk' }); await s.zapis('2026-09-15T101010-rucne', { zdroj: 'vynuceno' });
  await ticho(async () => zalohaNocni());
  test('N5 hranice: noční funkce v roce 2028 staré zálohy z roku 2026 nesmaže',
    pamet.has('zalohy/2026-08-01') && pamet.has('zalohy/2026-09-15T101010-rucne'));
  } finally { Date.now = realNow; }
});

/* ---------------- N6: kopie na Disk ---------------- */
await zkus('N6', async () => {
  const s = ulz('zalohy');
  for (const k of [...pamet.keys()]) if (k.startsWith('zalohy/')) pamet.delete(k);   // otisky z N5 (rok 2028)
  await ulz('podpisy').zapis(ADMIN_EMAIL, { obrazek: 'data:image/png;base64,PODPISDATA' });
  await ulz('uzivatele').zapis('obchodnik@priklad.cz', { email: 'obchodnik@priklad.cz', jmeno: 'O', role: 'Obchodník', heslo: 'scrypt$TAJNE' });
  const noc = await ticho(async () => (await zalohaNocni()).json());
  await s.zapis(dnes() + 'T235959-rucne', { zdroj: 'vynuceno' });   // novější ruční nesmí vyhrát
  const r = await (await get(zalohaFn, 'http://x/api/zaloha?zdroj=nocni', cookie)).json();
  const t = JSON.stringify(r);
  test('N6: ?zdroj=nocni vrátí poslední NOČNÍ otisk', r.ok && r.puvod === 'nocni-otisk' && r.otisk === noc.den
    && r.zaloha.zdroj === 'nocni-otisk', { ok: r.ok, puvod: r.puvod, otisk: r.otisk });
  /* otisk pod klíčem dne s ručním zdrojem (tvar před v19.10.5) noční není */
  await s.zapis('2099-01-01', { porizena: '2099-01-01T08:00:00Z', zdroj: 'vynuceno', zakazky: {}, uzivatele: [] });
  const r1 = await (await get(zalohaFn, 'http://x/api/zaloha?zdroj=nocni', cookie)).json();
  test('N6: starší ruční otisk pod klíčem dne se přeskočí, vrátí se noční', r1.ok && r1.otisk === noc.den, { otisk: r1.otisk });
  pamet.delete('zalohy/2099-01-01');
  test('N6: kopie pro Disk nenese otisky hesel', !t.includes('scrypt$') && !t.includes('"heslo"')
    && r.zaloha.uzivatele.some(u => u.email === 'obchodnik@priklad.cz' && u.role === 'Obchodník'));
  test('N6: kopie pro Disk nenese podpisy', !t.includes('PODPISDATA') && r.zaloha.podpisy === null);
  test('N6: kopie nese data databáze (zakázky, firma)', Object.keys(r.zaloha.zakazky || {}).length > 0 && !!r.zaloha.firma);
  /* K3-N12 (O5): kopie bere části POVOLENÝM SEZNAMEM — nová část s tajemstvím
   * na Disk sama neodejde. Pojistka: před opravou KOPIE_DISK_CASTI chybí
   * a část navíc projde. */
  test('K3-N12: část mimo povolený seznam do kopie pro Disk nejde',
    !('noveTajne' in (Z.otiskProDisk({ porizena: 'x', zakazky: {}, uzivatele: [], noveTajne: 'TAJNE' }) || {})));
  test('K3-N12: povolený seznam pokrývá všechny dnešní části zálohy (otisk i doplňky)',
    Array.isArray(Z.KOPIE_DISK_CASTI) && [...Object.keys(await Z.zalohaDoplnky()), 'porizena', 'zdroj', 'kdo', 'program', 'firma',
      'rejstrik', 'zakazky', 'uzivatele', 'sablony'].every(k => Z.KOPIE_DISK_CASTI.includes(k)), Z.KOPIE_DISK_CASTI);
  test('K3-N12: kopie nese všechny povolené části otisku', Object.keys(r.zaloha).filter(k => k !== 'web')
    .every(k => (Z.KOPIE_DISK_CASTI || []).includes(k)) && 'zakaznici' in r.zaloha && 'smazani' in r.zaloha, Object.keys(r.zaloha));
  test('N6: ?zdroj=nocni bez přihlášení správce 401/403', [401, 403].includes((await get(zalohaFn, 'http://x/api/zaloha?zdroj=nocni', '')).status));
  /* bez nočního otisku → aktuální stav v tomtéž tvaru */
  for (const k of [...pamet.keys()]) if (/^zalohy\/\d{4}-\d{2}-\d{2}$/.test(k)) pamet.delete(k);
  const r2 = await (await get(zalohaFn, 'http://x/api/zaloha?zdroj=nocni', cookie)).json();
  test('N6: bez nočního otisku vrátí aktuální stav, bez hesel i podpisů', r2.ok && r2.puvod === 'aktualni-stav'
    && r2.otisk === null && r2.zaloha.podpisy === null && !JSON.stringify(r2).includes('PODPISDATA'), { puvod: r2.puvod });
  const bez = await (await get(zalohaFn, 'http://x/api/zaloha', cookie)).json();
  test('N6: běžná záloha ke stažení se nezměnila (podpisy v ní zůstávají)', bez.ok && !!bez.zaloha.podpisy);
  /* záznam o kopii — od O7 (K3-N1) jen s heslem správce a ze složky „_Zaloha Netlify DB" */
  const kopieTelo = { soubor: 'otisk_2026-10-19.json', velikostB: 1234, sha256: 'a'.repeat(64), otisk: '2026-10-19',
    puvod: 'nocni-otisk', slozka: '_Zaloha Netlify DB', data: 'NESMI' };
  const zaznamPred = pamet.get('zalohy/kopie-disk');
  const bezHesla = await post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', { akce: 'kopie-disk', kopie: kopieTelo }, cookie);
  const bezHeslaJ = await bezHesla.json();
  test('K3-N1 O7: záznam kopie bez hesla správce → 401 s kódem hesloSpravce a nic se nezapíše',
    bezHesla.status === 401 && bezHeslaJ.kod === 'hesloSpravce' && pamet.get('zalohy/kopie-disk') === zaznamPred, bezHeslaJ);
  const spatneHeslo = await post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', { akce: 'kopie-disk', kopie: kopieTelo,
    hesloSpravce: 'Spatne.Heslo.999' }, cookie);
  test('K3-N1 O7: se špatným heslem → 401 a nic se nezapíše',
    spatneHeslo.status === 401 && (await spatneHeslo.json()).kod === 'hesloSpravce' && pamet.get('zalohy/kopie-disk') === zaznamPred);
  const jinaSlozka = await post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', { akce: 'kopie-disk',
    kopie: { ...kopieTelo, slozka: 'Stažené soubory' }, hesloSpravce: 'Docasne.Heslo.123' }, cookie);
  const jinaSlozkaJ = await jinaSlozka.json();
  test('K3-N1 O7: kopie z jiné složky → 400 s hláškou o „_Zaloha Netlify DB" a nic se nezapíše',
    jinaSlozka.status === 400 && /_Zaloha Netlify DB/.test(jinaSlozkaJ.chyba) && pamet.get('zalohy/kopie-disk') === zaznamPred, jinaSlozkaJ);
  const zap = await (await post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', { akce: 'kopie-disk',
    kopie: kopieTelo, hesloSpravce: 'Docasne.Heslo.123' }, cookie)).json();
  test('N6: záznam kopie se uloží a vrátí', zap.ok && zap.kopieDisk.soubor === 'otisk_2026-10-19.json'
    && zap.kopieDisk.kdo === ADMIN_EMAIL && zap.kopieDisk.velikostB === 1234, zap);
  test('K3-N1 O7: uložený záznam nese složku a značku potvrzení heslem (podložený, když otisk existuje)',
    zap.ok && zap.kopieDisk.slozka === '_Zaloha Netlify DB' && zap.kopieDisk.potvrzeno === 'heslo-spravce'
    && Z.kopieDiskPodlozena(zap.kopieDisk, ['2026-10-19']), zap.kopieDisk);
  test('N6: záznam kopie nenese nic navíc', !JSON.stringify(zap).includes('NESMI'));
  const g = await (await get(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', cookie)).json();
  test('N6: GET přehledu záloh vrací záznam poslední kopie', g.ok && g.kopieDisk && g.kopieDisk.sha256 === 'a'.repeat(64));
  const pocetPred = (await s.seznam()).length;
  const spatne = await post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', { akce: 'kopie-disk', kopie: { ...kopieTelo, soubor: '../x.json' },
    hesloSpravce: 'Docasne.Heslo.123' }, cookie);
  test('N6: záznam kopie s neplatným jménem souboru 400 (a otisk nevznikne)', spatne.status === 400);
  test('N6: odmítnutý záznam kopie nezapíše nic (ani otisk)', (await s.seznam()).length === pocetPred);
});

/* ---------------- K3-N4 (O7): limit vynucených otisků ---------------- */
await zkus('K3-N4', async () => {
  const L = Z.vynuceneLimit;
  const T0 = Date.parse('2028-03-10T12:00:00Z');
  const klic = (msZpet, druh) => Z.klicVynuceny(druh || 'rucne', T0 - msZpet);
  test('K3-N4: limity podle J. V. — 10 minut odstup, 20 za den', Z.VYNUCENE_ODSTUP_MS === 600000 && Z.VYNUCENE_ZA_DEN === 20);
  test('K3-N4: bez vynucených otisků projde', L([], T0).ok === true && L(['2028-03-10', 'kopie-disk'], T0).ok === true);
  const r5 = L([klic(5 * 60000)], T0);
  test('K3-N4: otisk před 5 min → odmítnuto, další za 5 min, hláška s časem (Praha)',
    r5.ok === false && r5.dalsiMs === T0 + 5 * 60000 && /mladší než 10 minut/.test(r5.chyba) && /dnes v 13:05/.test(r5.chyba), r5);
  test('K3-N4: hranice — přesně 10 min projde, 9 min 59 s ne',
    L([klic(600000)], T0).ok === true && L([klic(599000)], T0).ok === false);
  test('K3-N4: auto se počítá stejně jako ruční', L([klic(60000, 'auto')], T0).ok === false);
  test('K3-N4: noční otisk a otisk před obnovou se nepočítají',
    L(['2028-03-10', Z.klicPredObnovou(T0 - 60000), '2028-03-10T115900-pred-obnovou'], T0).ok === true);
  const den = (n, odstupMs) => Array.from({ length: n }, (_, i) => klic(3600000 + i * (odstupMs || 30 * 60000)));
  test('K3-N4: 19 za 24 h projde', L(den(19), T0).ok === true);
  const r20 = L(den(20), T0);
  const nejstarsi = T0 - 3600000 - 19 * 30 * 60000;
  test('K3-N4: 20 za 24 h → odmítnuto do 24 h od nejstaršího z dvaceti, hláška o denním limitu',
    r20.ok === false && r20.dalsiMs === nejstarsi + 86400000 && /20 vynucených záloh/.test(r20.chyba), r20);
  test('K3-N4: otisk starší 24 h se do denního limitu nepočítá',
    L(den(19).concat([Z.klicVynuceny('rucne', T0 - 86400000)]), T0).ok === true
    && L(den(19).concat([Z.klicVynuceny('rucne', T0 - 86400000 + 1000)]), T0).ok === false);
  test('K3-N4: zítřejší den v hlášce s datem', /znovu to půjde 11\. 3\. 2028/i.test(L(den(20, 60000), T0).chyba || '')
    || /11\. 3\. 2028/.test(L(den(20, 60000), T0).chyba || ''), L(den(20, 60000), T0).chyba);

  /* přes API */
  for (const k of [...pamet.keys()]) if (k.startsWith('zalohy/')) pamet.delete(k);
  const prvni = await (await post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', { duvod: 'rucne' }, cookie)).json();
  test('K3-N4: první ruční otisk projde', prvni.ok === true, prvni);
  const pocet = (await ulz('zalohy').seznam()).length;
  const druhy = await post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', { duvod: 'rucne' }, cookie);
  const druhyJ = await druhy.json();
  test('K3-N4: druhý hned po něm → 429, kód limitZalohy, kdy to půjde, a otisk nevznikne',
    druhy.status === 429 && druhyJ.kod === 'limitZalohy' && /Znovu to půjde/.test(druhyJ.chyba) && !!Date.parse(druhyJ.dalsi)
    && (await ulz('zalohy').seznam()).length === pocet, druhyJ);
  const auto = await post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', { duvod: 'auto' }, cookie);
  test('K3-N4: otisk při přihlášení je pod týmž limitem (429)', auto.status === 429);
  const noc = await ticho(async () => (await zalohaNocni()).json());
  test('K3-N4: noční otisk limit nezastaví', noc.ok === true && pamet.has('zalohy/' + noc.den));
  const pred = await Z.porizOtisk('pred-obnovou', ADMIN_EMAIL, Z.klicPredObnovou());
  test('K3-N4: otisk před obnovou limit nezastaví a do limitu se nepočítá',
    !!pred.den && Z.vynuceneLimit([pred.den, noc.den], Date.now()).ok === true);
  test('K3-N4: o 11 minut později projde', (await postVynuceny({ duvod: 'rucne' })).ok === true);
  test('K3-N4: GET přehledu limit neomezuje', (await get(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', cookie)).status === 200);
});

/* ---------------- K3-N13 (O7): pojistka retence proti tiché ztrátě dat ---------------- */
await zkus('K3-N13', async () => {
  const P = Z.retencePoklesPocty;
  test('K3-N13: práh 50 %', Z.RETENCE_POKLES_PRAH === 0.5);
  test('K3-N13: zakázek 100 → 49 je pokles', JSON.stringify(P({ pocetZakazek: 100, pocetUctu: 10 }, { pocetZakazek: 49, pocetUctu: 10 }))
    === JSON.stringify(['zakázek 100 → 49']));
  test('K3-N13: hranice — přesně 50 % pokles není', P({ pocetZakazek: 100, pocetUctu: 10 }, { pocetZakazek: 50, pocetUctu: 5 }) === null);
  test('K3-N13: účtů 10 → 4 je pokles i při stejných zakázkách',
    JSON.stringify(P({ pocetZakazek: 100, pocetUctu: 10 }, { pocetZakazek: 100, pocetUctu: 4 })) === JSON.stringify(['účtů 10 → 4']));
  test('K3-N13: z nuly se pokles nepočítá; nárůst není pokles',
    P({ pocetZakazek: 0, pocetUctu: 0 }, { pocetZakazek: 0, pocetUctu: 0 }) === null && P({ pocetZakazek: 5, pocetUctu: 2 }, { pocetZakazek: 50, pocetUctu: 20 }) === null);

  const s = ulz('zalohy');
  const D = '2028-10-19';
  const ted = Date.parse('2028-10-19T03:00:00Z');
  const pripravit = async (nove, predchozi) => {
    for (const k of [...pamet.keys()]) if (k.startsWith('zalohy/')) pamet.delete(k);
    /* staré otisky, které by retence smazala */
    for (const k of ['2028-09-02', '2028-09-03'])
      { await s.zapis(k, { zdroj: 'x' }); await s.zapis(Z.souhrnKlic(k), { porizena: 'x', zdroj: 'x', pocetZakazek: 100, pocetUctu: 10 }); }
    for (const [k, v] of Object.entries(predchozi)) { await s.zapis(k, { zdroj: v.zdroj }); await s.zapis(Z.souhrnKlic(k), { porizena: 'x', ...v }); }
    await s.zapis(D, { zdroj: 'nocni-otisk' }); await s.zapis(Z.souhrnKlic(D), { porizena: 'x', zdroj: 'nocni-otisk', ...nove });
    await s.zapis('2028-09-01', { zdroj: 'nocni-otisk' });
    await s.zapis(Z.KOPIE_DISK_KLIC, { kdy: new Date(ted - 3600000).toISOString(), soubor: 'otisk_2028-09-01.json', velikostB: 1234,
      sha256: 'b'.repeat(64), otisk: '2028-09-01', puvod: 'nocni-otisk', slozka: '_Zaloha Netlify DB', potvrzeno: 'heslo-spravce' });
  };
  const nocni = (z, u) => ({ zdroj: 'nocni-otisk', pocetZakazek: z, pocetUctu: u });
  await pripravit({ pocetZakazek: 40, pocetUctu: 10 }, { '2028-10-18': nocni(100, 10) });
  const r = await Z.retenceProved(D, D, ted);
  const zaznam = await s.cti(Z.RETENCE_VAROVANI_KLIC);
  test('K3-N13: pokles zakázek pod polovinu → retence se přeskočí, nic se nesmaže (i s podloženou kopií)',
    r.smazano.length === 0 && /retence přeskočena/.test(r.ceka || '') && pamet.has('zalohy/2028-09-02') && pamet.has('zalohy/2028-09-03'), r);
  test('K3-N13: varování nese dny a počty a uloží se pro hlídku',
    !!r.varovani && !!zaznam && zaznam.den === D && zaznam.predchozi === '2028-10-18' && zaznam.pred.pocetZakazek === 100
    && zaznam.nove.pocetZakazek === 40 && /zakázek 100 → 40/.test(zaznam.text) && !!Date.parse(zaznam.kdy), zaznam);
  await pripravit({ pocetZakazek: 60, pocetUctu: 6 }, { '2028-10-18': nocni(100, 10) });
  const r2 = await Z.retenceProved(D, D, ted);
  test('K3-N13: pokles nad polovinou → retence proběhne', JSON.stringify(r2.smazano) === JSON.stringify(['2028-09-02', '2028-09-03']), r2);
  await pripravit({ pocetZakazek: 100, pocetUctu: 4 }, { '2028-10-18': nocni(100, 10) });
  test('K3-N13: pokles účtů pod polovinu → přeskočí', (await Z.retenceProved(D, D, ted)).smazano.length === 0);
  /* porovnává se s předchozím NOČNÍM, vynucený / jiný zdroj se přeskočí */
  await pripravit({ pocetZakazek: 40, pocetUctu: 10 }, { '2028-10-18': { zdroj: 'vynuceno', pocetZakazek: 40, pocetUctu: 10 },
    '2028-10-17': nocni(100, 10) });
  const r3 = await Z.retenceProved(D, D, ted);
  test('K3-N13: porovnává se s předchozím nočním (otisk jiného zdroje se přeskočí)',
    r3.smazano.length === 0 && r3.varovani && r3.varovani.predchozi === '2028-10-17', r3);
  await pripravit({ pocetZakazek: 40, pocetUctu: 10 }, {});
  test('K3-N13: bez předchozího nočního se nic neporovnává (retence běží)', (await Z.retenceProved(D, D, ted)).smazano.length === 2);
  /* noční funkce: varování do logu, přehled ho vrací */
  const realNow = Date.now; Date.now = () => ted;
  try {
    for (const k of [...pamet.keys()]) if (k.startsWith('zalohy/') || k.startsWith('zakazky/')) pamet.delete(k);
    for (let i = 0; i < 6; i++) await ulz('zakazky').zapis('z/N13-' + i + '.json', { nazev: 'N13 ' + i });
    await s.zapis('2028-10-18', { zdroj: 'nocni-otisk' }); await s.zapis(Z.souhrnKlic('2028-10-18'), { porizena: 'x', ...nocni(100, 1) });
    const logy = [], varovani = [];
    const l = console.log, w = console.warn;
    console.log = (...a) => logy.push(a.join(' ')); console.warn = (...a) => varovani.push(a.join(' '));
    let noc; try { noc = await (await zalohaNocni()).json(); } finally { console.log = l; console.warn = w; }
    test('K3-N13: noční funkce zaloguje VAROVÁNÍ a nic nesmaže', noc.ok && noc.retence.smazano.length === 0
      && varovani.some(x => /VAROVÁNÍ — retence přeskočena — noční otisk 2028-10-19 .*zakázek 100 → 6/.test(x)), { varovani, r: noc && noc.retence });
  } finally { Date.now = realNow; }
  const g = await (await get(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', cookie)).json();
  test('K3-N13: přehled záloh vrací varování pro hlídku', g.ok && g.retenceVarovani && g.retenceVarovani.den === '2028-10-19', g.retenceVarovani);
});

/* ---------------- O9: K4-N12 (vstup jako text) a K4-N14 (čerstvý otisk kopie) ---------------- */
await zkus('O9', async () => {
  /* K4-N12: objekt s klíčem „toString" (z JSON, ne funkce) → String() vyhodil
   * výjimku → HTTP 500. Teď 400 / běžná odpověď. Pojistka: před opravou
   * 4 FAIL (výjimka = 500), po opravě projde. */
  const stav = async (telo) => { try { return (await post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', telo, cookie)).status; }
    catch (e) { return 500; } };
  const OBJ = { toString: 1, valueOf: 1 };
  const kopie = { soubor: 'otisk_2026-10-19.json', velikostB: 1, sha256: 'c'.repeat(64), otisk: '2026-10-19',
    puvod: 'nocni-otisk', slozka: '_Zaloha Netlify DB' };
  test('K4-N12: soubor jako objekt → 400, ne 500', await stav({ akce: 'kopie-disk', kopie: { ...kopie, soubor: OBJ },
    hesloSpravce: 'Docasne.Heslo.123' }) === 400);
  test('K4-N12: složka jako objekt → 400, ne 500', await stav({ akce: 'kopie-disk', kopie: { ...kopie, slozka: OBJ },
    hesloSpravce: 'Docasne.Heslo.123' }) === 400);
  let zap = null;
  try { zap = await (await post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', { akce: 'kopie-disk',
    kopie: { ...kopie, velikostB: OBJ, sha256: OBJ, otisk: OBJ }, hesloSpravce: 'Docasne.Heslo.123' }, cookie)).json(); } catch (e) { zap = null; }
  test('K4-N12: velikost, SHA a otisk jako objekt → záznam bez nich (0, prázdné, null), ne 500',
    !!zap && zap.ok && zap.kopieDisk.velikostB === 0 && zap.kopieDisk.sha256 === '' && zap.kopieDisk.otisk === null, zap);
  let vyn = null;
  try { vyn = await postVynuceny({ duvod: OBJ }); } catch (e) { vyn = null; }
  test('K4-N12: důvod vynuceného otisku jako objekt → ruční otisk, ne 500', !!vyn && vyn.ok && /-rucne$/.test(vyn.den), vyn);
  test('K4-N12: tělo jako pole / číslo → běžná odpověď, ne 500',
    (await stav([1, 2])) !== 500 && (await stav(7)) !== 500 && (await stav({ akce: 'kopie-disk', kopie: 'x' })) === 400);

  /* K4-N14: retenci odemkne jen kopie jednoho ze 7 nejnovějších nočních
   * otisků. Pojistka: před opravou 8. nejnovější (a starý otisk z roku
   * 2026 mezi novými) prošel → 2 FAIL. */
  const dny = Array.from({ length: 8 }, (_, i) => '2028-10-' + String(12 + i).padStart(2, '0'));   // 12. … 19. 10.
  const zaznam = (otisk) => ({ kdy: '2028-10-19T08:00:00Z', soubor: 'otisk_' + otisk + '.json', velikostB: 1,
    sha256: 'd'.repeat(64), otisk, puvod: 'nocni-otisk', slozka: '_Zaloha Netlify DB', potvrzeno: 'heslo-spravce' });
  const klice = dny.concat(['2026-08-01', '2028-10-19T101010-rucne', 'souhrn/2028-10-19', 'kopie-disk']);
  test('K4-N14: nejnovější a 7. nejnovější noční otisk → podložená kopie',
    Z.kopieDiskPodlozena(zaznam('2028-10-19'), klice) && Z.kopieDiskPodlozena(zaznam('2028-10-13'), klice));
  test('K4-N14: 8. nejnovější noční otisk → nepodložená', !Z.kopieDiskPodlozena(zaznam('2028-10-12'), klice));
  test('K4-N14: starý otisk (2026-08-01, staré se nemažou) → nepodložená', !Z.kopieDiskPodlozena(zaznam('2026-08-01'), klice));
  test('K4-N14: vynucené otisky a souhrny se mezi 7 nejnovějších nepočítají',
    Z.kopieDiskPodlozena(zaznam('2028-10-13'), klice.concat(['2028-10-20T000000-rucne', '2028-10-21T000000-auto', 'souhrn/2028-10-25'])));

  /* K4-N5: limit vynucených otisků bez souběhu. Pojistka: před opravou
   * 5 souběžných požadavků → 5× 200 a cizí rezervace limit nezastaví
   * (FAIL), po opravě 1× 200 + 4× 429 a 429 při cizí rezervaci. */
  const vynKlice = () => [...pamet.keys()].filter(k => /^zalohy\/\d{4}-\d{2}-\d{2}T\d{6}-(rucne|auto)$/.test(k));
  const rezKlice = () => [...pamet.keys()].filter(k => k.startsWith('zalohy/vynucene-rezervace/'));
  const sHodinami = async (fn) => { posunHodin += 11 * 60000; const puv = Date.now;
    Date.now = () => puv.call(Date) + posunHodin; try { return await fn(); } finally { Date.now = puv; } };
  for (const k of [...pamet.keys()]) if (k.startsWith('zalohy/')) pamet.delete(k);
  const puvodni = globalThis.__TEST_ULOZISTE;
  /* pořízení otisku trvá (čtení zakázek zpomalené o 30 ms), jako u skutečné databáze */
  globalThis.__TEST_ULOZISTE = (n) => { const u = puvodni(n); if (n !== 'zakazky') return u;
    return { ...u, async seznam(p) { await new Promise(r => setTimeout(r, 30)); return u.seznam(p); } }; };
  let stavy = [];
  try {
    stavy = await sHodinami(() => Promise.all(Array.from({ length: 5 }, () =>
      post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', { duvod: 'rucne' }, cookie).then(r => r.status))));
  } finally { globalThis.__TEST_ULOZISTE = puvodni; }
  test('K4-N5: 5 souběžných vynucených otisků → jeden projde, 4× 429', stavy.filter(x => x === 200).length === 1
    && stavy.filter(x => x === 429).length === 4, stavy);
  test('K4-N5: vznikl jeden vynucený otisk a žádná rezervace nezůstala', vynKlice().length === 1 && rezKlice().length === 0,
    [vynKlice(), rezKlice()]);
  /* jiná instance funkce zarezervuje slot mezi naší první kontrolou a zápisem rezervace */
  for (const k of [...pamet.keys()]) if (k.startsWith('zalohy/')) pamet.delete(k);
  let cizi = null;
  globalThis.__TEST_ULOZISTE = (n) => { const u = puvodni(n); if (n !== 'zalohy') return u;
    return { ...u, async zapis(k, v) { if (k.startsWith(Z.VYNUCENE_REZERVACE) && !cizi) {
      cizi = Z.VYNUCENE_REZERVACE + Z.klicVynuceny('rucne', Date.now()) + '~0bcdef12';
      pamet.set('zalohy/' + cizi, JSON.stringify({ kdy: new Date().toISOString(), kdo: 'jina-instance' })); }
      return u.zapis(k, v); } }; };
  let soub = null;
  try { soub = await sHodinami(() => post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', { duvod: 'rucne' }, cookie)); }
  finally { globalThis.__TEST_ULOZISTE = puvodni; }
  test('K4-N5: cizí rezervace z jiné instance → 429, otisk nevznikne, vlastní rezervace smazaná, cizí zůstala',
    !!soub && soub.status === 429 && vynKlice().length === 0 && rezKlice().length === 1 && rezKlice()[0] === 'zalohy/' + cizi,
    [soub && soub.status, vynKlice(), rezKlice()]);
  const T1 = Date.parse('2028-03-10T12:00:00Z');
  const slot = (ms, druh) => Z.klicVynuceny(druh || 'rucne', T1 - ms);
  test('K4-N5: rezervace se do limitu počítá jako otisk (10 min)',
    Z.vynuceneLimit([Z.VYNUCENE_REZERVACE + slot(60000) + '~ab12cd34'], T1).ok === false
    && Z.vynuceneLimit([Z.VYNUCENE_REZERVACE + slot(11 * 60000) + '~ab12cd34'], T1).ok === true);
  const den19 = Array.from({ length: 19 }, (_, i) => slot(3600000 + i * 30 * 60000));
  test('K4-N5: otisk a jeho rezervace = jeden slot (19 + rezervace téhož slotu projde, cizí 20. ne)',
    Z.vynuceneLimit(den19.concat([Z.VYNUCENE_REZERVACE + den19[0] + '~ab12cd34']), T1).ok === true
    && Z.vynuceneLimit(den19.concat([Z.VYNUCENE_REZERVACE + slot(2 * 3600000 + 60000) + '~ab12cd34']), T1).ok === false);
  test('K4-N5: rezervace bez náhodné přípony, cizí klíče a vnořené cesty se nepočítají',
    Z.vynuceneLimit([Z.VYNUCENE_REZERVACE + slot(60000), slot(60000) + '~ab12cd34', 'x/' + slot(60000)], T1).ok === true);
  /* stará rezervace (pád funkce) se uklidí a limit po 24 h nedrží */
  for (const k of [...pamet.keys()]) if (k.startsWith('zalohy/')) pamet.delete(k);
  const stara = 'zalohy/' + Z.VYNUCENE_REZERVACE + Z.klicVynuceny('rucne', Date.now() + posunHodin - 25 * 3600000) + '~deadbeef';
  pamet.set(stara, JSON.stringify({ kdy: 'x' }));
  const poStare = await postVynuceny({ duvod: 'rucne' });
  test('K4-N5: rezervace starší 24 h limit nedrží a uklidí se', poStare.ok === true && !pamet.has(stara) && rezKlice().length === 0, poStare);
});

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
