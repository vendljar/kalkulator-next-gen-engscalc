/* ============================================================
 * VZ-E5 (#604, bod 5) — SUCHÝ BĚH PIPEDRIVE: ŘÁDEK „Poznámka dealu —
 * další zákazníci“, 16. 11. 2026
 *
 * Suchý běh zápisu do Pipedrive (#536) má ukázat poznámku dealu se seznamem
 * dalších zákazníků se STEJNÝM textem, jaký zapíše uložení zakázky
 * (lib/pd_poznamka.mjs pdPoznamkaZakText). Prohlížeč text skládá týmž kódem
 * (src/vz_poznamka.js vzPoznamkaText + vzPoznamkaSeZnackou) a posílá ho
 * v těle jako `zakaznici`; server ho jen očistí a ukáže jako řádek.
 *
 *  a) VYP / jeden zákazník: podklad i tělo beze změny (žádný klíč
 *     `zakaznici`), žádný řádek;
 *  b) ZAP + další zákazníci: řádek s textem shodným s pdPoznamkaZakText
 *     serveru (stejná zakázka) — prohlížeč běží v ODDĚLENÉM kontextu
 *     (vm, CORE z build.py slepené jako v aplikaci), server v jádru
 *     netlify/lib/jadro_moduly.cjs;
 *  c) „žádní“ jen se serverovým polem pdPoznamkaZakaznici téhož dealu;
 *  d) server zahodí ne-string `zakaznici` a očistí řídicí znaky;
 *  e) zamýšlený zápis dealu (patch) je s poznámkou i bez ní STEJNÝ.
 * Pojistka: bez změny VZ-E5 bod 5 (src/pd_nanecisto.js, functions/
 * pd_nanecisto.mjs, lib/pd_prevod.mjs) sada padá — viz zpráva commitu.
 * Spuštění: node netlify/test_vz_nanecisto.mjs
 * ============================================================ */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
if (!process.env.ADMIN_EMAIL) process.env.ADMIN_EMAIL = 'spravce@priklad.cz';
for (const k of ['PIPEDRIVE_SIMULATOR', 'PIPEDRIVE_SIMULATOR_SCENAR', 'PIPEDRIVE_TOKEN', 'PIPEDRIVE_DOMENA', 'PROSTREDI',
  'NETLIFY', 'SITE_ID', 'SITE_NAME', 'DEPLOY_ID', 'CONTEXT', 'BRANCH', 'HEAD', 'URL']) delete process.env[k];
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
let venku = [];
globalThis.fetch = async (url) => { venku.push(String(url)); throw new Error('síť je v testu zakázaná: ' + url); };

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const R = new URL('..', import.meta.url).pathname;
const { default: prihlaseni } = await import('./functions/prihlaseni.mjs');
const { default: pdNanecistoFn, pdNanecistoZakaznici } = await import('./functions/pd_nanecisto.mjs');
const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');
const { POLE_DEALU } = await import('./lib/pd_mapa.mjs');
const { pdNanecisto, pdZamyslenyZapis } = await import('./lib/pd_prevod.mjs');
const { pdPoznamkaZakText } = await import('./lib/pd_poznamka.mjs');
const { jadro } = await import('./lib/jadro.mjs');
await jadro();   /* serverové jádro (jadro_moduly.cjs) do globalThis */
const require = createRequire(R + 'netlify/x.mjs');
const ZC = require(R + 'src/zkusebni_cenik.js');
const JEKLY = require(R + 'src/jekly.json');
const G = globalThis;

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); } };
const J = x => JSON.stringify(x);
const kop = x => JSON.parse(JSON.stringify(x));

/* ---------- prohlížeč: CORE z build.py v jednom oddělném kontextu ----------
 * Moduly sdílejí jeden scope jako v aplikaci (jeden <script>); vypínač
 * víc zákazníků řídí náhradní viceZakaznikuZapnuto (src/ui/online_ui.js). */
const buildPy = readFileSync(R + 'build.py', 'utf8');
const CORE = JSON.parse('[' + /\nCORE = \[([\s\S]*?)\]/.exec(buildPy)[1].replace(/'/g, '"').replace(/\n/g, ' ') + ']');
if (!CORE.includes('vz_poznamka.js') || !CORE.includes('pd_nanecisto.js')) throw new Error('CORE v build.py nenese vz_poznamka.js / pd_nanecisto.js');
const okno = vm.createContext({ console, Intl, Date, Math, JSON });
vm.runInContext(CORE.map(f => readFileSync(R + 'src/' + f, 'utf8')).join('\n;\n')
  + '\n;var __VZ_ZAP = false; function viceZakaznikuZapnuto() { return __VZ_ZAP; }', okno, { filename: 'core.js' });
/* Ceník nese zakázka sama (v.data.cenik) — výchozí ceník kontextu se nepřepisuje. */
/* Podklad a tělo z prohlížeče (výstup přes JSON — co by odešlo po síti). */
function prohlizec(zak, zap) {
  okno.__vstup = J({ zak, jekly: JEKLY, zap: !!zap });
  return JSON.parse(vm.runInContext(`(() => { const v = JSON.parse(__vstup); __VZ_ZAP = v.zap;
    const p = pdnPodklad(v.zak, v.jekly); return JSON.stringify({ p, t: pdnTelo(p) }); })()`, okno));
}
if (typeof okno.vzPoznamkaSeZnackou !== 'function' || typeof okno.pdnPodklad !== 'function') throw new Error('kontext prohlížeče se nesložil');

/* ---------- zakázka (smyšlená data, žádný kontakt ani skutečná cena) ---------- */
let n = 9960;
function nova() {
  const z = G.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++) + ' - TEST'; z.nazevAkce = 'TEST VZ náhled';
  z.objednatel = 'TEST – TESTOVACÍ ODBĚRATEL s.r.o.';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.ock.fixes = true;
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()); v.data.proj.cenik = ZC.zkusebniCenikProj();
  return z;
}
const UDAJE_B = { objednatel: 'TEST – DRUHÝ ODBĚRATEL s.r.o.', adresaObjednatele: 'Zkušební 1, Testov', ico: '', dic: '', kontakt: '' };
const UDAJE_C = { objednatel: 'TEST – TŘETÍ ODBĚRATEL s.r.o.', adresaObjednatele: '', ico: '', dic: '', kontakt: '' };
function sVz(...udaje) {
  const z = nova();
  for (const u of udaje) { const p = G.vzPridej(z, u, { kdo: 'Obch VZ', kdy: '2026-11-16T10:00:00.000Z' }); if (!p.ok) throw new Error('vzPridej ' + J(p)); }
  return z;
}
const POLE = { mapa: {}, popisy: {} };
const radekZak = (radky) => (radky || []).find(r => r.klic === 'poznamkaZakaznici');

/* ---------- a) VYP / jeden zákazník: beze změny ---------- */
const jeden = nova();
const dva = sVz(UDAJE_B);
const tri = sVz(UDAJE_B, UDAJE_C);
{
  const vyp = prohlizec(dva, false);
  const zap1 = prohlizec(jeden, true);
  const vyp1 = prohlizec(jeden, false);
  test('a VYP + víc zákazníků: podklad bez klíče zakaznici', vyp.p.ok && !('zakaznici' in vyp.p), Object.keys(vyp.p));
  test('a VYP: tělo jen strany, zdroje, dealId', J(Object.keys(vyp.t)) === J(['strany', 'zdroje', 'dealId']), Object.keys(vyp.t));
  test('a ZAP + jeden zákazník: podklad i tělo bajt po bajtu jako VYP', J(zap1) === J(vyp1) && !('zakaznici' in zap1.p) && !('zakaznici' in zap1.t));
  const bez = { ...dva, dalsiZakaznici: undefined, vzRidici: undefined };
  test('a VYP + víc zákazníků: podklad jako u zakázky bez dalších zákazníků', J(vyp.p) === J(prohlizec(JSON.parse(J(bez)), false).p));
  const nVyp = pdNanecisto(POLE_DEALU, vyp.t.strany, POLE, {});
  test('a VYP: náhled bez řádku poznámky zákazníků', !radekZak(nVyp.radky));
}

/* ---------- b) ZAP + další zákazníci: týž text jako server ---------- */
{
  for (const [jmeno, zak] of [['2 zákazníci', dva], ['3 zákazníci', tri]]) {
    const { p, t } = prohlizec(zak, true);
    const server = pdPoznamkaZakText(kop(zak), false, G);
    test('b ' + jmeno + ': server má text (víceřádkový, se značkou zakázky)', server.includes('\n') && server.endsWith('— nabídka ' + zak.cislo), server);
    test('b ' + jmeno + ': podklad nese text shodný s pdPoznamkaZakText serveru', p.zakaznici === server, [p.zakaznici, server]);
    test('b ' + jmeno + ': tělo ho předá (zakaznici)', t.zakaznici === server);
    test('b ' + jmeno + ': jen názvy (žádná adresa ani kontakt)', !/Zkušební 1|Testov/.test(t.zakaznici) && /DRUHÝ ODBĚRATEL/.test(t.zakaznici), t.zakaznici);
    const nn = pdNanecisto(POLE_DEALU, t.strany, POLE, { poznamkaZakaznici: pdNanecistoZakaznici(t.zakaznici) });
    const r = radekZak(nn.radky);
    test('b ' + jmeno + ': řádek „Poznámka dealu — další zákazníci“ s týmž textem', r && r.nazev === 'Poznámka dealu — další zákazníci'
      && r.typ === 'poznámka' && r.stav === 'zapise' && r.hodnotaText === server && r.hodnota === server && /zápis dealu ji neposílá/.test(r.duvod), r);
  }
  /* CSV snese víceřádkový text (csvBunka uvozovky). */
  const { t } = prohlizec(tri, true);
  const nn = pdNanecisto(POLE_DEALU, t.strany, POLE, { poznamkaZakaznici: t.zakaznici });
  const csv = G.pdnCsv ? G.pdnCsv(nn, {}) : vm.runInContext('pdnCsv', okno)(nn, {});
  test('b CSV: víceřádkový text v jedné buňce v uvozovkách', csv.includes('"' + t.zakaznici.replace(/"/g, '""') + '"'), csv.slice(-600));
}

/* ---------- c) „žádní“ jen s polem pdPoznamkaZakaznici téhož dealu ---------- */
{
  const z = nova(); z.pdDealId = '4711';
  const bezPole = prohlizec(z, true);
  test('c bez dalších zákazníků a bez pole: žádný klíč', !('zakaznici' in bezPole.p) && !('zakaznici' in bezPole.t));
  z.pdPoznamkaZakaznici = { deal: '4711', id: 5, otisk: '0123456789abcdef', kdy: '2026-11-16T10:00:00.000Z' };
  const s = prohlizec(z, true);
  const server = pdPoznamkaZakText(kop(z), true, G);
  test('c s polem téhož dealu: „žádní — nabídka …“ shodně se serverem', s.p.zakaznici === server
    && server === 'Další zákazníci na zakázce: žádní — nabídka ' + z.cislo, [s.p.zakaznici, server]);
  test('c ale VYP: nic', !('zakaznici' in prohlizec(z, false).p));
  z.pdPoznamkaZakaznici = { ...z.pdPoznamkaZakaznici, deal: '999' };
  test('c pole jiného dealu: nic', !('zakaznici' in prohlizec(z, true).p));
}

/* ---------- d) server: tvar vstupu ---------- */
{
  test('d ne-string zakaznici → \'\'', [5, true, null, undefined, { a: 1 }, ['x']].every(x => pdNanecistoZakaznici(x) === ''));
  test('d řídicí znaky pryč, \\n zůstane, CRLF → \\n', pdNanecistoZakaznici('A\u0000B\r\nC D\tE\nF') === 'A B\nC D E\nF', pdNanecistoZakaznici('A\u0000B\r\nC D\tE\nF'));
  test('d délka omezená (20 000 znaků)', pdNanecistoZakaznici('x'.repeat(30000)).length === 20000);
  /* Celý endpoint (režim dohoda, admin). */
  const r1 = await prihlaseni(new Request('http://x/api/prihlaseni', { method: 'POST', body: J({ email: ADMIN_EMAIL, heslo: 'Docasne.Heslo.123' }) }));
  const cAdmin = (r1.headers.get('set-cookie') || '').split(';')[0];
  const post = async (telo) => (await pdNanecistoFn(new Request('http://x/api/pd/nanecisto', { method: 'POST', headers: { cookie: cAdmin }, body: J(telo) }))).json();
  const { t } = prohlizec(dva, true);
  const tVyp = prohlizec(dva, false).t;
  const sPozn = await post(t);
  const bezPozn = await post(tVyp);
  const objekt = await post({ ...tVyp, zakaznici: { text: 'X' } });
  const cislo = await post({ ...tVyp, zakaznici: 42 });
  test('d endpoint: s textem řádek poznámky zákazníků', sPozn.ok && radekZak(sPozn.radky) && radekZak(sPozn.radky).hodnotaText === t.zakaznici, sPozn);
  test('d endpoint: bez textu žádný řádek', bezPozn.ok && !radekZak(bezPozn.radky));
  test('d endpoint: ne-string zakaznici se zahodí (odpověď = bez textu)', J(objekt) === J(bezPozn) && J(cislo) === J(bezPozn));
  test('d endpoint: souhrn počítá řádek', sPozn.souhrn.celkem === bezPozn.souhrn.celkem + 1 && sPozn.souhrn.zapise === bezPozn.souhrn.zapise + 1);
  /* e) patch přes endpoint beze změny */
  test('e endpoint: patch dealu s poznámkou i bez ní stejný', J(sPozn.patch) === J(bezPozn.patch) && !/ODBĚRATEL/.test(J(sPozn.patch)), [sPozn.patch, bezPozn.patch]);
  test('d/e do sítě (Pipedrive) nic', venku.length === 0, venku);
}

/* ---------- e) zamýšlený zápis dealu beze změny ---------- */
{
  const { t } = prohlizec(tri, true);
  const a = pdZamyslenyZapis(POLE_DEALU, t.strany, POLE, { poznamkaZakaznici: t.zakaznici }, {});
  const b = pdZamyslenyZapis(POLE_DEALU, t.strany, POLE, {}, {});
  test('e patch s poznámkou i bez ní stejný', J(a.patch) === J(b.patch) && !/ODBĚRATEL/.test(J(a.patch)), [a.patch, b.patch]);
  test('e řádky se liší jen poznámkou zákazníků', J(a.radky.filter(r => r.klic !== 'poznamkaZakaznici')) === J(b.radky) && !!radekZak(a.radky));
  const f = pdZamyslenyZapis(POLE_DEALU, t.strany, POLE, { poznamkaZakaznici: t.zakaznici }, { faze: 'prodano' });
  test('e Prodáno: patch bez poznámky zákazníků', !/ODBĚRATEL/.test(J(f.patch)), f.patch);
}

console.log(ok + ' OK, ' + fail + ' FAIL');
if (fail) process.exit(1);
