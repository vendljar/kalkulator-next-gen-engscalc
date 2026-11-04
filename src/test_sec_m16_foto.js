/* SEC-M16 (3. 11. 2026) — úvodní fotka nabídky jen jako datový obrázek.
 * Jádro a klient (server: netlify/test_sec_m16.mjs).
 *
 * Před opravou (198ed4c) padá: importZakazka fotku s odkazem nechá,
 * klient ji vykreslí do <img src>, Word ji dostane pod {{UVODNI_FOTO}}
 * a funkce uvodniFotoPlatna / obrazekDataUrlPlatny neexistují.
 *   1) společná kontrola tvaru (fotka PNG/JPEG/WEBP; logo PNG/JPEG jako podpis);
 *   2) import ze souboru (StorageAdapter.importuj) zahodí odkaz, SVG, javascript:
 *      a vrátí seznam zahozených; PNG projde; seznam se do souboru nezapíše;
 *   3) zamčená varianta: import fotku zahodí, zámek a data varianty beze změny;
 *   4) Word: uvodniFotoObrazky bez obrázku s odkazem;
 *   5) klient (ui/zakazka_ui.js): náhled v kartě i tisk HTML fotku s odkazem
 *      nevykreslí, PNG ano; nahrání GIF/SVG odmítne;
 *   6) logo firmy (firma.js) a podpis (sdilene.mjs) mají totéž pravidlo.
 * Spuštění: node src/test_sec_m16_foto.js */
const fs = require('fs');
const vm = require('vm');
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
nacti('./engine.js'); nacti('./engine_proj.js'); nacti('./techspec.js');
const zk = nacti('./zakazka.js');
const zam = nacti('./zamek.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 300)); } };
const kopie = (x) => JSON.parse(JSON.stringify(x));

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
const WEBP = 'data:image/webp;base64,UklGRhoAAABXRUJQ';
const GIF = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
const SVG = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';
const HTTP = 'http://zlo.example/pixel.png';
const HTTPS = 'https://zlo.example/pixel.png';
const JS = 'javascript:alert(1)';
const SPATNE = [['http://', HTTP], ['https://', HTTPS], ['javascript:', JS], ['data:image/svg+xml', SVG],
  ['data:image/gif', GIF], ['data:text/html', 'data:text/html;base64,PGI+'], ['PNG s připojeným atributem', PNG + '" onerror="x'],
  ['//cizi.example/a.png', '//cizi.example/a.png'], ['objekt', { toString: () => PNG }]];

/* ---------- 1) společná kontrola ---------- */
console.log('--- 1) obrazekDataUrlPlatny / uvodniFotoPlatna ---');
const platnaF = typeof zk.uvodniFotoPlatna === 'function' ? zk.uvodniFotoPlatna : () => true;   // před opravou chybí → FAIL, ne pád
const obrF = typeof zk.obrazekDataUrlPlatny === 'function' ? zk.obrazekDataUrlPlatny : () => true;
test('společné funkce existují a jsou exportované', typeof zk.uvodniFotoPlatna === 'function'
  && typeof zk.obrazekDataUrlPlatny === 'function' && typeof zk.uvodniFotoOcisti === 'function');
for (const [n, h] of [['png', PNG], ['jpeg', JPEG], ['webp', WEBP]]) test('fotka data:image/' + n + ' projde', platnaF(h) === true);
for (const [n, h] of SPATNE) test('fotka ' + n + ' neprojde', platnaF(h) === false);
test('prázdná fotka není „platný obrázek" (vykreslí se nic)', platnaF('') === false && platnaF(null) === false);
test('výchozí typy (logo, podpis) = PNG a JPEG, WEBP ne', obrF(PNG) && obrF(JPEG) && !obrF(WEBP) && !obrF(SVG) && !obrF(HTTP));

/* ---------- 2) import ze souboru ---------- */
console.log('\n--- 2) import ze souboru (StorageAdapter.importuj) ---');
const zakS = (ock, proj) => { const z = zk.novaZakazka(); z.cislo = '2026 - M16 - CN - 0001';
  z.uvodniFoto = ock; z.uvodniFotoNazev = 'a.png'; z.uvodniFotoPopis = 'Popisek OCK';
  z.uvodniFotoProj = proj; z.uvodniFotoProjNazev = 'b.png'; z.uvodniFotoProjPopis = 'Popisek PROJ'; return z; };
for (const [n, h] of SPATNE.filter(x => typeof x[1] === 'string')) {
  const z = zk.StorageAdapter.importuj(JSON.stringify(zakS(h, h)));
  test('soubor s fotkou ' + n + ' → OCK i PROJ fotka zahozena', z.uvodniFoto === '' && z.uvodniFotoProj === '', [z.uvodniFoto, z.uvodniFotoProj]);
  test('…hlášeno ["OCK","PROJ"], název pryč, popisek zůstal', JSON.stringify(z.fotoZahozena) === '["OCK","PROJ"]'
    && z.uvodniFotoNazev === '' && z.uvodniFotoPopis === 'Popisek OCK', [z.fotoZahozena, z.uvodniFotoNazev]);
}
{
  const z = zk.StorageAdapter.importuj(JSON.stringify(zakS(PNG, WEBP)));
  test('soubor s PNG a WEBP → fotky beze změny, nic hlášeno', z.uvodniFoto === PNG && z.uvodniFotoProj === WEBP
    && z.uvodniFotoNazev === 'a.png' && z.fotoZahozena === undefined);
  const z2 = zk.StorageAdapter.importuj(JSON.stringify(zakS(HTTP, JPEG)));
  test('jen OCK s odkazem → zahozena jen OCK', z2.uvodniFoto === '' && z2.uvodniFotoProj === JPEG
    && JSON.stringify(z2.fotoZahozena) === '["OCK"]', z2.fotoZahozena);
  test('seznam zahozených se do souboru nezapíše (nevýčtový)', !/fotoZahozena/.test(zk.StorageAdapter.exportuj(z2)));
  const v = typeof zk.uvodniFotoVarovani === 'function' ? zk.uvodniFotoVarovani(z2.fotoZahozena) : '';
  test('varování pro uživatele jmenuje nabídku a radí nahrát znovu', /nabídky OCK/.test(v) && /Nahrajte ji znovu/.test(v), v);
  test('bez zahozené fotky žádné varování', typeof zk.uvodniFotoVarovani === 'function' && zk.uvodniFotoVarovani(undefined) === '');
}

/* ---------- 3) zamčená varianta ---------- */
console.log('\n--- 3) zamčená varianta ---');
{
  const z = zakS(HTTPS, JS);
  const v = z.varianty[0];
  zam.zamkniVariantu(v, { typ: 'nabidkaTisk', kdy: '2026-11-03T10:00:00.000Z', kdo: 'Test M16', cislo: zam.variantaCislo(z, v) });
  const dataPred = JSON.stringify(v.data), zamekPred = JSON.stringify(v.zamek);
  const i = zk.importZakazka(kopie(z));
  test('zamčená zakázka s odkazem: import fotku zahodí', i.uvodniFoto === '' && i.uvodniFotoProj === '');
  test('…zámek a data zamčené varianty beze změny', JSON.stringify(i.varianty[0].zamek) === zamekPred
    && JSON.stringify(i.varianty[0].data) === JSON.stringify(zk.importZakazka(kopie(Object.assign(z, { uvodniFoto: '', uvodniFotoProj: '' }))).varianty[0].data)
    && i.varianty[0].data.uvodniFoto === undefined, [dataPred.length]);
}

/* ---------- 4) Word ---------- */
console.log('\n--- 4) Word (uvodniFotoObrazky) ---');
test('Word: fotka s odkazem se pod {{UVODNI_FOTO}} nedosadí', Object.keys(zk.uvodniFotoObrazky({ uvodniFoto: HTTP })).length === 0
  && Object.keys(zk.uvodniFotoObrazky({ uvodniFotoProj: SVG }, 'proj')).length === 0);
test('Word: PNG se dosadí', zk.uvodniFotoObrazky({ uvodniFoto: PNG }).UVODNI_FOTO === PNG);

/* ---------- 5) klient: vykreslení ---------- */
console.log('\n--- 5) klient (ui/zakazka_ui.js) ---');
const ui = fs.readFileSync(__dirname + '/ui/zakazka_ui.js', 'utf8').replace(/\r\n/g, '\n');
const vytahniFn = (jm) => {
  const i = ui.indexOf('function ' + jm + '(');
  if (i < 0) return '';
  const j = ui.indexOf('\n}\n', i);
  return ui.slice(ui.lastIndexOf('\n', i) + 1, j + 3).replace(/^async /, 'async ');
};
const kod = ['nabidkaFotoPole', 'nabidkaFotoPlatna', 'nabidkaFotoSrc', 'nabidkaFotoHtml', 'nabidkaFotoKarta', 'nabidkaFotoPrijmi']
  .map(vytahniFn).join('\n') + '\nconst NABIDKA_FOTO_NAZVY = { ock: "OCK", proj: "PROJ" };';
const hlasky = [];
const ctx = { ZAK: null, esc: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  uvodniFotoPole: zk.uvodniFotoPole, uvodniFotoPlatna: zk.uvodniFotoPlatna,
  hlaska: (t) => hlasky.push(t), render: () => {}, FileReader: null };
vm.createContext(ctx);
vm.runInContext(kod, ctx);
const imgSrc = (html) => (String(html).match(/<img[^>]*src="([^"]*)"/g) || []).join(' ');
for (const [n, h] of [['http://', HTTP], ['https://', HTTPS], ['javascript:', JS], ['data:image/svg+xml', SVG]]) {
  ctx.ZAK = { uvodniFoto: h, uvodniFotoProj: h, uvodniFotoPopis: 'P', uvodniFotoNazev: 'x' };
  const tisk = vm.runInContext('nabidkaFotoHtml("ock") + nabidkaFotoHtml("proj")', ctx);
  const karta = vm.runInContext('nabidkaFotoKarta("ock") + nabidkaFotoKarta("proj")', ctx);
  test('klient: fotku ' + n + ' tisk nevykreslí', tisk === '', tisk);
  test('klient: fotku ' + n + ' náhled v kartě nevykreslí (žádné <img>)', imgSrc(karta) === '', imgSrc(karta));
}
ctx.ZAK = { uvodniFoto: PNG, uvodniFotoProj: WEBP, uvodniFotoPopis: 'P' };
{
  const tisk = vm.runInContext('nabidkaFotoHtml("ock")', ctx), karta = vm.runInContext('nabidkaFotoKarta("proj")', ctx);
  test('klient: PNG se v tisku vykreslí', imgSrc(tisk).includes(PNG), tisk);
  test('klient: WEBP se v náhledu karty vykreslí', imgSrc(karta).includes(WEBP), imgSrc(karta));
}
/* Nahrání souborem / Ctrl+V: FileReader vrátí data URL; GIF ani SVG se neuloží. */
for (const [n, vysl, maProjit] of [['png', PNG, true], ['jpeg', JPEG, true], ['webp', WEBP, true], ['svg', SVG, false], ['gif', GIF, false]]) {
  ctx.ZAK = { uvodniFoto: '', uvodniFotoNazev: '' };
  ctx.FileReader = function () { this.readAsDataURL = () => { this.result = vysl; this.onload(); }; };
  hlasky.length = 0;
  vm.runInContext('nabidkaFotoPrijmi("ock", { type: "image/' + n + '", size: 1000, name: "f.' + n + '" }, false)', ctx);
  test('nahrání ' + n + ' → ' + (maProjit ? 'uloží se' : 'odmítne se s hláškou'),
    maProjit ? ctx.ZAK.uvodniFoto === vysl && !hlasky.length : ctx.ZAK.uvodniFoto === '' && hlasky.length === 1, [ctx.ZAK.uvodniFoto.slice(0, 30), hlasky]);
}
{
  ctx.ZAK = { uvodniFoto: '' }; hlasky.length = 0;
  vm.runInContext('nabidkaFotoPrijmi("ock", { type: "image/png", size: 2 * 1024 * 1024 + 1, name: "velka.png" }, false)', ctx);
  test('strop 2 MB beze změny (větší soubor odmítnut)', ctx.ZAK.uvodniFoto === '' && /příliš velká/.test(hlasky[0] || ''), hlasky);
}

/* ---------- 6) logo a podpis: totéž pravidlo ---------- */
console.log('\n--- 6) logo firmy a podpis ---');
{
  const fm = require('./firma.js');
  const logo = (l) => !!fm.firmaKZverejneni({ logo: l, logoNazev: 'l.png' }).logo;
  test('logo: PNG a JPEG projdou, odkaz, SVG a WEBP ne', logo(PNG) && logo(JPEG) && !logo(HTTP) && !logo(SVG) && !logo(WEBP) && !logo(JS));
  test('firma.js používá společnou kontrolu (obrazekDataUrlPlatny)', /obrazekDataUrlPlatny\(/.test(fs.readFileSync(__dirname + '/firma.js', 'utf8')));
  const sd = fs.readFileSync(__dirname + '/../netlify/lib/sdilene.mjs', 'utf8');
  test('podpis na serveru drží totéž pravidlo (PNG/JPEG, base64)', sd.includes('/^data:image\\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/'));
}

console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
if (fail) process.exit(1);
