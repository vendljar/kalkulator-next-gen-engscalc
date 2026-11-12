/* ============================================================
 * ARES ZE SERVERU (K40c #581, rozhodnutí J. V. 11. 11. 2026, mez B208)
 *
 * Webhook „Vygenerovat nabídku“ bere firmu (zákazník, sídlo, IČO, DIČ)
 * z ARES podle IČO organizace dealu; oprava organizace v Pipedrive
 * (functions/pd_organizace.mjs) si hodnoty z ARES načte znovu sama.
 *
 *   · adresa je PEVNÁ (ARES_ZAKLAD z src/ares.js) + IČO, které po
 *     normalizaci projde kontrolní číslicí (jen \d{8}) — nic jiného z dealu
 *     se do adresy nedostane; neplatné IČO se do ARES neposílá vůbec,
 *   · JEDEN pokus, časový limit 3 s (AbortController i závod s časovačem —
 *     platí i pro `fetch`, který signál ignoruje), přesměrování se nepřijímá,
 *     strop velikosti odpovědi 200 kB,
 *   · odpověď je NEDŮVĚRYHODNÝ vstup: jen přes aresZpracuj, vrácené IČO
 *     musí být shodné s dotazovaným, jen řetězce bez řídicích znaků,
 *     délkové stropy, DIČ jen tvaru ^[A-Z]{2}[0-9A-Z]{2,12}$,
 *   · `fetch` se předává parametrem — testy nikdy nevolají síť.
 *
 * Výsledek: { stav: 'ok', subjekt } | { stav: 'neplatne' | 'nenalezeno' | 'vypadek' }.
 * Výpadek nic neshodí: volající použije údaje z dealu a varuje.
 * ============================================================ */
import ARES from './ares_modul.cjs';

export const ARES_TIMEOUT_MS = 3000;
export const ARES_ODPOVED_MAX = 200 * 1024;
export const ARES_NAZEV_MAX = 200;
export const ARES_ADRESA_MAX = 300;
export const ARES_DIC_TVAR = /^[A-Z]{2}[0-9A-Z]{2,12}$/;
export const ARES_STAVY = ['ok', 'neplatne', 'nenalezeno', 'vypadek'];

/* Odkud se volá síť: v aplikaci globální fetch. Testy sem dosadí mock
 * (do ARES se z testů nikdy nesahá — netlify/test_k40c_webhook.mjs). */
export const ARES_SIT = { fetch: (...a) => globalThis.fetch(...a) };

/* IČO po normalizaci: bez mezer, krátké číslo doplněné nulami (v Pipedrive
 * je IČ číselné pole a úvodní nuly ztrácí). '' = nejde o IČO. */
export function aresIcoNorm(v) {
  const t = String(v == null ? '' : v).replace(/\s+/g, '').replace(/\.0+$/, '');
  if (!/^\d{1,8}$/.test(t)) return '';
  return t.padStart(8, '0');
}

/* Kontrolní číslice (stejné pravidlo jako icoPlatne v src/zakazka.js —
 * tady vlastní kopie, ať modul nepotřebuje jádro). */
export function aresIcoPlatne(v) {
  const s = aresIcoNorm(v);
  if (!/^\d{8}$/.test(s)) return false;
  let soucet = 0;
  for (let i = 0; i < 7; i++) soucet += (+s[i]) * (8 - i);
  const zbytek = soucet % 11;
  const kontrolni = zbytek === 0 ? 1 : (zbytek === 1 ? 0 : 11 - zbytek);
  return kontrolni === +s[7];
}

/* Text z cizího zdroje: jen řetězec, bez řídicích znaků, jedna mezera, strop. */
export function aresText(x, max) {
  if (typeof x !== 'string') return '';
  return x.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max).trim();
}

/* Odpověď ARES (už rozparsovaný JSON) → čistý subjekt, nebo null. */
export function aresSubjektCisty(json, icoDotaz) {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  /* aresZpracuj volá String() na všem — cizí typy (objekt, číslo) se proto
   * předem zahodí, ať se z objektu nestane „[object Object]". */
  const s = (k) => (typeof json[k] === 'string' ? json[k] : '');
  const sidlo = json.sidlo && typeof json.sidlo === 'object' && !Array.isArray(json.sidlo) ? json.sidlo : {};
  const sidloCiste = {};
  for (const k of ['textovaAdresa', 'nazevUlice', 'nazevObce', 'cisloDomovni', 'cisloOrientacni', 'psc'])
    if (typeof sidlo[k] === 'string' || (typeof sidlo[k] === 'number' && isFinite(sidlo[k]))) sidloCiste[k] = sidlo[k];
  const z = ARES.aresZpracuj({ obchodniJmeno: s('obchodniJmeno'), ico: s('ico'), dic: s('dic'),
    sidlo: sidloCiste, datumZaniku: s('datumZaniku'), datumVzniku: s('datumVzniku') });
  if (!z) return null;
  const ico = aresIcoNorm(z.ico);
  if (!ico || ico !== aresIcoNorm(icoDotaz)) return null;          // jiné IČO = nenalezeno
  const nazev = aresText(z.nazev, ARES_NAZEV_MAX);
  if (!nazev) return null;
  const dic = aresText(z.dic, 20).toUpperCase();
  return {
    ico,
    nazev,
    adresa: aresText(z.adresa, ARES_ADRESA_MAX),
    dic: ARES_DIC_TVAR.test(dic) ? dic : '',
    zanikla: !!z.zanikla,
    datumZaniku: z.zanikla ? aresText(z.datumZaniku, 30) : '',
  };
}

/* Tělo odpovědi se strojem velikosti — čte se po kouscích, přerostlé se zahodí. */
async function telo(r, max) {
  const delka = +((r.headers && typeof r.headers.get === 'function' && r.headers.get('content-length')) || 0);
  if (delka > max) return null;
  if (r.body && typeof r.body.getReader === 'function') {
    const cteni = r.body.getReader();
    const kusy = []; let celkem = 0;
    for (;;) {
      const { done, value } = await cteni.read();
      if (done) break;
      celkem += value.byteLength;
      if (celkem > max) { try { await cteni.cancel(); } catch (e) { /* nic */ } return null; }
      kusy.push(value);
    }
    return Buffer.concat(kusy.map((k) => Buffer.from(k))).toString('utf8');
  }
  const t = await r.text();
  return t.length > max ? null : t;
}

/* Jeden dotaz do ARES. `fetch` povinně předaný (v aplikaci globalThis.fetch). */
export async function aresNacti(ico, volby = {}) {
  if (!aresIcoPlatne(ico)) return { stav: 'neplatne' };
  const icoN = aresIcoNorm(ico);
  const f = volby.fetch;
  if (typeof f !== 'function') return { stav: 'vypadek' };
  const limit = Number(volby.timeoutMs) > 0 ? Number(volby.timeoutMs) : ARES_TIMEOUT_MS;
  const url = ARES.ARES_ZAKLAD + icoN;   // pevný základ + 8 číslic
  const ac = typeof AbortController === 'function' ? new AbortController() : null;
  let casovac;
  const vyprsi = new Promise((res) => { casovac = setTimeout(() => { try { ac && ac.abort(); } catch (e) { /* nic */ } res('cas'); }, limit); });
  try {
    const prace = (async () => {
      const r = await f(url, { method: 'GET', redirect: 'error', headers: { accept: 'application/json' },
        signal: ac ? ac.signal : undefined });
      if (!r || typeof r.status !== 'number') return { stav: 'vypadek' };
      if (r.status === 404) return { stav: 'nenalezeno' };
      if (r.status !== 200 || r.redirected === true) return { stav: 'vypadek' };
      const text = await telo(r, ARES_ODPOVED_MAX);
      if (text === null) return { stav: 'vypadek' };
      let j;
      try { j = JSON.parse(text); } catch (e) { return { stav: 'vypadek' }; }
      const subjekt = aresSubjektCisty(j, icoN);
      return subjekt ? { stav: 'ok', subjekt } : { stav: 'nenalezeno' };
    })().catch(() => ({ stav: 'vypadek' }));
    const v = await Promise.race([prace, vyprsi]);
    return v === 'cas' ? { stav: 'vypadek', casovyLimit: true } : v;
  } finally {
    clearTimeout(casovac);
  }
}

/* Hlavička kalkulace z ARES: přesně čtyři pole z ARES_POLE. Prázdná hodnota
 * z ARES se nevrací (nic nemaže). */
export function aresPoleHlavicky(subjekt) {
  const out = {};
  if (!subjekt) return out;
  for (const p of ARES.ARES_POLE) {
    const v = String(p.z(subjekt) || '').trim();
    if (v) out[p.klic] = v;
  }
  return out;
}
export const ARES_POLE_KLICE = ARES.ARES_POLE.map((p) => p.klic);
