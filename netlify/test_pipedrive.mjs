/* ============================================================
 * ČTECÍ ČÁST NAPOJENÍ NA PIPEDRIVE (9. 8. 2026, #16)
 *
 * Testuje se proti NÁHRADNÍMU `fetch`, ne proti skutečnému Pipedrive.
 * Důvody jsou tři: sada musí běžet i bez tokenu (a token v repozitáři není),
 * skutečné volání by ujídalo denní rozpočet tokenů, a hlavně — chceme umět
 * vyrobit situace, které se na živém účtu vyrábějí špatně: vyčerpaný limit,
 * spadlou síť, přejmenované pole, deal bez organizace.
 *
 * Náhradní `fetch` si pamatuje, na co se ptalo. Díky tomu jde ověřit i to,
 * co by jinak bylo nevidět: že se mapa polí opravdu cachuje a že se token
 * posílá v hlavičce, ne v adrese (v adrese by se zapsal do logů proxy).
 * ============================================================ */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';

const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
    .map(x => x.slice(nazev.length + 1)); },
});

import prihlaseni from './functions/prihlaseni.mjs';
import uzivatele from './functions/uzivatele.mjs';
import pdPole from './functions/pd_pole.mjs';
import pdDealy from './functions/pd_dealy.mjs';
import pdDeal from './functions/pd_deal.mjs';
import { ADMIN_EMAIL } from './lib/sdilene.mjs';
import { pdCisloZNazvu, pdNazevAkce, pdMapaZPoli, pdHodnota, pdZbytekDoSta, pdIco,
         pdDealNaNase, POLE_DEALU, POLE_ORGANIZACE } from './lib/pd_mapa.mjs';
import { pdZaklad, pdOdkazNaDeal, PD_TOKEN_PROMENNA, PD_DOMENA_PROMENNA } from './lib/pipedrive.mjs';

let ok = 0, fail = 0; const selhalo = [];
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; selhalo.push(n); console.log('FAIL ' + n, info === undefined ? '' : info); }
};
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST',
  headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));

/* ---------- náhradní Pipedrive ---------- */

/* Definice polí ve tvaru API v2 (field_code / field_name / field_type /
 * is_custom_field) se SKUTEČNÝMI názvy z tabulky dohodnuté s integrátorem
 * (Pipedrive_nova_pole_dealu, revize J. V. 14. 10. 2026); hashe jsou
 * smyšlené. Do 21. 10. 2026 tu stály vymyšlené názvy („Záloha %", „Adresa
 * stavby") a testy procházely, zatímco párování na skutečném účtu tři pole
 * spletlo a čtyři nenašlo. Pasti (`zadrzneZaruka`, `limit`, `podpisFirma`)
 * jsou skutečná pole, jejichž názvy obsahují slova, podle kterých se dřív
 * párovalo — a stojí napřed, protože dřív vyhrával první a nejkratší. */
const h = (n) => n.toString(16).padStart(2, '0').repeat(20);
const HASH = {
  splatnost: h(1), zaloha: h(2), faktura2: h(3), adresa: h(4), termin: h(5), typ: h(6),
  firma: h(7), osoba: h(8), zaruka: h(9), pokuta: h(10), zadrzne: h(11), neznamé: h(12),
  ico: h(13), typOrg: h(14), treti: h(15),
  zadrzneZaruka: h(16), limit: h(17), podpisFirma: h(18),
};
const V2 = (field_code, field_name, field_type, options) =>
  ({ field_code, field_name, field_type, is_custom_field: true, is_writable: true, options: options || null });

const POLE_ODPOVED = [
  V2(HASH.zadrzneZaruka, 'Zádržné – po dobu záruky', 'enum', [{ id: 81, label: 'Ne' }, { id: 82, label: '5%' }]),
  V2(HASH.limit, 'Limit smluvních pokut (%)', 'double'),
  V2(HASH.podpisFirma, 'Podepisující firma (pokud jiná)', 'org'),
  V2(HASH.splatnost, 'Splatnost faktur (dny)', 'double'),
  V2(HASH.zaloha, 'První splátka (%)', 'double'),
  V2(HASH.faktura2, 'Druhá splátka (%)', 'double'),
  V2(HASH.treti, 'Třetí splátka (%)', 'double'),
  V2(HASH.adresa, 'Adresa realizace', 'text'),
  V2(HASH.termin, 'Předpokládané datum ukončení realizace', 'date'),
  V2(HASH.typ, 'Typ zakázky', 'enum', [{ id: 54, label: 'Projekce - Výtah + OCK' }, { id: 55, label: 'Realizace' }]),
  V2(HASH.firma, 'Zdroj poptávky - Organizace', 'org'),
  V2(HASH.osoba, 'Zdroj poptávky - Osoba', 'people'),
  V2(HASH.zaruka, 'Doba trvání záruky (počet měsíců)', 'double'),
  V2(HASH.pokuta, 'Smluvní pokuta – prodlení dodávky / odevzdání (% / den)', 'double'),
  V2(HASH.zadrzne, 'Zádržné – do odstranění VaN', 'enum', [{ id: 71, label: 'Ne' }, { id: 73, label: '10%' }]),
  V2(HASH.neznamé, 'Interní příznak XYZ', 'varchar'),
  { field_code: 'title', field_name: 'Název', field_type: 'varchar', is_custom_field: false, is_writable: true },
];

const POLE_ORG_ODPOVED = [
  V2(HASH.ico, 'IČ', 'double'),
  V2(HASH.typOrg, 'Role', 'enum', [{ id: 1, label: 'Výtahová společnost' }]),
];

const DEAL = (id, nazev, extra = {}) => ({
  id, title: nazev, value: 487500, currency: 'CZK', status: 'open',
  stage_id: 23, org_id: 900, person_id: 800, update_time: '2026-08-01T10:00:00Z',
  custom_fields: {
    [HASH.splatnost]: 14, [HASH.zaloha]: 50, [HASH.faktura2]: 40,
    [HASH.adresa]: 'Zkušební 12, Zkušebín', [HASH.termin]: '2027-03-31',
    [HASH.typ]: { id: 54, label: 'Projekce - Výtah + OCK' },
    [HASH.firma]: 901, [HASH.osoba]: 801,
    [HASH.zaruka]: 60, [HASH.pokuta]: 0, [HASH.zadrzne]: { id: 73, label: '10%' },
    /* pasti: kdyby se spárovaly místo správných polí, krycí list dostane tohle */
    [HASH.zadrzneZaruka]: { id: 81, label: 'Ne' }, [HASH.limit]: 10, [HASH.podpisFirma]: 902,
    ...extra,
  },
});

const DEALY = [
  DEAL(1, 'CN-84 Zkušební ulice 1, Zkušebín'),
  /* bez první splátky, zato s třetí: dopočet by dal prázdno, CRM říká 10 */
  DEAL(2, 'CN-85 Náměstí Bořivojovo 3', { [HASH.zaloha]: null, [HASH.treti]: 10 }),
  { ...DEAL(3, 'OPR12-2025 Oprava zkušební'), status: 'won' },
  { ...DEAL(4, 'Bez čísla — jen popis'), status: 'lost' },
];

const ORGANIZACE = {
  900: { id: 900, name: 'Investor zkušební a.s.', custom_fields: { [HASH.ico]: 11111111 } },
  901: { id: 901, name: 'Výtahy Zkušební s.r.o.', custom_fields: { [HASH.ico]: 12345678 } },
  902: { id: 902, name: 'Podepisující jiná s.r.o.', custom_fields: { [HASH.ico]: 87654321 } },
  /* IČ je v účtu číselné pole: 00064581 drží Pipedrive jako 64581 */
  903: { id: 903, name: 'Nulová zkušební a.s.', custom_fields: { [HASH.ico]: 64581 } },
};
const OSOBY = {
  800: { id: 800, first_name: 'Jan', last_name: 'Investorský', emails: [], phones: [] },
  801: { id: 801, first_name: 'Jan', last_name: 'Zkušební',
    emails: [{ value: 'jan.zkusebni@priklad.cz' }], phones: [{ value: '+420 602 000 000' }] },
};

let volani = [];
let rezim = 'normal';           /* normal | limit | spadlo | token */
let limitZbyva = 0;

globalThis.fetch = async (url, init) => {
  volani.push({ url: String(url), init });
  const u = new URL(String(url));
  const odpoved = (data, stav = 200, telo) => new Response(
    JSON.stringify(telo || { success: stav < 400, data }),
    { status: stav, headers: { 'Content-Type': 'application/json' } });

  if (rezim === 'spadlo') throw new Error('ECONNREFUSED');
  if (rezim === 'token') return odpoved(null, 401, { success: false, error: 'unauthorized access' });
  if (rezim === 'limit' && limitZbyva > 0) { limitZbyva--; return odpoved(null, 429, { success: false }); }

  if (u.pathname === '/api/v2/dealFields') return odpoved(POLE_ODPOVED);
  if (u.pathname === '/api/v2/organizationFields') return odpoved(POLE_ORG_ODPOVED);
  if (u.pathname === '/api/v2/deals') {
    const stav = u.searchParams.get('status');
    const vybrane = stav ? DEALY.filter(d => d.status === stav) : DEALY;
    return odpoved(vybrane, 200, { success: true, data: vybrane, additional_data: { next_cursor: null } });
  }
  const md = /^\/api\/v2\/deals\/(\d+)$/.exec(u.pathname);
  if (md) { const d = DEALY.find(x => x.id === Number(md[1])); return d ? odpoved(d) : odpoved(null, 404); }
  const mo = /^\/api\/v2\/organizations\/(\d+)$/.exec(u.pathname);
  if (mo) { const o = ORGANIZACE[mo[1]]; return o ? odpoved(o) : odpoved(null, 404); }
  const mp = /^\/api\/v2\/persons\/(\d+)$/.exec(u.pathname);
  if (mp) { const p = OSOBY[mp[1]]; return p ? odpoved(p) : odpoved(null, 404); }
  return odpoved(null, 404);
};

/* ---------- čisté funkce ---------- */

console.log('\n===== PŘEKLAD NÁZVŮ A HODNOT =====\n');

test('číslo nabídky se vyčte z názvu dealu', pdCisloZNazvu('CN-84 Zkušební 1') === 'CN-84');
test('poznají se i opravy (OPR)', pdCisloZNazvu('OPR12-2025 Oprava') === 'OPR-12-2025');
test('název bez čísla nevrací vymyšlené číslo', pdCisloZNazvu('Jen popis') === '');
test('název akce je zbytek za číslem', pdNazevAkce('CN-84 Zkušební 1') === 'Zkušební 1');
test('název bez čísla zůstane celý', pdNazevAkce('Jen popis') === 'Jen popis');

test('hodnota výběrového pole se čte jako popiska',
  pdHodnota({ id: 54, label: 'Realizace' }) === 'Realizace');
test('peněžní pole se čte jako částka', pdHodnota({ value: 2300, currency: 'EUR' }) === '2300');
test('adresní pole se čte jako celá adresa',
  pdHodnota({ value: 'x', formatted_address: 'Zkušební 12, Zkušebín' }) === 'Zkušební 12, Zkušebín');
test('vícevýběr se spojí čárkou',
  pdHodnota([{ label: 'A' }, { label: 'B' }]) === 'A, B');
test('prázdná hodnota nedělá „null" v dokumentu', pdHodnota(null) === '' && pdHodnota(undefined) === '');

test('konečná faktura se dopočítá do sta procent', pdZbytekDoSta(50, 40) === '10');
test('nesmyslné zálohy konečnou fakturu radši nevrátí', pdZbytekDoSta(80, 40) === '');
test('chybějící údaj konečnou fakturu nevymyslí', pdZbytekDoSta('', 40) === '');

console.log('\n===== MAPA POLÍ PODLE NÁZVU =====\n');

const m = pdMapaZPoli(POLE_ODPOVED, POLE_DEALU);
test('splatnost se spáruje', m.mapa.splatnostDni === HASH.splatnost);
test('záloha se spáruje', m.mapa.zaloha1Proc === HASH.zaloha);
test('dílčí faktura se nespletla se zálohou', m.mapa.faktura2Proc === HASH.faktura2);
test('adresa stavby se spáruje', m.mapa.adresaStavby === HASH.adresa);
test('termín se spáruje', m.mapa.terminPlneni === HASH.termin);
test('zdroj poptávky (organizace i osoba) se spáruje',
  m.mapa.zdrojFirma === HASH.firma && m.mapa.zdrojOsoba === HASH.osoba);
/* Pravidlo J. V. 21. 10. 2026: do Pipedrive se přenáší, co je v kalkulačce.
 * Každé pole má jednoho vlastníka — obousměrné pole by znamenalo, že se
 * hodnota kalkulace dá z CRM přepsat a příští zápis ji zase přepíše zpět. */
test('#114: každé pole má jediného vlastníka (nic obousměrně)',
  POLE_DEALU.every(d => ['cteni', 'zapis', 'nic'].includes(d.smer)),
  POLE_DEALU.filter(d => !['cteni', 'zapis', 'nic'].includes(d.smer)).map(d => d.klic).join(', '));
test('jedno pole se nepoužije dvakrát',
  new Set(Object.values(m.mapa)).size === Object.values(m.mapa).length,
  JSON.stringify(m.mapa));
test('standardní (nevlastní) pole se do mapy nedostanou',
  !Object.values(m.mapa).includes('title'));
test('co se nespárovalo, se nezahodí, ale vypíše',
  m.nezarazeno.some(x => x.hash === HASH.neznamé), JSON.stringify(m.nezarazeno));
/* Kdyby se pole v CRM přejmenovalo, mapa musí říct, že chybí — jinak by
 * kalkulačka tiše vracela prázdno a nikdo by nevěděl proč. */
const mBezAdresy = pdMapaZPoli(POLE_ODPOVED.filter(p => p.field_code !== HASH.adresa), POLE_DEALU);
test('přejmenované (chybějící) pole se ohlásí jako chybějící',
  mBezAdresy.chybi.some(x => x.klic === 'adresaStavby'));
test('chybějící pole nese přesný název, pod kterým se hledalo',
  mBezAdresy.chybi.some(x => x.klic === 'adresaStavby' && x.nazev === 'Adresa realizace'),
  JSON.stringify(mBezAdresy.chybi.find(x => x.klic === 'adresaStavby')));

/* #114 (21. 10. 2026): párování podle přesného názvu. Na skutečném účtu by
 * párování podle vzorů spojilo dobu záruky se „Zádržné – po dobu záruky",
 * pokutu za den s „Limit smluvních pokut (%)" a objednatele s „Podepisující
 * firma (pokud jiná)". */
test('#114: doba záruky se nespáruje se zádržným po dobu záruky',
  m.mapa.zarukaMesicu === HASH.zaruka && m.mapa.zadrzneZaruka === HASH.zadrzneZaruka, JSON.stringify(m.mapa));
test('#114: pokuta za den se nespáruje s limitem smluvních pokut',
  m.mapa.pokutaProcDen === HASH.pokuta && m.mapa.pokutaLimit === HASH.limit);
test('#114: zdroj poptávky se nespáruje s podepisující firmou',
  m.mapa.zdrojFirma === HASH.firma && m.mapa.podpisFirma === HASH.podpisFirma);
test('#114: první, druhá i třetí splátka se spárují každá zvlášť',
  m.mapa.zaloha1Proc === HASH.zaloha && m.mapa.faktura2Proc === HASH.faktura2 && m.mapa.fakturaKoncProc === HASH.treti);
test('#114: pořadí polí v odpovědi CRM nerozhoduje',
  JSON.stringify(pdMapaZPoli(POLE_ODPOVED.slice().reverse(), POLE_DEALU).mapa) === JSON.stringify(m.mapa));
const mJinak = pdMapaZPoli(POLE_ODPOVED.map(p => p.field_code === HASH.pokuta
  ? { ...p, field_name: '  smluvní pokuta - prodlení dodávky /  odevzdání (% / den) ' } : p), POLE_DEALU);
test('#114: velikost písmen, mezery a druh pomlčky nerozhodují', mJinak.mapa.pokutaProcDen === HASH.pokuta);
const mBezDiakritiky = pdMapaZPoli(POLE_ODPOVED.map(p => p.field_code === HASH.typ
  ? { ...p, field_name: 'Typ zakazky' } : p), POLE_DEALU);
test('#114: diakritika rozhoduje (jiný název = jiné pole)',
  !mBezDiakritiky.mapa.typZakazky && mBezDiakritiky.chybi.some(x => x.klic === 'typZakazky'));
/* Název sedí, typ ne: výběr místo čísla by zápis buď odmítl, nebo — hůř —
 * zapsal do jiné volby. Do mapy se proto nedostane a ohlásí se. */
const mTyp = pdMapaZPoli(POLE_ODPOVED.map(p => p.field_code === HASH.zaruka
  ? { ...p, field_type: 'enum' } : p), POLE_DEALU);
test('#114: pole se správným názvem a jiným typem se nespáruje',
  !mTyp.mapa.zarukaMesicu && mTyp.typNesedi.some(x => x.klic === 'zarukaMesicu' && x.je === 'enum'),
  JSON.stringify(mTyp.typNesedi));
const mDvakrat = pdMapaZPoli(POLE_ODPOVED.concat([V2(h(99), 'Splatnost faktur (dny)', 'double')]), POLE_DEALU);
test('#114: dvě pole stejného názvu se nespárují, ale ohlásí',
  !mDvakrat.mapa.splatnostDni && mDvakrat.nejednoznacne.some(x => x.klic === 'splatnostDni' && x.pocet === 2),
  JSON.stringify(mDvakrat.nejednoznacne));
test('#114: starší tvar odpovědi (key / name) se přečte taky',
  pdMapaZPoli([{ key: HASH.splatnost, name: 'Splatnost faktur (dny)', field_type: 'double', edit_flag: true }],
    POLE_DEALU).mapa.splatnostDni === HASH.splatnost);
test('#114: každé pole Pipedrive je v mapě jen jednou (název i klíč)',
  new Set(POLE_DEALU.map(d => String(d.nazev || '').toLowerCase())).size === POLE_DEALU.length
  && new Set(POLE_DEALU.map(d => d.klic)).size === POLE_DEALU.length);

const mo2 = pdMapaZPoli(POLE_ORG_ODPOVED, POLE_ORGANIZACE);
test('IČO se najde mezi poli organizace (pole „IČ")', mo2.mapa.ico === HASH.ico);
test('#114: IČ s nulami na začátku se doplní na osm číslic',
  pdIco(64581) === '00064581' && pdIco('12345678') === '12345678' && pdIco(12345678) === '12345678');
test('#114: IČO, které číslem není, se nepřepisuje', pdIco('CZ12345678') === 'CZ12345678' && pdIco(null) === '');
test('#114: IČO delší než osm číslic se nezkracuje', pdIco(123456789) === '123456789');
test('#114: v detailu organizace se IČ doplní nulami',
  pdDealNaNase(DEALY[0], m.mapa, { organizace: ORGANIZACE[903], mapaOrganizace: mo2.mapa }).ico === '00064581');

const prelozeny = pdDealNaNase(DEALY[0], m.mapa,
  { organizace: ORGANIZACE[901], osoba: OSOBY[801], mapaOrganizace: mo2.mapa });
test('zákazník se vezme z organizace', prelozeny.objednatel === 'Výtahy Zkušební s.r.o.');
test('IČO se přenese z organizace', prelozeny.ico === '12345678');
test('kontakt nese e-mail i telefon',
  prelozeny.kontaktObjednatel === 'jan.zkusebni@priklad.cz, +420 602 000 000');
test('typ zakázky se přeloží na popisku', prelozeny.typZakazky === 'Projekce - Výtah + OCK');
/* Cena z CRM se smí zobrazit k porovnání, ale nesmí se tvářit jako výsledek
 * kalkulace — pravidlo projektu: částky vznikají výhradně z výpočtu. */
test('cena z CRM je vedená zvlášť jako informativní',
  prelozeny.hodnotaCrm === 487500 && prelozeny.cena === undefined);

/* ---------- serverové funkce ---------- */

console.log('\n===== BEZ NASTAVENÉHO NAPOJENÍ =====\n');

delete process.env[PD_TOKEN_PROMENNA];
delete process.env[PD_DOMENA_PROMENNA];

const cAdmin = (await (async () => {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni',
    { email: ADMIN_EMAIL, heslo: 'Docasne.Heslo.123' });
  return (r.headers.get('set-cookie') || '').split(';')[0];
})());
await post(uzivatele, 'http://x/api/uzivatele',
  { akce: 'zaloz', email: 'obchod@example.com', jmeno: 'Obchodník',
    role: 'Obchodník', heslo: 'ObchodHeslo1' }, cAdmin);
const cObch = (await post(prihlaseni, 'http://x/api/prihlaseni',
  { email: 'obchod@example.com', heslo: 'ObchodHeslo1' })).headers.get('set-cookie').split(';')[0];
/* B80 (15. 10. 2026): čtení z Pipedrive jen s právem `crm.pipedrive` z matice
 * zobrazení — výchozí matice ho dává všem (rozhodnutí J. V. 15. 10. 2026),
 * takže obchodník čte bez zásahu. Co se stane bez práva, hlídá
 * netlify/test_pd_pristup.mjs. */

test('seznam dealů bez přihlášení neprojde',
  (await get(pdDealy, 'http://x/api/pd/dealy')).status === 401);
test('detail dealu bez přihlášení neprojde',
  (await get(pdDeal, 'http://x/api/pd/deal?id=1')).status === 401);
test('mapa polí bez přihlášení neprojde',
  (await get(pdPole, 'http://x/api/pd/pole')).status === 401);

const bezNastaveni = await (await get(pdDealy, 'http://x/api/pd/dealy', cObch)).json();
test('bez tokenu se aplikace nerozbije, jen řekne, že napojení není',
  bezNastaveni.ok === true && bezNastaveni.nastaveno === false
  && Array.isArray(bezNastaveni.dealy) && bezNastaveni.dealy.length === 0);
test('a nevolá se přitom nikam ven', volani.length === 0, volani.length);

console.log('\n===== ČTENÍ Z PIPEDRIVE =====\n');

process.env[PD_TOKEN_PROMENNA] = 'zkusebni-token-jen-pro-test';
process.env[PD_DOMENA_PROMENNA] = 'zkusebni-firma';
volani = [];

test('doména se srovná i když ji někdo zadá celou',
  pdZaklad() === 'https://zkusebni-firma.pipedrive.com');
process.env[PD_DOMENA_PROMENNA] = 'https://zkusebni-firma.pipedrive.com/';
test('a i s protokolem a lomítkem na konci',
  pdZaklad() === 'https://zkusebni-firma.pipedrive.com');
test('odkaz na deal míří do webového Pipedrivu',
  pdOdkazNaDeal(84) === 'https://zkusebni-firma.pipedrive.com/deal/84');

const seznam = await (await get(pdDealy, 'http://x/api/pd/dealy', cObch)).json();
test('seznam vrátí otevřené případy', seznam.ok && seznam.dealy.length === 2, seznam.dealy && seznam.dealy.length);
test('případy nesou vyčtené číslo nabídky',
  seznam.dealy.every(d => /^CN-\d+$/.test(d.cislo)), JSON.stringify(seznam.dealy.map(d => d.cislo)));
test('seznam neveze vlastní pole (zbytečný objem)',
  !JSON.stringify(seznam.dealy).includes('Zkušební 12'));

const hledani = await (await get(pdDealy,
  'http://x/api/pd/dealy?hledat=borivojovo&stav=vse', cObch)).json();
test('hledání funguje i bez diakritiky', hledani.dealy.length === 1
  && hledani.dealy[0].cislo === 'CN-85', JSON.stringify(hledani.dealy));
const dleCisla = await (await get(pdDealy, 'http://x/api/pd/dealy?hledat=CN-84', cObch)).json();
test('hledat jde i podle čísla nabídky', dleCisla.dealy.length === 1);
const vse = await (await get(pdDealy, 'http://x/api/pd/dealy?stav=vse', cObch)).json();
test('otevřené případy se nabízejí jako první',
  vse.dealy[0].stav === 'open' && vse.dealy[vse.dealy.length - 1].stav === 'lost',
  vse.dealy.map(d => d.stav).join(','));

console.log('\n===== DETAIL PRO HLAVIČKU A KRYCÍ LIST =====\n');

const detail = await (await get(pdDeal, 'http://x/api/pd/deal?id=1', cObch)).json();
test('detail se načte', detail.ok === true, JSON.stringify(detail).slice(0, 200));
test('hlavička dostane číslo nabídky', detail.deal.cislo === 'CN-84');
test('hlavička dostane název akce', detail.deal.nazevAkce === 'Zkušební ulice 1, Zkušebín');
test('hlavička dostane adresu realizace', detail.deal.adresa === 'Zkušební 12, Zkušebín');
/* Zákazník = organizace a osoba DEALU (J. V. 21. 10. 2026). „Zdroj poptávky"
 * je ten, kdo poptávku přinesl, a nebývá vždy výtahová firma — do 21. 10.
 * tu měl přednost a na nabídce by u projekce stála výtahovka místo investora. */
test('#114: zákazníkem je organizace dealu, ne zdroj poptávky',
  detail.deal.objednatel === 'Investor zkušební a.s.' && detail.deal.ico === '11111111',
  detail.deal.objednatel + ' / ' + detail.deal.ico);
test('#114: kontaktem je osoba dealu, ne osoba zdroje poptávky',
  detail.deal.kontakt === 'Jan Investorský', detail.deal.kontakt);
test('typ zakázky se přečte jako popiska', detail.deal.typZakazky === 'Projekce - Výtah + OCK', detail.deal.typZakazky);
/* Podmínky krycího listu vlastní kalkulace: do Pipedrive se zapisují, zpátky
 * se nečtou — jinak by nová kalkulace převzala hodnoty, které do CRM kdysi
 * někdo napsal ručně, a příští zápis by je vydával za výsledek kalkulace. */
test('#114: podmínky krycího listu se z CRM nečtou',
  ['splatnostDni', 'zaloha1Proc', 'faktura2Proc', 'fakturaKoncProc', 'zarukaMesicu', 'pokutaProcDen', 'zadrzne']
    .every(k => !(k in detail.deal)), Object.keys(detail.deal).join(', '));
/* Předpokládané ukončení realizace vyplňují obchodníci v Pipedrive (u všech
 * vyhraných dealů) — čte se a předvyplní Konečné předání díla. */
test('#114: předpokládané ukončení realizace se čte z Pipedrive',
  detail.deal.terminPlneni === '2027-03-31', detail.deal.terminPlneni);
/* Fixture má z 66 polí mapy jen část — všechna pole, která detail čte, ale
 * ne pole pro zápis. Obchodník nemá při načítání slyšet o polích, která
 * načítání nepotřebuje. */
test('#114: chybějící pole pro zápis se při načítání nehlásí',
  !detail.varovani.some(v => /najít pole/.test(v)) && detail.chybiPole.length === 0,
  JSON.stringify(detail.varovani));
test('krycí list dostane odkaz do Pipedrivu (pole Scoring)',
  detail.deal.odkaz === 'https://zkusebni-firma.pipedrive.com/deal/1');
test('odpověď nikde neveze přístupový token',
  !JSON.stringify(detail).includes(process.env[PD_TOKEN_PROMENNA]));

const bezCisla = await (await get(pdDeal, 'http://x/api/pd/deal?id=4', cObch)).json();
test('případ bez čísla v názvu se načte, ale řekne o tom',
  bezCisla.ok && bezCisla.deal.cislo === '' && bezCisla.varovani.some(v => /číslo nabídky/i.test(v)),
  JSON.stringify(bezCisla.varovani));
test('neznámý případ vrátí 404, ne prázdno',
  (await get(pdDeal, 'http://x/api/pd/deal?id=999', cObch)).status === 404);
test('dotaz bez čísla případu se odmítne',
  (await get(pdDeal, 'http://x/api/pd/deal', cObch)).status === 400);

console.log('\n===== ŠETŘENÍ ROZPOČTU A CHOVÁNÍ PŘI POTÍŽÍCH =====\n');

const naPole = () => volani.filter(v => /Fields/.test(v.url)).length;
const pred = naPole();
await get(pdDeal, 'http://x/api/pd/deal?id=2', cObch);
await get(pdDeal, 'http://x/api/pd/deal?id=2', cObch);
test('mapa polí se cachuje (další načtení už do CRM nechodí)', naPole() === pred, naPole() - pred);

/* Mapa uložená před 21. 10. 2026 (bez `verze`) párovala podle vzorů — po
 * nasazení se nesmí použít, ani když ještě neuplynul den její platnosti. */
const mapaPredOpravou = { poridano: Date.now(), mapa: { adresaStavby: HASH.podpisFirma, typZakazky: HASH.zadrzneZaruka },
  popisy: {}, chybi: [], nezarazeno: [], mapaOrganizace: {} };
pamet.set('pipedrive/pole', JSON.stringify(mapaPredOpravou));
const predStara = naPole();
const detail3 = await (await get(pdDeal, 'http://x/api/pd/deal?id=3', cObch)).json();
test('#114: mapa ve starém tvaru se zahodí a načte znovu', naPole() > predStara, naPole() - predStara);
test('#114: a detail pak čte správná pole',
  detail3.deal.adresa === 'Zkušební 12, Zkušebín' && detail3.deal.typZakazky === 'Projekce - Výtah + OCK',
  JSON.stringify(detail3.deal));

test('obnovit mapu polí smí jen administrátor',
  (await get(pdPole, 'http://x/api/pd/pole?obnovit=1', cObch)).status === 403);
const predAdmin = naPole();
await get(pdPole, 'http://x/api/pd/pole?obnovit=1', cAdmin);
test('administrátor si vynucené obnovení vyžádá', naPole() > predAdmin);

test('token jde v hlavičce, ne v adrese (adresa se zapisuje do logů)',
  volani.every(v => !v.url.includes(process.env[PD_TOKEN_PROMENNA]))
  && volani.every(v => (v.init.headers || {})['x-api-token'] === process.env[PD_TOKEN_PROMENNA]));
test('dealy se čtou přes API v2 (v1 je od 1. 8. 2026 bez podpory)',
  volani.filter(v => /\/deals/.test(v.url)).every(v => /\/api\/v2\//.test(v.url)));

rezim = 'limit'; limitZbyva = 2; volani = [];
const poLimitu = await (await get(pdDealy, 'http://x/api/pd/dealy?stav=won', cObch)).json();
test('vyčerpaný limit se přečká opakováním, ne chybou', poLimitu.ok === true, JSON.stringify(poLimitu).slice(0, 120));
test('a opakovalo se opravdu (tři volání na jeden dotaz)', volani.length === 3, volani.length);
volani = [];
await get(pdDealy, 'http://x/api/pd/dealy?stav=won', cObch);
test('B19: opakované volání téhož seznamu jde z cache, ne do Pipedrive', volani.length === 0, volani.length);

/* B27 (23. 8. 2026): neplatný stav se odmítne (400), nejde do Pipedrive ani
 * nezaloží nový klíč cache — jinak by ?stav=x1,x2… obešlo cache a vyčerpalo
 * denní rozpočet. */
volani = [];
const spatnyStav = await get(pdDealy, 'http://x/api/pd/dealy?stav=cokoli-jineho', cObch);
test('B27: neplatný stav vrátí 400', spatnyStav.status === 400, spatnyStav.status);
test('B27: neplatný stav nešel do Pipedrive', volani.length === 0, volani.length);
test('B27: neplatný stav nezaložil klíč cache',
  ![...pamet.keys()].some(k => k.startsWith('pd_cache/') && k.includes('cokoli')));

rezim = 'limit'; limitZbyva = 99;
/* Seznam dealů se od 22. 8. 2026 (B19) drží 90 s v cache `pd_cache` —
 * pro zkoušku chybové cesty se cache vyprázdní, jinak by odpověděla místo
 * Pipedrive (což je v provozu přesně žádoucí chování). */
for (const k of [...pamet.keys()]) if (k.startsWith('pd_cache/')) pamet.delete(k);
const porad = await (await get(pdDealy, 'http://x/api/pd/dealy?stav=won', cObch)).json();
test('trvale vyčerpaný limit skončí srozumitelnou hláškou, ne prázdným seznamem',
  porad.ok === false && /limit/i.test(porad.chyba), JSON.stringify(porad));

rezim = 'spadlo';
const spadlo = await get(pdDealy, 'http://x/api/pd/dealy?stav=lost', cObch);
const spadloTelo = await spadlo.json();
test('spadlé spojení se nesmí tvářit jako prázdný Pipedrive',
  spadloTelo.ok === false && spadlo.status === 502, JSON.stringify(spadloTelo));

rezim = 'token';
const spatnyToken = await (await get(pdDealy, 'http://x/api/pd/dealy?stav=lost', cObch)).json();
test('odmítnutý token řekne, kde se opravuje',
  spatnyToken.ok === false && spatnyToken.chyba.includes(PD_TOKEN_PROMENNA), spatnyToken.chyba);

rezim = 'normal';

console.log(`\n${ok} prošlo, ${fail} selhalo`);
if (fail) console.log('\nSelhalo:\n - ' + selhalo.join('\n - '));
process.exit(fail ? 1 : 0);
