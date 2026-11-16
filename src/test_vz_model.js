/* ============================================================
 * VZ #598, etapa E0 (#599) — VÍC ZÁKAZNÍKŮ NA ZAKÁZCE: čistá logika
 * src/vice_zakazniku.js (návrh podklady/NAVRH_VICE_ZAKAZNIKU.md § 1, § 2,
 * § 2a, § 3; zadání podklady/PROMPT_VZ_E0.md).
 *
 *  – vzPridej: první volání založí vzRidici; sdílená / vlastní varianta;
 *    prázdný název a strop 9 dalších odmítne beze změny zakázky;
 *  – vzOdstran: řídící, neznámý, prodaný → odmítnuto; po posledním dalším
 *    zmizí oba klíče; smazatVariantu jen u vlastní nezamčené varianty;
 *  – písmena a id včetně razítek tisků (zamek.tisky[].zakaznik), strop Z;
 *  – vzVymenRidiciho: hlavička ↔ položka, řídící varianta, otisky webhooku;
 *  – vzSrovnej (invariant), vzPohled (kanárky: pohled nenese ŽÁDNÝ řetězec
 *    jiného zákazníka), vzTvarProblemy, import (vzOcisti), duplikace,
 *    ARES nad hlavičkou dalšího zákazníka, test „bez stop“.
 * Pojistka: bez src/vice_zakazniku.js (před E0) sada selže hned na načtení;
 * s rozbitým jádrem selže (příklady úprav v komentáři na konci souboru).
 * Spuštění: cd src && node test_vz_model.js
 * ============================================================ */

/* Moduly se skládají do `global` ve stejném pořadí jako CORE v build.py —
 * v prohlížeči sdílejí jeden scope a guardy `typeof … === 'function'`
 * (klonujVariantu, variantaUzamcena, nastavRidici, vzOcisti) musí funkci
 * najít, jinak by sada ověřovala jiný kód, než jaký běží v aplikaci. */
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
const VZ = nacti('./vice_zakazniku.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./ares.js');
nacti('./poznamky.js');
nacti('./protokol.js');
nacti('./firma.js');
nacti('./kryci.js');
nacti('./kryci_proj.js');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); } };
const J = x => JSON.stringify(x);
const kop = x => JSON.parse(JSON.stringify(x));

/* Smyšlená data — žádný skutečný zákazník, kontakt ani cena. */
const HLAVICKA_A = { objednatel: 'Zkušební ocelárna s.r.o.', adresaObjednatele: 'Zkušební 1, Kdesi', ico: '', dic: '', kontakt: 'Jan Zkušební' };
const zakNova = () => {
  const z = novaZakazka();
  Object.assign(z, HLAVICKA_A, { nazevAkce: 'Zkušební akce', adresa: 'Stavba 1, Kdesi' });
  z.zastupci.smluvniJmeno = 'Jednatel Zkušební';
  return z;
};
const udaje = (n, navic) => Object.assign({ objednatel: 'Zákazník ' + n + ' s.r.o.', adresaObjednatele: 'Ulice ' + n,
  ico: '', dic: '', kontakt: 'Osoba ' + n }, navic || {});
const varRidici = z => ridiciVarianta(z).id;
const najdiVar = (z, id) => z.varianty.find(v => v.id === id);

/* ---------- 1. vzPridej ---------- */
{
  const z = zakNova();
  test('nová zakázka nemá klíče víc zákazníků', !('vzRidici' in z) && !('dalsiZakaznici' in z) && !vzRezim(z));
  const ridici = varRidici(z), aktivni = z.aktivni;
  const r = vzPridej(z, udaje('B'));
  test('vzPridej (sdílená): ok, id z2, písmeno B', r.ok && r.zakaznik.id === 'z2' && r.zakaznik.pismeno === 'B', r);
  test('první vzPridej založí vzRidici { id z1, písmeno \'\', varianta = řídící }',
    J(z.vzRidici) === J({ id: 'z1', pismeno: '', varianta: ridici }), z.vzRidici);
  test('sdílená: ukazatel na řídící variantu, žádná nová varianta', z.dalsiZakaznici[0].varianta === ridici && z.varianty.length === 1);
  test('vzRezim po přidání = true; vzZakaznici: řídící + 1', vzRezim(z) && vzZakaznici(z).length === 2 && vzZakaznici(z)[0].ridici);
  test('hlavička zakázky (řídící) beze změny', ['objednatel', 'adresaObjednatele', 'ico', 'dic', 'kontakt'].every(k => z[k] === HLAVICKA_A[k]));
  test('položka nese hlavičku a zástupce se všemi poli', J(Object.keys(z.dalsiZakaznici[0].hlavicka).sort()) === J(VZ_HLAVICKA_POLE.slice().sort())
    && J(Object.keys(z.dalsiZakaznici[0].zastupci).sort()) === J(VZ_ZASTUPCI_POLE.slice().sort()));

  const pocet = z.varianty.length;
  const r2 = vzPridej(z, udaje('C'), { vlastni: true });
  const nova = r2.ok && najdiVar(z, r2.zakaznik.varianta);
  test('vlastní: nová varianta přes klonujVariantu, ukazatel na ni', r2.ok && z.varianty.length === pocet + 1 && !!nova && nova.id !== ridici, r2);
  test('vlastní: nová varianta není řídící, řídící zůstává', nova && nova.ridici === false && varRidici(z) === ridici);
  test('vlastní: aktivní varianta se nemění', z.aktivni === aktivni);
  test('vlastní: id z3, písmeno C; vzRidici.varianta pořád řídící', r2.zakaznik.id === 'z3' && r2.zakaznik.pismeno === 'C' && z.vzRidici.varianta === ridici);

  const pred = J(z);
  const r3 = vzPridej(z, udaje('X', { objednatel: '   ' }));
  test('prázdný název odmítne, zakázka beze změny', !r3.ok && J(z) === pred, r3);
  const z1 = zakNova(), pred1 = J(z1);
  test('prázdný název na zakázce s 1 zákazníkem: bez nových klíčů', !vzPridej(z1, { objednatel: '' }).ok && J(z1) === pred1);
  const r4 = vzPridej(z, udaje('X', { kontakt: 'x'.repeat(VZ_TEXT_MAX + 1) }));
  test('příliš dlouhý údaj odmítne, zakázka beze změny', !r4.ok && J(z) === pred);
}
{
  const z = zakNova();
  const pismena = [];
  for (let i = 0; i < 9; i++) { const r = vzPridej(z, udaje(i)); pismena.push(r.ok ? r.zakaznik.pismeno : '?'); }
  test('9 dalších: písmena B…J po řadě', pismena.join('') === 'BCDEFGHIJ', pismena);
  test('9 dalších: id z2…z10', z.dalsiZakaznici.map(d => d.id).join(',') === 'z2,z3,z4,z5,z6,z7,z8,z9,z10');
  const pred = J(z);
  const r = vzPridej(z, udaje('navic'));
  test('10. další zákazník odmítnut (strop VZ_DALSI_MAX), beze změny', VZ_DALSI_MAX === 9 && !r.ok && J(z) === pred, r);
  test('zakázka s 9 dalšími má platný tvar', vzTvarProblemy(z).length === 0, vzTvarProblemy(z));
}

/* ---------- 2. vzOdstran ---------- */
{
  const z = zakNova();
  vzPridej(z, udaje('B'));
  const pred = J(z);
  test('řídícího (z1) odstranit nejde', !vzOdstran(z, 'z1').ok && J(z) === pred);
  test('neznámé id odmítne', !vzOdstran(z, 'z99').ok && J(z) === pred);
  const v = z.varianty[0];
  v.zamek = { zamceno: true, tisky: [] };
  v.prodano = { datum: '2026-11-16', zakaznik: 'z2' };
  const pred2 = J(z);
  test('prodaného zákazníka odstranit nejde', !vzOdstran(z, 'z2').ok && J(z) === pred2);
  delete v.prodano; v.zamek = null;
  const r = vzOdstran(z, 'z2');
  test('po posledním dalším zmizí oba klíče', r.ok && !('vzRidici' in z) && !('dalsiZakaznici' in z), r);
  test('vzOdstran na zakázce s jedním zákazníkem odmítne', !vzOdstran(z, 'z2').ok);
}
{
  const z = zakNova();
  const ridici = varRidici(z);
  vzPridej(z, udaje('B'));                        // z2 sdílená
  const c = vzPridej(z, udaje('C'), { vlastni: true }).zakaznik;   // z3 vlastní nezamčená
  const d = vzPridej(z, udaje('D'), { vlastni: true }).zakaznik;   // z4 vlastní zamčená
  najdiVar(z, d.varianta).zamek = { zamceno: true, tisky: [] };
  const r1 = vzOdstran(z, 'z3', { smazatVariantu: true });
  test('smazatVariantu: vlastní nezamčená varianta smazána', r1.ok && r1.smazanaVarianta === c.varianta && !najdiVar(z, c.varianta), r1);
  const r2 = vzOdstran(z, 'z4', { smazatVariantu: true });
  test('smazatVariantu: zamčená varianta zůstává (doklad)', r2.ok && r2.smazanaVarianta === '' && !!najdiVar(z, d.varianta), r2);
  const r3 = vzOdstran(z, 'z2', { smazatVariantu: true });
  test('smazatVariantu: sdílená (řídící) varianta zůstává', r3.ok && r3.smazanaVarianta === '' && !!najdiVar(z, ridici) && varRidici(z) === ridici, r3);
  test('po odstranění všech: žádné klíče, řídící varianta beze změny', !('vzRidici' in z) && !('dalsiZakaznici' in z) && najdiVar(z, ridici).ridici);
}
{
  /* Vlastní varianta, na kterou ukazuje i jiný zákazník, není „jen jeho“. */
  const z = zakNova();
  const c = vzPridej(z, udaje('B'), { vlastni: true }).zakaznik;
  vzPridej(z, udaje('C'));
  z.dalsiZakaznici[1].varianta = c.varianta;
  const r = vzOdstran(z, c.id, { smazatVariantu: true });
  test('smazatVariantu: varianta sdílená s jiným dalším zákazníkem zůstává', r.ok && r.smazanaVarianta === '' && !!najdiVar(z, c.varianta), r);
}

/* ---------- 3. písmena a id včetně razítek ---------- */
{
  const z = zakNova();
  vzPridej(z, udaje('B'));
  vzOdstran(z, 'z2');
  const r = vzPridej(z, udaje('B2'));
  test('písmeno a id bez razítka se po odstranění uvolní (B znovu B, z2 znovu z2)', r.ok && r.zakaznik.pismeno === 'B' && r.zakaznik.id === 'z2', r);
}
{
  const z = zakNova();
  vzPridej(z, udaje('B'));
  z.varianty[0].zamek = { zamceno: true, cislo: 'X', tisky: [{ typ: 'nabidkaTisk', zakaznik: { id: 'z2', pismeno: 'B' } }] };
  vzOdstran(z, 'z2');
  test('po odstranění B s razítkem: další písmeno C', vzPismenoDalsi(z) === 'C', vzPismenoDalsi(z));
  test('po odstranění z2 s razítkem: další id z3', vzIdDalsi(z) === 'z3', vzIdDalsi(z));
  const r = vzPridej(z, udaje('C'));
  test('vzPridej po razítku: C a z3', r.ok && r.zakaznik.pismeno === 'C' && r.zakaznik.id === 'z3', r);
}
{
  const z = zakNova();
  z.varianty[0].zamek = { zamceno: true, tisky: [{ zakaznik: { id: 'z7', pismeno: 'F' } }] };
  test('razítko bez zákazníků v zakázce: písmeno G, id z8', vzPismenoDalsi(z) === 'G' && vzIdDalsi(z) === 'z8');
  test('bez razítek a zákazníků: písmeno B, id z2', vzPismenoDalsi(zakNova()) === 'B' && vzIdDalsi(zakNova()) === 'z2');
}
{
  const z = zakNova();
  z.varianty[0].zamek = { zamceno: true, tisky: [{ zakaznik: { id: 'z30', pismeno: 'Z' } }] };
  test('strop Z: vzPismenoDalsi vrací \'\'', vzPismenoDalsi(z) === '');
  const pred = J(z);
  const r = vzPridej(z, udaje('B'));
  test('strop Z: vzPridej odmítne, zakázka beze změny', !r.ok && J(z) === pred, r);
}

/* ---------- 4. vzVymenRidiciho ---------- */
{
  const z = zakNova();
  z.zastupci.technickyJmeno = 'Technik A';
  z.pdZadani = { otisk: { objednatel: 'o', adresaObjednatele: 'a', ico: 'i', dic: 'd', kontakt: 'k', nazevAkce: 'n' }, jine: 1 };
  const hlavA = kop({ h: VZ_HLAVICKA_POLE.map(k => z[k]), zastupci: z.zastupci });
  const varA = varRidici(z);
  const b = vzPridej(z, udaje('B', { zastupci: { smluvniJmeno: 'Jednatel B', banka: 'Banka B' } }), { vlastni: true }).zakaznik;
  vzPridej(z, udaje('C'));
  const r = vzVymenRidiciho(z, 'z2');
  test('výměna řídícího: ok', r.ok, r);
  test('výměna: hlavička zakázky = údaje B', VZ_HLAVICKA_POLE.every(k => z[k] === b.hlavicka[k]));
  test('výměna: zástupci zakázky = zástupci B', J(z.zastupci) === J(b.zastupci));
  test('výměna: vzRidici = { id z2, písmeno B, varianta B }', J(z.vzRidici) === J({ id: 'z2', pismeno: 'B', varianta: b.varianta }), z.vzRidici);
  const stary = z.dalsiZakaznici[0];
  test('výměna: starý řídící v dalsiZakaznici s id z1 a písmenem \'\'', stary.id === 'z1' && stary.pismeno === '', stary);
  test('výměna: starý řídící nese původní hlavičku a zástupce',
    J(VZ_HLAVICKA_POLE.map(k => stary.hlavicka[k])) === J(hlavA.h) && J(stary.zastupci) === J(hlavA.zastupci));
  test('výměna: starý řídící ukazuje na svou (dřívější řídící) variantu', stary.varianta === varA);
  test('výměna: řídící varianta = varianta B (příznak v.ridici)', najdiVar(z, b.varianta).ridici === true && najdiVar(z, varA).ridici === false
    && z.varianty.filter(v => v.ridici).length === 1);
  test('výměna: písmeno C beze změny', z.dalsiZakaznici[1].pismeno === 'C' && z.dalsiZakaznici[1].id === 'z3');
  const o = z.pdZadani.otisk;
  test('výměna: otisk webhooku ztratí pole firmy, nazevAkce zůstane',
    ['objednatel', 'adresaObjednatele', 'ico', 'dic', 'kontakt'].every(k => !(k in o)) && o.nazevAkce === 'n' && z.pdZadani.jine === 1, o);
  test('výměna: tvar zůstává platný, invariant drží', vzTvarProblemy(z).length === 0 && vzSrovnej(z).length === 0, vzTvarProblemy(z));
  const r2 = vzVymenRidiciho(z, 'z1');
  test('dvojí výměna vrátí hlavičku a zástupce', r2.ok && J({ h: VZ_HLAVICKA_POLE.map(k => z[k]), zastupci: z.zastupci }) === J(hlavA));
  test('dvojí výměna vrátí vzRidici z1 a řídící variantu A', J(z.vzRidici) === J({ id: 'z1', pismeno: '', varianta: varA }) && varRidici(z) === varA);
  test('výměna na sebe sama: ok, beze změny', (() => { const p = J(z); return vzVymenRidiciho(z, 'z1').ok && J(z) === p; })());
  test('výměna s neznámým id odmítne', !vzVymenRidiciho(z, 'z99').ok);
  test('výměna u zakázky s jedním zákazníkem odmítne', !vzVymenRidiciho(zakNova(), 'z2').ok);
}

/* ---------- 5. vzSrovnej ---------- */
{
  const z = zakNova();
  vzPridej(z, udaje('B'));
  vzPridej(z, udaje('C'), { vlastni: true });
  const ridici = varRidici(z);
  z.vzRidici.varianta = z.dalsiZakaznici[1].varianta;
  z.dalsiZakaznici[0].varianta = 'neexistuje';
  const out = vzSrovnej(z);
  test('vzSrovnej opraví vzRidici.varianta a vrátí to', out.indexOf('vzRidici.varianta') >= 0 && z.vzRidici.varianta === ridici, out);
  test('vzSrovnej: ukazatel na neexistující variantu → řídící', out.indexOf('dalsiZakaznici[0].varianta') >= 0 && z.dalsiZakaznici[0].varianta === ridici, out);
  test('vzSrovnej: platný ukazatel jiného zákazníka nechá', z.dalsiZakaznici[1].varianta !== ridici && out.length === 2, out);
  test('vzSrovnej podruhé: []', vzSrovnej(z).length === 0);
  const j = zakNova(), p = J(j);
  test('vzSrovnej bez víc zákazníků: [] a beze změny', J(vzSrovnej(j)) === '[]' && J(j) === p);
}

/* ---------- 6. vzPohled (kanárky) ---------- */
{
  const kanar = (x, pole) => { const o = {}; pole.forEach(k => { o[k] = 'KANAR_' + x + '_' + k; }); return o; };
  const z = zakNova();
  Object.assign(z, kanar('A', VZ_HLAVICKA_POLE));
  z.zastupci = kanar('A', VZ_ZASTUPCI_POLE);
  Object.assign(z.projHlavicka, { objednatel: 'KANAR_A_objednatel', adresaObjednatele: 'KANAR_A_adresaObjednatele',
    ico: 'KANAR_A_ico', kontakt: 'KANAR_A_kontakt' });
  z.pdZadani = { otisk: { objednatel: 'KANAR_A_objednatel' } };
  z.pdStav = { org: 'KANAR_A_objednatel' };
  const uB = Object.assign(kanar('B', VZ_HLAVICKA_POLE), { zastupci: kanar('B', VZ_ZASTUPCI_POLE) });
  const uC = Object.assign(kanar('C', VZ_HLAVICKA_POLE), { zastupci: kanar('C', VZ_ZASTUPCI_POLE) });
  vzPridej(z, uB, { kdo: 'zkousejici' });
  vzPridej(z, uC, { vlastni: true, kdo: 'zkousejici' });
  const pred = J(z);
  const pohledy = { A: vzPohled(z, 'z1'), B: vzPohled(z, 'z2'), C: vzPohled(z, 'z3') };
  test('vzPohled nemění zakázku', J(z) === pred);
  ['A', 'B', 'C'].forEach(x => {
    const p = pohledy[x], s = J(p);
    const cizi = ['A', 'B', 'C'].filter(y => y !== x).filter(y => s.indexOf('KANAR_' + y + '_') >= 0);
    test('pohled ' + x + ': žádný kanárek jiného zákazníka', p && cizi.length === 0, cizi);
    const svoje = VZ_HLAVICKA_POLE.concat(VZ_ZASTUPCI_POLE).filter(k => s.indexOf('KANAR_' + x + '_' + k) < 0);
    test('pohled ' + x + ': obsahuje všechny své kanárky', p && svoje.length === 0, svoje);
    test('pohled ' + x + ': bez dalsiZakaznici a vzRidici', p && !('dalsiZakaznici' in p) && !('vzRidici' in p));
    test('pohled ' + x + ': sdílí pole variant (mělká kopie)', p && p.varianty === z.varianty);
  });
  const B = pohledy.B;
  test('pohled B: hlavička = údaje B', VZ_HLAVICKA_POLE.every(k => B[k] === 'KANAR_B_' + k));
  test('pohled B: zástupci = zástupci B', J(B.zastupci) === J(uB.zastupci));
  test('pohled B: projHlavicka nese údaje B, ostatní pole PROJ zůstávají',
    ['objednatel', 'adresaObjednatele', 'ico', 'kontakt'].every(k => B.projHlavicka[k] === 'KANAR_B_' + k)
    && B.projHlavicka.cislo === z.projHlavicka.cislo && B.projHlavicka !== z.projHlavicka);
  test('pohled B: vzPohledZakaznika { id z2, písmeno B }', J(B.vzPohledZakaznika) === J({ id: 'z2', pismeno: 'B' }));
  test('pohled C: vzPohledZakaznika { id z3, písmeno C }', J(pohledy.C.vzPohledZakaznika) === J({ id: 'z3', pismeno: 'C' }));
  test('pohled dalšího zákazníka: bez pdZadani a pdStav', !('pdZadani' in B) && !('pdStav' in B) && !('pdStav' in pohledy.C));
  test('pohled řídícího: pdZadani a pdStav zůstávají, vzPohledZakaznika { z1, \'\' }',
    'pdZadani' in pohledy.A && 'pdStav' in pohledy.A && J(pohledy.A.vzPohledZakaznika) === J({ id: 'z1', pismeno: '' }));
  test('pohled bez id = pohled řídícího', J(vzPohled(z)) === J(pohledy.A));
  test('pohled: sdílená stavba (název akce, číslo) beze změny', B.nazevAkce === z.nazevAkce && B.cislo === z.cislo);
  test('vzPohled s neznámým id → null', vzPohled(z, 'z99') === null);
}
{
  const z = zakNova();
  const p = vzPohled(z);
  const bez = Object.assign({}, p); delete bez.vzPohledZakaznika;
  test('jeden zákazník: pohled = kopie zakázky + jen vzPohledZakaznika',
    J(bez) === J(z) && J(Object.keys(p)) === J(Object.keys(z).concat('vzPohledZakaznika'))
    && J(p.vzPohledZakaznika) === J({ id: 'z1', pismeno: '' }) && p !== z);
  test('jeden zákazník: pohled z1 = pohled bez id; jiné id → null', J(vzPohled(z, 'z1')) === J(p) && vzPohled(z, 'z2') === null);
}

/* ---------- 7. vzTvarProblemy ---------- */
{
  const z = zakNova();
  vzPridej(z, udaje('B'));
  vzPridej(z, udaje('C'), { vlastni: true });
  test('platná zakázka po vzPridej: []', J(vzTvarProblemy(z)) === '[]', vzTvarProblemy(z));
  test('zakázka bez víc zákazníků: []', J(vzTvarProblemy(zakNova())) === '[]');
  const vada = (n, uprav, duvod, kde) => {
    const k = kop(z); uprav(k);
    const p = vzTvarProblemy(k);
    test('tvar: ' + n, p.some(x => (!duvod || x.duvod === duvod) && (!kde || x.kde.indexOf(kde) >= 0)), p);
  };
  vada('duplicitní id', k => { k.dalsiZakaznici[1].id = k.dalsiZakaznici[0].id; }, 'duplicita', '.id');
  vada('id řídícího v položce', k => { k.dalsiZakaznici[0].id = 'z1'; }, 'duplicita', '.id');
  vada('duplicitní písmeno', k => { k.dalsiZakaznici[1].pismeno = 'B'; }, 'duplicita', '.pismeno');
  vada('písmeno A (mimo B–Z)', k => { k.dalsiZakaznici[0].pismeno = 'A'; }, 'typ', '.pismeno');
  vada('písmeno malé b', k => { k.dalsiZakaznici[0].pismeno = 'b'; }, 'typ', '.pismeno');
  vada('dvě písmena', k => { k.dalsiZakaznici[0].pismeno = 'BB'; }, 'typ', '.pismeno');
  vada('ukazatel na neexistující variantu', k => { k.dalsiZakaznici[0].varianta = 'neni'; }, 'varianta', 'dalsiZakaznici[0].varianta');
  vada('vzRidici na neexistující variantu', k => { k.vzRidici.varianta = 'neni'; }, 'varianta', 'vzRidici.varianta');
  vada('10 dalších (limit)', k => { for (let i = 0; i < 8; i++) k.dalsiZakaznici.push(Object.assign(kop(k.dalsiZakaznici[0]), { id: 'z' + (10 + i), pismeno: VZ_PISMENA[5 + i] })); }, 'limit');
  vada('text delší než VZ_TEXT_MAX (hlavička)', k => { k.dalsiZakaznici[0].hlavicka.adresaObjednatele = 'x'.repeat(VZ_TEXT_MAX + 1); }, 'delka');
  vada('text delší než VZ_TEXT_MAX (zástupci)', k => { k.dalsiZakaznici[0].zastupci.ucet = 'x'.repeat(VZ_TEXT_MAX + 1); }, 'delka');
  vada('neznámý klíč položky', k => { k.dalsiZakaznici[0].tajne = 'x'; }, 'klic', 'tajne');
  vada('neznámý klíč hlavičky', k => { k.dalsiZakaznici[0].hlavicka.navic = 'x'; }, 'klic', 'hlavicka.navic');
  vada('neznámý klíč zástupců', k => { k.dalsiZakaznici[0].zastupci.navic = 'x'; }, 'klic', 'zastupci.navic');
  vada('neznámý klíč vzRidici', k => { k.vzRidici.navic = 'x'; }, 'klic', 'vzRidici.navic');
  vada('chybí vzRidici při dalsiZakaznici', k => { delete k.vzRidici; }, 'typ', 'vzRidici');
  vada('dalsiZakaznici chybí při vzRidici', k => { delete k.dalsiZakaznici; }, 'typ', 'dalsiZakaznici');
  vada('prázdný název', k => { k.dalsiZakaznici[0].hlavicka.objednatel = '  '; }, null, 'hlavicka.objednatel');
  vada('číslo místo textu v hlavičce', k => { k.dalsiZakaznici[0].hlavicka.ico = 123; }, 'typ', 'hlavicka.ico');
  vada('položka není objekt', k => { k.dalsiZakaznici[0] = 'x'; }, 'typ');
  vada('id ve špatném tvaru', k => { k.dalsiZakaznici[0].id = 'x2'; }, 'typ', '.id');
  vada('vzRidici s písmenem', k => { k.vzRidici.pismeno = 'B'; }, 'duplicita', 'pismeno');
}

/* ---------- 8. import (importZakazka → vzOcisti) ---------- */
{
  const z = zakNova();
  vzPridej(z, udaje('B'), { kdy: '2026-11-16T10:00:00.000Z', kdo: 'zkousejici' });
  vzPridej(z, udaje('C'), { vlastni: true, kdy: '2026-11-16T10:00:00.000Z', kdo: 'zkousejici' });
  const vz = J({ r: z.vzRidici, d: z.dalsiZakaznici });

  const m = importZakazka(kop(z));
  test('import platné zakázky: vzRidici a dalsiZakaznici beze změny', J({ r: m.vzRidici, d: m.dalsiZakaznici }) === vz, { r: m.vzRidici });
  test('import platné zakázky: bez vzZahozeno', m.vzZahozeno === undefined);
  test('import platné zakázky: ukazatele míří na existující varianty', vzTvarProblemy(m).length === 0, vzTvarProblemy(m));

  const s = kop(z);
  s.vzRidici.navic = 1;
  s.dalsiZakaznici[0].navic = 1;
  s.dalsiZakaznici[0].hlavicka.navic = 1;
  s.dalsiZakaznici[1].zastupci.navic = 1;
  const m2 = importZakazka(s);
  test('import: neznámé klíče (položka, hlavička, zástupci, vzRidici) zmizí tiše', J({ r: m2.vzRidici, d: m2.dalsiZakaznici }) === vz && m2.vzZahozeno === undefined);

  const v = kop(z);
  v.dalsiZakaznici[1].pismeno = 'B';
  const m3 = importZakazka(v);
  test('import vadného tvaru: oba klíče pryč', !('vzRidici' in m3) && !('dalsiZakaznici' in m3));
  test('import vadného tvaru: vzZahozeno = neprázdné pole, nevýčtové',
    Array.isArray(m3.vzZahozeno) && m3.vzZahozeno.length > 0 && Object.keys(m3).indexOf('vzZahozeno') < 0
    && !Object.getOwnPropertyDescriptor(m3, 'vzZahozeno').enumerable);
  test('import vadného tvaru: vzZahozeno není v JSON', J(m3).indexOf('vzZahozeno') < 0 && J(m3).indexOf('Zákazník B') < 0);

  const pr = kop(zakNova());
  pr.vzRidici = { id: 'z1', pismeno: '', varianta: pr.varianty[0].id };
  pr.dalsiZakaznici = [];
  const m4 = importZakazka(pr);
  test('import dalsiZakaznici: [] → oba klíče pryč bez varování', !('vzRidici' in m4) && !('dalsiZakaznici' in m4) && m4.vzZahozeno === undefined);

  const m5 = importZakazka(kop(zakNova()));
  test('import zakázky s jedním zákazníkem: žádné klíče víc zákazníků', !('vzRidici' in m5) && !('dalsiZakaznici' in m5) && m5.vzZahozeno === undefined);

  const ch = kop(z);
  delete ch.dalsiZakaznici[0].hlavicka.dic;
  delete ch.dalsiZakaznici[0].zastupci;
  const m6 = importZakazka(ch);
  test('import: chybějící pole hlavičky a zástupci se doplní prázdná', m6.dalsiZakaznici && m6.dalsiZakaznici[0].hlavicka.dic === ''
    && J(m6.dalsiZakaznici[0].zastupci) === J(vzZastupciPrazdni()) && m6.vzZahozeno === undefined);
}

/* ---------- 9. zakazkaDuplikuj ---------- */
{
  const z = zakNova();
  vzPridej(z, udaje('B'));
  const d = zakazkaDuplikuj(z, '2026 - ZKU - CN - 0001');
  test('zakazkaDuplikuj nepřenáší vzRidici ani dalsiZakaznici', d && !('vzRidici' in d) && !('dalsiZakaznici' in d) && J(d).indexOf('Zákazník B') < 0);
  test('zakazkaDuplikuj nemění originál', vzRezim(z) && z.dalsiZakaznici.length === 1);
}

/* ---------- 10. ARES nad hlavičkou dalšího zákazníka ---------- */
{
  const z = zakNova();
  Object.assign(z, { objednatel: 'Stará firma s.r.o.', adresaObjednatele: 'Stará 1', ico: '', dic: 'CZ00000000', kontakt: 'Osoba' });
  const b = vzPridej(z, { objednatel: z.objednatel, adresaObjednatele: z.adresaObjednatele, ico: z.ico, dic: z.dic, kontakt: z.kontakt }).zakaznik;
  const h = z.dalsiZakaznici[0].hlavicka;
  const subjekt = { nazev: 'Nová firma a.s.', adresa: 'Nová 2, Jinde', ico: '12345679', dic: '' };
  test('hlavička dalšího zákazníka má klíče ARES_POLE', ARES_POLE.every(p => p.klic in h));
  const rz = aresRozdily(z, subjekt), rh = aresRozdily(h, subjekt);
  test('aresRozdily: stejný výsledek nad hlavičkou dalšího jako nad zakázkou', rz.length === 3 && J(rz) === J(rh), { rz, rh });
  const kz = { objednatel: z.objednatel, adresaObjednatele: z.adresaObjednatele, ico: z.ico, dic: z.dic, kontakt: z.kontakt };
  const nz = aresPrepis(kz, subjekt), nh = aresPrepis(h, subjekt);
  test('aresPrepis: stejný počet i výsledek', nz === nh && nz === 3 && J(kz) === J(h), { kz, h });
  test('aresPrepis: hlavička dalšího má po přepisu platný tvar', vzTvarProblemy(z).length === 0 && b.id === 'z2');
}

/* ---------- 11. bez stop ---------- */
{
  const z = zakNova();
  z.zastupci.obchodniJmeno = 'Obchodník Zkušební';
  const pred = J(z);
  const r1 = vzPridej(z, udaje('B'));
  const r2 = vzOdstran(z, r1.zakaznik.id);
  test('bez stop: přidat (sdílená) → odstranit = JSON shodný s výchozím', r1.ok && r2.ok && J(z) === pred);
  const r3 = vzPridej(z, udaje('B')), r4 = vzPridej(z, udaje('C'));
  vzOdstran(z, r4.zakaznik.id); vzOdstran(z, r3.zakaznik.id);
  test('bez stop: dva zákazníci, odstranění v opačném pořadí = výchozí JSON', r3.ok && r4.ok && J(z) === pred);
}

/* ---------- vzMaData, vzPodpis, vzPlatnaDrz (API pro server) ---------- */
{
  const z = zakNova();
  test('vzMaData: zakázka bez klíčů = false; s prázdným polem = true', !vzMaData(z) && vzMaData(Object.assign(kop(z), { dalsiZakaznici: [] })));
  test('vzPodpis: bez víc zákazníků \'\'', vzPodpis(z) === '');
  vzPridej(z, udaje('B'));
  const p1 = vzPodpis(z);
  z.dalsiZakaznici[0].platna = { varianta: 'x', cislo: '1', kdy: 'k', cena: 1, mena: 'CZK' };
  test('vzPodpis: platna se neporovnává', vzPodpis(z) === p1 && p1 !== '');
  z.dalsiZakaznici[0].hlavicka.kontakt = 'Jiná osoba';
  test('vzPodpis: změna hlavičky se pozná', vzPodpis(z) !== p1);
  const stara = { dalsiZakaznici: [{ id: 'z2', platna: { varianta: 'v', cislo: 'C', kdy: 'k', cena: 0, mena: 'CZK' } }] };
  vzPlatnaDrz(stara, z);
  test('vzPlatnaDrz: platna z prohlížeče nahrazena uloženou', J(z.dalsiZakaznici[0].platna) === J(stara.dalsiZakaznici[0].platna));
  vzPlatnaDrz({}, z);
  test('vzPlatnaDrz: bez uložené platna klíč zmizí', !('platna' in z.dalsiZakaznici[0]));
}

/* Pojistka (ověřeno ručně kopií modulu, 16. 11. 2026): sada selže, když
 *  – vzPohled nechá `dalsiZakaznici` (smazaný řádek `delete p.dalsiZakaznici`),
 *  – vzPismenoDalsi nečte razítka zámků (smazaný řádek s vzRazitkaZakazniku),
 *  – vzOdstran po posledním dalším klíče nesmaže,
 *  – vzVymenRidiciho nesmaže otisky webhooku,
 *  – vzOcisti nesmaže neznámé klíče (bez(...) vynecháno),
 *  – VZ_DALSI_MAX = 10. */

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
