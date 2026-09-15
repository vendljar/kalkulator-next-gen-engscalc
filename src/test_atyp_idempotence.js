/* ===== PŘEPÍNAČ ATYP NESMÍ PŘEPISOVAT RUČNÍ HODNOTY =====
 * (nálezy C1 z testování obchodníkem a V39 ze 4. kola, 15. 9. 2026)
 *
 * D. Sikora, 10. 9. 2026: „při prokliknutí políčka ATYP se automaticky doplní
 * do ceny zámečníka atyp 25 000. Ta cena atypu bude pokaždé jiná — jako
 * začátek by mohlo být těch 25 000, ale pokud se ta částka změní, tak by ji
 * to tlačítko ATYP měnit zpět na 25 000 nemělo." Na 2026-OPR-CN-0290 to po
 * několikerém prokliknutí srazilo základní cenu o 64 000.
 *
 * Nebylo to idempotentní ani v jednom směru:
 *  1) zap → vyp NEBYL původní stav: vypnutí nastavilo rezervy na NULU, ne na
 *     hodnotu, kterou tam obchodník měl předtím;
 *  2) zap → vyp → zap NEBYLO totéž co první zapnutí (montážní hodiny se
 *     počítají z aktuálních rozměrů);
 *  3) rezervaProfilyPct a rezervaPlechyPct se přepisovaly, ale v seznamu
 *     ZADANI_RUCNI_KLICE nebyly — ruční značku nad nimi nešlo ani vytvořit.
 *
 * Rozhodnutí J. V. 15. 9. 2026: „nic nenulovat, vracet do předchozího stavu."
 * (= varianta A u V39.)
 *
 * POZNÁMKA K TOMU, JAK SE TAHLE SADA PSALA. První verze si pravidlo
 * přepsala do vlastního modelu uvnitř testu, protože `atypPrepni()` sedí
 * v kalk_ock.js a sahá na globální ZAK, C, JEKLY a render(). Vypadalo to
 * dobře — 23 zelených — jenže mutace „vypnutí zase nuluje" a „zapnutí přebije
 * ruční hodnotu" obě prošly: testoval se model, ne aplikace. Rozhodovací
 * pravidlo se proto přestěhovalo do `atypHodnoty()` v zakazka.js a tahle sada
 * volá JEHO. V UI zůstala jen ceníková předloha, kterou bez ceníku a výpočtu
 * sestavit nejde; že ji UI opravdu předává, hlídá oddíl 4.
 */
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
const fs = require('fs');

global.DEFAULT_ZADANI = JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI));
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const engProj = require('./engine_proj.js');
global.DEFAULT_ZADANI_PROJ = JSON.parse(JSON.stringify(engProj.DEFAULT_ZADANI_PROJ));
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const zk = require('./zakazka.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const P = zk.ATYP_POLE;

/* ---------- 1) seznamy sedí (bod 3 nálezu) ---------- */

test('ATYP_POLE má všech sedm polí', P.length === 7, P);
P.forEach(k => test('ruční značka jde vytvořit u ' + k,
  zk.ZADANI_RUCNI_KLICE.indexOf(k) >= 0 || k === 'zamecnikAtypKc'
    ? zk.ZADANI_RUCNI_KLICE.indexOf(k) >= 0 : false, k));

/* ---------- 2) model přepínače ---------- */

const PREDLOHA = { rezervaProfilyPct: 0.30, rezervaPlechyPct: 0.30, rezervaZakladPct: 0.30,
  rezervaPriplatkyPct: 0.30, zamecnikAtypKc: 50000, montazAtypHod: 12, projekceAtypHod: 9 };
const NULA = { rezervaProfilyPct: 0, rezervaPlechyPct: 0, rezervaZakladPct: 0,
  rezervaPriplatkyPct: 0, zamecnikAtypKc: null, montazAtypHod: 0, projekceAtypHod: 0 };

const prepni = (Z, data, zap) => zk.atypHodnoty(Z, data, zap, zap ? PREDLOHA : null);

/* Ruční přepis pole tak, jak ho dělá set() — hodnota + značka. */
function rucne(Z, data, klic, hodnota) { Z[klic] = hodnota; zk.zadaniRucniZnac(data, klic); }

function novy(pocatecni) {
  const data = { ock: { zadani: {} }, zadaniRucni: {} };
  const Z = data.ock.zadani;
  P.forEach(k => { Z[k] = NULA[k]; });
  Object.assign(Z, pocatecni || {});
  return { Z, data };
}
const snimek = (Z) => P.map(k => k + '=' + JSON.stringify(Z[k])).join(' ');

/* ---------- 3) vlastní chování ---------- */

/* Sikorův případ: vlastní cena zámečníka nesmí spadnout zpátky na předlohu. */
{
  const { Z, data } = novy();
  prepni(Z, data, true);
  rucne(Z, data, 'zamecnikAtypKc', 74500);
  prepni(Z, data, false);
  prepni(Z, data, true);
  test('vlastní cena zámečníka přežije vypnutí a zapnutí', Z.zamecnikAtypKc === 74500, Z.zamecnikAtypKc);
}

/* Bod 1: vypnutí VRACÍ, nenuluje. */
{
  const { Z, data } = novy({ rezervaProfilyPct: 0.10, rezervaPlechyPct: 0.05 });
  const pred = snimek(Z);
  prepni(Z, data, true);
  test('zapnutí předlohu opravdu dosadí', Z.rezervaProfilyPct === 0.30);
  prepni(Z, data, false);
  test('vypnutí vrátí stav před zapnutím, ne nuly', snimek(Z) === pred,
    { pred, po: snimek(Z) });
}

/* Bod 3: rezervy profilů a plechů — ruční hodnota se pamatuje stejně. */
{
  const { Z, data } = novy();
  prepni(Z, data, true);
  rucne(Z, data, 'rezervaProfilyPct', 0.45);
  prepni(Z, data, false);
  prepni(Z, data, true);
  test('ruční rezerva profilů přežije cyklus', Z.rezervaProfilyPct === 0.45, Z.rezervaProfilyPct);
}

/* Opakované klikání nesmí hodnoty posouvat — to byl ten úbytek 64 000. */
{
  const { Z, data } = novy({ rezervaZakladPct: 0.12 });
  prepni(Z, data, true);
  rucne(Z, data, 'zamecnikAtypKc', 30000);
  const poPrvnim = snimek(Z);
  for (let i = 0; i < 5; i++) { prepni(Z, data, false); prepni(Z, data, true); }
  test('pětkrát vyp/zap dá pořád totéž', snimek(Z) === poPrvnim, { poPrvnim, ted: snimek(Z) });
}
{
  const { Z, data } = novy({ rezervaZakladPct: 0.12 });
  const pred = snimek(Z);
  for (let i = 0; i < 5; i++) { prepni(Z, data, true); prepni(Z, data, false); }
  test('pětkrát zap/vyp se vrátí na začátek', snimek(Z) === pred, { pred, ted: snimek(Z) });
}

/* Bez ručního zásahu se předloha dosazovat SMÍ — o to přepínač je. */
{
  const { Z, data } = novy();
  prepni(Z, data, true);
  test('nedotčené pole bere předlohu', Z.zamecnikAtypKc === 50000);
  prepni(Z, data, false);
  prepni(Z, data, true);
  test('a bere ji i podruhé, když do něj nikdo nesáhl', Z.zamecnikAtypKc === 50000);
}

/* Starší zakázka snímek nemá — nesmí to spadnout ani zůstat s přirážkou. */
{
  const { Z, data } = novy();
  Object.assign(Z, PREDLOHA); Z.atyp = true;      // stav uložený před 15. 9. 2026
  prepni(Z, data, false);
  test('zakázka bez snímku se vypne do nul (jako dřív)', snimek(Z) === snimek({ ...NULA }),
    snimek(Z));
}

/* ---------- 4) UI opravdu volá to pravidlo a nic nepřepisuje samo ---------- */

const src = fs.readFileSync(__dirname + '/ui/kalk_ock.js', 'utf8');
const fn = (src.match(/function atypPrepni\(zap, opts\)[\s\S]*?\n\}/) || [''])[0];
test('atypPrepni existuje', fn.length > 0);
test('a předává rozhodnutí funkci atypHodnoty', /atypHodnoty\(Z, vData, zap, predloha\)/.test(fn));
test('předloha se skládá jen při ZAPNUTÍ', /if \(zap\) \{[\s\S]{0,900}predloha = \{/.test(fn));
test('předloha pokrývá všech sedm polí',
  P.every(k => new RegExp(k + ':').test(fn)), P.filter(k => !new RegExp(k + ':').test(fn)));
/* Tohle je ta podstatná kontrola: v UI nesmí zůstat ŽÁDNÉ přiřazení do
 * atypových polí. Přesně tak totiž vypadal starý kód a přesně to obcházelo
 * jakékoli pravidlo o ručních hodnotách. */
P.forEach(k => test('UI nepřepisuje ' + k + ' samo',
  !new RegExp('Z\\.' + k + '\\s*=').test(fn)));
test('ruční značky ruší pravidlo, ne UI', !/zadaniRucniZrus/.test(fn));

const zdrojZak = fs.readFileSync(__dirname + '/zakazka.js', 'utf8');
test('pravidlo bere seznam polí z ATYP_POLE', /ATYP_POLE\.forEach/.test(zdrojZak));
test('a ruší ruční značky jen při vypnutí',
  /zadaniRucniZrus\(data, ATYP_POLE\)/.test(zdrojZak));

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
