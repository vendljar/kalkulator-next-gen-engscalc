/* Test: centrální šablony dokumentů (#139, 13. 8. 2026)
 *
 * Šablony cenových nabídek se do 13. 8. 2026 nahrávaly ručně do každé relace
 * a po zavření okna zmizely (SET-6 „zatím platí pro relaci"). Horší důsledek:
 * každý obchodník mohl tisknout z jiného souboru a nikdo neměl jak poznat,
 * že nabídka odešla ze staré verze šablony.
 *
 * Nově šablony bydlí na serveru vedle platného ceníku a řídí se stejnými
 * pravidly: zveřejnit smí jen administrátor, verze se číslují, historie se
 * drží a každá verze nese otisk, jméno a datum. Tahle sada testuje rejstřík —
 * čistou logiku bez serveru — přesně jako test_program.js testuje ceník.
 */
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); };
nacti('./sablony_online.js');

let fails = 0, passes = 0;
function test(name, cond, info) {
  if (cond) { passes++; console.log('  ok  ' + name); }
  else { fails++; console.log('  FAIL ' + name + (info !== undefined ? '  -> ' + JSON.stringify(info) : '')); }
}

/* base64 začátek skutečného .docx (ZIP: PK\x03\x04) a ne-docx pro kontrolu */
const DOCX_B64 = 'UEsDBBQABgAIAAAAIQ' + 'A'.repeat(64);
const NE_DOCX_B64 = 'JVBERi0xLjQK' + 'A'.repeat(64);   // %PDF-1.4

// ---- typy ------------------------------------------------------------------
test('nabidka je platný typ', sablonaTypPlatny('nabidka'));
test('nabidkaProj je platný typ', sablonaTypPlatny('nabidkaProj'));
test('sod je platný typ', sablonaTypPlatny('sod'));
/* SoD projekčních prací a plná moc (#142, 13. 8. 2026) — šablony smluv se
 * řídí centrálně stejně jako nabídky; kdo by tiskl smlouvu ze staré verze,
 * poslal by zákazníkovi jiné znění, než které prošlo právníkem. */
test('sodProj je platný typ', sablonaTypPlatny('sodProj'));
test('plnaMoc je platný typ', sablonaTypPlatny('plnaMoc'));
test('mutace sodProj_en je platný typ', sablonaTypPlatny('sodProj_en'));
test('jazyková mutace nabidka_en je platný typ', sablonaTypPlatny('nabidka_en'));
test('jazyková mutace nabidkaProj_de je platný typ', sablonaTypPlatny('nabidkaProj_de'));
test('vymyšlený typ neprojde', !sablonaTypPlatny('faktura'));
test('mutace neznámého jazyka neprojde', !sablonaTypPlatny('nabidka_xx'));
test('prázdný typ neprojde', !sablonaTypPlatny('') && !sablonaTypPlatny(null));
/* Klíč typu jde do klíče úložiště — nesmí v něm být nic, co by cestu rozbilo. */
test('typ s lomítkem neprojde', !sablonaTypPlatny('nabidka/../ceniky'));

// ---- rozpoznání .docx ------------------------------------------------------
/* Word soubor je ZIP a base64 ZIPu začíná „UEsDB". Cokoli jiného se odmítne
 * při zveřejnění — nahrát omylem PDF by znamenalo, že generování spadne až
 * obchodníkovi při tisku, tedy v nejhorší možné chvíli. */
test('docx (ZIP) projde kontrolou', sablonaJeDocxB64(DOCX_B64));
test('PDF kontrolou neprojde', !sablonaJeDocxB64(NE_DOCX_B64));
test('prázdno kontrolou neprojde', !sablonaJeDocxB64('') && !sablonaJeDocxB64(null));

// ---- otisk -----------------------------------------------------------------
test('otisk je deterministický', sablonaOtisk(DOCX_B64) === sablonaOtisk(DOCX_B64));
test('jiná data mají jiný otisk', sablonaOtisk(DOCX_B64) !== sablonaOtisk(DOCX_B64 + 'B'));
test('otisk je krátký hex', /^[0-9a-f]{8,16}$/.test(sablonaOtisk(DOCX_B64)), sablonaOtisk(DOCX_B64));

// ---- rejstřík a zveřejňování ----------------------------------------------
let rej = sablonyNovyRejstrik();
test('nový rejstřík začíná v přísném režimu', rej.rezim === 'prisny', rej.rezim);
test('nový rejstřík nemá žádnou platnou šablonu', sablonaPlatna(rej, 'nabidka') === null);

rej = sablonyZverejni(rej, { typ: 'nabidka', nazev: 'Sablona_NABIDKA_CN_v8.docx',
  velikost: 81828, otisk: sablonaOtisk(DOCX_B64), kdo: 'admin@priklad.cz',
  poznamka: 'první verze', kdy: '2026-08-13T10:00:00Z' });
const p1 = sablonaPlatna(rej, 'nabidka');
test('zveřejněná šablona je platná verzí 1', p1 && p1.verze === 1, p1);
test('platná verze nese jméno souboru', p1.nazev === 'Sablona_NABIDKA_CN_v8.docx');
test('platná verze nese, kdo ji zveřejnil', p1.zverejnil === 'admin@priklad.cz');
test('platná verze nese datum', p1.kdy === '2026-08-13T10:00:00Z');
test('platná verze nese otisk', p1.otisk === sablonaOtisk(DOCX_B64));
test('jiné typy zveřejněním nedotčeny', sablonaPlatna(rej, 'nabidkaProj') === null);

rej = sablonyZverejni(rej, { typ: 'nabidka', nazev: 'Sablona_NABIDKA_CN_v9.docx',
  velikost: 90000, otisk: 'ffff0000', kdo: 'admin@priklad.cz', kdy: '2026-08-14T08:00:00Z' });
const p2 = sablonaPlatna(rej, 'nabidka');
test('druhé zveřejnění zvedne verzi na 2', p2.verze === 2, p2.verze);
test('historie drží předchozí verzi', rej.typy.nabidka.historie.length === 1
  && rej.typy.nabidka.historie[0].verze === 1, rej.typy.nabidka.historie);
/* Verze v historii je jen metadata — soubor leží zvlášť pod svým klíčem,
 * takže rejstřík zůstává malý i po letech zveřejňování. */
test('historie nenese data souboru', !('data' in rej.typy.nabidka.historie[0]));

rej = sablonyZverejni(rej, { typ: 'nabidkaProj', nazev: 'Sablona_NABIDKA_PROJ.docx',
  velikost: 561972, otisk: 'abcd1234', kdo: 'admin@priklad.cz', kdy: '2026-08-14T09:00:00Z' });
test('každý typ má vlastní řadu verzí (PROJ začíná od 1)',
  sablonaPlatna(rej, 'nabidkaProj').verze === 1);
test('verze nabídky OCK se zveřejněním PROJ nezměnila',
  sablonaPlatna(rej, 'nabidka').verze === 2);

// ---- klíč souboru v úložišti ----------------------------------------------
test('klíč souboru se skládá z typu a verze',
  sablonaKlicSouboru('nabidka', 2) === 'data/nabidka/2', sablonaKlicSouboru('nabidka', 2));

// ---- režim: přísný / měkký -------------------------------------------------
/* Přísný režim = bez serverové šablony dokument nevznikne (jako u ceníku).
 * Měkký je vědomá výjimka pro výpadek: administrátor ho zapne, ale rejstřík
 * si pamatuje kdo a kdy — v protokolu pak nejde zapřít, že se tisklo mimo. */
rej = sablonyRezimNastav(rej, 'mekky', 'admin@priklad.cz', '2026-08-14T10:00:00Z');
test('administrátor přepne do měkkého režimu', rej.rezim === 'mekky');
test('přepnutí režimu se podepisuje', rej.rezimZmenil === 'admin@priklad.cz'
  && rej.rezimKdy === '2026-08-14T10:00:00Z');
rej = sablonyRezimNastav(rej, 'prisny', 'admin@priklad.cz', '2026-08-14T11:00:00Z');
test('a zpět do přísného', rej.rezim === 'prisny');
test('neznámý režim se odmítne (vrací se beze změny)',
  sablonyRezimNastav(rej, 'vypnuto', 'x', 'y').rezim === 'prisny');

// ---- vstupy, kterým nejde věřit -------------------------------------------
test('zveřejnění s neplatným typem vrátí null',
  sablonyZverejni(rej, { typ: 'faktura', nazev: 'x', otisk: 'a', kdo: 'x', kdy: 'x' }) === null);
test('zveřejnění bez názvu vrátí null',
  sablonyZverejni(rej, { typ: 'nabidka', nazev: '', otisk: 'a', kdo: 'x', kdy: 'x' }) === null);
test('rejstřík se vstupem nezměnil (zůstává verze 2)',
  sablonaPlatna(rej, 'nabidka').verze === 2);
test('sablonaPlatna snese chybějící rejstřík', sablonaPlatna(null, 'nabidka') === null);

// ---- zdroj jazykové verze a její stav (#348, 24. 9. 2026) ------------------
/* Do 24. 9. se zastaralost poznávala podle času a stejný soubor server
 * podruhé nezveřejní — „zastaralá" pak nešla odstranit. Mutace nese otisk
 * české verze, ze které vznikla. */
{
  const O1 = 'aaaaaaaaaaaaaaaa', O2 = 'bbbbbbbbbbbbbbbb', OE = 'cccccccccccccccc';
  let r = sablonyNovyRejstrik();
  r = sablonyZverejni(r, { typ: 'nabidka', nazev: 'cz1.docx', otisk: O1, kdo: 'a', kdy: '2026-09-24T10:00:00Z' });
  test('stav: chybí, dokud jazyková verze není', sablonaMutaceStav(r, 'nabidka', 'en').stav === 'chybi');
  r = sablonyZverejni(r, { typ: 'nabidka_en', nazev: 'en.docx', otisk: OE, zdrojOtisk: O1, kdo: 'a', kdy: '2026-09-24T09:00:00Z' });
  test('mutace si nese otisk zdrojové češtiny', sablonaPlatna(r, 'nabidka_en').zdrojOtisk === O1);
  test('stav: aktuální k platné češtině (i když je zveřejněná dřív)', sablonaMutaceStav(r, 'nabidka', 'en').stav === 'aktualni',
    sablonaMutaceStav(r, 'nabidka', 'en'));
  test('stav zná číslo české verze, ze které vznikla', sablonaMutaceStav(r, 'nabidka', 'en').zVerze === 1);
  r = sablonyZverejni(r, { typ: 'nabidka', nazev: 'cz2.docx', otisk: O2, kdo: 'a', kdy: '2026-09-24T11:00:00Z' });
  test('nová čeština → mutace zastaralá', sablonaMutaceStav(r, 'nabidka', 'en').stav === 'zastarala');
  test('a pořád ví, že vznikla z v1', sablonaMutaceStav(r, 'nabidka', 'en').zVerze === 1);
  r = sablonyZverejni(r, { typ: 'nabidka_en', nazev: 'en.docx', otisk: OE, zdrojOtisk: O2, kdo: 'a', kdy: '2026-09-24T11:05:00Z' });
  test('stejný soubor k nové češtině → aktuální', sablonaMutaceStav(r, 'nabidka', 'en').stav === 'aktualni');
  r = sablonyZverejni(r, { typ: 'nabidka', nazev: 'cz1.docx', otisk: O1, kdo: 'a', kdy: '2026-09-24T12:00:00Z', vracenoZ: 1 });
  test('vrácení na v1 zapíše, odkud se vracelo', sablonaPlatna(r, 'nabidka').vracenoZ === 1 && sablonaPlatna(r, 'nabidka').verze === 3);
  test('po vrácení je mutace k v2 zastaralá', sablonaMutaceStav(r, 'nabidka', 'en').stav === 'zastarala');
  test('sablonaVerze vrací platnou i historii od nejnovější', sablonaVerze(r, 'nabidka').map(v => v.verze).join() === '3,2,1');
  const rc = sablonyZverejni(r, { typ: 'nabidka', nazev: 'x.docx', otisk: 'dddddddddddddddd', zdrojOtisk: O1, kdo: 'a', kdy: 'x' });
  test('česká šablona zdrojOtisk nenese', !('zdrojOtisk' in sablonaPlatna(rc, 'nabidka')));
  const rz = sablonyZverejni(r, { typ: 'nabidka_de', nazev: 'x.docx', otisk: 'dddddddddddddddd', zdrojOtisk: 'x"><img', kdo: 'a', kdy: 'x' });
  test('neplatný zdrojOtisk se nezapíše', !('zdrojOtisk' in sablonaPlatna(rz, 'nabidka_de')));
  /* starší záznam bez otisku: postaru podle času */
  let s0 = sablonyNovyRejstrik();
  s0 = sablonyZverejni(s0, { typ: 'sod', nazev: 'a', otisk: O1, kdo: 'a', kdy: '2026-09-20T10:00:00Z' });
  s0 = sablonyZverejni(s0, { typ: 'sod_de', nazev: 'b', otisk: OE, kdo: 'a', kdy: '2026-09-19T10:00:00Z' });
  test('starší mutace bez otisku: zveřejněná dřív než čeština = zastaralá (podle času)',
    sablonaMutaceStav(s0, 'sod', 'de').stav === 'zastarala' && sablonaMutaceStav(s0, 'sod', 'de').podleCasu);
  test('mutace bez české šablony', sablonaMutaceStav(sablonyZverejni(sablonyNovyRejstrik(),
    { typ: 'sod_de', nazev: 'b', otisk: OE, kdo: 'a', kdy: 'x' }), 'sod', 'de').stav === 'bezZdroje');
}

// ---- jazyk souboru a symboly (#348) ----------------------------------------
{
  const cz = ['Cenová nabídka na dodávku ocelové konstrukce výtahové šachty', 'Cena je uvedena bez DPH a platí pro tuto zakázku',
              'Objednatel zajistí přístup na stavbu', 'Termín dodání {{TERMIN}}'];
  const de = ['Angebot für die Lieferung der Stahlkonstruktion des Aufzugsschachts', 'Der Preis ist ohne MwSt. und gilt für den Auftrag',
              'Der Auftraggeber sorgt für den Zugang zur Baustelle', 'Liefertermin {{TERMIN}}'];
  const en = ['Offer for the delivery of the steel structure of the lift shaft', 'The price is without VAT and is valid for this order',
              'The customer shall provide access to the site'];
  const fr = ['Offre pour la livraison de la structure métallique de la gaine', 'Le prix est hors TVA et est valable pour la commande'];
  test('česky', sablonaJazykOdhad(cz).jazyk === 'cz' && sablonaJazykOdhad(cz).podil === 1, sablonaJazykOdhad(cz));
  test('německy', sablonaJazykOdhad(de).jazyk === 'de', sablonaJazykOdhad(de));
  test('anglicky', sablonaJazykOdhad(en).jazyk === 'en', sablonaJazykOdhad(en));
  test('francouzsky', sablonaJazykOdhad(fr).jazyk === 'fr', sablonaJazykOdhad(fr));
  /* Německé odstavce, které poznají hlavně přehlásky (nadpisy, krátké řádky). */
  const deKratke = ['Prüfbericht und Übergabe der Schlüssel', 'Gültigkeit des Angebots: 30 Tage', 'Zahlungsbedingungen gemäß Vertrag'];
  test('krátké německé řádky (přehlásky) nejsou čeština', sablonaJazykOdhad(deKratke).jazyk === 'de', sablonaJazykOdhad(deKratke));
  test('odstavce jen se symboly a čísly se nezařadí', sablonaJazykOdhad(['{{CENA}}', '12 345', 'IČ 123']).zarazeno === 0);
  test('prázdný vstup nespadne', sablonaJazykOdhad(null).jazyk === null);
  test('symboly: unikátní a seřazené', sablonaSymboly(['{{B}} a {{A}}', '{{B}}', 'bez']).join() === 'A,B');
  const r = sablonaSymbolyRozdil(['A', 'B', 'C'], ['B', 'C', 'D']);
  test('rozdíl symbolů', r.pribylo.join() === 'D' && r.ubylo.join() === 'A', r);
}

// ---- #473 (O12, 21. 10. 2026): jazykové verze k už platné češtině ----------
/* J. V. 21. 10.: SoD REALIZACE má platnou češtinu v2. Průvodce spuštěný znovu
 * se STEJNÝM českým souborem + vlastní EN/DE/FR skončil hláškou „už je
 * zveřejněná jako platná verze 2" a nezveřejnil nic. Průvodce (src/ui/
 * sablony_sprava_ui.js) se tu pouští ve vm se zástupnou funkcí
 * onlineSablonaZverejni, která odmítá stejně jako server (sablony.mjs). */
{
  const fs = require('fs'), path = require('path'), vm = require('vm');
  test('shoda češtiny: bez platné verze null', sablonaCestinaShodna(sablonyNovyRejstrik(), 'sod', DOCX_B64) === null);
  {
    const r = sablonyZverejni(sablonyNovyRejstrik(), { typ: 'sod', nazev: 'a.docx', otisk: sablonaOtisk(DOCX_B64), kdo: 'a', kdy: 'x' });
    test('shoda češtiny: stejný soubor = platná meta', (sablonaCestinaShodna(r, 'sod', DOCX_B64) || {}).verze === 1);
    test('shoda češtiny: jiný soubor = null', sablonaCestinaShodna(r, 'sod', DOCX_B64 + 'AA') === null);
    test('shoda češtiny: prázdný soubor = null', sablonaCestinaShodna(r, 'sod', '') === null);
    test('base64 z ArrayBuffer jako btoa', sablonaAbNaB64(new Uint8Array([80, 75, 3, 4]).buffer) === 'UEsDBA==');
    /* soubor delší než jeden blok převodu (32 768 B) — všechny bajty, jako Buffer */
    const velky = new Uint8Array(70001).map((_, i) => (i * 7 + 3) & 255);
    test('base64 velkého souboru = Buffer (otisk jako na serveru)', sablonaAbNaB64(velky.buffer) === Buffer.from(velky).toString('base64'));
  }

  const TEXTY = {
    1: ['Smlouva o dílo na dodávku ocelové konstrukce výtahové šachty', 'Cena je uvedena bez DPH a platí pro tuto zakázku',
        'Objednatel zajistí přístup na stavbu', 'Termín dodání {{TERMIN}}'],
    2: ['Contract for the delivery of the steel structure of the lift shaft', 'The price is without VAT and is valid for this order',
        'The customer shall provide access to the site', 'Delivery date {{TERMIN}}'],
    3: ['Vertrag für die Lieferung der Stahlkonstruktion des Aufzugsschachts', 'Der Preis ist ohne MwSt. und gilt für den Auftrag',
        'Der Auftraggeber sorgt für den Zugang zur Baustelle', 'Liefertermin {{TERMIN}}'],
    4: ['Contrat pour la livraison de la structure métallique de la gaine', 'Le prix est hors TVA et est valable pour la commande',
        'Le client assure l\u2019accès au chantier', 'Date de livraison {{TERMIN}}'],
  };
  const soubor = (k, nazev, x) => ({ nazev, data: new Uint8Array([80, 75, 3, 4, k, x || 0]).buffer });
  const CZ = soubor(1, 'Sablona_SOD_REALIZACE_v3.docx');
  const EN = soubor(2, 'Sablona_SOD_REALIZACE_v3_EN.docx'), DE = soubor(3, 'Sablona_SOD_REALIZACE_v3_DE.docx');
  const FR = soubor(4, 'Sablona_SOD_REALIZACE_v3_FR.docx');

  /* Pracovní prostředí průvodce: jádro šablon + UI + zástupné funkce. */
  const prostredi = () => {
    const S = { volani: [], dialogy: [], selzeJazyk: null };
    const ctx = vm.createContext({ btoa, atob, console, TextEncoder, Uint8Array, ArrayBuffer, Promise });
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'sablony_online.js'), 'utf8'), ctx);
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'ui', 'sablony_sprava_ui.js'), 'utf8'), ctx);
    Object.assign(ctx, {
      jeAdmin: () => true, nastRefresh: () => {}, document: { getElementById: () => null },
      esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';'),
      escJs: s => String(s).replace(/['\\]/g, '\\$&'),
      potvrd: t => { S.dialogy.push(String(t)); return Promise.resolve(true); },
      hlaska: t => { S.dialogy.push(String(t)); return Promise.resolve(); },
      docxTextSablony: async data => (TEXTY[new Uint8Array(data)[4]] || []).slice(),
      docxPrelozSablonu: async (data, lang, stat) => {
        Object.assign(stat, { procenta: 95, chybi: [], symbolove: [] });
        const k = { en: 2, de: 3, fr: 4 }[lang];
        return { arrayBuffer: async () => new Uint8Array([80, 75, 3, 4, k, 99]).buffer };
      },
      onlineSablonaStahni: async typ => ({ nazev: CZ.nazev, data: CZ.data.slice(0) }),
      /* jako server: stejný otisk → 400, zdroj ≠ platná čeština → 409 */
      onlineSablonaZverejni: async (typ, nazev, ab, poznamka, zdrojOtisk) => {
        S.volani.push({ typ, nazev, poznamka, zdrojOtisk });
        const rej = ctx.ONLINE_STAV.sablonyRejstrik;
        if (S.selzeJazyk && typ.endsWith('_' + S.selzeJazyk)) throw new Error('výpadek spojení');
        const otisk = sablonaOtisk(sablonaAbNaB64(ab));
        const cz = sablonaPlatna(rej, typ.replace(/_[a-z]{2}$/, ''));
        if (zdrojOtisk && (!cz || cz.otisk !== zdrojOtisk)) throw new Error('Česká šablona se mezitím změnila');
        const pl = sablonaPlatna(rej, typ);
        if (pl && pl.otisk === otisk && (!zdrojOtisk || pl.zdrojOtisk === zdrojOtisk))
          throw new Error('Tahle šablona už je zveřejněná jako platná verze ' + pl.verze + ' – není co zveřejňovat.');
        ctx.ONLINE_STAV.sablonyRejstrik = sablonyZverejni(rej, { typ, nazev, otisk, zdrojOtisk, kdo: 'spravce', kdy: '2026-10-21T10:00:00Z', poznamka });
        return { verze: sablonaPlatna(ctx.ONLINE_STAV.sablonyRejstrik, typ).verze, otisk };
      },
    });
    /* platná čeština v2 = soubor CZ (v1 byl jiný soubor) */
    let rej = sablonyZverejni(sablonyNovyRejstrik(), { typ: 'sod', nazev: 'Sablona_SOD_REALIZACE_v2.docx', otisk: sablonaOtisk('UEsDBAAA'), kdo: 's', kdy: '2026-10-01' });
    rej = sablonyZverejni(rej, { typ: 'sod', nazev: CZ.nazev, otisk: sablonaOtisk(sablonaAbNaB64(CZ.data)), kdo: 's', kdy: '2026-10-02' });
    ctx.ONLINE_STAV = { sablonyRejstrik: rej };
    S.ctx = ctx; S.run = kod => vm.runInContext(kod, ctx);
    S.czOtisk = sablonaPlatna(rej, 'sod').otisk;
    return S;
  };

  (async () => {
    /* a) stejná čeština + vlastní EN/DE/FR → jen tři jazyky, žádné volání pro češtinu */
    const S = prostredi();
    S.ctx.__CZ = CZ; S.ctx.__EN = EN; S.ctx.__DE = DE; S.ctx.__FR = FR;
    await S.run(`sablPruvodceStart('sod', __CZ)`);
    const htmlKontrola = S.run('sablPruvodceHtml()');
    await S.run('sablPruvodceDal()');
    await S.run(`sablPruvodceVlastni('en', __EN)`);
    await S.run(`sablPruvodceVlastni('de', __DE)`);
    await S.run(`sablPruvodceVlastni('fr', __FR)`);
    const html = S.run('sablPruvodceHtml()');
    test('#473 průvodce: záhlaví řekne, že čeština je shodná s platnou v2',
      /shodná s platnou verzí 2/.test(html) && !/nová česká verze/.test(html) && /shodná s platnou verzí 2/.test(htmlKontrola), html.slice(0, 400));
    test('#473 průvodce: tlačítko „Zveřejnit jazykové verze k platné češtině v2: EN + DE + FR"',
      /Zveřejnit jazykové verze k platné češtině v2: EN \+ DE \+ FR/.test(html) && !/Zveřejnit najednou: čeština/.test(html),
      (html.match(/<button class="primary"[^>]*>[^<]*/g) || []).join(' | '));
    await S.run('sablPruvodceZverejni()');
    const rej = S.ctx.ONLINE_STAV.sablonyRejstrik;
    test('#473 průvodce: čeština se znovu nezveřejňuje (žádné volání pro „sod")',
      !S.volani.some(v => v.typ === 'sod'), S.volani.map(v => v.typ));
    test('#473 průvodce: zveřejní se právě EN, DE a FR',
      S.volani.map(v => v.typ).join() === 'sod_en,sod_de,sod_fr', S.volani.map(v => v.typ));
    test('#473 průvodce: jazyky nesou zdrojOtisk platné češtiny v2',
      S.volani.length === 3 && S.volani.every(v => v.zdrojOtisk === S.czOtisk), S.volani);
    test('#473 průvodce: poznámka „vlastní soubor k české verzi 2"',
      S.volani.length === 3 && S.volani.every(v => /vlastní soubor k české verzi 2/.test(v.poznamka)), S.volani.map(v => v.poznamka));
    test('#473 průvodce: čeština zůstala v2 a EN/DE/FR jsou aktuální',
      sablonaPlatna(rej, 'sod').verze === 2 && ['en', 'de', 'fr'].every(l => sablonaMutaceStav(rej, 'sod', l).stav === 'aktualni'),
      ['en', 'de', 'fr'].map(l => sablonaMutaceStav(rej, 'sod', l).stav));
    const prace = S.run('SABL_UI.prace');
    test('#473 průvodce: výsledek „Hotovo" vypíše jazyky', /^Hotovo/.test(prace) && /EN v1/.test(prace) && /DE v1/.test(prace) && /FR v1/.test(prace)
      && S.run('SABL_UI.pruvodce') === null, prace);
    test('#473 průvodce: potvrzení řekne, že se čeština nezveřejní',
      S.dialogy.some(t => /shodná s platnou verzí 2/.test(t) && /EN, DE, FR/.test(t)), S.dialogy);
    test('#473 průvodce: žádná hláška „už je zveřejněná"', !S.dialogy.some(t => /už je zveřejněná/.test(t)), S.dialogy);

    /* b) bez vybraného jazyka: tlačítko zakázané s vysvětlením, nic se nepošle */
    const S2 = prostredi();
    S2.ctx.__CZ = CZ;
    await S2.run(`sablPruvodceStart('sod', __CZ)`);
    await S2.run('sablPruvodceDal()');
    S2.run('SABL_UI.pruvodce.vybrane = {}');
    const html2 = S2.run('sablPruvodceHtml()');
    test('#473 průvodce: bez jazyka je tlačítko zakázané a vysvětlené',
      /<button class="primary" disabled[^>]*>Zveřejnit jazykové verze k platné češtině v2/.test(html2) && /Vyberte aspoň jeden jazyk/.test(html2),
      (html2.match(/<button class="primary"[^>]*>[^<]*/g) || []).join(' | '));
    await S2.run('sablPruvodceZverejni()');
    test('#473 průvodce: bez jazyka se nic nezveřejní', S2.volani.length === 0, S2.volani);

    /* c) chyba u jednoho jazyka: ostatní se zveřejní, výsledek ji vypíše po jazyce */
    const S3 = prostredi();
    S3.ctx.__CZ = CZ; S3.ctx.__EN = EN; S3.ctx.__FR = FR;
    S3.selzeJazyk = 'en';                          // první v pořadí — ostatní musí jít dál
    await S3.run(`sablPruvodceStart('sod', __CZ)`);
    await S3.run('sablPruvodceDal()');
    await S3.run(`sablPruvodceVlastni('en', __EN)`);
    await S3.run(`sablPruvodceVlastni('fr', __FR)`);
    S3.run('SABL_UI.pruvodce.vybrane = { en: true, fr: true }');
    await S3.run('sablPruvodceZverejni()');
    const prace3 = S3.run('SABL_UI.prace');
    test('#473 průvodce: chyba jednoho jazyka se vypíše, ostatní zveřejněné',
      /EN: výpadek spojení/.test(prace3) && /FR v1/.test(prace3) && !!sablonaPlatna(S3.ctx.ONLINE_STAV.sablonyRejstrik, 'sod_fr'), prace3);

    /* d) nová čeština (jiný soubor) dál zveřejní češtinu i jazyky postaru */
    const S4 = prostredi();
    S4.ctx.__CZ2 = soubor(1, 'Sablona_SOD_REALIZACE_v4.docx', 7);
    await S4.run(`sablPruvodceStart('sod', __CZ2)`);
    await S4.run('sablPruvodceDal()');
    S4.run('SABL_UI.pruvodce.vybrane = { en: true }');
    const html4 = S4.run('sablPruvodceHtml()');
    await S4.run('sablPruvodceZverejni()');
    const rej4 = S4.ctx.ONLINE_STAV.sablonyRejstrik;
    test('#473 průvodce: nová čeština jde postaru (čeština + EN, EN k v3)',
      /Zveřejnit najednou: čeština \+ EN/.test(html4) && S4.volani.map(v => v.typ).join() === 'sod,sod_en'
      && sablonaPlatna(rej4, 'sod').verze === 3 && sablonaMutaceStav(rej4, 'sod', 'en').stav === 'aktualni', S4.volani);

    /* e) druhá cesta: „Nahrát doladěný soubor" u jazyka ve stavu „chybí" */
    const S5 = prostredi();
    const det = S5.run(`SABL_UI.vybrany = 'sod'; sablDetailHtml(sablRej(), true)`);
    const radekFr = (det.split('<b>Francouzština</b>')[1] || '').split('</div>')[0] + (det.split('<b>Francouzština</b>')[1] || '').split('</span></div>')[0];
    test('#473 detail: u jazyka „chybí" je tlačítko „Nahrát doladěný soubor" (povolené)',
      /<button class="mini"  onclick="sablNahrajJazyk\('sod','fr'\)">Nahrát doladěný soubor<\/button>/.test(radekFr), radekFr.slice(0, 600));
    S5.ctx.__FR = FR;
    await S5.run(`sablNahrajJazyk('sod', 'fr', __FR)`);
    test('#473 detail: doladěný FR soubor se zveřejní k platné češtině v2',
      S5.volani.length === 1 && S5.volani[0].typ === 'sod_fr' && S5.volani[0].zdrojOtisk === S5.czOtisk
      && sablonaMutaceStav(S5.ctx.ONLINE_STAV.sablonyRejstrik, 'sod', 'fr').stav === 'aktualni', S5.volani);

    console.log('\nPASS=' + passes + ' FAIL=' + fails);
    process.exit(fails ? 1 : 0);
  })().catch(e => { console.log('  FAIL #473 výjimka: ' + (e && e.stack || e)); process.exit(1); });
}
