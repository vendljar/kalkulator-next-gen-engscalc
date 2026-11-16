/* #577 AS — SIMULACE SKRIPTU GOOGLE APPS SCRIPT (nastroje/apps_script/kopie_disk.gs)
 *
 * Skutečný kód skriptu běží ve vm s náhradami UrlFetchApp, DriveApp, Drive
 * API (obnovitelné nahrávání), PropertiesService, ScriptApp, MailApp,
 * Utilities, LockService a Session. Server kalkulátoru (functions/
 * zaloha_disk.mjs nad úložištěm v paměti) běží ve VLÁKNĚ: Apps Script volá
 * UrlFetchApp synchronně, proto náhrada čeká na odpověď vlákna přes
 * Atomics.wait. Ostrý a testovací web = dvě vlákna (PROSTREDI=test).
 *
 *   S1  první běh: soubor otisk_main_<den>_HHMM.json.gz ve složce, SHA-256
 *       a velikost = server, obsah = očištěný otisk, posledni_kopie_main.json,
 *       záznam kopie na serveru (skript), retence Disku jako src/retence_zaloh.js
 *       (jen vlastní prostředí; test, starý tvar a jiné soubory zůstanou)
 *   S2  druhý běh téhož otisku: nic, žádný e-mail
 *   S3  úbytek dat pod 90 %: nic se nesmaže, varování na serveru, e-mail
 *   S4  nepotvrzené varování: nic se nesmaže, e-mail připomene
 *   S5  špatný token: chyba e-mailem bez tokenu, nic se nenahraje
 *   S6  soubor stejného jména s jiným obsahem se nepřepíše; shodný se jen potvrdí
 *   S7  poškozený kus: chyba, nic se nepotvrdí; další běh naváže rozpracované
 *       nahrávání (bez nové relace)
 *   S8  běh přes limit 4,5 min: navázání spouštěčem kopieDiskPokracuj
 *   S9  druhá konfigurace (testovací web), prostředí nesedí, chybí token
 *   S10 spouštěč jednou, token nikde v e-mailech, záznamech ani logu
 *   S12 podvržená „budoucí" kopie: srovnává se s poslední skutečně předchozí,
 *       budoucí jméno se ohlásí (hlášení + e-mail) a nesmaže (K40-X4, B205)
 * Pojistka: na 59c56b3 spadne (functions/zaloha_disk.mjs ani skript nejsou).
 * Spuštění: node netlify/test_577_apps_script.mjs */
import { Worker, isMainThread, workerData, parentPort } from 'node:worker_threads';
import { createHash, randomBytes } from 'node:crypto';

const WEB = 'engscalc.netlify.app';

if (!isMainThread) {
  /* ================= VLÁKNO: server kalkulátoru ================= */
  for (const k of ['PROSTREDI', 'CONTEXT', 'NETLIFY', 'SITE_ID', 'SITE_NAME', 'DEPLOY_ID', 'NETLIFY_BLOBS_CONTEXT', 'AWS_LAMBDA_FUNCTION_NAME']) delete process.env[k];
  Object.assign(process.env, workerData.env);
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
  const Z = await import('./lib/zalohovani.mjs');
  const KS = await import('./lib/kopie_skript.mjs');
  const RZ = (await import('node:module')).createRequire(import.meta.url)('../src/retence_zaloh.js');
  const { default: handler } = await import('./functions/zaloha_disk.mjs');
  KS.KS_ROZPOCET.krokMs = 1;          // jedna část otisku na krok → víc kroků přípravy
  const ctl = new Int32Array(workerData.sab, 0, 2);
  const data = new Uint8Array(workerData.sab, 8);
  const vady = { kus: -1 };
  const odpovez = (meta, telo) => {
    const m = Buffer.from(JSON.stringify(meta), 'utf8');
    const t = telo ? Buffer.from(telo) : Buffer.alloc(0);
    const hl = Buffer.alloc(4); hl.writeUInt32LE(m.length, 0);
    const vse = Buffer.concat([hl, m, t]);
    if (vse.length > data.length) throw new Error('odpověď je větší než sdílená paměť');
    data.set(vse, 0);
    Atomics.store(ctl, 1, vse.length); Atomics.store(ctl, 0, 1); Atomics.notify(ctl, 0);
  };
  const otisk = async (den, zakazek, velikost) => {
    for (const k of await ul('zakazky').seznam('z/')) await ul('zakazky').smaz(k);
    for (let i = 0; i < zakazek; i++) await ul('zakazky').zapis('z/z' + String(i).padStart(4, '0'), { cislo: i, popis: 'Šachta ' + i, pril: randomBytes(velikost).toString('base64') });
    await Z.porizOtisk('nocni-otisk', '', den);
  };
  await ul('uzivatele').zapis('spravce@priklad.cz', { email: 'spravce@priklad.cz', jmeno: 'Správce', role: 'Administrátor', heslo: 'scrypt$tajne$otisk' });
  await ul('podpisy').zapis('spravce@priklad.cz', { obrazek: 'data:image/png;base64,TAJNY-PODPIS' });
  parentPort.on('message', async (z) => {
    try {
      if (z.typ === 'http') {
        const r = await handler(new Request('http://x' + z.cesta, { method: z.metoda, headers: { ...z.hlavicky, host: WEB },
          body: z.telo ? Buffer.from(z.telo, 'base64') : undefined }));
        let telo = Buffer.from(await r.arrayBuffer());
        const kus = /[?&]kus=(\d+)/.exec(z.cesta);
        if (kus && +kus[1] === vady.kus && r.status === 200) { telo = Buffer.from(telo); telo[7] ^= 0xff; }
        const hlavicky = {}; r.headers.forEach((v, k) => { hlavicky[k] = v; });
        return odpovez({ status: r.status, hlavicky }, telo);
      }
      if (z.typ === 'otisk') { await otisk(z.den, z.zakazek, z.velikost); return odpovez({ ok: true }); }
      if (z.typ === 'ocekavany') return odpovez({ ok: true }, Buffer.from(JSON.stringify({ ...Z.otiskProDisk(await Z.ctiOtisk(ul('zalohy'), z.den)), web: WEB })));
      if (z.typ === 'jmeno') {
        const klic = await Z.posledniNocniKlic();
        const sh = await Z.otiskSouhrn(ul('zalohy'), klic);
        return odpovez({ jmeno: RZ.retenceZalohDiskJmeno(klic, Z.prostrediZalohy(), sh.porizena) });
      }
      if (z.typ === 'soubor') {
        let v; do { v = await KS.kopieSkriptKrok({ web: WEB }); } while (!v.hotovo);
        const kusy = [];
        for (let i = 0; i < v.stav.kusy.length; i++) kusy.push((await KS.kopieSkriptKus(v.stav.otisk, i)).data);
        return odpovez({ ok: true }, Buffer.concat(kusy));
      }
      if (z.typ === 'cti') return odpovez({ hodnota: await ul(z.ul).cti(z.klic) });
      if (z.typ === 'smaz') { await ul(z.ul).smaz(z.klic); return odpovez({ ok: true }); }
      if (z.typ === 'vada') { vady.kus = z.kus; return odpovez({ ok: true }); }
      return odpovez({ chyba: 'neznámý příkaz' });
    } catch (e) { return odpovez({ chyba: String(e && e.stack || e) }); }
  });
  parentPort.postMessage('pripraveno');
} else {
  /* ================= HLAVNÍ VLÁKNO: Apps Script ================= */
  const { readFileSync } = await import('node:fs');
  const vm = await import('node:vm');
  const { gunzipSync } = await import('node:zlib');
  const { isDeepStrictEqual } = await import('node:util');
  const RZ = (await import('node:module')).createRequire(import.meta.url)('../src/retence_zaloh.js');
  const KOD = readFileSync(new URL('../nastroje/apps_script/kopie_disk.gs', import.meta.url), 'utf8');

  let ok = 0, fail = 0;
  const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
    else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 700)); } };

  const TOKEN_MAIN = 'm' + randomBytes(36).toString('base64url');
  const TOKEN_TEST = 't' + randomBytes(36).toString('base64url');
  const URL_MAIN = 'https://engscalc.priklad.test';
  const URL_TEST = 'https://testengscalc.priklad.test';
  const SLOZKA = '1g6vf8fLwjTWDiRVIU_Mw97Ts0Etg0lLO';

  const server = async (env) => {
    const sab = new SharedArrayBuffer(8 + 96 * 1048576);
    const worker = new Worker(new URL(import.meta.url), { workerData: { sab, env: { TAJEMSTVI_RELACE: 'testovaci-tajemstvi-jen-pro-lokalni-beh',
      ADMIN_EMAIL: 'spravce@priklad.cz', NETLIFY: 'true', CONTEXT: 'production', ...env } } });
    await new Promise((ok, chyba) => { worker.once('message', ok); worker.once('error', chyba); });
    return { worker, ctl: new Int32Array(sab, 0, 2), data: new Uint8Array(sab, 8) };
  };
  const rpc = (srv, zprava) => {
    Atomics.store(srv.ctl, 0, 0);
    srv.worker.postMessage(zprava);
    if (Atomics.wait(srv.ctl, 0, 0, 300000) === 'timed-out') throw new Error('server neodpověděl');
    const vse = Buffer.from(srv.data.subarray(0, srv.ctl[1]));
    const n = vse.readUInt32LE(0);
    const meta = JSON.parse(vse.subarray(4, 4 + n).toString('utf8'));
    if (meta.chyba) throw new Error('vlákno: ' + meta.chyba);
    return { meta, telo: vse.subarray(4 + n) };
  };
  const SM = await server({ KNG_DISK_TOKEN: TOKEN_MAIN, SITE_NAME: 'engscalc' });
  const ST = await server({ KNG_DISK_TOKEN: TOKEN_TEST, SITE_NAME: 'testengscalc', PROSTREDI: 'test' });

  /* ---------- Disk (DriveApp + Drive API) ---------- */
  const drive = { slozky: { [SLOZKA]: '_Zaloha Netlify DB' }, soubory: [], relace: {}, dalsi: 1, sha: true, relaci: 0 };
  const pridejSoubor = (name, data, slozka = SLOZKA, trashed = false) => { const f = { id: 'f' + (drive.dalsi++), name, data: Buffer.from(data), slozka, trashed }; drive.soubory.push(f); return f; };
  const blob = (buf) => ({ _buf: buf, getBytes: () => Array.from(new Int8Array(buf.buffer, buf.byteOffset, buf.length)),
    getDataAsString: () => buf.toString('utf8') });
  const soubor = (f) => ({ getId: () => f.id, getName: () => f.name, getSize: () => f.data.length, isTrashed: () => f.trashed,
    setTrashed: (b) => { f.trashed = !!b; }, setContent: (t) => { f.data = Buffer.from(String(t), 'utf8'); }, getBlob: () => blob(f.data) });
  const iter = (pole) => { let i = 0; return { hasNext: () => i < pole.length, next: () => soubor(pole[i++]) }; };
  const ve = (id) => drive.soubory.filter(f => f.slozka === id);
  const DriveApp = { getFolderById: (id) => {
    if (!drive.slozky[id]) throw new Error('Složka nenalezena');
    return { getId: () => id, getName: () => drive.slozky[id], getFiles: () => iter(ve(id)), getFilesByName: (n) => iter(ve(id).filter(f => f.name === n)),
      createFile: (name, obsah) => soubor(pridejSoubor(name, Buffer.from(String(obsah), 'utf8'), id)) };
  } };
  const metaSouboru = (f) => ({ id: f.id, name: f.name, size: String(f.data.length), ...(drive.sha ? { sha256Checksum: createHash('sha256').update(f.data).digest('hex') } : {}) });

  /* ---------- virtuální čas ---------- */
  const cas = { posun: 0, zaFetch: 0 };
  class FalesneDatum extends Date {
    constructor(...a) { if (a.length) super(...a); else super(Date.now() + cas.posun); }
    static now() { return Date.now() + cas.posun; }
  }

  /* ---------- kontext Apps Scriptu ---------- */
  const vlastnosti = new Map();
  const zaznam = { emaily: [], log: [], spoustece: [], fetch: [] };
  const odpoved = (kod, telo, hlavicky = {}) => { const b = Buffer.isBuffer(telo) ? telo : Buffer.from(String(telo || ''), 'utf8');
    return { getResponseCode: () => kod, getContentText: () => b.toString('utf8'), getBlob: () => blob(b), getHeaders: () => hlavicky }; };
  const telo = (p) => (p == null ? null : typeof p === 'string' ? Buffer.from(p, 'utf8') : p._buf ? p._buf : Buffer.from(p));
  const hl = (h, j) => { for (const k of Object.keys(h || {})) if (k.toLowerCase() === j) return String(h[k]); return ''; };
  const UrlFetchApp = { fetch(url, opt = {}) {
    cas.posun += cas.zaFetch;
    const m = String(opt.method || 'get').toLowerCase();
    zaznam.fetch.push(m + ' ' + url.replace(/\?.*$/, ''));
    for (const [zac, srv] of [[URL_MAIN, SM], [URL_TEST, ST]]) {
      if (!url.startsWith(zac + '/')) continue;
      const h = { ...(opt.headers || {}) };
      if (opt.contentType) h['content-type'] = opt.contentType;
      const b = telo(opt.payload);
      const r = rpc(srv, { typ: 'http', metoda: m.toUpperCase(), cesta: url.slice(zac.length), hlavicky: h, telo: b ? b.toString('base64') : null });
      return odpoved(r.meta.status, r.telo, r.meta.hlavicky);
    }
    if (url.startsWith('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable')) {
      if (hl(opt.headers, 'authorization') !== 'Bearer oauth-falesny') return odpoved(401, '{}');
      const md = JSON.parse(telo(opt.payload).toString('utf8'));
      if (!md.parents || !drive.slozky[md.parents[0]]) return odpoved(404, '{}');
      const id = 'https://upload.priklad.test/relace/' + (++drive.relaci);
      drive.relace[id] = { md, celkem: +hl(opt.headers, 'x-upload-content-length'), casti: [], prijato: 0 };
      return odpoved(200, '', { Location: id });
    }
    if (url.startsWith('https://upload.priklad.test/relace/')) {
      const r = drive.relace[url];
      if (!r) return odpoved(404, '{}');
      const cr = hl(opt.headers, 'content-range');
      const hotovo = () => { const f = pridejSoubor(r.md.name, Buffer.concat(r.casti), r.md.parents[0]); r.soubor = f;
        if (drive.poskod) f.data[f.data.length >> 1] ^= 0xff;      // S11: Disk uložil jiné bajty (stejná délka)
        return odpoved(200, JSON.stringify(metaSouboru(f))); };
      if (/^bytes \*\/\d+$/.test(cr)) return r.soubor ? odpoved(200, JSON.stringify(metaSouboru(r.soubor)))
        : odpoved(308, '', r.prijato ? { Range: 'bytes=0-' + (r.prijato - 1) } : {});
      const x = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(cr);
      const b = telo(opt.payload);
      if (!x || +x[1] !== r.prijato || +x[2] - +x[1] + 1 !== b.length || +x[3] !== r.celkem) return odpoved(400, '{"error":"rozsah"}');
      if (b.length % 262144 !== 0 && +x[2] + 1 !== r.celkem) return odpoved(400, '{"error":"kus není násobek 256 KiB"}');
      r.casti.push(Buffer.from(b)); r.prijato += b.length;
      return r.prijato === r.celkem ? hotovo() : odpoved(308, '', { Range: 'bytes=0-' + (r.prijato - 1) });
    }
    const mm = /^https:\/\/www\.googleapis\.com\/drive\/v3\/files\/([^?]+)\?/.exec(url);
    if (mm) { const f = drive.soubory.find(s => s.id === decodeURIComponent(mm[1])); return f ? odpoved(200, JSON.stringify(metaSouboru(f))) : odpoved(404, '{}'); }
    throw new Error('UrlFetchApp: neznámá adresa ' + url);
  } };
  const spoustec = (jmeno, popis) => ({ jmeno, popis, getHandlerFunction: () => jmeno });
  const ctx = vm.createContext({
    console: { log: (t) => zaznam.log.push(String(t)) },
    Date: FalesneDatum,
    UrlFetchApp, DriveApp,
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (vlastnosti.has(k) ? vlastnosti.get(k) : null),
      setProperty: (k, v) => { vlastnosti.set(k, String(v)); }, deleteProperty: (k) => { vlastnosti.delete(k); } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    ScriptApp: { getOAuthToken: () => 'oauth-falesny', getProjectTriggers: () => zaznam.spoustece.slice(),
      deleteTrigger: (t) => { zaznam.spoustece = zaznam.spoustece.filter(x => x !== t); },
      newTrigger: (jmeno) => ({ timeBased: () => ({
        everyDays: (n) => ({ atHour: (h) => ({ create: () => { zaznam.spoustece.push(spoustec(jmeno, 'denně ' + n + ' v ' + h)); } }) }),
        after: (ms) => ({ create: () => { zaznam.spoustece.push(spoustec(jmeno, 'za ' + ms + ' ms')); } }) }) }) },
    MailApp: { sendEmail: (komu, predmet, text) => { zaznam.emaily.push({ komu, predmet, text }); } },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'spravce@priklad.cz' }) },
    Utilities: { DigestAlgorithm: { SHA_256: 'SHA_256' }, sleep: (ms) => { cas.posun += ms; },
      computeDigest: (alg, b) => Array.from(new Int8Array(createHash('sha256').update(Buffer.from(b)).digest())) },
  });
  vm.runInContext(KOD, ctx, { filename: 'kopie_disk.gs' });

  const D = (posun) => new Date(Date.now() + posun * 86400000).toISOString().slice(0, 10);
  const DNES = D(0);
  const nastav = (o) => { for (const [k, v] of Object.entries(o)) { if (v === null) vlastnosti.delete(k); else vlastnosti.set(k, v); } };
  const naDisku = (re) => drive.soubory.filter(f => f.slozka === SLOZKA && !f.trashed && re.test(f.name));
  const zaznamServeru = (srv) => rpc(srv, { typ: 'cti', ul: 'zalohy', klic: 'kopie-disk' }).meta.hodnota;
  const pocetEmailu = () => zaznam.emaily.length;
  const beh = (fn = 'kopieDiskRucne') => ctx[fn]();

  try {
    nastav({ KNG_MAIN_TOKEN: TOKEN_MAIN, KNG_MAIN_URL: URL_MAIN });

    /* ---------- S1: první běh + retence ---------- */
    rpc(SM, { typ: 'otisk', den: DNES, zakazek: 40, velikost: 250000 });     // ~8 MB dat → 3 části, 3 kusy
    const pred = [];
    for (let d = 1; d <= 70; d++) pred.push(pridejSoubor('otisk_main_' + D(-d) + '_0310.json.gz', 'stara kopie main ' + d));
    for (let d = 1; d <= 70; d += 3) pridejSoubor('otisk_test_' + D(-d) + '_0310.json.gz', 'kopie testu ' + d);
    pridejSoubor('otisk_2026-10-01.json.gz', 'starý tvar');
    pridejSoubor('posledni_kopie_test.json', '{}');
    pridejSoubor('zaloha_online_2026-09-01.json', '{}');
    pridejSoubor('otisk_main_' + D(-200) + '_0310.json.gz', 'v koši', SLOZKA, true);
    const jmenaPred = drive.soubory.filter(f => !f.trashed).map(f => f.name);
    let v = beh();
    const novy = naDisku(new RegExp('^otisk_main_' + DNES + '_\\d{4}\\.json\\.gz$'));
    test('S1 první běh bez chyby a bez e-mailu', v && !v.chyby.length && !v.upozorneni.length && pocetEmailu() === 0, v);
    test('S1 ve složce je jedna nová kopie otisk_main_<dnes>_HHMM.json.gz', novy.length === 1, drive.soubory.map(f => f.name).slice(-5));
    const zs = zaznamServeru(SM);
    test('S1 server má záznam kopie skriptu (zdroj skript, token-skript, tentýž soubor, SHA a velikost)', zs && zs.zdroj === 'skript'
      && zs.potvrzeno === 'token-skript' && novy[0] && zs.soubor === novy[0].name && zs.velikostB === novy[0].data.length
      && zs.sha256 === createHash('sha256').update(novy[0].data).digest('hex'), zs);
    const ocek = JSON.parse(rpc(SM, { typ: 'ocekavany', den: DNES }).telo.toString('utf8'));
    test('S1 obsah kopie na Disku = očištěný noční otisk (bez hesel a podpisů)', novy[0] && isDeepStrictEqual(JSON.parse(gunzipSync(novy[0].data).toString('utf8')), ocek)
      && !gunzipSync(novy[0].data).toString().includes('scrypt') && !gunzipSync(novy[0].data).toString().includes('TAJNY-PODPIS'));
    const pk = naDisku(/^posledni_kopie_main\.json$/);
    const pkObj = pk.length ? JSON.parse(pk[0].data.toString('utf8')) : null;
    test('S1 posledni_kopie_main.json (soubor, SHA, velikost, velikost dat, zdroj skript)', pk.length === 1 && pkObj.soubor === zs.soubor
      && pkObj.sha256 === zs.sha256 && pkObj.velikostDatB > pkObj.velikostB && pkObj.zdroj === 'skript' && pkObj.prostredi === 'main', pkObj);
    const ocekSmazat = RZ.retenceZalohDiskVyber(jmenaPred.concat([zs.soubor]), DNES, [zs.soubor], 'main');
    const smazane = drive.soubory.filter(f => f.trashed && f.name !== 'otisk_main_' + D(-200) + '_0310.json.gz').map(f => f.name).sort();
    test('S1 retence Disku = retenceZalohDiskVyber (7 dní, nedělní 8 týdnů, první v měsíci 6 měsíců)', ocekSmazat.length > 20
      && JSON.stringify(smazane) === JSON.stringify(ocekSmazat), { ocekSmazat: ocekSmazat.length, smazane: smazane.length });
    test('S1 retence nesáhla na kopie testu, starý tvar ani jiné soubory', drive.soubory.filter(f => /^otisk_test_|^otisk_2026-10-01|^posledni_kopie_test|^zaloha_online/.test(f.name))
      .every(f => !f.trashed));
    test('S1 nahrávání šlo po kusech (víc PUT po 3 MiB) a jednou relací', drive.relaci === 1 && zaznam.fetch.filter(x => x.startsWith('put https://upload')).length >= 3, zaznam.fetch.filter(x => x.startsWith('put')));
    void pred;

    /* ---------- S2: druhý běh ---------- */
    const fetchPred = zaznam.fetch.length;
    v = beh();
    test('S2 druhý běh téhož otisku: nic k práci, žádný e-mail, jen dotaz na metadata', !v.chyby.length && /už na Disku je/.test(v.hlaseni.join())
      && pocetEmailu() === 0 && zaznam.fetch.length - fetchPred === 1, v);

    /* ---------- S3: úbytek ---------- */
    rpc(SM, { typ: 'otisk', den: D(1), zakazek: 5, velikost: 200000 });
    const trashPred = drive.soubory.filter(f => f.trashed).length;
    v = beh();
    const varovani = rpc(SM, { typ: 'cti', ul: 'zalohy', klic: 'retence-varovani' }).meta.hodnota;
    test('S3 úbytek dat: kopie uložena a potvrzena, nic se nesmazalo', naDisku(new RegExp('^otisk_main_' + D(1))).length === 1
      && zaznamServeru(SM).otisk === D(1) && drive.soubory.filter(f => f.trashed).length === trashPred, v);
    test('S3 úbytek dat: varování na serveru (zdroj disk) a e-mail „Upozornění"', varovani && varovani.zdroj === 'disk' && /\(skript\)/.test(varovani.text)
      && pocetEmailu() === 1 && /Upozornění/.test(zaznam.emaily[0].predmet) && /méně dat/.test(zaznam.emaily[0].text), { varovani, e: zaznam.emaily[0] });

    /* ---------- S4: nepotvrzené varování ---------- */
    rpc(SM, { typ: 'otisk', den: D(2), zakazek: 5, velikost: 200000 });
    v = beh();
    test('S4 nepotvrzené varování: kopie ano, mazání ne, e-mail připomene', naDisku(new RegExp('^otisk_main_' + D(2))).length === 1
      && drive.soubory.filter(f => f.trashed).length === trashPred && pocetEmailu() === 2 && /nepotvrzený úbytek/.test(zaznam.emaily[1].text), v);
    rpc(SM, { typ: 'smaz', ul: 'zalohy', klic: 'retence-varovani' });

    /* ---------- S5: špatný token ---------- */
    rpc(SM, { typ: 'otisk', den: D(3), zakazek: 5, velikost: 200000 });
    nastav({ KNG_MAIN_TOKEN: 'x'.repeat(48) });
    const relaciPred = drive.relaci;
    v = beh();
    test('S5 špatný token: chyba 403 e-mailem, nic se nenahrálo', v.chyby.length === 1 && /403/.test(v.chyby[0]) && drive.relaci === relaciPred
      && pocetEmailu() === 3 && /CHYBA/.test(zaznam.emaily[2].predmet) && !zaznam.emaily[2].text.includes('x'.repeat(20)), v);
    nastav({ KNG_MAIN_TOKEN: TOKEN_MAIN });

    /* ---------- S6: soubor stejného jména ---------- */
    const jm = rpc(SM, { typ: 'jmeno' }).meta.jmeno;
    const cizi = pridejSoubor(jm, 'cizí obsah, nepřepisovat');
    v = beh();
    test('S6 soubor stejného jména s jiným obsahem: nepřepíše se, chyba e-mailem, nic se nepotvrdí', v.chyby.length === 1 && /nepřepisuje/.test(v.chyby[0])
      && cizi.data.toString() === 'cizí obsah, nepřepisovat' && !cizi.trashed && zaznamServeru(SM).otisk === D(2) && pocetEmailu() === 4, v);
    cizi.data = rpc(SM, { typ: 'soubor' }).telo;
    const relaci6 = drive.relaci;
    v = beh();
    test('S6 shodný soubor stejného jména (SHA Disku sedí): bez nahrávání se jen potvrdí', !v.chyby.length && drive.relaci === relaci6
      && zaznamServeru(SM).otisk === D(3) && naDisku(new RegExp('^' + jm.replace(/\./g, '\\.') + '$')).length === 1, v);

    /* ---------- S7: poškozený kus + navázání nahrávání ---------- */
    rpc(SM, { typ: 'otisk', den: D(4), zakazek: 40, velikost: 250000 });
    rpc(SM, { typ: 'vada', kus: 1 });
    const relaci7 = drive.relaci;
    v = beh();
    test('S7 poškozený kus 1: chyba „nesedí", nic se nepotvrdí, soubor na Disku nevznikne', v.chyby.length === 1 && /kus 1 nesedí/.test(v.chyby[0])
      && zaznamServeru(SM).otisk === D(3) && !naDisku(new RegExp('^otisk_main_' + D(4))).length, v);
    rpc(SM, { typ: 'vada', kus: -1 });
    v = beh();
    const k7 = naDisku(new RegExp('^otisk_main_' + D(4)));
    test('S7 další běh naváže rozpracované nahrávání (táž relace) a dokončí ho', !v.chyby.length && drive.relaci === relaci7 + 1 && k7.length === 1
      && zaznamServeru(SM).sha256 === createHash('sha256').update(k7[0].data).digest('hex') && !vlastnosti.has('KNG_STAV_MAIN'), { v, relace: drive.relaci - relaci7 });

    /* ---------- S8: běh přes limit → navázání spouštěčem ---------- */
    rpc(SM, { typ: 'otisk', den: D(5), zakazek: 40, velikost: 250000 });
    cas.zaFetch = 60000;
    v = beh();
    test('S8 běh přes 4,5 min: naváže spouštěčem kopieDiskPokracuj (bez e-mailu)', v.navazat && zaznam.spoustece.some(t => t.jmeno === 'kopieDiskPokracuj')
      && pocetEmailu() === 5 - 0 - 0 && !naDisku(new RegExp('^otisk_main_' + D(5))).length, { v, e: pocetEmailu() });
    let n = 0;
    while (v.navazat && n++ < 8) v = beh('kopieDiskPokracuj');
    cas.zaFetch = 0;
    const k8 = naDisku(new RegExp('^otisk_main_' + D(5)));
    test('S8 navázané běhy kopii dokončí (SHA sedí, spouštěč navázání uklizený)', !v.chyby.length && k8.length === 1
      && zaznamServeru(SM).sha256 === createHash('sha256').update(k8[0].data).digest('hex')
      && !zaznam.spoustece.some(t => t.jmeno === 'kopieDiskPokracuj') && n >= 1, { v, n });
    /* ---------- S11: SHA-256 uloženého souboru na Disku nesedí ---------- */
    rpc(SM, { typ: 'otisk', den: D(6), zakazek: 6, velikost: 100000 });
    drive.poskod = true;
    v = beh();
    drive.poskod = false;
    const vadny = naDisku(new RegExp('^otisk_main_' + D(6)));
    test('S11 SHA-256 souboru na Disku nesedí: chyba, nic se nepotvrdí, rozpracovaný stav zapomenut', v.chyby.length === 1 && /SHA-256 souboru .* nesedí/.test(v.chyby[0])
      && zaznamServeru(SM).otisk === D(5) && vadny.length === 1 && !vlastnosti.has('KNG_STAV_MAIN'), v);
    v = beh();
    test('S11 další běh vadný soubor nepřepíše (stejné jméno, jiný obsah)', v.chyby.length === 1 && /nepřepisuje/.test(v.chyby[0]), v);
    vadny[0].trashed = true;                                     // správce podle e-mailu přesune do koše
    v = beh();
    const k11 = naDisku(new RegExp('^otisk_main_' + D(6)));
    test('S11 po přesunu do koše se kopie nahraje znovu a potvrdí', !v.chyby.length && k11.length === 1 && zaznamServeru(SM).otisk === D(6)
      && zaznamServeru(SM).sha256 === createHash('sha256').update(k11[0].data).digest('hex'), v);
    /* ---------- S12 (K40-X4, B205): podvržená „budoucí" kopie ve sdílené složce ----------
     * Velký soubor s datem za 40 dní: do K40a ho skript vzal jako srovnávací
     * (abecedně poslední) → falešný úbytek, varování na serveru, mazání stojí. */
    rpc(SM, { typ: 'smaz', ul: 'zalohy', klic: 'retence-varovani' });   // úbytek z S11 „potvrzen“
    const nejvetsi = Math.max(...naDisku(/^otisk_main_/).map(f => f.data.length));
    const budouci = pridejSoubor('otisk_main_' + D(40) + '_0310.json.gz', randomBytes(nejvetsi * 3));
    rpc(SM, { typ: 'otisk', den: D(7), zakazek: 6, velikost: 100000 });
    const emailyPredS12 = pocetEmailu();
    v = beh();
    const var12 = rpc(SM, { typ: 'cti', ul: 'zalohy', klic: 'retence-varovani' }).meta.hodnota;
    test('S12 budoucí kopie: srovná se s poslední skutečně předchozí — žádný falešný úbytek ani varování na serveru',
      !v.chyby.length && !var12 && naDisku(new RegExp('^otisk_main_' + D(7))).length === 1 && !/méně dat/.test(v.hlaseni.join()), { v, var12 });
    const posledniEmail = zaznam.emaily[zaznam.emaily.length - 1] || {};
    test('S12 budoucí kopie se ohlásí jako podezřelá (hlášení i e-mail „Upozornění") a nesmaže se',
      !budouci.trashed && /budoucím datem/.test(v.hlaseni.join()) && pocetEmailu() === emailyPredS12 + 1
      && /Upozornění/.test(posledniEmail.predmet || '') && posledniEmail.text.includes(budouci.name), { v, e: posledniEmail });
    budouci.trashed = true;                                      // správce podle e-mailu smaže
    /* ---------- S13 (revize K40a D2): den kopie nejde určit → úklid nemaže a připomene ----------
     * kngUklid_ přímo nad složkou v paměti; dřív se srovnání tiše přeskočilo a mazalo se dál. */
    {
      const kos = [];
      const soubory = ['otisk_main_2026-01-05_0310.json.gz', 'otisk_main_2026-03-01_0310.json.gz', 'otisk_main_2026-10-27_0310.json.gz']
        .map(j => ({ getName: () => j, isTrashed: () => false, setTrashed: () => kos.push(j), getId: () => j, getSize: () => 10 }));
      const sl = { getName: () => '_Zaloha Netlify DB', getFiles: () => { let i = 0; return { hasNext: () => i < soubory.length, next: () => soubory[i++] }; } };
      let u13, chyba13 = null;
      try { u13 = ctx.kngUklid_({ prostredi: 'main' }, sl, { soubor: 'otisk_main_2026-10-27_0310.json.gz', otisk: '2026-1-27', velikostDatB: 10 },
        { retence: {}, kopieDisk: { kdy: new Date(Date.now()).toISOString() } }, null, null); } catch (e) { chyba13 = e.message; }
      test('S13 neplatný den kopie: úklid nesmaže nic, řekne proč a připomene e-mailem (upozornění)',
        !chyba13 && kos.length === 0 && /den kopie nejde určit/.test(u13 && u13.text || '') && /den kopie nejde určit/.test(u13 && u13.upozorneni || ''), { u13, chyba13, kos });
    }
    const pocetPredS9 = pocetEmailu();

    /* ---------- S9: testovací web, nesedící prostředí, chybějící token ---------- */
    rpc(ST, { typ: 'otisk', den: DNES, zakazek: 4, velikost: 100000 });
    nastav({ KNG_TEST_TOKEN: TOKEN_TEST, KNG_TEST_URL: URL_TEST });
    const testPred = drive.soubory.filter(f => /^otisk_test_/.test(f.name) && !f.trashed).map(f => f.name);
    v = beh();
    const kt = naDisku(new RegExp('^otisk_test_' + DNES + '_\\d{4}\\.json\\.gz$'));
    const zt = zaznamServeru(ST);
    test('S9 druhá konfigurace: testovací web má vlastní kopii a záznam (prostředí test), ostrý „už je"', !v.chyby.length && kt.length === 1
      && zt && zt.prostredi === 'test' && zt.soubor === kt[0].name && /main: kopie otisku .* už na Disku je/.test(v.hlaseni.join('|'))
      && naDisku(/^posledni_kopie_test\.json$/).length === 1, v);
    const ocekT = RZ.retenceZalohDiskVyber(testPred.concat([kt[0] && kt[0].name]), DNES, [kt[0] && kt[0].name], 'test');
    test('S9 retence testu maže jen kopie testu podle pravidla', ocekT.every(j => drive.soubory.filter(f => f.name === j).every(f => f.trashed))
      && naDisku(new RegExp('^otisk_main_' + D(5))).length === 1, ocekT);
    nastav({ KNG_TEST_URL: URL_MAIN, KNG_TEST_TOKEN: TOKEN_MAIN });
    v = beh();
    test('S9 adresa ostrého webu v konfiguraci testu: chyba „hlásí prostředí main"', v.chyby.length === 1 && /hlásí prostředí „main"/.test(v.chyby[0]), v);
    nastav({ KNG_TEST_URL: 'http://testengscalc.priklad.test' });
    v = beh();
    test('S9 adresa bez https: chyba, token se nikam nepošle', v.chyby.length === 1 && /musí být https/.test(v.chyby[0]), v);
    nastav({ KNG_TEST_URL: null, KNG_TEST_TOKEN: null, KNG_MAIN_TOKEN: null });
    v = beh();
    test('S9 bez tokenu: chyba „chybí token" e-mailem', v.chyby.length === 1 && /chybí token/.test(v.chyby[0]) && pocetEmailu() === pocetPredS9 + 3, v);
    nastav({ KNG_MAIN_TOKEN: TOKEN_MAIN });

    /* ---------- S10: spouštěč, tokeny nikde ---------- */
    ctx.nastavitSpoustec(); ctx.nastavitSpoustec();
    const denni = zaznam.spoustece.filter(t => t.jmeno === 'kopieDiskNoc');
    test('S10 nastavitSpoustec: jeden denní spouštěč kopieDiskNoc v 6 h (opakování neduplikuje)', denni.length === 1 && denni[0].popis === 'denně 1 v 6', denni);
    const stavText = ctx.kopieDiskStav().join('\n');
    const vse = JSON.stringify(zaznam.emaily) + zaznam.log.join('\n') + (vlastnosti.get('KNG_ZAZNAM') || '') + stavText;
    test('S10 token není v žádném e-mailu, záznamu, logu ani výpisu stavu', !vse.includes(TOKEN_MAIN) && !vse.includes(TOKEN_TEST)
      && !vse.includes(TOKEN_MAIN.slice(0, 16)) && /token \d+ znaků/.test(stavText), stavText);
    test('S10 e-maily jdou jen na adresu účtu (Session), v kódu žádná adresa', zaznam.emaily.every(e => e.komu === 'spravce@priklad.cz')
      && !/@[a-z0-9-]+\.[a-z]{2,}/i.test(KOD.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')));
    test('S10 token se posílá jen v hlavičce Authorization (žádná adresa s tokenem)', zaznam.fetch.every(x => !x.includes(TOKEN_MAIN)));
  } catch (e) {
    fail++; console.log('FAIL výjimka', e && e.stack || e);
  }
  await SM.worker.terminate(); await ST.worker.terminate();
  console.log('\n#577 AS simulace Apps Scriptu: ' + ok + ' OK, ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
}
