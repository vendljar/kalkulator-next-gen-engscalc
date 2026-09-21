/* Lokální test online databáze (mimo Netlify): náhradní úložiště v paměti,
 * TAJEMSTVI_RELACE a ADMIN_INIT_HESLO jen pro tenhle běh testu. */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
    .map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

import prihlaseni from './functions/prihlaseni.mjs';
import ja from './functions/ja.mjs';
import uzivatele from './functions/uzivatele.mjs';
import program from './functions/program.mjs';
import firma from './functions/firma.mjs';
import zakazky from './functions/zakazky.mjs';
import zaloha from './functions/zaloha.mjs';
import analytika from './functions/analytika.mjs';
import zalohaNocni from './functions/zaloha_nocni.mjs';
import zalohaVynuceno from './functions/zaloha_vynuceno.mjs';
import { ADMIN_EMAIL } from './lib/sdilene.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const zk = require('../src/zakazka.js');
const ZC = require('../src/zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info || ''); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST',
  headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));

/* 0) BALENÍ FUNKCÍ — proč tahle sada existuje
 *
 * 4. 8. 2026 hlásila nasazená aplikace „Neuloženo online: server odpověděl 502"
 * při každém uložení zakázky. Testy přitom byly zelené, protože Node si moduly
 * najde na disku sám. Netlify ale funkci před nasazením ZABALÍ (esbuild) do
 * jednoho souboru a s sebou vezme jen to, co dokáže v kódu vystopovat. Vzor
 *
 *     const require = createRequire(import.meta.url);
 *     require('../../src/engine.js');
 *
 * vystopovat nelze: `require` je tu obyčejná proměnná, ne příkaz bundleru.
 * Zdrojáky se do balíčku nedostaly, funkce spadla už při načtení a Netlify
 * vrátilo holou 502 – bez jediné české věty, na které by se dalo stavět.
 * Padly tak všechny čtyři funkce s tímhle vzorem (/api/zakazky, /api/program,
 * /api/firma, /api/vypocet), zatímco zálohy a účty, které zdrojáky nepotřebují,
 * běžely dál. Odtud i ta matoucí zpráva „zálohy fungují, ukládání ne".
 *
 * Kontroly níž hlídají, aby se to nemohlo vrátit: v serverovém kódu nesmí být
 * ani jeden `createRequire`, jádro se natahuje jediným místem (jadro_moduly.cjs,
 * kde je `require` skutečný příkaz CommonJS a bundler ho vystopuje) a všechny
 * cesty v něm musí na disku existovat. */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOREN = dirname(fileURLToPath(import.meta.url));
const serverovéSoubory = [
  ...readdirSync(resolve(KOREN, 'functions')).filter(f => f.endsWith('.mjs')).map(f => 'functions/' + f),
  ...readdirSync(resolve(KOREN, 'lib')).filter(f => /\.(mjs|cjs)$/.test(f)).map(f => 'lib/' + f),
];

/* Komentáře se před kontrolou odstraní. Bez toho by kontrola hlásila i soubory,
 * které o starém vzoru jen VYPRAVUJÍ – a právě takové tu jsou dva: rozbor chyby
 * v lib/jadro_moduly.cjs a poznámka v functions/vypocet.mjs. Vysvětlení chyby
 * je cenné a nesmí ho test tlačit ven; hlídá se skutečný kód. */
const bezKomentaru = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, ' ')      // blokové komentáře
  .replace(/^\s*\/\/.*$/gm, ' ');         // řádkové komentáře na začátku řádku

const kodSouboru = new Map(serverovéSoubory.map(
  f => [f, bezKomentaru(readFileSync(resolve(KOREN, f), 'utf8'))]));

const sCreateRequire = serverovéSoubory.filter(f => /createRequire/.test(kodSouboru.get(f)));
test('žádná serverová funkce nesahá na zdrojáky přes createRequire (bundler to neuveze)',
  sCreateRequire.length === 0, sCreateRequire.join(', '));

/* Pojistka na pojistku: kontrola výš by byla k ničemu, kdyby `bezKomentaru`
 * omylem vymazalo i kód. Na známém vzorku se ověří, že maže jen komentáře. */
test('odstraňovač komentářů nechává kód být',
  bezKomentaru('/* a */ const x = 1; // b\n  // c\n  const y = 2;').includes('const x = 1;')
  && bezKomentaru('/* a */ const x = 1;\n  // c\n  const y = 2;').includes('const y = 2;')
  && !bezKomentaru('/* createRequire */ const x = 1;').includes('createRequire'));

test('jádro pro server je na jednom místě (lib/jadro_moduly.cjs)',
  existsSync(resolve(KOREN, 'lib/jadro_moduly.cjs')));

/* Studený start (21. 8. 2026): funkce, která z jádra potřebuje jeden malý
 * modul, si nesmí tahat celé jádro. `jadro_moduly.cjs` natáhne engine,
 * preklad (110 kB), docxgen a dalších třicet souborů — u /api/zakaznici to
 * znamenalo vteřiny čekání na prázdný seznam. */
test('/api/zakaznici si netahá celé jádro (studený start)',
  !/jadro\.mjs/.test(kodSouboru.get('functions/zakaznici.mjs') || '')
  && /zakaznici_modul\.cjs/.test(kodSouboru.get('functions/zakaznici.mjs') || ''));

/* Všechny relativní cesty, na které serverový kód sahá – ať už importem
 * nebo requirem – musí existovat. Překlep v cestě se jinak pozná až
 * v nasazení, a zase jako 502 bez vysvětlení. */
let cestKontrolovano = 0;
for (const f of serverovéSoubory) {
  const text = kodSouboru.get(f);
  for (const m of text.matchAll(/(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"](\.[^'"]+)['"]/g)) {
    cestKontrolovano++;
    test('cesta ' + m[1] + ' z ' + f + ' existuje',
      existsSync(resolve(KOREN, dirname(f), m[1])));
  }
}
test('relativní cesty se opravdu kontrolovaly (našlo se jich víc než deset)', cestKontrolovano > 10, cestKontrolovano);

/* Každá funkce musí vyvézt obsluhu a adresu (nebo rozvrh u noční dávky).
 * Funkce bez `path` se nedá zavolat, funkce bez `default` se nedá spustit. */
for (const jm of readdirSync(resolve(KOREN, 'functions')).filter(f => f.endsWith('.mjs'))) {
  const mod = await import('./functions/' + jm);
  test(jm + ' vyváží obsluhu i nastavení',
    typeof mod.default === 'function' && !!(mod.config && (mod.config.path || mod.config.schedule)));
}

/* 1) bez přihlášení nikam */
test('program bez přihlášení odmítnut', (await get(program, 'http://x/api/program')).status === 401);
test('zakázky bez přihlášení odmítnuty', (await get(zakazky, 'http://x/api/zakazky')).status === 401);

/* 2) první přihlášení administrátora (bootstrap z prostředí) */
const spatne = await post(prihlaseni, 'http://x/api/prihlaseni', { email: ADMIN_EMAIL, heslo: 'jine' });
test('špatné heslo odmítnuto', spatne.status === 401);
const r1 = await post(prihlaseni, 'http://x/api/prihlaseni', { email: ADMIN_EMAIL, heslo: 'Docasne.Heslo.123' });
const o1 = await r1.json();
test('bootstrap administrátora funguje', o1.ok && o1.role === 'Administrátor', JSON.stringify(o1));
const cookie = (r1.headers.get('set-cookie') || '').split(';')[0];
test('relace se vydala v cookie', cookie.startsWith('relace='));
test('/api/ja zná přihlášeného', (await (await get(ja, 'http://x/api/ja', cookie)).json()).email === ADMIN_EMAIL);

/* 3) uživatelé: založení obchodníka + jeho omezená práva */
const z1 = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'obchodnik@priklad.cz', jmeno: 'Test Obchodník', role: 'Obchodník', heslo: 'ObchodHeslo1' }, cookie)).json();
test('administrátor založí účet', z1.ok === true, JSON.stringify(z1));
const r2 = await post(prihlaseni, 'http://x/api/prihlaseni', { email: 'obchodnik@priklad.cz', heslo: 'ObchodHeslo1' });
let cookieObch = (r2.headers.get('set-cookie') || '').split(';')[0];
test('obchodník se přihlásí', (await r2.json()).role === 'Obchodník');
test('obchodník NEspravuje uživatele', (await get(uzivatele, 'http://x/api/uzivatele', cookieObch)).status === 403);
test('obchodník NEzaloží účet (POST admin akce)', (await post(uzivatele, 'http://x/api/uzivatele',
  { akce: 'zaloz', email: 'x@y.cz', role: 'Obchodník', heslo: 'HesloHeslo1' }, cookieObch)).status === 403);

/* 3b) vlastní heslo: každý přihlášený, ale jen se znalostí starého */
test('změna vlastního hesla se ŠPATNÝM starým heslem se odmítne',
  (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'mojeheslo', stare: 'spatne', nove: 'NoveHeslo123' }, cookieObch)).status === 401);
test('příliš krátké nové heslo se odmítne',
  (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'mojeheslo', stare: 'ObchodHeslo1', nove: 'kratke' }, cookieObch)).status === 400);
const mhOdp = await post(uzivatele, 'http://x/api/uzivatele', { akce: 'mojeheslo', stare: 'ObchodHeslo1', nove: 'NoveHeslo123' }, cookieObch);
const mh = await mhOdp.json();
test('obchodník si změní vlastní heslo', mh.ok === true, JSON.stringify(mh));
/* Změna hesla zneplatní dosavadní relace (B6, 22. 8. 2026) — prohlížeč
 * převezme novou cookie z odpovědi, sada taky. */
cookieObch = (mhOdp.headers.get('set-cookie') || '').split(';')[0] || cookieObch;
test('staré heslo už neplatí', (await post(prihlaseni, 'http://x/api/prihlaseni', { email: 'obchodnik@priklad.cz', heslo: 'ObchodHeslo1' })).status === 401);
test('novým heslem se přihlásí', (await (await post(prihlaseni, 'http://x/api/prihlaseni', { email: 'obchodnik@priklad.cz', heslo: 'NoveHeslo123' })).json()).ok === true);
/* administrátorský reset zpátky (bez znalosti starého — to je jeho role) */
test('administrátor resetuje heslo bez znalosti starého',
  (await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'heslo', email: 'obchodnik@priklad.cz', heslo: 'ObchodHeslo1' }, cookie)).json()).ok === true);
const poResetu = await post(prihlaseni, 'http://x/api/prihlaseni', { email: 'obchodnik@priklad.cz', heslo: 'ObchodHeslo1' });
test('po resetu platí heslo od administrátora', (await poResetu.clone().json()).ok === true);
cookieObch = (poResetu.headers.get('set-cookie') || '').split(';')[0] || cookieObch;   // reset odhlásil starou relaci (B6)

/* 4) program: zveřejnění (admin) a čtení (obchodník) */
const pub = await (await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(), slevy: { minMarze: 0.1, maxGlobalni: 0.3, stropy: { 'Obchodník': 0.05 } }, poznamka: 'první online verze' }, cookie)).json();
test('administrátor zveřejní ceník (verze 1)', pub.ok && pub.verze === 1, JSON.stringify(pub));
test('obchodník ceník zveřejnit NEsmí', (await post(program, 'http://x/api/program', { cenik: {} }, cookieObch)).status === 403);
const cteni = await (await get(program, 'http://x/api/program', cookieObch)).json();
test('obchodník platný ceník přečte', cteni.ok && cteni.db.platny.verze === 1);
const pub2 = await (await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(), slevy: { minMarze: 0.1, maxGlobalni: 0.3, stropy: { 'Obchodník': 0.05 } } }, cookie)).json();
test('beze změny se nezveřejňuje', pub2.ok === false, JSON.stringify(pub2));
const cen2 = ZC.zkusebniCenik(); cen2.profilKgKc = (cen2.profilKgKc || 0) + 1;
const pub3 = await (await post(program, 'http://x/api/program', { cenik: cen2, cenikProj: ZC.zkusebniCenikProj(), slevy: { minMarze: 0.1 } }, cookie)).json();
test('změna ceny → verze 2 a stará verze do historie', pub3.ok && pub3.verze === 2, JSON.stringify(pub3));

/* 4b) firemní údaje online (4. 8. 2026) — obchodník složku _DB nemapuje,
 * takže skutečnou hlavičku nabídky má odkud vzít jen ze serveru. */
const fmod = require('../src/firma.js');
test('firma bez přihlášení odmítnuta', (await get(firma, 'http://x/api/firma')).status === 401);
const fPrazdno = await (await get(firma, 'http://x/api/firma', cookieObch)).json();
test('dokud nikdo nezveřejnil, vrací se prázdno', fPrazdno.ok === true && fPrazdno.firma === null, JSON.stringify(fPrazdno));
const fUkazkova = await post(firma, 'http://x/api/firma', { udaje: fmod.firmaDefault() }, cookie);
test('ukázkovou firmu server zveřejnit nenechá', fUkazkova.status === 400);
test('a řekne proč', /ukázkov/i.test((await fUkazkova.json()).chyba || ''));
const SKUT = fmod.firmaDefault(); delete SKUT.ukazkove;
SKUT.nazev = 'Zkušební firma pro test s.r.o.'; SKUT.ico = '12345678';
test('obchodník firmu zveřejnit NEsmí',
  (await post(firma, 'http://x/api/firma', { udaje: SKUT }, cookieObch)).status === 403);
const dira = JSON.parse(JSON.stringify(SKUT)); dira.telefon = '';
test('firma bez povinného pole se odmítne',
  (await post(firma, 'http://x/api/firma', { udaje: dira }, cookie)).status === 400);
const fPub = await (await post(firma, 'http://x/api/firma', { udaje: SKUT }, cookie)).json();
test('administrátor firmu zveřejní', fPub.ok === true && !!fPub.kdy, JSON.stringify(fPub));
const fCteni = await (await get(firma, 'http://x/api/firma', cookieObch)).json();
test('obchodník si firmu přečte', fCteni.ok && fCteni.firma.udaje.nazev === SKUT.nazev, JSON.stringify(fCteni.firma));
test('zveřejněná firma nese, kdo a kdy',
  fCteni.firma.kdo === ADMIN_EMAIL && /^\d{4}-\d{2}-\d{2}T/.test(fCteni.firma.kdy));
test('zveřejněná firma nenese značku ukázkových dat', fCteni.firma.udaje.ukazkove === undefined);

/* 5) zakázky: uložení, rejstřík, načtení, ochrana zámku */
Object.assign(globalThis, require('../src/format.js'), require('../src/engine.js'), require('../src/engine_proj.js'), require('../src/techspec.js'), require('../src/sleva.js'), require('../src/zaokrouhleni.js'), require('../src/zamek.js'));
const zm = require('../src/zamek.js');
const zak = zk.novaZakazka(); zak.cislo = '2026 - OPR - CN - 0777'; zak.nazevAkce = 'Online test';
const ul1 = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: zak }, cookieObch)).json();
test('zakázka se uloží online', ul1.ok === true && !!ul1.soubor, JSON.stringify(ul1));
const rej = await (await get(zakazky, 'http://x/api/zakazky', cookieObch)).json();
test('rejstřík zakázku eviduje', rej.ok && rej.rejstrik.zakazky.length === 1 && rej.rejstrik.zakazky[0].soubor === ul1.soubor);
const nact = await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(ul1.soubor), cookieObch)).json();
test('zakázka se načte zpět beze změny čísla', nact.ok && nact.zakazka.cislo === zak.cislo);
zm.zamkniVariantu(zak.varianty[0], { typ: 'nabidka', kdy: new Date().toISOString(), kdo: 'Test' });
await post(zakazky, 'http://x/api/zakazky', { zakazka: zak }, cookieObch);   // uložit se zámkem
const zakUtok = JSON.parse(JSON.stringify(zak));
zakUtok.varianty[0].data.ock.zadani.sirka = 9.99;                            // pokus změnit odeslanou nabídku
const utok = await post(zakazky, 'http://x/api/zakazky', { zakazka: zakUtok }, cookieObch);
test('uzamčená (odeslaná) nabídka se nepřepíše', utok.status === 409);

/* 6) záloha: jen admin, obsahuje program i zakázky, bez otisků hesel */
test('záloha jen pro administrátora', (await get(zaloha, 'http://x/api/zaloha', cookieObch)).status === 403);
const zal = await (await get(zaloha, 'http://x/api/zaloha', cookie)).json();
test('záloha nese program, rejstřík i zakázky', zal.ok && zal.zaloha.program.platny.verze === 2
  && Object.keys(zal.zaloha.zakazky).length === 1 && zal.zaloha.rejstrik.zakazky.length === 1);
test('záloha nese i firemní údaje', !!zal.zaloha.firma && zal.zaloha.firma.udaje.nazev === SKUT.nazev,
  JSON.stringify(zal.zaloha.firma));
test('záloha neobsahuje otisky hesel', !JSON.stringify(zal.zaloha.uzivatele).includes(':')
  || zal.zaloha.uzivatele.every(u => !u.heslo));

/* 7) noční otisk: pořizuje se sám a pod dnešním datem nese úplnou databázi
 * (na rozdíl od zálohy pro Disk VČETNĚ otisků hesel — zůstává v Blobs,
 * aby obnova nevyžadovala reset všech hesel) */
const noc = await (await zalohaNocni()).json();
test('noční otisk proběhne a vrátí dnešní den', noc.ok && noc.den === new Date().toISOString().slice(0, 10));
const otisk = await (await globalThis.__TEST_ULOZISTE('zalohy')).cti(noc.den);
test('otisk nese program, zakázky i rejstřík', !!otisk && otisk.program.platny.verze === 2
  && Object.keys(otisk.zakazky).length === 1 && otisk.rejstrik.zakazky.length === 1);
test('noční otisk nese i firemní údaje', !!otisk.firma && otisk.firma.udaje.ico === SKUT.ico);
test('otisk nese celé účty (obnova bez resetu hesel)', Array.isArray(otisk.uzivatele)
  && otisk.uzivatele.length === 2 && otisk.uzivatele.every(u => typeof u.heslo === 'string' && u.heslo.includes(':')));

/* 8) VYNUCENÁ záloha (zadání 4. 8. 2026 – „proč nefunguje automatické ani
 * vynucené online zálohování"). Noční otisk se do 4. 8. spouštět ručně
 * NEDAL: zaloha_nocni.mjs vyváží jen `schedule`, žádnou cestu, takže
 * neexistoval endpoint, kterým by šel vyvolat, ani způsob, jak zjistit,
 * jestli kdy proběhl. Otisk proto pořizuje sdílená knihovna a vedle
 * plánované funkce stojí obyčejná cesta pro administrátora. */
test('vynucená záloha jen pro administrátora',
  (await post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', {}, cookieObch)).status === 403);
test('seznam otisků jen pro administrátora',
  (await get(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', cookieObch)).status === 403);
const vyn = await (await post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', {}, cookie)).json();
test('administrátor vynutí otisk', vyn.ok === true && vyn.den === new Date().toISOString().slice(0, 10), JSON.stringify(vyn));
test('vynucený otisk hlásí, kolik zakázek uložil', vyn.pocetZakazek === 1, JSON.stringify(vyn));
const vynOtisk = await (await globalThis.__TEST_ULOZISTE('zalohy')).cti(vyn.den);
test('vynucený otisk nese celou databázi', !!vynOtisk && vynOtisk.program.platny.verze === 2
  && Object.keys(vynOtisk.zakazky).length === 1 && !!vynOtisk.firma);
test('vynucený otisk je poznat od nočního podle zdroje',
  typeof vynOtisk.zdroj === 'string' && vynOtisk.zdroj.includes('vynuc'), vynOtisk && vynOtisk.zdroj);
test('vynucený otisk nese, kdo ho pořídil', vynOtisk.kdo === ADMIN_EMAIL, vynOtisk && vynOtisk.kdo);
const seznamOt = await (await get(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', cookie)).json();
test('seznam otisků vrátí dnešní zálohu', seznamOt.ok && seznamOt.otisky.length >= 1
  && seznamOt.otisky[0].den === vyn.den, JSON.stringify(seznamOt));
test('seznam otisků nese zdroj i čas pořízení',
  !!seznamOt.otisky[0].porizena && !!seznamOt.otisky[0].zdroj);
/* Seznam je hlášení pro obrazovku, ne záloha sama – nesmí z Blobs vytáhnout
 * data zakázek ani otisky hesel (jinak by stačilo otevřít vývojářskou
 * konzoli a číst celou databázi jedním požadavkem). */
const seznamText = JSON.stringify(seznamOt);
test('seznam otisků neveze data zakázek', !seznamText.includes('Online test'), seznamText.slice(0, 200));
test('seznam otisků neveze otisky hesel', !seznamText.includes('heslo'), seznamText.slice(0, 200));
test('seznam otisků nese jen souhrn (den, čas, zdroj, počty)',
  Object.keys(seznamOt.otisky[0]).every(k => ['den', 'porizena', 'zdroj', 'kdo', 'pocetZakazek', 'pocetUctu'].includes(k)),
  Object.keys(seznamOt.otisky[0]).join(','));

/* ============================================================
 * ADRESA HLAVNÍHO ADMINISTRÁTORA JEN NA JEDNOM MÍSTĚ (#95, 9. 8. 2026)
 *
 * Do 8. 8. 2026 byla adresa napsaná dvakrát: na serveru v `ADMIN_EMAIL`,
 * kde ji server vymáhá, a znovu v prohlížeči v `online_ui.js`, kde jen
 * rozhodovala, že se hlavní účet nedá zbavit role ani vypnout. Nebyla to
 * díra — server si pojistku hlídá sám. Byla to past na údržbu: kdyby se
 * adresa změnila na jednom místě a na druhém ne, choval by se prohlížeč
 * jinak než server a nikdo by nepoznal proč.
 *
 * Kontrola prochází zdrojáky aplikace i serveru (testy vynechává, ty se
 * musí umět přihlásit) a trvá na jediném výskytu.
 * ============================================================ */

const KOREN_PROJEKTU = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PRESKOCIT = /(^|\/)(node_modules|dist|_soukrome|\.git|deploy|navrh)(\/|$)|(^|\/)(test_|overit_|snimky_|mutace\.mjs)/;

function projdi(slozka, nalezy) {
  for (const jmeno of readdirSync(slozka)) {
    const cesta = join(slozka, jmeno);
    const rel = cesta.slice(KOREN_PROJEKTU.length + 1);
    if (PRESKOCIT.test(rel)) continue;
    if (statSync(cesta).isDirectory()) { projdi(cesta, nalezy); continue; }
    if (!/\.(js|mjs|json|html|toml|py)$/.test(jmeno)) continue;
    const obsah = readFileSync(cesta, 'utf8');
    const kolik = obsah.split(ADMIN_EMAIL).length - 1;
    if (kolik) nalezy.push(rel + ' (' + kolik + 'x)');
  }
  return nalezy;
}

/* OD 16. 9. 2026 UŽ ADRESA VE ZDROJÍCH NENÍ VŮBEC. Repozitář je veřejně
 * čitelný, takže konstanta v kódu byla zároveň osobní údaj vystavený komukoliv
 * a návod, na který účet útočit. Bere se z proměnné prostředí — a tenhle test
 * je hlídka, aby se tam nevrátila zpátky.
 *
 * Prázdná hodnota by z kontroly udělala nesmysl: `split('')` rozseká soubor
 * po znacích a „našel by se“ úplně všude. Bez nastavené proměnné se proto
 * neporovnává, jen se to nahlásí. */
const vyskyty = [];
if (ADMIN_EMAIL) {
  for (const kde of ['src', 'netlify', 'server']) projdi(join(KOREN_PROJEKTU, kde), vyskyty);
}
test('proměnná ADMIN_EMAIL je pro běh testů nastavená',
  !!ADMIN_EMAIL, 'nastavte ADMIN_EMAIL (v CI ji nastavuje testy.yml)');
test('adresa hlavního administrátora není ve zdrojácích vůbec',
  !!ADMIN_EMAIL && vyskyty.length === 0, vyskyty.join(', ') || 'nikde');

const uiKod = readFileSync(join(KOREN_PROJEKTU, 'src', 'ui', 'online_ui.js'), 'utf8');
test('prohlížeč hlavní účet nepoznává podle e-mailu, ale podle příznaku ze serveru',
  /const hlavni = !!u\.hlavni/.test(uiKod));

/* ---------- centrální šablony dokumentů (#139, 13. 8. 2026) ----------
 *
 * Celý životní cyklus: zveřejnění administrátorem → verze 1 → stažení
 * obchodníkem → nová verze → historie → režim → záloha. Kdyby kterýkoli
 * krok tiše selhal, obchodník by tiskl ze staré šablony a nikdo by to
 * nepoznal — přesně to, kvůli čemu centrální šablony vznikly. */
const sablonyFn = (await import('./functions/sablony.mjs')).default;
const DOCX1 = 'UEsDBBQABgAIAAAAIQ' + 'A'.repeat(400);   // „soubor" verze 1 (ZIP hlavička)
const DOCX2 = 'UEsDBBQABgAIAAAAIQ' + 'B'.repeat(400);   // jiná data = jiný otisk

{
  const cObch2 = cookieObch;   // relace z r2 už po změnách hesla neplatí (B6)

  test('šablony: PDF se odmítne už při zveřejnění',
    (await post(sablonyFn, 'http://x/api/sablony',
      { akce: 'zverejnit', typ: 'nabidka', nazev: 'x.pdf', data: 'JVBERi0xLjQK' }, cookie)).status === 400);
  test('šablony: neznámý typ se odmítne',
    (await post(sablonyFn, 'http://x/api/sablony',
      { akce: 'zverejnit', typ: 'faktura', nazev: 'x.docx', data: DOCX1 }, cookie)).status === 400);

  const z1 = await (await post(sablonyFn, 'http://x/api/sablony',
    { akce: 'zverejnit', typ: 'nabidka', nazev: 'Sablona_v8.docx', data: DOCX1, poznamka: 'první' }, cookie)).json();
  test('šablony: zveřejnění vrací verzi 1', z1.ok === true && z1.verze === 1, JSON.stringify(z1));

  test('šablony: tatáž data podruhé neprojdou (beze změny)',
    (await post(sablonyFn, 'http://x/api/sablony',
      { akce: 'zverejnit', typ: 'nabidka', nazev: 'Sablona_v8.docx', data: DOCX1 }, cookie)).status === 400);

  const rejstrik = await (await get(sablonyFn, 'http://x/api/sablony', cObch2)).json();
  test('šablony: obchodník vidí v rejstříku platnou verzi 1',
    rejstrik.ok && rejstrik.rejstrik.typy.nabidka.platna.verze === 1);
  test('šablony: rejstřík nenese data souborů',
    !JSON.stringify(rejstrik).includes(DOCX1.slice(0, 60)));
  test('šablony: výchozí režim je přísný', rejstrik.rejstrik.rezim === 'prisny');

  const stazeni = await (await get(sablonyFn, 'http://x/api/sablony?typ=nabidka', cObch2)).json();
  test('šablony: obchodník si stáhne přesně nahraná data',
    stazeni.ok && stazeni.data === DOCX1 && stazeni.verze === 1 && stazeni.nazev === 'Sablona_v8.docx');

  const z2 = await (await post(sablonyFn, 'http://x/api/sablony',
    { akce: 'zverejnit', typ: 'nabidka', nazev: 'Sablona_v9.docx', data: DOCX2 }, cookie)).json();
  test('šablony: nová verze dostane číslo 2', z2.verze === 2);
  test('šablony: stažení bez verze vrací novou platnou',
    (await (await get(sablonyFn, 'http://x/api/sablony?typ=nabidka', cObch2)).json()).verze === 2);
  const historie = await (await get(sablonyFn, 'http://x/api/sablony?typ=nabidka&verze=1', cObch2)).json();
  test('šablony: stará verze zůstává dostupná z historie (doložitelnost)',
    historie.ok && historie.data === DOCX1 && historie.verze === 1);
  test('šablony: vymyšlená verze se nevydá',
    (await get(sablonyFn, 'http://x/api/sablony?typ=nabidka&verze=99', cObch2)).status === 404);

  const rz = await (await post(sablonyFn, 'http://x/api/sablony', { akce: 'rezim', rezim: 'mekky' }, cookie)).json();
  test('šablony: administrátor přepne režim na měkký', rz.ok && rz.rezim === 'mekky');
  test('šablony: nesmyslný režim se odmítne',
    (await post(sablonyFn, 'http://x/api/sablony', { akce: 'rezim', rezim: 'vypnuto' }, cookie)).status === 400);
  test('šablony: přepnutí je vidět v rejstříku',
    (await (await get(sablonyFn, 'http://x/api/sablony', cObch2)).json()).rejstrik.rezim === 'mekky');
  await post(sablonyFn, 'http://x/api/sablony', { akce: 'rezim', rezim: 'prisny' }, cookie);

  /* Zálohy: obě cesty (ke stažení i noční otisk) musí šablony nést celé. */
  const zal = await (await get(zaloha, 'http://x/api/zaloha', cookie)).json();
  test('záloha ke stažení nese rejstřík šablon',
    zal.zaloha.sablony && zal.zaloha.sablony.rejstrik
    && zal.zaloha.sablony.rejstrik.typy.nabidka.platna.verze === 2);
  test('záloha ke stažení nese i soubory šablon (obě verze)',
    zal.zaloha.sablony['data/nabidka/1'] && zal.zaloha.sablony['data/nabidka/1'].data === DOCX1
    && zal.zaloha.sablony['data/nabidka/2'] && zal.zaloha.sablony['data/nabidka/2'].data === DOCX2);

  const { porizOtisk } = await import('./lib/zalohovani.mjs');
  await porizOtisk('test', ADMIN_EMAIL);
  const den = new Date().toISOString().slice(0, 10);
  const otisk = await (await (await import('./lib/sdilene.mjs')).uloziste('zalohy')).cti(den);
  test('noční otisk nese šablony včetně souborů',
    otisk && otisk.sablony && otisk.sablony['data/nabidka/2']
    && otisk.sablony['data/nabidka/2'].data === DOCX2);
}

/* ---- ANALYTIKA UŽÍVÁNÍ (#25 + #26 + #27, 17. 8. 2026) ----
 * Zásady: agregáty za všechny, žádná stopa jednotlivce; čas k zakázce,
 * ne k účtu; vypínač jen administrátor; retence 24 měsíců; MIMO zálohy. */
{
  const dnes = new Date().toISOString().slice(0, 10);
  const uloz = await globalThis.__TEST_ULOZISTE('analytika');

  test('analytika: režim čte i obchodník (klient musí vědět, jestli sbírat)',
    (await (await get(analytika, 'http://x/api/analytika?akce=rezim', cookieObch)).json()).sber === true);
  test('analytika: souhrn obchodníkovi NEpatří (jen administrátor)',
    (await get(analytika, 'http://x/api/analytika', cookieObch)).status === 403);
  test('analytika: vypínač obchodníkovi NEpatří',
    (await post(analytika, 'http://x/api/analytika', { akce: 'rezim', sber: false }, cookieObch)).status === 403);

  /* dávka událostí od klienta se přičte do dnešního dne */
  const den1 = { kliky: { 'kalk|BUTTON|nabidkaWord(…)': 2 }, zdrz: { 'kalk|INPUT|sirka': 30 },
                 zalozky: { kalk: 5 }, pocty: { zakazky: 1, kalkulace: 0, tiskyWord: 2, tiskyNahled: 0, prihlaseni: 1, chyby: 0 } };
  await post(analytika, 'http://x/api/analytika', { akce: 'udalosti', den: den1,
    casy: { '2026-OPR-CN-0001': { ock: 120, proj: 30 } } }, cookieObch);
  await post(analytika, 'http://x/api/analytika', { akce: 'udalosti', den: den1 }, cookieObch);
  const ulozeny = await uloz.cti('den/' + dnes);
  test('analytika: dávky se PŘIČÍTAJÍ do denního agregátu (žádné záznamy po lidech)',
    ulozeny && ulozeny.kliky['kalk|BUTTON|nabidkaWord(…)'] === 4 && ulozeny.pocty.tiskyWord === 4);
  /* 20. 8. 2026 (zadání J. V. „filtrování užívání dle uživatele"): u ŠESTI
   * počítadel se nově ukládá i rozpad po uživatelích. Zbytek zůstává
   * anonymní — a přesně to sada hlídá, aby se rozsah zase nerozšířil. */
  test('analytika: počítadla se přiřadí přihlášenému uživateli',
    ulozeny && ulozeny.poUzivateli && ulozeny.poUzivateli['obchodnik@priklad.cz']
    && ulozeny.poUzivateli['obchodnik@priklad.cz'].tiskyWord === 4,
    JSON.stringify(ulozeny && ulozeny.poUzivateli));
  test('analytika: e-mail je JEN v rozpadu počítadel, nikde jinde',
    !JSON.stringify({ kliky: ulozeny.kliky, zdrz: ulozeny.zdrz,
                      zalozky: ulozeny.zalozky, pocty: ulozeny.pocty }).includes('@'));
  test('analytika: klient svůj e-mail neposílá (atribuci dělá server z relace)',
    !JSON.stringify(den1).includes('@'));

  /* čas zakázky se akumuluje pod číslem zakázky */
  await post(analytika, 'http://x/api/analytika', { akce: 'udalosti',
    casy: { '2026-OPR-CN-0001': { ock: 60, proj: 0 } } }, cookieObch);
  const cas = await uloz.cti('cas/2026-OPR-CN-0001');
  test('analytika: čas zakázky se akumuluje odděleně OCK / PROJ',
    cas && cas.ock === 180 && cas.proj === 30);

  /* souhrn pro administrátora */
  const preh = await (await get(analytika, 'http://x/api/analytika?od=2020-01-01&do=2099-12-31', cookie)).json();
  test('analytika: souhrn nese celkové počty i řadu po měsících',
    preh.celkem.pocty.zakazky === 2 && preh.poMesicich[dnes.slice(0, 7)].pocty.zakazky === 2);
  test('analytika: souhrn nese časy zakázek', preh.casy['2026-OPR-CN-0001'].ock === 180);

  /* retence: den starší 24 měsíců zmizí při dalším zápisu */
  await uloz.zapis('den/2023-01-15', den1);
  await post(analytika, 'http://x/api/analytika', { akce: 'udalosti', den: den1 }, cookieObch);
  test('analytika: den starší 24 měsíců se při zápisu smaže (retence)',
    (await uloz.cti('den/2023-01-15')) === null);

  /* vypínač: po vypnutí se dávky tiše zahazují, po zapnutí zase přičítají */
  await post(analytika, 'http://x/api/analytika', { akce: 'rezim', sber: false }, cookie);
  const podpis = await uloz.cti('rezim');
  test('analytika: vypnutí sběru se podepisuje (kdo + kdy)',
    podpis.sber === false && podpis.kdo === ADMIN_EMAIL && !!podpis.kdy);
  const pred = (await uloz.cti('den/' + dnes)).pocty.zakazky;
  const odm = await (await post(analytika, 'http://x/api/analytika', { akce: 'udalosti', den: den1 }, cookieObch)).json();
  test('analytika: při vypnutém sběru se dávka TIŠE zahodí (ok, žádná chyba uživateli)',
    odm.ok === true && odm.sber === false && (await uloz.cti('den/' + dnes)).pocty.zakazky === pred);
  await post(analytika, 'http://x/api/analytika', { akce: 'rezim', sber: true }, cookie);

  /* analytika NEJDE do záloh (rozhodnutí 17. 8.) — ani ke stažení, ani nočně */
  const zalA = await (await get(zaloha, 'http://x/api/zaloha', cookie)).json();
  test('analytika: záloha ke stažení analytiku NEVOZÍ', zalA.zaloha.analytika === undefined);
  const kodZaloh = kodSouboru.get('functions/zaloha.mjs') + kodSouboru.get('lib/zalohovani.mjs');
  test('analytika: zálohovací kód úložiště analytiky vůbec nezná', !kodZaloh.includes('analytika'));
}

/* 5b) ZNAČKY UKÁZKOVÉHO A PRÁZDNÉHO CENÍKU (P2, nálezy N2/N3, 21. 9. 2026)
 *
 * Server doplňoval chybějící klíče ceníku z DEFAULT_CENIK ze sestavení —
 * pro GitHub vynulovaného a označeného `ukazkove`/`prazdny`. Klient značky
 * neposlal, ale v uloženém souboru je měl. U uzamčených variant, které se
 * při načtení nepřepočítávají, tam zůstaly napořád a vypnuly tisk nabídky
 * na ostrých zakázkách 0383 a 377.
 *
 * Hlídá se OBOJÍ: že se značka nepřidá při uložení, a že ji server odstraní,
 * i když ji klient pošle (starší klient, import souboru). */
{
  const zn = zk.novaZakazka();
  zn.cislo = '2026 - OPR - CN - 0778'; zn.nazevAkce = 'Značky ceníku';
  const d0 = zn.varianty[0].data;
  d0.cenik = Object.assign({}, d0.cenik, { montazHodKc: 850, dph: 21 });
  const ulZ = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: zn }, cookieObch)).json();
  const naZ = await (await get(zakazky, 'http://x/api/zakazky?soubor='
    + encodeURIComponent(ulZ.soubor), cookieObch)).json();
  const cZ = naZ.zakazka.varianty[0].data.cenik;
  test('uložení zakázky značku ukázkového ceníku nepřidá', cZ.ukazkove === undefined, JSON.stringify(cZ.ukazkove));
  test('ani značku prázdného ceníku', cZ.prazdny === undefined, JSON.stringify(cZ.prazdny));
  test('a ceny se uložily beze změny', cZ.montazHodKc === 850 && cZ.dph === 21,
    JSON.stringify([cZ.montazHodKc, cZ.dph]));

  /* Značka poslaná klientem se zahodí — druhá obrana pro starší klienty. */
  const zn2 = JSON.parse(JSON.stringify(naZ.zakazka));
  zn2.varianty[0].data.cenik.ukazkove = true;
  zn2.varianty[0].data.cenik.prazdny = true;
  const ul2 = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: zn2 }, cookieObch)).json();
  const na2 = await (await get(zakazky, 'http://x/api/zakazky?soubor='
    + encodeURIComponent(ul2.soubor || ulZ.soubor), cookieObch)).json();
  const c2 = na2.zakazka.varianty[0].data.cenik;
  test('značku poslanou klientem server zahodí',
    c2.ukazkove === undefined && c2.prazdny === undefined, JSON.stringify([c2.ukazkove, c2.prazdny]));
  test('a ceny přitom nechá být', c2.montazHodKc === 850, c2.montazHodKc);
}

/* ZAHRANIČNÍ CENY SE DO TUZEMSKÉ ŘADY NEDOSTANOU (P1, nález N1, 21. 9. 2026).
 *
 * Takhle vznikl vadný platný ceník verze 27: varianta přepnutá na řadu
 * Zahraničí má zahraniční ceny přímo ve svém ceníku a „Zveřejnit ceník této
 * varianty jako platný" je vzal jako podklad. Táž kontrola běží i v dialogu
 * aplikace — tady se hlídá, že ji má i SERVER, protože dialog jde obejít.
 * Bez tohohle testu by šlo pojistku ze serveru odstranit a nic by nespadlo.
 *
 * Blok stojí AŽ NA KONCI schválně: zveřejňuje další verze ceníku, a sady
 * o pár set řádků výš kontrolují, co záloha obsahuje, včetně čísla verze.
 * Uprostřed souboru by je rozbil. */
{
  const cZahr = ZC.zkusebniCenik();
  cZahr.rada = 'zahr';                                   // značka, kterou nechá cenikRadaPrepni
  cZahr.montazHodKc = (cZahr.montazHodKc || 0) + 7;      // aby to nebylo „beze změny"
  const odm = await post(program, 'http://x/api/program',
    { cenik: cZahr, cenikProj: ZC.zkusebniCenikProj(), rada: 'zahr' }, cookie);
  const telo = await odm.json();
  test('P1: server odmítne zveřejnění z varianty přepnuté na Zahraničí',
    odm.status === 400 && telo.ok === false, odm.status + ' ' + JSON.stringify(telo).slice(0, 120));
  test('P1: a řekne proč (kód i česká věta)',
    telo.kod === 'zahr' && /Zahrani/.test(telo.chyba || ''), JSON.stringify(telo).slice(0, 160));

  /* Pozná se to i bez pole `rada` — klíč v ceníku stačí. */
  const bezPole = await post(program, 'http://x/api/program',
    { cenik: cZahr, cenikProj: ZC.zkusebniCenikProj() }, cookie);
  test('P1: pozná to i bez předaného pole „rada"', bezPole.status === 400, bezPole.status);

  /* Druhá pojistka: shoda ČR se zahraniční odchylkou u víc než pěti položek.
   * Chytí i podklad, ze kterého někdo značku řady odstranil. */
  const cShoda = ZC.zkusebniCenik();
  const zahrOdchylky = { ceny: {}, jenZahr: {} };
  ['C.montazHodKc', 'C.powertechInt', 'C.powertechExt', 'C.transportKc',
   'C.lemovaniKgKc', 'C.striskaDvurKc'].forEach((cesta, i) => {
    const hodnota = 7100 + i;
    zahrOdchylky.ceny[cesta] = hodnota;
    cShoda[cesta.slice(2)] = hodnota;                    // ČR sloupec = zahraniční hodnota
  });
  const shoda = await post(program, 'http://x/api/program',
    { cenik: cShoda, cenikProj: ZC.zkusebniCenikProj(), zahranicni: zahrOdchylky }, cookie);
  const telo2 = await shoda.json();
  test('P1: server odmítne podklad, kde se ČR shoduje se zahraniční u šesti položek',
    shoda.status === 400 && telo2.kod === 'shoda', shoda.status + ' ' + JSON.stringify(telo2).slice(0, 120));
  test('P1: a vypíše konkrétní položky',
    Array.isArray(telo2.polozky) && telo2.polozky.length === 6, JSON.stringify(telo2.polozky));

  /* Poctivý podklad projde dál — pojistka nesmí zavřít i správnou cestu.
   *
   * PODKLAD MUSÍ KLÍČE ŘADY OPRAVDU NÉST. Do 21. 9. 2026 se tahle kontrola
   * dělala nad čistým `zkusebniCenik()`, ve kterém žádné `rada` ani `jenZahr`
   * nebyly — čištění tedy nemělo co odebrat a kontrola o kus níž prošla
   * i s VYPNUTÝM čištěním. Odhalila to mutace „klíče řady se zapíšou do
   * platného ceníku": jako jediná ze 128 zůstala nechycená. Tuzemská varianta
   * složená `cenikSlozRadu` je takhle označkovaná vždycky, takže tohle je
   * zároveň věrnější podklad než ten čistý. */
  const cPoctivy = ZC.zkusebniCenik();
  cPoctivy.montazHodKc = (cPoctivy.montazHodKc || 0) + 11;
  cPoctivy.rada = 'cr';                       // runtime klíč, který přidá cenikSlozRadu
  cPoctivy.jenZahr = { 'C.transportKc': true };
  test('P1: podklad do kontroly čištění klíče řady skutečně nese',
    'rada' in cPoctivy && 'jenZahr' in cPoctivy, Object.keys(cPoctivy).filter(k => k === 'rada' || k === 'jenZahr'));
  const ok4 = await (await post(program, 'http://x/api/program',
    { cenik: cPoctivy, cenikProj: ZC.zkusebniCenikProj(), rada: 'cr' }, cookie)).json();
  test('P1: tuzemský podklad se zveřejní normálně dál', ok4.ok === true, JSON.stringify(ok4).slice(0, 120));

  /* A klíče řady se do uložené verze nezapíšou, ať přijde cokoli. */
  const dbP1 = await (await get(program, 'http://x/api/program', cookie)).json();
  test('P1: uložená verze nenese klíče řady (rada, jenZahr)',
    dbP1.ok && !('rada' in dbP1.db.platny.cenik) && !('jenZahr' in dbP1.db.platny.cenik),
    Object.keys(dbP1.db.platny.cenik).filter(k => k === 'rada' || k === 'jenZahr'));
}


/* ---------- ČR sloupec položky „jen zahraniční" přežije zveřejnění ----------
 * (#290, druhé kolo nezávislé revize 21. 9. 2026)
 *
 * Zahraniční řada je ŘÍDKÁ TABULKA ODCHYLEK: co v ní není, dědí se z ČR
 * sloupce. Varianta vedená v řadě ČR má ale takovou položku záměrně na nule
 * — a zveřejnění z ní tu nulu zapsalo do platného ceníku. Dokud odchylka
 * existuje, nepozná se nic; po jejím zrušení se zdědí NULA místo ceny.
 *
 * PROČ SE TO ZKOUŠÍ PRÁVĚ PROTI SERVERU: oprava sedí v `programZaznam` za
 * `typeof` strážemi (cenikJenZahrCesty, cenikHodnota, cenikNastavHodnotu).
 * V prohlížeči jsou všechna jména globální vždycky, na serveru je skládá
 * `netlify/lib/jadro_moduly.cjs` — kdyby tam někdo změnil pořadí načítání
 * nebo modul vynechal, stráž by prošla a oprava by se TIŠE VYPNULA. Jádro
 * by dál mělo zelené testy a chyba by se vrátila jen serverovou cestou.
 */
{
  const CESTA = 'C.prekladyKc';
  const zahr = { jenZahr: { [CESTA]: true }, ceny: { [CESTA]: 60000 } };

  /* 1) platný ceník s hodnotou v ČR sloupci */
  const zaklad = Object.assign(ZC.zkusebniCenik(), { prekladyKc: 50000 });
  await post(program, 'http://x/api/program',
    { cenik: zaklad, cenikProj: ZC.zkusebniCenikProj(), zahranicni: zahr,
      poznamka: 'základ pro zkoušku dědění' }, cookie);
  const db1 = await (await get(program, 'http://x/api/program', cookie)).json();
  test('P4: příprava — platný ceník tu cenu má',
    db1.ok && db1.db.platny.cenik.prekladyKc === 50000,
    db1.ok && db1.db.platny.cenik.prekladyKc);

  /* 2) administrátor zveřejní z varianty vedené v řadě ČR (tam je nula) */
  const varCR = globalThis.cenikSlozRadu(
    JSON.parse(JSON.stringify(db1.db.platny.cenik)), zahr, 'cr');
  test('P4: příprava — varianta ČR má u té položky nulu',
    varCR.prekladyKc === 0, varCR.prekladyKc);
  const podklad = globalThis.cenikZverejneniOcisti(varCR);
  const odp = await (await post(program, 'http://x/api/program',
    { cenik: podklad, cenikProj: ZC.zkusebniCenikProj(), zahranicni: zahr,
      poznamka: 'zveřejnění z tuzemské varianty' }, cookie)).json();
  test('P4: takové zveřejnění projde (není to chyba obsluhy)', odp.ok === true,
    JSON.stringify(odp).slice(0, 120));

  const db2 = await (await get(program, 'http://x/api/program', cookie)).json();
  test('P4: server nezapsal nulu do ČR sloupce',
    db2.ok && db2.db.platny.cenik.prekladyKc === 50000,
    db2.ok && db2.db.platny.cenik.prekladyKc);
  test('P4: a otisk popisuje ceník, který se opravdu uložil',
    db2.ok && db2.db.platny.otisk === globalThis.programOtisk(db2.db.platny));

  /* 3) a proto zahraniční řada po zrušení odchylky zdědí cenu, ne nulu —
   *    to je okamžik, ve kterém se ztráta projeví. */
  const poZruseni = globalThis.cenikSlozRadu(
    JSON.parse(JSON.stringify(db2.db.platny.cenik)),
    { jenZahr: { [CESTA]: true }, ceny: {} }, 'zahr');
  test('P4: po zrušení odchylky zahraniční řada zdědí cenu, ne nulu',
    poZruseni.prekladyKc === 50000, poZruseni.prekladyKc);

  /* 4) POJISTKA: zákaz nesmí hodnotu zamknout natrvalo. Legitimní cesta,
   *    jak ji změnit, je tabulka odchylek — a ta musí fungovat dál. */
  const jina = { jenZahr: { [CESTA]: true }, ceny: { [CESTA]: 70000 } };
  await post(program, 'http://x/api/program',
    { cenik: podklad, cenikProj: ZC.zkusebniCenikProj(), zahranicni: jina,
      poznamka: 'změna odchylky' }, cookie);
  const db3 = await (await get(program, 'http://x/api/program', cookie)).json();
  const sNovou = globalThis.cenikSlozRadu(
    JSON.parse(JSON.stringify(db3.db.platny.cenik)), jina, 'zahr');
  test('P4: změna přes tabulku odchylek projde dál',
    sNovou.prekladyKc === 70000, sNovou.prekladyKc);
}


console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
