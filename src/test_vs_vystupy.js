/* VS #570 / E5 (#595) — VÝSTUPY ZA ZAKÁZKU S VÍC ŠACHTAMI, 10. 11. 2026.
 *
 *  A) krycí list (R9, R19): sekce „Šachty v nabídce" za Základními údaji
 *     (varianta šachty / ks / cena bez DPH, řádek celkem), ceny sedí na
 *     korunu na základ před slevou (R7), „vč. můstků", hodnota = cena
 *     nabídky ze součtu, můstky po šachtách (kryciMustkyText), hodiny
 *     součtem, příplatky s výčtem šachet, ATYP kterékoli šachty; Word i tisk;
 *  B) smlouva o dílo: cena = nabídka (součet), {{SACHTY_SOD_PREDMET}}
 *     a {{SACHTY_SOD_ROZPIS}} jen u víc šachet;
 *  C) controlling (R5): listy beze změny tvaru, řádky = šachta A + 2 × B,
 *     v Popisu počet variant a šachet celkem;
 *  D) Pipedrive náhled (R6): hodnota = cena celé nabídky, seznam šachet
 *     do poznámky, ATYP;
 *  E) objednané příplatky: příplatek = jedna volba za šachty, které ho
 *     nabízejí (výběr po šachtách, R13), cena Σ ks × šachta; prodPdZapis;
 *  F) jedna šachta (bez dalsi, ks 1) = výstupy beze změny (doplňuje zlatou sadu).
 * Pojistka: na 079cfc6 sada padá (vsVystup, kryciSachtySekce, sodSachtySymboly
 * neexistují; krycí list nemá tabulku šachet) — viz zpráva commitu.
 * Spuštění: node src/test_vs_vystupy.js */
'use strict';
const path = require('path');
const fs = require('fs');
const CORE = ['build_info.js', 'nazvy_souboru.js', 'preklad.js', 'format.js', 'engine.js', 'vice_sachet.js', 'engine_proj.js', 'techspec.js',
  'zakazka.js', 'uloziste.js', 'retence_zaloh.js', 'zamek.js', 'seznam.js', 'archiv.js', 'docxgen.js', 'xlsx.js', 'dokumenty.js',
  'sleva.js', 'schvalovani.js', 'zaokrouhleni.js', 'marze.js', 'kontroly.js', 'ares.js', 'poznamky.js', 'protokol.js', 'firma.js',
  'zpracovatel.js', 'podminky.js', 'plan_plateb.js', 'nabidka.js', 'nabidka_proj.js', 'sod.js', 'kryci.js', 'kryci_proj.js',
  'cenik.js', 'cenik_stari.js', 'cenik_rady.js', 'vyjimky.js', 'rucni_ceny.js', 'katalog.js', 'prepisy.js', 'slovnik.js',
  'konfigurace.js', 'sablony_online.js', 'sablona_obsah.js', 'analytika.js', 'nastaveni_db.js', 'program.js', 'ukazkove.js',
  'prava.js', 'zobrazeni.js', 'zakaznici.js', 'controlling.js', 'pd_nanecisto.js', 'objednane.js', 'standard_ock.js'];
CORE.forEach(f => { const m = require(path.join(__dirname, f)); if (m && typeof m === 'object') Object.assign(global, m); });
const ZC = require('./zkusebni_cenik.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const J = JSON.parse(fs.readFileSync(path.join(__dirname, 'jekly.json'), 'utf8'));

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 400)); } };
const kop = x => JSON.parse(JSON.stringify(x));
const kc = t => +String(t).replace(/[^\d,-]/g, '').replace(',', '.');

const SKLADBA = { mustekRamBmKc: 10000, mustekPodlahaPlechM2Kc: 1000, mustekPodlahaPororostM2Kc: 1100, mustekPodlahaVanaM2Kc: 1200,
  mustekZabradliKovBmKc: 2000, mustekZabradliSkloBmKc: 5000, mustekKotveniDeskaKc: 3000, mustekKotveniSloupKc: 3100,
  mustekKotveniKonzolaKc: 3200, mustekZabradliSkloMontazHodBm: 1 };
const ZAD = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 };
const MUSTEK = { ks: 2, sirkaMm: 1600, delkaMm: 1200, podlaha: 'plech', zabradli: 'kov', zabradliStrany: 2, sloupyKs: 0, sloupVyskaM: 0 };

function zadani(u) { return Object.assign(kop(DEFAULT_ZADANI), ZAD, u || {}); }
/* Zakázka: Výtah A (exteriér, můstky) + Výtah B (interiér, ATYP, 2 ks). */
function zakazka(vs, uprava) {
  const zak = novaZakazka();
  zak.cislo = '2026-OPR-CN-9595'; zak.nazevAkce = 'VS E5 výstupy'; zak.objednatel = 'Zkušební zákazník s.r.o.';
  const v = zak.varianty[0];
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky(), SKLADBA, { kurzEurKc: 25 });
  v.data.ock.fixes = true;
  v.data.ock.zadani = zadani({ typSachty: 'exteriérová', mustky: [kop(MUSTEK)], priplatkyVynechat: ['vsgFolie', 'skn', 'madlaBoky'] });
  if (vs) {
    v.data.ock.nazev = 'Výtah A';
    v.data.ock.dalsi = [{ id: 's_b', nazev: 'Výtah B', ks: 2,
      zadani: zadani({ typSachty: 'interiérová', zdvih: 17.325, sirka: 2.4, atyp: true, profily: kop(PROFILY_VYCHOZI['interiérová']),
        priplatkyVynechat: ['vsgFolie', 'skn'] }) }];
  }
  if (uprava) uprava(zak, v);
  return { zak, v };
}
const sekce = (d, jm) => (d.sekce || []).find(s => s.sekce === jm);

/* ---------- A) krycí list ---------- */
{
  const { zak, v } = zakazka(true);
  const r = vypocetZ(v, J);
  test('A předpoklad: obal dal sachty[] (2 varianty)', Array.isArray(r.sachty) && r.sachty.length === 2, r.sachty && r.sachty.length);
  const vo = vsVystup(r);
  test('A vsVystup: 2 varianty, celkem 3 ks, text R19', vo && vo.variant === 2 && vo.celkem === 3 && vo.text === '2 varianty šachet, celkem 3 ks', vo && vo.text);
  test('A vsVystup: Σ cen šachet = základ před slevou (R7)', vo.sachty.reduce((a, s) => a + s.cena, 0) === r.souhrn.zakladCena);
  test('A vsVystup: můstky jen Výtah A', vo.sachty[0].mustky === true && vo.sachty[1].mustky === false);
  ['bo', 'techdata'].forEach(verze => {
    const d = kryciData(zak, v, J, verze);
    const i = d.sekce.findIndex(s => s.sekce === 'Šachty v nabídce');
    test('A ' + verze + ': sekce Šachty v nabídce hned za Základními údaji', i > 0 && d.sekce[i - 1].sekce === 'Základní údaje', d.sekce.map(s => s.sekce));
    const s = d.sekce[i] || { radky: [], sloupce: [] };
    test('A ' + verze + ': tři sloupce (varianta / počet / cena)', JSON.stringify(s.sloupce) === '["Varianta šachty","Počet","Cena bez DPH"]', s.sloupce);
    test('A ' + verze + ': řádky Výtah A vč. můstků, Výtah B, celkem', s.radky.length === 3 && s.radky[0][0] === 'Výtah A, vč. můstků'
      && s.radky[1][0] === 'Výtah B' && s.radky[1][1] === '2 ks' && /2 varianty šachet, šachet celkem/.test(s.radky[2][0]) && s.radky[2][1] === '3 ks', s.radky);
    test('A ' + verze + ': ceny řádků dávají celkem na korunu', kc(s.radky[0][2]) + kc(s.radky[1][2]) === kc(s.radky[2][2])
      && kc(s.radky[2][2]) === r.souhrn.zakladCena, s.radky);
  });
  const c = kryciCtx(zak, v, J);
  const cn = cenaNabidkyOck(r, v.data.sleva || {}, v.data.zaokr);
  test('A hodnota zakázky = cena nabídky ze součtu', c.hodnota === kryciKc(cn.cena), [c.hodnota, cn.cena]);
  test('A ATYP zakázky = ATYP kterékoli šachty (B)', c.atyp === true && !v.data.ock.zadani.atyp);
  test('A můstky po šachtách: Výtah A s textem z jeho výsledku, Výtah B bez můstků není',
    c.mustky === 'Výtah A: ' + kryciMustkyText(r.sachty[0].vysl) && !/Výtah B/.test(c.mustky) && c.mustky.length > 12, c.mustky);
  test('A příplatky v nabídce vyjmenují šachty (madla na bocích jen B — u A vynechaná; ventilátor jen exteriér A)',
    /MADLA NA BOČNÍCH STĚNÁCH \(dřevo, lak\) \(Výtah B\)/.test(c.priplatky) && /VENTILÁTOR \(EXT\) \(Výtah A\)/.test(c.priplatky)
    && /MADLA NA ZADNÍ STĚNĚ \(dřevo, lak\) \(Výtah A, Výtah B\)/.test(c.priplatky), c.priplatky);
  /* hodiny součtem (R9): montáž = round(Σ ks × hodiny šachty) */
  const h = kryciHodiny(zak, v, J, 'ock');
  const m = h && h.radky.find(x => x[0] === 'montáž na stavbě');
  const ocek = Math.round(r.sachty[0].vysl.montaz.hodCelkem + 2 * r.sachty[1].vysl.montaz.hodCelkem);
  test('A hodiny krycího listu: montáž = šachta A + 2 × B', m && kc(m[1].split(' h')[0]) === ocek, [m, ocek]);
  /* Word a tisk: tabulka šachet v dokumentu */
  const d = kryciData(zak, v, J, 'bo');
  const xml = docxTeloZeSekci(d.nadpis, kryciVystupSekce(zak, d.sekce));
  test('A Word krycího listu nese tabulku šachet', xml.indexOf('Šachty v nabídce') > 0 && xml.indexOf('Výtah B') > 0 && xml.indexOf('Varianta šachty') > 0);
  /* dvě varianty šachet v jiném pořadí ks → text „1 varianta" u jedné varianty s ks 3 */
  const { zak: z1, v: v1 } = zakazka(false, (z, vv) => { vv.data.ock.ks = 3; });
  const d1 = kryciData(z1, v1, J, 'bo');
  const s1 = sekce(d1, 'Šachty v nabídce');
  test('A jedna varianta × 3 ks (R20): tabulka „1 varianta šachty, šachet celkem 3 ks"', s1 && s1.radky.length === 2 && s1.radky[0][0] === 'Šachta 1, vč. můstků'
    && /1 varianta šachty/.test(s1.radky[1][0]) && s1.radky[1][1] === '3 ks', s1 && s1.radky);
}

/* ---------- B) smlouva o dílo ---------- */
{
  const { zak, v } = zakazka(true);
  const sod = sodData(zak, v, J, 'cz');
  const nab = nabidkaData(zak, v, J, 'cz');
  const ph = sod.placeholders;
  test('B SoD: cena díla = cena nabídky (součet šachet)', ph.CENA_BEZ_DPH === nab.placeholders.CENA_BEZ_DPH, [ph.CENA_BEZ_DPH, nab.placeholders.CENA_BEZ_DPH]);
  test('B SoD: předmět vyjmenuje varianty a ks', ph.SACHTY_SOD_PREDMET === '2 varianty šachet, celkem 3 ks (Výtah A 1 ks, Výtah B 2 ks)', ph.SACHTY_SOD_PREDMET);
  const rz = String(ph.SACHTY_SOD_ROZPIS || '').split('\n');
  const r = vypocetZ(v, J);
  test('B SoD: rozpis řádek na variantu s cenou z rozpočtu (R7)', rz.length === 2 && /^Výtah A, vč\. můstků – 1 ks – /.test(rz[0])
    && /^Výtah B – 2 ks – /.test(rz[1]) && kc(rz[0].split(' – ')[2]) + kc(rz[1].split(' – ')[2]) === r.souhrn.zakladCena, rz);
  const { zak: z1, v: v1 } = zakazka(false);
  const ph1 = sodData(z1, v1, J, 'cz').placeholders;
  test('B SoD jedné šachty: žádný symbol SACHTY_*', !Object.keys(ph1).some(k => /^SACHTY_/.test(k)));
}

/* ---------- C) controlling (R5) ---------- */
function zamkni(zak, v) {
  const z = kop(zak);
  const vv = z.varianty.find(x => x.id === v.id);
  z.varianty.forEach(x => { x.ridici = x.id === vv.id; });
  const vys = zamekVysledekSpocti(vv, J, 'test');
  vv.zamek = { zamceno: true, kdy: '2026-11-10T10:00:00.000Z', kdo: 'test@priklad.cz', cislo: z.cislo, vysledek: JSON.parse(JSON.stringify(vys)) };
  return { z, vv };
}
{
  const { zak, v } = zakazka(true);
  const { z, vv } = zamkni(zak, v);
  const exp = ctrlExportVarianty(z, vv, { jekly: J, kdo: 't', kdy: '2026-11-10T10:00:00Z', build: 'test' });
  test('C export prošel, hlavička nese šachty', exp.ok && exp.hlavicka.sachty === '2 varianty šachet, celkem 3 ks (Výtah A 1 ks, Výtah B 2 ks)', exp.hlavicka && exp.hlavicka.sachty);
  /* šachta A a šachta B zvlášť (každá jako jedna šachta) */
  const naklad = (zz, vx) => { const e = ctrlExportVarianty(zz, vx, { jekly: J }); return e.radky.filter(x => x.vZakladu).reduce((a, x) => a + x.naklad, 0); };
  const { zak: zA, v: vA } = zakazka(false);
  vA.data.ock.zadani = kop(v.data.ock.zadani);
  const A = zamkni(zA, vA);
  const { zak: zB, v: vB } = zakazka(false);
  vB.data.ock.zadani = kop(v.data.ock.dalsi[0].zadani);
  const B = zamkni(zB, vB);
  const sVS = naklad(z, vv), sA = naklad(A.z, A.vv), sB = naklad(B.z, B.vv);
  test('C řádky controllingu = šachta A + 2 × šachta B (náklad, R5)', Math.abs(sVS - (sA + 2 * sB)) < 0.01, [sVS, sA, sB]);
  test('C náklad řádků = náklad základu součtu', Math.abs(sVS - exp.strany[0].naklad) < 0.01, [sVS, exp.strany[0].naklad]);
  const listy = ctrlExportListy(exp);
  test('C listy beze změny (Řádky, Příplatky – volby, Kapitoly, Popis), sloupce Řádků stejné',
    listy.map(l => l.nazev).join('|') === 'Řádky|Příplatky – volby|Kapitoly|Popis' && listy[0].rows[0].length === CTRL_RADKY_HLAVICKA.length);
  const popis = listy[3].rows.find(x => x[0] === 'Šachty v nabídce (OCK)');
  test('C Popis: počet variant a šachet celkem', popis && /2 varianty šachet, celkem 3 ks/.test(popis[1]), popis);
  /* souhrn Kapitol: cena před slevou − sleva + zaokrouhlení = cena nabídky (kontrola K37-N3 i u součtu) */
  const souhrn = listy[2].rows.find(x => x[1] === 'OCK' && x[0] === exp.strany[0].cislo && x.length === 10);
  test('C souhrn Kapitol sedí (před slevou − sleva + zaokrouhlení = cena)', souhrn && Math.abs(souhrn[3] - souhrn[5] + souhrn[6] - souhrn[7]) < 0.02, souhrn);
  const hr = ctrlExportListy([exp, exp], null, { hromadny: { od: '2026-11-01', do: '2026-11-30', oblast: 'obe', rada: 'obe', pd: 'vse' } });
  const pp = hr[3].rows.find(x => x[0] === 'Zakázky v exportu');
  test('C hromadný: sloupec Šachty v nabídce jen když ho některá zakázka má', pp && pp[pp.length - 1] === 'Šachty v nabídce (OCK)', pp);
  const { zak: z1, v: v1 } = zakazka(false);
  const j1 = zamkni(z1, v1);
  const e1 = ctrlExportVarianty(j1.z, j1.vv, { jekly: J });
  const l1 = ctrlExportListy([e1], null, { hromadny: { od: '2026-11-01', do: '2026-11-30', oblast: 'obe', rada: 'obe', pd: 'vse' } });
  test('C jedna šachta: hlavička bez šachet, hromadný bez sloupce', !('sachty' in e1.hlavicka)
    && l1[3].rows.find(x => x[0] === 'Zakázky v exportu').length === 10);
}

/* ---------- D) Pipedrive náhled (R6) ---------- */
{
  const { zak, v } = zakazka(true);
  const p = pdnStranaOck(zak, v, J);
  const r = vypocetZ(v, J);
  const cn = cenaNabidkyOck(r, v.data.sleva || {}, v.data.zaokr);
  test('D hodnota dealu = cena celé nabídky', p.cena === cn.cena, [p.cena, cn.cena]);
  test('D seznam šachet do poznámky', p.sachty === 'Šachty v nabídce: 2 varianty šachet, celkem 3 ks (Výtah A 1 ks, Výtah B 2 ks)', p.sachty);
  test('D ATYP kterékoli šachty', p.atyp === true);
  const t = pdnTelo(pdnPodklad(zak, J));
  test('D tělo náhledu nese šachty (server je přebere)', t.strany.ock && t.strany.ock.sachty === p.sachty);
  const { zak: z1, v: v1 } = zakazka(false);
  const p1 = pdnStranaOck(z1, v1, J);
  test('D jedna šachta: podklad bez sachty, ATYP ze zadání', !('sachty' in p1) && p1.atyp === false);
}

/* ---------- E) objednané příplatky ---------- */
{
  const { zak, v } = zakazka(true);
  const { z, vv } = zamkni(zak, v);
  const nab = objNabidnute(vv, J);
  const r = vypocetZ(vv, J);
  const hA = (r.sachty[0].vysl.priplatky || []).find(p => p.key === 'madlaBoky');
  const hB = (r.sachty[1].vysl.priplatky || []).find(p => p.key === 'madlaBoky');
  const h = nab.find(p => p.key === 'madlaBoky');
  test('E madla na bocích: jen šachta B (u A vynechaná), cena 2 × B', hA && hB && h && Math.abs(h.sMarzi - 2 * hB.sMarzi) < 1e-6, [h, hB && hB.sMarzi]);
  test('E klíče jedinečné (jeden řádek za příplatek)', new Set(nab.map(p => p.key)).size === nab.length, nab.map(p => p.key));
  const spol = nab.find(p => p.key === 'madlaZadni') || nab.find(p => {
    const a = (r.sachty[0].vysl.priplatky || []).some(x => x.key === p.key), b = (r.sachty[1].vysl.priplatky || []).some(x => x.key === p.key);
    return a && b;
  });
  if (spol) {
    const a = r.sachty[0].vysl.priplatky.find(x => x.key === spol.key), b = r.sachty[1].vysl.priplatky.find(x => x.key === spol.key);
    test('E společný příplatek = A + 2 × B (' + spol.key + ')', Math.abs(spol.sMarzi - (a.sMarzi + 2 * b.sMarzi)) < 1e-6, [spol, a.sMarzi, b.sMarzi]);
  } else test('E společný příplatek existuje', false, nab);
  vv.prodano = { datum: '2026-11-10' };
  const pz = prodPdZapis(z, vv, J);
  const ks = pz && pz.kryci[0].sekce.find(s => s.sekce === 'Šachty v nabídce');
  test('E prodPdZapis: šachty jednou buňkou „počet · cena"', ks && /^2 ks · .* Kč$/.test(ks.radky[1][1]), ks && ks.radky);
  const { zak: z1, v: v1 } = zakazka(false);
  const j1 = zamkni(z1, v1);
  const n1 = objNabidnute(j1.vv, J);
  const r1 = vypocetZ(j1.vv, J);
  test('E jedna šachta: nabídnuté jako dřív (výsledek − vynechané)', JSON.stringify(n1.map(p => p.key))
    === JSON.stringify(r1.priplatky.filter(p => p.key && ['vsgFolie', 'skn', 'madlaBoky'].indexOf(p.key) < 0).map(p => p.key)));
}

/* ---------- F) jedna šachta beze změny ---------- */
{
  const { zak, v } = zakazka(false);
  const c = kryciCtx(zak, v, J);
  const r = vypocetZ(v, J);
  test('F jedna šachta: kontext bez vs, můstky jako dřív', c.vs === null && c.mustky === kryciMustkyText(r));
  ['bo', 'techdata'].forEach(verze => test('F jedna šachta ' + verze + ': bez sekce Šachty v nabídce',
    !sekce(kryciData(zak, v, J, verze), 'Šachty v nabídce')));
  const { zak: z2, v: v2 } = zakazka(false, (zz, vv) => { vv.data.ock.dalsi = []; vv.data.ock.ks = 1; vv.data.ock.nazev = 'Výtah A'; });
  test('F dalsi [] + ks 1 + název = jedna šachta (krycí list shodný)', JSON.stringify(kryciData(z2, v2, J, 'bo')) === JSON.stringify(kryciData(zak, v, J, 'bo')));
  test('F vsVystup(null / bez sachty) = null', vsVystup(null) === null && vsVystup(r) === null);
  test('F texty R19: 1 varianta / 2–4 varianty / 5+ variant', vsVariantText(1) === '1 varianta šachty' && vsVariantText(4) === '4 varianty šachet'
    && vsVariantText(5) === '5 variant šachet' && vsPoctyText(3, 7) === '3 varianty šachet, celkem 7 ks');
}

console.log(ok + ' OK, ' + fail + ' FAIL');
if (fail) process.exit(1);
