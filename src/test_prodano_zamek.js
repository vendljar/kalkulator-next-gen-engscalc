/* PB #547 — Prodáno nad odeslanou nabídkou otevřenou jen ke čtení (model).
 *
 * J. V. 2. 11. 2026: stisk Prodáno u odeslané nabídky otevřené online
 * ukázal dialog klonu a prodej se neuložil s hláškou „Prodej se neuložil:
 * Otevřeno online: ….json". Hlídá:
 *   1. prodJedinaZmena — zámek čtení pustí zápis, je-li JEDINOU změnou proti
 *      uložené verzi záznam prodeje (v.prodano, prodejOdemknout,
 *      prodejHistorie); jakákoli jiná změna (cena, krycí list, hlavička)
 *      nebo žádná změna → false;
 *   2. prodNeulozenoText — hláška nese skutečnou příčinu, bez zdvojeného
 *      „Neuloženo online:", a bez příčiny obecnou radu (ne stavovou zprávu);
 *   3. prodej dál jen u odeslané (zamčené) varianty (prodNelzeProdat).
 * Pojistka: nad 141b92f (v2.11.2) sada padá — funkce prodJedinaZmena
 * a prodNeulozenoText neexistují. Smyšlené údaje. */
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
['./format.js', './preklad.js', './cenik.js', './engine.js'].forEach(f => { try { nacti(f); } catch (e) {} });
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
['./techspec.js', './sleva.js', './zaokrouhleni.js', './podminky.js', './firma.js', './zakazka.js', './zamek.js', './kryci.js', './kryci_proj.js']
  .forEach(f => { try { nacti(f); } catch (e) { /* v Node nemusí jít */ } });
const O = nacti('./objednane.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};
const kopie = x => JSON.parse(JSON.stringify(x));
const fn = n => typeof O[n] === 'function';

test('prodJedinaZmena a prodNeulozenoText existují (exportované z objednane.js)', fn('prodJedinaZmena') && fn('prodNeulozenoText'));
if (!fn('prodJedinaZmena') || !fn('prodNeulozenoText')) { console.log(`\n${ok} OK, ${fail} FAIL`); process.exit(1); }

/* Odeslaná nabídka, jak ji prohlížeč načte z databáze. */
const zak = novaZakazka();
zak.cislo = '2026 - OPR - CN - 8721'; zak.nazevAkce = 'TEST Prodáno';
const v = zak.varianty[0];
v.data.kryci = { hodnoty: { jmenoPrijmeni: 'Zkušební Kontakt' } };
zamkniVariantu(v, { typ: 'nabidkaTisk', kdy: '2026-10-27T10:00:00.000Z', kdo: 'Test' });
const ulozeno = JSON.stringify(zak);

console.log('— 1. jediná změna = prodej —');
test('beze změny → false (nic k uložení)', O.prodJedinaZmena(ulozeno, ulozeno) === false);
{
  const a = kopie(zak);
  test('Prodáno nad zamčenou variantou: prodNastav projde', O.prodNastav(a, a.varianty[0], '2026-11-02', { kdo: 'obch@priklad.cz', ted: '2026-11-02T10:00:00Z' }) === '');
  test('jen záznam prodeje → true (zámek čtení zápis pustí)', O.prodJedinaZmena(JSON.stringify(a), ulozeno) === true);
  test('…i s objektem místo JSON', O.prodJedinaZmena(a, JSON.parse(ulozeno)) === true);
  const b = kopie(a); b.varianty[0].data.ock.zadani.zdvih = 12;
  test('prodej + změna kalkulace → false', O.prodJedinaZmena(b, ulozeno) === false);
  const c = kopie(a); c.varianty[0].data.kryci.hodnoty.jmenoPrijmeni = 'Jiný';
  test('prodej + změna krycího listu → false', O.prodJedinaZmena(c, ulozeno) === false);
  const d = kopie(a); d.nazevAkce = 'Přejmenováno';
  test('prodej + změna hlavičky → false', O.prodJedinaZmena(d, ulozeno) === false);
  const e = kopie(a); e.varianty[0].zamek.zamceno = false;
  test('prodej + odemčený zámek varianty → false', O.prodJedinaZmena(e, ulozeno) === false);
  const f = kopie(zak); f.varianty[0].data.ock.zadani.zdvih = 12;
  test('změna bez prodeje → false', O.prodJedinaZmena(f, ulozeno) === false);
}
{
  /* Odemčení prodeje (vedoucí): uložená verze je prodaná, okno pošle žádost. */
  const prodana = kopie(zak);
  O.prodNastav(prodana, prodana.varianty[0], '2026-11-02', { kdo: 'obch@priklad.cz' });
  prodana.prodejHistorie = [{ akce: 'prodano', varianta: prodana.varianty[0].id, datum: '2026-11-02', kdo: 'obch@priklad.cz', kdy: 'x' }];
  const ul2 = JSON.stringify(prodana);
  const a = kopie(prodana);
  test('odemčení prodeje: prodOdemkni projde', O.prodOdemkni(a, a.varianty[0], 'Zákazník odstoupil') === '');
  test('odemčení prodeje je jediná změna → true', O.prodJedinaZmena(a, ul2) === true);
  const b = kopie(a); b.varianty[0].data.ock.zadani.sirka = 2;
  test('odemčení + změna kalkulace → false', O.prodJedinaZmena(b, ul2) === false);
}
test('nečitelný vstup → false', O.prodJedinaZmena('{', ulozeno) === false && O.prodJedinaZmena(null, ulozeno) === false
  && O.prodJedinaZmena([], ulozeno) === false);

console.log('— 2. hláška se skutečnou příčinou —');
{
  const t = O.prodNeulozenoText('prodej', 'Neuloženo online: Prodej zapisuje obchodník zakázky, vedoucí nebo administrátor');
  test('příčina ze serveru bez zdvojeného „Neuloženo online:"', /^Prodej se neuložil: Prodej zapisuje obchodník zakázky/.test(t)
    && !/Neuloženo/.test(t) && /Zakázka zůstává neprodaná\.$/.test(t), t);
  const u = O.prodNeulozenoText('prodej', '');
  test('bez příčiny obecná rada, ne stavová zpráva', /^Prodej se neuložil: uložení do databáze neproběhlo/.test(u) && !/Otevřeno online/.test(u), u);
  const w = O.prodNeulozenoText('odemceni', 'Neuloženo: Prodanou zakázku odemyká jen vedoucí nebo administrátor');
  test('odemčení: vlastní věta a „zůstává prodaná"', /^Odemčení prodeje se neuložilo: Prodanou zakázku odemyká/.test(w)
    && /Zakázka zůstává prodaná\.$/.test(w), w);
}

console.log('— 4. K37-N4: dolní mez data prodeje —');
{
  test('prodDatumOd = pražský den zámku', O.prodDatumOd(v) === '2026-10-27', O.prodDatumOd(v));
  const a = kopie(zak);
  const e1 = O.prodNastav(a, a.varianty[0], '2001-01-01', { ted: '2026-11-02T10:00:00Z' });
  test('2001-01-01 → odmítnuto (dřív než odeslání nabídky), prodej se nezapíše', /dřív než odeslání nabídky \(27\. 10\. 2026\)/.test(e1)
    && !a.varianty[0].prodano, e1);
  const e2 = O.prodNastav(a, a.varianty[0], '2026-10-26', { ted: '2026-11-02T10:00:00Z' });
  test('den před odesláním → odmítnuto', /dřív než odeslání/.test(e2), e2);
  test('den odeslání → projde', O.prodNastav(kopie(zak), kopie(zak).varianty[0], '2026-10-27', { ted: '2026-11-02T10:00:00Z' }) === '');
  test('budoucnost → odmítnuto', /budoucnosti/.test(O.prodNastav(kopie(zak), kopie(zak).varianty[0], '2026-11-03', { ted: '2026-11-02T10:00:00Z' })));
  /* Zámek ve 23:30 UTC 27. 10. = 28. 10. v Praze. */
  const w = kopie(v); w.zamek.kdy = '2026-10-27T23:30:00.000Z';
  test('mez je pražský den (23:30 UTC → další den)', O.prodDatumOd(w) === '2026-10-28', O.prodDatumOd(w));
  const bez = kopie(v); delete bez.zamek.kdy;
  test('zámek bez času (starší data) dolní mez nemá', O.prodDatumOd(bez) === '' && O.prodDatumProblem('2001-01-01', bez, '2026-11-02T10:00:00Z') === '');
  const s = O.prodServer(null, (() => { const z = kopie(zak); z.varianty[0].prodano = { datum: '2001-01-01' }; return z; })(),
    { email: 'obch@priklad.cz', role: 'Obchodník' }, { ted: '2026-11-02T10:00:00Z', kdy: '2026-11-02T10:00:00Z' });
  test('prodServer: 2001-01-01 → 400', !!s && s.status === 400 && /dřív než odeslání/.test(s.chyba), s);
}

console.log('— 5. K37-N2: pole SoD prodané varianty do prvního tisku SoD —');
{
  const p = kopie(v); p.prodano = { datum: '2026-11-02' };
  const st = (w, list, id) => zamekKryciPoleStav(w, list, id);
  test('po Prodáno: číslo SoD a datum podpisu (OCK) i číslo SoD (PROJ) zapisovatelné',
    st(p, 'kryci', 'cisloSod') === 'editovatelne' && st(p, 'kryci', 'sodDatumPodpisu') === 'editovatelne'
      && st(p, 'kryciProj', 'cisloSod') === 'editovatelne', [st(p, 'kryci', 'cisloSod'), st(p, 'kryci', 'sodDatumPodpisu'), st(p, 'kryciProj', 'cisloSod')]);
  test('po Prodáno: ostatní krycí list zamčený (kontakt, záloha, PROJ odpovědná osoba)',
    st(p, 'kryci', 'jmenoPrijmeni') === 'zmrazeno' && st(p, 'kryci', 'zaloha1') === 'zmrazeno' && st(p, 'kryciProj', 'odpovednyJmeno') === 'zmrazeno');
  const q = kopie(p); zamkniVariantu(q, { typ: 'sod', kdy: '2026-11-02T10:00:00.000Z' });
  test('po prvním tisku SoD: pole SoD zamčená', st(q, 'kryci', 'cisloSod') === 'zmrazeno' && st(q, 'kryci', 'sodDatumPodpisu') === 'zmrazeno');
  const r = kopie(p); zamkniVariantu(r, { typ: 'sodProj', kdy: '2026-11-02T10:00:00.000Z' });
  test('po tisku SoD PROJ: číslo SoD PROJ zamčené', st(r, 'kryciProj', 'cisloSod') === 'zmrazeno');
  test('server porovná bez polí SoD (zamekDataPorovnani se zámkem uložené prodané varianty)', (() => {
    const a = kopie(p.data), b = kopie(p.data);
    b.kryci.hodnoty.cisloSod = 'SoD-1/2026'; b.kryci.hodnoty.sodDatumPodpisu = '2026-11-02';
    const c = kopie(b); c.kryci.hodnoty.jmenoPrijmeni = 'Jiný';
    return zamekDataPorovnani(a, p) === zamekDataPorovnani(b, p) && zamekDataPorovnani(a, p) !== zamekDataPorovnani(c, p)
      && zamekDataPorovnani(a, q) !== zamekDataPorovnani(b, q);
  })());
}

console.log('— 3. prodat jde jen odeslanou nabídku —');
{
  const z = novaZakazka(); z.cislo = '2026 - OPR - CN - 8722';
  test('neodeslaná varianta: „nabídka nebyla odeslána" (nejdřív vytisknout)',
    /jen odeslanou \(zamčenou\) nabídku/.test(O.prodNelzeProdat(z, z.varianty[0])), O.prodNelzeProdat(z, z.varianty[0]));
  test('zamčená varianta: prodat jde', O.prodNelzeProdat(zak, v) === '');
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
