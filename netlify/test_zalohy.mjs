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
  const ruc = await (await post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', { duvod: 'rucne' }, cookie)).json();
  test('N1: ruční otisk má vlastní klíč s časem (<den>T<hhmmss>-rucne)',
    ruc.ok && /^\d{4}-\d{2}-\d{2}T\d{6}-rucne$/.test(ruc.den) && ruc.den.startsWith(dnes() + 'T'), ruc);
  const nocniPo = await ulz('zalohy').cti(dnes());
  test('N1: noční otisk dne zůstal (zdroj, čas i stav před pokažením)',
    !!nocniPo && nocniPo.zdroj === 'nocni-otisk' && nocniPo.porizena === nocniPred.porizena
    && nocniPo.firma.udaje.nazev === 'Před ruční zálohou s.r.o.', nocniPo && { zdroj: nocniPo.zdroj, firma: nocniPo.firma });
  const rucni = await ulz('zalohy').cti(ruc.den);
  test('N1: ruční otisk nese aktuální stav, zdroj „vynuceno" a kdo', !!rucni && rucni.firma.udaje.nazev === 'POKAŽENO'
    && rucni.zdroj === 'vynuceno' && rucni.kdo === ADMIN_EMAIL);
  const aut = await (await post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', { duvod: 'auto' }, cookie)).json();
  test('N1: otisk při přihlášení má slot -auto', aut.ok && /^\d{4}-\d{2}-\d{2}T\d{6}-auto$/.test(aut.den), aut);
  const bezTela = await (await zalohaVynuceno(new Request('http://x/api/zaloha_vynuceno',
    { method: 'POST', headers: { cookie } }))).json();
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

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
