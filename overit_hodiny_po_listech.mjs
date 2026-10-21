/* Ověření v prohlížeči: hodiny v krycím listu jen za vlastní stranu
 * (zadání J. V. 15. 10. 2026, větev claude/hodiny-po-listech, v15.10.10).
 *   – krycí list OCK: tabulka „Hodiny z kalkulace" jen se sloupcem OCK,
 *     krycí list PROJ jen se sloupcem PROJ (obrazovka i tiskový náhled BO),
 *   – číslo OPR (PROJ vyřazená): list PROJ tabulku hodin nemá vůbec,
 *   – číslo OVP (OCK vyřazená): list OCK tabulku hodin nemá vůbec,
 *   – Techdata hodiny nemá; bez chyb v konzoli.
 * Ceník = zkušební (src/zkusebni_cenik.js).
 *
 * Spuštění: python3 build.py && NODE_PATH=$(npm root -g) node overit_hodiny_po_listech.mjs */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

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

const ZC = createRequire(import.meta.url)(KOREN + 'src/zkusebni_cenik.js');
const zalozeni = (cislo) => p.evaluate(([c, cp, cislo]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  NAST.jeAdmin = true;
  ZAK = novaZakazka(); syncVarianta();
  ZAK.nazevAkce = 'Bytový dům Zkušební 12 — výtah';
  ZAK.cislo = cislo;
  Object.assign(Z, { prejezd: 2.7, zdvih: 17.325, prohluben: 1.05, sirka: 1.51, hloubka: 1.515, nastupiste: 6, typSachty: 'exteriérová' });
  render();
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj(), cislo]);

/* tabulka hodin na obrazovce: null = blok ve stránce není */
const obrazovka = (tab) => p.evaluate((t) => {
  prepniTab(t); render();
  const el = document.getElementById(t === 'kryci' ? 'kryciHodiny_ock' : 'kryciHodiny_proj');
  return el ? [...el.querySelectorAll('tr')].map(r => [...r.children].map(c => c.textContent.trim())) : null;
}, tab);
/* tiskový náhled verze BO / Techdata: tabulka pod nadpisem „Hodiny z kalkulace" */
const nahled = async (tab, verze) => {
  /* Vyřazená strana: tisk jejího listu zastaví zábrana dokumentu (#377,
   * P6) — náhled se neotevře. Pak se čtou rovnou data tisku (kryciData /
   * kryciProjData), ze kterých by náhled vznikl. */
  const zabrana = await p.evaluate(([t, v]) => (typeof dokumentZabrana === 'function')
    ? dokumentZabrana((t === 'kryci' ? 'kryci_' : 'kryciproj_') + v, aktivniVarianta(ZAK)) : '', [tab, verze]);
  if (zabrana) return p.evaluate(([t, v]) => {
    const d = (t === 'kryci' ? kryciData : kryciProjData)(ZAK, aktivniVarianta(ZAK), JEKLY, v);
    const s = d.sekce.find(x => x.sekce === 'Hodiny z kalkulace');
    return s ? [s.sloupce].concat(s.radky) : null;
  }, [tab, verze]);
  const [okno] = await Promise.all([
    p.waitForEvent('popup'),
    p.evaluate(([t, v]) => { prepniTab(t); render(); (t === 'kryci' ? kryciTiskPohled : kryciProjTiskPohled)(v); }, [tab, verze]),
  ]);
  await okno.waitForLoadState();
  const h = await okno.evaluate(() => {
    const h2 = [...document.querySelectorAll('h2')].find(x => /Hodiny z kalkulace/i.test(x.textContent));
    if (!h2) return null;
    const t = h2.nextElementSibling;
    return t ? [...t.querySelectorAll('tr')].map(r => [...r.children].map(c => c.textContent.trim())) : [];
  });
  await okno.close();
  return h;
};
const jenStrana = (h, nazev) => !!h && h[0].length === 2 && h[0][1] === nazev && h.every(r => r.length === 2)
  && h.some(r => r[0] === 'celkem') && !h.some(r => r.some(c => c === '—' && r[0] !== 'celkem'));

console.log('\nZakázka bez čísla (počítají se obě strany)');
await zalozeni('');
let h = await obrazovka('kryci');
zkus('obrazovka, list OCK: jen sloupec OCK, montáž ano, studie ne', jenStrana(h, 'OCK')
  && h.some(r => r[0] === 'montáž na stavbě') && !h.some(r => r[0] === 'studie'), h);
h = await obrazovka('kryciproj');
zkus('obrazovka, list PROJ: jen sloupec PROJ, studie ano, montáž ne', jenStrana(h, 'PROJ')
  && h.some(r => r[0] === 'studie') && !h.some(r => r[0] === 'montáž na stavbě'), h);
h = await nahled('kryci', 'bo');
zkus('tisk BO, list OCK: tabulka hodin jen OCK', jenStrana(h, 'OCK') && !h.some(r => r[0] === 'studie'), h);
h = await nahled('kryciproj', 'bo');
zkus('tisk BO, list PROJ: tabulka hodin jen PROJ', jenStrana(h, 'PROJ') && !h.some(r => r[0] === 'montáž na stavbě'), h);
zkus('tisk Techdata, list OCK: hodiny nejsou', (await nahled('kryci', 'techdata')) === null);
zkus('tisk Techdata, list PROJ: hodiny nejsou', (await nahled('kryciproj', 'techdata')) === null);

console.log('\nČíslo OPR (PROJ vyřazená)');
await zalozeni('2026 - OPR - CN - 9160');
h = await obrazovka('kryci');
zkus('obrazovka, list OCK: hodiny OCK zůstávají', jenStrana(h, 'OCK'), h);
h = await nahled('kryci', 'bo');
zkus('tisk BO, list OCK: tabulka hodin jen OCK', jenStrana(h, 'OCK'), h);
zkus('obrazovka, list PROJ: tabulka hodin není vůbec', (await obrazovka('kryciproj')) === null);
zkus('tisk BO (data), list PROJ: sekce hodin není', (await nahled('kryciproj', 'bo')) === null);

console.log('\nČíslo OVP (OCK vyřazená)');
await zalozeni('2026 - OVP - CN - 9161');
zkus('obrazovka, list OCK: tabulka hodin není vůbec', (await obrazovka('kryci')) === null);
h = await obrazovka('kryciproj');
zkus('obrazovka, list PROJ: hodiny PROJ zůstávají', jenStrana(h, 'PROJ'), h);
h = await nahled('kryciproj', 'bo');
zkus('tisk BO, list PROJ: tabulka hodin jen PROJ', jenStrana(h, 'PROJ'), h);
zkus('tisk BO (data), list OCK: sekce hodin není', (await nahled('kryci', 'bo')) === null);

const dvoji = await p.evaluate(() => { const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
  return ids.filter((x, i) => ids.indexOf(x) !== i); });
zkus('žádné dvojí id v dokumentu', dvoji.length === 0, dvoji);
zkus('bez chyb v konzoli', konzole.length === 0, konzole);
await b.close();
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
