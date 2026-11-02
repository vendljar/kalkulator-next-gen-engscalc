/* overit_k37_sklo.mjs — K37-N1 (kolo 37, test v27.10.6): vyřazené sklo boků
 * po přepnutí typu šachty, zasklení a řady ceníku
 *
 * NÁLEZ: řádek skla boků se jmenuje podle typu šachty („MATERIÁL boční + zadní
 * stěna (dvojsklo …)" u exteriérové, „(VSG 4.4.2)" / „(VSG 4.4.1)" u
 * interiérové) a podle názvu výrobku v ceníku. Vyřazení (`nepocitat`) i ruční
 * přepisy se klíčují názvem. Na nový název je do 2. 11. 2026 přemapovalo jen
 * otevření zakázky (importZakazka → skloMigraceNazvu): po přepnutí typu se
 * vyřazené sklo znovu počítalo, vytištěná nabídka nesla vyšší cenu a po
 * znovuotevření se zase vyřadilo („nesouhlasí" v ověření zámku).
 *
 * KONTROLA: po každé změně je řádek čísel (součty sekcí, souhrn, cena
 * nabídky) SHODNÝ s řádkem po kulaté cestě export → importZakazka.
 *   A) interiér → exteriér s vyřazeným sklem boků (+ přepis množství)
 *   B) exteriér → interiér s vyřazeným dvojsklem
 *   C) zahraniční řada s jiným názvem dvojskla (cenikRadaPrepniUI)
 *   D) zasklení na terče → mezi příčníky (interiér, název VSG 4.4.2 → 4.4.1)
 *   E) změna názvu dvojskla v ceníku zakázky (set('C.skloBokyNazev'))
 *
 * POJISTKA: bez migrace v typSachtyPrepni / set / syncVarianta (stav
 * v27.10.6) selže A, B, C, D i E (cena po změně ≠ cena po znovuotevření).
 *
 * Spuštění: NODE_PATH=$(npm root -g) node overit_k37_sklo.mjs
 * (pracuje nad dist/kalkulacka.html; ceník je zkušební ze src/zkusebni_cenik.js)
 */
import { chromium } from 'playwright';
import { createRequire } from 'module';
import { fileURLToPath } from 'node:url';

const KOREN = fileURLToPath(new URL('.', import.meta.url));
let ok = 0, fail = 0;
const test = (n, c, info) => {
  if (c) { ok++; console.log('  ✓ ' + n); }
  else { fail++; console.log('  ✗ ' + n + (info !== undefined ? '  → ' + String(typeof info === 'string' ? info : JSON.stringify(info)).slice(0, 400) : '')); }
};

const ZC = createRequire(import.meta.url)('./src/zkusebni_cenik.js');
const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage();
const chyby = [];
p.on('pageerror', e => chyby.push(e.message));
await p.goto('file://' + KOREN + 'dist/kalkulacka.html');
await p.waitForFunction(() => typeof novaZakazka === 'function' && typeof render === 'function');
await p.evaluate(([c, cp]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  DEFAULT_CENIK.skloVsg442Kc = DEFAULT_CENIK.skloVsg442Kc || 1700;
  NAST.jeAdmin = true;
  window.potvrd = () => Promise.resolve(true);
  window.hlaska = () => Promise.resolve();
  /* Řádek čísel: součty sekcí, souhrn a vyřazení — to, co porovnává ověření zámku. */
  window.__radek = () => {
    const r = vypocetAkt();
    return JSON.stringify({ sekce: r.souctySekci, souhrn: r.souhrn,
      vyrazene: (Z.nepocitat || []).filter(n => /^MATERIÁL/.test(n)).sort(),
      mnozstvi: Object.keys(Z.mnozstviPrepis || {}).filter(n => /^MATERIÁL/.test(n)).sort() });
  };
  /* Kulatá cesta: export → importZakazka (jako uložení a znovuotevření). */
  window.__kulata = () => {
    const pred = ZAK;
    ZAK = importZakazka(JSON.parse(JSON.stringify(pred)));
    syncVarianta();
    const radek = window.__radek();
    ZAK = pred; syncVarianta();
    return radek;
  };
  window.__nova = (typ, zaskleni) => {
    ZAK = novaZakazka(); ZAK.cislo = '2026 - OPR - CN - 0937'; syncVarianta();
    Z.typSachty = typ; if (zaskleni) Z.zaskleni = zaskleni;
    Z.profily = JSON.parse(JSON.stringify(PROFILY_VYCHOZI[typ]));
    syncVarianta(); render();
    return skloVolba(Z, C).boky.nazev;
  };
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);

const krok = async (popis, priprava, zmena) => {
  const s = await p.evaluate(async ([pr, zm]) => {
    window.__nova(pr.typ, pr.zaskleni);
    if (pr.pred) await (new Function('return (async () => {' + pr.pred + '})()'))();
    const boky = skloVolba(Z, C).boky.nazev;
    Z.nepocitat = [boky];
    if (pr.mnozstvi) { Z.mnozstviPrepis = {}; Z.mnozstviPrepis[boky] = 3; }
    const predZmenou = window.__radek();
    await (new Function('return (async () => {' + zm + '})()'))();
    const po = window.__radek();
    const kulata = window.__kulata();
    return { boky, novy: skloVolba(Z, C).boky.nazev, predZmenou, po, kulata, nepocitat: Z.nepocitat };
  }, [priprava, zmena]);
  test(popis + ': název řádku skla se změnil (' + s.boky + ' → ' + s.novy + ')', s.boky !== s.novy, s);
  test(popis + ': řádek čísel po změně = po kulaté cestě export → importZakazka', s.po === s.kulata,
    { po: s.po, kulata: s.kulata });
  test(popis + ': sklo boků zůstalo vyřazené (pod novým názvem)', s.nepocitat.includes(s.novy), s.nepocitat);
  return s;
};

console.log('A) interiér → exteriér');
await krok('A', { typ: 'interiérová', mnozstvi: true }, "typSachtyPrepni('exteriérová');");
{
  const m = await p.evaluate(() => Z.mnozstviPrepis[skloVolba(Z, C).boky.nazev]);
  test('A: přepis množství skla boků přešel na nový název', m === 3, m);
}
console.log('B) exteriér → interiér');
await krok('B', { typ: 'exteriérová' }, "typSachtyPrepni('interiérová');");
console.log('C) zahraniční řada s jiným názvem dvojskla');
await p.evaluate(() => {
  CENIK_ZAHR.ceny = { 'C.skloBokyNazev': 'dvojsklo zahraniční', 'C.skloBokyKc': 2500 };
  CENIK_ZAHR.jenZahr = {};
});
await krok('C', { typ: 'exteriérová' }, "await cenikRadaPrepniUI('zahr');");
{
  const r = await p.evaluate(() => typeof cenikRadaVarianty === 'function' ? cenikRadaVarianty(aktivniVarianta(ZAK).data) : '?');
  test('C: varianta je opravdu v zahraniční řadě', r === 'zahr', r);
}
await krok('C (zpět)', { typ: 'exteriérová', pred: "await cenikRadaPrepniUI('zahr');" }, "await cenikRadaPrepniUI('cr');");
console.log('D) zasklení na terče → mezi příčníky');
await krok('D', { typ: 'interiérová', zaskleni: 'na terče' }, "set('Z.zaskleni', 'mezi příčníky');");
console.log('E) název dvojskla v ceníku zakázky');
await krok('E', { typ: 'exteriérová' }, "set('C.skloBokyNazev', 'dvojsklo jiné Ug=1,1');");

test('bez chyb na stránce', chyby.length === 0, chyby);
await b.close();
console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
process.exit(fail ? 1 : 0);
