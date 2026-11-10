/* Ověření v prohlížeči: VS-E5 (#595) — krycí list, SoD, Pipedrive a kontroly
 * u zakázky s víc šachtami (VS #570), vypínač „Víc šachet v nabídce" ZAP.
 * ============================================================================
 *
 * Hlídá se na sestavené aplikaci (dist/kalkulacka.html):
 *   1) Krycí list zakázky OCK: tabulka „Šachty v nabídce" (#kryciSachty) za
 *      Základními údaji — Výtah A vč. můstků, Výtah B 2 ks, řádek celkem
 *      „2 varianty šachet, šachet celkem 3 ks"; ceny sedí na základ;
 *      pole Můstky po šachtách; hodnota zakázky = cena nabídky;
 *   2) tiskový náhled BO i Techdata nese tabulku šachet;
 *   3) smlouva o dílo: {{SACHTY_SOD_PREDMET}}, Pipedrive podklad se šachtami;
 *   4) kontroly: vada šachty B (šířka 0) zastaví krycí list s názvem šachty;
 *   5) jedna šachta: žádná tabulka (krycí list jako dnes);
 *   6) rozložení 1200 / 1440 / 1920: tabulka šachet bez překryvů, nepřetéká
 *      kartu, stránka bez vodorovného posuvníku; bez chyb v konzoli.
 *
 * Pojistka: nad 079cfc6 tabulka #kryciSachty ani symboly SoD neexistují —
 * body 1–4 a 6 selžou.
 * Spuštění: KNG_NEZVYSOVAT_VERZI=1 python3 build.py && node overit_vs_kryci_sod.mjs
 */
import { chromium } from 'playwright';
import { createRequire } from 'module';

const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
const require = createRequire(import.meta.url);
const ZC = require('./src/zkusebni_cenik.js');
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + JSON.stringify(detail).slice(0, 400))); }
};
const SKLADBA = { mustekRamBmKc: 10000, mustekPodlahaPlechM2Kc: 1000, mustekPodlahaPororostM2Kc: 1100, mustekPodlahaVanaM2Kc: 1200,
  mustekZabradliKovBmKc: 2000, mustekZabradliSkloBmKc: 5000, mustekKotveniDeskaKc: 3000, mustekKotveniSloupKc: 3100,
  mustekKotveniKonzolaKc: 3200, mustekZabradliSkloMontazHodBm: 1 };
const CEN = Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky(), SKLADBA);
const CENP = ZC.zkusebniCenikProj();

const b = await chromium.launch({ args: ['--no-sandbox'] });
const chyby = [];
async function stranka(sirka) {
  const p = await b.newPage({ viewport: { width: sirka, height: 1000 } });
  p.on('pageerror', e => chyby.push(sirka + ' pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') chyby.push(sirka + ' error: ' + m.text()); });
  p.on('dialog', d => d.dismiss().catch(() => {}));
  await p.goto(KDE);
  await p.waitForFunction(() => typeof NAST !== 'undefined' && typeof render === 'function', null, { timeout: 15000 });
  await p.waitForTimeout(400);
  return p;
}
/* Zakázka Výtah A (exteriér, můstky) + Výtah B (interiér, 2 ks); vypínač ZAP. */
const zaloz = (p, vs, uprava) => p.evaluate(([c, cp, vs, uprava]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  NAST.jeAdmin = true;
  ONLINE_STAV.funkce = { viceSachet: true, kdo: '', kdy: '' };
  ZAK = novaZakazka(); syncVarianta();
  Object.keys(C).forEach(k => delete C[k]); Object.assign(C, JSON.parse(JSON.stringify(c))); delete C.prazdny; delete C.ukazkove;
  ZAK.cislo = '2026 - OPR - CN - 9595'; ZAK.nazevAkce = 'VS E5 harness'; ZAK.objednatel = 'Zkušební zákazník s.r.o.';
  Object.assign(Z, { typSachty: 'exteriérová', prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4,
    mustky: [{ ks: 2, sirkaMm: 1600, delkaMm: 1200, podlaha: 'plech', zabradli: 'kov', zabradliStrany: 2, sloupyKs: 0, sloupVyskaM: 0 }] });
  OCK.fixes = true;
  if (vs) {
    OCK.nazev = 'Výtah A';
    const zb = Object.assign(JSON.parse(JSON.stringify(Z)), { typSachty: 'interiérová', zdvih: 17.325, sirka: 2.4, mustky: [],
      profily: JSON.parse(JSON.stringify(PROFILY_VYCHOZI['interiérová'])) });
    if (uprava === 'vadaB') zb.sirka = 0;
    OCK.dalsi = [{ id: 's_b', nazev: 'Výtah B', ks: 2, zadani: zb }];
  }
  prepniTab('kryci'); render();
}, [CEN, CENP, vs, uprava || '']);

const p = await stranka(1440);

/* 1) krycí list */
await zaloz(p, true);
const kl = await p.evaluate(() => {
  const el = document.getElementById('kryciSachty');
  const radky = el ? [...el.querySelectorAll('tr')].map(r => [...r.children].map(c => c.textContent.trim())) : null;
  const h3 = el ? el.previousElementSibling && el.previousElementSibling.previousElementSibling : null;
  const v = aktivniVarianta(ZAK);
  const r = vypocetZ(v, JEKLY);
  const c = kryciCtx(ZAK, v, JEKLY);
  return { radky, nadpis: h3 ? h3.textContent : '', zaklad: r.souhrn.zakladCena, hodnota: c.hodnota,
    cena: kryciKc(cenaNabidkyOck(r, v.data.sleva || {}, v.data.zaokr).cena), mustky: c.mustky,
    zaZakladnimi: (() => { const hs = [...document.querySelectorAll('#page-kryci h3')].map(x => x.textContent.trim());
      const i = hs.findIndex(x => /^Šachty v nabídce/.test(x)); return i > 0 ? hs.slice(0, i) : null; })() };
});
const kcN = t => +String(t).replace(/[^\d,-]/g, '').replace(',', '.');
zkus('1 tabulka Šachty v nabídce na krycím listu', kl.radky && kl.radky.length === 4 && /Šachty v nabídce/.test(kl.nadpis), kl);
zkus('1 tabulka je v Základních údajích (před Dodavatelem)', kl.zaZakladnimi && kl.zaZakladnimi[kl.zaZakladnimi.length - 1].indexOf('Základní údaje') >= 0
  || (kl.zaZakladnimi && kl.zaZakladnimi.some(x => /Základní údaje/.test(x)) && !kl.zaZakladnimi.some(x => /Dodavatel/.test(x))), kl.zaZakladnimi);
zkus('1 řádky: Výtah A vč. můstků, Výtah B 2 ks, celkem 3 ks', kl.radky && kl.radky[1][0] === 'Výtah A, vč. můstků' && kl.radky[2][0] === 'Výtah B'
  && kl.radky[2][1] === '2 ks' && /2 varianty šachet/.test(kl.radky[3][0]) && kl.radky[3][1] === '3 ks', kl.radky);
zkus('1 ceny šachet dávají základ na korunu', kl.radky && kcN(kl.radky[1][2]) + kcN(kl.radky[2][2]) === kl.zaklad && kcN(kl.radky[3][2]) === kl.zaklad, [kl.radky, kl.zaklad]);
zkus('1 hodnota zakázky = cena nabídky (součet)', kl.hodnota === kl.cena, [kl.hodnota, kl.cena]);
zkus('1 můstky po šachtách (Výtah A)', /^Výtah A: 2 ks/.test(kl.mustky) && !/Výtah B/.test(kl.mustky), kl.mustky);

/* 2) tiskový náhled */
for (const verze of ['bo', 'techdata']) {
  const [okno] = await Promise.all([p.waitForEvent('popup'), p.evaluate(v => kryciTiskPohled(v), verze)]);
  await okno.waitForLoadState();
  const t = await okno.evaluate(() => {
    const h2 = [...document.querySelectorAll('h2')].find(x => /Šachty v nabídce/i.test(x.textContent));
    return h2 && h2.nextElementSibling ? [...h2.nextElementSibling.querySelectorAll('tr')].map(r => [...r.children].map(c => c.textContent.trim())) : null;
  });
  await okno.close();
  zkus('2 tisk ' + verze + ': tabulka šachet (záhlaví + 3 řádky)', t && t.length === 4 && t[0][0] === 'Varianta šachty' && t[2][0] === 'Výtah B', t);
}

/* 3) SoD a Pipedrive */
const sp = await p.evaluate(() => {
  const v = aktivniVarianta(ZAK);
  const sod = sodData(ZAK, v, JEKLY, 'cz').placeholders;
  const pd = pdnPodklad(ZAK, JEKLY);
  return { predmet: sod.SACHTY_SOD_PREDMET, rozpis: sod.SACHTY_SOD_ROZPIS, pd: pd.strany.ock && pd.strany.ock.sachty };
});
zkus('3 SoD: předmět díla vyjmenuje varianty', sp.predmet === '2 varianty šachet, celkem 3 ks (Výtah A 1 ks, Výtah B 2 ks)', sp);
zkus('3 SoD: rozpis dvou variant', String(sp.rozpis).split('\n').length === 2, sp.rozpis);
zkus('3 Pipedrive náhled: seznam šachet do poznámky', /Výtah A 1 ks, Výtah B 2 ks/.test(sp.pd || ''), sp.pd);

/* 4) kontroly: vada šachty B zastaví krycí list */
await zaloz(p, true, 'vadaB');
const kz = await p.evaluate(() => {
  const k = kontrolyStavAkt();
  const n = k.nalezy.find(x => x.kod === 'rozmery');
  return { text: n ? n.text : '', zabrana: dokumentZabrana('kryci_bo', aktivniVarianta(ZAK)) || '' };
});
zkus('4 vada šachty B: nález s názvem šachty, krycí list zastaven', /^Výtah B: /.test(kz.text) && /Výtah B/.test(kz.zabrana), kz);

/* 5) jedna šachta */
await zaloz(p, false);
const j1 = await p.evaluate(() => ({ tab: !!document.getElementById('kryciSachty'),
  sod: Object.keys(sodData(ZAK, aktivniVarianta(ZAK), JEKLY, 'cz').placeholders).filter(k => /^SACHTY_/.test(k)) }));
zkus('5 jedna šachta: krycí list bez tabulky šachet, SoD bez symbolů SACHTY_*', !j1.tab && !j1.sod.length, j1);
await p.close();

/* 6) rozložení */
for (const sirka of [1200, 1440, 1920]) {
  const pg = await stranka(sirka);
  await zaloz(pg, true);
  const r = await pg.evaluate(() => {
    const el = document.getElementById('kryciSachty');
    if (!el) return { chyba: 'tabulka chybí' };
    const R = e => e.getBoundingClientRect();
    const tbl = el.querySelector('table'), doc = document.querySelector('#page-kryci .kl-doc');
    const bunky = [...el.querySelectorAll('td')];
    const prekryvy = [];
    for (let i = 0; i < bunky.length; i++) for (let j = i + 1; j < bunky.length; j++) {
      const a = R(bunky[i]), c = R(bunky[j]);
      const x = Math.min(a.right, c.right) - Math.max(a.left, c.left), y = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
      if (x > 1 && y > 1) prekryvy.push(i + '×' + j);
    }
    /* sousedé: nadpis nad tabulkou a další nadpis pod ní se s tabulkou nepřekrývají */
    const h = [...document.querySelectorAll('#page-kryci h3')];
    const iS = h.findIndex(x => /^Šachty v nabídce/.test(x.textContent.trim()));
    const dalsi = h[iS + 1];
    const useknute = bunky.filter(td => td.scrollWidth > td.clientWidth + 1).map(td => td.textContent);
    return { prekryvy, useknute,
      vKarte: R(tbl).right <= R(doc).right + 1 && R(tbl).left >= R(doc).left - 1,
      nadpisNad: R(h[iS]).bottom <= R(tbl).top + 1, dalsiPod: !dalsi || R(dalsi).top >= R(tbl).bottom - 1,
      bezPosunu: document.documentElement.scrollWidth <= window.innerWidth + 1 };
  });
  zkus('6 ' + sirka + ': buňky tabulky šachet se nepřekrývají a nejsou useknuté', r.prekryvy && !r.prekryvy.length && !r.useknute.length, r);
  zkus('6 ' + sirka + ': tabulka v kartě krycího listu, nadpis nad ní, další sekce pod ní', r.vKarte && r.nadpisNad && r.dalsiPod, r);
  zkus('6 ' + sirka + ': stránka bez vodorovného posuvníku', r.bezPosunu, r);
  await pg.close();
}

zkus('bez chyb v konzoli', !chyby.length, chyby);
await b.close();
console.log(`\noverit_vs_kryci_sod: ${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
