/* SEC-M klient, bod 10 — ULOŽENÉ XSS: všechna pole, víc druhů payloadů,
 * obě role, všechny záložky, panely Nastavení a 9 tiskových náhledů, pod
 * produkční CSP. Navazuje na overit_xss.mjs (oddíl A2, kód stránky převzatý
 * a rozšířený) a na S1 (342 OK / 0 FAIL, xss_ridici_pole.mjs).
 *
 * Co je navíc proti S1:
 *  - aplikace se servíruje z http://kng.test/ (route Playwrightu) s HLAVIČKOU
 *    CSP z netlify.toml — běží tedy online větve (onlineMozne) a CSP platí
 *    i pro náhledy v rámech; /api/* visí (nic se nepřepíše), provoz na jiné
 *    hosty se zablokuje a zapíše;
 *  - pět druhů payloadu: V0 img/onerror + uzavření '…' (S1), V1 svg/onload,
 *    details/ontoggle a '-…-' v JS řetězci, V2 </script></textarea></title>
 *    </style> + <script> + iframe/a s javascript:, V3 holé javascript: URL +
 *    {{FIRMA_ICO}} + Word XML </w:t> + ]]> + <!-- + řídicí znaky a nepárové
 *    náhradní znaky, V4 = V0 i do ŘÍDICÍCH polí (S1 je přeskakoval);
 *  - nové oblasti: controlling (všechny tři karty, protokol, import),
 *    šablony online (rejstřík, historie), analytika (přehled);
 *  - detekce: window.__XSS, nativní dialog (alert/confirm/prompt), požadavek
 *    mimo kng.test, hlášení CSP (securitypolicyviolation) a chyby stránky.
 * Spuštění z kořene repa (dist z vlastní kopie stromu):
 *   KNG_DIST=<cesta>/dist/kalkulacka.html node podklady/SECM_pokusy/klient/xss_ulozene.mjs [--rychle]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const KOREN = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const DIST = process.env.KNG_DIST || path.join(KOREN, 'dist/kalkulacka.html');
if (!fs.existsSync(DIST)) { console.log('VÝSLEDEK: chybí sestavený dist (' + DIST + ') — KNG_NEZVYSOVAT_VERZI=1 python3 build.py ve vlastní kopii stromu'); process.exit(2); }
const HTML = fs.readFileSync(DIST);
const CSP = /Content-Security-Policy\s*=\s*"([^"]+)"/.exec(fs.readFileSync(path.join(KOREN, 'netlify.toml'), 'utf8'))[1];
const RYCHLE = process.argv.includes('--rychle');

let ok = 0, fail = 0; const failMista = [];
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; if (!RYCHLE) console.log('  ✓ ' + popis); }
  else { fail++; failMista.push(popis); console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + String(detail).slice(0, 400))); }
};
const venku = [];   // požadavky mimo kng.test
export async function kontext(b, { csp = true } = {}) {
  const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 } });
  await ctx.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === 'kng.test') {
      if (u.pathname.startsWith('/api/')) return;             // visí — server „nedostupný“, nic se nepřepíše
      return route.fulfill({ status: 200, body: HTML, headers: Object.assign({ 'content-type': 'text/html; charset=utf-8' }, csp ? { 'content-security-policy': CSP } : {}) });
    }
    venku.push(u.href.slice(0, 120)); return route.abort();
  });
  await ctx.addInitScript(() => {
    window.__CSP = [];
    document.addEventListener('securitypolicyviolation', (e) => { window.__CSP.push(e.violatedDirective + ' ' + String(e.blockedURI).slice(0, 60)); });
  });
  return ctx;
}

const KOD_STRANKY = `
  window.__XSS = [];
  const PAY = (c) => window.__PAYF(c);
  const SKIP = window.__BEZ_SKIP ? new Set() : new Set(['schema', 'priponySchema', 'aktivni', 'cenikRada', 'typ', 'sazba', 'fixKey', 'rezim',
                        'smer', 'stav', 'druh', 'role', 'ridici', 'varianta', 'zapnuto', 'jazyk', 'cast', 'zamceno']);
  /* Projde strom a každý textový i číselný list nahradí payloadem se značkou
   * své cesty. Parametr jen omezuje cesty, jenText vynechá čísla (tam, kde je
   * počítá server a klient je jen vypisuje). */
  function otrav(o, cesta, jen, jenText) {
    if (!o || typeof o !== 'object') return;
    for (const k of Object.keys(o)) {
      const c = cesta ? cesta + '.' + k : k;
      const v = o[k];
      if (v && typeof v === 'object') { otrav(v, c, jen, jenText); continue; }
      if (typeof v !== 'string' && (jenText || typeof v !== 'number')) continue;
      if (SKIP.has(k)) continue;
      if (jen && !jen(c)) continue;
      o[k] = PAY(c);
    }
  }
  /* Zakázka s NAPLNĚNÝMI větvemi: dva pásy opláštění, vlastní položky OCK,
   * vlastní položka PROJ, ruční pole krycích listů, extra řádek specifikace,
   * poznámka, příloha, záznam protokolu a druhá, ODESLANÁ varianta. Prázdná
   * větev se nekreslí, takže by se v ní díra neukázala. */
  function zakazkaPlna() {
    const z = novaZakazka(); z.cislo = '2026 - OPR - CN - 0999'; z.nazevAkce = 'Zkušební';
    z.objednatel = 'Zákazník'; z.kontakt = 'Kontakt'; z.ico = '12345678'; z.adresa = 'Stavba 1';
    for (const k of Object.keys(z.zastupci)) z.zastupci[k] = 'x';
    z.autor = 'obchodnik@priklad.cz'; z.autorJmeno = 'Obchodník Zkušební';
    const d = z.varianty[0].data;
    if (typeof zkusebniCenik === 'function') d.cenik = zkusebniCenik();
    Object.assign(d.ock.zadani, { zdvih: 17, prejezd: 2.7, sirka: 1.5, hloubka: 1.5, prohluben: 1, patra: 5,
      typSachty: 'exteriérová' });
    d.ock.zadani.oplasteni = { rezim: 'poStenach', steny: { A: { odM: 0, pasy: [{ typ: 'plech', doM: 3 }, { typ: 'sklo', doM: null }] } } };
    if (!d.ock.zadani.vlastniPolozky) d.ock.zadani.vlastniPolozky = {};
    for (const s of ['hrubaOck', 'atyp', 'oplasteni', 'volitelne', 'rezie'])
      d.ock.zadani.vlastniPolozky[s] = [{ nazev: 'Vlastní ' + s, mnozstvi: 1, cena: 10, jednotka: 'ks' }];
    d.proj.zadani.sekce[0].polozky.push({ nazev: 'Vlastní PROJ', typ: 'hod', sazba: 'projektant', hodiny: 1, rezerva: 0, kid: 'pk1' });
    d.techspec.hodnoty = { nazevAkce: 'x' }; d.techspec.extra = [{ label: 'Extra', hodnota: 'h' }];
    d.kryci.hodnoty = {}; d.kryciProj.hodnoty = {};
    if (typeof KRYCI_SEKCE !== 'undefined') KRYCI_SEKCE.forEach(s => (s.pole || []).forEach(p => { d.kryci.hodnoty[p.id] = 'x'; }));
    if (typeof KRYCI_PROJ_SEKCE !== 'undefined') KRYCI_PROJ_SEKCE.forEach(s => (s.pole || []).forEach(p => { d.kryciProj.hodnoty[p.id] = 'x'; }));
    Object.assign(d.sleva, { procenta: 3, schema: 'Standardní obchodní sleva', poznamka: 'p', kdo: 'x' });
    Object.assign(d.slevaProj, { procenta: 2, schema: 'Standardní obchodní sleva', poznamka: 'p', kdo: 'x' });
    d.cenikRucni = { marze: 0.2 }; d.zadaniRucni = { zdvih: 17 };
    if (typeof poznamkyPridej === 'function') poznamkyPridej(z, 'Poznámka', { kdo: 'x', druh: 'interni' });
    if (typeof prilohyPridej === 'function')
      prilohyPridej(z, { nazev: 'smlouva.pdf', data: 'data:application/pdf;base64,AAAA', velikost: 10, typ: 'application/pdf', popis: 'p' }, { kdo: 'x' });
    if (typeof protokolZapis === 'function') protokolZapis(z, { co: 'změna', kdo: 'x', kde: 'Zakázka', pred: 'a', po: 'b' });
    const v2 = novaVarianta('Varianta 2', JSON.parse(JSON.stringify(d)));
    v2.zakaznik = 'z'; v2.pozn = 'p'; z.varianty.push(v2);
    if (typeof zamkniVariantu === 'function') zamkniVariantu(v2, { kdo: 'x', cislo: '2026 - OPR - CN - 0999.2', typ: 'CN', popis: 'tisk' });
    return z;
  }
  const ucet = (n) => ({ email: n + '@priklad.cz', jmeno: 'Účet ' + n, titul: 'Ing.', funkce: 'f', telefon: '+420 111 222 333',
                         role: 'Obchodník', aktivni: true, zalozen: '2026-09-01T00:00:00.000Z', posledniPrihlaseni: '2026-09-02T00:00:00.000Z' });
  const OBLASTI = {
    'hlavička, zástupci, foto, autor': (z) => otrav(z, '', c => !/^(varianty|poznamky|prilohy|prilohySmazane|protokol)\\b/.test(c)),
    'varianty: název, zákazník, pozn., id, zámek': (z) => z.varianty.forEach((v, i) => otrav(v, 'varianty.' + i, c => !/\\.data\\./.test(c))),
    'zadání OCK (všechna pole)': (z, d) => otrav(d.ock.zadani, 'ock.zadani', c => !/oplasteni|vlastniPolozky/.test(c)),
    'pásy opláštění a vlastní položky OCK': (z, d) => { otrav(d.ock.zadani.oplasteni, 'ock.zadani.oplasteni'); otrav(d.ock.zadani.vlastniPolozky, 'ock.zadani.vlastniPolozky'); },
    'ceník OCK (sazby, názvy, popisy)': (z, d) => otrav(d.cenik, 'cenik'),
    'zadání PROJ (sekce a položky)': (z, d) => otrav(d.proj.zadani, 'proj.zadani'),
    'ceník PROJ': (z, d) => otrav(d.proj.cenik, 'proj.cenik'),
    'technická specifikace': (z, d) => otrav(d.techspec, 'techspec'),
    'krycí listy OCK a PROJ': (z, d) => { otrav(d.kryci, 'kryci'); otrav(d.kryciProj, 'kryciProj'); },
    'slevy, zaokrouhlení, ruční hodnoty': (z, d) => { otrav(d.sleva, 'sleva'); otrav(d.slevaProj, 'slevaProj'); otrav(d.zaokr, 'zaokr');
      otrav(d.zaokrProj, 'zaokrProj'); otrav(d.cenikRucni, 'cenikRucni'); otrav(d.zadaniRucni, 'zadaniRucni'); },
    'poznámky, přílohy, protokol': (z) => { otrav(z.poznamky, 'poznamky'); otrav(z.prilohy, 'prilohy'); otrav(z.protokol, 'protokol'); },
    /* B124 (audit 2. 10. 2026): data období od 29. 9. — plán plateb PROJ
     * v zakázce (vlastní milník = volné znění splátky) a materiál „jiné"
     * v opláštění po stěnách (ruční název). */
    'B124: plán plateb v zakázce (vlastní milník, volné znění)': (z, d) => {
      /* P6 (zámek strany, 13. 10. 2026): plán plateb PROJ jen u zakázky projekce (číslo OVP). */
      z.cislo = '2026 - OVP - CN - 0999';
      /* plán se kreslí jen u činností s cenou — v sestavení bez ceníku dostanou sazby a paušály PROJ nenulovou hodnotu */
      ['sazby', 'fixy'].forEach(k => { const o = d.proj.cenik[k]; if (o) Object.keys(o).forEach(q => { if (typeof o[q] === 'number') o[q] = 1000; }); });
      d.kryciProj.planPlateb = { v: 1, predvolba: 'vlastni', prepis: {},
        cinnosti: { zamereni: [{ p: 50, m: 'vlastni', t: 'x' }, { p: 50, m: 'podpis' }], studie: [{ p: 100, m: 'vlastni', t: 'y' }],
          dps: [{ p: 50, m: 'vlastni', t: 'x' }, { p: 50, m: 'podpis' }], ic: [{ p: 100, m: 'vlastni', t: 'y' }] } };
      otrav(d.kryciProj.planPlateb, 'kryciProj.planPlateb', c => /\.t$/.test(c)); },
    'B124: materiál „jiné" v opláštění (ruční název)': (z, d) => {
      d.ock.zadani.oplasteni = { rezim: 'poStenach', steny: { A: { odM: 0, pasy: [{ typ: 'jine', nazev: 'x', naklad: 100, doM: 3 }, { typ: 'sklo', doM: null }] },
        B: { odM: 0, pasy: [{ typ: 'jine', nazev: 'y', naklad: 120, doM: null }] } } };
      otrav(d.ock.zadani.oplasteni, 'ock.zadani.oplasteni', c => /nazev$/.test(c)); },
    /* B150 (audit 12. 10. 2026): usazení OCK na levé a pravé boční stěně
     * (#396) jde z technické specifikace do nabídky — dosud neotrávené. */
    'B150: usazení OCK v nabídce (levá a pravá boční stěna)': (z, d) => {
      d.techspec.hodnoty = Object.assign(d.techspec.hodnoty || {}, { usazeniLeva: 'x', usazeniPrava: 'y' });
      otrav(d.techspec.hodnoty, 'techspec.hodnoty', c => /usazeni(Leva|Prava)$/.test(c)); },
    /* B166 (audit 25, 16. 10. 2026): cenová výjimka varianty — kdo požádal,
     * kdo rozhodl a důvod zamítnutí jdou do záložky Schvalování a do lišt. */
    'B166: cenová výjimka (data.cenovaVyjimka)': (z, d) => {
      /* karta výjimky se kreslí, jen když se varianta od ceníku liší — pás „jiné" pod sazbou */
      /* sestavení bez ceníku má sazby opláštění nulové — nejnižší sazba by nebyla */
      Object.assign(d.cenik, { skloBokyKc: 1000, skloCelniKc: 1000, cetrisKc: 1000 });
      d.ock.zadani.oplasteni = { rezim: 'poStenach', steny: { A: { odM: 0, pasy: [{ typ: 'jine', nazev: 'Pás pod sazbou', naklad: 1, doM: null }] } } };
      d.cenovaVyjimka = { stav: (typeof VYJ_ZAMITNUTO !== 'undefined' ? VYJ_ZAMITNUTO : 'zamítnuto'), obsah: 'x', polozek: 1, pasu: 1,
        pozadal: 'x', pozadalKdy: 'x', schvalil: 'x', schvalilKdy: 'x', zamitl: 'x', zamitlKdy: 'x', zamitnutoDuvod: 'x' };
      otrav(d.cenovaVyjimka, 'cenovaVyjimka', c => !/\.(obsah|polozek|pasu)$/.test(c)); },
    /* B187 (audit 18. 10. 2026, dávka H1): karta výjimky v pohledu toho, kdo
     * smí rozhodnout — sazby (použitá / ceníková), dopad na cenu a světlíky
     * „jiné" u dveří se kreslí jen jemu. Payload v názvu pásu stěn B–D
     * (z něj se jmenuje i světlík nad dveřmi z materiálu stěn). */
    'B187: karta výjimky schvalovatele (sazby, dopad, světlíky)': (z, d) => {
      Object.assign(d.cenik, { skloBokyKc: 1000, skloCelniKc: 1000, cetrisKc: 1000 });
      const zd = d.ock.zadani; zd.nadDvermi = 'material'; zd.nastupiste = 2;
      zd.prejezd = 2.7; zd.zdvih = 9; zd.prohluben = 1.05; zd.sirka = 2; zd.hloubka = 2.2;
      const jine = (st) => ({ odM: 0, pasy: [{ typ: 'jine', nazev: PAY('vyj.pas.' + st), naklad: 1, doM: null }] });
      zd.oplasteni = { rezim: 'poStenach', steny: { B: jine('B'), C: jine('C'), D: jine('D') } }; },
    /* B166: lišta zámku se kreslí jen u AKTIVNÍ zamčené varianty — oblast
     * „varianty" výš otravuje zámek varianty, která aktivní není. */
    'B166: lišta zámku u aktivní zamčené varianty': (z) => {
      const v2 = z.varianty[1];
      otrav(v2, 'varianty.1', c => /^varianty\.1\.(nazev|zakaznik|pozn|zamek\.(kdo|popis|cislo|kdy)|zamek\.tisky\.\d+\.(kdo|popis|kdy))$/.test(c));
      z.__aktivni = v2.id; },
  };
  /* Oblast, která se kreslí jen v jednom místě, musí doložit, že se
   * opravdu vykreslila (jinak by obecná pojistka „payload ve stránce"
   * prošla díky jiným polím). Volá se po každé záložce, panelu a na konci. */
  const OVERENI = {
    'B150: usazení OCK v nabídce (levá a pravá boční stěna)': (ramy) => ramy.some(f => f.contentDocument && f.contentDocument.documentElement
      && /techspec\.hodnoty\.usazeniLeva/.test(f.contentDocument.documentElement.innerHTML)
      && /techspec\.hodnoty\.usazeniPrava/.test(f.contentDocument.documentElement.innerHTML)),
    'B187: karta výjimky schvalovatele (sazby, dopad, světlíky)': () => {
      const el = document.getElementById('page-schvalovani'); const h = el ? el.innerHTML : '';
      return /vyj\.pas\.B/.test(h) && /ceníková/.test(h) && /Dopad celkem proti ceníku/.test(h)
        && /Světlíky „jiné" u dveří[^<]*vyj\.pas\./.test(h); },
    'B166: lišta zámku u aktivní zamčené varianty': () => {
      const el = document.getElementById('zamekLista');
      return !!el && /varianty\.1\.nazev/.test(el.innerHTML) && /varianty\.1\.zamek\.popis/.test(el.innerHTML); },
    'B150: dialog Kontakt… (úprava kontaktu cizího účtu)': () => ['onlineUzKTitul', 'onlineUzKFunkce', 'onlineUzKTelefon']
      .every(id => { const el = document.getElementById(id); return !!el && /__XSS\.push/.test(el.value); }),
  };
  const DALSI = {
    'firemní údaje (NAST.firma)': () => otrav(NAST.firma, 'NAST.firma'),
    'profil, seznam účtů': () => { otrav(ONLINE_STAV.ja, 'ja', c => !/email/.test(c));
      ONLINE_STAV.uzivatele = [ucet('u1'), ucet('u2')]; ONLINE_STAV.uzivateleNacteno = true; otrav(ONLINE_STAV.uzivatele, 'uzivatele', null, true);
      NAST.uzivatele = [ucet('u3')]; otrav(NAST.uzivatele, 'NAST.uzivatele', null, true); },
    'B150: dialog Kontakt… (úprava kontaktu cizího účtu)': () => {
      /* Správa účtů se kreslí jen online (stránka ze souboru = nouzový
       * režim). Online se tu jen předstírá; dotazy na server zůstanou
       * viset, aby nic nepřepsalo připravená data. */
      window.onlineMozne = () => true; window.fetch = () => new Promise(() => {});
      otrav(ONLINE_STAV.ja, 'ja', c => !/email|role/.test(c));
      ONLINE_STAV.uzivatele = [ucet('u1'), ucet('u2')]; ONLINE_STAV.uzivateleNacteno = true; otrav(ONLINE_STAV.uzivatele, 'uzivatele', null, true);
      ONLINE_STAV.kontaktPro = ONLINE_STAV.uzivatele[0].email; },
    'rejstřík zakázek': () => { ONLINE_STAV.rejstrik = [1, 2].map(i => Object.assign(uloRejstrikZaznam(ZAK, { soubor: 'zak' + i }), { autor: 'a@priklad.cz' }));
      otrav(ONLINE_STAV.rejstrik, 'rejstrik', null, true); },
    'kartotéka zákazníků': () => { const k = zakaznikNovy(); for (const q of Object.keys(k)) if (typeof k[q] === 'string') k[q] = 'x';
      k.ico = '12345678'; ZAK_DB.seznam = [k]; ZAK_DB.nacteno = true; ZAK_DB.hledat = 'x'; otrav(ZAK_DB.seznam, 'zakaznici'); otrav(ZAK_DB, 'ZAK_DB', c => /hledat|hlaska/.test(c)); },
    'zálohy, kolize, hlášky, verze serveru': () => { ONLINE_STAV.otisky = [{ den: '2026-09-01', porizena: '2026-09-01T01:00:00.000Z', zdroj: 'nocni', pocetZakazek: 3, pocetUctu: 2, kdo: 'x' }];
      ONLINE_STAV.otiskyNacteno = true; otrav(ONLINE_STAV.otisky, 'otisky', null, true);
      ONLINE_STAV.kolize = { soubor: 'x', kdo: 'x', naDisku: 'x', kdy: 'x' }; otrav(ONLINE_STAV.kolize, 'kolize');
      ONLINE_STAV.hlaska = PAY('hlaska'); ONLINE_STAV.soubor = PAY('soubor'); ONLINE_STAV.serverVerze = PAY('serverVerze');
      ONLINE_STAV.prostrediPopis = PAY('prostrediPopis'); ONLINE_STAV.razitko = PAY('razitko'); },
    'žádosti o schválení (cizí zakázky)': () => { SCHV_CIZI.stav = 'hotovo'; SCHV_CIZI.rozsah = 'vse';
      SCHV_CIZI.zadosti = [{ klic: 'z1', cast: 'ock', cislo: 'c', nazevAkce: 'n', variantaId: 'v1', variantaNazev: 'V', ridici: true, zamceno: false,
        upraveno: '2026-09-01T00:00:00.000Z', sleva: { procenta: 5, role: 'Obchodník', schema: 's', poznamka: 'p', stav: 'čeká na schválení',
        schvalil: 's', schvalilKdy: 'k', schvalenoProc: 0, zamitl: 'z', zamitlKdy: 'k', zamitnutoProc: 0, zamitnutoDuvod: 'd' } }];
      otrav(SCHV_CIZI.zadosti, 'schvalovani', null, true); },
    'standard OCK a schémata slev': () => { otrav(NAST.standard, 'standard', null, true); otrav(NAST.slevy.schemata, 'slevy.schemata'); },
    /* B124: firemní plán plateb (texty milníků katalogu) a číselník
     * dodatkových textů s jazykovými variantami (#379) — klíč i texty. */
    'B124: firemní plán plateb (katalog milníků)': () => {
      ZAK.cislo = '2026 - OVP - CN - 0999';   // P6: plán plateb PROJ jen u zakázky projekce
      const pc = ZAK.varianty[0].data.proj.cenik;
      ['sazby', 'fixy'].forEach(k => { const o = pc[k]; if (o) Object.keys(o).forEach(q => { if (typeof o[q] === 'number') o[q] = 1000; }); });
      NAST.firma.planPlatebProj = JSON.parse(JSON.stringify(PLAN_PROJ_VYCHOZI));
      otrav(NAST.firma.planPlatebProj.milniky, 'firma.planPlatebProj.milniky', c => /\.cz$/.test(c), true); },
    /* #401 (12. 10. 2026): zveřejněný slovník ze serveru. Překlady jdou do
     * HTML náhledů i do Wordu, razítko verze (kdo, poznámka, historie) do
     * Nastavení → Slovník. Otráví se VŠECHNY překlady i jedno heslo samo
     * a položí se TOUŽ cestou jako po přihlášení (onlineSlovnikPoloz → kontrola
     * tvaru → prekladImport); jazyk aplikace EN, aby se překládalo. */
    '#401: zveřejněný slovník (překlady a razítko verze)': () => {
      const hesla = {};
      Object.keys(PREKLAD).forEach((k, i) => { hesla[k] = [PAY('slovnik.en.' + i), PAY('slovnik.de.' + i), PAY('slovnik.fr.' + i)]; });
      hesla[PAY('slovnik.klic')] = [PAY('slovnik.klic.en'), '', ''];
      ONLINE_STAV.slovnik = { schema: 1, platny: { verze: 2, kdy: PAY('slovnik.kdy'), kdo: PAY('slovnik.kdo'),
        poznamka: PAY('slovnik.poznamka'), pocet: Object.keys(hesla).length, hesla },
        historie: [{ verze: 1, kdy: PAY('slovnik.h.kdy'), kdo: PAY('slovnik.h.kdo'), poznamka: PAY('slovnik.h.poznamka') }] };
      if (!onlineSlovnikPoloz(hesla)) throw new Error('otrávený slovník neprošel kontrolou tvaru — test by nic neověřil');
      /* cizojazyčná nabídka se tiskne v eurech — bez kurzu by se náhled nevytvořil */
      ZAK.varianty.forEach(v => { v.data.cenik.kurzEurKc = 25; if (v.data.proj && v.data.proj.cenik) v.data.proj.cenik.kurzEurKc = 25; });
      NAST.jazyk = 'en'; },
    'B124: číselník dodatků a jejich překlady': () => {
      const k1 = 'Sklo VSG s mléčnou fólií', k2 = PAY('popisy.klic');
      ONLINE_STAV.popisy = { texty: { [k1]: 'x', [k2]: 'y' }, jazyky: { [k1]: { en: 'e', de: 'd', fr: 'f' }, [k2]: { en: 'e' } },
        kdo: 'x', kdy: '2026-10-06T00:00:00.000Z' };
      otrav(ONLINE_STAV.popisy, 'popisy', c => !/^popisy\.(kdy)$/.test(c), true);
      if (typeof DEFAULT_CENIK !== 'undefined') { DEFAULT_CENIK.popisy = Object.assign({}, ONLINE_STAV.popisy.texty);
        DEFAULT_CENIK.popisyJazyky = JSON.parse(JSON.stringify(ONLINE_STAV.popisy.jazyky)); } },

    /* ---- SEC-M (27. 10. 2026): oblasti, které sada S1 nevykreslovala ---- */
    'SEC-M: controlling (skupiny, mapování, export, protokol, import)': () => {
      window.onlineMozne = () => true; window.fetch = () => new Promise(() => {});
      const v = ctrlVychozi();
      v.skupiny.forEach((s, i) => { s.nazev = PAY('ctrl.skupina.' + i); });
      v.skupiny.splice(0, 0, { id: 'secm-skupina', nazev: PAY('ctrl.nova') });
      Object.keys(v.mapa).slice(0, 5).forEach(k => { v.mapa[k] = 'secm-skupina'; });
      CTRL_STAV.db = { platny: { verze: PAY('ctrl.verze'), kdo: PAY('ctrl.kdo'), kdy: PAY('ctrl.kdy'), poznamka: PAY('ctrl.pozn'), data: v } };
      CTRL_STAV.nacteno = true; CTRL_STAV.data = ctrlUiUlozena(); CTRL_STAV.puvodni = '';
      CTRL_STAV.protokol = [{ kdy: '2026-10-01T00:00:00.000Z', kdo: PAY('ctrl.p.kdo'), od: PAY('ctrl.p.od'), do: PAY('ctrl.p.do'),
        oblast: PAY('ctrl.p.oblast'), rada: PAY('ctrl.p.rada'), pd: PAY('ctrl.p.pd'), zakazek: PAY('ctrl.p.zak'), radku: PAY('ctrl.p.radku'), stav: PAY('ctrl.p.stav') }];
      CTRL_STAV.import = { soubor: PAY('ctrl.imp.soubor'), zmeny: [{ druh: 'skupina', klic: PAY('ctrl.imp.klic'), z: PAY('ctrl.imp.z'), na: PAY('ctrl.imp.na') }],
        chyby: [PAY('ctrl.imp.chyba')], data: CTRL_STAV.data };
      CTRL_STAV.hledej = PAY('ctrl.hledej'); CTRL_STAV.hlaska = PAY('ctrl.hlaska'); CTRL_STAV.chyba = PAY('ctrl.chyba'); },
    'SEC-M: šablony online (rejstřík, historie, poznámky)': () => {
      window.onlineMozne = () => true; window.fetch = () => new Promise(() => {});
      const rec = (t) => ({ verze: 2, nazev: PAY('sabl.nazev.' + t), otisk: '0123456789abcdef', velikost: 10, zverejnil: PAY('sabl.kdo.' + t),
        kdy: PAY('sabl.kdy.' + t), poznamka: PAY('sabl.pozn.' + t) });
      const typy = {};
      SABLONY_ONLINE_TYPY.forEach(t => { typy[t] = { platna: rec(t), historie: [Object.assign(rec(t + '.h'), { verze: 1 })] };
        SABLONY_ONLINE_JAZYKY.forEach(l => { typy[t + '_' + l] = { platna: Object.assign(rec(t + '_' + l), { zdrojOtisk: '0123456789abcdef' }), historie: [] }; }); });
      ONLINE_STAV.sablonyRejstrik = { verze: 1, rezim: 'prisny', rezimZmenil: PAY('sabl.rezimZmenil'), rezimKdy: PAY('sabl.rezimKdy'), typy }; },
    'SEC-M: analytika (přehled, uživatelé, časy)': () => {
      const pocty = { zakazky: 1, kalkulace: 2, tiskyWord: 3, tiskyNahled: 4, prihlaseni: 5, chyby: 6 };
      const celkem = { pocty, zalozky: { [PAY('anl.zalozka')]: 3 }, kliky: { ['kalk|BUTTON|' + PAY('anl.klik')]: 2 },
        poUzivateli: { [PAY('anl.email')]: Object.assign({}, pocty, { zalozky: { [PAY('anl.u.zalozka')]: 1 }, kliky: {} }) } };
      ANL.prehled = { celkem, poMesicich: { '2026-10': celkem }, casy: { [PAY('anl.cas')]: { ock: 60, proj: 30 } }, dnu: 1,
        rezim: { sber: true, kdo: PAY('anl.rezim.kdo'), kdy: PAY('anl.rezim.kdy') } };
      ANL.prehledUzivatel = PAY('anl.email'); },
  };
  /* SEC-M: dokreslení oblastí, které mají víc karet (controlling) */
  const PO = {
    'SEC-M: controlling (skupiny, mapování, export, protokol, import)': async (pruh) => {
      for (const k of ['skupiny', 'mapa', 'export']) { CTRL_STAV.karta = k; try { nastPanel('controlling'); } catch (e) { throw new Error('controlling ' + k + ': ' + e.message); }
        pruh('controlling ' + k); await new Promise(r => setTimeout(r, 60)); window.__CTRL_HTML = (window.__CTRL_HTML || '') + (document.body.innerHTML.match(/ctrl\.[a-z.]+/g) || []).join(' '); } },
  };
  async function pokus(oblast, admin) {
    window.__XSS = [];
    const chyby = [];
    const z = zakazkaPlna(); const d = z.varianty[0].data;
    NAST.jeAdmin = admin; NAST.nahledRole = admin ? '' : 'Obchodník';
    ONLINE_STAV.bezi = true; ONLINE_STAV.sondaHotova = true;
    ONLINE_STAV.ja = { email: 'tester@priklad.cz', jmeno: 'Tester', titul: '', funkce: 'f', telefon: '', podpis: '',
                       role: admin ? 'Administrátor' : 'Obchodník' };
    if (OBLASTI[oblast]) OBLASTI[oblast](z, d);
    z.aktivni = z.__aktivni || z.varianty[0].id; delete z.__aktivni;
    try { ZAK = importZakazka(JSON.parse(JSON.stringify(z))); } catch (e) { chyby.push('importZakazka: ' + e.message); ZAK = z; }
    try { syncVarianta(); } catch (e) { chyby.push('syncVarianta: ' + e.message); }
    if (DALSI[oblast]) { try { DALSI[oblast](); } catch (e) { chyby.push('příprava dat: ' + e.message); } }
    /* render() výjimku sám chytá: vypíše pruh #render-chyba a znovu ji hodí
     * až ze setTimeout. try/catch kolem render() by ji tedy neviděl — čte se
     * pruh a zvenku (Playwright) se sbírají i chyby stránky. */
    const pruh = (kde) => { const el = document.getElementById('render-chyba');
      if (el && el.style.display !== 'none' && el.textContent.trim()) { chyby.push(kde + ': ' + el.textContent.trim().slice(0, 160)); el.style.display = 'none'; el.textContent = ''; } };
    let overeno = OVERENI[oblast] ? false : null;
    const over = (ramy) => { if (overeno === false) { try { overeno = !!OVERENI[oblast](ramy || []); } catch (e) { overeno = false; } } };
    for (const t of TABY) {
      try { prepniTab(t); render(); } catch (e) { chyby.push('záložka ' + t + ': ' + e.message); }
      pruh('záložka ' + t); over();
      await new Promise(r => setTimeout(r, 60));
    }
    try { otevriNastaveni(); } catch (e) { chyby.push('nastavení: ' + e.message); }
    for (const p of nastPanelyViditelne()) {
      try { nastPanel(p.id); } catch (e) { chyby.push('panel ' + p.id + ': ' + e.message); }
      pruh('panel ' + p.id); over();
      await new Promise(r => setTimeout(r, 40));
    }
    if (PO[oblast]) { try { await PO[oblast](pruh); } catch (e) { chyby.push('po: ' + e.message); } }
    /* B124: TISKOVÉ NÁHLEDY (nabídka OCK a PROJ, krycí listy, detail
     * výpočtu, porovnání variant). Otevírají se do nového okna — tady do
     * rámu v téže stránce, který sdílí window.__XSS, takže payload spuštěný
     * v náhledu se počítá stejně. Dialogy se odpovídají samy (potvrd → ano,
     * volba → první možnost), každý náhled má strop 4 s: zaseknutý náhled
     * je chyba vykreslení, ne nekonečné čekání (past overit_dialogy). */
    const ramy = [];
    const puvOpen = window.open, puv = { potvrd: window.potvrd, volba: window.volba, dotaz: window.dotaz, hlaska: window.hlaska };
    window.open = () => { const f = document.createElement('iframe'); f.style.display = 'none'; document.body.appendChild(f);
      f.contentWindow.__XSS = window.__XSS; f.__fn = window.__nahledFn; try { f.contentDocument.addEventListener('securitypolicyviolation', (e) => window.__CSP.push('náhled ' + e.violatedDirective + ' ' + String(e.blockedURI).slice(0, 60))); } catch (e) {} ramy.push(f); return f.contentWindow; };
    window.potvrd = async () => true; window.volba = async (t, m) => (m && m[0] && m[0].kod) || null;
    window.dotaz = async () => ''; window.hlaska = async () => undefined;
    /* Zábrany dokumentů (#377) se tu vypínají: zkouší se escapování, ne
     * kontrola zakázky — zakázka s payloadem by jinak náhled zastavila. */
    const puvZabrana = window.dokumentZabrana; window.dokumentZabrana = () => '';
    const NAHLEDY = [['nabidkaNahled'], ['nabidkaProjNahled'], ['kryciTiskPohled', 'bo'], ['kryciTiskPohled', 'techdata'],
      ['kryciProjTiskPohled', 'bo'], ['kryciProjTiskPohled', 'techdata'], ['detailTisk'], ['porovnaniTisk'], ['porovnaniPolozkyTisk']];
    for (const [fn, arg] of NAHLEDY) {
      if (typeof window[fn] !== 'function') { chyby.push('náhled ' + fn + ' neexistuje'); continue; }
      window.__nahledFn = fn + (arg ? '(' + arg + ')' : '');
      try {
        await Promise.race([Promise.resolve().then(() => window[fn](arg)),
          new Promise((_, ne) => setTimeout(() => ne(new Error('náhled se do 4 s nedokončil')), 4000))]);
      } catch (e) { chyby.push('náhled ' + fn + ': ' + e.message); }
    }
    window.open = puvOpen; Object.assign(window, puv); window.dokumentZabrana = puvZabrana;
    await new Promise(r => setTimeout(r, 300));
    over(ramy);
    let imgNahled = 0, hrefJsNahled = 0, vyskytuNahled = 0;
    for (const f of ramy) { const dd = f.contentDocument; if (!dd || !dd.documentElement) continue;
      imgNahled += dd.querySelectorAll('img[src="x"], svg[onload], details[ontoggle], iframe[src^="javascript:"], a[href^="javascript:"], [src^="javascript:"]').length + [...dd.querySelectorAll('script')].filter(s => /__XSS\\.push/.test(s.textContent)).length;
      hrefJsNahled += dd.querySelectorAll('a[href^="javascript:"], [src^="javascript:"]').length;
      vyskytuNahled += (dd.documentElement.innerHTML.match(/__XSS\.push/g) || []).length; }
    const img = document.querySelectorAll('img[src="x"], svg[onload], details[ontoggle], iframe[src^="javascript:"], a[href^="javascript:"], [src^="javascript:"]').length + [...document.querySelectorAll('script')].filter(s => /__XSS\\.push/.test(s.textContent)).length + imgNahled;
    const handlers = [];
    for (const el of [document, ...ramy.map(f => f.contentDocument).filter(Boolean)].flatMap(dd => [...dd.querySelectorAll('*')]))
      for (const a of el.attributes)
        if (/^on/i.test(a.name) && /(^|[^\\\\])'(\\);|-)window\\.__XSS\\.push\\(/.test(a.value))
          handlers.push(el.tagName.toLowerCase() + ' ' + a.name + '="' + a.value.slice(0, 100) + '…"');
    const hrefJs = document.querySelectorAll('a[href^="javascript:"], [src^="javascript:"]').length + hrefJsNahled;
    /* Kolikrát se payload (escapovaný) ve stránce vůbec objevil. Nula by
     * znamenala, že se oblast nikde nekreslí — a kontrola by byla prázdná. */
    const vyskytu = (document.documentElement.innerHTML.match(/__XSS\.push/g) || []).length;
    return { csp: (window.__CSP || []).slice(0, 4), cspN: (window.__CSP || []).length, ctrlHtml: (window.__CTRL_HTML || '').slice(0, 300), xss: [...new Set(window.__XSS)], img, handlers: handlers.slice(0, 5), hrefJs, chyby, vyskytu, vyskytuNahled, nahledu: ramy.length, nahledy: ramy.map(f => f.__fn), overeno };
  }
  return { OBLASTI: Object.keys(OBLASTI), DALSI: Object.keys(DALSI), pokus };
`;
/* Payloady. Každý nese ZNAČKU CESTY (c) — výpis řekne, které pole uteklo. */
const VARIANTY_SRC = `{
  V0: (c) => "');window.__XSS.push('" + c + "');//\\"><img src=x onerror=\\"window.__XSS.push('" + c + "')\\">",
  V1: (c) => "'-window.__XSS.push('" + c + "')-'\\"><svg onload=\\"window.__XSS.push('" + c + "')\\"></svg><details open ontoggle=\\"window.__XSS.push('" + c + "')\\"></details>",
  V2: (c) => "</textarea></title></style></script><script>window.__XSS.push('" + c + "')</script><iframe src=\\"javascript:parent.__XSS.push('" + c + "')\\"></iframe><a href=\\"javascript:window.__XSS.push('" + c + "')\\">a</a>",
  V3: (c) => "javascript:window.__XSS.push('" + c + "') {{FIRMA_ICO}}{{CISLO}}\${x}</w:t></w:r><w:r><w:t>INJ]]><!--\\u0000\\u0001\\u0008\\u000b\\u000c\\u001f\\u007f\\u2028\\u2029\\ufffe\\uffff\\ud800-->",
  V4: (c) => "');window.__XSS.push('" + c + "');//\\"><img src=x onerror=\\"window.__XSS.push('" + c + "')\\">",
}`;
const POPIS_V = { V0: 'img/onerror + uzavření řetězce (S1)', V1: "svg/onload, details/ontoggle, '-…-'", V2: '</script><script>, iframe/a javascript:',
  V3: 'javascript: URL, {{…}}, </w:t>, ]]>, řídicí znaky', V4: 'V0 i do řídicích polí' };
const SEZNAM_SRC = KOD_STRANKY;   // kód stránky (oblasti, pokus)
const JEN_ADMIN = /controlling|šablony online|analytika|Kontakt|B187/;

async function pokusV(b, varianta, oblast, admin) {
  const ctx = await kontext(b);
  const p = await ctx.newPage();
  const chybyStranky = [], dialogy = [], konzoleCsp = [];
  p.on('pageerror', e => chybyStranky.push(String(e && e.message || e).slice(0, 160)));
  p.on('dialog', d => { dialogy.push(d.type() + ': ' + d.message().slice(0, 80)); d.dismiss().catch(() => {}); });
  p.on('console', m => { if (/Content Security Policy|Refused to/i.test(m.text())) konzoleCsp.push(m.text().slice(0, 160)); });
  const pred = venku.length;
  await p.goto('http://kng.test/kalkulacka.html');
  await p.waitForFunction(() => typeof render === 'function' && typeof novaZakazka === 'function', null, { timeout: 20000 });
  await p.waitForTimeout(300);
  /* Kód se vyhodnocuje jako výraz (Runtime.evaluate), ne přes new Function —
   * CSP stránky 'unsafe-eval' nepovoluje a sama aplikace ho nepotřebuje. */
  const vyraz = `(async () => { window.__XSS = []; window.__PAYF = (${VARIANTY_SRC})[${JSON.stringify(varianta)}];
    window.__BEZ_SKIP = ${varianta === 'V4'};
    const { pokus } = (() => { ${SEZNAM_SRC.replace(/^const KOD_STRANKY = `|`;$/g, '')} })();
    return await pokus(${JSON.stringify(oblast)}, ${admin}); })()`;
  let r;
  try { r = await p.evaluate(vyraz); } catch (e) { r = { xss: [], img: 0, handlers: [], hrefJs: 0, chyby: ['evaluate: ' + e.message.slice(0, 200)], vyskytu: 0, nahledu: 0, nahledy: [] }; }
  await p.waitForTimeout(150);
  r.dialogy = dialogy; r.venku = venku.slice(pred); r.konzoleCsp = konzoleCsp;
  r.chyby.push(...chybyStranky.map(x => 'chyba stránky: ' + x));
  await ctx.close();
  return r;
}

const b = await chromium.launch();
/* Seznam oblastí z kódu stránky. */
let OBLASTI;
{
  const ctx = await kontext(b); const p = await ctx.newPage();
  await p.goto('http://kng.test/kalkulacka.html');
  await p.waitForFunction(() => typeof render === 'function', null, { timeout: 20000 });
  OBLASTI = await p.evaluate(`(() => { window.__PAYF = (c) => c; const o = (() => { ${SEZNAM_SRC.replace(/^const KOD_STRANKY = `|`;$/g, '')} })(); return [...o.OBLASTI, ...o.DALSI]; })()`);
  await ctx.close();
}
const VARIANTY = (process.env.KNG_VARIANTY || 'V0,V1,V2,V3,V4').split(',');
const ROLE = [false, true];
const ulohy = [];
for (const v of VARIANTY) for (const admin of ROLE) for (const o of OBLASTI) ulohy.push([v, o, admin]);
console.log(`Oblastí ${OBLASTI.length}, variant ${VARIANTY.length}, rolí 2 → ${ulohy.length} vykreslení (každé: 13 záložek, panely Nastavení, 9 tiskových náhledů)`);
const SOUBEH = +(process.env.KNG_SOUBEH || 4);
let hotovo = 0; const vysl = [];
async function pracuj() { while (ulohy.length) { const u = ulohy.shift(); const r = await pokusV(b, ...u); vysl.push([u, r]); hotovo++; if (hotovo % 20 === 0) console.log(`  … ${hotovo} hotovo`); } }
await Promise.all(Array.from({ length: SOUBEH }, pracuj));
vysl.sort((a, b) => (a[0][0] + a[0][2] + a[0][1]).localeCompare(b[0][0] + b[0][2] + b[0][1]));
let cspCelkem = 0; const cspVzorky = new Set();
for (const [[v, oblast, admin], r] of vysl) {
  const role = admin ? 'administrátor' : 'obchodník';
  const jm = `${v} ${role}: ${oblast}`;
  zkus(`${jm} — nic se nespustilo (značka, dialog)`, r.xss.length === 0 && r.dialogy.length === 0, 'spustilo se: ' + r.xss.join(', ') + ' | dialogy: ' + r.dialogy.join(', '));
  zkus(`${jm} — v DOM ani v náhledech není vložený prvek z payloadu (img/svg/details/script/iframe/javascript:)`, r.img === 0 && r.hrefJs === 0, `prvky=${r.img}, javascript:=${r.hrefJs}`);
  zkus(`${jm} — žádný on*="…" s neescapovaným payloadem`, r.handlers.length === 0, r.handlers.join(' | '));
  zkus(`${jm} — žádný požadavek mimo kng.test`, r.venku.length === 0, r.venku.join(', '));
  zkus(`${jm} — vykreslení nespadlo`, r.chyby.length === 0, r.chyby.join(' | '));
  if (admin || !JEN_ADMIN.test(oblast))
    zkus(`${jm} — payload se do stránky dostal (${r.vyskytu}×, v náhledech ${r.vyskytuNahled}×)`, r.vyskytu > 0 || r.vyskytuNahled > 0, r.vyskytu);
  zkus(`${jm} — tiskové náhledy se otevřely (${r.nahledu})`, r.nahledu === (/^B124: .*plán plateb/.test(oblast) ? 8 : 9), (r.nahledy || []).join(', '));
  if (r.overeno !== null && r.overeno !== undefined && (admin || !JEN_ADMIN.test(oblast)))
    zkus(`${jm} — otrávená pole se opravdu vykreslila`, r.overeno === true, r.overeno);
  if (/controlling/.test(oblast) && admin) zkus(`${jm} — karty controllingu vykreslily otrávená data`, /ctrl\.skupina|ctrl\.nova/.test(r.ctrlHtml || ''), r.ctrlHtml);
  cspCelkem += (r.cspN || 0) + (r.konzoleCsp || []).length; (r.csp || []).concat(r.konzoleCsp || []).forEach(x => cspVzorky.add(x.slice(0, 120)));
}
console.log(`\nHlášení CSP během vykreslování: ${cspCelkem}${cspVzorky.size ? ' — ' + [...cspVzorky].slice(0, 8).join(' | ') : ''}`);
console.log('Požadavky mimo kng.test celkem: ' + venku.length + (venku.length ? ' — ' + [...new Set(venku)].slice(0, 5).join(', ') : ''));
for (const v of VARIANTY) {
  const n = vysl.filter(x => x[0][0] === v).length;
  console.log(`  ${v} (${POPIS_V[v]}): ${n} vykreslení`);
}

/* Sonda na sobě (pod CSP): payload vložený syrově do stránky se spustí —
 * jinak by všechny kontroly výš prošly vždycky. */
{
  const ctx = await kontext(b); const p = await ctx.newPage();
  await p.goto('http://kng.test/kalkulacka.html'); await p.waitForTimeout(500);
  const n = await p.evaluate(async (src) => {
    window.__XSS = [];
    const V = (0, eval)('(' + src + ')');   // jen pro sondu; pod CSP selže → použije se ruční tvar
    return V; }, VARIANTY_SRC).catch(() => null);
  const s = await p.evaluate(async () => {
    window.__XSS = [];
    const d = document.createElement('div');
    d.innerHTML = `"><img src=x onerror="window.__XSS.push('sonda-img')"><svg onload="window.__XSS.push('sonda-svg')"></svg><details open ontoggle="window.__XSS.push('sonda-det')"></details>`;
    document.body.appendChild(d);
    const f = document.createElement('iframe'); f.style.display = 'none'; document.body.appendChild(f);
    f.contentWindow.__XSS = window.__XSS;
    f.contentDocument.open(); f.contentDocument.write(`<p></script><script>window.__XSS.push('sonda-script-v-nahledu')<\/script>`); f.contentDocument.close();
    await new Promise(res => setTimeout(res, 400));
    return [...new Set(window.__XSS)];
  });
  await ctx.close();
  zkus('(sonda) pod produkční CSP se syrový payload opravdu spustí (img, svg, details, <script> v náhledu)', s.length === 4, s.join(', '));
  zkus('(sonda) CSP zakazuje eval — kód sady proto běží jako výraz Runtime.evaluate', n === null, String(n));
}
await b.close();
console.log(`\n${ok} OK, ${fail} FAIL`);
console.log(fail ? 'VÝSLEDEK: FAIL — ' + failMista.slice(0, 10).join(' | ') : `VÝSLEDEK: ${ok} OK / 0 FAIL — uložené XSS se nespustilo v žádné oblasti, roli, variantě payloadu ani v tiskových náhledech`);
process.exit(fail ? 1 : 0);
