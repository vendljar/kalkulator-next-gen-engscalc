/* SEC-M16 (3. 11. 2026) — úvodní fotka nabídky jen jako datový obrázek.
 *
 * Zpráva podklady/SEC_AUDIT_MAIN_28_10.md (SEC-M16): server přijal
 * `uvodniFoto = 'https://…'` a klient ho vykreslil jako <img src> — v souboru
 * otevřeném z disku (bez CSP) sledovací pixel. Logo a podpis už byly omezené
 * na `data:image`, fotka ne.
 *
 * Serverová sada (jádro: src/test_sec_m16_foto.js). Před opravou (198ed4c)
 * padá: fotka s odkazem se uloží i obnoví beze změny, varování chybí.
 *   1) uložení zakázky s fotkou http(s)://, javascript:, data:image/svg+xml
 *      → 200, fotka zahozena, varování v odpovědi;
 *   2) data:image/png, jpeg, webp → uloží se beze změny;
 *   3) ZAMČENÁ (odeslaná) varianta s fotkou z odkazu → 200, fotka zahozena,
 *      zámek a data varianty beze změny; stará uložená zakázka s odkazem se
 *      načte (importZakazka) a uloží znovu bez chyby zámku;
 *   4) obnova ze souboru zálohy s fotkou z odkazu → zakázka bez fotky
 *      a upozornění v bilanci.
 * Spuštění: node netlify/test_sec_m16.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
const R = new URL('..', import.meta.url).pathname;
const { default: prihlaseni } = await import(R + 'netlify/functions/prihlaseni.mjs');
const { default: program } = await import(R + 'netlify/functions/program.mjs');
const { default: zakazky } = await import(R + 'netlify/functions/zakazky.mjs');
const { default: uzivatele } = await import(R + 'netlify/functions/uzivatele.mjs');
const { default: zaloha } = await import(R + 'netlify/functions/zaloha.mjs');
const { default: obnova } = await import(R + 'netlify/functions/obnova.mjs');
const { ADMIN_EMAIL } = await import(R + 'netlify/lib/sdilene.mjs');
const { jadro } = await import(R + 'netlify/lib/jadro.mjs');
const { JEKLY } = await jadro();
const { createRequire } = await import('node:module');
const require = createRequire(R + 'netlify/x.mjs');
const zk = require(R + 'src/zakazka.js');
const zam = require(R + 'src/zamek.js');
const ZC = require(R + 'src/zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 500)); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const kopie = x => JSON.parse(JSON.stringify(x));
async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  const t = await r.clone().json(); if (!t.ok) throw new Error(e + ' ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const uloz = async (zak, c, razitko) => { const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: zak, ocekavaneRazitko: razitko || '' }, c); return { status: r.status, ...(await r.json()) }; };
const ulozeno = (soubor) => JSON.parse(pamet.get('zakazky/z/' + soubor));
const nacti = async (soubor, c) => (await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(soubor), c)).json()).zakazka;

const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
const rp = await (await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
  slevy: { minMarze: 0, maxGlobalni: 1, stropy: { 'Obchodník': 0.05, 'Administrátor': 1 } }, poznamka: 'secm16' }, cA)).json();
if (!rp.ok) throw new Error('program ' + JSON.stringify(rp));
{ const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'obch.secm16@priklad.cz',
    jmeno: 'Test Obchodník', role: 'Obchodník', heslo: 'Heslo12345x' }, cA)).json();
  if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x)); }
const cO = await prihlas('obch.secm16@priklad.cz', 'Heslo12345x');
const platny = () => JSON.parse(pamet.get('program/db')).platny;

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
const WEBP = 'data:image/webp;base64,UklGRhoAAABXRUJQ';
const SVG = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';
const HTTP = 'http://zlo.example/pixel.png';
const HTTPS = 'https://zlo.example/pixel.png';
const JS = 'javascript:alert(1)';

let n = 1601;
const novaZak = (nazev) => { const z = zk.novaZakazka(); z.cislo = '2026 - M16 - CN - ' + (n++); z.nazevAkce = 'TEST ' + nazev;
  Object.assign(z.varianty[0].data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  return z; };
const sFotkou = (z, ock, proj) => { z.uvodniFoto = ock; z.uvodniFotoNazev = 'fotka-ock.png'; z.uvodniFotoPopis = 'Popisek OCK';
  z.uvodniFotoProj = proj; z.uvodniFotoProjNazev = proj ? 'fotka-proj.png' : ''; z.uvodniFotoProjPopis = 'Popisek PROJ'; return z; };

console.log('===== 1) Uložení: fotka jinak než datovým obrázkem se zahodí =====');
for (const [nazev, hodnota] of [['http://', HTTP], ['https://', HTTPS], ['javascript:', JS], ['data:image/svg+xml', SVG],
  ['data:text/html', 'data:text/html;base64,PGI+'], ['data:image/png s mezerou za base64', PNG + ' "onerror=x']]) {
  const r = await uloz(sFotkou(novaZak('foto ' + nazev), hodnota, hodnota), cO);
  const g = r.status === 200 ? ulozeno(r.soubor) : {};
  test('fotka ' + nazev + ' → uložení 200, OCK i PROJ fotka zahozena', r.status === 200 && g.uvodniFoto === '' && g.uvodniFotoProj === '',
    [r.status, r.chyba, g.uvodniFoto, g.uvodniFotoProj]);
  test('…název zahozené fotky pryč, popisek zůstal', g.uvodniFotoNazev === '' && g.uvodniFotoPopis === 'Popisek OCK'
    && g.uvodniFotoProjPopis === 'Popisek PROJ', [g.uvodniFotoNazev, g.uvodniFotoPopis]);
  test('…odpověď varuje (OCK a PROJ)', /Úvodní fotka nabídky OCK a PROJ/.test(r.varovani || ''), r.varovani);
  test('…neviditelný seznam zahozených se neuložil', g.fotoZahozena === undefined, g.fotoZahozena);
}

console.log('\n===== 2) Uložení: PNG, JPEG, WEBP projdou =====');
for (const [nazev, hodnota] of [['png', PNG], ['jpeg', JPEG], ['webp', WEBP]]) {
  const r = await uloz(sFotkou(novaZak('foto ' + nazev), hodnota, hodnota), cO);
  const g = r.status === 200 ? ulozeno(r.soubor) : {};
  test('data:image/' + nazev + ' → 200 a fotka beze změny (OCK i PROJ)', r.status === 200 && g.uvodniFoto === hodnota
    && g.uvodniFotoProj === hodnota && g.uvodniFotoNazev === 'fotka-ock.png', [r.status, r.chyba]);
  test('…bez varování', !r.varovani, r.varovani);
}
{ const r = await uloz(sFotkou(novaZak('jen OCK s odkazem'), HTTP, PNG), cO);
  const g = ulozeno(r.soubor);
  test('OCK s odkazem, PROJ PNG → zahodí se jen OCK, varování jmenuje OCK', r.status === 200 && g.uvodniFoto === ''
    && g.uvodniFotoProj === PNG && /nabídky OCK nebyla/.test(r.varovani || ''), [r.status, g.uvodniFoto, r.varovani]); }

console.log('\n===== 3) Zamčená (odeslaná) varianta =====');
async function zamcena(nazev, foto) {
  const z = sFotkou(novaZak(nazev), foto, foto);
  const v = z.varianty[0];
  v.data.cenik = kopie(platny().cenik); v.data.proj.cenik = kopie(platny().cenikProj);
  zam.zamkniVariantu(v, { typ: 'nabidkaTisk', kdy: new Date().toISOString(), kdo: 'Test M16',
    cislo: zam.variantaCislo(z, v), vysledek: zam.zamekVysledekSpocti(v, JEKLY, 'v-secm16') });
  return z;
}
{
  const z = await zamcena('zamčená s odkazem', HTTPS);
  const r = await uloz(z, cO);
  const g = r.status === 200 ? ulozeno(r.soubor) : {};
  test('zamčená varianta + fotka https:// → 200 (bez chyby zámku)', r.status === 200, [r.status, r.chyba]);
  test('…fotka zahozena, zámek a data varianty uložené', g.uvodniFoto === '' && g.uvodniFotoProj === ''
    && g.varianty && g.varianty[0].zamek && g.varianty[0].zamek.zamceno, g.varianty && g.varianty[0].zamek);
  test('…fotka neleží v datech varianty (zámek ji nehlídá)', g.varianty && g.varianty[0].data.uvodniFoto === undefined);
  /* Další uložení téže zamčené zakázky z prohlížeče (načte → uloží). */
  const zpet = zk.importZakazka(kopie(await nacti(r.soubor, cO)));
  const r2 = await uloz(zpet, cO, zpet.uloRazitko);
  test('…znovu načtená a uložená → 200', r2.status === 200, [r2.status, r2.chyba]);
}
{
  /* STARÁ zakázka: v databázi leží zamčená varianta s fotkou z odkazu
   * (uloženo před SEC-M16). Prohlížeč ji načte (importZakazka fotku zahodí)
   * a uloží — zámek nesmí zaprotestovat. */
  const z = await zamcena('stará s odkazem', PNG);
  const r = await uloz(z, cO);
  test('příprava: zamčená zakázka s PNG uložena', r.status === 200 && ulozeno(r.soubor).uvodniFoto === PNG, [r.status, r.chyba]);
  const stara = ulozeno(r.soubor);
  stara.uvodniFoto = HTTP; stara.uvodniFotoProj = JS;              // jako by ležela z doby před opravou
  pamet.set('zakazky/z/' + r.soubor, JSON.stringify(stara));
  const nactena = await nacti(r.soubor, cO);
  const vProhlizeci = zk.importZakazka(kopie(nactena));
  test('stará zakázka: načtení v prohlížeči fotku s odkazem zahodí a hlásí OCK a PROJ',
    vProhlizeci.uvodniFoto === '' && vProhlizeci.uvodniFotoProj === ''
    && JSON.stringify(vProhlizeci.fotoZahozena) === '["OCK","PROJ"]', [vProhlizeci.uvodniFoto, vProhlizeci.fotoZahozena]);
  const r2 = await uloz(vProhlizeci, cO, nactena.uloRazitko);
  test('stará zamčená zakázka s odkazem → načíst a uložit 200 (bez chyby zámku)', r2.status === 200, [r2.status, r2.chyba]);
  const g2 = ulozeno(r.soubor);
  test('…uložená bez fotky, zámek drží', g2.uvodniFoto === '' && g2.uvodniFotoProj === '' && g2.varianty[0].zamek.zamceno);
  /* Bez načtení přes importZakazka (prohlížeč poslal surový stav). */
  const surova = ulozeno(r.soubor); surova.uvodniFoto = HTTPS;
  const r3 = await uloz(surova, cO, surova.uloRazitko);
  test('zamčená zakázka, surově poslaná fotka https:// → 200, fotka zahozena, varování',
    r3.status === 200 && ulozeno(r.soubor).uvodniFoto === '' && /Úvodní fotka/.test(r3.varovani || ''), [r3.status, r3.chyba, r3.varovani]);
}

console.log('\n===== 4) Obnova ze souboru zálohy =====');
{
  const r = await uloz(sFotkou(novaZak('obnova'), PNG, PNG), cO);
  const zal = (await (await get(zaloha, 'http://x/api/zaloha', cA)).json()).zaloha;
  const v = zal.zakazky[r.soubor];
  test('příprava: záloha nese zakázku s fotkou', !!v && v.uvodniFoto === PNG);
  v.uvodniFoto = HTTPS; v.uvodniFotoProj = SVG;                     // upravený soubor zálohy
  const jenTa = { ...zal, zakazky: { [r.soubor]: v } };
  pamet.delete('zakazky/z/' + r.soubor);
  const o = await (await post(obnova, 'http://x/api/obnova', { zdroj: { soubor: jenTa }, rezim: 'doplnit', potvrzeni: 'OBNOVIT',
    casti: ['zakazky'] }, cA)).json();
  test('obnova proběhla a zakázku zapsala', o.ok === true && o.casti && o.casti.zakazky && o.casti.zakazky.nove === 1, o.casti || o);
  const g = pamet.has('zakazky/z/' + r.soubor) ? ulozeno(r.soubor) : {};
  test('…obnovená zakázka nemá fotku z odkazu ani SVG', g.uvodniFoto === '' && g.uvodniFotoProj === '', [g.uvodniFoto, g.uvodniFotoProj]);
  test('…upozornění v bilanci obnovy', (o.upozorneni || []).some(x => /úvodní fotka nabídky OCK a PROJ/.test(x)), o.upozorneni);
}

console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
if (fail) process.exit(1);
