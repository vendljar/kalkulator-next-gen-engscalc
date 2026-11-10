/* ============================================================
 * NOČNÍ KOPIE NA DISK SKRIPTEM GOOGLE APPS SCRIPT (#577 AS, 10. 11. 2026)
 *
 * Rozhodnutí J. V. 10. 11. 2026: kopie nočního otisku na Disk Google se dělá
 * plně automaticky skriptem Apps Script v jeho Google účtu (časový spouštěč,
 * bez prohlížeče a bez přihlášení). Kopie z prohlížeče (src/ui/online_ui.js,
 * #554/#571/#574) zůstává jako záloha záloh.
 *
 * PROČ NE /api/zaloha?zdroj=nocni PO STRÁNKÁCH: prohlížeč stránky skládá
 * v paměti a gzip dělá sám. Skript to neumí — blob Apps Scriptu má strop
 * 50 MB a pole bajtů v JS by ~60 MB dat nafouklo na stovky MB. Server proto
 * připraví HOTOVÝ SOUBOR (.json.gz, ~52 MB u engscalc) a vydá ho po KUSECH
 * pevné délky (KS_KUS_B = 3 MiB = 12 × 256 KiB): kus jde ze skriptu rovnou
 * jako blob do obnovitelného nahrávání Drive API (kusy musí být násobky
 * 256 KiB), bez skládání v paměti. Odpověď funkce má strop 6 MB (binární
 * tělo se v Netlify přenáší jako base64 → 3 MiB = 4 MiB), UrlFetchApp 50 MB.
 *
 * PŘÍPRAVA PO KROCÍCH: synchronní funkce má limit 10 s, soubor má desítky MB.
 * Každý krok (POST { akce: 'priprav' }) přečte jednu až několik částí
 * nočního otisku (OTISK PO ČÁSTECH, #522), očistí je stejně jako kopie
 * z prohlížeče (otiskProDisk: bez otisků hesel a bez podpisů), zapíše je jako
 * text JSON a zkomprimuje SAMOSTATNÝM deflate se Z_SYNC_FLUSH. Takové kusy
 * jdou za sebou spojit do JEDNOHO proudu deflate (nový kompresor nikdy
 * neodkazuje na data před sebou, sync flush končí na hranici bajtu bez
 * příznaku posledního bloku); poslední krok končí Z_FINISH. Hlavička gzip
 * je na začátku, CRC-32 a délka na konci — výsledek je jeden řádný gzip,
 * který načte obnova ze souboru (DecompressionStream) i gunzip.
 * SHA-256 celého souboru se počítá průběžně (vlastní implementace se stavem,
 * který jde uložit mezi kroky — Hash z node:crypto uložit nejde).
 *
 * TVAR SOUBORU = { ...otiskProDisk(ctiOtisk(klíč)), web } — tedy totéž, co
 * vrací /api/zaloha?zdroj=nocni pro malou databázi (hlídá
 * netlify/test_577_kopie_skript.mjs).
 *
 * BEZPEČNOST (BEZPECNOST_MEZE.md, B210–B214): samostatný token
 * KNG_DISK_TOKEN (≥ 32 znaků, jinak je cesta vypnutá), jen hlavička
 * Authorization: Bearer, porovnání v konstantním čase (tajneShodne), token
 * umí jen: přečíst metadata, připravit a stáhnout kopii NOČNÍHO otisku
 * (očištěnou), potvrdit kopii TOHO souboru, který server připravil (shoda
 * SHA-256, velikosti a jména), a ohlásit úbytek dat na Disku (jen zastavuje
 * mazání). Nic jiného — nemaže, neobnovuje, nepotvrzuje úbytek.
 * ============================================================ */
import { createHash } from 'node:crypto';
import { deflateRawSync, constants as ZC } from 'node:zlib';
import { uloziste, vyhradne, tajneShodne, adresaKlienta, pokusyIpKlic } from './sdilene.mjs';
import { OTISK_SEKCE, KOPIE_DISK_CASTI, posledniNocniKlic, jeOtiskPoCastech, ctiOtiskCast, prostrediZalohy,
  RETENCE_VAROVANI_KLIC, retenceDrzena, retenceVarovaniPoskozene, KOPIE_DISK_POTVRZENI } from './zalohovani.mjs';
import RZ from './retence_modul.cjs';

/* Vlastní úložiště: připravený soubor a počítadla. Do otisku nepatří
 * (odvozená data a počítadla) — výjimka v netlify/test_zalohy.mjs (N4). */
export const KS_ULOZISTE = 'disk_kopie';
export const KS_STAV_KLIC = 'kopie-skript-stav';
export const KS_OCAS_KLIC = 'kopie-skript-ocas';
export const KS_CETNOST_KLIC = 'kopie-skript-cetnost';
export const KS_SPATNE_PREDPONA = 'spatne:';
export const KS_KUS_PREDPONA = 'kus/';
export const kusKlic = (otisk, i) => KS_KUS_PREDPONA + otisk + '/' + String(i).padStart(5, '0');
export const KS_FORMAT = 'kng-kopie-skript-1';
/* 3 MiB = 12 × 256 KiB (Drive API: kus obnovitelného nahrávání, kromě
 * posledního, musí být násobek 256 KiB). */
export const KS_KUS_B = 3 * 1024 * 1024;
/* Krok přípravy: synchronní funkce má 10 s; 4 s práce + čtení/zápisy. Objekt,
 * ne konstanta — testy ho mění. */
export const KS_ROZPOCET = { krokMs: 4000, zamekNavicMs: 20000 };
/* Token: aspoň 32 znaků (návod: 48 náhodných bajtů v base64url = 64 znaků).
 * Kratší nebo chybějící KNG_DISK_TOKEN = cesta vypnutá (403). */
export const KS_TOKEN_MIN = 32;
export const KS_TOKEN_PROMENNA = 'KNG_DISK_TOKEN';
/* Omezení četnosti (B212): správný token nejvýš 300 požadavků za hodinu
 * a 200 stažených kusů za den (~600 MB, běžná noc ~20 kusů na web);
 * špatný token nejvýš 10 pokusů za 15 min z jedné adresy (pak 429). Správný
 * token počítadlo špatných nezastaví (zásada #92: brzda nebrání majiteli). */
export const KS_LIMIT = { zaHodinu: 300, kusuZaDen: 200, spatnychZa15: 10, oknoSpatnychMs: 15 * 60 * 1000 };
/* Značka záznamu kopie (kopie-disk) potvrzeného skriptem — kopieDiskPodlozena
 * ji bere stejně jako „heslo-spravce" (rozhodnutí J. V. 10. 11. 2026). */
export const KS_POTVRZENO = KOPIE_DISK_POTVRZENI[1];
export const KS_KDO = 'skript Apps Script';

/* ---------- token ---------- */
export function kopieSkriptToken(env = process.env) {
  const t = String((env || {})[KS_TOKEN_PROMENNA] || '').trim();
  return t.length >= KS_TOKEN_MIN ? t : '';
}
export function tokenZHlavicky(req) {
  const a = String(req.headers.get('authorization') || '');
  const m = /^Bearer[ \t]+([^\s]{1,512})[ \t]*$/.exec(a);
  return m ? m[1] : '';
}
/* Token NIKDY v adrese (zůstal by v logu Netlify i v historii). Parametr
 * s takovým jménem = 400 a nic se nezpracuje. */
export const KS_ZAKAZANE_PARAMETRY = ['token', 'access_token', 'key', 'klic_token', 'kng_disk_token', 'auth', 'authorization'];
export function tokenVAdrese(url) {
  const q = new URL(url).searchParams;
  for (const k of q.keys()) if (KS_ZAKAZANE_PARAMETRY.includes(k.toLowerCase())) return true;
  return false;
}

/* ---------- SHA-256 se stavem, který jde uložit (JSON) ---------- */
const SHA_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
const SHA_W = new Uint32Array(64);
function shaBlok(h, b, o) {
  const w = SHA_W;
  for (let i = 0; i < 16; i++) w[i] = (b[o + 4 * i] << 24) | (b[o + 4 * i + 1] << 16) | (b[o + 4 * i + 2] << 8) | b[o + 4 * i + 3];
  for (let i = 16; i < 64; i++) {
    const x = w[i - 15], y = w[i - 2];
    const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
    const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
    w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
  }
  let a = h[0], bb = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
  for (let i = 0; i < 64; i++) {
    const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
    const t1 = (hh + S1 + ((e & f) ^ (~e & g)) + SHA_K[i] + w[i]) | 0;
    const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
    const t2 = (S0 + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
    hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
  }
  h[0] = (h[0] + a) | 0; h[1] = (h[1] + bb) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
  h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
}
export function sha256Novy() {
  return { h: [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], zbytek: '', delka: 0 };
}
export function sha256Pridej(st, data) {
  const h = Int32Array.from(st.h);
  const b = st.zbytek ? Buffer.concat([Buffer.from(st.zbytek, 'base64'), data]) : data;
  let o = 0;
  for (; o + 64 <= b.length; o += 64) shaBlok(h, b, o);
  return { h: Array.from(h, x => x >>> 0), zbytek: Buffer.from(b.subarray(o)).toString('base64'), delka: st.delka + data.length };
}
export function sha256Hotovo(st) {
  const zb = Buffer.from(st.zbytek || '', 'base64');
  const pad = Buffer.alloc((zb.length + 9 <= 64 ? 64 : 128) - zb.length);
  pad[0] = 0x80;
  const bitu = st.delka * 8;
  pad.writeUInt32BE(Math.floor(bitu / 0x100000000), pad.length - 8);
  pad.writeUInt32BE(bitu >>> 0, pad.length - 4);
  const b = Buffer.concat([zb, pad]);
  const h = Int32Array.from(st.h);
  for (let o = 0; o < b.length; o += 64) shaBlok(h, b, o);
  return Array.from(h, x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

/* ---------- CRC-32 (gzip) se stavem ---------- */
const CRC_T = (() => { const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t; })();
export function crc32(data, crc = 0) {
  let c = ~crc;
  for (let i = 0; i < data.length; i++) c = CRC_T[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (~c) >>> 0;
}
/* Hlavička gzip: deflate, bez jména, čas 0 (soubor se stejným obsahem má
 * stejný SHA), OS 255 (neznámý). */
const GZIP_HLAVICKA = Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0, 0, 0, 0, 0x00, 0xff]);

/* Sekce kopie = sekce otisku, které smí na Disk (KOPIE_DISK_CASTI), bez
 * podpisů — stejně jako zalohaStrana(…, { proDisk: true }). */
const DISK_SEKCE = OTISK_SEKCE.filter(x => KOPIE_DISK_CASTI.includes(x.nazev) && x.nazev !== 'podpisy');
/* Prázdná sekce ve výsledku = jako otiskDokonci: jednozáznamová null,
 * zakázky {}, účty [], ostatní mapy null. */
const vychozi = (x) => (x.klic ? 'null' : x.pole ? '[]' : x.nazev === 'zakazky' ? '{}' : 'null');
const uzivatelBezHesla = (x) => ({ email: x.email, jmeno: x.jmeno, role: x.role, aktivni: x.aktivni !== false });
const J = (v) => JSON.stringify(v === undefined ? null : v);

/* Uzavře rozepsanou sekci a vypíše výchozí hodnoty přeskočených až před
 * `cil` (index v DISK_SEKCE; DISK_SEKCE.length = konec). Stav: `sekce`
 * (rozepsaná), `zapsano` (klíč už ve výstupu), `otevreno` (otevřená
 * závorka mapy / pole), `prvni` (zatím žádná položka). */
function prejdi(st, cil, out) {
  if (cil < st.sekce) throw new Error('části otisku nejdou po sobě (sekce ' + DISK_SEKCE[cil].nazev + ' po ' + DISK_SEKCE[st.sekce].nazev + ')');
  if (cil === st.sekce) return;
  if (st.sekce >= 0) {
    const x = DISK_SEKCE[st.sekce];
    if (st.zapsano) { if (st.otevreno) out.push(x.pole ? ']' : '}'); }
    else out.push(',' + J(x.nazev) + ':' + vychozi(x));
  }
  for (let i = st.sekce + 1; i < cil && i < DISK_SEKCE.length; i++) out.push(',' + J(DISK_SEKCE[i].nazev) + ':' + vychozi(DISK_SEKCE[i]));
  st.sekce = cil; st.zapsano = false; st.otevreno = false; st.prvni = true;
}
function polozka(st, x, text, out) {
  if (!st.zapsano) { out.push(',' + J(x.nazev) + ':' + (x.pole ? '[' : '{')); st.zapsano = true; st.otevreno = true; }
  out.push((st.prvni ? '' : ',') + text); st.prvni = false;
}
/* Jedna část otisku (tvar ctiOtiskCast) → text do výstupu. */
function vypisCast(st, cast, out) {
  for (let i = 0; i < DISK_SEKCE.length; i++) {
    const x = DISK_SEKCE[i];
    if (!cast || !Object.prototype.hasOwnProperty.call(cast, x.nazev)) continue;
    const v = cast[x.nazev];
    if (x.klic) {
      prejdi(st, i, out);
      if (st.zapsano) throw new Error('sekce ' + x.nazev + ' je v otisku dvakrát');
      out.push(',' + J(x.nazev) + ':' + J(v)); st.zapsano = true; st.otevreno = false;
      continue;
    }
    if (x.pole) {
      const pole = (Array.isArray(v) ? v : Object.values(v && typeof v === 'object' ? v : {})).filter(Boolean);
      if (!pole.length) continue;
      prejdi(st, i, out);
      for (const u of pole) polozka(st, x, J(uzivatelBezHesla(u)), out);
      continue;
    }
    if (!v || typeof v !== 'object') continue;
    const klice = Object.keys(v);
    if (!klice.length) continue;
    prejdi(st, i, out);
    for (const k of klice) polozka(st, x, J(k) + ':' + J(v[k] == null ? null : v[k]), out);
  }
}

const DEFLATE = { level: 6 };
const vystup = (text, posledni) => deflateRawSync(Buffer.from(text, 'utf8'),
  posledni ? DEFLATE : { ...DEFLATE, finishFlush: ZC.Z_SYNC_FLUSH });

/* Veřejná část stavu (do odpovědi skriptu). */
export function kopieSkriptVerejne(st) {
  if (!st || typeof st !== 'object') return null;
  const z = { otisk: st.otisk, porizena: st.porizena, prostredi: st.prostredi, puvod: 'nocni-otisk', hotovo: !!st.hotovo,
    postup: { cast: st.cast, casti: st.casti } };
  if (st.hotovo) Object.assign(z, { soubor: st.soubor, sha256: st.sha256, velikostB: st.velikostB, velikostDatB: st.velikostDatB,
    kusB: KS_KUS_B, kusy: st.kusy.map(k => ({ b: k.b, sha256: k.sha })) });
  return z;
}

/* JEDEN KROK PŘÍPRAVY. Připravuje se vždy NEJNOVĚJŠÍ noční otisk; jiný
 * (starší) připravený soubor se zahodí. Vrací { hotovo, … } nebo
 * { bezi: true } (krok právě dělá jiný požadavek) nebo { chyba, kod }. */
export async function kopieSkriptKrok(opt = {}) {
  return vyhradne('kopie-skript', async () => {
    const zacatek = Date.now();
    const rozpocet = opt.rozpocetMs > 0 ? opt.rozpocetMs : KS_ROZPOCET.krokMs;
    const s = await uloziste(KS_ULOZISTE);
    const sZal = await uloziste('zalohy');
    const klic = await posledniNocniKlic();
    if (!klic) return { chyba: 'Noční otisk za posledních 7 dní v Netlify není — není co kopírovat (zkontrolujte noční zálohu).', kod: 404 };
    let st = await s.cti(KS_STAV_KLIC);
    if (!st || typeof st !== 'object' || st.format !== KS_FORMAT || st.otisk !== klic) {
      const m = await sZal.cti(klic);
      if (!m) return { chyba: 'Otisk ' + klic + ' mezitím zmizel.', kod: 404 };
      /* staré kusy pryč (jiný otisk) — připravený soubor je jen mezipaměť */
      for (const k of await s.seznam(KS_KUS_PREDPONA)) await s.smaz(k);
      const prostredi = prostrediZalohy();
      st = { format: KS_FORMAT, otisk: klic, porizena: String(m.porizena || ''), zdroj: String(m.zdroj || ''), kdo: String(m.kdo || ''),
        web: String(opt.web || 'neznámý web'), prostredi, casti: jeOtiskPoCastech(m) ? m.casti : 1, cast: 0,
        sekce: -1, zapsano: false, otevreno: false, prvni: true, zacato: false,
        sha: sha256Novy(), crc: 0, delkaDat: 0, delkaGz: 0, kusy: [], ocasB: 0, hotovo: false,
        zalozeno: new Date().toISOString(), kroku: 0, zamekDo: '' };
      st.soubor = RZ.retenceZalohDiskJmeno(klic, prostredi, st.porizena);
      if (!st.soubor) return { chyba: 'Otisk ' + klic + ' nemá platný čas pořízení — jméno kopie nejde složit.', kod: 409 };
    }
    if (st.hotovo) return { hotovo: true, stav: st };
    if (st.zamekDo && Date.parse(st.zamekDo) > Date.now()) return { bezi: true, stav: st };
    st.zamekDo = new Date(Date.now() + rozpocet + KS_ROZPOCET.zamekNavicMs).toISOString();
    await s.zapis(KS_STAV_KLIC, st);

    let cekajici = st.ocasB > 0 ? await s.ctiBin(KS_OCAS_KLIC) : Buffer.alloc(0);
    if (!cekajici || cekajici.length !== st.ocasB) throw new Error('rozpracovaná kopie je poškozená (konec souboru nesedí) — připraví se znovu');
    const pridej = (b) => { st.sha = sha256Pridej(st.sha, b); st.delkaGz += b.length; cekajici = Buffer.concat([cekajici, b]); };
    const out = [];
    if (!st.zacato) {
      pridej(GZIP_HLAVICKA);
      out.push('{"porizena":' + J(st.porizena) + ',"zdroj":' + J(st.zdroj) + ',"kdo":' + J(st.kdo) + ',"web":' + J(st.web) + ',"podpisy":null');
      st.zacato = true;
    }
    const zpracuj = (text, posledni) => {
      const data = Buffer.from(text, 'utf8');
      st.crc = crc32(data, st.crc); st.delkaDat += data.length;
      pridej(vystup(text, posledni));
    };
    do {
      const cast = await ctiOtiskCast(sZal, klic, st.cast);
      if (!cast) throw new Error('otisk ' + klic + ' je neúplný: chybí část ' + (st.cast + 1) + ' z ' + st.casti);
      vypisCast(st, cast, out);
      st.cast++;
      zpracuj(out.join(''), false); out.length = 0;
    } while (st.cast < st.casti && Date.now() - zacatek < rozpocet);
    if (st.cast >= st.casti) {
      prejdi(st, DISK_SEKCE.length, out); out.push('}');
      zpracuj(out.join(''), true);
      const pata = Buffer.alloc(8);
      pata.writeUInt32LE(st.crc >>> 0, 0); pata.writeUInt32LE(st.delkaDat % 0x100000000, 4);
      pridej(pata);
      st.hotovo = true;
    }
    while (cekajici.length >= KS_KUS_B || (st.hotovo && cekajici.length > 0)) {
      const kus = cekajici.subarray(0, Math.min(KS_KUS_B, cekajici.length));
      await s.zapisBin(kusKlic(klic, st.kusy.length), kus);
      st.kusy.push({ b: kus.length, sha: createHash('sha256').update(kus).digest('hex') });
      cekajici = cekajici.subarray(kus.length);
    }
    if (cekajici.length) await s.zapisBin(KS_OCAS_KLIC, Buffer.from(cekajici));
    st.ocasB = cekajici.length;
    if (st.hotovo) { st.sha256 = sha256Hotovo(st.sha); st.velikostB = st.delkaGz; st.velikostDatB = st.delkaDat; st.hotovoKdy = new Date().toISOString(); }
    st.kroku++; st.zamekDo = '';
    await s.zapis(KS_STAV_KLIC, st);
    return { hotovo: !!st.hotovo, stav: st, trvaniMs: Date.now() - zacatek };
  });
}

/* Jeden kus hotového souboru: { data, sha256 } nebo { chyba, kod }. */
export async function kopieSkriptKus(otisk, i) {
  const s = await uloziste(KS_ULOZISTE);
  const st = await s.cti(KS_STAV_KLIC);
  if (!st || !st.hotovo || st.format !== KS_FORMAT) return { chyba: 'Kopie není připravená — nejdřív POST { akce: "priprav" }.', kod: 409 };
  if (otisk !== st.otisk) return { chyba: 'Připravená kopie je z otisku ' + st.otisk + ', ne ' + otisk + ' — začněte znovu.', kod: 409 };
  if (!Number.isInteger(i) || i < 0 || i >= st.kusy.length) return { chyba: 'Neplatné číslo kusu.', kod: 400 };
  const data = await s.ctiBin(kusKlic(otisk, i));
  const sha = data ? createHash('sha256').update(data).digest('hex') : '';
  if (!data || data.length !== st.kusy[i].b || sha !== st.kusy[i].sha) {
    /* poškozený kus → příprava znovu od začátku (další běh skriptu) */
    await s.zapis(KS_STAV_KLIC, { format: 'zahozeno', otisk: st.otisk, kdy: new Date().toISOString() });
    return { chyba: 'Kus ' + i + ' připravené kopie je poškozený — kopie se připraví znovu.', kod: 500 };
  }
  return { data, sha256: sha };
}

/* Stav pojistky retence pro skript (bez dat): zadne | drzi | poskozene | potvrzene. */
export function retenceProSkript(v) {
  if (v === null || v === undefined) return { stav: 'zadne' };
  if (retenceVarovaniPoskozene(v)) return { stav: 'poskozene' };
  const den = typeof v.den === 'string' ? v.den.slice(0, 10) : '';
  const text = typeof v.text === 'string' ? v.text.slice(0, 400) : '';
  return { stav: retenceDrzena(v) ? 'drzi' : 'potvrzene', den, text };
}
export async function retenceProSkriptCti() {
  return retenceProSkript(await (await uloziste('zalohy')).cti(RETENCE_VAROVANI_KLIC));
}

/* ---------- četnost (B212) ---------- */
/* Špatný token: počítadlo na adresu (IPv6 po /64). Vrací true = nad limitem. */
export async function spatnyTokenZapocti(req) {
  const s = await uloziste(KS_ULOZISTE);
  const klic = KS_SPATNE_PREDPONA + pokusyIpKlic(adresaKlienta(req) || 'neznama');
  return vyhradne('kopie-skript-spatne', async () => {
    const z = await s.cti(klic);
    const ted = Date.now();
    const n = z && ted - (+z.posledni || 0) <= KS_LIMIT.oknoSpatnychMs ? (+z.n || 0) + 1 : 1;
    await s.zapis(klic, { n, posledni: ted });
    return n > KS_LIMIT.spatnychZa15;
  });
}
/* Správný token: hodina (všechny požadavky) a den (stažené kusy). Vrací
 * null, nebo text důvodu 429. */
export async function cetnostZapocti(kus) {
  const s = await uloziste(KS_ULOZISTE);
  return vyhradne('kopie-skript-cetnost', async () => {
    const ted = Date.now(), den = new Date(ted).toISOString().slice(0, 10);
    const z = (await s.cti(KS_CETNOST_KLIC)) || {};
    const h = z.hodina && ted - (+z.hodina.od || 0) < 3600000 ? { od: +z.hodina.od, n: +z.hodina.n || 0 } : { od: ted, n: 0 };
    const d = z.den && z.den.den === den ? { den, kusu: +z.den.kusu || 0 } : { den, kusu: 0 };
    if (h.n >= KS_LIMIT.zaHodinu) return 'víc než ' + KS_LIMIT.zaHodinu + ' požadavků za hodinu';
    if (kus && d.kusu >= KS_LIMIT.kusuZaDen) return 'víc než ' + KS_LIMIT.kusuZaDen + ' stažených kusů za den';
    h.n++; if (kus) d.kusu++;
    await s.zapis(KS_CETNOST_KLIC, { hodina: h, den: d });
    return null;
  });
}
