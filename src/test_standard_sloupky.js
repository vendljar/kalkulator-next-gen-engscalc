/* ===== POČET SLOUPKŮ VE STANDARDU =====
 * (17. 9. 2026, zadání J. V.: „do interiéru i exteriérů přidej položku počet
 *  sloupků. ve standardu to jsou 4. jakékoliv jiné číslo = atyp.")
 *
 * PROČ TO NENÍ STROP. Všechny ostatní rozměry ve standardu jsou maxima —
 * „max 2000 mm". Tohle ne: tři sloupky jsou stejně nestandardní jako pět,
 * protože nejde o velikost, ale o konstrukční řešení. Kdyby se to napsalo
 * jako `>`, prošla by tříslopková šachta jako standardní a nikdo by si toho
 * nevšiml — proto to má vlastní sadu a ne jen řádek v tabulce limitů.
 *
 * Platí zásady modulu: nic se neblokuje, nic se nepřepočítává, a chybějící
 * údaj je „nelze posoudit", ne atyp.
 */
const SO = require('./standard_ock.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const STD = SO.standardOciste({});

/* Zadání, které projde všemi ostatními kontrolami — ať je vidět, že případný
 * nález je opravdu o sloupcích a ne o něčem vedlejším. */
function zadani(ext, zmeny) {
  return Object.assign({
    typSachty: ext ? 'exteriérová' : 'interiérová',
    sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.5, prohluben: 1.2,
    zaskleni: 'na terče',
    profily: { sloupek: { dim: ext ? '80x80' : '80x50' } },
    rohoveSloupky: 4,
    mustek: false,
  }, zmeny || {});
}
const vyhodnot = (ext, zmeny, std) =>
  SO.standardVyhodnot(zadani(ext, zmeny), 13.7, std || STD, []);
const nalezSloupku = (v) => v.nalezy.find(n => /Počet sloupků/.test(n.co));

/* ---------- 1) výchozí standard má čtyři, v obou větvích ---------- */

test('exteriér má ve výchozím standardu 4 sloupky', STD.exterier.sloupkyStandard === 4,
  STD.exterier.sloupkyStandard);
test('interiér má ve výchozím standardu 4 sloupky', STD.interier.sloupkyStandard === 4,
  STD.interier.sloupkyStandard);

/* ---------- 2) čtyři projdou, cokoli jiného je atyp ---------- */

[true, false].forEach(ext => {
  const kde = ext ? 'exteriér' : 'interiér';

  const ctyri = vyhodnot(ext, { rohoveSloupky: 4 });
  test(kde + ': čtyři sloupky jsou standard',
    ctyri.stav === 'standard' && !nalezSloupku(ctyri), { stav: ctyri.stav, n: ctyri.nalezy });

  /* Obě strany. VÍC sloupků je zjevný atyp; MÉNĚ by u stropu prošlo — a to
   * je přesně ta chyba, kterou tahle sada hlídá. */
  const pet = vyhodnot(ext, { rohoveSloupky: 5 });
  test(kde + ': pět sloupků je atyp', pet.stav === 'atyp', pet.stav);
  test(kde + ': a nález to pojmenuje',
    !!nalezSloupku(pet) && nalezSloupku(pet).stav === 'mimo', nalezSloupku(pet));

  const tri = vyhodnot(ext, { rohoveSloupky: 3 });
  test(kde + ': TŘI sloupky jsou taky atyp (není to strop!)', tri.stav === 'atyp', tri.stav);
  test(kde + ': a nález mluví o přesné hodnotě, ne o maximu',
    !!nalezSloupku(tri) && /přesně/.test(nalezSloupku(tri).limit), nalezSloupku(tri));
});

/* ---------- 3) nevyplněno = nelze posoudit, ne atyp ---------- */
{
  const prazdno = vyhodnot(true, { rohoveSloupky: '' });
  const n = nalezSloupku(prazdno);
  test('nevyplněný počet sloupků je „nelze posoudit"', !!n && n.stav === 'nelze', n);
  test('a celý výsledek tedy není atyp', prazdno.stav === 'nelze', prazdno.stav);
  /* Nula NENÍ prázdno: šachta bez sloupků je nesmysl, ale je to zadané číslo
   * a jako takové se posuzuje. „Prázdno není nula" je pravidlo projektu. */
  const nula = vyhodnot(true, { rohoveSloupky: 0 });
  test('nula je zadaná hodnota, tedy atyp — ne „nevyplněno"',
    nula.stav === 'atyp' && nalezSloupku(nula).stav === 'mimo', nalezSloupku(nula));
}

/* ---------- 4) limit jde změnit v Nastavení ---------- */
{
  /* Zásada 2 modulu: limity nejsou v kódu. Když si firma řekne, že standard
   * je šest sloupků, musí to jít nastavit bez nové dávky. */
  const std6 = SO.standardOciste({ exterier: { sloupkyStandard: 6 } });
  test('změněný standard se použije', std6.exterier.sloupkyStandard === 6,
    std6.exterier.sloupkyStandard);
  test('a šest sloupků je pak standard',
    vyhodnot(true, { rohoveSloupky: 6 }, std6).stav === 'standard');
  test('kdežto čtyři už ne', vyhodnot(true, { rohoveSloupky: 4 }, std6).stav === 'atyp');
  test('druhá větev tím zůstane nedotčená', std6.interier.sloupkyStandard === 4,
    std6.interier.sloupkyStandard);

  /* KAŽDÁ VĚTEV SVŮJ LIMIT. Dokud mají obě čtyřku, není záměna větví vidět —
   * interiérová šachta posuzovaná podle exteriéru dá tutéž odpověď. Proto
   * se tu limity schválně rozejdou: teprve pak se pozná, že se vybírá podle
   * typu šachty. (Mutace „limit se bere vždy z exteriéru" bez tohohle
   * testu prošla.) */
  const stdRuzne = SO.standardOciste({
    exterier: { sloupkyStandard: 6 }, interier: { sloupkyStandard: 4 } });
  test('exteriérová šachta se řídí exteriérovým limitem',
    vyhodnot(true, { rohoveSloupky: 6 }, stdRuzne).stav === 'standard'
    && vyhodnot(true, { rohoveSloupky: 4 }, stdRuzne).stav === 'atyp');
  test('interiérová šachta se řídí interiérovým limitem',
    vyhodnot(false, { rohoveSloupky: 4 }, stdRuzne).stav === 'standard'
    && vyhodnot(false, { rohoveSloupky: 6 }, stdRuzne).stav === 'atyp');

  /* Prázdné pole kontrolu vypne — platná volba, ne chyba k opravě. */
  const stdVyp = SO.standardOciste({ exterier: { sloupkyStandard: '' } });
  test('prázdná hodnota kontrolu vypne', stdVyp.exterier.sloupkyStandard === null,
    stdVyp.exterier.sloupkyStandard);
  const vyp = vyhodnot(true, { rohoveSloupky: 9 }, stdVyp);
  test('a devět sloupků pak projde bez nálezu',
    vyp.stav === 'standard' && !nalezSloupku(vyp), { stav: vyp.stav, n: nalezSloupku(vyp) });

  /* Nesmysl z uložené konfigurace se nesmí stát limitem, podle kterého se
   * pak hlásí atyp — zahodí se na „nekontroluje se". */
  const stdZap = SO.standardOciste({ exterier: { sloupkyStandard: -3 } });
  test('záporný limit se zahodí na „nekontroluje se"',
    stdZap.exterier.sloupkyStandard === null, stdZap.exterier.sloupkyStandard);

  /* STARŠÍ ULOŽENÁ KONFIGURACE klíč nemá. Nesmí kvůli tomu přijít o kontrolu,
   * kterou si nikdy nevypnula — chybějící klíč je „ještě o tom nevíme",
   * ne „vypnuto". Rozdíl proti prázdnu je celý smysl té funkce. */
  const stary = SO.standardOciste({ exterier: { profily: [{ profil: '80x80', vyskaMaxM: 30 }] } });
  test('starší konfigurace bez toho klíče dostane výchozí čtyřku',
    stary.exterier.sloupkyStandard === 4, stary.exterier.sloupkyStandard);
}

/* ---------- 5) kontrola se započítá do počtu ---------- */
{
  const s = vyhodnot(true, { rohoveSloupky: 4 });
  const bez = SO.standardVyhodnot(zadani(true, { rohoveSloupky: 4 }), 13.7,
    SO.standardOciste({ exterier: { sloupkyStandard: '' } }), []);
  test('zapnutá kontrola přidá jednu položku do počtu kontrol',
    s.kontrol === bez.kontrol + 1, { s: s.kontrol, bez: bez.kontrol });
}

/* ---------- 6) obrazovka Nastavení to umí nastavit ---------- */
{
  const fs = require('fs');
  const ui = fs.readFileSync(__dirname + '/ui/nastaveni_ui.js', 'utf8');
  test('Nastavení kreslí pole pro obě větve',
    /sloupkyBlok\('exterier'\)/.test(ui) && /sloupkyBlok\('interier'\)/.test(ui));
  test('a zapisuje do sloupkyStandard té správné větve',
    /stdSet\('\$\{vetev\}\.sloupkyStandard'/.test(ui));
  /* Popisek musí říkat „přesně", ne „max" — jinak si to uživatel přečte jako
   * strop a bude překvapený, že mu tři sloupky hlásí atyp. */
  test('a popisek mluví o přesné hodnotě, ne o stropu',
    /Hlídá se <b>přesná<\/b> hodnota/.test(ui));
}

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
