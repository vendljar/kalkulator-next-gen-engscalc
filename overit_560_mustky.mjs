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
 *   6) zamčená varianta: změna v kartě se nezapíše; žádná chyba v konzoli;
 *   7) rozložení karty (MU2): bez překryvů, záhlaví nad sloupci, nezkrácené
 *      selecty, lišta nad tabulkou, tlačítko pod ní, 1200/1440/1920 i tisk;
 *   8) výška sloupu navíc a česká čárka (MU3): nápověda 20,85 = výška šachty
 *      − 0,2 m, zápis „17,3" i „17.3" z klávesnice, řádek kalkulace s čárkou.
 *
 * Pojistka: nad 000924e karta ani sekce neexistují — body 1, 2, 5 selžou;
 * nad 6b70cc3 (před MU2) selže bod 7 (tlačítko a lišta přes tabulku);
 * nad 7632ca5 (před MU3) selže bod 8 (nápověda „17.3", zdvih místo H − 0,2).
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
  const vstupy = karta() ? [...karta().querySelectorAll('input[data-cislo]')].map(i => i.value) : [];
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

/* 7) ROZLOŽENÍ KARTY (MU2, J. V. 6. 11. 2026: „zadání můstků je nečitelné
 * a ovládací prvky … rozmístěny chaoticky"). Šířky okna 1200 / 1440 / 1920,
 * Model 1 i 2, 1 a 3 skupiny, starý i skladebný ceník a tisk: prvky karty
 * se nepřekrývají, záhlaví stojí nad svým sloupcem, select není užší než
 * text vybrané volby, lišta upozornění je nad tabulkou a tlačítko „+ další
 * provedení" pod ní vlevo, stránka se vodorovně neposouvá. */
const rozlozeni = async (sirka, model, skupin, cenikDruh, tisk) => {
  const pg = await ctx.newPage();
  await pg.setViewportSize({ width: sirka, height: 1000 });
  await pg.goto(KDE);
  await pg.waitForFunction(() => typeof render === 'function' && typeof NAST !== 'undefined');
  await pg.waitForTimeout(200);
  return pg.evaluate(async ([c, m, n, tiskem]) => {
    ZAK = novaZakazka(); syncVarianta();
    Object.assign(Z, { typSachty: 'exteriérová', profily: JSON.parse(JSON.stringify(PROFILY_VYCHOZI['exteriérová'])),
      sirka: 1.6, hloubka: 2, zdvih: 12, prejezd: 3.3, prohluben: 1.2, nastupiste: 5 });
    Object.keys(C).forEach(k => delete C[k]); Object.assign(C, JSON.parse(JSON.stringify(c))); delete C.prazdny; delete C.ukazkove;
    OCK.fixes = m === 2;
    Z.mustky = [{ ks: 3, delkaMm: 1200 }, { ks: 1, delkaMm: 900, podlaha: 'vana', zabradli: 'sklo', kotveni: 'konzola', sloupyKs: 2 },
      { ks: 2, sirkaMm: 1400, podlaha: 'jine', podlahaNazev: 'dřevo', zabradli: 'jine', zabradliNazev: 'nerez lanko', kotveni: 'jine', kotveniText: 'na nosník' }].slice(0, n);
    prepniTab('kalk'); render();
    if (tiskem) document.body.classList.add('tisk-zkouska');
    const karta = document.getElementById('ock-mustky');
    if (!karta) return { chyba: 'karta chybí' };
    const R = el => el.getBoundingClientRect();
    const prvky = [...karta.querySelectorAll('.body input, .body select, .body button, .body .mustky-lista')].filter(e => R(e).width > 0);
    const prekryvy = [];
    for (let i = 0; i < prvky.length; i++) for (let j = i + 1; j < prvky.length; j++) {
      const a = R(prvky[i]), b = R(prvky[j]);
      const x = Math.min(a.right, b.right) - Math.max(a.left, b.left), y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (x > 1 && y > 1) prekryvy.push((prvky[i].className || prvky[i].tagName) + ' × ' + (prvky[j].className || prvky[j].tagName));
    }
    const tbl = karta.querySelector('table'), lista = karta.querySelector('.mustky-lista');
    const pridat = [...karta.querySelectorAll('button')].find(x => /další provedení/.test(x.textContent));
    const th = [...tbl.querySelectorAll('thead th')];
    const prvniRadek = tbl.querySelector('tbody tr');
    const zahlavi = th.map((h, i) => { const td = prvniRadek.children[i]; if (!td) return true;
      const a = R(h), b = R(td); return Math.abs(a.left - b.left) < 2 && Math.abs(a.right - b.right) < 2; }).every(Boolean);
    const cv = document.createElement('canvas').getContext('2d');
    const useknute = [...karta.querySelectorAll('select')].filter(sel => {
      const st = getComputedStyle(sel); cv.font = st.font;
      const text = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : '';
      return cv.measureText(text).width + 30 > sel.clientWidth + 1;
    }).map(sel => sel.options[sel.selectedIndex].text);
    const scroll = karta.querySelector('.mustky-scroll');
    return { prekryvy, zahlavi, useknute,
      listaNad: !!lista && R(lista).bottom <= R(tbl).top + 1,
      tlacitkoPod: !pridat || (R(pridat).top >= R(tbl).bottom - 1 && Math.abs(R(pridat).left - R(tbl).left) < 4 && R(pridat).height < 40 && R(pridat).width < 220),
      bezPosunuStranky: document.documentElement.scrollWidth <= window.innerWidth + 1,
      posunJenVKarte: !scroll || getComputedStyle(scroll).overflowX === 'auto' };
  }, [cenikDruh === 'skl' ? cen : cenStary, model, skupin, tisk]).finally(() => pg.close());
};
for (const [sir, mod, n, cd] of [[1200, 2, 3, 'stary'], [1200, 2, 2, 'stary'], [1200, 1, 3, 'stary'], [1440, 2, 1, 'skl'], [1440, 2, 3, 'skl'],
  [1920, 2, 3, 'stary'], [1920, 1, 1, 'skl'], [1200, 2, 3, 'skl']]) {
  const r = await rozlozeni(sir, mod, n, cd);
  const jm = '7 ' + sir + ' px, Model ' + mod + ', ' + n + ' sk., ' + (cd === 'skl' ? 'skladebný' : 'starý') + ' ceník';
  zkus(jm + ': prvky karty se nepřekrývají', r.prekryvy && !r.prekryvy.length, r.chyba || r.prekryvy);
  zkus(jm + ': záhlaví nad sloupci, selecty nezkrácené', r.zahlavi && r.useknute && !r.useknute.length, { zahlavi: r.zahlavi, useknute: r.useknute });
  zkus(jm + ': lišta nad tabulkou, tlačítko malé pod ní vlevo, stránka bez vodorovného posunu',
    r.listaNad && r.tlacitkoPod && r.bezPosunuStranky && r.posunJenVKarte, r);
}
{ /* tisk / náhled: tiskové styly */
  const pg = await ctx.newPage(); await pg.setViewportSize({ width: 1200, height: 1000 }); await pg.emulateMedia({ media: 'print' });
  await pg.goto(KDE); await pg.waitForFunction(() => typeof render === 'function' && typeof NAST !== 'undefined');
  const t = await pg.evaluate(([c]) => {
    ZAK = novaZakazka(); syncVarianta();
    Object.assign(Z, { typSachty: 'exteriérová', profily: JSON.parse(JSON.stringify(PROFILY_VYCHOZI['exteriérová'])), sirka: 1.6, hloubka: 2, zdvih: 12, prejezd: 3.3, prohluben: 1.2, nastupiste: 5 });
    Object.keys(C).forEach(k => delete C[k]); Object.assign(C, JSON.parse(JSON.stringify(c))); delete C.prazdny; OCK.fixes = true;
    Z.mustky = [{ ks: 3, delkaMm: 1200 }, { ks: 1, delkaMm: 900, podlaha: 'vana' }];
    prepniTab('kalk'); render();
    const k = document.getElementById('ock-mustky'); if (!k) return null;
    const pr = [...k.querySelectorAll('button')].filter(b => /další provedení|✕/.test(b.textContent));
    const tbl = k.querySelector('table'), lista = k.querySelector('.mustky-lista');
    return { tlacitkaSkryta: pr.every(b => b.getBoundingClientRect().width === 0),
      listaNad: lista.getBoundingClientRect().bottom <= tbl.getBoundingClientRect().top + 1,
      celaTabulka: tbl.getBoundingClientRect().right <= k.getBoundingClientRect().right + 1 };
  }, [cenStary]);
  await pg.close();
  zkus('7 tisk: tlačítka karty se netisknou, lišta nad tabulkou, tabulka se vejde', t && t.tlacitkaSkryta && t.listaNad && t.celaTabulka, t);
}

/* 8) VÝŠKA SLOUPU A ČESKÁ ČÁRKA (MU3, J. V. 6. 11. 2026: zdvih 17,3 m,
 * přejezd 2,7 m, prohlubeň 1,05 m, nápověda „17.3"). Nápověda výšky sloupu
 * = délka rohového sloupku (H − 0,2 = 20,85 m) s čárkou; zápis „17,3"
 * i „17.3" z klávesnice v české stránce (prohlížeč s cs-CZ) se uloží jako
 * 17,3; poznámka řádku sloupů v kalkulaci s čárkou. */
{
  const ctxCs = await b.newContext({ locale: 'cs-CZ' });
  const pg = await ctxCs.newPage(); await pg.setViewportSize({ width: 1440, height: 1000 });
  const chybyCs = []; pg.on('pageerror', e => chybyCs.push(e.message));
  await pg.goto(KDE); await pg.waitForFunction(() => typeof render === 'function' && typeof NAST !== 'undefined');
  const pr = await pg.evaluate(([c]) => {
    ZAK = novaZakazka(); syncVarianta();
    Object.assign(Z, { typSachty: 'exteriérová', profily: JSON.parse(JSON.stringify(PROFILY_VYCHOZI['exteriérová'])), sirka: 1.6, hloubka: 2,
      zdvih: 17.3, prejezd: 2.7, prohluben: 1.05, nastupiste: 5, rohoveSloupky: 4 });
    Object.keys(C).forEach(k => delete C[k]); Object.assign(C, JSON.parse(JSON.stringify(c))); delete C.prazdny; OCK.fixes = true;
    Z.mustky = [{ ks: 1, sloupyKs: 2 }];
    prepniTab('kalk'); render();
    const k = document.getElementById('ock-mustky');
    const v = k && k.querySelector('input.mu-sloupVyskaM');
    const tdPozn = [...document.querySelectorAll('#page-kalk tr')].find(tr => [...tr.querySelectorAll('input.nazev-ed')].some(i => /SLOUPY NAVÍC \(PROFIL\)/.test(i.value)));
    return { ph: v && v.placeholder, title: v && v.title, typ: v && (v.hasAttribute('data-cislo') ? 'cislo' : v.type),
      tecky: k ? [...k.querySelectorAll('input')].map(i => i.placeholder).filter(x => /\d\.\d/.test(x)) : null,
      sloupyM: vypocetAkt().mustky.sloupyM, radek: tdPozn ? tdPozn.textContent.replace(/\s+/g, ' ') : '' };
  }, [cen]);
  zkus('8 nápověda výšky sloupu = výška šachty − 0,2 m s čárkou („20,85")', pr.ph === '20,85', pr);
  zkus('8 bublina říká „výška šachty (prohlubeň + zdvih + přejezd)"', /výška šachty \(prohlubeň \+ zdvih \+ přejezd\)/.test(pr.title || ''), pr.title);
  zkus('8 v kartě žádná nápověda s desetinnou tečkou; pole je číselné pole (data-cislo, CA #575) jako v Zadání šachty', pr.tecky && !pr.tecky.length && pr.typ === 'cislo', pr.tecky);
  zkus('8 prázdná výška počítá 2 × 20,85 m', Math.abs(pr.sloupyM - 41.7) < 1e-9, pr.sloupyM);
  zkus('8 řádek kalkulace „2 ks, 41,7 m" (čárka)', /2 ks, 41,7 m/.test(pr.radek), pr.radek);
  /* Zápis z klávesnice: karta se musí chovat STEJNĚ jako pole Zdvih
   * v Zadání šachty (týž prvek). Od CA #575 čte čárku i tečku společné
   * číselné pole (ui/cislo_pole.js) v každém jazyce prohlížeče; zápis
   * „17,3" i „17.3" v en-US i cs-CZ hlídá overit_575_desetinna_carka.mjs.
   * Tady se porovnává shoda s polem Zdvih a hodnota, kterou pole předá dál,
   * se zkouší i přímo (mustekPoleSet s „17,3" i „17.3"). */
  const zapis = async (sel, txt, cti) => {
    const el = pg.locator(sel).first();
    await el.click(); await pg.keyboard.press('Control+A'); await pg.keyboard.press('Backspace');
    await pg.keyboard.type(txt); await pg.keyboard.press('Tab');
    return pg.evaluate(cti);
  };
  for (const txt of ['17,3', '17.3']) {
    const vKarte = await zapis('#ock-mustky input.mu-sloupVyskaM', txt, () => Z.mustky[0].sloupVyskaM);
    const zdvihPred = await pg.evaluate(() => Z.zdvih);
    const vZdvihu = await zapis('#inputs .row:has(> label:text-is("Zdvih")) input', txt, () => Z.zdvih);
    await pg.evaluate((z) => { set('Z.zdvih', z); }, zdvihPred);
    zkus('8 zápis „' + txt + '" z klávesnice: karta Můstky = pole Zdvih v Zadání šachty', vKarte === vZdvihu, { vKarte, vZdvihu });
  }
  const predane = await pg.evaluate(() => ['17,3', '17.3'].map(t => { mustekPoleSet(0, 'sloupVyskaM', t); return Z.mustky[0].sloupVyskaM; }));
  zkus('8 hodnota „17,3" i „17.3" z pole → 17,3 m', predane[0] === 17.3 && predane[1] === 17.3, predane);
  const vVyp = await pg.evaluate(() => vypocetAkt().mustky.skupiny[0].vyskaSloupuM);
  zkus('8 vyplněná výška platí (17,3 m)', vVyp === 17.3, vVyp);
  zkus('8 žádná chyba stránky', !chybyCs.length, chybyCs);
  await ctxCs.close();
}

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
