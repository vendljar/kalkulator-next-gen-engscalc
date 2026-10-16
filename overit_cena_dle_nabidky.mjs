/* Ověření v prohlížeči: příznak ceníku „cena dle nabídky" (S13, v16.10.3;
 * e-mail obchodníka D. S. 15. 10. 2026, varianta A schválená J. V. 16. 10.).
 *
 * Co se hlídá (model a server hlídají src/test_cena_dle_nabidky.js
 * a netlify/test_cena_dle_nabidky.mjs; tady jde o to, co uvidí lidé):
 *   1) Nastavení → Ceník: správce má sloupec „Cena dle nabídky", osm
 *      nabídkových položek je zaškrtnutých, lešení a ventilátor ne;
 *      zaškrtnutí zapíše příznak do ceníku varianty; obchodník sloupec nemá;
 *   2) Kalkulace OCK → Příplatky: u prosklené stěny štítek „cena dle
 *      nabídky", po přepsání ceny navíc „vlastní cena"; u ventilátoru nic;
 *   3) tisk nabídky: obchodník s vlastní cenou stěny zábranu „cenovaVyjimka"
 *      nedostane; u ventilátoru pod ceníkem ano, s hláškou „Ventilátor …:
 *      cena pod ceníkem"; podstrčený příznak ve variantě zábranu nezruší.
 * Platný ceník = záznam programu (PROG_STAV), týž, ze kterého počítá server.
 * Čísla jsou smyšlená (zkusebni_cenik.js + částky v harnessu).
 *
 * Pojistka proti prázdnému testu: proti v15.10.14 (1cbab3a) padá oddíl 1
 * (sloupec chybí), 2 (štítky chybí) i 3 (zábrana u stěny).
 *
 * Spuštění: node overit_cena_dle_nabidky.mjs */
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ZC = require('./src/zkusebni_cenik.js');
const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + JSON.stringify(detail).slice(0, 400))); }
};

const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
const konzole = [];
p.on('pageerror', e => konzole.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') konzole.push('error: ' + m.text()); });
await p.goto(KDE);
await p.waitForTimeout(600);

const STENA = 'C.priplatky.prosklenaStenaKc';
const c = ZC.zkusebniCenik();
c.priplatky.prosklenaStenaKc = 50000; c.priplatky.ventilatorKc = 20000;
c.dleNabidky = { [STENA]: true };
const cp = ZC.zkusebniCenikProj();

/* ---------- 1) Nastavení → Ceník ---------- */
await p.evaluate(() => { NAST.jeAdmin = true; zobrNahled && zobrNahled(''); prepniTab('cenik'); render(); });
await p.waitForTimeout(200);
const sl = await p.evaluate(() => {
  const html = document.getElementById('page-cenik').innerHTML;
  const chk = [...document.querySelectorAll('#page-cenik input[onchange^="cenikDleNabidkySet"]')];
  const zaskrt = chk.filter(x => x.checked).map(x => /cenikDleNabidkySet\('([^']+)'/.exec(x.getAttribute('onchange'))[1]);
  return { hlava: /<th[^>]*>Cena dle nabídky<\/th>/.test(html), pocet: chk.length, zaskrt };
});
zkus('správce: v ceníku OCK je sloupec „Cena dle nabídky"', sl.hlava && sl.pocet > 20, sl);
zkus('výchozí ceník: zaškrtnuto osm nabídkových položek, mezi nimi prosklená stěna',
  sl.zaskrt.length === 8 && sl.zaskrt.includes(STENA), sl.zaskrt);
zkus('lešení, ventilátor a sklo zaškrtnuté nejsou',
  !sl.zaskrt.some(x => /leseni|ventilator|vsgFolie|madla/.test(x)), sl.zaskrt);
const klik = await p.evaluate(() => {
  const el = document.querySelector('#page-cenik input[onchange="cenikDleNabidkySet(\'C.priplatky.ventilatorKc\', this.checked)"]');
  if (!el) return { chybi: true };
  el.click();
  const po = !!(C.dleNabidky && C.dleNabidky['C.priplatky.ventilatorKc'] === true);
  const el2 = document.querySelector('#page-cenik input[onchange="cenikDleNabidkySet(\'C.priplatky.ventilatorKc\', this.checked)"]');
  el2.click();
  return { po, zpet: !(C.dleNabidky && C.dleNabidky['C.priplatky.ventilatorKc']) };
});
zkus('zaškrtnutí zapíše příznak do ceníku varianty, odškrtnutí ho smaže', klik.po && klik.zpet, klik);
await p.evaluate(() => { zobrNahled('Obchodník'); prepniTab('cenik'); render(); });
await p.waitForTimeout(200);
const slO = await p.evaluate(() => /Cena dle nabídky<\/th>/.test((document.getElementById('page-cenik') || {}).innerHTML || ''));
zkus('obchodník sloupec nemá', !slO);

/* ---------- 2) Kalkulace OCK → Příplatky: štítky ---------- */
await p.evaluate(([c, cp]) => {
  zobrNahled('');
  PROG_STAV.db = { platny: { verze: 2, cenik: JSON.parse(JSON.stringify(c)), cenikProj: JSON.parse(JSON.stringify(cp)),
    zahranicni: { ceny: {}, jenZahr: {} } } };
  progPouzij(PROG_STAV.db.platny);
  ZAK = novaZakazka(); ZAK.cislo = '2026 - OPR - CN - 0778'; ZAK.nazevAkce = 'TEST dle nabídky'; syncVarianta();
  const d = aktivniVarianta(ZAK).data;
  Object.assign(d.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  d.cenik = JSON.parse(JSON.stringify(c)); d.proj.cenik = JSON.parse(JSON.stringify(cp));
  cenikOznacJakoDnesni(d, { verze: 2 }); syncVarianta();
  prepniTab('kalk'); render();
}, [c, cp]);
await p.waitForTimeout(250);
const radek = (nazev) => p.evaluate((nazev) => {
  const tr = [...document.querySelectorAll('#page-kalk tr')].find(t => {
    const inp = t.querySelector('input.nazev-ed');
    return (inp ? inp.value : t.textContent).toUpperCase().includes(nazev);
  });
  return tr ? { dle: !!tr.querySelector('.dle-nabidky'), vlastni: !!tr.querySelector('.vlastni-cena') } : null;
}, nazev);
let r = await radek('PROSKLENÁ STĚNA');
zkus('příplatek s příznakem: štítek „cena dle nabídky", bez „vlastní cena"', r && r.dle && !r.vlastni, r);
r = await radek('VENTILÁTOR');
zkus('ventilátor (bez příznaku): žádný štítek', r && !r.dle && !r.vlastni, r);
await p.evaluate(() => set('C.priplatky.prosklenaStenaKc', 12000));
await p.waitForTimeout(200);
r = await radek('PROSKLENÁ STĚNA');
zkus('po přepsání ceny: „cena dle nabídky" + „vlastní cena"', r && r.dle && r.vlastni, r);
await p.evaluate(() => zobrNahled('Obchodník'));
await p.waitForTimeout(200);
r = await radek('PROSKLENÁ STĚNA');
zkus('obchodník štítky vidí taky', r && r.dle && r.vlastni, r);

/* ---------- 3) tisk nabídky (zábrana „cenovaVyjimka") ---------- */
const stav = () => p.evaluate(() => {
  const k = kontrolyStavAkt();
  return { brani: k.kodyBrani.includes('cenovaVyjimka'), text: kontrolyZabranaDokumentu(k, 'nabidka') || '' };
});
let s = await stav();
zkus('obchodník: vlastní cena stěny — tisk nabídky není zablokovaný (žádná zábrana)', !s.brani && s.text === '', s);
await p.evaluate(() => { aktivniVarianta(ZAK).data.cenik.priplatky.ventilatorKc = 15000; render(); });
await p.waitForTimeout(200);
s = await stav();
zkus('obchodník: ventilátor pod ceníkem tisk zablokuje', s.brani, s);
zkus('… s konkrétní hláškou „Ventilátor …: cena pod ceníkem"', /Ventilátor[^:]*: cena pod ceníkem/.test(s.text) && !/směs/.test(s.text), s.text);
await p.evaluate(() => { const d = aktivniVarianta(ZAK).data; d.cenik.priplatky.ventilatorKc = 20000;
  PROG_STAV.db.platny.cenik.dleNabidky = {};                       // platný ceník bez příznaku
  d.cenik.dleNabidky = { 'C.priplatky.prosklenaStenaKc': true };   // podstrčený ve variantě
  render(); });
await p.waitForTimeout(200);
s = await stav();
zkus('podstrčený příznak ve variantě (platný ho nemá): zábrana zůstává', s.brani && /Prosklená stěna/.test(s.text), s);
await p.evaluate(() => { PROG_STAV.db = null; zobrNahled(''); render(); });

zkus('žádná chyba JavaScriptu', konzole.length === 0, konzole.slice(0, 3));
await b.close();
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
