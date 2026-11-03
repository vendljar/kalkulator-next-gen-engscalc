/* ===== ZO #555: TISK KLONU ODESLANÉ NABÍDKY — „změnila by se data uzamčené
 * nabídky" (hlášení J. V. 3. 11. 2026, test v2.11.9) =====
 *
 * Příčina: na odeslané (zamčené) variantě je výběr „Typ šachty" aktivní.
 * `set('Z.typSachty')` změnu odmítne a jen NABÍDNE klon (dialog doběhne
 * později), jenže typSachtyPrepni pak dosadil výchozí profily nového typu
 * přímo do zadání odeslané varianty. Klon vznikl ze změněných dat a uložení
 * po tisku klonu server odmítl. Celý tok v prohlížeči: overit_klon_tisk.mjs.
 *
 * Tady rychle (bez prohlížeče):
 *   1) SKUTEČNÉ typSachtyPrepni (vyříznuté z ui/kalk_ock.js, ve vm) — když
 *      `set` typ nezmění (zamčená varianta / jen ke čtení), nezmění se nic;
 *      u editovatelné varianty se profily dosadí dál;
 *   2) zamekDataRozdilCesta (src/zamek.js) — první rozdílná cesta pro hlášku
 *      serveru, bez hodnot; volná pole krycího listu a DPH po CN rozdíl nejsou;
 *   3) zamekDataPorovnani — povolená změna DPH po CN i se značkou
 *      „nastaveno ručně" (cenikRucni) porovnání nemění; bez snímku mění.
 *
 * POJISTKA: nad 6e4bf49 (v3.11.1) sada selže (viz commit); hlídají ji mutace
 * „#555" v mutace_jadro.mjs.
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
nacti('./podminky.js');
const FM = nacti('./firma.js');
nacti('./plan_plateb.js');
const zk = nacti('./zakazka.js');
const zm = nacti('./zamek.js');
nacti('./kryci.js');
nacti('./kryci_proj.js');
global.NAST = { firma: FM.firmaDefault() };
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};
const kopie = x => JSON.parse(JSON.stringify(x));

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
test('typSachtyPrepni je v ui/kalk_ock.js', !!fPrepni);

/* Odeslaná nabídka: exteriérová šachta s výchozími profily, zámek se snímkem. */
function odeslana() {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 8761';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, typSachty: 'exteriérová' });
  v.data.ock.zadani.profily = kopie(eng.PROFILY_VYCHOZI['exteriérová']);
  v.data.cenik = Object.assign(v.data.cenik, ZC.zkusebniCenik());
  zm.zamkniVariantu(v, { cislo: zm.variantaCislo(z, v), typ: 'nabidkaTisk', kdy: new Date().toISOString(),
    vysledek: zm.zamekVysledekSpocti(v, JEKLY, 'test'), snimek: zm.zamekSnimekSpocti(v) });
  return z;
}

/* typSachtyPrepni ve vm: `set` jako v aplikaci — u needitovatelné varianty
 * nezapíše nic (zamekStop/zamekCteniStop jen nabídnou klon / odemčení). */
function prepni(z, typ, editovatelna) {
  const v = zk.aktivniVarianta(z);
  const Z = v.data.ock.zadani;
  const volano = [];
  const ctx = {
    ZAK: z, Z, PROFILY_VYCHOZI: eng.PROFILY_VYCHOZI, JSON,
    set: (cesta, h) => { volano.push('set'); if (editovatelna && cesta === 'Z.typSachty') Z.typSachty = h; },
    leseniHlavaPodleTypu: () => volano.push('leseni'), progZprava: () => {},
    standardAtypAutomat: () => volano.push('atyp'), skloMigraceAkt: () => volano.push('sklo'),
    syncVarianta: () => {}, render: () => {},
  };
  vm.createContext(ctx);
  vm.runInContext(fPrepni + '\n typSachtyPrepni(' + JSON.stringify(typ) + ');', ctx);
  return volano;
}

/* 1) typSachtyPrepni */
{
  const z = odeslana();
  const pred = JSON.stringify(z.varianty[0].data);
  test('(výchozí profily obou typů se liší)', JSON.stringify(eng.PROFILY_VYCHOZI['exteriérová']) !== JSON.stringify(eng.PROFILY_VYCHOZI['interiérová']));
  const volano = prepni(z, 'interiérová', false);
  test('#555: zamčená varianta — typSachtyPrepni nedosadí profily (data beze změny)',
    JSON.stringify(z.varianty[0].data) === pred, z.varianty[0].data.ock.zadani.profily);
  test('#555: zamčená varianta — po odmítnutém set nic dalšího (lešení, ATYP, sklo)',
    volano.join(',') === 'set', volano);
  const z2 = odeslana(); z2.varianty[0].zamek = null;
  const volano2 = prepni(z2, 'interiérová', true);
  const Z2 = z2.varianty[0].data.ock.zadani;
  test('editovatelná varianta — typ i výchozí profily interiérové šachty dosazeny',
    Z2.typSachty === 'interiérová' && JSON.stringify(Z2.profily) === JSON.stringify(eng.PROFILY_VYCHOZI['interiérová']), Z2.profily);
  test('editovatelná varianta — lešení hlavy, ATYP i sklo dál běží', ['leseni', 'atyp', 'sklo'].every(x => volano2.includes(x)), volano2);
}

/* 2) zamekDataRozdilCesta */
{
  const z = odeslana(); const v = z.varianty[0];
  const d = kopie(v.data);
  test('shoda → prázdná cesta', zm.zamekDataRozdilCesta(kopie(d), d, v) === '');
  const d1 = kopie(d); d1.ock.zadani.profily.sloupek.dim = '60x40';
  test('#555: rozdíl v profilu → ock.zadani.profily.sloupek.dim', zm.zamekDataRozdilCesta(d1, d, v) === 'ock.zadani.profily.sloupek.dim',
    zm.zamekDataRozdilCesta(d1, d, v));
  const d2 = kopie(d); d2.cenik.priplatky = [1, 2]; const d2b = kopie(d); d2b.cenik.priplatky = [1, 3];
  test('pole: index prvku', zm.zamekDataRozdilCesta(d2, d2b, v) === 'cenik.priplatky.1', zm.zamekDataRozdilCesta(d2, d2b, v));
  const d3 = kopie(d); d3.ock.zadani.novyKlic = 5;
  test('přibylý klíč → jeho cesta', zm.zamekDataRozdilCesta(d3, d, v) === 'ock.zadani.novyKlic');
  test('#555: cesta nenese hodnoty', !/60x40/.test(zm.zamekDataRozdilCesta(d1, d, v)));
  const d4 = kopie(d); d4.kryci.hodnoty.jmenoPrijmeni = 'Zkušební Kontakt';
  test('volné pole krycího listu po CN rozdíl není (jako zamekDataPorovnani)', zm.zamekDataRozdilCesta(d4, d, v) === '',
    zm.zamekDataRozdilCesta(d4, d, v));
  const dl = kopie(d); dl.ock.zadani.profily.sloupek.dim = 'x'.repeat(10);
  const hl = kopie(d); hl.ock.zadani['k'.repeat(300)] = 1;   // jediný rozdíl = dlouhý klíč
  const chl = zm.zamekDataRozdilCesta(hl, d, v);
  test('délka cesty omezená (200 znaků)', chl.length === 200 && chl.startsWith('ock.zadani.kkk'), chl.length);
}

/* 3) DPH po CN se značkou cenikRucni */
{
  const z = odeslana(); const v = z.varianty[0];
  test('(zámek se snímkem: DPH po CN editovatelná)', zm.zamekDphVolna(v, 'C.dph') === true);
  const d = kopie(v.data); d.cenikRucni = Object.assign({}, d.cenikRucni); delete d.cenikRucni['C.dph']; delete d.cenikRucni['PC.dph'];
  const n = kopie(d); n.cenik.dph = 0.12; n.cenikRucni['C.dph'] = true; n.proj.cenik.dph = 0.12; n.cenikRucni['PC.dph'] = true;
  test('#555: změna DPH po CN i se značkou „ručně" porovnání nemění', zm.zamekDataPorovnani(n, v) === zm.zamekDataPorovnani(d, v),
    zm.zamekDataRozdilCesta(n, d, v));
  const jina = kopie(d); jina.cenikRucni['C.prirazka'] = true;
  test('jiná značka cenikRucni porovnání mění', zm.zamekDataPorovnani(jina, v) !== zm.zamekDataPorovnani(d, v));
  const vs = kopie(v); delete vs.zamek.snimek;
  const jenZnacka = kopie(d); jenZnacka.cenikRucni['C.dph'] = true;   // sazba beze změny, jen značka
  test('zámek bez snímku: samotná značka DPH porovnání mění', zm.zamekDataPorovnani(jenZnacka, vs) !== zm.zamekDataPorovnani(d, vs));
  const jenZnackaP = kopie(d); jenZnackaP.cenikRucni['PC.dph'] = true;
  test('zámek bez snímku: samotná značka DPH PROJ porovnání mění', zm.zamekDataPorovnani(jenZnackaP, vs) !== zm.zamekDataPorovnani(d, vs));
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
