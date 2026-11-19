/* PoC MT-1 (audit 20. 11. 2026, čočka MT): antedatovaný prodej (K40-S1, #580).
 *
 * Obchodník pošle NOVOU zakázku, ve které si sám vyrobí zámek „odeslané
 * nabídky“ s časem −300 dní a prodej téhož dne. Server, který nezná razítko
 * přijetí zámku (`zamek.prijato`), nemá s čím datum porovnat a prodej zapíše
 * do libovolného minulého období (controlling, provize, období odeslání).
 *
 * Strom kódu: proměnná prostředí KNG_STROM (výchozí = tento repozitář).
 *   node podklady/audit_2026-11-20/poc_MT_prodej_antedatace.mjs
 *   KNG_STROM=<export origin/main> node podklady/audit_2026-11-20/poc_MT_prodej_antedatace.mjs
 * Bez sítě: paměťové úložiště, zkušební ceník, smyšlené účty @priklad.cz. */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const R = path.resolve(process.env.KNG_STROM || new URL('../..', import.meta.url).pathname) + '/';
const imp = (p) => import(pathToFileURL(R + p).href);
process.env.TAJEMSTVI_RELACE = 'testovaci-poc-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = 'spravce@priklad.cz';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { if (v === null) pamet.delete(nazev + '/' + k); else pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
const { default: prihlaseni } = await imp('netlify/functions/prihlaseni.mjs');
const { default: program } = await imp('netlify/functions/program.mjs');
const { default: zakazky } = await imp('netlify/functions/zakazky.mjs');
const { default: uzivatele } = await imp('netlify/functions/uzivatele.mjs');
const { jadro } = await imp('netlify/lib/jadro.mjs');
const { JEKLY } = await jadro();
const require = createRequire(R + 'netlify/x.mjs');
const zk = require(R + 'src/zakazka.js');
const zam = require(R + 'src/zamek.js');
const ZC = require(R + 'src/zkusebni_cenik.js');
const OBJ = require(R + 'src/objednane.js');
const verze = require('node:fs').readFileSync(R + 'verze.txt', 'utf8').trim();

const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const kopie = x => JSON.parse(JSON.stringify(x));
async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  const t = await r.clone().json(); if (!t.ok) throw new Error('přihlášení ' + e + ' ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const cA = await prihlas('spravce@priklad.cz', 'Docasne.Heslo.123');
const cenik = Object.assign(ZC.zkusebniCenik(), typeof ZC.zkusebniMustky === 'function' ? ZC.zkusebniMustky() : {});
const rp = await (await post(program, 'http://x/api/program', { cenik, cenikProj: ZC.zkusebniCenikProj(),
  slevy: { minMarze: 0, maxGlobalni: 1, stropy: { 'Obchodník': 0.05, 'Vedoucí': 0.15, 'Administrátor': 1 } }, poznamka: 'poc MT-1' }, cA)).json();
if (!rp.ok) throw new Error('program ' + JSON.stringify(rp));
const ru = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'obch.mt1@priklad.cz', jmeno: 'Test Obchodník', role: 'Obchodník', heslo: 'Heslo12345x' }, cA)).json();
if (!ru.ok) throw new Error('uživatel ' + JSON.stringify(ru));
const cO = await prihlas('obch.mt1@priklad.cz', 'Heslo12345x');

const DEN = 86400000, ted = Date.now();
const platny = JSON.parse(pamet.get('program/db')).platny;
const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 7771'; z.nazevAkce = 'TEST PoC MT-1 antedatace';
const v = z.varianty[0];
Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
v.data.cenik = kopie(platny.cenik); v.data.proj.cenik = kopie(platny.cenikProj);
const kdy = new Date(ted - 300 * DEN).toISOString();
zam.zamkniVariantu(v, { typ: 'nabidkaTisk', kdy, kdo: 'Test PoC', cislo: zam.variantaCislo(z, v), vysledek: zam.zamekVysledekSpocti(v, JEKLY, 'v-poc') });
v.zamek.prijato = kdy;                                   // podvrh razítka přijetí
v.prodano = { datum: OBJ.objDnes(ted - 300 * DEN), kdo: 'podvrh@priklad.cz', kdy: '2000-01-01T00:00:00.000Z' };

const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: z }, cO);
const t = await r.json();
console.log('strom: ' + R + '  (verze ' + verze + ')');
console.log('POST /api/zakazky jako Obchodník — nová zakázka, zámek −300 dní, prodej téhož dne → HTTP ' + r.status
  + (t.chyba ? '  „' + String(t.chyba).slice(0, 160) + '“' : ''));
let ulozena = null;
if (r.status === 200) {
  ulozena = (await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(t.soubor), cO)).json()).zakazka;
  const u = ulozena.varianty[0];
  console.log('uloženo: prodano.datum = ' + (u.prodano && u.prodano.datum) + ', zamek.kdy = ' + u.zamek.kdy
    + ', zamek.prijato = ' + (u.zamek.prijato === undefined ? '(server nezapisuje)' : u.zamek.prijato === kdy ? 'PODVRŽENÉ převzato' : 'čas serveru'));
}
const zranitelne = r.status === 200 && ulozena && ulozena.varianty[0].prodano
  && ulozena.varianty[0].prodano.datum === OBJ.objDnes(ted - 300 * DEN);
console.log(zranitelne
  ? 'ZRANITELNÉ — obchodník zapsal prodej 300 dní zpět (server nemá dolní mez z přijetí zámku).'
  : 'ODOLNÉ — antedatovaný prodej server odmítl.');
process.exit(0);
