/* #577 AS — /api/zaloha_disk: NOČNÍ KOPIE NA DISK PRO SKRIPT APPS SCRIPT (10. 11. 2026)
 *
 * Serverová strana (simulaci skriptu dělá netlify/test_577_apps_script.mjs):
 *   T  token: proměnná chybí / je krátká / hlavička chybí / špatný token → 403
 *      se stejným textem (nic neprozradí), token v adrese → 400, požadavek
 *      z prohlížeče (Origin) → 403, správný token → 200;
 *   L  četnost: špatný token > 10× za 15 min z jedné adresy → 429, správný
 *      token tím zablokovaný není; hodina / den kusů → 429;
 *   V  velký otisk (> 60 MB gzip, nestlačitelná data): každá odpověď kusu
 *      ≤ 3 MiB, složené kusy = SHA-256 a velikost z přípravy, gunzip
 *      i DecompressionStream = očištěný otisk (otiskProDisk + web) — tedy
 *      stejný obsah jako /api/zaloha?zdroj=nocni;
 *   P  potvrzení: jen pro připravený soubor (SHA, velikost, jméno, otisk),
 *      záznam kopie se zdrojem „skript", kopieDiskPodlozena ho bere a retence
 *      v Netlify se odemkne (bez záznamu čeká); starší otisk novější kopii
 *      nepřepíše;
 *   N  token neumí nic jiného: neznámá akce 400, /api/zaloha a
 *      /api/zaloha_vynuceno s tokenem 401;
 *   W  varování úbytku na Disku jen pro připravený soubor;
 *   K  nový otisk zahodí staré kusy, poškozený kus → 500 a příprava znovu,
 *      souběžný krok → bezi, starý jednolitý otisk se připraví taky.
 * Pojistka: na 59c56b3 sada spadne hned na importu functions/zaloha_disk.mjs
 * (cesta neexistuje) — doloženo v commitu.
 * Spuštění: node netlify/test_577_kopie_skript.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
for (const k of ['PROSTREDI', 'CONTEXT', 'NETLIFY', 'SITE_ID', 'SITE_NAME', 'DEPLOY_ID', 'NETLIFY_BLOBS_CONTEXT', 'AWS_LAMBDA_FUNCTION_NAME', 'KNG_DISK_TOKEN'])
  delete process.env[k];
Object.assign(process.env, { NETLIFY: 'true', CONTEXT: 'production', SITE_NAME: 'engscalc' });

const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { const v = pamet.get(nazev + '/' + k); if (v === undefined) return null; return JSON.parse(Buffer.isBuffer(v) ? v.toString('utf8') : v); },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async ctiBin(k) { const v = pamet.get(nazev + '/' + k); return v === undefined ? null : (Buffer.isBuffer(v) ? v : Buffer.from(v)); },
  async zapisBin(k, b) { pamet.set(nazev + '/' + k, Buffer.from(b)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
const ul = (n) => globalThis.__TEST_ULOZISTE(n);

const { createHash, randomBytes } = await import('node:crypto');
const { gunzipSync } = await import('node:zlib');
const { isDeepStrictEqual } = await import('node:util');
const Z = await import('./lib/zalohovani.mjs');
const KS = await import('./lib/kopie_skript.mjs');
const { default: zalohaDisk } = await import('./functions/zaloha_disk.mjs');
const { default: zaloha } = await import('./functions/zaloha.mjs');
const { default: zalohaVynuceno } = await import('./functions/zaloha_vynuceno.mjs');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 600)); } };
const TOKEN = 'k'.repeat(20) + randomBytes(24).toString('base64url');
const WEB = 'engscalc.netlify.app';
const H = (extra) => ({ authorization: 'Bearer ' + TOKEN, host: WEB, 'x-nf-client-connection-ip': '203.0.113.7', ...(extra || {}) });
const volej = async (cesta, opt = {}) => {
  const r = await zalohaDisk(new Request('http://x' + cesta, { method: opt.method || 'GET', headers: opt.headers || H(),
    body: opt.telo ? JSON.stringify(opt.telo) : undefined }));
  const typ = r.headers.get('content-type') || '';
  return { status: r.status, typ, hlavicky: r.headers, telo: typ.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer()) };
};
const priprav = async () => {
  let r, n = 0;
  do { r = await volej('/api/zaloha_disk', { method: 'POST', telo: { akce: 'priprav' } }); n++; }
  while (r.status === 200 && !r.telo.hotovo && n < 2000);
  return { ...r, kroku: n };
};
const stahni = async (p) => {
  const kusy = [];
  for (let i = 0; i < p.kusy.length; i++) kusy.push(await volej('/api/zaloha_disk?kus=' + i + '&otisk=' + p.otisk));
  return kusy;
};
const DEN = (posun) => new Date(Date.now() + posun * 86400000).toISOString().slice(0, 10);
const DNES = DEN(0);
const vynulujLimity = () => { for (const k of [...pamet.keys()]) if (k.startsWith(KS.KS_ULOZISTE + '/' + KS.KS_CETNOST_KLIC) || k.startsWith(KS.KS_ULOZISTE + '/spatne:')) pamet.delete(k); };
const ocekavany = async (klic) => ({ ...Z.otiskProDisk(await Z.ctiOtisk(ul('zalohy'), klic)), web: WEB });

/* data: účty s otisky hesel, podpisy, zákazníci s číselným klíčem (pořadí
 * klíčů v JS), šablony, zakázky */
const naplnZaklad = async () => {
  await ul('uzivatele').zapis('spravce@priklad.cz', { email: 'spravce@priklad.cz', jmeno: 'Správce', role: 'Administrátor', heslo: 'scrypt$tajne$otisk' });
  await ul('uzivatele').zapis('obchodnik@priklad.cz', { email: 'obchodnik@priklad.cz', jmeno: 'Obchodník', role: 'Obchodník', heslo: 'scrypt$x$y', aktivni: false });
  await ul('podpisy').zapis('spravce@priklad.cz', { obrazek: 'data:image/png;base64,TAJNY-PODPIS' });
  await ul('zakaznici').zapis('12345678', { nazev: 'Zákazník s IČO' });
  await ul('zakaznici').zapis('n-bez-ico', { nazev: 'Zákazník bez IČO' });
  await ul('program').zapis('db', { platny: { verze: 1 } });
  await ul('sablony').zapis('rejstrik', { cn: 1 });
};

try {
  await naplnZaklad();
  /* ~11 MB → otisk o 3 částech (OTISK_CAST_MAX_B 4 MB): sekce zakázek přes hranici částí */
  for (let i = 0; i < 40; i++) await ul('zakazky').zapis('z/zak' + String(i).padStart(3, '0'), { cislo: i, text: 'Šachta č. ' + i, pril: randomBytes(200000).toString('base64') });
  await Z.porizOtisk('nocni-otisk', '', DNES);

  /* ---------------- T: token ---------------- */
  let r = await volej('/api/zaloha_disk');
  test('T1 bez KNG_DISK_TOKEN je cesta vypnutá (403)', r.status === 403, r);
  const textVypnuto = r.telo.chyba;
  process.env.KNG_DISK_TOKEN = 'kratky-token-jen-20zn';
  r = await volej('/api/zaloha_disk', { headers: H({ authorization: 'Bearer kratky-token-jen-20zn' }) });
  test('T2 token kratší než 32 znaků = cesta vypnutá i se shodným tokenem (403)', r.status === 403, r);
  process.env.KNG_DISK_TOKEN = TOKEN;
  r = await volej('/api/zaloha_disk', { headers: H({ authorization: '' }) });
  test('T3 bez hlavičky Authorization 403', r.status === 403, r);
  r = await volej('/api/zaloha_disk', { headers: H({ authorization: 'Bearer ' + TOKEN.slice(0, -1) + 'X' }) });
  test('T4 špatný token 403 se stejným textem jako vypnutá cesta (bez úniku)', r.status === 403 && r.telo.chyba === textVypnuto
    && !JSON.stringify(r.telo).includes(TOKEN.slice(0, 8)) && Object.keys(r.telo).sort().join() === 'chyba,ok', r.telo);
  r = await volej('/api/zaloha_disk', { headers: H({ authorization: 'Basic ' + TOKEN }) });
  test('T5 jiné schéma než Bearer 403', r.status === 403, r);
  r = await volej('/api/zaloha_disk?token=' + TOKEN);
  test('T6 token v adrese → 400 (a nic se nezpracuje)', r.status === 400 && /hlavičky Authorization/.test(r.telo.chyba), r);
  r = await volej('/api/zaloha_disk', { headers: H({ origin: 'https://' + WEB }) });
  test('T7 požadavek z prohlížeče (Origin) 403 i se správným tokenem', r.status === 403, r);
  r = await volej('/api/zaloha_disk');
  test('T8 správný token → metadata (prostředí main, noční otisk, žádná kopie, retence bez varování)', r.status === 200 && r.telo.ok
    && r.telo.prostredi === 'main' && r.telo.nocni && r.telo.nocni.otisk === DNES && r.telo.kopieDisk === null
    && r.telo.retence.stav === 'zadne' && Number.isFinite(Date.parse(r.telo.ted)), r.telo);
  test('T9 metadata nenesou data ani otisky hesel', !JSON.stringify(r.telo).includes('scrypt') && !JSON.stringify(r.telo).includes('zak001'));
  const zdroj = (await import('node:fs')).readFileSync(new URL('./lib/kopie_skript.mjs', import.meta.url), 'utf8')
    + (await import('node:fs')).readFileSync(new URL('./functions/zaloha_disk.mjs', import.meta.url), 'utf8');
  test('T10 token se porovnává v konstantním čase (tajneShodne), ne ===', /tajneShodne\(dany, ocekavany\)/.test(zdroj) && !/dany\s*===\s*ocekavany/.test(zdroj));

  /* ---------------- L: četnost ---------------- */
  vynulujLimity();
  const spatne = { authorization: 'Bearer ' + 'x'.repeat(48), 'x-nf-client-connection-ip': '198.51.100.9' };
  const kody = [];
  for (let i = 0; i < KS.KS_LIMIT.spatnychZa15 + 1; i++) kody.push((await volej('/api/zaloha_disk', { headers: H(spatne) })).status);
  test('L1 špatný token: prvních 10 pokusů 403, další 429', kody.slice(0, 10).every(k => k === 403) && kody[10] === 429, kody);
  r = await volej('/api/zaloha_disk', { headers: H({ 'x-nf-client-connection-ip': '198.51.100.9' }) });
  test('L2 správný token z téže adresy limit špatných nezastaví (zásada #92)', r.status === 200, r);
  const puvLimit = { ...KS.KS_LIMIT };
  vynulujLimity(); KS.KS_LIMIT.zaHodinu = 3;
  const k2 = []; for (let i = 0; i < 4; i++) k2.push((await volej('/api/zaloha_disk')).status);
  test('L3 nad limit požadavků za hodinu 429', k2.join() === '200,200,200,429', k2);
  Object.assign(KS.KS_LIMIT, puvLimit); vynulujLimity();

  /* ---------------- P + K na malém otisku ---------------- */
  r = await volej('/api/zaloha_disk?kus=0&otisk=' + DNES);
  test('K1 kus před přípravou → 409', r.status === 409, r);
  KS.KS_ROZPOCET.krokMs = 1;   // jedna část na krok
  let p = await priprav();
  test('P1 příprava po krocích doběhne (hotovo, jméno otisk_main_<den>_HHMM.json.gz)', p.status === 200 && p.telo.hotovo
    && p.telo.postup.casti >= 3 && new RegExp('^otisk_main_' + DNES + '_\\d{4}\\.json\\.gz$').test(p.telo.soubor) && p.kroku >= 2, { kroku: p.kroku, telo: { ...p.telo, kusy: undefined } });
  test('P2 jméno = uloKopieDiskJmeno prohlížeče pro tentýž otisk', p.telo.soubor === (await import('node:module')).createRequire(import.meta.url)('../src/uloziste.js')
    .uloKopieDiskJmeno(DNES, true, 'main', p.telo.porizena));
  let kusy = await stahni(p.telo);
  let soubor = Buffer.concat(kusy.map(k => k.telo));
  test('P3 kusy: binárně, každý ≤ 3 MiB, všechny kromě posledního přesně 3 MiB (násobek 256 KiB)', kusy.every(k => k.status === 200
    && k.typ === 'application/octet-stream' && k.telo.length <= 3 * 1048576)
    && kusy.slice(0, -1).every(k => k.telo.length === KS.KS_KUS_B) && KS.KS_KUS_B % 262144 === 0, kusy.map(k => k.telo.length));
  test('P4 složení = SHA-256 a velikost z přípravy; SHA kusu v hlavičce i v seznamu', createHash('sha256').update(soubor).digest('hex') === p.telo.sha256
    && soubor.length === p.telo.velikostB && kusy.every((k, i) => k.hlavicky.get('x-kng-kus-sha256') === p.telo.kusy[i].sha256
    && createHash('sha256').update(k.telo).digest('hex') === p.telo.kusy[i].sha256));
  const data = gunzipSync(soubor);
  const obj = JSON.parse(data.toString('utf8'));
  test('P5 obsah = očištěný noční otisk + web (jako /api/zaloha?zdroj=nocni)', isDeepStrictEqual(obj, await ocekavany(DNES)));
  test('P6 bez otisků hesel a bez podpisů, účty jen e-mail/jméno/role/aktivní', !data.toString().includes('scrypt') && !data.toString().includes('TAJNY-PODPIS')
    && obj.podpisy === null && obj.uzivatele.length === 2 && obj.uzivatele.every(u => Object.keys(u).sort().join() === 'aktivni,email,jmeno,role'));
  test('P7 velikostDatB = nekomprimovaná délka', data.length === p.telo.velikostDatB);

  r = await volej('/api/zaloha_disk', { method: 'POST', telo: { akce: 'potvrdit', kopie: { soubor: p.telo.soubor, otisk: DNES, sha256: 'a'.repeat(64), velikostB: p.telo.velikostB } } });
  test('P8 potvrzení s jiným SHA-256 → 409, záznam kopie nevznikl', r.status === 409 && !(await ul('zalohy').cti('kopie-disk')), r.telo);
  r = await volej('/api/zaloha_disk', { method: 'POST', telo: { akce: 'potvrdit', kopie: { soubor: p.telo.soubor, otisk: DNES, sha256: p.telo.sha256, velikostB: p.telo.velikostB + 1 } } });
  test('P9 potvrzení s jinou velikostí → 409', r.status === 409, r.telo);
  /* retence v Netlify bez záznamu kopie čeká */
  for (let d = 20; d <= 24; d++) await Z.porizOtisk('nocni-otisk', '', DEN(-d));
  const ret0 = await Z.retenceProved(DNES);
  test('P10 bez záznamu kopie retence v Netlify nic nesmaže (čeká)', ret0.ceka && !ret0.smazano.length, ret0);
  r = await volej('/api/zaloha_disk', { method: 'POST', telo: { akce: 'potvrdit', kopie: { soubor: p.telo.soubor, otisk: DNES, sha256: p.telo.sha256, velikostB: p.telo.velikostB } } });
  const zaz = await ul('zalohy').cti('kopie-disk');
  test('P11 správné potvrzení → záznam kopie (zdroj skript, potvrzeno token-skript, složka, SHA, velikost)', r.status === 200 && zaz
    && zaz.zdroj === 'skript' && zaz.potvrzeno === 'token-skript' && zaz.slozka === '_Zaloha Netlify DB' && zaz.prostredi === 'main'
    && zaz.sha256 === p.telo.sha256 && zaz.velikostB === p.telo.velikostB && zaz.otisk === DNES && zaz.velikostDatB === p.telo.velikostDatB, zaz);
  test('P12 kopieDiskPodlozena záznam skriptu bere', Z.kopieDiskPodlozena(zaz, await ul('zalohy').seznam(), 'main'));
  test('P13 záznam bez značky potvrzení retenci neodemkne (K3-N1 platí dál)', !Z.kopieDiskPodlozena({ ...zaz, potvrzeno: 'cookie' }, await ul('zalohy').seznam(), 'main'));
  const ret1 = await Z.retenceProved(DNES);
  test('P14 se záznamem skriptu retence v Netlify maže podle pravidel', !ret1.ceka && ret1.smazano.length > 0, ret1);
  r = await volej('/api/zaloha_disk');
  test('P15 metadata pak hlásí kopii skriptu (otisk = noční)', r.telo.kopieDisk && r.telo.kopieDisk.zdroj === 'skript' && r.telo.kopieDisk.otisk === DNES);
  /* GET zaloha_vynuceno (prohlížeč) → hlídka */
  const U = (await import('node:module')).createRequire(import.meta.url)('../src/uloziste.js');
  const s = U.uloKopieDiskStav(zaz, Date.now(), 'main', [{ den: DNES, porizena: p.telo.porizena, zdroj: 'nocni-otisk' }]);
  test('P16 hlídka v aplikaci: kopii nedělá (potreba false) a ukáže „Poslední kopie na Disku: … (skript)"', s.potreba === false && s.skript === true
    && /^Poslední kopie na Disku \(prostředí main\): .*\(skript\)\.$/.test(s.text), s);

  /* N: token nic jiného neumí */
  r = await volej('/api/zaloha_disk', { method: 'POST', telo: { akce: 'retence-potvrdit', den: DNES } });
  test('N1 neznámá akce (potvrzení úbytku) → 400', r.status === 400, r.telo);
  r = await volej('/api/zaloha_disk', { method: 'POST', telo: { akce: 'smazat-pred-obnovou', klic: DNES + '-pred-obnovou' } });
  test('N2 mazání otisku tokenem → 400', r.status === 400, r.telo);
  const s401 = async (fn, url, telo) => (await fn(new Request('http://x' + url, { method: telo ? 'POST' : 'GET', headers: H(), body: telo ? JSON.stringify(telo) : undefined }))).status;
  test('N3 /api/zaloha s tokenem → 401 (token platí jen pro /api/zaloha_disk)', (await s401(zaloha, '/api/zaloha?zdroj=nocni')) === 401);
  test('N4 /api/zaloha_vynuceno s tokenem → 401 (retence-potvrdit, kopie-disk)', (await s401(zalohaVynuceno, '/api/zaloha_vynuceno', { akce: 'retence-potvrdit' })) === 401
    && (await s401(zalohaVynuceno, '/api/zaloha_vynuceno')) === 401);

  /* W: varování úbytku */
  r = await volej('/api/zaloha_disk', { method: 'POST', telo: { akce: 'varovani', disk: { den: DNES, predSoubor: 'otisk_main_' + DEN(-1) + '_0300.json.gz',
    novySoubor: 'otisk_main_' + DNES + '_0000.json.gz', predVelikostB: 1000, novaVelikostB: 10 } } });
  test('W1 varování pro jiný než připravený soubor → 400', r.status === 400, r.telo);
  r = await volej('/api/zaloha_disk', { method: 'POST', telo: { akce: 'varovani', disk: { den: DNES, predSoubor: 'otisk_main_' + DEN(-1) + '_0300.json.gz',
    novySoubor: p.telo.soubor, predVelikostB: 1000, novaVelikostB: 999 } } });
  test('W2 bez úbytku (999 z 1000) → 409', r.status === 409, r.telo);
  r = await volej('/api/zaloha_disk', { method: 'POST', telo: { akce: 'varovani', disk: { den: DNES, predSoubor: 'otisk_main_' + DEN(-1) + '_0300.json.gz',
    novySoubor: p.telo.soubor, predVelikostB: 1000, novaVelikostB: 500 } } });
  const v = await ul('zalohy').cti('retence-varovani');
  test('W3 úbytek → varování (zdroj disk, text „(skript)") a retence stojí', r.status === 200 && r.telo.retence.stav === 'drzi' && v && v.zdroj === 'disk'
    && /\(skript\)/.test(v.text) && !!Z.retenceDrzena(v), v);
  const ret2 = await Z.retenceProved(DNES);
  test('W4 retence v Netlify po varování skriptu nemaže', !ret2.smazano.length, ret2);
  pamet.delete('zalohy/retence-varovani');

  /* K: starší otisk nepřepíše novější kopii; nový otisk zahodí kusy */
  await ul('zalohy').zapis('kopie-disk', { ...zaz, otisk: DEN(1), soubor: 'otisk_main_' + DEN(1) + '_0300.json.gz', zdroj: undefined, potvrzeno: 'heslo-spravce' });
  r = await volej('/api/zaloha_disk', { method: 'POST', telo: { akce: 'potvrdit', kopie: { soubor: p.telo.soubor, otisk: DNES, sha256: p.telo.sha256, velikostB: p.telo.velikostB } } });
  test('K2 potvrzení staršího otisku, když je potvrzená kopie novějšího → 409', r.status === 409 && (await ul('zalohy').cti('kopie-disk')).otisk === DEN(1), r.telo);
  pamet.delete('zalohy/kopie-disk');
  r = await volej('/api/zaloha_disk?kus=' + p.telo.kusy.length + '&otisk=' + DNES);
  test('K3 kus mimo rozsah → 400', r.status === 400);
  r = await volej('/api/zaloha_disk?kus=0&otisk=' + DEN(-3));
  test('K4 kus jiného otisku → 409', r.status === 409);
  r = await volej('/api/zaloha_disk?kus=abc&otisk=' + DNES);
  test('K5 neplatný kus → 400', r.status === 400);
  /* poškozený kus v úložišti */
  const kk = KS.kusKlic(DNES, 0);
  const puv = pamet.get(KS.KS_ULOZISTE + '/' + kk);
  const zl = Buffer.from(puv); zl[100] ^= 0xff; pamet.set(KS.KS_ULOZISTE + '/' + kk, zl);
  r = await volej('/api/zaloha_disk?kus=0&otisk=' + DNES);
  test('K6 poškozený kus v úložišti → 500 a příprava znovu', r.status === 500 && !(await ul(KS.KS_ULOZISTE).cti(KS.KS_STAV_KLIC)).hotovo, r.telo);
  p = await priprav();
  test('K7 nová příprava dá týž soubor (deterministický gzip, stejný SHA)', p.telo.hotovo && p.telo.sha256 === zaz.sha256, p.telo.sha256);
  /* souběh */
  const st = await ul(KS.KS_ULOZISTE).cti(KS.KS_STAV_KLIC);
  await Z.porizOtisk('nocni-otisk', '', DEN(1));
  r = await volej('/api/zaloha_disk', { method: 'POST', telo: { akce: 'priprav' } });
  const kusyKlice = (await ul(KS.KS_ULOZISTE).seznam('kus/'));
  test('K8 novější noční otisk → příprava začne znovu a staré kusy zmizí', r.telo.otisk === DEN(1) && kusyKlice.every(k => k.startsWith('kus/' + DEN(1) + '/')), { otisk: r.telo.otisk, kusyKlice });
  const st2 = await ul(KS.KS_ULOZISTE).cti(KS.KS_STAV_KLIC);
  await ul(KS.KS_ULOZISTE).zapis(KS.KS_STAV_KLIC, { ...st2, zamekDo: new Date(Date.now() + 60000).toISOString() });
  r = await volej('/api/zaloha_disk', { method: 'POST', telo: { akce: 'priprav' } });
  test('K9 krok, který právě běží jinde → bezi, postup se nemění', r.status === 200 && r.telo.bezi === true && r.telo.postup.cast === st2.cast, r.telo);
  await ul(KS.KS_ULOZISTE).zapis(KS.KS_STAV_KLIC, { ...st2, zamekDo: '' });
  void st;
  /* starý jednolitý otisk (před #522) */
  const mono = { porizena: new Date().toISOString(), zdroj: 'nocni-otisk', kdo: '', program: { platny: { verze: 2 } }, firma: null, rejstrik: null,
    zakazky: { a: { x: 1 }, b: null }, uzivatele: [{ email: 'm@priklad.cz', jmeno: 'M', role: 'Vedoucí', heslo: 'scrypt$m' }], sablony: null,
    zakaznici: { '987': { n: 1 } }, podpisy: { 'm@priklad.cz': 'x' }, smazani: null, zobrazeni: null, popisy: null, slovnik: null, controlling: null, controllingExporty: null };
  await ul('zalohy').zapis(DEN(2), mono);
  p = await priprav();
  kusy = await stahni(p.telo);
  const objM = JSON.parse(gunzipSync(Buffer.concat(kusy.map(k => k.telo))).toString('utf8'));
  test('K10 starý jednolitý otisk → týž tvar jako otiskProDisk + web', p.telo.otisk === DEN(2) && isDeepStrictEqual(objM, await ocekavany(DEN(2))), objM);

  /* ---------------- V: > 60 MB ---------------- */
  for (const k of [...pamet.keys()]) if (k.startsWith('zalohy/') || k.startsWith('zakazky/') || k.startsWith(KS.KS_ULOZISTE + '/')) pamet.delete(k);
  KS.KS_ROZPOCET.krokMs = 4000;
  /* ~66 MB nestlačitelných příloh (náhodné bajty v base64: gzip ušetří jen ~25 %) */
  const priloha = () => randomBytes(270000).toString('base64');
  for (let i = 0; i < 260; i++) await ul('zakazky').zapis('z/velka' + String(i).padStart(4, '0'), { cislo: i, prilohy: [priloha()] });
  for (let i = 0; i < 300; i++) await ul('zakazky').zapis('z/text' + String(i).padStart(4, '0'), { cislo: i, popis: 'Ocelová šachta '.repeat(200) });
  await Z.porizOtisk('nocni-otisk', '', DNES);
  const t0 = Date.now();
  p = await priprav();
  const casPripravy = Date.now() - t0;
  test('V1 velký otisk: soubor > 60 MiB (gzip)', p.telo.hotovo && p.telo.velikostB > 60 * 1048576, { velikostB: p.telo.velikostB, kroku: p.kroku });
  kusy = await stahni(p.telo);
  soubor = Buffer.concat(kusy.map(k => k.telo));
  test('V2 velký otisk: všechny odpovědi kusů ≤ 3 MiB (Netlify 6 MB i s base64), počet kusů = ⌈velikost / 3 MiB⌉',
    kusy.every(k => k.status === 200 && k.telo.length <= KS.KS_KUS_B) && kusy.length === Math.ceil(p.telo.velikostB / KS.KS_KUS_B), kusy.length);
  test('V3 velký otisk: SHA-256 a velikost složeného souboru sedí', createHash('sha256').update(soubor).digest('hex') === p.telo.sha256 && soubor.length === p.telo.velikostB);
  const velkeData = gunzipSync(soubor);
  test('V4 velký otisk: gunzip = očištěný otisk', isDeepStrictEqual(JSON.parse(velkeData.toString('utf8')), await ocekavany(DNES)));
  const ds = Buffer.from(await new Response(new Blob([soubor]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  test('V5 velký otisk: DecompressionStream (obnova ze souboru v prohlížeči) přečte celý soubor', ds.length === velkeData.length && ds.equals(velkeData));
  const stV = await ul(KS.KS_ULOZISTE).cti(KS.KS_STAV_KLIC);
  test('V6 velký otisk: stav přípravy v úložišti zůstává malý (ocas binárně, ne v JSON)', JSON.stringify(stV).length < 20000, JSON.stringify(stV).length);
  console.log('    (velký otisk: ' + (p.telo.velikostB / 1048576).toFixed(1) + ' MiB gzip, ' + (p.telo.velikostDatB / 1048576).toFixed(1)
    + ' MiB dat, ' + p.kroku + ' kroků, ' + kusy.length + ' kusů, příprava ' + casPripravy + ' ms)');
} catch (e) {
  fail++; console.log('FAIL výjimka', e && e.stack || e);
}
console.log('\n#577 AS kopie skriptem (server): ' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
