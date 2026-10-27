/* HROMADNÝ EXPORT CONTROLLINGU — OBJEM (#504, 22. 10. 2026)
 *
 * Doplnění J. V. 22. 10. 2026: „Nejsme schopni stahovat víc než 600 zakázek?"
 * Simulace s VÝCHOZÍMI volbami (podle data prodeje, Stav Pipedrive Vyhrané):
 * 1000 zakázek prodaných v říjnu s vyhraným dealem a 400 v září,
 * úložiště se zpožděním 25 ms na čtení zakázky (řádově jako Netlify Blobs).
 * Ověřuje, že export doběhne celý, v dávkách, z nichž žádná nepřesáhne časový
 * rozpočet o víc než doběh rozebraných čtení (funkce Netlify má 10 s), že
 * soubor nese všech 1000 zakázek bez duplicit a protokol jeden záznam.
 * Před opravou 0 / 3 (413: 1400 kandidátů nad strop 600), po opravě 3 / 3.
 * #508: navíc celá databáze 5000 zakázek (viz níž).
 *
 * Sada je samostatná (není v seznamu netlify/mutace.mjs), aby mutační běh
 * nezdržovala; pouští ji spust_testy.sh. Spuštění: node netlify/test_controlling_objem.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
const pamet = new Map();
const ZPOZDENI_MS = 25;
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) {
    if (nazev === 'zakazky' && k.startsWith('z/')) await new Promise(r => setTimeout(r, ZPOZDENI_MS));
    return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
    .map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

const { default: prihlaseni } = await import('./functions/prihlaseni.mjs');
const { default: controllingExport } = await import('./functions/controlling_export.mjs');
const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');
const { jadro } = await import('./lib/jadro.mjs');
const J = await jadro();
const G = globalThis;

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info).slice(0, 400))); } };

const r1 = await prihlaseni(new Request('http://x/api/prihlaseni', { method: 'POST',
  body: JSON.stringify({ email: ADMIN_EMAIL, heslo: 'Docasne.Heslo.123' }) }));
const cAdmin = (r1.headers.get('set-cookie') || '').split(';')[0];

/* Vzor zakázky: zamčená, vyhraný deal; kopie náhradou v textu. */
const vzor = G.novaZakazka();
vzor.cislo = '2026 - OPR - CN - 9000'; vzor.nazevAkce = 'Akce 2026 - OPR - CN - 9000';
vzor.pdDealId = '9000'; vzor.pdStav = { status: 'won', nacteno: '2026-10-20T10:00:00.000Z' };
const v = vzor.varianty[0];
Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2 });
G.zamkniVariantu(v, { cislo: G.variantaCislo(vzor, v), kdo: 'admin@priklad.cz', typ: 'nabidka',
  vysledek: G.zamekVysledekSpocti(v, J.JEKLY, 'test') });
v.zamek.kdy = '2026-10-01T09:00:00Z';
const tpl = JSON.stringify(vzor);
const KLIC = G.objNabidnute(v, J.JEKLY)[0].key;
const rej = [];
for (let i = 0; i < 1400; i++) {
  const cislo = '2026 - OPR - CN - ' + (10000 + i);
  const kdy = i < 1000 ? '2026-10-' + String(1 + (i % 22)).padStart(2, '0') + 'T09:00:00Z' : '2026-09-' + String(1 + (i % 25)).padStart(2, '0') + 'T09:00:00Z';
  const text = tpl.split('2026 - OPR - CN - 9000').join(cislo).split('2026-10-01T09:00:00Z').join(kdy);
  const z = JSON.parse(text);
  /* Prodej (C6): objednaný příplatek z nabídky, den prodeje = den zámku. */
  z.objednane = { varianta: z.varianty[0].id, klice: [KLIC], datum: kdy.slice(0, 10) };
  const soubor = G.uloJmenoSouboru(z);
  pamet.set('zakazky/z/' + soubor, JSON.stringify(z));
  const zaznam = G.uloRejstrikZaznam(z, { soubor, razitko: '2026-10-21T10:00:00Z' });
  /* Polovina záznamů jako starší rejstřík bez dnů zámků — hrubý předvýběr (1400 kandidátů). */
  if (i % 2) delete zaznam.ctrlDny;
  rej.push(zaznam);
}
pamet.set('zakazky/_rejstrik', JSON.stringify({ schema: 1, zakazky: rej }));

const casy = [];
/* K7-W10 (#508, J. V. 23. 10. 2026): dávky se měří počtem zakázek, ne reálným časem
 * (na pomalém CI kolísal) — `davky` = kolik zakázek dávka zpracovala. */
const davky = [];
let kandidatu = 0;
const api = async (cesta) => {
  const t0 = Date.now();
  const r = await controllingExport(new Request('http://x' + cesta, { headers: { cookie: cAdmin } }));
  casy.push(Date.now() - t0);
  const o = await r.json();
  if (o && typeof o.zpracovano === 'number') { davky.push(o.zpracovano - davky.reduce((a, b) => a + b, 0)); kandidatu = o.kandidatu; }
  if (!r.ok || o.ok === false) { const e = new Error(o.chyba || ('server odpověděl ' + r.status)); e.stav = r.status; throw e; }
  return o;
};
const M = G.CTRL_HROMADNY;
const f = G.ctrlHromadnyFiltr({ od: '2026-10-01', do: '2026-10-22' }).filtr;
const t0 = Date.now();
let vysl;
try { vysl = await G.ctrlHromadnyStahni(api, f); } catch (e) { vysl = { chyba: e.message }; }
const celkem = Date.now() - t0;
const cisla = (vysl.exporty || []).map(e => e.strany[0].cislo);
test('#504 objem: výchozí volby (prodej + vyhrané) — 1000 zakázek za 1.–22. 10. (1400 kandidátů s hrubým předvýběrem) doběhne celý, bez duplicit',
  !vysl.chyba && cisla.length === 1000 && new Set(cisla).size === 1000 && !(vysl.preskoceno || []).length,
  vysl.chyba || { n: cisla.length, presk: (vysl.preskoceno || []).length });
test('#504 objem (K7-W10): po dávkách, žádná dávka nečte víc než davkaMax zakázek (pod limitem funkce bez měření času)',
  casy.length > 1 && davky.length === casy.length && davky.every(n => n >= 1 && n <= M.davkaMax)
  && davky.reduce((a, b) => a + b, 0) === kandidatu && kandidatu >= 1000, { davek: casy.length, davky, kandidatu, celkem });
const prot = (JSON.parse(pamet.get('program/controlling_exporty') || '{}').zaznamy) || [];
test('#504 objem: protokol jeden záznam, dokončený, 1000 zakázek, výchozí filtr všechny (#540)',
  prot.length === 1 && prot[0].stav === 'hotovo' && prot[0].zakazek === 1000 && prot[0].pd === 'vse' && prot[0].podle === 'prodej'
  && prot[0].davek === casy.length, prot[0]);
console.log('dávek ' + casy.length + ', nejdelší ' + Math.max(...casy) + ' ms, celkem ' + celkem + ' ms');

/* #508 (E2, J. V. 23. 10. 2026: „Není možné stáhnout celou databázi … to bych potřeboval"):
 * celá databáze — dalších 3600 zakázek prodaných od dubna 2025 (celkem 5000 přes 400 dní),
 * výchozí volby (prodej, vyhrané) + Celá databáze. Před opravou 0 / 2 (filtr bez od/do
 * odmítl, období nad 400 dní taky), po opravě 2 / 2. */
for (let i = 1400; i < 5000; i++) {
  const cislo = '2026 - OPR - CN - ' + (10000 + i);
  const d = new Date(Date.UTC(2025, 3, 1) + ((i - 1400) % 540) * 86400000);
  const kdy = d.toISOString().slice(0, 10) + 'T09:00:00Z';
  const z = JSON.parse(tpl.split('2026 - OPR - CN - 9000').join(cislo).split('2026-10-01T09:00:00Z').join(kdy));
  z.objednane = { varianta: z.varianty[0].id, klice: [KLIC], datum: kdy.slice(0, 10) };
  const soubor = G.uloJmenoSouboru(z);
  pamet.set('zakazky/z/' + soubor, JSON.stringify(z));
  rej.push(G.uloRejstrikZaznam(z, { soubor, razitko: '2026-10-21T10:00:00Z' }));
}
pamet.set('zakazky/_rejstrik', JSON.stringify({ schema: 1, zakazky: rej }));
casy.length = 0; davky.length = 0;
const fV = G.ctrlHromadnyFiltr({ vse: '1' });
const t1 = Date.now();
let vyslV;
try { vyslV = await G.ctrlHromadnyStahni(api, fV.filtr); } catch (e) { vyslV = { chyba: e.message || (fV.chyba) }; }
const cislaV = (vyslV.exporty || []).map(e => e.strany[0].cislo);
test('#508 objem: celá databáze (5000 zakázek od dubna 2025, výchozí prodej + vyhrané) doběhne celá, bez duplicit, pod mezí dávek',
  fV.ok && !vyslV.chyba && cislaV.length === 5000 && new Set(cislaV).size === 5000 && casy.length < M.davek
  && davky.every(n => n >= 1 && n <= M.davkaMax),
  vyslV.chyba || fV.chyba || { n: cislaV.length, davek: casy.length, max: Math.max(...casy) });
const protV = (JSON.parse(pamet.get('program/controlling_exporty') || '{}').zaznamy) || [];
test('#508 objem: protokol celé databáze — jeden dokončený záznam s vse, 5000 zakázek',
  protV[0] && protV[0].vse === true && protV[0].stav === 'hotovo' && protV[0].zakazek === 5000 && protV.length === 2, protV[0]);
console.log('celá databáze: dávek ' + casy.length + ', nejdelší ' + Math.max(...casy) + ' ms, celkem ' + (Date.now() - t1) + ' ms');

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
if (fail) process.exit(1);
