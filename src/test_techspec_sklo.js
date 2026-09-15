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
 * kotvení jsou ZÁMĚR, ne chyba — k firemním terčům patří jiné sklo než
 * k zasklení do lišt mezi příčníky. V exteriéru drží boky a záda ditherm
 * dvojsklo kvůli tepelné izolaci. Pravidlo dosud stálo jen v poznámkách
 * ceníku, kam obchodník nevidí.
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

/* ---------- 4c) dozdění u šachty v zrcadle schodiště (C5) ----------
 *
 * Obchodník řádek „DOZDĚNÍ KOLEM ŠACHETNÍCH DVEŘÍ" u šachty v zrcadle
 * schodiště pokaždé mazal ručně — kolem dveří tam není co dozdívat.
 * Aplikace o tom umístění věděla (je to volba číselníku UMÍSTĚNÍ ŠACHTY),
 * jen ji s tímhle řádkem nikdo nespojil.
 *
 * Zůstává to NABÍDKA, ne automatika: obchodník smí přepsat a štítek u pole
 * pak ukáže „ručně". Pokyn J. V.: „návrh = přepínač u zakázky, ne tichá
 * automatika." */
{
  const Z = zad('interiérová', 'mezi příčníky'), C = cenik();
  const r = eng.vypocet(Z, C, JEKLY, true);
  const hod = (umisteni) => ts.tsHodnota(pole('neni7'),
    { hodnoty: umisteni ? { umisteni } : {}, extra: [] }, r, Z, C);

  test('v zrcadle schodiště se dozdění nenabízí',
    hod('v interiéru - v zrcadle schodiště').text.trim() === '-',
    hod('v interiéru - v zrcadle schodiště'));
  test('a zdroj se hlásí jako ze specifikace, ne z kalkulace',
    hod('v interiéru - v zrcadle schodiště').zdroj === 'ze specifikace',
    hod('v interiéru - v zrcadle schodiště').zdroj);
  ['v interiéru', 'v interiéru - v ATRIU domu', 'v exteriéru', 'v exteriéru, přisazena k fasádě']
    .forEach(u => test('jinde dozdění zůstává — ' + u,
      hod(u).text === 'zajistí objednatel', hod(u)));
  test('nevyplněné umístění dozdění nechává', hod(null).text === 'zajistí objednatel', hod(null));
  test('ruční hodnota přebije i prefillTs', ts.tsHodnota(pole('neni7'),
    { hodnoty: { umisteni: 'v interiéru - v zrcadle schodiště', neni7: 'zajistí objednatel' }, extra: [] },
    r, Z, C).zdroj === 'ručně');
}

/* ---------- 4d) název akce je výběr, ne věta s lomítkem (D3) ---------- */
{
  const pr = require('./preklad.js');
  const seznam = ts.TS_C.nazevAkce;
  test('číselník názvu akce má čtyři varianty', seznam.length === 4, seznam);
  test('a žádná nenese obě možnosti naráz',
    seznam.every(x => !/\//.test(x)), seznam.filter(x => /\//.test(x)));
  test('výchozí název je jedna z nich',
    seznam.indexOf(ts.DEFAULT_TECHSPEC.nazevAkce) >= 0, ts.DEFAULT_TECHSPEC.nazevAkce);
  test('pole NÁZEV AKCE ten číselník opravdu nabízí',
    (ts.TS_HLAVICKA.find(x => x.id === 'nazevAkce') || {}).ciselnik === ts.TS_C.nazevAkce);
  /* Bez překladu by v EN/DE zůstala čeština — to byla druhá polovina nálezu. */
  ['en', 'de', 'fr'].forEach(l => seznam.forEach(x => {
    const t = pr.tr(x, l);
    test('„' + x.slice(0, 22) + '…" se přeloží do ' + l.toUpperCase(), t !== x, t);
    test('a překlad do ' + l.toUpperCase() + ' nenese lomítko u „' + x.slice(0, 18) + '…"',
      !/ \/ /.test(t), t);
  }));
  test('starý tvar s lomítkem se pořád přeloží (starší zakázky)',
    pr.tr('přístavba/vestavba nové prosklené OCK výtahové šachty', 'de')
      !== 'přístavba/vestavba nové prosklené OCK výtahové šachty');
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
