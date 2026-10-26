/* ============================================================
 * #114 — PŘEHLED MAPY POLÍ PIPEDRIVE V NASTAVENÍ (26. 10. 2026)
 *
 * 1) sestavení přehledu (`pdPrehledMapy` v lib/pd_mapa.mjs) nad podvrženými
 *    definicemi polí: spárováno, chybí (i přejmenované pole), jiný typ,
 *    dvakrát, nezařazená pole CRM, organizace, souhrn;
 * 2) /api/pd/pole: jen administrátor (obchodník 403 i s právem
 *    crm.pipedrive), nenastavený token = srozumitelná hláška, chyba API =
 *    hláška bez pádu a bez 401 (klient by správce odhlásil), obnovení
 *    z CRM obejde cache.
 *
 * Pipedrive je nahrazený náhradním `fetch` — žádné volání ven.
 * ============================================================ */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
if (!process.env.ADMIN_EMAIL) process.env.ADMIN_EMAIL = 'spravce@priklad.cz';

const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
    .map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

const { default: prihlaseni } = await import('./functions/prihlaseni.mjs');
const { default: uzivatele } = await import('./functions/uzivatele.mjs');
const { default: pdPole } = await import('./functions/pd_pole.mjs');
const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');
const PD = await import('./lib/pipedrive.mjs');
const { pdMapaZPoli, pdPrehledMapy, POLE_DEALU, POLE_ORGANIZACE, PD_PREHLED_STAVY } = await import('./lib/pd_mapa.mjs');

let ok = 0, fail = 0; const selhalo = [];
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; selhalo.push(n); console.log('FAIL ' + n, info === undefined ? '' : info); }
};

/* ---------- podvržené definice polí CRM ---------- */
let pocitadlo = 0;
const hash = () => (++pocitadlo).toString(16).padStart(40, 'a');
const pole = (nazev, typ) => ({ field_code: hash(), field_name: nazev, field_type: typ, is_custom_field: true });
const vsechnaDealu = () => POLE_DEALU.map((d) => pole(d.nazev, d.typ[0]));
/* Výchozí sestava jako 23. 10. 2026: kalendář SoD PROJ chybí, „Typ zakázky"
 * přejmenovaný, „Splatnost" má jiný typ, „ATYP" je dvakrát, „Priorita" nezařazená. */
function poleDealu() {
  const p = vsechnaDealu().filter((x) => x.field_name !== 'Platební kalendář SoD PROJ');
  p.find((x) => x.field_name === 'Typ zakázky').field_name = 'Typ zakázky (nový)';
  p.find((x) => x.field_name === 'Splatnost faktur (dny)').field_type = 'varchar';
  p.push(pole('ATYP', 'enum'));
  p.push(pole('Priorita', 'enum'));
  /* Standardní (ne vlastní) pole se nepočítá nikam. */
  p.push({ key: 'title', field_name: 'Název', field_type: 'varchar', is_custom_field: false });
  return p;
}
const poleOrg = () => [pole('IČ', 'double')];

console.log('\n===== 1) SESTAVENÍ PŘEHLEDU =====\n');
const deal = pdMapaZPoli(poleDealu(), POLE_DEALU);
const org = pdMapaZPoli(poleOrg(), POLE_ORGANIZACE);
const ulozena = { verze: 2, poridano: 1761480000000, mapa: deal.mapa, popisy: deal.popisy, chybi: deal.chybi,
  typNesedi: deal.typNesedi, nejednoznacne: deal.nejednoznacne, nezarazeno: deal.nezarazeno,
  mapaOrganizace: org.mapa, popisyOrganizace: org.popisy, chybiOrganizace: org.chybi,
  typNesediOrganizace: org.typNesedi, nejednoznacneOrganizace: org.nejednoznacne };
const p = pdPrehledMapy(ulozena);
const radek = (klic, oblast = 'deal') => p.radky.find((r) => r.klic === klic && r.oblast === oblast);

test('každé pole kalkulace má právě jeden řádek (deal + organizace)',
  p.radky.length === POLE_DEALU.length + POLE_ORGANIZACE.length, p.radky.length);
test('stavy jsou jen ze seznamu', p.radky.every((r) => PD_PREHLED_STAVY.includes(r.stav)));

const kal = radek('platebniKalendar');
test('#512: Platební kalendář SoD PROJ chybí v CRM', kal && kal.stav === 'chybi' && kal.crmNazev === '', JSON.stringify(kal));
test('… nese dohodnutý název, směr zápis a zdroj PROJ',
  kal.nazev === 'Platební kalendář SoD PROJ' && kal.smer === 'zapis' && JSON.stringify(kal.zdroj) === '["PROJ"]');
const typ = radek('typZakazky');
test('přejmenované pole se ukáže jako „chybí", ne opravené', typ.stav === 'chybi', JSON.stringify(typ));
test('… a přejmenované pole CRM je mezi nezařazenými',
  p.nezarazeno.some((x) => x.nazev === 'Typ zakázky (nový)' && x.typ === 'enum'), JSON.stringify(p.nezarazeno));
const spl = radek('splatnostDni');
test('jiný typ: Splatnost faktur je v CRM text, čeká se číslo',
  spl.stav === 'typNesedi' && spl.crmTyp === 'varchar' && spl.typ === 'double', JSON.stringify(spl));
test('… a hash pole jiného typu není v mapě', !('splatnostDni' in deal.mapa));
const atyp = radek('atyp');
test('dvakrát: ATYP je v CRM dvakrát', atyp.stav === 'nejednoznacne' && atyp.pocet === 2, JSON.stringify(atyp));
test('… zdroj OCK, směr zápis', JSON.stringify(atyp.zdroj) === '["OCK"]' && atyp.smer === 'zapis');
const zp = radek('zpusobFakturace');
test('spárováno: Způsob fakturace s názvem a typem z CRM',
  zp.stav === 'sparovano' && zp.crmNazev === 'Způsob fakturace' && zp.crmTyp === 'enum' && zp.zapisovatelne === true,
  JSON.stringify(zp));
test('… zdroj OCK i PROJ', JSON.stringify(zp.zdroj) === '["OCK","PROJ"]');
const adr = radek('adresaStavby');
test('pole jen ke čtení: směr čte, bez zdroje v krycím listu', adr.smer === 'cteni' && adr.zdroj.length === 0
  && adr.stav === 'sparovano', JSON.stringify(adr));
test('pole, které kalkulátor jen zná: směr „nic"', radek('platba1').smer === 'nic');
test('nezařazené: Priorita', p.nezarazeno.some((x) => x.nazev === 'Priorita'));
test('nezařazené nenesou hash (přehled ho nepotřebuje)', p.nezarazeno.every((x) => !('hash' in x)));
test('nezařazené jsou seřazené podle názvu',
  p.nezarazeno.map((x) => x.nazev).join('|') === p.nezarazeno.map((x) => x.nazev).sort((a, b) => a.localeCompare(b, 'cs')).join('|'));
test('standardní pole dealu se nezařazuje', !p.nezarazeno.some((x) => x.nazev === 'Název'));
test('organizace: IČ spárováno', radek('ico', 'organizace').stav === 'sparovano');
test('organizace: Role chybí', radek('typOrganizace', 'organizace').stav === 'chybi');
const s = p.souhrn;
test('souhrn: chybí 3 (kalendář, typ zakázky, role organizace)', s.chybi === 3, JSON.stringify(s));
test('souhrn: jiný typ 1, dvakrát 1, nezařazená 2 (Priorita, přejmenovaný typ zakázky)',
  s.typNesedi === 1 && s.nejednoznacne === 1 && s.nezarazeno === 2, JSON.stringify(s));
test('pole jiného typu a zdvojené se mezi nezařazenými nehlásí podruhé',
  !p.nezarazeno.some((x) => /^(Splatnost faktur \(dny\)|ATYP)$/.test(x.nazev)), JSON.stringify(p.nezarazeno));
test('souhrn: stavy dají dohromady celkem',
  s.sparovano + s.chybi + s.typNesedi + s.nejednoznacne === s.celkem && s.celkem === p.radky.length, JSON.stringify(s));
test('přehled nese čas pořízení a verzi mapy', p.poridano === 1761480000000 && p.verze === 2);

const nezapis = pdMapaZPoli(vsechnaDealu().map((x) => x.field_name === 'Sazba DPH'
  ? Object.assign(x, { is_writable: false }) : x), POLE_DEALU);
test('spárované pole, které v CRM nejde zapisovat, to přehled řekne',
  pdPrehledMapy({ mapa: nezapis.mapa, popisy: nezapis.popisy }).radky.find((r) => r.klic === 'sazbaDph').zapisovatelne === false);

const prazdna = pdPrehledMapy(null);
test('prázdná mapa: vše chybí, nic nepadá', prazdna.radky.every((r) => r.stav === 'chybi')
  && prazdna.souhrn.chybi === prazdna.radky.length && prazdna.nezarazeno.length === 0);
const vse = pdMapaZPoli(vsechnaDealu(), POLE_DEALU);
test('úplná mapa: všechna pole dealu spárovaná, nic nezařazeno',
  pdPrehledMapy({ mapa: vse.mapa, popisy: vse.popisy, nezarazeno: vse.nezarazeno }).radky
    .filter((r) => r.oblast === 'deal').every((r) => r.stav === 'sparovano') && vse.nezarazeno.length === 0);

console.log('\n===== 2) /api/pd/pole =====\n');
const get = (url, cookie) => pdPole(new Request(url, { headers: cookie ? { cookie } : {} }));
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST',
  headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const cookie = (r) => (r.headers.get('set-cookie') || '').split(';')[0];
const cAdmin = cookie(await post(prihlaseni, 'http://x/api/prihlaseni', { email: ADMIN_EMAIL, heslo: 'Docasne.Heslo.123' }));
await post(uzivatele, 'http://x/api/uzivatele',
  { akce: 'zaloz', email: 'obchod@example.com', jmeno: 'O', role: 'Obchodník', heslo: 'ObchodHeslo1' }, cAdmin);
const cObch = cookie(await post(prihlaseni, 'http://x/api/prihlaseni', { email: 'obchod@example.com', heslo: 'ObchodHeslo1' }));
test('příprava: přihlášení správce a obchodníka', !!(cAdmin && cObch));

let volani = 0, rezim = 'ok';
globalThis.fetch = async (url) => {
  volani++;
  if (rezim === 'pad') throw new Error('ECONNRESET');
  if (rezim === '401') return new Response(JSON.stringify({ success: false, error: 'unauthorized' }), { status: 401 });
  const u = new URL(String(url));
  const data = u.pathname === '/api/v2/dealFields' ? poleDealu() : u.pathname === '/api/v2/organizationFields' ? poleOrg() : null;
  if (!data) return new Response('{}', { status: 404 });
  return new Response(JSON.stringify({ success: true, data, additional_data: { next_cursor: null } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } });
};

const bez = await get('http://x/api/pd/pole', cAdmin);
const bezD = await bez.json();
test('nenastavený token: 200, nastaveno=false a srozumitelná hláška',
  bez.status === 200 && bezD.nastaveno === false && bezD.chyba.includes(PD.PD_TOKEN_PROMENNA), JSON.stringify(bezD));
test('… a do Pipedrive se nešlo', volani === 0);
test('obchodník bez tokenu: 403 (právo se ověří dřív než napojení)',
  (await get('http://x/api/pd/pole', cObch)).status === 403);

process.env[PD.PD_TOKEN_PROMENNA] = 'zkusebni-token-jen-pro-test';
process.env[PD.PD_DOMENA_PROMENNA] = 'zkusebni-firma';

volani = 0;
const ob = await get('http://x/api/pd/pole', cObch);
test('obchodník s tokenem i s výchozím právem crm.pipedrive: 403', ob.status === 403, ob.status);
test('… s větou pro člověka', /jen administrátor/.test((await ob.json()).chyba || ''));
test('… a do Pipedrive se nešlo', volani === 0, volani);

const a1 = await get('http://x/api/pd/pole', cAdmin);
const d1 = await a1.json();
test('administrátor: 200 s přehledem', a1.status === 200 && d1.ok && d1.prehled && d1.prehled.souhrn.chybi === 3,
  JSON.stringify(d1.prehled && d1.prehled.souhrn));
test('… přehled nese kalendář SoD PROJ jako chybějící',
  d1.prehled.radky.some((r) => r.klic === 'platebniKalendar' && r.stav === 'chybi'));
test('… první načtení se zeptalo Pipedrive (pole dealu a organizace)', volani === 2, volani);
volani = 0;
const d2 = await (await get('http://x/api/pd/pole', cAdmin)).json();
test('druhé načtení jde z cache (žádný dotaz do Pipedrive)', volani === 0 && d2.prehled.souhrn.celkem === d1.prehled.souhrn.celkem);
test('… a cache nese verzi mapy', d2.verze === 2 && d2.prehled.verze === 2);
const d3 = await (await get('http://x/api/pd/pole?obnovit=1', cAdmin)).json();
test('Obnovit z CRM obejde cache', volani === 2 && d3.ok, volani);
test('… a pořídí mapu znovu', d3.poridano >= d2.poridano);

rezim = '401';
const e401 = await get('http://x/api/pd/pole?obnovit=1', cAdmin);
const d401 = await e401.json();
test('odmítnutý token Pipedrive: ne 401 (klient by správce odhlásil), ale 502', e401.status === 502, e401.status);
test('… s hláškou, co s tím', d401.ok === false && /přístupový token/.test(d401.chyba), d401.chyba);
rezim = 'pad';
let padlo = null, ePad = null;
try { ePad = await get('http://x/api/pd/pole?obnovit=1', cAdmin); } catch (e) { padlo = e; }
test('nedostupné Pipedrive: funkce nepadne, vrátí 502 s hláškou',
  !padlo && ePad.status === 502 && /nepodařilo navázat/.test((await ePad.json()).chyba || ''), padlo || (ePad && ePad.status));
rezim = 'ok';
test('po chybě obnovení zůstane platná dřívější mapa v cache',
  (await (await get('http://x/api/pd/pole', cAdmin)).json()).prehled.souhrn.celkem === d1.prehled.souhrn.celkem);

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
if (fail) { console.log('Selhalo:\n  ' + selhalo.join('\n  ')); process.exit(1); }
