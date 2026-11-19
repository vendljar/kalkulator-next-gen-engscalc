/* VZ-E6 (#606, návrh § 9 R6) — SPOLEČNÝ HARNESS VÍC ŠACHET × VÍC ZÁKAZNÍKŮ.
 *
 * Obě zkušební funkce zapnuté, zakázka: řídící varianta V1 se dvěma
 * šachtami (Výtah A, Výtah B 2 ks), A = z1 řídící, B = z2 sdílí V1,
 * C = z3 vlastní varianta (klon V1 se šachtami). Hlídá:
 *   1) CN pro B: nabídka z pohledu B nese šachty V1 (smyčka, „šachet celkem:
 *      3 ks") i B (objednatel, číslo …-B), ne A ani C;
 *   2) CN pro C: šachty jeho vlastní varianty, číslo …-C, ne A ani B;
 *   3) server: tisk V1 pro B (zámek se šachtami a razítkem B) se uloží,
 *      platna B nese číslo …-B;
 *   4) Pipedrive (simulátor): u dealu OBĚ poznámky — „Šachty v nabídce"
 *      (šachty řídící varianty) a „Další zákazníci na zakázce" (B s odeslanou
 *      nabídkou …-B, C) — každá jednou;
 *   5) rejstřík nese oba štítky: sachty { 2, 3 } i zakaznici (3).
 * Jen simulátor Pipedrive (PIPEDRIVE_SIMULATOR=1), síť je zakázaná.
 * Pojistka: na 68e5eb8 (bez E6) sada padá v 5) — rejstřík klíč `zakaznici`
 * nenese; 1)–4) ověřují souhru E2–E5 se šachtami (dřív netestovanou spolu).
 * Spuštění: node netlify/test_vz_vs.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
for (const k of ['PIPEDRIVE_SIMULATOR_SCENAR', 'PIPEDRIVE_TOKEN', 'PIPEDRIVE_DOMENA', 'PROSTREDI',
  'NETLIFY', 'SITE_ID', 'SITE_NAME', 'DEPLOY_ID', 'CONTEXT', 'BRANCH', 'HEAD', 'URL']) delete process.env[k];
process.env.PIPEDRIVE_SIMULATOR = '1';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
globalThis.fetch = async (url) => { throw new Error('síť je v testu zakázaná: ' + url); };

const R = new URL('..', import.meta.url).pathname;
const { default: prihlaseni } = await import(R + 'netlify/functions/prihlaseni.mjs');
const { default: program } = await import(R + 'netlify/functions/program.mjs');
const { default: zakazky } = await import(R + 'netlify/functions/zakazky.mjs');
const { default: funkce } = await import(R + 'netlify/functions/funkce.mjs');
const { ADMIN_EMAIL } = await import(R + 'netlify/lib/sdilene.mjs');
const { jadro } = await import(R + 'netlify/lib/jadro.mjs');
const { JEKLY } = await jadro();
const SIM = await import(R + 'netlify/lib/pipedrive_simulator.mjs');
const { createRequire } = await import('node:module');
const require = createRequire(R + 'netlify/x.mjs');
const G = globalThis;
/* Generátory dokumentů (server je nenačítá) — do globálu jako v prohlížeči. */
for (const f of ['nazvy_souboru.js', 'firma.js', 'zpracovatel.js', 'podminky.js', 'plan_plateb.js', 'nabidka.js']) {
  const m = require(R + 'src/' + f);
  Object.keys(m).forEach(k => { if (G[k] === undefined) G[k] = m[k]; });
}
const zk = require(R + 'src/zakazka.js');
const ZC = require(R + 'src/zkusebni_cenik.js');
const ULO = require(R + 'src/uloziste.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 500)); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const kopie = x => JSON.parse(JSON.stringify(x));
async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
{ const r = await post(program, 'http://x/api/program', { cenik: Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()), cenikProj: ZC.zkusebniCenikProj(), poznamka: 'VZ-E6 R6' }, cA);
  if (r.status !== 200) throw new Error('program ' + r.status); }
{ const r = await post(funkce, 'http://x/api/funkce', { viceZakazniku: true, viceSachet: true }, cA); if (r.status !== 200) throw new Error('funkce ' + r.status); }
const ulozeno = (soubor) => JSON.parse(pamet.get('zakazky/z/' + soubor) || 'null');
async function uloz(zak) {
  const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: zak, ocekavaneRazitko: zak.uloRazitko || undefined }, cA);
  const t = { status: r.status, ...(await r.json()) };
  if (t.razitko) zak.uloRazitko = t.razitko;
  return t;
}
const notes = () => (SIM.pdSimStav().data.poznamky || []).filter(p => p.active_flag !== false);
const deal = SIM.pdSimStav().data.dealy.filter(d => d.status !== 'deleted').map(d => d.id).slice(-3)[0];

const A = 'TEST – ALFA ODBĚRATEL s.r.o.', B = 'TEST – BETA ODBĚRATEL s.r.o.', C = 'TEST – GAMA ODBĚRATEL s.r.o.';
const z = zk.novaZakazka();
z.cislo = '2026 - OPR - CN - 9790 - TEST'; z.nazevAkce = 'TEST VZ-E6 šachty × zákazníci'; z.objednatel = A; z.pdDealId = String(deal);
const v1 = z.varianty[0];
Object.assign(v1.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
v1.data.ock.fixes = true;
v1.data.cenik = Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()); v1.data.proj.cenik = ZC.zkusebniCenikProj();
v1.data.ock.nazev = 'Výtah A';
v1.data.ock.dalsi = [{ id: 's_b1', nazev: 'Výtah B', ks: 2, zadani: Object.assign(kopie(v1.data.ock.zadani), { zdvih: 12 }) }];
const PEVNE = { kdo: 'Test', kdy: '2026-11-17T10:00:00.000Z' };
if (!G.vzPridej(z, { objednatel: B }, PEVNE).ok) throw new Error('vzPridej B');
const rC = G.vzPridej(z, { objednatel: C }, Object.assign({ vlastni: true }, PEVNE));
if (!rC.ok) throw new Error('vzPridej C');
const v2 = z.varianty.find(v => v.id === rC.zakaznik.varianta);
v2.data.ock.dalsi[0].nazev = 'Výtah C-vlastní';

/* 1) + 2) CN z pohledu zákazníka */
function cn(id, v) {
  const p = G.vzTiskPohled(z, id);
  const vv = G.vzTiskVarianta(p, v);
  return { p, d: G.nabidkaData(p, vv, JEKLY, 'cz') };
}
{ const { p, d } = cn('z2', v1);
  const t = JSON.stringify(d);
  test('1 CN pro B: šachty V1 (Výtah A, Výtah B 2 ks, šachet celkem 3 ks)', Array.isArray(d.sachty) && d.sachty.length === 2
    && d.sachty[1].nazev === 'Výtah B' && d.sachty[1].ks === 2 && d.placeholders.SACHTY_CELKEM_POPIS === 'šachet celkem: 3 ks', d.sachty && d.sachty.map(s => s.nazev));
  test('1 CN pro B: objednatel B a číslo …-B', p.objednatel === B && t.indexOf(B) >= 0 && d.placeholders.CISLO_NABIDKY === (z.cislo + '-B').replace(/\s+/g, ''), d.placeholders.CISLO_NABIDKY);
  test('1 CN pro B: bez A a C (ani vlastní šachty C)', t.indexOf(A) < 0 && t.indexOf(C) < 0 && t.indexOf('C-vlastní') < 0); }
{ const { p, d } = cn('z3', v2);
  const t = JSON.stringify(d);
  test('2 CN pro C: šachty jeho varianty (Výtah C-vlastní), číslo …-C', Array.isArray(d.sachty) && d.sachty[1].nazev === 'Výtah C-vlastní'
    && p.objednatel === C && d.placeholders.CISLO_NABIDKY === G.vzCisloSPismenem(G.variantaCislo(z, v2), 'C').replace(/\s+/g, ''),
    [d.sachty && d.sachty.map(s => s.nazev), d.placeholders.CISLO_NABIDKY]);
  test('2 CN pro C: bez A a B', t.indexOf(A) < 0 && t.indexOf(B) < 0); }
test('1 pojistka: tisk z celé zakázky hodí (vzTiskHlidej)', (() => { try { G.nabidkaData(z, v1, JEKLY, 'cz'); return false; } catch (e) { return true; } })());

/* 3) uložení s tiskem V1 pro B */
const t0 = await uloz(z);
test('3 příprava: zakázka se šachtami a třemi zákazníky se uloží (200)', t0.status === 200, t0);
G.zamkniVariantu(v1, { typ: 'nabidkaTisk', kdo: 'Test VZ E6', kdy: new Date().toISOString(), cislo: G.variantaCislo(z, v1),
  vysledek: G.zamekVysledekSpocti(v1, JEKLY, 'vz-e6'), snimek: G.zamekSnimekSpocti(v1), zakaznik: { id: 'z2' } });
const t1 = await uloz(z);
const u = t1.soubor ? ulozeno(t1.soubor) : null;
test('3 tisk V1 pro B → 200, zámek se šachtami, razítko B …-B', t1.status === 200 && u.varianty[0].zamek.zamceno
  && u.varianty[0].zamek.tisky[0].zakaznik.id === 'z2' && u.varianty[0].zamek.tisky[0].zakaznik.cislo === z.cislo + '-B'
  && Array.isArray(u.varianty[0].zamek.vysledek.ock.sachty) && u.varianty[0].zamek.vysledek.ock.sachty.length === 2, { s: t1.status, ch: t1.chyba });
test('3 platna B: číslo …-B, cena ze zámku', u && u.dalsiZakaznici[0].platna && u.dalsiZakaznici[0].platna.cislo === z.cislo + '-B'
  && u.dalsiZakaznici[0].platna.cena > 0, u && u.dalsiZakaznici[0].platna);

/* 4) obě poznámky u dealu */
{ const p = notes().filter(x => String(x.deal_id) === String(deal));
  const s = p.filter(x => /^Šachty v nabídce: /.test(x.content)), zz = p.filter(x => /^Další zákazníci na zakázce:/.test(x.content));
  test('4 deal: přesně dvě poznámky — šachty a zákazníci', p.length === 2 && s.length === 1 && zz.length === 1, p.map(x => x.content.slice(0, 60)));
  test('4 poznámka šachet: šachty řídící varianty (Výtah B), ne vlastní šachty C', s[0] && /Výtah B/.test(s[0].content) && !/C-vlastní/.test(s[0].content), s[0] && s[0].content);
  test('4 poznámka zákazníků: B s odeslanou nabídkou …-B, C bez odeslané, A ne', zz[0] && zz[0].content.indexOf(B) >= 0
    && zz[0].content.indexOf(z.cislo + '-B') >= 0 && zz[0].content.indexOf(C) >= 0 && zz[0].content.indexOf('• ' + A) < 0, zz[0] && zz[0].content);   // A (řídící) není mezi dalšími; řádek T1 ho jmenovat smí
  test('4 odpověď uložení: obě poznámky v pořádku (šachty i zákazníci)', ['zalozeno', 'upraveno', 'beze-zmeny', undefined].includes(t1.pdPoznamka)
    && ['zalozeno', 'upraveno', 'beze-zmeny', undefined].includes(t1.pdPoznamkaZakaznici) && t0.pdPoznamka === 'zalozeno' && t0.pdPoznamkaZakaznici === 'zalozeno',
    [t0.pdPoznamka, t0.pdPoznamkaZakaznici, t1.pdPoznamka, t1.pdPoznamkaZakaznici]); }

/* 5) rejstřík s oběma štítky */
{ const s = await (await get(zakazky, 'http://x/api/zakazky', cA)).json();
  const zz = ((s.rejstrik && s.rejstrik.zakazky) || []).find(x => x.soubor === t1.soubor);
  test('5 rejstřík: sachty { 2, 3 } i zakaznici (3, B odeslaná)', zz && zz.sachty && zz.sachty.variant === 2 && zz.sachty.celkem === 3
    && Array.isArray(zz.zakaznici) && zz.zakaznici.length === 3 && zz.zakaznici[1].stav === 'odeslana', zz);
  test('5 štítky: „2 varianty / 3 ks" a „3 zákazníci"', ULO.uloRejstrikSachtyText(zz) === '2 varianty / 3 ks' && ULO.uloRejstrikZakazniciText(zz) === '3 zákazníci'); }

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
