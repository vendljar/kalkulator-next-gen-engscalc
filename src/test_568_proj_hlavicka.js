/* #568 — HLAVIČKA CENY V KALKULACI PROJ JAKO U OCK (J. V. 5. 11. 2026, dávka PH).
 *
 * Do v4.11.8 ukazovala tmavá dlaždice „Základní cena bez DPH" v Kalkulaci PROJ
 * nezaokrouhlený součet (r.souhrn.cena, např. 360 490 Kč) a světlá dlaždice pod
 * ní zvláštní řádek „Cena nabídky bez DPH" se zaokrouhlenou cenou (360 600 Kč).
 * V OCK nese tmavá dlaždice rovnou cenu nabídky a světlá jen DPH a Celkem.
 * Teď je PROJ stejná:
 *   1. tmavá dlaždice = projCena (cenaNabidkyProj: po slevě a obchodním
 *      zaokrouhlení), EUR pod ní z téhož čísla;
 *   2. řádek „Cena nabídky bez DPH" ze světlé dlaždice zmizel;
 *   3. DPH a Celkem s DPH dál z projCena (beze změny);
 *   4. projCena = cena nabídky PROJ (náhled i Word: souhrn.bezDph,
 *      {{PROJ_CELKEM_BEZ_DPH}}) = „Hodnota zakázky bez DPH" krycího listu PROJ
 *      — i se slevou a se zaokrouhlením na stovky.
 * Pojistka: nad 000924e sada padá (body 1 a 2). Smyšlené údaje, zkušební ceník.
 *
 * Spuštění: cd src && node test_568_proj_hlavicka.js */
const fs = require('fs');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./preklad.js');
nacti('./docxgen.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const EP = nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
const SL = nacti('./sleva.js');
const ZO = nacti('./zaokrouhleni.js');
nacti('./firma.js');
nacti('./plan_plateb.js');
nacti('./podminky.js');
const NP = nacti('./nabidka_proj.js');
const zk = nacti('./zakazka.js');
nacti('./zamek.js');
nacti('./kryci.js');
const KP = nacti('./kryci_proj.js');
global.NAST = { firma: global.firmaDefault() };

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); } };

/* ---------- 1–3) zdroj hlavičky (ui/kalk_proj.js) ---------- */
const kod = fs.readFileSync(__dirname + '/ui/kalk_proj.js', 'utf8');
const hlava = kod.slice(kod.indexOf('const hlava = `<div class="kalk-title">'), kod.indexOf('</div>\n  ${col.admin ?', kod.indexOf('const hlava = `<div class="kalk-title">')));
test('1: tmavá dlaždice nese cenu nabídky projCena (ne r.souhrn.cena)',
  /<div class="kpi main"><div class="l">Základní cena bez DPH<\/div><div class="v">\$\{fmt0\(projCena\)\}<\/div>/.test(hlava), hlava.slice(0, 300));
test('1: EUR pod dlaždicí z téhož čísla (kpiEurHtml(projCena, …))', /kpiEurHtml\(projCena, aktivniVarianta\(ZAK\), PC\.kurzEurKc\)/.test(hlava));
test('1: nezaokrouhlený součet r.souhrn.cena se v hlavičce neukazuje', !/r\.souhrn\.cena\b/.test(hlava));
test('2: řádek „Cena nabídky bez DPH" ve světlé dlaždici není', !/Cena nabídky bez DPH/.test(hlava) && !/cenaLine/.test(kod));
test('2: světlá dlaždice = DPH + Celkem s DPH (jako OCK)',
  /<div class="kpi kpi-multi">\s*<div class="kpi-line"><span class="kl">DPH \$\{Math\.round\(PC\.dph \* 100\)\} %<\/span><span class="kv">\$\{fmt0\(dphKc\)\}<\/span><\/div>\s*<div class="kpi-line"><span class="kl">Celkem s DPH<\/span><span class="kv">\$\{fmt0\(celkemSDph\)\}<\/span><\/div>\s*<\/div>/.test(hlava));
test('3: DPH a Celkem dál z projCena', /const _dph = cenaSDph\(projCena, PC\.dph\)/.test(kod));
test('3: projCena = cenaNabidkyProj(r, SLP, ZOP).cena', /const cnp = \(typeof cenaNabidkyProj === 'function'\) \? cenaNabidkyProj\(r, SLP, ZOP\) : null;\s*const projCena = cnp \? cnp\.cena : r\.souhrn\.celkem;/.test(kod));

/* ---------- 4) totéž číslo v nabídce PROJ a v krycím listu ---------- */
const zakazka = (slevaPct, zaokr) => {
  const z = zk.novaZakazka();
  z.cislo = '2026 - OPR - OVP - 5680'; z.nazevAkce = 'TEST #568';
  const v = z.varianty[0];
  v.data.proj.cenik = ZC.zkusebniCenikProj();
  v.data.proj.zadani.sekce.forEach(s => s.polozky.forEach(p => { p.vyrazeno = false; }));
  /* nekulaté hodiny, ať je co zaokrouhlovat */
  v.data.proj.zadani.sekce.forEach((s, i) => s.polozky.forEach(p => { if (p.typ === 'hod') p.hodiny = 3.37 + i; }));
  v.data.slevaProj = Object.assign({}, v.data.slevaProj || {}, { procenta: slevaPct, stav: slevaPct ? 'schváleno' : '' });
  if (zaokr) v.data.zaokrProj = zaokr;
  return { z, v };
};
[[0, null], [7, null], [0, { krok: 1000, smer: 'nahoru' }], [5, { krok: 1000, smer: 'nejbliz' }]].forEach(([pct, zaokr]) => {
  const { z, v } = zakazka(pct, zaokr);
  const d = v.data;
  const r = EP.vypocetProj(d.proj.zadani, d.proj.cenik);
  const zaokrP = (typeof zaokrProjZ === 'function') ? zaokrProjZ(d) : d.zaokr;
  const cn = ZO.cenaNabidkyProj(r, d.slevaProj, zaokrP);
  const nab = NP.nabidkaProjData(z, v, 'cz');
  const kl = KP.kryciProjCtx(z, v);
  const popis = 'sleva ' + pct + ' %, zaokrouhlení ' + (zaokr ? JSON.stringify(zaokr) : 'výchozí');
  test('4: hlavička (projCena) = nabídka PROJ souhrn.bezDph — ' + popis,
    Math.abs(cn.cena - nab.souhrn.bezDph) < 0.005, [cn.cena, nab.souhrn.bezDph]);
  test('4: … = {{PROJ_CELKEM_BEZ_DPH}} (Word) — ' + popis,
    nab.placeholders.PROJ_CELKEM_BEZ_DPH === formatKc2(cn.cena) || nab.placeholders.PROJ_CELKEM_BEZ_DPH === formatKc0(cn.cena),
    [nab.placeholders.PROJ_CELKEM_BEZ_DPH, cn.cena]);
  const hodnota = kl && kl.hodnota;   // prefill pole „Hodnota zakázky bez DPH" (c => c.hodnota)
  test('4: … = krycí list PROJ „Hodnota zakázky bez DPH" — ' + popis,
    String(hodnota || '').replace(/[^\d]/g, '') === formatKc2(cn.cena).replace(/[^\d]/g, '')
    || String(hodnota || '').replace(/[^\d]/g, '') === formatKc0(cn.cena).replace(/[^\d]/g, ''), [hodnota, cn.cena]);
  if (pct) test('4: sleva se opravdu promítla — ' + popis, cn.slevaPct > 0 && cn.cena < cn.zaklad, cn);
  test('4: DPH hlavičky = DPH nabídky — ' + popis,
    Math.abs(ZO.cenaSDph(cn.cena, d.proj.cenik.dph).dphKc - nab.souhrn.dphKc) < 0.005, [ZO.cenaSDph(cn.cena, d.proj.cenik.dph).dphKc, nab.souhrn.dphKc]);
});

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
