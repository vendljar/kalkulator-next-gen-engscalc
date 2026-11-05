/* #571 DZ — DENNÍ KOPIE NA DISK NA OSTRÉM SE STARÝM ZÁZNAMEM (hlášení J. V. 5. 11. 2026)
 *
 * Na ostrém webu (prostředí main) leží záznam poslední kopie z 2. 11. ve
 * starém tvaru (před ZN #552 / DK #554): bez `prostredi`, soubor
 * otisk_RRRR-MM-DD.json.gz. Serverová strana nesmí kopii zablokovat:
 *   1) GET /api/zaloha_vynuceno na ostrém vrátí starý záznam jako vlastní
 *      kopii (prostředí main) a nový noční otisk → klient spočte `potreba`;
 *   2) na testovacím webu se tentýž starý záznam bere taky (psal ho ten web),
 *      záznam ostrého na testu ne;
 *   3) POST kopie-disk nového tvaru otisk_main_<dnešek>_HHMM.json.gz se
 *      přijme a starý záznam přepíše záznamem s prostředím main; pak už
 *      `potreba` není.
 * Pojistka: sada prochází už na 000924e (server byl v pořádku — příčina
 * byla v prohlížeči, viz src/test_571_kopie_disk_stav.js a
 * overit_dz_kopie_disk.mjs); chytá mutace #571 (server), které starý záznam
 * zahodí: s mutací „starý záznam = žádná kopie (server)" padají kontroly 1).
 * Spuštění: node netlify/test_571_kopie_disk.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';

const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { const v = pamet.get(nazev + '/' + k); if (v === undefined) return null; return JSON.parse(Buffer.isBuffer(v) ? v.toString('utf8') : v); },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async ctiBin(k) { const v = pamet.get(nazev + '/' + k); return v === undefined ? null : (Buffer.isBuffer(v) ? v : Buffer.from(v)); },
  async zapisBin(k, b) { pamet.set(nazev + '/' + k, Buffer.from(b)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

const Z = await import('./lib/zalohovani.mjs');
const { default: prihlaseni } = await import('./functions/prihlaseni.mjs');
const { default: zalohaVynuceno } = await import('./functions/zaloha_vynuceno.mjs');
const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');
const { createRequire } = await import('node:module');
const U = createRequire(import.meta.url)('../src/uloziste.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 600)); } };
const J = (x) => JSON.stringify(x);
const HESLO = 'Docasne.Heslo.123';
const ENV_KLICE = ['PROSTREDI', 'CONTEXT', 'NETLIFY', 'SITE_ID', 'SITE_NAME', 'DEPLOY_ID', 'NETLIFY_BLOBS_CONTEXT', 'AWS_LAMBDA_FUNCTION_NAME'];
const puvodniEnv = Object.fromEntries(ENV_KLICE.map(k => [k, process.env[k]]));
const vratEnv = () => { for (const k of ENV_KLICE) { if (puvodniEnv[k] === undefined) delete process.env[k]; else process.env[k] = puvodniEnv[k]; } };

let cookie = '';
const prihlas = async () => { const r = await prihlaseni(new Request('http://x/api/prihlaseni', { method: 'POST', body: J({ email: ADMIN_EMAIL, heslo: HESLO }) }));
  cookie = (r.headers.get('set-cookie') || '').split(';')[0]; return r.status; };
const nastavEnv = async (e) => { for (const k of ENV_KLICE) delete process.env[k]; Object.assign(process.env, e || {}); return prihlas(); };
const posli = async (telo) => { const o = await zalohaVynuceno(new Request('http://x/api/zaloha_vynuceno', { method: 'POST', headers: { cookie }, body: J(telo) }));
  return { status: o.status, telo: await o.json() }; };
const prehled = async () => (await zalohaVynuceno(new Request('http://x/api/zaloha_vynuceno', { headers: { cookie } }))).json();

const DNES = new Date().toISOString().slice(0, 10);
const PRED3 = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
const STARY = { kdy: PRED3 + 'T10:42:41.000Z', soubor: 'otisk_' + PRED3 + '.json.gz', velikostB: 4096, sha256: 'a'.repeat(64),
  otisk: PRED3, puvod: 'nocni-otisk', slozka: '_Zaloha Netlify DB', potvrzeno: 'heslo-spravce' };

try {
  /* ---- 1) ostrý web: starý záznam + dnešní noční otisk ---- */
  await nastavEnv({ NETLIFY: 'true', CONTEXT: 'production', SITE_NAME: 'engscalc' });
  await Z.porizOtisk('nocni-otisk', '', DNES);
  pamet.set('zalohy/kopie-disk', J(STARY));
  test('#571 server: kopieDiskVlastni bere starý záznam bez prostředí jako kopii ostrého', Z.kopieDiskVlastni(STARY, 'main') === STARY);
  const p = await prehled();
  test('#571 GET ostrý: prostředí main, starý záznam z 2. 11. jako vlastní kopie', p.ok && p.prostredi === 'main'
    && !!p.kopieDisk && p.kopieDisk.soubor === STARY.soubor, { prostredi: p.prostredi, kopie: p.kopieDisk });
  test('#571 GET ostrý: přehled nese dnešní noční otisk', (p.otisky || []).some(o => o.den === DNES && o.zdroj === 'nocni-otisk'), p.otisky);
  const s = U.uloKopieDiskStav(p.kopieDisk, Date.now(), p.prostredi, p.otisky);
  test('#571 ostrý: klient nad odpovědí serveru spočte potreba (starý záznam kopii nebrání)', s.potreba === true && s.nocni === DNES
    && /prostředí main/.test(s.text), s);

  /* ---- 2) testovací web: starý záznam platí, záznam ostrého ne ---- */
  await nastavEnv({ PROSTREDI: 'test', CONTEXT: 'production', NETLIFY: 'true', SITE_NAME: 'testengscalc' });
  const t1 = await prehled();
  test('#571 GET test: starý záznam bez prostředí se bere i na testu (psal ho jen ten web)', t1.prostredi === 'test' && !!t1.kopieDisk
    && t1.kopieDisk.soubor === STARY.soubor, t1.kopieDisk);
  pamet.set('zalohy/kopie-disk', J(Object.assign({}, STARY, { prostredi: 'main' })));
  const t2 = await prehled();
  test('#571 GET test: záznam ostrého (prostředí main) se na testu neukáže', t2.kopieDisk === null, t2.kopieDisk);

  /* ---- 3) ostrý web přijme kopii nového tvaru a starý záznam přepíše ---- */
  pamet.set('zalohy/kopie-disk', J(STARY));
  await nastavEnv({ NETLIFY: 'true', CONTEXT: 'production', SITE_NAME: 'engscalc' });
  const jmeno = 'otisk_main_' + DNES + '_0300.json.gz';
  const r = await posli({ akce: 'kopie-disk', hesloSpravce: HESLO, kopie: { soubor: jmeno, velikostB: 2048, sha256: 'b'.repeat(64),
    otisk: DNES, puvod: 'nocni-otisk', slozka: '_Zaloha Netlify DB', prostredi: 'main' } });
  test('#571 POST ostrý: kopie otisk_main_<dnešek> se přijme a záznam nese prostředí main', r.status === 200
    && r.telo.kopieDisk && r.telo.kopieDisk.prostredi === 'main' && r.telo.kopieDisk.soubor === jmeno, r);
  const p2 = await prehled();
  const s2 = U.uloKopieDiskStav(p2.kopieDisk, Date.now(), p2.prostredi, p2.otisky);
  test('#571 ostrý: po kopii už potreba není a hláška ukazuje novou kopii', s2.potreba === false && s2.text.includes(jmeno), s2);
} finally { vratEnv(); }

console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
process.exit(fail ? 1 : 0);
