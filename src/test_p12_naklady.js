/* ============================================================
 * P12 / ROADMAPA #369 — OBCHODNÍK NEVIDÍ NÁKLADY (v15.10.3)
 *
 * Zadání podklady/PROMPT_p12_naklady.md: (c) stažený soubor zakázky pro roli
 * bez práva na náklady bez ceníků variant, import zpět musí fungovat a cena
 * se nesmí změnit; klíč matice `naklady.ceniky` (výchozí: vedoucí ano,
 * obchodník ne). Obrazovku (sloupec Sazba PROJ, kontroly.cisla) zkouší
 * harness overit_p12_naklady.mjs, server netlify/test_p12_naklady.mjs.
 *
 * Pojistka: před opravou (bez zakazkaBezCeniku / zakazkaCenikDopln a bez
 * klíče naklady.ceniky) sada spadne už na prvních testech (funkce chybí),
 * po opravě projde celá.
 * ============================================================ */
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
const E = nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const EP = nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./poznamky.js');
const ZAM = nacti('./zamek.js');
nacti('./protokol.js');
nacti('./firma.js');
nacti('./kryci.js');
nacti('./kryci_proj.js');
nacti('./cenik_rady.js');
const zk = nacti('./zakazka.js');
const Z = require('./zobrazeni.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 300)); } };
const kopie = (x) => JSON.parse(JSON.stringify(x));
/* Porovnání bez ohledu na pořadí klíčů (doplnění ceníku skládá objekt znovu). */
const kanon = (x) => Array.isArray(x) ? x.map(kanon)
  : (x && typeof x === 'object') ? Object.keys(x).sort().reduce((o, k) => { o[k] = kanon(x[k]); return o; }, {}) : x;
const stejne = (a, b) => JSON.stringify(kanon(a)) === JSON.stringify(kanon(b));

/* „Platný ceník" pro test: zkušební ceník (stejný tvar jako cenikDnesniProVariantu). */
const DNES = () => ({ cenik: ZC.zkusebniCenik(), proj: { cenik: ZC.zkusebniCenikProj() } });
const dnesni = () => DNES();

/* Otisk ceny = celý výsledek obou výpočtů varianty (z toho vznikají dokumenty). */
const JEKLY = JSON.parse(require('fs').readFileSync(__dirname + '/jekly.json', 'utf8'));
const otisk = (v) => JSON.stringify({
  ock: E.vypocet(v.data.ock.zadani, v.data.cenik, JEKLY, v.data.ock.fixes),
  proj: EP.vypocetProj(v.data.proj.zadani, v.data.proj.cenik),
});

/* ---------- 1) klíč matice ---------- */
test('matice zná klíč naklady.ceniky (skupina čísel)',
  Z.ZOBRAZENI_KLIC_NAKLADY === 'naklady.ceniky' && !!Z.zobrazeniPrvek('naklady.ceniky')
  && Z.zobrazeniPrvek('naklady.ceniky').skupina === 'cisla');
test('výchozí: obchodník právo nemá', Z.zobrazeniSmi('Obchodník', 'naklady.ceniky', null) === false);
test('výchozí: vedoucí právo má (chování vedoucího se nemění)', Z.zobrazeniSmi('Vedoucí', 'naklady.ceniky', null) === true);
test('administrátor ho má vždy', Z.zobrazeniSmi('Administrátor', 'naklady.ceniky', { 'naklady.ceniky': { 'Obchodník': false, 'Vedoucí': false } }) === true);
test('administrátor ho obchodníkovi přidělí maticí',
  Z.zobrazeniSmi('Obchodník', 'naklady.ceniky', Z.zobrazeniOciste({ 'naklady.ceniky': { 'Obchodník': true } })) === true);
test('stará uložená matice bez klíče dostane výchozí hodnotu',
  Z.zobrazeniOciste({ 'sloupce.naklad': { 'Vedoucí': true } })['naklady.ceniky']['Obchodník'] === false
  && Z.zobrazeniOciste({})['naklady.ceniky']['Vedoucí'] === true);

/* ---------- 2) soubor bez ceníků: rozpracovaná varianta ---------- */
test('funkce pro soubor bez ceníků existují',
  typeof zk.zakazkaBezCeniku === 'function' && typeof zk.zakazkaCenikDopln === 'function'
  && typeof zk.StorageAdapter.exportujBezCeniku === 'function');

const z = zk.novaZakazka();
const v0 = z.varianty[0];
v0.data.cenik = ZC.zkusebniCenik(); v0.data.proj.cenik = ZC.zkusebniCenikProj();
Object.assign(v0.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
/* Zakázková přirážka a jedna dohodnutá cena — to soubor nést musí. */
v0.data.cenik.marze = 0.37;
v0.data.proj.cenik.marze = 0.41;
const nekl = Object.keys(v0.data.cenik).find(k => typeof v0.data.cenik[k] === 'number' && v0.data.cenik[k] > 0 && k !== 'marze' && k !== 'dph');
v0.data.cenik[nekl] = v0.data.cenik[nekl] + 123;
/* Klíč, který varianta nemá a platný ceník ano (starší zakázka) — po importu
 * nesmí přijít s cenou z platného ceníku; doplní ho migrace nulou, stejně
 * jako u plného souboru (cenikDoplnKlice). */
const chybejici = Object.keys(v0.data.proj.cenik).find(k => k !== 'marze' && k !== 'dph' && typeof v0.data.proj.cenik[k] === 'number' && v0.data.proj.cenik[k] !== 0);
delete v0.data.proj.cenik[chybejici];
/* „Před" = táž zakázka uložená a načtená celá (migrace importu proběhnou
 * stejně, chybějící klíč doplní nulou). */
const otiskPred = otisk(zk.StorageAdapter.importuj(zk.StorageAdapter.exportuj(z)).varianty[0]);
const puvodni = kopie(z);

const text = zk.StorageAdapter.exportujBezCeniku(z, dnesni);
const soubor = JSON.parse(text);
const sv = soubor.varianty[0];
test('originál zakázky v paměti se exportem nezmění', stejne(z, puvodni));
test('v souboru nejsou ceníky rozpracované varianty (OCK ani PROJ)',
  sv.data.cenik === undefined && sv.data.proj && sv.data.proj.cenik === undefined, Object.keys(sv.data));
test('soubor nese značku vynechání s odchylkami', sv.data.cenikVynechan && Array.isArray(sv.data.cenikVynechan.rozdil));
const cesty = sv.data.cenikVynechan.rozdil.map(x => x.c.join('.'));
test('odchylky nesou jen zakázkovou přirážku, dohodnutou cenu a chybějící klíč',
  cesty.sort().join(',') === ['cenik.' + nekl, 'cenik.marze', 'proj.marze', 'proj.' + chybejici].sort().join(','), cesty);
test('chybějící klíč je v odchylkách jako smazání',
  sv.data.cenikVynechan.rozdil.some(x => x.c.join('.') === 'proj.' + chybejici && x.smaz === true));
/* V souboru nesmí být hodnoty, které platný ceník nese a varianta nemění. */
const jinaPolozka = Object.keys(ZC.zkusebniCenik()).find(k => typeof ZC.zkusebniCenik()[k] === 'number'
  && ZC.zkusebniCenik()[k] > 1000 && k !== nekl);
test('položka platného ceníku (beze změny) v souboru není ani jako klíč',
  !!jinaPolozka && !new RegExp('"' + jinaPolozka + '"').test(text), jinaPolozka);
test('stejně tak sazby projekce (ceník PROJ)',
  !/"sazby"\s*:/.test(text) || !JSON.stringify(sv).includes(JSON.stringify(ZC.zkusebniCenikProj().sazby)));

/* Import zpět se stejným platným ceníkem = přesně původní zakázka. */
global.cenikDnesniProVariantu = dnesni;
const zpet = zk.StorageAdapter.importuj(text);
const vz = zpet.varianty[0];
test('import doplní ceník OCK i PROJ', vz.data.cenik && vz.data.proj.cenik && !vz.data.cenikVynechan);
test('doplněný ceník = původní ceník varianty (OCK)', stejne(vz.data.cenik, v0.data.cenik));
const plnyPC = zk.StorageAdapter.importuj(zk.StorageAdapter.exportuj(z)).varianty[0].data.proj.cenik;
test('doplněný ceník PROJ = import plného souboru', stejne(vz.data.proj.cenik, plnyPC));
test('klíč, který varianta neměla, nepřijde s cenou z platného ceníku',
  !vz.data.proj.cenik[chybejici] && !!ZC.zkusebniCenikProj()[chybejici], { k: chybejici, h: vz.data.proj.cenik[chybejici] });
test('otisk ceny před a po (export bez ceníků → import) je stejný', otisk(vz) === otiskPred);
test('značka celé zakázky po importu nezůstane', zpet.cenikyVynechany === undefined);
/* Kontrola proti plnému exportu: import plného souboru dává totéž. */
const plny = zk.StorageAdapter.importuj(zk.StorageAdapter.exportuj(z));
test('import souboru bez ceníků = import plného souboru', stejne(zpet.varianty[0].data, plny.varianty[0].data));

/* Bez platného ceníku v prohlížeči (Node, server) se bere ceník ze sestavení. */
delete global.cenikDnesniProVariantu;
const zpet2 = zk.StorageAdapter.importuj(text);
test('bez cenikDnesniProVariantu se doplní ze sestavení (DEFAULT_CENIK)',
  stejne(zpet2.varianty[0].data.cenik, v0.data.cenik) && otisk(zpet2.varianty[0]) === otiskPred);
test('otisk není prázdný (výpočet OCK i PROJ dává cenu)', JSON.parse(otiskPred).ock.souhrn.zakladCena > 0
  && JSON.parse(otiskPred).proj.souhrn.celkem > 0);

/* Po zveřejnění nové verze se varianta přecení jako při otevření zakázky —
 * zakázkové odchylky zůstávají. */
global.cenikDnesniProVariantu = () => { const d = DNES(); d.cenik.dph = 0.15; return d; };
const zpet3 = zk.StorageAdapter.importuj(text);
test('novější platný ceník: zakázková přirážka zůstane, ostatní z platného',
  zpet3.varianty[0].data.cenik.marze === 0.37 && zpet3.varianty[0].data.cenik.dph === 0.15
  && zpet3.varianty[0].data.cenik[nekl] === v0.data.cenik[nekl]);
global.cenikDnesniProVariantu = dnesni;

/* ---------- 3) zamčená varianta zůstává celá ---------- */
const z2 = zk.novaZakazka();
const w = z2.varianty[0];
w.data.cenik = ZC.zkusebniCenik(); w.data.proj.cenik = ZC.zkusebniCenikProj();
w.data.cenik.marze = 0.33;
const druha = zk.novaVarianta('Varianta 2'); druha.data.cenik = ZC.zkusebniCenik(); druha.data.proj.cenik = ZC.zkusebniCenikProj();
z2.varianty.push(druha);
ZAM.zamkniVariantu(w, { typ: 'nabidka', kdy: '2026-10-15T08:00:00.000Z', kdo: 'Zkušební obchodník', cislo: 'X' });
const s2 = JSON.parse(zk.StorageAdapter.exportujBezCeniku(z2, dnesni));
test('zamčená (odeslaná) varianta si ceník ponechá — doklad o odeslané nabídce',
  stejne(s2.varianty[0].data.cenik, w.data.cenik) && !s2.varianty[0].data.cenikVynechan);
test('rozpracovaná varianta téže zakázky ceník nemá', s2.varianty[1].data.cenik === undefined);
const z2zpet = zk.StorageAdapter.importuj(JSON.stringify(s2));
test('zamčená varianta po importu beze změny dat', stejne(z2zpet.varianty[0].data.cenik, w.data.cenik));
test('rozpracovaná varianta po importu = původní', stejne(z2zpet.varianty[1].data.cenik, druha.data.cenik));

/* ---------- 4) tvrdost proti cizímu souboru ---------- */
const zly = kopie(soubor);
zly.varianty[0].data.cenikVynechan.rozdil.push({ c: ['__proto__', 'x'], h: 1 }, { c: ['cenik', 'constructor'], h: 1 },
  { c: 'cenik.marze', h: 9 }, null, { c: [1, 2], h: 3 });
let vyjimka = null, zz = null;
try { zz = zk.StorageAdapter.importuj(JSON.stringify(zly)); } catch (e) { vyjimka = e; }
test('podvržené cesty (prototyp, nečíselné tvary) se ignorují bez pádu',
  !vyjimka && zz && ({}).x === undefined && zz.varianty[0].data.cenik.marze === 0.37, vyjimka && String(vyjimka));

/* ---------- 5) ceník zahraniční řady ---------- */
const z3 = zk.novaZakazka();
const u = z3.varianty[0];
u.data.cenik = ZC.zkusebniCenik(); u.data.proj.cenik = ZC.zkusebniCenikProj(); u.data.cenikRada = 'zahr';
let videnaRada = null;
const dnesRada = (v) => { videnaRada = v && v.data && (v.data.cenikRada || (v.data.cenik && v.data.cenik.rada)); return DNES(); };
const s3 = JSON.parse(zk.StorageAdapter.exportujBezCeniku(z3, dnesRada));
test('řada ceníku se v souboru zachová', s3.varianty[0].data.cenikVynechan.rada === 'zahr' && s3.varianty[0].data.cenikRada === 'zahr');
global.cenikDnesniProVariantu = dnesRada;
videnaRada = null;
zk.StorageAdapter.importuj(JSON.stringify(s3));
test('doplnění se ptá platného ceníku pro správnou řadu', videnaRada === 'zahr', videnaRada);
global.cenikDnesniProVariantu = dnesni;

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
