/* Značky „ukázkový" a „prázdný" ceník (P2, nálezy N2/N3, 21. 9. 2026).
 *
 * CO SE STALO: server při uložení zakázky doplňoval chybějící klíče ceníku
 * z DEFAULT_CENIK ze sestavení. To je pro GitHub vynulované a nese značky
 * `ukazkove: true` a `prazdny: true` — a doplňování je vtisklo do KAŽDÉ
 * varianty. Klient je neposlal, dostal je zpátky. Protože se uzamčené
 * varianty při načtení nepřepočítávají, značka tam zůstala napořád:
 * červená lišta „Ceník není nahraný, všude svítí nuly" a vypnutá tlačítka
 * tisku nabídky u ostrých zakázek, které ceník měly.
 *
 * Co se tu hlídá:
 *   – doplňování klíčů značky NIKDY nepřenáší,
 *   – ale chybějící ceny doplňuje dál (jinak by se rozbil nález V38),
 *   – značka se pozná jako lživá podle obsahu (nenulová čísla = není prázdný),
 *   – srovnání JEN odebírá, nikdy nepřidává,
 *   – uzamčená varianta se srovná taky, a ceny přitom zůstanou.
 *
 * Čísla jsou smyšlená — skutečné sazby do repozitáře nepatří.
 */
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); };
nacti('./format.js'); nacti('./ukazkove.js'); nacti('./cenik.js');
nacti('./cenik_stari.js'); nacti('./cenik_rady.js');
/* Zámek je tu nutnost, ne ozdoba: bez `variantaUzamcena` by se uzamčená
 * varianta tvářila jako rozpracovaná, přepočítala by se — a test by měřil
 * úplně jiný případ, než o který jde. */
nacti('./zamek.js');
const eng = require('./engine.js');
Object.keys(eng).forEach(k => { global[k] = eng[k]; });

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

/* ---------- 1) doplňování klíčů značku nepřenáší ---------- */
{
  /* Vzor jako vynulovaný DEFAULT_CENIK pro GitHub: samé nuly a obě značky. */
  const vzor = { ukazkove: true, prazdny: true, montazHodKc: 0, dph: 0,
                 priplatky: { madlaBmKc: 0 }, novaPolozka: 0 };
  const cenik = { montazHodKc: 850, dph: 21, priplatky: { madlaBmKc: 120 } };

  const doplneno = cenikDoplnKlice(cenik, vzor);
  test('značky se ze vzoru nedoplnily',
    !('ukazkove' in cenik) && !('prazdny' in cenik), Object.keys(cenik));
  test('ale chybějící cena se doplnila nulou (nález V38 platí dál)',
    cenik.novaPolozka === 0, cenik.novaPolozka);
  test('a doplnila se právě jedna', doplneno === 1, doplneno);
  test('stávající ceny zůstaly', cenik.montazHodKc === 850 && cenik.priplatky.madlaBmKc === 120);
  test('seznam nedoplňovaných klíčů je právě ten pár',
    CENIK_NEDOPLNOVAT.length === 2
    && CENIK_NEDOPLNOVAT.indexOf('ukazkove') >= 0
    && CENIK_NEDOPLNOVAT.indexOf('prazdny') >= 0, CENIK_NEDOPLNOVAT);
  /* Seznam v engine.js je napsaný doslova, protože odkaz na konstanty
   * z ukazkove.js by v sestaveném souboru padl do dočasné mrtvé zóny
   * (stalo se 21. 9. 2026 — aplikace se vůbec nespustila). Tím ale vznikla
   * druhá pravda, a tahle kontrola hlídá, že se obě nerozejdou. */
  test('doslovné názvy v engine.js sedí na konstanty z ukazkove.js',
    CENIK_NEDOPLNOVAT.indexOf(UKAZKOVE_KLIC) >= 0
    && CENIK_NEDOPLNOVAT.indexOf(PRAZDNY_KLIC) >= 0,
    [UKAZKOVE_KLIC, PRAZDNY_KLIC, CENIK_NEDOPLNOVAT]);

  /* I kdyby značku ceník UŽ měl, doplňování ji nemá řešit — jen ji nepřidá. */
  const sZnackou = { ukazkove: true, montazHodKc: 850 };
  cenikDoplnKlice(sZnackou, vzor);
  test('existující značku doplňování neodstraní (od toho je jiná funkce)',
    sZnackou.ukazkove === true);
}

/* ---------- 2) pozná se lživá značka podle obsahu ---------- */
{
  test('ceník s nenulovou cenou má čísla',
    ukazkoveMaCisla({ montazHodKc: 850 }) === true);
  test('ceník samých nul čísla nemá',
    ukazkoveMaCisla({ montazHodKc: 0, dph: 0, priplatky: { x: 0 } }) === false);
  test('čísla se hledají i ve vnořených sekcích',
    ukazkoveMaCisla({ priplatky: { madlaBmKc: 120 } }) === true);
  test('značky samy se za čísla nepočítají',
    ukazkoveMaCisla({ ukazkove: true, prazdny: true }) === false);
  test('dodatkové texty se za čísla nepočítají',
    ukazkoveMaCisla({ popisy: { 'MADLA': 'nerez' }, montazHodKc: 0 }) === false);
  test('prázdno i nesmysl snese', ukazkoveMaCisla(null) === false && ukazkoveMaCisla('x') === false);

  /* SKUTEČNÝ VÝCHOZÍ CENÍK ZE SESTAVENÍ, NE UMĚLÁ FIXTURA (nález N33 revize
   * v22.9.9). Kontroly výš měly `dph: 0` — stav, který v repozitáři není:
   * sestavení nese skutečné sazby DPH (zákonné, ne firemní data), takže
   * každý ceník „měl čísla" a značka prázdného ceníku se sundávala pořád.
   * Tady se ptá přímo DEFAULT_CENIK a DEFAULT_CENIK_PROJ z jader. */
  const ep = require('./engine_proj.js');
  const ock = JSON.parse(JSON.stringify(eng.DEFAULT_CENIK));
  const proj = JSON.parse(JSON.stringify(ep.DEFAULT_CENIK_PROJ));
  test('(výchozí ceník OCK opravdu nese nenulové sazby DPH)',
    ock.dph > 0 && ock.dphZakladni > 0, [ock.dph, ock.dphZakladni]);
  test('výchozí ceník OCK ze sestavení čísla NEMÁ (N33)', ukazkoveMaCisla(ock) === false);
  test('ani výchozí ceník PROJ', ukazkoveMaCisla(proj) === false);
  test('a jeho značky srovnání s obsahem nesundá',
    ukazkoveSrovnejSObsahem(ock) === false && ock.prazdny === true && ock.ukazkove === true,
    [ock.prazdny, ock.ukazkove]);
  test('ani u projekce', ukazkoveSrovnejSObsahem(proj) === false && proj.prazdny === true,
    [proj.prazdny]);
  /* Jediná skutečná cena ale značku sundat musí — oprava nesmí přepnout
   * na opačnou chybu. */
  const sCenou = JSON.parse(JSON.stringify(eng.DEFAULT_CENIK)); sCenou.montazHodKc = 850;
  test('jediná skutečná cena ve výchozím ceníku značku sundá', ukazkoveSrovnejSObsahem(sCenou) === true
    && !('prazdny' in sCenou), Object.keys(sCenou).filter(k => /prazdny|ukazkove/.test(k)));
  /* Co se za cenu nepočítá: sazby a předvolby DPH, přirážka, procenta, kurz. */
  test('sazby, přirážka, procenta ani kurz se za ceny nepočítají',
    ukazkoveMaCisla({ dph: 0.21, dphZakladni: 0.21, dphSnizena: 0.12, marze: 0.42,
      atypMontazPct: 0.3, kurzEurKc: 25 }) === false);
  test('položka v Kč ale ano, i vedle nich', ukazkoveMaCisla({ dph: 0.21, cisteniKc: 1 }) === true);
}

/* ---------- 3) srovnání podle obsahu JEN odebírá ---------- */
{
  const lzive = { ukazkove: true, prazdny: true, montazHodKc: 850 };
  test('lživá značka se odebere', ukazkoveSrovnejSObsahem(lzive) === true);
  test('a je opravdu pryč', !('ukazkove' in lzive) && !('prazdny' in lzive), Object.keys(lzive));
  test('cena zůstala nedotčená', lzive.montazHodKc === 850);

  /* Druhé spuštění už nemá co dělat — hlásí „beze změny". */
  test('opakování nic nehlásí', ukazkoveSrovnejSObsahem(lzive) === false);

  /* Nuly: značka JE pravdivá, nechává se. */
  const prazdny = { prazdny: true, montazHodKc: 0 };
  test('pravdivá značka u nulového ceníku zůstane',
    ukazkoveSrovnejSObsahem(prazdny) === false && prazdny.prazdny === true);

  /* NIKDY nepřidává: nulový ceník bez značky ji nedostane. Přidávání by
   * vyplo tisk u zakázky, která dnes funguje — to by byl nový nález. */
  const nulyBezZnacky = { montazHodKc: 0, dph: 0 };
  ukazkoveSrovnejSObsahem(nulyBezZnacky);
  test('nulový ceník bez značky ji nedostane',
    !('prazdny' in nulyBezZnacky) && !('ukazkove' in nulyBezZnacky), Object.keys(nulyBezZnacky));
}

/* ---------- 4) uzamčená varianta se srovná taky ---------- */
{
  const varianta = (id, zamcena) => ({
    id, ridici: id === 'a',
    zamek: zamcena ? { zamceno: true, kdo: 'a@b.cz', kdy: '2026-09-01T10:00:00Z' } : null,
    data: {
      cenik: { ukazkove: true, prazdny: true, montazHodKc: 850, dph: 21 },
      proj: { cenik: { ukazkove: true, projHodKc: 700 }, zadani: {} },
      zadani: {},
    },
  });
  const zak = { cislo: '2026 - OPR - CN - 0383', nazevAkce: 'Zkouška',
                varianty: [varianta('a', true), varianta('b', false)] };

  const pred = JSON.parse(JSON.stringify(zak.varianty[0].data.cenik));
  const r = cenikPrepoctiRozpracovane(zak, { cenik: {}, proj: { cenik: {} } }, {});

  test('uzamčená varianta se pořád počítá jako uzamčená', r.zamcene === 1, r.zamcene);
  test('u uzamčené varianty značka zmizela',
    !('ukazkove' in zak.varianty[0].data.cenik)
    && !('prazdny' in zak.varianty[0].data.cenik),
    Object.keys(zak.varianty[0].data.cenik));
  test('i v jejím ceníku PROJ',
    !('ukazkove' in zak.varianty[0].data.proj.cenik),
    Object.keys(zak.varianty[0].data.proj.cenik));
  test('ale CENY uzamčené varianty se nehnuly',
    zak.varianty[0].data.cenik.montazHodKc === pred.montazHodKc
    && zak.varianty[0].data.cenik.dph === pred.dph
    && zak.varianty[0].data.proj.cenik.projHodKc === 700);
  test('a srovnání se započítalo, takže se varianta uloží', r.znacky >= 2, r.znacky);
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
