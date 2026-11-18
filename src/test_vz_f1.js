/* ============================================================
 * VZ-F1 — opravy nálezů ruční zkoušky víc zákazníků na testu (18. 11. 2026,
 * protokol podklady/kola/STAV_TEST_VZ_2026-11-18.md).
 *
 *  N3 (#645) zástupci v krycím listu u otevřeného dalšího zákazníka: zápis
 *     pole „Zástupci a kontakty zákazníka" (bind ZAK.zastupci.*) i DIČ jde do
 *     jeho položky dalsiZakaznici[i] (vzKlCesta / vzCesta), ne do hlavičky
 *     řídícího. Kanárek: zástupce C zapsaný přes krycí list u otevřeného C
 *     se neobjeví v SoD, krycím listu ani plné moci A; v krycím listu C ano.
 *     Výměna řídícího: zástupci putují se svým zákazníkem.
 *  bod 2 (#649) vytištěný krycí list BO nese zástupce zákazníka, pro kterého
 *     se tiskne (i u jednoho zákazníka; Techdata technického zástupce).
 *  N1 (#646) přidání zákazníka se stejným IČO odmítnuto (klient i server);
 *     bez IČO se nehlídá.
 *  N2 (#647) výběr „Otevřená varianta" v hlavičce jen s variantami
 *     otevřeného zákazníka (vzVariantyHlavicka).
 *  N4 (#648) název souboru krycího listu vlastní varianty …9801.2-C (jako CN).
 *  bod 6 (#650) controlling po prodeji dalšímu zákazníkovi: číslo s písmenem.
 *
 * POJISTKA: na ec5bbac (před VZ-F1) selže — vzCesta('ZAK.zastupci.…') vrací
 * cestu řídícího (kanárek C v SoD A), krycí list BO má prázdné zástupce,
 * vzPridej se stejným IČO projde, vzVariantyHlavicka / vzKlCesta neexistují,
 * název KL je …9801-C, controlling nese číslo bez písmene.
 * Spuštění: node src/test_vz_f1.js
 * ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const vm = require('vm');

const CORE = ['build_info.js', 'nazvy_souboru.js', 'preklad.js', 'format.js', 'engine.js', 'vice_sachet.js', 'engine_proj.js', 'techspec.js',
  'zakazka.js', 'uloziste.js', 'retence_zaloh.js', 'zamek.js', 'vice_zakazniku.js', 'seznam.js', 'archiv.js', 'docxgen.js', 'xlsx.js', 'dokumenty.js',
  'sleva.js', 'schvalovani.js', 'zaokrouhleni.js', 'marze.js', 'kontroly.js', 'ares.js', 'poznamky.js', 'protokol.js', 'firma.js',
  'zpracovatel.js', 'podminky.js', 'plan_plateb.js', 'nabidka.js', 'nabidka_proj.js', 'sod.js', 'kryci.js', 'kryci_proj.js',
  'cenik.js', 'cenik_stari.js', 'cenik_rady.js', 'vyjimky.js', 'rucni_ceny.js', 'katalog.js', 'prepisy.js', 'slovnik.js',
  'konfigurace.js', 'sablony_online.js', 'sablona_obsah.js', 'analytika.js', 'nastaveni_db.js', 'program.js', 'ukazkove.js',
  'prava.js', 'zobrazeni.js', 'zakaznici.js', 'controlling.js', 'pd_nanecisto.js', 'objednane.js', 'standard_ock.js'];
CORE.forEach(f => { const m = require(path.join(__dirname, f)); if (m && typeof m === 'object') Object.assign(global, m); });
const ZC = require('./zkusebni_cenik.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const JEKLY = JSON.parse(fs.readFileSync(path.join(__dirname, 'jekly.json'), 'utf8'));

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + (info === undefined ? '' : '  ' + JSON.stringify(info).slice(0, 700))); } };
const J = o => JSON.parse(JSON.stringify(o));

/* ---------- zakázka (smyšlené firmy) ---------- */
const KAN = p => 'ZF' + p + 'KANAREKX';     // kanárek zástupce zákazníka p
function zast(p) {
  const o = {};
  VZ_ZASTUPCI_POLE.forEach(k => { o[k] = /Email$/.test(k) ? 'z' + p.toLowerCase() + k.toLowerCase() + '@priklad.cz' : 'Údaj ' + KAN(p) + ' ' + k; });
  return o;
}
const ICO = { A: '27182818', B: '16180339', C: '46692016' };
const PEVNE = { kdo: 'f1@priklad.cz', kdy: '2026-11-18T10:00:00.000Z' };
function zakazka(dalsi) {
  const zak = novaZakazka();
  Object.assign(zak, { objednatel: 'Alfa zkušební s.r.o.', adresaObjednatele: 'Zkušební 1, 110 00 Praha', ico: ICO.A, dic: 'CZ' + ICO.A,
    kontakt: 'Ivo Alfa', zastupci: zast('A') });
  zak.nazevAkce = 'Bytový dům Zkušební';
  zak.adresa = 'Stavební 12, 120 00 Praha';
  zak.cislo = '2026 - OPR - CN - 9801';
  zak.datum = '2026-11-18';
  const v1 = zak.varianty[0];
  v1.datum = '2026-11-18';
  Object.assign(v1.data.ock.zadani, { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 });
  v1.data.cenik.kurzEurKc = 25;
  v1.data.kryci = { hodnoty: { sodDphRezim: KRYCI_DPH_REZIMY[0] } };
  v1.data.kryciProj = { hodnoty: {} };
  if (dalsi) {
    const rB = vzPridej(zak, { objednatel: 'Beta zkušební a.s.', ico: ICO.B, kontakt: 'Eva Beta', zastupci: zast('B') }, PEVNE);
    /* C vlastní varianta, zástupce zatím prázdné — doplní je krycí list */
    const rC = vzPridej(zak, { objednatel: 'Gama zkušební s.r.o.', ico: ICO.C, kontakt: 'Jan Gama' }, Object.assign({ vlastni: true }, PEVNE));
    if (!rB.ok || !rC.ok) throw new Error('vzPridej: ' + (rB.chyba || rC.chyba));
  }
  return zak;
}
const varZak = (zak, id) => zak.varianty.find(v => v.id === vzZakaznik(zak, id).varianta);

/* ---------- obrazovka ve vm (vzor test_vz_ui.js) ---------- */
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const UI = ['vice_zakazniku.js', 'vz_poznamka.js', 'ares.js', 'zakaznici.js', 'ui/ares_ui.js', 'ui/zakaznici_ui.js', 'ui/vice_zakazniku_ui.js', 'ui/vz_tisk_ui.js'];
function obrazovka(zak, zap = true) {
  const ctx = vm.createContext({ console, JSON, Math, String, Set, Map, Array, Object, Date, Number, RegExp, Promise,
    esc, escJs: esc, setTimeout: () => 0, render: () => {}, hlaska: () => Promise.resolve(),
    viceZakaznikuZapnuto: () => zap, jeAdminOnline: () => false, zamekCteniJe: () => false, nahledAktivni: () => false,
    zamekStop: () => false, variantaUzamcena: v => !!(v && v.zamek && v.zamek.zamceno), variantaProdana: v => !!(v && v.prodano),
    protokolZapis: () => {}, prepniTab: () => {}, TAB: 'kalk', NAST: { uzivatel: 'tester' } });
  vm.runInContext(`
    var ZAK = null;
    function aktivniVarianta(z) { return z.varianty.find(v => String(v.id) === String(z.aktivni)) || z.varianty[0]; }
    function syncVarianta() {}
    function get(p) { return p.split('.').reduce((o, k) => o == null ? o : o[k], { ZAK }); }
    function set(p, v) { const c = p.split('.'); let o = { ZAK }; for (let i = 0; i < c.length - 1; i++) o = o[c[i]]; o[c[c.length - 1]] = v; }
  `, ctx);
  UI.forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx, { filename: f }));
  ctx.ZAK = J(zak);
  vm.runInContext('vzOtevrenyId()', ctx);
  return { run: k => { try { return vm.runInContext(k, ctx); } catch (e) { return 'CHYBA ' + e.message; } }, ctx };
}
/* Zápis pole krycího listu tak, jak ho dělá kryci_ui.js / kryci_proj_ui.js:
 * set(vzKlCesta(p.bind), hodnota). Bez vzKlCesta (kód před VZ-F1) set(p.bind). */
const klZapis = (o, bind, hodnota) => o.run(`(function(){ const b = typeof vzKlCesta === 'function' ? vzKlCesta(${JSON.stringify(bind)}) : ${JSON.stringify(bind)}; set(b, ${JSON.stringify(hodnota)}); return b; })()`);

/* ---------- dokumenty zákazníka (bez Wordu: data generátorů) ---------- */
function textDokumentu(zak, id) {
  const p = vzPohled(zak, id);
  const v = vzTiskVarianta(p, varZak(zak, id));
  const sod = sodObjednatelDoplna({}, p);
  const klBo = kryciData(p, v, JEKLY, 'bo');
  const klTech = kryciData(p, v, JEKLY, 'techdata');
  const pm = kryciProjSodSymboly(p, v, {});
  return { sod: JSON.stringify(sod), kl: JSON.stringify(klBo) + JSON.stringify(klTech), pm: JSON.stringify(pm), klBo };
}

/* ================= N3: zástupci u otevřeného dalšího zákazníka ================= */
{
  const zak = zakazka(true);
  const o = obrazovka(zak);
  const iC = zak.dalsiZakaznici.findIndex(d => d.id === 'z3');
  o.run("vzOtevri('z3')");
  test('N3: otevřený C — vzCesta zástupce míří do jeho položky',
    o.run("vzCesta('ZAK.zastupci.smluvniJmeno')") === 'ZAK.dalsiZakaznici.' + iC + '.zastupci.smluvniJmeno', o.run("vzCesta('ZAK.zastupci.smluvniJmeno')"));
  const cesty = VZ_ZASTUPCI_POLE.map(k => klZapis(o, 'ZAK.zastupci.' + k, /Email$/.test(k) ? 'c' + k.toLowerCase() + '@priklad.cz' : 'Údaj ' + KAN('C') + ' ' + k));
  const dicC = klZapis(o, 'ZAK.dic', 'CZ' + ICO.C);
  test('N3: zápis všech 15 polí zástupců z krycího listu jde do dalsiZakaznici[C]',
    cesty.every(c => c.indexOf('ZAK.dalsiZakaznici.' + iC + '.zastupci.') === 0), cesty);
  test('N3: zápis DIČ z krycího listu jde do hlavičky C', dicC === 'ZAK.dalsiZakaznici.' + iC + '.hlavicka.dic', dicC);
  test('N3: název akce a číslo krycího listu dál do hlavičky zakázky (sdílené)',
    o.run("vzKlCesta('ZAK.nazevAkce') === 'ZAK.nazevAkce' && vzKlCesta('ZAK.cislo') === 'ZAK.cislo' && vzKlCesta('ZAK.projHlavicka.adresa') === 'ZAK.projHlavicka.adresa'"));
  test('N3: neznámé pole zástupců se neodklání', o.run("vzCesta('ZAK.zastupci.neznamePole')") === 'ZAK.zastupci.neznamePole');
  const po = J(o.ctx.ZAK);
  test('N3: hlavička řídícího A nese dál své zástupce (žádný kanárek C)', JSON.stringify(po.zastupci).indexOf(KAN('C')) < 0
    && po.zastupci.smluvniJmeno === zast('A').smluvniJmeno, po.zastupci);
  const A = textDokumentu(po, 'z1'), C = textDokumentu(po, 'z3');
  test('N3 kanárek: zástupce C není ve smlouvě o dílo A', A.sod.indexOf(KAN('C')) < 0 && A.sod.indexOf(KAN('A')) >= 0, A.sod.slice(0, 300));
  test('N3 kanárek: zástupce C není v krycím listu A (BO ani Techdata)', A.kl.indexOf(KAN('C')) < 0);
  test('N3 kanárek: zástupce C není v plné moci A (zmocnitel)', A.pm.indexOf(KAN('C')) < 0 && A.pm.indexOf(KAN('A')) >= 0, A.pm);
  test('N3: krycí list a SoD C nesou zástupce C, ne A', C.kl.indexOf(KAN('C')) >= 0 && C.sod.indexOf(KAN('C')) >= 0
    && C.kl.indexOf(KAN('A')) < 0 && C.sod.indexOf(KAN('A')) < 0);
  /* B (sdílená varianta) — zástupci B nedotčeni */
  test('N3: zástupci B beze změny', JSON.stringify(vzZakaznik(po, 'z2').zastupci) === JSON.stringify(zast('B')));
  /* řídící otevřený: cesta beze změny */
  o.run("vzOtevri('z1')");
  test('N3: otevřený řídící — vzKlCesta i vzCesta beze změny',
    o.run("vzKlCesta('ZAK.zastupci.banka') === 'ZAK.zastupci.banka' && vzCesta('ZAK.zastupci.banka') === 'ZAK.zastupci.banka' && vzKlCesta('ZAK.dic') === 'ZAK.dic'"));
  /* výměna řídícího: zástupci putují se zákazníkem */
  const vym = J(po);
  const r = vzVymenRidiciho(vym, 'z3');
  test('N3 výměna řídícího (C): hlavička nese zástupce C, položka A zástupce A',
    r.ok && vym.zastupci.smluvniJmeno.indexOf(KAN('C')) >= 0 && vzZakaznik(vym, 'z1').zastupci.smluvniJmeno.indexOf(KAN('A')) >= 0, r);
  const A2 = textDokumentu(vym, 'z1');
  test('N3 výměna řídícího: SoD i krycí list A (teď další zákazník) bez zástupce C',
    A2.sod.indexOf(KAN('C')) < 0 && A2.kl.indexOf(KAN('C')) < 0 && A2.sod.indexOf(KAN('A')) >= 0);
  /* VYP: vše jako dřív */
  const ov = obrazovka(zak, false);
  test('N3 VYP: vzKlCesta a vzCesta zástupců beze změny',
    ov.run("vzKlCesta('ZAK.zastupci.smluvniJmeno') === 'ZAK.zastupci.smluvniJmeno' && vzCesta('ZAK.zastupci.smluvniJmeno') === 'ZAK.zastupci.smluvniJmeno'"));
  const o1 = obrazovka(zakazka(false));
  test('N3 jeden zákazník: vzKlCesta beze změny', o1.run("vzKlCesta('ZAK.zastupci.smluvniJmeno') === 'ZAK.zastupci.smluvniJmeno' && vzKlCesta('ZAK.dic') === 'ZAK.dic'"));
  /* krycí listy na obrazovce opravdu zapisují přes vzKlCesta */
  ['ui/kryci_ui.js', 'ui/kryci_proj_ui.js'].forEach(f => {
    const s = fs.readFileSync(path.join(__dirname, f), 'utf8');
    test('N3: ' + f + ' — provázané pole čte i zapisuje přes vzKlCesta(p.bind)',
      /vzKlCesta\(p\.bind\)/.test(s) && !/set\('\$\{escJs\(p\.bind\)\}'/.test(s) && !/get\(p\.bind\)/.test(s));
  });
}

/* ================= bod 2: krycí list BO tiskne zástupce ================= */
{
  const zak = zakazka(false);
  const v = zak.varianty[0];
  const bo = kryciData(zak, v, JEKLY, 'bo');
  const sek = bo.sekce.find(s => s.sekce === 'Zástupci a kontakty zákazníka');
  test('bod 2 (jeden zákazník): KL BO — sekce Zástupci má všech 12 řádků vyplněných',
    sek && sek.radky.length === 12 && sek.radky.every(r => String(r[1]).trim()), sek);
  test('bod 2: KL BO — smluvní zástupce A v tisku', sek && sek.radky[0][1] === zast('A').smluvniJmeno);
  const zakSek = bo.sekce.find(s => s.sekce === 'Zákazník (smluvní partner)');
  test('bod 2: KL BO — banka, účet a zápis v rejstříku v tisku',
    ['banka', 'ucet', 'zapis'].every(k => zakSek.radky.some(r => r[1] === zast('A')[k])), zakSek);
  const tech = kryciData(zak, v, JEKLY, 'techdata');
  const sekT = tech.sekce.find(s => s.sekce === 'Zástupci a kontakty zákazníka');
  test('bod 2: KL Techdata — technický zástupce v tisku', sekT && sekT.radky.length === 3 && sekT.radky[0][1] === zast('A').technickyJmeno, sekT);
  const pbo = kryciProjData(zak, v, JEKLY, 'bo');
  const sekP = pbo.sekce.find(s => s.sekce === 'Zástupci a kontakty zákazníka');
  test('bod 2: KL PROJ BO — zástupci v tisku', sekP && sekP.radky.every(r => String(r[1]).trim()), sekP);
  /* víc zákazníků: tiskne se pro zákazníka pohledu */
  const z3 = zakazka(true);
  const pB = vzPohled(z3, 'z2');
  const boB = kryciData(pB, vzTiskVarianta(pB, varZak(z3, 'z2')), JEKLY, 'bo');
  const sB = JSON.stringify(boB.sekce);
  test('bod 2 (víc zákazníků): KL BO pro B nese zástupce B, ne A', sB.indexOf(KAN('B')) >= 0 && sB.indexOf(KAN('A')) < 0);
  /* prázdní zástupci → prázdné řádky (nic se nevymýšlí) */
  const zp = zakazka(false); zp.zastupci = vzZastupciPrazdni();
  const sp = kryciData(zp, zp.varianty[0], JEKLY, 'bo').sekce.find(s => s.sekce === 'Zástupci a kontakty zákazníka');
  test('bod 2: prázdní zástupci → prázdné řádky', sp && sp.radky.every(r => r[1] === ''));
}

/* ================= N1: stejné IČO ================= */
{
  const zak = zakazka(true);
  const pred = JSON.stringify(zak);
  const r = vzPridej(zak, { objednatel: 'Delta zkušební s.r.o.', ico: ICO.B }, PEVNE);
  test('N1: přidání zákazníka se IČO, které už v zakázce je (B), odmítnuto s hláškou',
    !r.ok && r.chyba === 'Zákazník s tímto IČO už v zakázce je (Beta zkušební a.s.).' && JSON.stringify(zak) === pred, r);
  const r2 = vzPridej(zak, { objednatel: 'Delta zkušební s.r.o.', ico: ' 271 828 18 ' }, PEVNE);
  test('N1: IČO řídícího s mezerami taky odmítnuto', !r2.ok && /Alfa zkušební/.test(r2.chyba), r2);
  const r3 = vzPridej(zak, { objednatel: 'Delta zkušební s.r.o.', ico: '' }, PEVNE);
  const r4 = vzPridej(zak, { objednatel: 'Epsilon zkušební s.r.o.', ico: '' }, PEVNE);
  test('N1: zákazníci bez IČO se nehlídají (dva bez IČO projdou)', r3.ok && r4.ok, [r3, r4]);
  const r5 = vzPridej(zakazka(true), { objednatel: 'Zeta zkušební s.r.o.', ico: '12345679' }, PEVNE);
  test('N1: jiné IČO projde', r5.ok, r5);
  /* server */
  const stara = zakazka(true);
  const nova = J(stara);
  nova.dalsiZakaznici.push({ id: 'z4', pismeno: 'D', hlavicka: { objednatel: 'Delta zkušební s.r.o.', adresaObjednatele: '', ico: ICO.C, dic: '', kontakt: '' },
    zastupci: vzZastupciPrazdni(), varianta: nova.dalsiZakaznici[0].varianta, zalozen: { kdo: 'x', kdy: 'y' } });
  const s1 = vzServerZakaznici(stara, nova, { email: 'f1@priklad.cz', role: 'Obchodník' }, {});
  test('N1 server: nový zákazník se IČO, které v zakázce je → 400', s1 && s1.status === 400 && /tímto IČO už v zakázce je \(Gama/.test(s1.chyba), s1);
  const nova2 = J(stara);
  nova2.dalsiZakaznici.push({ id: 'z4', pismeno: 'D', hlavicka: { objednatel: 'Delta zkušební s.r.o.', adresaObjednatele: '', ico: '', dic: '', kontakt: '' },
    zastupci: vzZastupciPrazdni(), varianta: nova2.dalsiZakaznici[0].varianta, zalozen: { kdo: 'x', kdy: 'y' } });
  test('N1 server: nový zákazník bez IČO projde', vzServerZakaznici(stara, nova2, { email: 'f1@priklad.cz', role: 'Obchodník' }, {}) === null);
  const dup = J(stara); dup.dalsiZakaznici[0].hlavicka.ico = ICO.A;   // starší data s duplicitou
  test('N1 server: uložená data s duplicitou ukládání neblokují (hlídá se jen přidání)',
    vzServerZakaznici(dup, J(dup), { email: 'f1@priklad.cz', role: 'Obchodník' }, {}) === null);
  test('N1 server: obnova se nehlídá', vzServerZakaznici(stara, nova, { email: 'f1@priklad.cz', role: 'Administrátor' }, { obnova: true }) === null);
  /* server přes zakazka_kontrola.mjs (vzServerKontrola) — v netlify/test_vz_server.mjs; tady jádro. */
}

/* ================= N2: výběr otevřené varianty ================= */
{
  const zak = zakazka(true);
  const o = obrazovka(zak);
  const vC = varZak(zak, 'z3').id, v1 = zak.varianty[0].id;
  o.run("vzOtevri('z1')");
  const proA = [].concat(o.run('vzVariantyHlavicka().map(v => v.id)'));
  test('N2: otevřený A — výběr bez vlastní varianty C', proA.indexOf(vC) < 0 && proA.indexOf(v1) >= 0, proA);
  o.run("vzOtevri('z3')");
  const proC = [].concat(o.run('vzVariantyHlavicka().map(v => v.id)'));
  test('N2: otevřený C — jen jeho varianta', proC.length === 1 && proC[0] === vC, proC);
  o.run("vzOtevri('z2')");
  const proB = [].concat(o.run('vzVariantyHlavicka().map(v => v.id)'));
  test('N2: otevřený B (sdílí řídící) — jen sdílená varianta', proB.length === 1 && proB[0] === v1, proB);
  const ov = obrazovka(zak, false);
  test('N2 VYP: všechny varianty (null)', ov.run('vzVariantyHlavicka()') === null);
  test('N2 jeden zákazník: všechny varianty (null)', obrazovka(zakazka(false)).run('vzVariantyHlavicka()') === null);
  const s = fs.readFileSync(path.join(__dirname, 'ui/common.js'), 'utf8');
  test('N2: hlavička (common.js) bere varianty z vzVariantyHlavicka', /vzVariantyHlavicka\(\)\) \|\| ZAK\.varianty\)\.map/.test(s));
}

/* ================= N4: název souboru KL vlastní varianty ================= */
{
  const zak = zakazka(true);
  const pC = vzPohled(zak, 'z3');
  const vC = vzTiskVarianta(pC, varZak(zak, 'z3'));
  const kl = kryciData(pC, vC, JEKLY, 'bo');
  const cn = nabidkaData(pC, vC, JEKLY);
  test('N4: krycí list vlastní varianty C nese číslo …9801.2-C', /9801\.2-C-OCK-BACKOFFICE/.test(kl.nazevSouboru), kl.nazevSouboru);
  test('N4: číslo v názvu krycího listu = číslo CN', kl.nazevSouboru.indexOf(String(cn.placeholders.CISLO_NABIDKY).replace(/\s+/g, '-').replace(/-{2,}/g, '-')) >= 0
    || kl.nazevSouboru.indexOf(nazevCast(cn.placeholders.CISLO_NABIDKY)) >= 0, [kl.nazevSouboru, cn.placeholders.CISLO_NABIDKY]);
  const pB = vzPohled(zak, 'z2');
  test('N4: B (sdílená řídící) dál …9801-B', /9801-B-OCK/.test(kryciData(pB, vzTiskVarianta(pB, varZak(zak, 'z2')), JEKLY, 'bo').nazevSouboru));
  const z1 = zakazka(false);
  const k2 = klonujVariantu(z1, z1.varianty[0].id, { aktivovat: false });
  test('N4 jeden zákazník: název KL beze změny (bez přípony varianty, jako dřív)',
    /^KRYCI-LIST_2026-OPR-CN-9801-OCK-BACKOFFICE/.test(kryciData(z1, k2, JEKLY, 'bo').nazevSouboru), kryciData(z1, k2, JEKLY, 'bo').nazevSouboru);
}

/* ================= bod 6: controlling po prodeji dalšímu zákazníkovi ================= */
{
  const zo = zakazka(true);
  const tisk = (id, v) => zamkniVariantu(v, { typ: 'nabidkaTisk', kdo: PEVNE.kdo, kdy: PEVNE.kdy, cislo: variantaCislo(zo, v),
    vysledek: variantaUzamcena(v) ? undefined : zamekVysledekSpocti(v, JEKLY, 'vz-f1'), snimek: variantaUzamcena(v) ? undefined : zamekSnimekSpocti(v),
    zakaznik: vzRazitkoSnimek(zo, id, v) });
  tisk('z1', varZak(zo, 'z1')); tisk('z2', varZak(zo, 'z2')); tisk('z3', varZak(zo, 'z3'));
  const pred = ctrlExportVarianty(zo, varZak(zo, 'z1'), { jekly: JEKLY, kdo: 'x', kdy: PEVNE.kdy, build: 'test' });
  test('bod 6: před prodejem řádek řídícího A bez písmene', pred.ok && /9801$/.test(pred.strany[0].cislo), pred.ok ? pred.strany : pred.chyba);
  const r = vzProdej(zo, 'z2', '2026-11-18', { kdo: PEVNE.kdo, role: 'Administrátor', ted: PEVNE.kdy, kdy: PEVNE.kdy });
  test('bod 6: prodej B (sdílená varianta) — B je řídící', r.ok && vzRidiciId(zo) === 'z2', r);
  const e = ctrlExportVarianty(zo, varZak(zo, 'z2'), { jekly: JEKLY, kdo: 'x', kdy: PEVNE.kdy, build: 'test' });
  test('bod 6: řádek prodeje dalšímu zákazníkovi B nese …9801-B', e.ok && /9801-B$/.test(e.strany[0].cislo) && /Beta/.test(e.hlavicka.zakaznik),
    e.ok ? [e.strany, e.hlavicka.zakaznik] : e.chyba);
  test('bod 6: ctrlCisloZakaznika u jednoho zákazníka beze změny', typeof ctrlCisloZakaznika === 'function' && ctrlCisloZakaznika(zakazka(false), '2026 - OPR - CN - 9801') === '2026 - OPR - CN - 9801');
  /* vlastní varianta C */
  const zc = zakazka(true);
  tisk.call(null, 'z1', varZak(zc, 'z1'));
  const vC = varZak(zc, 'z3');
  zamkniVariantu(vC, { typ: 'nabidkaTisk', kdo: PEVNE.kdo, kdy: PEVNE.kdy, cislo: variantaCislo(zc, vC),
    vysledek: zamekVysledekSpocti(vC, JEKLY, 'vz-f1'), snimek: zamekSnimekSpocti(vC), zakaznik: vzRazitkoSnimek(zc, 'z3', vC) });
  const rc = vzProdej(zc, 'z3', '2026-11-18', { kdo: PEVNE.kdo, role: 'Administrátor', ted: PEVNE.kdy, kdy: PEVNE.kdy });
  const ec = rc.ok ? ctrlExportVarianty(zc, vC, { jekly: JEKLY, kdo: 'x', kdy: PEVNE.kdy, build: 'test' }) : { ok: false, chyba: rc.chyba };
  test('bod 6: prodej vlastní varianty C → …9801.2-C', ec.ok && /9801\.2-C$/.test(ec.strany[0].cislo), ec.ok ? ec.strany : ec.chyba);
}

/* ================= bod 7: příručka ================= */
{
  const m = fs.readFileSync(path.join(__dirname, '..', 'manual', 'obsah.json'), 'utf8');
  test('bod 7: příručka — plná moc u víc zákazníků jen pro řídícího', /\*\*Plná moc\*\* se u víc zákazníků tiskne jen pro řídícího zákazníka\./.test(m));
}

console.log('\n' + (fail ? 'NEPROŠLO' : 'VŠE OK') + ' — ' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
