/* ============================================================
 * SIMULÁTOR API PIPEDRIVE (#536, 27. 10. 2026)
 *
 * Proč: napojení na Pipedrive (#16, #113, #115) čeká na token a odpovědi
 * integrátora. Aby se dal výběr zakázky z CRM (#113) i zápis (#115) vyvíjet
 * a zkoušet bez tokenu a bez rizika, že se něco dostane do skutečného CRM,
 * stojí tady náhradní Pipedrive: odpovídá na tytéž adresy API v2 (a v1
 * u uživatelů) ve stejném tvaru, se SMYŠLENÝMI dealy, organizacemi,
 * osobami a uživateli, se stránkováním přes kurzor a s chybami, které na
 * živém účtu nejdou vyrobit na povel (401, 404, 429, 500).
 *
 * KDY SE ZAPNE. Jen proměnnou prostředí `PIPEDRIVE_SIMULATOR=1` — a NIKDY
 * na ostrém webu (pdSimulatorStav níž). Zapnutý simulátor má přednost i před
 * nastaveným tokenem: na testovacím webu tak nic neodejde do skutečného CRM,
 * ani když tam token omylem zůstane.
 *
 * JAK SE ZAPOJÍ. lib/pipedrive.mjs má jediné místo, kde se sahá na síť
 * (pdZavolej). Se zapnutým simulátorem tam místo `fetch` volá pdSimFetch —
 * odpověď je skutečný `Response`, takže překlad chyb, opakování u 429
 * i stránkování běží TOUTÉŽ cestou jako proti Pipedrive. Nic jiného
 * o simulátoru neví.
 *
 * Data žijí v paměti instance funkce: zápis (PATCH) se drží, dokud funkce
 * běží, a po studeném startu se vrátí výchozí stav. Nic se neukládá.
 *
 * Scénáře chyb (proměnná `PIPEDRIVE_SIMULATOR_SCENAR`, nebo pdSimNastav):
 *   token      každý požadavek 401 (odmítnutý token),
 *   limit      každý požadavek 429 (vyčerpaný limit),
 *   limitN     dalších N požadavků 429, pak zase normálně (zkouška opakování),
 *   vypadek    každý požadavek 500,
 * a k tomu denní rozpočet tokenů (`PIPEDRIVE_SIMULATOR_ROZPOCET`, výchozí
 * 30 000; ceny jako x-token-cost ve specifikaci v2) — po vyčerpání 429.
 * Neznámé id dealu, organizace či osoby vrací 404 jako skutečné API.
 *
 * Kontakty jsou smyšlené (doména priklad.cz z povoleného seznamu
 * nastroje/povolene_kontakty.txt, telefony +420 000 … nejsou přidělené čísla);
 * částky jsou smyšlená kulatá čísla, žádná cena z ceníku.
 * ============================================================ */
import { POLE_DEALU, pdPoleDohodnuta } from './pd_mapa.mjs';

export const PD_SIM_PROMENNA = 'PIPEDRIVE_SIMULATOR';
export const PD_SIM_SCENAR_PROMENNA = 'PIPEDRIVE_SIMULATOR_SCENAR';
export const PD_SIM_ROZPOCET_PROMENNA = 'PIPEDRIVE_SIMULATOR_ROZPOCET';
/* Doména `.invalid` (RFC 2606) se nikdy nepřeloží — odkaz na deal ze
 * simulátoru nikam nevede a nikdo si ho nesplete se skutečným CRM. */
export const PD_SIM_ZAKLAD = 'https://simulator.pipedrive.invalid';
export const PD_SIM_POCET_DEALU = 230;   // víc než stránka PD_STRANKA (200) → dvě stránky

/* ============================================================
 * POJISTKA: NA OSTRÉM WEBU SE SIMULÁTOR NEZAPNE
 *
 * Simulátor by na ostrém webu ukázal obchodníkům smyšlené zakázky, jako by
 * byly z CRM. Zapne se proto jen tam, kde je jisté, že nejde o ostrý provoz:
 *   · lokálně (bez známek Netlify — testy, server/server.js),
 *   · na Netlify jen s `PROSTREDI=test` (testovací web testengscalc).
 * Odmítne se vždy, když nasazení pochází z větve `main` nebo jde o web
 * schaftscalc — i kdyby tam PROSTREDI=test omylem stálo. Odmítnutí se hlásí
 * (`duvod`) a správce ho vidí v Nastavení → Mapa polí CRM.
 * ============================================================ */
const ZAPNUTO = ['1', 'ano', 'true', 'zapnuto'];
const TEST = ['test', 'sandbox', 'testovaci'];

export function pdSimulatorStav(env = process.env) {
  const e = env || {};
  const pozadovano = ZAPNUTO.includes(String(e[PD_SIM_PROMENNA] || '').trim().toLowerCase());
  if (!pozadovano) return { zapnuto: false, pozadovano: false, duvod: '' };
  const odmitni = (duvod) => ({ zapnuto: false, pozadovano: true,
    duvod: 'Simulátor Pipedrive se nezapnul: ' + duvod + '.' });
  if ([e.BRANCH, e.HEAD].some((v) => String(v || '').trim().toLowerCase() === 'main'))
    return odmitni('nasazení z větve main');
  const web = [e.URL, e.DEPLOY_PRIME_URL, e.DEPLOY_URL, e.SITE_NAME].map((v) => String(v || '')).join(' ').toLowerCase();
  if (web.includes('schaftscalc')) return odmitni('jde o ostrý web schaftscalc');
  const prostredi = String(e.PROSTREDI || '').trim().toLowerCase();
  const naNetlify = !!(e.NETLIFY || e.SITE_ID || e.SITE_NAME || e.DEPLOY_ID || e.CONTEXT
    || e.NETLIFY_BLOBS_CONTEXT || e.AWS_LAMBDA_FUNCTION_NAME);
  if ((naNetlify || prostredi) && !TEST.includes(prostredi))
    return odmitni('prostředí není testovací (PROSTREDI musí být „test")');
  return { zapnuto: true, pozadovano: true, duvod: '' };
}

/* ---------- smyšlená data ----------
 * Skládají se deterministicky (pevné semínko), takže test i vývojář vidí
 * pokaždé tytéž dealy. */
function nahoda(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const JMENA = ['Adam', 'Bára', 'Cyril', 'Dana', 'Emil', 'Fanda', 'Gita', 'Hana', 'Ivo', 'Jana'];
const PRIJMENI = [['Vzorek', 'Vzorková'], ['Příklad', 'Příkladová'], ['Zkouška', 'Zkoušková'],
  ['Ukázka', 'Ukázková'], ['Modelář', 'Modelářová']];
const FIRMY = ['Vzorová výtahová s.r.o.', 'Ukázkové stavby a.s.', 'Zkušební správa domů s.r.o.',
  'Modelový developer s.r.o.', 'Smyšlený investor a.s.', 'SVJ Zkušební 12', 'Příkladné projekty s.r.o.',
  'Výtahy Ukázka s.r.o.', 'Stavby Vzorek a.s.', 'Bytové družstvo Modelová'];
const AKCE = ['Bytový dům', 'Administrativní budova', 'Polyfunkční dům', 'Rodinný dům', 'Hotel', 'Škola'];
const ULICE = ['Ukázková', 'Vzorová', 'Zkušební', 'Modelová', 'Smyšlená'];
const bezDiakritiky = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function datum(den) {   // den 0 = 1. 1. 2026
  return new Date(Date.UTC(2026, 0, 1) + den * 86400000).toISOString().slice(0, 10);
}

export function pdSimVychoziData() {
  const r = nahoda(536);
  const vyber = (pole) => pole[Math.floor(r() * pole.length)];
  const pole = pdPoleDohodnuta();
  const hash = Object.fromEntries(pole.deal.map((p) => [p.field_name, p]));
  const hashOrg = Object.fromEntries(pole.organizace.map((p) => [p.field_name, p]));
  const def = Object.fromEntries(POLE_DEALU.map((d) => [d.klic, d]));
  const volba = (klic, label) => {
    const p = hash[def[klic].nazev];
    const o = p && (p.options || []).find((x) => x.label === label);
    return o ? o.id : null;
  };

  const uzivatele = [
    ['Jan Vzorový', 'jan.vzorovy@priklad.cz'], ['Petra Ukázková', 'petra.ukazkova@priklad.cz'],
    ['Tomáš Zkušební', 'tomas.zkusebni@priklad.cz'], ['Eva Smyšlená', 'eva.smyslena@priklad.cz'],
  ].map(([name, email], i) => ({ id: i + 1, name, email, active_flag: true, is_admin: i === 0 ? 1 : 0 }));

  const organizace = FIRMY.map((name, i) => ({
    id: i + 1, name, owner_id: uzivatele[i % uzivatele.length].id,
    address: { value: ULICE[i % ULICE.length] + ' ' + (10 + i) + ', Zkušebnice' },
    custom_fields: {
      /* IČ je v účtu číselné pole — „IČO" s nulami na začátku drží jako
       * kratší číslo (pdIco doplní nuly). Smyšlená čísla. */
      [hashOrg['IČ'].field_code]: 1000 + i * 37,
      [hashOrg['Role'].field_code]: hashOrg['Role'].options[i % hashOrg['Role'].options.length].id,
    },
  }));

  const osoby = [];
  for (let i = 0; i < 30; i++) {
    const jmeno = JMENA[i % JMENA.length];
    const zena = /a$/.test(jmeno);
    const prijmeni = PRIJMENI[Math.floor(i / 2) % PRIJMENI.length][zena ? 1 : 0];
    osoby.push({
      id: i + 1, first_name: jmeno, last_name: prijmeni, name: jmeno + ' ' + prijmeni,
      org_id: (i % FIRMY.length) + 1,
      emails: [{ value: bezDiakritiky(jmeno + '.' + prijmeni) + (i + 1) + '@priklad.cz', primary: true, label: 'work' }],
      phones: i % 3 === 2 ? [] : [{ value: '+420 000 000 ' + String(100 + i), primary: true, label: 'work' }],
    });
  }

  const dealy = [];
  for (let i = 0; i < PD_SIM_POCET_DEALU; i++) {
    const id = 1001 + i;
    const x = r();
    const status = x < 0.6 ? 'open' : x < 0.85 ? 'won' : x < 0.95 ? 'lost' : 'deleted';
    const projekce = r() < 0.3;
    const prefix = i % 23 === 7 ? '' : i % 19 === 5 ? 'OPR' : projekce ? 'OVP-CN' : 'CN';
    const cislo = prefix === 'OPR' ? 'OPR' + (10 + i) + '-2026' : prefix ? prefix + '-' + (100 + i) : '';
    const akce = vyber(AKCE) + ' ' + vyber(ULICE) + ' ' + (1 + (i % 40));
    const org = i % 17 === 3 ? null : (i % FIRMY.length) + 1;
    const osoba = i % 13 === 4 ? null : (i % osoby.length) + 1;
    const cf = {};
    cf[hash['Typ zakázky'].field_code] = volba('typZakazky', projekce ? 'Projekce' : 'Realizace');
    if (i % 11 !== 2) cf[hash['Adresa realizace'].field_code] = vyber(ULICE) + ' ' + (1 + i) + ', Zkušebnice';
    if (status === 'won') cf[hash['Předpokládané datum ukončení realizace'].field_code] = datum(120 + i);
    /* Podmínky, které už v CRM jsou (stav 21. 10. 2026: trojice splatnost /
     * první / druhá splátka skoro u všech) — suchý běh na nich ukáže, co by
     * zápis z kalkulace přepsal. */
    if (i % 9 !== 0) {
      cf[hash['Splatnost faktur (dny)'].field_code] = i % 5 === 0 ? 30 : 14;
      cf[hash['První splátka (%)'].field_code] = 50;
      cf[hash['Druhá splátka (%)'].field_code] = 40;
    }
    dealy.push({
      id, title: (cislo ? cislo + ' ' : 'Poptávka ') + akce, status,
      value: 50000 + (i % 40) * 25000, currency: 'CZK',
      stage_id: 1 + (i % 6), pipeline_id: 1, user_id: uzivatele[i % uzivatele.length].id,
      org_id: org, person_id: osoba,
      add_time: datum(i) + 'T08:00:00Z', update_time: datum(60 + (i * 7) % 240) + 'T10:' + String(i % 60).padStart(2, '0') + ':00Z',
      custom_fields: cf,
    });
  }
  return { uzivatele, organizace, osoby, dealy, pole };
}

/* ---------- stav simulátoru (paměť instance) ---------- */
let STAV = null;
function stav() {
  if (!STAV) STAV = { data: pdSimVychoziData(), tokeny: 0, scenar: null, limitZbyva: 0, pozadavky: [] };
  return STAV;
}
/* Vrátí výchozí data a vynuluje počitadla (pro testy). */
export function pdSimReset() { STAV = null; }
/* Přepne scénář bez proměnné prostředí: { scenar: 'token' | 'limit' | 'limit2' | 'vypadek' | '' }. */
export function pdSimNastav(volby = {}) {
  const s = stav();
  if (volby.scenar !== undefined) { s.scenar = String(volby.scenar || ''); s.limitZbyva = scenarLimit(s.scenar); }
}
/* Pohled do simulátoru: data, spotřebované tokeny a seznam požadavků. */
export function pdSimStav() { const s = stav(); return { data: s.data, tokeny: s.tokeny, pozadavky: s.pozadavky.slice() }; }

function scenarLimit(sc) { const m = /^limit(\d+)$/.exec(sc || ''); return m ? +m[1] : 0; }
function aktualniScenar(s) {
  if (s.scenar !== null) return s.scenar;
  const sc = String(process.env[PD_SIM_SCENAR_PROMENNA] || '').trim().toLowerCase();
  /* Proměnná se čte při každém požadavku; limitN se odpočítává jen jednou
   * pro každou novou hodnotu proměnné. */
  if (s.scenarEnv !== sc) { s.scenarEnv = sc; s.limitZbyva = scenarLimit(sc); }
  return sc;
}

/* Ceny požadavků (x-token-cost ve specifikaci v2, ověřeno 22. 9. 2026). */
function cena(metoda, cesta) {
  if (/^\/api\/v2\/(deals|dealFields|organizationFields)$/.test(cesta) && metoda === 'GET') return 10;
  if (metoda === 'PATCH') return 5;
  if (cesta === '/api/v1/users') return 2;
  return 1;
}

const ODPOVED_HLAVICKY = { 'Content-Type': 'application/json' };
const odpoved = (stavKod, telo) => new Response(JSON.stringify(telo), { status: stavKod, headers: ODPOVED_HLAVICKY });
const chyba = (stavKod, text) => odpoved(stavKod, { success: false, error: text, errorCode: stavKod });
const data = (d, navic) => odpoved(200, Object.assign({ success: true, data: d }, navic || {}));

/* Stránkování API v2: `limit` (max 500) a neprůhledný `cursor`. */
function strankuj(seznam, dotaz) {
  const limit = Math.min(Math.max(parseInt(dotaz.get('limit'), 10) || 100, 1), 500);
  let od = 0;
  const kurzor = dotaz.get('cursor');
  if (kurzor) {
    const m = /^sim:(\d+)$/.exec(Buffer.from(kurzor, 'base64').toString('utf8'));
    if (!m) return { chyba: chyba(400, 'Invalid cursor') };
    od = +m[1];
  }
  const kus = seznam.slice(od, od + limit);
  const dalsi = od + limit < seznam.length ? Buffer.from('sim:' + (od + limit)).toString('base64') : null;
  return { odpoved: data(kus, { additional_data: { next_cursor: dalsi } }) };
}

const kopie = (x) => JSON.parse(JSON.stringify(x));

/* Náhrada `fetch` pro pdZavolej. Vrací Promise<Response>. */
export async function pdSimFetch(url, init = {}) {
  const s = stav();
  const u = new URL(String(url));
  const metoda = String(init.method || 'GET').toUpperCase();
  const cesta = u.pathname.replace(/\/+$/, '');
  s.pozadavky.push(metoda + ' ' + cesta + (u.search || ''));

  const hlavicky = init.headers || {};
  if (!hlavicky['x-api-token']) return chyba(401, 'Unauthorized');
  const sc = aktualniScenar(s);
  if (sc === 'token') return chyba(401, 'Unauthorized');
  if (sc === 'vypadek') return chyba(500, 'Internal server error');
  if (sc === 'limit') return chyba(429, 'Rate limit exceeded');
  if (s.limitZbyva > 0) { s.limitZbyva--; return chyba(429, 'Rate limit exceeded'); }

  const rozpocet = Number(process.env[PD_SIM_ROZPOCET_PROMENNA]) > 0 ? Number(process.env[PD_SIM_ROZPOCET_PROMENNA]) : 30000;
  const stoji = cena(metoda, cesta);
  if (s.tokeny + stoji > rozpocet) return chyba(429, 'Daily token budget exceeded');
  s.tokeny += stoji;

  const D = s.data;
  let m;
  if (metoda === 'GET' && cesta === '/api/v2/dealFields') return strankuj(D.pole.deal, u.searchParams).odpoved;
  if (metoda === 'GET' && cesta === '/api/v2/organizationFields') return strankuj(D.pole.organizace, u.searchParams).odpoved;
  if (metoda === 'GET' && cesta === '/api/v1/users') return data(kopie(D.uzivatele));

  if (metoda === 'GET' && cesta === '/api/v2/deals') {
    const status = u.searchParams.get('status');
    const ids = (u.searchParams.get('ids') || '').split(',').map((x) => parseInt(x, 10)).filter((x) => x > 0);
    /* Jako v API: bez `status` jen nesmazané dealy; smazané jen na výslovný dotaz. */
    let seznam = D.dealy.filter((d) => (status ? d.status === status : d.status !== 'deleted'));
    if (ids.length) seznam = seznam.filter((d) => ids.includes(d.id));
    const v = strankuj(kopie(seznam), u.searchParams);
    return v.chyba || v.odpoved;
  }
  if ((m = /^\/api\/v2\/deals\/(\d+)$/.exec(cesta))) {
    const deal = D.dealy.find((d) => d.id === +m[1] && d.status !== 'deleted');
    if (!deal) return chyba(404, 'Deal not found');
    if (metoda === 'GET') return data(kopie(deal));
    if (metoda === 'PATCH') {
      let telo;
      try { telo = JSON.parse(init.body || '{}'); } catch (e) { return chyba(400, 'Invalid JSON'); }
      const zname = new Set(D.pole.deal.map((p) => p.field_code));
      const nezname = Object.keys((telo && telo.custom_fields) || {}).filter((k) => !zname.has(k));
      if (nezname.length) return chyba(400, 'Unknown custom field: ' + nezname[0]);
      Object.assign(deal.custom_fields, telo.custom_fields || {});
      if (telo.status !== undefined && !['open', 'won', 'lost'].includes(telo.status)) return chyba(400, 'Invalid status');
      for (const k of ['value', 'currency', 'title', 'status']) if (telo[k] !== undefined) deal[k] = telo[k];
      deal.update_time = new Date().toISOString().slice(0, 19) + 'Z';
      return data(kopie(deal));
    }
    return chyba(405, 'Method not allowed');
  }
  if (metoda === 'GET' && (m = /^\/api\/v2\/organizations\/(\d+)$/.exec(cesta))) {
    const o = D.organizace.find((x) => x.id === +m[1]);
    return o ? data(kopie(o)) : chyba(404, 'Organization not found');
  }
  if (metoda === 'GET' && (m = /^\/api\/v2\/persons\/(\d+)$/.exec(cesta))) {
    const o = D.osoby.find((x) => x.id === +m[1]);
    return o ? data(kopie(o)) : chyba(404, 'Person not found');
  }
  return chyba(404, 'Not found');
}
