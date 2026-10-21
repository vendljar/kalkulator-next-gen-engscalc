/* Duplikace zakázky a návrh dalšího čísla (P3, nález N5, 21. 9. 2026).
 *
 * ZADÁNÍ: „Do Přehledu přidat akci Duplikovat jako novou zakázku (nové číslo
 * CN zadá uživatel, výchozí = další číslo; zkopíruje varianty bez zámků
 * a tisků, poznámky ne), vedle stávající kopie varianty ⧉."
 *
 * PROČ: kopie varianty (⧉) zakládá DALŠÍ VARIANTU téže zakázky. Když přijde
 * nová poptávka podobná staré, je potřeba NOVÁ ZAKÁZKA s vlastním číslem —
 * a na to do 21. 9. 2026 nebyla cesta. Lidé to obcházeli tím, že otevřeli
 * starou zakázku a přepsali jí číslo, čímž o ni přišli.
 *
 * Co se tu hlídá:
 *   – kopíruje se hlavička, zadání i ceníky,
 *   – NEkopírují se zámky, doklady o odemčení, poznámky ani přílohy,
 *   – nová zakázka nesmí zdědit identitu uložené předlohy (razítko, autor),
 *   – předloha se duplikací nezmění,
 *   – návrh čísla zvýší poslední skupinu a zachová vedoucí nuly.
 */
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); };
nacti('./format.js');
const eng = require('./engine.js');
Object.keys(eng).forEach(k => { global[k] = eng[k]; });
nacti('./engine_proj.js'); nacti('./techspec.js'); nacti('./zamek.js'); nacti('./poznamky.js');
nacti('./sleva.js');   // slevaPlati — kontrola, že se schválení nedědí
nacti('./zakazka.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

/* ---------- návrh dalšího čísla ---------- */
{
  test('zvýší poslední skupinu a nechá vedoucí nuly',
    zakazkaCisloDalsi('2026 - OPR - CN - 0383') === '2026 - OPR - CN - 0384',
    zakazkaCisloDalsi('2026 - OPR - CN - 0383'));
  test('nesahá na rok ani na značku řady',
    zakazkaCisloDalsi('2026 - OVP - CN - 0099') === '2026 - OVP - CN - 0100',
    zakazkaCisloDalsi('2026 - OVP - CN - 0099'));
  test('přetečení šířku rozšíří',
    zakazkaCisloDalsi('CN-999') === 'CN-1000', zakazkaCisloDalsi('CN-999'));
  test('číslo s příponou varianty zvýší tu poslední skupinu',
    zakazkaCisloDalsi('2026 - OPR - CN - 0383.2') === '2026 - OPR - CN - 0383.3',
    zakazkaCisloDalsi('2026 - OPR - CN - 0383.2'));
  test('text bez číslic se vrátí beze změny',
    zakazkaCisloDalsi('bez cisla') === 'bez cisla');
  test('prázdno a nesmysl nespadnou',
    zakazkaCisloDalsi('') === '' && zakazkaCisloDalsi(null) === '');
}

/* ---------- duplikace ---------- */
{
  const zak = novaZakazka();
  zak.cislo = '2026 - OPR - CN - 0383';
  zak.nazevAkce = 'Výtah Lauda';
  zak.objednatel = 'Jiří Lauda';
  zak.ico = '12345678';
  zak.uloRazitko = 'razitko-puvodni';
  zak.autor = 'obchodnik@priklad.cz';
  zak.autorJmeno = 'Test Obchodník';
  zak.upravil = 'nekdo@priklad.cz';

  /* Varianta 1: uzamčená (odeslaná nabídka) + doklad o odemčení. */
  const v1 = zak.varianty[0];
  v1.data.ock.zadani.sirka = 1.8;
  v1.zamek = { zamceno: true, typ: 'nabidka', kdy: '2026-09-11T08:00:00Z', kdo: 'Obchodník' };
  v1.odemceni = [{ kdy: '2026-09-12T08:00:00Z', kdo: 'Správce', duvod: 'oprava' }];
  v1.klonZ = 'neco'; v1.klonZCislo = '2026 - OPR - CN - 0380';
  v1.pripona = 0;

  /* Varianta 2: rozpracovaná. */
  const v2 = klonujVariantu(zak, v1.id, { nazev: 'Varianta 2' });
  v2.data.ock.zadani.sirka = 2.1;

  /* Varianta 3: ještě jeden klon — se dvěma variantami by se chyba
   * „všechny přípony nula" poznala jen napůl (N32). */
  const v3 = klonujVariantu(zak, v1.id, { nazev: 'Varianta 3' });
  v3.data.ock.zadani.sirka = 2.4;

  poznamkyZajisti(zak);
  poznamkyPridej(zak, 'Telefonát se zákazníkem', {});
  zak.prilohy.push({ id: 'pr1', nazev: 'vykres.pdf' });
  /* Od #311 se poznámky píšou do jediného pole (B60). */
  zak.poznamkyText = 'Sleva slíbena ústně, zákazník tlačí na termín.';
  /* Předloha si pamatuje vyšší příponu, než kolik má dnes variant (některé
   * se smazaly). Duplikát ji zdědit nesmí (N32). */
  zak.priponaMax = 7;

  const predJson = JSON.stringify(zak);
  const nova = zakazkaDuplikuj(zak, '2026 - OPR - CN - 0384');

  test('duplikát vznikl', !!nova);
  test('a má nové číslo', nova.cislo === '2026 - OPR - CN - 0384', nova.cislo);
  test('PŘEDLOHA se duplikací nezměnila', JSON.stringify(zak) === predJson);

  /* Hlavička — to je ta práce, kvůli které se duplikuje. */
  test('hlavička se zkopírovala',
    nova.nazevAkce === 'Výtah Lauda' && nova.objednatel === 'Jiří Lauda' && nova.ico === '12345678',
    [nova.nazevAkce, nova.objednatel, nova.ico]);
  test('zadání variant se zkopírovalo',
    nova.varianty.length === 3
    && nova.varianty[0].data.ock.zadani.sirka === 1.8
    && nova.varianty[1].data.ock.zadani.sirka === 2.1
    && nova.varianty[2].data.ock.zadani.sirka === 2.4,
    nova.varianty.map(v => v.data.ock.zadani.sirka));

  /* Zámky a doklady — nová zakázka nic neodeslala. */
  test('zámek odeslané nabídky se NEzkopíroval',
    nova.varianty.every(v => !v.zamek), nova.varianty.map(v => v.zamek));
  test('ani doklad o odemčení',
    nova.varianty.every(v => v.odemceni === undefined));
  test('ani odkaz na klonovanou variantu předlohy',
    nova.varianty.every(v => v.klonZ === undefined && v.klonZCislo === undefined));

  /* Poznámky a přílohy patří k původní akci. */
  test('poznámky se NEzkopírovaly', Array.isArray(nova.poznamky) && nova.poznamky.length === 0,
    nova.poznamky);
  test('přílohy se NEzkopírovaly', Array.isArray(nova.prilohy) && nova.prilohy.length === 0,
    nova.prilohy);
  /* B60: jediné textové pole poznámek (od #311). Duplikace vznikla dřív
   * a nové pole do kopie propsala celé — i se zápisky o jednání s jiným
   * zákazníkem. Hlídá se pole i to, co z něj uvidí obrazovka. */
  test('ani jediné textové pole poznámek (B60)', nova.poznamkyText === undefined, nova.poznamkyText);
  test('a obrazovka poznámek je v duplikátu prázdná',
    poznamkyPoleText(nova) === '', poznamkyPoleText(nova));
  test('předloze poznámka zůstala', zak.poznamkyText === 'Sleva slíbena ústně, zákazník tlačí na termín.');

  /* Identita uložené zakázky — jinak by první uložení přepsalo předlohu. */
  test('razítko uložení se nezdědilo', nova.uloRazitko === undefined);
  test('autor ani upravil se nezdědili',
    nova.autor === undefined && nova.autorJmeno === undefined && nova.upravil === undefined,
    [nova.autor, nova.autorJmeno, nova.upravil]);

  /* PŘÍPONY PODLE POŘADÍ (nález N32 revize v22.9.9).
   *
   * Do 22. 9. 2026 tu stálo „přípony variant se vynulovaly" a test tím
   * CHYBU ZAFIXOVAL: tři nuly = tři nabídky pod holým číslem zakázky
   * (zámek, seznam variant, hlášky). Nově první holé číslo, další podle
   * pořadí — od #320 .2, .3 (číslo, které tisknou dokumenty). */
  test('přípony variant jdou podle pořadí 0, 2, 3 (číslo z papíru, #320)',
    nova.varianty.map(v => v.pripona).join(',') === '0,2,3', nova.varianty.map(v => v.pripona));
  test('duplikát nese značku číslování podle papíru (nepřečísluje se při načtení)',
    nova.priponySchema === 2, nova.priponySchema);
  test('každá varianta duplikátu má v zámku a hláškách vlastní číslo',
    new Set(nova.varianty.map(v => variantaCislo(nova, v))).size === 3,
    nova.varianty.map(v => variantaCislo(nova, v)));
  test('čísla nesou nové číslo zakázky, ne předlohy',
    nova.varianty.every(v => variantaCislo(nova, v).indexOf('0384') >= 0),
    nova.varianty.map(v => variantaCislo(nova, v)));
  /* Maximum předlohy (#17: číslo se nepoužije znovu) do kopie nepatří —
   * další klon by v duplikátu dostal číslo o několik výš. */
  test('nejvyšší přípona odpovídá duplikátu, ne předloze', nova.priponaMax === 3,
    [nova.priponaMax, zak.priponaMax]);
  const dalsi = klonujVariantu(nova, nova.varianty[0].id, { nazev: 'Klon v duplikátu' });
  test('další klon v duplikátu pokračuje .4', dalsi && dalsi.pripona === 4, dalsi && dalsi.pripona);
  /* Pojistka proti prázdnému testu: předloha má opravdu jiné maximum,
   * jinak by předchozí kontrola nic nedokazovala. */
  test('(předloha má svoje maximum, jiné než duplikát)', zak.priponaMax === 7, zak.priponaMax);
  test('řídící varianta je právě jedna',
    nova.varianty.filter(v => v.ridici).length === 1,
    nova.varianty.map(v => !!v.ridici));
  test('aktivní varianta ukazuje na existující',
    nova.varianty.some(v => v.id === nova.aktivni), nova.aktivni);

  /* Duplikát je samostatný objekt — změna v něm se nevrátí do předlohy. */
  nova.varianty[0].data.ock.zadani.sirka = 9.9;
  test('duplikát je hluboká kopie, ne sdílený odkaz',
    zak.varianty[0].data.ock.zadani.sirka === 1.8,
    zak.varianty[0].data.ock.zadani.sirka);

  test('nesmysl na vstupu nespadne', zakazkaDuplikuj(null, 'x') === null);
}

/* ---------- co se NESMÍ zdědit (nálezy nezávislé revize 21. 9. 2026) ----------
 *
 * Duplikát je nabídka pro JINOU akci, často pro jiného zákazníka. Všechno,
 * co se váže na jednání u předlohy, musí zůstat u ní. */
{
  const zak = novaZakazka();
  zak.cislo = '2026 - OPR - CN - 7001';
  zak.nazevAkce = 'Předloha';

  /* KVITANCE „ceny jsou dohodnuté" vyřazuje variantu z přepočtu na platný
   * ceník. Zděděná znamená, že nová nabídka NIKDY nepřepočítá a bez jediného
   * varování počítá z cen dohodnutých s někým jiným — ceník se totiž kopíruje
   * beze změny, takže otisk kvitance sedí. Od #284 se u ní neukáže ani
   * dialog, který by na to upozornil. */
  zak.varianty[0].cenikKvitance = { otisk: 'abc', kdy: '2026-09-01T00:00:00.000Z', kdo: 'někdo' };

  /* PROTOKOL je záznam o tom, kdo a kdy co v téhle zakázce počítal. */
  zak.protokol = [{ kdy: '2026-09-01T00:00:00.000Z', co: 'jednání u předlohy' }];
  zak.protokolKlic = 'klic-predlohy';

  const nova = zakazkaDuplikuj(zak, '2026 - OPR - CN - 7002');

  test('kvitance „ceny jsou dohodnuté" se nedědí',
    nova.varianty.every(v => !v.cenikKvitance),
    nova.varianty.map(v => v.cenikKvitance || null));
  test('a předloha si ji nechává',
    !!zak.varianty[0].cenikKvitance, zak.varianty[0].cenikKvitance);

  test('protokol o kalkulaci se nedědí',
    Array.isArray(nova.protokol) && nova.protokol.length === 0, nova.protokol);
  test('ani jeho klíč', !nova.protokolKlic, nova.protokolKlic);
  test('a předloha si protokol nechává',
    zak.protokol.length === 1 && zak.protokolKlic === 'klic-predlohy',
    { pocet: zak.protokol.length, klic: zak.protokolKlic });

  /* Pojistka proti prázdnému testu: kdyby se duplikace na tyhle položky
   * vůbec nedostala, kontroly výš by vycházely i u předlohy bez nich. */
  test('kontrola není prázdná — předloha ty položky opravdu měla',
    !!zak.varianty[0].cenikKvitance && zak.protokol.length > 0 && !!zak.protokolKlic);
}

/* ---------- schválená sleva a číslo nabídky PROJ se nedědí ----------
 * (druhé kolo nezávislé revize, 21. 9. 2026)
 *
 * Táž úvaha jako u kvitance ceníku, jen s tvrdšími následky. Změřeno:
 *   · obchodník duplikát VŮBEC NEULOŽÍ — server nemá ke kopii starou verzi,
 *     vidí rozhodnutí jako nové a vrátí „Slevu 12 % smí schválit jen
 *     nadřízený…", aniž by aplikace řekla proč;
 *   · vedoucí, který kopii uloží, se stane schvalovatelem slevy, kterou
 *     nikdy neviděl.
 * A `projHlavicka.cislo` je identifikátor JINÉHO dokumentu (řada OVP);
 * `zakazkaDuplicita` porovnává jen stranu OCK, takže kolize čísla PROJ
 * neodhalí a dvě zakázky vystupují navenek pod týmž číslem.
 */
{
  const zak = novaZakazka();
  zak.cislo = '2026 - OPR - CN - 7001';
  zak.projHlavicka = zak.projHlavicka || {};
  zak.projHlavicka.cislo = '2026 - OVP - CN - 0160';
  const v = zak.varianty[0];
  v.data.sleva = { procenta: 12, role: 'Obchodník', poznamka: 'pro zákazníka A',
                   stav: 'schváleno', schvalil: 'Vedoucí V. (Vedoucí)',
                   schvalilEmail: 'vedouci@firma.cz', schvalilKdy: '2026-09-01T10:00:00Z' };
  v.data.slevaProj = { procenta: 8, role: 'Obchodník', stav: 'schváleno',
                       schvalil: 'Vedoucí V. (Vedoucí)', schvalilKdy: '2026-09-01T10:00:00Z' };

  /* POJISTKA PROTI PRÁZDNÉMU TESTU: rozhodnutí v předloze opravdu je
   * a opravdu by se propsalo do ceny. */
  test('kontrola není prázdná — předloha má schválenou slevu',
    slevaPlati(v.data.sleva) === true && slevaPlati(v.data.slevaProj) === true);

  const nova = zakazkaDuplikuj(zak, '2026 - OPR - CN - 7002');
  const n = nova.varianty[0];

  ['sleva', 'slevaProj'].forEach(cast => {
    const s = n.data[cast];
    test('kopie: ' + cast + ' nenese rozhodnutí', s.stav === '', s);
    test('kopie: ' + cast + ' nenese razítko schvalovatele',
      !s.schvalil && !s.schvalilEmail && !s.schvalilKdy, s);
    test('kopie: ' + cast + ' se do ceny nepropíše', slevaPlati(s) === false, s);
    /* Procenta se ZÁMĚRNĚ nechávají — obchodník s tou slevou nejspíš počítá.
     * Zahazuje se rozhodnutí, ne záměr; nic se tiše neuplatní ani neztratí. */
    test('kopie: ' + cast + ' si procenta nechává', +s.procenta > 0, s);
  });
  test('kopie: poznámka ke slevě zůstává', n.data.sleva.poznamka === 'pro zákazníka A',
    n.data.sleva.poznamka);

  test('kopie nenese číslo nabídky PROJ předlohy',
    nova.projHlavicka.cislo !== '2026 - OVP - CN - 0160', nova.projHlavicka.cislo);
  test('a tváří se jako nevyplněné, ne jako platné',
    stranaMaCislo(nova, 'proj') === false, stranaCislo(nova, 'proj'));
  test('číslo OCK je to nové', nova.cislo === '2026 - OPR - CN - 7002', nova.cislo);

  /* Předloha zůstává, jak byla — duplikace do ní nesahá. */
  test('předloha si schválení nechává',
    v.data.sleva.stav === 'schváleno' && v.data.sleva.schvalil === 'Vedoucí V. (Vedoucí)',
    v.data.sleva);
  test('a předloha si číslo PROJ nechává',
    zak.projHlavicka.cislo === '2026 - OVP - CN - 0160', zak.projHlavicka.cislo);
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
