/* overit_zaokrouhleni.mjs — obchodní zaokrouhlení OCK × PROJ v běžící aplikaci
 *
 * VZNIK (23. 9. 2026, nález T4 z revize v22.9.9). `src/test_zaokrouhleni.js`
 * hlídal rozdělení zaokrouhlení na OCK a PROJ čtením zdrojáku: „v kalk_proj.js
 * je řetězec cenaNabidkyProj(r, SLP, ZOP)", „zamek_ui.js zmiňuje
 * 'zaokrProjSetKrok'" a podobně. Takový test projde i tehdy, když řetězec
 * v souboru zůstane, ale přestane se volat — a spadne, když někdo řádek jen
 * přeformátuje. Tady se totéž ověřuje CHOVÁNÍM: zaokrouhlení PROJ hýbe jen
 * cenou projekce, zamčená varianta ho nepustí změnit, kontroly i lišta marže
 * dostávají to správné.
 *
 * Spuštění: NODE_PATH=$(npm root -g) node overit_zaokrouhleni.mjs
 * (pracuje nad dist/kalkulacka.html; ceník je zkušební ze src/zkusebni_cenik.js)
 */
import { chromium } from 'playwright';
import { createRequire } from 'module';
import { fileURLToPath } from 'node:url';

const KOREN = fileURLToPath(new URL('.', import.meta.url));
let ok = 0, fail = 0;
const test = (n, c, info) => {
  if (c) { ok++; console.log('  ✓ ' + n); }
  else { fail++; console.log('  ✗ ' + n + (info !== undefined ? '  → ' + String(info).slice(0, 300) : '')); }
};

const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage();
const chyby = [];
p.on('pageerror', e => chyby.push(e.message));
await p.goto('file://' + KOREN + 'dist/kalkulacka.html');
await p.waitForFunction(() => typeof novaZakazka === 'function');

/* Zkušební ceník — prázdný ceník je zábrana a ceny by vyšly nulové. */
const ZC = createRequire(import.meta.url)('./src/zkusebni_cenik.js');
await p.evaluate(([c, cp]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  NAST.jeAdmin = true;
  ZAK = novaZakazka(); syncVarianta(); render();
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);

console.log('Zaokrouhlení OCK a PROJ se nastavují zvlášť');
const r1 = await p.evaluate(() => {
  const cenaProj = () => cenaNabidkyProj(vypocetProjAkt(), SLP, ZOP).cena;
  const cenaOck = () => cenaNabidkyOck(vypocetAkt(), SL, ZO).cena;
  zaokrSetKrok(0); zaokrProjSetKrok(0);
  const proj0 = cenaProj(), ock0 = cenaOck();
  /* Nejvyšší krok z výčtu (B96, 29. 9. 2026: do té doby 100 000 Kč —
   * hodnota mimo výčet, kterou dnes odmítne UI i server). */
  zaokrProjSetKrok(10000); zaokrProjSetSmer('nahoru');
  const proj1 = cenaProj(), ock1 = cenaOck();
  zaokrProjSetKrok(0);
  zaokrSetKrok(10000); zaokrSetSmer('nahoru');
  const proj2 = cenaProj(), ock2 = cenaOck();
  zaokrSetKrok(0);
  return { proj0, proj1, proj2, ock0, ock1, ock2, zo: JSON.stringify(ZO), zop: JSON.stringify(ZOP),
           oddelene: ZO !== ZOP };
});
test('OCK a PROJ mají každé vlastní objekt nastavení', r1.oddelene, r1.zo + ' / ' + r1.zop);
test('krok PROJ zaokrouhlí cenu projekce', r1.proj1 % 10000 === 0 && r1.proj1 >= r1.proj0, JSON.stringify(r1));
test('a cenou šachty (OCK) nehne', r1.ock1 === r1.ock0, JSON.stringify(r1));
test('krok OCK nehne cenou projekce', r1.proj2 === r1.proj0, JSON.stringify(r1));

console.log('\nObrazovky a kontroly berou to správné nastavení');
const r2 = await p.evaluate(() => {
  zaokrProjSetKrok(1000);
  prepniTab('proj'); render();
  const projHtml = document.getElementById('page-proj').innerHTML;
  prepniTab('kalk'); render();
  const ockHtml = (document.getElementById('kalk-nabidka') || document.body).innerHTML;
  const ctx = kontrolyCtxAkt();
  return {
    kartaOck: /koncové ceny OCK/.test(ockHtml), kartaProj: /koncové ceny PROJ/.test(projHtml),
    projOvladani: /zaokrProjSetKrok\(/.test(projHtml) && !/zaokrSetKrok\(/.test(projHtml),
    kontroly: ctx.zaokrProj === ZOP && ctx.zaokr === ZO,
  };
});
test('karta v Kalkulaci OCK se jmenuje „… koncové ceny OCK"', r2.kartaOck);
test('karta v Kalkulaci PROJ se jmenuje „… koncové ceny PROJ"', r2.kartaProj);
test('Kalkulace PROJ ovládá jen zaokrouhlení PROJ', r2.projOvladani);
test('kontroly před nabídkou dostávají zaokrouhlení PROJ i OCK', r2.kontroly);

console.log('\nZamčená (odeslaná) varianta zaokrouhlení nepustí');
const r3 = await p.evaluate(async () => {
  zaokrSetKrok(1000); zaokrProjSetKrok(1000);
  const v = aktivniVarianta(ZAK);
  zamkniVariantu(v, { typ: 'nabidka', kdo: 'test', cislo: variantaCislo(ZAK, v) });
  syncVarianta();
  const pred = [ZO.krok, ZOP.krok];
  /* Zámek odpoví hláškou (dialog) — tu zavřeme, ať test nečeká. */
  const zavri = () => document.querySelectorAll('#dlg [data-dlg]').forEach(x => x.click());
  try { zaokrProjSetKrok(100); } catch (e) {}
  zavri();
  try { zaokrProjSetSmer('dolu'); } catch (e) {}
  zavri();
  try { zaokrSetKrok(100); } catch (e) {}
  zavri();
  await new Promise(r => setTimeout(r, 50)); zavri();
  return { pred, po: [ZO.krok, ZOP.krok], smer: ZOP.smer };
});
test('krok PROJ zůstal', r3.po[1] === r3.pred[1], JSON.stringify(r3));
test('směr PROJ zůstal', r3.smer === 'nahoru', JSON.stringify(r3));
test('krok OCK zůstal', r3.po[0] === r3.pred[0], JSON.stringify(r3));

console.log('\nB96: krok a směr jen z výčtu (29. 9. 2026)');
const r4 = await p.evaluate(async () => {
  ZAK = novaZakazka(); syncVarianta(); render();
  const texty = []; const puvodni = window.hlaska;
  window.hlaska = (t) => { texty.push(String(t)); return Promise.resolve(); };
  zaokrSetKrok(1000); zaokrProjSetKrok(1000);
  zaokrSetKrok(490001); zaokrProjSetKrok(12345); zaokrSetSmer('dolů'); zaokrProjSetSmer('x');
  const po = { ock: JSON.stringify(ZO), proj: JSON.stringify(ZOP) };
  /* uložená hodnota mimo výčet (zakázka z doby před opravou) */
  ZO.krok = 490001; prepniTab('kalk'); render();
  const karta = document.getElementById('ock-zaokr');
  const sel = karta ? karta.querySelector('select[onchange^="zaokrSetKrok"]') : null;
  const zobrazeno = sel ? sel.options[sel.selectedIndex].text : '';
  ZO.krok = 1000; render();
  window.hlaska = puvodni;
  return { po, texty, zobrazeno };
});
test('B96: krok mimo výčet z konzole (zaokrSetKrok(490001)) se nezapíše', JSON.parse(r4.po.ock).krok === 1000, JSON.stringify(r4));
test('B96: totéž u PROJ a u směru (OCK i PROJ)', JSON.parse(r4.po.proj).krok === 1000
  && JSON.parse(r4.po.ock).smer !== 'dolů' && JSON.parse(r4.po.proj).smer !== 'x', JSON.stringify(r4.po));
test('B96: obchodník dostane hlášku, že jde jen o hodnoty z nabídky', r4.texty.length === 4 && /z nabídky/.test(r4.texty[0]), JSON.stringify(r4.texty));
test('B96: uložený krok mimo výčet ukáže <select> jako „mimo nabídku", ne „bez zaokrouhlení"', /mimo nabídku/.test(r4.zobrazeno), r4.zobrazeno);

test('za celý průchod žádná chyba stránky', chyby.length === 0, chyby.join(' | '));
await b.close();
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
