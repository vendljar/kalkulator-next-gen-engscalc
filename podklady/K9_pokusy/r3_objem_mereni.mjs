/* K9 #526 R3 — měření na objemu ostrého engscalc (~792 zakázek, ~114 MB).
 * Smyšlená data: zakázky z novaZakazka (~10 kB textu), 70 zakázek s přílohami
 * 1–3,5 MB (náhodná base64 — komprimuje se jako PDF/JPEG), šablony 6 × 400 kB,
 * podpisy, zákazníci, 8 účtů. Model Blobs: LAT_MS na operaci + MS_NA_MB.
 * Měří: noční otisk po krocích (kolik běhů, nejdelší krok proti limitu 30 s),
 * vynucený (nejdelší požadavek proti 10 s), paměť (RSS), gzip, kopie na Disk
 * po stránkách, obnovu po výřezech, starý jednolitý otisk 114 MB.
 * Spuštění: node --expose-gc podklady/K9_pokusy/r3_objem_mereni.mjs [LAT_MS] [MS_NA_MB] */
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { pamet, nastaveni, pocty, nalez, over, konec, ticho } from './spolecne.mjs';
const require = createRequire(import.meta.url);
const LAT = +(process.argv[2] || 40), MSMB = +(process.argv[3] || 20);
const Z = await import('../../netlify/lib/zalohovani.mjs');
const { default: prihlaseni } = await import('../../netlify/functions/prihlaseni.mjs');
const { default: zalohaFn } = await import('../../netlify/functions/zaloha.mjs');
const { default: obnova } = await import('../../netlify/functions/obnova.mjs');
const { ADMIN_EMAIL } = await import('../../netlify/lib/sdilene.mjs');
const { uloZalohaSloz, uloJmenoSouboru } = require('../../src/uloziste.js');
Object.assign(globalThis, require('../../src/format.js'), require('../../src/engine.js'), require('../../src/engine_proj.js'),
  require('../../src/techspec.js'), require('../../src/sleva.js'), require('../../src/zaokrouhleni.js'), require('../../src/zamek.js'));
const zk = require('../../src/zakazka.js');

let rssMax = 0;
const vzorek = setInterval(() => { rssMax = Math.max(rssMax, process.memoryUsage().rss); }, 20);
const rssReset = () => { if (global.gc) global.gc(); rssMax = process.memoryUsage().rss; return rssMax; };
const MB = (b) => (b / 1048576).toFixed(1) + ' MB';

/* ---------- data ---------- */
const N = 792;
const KAZDA = +(process.env.PRILOHY_KAZDA || 17);     // každá KAZDA-tá zakázka s přílohou (17 → ~114 MB)
const text = (n, z) => (z + ' Příliš žluťoučký kůň úpěl ďábelské ódy. ').repeat(Math.ceil(n / 40)).slice(0, n);
const KLIC = (i) => uloJmenoSouboru({ cislo: '2026 - OBJ - CN - ' + String(i).padStart(4, '0') });
let prilohB = 0;
for (let i = 0; i < N; i++) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OBJ - CN - ' + String(i).padStart(4, '0');
  z.nazevAkce = 'Zkušební zakázka ' + i + ' ' + text(9000, 'Z' + i);
  if (i % KAZDA === 3) {
    const n = Math.floor((1 + (i % 5) * 0.6) * 1048576 * 0.75);       // 0,75–2,6 MB binárně → 1–3,5 MB base64
    const data = randomBytes(n).toString('base64'); prilohB += data.length;
    z.prilohy = [{ id: 'pr' + i, nazev: 'vykres.pdf', typ: 'application/pdf', velikost: n, data, kdy: '2026-10-01T08:00:00.000Z', kdo: 'Test', popis: '' }];
  }
  pamet.set('zakazky/z/' + KLIC(i), JSON.stringify(z));
}
pamet.set('zakazky/_rejstrik', JSON.stringify({ schema: 1, zakazky: [] }));
pamet.set('program/firma', JSON.stringify({ udaje: { nazev: 'Zkušební firma s.r.o.' } }));
for (let i = 0; i < 6; i++) pamet.set('sablony/data/cn/' + (i + 1), JSON.stringify({ data: randomBytes(300000).toString('base64') }));
for (let i = 0; i < 6; i++) pamet.set('podpisy/obch' + i + '@priklad.cz', JSON.stringify({ obrazek: 'data:image/png;base64,' + randomBytes(40000).toString('base64') }));
for (let i = 0; i < 300; i++) pamet.set('zakaznici/z/K' + i, JSON.stringify({ nazev: 'Zákazník ' + i, ico: String(10000000 + i) }));
const r = await prihlaseni(new Request('http://x/api/prihlaseni', { method: 'POST', body: JSON.stringify({ email: ADMIN_EMAIL, heslo: 'Docasne.Heslo.123' }) }));
const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
for (let i = 0; i < 7; i++) pamet.set('uzivatele/obch' + i + '@priklad.cz', JSON.stringify({ email: 'obch' + i + '@priklad.cz', jmeno: 'O' + i, role: 'Obchodník', aktivni: true, heslo: 'aa:bb' }));
const velDb = [...pamet.values()].reduce((a, v) => a + v.length, 0);
console.log('databáze: ' + N + ' zakázek, ' + MB(velDb) + ' (přílohy ' + MB(prilohB) + '); Blobs model ' + LAT + ' ms/operace + ' + MSMB + ' ms/MB');
nastaveni.latenceMs = LAT; nastaveni.msNaMB = MSMB;

/* ---------- 1) noční otisk po krocích (rozpočet 20 s, limit 30 s) ---------- */
const DNES = new Date().toISOString().slice(0, 10);
{
  rssReset();
  const kroky = [];
  let v;
  do {
    const t = Date.now(); const c0 = process.cpuUsage();
    v = await Z.porizOtiskKrok(DNES, 'nocni-otisk', '', { rozpocetMs: Z.OTISK_ROZPOCET.nocniMs });
    const cpu = process.cpuUsage(c0);
    kroky.push({ ms: Date.now() - t, cpuMs: Math.round((cpu.user + cpu.system) / 1000), hotovo: v.hotovo, p: v.postup && v.postup.hotovo });
  } while (!v.hotovo && kroky.length < 50);
  const max = Math.max(...kroky.map(k => k.ms));
  const m = JSON.parse(pamet.get('zalohy/' + DNES));
  console.log('noční: ' + kroky.length + ' běhů, kroky ms ' + kroky.map(k => k.ms + '/' + k.cpuMs + 'cpu').join(', ') + '; RSS max ' + MB(rssMax)
    + '; ' + m.casti + ' částí, data ' + MB(m.velikostB) + ', uloženo gzip ' + MB(m.ulozenoB) + ' (' + Math.round(100 * m.ulozenoB / m.velikostB) + ' %)');
  over('noční otisk vznikne v okně 8 běhů', v.hotovo && kroky.length <= 8, kroky.length);
  nalez('K9-V-cas-nocni', 'krok nočního otisku přesáhne limit plánované funkce 30 s', max > 30000, { maxMs: max });
  globalThis.__nocni = { kroky: kroky.length, maxMs: max, casti: m.casti, velikostB: m.velikostB, ulozenoB: m.ulozenoB, rss: rssMax };
}

/* ---------- 2) vynucený otisk po požadavcích (rozpočet 5 s, limit 10 s) ---------- */
{
  rssReset();
  const klic = Z.klicVynuceny('rucne');
  const kroky = []; let v;
  do {
    const t = Date.now();
    v = await Z.porizOtiskKrok(klic, 'vynuceno', ADMIN_EMAIL, { rozpocetMs: Z.OTISK_ROZPOCET.synchronniMs });
    kroky.push(Date.now() - t);
  } while (!v.hotovo && kroky.length < 200);
  const max = Math.max(...kroky);
  console.log('vynucený: ' + kroky.length + ' požadavků, nejdelší ' + max + ' ms, RSS max ' + MB(rssMax));
  nalez('K9-cas-vynuceny', 'požadavek vynuceného otisku přesáhne limit synchronní funkce 10 s', max > 10000, { maxMs: max, pozadavku: kroky.length });
  globalThis.__vyn = { pozadavku: kroky.length, maxMs: max, rss: rssMax };
}

/* ---------- 3) kopie na Disk po stránkách ---------- */
{
  rssReset();
  let kopie = {}, dalsi = '', otisk = null, stran = 0, nejvic = 0, maxMs = 0;
  do {
    const t = Date.now();
    const txt = await (await zalohaFn(new Request('http://x/api/zaloha?zdroj=nocni&strana=1' + (otisk ? '&otisk=' + otisk : '')
      + (dalsi ? '&po=' + encodeURIComponent(dalsi) : ''), { headers: { cookie } }))).text();
    maxMs = Math.max(maxMs, Date.now() - t); nejvic = Math.max(nejvic, txt.length);
    const o = JSON.parse(txt); if (!o.ok) throw new Error(txt.slice(0, 200));
    if (!stran) otisk = o.otisk;
    uloZalohaSloz(kopie, o.zaloha); dalsi = o.dalsi; stran++;
  } while (dalsi && stran < 500);
  const s = JSON.stringify(kopie);
  console.log('kopie na Disk: ' + stran + ' stránek, největší odpověď ' + MB(nejvic) + ', nejdelší ' + maxMs + ' ms, soubor ' + MB(s.length));
  over('kopie na Disk: každá stránka < 6 MB a < 10 s', nejvic < 6 * 1048576 && maxMs < 10000, { nejvic, maxMs });
  globalThis.__disk = { stran, nejvicB: nejvic, maxMs, souborB: s.length };
}

/* ---------- 4) obnova z otisku po částech (náhled, výřezy po 15) ---------- */
{
  const telo = (x) => obnova(new Request('http://x/api/obnova', { method: 'POST', headers: { cookie }, body: JSON.stringify(x) }));
  const m = JSON.parse(pamet.get('zalohy/' + DNES));
  let pozadavku = 0, maxMs = 0, celkemMs = 0;
  for (let i = 0; i < m.casti; i++) {
    for (let od = 0, zaznamu = 1; od < zaznamu; od += 15) {
      const t = Date.now();
      const d = await (await telo({ zdroj: { otisk: DNES, cast: i, od, kolik: 15 }, rezim: 'prepsat', casti: ['zakazky'], nahled: true })).json();
      const ms = Date.now() - t; maxMs = Math.max(maxMs, ms); celkemMs += ms; pozadavku++;
      if (!d.ok) throw new Error(JSON.stringify(d).slice(0, 300));
      zaznamu = d.zdroj.zaznamu;
    }
  }
  console.log('náhled obnovy po výřezech: ' + pozadavku + ' požadavků, nejdelší ' + maxMs + ' ms, celkem ' + Math.round(celkemMs / 1000) + ' s');
  over('náhled obnovy z otisku po částech: každý požadavek < 10 s', maxMs < 10000, maxMs);
  globalThis.__obnova = { pozadavku, maxMs, celkemS: Math.round(celkemMs / 1000) };
}

/* ---------- 5) starý jednolitý otisk 114 MB ---------- */
{
  nastaveni.latenceMs = 0; nastaveni.msNaMB = 0;
  const cely = await Z.ctiOtisk(globalThis.__TEST_ULOZISTE('zalohy'), DNES);
  cely.zdroj = 'nocni-otisk'; cely.porizena = '2026-10-15T02:00:00.000Z';
  pamet.set('zalohy/2026-10-15', JSON.stringify(cely));                      // starý tvar, bez souhrnu
  const vel = pamet.get('zalohy/2026-10-15').length;
  nastaveni.latenceMs = LAT; nastaveni.msNaMB = MSMB;
  /* přehled záloh (GET) čte starý otisk bez souhrnu celý */
  rssReset(); let t = Date.now();
  const seznam = await Z.seznamOtisku(14);
  const msSeznam = Date.now() - t; const rssSeznam = rssMax;
  console.log('starý otisk ' + MB(vel) + ': přehled záloh (seznamOtisku) ' + msSeznam + ' ms, RSS max ' + MB(rssSeznam));
  nalez('K9-S4', 'přehled záloh čte starý jednolitý otisk bez souhrnu celý (' + MB(vel) + ') — každý GET přehledu',
    seznam.some(x => x.den === '2026-10-15') && pocty.ctenoB > 0, { ms: msSeznam, rss: MB(rssSeznam) });
  /* obnova ze starého otisku: klient pošle celý otisk jedním požadavkem (bez `cast`) */
  const telo = (x) => obnova(new Request('http://x/api/obnova', { method: 'POST', headers: { cookie }, body: JSON.stringify(x) }));
  rssReset(); t = Date.now();
  const d = await (await telo({ zdroj: { otisk: '2026-10-15' }, rezim: 'prepsat', nahled: true })).json();
  const msObn = Date.now() - t;
  console.log('náhled obnovy ze starého otisku jedním požadavkem: ' + msObn + ' ms, RSS max ' + MB(rssMax) + ', ok=' + d.ok);
  nastaveni.latenceMs = 0; nastaveni.msNaMB = 0; t = Date.now();
  await (await telo({ zdroj: { otisk: '2026-10-15' }, rezim: 'prepsat', nahled: true })).json();
  const msObn0 = Date.now() - t;
  nastaveni.latenceMs = LAT; nastaveni.msNaMB = MSMB;
  console.log('  … tentýž náhled bez latence úložiště (čisté CPU): ' + msObn0 + ' ms');
  nalez('K9-V1', 'náhled (i obnova) ze starého jednolitého otisku jde jedním požadavkem — u ' + N + ' zakázek trvá ' + Math.round(msObn / 1000)
    + ' s, nad limitem synchronní funkce 10 s', msObn > 10000, { ms: msObn, msBezLatence: msObn0, rss: MB(rssMax) });
  /* výřez cast:0 (server to umí) — každý požadavek parsuje celý blob */
  rssReset(); t = Date.now();
  const v = await (await telo({ zdroj: { otisk: '2026-10-15', cast: 0, od: 0, kolik: 15 }, rezim: 'prepsat', casti: ['zakazky'], nahled: true })).json();
  const msVyrez = Date.now() - t;
  console.log('výřez starého otisku (cast 0, 15 záznamů): ' + msVyrez + ' ms, RSS max ' + MB(rssMax) + ', záznamů ' + (v.zdroj && v.zdroj.zaznamu));
  globalThis.__stary = { velB: vel, msSeznam, msObnova: msObn, msObnovaBezLatence: msObn0, msVyrez, pozadavkuVyrezu: Math.ceil(((v.zdroj && v.zdroj.zaznamu) || 0) / 15) };
}
clearInterval(vzorek);
console.log('SOUHRN ' + JSON.stringify({ LAT, MSMB, nocni: globalThis.__nocni, vynuceny: globalThis.__vyn, disk: globalThis.__disk,
  obnova: globalThis.__obnova, stary: globalThis.__stary }));
konec();
