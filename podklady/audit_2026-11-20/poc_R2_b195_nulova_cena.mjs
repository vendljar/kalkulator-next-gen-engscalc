/* PoC čočky R2 (audit 20. 11. 2026) — mez B195 po SP #667 (v19.11.1).
 *
 * BEZPECNOST_MEZE.md (RC #561, B195) tvrdí: „cena musí být kladná (nula ani
 * záporná neprojde)“ a „server odmítne 400 … nekladnou cenu“. Od v19.11.1
 * (#667) server nulu přijímá. Pokus: obchodník (bez práva ceníku) vynuluje
 * VŠECHNY položky ceníku OCK, které `rucniCenaSmi` dovolí, s jednopísmenným
 * „zdrojem“, potvrdí je sám, zamkne (tisk nabídky) a uloží. minMarze = 30 %.
 *
 * Jen lokálně: paměťové úložiště, zkušební ceník, smyšlené účty. Bez sítě.
 * Spuštění: node podklady/audit_2026-11-20/poc_R2_b195_nulova_cena.mjs */
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
const R = new URL('../..', import.meta.url).pathname;
const { default: prihlaseni } = await import(R + 'netlify/functions/prihlaseni.mjs');
const { default: program } = await import(R + 'netlify/functions/program.mjs');
const { default: zakazky } = await import(R + 'netlify/functions/zakazky.mjs');
const { default: uzivatele } = await import(R + 'netlify/functions/uzivatele.mjs');
const { ADMIN_EMAIL } = await import(R + 'netlify/lib/sdilene.mjs');
const { jadro } = await import(R + 'netlify/lib/jadro.mjs');
const { JEKLY } = await jadro();
const { createRequire } = await import('node:module');
const require = createRequire(R + 'netlify/x.mjs');
const zk = require(R + 'src/zakazka.js');
const zam = require(R + 'src/zamek.js');
const CS = require(R + 'src/cenik_stari.js');
const ZC = require(R + 'src/zkusebni_cenik.js');
const RC = require(R + 'src/rucni_ceny.js');
const CEN = require(R + 'src/cenik.js');

const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const kopie = x => JSON.parse(JSON.stringify(x));
async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const uloz = async (zak, c) => { const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: zak }, c); return { status: r.status, ...(await r.json()) }; };
const nacti = async (soubor, c) => (await (await zakazky(new Request('http://x/api/zakazky?soubor=' + encodeURIComponent(soubor), { headers: { cookie: c } }))).json()).zakazka;

const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
const pr = await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
  slevy: { minMarze: 0.3, maxGlobalni: 0.3, stropy: { 'Obchodník': 0.05, 'Vedoucí': 0.15, 'Administrátor': 1 } }, poznamka: 'PoC R2' }, cA);
console.log('ceník zveřejněn (minMarze 30 %):', pr.status);
await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'obch.poc@priklad.cz', jmeno: 'Obch PoC', role: 'Obchodník', heslo: 'Heslo12345x' }, cA);
const cO = await prihlas('obch.poc@priklad.cz', 'Heslo12345x');
const platny = JSON.parse(pamet.get('program/db')).platny;

function nova(nazev, cislo) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + cislo; z.nazevAkce = 'TEST PoC R2 ' + nazev;
  Object.assign(z.varianty[0].data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4, typSachty: 'exteriérová' });
  z.varianty[0].data.cenik = kopie(platny.cenik);
  z.varianty[0].data.proj.cenik = kopie(platny.cenikProj);
  CS.cenikOznacJakoDnesni(z.varianty[0].data, { verze: platny.verze });
  return z;
}
const zamkni = (z) => { const v = z.varianty[0];
  zam.zamkniVariantu(v, { typ: 'nabidka', kdy: new Date().toISOString(), kdo: 'PoC R2',
    cislo: zam.variantaCislo(z, v), vysledek: zam.zamekVysledekSpocti(v, JEKLY, 'poc-r2') });
  return z; };
const cena = (z) => { try { const v = zam.zamekVysledekSpocti(z.varianty[0], JEKLY, 'poc-r2'); return v; } catch (e) { return { chyba: e.message }; } };
const souhrn = (v) => JSON.stringify(v).slice(0, 260);

/* 1) Výchozí stav bez ručních cen. */
const z0 = nova('výchozí', 9901);
const v0 = cena(z0);

/* 2) Vynulovat vše, co rucniCenaSmi dovolí. */
const z1 = nova('nuly', 9902);
const d = z1.varianty[0].data;
const cesty = [];
(CEN.CENIK_DEF || []).forEach(([, items]) => items.forEach(([p]) => { if (RC.rucniCenaSmi(p)) cesty.push(p); }));
d.rucniCeny = {};
let nastaveno = 0;
for (const p of cesty) {
  const klice = p.split('.').slice(1); let o = d.cenik;
  for (let i = 0; i < klice.length - 1; i++) o = o && o[klice[i]];
  if (!o || typeof o[klice[klice.length - 1]] !== 'number') continue;
  if (nastaveno === 0 && !globalThis.__PRVNI) { globalThis.__PRVNI = p; continue; }   // jednu položku nechat (cena 0 celkem se odmítá)
  o[klice[klice.length - 1]] = 0;
  d.rucniCeny[p] = { hodnota: 0, dodavatel: 'a', cislo: '', datum: '', platnostDo: '', zaklad: null, potvrdil: { lokalne: true } };
  nastaveno++;
}
console.log('položek s cenou v Kč, které smí obchodník přepsat:', cesty.length, '— vynulováno:', nastaveno);
const r1 = await uloz(z1, cO);
console.log('uložení rozpracované s nulami a potvrzením:', r1.status, r1.ok ? '' : String(r1.chyba).slice(0, 300));
let verdikt = 'ODOLNÉ';
if (r1.status === 200) {
  const u = await nacti(r1.soubor, cO);
  const rec = u.varianty[0].data.rucniCeny || {};
  const potvrzeno = Object.keys(rec).filter(k => rec[k] && rec[k].potvrdil && rec[k].potvrdil.email).length;
  console.log('server orazítkoval potvrzení u', potvrzeno, 'z', Object.keys(rec).length, 'záznamů');
  const v1 = cena(u);
  zamkni(u);
  const r2 = await uloz(u, cO);
  console.log('zámek (tisk nabídky) obchodníkem, bez schválení:', r2.status, r2.ok ? '' : String(r2.chyba).slice(0, 300));
  /* Částky neuvádíme (zpráva má být bez cen) — jen poměry číselných polí souhrnu OCK. */
  const s0 = (v0.ock && v0.ock.souhrn) || {}, s1 = (v1.ock && v1.ock.souhrn) || {};
  for (const k of Object.keys(s0)) if (typeof s0[k] === 'number' && s0[k] > 0 && typeof s1[k] === 'number')
    console.log('  souhrn.' + k + ': po vynulování / výchozí = ' + (s1[k] / s0[k]).toFixed(3));
  if (r2.status === 200 && potvrzeno > 0) verdikt = 'ZRANITELNÉ (vědomé rozhodnutí J. V. N3 — mez B195 v BEZPECNOST_MEZE.md ale tvrdí opak)';
}
/* 3) Kontrola: bez zdroje server nulu k zámku nepustí (N3 drží). */
const z3 = nova('nula bez zdroje', 9903);
const d3 = z3.varianty[0].data; const p3 = cesty[0];
{ const klice = p3.split('.').slice(1); let o = d3.cenik; for (let i = 0; i < klice.length - 1; i++) o = o[klice[i]]; o[klice[klice.length - 1]] = 0; }
d3.rucniCeny = { [p3]: { hodnota: 0, dodavatel: '', cislo: '', zaklad: null, potvrdil: { lokalne: true } } };
zamkni(z3);
const r3 = await uloz(z3, cO);
console.log('kontrola N3 — nula BEZ zdroje + zámek:', r3.status, '(očekáváno 403)');
console.log('\nVERDIKT: ' + verdikt);
