/* ============================================================
 * VZ-E4 (#603) — ŘÍDÍCÍ ZÁKAZNÍK A PRODÁNO U ZÁKAZNÍKA: čistá logika jádra
 * (src/vice_zakazniku.js oddíl „E4", src/objednane.js prodServer /
 * prodOciste / prodJedinaZmena, src/zamek.js zamekZakZmeny; návrh
 * podklady/NAVRH_VICE_ZAKAZNIKU.md § 2, § 4, § 7.4; zadání
 * podklady/PROMPT_VZ_E4.md + doplňky poradce).
 *
 *  A) prodej PRVNÍMU (řídícímu): prodano.zakaznik z1, řídící beze změny;
 *  B) prodej DRUHÉMU (vlastní varianta): výměna řídícího v témže kroku,
 *     hlavička = vítěz, prodaná varianta řídící, invariant, otisky webhooku pryč;
 *  C) prodej zákazníkovi SDÍLENÉ varianty (odešla A i B, prodáno B);
 *  D) prodej zákazníkovi, kterému nabídka neodešla — odmítnut (klient i server);
 *  E) po prodeji: řídícího nejde přepnout, prodaného nejde odstranit,
 *     odemčení prodeje řídícího NEVRACÍ; server vzProdejServer / prodServer;
 *  F) doplněk 2: prodOciste propustí prodano.zakaznik (obnova z otisku);
 *  G) prodJedinaZmena: prodej jinému zákazníkovi v okně jen ke čtení;
 *  H) zamekZakZmeny: výměna řídícího hlavičku „u zákazníka" nemění;
 *  I) doplněk 3: vlastnictví po výměně — tisky bez razítka a hodnoty KL bez
 *     značky nepřipadnou novému jedinému zákazníkovi (vzOdstranKolapsDuvod,
 *     vzKlZafixuj, vzKlUklid);
 *  J) Z2: doklad z historie odemčení (písmeno/id se neuvolní, odstranění jen admin);
 *  K) Z1: tiskový pohled nese v KL jen hodnoty svého zákazníka;
 *  L) krycí list a SoD z pohledu prodaného; SoD jen zákazníkovi, kterému nabídka odešla;
 *  M) controlling: jeden řádek s řídícím (= vítězem);
 *  N) potvrzení před → po; vzRidiciSmiMenit (autor, admin, webhook).
 * Smyšlená data, žádné skutečné kontakty ani ceny.
 * Pojistka: na 7c80706 (před E4) sada padá — funkce vzProdej, vzProdejServer,
 * vzRidiciZamceno … neexistují (viz zpráva commitu).
 * Spuštění: node src/test_vz_prodej.js
 * ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const CORE = ['build_info.js', 'nazvy_souboru.js', 'preklad.js', 'format.js', 'engine.js', 'vice_sachet.js', 'engine_proj.js', 'techspec.js',
  'zakazka.js', 'uloziste.js', 'retence_zaloh.js', 'zamek.js', 'vice_zakazniku.js', 'seznam.js', 'archiv.js', 'docxgen.js', 'xlsx.js', 'dokumenty.js',
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
const E4 = ['vzProdej', 'vzProdejNelze', 'vzProdejServer', 'vzServerRidici', 'vzServerKolaps', 'vzRidiciZamceno', 'vzRidiciSmiMenit',
  'vzOdstranKolapsDuvod', 'vzKlZafixuj', 'vzKlJenZakaznika', 'vzOdeslanoKdykoli', 'vzTiskKomuDokumentu', 'vzProdejPredPo'];
const chybi = E4.filter(f => typeof global[f] !== 'function');
if (chybi.length) { console.log('FAIL jádro nenese funkce E4: ' + chybi.join(', ')); process.exit(1); }

const UD = {
  B: { objednatel: 'Zkušební Beta s.r.o.', adresaObjednatele: 'Betová 2, Kdesi', ico: '11112222', dic: '', kontakt: 'Osoba Beta' },
  C: { objednatel: 'Zkušební Gama s.r.o.', adresaObjednatele: 'Gamová 3, Kdesi', ico: '33334444', dic: '', kontakt: 'Osoba Gama' },
};
const ZAD = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 };
const TED = new Date().toISOString();
const DNES = objDnes();
let cisloN = 9960;
/* A = z1 řídící (V1), B = z2 sdílí V1 (nebo vlastní), C = z3 vlastní (V2). */
function zakazka(opt) {
  const o = opt || {};
  const z = novaZakazka();
  Object.assign(z, { cislo: '2026 - OPR - CN - ' + (cisloN++), nazevAkce: 'Zkušební akce E4', adresa: 'Stavba 4, Kdesi',
    objednatel: 'Zkušební Alfa s.r.o.', adresaObjednatele: 'Alfová 1, Kdesi', ico: '55556666', kontakt: 'Osoba Alfa', autor: 'autor@priklad.cz' });
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, ZAD);
  v.data.ock.fixes = true;
  z.pdZadani = { otisk: { objednatel: 'x', ico: 'y', adresaObjednatele: 'z', dic: '', kontakt: 'k', nazevAkce: 'n' } };
  if (o.B !== false) { const r = vzPridej(z, UD.B, { kdo: 'test', kdy: TED, vlastni: !!o.Bvlastni }); if (!r.ok) throw new Error(r.chyba); }
  if (o.C) { const r = vzPridej(z, UD.C, { kdo: 'test', kdy: TED, vlastni: true }); if (!r.ok) throw new Error(r.chyba); }
  return z;
}
function tiskni(z, v, id, typ) {
  const prvni = !variantaUzamcena(v);
  const info = { typ: typ || 'nabidka', kdo: 'test@priklad.cz', kdy: TED, cislo: variantaCislo(z, v) };
  if (prvni) { info.vysledek = zamekVysledekSpocti(v, J, 'vz-e4'); info.snimek = zamekSnimekSpocti(v); }
  if (vzRezim(z)) info.zakaznik = vzRazitkoSnimek(z, id, v);
  return zamkniVariantu(v, info);
}
const varZ = (z, id) => z.varianty.find(v => v.id === vzZakaznik(z, id).varianta);
const CTX = { kdo: 'obchodnik@priklad.cz', role: 'Obchodník' };

/* ---------- A) prodej prvnímu (řídícímu) ---------- */
{
  const z = zakazka({ C: true });
  const v1 = z.varianty[0];
  tiskni(z, v1, 'z1');
  const r = vzProdej(z, 'z1', DNES, CTX);
  test('A prodej řídícímu: ok, bez výměny', r.ok && r.vymena === false, r);
  test('A prodano.zakaznik = z1, řídící zákazník i hlavička beze změny',
    v1.prodano && v1.prodano.zakaznik === 'z1' && vzRidiciId(z) === 'z1' && z.objednatel === 'Zkušební Alfa s.r.o.' && v1.ridici === true, v1.prodano);
  test('A invariant: vzSrovnej nic neopravuje', vzSrovnej(z).length === 0);
  test('A otisky webhooku beze změny (bez výměny)', z.pdZadani.otisk.objednatel === 'x');
}

/* ---------- B) prodej druhému (vlastní varianta) ---------- */
{
  const z = zakazka({ Bvlastni: true, C: true });
  const v1 = z.varianty[0], vB = varZ(z, 'z2');
  tiskni(z, v1, 'z1');
  tiskni(z, vB, 'z2');
  test('B vzProdejNelze: B s odeslanou vlastní variantou smí', vzProdejNelze(z, 'z2') === '', vzProdejNelze(z, 'z2'));
  const pred = vzProdejPredPo(z, 'z2');
  test('B potvrzení před → po: řídící Alfa → Beta, řídící varianta V1 → vlastní B, organizace dealu',
    pred[0].pred === 'Zkušební Alfa s.r.o.' && pred[0].po === UD.B.objednatel && pred[1].po === vB.nazev
    && pred.some(x => /Organizace/.test(x.co)) && pred.some(x => /Číslo/.test(x.co) && /-B$/.test(x.po)), pred);
  const r = vzProdej(z, 'z2', DNES, CTX);
  test('B prodej B: ok, s výměnou', r.ok && r.vymena === true && r.varianta === vB.id, r);
  test('B prodano.zakaznik = z2 (text, návrh § 2)', vB.prodano && vB.prodano.zakaznik === 'z2', vB.prodano);
  test('B hlavička = vítěz (název, IČO), vzRidici z2 s písmenem B',
    z.objednatel === UD.B.objednatel && z.ico === UD.B.ico && z.vzRidici.id === 'z2' && z.vzRidici.pismeno === 'B', z.vzRidici);
  test('B prodaná varianta je řídící a vzRidici.varianta = ona (#563, invariant)',
    vB.ridici === true && !v1.ridici && z.vzRidici.varianta === vB.id && vzSrovnej(z).length === 0);
  test('B bývalý řídící A je mezi dalšími zákazníky se svými údaji a bez písmene',
    z.dalsiZakaznici.some(d => d.id === 'z1' && d.pismeno === '' && d.hlavicka.objednatel === 'Zkušební Alfa s.r.o.'));
  test('B výměna smazala otisky webhooku polí firmy, ostatní zůstaly',
    !('objednatel' in z.pdZadani.otisk) && !('ico' in z.pdZadani.otisk) && z.pdZadani.otisk.nazevAkce === 'n', z.pdZadani.otisk);
  test('B čísla odeslaných nabídek se nemění (razítko B nese …-B)', vB.zamek.tisky[0].zakaznik.cislo.endsWith('-B'));
  test('B vzProdanoKomu = z2', vzProdanoKomu(z) === 'z2');
}

/* ---------- C) sdílená varianta: odešla A i B, prodáno B ---------- */
{
  const z = zakazka({ C: true });
  const v1 = z.varianty[0];
  tiskni(z, v1, 'z1');
  tiskni(z, v1, 'z2');
  const r = vzProdej(z, 'z2', DNES, CTX);
  test('C prodej sdílené V1 zákazníkovi B: ok, výměna, prodano.zakaznik = z2 (kvůli sdílené variantě)',
    r.ok && r.vymena && v1.prodano.zakaznik === 'z2' && vzRidiciId(z) === 'z2' && v1.ridici, [r, v1.prodano]);
  test('C A (z1) zůstává, ukazuje dál na V1, nabídka odeslaná', vzZakaznik(z, 'z1').varianta === v1.id && vzStavNabidky(z, 'z1').stav === 'odeslana');
}

/* ---------- D) prodej zákazníkovi, kterému nabídka neodešla ---------- */
{
  const z = zakazka({ C: true });
  const v1 = z.varianty[0];
  tiskni(z, v1, 'z1');
  const p0 = JSON.stringify(z);
  const r = vzProdej(z, 'z2', DNES, CTX);
  test('D B (sdílí V1, ale nevytištěno jemu): prodej odmítnut, zakázka beze změny',
    !r.ok && /neodešla/.test(r.chyba) && JSON.stringify(z) === p0, r);
  const r2 = vzProdej(z, 'z3', DNES, CTX);
  test('D C s nezamčenou vlastní variantou: odmítnut (prodat jde jen odeslanou)', !r2.ok && /zamčenou|odeslanou/.test(r2.chyba), r2);
  /* server: podvržené prodano.zakaznik */
  const stara = kop(z);
  const zz = kop(z);
  zz.varianty[0].prodano = { datum: DNES, zakaznik: 'z2' };
  const e = prodServer(stara, zz, { email: 'autor@priklad.cz', role: 'Obchodník' }, { ted: Date.now() });
  test('D server: podvržené prodano.zakaznik (B, varianta mu neodešla) → 409', e && e.status === 409 && /odešla/.test(e.chyba), e);
  const zz2 = kop(z);
  zz2.varianty[0].prodano = { datum: DNES, zakaznik: 'z9' };
  const e2 = prodServer(stara, zz2, { email: 'autor@priklad.cz', role: 'Obchodník' }, { ted: Date.now() });
  test('D server: prodej neexistujícímu zákazníkovi → 400', e2 && e2.status === 400, e2);
  const zz3 = kop(z);
  zz3.varianty[0].prodano = { datum: DNES };
  const e3 = prodServer(stara, zz3, { email: 'autor@priklad.cz', role: 'Obchodník' }, { ted: Date.now() });
  test('D server: prodej bez zákazníka u víc zákazníků patří řídícímu (odešla mu) → zakaznik z1',
    e3 === null && zz3.varianty[0].prodano.zakaznik === 'z1' && vzRidiciId(zz3) === 'z1', [e3, zz3.varianty[0].prodano]);
}

/* ---------- E) server srovná sám; po prodeji; odemčení ---------- */
{
  const z = zakazka({ Bvlastni: true });
  const v1 = z.varianty[0], vB = varZ(z, 'z2');
  tiskni(z, v1, 'z1');
  tiskni(z, vB, 'z2');
  const stara = kop(z);
  /* starší klient: prodej B bez výměny řídícího */
  const zz = kop(z);
  zz.varianty.find(v => v.id === vB.id).prodano = { datum: DNES, zakaznik: 'z2' };
  const e = prodServer(stara, zz, { email: 'autor@priklad.cz', role: 'Obchodník' }, { ted: Date.now() });
  test('E server: prodej B bez výměny řídícího → server vymění sám (hlavička B, vzRidici z2, řídící varianta B)',
    e === null && vzRidiciId(zz) === 'z2' && zz.objednatel === UD.B.objednatel && zz.varianty.find(v => v.id === vB.id).ridici
    && zz.vzRidici.varianta === vB.id && vzSrovnej(zz).length === 0, [e, zz.vzRidici]);
  test('E server: razítka prodeje ze serveru, zakaznik zůstává', zz.varianty.find(v => v.id === vB.id).prodano.kdo === 'autor@priklad.cz'
    && zz.varianty.find(v => v.id === vB.id).prodano.zakaznik === 'z2');
  /* uložený prodej se nemění — zakaznik z uložené verze */
  const ulozena = kop(zz);
  const dalsi = kop(zz);
  dalsi.varianty.find(v => v.id === vB.id).prodano.zakaznik = 'z1';
  const e2 = prodServer(ulozena, dalsi, { email: 'autor@priklad.cz', role: 'Obchodník' }, { ted: Date.now() });
  test('E server: uložený prodej drží prodano.zakaznik z uložené verze (klient ho nepřepíše)',
    e2 === null && dalsi.varianty.find(v => v.id === vB.id).prodano.zakaznik === 'z2', dalsi.varianty.find(v => v.id === vB.id).prodano);
  /* klient: po prodeji */
  vzProdej(z, 'z2', DNES, CTX);
  test('E po prodeji: vzRidiciZamceno hlásí důvod', /prodaná/.test(vzRidiciZamceno(z)));
  test('E po prodeji: prodaného (B, teď řídící) nejde odstranit ani administrátorovi, A s odeslanou nabídkou jen administrátor',
    vzOdstranDuvod(z, 'z2', true) !== '' && !vzOdstran(kop(z), 'z2', {}).ok && /administrátor/.test(vzOdstranDuvod(z, 'z1', false)));
  const rid = vzRidiciId(z);
  prodOdemkni(z, vB, 'zkušební důvod');
  test('E odemčení prodeje řídícího NEVRACÍ (zůstává B), řídícího jde znovu přepnout',
    vzRidiciId(z) === rid && rid === 'z2' && vzRidiciZamceno(z) === '');
  /* server: ruční výměna řídícího u prodané zakázky */
  const s2 = kop(zz);
  const n2 = kop(zz);
  vzVymenRidiciho(n2, 'z1');
  const e3 = vzServerRidici(s2, n2, { email: 'autor@priklad.cz', role: 'Administrátor' }, {});
  test('E server: výměna řídícího u prodané zakázky → 409 i pro administrátora', e3 && e3.status === 409, e3);
}

/* ---------- E2) prodej STARŠÍ varianty, která zákazníkovi odešla (ukazuje už jinam) ---------- */
{
  const z = zakazka();
  const v1 = z.varianty[0];
  tiskni(z, v1, 'z1'); tiskni(z, v1, 'z2');                 // V1 odešla A i B
  const kl = klonujVariantu(z, v1.id, { aktivovat: false });   // B dostane vlastní (rozpracovanou) variantu
  z.dalsiZakaznici[0].varianta = kl.id;
  const stara = kop(z);
  const zz = kop(z);
  zz.varianty[0].prodano = { datum: DNES, zakaznik: 'z2' };
  const e = prodServer(stara, zz, { email: 'vedouci@priklad.cz', role: 'Vedoucí' }, { ted: Date.now() });
  test('E2 server: prodej V1 zákazníkovi B, který už ukazuje na vlastní V2 — řídící B, řídící varianta V1, vzRidici.varianta = V1 (invariant)',
    e === null && vzRidiciId(zz) === 'z2' && zz.varianty[0].ridici === true && zz.vzRidici.varianta === zz.varianty[0].id && vzSrovnej(zz).length === 0,
    [e, zz.vzRidici, zz.varianty.map(v => v.ridici)]);
  test('E2 server: výměna řídícího novým prodejem vedoucím (není autor) — vzServerRidici ji pustí (práva prodeje hlídá prodServer)',
    vzServerRidici(stara, zz, { email: 'vedouci@priklad.cz', role: 'Vedoucí' }, {}) === null
    && (vzServerRidici(stara, (() => { const y = kop(stara); vzVymenRidiciho(y, 'z2'); return y; })(), { email: 'vedouci@priklad.cz', role: 'Vedoucí' }, {}) || {}).status === 403);
}

/* ---------- F) doplněk 2: prodOciste propustí zakaznik ---------- */
{
  const p = prodOciste({ datum: '2026-11-16', kdo: 'a', kdy: 'b', zakaznik: 'z2', pipedrive: { stav: 'ceka', kdy: 'b' } });
  test('F prodOciste (obnova z otisku) propustí prodano.zakaznik', p && p.zakaznik === 'z2', p);
  const q = prodOciste({ datum: '2026-11-16', zakaznik: '<x>' });
  const q2 = prodOciste({ datum: '2026-11-16', zakaznik: { id: 'z2' } });
  test('F prodOciste: neplatný tvar zakaznik zahodí', q && !('zakaznik' in q) && q2 && !('zakaznik' in q2), [q, q2]);
  const r = prodOciste({ datum: '2026-11-16' });
  test('F prodOciste bez zakaznik: klíč nevznikne (jeden zákazník = dnešek)', r && !('zakaznik' in r), r);
  /* obnova z otisku přes prodServer */
  const z = zakazka({ Bvlastni: true });
  const vB = varZ(z, 'z2');
  tiskni(z, z.varianty[0], 'z1'); tiskni(z, vB, 'z2');
  vzProdej(z, 'z2', DNES, CTX);
  const zz = kop(z);
  const e = prodServer(null, zz, { email: 'spravce@priklad.cz', role: 'Administrátor' }, { obnova: true });
  test('F obnova z otisku (prodServer): prodano.zakaznik zůstane — E5b P1 má z čeho číst',
    e === null && zz.varianty.find(v => v.id === vB.id).prodano.zakaznik === 'z2', zz.varianty.find(v => v.id === vB.id).prodano);
}

/* ---------- G) prodJedinaZmena: prodej jinému zákazníkovi jen ke čtení ---------- */
{
  const z = zakazka({ Bvlastni: true });
  const vB = varZ(z, 'z2');
  tiskni(z, z.varianty[0], 'z1'); tiskni(z, vB, 'z2');
  const ulozeno = JSON.stringify(z);
  vzProdej(z, 'z2', DNES, CTX);
  test('G prodJedinaZmena: prodej B s výměnou řídícího = jediná změna (zámek čtení ho pustí)', prodJedinaZmena(JSON.stringify(z), ulozeno) === true);
  const z2 = JSON.parse(JSON.stringify(z));
  z2.dalsiZakaznici[0].hlavicka.kontakt = 'Jiná osoba';
  test('G prodJedinaZmena: prodej + jiná změna (kontakt dalšího zákazníka) = ne', prodJedinaZmena(JSON.stringify(z2), ulozeno) === false);
  const z3 = JSON.parse(ulozeno);
  vzVymenRidiciho(z3, 'z2');
  test('G prodJedinaZmena: výměna řídícího BEZ prodeje = ne (zámek čtení ji zastaví)', prodJedinaZmena(JSON.stringify(z3), ulozeno) === false);
}

/* ---------- H) zamekZakZmeny: výměna řídícího ---------- */
{
  const z = zakazka({ Bvlastni: true });
  const vB = varZ(z, 'z2');
  tiskni(z, z.varianty[0], 'z1'); tiskni(z, vB, 'z2');
  tiskni(z, z.varianty[0], 'z1', 'sod');                 // SoD řídícímu → hlavička zmrazená (poSod)
  z.varianty[0].data.kryci = { hodnoty: {}, zmrazeno: {} };   // KL zmrazený (zamekKryciOtevreny = false)
  const stara = kop(z);
  const n = kop(z);
  vzVymenRidiciho(n, 'z2');
  test('H zamekZakZmeny: výměna řídícího po SoD — údaje se jen přestěhují, žádná zmrazená cesta se „nezměnila"',
    zamekZakZmeny(stara, n).length === 0, zamekZakZmeny(stara, n));
  n.ico = '99998888';
  test('H zamekZakZmeny: změna IČO nového řídícího (B) po výměně se pozná, je-li hlavička zmrazená',
    zamekZakZmeny(stara, n).indexOf('ZAK.ico') >= 0, zamekZakZmeny(stara, n));
}

/* ---------- I) doplněk 3: vlastnictví po výměně řídícího ---------- */
{
  /* Tisk z doby jednoho zákazníka (bez razítka) → patří z1. */
  const z = zakazka({ B: false });
  const v1 = z.varianty[0];
  tiskni(z, v1, 'z1');
  test('I tisk z doby jednoho zákazníka nemá razítko', !('zakaznik' in v1.zamek.tisky[0]));
  vzPridej(z, UD.B, { kdo: 'test', kdy: TED, vlastni: true });
  const vB = varZ(z, 'z2');
  vB.data.kryci = { hodnoty: { kontaktZakaznikTel: 'TEL-A-1', rozsah: 'sdílený rozsah' } };   // hodnota z1 bez značky
  vzVymenRidiciho(z, 'z2');
  test('I výměna zafixovala vlastníka hodnoty pole zákazníka bez značky (z1), pole mimo zákazníka bez značky',
    vB.data.kryci.vzVlastnik && vB.data.kryci.vzVlastnik.kontaktZakaznikTel === 'z1' && !('rozsah' in vB.data.kryci.vzVlastnik), vB.data.kryci);
  test('I tisk bez razítka dál patří z1 (A), ne novému řídícímu B', vzOdeslanoKomu(z, 'z1') && !vzOdeslanoKomu(z, 'z2'));
  test('I odstranit z1 (poslední další, řídící není z1, něco odešlo) nejde — ani administrátor',
    /nevrátila|vrátila/.test(vzOdstranDuvod(z, 'z1', true)) && !vzOdstran(z, 'z1', {}).ok && vzRezim(z), vzOdstranDuvod(z, 'z1', true));
  /* server */
  const stara = kop(z);
  const n = kop(z);
  delete n.vzRidici; delete n.dalsiZakaznici;
  const e = vzServerKolaps(stara, n, {});
  test('I server: návrat k jednomu zákazníkovi (zbyde B) s odeslanou nabídkou → 409', e && e.status === 409, e);
  const n2 = kop(z);
  vzVymenRidiciho(n2, 'z1');
  n2.dalsiZakaznici = n2.dalsiZakaznici.filter(d => d.id !== 'z2'); delete n2.dalsiZakaznici; delete n2.vzRidici;
  test('I server: návrat k jednomu zákazníkovi, kterým je z1 (údaje sedí) → projde', vzServerKolaps(stara, n2, {}) === null);
  /* bez čehokoli odeslaného kolaps jde a hodnoty z1 nepřipadnou B */
  const y = zakazka({ B: false });
  vzPridej(y, UD.B, { kdo: 'test', kdy: TED });
  y.varianty[0].data.kryci = { hodnoty: { kontaktZakaznikTel: 'TEL-A-2', rozsah: 'sdílený' } };
  vzVymenRidiciho(y, 'z2');
  const r = vzOdstran(y, 'z1', {});
  test('I nic neodešlo: odstranění z1 po výměně projde, zbyde B jako jediný zákazník',
    r.ok && !vzRezim(y) && y.objednatel === UD.B.objednatel, r);
  test('I … a ruční hodnota pole zákazníka z1 mu nepřipadla (sdílené pole zůstalo)',
    !('kontaktZakaznikTel' in y.varianty[0].data.kryci.hodnoty) && y.varianty[0].data.kryci.hodnoty.rozsah === 'sdílený'
    && !('vzVlastnik' in y.varianty[0].data.kryci), y.varianty[0].data.kryci);
}

{
  /* Zakázka vyměněná PŘED E4 (bez fixace vlastníka): hodnota pole zákazníka
   * bez značky (= z1) nepřipadne B ani po návratu k jednomu zákazníkovi. */
  const y = zakazka({ B: false });
  vzPridej(y, UD.B, { kdo: 'test', kdy: TED });
  const puv = y.varianty[0].data.kryci = { hodnoty: {} };
  const k = kop(y);
  const r0 = vzVymenRidiciho(k, 'z2');
  k.varianty[0].data.kryci = { hodnoty: { kontaktZakaznikEmail: 'MAIL-A-BEZ-ZNACKY', rozsah: 'sdílený' } };   // stav bez fixace
  const r = vzOdstran(k, 'z1', {});
  test('I zakázka vyměněná bez fixace: po návratu k B hodnota z1 bez značky nepřipadne B (vzKlUklid)',
    r0.ok && r.ok && !('kontaktZakaznikEmail' in k.varianty[0].data.kryci.hodnoty) && k.varianty[0].data.kryci.hodnoty.rozsah === 'sdílený', k.varianty[0].data.kryci);
  void puv;
}

/* ---------- J) Z2: doklad z historie odemčení ---------- */
{
  const z = zakazka({ Bvlastni: true, C: true });
  const vB = varZ(z, 'z2');
  tiskni(z, vB, 'z2');
  odemkniVariantu(vB, { jeAdmin: true, duvod: 'oprava', kdo: 'spravce@priklad.cz' });
  test('J po odemčení: zámek pryč, razítko B je v historii odemčení', !variantaUzamcena(vB) && vzTiskyHistorie(vB).length === 1);
  test('J vzOdeslanoKdykoli(B) ano (vzOdeslanoKomu ne) → odstranit B smí jen administrátor',
    !vzOdeslanoKomu(z, 'z2') && vzOdeslanoKdykoli(z, 'z2') && /administrátor/.test(vzOdstranDuvod(z, 'z2', false)) && vzOdstranDuvod(z, 'z2', true) === '');
  vzOdstran(z, 'z2', { smazatVariantu: false });
  test('J po odstranění B se písmeno B ani id z2 neuvolní (razítko v historii)', vzPismenoDalsi(z) === 'D' && vzIdDalsi(z) === 'z4', [vzPismenoDalsi(z), vzIdDalsi(z)]);
  /* server N9 + odstranění z historie */
  const z2 = zakazka({ Bvlastni: true });
  const vB2 = varZ(z2, 'z2');
  tiskni(z2, vB2, 'z2');
  odemkniVariantu(vB2, { jeAdmin: true, duvod: 'oprava', kdo: 'spravce@priklad.cz' });
  const stara = kop(z2);
  const n = kop(z2);
  vzOdstran(n, 'z2', { smazatVariantu: false });
  const e = vzServerZakaznici(stara, n, { email: 'obchodnik@priklad.cz', role: 'Obchodník' }, {});
  test('J server: odstranění B s nabídkou v historii odemčení → 403 pro obchodníka', e && e.status === 403, e);
  const e2 = vzServerZakaznici(stara, n, { email: 'spravce@priklad.cz', role: 'Administrátor' }, {});
  test('J server: administrátor smí', e2 === null, e2);
  const n2 = kop(n);
  vzPridej(n2, UD.C, { kdo: 'test', kdy: TED });
  n2.dalsiZakaznici[0].id = 'z2'; n2.dalsiZakaznici[0].pismeno = 'B';
  const e3 = vzServerZakaznici(kop(n), n2, { email: 'spravce@priklad.cz', role: 'Administrátor' }, {});
  test('J server N9: nový zákazník s id/písmenem z historie odemčení → 400', e3 && e3.status === 400, e3);
}

/* ---------- K) Z1: KL v tiskovém pohledu jen s hodnotami svého zákazníka ---------- */
{
  const z = zakazka({ C: true });
  const v1 = z.varianty[0];
  v1.data.kryci = { hodnoty: { rozsah: 'SDILENY-ROZSAH' } };
  vzKlZapisRucni(v1.data.kryci, z, 'z1', 'kontaktZakaznikTel', 'KANA-TEL');
  vzKlZapisRucni(v1.data.kryci, z, 'z2', 'kontaktZakaznikTel', 'KANB-TEL');
  vzKlZapisRucni(v1.data.kryci, z, 'z3', 'kontaktZakaznikEmail', 'KANC-MAIL');
  v1.data.kryciProj = { hodnoty: {} };
  vzKlZapisRucni(v1.data.kryciProj, z, 'z3', 'kontaktZakaznikTel', 'KANC-PTEL');
  v1.data.kryci.zmrazeno = { zakaznik: 'KANA-ZMR', rozsah: 'SDILENY-ROZSAH' };
  const jB = JSON.stringify(vzTiskPohled(z, 'z2'));
  test('K JSON pohledu B nenese ruční hodnoty A ani C (hodnoty, hodnotyZakaznika, snímek zámku)',
    !/KANA|KANC/.test(jB) && /KANB-TEL/.test(jB) && /SDILENY-ROZSAH/.test(jB), (jB.match(/KAN[A-Z]-[A-Z]+/g) || []));
  const jA = JSON.stringify(vzTiskPohled(z, 'z1'));
  test('K JSON pohledu A nese své (i snímek zámku), ne B ani C', /KANA-TEL/.test(jA) && /KANA-ZMR/.test(jA) && !/KANB|KANC/.test(jA));
  test('K originál varianty beze změny (pohled je kopie)', v1.data.kryci.hodnotyZakaznika.z2.kontaktZakaznikTel === 'KANB-TEL'
    && v1.data.kryci.hodnoty.kontaktZakaznikTel === 'KANA-TEL');
  const z1 = zakazka({ B: false });
  test('K jeden zákazník: vzTiskPohled vrací TÝŽ objekt (dnešek)', vzTiskPohled(z1, '') === z1);
}

/* ---------- L) KL a SoD z pohledu prodaného, SoD jen odeslanému ---------- */
{
  const z = zakazka({ C: true });
  const v1 = z.varianty[0], vC = varZ(z, 'z3');
  tiskni(z, v1, 'z1');
  test('L SoD pro B (sdílí V1, nabídka mu neodešla) — zábrana', /Smlouvu o dílo jde vytvořit jen/.test(vzTiskZabrana(z, 'z2', v1, 'sod')));
  test('L SoD pro A (odešla mu) bez zábrany; krycí list pro B zábranu odeslání nemá',
    vzTiskZabrana(z, 'z1', v1, 'sod') === '' && vzTiskZabrana(z, 'z2', v1, 'kryci_bo') === '');
  tiskni(z, v1, 'z2');
  test('L po tisku CN pro B smí i SoD pro B', vzTiskZabrana(z, 'z2', v1, 'sod') === '');
  test('L neprodaná: dokument pro otevřeného', vzTiskKomuDokumentu(z, 'z3', v1, 'sod') === 'z3');
  vzProdej(z, 'z2', DNES, CTX);
  test('L prodaná V1 (B): KL a SoD vždy pro vítěze B (= řídící, id \'\'), nabídka pro otevřeného',
    vzTiskKomuDokumentu(z, 'z3', v1, 'sod') === '' && vzTiskKomuDokumentu(z, 'z1', v1, 'kryci_bo') === ''
    && vzTiskKomuDokumentu(z, 'z1', v1, 'nabidka') === 'z1' && vzTiskKomuDokumentu(z, 'z3', vC, 'sod') === 'z3');
  const p = vzTiskPohled(z, vzTiskKomuDokumentu(z, 'z1', v1, 'sod'), v1);
  test('L pohled SoD prodané varianty nese vítěze B', p.objednatel === UD.B.objednatel && p.vzPohledZakaznika.id === 'z2');
  test('L upozornění KL sdílené varianty (A + B), vlastní varianta C bez upozornění',
    /společná pro všechny/.test(vzKlSdilenaText(z, v1.id)) && vzKlSdilenaText(z, vC.id) === '');
  test('L jeden zákazník: upozornění žádné, komu beze změny', vzKlSdilenaText(zakazka({ B: false }), 'x') === ''
    && vzTiskKomuDokumentu(zakazka({ B: false }), '', null, 'sod') === '');
}

/* ---------- M) controlling: jeden řádek s řídícím (= vítězem) ---------- */
{
  const z = zakazka({ Bvlastni: true });
  const vB = varZ(z, 'z2');
  tiskni(z, z.varianty[0], 'z1'); tiskni(z, vB, 'z2'); tiskni(z, z.varianty[0], 'z2');
  vzProdej(z, 'z2', DNES, CTX);
  const filtr = ctrlHromadnyFiltr({ od: '2000-01-01', do: '2100-01-01', podle: 'prodej' });
  const r = ctrlHromadnyZakazka(z, filtr.filtr || filtr, { jekly: J });
  test('M controlling: zakázka = jeden výsledek, prodaná varianta vítěze, zákazník v hlavičce = vítěz B',
    r.ok && r.exp.hlavicka.zakaznik === UD.B.objednatel && r.exp.hlavicka.ridici === true, r.ok ? r.exp.hlavicka : r);
}

/* ---------- N) práva výměny řídícího ---------- */
{
  const z = zakazka();
  test('N vzRidiciSmiMenit: administrátor ano, autor ano, jiný obchodník ne',
    vzRidiciSmiMenit(z, { role: 'Administrátor', email: 'x@priklad.cz' }) && vzRidiciSmiMenit(z, { role: 'Obchodník', email: 'AUTOR@priklad.cz' })
    && !vzRidiciSmiMenit(z, { role: 'Vedoucí', email: 'jiny@priklad.cz' }));
  z.autor = 'pipedrive-webhook';
  test('N zakázka založená webhookem: jen administrátor', !vzRidiciSmiMenit(z, { role: 'Obchodník', email: 'pipedrive-webhook' })
    && vzRidiciSmiMenit(z, { role: 'Administrátor', email: 'a@priklad.cz' }));
  const s = zakazka(); const n = kop(s); vzVymenRidiciho(n, 'z2');
  test('N server: výměna bez prodeje — jiný obchodník 403, autor ok',
    (vzServerRidici(s, n, { role: 'Obchodník', email: 'jiny@priklad.cz' }, {}) || {}).status === 403
    && vzServerRidici(s, n, { role: 'Obchodník', email: 'autor@priklad.cz' }, {}) === null);
  test('N server: obnova a nová zakázka se nehlídají', vzServerRidici(s, n, { role: 'Obchodník', email: 'jiny@priklad.cz' }, { obnova: true }) === null
    && vzServerRidici(null, n, {}, {}) === null);
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
