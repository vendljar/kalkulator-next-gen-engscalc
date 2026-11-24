/* ============================================================
 * ZÁKAZNÍCI ZE ZAKÁZEK (ZK #755, J. V. 24. 11. 2026)
 *
 * Databáze zákazníků měla na ostrém webu dvě karty — karty vznikaly jen ručně.
 * Rozhodnutí J. V.: naplnit ji HROMADNĚ ze zakázek, ale jen záznamy, kde
 * DATA SEDÍ PODLE ARES. Tady je čistá logika (bez sítě a úložiště), obsluha
 * je functions/zakaznici_ze_zakazek.mjs.
 *
 *  · strany zakázky: řídící zákazník (hlavička) + další zákazníci
 *    (zak.dalsiZakaznici[].hlavicka / .zastupci, VZ #598),
 *  · klíč skupiny = IČO po normalizaci (bez mezer a teček, doplněné nulami
 *    na 8 číslic) a s platnou kontrolní číslicí; bez IČO / s neplatným IČO
 *    se strana jen započítá,
 *  · nejnovější zakázka skupiny = nejvyšší razítko uložení (uloRazitko),
 *  · SHODA s ARES: subjekt existuje, není zaniklý, NÁZEV i SÍDLO z ARES se
 *    shodují s hlavičkou nejnovější zakázky (zzShoda — normalizace viz níž),
 *  · karta = ARES (název, sídlo, IČO, DIČ) + z nejnovější zakázky jen pole,
 *    která ARES nemá (kontaktní osoba, zástupci, banka, účet, zápis).
 * ============================================================ */
import g from './zakaznici_modul.cjs';
import { aresIcoNorm, aresIcoPlatne } from './ares_server.mjs';

const txt = (v) => (typeof v === 'string' ? v.trim() : (typeof v === 'number' && isFinite(v) ? String(v) : ''));
const obj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);

/* Pole karty, která ARES zná — z nich se do karty bere VÝHRADNĚ ARES. */
export const ZZ_POLE_ARES = ['nazev', 'sidlo', 'ico', 'dic'];

/* IČO strany: '' = bez IČO, null = neplatné (neprojde tvarem nebo číslicí). */
export function zzIco(v) {
  const t = txt(v).replace(/[\s.]/g, '');
  if (!t) return '';
  const n = aresIcoNorm(t);
  return n && aresIcoPlatne(n) ? n : null;
}

/* Strany zakázky: [{ hlavicka: { objednatel, adresaObjednatele, ico, dic, kontakt }, zastupci }]. */
export function zzStrany(zak) {
  if (!obj(zak)) return [];
  const out = [{ hlavicka: zak, zastupci: obj(zak.zastupci) ? zak.zastupci : {} }];
  if (Array.isArray(zak.dalsiZakaznici))
    for (const d of zak.dalsiZakaznici)
      if (obj(d) && obj(d.hlavicka)) out.push({ hlavicka: d.hlavicka, zastupci: obj(d.zastupci) ? d.zastupci : {} });
  return out;
}

/* Kdy byla zakázka naposledy uložena (pro výběr nejnovější). */
export function zzKdy(zak) {
  const r = obj(zak) ? txt(zak.uloRazitko) : '';
  if (r) return r;
  let m = '';
  if (obj(zak) && Array.isArray(zak.varianty))
    for (const v of zak.varianty) { const u = obj(v) ? txt(v.upraveno) : ''; if (u > m) m = u; }
  return m;
}

/* Přidá jednu uloženou zakázku do seskupení `stav`
 * ({ skupiny: { ico: { ico, pocet, soubor, kdy, nazev, sidlo } }, bezIco, neplatneIco, zakazek }).
 * Skupina drží jen odkaz na nejnovější zakázku a název + sídlo firmy z její
 * hlavičky — kontakty (osobní údaje) se do náhledu nekopírují, čtou se až
 * při zápisu karty. Totéž IČO dvakrát v jedné zakázce = jedna zakázka. */
export function zzSeskupPridej(stav, soubor, zak) {
  stav.skupiny = stav.skupiny || {};
  stav.bezIco = stav.bezIco || 0;
  stav.neplatneIco = stav.neplatneIco || 0;
  stav.zakazek = (stav.zakazek || 0) + 1;
  const kdy = zzKdy(zak);
  const videno = new Set();
  for (const s of zzStrany(zak)) {
    const ico = zzIco(s.hlavicka.ico);
    if (ico === '') { stav.bezIco++; continue; }
    if (ico === null) { stav.neplatneIco++; continue; }
    if (videno.has(ico)) continue;
    videno.add(ico);
    const sk = stav.skupiny[ico] || (stav.skupiny[ico] = { ico, pocet: 0, soubor: '', kdy: '', nazev: '', sidlo: '' });
    sk.pocet++;
    if (!sk.soubor || kdy > sk.kdy || (kdy === sk.kdy && String(soubor) > sk.soubor)) {
      sk.soubor = String(soubor); sk.kdy = kdy;
      sk.nazev = txt(s.hlavicka.objednatel).slice(0, 300);
      sk.sidlo = txt(s.hlavicka.adresaObjednatele).slice(0, 300);
    }
  }
  return stav;
}

/* ---------- normalizace pro porovnání s ARES ----------
 * NÁZEV: velikost písmen, mezery, interpunkce a zápis právní formy
 * („s.r.o.“ = „s. r. o.“ = „spol. s r.o.“ = „společnost s ručením omezeným“,
 * „a.s.“ = „a. s.“ = „akciová společnost“, v.o.s., k.s., z.s., o.p.s., z.ú.,
 * s.p.). Diakritika se NEZAHAZUJE — jiný pravopis názvu je jiný název. */
const L = '[\\p{L}\\p{N}]';
const PRED = '(?<![\\p{L}\\p{N}§])', ZA = '(?!' + L + ')';
const FORMY = [
  [new RegExp(PRED + 'spol(?:ečnost)?\\s*\\.?\\s*s\\s*\\.?\\s*r\\s*\\.?\\s*o\\s*\\.?' + ZA, 'gu'), ' §sro '],
  [new RegExp(PRED + 'společnost\\s+s\\s+ručením\\s+omezeným' + ZA, 'gu'), ' §sro '],
  [new RegExp(PRED + 's\\s*\\.\\s*r\\s*\\.\\s*o\\s*\\.?' + ZA, 'gu'), ' §sro '],
  [new RegExp(PRED + 'sro' + ZA, 'gu'), ' §sro '],
  [new RegExp(PRED + 'akciová\\s+společnost' + ZA, 'gu'), ' §as '],
  [new RegExp(PRED + 'a\\s*\\.\\s*s\\s*\\.?' + ZA, 'gu'), ' §as '],
  [new RegExp(PRED + 'v\\s*\\.\\s*o\\s*\\.\\s*s\\s*\\.?' + ZA, 'gu'), ' §vos '],
  [new RegExp(PRED + 'k\\s*\\.\\s*s\\s*\\.?' + ZA, 'gu'), ' §ks '],
  [new RegExp(PRED + 'o\\s*\\.\\s*p\\s*\\.\\s*s\\s*\\.?' + ZA, 'gu'), ' §ops '],
  [new RegExp(PRED + 'z\\s*\\.\\s*ú\\s*\\.?' + ZA, 'gu'), ' §zu '],
  [new RegExp(PRED + 'z\\s*\\.\\s*s\\s*\\.?' + ZA, 'gu'), ' §zs '],
  [new RegExp(PRED + 's\\s*\\.\\s*p\\s*\\.?' + ZA, 'gu'), ' §sp '],
];
export function zzNormNazev(s) {
  let t = txt(s).normalize('NFC').toLowerCase().replace(/[„“”"'‚‘’`´]/g, '');
  for (const [re, za] of FORMY) t = t.replace(re, za);
  return t.replace(/[^\p{L}\p{N}§]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

/* SÍDLO: slova bez diakritiky a velikosti písmen, PSČ bez mezery, zkratky
 * (nám., tř., č. p., ul.), čísla „1522/53“ rozdělená. Hlavička smí vynechat
 * část obce (ARES ji v textové adrese uvádí, obchodník často ne), ale nesmí
 * obsahovat nic, co v ARES není, a musí nést PSČ a číslo popisné z ARES. */
const ADRESA_ZKRATKY = [[/(?<!\p{L})nám\.?(?!\p{L})/gu, 'namesti '], [/(?<!\p{L})tř\.?(?!\p{L})/gu, 'trida '],
  [/(?<!\p{L})č\.\s*p\.?|(?<!\p{L})čp\.?(?!\p{L})/gu, ' '], [/(?<!\p{L})č\.\s*o\.?/gu, ' '], [/(?<!\p{L})ul\.(?!\p{L})/gu, ' ']];
const ADRESA_IGNOROVAT = new Set(['ceska', 'republika', 'cr', 'cz', 'czech', 'republic']);
export function zzAdresaSlova(s) {
  let t = txt(s).normalize('NFC').toLowerCase();
  for (const [re, za] of ADRESA_ZKRATKY) t = t.replace(re, za);
  t = t.replace(/(^|[^\d])(\d{3})\s+(\d{2})(?!\d)/g, '$1$2$3');            // PSČ „170 00“ → „17000“
  t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return t.split(/[^a-z0-9]+/).filter(x => x && !ADRESA_IGNOROVAT.has(x));
}
export function zzAdresaSedi(hlavicka, ares) {
  const h = zzAdresaSlova(hlavicka), a = zzAdresaSlova(ares);
  if (!h.length || !a.length) return false;
  const mnA = new Set(a), mnH = new Set(h);
  if (!h.every(x => mnA.has(x))) return false;                             // nic navíc proti ARES
  if (!h.some(x => /[a-z]/.test(x))) return false;                         // aspoň ulice nebo obec
  const psc = a.find(x => /^\d{5}$/.test(x));
  if (psc && !mnH.has(psc)) return false;                                  // PSČ z ARES
  const cislo = a.find(x => /^\d{1,4}$/.test(x));                          // první číslo = číslo popisné
  if (cislo && !mnH.has(cislo)) return false;
  return true;
}

/* Shoda hlavičky ({ nazev, sidlo }) s výsledkem ARES ({ stav, subjekt }).
 * Vrací { stav: 'zalozit' | 'nesedi' | 'vypadek', duvod }. */
export function zzShoda(hl, ares) {
  const r = ares || {};
  if (r.stav === 'vypadek') return { stav: 'vypadek', duvod: 'ARES neodpověděl — zkusit znovu' };
  if (r.stav === 'neplatne') return { stav: 'nesedi', duvod: 'IČO neprojde kontrolní číslicí' };
  if (r.stav !== 'ok' || !r.subjekt) return { stav: 'nesedi', duvod: 'ARES subjekt s tímto IČO nevede' };
  const s = r.subjekt;
  if (s.zanikla) return { stav: 'nesedi', duvod: 'subjekt v ARES zanikl' + (s.datumZaniku ? ' (' + s.datumZaniku + ')' : '') };
  const duvody = [];
  if (!zzNormNazev(hl.nazev) || zzNormNazev(hl.nazev) !== zzNormNazev(s.nazev)) duvody.push('jiný název (ARES: ' + s.nazev + ')');
  if (!zzAdresaSedi(hl.sidlo, s.adresa)) duvody.push('jiné sídlo (ARES: ' + (s.adresa || '—') + ')');
  return duvody.length ? { stav: 'nesedi', duvod: duvody.join('; ') } : { stav: 'zalozit', duvod: '' };
}

/* Existující karty → rychlé hledání podle IČO a podle klíče z názvu (karta
 * bez IČO se stejným názvem = táž firma, nezakládat dvojče; vzor dvojceKarty). */
export function zzExistujici(karty) {
  const ico = new Map(), nazev = new Map();
  for (const k of karty || []) {
    if (!obj(k)) continue;
    const i = zzIco(k.ico);
    if (i) ico.set(i, k);
    const n = g.zakaznikKlic({ nazev: k.nazev });
    if (n && !i) nazev.set(n, k);
  }
  return { ico, nazev };
}
export function zzKartaExistuje(ex, ico, nazevAres) {
  if (ex.ico.has(ico)) return 'karta s tímto IČO už existuje';
  const n = g.zakaznikKlic({ nazev: nazevAres });
  if (n && ex.nazev.has(n)) return 'karta bez IČO se stejným názvem už existuje';
  return '';
}

/* Karta z ARES + nejnovější zakázky. `strana` = { hlavicka, zastupci }.
 * Pole, která ARES zná, jsou VÝHRADNĚ z ARES (prázdné DIČ v ARES = prázdné
 * DIČ karty); ostatní z hlavičky a zástupců zakázky. Očista zakaznikOciste. */
export function zzKarta(subjekt, strana, kdo, kdy, poznamka) {
  const z = g.zakaznikZeZakazky(Object.assign({}, strana.hlavicka, { zastupci: strana.zastupci }));
  z.nazev = subjekt.nazev; z.sidlo = subjekt.adresa || ''; z.ico = subjekt.ico; z.dic = subjekt.dic || '';
  z.poznamka = poznamka || '';
  const k = g.zakaznikOciste(z, kdo, kdy);
  k.autor = kdo; k.zalozen = kdy;
  return k;
}

/* Strana zakázky s daným IČO (pro zápis karty). */
export function zzStranaSIco(zak, ico) {
  return zzStrany(zak).find(s => zzIco(s.hlavicka.ico) === ico) || null;
}

/* Počty položek náhledu podle stavu. */
export const ZZ_STAVY = ['zalozit', 'existuje', 'nesedi', 'vypadek', 'zbyva'];
export function zzPocty(polozky) {
  const p = { zalozit: 0, existuje: 0, nesedi: 0, vypadek: 0, zbyva: 0 };
  for (const x of polozky || []) if (x && p[x.stav] !== undefined) p[x.stav]++;
  return p;
}
