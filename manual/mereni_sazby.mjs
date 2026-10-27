#!/usr/bin/env node
/* Měření sazby hotové příručky v PDF (M9 #534, 27. 10. 2026).
 *
 *   NODE_PATH=$(npm root -g) node manual/mereni_sazby.mjs <příručka.html|příručka.pdf> [--pdf výstup.pdf] [--json]
 *
 * HTML se vytiskne v Chromiu na A4 stejně jako ostatní nástroje příručky
 * (okno 794 px, preferCSSPageSize, pozadí); hotové PDF (manuál výpočtu má
 * vlastní tisk v manual_vypocet/sestav.js) se jen změří — pak je potřeba
 * i HTML vedle (stejné jméno, .html) kvůli seznamu kapitol.
 *
 * Hlásí: počet stran; kolik stran zabírá OBSAH (musí být 1); strany
 * zaplněné méně než z 50 % — u každé, jestli za ní začíná kapitola (konec
 * kapitoly je u manuálu výpočtu záměr, jinde díra v sazbě). Zaplnění se
 * měří z rastru stránky (pdftoppm): poslední řádek s inkoustem nad dolním
 * okrajem. Kód 1 = obsah přes víc stran. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const a = process.argv.slice(2);
const vstup = a.find(x => !x.startsWith('--') && a[a.indexOf(x) - 1] !== '--pdf');
if (!vstup) { console.error('Použití: node manual/mereni_sazby.mjs <html|pdf> [--pdf výstup.pdf] [--json]'); process.exit(2); }
const iPdf = a.indexOf('--pdf');
const jeHtml = /\.html?$/i.test(vstup);
const html = jeHtml ? path.resolve(vstup) : path.resolve(vstup).replace(/\.pdf$/i, '.html');
const pdf = jeHtml ? path.resolve(iPdf >= 0 ? a[iPdf + 1] : html.replace(/\.html?$/i, '.pdf')) : path.resolve(vstup);

let pw;
try { pw = require('playwright'); } catch (e) {
  pw = require(path.join(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(), 'playwright'));
}
const prohl = await pw.chromium.launch();
let kapitoly = [], posledniVObsahu = '';
try {
  const str = await prohl.newPage({ viewport: { width: 794, height: 1123 } });
  await str.goto('file://' + html, { waitUntil: 'load' });
  await str.waitForTimeout(800);
  const info = await str.evaluate(() => {
    const t = (e) => (e.textContent || '').replace(/↑ obsah/, '').trim();
    const obsah = [...document.querySelectorAll('#obsah li, .obsah > div')].map(t).filter(Boolean);
    const kap = [...document.querySelectorAll('#cil > h2[id], .kaph h2')].map(t);
    return { obsah, kap };
  });
  kapitoly = info.kap;
  posledniVObsahu = info.obsah[info.obsah.length - 1] || '';
  if (jeHtml) {
    await str.emulateMedia({ media: 'print' });
    await str.pdf({ path: pdf, format: 'A4', printBackground: true, preferCSSPageSize: true });
  }
} finally { await prohl.close(); }

const norm = (s) => String(s).replace(/\s+/g, '').toLowerCase();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kng_sazba_'));
const text = execFileSync('pdftotext', ['-layout', pdf, '-'], { encoding: 'utf8', maxBuffer: 1 << 28 }).split('\f');
if (text.length && !text[text.length - 1].trim()) text.pop();
const stran = text.length;

/* strany obsahu: od první strany do strany, kde je poslední položka obsahu
 * poprvé (dřív než nadpis samotné kapitoly) */
let stranObsahu = 0;
const hledat = norm(posledniVObsahu).slice(0, 40);
for (let i = 0; i < stran && hledat; i++) if (norm(text[i]).includes(hledat)) { stranObsahu = i + 1; break; }

/* zaplnění: rastr 30 dpi v odstínech šedi */
execFileSync('pdftoppm', ['-r', '30', '-gray', pdf, path.join(tmp, 's')]);
const soubory = fs.readdirSync(tmp).filter(f => f.endsWith('.pgm')).sort();
const zaplneni = soubory.map((f) => {
  const b = fs.readFileSync(path.join(tmp, f));
  let p = 0; const pole = [];
  while (pole.length < 4) { /* P5 w h max */
    while (/\s/.test(String.fromCharCode(b[p]))) p++;
    let s = ''; while (!/\s/.test(String.fromCharCode(b[p]))) s += String.fromCharCode(b[p++]);
    pole.push(s);
  }
  p++;
  const w = +pole[1], h = +pole[2];
  const horni = Math.round(h * 12 / 297), dolni = Math.round(h * (297 - 14) / 297);
  let posledni = horni;
  for (let y = horni; y < dolni; y++) {
    for (let x = 0; x < w; x++) if (b[p + y * w + x] < 235) { posledni = y; break; }
  }
  return Math.max(0, Math.min(1, (posledni - horni) / (dolni - horni)));
});
fs.rmSync(tmp, { recursive: true, force: true });

const kapN = kapitoly.map(k => norm(k).slice(0, 30)).filter(Boolean);
const polo = [];
zaplneni.forEach((z, i) => {
  if (z >= 0.5 || i === stran - 1) return;
  const dalsi = norm((text[i + 1] || '').slice(0, 400));
  const konecKapitoly = kapN.some(k => dalsi.startsWith(k) || dalsi.slice(0, 60).includes(k));
  polo.push({ strana: i + 1, zaplneno: Math.round(z * 100), konecKapitoly });
});
const vysledek = { soubor: path.basename(pdf), stran, stranObsahu, polo,
  poloMimoKonec: polo.filter(x => !x.konecKapitoly).length };
if (a.includes('--json')) console.log(JSON.stringify(vysledek));
else {
  console.log(`${vysledek.soubor}: ${stran} stran, obsah ${stranObsahu} ${stranObsahu === 1 ? 'strana' : 'strany'}`);
  console.log(`  strany zaplněné < 50 %: ${polo.length} (mimo konec kapitoly ${vysledek.poloMimoKonec})`
    + (polo.length ? ' — ' + polo.map(x => x.strana + (x.konecKapitoly ? 'k' : '') + ' (' + x.zaplneno + ' %)').join(', ') : ''));
}
process.exit(stranObsahu === 1 ? 0 : 1);
