/* ============================================================
 * SUCHÝ BĚH ZÁPISU DO PIPEDRIVE (#536, 27. 10. 2026)
 *
 * 1. Podklad ze zakázky (src/pd_nanecisto.js): krycí list ŘÍDÍCÍ varianty,
 *    jen vedoucí strana, cena jako v nabídce, ruční přepisy.
 * 2. /api/pd/nanecisto: práva (přihlášení, crm.pipedrive, původ), tvar
 *    vstupu, režim „dohoda" bez napojení a „simulator" s porovnáním dealu.
 * 3. Náhled slibuje přesně to, co by odeslal zápis: řádky „zapíše se" =
 *    custom_fields + hodnota dealu z pdZapisDealu.
 * 4. Nic se neodesílá: v simulátoru za celý běh jen GET.
 * 5. Kolize OCK × PROJ a „v CRM je dnes jiná hodnota"; CSV a název souboru.
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
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
    .map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
let venku = [];
globalThis.fetch = async (url) => { venku.push(String(url)); throw new Error('síť je v testu zakázaná: ' + url); };

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const { default: prihlaseni } = await import('./functions/prihlaseni.mjs');
const { default: uzivatele } = await import('./functions/uzivatele.mjs');
const { default: pdNanecistoFn, pdNanecistoStrana } = await import('./functions/pd_nanecisto.mjs');
const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');
const { POLE_DEALU, pdMapaZPoli, pdPoleDohodnuta } = await import('./lib/pd_mapa.mjs');
const { pdZapisDealu, pdNanecisto } = await import('./lib/pd_prevod.mjs');
const SIM = await import('./lib/pipedrive_simulator.mjs');
const { jadro } = await import('./lib/jadro.mjs');
await jadro();
const R = new URL('..', import.meta.url).pathname;
const require = createRequire(R + 'netlify/x.mjs');
for (const f of ['plan_plateb.js', 'nabidka_proj.js', 'pd_nanecisto.js']) Object.assign(globalThis, require(R + 'src/' + f));
const ZC = require(R + 'src/zkusebni_cenik.js');
const JEKLY = require(R + 'src/jekly.json');
const G = globalThis;

let ok = 0, fail = 0; const selhalo = [];
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; selhalo.push(n); console.log('FAIL ' + n, info === undefined ? '' : info); }
};
const J = (x) => JSON.stringify(x);
const post = (url, telo, cookie, hlavicky = {}) => pdNanecistoFn(new Request(url, { method: 'POST',
  headers: { ...(cookie ? { cookie } : {}), ...hlavicky }, body: typeof telo === 'string' ? telo : JSON.stringify(telo) }));
const URL_N = 'http://x/api/pd/nanecisto';

/* ---------- zakázka ---------- */
function zakazka(cislo) {
  const zak = G.novaZakazka();
  zak.cislo = cislo; zak.nazevAkce = 'Zkušební akce';
  const v = zak.varianty[0];
  v.data.cenik = ZC.zkusebniCenik(); v.data.proj.cenik = ZC.zkusebniCenikProj();
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2 });
  v.data.kryci = { hodnoty: { splatnostDni: '30', odchylky: 'Smyšlená odchylka od standardu',
    dodZpracoval: 'jan.vzorovy@priklad.cz' } };
  return zak;
}

console.log('\n===== PODKLAD ZE ZAKÁZKY =====\n');
const zak = zakazka('2026 - OPR - CN - 0901');
const p = G.pdnPodklad(zak, JEKLY);
test('podklad se složí, vedoucí strana OCK, PROJ se neposílá', p.ok && p.vedouci === 'ock' && !!p.strany.ock && !p.strany.proj, J(Object.keys(p.strany)));
test('hodnoty krycího listu: číslo nabídky a ruční přepis splatnosti',
  p.strany.ock.hodnoty.cisloCN === '2026 - OPR - CN - 0901' && p.strany.ock.hodnoty.splatnostDni === '30');
test('ruční přepisy jdou zvlášť (pole jen s ručním zadáním)', p.strany.ock.rucne.splatnostDni === '30');
test('cena OCK bez DPH z kalkulace, měna CZK', p.strany.ock.cena > 0 && p.strany.ock.mena === 'CZK', p.strany.ock.cena);
test('popisky zdroje: „Krycí list OCK › sekce › pole"', /^Krycí list OCK › .+ › Splatnost/.test(p.zdroje.ock.splatnostDni || ''), p.zdroje.ock.splatnostDni);
test('bez dealu v zakázce: dealId null', p.dealId === null);

/* Řídící varianta, ne otevřená. */
const zak2 = zakazka('2026 - OPR - CN - 0902');
const v2 = JSON.parse(J(zak2.varianty[0])); v2.id = 'v-druha'; v2.ridici = false; v2.data.kryci.hodnoty.splatnostDni = '45';
zak2.varianty.push(v2); zak2.aktivni = 'v-druha';
const p2 = G.pdnPodklad(zak2, JEKLY);
test('zapisuje se ŘÍDÍCÍ varianta, ne otevřená (a náhled to řekne)',
  p2.strany.ock.hodnoty.splatnostDni === '30' && p2.upozorneni.some(t => /ŘÍDÍCÍ/.test(t)), p2.upozorneni);
const zakProj = zakazka('');
zakProj.jenProj = true;
const pP = G.pdnPodklad(zakProj, JEKLY);
test('zakázka jen PROJ: posílá se jen PROJ', !!pP.strany.proj && !pP.strany.ock && pP.vedouci === 'proj');
const zakBez = zakazka('');
const pB = G.pdnPodklad(zakBez, JEKLY);
test('bez čísla nabídky: obě strany a upozornění', !!pB.strany.ock && !!pB.strany.proj
  && pB.upozorneni.some(t => /nemá číslo nabídky/.test(t)), pB.upozorneni);
test('bez zakázky: chyba, ne výjimka', G.pdnPodklad(null).ok === false);

console.log('\n===== PRÁVA A VSTUP =====\n');
const r1 = await prihlaseni(new Request('http://x/api/prihlaseni', { method: 'POST',
  body: J({ email: ADMIN_EMAIL, heslo: 'Docasne.Heslo.123' }) }));
const cAdmin = (r1.headers.get('set-cookie') || '').split(';')[0];
await uzivatele(new Request('http://x/api/uzivatele', { method: 'POST', headers: { cookie: cAdmin },
  body: J({ akce: 'zaloz', email: 'obchod.nanecisto@priklad.cz', jmeno: 'Obchodník', role: 'Obchodník', heslo: 'ObchodHeslo1' }) }));
const cObch = ((await prihlaseni(new Request('http://x/api/prihlaseni', { method: 'POST',
  body: J({ email: 'obchod.nanecisto@priklad.cz', heslo: 'ObchodHeslo1' }) }))).headers.get('set-cookie') || '').split(';')[0];
const telo = { strany: p.strany, zdroje: p.zdroje };

test('nepřihlášený → 401', (await post(URL_N, telo)).status === 401);
test('GET → 405', (await pdNanecistoFn(new Request(URL_N, { headers: { cookie: cObch } }))).status === 405);
{
  const r = await post(URL_N, telo, cObch, { origin: 'https://utocnik.example', host: 'kalkulator.example' });
  test('cizí původ se odmítne (POST z cizí stránky není přihlášený — B17)', [401, 403].includes(r.status), r.status);
  const r2 = await post(URL_N, telo, cObch, { origin: 'null' });
  test('Origin: null se odmítne (B159)', [401, 403].includes(r2.status), r2.status);
}
pamet.set('program/zobrazeni', J({ matice: { 'crm.pipedrive': { 'Obchodník': false, 'Vedoucí': true } } }));
test('obchodník bez práva crm.pipedrive → 403', (await post(URL_N, telo, cObch)).status === 403);
pamet.delete('program/zobrazeni');
test('neplatný JSON → 400', (await post(URL_N, '{nesmysl', cObch)).status === 400);
test('bez stran → 400', (await post(URL_N, { strany: {} }, cObch)).status === 400);
test('neplatné číslo dealu → 400', (await post(URL_N, { ...telo, dealId: '1; DROP' }, cObch)).status === 400);
test('příliš velký podklad → 413', (await post(URL_N, { strany: { ock: { hodnoty: { a: 'x'.repeat(600 * 1024) } } } }, cObch)).status === 413);
const ocisteno = pdNanecistoStrana({ hodnoty: { ok: '1', 'zlé id<script>': 'x', obj: { a: 1 } }, cena: 'tisíc', mena: 'korun', atyp: 'ano' });
test('vstup se očistí: jen známý tvar (id, texty, číslo ceny, kód měny)',
  J(ocisteno) === J({ hodnoty: { ok: '1' }, rucne: {} }), J(ocisteno));

console.log('\n===== REŽIM „DOHODA" (bez napojení) =====\n');
venku = [];
const o1 = await post(URL_N, telo, cObch);
const d1 = await o1.json();
test('bez napojení odpoví 200, režim dohoda, nic se neodeslalo', o1.status === 200 && d1.ok && d1.rezim === 'dohoda'
  && /nic neodeslalo/.test(d1.nic) && venku.length === 0, [o1.status, d1.rezim, venku]);
test('varování: dohodnutá tabulka, neověřeno v CRM', d1.varovani.some(t => /dohodnuté tabulce/.test(t)));
const radek = (d, klic) => d.radky.find(r => r.klic === klic) || {};
test('číslo nabídky se zapíše a zdroj ukazuje krycí list',
  radek(d1, 'cisloNabidky').stav === 'zapise' && radek(d1, 'cisloNabidky').hodnotaText === '2026 - OPR - CN - 0901'
  && /^OCK: Krycí list OCK/.test(radek(d1, 'cisloNabidky').zdroj), J(radek(d1, 'cisloNabidky')));
test('splatnost 30 dní z ručního přepisu', radek(d1, 'splatnostDni').hodnotaText === '30');
test('výběrové pole se ukáže textem volby (Typ smlouvy)', radek(d1, 'typSmlouvy').stav === 'zapise'
  && radek(d1, 'typSmlouvy').hodnotaText === 'Naše bez úprav', J(radek(d1, 'typSmlouvy')));
test('uživatel Pipedrive bez napojení: „dohledá zápis"', radek(d1, 'nabidkuVypracoval').stav === 'neovereno', J(radek(d1, 'nabidkuVypracoval')));
test('hodnota dealu = cena OCK bez DPH', radek(d1, 'hodnotaDealu').stav === 'zapise'
  && radek(d1, 'hodnotaDealu').hodnota.value === p.strany.ock.cena && radek(d1, 'hodnotaDealu').hodnota.currency === 'CZK');
test('pole jen PROJ se u zakázky OCK neukazují', !d1.radky.some(r => r.klic === 'hlavniProjektant' || r.klic === 'platebniKalendar'));
test('souhrn sedí na řádky', d1.souhrn.celkem === d1.radky.length
  && ['zapise', 'nelze', 'chybiPole', 'neovereno', 'prazdne'].reduce((a, k) => a + d1.souhrn[k], 0) === d1.radky.length);
test('bez dealu: varování „není s čím porovnat"', d1.varovani.some(t => /není s čím porovnat/.test(t)));

/* Náhled = zápis: řádky „zapíše se" jsou přesně to, co by odeslal pdZapisDealu. */
const poleDohoda = pdMapaZPoli(pdPoleDohodnuta({ vsechna: true }).deal, POLE_DEALU);
const stranyServer = { ock: pdNanecistoStrana(p.strany.ock) };
const zapis = pdZapisDealu(POLE_DEALU, stranyServer, poleDohoda, { mena: 'CZK' });
const zNahledu = Object.fromEntries(d1.radky.filter(r => r.stav === 'zapise' && r.klic !== 'hodnotaDealu')
  .map(r => [poleDohoda.mapa[r.klic], r.hodnota]));
test('řádky „zapíše se" = custom_fields ze zápisu (pdZapisDealu)', J(Object.entries(zNahledu).sort()) === J(Object.entries(zapis.custom_fields).sort()),
  [Object.keys(zNahledu).length, Object.keys(zapis.custom_fields).length]);
test('hodnota dealu v náhledu = deal ze zápisu', J(radek(d1, 'hodnotaDealu').hodnota) === J(zapis.deal));
test('důvody nepřevoditelných polí = duvody ze zápisu (mimo uživatele)',
  J(d1.radky.filter(r => r.stav === 'nelze').map(r => r.klic).sort())
  === J(zapis.duvody.filter(x => !/uživatel/.test(x.duvod)).map(x => x.klic).sort()),
  [d1.radky.filter(r => r.stav === 'nelze').map(r => r.klic), zapis.duvody.map(x => x.klic)]);

console.log('\n===== REŽIM SIMULÁTOR (porovnání s dealem) =====\n');
process.env.PIPEDRIVE_SIMULATOR = '1';
SIM.pdSimReset();
const deal = SIM.pdSimStav().data.dealy.find(d => d.id === 1002);
const o2 = await post(URL_N, { ...telo, dealId: 1002 }, cObch);
const d2 = await o2.json();
test('simulátor: režim simulator, deal načten', o2.status === 200 && d2.rezim === 'simulator' && d2.deal && d2.deal.id === 1002, [o2.status, d2.rezim, d2.chyba]);
test('simulátor: varování, že data jsou smyšlená', /SIMULÁTOR/.test(d2.varovani[0] || ''));
test('uživatel Pipedrive dohledán podle e-mailu', radek(d2, 'nabidkuVypracoval').stav === 'zapise'
  && radek(d2, 'nabidkuVypracoval').hodnotaText === 'Jan Vzorový', J(radek(d2, 'nabidkuVypracoval')));
test('kolize s CRM: splatnost 14 v dealu, kalkulace 30', radek(d2, 'splatnostDni').vCrm === '14'
  && radek(d2, 'splatnostDni').kolize.some(k => /v Pipedrive je dnes „14"/.test(k)), J(radek(d2, 'splatnostDni')));
test('stejná hodnota není kolize (první splátka 50 %)', radek(d2, 'zaloha1Proc').vCrm === '50'
  && radek(d2, 'zaloha1Proc').kolize.length === 0, J(radek(d2, 'zaloha1Proc')));
test('hodnota dealu: stará → nová jako kolize', radek(d2, 'hodnotaDealu').kolize.length === 1
  && radek(d2, 'hodnotaDealu').vCrm.replace(/\s/g, '').startsWith(String(deal.value)), J(radek(d2, 'hodnotaDealu')));
test('Platební kalendář (v CRM dosud chybí) se u OCK neukazuje', !d2.radky.some(r => r.klic === 'platebniKalendar'));
const zapisy = SIM.pdSimStav().pozadavky.filter(x => !/^GET /.test(x));
test('do simulátoru šly jen GET — nic se nezapsalo', zapisy.length === 0 && SIM.pdSimStav().pozadavky.length > 0, zapisy);
test('deal v simulátoru beze změny', J(SIM.pdSimStav().data.dealy.find(d => d.id === 1002)) === J(deal));
const o3 = await post(URL_N, { ...telo, dealId: 999999 }, cObch);
const d3 = await o3.json();
test('neznámý deal: náhled projde s varováním, bez porovnání', o3.status === 200 && d3.deal === null
  && d3.varovani.some(t => /999999 se z Pipedrive nenačetl/.test(t)), d3.varovani);
SIM.pdSimNastav({ scenar: 'token' });
pamet.delete('pipedrive/pole');   // mapa z cache by se do Pipedrive vůbec neptala
const o4 = await post(URL_N, telo, cObch);
test('odmítnutý token v simulátoru → 502 (ne 401)', o4.status === 502, o4.status);
SIM.pdSimNastav({ scenar: '' });
for (const k of [...pamet.keys()]) if (/^pd_cache\/strop:nanecisto:/.test(k)) pamet.set(k, J({ od: Date.now(), pocet: 999 }));
test('strop dotazů do CRM na uživatele → 429', (await post(URL_N, telo, cObch)).status === 429);
delete process.env.PIPEDRIVE_SIMULATOR;
test('do sítě za celý běh nešlo nic', venku.length === 0, venku);

console.log('\n===== KOLIZE OCK × PROJ (čistá logika) =====\n');
const def = POLE_DEALU.filter(d => d.klic === 'splatnostDni');
const k1 = pdNanecisto(def, { ock: { hodnoty: { splatnostDni: '14' } }, proj: { hodnoty: { splatnostDni: '30' } } }, poleDohoda);
test('OCK 14 × PROJ 30: zapíše se OCK a hlásí se kolize', k1.radky[0].hodnotaText === '14' && k1.radky[0].strana === 'ock'
  && /zapíše se hodnota OCK/.test(k1.radky[0].kolize[0] || ''), J(k1.radky[0]));
const k2 = pdNanecisto(def, { ock: { hodnoty: { splatnostDni: '14' } }, proj: { hodnoty: { splatnostDni: '14' } } }, poleDohoda);
test('shodné hodnoty: bez kolize', k2.radky[0].kolize.length === 0);
const k3 = pdNanecisto(def, { ock: { hodnoty: { splatnostDni: '' } }, proj: { hodnoty: { splatnostDni: '30' } } }, poleDohoda);
test('OCK prázdné: zapíše se PROJ', k3.radky[0].strana === 'proj' && k3.radky[0].hodnotaText === '30');
const k4 = pdNanecisto(def, { ock: { hodnoty: { splatnostDni: '14 nebo 30' } }, proj: { hodnoty: { splatnostDni: '30' } } }, poleDohoda);
test('OCK nepřevoditelné: PROJ ho NENAHRADÍ (jako zápis)', k4.radky[0].stav === 'nelze' && k4.radky[0].strana === 'ock');
const k5 = pdNanecisto(def, { ock: { hodnoty: {} } }, { mapa: {}, popisy: {} });
test('prázdné pole, které v CRM chybí: nevyplněno + důvod', k5.radky[0].stav === 'prazdne' && /chybí/.test(k5.radky[0].duvod));
const k6 = pdNanecisto(def, { ock: { hodnoty: { splatnostDni: '14' } } }, { mapa: {}, popisy: {} });
test('vyplněné pole, které v CRM chybí: „chybí pole v CRM"', k6.radky[0].stav === 'chybiPole');

console.log('\n===== CSV A NÁZEV SOUBORU =====\n');
const csv = G.pdnCsv({ radky: [{ nazev: 'Číslo nabídky (CN)', typ: 'varchar', hodnotaText: '=HYPERLINK("x")', zdroj: 'OCK: Krycí list', hodnotaKalkulace: '', stav: 'zapise', duvod: '', kolize: ['a', 'b'], vCrm: '' }],
  varovani: ['pozor'] }, { cislo: 'CN-1', rezim: 'dohoda', verze: 'v27.10.2' });
test('CSV: BOM, středník, hlavička a „nic se neodeslalo"', csv.startsWith('﻿') && csv.includes('"Pole v Pipedrive";"Typ pole"')
  && csv.includes('nic se neodeslalo'));
test('CSV: vzorec v buňce dostane apostrof (B83)', csv.includes('"\'=HYPERLINK(""x"")"'));
test('CSV: kolize v jedné buňce, upozornění na konci', csv.includes('"a | b"') && csv.includes('"Upozornění";"pozor"'));
test('název souboru TYP_rok-OBSAH_verze.přípona', G.pdnNazevSouboru({ cislo: '2026 - OPR - CN - 0901' }, 'v27.10.2', new Date(2026, 9, 27))
  === 'PIPEDRIVE_2026-OPR-CN-0901_v27.10.2.csv', G.pdnNazevSouboru({ cislo: '2026 - OPR - CN - 0901' }, 'v27.10.2', new Date(2026, 9, 27)));
test('název souboru bez čísla zakázky', G.pdnNazevSouboru({}, '', new Date(2026, 9, 27)) === 'PIPEDRIVE_2026-ZAKAZKA_v0.csv');

console.log('\n===== UI A SESTAVENÍ (statická kontrola) =====\n');
const src = (f) => readFileSync(R + f, 'utf8');
test('karta je v krycím listu OCK i PROJ', /pdnKarta\(\)/.test(src('src/ui/kryci_ui.js')) && /pdnKarta\(\)/.test(src('src/ui/kryci_proj_ui.js')));
test('build.py skládá model i UI', /'pd_nanecisto\.js'/.test(src('build.py')) && /'ui\/pd_nanecisto_ui\.js'/.test(src('build.py')));
const ui = src('src/ui/pd_nanecisto_ui.js');
test('UI volá jen /api/pd/nanecisto', J(ui.match(/\/api\/[a-z/_]+/g)) === J(['/api/pd/nanecisto']), ui.match(/\/api\/[a-z/_]+/g));
test('karta jen s právem crm.pipedrive', /smiZobrazit\('crm\.pipedrive'\)/.test(ui));
const fn = src('netlify/functions/pd_nanecisto.mjs').replace(/\/\*[\s\S]*?\*\//g, '');
test('funkce nezapisuje do Pipedrive (žádné PATCH/POST/PUT/DELETE v pdZavolej)', !/metoda\s*:/.test(fn), (fn.match(/metoda\s*:[^,}]+/g) || []));

console.log(`\n${ok} prošlo, ${fail} selhalo`);
if (fail) console.log('\nSelhalo:\n - ' + selhalo.join('\n - '));
process.exit(fail ? 1 : 0);
