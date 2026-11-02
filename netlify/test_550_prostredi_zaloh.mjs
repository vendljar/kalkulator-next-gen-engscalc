/* #550 ZN — ZÁLOHY NA DISKU S PŘÍZNAKEM PROSTŘEDÍ A ČASEM (J. V. 2. 11. 2026)
 *
 * Ostrý (engscalc) i testovací web (testengscalc) kopírují zálohu do téže
 * složky „_Zaloha Netlify DB". Do v2.11.3 se jmenovala otisk_RRRR-MM-DD.json.gz
 * a kopie téhož dne se přepsaly. Teď otisk_<main|test|jiny>_RRRR-MM-DD_HHMM.
 * Serverová strana:
 *   1) prostrediZalohy — test (PROSTREDI=test), jiny (CONTEXT ≠ production
 *      nebo mimo Netlify), main (produkce); kopieDiskKlic pro náhled;
 *   2) kopieDiskPodlozena — nový tvar jen vlastního prostředí, starý platí;
 *   3) POST kopie-disk / retence-varovani-disk — jména jen nového tvaru
 *      vlastního prostředí; záznam nese prostředí; GET vrací prostředí
 *      a záznam jiného prostředí neukáže;
 *   4) GET /api/zaloha?zdroj=nocni&strana=1 vrací prostředí a čas pořízení.
 *
 * Pojistka: nad kódem b22f5df (v2.11.3) sada spadne hned na importu
 * (prostrediZalohy / kopieDiskKlic / kopieDiskVlastni v lib/zalohovani.mjs
 * nejsou); s náhradními funkcemi by selhaly všechny oddíly 2)–4)
 * (server bral jen otisk_RRRR-MM-DD.json(.gz) a prostředí nehlásil).
 * Spuštění: node netlify/test_550_prostredi_zaloh.mjs */
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
const { default: zalohaFn } = await import('./functions/zaloha.mjs');
const { default: zalohaNocni } = await import('./functions/zaloha_nocni.mjs');
const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info).slice(0, 600))); } };
const J = (x) => JSON.stringify(x);
const HESLO = 'Docasne.Heslo.123';
/* Prostředí se čte z process.env při každém volání — tady se podstrkuje. */
const ENV_KLICE = ['PROSTREDI', 'CONTEXT', 'NETLIFY', 'SITE_ID', 'SITE_NAME', 'DEPLOY_ID', 'NETLIFY_BLOBS_CONTEXT', 'AWS_LAMBDA_FUNCTION_NAME'];
const puvodniEnv = Object.fromEntries(ENV_KLICE.map(k => [k, process.env[k]]));
const vratEnv = () => { for (const k of ENV_KLICE) { if (puvodniEnv[k] === undefined) delete process.env[k]; else process.env[k] = puvodniEnv[k]; } };

/* ---------------- 1) prostředí ---------------- */
{
  const P = Z.prostrediZalohy;
  test('#550 prostředí: mimo Netlify (místní běh, testy) → jiny', P({}) === 'jiny');
  test('#550 prostředí: produkce ostrého webu → main', P({ NETLIFY: 'true', CONTEXT: 'production', SITE_NAME: 'engscalc' }) === 'main'
    && P({ SITE_ID: 'x' }) === 'main' && P({ AWS_LAMBDA_FUNCTION_NAME: 'f' }) === 'main');
  test('#550 prostředí: PROSTREDI=test → test (i v produkčním kontextu testovacího webu)', P({ PROSTREDI: 'test', CONTEXT: 'production', SITE_NAME: 'testengscalc' }) === 'test'
    && P({ PROSTREDI: ' Testovaci ' }) === 'test' && P({ PROSTREDI: 'sandbox' }) === 'test');
  test('#550 prostředí: náhled nasazení, větev a netlify dev → jiny', P({ CONTEXT: 'deploy-preview', SITE_ID: 'x' }) === 'jiny'
    && P({ CONTEXT: 'branch-deploy', NETLIFY: 'true' }) === 'jiny' && P({ CONTEXT: 'dev' }) === 'jiny');
  test('#550 prostředí: PROSTREDI=ostre na Netlify → main; bez Netlify jiny', P({ PROSTREDI: 'ostre', NETLIFY: 'true' }) === 'main' && P({ PROSTREDI: 'ostre' }) === 'jiny');
  test('#550 klíč záznamu: produkce i místně „kopie-disk", náhled vlastní klíč', Z.kopieDiskKlic({ CONTEXT: 'production' }) === 'kopie-disk'
    && Z.kopieDiskKlic({}) === 'kopie-disk' && Z.kopieDiskKlic({ CONTEXT: 'deploy-preview' }) === 'kopie-disk-nahled');
  test('#550 záznam vlastního prostředí: cizí se neukáže, starý bez prostředí ano', Z.kopieDiskVlastni({ prostredi: 'test' }, 'main') === null
    && !!Z.kopieDiskVlastni({ prostredi: 'main' }, 'main') && !!Z.kopieDiskVlastni({ soubor: 'otisk_2026-10-01.json' }, 'main')
    && Z.kopieDiskVlastni(null, 'main') === null);
}

/* ---------------- 2) záznam kopie podloží retenci ---------------- */
{
  const klice = ['2026-11-02', '2026-11-01'];
  const z = { kdy: '2026-11-02T08:00:00Z', puvod: 'nocni-otisk', otisk: '2026-11-02', velikostB: 10, sha256: 'a'.repeat(64),
    slozka: '_Zaloha Netlify DB', potvrzeno: 'heslo-spravce' };
  const pod = (soubor, p, navic) => Z.kopieDiskPodlozena({ ...z, soubor, ...(navic || {}) }, klice, p);
  test('#550 podloženo: nový tvar vlastního prostředí (.json.gz i .json)', pod('otisk_main_2026-11-02_0310.json.gz', 'main')
    && pod('otisk_test_2026-11-02_2359.json', 'test') && pod('otisk_main_2026-11-02_0310.json.gz', 'main', { prostredi: 'main' }));
  test('#550 podloženo: kopie jiného prostředí retenci neodemkne', !pod('otisk_test_2026-11-02_0310.json.gz', 'main')
    && !pod('otisk_main_2026-11-02_0310.json.gz', 'test') && !pod('otisk_jiny_2026-11-02_0310.json.gz', 'main'));
  test('#550 podloženo: záznam s cizím prostředím neodemkne ani se správným jménem', !pod('otisk_main_2026-11-02_0310.json.gz', 'main', { prostredi: 'test' }));
  test('#550 podloženo: starý tvar otisk_<den>.json(.gz) ze záznamů před v2.11.3 platí dál', pod('otisk_2026-11-02.json.gz', 'main')
    && pod('otisk_2026-11-02.json', 'test'));
  test('#550 podloženo: jiný den, neplatný čas nebo cizí jméno ne', !pod('otisk_main_2026-11-01_0310.json.gz', 'main')
    && !pod('otisk_main_2026-11-02_2460.json.gz', 'main') && !pod('otisk_main_2026-11-02_031.json.gz', 'main')
    && !pod('otisk_main_2026-11-02_0310.json.gz.exe', 'main') && !pod('otisk_MAIN_2026-11-02_0310.json.gz', 'main'));
}

/* ---------------- 3) koncové body ---------------- */
/* Podpis relace nese prostředí (PROSTREDI=test → jiný HMAC), proto se po
 * každé změně prostředí přihlašuje znovu. */
let cookie = '';
const prihlas = async () => { const r = await prihlaseni(new Request('http://x/api/prihlaseni', { method: 'POST', body: J({ email: ADMIN_EMAIL, heslo: HESLO }) }));
  cookie = (r.headers.get('set-cookie') || '').split(';')[0]; return r.status; };
const nastavEnv = async (e) => { for (const k of ENV_KLICE) delete process.env[k]; Object.assign(process.env, e || {}); return prihlas(); };
test('#550: správce se přihlásí', (await prihlas()) === 200);
const posli = async (telo) => { const o = await zalohaVynuceno(new Request('http://x/api/zaloha_vynuceno', { method: 'POST', headers: { cookie }, body: J(telo) }));
  return { status: o.status, telo: await o.json() }; };
const prehled = async () => (await zalohaVynuceno(new Request('http://x/api/zaloha_vynuceno', { headers: { cookie } }))).json();
const kopie = (soubor) => ({ akce: 'kopie-disk', hesloSpravce: HESLO, kopie: { soubor, velikostB: 1234, sha256: 'c'.repeat(64),
  otisk: '2026-11-02', puvod: 'nocni-otisk', slozka: '_Zaloha Netlify DB' } });
try {
  await nastavEnv({ PROSTREDI: 'test', CONTEXT: 'production', NETLIFY: 'true', SITE_NAME: 'testengscalc' });
  const spatne = await posli(kopie('otisk_main_2026-11-02_0310.json.gz'));
  test('#550 kopie-disk: testovací web odmítne kopii pojmenovanou „main" (400) a nic nezapíše', spatne.status === 400
    && /prostředí „main", tento web je „test"/.test(spatne.telo.chyba) && !pamet.has('zalohy/kopie-disk'), spatne);
  const stare = await posli(kopie('otisk_2026-11-02.json.gz'));
  test('#550 kopie-disk: starý tvar bez prostředí → 400 s radou obnovit stránku', stare.status === 400 && /obnovte stránku/.test(stare.telo.chyba)
    && !pamet.has('zalohy/kopie-disk'), stare);
  const dobre = await posli(kopie('otisk_test_2026-11-02_0310.json.gz'));
  test('#550 kopie-disk: kopie „test" se zapíše s prostředím', dobre.status === 200 && dobre.telo.kopieDisk.prostredi === 'test'
    && JSON.parse(pamet.get('zalohy/kopie-disk')).soubor === 'otisk_test_2026-11-02_0310.json.gz', dobre);
  const p1 = await prehled();
  test('#550 GET: přehled hlásí prostředí „test" a vlastní kopii', p1.ok && p1.prostredi === 'test' && !!p1.kopieDisk
    && p1.kopieDisk.soubor === 'otisk_test_2026-11-02_0310.json.gz', p1);
  /* záznam jiného prostředí v úložišti (např. omylem sdílené Blobs) se neukáže */
  await nastavEnv({ NETLIFY: 'true', CONTEXT: 'production' });
  const p2 = await prehled();
  test('#550 GET: ostrý web záznam kopie „test" neukáže (hláška jen vlastního prostředí)', p2.ok && p2.prostredi === 'main' && p2.kopieDisk === null, p2);
  /* náhled nasazení píše pod vlastní klíč — záznam produkce nepřepíše */
  await nastavEnv({ NETLIFY: 'true', CONTEXT: 'deploy-preview' });
  const nahled = await posli(kopie('otisk_jiny_2026-11-02_0310.json.gz'));
  test('#550 kopie-disk: náhled nasazení („jiny") píše pod kopie-disk-nahled, záznam produkce zůstane', nahled.status === 200
    && JSON.parse(pamet.get('zalohy/kopie-disk-nahled')).prostredi === 'jiny' && JSON.parse(pamet.get('zalohy/kopie-disk')).prostredi === 'test', nahled);
  /* hlášení úbytku z Disku: jen jména vlastního prostředí */
  await nastavEnv({ NETLIFY: 'true', CONTEXT: 'production' });
  const disk = (pred, novy) => ({ akce: 'retence-varovani-disk', disk: { den: '2026-11-02', predSoubor: pred, novySoubor: novy,
    predVelikostB: 100, novaVelikostB: 50 } });
  const cizi = await posli(disk('otisk_test_2026-10-26_0310.json.gz', 'otisk_main_2026-11-02_0310.json.gz'));
  const staryPred = await posli(disk('otisk_2026-10-26.json.gz', 'otisk_main_2026-11-02_0310.json.gz'));
  test('#550 retence-varovani-disk: předchozí kopie jiného prostředí nebo starého tvaru → 400', cizi.status === 400 && staryPred.status === 400
    && !pamet.has('zalohy/retence-varovani'), [cizi, staryPred]);
  const vlastni = await posli(disk('otisk_main_2026-10-26_0310.json.gz', 'otisk_main_2026-11-02_0310.json.gz'));
  test('#550 retence-varovani-disk: kopie vlastního prostředí se ohlásí', vlastni.status === 200 && !!vlastni.telo.retenceVarovani, vlastni);
  /* záloha pro Disk hlásí prostředí a čas pořízení */
  pamet.delete('zalohy/retence-varovani');
  const zal = await (await zalohaFn(new Request('http://x/api/zaloha?zdroj=nocni&strana=1', { headers: { cookie } }))).json();
  test('#550 GET /api/zaloha?zdroj=nocni&strana=1: vrací prostředí a čas pořízení', zal.ok && zal.prostredi === 'main'
    && Number.isFinite(Date.parse(zal.porizena)), { ok: zal.ok, prostredi: zal.prostredi, porizena: zal.porizena, chyba: zal.chyba });
  /* noční otisk: první stránka nese prostředí a čas pořízení otisku */
  const l = console.log; console.log = () => {};
  try { await zalohaNocni(); } finally { console.log = l; }
  const zalN = await (await zalohaFn(new Request('http://x/api/zaloha?zdroj=nocni&strana=1', { headers: { cookie } }))).json();
  test('#550 GET /api/zaloha?zdroj=nocni&strana=1 (noční otisk): prostředí a čas pořízení otisku', zalN.ok && zalN.puvod === 'nocni-otisk'
    && zalN.prostredi === 'main' && zalN.porizena === JSON.parse(pamet.get('zalohy/' + zalN.otisk)).porizena,
    { ok: zalN.ok, puvod: zalN.puvod, prostredi: zalN.prostredi, porizena: zalN.porizena, chyba: zalN.chyba });
  await nastavEnv({ PROSTREDI: 'test' });
  const zal2 = await (await zalohaFn(new Request('http://x/api/zaloha?zdroj=nocni', { headers: { cookie } }))).json();
  test('#550 GET /api/zaloha?zdroj=nocni (celá): prostředí „test" a čas', zal2.ok && zal2.prostredi === 'test' && Number.isFinite(Date.parse(zal2.porizena)),
    { ok: zal2.ok, prostredi: zal2.prostredi, porizena: zal2.porizena });
} finally { vratEnv(); }

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
