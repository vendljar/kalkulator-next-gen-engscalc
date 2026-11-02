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

console.log('— 3. prodat jde jen odeslanou nabídku —');
{
  const z = novaZakazka(); z.cislo = '2026 - OPR - CN - 8722';
  test('neodeslaná varianta: „nabídka nebyla odeslána" (nejdřív vytisknout)',
    /jen odeslanou \(zamčenou\) nabídku/.test(O.prodNelzeProdat(z, z.varianty[0])), O.prodNelzeProdat(z, z.varianty[0]));
  test('zamčená varianta: prodat jde', O.prodNelzeProdat(zak, v) === '');
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
