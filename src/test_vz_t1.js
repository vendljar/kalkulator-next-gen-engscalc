/* ============================================================
 * VZ T1 — ŘÍDÍCÍ VARIANTA A ŘÍDÍCÍ ZÁKAZNÍK V HLAVIČCE: čistá logika jádra
 * (src/vice_zakazniku.js oddíl „T1", src/vz_poznamka.js; rozhodnutí J. V.
 * 18. 11. 2026, maketa podklady/T1_MAKETA_KALKULATOR.html).
 *
 *  A) komu varianta patří: ukazatel i razítko odeslané nabídky; druh
 *     vlastní / sdílená / bez zákazníka; popis „(sdílená)" / „(vlastní C — …)";
 *  B) vzT1Nastav: vlastní varianta → řídícím její zákazník (výměna), sdílená
 *     → povinný výběr jen z těch, kterým patří, zákazník s razítkem přejde na
 *     ni (číslo …-C), bez zákazníka → řídící se nemění; chyby nemění data;
 *  C) E4 beze změny: fixace vlastnictví ručních hodnot KL (vzKlZafixuj),
 *     písmena, tisky; prodaná zakázka vzT1Nastav nechá na volajícím (práva);
 *  D) organizace dealu: skutečná (pdOrgDealu, revize N3) má přednost — IČO,
 *     prázdné = nesedí, jiný deal / vadný tvar se nepočítá; odhad z1 (týž
 *     zákazník = sedí, bez z1 nic), prodaná = nic; text bloku a řádku poznámky (bez IČO);
 *  E) poznámka dealu: řádek T1 za seznamem, řídící není mezi „dalšími",
 *     jeden zákazník beze změny;
 *  F) server: vzServerInvariant (revize N1: vlastnictví podle ukládané verze —
 *     B na variantě C, C na nové / sdílené variantě v jednom uložení projdou;
 *     N2: starší klient se stejným řídícím se srovná, jinak 409 „Obnovte
 *     stránku…"; obnova, nový zákazník, přechod z jednoho) a vzServerRidici (změna jen řídící
 *     varianty: autor / administrátor / jiný 403 / webhook / prodaná 409 /
 *     srovnání na prodanou #563 projde).
 * Smyšlená data. Pojistka: na 2856345 (před T1) sada padá — funkce
 * vzVariantaKomu, vzT1Nastav, vzServerInvariant … neexistují.
 * Spuštění: node src/test_vz_t1.js
 * ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const CORE = ['build_info.js', 'nazvy_souboru.js', 'preklad.js', 'format.js', 'engine.js', 'vice_sachet.js', 'engine_proj.js', 'techspec.js',
  'zakazka.js', 'uloziste.js', 'retence_zaloh.js', 'zamek.js', 'vice_zakazniku.js', 'vz_poznamka.js', 'seznam.js', 'archiv.js', 'docxgen.js', 'xlsx.js', 'dokumenty.js',
  'sleva.js', 'schvalovani.js', 'zaokrouhleni.js', 'marze.js', 'kontroly.js', 'ares.js', 'poznamky.js', 'protokol.js', 'firma.js',
  'zpracovatel.js', 'podminky.js', 'plan_plateb.js', 'nabidka.js', 'nabidka_proj.js', 'sod.js', 'kryci.js', 'kryci_proj.js',
  'objednane.js', 'controlling.js'];
CORE.forEach(f => { const m = require(path.join(__dirname, f)); if (m && typeof m === 'object') Object.assign(global, m); });
const ZC = require('./zkusebni_cenik.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const J = JSON.parse(fs.readFileSync(path.join(__dirname, 'jekly.json'), 'utf8'));

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + (info === undefined ? '' : '  ' + JSON.stringify(info).slice(0, 500))); } };
const kop = x => JSON.parse(JSON.stringify(x));
const T1 = ['vzVariantaKomu', 'vzVariantaDruh', 'vzT1PopisVarianty', 'vzT1Kandidati', 'vzT1Nastav', 'vzOrgDealuId', 'vzOrgNesedi',
  'vzOrgNesediText', 'vzServerInvariant', 'vzT1Stitek', 'vzIcoNorm'];
const chybi = T1.filter(f => typeof global[f] !== 'function');
if (chybi.length) { console.log('FAIL jádro nenese funkce T1: ' + chybi.join(', ')); process.exit(1); }

const UD = {
  B: { objednatel: 'Zkušební Beta s.r.o.', adresaObjednatele: 'Betová 2, Kdesi', ico: '11112222', dic: '', kontakt: 'Osoba Beta' },
  C: { objednatel: 'Zkušební Gama s.r.o.', adresaObjednatele: 'Gamová 3, Kdesi', ico: '33334444', dic: '', kontakt: 'Osoba Gama' },
};
const ZAD = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 };
const TED = new Date().toISOString();
const DNES = objDnes();
let cisloN = 9801;
/* A = z1 řídící (V1), B = z2 sdílí V1, C = z3 vlastní (V2). */
function zakazka(opt) {
  const o = opt || {};
  const z = novaZakazka();
  Object.assign(z, { cislo: 'TEST - 2026 - OPR - CN - ' + (cisloN++), nazevAkce: 'Zkušební akce T1', adresa: 'Stavba 1, Kdesi',
    objednatel: 'Zkušební Alfa s.r.o.', adresaObjednatele: 'Alfová 1, Kdesi', ico: o.icoA === undefined ? '55556666' : o.icoA,
    kontakt: 'Osoba Alfa', autor: 'autor@priklad.cz' });
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, ZAD);
  v.data.ock.fixes = true;
  if (o.B !== false) { const r = vzPridej(z, UD.B, { kdo: 'test', kdy: TED }); if (!r.ok) throw new Error(r.chyba); }
  if (o.C !== false) { const r = vzPridej(z, UD.C, { kdo: 'test', kdy: TED, vlastni: true }); if (!r.ok) throw new Error(r.chyba); }
  return z;
}
function tiskni(z, v, id) {
  const prvni = !variantaUzamcena(v);
  const info = { typ: 'nabidka', kdo: 'test@priklad.cz', kdy: TED, cislo: variantaCislo(z, v) };
  if (prvni) { info.vysledek = zamekVysledekSpocti(v, J, 'vz-t1'); info.snimek = zamekSnimekSpocti(v); }
  if (vzRezim(z)) info.zakaznik = vzRazitkoSnimek(z, id, v);
  return zamkniVariantu(v, info);
}
const varZ = (z, id) => z.varianty.find(v => v.id === vzZakaznik(z, id).varianta);
const invariant = z => z.vzRidici.varianta === vzRidiciVariantaId(z) && vzZakaznik(z, vzRidiciId(z)).varianta === vzRidiciVariantaId(z);

/* ---------- A) komu varianta patří ---------- */
{
  const z = zakazka();
  const v1 = z.varianty[0], v2 = varZ(z, 'z3');
  test('A V1 patří A a B (ukazatel), V2 jen C', vzVariantaKomu(z, v1.id).join() === 'z1,z2' && vzVariantaKomu(z, v2.id).join() === 'z3');
  test('A druh: V1 sdílená, V2 vlastní', vzVariantaDruh(z, v1.id).druh === 'sdilena' && vzVariantaDruh(z, v2.id).druh === 'vlastni');
  test('A popis: „(sdílená)" a „(vlastní C — Zkušební Gama s.r.o.)"', vzT1PopisVarianty(z, v1.id) === '(sdílená)'
    && vzT1PopisVarianty(z, v2.id) === '(vlastní C — Zkušební Gama s.r.o.)', [vzT1PopisVarianty(z, v1.id), vzT1PopisVarianty(z, v2.id)]);
  const v3 = klonujVariantu(z, v1.id, { aktivovat: false });
  test('A nová varianta: bez zákazníka, kandidát jen dnešní řídící', vzVariantaDruh(z, v3.id).druh === 'zadna'
    && vzT1PopisVarianty(z, v3.id) === '(bez zákazníka)' && vzT1Kandidati(z, v3.id).join() === 'z1');
  test('A neexistující varianta: nikomu', vzVariantaKomu(z, 'nic').length === 0);
  /* C dostal nabídku z V1 (razítko), ukazuje na V2 → V1 patří i C */
  tiskni(z, v1, 'z1'); tiskni(z, v1, 'z2'); tiskni(z, v1, 'z3');
  test('A razítko: V1 patří A, B i C (C z ní dostal nabídku …-C)', vzVariantaKomu(z, v1.id).join() === 'z1,z2,z3', vzVariantaKomu(z, v1.id));
  test('A razítko: V2 dál vlastní C', vzVariantaDruh(z, v2.id).druh === 'vlastni');
  test('A štítek: řídící bez písmene jen název, další „B — název"', vzT1Stitek(vzZakaznik(z, 'z1')) === 'Zkušební Alfa s.r.o.'
    && vzT1Stitek(vzZakaznik(z, 'z2')) === 'B — Zkušební Beta s.r.o.');
}

/* ---------- B) vzT1Nastav ---------- */
{
  const z = zakazka();
  const v1 = z.varianty[0], v2 = varZ(z, 'z3');
  z.pdZadani = { otisk: { objednatel: 'x', ico: 'y', nazevAkce: 'n' } };
  const r = vzT1Nastav(z, v2.id);
  test('B vlastní varianta C → ok, výměna, řídícím C', r.ok && r.vymena && r.zmena && vzRidiciId(z) === 'z3', r);
  test('B hlavička = C, písmeno C zůstává, A mezi dalšími bez písmene na V1', z.objednatel === UD.C.objednatel && z.vzRidici.pismeno === 'C'
    && z.dalsiZakaznici.some(d => d.id === 'z1' && d.pismeno === '' && d.varianta === v1.id));
  test('B řídící varianta = V2, invariant drží', v2.ridici && !v1.ridici && invariant(z));
  test('B otisky webhooku polí firmy pryč (E4)', !('objednatel' in z.pdZadani.otisk) && z.pdZadani.otisk.nazevAkce === 'n');
  const pred = JSON.stringify(z);
  const r2 = vzT1Nastav(z, v2.id, 'z1');
  test('B vlastní varianta C a jiný zákazník → chyba, data beze změny', !r2.ok && /vlastní varianta jiného/.test(r2.chyba) && JSON.stringify(z) === pred, r2);
  const r3 = vzT1Nastav(z, v1.id);
  test('B sdílená bez zákazníka → chyba (povinný výběr), data beze změny', !r3.ok && /vyberte řídícího/.test(r3.chyba) && JSON.stringify(z) === pred, r3);
  const r4 = vzT1Nastav(z, v1.id, 'z3');
  test('B sdílená V1 a C, kterému nepatří → chyba', !r4.ok && /jen zákazník, kterému varianta patří/.test(r4.chyba) && JSON.stringify(z) === pred, r4);
  const r5 = vzT1Nastav(z, v1.id, 'z2');
  test('B sdílená V1 a B → řídící B na V1, invariant', r5.ok && r5.vymena && vzRidiciId(z) === 'z2' && v1.ridici && invariant(z), r5);
  test('B C zůstal na své vlastní V2', vzZakaznik(z, 'z3').varianta === v2.id);
  const r6 = vzT1Nastav(z, v1.id, 'z2');
  test('B totéž znovu → ok bez změny', r6.ok && !r6.zmena && !r6.vymena);
  const r7 = vzT1Nastav(z, 'nic', 'z2');
  test('B neexistující varianta → chyba', !r7.ok);
  const r8 = vzT1Nastav(z, v1.id, 'z1');
  test('B sdílená V1 a A (ukazuje na ni) → řídící A', r8.ok && vzRidiciId(z) === 'z1' && invariant(z));
}
{ /* razítko: C dostal nabídku z V1, je na V2 → zvolený řídícím V1 přejde na V1 (číslo …-C) */
  const z = zakazka();
  const v1 = z.varianty[0], v2 = varZ(z, 'z3');
  tiskni(z, v1, 'z1'); tiskni(z, v1, 'z3');
  const r = vzT1Nastav(z, v1.id, 'z3');
  test('B razítko: C řídícím sdílené V1 → C přešel na V1', r.ok && vzRidiciId(z) === 'z3' && vzZakaznik(z, 'z3').varianta === v1.id && invariant(z), r);
  test('B razítko: číslo nabídky C na V1 = …9801-C podle písmene', vzCisloSPismenem(vzCisloVarianty(z, v1), vzZakaznik(z, 'z3').pismeno).endsWith('-C'));
  test('B razítko: V2 už nikomu nepatří (C přešel na V1, z V2 nic nedostal)',
    vzVariantaDruh(z, v2.id).druh === 'zadna', vzVariantaDruh(z, v2.id));
}
{ /* bez zákazníka: řídící se nemění, přejde na novou variantu */
  const z = zakazka();
  const v3 = klonujVariantu(z, z.varianty[0].id, { aktivovat: false });
  const r = vzT1Nastav(z, v3.id);
  test('B bez zákazníka → řídící A přejde na novou variantu, bez výměny', r.ok && !r.vymena && vzRidiciId(z) === 'z1' && v3.ridici && invariant(z), r);
  test('B po přechodu je nová varianta „vlastní" A', vzVariantaDruh(z, v3.id).druh === 'vlastni' && vzVariantaKomu(z, v3.id).join() === 'z1');
  const v4 = klonujVariantu(z, z.varianty[0].id, { aktivovat: false });
  const r2 = vzT1Nastav(z, v4.id, 'z2');
  test('B bez zákazníka a jiný řídící → chyba', !r2.ok && /nepatří žádnému/.test(r2.chyba), r2);
}
{ const z = zakazka({ B: false, C: false });
  test('B jeden zákazník → vzT1Nastav odmítne', !vzT1Nastav(z, z.varianty[0].id).ok && vzVariantaDruh(z, z.varianty[0].id).druh === 'vlastni'); }

/* ---------- C) E4 beze změny: KL, tisky ---------- */
{
  const z = zakazka();
  const v1 = z.varianty[0], v2 = varZ(z, 'z3');
  v1.data.kryci = v1.data.kryci || {};
  v1.data.kryci.hodnoty = Object.assign({}, v1.data.kryci.hodnoty, { zakaznik: 'Ruční Alfa' });
  tiskni(z, v2, 'z3');
  const r = vzT1Nastav(z, v2.id);
  test('C výměna přes T1: ruční hodnota KL pole zákazníka dostala vlastníka z1 (vzKlZafixuj, E4)',
    r.ok && v1.data.kryci.vzVlastnik && v1.data.kryci.vzVlastnik.zakaznik === 'z1', v1.data.kryci);
  test('C razítko tisku C beze změny (id z3, písmeno C)', v2.zamek.tisky[0].zakaznik.id === 'z3' && v2.zamek.tisky[0].zakaznik.pismeno === 'C');
  test('C nové písmeno se nepřidělí znovu (D)', vzPismenoDalsi(z) === 'D');
}

/* ---------- D) organizace dealu ---------- */
{
  const z = zakazka();
  test('D bez prodeje: organizace dealu = z1', vzOrgDealuId(z) === 'z1');
  test('D řídící = z1 → sedí (nic)', vzOrgNesedi(z) === null && vzOrgNesediText(z) === '');
  vzT1Nastav(z, varZ(z, 'z3').id);
  const n = vzOrgNesedi(z);
  test('D řídící C, deal vede A → nesedí', n && n.ridici.id === 'z3' && n.org.id === 'z1', n && { r: n.ridici.id, o: n.org && n.org.id });
  test('D text bloku hlavičky (s organizací)', vzOrgNesediText(z, true)
    === 'Řídící zákazník v kalkulaci: C — Zkušební Gama s.r.o. (organizace dealu se změní až prodejem; deal dál vede Zkušební Alfa s.r.o.)', vzOrgNesediText(z, true));
  test('D řádek poznámky (bez organizace a bez IČO)', vzOrgNesediText(z, false)
    === 'Řídící zákazník v kalkulaci: C — Zkušební Gama s.r.o. (organizace dealu se změní až prodejem)' && !/3333|5555/.test(vzOrgNesediText(z, true)));
  /* stejné IČO = sedí */
  z.dalsiZakaznici.find(d => d.id === 'z1').hlavicka.ico = '3333 4444';
  test('D stejné IČO (po normalizaci) → sedí', vzOrgNesedi(z) === null);
  z.dalsiZakaznici.find(d => d.id === 'z1').hlavicka.ico = '';
  z.ico = '';
  test('D prázdné IČO obou → nesedí', !!vzOrgNesedi(z));
}
{ const z = zakazka({ icoA: '' });
  test('D týž zákazník s prázdným IČO → sedí (deal vede on)', vzOrgNesedi(z) === null); }
{ /* prodaná zakázka: nic (organizaci řeší E5b) */
  const z = zakazka();
  const v2 = varZ(z, 'z3');
  tiskni(z, v2, 'z3');
  const r = vzProdej(z, 'z3', DNES, { kdo: 'obchodnik@priklad.cz', role: 'Obchodník' });
  test('D prodaná C: organizace dealu = kupující, nic se nehlásí', r.ok && vzOrgDealuId(z) === 'z3' && vzOrgNesedi(z) === null, r);
  /* i kdyby prodej vedl jiného zákazníka než řídícího (starší / ruční data), po prodeji se nesoulad nehlásí — organizaci řeší E5b */
  z.varianty.find(v => v.prodano).prodano.zakaznik = 'z2';
  test('D prodaná, prodej jinému než řídícímu: dál nic', vzOrgDealuId(z) === 'z2' && vzOrgNesedi(z) === null && vzOrgNesediText(z, true) === '');
}
{ /* N3: skutečná organizace dealu (pdOrgDealu píše server) má přednost před odhadem z1 */
  const z = zakazka();
  z.pdDealId = '4242';
  z.pdOrgDealu = { deal: '4242', org: 77, ico: '33334444', nazev: 'Gama v Pipedrive s.r.o.', kdy: '2026-11-18T10:00:00.000Z' };
  const n = vzOrgNesedi(z);
  test('D N3 deal vede organizace s IČO C, řídící A → nesedí, „deal dál vede" název z Pipedrive', n && n.org && n.org.id === 'z3'
    && vzOrgNesediText(z, true) === 'Řídící zákazník v kalkulaci: Zkušební Alfa s.r.o. (organizace dealu se změní až prodejem; deal dál vede Gama v Pipedrive s.r.o.)', vzOrgNesediText(z, true));
  vzT1Nastav(z, varZ(z, 'z3').id);
  test('D N3 řídící C = IČO organizace dealu → sedí', vzOrgNesedi(z) === null && vzOrgDealuId(z) === 'z3');
  z.pdOrgDealu.ico = '';
  /* revize N6: bez IČ na straně organizace se neshoda IČ nehlásí — název, jinak odhad z1 */
  test('D N6 organizace dealu bez IČ, název nesedí, řídící C ≠ z1 → nesedí podle odhadu z1', !!vzOrgNesedi(z) && vzOrgDealuId(z) === 'z1');
  z.pdOrgDealu.nazev = 'ZKUŠEBNÍ GAMA, s. r. o.';
  test('D N6 organizace dealu bez IČ, název = řídící C → sedí', vzOrgNesedi(z) === null && vzOrgDealuId(z) === 'z3');
  z.pdOrgDealu.nazev = 'Gama v Pipedrive s.r.o.';
  vzT1Nastav(z, z.varianty[0].id, 'z1');
  test('D N6 organizace dealu bez IČ, řídící se nezměnil (z1) → sedí, žádný nepravdivý řádek', vzOrgNesedi(z) === null && vzPoznamkaText(z).indexOf('Řídící zákazník v kalkulaci') < 0);
  z.pdOrgDealu.ico = '99999999';
  const icoA = z.ico; z.ico = '';
  test('D N6 organizace s IČ, které žádný zákazník nemá, řídící z1 bez IČO → neshoda IČ se nehlásí', vzOrgNesedi(z) === null);
  z.ico = icoA;
  z.pdOrgDealu.ico = '33334444';
  test('D N6 organizace s IČ C, řídící z1 s jiným IČO → nesedí podle IČO', !!vzOrgNesedi(z));
  z.pdOrgDealu.org = 0;
  test('D N6 deal bez organizace → nic', vzOrgNesedi(z) === null && vzOrgDealuId(z) === '');
  z.pdOrgDealu.org = 77; vzT1Nastav(z, varZ(z, 'z3').id);
  z.pdOrgDealu = { deal: '9999', org: 77, ico: '33334444', nazev: 'Jiný deal', kdy: '' };
  test('D N3 uložená organizace jiného dealu se nepočítá → odhad z1 (řídící C ≠ A → nesedí, deal dál vede A)',
    vzOrgDealuZnama(z) === null && /deal dál vede Zkušební Alfa s\.r\.o\.\)$/.test(vzOrgNesediText(z, true)), vzOrgNesediText(z, true));
  z.pdOrgDealu = { deal: '4242', org: 'x', ico: '1' };
  test('D N3 vadný tvar pdOrgDealu → nic (odhad)', vzOrgDealuNorm(z.pdOrgDealu) === null && vzOrgDealuZnama(z) === null);
  test('D N3 norm: ořez názvu, IČO jen 8 číslic', JSON.stringify(vzOrgDealuNorm({ deal: '1', org: 0, ico: '123', nazev: 'A\u0001B', kdy: 'x' }))
    === JSON.stringify({ deal: '1', org: 0, ico: '', nazev: 'A B', kdy: '' }));
}
{ /* odhad bez z1: řádek se nepíše naslepo */
  const z = zakazka();
  vzT1Nastav(z, varZ(z, 'z3').id);
  const p = vzOdstran(z, 'z1');
  test('D bez z1 a bez známé organizace: nic se nehlásí', p.ok && vzOrgDealuId(z) === '' && vzOrgNesedi(z) === null && vzPoznamkaText(z).indexOf('Řídící zákazník v kalkulaci') < 0, p);
}
{ const z = zakazka({ B: false, C: false });
  test('D jeden zákazník → nic', vzOrgNesedi(z) === null && vzOrgDealuId(z) === 'z1'); }
test('D vzIcoNorm', vzIcoNorm(' 1234 ') === '00001234' && vzIcoNorm('') === '' && vzIcoNorm('CZ123') === '' && vzIcoNorm('123456789') === '');

/* ---------- E) poznámka dealu ---------- */
{
  const z = zakazka();
  const t0 = vzPoznamkaText(z);
  test('E řídící A = organizace dealu: bez řádku T1', t0.indexOf('Řídící zákazník v kalkulaci') < 0 && /Zkušební Beta/.test(t0) && t0.indexOf('Alfa') < 0, t0);
  vzT1Nastav(z, varZ(z, 'z3').id);
  const t = vzPoznamkaText(z);
  const r = t.split('\n');
  test('E řídící C: úvod, A a B mezi dalšími, C ne', r[0] === 'Další zákazníci na zakázce:' && r.some(x => /^• Zkušební Alfa/.test(x))
    && r.some(x => /^• Zkušební Beta/.test(x)) && !r.some(x => /^• Zkušební Gama/.test(x)), r);
  test('E řádek T1 je poslední před značkou', r[r.length - 1] === 'Řídící zákazník v kalkulaci: C — Zkušební Gama s.r.o. (organizace dealu se změní až prodejem)', r);
  const s = vzPoznamkaSeZnackou(z, t);
  test('E se značkou: řádek T1, pak „— nabídka …"', /\(organizace dealu se změní až prodejem\)\n— nabídka TEST - 2026/.test(s), s);
  test('E bez IČO (B225)', !/1111|3333|5555/.test(s));
}
{ const z = zakazka({ B: false, C: false });
  test('E jeden zákazník: text prázdný jako dřív', vzPoznamkaText(z) === '' && vzPoznamkaText(z, { zadni: true }) === VZP_ZADNI); }

/* ---------- F) server ---------- */
{
  const stara = zakazka();
  tiskni(stara, stara.varianty[0], 'z1');
  const v2id = varZ(stara, 'z3').id, v1id = stara.varianty[0].id;
  /* legitimní výměna na vlastní variantu C */
  { const z = kop(stara); vzT1Nastav(z, v2id);
    test('F vlastní varianta C, řídící C → projde', vzServerInvariant(stara, z) === null); }
  /* N1: kroky v jednom uložení podle ukládané verze projdou */
  { const z = kop(stara); nastavRidici(z, v2id); z.vzRidici.varianta = v2id;
    test('F N1 A přesunutý na variantu C (sdílí ji s C) → projde', vzServerInvariant(stara, z) === null); }
  { const z = kop(stara); z.dalsiZakaznici.find(d => d.id === 'z2').varianta = v2id; const r = vzT1Nastav(z, v2id, 'z2');
    test('F N1 B přesunut na variantu C a zvolen řídícím → projde', r.ok && vzServerInvariant(stara, z) === null, r); }
  { const z = kop(stara); const v = klonujVariantu(z, v1id, { aktivovat: false }); z.dalsiZakaznici.find(d => d.id === 'z3').varianta = v.id;
    const r = vzT1Nastav(z, v.id);
    test('F N1 C přesunut na novou variantu a ta zvolena řídící → projde', r.ok && vzRidiciId(z) === 'z3' && vzServerInvariant(stara, z) === null, r); }
  { const z = kop(stara); z.dalsiZakaznici.find(d => d.id === 'z3').varianta = v1id; const r = vzT1Nastav(z, v1id, 'z3');
    test('F N1 C přesunut na sdílenou V1 a zvolen řídícím → projde', r.ok && vzServerInvariant(stara, z) === null, r); }
  /* N2: starší klient mění jen v.ridici — řídící zákazník se nemění → srovná se jako dřív */
  { const z = kop(stara); nastavRidici(z, v2id);
    test('F N2 jen příznak ridici, řídící zákazník týž → projde (srovná vzSrovnej)', vzServerInvariant(stara, z) === null
      && (vzSrovnej(z), z.vzRidici.varianta === v2id)); }
  { const z = kop(stara); vzVymenRidiciho(z, 'z3'); nastavRidici(z, v1id);
    const e = vzServerInvariant(stara, z);
    test('F N2 jiný řídící zákazník a ukazatel nesedí → 409 „Obnovte stránku (nová verze aplikace)…"', e && e.status === 409 && /^Obnovte stránku \(nová verze aplikace\)/.test(e.chyba), e); }
  /* B řídícím sdílené V1 → projde */
  { const z = kop(stara); vzT1Nastav(z, v1id, 'z2');
    test('F B řídícím sdílené V1 → projde', vzServerInvariant(stara, z) === null); }
  /* nová varianta bez zákazníka: přechod řídícího projde */
  { const z = kop(stara); const v = klonujVariantu(z, v1id, { aktivovat: false }); vzT1Nastav(z, v.id);
    test('F nová varianta, řídící A na ni přejde → projde', vzServerInvariant(stara, z) === null); }
  /* beze změny, obnova, nový zákazník */
  test('F beze změny → projde', vzServerInvariant(stara, kop(stara)) === null);
  { const z = kop(stara); vzVymenRidiciho(z, 'z3'); nastavRidici(z, v1id);
    test('F obnova se nehlídá', vzServerInvariant(stara, z, { obnova: true }) === null); }
  { const z = kop(stara); const p = vzPridej(z, { objednatel: 'Zkušební Delta s.r.o.' }, { kdo: 't', kdy: TED, vlastni: true });
    vzVymenRidiciho(z, p.zakaznik.id);
    test('F nový zákazník (v témže uložení) řídícím → projde', vzServerInvariant(stara, z) === null && invariant(z)); }
  { /* uložená verze s jedním zákazníkem: hlídá se jen ukazatel */
    const s1 = zakazka({ B: false, C: false });
    const z = kop(s1); vzPridej(z, UD.B, { kdo: 't', kdy: TED });
    test('F přechod z jednoho zákazníka (vzPridej) → projde', vzServerInvariant(s1, z) === null);
    z.vzRidici.varianta = 'nic';
    test('F přechod z jednoho zákazníka s vadným ukazatelem → 409', (vzServerInvariant(s1, z) || {}).status === 409); }
  /* nový prodej C (vlastní V2) → výměnu řeší prodej */
  { const s2 = zakazka(); const v2 = varZ(s2, 'z3'); tiskni(s2, v2, 'z3');
    const z = kop(s2); const r = vzProdej(z, 'z3', DNES, { kdo: 'obchodnik@priklad.cz', role: 'Obchodník' });
    test('F nový prodej C → invariant projde', r.ok && vzServerInvariant(s2, z) === null, r); }

  /* vzServerRidici: změna JEN řídící varianty */
  const sr = zakazka();
  const nv = klonujVariantu(sr, sr.varianty[0].id, { aktivovat: false });
  const zmen = () => { const z = kop(sr); vzT1Nastav(z, nv.id); return z; };
  test('F jen řídící varianta: autor → projde', vzServerRidici(sr, zmen(), { email: 'autor@priklad.cz', role: 'Obchodník' }) === null);
  test('F jen řídící varianta: administrátor → projde', vzServerRidici(sr, zmen(), { email: 'admin@priklad.cz', role: 'Administrátor' }) === null);
  { const e = vzServerRidici(sr, zmen(), { email: 'jiny@priklad.cz', role: 'Obchodník' });
    test('F jen řídící varianta: jiný obchodník → 403 „řídící variantu …"', e && e.status === 403 && /řídící variantu zakázky s víc zákazníky mění jen autor/.test(e.chyba), e); }
  { const sw = kop(sr); sw.autor = 'pipedrive-webhook';
    const z = kop(sw); vzT1Nastav(z, nv.id);
    test('F zakázka z webhooku: autor-webhook neprojde, administrátor ano', (vzServerRidici(sw, z, { email: 'pipedrive-webhook', role: 'Obchodník' }) || {}).status === 403
      && vzServerRidici(sw, z, { email: 'admin@priklad.cz', role: 'Administrátor' }) === null); }
  test('F beze změny řídící varianty: jiný obchodník projde', vzServerRidici(sr, kop(sr), { email: 'jiny@priklad.cz', role: 'Obchodník' }) === null);
  { /* prodaná: změna řídící varianty 409; srovnání na prodanou (#563) projde */
    const sp = zakazka(); tiskni(sp, sp.varianty[0], 'z1');
    const r = vzProdej(sp, 'z1', DNES, { kdo: 'autor@priklad.cz', role: 'Obchodník' });
    const v4 = klonujVariantu(sp, sp.varianty[0].id, { aktivovat: false });
    const z = kop(sp); nastavRidici(z, v4.id); z.vzRidici.varianta = v4.id;
    const e = vzServerRidici(sp, z, { email: 'admin@priklad.cz', role: 'Administrátor' });
    test('F prodaná: změna řídící varianty i administrátorem → 409', r.ok && e && e.status === 409, e);
    const sp2 = kop(sp); nastavRidici(sp2, v4.id); sp2.vzRidici.varianta = v4.id;   // starší data: řídící ≠ prodaná
    const z2 = kop(sp2); prodRidiciSrovnej(z2); vzSrovnej(z2);
    test('F prodaná: srovnání řídící na prodanou (#563) jiným obchodníkem projde', vzServerRidici(sp2, z2, { email: 'jiny@priklad.cz', role: 'Obchodník' }) === null); }
  { /* jeden zákazník: změna řídící varianty se nehlídá (dnešek) */
    const s1 = zakazka({ B: false, C: false }); const v = klonujVariantu(s1, s1.varianty[0].id, { aktivovat: false });
    const z = kop(s1); nastavRidici(z, v.id);
    test('F jeden zákazník: změna řídící varianty jiným obchodníkem projde jako dřív', vzServerRidici(s1, z, { email: 'jiny@priklad.cz', role: 'Obchodník' }) === null); }
}

console.log('\nVZ T1: ' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
