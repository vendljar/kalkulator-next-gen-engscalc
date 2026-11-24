/* ===== DT #745: DATUM CENOVÉ NABÍDKY = DEN TISKU =====
 * (rozhodnutí J. V. 24. 11. 2026)
 *
 * Kalkulace se rozpracuje a tiskne i po měsíci; nabídka ale nesla datum
 * založení varianty (variantaDatum). Nově:
 *  - neodeslaná: den tisku v Europe/Prague (i online náhled = co dostane tisk dnes),
 *  - odeslaná se `zamek.datumNabidky`: drží den odeslání (dotisk = papír zákazníka),
 *  - odeslaná bez něj (zámky před DT): beze změny variantaDatum,
 *  - smlouva o dílo cituje „nabídku ze dne“ = totéž datum (J. V. 24. 11., #746),
 *    plná moc beze změny (datum založení varianty),
 *  - krycí list „Dne" = datum nabídky, objednávka PROJ „nabídka ze dne" taky.
 * Pole je mimo klíč zámku: cenu, číslo ani otisk nemění.
 *
 * Pojistka: před opravou sada selže (nabidkaDatum neexistuje, DATUM = 01.10.2026),
 * po opravě projde. Spuštění: cd src && node test_dt_datum_tisku.js */
const fs = require('fs');
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
nacti('./preklad.js'); nacti('./format.js'); nacti('./engine.js'); const EP = nacti('./engine_proj.js');
nacti('./techspec.js');
const zk = nacti('./zakazka.js');
const ZM = nacti('./zamek.js');
nacti('./sleva.js'); nacti('./zaokrouhleni.js'); nacti('./firma.js'); nacti('./zpracovatel.js');
nacti('./plan_plateb.js'); nacti('./podminky.js');
const K = nacti('./kryci.js');
const KP = nacti('./kryci_proj.js');
nacti('./dokumenty.js');
const NO = nacti('./nabidka.js');
const NP = nacti('./nabidka_proj.js');
const ZC = require('./zkusebni_cenik.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./nazvy_souboru.js');
const SOD = nacti('./sod.js');
const ULO = require('./uloziste.js');
let OBJ = null; try { OBJ = nacti('./objednavka_proj.js'); } catch (e) { OBJ = null; }
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));
global.NAST = { firma: global.firmaDefault() };

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
const kopie = o => JSON.parse(JSON.stringify(o));

const nabidkaDatum = ZM.nabidkaDatum || (() => '');
const TISK = Date.parse('2026-11-24T10:00:00Z');        // tisk 24. 11.
const zakazka = () => {
  const zak = zk.novaZakazka();
  zak.cislo = '2026 - OPR - CN - 0745'; zak.objednatel = 'TEST zákazník s.r.o.'; zak.kontakt = 'Jan Zkušební';
  zak.adresa = 'Zkušební 1, Praha'; zak.nazevAkce = 'TEST DT'; zak.dic = 'CZ00000001';
  zak.datum = '2026-10-01';                             // rozpracováno 1. 10.
  const v = zak.varianty[0];
  v.datum = '2026-10-01';
  Object.assign(v.data.ock.zadani, { prejezd: 2.7, zdvih: 17.325, prohluben: 1.05, sirka: 1.51, hloubka: 1.515 });
  v.data.cenik.kurzEurKc = 25; v.data.proj.cenik = kopie(ZC.zkusebniCenikProj()); v.data.proj.cenik.kurzEurKc = 25;   // smyšlený kurz (cizojazyčné nabídky)
  const z = kopie(EP.DEFAULT_ZADANI_PROJ);
  z.sekce.forEach(s => s.polozky.forEach(p => { p.vyrazeno = false; }));
  v.data.proj.zadani = z;
  return { zak, v };
};
const odesli = (v, kdy, datumNabidky) => ZM.zamkniVariantu(v, { kdy, typ: 'nabidka',
  vysledek: { proj: EP.vypocetProj(v.data.proj.zadani, v.data.proj.cenik) }, datumNabidky });

/* ---------- 1) čisté pravidlo nabidkaDatum ---------- */
test('nabidkaDatum je exportovaná', typeof ZM.nabidkaDatum === 'function');
{
  const { zak, v } = zakazka();
  test('rozpracováno 1. 10., tisk 24. 11. → 2026-11-24', nabidkaDatum(zak, v, TISK) === '2026-11-24', nabidkaDatum(zak, v, TISK));
  test('datum založení varianty se nemění', v.datum === '2026-10-01' && zak.datum === '2026-10-01');
  odesli(v, '2026-11-10T09:00:00.000Z', '2026-11-10');
  test('odeslaná 10. 11., dotisk 24. 11. → 2026-11-10', nabidkaDatum(zak, v, TISK) === '2026-11-10', nabidkaDatum(zak, v, TISK));
  test('odeslaná 10. 11., dotisk o 40 dní později → 2026-11-10',
    nabidkaDatum(zak, v, TISK + 40 * 86400000) === '2026-11-10');
}
{
  const { zak, v } = zakazka();
  odesli(v, '2026-11-10T09:00:00.000Z');               // zámek před DT: bez datumNabidky
  test('zámek bez datumNabidky (před DT) → variantaDatum beze změny', nabidkaDatum(zak, v, TISK) === '2026-10-01', nabidkaDatum(zak, v, TISK));
  delete v.datum;
  test('… varianta bez v.datum → zak.datum', nabidkaDatum(zak, v, TISK) === '2026-10-01');
  v.zamek.datumNabidky = '2026-13-45';
  test('… neplatné datumNabidky se nebere', nabidkaDatum(zak, v, TISK) === '2026-10-01');
}
/* půlnoc: UTC × Praha (#738) */
{
  const { zak, v } = zakazka();
  [['2026-11-23T23:30:00Z', '2026-11-24', 'zima 23:30 UTC = 00:30 Praha'],
   ['2026-11-24T22:59:00Z', '2026-11-24', 'zima 22:59 UTC = 23:59 Praha'],
   ['2026-07-31T22:30:00Z', '2026-08-01', 'léto 22:30 UTC = 00:30 Praha'],
   ['2026-07-31T21:30:00Z', '2026-07-31', 'léto 21:30 UTC = 23:30 Praha']].forEach(([t, cekam, pozn]) => {
    const d = nabidkaDatum(zak, v, Date.parse(t));
    test('půlnoc: ' + pozn + ' → ' + cekam, d === cekam, d);
  });
  test('zamekDenPraha ≠ UTC den po půlnoci Praha', typeof ZM.zamekDenPraha === 'function'
    && ZM.zamekDenPraha(Date.parse('2026-11-23T23:30:00Z')) === '2026-11-24');
}

/* ---------- 2) nabídka OCK a PROJ, všechny jazyky ---------- */
{
  const { zak, v } = zakazka();
  ['cz', 'en', 'de', 'fr'].forEach(L => {
    const o = NO.nabidkaData(zak, v, JEKLY, L, undefined, { ted: TISK }).placeholders.DATUM;
    test('OCK ' + L + ': neodeslaná → 24.11.2026', o === '24.11.2026', o);
    const p = NP.nabidkaProjData(zak, v, L, { ted: TISK }).placeholders.DATUM;
    test('PROJ ' + L + ': neodeslaná → 24.11.2026', p === '24.11.2026', p);
  });
  /* bez `ted` = dnešní den v Praze (online náhled ukazuje, co dostane tisk dnes) */
  const dnes = ZM.zamekDenPraha ? ZM.zamekDenPraha() : '';
  const cz = iso => iso.split('-').reverse().join('.');
  test('OCK bez ted = dnešek v Praze (náhled)', NO.nabidkaData(zak, v, JEKLY).placeholders.DATUM === cz(dnes));
  test('PROJ bez ted = dnešek v Praze (náhled)', NP.nabidkaProjData(zak, v).placeholders.DATUM === cz(dnes));
  /* cena a číslo se datem nemění */
  const a = NO.nabidkaData(zak, v, JEKLY, 'cz', undefined, { ted: TISK }).placeholders;
  const b = NO.nabidkaData(zak, v, JEKLY, 'cz', undefined, { ted: TISK + 60 * 86400000 }).placeholders;
  const bezData = x => { const y = Object.assign({}, x); delete y.DATUM; return JSON.stringify(y); };
  test('OCK: jiný den tisku mění jen DATUM (cena, číslo beze změny)', bezData(a) === bezData(b) && a.DATUM !== b.DATUM);

  odesli(v, '2026-11-10T09:00:00.000Z', '2026-11-10');
  ['cz', 'en', 'de', 'fr'].forEach(L => {
    const o = NO.nabidkaData(zak, v, JEKLY, L, undefined, { ted: TISK }).placeholders.DATUM;
    test('OCK ' + L + ': dotisk odeslané → 10.11.2026', o === '10.11.2026', o);
    const p = NP.nabidkaProjData(zak, v, L, { ted: TISK }).placeholders.DATUM;
    test('PROJ ' + L + ': dotisk odeslané → 10.11.2026', p === '10.11.2026', p);
  });
}
{
  const { zak, v } = zakazka();
  odesli(v, '2026-11-10T09:00:00.000Z');
  test('OCK: dotisk zámku před DT → datum založení', NO.nabidkaData(zak, v, JEKLY, 'cz', undefined, { ted: TISK }).placeholders.DATUM === '01.10.2026');
  test('PROJ: dotisk zámku před DT → datum založení', NP.nabidkaProjData(zak, v, 'cz', { ted: TISK }).placeholders.DATUM === '01.10.2026');
}

/* ---------- 3) smlouva o dílo: „nabídka ze dne“ = datum nabídky (J. V. 24. 11. 2026, #746);
 *            plná moc beze změny ---------- */
{
  const cz = iso => iso.split('-').reverse().join('.');
  const dnes = ZM.zamekDenPraha ? ZM.zamekDenPraha() : '';
  const sod = (zak, v) => {
    v.data.kryci = v.data.kryci || { hodnoty: {} }; v.data.kryciProj = v.data.kryciProj || { hodnoty: {} };
    try { return [SOD.sodData(zak, v, JEKLY, 'cz').placeholders.DATUM, SOD.sodProjData(zak, v, 'cz').placeholders.DATUM]; }
    catch (e) { return [e.message, e.message]; }
  };
  { const { zak, v } = zakazka(); const [o, p] = sod(zak, v);
    test('SoD OCK nezamčená: ze dne = dnešek v Praze (datum nabídky)', o === cz(dnes), o);
    test('SoD PROJ nezamčená: ze dne = dnešek v Praze (datum nabídky)', p === cz(dnes), p);
    if (typeof SOD.plnaMocData === 'function') {
      let pm = null; try { pm = SOD.plnaMocData(zak, v, 'cz'); } catch (e) { pm = null; }
      /* (datumCz v plné moci je z prohlížeče; tady bez něj vrací ISO) */
      if (pm) test('plná moc: DATUM = datum založení varianty (beze změny)', ['01.10.2026', '2026-10-01'].includes(pm.placeholders.DATUM), pm.placeholders.DATUM);
    } }
  { const { zak, v } = zakazka(); odesli(v, '2026-11-10T09:00:00.000Z', '2026-11-10'); const [o, p] = sod(zak, v);
    test('SoD OCK odeslaná 10. 11.: ze dne = 10.11.2026', o === '10.11.2026', o);
    test('SoD PROJ odeslaná 10. 11.: ze dne = 10.11.2026', p === '10.11.2026', p); }
  { const { zak, v } = zakazka(); odesli(v, '2026-11-10T09:00:00.000Z'); const [o, p] = sod(zak, v);
    test('SoD OCK zámek před DT: ze dne = datum založení (beze změny)', o === '01.10.2026', o);
    test('SoD PROJ zámek před DT: ze dne = datum založení (beze změny)', p === '01.10.2026', p); }
}

/* ---------- 4) krycí list „Dne" = datum nabídky ---------- */
{
  const radek = (d, label) => { for (const s of d.sekce) for (const r of (s.radky || [])) if (r[0] === label) return r; return null; };
  const dnes = ZM.zamekDenPraha ? ZM.zamekDenPraha() : '';
  const { zak, v } = zakazka();
  const kd = typeof K.kryciDatumNabidky === 'function' ? K.kryciDatumNabidky : () => '';
  test('KL: neodeslaná → dnešek v Praze', kd({ zak, varianta: v }) === dnes, kd({ zak, varianta: v }));
  const r = radek(K.kryciData(zak, v, JEKLY, 'bo'), 'Dne'), rp = radek(KP.kryciProjData(zak, v, JEKLY, 'bo'), 'Dne');
  const vNab = NO.nabidkaData(zak, v, JEKLY).placeholders.DATUM;
  const kl = x => String(x || '').replace(/\s/g, '').split('.').map(n => n.padStart(2, '0')).join('.');
  test('KL OCK: „Dne" = datum nabídky', !!r && (r[1] === dnes || kl(r[1]) === vNab), [r, vNab]);
  test('KL PROJ: „Dne" = datum nabídky', !!rp && (rp[1] === dnes || kl(rp[1]) === vNab), [rp, vNab]);
  const pole = def => def.reduce((a, s) => a || s.pole.find(p => p.id === 'podpisDne'), null);
  const pv = pole(K.KRYCI_SEKCE), ppv = pole(KP.KRYCI_PROJ_SEKCE);
  test('KL OCK: prefill „Dne" volá datum nabídky', !!pv && pv.prefill({ zak, varianta: v }) === kd({ zak, varianta: v }));
  test('KL PROJ: prefill „Dne" volá datum nabídky', !!ppv && ppv.prefill({ zak, varianta: v }) === kd({ zak, varianta: v }));
  odesli(v, '2026-11-10T09:00:00.000Z', '2026-11-10');
  test('KL: odeslaná → den odeslání', kd({ zak, varianta: v }) === '2026-11-10', kd({ zak, varianta: v }));
  test('KL OCK: prefill odeslané = den odeslání', pv.prefill({ zak, varianta: v }) === '2026-11-10');
  /* revize N3: krycí list PROJ po odeslání — prefill i řádek „Dne“ (bez zmrazení podmínek) */
  test('KL PROJ: prefill odeslané = den odeslání', ppv.prefill({ zak, varianta: v }) === '2026-11-10', ppv.prefill({ zak, varianta: v }));
  const rpz = radek(KP.kryciProjData(zak, v, JEKLY, 'bo'), 'Dne');
  test('KL PROJ: řádek „Dne“ odeslané = den odeslání', !!rpz && (rpz[1] === '2026-11-10' || kl(rpz[1]) === '10.11.2026'), rpz);
  const w = zakazka();
  odesli(w.v, '2026-11-10T09:00:00.000Z');
  test('KL: zámek před DT → beze změny (dnešek, kryciDnesIso)', kd({ zak: w.zak, varianta: w.v }) === K.kryciDnesIso());
}

/* ---------- 5) objednávka PROJ: „nabídka ze dne" ---------- */
if (OBJ && typeof OBJ.objednavkaProjData === 'function') {
  const { zak, v } = zakazka();
  zak.cislo = '2026 - OVP - CN - 0745';
  odesli(v, '2026-11-10T09:00:00.000Z', '2026-11-10');
  const o = OBJ.objednavkaProjData(zak, v, { dnes: new Date(2026, 10, 24) });
  test('objednávka PROJ: nabídka ze dne = den odeslání', !!o && o.datumNabidky === '10.11.2026', o && (o.chyba || o.datumNabidky));
}

/* ---------- 6) zámek: pole jen při prvním zamčení, mimo klíč, drží ho server ---------- */
{
  const { zak, v } = zakazka();
  odesli(v, '2026-11-10T09:00:00.000Z', '2026-11-10');
  ZM.zamkniVariantu(v, { kdy: '2026-11-24T09:00:00.000Z', typ: 'nabidka', datumNabidky: '2026-11-24' });
  test('dotisk datumNabidky nepřepíše', v.zamek.datumNabidky === '2026-11-10' && v.zamek.tisky.length === 2);
  const bez = kopie(v); delete bez.zamek.datumNabidky;
  test('datumNabidky není v klíči zámku (cena, číslo, otisk)', ULO.uloZamekKlic(v) === ULO.uloZamekKlic(bez));
  /* server drží uložené: klient ho nepřepíše */
  const disk = { varianty: [kopie(v)] }, ukl = { varianty: [kopie(v)] };
  ukl.varianty[0].zamek.datumNabidky = '2026-11-24';
  ULO.uloZamekRazitkaDrz(disk, ukl);
  test('server: přepis datumNabidky uloženého zámku vrátí', ukl.varianty[0].zamek.datumNabidky === '2026-11-10');
  /* … ani nedopíše starému zámku */
  const w = zakazka(); odesli(w.v, '2026-11-10T09:00:00.000Z');
  const disk2 = { varianty: [kopie(w.v)] }, ukl2 = { varianty: [kopie(w.v)] };
  ukl2.varianty[0].zamek.datumNabidky = '2026-11-24';
  ULO.uloZamekRazitkaDrz(disk2, ukl2);
  test('server: starému zámku se datumNabidky nedopíše', ukl2.varianty[0].zamek.datumNabidky === undefined);
}
{
  const P = ZM.zamekDatumNabidkyProblem || (() => 'chybí');
  const kdy = '2026-11-23T23:30:00.000Z';           // 24. 11. 00:30 Praha
  test('kontrola: den odeslání v Praze projde', P('2026-11-24', kdy) === '');
  test('kontrola: náhled z předchozího dne projde', P('2026-11-23', kdy) === '');
  test('kontrola: den po odeslání neprojde', P('2026-11-25', kdy) !== '');
  test('kontrola: o víc než týden starší neprojde', P('2026-11-16', kdy) !== '');
  test('kontrola: týden starší projde', P('2026-11-17', kdy) === '');
  test('kontrola: nesmysl neprojde', P('2026-02-30', kdy) !== '' && P('', kdy) !== '' && P(null, kdy) !== '');
}

/* ---------- 7) revize N1: řetěz „datum z náhledu → zámek“ ----------
 * Náhled otevřený před půlnocí a vytištěný po ní: papír nese den náhledu
 * a zámek ho musí převzít (jinak dotisk ≠ papír). Skutečný kód z ui/ se
 * spouští ve vm nad náhradním prostředím. */
const vm = require('vm');
const UI = f => fs.readFileSync(__dirname + '/ui/' + f, 'utf8');
const vyrizni = (zdroj, zacatek) => { const i = zdroj.indexOf(zacatek); return i < 0 ? '' : zdroj.slice(i, zdroj.indexOf('\n}\n', i) + 2); };
const den = posunDni => ZM.zamekDenPraha(Date.now() + posunDni * 86400000);
{
  /* 7a) tiskListaSkript předá datum do zamekPoTisku */
  const kod = vyrizni(UI('common.js'), 'function tiskListaSkript(');
  const gen = kod ? vm.runInNewContext(kod + '; tiskListaSkript', { dokumentZamyka: t => /^nabidka/.test(t), JSON }) : null;
  const tisk = zamek => {
    const volani = [], udalosti = {};
    const js = gen({}, zamek).replace(/^<script>/, '').replace(/<\/script>$/, '');
    const ctx = { document: { getElementById: () => null, querySelectorAll: () => [] }, Date, JSON,
      window: { addEventListener: (k, f) => { udalosti[k] = f; }, opener: { closed: false, zamekPoTisku: (...a) => { volani.push(a); } } } };
    ctx.window.document = ctx.document;
    vm.createContext(ctx); vm.runInContext(js, ctx);
    if (udalosti.beforeprint) udalosti.beforeprint();
    return volani[0] || null;
  };
  test('N1 skript náhledu je ve zdroji', typeof gen === 'function');
  if (gen) {
    let a = tisk({ typ: 'nabidkaTisk', varId: 'v1', datumNabidky: '2026-11-24' });
    test('N1 skript: datum náhledu jde do zamekPoTisku', !!a && a[0] === 'nabidkaTisk' && a[1] === 'v1' && a[3] && a[3].datumNabidky === '2026-11-24', a);
    a = tisk({ typ: 'nabidkaProjTisk', varId: 'v1', datumNabidky: '2026-11-24', zakaznik: 'z2' });
    test('N1 skript: se zákazníkem jde datum i adresát', !!a && a[3] && a[3].datumNabidky === '2026-11-24' && a[3].zakaznik === 'z2', a);
    a = tisk({ typ: 'nabidkaTisk', varId: 'v1' });
    test('N1 skript: bez data volání jako před DT (2 argumenty)', !!a && a.length === 2, a);
    a = tisk({ typ: 'nabidkaTisk', varId: 'v1', datumNabidky: 'nesmysl' });
    test('N1 skript: neplatné datum se nepředá', !!a && a.length === 2, a);
  }
}
{
  /* 7b) zamekPoTisku převezme datum z náhledu (jen při prvním zamčení, v mezi) */
  const kod = vyrizni(UI('zamek_ui.js'), 'function zamekPoTisku(');
  test('N1 zamekPoTisku je ve zdroji', !!kod);
  const spust = (v, navic) => {
    const ctx = Object.assign({}, ZM, {
      ZAK: { varianty: [v] }, aktivniVarianta: z => z.varianty[0], JEKLY, ZAMEK_SNIMEK_NEULOZENY: new Set(),
      zamekPrvniSmlouva: () => false, zamekOtiskZPorovnani: () => null, porovnaniData: () => null,
      zamekVysledekSpocti: () => null, zamekKdo: () => 'TEST', variantaCislo: () => '2026-OPR-CN-0745',
      zamekSlovnikTed: () => null, render: () => {}, zamekPoTiskuUloz: () => {},
      Date, JSON, Object, Array, Set, String });
    delete ctx.zamekSnimekSpocti; delete ctx.zamekZpracovatelSnimek;
    vm.createContext(ctx); vm.runInContext(kod, ctx);
    return ctx.zamekPoTisku('nabidkaTisk', v.id, null, navic);
  };
  if (kod) {
    const nova = () => zakazka().v;
    let v = nova(); spust(v, { datumNabidky: den(-1) });
    test('N1 zamekPoTisku: náhled ze včerejška → zámek nese včerejšek', v.zamek && v.zamek.datumNabidky === den(-1), v.zamek && v.zamek.datumNabidky);
    v = nova(); spust(v, null);
    test('N1 zamekPoTisku: bez data (Word) → dnešek v Praze', v.zamek && v.zamek.datumNabidky === den(0), v.zamek && v.zamek.datumNabidky);
    v = nova(); spust(v, { datumNabidky: den(-8) });
    test('N1 zamekPoTisku: náhled starší než 7 dní → dnešek', v.zamek && v.zamek.datumNabidky === den(0), v.zamek && v.zamek.datumNabidky);
    v = nova(); spust(v, { datumNabidky: '2026-02-30' });
    test('N1 zamekPoTisku: neplatné datum → dnešek', v.zamek && v.zamek.datumNabidky === den(0));
    v = nova(); spust(v, { datumNabidky: den(-1) }); spust(v, { datumNabidky: den(0) });
    test('N1 zamekPoTisku: dotisk datum nezmění', v.zamek.datumNabidky === den(-1) && v.zamek.tisky.length === 2, v.zamek.datumNabidky);
  }
}
{
  /* 7c) náhled OCK a PROJ vloží do skriptu den, který tiskne symbol DATUM */
  const vyraz = (zdroj, typ) => { const i = zdroj.indexOf("Object.assign({ typ: '" + typ + "'");
    const k = 'vzTiskZamekNavic(vt))'; const j = i < 0 ? -1 : zdroj.indexOf(k, i); return j < 0 ? '' : zdroj.slice(i, j + k.length); };
  const { zak, v } = zakazka();
  const pO = NO.nabidkaData(zak, v, JEKLY, 'cz', undefined, { ted: TISK }).placeholders;
  const pP = NP.nabidkaProjData(zak, v, 'cz', { ted: TISK }).placeholders;
  [['OCK', UI('zakazka_ui.js'), 'nabidkaTisk', pO], ['PROJ', UI('nabidka_proj_ui.js'), 'nabidkaProjTisk', pP]].forEach(([jm, zdroj, typ, p]) => {
    const e = vyraz(zdroj, typ);
    let z = null;
    try { z = e ? vm.runInNewContext('(' + e + ')', { Object, p, varianta: v, akt: v, vt: { zak, varianta: v },
      vzTiskZamekNavic: () => null, zamekDatumZeSymbolu: ZM.zamekDatumZeSymbolu, nabidkaDatum, nabidkaProjDatumIso: NP.nabidkaProjDatumIso }) : null; } catch (x) { z = { chyba: x.message }; }
    test('N1 náhled ' + jm + ': zámek skriptu nese den z DATUM dokumentu (24. 11.)', !!z && z.datumNabidky === '2026-11-24' && p.DATUM === '24.11.2026', [z, p.DATUM]);
  });
  test('N1 zamekDatumZeSymbolu: 24.11.2026 → 2026-11-24, nesmysl → prázdné', ZM.zamekDatumZeSymbolu('24.11.2026') === '2026-11-24'
    && ZM.zamekDatumZeSymbolu('31.02.2026') === '' && ZM.zamekDatumZeSymbolu('') === '' && ZM.zamekDatumZeSymbolu('2026-11-24') === '');
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
