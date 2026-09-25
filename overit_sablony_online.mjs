/* Ověření v prohlížeči: CENTRÁLNÍ ŠABLONY DOKUMENTŮ (#139, 13. 8. 2026)
 *
 * Jednotkové testy hlídají rejstřík (src/test_sablony_online.js) a serverovou
 * funkci (netlify/test_funkce.mjs, test_prava.mjs). Tenhle harness hlídá to,
 * co z nich vidět není: SKUTEČNÝ klient proti SKUTEČNÉMU serverovému kódu —
 * že administrátor šablonu zveřejní z obrazovky Nastavení, že obchodníkovi
 * se z ní opravdu vygeneruje Word, že v PŘÍSNÉM režimu bez serverové šablony
 * žádný dokument nevznikne a že v MĚKKÉM režimu tisk z místního souboru
 * dostane razítko do zámku varianty.
 *
 * Stavba stejná jako overit_online.mjs: aplikace přes lokální http server,
 * /api/* se předává OPRAVDOVÝM funkcím z netlify/functions s pamětovým
 * úložištěm. Žádný mock chování.
 *
 * Spuštění: NODE_PATH=$(npm root -g) node overit_sablony_online.mjs
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
});

import { createRequire } from 'module';
import { najdiPodklad, preskoc } from './nastroje/harness_podklady.mjs';
import { createServer } from 'http';
import { readFileSync } from 'fs';
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
import zalohaVynuceno from './netlify/functions/zaloha_vynuceno.mjs';
import sablonyFn from './netlify/functions/sablony.mjs';
import { fileURLToPath } from 'node:url';
/* Cesta ke kořeni repozitáře se odvozuje od umístění harnessu (14. 9. 2026).
 * Dřív tu stála napevno cesta z cloudového stroje, na kterém harness vznikl. */
const KOREN = fileURLToPath(new URL('.', import.meta.url));

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
const { chromium } = require('playwright');
const { zipPrecti } = require(KOREN + 'src/docxgen.js');

const FUNKCE = {
  '/api/zdravi': zdravi, '/api/ja': ja, '/api/prihlaseni': prihlaseni,
  '/api/odhlaseni': odhlaseni, '/api/uzivatele': uzivatele,
  '/api/program': program, '/api/zakazky': zakazky, '/api/zaloha': zaloha,
  '/api/firma': firma, '/api/zobrazeni': zobrazeni,
  '/api/zaloha_vynuceno': zalohaVynuceno, '/api/sablony': sablonyFn,
};

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('  ✓ ' + n); }
  else { fail++; console.log('  ✗ ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const html = readFileSync('dist/kalkulacka.html');
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
  if (m.type() === 'error' && !/status of (400|401|403|404|409)/.test(t)) chyby.push('console: ' + t);
});
page.on('pageerror', e => chyby.push('pageerror: ' + e.message));
page.on('dialog', d => (d.type() === 'prompt' ? d.accept('zkušební zveřejnění') : d.accept()));

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

await page.goto(ADRESA);
await page.waitForFunction(() => typeof window.render === 'function');
await page.waitForTimeout(300);

await dlgStub(page);
await page.fill('#onlineEmail', 'spravce@priklad.cz');
await page.fill('#onlineHeslo', 'Zkusebni.Heslo.123');
await page.click('#prihlaseni-box >> text=Přihlásit');
await page.waitForFunction(() => { try { return !!ONLINE_STAV.ja; } catch (e) { return false; } });
await page.waitForTimeout(400);

/* Zkušební ceník, ať má nabídka co počítat (zábrana ukázkového ceníku). */
const ZC = require(KOREN + 'src/zkusebni_cenik.js');
await page.evaluate(([c, cp]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  ZAK = novaZakazka(); syncVarianta();
  Object.assign(ZAK.projHlavicka, { cislo: '2026 OVP CN 0177', objednatel: 'SVJ Harness 1',
    kontakt: 'Ing. Test', adresa: 'Zkušební 1, Praha', nazevAkce: 'Harness šablon' });
  render();
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);
await page.waitForTimeout(200);

/* ---------- 1) výchozí stav: přísný režim, žádná šablona ---------- */
console.log('\npřísný režim bez zveřejněné šablony');
test('po přihlášení se načetl rejstřík šablon',
  await page.evaluate(() => ONLINE_STAV.sablonyRejstrik !== null && ONLINE_STAV.sablonyRejstrik !== undefined));
test('výchozí režim je přísný', await page.evaluate(() => onlineSablonyRezim() === 'prisny'));

const odmitnuti = await page.evaluate(() =>
  sablonaProTisk('nabidkaProj', 'cz').then(() => 'prošlo', e => e.message));
test('tisk Wordu se v přísném režimu bez serverové šablony odmítne',
  odmitnuti !== 'prošlo' && /přísném režimu/i.test(odmitnuti), odmitnuti);
test('odmítnutí říká, kdo to napraví (administrátor)',
  /administrátor/i.test(odmitnuti), odmitnuti);

/* ---------- 2) administrátor zveřejní šablonu ---------- */
console.log('\nzveřejnění šablony administrátorem');
/* ŠABLONA SE ČETLA BEZ KONTROLY (N15, 22. 9. 2026) — mimo původní prostředí
 * to byl pád na ENOENT uprostřed běhu, tedy až po přihlášení a polovině
 * kontrol. Nově se přeskočí hned a s vysvětlením. */
const sablonaCesta = najdiPodklad('Sablona_NABIDKA_PROJ.docx',
  ['/home/claude/work/sablona_proj/Sablona_NABIDKA_PROJ.docx',
   '/home/claude/work/deliver/Sablona_NABIDKA_PROJ.docx']);
/* Kontroly přísného režimu výš šablonu nepotřebují a běží vždy — jejich
 * selhání přeskočení nesmí zamést (nález T2 revize v22.9.9). */
if (!sablonaCesta) preskoc('šablona Sablona_NABIDKA_PROJ.docx',
  ['/home/claude/work/sablona_proj/', '$KNG_PODKLADY'], { ok, fail });
const sablonaB64 = readFileSync(sablonaCesta).toString('base64');
const zverejneni = await page.evaluate(async (b64) => {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  SABLONY.nabidkaProj = { nazev: 'Sablona_NABIDKA_PROJ.docx', data: u8.buffer };
  const o = await onlineSablonaZverejni('nabidkaProj', 'Sablona_NABIDKA_PROJ.docx', u8.buffer, 'harness');
  return { verze: o.verze, meta: onlineSablonaMeta('nabidkaProj') };
}, sablonaB64);
test('zveřejnění vrátilo verzi 1', zverejneni.verze === 1, zverejneni);
test('rejstřík v aplikaci hned zná platnou verzi',
  zverejneni.meta && zverejneni.meta.verze === 1 && zverejneni.meta.zverejnil === 'spravce@priklad.cz');
test('obrazovka Nastavení → Šablony verzi ukazuje (tabulka dokument × jazyk, #349)',
  await page.evaluate(() => /data-sabl-typ="nabidkaProj"[\s\S]*?✓ v1/.test(nastSablony())));
test('obrazovka nabízí přepínač režimu',
  await page.evaluate(() => /PŘÍSNÝ|MĚKKÝ/.test(nastSablony())));

/* ---------- 3) obchodní cesta: Word ze serverové šablony ---------- */
console.log('\ngenerování Wordu ze serverové šablony');
const vysledek = await page.evaluate(async () => {
  delete SABLONY.nabidkaProj;                      // místní kopie pryč — čerpat se MUSÍ ze serveru
  const srv = await sablonaProTisk('nabidkaProj', 'cz');
  const varianta = aktivniVarianta(ZAK);
  const res = await dokumentVygeneruj('nabidkaProj', srv.data.slice(0), ZAK, varianta, JEKLY, 'cz');
  const bajty = new Uint8Array(await res.blob.arrayBuffer());
  let s = ''; for (let i = 0; i < bajty.length; i++) s += String.fromCharCode(bajty[i]);
  const z = zamekPoTisku('nabidkaProj', varianta.id,
    { zdroj: 'server', typ: srv.typ, verze: srv.verze, otisk: srv.otisk, nazev: srv.nazev });
  return { zdroj: srv.zdroj, verze: srv.verze, nazev: srv.nazev, docx: btoa(s),
           zamek: z && z.tisky[z.tisky.length - 1].sablona };
});
test('šablona přišla ze serveru', vysledek.zdroj === 'server' && vysledek.verze === 1);
test('jméno souboru šablony se neslo s ní', vysledek.nazev === 'Sablona_NABIDKA_PROJ.docx');
const casti = await zipPrecti(new Uint8Array(Buffer.from(vysledek.docx, 'base64')));
const doc = new TextDecoder().decode(casti.find(x => x.nazev === 'word/document.xml').data);
test('dokument je vyplněný (hlavička PROJ)', doc.includes('SVJ Harness 1'));
test('v dokumentu nezůstal žádný symbol {{…}}', !/\{\{[A-Z0-9_]+\}\}/.test(doc));
test('zámek varianty nese razítko serverové šablony (verze i otisk)',
  vysledek.zamek && vysledek.zamek.zdroj === 'server' && vysledek.zamek.verze === 1
  && !!vysledek.zamek.otisk, vysledek.zamek);

/* ---------- 4) měkký režim: místní soubor s razítkem ---------- */
console.log('\nměkký režim');
await page.evaluate(() => onlineSablonyRezimNastav('mekky'));
await page.waitForTimeout(200);
test('režim se přepnul', await page.evaluate(() => onlineSablonyRezim() === 'mekky'));
const mekky = await page.evaluate(async () => {
  /* Server šablonu MÁ — i v měkkém režimu má přednost. Vyzkouší se proto typ,
   * který na serveru není (nabidka OCK): v přísném by spadl, v měkkém vrátí
   * null = „pokračuj místní cestou". */
  const bezServeru = await sablonaProTisk('nabidka', 'cz');
  const seServerem = await sablonaProTisk('nabidkaProj', 'cz');
  return { bezServeru, seServeremZdroj: seServerem && seServerem.zdroj };
});
test('typ bez serverové šablony se v měkkém režimu pustí místní cestou',
  mekky.bezServeru === null);
test('typ SE serverovou šablonou ji používá i v měkkém režimu',
  mekky.seServeremZdroj === 'server');
/* a zpátky přísný — měkký je výjimka, ne stav */
await page.evaluate(() => onlineSablonyRezimNastav('prisny'));
test('návrat do přísného režimu', await page.evaluate(() => onlineSablonyRezim() === 'prisny'));
const znovuOdmitnuti = await page.evaluate(() =>
  sablonaProTisk('nabidka', 'cz').then(() => 'prošlo', e => e.message));
test('po návratu se typ bez šablony zase odmítá', /přísném režimu/.test(znovuOdmitnuti));

/* ---------- 5) záloha nese šablony ---------- */
console.log('\nzáloha');
const zal = await page.evaluate(() => onlineApi('/api/zaloha').then(o => ({
  maSablony: !!(o.zaloha.sablony && o.zaloha.sablony.rejstrik),
  verze: o.zaloha.sablony && o.zaloha.sablony.rejstrik.typy.nabidkaProj.platna.verze,
  souborOk: !!(o.zaloha.sablony && o.zaloha.sablony['data/nabidkaProj/1']
    && o.zaloha.sablony['data/nabidkaProj/1'].data.indexOf('UEsDB') === 0),
})));
test('záloha ke stažení nese rejstřík šablon', zal.maSablony && zal.verze === 1);
test('záloha nese i samotný soubor šablony', zal.souborOk);

/* ---------- 6) zastaralá jazyková mutace (#334, K10-N36, 24. 9. 2026) ----------
 * V ostré byla zveřejněná EN/DE mutace z v8, česká šablona v10 — anglická
 * nabídka vyšla z 17 % česky a aplikace to nepoznala. Mutace zveřejněná
 * DŘÍV než platná česká šablona je zastaralá: v přísném režimu se z ní
 * netiskne a Nastavení → Šablony to ukáže. */
console.log('\nzastaralá jazyková mutace');
/* Server odmítne zveřejnit soubor se stejným otiskem jako platná verze,
 * proto každé zveřejnění dostane na konec jiný bajt (za koncem zipu —
 * čtení archivu to neruší). */
let poradi = 0;
const zverejni = (typ, nazev) => page.evaluate(async ([b64, typ, nazev, n]) => {
  const bin = atob(b64); const u8 = new Uint8Array(bin.length + 1);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  u8[bin.length] = n;
  await new Promise(r => setTimeout(r, 30));          // ať mají zveřejnění různý čas
  const o = await onlineSablonaZverejni(typ, nazev, u8.buffer, 'harness');
  return o.verze;
}, [sablonaB64, typ, nazev, ++poradi]);
const tiskEn = () => page.evaluate(() =>
  sablonaProTisk('nabidkaProj', 'en').then(s => 'prošlo:' + s.typ, e => e.message));
await zverejni('nabidkaProj_en', 'Sablona_NABIDKA_PROJ_EN.docx');
test('aktuální EN mutace se použije', /^prošlo:nabidkaProj_en$/.test(await tiskEn()), await tiskEn());
await zverejni('nabidkaProj', 'Sablona_NABIDKA_PROJ.docx');      // novější česká → EN je teď zastaralá
const zastaralaHlaska = await tiskEn();
test('mutace starší než česká šablona se v přísném režimu odmítne', !/^prošlo/.test(zastaralaHlaska), zastaralaHlaska);
test('hláška říká proč a kdo to napraví',
  /starší než platná česká šablona/.test(zastaralaHlaska) && /Administrátor/.test(zastaralaHlaska), zastaralaHlaska);
test('Nastavení → Šablony mutaci označí jako zastaralou',
  await page.evaluate(() => /sablona-zastarala/.test(nastSablony())));
test('česká nabídka se tím nezastaví',
  /^prošlo/.test(await page.evaluate(() => sablonaProTisk('nabidkaProj', 'cz').then(() => 'prošlo', e => e.message))));
await zverejni('nabidkaProj_en', 'Sablona_NABIDKA_PROJ_EN.docx'); // přegenerovaná a znovu zveřejněná
test('po novém zveřejnění mutace tisk zase projde', /^prošlo:nabidkaProj_en$/.test(await tiskEn()), await tiskEn());
test('a štítek „zastaralá" zmizí', await page.evaluate(() => !/sablona-zastarala/.test(nastSablony())));

/* ---------- 7) správa šablon: průvodce, jazyk souboru, zdroj mutace (#348, #349) ----------
 * 24. 9. 2026 se jako ČESKÁ šablona nabídky OCK zveřejnil soubor …_v11_DE.docx
 * a EN/DE mutace pak hlásily „zastaralá" natrvalo (stejný soubor server
 * podruhé nezveřejní). Tahle část prochází novou obrazovku tak, jak ji
 * používá administrátor: průvodce nahráním, kontrola jazyka, zveřejnění
 * najednou, přegenerování, doladěný soubor k jazyku a vrácení verze. */
console.log('\nspráva šablon (průvodce, jazyk, zdroj mutace)');
const cnCesta = najdiPodklad('Sablona_NABIDKA_CN_v11.docx', ['/home/claude/work/sablona/Sablona_NABIDKA_CN_v11.docx']);
if (!cnCesta) console.log('  – přeskočeno: chybí Sablona_NABIDKA_CN_v11.docx (KNG_PODKLADY)');
else {
  const cnB64 = readFileSync(cnCesta).toString('base64');
  await page.evaluate(async (b64) => {
    const bin = atob(b64); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    window.__CZ = { nazev: 'Sablona_NABIDKA_CN_v11.docx', data: u8.buffer };
    const blob = await docxPrelozSablonu(u8.buffer.slice(0), 'de', {});
    window.__DE = { nazev: 'Sablona_NABIDKA_CN_v11_DE.docx', data: await blob.arrayBuffer() };
    window.nastRefresh = () => {};                 // obrazovka se čte přes nastSablony()
  }, cnB64);

  /* a) německý soubor místo české šablony */
  const a = await page.evaluate(async () => {
    await sablPruvodceStart('nabidka', window.__DE);
    const k = SABL_UI.pruvodce.kontrola, html = nastSablony();
    return { jiny: k.jinyJazyk, podil: k.jaz.podil, hlaska: /Soubor je německy, ne česky/.test(html),
             pokracovatZakazano: /<button class="primary" disabled onclick="sablPruvodceDal\(\)">/.test(html),
             nabidka: /Uložit jako DE verzi/.test(html) };
  });
  test('průvodce pozná, že soubor pro češtinu je německy', a.jiny === 'de' && a.podil > 0.5, a);
  test('řekne to nahlas a nabídne uložit ho jako DE verzi', a.hlaska && a.nabidka, a);
  test('dál pustit nejde (Pokračovat zakázáno)', a.pokracovatZakazano, a);
  await page.evaluate(() => sablPruvodceZrus());
  test('zrušením se nic nezveřejnilo', await page.evaluate(() => !onlineSablonaMeta('nabidka')));

  /* b) česká šablona + EN a DE najednou */
  const b = await page.evaluate(async () => {
    await sablPruvodceStart('nabidka', window.__CZ);
    const k = SABL_UI.pruvodce.kontrola;
    await sablPruvodceDal();
    const p = SABL_UI.pruvodce;
    p.vybrane.en = true; p.vybrane.de = true;
    const pokryti = { en: p.mutace.en.stat.procenta, de: p.mutace.de.stat.procenta };
    await sablPruvodceZverejni();
    const rej = ONLINE_STAV.sablonyRejstrik;
    return { kontrolaOk: !k.chyby.length && !k.jinyJazyk, jazyk: k.jaz.jazyk, pokryti,
             cz: sablonaPlatna(rej, 'nabidka'), en: sablonaPlatna(rej, 'nabidka_en'),
             stavEn: sablonaMutaceStav(rej, 'nabidka', 'en').stav, stavDe: sablonaMutaceStav(rej, 'nabidka', 'de').stav,
             pruvodceZavren: !SABL_UI.pruvodce };
  });
  test('česká šablona projde kontrolou', b.kontrolaOk && b.jazyk === 'cz', b);
  test('jazykové verze se vyrobily samy (EN i DE přes 80 %)', b.pokryti.en > 80 && b.pokryti.de > 80, b.pokryti);
  test('čeština, EN i DE jsou zveřejněné najednou', b.cz && b.cz.verze === 1 && b.en && b.pruvodceZavren, b);
  test('EN nese otisk české verze, ze které vznikla', b.en && b.en.zdrojOtisk === b.cz.otisk, b.en);
  test('EN i DE jsou aktuální', b.stavEn === 'aktualni' && b.stavDe === 'aktualni', b);

  /* c) nová čeština → mutace zastaralé podle obsahu → přegenerování projde,
   * i když vyjde stejný soubor jako minule (dřív „už je zveřejněná") */
  const c = await page.evaluate(async () => {
    const u8 = new Uint8Array(window.__CZ.data.byteLength + 1); u8.set(new Uint8Array(window.__CZ.data)); u8[u8.length - 1] = 7;
    await sablPruvodceStart('nabidka', { nazev: 'Sablona_NABIDKA_CN_v12.docx', data: u8.buffer });
    await sablPruvodceDal();
    SABL_UI.pruvodce.vybrane = {};                 // jazyky tentokrát nezveřejnit
    await sablPruvodceZverejni();
    const rej1 = ONLINE_STAV.sablonyRejstrik;
    const po = { stavEn: sablonaMutaceStav(rej1, 'nabidka', 'en').stav, stitek: /sablona-zastarala/.test(nastSablony()),
                 tisk: await sablonaProTisk('nabidka', 'en').then(() => 'prošlo', e => e.message) };
    await sablPregeneruj('nabidka', 'en');
    const rej2 = ONLINE_STAV.sablonyRejstrik;
    return Object.assign(po, { stavEnPo: sablonaMutaceStav(rej2, 'nabidka', 'en').stav,
      enVerze: sablonaPlatna(rej2, 'nabidka_en').verze, zVerze: sablonaMutaceStav(rej2, 'nabidka', 'en').zVerze,
      tiskPo: await sablonaProTisk('nabidka', 'en').then(s => 'prošlo:' + s.typ, e => e.message) });
  });
  test('po nové češtině jsou EN a DE zastaralé podle obsahu', c.stavEn === 'zastarala' && c.stitek, c);
  test('v přísném režimu se ze zastaralé EN netiskne', !/^prošlo/.test(c.tisk), c.tisk);
  test('přegenerování EN projde, i když je soubor stejný jako minule', c.stavEnPo === 'aktualni' && c.enVerze === 2 && c.zVerze === 2, c);
  test('a z EN se zase tiskne', c.tiskPo === 'prošlo:nabidka_en', c.tiskPo);

  /* d) doladěný soubor přímo k jazyku: německý soubor „Uložit jako DE" */
  const d = await page.evaluate(async () => {
    await sablPruvodceStart('nabidka', window.__DE);
    await sablPruvodceJakoJazyk();
    const rej = ONLINE_STAV.sablonyRejstrik;
    return { cz: sablonaPlatna(rej, 'nabidka').verze, de: sablonaPlatna(rej, 'nabidka_de'),
             stav: sablonaMutaceStav(rej, 'nabidka', 'de').stav, czOtisk: sablonaPlatna(rej, 'nabidka').otisk };
  });
  test('německý soubor šel k němčině, čeština zůstala', d.cz === 2 && d.de && d.de.verze === 2, d);
  test('a DE je aktuální k platné češtině', d.stav === 'aktualni' && d.de.zdrojOtisk === d.czOtisk, d);
  const d2 = await page.evaluate(async () => {
    window.__dlgTexty = [];
    await sablNahrajJazyk('nabidka', 'en', window.__CZ);        // český soubor jako angličtina
    return { texty: window.__dlgTexty.slice(), en: sablonaPlatna(ONLINE_STAV.sablonyRejstrik, 'nabidka_en').verze };
  });
  test('český soubor jako EN verze se odmítne', d2.en === 2 && d2.texty.some(t => /je česky/.test(t)), d2);

  /* d3) vlastní jazyková verze přímo v průvodci (25. 9. 2026, zadání J. V.:
   * „při nahrávání šablon přidej možnost nahrát vlastní verzi jazykové mutace") */
  const d3 = await page.evaluate(async () => {
    const u8 = new Uint8Array(window.__CZ.data.byteLength + 2); u8.set(new Uint8Array(window.__CZ.data)); u8[u8.length - 1] = 9;
    await sablPruvodceStart('nabidka', { nazev: 'Sablona_NABIDKA_CN_v13.docx', data: u8.buffer });
    await sablPruvodceDal();
    const p = SABL_UI.pruvodce;
    const html0 = nastSablony();
    await sablPruvodceVlastni('en', window.__DE);                 // německý soubor jako angličtina
    const chybaEn = (p.vlastniChyba || {}).en || '';
    const enZustal = !p.mutace.en.vlastni;
    await sablPruvodceVlastni('de', window.__DE);
    const de = p.mutace.de;
    const html1 = nastSablony();
    p.vybrane = { de: true };
    await sablPruvodceZverejni();
    const rej = ONLINE_STAV.sablonyRejstrik;
    const deMeta = sablonaPlatna(rej, 'nabidka_de');
    return { tlacitko: /Nahrát vlastní verzi/.test(html0), chybaEn, enZustal,
             deVlastni: !!de.vlastni, deStroj: !!de.stroj, vybranoDe: true,
             html1: /Vlastní soubor: <b>Sablona_NABIDKA_CN_v11_DE.docx<\/b>/.test(html1) && /Vrátit překlad aplikace/.test(html1),
             deStav: sablonaMutaceStav(rej, 'nabidka', 'de').stav, deVerze: deMeta && deMeta.verze,
             popis: JSON.stringify(deMeta) };
  });
  test('průvodce nabízí u jazyka „Nahrát vlastní verzi"', d3.tlacitko, d3);
  test('vlastní soubor ve špatném jazyce se odmítne a překlad aplikace zůstane',
    /je německy/.test(d3.chybaEn) && d3.enZustal, d3);
  test('vlastní DE soubor nahradí překlad aplikace (a ten jde vrátit)', d3.deVlastni && d3.deStroj && d3.html1, d3);
  test('zveřejní se spolu s češtinou a je aktuální', d3.deStav === 'aktualni' && d3.deVerze === 3, d3);
  test('v záznamu stojí, že je to vlastní soubor', /vlastní soubor k české verzi/.test(d3.popis), d3.popis);

  /* e) server: mutace s otiskem jiné než platné češtiny → 409 */
  const e = await page.evaluate(async () => {
    const cz = sablonaPlatna(ONLINE_STAV.sablonyRejstrik, 'nabidka');
    const stara = sablonaVerze(ONLINE_STAV.sablonyRejstrik, 'nabidka').find(v => v.verze === 1);
    return onlineSablonaZverejni('nabidka_fr', 'x.docx', window.__DE.data, 'harness', stara.otisk)
      .then(() => 'prošlo', err => err.stav + ' ' + err.message).then(v => ({ v, cz: cz.verze }));
  });
  test('server odmítne mutaci k neplatné češtině (409)', /^409 /.test(e.v), e);

  /* f) vrácení starší verze */
  const f = await page.evaluate(async () => {
    await sablVrat('nabidka', 1);
    const rej = ONLINE_STAV.sablonyRejstrik, cz = sablonaPlatna(rej, 'nabidka');
    return { verze: cz.verze, vracenoZ: cz.vracenoZ, otiskShoda: cz.otisk === sablonaVerze(rej, 'nabidka').find(v => v.verze === 1).otisk,
             stavEn: sablonaMutaceStav(rej, 'nabidka', 'en').stav, historie: sablonaVerze(rej, 'nabidka').length };
  });
  /* v3 je od 25. 9. 2026 čeština z kroku d3 (vlastní jazyková verze), takže
   * vrácení je v4. */
  test('vrácení zveřejní v1 znovu jako v4 a nic nesmaže', f.verze === 4 && f.vracenoZ === 1 && f.otiskShoda && f.historie === 4, f);
  test('EN vyrobená z v2 je po vrácení zastaralá', f.stavEn === 'zastarala', f);
}

test('konzole zůstala čistá', chyby.length === 0, chyby.slice(0, 3));

await prohlizec.close();
server.close();
console.log('\n' + (fail ? fail + ' KONTROL SELHALO (z ' + (ok + fail) + ')'
  : 'VŠECHNY KONTROLY (' + ok + ') OK'));
process.exit(fail ? 1 : 0);
