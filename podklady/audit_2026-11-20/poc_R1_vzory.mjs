/* PoC čočky R1 (regrese B-nálezů) — VZOROVÉ OPRAVY NAPŘÍČ VŠEMI FUNKCEMI.
 *
 * Staré nálezy B17/B78/B159 (cizí původ), B131 (tělo null/pole/číslo → 500),
 * B57 (anonymní /api/zdravi, /api/ja pro obchodníka) a B17 (odhlášení jen POST)
 * byly opravené po jednotlivých funkcích. Funkce přibývají (pd_organizace,
 * pd_vazba, pd_webhook, funkce, zaloha_disk, zaloha_vynuceno, controlling…),
 * takže se tu táž sonda pustí na VŠECHNY soubory netlify/functions/*.mjs.
 *
 * Lokálně, paměťové úložiště, žádná síť (fetch je zaslepený a počítá volání).
 * Spuštění: node podklady/audit_2026-11-20/poc_R1_vzory.mjs
 * Výpis končí „ODOLNÉ“ nebo „ZRANITELNÉ“. */
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
let sit = 0;
globalThis.fetch = async () => { sit++; throw new Error('síť je v PoC zaslepená'); };

import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const KOREN = resolve(dirname(fileURLToPath(import.meta.url)), '../../netlify');
const { ADMIN_EMAIL, aktivitaDobehni } = await import(pathToFileURL(resolve(KOREN, 'lib/sdilene.mjs')).href);
const jmena = readdirSync(resolve(KOREN, 'functions')).filter(f => f.endsWith('.mjs')).map(f => f.slice(0, -4)).sort();
const F = {};
for (const j of jmena) F[j] = (await import(pathToFileURL(resolve(KOREN, 'functions', j + '.mjs')).href)).default;

const HOST = 'kalk.priklad.cz';
const pozadavek = (j, metoda, telo, hl) => new Request('http://' + HOST + '/api/' + j, { method: metoda,
  headers: Object.assign({ host: HOST }, hl || {}), body: metoda === 'GET' ? undefined : telo });
async function zavolej(j, metoda, telo, hl) {
  try { const r = await F[j](pozadavek(j, metoda, telo, hl)); let t = ''; try { t = await r.text(); } catch (e) {}
    return { status: r.status, text: t.slice(0, 160) }; }
  catch (e) { return { status: 'VÝJIMKA', text: String(e && e.message).slice(0, 160) }; }
}
const cookieZ = (r) => (r.headers.get('set-cookie') || '').split(';')[0];
const rp = await F.prihlaseni(pozadavek('prihlaseni', 'POST', JSON.stringify({ email: ADMIN_EMAIL, heslo: 'Docasne.Heslo.123' }),
  { 'content-type': 'application/json' }));
const cAdmin = cookieZ(rp);
if (!cAdmin) { console.log('Přihlášení správce selhalo — PoC nejde vyhodnotit.'); process.exit(2); }
const rz = await zavolej('uzivatele', 'POST', JSON.stringify({ akce: 'zaloz', email: 'obchodnik.r1@priklad.cz', jmeno: 'Obchodník Zkušební',
  role: 'Obchodník', heslo: 'ZkusebniHeslo1' }), { cookie: cAdmin, 'content-type': 'application/json' });
const ro = await F.prihlaseni(pozadavek('prihlaseni', 'POST', JSON.stringify({ email: 'obchodnik.r1@priklad.cz', heslo: 'ZkusebniHeslo1' }),
  { 'content-type': 'application/json' }));
const cObch = cookieZ(ro);

let zranitelne = 0; const radky = [];
const zapis = (ok, co, info) => { if (!ok) zranitelne++; radky.push((ok ? 'OK    ' : 'NÁLEZ ') + co + (info ? '  ' + JSON.stringify(info) : '')); };
/* Stav úložiště bez počítadel pokusů a bez času aktivity (#ON — vedlejší zápis každého volání). */
const otisk = () => JSON.stringify([...pamet.entries()].filter(([k]) => !/^(aktivita|pokusy)\//.test(k)).sort());

/* ---- B131: tělo JSON null / pole / číslo / text → nikdy 500 ani výjimka ---- */
const BEZ_POZADAVKU = new Set(['zaloha_nocni']);   // plánovaná funkce bez požadavku
for (const j of jmena) {
  if (BEZ_POZADAVKU.has(j) || j === 'odhlaseni') continue;   // odhlášení by zrušilo relace sondy (má vlastní oddíl níž)
  for (const telo of ['null', '[]', '5', '"x"', '{"a":null}', 'neni json']) {
    for (const [kdo, c] of [['správce', cAdmin], ['obchodník', cObch], ['anonym', '']]) {
      const r = await zavolej(j, 'POST', telo, Object.assign({ 'content-type': 'application/json' }, c ? { cookie: c } : {}));
      const spatne = r.status === 'VÝJIMKA' || (typeof r.status === 'number' && r.status >= 500 && r.status !== 503);
      if (spatne) zapis(false, 'B131 ' + j + ' POST ' + telo + ' (' + kdo + ')', r);
    }
  }
}
zapis(true, 'B131: ' + (jmena.length - BEZ_POZADAVKU.size) + ' funkcí × 6 těl × 3 role prošlo sondou (nálezy výš, jsou-li)');

/* ---- B17 / B159: zápis z cizího původu nic nezmění a neprojde ---- */
/* Kontrola sondy (pojistka proti prázdnému PoC): tentýž zápis ZE SVÉHO původu projde a úložiště změní. */
{
  const pred = otisk();
  const r = await zavolej('funkce', 'POST', '{"viceSachet":true}', { cookie: cAdmin, origin: 'http://' + HOST, 'content-type': 'application/json' });
  await aktivitaDobehni();
  zapis(r.status === 200 && otisk() !== pred, 'kontrola sondy: zápis ze svého původu projde a změní úložiště (relace správce žije)', r);
  const r2 = await zavolej('funkce', 'POST', '{"viceSachet":false}', { cookie: cAdmin, origin: 'https://utok.priklad.cz', 'content-type': 'application/json' });
  zapis(r2.status === 401 || r2.status === 403, 'kontrola sondy: tentýž zápis z cizího původu → 401/403', r2);
}
const VEREJNE_CTENI = new Set(['zdravi']);   // anonymní čtecí funkce bez relace a bez zápisu (metodu neřeší)
for (const j of jmena) {
  if (BEZ_POZADAVKU.has(j) || j === 'prihlaseni' || j === 'odhlaseni' || VEREJNE_CTENI.has(j)) continue;
  for (const metoda of ['POST', 'DELETE', 'PUT']) {
    for (const [popis, hl] of [['cizí Origin', { origin: 'https://utok.priklad.cz', 'content-type': 'application/json' }],
                               ['Origin null', { origin: 'null', 'content-type': 'application/json' }],
                               ['text/plain', { origin: 'http://' + HOST, 'content-type': 'text/plain' }]]) {
      const pred = otisk(); const sitPred = sit;
      const r = await zavolej(j, metoda, metoda === 'DELETE' ? undefined : '{"akce":"smaz","email":"obchodnik.r1@priklad.cz","viceSachet":true}',
        Object.assign({ cookie: cAdmin }, hl));
      await aktivitaDobehni();
      const zmena = otisk() !== pred, ven = sit !== sitPred;
      const proslo = typeof r.status === 'number' && r.status >= 200 && r.status < 300;
      if (zmena || ven || proslo || r.status === 'VÝJIMKA')
        zapis(false, 'B17/B159 ' + j + ' ' + metoda + ' ' + popis, { status: r.status, zmenaUloziste: zmena, volaniVen: ven, text: r.text });
    }
  }
}
zapis(true, 'B17/B159: zápisové metody z cizího původu / Origin null / text-plain prošly sondou na všech funkcích (nálezy výš, jsou-li)');

/* ---- B78: přihlášení a odhlášení z cizí stránky ---- */
{
  const telo = JSON.stringify({ email: ADMIN_EMAIL, heslo: 'Docasne.Heslo.123' });
  const a = await F.prihlaseni(pozadavek('prihlaseni', 'POST', telo, { origin: 'https://utok.priklad.cz', 'content-type': 'application/json' }));
  zapis(a.status >= 400 && !a.headers.get('set-cookie'), 'B78 přihlášení z cizího Origin → odmítnuto', { status: a.status });
  const b = await F.prihlaseni(pozadavek('prihlaseni', 'POST', telo, { origin: 'null', 'content-type': 'application/json' }));
  zapis(b.status >= 400 && !b.headers.get('set-cookie'), 'B78 přihlášení s Origin null → odmítnuto', { status: b.status });
  const c = await F.prihlaseni(pozadavek('prihlaseni', 'POST', 'email=x&heslo=y', { origin: 'http://' + HOST, 'content-type': 'application/x-www-form-urlencoded' }));
  zapis(c.status >= 400 && !c.headers.get('set-cookie'), 'B78 přihlášení formulářovým tělem → odmítnuto', { status: c.status });
  const verzePred = JSON.parse(pamet.get('uzivatele/' + ADMIN_EMAIL)).hesloVerze;
  const d = await F.odhlaseni(pozadavek('odhlaseni', 'GET', undefined, { cookie: cAdmin }));
  await aktivitaDobehni();
  zapis(d.status === 405 && JSON.parse(pamet.get('uzivatele/' + ADMIN_EMAIL)).hesloVerze === verzePred, 'B17 odhlášení přes GET → 405, relace platí dál', { status: d.status });
  const e = await F.odhlaseni(pozadavek('odhlaseni', 'POST', '{}', { cookie: cAdmin, origin: 'https://utok.priklad.cz', 'content-type': 'application/json' }));
  await aktivitaDobehni();
  zapis(JSON.parse(pamet.get('uzivatele/' + ADMIN_EMAIL)).hesloVerze === verzePred, 'B78 odhlášení z cizího Origin relaci nezruší', { status: e.status });
}

/* ---- B57: provozní údaj o hlavním správci jen administrátorovi ---- */
{
  const z = await zavolej('zdravi', 'GET');
  zapis(!/spravce|admin|hlavni/i.test(z.text), 'B57 /api/zdravi anonymně nehlásí nic o hlavním správci', { text: z.text });
  const jo = await F.ja(pozadavek('ja', 'GET', undefined, { cookie: cObch })); const to = await jo.json();
  /* `hlavni` = „jsem hlavní účet já“ (u obchodníka false) — to není provozní údaj B57; tím je `spravceNastaven`. */
  zapis(!('spravceNastaven' in to) && to.hlavni === false, 'B57 /api/ja obchodníkovi příznak „hlavní správce nastaven“ nedá', Object.keys(to));
  const ja = await F.ja(pozadavek('ja', 'GET', undefined, { cookie: cAdmin })); const ta = await ja.json();
  zapis('spravceNastaven' in ta, 'B57 kontrola sondy: správce příznak `spravceNastaven` dostane', Object.keys(ta));
  /* #ON: čas aktivity jen ve výpisu účtů pro Administrátora. */
  const uo = await zavolej('uzivatele', 'GET', undefined, { cookie: cObch });
  zapis(uo.status === 403 || !/posledniAktivita|online/.test(uo.text), '#ON × B57: obchodník z /api/uzivatele čas aktivity nedostane', { status: uo.status, text: uo.text.slice(0, 80) });
}

console.log(radky.join('\n'));
console.log('\nVolání ven (zaslepený fetch): ' + sit);
console.log(zranitelne ? '\nZRANITELNÉ — ' + zranitelne + ' nálezů (řádky NÁLEZ výš)' : '\nODOLNÉ — vzorové opravy B17/B78/B159, B131 a B57 drží na všech ' + jmena.length + ' funkcích');
process.exit(0);
