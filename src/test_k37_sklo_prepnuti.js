/* ===== K37-N1: VYŘAZENÉ SKLO BOKŮ PO PŘEPNUTÍ TYPU ŠACHTY =====
 * (kolo 37, test v27.10.6, 2. 11. 2026)
 *
 * Řádek skla boků se jmenuje podle typu šachty („(dvojsklo …)" u exteriérové,
 * „(VSG 4.4.2)" u interiérové) a vyřazení i ruční přepisy se klíčují názvem.
 * Na nový název je přemapovalo jen otevření zakázky (importZakazka →
 * skloMigraceNazvu). Po typSachtyPrepni se proto vyřazené sklo znovu
 * počítalo (cena o stovky tisíc výš, vytištěná nabídka ji nesla) a po
 * znovuotevření se zase vyřadilo — ověření zámku pak hlásilo „nesouhlasí".
 *
 * Sada volá SKUTEČNÉ typSachtyPrepni (ui/kalk_ock.js) a skloMigraceAkt
 * (ui/common.js) — vyříznuté ze zdrojáku, ve vm s ostatním UI jako
 * náhražkami — a porovná řádek čísel s kulatou cestou export → importZakazka.
 * Oba směry, s přepisem množství i bez. Ostatní cesty (zasklení, řada
 * ceníku, název v ceníku, syncVarianta) ověřuje prohlížeč: overit_k37_sklo.mjs.
 *
 * POJISTKA: nad v27.10.6 (bez skloMigraceAkt) sada selže (8 FAIL); hlídají
 * ji mutace „K37-N1" v mutace_jadro.mjs.
 */
const fs = require('fs');
const vm = require('vm');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
const eng = nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
const zk = require('./zakazka.js');
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};

/* Vyřízne `function jmeno(…) { … }` ze zdrojáku (párování složených závorek;
 * obě funkce nemají závorky v řetězcích ani regulárních výrazech). */
function vyrizni(soubor, jmeno) {
  const t = fs.readFileSync(__dirname + '/' + soubor, 'utf8');
  const i = t.indexOf('function ' + jmeno + '(');
  if (i < 0) return '';
  let h = 0, j = t.indexOf('{', i);
  for (; j < t.length; j++) {
    if (t[j] === '{') h++;
    else if (t[j] === '}' && --h === 0) break;
  }
  return t.slice(i, j + 1);
}
const fPrepni = vyrizni('ui/kalk_ock.js', 'typSachtyPrepni');
const fMigrace = vyrizni('ui/common.js', 'skloMigraceAkt');
test('typSachtyPrepni je v ui/kalk_ock.js', !!fPrepni);
test('skloMigraceAkt je v ui/common.js', !!fMigrace);

const radek = (zak) => {
  const v = zk.aktivniVarianta(zak);
  const r = eng.vypocet(v.data.ock.zadani, v.data.cenik, JEKLY, v.data.ock.fixes);
  return JSON.stringify({ sekce: r.souctySekci, souhrn: r.souhrn });
};

function pripad(odkud, kam, sPrepisem) {
  const zak = zk.novaZakazka();
  const v = zk.aktivniVarianta(zak);
  const Z = v.data.ock.zadani;
  /* Nová zakázka má prázdné rozměry (množství skla 0) — rozměry ukázkové šachty. */
  ['prejezd', 'zdvih', 'prohluben', 'sirka', 'hloubka', 'roztec', 'nastupiste'].forEach(k => { Z[k] = eng.DEFAULT_ZADANI[k]; });
  Z.typSachty = odkud;
  Z.profily = JSON.parse(JSON.stringify(eng.PROFILY_VYCHOZI[odkud]));
  const boky = eng.skloVolba(Z, v.data.cenik).boky.nazev;
  /* Množství skla boků v CÍLOVÉM typu (bez vyřazení) — kdyby bylo nulové,
   * porovnání řádku čísel by nic neověřilo. */
  const zCil = Object.assign(JSON.parse(JSON.stringify(Z)), { typSachty: kam });
  const rCil = eng.vypocet(zCil, v.data.cenik, JEKLY, v.data.ock.fixes);
  const mCil = (JSON.stringify(rCil).match(/"nazev":"MATERIÁL boční[^}]*?"mnozstviAuto":([0-9.]+)/) || [])[1];
  Z.nepocitat = [boky];
  if (sPrepisem) Z.mnozstviPrepis = { [boky]: 3 };
  /* UI kolem: set zapíše cestu, syncVarianta/render nic (jejich migraci ověřuje
   * prohlížeč) — tady se hlídá, že typSachtyPrepni migruje SÁM. */
  const ctx = {
    ZAK: zak, Z, C: v.data.cenik, PROFILY_VYCHOZI: eng.PROFILY_VYCHOZI,
    aktivniVarianta: zk.aktivniVarianta, skloMigraceNazvu: eng.skloMigraceNazvu,
    variantaUzamcena: () => false, JSON,
    set: (cesta, h) => { if (cesta === 'Z.typSachty') Z.typSachty = h; },
    progZprava: () => {}, standardAtypAutomat: () => {}, syncVarianta: () => {}, render: () => {},
  };
  vm.createContext(ctx);
  vm.runInContext(fMigrace + '\n' + fPrepni + '\n typSachtyPrepni(' + JSON.stringify(kam) + ');', ctx);
  const novy = eng.skloVolba(Z, v.data.cenik).boky.nazev;
  const po = radek(zak);
  const kulata = radek(zk.importZakazka(JSON.parse(JSON.stringify(zak))));
  const popis = odkud.slice(0, 3) + ' → ' + kam.slice(0, 3) + (sPrepisem ? ' (s přepisem množství)' : '');
  test(popis + ': název skla boků se změnil', boky !== novy, [boky, novy]);
  test(popis + ': sklo boků má v cílovém typu nenulové množství (porovnání má smysl)', +mCil > 0, mCil);
  test(popis + ': řádek čísel po přepnutí = po kulaté cestě export → importZakazka', po === kulata, { po, kulata });
  test(popis + ': sklo boků zůstalo vyřazené pod novým názvem', (Z.nepocitat || []).includes(novy), Z.nepocitat);
  if (sPrepisem) test(popis + ': přepis množství přešel na nový název', Z.mnozstviPrepis[novy] === 3, Z.mnozstviPrepis);
}

pripad('interiérová', 'exteriérová', false);
pripad('exteriérová', 'interiérová', false);
pripad('interiérová', 'exteriérová', true);

/* Zamčené varianty se migrace nedotkne (data odeslané nabídky se nemění). */
{
  const zak = zk.novaZakazka();
  const v = zk.aktivniVarianta(zak);
  v.data.ock.zadani.nepocitat = ['MATERIÁL boční + zadní stěna (něco)'];
  const ctx = { ZAK: zak, aktivniVarianta: zk.aktivniVarianta, skloMigraceNazvu: eng.skloMigraceNazvu, variantaUzamcena: () => true };
  vm.createContext(ctx);
  const n = vm.runInContext(fMigrace + '\n skloMigraceAkt();', ctx);
  test('zamčená varianta: skloMigraceAkt nic nemění', n === 0
    && v.data.ock.zadani.nepocitat[0] === 'MATERIÁL boční + zadní stěna (něco)', v.data.ock.zadani.nepocitat);
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
