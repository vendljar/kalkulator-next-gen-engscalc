/* Ověření v prohlížeči: zrušená volba světlíku „zajistí stavba" (#560,
 * rozhodnutí J. V. 4. 11. 2026: „stavba" = „bez", prostor světlíku dozdí
 * stavba; upozornění u „bez" není třeba).
 * ============================================================================
 *
 * Hlídá se na sestavené aplikaci (dist/kalkulacka.html):
 *   1) výběr „Světlík nad šachetními dveřmi" i „Světlíky na bocích dveří"
 *      nenabízí „zajistí stavba",
 *   2) stará zakázka (odeslaná + rozpracovaná varianta se „stavba") po
 *      otevření (uloSrovnejSPlatnymCenikem — totéž volá otevření online, ze
 *      složky i obnova zálohy): rozpracovaná je „bez" a přepočtená, věta
 *      o převodu; odeslaná má data beze změny, cenu na haléř stejnou a ve
 *      výběru zrušenou volbu jen jako vypnutou položku,
 *   3) kontrola před nabídkou u „bez" nic nehlásí (nad dveřmi ani boky),
 *      u skla s počtem 12 hlásí dál,
 *   4) klon odeslané varianty je „bez"; žádná chyba v konzoli.
 *
 * Pojistka: nad 6109e39 selže bod 1 i 2 (volba v menu, převod neexistuje).
 * Spuštění: node overit_svetliky_stavba.mjs (po python3 build.py)
 */
import { chromium } from 'playwright';
import { createRequire } from 'module';

const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + detail)); }
};

const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
const chyby = [];
p.on('pageerror', e => chyby.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') chyby.push('error: ' + m.text()); });
p.on('dialog', d => d.dismiss().catch(() => {}));
await p.goto(KDE);
await p.waitForFunction(() => typeof NAST !== 'undefined' && typeof render === 'function', null, { timeout: 15000 });
await p.waitForTimeout(400);

const ZC = createRequire(import.meta.url)('./src/zkusebni_cenik.js');
const vysl = await p.evaluate(([c, cp]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  const out = {};
  const volby = t => { const l = [...document.querySelectorAll('#inputs .row > label')].find(x => x.textContent.trim().indexOf(t) === 0);
    const s = l && l.parentElement.querySelector('select');
    return s ? [...s.options].map(o => ({ v: o.value, t: o.textContent.trim(), dis: o.disabled, sel: o.selected })) : null; };
  const zad = { typSachty: 'exteriérová', profily: JSON.parse(JSON.stringify(PROFILY_VYCHOZI['exteriérová'])),
    zaskleni: 'na terče', sirka: 1.5, hloubka: 1, zdvih: 8, prejezd: 2, prohluben: 2, nastupiste: 5, rohoveSloupky: 4,
    typPortalu: 'zapuštěný', roztec: 1.25, sirkaRamuMm: 100, cistyVstupMm: 800 };

  /* 1) nová zakázka */
  ZAK = novaZakazka(); syncVarianta(); Object.assign(Z, zad); OCK.fixes = true;
  prepniTab('kalk'); render();
  out.nove = { nad: volby('Světlík nad šachetními dveřmi'), boky: volby('Světlíky na bocích dveří') };

  /* 2) stará zakázka: odeslaná + rozpracovaná varianta se „stavba" */
  const z = novaZakazka(); z.cislo = '2026 - OPR - CN - 9563'; z.nazevAkce = 'TEST SV 560 prohlížeč';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, zad, { nadDvermi: 'stavba', svetlikNadDvermi: false, bokyDveri: 'stavba', svetlikyBokyKs: 6 });
  v.data.ock.fixes = false;                    // Model 1 (předloha) — tam „bez" ubírá 0,2 h na nástupiště
  Object.assign(v.data.cenik, c); delete v.data.cenik.prazdny;
  Object.assign(v.data.proj.cenik, cp); delete v.data.proj.cenik.prazdny;
  /* Ceník se skutečnými čísly nenese značku „ukázkový" — tu by srovnání po
   * otevření odebralo i odeslané variantě (P2, N2/N3), s #560 to nesouvisí. */
  delete v.data.cenik.ukazkove; delete v.data.proj.cenik.ukazkove;
  z.varianty.push(JSON.parse(JSON.stringify(v))); z.varianty[1].id = 'v-sv560-rozpr'; z.varianty[1].nazev = 'Varianta 2';
  z.varianty[1].ridici = false;
  zamkniVariantu(v, { cislo: variantaCislo(z, v), typ: 'nabidkaTisk', kdy: '2026-10-01T10:00:00.000Z', kdo: 'harness',
    vysledek: zamekVysledekSpocti(v, JEKLY, 'harness'), snimek: zamekSnimekSpocti(v) });
  const cenaZDat = d => vypocet(d.ock.zadani, d.cenik, JEKLY, d.ock.fixes).souhrn.zakladCena;
  const ulozena = JSON.parse(JSON.stringify(z));
  ZAK = importZakazka(JSON.parse(JSON.stringify(ulozena)));
  const odeslanaData = JSON.stringify(ZAK.varianty[0].data);
  /* Zámek porovnává data po importu na obou stranách (server: staraPorovnani). */
  const porovnaniPred = zamekDataPorovnani(ZAK.varianty[0].data, ZAK.varianty[0]);
  const cenaOdeslane = cenaZDat(ZAK.varianty[0].data), cenaRozprPred = cenaZDat(ZAK.varianty[1].data);
  const hodRozprPred = vypocet(ZAK.varianty[1].data.ock.zadani, ZAK.varianty[1].data.cenik, JEKLY, false).montaz.hodinyNavic;
  syncVarianta();
  const prep = uloSrovnejSPlatnymCenikem();
  out.prep = { svetlikyStavba: prep && prep.svetlikyStavba, veta: uloPrepocetVeta(prep) };
  const w = ZAK.varianty[1];
  const hodPo = vypocet(w.data.ock.zadani, w.data.cenik, JEKLY, false).montaz.hodinyNavic;
  out.rozpr = { nad: w.data.ock.zadani.nadDvermi, boky: w.data.ock.zadani.bokyDveri,
    cenaPred: cenaRozprPred, cenaPo: cenaZDat(w.data), svetlikPred: hodRozprPred.svetlik, svetlikPo: hodPo.svetlik,
    bokyPred: hodRozprPred.svetlikyBoky, bokyPo: hodPo.svetlikyBoky, nast: nastupisteCelkem(w.data.ock.zadani) };
  out.odesl = { dataBezZmeny: JSON.stringify(ZAK.varianty[0].data) === odeslanaData, cena: cenaZDat(ZAK.varianty[0].data),
    cenaPred: cenaOdeslane, otisk: zamekVysledek(ZAK.varianty[0]).ock.souhrn.zakladCena,
    porovnani: zamekDataPorovnani(ZAK.varianty[0].data, ZAK.varianty[0]) === porovnaniPred };
  ZAK.aktivni = w.id; syncVarianta(); render();
  out.rozprVolby = { nad: volby('Světlík nad šachetními dveřmi'), boky: volby('Světlíky na bocích dveří') };
  ZAK.aktivni = ZAK.varianty[0].id; syncVarianta(); render();
  out.odeslVolby = { nad: volby('Světlík nad šachetními dveřmi'), boky: volby('Světlíky na bocích dveří') };

  /* 3) kontrola před nabídkou (rozpracovaná „bez") */
  ZAK.aktivni = w.id; syncVarianta(); render();
  const kody = () => kontrolyProved(kontrolyCtxAkt()).nalezy.map(n => n.kod);
  out.kodyBez = kody();
  Z.bokyDveri = 'sklo'; Z.svetlikyBokyKs = 12; render();
  const n12 = kontrolyProved(kontrolyCtxAkt()).nalezy.find(n => n.kod === 'bokyDveri');
  out.n12 = n12 ? n12.text : '';
  Z.bokyDveri = 'bez'; Z.svetlikyBokyKs = 6; render();

  /* 4) klon odeslané varianty */
  const k = klonujVariantu(ZAK, ZAK.varianty[0].id);
  out.klon = { nad: k.data.ock.zadani.nadDvermi, boky: k.data.ock.zadani.bokyDveri,
    zdroj: ZAK.varianty[0].data.ock.zadani.nadDvermi };
  return out;
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);

const texty = x => (x || []).map(o => o.t).join('|');
zkus('1) nová zakázka: nad dveřmi bez „zajistí stavba"', texty(vysl.nove.nad) === 'bez|sklo|plech|materiál opláštění', texty(vysl.nove.nad));
zkus('1) nová zakázka: boky bez „zajistí stavba"', texty(vysl.nove.boky) === 'bez|sklo|plech|materiál opláštění', texty(vysl.nove.boky));
zkus('2) otevření převedlo 1 rozpracovanou variantu a řeklo to větou', vysl.prep.svetlikyStavba === 1
  && /Zrušená volba světlíku „zajistí stavba" převedena na „bez" \(1 rozpracovaná varianta/.test(vysl.prep.veta)
  && /Odeslané nabídky zůstávají beze změny/.test(vysl.prep.veta), JSON.stringify(vysl.prep));
zkus('2) rozpracovaná: „bez" nad dveřmi i na bocích', vysl.rozpr.nad === 'bez' && vysl.rozpr.boky === 'bez', JSON.stringify(vysl.rozpr));
zkus('2) rozpracovaná (Model 1): ubere 0,2 h na nástupiště, boky 0 h — cena klesla', vysl.rozpr.svetlikPred === 0
  && Math.abs(vysl.rozpr.svetlikPo + 0.2 * vysl.rozpr.nast) < 1e-9 && vysl.rozpr.bokyPred === 3 && vysl.rozpr.bokyPo === 0
  && vysl.rozpr.cenaPo < vysl.rozpr.cenaPred, JSON.stringify(vysl.rozpr));
zkus('2) rozpracovaná: výběr bez „stavba" a s „bez" vybraným', !JSON.stringify(vysl.rozprVolby).includes('stavba')
  && vysl.rozprVolby.nad.find(o => o.sel).v === 'bez' && vysl.rozprVolby.boky.find(o => o.sel).v === 'bez', JSON.stringify(vysl.rozprVolby));
zkus('2) odeslaná: data beze změny a zámek bez rozdílu', vysl.odesl.dataBezZmeny && vysl.odesl.porovnani, JSON.stringify(vysl.odesl));
zkus('2) odeslaná: cena z dat na haléř stejná a rovná zmrazenému otisku', vysl.odesl.cena === vysl.odesl.cenaPred
  && vysl.odesl.cena === vysl.odesl.otisk, JSON.stringify(vysl.odesl));
const vyp = x => (x || []).find(o => o.v === 'stavba');
zkus('2) odeslaná: zrušená volba jen jako vybraná vypnutá položka (nad i boky)',
  ['nad', 'boky'].every(k => { const s = vyp(vysl.odeslVolby[k]); return s && s.dis && s.sel && /zrušená volba/.test(s.t); }), JSON.stringify(vysl.odeslVolby));
zkus('3) „bez" nad dveřmi ani na bocích kontrola nehlásí', !vysl.kodyBez.includes('nadDvermiBez') && !vysl.kodyBez.includes('bokyDveri'),
  vysl.kodyBez.join(','));
zkus('3) sklo s 12 světlíky na 5 dveří hlásí dál', /víc než dva/.test(vysl.n12), vysl.n12);
zkus('4) klon odeslané varianty je „bez", zdroj „stavba"', vysl.klon.nad === 'bez' && vysl.klon.boky === 'bez' && vysl.klon.zdroj === 'stavba',
  JSON.stringify(vysl.klon));
zkus('žádná chyba v konzoli', chyby.length === 0, chyby.slice(0, 3).join(' | '));

await b.close();
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
