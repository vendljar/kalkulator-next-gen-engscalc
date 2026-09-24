/* ZKOUŠKA OBNOVY NANEČISTO — úplná havárie databáze (#152, 2. část, 24. 9. 2026).
 *
 * „Záloha, ze které se nikdy nezkusila obnova, není záloha." test_obnova.mjs
 * hlídá pojistky obnovy nad DÍLČÍ ztrátou (smazaná zakázka, přepsaná firma).
 * Tahle sada zkouší nejhorší případ, podle kterého je psaný postup
 * v podklady/POSTUP_OBNOVY_ZALOHY.md — a drží ho tak pravdivý:
 *
 *   A) Zmizí celá ostrá databáze, noční otisky v úložišti `zalohy` zůstanou.
 *      Administrátor se přihlásí náhradním heslem (ADMIN_INIT_HESLO),
 *      obnoví poslední NOČNÍ otisk a všechno je zpátky včetně účtů a hesel.
 *   B) Zmizí i úložiště záloh. Zbývá soubor stažený přes „Stáhnout zálohu"
 *      (nebo odlitý na Disk). Zakázky, ceník a firma se obnoví; účty ne —
 *      soubor otisky hesel záměrně nenese, obchodníkům se hesla nastaví
 *      znovu. Tahle mez musí být v postupu napsaná, ne objevená v nouzi.
 *
 * Paměťové úložiště, žádná síť, žádná ostrá data. Spuštění:
 *   node netlify/test_obnova_nanecisto.mjs */
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
import uzivatele from './functions/uzivatele.mjs';
import program from './functions/program.mjs';
import firma from './functions/firma.mjs';
import zakazky from './functions/zakazky.mjs';
import zaloha from './functions/zaloha.mjs';
import zalohaNocni from './functions/zaloha_nocni.mjs';
import obnova from './functions/obnova.mjs';
import { ADMIN_EMAIL } from './lib/sdilene.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
Object.assign(globalThis, require('../src/format.js'), require('../src/engine.js'), require('../src/engine_proj.js'),
  require('../src/techspec.js'), require('../src/sleva.js'), require('../src/zaokrouhleni.js'), require('../src/zamek.js'));
const zk = require('../src/zakazka.js');
const ZC = require('../src/zkusebni_cenik.js');
const fmod = require('../src/firma.js');
const zm = require('../src/zamek.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info))); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST',
  headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const ulz = (n) => globalThis.__TEST_ULOZISTE(n);
const prihlas = async (email, heslo) => {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email, heslo });
  return { status: r.status, cookie: (r.headers.get('set-cookie') || '').split(';')[0], json: await r.json() };
};
/* Havárie: z paměti zmizí všechno kromě vyjmenovaných úložišť. */
const havarie = (zachovat) => { for (const k of [...pamet.keys()])
  if (!zachovat.some(n => k.startsWith(n + '/'))) pamet.delete(k); };
const stav = async (cookie) => {
  const rej = await ulz('zakazky').cti('_rejstrik');
  const prog = await (await get(program, 'http://x/api/program', cookie)).json();
  const f = await ulz('program').cti('firma');
  return { zakazek: rej ? rej.zakazky.length : 0, cenikVerze: prog && prog.db && prog.db.platny ? prog.db.platny.verze : null,
           firma: f && f.udaje ? f.udaje.nazev : null };
};

/* ---- 0) provozní stav před havárií ---- */
const adm = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
test('administrátor se přihlásí', adm.json.ok === true);
await post(uzivatele, 'http://x/api/uzivatele',
  { akce: 'zaloz', email: 'obchodnik@priklad.cz', jmeno: 'Test Obchodník', role: 'Obchodník', heslo: 'ObchodHeslo1' }, adm.cookie);
const obch = await prihlas('obchodnik@priklad.cz', 'ObchodHeslo1');
test('obchodník se přihlásí', obch.json.ok === true);
await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
  slevy: { minMarze: 0.1, maxGlobalni: 0.3, stropy: { 'Obchodník': 0.05 } }, poznamka: 'první' }, adm.cookie);
const C2 = ZC.zkusebniCenik(); C2.marze = (+C2.marze || 0) + 0.01;
const pub2 = await (await post(program, 'http://x/api/program', { cenik: C2, cenikProj: ZC.zkusebniCenikProj(),
  slevy: { minMarze: 0.1, maxGlobalni: 0.3, stropy: { 'Obchodník': 0.05 } }, poznamka: 'druhá' }, adm.cookie)).json();
test('ceník zveřejněn ve verzi 2', pub2.ok && pub2.verze === 2, pub2);
const F = fmod.firmaDefault(); delete F.ukazkove; F.nazev = 'Zkušební firma před havárií s.r.o.'; F.ico = '12345678';
await post(firma, 'http://x/api/firma', { udaje: F }, adm.cookie);
const ulozene = [];
for (const [cislo, nazev] of [['0901', 'Havárie A'], ['0902', 'Havárie B'], ['0903', 'Havárie C — odeslaná']]) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + cislo; z.nazevAkce = nazev;
  if (cislo === '0903') zm.zamkniVariantu(z.varianty[0], { typ: 'nabidka', kdo: 'Test', cislo: zm.variantaCislo(z, z.varianty[0]) });
  ulozene.push((await (await post(zakazky, 'http://x/api/zakazky', { zakazka: z }, obch.cookie)).json()).soubor);
}
test('tři zakázky uložené (jedna s odeslanou nabídkou)', ulozene.every(Boolean), ulozene);
const pred = await stav(adm.cookie);
test('stav před havárií: 3 zakázky, ceník v2, firma', pred.zakazek === 3 && pred.cenikVerze === 2
  && /před havárií/.test(pred.firma), pred);

/* Noční otisk (přesně ta funkce, kterou Netlify pouští ve 2:00) a soubor
 * „Stáhnout zálohu", který si administrátor stáhne k sobě. */
const noc = await (await zalohaNocni()).json();
test('noční otisk pořízen', noc.ok === true && !!noc.den, noc);
const soubor = (await (await get(zaloha, 'http://x/api/zaloha', adm.cookie)).json()).zaloha;
test('stažená záloha nese 3 zakázky', Object.keys(soubor.zakazky).length === 3);

/* ---- A) havárie ostré databáze, noční otisky zůstaly ---- */
havarie(['zalohy']);
test('A: po havárii je databáze prázdná (žádná zakázka, žádný účet)',
  (await ulz('zakazky').seznam()).length === 0 && (await ulz('uzivatele').seznam()).length === 0);
test('A: obchodník se nepřihlásí', (await prihlas('obchodnik@priklad.cz', 'ObchodHeslo1')).status !== 200);
const admA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
test('A: administrátor se přihlásí náhradním heslem (ADMIN_INIT_HESLO)', admA.json.ok === true, admA.json);
const nA = await (await post(obnova, 'http://x/api/obnova', { zdroj: { otisk: noc.den }, rezim: 'doplnit', nahled: true }, admA.cookie)).json();
test('A: náhled z nočního otisku slibuje 3 nové zakázky', nA.ok && nA.casti.zakazky.nove === 3, nA.casti && nA.casti.zakazky);
const oA = await (await post(obnova, 'http://x/api/obnova', { zdroj: { otisk: noc.den }, rezim: 'doplnit', potvrzeni: 'OBNOVIT' }, admA.cookie)).json();
test('A: obnova proběhla', oA.ok === true, oA);
const poA = await stav(admA.cookie);
test('A: zpátky jsou 3 zakázky, ceník v2 i firma', poA.zakazek === 3 && poA.cenikVerze === 2 && /před havárií/.test(poA.firma), poA);
test('A: odeslaná nabídka má dál svůj zámek',
  !!(await ulz('zakazky').cti('z/' + ulozene[2])).varianty[0].zamek.zamceno);
test('A: obchodník se přihlásí PŮVODNÍM heslem (otisk nese otisky hesel)',
  (await prihlas('obchodnik@priklad.cz', 'ObchodHeslo1')).status === 200);

/* ---- B) zmizelo i úložiště záloh — zbývá stažený soubor ---- */
havarie([]);
test('B: prázdné je všechno včetně záloh', pamet.size === 0);
const admB = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
test('B: administrátor se přihlásí náhradním heslem', admB.json.ok === true);
const oB = await (await post(obnova, 'http://x/api/obnova', { zdroj: { soubor }, rezim: 'doplnit', potvrzeni: 'OBNOVIT' }, admB.cookie)).json();
test('B: obnova ze staženého souboru proběhla', oB.ok === true, oB);
const poB = await stav(admB.cookie);
test('B: zpátky jsou 3 zakázky, ceník v2 i firma', poB.zakazek === 3 && poB.cenikVerze === 2 && /před havárií/.test(poB.firma), poB);
/* Mez, kterou musí znát postup: soubor otisky hesel nenese. */
test('B: účty ze souboru se neobnoví — obchodník se nepřihlásí, dokud mu administrátor nezaloží účet',
  (await prihlas('obchodnik@priklad.cz', 'ObchodHeslo1')).status !== 200
  && oB.casti.uzivatele.preskocene >= 1, oB.casti && oB.casti.uzivatele);

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
