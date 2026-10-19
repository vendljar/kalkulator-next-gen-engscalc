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
  'kopie-disk': ['zalohy', false],         // záznam o kopii na Disk (#151 N6), ne data
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
  const D = '2026-10-19';
  const v = (klice) => V(klice, D);
  test('N5: hranice 30. dne — věk 29 dní zůstane, 30 dní se smaže',
    JSON.stringify(v(['2026-10-19', '2026-09-20', '2026-09-19', '2026-09-05'])) === JSON.stringify(['2026-09-19']), v(['2026-10-19', '2026-09-20', '2026-09-19', '2026-09-05']));
  test('N5: z měsíce se drží první (nejstarší) otisk, ostatní staré se smažou',
    JSON.stringify(v(['2026-10-19', '2026-08-03', '2026-08-04', '2026-08-31'])) === JSON.stringify(['2026-08-04', '2026-08-31']));
  test('N5: hranice 12. měsíce — měsíc dneška + 12 zpět (říjen 2025) drží, září 2025 se smaže',
    JSON.stringify(v(['2026-10-19', '2025-10-01', '2025-09-01'])) === JSON.stringify(['2025-09-01']));
  test('N5: vynucené — 89 dní zůstane, 90 dní se smaže (ruční i při přihlášení)',
    JSON.stringify(v(['2026-10-19', '2026-07-22T101010-rucne', '2026-07-21T101010-rucne', '2026-07-21T090000-auto']))
      === JSON.stringify(['2026-07-21T090000-auto', '2026-07-21T101010-rucne']));
  test('N5: otisky před obnovou se nemažou nikdy (oba tvary)',
    v(['2026-10-19', '2024-01-01T101010-pred-obnovou', '2024-01-01-pred-obnovou']).length === 0);
  test('N5: nejnovější otisk se nesmaže, i když je starý',
    v(['2025-01-05']).length === 0 && JSON.stringify(v(['2025-01-05', '2025-01-06'])) === JSON.stringify(['2025-01-05']));
  test('N5: cizí klíče (souhrny, tokeny, kopie-disk) výběr nevidí',
    v(['2026-10-19', 'souhrn/2020-01-02', 'obnova-abc', 'kopie-disk', 'nesmysl']).length === 0);
  test('N5: neplatný dnešek = nemaže se nic', V(['2020-01-01', '2020-01-02'], 'x').length === 0);

  /* Provedení nad úložištěm */
  const s = ulz('zalohy');
  for (const k of [...pamet.keys()]) if (k.startsWith('zalohy/')) pamet.delete(k);
  for (const k of ['2026-09-19', '2026-09-01', '2026-09-02', '2026-07-01T101010-rucne', '2026-01-01T101010-pred-obnovou'])
    { await s.zapis(k, { zdroj: 'x' }); await s.zapis(Z.souhrnKlic(k), { porizena: '2026', zdroj: 'x' }); }
  /* POJISTKA v19.10.8: bez čerstvé kopie na Disk (záznam mladší 7 dní) se nemaže. */
  await s.zapis('2026-10-19', { zdroj: 'nocni-otisk' }); await s.zapis(Z.souhrnKlic('2026-10-19'), { porizena: 'x' });
  const bezKopie = await Z.retenceProved('2026-10-19', D);
  test('N5 v19.10.8: bez záznamu kopie na Disk retence nic nesmaže a čeká',
    bezKopie.smazano.length === 0 && bezKopie.ceka === 'retence čeká na první kopii na Disk' && pamet.has('zalohy/2026-09-19'), bezKopie);
  const ted = Date.now();
  await s.zapis(Z.KOPIE_DISK_KLIC, { kdy: new Date(ted - 7 * 86400000).toISOString(), soubor: 'otisk_2026-10-12.json' });
  const staraKopie = await Z.retenceProved('2026-10-19', D, ted);
  test('N5 v19.10.8: kopie stará přesně 7 dní nestačí — nic se nesmaže',
    staraKopie.smazano.length === 0 && !!staraKopie.ceka && pamet.has('zalohy/2026-09-19'), staraKopie);
  test('N5 v19.10.8: kopie stará 6 dní 23 h stačí', Z.kopieDiskCerstva({ kdy: new Date(ted - 7 * 86400000 + 3600000).toISOString() }, ted)
    && !Z.kopieDiskCerstva({ kdy: 'x' }, ted) && !Z.kopieDiskCerstva(null, ted)
    && !Z.kopieDiskCerstva({ kdy: new Date(ted + 86400000).toISOString() }, ted));
  pamet.delete('zalohy/2026-10-19'); pamet.delete('zalohy/souhrn/2026-10-19');
  await s.zapis(Z.KOPIE_DISK_KLIC, { kdy: new Date(ted - 3600000).toISOString(), soubor: 'otisk_2026-10-18.json' });
  /* selhání zápisu → nic se nemaže */
  const bez = await Z.retenceProved('2026-10-19', D);
  test('N5: nový otisk chybí (zápis selhal) → nesmaže se nic',
    bez.smazano.length === 0 && bez.chyby.length === 1 && (await s.seznam()).length === 11, bez);
  await s.zapis('2026-10-19', { zdroj: 'nocni-otisk' }); await s.zapis(Z.souhrnKlic('2026-10-19'), { porizena: 'x' });
  const r = await Z.retenceProved('2026-10-19', D);
  test('N5: smaže jen vybrané otisky i s jejich souhrny',
    JSON.stringify(r.smazano) === JSON.stringify(['2026-07-01T101010-rucne', '2026-09-02', '2026-09-19'])
    && !pamet.has('zalohy/2026-09-19') && !pamet.has('zalohy/souhrn/2026-09-19'), r);
  test('N5: dnešní, první v měsíci, před obnovou a záznam kopie zůstaly',
    ['2026-10-19', '2026-09-01', '2026-01-01T101010-pred-obnovou', 'kopie-disk', 'souhrn/2026-09-01'].every(k => pamet.has('zalohy/' + k)));
  /* noční funkce bez čerstvé kopie: nic nesmaže a zaloguje čekání (v19.10.8) */
  const kopieZaznam = pamet.get('zalohy/kopie-disk');
  pamet.delete('zalohy/kopie-disk');
  await s.zapis('2026-01-04T101010-rucne', { zdroj: 'vynuceno' });
  const logyCek = [];
  { const l = console.log; console.log = (...a) => logyCek.push(a.join(' '));
    try { await zalohaNocni(); } finally { console.log = l; } }
  test('N5 v19.10.8: noční funkce bez kopie na Disk nesmaže nic a zaloguje „retence čeká na první kopii na Disk"',
    pamet.has('zalohy/2026-01-04T101010-rucne') && logyCek.some(x => /retence čeká na první kopii na Disk/.test(x)), logyCek);
  pamet.set('zalohy/kopie-disk', kopieZaznam);
  /* noční funkce: retence až po otisku, loguje počet a klíče */
  await s.zapis('2026-01-02T101010-rucne', { zdroj: 'vynuceno' });
  const logy = [];
  const l = console.log; console.log = (...a) => logy.push(a.join(' '));
  let noc; try { noc = await (await zalohaNocni()).json(); } finally { console.log = l; }
  test('N5: noční funkce po otisku smaže prošlé a zaloguje počet i klíče',
    noc.ok && noc.retence.smazano.includes('2026-01-02T101010-rucne') && !pamet.has('zalohy/2026-01-02T101010-rucne')
    && noc.retence.smazano.includes('2026-01-04T101010-rucne')
    && logy.some(x => /retence smazala \d+ otisků: .*2026-01-02T101010-rucne/.test(x)), { noc: noc && noc.retence, logy });
  /* selhání otisku → retence vůbec neběží */
  await s.zapis('2026-01-03T101010-rucne', { zdroj: 'vynuceno' });
  const puvodni = globalThis.__TEST_ULOZISTE;
  globalThis.__TEST_ULOZISTE = (n) => { const u = puvodni(n);
    return n === 'zalohy' ? { ...u, zapis: async (k, x) => { if (/^\d{4}-\d{2}-\d{2}$/.test(k)) throw new Error('Blobs nedostupné'); return u.zapis(k, x); } } : u; };
  let padla = false;
  const ce = console.error; console.error = () => {};
  try { await zalohaNocni(); } catch (e) { padla = true; } finally { globalThis.__TEST_ULOZISTE = puvodni; console.error = ce; }
  test('N5: když zápis otisku selže, funkce skončí chybou a nic se nesmaže',
    padla && pamet.has('zalohy/2026-01-03T101010-rucne'));
});

/* ---------------- N6: kopie na Disk ---------------- */
await zkus('N6', async () => {
  const s = ulz('zalohy');
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
  test('N6: ?zdroj=nocni bez přihlášení správce 401/403', [401, 403].includes((await get(zalohaFn, 'http://x/api/zaloha?zdroj=nocni', '')).status));
  /* bez nočního otisku → aktuální stav v tomtéž tvaru */
  for (const k of [...pamet.keys()]) if (/^zalohy\/\d{4}-\d{2}-\d{2}$/.test(k)) pamet.delete(k);
  const r2 = await (await get(zalohaFn, 'http://x/api/zaloha?zdroj=nocni', cookie)).json();
  test('N6: bez nočního otisku vrátí aktuální stav, bez hesel i podpisů', r2.ok && r2.puvod === 'aktualni-stav'
    && r2.otisk === null && r2.zaloha.podpisy === null && !JSON.stringify(r2).includes('PODPISDATA'), { puvod: r2.puvod });
  const bez = await (await get(zalohaFn, 'http://x/api/zaloha', cookie)).json();
  test('N6: běžná záloha ke stažení se nezměnila (podpisy v ní zůstávají)', bez.ok && !!bez.zaloha.podpisy);
  /* záznam o kopii */
  const zap = await (await post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', { akce: 'kopie-disk',
    kopie: { soubor: 'otisk_2026-10-19.json', velikostB: 1234, sha256: 'a'.repeat(64), otisk: '2026-10-19',
      puvod: 'nocni-otisk', slozka: '_Zaloha Netlify DB', data: 'NESMI' } }, cookie)).json();
  test('N6: záznam kopie se uloží a vrátí', zap.ok && zap.kopieDisk.soubor === 'otisk_2026-10-19.json'
    && zap.kopieDisk.kdo === ADMIN_EMAIL && zap.kopieDisk.velikostB === 1234, zap);
  test('N6: záznam kopie nenese nic navíc', !JSON.stringify(zap).includes('NESMI'));
  const g = await (await get(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', cookie)).json();
  test('N6: GET přehledu záloh vrací záznam poslední kopie', g.ok && g.kopieDisk && g.kopieDisk.sha256 === 'a'.repeat(64));
  const pocetPred = (await s.seznam()).length;
  const spatne = await post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', { akce: 'kopie-disk', kopie: { soubor: '../x.json' } }, cookie);
  test('N6: záznam kopie s neplatným jménem souboru 400 (a otisk nevznikne)', spatne.status === 400);
  test('N6: odmítnutý záznam kopie nezapíše nic (ani otisk)', (await s.seznam()).length === pocetPred);
});

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
