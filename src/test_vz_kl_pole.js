/* ============================================================
 * VZ-E2 (#601), revize U1 + U2 — RUČNÍ POLE ZÁKAZNÍKA V KRYCÍM LISTU SDÍLENÉ
 * VARIANTY. Ruční hodnoty a snímek zámku jsou data varianty; pole zákazníka
 * (sekce Zákazník a Zástupci, podpisy, kopie faktur, zmocnitel — zakaznikPole)
 * smí do dokumentu jen zákazníkovi, který je „vlastní" (podle id, ne písmene).
 *  1) kanárek v KAŽDÉM ručním poli zákazníka KL OCK i PROJ × A, B, C ×
 *     krycí list (Backoffice, Techdata) a symboly SoD / plné moci;
 *  2) snímek zámku (kryciZmrazPodminky nad celou zakázkou) = řídícího;
 *  3) výměna řídícího tam a zpět: B (jako řídící) ručně přepíše „Zákazník"
 *     a telefon → v dokumentech A nic z toho, u B se přepis projeví.
 * Pojistka: s vzKlVlastni = () => true (stav před revizí) sada selže
 * (kanárky A v dokumentech B a C) — běží v sadě jako „pojistka".
 * Spuštění: cd src && node test_vz_kl_pole.js
 * ============================================================ */
/* Moduly do `global` ve stejném pořadí jako CORE v build.py (jako test_vz_model.js). */
const fs = require('fs');
const path = require('path');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./preklad.js');
nacti('./format.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./vice_sachet.js');
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./zakazka.js');
nacti('./zamek.js');
nacti('./vice_zakazniku.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./ares.js');
nacti('./poznamky.js');
nacti('./protokol.js');
nacti('./firma.js');
nacti('./kryci.js');
nacti('./kryci_proj.js');
nacti('./nazvy_souboru.js');
nacti('./uloziste.js');
nacti('./nabidka.js');
nacti('./plan_plateb.js');
nacti('./nabidka_proj.js');

const JEKLY = JSON.parse(fs.readFileSync(path.join(__dirname, 'jekly.json'), 'utf8'));
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 500)); } };

const PEVNE = { kdo: 't@priklad.cz', kdy: '2026-11-16T10:00:00Z' };
const rucniOck = [], rucniProj = [];
KRYCI_SEKCE.forEach(s => s.pole.forEach(p => { if (p.zakaznikPole && !p.bind && !p.dphBind && !p.vypocet) rucniOck.push(p); }));
KRYCI_PROJ_SEKCE.forEach(s => s.pole.forEach(p => { if (p.zakaznikPole && !p.bind && !p.dphBind && !p.vypocet) rucniProj.push(p); }));
test('pole zákazníka označena (OCK ≥ 12, PROJ ≥ 12; i podpisy, kopie, zmocnitel)', rucniOck.length >= 12 && rucniProj.length >= 12
  && ['kontaktZakaznikTel', 'kontaktZakaznikEmail', 'objPodpis2Jmeno', 'objKopie1', 'objKopie2', 'scoring'].every(id => rucniOck.some(p => p.id === id))
  && ['pmZmocnitelNarozen', 'pmZmocnitelBytem', 'objPodpis2Funkce'].every(id => rucniProj.some(p => p.id === id))
  && !rucniProj.some(p => p.id === 'pmJednajici'), { ock: rucniOck.map(p => p.id), proj: rucniProj.map(p => p.id) });

function zakazka() {
  const z = novaZakazka();
  Object.assign(z, { cislo: '2026 - OPR - CN - 9940', objednatel: 'Alfa Zkus s.r.o.', ico: '27074358', nazevAkce: 'Akce', adresa: 'Stavba 1' });
  z.varianty[0].data.cenik = Object.assign(ZC.zkusebniCenik(), { kurzEurKc: 25 });
  vzPridej(z, { objednatel: 'Beta Zkus a.s.', ico: '25596641' }, PEVNE);
  vzPridej(z, { objednatel: 'Gama Zkus s.r.o.', ico: '00006947' }, Object.assign({ vlastni: true }, PEVNE));
  return z;
}
const kan = (p, kdo) => 'KAN' + kdo + p.id.toUpperCase() + 'X';
/* Zápis ruční hodnoty tak, jak ho dělá UI krycího listu (klSet / klpSet). */
function zapis(zak, v, p, hodnota, proj) {
  const d = v.data;
  const k = proj ? (d.kryciProj = d.kryciProj || { hodnoty: {} }) : (d.kryci = d.kryci || { hodnoty: {} });
  k.hodnoty = k.hodnoty || {};
  k.hodnoty[p.id] = hodnota;
  vzKlZapis(k, p.id, zak);
}
function vystupy(zak, id, v) {
  const p = vzTiskPohled(zak, id), vv = vzTiskVarianta(p, v);
  const t = [];
  for (const ver of ['bo', 'techdata']) { try { t.push(JSON.stringify(kryciData(p, vv, JEKLY, ver))); } catch (e) { t.push('CHYBA ' + e.message); } }
  try { t.push(JSON.stringify(kryciSodSymboly(p, vv, JEKLY, {}))); } catch (e) { t.push('CHYBA ' + e.message); }
  if (p.vzPohledZakaznika ? p.vzPohledZakaznika.ridici : true) {
    for (const ver of ['bo', 'techdata']) { try { t.push(JSON.stringify(kryciProjData(p, vv, JEKLY, ver))); } catch (e) { t.push('CHYBA ' + e.message); } }
    try { t.push(JSON.stringify(kryciProjSodSymboly(p, vv, {}))); } catch (e) { t.push('CHYBA ' + e.message); }
  }
  return t.join('\n');
}
const nalez = (txt, kdo) => (txt.match(new RegExp('KAN' + kdo + '[A-Z0-9]+X', 'g')) || []);

function beh(nazev) {
  const z = zakazka();
  const v1 = z.varianty.find(v => String(v.id) === vzRidiciVariantaId(z));
  const vC = z.varianty.find(v => String(v.id) === z.dalsiZakaznici[1].varianta);
  /* 1) A (řídící) vyplní ručně všechna pole zákazníka ve sdílené V1; C ve své V2. */
  rucniOck.forEach(p => zapis(z, v1, p, kan(p, 'A'), false));
  rucniProj.forEach(p => zapis(z, v1, p, kan(p, 'A'), true));
  rucniOck.forEach(p => zapis(z, vC, p, kan(p, 'C'), false));
  const tA = vystupy(z, 'z1', v1), tB = vystupy(z, 'z2', v1), tC = vystupy(z, 'z3', vC);
  test(nazev + 'A: vlastní ruční pole v KL i SoD (OCK i PROJ)', nalez(tA, 'A').length >= rucniOck.length && !/CHYBA/.test(tA), { n: nalez(tA, 'A').length, chyba: (tA.match(/CHYBA[^\n]*/) || [])[0] });
  test(nazev + 'B (sdílí V1): žádný ruční údaj A v KL ani SoD', !nalez(tB, 'A').length && !/CHYBA/.test(tB), nalez(tB, 'A'));
  /* Ruční hodnoty zapisuje UI krycího listu za ŘÍDÍCÍHO (vlastník z1) — i ve
   * vlastní variantě C; vlastní ruční hodnoty dalšího zákazníka přinese E3. */
  test(nazev + 'C: žádný ruční údaj A ani zápis za řídícího v jeho variantě (E3: vlastní ruční hodnoty)',
    !nalez(tC, 'A').length && !nalez(tC, 'C').length && tC.indexOf('Gama Zkus s.r.o.') >= 0, { a: nalez(tC, 'A'), c: nalez(tC, 'C') });
  test(nazev + 'A ani B nevidí údaje z varianty C', !nalez(tA, 'C').length && !nalez(tB, 'C').length);
  /* 2) Snímek zámku sdílené V1 (zamek_ui: nad celou zakázkou = řídící). */
  const tel = rucniOck.find(p => p.id === 'zakaznik');
  delete v1.data.kryci.hodnoty.zakaznik;
  kryciZmrazPodminky(z, v1, JEKLY);
  test(nazev + 'snímek zámku nese vlastníka z1 (řídící)', v1.data.kryci.vzZmrazeno === 'z1' && v1.data.kryci.zmrazeno.zakaznik === 'Alfa Zkus s.r.o.', v1.data.kryci);
  v1.zamek = { zamceno: true, tisky: [] };
  const tB2 = vystupy(z, 'z2', v1);
  test(nazev + 'zamčená V1: B má svého objednatele, ne snímek A', tB2.indexOf('Beta Zkus a.s.') >= 0 && tB2.indexOf('Alfa Zkus') < 0, (tB2.match(/Alfa Zkus[^"]*/g) || []).slice(0, 3));
  /* 3) Výměna řídícího na B, B ručně přepíše „Zákazník" a telefon, výměna zpět. */
  test(nazev + 'výměna na B', vzVymenRidiciho(z, 'z2').ok);
  const pZak = rucniOck.find(p => p.id === 'zakaznik'), pTel = rucniOck.find(p => p.id === 'kontaktZakaznikTel');
  zapis(z, v1, pZak, 'KANBZAKAZNIKX', false);
  zapis(z, v1, pTel, 'KANBKONTAKTZAKAZNIKTELX', false);
  /* … i v krycím listu PROJ (B je teď řídící — PROJ tiskne jen řídící). */
  const pTelP = rucniProj.find(p => p.id === 'kontaktZakaznikTel'), pZmP = rucniProj.find(p => p.id === 'pmZmocnitelNarozen');
  zapis(z, v1, pTelP, 'KANBPROJTELX', true);
  zapis(z, v1, pZmP, 'KANBPROJNAROZENX', true);
  const tBR = vystupy(z, 'z2', v1);
  test(nazev + 'B jako řídící: jeho ruční pole KL PROJ v PROJ dokumentech', tBR.indexOf('KANBPROJTELX') >= 0 && tBR.indexOf('KANBPROJNAROZENX') >= 0);
  test(nazev + 'přepis za řídícího B má vlastníka z2', v1.data.kryci.vzVlastnik.zakaznik === 'z2' && v1.data.kryci.vzVlastnik.kontaktZakaznikTel === 'z2');
  test(nazev + 'výměna zpět na A', vzVymenRidiciho(z, 'z1').ok);
  const tA3 = vystupy(z, 'z1', v1), tB3 = vystupy(z, 'z2', v1);
  test(nazev + 'po výměně tam a zpět: v dokumentech A nic z přepisu B', !nalez(tA3, 'B').length, nalez(tA3, 'B'));
  test(nazev + '… a u B se jeho přepis projeví', nalez(tB3, 'B').indexOf('KANBZAKAZNIKX') >= 0 && nalez(tB3, 'B').indexOf('KANBKONTAKTZAKAZNIKTELX') >= 0, nalez(tB3, 'B'));
  test(nazev + '… B dál bez ručních údajů A', !nalez(tB3, 'A').length, nalez(tB3, 'A'));
  return { tA, tB, tC };
}

beh('');
/* Jeden zákazník: žádný klíč vlastníka, výstup jako dřív. */
{
  const z = novaZakazka();
  Object.assign(z, { cislo: '2026 - OPR - CN - 9941', objednatel: 'Solo Zkus s.r.o.' });
  z.varianty[0].data.cenik = Object.assign(ZC.zkusebniCenik(), { kurzEurKc: 25 });
  const v = z.varianty[0];
  rucniOck.forEach(p => zapis(z, v, p, kan(p, 'S'), false));
  kryciZmrazPodminky(z, v, JEKLY);
  test('jeden zákazník: žádný vzVlastnik ani vzZmrazeno', !('vzVlastnik' in v.data.kryci) && !('vzZmrazeno' in v.data.kryci));
  test('jeden zákazník: vzTiskPohled = týž objekt, ruční pole v KL', vzTiskPohled(z, '') === z && nalez(vystupy(z, '', v), 'S').length >= rucniOck.length);
}
/* U3: pojistka přímo v generátorech — z celé zakázky s víc zákazníky hodí. */
{
  const z = zakazka();
  const v1 = z.varianty[0];
  const hodi = f => { try { f(); return false; } catch (e) { return /pohledu/.test(e.message); } };
  test('U3: nabidkaData z celé zakázky hodí', hodi(() => nabidkaData(z, v1, JEKLY, 'cz')));
  test('U3: kryciData z celé zakázky hodí', hodi(() => kryciData(z, v1, JEKLY, 'bo')));
  test('U3: nabidkaProjData z celé zakázky hodí', hodi(() => nabidkaProjData(z, v1, 'cz')));
  const p = vzTiskPohled(z, '');
  test('U3: z pohledu řídícího projdou', !hodi(() => nabidkaData(p, v1, JEKLY, 'cz')) && !hodi(() => kryciData(p, v1, JEKLY, 'bo')) && !hodi(() => nabidkaProjData(p, v1, 'cz')));
}
/* VZ-E3 (#602, doplněk U1): ruční hodnoty polí zákazníka PO ZÁKAZNÍCÍCH. */
{
  const z = zakazka();
  const v1 = z.varianty.find(v => String(v.id) === vzRidiciVariantaId(z));
  const kl = v1.data.kryci = v1.data.kryci || { hodnoty: {} };
  const tel = rucniOck.find(p => p.id === 'kontaktZakaznikTel');
  vzKlZapisRucni(kl, z, 'z1', tel.id, 'KANATELX');
  vzKlZapisRucni(kl, z, 'z2', tel.id, 'KANBTELX');
  test('U1: A v hodnoty (vlastník z1), B v hodnotyZakaznika.z2', kl.hodnoty[tel.id] === 'KANATELX' && kl.vzVlastnik[tel.id] === 'z1'
    && kl.hodnotyZakaznika.z2[tel.id] === 'KANBTELX', kl);
  const tA = vystupy(z, 'z1', v1), tB = vystupy(z, 'z2', v1);
  test('U1: A tiskne svůj telefon, ne B', tA.indexOf('KANATELX') >= 0 && tA.indexOf('KANBTELX') < 0);
  test('U1: B tiskne svůj telefon, ne A (sdílená varianta)', tB.indexOf('KANBTELX') >= 0 && tB.indexOf('KANATELX') < 0);
  vzKlZapisRucni(kl, z, 'z2', tel.id, 'KANBTEL2X');
  test('U1: přepis B zůstane u B', kl.hodnotyZakaznika.z2[tel.id] === 'KANBTEL2X' && kl.hodnoty[tel.id] === 'KANATELX');
  vzKlZapisRucni(kl, z, 'z2', tel.id, '');
  test('U1: smazání B uklidí klíč hodnotyZakaznika', !('hodnotyZakaznika' in kl) && kl.hodnoty[tel.id] === 'KANATELX', kl);
  /* B píše do pole, které A nemá → hodnoty s vlastníkem z2; A ho pak nevidí. */
  const em = rucniOck.find(p => p.id === 'kontaktZakaznikEmail');
  vzKlZapisRucni(kl, z, 'z2', em.id, 'KANBEMAILX');
  test('U1: volné pole vezme B (vlastník z2), A ho nevidí', kl.vzVlastnik[em.id] === 'z2' && vystupy(z, 'z1', v1).indexOf('KANBEMAILX') < 0
    && vystupy(z, 'z2', v1).indexOf('KANBEMAILX') >= 0);
  vzKlZapisRucni(kl, z, 'z1', em.id, 'KANAEMAILX');
  test('U1: A pak píše do téhož pole → hodnotyZakaznika.z1, B má dál svůj', kl.hodnotyZakaznika.z1[em.id] === 'KANAEMAILX'
    && vystupy(z, 'z2', v1).indexOf('KANBEMAILX') >= 0 && vystupy(z, 'z1', v1).indexOf('KANAEMAILX') >= 0);
  /* Zámek: volné pole zákazníka (telefon) se smí doplnit i po odeslání — porovnání ho přeskočí. */
  v1.zamek = { zamceno: true, tisky: [] };
  const pred = zamekDataPorovnani(v1.data, v1);
  vzKlZapisRucni(kl, z, 'z2', tel.id, 'KANBTEL3X');
  test('U1: po odeslání doplněný telefon B nemění porovnání zámku', zamekDataPorovnani(v1.data, v1) === pred);
  delete v1.zamek;
  /* Tvar a odstranění. */
  test('U1: tvar hodnotyZakaznika projde', !vzTvarProblemy(z).some(x => /hodnotyZakaznika/.test(x.kde)));
  kl.hodnotyZakaznika.zz = 'x';
  test('U1: vadné hodnotyZakaznika → vada tvaru', vzTvarProblemy(z).some(x => /hodnotyZakaznika/.test(x.kde)));
  delete kl.hodnotyZakaznika.zz;
  vzOdstran(z, 'z2', {});
  test('U1: odstranění B smaže jeho hodnoty z nezamčené varianty', !(kl.hodnotyZakaznika && kl.hodnotyZakaznika.z2));
}
{
  const z = novaZakazka();
  const kl = z.varianty[0].data.kryci = { hodnoty: {} };
  vzKlZapisRucni(kl, z, '', 'kontaktZakaznikTel', '123');
  test('U1: jeden zákazník — zápis jako dřív, žádný klíč navíc', JSON.stringify(kl) === JSON.stringify({ hodnoty: { kontaktZakaznikTel: '123' } }), kl);
}
/* V1 (dorevize E2): OBRAZOVKA krycího listu (kryci_ui.js klSet / klVal) píše
 * ruční pole zákazníka za OTEVŘENÉHO zákazníka — kanárek B se nesmí objevit u A. */
{
  const vm = require('vm');
  const z = zakazka();
  const v1 = z.varianty.find(v => String(v.id) === vzRidiciVariantaId(z));
  v1.data.kryci = v1.data.kryci || { hodnoty: {} };
  let otevreny = 'z2';
  if (typeof global.kryciPoleZakaznika !== 'function') global.kryciPoleZakaznika = id => KRYCI_SEKCE.some(s => s.pole.some(p => p.id === id && p.zakaznikPole));
  Object.assign(global, { ZAK: z, KL: v1.data.kryci, render: () => {}, aktivniVarianta: () => v1, vzTiskId: () => otevreny,
    vzTiskJinyZakaznik: () => otevreny !== 'z1' && otevreny !== '', vzTiskZakTicho: () => vzTiskPohled(z, otevreny) });
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'ui/kryci_ui.js'), 'utf8'), { filename: 'kryci_ui.js' });
  klSet('kontaktZakaznikTel', 'KANBOBRAZOVKAX');
  otevreny = '';
  klSet('kontaktZakaznikTel', 'KANAOBRAZOVKAX');
  const tA = vystupy(z, 'z1', v1), tB = vystupy(z, 'z2', v1);
  test('V1: obrazovka s otevřeným B → hodnota B jen v dokumentech B', tB.indexOf('KANBOBRAZOVKAX') >= 0 && tA.indexOf('KANBOBRAZOVKAX') < 0, { a: nalez(tA, 'B') });
  test('V1: obrazovka s řídícím → hodnota A jen v dokumentech A', tA.indexOf('KANAOBRAZOVKAX') >= 0 && tB.indexOf('KANAOBRAZOVKAX') < 0);
  otevreny = 'z2';
  test('V1: klVal/klManual u otevřeného B ukazují jeho hodnotu', klVal('kontaktZakaznikTel', 'x') === 'KANBOBRAZOVKAX' && klManual('kontaktZakaznikTel'));
  klReset('kontaktZakaznikTel');
  test('V1: ↺ u B smaže jen hodnotu B', klVal('kontaktZakaznikTel', 'PREF') === 'PREF' && vystupy(z, 'z1', v1).indexOf('KANAOBRAZOVKAX') >= 0);
  ['ZAK', 'KL', 'render', 'aktivniVarianta', 'vzTiskId', 'vzTiskJinyZakaznik', 'vzTiskZakTicho'].forEach(k => { delete global[k]; });
}
/* V2: volné texty krycího listu sdílené varianty hlídá zábrana cizího zákazníka. */
{
  const z = zakazka();
  const v1 = z.varianty.find(v => String(v.id) === vzRidiciVariantaId(z));
  v1.data.kryci = v1.data.kryci || { hodnoty: {} };
  v1.data.kryci.hodnoty.rozsah = 'Dodávka pro Beta Zkus a.s. včetně montáže';
  test('V2: rozsah KL s názvem B → tisk pro A zastaven', /Krycí list/.test(vzTiskZabrana(z, 'z1', v1, 'kryci_bo')));
  v1.data.kryci.hodnoty.rozsah = 'Dodávka včetně montáže';
  test('V2: neutrální rozsah → tisk projde', vzTiskZabrana(z, 'z1', v1, 'kryci_bo') === '');
}
/* V3: po odstranění posledního dalšího zákazníka žádná stopa v krycích listech (ani v klonu). */
{
  const z = novaZakazka();
  Object.assign(z, { cislo: '2026 - OPR - CN - 9942', objednatel: 'Alfa Zkus s.r.o.' });
  vzPridej(z, { objednatel: 'Beta Zkus a.s.' }, PEVNE);
  const v = z.varianty[0];
  const kl = v.data.kryci = { hodnoty: {} };
  vzKlZapisRucni(kl, z, 'z1', 'kontaktZakaznikTel', '111');
  vzKlZapisRucni(kl, z, 'z2', 'kontaktZakaznikTel', '222');
  vzKlZapisRucni(kl, z, 'z2', 'kontaktZakaznikEmail', 'KANBEMAILX');
  kl.vzZmrazeno = 'z1';
  vzOdstran(z, 'z2', {});
  test('V3: po odstranění posledního jen hodnoty řídícího, žádný klíč VZ', JSON.stringify(kl) === JSON.stringify({ hodnoty: { kontaktZakaznikTel: '111' } }), kl);
  /* Klon dokladu z doby víc zákazníků u jednoho zákazníka. */
  const zam = z.varianty[0];
  zam.data.kryci.vzVlastnik = { kontaktZakaznikTel: 'z1' }; zam.data.kryci.vzZmrazeno = 'z1';
  zam.data.kryci.hodnotyZakaznika = { z2: { kontaktZakaznikTel: '222' } };
  const k = klonujVariantu(z, zam.id, { aktivovat: false });
  test('V3: klon u jednoho zákazníka bez vzVlastnik / vzZmrazeno / hodnotyZakaznika',
    !('vzVlastnik' in k.data.kryci) && !('vzZmrazeno' in k.data.kryci) && !('hodnotyZakaznika' in k.data.kryci) && k.data.kryci.hodnoty.kontaktZakaznikTel === '111', k.data.kryci);
}
/* POJISTKA: stav před revizí (vlastník se nekontroluje) — detektor musí únik najít. */
{
  /* E3 (U1): čtení jde přes vzKlRucni — podvrhnout obě kontroly vlastníka. */
  const puv = global.vzKlVlastni, puvR = global.vzKlRucni;
  global.vzKlVlastni = () => true;
  /* VZ-E4 Z1: tiskový pohled čistí cizí ruční hodnoty i sám — stav před E4
   * = kopie varianty s daty skutečné varianty (všechny ruční hodnoty). */
  const puvTP = global.vzTiskPohled;
  global.vzTiskPohled = (zz, id, vv) => {
    const p = puvTP(zz, id, vv);
    if (p && Array.isArray(p.varianty)) p.varianty = p.varianty.map(x => {
      const r = zz.varianty.find(y => y.id === x.id); return r ? Object.assign({}, x, { data: r.data }) : x; });
    return p;
  };
  global.vzKlRucni = (kl, id, pole) => { const h = kl && kl.hodnoty ? kl.hodnoty[pole] : undefined; return h === '' ? undefined : h; };
  const ok0 = ok, fail0 = fail;
  const z = zakazka();
  const v1 = z.varianty.find(v => String(v.id) === vzRidiciVariantaId(z));
  rucniOck.forEach(p => zapis(z, v1, p, kan(p, 'A'), false));
  const tB = vystupy(z, 'z2', v1);
  global.vzKlVlastni = puv; global.vzKlRucni = puvR; global.vzTiskPohled = puvTP;
  ok = ok0; fail = fail0;
  test('pojistka: bez kontroly vlastníka se ruční údaje A u B objeví (detektor zabírá)', nalez(tB, 'A').length > 0, nalez(tB, 'A').length);
}

console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
process.exit(fail ? 1 : 0);
