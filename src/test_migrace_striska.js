/* ===== MIGRACE STŘÍŠKY: STARÁ ZAKÁZKA MUSÍ DÁT PŘESNĚ JEDNU =====
 * (nález N10, kolo 6 — „zakázky z doby před změnou nesou obě položky naráz
 *  a stříšky se počítají dvakrát")
 *
 * Do 9. 9. 2026 byla stříška zaškrtávátkem „Průchozí šachta" a počítala se
 * právě jedna, jen u exteriérové šachty. Dávka #240 z ní udělala POČET KUSŮ
 * (`striskaKs`) a do `importZakazka` přidala migraci, která starší zakázce
 * dosadí to, co dosud počítala. Bez ní by cena tiše spadla o celou stříšku.
 *
 * PROČ TAHLE SADA. Migrace neměla do 21. 9. 2026 jedinou kontrolu — a je to
 * přesně ten druh kódu, který se rozbije nepozorovaně: běží jen nad starými
 * daty, která nikdo v testech nemá, a pozná se to až na ceně u zákazníka.
 * Nález N10 mluví o dvojím započtení; na dnešním kódu se nereprodukuje (viz
 * poznámka v roadmapě u #273), takže tahle sada správné chování PŘIBÍJÍ, aby
 * se k němu nedalo vrátit omylem.
 *
 * Klíčová je IDEMPOTENCE: zakázka se přes `importZakazka` protahuje pokaždé,
 * když se načte ze serveru, z historie kroků nebo ze souboru. Migrace, která
 * by při každém průchodu přičetla kus, by dala přesně to, co popisuje N10.
 *
 * ŽÁDNÉ CENY — zkouší se počet kusů a počet řádků, ne částky.
 */
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
global.vypocet = eng.vypocet;
global.DEFAULT_ZADANI = eng.DEFAULT_ZADANI;
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const ep = require('./engine_proj.js');
global.DEFAULT_ZADANI_PROJ = ep.DEFAULT_ZADANI_PROJ;
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const tsm = require('./techspec.js');
global.TECHSPEC_DEF = tsm.TECHSPEC_DEF;
global.DEFAULT_TECHSPEC = tsm.DEFAULT_TECHSPEC;
const zk = require('./zakazka.js');
const fs = require('fs');
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

/* Zakázka ve STARÉM tvaru: pole, která #240 teprve zavedlo, vůbec neexistují. */
function staraZakazka(uprav) {
  const z = JSON.parse(JSON.stringify(zk.novaZakazka()));
  const v = z.varianty[0];
  v.data.cenik = ZC.zkusebniCenik();
  const zo = v.data.ock.zadani;
  zo.typSachty = 'exteriérová';
  zo.sirka = 1.6; zo.hloubka = 1.4; zo.zdvih = 9; zo.prejezd = 3.5; zo.prohluben = 1.1;
  zo.nastupiste = 3;
  zo.pruchoziSachta = true;
  delete zo.striskaKs; delete zo.nastupisteA; delete zo.nastupisteC; delete zo.patra;
  if (uprav) uprav(zo);
  return z;
}

const zadaniPo = z => zk.importZakazka(z).varianty[0].data.ock.zadani;

/* Všechny řádky stříšky napříč celým výsledkem výpočtu — ne jen v sekci,
 * kde je dnes. Kdyby druhá vznikla jinde, tahle sada ji má najít taky. */
function striskyVeVypoctu(zadani, cenik) {
  const r = eng.vypocet(zadani, cenik, JEKLY, true);
  const nalez = [];
  (function projdi(o) {
    if (Array.isArray(o)) return o.forEach(projdi);
    if (!o || typeof o !== 'object') return;
    if (/STŘÍŠKA/i.test(String(o.nazev || ''))) { nalez.push(o); return; }
    Object.keys(o).forEach(k => projdi(o[k]));
  })(r);
  return nalez;
}

/* ---------- 1) migrace dosadí, co zakázka dosud počítala ---------- */

const PRIPADY = [
  ['exteriérová + průchozí → jedna stříška', zo => {}, 1],
  ['interiérová: stříška se nikdy nepočítala → nula',
    zo => { zo.typSachty = 'interiérová'; }, 0],
  ['bez průchozí šachty → nula',
    zo => { zo.pruchoziSachta = false; }, 0],
];

PRIPADY.forEach(([popis, uprav, cekano]) => {
  const zo = zadaniPo(staraZakazka(uprav));
  test(popis, (+zo.striskaKs || 0) === cekano, { striskaKs: zo.striskaKs });
});

/* ---------- 2) IDEMPOTENCE — jádro nálezu N10 ----------
 *
 * Zakázka projde `importZakazka` při každém načtení ze serveru
 * (`online_ui.js`), při návratu v historii kroků i při importu souboru.
 * Kdyby migrace přičítala místo dosazování, každé otevření by přidalo kus. */
{
  let z = staraZakazka();
  const kusy = [];
  for (let i = 0; i < 5; i++) {
    z = zk.importZakazka(z);
    kusy.push(+z.varianty[0].data.ock.zadani.striskaKs || 0);
  }
  test('pětkrát načtená zakázka má pořád jednu stříšku, ne pět',
    kusy.every(k => k === 1), kusy);
}

/* ---------- 3) ruční hodnota se migrací nepřepíše ----------
 *
 * `== null` znamená „pole ještě neexistuje". Nula je PLATNÁ volba obchodníka
 * („stříšku nechceme"), dvojka taky — migrace do nich sahat nesmí, jinak by
 * uložené nabídce zvedla cenu. */
{
  const nula = zadaniPo(staraZakazka(zo => { zo.striskaKs = 0; }));
  test('vypnutá stříška (0) zůstane vypnutá i u průchozí šachty',
    (+nula.striskaKs || 0) === 0, { striskaKs: nula.striskaKs });
  const dve = zadaniPo(staraZakazka(zo => { zo.striskaKs = 2; }));
  test('ručně zadané dva kusy migrace nepřepíše', +dve.striskaKs === 2, { striskaKs: dve.striskaKs });
}

/* ---------- 4) ve výpočtu stojí řádek právě JEDNOU ---------- */
{
  const zo = zadaniPo(staraZakazka());
  const cenik = ZC.zkusebniCenik();
  const nalez = striskyVeVypoctu(zo, cenik);
  test('v celém výpočtu je řádek stříšky právě jeden',
    nalez.length === 1, nalez.map(x => x.nazev));
  test('a nese právě jeden kus',
    nalez.length === 1 && (+nalez[0].mnozstvi || 0) === 1,
    nalez.map(x => ({ n: x.nazev, mn: x.mnozstvi })));

  /* Pojistka proti prázdné kontrole: hledání musí stříšku opravdu umět najít.
   * Kdyby se položka přejmenovala, kontroly výš by vycházely na nule řádků
   * a tvářily se, že je všechno v pořádku. */
  const dvaKusy = zadaniPo(staraZakazka(zo2 => { zo2.striskaKs = 2; }));
  const nalez2 = striskyVeVypoctu(dvaKusy, cenik);
  test('kontrola není prázdná — při dvou kusech se najde řádek s množstvím 2',
    nalez2.length === 1 && (+nalez2[0].mnozstvi || 0) === 2,
    nalez2.map(x => ({ n: x.nazev, mn: x.mnozstvi })));
  const zadna = striskyVeVypoctu(zadaniPo(staraZakazka(zo2 => { zo2.striskaKs = 0; })), cenik);
  test('a při nule se nenajde žádný', zadna.length === 0, zadna.map(x => x.nazev));
}

/* ---------- 5) ostatní pole z #240 se dosadí tak, aby se cena nezměnila ----------
 *
 * Nástupiště A/C a patra musí po migraci dát tentýž součet i tutéž výšku
 * podlaží jako staré jediné pole `nastupiste` — jinak by se zakázce po
 * otevření změnila cena, aniž by na ni kdokoli sáhl. */
{
  const puv = staraZakazka();
  const predtim = puv.varianty[0].data.ock.zadani.nastupiste;
  const zo = zadaniPo(puv);
  test('nástupiště A převzalo dosavadní počet', +zo.nastupisteA === predtim, { a: zo.nastupisteA, predtim });
  test('nástupiště C je nula (dosud neexistovalo)', (+zo.nastupisteC || 0) === 0, { c: zo.nastupisteC });
  test('pater je tolik, kolik bylo nástupišť', +zo.patra === predtim, { patra: zo.patra, predtim });
  test('a součet nástupišť vyšel stejně jako dřív',
    (+zo.nastupisteA || 0) + (+zo.nastupisteC || 0) === predtim);
}

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
