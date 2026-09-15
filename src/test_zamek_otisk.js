/* ===== ODESLANÁ NABÍDKA SE UŽ NEPOČÍTÁ ZNOVU =====
 * (nálezy A1 a D1 z testování obchodníkem, 15. 9. 2026)
 *
 * Na 2025-OVP-CN-0356 vytiskl obchodník 4. 9. 2026 nabídku se ZAMĚŘENÍM za
 * 195 800 Kč. Dnes tatáž zamčená varianta ukazuje 208 104 Kč. Ceník se
 * nepřepočítal — zamčená varianta si svá data drží. Změnil se VZOREC: 8. 9.
 * 2026 se doprava přesunula do základu přirážky (nález V29) a rozdíl je
 * přesně doprava × procento sekce.
 *
 * Zmrazit data a nezmrazit vzorec je půlka zámku. `zamek.otisk` nesl jen
 * souhrnné částky, takže se rozdíl dal nanejvýš zahlédnout, ne mu zabránit.
 *
 * Rozhodnutí J. V. 15. 9. 2026: „potřebujeme uzamknout nabídku as is, jakoby
 * to bylo pdf. To znamená, že se už za žádných podmínek nezmění. Pokud
 * v mezičase dojde ke změnám výpočtu anebo ceníku, tak k tomu dojde pouze na
 * základě vytvoření varianty této nabídky, která se podle nových podmínek
 * přepočítá."
 *
 * Při prvním zamčení se proto bere CELÝ výsledek OCK i PROJ a k tomu kurz
 * EUR — bez něj by cizojazyčný dotisk téže nabídky nešel vyrobit (D1)
 * a doplnit ho už nelze, protože zamčená nabídka se nemění.
 *
 * CO TAHLE SADA NEDOKÁŽE: zaručit, že je nabídka zmrazená VŠUDE. Proto je
 * v oddílu 4 statický hlídač — žádná obrazovka ani generátor nesmí volat
 * `vypocet()` přímo. Kdo to udělá, obejde zámek bez varování, přesně jako
 * dosud.
 */
const fs = require('fs');
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');

global.DEFAULT_ZADANI = JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI));
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const engProj = require('./engine_proj.js');
global.DEFAULT_ZADANI_PROJ = JSON.parse(JSON.stringify(engProj.DEFAULT_ZADANI_PROJ));
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
global.DEFAULT_TECHSPEC = require('./techspec.js').DEFAULT_TECHSPEC;
global.vypocet = eng.vypocet;
global.vypocetProj = engProj.vypocetProj;
const zk = require('./zakazka.js');
Object.keys(zk).forEach(k => { global[k] = zk[k]; });
const zm = require('./zamek.js');
Object.keys(zm).forEach(k => { global[k] = zm[k]; });

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));

function zakazka() {
  const zak = zk.novaZakazka();
  const Z = zak.varianty[0].data.ock.zadani;
  Object.assign(Z, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  zak.varianty[0].data.cenik = ZC.zkusebniCenik();
  zak.varianty[0].data.proj.cenik = ZC.zkusebniCenikProj();
  return zak;
}
/* Zamčení tak, jak ho dělá zamekPoTisku: otisk se bere při PRVNÍM zamčení. */
function odesli(zak, v, opts) {
  const d = v.data;
  const o = opts || {};
  zm.zamkniVariantu(v, { typ: 'nabidkaTisk', kdo: 'DS', cislo: zm.variantaCislo(zak, v),
    vysledek: o.bezOtisku ? null : {
      ock: eng.vypocet(d.ock.zadani, d.cenik, JEKLY, d.ock.fixes),
      proj: engProj.vypocetProj(d.proj.zadani, d.proj.cenik),
      kurzEurKc: o.kurz || 0, build: 'zkusebni', kdy: new Date().toISOString(),
    } });
}

/* ---------- 1) otisk se bere a drží ---------- */
{
  const zak = zakazka(), v = zak.varianty[0];
  test('rozpracovaná varianta otisk výsledku nemá', zm.zamekVysledek(v) === null);
  const pred = zm.vypocetZ(v, JEKLY);
  test('a počítá se normálně', !!pred && !!pred.souhrn, !!pred);

  odesli(zak, v, { kurz: 25 });
  test('po odeslání otisk je', !!zm.zamekVysledek(v));
  test('a nese OCK i PROJ', !!zm.zamekVysledek(v).ock && !!zm.zamekVysledek(v).proj);
  test('a kurz EUR (D1)', zm.zamekVysledek(v).kurzEurKc === 25);
  /* Ptát se na uloženou hodnotu nestačí — dokument ji čte přes kurzEurZ()
   * a právě ta cesta musí zmrazený kurz upřednostnit. (Mutace „kurz se
   * nebere z otisku" mi napoprvé prošla, protože tenhle test chyběl.) */
  test('a dokument ho dostane přes kurzEurZ, ne z dnešního ceníku',
    zm.kurzEurZ(v, 99) === 25, zm.kurzEurZ(v, 99));
  test('a build, ať je dohledatelné, který kód to vydal', !!zm.zamekVysledek(v).build);
}

/* ---------- 2) jádro se změní, odeslaná nabídka ne (A1) ---------- */
{
  const zak = zakazka(), v = zak.varianty[0];
  odesli(zak, v, { kurz: 25 });
  const pri_odeslani = zm.vypocetZ(v, JEKLY).souhrn.zakladNaklad;

  /* Simulace změny vzorce — přesně to, co 8. 9. udělal nález V29. */
  const puvodni = global.vypocet;
  global.vypocet = (Z, C, J, f) => { const r = puvodni(Z, C, J, f); r.souhrn.zakladNaklad *= 2; return r; };
  try {
    test('odeslaná nabídka se po změně jádra NEZMĚNÍ',
      zm.vypocetZ(v, JEKLY).souhrn.zakladNaklad === pri_odeslani,
      [pri_odeslani, zm.vypocetZ(v, JEKLY).souhrn.zakladNaklad]);

    /* A rozpracovaná ANO — jinak by zmrazení bylo k ničemu. */
    const klon = zm.klonujVariantu(zak, v.id, { nazev: 'Varianta 2' });
    test('nová varianta se naopak přepočítá podle nových podmínek',
      zm.vypocetZ(klon, JEKLY).souhrn.zakladNaklad === pri_odeslani * 2,
      [pri_odeslani, zm.vypocetZ(klon, JEKLY).souhrn.zakladNaklad]);
  } finally { global.vypocet = puvodni; }
}

/* Totéž pro PROJ — tam nález A1 vlastně vznikl. */
{
  const zak = zakazka(), v = zak.varianty[0];
  odesli(zak, v, {});
  const pri_odeslani = JSON.stringify(zm.vypocetProjZ(v));
  const puvodni = global.vypocetProj;
  global.vypocetProj = (z, c) => { const r = puvodni(z, c); r.souhrn = { zmeneno: true }; return r; };
  try {
    test('odeslaná nabídka PROJ se po změně jádra NEZMĚNÍ',
      JSON.stringify(zm.vypocetProjZ(v)) === pri_odeslani);
  } finally { global.vypocetProj = puvodni; }
}

/* ---------- 3) otisk se nedá přepsat zvenčí ---------- */
{
  const zak = zakazka(), v = zak.varianty[0];
  odesli(zak, v, {});
  const r = zm.vypocetZ(v, JEKLY);
  r.souhrn.zakladNaklad = -1;                       // volající si do výsledku sahá (UI to dělá)
  test('sáhnutí do vráceného výsledku otisk nepoškodí',
    zm.vypocetZ(v, JEKLY).souhrn.zakladNaklad !== -1, zm.vypocetZ(v, JEKLY).souhrn.zakladNaklad);

  /* Druhý tisk téže varianty otisk NEPŘEPÍŠE — jinak by se čísla posunula
   * na dnešní při každém dotisku. */
  const pred = JSON.stringify(zm.zamekVysledek(v));
  zm.zamkniVariantu(v, { typ: 'nabidkaTisk', kdo: 'DS', vysledek: { ock: { podvrzeno: true } } });
  test('další tisk otisk nepřepíše', JSON.stringify(zm.zamekVysledek(v)) === pred);
  test('ale zapíše se do seznamu tisků', v.zamek.tisky.length === 2, v.zamek.tisky.length);
}

/* ---------- 4) starší odeslané nabídky (bez otisku) ---------- */
{
  const zak = zakazka(), v = zak.varianty[0];
  odesli(zak, v, { bezOtisku: true });       // přesně stav nabídek odeslaných před 15. 9. 2026
  test('zamčená varianta bez otisku se počítá dál', !!zm.vypocetZ(v, JEKLY));
  test('a zámek to ví', zm.variantaUzamcena(v) === true && zm.zamekVysledek(v) === null);
  test('kurz EUR spadne na ceník varianty', zm.kurzEurZ(v, 24) === 24);
}

/* ---------- 5) HLÍDAČ: nikdo nesmí obejít zámek přímým vypocet() ---------- */

const POVOLENO = {
  /* Jediné místo, kde jádro smí zaznít napřímo — právě tam se rozhoduje
   * mezi otiskem a výpočtem. */
  'src/zamek.js': ['vypocet(d.ock.zadani, d.cenik, jekly, d.ock.fixes)',
    'vypocetProj(d.proj.zadani, d.proj.cenik)'],
  /* Záložní větve pro sestavení bez zamek.js (Node testy jader). */
  'src/sluzba.js': ['vypocet(d.ock.zadani, d.cenik, jekly, d.ock.fixes)',
    'vypocetProj(d.proj.zadani, d.proj.cenik)'],
  'src/nabidka.js': ['vypocet(Zv, Cv, jekly, d.ock.fixes)'],
  'src/kryci.js': ['vypocet(Zv, Cv, jekly, d.ock.fixes)', 'vypocetProj(d.proj.zadani, d.proj.cenik)'],
  'src/nabidka_proj.js': ['vypocetProj(pj.zadani || DEFAULT_ZADANI_PROJ, pj.cenik || DEFAULT_CENIK_PROJ)'],
  /* vypocetAkt() a vypocetProjAkt() jsou ty přístupové body; uvnitř sebe
   * volají jádro a jinde v UI se jádro volat nesmí. */
  'src/ui/common.js': ['vypocet(Z, C, JEKLY, OCK.fixes)', 'vypocetProj(PJ, PC)',
    'vypocetProj(v.data.proj.zadani, v.data.proj.cenik)',
    'vypocet(v.data.ock.zadani, v.data.cenik, JEKLY, v.data.ock.fixes)'],
  'src/ui/schvalovani_ui.js': ['vypocet(v.data.ock.zadani, v.data.cenik, JEKLY, v.data.ock.fixes)',
    'vypocetProj(v.data.proj.zadani, v.data.proj.cenik)'],
  /* Předvyplnění ATYP pracuje jen nad editovatelnou variantou (zámek ho
   * nepustí), takže hodiny navíc smí počítat napřímo. */
  'src/ui/kalk_ock.js': ['vypocet(z, c, JEKLY, (d.ock || {})'],
};
const SOUBORY = ['src/ui/common.js', 'src/ui/detail_ui.js', 'src/ui/detail_proj_ui.js',
  'src/ui/kalk_ock.js', 'src/ui/kalk_proj.js', 'src/ui/kontroly_ui.js', 'src/ui/marze_ui.js',
  'src/ui/techspec_ui.js', 'src/ui/zaokrouhleni_ui.js', 'src/ui/schvalovani_ui.js',
  'src/nabidka.js', 'src/nabidka_proj.js', 'src/kryci.js', 'src/sluzba.js', 'src/zamek.js'];

SOUBORY.forEach(rel => {
  const txt = fs.readFileSync(__dirname + '/../' + rel, 'utf8');
  /* Jen skutečná volání, ne zmínky v komentářích. */
  const radky = txt.split('\n').filter(l => !/^\s*\*|^\s*\/\*|^\s*\/\//.test(l));
  const volani = [];
  radky.forEach(l => {
    const m = l.match(/(?<![\w.])vypocet(?:Proj)?\([^)]*\)/g);
    (m || []).forEach(x => volani.push(x));
  });
  const povolene = POVOLENO[rel] || [];
  const navic = volani.filter(x => povolene.indexOf(x) < 0);
  test('žádné obcházení zámku v ' + rel, navic.length === 0, navic);
});

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
