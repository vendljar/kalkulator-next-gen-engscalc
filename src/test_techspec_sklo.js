/* ===== TECHNICKÁ SPECIFIKACE MUSÍ PSÁT TO SKLO, KTERÉ SE POČÍTÁ =====
 * (nález C3 z testování obchodníkem, 15. 9. 2026)
 *
 * Kalkulace interiérové šachty počítala VSG (4.4.1 nebo 4.4.2 podle způsobu
 * zasklení), ale technická specifikace k téže nabídce psala „izolační dvojsklo
 * v kombinaci s VSG" a povrch „standardní dvojsklo". Dvojsklo má podle
 * rozhodnutí J. V. z 9. 9. 2026 jen šachta EXTERIÉROVÁ; uvnitř budovy není co
 * izolovat. Nabídka tedy slibovala dražší zasklení, než jaké bylo v ceně.
 * Z ostré databáze: 12 interiérových variant, u 10 text opravený nebyl.
 *
 * Příčina byla v tom, že ta pole měla pevné `def:`, které se nemá jak zeptat
 * na zadání. Dnes jsou to `prefill`.
 *
 * TAHLE SADA SE SCHVÁLNĚ NEPTÁ NA KONSTANTU, ALE NA JÁDRO. Očekávaná hodnota
 * se odvozuje z `skloVolba()` — tedy z téhož zdroje, ze kterého se počítá
 * cena. Kdyby někdo pravidlo v jádře změnil (otevřený nález V42 o sazbách
 * podle způsobu zasklení) a text ve specifikaci nechal být, sada spadne.
 * To je celý smysl: text a cena se nesmí rozejít potichu. Je to tentýž
 * princip jako V38 („název a sazba míří na tutéž položku"), jen o patro výš.
 *
 * Skutečné sazby se tu nepoužívají — pracuje se zkušebním ceníkem.
 */
const fs = require('fs');
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
const ts = require('./techspec.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));

/* Zadání s vyplněnými rozměry — bez nich výpočet nedá výsledek, ze kterého
 * prefill čte. Světlík zapnutý, ať se dá zkoušet i řádek nadsvětlíků. */
function zad(typSachty, zaskleni) {
  const z = JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI));
  return Object.assign(z, { typSachty, zaskleni, svetlikNadDvermi: true,
    sirka: 1.5, hloubka: 1.6, zdvih: 9, prejezd: 3.5, pater: 4 });
}
function cenik() {
  const c = ZC.zkusebniCenik();
  c.skloBokyNazev = 'izolační dvojsklo (zkušební)';
  return c;
}

/* Hodnota pole specifikace tak, jak ji uvidí obchodník u NEVYPLNĚNÉ položky. */
function pole(id) {
  let f = null;
  ts.TECHSPEC_DEF.forEach(s => (s.pole || []).forEach(p => { if (p.id === id) f = p; }));
  if (!f) throw new Error('pole ' + id + ' v TECHSPEC_DEF není');
  return f;
}
function hodnota(id, Z, C) {
  const r = eng.vypocet(Z, C, JEKLY, true);
  return ts.tsHodnota(pole(id), { hodnoty: {}, extra: [] }, r, Z, C).text;
}

/* Pravda o skle je v jádře: nese-li název řádku „dvojsklo", počítá se dvojsklo. */
const jeDvojsklo = (Z, C) => /dvojskl/i.test(eng.skloVolba(Z, C).boky.nazev);

/* ---------- 1) text specifikace se řídí tím, co počítá jádro ---------- */

[['exteriérová', 'na terče'], ['exteriérová', 'mezi příčníky'],
 ['interiérová', 'na terče'], ['interiérová', 'mezi příčníky']].forEach(([typ, zas]) => {
  const Z = zad(typ, zas), C = cenik();
  const jadro = jeDvojsklo(Z, C);
  const popis = typ + ' / ' + zas;

  const material = hodnota('materialOplasteni', Z, C);
  test('MATERIÁL OPLÁŠTĚNÍ souhlasí s jádrem — ' + popis,
    /dvojskl/i.test(material) === jadro, { jadro, material });

  const povrch = hodnota('povrchOplasteni', Z, C);
  test('POVRCHOVÁ ÚPRAVA souhlasí s jádrem — ' + popis,
    /dvojskl/i.test(povrch) === jadro, { jadro, povrch });

  const nadsvetliky = hodnota('oplasteniNadsvetliku', Z, C);
  test('OPLÁŠTĚNÍ NADSVĚTLÍKŮ souhlasí s jádrem — ' + popis,
    /dvojskl/i.test(nadsvetliky) === jadro, { jadro, nadsvetliky });

  /* Co se nabídne, musí jít i vybrat ze seznamu — jinak obchodník vidí
   * hodnotu, kterou by sám nastavit nemohl. */
  test('nabídnutý MATERIÁL je v číselníku — ' + popis,
    ts.TS_C.materialOplasteni.indexOf(material) >= 0, material);
  test('nabídnutý POVRCH je v číselníku nebo z ceníku — ' + popis,
    ts.TS_C.povrchOplasteni.indexOf(povrch) >= 0 || /zkušební/.test(povrch), povrch);
  test('nabídnuté NADSVĚTLÍKY jsou v číselníku — ' + popis,
    ts.TS_C.oplasteniNadsvetliku.indexOf(nadsvetliky) >= 0, nadsvetliky);
});

/* ---------- 2) interiér konkrétně: žádné dvojsklo nikde ---------- */

['na terče', 'mezi příčníky'].forEach(zas => {
  const Z = zad('interiérová', zas), C = cenik();
  const vse = ['materialOplasteni', 'povrchOplasteni', 'oplasteniNadsvetliku']
    .map(id => hodnota(id, Z, C)).join(' | ');
  test('interiérová šachta (' + zas + ') nikde nezmíní dvojsklo', !/dvojskl/i.test(vse), vse);
  test('a MATERIÁL mluví o VSG', /VSG/.test(hodnota('materialOplasteni', Z, C)));
});

/* Exteriér zůstal beze změny — povrch se bere z názvu položky ceníku pro boky,
 * což je u exteriéru právě ta položka, ze které se počítá. */
{
  const Z = zad('exteriérová', 'na terče'), C = cenik();
  test('exteriér: povrch se pořád bere z ceníkové položky pro boky',
    hodnota('povrchOplasteni', Z, C) === 'standardní ' + C.skloBokyNazev,
    hodnota('povrchOplasteni', Z, C));
}

/* ---------- 3) bez světlíku se nadsvětlíky nevyplňují ---------- */

['exteriérová', 'interiérová'].forEach(typ => {
  const Z = zad(typ, 'na terče'), C = cenik();
  Z.svetlikNadDvermi = false; Z.svetlikyBoky = 0;
  test('bez světlíku zůstane řádek nadsvětlíků prázdný — ' + typ,
    hodnota('oplasteniNadsvetliku', Z, C).trim() === '-',
    hodnota('oplasteniNadsvetliku', Z, C));
});

/* ---------- 4) vnější opláštění se řídí ZPŮSOBEM ZASKLENÍ ---------- */

[['na terče', 'kotvené'], ['mezi příčníky', 'vložené']].forEach(([zas, ceka]) => {
  ['exteriérová', 'interiérová'].forEach(typ => {
    const Z = zad(typ, zas), C = cenik();
    const v = hodnota('umisteniOplasteni', Z, C);
    test('VNĚJŠÍ OPLÁŠTĚNÍ „' + ceka + '" u zasklení ' + zas + ' — ' + typ,
      v.indexOf(ceka) === 0, v);
    test('a je v číselníku — ' + zas + ' / ' + typ,
      ts.TS_C.umisteniOplasteni.indexOf(v) >= 0, v);
  });
});

/* ZPŮSOB KOTVENÍ se řídí týmž polem — kdyby si ta dvě pole začala protiřečit,
 * dokument by tvrdil „na terče" a zároveň „do L profilů mezi příčníky". */
[['na terče', 'terč'], ['mezi příčníky', 'příčník']].forEach(([zas, slovo]) => {
  const Z = zad('exteriérová', zas), C = cenik();
  test('ZPŮSOB KOTVENÍ neodporuje vnějšímu opláštění — ' + zas,
    new RegExp(slovo, 'i').test(hodnota('kotveniOplasteni', Z, C)),
    hodnota('kotveniOplasteni', Z, C));
});

/* ---------- 4b) Detail výpočtu říká, které sklo se počítá (V33 / V42) ----
 *
 * Potvrzeno J. V. 15. 9. 2026: dvě různá skla uvnitř budovy podle způsobu
 * kotvení jsou ZÁMĚR, ne chyba — jiné kotvení znamená jinou skladbu skla.
 * V exteriéru drží boky a záda ditherm dvojsklo kvůli izolaci. Pravidlo
 * dosud stálo jen v poznámkách ceníku, kam obchodník nevidí.
 *
 * Kontroluje se STRUKTURA, ne text: že se ta věta odvozuje ze `skloVolba()`,
 * tedy z téhož místa jako sazba. Kdyby se vypisovala natvrdo, rozešla by se
 * s cenou přesně tak, jako se do 15. 9. rozcházela technická specifikace. */
{
  const fsDet = require('fs');
  const det = fsDet.readFileSync(__dirname + '/ui/detail_ui.js', 'utf8');
  const fn = (det.match(/function dvSkloPopis\(Z, C\)[\s\S]*?\n\}/) || [''])[0];
  test('Detail výpočtu má řádek „Které sklo se počítá"', /Které sklo se počítá/.test(det));
  test('a plní ho dvSkloPopis(Z, C)', /dvSkloPopis\(Z, C\)/.test(det));
  test('dvSkloPopis se ptá skloVolba()', /skloVolba\(Z, C\)/.test(fn), fn.length);
  test('a nevypisuje názvy skel natvrdo', !/VSG 4\.4\.[12]|dvojskl/i.test(fn), fn);
  test('nápověda zmiňuje ditherm dvojsklo v exteriéru', /ditherm dvojsklo/.test(det));
}

/* ---------- 5) ruční hodnota má pořád přednost ---------- */
{
  const Z = zad('interiérová', 'na terče'), C = cenik();
  const r = eng.vypocet(Z, C, JEKLY, true);
  const vlastni = 'cementotřískové desky';
  const v = ts.tsHodnota(pole('materialOplasteni'),
    { hodnoty: { materialOplasteni: vlastni }, extra: [] }, r, Z, C);
  test('ruční text prefill nepřebije', v.text === vlastni && v.zdroj === 'ručně', v);
}

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
