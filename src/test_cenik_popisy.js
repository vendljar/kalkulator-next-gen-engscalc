/* ===== DODATKOVÝ TEXT K POLOŽCE =====
 * (#267, 18. 9. 2026, zadání J. V.)
 *
 * Do cenové nabídky se pod název položky tiskne popis, kterým obchodník
 * zákazníkovi vysvětlí, co si kupuje — místo dosavadního „množství: 88,626",
 * což byl vnitřní mezivýsledek.
 *
 * TŘI ROZHODNUTÍ, KTERÁ TAHLE SADA DRŽÍ:
 *
 *  1. Text bydlí v CENÍKU, ne v zakázce (rozhodnutí J. V.) — u další nabídky
 *     se předvyplní sám. Zakázka si přitom nese vlastní kopii ceníku, takže
 *     starší nabídka má text takový, jaký platil tehdy.
 *  2. Klíčuje se NÁZVEM POLOŽKY, ne ceníkovou cestou. Dvě různé položky
 *     můžou sdílet tutéž sazbu — madla boční a zadní obě počítají
 *     z `C.priplatky.madlaBmKc` — a v nabídce jsou to dva různé výrobky.
 *     Vyšlo to najevo až testem; první verze klíčovala cestou a text se
 *     objevil u obou.
 *  3. Do porovnání CEN nevstupuje (oprava překlepu není zdražení), ale do
 *     OTISKU verze ano — jinak by ji nešlo zveřejnit, protože by se tvářila
 *     jako „beze změny". Táž past jako #181 u zahraniční řady.
 */
const ck = require('./cenik.js');
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

/* ---------- 1) úložiště ---------- */
{
  const c = {};
  ck.cenikPopisNastav(c, 'LEŠENÍ - vnější', '  Doprava, stavba a pronájem  ');
  test('text se uloží a ořízne se okolní mezera',
    ck.cenikPopis(c, 'LEŠENÍ - vnější') === 'Doprava, stavba a pronájem',
    ck.cenikPopis(c, 'LEŠENÍ - vnější'));
  test('nevyplněná položka vrací prázdno, ne undefined',
    ck.cenikPopis(c, 'NĚCO JINÉHO') === '', ck.cenikPopis(c, 'NĚCO JINÉHO'));
  test('ceník bez popisů vůbec nespadne', ck.cenikPopis({}, 'X') === '' && ck.cenikPopis(null, 'X') === '');

  /* Prázdný text se MAŽE. Kdyby se ukládal jako prázdný řetězec, ceník by
   * obrostl klíči, které nic neříkají, a diff verzí by hlásil „přibyl popis"
   * tam, kde někdo jen klikl do pole a zase z něj vyjel. */
  ck.cenikPopisNastav(c, 'LEŠENÍ - vnější', '');
  test('prázdný text klíč SMAŽE, neuloží prázdný řetězec',
    !Object.prototype.hasOwnProperty.call(c.popisy, 'LEŠENÍ - vnější'), c.popisy);
  ck.cenikPopisNastav(c, 'A', 'x'); ck.cenikPopisNastav(c, 'A', '   ');
  test('a samé mezery se počítají jako prázdno',
    !Object.prototype.hasOwnProperty.call(c.popisy, 'A'), c.popisy);
}

/* ---------- 2) text doputuje do položky výpočtu ---------- */
{
  const JEKLY = require('./jekly.json');
  const C = ZC.zkusebniCenik();
  const z = JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI));
  z.typSachty = 'exteriérová';
  const bez = eng.vypocet(JSON.parse(JSON.stringify(z)), C, JEKLY, true);
  const vzor = bez.priplatky.find(x => x.cenaPath);
  test('je z čeho testovat — příplatek s ceníkovou vazbou existuje', !!vzor, vzor && vzor.nazev);

  ck.cenikPopisNastav(C, vzor.origNazev, 'Popisná věta do nabídky.');
  const s = eng.vypocet(JSON.parse(JSON.stringify(z)), C, JEKLY, true);
  const p = s.priplatky.find(x => x.origNazev === vzor.origNazev);
  test('položka nese dodatkový text z ceníku', p.popisNabidka === 'Popisná věta do nabídky.', p.popisNabidka);

  /* JÁDRO ROZHODNUTÍ. Madla boční a zadní sdílejí `C.priplatky.madlaBmKc`.
   * S klíčem podle ceníkové cesty by text u jednoho vyskočil i u druhého. */
  const boky = s.priplatky.find(x => x.key === 'madlaBoky');
  const zadni = s.priplatky.find(x => x.key === 'madlaZadni');
  test('madla sdílejí tutéž ceníkovou sazbu (jinak by tenhle test nic neměřil)',
    !!boky && !!zadni && boky.cenaPath === zadni.cenaPath, boky && boky.cenaPath);
  const C2 = ZC.zkusebniCenik();
  ck.cenikPopisNastav(C2, boky.origNazev, 'Jen boční madla.');
  const s2 = eng.vypocet(JSON.parse(JSON.stringify(z)), C2, JEKLY, true);
  test('text u bočních madel se NEOBJEVÍ u zadních',
    s2.priplatky.find(x => x.key === 'madlaBoky').popisNabidka === 'Jen boční madla.'
    && s2.priplatky.find(x => x.key === 'madlaZadni').popisNabidka === '',
    { boky: s2.priplatky.find(x => x.key === 'madlaBoky').popisNabidka,
      zadni: s2.priplatky.find(x => x.key === 'madlaZadni').popisNabidka });

  /* Volitelné položky mají text taky — zadání mluví o obojím. */
  const C3 = ZC.zkusebniCenik();
  const vol = eng.vypocet(JSON.parse(JSON.stringify(z)), C3, JEKLY, true)
    .volitelneKatalog.find(x => x.cenaPath);
  if (vol) {
    ck.cenikPopisNastav(C3, vol.origNazev, 'Text u volitelné.');
    const s3 = eng.vypocet(JSON.parse(JSON.stringify(z)), C3, JEKLY, true);
    test('i volitelná položka nese dodatkový text',
      s3.volitelneKatalog.find(x => x.origNazev === vol.origNazev).popisNabidka === 'Text u volitelné.');
  }
}

/* ---------- 3) otisk verze ---------- */
{
  /* `cenikOtisk` a `cenikSledovane` bydlí v cenik_stari.js, ne v cenik.js.
   * Bez nich `programOtisk()` spadne do ZÁLOŽNÍ větve, která stringifikuje
   * celý ceník — a ta popisy obsahuje tak jako tak, takže by test prošel
   * i s vypnutou opravou. Zjištěno mutací; první verze sady měřila nic. */
  global.DEFAULT_CENIK = ZC.zkusebniCenik();
  /* cenik_stari.js si sahá na pomocníky z cenik.js jako na globály —
   * v aplikaci jsou soubory slepené do jednoho, v Node ne. */
  Object.keys(ck).forEach(k => { global[k] = ck[k]; });
  const cs = require('./cenik_stari.js');
  global.cenikSledovane = cs.cenikSledovane;
  global.cenikOtisk = cs.cenikOtisk;
  const prog = require('./program.js');
  test('měří se hlavní větev otisku, ne záložní',
    typeof cs.cenikOtisk === 'function' && typeof cs.cenikSledovane === 'function');
  const zaznam = (popisy) => ({ cenik: Object.assign(ZC.zkusebniCenik(), { popisy: popisy || {} }),
    cenikProj: {}, zahranicni: {} });

  const a = prog.programOtisk(zaznam({}));
  const b = prog.programOtisk(zaznam({ 'LEŠENÍ - vnější': 'nový popis' }));
  test('změna dodatkového textu změní OTISK verze', a !== b, { a, b });
  test('a shodné texty dají shodný otisk',
    prog.programOtisk(zaznam({ X: 'y' })) === prog.programOtisk(zaznam({ X: 'y' })));

  /* Do porovnání CEN ale nepatří: oprava překlepu není zdražení a neměla by
   * v historii ceníku svítit jako změněná cena. */
  const rozd = require('./cenik_stari.js').cenikRozdily
    ? require('./cenik_stari.js').cenikRozdily({ cenik: zaznam({}).cenik, proj: { cenik: {} } },
                      { cenik: zaznam({ X: 'text' }).cenik, proj: { cenik: {} } })
    : [];
  test('ale mezi ZMĚNAMI CEN se neobjeví', rozd.length === 0, rozd.map(r => r.cesta));
}

/* ===== SPOLEČNÁ MAPA TEXTŮ PRO CELOU APLIKACI (22. 9. 2026) =====
 *
 * Zadání J. V.: text zadaný administrátorem zůstane uložený v aplikaci;
 * ostatní ho smí ve své zakázce upravit, ale trvale přepsat ne. Mapa proto
 * stojí vedle ceníku (`/api/popisy`) a při přihlášení se vlévá do výchozího
 * ceníku. Očista je společná pro prohlížeč i server — tahle sada hlídá ji
 * a pravidlo přednosti. */
{
  const o = ck.popisyOciste({
    '  Sklo VSG  ': '  Provedení vnějších skel.  ',   // ořízne se klíč i text
    'Prázdný': '   ',                                  // prázdné se neukládá
    'Číslo': 123,                                      // jiný typ než text
    '': 'bez klíče',
  });
  test('očista ořízne klíč i text', o['Sklo VSG'] === 'Provedení vnějších skel.', JSON.stringify(o));
  test('prázdný text se neukládá', !('Prázdný' in o), JSON.stringify(o));
  test('nepsaná hodnota se zahodí', !('Číslo' in o), JSON.stringify(o));
  test('klíč bez názvu se zahodí', !('' in o), JSON.stringify(o));

  /* Stropy: mapa se vlévá do ceníku každé nové zakázky, takže se sem nesmí
   * dát poslat slovník libovolné velikosti ani román místo věty. */
  const dlouhy = {}; dlouhy['A'.repeat(ck.POPISY_MAX_KLIC + 1)] = 'x';
  test('příliš dlouhý klíč neprojde', Object.keys(ck.popisyOciste(dlouhy)).length === 0);
  const roman = ck.popisyOciste({ 'X': 'a'.repeat(ck.POPISY_MAX_TEXT + 50) });
  test('text se zkrátí na strop', roman['X'].length === ck.POPISY_MAX_TEXT, roman['X'].length);
  const mnoho = {};
  for (let i = 0; i < ck.POPISY_MAX_POLOZEK + 20; i++) mnoho['k' + i] = 'text';
  test('počet položek má strop',
    Object.keys(ck.popisyOciste(mnoho)).length === ck.POPISY_MAX_POLOZEK);

  /* PŘEDNOST MÁ ZVEŘEJNĚNÝ CENÍK. Kdyby ho společná mapa přebila, správce by
   * změnu textu ve zveřejněné verzi nikdy neprosadil — mapa by ji přepsala
   * při každém přihlášení. */
  const cenik = { popisy: { 'Sklo VSG': 'z ceníku' } };
  ck.popisyVlij(cenik, { 'Sklo VSG': 'ze společné mapy', 'Madlo': 'nový text' });
  test('ceník má přednost před společnou mapou', cenik.popisy['Sklo VSG'] === 'z ceníku',
    cenik.popisy['Sklo VSG']);
  test('co ceník nemá, se doplní', cenik.popisy['Madlo'] === 'nový text');

  /* Ceník bez mapy popisů je běžný stav (starší zveřejněná verze). */
  const prazdny = {};
  ck.popisyVlij(prazdny, { 'Madlo': 'text' });
  test('vlití funguje i do ceníku bez popisů', prazdny.popisy['Madlo'] === 'text');
}

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
