/* ============================================================
 * #523 Z2 — ÚKLID STARÝCH KOPIÍ NA DISKU A KOMPRESE KOPIE
 * (rozhodnutí J. V. 26. 10. 2026)
 *
 * Ve složce „_Zaloha Netlify DB" na Disku Google aplikace po každé
 * ÚSPĚŠNÉ kopii smaže staré kopie podle pravidla: posledních 7 dní
 * + týdenní (neděle / nejbližší starší) 8 týdnů + měsíční (první
 * v měsíci) 6 měsíců. Maže JEN soubory přesně tvaru
 * otisk_RRRR-MM-DD.json(.gz), nikdy nejnovější, nikdy právě zapsanou
 * kopii, nikdy když kopie selhala, server ji nepřijal nebo zapsaný soubor
 * nesedí velikostí či SHA-256, a jen ve složce „_Zaloha Netlify DB".
 * Kopie je komprimovaná (otisk_…json.gz) a obnova ze souboru ji načte.
 *
 * Mazání je nevratné → tabulka přesného výběru jmen a simulovaná složka
 * (File System Access: values / getFileHandle / removeEntry) ve vm
 * s úseky src/ui/online_ui.js (vzor test_o7_kopie_klient.js).
 *
 * Pojistka: s online_ui.js a uloziste.js z v26.10.8 (Z1) sada spadne —
 * src/retence_zaloh.js ani kopieDiskUklid neexistují, kopie je .json
 * a ze složky se nic nemaže. Po opravě projde.
 * ============================================================ */
const fs = require('fs');
const vm = require('vm');
const { gunzipSync, gzipSync } = require('zlib');
const U = require('./uloziste.js');
const R = require('./retence_zaloh.js');
const zdroj = fs.readFileSync(__dirname + '/ui/online_ui.js', 'utf8');
const usek = (od, po) => { const a = zdroj.indexOf(od), b = zdroj.indexOf(po, a + 1); return a > 0 && b > a ? zdroj.slice(a, b) : ''; };
const kopie = usek('/* ZÁLOHA PO STRÁNKÁCH (#522 Z1)', 'function kopieDiskVelikost');
const tlacitko = usek('function kopieDiskVelikost', '/* Po přihlášení správce');
const obnovaText = usek('async function onlineObnovaSouborText', 'function onlineObnovaPripraveno');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
const J = (x) => JSON.stringify(x);
test('úseky online_ui.js nalezeny (kopie na Disk, úklid, obnova .gz)', !!kopie && !!obnovaText && !!tlacitko && kopie.includes('kopieDiskUklid'));

/* ---------------- 1) tabulka: které kopie na Disku odejdou ---------------- */
{
  const V = R.retenceZalohDiskVyber;
  const nove = [];
  for (let d = 21; d <= 27; d++) nove.push('otisk_2026-10-' + d + '.json.gz');
  const cizi = ['posledni_kopie.json', 'otisk_2026-01-01 (1).json', 'otisk_2026-01-01.json.bak', 'Otisk_2026-01-01.json',
    'zaloha_online_2026-01-01.json', 'otisk_2026-02-31.json', 'otisk_2026-1-1.json', 'otisk_2026-01-01.JSON', 'otisk_2026-01-01.json.gz.tmp',
    'otisk_2026-01-01.zip', 'poznamka.txt'];
  const slozka = nove.concat(['otisk_2026-10-20.json', 'otisk_2026-10-18.json', 'otisk_2026-10-13.json', 'otisk_2026-10-01.json',
    'otisk_2026-09-06.json', 'otisk_2026-09-04.json', 'otisk_2026-08-30.json', 'otisk_2026-08-02.json', 'otisk_2026-04-05.json'], cizi);
  /* Ručně (dnes 27. 10. 2026, úterý):
   *  21.–27. 10. denní (věk 0–6); 20. 10. (úterý, věk 7) — týden 19.–25. 10. drží neděle 25. 10. → pryč;
   *  18. 10. neděle (věk 9) týdenní; 13. 10. úterý téhož týdne → pryč;
   *  1. 10. první v říjnu; 6. 9. neděle (věk 51) týdenní; 4. 9. první v září;
   *  30. 8. neděle (věk 58) → pryč; 2. 8. první v srpnu (hranice 27. 4.) zůstane;
   *  5. 4. první v dubnu — starší 6 měsíců → pryč. Cizí jména nikdy. */
  test('#523 Disk tabulka: 27. 10. 2026 — přesně 4 kopie k smazání', J(V(slozka, '2026-10-27'))
    === J(['otisk_2026-04-05.json', 'otisk_2026-08-30.json', 'otisk_2026-10-13.json', 'otisk_2026-10-20.json']), V(slozka, '2026-10-27'));
  test('#523 Disk tabulka: cizí a podobná jména se nikdy nemažou (ani po letech)',
    V(cizi, '2031-01-01').length === 0 && V(cizi.concat(['otisk_2030-12-31.json']), '2031-01-01').length === 0);
  test('#523 Disk tabulka: 7 dní — věk 6 zůstane, 7 se smaže (středa, týden drží neděle)',
    J(V(['otisk_2027-03-01.json', 'otisk_2027-03-10.json', 'otisk_2027-03-11.json', 'otisk_2027-03-14.json', 'otisk_2027-03-17.json'], '2027-03-17'))
      === J(['otisk_2027-03-10.json']));
  test('#523 Disk tabulka: týden bez neděle drží sobotu; neděle stará 56 dní odejde',
    J(V(['otisk_2027-01-01.json', 'otisk_2027-01-29.json', 'otisk_2027-01-30.json', 'otisk_2027-01-31.json', 'otisk_2027-02-06.json',
      'otisk_2027-02-27.json', 'otisk_2027-03-28.json'], '2027-03-28'))
      === J(['otisk_2027-01-29.json', 'otisk_2027-01-30.json', 'otisk_2027-01-31.json']));
  test('#523 Disk tabulka: týdenní kopie se dělají jen jednou týdně — všechny poslední týdny zůstanou',
    V(['otisk_2026-09-06.json', 'otisk_2026-09-13.json', 'otisk_2026-09-20.json', 'otisk_2026-09-27.json', 'otisk_2026-10-04.json',
      'otisk_2026-10-11.json', 'otisk_2026-10-18.json', 'otisk_2026-10-25.json'], '2026-10-27').length === 0);
  test('#523 Disk tabulka: .json i .json.gz téhož dne — odcházejí i zůstávají spolu',
    J(V(['otisk_2027-01-05.json', 'otisk_2027-01-05.json.gz', 'otisk_2027-01-01.json', 'otisk_2027-03-01.json.gz', 'otisk_2027-04-01.json.gz'], '2027-04-01'))
      === J(['otisk_2027-01-05.json', 'otisk_2027-01-05.json.gz']));
  test('#523 Disk tabulka: nejnovější kopie zůstane, i když je stará', V(['otisk_2026-01-03.json'], '2028-01-01').length === 0
    && J(V(['otisk_2026-01-03.json', 'otisk_2026-01-04.json'], '2028-01-01')) === J(['otisk_2026-01-03.json']));
  test('#523 Disk tabulka: chráněné jméno (právě zapsaná kopie) se nesmaže ani se svým dnem',
    J(V(['otisk_2027-03-02.json', 'otisk_2027-03-02.json.gz', 'otisk_2027-03-01.json', 'otisk_2027-03-07.json', 'otisk_2027-03-20.json'],
      '2027-03-20', ['otisk_2027-03-02.json.gz'])) === '[]');
  test('#523 Disk tabulka: neplatný dnešek = nic', V(['otisk_2020-01-01.json', 'otisk_2020-01-02.json'], '2027-02-31').length === 0
    && V(['otisk_2020-01-01.json', 'otisk_2020-01-02.json'], '').length === 0);
}

/* ---------------- 2) simulovaná složka a průběh kopie ---------------- */
/* Složka v paměti: jméno → { kind, data: Uint8Array }. `zmenaPoZapisu` umí
 * podvrhnout jiný obsah při čtení (useknutý / jiný soubor). */
const slozka = (name, soubory) => {
  const m = new Map(Object.entries(soubory || {}).map(([j, v]) => [j, typeof v === 'object' && v.kind ? v : { kind: 'file', data: Buffer.from(String(v)) }]));
  const h = { name, m, smazane: [], zmenaPoZapisu: null,
    async getFileHandle(jm, o) {
      if (!m.has(jm) && !(o && o.create)) { const e = new Error('není'); e.name = 'NotFoundError'; throw e; }
      if (m.has(jm) && m.get(jm).kind !== 'file') { const e = new Error('je to složka'); e.name = 'TypeMismatchError'; throw e; }
      return {
        createWritable: async () => { const casti = [];
          return { write: async (t) => { casti.push(typeof t === 'string' ? Buffer.from(t) : Buffer.from(t)); },
            close: async () => { m.set(jm, { kind: 'file', data: Buffer.concat(casti) }); } }; },
        getFile: async () => { let d = m.get(jm).data;
          if (h.zmenaPoZapisu && /^otisk_/.test(jm)) d = h.zmenaPoZapisu(d);
          return { size: d.length, arrayBuffer: async () => d.buffer.slice(d.byteOffset, d.byteOffset + d.length),
            stream: () => new Blob([d]).stream() }; },
      };
    },
    async *values() { for (const [jm, v] of m) yield { kind: v.kind, name: jm }; },
    async removeEntry(jm) { if (!m.has(jm)) throw new Error('není'); h.smazane.push(jm); m.delete(jm); },
  };
  return h;
};
const ZALOHA = { porizena: '2026-10-27T02:10:00.000Z', zdroj: 'nocni-otisk', kdo: '', program: { db: 1 },
  zakazky: { 'Z1.json': { cislo: 'Z1', popis: 'Ocelová konstrukce výtahové šachty. '.repeat(400) } }, uzivatele: [{ email: 'a@priklad.cz' }], podpisy: null };
const novyCtx = (opt) => {
  const o = opt || {};
  const ctx = { Promise, JSON, String, Error, Date, Object, Array, Math, Uint8Array, Number, Buffer: undefined,
    TextEncoder, TextDecoder, crypto: globalThis.crypto, encodeURIComponent, setTimeout,
    Blob: o.bezKomprese ? undefined : Blob, Response: o.bezKomprese ? undefined : Response,
    CompressionStream: o.bezKomprese ? undefined : CompressionStream, DecompressionStream: o.bezKomprese ? undefined : DecompressionStream,
    volani: [], zpravy: [], heslo: 'Heslo.Spravce.1',
    ULO_KOPIE_DISK_SLOZKA: U.ULO_KOPIE_DISK_SLOZKA, uloKopieDiskJmeno: U.uloKopieDiskJmeno, uloZalohaSloz: U.uloZalohaSloz,
    retenceZalohDiskVyber: R.retenceZalohDiskVyber, retenceZalohPokles: R.retenceZalohPokles, RETENCE_ZALOH_DISK_JMENO: R.RETENCE_ZALOH_DISK_JMENO,
    ONLINE_STAV: { otisky: [], kopieDisk: null }, jeAdminOnline: () => true, render: () => {}, uloPravo: async () => true,
    onlineZprava: (t, typ) => { ctx.zpravy.push([String(t), typ || '']); },
    dotazHeslo: () => Promise.resolve(ctx.heslo), uloDb: () => Promise.reject(new Error('bez IndexedDB')),
  };
  ctx.onlineApi = async (cesta, telo) => {
    ctx.volani.push([cesta, telo]);
    if (cesta === '/api/zaloha?zdroj=nocni&strana=1') return { ok: true, zaloha: JSON.parse(J(ZALOHA)), otisk: o.otisk || '2026-10-27', puvod: 'nocni-otisk' };
    if (o.serverOdpoved) return o.serverOdpoved(cesta, telo);
    return { ok: true, kopieDisk: { kdy: new Date().toISOString(), ...(telo && telo.kopie) } };
  };
  vm.createContext(ctx);
  vm.runInContext(kopie + tlacitko + obnovaText + '\nthis.proved = kopieDiskProved; this.uklid = kopieDiskUklid; this.uklidText = kopieDiskUklidText;'
    + ' this.KD = KOPIE_DISK; this.obnovaText = onlineObnovaSouborText; this.ted = onlineKopieDiskTed;', ctx);
  return ctx;
};
const sha = async (b) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', b))].map(x => x.toString(16).padStart(2, '0')).join('');
const STARE = { 'otisk_2026-10-13.json': 'stara', 'otisk_2026-10-18.json': 'nedele', 'otisk_2026-10-20.json': 'utery',
  'otisk_2026-10-01.json': 'prvni', 'otisk_2026-04-05.json': 'duben', 'posledni_kopie.json': '{}', 'otisk_2026-04-05 (1).json': 'kopie',
  'otisk_2026-01-01.json': { kind: 'directory' } };
const realNow = Date.now;
Date.now = () => Date.parse('2026-10-27T09:00:00Z');

(async () => {
  /* ---- úspěšná kopie: gzip, ověření, úklid ---- */
  {
    const ctx = novyCtx();
    const h = slozka('_Zaloha Netlify DB', STARE);
    const k = await ctx.proved(h);
    const zapsany = h.m.get('otisk_2026-10-27.json.gz');
    test('#523 kopie: soubor otisk_<den>.json.gz, gzip (1f 8b), rozbalí se na zálohu', !!zapsany && zapsany.data[0] === 0x1f && zapsany.data[1] === 0x8b
      && J(JSON.parse(gunzipSync(zapsany.data).toString('utf8'))) === J(ZALOHA), [...h.m.keys()]);
    test('#523 kopie: komprese je znát (gzip menší než JSON)', zapsany.data.length < J(ZALOHA).length / 3, zapsany && zapsany.data.length);
    const zaznam = (ctx.volani.find(v => v[0] === '/api/zaloha_vynuceno') || [])[1];
    test('#523 kopie: server dostane jméno .json.gz, velikost a SHA-256 zapsaných (komprimovaných) bajtů',
      !!zaznam && zaznam.kopie.soubor === 'otisk_2026-10-27.json.gz' && zaznam.kopie.velikostB === zapsany.data.length
      && zaznam.kopie.sha256 === await sha(zapsany.data), zaznam && zaznam.kopie);
    /* 20. 10. (úterý) zůstane: v jeho týdnu (19.–25. 10.) ve složce neděle není → nejbližší starší je on sám */
    test('#523 úklid: po kopii smazány přesně 13. 10. a 5. 4. (pravidlo), nic jiného; 20. 10. drží svůj týden',
      J(h.smazane.slice().sort()) === J(['otisk_2026-04-05.json', 'otisk_2026-10-13.json']) && h.m.has('otisk_2026-10-20.json')
      && J(k.uklid.smazano.slice().sort()) === J(h.smazane.slice().sort()), { smazane: h.smazane, uklid: k.uklid });
    test('#523 úklid: zůstala nová kopie, neděle, první v měsíci, posledni_kopie.json, podobná jména i podsložka',
      ['otisk_2026-10-27.json.gz', 'otisk_2026-10-18.json', 'otisk_2026-10-01.json', 'posledni_kopie.json', 'otisk_2026-04-05 (1).json',
        'otisk_2026-01-01.json'].every(j => h.m.has(j)), [...h.m.keys()]);
    test('#523 úklid: hláška řekne, kolik a které kopie smazala', /Na Disku smazáno 2 starší kopie podle pravidla \(7 dní, týdenní 8 týdnů, měsíční 6 měsíců\): /
      .test(ctx.uklidText(k.uklid)), ctx.uklidText(k.uklid));
  }
  /* ---- tlačítko: hláška v obrazovce nese výsledek úklidu ---- */
  {
    const ctx = novyCtx();
    const h = slozka('_Zaloha Netlify DB', { 'otisk_2026-10-13.json': 'x', 'otisk_2026-10-18.json': 'n', 'otisk_2026-10-01.json': 'y' });
    ctx.KD.slozka = h;
    const vys = await ctx.ted();
    const z = ctx.zpravy.map(x => x[0]).join(' | ');
    test('#523 obrazovka: po kopii hláška ukáže cestu .json.gz a počet smazaných starých kopií', vys === true
      && /_Zaloha Netlify DB\/otisk_2026-10-27\.json\.gz \(/.test(z) && /Na Disku smazáno 1 starší kopie .*otisk_2026-10-13\.json/.test(z), z);
  }
  /* ---- pojistky: kdy se NIC nemaže ---- */
  {
    const ctx = novyCtx({ serverOdpoved: async () => ({ ok: false, chyba: 'něco' }) });
    const h = slozka('_Zaloha Netlify DB', STARE);
    const k = await ctx.proved(h);
    test('#523 pojistka: server kopii nepotvrdil → nic se nesmaže', h.smazane.length === 0 && /nepotvrdil/.test(k.uklid.duvod || ''), k.uklid);
  }
  {
    const ctx = novyCtx({ serverOdpoved: async () => { const e = new Error('Vaše heslo nesouhlasí'); e.stav = 401; throw e; } });
    const h = slozka('_Zaloha Netlify DB', STARE);
    let chyba = '';
    try { await ctx.proved(h); } catch (e) { chyba = e.message; }
    test('#523 pojistka: server záznam odmítl (špatné heslo) → kopie selhala, nic se nesmaže', /nesouhlasí/.test(chyba) && h.smazane.length === 0);
  }
  {
    const ctx = novyCtx();
    const h = slozka('_Zaloha Netlify DB', STARE);
    h.getFileHandle = ((puv) => async (jm, o) => { const fh = await puv(jm, o);
      if (/^otisk_.*\.gz$/.test(jm)) return { ...fh, createWritable: async () => { const w = await fh.createWritable();
        return { write: async (t) => w.write(t.slice ? t.slice(0, 10) : t), close: () => w.close() }; } };
      return fh; })(h.getFileHandle.bind(h));
    let chyba = '';
    try { await ctx.proved(h); } catch (e) { chyba = e.message; }
    test('#523 pojistka: useknutý zápis → kopie selže, server se neptá, nic se nesmaže', /nezapsal celý/.test(chyba) && h.smazane.length === 0
      && !ctx.volani.some(v => v[0] === '/api/zaloha_vynuceno'), chyba);
  }
  {
    const ctx = novyCtx();
    const h = slozka('_Zaloha Netlify DB', STARE);
    let cteni = 0;
    h.zmenaPoZapisu = (d) => (++cteni > 1 ? d.subarray(0, d.length - 1) : d);    // druhé čtení (ověření) vrátí kratší soubor
    const k = await ctx.proved(h);
    test('#523 pojistka: zapsaný soubor při ověření nesedí velikostí → nic se nesmaže', h.smazane.length === 0 && /místo/.test(k.uklid.duvod || ''), k.uklid);
  }
  {
    const ctx = novyCtx();
    const h = slozka('_Zaloha Netlify DB', STARE);
    let cteni = 0;
    h.zmenaPoZapisu = (d) => { if (++cteni < 2) return d; const x = Buffer.from(d); x[x.length - 1] ^= 0xff; return x; };
    const k = await ctx.proved(h);
    test('#523 pojistka: zapsaný soubor nesedí SHA-256 (stejná velikost) → nic se nesmaže', h.smazane.length === 0
      && /kontrolní součet/.test(k.uklid.duvod || ''), k.uklid);
  }
  {
    const ctx = novyCtx();
    const h = slozka('Stažené soubory', STARE);
    const u = await ctx.uklid(h, { soubor: 'otisk_2026-10-27.json.gz', velikostB: 10, sha256: 'a'.repeat(64) });
    test('#523 pojistka: jiná složka než „_Zaloha Netlify DB" → úklid nic nesmaže', h.smazane.length === 0 && /nejmenuje/.test(u.duvod || ''), u);
    const h2 = slozka('_Zaloha Netlify DB', Object.assign({}, STARE, { 'otisk_2026-10-27.json.gz': 'x' }));
    const u2 = await ctx.uklid(h2, { soubor: 'otisk_2026-10-27.json.gz', velikostB: 1, sha256: '' });
    test('#523 pojistka: kopie bez SHA-256 → úklid nic nesmaže', h2.smazane.length === 0 && /ověřit/.test(u2.duvod || ''), u2);
    const h3 = slozka('_Zaloha Netlify DB', STARE);
    delete h3.values;
    const u3 = await ctx.uklid(h3, { soubor: 'otisk_2026-10-13.json', velikostB: 5, sha256: await sha(Buffer.from('stara')) });
    test('#523 pojistka: prohlížeč neumí procházet složku → nic', h3.smazane.length === 0 && /neumí procházet/.test(u3.duvod || ''), u3);
  }
  {
    /* právě zapsaná kopie je starý noční otisk (výpadek nocí) — sama sebe nesmaže */
    const ctx = novyCtx({ otisk: '2026-10-13' });
    const h = slozka('_Zaloha Netlify DB', { 'otisk_2026-10-18.json': 'nedele', 'otisk_2026-10-01.json': 'prvni', 'otisk_2026-10-26.json': 'vcera' });
    const k = await ctx.proved(h);
    test('#523 pojistka: právě zapsaná kopie se nesmaže, i když by ji pravidlo vybralo (13. 10., týden drží 18. 10.)',
      h.m.has('otisk_2026-10-13.json.gz') && h.smazane.length === 0 && k.uklid.smazano.length === 0, { smazane: h.smazane, uklid: k.uklid });
  }
  {
    /* chyba mazání jednoho souboru nezastaví ostatní a kopii nezpochybní */
    const ctx = novyCtx();
    const h = slozka('_Zaloha Netlify DB', STARE);
    const puv = h.removeEntry.bind(h);
    h.removeEntry = async (jm) => { if (jm === 'otisk_2026-10-13.json') throw new Error('zamčeno'); return puv(jm); };
    const k = await ctx.proved(h);
    test('#523 úklid: chyba jednoho mazání se ohlásí, ostatní proběhnou', k.uklid.chyby.length === 1 && k.uklid.smazano.length === 1
      && /Nepodařilo se smazat: otisk_2026-10-13\.json: zamčeno/.test(ctx.uklidText(k.uklid)), k.uklid);
  }
  /* ---- prohlížeč bez CompressionStream: .json jako dřív, úklid běží ---- */
  {
    const ctx = novyCtx({ bezKomprese: true });
    const h = slozka('_Zaloha Netlify DB', STARE);
    const k = await ctx.proved(h);
    test('#523 bez komprese: kopie .json (text zálohy), úklid proběhne', k.soubor === 'otisk_2026-10-27.json'
      && J(JSON.parse(h.m.get('otisk_2026-10-27.json').data.toString('utf8'))) === J(ZALOHA) && h.smazane.length === 2, { k, smazane: h.smazane });
  }
  /* ---- obnova ze souboru umí .json.gz i .json ---- */
  {
    const ctx = novyCtx();
    const soubor = (b) => ({ arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.length) });
    const gz = gzipSync(Buffer.from(J(ZALOHA)));
    test('#523 obnova: soubor .json.gz se rozbalí na text zálohy', (await ctx.obnovaText(soubor(gz))) === J(ZALOHA));
    test('#523 obnova: nekomprimovaná záloha (.json) se čte jako dřív', (await ctx.obnovaText(soubor(Buffer.from(J(ZALOHA))))) === J(ZALOHA));
    test('#523 obnova: české znaky přežijí rozbalení', JSON.parse(await ctx.obnovaText(soubor(gz))).zakazky['Z1.json'].popis.startsWith('Ocelová'));
    const ctx2 = novyCtx({ bezKomprese: true });
    let chyba = '';
    try { await ctx2.obnovaText(soubor(gz)); } catch (e) { chyba = e.message; }
    test('#523 obnova: prohlížeč bez rozbalování řekne proč (ne tichý nesmysl)', /neumí rozbalit/.test(chyba), chyba);
  }
  /* ---- pojistka: nová kopie menší než předchozí (doplnění Z2, pokyn J. V. 26. 10.) ---- */
  /* Předchozí kopie (20. 10.) nese víc dat; nová (27. 10.) je o 15 % menší → nic
   * se nesmaže, server dostane hlášení s velikostmi DAT (ne souborů). */
  {
    const dataNove = Buffer.byteLength(J(ZALOHA));
    const vetsi = (pomer) => 'x'.repeat(Math.round(dataNove / pomer));
    for (const [popis, predchozi] of [['.json', { 'otisk_2026-10-20.json': vetsi(0.85) }],
      ['.json.gz (velikost dat po rozbalení)', { 'otisk_2026-10-20.json.gz': { kind: 'file', data: gzipSync(Buffer.from(vetsi(0.85))) } }]]) {
      const ctx = novyCtx({ serverOdpoved: async (cesta, telo) => {
        if (telo && telo.akce === 'retence-varovani-disk') return { ok: true, retenceVarovani: { kdy: 'x', den: telo.disk.den, zdroj: 'disk', text: 'úbytek' } };
        return { ok: true, kopieDisk: { kdy: new Date().toISOString() }, retenceVarovani: null }; } });
      const h = slozka('_Zaloha Netlify DB', Object.assign({ 'otisk_2026-10-13.json': 'stara', 'otisk_2026-10-01.json': 'prvni', 'otisk_2026-04-05.json': 'duben' }, predchozi));
      const k = await ctx.proved(h);
      const hlaseni = (ctx.volani.find(v => v[1] && v[1].akce === 'retence-varovani-disk') || [])[1];
      test('#523 pojistka Disk (' + popis + '): nová kopie −15 % → nic se nesmaže, úklid řekne proč', h.smazane.length === 0
        && /méně dat \(velikost .* \(85 %\)\)/.test(k.uklid.duvod || ''), { smazane: h.smazane, uklid: k.uklid });
      test('#523 pojistka Disk (' + popis + '): server dostane hlášení s velikostmi dat a dnem kopie', !!hlaseni
        && hlaseni.disk.den === '2026-10-27' && hlaseni.disk.novySoubor === 'otisk_2026-10-27.json.gz'
        && hlaseni.disk.novaVelikostB === dataNove && Math.abs(hlaseni.disk.predVelikostB - dataNove / 0.85) < 2
        && /^otisk_2026-10-20\.json/.test(hlaseni.disk.predSoubor), hlaseni);
      test('#523 pojistka Disk (' + popis + '): varování ze serveru se ukáže v hlídce', !!ctx.ONLINE_STAV.retenceVarovani && ctx.ONLINE_STAV.retenceVarovani.zdroj === 'disk');
    }
  }
  {
    const dataNove = Buffer.byteLength(J(ZALOHA));
    const ctx = novyCtx();
    const h = slozka('_Zaloha Netlify DB', { 'otisk_2026-10-20.json': 'x'.repeat(Math.round(dataNove / 0.95)), 'otisk_2026-10-13.json': 'stara',
      'otisk_2026-10-18.json': 'nedele', 'otisk_2026-10-01.json': 'prvni', 'otisk_2026-04-05.json': 'duben' });
    const k = await ctx.proved(h);
    test('#523 pojistka Disk: nová kopie −5 % → úklid proběhne', J(h.smazane.slice().sort()) === J(['otisk_2026-04-05.json', 'otisk_2026-10-13.json'])
      && !ctx.volani.some(v => v[1] && v[1].akce === 'retence-varovani-disk'), k.uklid);
  }
  {
    /* nepotvrzené varování (z noci) zastaví i úklid Disku; potvrzené pro tentýž den mazání pustí i při úbytku */
    const ctx = novyCtx({ serverOdpoved: async () => ({ ok: true, kopieDisk: { kdy: new Date(Date.now()).toISOString() },
      retenceVarovani: { kdy: '2026-10-27T03:00:00Z', den: '2026-10-27', text: 'noční otisk 2026-10-27 má proti 2026-10-26 méně dat (zakázek 100 → 90)' } }) });
    const h = slozka('_Zaloha Netlify DB', STARE);
    const k = await ctx.proved(h);
    test('#523 pojistka Disk: nepotvrzené varování ze serveru → úklid Disku stojí', h.smazane.length === 0 && /nepotvrzený úbytek/.test(k.uklid.duvod || ''), k.uklid);
    const dataNove = Buffer.byteLength(J(ZALOHA));
    const ctx2 = novyCtx({ serverOdpoved: async () => ({ ok: true, kopieDisk: { kdy: new Date(Date.now()).toISOString() },
      retenceVarovani: { kdy: '2026-10-27T03:00:00Z', den: '2026-10-27', zdroj: 'disk', text: 'x', potvrzeno: { kdy: 'y', kdo: 'spravce' } } }) });
    const h2 = slozka('_Zaloha Netlify DB', { 'otisk_2026-10-20.json': 'x'.repeat(Math.round(dataNove / 0.8)), 'otisk_2026-10-13.json': 'stara',
      'otisk_2026-10-18.json': 'nedele', 'otisk_2026-10-01.json': 'prvni', 'otisk_2026-04-05.json': 'duben' });
    const k2 = await ctx2.proved(h2);
    test('#523 pojistka Disk: úbytek potvrzený správcem pro tentýž den → úklid proběhne', h2.smazane.length === 2
      && !ctx2.volani.some(v => v[1] && v[1].akce === 'retence-varovani-disk'), k2.uklid);
    const ctx3 = novyCtx({ serverOdpoved: async (cesta, telo) => (telo && telo.akce === 'retence-varovani-disk') ? { ok: true, retenceVarovani: { kdy: 'x' } }
      : { ok: true, kopieDisk: { kdy: new Date(Date.now()).toISOString() }, retenceVarovani: { kdy: '2026-10-20T03:00:00Z', den: '2026-10-20', text: 'x', potvrzeno: { kdy: 'y' } } } });
    const h3 = slozka('_Zaloha Netlify DB', { 'otisk_2026-10-20.json': 'x'.repeat(Math.round(dataNove / 0.8)), 'otisk_2026-10-13.json': 'stara', 'otisk_2026-10-01.json': 'prvni' });
    await ctx3.proved(h3);
    test('#523 pojistka Disk: potvrzení jiného dne úbytek nové kopie neodemkne', h3.smazane.length === 0
      && ctx3.volani.some(v => v[1] && v[1].akce === 'retence-varovani-disk'));
    /* #529 (postřeh T1 #528): poškozený záznam varování (není objekt) úklid Disku zastaví taky */
    for (const vadny of [false, 'poškozený', 0, [1]]) {
      const ctx4 = novyCtx({ serverOdpoved: async () => ({ ok: true, kopieDisk: { kdy: new Date(Date.now()).toISOString() }, retenceVarovani: vadny }) });
      const h4 = slozka('_Zaloha Netlify DB', STARE);
      const k4 = await ctx4.proved(h4);
      test('#529 pojistka Disk: poškozený záznam varování (' + J(vadny) + ') → úklid Disku stojí', h4.smazane.length === 0
        && /poškozený/.test((k4.uklid && k4.uklid.duvod) || ''), k4.uklid);
    }
  }
  /* ---- O-K9 #527 (K9-S6): dnešek pro úklid ze serveru, ne z hodin počítače ----
   * Pojistka: s online_ui.js z v26.10.10 hodiny o rok napřed smažou ze složky
   * STARE i 18. 10., 20. 10. a 1. 10. (dnešek z hodin prohlížeče) a bez času
   * serveru se maže taky — obě kontroly níž selžou. */
  {
    const serverTed = Date.parse('2026-10-27T09:00:00Z');
    const ctx = novyCtx({ serverOdpoved: async () => ({ ok: true, kopieDisk: { kdy: new Date(serverTed).toISOString() } }) });
    const h = slozka('_Zaloha Netlify DB', STARE);
    Date.now = () => serverTed + 365 * 86400000;           // hodiny počítače o rok napřed
    let k;
    try { k = await ctx.proved(h); } finally { Date.now = () => Date.parse('2026-10-27T09:00:00Z'); }
    test('O-K9 K9-S6: hodiny počítače o rok napřed → úklid Disku nesmaže nic a řekne proč', h.smazane.length === 0
      && /hodiny tohoto počítače se liší od serveru/.test(k.uklid.duvod || ''), { smazane: h.smazane, uklid: k.uklid });
    const ctx2 = novyCtx({ serverOdpoved: async () => ({ ok: true, kopieDisk: { kdy: 'neplatné' } }) });
    const h2 = slozka('_Zaloha Netlify DB', STARE);
    const k2 = await ctx2.proved(h2);
    test('O-K9 K9-S6: server nevrátil platný čas → úklid nesmaže nic', h2.smazane.length === 0 && /čas serveru/.test(k2.uklid.duvod || ''), k2.uklid);
    /* počítač o 20 h pozadu (26. 10., pořád v toleranci): dnešek je den serveru 27. 10. — úterý 20. 10. má věk 7
     * a jeho týden drží neděle 25. 10. → smaže se; podle hodin počítače (26. 10., věk 6) by zůstal */
    const ctx3 = novyCtx({ serverOdpoved: async () => ({ ok: true, kopieDisk: { kdy: new Date(serverTed).toISOString() } }) });
    const h3 = slozka('_Zaloha Netlify DB', { 'otisk_2026-10-01.json': 'prvni', 'otisk_2026-10-20.json': 'utery', 'otisk_2026-10-25.json': 'nedele', 'otisk_2026-10-26.json': 'vcera' });
    Date.now = () => serverTed - 20 * 3600000;
    let k3;
    try { k3 = await ctx3.proved(h3); } finally { Date.now = () => Date.parse('2026-10-27T09:00:00Z'); }
    test('O-K9 K9-S6: hodiny v toleranci (−20 h) → úklid podle dne serveru (27. 10.), ne podle počítače',
      J(h3.smazane) === J(['otisk_2026-10-20.json']), { smazane: h3.smazane, uklid: k3.uklid });
  }
  /* ---- server přijme záznam .json.gz a podloží jím retenci ---- */
  {
    test('#523 jméno kopie: uloKopieDiskJmeno umí .json.gz', U.uloKopieDiskJmeno('2026-10-27', true) === 'otisk_2026-10-27.json.gz'
      && U.uloKopieDiskJmeno('2026-10-27') === 'otisk_2026-10-27.json');
  }
  Date.now = realNow;
  console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
  process.exit(fail ? 1 : 0);
})().catch(e => { Date.now = realNow; console.log('FAIL výjimka', e && e.stack || e); console.log('\n' + ok + ' prošlo, ' + (fail + 1) + ' selhalo'); process.exit(1); });
