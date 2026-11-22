/* ============================================================
 * #673 (VZ-F2-R1) — TEST ÚNIKU: suchý běh zápisu do Pipedrive (pdnPodklad)
 * nesmí nést ruční pole krycích listů DALŠÍHO zákazníka jako údaje řídící
 * varianty. Data pro Pipedrive jdou vždy za řídícího zákazníka.
 *
 * Zakázka: A = z1 řídící (varianta V1), B = z2 sdílí V1, C = z3 vlastní V2.
 * Do krycích listů V1 (OCK i PROJ) zapíše B své ruční hodnoty polí zákazníka
 * (vzKlZapisRucni s id z2) — kopie faktur, podpisy, zmocnitel plné moci —
 * jednou do volného pole (→ `hodnoty` + `vzVlastnik`) a jednou do pole, které
 * už má A (→ `hodnotyZakaznika.z2`). Kanárek „ZPD<zákazník><n>X".
 * Kontrola: celý podklad (JSON i tělo pdnTelo) neobsahuje kanárek B ani C;
 * hodnoty A v podkladu JSOU (detektor není prázdný). Řídící = B (po výměně)
 * → v podkladu jsou hodnoty B, ne A. Jeden zákazník → podklad beze změny
 * (tytéž hodnoty jako surová zakázka).
 *
 * POJISTKA: před opravou (pdnPodklad ze surové zakázky) selžou testy
 * „bez kanárku B" (OCK objKopie1, PROJ pmZmocnitel) a „po výměně řídícího".
 * Spuštění: node src/test_vzd_pd_unik.js
 * ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');

const CORE = ['build_info.js', 'nazvy_souboru.js', 'preklad.js', 'format.js', 'engine.js', 'vice_sachet.js', 'engine_proj.js', 'techspec.js',
  'zakazka.js', 'uloziste.js', 'retence_zaloh.js', 'zamek.js', 'vice_zakazniku.js', 'vz_poznamka.js', 'seznam.js', 'archiv.js', 'docxgen.js', 'xlsx.js',
  'dokumenty.js', 'sleva.js', 'schvalovani.js', 'zaokrouhleni.js', 'marze.js', 'kontroly.js', 'ares.js', 'poznamky.js', 'protokol.js', 'firma.js',
  'zpracovatel.js', 'podminky.js', 'plan_plateb.js', 'nabidka.js', 'nabidka_proj.js', 'sod.js', 'kryci.js', 'kryci_proj.js',
  'objednane.js', 'controlling.js', 'zakaznici.js', 'pd_nanecisto.js'];
CORE.forEach(f => { const m = require(path.join(__dirname, f)); if (m && typeof m === 'object') Object.assign(global, m); });
const ZC = require('./zkusebni_cenik.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const JEKLY = JSON.parse(fs.readFileSync(path.join(__dirname, 'jekly.json'), 'utf8'));

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + (info === undefined ? '' : '  ' + JSON.stringify(info).slice(0, 700))); } };
const J = o => JSON.parse(JSON.stringify(o));
const KAN = (p, n) => 'ZPD' + p + n + 'X';
const PEVNE = { kdo: 'pd673@priklad.cz', kdy: '2026-11-21T10:00:00.000Z' };

function zakazka(dalsi) {
  const zak = novaZakazka();
  Object.assign(zak, { objednatel: 'Alfa zkušební s.r.o.', adresaObjednatele: 'Zkušební 1, 110 00 Praha', ico: '27182818', kontakt: 'Ivo Alfa' });
  zak.nazevAkce = 'Bytový dům Zkušební';
  zak.datum = '2026-11-21';
  const v1 = zak.varianty[0];
  Object.assign(v1.data.ock.zadani, { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 });
  v1.data.kryci = { hodnoty: {} };
  v1.data.kryciProj = { hodnoty: {} };
  if (dalsi) {
    const rB = vzPridej(zak, { objednatel: 'Beta zkušební a.s.', ico: '16180339', kontakt: 'Eva Beta' }, Object.assign({}, PEVNE));
    const rC = vzPridej(zak, { objednatel: 'Gama zkušební s.r.o.', ico: '46692016', kontakt: 'Jan Gama' }, Object.assign({ vlastni: true }, PEVNE));
    if (!rB.ok || !rC.ok) throw new Error('vzPridej: ' + (rB.chyba || rC.chyba));
  }
  return zak;
}
/* Ruční hodnoty: A (z1) objKopie2 + pmZmocnitel; B (z2) objKopie1 (volné → hodnoty
 * s vlastníkem z2), objKopie2 a pmZmocnitel (obsazené A → hodnotyZakaznika.z2),
 * pmZmocnitelBytem (volné). C (z3) do své V2 i do V1 (hodnotyZakaznika.z3). */
function vyplnRucni(zak) {
  const v1 = zak.varianty[0];
  const k = v1.data.kryci, kp = v1.data.kryciProj;
  vzKlZapisRucni(k, zak, 'z1', 'objKopie2', KAN('A', 1));
  vzKlZapisRucni(kp, zak, 'z1', 'pmZmocnitel', KAN('A', 2));
  vzKlZapisRucni(k, zak, 'z2', 'objKopie1', KAN('B', 1));
  vzKlZapisRucni(k, zak, 'z2', 'objKopie2', KAN('B', 2));
  vzKlZapisRucni(kp, zak, 'z2', 'pmZmocnitel', KAN('B', 3));
  vzKlZapisRucni(kp, zak, 'z2', 'pmZmocnitelBytem', KAN('B', 4));
  vzKlZapisRucni(kp, zak, 'z3', 'objPodpis2Jmeno', KAN('C', 1));
  const v2 = zak.varianty.find(v => v.id === vzZakaznik(zak, 'z3').varianta);
  v2.data.kryci = { hodnoty: { objKopie1: KAN('C', 2) } };
}
const text = o => JSON.stringify(o);

/* ---------- 1) tři zákazníci, řídící A ---------- */
{
  const zak = zakazka(true);
  vyplnRucni(zak);
  /* předpoklad: data opravdu leží tak, jak je píše UI */
  test('předpoklad: B objKopie1 v kl.hodnoty s vlastníkem z2', zak.varianty[0].data.kryci.hodnoty.objKopie1 === KAN('B', 1)
    && zak.varianty[0].data.kryci.vzVlastnik.objKopie1 === 'z2');
  test('předpoklad: B pmZmocnitel v hodnotyZakaznika.z2', zak.varianty[0].data.kryciProj.hodnotyZakaznika.z2.pmZmocnitel === KAN('B', 3));
  const pred = text(zak);
  const p = pdnPodklad(zak, JEKLY, { viceZakazniku: false });
  test('podklad ok, obě strany (bez čísla nabídky)', p.ok && p.strany.ock && p.strany.proj, p);
  const t = text(p) + text(pdnTelo(p));
  ['B1', 'B2', 'B3', 'B4', 'C1', 'C2'].forEach(c => test('bez kanárku ' + c + ' (ruční pole jiného zákazníka)', t.indexOf(KAN(c[0], c[1])) < 0));
  test('OCK: hodnota objKopie1 není B', p.strany.ock.hodnoty.objKopie1 !== KAN('B', 1), p.strany.ock.hodnoty.objKopie1);
  test('PROJ: zmocnitel = A (ne B)', p.strany.proj.hodnoty.pmZmocnitel === KAN('A', 2), p.strany.proj.hodnoty.pmZmocnitel);
  test('OCK: objKopie2 = A (detektor není prázdný)', p.strany.ock.hodnoty.objKopie2 === KAN('A', 1), p.strany.ock.hodnoty.objKopie2);
  test('rucne OCK nese A, ne B', p.strany.ock.rucne.objKopie2 === KAN('A', 1) && p.strany.ock.rucne.objKopie1 === undefined, p.strany.ock.rucne);
  test('rucne PROJ nese zmocnitele A', p.strany.proj.rucne.pmZmocnitel === KAN('A', 2) && p.strany.proj.rucne.pmZmocnitelBytem === undefined, p.strany.proj.rucne);
  test('zakázka se podkladem nezměnila', text(zak) === pred);
}

/* ---------- 2) výměna řídícího: řídící B → hodnoty B, ne A ---------- */
{
  const zak = zakazka(true);
  vyplnRucni(zak);
  const r = vzVymenRidiciho(zak, 'z2', PEVNE);
  test('předpoklad: řídící je B', r && r.ok !== false && vzRidiciId(zak) === 'z2', r);
  const p = pdnPodklad(zak, JEKLY, { viceZakazniku: false });
  const t = text(p);
  test('po výměně: bez kanárků A (A1, A2)', t.indexOf(KAN('A', 1)) < 0 && t.indexOf(KAN('A', 2)) < 0);
  test('po výměně: zmocnitel = B', p.strany.proj && p.strany.proj.hodnoty.pmZmocnitel === KAN('B', 3), p.strany.proj && p.strany.proj.hodnoty.pmZmocnitel);
  test('po výměně: objKopie1 = B', p.strany.ock && p.strany.ock.hodnoty.objKopie1 === KAN('B', 1), p.strany.ock && p.strany.ock.hodnoty.objKopie1);
  test('po výměně: rucne PROJ nese B (hodnotyZakaznika)', p.strany.proj && p.strany.proj.rucne.pmZmocnitel === KAN('B', 3), p.strany.proj && p.strany.proj.rucne);
}

/* ---------- 3) jeden zákazník: beze změny ---------- */
{
  const zak = zakazka(false);
  zak.varianty[0].data.kryci.hodnoty.objKopie1 = KAN('A', 9);
  zak.varianty[0].data.kryciProj.hodnoty.pmZmocnitel = KAN('A', 8);
  const z = pdnPohledRidiciho(zak, zak.varianty[0]);
  test('jeden zákazník: tytéž objekty', z.zak === zak && z.v === zak.varianty[0]);
  const p = pdnPodklad(zak, JEKLY, { viceZakazniku: false });
  test('jeden zákazník: ruční hodnoty v podkladu', p.strany.ock.hodnoty.objKopie1 === KAN('A', 9) && p.strany.proj.hodnoty.pmZmocnitel === KAN('A', 8));
  test('jeden zákazník: rucne = kl.hodnoty', text(p.strany.ock.rucne) === text(zak.varianty[0].data.kryci.hodnoty));
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
