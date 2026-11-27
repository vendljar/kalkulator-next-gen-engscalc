/* Výroba vzoru nabídky OCK s návrhy z porovnání ATA (návrhová dávka 27. 11. 2026).
 *
 * Naše nabídka se skládá Z KÓDU: nabidkaData (src/nabidka.js) → nwBloky /
 * nwHtml (src/nahled_word.js = Kompletní náhled podkladů ve vzhledu Wordu
 * CN v17) pro smyšlenou zakázku TEST se zkušebním ceníkem. Všechny částky
 * se nahradí „X Kč" (ceny do návrhu nepatří). Návrhy A–E jsou v
 * ATA_navrhy_data.js a vkládají se jako zvýrazněné bloky.
 *
 * Spuštění (z kořene repa):
 *   node podklady/navrhy/ATA_vzor_vyroba.js
 * Vyrobí podklady/navrhy/NAVRH_NABIDKA_OCK_ATA_2026-11-27.md
 *     a  podklady/navrhy/POROVNANI_NABIDKA_OCK_ATA_2026-11-27.pdf
 * Nic v src/ ani netlify/ nemění. */
'use strict';
const path = require('path');
const fs = require('fs');
const S = path.join(__dirname, '..', '..', 'src') + path.sep;
const VEN = __dirname;
const { NAVRHY, NEZAPRACOVANO, TEMATA } = require('./ATA_navrhy_data.js');

/* ---------- 1) naše nabídka z kódu ---------- */
const eng = require(S + 'engine.js');
const ZC = require(S + 'zkusebni_cenik.js');
global.vypocet = eng.vypocet; global.DEFAULT_ZADANI = eng.DEFAULT_ZADANI; global.DEFAULT_CENIK = ZC.zkusebniCenik();
const ep = require(S + 'engine_proj.js');
global.DEFAULT_ZADANI_PROJ = ep.DEFAULT_ZADANI_PROJ; global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const tsm = require(S + 'techspec.js');
global.TECHSPEC_DEF = tsm.TECHSPEC_DEF; global.tsHodnota = tsm.tsHodnota; global.DEFAULT_TECHSPEC = tsm.DEFAULT_TECHSPEC;
const zk = require(S + 'zakazka.js');
for (const m of ['firma.js', 'preklad.js', 'podminky.js', 'plan_plateb.js', 'kryci.js', 'nahled_word.js']) {
  const x = require(S + m); Object.keys(x).forEach(k => { global[k] = x[k]; });
}
const { nabidkaData } = require(S + 'nabidka.js');
/* CSS náhledu NP (ui/nahled_word_ui.js nic neexportuje — vezme se zdroj funkce nwCss) */
const nwCss = (() => {
  const src = fs.readFileSync(S + 'ui/nahled_word_ui.js', 'utf8');
  const m = /function nwCss\(\) \{\n  return `([\s\S]*?)`;\n\}/.exec(src);
  if (!m) throw new Error('nwCss v ui/nahled_word_ui.js nenalezeno');
  return () => m[1];
})();
const JEKLY = JSON.parse(fs.readFileSync(S + 'jekly.json', 'utf8'));

const zak = zk.novaZakazka();
zak.cislo = '2026 - OPR - CN - TEST';
zak.nazevAkce = 'TEST – bytový dům, interiérová šachta (smyšlená zakázka)';
zak.objednatel = 'TEST Objednatel s.r.o.'; zak.adresa = 'Testovací 1, Praha'; zak.datum = '2026-11-27';
const z = zak.varianty[0].data.ock.zadani;
/* parametry jako u ATA (varianta 1): interiér, sklo VSG na terče, 6 stanic */
Object.assign(z, { typSachty: 'interiérová', prejezd: 3.58, zdvih: 22.85, prohluben: 1.25,
  sirka: 1.81, hloubka: 2.1, nastupiste: 6, zaskleni: 'na terče' });
z.profily = JSON.parse(JSON.stringify(eng.PROFILY_VYCHOZI['interiérová']));
z.priplatkyVynechat = [];

const CENA_RE = /[−-]?\s?\d{1,3}(?:[   ]\d{3})*,\d{2}\s?(Kč|€)/g;
const bezCen = x => JSON.parse(JSON.stringify(x), (k, v) => typeof v === 'string' ? v.replace(CENA_RE, 'X Kč') : v);
const dRaw = nabidkaData(zak, zak.varianty[0], JEKLY, 'cz');
/* příplatky s nulou ze zkušebního ceníku (ostrý ceník je má oceněné) se ve vzoru vynechají */
dRaw.priplatky = (dRaw.priplatky || []).filter(p => !/^-?0,00/.test(String(p.cena)));
const d = bezCen(dRaw);
const bloky = nwBloky(d, 'cz', {});
/* podpis: zpracovatel = přihlášený uživatel (v návrhu bez jména a kontaktů) */
bloky.forEach(b => { if (b.typ === 'podpis') {
  b.vypracoval = Object.assign({}, b.vypracoval, { jmeno: '(zpracovatel nabídky = přihlášený uživatel)', funkce: '', tel: '', email: '' });
  b.kancelar = Object.assign({}, b.kancelar, { radky: b.kancelar.radky.filter(r => !/^Tel/.test(r)), web: '' });
} });

/* ---------- 2) vložení návrhů ---------- */
const navrhyKotvy = {};
NAVRHY.forEach(n => { (navrhyKotvy[n.kam] = navrhyKotvy[n.kam] || []).push(n); });
const navrhBlok = kam => (navrhyKotvy[kam] || []).map(n => ({ typ: 'navrh', n }));
const vzor = [];
const tsSekce = r => r.typ === 'pruh' ? r.text : null;
for (let i = 0; i < bloky.length; i++) {
  const b = bloky[i];
  if (b.typ === 'ts') {
    /* rozdělit tabulku technické části v místech kotev ts-pred / ts-za */
    let kus = [], aktualni = null;
    const vyprazdni = () => { if (kus.length) vzor.push({ typ: 'ts', radky: kus }); kus = []; };
    for (const r of b.radky) {
      const s = tsSekce(r);
      if (s) {
        if (aktualni && navrhyKotvy['ts-za:' + aktualni]) { vyprazdni(); vzor.push(...navrhBlok('ts-za:' + aktualni)); }
        if (navrhyKotvy['ts-pred:' + s]) { vyprazdni(); vzor.push(...navrhBlok('ts-pred:' + s)); }
        aktualni = s;
      }
      kus.push(r);
    }
    /* poslední sekce (SOUČÁSTÍ DODÁVKY NENÍ) — poznámky * a ** jsou za ní */
    const pozn = [];
    while (kus.length && kus[kus.length - 1].typ === 'pozn') pozn.unshift(kus.pop());
    vyprazdni();
    if (aktualni) vzor.push(...navrhBlok('ts-za:' + aktualni));
    if (pozn.length) vzor.push({ typ: 'ts', radky: pozn });
    continue;
  }
  vzor.push(b);
  if (b.typ === 'popis') vzor.push(...navrhBlok('popis'));
  const dalsi = bloky[i + 1];
  if (b.typ === 'priplatek' && !(dalsi && dalsi.typ === 'priplatek')) vzor.push(...navrhBlok('za-priplatky'));
  /* konec kapitoly = před dalším nadpisem nebo podpisem */
  const konecKap = !dalsi || dalsi.typ === 'nadpis' || dalsi.typ === 'podpis';
  if (konecKap) {
    const nad = [...bloky.slice(0, i + 1)].reverse().find(x => x.typ === 'nadpis');
    const m = nad && /^(III|IV|V|VI)\./.exec(nad.text);
    if (m) vzor.push(...navrhBlok('za:' + m[1]));
  }
  if (dalsi && dalsi.typ === 'podpis') vzor.push({ typ: 'nezapracovano' });
}
const pouzite = new Set(vzor.filter(b => b.typ === 'navrh').map(b => b.n.id));
const chybi = NAVRHY.filter(n => !pouzite.has(n.id)).map(n => n.id);
if (chybi.length) { console.error('Návrhy bez kotvy ve vzoru: ' + chybi.join(', ')); process.exit(2); }

/* ---------- 3) Markdown vzoru ---------- */
const md = [];
const mdEsc = s => String(s == null ? '' : s).replace(/\|/g, '\\|');
md.push('# Vzor nabídky OCK s návrhy z porovnání ATA (27. 11. 2026)', '',
  '> **Návrh k rozhodnutí J. V. — nic z toho není v aplikaci.** Naše nabídka je vyrobena z kódu (`nabidkaData` → náhled podkladů ve vzhledu Wordu CN v17, `src/nahled_word.js`) pro smyšlenou zakázku TEST: interiérová šachta, sklo VSG na terče, 6 stanic, rozměry jako ATA varianta 1, zkušební ceník. Všechny částky jsou nahrazené „X Kč". Firemní šablona CN v19 v repu není — pevné texty jsou ze šablony CN v17 opsané v `nahled_word.js`; kde dělá text jen šablona, je to označeno „(text šablony CN v19 — není v repu)".',
  '>', '> Vložené návrhy jsou bloky se štítkem **[A1]**, **[B2]**… — u každého: navržené znění, kam patří, co by to znamenalo pro aplikaci, pracnost S/M/L a dopad na cenu. Přehled všech štítků je na konci. Porovnání po tématech je v `POROVNANI_NABIDKA_OCK_ATA_2026-11-27.pdf`.',
  '>', '> Vyrobeno skriptem `podklady/navrhy/ATA_vzor_vyroba.js` (návrhy v `ATA_navrhy_data.js`).', '');
const mdRadek = (l, v) => '| ' + mdEsc(l) + ' | ' + mdEsc(v).replace(/\n/g, '<br>') + ' |';
for (const b of vzor) {
  switch (b.typ) {
    case 'hlavicka':
      md.push('**Cenová nabídka** *(záhlaví a logo: text šablony CN v19 — není v repu)*', '', '| | |', '|---|---|');
      b.radky.forEach(([l, v]) => md.push(mdRadek(l, v.filter(Boolean).join(' · '))));
      md.push('');
      break;
    case 'popis':
      md.push('### ' + b.nadpis, '');
      b.odstavce.forEach(o => md.push(o.styl === 'modry' ? '**' + o.text + '**' : o.text, ''));
      md.push('*(Pohled na objekt z ulice — fotka zakázky; ve vzoru bez fotky)*', '');
      break;
    case 'zlom': md.push('---', ''); break;
    case 'nadpis': md.push((b.uroven === 1 ? '## ' : '### ') + b.text, ''); break;
    case 'ts': {
      let tab = false;
      for (const r of b.radky) {
        if (r.typ === 'titul') { md.push('### ' + r.text, ''); continue; }
        if (r.typ === 'pozn-titul' || r.typ === 'pozn') { if (tab) { md.push(''); tab = false; } md.push('*' + r.text + '*', ''); continue; }
        if (r.typ === 'pruh') { if (tab) md.push(''); md.push('**' + r.text + '**', '', '| položka | provedení |', '|---|---|'); tab = true; continue; }
        md.push(mdRadek(r.bunky[0], r.bunky.slice(1).join(' · ')));
      }
      md.push('');
      break;
    }
    case 'cena':
      md.push('| | |', '|---|---|');
      b.radky.forEach(r => md.push(mdRadek(r.popis.join(' — '), r.hodnota.join(' '))));
      md.push('');
      break;
    case 'seznam': md.push(b.nadpis, ''); b.radky.forEach((x, i) => md.push(String.fromCharCode(97 + i) + '. ' + x)); md.push(''); break;
    case 'odstavce': b.radky.forEach(x => md.push('*' + x + '*', '')); break;
    case 'priplatek': md.push('- **' + b.nazev + '**' + (nwPrazdna(b.popis) ? '' : ' — ' + b.popis) + ' … ' + b.cena + ' ' + (b.bezDph || '')); break;
    case 'ramecek':
      if (b.nadpis) md.push('**' + b.nadpis + '**', '');
      b.radky.forEach((x, i) => md.push(b.cislovani === 'a' ? String.fromCharCode(97 + i) + ') ' + x : '- ' + x));
      md.push('');
      break;
    case 'podpis':
      md.push('**' + b.vypracoval.nadpis + '** ' + b.vypracoval.jmeno, '', '**' + b.kancelar.nadpis + '** ' + b.kancelar.radky.join(', '), '');
      break;
    case 'navrh': {
      const n = b.n;
      md.push('> 🟨 **[' + n.id + '] ' + n.nazev + '** — *NÁVRH*', '>',
        '> **Kam patří:** ' + n.misto, '>', '> **Navržené znění:**', '>');
      n.zneni.forEach(r => md.push('> ' + (r.startsWith('|') ? '• ' + r.slice(1).split(' | ').map(s => s.trim()).join(': ') : r)));
      md.push('>', '> **Co to znamená pro aplikaci:** ' + n.app, '>',
        '> **Pracnost:** ' + n.prac + ' · **Dopad na cenu:** ' + n.cena, '');
      break;
    }
    case 'nezapracovano':
      md.push('> ⬜ **Nezapracováno (z ATA)**', '>');
      NEZAPRACOVANO.forEach(x => md.push('> - **[' + x.id + '] ' + x.nazev + '** — ' + x.duvod));
      md.push('');
      break;
  }
}
md.push('---', '', '## Přehled návrhů (štítky)', '', '| štítek | návrh | kam | aplikace (zkráceně) | pracnost | cena |', '|---|---|---|---|---|---|');
NAVRHY.forEach(n => md.push('| **' + n.id + '** | ' + mdEsc(n.nazev) + ' | ' + mdEsc(n.misto) + ' | ' + mdEsc(n.app.split('. ')[0]) + ' | ' + n.prac + ' | ' + mdEsc(n.cena) + ' |'));
NEZAPRACOVANO.forEach(x => md.push('| ' + x.id + ' | ' + mdEsc(x.nazev) + ' | — | ' + mdEsc(x.duvod) + ' | — | — |'));
md.push('', 'Pracnost: **S** = text nebo jedno pole (hodiny), **M** = nové pole / symbol / položka ceníku se šablonou, náhledem a překlady (den), **L** = změna skladby dokumentu nebo zámku (víc dní, rizikové — poradce předem).', '');
fs.writeFileSync(path.join(VEN, 'NAVRH_NABIDKA_OCK_ATA_2026-11-27.md'), md.join('\n'));

/* ---------- 4) HTML → PDF ---------- */
const e = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pill = id => `<span class="stitek s-${id[0]}">${e(id)}</span>`;
const navrhHtml = n => {
  const tab = n.zneni.filter(r => r.startsWith('|'));
  const txt = n.zneni.filter(r => !r.startsWith('|'));
  return `<div class="navrh s-${n.id[0]}"><div class="navrh-hl">${pill(n.id)} <b>${e(n.nazev)}</b> <span class="navrh-kam">→ ${e(n.misto)}</span></div>`
    + txt.map(r => `<p class="zneni">${e(r)}</p>`).join('')
    + (tab.length ? `<table class="zneni-tab">${tab.map(r => { const [a, b] = r.slice(1).split(' | '); return `<tr><td>${e(a.trim())}</td><td>${e((b || '').trim())}</td></tr>`; }).join('')}</table>` : '')
    + `<div class="navrh-app"><b>Aplikace:</b> ${e(n.app)}</div>`
    + `<div class="navrh-meta">Pracnost <b>${n.prac}</b> · Dopad na cenu: <b>${e(n.cena)}</b></div></div>`;
};
const vzorHtml = vzor.map(b => {
  if (b.typ === 'navrh') return navrhHtml(b.n);
  if (b.typ === 'nezapracovano') return `<div class="navrh s-N"><div class="navrh-hl"><b>Nezapracováno (z ATA)</b></div>`
    + NEZAPRACOVANO.map(x => `<p class="zneni">${pill(x.id)} <b>${e(x.nazev)}</b> — ${e(x.duvod)}</p>`).join('') + '</div>';
  if (b.typ === 'zlom') return '<div class="zlom"></div>';
  return nwHtml([b]);
}).join('\n');

const najdi = id => NAVRHY.find(n => n.id === id) || NEZAPRACOVANO.find(n => n.id === id);
const porovnani = TEMATA.map(t => {
  const ns = t.stitky.map(najdi);
  const dnes = t.dnes || ns.map(n => n.dnes).filter(Boolean).join(' ');
  const ata = t.ata || ns.map(n => n.ata).join(' ');
  const navrh = t.navrh || ns.map(n => n.duvod ? n.duvod : (ns.length > 1 ? n.id + ': ' : '') + n.nazev + (n.prac ? ' (' + n.prac + ', cena ' + n.cena.split(' ')[0] + ')' : '')).join('; ');
  return `<tr><td class="t">${e(t.tema)}</td><td>${e(dnes) || '—'}</td><td>${e(ata) || '—'}</td><td>${e(navrh)}</td><td class="st">${t.stitky.map(pill).join(' ') || '—'}</td></tr>`;
}).join('');
const prehled = NAVRHY.map(n => `<tr><td class="st">${pill(n.id)}</td><td><b>${e(n.nazev)}</b><br><span class="drobne">${e(n.misto)}</span></td><td>${e(n.app)}</td><td class="c">${n.prac}</td><td>${e(n.cena)}</td></tr>`).join('')
  + NEZAPRACOVANO.map(x => `<tr class="nez"><td class="st">${pill(x.id)}</td><td><b>${e(x.nazev)}</b></td><td colspan="3">${e(x.duvod)}</td></tr>`).join('');
const pocet = p => NAVRHY.filter(n => n.prac === p).length;
const sCenou = NAVRHY.filter(n => /^ano/.test(n.cena)).map(n => n.id).join(', ');

const html = `<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>Porovnání nabídky OCK × ATA</title><style>
${nwCss().replace(/body\{background:#8a94a3;/, 'body{background:#fff;')}
@page{size:A4;margin:12mm 12mm 14mm}
body{font-family:Calibri,Carlito,"DejaVu Sans",Arial,sans-serif;font-size:9.5pt;color:#111}
h1.tit{font-size:20pt;color:#1f3864;margin:0 0 2mm}
.podtit{font-size:11pt;color:#444;margin-bottom:6mm}
.box{border:1px solid #c9d3e0;background:#f6f8fc;padding:3mm 4mm;margin:3mm 0;font-size:9.5pt}
.box p{margin:1mm 0}
h2.kap{font-size:14pt;color:#1f3864;border-bottom:2px solid #1f3864;margin:0 0 3mm;padding-bottom:1mm}
table.por{width:100%;border-collapse:collapse;font-size:7.8pt;table-layout:fixed}
table.por th{background:#1f3864;color:#fff;text-align:left;padding:1.2mm 1.5mm}
table.por td{border:1px solid #b8c2d1;padding:1.2mm 1.5mm;vertical-align:top}
table.por tr{break-inside:avoid}
table.por td.t{font-weight:700;background:#eef1f8}
table.por td.st{text-align:center}
table.por td.c{text-align:center;font-weight:700;font-size:10pt}
table.por tr.nez td{color:#666;background:#f3f3f3}
.drobne{font-size:7pt;color:#555}
.stitek{display:inline-block;font-weight:700;font-size:7.5pt;padding:.3mm 1.6mm;border-radius:2mm;color:#fff;white-space:nowrap;margin:.3mm 0}
.s-A{background:#2f5597}.s-B{background:#b85c00}.s-C{background:#2e7d32}.s-D{background:#7b1fa2}.s-E{background:#00838f}.s-N{background:#888}
.zlom-str{break-before:page}
#vzor{width:186mm;margin:0 auto}
#vzor .nw-blok{margin-bottom:1mm}
#vzor table.nw-ts tr{break-inside:avoid}
#vzor .nw-popis{display:block}
.zlom{break-before:page}
.navrh{border:1.5px solid #e0b400;border-left:6px solid #e0b400;background:#fff8d6;padding:2mm 3mm;margin:2.5mm 0;break-inside:avoid;font-size:8.6pt}
.navrh.s-N{border-color:#999;background:#f1f1f1}
.navrh-hl{margin-bottom:1mm;font-size:9.5pt}
.navrh-kam{color:#6b5a00;font-size:8pt}
p.zneni{margin:.6mm 0;font-style:italic;color:#222}
table.zneni-tab{width:100%;border-collapse:collapse;margin:1mm 0;font-size:7.6pt}
table.zneni-tab td{border:1px solid #c8b45a;padding:.6mm 1.2mm;background:#fffdf0}
table.zneni-tab td:first-child{width:45%;font-weight:700}
.navrh-app{margin-top:1mm;font-size:7.8pt;color:#333}
.navrh-meta{margin-top:.6mm;font-size:7.8pt;color:#6b5a00}
.leg span{margin-right:3mm}
</style></head><body>
<h1 class="tit">Porovnání nabídky OCK s nabídkou ATA</h1>
<div class="podtit">Návrhová dávka „NÁVRH ATA" · 27. 11. 2026 · podklad k rozhodnutí J. V. (interní, nezveřejňovat)</div>
<div class="box">
<p><b>Co je v dokumentu.</b> (1) Porovnání po tématech: naše nabídka dnes × nabídka ATA × návrh pro nás. (2) Přehled návrhů se štítky, pracností a dopadem na cenu. (3) Ukázka vzoru: naše nabídka OCK vyrobená z kódu aplikace se zvýrazněnými návrhy na místech, kam by patřily.</p>
<p><b>Jak vznikla naše nabídka.</b> Z kódu: <i>nabidkaData</i> → Kompletní náhled podkladů ve vzhledu Wordu (CN v17, <i>src/nahled_word.js</i>) pro smyšlenou zakázku TEST — interiérová šachta, sklo VSG na terče, 6 stanic, rozměry jako ATA varianta 1, zkušební ceník. Všechny částky jsou nahrazené „X Kč", částky ATA „X €". Firemní šablona CN v19 v repu není: záhlaví, logo a drobné úpravy v19 (seznam poznámek, „Vypracoval:") se mohou lišit.</p>
<p><b>Stav.</b> Nic z návrhů není v aplikaci; v <i>src/</i> ani <i>netlify/</i> se nic neměnilo. Rozhoduje J. V. — stačí vybrat štítky.</p>
<p class="leg"><span>${pill('A')} technický blok výtahu</span><span>${pill('B')} příplatky s podmínkami</span><span>${pill('C')} rozsah</span><span>${pill('D')} smluvní podmínky</span><span>${pill('E')} navíc z ATA</span><span>${pill('N')} nezapracováno</span></p>
<p><b>Souhrn:</b> ${NAVRHY.length} návrhů — pracnost S: ${pocet('S')}, M: ${pocet('M')}, L: ${pocet('L')}. S dopadem na ceník (nová položka / sazba určí J. V.): ${e(sCenou)}. Nezapracováno podle rozhodnutí 25. 11.: N1 marketing o firmě, N2 podmínka DPH 12 %.</p>
</div>
<h2 class="kap">1. Porovnání po tématech</h2>
<table class="por"><colgroup><col style="width:15%"><col style="width:24%"><col style="width:26%"><col style="width:25%"><col style="width:10%"></colgroup>
<tr><th>Téma</th><th>Naše nabídka dnes</th><th>ATA</th><th>Návrh pro nás</th><th>Štítek</th></tr>${porovnani}</table>
<h2 class="kap zlom-str">2. Přehled návrhů</h2>
<table class="por"><colgroup><col style="width:8%"><col style="width:24%"><col style="width:44%"><col style="width:7%"><col style="width:17%"></colgroup>
<tr><th>Štítek</th><th>Návrh / kam patří</th><th>Co to znamená pro aplikaci</th><th>Prac.</th><th>Dopad na cenu</th></tr>${prehled}</table>
<p class="drobne">Pracnost: S = text nebo jedno pole (hodiny) · M = nové pole / symbol / položka ceníku včetně šablony, náhledu NP a překladů (den) · L = změna skladby dokumentu nebo zámku (víc dní; rizikové — nejdřív poradce). Texty kapitol IV.–VI. a vět platebního kalendáře jsou v Nastavení → Firma, takže jejich změna nepotřebuje kód.</p>
<h2 class="kap zlom-str">3. Ukázka vzoru — naše nabídka OCK s návrhy</h2>
<div class="box"><p>Pořadí a texty jsou přesně z aplikace (náhled podkladů = text Wordu CN v17). Žluté bloky jsou návrhy. Příplatky s nulou ze zkušebního ceníku jsou vynechané; zpracovatel a kontakty bez údajů.</p></div>
<div id="vzor"><div class="nw-zahlavi-text" style="position:static;margin:2mm 0 1mm">Cenová nabídka</div>
${vzorHtml}</div>
</body></html>`;
const htmlCesta = path.join(VEN, '.porovnani_tmp.html');
fs.writeFileSync(htmlCesta, html);

(async () => {
  const { chromium } = require('playwright');
  const br = await chromium.launch();
  const page = await br.newPage();
  await page.goto('file://' + htmlCesta);
  await page.pdf({ path: path.join(VEN, 'POROVNANI_NABIDKA_OCK_ATA_2026-11-27.pdf'), format: 'A4', printBackground: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="font-size:7pt;width:100%;text-align:center;color:#777">Porovnání nabídky OCK × ATA · návrh 27. 11. 2026 · strana <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    margin: { top: '12mm', bottom: '14mm', left: '12mm', right: '12mm' } });
  await br.close();
  fs.unlinkSync(htmlCesta);
  console.log('Hotovo: vzor ' + vzor.filter(b => b.typ === 'navrh').length + ' návrhů, MD + PDF.');
})().catch(err => { console.error(err); process.exit(1); });
