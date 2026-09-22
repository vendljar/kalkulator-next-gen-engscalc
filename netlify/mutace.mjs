/* ============================================================
 * MUTAČNÍ TESTOVÁNÍ SERVEROVÉ VRSTVY (bezpečnostní audit 5. 8. 2026)
 *
 * PROČ TOHLE EXISTUJE
 *
 * Zelená sada testů říká jen tolik, že testy prošly. Neříká, jestli by
 * zčervenaly, kdyby se kód rozbil — a přesně to je otázka, na které záleží.
 * Test, který projde vždycky, je horší než žádný: dělá dojem, že se hlídá
 * něco, co se nehlídá.
 *
 * Tenhle nástroj proto kód schválně rozbíjí. Vezme jedno místo v serverové
 * funkci, provede v něm PRÁVĚ JEDNU záměnu (typicky vypne nějakou kontrolu),
 * spustí obě serverové sady a čeká, že aspoň jedna spadne. Když spadne,
 * mutace je „chycená" a víme, že kontrolu opravdu někdo hlídá. Když projde,
 * je to díra v testech: tuhle chybu by nikdo nezachytil — ani při nasazení.
 * Původní znění souboru se hned vrátí zpátky (i při přerušení), takže po
 * doběhnutí je pracovní kopie beze změny.
 *
 * JAK TO ČÍST
 *   chycená    … někdo tu kontrolu hlídá, dobře
 *   NECHYCENÁ  … testům chybí kontrola právě tohohle; buď se doplní test,
 *                nebo se vědomě zapíše, proč se to nehlídá
 *
 * Spouští se `node netlify/mutace.mjs` (volitelně s částí názvu mutace
 * jako filtrem, např. `node netlify/mutace.mjs relace`).
 * ============================================================ */

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOREN = dirname(fileURLToPath(import.meta.url));

/* Adresa hlavního správce se bere z prostředí (repozitář je veřejný, do kódu
 * nepatří). Testům stačí SMYŠLENÁ — ověřují pravidla, ne konkrétní účet —
 * a CI ji tak nastavuje. Ručně spuštěný běh ji ale neměl a zastavil se hned
 * na „sady nejsou zelené ani bez mutace", protože test_prava.mjs padne na
 * přihlášení prázdným e-mailem. Vypadalo to jako rozbitý kód, přitom šlo
 * jen o chybějící proměnnou (21. 9. 2026; totéž doplněno do spust_testy.sh).
 * Vlastní hodnota z prostředí má přednost. */
if (!process.env.ADMIN_EMAIL) process.env.ADMIN_EMAIL = 'spravce@priklad.cz';

/* test_obnova.mjs přibyla 9. 9. 2026 (B27–B31): mutace obnovy hlídá ona. */
const SADY = ['test_prava.mjs', 'test_funkce.mjs', 'test_obnova.mjs'];
const filtr = (process.argv.slice(2).find(a => !a.startsWith('--')) || '').toLowerCase();

/* Každá mutace: soubor, hledaný úsek (musí být v souboru PRÁVĚ JEDNOU),
 * čím se nahradí, a proč nás zajímá — co by se v praxi stalo, kdyby tuhle
 * chybu někdo udělal doopravdy. */
const MUTACE = [
  /* ---------- relace a hesla (lib/sdilene.mjs) ---------- */
  { nazev: 'podpis relace se neověřuje', soubor: 'lib/sdilene.mjs',
    hledej: '  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;',
    nahrad: '  if (false) return null;',
    proc: 'kdokoli by si napsal vlastní cookie a byl administrátorem' },

  { nazev: 'platnost relace se neověřuje', soubor: 'lib/sdilene.mjs',
    hledej: 'return (r.exp > Date.now()) ? r : null;',
    nahrad: 'return r;',
    proc: 'dvanáctihodinový limit by neplatil, stará cookie by fungovala napořád' },

  { nazev: 'heslo se neporovnává', soubor: 'lib/sdilene.mjs',
    hledej: 'return timingSafeEqual(Buffer.from(hash, \'hex\'), b);',
    nahrad: 'return true;',
    proc: 'dovnitř by se dostal každý, kdo zná e-mail' },

  { nazev: 'heslo se porovnává obyčejně, ne časově bezpečně', soubor: 'lib/sdilene.mjs',
    hledej: 'return timingSafeEqual(Buffer.from(hash, \'hex\'), b);',
    nahrad: 'return hash === b.toString(\'hex\');',
    proc: 'z délky odpovědi by šlo heslo uhodnout po znacích' },

  { nazev: 'heslo se ukládá v čitelné podobě', soubor: 'lib/sdilene.mjs',
    hledej: 'return sul + \':\' + hash;',
    nahrad: 'return sul + \':\' + Buffer.from(String(heslo)).toString(\'hex\');',
    proc: 'kdo se dostane k databázi, přečte si všechna hesla' },

  { nazev: 'sůl hesla je pro všechny stejná', soubor: 'lib/sdilene.mjs',
    hledej: 'const sul = randomBytes(16).toString(\'hex\');',
    nahrad: 'const sul = \'0000000000000000\';',
    proc: 'stejná hesla by měla stejný otisk a daly by se lámat hromadně' },

  { nazev: 'tajemství relace má zapsanou náhradu v kódu', soubor: 'lib/sdilene.mjs',
    hledej: '  const t = process.env.TAJEMSTVI_RELACE;',
    nahrad: '  const t = process.env.TAJEMSTVI_RELACE || \'zalozni-tajemstvi-v-kodu\';',
    proc: 'tajemství v repozitáři si přečte každý, kdo vidí zdrojáky' },

  /* ---------- ověřování práv (lib/sdilene.mjs) ---------- */
  { nazev: 'role se nekontroluje', soubor: 'lib/sdilene.mjs',
    hledej: '  if (role.length && !role.includes(relace.role))',
    nahrad: '  if (false && !role.includes(relace.role))',
    proc: 'obchodník by stáhl celou databázi i zveřejnil ceník' },

  { nazev: 'vypnutý účet se nepozná', soubor: 'lib/sdilene.mjs',
    hledej: '  if (ucet.aktivni === false)',
    nahrad: '  if (false)',
    proc: 'kolega, který odešel, pracuje dál až do vypršení cookie' },

  { nazev: 'smazaný účet projde', soubor: 'lib/sdilene.mjs',
    hledej: '  if (!ucet)\n    return { chyba: json({ ok: false, chyba: \'Účet už neexistuje. Přihlaste se znovu.\' }, 401) };',
    nahrad: '  if (!ucet) return { relace: r };',
    proc: 'relace na zrušený účet by dál platila' },

  { nazev: 'role se bere z cookie, ne z účtu', soubor: 'lib/sdilene.mjs',
    hledej: '  const relace = { ...r, ...profilZUctu(ucet), email: r.email, role: ucet.role };',
    nahrad: '  const relace = { ...profilZUctu(ucet), ...r, email: r.email };',
    proc: 'sražená role platí až za dvanáct hodin — přesně naopak, než je potřeba' },

  /* ---------- přihlášení (functions/prihlaseni.mjs) ---------- */
  { nazev: 'přihlášení nekontroluje heslo', soubor: 'functions/prihlaseni.mjs',
    hledej: '  const pustit = !!ucet && ucet.aktivni !== false && sedi;',
    nahrad: '  const pustit = !!ucet && ucet.aktivni !== false;',
    proc: 'stačilo by znát e-mail kolegy' },

  { nazev: 'přihlásí se i vypnutý účet', soubor: 'functions/prihlaseni.mjs',
    hledej: '  const pustit = !!ucet && ucet.aktivni !== false && sedi;',
    nahrad: '  const pustit = !!ucet && sedi;',
    proc: 'vypnutí účtu by nic neznamenalo' },

  /* ---------- brzda proti hádání hesel a čas odpovědi (#92, #93) ---------- */
  { nazev: 'brzda pustí neomezený počet pokusů', soubor: 'functions/prihlaseni.mjs',
    hledej: '  if (pokusy.email.n > POKUSY_MAX || pokusy.adresa.n > POKUSY_IP_MAX)',
    nahrad: '  if (false)',
    proc: 'hádání hesel by nic nezpomalilo a nikde by po něm nezůstala stopa' },

  { nazev: 'úspěšné přihlášení nevynuluje počítadlo', soubor: 'functions/prihlaseni.mjs',
    hledej: '    await pokusyUspech(email, ip);',
    nahrad: '    ;',
    proc: 'po deseti překlepech za den by se člověk nepřihlásil ani se správným heslem' },

  { nazev: 'brzda předběhne ověření hesla', soubor: 'functions/prihlaseni.mjs',
    hledej: '  const pustit = !!ucet && ucet.aktivni !== false && sedi;\n\n  if (pustit) {',
    nahrad: '  const pustit = !!ucet && ucet.aktivni !== false && sedi\n    && (await pokusyStav(email)).n <= POKUSY_MAX;\n\n  if (pustit) {',
    proc: 'útočník by deseti špatnými pokusy zamkl majitele účtu — i hlavního administrátora' },

  { nazev: 'u neznámého účtu se scrypt nepočítá', soubor: 'functions/prihlaseni.mjs',
    hledej: '  const sedi = hesloSedi(heslo, (ucet && ucet.heslo) ? ucet.heslo : FALESNY_OTISK);',
    nahrad: '  const sedi = (ucet && ucet.heslo) ? hesloSedi(heslo, ucet.heslo) : false;',
    proc: 'z času odpovědi by šlo přečíst, které e-maily v databázi jsou' },

  /* ---------- archivace účtů a převod zakázek (11. 8. 2026) ---------- */
  { nazev: 'archivovaný účet se pořád přihlásí', soubor: 'functions/uzivatele.mjs',
    hledej: '        ucet.aktivni = false;          // archivovaný účet se nikdy nepřihlásí',
    nahrad: '        ;',
    proc: 'účet po odcházejícím kolegovi by zmizel ze seznamu, ale dveře by mu zůstaly otevřené' },

  { nazev: 'autor zakázky se přepíše každým uložením', soubor: 'functions/zakazky.mjs',
    hledej: '  } else if (!zak.autor) zak.autor = relace.email;',
    nahrad: '  } else zak.autor = relace.email;',
    proc: 'autorem by se stal ten, kdo si zakázku naposledy otevřel — razítko by ztratilo smysl' },

  { nazev: 'zakázky jde převést i na archivovaný účet', soubor: 'functions/uzivatele.mjs',
    hledej: '      if (cil.aktivni === false || cil.archiv)',
    nahrad: '      if (false)',
    proc: 'práce po odcházejícím kolegovi by se ztratila podruhé — u dalšího neexistujícího účtu' },

  /* ---------- mazání účtů (11. 8. 2026) ----------
   *
   * Mazání je jediná nevratná akce nad účtem, takže se rozbíjí přesně to,
   * co by v praxi nikdo nepoznal dřív než pozdě: účet, který „zmizel", ale
   * dveře mu zůstaly otevřené; pojistka na hlavním účtu; a odmítnutí, které
   * účet chrání, dokud po něm nepřevezme práci někdo jiný. */
  { nazev: 'smazaný účet se pořád přihlásí', soubor: 'functions/uzivatele.mjs',
    hledej: '      await u.zapis(email, null);          // náhrobek: klíč zůstane, účet ne',
    nahrad: '      ;',
    proc: 'účet by zmizel ze seznamu, ale přihlásil by se i dál — mazání by bylo jen naoko' },

  { nazev: 'hlavní účet jde smazat', soubor: 'functions/uzivatele.mjs',
    hledej: '      if (email === ADMIN_EMAIL)\n',
    nahrad: '      if (false)\n',
    proc: 'jedním kliknutím by zmizel účet, kterým se aplikace spravuje — a zpátky ho nikdo nevrátí' },

  { nazev: 'účet se zakázkami se smaže bez převodu', soubor: 'functions/uzivatele.mjs',
    hledej: '      if (moje.length && !iSeZakazkami)',
    nahrad: '      if (false)',
    proc: 'zakázky by zůstaly podepsané e-mailem, který už neexistuje, a nikdo by nevěděl, čí jsou' },

  { nazev: 'podpis smazaného účtu zůstane na serveru', soubor: 'functions/uzivatele.mjs',
    hledej: '      try { await (await uloziste(PODPIS_ULOZISTE)).zapis(email, null); }',
    nahrad: '      try { if (false) await (await uloziste(PODPIS_ULOZISTE)).zapis(email, null); }',
    proc: 'na serveru by ležel sken podpisu člověka, který v aplikaci není — a zdědil by ho ten, kdo dostane stejný e-mail' },

  /* ---------- centrální šablony dokumentů (#139) ---------- */
  { nazev: 'šablony může zveřejnit kdokoli přihlášený', soubor: 'functions/sablony.mjs',
    hledej: "  const { chyba, relace } = await vyzadujRoli(req, 'Administrátor');",
    nahrad: "  const { chyba, relace } = await vyzadujRoli(req);",
    proc: 'obchodník by si vyměnil šablonu celé firmy — centrální řízení by nic neřídilo' },

  { nazev: 'šablony si přečte i nepřihlášený', soubor: 'functions/sablony.mjs',
    hledej: "    const { chyba } = await vyzadujRoli(req);          // stačí být přihlášen",
    nahrad: "    const { chyba } = { chyba: null };",
    proc: 'kdokoli zvenčí by si stáhl firemní šablonu nabídky i se zněním podmínek' },

  { nazev: 'zveřejnění šablony přijme i ne-Word', soubor: 'functions/sablony.mjs',
    hledej: "    if (!g.sablonaJeDocxB64(data))",
    nahrad: "    if (false)",
    proc: 'omylem nahrané PDF by spadlo až obchodníkovi při tisku nabídky' },

  { nazev: 'záloha přestane vozit šablony', soubor: 'functions/zaloha.mjs',
    hledej: "  const sab = await uloziste('sablony');",
    nahrad: "  const sab = { async seznam() { return []; }, async cti() { return null; } };",
    proc: 'po obnově ze zálohy by v přísném režimu nešla vytisknout jediná nabídka' },

  /* ---------- sdílený rejstřík žádostí o slevu (#102) ---------- */
  { nazev: 'rejstřík žádostí je veřejný', soubor: 'functions/schvalovani.mjs',
    hledej: '  const { chyba } = await vyzadujRoli(req);      // stačí být přihlášen',
    nahrad: '  const { chyba } = { chyba: null };',
    proc: 'kdokoli zvenčí by si vytáhl seznam zakázek i s procenty slev' },

  { nazev: 'rejstřík vydá i částky ze zakázky', soubor: 'functions/schvalovani.mjs',
    hledej: '  return {\n      klic,\n      cast,',
    nahrad: '  return {\n      cenaPoSleve: (v.data && v.data.sleva && v.data.sleva.cenaPoSleve) || null,\n      klic,\n      cast,',
    proc: 'přehled napříč zakázkami by obešel matici zobrazení — cenu by uviděl i ten, komu ji správce nedal' },

  /* ---------- hlavní účet pozná server, ne prohlížeč (#95) ---------- */
  { nazev: 'seznam účtů neřekne, který je hlavní', soubor: 'functions/uzivatele.mjs',
    hledej: 'aktivni: x.aktivni !== false, hlavni: x.email === ADMIN_EMAIL,',
    nahrad: 'aktivni: x.aktivni !== false,',
    proc: 'prohlížeč by musel adresu znát sám — a měl by ji ve zdrojácích podruhé' },

  { nazev: 'zaváděcí heslo administrátora se nekontroluje', soubor: 'functions/prihlaseni.mjs',
    hledej: '      && heslo === process.env.ADMIN_INIT_HESLO) {',
    nahrad: '      ) {',
    proc: 'první administrátorský účet by si založil kdokoli s jakýmkoli heslem' },

  { nazev: 'cookie relace není HttpOnly', soubor: 'lib/sdilene.mjs',
    hledej: "    + '; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=43200';",
    nahrad: "    + '; Secure; SameSite=Lax; Path=/; Max-Age=43200';",
    proc: 'cizí skript na stránce by relaci přečetl a odnesl' },

  { nazev: 'cookie relace není Secure', soubor: 'lib/sdilene.mjs',
    hledej: "    + '; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=43200';",
    nahrad: "    + '; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200';",
    proc: 'relace by šla i po nešifrovaném spojení, kde ji lze odposlechnout' },

  { nazev: 'cookie relace nemá SameSite', soubor: 'lib/sdilene.mjs',
    hledej: "    + '; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=43200';",
    nahrad: "    + '; HttpOnly; Secure; Path=/; Max-Age=43200';",
    proc: 'cizí stránka by uměla poslat požadavek za přihlášeného uživatele' },

  { nazev: 'cookie relace nemá omezenou platnost', soubor: 'lib/sdilene.mjs',
    hledej: "    + '; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=43200';",
    nahrad: "    + '; HttpOnly; Secure; SameSite=Lax; Path=/';",
    proc: 'cookie by v prohlížeči zůstala napořád' },

  { nazev: 'relace věří roli poslané v těle přihlášení', soubor: 'functions/prihlaseni.mjs',
    hledej: '    const cookie = relaceCookie(ucet);',
    nahrad: '    const cookie = relaceCookie({ ...ucet, role: (await req.clone().json().catch(() => ({}))).role || ucet.role });',
    proc: 'kdo si přidá do přihlášení „role: Administrátor", tím se stane' },

  /* ---------- bezpečnostní audit 22. 8. 2026, 2. dávka (B4, B6, B7, B8, B9) ---------- */
  { nazev: 'B6: verze hesla se v relaci nekontroluje', soubor: 'lib/sdilene.mjs',
    hledej: "  if (((+r.hv) || 0) !== hesloVerzeUctu(ucet))",
    nahrad: "  if (false)",
    proc: 'ukradená cookie by fungovala i po změně hesla až do vypršení' },

  { nazev: 'B6: změna vlastního hesla verzi nezvedne', soubor: 'functions/uzivatele.mjs',
    hledej: "      ucet.hesloVerze = hesloVerzeUctu(ucet) + 1;\n      ucet.hesloZmeneno",
    nahrad: "      ucet.hesloVerze = hesloVerzeUctu(ucet);\n      ucet.hesloZmeneno",
    proc: 'po změně hesla by staré relace žily dál' },

  { nazev: 'B6: reset hesla správcem verzi nezvedne', soubor: 'functions/uzivatele.mjs',
    hledej: "      ucet.hesloVerze = hesloVerzeUctu(ucet) + 1;                       // B6",
    nahrad: "      ucet.hesloVerze = hesloVerzeUctu(ucet);                           // B6",
    proc: 'odcházející kolega s otevřeným prohlížečem by pracoval dál i po resetu' },

  { nazev: 'B7: heslo hlavního účtu resetuje i vedlejší správce', soubor: 'functions/uzivatele.mjs',
    hledej: "      if (email === ADMIN_EMAIL && relace.email !== ADMIN_EMAIL)",
    nahrad: "      if (false)",
    proc: 'vedlejší správce by si resetem vzal účet, který nejde vypnout ani degradovat' },

  { nazev: 'B4: pokus se počítá až po ověření', soubor: 'functions/prihlaseni.mjs',
    hledej: "  const pokusy = await pokusyZacatek(email, ip);",
    nahrad: "  const pokusy = { email: { n: 0 }, adresa: { n: 0 } }; await pokusyZacatek(email, ip);",
    proc: 'souběžné pokusy by brzdu obešly a 429 by nikdy nepřišlo' },

  { nazev: 'B4: limit na adresu se ignoruje', soubor: 'functions/prihlaseni.mjs',
    hledej: "  if (pokusy.email.n > POKUSY_MAX || pokusy.adresa.n > POKUSY_IP_MAX)",
    nahrad: "  if (pokusy.email.n > POKUSY_MAX)",
    proc: 'jedno heslo na sto e-mailů by na počítadle nikdy nenarostlo' },

  /* Kotva upravena 31. 8. 2026: očištěná dávka se drží v proměnné, protože
   * se z ní kromě slití plní i rozpad po uživatelích (#180). */
  { nazev: 'B8: rozpad po uživatelích se bere z dávky klienta', soubor: 'functions/analytika.mjs',
    hledej: "      const cista = g.analytikaDavkaOcisti(t.den);",
    nahrad: "      const cista = t.den || {};",
    proc: 'obchodník by kolegovi připsal stovky chyb nebo mínus zakázek' },

  { nazev: 'atribuce záložek a prvků se bere od klienta', soubor: 'functions/analytika.mjs',
    hledej: "      g.analytikaPrictiUzivateli(novy, relace && relace.email, cista.pocty, cista);",
    nahrad: "      g.analytikaPrictiUzivateli(novy, (t.den || {}).kdo, cista.pocty, cista);",
    proc: 'kdo si upraví klienta, připsal by svoje klikání kolegovi' },

  { nazev: 'B8: záporná a nečíselná hodnota projde', soubor: '../src/analytika.js',
    hledej: "  if (!isFinite(x) || x <= 0) return 0;",
    nahrad: "  if (!isFinite(x)) return +n || 0;",
    proc: 'záporné číslo by ubíralo, řetězec by otrávil součet' },

  { nazev: 'B8: klíč času zakázky se bere, jak přijde', soubor: 'functions/analytika.mjs',
    hledej: "        if (!/^[\\w\\-. ]{1,60}$/.test(cislo)) continue;",
    nahrad: "        if (false) continue;",
    proc: 'kdokoli přihlášený by zakládal klíče cas/ do nekonečna' },

  { nazev: 'B9: záloha ke stažení bez zákazníků, podpisů a zobrazení', soubor: 'functions/zaloha.mjs',
    hledej: "    ...(await zalohaDoplnky()) } });",
    nahrad: "    } });",
    proc: 'po obnově by zmizela kartotéka zákazníků, podpisy i práva zobrazení' },

  { nazev: 'B13: autor nové zakázky se bere od klienta', soubor: 'functions/zakazky.mjs',
    hledej: "    if (!zak.autor || zak.autor === relace.email || relace.role !== 'Administrátor')",
    nahrad: "    if (!zak.autor)",
    proc: 'obchodník by založil zakázku „za" vedoucího' },

  { nazev: 'B13: razítko zámku se bere od klienta', soubor: 'functions/zakazky.mjs',
    hledej: "    v.zamek.kdo = relace.jmeno ? relace.jmeno + ' <' + relace.email + '>' : relace.email;",
    nahrad: "    v.zamek.kdo = v.zamek.kdo || relace.email;",
    proc: 'pod odeslanou nabídkou by stálo cizí jméno' },

  /* ---------- 3. dávka (B10, B14, B15, B16, B17, B19) ---------- */
  { nazev: 'B10: razítko verze se nekontroluje', soubor: 'functions/zakazky.mjs',
    hledej: "  if (stara && typeof t.ocekavaneRazitko === 'string' && t.prepsat !== true) {",
    nahrad: "  if (false) {",
    proc: 'dva obchodníci by si tiše přepisovali práci; stejné číslo by přepsalo cizí zakázku' },

  { nazev: 'B14: velikost zakázky bez stropu', soubor: 'functions/zakazky.mjs',
    hledej: "  if (JSON.stringify(t).length > ZAKAZKA_MAX_B)",
    nahrad: "  if (false)",
    proc: 'jedna příloha z mobilu by zaplnila úložiště' },

  { nazev: 'B15: správce si může vypnout vlastní účet', soubor: 'functions/uzivatele.mjs',
    hledej: "      if (email === relace.email && t.aktivni === false)",
    nahrad: "      if (false)",
    proc: 'omyl správce = okamžitá ztráta přístupu bez cesty zpět' },

  { nazev: 'B15: archivovaný účet jde zapnout', soubor: 'functions/uzivatele.mjs',
    hledej: "      if (t.aktivni && ucet.archiv)",
    nahrad: "      if (false)",
    proc: 'archiv slibuje, že se účet nikdy nepřihlásí — a šlo by to obejít jedním zapnutím' },

  { nazev: 'B16: tvar e-mailu se nekontroluje', soubor: 'functions/uzivatele.mjs',
    hledej: "    if (t.akce === 'zaloz' && !emailPlatny(email))",
    nahrad: "    if (false)",
    proc: 'klíč záznamu účtu by mohl být cokoli' },

  { nazev: 'B16: délky při přihlášení bez stropu', soubor: 'functions/prihlaseni.mjs',
    hledej: "  if (email.length > EMAIL_MAX || heslo.length > HESLO_MAX)",
    nahrad: "  if (false)",
    proc: 'obří e-mail by zakládal obří klíče v počítadle, obří heslo by mlel scrypt' },

  { nazev: 'B17: cizí Origin se nekontroluje', soubor: 'lib/sdilene.mjs',
    hledej: "  if (req.method && req.method !== 'GET' && cizihoPuvodu(req)) return null;",
    nahrad: "  if (false) return null;",
    proc: 'druhá vrstva proti CSRF by zmizela; stačilo by jednou povolit SameSite' },

  { nazev: 'B17: odhlášení i na GET', soubor: 'functions/odhlaseni.mjs',
    hledej: "  if (req.method !== 'POST') return json({ ok: false, chyba: 'Použijte POST.' }, 405);",
    nahrad: "",
    proc: 'odkaz z cizí stránky by uživatele odhlásil' },

  { nazev: 'účet jde založit s vymyšlenou rolí', soubor: 'functions/uzivatele.mjs',
    hledej: "      if (!ROLE.includes(t.role)) return json({ ok: false, chyba: 'Neznámá role.' }, 400);\n      if (!hesloPlatne(t.heslo))",
    nahrad: "      if (!hesloPlatne(t.heslo))",
    proc: 'účet s rolí mimo matici práv se nikam nedostane a nejde opravit jinak než ručně v úložišti' },

  /* ---------- zahraniční ceník (#181, 31. 8. 2026) ---------- */
  { nazev: 'zahraniční ceník zveřejní kdokoli přihlášený', soubor: 'functions/program.mjs',
    hledej: "  const { chyba, relace } = await vyzadujRoli(req, 'Administrátor');",
    nahrad: "  const { chyba, relace } = await vyzadujRoli(req);",
    proc: 'ceny, ze kterých žijí všechny nabídky, by mohl přepsat kdokoli přihlášený' },

  { nazev: 'zahraniční odchylky se berou, jak přijdou', soubor: '../src/program.js',
    hledej: "      ? cenikZahrOciste(ctx.zahranicni)",
    nahrad: "      ? (ctx.zahranicni || { ceny: {}, jenZahr: {} })",
    proc: 'cizí klíč ze souboru databáze by se dostal až do výpočtu ceny' },

  /* ---------- pojistky zveřejnění (P1, nálezy N1/N20, 21. 9. 2026) ----------
   * Takhle vznikl vadný platný ceník verze 27: zahraniční ceny se zveřejnily
   * jako tuzemské. Kontrola je v aplikaci i na serveru — dialog jde obejít,
   * server ne. Mutace hlídají, že serverová půlka opravdu drží. */
  { nazev: 'zveřejnění se nekontroluje proti zahraniční řadě', soubor: 'functions/program.mjs',
    hledej: "  const posudek = globalThis.cenikZverejneniKontrola(ctx, zahrProKontrolu, t.rada, platny);",
    nahrad: "  const posudek = { ok: true, kod: '', shody: [] };",
    proc: 'zahraniční ceny by se daly zveřejnit jako tuzemské — přesně tak vznikla vadná verze 27' },

  { nazev: 'varianta přepnutá na Zahraničí projde zveřejněním', soubor: '../src/cenik_rady.js',
    hledej: "  if (r === 'zahr')",
    nahrad: "  if (false)",
    proc: 'hlavní zábrana P1 by zmizela a zahraniční ceník by se propsal do tuzemských nabídek' },

  { nazev: 'shoda ČR se zahraniční odchylkou se nehlídá', soubor: '../src/cenik_rady.js',
    hledej: "  if (shody.length > CENIK_ZVEREJNENI_SHODA_MAX)",
    nahrad: "  if (false)",
    proc: 'druhá pojistka by nechytila podklad, ze kterého někdo odstranil značku řady' },

  { nazev: 'klíče řady se zapíšou do platného ceníku', soubor: '../src/program.js',
    hledej: "      ? cenikZverejneniOcisti(progKopie(ctx.cenik)) : progKopie(ctx.cenik)) || {},",
    nahrad: "      ? progKopie(ctx.cenik) : progKopie(ctx.cenik)) || {},",
    proc: 'zveřejněná verze by nesla rada/jenZahr a tvářila se jako zahraniční pro všechny' },

  /* Zmrazený výsledek odeslané nabídky (B53, audit 22. 9. 2026).
   * Dokumenty berou částky z `zamek.vysledek`. Kdyby vypadl z otisku zámku,
   * daly by se přepsat částky už odeslané nabídky — a bez stopy, protože
   * `tisky[]` ani `odemceni[]` nepřibudou. */
  { nazev: 'zmrazený výsledek se bere, jak přijde', soubor: '../src/uloziste.js',
    hledej: "                          vysledek: z.vysledek || null });",
    nahrad: "                          vysledek: null });",
    proc: 'šlo by přepsat částky už odeslané („neměnné") nabídky beze stopy' },

  /* Dodatkové texty položek pro celou aplikaci (22. 9. 2026, zadání J. V.). */

  { nazev: 'dodatkový text pro celou aplikaci smí uložit kdokoli',
    soubor: 'functions/popisy.mjs',
    hledej: "  const { chyba, relace } = await vyzadujRoli(req, 'Administrátor');",
    nahrad: "  const { chyba, relace } = await vyzadujRoli(req);",
    proc: 'obchodník by přepsal text, který se předvyplňuje do nabídek všech ostatních' },

  { nazev: 'dodatkové texty se ukládají, jak přijdou',
    soubor: 'functions/popisy.mjs',
    hledej: "  const texty = globalThis.popisyOciste(t && t.texty);",
    nahrad: "  const texty = (t && t.texty) || {};",
    proc: 'do ceníku každé nové zakázky by se vlil slovník libovolné velikosti' },

  /* Pojistky serverové vrstvy z auditu 22. 9. 2026 (B54–B56). */

  { nazev: 'server bez ADMIN_EMAIL obsluhuje chráněné cesty dál', soubor: 'lib/sdilene.mjs',
    hledej: "  if (ADMIN_EMAIL && String(process.env.ADMIN_EMAIL || '').trim() !== '') return null;",
    nahrad: "  if (true) return null;",
    proc: 'chybějící proměnná by zase tiše vypnula ochrany hlavního účtu (B54)' },

  { nazev: 'pojistka zveřejnění se ptá jen na odchylky z požadavku',
    soubor: 'functions/program.mjs',
    hledej: "  const posudek = globalThis.cenikZverejneniKontrola(ctx, zahrProKontrolu, t.rada, platny);",
    nahrad: "  const posudek = globalThis.cenikZverejneniKontrola(ctx, ctx.zahranicni, t.rada, platny);",
    proc: 'kdo pole `zahranicni` vynechá, dostal by zahraniční ceny do tuzemského ceníku (B55)' },

  { nazev: 'změna čísla odeslané nabídky se na serveru nehlídá',
    soubor: 'functions/zakazky.mjs',
    hledej: "  if (jineCislo.length) {",
    nahrad: "  if (false) {",
    proc: 'odeslaná nabídka by dostala jiné číslo, než jaké má zákazník na papíře (B56)' },

  /* ČR sloupec položky „jen zahraniční" (#290, druhé kolo revize).
   * Oprava sedí za `typeof` strážemi, takže se dá vypnout i omylem — třeba
   * změnou pořadí načítání v jadro_moduly.cjs. Tahle mutace ověřuje, že by
   * to serverové sady poznaly. */
  { nazev: 'ČR sloupec položky „jen zahraniční" se přepíše nulou', soubor: '../src/program.js',
    hledej: "  const predchozi = ctx.predchozi && ctx.predchozi.cenik ? ctx.predchozi.cenik : null;",
    nahrad: "  const predchozi = null;",
    proc: 'zveřejnění z tuzemské varianty by umazalo cenu, ze které dědí zahraniční řada' },

  /* ---------- značky ukázkového ceníku (P2, nálezy N2/N3) ----------
   * Vypnuly tisk nabídky na ostrých zakázkách 0383 a 377. */
  { nazev: 'server ukládá značky ukázkového ceníku', soubor: 'functions/zakazky.mjs',
    hledej: "  ocistiZnacky(zak);",
    nahrad: "  void 0;",
    proc: 'značka „ukázkový ceník" by se uložila k zakázce a u uzamčené varianty vypnula tisk nabídky' },

  /* ---------- 4. dávka, 23. 8. 2026 (L27, L28, L29, L31) ----------
   *
   * PŘEČÍSLOVÁNO 14. 9. 2026 (nález B55). Tahle sada nesla čísla B27–B31
   * z pořadníku 4. dávky, jenže bezpečnostní audit z 9. 9. 2026 vydal
   * VLASTNÍ nálezy B26–B31 o úplně jiných věcech (viz oddíl níž). Dvě různé
   * věci pod týmž jménem znamenají, že se v protokolu nedá poznat, která
   * z nich se zrovna opravovala. Starší sada dostala předponu L (jako
   * „loňská", tedy srpnová) — čísla auditu zůstala, protože na ně odkazuje
   * protokol i roadmapa. */
  { nazev: 'L27: neplatný stav Pipedrive se nekontroluje', soubor: 'functions/pd_dealy.mjs',
    hledej: "  if (['open', 'won', 'lost', 'vse'].indexOf(stav) < 0)",
    nahrad: "  if (false)",
    proc: '?stav=x1,x2… by obešlo cache a vyčerpalo denní rozpočet Pipedrive' },

  { nazev: 'L28: profil/podpis hlavního účtu smí měnit i vedlejší admin', soubor: 'functions/uzivatele.mjs',
    hledej: "      if (cil === ADMIN_EMAIL && relace.email !== ADMIN_EMAIL)",
    nahrad: "      if (false)",
    proc: 'vedlejší správce by nahrál cizí podpis pod nabídky hlavního administrátora' },

  { nazev: 'L29: autor nové karty zákazníka se bere od klienta', soubor: 'functions/zakaznici.mjs',
    hledej: "  else z.autor = relace.email;   // nová karta",
    nahrad: "  else z.autor = z.autor || relace.email;   // nová karta",
    proc: 'obchodník by založil kartu „za" kolegu' },

  { nazev: 'L31: správce si smí archivovat vlastní účet', soubor: 'functions/uzivatele.mjs',
    hledej: "      if (email === relace.email && t.archiv)",
    nahrad: "      if (false)",
    proc: 'archiv vypne účet — správce by se sám zamkl' },

  { nazev: 'B9: noční otisk bez zákazníků, podpisů a zobrazení', soubor: 'lib/zalohovani.mjs',
    hledej: "    ...(await zalohaDoplnky()),",
    nahrad: "",
    proc: 'totéž pro automatickou zálohu' },

  /* ---------- správa účtů (functions/uzivatele.mjs) ---------- */
  { nazev: 'správu účtů zvládne kdokoli (POST)', soubor: 'functions/uzivatele.mjs',
    hledej: '    if (relace.role !== \'Administrátor\')\n      return json({ ok: false, chyba: \'K této akci je potřeba role: Administrátor.\' }, 403);',
    nahrad: '    if (false) return json({ ok: false }, 403);',
    proc: 'obchodník by si sám povýšil roli nebo přepsal cizí heslo' },

  { nazev: 'seznam kolegů vidí kdokoli (GET)', soubor: 'functions/uzivatele.mjs',
    hledej: '  if (relace.role !== \'Administrátor\')\n    return json({ ok: false, chyba: \'K této akci je potřeba role: Administrátor.\' }, 403);\n  /* Seznam u každého účtu hlásí `hlavni` — bez ADMIN_EMAIL by u všech stálo\n   * `false` a obrazovka správy by tvrdila, že hlavní účet není žádný (B54). */\n  { const stop = bezHlavnihoUctu(); if (stop) return stop; }\n  const klice = await u.seznam();',
    nahrad: '  const klice = await u.seznam();',
    proc: 'kdokoli by si vytáhl seznam zaměstnanců i s rolemi' },

  { nazev: 'seznam účtů vydá i otisky hesel', soubor: 'functions/uzivatele.mjs',
    hledej: '    if (x && !x.smazano) out.push({ email: x.email, jmeno: x.jmeno, titul: x.titul || \'\',',
    nahrad: '    if (x) out.push(x); if (false) out.push({ email: x.email, jmeno: x.jmeno, titul: x.titul || \'\',',
    proc: 'otisky hesel by se daly lámat mimo server' },

  { nazev: 'vlastní heslo jde změnit bez znalosti starého', soubor: 'functions/uzivatele.mjs',
    hledej: '      if (!hesloSedi(String(t.stare || \'\'), ucet.heslo))',
    nahrad: '      if (false)',
    proc: 'kdo sedne k odemčenému počítači, ukradne účet natrvalo' },

  { nazev: 'heslo smí být kratší než osm znaků', soubor: 'functions/uzivatele.mjs',
    hledej: '      if (!hesloPlatne(t.nove))',
    nahrad: '      if (!t.nove)',
    proc: 'jednoznakové heslo se uhodne hned' },

  { nazev: 'hlavní administrátor jde vypnout', soubor: 'functions/uzivatele.mjs',
    hledej: '      if (email === ADMIN_EMAIL && t.aktivni === false)',
    nahrad: '      if (false)',
    proc: 'firma by si zamkla dveře od vlastní databáze' },

  { nazev: 'hlavnímu administrátorovi jde snížit role', soubor: 'functions/uzivatele.mjs',
    hledej: '      if (email === ADMIN_EMAIL && t.role !== \'Administrátor\')',
    nahrad: '      if (false)',
    proc: 'totéž jinou cestou — nikdo by už nemohl spravovat účty' },

  { nazev: 'zakládá se účet s neznámou rolí', soubor: 'functions/uzivatele.mjs',
    hledej: "      if (!ROLE.includes(t.role)) return json({ ok: false, chyba: 'Neznámá role.' }, 400);\n      if (!hesloPlatne(t.heslo))",
    nahrad: "      if (!hesloPlatne(t.heslo))",
    proc: 'účet s vymyšlenou rolí by se choval nepředvídatelně' },

  /* ---------- ceník a firma ---------- */
  { nazev: 'ceník zveřejní kdokoli', soubor: 'functions/program.mjs',
    hledej: 'const { chyba, relace } = await vyzadujRoli(req, \'Administrátor\');',
    nahrad: 'const { chyba, relace } = await vyzadujRoli(req);',
    proc: 'obchodník by si zvedl ceny nebo je omylem přepsal všem' },

  { nazev: 'ceník přečte i nepřihlášený', soubor: 'functions/program.mjs',
    hledej: '    const { chyba } = await vyzadujRoli(req);          // stačí být přihlášen\n    if (chyba) return chyba;',
    nahrad: '',
    proc: 'naše nákladové ceny by si stáhl kdokoli z internetu' },

  { nazev: 'firemní údaje zveřejní kdokoli', soubor: 'functions/firma.mjs',
    hledej: '  const { chyba, relace } = await vyzadujRoli(req, \'Administrátor\');',
    nahrad: '  const { chyba, relace } = await vyzadujRoli(req);',
    proc: 'kdokoli by přepsal hlavičku všech odesílaných nabídek' },

  { nazev: 'ukázková firma projde jako skutečná', soubor: 'functions/firma.mjs',
    hledej: '  const lze = fm.firmaLzeZverejnit(t.udaje || null);\n  if (!lze.ok) return json({ ok: false, chyba: lze.duvod }, 400);\n  const udaje = fm.firmaKZverejneni(t.udaje);',
    nahrad: '  const udaje = fm.firmaKZverejneni(t.udaje);\n  const lze = fm.firmaLzeZverejnit(udaje);\n  if (!lze.ok) return json({ ok: false, chyba: lze.duvod }, 400);',
    proc: 'nabídka by odešla s vymyšlenou adresou v hlavičce' },

  /* ---------- zakázky ---------- */
  { nazev: 'zakázky čte i nepřihlášený', soubor: 'functions/zakazky.mjs',
    hledej: '  const { chyba, relace } = await vyzadujRoli(req);\n  if (chyba) return chyba;',
    nahrad: '  const relace = { email: \'\' };',
    proc: 'obsah zakázek zákazníků by byl veřejný' },

  /* Kotva rozšířena 21. 8. 2026: řádek `s.cti('z/' + soubor)` je od zavedení
   * mazání v souboru dvakrát (GET i DELETE) a mutace se přestala hledat
   * jednoznačně — hlásilo se CHYBNĚ ZADANÁ. */
  { nazev: 'jméno souboru se bere, jak přijde', soubor: 'functions/zakazky.mjs',
    hledej: '    const zak = await s.cti(\'z/\' + soubor);\n    return zak ? json({ ok: true, zakazka: zak })',
    nahrad: '    const zak = await s.cti(soubor);\n    return zak ? json({ ok: true, zakazka: zak })',
    proc: 'požadavkem na „_rejstrik" nebo cestou ven by šlo číst cizí záznamy' },

  /* Mazání zakázek (21. 8. 2026). */
  { nazev: 'zakázku smaže kdokoli přihlášený', soubor: 'functions/zakazky.mjs',
    hledej: "    if (relace.role !== 'Administrátor')\n      return json({ ok: false, chyba: 'Mazat zakázky smí jen administrátor.' }, 403);",
    nahrad: '    if (false) return null;',
    proc: 'obchodník by smazal zakázky kolegů — i s historií cen a variant' },

  { nazev: 'odeslaná nabídka se smaže bez potvrzení', soubor: 'functions/zakazky.mjs',
    hledej: "      if (zamcenych && url.searchParams.get('ismazatOdeslane') !== '1')",
    nahrad: '      if (false)',
    proc: 'doklad o tom, co odešlo zákazníkovi, by zmizel jedním přehlédnutým kliknutím' },

  { nazev: 'uzamčenou nabídku lze přepsat', soubor: 'functions/zakazky.mjs',
    hledej: '    const k = ULO.uloKontrolaZamku(stara, zak);\n    if (!k.ok)',
    nahrad: '    const k = ULO.uloKontrolaZamku(stara, zak);\n    if (false)',
    proc: 'odeslaná nabídka by se dala tiše změnit — a zákazník má jinou verzi' },

  { nazev: 'data uzamčené varianty lze změnit', soubor: 'functions/zakazky.mjs',
    hledej: '      if (nv && JSON.stringify(nv.data) !== JSON.stringify(sv.data))',
    nahrad: '      if (false)',
    proc: 'zámek by zůstal, ale ceny pod ním by se změnily' },

  /* ---------- bezpečnostní audit 22. 8. 2026 (B1, B2, B3, B22) ---------- */
  { nazev: 'B22: podpis relace se porovnává obyčejně', soubor: 'lib/sdilene.mjs',
    hledej: '  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;',
    nahrad: '  if (a.toString() !== b.toString()) return null;',
    proc: 'z doby odpovědi by šlo podpis relace hádat po znacích' },

  { nazev: 'B1: id ze zakázky se berou, jak přijdou', soubor: 'functions/zakazky.mjs',
    hledej: '  const spatnaId = ULO.uloIdProblemy(zak);\n  if (spatnaId.length)',
    nahrad: '  const spatnaId = ULO.uloIdProblemy(zak);\n  if (false)',
    proc: 'do id varianty by šel schovat skript, který se spustí tomu, kdo zakázku otevře' },

  { nazev: 'B1: tvar id propustí apostrof', soubor: '../src/uloziste.js',
    hledej: "const ULO_ID_TVAR = /^[A-Za-z0-9._-]{1,80}$/;",
    nahrad: "const ULO_ID_TVAR = /^[A-Za-z0-9._'()-]{1,80}$/;",
    proc: 'apostrof a závorky stačí k ukončení řetězce v onclick' },

  { nazev: 'B3: odemknout přes odemceni[] smí kdokoli', soubor: 'functions/zakazky.mjs',
    hledej: "      if (relace.role !== 'Administrátor')\n        return json({ ok: false, chyba: 'Odemknout odeslanou",
    nahrad: "      if (false)\n        return json({ ok: false, chyba: 'Odemknout odeslanou",
    proc: 'obchodník by dvěma zápisy přepsal odeslanou nabídku' },

  { nazev: 'B3: razítko „kdo odemkl" se bere od klienta', soubor: 'functions/zakazky.mjs',
    hledej: "          posledni.kdo = relace.jmeno ? relace.jmeno + ' <' + relace.email + '>' : relace.email;",
    nahrad: "          posledni.kdo = posledni.kdo || relace.email;",
    proc: 'záznam o odemčení by tvrdil, že to udělal někdo jiný' },

  { nazev: 'B2: rozhodnutí o slevě se nekontroluje', soubor: 'functions/zakazky.mjs',
    hledej: "  if (!rozhodnuti.ok) return json({ ok: false, chyba: 'Neuloženo: ' + rozhodnuti.chyba }, 403);",
    nahrad: "  if (false) return json({ ok: false, chyba: 'Neuloženo: ' + rozhodnuti.chyba }, 403);",
    proc: 'obchodník by si slevu schválil sám a do nabídky by odešla' },

  { nazev: 'B2: strop role se při rozhodnutí ignoruje', soubor: '../src/schvalovani.js',
    hledej: "        if (!schvalovaniSmiRozhodnout(role, p, nast))\n          return { ok: false, chyba: 'Slevu '",
    nahrad: "        if (false)\n          return { ok: false, chyba: 'Slevu '",
    proc: 'vedoucí (nebo kdokoli) by schválil slevu nad svůj strop' },

  { nazev: 'B2: „schváleno automaticky" se věří klientovi', soubor: '../src/schvalovani.js',
    hledej: "      if (sl.stav === SCHV_AUTO && p > 0 && !autoBezeZmeny && !schvalovaniSmiRozhodnout(role, p, nast))",
    nahrad: "      if (false)",
    proc: 'obchodník by poslal slevu 40 % jako automaticky schválenou' },

  { nazev: 'B2: jméno schvalovatele se bere od klienta', soubor: '../src/schvalovani.js',
    hledej: "          sl.schvalil = jmeno; sl.schvalilEmail = relace.email || '';",
    nahrad: "          sl.schvalilEmail = relace.email || '';",
    proc: 'v zakázce by stálo cizí jméno pod rozhodnutím' },

  /* ---------- zálohy ---------- */
  { nazev: 'zálohu stáhne kdokoli', soubor: 'functions/zaloha.mjs',
    hledej: '  const { chyba } = await vyzadujRoli(req, \'Administrátor\');',
    nahrad: '  const { chyba } = await vyzadujRoli(req);',
    proc: 'celá databáze firmy jedním požadavkem' },

  { nazev: 'záloha veze i otisky hesel', soubor: 'functions/zaloha.mjs',
    hledej: '    if (x) uzivatele.push({ email: x.email, jmeno: x.jmeno, role: x.role, aktivni: x.aktivni !== false });',
    nahrad: '    if (x) uzivatele.push(x);',
    proc: 'soubor zálohy na Disku by nesl hesla všech kolegů' },

  { nazev: 'vynucenou zálohu spustí kdokoli', soubor: 'functions/zaloha_vynuceno.mjs',
    hledej: '  const { chyba, relace } = await vyzadujRoli(req, \'Administrátor\');',
    nahrad: '  const { chyba, relace } = await vyzadujRoli(req);',
    proc: 'kdokoli by nám mohl zaplnit úložiště otisky' },

  /* ---------- ostatní cesty ---------- */
  { nazev: 'výpočet běží bez přihlášení', soubor: 'functions/vypocet.mjs',
    hledej: '  const { chyba } = await vyzadujRoli(req);\n  if (chyba) return chyba;',
    nahrad: '',
    proc: 'cizí strojový čas na náš účet a pohled do vnitřku výpočtu' },

  { nazev: '/api/ja nekontroluje stav účtu', soubor: 'functions/ja.mjs',
    hledej: '  const { chyba, relace, ucet } = await vyzadujRoli(req);\n  if (chyba) return chyba;',
    nahrad: '  const relace = await (await import(\'../lib/sdilene.mjs\')).prihlaseny(req);\n  if (!relace) return json({ ok: false, chyba: \'Nepřihlášen.\' }, 401);\n  const ucet = { email: relace.email };',
    proc: 'vypnutý účet by po obnovení stránky pořád vypadal jako přihlášený' },

  { nazev: '/api/zdravi prozradí prostředí serveru', soubor: 'functions/zdravi.mjs',
    hledej: 'cas: new Date().toISOString(), beh: \'netlify\' });',
    nahrad: 'cas: new Date().toISOString(), beh: \'netlify\', prostredi: process.env });',
    proc: 'veřejná cesta by vydala tajemství relace i zaváděcí heslo' },

  { nazev: 'noční záloha dostane veřejnou cestu', soubor: 'functions/zaloha_nocni.mjs',
    hledej: 'export const config = {',
    nahrad: 'export const config = { path: \'/api/zaloha_nocni\',',
    proc: 'plánovanou zálohu by šlo spouštět z internetu bez přihlášení' },

  /* ---------- bezpečnostní audit 9. 9. 2026 (B26–B31) ---------- */
  { nazev: 'B26: kid trvalé položky v zakázce se bere, jak přijde', soubor: '../src/uloziste.js',
    hledej: "      if (p && p.kid != null && p.kid !== '' && !uloIdBezpecne(p.kid)) out.push({ kde: kde + ' (kid)', id: p.kid });",
    nahrad: '      ;',
    proc: 'obchodník by do zakázky uložil kid s apostrofem; administrátor klikne na ✕ v ceníku a skript běží pod jeho relací' },

  { nazev: 'B26: zveřejnění ceníku nekontroluje kid', soubor: 'functions/program.mjs',
    hledej: '  if (spatneKid.length)',
    nahrad: '  if (false)',
    proc: 'podvržený kid by se zveřejněním ceníku propsal do každé nové nabídky' },

  { nazev: 'B27: účty ze souboru se obnovují', soubor: 'functions/obnova.mjs',
    hledej: "    const uctyZeSouboru = zdrojPopis.typ === 'soubor';",
    nahrad: '    const uctyZeSouboru = false;',
    proc: 'vedlejší správce by si do souboru vložil vlastní otisk hesla pro hlavní účet a převzal ho' },

  { nazev: 'B27: podpisy ze souboru se obnovují', soubor: 'functions/obnova.mjs',
    hledej: "      const podpisyZeSouboru = zdrojPopis.typ === 'soubor';",
    nahrad: '      const podpisyZeSouboru = false;',
    proc: 'z upraveného souboru by se nahrál cizí podpis pod nabídky hlavního administrátora' },

  { nazev: 'B27: hlavní účet z otisku zapíše i vedlejší správce', soubor: 'functions/obnova.mjs',
    hledej: "        if (email === ADMIN_EMAIL && relace.email !== ADMIN_EMAIL) { preskoc(b, email, 'hlavní administrátorský účet obnoví jen on sám'); continue; }",
    nahrad: '        ;',
    proc: 'vedlejší správce by obnovou ze staršího otisku vrátil hlavnímu účtu heslo, které zná' },

  { nazev: 'B27: podpis hlavního účtu z otisku zapíše i vedlejší správce', soubor: 'functions/obnova.mjs',
    hledej: "          if (k === ADMIN_EMAIL && relace.email !== ADMIN_EMAIL) return 'podpis hlavního administrátora mění jen on sám';",
    nahrad: '          ;',
    proc: 'obejití pojistky B28 z uzivatele.mjs cestou obnovy' },

  { nazev: 'B27: role z otisku se nekontroluje proti výčtu', soubor: 'functions/obnova.mjs',
    hledej: "        if (!ROLE.includes(u.role)) { preskoc(b, email, 'role mimo výčet (' + String(u.role) + ') se nezapisuje'); continue; }",
    nahrad: '        ;',
    proc: 'vznikl by účet s rolí, kterou matice práv nezná' },

  { nazev: 'B28: zámek „obnova běží" se nekontroluje', soubor: 'functions/obnova.mjs',
    hledej: '  return z ? obnovaBeziOdpoved(z) : null;',
    nahrad: '  return null;',
    proc: 'druhá obnova by běžela přes rozpracovanou a pořídila otisk „před obnovou" z napůl obnovené databáze' },

  { nazev: 'B28: otisk před obnovou bez času (jeden slot na den)', soubor: 'lib/zalohovani.mjs',
    hledej: "  return d.slice(0, 10) + 'T' + d.slice(11, 19).replace(/:/g, '') + '-pred-obnovou';",
    nahrad: "  return d.slice(0, 10) + '-pred-obnovou';",
    proc: 'opakování po selhané dávce by přepsalo jedinou cestu zpátky' },

  { nazev: 'B29: duplicitní id varianty projde', soubor: '../src/uloziste.js',
    hledej: "    if (videno.has(id)) out.push({ kde, id, duvod: 'duplicita' });",
    nahrad: '    ;',
    proc: 'kopie uzamčené varianty se stejným id by rozbila párování zámků a každé další uložení by končilo 409' },

  { nazev: 'B30: smazaný účet se obnovou oživí', soubor: 'functions/obnova.mjs',
    hledej: '        if (smazan && smazan.smazano) {',
    nahrad: '        if (false) {',
    proc: 'smazaný obchodník by se po obnově ze staršího otisku přihlásil původním heslem' },

  { nazev: 'B30: obnova přepíše archiv a aktivní ze zálohy', soubor: 'functions/obnova.mjs',
    hledej: '          stavUctuDrziServer(novy, stary);            // B30',
    nahrad: '          ;',
    proc: 'obnova by odarchivovala nebo zapnula účet, který správce vědomě vypnul' },

  { nazev: 'B31: hesloVerze se obnovou sníží', soubor: 'functions/obnova.mjs',
    hledej: '          if (vz > 0) novy.hesloVerze = vz;           // B31: verze hesla nikdy neklesne',
    nahrad: '          novy.hesloVerze = hesloVerzeUctu(u);',
    proc: 'obnova by oživila cookie odvolanou změnou hesla' },

  { nazev: 'B32: podpis z otisku se nekontroluje', soubor: 'functions/obnova.mjs',
    hledej: '          if (!kk.ok) return kk.chyba;',
    nahrad: '          if (false) return kk.chyba;',
    proc: 'z otisku by se zapsal podpis jako SVG se skriptem' },

  { nazev: 'B32: zakázky z obnovy neprocházejí kontrolou id', soubor: 'functions/obnova.mjs',
    hledej: "      return p.length ? ULO.uloIdProblemyText(p) : '';",
    nahrad: "      return '';",
    proc: 'obnova by do databáze vrátila zakázku s id, které server při ukládání odmítá' },

  /* ---------- 19. testovací kolo a audit 14. 9. 2026 (B45, B47–B52) ---------- */
  { nazev: 'B47: dávka zapíše token, aniž by ověřila, že obnova ještě běží', soubor: 'functions/obnova.mjs',
    hledej: '    const stale = await tk.s.cti(tk.klic);',
    nahrad: '    const stale = tk.token;',
    proc: 'zrušená obnova by se zápisem na konci dávky vzkřísila a databáze zůstala zamčená' },

  { nazev: 'B48: token nevznikne před pořízením otisku', soubor: 'functions/obnova.mjs',
    hledej: '    await s.zapis(tokenKlic(id), { id, kdo: relace.email, zacatek: ted, naposled: ted,',
    nahrad: '    await Promise.resolve({ id, kdo: relace.email, zacatek: ted, naposled: ted,',
    proc: 'dva souběžné požadavky „zacatek" by prošly oba a druhý by pořídil otisk z napůl obnovené databáze' },

  { nazev: 'B49: platnost tokenu se počítá od začátku, ne od poslední dávky', soubor: 'functions/obnova.mjs',
    hledej: 'const tokenPoslednePouzit = (z) => (z && (z.naposled || z.zacatek)) || null;',
    nahrad: 'const tokenPoslednePouzit = (z) => (z && z.zacatek) || null;',
    proc: 'velká obnova po dávkách by uprostřed práce vypršela a nešla by ani řádně ukončit' },

  { nazev: 'B49: vypršelý token nepřestaví rejstřík', soubor: 'functions/obnova.mjs',
    hledej: '    await prestavRejstrikSam(relace.email);',
    nahrad: '    ;',
    proc: 'po vypršení uprostřed dávek by rejstřík zůstal ze stavu před nimi a zakázky by v seznamu chyběly' },

  { nazev: 'B50: znovu založený účet zůstane v knize smazaných', soubor: 'functions/uzivatele.mjs',
    hledej: '      try { await (await uloziste(SMAZANI_ULOZISTE)).smaz(email); }',
    nahrad: '      try { if (false) await (await uloziste(SMAZANI_ULOZISTE)).smaz(email); }',
    proc: 'vědomě obnovený účet by každá další obnova napořád přeskakovala' },

  { nazev: 'B51: kid vlastních příplatků se nekontroluje', soubor: '../src/uloziste.js',
    hledej: "    uloKidPole(ockZ.priplatkyVlastni, 'vlastní příplatek OCK', out);",
    nahrad: '    ;',
    proc: 'podvržený kid by se tlačítkem 📌 dostal do katalogu a do zveřejněného ceníku' },

  { nazev: 'B45: délka názvu sekce PROJ se nekontroluje', soubor: '../src/uloziste.js',
    hledej: "        if (s && typeof s.nazev === 'string' && s.nazev.length > 200)",
    nahrad: '        if (false)',
    proc: 'název sekce jde z dat rovnou do nadpisu Detailu výpočtu a do dokumentů' },

  { nazev: 'B52: otisky před obnovou nemají vlastní limit', soubor: 'lib/zalohovani.mjs',
    hledej: '  const denni = vsechny.filter(k => !jePredObnovou(k));',
    nahrad: '  const denni = vsechny;',
    proc: 'série pokusů o obnovu by z přehledu vytlačila všechny denní zálohy' },
];

/* ---------- běh ---------- */
function spustSady() {
  for (const sada of SADY) {
    try {
      const vystup = execFileSync('node', [resolve(KOREN, sada)],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000,
          env: { ...process.env, NODE_PATH: process.env.NODE_PATH || '' } });
      /* test_obnova.mjs píše souhrn „N OK, M FAIL", ostatní „prošlo/selhalo". */
      const m = /(\d+) (?:prošlo|OK), (\d+) (?:selhalo|FAIL)/.exec(vystup);
      if (!m) return { chycena: true, kde: sada + ' (sada nedoběhla do souhrnu)' };
      if (Number(m[2]) > 0) return { chycena: true, kde: sada + ': ' + m[2] + ' selhalo' };
    } catch (e) {
      /* Pád sady je taky chycení — mutace rozbila kód tak, že se nedá ani
       * dojít na konec. Tichý průchod je jediná špatná odpověď. */
      return { chycena: true, kde: sada + ' (spadla)' };
    }
  }
  return { chycena: false };
}

const vybrane = MUTACE.filter(m => !filtr
  || m.nazev.toLowerCase().includes(filtr) || m.soubor.toLowerCase().includes(filtr));

/* RYCHLÁ KONTROLA ZADÁNÍ (`--kontrola`) — bez jediného spuštění sad.
 *
 * Proč vznikla (22. 9. 2026): dávka 4 změnila dva řádky, na které mířily
 * starší mutace, a jejich `hledej` se přestal nacházet. Plný běh to pozná
 * taky, jenže až po sedmnácti minutách a červeným CI — přitom je to chyba
 * v ZADÁNÍ mutace, ne v kódu. Tahle kontrola ji najde za vteřinu, takže se
 * dá pustit před commitem i jako samostatný krok v CI. */
if (process.argv.includes('--kontrola')) {
  const spatne = [];
  for (const m of MUTACE) {
    const cesta = resolve(KOREN, m.soubor);
    let obsah = '';
    try { obsah = readFileSync(cesta, 'utf8'); }
    catch (e) { spatne.push(m.nazev + ' — soubor ' + m.soubor + ' nejde přečíst'); continue; }
    const pocet = obsah.split(m.hledej).length - 1;
    if (pocet !== 1)
      spatne.push(m.nazev + ' — hledaný úsek v ' + m.soubor + ' nalezen ' + pocet + '×');
  }
  if (spatne.length) {
    console.log('CHYBNĚ ZADANÉ MUTACE (kód se změnil, mutace se nenašla):');
    spatne.forEach(s => console.log(' - ' + s));
    process.exit(1);
  }
  console.log('Zadání mutací je v pořádku: všech ' + MUTACE.length + ' úseků se v kódu našlo právě jednou.');
  process.exit(0);
}

console.log('MUTAČNÍ TESTOVÁNÍ SERVEROVÉ VRSTVY');
console.log('Mutací k ověření: ' + vybrane.length + '   (sady: ' + SADY.join(', ') + ')\n');

/* Nejdřív se ověří, že je před zásahem všechno zelené — jinak by „chycená"
 * mutace znamenala jen to, že testy padaly už předtím. */
const vychozi = spustSady();
if (vychozi.chycena) {
  console.log('PŘERUŠENO: sady nejsou zelené ani bez mutace — ' + vychozi.kde);
  process.exit(1);
}
console.log('Výchozí stav: obě sady zelené.\n');

let chycene = 0;
const nechycene = [];
const chybne = [];

for (const m of vybrane) {
  const cesta = resolve(KOREN, m.soubor);
  const puvodni = readFileSync(cesta, 'utf8');
  const pocet = puvodni.split(m.hledej).length - 1;
  if (pocet !== 1) {
    chybne.push(m.nazev + ' — hledaný úsek v ' + m.soubor + ' nalezen ' + pocet + '×');
    console.log('CHYBA ZADÁNÍ  ' + m.nazev + ' (úsek nalezen ' + pocet + '×)');
    continue;
  }
  try {
    writeFileSync(cesta, puvodni.replace(m.hledej, m.nahrad), 'utf8');
    const v = spustSady();
    if (v.chycena) { chycene++; console.log('chycená      ' + m.nazev + '   → ' + v.kde); }
    else { nechycene.push(m); console.log('NECHYCENÁ    ' + m.nazev + '   → ' + m.proc); }
  } finally {
    writeFileSync(cesta, puvodni, 'utf8');       // vrátit vždy, i při pádu
  }
}

console.log('\n============================================================');
console.log('Chycených ' + chycene + ' z ' + (chycene + nechycene.length)
  + (chybne.length ? '   (chybně zadaných mutací: ' + chybne.length + ')' : ''));
if (nechycene.length) {
  console.log('\nNECHYCENÉ MUTACE — tohle by dnes testy nezachytily:');
  for (const m of nechycene) console.log(' - ' + m.nazev + ' (' + m.soubor + ')\n     ' + m.proc);
}
if (chybne.length) {
  console.log('\nCHYBNĚ ZADANÉ MUTACE (kód se změnil, mutace se nenašla):');
  for (const c of chybne) console.log(' - ' + c);
}
process.exitCode = (nechycene.length || chybne.length) ? 1 : 0;
