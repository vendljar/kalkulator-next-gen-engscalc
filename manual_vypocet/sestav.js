#!/usr/bin/env node
/* Sestaví „Vizuální manuál výpočtu OCK" (Jak kalkulačka počítá OCK) z šablony
 * a z čísel jádra. M7, 3. vydání (27. 10. 2026).
 *
 *   node manual_vypocet/sestav.js [--out SLOŽKA] [--pdf] [--snapshot]
 *   (--snapshot zapíše čísla vydání do manual_vypocet/cisla_vydani.json)
 *
 * Výstup: <SLOŽKA>/RRRR-MM-DD_kalkulator_v<verze>_MANUAL_VYPOCET_OCK.html (+ .pdf).
 * Výchozí složka je dočasná (os.tmpdir()/kng_manual_vypocet) — HOTOVÝ MANUÁL
 * ANI PDF SE DO REPOZITÁŘE NEUKLÁDAJÍ (rozhodnutí 17. 9. 2026, jako příručka):
 * nesou postup výpočtu firmy a v historii Gitu by zůstaly napořád. Do repa
 * patří jen šablona, generátor a test.
 *
 * Zápis v šabloně (HTML komentáře se před dosazením zahodí):
 *   {{klíč}}            číslo / text z data.js; v textu <span data-k>, v SVG <tspan data-k>
 *   {{%klíč:měř:posun}} holé číslo pro geometrii schématu: hodnota × měř + posun
 *                       (posun = číslo nebo klíč); netiskne se jako údaj
 *   {{@blok}}           vygenerovaný blok z data.js (tabulka kapitoly 15)
 *   {{meta.x}}          údaje vydání (verze, datum, základ, počet čísel)
 * Neznámý klíč = chyba (kód 2) — v manuálu nesmí zůstat nedosazené místo. */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const D = require('./data.js');

const KDE = __dirname;
const KOREN = path.resolve(KDE, '..');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function datumCz(d) { return d.getDate() + '. ' + (d.getMonth() + 1) + '. ' + d.getFullYear(); }
function zakladGit() {
  try { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: KOREN, encoding: 'utf8' }).trim(); }
  catch (e) { return '?'; }
}

/* Dosadí data do šablony. Vrací { html, pocet, klice }. Bez vedlejších účinků
 * — volá ji i test. */
function sestavHtml(sablona, data, meta) {
  const H = data.hodnoty, V = data.cisla;
  const chyby = [];
  let t = sablona.replace(/<!--[\s\S]*?-->/g, '');
  t = t.replace(/\{\{@([\w.]+)\}\}/g, (m, k) => {
    if (!Object.prototype.hasOwnProperty.call(data.bloky, k)) { chyby.push('neznámý blok ' + k); return ''; }
    return data.bloky[k];
  });
  t = t.replace(/\{\{%([\w.]+)(?::(-?[\d.]+))?(?::(-?[\w.]+))?\}\}/g, (m, k, s, o) => {
    if (typeof V[k] !== 'number') { chyby.push('neznámé číslo pro geometrii ' + k); return '0'; }
    let posun = 0;
    if (o !== undefined) posun = /^-?[\d.]+$/.test(o) ? +o : V[o];
    if (typeof posun !== 'number' || !Number.isFinite(posun)) { chyby.push('neznámý posun ' + o); posun = 0; }
    return String(Math.round((V[k] * (s === undefined ? 1 : +s) + posun) * 10) / 10);
  });
  t = t.replace(/\{\{meta\.(\w+)\}\}/g, (m, k) => {
    if (!(k in meta)) { chyby.push('neznámé meta.' + k); return ''; }
    return esc(meta[k]);
  });
  /* SVG zvlášť: uvnitř <text> smí být jen <tspan>. */
  const klice = [];
  const dosad = (usek, vSvg) => usek.replace(/\{\{([\w.]+)\}\}/g, (m, k) => {
    if (!Object.prototype.hasOwnProperty.call(H, k)) { chyby.push('neznámý klíč ' + k); return m; }
    klice.push(k);
    return vSvg ? `<tspan data-k="${k}">${esc(H[k])}</tspan>` : `<span class="c" data-k="${k}">${esc(H[k])}</span>`;
  });
  t = t.split(/(<svg[\s\S]*?<\/svg>)/).map(u => dosad(u, u.startsWith('<svg'))).join('');
  if (/\{\{[^{}]*\}\}/.test(t)) chyby.push('v HTML zůstala značka {{ }}');
  return { html: t, pocet: klice.length, klice, chyby };
}

function sestav(opts) {
  const o = opts || {};
  const data = D.spocitej();
  const ted = o.datum || new Date();
  const meta = {
    verze: data.meta.verze,
    zaklad: o.zaklad || zakladGit(),
    datum: datumCz(ted),
    pocetCisel: '0',
    doplneni: Object.keys(D.DOPLNENI_CENIKU).map(k => k + ' = ' + D.DOPLNENI_CENIKU[k]).join(', '),
  };
  const sablona = fs.readFileSync(path.join(KDE, 'sablona.html'), 'utf8');
  let r = sestavHtml(sablona, data, meta);
  /* počet čísel v manuálu se zná až po prvním dosazení */
  meta.pocetCisel = String(new Set(r.klice).size);
  r = sestavHtml(sablona, data, meta);
  return Object.assign(r, { data, meta, ted });
}

async function doPdf(htmlSoubor, pdfSoubor, meta) {
  let pw;
  try { pw = require('playwright'); } catch (e) {
    const glob = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
    pw = require(path.join(glob, 'playwright'));
  }
  const prohl = await pw.chromium.launch();
  try {
    /* Okno 794 px = šířka A4 při 96 dpi (jako příručka obchodníka). */
    const str = await prohl.newPage({ viewport: { width: 794, height: 1123 } });
    await str.goto('file://' + htmlSoubor, { waitUntil: 'load' });
    await str.emulateMedia({ media: 'print' });
    const pata = `<div style="font:7px Arial,sans-serif;color:#5d6670;width:100%;padding:0 12mm;display:flex;justify-content:space-between">`
      + `<span>Výpočet OCK — vizuální manuál · v${esc(meta.verze)} · 3. vydání · interní</span>`
      + `<span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;
    await str.pdf({ path: pdfSoubor, format: 'A4', printBackground: true,
      margin: { top: '12mm', bottom: '14mm', left: '0', right: '0' },
      displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: pata });
  } finally { await prohl.close(); }
}

async function main() {
  const a = process.argv.slice(2);
  const i = a.indexOf('--out');
  const out = i >= 0 ? path.resolve(a[i + 1]) : path.join(os.tmpdir(), 'kng_manual_vypocet');
  const r = sestav();
  if (a.includes('--snapshot')) {
    /* Čísla vydaného manuálu — test je porovnává s jádrem (src/test_manual_vypocet.js). */
    const cil = path.join(KDE, 'cisla_vydani.json');
    fs.writeFileSync(cil, JSON.stringify({ vydani: 3, verze: r.meta.verze,
      pozn: 'Čísla vydaného manuálu výpočtu OCK. Změní-li jádro kterékoli z nich, test_manual_vypocet.js spadne: vydejte nový manuál a soubor obnovte (node manual_vypocet/sestav.js --snapshot).',
      hodnoty: r.data.hodnoty }, null, 1) + '\n');
    console.log('Snapshot: ' + cil);
  }
  if (r.chyby.length) {
    console.error('CHYBA: šablona nejde dosadit:\n  ' + r.chyby.join('\n  '));
    process.exit(2);
  }
  fs.mkdirSync(out, { recursive: true });
  const iso = r.ted.toISOString().slice(0, 10);
  const jmeno = `${iso}_kalkulator_v${r.meta.verze}_MANUAL_VYPOCET_OCK`;
  const html = path.join(out, jmeno + '.html');
  fs.writeFileSync(html, r.html);
  console.log('HTML: ' + html + ' (' + r.pocet + ' dosazení, ' + r.meta.pocetCisel + ' různých čísel)');
  if (a.includes('--pdf')) {
    const pdf = path.join(out, jmeno + '.pdf');
    await doPdf(html, pdf, r.meta);
    console.log('PDF:  ' + pdf);
  }
}

module.exports = { sestav, sestavHtml };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
