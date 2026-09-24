/* Ověření ONLINE DATABÁZE v prohlížeči (4. 8. 2026; rozšířeno o přihlašovací
 * stránku, lištu v rohu, změnu vlastního hesla a role).
 *
 * Node testy (netlify/test_funkce.mjs) ověřují serverové funkce, smoke.mjs
 * hlídá, že aplikace nad file:// mlčí. Tady se testuje to, co ani jeden
 * z nich neumí: SKUTEČNÝ klient proti SKUTEČNÉMU serverovému kódu.
 *
 * Jak: sestavená aplikace se servíruje přes lokální http server (online
 * vrstva se probouzí jen nad http/https) a každé volání /api/* se předá
 * OPRAVDOVÝM funkcím z netlify/functions — s pamětovým úložištěm místo
 * Blobs a s vlastní správou cookie. Žádný mock chování.
 *
 * Spuštění: NODE_PATH=$(npm root -g) node overit_online.mjs
 */
process.env.TAJEMSTVI_RELACE = 'zkusebni-tajemstvi-jen-pro-harness';
process.env.ADMIN_INIT_HESLO = 'Zkusebni.Heslo.123';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) {
    return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
      .map(x => x.slice(nazev.length + 1));
  },
  /* Mazání (7. 9. 2026): krok „obnova ze zálohy" nejdřív zakázku smaže
   * přes DELETE /api/zakazky, aby měla obnova co vracet. */
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

import { createRequire } from 'module';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import path from 'path';
import zdravi from './netlify/functions/zdravi.mjs';
import ja from './netlify/functions/ja.mjs';
import prihlaseni from './netlify/functions/prihlaseni.mjs';
import odhlaseni from './netlify/functions/odhlaseni.mjs';
import uzivatele from './netlify/functions/uzivatele.mjs';
import program from './netlify/functions/program.mjs';
import zakazky from './netlify/functions/zakazky.mjs';
import zaloha from './netlify/functions/zaloha.mjs';
import firma from './netlify/functions/firma.mjs';
import zobrazeni from './netlify/functions/zobrazeni.mjs';
import popisyFn from './netlify/functions/popisy.mjs';
import zakazniciFn from './netlify/functions/zakaznici.mjs';
import zalohaVynuceno from './netlify/functions/zaloha_vynuceno.mjs';
import { porizOtisk } from './netlify/lib/zalohovani.mjs';
import sablonyFn from './netlify/functions/sablony.mjs';
import analytikaFn from './netlify/functions/analytika.mjs';
import obnovaFn from './netlify/functions/obnova.mjs';

/* Dialogy jsou od 2. 9. 2026 v aplikaci (src/ui/dialog.js), ne nativní —
 * `page.on('dialog')` už tedy nic nechytí. Harness si proto potvrzování
 * zjednoduší: potvrd/hlaska/dotaz se nahradí funkcemi, které si text
 * zapamatují a rovnou odpoví „ano". Skutečný modál (kliknutí, Esc, Enter,
 * ovladatelnost stránky po zavření) ověřuje samostatný overit_dialogy.mjs. */
const dlgStub = async (page) => page.evaluate(() => {
  window.__dlgTexty = [];
  window.potvrd = (t) => { window.__dlgTexty.push(String(t)); return Promise.resolve(true); };
  window.hlaska = (t) => { window.__dlgTexty.push(String(t)); return Promise.resolve(); };
  window.dotaz = (t, v) => { window.__dlgTexty.push(String(t)); return Promise.resolve(v == null ? '' : v); };
});
const dlgPosledni = async (page) => page.evaluate(() =>
  (window.__dlgTexty && window.__dlgTexty.length) ? window.__dlgTexty[window.__dlgTexty.length - 1] : '');


const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  console.error('Playwright není k dispozici. NODE_PATH=$(npm root -g) node overit_online.mjs');
  process.exit(2);
}

const FUNKCE = {
  '/api/zdravi': zdravi, '/api/ja': ja, '/api/prihlaseni': prihlaseni,
  '/api/odhlaseni': odhlaseni, '/api/uzivatele': uzivatele,
  '/api/program': program, '/api/zakazky': zakazky, '/api/zaloha': zaloha,
  /* Firemní údaje jsou od 4. 8. 2026 taky online: obchodník složku _DB
   * nemapuje, takže hlavičku nabídky nemá odkud jinud vzít. */
  '/api/firma': firma,
  /* Matice zobrazení (#136) — aplikace ji načítá hned po přihlášení, takže
   * bez ní by v každém průchodu svítilo 404 v konzoli. */
  '/api/zobrazeni': zobrazeni,
  '/api/popisy': popisyFn,
  '/api/zakaznici': zakazniciFn,
  /* Vynucená (a ověřitelná) záloha databáze – 4. 8. 2026. Kdyby tu funkce
   * chyběla, volání z prohlížeče by skončilo na 404 a test by mlčel
   * o tom, že „vynucené zálohování" pořád nikam nevede. */
  '/api/zaloha_vynuceno': zalohaVynuceno,
  /* Centrální šablony (#139) — aplikace si rejstřík bere hned po přihlášení;
   * bez téhle cesty by každý průchod svítil 404 v konzoli. */
  '/api/sablony': sablonyFn,
  '/api/analytika': analytikaFn,
  /* Obnova databáze ze zálohy (7. 9. 2026) — skutečný klient proti skutečné
   * funkci: panel, náhled bez zápisu, obnova smazané zakázky, odmítnutí
   * obchodníka. */
  '/api/obnova': obnovaFn,
};

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

/* ---- lokální http server jen pro aplikaci (API řeší route níže) ---- */
const html = readFileSync(path.resolve('dist/kalkulacka.html'));
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ADRESA = 'http://127.0.0.1:' + server.address().port;

const prohlizec = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await prohlizec.newContext({ acceptDownloads: true });
const page = await ctx.newPage();

const chyby = [];
page.on('console', m => {
  const t = m.text();
  // 401/403/400/409 z /api jsou v testu záměr – aplikace s nimi počítá.
  if (m.type() === 'error' && !/status of (401|403|400|409)/.test(t)) chyby.push('console: ' + t);
});
page.on('pageerror', e => chyby.push('pageerror: ' + e.message));
page.on('dialog', d => (d.type() === 'prompt' ? d.accept('zkušební zveřejnění') : d.accept()));

/* Most na serverové funkce: cookie si vede harness sám. */
let cookieJar = '';
await page.route('**/api/**', async route => {
  const r = route.request();
  const url = new URL(r.url());
  const fn = FUNKCE[url.pathname];
  if (!fn) return route.fulfill({ status: 404, body: '{"ok":false}' });
  const init = { method: r.method(), headers: { cookie: cookieJar } };
  if (r.method() === 'POST') init.body = r.postData() || '';
  const odp = await fn(new Request(r.url(), init));
  const setc = odp.headers.get('set-cookie');
  if (setc) cookieJar = setc.split(';')[0];
  route.fulfill({ status: odp.status, contentType: 'application/json; charset=utf-8',
    body: await odp.text() });
});

const gate = () => page.locator('#prihlaseni-box').innerHTML();
const gateViditelna = () => page.evaluate(() =>
  document.getElementById('prihlaseni-overlay').style.display !== 'none');
const prihlas = async (email, heslo) => {
  await page.fill('#onlineEmail', email);
  await page.fill('#onlineHeslo', heslo);
  await page.click('#prihlaseni-box >> text=Přihlásit');
  await page.waitForTimeout(400);
};

await page.goto(ADRESA);
await page.waitForFunction(() => typeof window.render === 'function');
await page.waitForTimeout(400);

await dlgStub(page);

/* ---- 1) přihlašovací stránka zakrývá aplikaci ---- */
test('přihlašovací stránka je vidět a nese název aplikace',
  await gateViditelna() && (await gate()).includes('Kalkulátor Next Gen'));
test('stránka má pole pro e-mail (uživatelské jméno) i heslo',
  (await gate()).includes('uživatelské jméno') && (await gate()).includes('onlineHeslo'));

/* ---- 2) špatné heslo ---- */
await prihlas('spravce@priklad.cz', 'spatne-heslo');
test('špatné heslo se odmítne s důvodem přímo na přihlašovací stránce',
  (await gate()).includes('Nesprávný e-mail nebo heslo'));
test('stránka po chybě zůstává', await gateViditelna());

/* ---- 3) přihlášení administrátora (bootstrap) ---- */
await prihlas('spravce@priklad.cz', 'Zkusebni.Heslo.123');
await page.waitForFunction(() => { try { return !!ONLINE_STAV.ja; } catch (e) { return false; } });
await page.waitForTimeout(400);
test('po přihlášení přihlašovací stránka zmizí', !(await gateViditelna()));
test('administrátor je přihlášený',
  await page.evaluate(() => ONLINE_STAV.ja.role === 'Administrátor'));
const roh = () => page.locator('#onlineLista').innerHTML();
test('v rohu hlavičky je vidět, kdo je přihlášený',
  (await roh()).includes('Jaroslav Vendl') && (await roh()).includes('Administrátor'));
test('roh nabízí Změnit heslo i Odhlásit',
  (await roh()).includes('Změnit heslo') && (await roh()).includes('Odhlásit'));

/* ---- 4) zveřejnění ceníku online a jeho nasazení ---- */
await page.evaluate(() => prepniTab('cenik'));
await page.evaluate(() => onlineZverejni());
await page.waitForFunction(() => { try { return !!(ONLINE_STAV.db && ONLINE_STAV.db.platny); } catch (e) { return false; } });
await page.waitForTimeout(500);
test('zveřejnění založilo online verzi 1',
  await page.evaluate(() => ONLINE_STAV.db.platny.verze === 1));
test('online ceník se v aplikaci sám nasadil',
  await page.evaluate(() => ONLINE_STAV.cenikPouzit === true));

/* ---- 4a) společné dodatkové texty přežijí nasazení ceníku (nález N35 revize v22.9.9) ----
 *
 * Texty se vlévají do výchozího ceníku. Nasazení ceníku (`progPouzij` →
 * `konfigNahradVMiste`) ale všechny jeho klíče smaže a naplní znovu — takže
 * texty vlité dřív zmizely, a po zveřejnění nového ceníku pokaždé.
 *
 * Zkouší se TATÁŽ CESTA, kterou jde zveřejnění i přihlášení: `onlineNactiProgram`
 * shodí `cenikPouzit` a nasazení provede `onlineTik` při dalším překreslení.
 * Novou verzi ceníku kvůli tomu nezakládá — další oddíly počítají s verzí 1. */
const KLIC_TEXTU = 'Zkušební položka pro text';
const textPred = await page.evaluate(async (klic) => {
  await onlinePopisUloz(klic, 'Věta, která má přežít nový ceník.');
  return (DEFAULT_CENIK.popisy || {})[klic] || '';
}, KLIC_TEXTU);
test('administrátor uložil dodatkový text pro celou aplikaci',
  textPred === 'Věta, která má přežít nový ceník.', textPred);
/* Stav po `onlineNactiProgram`: ceník stažený, nasazení čeká na tik. */
await page.evaluate(() => { ONLINE_STAV.cenikPouzit = false; render(); });
await page.waitForFunction(() => { try { return ONLINE_STAV.cenikPouzit === true; } catch (e) { return false; } });
await page.waitForTimeout(300);
const textPo = await page.evaluate((klic) => ({
  text: (DEFAULT_CENIK.popisy || {})[klic] || '',
  verze: ONLINE_STAV.db.platny.verze,
  nova: (novaZakazka().varianty[0].data.cenik.popisy || {})[klic] || '',
}), KLIC_TEXTU);
test('po nasazení platného ceníku text ve výchozím ceníku zůstal (N35)',
  textPo.text === 'Věta, která má přežít nový ceník.', textPo);
test('a nová zakázka si ho odnese', textPo.nova === 'Věta, která má přežít nový ceník.', textPo);
/* Úklid: text zpátky, ať další oddíly počítají s tím, s čím dosud. */
await page.evaluate(async (klic) => { await onlinePopisUloz(klic, ''); }, KLIC_TEXTU);

/* ---- 4b) firemní údaje online (4. 8. 2026) ----
 * Ceník sám nestačí. Obchodník složku _DB nemapuje, takže dokud firemní údaje
 * nejsou taky online, zůstane mu v hlavičce nabídky „Ukázková firma s.r.o."
 * a červená lišta svítí navěky. Tady se ověřuje celá cesta: administrátor
 * vzorek zveřejnit nesmí, po přepsání skutečnými údaji smí, a obchodník je
 * pak (v oddílu 9) dostane sám. */
await page.evaluate(() => { otevriNastaveni(); nastPanel('firma'); });
await page.waitForTimeout(300);
const panelFirma = () => page.locator('#nastaveni-panel').innerHTML();
test('administrátor vidí v Nastavení → Firma panel online zveřejnění',
  (await panelFirma()).includes('Firemní údaje v online databázi'));
test('vzorek ze sestavení zveřejnit nejde – tlačítko je zhasnuté',
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('#nastaveni-panel button')]
      .find(x => x.textContent.includes('Zveřejnit firemní údaje online'));
    return !!b && b.disabled === true;
  }));
test('a panel řekne proč (jsou pořád ukázkové)', /ukázkov/i.test(await panelFirma()));

/* Skutečné údaje – zkušební firma, ne ta jeho: do repozitáře ani do testů
 * nepatří nic ostrého. Zapisují se přes firmaSet(), tedy přesně tou cestou,
 * kterou používá formulář (a která zároveň sundává značku vzorku). */
await page.evaluate(() => {
  firmaSet('nazev', 'Zkušební ocelárna s.r.o.');
  firmaSet('ico', '12345678');
  firmaSet('sidloUlice', 'Zkušební 1');
  firmaSet('sidloPsc', '110 00');
  firmaSet('sidloMesto', 'Praha');
  firmaSet('telefon', '+420 111 222 333');
});
await page.waitForTimeout(200);
test('ruční přepis sundal značku ukázkových dat',
  await page.evaluate(() => NAST.firma.ukazkove === undefined));
test('teď už je tlačítko zveřejnění činné',
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('#nastaveni-panel button')]
      .find(x => x.textContent.includes('Zveřejnit firemní údaje online'));
    return !!b && b.disabled === false;
  }));
await page.evaluate(() => onlineZverejniFirmu());
await page.waitForFunction(() => { try { return !!ONLINE_STAV.firma; } catch (e) { return false; } });
await page.waitForTimeout(300);
test('zveřejněné údaje se vrátily ze serveru se jménem firmy',
  await page.evaluate(() => ONLINE_STAV.firma.udaje.nazev === 'Zkušební ocelárna s.r.o.'));
test('server si zapsal, kdo a kdy zveřejnil',
  await page.evaluate(() => ONLINE_STAV.firma.kdo === 'spravce@priklad.cz' && !!ONLINE_STAV.firma.kdy));
test('panel po zveřejnění ukazuje, kdy a kým',
  (await panelFirma()).includes('Online zveřejněno'));

/* ---- 4c) panel nesmí znovu chtít to, co je už zveřejněné (5. 8. 2026, #142) ----
 *
 * Zadání: „Proč musím pořád zveřejňovat firemní údaje? Ty už jsem nahrál
 * a zveřejnil." Cesta zveřejnit → načíst zpátky fungovala; co chybělo, byla
 * odpověď na otázku „je nahoře totéž, co mám tady?". Panel místo toho pokaždé
 * nabízel plné modré tlačítko, tedy gesto, které administrátor už udělal.
 *
 * Pozn.: „· právě platí v aplikaci" na tohle odpovědět neumí – rozsvítí se jen
 * tomu, komu se online kopie do aplikace opravdu nasadila, a administrátorovi
 * s připojenou složkou _DB se nenasazuje nikdy. Proto se hlídá věta o shodě. */
await page.evaluate(() => { nastPanel('firma'); });
await page.waitForTimeout(200);
test('panel řekne, že online databáze má přesně tyhle údaje',
  /Online databáze má přesně tyhle údaje/.test(await panelFirma()));
test('a že zveřejňovat znovu není potřeba',
  /Zveřejňovat je znovu není potřeba/.test(await panelFirma()));
test('modré tlačítko „Zveřejnit firemní údaje online" už panel nenabízí',
  await page.evaluate(() => ![...document.querySelectorAll('#nastaveni-panel button')]
    .some(x => x.textContent.trim() === 'Zveřejnit firemní údaje online')));
/* Zmizet ale nesmí docela – přepsat online kopii nejde jinudy. */
test('zveřejnit znovu jde pořád, jen už to není hlavní nabídka panelu',
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('#nastaveni-panel button')]
      .find(x => /Zveřejnit znovu/.test(x.textContent));
    return !!b && b.disabled === false && !b.classList.contains('primary');
  }));
test('popis stavu mluví o shodě s Nastavením → Firma',
  await page.evaluate(() => /shodné s tím, co máte/.test(onlineFirmaPopis())));

/* Změna jediného pole musí panel zase probudit – jinak by administrátor
 * opravil telefon a nikdo z obchodníků by se to nedozvěděl. */
await page.evaluate(() => { firmaSet('telefon', '+420 111 222 999'); nastPanel('firma'); });
await page.waitForTimeout(200);
test('po změně údaje panel pojmenuje, co se liší',
  /Oproti online kopii se liší: Telefon/.test(await panelFirma()));
test('a znovu nabídne plné tlačítko ke zveřejnění',
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('#nastaveni-panel button')]
      .find(x => x.textContent.trim() === 'Zveřejnit firemní údaje online');
    return !!b && b.disabled === false && b.classList.contains('primary');
  }));
await page.evaluate(() => { firmaSet('telefon', '+420 111 222 333'); nastPanel('firma'); });
await page.waitForTimeout(200);
test('vrácení údaje zpátky panel zase uklidní',
  /Zveřejňovat je znovu není potřeba/.test(await panelFirma()));
await page.evaluate(() => zavriNastaveni());

/* ---- 5) zakázka online: uložit, seznam, otevřít ---- */
await page.evaluate(() => { ZAK.cislo = '2026 - OPR - CN - 0555'; ZAK.nazevAkce = 'Online ověření'; render(); });
await page.evaluate(() => onlineUloz());
await page.waitForFunction(() => { try { return ONLINE_STAV.soubor !== ''; } catch (e) { return false; } });
test('zakázka se uložila online pod jménem ze svého čísla',
  await page.evaluate(() => ONLINE_STAV.soubor.includes('0555')));
await page.evaluate(() => otevriOnline());
await page.waitForTimeout(300);
test('panel Zakázky online ukazuje uloženou zakázku',
  (await page.locator('#online-panel').innerHTML()).includes('Online ověření'));
await page.evaluate(() => onlineOtevri(ONLINE_STAV.soubor));
await page.waitForTimeout(400);

/* Zámek čtení (4. 9. 2026) nesmí zabít navigaci a tisk (hlášení J. V.
 * 7. 9. 2026: „nemůžu načíst starou ani otevřít novou zakázku, ani
 * vytisknout"). Měří se skutečné pointer-events tlačítek v DOM. */
const ziveVZamku = await page.evaluate(() => {
  const pe = (najdi) => { const b = [...document.querySelectorAll('button, select')].find(najdi); return b ? getComputedStyle(b).pointerEvents : 'chybí'; };
  return {
    zamceno: (typeof zamekCteniJe === 'function') && zamekCteniJe(),
    nacist: pe(b => /Načíst zakázku/.test(b.textContent)),
    nova: pe(b => /Nová zakázka/.test(b.textContent)),
    historie: pe(b => /Historická kalkulace/.test(b.textContent)),
    prehled: pe(b => /Přehled cenových nabídek →/.test(b.textContent)),
    varianta: pe(b => b.tagName === 'SELECT' && /přepnout počítanou variantu/.test(b.title)),
    /* Hledá se podle obou znění, která tlačítko kdy mělo (viz níž). Od
     * 22. 9. 2026 se v režimu čtení nekreslí ani jedno, takže tu vyjde
     * „chybí" — a přesně to se dole tvrdí. Kdyby se sem regulární výraz
     * zúžil na dnešní znění, test by prošel i tehdy, kdyby se tlačítko
     * vrátilo pod svým starým jménem. */
    ulozit: pe(b => /Uložit zakázku|Odemknout a uložit/.test(b.textContent)),
    ulozitPopis: (() => {
      const b = [...document.querySelectorAll('button')]
        .find(x => /Uložit zakázku|Odemknout a uložit/.test(x.textContent));
      return b ? b.textContent.trim() : 'chybí';
    })(),
    /* Odemčení musí být v tu chvíli dosažitelné — jinak by se oprava N25
     * změnila v past: neuložíš a nemáš čím odemknout. */
    odemknout: pe(b => /Odemknout k úpravám/.test(b.textContent)),
  };
});
test('otevřená zakázka z databáze je jen ke čtení', ziveVZamku.zamceno === true, ziveVZamku);
test('v režimu čtení zůstává živé Načíst, Nová zakázka, Historická kalkulace, Přehled i přepínač varianty',
  ['nacist', 'nova', 'historie', 'prehled', 'varianta'].every(k => ziveVZamku[k] === 'auto'), ziveVZamku);
/* OČEKÁVÁNÍ SE TU ZMĚNILO DVAKRÁT — celý vývoj, ať se nevracíme zpátky.
 *
 * Do 21. 9. 2026 se hlídalo, že je tlačítko uložení v režimu čtení MRTVÉ
 * (`pointer-events:none`). Chránilo to data, ale právě tím vznikl nález N4:
 * tlačítko vypadalo jako tlačítko, kliknutí neudělalo nic a jediné
 * vysvětlení šlo do karty Databáze, kam se v tu chvíli nikdo nedívá.
 *
 * 21. 9. se tedy oživilo a přejmenovalo na „🔒 Odemknout a uložit". Jenže
 * ani to akci nedokončilo: zůstala hláška o režimu čtení, nic se neuložilo
 * a otevřel se panel Zakázky online (nález N25).
 *
 * 22. 9. 2026, rozhodnutí J. V.: „tlačítko u otevřené zakázky nenabízet."
 * V režimu čtení se tedy nekreslí vůbec a lišta začíná „Načíst zakázku".
 * Odemčení má jedno místo — lištu zámku. Že se nic neuloží, hlídá dál
 * kontrola `zamekCteniStop()` na začátku `zakUlozUI()`: pravidlo v kódu,
 * ne nedostupnost prvku. */
test('Uložit zakázku se v režimu čtení vůbec nenabízí',
  ziveVZamku.ulozit === 'chybí', ziveVZamku);
test('a odemknout jde lištou zámku',
  ziveVZamku.odemknout === 'auto', ziveVZamku);

/* NOVÁ VARIANTA SE V ZAMČENÉ ZAKÁZCE NEVYROBÍ DO ZTRACENA (P3, nález N4).
 *
 * „+ Nová varianta" a kopie ⧉ v Přehledu variantu založily, ale autosave
 * ani „Uložit zakázku" v režimu čtení nic nezapsaly — po Ctrl+F5 byla pryč.
 * Obě cesty se teď ptají `zamekCteniStop()`, tedy nabídnou odemknutí
 * a samy nic neudělají. Hlídá se, že varianty OPRAVDU nepřibyly: kdyby se
 * zábrana odstranila, tenhle test spadne dřív, než si toho všimne obchodník. */
const varZamek = await page.evaluate(async () => {
  const pred = ZAK.varianty.length;
  const zamceno = (typeof zamekCteniJe === 'function') && zamekCteniJe();
  varNova();
  const poNova = ZAK.varianty.length;
  varKopie(ZAK.varianty[0].id);
  const poKopie = ZAK.varianty.length;
  return { zamceno, pred, poNova, poKopie };
});
test('zakázka je pro tenhle test opravdu jen ke čtení', varZamek.zamceno === true, varZamek);
test('„+ Nová varianta" v režimu čtení variantu NEzaloží',
  varZamek.poNova === varZamek.pred, varZamek);
test('ani kopie ⧉ v Přehledu', varZamek.poKopie === varZamek.pred, varZamek);

/* DODATKOVÝ TEXT V ZAMČENÉ ZAKÁZCE (nález B63 revize v22.9.9).
 *
 * Pole textu pod položkou vidí od #310 každý. `popisSet` se ale ptal jen na
 * zámek varianty, ne na zámek čtení: text se v zakázce jen ke čtení zapsal,
 * autosave ho neuložil a po F5 byl pryč. Měří se, že se do ceníku varianty
 * NIC nezapsalo — dialog s odemčením sám o sobě nic nedokazuje. */
const popisZamek = await page.evaluate(() => {
  /* Předchozí kontroly („+ Nová varianta", kopie ⧉) odklepnou dialog
   * s odemčením — stub odpovídá „ano" —, takže se zakázka před měřením
   * zamyká znovu. Bez toho by test měřil odemčenou zakázku. */
  zamekCteniZapni(); render();
  const d = aktivniVarianta(ZAK).data;
  const pred = JSON.stringify((d.cenik && d.cenik.popisy) || {});
  const zamceno = zamekCteniJe();
  popisSet('C.priplatky.zabranyDvereKc', 'Text napsaný v režimu čtení');
  const po = JSON.stringify((aktivniVarianta(ZAK).data.cenik.popisy) || {});
  const obaleny = !!(window.popisSet && window.popisSet._zamek);
  /* Stub dialogu odpovídá „ano" a zakázku tím odemkne — vrátit, ať další
   * kontroly počítají se zamčenou zakázkou jako dosud. */
  zamekCteniZapni();
  return { zamceno, stejne: pred === po, obaleny };
});
test('dodatkový text se v zakázce jen ke čtení nezapíše (B63)',
  popisZamek.zamceno === true && popisZamek.stejne === true, popisZamek);
test('a hlídá ho týž obal zámku jako ostatní zápisy', popisZamek.obaleny === true, popisZamek);

/* A po odemčení to musí jít — zábrana nesmí zavřít i správnou cestu.
 *
 * Stav se hned VRACÍ ZPĚT: přidaná varianta se odebere, aktivní se vrátí
 * na původní a zámek čtení se zapne. Sady o pár desítek řádků níž měří
 * tutéž otevřenou zakázku (tisk PROJ, lišta na Ceníku) a cizí varianta
 * navíc by jim podstrčila jiný stav, než na jaký se ptají. */
const varPoOdemceni = await page.evaluate(async () => {
  const puvodniAktivni = ZAK.aktivni;
  const puvodniIds = ZAK.varianty.map(v => v.id);
  zamekCteniVypni();
  const pred = ZAK.varianty.length;
  varNova();
  const po = ZAK.varianty.length;
  ZAK.varianty = ZAK.varianty.filter(v => puvodniIds.indexOf(v.id) >= 0);
  ZAK.aktivni = puvodniAktivni;
  if (typeof syncVarianta === 'function') syncVarianta();
  zamekCteniZapni();
  render();
  return { pred, po, uklizeno: ZAK.varianty.length, aktivniSedi: ZAK.aktivni === puvodniAktivni };
});
test('po odemčení se nová varianta založí normálně',
  varPoOdemceni.po === varPoOdemceni.pred + 1, varPoOdemceni);
test('a test po sobě uklidil (zakázka je ve stavu, v jakém ji našel)',
  varPoOdemceni.uklizeno === varPoOdemceni.pred && varPoOdemceni.aktivniSedi, varPoOdemceni);
await page.evaluate(() => prepniTab('proj'));
await page.waitForTimeout(300);
const tiskProjVZamku = await page.evaluate(() => {
  const pe = (najdi) => { const b = [...document.querySelectorAll('button, select')].find(najdi); return b ? getComputedStyle(b).pointerEvents : 'chybí'; };
  return { tisk: pe(b => /Kompletní náhled a tisk nabídky/.test(b.textContent) && b.closest('#proj-telo')),
           word: pe(b => /Vytvořit nabídku PROJ \(Word\)/.test(b.textContent)),
           jazyk: pe(b => b.tagName === 'SELECT' && /Jazyk tohoto výtisku/.test(b.title) && b.closest('#proj-telo')),
           kryci: pe(b => /Přejít na krycí list/.test(b.textContent) && b.closest('#proj-telo')) };
});
test('v režimu čtení jde nabídku PROJ vytisknout, vytvořit Word, přepnout jazyk i přejít na krycí list',
  Object.values(tiskProjVZamku).every(v => v === 'auto'), tiskProjVZamku);

/* Zámek čtení na záložce Ceník (8. 9. 2026, hlášení J. V.: „přirážka se vždy
 * vrátí na 20 %"): lišta s Odemknout je i tady a dialog při zablokovaném
 * zápisu odemknutí rovnou nabídne (stub potvrd odpoví ano). */
await page.evaluate(() => prepniTab('cenik'));
await page.waitForTimeout(300);
test('záložka Ceník ukazuje lištu jen ke čtení s tlačítkem Odemknout',
  /Nabídka je otevřená jen ke čtení/.test(await page.locator('#page-cenik').innerHTML())
  && /zamekCteniOdemkniUI\(\)/.test(await page.locator('#page-cenik').innerHTML()));
const odemceniZCeniku = await page.evaluate(async () => {
  const pred = C.marze;
  set('C.marze', 0.31);                       // zamčeno → dialog (stub: ano) → odemkne se
  const poZablokovani = C.marze;
  await new Promise(r => setTimeout(r, 300));
  const odemceno = !zamekCteniJe();
  set('C.marze', 0.31);                       // po odemknutí už zápis projde
  return { pred, poZablokovani, odemceno, po: C.marze, dialog: window.__dlgTexty[window.__dlgTexty.length - 1] };
});
test('zamčený zápis do ceníku se neprovede a dialog nabídne odemknutí',
  odemceniZCeniku.poZablokovani === odemceniZCeniku.pred && /Odemknout k úpravám/.test(odemceniZCeniku.dialog), odemceniZCeniku);
test('po odemknutí z dialogu se přirážka zapíše', odemceniZCeniku.odemceno && odemceniZCeniku.po === 0.31, odemceniZCeniku);
await page.evaluate((v) => { set('C.marze', v); zamekCteniZapni(); prepniTab('kalk'); render(); }, odemceniZCeniku.pred);
await page.waitForTimeout(200);
test('zakázka se otevřela online a číslo sedí',
  await page.evaluate(() => ZAK.cislo === '2026 - OPR - CN - 0555'));

/* ---- 5b) zadání 4. 8. 2026: trojice na začátku lišty + samočinné uložení ----
 *
 * „Přesuň tlačítka ulož zakázku, načíst zakázku a nová zakázka na začátek
 * lišty… Nezapomeň totéž provést pro projekční zakázky v Kalkulaci PROJ."
 * a „Každá nová zakázka by se měla automaticky ukládat do databáze… vždy
 * zakázku ukládat po vyplnění hlavičky. Systém musí uživatele informovat."
 *
 * Pozice se měří na POŘADÍ tlačítek v liště, ne na tom, že tam někde jsou –
 * jinak by test prošel i tehdy, kdyby trojice zůstala na konci. */
const listaBtn = async (kde) => page.evaluate((k) => {
  const l = document.querySelector('#page-' + k + ' .zak-cena');
  return l ? Array.from(l.querySelectorAll('button')).map(b => b.textContent.trim()) : [];
}, kde);

/* Zakázka je v tuhle chvíli pořád otevřená z databáze, tedy jen ke čtení.
 * Nejdřív se tedy měří ZAMČENÁ lišta: od 22. 9. 2026 (N25) v ní uložení
 * není a začíná rovnou „Načíst zakázku". Teprve pak se odemkne a měří
 * se trojice — jinak by se ty dva stavy daly zaměnit. */
await page.evaluate(() => prepniTab('kalk'));
const btnZamek = await listaBtn('kalk');
test('lišta zamčené zakázky uložení vůbec nenabízí a začíná dvojicí Načíst / Nová zakázka',
  !btnZamek.some(x => /Uložit zakázku|Odemknout a uložit/.test(x))
  && /Načíst zakázku/.test(btnZamek[0] || '') && /Nová zakázka/.test(btnZamek[1] || ''),
  btnZamek.slice(0, 4));

await page.evaluate(() => { zamekCteniVypni(); render(); });
await page.waitForTimeout(150);
const btnOck = await listaBtn('kalk');
/* Test hlídá POŘADÍ a složení trojice, ne konkrétní slovo — jinak by prošel
 * i tehdy, kdyby trojice skončila na konci lišty (zadání 4. 8. 2026). */
test('lišta Kalkulace OCK začíná trojicí Uložit / Načíst / Nová zakázka',
  /Uložit zakázku/.test(btnOck[0] || '') && /Načíst zakázku/.test(btnOck[1] || '')
  && /Nová zakázka/.test(btnOck[2] || ''), btnOck.slice(0, 4));
test('po odemčení se tedy uložení vrátilo na své místo',
  btnOck.length === btnZamek.length + 1, { btnZamek: btnZamek.slice(0, 4), btnOck: btnOck.slice(0, 4) });
/* A uložení po odemčení SKUTEČNĚ PROJDE. Samotné tlačítko nic nedokazuje:
 * přesně na tom stál nález N25, kde tlačítko bylo, ale akci nedokončilo. */
const ulozPoOdemceni = await page.evaluate(async () => {
  ONLINE_STAV.posledni = '';
  ZAK.adresa = 'Odemčeno a uloženo 1, Praha';
  await zakUlozUI();
  return { zamceno: zamekCteniJe(), zapsano: (ONLINE_STAV.posledni || '').includes('Odemčeno a uloženo 1') };
});
test('a uložení po odemčení opravdu zapíše do databáze',
  ulozPoOdemceni.zamceno === false && ulozPoOdemceni.zapsano, ulozPoOdemceni);

await page.evaluate(() => prepniTab('proj'));
const btnProj = await listaBtn('proj');
test('lišta Kalkulace PROJ začíná stejnou trojicí (projekční zakázky)',
  /Uložit zakázku/.test(btnProj[0] || '') && /Načíst zakázku/.test(btnProj[1] || '')
  && /Nová zakázka/.test(btnProj[2] || ''), btnProj.slice(0, 4));
/* 5. 8. 2026: tlačítko „Převzít údaje z hlavičky OCK/PROJ" bylo z lišty obou
 * kalkulací zrušeno (zadání). Dřív se tu hlídalo jen jeho pořadí; teď se hlídá,
 * že v liště kalkulací není vůbec — jinak by se při dalším úklidu mohlo tiše
 * vrátit. Přenos hlavičky zůstává v Přehledu cenových nabídek (viz níže). */
test('v liště Kalkulace OCK už není převzetí údajů z druhé hlavičky',
  !btnOck.some(t => /Převzít údaje|Přenést tyto údaje/.test(t)), btnOck.slice(0, 6));
test('v liště Kalkulace PROJ už není převzetí údajů z druhé hlavičky',
  !btnProj.some(t => /Převzít údaje|Přenést tyto údaje/.test(t)), btnProj.slice(0, 6));

/* Nová prázdná zakázka: musí zapomenout jméno té předchozí, jinak by se
 * hned sama zapsala do databáze jako záznam bez čísla. Volá se přímo
 * (ne přes novaZakazkaUI), protože to potvrzuje confirm() – dialog by
 * v prohlížeči zablokoval celý harness. */
await page.evaluate(() => {
  ZAK = novaZakazka(); syncVarianta(); zakOdpojUlozeni(); render();
});
await page.waitForTimeout(200);
test('nová zakázka není v databázi a čeká na hlavičku',
  await page.evaluate(() => zakUlozeniStav().stav === 'vyplnit'),
  await page.evaluate(() => zakUlozeniStav().stav));
test('a systém řekne, co konkrétně v hlavičce chybí',
  await page.evaluate(() => zakUlozeniStav().chybi.join('|') === 'Číslo nabídky (CN)|Název akce'),
  await page.evaluate(() => zakUlozeniStav().chybi));
test('informace o nutnosti vyplnit a uložit je vidět přímo v liště',
  /Vyplňte v hlavičce/.test(await page.locator('#page-proj .zak-ulozeni').first().innerText()),
  await page.locator('#page-proj .zak-ulozeni').first().innerText());
test('dokud hlavička není vyplněná, samo se nic neplánuje',
  await page.evaluate(() => ONLINE_STAV.timer === null && ONLINE_STAV.soubor === ''));

/* Vyplnění hlavičky = jediná podmínka. Od téhle chvíle si zakázku
 * ukládá aplikace sama; nikdo na nic klikat nemusí.
 *
 * Hlavička se vyplňuje SKUTEČNÝM PSANÍM do polí, ne přiřazením do ZAK:
 * od 4. 9. 2026 (nález V23-B) autosave zapisuje teprve tehdy, když uživatel
 * opravdu něco udělal — samotná změna dat aplikací se neukládá, protože
 * přesně tím se tiše přepisovaly otevřené zahraniční nabídky. */
const poleHlavicky = (cesta) => page.locator(`#page-proj input[onchange*="'${cesta}'"]`).first();
await poleHlavicky('ZAK.cislo').fill('2026 - OPR - CN - 0777');
await poleHlavicky('ZAK.cislo').press('Tab');
await poleHlavicky('ZAK.nazevAkce').fill('Samo do databáze');
await poleHlavicky('ZAK.nazevAkce').press('Tab');
await page.waitForTimeout(150);
test('po vyplnění hlavičky se uložení naplánovalo samo',
  await page.evaluate(() => ONLINE_STAV.timer !== null));
await page.waitForFunction(() => { try { return ONLINE_STAV.soubor !== ''; } catch (e) { return false; } },
  null, { timeout: 25000 });
test('nová zakázka se do databáze uložila sama, bez kliknutí',
  await page.evaluate(() => ONLINE_STAV.soubor.includes('0777')),
  await page.evaluate(() => ONLINE_STAV.soubor));
test('lišta po uložení hlásí, že zakázka v databázi je',
  /Uloženo v databázi/.test(await page.locator('#page-proj .zak-ulozeni').first().innerText()),
  await page.locator('#page-proj .zak-ulozeni').first().innerText());

/* „Následně už by se měla automaticky po každém kroku uložit do databáze." */
await page.evaluate(() => { ZAK.adresa = 'Zkušební 1, Praha'; render(); });
test('další změna se opět naplánuje k uložení',
  await page.evaluate(() => ONLINE_STAV.timer !== null));
await page.waitForFunction(() => { try { return JSON.stringify(ZAK) === ONLINE_STAV.posledni; } catch (e) { return false; } },
  null, { timeout: 25000 });
test('a po každém kroku se do databáze opravdu zapíše',
  await page.evaluate(() => ONLINE_STAV.posledni.includes('Zkušební 1, Praha')));
test('zakázka „0777" je v rejstříku online zakázek',
  await page.evaluate(() => ONLINE_STAV.rejstrik.some(z => (z.cislo || '').includes('0777'))));

/* ---- 5b2) DUPLIKACE NEZAHODÍ NEULOŽENOU PRÁCI (nález N36 revize v22.9.9) ----
 *
 * Dotaz na neuložené změny se ptal jen režimu SLOŽKY (`ULO_STAV.posledni`),
 * který je vypnutý — v online režimu se tedy nepoložil nikdy a duplikace
 * rozdělanou práci tiše zahodila. A naplánovaný autosave předchozí zakázky
 * zůstal běžet. Tři volby jako u otevření jiné zakázky (V35); dialog se tu
 * nahrazuje odpovědí, kterou dostane. */
const dup = await page.evaluate(async () => {
  const out = {};
  window.__volbaOdpoved = 'zustat';
  window.volba = (t, m) => { window.__dlgTexty.push(String(t)); return Promise.resolve(window.__volbaOdpoved); };
  window.dotaz = (t, v) => { window.__dlgTexty.push(String(t)); return Promise.resolve('2026 - OPR - CN - 0778'); };
  const puvodniCislo = ZAK.cislo;
  const puvodniSoubor = ONLINE_STAV.soubor;
  set('ZAK.adresa', 'Neuložená změna 12, Praha');        // práce, která ještě není na serveru
  out.neulozeno = historieNeulozeno();
  window.__dlgTexty = [];
  await zakazkaDuplikujUI();
  out.zustalo = ZAK.cislo === puvodniCislo && ZAK.adresa === 'Neuložená změna 12, Praha';
  out.zeptal = (window.__dlgTexty || []).some(x => /neuložené změny/i.test(x));
  window.__volbaOdpoved = 'zahodit';
  await zakazkaDuplikujUI();
  out.cislo = ZAK.cislo;
  out.soubor = ONLINE_STAV.soubor;
  out.timer = ONLINE_STAV.timer;
  out.zmena = ONLINE_STAV.zmenaUzivatele;
  /* Úklid: zpátky na uloženou zakázku 0777 (duplikát se zahodí), odemčenou
   * jako dosud — další oddíly (kolize verzí) s ní počítají. */
  window.__volbaOdpoved = 'zahodit';
  await onlineOtevri(puvodniSoubor);
  zamekCteniVypni();
  out.zpet = ONLINE_STAV.soubor === puvodniSoubor;
  delete window.volba;
  return out;
});
test('(zakázka má opravdu neuloženou změnu)', dup.neulozeno === true, dup);
test('duplikace se na neuložené změny zeptá (N36)', dup.zeptal === true, dup);
test('„Zůstat tady" nechá otevřenou zakázku i s rozdělanou prací', dup.zustalo === true, dup);
test('„Zahodit" duplikát založí a odpojí ho od souboru předlohy',
  /0778/.test(dup.cislo) && dup.soubor === '', dup);
test('a naplánovaný autosave předchozí zakázky se zrušil', dup.timer === null, dup);
test('kliknutí v dialogu se za práci na duplikátu nepočítá', dup.zmena === false, dup);
test('(úklid: zpátky na uloženou zakázku)', dup.zpet === true, dup);

/* ---- 5c) záloha databáze: automatická po přihlášení i vynucená ---- */
test('po přihlášení administrátora vznikla dnešní záloha databáze sama',
  await page.evaluate(() => ONLINE_STAV.otiskyNacteno && ONLINE_STAV.otisky.length >= 1),
  await page.evaluate(() => JSON.stringify(ONLINE_STAV.otisky)));
test('záloha nese, kdy vznikla a kolik zakázek zachytila',
  await page.evaluate(() => { const o = ONLINE_STAV.otisky[0];
    return !!o && !!o.porizena && typeof o.pocetZakazek === 'number' && o.pocetUctu >= 1; }));
await page.evaluate(() => onlineZalohaTed());
await page.waitForFunction(() => { try { return !ONLINE_STAV.pracuje && /Záloha databáze pořízena/.test(ONLINE_STAV.hlaska); } catch (e) { return false; } },
  null, { timeout: 8000 });
test('vynucenou zálohu jde pořídit tlačítkem a aplikace to potvrdí',
  await page.evaluate(() => /Záloha databáze pořízena/.test(ONLINE_STAV.hlaska)),
  await page.evaluate(() => ONLINE_STAV.hlaska));
test('vynucená záloha zachytila i zakázku, která se uložila sama',
  await page.evaluate(() => ONLINE_STAV.otisky[0].pocetZakazek >= 2),
  await page.evaluate(() => ONLINE_STAV.otisky[0].pocetZakazek));
test('přehled záloh se ukazuje v kartě Online databáze',
  /Poslední záloha databáze/.test(await page.evaluate(() => onlineOtiskPopis())),
  await page.evaluate(() => onlineOtiskPopis()));
/* Souhrn nesmí vozit obsah databáze – z konzole by se dala přečíst celá. */
test('přehled záloh neveze data zakázek ani hesla',
  await page.evaluate(() => { const t = JSON.stringify(ONLINE_STAV.otisky);
    return !t.includes('Samo do databáze') && !t.includes('heslo'); }));

/* ---- 5c2) hlídka noční zálohy (#152, 24. 9. 2026) ----
 * V harnessu noční funkce nikdy neběžela — jsou tu jen otisky dopořízené
 * při přihlášení a ručně. Přesně ten stav, který dřív vypadal zdravě. */
test('#152: bez noční zálohy dostane administrátor po přihlášení varování',
  await page.evaluate(() => typeof uloZalohaHlidka === 'function'
    && uloZalohaHlidka(ONLINE_STAV.otisky, Date.now()).stara === true));
await page.evaluate(() => { otevriNastaveni(); nastPanel('databaze'); });
await page.waitForTimeout(200);
{
  const html = await page.locator('#nastaveni-panel').innerHTML();
  test('#152: Nastavení → Databáze ukazuje varování o noční záloze',
    /id="online-zalohy-nocni" class="seznam-varovani"/.test(html) && /není žádná noční/.test(html),
    (html.match(/online-zalohy-nocni[^<]*<?[^<]{0,200}/) || [''])[0]);
}
/* Noční otisk z minulé noci — pořídí ho tatáž serverová funkce jako
 * naplánovaná zaloha_nocni, jen s klíčem včerejška. */
await porizOtisk('nocni-otisk', '', new Date(Date.now() - 20 * 3600000).toISOString().slice(0, 10));
await page.evaluate(() => onlineOtiskyNacti().then(() => render()));
await page.waitForTimeout(200);
{
  const html = await page.locator('#nastaveni-panel').innerHTML();
  test('#152: s čerstvou noční zálohou je řádek klidný a jmenuje ji',
    /id="online-zalohy-nocni" class="note"/.test(html) && /Poslední noční záloha:/.test(html),
    (html.match(/online-zalohy-nocni[^<]*<?[^<]{0,200}/) || [''])[0]);
}
test('#152: obchodník hlídku nevidí (jen administrátor)',
  await page.evaluate(() => {
    const ja = ONLINE_STAV.ja; ONLINE_STAV.ja = Object.assign({}, ja, { role: 'Obchodník' });
    try { return !renderOnlineKarta().includes('online-zalohy-nocni'); }
    finally { ONLINE_STAV.ja = ja; }
  }));
test('#152: (pojistka testu) administrátorovi karta hlídku ukazuje',
  await page.evaluate(() => renderOnlineKarta().includes('online-zalohy-nocni')));

/* ---- 5d) obnova databáze ze zálohy (7. 9. 2026) ----
 * Skutečný klient proti skutečné funkci /api/obnova: panel se otevře, bez
 * náhledu je obnova zhasnutá, náhled ukáže čísla a nic nezapíše, obnova
 * smazanou zakázku vrátí. Dialog potvrzuje stub (dlgStub) — jeho text se
 * kontroluje zvlášť. */
await page.evaluate(() => { otevriNastaveni(); nastPanel('databaze'); });
await page.waitForTimeout(300);
const dbPanel = () => page.locator('#nastaveni-panel').innerHTML();
test('administrátor má v kartě Online databáze tlačítko Obnovit ze zálohy…',
  (await dbPanel()).includes('Obnovit ze zálohy'));
await page.evaluate(() => onlineObnovaOtevri());
await page.waitForFunction(() => { try { return ONLINE_STAV.obnova.otevreno && ONLINE_STAV.otiskyNacteno && !!ONLINE_STAV.obnova.otiskDen; } catch (e) { return false; } },
  null, { timeout: 8000 });
await page.waitForTimeout(300);
const tlObnovit = () => page.evaluate(() => {
  const b = [...document.querySelectorAll('#nastaveni-panel button')].find(x => /Obnovit databázi/.test(x.textContent));
  return b ? b.disabled : null;
});
test('panel obnovy je vidět a bez náhledu je tlačítko Obnovit databázi zhasnuté',
  (await dbPanel()).includes('id="online-obnova"') && (await tlObnovit()) === true);
const rejPred = await page.evaluate(() => ONLINE_STAV.rejstrik.length);
await page.evaluate(() => onlineObnovaZmena('rezim', 'prepsat'));
await page.evaluate(() => onlineObnovaNahled());
await page.waitForFunction(() => { try { return !ONLINE_STAV.obnova.pracuje && !!ONLINE_STAV.obnova.nahled; } catch (e) { return false; } },
  null, { timeout: 15000 });
test('náhled z otisku ukáže čísla po částech',
  await page.evaluate(() => { const n = ONLINE_STAV.obnova.nahled;
    return n.nahled === true && n.zdroj.typ === 'otisk' && typeof n.casti.zakazky.bezeZmeny === 'number' && n.casti.zakazky.bezeZmeny >= 2; }),
  await page.evaluate(() => JSON.stringify(ONLINE_STAV.obnova.nahled.casti)));
test('náhled se vykreslí do panelu jako tabulka',
  /Přepsané/.test(await dbPanel()) && /Beze změny/.test(await dbPanel()));
test('po náhledu je tlačítko Obnovit databázi aktivní', (await tlObnovit()) === false);
await page.evaluate(() => onlineOtiskyNacti());
await page.waitForTimeout(300);
test('náhled sám nic nezapsal (žádný otisk před obnovou nevznikl)',
  await page.evaluate(() => !ONLINE_STAV.otisky.some(o => /pred-obnovou/.test(o.den))));
test('změna volby náhled zahodí a obnova zase zhasne',
  await page.evaluate(() => { onlineObnovaZmena('rezim', 'doplnit'); return ONLINE_STAV.obnova.nahled === null; })
  && (await tlObnovit()) === true);

/* Ztráta: smazat nezamčenou (a neotevřenou) zakázku, obnovit z otisku,
 * zakázka je zpátky. Rejstřík po obnově staví server ze skutečného obsahu. */
const smazana = await page.evaluate(async () => {
  const z = ONLINE_STAV.rejstrik.find(x => !x.odeslane && x.soubor !== ONLINE_STAV.soubor) || ONLINE_STAV.rejstrik[0];
  await onlineApi('/api/zakazky?soubor=' + encodeURIComponent(z.soubor), null, 'DELETE');
  await onlineNactiRejstrik();
  return z.soubor;
});
test('smazaná zakázka v rejstříku chybí',
  await page.evaluate(() => ONLINE_STAV.rejstrik.length) === rejPred - 1);
await page.evaluate(() => onlineObnovaZmena('rezim', 'prepsat'));
await page.evaluate(() => onlineObnovaNahled());
await page.waitForFunction(() => { try { return !ONLINE_STAV.obnova.pracuje && !!ONLINE_STAV.obnova.nahled; } catch (e) { return false; } },
  null, { timeout: 15000 });
test('náhled po ztrátě hlásí jednu novou zakázku',
  await page.evaluate(() => ONLINE_STAV.obnova.nahled.casti.zakazky.nove === 1),
  await page.evaluate(() => JSON.stringify(ONLINE_STAV.obnova.nahled.casti.zakazky)));
await page.evaluate(() => onlineObnovaProved());
/* Čeká se na STAV (výsledek, nebo chyba panelu), ne na text hlášky karty —
 * tu může přepsat kterékoli z následných načtení. */
await page.waitForFunction(() => { try { const o = ONLINE_STAV.obnova; return !o.pracuje && (!!o.posledni || !!o.hlaska); } catch (e) { return false; } },
  null, { timeout: 30000 });
test('ostrá obnova proběhla (panel má výsledek, ne chybu)',
  await page.evaluate(() => !!ONLINE_STAV.obnova.posledni && !ONLINE_STAV.obnova.hlaska),
  await page.evaluate(() => 'panel: ' + ONLINE_STAV.obnova.hlaska + ' | karta: ' + ONLINE_STAV.hlaska));
/* Hláška karty je pomíjivá: po obnově ji vzápětí přepíše nasazení ceníku
 * („Platí online ceník…"), a to je správně. Trvalé místo pro výsledek je
 * řádek „Poslední obnova" v panelu — ten se hlídá. */
test('panel ukazuje poslední obnovu',
  /Poslední obnova/.test(await dbPanel()));
test('potvrzovací dialog říká, kolik se zapíše, že vznikne otisk a že se zamčené nepřepíšou',
  /Zapíše se \d+ záznam/.test(await dlgPosledni(page)) && /otisk/.test(await dlgPosledni(page))
  && /Uzamčené/.test(await dlgPosledni(page)), await dlgPosledni(page));
test('obnova zakázku vrátila (rejstřík má zase původní počet a tu zakázku)',
  await page.evaluate(() => ONLINE_STAV.rejstrik.length) === rejPred
  && await page.evaluate((s) => ONLINE_STAV.rejstrik.some(z => z.soubor === s), smazana),
  await page.evaluate(() => ONLINE_STAV.rejstrik.map(z => z.soubor)));
test('po obnově existuje otisk před obnovou a přehled ho ukazuje',
  await page.evaluate(() => ONLINE_STAV.otisky.some(o => /pred-obnovou/.test(o.den))),
  await page.evaluate(() => ONLINE_STAV.otisky.map(o => o.den)));

/* Soubor jako zdroj (7. 9. 2026 večer): stažená záloha se posílá po dávkách
 * (Netlify unese ~6 MB na požadavek). Ověřuje se dělení na dávky i skutečný
 * průchod zacatek → dávky → konec s malým souborem přes <input type=file>. */
test('dělení na dávky drží limit a neztratí žádný záznam',
  await page.evaluate(() => {
    const z = { porizena: new Date().toISOString(), zdroj: 'x', program: { a: 1 }, firma: null, zobrazeni: null,
                uzivatele: [], zakazky: {}, zakaznici: {}, sablony: {}, podpisy: {} };
    const velky = 'x'.repeat(300 * 1024);
    for (let i = 0; i < 40; i++) z.zakazky['z' + i] = { cislo: 'Z' + i, data: velky };
    z.sablony.obr = { data: 'y'.repeat(4 * 1024 * 1024) };            // sám větší než limit → přeskočit
    const { davky, prilisVelke } = onlineObnovaDavky(z, OBNOVA_CASTI.map(([k]) => k));
    const klice = new Set(); let maxB = 0;
    davky.forEach(d => { maxB = Math.max(maxB, onlineObnovaVelikost(d)); Object.keys(d.zakazky || {}).forEach(k => klice.add(k)); });
    return davky.length >= 3 && maxB <= OBNOVA_DAVKA_MAX_B && klice.size === 40
      && prilisVelke.length === 1 && prilisVelke[0].klic === 'obr'
      && davky.every(d => d.porizena === z.porizena && d.zdroj === 'x')
      && davky.every(d => !(d.zakazky && d.sablony));                  // části se v dávce nemíchají
  }));
const zalohaText = await page.evaluate(() => onlineApi('/api/zaloha').then(o => JSON.stringify(o.zaloha)));
await page.evaluate(() => onlineObnovaZmena('zdrojTyp', 'soubor'));
await page.waitForTimeout(200);
await page.setInputFiles('#online-obnova input[type=file]',
  { name: 'zaloha_online_test.json', mimeType: 'application/json', buffer: Buffer.from(zalohaText) });
await page.waitForFunction(() => { try { return !!ONLINE_STAV.obnova.soubor; } catch (e) { return false; } }, null, { timeout: 8000 });
test('nahraný soubor zálohy se načte a panel ukáže jeho jméno a razítko',
  /zaloha_online_test\.json/.test(await dbPanel()) && /pořízena/.test(await dbPanel()));
await page.evaluate(() => onlineObnovaZmena('rezim', 'prepsat'));
await page.evaluate(() => onlineObnovaNahled());
await page.waitForFunction(() => { try { return !ONLINE_STAV.obnova.pracuje && (!!ONLINE_STAV.obnova.nahled || !!ONLINE_STAV.obnova.hlaska); } catch (e) { return false; } },
  null, { timeout: 20000 });
test('náhled ze souboru proběhl po dávkách a hlásí zakázky beze změny',
  await page.evaluate(() => { const n = ONLINE_STAV.obnova.nahled;
    return !!n && n.davek >= 1 && n.zdroj && n.zdroj.typ === 'soubor' && n.casti.zakazky.bezeZmeny >= 2 && n.casti.zakazky.nove === 0; }),
  await page.evaluate(() => ONLINE_STAV.obnova.hlaska || JSON.stringify(ONLINE_STAV.obnova.nahled && ONLINE_STAV.obnova.nahled.casti)));
test('účty ze souboru se v náhledu přeskočí s vysvětlením (bez otisků hesel)',
  await page.evaluate(() => { const u = ONLINE_STAV.obnova.nahled.casti.uzivatele; return u.preskocene >= 1 && u.duvody.every(d => /otisk/.test(d.duvod)); }));
const rejPredSouborem = await page.evaluate(() => ONLINE_STAV.rejstrik.length);
await page.evaluate(() => onlineObnovaProved());
await page.waitForFunction(() => { try { const o = ONLINE_STAV.obnova; return !o.pracuje && (!!o.posledni && /soubor|dávk|záznamů/.test(o.posledni.zprava) || !!o.hlaska); } catch (e) { return false; } },
  null, { timeout: 30000 });
test('ostrá obnova ze souboru proběhla (zacatek → dávky → konec)',
  await page.evaluate(() => !ONLINE_STAV.obnova.hlaska && !!ONLINE_STAV.obnova.posledni && ONLINE_STAV.obnova.posledni.souhrn.bezeZmeny >= 2),
  await page.evaluate(() => 'panel: ' + ONLINE_STAV.obnova.hlaska + ' | posledni: ' + JSON.stringify(ONLINE_STAV.obnova.posledni)));
test('po obnově ze souboru má rejstřík stejný počet zakázek (nic nepřibylo, nic nezmizelo)',
  await page.evaluate(() => ONLINE_STAV.rejstrik.length) === rejPredSouborem);
await page.evaluate(() => { onlineObnovaOtevri(); zavriNastaveni(); });

/* ---- 5e) kolize verzí při ukládání (nález V27, 8. 9. 2026) ----
 * Server odmítne zápis se starým razítkem (409). Do 8. 9. se klient ptal
 * modálem, který automatizace neviděla, tlačítko zůstalo v „Ukládám…"
 * a autosave sypal 409 dál. Teď: hláška s dvěma tlačítky, autosave stojí,
 * „přepsat" ukládá s razítkem ze serveru, „načíst znovu" zahodí změny. */
const zamcenoPredKolizi = await page.evaluate(() => zamekCteniJe());
await page.evaluate(() => zamekCteniVypni());
const souborKolize = await page.evaluate(() => ONLINE_STAV.soubor);
const cizi = await page.evaluate(async (soubor) => {
  /* kolega z druhé záložky: načte serverovou verzi a uloží ji s jejím razítkem */
  const o = await onlineApi('/api/zakazky?soubor=' + encodeURIComponent(soubor));
  const z = o.zakazka; z.nazevAkce = 'Uložil kolega';
  const u = await onlineApi('/api/zakazky', { zakazka: z, ocekavaneRazitko: uloRazitko(z) });
  return { ok: u.ok, jine: u.razitko !== ONLINE_STAV.razitko };
}, souborKolize);
test('cizí zápis téže zakázky prošel a server má nové razítko', cizi.ok === true && cizi.jine, cizi);
const poKolizi = await page.evaluate(async () => {
  ZAK.nazevAkce = 'Moje změna po kolizi';
  const v = await onlineUloz();
  return { v, kolize: !!ONLINE_STAV.kolize, hlaska: ONLINE_STAV.hlaska, uklada: ZAKULO_STAV.uklada, pracuje: ONLINE_STAV.pracuje,
    tlacitka: /Načíst znovu ze serveru/.test(document.body.innerHTML) && /Přepsat serverovou verzi/.test(document.body.innerHTML) };
});
test('ruční uložení po cizím zápisu skončí kolizí bez dialogu: vrátí false, hláška svítí, tlačítko je v klidu',
  poKolizi.v === false && poKolizi.kolize && /mezitím uložil/.test(poKolizi.hlaska) && !poKolizi.uklada && !poKolizi.pracuje, poKolizi);
test('hláška nabízí obě cesty (Načíst znovu ze serveru / Přepsat serverovou verzi)', poKolizi.tlacitka, poKolizi);
test('po kolizi autosave stojí (tik nic nenaplánuje) a další ruční uložení jen zopakuje hlášku',
  await page.evaluate(async () => {
    ONLINE_STAV.zmenaUzivatele = true; ZAK.nazevAkce = 'Moje změna po kolizi 2'; onlineTik();
    const v = await onlineUloz();
    return ONLINE_STAV.timer === null && !!ONLINE_STAV.kolize && v === false;
  }));
const prepsano = await page.evaluate(async (soubor) => {
  const v = await onlineKolizePrepsat();
  const o = await onlineApi('/api/zakazky?soubor=' + encodeURIComponent(soubor));
  return { v, kolize: ONLINE_STAV.kolize, naServeru: o.zakazka.nazevAkce,
    razitkoSedi: ONLINE_STAV.razitko === o.zakazka.uloRazitko && ZAK.uloRazitko === o.zakazka.uloRazitko };
}, souborKolize);
test('„Přepsat serverovou verzi" uloží moje změny a převezme nové razítko do stavu i do zakázky',
  prepsano.v === true && prepsano.kolize === null && prepsano.naServeru === 'Moje změna po kolizi 2' && prepsano.razitkoSedi, prepsano);
await page.evaluate(async (soubor) => {
  const o = await onlineApi('/api/zakazky?soubor=' + encodeURIComponent(soubor));
  const z = o.zakazka; z.nazevAkce = 'Kolega podruhé';
  await onlineApi('/api/zakazky', { zakazka: z, ocekavaneRazitko: uloRazitko(z) });
  ZAK.nazevAkce = 'Moje, co se zahodí';
  await onlineUloz();
}, souborKolize);
const nacteno = await page.evaluate(async () => {
  const kolize = !!ONLINE_STAV.kolize;
  const v = await onlineKolizeNacti();
  return { kolize, v, nazev: ZAK.nazevAkce, kolizePo: ONLINE_STAV.kolize };
});
test('„Načíst znovu ze serveru" zahodí moje změny a otevře serverovou verzi',
  nacteno.kolize && nacteno.v === true && nacteno.nazev === 'Kolega podruhé' && nacteno.kolizePo === null, nacteno);
await page.evaluate(() => zamekCteniVypni());
const soubeh = await page.evaluate(async () => {
  ZAK.nazevAkce = 'Souběh dvou zápisů';
  const [a, b] = await Promise.all([onlineUloz(), onlineUloz()]);
  return { a, b, kolize: ONLINE_STAV.kolize };
});
test('dva ruční zápisy najednou se serializují a žádný neskončí kolizí', soubeh.a === true && soubeh.b === true && soubeh.kolize === null, soubeh);
/* úklid: původní název, čerstvý otisk (další kroky s ním počítají), zámek jako předtím */
await page.evaluate(async () => { ZAK.nazevAkce = 'Online ověření'; await onlineUloz(); ONLINE_STAV.zmenaUzivatele = false; });
await page.evaluate(() => onlineZalohaTed());
await page.waitForFunction(() => { try { return !ONLINE_STAV.pracuje && /Záloha databáze pořízena/.test(ONLINE_STAV.hlaska); } catch (e) { return false; } },
  null, { timeout: 8000 });
await page.evaluate((z) => { if (z) zamekCteniZapni(); render(); }, zamcenoPredKolizi);

await page.evaluate(() => prepniTab('zakazka'));

/* ---- 6) správa účtů v Nastavení ---- */
await page.evaluate(() => { otevriNastaveni(); nastPanel('uzivatele'); });
await page.waitForFunction(() => { try { return ONLINE_STAV.uzivateleNacteno; } catch (e) { return false; } });
await page.waitForTimeout(300);
const nastav = () => page.locator('#nastaveni-panel').innerHTML();
test('Nastavení → Uživatelé ukazuje účty online databáze',
  (await nastav()).includes('spravce@priklad.cz') && (await nastav()).includes('hlavní'));

/* Zadání 4. 8. 2026: „Při tvoření hesla přidej informaci, že heslo musí mít
 * minimálně 8 znaků." Požadavek se musí dozvědět DŘÍV, než heslo vymyslí –
 * proto stojí u samotného pole, ne až v hlášce o odmítnutí. */
test('u pole s počátečním heslem je vidět požadavek na délku',
  await page.evaluate(() => {
    const i = document.getElementById('onlineUzHeslo'); if (!i) return false;
    const r = i.closest('.row') || i.parentElement;
    const text = (r ? r.innerText : '') + ' ' + (i.placeholder || '') + ' ' + (i.title || '');
    return /8\s*znak/i.test(text);
  }));
/* Čte se innerText, ne innerHTML: věta je „Heslo musí mít <b>alespoň 8
 * znaků</b>." a značky uprostřed by hledání rozbily. */
test('a panel to vysvětluje i celou větou',
  /(alespoň|aspoň|minimálně|nejméně)\s*8\s*znak/i.test(await page.locator('#nastaveni-panel').innerText()));

/* Chybová cesta (4. 8. 2026 večer): krátké heslo dřív formulář tiše smazalo
 * a nic neřeklo. Teď musí hláška stát přímo v panelu a pole zůstat vyplněná. */
await page.fill('#onlineUzEmail', 'obchodnik@priklad.cz');
await page.fill('#onlineUzJmeno', 'Zkušební Obchodník');
await page.fill('#onlineUzHeslo', 'kratke');
await page.click('#nastaveni-panel >> text=Založit účet');
await page.waitForTimeout(300);
test('krátké heslo: důvod odmítnutí je vidět přímo v panelu Uživatelé',
  (await nastav()).includes('aspoň 8 znaků'));
test('krátké heslo: vyplněná pole se NEsmazala',
  await page.evaluate(() => document.getElementById('onlineUzEmail').value === 'obchodnik@priklad.cz'
    && document.getElementById('onlineUzJmeno').value === 'Zkušební Obchodník'));

/* Úspěch — KLIKEM na tlačítko, přesně jako uživatel. */
await page.fill('#onlineUzHeslo', 'ObchodniHeslo1');
await page.click('#nastaveni-panel >> text=Založit účet');
await page.waitForFunction(() => { try { return ONLINE_STAV.uzivatele.length === 2; } catch (e) { return false; } });
await page.waitForTimeout(300);
test('nový účet obchodníka se založil klikem z Nastavení',
  await page.evaluate(() => ONLINE_STAV.uzivatele.some(u => u.email === 'obchodnik@priklad.cz' && u.role === 'Obchodník')));
test('založení potvrzuje hláška přímo v panelu a nový řádek v tabulce',
  (await nastav()).includes('je založený') && (await nastav()).includes('obchodnik@priklad.cz'));
test('po úspěchu se formulář vyprázdnil',
  await page.evaluate(() => document.getElementById('onlineUzEmail').value === ''
    && document.getElementById('onlineUzHeslo').value === ''));
test('opakované založení téhož účtu řekne důvod (účet už existuje)', await (async () => {
  await page.fill('#onlineUzEmail', 'obchodnik@priklad.cz');
  await page.fill('#onlineUzHeslo', 'JinaHesla123');
  await page.click('#nastaveni-panel >> text=Založit účet');
  await page.waitForTimeout(400);
  return (await nastav()).includes('Účet už existuje');
})());
await page.evaluate(() => { ONLINE_STAV.uzForm = { email: '', jmeno: '', role: 'Obchodník', heslo: '' }; zavriNastaveni(); });

/* ---- 7) záloha ke stažení ---- */
const [stazeni] = await Promise.all([
  page.waitForEvent('download'),
  page.evaluate(() => onlineZaloha(false)),
]);
test('záloha se stáhne pod jménem s dnešním datem',
  stazeni.suggestedFilename() === 'zaloha_online_' + new Date().toISOString().slice(0, 10) + '.json');

/* ---- 8) relace přežije obnovení stránky ---- */
await page.reload();
await page.waitForFunction(() => typeof window.render === 'function');
await page.waitForFunction(() => { try { return !!ONLINE_STAV.ja; } catch (e) { return false; } },
  null, { timeout: 8000 });
await dlgStub(page);
await page.waitForTimeout(400);
test('po obnovení stránky je administrátor dál přihlášený a stránka se neukázala',
  !(await gateViditelna()) && await page.evaluate(() => ONLINE_STAV.ja.email === 'spravce@priklad.cz'));
test('platný ceník se po obnovení načetl a nasadil sám',
  await page.evaluate(() => ONLINE_STAV.db.platny.verze === 1 && ONLINE_STAV.cenikPouzit === true));

/* ---- 9) odhlášení → přihlašovací stránka; obchodník a jeho pohled ---- */
await page.evaluate(() => onlineOdhlas());
await page.waitForFunction(() => { try { return ONLINE_STAV.ja === null; } catch (e) { return false; } });
await page.waitForTimeout(300);
test('po odhlášení se vrátí přihlašovací stránka', await gateViditelna());

/* Obnovení stránky = čerstvý obchodník: v paměti aplikace zůstal po
 * administrátorovi jak nasazený ceník, tak ručně přepsaná firma, takže bez
 * reloadu by se testovalo něco, co u obchodníka na jeho počítači nikdy
 * nenastane. Po reloadu má aplikace zase jen vzorky ze sestavení a je vidět,
 * co pro něj online databáze opravdu udělá. */
await page.reload();
await page.waitForFunction(() => typeof window.render === 'function');
await page.waitForTimeout(400);
await dlgStub(page);
test('po odhlášení a obnovení stránky se aplikace zase zamkne', await gateViditelna());
test('čerstvá aplikace startuje s ukázkovou firmou',
  await page.evaluate(() => NAST.firma.ukazkove === true));

await prihlas('obchodnik@priklad.cz', 'ObchodniHeslo1');
await page.waitForFunction(() => { try { return !!ONLINE_STAV.ja; } catch (e) { return false; } });
await page.waitForTimeout(400);
test('obchodník je přihlášený a roh to říká',
  (await roh()).includes('Zkušební Obchodník') && (await roh()).includes('Obchodník'));
test('obchodník NENÍ administrátor aplikace',
  await page.evaluate(() => NAST.jeAdmin === false));
/* Karty databáze se 21. 8. 2026 večer přestěhovaly z Přehledu cenových
 * nabídek do Nastavení → Databáze (zadání J. V.) — je to nastavení spojení,
 * ne nástroj obchodníka. Práva se tím nemění: složku vidí jen administrátor,
 * online databázi každý přihlášený. */
const stranka = await page.evaluate(() => {
  otevriNastaveni(); nastPanel('databaze');
  const el = document.getElementById('nastaveni-panel');
  const html = el ? el.innerHTML : '';
  zavriNastaveni();
  return html;
});
test('obchodník nevidí kartu složky _DB (mapování jen pro administrátora)',
  !stranka.includes('Databáze zakázek (složka)'));
test('obchodník kartu Online databáze vidí v Nastavení → Databáze',
  stranka.includes('Online databáze (' + new URL(ADRESA).host + ')'));
/* Obnova databáze (7. 9. 2026): obchodník tlačítko vůbec nevidí — a kdyby
 * cestu zavolal ručně, odmítne ho server, ne jen obrazovka. */
test('obchodník v kartě Online databáze nemá tlačítko Obnovit ze zálohy…',
  !stranka.includes('Obnovit ze zálohy'));
test('a když cestu /api/obnova zavolá ručně, server ho odmítne (403)',
  await page.evaluate(() => fetch('/api/obnova', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nahled: true, rezim: 'doplnit', zdroj: { otisk: '2026-01-01' } }) }).then(r => r.status)) === 403);

/* Přesně to, co uživatel hlásil: „Přihlásil jsem se jako nový uživatel
 * (obchodník) a přesto to po mně chce připojit databázi." Lišta ukázkových
 * dat ho nesmí posílat pro složku, ke které se nikdy nedostane. Měří se na
 * vynuceném vzorku, protože po nasazení online dat lišta správně zhasne –
 * a na zhasnuté liště by test tiše prošel, aniž by cokoli ověřil. */
const listaObchodnika = await page.evaluate(() => {
  const zaloha = NAST.firma;
  NAST.firma = firmaDefault();          // jen na okamžik měření
  const html = ukazkoveLista();
  NAST.firma = zaloha;
  return html;
});
test('lišta obchodníka nenabízí připojení složky',
  !/Připojit složku|Připojit znovu složku/.test(listaObchodnika), listaObchodnika);
test('lišta obchodníka vůbec nemluví o složce _DB',
  !listaObchodnika.includes('_DB'), listaObchodnika);
test('lišta obchodníka ho posílá za administrátorem',
  /administrátor/i.test(listaObchodnika), listaObchodnika);

/* A druhá polovina téhož zadání: když už mu složku nenabízíme, musí data
 * dostat odjinud. Ceník i firemní údaje si aplikace stáhne z online databáze
 * sama, bez jediného kliknutí. */
await page.waitForFunction(() => { try { return NAST.firma.ukazkove === undefined; } catch (e) { return false; } },
  null, { timeout: 8000 });
test('obchodník dostal skutečné firemní údaje z online databáze',
  await page.evaluate(() => NAST.firma.nazev === 'Zkušební ocelárna s.r.o.' && NAST.firma.ico === '12345678'),
  await page.evaluate(() => NAST.firma.nazev));
test('obchodníkovi se nasadil i platný ceník z online databáze',
  await page.evaluate(() => ONLINE_STAV.cenikPouzit === true));
test('a červená lišta ukázkových dat mu zhasla',
  (await page.locator('#ukazkoveLista').innerHTML()).trim() === '',
  await page.locator('#ukazkoveLista').innerHTML());

/* Ruční přepis a složka mají mít přednost: online verze nesmí přepsat něco,
 * co si administrátor nastavil sám. Kontroluje se přímo pravidlo z onlineTik. */
test('online firma se nasazuje jen na vzorek, ne přes skutečné údaje',
  await page.evaluate(() => ONLINE_STAV.firmaPouzita === true));

/* ---- 10) změna vlastního hesla přes okno v rohu ---- */
await page.evaluate(() => otevriZmenaHesla());
await page.waitForTimeout(200);
await page.fill('#hesloStare', 'ObchodniHeslo1');
await page.fill('#hesloNove', 'ObchodniHeslo2');
await page.fill('#hesloNove2', 'ObchodniHeslo2');
await page.evaluate(() => onlineZmenHeslo());
await page.waitForTimeout(400);
test('změna vlastního hesla proběhla',
  await page.evaluate(() => ONLINE_STAV.hlaska.includes('Heslo je změněné')));
await page.evaluate(() => onlineOdhlas());
await page.waitForFunction(() => { try { return ONLINE_STAV.ja === null; } catch (e) { return false; } });
await prihlas('obchodnik@priklad.cz', 'ObchodniHeslo1');
test('staré heslo už neplatí', (await gate()).includes('Nesprávný e-mail nebo heslo'));
await prihlas('obchodnik@priklad.cz', 'ObchodniHeslo2');
await page.waitForFunction(() => { try { return !!ONLINE_STAV.ja; } catch (e) { return false; } });
test('novým heslem se obchodník přihlásí', !(await gateViditelna()));

/* ---- 10b) seznam zákazníků (#162, 20. 8. 2026) ----
 * Databáze má jediný smysl: nepsat totéž podruhé. Sada projde celou cestu —
 * z hlavičky zakázky vznikne karta, karta se přenese do nové zakázky a rozdíl
 * se NABÍDNE, nikdy nezapíše potichu. */
/* Jede se pod účtem, který je zrovna přihlášený (obchodník) — schválně:
 * kartu zákazníka má zakládat obchodník u zákazníka, ne administrátor. */
console.log('\nseznam zákazníků');
await page.evaluate(() => {
  ZAK.objednatel = 'Zkušební ocelárna s.r.o.'; ZAK.ico = '12345679';
  ZAK.adresaObjednatele = 'Sídlištní 2, Zkušebín';
  ZAK.zastupci.smluvniJmeno = 'Ing. Petr Sedlák';
  ZAK.zastupci.smluvniPozice = 'jednatel';
  ZAK.zastupci.technickyEmail = 'technik@zkusebni.cz';
  zakaznikZeZakazkyUI();
});
test('karta se předvyplní z otevřené zakázky',
  await page.evaluate(() => !!ZAK_DB.otevreny && ZAK_DB.otevreny.nazev === 'Zkušební ocelárna s.r.o.'
    && ZAK_DB.otevreny.smluvniPozice === 'jednatel'));
await page.evaluate(() => zakaznikUloz());
await page.waitForFunction(() => { try { return ZAK_DB.seznam.length === 1; } catch (e) { return false; } },
  null, { timeout: 15000 });
test('karta se uložila na server a je v seznamu',
  await page.evaluate(() => ZAK_DB.seznam[0].nazev === 'Zkušební ocelárna s.r.o.'
    && ZAK_DB.seznam[0].ico === '12345679'));
test('server doplnil autora a čas úpravy',
  await page.evaluate(() => !!ZAK_DB.seznam[0].autor && !!ZAK_DB.seznam[0].upraven));
test('nová zakázka si kartu vyzvedne jedním kliknutím',
  await page.evaluate(() => {
    ZAK = novaZakazka(); syncVarianta();
    zakaznikDoZakazkyUI('12345679');
    return ZAK.objednatel === 'Zkušební ocelárna s.r.o.'
      && ZAK.zastupci.technickyEmail === 'technik@zkusebni.cz'
      && ZAK.zakaznikId === '12345679';
  }));
test('a co obchodník v zakázce přepíše, se do karty samo nevrátí',
  await page.evaluate(() => {
    ZAK.zastupci.technickyEmail = 'jiny@zkusebni.cz';
    return ZAK_DB.seznam[0].technickyEmail === 'technik@zkusebni.cz';
  }));
test('rozdíl se najde a NABÍDNE (potvrzuje ho člověk)',
  await page.evaluate(async () => {
    /* Od 2. 9. 2026 se ptá in-app modál (potvrd), ne nativní confirm. */
    let text = '';
    const puvodni = window.potvrd;
    window.potvrd = (t) => { text = String(t); return Promise.resolve(false); };
    await zakaznikNabidniAktualizaci();
    window.potvrd = puvodni;
    return /jiny@zkusebni/.test(text) && ZAK_DB.seznam[0].technickyEmail === 'technik@zkusebni.cz';
  }));
test('po potvrzení se karta doplní',
  await page.evaluate(async () => {
    const puvodni = window.potvrd; window.potvrd = () => Promise.resolve(true);
    await zakaznikNabidniAktualizaci();
    window.potvrd = puvodni;
    return ZAK_DB.seznam[0].technickyEmail === 'jiny@zkusebni.cz';
  }));
/* ---- výběr firmy našeptávačem vyplní IČO a kontakt (22. 8. 2026 večer) ---- */
test('výběr firmy z našeptávače vyplní do prázdné hlavičky IČO a sídlo; víc jmen → nabídka k výběru',
  await page.evaluate(() => {
    ZAK = novaZakazka(); syncVarianta(); prepniTab('kalk'); render();
    ZAK_DB.seznam[0].kontaktOsoba = 'Karel Kontakt';   // lokálně: dvě jména (smluvní Sedlák + kontakt)
    naseptavacZakVyber('Zkušební ocelárna s.r.o.', 'ock');
    const box = document.getElementById('naseptBoxZak_ock');
    return ZAK.objednatel === 'Zkušební ocelárna s.r.o.' && ZAK.ico === '12345679'
      && ZAK.adresaObjednatele === 'Sídlištní 2, Zkušebín' && ZAK.kontakt === ''
      && !!box && box.style.display !== 'none' && /Karel Kontakt/.test(box.innerHTML) && /Sedlák/.test(box.innerHTML);
  }));
test('kliknutí na jméno v nabídce vyplní kontaktní osobu a nabídku zavře',
  await page.evaluate(async () => {
    naseptavacZakKontaktVyber('Karel Kontakt', 'ock');
    await new Promise(r => setTimeout(r, 250));
    const box = document.getElementById('naseptBoxZak_ock');
    return ZAK.kontakt === 'Karel Kontakt' && (!box || box.style.display === 'none');
  }));
test('jediné jméno se vyplní rovnou; vyplněná pole hlavičky se nepřepisují',
  await page.evaluate(() => {
    ZAK_DB.seznam[0].kontaktOsoba = '';
    ZAK = novaZakazka(); syncVarianta(); ZAK.ico = '99999999'; render();
    naseptavacZakVyber('Zkušební ocelárna s.r.o.', 'ock');
    return ZAK.kontakt === 'Ing. Petr Sedlák' && ZAK.ico === '99999999' && ZAK.zakaznikId === '12345679';
  }));
test('firma jen z rejstříku (bez karty) vyplní jen název',
  await page.evaluate(() => {
    ZAK = novaZakazka(); syncVarianta(); render();
    naseptavacZakVyber('Neznámá firma bez karty', 'ock');
    return ZAK.objednatel === 'Neznámá firma bez karty' && ZAK.ico === '' && ZAK.kontakt === '';
  }));
test('hledání najde zákazníka podle IČO i názvu',
  await page.evaluate(() => zakazniciHledej(ZAK_DB.seznam, '1234567').length === 1
    && zakazniciHledej(ZAK_DB.seznam, 'ocelarna').length === 1));

/* ---- 10c) vynucené obnovení při nové verzi + nová zakázka z lišty zámku (8. 9. 2026) ---- */
const prekryv = await page.evaluate(() => {
  const moje = buildVerze();
  ONLINE_STAV.serverVerze = '99.9.9'; renderVerzePill();
  const ov = document.getElementById('verze-overlay');
  const stav = { zobrazen: !!ov && ov.style.display !== 'none',
    tlacitko: !!ov && /Obnovit stránku/.test(ov.innerHTML),
    veta: !!ov && /99\.9\.9/.test(ov.innerHTML) && new RegExp(moje.replace(/\./g, '\\.')).test(ov.innerHTML),
    nadVsim: !!ov && parseInt(getComputedStyle(ov).zIndex, 10) >= 300 };
  ONLINE_STAV.serverVerze = moje; renderVerzePill();
  stav.skryt = document.getElementById('verze-overlay').style.display === 'none';
  return stav;
});
test('rozdíl verzí položí přes aplikaci překryv s jediným tlačítkem Obnovit stránku',
  prekryv.zobrazen && prekryv.tlacitko && prekryv.veta && prekryv.nadVsim, prekryv);
test('shodná verze překryv zase schová', prekryv.skryt, prekryv);

/* Nová verze při rozpracované práci NEJDŘÍV uloží, teprve pak pustí obnovení
 * (9. 9. 2026, zadání J. V.: „ať se obchodníkovi nic neztratí"). */
{
  /* a) nic rozpracovaného → uložení se nespouští a tlačítko je hned živé */
  const bezZmen = await page.evaluate(() => {
    VERZE_ULOZ.stav = ''; VERZE_ULOZ.text = '';
    historieOznacUlozeno();                       // stav = uloženo, nic rozpracovaného
    ONLINE_STAV.serverVerze = '99.9.9'; renderVerzePill();
    return { duvod: verzeUlozDuvod() };
  });
  await page.waitForFunction(() => VERZE_ULOZ.stav !== '', { timeout: 5000 });
  const bezZmenPo = await page.evaluate(() => ({
    stav: VERZE_ULOZ.stav,
    tlacitkoZive: !document.querySelector('#verze-overlay button').disabled,
    text: (document.getElementById('verze-uloz-stav') || {}).textContent || '',
  }));
  test('bez rozpracovaných změn se neukládá a tlačítko je hned živé',
    bezZmen.duvod === 'nic rozpracovaného' && bezZmenPo.stav === 'neni-co' && bezZmenPo.tlacitkoZive,
    JSON.stringify([bezZmen, bezZmenPo]));

  /* b) rozpracovaná změna u přihlášeného na uložené zakázce → tiché uložení.
   * Zakázku si test založí a uloží SÁM: kterákoli z rejstříku může být
   * uzamčená (odeslaná nabídka), a pak by se ukládat nesmělo — test by pak
   * měřil zámek, ne ukládání. „Rozpracované" se nastavuje přímo v HIST,
   * protože autosave (onlineTik) by změnu mohl uložit dřív, než se na ni
   * stihneme zeptat, a výsledek by byl náhodný. */
  const pred = await page.evaluate(async () => {
    ONLINE_STAV.serverVerze = buildVerze(); renderVerzePill();      // překryv pryč
    VERZE_ULOZ.stav = ''; VERZE_ULOZ.text = '';
    ZAK = novaZakazka();
    ZAK.cislo = '2026 - OPR - CN - 0998'; ZAK.nazevAkce = 'Uložení před vynuceným obnovením';
    syncVarianta(); render();
    await onlineUloz();                                             // vlastní odemčená zakázka
    set('Z.nastupiste', (+Z.nastupiste || 2) + 1);                  // rozpracovaná změna
    HIST.ulozenoJako = '{"jiny":"stav"}';                           // = neuloženo, bez ohledu na autosave
    return { neulozeno: historieNeulozeno(), duvod: verzeUlozDuvod(),
             soubor: ONLINE_STAV.soubor, nastupiste: +Z.nastupiste };
  });
  await page.evaluate(() => { ONLINE_STAV.serverVerze = '99.9.9'; renderVerzePill(); });
  await page.waitForFunction(() => VERZE_ULOZ.stav === 'ulozeno' || VERZE_ULOZ.stav === 'chyba'
    || VERZE_ULOZ.stav === 'neni-co', { timeout: 15000 });
  const po = await page.evaluate(() => ({
    stav: VERZE_ULOZ.stav,
    text: (document.getElementById('verze-uloz-stav') || {}).textContent || '',
    tlacitkoZive: !document.querySelector('#verze-overlay button').disabled,
    porad: historieNeulozeno(),
  }));
  test('rozpracovaná změna se před vynuceným obnovením sama uloží',
    pred.neulozeno === true && pred.duvod === '' && po.stav === 'ulozeno',
    JSON.stringify([pred, po]));
  test('a překryv to řekne a teprve pak pustí obnovení',
    /uložená/i.test(po.text) && po.tlacitkoZive, JSON.stringify(po));
  /* Uložená verze na serveru musí nést tu změnu — jinak by „uloženo" lhalo. */
  const naServeru = await page.evaluate(async (s) => {
    const d = await onlineApi('/api/zakazky?soubor=' + encodeURIComponent(s));
    const v = d.zakazka.varianty.find(x => x.id === d.zakazka.aktivni) || d.zakazka.varianty[0];
    return v.data.ock.zadani.nastupiste;
  }, pred.soubor);
  test('a v databázi je opravdu ta rozpracovaná hodnota',
    naServeru === pred.nastupiste, JSON.stringify({ naServeru, cekano: pred.nastupiste }));
  await page.evaluate(() => { ONLINE_STAV.serverVerze = buildVerze(); renderVerzePill(); VERZE_ULOZ.stav = ''; });
}
const listaZamku = await page.evaluate(() => {
  ZAK = novaZakazka(); syncVarianta();
  zamkniVariantu(aktivniVarianta(ZAK), { typ: 'nabidka', kdy: new Date().toISOString(), kdo: 'Harness' });
  render();
  const html = (document.getElementById('zamekLista') || {}).innerHTML || '';
  const nova = [...document.querySelectorAll('#zamekLista button')].find(b => /Založit novou zakázku/.test(b.textContent));
  const stav = { klon: /Klonovat a pokračovat/.test(html), nova: !!nova,
    poradi: html.indexOf('Klonovat a pokračovat') < html.indexOf('Založit novou zakázku'),
    ziva: nova ? getComputedStyle(nova).pointerEvents !== 'none' : false };
  ZAK = novaZakazka(); syncVarianta(); render();
  return stav;
});
test('lišta uzamčené varianty nabízí za Klonovat i Založit novou zakázku (živé tlačítko)',
  listaZamku.klon && listaZamku.nova && listaZamku.poradi && listaZamku.ziva, listaZamku);

/* ---- 10d) VÝSLEDEK NOVÉHO ZÁMKU OVĚŘÍ SERVER (nález B59 revize v22.9.9) ----
 * Server výsledek nově odeslané nabídky přepočítá a porovnání zapíše do zámku.
 * Node sady to zkoušejí nad modelem; tady jde o to, co Node nevidí: že výsledek,
 * který spočítá SKUTEČNÝ prohlížeč (zamekPoTisku z tiskového náhledu), server
 * po cestě přes síť a importZakazka uzná za shodný — plané „nesouhlasí" by
 * strašilo obchodníky u každé odeslané nabídky. A naopak: upravený klient
 * dostane varování a rozpor uvidí každý v liště zámku. */
{
  /* Ceník ze sestavení je v repozitáři vynulovaný — shoda 0 = 0 by nic
   * nedokázala. Smyšlený zkušební ceník (týž jako v Node sadách). */
  const ZKC = require('./src/zkusebni_cenik.js');
  const ceniky = { ock: ZKC.zkusebniCenik(), proj: ZKC.zkusebniCenikProj() };
  const poctiva = await page.evaluate(async (ceniky) => {
    ZAK = novaZakazka(); ZAK.cislo = '2026 - OPR - CN - 0761'; ZAK.nazevAkce = 'B59 poctivá';
    aktivniVarianta(ZAK).data.cenik = ceniky.ock; aktivniVarianta(ZAK).data.proj.cenik = ceniky.proj;
    syncVarianta(); render();
    await onlineUloz();
    zamekPoTisku('nabidkaTisk', aktivniVarianta(ZAK).id);
    await onlineUloz();
    const d = await onlineApi('/api/zakazky?soubor=' + encodeURIComponent(ONLINE_STAV.soubor));
    const z = d.zakazka.varianty[0].zamek || {};
    return { overeni: z.overeni || null, klient: buildVerze(), hlaska: ONLINE_STAV.hlaska,
             typ: ONLINE_STAV.hlaskaTyp, castka: ((z.vysledek || {}).ock || {}).souhrn
               ? z.vysledek.ock.souhrn.zakladCena : null };
  }, ceniky);
  test('B59: nabídka zamčená tiskem v prohlížeči má u serveru shodu',
    poctiva.overeni && poctiva.overeni.stav === 'shoda' && poctiva.overeni.rozdilu === 0,
    JSON.stringify(poctiva));
  test('B59: a zkouší se na nenulových číslech (smyšlený zkušební ceník)', poctiva.castka > 0, poctiva.castka);
  test('B59: razítko nese verzi stránky, která výsledek spočítala',
    poctiva.overeni && poctiva.overeni.klient === poctiva.klient && /^v\d/.test(poctiva.klient),
    JSON.stringify(poctiva.overeni));
  test('B59: poctivé uložení žádné varování nenese',
    poctiva.typ !== 'varovani' && !/Pozor/.test(poctiva.hlaska), poctiva.hlaska);

  const upraveny = await page.evaluate(async (ceniky) => {
    ZAK = novaZakazka(); ZAK.cislo = '2026 - OPR - CN - 0762'; ZAK.nazevAkce = 'B59 upravený klient';
    aktivniVarianta(ZAK).data.cenik = ceniky.ock; aktivniVarianta(ZAK).data.proj.cenik = ceniky.proj;
    syncVarianta(); render();
    await onlineUloz();
    zamekPoTisku('nabidkaTisk', aktivniVarianta(ZAK).id);
    aktivniVarianta(ZAK).zamek.vysledek.ock.souhrn.zakladSDph += 1000;   // upravený klient
    await onlineUloz();
    const po = { hlaska: ONLINE_STAV.hlaska, typ: ONLINE_STAV.hlaskaTyp, soubor: ONLINE_STAV.soubor };
    await onlineOtevri(po.soubor);
    po.lista = (document.getElementById('zamekLista') || {}).textContent || '';
    return po;
  }, ceniky);
  test('B59: upravený klient se uloží, ale hláška varuje, že čísla nesouhlasí',
    upraveny.typ === 'varovani' && /nesouhlasí/.test(upraveny.hlaska) && /0762/.test(upraveny.hlaska),
    JSON.stringify(upraveny));
  test('B59: po otevření ze serveru ukazuje rozpor lišta zámku',
    /nesouhlasí s výpočtem serveru/.test(upraveny.lista), upraveny.lista);
  await page.evaluate(() => { if (typeof zamekCteniVypni === 'function') zamekCteniVypni();
    ZAK = novaZakazka(); syncVarianta(); render(); });
}

/* ---- 10e) JEDNO ČÍSLO VARIANTY — ČÍSLO Z PAPÍRU (#320) ----
 * Zakázka uložená před #320: druhá varianta odešla zákazníkovi jako …0763.2
 * (dokumenty číslovaly podle pořadí), ale v zámku a v liště stála jako
 * …0763.1. Uloží se do databáze PŘÍMO (bez serverového importu, jako by
 * ležela z dřívějška) a otevře se ve skutečném klientu: lišta zámku i číslo
 * pro dokument musí ukázat číslo z papíru. */
{
  const zamekStary = { zamceno: true, kdy: '2026-09-18T08:00:00.000Z', typ: 'nabidka',
    popis: 'Cenová nabídka OCK (Word)', kdo: 'Harness', cislo: '2026 - OPR - CN - 0763.1', otisk: null,
    tisky: [{ kdy: '2026-09-18T08:00:00.000Z', typ: 'nabidka' }] };
  const stara = await page.evaluate((zamek) => {
    const z = novaZakazka(); z.cislo = '2026 - OPR - CN - 0763'; z.nazevAkce = '#320 stará zakázka';
    delete z.priponySchema;
    const v2 = JSON.parse(JSON.stringify(z.varianty[0]));
    v2.id = 'v320-2'; v2.nazev = 'Varianta 2'; v2.ridici = false; v2.pripona = 1; v2.zamek = zamek;
    z.varianty[0].pripona = 0; z.varianty.push(v2); z.aktivni = v2.id;
    return JSON.parse(JSON.stringify(z));
  }, zamekStary);
  pamet.set('zakazky/z/2026-OPR-CN-0763.json', JSON.stringify(stara));
  const po = await page.evaluate(async () => {
    /* Otevřená je čerstvá prázdná zakázka — dotaz na neuložené změny se
     * odpoví „zahodit" (skutečný modál by harness zastavil). */
    window.volba = () => Promise.resolve('zahodit');
    try { await onlineOtevri('2026-OPR-CN-0763.json'); } finally { delete window.volba; }
    const v = ZAK.varianty.find(x => x.id === 'v320-2');
    return { lista: (document.getElementById('zamekLista') || {}).textContent || '',
             dokument: cisloSVariantou(ZAK, v), cislo: variantaCislo(ZAK, v),
             zamekCislo: v.zamek && v.zamek.cislo, pripony: ZAK.varianty.map(x => x.pripona) };
  });
  test('#320: stará zakázka se v klientu přečísluje podle papíru (0, 2)',
    po.pripony.join(',') === '0,2', JSON.stringify(po));
  test('#320: dokument i číslo varianty nesou číslo z papíru (.2)',
    po.dokument === '2026 - OPR - CN - 0763.2' && po.cislo === po.dokument, JSON.stringify(po));
  test('#320: lišta zámku ukazuje číslo z papíru, ne starou příponu ze zámku',
    /0763\.2/.test(po.lista) && !/0763\.1/.test(po.lista), po.lista);
  test('#320: zámek sám zůstal, jak byl pořízen', po.zamekCislo === '2026 - OPR - CN - 0763.1', po.zamekCislo);
  await page.evaluate(() => { if (typeof zamekCteniVypni === 'function') zamekCteniVypni();
    ZAK = novaZakazka(); syncVarianta(); render(); });
}

/* ---- 11) čistá konzole ---- */
test('za celý průchod nevznikla nečekaná chyba v konzoli', chyby.length === 0, chyby);

await prohlizec.close();
server.close();
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
