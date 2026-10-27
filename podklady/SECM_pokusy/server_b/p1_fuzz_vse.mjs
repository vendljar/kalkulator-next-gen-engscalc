/* SEC-M server-B, bod 6: ŘÍZENÝ FUZZ VŠECH CEST netlify/functions/*.mjs v paměti.
 *
 * Pro každou funkci × roli (anonym, obchodník, vedoucí, admin2) × metodu:
 *  A) query parametry (soubor/klic/id/… s `..`, `/`, `%2f`, NUL, U+2028, surogáty, RTL, NFD, obří),
 *  B) syrová těla (neplatný JSON, null/číslo/pole, `__proto__`, hluboké vnoření 10 000 úrovní,
 *     obří těla 5 a 20 MB),
 *  C) typy polí těla — jména polí se berou ZE ZDROJÁKU funkce (`t.X`, `telo.X`, `k.X`, `zd.X`…),
 *     hodnoty: null, číslo, pole, objekt, {"toString":1}, {"valueOf":…}, `__proto__`/`constructor`
 *     /`prototype`, Unicode (NUL, U+2028/2029, osamělý surogát, RTL, kombinující), obří řetězec.
 * Hlídá se: výjimka (= na Netlify 500), stav ≥ 500, stopa/cesta v odpovědi, čas > 3 s,
 * znečištění Object.prototype / Array.prototype, `__proto__` uložené v datech, zápis mimo
 * očekávaný tvar klíče úložiště. Vypíše počty a seznam nálezů. */
import { readFileSync } from 'node:fs';
import { priprav, pripravData, F, NAZVY, req, pamet, ZAPISY, S, prihlas, zakazkaCislo, ulozZak, jsonOf } from './harness.mjs';

const U = await priprav();
await pripravData(U.admin.cookie);
/* jedna uložená zakázka a zákazník, ať GET s platným klíčem má co číst */
const z0 = zakazkaCislo('2026 - FZ - CN - 0001');
const soubor0 = (await jsonOf(await ulozZak(z0, U.obch.cookie, ''))).soubor;
await req(F.zakaznici, 'POST', '/api/zakaznici', { zakaznik: { nazev: 'Pokusná firma s.r.o.', ico: '12345678' } }, U.obch.cookie);

const t0 = Date.now();
const nalezy = new Map();
let volani = 0, pomalych = 0, max = { ms: 0, co: '' };
const STOPA = /\n\s+at\s|\/home\/|node:internal|file:\/\/|\.m?js:\d+|\b(TypeError|RangeError|ReferenceError|SyntaxError)\b|Cannot (read|convert)|undefined is not|is not a function/;
const ROLE = { anon: null, obch: () => U.obch.cookie, ved: () => U.ved.cookie, admin2: () => U.admin2.cookie };

async function relogin() {          // fuzz může relaci ukončit (odhlášení, změna hesla) — obnovit
  for (const k of ['obch', 'ved', 'admin2']) {
    const r = await req(F.ja, 'GET', '/api/ja', undefined, U[k].cookie);
    if (r.status !== 200) { const p = await prihlas(U[k].email, U[k].heslo); if (p.ok) U[k].cookie = p.cookie; else nalezy.set('PŘÍPRAVA: ' + k + ' se nepřihlásí ' + JSON.stringify(p.t).slice(0, 80), k); }
  }
}
function zapisNalez(k, kdo) { if (!nalezy.has(k)) nalezy.set(k, kdo); }

async function zkus(fnN, metoda, url, telo, kdo, popis, hl) {
  volani++;
  const cookie = ROLE[kdo] ? ROLE[kdo]() : null;
  const a = Date.now();
  try {
    const r = await req(F[fnN], metoda, url, telo, cookie, hl);
    const ms = Date.now() - a;
    if (ms > max.ms) max = { ms, co: fnN + ' ' + popis };
    if (ms > 3000) { pomalych++; zapisNalez(fnN + ' ' + popis + ' → POMALÉ ' + ms + ' ms', kdo); }
    let text = '';
    try { text = await r.text(); } catch (e) { text = ''; }
    if (r.status >= 500) zapisNalez(fnN + ' ' + metoda + ' ' + popis + ' → ' + r.status + ' ' + text.slice(0, 140), kdo);
    if (STOPA.test(text)) zapisNalez(fnN + ' ' + metoda + ' ' + popis + ' → STOPA V ODPOVĚDI: ' + (STOPA.exec(text) || [''])[0] + ' … ' + text.slice(0, 160), kdo);
  } catch (e) {
    zapisNalez(fnN + ' ' + metoda + ' ' + popis + ' → VÝJIMKA (500) ' + (e && e.constructor && e.constructor.name) + ': ' + String(e && e.message).slice(0, 120), kdo);
  }
}

/* ---------- A) query parametry ---------- */
const QK = ['soubor', 'klic', 'id', 'stav', 'hledat', 'limit', 'obnovit', 'zdroj', 'vse', 'typ', 'verze', 'akce', 'od', 'do',
  'sber', 'deal', 'export', 'po', 'protokol', 'oblast', 'rada', 'podle', 'pd', 'ismazatOdeslane'];
const QV = { prazdne: '', tecky: '..', trav: '../uzivatele/' + S.ADMIN_EMAIL, lomitko: 'a/b', kod2f: '%2f..%2f_rejstrik',
  zpetne: '..\\..\\x', proto: '__proto__', ctor: 'constructor', rejstrik: '_rejstrik', nul: 'a\u0000b', u2028: 'a b',
  surogat: 'a\uD800b', rtl: '‮exe.txt', nfd: 'žak', obri: 'x'.repeat(100000), zaporne: '-1', exp: '1e3',
  velke: '99999999999999999999', nan: 'NaN', platny: soubor0, tecka: '.', mezera: ' 1 ' };
for (const fnN of NAZVY) {
  if (fnN === 'zaloha_nocni') continue;
  for (const kdo of Object.keys(ROLE)) {
    for (const metoda of ['GET', 'DELETE']) {
      for (const k of QK) for (const [vn, v] of Object.entries(QV))
        await zkus(fnN, metoda, '/api/' + fnN + '?' + k + '=' + (vn === 'surogat' ? 'a%ED%A0%80b' : encodeURIComponent(v)), undefined, kdo, 'query ' + k + '=' + vn);
      await zkus(fnN, metoda, '/api/' + fnN + '?soubor=..%2F..%2Fx&klic=%2e%2e', undefined, kdo, 'query surové %2e%2e');
    }
    await zkus(fnN, 'PUT', '/api/' + fnN, '{}', kdo, 'PUT');
  }
  await relogin();
}
console.log('A) query: hotovo, volání ' + volani);

/* ---------- B) syrová těla ---------- */
const hloubka = (n) => '{"zakazka":' + '['.repeat(n) + ']'.repeat(n) + ',"matice":' + '{"a":'.repeat(n) + '1' + '}'.repeat(n) + '}';
const TELA = { prazdne: '', neplatny: '{', null: 'null', pole: '[]', cislo: '5', retez: '"x"', bool: 'true',
  protoTelo: '{"__proto__":{"znecisteno":1},"akce":"x"}', ctorTelo: '{"constructor":{"prototype":{"znecisteno2":1}}}',
  bom: '﻿{}', nulTelo: '{"a":"\u0000"}', hluboke10k: hloubka(10000), hluboke1k: hloubka(1000),
  obri5MB: '{"akce":"' + 'x'.repeat(5 * 1024 * 1024) + '"}', obri20MB: '{"zakazka":{"cislo":"1","x":"' + 'y'.repeat(20 * 1024 * 1024) + '"}}',
  mnohoKlicu: '{' + Array.from({ length: 200000 }, (_, i) => '"k' + i + '":1').join(',') + '}' };
for (const fnN of NAZVY) {
  if (fnN === 'zaloha_nocni') continue;
  for (const kdo of Object.keys(ROLE)) {
    for (const [tn, telo] of Object.entries(TELA)) {
      if (/obri|mnoho/.test(tn) && kdo === 'ved') continue;      // velká těla stačí 3 role (čas)
      await zkus(fnN, 'POST', '/api/' + fnN, telo, kdo, 'tělo=' + tn, { 'content-type': 'application/json' });
    }
  }
  await relogin();
}
console.log('B) těla: hotovo, volání ' + volani);

/* ---------- C) typy polí (jména polí ze zdrojáku) ---------- */
function poleZeZdroje(fnN) {
  const src = readFileSync(new URL('../../../netlify/functions/' + fnN + '.mjs', import.meta.url), 'utf8');
  const s = new Set();
  for (const m of src.matchAll(/\b(?:t|telo|k|zd|vstup|hodnota)\.([A-Za-z_]\w*)/g)) s.add(m[1]);
  ['akce', 'email', 'heslo', 'hesloSpravce'].forEach(x => s.add(x));
  return [...s].filter(x => !['length', 'map', 'filter', 'some', 'slice', 'json', 'text'].includes(x));
}
const DIVNE = { null: null, cislo: 7, zaporne: -1, nan: 'NaN', pole: [], poleObj: [{}], obj: {}, toString: { toString: 1 },
  valueOf: { valueOf: 1, toString: 1 }, valueOfFn: { valueOf: 'x' }, bool: true,
  proto: JSON.parse('{"__proto__":{"znecisteno":1}}'), ctor: JSON.parse('{"constructor":{"prototype":{"znecisteno2":1}}}'),
  nul: 'a\u0000b', u2028: 'a b ', surogat: '\uD800', rtl: '‮gpj.exe', komb: 'á́́',
  nfd: 'žak@example.com', dlouhy: 'x'.repeat(200000), tecky: '../..', lomitko: 'a/b' };
const AKCE = {
  uzivatele: ['mojeheslo', 'profil', 'podpis', 'zaloz', 'heslo', 'role', 'aktivni', 'archiv', 'prevod', 'smaz', undefined],
  sablony: ['rezim', 'zverejnit', 'vratit', undefined], analytika: ['rezim', 'udalosti'],
  zaloha_vynuceno: ['kopie-disk', 'retence-potvrdit', undefined], obnova: [undefined],
};
const OBNOVA_FAZE = ['konec', 'zrusit', 'zacatek', undefined];
for (const fnN of NAZVY) {
  if (fnN === 'zaloha_nocni') continue;
  const pole = poleZeZdroje(fnN);
  const akce = AKCE[fnN] || [undefined];
  for (const kdo of ['obch', 'admin2']) {
    for (const a of (fnN === 'obnova' ? OBNOVA_FAZE : akce)) {
      for (const p of pole) for (const [vn, v] of Object.entries(DIVNE)) {
        const telo = fnN === 'obnova' ? { faze: a, rezim: 'doplnit', nahled: true, zdroj: { soubor: { porizena: '2026-10-01T00:00:00Z', firma: null } } }
          : (a ? { akce: a } : {});
        if (fnN === 'uzivatele' && a && !['mojeheslo', 'profil', 'podpis'].includes(a)) { telo.email = 'pokus.cil@example.com'; telo.hesloSpravce = U[kdo].heslo; }
        if (fnN === 'zaloha_vynuceno' && a) telo.hesloSpravce = U[kdo].heslo;
        telo[p] = v;
        await zkus(fnN, 'POST', '/api/' + fnN, telo, kdo, (a ? 'akce/faze=' + a + ' ' : '') + p + '=' + vn);
      }
      await relogin();
    }
  }
  console.log('C) ' + fnN + ': ' + pole.length + ' polí, volání celkem ' + volani);
}
/* zaloha_nocni (bez cesty) dvakrát */
for (let i = 0; i < 2; i++) { volani++; try { const r = await F.zaloha_nocni(new Request('http://x/')); if (r.status >= 500) zapisNalez('zaloha_nocni ' + r.status, '-'); } catch (e) { zapisNalez('zaloha_nocni VÝJIMKA ' + e.message, '-'); } }

/* ---------- vyhodnocení ---------- */
const KLIC_TVAR = {
  uzivatele: k => S.emailPlatny(k) && k === k.toLowerCase().trim(), podpisy: k => S.emailPlatny(k), smazani: k => S.emailPlatny(k),
  pokusy: k => /^(e:.+|ip:.*|ip6:.+)$/.test(k),
  program: k => ['db', 'firma', 'zobrazeni', 'popisy', 'slovnik', 'controlling', 'controlling_exporty', 'popisy_historie'].includes(k),
  zakazky: k => k === '_rejstrik' || /^z\/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(k),
  zakaznici: k => /^z\/(\d{6,10}|n-[a-z0-9-]{1,60})$/.test(k),
  zalohy: k => /^(\d{4}-\d{2}-\d{2}(T\d{6}-(pred-obnovou|rucne|auto))?|souhrn\/.+|obnova-[0-9a-f]{32}|kopie-disk|retence-varovani|vynucene-rezervace\/.+)$/.test(k),
  analytika: k => /^(den\/\d{4}-\d{2}-\d{2}|cas\/[\w\-. ]{1,60}|rezim|ocista-b175)$/.test(k),
  sablony: k => /^(rejstrik|data\/[^/]+\/\d+)$/.test(k),
  pd_cache: k => /^(deal:\d+|dealy:(open|won|lost|vse)|strop:.+)$/.test(k), pd_stav: k => /^(deal|overeno):\d+$/.test(k), pipedrive: k => k === 'pole',
};
const mimo = [...new Set(ZAPISY.filter(([u, k]) => !(KLIC_TVAR[u] ? KLIC_TVAR[u](k) : false)).map(([u, k]) => u + '/' + JSON.stringify(k).slice(0, 80)))];
const protoUlozene = [...pamet.entries()].filter(([k, v]) => /"__proto__"\s*:/.test(v) || /"constructor"\s*:\s*\{/.test(v)).map(([k]) => k);
console.log('\nvolání:', volani, '· doba', Math.round((Date.now() - t0) / 1000), 's · nejpomalejší', max.ms, 'ms (' + max.co.slice(0, 80) + ') · nad 3 s:', pomalych);
console.log('Object.prototype znečištěn:', ({}).znecisteno !== undefined || ({}).znecisteno2 !== undefined, '· Array.prototype:', [].znecisteno !== undefined);
console.log('`__proto__`/constructor{…} uložené v datech:', protoUlozene.length ? protoUlozene : 'žádné');
console.log('zápisů:', ZAPISY.length, '· mimo očekávaný tvar klíče:', mimo.length ? mimo : 'žádný');
const sez = [...nalezy.entries()];
console.log('nálezů (unikátní):', sez.length);
for (const [k, kdo] of sez) console.log('[' + kdo + '] ' + k);
console.log('\nVÝSLEDEK p1_fuzz_vse: ' + (sez.length || mimo.length || protoUlozene.length ? 'NÁLEZY (viz výše)' : 'ČISTO'));
