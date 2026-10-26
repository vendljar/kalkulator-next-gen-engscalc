/* K9 #526 — společné pro reprodukce auditu zálohování (26. 10. 2026).
 * Paměťové úložiště se stejným API jako netlify/lib/sdilene.mjs (cti, zapis,
 * ctiBin, zapisBin, seznam, smaz). Volitelně latence (ms na operaci + ms na MB),
 * počítadla, „zabití" funkce. Žádná síť, žádná ostrá data.
 * Spouští se z kořene repa: node podklady/K9_pokusy/<pokus>.mjs */
process.env.TAJEMSTVI_RELACE = process.env.TAJEMSTVI_RELACE || 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = process.env.ADMIN_INIT_HESLO || 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';

export const pamet = new Map();          // 'uloziste/klic' → string (JSON) nebo Buffer (bin)
export const nastaveni = { latenceMs: 0, msNaMB: 0, binarni: true, limitDo: Infinity, hookZapis: null, hookSmaz: null, hookCti: null };
export const pocty = { cti: 0, zapis: 0, smaz: 0, seznam: 0, ctenoB: 0, zapsanoB: 0 };
const cekej = (b) => {
  const ms = nastaveni.latenceMs + nastaveni.msNaMB * (b || 0) / 1048576;
  return ms > 0 ? new Promise(r => setTimeout(r, ms)) : Promise.resolve();
};
const hlid = () => { if (Date.now() > nastaveni.limitDo) throw new Error('Task timed out (simulovaný limit funkce)'); };
export function uloziste(nazev) {
  const u = {
    async cti(k) { if (nastaveni.hookCti) await nastaveni.hookCti(nazev, k); const v = pamet.get(nazev + "/" + k); await cekej(v ? v.length : 0); hlid(); pocty.cti++;
      if (v == null) return null; pocty.ctenoB += v.length;
      if (Buffer.isBuffer(v)) throw new Error('JSON čtení binárního blobu ' + k);
      return JSON.parse(v); },
    async zapis(k, h) { const t = JSON.stringify(h); await cekej(t.length); hlid(); pocty.zapis++; pocty.zapsanoB += t.length;
      if (nastaveni.hookZapis) await nastaveni.hookZapis(nazev, k);
      pamet.set(nazev + '/' + k, t); },
    async seznam(prefix) { await cekej(0); hlid(); pocty.seznam++;
      return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
    async smaz(k) { await cekej(0); hlid(); pocty.smaz++; if (nastaveni.hookSmaz) await nastaveni.hookSmaz(nazev, k); pamet.delete(nazev + '/' + k); },
  };
  if (nastaveni.binarni) {
    u.ctiBin = async (k) => { const v = pamet.get(nazev + '/' + k); await cekej(v ? v.length : 0); hlid(); pocty.cti++;
      if (v == null) return null; pocty.ctenoB += v.length; return Buffer.isBuffer(v) ? v : Buffer.from(v); };
    u.zapisBin = async (k, b) => { await cekej(b.length); hlid(); pocty.zapis++; pocty.zapsanoB += b.length;
      if (nastaveni.hookZapis) await nastaveni.hookZapis(nazev, k);
      pamet.set(nazev + '/' + k, Buffer.from(b)); };
  }
  return u;
}
globalThis.__TEST_ULOZISTE = uloziste;

let ok = 0, fail = 0;
export const vysledky = [];
/* `ocekavano` = co audit tvrdí (nález se reprodukuje = podmínka platí). */
export function nalez(id, popis, podminka, info) {
  vysledky.push({ id, popis, reprodukovano: !!podminka, info });
  console.log((podminka ? 'REPRODUKOVÁNO ' : 'nereprodukováno ') + id + ' — ' + popis + (info !== undefined ? '\n    ' + (typeof info === 'string' ? info : JSON.stringify(info)) : ''));
}
export function over(popis, podminka, info) {
  if (podminka) ok++; else fail++;
  console.log((podminka ? 'OK   ' : 'FAIL ') + popis + (!podminka && info !== undefined ? '  ' + JSON.stringify(info) : ''));
}
export function konec() {
  console.log('\nkontrol: ' + ok + ' OK, ' + fail + ' FAIL; nálezů reprodukováno: ' + vysledky.filter(v => v.reprodukovano).length + '/' + vysledky.length);
  process.exitCode = fail ? 1 : 0;
}
export const ticho = async (fn) => { const l = console.log, w = console.warn, e = console.error;
  console.log = console.warn = console.error = () => {}; try { return await fn(); } finally { console.log = l; console.warn = w; console.error = e; } };
/* Posun hodin (Date.now i new Date()) — pro noci, týdny, měsíce. */
const RealDate = Date;
export function nastavCas(iso) {
  const t = RealDate.parse(iso);
  const posun = t - RealDate.now();
  class FakeDate extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(RealDate.now() + posun); }
    static now() { return RealDate.now() + posun; }
  }
  globalThis.Date = FakeDate;
}
export function realnyCas() { globalThis.Date = RealDate; }
/* Souhrn + manifest otisku po částech bez dat (pro výběr retence a pojistku). */
export function vlozOtisk(klic, udaje = {}) {
  const zdroj = udaje.zdroj || (/^\d{4}-\d{2}-\d{2}$/.test(klic) ? 'nocni-otisk' : /pred-obnovou/.test(klic) ? 'pred-obnovou' : 'vynuceno');
  const m = { format: 'kng-otisk-casti-1', porizena: klic.slice(0, 10) + 'T02:00:00.000Z', zdroj, kdo: '', casti: 1,
    pocetZakazek: 800, pocetUctu: 6, velikostB: 114e6, pocetSablon: 10, pocetPodpisu: 6, ...udaje, zdroj };
  pamet.set('zalohy/' + klic, JSON.stringify(m));
  pamet.set('zalohy/souhrn/' + klic, JSON.stringify({ den: klic, ...m }));
  pamet.set('zalohy/casti/' + klic + '/00000', JSON.stringify({ program: null }));
}
export function kopieDisk(otisk, kdy) {
  pamet.set('zalohy/kopie-disk', JSON.stringify({ kdy, kdo: 'spravce@priklad.cz', soubor: 'otisk_' + otisk + '.json.gz',
    velikostB: 1000, sha256: 'a'.repeat(64), otisk, puvod: 'nocni-otisk', slozka: '_Zaloha Netlify DB', potvrzeno: 'heslo-spravce' }));
}
export const klice = (pref = 'zalohy/') => [...pamet.keys()].filter(k => k.startsWith(pref)).map(k => k.slice(pref.length));
