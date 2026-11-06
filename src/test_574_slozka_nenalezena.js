/* ============================================================
 * #574 DZ2 (hlášení J. V. 6. 11. 2026, ostrý engscalc v4.11.8, Chrome):
 * Nastavení → Databáze → „Zkopírovat zálohu na Disk teď" → po hesle
 * „Kopii zálohy na Disk se nepodařilo pořídit: A requested file or
 * directory could not be found at the time an operation was processed."
 * Automatická kopie po přihlášení 5. 11. také neproběhla.
 *
 * Příčina: zapamatovaný FileSystemDirectoryHandle (IndexedDB
 * kng_uloziste / handles / zalohaDisk) ukazuje na složku, která na tom
 * místě v počítači už není. h.name i queryPermission projdou, selže až
 * zápis (DOMException NotFoundError) — po hesle a stažení zálohy. Handle
 * se nezapomněl, takže tlačítko nikdy znovu nenabídlo výběr složky.
 *
 * Tady (jádro, vm nad úseky src/ui/online_ui.js):
 *   - sonda kopieDiskSonda: živá složka (i prázdná) 'ok', zmizelá
 *     (NotFoundError / InvalidStateError / NotReadableError) 'nenalezena',
 *     bez práva čtení 'pravo', jiná chyba 'ok';
 *   - tlačítko: zmizelá složka se pozná PŘED heslem, zapomene se (paměť
 *     i IndexedDB) a v témže kliknutí se nabídne výběr složky; když výběr
 *     nejde (gesto vypršelo / zrušeno), česká hláška, nikdy jen anglická;
 *   - automatika po přihlášení: zapomene, důvod „nenalezena — vyberte ji
 *     znovu" s tlačítkem (kopieDiskCeka), nikdy tiše;
 *   - NotFoundError až při zápisu v kopieDiskProved: zapomenout + česky.
 * Prohlížečový průchod: overit_dz_kopie_disk.mjs (scénáře I–M).
 *
 * Pojistka: na 6b70cc3 (v5.11.3) padá (kopieDiskSonda neexistuje →
 * výjimka); po opravě vše zelené.
 * Spuštění: node src/test_574_slozka_nenalezena.js
 * ============================================================ */
const fs = require('fs');
const vm = require('vm');
const U = require('./uloziste.js');
const zdroj = fs.readFileSync(__dirname + '/ui/online_ui.js', 'utf8');
const usek = (od, po) => { const a = zdroj.indexOf(od), b = zdroj.indexOf(po, a + 1); return a > 0 && b > a ? zdroj.slice(a, b) : ''; };

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

const CHROME = 'A requested file or directory could not be found at the time an operation was processed.';
const ANGLICKY = /could not be found|requested file|user gesture/i;
const SL = U.ULO_KOPIE_DISK_SLOZKA;

const pomocne = usek('const KOPIE_DISK_NENALEZENA_CHYBY', 'async function kopieDiskSha256(');
const ted = usek('async function onlineKopieDiskTed(', '/* SAMOČINNÁ KOPIE PO PŘIHLÁŠENÍ');
const auto = usek('async function onlineKopieDiskAuto(', '/* Odlití kopie na Disk Google.');   // i kopieDiskPravoStav, důvod, kopieDiskCeka
const proved = usek('async function kopieDiskProved(', '/* Věta o úklidu do hlášky po kopii');
test('#574: úseky zdroje nalezeny (sonda, tlačítko, automatika, kopie)',
  !!pomocne && !!ted && !!auto && !!proved, [!!pomocne, !!ted, !!auto, !!proved]);

/* složka: stav 'ziva' | 'zmizela' | 'zmizetPriZapisu'; právo 'granted' | 'prompt' */
function slozka(c, o = {}) {
  const st = { stav: o.stav || 'ziva', pravo: o.pravo || 'granted', odpoved: o.odpoved || 'granted', soubory: o.soubory || [] };
  const h = { name: o.name || SL, __st: st,
    queryPermission: async () => st.pravo,
    requestPermission: async () => { c.log.push('pravo'); if (st.pravo === 'prompt') st.pravo = st.odpoved; return st.pravo; },
    values() {
      c.log.push('sonda');
      const it = { i: 0, async next() {
        if (o.chyba) throw new DOMException('x', o.chyba);
        if (st.pravo !== 'granted') throw new DOMException('Permission was denied.', 'NotAllowedError');
        if (st.stav === 'zmizela') throw new DOMException(CHROME, 'NotFoundError');
        return it.i < st.soubory.length ? { done: false, value: { name: st.soubory[it.i++] } } : { done: true }; },
      async return() { c.log.push('return'); return { done: true }; } };
      return it;
    } };
  return h;
}

function kontext(o = {}) {
  const c = { Promise, String, Error, Object, DOMException, log: [], zpravy: [], idb: [],
    ULO_KOPIE_DISK_SLOZKA: SL, uloKopieDiskStav: U.uloKopieDiskStav,
    ONLINE_STAV: { pracuje: false, kopieDiskCeka: null, kopieDisk: null, prostrediZalohy: 'main',
      otisky: [{ den: '2026-11-06', zdroj: 'nocni-otisk', porizena: '2026-11-06T02:00:00Z' }] },
    jeAdminOnline: () => true, render: () => {},
    onlineZprava: (t, typ) => { c.zpravy.push([String(t), typ || '']); },
    kopieDiskIdb: (v) => { c.idb.push(v === undefined ? 'cti' : v); return Promise.resolve(true); },
    uloPravo: async (h, tiche) => { const s = await h.queryPermission(); if (s === 'granted') return true; if (tiche) return false; return (await h.requestPermission()) === 'granted'; },
    kopieDiskVelikost: (b) => b + ' B', kopieDiskUklidText: () => '',
    kopieDiskProved: async (h) => { c.log.push('heslo'); if (o.provedChyba) throw o.provedChyba(c); c.log.push('kopie:' + h.__id); return { soubor: 'otisk_main_2026-11-06_0300.json.gz', velikostB: 2048, puvod: 'nocni-otisk', otisk: '2026-11-06' }; },
    window: {} };
  c.KOPIE_DISK = { slozka: null, nacteno: true, pravoPredem: null };
  c.kopieDiskSlozka = async () => c.KOPIE_DISK.slozka;
  if (o.vyber !== false) c.window.showDirectoryPicker = async () => {
    c.log.push('vyber');
    if (o.vyber === 'gesto') throw new DOMException('Must be handling a user gesture to show a file picker.', 'SecurityError');
    if (o.vyber === 'zrusit') throw new DOMException('The user aborted a request.', 'AbortError');
    const n = slozka(c); n.__id = 'nova'; return n; };
  vm.createContext(c);
  vm.runInContext(pomocne + ted + auto
    + '\nthis.sonda = kopieDiskSonda; this.ted = onlineKopieDiskTed; this.auto = onlineKopieDiskAuto;'
    + ' this.nenalezena = kopieDiskNenalezena; this.chybaSlozky = kopieDiskChybaSlozky;', c);
  return c;
}
const posledni = (c) => (c.zpravy[c.zpravy.length - 1] || ['', ''])[0];

(async () => {
  /* ---- sonda ---- */
  {
    const c = kontext();
    test('#574: sonda — živá složka se soubory → ok (a iterátor se uzavře)',
      (await c.sonda(slozka(c, { soubory: ['a.json'] }))) === 'ok' && c.log.includes('return'), c.log);
    test('#574: sonda — živá prázdná složka → ok', (await c.sonda(slozka(c))) === 'ok');
    test('#574: sonda — zmizelá složka (NotFoundError z Chrome) → nenalezena', (await c.sonda(slozka(c, { stav: 'zmizela' }))) === 'nenalezena');
    test('#574: sonda — InvalidStateError i NotReadableError → nenalezena',
      (await c.sonda(slozka(c, { chyba: 'InvalidStateError' }))) === 'nenalezena'
      && (await c.sonda(slozka(c, { chyba: 'NotReadableError' }))) === 'nenalezena');
    test('#574: sonda — bez práva čtení (NotAllowedError) → pravo (nerozhoduje)', (await c.sonda(slozka(c, { stav: 'zmizela', pravo: 'prompt' }))) === 'pravo');
    test('#574: sonda — jiná chyba (TypeError) → ok, kopie ji ukáže sama', (await c.sonda(slozka(c, { chyba: 'TypeMismatchError' }))) === 'ok');
    test('#574: sonda — handle bez values() (starý prohlížeč / mock) → ok', (await c.sonda({ name: SL })) === 'ok');
    test('#574: sonda nic nezapisuje (jen values, žádné getFileHandle)', !/getFileHandle|createWritable|removeEntry/.test(pomocne.slice(pomocne.indexOf('async function kopieDiskSonda'), pomocne.indexOf('function kopieDiskZapomen'))));
  }
  /* ---- tlačítko: zmizelá složka → zapomenout → výběr v témže kliknutí, heslo až potom ---- */
  {
    const c = kontext();
    c.KOPIE_DISK.slozka = slozka(c, { stav: 'zmizela' });
    const v = await c.ted();
    test('#574: tlačítko — zmizelá složka: sonda → výběr → heslo → kopie do nové složky',
      v === true && c.log.join(',') === 'sonda,vyber,heslo,kopie:nova', c.log);
    test('#574: tlačítko — stará složka zapomenuta v IndexedDB (null), nová zapamatována',
      c.idb[0] === null && c.idb.length === 2 && c.idb[1] && c.idb[1].__id === 'nova' && c.KOPIE_DISK.slozka.__id === 'nova', c.idb.map(x => x && (x.__id || 'h')));
    test('#574: tlačítko — po kopii hláška o úspěchu', /^Záloha zkopírována na Disk/.test(posledni(c)), posledni(c));
  }
  {
    const c = kontext({ vyber: 'gesto' });
    c.KOPIE_DISK.slozka = slozka(c, { stav: 'zmizela', name: '_Zaloha Netlify DB' });
    const v = await c.ted();
    const t = posledni(c);
    test('#574: tlačítko — výběr nejde (gesto vypršelo) → česká hláška „Složka … na tomto počítači už není … Klikněte znovu"',
      v === false && /^Složka „_Zaloha Netlify DB" na tomto počítači už není \(přesunutá nebo přejmenovaná/.test(t)
      && /Klikněte znovu na „Zkopírovat zálohu na Disk teď" a vyberte složku „_Zaloha Netlify DB" na Disku Google\./.test(t), t);
    test('#574: tlačítko — nikdy anglická systémová hláška', !ANGLICKY.test(t), t);
    test('#574: tlačítko — bez hesla a bez stažení zálohy, složka zapomenuta',
      !c.log.includes('heslo') && c.KOPIE_DISK.slozka === null && c.idb[0] === null, c.log);
    test('#574: tlačítko — příští klik složku nemá → nabídne výběr', (await c.kopieDiskSlozka()) === null);
  }
  {
    const c = kontext({ vyber: 'zrusit' });
    c.KOPIE_DISK.slozka = slozka(c, { stav: 'zmizela' });
    await c.ted();
    test('#574: tlačítko — zrušený výběr po zmizelé složce: pořád řekne, že složka už není',
      /na tomto počítači už není/.test(posledni(c)) && /zrušen/.test(posledni(c)), posledni(c));
  }
  {
    const c = kontext();
    c.KOPIE_DISK.slozka = slozka(c, { stav: 'zmizela', pravo: 'prompt', odpoved: 'granted' });
    const v = await c.ted();
    test('#574: tlačítko — bez práva čtení: žádost o právo → sonda znovu → nenalezena → výběr → kopie',
      v === true && c.log.join(',') === 'sonda,pravo,sonda,vyber,heslo,kopie:nova', c.log);
  }
  {
    const c = kontext();
    c.KOPIE_DISK.slozka = slozka(c, { pravo: 'prompt', odpoved: 'denied' });
    const v = await c.ted();
    test('#574: tlačítko — zamítnuté právo: o právo se žádá jen jednou, složka zapomenuta (#571 dál platí)',
      v === false && c.log.filter(x => x === 'pravo').length === 1 && c.KOPIE_DISK.slozka === null
      && /nepovolil zápis/.test(posledni(c)), [c.log, posledni(c)]);
  }
  {
    const c = kontext();
    const h = slozka(c); h.__id = 'stara'; c.KOPIE_DISK.slozka = h;
    const v = await c.ted();
    test('#574: tlačítko — živá složka: žádný výběr, kopie do ní', v === true && c.log.join(',') === 'sonda,return,heslo,kopie:stara', c.log);
  }
  /* ---- NotFoundError až při zápisu ---- */
  {
    const c = kontext({ provedChyba: (c) => c.chybaSlozky(new DOMException(CHROME, 'NotFoundError'), c.KOPIE_DISK.slozka) });
    const h = slozka(c); h.__id = 'stara'; c.KOPIE_DISK.slozka = h;
    const v = await c.ted();
    test('#574: zápis — NotFoundError až při zápisu: zapomenout + česká hláška, bez angličtiny',
      v === false && c.KOPIE_DISK.slozka === null && /^Složka „_Zaloha Netlify DB" na tomto počítači už není/.test(posledni(c))
      && !ANGLICKY.test(posledni(c)), posledni(c));
  }
  {
    const c = kontext({ provedChyba: () => new DOMException(CHROME, 'NotFoundError') });
    const h = slozka(c); h.__id = 'stara'; c.KOPIE_DISK.slozka = h;
    await c.ted();
    test('#574: zápis — i surová NotFoundError z kopie se v tlačítku přeloží a složka zapomene',
      c.KOPIE_DISK.slozka === null && /na tomto počítači už není/.test(posledni(c)) && !ANGLICKY.test(posledni(c)), posledni(c));
  }
  {
    const c = kontext({ provedChyba: () => new Error('server zálohu nevydal') });
    const h = slozka(c); c.KOPIE_DISK.slozka = h;
    await c.ted();
    test('#574: jiná chyba kopie složku nezapomene a hlásí se jako dřív',
      c.KOPIE_DISK.slozka === h && /^Kopii zálohy na Disk se nepodařilo pořídit: server zálohu nevydal/.test(posledni(c)), posledni(c));
  }
  /* kopieDiskProved: zápis s NotFoundError → česká chyba s příznakem a zapomenutí */
  {
    const c = { Promise, String, Error, Object, JSON, Date, DOMException, idb: [], ULO_KOPIE_DISK_SLOZKA: SL,
      ONLINE_STAV: {}, KOPIE_DISK: { slozka: 'h' },
      kopieDiskIdb: (v) => { c.idb.push(v); return Promise.resolve(true); },
      dotazHeslo: async () => 'heslo', onlineZalohaStrankami: async () => ({ ok: true, zaloha: { a: 1 }, prostredi: 'main', otisk: '2026-11-06', puvod: 'nocni-otisk' }),
      uloKopieDiskProstredi: (p) => p, kopieDiskData: async () => ({ data: new Uint8Array(3), gzip: true, velikostDatB: 3 }),
      uloKopieDiskJmeno: () => 'otisk_main_2026-11-06_0300.json.gz', kopieDiskSha256: async () => 'x',
      kopieDiskZapisSoubor: async () => { throw new DOMException(CHROME, 'NotFoundError'); },
      onlineApi: async () => { throw new Error('nemá se volat'); } };
    vm.createContext(c);
    vm.runInContext(pomocne + proved + '\nthis.proved = kopieDiskProved;', c);
    let chyba = null;
    try { await c.proved({ name: SL }); } catch (e) { chyba = e; }
    test('#574: kopieDiskProved — NotFoundError při zápisu → česká chyba (nenalezena), složka zapomenuta, server nevolán',
      !!chyba && chyba.nenalezena === true && /na tomto počítači už není/.test(chyba.message) && !ANGLICKY.test(chyba.message)
      && c.KOPIE_DISK.slozka === null && c.idb[0] === null, chyba && chyba.message);
  }
  /* ---- automatika po přihlášení ---- */
  {
    const c = kontext();
    c.KOPIE_DISK.slozka = slozka(c, { stav: 'zmizela' });
    const v = await c.auto('Heslo.574');
    const ceka = c.ONLINE_STAV.kopieDiskCeka;
    test('#574: automatika — zmizelá složka: NE tiše, důvod „nenalezena — vyberte ji znovu" (varování)',
      v === false && !!ceka && ceka.duvod === 'nenalezena' && /složka „_Zaloha Netlify DB" nenalezena/.test(ceka.text)
      && /vyberte ji znovu/.test(ceka.text) && /Zkopírovat zálohu na Disk teď/.test(ceka.text)
      && /a vyberte složku „_Zaloha Netlify DB" na Disku Google/.test(ceka.text)
      && c.zpravy.length === 1 && c.zpravy[0][1] === 'varovani' && !ANGLICKY.test(ceka.text), ceka);
    test('#574: automatika — složka zapomenuta, heslo ani kopie se nespustily',
      c.KOPIE_DISK.slozka === null && c.idb[0] === null && !c.log.includes('heslo'), c.log);
    test('#574: automatika — výběr složky se sám neotevřel (jen tlačítko)', !c.log.includes('vyber'), c.log);
  }
  {
    const c = kontext({ provedChyba: (c) => c.chybaSlozky(new DOMException(CHROME, 'NotFoundError'), c.KOPIE_DISK.slozka) });
    c.KOPIE_DISK.slozka = slozka(c);
    await c.auto('Heslo.574');
    test('#574: automatika — NotFoundError až při zápisu → důvod „nenalezena", zapomenuto',
      c.ONLINE_STAV.kopieDiskCeka && c.ONLINE_STAV.kopieDiskCeka.duvod === 'nenalezena' && c.KOPIE_DISK.slozka === null,
      c.ONLINE_STAV.kopieDiskCeka);
  }
  {
    const c = kontext();
    c.KOPIE_DISK.slozka = slozka(c, { pravo: 'prompt' });
    await c.auto('Heslo.574');
    test('#574: automatika — živá složka bez práva dál hlásí „pravo" (#571), nezapomíná',
      c.ONLINE_STAV.kopieDiskCeka && c.ONLINE_STAV.kopieDiskCeka.duvod === 'pravo' && !!c.KOPIE_DISK.slozka, c.ONLINE_STAV.kopieDiskCeka);
  }
  {
    const c = kontext();
    const h = slozka(c); h.__id = 'stara'; c.KOPIE_DISK.slozka = h;
    test('#574: automatika — živá složka s právem: kopie proběhne', (await c.auto('Heslo.574')) === true && c.log.includes('kopie:stara'), c.log);
  }
  console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL výjimka', e && e.stack); process.exit(1); });
