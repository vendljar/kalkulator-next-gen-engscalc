/* MĚŘENÍ KOMPRESE OTISKU (#523 Z2, 26. 10. 2026).
 *
 * Otázka J. V.: kolik ušetří gzip u částí otisku v Blobs a u kopie na Disk?
 * Ostrý engscalc: ~792 zakázek, otisk ~114 MB/den. Do obsahu ostrého
 * provozu se nedíváme — data jsou SMYŠLENÁ, ale v tvaru aplikace:
 *   - text zakázek = novaZakazka() z src/zakazka.js se 2–3 variantami
 *     a vyplněnými českými texty (opakující se klíče JSON, čísla);
 *   - přílohy, úvodní fotky, šablony (.docx) a podpisy = base64 NÁHODNÝCH
 *     bajtů (JPEG, PDF, docx i PNG jsou uvnitř už komprimované, takže
 *     náhodná data jsou poctivý nejhorší případ).
 * Scénáře se liší podílem binárních dat na objemu (u engscalc ~144 kB na
 * zakázku, z toho text desítky kB — zbytek fotky a přílohy).
 *
 * Měří: úsporu gzip (zlib, úroveň 6 = výchozí CompressionStream), čas
 * komprese a rozbalení jedné části (4 MB) a špičku paměti.
 * Spuštění: node nastroje/mereni_komprese_otisku.mjs [--json] */
import { createRequire } from 'node:module';
import { gzipSync, gunzipSync } from 'node:zlib';
import { randomBytes } from 'node:crypto';

const require = createRequire(import.meta.url);
const src = (p) => require('../src/' + p);
Object.assign(globalThis, src('format.js'), src('engine.js'), src('engine_proj.js'), src('techspec.js'),
  src('sleva.js'), src('zaokrouhleni.js'), src('zamek.js'));
const zk = src('zakazka.js');

const VETA = 'Ocelová konstrukce výtahové šachty, opláštění sklem, kotvení do stropních desek, žárové zinkování. ';
const text = (n, z) => (z + ' ' + VETA).repeat(Math.ceil(n / (VETA.length + z.length + 1))).slice(0, n);
const b64 = (n) => randomBytes(Math.ceil(n * 3 / 4)).toString('base64').slice(0, n);

/* Zakázka v tvaru aplikace; `binB` = kolik base64 nese (foto + přílohy). */
function zakazka(i, binB) {
  const z = zk.novaZakazka();
  z.cislo = '2026 - OBJ - CN - ' + String(i).padStart(4, '0');
  z.nazevAkce = 'Bytový dům ' + i + ', Praha ' + (i % 10 + 1);
  z.adresa = 'Ulice ' + i + ', 110 00 Praha';
  z.objednatel = 'Stavební firma ' + (i % 60) + ' s.r.o.';
  z.popisZameru = text(1500, 'Záměr ' + i);
  const v0 = z.varianty && z.varianty[0];
  if (v0) {
    for (let k = 1; k < 2 + (i % 2); k++) {
      const v = JSON.parse(JSON.stringify(v0));
      v.id = 'v' + k + '-' + i; v.nazev = 'Varianta ' + (k + 1);
      z.varianty.push(v);
    }
  }
  if (binB > 0) {
    const foto = Math.min(binB, 180000);
    z.uvodniFoto = 'data:image/jpeg;base64,' + b64(foto);
    if (binB > foto) z.prilohy = [{ id: 'pr' + i, nazev: 'vykres.pdf', typ: 'application/pdf', velikost: binB - foto,
      data: b64(binB - foto), kdy: '2026-10-01T08:00:00.000Z', kdo: 'Test', popis: 'výkres' }];
  }
  return z;
}

/* Části jako v otisku: mapa zakázek po ~4 MB. */
function casti(zakazky) {
  const out = []; let c = {}, b = 0;
  for (const [k, z] of zakazky) {
    const t = JSON.stringify(z).length;
    if (b > 0 && b + t > 4 * 1024 * 1024) { out.push({ zakazky: c }); c = {}; b = 0; }
    c[k] = z; b += t;
  }
  if (b) out.push({ zakazky: c });
  return out;
}

function mer(nazev, zakazky, navic) {
  const cs = casti(zakazky);
  if (navic) cs.push(navic);
  let raw = 0, gz = 0, tGz = 0, tUn = 0, maxRss = 0;
  for (const c of cs) {
    const t = Buffer.from(JSON.stringify(c));
    const a = process.hrtime.bigint();
    const g = gzipSync(t, { level: 6 });
    const b = process.hrtime.bigint();
    gunzipSync(g);
    const d = process.hrtime.bigint();
    raw += t.length; gz += g.length; tGz += Number(b - a) / 1e6; tUn += Number(d - b) / 1e6;
    maxRss = Math.max(maxRss, process.memoryUsage().rss);
  }
  /* Kopie na Disk = jeden soubor (celý JSON) — gzip celé kopie. */
  const r = { nazev, casti: cs.length, mb: +(raw / 1048576).toFixed(1), gzMb: +(gz / 1048576).toFixed(1),
    uspora: +(100 * (1 - gz / raw)).toFixed(1), msNaCastGzip: +(tGz / cs.length).toFixed(0),
    msNaCastRozbal: +(tUn / cs.length).toFixed(0), rssMb: Math.round(maxRss / 1048576) };
  return r;
}

const N = 792;
const vysledky = [];
/* 1) jen text (zakázky bez fotek a příloh) */
vysledky.push(mer('jen text zakázek', Array.from({ length: N }, (_, i) => ['z' + i, zakazka(i, 0)])));
/* 2) jen base64 (náhodná binární data) */
vysledky.push(mer('jen base64 příloh', [], { sablony: Object.fromEntries(Array.from({ length: 8 }, (_, i) => ['s' + i, b64(500000)])) }));
/* 3)–5) mix: kolik base64 v průměru na zakázku (u engscalc ~144 kB/zakázku celkem) */
for (const [popis, binB, kazda] of [['mix A — fotka 120 kB u každé 2. zakázky', 120000, 2],
  ['mix B — fotka + příloha ~140 kB u každé zakázky (blízko engscalc)', 140000, 1],
  ['mix C — 300 kB příloh u každé zakázky (příloh víc než u engscalc)', 300000, 1]]) {
  const zak = Array.from({ length: N }, (_, i) => ['z' + i, zakazka(i, i % kazda === 0 ? binB : 0)]);
  const sablony = Object.fromEntries(Array.from({ length: 6 }, (_, i) => ['s' + i, b64(300000)]));
  const podpisy = Object.fromEntries(Array.from({ length: 8 }, (_, i) => ['p' + i, 'data:image/png;base64,' + b64(40000)]));
  vysledky.push(mer(popis, zak, { sablony, podpisy }));
}

if (process.argv.includes('--json')) console.log(JSON.stringify(vysledky, null, 1));
else {
  console.log('scénář | části | MB | gzip MB | úspora % | ms/část gzip | ms/část rozbalení | RSS MB');
  for (const r of vysledky) console.log([r.nazev, r.casti, r.mb, r.gzMb, r.uspora, r.msNaCastGzip, r.msNaCastRozbal, r.rssMb].join(' | '));
}
