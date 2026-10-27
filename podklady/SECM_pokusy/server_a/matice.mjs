/* SEC-M / čočka server-A — AUTOMATICKÁ MATICE OPRÁVNĚNÍ.
 *
 * Projde každou API cestu (26 funkcí netlify/functions/*.mjs), všechny její
 * metody/akce/podcesty × role (anonym, Obchodník, Vedoucí, Administrátor
 * vedlejší, hlavní správce = ADMIN_EMAIL) × vlastní/cizí zdroj a zapíše
 * SKUTEČNÝ HTTP kód. Vedle toho spočítá OČEKÁVANÝ kód ze záměru kódu; při
 * odchylce buňku označí „✗". Výstup: tabulka na stdout a do matice.md.
 *
 * Jen smyšlené účty, úložiště v paměti, síť zakázaná (dědí z harness.mjs).
 * Pipedrive není nastavené (chybí PD token) → pd_* vrací nastaveno:false,
 * ale ověření přihlášení/původu/matice proběhne.
 *
 * Spuštění z kořene repa:  node podklady/SECM_pokusy/server_a/matice.mjs
 */
import { F, S, req, prihlas, priprav, pripravData, HESLO_ADMIN } from '../../S1_pokusy/server/harness.mjs';
import { writeFileSync } from 'node:fs';
const zaloha_nocni = (await import('../../../netlify/functions/zaloha_nocni.mjs')).default;

/* --- příprava účtů a dat --- */
const U = await priprav();                 // admin(hlavní), admin2(vedlejší), ved, obch, obch2
await pripravData(U.admin.cookie);

/* Vlastní zakázka obchodníka obch a cizí zakázka (autor obch2) + zákazníci. */
async function ulozZakazku(cookie, cislo, autorCookie) {
  const z = { cislo, nazevAkce: 'Pokus ' + cislo, varianty: [] };
  const r = await (await req(F.zakazky, 'POST', '/api/zakazky', { zakazka: z }, cookie)).json();
  return r;
}
await ulozZakazku(U.obch.cookie, '2026-OCK-CN-0001');    // vlastní obch
await ulozZakazku(U.obch2.cookie, '2026-OCK-CN-0002');   // cizí (autor obch2)
/* zjisti jméno souboru cizí zakázky z rejstříku */
const rej = await (await req(F.zakazky, 'GET', '/api/zakazky', undefined, U.admin.cookie)).json();
const soubory = (rej.rejstrik && rej.rejstrik.zakazky || []).map(z => z.soubor);
const SOUBOR_VLASTNI = soubory.find(s => s.includes('0001')) || '2026-OCK-CN-0001';
const SOUBOR_CIZI = soubory.find(s => s.includes('0002')) || '2026-OCK-CN-0002';

/* zákazník */
await req(F.zakaznici, 'POST', '/api/zakaznici', { zakaznik: { nazev: 'Pokusná firma s.r.o.', ico: '12345678' } }, U.obch2.cookie);
const zl = await (await req(F.zakaznici, 'GET', '/api/zakaznici', undefined, U.admin.cookie)).json();
const KLIC_ZAK = (zl.zakaznici && zl.zakaznici[0] && (zl.zakaznici[0].ico || zl.zakaznici[0].nazev)) ? (await (async()=>{ const g=(await import('../../../netlify/lib/zakaznici_modul.cjs')).default; return g.zakaznikKlic(zl.zakaznici[0]); })()) : '12345678';

const ROLE_SLOUPCE = ['anon', 'obch', 'ved', 'admin2', 'admin'];
const COOKIE = { anon: null, obch: U.obch.cookie, ved: U.ved.cookie, admin2: U.admin2.cookie, admin: U.admin.cookie };

/* Očekávané kódy podle záměru kódu.
 * typ:
 *  'prihl'  — stačí přihlášení (vyzadujRoli bez role): anon 401, ostatní OK
 *  'admin'  — jen Administrátor: anon 401, obch/ved 403, admin2/admin OK
 *  'metoda' — špatná metoda → 405 pro všechny (kontrola metody je PŘED auth)
 *  'anon'   — veřejné (zdravi): vše OK
 * ok = kód při úspěchu (default 200). Pro mutace s chybným/prázdným vstupem lze dát 400 apod. */
function ocekFn(typ, ok = 200) {
  return (role) => {
    if (typ === 'anon') return ok;
    if (typ === 'metoda') return 405;
    if (role === 'anon') return 401;
    if (typ === 'prihl') return ok;
    if (typ === 'admin') return (role === 'admin2' || role === 'admin') ? ok : 403;
    return ok;
  };
}

/* Řádky matice: [popis, fn, metoda, url, telo|undefined, ocek(role)->kód, pozn] */
const R = [];
const add = (popis, fn, metoda, url, telo, ocek, pozn = '') => R.push({ popis, fn, metoda, url, telo, ocek, pozn });

/* ===== PŘIHLÁŠENÍ / ODHLÁŠENÍ / JÁ / ZDRAVÍ ===== */
add('prihlaseni POST (správné heslo obch)', F.prihlaseni, 'POST', '/api/prihlaseni', { email: U.obch.email, heslo: U.obch.heslo },
  () => 200, 'anon se přihlásí; přihlášený také (bez cookie kontroly)');
add('prihlaseni GET (špatná metoda)', F.prihlaseni, 'GET', '/api/prihlaseni', undefined, ocekFn('metoda'));
add('odhlaseni POST', F.odhlaseni, 'POST', '/api/odhlaseni', {}, () => 200, 'anon bez relace 200 (jen smaže cookie)');
add('odhlaseni GET (špatná metoda)', F.odhlaseni, 'GET', '/api/odhlaseni', undefined, ocekFn('metoda'));
add('ja GET', F.ja, 'GET', '/api/ja', undefined, ocekFn('prihl'));
add('zdravi GET (veřejné)', F.zdravi, 'GET', '/api/zdravi', undefined, ocekFn('anon'));

/* ===== ZAKÁZKY ===== */
add('zakazky GET rejstřík', F.zakazky, 'GET', '/api/zakazky', undefined, ocekFn('prihl'));
add('zakazky GET vlastní', F.zakazky, 'GET', '/api/zakazky?soubor=' + SOUBOR_VLASTNI, undefined, ocekFn('prihl'));
add('zakazky GET CIZÍ (IDOR čtení)', F.zakazky, 'GET', '/api/zakazky?soubor=' + SOUBOR_CIZI, undefined, ocekFn('prihl'),
  'sdílená DB: čtení cizí zakázky je záměr (#103)');
add('zakazky POST uložení', F.zakazky, 'POST', '/api/zakazky', { zakazka: { cislo: '2026-OCK-CN-0009', nazevAkce: 'X', varianty: [] } }, ocekFn('prihl'),
  'zápis smí každý přihlášený (sdílená DB)');
add('zakazky POST přepis CIZÍ (IDOR zápis)', F.zakazky, 'POST', '/api/zakazky', { zakazka: { cislo: '2026-OCK-CN-0002', nazevAkce: 'PREPSANO', varianty: [] } }, ocekFn('prihl'),
  'přepis cizí zakázky obchodníkem je záměr (sdílená DB)');
add('zakazky DELETE CIZÍ (IDOR mazání)', F.zakazky, 'DELETE', '/api/zakazky?soubor=' + SOUBOR_CIZI, undefined, ocekFn('admin'),
  'mazat smí jen admin → obch/ved 403');
add('zakazky PUT (špatná metoda)', F.zakazky, 'PUT', '/api/zakazky', {}, (role) => role === 'anon' ? 401 : 405,
  'metoda se kontroluje až po vyzadujRoli → anon 401');

/* ===== ZÁKAZNÍCI ===== */
add('zakaznici GET seznam', F.zakaznici, 'GET', '/api/zakaznici', undefined, ocekFn('prihl'));
add('zakaznici GET CIZÍ karta', F.zakaznici, 'GET', '/api/zakaznici?klic=' + encodeURIComponent(KLIC_ZAK), undefined, ocekFn('prihl'));
add('zakaznici POST uložení', F.zakaznici, 'POST', '/api/zakaznici', { zakaznik: { nazev: 'Druhá firma', ico: '87654321' } }, ocekFn('prihl'));
add('zakaznici DELETE CIZÍ (IDOR)', F.zakaznici, 'DELETE', '/api/zakaznici?klic=' + encodeURIComponent(KLIC_ZAK), undefined, ocekFn('admin'),
  'mazat smí jen admin');

/* ===== UŽIVATELÉ ===== */
add('uzivatele GET seznam', F.uzivatele, 'GET', '/api/uzivatele', undefined, ocekFn('admin'));
add('uzivatele POST mojeheslo (špatné staré)', F.uzivatele, 'POST', '/api/uzivatele', { akce: 'mojeheslo', stare: 'SpatneHeslo', nove: 'NoveHeslo123' },
  (role) => role === 'anon' ? 401 : 401, 'přihlášený: staré nesouhlasí → 401; anon → 401 (nepřihlášen)');
add('uzivatele POST profil VLASTNÍ', F.uzivatele, 'POST', '/api/uzivatele', { akce: 'profil', jmeno: 'Novy Nazev' }, ocekFn('prihl'));
add('uzivatele POST profil CIZÍ (IDOR)', F.uzivatele, 'POST', '/api/uzivatele', { akce: 'profil', email: U.obch2.email, jmeno: 'Hack' },
  (role) => role === 'anon' ? 401 : (role === 'admin2' || role === 'admin') ? 200 : 403, 'cizí profil jen admin');
add('uzivatele POST role (povýšení obch→admin bez hesla správce)', F.uzivatele, 'POST', '/api/uzivatele', { akce: 'role', email: U.obch.email, role: 'Administrátor' },
  (role) => role === 'anon' ? 401 : (role === 'obch' || role === 'ved') ? 403 : 401, 'admin bez hesloSpravce → 401 (kód hesloSpravce)');
add('uzivatele POST zaloz (bez hesloSpravce admin role)', F.uzivatele, 'POST', '/api/uzivatele', { akce: 'zaloz', email: 'novy@example.com', role: 'Obchodník', heslo: 'HesloHeslo1', jmeno: 'N' },
  ocekFn('admin'), 'obch/ved 403; admin založí Obchodníka (bez hesla správce)');
add('uzivatele DELETE (špatná metoda)', F.uzivatele, 'DELETE', '/api/uzivatele', undefined, (role) => role === 'anon' ? 401 : 405);

/* ===== OBNOVA / ZÁLOHY ===== */
add('obnova POST', F.obnova, 'POST', '/api/obnova', { akce: 'stav' }, ocekFn('admin'));
add('obnova GET (špatná metoda)', F.obnova, 'GET', '/api/obnova', undefined, (role) => role === 'anon' ? 401 : 405);
add('zaloha GET (stažení DB)', F.zaloha, 'GET', '/api/zaloha', undefined, ocekFn('admin'));
add('zaloha_vynuceno GET', F.zaloha_vynuceno, 'GET', '/api/zaloha_vynuceno', undefined, ocekFn('admin'));
add('zaloha_vynuceno POST (otisk)', F.zaloha_vynuceno, 'POST', '/api/zaloha_vynuceno', {}, ocekFn('admin'));
add('zaloha_nocni PŘÍMÉ zavolání (bez plánovače)', zaloha_nocni, 'GET', '/api/zaloha_nocni', undefined, () => 'N/A',
  'nemá config.path; handler nemá žádnou kontrolu — viz SEC-I2');

/* ===== PROGRAM / FIRMA / ZOBRAZENÍ / POPISY / SLOVNÍK / ŠABLONY / CONTROLLING / ANALYTIKA ===== */
add('program GET', F.program, 'GET', '/api/program', undefined, ocekFn('prihl'));
add('program POST zveřejnit ceník', F.program, 'POST', '/api/program', { cenik: {} }, (role) => role === 'anon' ? 401 : (role === 'obch' || role === 'ved') ? 403 : 400,
  'admin: tělo bez platného ceníku → 400 (auth prošla)');
add('firma GET', F.firma, 'GET', '/api/firma', undefined, ocekFn('prihl'));
add('firma POST', F.firma, 'POST', '/api/firma', { udaje: {} }, (role) => role === 'anon' ? 401 : (role === 'obch' || role === 'ved') ? 403 : 400);
add('zobrazeni GET', F.zobrazeni, 'GET', '/api/zobrazeni', undefined, ocekFn('prihl'));
add('zobrazeni POST (bez hesla správce)', F.zobrazeni, 'POST', '/api/zobrazeni', { matice: {} }, (role) => role === 'anon' ? 401 : (role === 'obch' || role === 'ved') ? 403 : 401,
  'změna matice chce hesloSpravce (B168) → admin bez něj 401');
add('popisy GET', F.popisy, 'GET', '/api/popisy', undefined, ocekFn('prihl'));
add('popisy GET ?sber=1 (jen admin)', F.popisy, 'GET', '/api/popisy?sber=1', undefined, ocekFn('admin'));
add('popisy POST', F.popisy, 'POST', '/api/popisy', { popisy: {} }, ocekFn('admin'));
add('slovnik GET', F.slovnik, 'GET', '/api/slovnik', undefined, ocekFn('prihl'));
add('slovnik POST (nic se neliší)', F.slovnik, 'POST', '/api/slovnik', { prepisy: {} }, (role) => role === 'anon' ? 401 : (role === 'obch' || role === 'ved') ? 403 : 400);
add('sablony GET rejstřík', F.sablony, 'GET', '/api/sablony', undefined, ocekFn('prihl'));
add('sablony POST rezim', F.sablony, 'POST', '/api/sablony', { akce: 'rezim', rezim: 'prisny' }, ocekFn('admin'));
add('controlling GET', F.controlling, 'GET', '/api/controlling', undefined, ocekFn('admin'));
add('controlling POST (nic se neliší)', F.controlling, 'POST', '/api/controlling', { data: {} }, (role) => role === 'anon' ? 401 : (role === 'obch' || role === 'ved') ? 403 : 400);
add('controlling/export GET (nákupní ceny)', F.controlling_export, 'GET', '/api/controlling/export?vse=1&oblast=obe&rada=obe&pd=vse', undefined, ocekFn('admin'));
add('analytika GET ?akce=rezim', F.analytika, 'GET', '/api/analytika?akce=rezim', undefined, ocekFn('prihl'));
add('analytika GET souhrn (jen admin)', F.analytika, 'GET', '/api/analytika', undefined, ocekFn('admin'));
add('analytika POST udalosti', F.analytika, 'POST', '/api/analytika', { akce: 'udalosti' }, ocekFn('prihl'));
add('analytika POST rezim (jen admin)', F.analytika, 'POST', '/api/analytika', { akce: 'rezim', sber: true }, ocekFn('admin'));

/* ===== VÝPOČET ===== */
add('vypocet POST', F.vypocet, 'POST', '/api/vypocet', { zakazka: {}, program: {} }, (role) => role === 'anon' ? 401 : 400,
  'přihlášený s prázdným vstupem → 400; anon → 401');
add('vypocet GET (špatná metoda)', F.vypocet, 'GET', '/api/vypocet', undefined, ocekFn('metoda'));

/* ===== PIPEDRIVE (nastaveno:false, ale ověří auth/původ/matici) ===== */
add('pd/deal GET', F.pd_deal, 'GET', '/api/pd/deal?id=1', undefined, (role) => role === 'anon' ? 401 : (role === 'admin2' || role === 'admin') ? 200 : 403,
  'právo crm.pipedrive: admin vždy; obch/ved bez přidělení 403');
add('pd/dealy GET', F.pd_dealy, 'GET', '/api/pd/dealy', undefined, (role) => role === 'anon' ? 401 : (role === 'admin2' || role === 'admin') ? 200 : 403);
add('pd/pole GET', F.pd_pole, 'GET', '/api/pd/pole', undefined, (role) => role === 'anon' ? 401 : (role === 'admin2' || role === 'admin') ? 200 : 403);
add('pd/stav GET (bezPrava — vidí každý přihl.)', F.pd_stav, 'GET', '/api/pd/stav?soubor=' + SOUBOR_VLASTNI, undefined, ocekFn('prihl'),
  'bezPrava:true → stačí přihlášení + vidět zakázku');

/* --- spuštění --- */
function kodZ(r) { return r.status; }
const radky = [];
let odchylek = 0;
for (const row of R) {
  const bunky = {};
  for (const role of ROLE_SLOUPCE) {
    let kod;
    try {
      const r = await req(row.fn, row.metoda, row.url, row.telo, COOKIE[role]);
      kod = kodZ(r);
    } catch (e) { kod = 'ERR:' + (e && e.message || e).slice(0, 30); }
    const ocek = row.ocek(role);
    const shoda = (ocek === 'N/A') || (kod === ocek);
    if (!shoda) odchylek++;
    bunky[role] = { kod, ocek, shoda };
  }
  radky.push({ popis: row.popis, pozn: row.pozn, bunky });
}

/* --- výstup tabulky --- */
let md = '# SEC-M — Matice oprávnění (server-A)\n\n';
md += 'Automaticky vyrobeno `podklady/SECM_pokusy/server_a/matice.mjs` nad `main` (v25.10.1).\n';
md += 'Buňka = skutečný HTTP kód. `✗` = odchylka od očekávaného kódu (očekávaný v závorce).\n';
md += 'Role: anon = nepřihlášen, obch = Obchodník, ved = Vedoucí, admin2 = Administrátor (vedlejší), admin = hlavní správce (ADMIN_EMAIL).\n';
md += 'Pipedrive není nastavené (nastaveno:false), ale přihlášení/původ/matice se ověří.\n\n';
md += '| Cesta + metoda/akce | anon | obch | ved | admin2 | admin | poznámka |\n';
md += '|---|---|---|---|---|---|---|\n';
for (const r of radky) {
  const c = (role) => {
    const b = r.bunky[role];
    if (b.ocek === 'N/A') return String(b.kod);
    return b.shoda ? String(b.kod) : (b.kod + ' ✗(' + b.ocek + ')');
  };
  md += '| ' + r.popis + ' | ' + c('anon') + ' | ' + c('obch') + ' | ' + c('ved') + ' | ' + c('admin2') + ' | ' + c('admin') + ' | ' + (r.pozn || '') + ' |\n';
}
md += '\n**Řádků: ' + radky.length + ', odchylek od očekávání: ' + odchylek + '.**\n';

writeFileSync(new URL('./matice.md', import.meta.url), md);
console.log(md);
console.log('VÝSLEDEK: matice vyrobena, ' + radky.length + ' řádků, ' + odchylek + ' odchylek od očekávaného kódu.');
