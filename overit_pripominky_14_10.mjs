/* Ověření v prohlížeči: připomínky obchodu 14. 10. 2026 (větev
 * claude/pripominky-14-10).
 *   bod 1 — volba „Nabízet autorský dozor" v kartě Cenová nabídka (PROJ),
 *           výchozí NE; zaškrtnutí vrátí blok AD do nabídky PROJ,
 *   bod 2 — NÁZEV AKCE technické specifikace z hlavičky zakázky, ruční
 *           přepis se štítkem „ručně" a ↺,
 *   bod 3 — OPLECHOVÁNÍ SOKLU PROHLUBNĚ ve specifikaci (odvozený řádek),
 *   hodiny — tabulka „Hodiny z kalkulace" na konci krycího listu OCK i PROJ
 *           (verze BO), celé hodiny; od 15. 10. každý list jen svou stranu
 *           (podrobně overit_hodiny_po_listech.mjs).
 * Bez chyb v konzoli. Ceník = zkušební (src/zkusebni_cenik.js).
 *
 * Spuštění: NODE_PATH=$(npm root -g) node overit_pripominky_14_10.mjs */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const KOREN = fileURLToPath(new URL('.', import.meta.url));
const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + JSON.stringify(detail))); }
};

const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
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
  ZAK.nazevAkce = 'Bytový dům Zkušební 12 — výtah';
  Object.assign(Z, { prejezd: 2.7, zdvih: 17.325, prohluben: 1.05, sirka: 1.51, hloubka: 1.515, nastupiste: 6, typSachty: 'exteriérová' });
  render();
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);
await p.waitForTimeout(250);

console.log('\nBod 1 — autorský dozor v nabídce PROJ');
const adStav = () => p.evaluate(() => {
  prepniTab('proj'); render();
  const cb = document.getElementById('projNabizetAD');
  const d = nabidkaProjData(ZAK, aktivniVarianta(ZAK));
  return { cb: !!cb, checked: cb ? cb.checked : null,
    ad: d.bloky.some(x => /AUTORSK/.test(x.nadpis || '')), tag: PJ.nabizetAD };
});
let s = await adStav();
zkus('volba „Nabízet autorský dozor" je v kartě a výchozí nezaškrtnutá', s.cb && s.checked === false && s.tag === false, s);
zkus('nabídka PROJ bez AD', s.ad === false, s);
await p.evaluate(() => { const cb = document.getElementById('projNabizetAD'); cb.checked = true; cb.dispatchEvent(new Event('change')); });
await p.waitForTimeout(150);
s = await adStav();
zkus('zaškrtnutí → zadání nese nabizetAD = true a nabídka blok AD má', s.tag === true && s.ad === true && s.checked === true, s);

console.log('\nBod 2 — název akce ve specifikaci');
const naStav = () => p.evaluate(() => {
  prepniTab('spec'); render();
  const inp = document.getElementById('tsNazevAkce');
  const radek = inp && inp.closest('.spec-row');
  return { hodnota: inp ? inp.value : null, text: radek ? radek.textContent.replace(/\s+/g, ' ') : '',
    vrat: !!(radek && radek.querySelector('button[onclick="tsNazevAkceVrat()"]')) };
});
let n = await naStav();
zkus('převzatý název akce z hlavičky se štítkem „z hlavičky zakázky"', n.hodnota === 'Bytový dům Zkušební 12 — výtah'
  && /z hlavičky zakázky/.test(n.text) && !n.vrat, n);
await p.evaluate(() => { const i = document.getElementById('tsNazevAkce'); i.value = 'vestavba nové prosklené OCK výtahové šachty'; i.dispatchEvent(new Event('change')); });
await p.waitForTimeout(150);
n = await naStav();
zkus('ruční přepis: hodnota platí, štítek „ručně" a ↺', n.hodnota === 'vestavba nové prosklené OCK výtahové šachty' && /ručně/.test(n.text) && n.vrat, n);
await p.evaluate(() => { ZAK.nazevAkce = 'Jiný název'; render(); });
n = await naStav();
zkus('ruční přepis hlavička nepřebije', n.hodnota === 'vestavba nové prosklené OCK výtahové šachty', n);
await p.evaluate(() => tsNazevAkceVrat());
await p.waitForTimeout(150);
n = await naStav();
zkus('↺ vrátí převzatý název z hlavičky', n.hodnota === 'Jiný název' && /z hlavičky zakázky/.test(n.text), n);

console.log('\nBod 3 — oplechování soklu prohlubně ve specifikaci');
const soklStav = () => p.evaluate(() => {
  prepniTab('spec'); render();
  return [...document.querySelectorAll('#page-spec .spec-row')]
    .filter(r => (r.querySelector('.lbl') || {}).textContent === 'OPLECHOVÁNÍ SOKLU PROHLUBNĚ')
    .map(r => ({ hodnota: (r.querySelector('.spec-odvozene') || {}).textContent, tisk: !r.classList.contains('noprint') }));
});
let so = await soklStav();
zkus('exteriér, sokl jako příplatek: do tisku jen řádek „nabízeno jako příplatek"',
  so.filter(x => x.tisk).length === 1 && so.find(x => x.tisk).hodnota === 'nabízeno jako příplatek', so);
await p.evaluate(() => { Z.volitelne.sokl = true; render(); });
so = await soklStav();
zkus('sokl v základní ceně: do tisku jen „je součástí dodávky"',
  so.filter(x => x.tisk).length === 1 && so.find(x => x.tisk).hodnota === 'je součástí dodávky', so);

console.log('\nHodiny z kalkulace v krycích listech');
const hodiny = (tab) => p.evaluate((t) => {
  prepniTab(t); render();
  const el = document.getElementById(t === 'kryci' ? 'kryciHodiny_ock' : 'kryciHodiny_proj');
  return el ? [...el.querySelectorAll('tr')].map(r => [...r.children].map(c => c.textContent.trim())) : null;
}, tab);
for (const t of ['kryci', 'kryciproj']) {
  const h = await hodiny(t), sl = t === 'kryci' ? 'OCK' : 'PROJ';
  zkus(t + ': tabulka hodin jen se sloupcem ' + sl + ' a řádkem celkem (15. 10.)', !!h && h[0][1] === sl && h[0].length === 2
    && h.some(r => r[0] === 'celkem'), h);
  zkus(t + ': celé hodiny (žádné desetinné číslo)', !!h && !h.some(r => r.some(c => /\d,\d/.test(c))), h);
  zkus(t + (t === 'kryci' ? ': AD (činnost PROJ) v listu OCK není' : ': AD nabízený → řádek autorského dozoru'),
    !!h && h.some(r => r[0] === 'autorský dozor') === (t === 'kryciproj'), h);
}

const dvoji = await p.evaluate(() => { const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
  return ids.filter((x, i) => ids.indexOf(x) !== i); });
zkus('žádné dvojí id v dokumentu', dvoji.length === 0, dvoji);
zkus('bez chyb v konzoli', konzole.length === 0, konzole);
await b.close();
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
