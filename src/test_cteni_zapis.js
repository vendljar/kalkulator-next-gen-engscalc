/* ===== CO SE SMÍ ULOŽIT NAD ZAKÁZKOU OTEVŘENOU JEN KE ČTENÍ =====
 * (nálezy C6 a V41, 15. 9. 2026)
 *
 * Dvě správná rozhodnutí se navzájem rušila:
 *
 *  1) Zápisník je ze zámku vyňatý SCHVÁLNĚ (poznamky.js) — „zákazník volal,
 *     chce to o týden dřív" se dopisuje hlavně k nabídce, která už odešla.
 *  2) Autosave se v režimu čtení neozval VŮBEC, s odůvodněním „zamčené okno
 *     stejně žádnou editaci nepustí".
 *
 * To odůvodnění neplatilo právě pro zápisník. Obchodník tedy psal poznámky,
 * aplikace je přijala a zobrazila — a při nejbližším načtení stránky zmizely.
 * Protože se stránka načítá hlavně kvůli novému buildu, vypadalo to, že za to
 * může build („TAHLE POZNÁMKA SE MI VŽDYCKY SMAZALA PŘI NAČTENÍ NOVÉHO BUILDU").
 *
 * Opačným směrem byla díra ještě větší (V41): `zamekCteniJe()` se v celém
 * online_ui.js testovalo na JEDINÉM místě, v autosave. Ruční `onlineUloz()`
 * strážce neměl, takže „jen ke čtení" otevřenou zakázku šlo uložit sedmi
 * cestami — a zapsal se přitom výpočet, který aplikace sama změnila.
 *
 * Pravidlo zní: V REŽIMU ČTENÍ SE UKLÁDÁ ZÁPISNÍK, VÝPOČET NE. Bydlí
 * v jediné funkci, aby se autosave a ruční uložení nemohly rozejít.
 */
const fs = require('fs');
const pz = require('./poznamky.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

/* Zjednodušená zakázka — stačí, aby měla zápisník a něco mimo něj. */
const zak = () => ({
  cislo: '2026 - OPR - CN - 0777', nazevAkce: 'Zkušební',
  poznamky: [], prilohy: [], prilohySmazane: [],
  varianty: [{ id: 'v1', nazev: 'Varianta 1',
    data: { ock: { zadani: { sirka: 1.5, atyp: false } } } }],
});
const uloz = (z) => JSON.stringify(z);

/* ---------- 1) pravidlo samo ---------- */

{
  const a = zak(), b = zak();
  test('shodné zakázky nejsou „změna zápisníku"', pz.poznamkyJedinaZmena(uloz(a), uloz(b)) === false);
}
{
  const ulozena = zak(), ted = zak();
  ted.poznamky.push({ id: 'pz1', text: 'zákazník volal', kdy: '2026-09-15', kdo: 'DS' });
  test('přidaná poznámka JE jediná změna', pz.poznamkyJedinaZmena(uloz(ted), uloz(ulozena)) === true);
}
{
  const ulozena = zak(), ted = zak();
  ted.prilohy.push({ id: 'pr1', nazev: 'foto.jpg', velikost: 10 });
  test('přidaná příloha JE jediná změna', pz.poznamkyJedinaZmena(uloz(ted), uloz(ulozena)) === true);
}
{
  const ulozena = zak(), ted = zak();
  ted.prilohySmazane.push({ id: 'pr1', nazev: 'foto.jpg' });
  test('smazaná příloha JE jediná změna', pz.poznamkyJedinaZmena(uloz(ted), uloz(ulozena)) === true);
}

/* TOHLE JE TA DŮLEŽITÁ ČÁST. Nestačí se zeptat „přibyla poznámka?" — když se
 * spolu s ní změnila cena, uložit se to nesmí ani tak. Jinak by stačilo
 * připsat poznámku a propašovat s ní jakoukoli změnu výpočtu. */
{
  const ulozena = zak(), ted = zak();
  ted.poznamky.push({ id: 'pz1', text: 'poznámka', kdy: '2026-09-15', kdo: 'DS' });
  ted.varianty[0].data.ock.zadani.atyp = true;
  test('poznámka SPOLU se změnou výpočtu se neuloží',
    pz.poznamkyJedinaZmena(uloz(ted), uloz(ulozena)) === false);
}
{
  const ulozena = zak(), ted = zak();
  ted.varianty[0].data.ock.zadani.sirka = 2.0;
  test('samotná změna výpočtu se neuloží',
    pz.poznamkyJedinaZmena(uloz(ted), uloz(ulozena)) === false);
}
{
  const ulozena = zak(), ted = zak();
  ted.nazevAkce = 'Jiný název';
  test('změna hlavičky se neuloží', pz.poznamkyJedinaZmena(uloz(ted), uloz(ulozena)) === false);
}

/* Zakázka se po načtení ze serveru skládá znovu, takže pořadí klíčů se může
 * lišit. Bez stabilního porovnání by vyšlo „liší se všechno" a poznámka by
 * se zase neuložila — tentokrát z opačného důvodu. */
{
  const ulozena = zak();
  const prehozena = { varianty: ulozena.varianty, prilohySmazane: [], nazevAkce: 'Zkušební',
    prilohy: [], poznamky: [{ id: 'pz1', text: 'x', kdo: 'DS', kdy: '2026-09-15' }],
    cislo: '2026 - OPR - CN - 0777' };
  test('na pořadí klíčů nezáleží',
    pz.poznamkyJedinaZmena(uloz(prehozena), uloz(ulozena)) === true);
}

/* Bez čeho porovnat = neukládat. */
test('chybí uložená předloha → false', pz.poznamkyJedinaZmena(uloz(zak()), null) === false);
test('nečitelný vstup → false', pz.poznamkyJedinaZmena('{tohle není JSON', uloz(zak())) === false);
test('prázdný vstup → false', pz.poznamkyJedinaZmena(null, null) === false);

/* ---------- 2) strážce opravdu stojí v kódu (V41) ---------- */

const online = fs.readFileSync(__dirname + '/ui/online_ui.js', 'utf8');

test('ruční uložení se ptá na čtecí zámek',
  /function onlineUloz[\s\S]{0,4000}?zamekCteniJe\(\)\s*&&\s*!onlineJenZapisnik\(\)/.test(online));
test('autosave se ptá stejnou podmínkou',
  (online.match(/zamekCteniJe\(\)\s*&&\s*!onlineJenZapisnik\(\)/g) || []).length >= 2);
test('a pravidlo se nikde nepíše podruhé ručně',
  !/poznamkyBezZapisniku|POZN_POLE_ZAPISNIKU/.test(online));
test('tlačítko „Uložit online" je v režimu čtení vypnuté',
  /onclick="onlineUloz\(\)"[\s\S]{0,300}zamekCteniJe\(\)[\s\S]{0,80}disabled/.test(online));
test('dialog při přepnutí nenabízí „Uložit změny" v režimu čtení',
  /const jenCteni = typeof zamekCteniJe[\s\S]{0,1200}jenCteni\s*\?\s*\[\{ kod: 'zahodit'/.test(online));

/* Zápisník sám se ze zámku vyjmout NESMÍ zpátky — kdyby někdo do
 * poznamky_ui.js přidal zamekStop, poznámky by šly zase ztratit, jen jinudy. */
const poznUi = fs.readFileSync(__dirname + '/ui/poznamky_ui.js', 'utf8');
test('karta zápisníku zůstává bez zámku (píše se do ní i v režimu čtení)',
  !/zamekStop|zamekCteniStop/.test(poznUi));

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
