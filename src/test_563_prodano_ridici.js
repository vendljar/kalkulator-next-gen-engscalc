/* PR #563 — prodaná varianta je vždy řídící (model + napojení UI).
 *
 * J. V. 4. 11. 2026: „Ve chvíli, kdy je kalkulace prodána, je tato vždy
 * řídící. Nastav tedy automaticky prodanou kalkulaci jako řídící, kdyby
 * náhodou do té doby nebyla." Hlídá:
 *   1. prodRidiciSrovnej — přepne řídící na prodanou variantu (jedna řídící,
 *      stopa zamek.hlavicka u dosavadní i nové odeslané řídící, K7-S2 #508);
 *      prodaná řídící / neprodaná zakázka → nic;
 *   2. prodRidiciZamceno — po prodeji řídící jinam nejde, po odemčení ano;
 *   3. prodJedinaZmena — prodej + přepnutí řídící na PRODANOU je pro zámek
 *      čtení jediná povolená změna (PB #547), i ze staršího okna bez
 *      přepnutí; přepnutí bez prodeje nebo prodej + změna dat ne;
 *   4. napojení UI: Prodáno přepne řídící v témže uložení a ohlásí to
 *      (progZprava „Prodaná varianta X je teď řídící."), při neuložení vrátí;
 *      ruční přepnutí po prodeji se nenabízí (varRidici, tlačítko, seznam);
 *      starší zakázka se srovná až při uložení (onlineUloz), ne při načtení.
 * Server hlídá netlify/test_563_prodano_ridici.mjs, prohlížeč
 * overit_prodano_zamek.mjs. Pojistka: nad b751c91 (v4.11.4) sada padá —
 * prodRidiciSrovnej / prodRidiciZamceno neexistují a UI je nevolá. Smyšlené údaje. */
const fs = require('fs');
const path = require('path');
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
const rid = z => z.varianty.filter(x => x.ridici).map(x => x.id);

test('prodRidiciSrovnej a prodRidiciZamceno existují (exportované z objednane.js)', fn('prodRidiciSrovnej') && fn('prodRidiciZamceno'));
if (!fn('prodRidiciSrovnej') || !fn('prodRidiciZamceno')) { console.log(`\n${ok} OK, ${fail} FAIL`); process.exit(1); }

/* Odeslaná řídící varianta 1 a odeslaný klon 2 (jak je prohlížeč načte). */
const zak = novaZakazka();
zak.cislo = '2026 - OPR - CN - 8781'; zak.nazevAkce = 'TEST PR';
const v1 = zak.varianty[0];
zamkniVariantu(v1, { typ: 'nabidkaTisk', kdy: '2026-11-03T08:00:00.000Z', cislo: variantaCislo(zak, v1) });
zamekZakHlavickaOznac(zak);
const v2 = klonujVariantu(zak, v1.id);
zamkniVariantu(v2, { typ: 'nabidkaTisk', kdy: '2026-11-03T09:00:00.000Z', cislo: variantaCislo(zak, v2) });
const ulozeno = JSON.stringify(zak);
test('(příprava: řídící v1 se stopou hlavičky, v2 odeslaná neřídící)', rid(zak).join() === v1.id && v1.zamek.hlavicka === true
  && variantaUzamcena(v2) && !v2.zamek.hlavicka);

console.log('\n--- 1. prodRidiciSrovnej ---');
{
  const a = JSON.parse(ulozeno);
  test('neprodaná zakázka → nic', O.prodRidiciSrovnej(a) === '' && JSON.stringify(a) === ulozeno);
  test('prodNastav klonu v2', O.prodNastav(a, a.varianty[1], '2026-11-04', { ted: '2026-11-04T10:00:00.000Z' }) === '');
  test('prodej v2 → řídící je právě v2', O.prodRidiciSrovnej(a) === v2.id && rid(a).join() === v2.id, rid(a));
  test('…stopa hlavičky zůstala u v1 a přibyla u v2 (přepnutí hlavičku neuvolní)',
    a.varianty[0].zamek.hlavicka === true && a.varianty[1].zamek.hlavicka === true);
  test('…data ani zámek jinak beze změny', JSON.stringify(a.varianty.map(x => x.data)) === JSON.stringify(zak.varianty.map(x => x.data)));
  test('druhé volání nic nemění', O.prodRidiciSrovnej(a) === '');
  const b = JSON.parse(ulozeno);
  O.prodNastav(b, b.varianty[0], '2026-11-04', { ted: '2026-11-04T10:00:00.000Z' });
  test('prodej řídící v1 → beze změny', O.prodRidiciSrovnej(b) === '' && rid(b).join() === v1.id);
  const c = JSON.parse(ulozeno);
  c.varianty[1].prodano = { datum: '2026-11-04' }; c.varianty[1].zamek = null;
  test('„prodaná" nezamčená varianta (neplatný prodej) řídící nedostane', O.prodRidiciSrovnej(c) === '' && rid(c).join() === v1.id);
  test('bez zakázky nespadne', O.prodRidiciSrovnej(null) === '' && O.prodRidiciSrovnej({}) === '');
}

console.log('\n--- 2. prodRidiciZamceno ---');
{
  const a = JSON.parse(ulozeno);
  test('neprodaná zakázka: přepnutí jde', O.prodRidiciZamceno(a, v2.id) === '' && O.prodRidiciZamceno(a, v1.id) === '');
  O.prodNastav(a, a.varianty[1], '2026-11-04', { ted: '2026-11-04T10:00:00.000Z' });
  const t = O.prodRidiciZamceno(a, v1.id);
  test('prodaná v2: řídící na v1 nejde, hláška jmenuje prodanou variantu a cestu ven',
    /„Varianta 2" \(2026 - OPR - CN - 8781\.2\)/.test(t) && /vždy řídící/.test(t) && /odemčení prodeje/.test(t), t);
  test('…na prodanou v2 jde', O.prodRidiciZamceno(a, v2.id) === '');
  O.prodOdemkni(a, a.varianty[1], 'Zákazník si to rozmyslel');
  test('po odemčení prodeje jde zase kamkoli', O.prodRidiciZamceno(a, v1.id) === '');
}

console.log('\n--- 3. prodJedinaZmena (zámek čtení, PB #547) ---');
{
  const a = JSON.parse(ulozeno);
  O.prodNastav(a, a.varianty[1], '2026-11-04', { ted: '2026-11-04T10:00:00.000Z' });
  O.prodRidiciSrovnej(a);
  test('prodej v2 + řídící na prodanou v2 = jediná povolená změna', O.prodJedinaZmena(a, ulozeno) === true);
  test('…a model nezměnil předané objekty (porovnává kopie)', rid(a).join() === v2.id && !JSON.parse(ulozeno).varianty[1].prodano);
  const c = JSON.parse(ulozeno);
  O.prodNastav(c, c.varianty[1], '2026-11-04', { ted: '2026-11-04T10:00:00.000Z' });
  test('prodej v2 bez přepnutí (starší okno) dál projde', O.prodJedinaZmena(c, ulozeno) === true);
  const g = JSON.parse(ulozeno); g.aktivni = v1.id;
  const ug = JSON.stringify(g);
  g.aktivni = v2.id;
  O.prodNastav(g, g.varianty[1], '2026-11-04', { ted: '2026-11-04T10:00:00.000Z' });
  O.prodRidiciSrovnej(g);
  test('prodej po přepnutí otevřené varianty (aktivni v1 → v2) dál jediná povolená změna', O.prodJedinaZmena(g, ug) === true);
  const h = JSON.parse(ug); h.aktivni = v2.id;
  test('…samotné přepnutí otevřené varianty ale není prodej (nic se neukládá)', O.prodJedinaZmena(h, ug) === false);
  const d = JSON.parse(ulozeno); nastavRidici(d, v2.id);
  test('přepnutí řídící BEZ prodeje není povolená změna', O.prodJedinaZmena(d, ulozeno) === false);
  const e = JSON.parse(ulozeno);
  const k3 = klonujVariantu(e, v1.id, { aktivovat: false });
  const u3 = JSON.stringify(e);
  O.prodNastav(e, e.varianty[1], '2026-11-04', { ted: '2026-11-04T10:00:00.000Z' });
  nastavRidici(e, k3.id);
  /* Výsledek uložení je týž jako u prodeje samotného: server řídící srovná na
   * prodanou (prodServer), takže přepnutí jinam se nezapíše. */
  test('prodej v2 + řídící jinam: zapíše se jen prodej (řídící srovná na prodanou model i server)', O.prodJedinaZmena(e, u3) === true);
  const f = JSON.parse(ulozeno);
  O.prodNastav(f, f.varianty[1], '2026-11-04', { ted: '2026-11-04T10:00:00.000Z' });
  O.prodRidiciSrovnej(f);
  f.varianty[1].data.ock.zadani.zdvih = 77;
  test('prodej + přepnutí + změna dat dál zastaveno', O.prodJedinaZmena(f, ulozeno) === false);
}

console.log('\n--- 4. napojení UI ---');
{
  const ui = n => fs.readFileSync(path.join(__dirname, 'ui', n), 'utf8');
  const sod = ui('sod_ui.js'), zak = ui('zakazka_ui.js'), com = ui('common.js'), sez = ui('seznam_ui.js'), onl = ui('online_ui.js');
  const prodej = (sod.match(/async function prodejUiProdej\([\s\S]*?\n\}/) || [''])[0];
  test('Prodáno: prodRidiciSrovnej PŘED uložením (téže uložení)', /prodRidiciSrovnej\(ZAK\)[\s\S]*prodUiUloz\(\)/.test(prodej), prodej.slice(0, 200));
  test('Prodáno: při neuložení se řídící i stopa hlavičky vrátí', /if \(!r\.ok\)[\s\S]*p\.x\.ridici = p\.ridici/.test(prodej));
  test('Prodáno: hláška „Prodaná varianta X je teď řídící." přes progZprava',
    /'Prodaná varianta ' \+ variantaCislo\(ZAK, v\) \+ ' je teď řídící\.'/.test(prodej) && /progZprava\(t\)/.test(prodej));
  test('Prodáno: otevřená varianta = prodaná (výběr „… · řídící")', /if \(novaRidici\) ZAK\.aktivni = v\.id/.test(prodej));
  const varR = (zak.match(/function varRidici\([\s\S]*?\n\}/) || [''])[0];
  test('varRidici: po prodeji odmítne s hláškou (prodRidiciZamceno)', /prodRidiciZamceno\(ZAK, id\)/.test(varR) && /hlaska\(proc\)/.test(varR)
    && varR.indexOf('prodRidiciZamceno') < varR.indexOf('nastavRidici('));
  test('hlavička: tlačítko „nastavit jako řídící" se po prodeji nenabízí', /ridiciZamceno = [^\n]*prodRidiciZamceno\(ZAK, akt\.id\)/.test(com)
    && /ridiciBtn = akt\.ridici \? '' : ridiciZamceno/.test(com));
  test('seznam variant: zaškrtávátko řídící po prodeji zakázané', /prodRidiciZamceno\(ZAK, r\.id\)\) \? ' disabled'/.test(sez));
  const uloz = (onl.match(/function onlineUloz\(opts\)[\s\S]*?\n\}/) || [''])[0];
  const iCteni = uloz.indexOf('zamekCteniJe() && !onlineJenZapisnik()'), iSrovnej = uloz.indexOf('prodRidiciSrovnej(ZAK)');
  const iTelo = uloz.indexOf('const telo = { zakazka: ZAK');
  test('onlineUloz: starší zakázku srovná až při uložení — za zámkem čtení, před odesláním', iCteni > 0 && iSrovnej > iCteni && iTelo > iSrovnej,
    [iCteni, iSrovnej, iTelo]);
  const imp = fs.readFileSync(path.join(__dirname, 'zakazka.js'), 'utf8').match(/function importZakazka\([\s\S]*?\n\}/);
  test('import (načtení) řídící podle prodeje nemigruje', !!imp && !/prodRidiciSrovnej/.test(imp[0]));
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
