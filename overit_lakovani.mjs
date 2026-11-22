/* Ověření v prohlížeči: lakování — cena z nabídky lakovny jako částka řádku
 * (#666, J. V. 18. 11. 2026; vzor #561 / #667).
 *
 * Co se hlídá (model a server: src/test_666_lakovani.js,
 * netlify/test_666_lakovani.mjs; tady to, co uvidí lidé):
 *   1) obchodník má u souhrnného řádku LAKOVÁNÍ „✎ cena z nabídky", řádek
 *      s poznámkou (nahradí výpočet, za šachtu, vlastní položky se přičtou),
 *      „Výpočet z ceníku: skryto" (P12); řádek sloupů můstků tlačítko nemá;
 *   2) částka bez zdroje → „chybí zdroj", Potvrdit zakázané, zábrana tisku;
 *      se zdrojem → „nepotvrzeno"; Potvrdit → „✓ potvrzeno", tisk volný,
 *      řádek lakování = částka;
 *   3) správce vidí výpočet z ceníku a odchylku;
 *   4) „↺ vrátit" smaže klíč, lakování zase z ceníku;
 *   5) Detail výpočtu ukazuje „Cena z nabídky lakovny".
 * Čísla jsou smyšlená.
 *
 * Pojistka: proti 05a496d (před #666) padá oddíl 1 (tlačítko u lakování
 * neexistuje) a s ním další.
 *
 * Spuštění: node overit_lakovani.mjs */
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

const c = ZC.zkusebniCenik(); c.profilasKgKc = 80; c.marze = 0.25;
const cp = ZC.zkusebniCenikProj();
await p.evaluate(([c, cp]) => {
  NAST.jeAdmin = true; zobrNahled('');
  PROG_STAV.db = { platny: { verze: 2, cenik: JSON.parse(JSON.stringify(c)), cenikProj: JSON.parse(JSON.stringify(cp)),
    zahranicni: { ceny: {}, jenZahr: {} } } };
  progPouzij(PROG_STAV.db.platny);
  ZAK = novaZakazka(); ZAK.cislo = '2026 - OPR - CN - 0666'; ZAK.nazevAkce = 'TEST lakování z nabídky'; syncVarianta();
  const d = aktivniVarianta(ZAK).data;
  Object.assign(d.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  d.cenik = JSON.parse(JSON.stringify(c)); d.proj.cenik = JSON.parse(JSON.stringify(cp));
  cenikOznacJakoDnesni(d, { verze: 2 }); syncVarianta();
  zobrNahled('Obchodník'); prepniTab('kalk'); render();
}, [c, cp]);
await p.waitForTimeout(250);

const LAK = 'C.lak.nabidkaKc';
const radek = () => p.evaluate(() => {
  const tr = [...document.querySelectorAll('#page-kalk tr')].find(t => !t.classList.contains('rc-radek')
    && /LAKOVÁNÍ \(ŠACHTA/.test(t.textContent + ' ' + [...t.querySelectorAll('input')].map(i => i.value).join(' ')));
  if (!tr) return null;
  const pod = document.querySelector('#page-kalk tr.rc-radek[data-cesta="C.lak.nabidkaKc"]');
  return { otevri: !!tr.querySelector('.rc-otevri'), nep: !!tr.querySelector('.rc-nepotvrzeno'), potv: !!tr.querySelector('.rc-potvrzeno'),
    bezZdroje: !!tr.querySelector('.rc-bez-zdroje'), potvrditZakazano: !!(pod && pod.querySelector('.rc-potvrdit') && pod.querySelector('.rc-potvrdit').disabled),
    pod: pod ? pod.textContent.replace(/\s+/g, ' ') : null };
});
const stav = () => p.evaluate(() => {
  const k = kontrolyStavAkt();
  return { brani: k.kodyBrani.includes('rucniCenaNepotvrzena'), text: kontrolyZabranaDokumentu(k, 'nabidka') || '' };
});
const zmen = (sel, hodnota) => p.evaluate(([sel, hodnota]) => {
  const el = document.querySelector('#page-kalk tr.rc-radek[data-cesta="C.lak.nabidkaKc"] ' + sel);
  el.value = hodnota; el.dispatchEvent(new Event('change'));
}, [sel, hodnota]);
const lak = () => p.evaluate(() => { const v = vypocetAkt(); const x = v.sekce.hrubaOck.find(r => /^LAKOVÁNÍ \(ŠACHTA/.test(r.origNazev));
  return { naklad: x.naklad, cena: x.cena, nab: v.lakovani.nabidka, klic: 'nabidkaKc' in (aktivniVarianta(ZAK).data.cenik.lak || {}) }; });

const l0 = await lak();
console.log('— 1) obchodník: tlačítko a řádek (P12)');
let r = await radek();
zkus('obchodník: u souhrnného řádku LAKOVÁNÍ tlačítko „✎ cena z nabídky"', r && r.otevri && !r.pod, r);
const sloupy = await p.evaluate(() => [...document.querySelectorAll('#page-kalk tr')].filter(t => /SLOUPY NAVÍC \(LAKOVÁNÍ\)/.test(t.textContent))
  .some(t => !!t.querySelector('.rc-otevri')));
zkus('řádek sloupů můstků (lak) tlačítko nemá', !sloupy);
await p.evaluate(() => rcOtevri('C.lak.nabidkaKc'));
await p.waitForTimeout(150);
r = await radek();
zkus('řádek: „Cena z nabídky lakovny (částka řádku)", poznámka (nahradí výpočet, za šachtu, vlastní položky)', r && r.pod
  && /Cena z nabídky lakovny/.test(r.pod) && /nahradí výpočet lakování/.test(r.pod) && /šacht/.test(r.pod) && /Vlastní položky/.test(r.pod), r && r.pod);
zkus('P12: obchodník vidí „Ceník: skryto", žádné číslo výpočtu ani odchylku', r && /Ceník: skryto/.test(r.pod) && !/Výpočet z ceníku/.test(r.pod) && !/odchylka/.test(r.pod), r && r.pod);

console.log('— 2) zadání, zábrana, potvrzení');
await zmen('.rc-hodnota', '45000');
await p.waitForTimeout(150);
r = await radek(); let s = await stav();
zkus('bez zdroje → „chybí zdroj", Potvrdit zakázané, „nejde nabídku vytisknout" (ne schválení)', r && r.bezZdroje && r.potvrditZakazano
  && /nejde nabídku vytisknout/.test(r.pod || '') && !/schvaluje nadřízený/.test(r.pod || ''), r);
zkus('… tisk nabídky zastaven zábranou', s.brani, s);
let x = await lak();
zkus('výpočet: řádek lakování = 45000', x.naklad === 45000 && x.nab === 45000, x);
await zmen('.rc-dodavatel', 'Lakovna Příklad s.r.o.');
await zmen('.rc-cislo', 'NL-2026-666');
await p.waitForTimeout(150);
r = await radek();
zkus('se zdrojem → „nepotvrzeno", Potvrdit povolené', r && r.nep && !r.potvrditZakazano, r);
await p.evaluate(() => document.querySelector('#page-kalk tr.rc-radek .rc-potvrdit').click());
await p.waitForTimeout(150);
r = await radek(); s = await stav();
zkus('„Potvrdit cenu" → „✓ potvrzeno", tisk volný', r && r.potv && !r.pod && !s.brani, { r, s });

console.log('— 3) správce: výpočet z ceníku a odchylka');
await p.evaluate(() => { zobrNahled(''); rcOtevri('C.lak.nabidkaKc'); });
await p.waitForTimeout(150);
r = await radek();
zkus('správce: „Výpočet z ceníku: …" a odchylka', r && r.pod && /Výpočet z ceníku: \d/.test(r.pod) && /odchylka/.test(r.pod), r && r.pod);

console.log('— 5) Detail výpočtu');
const det = await p.evaluate(() => { prepniTab('detail'); render(); return document.body.innerText; });
zkus('Detail výpočtu: „Cena z nabídky lakovny" a „nabídka lakovny"', /Cena z nabídky lakovny/.test(det) && /nabídka lakovny/.test(det));
await p.evaluate(() => { prepniTab('kalk'); render(); });
await p.waitForTimeout(150);

console.log('— 4) ↺ vrátit');
await p.evaluate(() => rcVrat('C.lak.nabidkaKc'));
await p.waitForTimeout(150);
x = await lak(); r = await radek();
zkus('↺ vrátit: klíč pryč, lakování zase z ceníku, tlačítko zpět', !x.klic && x.naklad === l0.naklad && x.nab === undefined && r && r.otevri && !r.potv, { x, l0 });

zkus('konzole bez chyb', !konzole.length, konzole);
await b.close();
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
