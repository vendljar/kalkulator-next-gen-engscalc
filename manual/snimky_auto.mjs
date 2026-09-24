/* Automatické pořízení snímků pro příručku obchodníka.
 *
 * PROČ TENHLE SKRIPT VZNIKL (24. 9. 2026)
 * Snímky se dosud braly ručně: `manual/snimac.js` vložený do konzole
 * testovacího webu, proklikat se na místo, zavolat SNIMAC.vezmi(…) a na konci
 * stáhnout snimky.json. Dvacet snímků znamenalo hodinu klikání a při každé
 * nové verzi aplikace znovu — a sestav.sh přitom snímky z jiné verze
 * odmítne. Tady se tentýž sběrač pouští v Playwrightu nad sestavenou
 * aplikací, takže se snímky dají přefotit jedním příkazem.
 *
 * CO SE NEMĚNÍ
 * Sběr dělá PŘESNĚ týž `snimac.js` (vloží se do stránky a volá se jeho API),
 * výstup je `SNIMAC.data()` beze změny. Příručka tedy nepozná, jestli snímky
 * vznikly ručně, nebo tady — a oprava sběrače platí pro obě cesty najednou.
 *
 * ODKUD SE BEROU DATA
 * Nic se nečte z ostrého ani z testovacího webu. Běží pravé serverové funkce
 * (netlify/functions) nad paměťovým úložištěm, stejně jako v harnessech
 * overit_zobrazeni.mjs a overit_online.mjs:
 *   – PROSTREDI=test, aby stránka nesla třídu body.prostredi-test
 *     (sestav.sh snímky z jiného prostředí zastaví),
 *   – ceník je ZKUŠEBNÍ ze src/zkusebni_cenik.js (kulatá vymyšlená čísla),
 *     zveřejněný administrátorem přes /api/program,
 *   – zákazníci a akce mají jen vymyšlená jména s domluvenou předponou
 *     (Ukázková / Vzorová / Modelová / Zkušební / Příkladná) — sestav.sh
 *     jiné názvy s právní formou nepustí.
 * Snímky pořizuje OBCHODNÍK. Administrátor mu předem přidělí práva, se
 * kterými fotila ruční příručka (sloupce nákladu, KPI marže, detaily
 * výpočtů) — bez nich by snímky kalkulace neukazovaly to, o čem příručka píše.
 *
 * Spuštění:
 *   ADMIN_EMAIL=spravce@priklad.cz NODE_PATH=$(npm root -g) \
 *     node manual/snimky_auto.mjs <vystup/snimky.json>
 *
 * Výstup se NIKDY nezapisuje do repozitáře (rozhodnutí 17. 9. 2026 — snímky
 * nesou kalkulaci a v historii Gitu by zůstaly napořád). Cesta je povinná.
 */
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const KOREN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VYSTUP = process.argv[2];
if (!VYSTUP) {
  console.error('Použití: node manual/snimky_auto.mjs <cesta/snimky.json>');
  process.exit(2);
}
if (path.resolve(VYSTUP).startsWith(KOREN + path.sep)) {
  console.error('CHYBA: snímky se do repozitáře neukládají — zvolte cestu mimo ' + KOREN);
  process.exit(2);
}
if (!existsSync(path.join(KOREN, 'dist/kalkulacka.html'))) {
  console.error('Chybí dist/kalkulacka.html — nejdřív: KNG_NEZVYSOVAT_VERZI=1 python3 build.py');
  process.exit(2);
}

/* ---------- prostředí serverových funkcí ----------
 *
 * Proměnné se MUSÍ nastavit dřív, než se funkce naimportují: sdilene.mjs
 * čte ADMIN_EMAIL už při načtení modulu. Proto se importuje dynamicky až
 * tady, ne příkazem `import` nahoře (ten by se vykonal dřív než cokoli). */
process.env.TAJEMSTVI_RELACE = 'zkusebni-tajemstvi-jen-pro-snimky-prirucky';
process.env.ADMIN_INIT_HESLO = 'Zkusebni.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
process.env.PROSTREDI = 'test';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) {
    return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
      .map(x => x.slice(nazev.length + 1));
  },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

/* Cesty se berou z `config.path` každé funkce, ne z názvu souboru — u Pipedrive
 * se liší (/api/pd/deal) a ručně psaná tabulka by se s funkcemi rozešla. */
const FUNKCE = {};
const slozkaFunkci = path.join(KOREN, 'netlify/functions');
for (const f of readdirSync(slozkaFunkci).filter(f => f.endsWith('.mjs'))) {
  const m = await import(pathToFileURL(path.join(slozkaFunkci, f)).href);
  if (m.config && m.config.path && typeof m.default === 'function') FUNKCE[m.config.path] = m.default;
}

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  console.error('Playwright není k dispozici. Spusťte s NODE_PATH=$(npm root -g).');
  process.exit(2);
}
const ZC = require(path.join(KOREN, 'src/zkusebni_cenik.js'));
const SNIMAC_JS = readFileSync(path.join(KOREN, 'manual/snimac.js'), 'utf8');

/* ---------- vymyšlené údaje ----------
 *
 * Číslo 9100 patří ukázkové zakázce příručky (obsah.json na ni odkazuje);
 * řada 9xxx se v ostré databázi nepoužívá. */
const OBCHODNIK = { email: 'obchodnik@priklad.cz', jmeno: 'Petr Vzorek', heslo: 'Vzorove.Heslo.123' };
const ZAKAZKY = {
  hlavni: { cislo: '2026 - OPR - CN - 9100', objednatel: 'Ukázková správa budov s.r.o.',
    nazevAkce: 'vestavba nové prosklené OCK výtahové šachty', kontakt: 'Jan Ukázka',
    adresa: 'Vzorová 12, Praha 4' },
  pruchozi: { cislo: '2026 - OPR - CN - 9101', objednatel: 'Vzorové bytové družstvo',
    nazevAkce: 'přístavba výtahu k fasádě bytového domu', kontakt: 'Eva Modelová',
    adresa: 'Modelová 7, Brno' },
  zaskleni: { cislo: '2026 - OPR - CN - 9102', objednatel: 'Modelová development a.s.',
    nazevAkce: 'venkovní přístavba výtahu', kontakt: 'Marie Příkladná',
    adresa: 'Příkladná 3, Plzeň' },
  atyp: { cislo: '2026 - OPR - CN - 9103', objednatel: 'Zkušební nemovitosti s.r.o.',
    nazevAkce: 'atypická šachta v zrcadle schodiště', kontakt: 'Petr Vzorek',
    adresa: 'Zkušební 5, Ostrava' },
};
const ZAKAZNICI = [
  { nazev: 'Ukázková správa budov s.r.o.', sidlo: 'Vzorová 12, 140 00 Praha 4', kontaktOsoba: 'Jan Ukázka' },
  { nazev: 'Vzorové bytové družstvo', sidlo: 'Modelová 7, 602 00 Brno', kontaktOsoba: 'Eva Modelová' },
  { nazev: 'Modelová development a.s.', sidlo: 'Příkladná 3, 301 00 Plzeň', kontaktOsoba: 'Marie Příkladná' },
];
/* Zadání běžné šachty — rozměry jako testovací data (src/testdata.js), jen
 * zdvih je pro pět nástupišť (výchozí počet nové nabídky) vyšší: při 9 m by
 * vyšlo podlaží 2,25 m a kontrola před nabídkou by hlásila rozpor rozměrů. */
const ZADANI_ZAKLAD = { typSachty: 'interiérová', zaskleni: 'na terče', typPortalu: 'zapuštěný',
  sirka: 1.6, hloubka: 1.8, zdvih: 12, prejezd: 3.2, prohluben: 1.2, roztec: 1.25,
  nastupiste: 5, rohoveSloupky: 4, cistyVstupMm: 900, sirkaRamuMm: 100 };

/* ---------- aplikace a most na serverové funkce ---------- */

const html = readFileSync(path.join(KOREN, 'dist/kalkulacka.html'));
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ADRESA = 'http://127.0.0.1:' + server.address().port;

const prohlizec = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await prohlizec.newContext({ viewport: { width: 1360, height: 900 } });
const page = await ctx.newPage();
const chyby = [];
page.on('pageerror', e => chyby.push(String(e)));

let cookieJar = '';
await ctx.route('**/api/**', async route => {
  const r = route.request();
  const url = new URL(r.url());
  const fn = FUNKCE[url.pathname];
  if (!fn) return route.fulfill({ status: 404, contentType: 'application/json', body: '{"ok":false}' });
  const init = { method: r.method(), headers: { cookie: cookieJar, 'content-type': 'application/json' } };
  if (r.method() !== 'GET' && r.method() !== 'HEAD') init.body = r.postData() || '';
  const odp = await fn(new Request(r.url(), init));
  const setc = odp.headers.get('set-cookie');
  if (setc) cookieJar = setc.split(';')[0];
  route.fulfill({ status: odp.status, contentType: 'application/json; charset=utf-8',
    body: await odp.text() });
});

const krok = (t) => console.log('· ' + t);
const cekej = (ms) => page.waitForTimeout(ms);

/* Dialogy jsou od 2. 9. 2026 v aplikaci (src/ui/dialog.js). Na obrazovce by
 * je nikdo neodklepl, proto se nahradí odpovědí „ano" — stejně jako
 * v harnessech. Na snímcích žádný dialog není, takže to vzhled neovlivní. */
const dlgStub = () => page.evaluate(() => {
  window.__dlg = [];
  window.potvrd = (t) => { window.__dlg.push(String(t)); return Promise.resolve(true); };
  window.hlaska = (t) => { window.__dlg.push(String(t)); return Promise.resolve(); };
  window.dotaz = (t, v) => { window.__dlg.push(String(t)); return Promise.resolve(v == null ? '' : v); };
  window.volba = () => Promise.resolve('zahodit');
});

const nacti = async () => {
  await page.goto(ADRESA);
  await page.waitForFunction(() => typeof window.render === 'function');
  await cekej(500);
  await dlgStub();
};
const prihlas = async (email, heslo) => {
  await page.fill('#onlineEmail', email);
  await page.fill('#onlineHeslo', heslo);
  await page.click('#prihlaseni-box >> text=Přihlásit');
  await page.waitForFunction((e) => { try { return !!ONLINE_STAV.ja && ONLINE_STAV.ja.email === e; }
    catch (x) { return false; } }, email, { timeout: 15000 });
  await cekej(600);
};
/* Volání API z běžící stránky — jde přes týž most a tutéž relaci jako
 * aplikace sama. Chyba serveru shodí celý běh: snímek z poloviční
 * přípravy by v příručce ukazoval něco jiného, než o čem píše. */
const api = (cesta, telo) => page.evaluate(([c, t]) => onlineApi(c, t), [cesta, telo]);

/* ---------- 1) administrátor připraví prostředí ---------- */

await nacti();
krok('přihlášení administrátora');
await prihlas('spravce@priklad.cz', 'Zkusebni.Heslo.123');

/* Ceník: zkušební ze src/zkusebni_cenik.js. Doplňují se jen sazby ATYP,
 * které zkušební ceník nemá — jinak by u přepínače ATYP svítil štítek
 * „sazby ATYP nejsou v ceníku", který k běžné práci nepatří. Hodnoty jsou
 * tytéž náhrady, jaké by aplikace dosadila sama (ATYP_SAZBY v kalk_ock.js).
 * Slevová politika jde s ceníkem: ta ze sestavení nese značku `ukazkove`
 * a kontrola před nabídkou by kvůli ní na každém snímku hlásila
 * „spočítaný z UKÁZKOVÝCH cen". */
krok('zveřejnění zkušebního ceníku');
await page.evaluate(async ([cenik, cenikProj]) => {
  Object.assign(cenik, { atypZamecnikKc: 50000, atypRezervaZakladPct: 0.30,
    atypRezervaPriplatkyPct: 0.30, atypMontazPct: 0.30, atypProjekcePct: 0.30 });
  const slevy = JSON.parse(JSON.stringify(NAST.slevy || {}));
  delete slevy.ukazkove; delete slevy.prazdny;
  await onlineApi('/api/program', { cenik, cenikProj, slevy,
    poznamka: 'zkušební ceník pro snímky příručky' });
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);

/* Firma: ukázkové údaje ze sestavení server nezveřejní (značka `ukazkove`),
 * proto se vezmou, značka se sundá a název se nahradí vymyšleným. Termín
 * dodání a prodloužení za ATYP podle zadání nových snímků (#330): kapitola V.
 * pak začíná řádkem „Termín dodání: …" a výchozí text kapitoly (s „cca 12
 * týdnů") rozsvítí kontrolu terminAtyp. */
krok('zveřejnění firemních údajů');
await page.evaluate(async () => {
  const f = firmaDefault();
  delete f.ukazkove;
  f.nazev = 'Ukázková dodavatelská s.r.o.';
  f.ico = '12345679';
  f.email = 'info@priklad.cz';
  f.terminDodaniOck = 'cca 12 týdnů';
  f.terminAtypTydny = '4';
  await onlineApi('/api/firma', { udaje: f });
});

/* Práva, se kterými fotila ruční příručka (snimac.js: obchodník v roli
 * `sloupce.naklad`). Ukládají se samy (ZOBR_ULOZ) — čeká se na dokončení. */
krok('přidělení práv obchodníkovi v matici zobrazení');
await page.evaluate(() => {
  ZOBR_ULOZ.stav = '';
  ['sloupce.naklad', 'kpi.marze', 'tab.detail', 'tab.detailproj']
    .forEach(k => zobrSet(k, 'Obchodník', true));
});
await page.waitForFunction(() => { try { return ZOBR_ULOZ.stav === 'ulozeno'; } catch (e) { return false; } },
  null, { timeout: 15000 });

krok('založení obchodníka');
await api('/api/uzivatele', { akce: 'zaloz', email: OBCHODNIK.email, jmeno: OBCHODNIK.jmeno,
  role: 'Obchodník', heslo: OBCHODNIK.heslo, funkce: 'obchodník', telefon: '+420 000 000 001' });

await page.evaluate(() => onlineOdhlas());
await page.waitForFunction(() => { try { return ONLINE_STAV.ja === null; } catch (e) { return false; } });

/* ---------- 2) obchodník ---------- */

await nacti();
krok('přihlášení obchodníka');
await prihlas(OBCHODNIK.email, OBCHODNIK.heslo);
await page.waitForFunction(() => {
  try { return ONLINE_STAV.cenikPouzit && !DEFAULT_CENIK.prazdny; } catch (e) { return false; }
}, null, { timeout: 15000 });
await cekej(400);
const prostredi = await page.evaluate(() => ({
  trida: document.body.classList.contains('prostredi-test'), stav: ONLINE_STAV.prostredi,
  role: ONLINE_STAV.ja && ONLINE_STAV.ja.role, verze: (document.querySelector('header h1') || {}).textContent }));
krok('prostředí: ' + JSON.stringify(prostredi));
if (!prostredi.trida) { console.error('CHYBA: stránka nemá třídu prostredi-test.'); process.exit(1); }

krok('karty zákazníků');
for (const z of ZAKAZNICI) await api('/api/zakaznici', { zakaznik: z });

await page.addScriptTag({ content: SNIMAC_JS });

/* Snímek: selektor (řetězec) nebo funkce vracející prvek, která běží ve
 * stránce. `uprav` dostává klon a SNIMAC stejně jako v ruční cestě. */
const pozadovane = [];
const vezmi = async (id, cil, volby = {}) => {
  pozadovane.push(id);
  const vysl = await page.evaluate(([id, cil, volby]) => {
    const el = cil.fn ? (new Function('return (' + cil.fn + ')()'))() : document.querySelector(cil.sel);
    if (!el) return 'NENALEZENO';
    if (el.scrollIntoView) el.scrollIntoView();
    const v = { tema: volby.tema, popis: volby.popis };
    if (volby.uprav) v.uprav = new Function('klon', 'S', volby.uprav);
    return SNIMAC.vezmi(id, el, v);
  }, [id, typeof cil === 'function' ? { fn: cil.toString() } : { sel: cil },
      { tema: volby.tema, popis: volby.popis || '', uprav: volby.uprav || '' }]);
  console.log('  ' + (vysl === 'NENALEZENO' ? '✕ ' + id + ' — prvek nenalezen (' + cil + ')' : '✓ ' + vysl));
};

/* Nová zakázka touž cestou jako tlačítko „✚ Nová zakázka" (výchozí
 * zaškrtnutí z matice, odpojení od uložené zakázky). */
const novaZakazka = (hlavicka, zadani) => page.evaluate(async ([h, z]) => {
  await novaZakazkaUI();
  set('ZAK.cislo', h.cislo);
  set('ZAK.nazevAkce', h.nazevAkce);
  set('ZAK.objednatel', h.objednatel);
  set('ZAK.kontakt', h.kontakt);
  set('ZAK.adresa', h.adresa);
  /* Typ šachty přes typSachtyPrepni, ne holým set(): jen tak se dosadí
   * výchozí profily podle typu. Holý set nechal exteriérové profily
   * u interiérové šachty a automat standardu pak zaškrtl ATYP. */
  if (z.typSachty) typSachtyPrepni(z.typSachty);
  Object.keys(z).filter(k => k !== 'typSachty').forEach(k => set('Z.' + k, z[k]));
  prepniTab('kalk'); render();
}, [hlavicka, zadani]);
const uloz = () => page.evaluate(() => onlineUloz());
const zalozka = async (tab) => { await page.evaluate(t => { prepniTab(t); render(); window.scrollTo(0, 0); }, tab); await cekej(300); };

/* ---- pruh testovacího prostředí ---- */
await zalozka('kalk');
await vezmi('prostredi-lista', '#prostrediLista', { tema: 'test' });

/* ---- ukázková zakázka 9100: běžná šachta ---- */
krok('zakázka 9100 (běžná šachta)');
/* Můstek zaškrtnutý bez rozměrů: kontrola standardu pak hlásí „nelze
 * posoudit" — štítek, který příručka u souhrnu vysvětluje (kapitola 15). */
await novaZakazka(ZAKAZKY.hlavni, Object.assign({}, ZADANI_ZAKLAD, { prechodovePlechy: false, mustek: true }));
/* Zápisník: vymyšlená poznámka, aby karta (i souhrn nad ní) nebyla prázdná. */
await page.evaluate(() => {
  poznamkyPoleHotovo('Zákazník chce termín montáže až po dokončení fasády.\nPřístup na stavbu jen ve všední dny.');
});
await uloz();
await cekej(300);
await vezmi('hlavicka-zakazky', '.card.zak-bar');
await vezmi('rezim-vypoctu', () => {
  const el = document.querySelector('#page-kalk .rezim-vypoctu');
  /* Celý blok lišty, ne jen řádek: samotný řádek je nízký flex a snímek
   * by uřízl horní okraj písma (zjištěno při kontrole příručky 24. 9.). */
  const r = el && el.closest('.row');
  return r && r.parentElement ? r.parentElement : r;
});
/* Rozpis kontroly standardu se v souhrnu kreslí jen rozbalený (kliknutím
 * na štítek v liště). Rozbalí se jen pro tenhle snímek — jinak by visel
 * i nad technickou specifikací. */
await page.evaluate(() => { if (!STD_ROZPIS) standardRozpisPrepni(); });
await vezmi('souhrn-ceny', '#kalk-souhrn');
await page.evaluate(() => { if (STD_ROZPIS) standardRozpisPrepni(); });
await vezmi('zadani-zaklad', '#ock-zadani');

/* Volitelné položky: jedna velká tabulka kalkulace, do příručky jen výřez
 * sekce VOLITELNÉ (hlavička sloupců zůstává). */
const VYREZ_VOLITELNE = "S.vyrez(klon, 'VOLITELNÉ POLOŽKY DO ZÁKLADNÍ CENY', 'VOLITELNÉ CELKEM');";
await vezmi('volitelne-pred', '#ock-kalkulace table', { uprav: VYREZ_VOLITELNE });
await page.evaluate(() => { set('Z.prechodovePlechy', true); render(); });
await cekej(200);
await vezmi('volitelne-po', '#ock-kalkulace table', { uprav: VYREZ_VOLITELNE });

await vezmi('poznamky-prilohy', '#ock-poznamky');
await vezmi('sleva', '#ock-sleva');
await vezmi('zaokrouhleni', '#ock-zaokr');
await vezmi('nabidka-nahled', () => {
  const k = document.querySelector('#ock-nabidka');
  return k && [...k.querySelectorAll('table')].find(t => /max-width:\s*640px/.test(t.getAttribute('style') || ''));
});
await vezmi('smluvni-podminky', () => {
  const b = document.querySelector('#page-kalk .kl-podminky-ock');
  return b && b.closest('.card');
});
await uloz();

await zalozka('spec');
await vezmi('spec-zdroj-hodnot', '#page-spec .spec-doc');
await zalozka('detailproj');
await vezmi('detail-proj-vysvetleni', '#page-detailproj');

/* ---- 9101: průchozí šachta ---- */
krok('zakázka 9101 (průchozí šachta)');
await novaZakazka(ZAKAZKY.pruchozi, ZADANI_ZAKLAD);
/* Počet pater se schválně NEVYPLŇUJE: příručka u snímku vysvětluje
 * upozornění „Zadejte počet pater", které bez něj svítí. */
await page.evaluate(() => { pruchoziPrepni(true); set('Z.nastupisteA', 2); set('Z.nastupisteC', 2); render(); });
await uloz();
await vezmi('zadani-pruchozi', '#ock-zadani');

/* ---- 9102: zasklení mezi příčníky ---- */
krok('zakázka 9102 (zasklení mezi příčníky)');
await novaZakazka(ZAKAZKY.zaskleni, Object.assign({}, ZADANI_ZAKLAD, { zaskleni: 'mezi příčníky' }));
await uloz();
await vezmi('zadani-zaskleni', '#ock-zadani');
await vezmi('mezivypocty-liste', '#ock-detail');
/* Jedna odeslaná nabídka do přehledu — sloupec „Odesláno" jinak zůstane
 * prázdný a příručka o něm mluví. Zamyká se touž cestou jako tisk. */
await page.evaluate(async () => {
  zamekPoTisku('nabidkaTisk', aktivniVarianta(ZAK).id);
  await onlineUloz();
});

/* ---- 9103: ATYP — termín dodání v kapitole V. a kontrola před nabídkou ---- */
krok('zakázka 9103 (ATYP)');
await novaZakazka(ZAKAZKY.atyp, ZADANI_ZAKLAD);
await page.evaluate(() => { atypPrepni(true); render(); });
await uloz();
await zalozka('spec');
await vezmi('kontroly-pred-nabidkou', '#page-spec .kontroly-panel');

/* Kompletní náhled nabídky otevírá aplikace v NOVÉM OKNĚ s vlastním stylem.
 * Kapitola V. se tam vezme stejným sběračem (vloží se i do okna) a styl
 * náhledu jde se snímkem, aby vypadal jako dokument, ne jako aplikace. */
krok('náhled nabídky — kapitola V.');
const [okno] = await Promise.all([
  ctx.waitForEvent('page', { timeout: 15000 }),
  page.evaluate(() => { nabidkaOckDokument(); }),
]);
await okno.waitForLoadState();
await okno.waitForFunction(() => !!document.querySelector('#dok'), null, { timeout: 15000 });
await okno.addScriptTag({ content: SNIMAC_JS });
const kapitola = await okno.evaluate(() => {
  const h2 = [...document.querySelectorAll('#dok h2')].find(h => /TERMÍNY REALIZACE/.test(h.textContent));
  const tab = h2 && h2.nextElementSibling;
  if (!h2 || !tab) return null;
  /* Obal jen pro snímek: nadpis kapitoly + její tabulka + styl dokumentu.
   * Styl se omezí na obal, aby pravidla pro body netekla do příručky. */
  const obal = document.createElement('div');
  obal.className = 'nabidka-kapitola';
  obal.style.cssText = 'font:13px/1.55 "Segoe UI",sans-serif;color:#1a2332;max-width:860px;background:#fff;padding:8px 16px';
  const st = document.createElement('style');
  st.textContent = '.nabidka-kapitola h2{font-size:13px;background:#eef2f8;padding:6px 10px;margin:8px 0 6px;'
    + 'text-transform:uppercase;letter-spacing:.03em}'
    + '.nabidka-kapitola table{width:100%;border-collapse:collapse;margin:6px 0}'
    + '.nabidka-kapitola td{border-bottom:1px solid #eef1f6;padding:4px 8px;vertical-align:top}'
    + '.nabidka-kapitola td:first-child{width:46%}';
  obal.appendChild(st);
  obal.appendChild(h2.cloneNode(true));
  obal.appendChild(tab.cloneNode(true));
  document.body.appendChild(obal);
  SNIMAC.vezmi('nabidka-kapitoly', obal, { popis: 'Kapitola V. náhledu cenové nabídky OCK u zakázky s ATYP' });
  const s = SNIMAC.snimky[0];
  obal.remove();
  return s;
});
await okno.close();
pozadovane.push('nabidka-kapitoly');
if (kapitola) {
  await page.evaluate((s) => { SNIMAC.snimky.push(s); }, kapitola);
  console.log('  ✓ nabidka-kapitoly ' + Math.round(kapitola.html.length / 1024) + ' kB ' + kapitola.sirka + 'x' + kapitola.vyska);
} else console.log('  ✕ nabidka-kapitoly — v náhledu chybí kapitola V. TERMÍNY REALIZACE');

/* ---- Přehled cenových nabídek a Zákazníci ---- */
krok('přehled nabídek a zákazníci');
await zalozka('zakazka');
await page.waitForFunction(() => !!document.querySelector('#page-zakazka table.vartbl.archtbl'),
  null, { timeout: 15000 }).catch(() => {});
await cekej(500);
await vezmi('prehled-nabidek', '#page-zakazka table.vartbl.archtbl');

await zalozka('zakaznici');
await page.waitForFunction(() => { try { return ZAK_DB.nacteno; } catch (e) { return false; } },
  null, { timeout: 15000 });
await page.evaluate(() => render());
await cekej(300);
await vezmi('zakaznici', '#page-zakaznici');

/* ---------- odevzdání ---------- */

const data = await page.evaluate(() => SNIMAC.data());
writeFileSync(VYSTUP, JSON.stringify(data));

const mame = new Set(data.snimky.map(s => s.id));
const chybi = pozadovane.filter(id => !mame.has(id));
console.log('\nZapsáno: ' + VYSTUP + ' (' + Math.round(JSON.stringify(data).length / 1024) + ' kB)');
console.log('verze: ' + data.verze + ', prostředí: ' + data.prostredi + ', snímků: ' + data.snimky.length);
if (chybi.length) console.log('CHYBÍ: ' + chybi.join(', '));
if (chyby.length) console.log('Chyby stránky:\n  ' + chyby.join('\n  '));

await prohlizec.close();
server.close();
process.exit(chybi.length ? 1 : 0);
