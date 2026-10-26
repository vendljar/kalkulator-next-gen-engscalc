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
/* K sběrači se přibalí pomocník na výřez sekce (#524): krycí list nebo
 * technická specifikace je jeden dlouhý dokument a postup ukazuje jen tu
 * sekci, o které krok mluví. Výřez je dočasná kopie vedle originálu
 * (viditelná, aby ji sběrač neuklidil jako skrytou) a po snímku zmizí. */
const POMOCNIK_JS = `
window.vyrezSekce = function (rodic, od, po) {
  if (typeof rodic === 'string') rodic = document.querySelector(rodic);
  if (!rodic) return null;
  var deti = [].slice.call(rodic.children);
  var i0 = deti.findIndex(function (d) { return new RegExp(od).test(d.textContent); });
  if (i0 < 0) return null;
  var i1 = po ? deti.findIndex(function (d, i) { return i > i0 && new RegExp(po).test(d.textContent); }) : -1;
  if (i1 < 0) i1 = deti.length;
  var obal = rodic.cloneNode(false);
  obal.removeAttribute('id');
  obal.setAttribute('data-mn-docasny', '');
  deti.slice(i0, i1).forEach(function (d) { obal.appendChild(d.cloneNode(true)); });
  rodic.parentNode.insertBefore(obal, rodic.nextSibling);
  return obal;
};`;
const SNIMAC_JS = readFileSync(path.join(KOREN, 'manual/snimac.js'), 'utf8') + '\n' + POMOCNIK_JS;

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
  /* Projekce s číslem řady OVP (13. 10. 2026, P6 — zámek strany): od v13.10.2
   * je u čísla OPR Kalkulace PROJ uzamčená a vynulovaná, takže Detail výpočtu
   * PROJ se fotí tady, kde se projekce opravdu počítá. */
  projekce: { cislo: '2026 - OVP - CN - 9104', objednatel: 'Vzorové bytové družstvo',
    nazevAkce: 'projekce výtahu k fasádě bytového domu', kontakt: 'Eva Modelová',
    adresa: 'Modelová 7, Brno' },
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
  const telo = await odp.text();
  if (odp.status >= 400 && process.env.KNG_SNIMKY_LADENI) console.log('  API ' + url.pathname + ' ' + odp.status + ' ' + telo.slice(0, 300));
  route.fulfill({ status: odp.status, contentType: 'application/json; charset=utf-8', body: telo });
});

const krok = (t) => console.log('· ' + t);
const cekej = (ms) => page.waitForTimeout(ms);

/* Dialogy jsou od 2. 9. 2026 v aplikaci (src/ui/dialog.js). Na obrazovce by
 * je nikdo neodklepl, proto se nahradí odpovědí „ano" — stejně jako
 * v harnessech. Na snímcích žádný dialog není, takže to vzhled neovlivní. */
const dlgStub = () => page.evaluate(() => {
  /* Pravé dialogy se schovají stranou: postup krok za krokem (#524) si je
   * na chvíli vrátí, aby se dal vyfotit dialog, na který obchodník odpovídá. */
  if (!window.__dlgPuv) window.__dlgPuv = { potvrd: window.potvrd, hlaska: window.hlaska,
    dotaz: window.dotaz, volba: window.volba };
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
    const vysl = SNIMAC.vezmi(id, el, v);
    document.querySelectorAll('[data-mn-docasny]').forEach(e => e.remove());
    return vysl;
  }, [id, typeof cil === 'function' ? { fn: cil.toString() } : { sel: cil },
      { tema: volby.tema, popis: volby.popis || '', uprav: volby.uprav || '' }]);
  console.log('  ' + (vysl === 'NENALEZENO' ? '✕ ' + id + ' — prvek nenalezen (' + cil + ')' : '✓ ' + vysl));
};

/* ---------- 0) před přihlášením (#524) ----------
 *
 * Přihlašovací okno a červená lišta „Ceník není nahraný" se dají vyfotit
 * jen nepřihlášeně. Sběrač se proto vloží už teď a hotové snímky se před
 * přihlášením (které stránku načte znovu) odloží stranou. */

await nacti();
await page.addScriptTag({ content: SNIMAC_JS });
krok('před přihlášením: přihlašovací okno a červená lišta');
await page.waitForFunction(() => {
  const e = document.querySelector('#ukazkoveLista');
  return e && e.textContent.trim().length > 0;
}, null, { timeout: 15000 }).catch(() => {});
await vezmi('k4-cervena-lista', '#ukazkoveLista');
await vezmi('k1-prihlaseni', '#prihlaseni-box');
/* Heslo na snímku je výplň, ne skutečné heslo — do příručky se hodnota
 * pole zapéká jako atribut. */
await page.fill('#onlineEmail', OBCHODNIK.email);
await page.fill('#onlineHeslo', 'xxxxxxxxxx');
await vezmi('k1-prihlaseni-vyplneno', '#prihlaseni-box');
await page.fill('#onlineEmail', '');
await page.fill('#onlineHeslo', '');
/* Snímky z dřívějších načtení stránky (každé přihlášení stránku načte
 * znovu a sběrač s ní) — na konci se přidají k ostatním. */
const ODLOZENE = [];
const odloz = async () => { ODLOZENE.push(...await page.evaluate(() => SNIMAC.snimky.splice(0))); };
await odloz();

/* ---------- 1) administrátor připraví prostředí ---------- */

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
/* `zdrazeni` (#524): druhé zveřejnění se zdraženou montáží — kapitola 22
 * ukazuje dialog „Ceník se od posledního uložení změnil", který se objeví
 * po otevření zakázky spočítané podle staršího ceníku. */
const zverejniCenik = (zdrazeni = 1) => page.evaluate(async ([cenik, cenikProj, zdrazeni]) => {
  if (zdrazeni !== 1) cenik.montazHodKc = Math.round(cenik.montazHodKc * zdrazeni);
  Object.assign(cenik, { atypZamecnikKc: 50000, atypRezervaZakladPct: 0.30,
    atypRezervaPriplatkyPct: 0.30, atypMontazPct: 0.30, atypProjekcePct: 0.30 });
  const slevy = JSON.parse(JSON.stringify(NAST.slevy || {}));
  delete slevy.ukazkove; delete slevy.prazdny;
  /* Stropy slev a minimální marže jako ve výchozím nastavení firmy
   * (kapitola 19: Obchodník 5 %, Vedoucí 15 %), ať snímky slevy ukážou
   * schválení automaticky i žádost nad strop. */
  slevy.stropy = Object.assign({}, slevy.stropy || {}, { 'Obchodník': 0.05, 'Vedoucí': 0.15 });
  if (!(slevy.minMarze > 0)) slevy.minMarze = 0.10;
  /* Kurz EUR a pár zahraničních odchylek (#524): bez nich přepínač
   * ČR / Zahraničí jen ohlásí, že by se nic nezměnilo, a kapitola 9 by
   * neměla co ukázat. Čísla jsou vymyšlená jako celý zkušební ceník. */
  cenik.kurzEurKc = 25;
  cenikProj.kurzEurKc = 25;
  const zahranicni = { ceny: { 'C.montazHodKc': Math.round((+cenik.montazHodKc || 800) * 1.2),
    'C.cestovniKc': 15000, 'C.prekladyKc': 8000 }, jenZahr: { 'C.prekladyKc': true } };
  const r = await onlineApi('/api/program', { cenik, cenikProj, slevy, zahranicni,
    poznamka: 'zkušební ceník pro snímky příručky' });
  if (!r || r.ok === false) throw new Error('zveřejnění zkušebního ceníku selhalo: ' + JSON.stringify(r).slice(0, 300));
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj(), zdrazeni]);
await zverejniCenik();

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
  /* B168 (18. 10. 2026): uložení matice zobrazení chce heslo správce — odpoví
   * se heslem zkušebního správce (ADMIN_INIT_HESLO výše), jinak dialog visí. */
  window.dotazHeslo = () => Promise.resolve('Zkusebni.Heslo.123');
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
/* Uložení zakázky. Neuložená zakázka by v přehledu nabídek chyběla a snímky
 * z ní by nesly cizí stav — proto se selhání hlásí hned (důvod ukáže
 * KNG_SNIMKY_LADENI=1 u odpovědi serveru). */
const uloz = async () => {
  const ok = await page.evaluate(() => onlineUloz());
  if (!ok) console.log('  ✕ zakázka se neuložila: ' + await page.evaluate(() => ZAK.cislo));
};
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
/* Zámek strany (P6, rozhodnutí J. V. 13. 10. 2026): zakázka 9100 má číslo
 * OPR, takže Kalkulace PROJ je uzamčená a vynulovaná — lišta nad ní je to,
 * co obchodník uvidí, když se do projekce přepne (kapitola 25). */
await zalozka('proj');
await vezmi('zamek-strany', '#page-proj .zamek-lista[data-strana-vyrazena="proj"]');

/* ---- 9104: projekce (číslo OVP) — Detail výpočtu PROJ ---- */
krok('zakázka 9104 (projekce, číslo OVP)');
await novaZakazka(ZAKAZKY.projekce, ZADANI_ZAKLAD);
await uloz();
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
/* Lišta tiskového náhledu (#524, kapitola 23): tlačítka tisku a ruční
 * úpravy textu. Náhled má vlastní stylopis, který v příručce není — lišta se
 * proto obalí jeho pravidly pro tlačítka a omezí na obal. */
const listaNahledu = await okno.evaluate(() => {
  const b = [...document.querySelectorAll('button, label')].find(x => /Upravit text před tiskem/.test(x.textContent));
  let el = b && b.parentElement;
  while (el && el.parentElement && el.parentElement !== document.body && el.getBoundingClientRect().width < 500) el = el.parentElement;
  if (!el) return null;
  /* Bez @media print (lišta je v tisku schovaná — v PDF příručky by
   * zmizela) a bez pravidel pro html/body. */
  let css = [...document.querySelectorAll('style')].map(x => x.textContent).join('\n')
    .replace(/(^|\})\s*(html|body)\s*\{[^}]*\}/g, '$1');
  for (let m; (m = /@media\s+print\s*\{/.exec(css));) {
    let j = m.index + m[0].length, h = 1;
    while (j < css.length && h) { if (css[j] === '{') h++; else if (css[j] === '}') h--; j++; }
    css = css.slice(0, m.index) + css.slice(j);
  }
  const obal = document.createElement('div');
  obal.className = 'nahled-lista-obal';
  obal.style.cssText = 'background:#fff;padding:6px 10px;font:13px/1.5 "Segoe UI",sans-serif';
  const st = document.createElement('style');
  st.textContent = css;
  obal.appendChild(st);
  obal.appendChild(el.cloneNode(true));
  document.body.insertBefore(obal, document.body.firstChild);
  SNIMAC.snimky.length = 0;
  SNIMAC.vezmi('k23-nahled-lista', obal, { popis: 'Lišta tiskového náhledu nabídky OCK' });
  obal.remove();
  return SNIMAC.snimky[0];
});
await okno.close();
pozadovane.push('nabidka-kapitoly', 'k23-nahled-lista');
if (listaNahledu) await page.evaluate((s) => { SNIMAC.snimky.push(s); }, listaNahledu);
else console.log('  ✕ k23-nahled-lista — v náhledu chybí tlačítko Upravit text před tiskem');
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

/* ---------- 3) postupy krok za krokem (#524, pokyn J. V. 26. 10. 2026) ----------
 *
 * Každá kapitola, ve které obchodník něco dělá, má v příručce číslované kroky
 * a u každého kroku vlastní snímek. Kam kliknout, příručka vyznačí sama
 * (obsah.json → kroky[].klik hledá prvek ve snímku podle popisku), takže
 * snímek musí ukazovat obrazovku TĚSNĚ PŘED tím kliknutím — a po něm další
 * snímek, co obchodník uvidí. Snímky se pojmenovávají k<kapitola>-<co>. */

krok('postupy krok za krokem');
/* Viditelné modální okno aplikace (Můj profil, Změnit heslo …). */
const MODAL = () => {
  const o = [...document.querySelectorAll('.modal-overlay')]
    .find(x => getComputedStyle(x).display !== 'none');
  return o && (o.querySelector('.modal') || o);
};
/* Dialog aplikace (potvrzení, volba) se na chvíli vrátí, vyfotí a odklepne
 * zvolenou odpovědí; pak zase platí náhrada z dlgStub(). */
const sDialogem = async (id, akce, odpoved = 'ano') => {
  await page.evaluate(() => { Object.assign(window, window.__dlgPuv); });
  await page.evaluate('setTimeout(() => { (' + akce + ')(); }, 0)');
  const je = await page.waitForSelector('#dlg .dlg-box', { timeout: 10000 }).then(() => true, () => false);
  if (je) {
    await cekej(200);
    await vezmi(id, '#dlg .dlg-box');
    await page.click('#dlg [data-dlg="' + odpoved + '"]');
  } else { pozadovane.push(id); console.log('  ✕ ' + id + ' — dialog se neobjevil'); }
  await cekej(500);
  await dlgStub();
};
const nahoru = () => page.evaluate(() => window.scrollTo(0, 0));

/* ---- kap. 1 a 3: přihlášený obchodník, Můj profil, Změnit heslo ---- */
krok('kap. 1 a 3: hlavička aplikace, Můj profil, Změnit heslo');
await zalozka('kalk');
await vezmi('k1-hlavicka-app', 'header');
await page.evaluate(() => otevriMujProfil());
await cekej(400);
await vezmi('k3-profil-prazdny', MODAL);
await page.evaluate(() => {
  const m = [...document.querySelectorAll('.modal-overlay')].find(x => getComputedStyle(x).display !== 'none');
  const pole = [...m.querySelectorAll('input')].filter(i => i.type === 'text' || i.type === 'tel' || !i.type);
  const najdi = (re) => pole.find(i => re.test(((i.closest('.row,label,div') || {}).textContent || '') + ' ' + (i.placeholder || '')));
  const vypln = (re, v) => { const i = najdi(re); if (i) { i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); } };
  vypln(/Titul/i, 'Ing.');
  vypln(/Funkce/i, 'Obchodní technik');
  vypln(/Telefon/i, '+420 000 000 001');
});
await cekej(200);
await vezmi('k3-profil-vyplneny', MODAL);
await page.evaluate(() => { if (typeof zavriMujProfil === 'function') zavriMujProfil(); });
await page.evaluate(() => otevriZmenaHesla());
await cekej(400);
await vezmi('k3-zmena-hesla', MODAL);
await page.evaluate(() => { if (typeof zavriZmenaHesla === 'function') zavriZmenaHesla(); });
await cekej(200);

/* ---- kap. 5 a 6: nová zakázka, hlavička, ukládání ---- */
krok('kap. 5 a 6: nová zakázka a ukládání');
await novaZakazka(ZAKAZKY.hlavni, Object.assign({}, ZADANI_ZAKLAD, { mustek: true }));
await zalozka('kalk');
/* Výchozí stav pro krok 1: otevřená (uložená) zakázka, nad kterou se
 * začíná nová. Vrací se ukázková 9100 z přehledu. */
await page.evaluate(async (c) => {
  const r = (ONLINE_STAV.rejstrik || []).find(x => (x.cislo || '') === c);
  if (r && r.soubor) await onlineOtevri(r.soubor);
}, ZAKAZKY.hlavni.cislo).catch(() => {});
await cekej(600);
await zalozka('kalk');
await vezmi('k5-pred-novou', '#page-kalk .card.zak-bar');
await page.evaluate(async () => { await novaZakazkaUI(); prepniTab('kalk'); render(); });
await cekej(400);
await vezmi('k5-prazdna-hlavicka', '#page-kalk .card.zak-bar');
await page.evaluate(() => {
  set('ZAK.cislo', '2026 - OPR - CN - 9105');
  set('ZAK.nazevAkce', 'výměna výtahu v bytovém domě');
  render();
});
await cekej(200);
/* Našeptávač zákazníka: napsaný začátek názvu a rozbalená nabídka. */
await page.evaluate(() => {
  const i = [...document.querySelectorAll('#page-kalk .card.zak-bar input')]
    .find(x => /naseptavacZakKresli/.test(x.getAttribute('oninput') || ''));
  if (i) { i.value = 'Vzorov'; naseptavacZakKresli('ock', 'Vzorov'); }
});
await cekej(400);
await vezmi('k5-naseptavac', '#page-kalk .card.zak-bar');
await page.evaluate(() => {
  if (typeof naseptavacZakVyber === 'function') naseptavacZakVyber('Vzorové bytové družstvo', 'ock');
  else set('ZAK.objednatel', 'Vzorové bytové družstvo');
  set('ZAK.adresa', 'Modelová 7, Brno');
  render();
});
await cekej(300);
await vezmi('k5-vyplnena-hlavicka', '#page-kalk .card.zak-bar');
await uloz();
await cekej(600);
await page.evaluate(() => render());
await vezmi('k6-ulozeno', '#page-kalk .card.zak-bar');

/* ---- kap. 7: Zákazníci ---- */
krok('kap. 7: zákazníci');
await vezmi('k7-zalozky', 'nav.tabs');
await zalozka('zakaznici');
await page.waitForFunction(() => { try { return ZAK_DB.nacteno; } catch (e) { return false; } }, null, { timeout: 15000 }).catch(() => {});
await page.evaluate(() => render());
await cekej(300);
await vezmi('k7-seznam', '#page-zakaznici');
await page.evaluate(() => { zakaznikNovyUI(); });
await cekej(300);
await vezmi('k7-nova-karta', '#page-zakaznici');
await page.evaluate(() => { zakaznikZavri(); });
await cekej(200);
/* Přenesení karty do otevřené zakázky: otevřená karta s tlačítkem. */
await page.evaluate(() => {
  const k = (ZAK_DB.seznam || []).find(z => /Modelová development/.test(z.nazev || ''));
  if (k) zakaznikOtevri(zakaznikKlic(k));
});
await cekej(400);
await vezmi('k7-karta-prenest', '#page-zakaznici');
await page.evaluate(() => { zakaznikZavri(); });

/* ---- kap. 8: Přehled cenových nabídek, otevření zakázky ---- */
krok('kap. 8: přehled a otevření zakázky');
await zalozka('kalk');
await vezmi('k8-tlacitko-prehled', '#page-kalk .card.zak-bar');
await zalozka('zakazka');
await cekej(600);
await vezmi('k8-hledani', () => {
  const h = [...document.querySelectorAll('#page-zakazka h2')].find(x => /Vyhledání nabídek/.test(x.textContent));
  return h && h.closest('.card');
});
/* Otevření uložené zakázky 9100 — otevírá se jen ke čtení a nad ní je žlutá
 * lišta rozpracované kalkulace. */
await page.evaluate(async (c) => {
  const r = (ONLINE_STAV.rejstrik || []).find(x => (x.cislo || '') === c);
  if (r && r.soubor) await onlineOtevri(r.soubor);
}, ZAKAZKY.hlavni.cislo);
await cekej(800);
await zalozka('kalk');
await vezmi('k8-rozpracovana-lista', '#obnovaLista');
await vezmi('k8-souhrn-varianty', () => {
  prepniTab('zakazka'); render();
  const h = [...document.querySelectorAll('#page-zakazka h2')].find(x => /Kalkulace v zakázce/.test(x.textContent));
  return h && h.closest('.card');
});
await vezmi('k8-soubor', () => {
  const h = [...document.querySelectorAll('#page-zakazka h2')].find(x => /Zakázka jako soubor/.test(x.textContent));
  return h && h.closest('.card');
});
await page.evaluate(() => { listaPokracujUI(); });
await cekej(400);
/* Odeslaná nabídka: zakázka 9102 má vytištěnou (zamčenou) variantu. */
await page.evaluate(async (c) => {
  const r = (ONLINE_STAV.rejstrik || []).find(x => (x.cislo || '') === c);
  if (r && r.soubor) await onlineOtevri(r.soubor);
}, ZAKAZKY.zaskleni.cislo);
await cekej(800);
await zalozka('kalk');
await vezmi('k8-odeslana-lista', '#zamekLista');
/* Zpět na ukázkovou 9100 a odemknout ji (pokračovat v rozpracované). */
await page.evaluate(async (c) => {
  const r = (ONLINE_STAV.rejstrik || []).find(x => (x.cislo || '') === c);
  if (r && r.soubor) await onlineOtevri(r.soubor);
}, ZAKAZKY.hlavni.cislo);
await cekej(800);
await page.evaluate(() => { listaPokracujUI(); });
await cekej(400);

/* ---- kap. 9: ČR / Zahraničí ---- */
krok('kap. 9: ceník Zahraničí');
await zalozka('kalk');
await vezmi('k9-cr', '#page-kalk .card.zak-bar');
await sDialogem('k9-dialog', "() => cenikRadaPrepniUI('zahr')", 'ano');
await page.evaluate(() => render());
await cekej(300);
await vezmi('k9-zahranici', '#page-kalk .card.zak-bar');
/* Zpět do ČR, ať další snímky ukazují tuzemskou zakázku. */
await page.evaluate(() => cenikRadaPrepniUI('cr'));   // náhrada dialogu odpoví „ano"
await cekej(300);
await uloz();


/* Otevře uloženou zakázku podle čísla a odemkne ji (Pokračovat v rozpracované). */
const otevriZakazku = async (cislo) => {
  await page.evaluate(async (c) => {
    const r = (ONLINE_STAV.rejstrik || []).find(x => (x.cislo || '') === c);
    if (r && r.soubor) await onlineOtevri(r.soubor);
  }, cislo);
  await cekej(800);
  await page.evaluate(() => { try { listaPokracujUI(); } catch (e) { /* nic */ } });
  await cekej(400);
};
const KARTA = (h2re) => new Function('return (function () { var h = [].slice.call(document.querySelectorAll("h2"))'
  + '.filter(function (x) { return x.offsetParent && ' + h2re + '.test(x.textContent); })[0];'
  + ' return h && h.closest(".card"); })()');
const SEKCE = (rodic, od, po) => new Function('return vyrezSekce(' + JSON.stringify(rodic) + ', '
  + JSON.stringify(od) + ', ' + JSON.stringify(po || '') + ')');

/* ---- kap. 10: Kalkulace OCK — záložky a lišta sekcí ---- */
krok('kap. 10: kalkulace OCK');
await otevriZakazku(ZAKAZKY.hlavni.cislo);
await zalozka('kalk');
await vezmi('k10-lista-sekci', '#page-kalk .kalk-lista');

/* ---- kap. 11: Zadání šachty ---- */
krok('kap. 11: zadání šachty');
await vezmi('k11-zadani', '#ock-zadani');
await page.evaluate(() => { nadDvermiSet('sklo'); mustkySet(2); render(); });
await cekej(300);
await vezmi('k11-zadani-mustky', '#ock-zadani');
await page.evaluate(() => { nadDvermiSet('plech'); mustkySet(1); render(); });

/* ---- kap. 12: průchozí šachta (před zaškrtnutím = k11-zadani) ---- */

/* ---- kap. 13: zasklení a opláštění po stěnách ---- */
krok('kap. 13: opláštění po stěnách');
await page.evaluate(() => { oplRezimSet('poStenach'); render(); });
await cekej(400);
await vezmi('k13-steny', '#ock-oplasteni-steny');
await page.evaluate(() => {
  const ch = [...document.querySelectorAll('#ock-oplasteni-steny input[type=checkbox]')]
    .find(i => /po celé výšce/.test((i.closest('label') || i.parentElement || {}).textContent || ''));
  if (ch && ch.checked) ch.click();
});
await cekej(400);
await vezmi('k13-steny-pasy', '#ock-oplasteni-steny');
await page.evaluate(() => { oplRezimSet('standard'); render(); });
await cekej(300);

/* ---- kap. 14: ATYP a Standard OCK ---- */
krok('kap. 14: ATYP');
await page.evaluate(() => { set('Z.rohoveSloupky', 5); render(); });
await cekej(400);
/* Štítek standardu stojí vpravo v liště sekcí nad kalkulací. */
await vezmi('k14-lista-atyp', '#page-kalk .kalk-lista');
await page.evaluate(() => { if (!STD_ROZPIS) standardRozpisPrepni(); });
await cekej(300);
await vezmi('k14-rozpis-atyp', '#kalk-souhrn');
await page.evaluate(() => { if (STD_ROZPIS) standardRozpisPrepni(); set('Z.rohoveSloupky', 4); atypPrepni(false); render(); });
await cekej(300);

/* ---- kap. 15 a 16: volitelné položky a přechodové plechy ---- */
krok('kap. 15 a 16: volitelné a plechy');
await page.evaluate(() => { set('Z.prechodovePlechy', false); render(); });
await cekej(200);
await vezmi('k16-zadani-plechy', '#ock-zadani');

/* ---- kap. 17 a 18: příplatky, vlastní položka, vypnutý řádek ---- */
krok('kap. 17 a 18: příplatky a vlastní položka');
/* Jen začátek tabulky příplatků (hlavička a první čtyři položky s řádkem
 * dodatkového textu) — celá tabulka měří skoro 2 000 px. */
const PRVNI_RADKY = (n) => "[].slice.call(klon.querySelectorAll('tr')).forEach(function (t, i) { if (i > " + n + ") t.remove(); });";
await vezmi('k17-priplatky', '#ock-priplatky', { uprav: PRVNI_RADKY(8) });
const VYREZ_REZIE = "S.vyrez(klon, '^\\\\s*REŽIE', 'REŽIE CELKEM');";
await vezmi('k18-pred', '#ock-kalkulace table', { uprav: VYREZ_REZIE });
await page.evaluate(() => {
  vlastniAdd('rezie');
});
await cekej(300);
await vezmi('k18-vlastni-polozka', '#ock-kalkulace table', { uprav: VYREZ_REZIE });

/* ---- kap. 19: sleva ---- */
krok('kap. 19: sleva');
await page.evaluate(() => { slevaSet('schema', 'standard'); slevaSet('procenta', 3); render(); });
await cekej(300);
await vezmi('k19-sleva-auto', '#ock-sleva');
await page.evaluate(() => { slevaSet('procenta', 6); render(); });
await cekej(300);
await vezmi('k19-sleva-zadost', '#ock-sleva');
await page.evaluate(() => { slevaZrus(); render(); });

/* ---- kap. 20: zaokrouhlení ---- */
krok('kap. 20: zaokrouhlení');
await vezmi('k20-zaokrouhleni', '#ock-zaokr');

/* ---- kap. 21: smluvní a platební podmínky ---- */
krok('kap. 21: podmínky');
await vezmi('k21-podminky', () => {
  const b = document.querySelector('#page-kalk .kl-podminky-ock');
  return b && b.closest('.card');
});

/* ---- kap. 23: cenová nabídka, kontroly, tisk ---- */
krok('kap. 23: nabídka a tisk');
await vezmi('k23-karta-nabidka', SEKCE('#ock-nabidka > .body', 'Přejít na technickou specifikaci', ''));
await zalozka('spec');
await vezmi('k23-spec-nabidka', KARTA('/Cenová nabídka \\(OCK\\)/'));

/* ---- kap. 24: krycí list a smlouva o dílo ---- */
krok('kap. 24: krycí list');
await zalozka('kryci');
await vezmi('k24-zakladni-udaje', SEKCE('#page-kryci .kl-doc', 'Základní údaje', 'Dodavatel'));
await vezmi('k24-zastupci', SEKCE('#page-kryci .kl-doc', 'Zástupci a kontakty zákazníka', 'Typ smlouvy'));
await vezmi('k24-sod-realizace', SEKCE('#page-kryci .kl-doc', 'Smlouva o dílo \\(SoD realizace\\)', 'Ostatní'));
await vezmi('k24-sod-karta', KARTA('/Smlouva o dílo \\(OCK\\)/'));

/* ---- kap. 25: kalkulace PROJ (zakázka 9104, číslo OVP) ---- */
krok('kap. 25: kalkulace PROJ');
await zalozka('proj');
await vezmi('k25-zamek-strany', '#page-proj .zamek-lista[data-strana-vyrazena="proj"]');
await otevriZakazku(ZAKAZKY.projekce.cislo);
await zalozka('proj');
await vezmi('k25-volby', () => {
  const i = document.querySelector('#projAkceMimoPrahu');
  return i && i.closest('.card');
});
/* Z kalkulace PROJ jen první dvě sekce (Zaměření, Studie). */
await vezmi('k25-kalkulace', '#proj-kalkulace', { uprav:
  "var tr = [].slice.call(klon.querySelectorAll('tr')); var k = tr.findIndex(function (t) { return t.id === 'proj-sek-2'; });"
  + " if (k > 0) tr.slice(k).forEach(function (t) { t.remove(); });" });
await vezmi('k25-nabidka-volby', SEKCE('#proj-nabidka > .body', 'Nabízet autorský dozor', 'Úvodní fotka nabídky'));
await vezmi('k25-nabidka-tisk', SEKCE('#proj-nabidka > .body', 'Než nabídku odešlete|Kompletní náhled a tisk nabídky', 'centrální šablon'));

/* Kapitola 27 používá snímek poznamky-prilohy z ukázkové zakázky. */


/* ---- kap. 30 (administrátor) a kap. 22 (dialog po změně ceníku) ----
 *
 * Obojí potřebuje jiné přihlášení: Nastavení → Databáze vidí jen
 * administrátor a dialog „Ceník se od posledního uložení změnil" se objeví
 * obchodníkovi, když mezitím vyšel nový ceník. Každé přihlášení stránku
 * načte znovu, proto se hotové snímky nejdřív odloží. */
krok('kap. 30: Nastavení → Databáze (administrátor)');
await odloz();
await page.evaluate(() => onlineOdhlas());
await page.waitForFunction(() => { try { return ONLINE_STAV.ja === null; } catch (e) { return false; } });
await nacti();
await prihlas('spravce@priklad.cz', 'Zkusebni.Heslo.123');
await page.addScriptTag({ content: SNIMAC_JS });
/* Jméno účtu správce dosazuje server (skutečné) a hlavička karty nese adresu
 * místního serveru — na snímku se nahradí vymyšleným jménem a adresou webu. */
const ANON_SPRAVCE = "klon.innerHTML = klon.innerHTML.replace(/Jaroslav Vendl/g, 'Správce Ukázkový')"
  + ".replace(/127\\.0\\.0\\.1:\\d+/g, 'engscalc.netlify.app');";
await page.evaluate(() => { otevriNastaveni(); nastPanel('databaze'); });
await cekej(800);
await vezmi('k30-zalozky', () => {
  const b = [...document.querySelectorAll('#nastaveni-panel button')].find(x => x.textContent.trim() === 'Databáze');
  return b && b.parentElement;
}, { admin: true });
await vezmi('k30-online-pred', KARTA('/Online databáze/i'), { admin: true, uprav: ANON_SPRAVCE });
/* Vynucená záloha má odstup 10 minut a jedna vznikla při přihlášení
 * správce — serverovým funkcím (běží tady v Node) se proto posunou hodiny,
 * jinak by snímek ukázal jen „Zálohu teď pořídit nejde". */
const datumNyni = Date.now;
Date.now = () => datumNyni() + 11 * 60 * 1000;
await page.evaluate(() => onlineZalohaTed());
Date.now = datumNyni;
await cekej(800);
await vezmi('k30-online-po', KARTA('/Online databáze/i'), { admin: true, uprav: ANON_SPRAVCE });
await page.evaluate(() => zavriNastaveni());
krok('nový ceník (zdražená montáž) pro dialog v kapitole 22');
await zverejniCenik(1.1);
await odloz();
await page.evaluate(() => onlineOdhlas());
await page.waitForFunction(() => { try { return ONLINE_STAV.ja === null; } catch (e) { return false; } });

krok('kap. 22: dialog Ceník se od posledního uložení změnil');
await nacti();
/* Pravé dialogy hned od přihlášení: aplikace po přihlášení sama otevře
 * zakázku, na které se naposledy pracovalo, a dialog může vyskočit už tam. */
await page.evaluate(() => { Object.assign(window, window.__dlgPuv); });
await page.addScriptTag({ content: SNIMAC_JS });
await prihlas(OBCHODNIK.email, OBCHODNIK.heslo);
/* Jiné dialogy (rozpracovaná práce v prohlížeči, neuložené změny) se
 * odklepnou cestou „zahodit" — fotí se jen dialog o přepočtu ceníku. */
const odklepniJiny = async () => {
  const kod = await page.evaluate(() => {
    const d = document.querySelector('#dlg');
    if (!d) return null;
    if (/Ceník se od posledního uložení změnil/.test(d.textContent)) return 'cenik';
    const b = [...d.querySelectorAll('button')];
    const t = b.find(x => /Zahodit/.test(x.textContent)) || b.find(x => x.dataset.dlg === 'ne') || b[0];
    t.click();
    return 'jiny';
  });
  return kod;
};
await cekej(1500);
for (let i = 0; i < 4 && await odklepniJiny() === 'jiny'; i++) await cekej(500);
await page.evaluate((c) => {
  const r = (ONLINE_STAV.rejstrik || []).find(x => (x.cislo || '') === c);
  if (r && r.soubor) setTimeout(() => onlineOtevri(r.soubor), 0);
}, ZAKAZKY.hlavni.cislo);
let dialog22 = false;
for (let i = 0; i < 5 && !dialog22; i++) {
  await page.waitForSelector('#dlg .dlg-box', { timeout: 6000 }).catch(() => {});
  const k = await odklepniJiny();
  if (k === 'cenik') dialog22 = true;
  else if (k === null) break;
  else await cekej(500);
}
if (dialog22) {
  await cekej(200);
  await vezmi('k22-dialog-cenik', '#dlg .dlg-box');
  await page.click('#dlg [data-dlg="v0"]');
} else { pozadovane.push('k22-dialog-cenik'); console.log('  ✕ k22-dialog-cenik — dialog se neobjevil'); }
await cekej(500);
await dlgStub();

/* ---------- odevzdání ---------- */

const data = await page.evaluate(() => SNIMAC.data());
data.snimky.push(...ODLOZENE.filter(o => !data.snimky.some(s => s.id === o.id)));
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
