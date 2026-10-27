/* SEC-M server-B, bod 9: PIPEDRIVE PROXY (pd_pole, pd_dealy, pd_deal, pd_stav, lib/pipedrive.mjs).
 * fetch je podvržený — zaznamená se URL a hlavička tokenu, kam by požadavek šel; nic neodejde.
 * SSRF (doména z prostředí, id dealu, org_id/person_id z odpovědi), strop volání, token v odpovědi/chybě. */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { priprav, pripravData, F, req, pamet, jsonOf, sada, FETCH_LOG, zakazkaCislo, ulozZak, kopie } from './harness.mjs';
const T = sada('p5_pipedrive');
const TOKEN = 'TAJNY-PD-TOKEN-SECM-1234567890';
process.env.PIPEDRIVE_TOKEN = TOKEN;
process.env.PIPEDRIVE_DOMENA = 'pokusna-firma';
const U = await priprav();
await pripravData(U.admin.cookie);

let rezim = 'ok';
globalThis.__FETCH_ODPOVED = async (url) => {
  const u = new URL(url);
  const odp = (data, st = 200) => new Response(JSON.stringify(st === 200 ? { success: true, data, additional_data: { next_cursor: null } } : { success: false, error: data }), { status: st, headers: { 'content-type': 'application/json' } });
  if (rezim === 'chyba') return odp('Echo ' + url + ' token=' + TOKEN, 400);       // podvržené Pipedrive vrací text s tokenem
  if (rezim === 'sit') throw new Error('connect ECONNREFUSED ' + url + ' x-api-token=' + TOKEN);
  if (/Fields$/.test(u.pathname)) return odp([]);
  if (u.pathname === '/api/v2/deals') return odp([{ id: 1, title: 'CN-1 Pokus', status: 'open' }]);
  const md = /^\/api\/v2\/deals\/(\d+)$/.exec(u.pathname);
  if (md) return odp({ id: +md[1], title: 'CN-' + md[1] + ' Pokus', status: 'won', org_id: rezim === 'org' ? '1/../../../v1/users/me?x=' : 900, person_id: rezim === 'org' ? 'https://jinam.example/x' : 800, custom_fields: {} });
  if (/^\/api\/v2\/organizations\//.test(u.pathname)) return odp({ id: 900, name: 'Pokusná firma s.r.o.' });
  if (/^\/api\/v2\/persons\//.test(u.pathname)) return odp({ id: 800, first_name: 'Jan', last_name: 'Pokus', emails: [{ value: 'jan.pokus@example.com' }] });
  return new Response('{}', { status: 404 });
};

/* ---------- SSRF: doména z prostředí ---------- */
const hostDo = async (domena) => {
  process.env.PIPEDRIVE_DOMENA = domena; FETCH_LOG.length = 0;
  let st;
  try { st = (await req(F.pd_pole, 'GET', '/api/pd/pole?obnovit=1', undefined, U.admin2.cookie)).status; } catch (e) { st = 'VÝJIMKA ' + e.message.slice(0, 50); }
  const h = FETCH_LOG.map(f => { try { return new URL(f.url).host; } catch (e) { return '?'; } });
  return { st, h: [...new Set(h)], tok: FETCH_LOG.some(f => f.hlavicky && f.hlavicky['x-api-token'] === TOKEN) };
};
const DOMENY = ['pokusna-firma', 'pokusna-firma.pipedrive.com', 'https://pokusna-firma.pipedrive.com/', 'utok.example#', 'utok.example?',
  'utok.example\\', 'utok.example/', 'a@utok.example', 'utok.example:443', '127.0.0.1#', '[::1]#', 'pokusna-firma.pipedrive.com.utok.example',
  'utok.example%23', ' utok.example# '];
const mimo = [];
for (const d of DOMENY) {
  const v = await hostDo(d);
  const zle = v.h.filter(x => !/\.pipedrive\.com$/.test(x));
  console.log('   PIPEDRIVE_DOMENA=' + JSON.stringify(d) + ' → stav ' + v.st + ' · host: ' + (v.h.join(', ') || '—') + (zle.length && v.tok ? '  ← TOKEN BY ODEŠEL MIMO PIPEDRIVE' : ''));
  if (zle.length && v.tok) mimo.push(d);
}
process.env.PIPEDRIVE_DOMENA = 'pokusna-firma';
T.t('S1 token jde jen na *.pipedrive.com pro každou hodnotu PIPEDRIVE_DOMENA (mimo: ' + mimo.join(' | ') + ')', mimo.length === 0);

/* ---------- id dealu ---------- */
for (const id of ['1/../../v1/users', '..%2F..%2Fv1%2Fusers', '%31', '0x10', '1e3', ' 1', '1 ', '-1', '0', '2147483648', '01', '1#x', '1?a=b', '١']) {
  FETCH_LOG.length = 0;
  const r = await req(F.pd_deal, 'GET', '/api/pd/deal?id=' + encodeURIComponent(id), undefined, U.obch.cookie);
  const cesty = FETCH_LOG.map(f => new URL(f.url).pathname);
  const ok = r.status === 400 || cesty.every(p => /^\/api\/v2\/(deals\/\d+|dealFields|organizationFields|organizations\/\d+|persons\/\d+)$/.test(p));
  T.t('D1 id=' + JSON.stringify(id) + ' → ' + r.status + (cesty.length ? ' ' + cesty.join(',') : ''), ok);
}
/* org_id / person_id z odpovědi Pipedrive (důvěra v odpověď) */
rezim = 'org'; FETCH_LOG.length = 0;
await req(F.pd_deal, 'GET', '/api/pd/deal?id=777', undefined, U.obch.cookie);
const kam = FETCH_LOG.map(f => f.url);
console.log('   org_id/person_id podvržené v odpovědi → fetch na: ' + kam.join(' | '));
T.t('D2 id organizace/osoby z odpovědi nevede mimo /api/v2/organizations|persons/<číslo> ani mimo hostitele',
  kam.every(u => { const x = new URL(u); return /\.pipedrive\.com$/.test(x.host) && /^\/api\/v2\/(deals|dealFields|organizationFields|organizations\/\d+$|persons\/\d+$)/.test(x.pathname); }));
rezim = 'ok';

/* ---------- strop čerstvých načtení ---------- */
{
  pamet.forEach((v, k) => { if (k.startsWith('pd_cache/')) pamet.delete(k); });
  FETCH_LOG.length = 0;
  const odp = await Promise.all(Array.from({ length: 80 }, (_, i) => req(F.pd_deal, 'GET', '/api/pd/deal?id=' + (1000 + i), undefined, U.obch.cookie)));
  const ok200 = odp.filter(r => r.status === 200).length, n429 = odp.filter(r => r.status === 429).length;
  const dealu = FETCH_LOG.filter(f => /\/deals\/\d+$/.test(new URL(f.url).pathname)).length;
  T.t('ST1 80 souběžných detailů → nejvýš 30 do Pipedrive (' + ok200 + '×200, ' + n429 + '×429, ' + dealu + ' volání deals)', dealu <= 30);
  const a = await req(F.pd_deal, 'GET', '/api/pd/deal?id=1000', undefined, U.obch.cookie);
  T.t('ST2 cache: opakované id po stropu → 200 (nepočítá se)', a.status === 200, a.status);
  const b = await req(F.pd_deal, 'GET', '/api/pd/deal?id=1000', undefined, U.obch2.cookie);
  T.t('ST3 jiný účet má vlastní strop / čte z cache → 200', b.status === 200, b.status);
  /* seznam: parametry mimo whitelist neobejdou cache */
  FETCH_LOG.length = 0;
  for (let i = 0; i < 20; i++) await req(F.pd_dealy, 'GET', '/api/pd/dealy?stav=open&hledat=' + i + '&limit=' + i, undefined, U.obch.cookie);
  T.t('ST4 20× seznam s různým hledáním/limitem → nejvýš 1 dotaz do Pipedrive (' + FETCH_LOG.length + ')', FETCH_LOG.length <= 1);
  const o = await req(F.pd_pole, 'GET', '/api/pd/pole?obnovit=1', undefined, U.obch.cookie);
  T.t('ST5 obnovit mapu polí obchodníkem → 403', o.status === 403, o.status);
}
/* ---------- pd_stav: deal id jen z uložené zakázky ---------- */
{
  const r0 = await jsonOf(await ulozZak(zakazkaCislo('2026 - PD - CN - 0001'), U.obch.cookie, ''));
  const z = JSON.parse(pamet.get('zakazky/z/' + r0.soubor)); z.pdDealId = 4242;
  let r = await ulozZak(kopie(z), U.obch.cookie, z.uloRazitko);
  T.t('PS1 obchodník nastaví pdDealId → odmítnuto (jen admin)', r.status >= 400, r.status);
  r = await ulozZak(kopie(z), U.admin2.cookie, z.uloRazitko);
  T.t('PS2 admin nastaví pdDealId → 200', r.status === 200, (await jsonOf(r)).chyba);
  FETCH_LOG.length = 0;
  for (const q of ['soubor=' + r0.soubor + '&deal=1', 'soubor=' + r0.soubor + '&deal=..%2F1', 'soubor=..%2F' + r0.soubor, 'soubor=' + r0.soubor + '&deal=4242']) {
    const rr = await req(F.pd_stav, 'GET', '/api/pd/stav?' + q, undefined, U.obch.cookie);
    console.log('   pd_stav ' + q + ' → ' + rr.status + ' ' + (await rr.text()).slice(0, 90));
  }
  T.t('PS3 pd_stav volá Pipedrive jen pro deal uložené zakázky', FETCH_LOG.every(f => /\/deals\/4242$|\/deals$/.test(new URL(f.url).pathname)), FETCH_LOG.map(f => f.url));
  const ciz = await req(F.pd_stav, 'GET', '/api/pd/stav?soubor=' + r0.soubor, undefined, U.obch.cookie, { origin: 'https://utok.example', host: 'x' });
  T.t('PS4 cizí původ (Origin) → 403', ciz.status === 403, ciz.status);
}
/* ---------- token nikdy ven ---------- */
{
  const unik = [];
  for (const rz of ['ok', 'chyba', 'sit']) {
    rezim = rz;
    pamet.forEach((v, k) => { if (/^(pd_cache|pipedrive|pd_stav)\//.test(k)) pamet.delete(k); });
    for (const [n, fn, url] of [['pole', F.pd_pole, '/api/pd/pole?obnovit=1'], ['dealy', F.pd_dealy, '/api/pd/dealy?stav=won'], ['deal', F.pd_deal, '/api/pd/deal?id=5'], ['stav', F.pd_stav, '/api/pd/stav?soubor=2026-PD-CN-0001.json']]) {
      let text;
      try { text = await (await req(fn, 'GET', url, undefined, U.admin2.cookie)).text(); } catch (e) { text = 'VÝJIMKA ' + e.message; }
      if (text.includes(TOKEN)) unik.push(rz + ' ' + n + ': ' + text.slice(0, 160));
    }
  }
  rezim = 'ok';
  console.log('   úniky tokenu v odpovědích: ' + (unik.length ? '\n     ' + unik.join('\n     ') : 'žádné'));
  T.t('TK1 token v žádné odpovědi pd_* (i když Pipedrive/síť vrátí text s tokenem)', unik.length === 0);
  const ulozeno = [...pamet.entries()].filter(([k, v]) => v.includes(TOKEN)).map(([k]) => k);
  T.t('TK2 token se neuloží do úložiště (cache, záloha)', ulozeno.length === 0, ulozeno);
  /* zdrojáky prohlížeče a sestavení: žádná hlavička tokenu ani jméno proměnné s hodnotou */
  const soubory = readdirSync(new URL('../../../src/', import.meta.url), { recursive: true }).filter(f => /\.(js|html)$/.test(f) && !/^test_/.test(f.split('/').pop()));
  const hity = soubory.filter(f => /x-api-token|api_token=|PIPEDRIVE_TOKEN/.test(readFileSync(new URL('../../../src/' + f, import.meta.url), 'utf8')));
  const dist = existsSync(new URL('../../../dist/', import.meta.url)) ? readdirSync(new URL('../../../dist/', import.meta.url)).filter(f => /\.html$/.test(f)).filter(f => /x-api-token|api_token=/.test(readFileSync(new URL('../../../dist/' + f, import.meta.url), 'utf8'))) : ['(dist/ není)'];
  console.log('   src/ (bez testů) se zmínkou o tokenu: ' + (hity.join(', ') || 'žádný') + ' · dist/: ' + (dist.join(', ') || 'žádný'));
  T.t('TK3 klient (src/) neposílá token ani nezná jeho hlavičku', hity.length === 0, hity);
}
process.exitCode = T.konec() ? 1 : 0;
