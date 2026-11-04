/* #560 — ZRUŠENÁ VOLBA SVĚTLÍKU „ZAJISTÍ STAVBA" (rozhodnutí J. V. 4. 11. 2026):
 * „Žádné rámy kolem neděláme, světlík kompletně dodává stavba. Variantu
 * zajistí stavba odstraň. Protože stavba v takovém případě dozdívá prostor
 * světlíku a my s ním nemáme práci. Což pro obchodníka znamená, že je to
 * varianta světlíku ‚bez'. Kontrola proto není třeba."
 *
 * Hlídá se:
 *   1) obrazovka „zajistí stavba" nenabízí (nad dveřmi ani na bocích) a zápis
 *      „stavba" odmítne; odeslaná nabídka ji ukáže jen jako vypnutou položku,
 *   2) převod rozpracované varianty na „bez" a přepočet (Model 1 / Model 2,
 *      nad dveřmi i boky, i starší tvar boků),
 *   3) ODESLANÁ (zamčená) varianta se nemění: data bajt po bajtu, výpočet
 *      z uložených dat na haléř, zámek (zamekDataPorovnani) bez rozdílu;
 *      klon i duplikát zakázky z ní převedou jen kopii,
 *   4) upozornění u „bez" nevzniká (nad dveřmi ani na bocích) a brána
 *      dokumentů s ním nepočítá; kontroly počtu u skla fungují dál,
 *   5) server (uloTypyProblemy): nová „stavba" neprojde, stará data ano.
 *
 * Pojistka: nad 6109e39 (v4.11.3) sada selže (volba v UI je, převod ani
 * NAD_DVERMI_NABIDKA neexistují, upozornění „bez" vzniká, server „stavba"
 * pouští). Čísla ze zkušebního ceníku, smyšlené údaje.
 * Spuštění: node src/test_svetliky_stavba.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const E = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
const J = require('./jekly.json');
const kop = x => JSON.parse(JSON.stringify(x));
['nadDvermiVypln', 'bokyVypln', 'bokyPocet', 'bokyPocetAuto', 'bokyPocetRucne', 'bokySirkaRucniMm', 'nastupisteCelkem',
 'svetlikyBokyMigrace', 'svetlikyStavbaNaBez', 'mustkyPocet', 'OPLASTENI_TYPY', 'skloVolba', 'oplasteniTypy', 'vypocet',
 'DEFAULT_ZADANI']
  .forEach(k => { if (E[k] !== undefined) global[k] = E[k]; });

let ok = 0, fail = 0;
const safe = f => { try { return JSON.stringify(f()); } catch (e) { return 'výjimka: ' + e.message; } };
const test = (n, fn, info) => {
  let c = false, det = info;
  try { c = typeof fn === 'function' ? fn() : fn; } catch (e) { c = false; det = 'výjimka: ' + e.message; }
  if (c) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, det === undefined ? '' : (typeof det === 'function' ? safe(det) : JSON.stringify(det))); }
};
const blizko = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1e-9 : tol);
const CENIK = () => Object.assign(kop(E.DEFAULT_CENIK), ZC.zkusebniCenik());
function zad(x) {
  const z = kop(E.DEFAULT_ZADANI);
  Object.assign(z, { typSachty: 'exteriérová', profily: kop(E.PROFILY_VYCHOZI['exteriérová']), zaskleni: 'na terče',
    sirka: 1.5, hloubka: 1, zdvih: 8, prejezd: 2, prohluben: 2, nastupiste: 5, rohoveSloupky: 4,
    typPortalu: 'zapuštěný', roztec: 1.25, sirkaRamuMm: 100, cistyVstupMm: 800,
    nadDvermi: 'plech', bokyDveri: 'bez', svetlikyBokyKs: '', svetlikyBokySirkaMm: '' });
  return Object.assign(z, x || {});
}
const spocti = (z, fixes = true) => E.vypocet(z, CENIK(), J, fixes);
const cena = r => r.souhrn.zakladCena;

/* ---------- 1) obrazovka ---------- */
{
  test('jádro: nabízené volby jsou bez / sklo / plech / materiál (bez „stavba")',
    () => E.NAD_DVERMI_NABIDKA.join('|') === 'bez|sklo|plech|material', () => E.NAD_DVERMI_NABIDKA);
  test('jádro: „stavba" se dál ČTE (odeslané nabídky)', () => E.NAD_DVERMI_VOLBY.indexOf('stavba') >= 0
    && E.nadDvermiVypln({ nadDvermi: 'stavba' }) === 'stavba' && E.bokyVypln({ bokyDveri: 'stavba' }) === 'stavba');
  const src = fs.readFileSync(path.join(__dirname, 'ui', 'kalk_ock.js'), 'utf8');
  const a = src.indexOf('const NAD_DVERMI_POPISY'), b = src.indexOf('/* Bublina u volby světlíků');
  const ctx = { esc: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;') };
  vm.createContext(ctx);
  vm.runInContext(src.slice(a, b).replace('const NAD_DVERMI_POPISY', 'var NAD_DVERMI_POPISY'), ctx);
  test('UI: seznam voleb výběru nemá „zajistí stavba"', () => ctx.NAD_DVERMI_POPISY.map(x => x[0]).join('|') === 'bez|sklo|plech|material'
    && !ctx.NAD_DVERMI_POPISY.some(x => /stavba/.test(x[1])), () => ctx.NAD_DVERMI_POPISY);
  test('UI: výběr rozpracované varianty nemá položku „stavba"', () => ['bez', 'sklo', 'plech', 'material']
    .every(v => !/stavba/.test(ctx.svetlikVolbyHtml(v))), () => ctx.svetlikVolbyHtml('bez'));
  test('UI: oba výběry (nad dveřmi i boky) skládá svetlikVolbyHtml', () =>
    /nadDvermiSet\(this\.value\)[^\n]*svetlikVolbyHtml\(nadDvermiVypln\(Z\)\)/.test(src)
    && /bokyDveriSet\(this\.value\)[^\n]*svetlikVolbyHtml\(bokyVypln\(Z\)\)/.test(src));
  const st = ctx.svetlikVolbyHtml('stavba');
  test('UI: odeslaná nabídka se „stavba" ji ukáže jen jako vypnutou položku', () =>
    /<option value="stavba" selected disabled>zajistí stavba \(zrušená volba\)<\/option>/.test(st)
    && (st.match(/selected/g) || []).length === 1, st);
  test('UI: zápis „stavba" nad dveřmi i na bocích se odmítne (NAD_DVERMI_NABIDKA)', () =>
    /function nadDvermiSet\(v\) \{\n  if \(NAD_DVERMI_NABIDKA\.indexOf\(v\) < 0\) return;/.test(src)
    && /function bokyDveriSet\(v\) \{\n  if \(NAD_DVERMI_NABIDKA\.indexOf\(v\) < 0\) return;/.test(src));
}

/* ---------- 2) převod rozpracované varianty ---------- */
{
  const z = zad({ nadDvermi: 'stavba', svetlikNadDvermi: false, bokyDveri: 'stavba', svetlikyBokyKs: 7, svetlikyBokySirkaMm: 450 });
  test('převod: nad i boky „stavba" → „bez", vrací true', () => E.svetlikyStavbaNaBez(z) === true
    && z.nadDvermi === 'bez' && z.bokyDveri === 'bez' && z.svetlikNadDvermi === false, () => z);
  test('převod: počet bočních světlíků je pak 0', () => E.bokyPocet(z) === 0);
  test('převod: ruční počet a šířka zůstanou v datech (při „bez" je jádro nečte)',
    () => z.svetlikyBokyKs === 7 && z.svetlikyBokySirkaMm === 450);
  test('převod: bez „stavba" nic nemění a vrací false', () => {
    const y = zad({ nadDvermi: 'sklo', bokyDveri: 'plech' }), p = JSON.stringify(y);
    return E.svetlikyStavbaNaBez(y) === false && JSON.stringify(y) === p; });
  const stary = zad({ svetlikyBoky: 2, bokyVypln: 'stavba' }); delete stary.bokyDveri;
  test('převod: starší tvar boků (počet stran, výplň „stavba") → „bez"', () => E.bokyVypln(stary) === 'stavba'
    && E.svetlikyStavbaNaBez(stary) === true && E.bokyVypln(stary) === 'bez' && E.bokyPocet(stary) === 0, () => stary);

  for (const fixes of [true, false]) {
    const M = fixes ? 'Model 2' : 'Model 1';
    const n = E.nastupisteCelkem(zad());
    const nadSt = spocti(zad({ nadDvermi: 'stavba' }), fixes), nadBez = spocti(zad({ nadDvermi: 'bez' }), fixes);
    const zp = zad({ nadDvermi: 'stavba' }); E.svetlikyStavbaNaBez(zp);
    const nadPrev = spocti(zp, fixes);
    test(M + ': nad dveřmi po převodu = „bez" na haléř', () => cena(nadPrev) === cena(nadBez), () => [cena(nadPrev), cena(nadBez)]);
    if (fixes) test(M + ': nad dveřmi převod cenu nemění (výplň 0 Kč, montáž se neubírá ani u „bez")',
      () => cena(nadSt) === cena(nadBez) && nadSt.montaz.hodinyNavic.svetlik === 0 && nadBez.montaz.hodinyNavic.svetlik === 0,
      () => [cena(nadSt), cena(nadBez)]);
    else test(M + ': nad dveřmi převod ubere 0,2 h montáže na nástupiště (předloha 1:1) — cena klesne',
      () => nadSt.montaz.hodinyNavic.svetlik === 0 && blizko(nadBez.montaz.hodinyNavic.svetlik, -0.2 * n) && cena(nadBez) < cena(nadSt),
      () => [nadSt.montaz.hodinyNavic.svetlik, nadBez.montaz.hodinyNavic.svetlik, cena(nadSt), cena(nadBez)]);
    const bSt = spocti(zad({ bokyDveri: 'stavba', svetlikyBokyKs: 7 }), fixes), bBez = spocti(zad({ bokyDveri: 'bez', svetlikyBokyKs: 7 }), fixes);
    const zb = zad({ bokyDveri: 'stavba', svetlikyBokyKs: 7 }); E.svetlikyStavbaNaBez(zb);
    const bPrev = spocti(zb, fixes);
    test(M + ': boky po převodu = „bez" na haléř', () => cena(bPrev) === cena(bBez), () => [cena(bPrev), cena(bBez)]);
    test(M + ': boky převod — zmizí 0,5 h na světlík, sloupky portálu i krátké příčníky; cena klesne',
      () => bSt.montaz.hodinyNavic.svetlikyBoky === 3.5 && bPrev.montaz.hodinyNavic.svetlikyBoky === 0
        && bPrev.zaskleni.vypln.bokyKs === 0 && cena(bPrev) < cena(bSt),
      () => [bSt.montaz.hodinyNavic.svetlikyBoky, bPrev.montaz.hodinyNavic.svetlikyBoky, cena(bSt), cena(bPrev)]);
  }
}

/* ---------- 3) zakázka: rozpracovaná se převede, odeslaná ne ---------- */
global.DEFAULT_ZADANI = kop(E.DEFAULT_ZADANI);
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const EP = require('./engine_proj.js');
global.DEFAULT_ZADANI_PROJ = kop(EP.DEFAULT_ZADANI_PROJ);
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
global.DEFAULT_TECHSPEC = require('./techspec.js').DEFAULT_TECHSPEC;
global.vypocetProj = EP.vypocetProj;
const zk = require('./zakazka.js');
Object.keys(zk).forEach(k => { global[k] = zk[k]; });
const zm = require('./zamek.js');
Object.keys(zm).forEach(k => { global[k] = zm[k]; });
function zakazkaSeStavbou() {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 9560'; z.nazevAkce = 'TEST SV 560';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2,
    nadDvermi: 'stavba', svetlikNadDvermi: false, bokyDveri: 'stavba', svetlikyBokyKs: 6 });
  v.data.cenik = Object.assign(v.data.cenik, ZC.zkusebniCenik());
  zm.klonujVariantu(z, v.id);   // dnes klon „stavbu" převede — rozpracovanou variantu se starými daty nastavíme ručně:
  const w = z.varianty[1];
  Object.assign(w.data.ock.zadani, { nadDvermi: 'stavba', bokyDveri: 'stavba' });
  zm.zamkniVariantu(v, { cislo: zm.variantaCislo(z, v), typ: 'nabidkaTisk', kdy: '2026-10-01T10:00:00.000Z',
    vysledek: zm.zamekVysledekSpocti(v, J, 'test'), snimek: zm.zamekSnimekSpocti ? zm.zamekSnimekSpocti(v) : undefined });
  return z;
}
{
  const z = zakazkaSeStavbou();
  const [v, w] = z.varianty;
  const dataPred = JSON.stringify(v.data);
  const zmrazPred = JSON.stringify(zm.vypocetZ(v, J));
  const zDat = d => E.vypocet(d.ock.zadani, d.cenik, J, d.ock.fixes);
  const cenaDatPred = cena(zDat(v.data));
  const porovnaniPred = zm.zamekDataPorovnani(kop(v.data), v);
  const wPred = cena(zDat(w.data));
  const n = zk.svetlikyStavbaPrevod(z);
  test('zakázka: převedena 1 varianta (rozpracovaná), odeslaná ne', () => n === 1, n);
  test('zakázka: rozpracovaná má „bez" nad dveřmi i na bocích', () => w.data.ock.zadani.nadDvermi === 'bez' && w.data.ock.zadani.bokyDveri === 'bez');
  test('zakázka: rozpracovaná se přepočte (zmizí boční světlíky)', () => cena(zDat(w.data)) < wPred
    && zDat(w.data).zaskleni.vypln.bokyKs === 0, () => [wPred, cena(zDat(w.data))]);
  test('odeslaná: data beze změny bajt po bajtu („stavba" zůstává)', () => JSON.stringify(v.data) === dataPred
    && v.data.ock.zadani.nadDvermi === 'stavba' && v.data.ock.zadani.bokyDveri === 'stavba');
  test('odeslaná: zmrazený výsledek beze změny', () => JSON.stringify(zm.vypocetZ(v, J)) === zmrazPred);
  test('odeslaná: výpočet z uložených dat na haléř stejný (jádro „stavba" dál umí)', () => cena(zDat(v.data)) === cenaDatPred
    && cenaDatPred === zm.zamekVysledek(v).ock.souhrn.zakladCena, () => [cena(zDat(v.data)), cenaDatPred]);
  test('odeslaná: zámek (zamekDataPorovnani) nehlásí rozdíl', () => zm.zamekDataPorovnani(kop(v.data), v) === porovnaniPred);
  test('převod je idempotentní (druhé otevření nic nepřevádí)', () => zk.svetlikyStavbaPrevod(z) === 0);

  /* Klon odeslané varianty a duplikát zakázky převedou jen kopii. */
  const k = zm.klonujVariantu(z, v.id);
  test('klon odeslané varianty: kopie „bez", zdroj beze změny', () => k.data.ock.zadani.nadDvermi === 'bez'
    && k.data.ock.zadani.bokyDveri === 'bez' && JSON.stringify(v.data) === dataPred);
  const dup = zk.zakazkaDuplikuj(zakazkaSeStavbou(), '2026 - OPR - CN - 9561');
  test('duplikát zakázky: všechny varianty „bez" (nová zakázka nic neodeslala)', () => dup.varianty.every(x =>
    x.data.ock.zadani.nadDvermi === 'bez' && x.data.ock.zadani.bokyDveri === 'bez'));
}

/* ---------- 4) kontroly a brána dokumentů ---------- */
{
  const sl = require('./sleva.js'); global.slevaPodil = sl.slevaPodil;
  const kt = require('./kontroly.js');
  const stav = (z, fixes = true) => kt.kontrolyProved({ zadani: z, vysledek: spocti(z, fixes) });
  const nal = (z, kod, fixes) => stav(z, fixes).nalezy.find(x => x.kod === kod);
  test('pravidlo „nadDvermiBez" už není', () => !kt.kontrolyPravidla().some(p => p.kod === 'nadDvermiBez'));
  for (const fixes of [true, false]) {
    const M = fixes ? 'Model 2' : 'Model 1';
    test(M + ': „bez" nad dveřmi upozornění nedá', () => !nal(zad({ nadDvermi: 'bez' }), 'nadDvermiBez', fixes));
    test(M + ': „bez" na bocích upozornění nedá (mezera 0,6 m)', () => !nal(zad({ bokyDveri: 'bez' }), 'bokyDveri', fixes)
      && blizko(spocti(zad({ bokyDveri: 'bez' }), fixes).zaskleni.vypln.mezera, 0.6, 1e-9));
  }
  const s = stav(zad({ nadDvermi: 'bez', bokyDveri: 'bez' }));
  test('brána dokumentů s „bez" nepočítá (nic nebrání, nabídka i SoD OCK projdou)', () => !s.brani
    && ['nabidka', 'nabidkaTisk', 'sod', 'kryci_bo'].every(t => kt.kontrolyZabranaDokumentu(s, t) === '')
    && !s.nalezy.some(x => x.kod === 'bokyDveri' || x.kod === 'nadDvermiBez'), () => s.nalezy.map(x => x.kod));
  const n12 = nal(zad({ bokyDveri: 'sklo', svetlikyBokyKs: 12 }), 'bokyDveri');
  test('sklo: víc než dva světlíky na dveře se hlásí dál', () => !!n12 && /víc než dva/.test(n12.text), () => n12);
  const n3 = nal(zad({ bokyDveri: 'sklo', svetlikyBokyKs: 3 }), 'bokyDveri');
  test('sklo: dveře bez světlíku (3 na 5 dveří) se hlásí dál', () => !!n3 && /u 2 dveří/.test(n3.text), () => n3);
  const n0 = nal(zad({ bokyDveri: 'sklo', svetlikyBokyKs: 0 }), 'bokyDveri');
  test('sklo: počet 0 při zvolené výplni se hlásí dál', () => !!n0 && /počet je 0/.test(n0.text), () => n0);
  test('sklo: 10 světlíků na 5 dveří mlčí', () => !nal(zad({ bokyDveri: 'sklo' }), 'bokyDveri'));
  const s750 = stav(zad({ bokyDveri: 'sklo', svetlikyBokyKs: 5, svetlikyBokySirkaMm: 750 }));
  test('sklo: širší ruční šířka dál BRÁNÍ dokumentu (zábrana)', () => s750.brani && s750.kodyBrani.indexOf('bokyDveri') >= 0);
}

/* ---------- 5) server: nová „stavba" neprojde, stará data ano ---------- */
{
  const U = require('./uloziste.js');
  const s1 = (fn, stara, opts) => { const z = zk.novaZakazka(); fn(z.varianty[0].data.ock.zadani);
    if (stara) stara.varianty[0].id = z.varianty[0].id;
    return U.uloTypyProblemy(z, stara, opts); };
  const stara = fn => { const z = zk.novaZakazka(); fn(z.varianty[0].data.ock.zadani); return z; };
  const nova = s1(z => { z.nadDvermi = 'stavba'; z.bokyDveri = 'stavba'; });
  test('server: nová „stavba" nad dveřmi i na bocích neprojde (zrušená volba)', () => nova.length === 2
    && nova.every(p => p.duvod === 'zrusenaVolba') && nova.some(p => /nadDvermi/.test(p.kde)) && nova.some(p => /bokyDveri/.test(p.kde)), nova);
  test('server: věta jmenuje zrušenou volbu a radí „bez"', () => /zrušenou volbu světlíku „zajistí stavba" \(.*ock\.zadani\.nadDvermi.*\) — od 4\. 11\. 2026 se volí „bez"/
    .test(U.uloIdProblemyText(nova)), U.uloIdProblemyText(nova));
  test('server: změna na „stavba" v uložené variantě neprojde', () => s1(z => { z.nadDvermi = 'stavba'; }, stara(z => { z.nadDvermi = 'sklo'; })).length === 1);
  test('server: „stavba", kterou nesla už uložená verze, projde (stará data)', () => s1(z => { z.nadDvermi = 'stavba'; z.bokyDveri = 'stavba'; },
    stara(z => { z.nadDvermi = 'stavba'; z.bokyDveri = 'stavba'; })).length === 0);
  test('server: uložená verze ve starém tvaru boků (bokyVypln „stavba") projde', () => s1(z => { z.bokyDveri = 'stavba'; },
    stara(z => { delete z.bokyDveri; z.svetlikyBoky = 1; z.bokyVypln = 'stavba'; })).length === 0);
  test('server: obnova ze zálohy nese starou „stavba" bez odmítnutí', () => s1(z => { z.nadDvermi = 'stavba'; }, null, { obnova: true }).length === 0);
  test('server: platné volby projdou', () => s1(z => { z.nadDvermi = 'bez'; z.bokyDveri = 'material'; }).length === 0);
  test('server: neznámá volba dál neprojde jako typ', () => s1(z => { z.nadDvermi = 'zlato'; }).some(p => p.duvod === 'typ'));
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
