/* Ověření v prohlížeči: samostatná sekce MŮSTKY (#560, rozhodnutí J. V.
 * 4. 11. 2026).
 * ============================================================================
 *
 * Hlídá se na sestavené aplikaci (dist/kalkulacka.html):
 *   1) karta „Můstky mezi budovou a OCK" v Zadání šachty (Model 2): sloupce
 *      provedení, změna podlahy se zapíše do Z.mustky, „+ další provedení"
 *      přidá skupinu a počet v zadání šachty je pak jen součet;
 *   2) Kalkulace OCK se skladebným ceníkem má sekci MŮSTKY MEZI BUDOVOU A OCK;
 *   3) Model 1: karta jen s počtem a délkou a s upozorněním, žádná sekce;
 *   4) stará zakázka (mustkyKs + mustekHloubkaMm): karta ukáže jednu skupinu,
 *      data se nepřepíšou, dokud se v kartě nic nezmění; po změně skupiny;
 *   5) tiskový náhled CN: sekce MŮSTKY a řádek „Můstky mezi budovou a OCK
 *      (bez DPH)"; Word se šablonou v15 (klon) i v16 (symboly);
 *   6) zamčená varianta: změna v kartě se nezapíše; žádná chyba v konzoli.
 *
 * Pojistka: nad 000924e karta ani sekce neexistují — body 1, 2, 5 selžou.
 * Spuštění: node overit_560_mustky.mjs (po python3 build.py)
 */
import { chromium } from 'playwright';
import { createRequire } from 'module';

const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
const require = createRequire(import.meta.url);
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + JSON.stringify(detail).slice(0, 400))); }
};

/* šablona v16 ze syntetické v15 nástrojem (Node), do prohlížeče jako base64 */
const DG = require('./src/docxgen.js');
const vyrob = require('./nastroje/vyrob_sablony.js');
const synt = async () => DG.zipPrecti(new Uint8Array(await DG.docxDokumentBlob('Nabídka', [
  { sekce: 'DOPLŇKOVÉ KONSTRUKCE', radky: [['MŮSTKY MEZI BUDOVOU A OCK', '{{TS_MUSTKY}}'], ['OPLECHOVÁNÍ SOKLU PROHLUBNĚ', '{{TS_SOKL}}']] },
  { sekce: 'STAVEBNÍ A PŘÍPRAVNÉ PRÁCE', radky: [['ZÁBRANY DO DVEŘNÍCH VSTUPŮ', '{{TS_ZABRANY_VSTUPY}}']] },
  { sekce: 'CENA', radky: [['Cena před slevou', '{{CENA_PRED_SLEVOU}}'], ['Sleva', '− {{SLEVA_KC}} ({{SLEVA_PROC}} %)'],
    ['VÝTAHOVÁ ŠACHTA', '{{CENA_BEZ_DPH}} bez DPH'], ['CELKEM za nabídku', '{{CENA_S_DPH}} včetně DPH']] }]).arrayBuffer()));
const p15 = await synt();
const b64 = async pol => Buffer.from(await DG.zipZapis(pol).arrayBuffer()).toString('base64');
const v15 = await b64(p15);
const v16 = await b64(p15.map(x => x.nazev === 'word/document.xml'
  ? Object.assign({}, x, { data: new TextEncoder().encode(vyrob.cnV16(new TextDecoder().decode(x.data))) }) : x));

const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 } });
const p = await ctx.newPage();
const chyby = [];
p.on('pageerror', e => chyby.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') chyby.push('error: ' + m.text()); });
p.on('dialog', d => d.dismiss().catch(() => {}));
await p.goto(KDE);
await p.waitForFunction(() => typeof NAST !== 'undefined' && typeof render === 'function', null, { timeout: 15000 });
await p.waitForTimeout(400);

const ZC = require('./src/zkusebni_cenik.js');
const SKLADBA = { mustekRamBmKc: 10000, mustekPodlahaPlechM2Kc: 1000, mustekPodlahaPororostM2Kc: 1100, mustekPodlahaVanaM2Kc: 1200,
  mustekZabradliKovBmKc: 2000, mustekZabradliSkloBmKc: 5000, mustekKotveniDeskaKc: 3000, mustekKotveniSloupKc: 3100,
  mustekKotveniKonzolaKc: 3200, mustekZabradliSkloMontazHodBm: 1 };
const cen = Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky(), SKLADBA);
const cenStary = Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky());

const vysl = await p.evaluate(([c, cs, cp]) => {
  const pripravCenik = (cc) => { Object.keys(C).forEach(k => delete C[k]); Object.assign(C, JSON.parse(JSON.stringify(cc))); delete C.prazdny; delete C.ukazkove; };
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  const zad = { typSachty: 'exteriérová', profily: JSON.parse(JSON.stringify(PROFILY_VYCHOZI['exteriérová'])),
    zaskleni: 'na terče', sirka: 1.6, hloubka: 2, zdvih: 12, prejezd: 3.3, prohluben: 1.2, nastupiste: 5, rohoveSloupky: 4,
    typPortalu: 'zapuštěný', roztec: 1.25, sirkaRamuMm: 100, cistyVstupMm: 800 };
  const out = {};
  const karta = () => document.getElementById('ock-mustky');
  const sekceKalk = () => [...document.querySelectorAll('#page-kalk td, #page-kalk th')].some(x => /MŮSTKY MEZI BUDOVOU A OCK/.test(x.textContent));

  /* 1) nová zakázka, Model 2, skladebný ceník */
  ZAK = novaZakazka(); syncVarianta(); Object.assign(Z, zad); OCK.fixes = true; pripravCenik(c);
  ZAK.cislo = '2026 - OPR - CN - 9560'; ZAK.nazevAkce = 'TEST MU 560';
  prepniTab('kalk'); render();
  out.bezMustku = { karta: !!karta() };
  mustkySet(2);
  out.poPoctu = { karta: !!karta(), mustky: JSON.parse(JSON.stringify(Z.mustky || null)), hlava: karta() ? karta().querySelector('thead').textContent : '' };
  const idx = (Z.mustky || []).length ? 0 : -1;
  mustekPoleSet(idx, 'podlaha', 'vana');
  mustekPoleSet(idx, 'zabradli', 'sklo');
  mustekPoleSet(idx, 'sloupyKs', '2');
  out.poZmene = JSON.parse(JSON.stringify(Z.mustky));
  out.selectVana = karta() ? [...karta().querySelectorAll('select')].some(s => s.value === 'vana') : false;
  out.sekce = sekceKalk();
  const r = vypocetAkt();
  out.radky = (r.sekce.mustky || []).map(x => x.origNazev);
  mustekSkupinaPridej();
  out.skupin = Z.mustky.length;
  const poleKs = [...document.querySelectorAll('#inputs .row')].find(x => /Můstky mezi budovou a OCK/.test(x.textContent));
  out.ksDisabled = !!(poleKs && poleKs.querySelector('input').disabled);
  out.ksHodnota = poleKs ? poleKs.querySelector('input').value : '';
  mustekSkupinaOdeber(1);
  out.poOdebrani = Z.mustky.length;

  /* 3) Model 1 */
  OCK.fixes = false; render();
  out.m1 = { hlava: karta() ? karta().querySelector('thead').textContent : '', hint: karta() ? karta().textContent : '',
    sekce: sekceKalk(), skladebny: vypocetAkt().mustky.skladebny };
  OCK.fixes = true; render();

  /* 4) stará zakázka */
  ZAK = novaZakazka(); syncVarianta(); Object.assign(Z, zad, { mustkyKs: 2, mustekHloubkaMm: 1200 }); OCK.fixes = true; pripravCenik(cs);
  render();
  const vstupy = karta() ? [...karta().querySelectorAll('input[type=number]')].map(i => i.value) : [];
  out.stara = { karta: !!karta(), vstupy, maPole: Array.isArray(Z.mustky), ks: Z.mustkyKs, hint: karta() ? karta().textContent : '' };
  mustekPoleSet(0, 'ks', '3');
  out.staraPoZmene = { mustky: JSON.parse(JSON.stringify(Z.mustky)), maKs: 'mustkyKs' in Z, maDelku: 'mustekHloubkaMm' in Z };
  return out;
}, [cen, cenStary, ZC.zkusebniCenikProj()]);

zkus('1 bez můstků karta Můstky není', vysl.bezMustku.karta === false);
zkus('1 po zadání počtu se ukáže karta Můstky se sloupci provedení', vysl.poPoctu.karta && /podlaha/.test(vysl.poPoctu.hlava)
  && /zábradlí/.test(vysl.poPoctu.hlava) && /kotvení/.test(vysl.poPoctu.hlava) && /sloupy navíc/.test(vysl.poPoctu.hlava), vysl.poPoctu);
zkus('1 počet v zadání šachty založí jednu skupinu', Array.isArray(vysl.poPoctu.mustky) && vysl.poPoctu.mustky.length === 1 && vysl.poPoctu.mustky[0].ks === 2, vysl.poPoctu.mustky);
zkus('1 změna podlahy, zábradlí a sloupů se zapíše do Z.mustky', vysl.poZmene[0].podlaha === 'vana' && vysl.poZmene[0].zabradli === 'sklo'
  && vysl.poZmene[0].sloupyKs === 2 && vysl.selectVana, vysl.poZmene);
zkus('1 „+ další provedení" přidá skupinu, počet je pak součet a nejde měnit', vysl.skupin === 2 && vysl.ksDisabled && vysl.ksHodnota === '3', [vysl.skupin, vysl.ksDisabled, vysl.ksHodnota]);
zkus('1 ✕ skupinu odebere', vysl.poOdebrani === 1);
zkus('2 Kalkulace OCK má sekci MŮSTKY s vanou, sklem a sloupy', vysl.sekce && vysl.radky.some(x => /VANA/.test(x))
  && vysl.radky.some(x => /SKLENĚNÉ/.test(x)) && vysl.radky.some(x => /SLOUPY NAVÍC/.test(x)), vysl.radky);
zkus('3 Model 1: karta jen s počtem a délkou, upozornění, bez sekce', !/podlaha/.test(vysl.m1.hlava) && /délka/.test(vysl.m1.hlava)
  && /Model 1/.test(vysl.m1.hint) && !vysl.m1.sekce && !vysl.m1.skladebny, vysl.m1);
zkus('4 stará zakázka: karta ukáže jednu skupinu (2 ks, 1200 mm) a data zůstanou ve starém tvaru',
  vysl.stara.karta && vysl.stara.vstupy[0] === '2' && vysl.stara.vstupy.includes('1200') && !vysl.stara.maPole && vysl.stara.ks === 2, vysl.stara);
zkus('4 stará zakázka se starým ceníkem: karta řekne, že se počítá jako pochozí plech s kovovým zábradlím', /pochozí plech/.test(vysl.stara.hint));
zkus('4 po změně v kartě skupiny a staré pole pryč', vysl.staraPoZmene.mustky[0].ks === 3 && vysl.staraPoZmene.mustky[0].delkaMm === 1200
  && !vysl.staraPoZmene.maKs && !vysl.staraPoZmene.maDelku, vysl.staraPoZmene);

/* 5) tiskový náhled CN a Word */
await p.evaluate(([c]) => {
  ZAK = novaZakazka(); syncVarianta();
  Object.assign(Z, { typSachty: 'exteriérová', profily: JSON.parse(JSON.stringify(PROFILY_VYCHOZI['exteriérová'])), zaskleni: 'na terče',
    sirka: 1.6, hloubka: 2, zdvih: 12, prejezd: 3.3, prohluben: 1.2, nastupiste: 5, rohoveSloupky: 4, typPortalu: 'zapuštěný', roztec: 1.25,
    sirkaRamuMm: 100, cistyVstupMm: 800, mustky: [{ ks: 2, delkaMm: 1200, podlaha: 'vana', zabradli: 'sklo', kotveni: 'deska', sloupyKs: 0 }] });
  OCK.fixes = true; Object.keys(C).forEach(k => delete C[k]); Object.assign(C, JSON.parse(JSON.stringify(c))); delete C.prazdny; delete C.ukazkove;
  ZAK.cislo = '2026 - OPR - CN - 9560'; ZAK.nazevAkce = 'TEST MU 560 nabídka'; ZAK.objednatel = 'TEST s.r.o.';
  render();
}, [cen]);
const [okno] = await Promise.all([ctx.waitForEvent('page', { timeout: 15000 }).catch(() => null), p.evaluate(() => nabidkaNahled())]);
let nahled = '';
if (okno) { await okno.waitForLoadState().catch(() => {}); nahled = await okno.evaluate(() => document.body.innerText).catch(() => ''); await okno.close(); }
zkus('5 náhled CN: sekce MŮSTKY s podlahou (beton zajistí stavba)', /MŮSTKY MEZI BUDOVOU A OCK/.test(nahled) && /betonáž zajistí stavba/.test(nahled), nahled.slice(0, 300));
zkus('5 náhled CN: samostatný řádek ceny můstků a cena celkem', /Můstky mezi budovou a OCK \(bez DPH\)/.test(nahled) && /Cena celkem \(bez DPH\)/.test(nahled));
const word = await p.evaluate(async ([s15, s16]) => {
  const buf = s => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
  const text = async (sab) => {
    const g = await dokumentVygeneruj('nabidka', buf(sab), ZAK, aktivniVarianta(ZAK), JEKLY, 'cz');
    const pol = await zipPrecti(new Uint8Array(await g.blob.arrayBuffer()));
    const x = new TextDecoder().decode(pol.find(q => q.nazev === 'word/document.xml').data);
    return x.replace(/<\/w:tc>/g, ' | ').replace(/<\/w:tr>/g, '\n').replace(/<[^>]+>/g, '');
  };
  try { return { v15: await text(s15), v16: await text(s16) }; } catch (e) { return { chyba: e.message }; }
}, [v15, v16]);
zkus('5 Word v15 (klon): sekce MŮSTKY a řádky ceny', word.v15 && /MŮSTKY MEZI BUDOVOU A OCK[ |]*\n\s*POČET A ROZMĚR/.test(word.v15)
  && /MŮSTKY MEZI BUDOVOU A OCK \|[^\n]*bez DPH/.test(word.v15) && /CENA CELKEM \|/.test(word.v15) && !/\{\{/.test(word.v15), word.chyba || (word.v15 || '').slice(-600));
zkus('5 Word v16: sekce MŮSTKY a řádky ceny ze symbolů', word.v16 && /POČET A ROZMĚR \| 2 ks/.test(word.v16)
  && /CENA CELKEM[^|\n]* \|/.test(word.v16) && (word.v16.match(/VÝTAHOVÁ ŠACHTA/g) || []).length === 1 && !/\{\{/.test(word.v16), word.chyba || (word.v16 || '').slice(-600));

/* 6) zamčená varianta */
const zam = await p.evaluate(() => {
  const v = aktivniVarianta(ZAK);
  zamkniVariantu(v, { cislo: variantaCislo(ZAK, v), typ: 'nabidka', kdo: 'harness', vysledek: zamekVysledekSpocti(v, JEKLY, 'harness') });
  syncVarianta(); render();
  const pred = JSON.stringify(Z.mustky);
  mustekPoleSet(0, 'podlaha', 'pororost');
  return { stejne: JSON.stringify(Z.mustky) === pred };
});
zkus('6 zamčená varianta: změna v kartě Můstky se nezapíše', zam.stejne);
zkus('6 žádná chyba v konzoli', chyby.length === 0, chyby);

await b.close();
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
