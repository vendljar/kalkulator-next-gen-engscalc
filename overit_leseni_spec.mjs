/* Ověření v prohlížeči: připomínky obchodu obchodník 15. 10. 2026 (dávka S12,
 * větev claude/leseni-spec-radek, v16.10.2).
 *   bod 2 — lešení v technické specifikaci řízené kalkulací: řádky
 *           LEŠENÍ VNITŘNÍ PRO STAVBU OCK a LEŠENÍ KOLEM OCK… se štítkem
 *           „z kalkulace", „nabízeno jako příplatek" u příplatků v nabídce,
 *           ruční přepis (štítek „ručně") a ↺; náhled i tisk CN,
 *   bod 3 — vlastní řádek specifikace (DALŠÍ UJEDNÁNÍ) v náhledu i tisku CN,
 *   Word  — se skutečnými šablonami CN (KNG_PODKLADY, CZ/EN/DE/FR): oba
 *           řádky lešení i DALŠÍ UJEDNÁNÍ v tabulce, platné XML.
 * Bez chyb v konzoli. Ceník = zkušební (src/zkusebni_cenik.js).
 *
 * Spuštění: KNG_PODKLADY=<složka se šablonami> NODE_PATH=$(npm root -g) node overit_leseni_spec.mjs */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';

const KOREN = fileURLToPath(new URL('.', import.meta.url));
const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + JSON.stringify(detail).slice(0, 600))); }
};

const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 } });
const p = await ctx.newPage();
const konzole = [];
p.on('pageerror', e => konzole.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') konzole.push('error: ' + m.text()); });
await p.goto(KDE);
await p.waitForTimeout(600);

const { createRequire } = await import('module');
const ZC = createRequire(import.meta.url)(KOREN + 'src/zkusebni_cenik.js');
await p.evaluate(([c, cp]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  NAST.jeAdmin = true;
  ZAK = novaZakazka(); syncVarianta();
  ZAK.cislo = '2026 - OPR - CN - 9163'; ZAK.nazevAkce = 'Lešení ve specifikaci';
  ZAK.objednatel = 'Smyšlený objednatel'; ZAK.adresa = 'Ulice 1, Praha';
  C.kurzEurKc = 25;
  /* snímek obchodník: vnitřní šachta, oba příplatky lešení v nabídce (vnitřní lešení není v ceně) */
  Object.assign(Z, { prejezd: 3.5, zdvih: 12, prohluben: 1.1, sirka: 1.6, hloubka: 1.5, nastupiste: 4, typSachty: 'interiérová' });
  Z.volitelne.leseniVnitrni = false; Z.volitelne.leseniVnejsi = false;
  render();
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);
await p.waitForTimeout(250);

const VNITRNI = 'LEŠENÍ VNITŘNÍ PRO STAVBU OCK', VNEJSI = 'LEŠENÍ KOLEM OCK PRO PROVEDENÍ OPLÁŠTĚNÍ';
const radek = (lbl) => p.evaluate((lbl) => {
  prepniTab('spec'); render();
  const r = [...document.querySelectorAll('#page-spec .spec-row')].find(x => (x.querySelector('.lbl') || {}).textContent === lbl);
  if (!r) return null;
  const sel = r.querySelector('select');
  return { hodnota: sel ? sel.value : null, stitek: (r.querySelector('.pill.src') || {}).textContent || '',
    vrat: !!r.querySelector('button[onclick^="tsReset"]'), text: r.textContent.replace(/\s+/g, ' ').trim() };
}, lbl);

console.log('\nBod 2 — lešení ve specifikaci řízené kalkulací');
const sekceNeni = await p.evaluate(() => { prepniTab('spec'); render();
  const h = [...document.querySelectorAll('#page-spec h3')].find(x => x.textContent === 'SOUČÁSTÍ DODÁVKY NENÍ');
  const out = []; let el = h && h.nextElementSibling;
  while (el && el.tagName !== 'H3') { const l = el.querySelector && el.querySelector('.lbl'); if (l) out.push(l.textContent); el = el.nextElementSibling; }
  return out; });
zkus('SOUČÁSTÍ DODÁVKY NENÍ má oba řádky lešení (vnitřní hned před lešením kolem OCK)',
  sekceNeni.indexOf(VNITRNI) >= 0 && sekceNeni.indexOf(VNEJSI) === sekceNeni.indexOf(VNITRNI) + 1, sekceNeni);
for (const lbl of [VNITRNI, VNEJSI]) {
  const r = await radek(lbl);
  zkus(lbl + ': „nabízeno jako příplatek" se štítkem „z kalkulace"', r && r.hodnota === 'nabízeno jako příplatek' && r.stitek === 'z kalkulace' && !r.vrat, r);
}
/* ruční přepis výběrem z číselníku a ↺ */
await p.evaluate((lbl) => {
  const r = [...document.querySelectorAll('#page-spec .spec-row')].find(x => (x.querySelector('.lbl') || {}).textContent === lbl);
  const sel = r.querySelector('select'); sel.value = 'zajistí objednatel'; sel.dispatchEvent(new Event('change'));
}, VNITRNI);
await p.waitForTimeout(150);
let r = await radek(VNITRNI);
zkus('ruční volba: hodnota platí, štítek „ručně" a tlačítko ↺', r.hodnota === 'zajistí objednatel' && r.stitek === 'ručně' && r.vrat, r);
await p.evaluate((lbl) => {
  const rr = [...document.querySelectorAll('#page-spec .spec-row')].find(x => (x.querySelector('.lbl') || {}).textContent === lbl);
  rr.querySelector('button[onclick^="tsReset"]').click();
}, VNITRNI);
await p.waitForTimeout(150);
r = await radek(VNITRNI);
zkus('↺ vrátí návrh z kalkulace', r.hodnota === 'nabízeno jako příplatek' && r.stitek === 'z kalkulace' && !r.vrat, r);
/* vnitřní lešení do základní ceny → řádek se do dokumentu nedává */
await p.evaluate(() => { Z.volitelne.leseniVnitrni = true; render(); });
r = await radek(VNITRNI);
zkus('vnitřní lešení v základní ceně: „do dokumentu se nedává" (z kalkulace)', r && /do dokumentu se nedává/.test(r.text) && r.stitek === 'z kalkulace', r);
await p.evaluate(() => { Z.volitelne.leseniVnitrni = false; render(); });

console.log('\nBod 3 — vlastní řádek specifikace');
await p.evaluate(() => { prepniTab('spec'); render();
  [...document.querySelectorAll('#page-spec button')].find(x => /přidat vlastní řádek/.test(x.textContent)).click(); });
await p.waitForTimeout(150);
await p.evaluate(() => {
  const rr = [...document.querySelectorAll('#page-spec .spec-row')].filter(x => x.querySelector('button[onclick^="tsExtraDel"]'));
  const [lbl, hod] = rr[rr.length - 1].querySelectorAll('input');
  lbl.value = 'PŘEDÁNÍ STAVENIŠTĚ'; lbl.dispatchEvent(new Event('change'));
});
await p.waitForTimeout(100);
await p.evaluate(() => {
  const rr = [...document.querySelectorAll('#page-spec .spec-row')].filter(x => x.querySelector('button[onclick^="tsExtraDel"]'));
  const hod = rr[rr.length - 1].querySelectorAll('input')[1];
  hod.value = 'zajistí objednatel v rámci SP'; hod.dispatchEvent(new Event('change'));
});
await p.waitForTimeout(100);
const extra = await p.evaluate(() => JSON.stringify(TS.extra));
zkus('vlastní řádek je ve specifikaci', /PŘEDÁNÍ STAVENIŠTĚ/.test(extra) && /v rámci SP/.test(extra), extra);

async function okno(fn) {
  const [w] = await Promise.all([ctx.waitForEvent('page'), p.evaluate(f => (0, eval)(f + '()'), fn)]);
  await w.waitForLoadState('domcontentloaded');
  await w.waitForTimeout(400);
  return w;
}
for (const [fn, jmeno] of [['nabidkaNahled', 'náhled podkladů CN'], ['nabidkaOckDokument', 'tisk CN (online dokument)']]) {
  const w = await okno(fn);
  const t = await w.evaluate(() => document.body.innerText);
  zkus(jmeno + ': oba řádky lešení „nabízeno jako příplatek"',
    new RegExp(VNITRNI + '\\s+nabízeno jako příplatek').test(t) && new RegExp(VNEJSI + '\\s+nabízeno jako příplatek').test(t), t.slice(0, 300));
  zkus(jmeno + ': sekce DALŠÍ UJEDNÁNÍ s vlastním řádkem', /DALŠÍ UJEDNÁNÍ/i.test(t) && /PŘEDÁNÍ STAVENIŠTĚ\s+zajistí objednatel v rámci SP/.test(t),
    t.slice(Math.max(0, t.search(/DALŠÍ UJEDNÁNÍ/i) - 50), t.search(/DALŠÍ UJEDNÁNÍ/i) + 200));
  zkus(jmeno + ': DALŠÍ UJEDNÁNÍ až za SOUČÁSTÍ DODÁVKY NENÍ', t.search(/DALŠÍ UJEDNÁNÍ/i) > t.search(/SOUČÁSTÍ DODÁVKY NENÍ/i));
  await w.close();
}
/* EN tisk */
await p.evaluate(() => { if (typeof tiskJazykNastav === 'function') tiskJazykNastav('en'); else NAST.jazyk = 'en'; });
{
  const w = await okno('nabidkaOckDokument');
  const t = await w.evaluate(() => document.body.innerText);
  const en = await p.evaluate(() => [tr('LEŠENÍ VNITŘNÍ PRO STAVBU OCK', 'en'), tr('DALŠÍ UJEDNÁNÍ', 'en'), tr('zajistí objednatel v rámci SP', 'en')]);
  zkus('EN tisk CN: přeložený řádek vnitřního lešení a sekce DALŠÍ UJEDNÁNÍ', t.toLowerCase().includes(en[0].toLowerCase())
    && t.toLowerCase().includes(en[1].toLowerCase()) && t.toLowerCase().includes(en[2].toLowerCase()), en);
  await w.close();
}
await p.evaluate(() => { if (typeof tiskJazykNastav === 'function') tiskJazykNastav('cz'); else NAST.jazyk = 'cz'; });

console.log('\nWord — skutečné šablony CN');
const KDE_SABLON = [process.env.KNG_PODKLADY, '/home/claude/work/sablona'].filter(Boolean);
const najdi = (jm) => { for (const d of KDE_SABLON) { const f = d + '/' + jm; if (existsSync(f)) return f; } return null; };
const SABLONY = [['Sablona_NABIDKA_CN_v15.docx', 'cz'], ['Sablona_NABIDKA_CN_v15_EN.docx', 'en'], ['Sablona_NABIDKA_CN_v15_DE.docx', 'de'],
  ['Sablona_NABIDKA_CN_v15_FR.docx', 'fr'], ['Sablona_NABIDKA_CN_v14.docx', 'cz'], ['Sablona_NABIDKA_CN_v13.docx', 'cz'], ['Sablona_NABIDKA_CN_v11.docx', 'cz']];
let wordu = 0;
for (const [jm, L] of SABLONY) {
  const f = najdi(jm);
  if (!f) { console.log('  – přeskočeno (chybí ' + jm + ')'); continue; }
  wordu++;
  const b64 = readFileSync(f).toString('base64');
  const v = await p.evaluate(async ([b64, L]) => {
    const u8 = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const res = await dokumentVygeneruj('nabidka', u8.buffer, ZAK, aktivniVarianta(ZAK), JEKLY, L);
    const buf = await res.blob.arrayBuffer();
    const doc = new TextDecoder().decode((await zipPrecti(new Uint8Array(buf))).find(x => x.nazev === 'word/document.xml').data);
    const text = (doc.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) || []).map(t => t.replace(/<[^>]*>/g, '')).join('|');
    return { text, vady: await docxXmlVady(buf),
      fr: ['LEŠENÍ VNITŘNÍ PRO STAVBU OCK', 'LEŠENÍ KOLEM OCK PRO PROVEDENÍ OPLÁŠTĚNÍ', 'nabízeno jako příplatek', 'DALŠÍ UJEDNÁNÍ',
        'zajistí objednatel v rámci SP'].map(x => L === 'cz' ? x : tr(x, L)) };
  }, [b64, L]);
  const t = v.text.toLowerCase(), fr = v.fr.map(x => x.toLowerCase());
  const iV = t.indexOf(fr[0]), iK = t.lastIndexOf(fr[1]);
  zkus(jm + ': řádek vnitřního lešení s hodnotou, před lešením kolem OCK', iV >= 0 && t.indexOf(fr[2], iV) > iV && iV < iK, t.slice(Math.max(0, iV - 200), iV + 300));
  const iD = t.indexOf(fr[3]);
  zkus(jm + ': pruh DALŠÍ UJEDNÁNÍ a vlastní řádek za lešením', iD > iK && t.indexOf('předání staveniště', iD) > iD, t.slice(Math.max(0, iD - 100), iD + 200));
  zkus(jm + ': platné XML, žádný nevyplněný {{TS_…}}', v.vady.length === 0 && !/\{\{TS_/.test(v.text), v.vady);
}
if (!wordu) console.log('  – Word přeskočen: nastavte KNG_PODKLADY');

zkus('bez chyb v konzoli', konzole.length === 0, konzole);
await b.close();
console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
