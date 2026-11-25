/* ============================================================
 * DOHLEDÁNÍ OSOB A ORGANIZACÍ PRO POLE „JEN DO PRÁZDNÉHO“ (PD2 #782,
 * J. V. 25. 11. 2026; revize návrhu Fable U1–U6)
 *
 * Kontakty smluvní / obchodní / technický, Podepisující firma, Druhý
 * podepisující a Zmocnitel jsou v Pipedrive pole typu osoba / organizace —
 * hodnotou je ID záznamu. Krycí list drží jména a e-maily jako text, takže
 * zápis (odeslání #116, prodej #597) musí záznam DOHLEDAT:
 *   · kontakt      osoba podle e-mailu z krycího listu
 *                  (GET /api/v2/persons/search fields=email, exact_match),
 *   · podpis2, zmocnitel  osoba podle přesného jména JEN mezi osobami
 *                  organizace dealu (organization_id; deal bez organizace = nelze),
 *   · podpisFirma  organizace podle přesného názvu (fields=name).
 * Výsledku hledání se NEVĚŘÍ: přesná shoda normalizovaného e-mailu / jména
 * (a u jména i organizace) se ověří tady. Právě jedna shoda = ID; žádná nebo
 * víc = důvod. Nic se v Pipedrive nezakládá (jen GET).
 *
 * Meze (U4, U5): nejvýš PD_DOHLEDANI_MAX hledání na požadavek (požadavek sám
 * čerpá strop náhledu / zápisu), hledání běží souběžně pod společnou lhůtou;
 * nedoběhlé = „nelze ověřit“, ostatní pole se zapíšou, nic se neopakuje.
 * Hledaný e-mail ani jméno se nikdy neobjeví v důvodu, logu ani stavu zakázky —
 * jméno a organizace NALEZENÉ osoby jdou jen do tabulky „dnes / nově“
 * tomu, kdo má k dealu právo (funkce odeslání / prodeje).
 * ============================================================ */
import { PD_SMER_ZAPIS, pdJenPrazdneDuvod } from './pd_prevod.mjs';
import { PdChyba } from './pipedrive.mjs';

export const PD_DOHLEDANI_MAX = 6;
export const PD_DOHLEDANI_LHUTA_MS = 3000;

export const PD_DOHLEDANI_DUVODY = Object.freeze({
  bezEmailu: 'v krycím listu chybí e-mail — osoba se v Pipedrive hledá podle e-mailu',
  spatnyEmail: 'e-mail v krycím listu nemá platný tvar',
  nenalezenaEmail: 'osoba s tímto e-mailem v Pipedrive není (kalkulátor osoby nezakládá)',
  viceEmail: 'e-mail odpovídá víc osobám v Pipedrive — vyberte osobu v dealu ručně',
  bezOrganizace: 'deal nemá organizaci — osoba se podle jména hledá jen mezi osobami organizace dealu',
  nenalezenaJmeno: 'osoba s tímto jménem u organizace dealu v Pipedrive není (kalkulátor osoby nezakládá)',
  viceJmeno: 'jméno odpovídá víc osobám organizace dealu — vyberte osobu v dealu ručně',
  nenalezenaFirma: 'organizace s tímto názvem v Pipedrive není (kalkulátor organizace nezakládá)',
  viceFirma: 'název odpovídá víc organizacím v Pipedrive — vyberte organizaci v dealu ručně',
  limit: 'nad limit ' + PD_DOHLEDANI_MAX + ' hledání v jednom zápisu — nelze ověřit, doplňte v Pipedrive ručně',
  casem: 'hledání v Pipedrive nedoběhlo včas — nelze ověřit, pole se nezapíše',
  chyba: 'hledání v Pipedrive se nepovedlo — nelze ověřit, pole se nezapíše',
  kratke: 'hodnota v krycím listu je na hledání příliš krátká',
});

const EMAIL_TVAR = /^[^\s@,;<>()]+@[^\s@,;<>()]+\.[^\s@,;<>()]+$/;
export const pdEmailNorm = (t) => String(t == null ? '' : t).normalize('NFC').trim().toLowerCase();
export const pdJmenoNorm = (t) => String(t == null ? '' : t).normalize('NFC').trim().toLocaleLowerCase('cs')
  .replace(/[‐-―−]/g, '-').replace(/\s+/g, ' ');
const idCislo = (x) => {
  const v = x && typeof x === 'object' ? (x.value !== undefined ? x.value : x.id) : x;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};
const emaily = (item) => (Array.isArray(item && item.emails) ? item.emails : [])
  .map((e) => pdEmailNorm(e && typeof e === 'object' ? e.value : e)).filter(Boolean);
const kratky = (x, max = 120) => String(x == null ? '' : x).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

/* Text pro tabulku (U6): „Jméno (Organizace)“, organizace jen název. */
function textOsoby(item) {
  const org = item && item.organization && item.organization.name ? kratky(item.organization.name) : '';
  return kratky(item && item.name) + (org ? ' (' + org + ')' : '');
}

/* Hodnoty KL pro jedno pole: strana jako pdZapisDealu (OCK má přednost). */
function hodnotyPole(def, strany) {
  for (const strana of ['ock', 'proj']) {
    const z = strany && strany[strana];
    const kl = def.kl && def.kl[strana];
    if (!z || !kl) continue;
    const v = [].concat(kl).map((id) => String((z.hodnoty && z.hodnoty[id] != null) ? z.hodnoty[id] : '').trim());
    if (v.some((x) => x !== '')) return v;
  }
  return null;
}

/* Jeden dotaz: { klic, cesta, dotaz, over(items) → { id, text } | { duvod } }. */
function dotazPole(def, v, deal) {
  if (def.hledej === 'osobaEmail') {
    const email = pdEmailNorm(v[1]);
    if (!email) return { duvod: PD_DOHLEDANI_DUVODY.bezEmailu };
    if (!EMAIL_TVAR.test(email)) return { duvod: PD_DOHLEDANI_DUVODY.spatnyEmail };
    return { klic: 'e:' + email, cesta: '/api/v2/persons/search',
      dotaz: { term: email, fields: 'email', exact_match: 'true', limit: 10 },
      over: (items) => {
        const hit = items.filter((it) => idCislo(it) && emaily(it).includes(email));
        return hit.length === 1 ? { id: idCislo(hit[0]), text: textOsoby(hit[0]) }
          : { duvod: hit.length ? PD_DOHLEDANI_DUVODY.viceEmail : PD_DOHLEDANI_DUVODY.nenalezenaEmail };
      } };
  }
  if (def.hledej === 'osobaJmeno') {
    const jmeno = pdJmenoNorm(v[0]);
    const org = idCislo(deal && deal.org_id);
    if (!org) return { duvod: PD_DOHLEDANI_DUVODY.bezOrganizace };
    if (jmeno.length < 2) return { duvod: PD_DOHLEDANI_DUVODY.kratke };
    return { klic: 'j:' + org + ':' + jmeno, cesta: '/api/v2/persons/search',
      dotaz: { term: String(v[0]).trim(), fields: 'name', exact_match: 'true', organization_id: org, limit: 10 },
      over: (items) => {
        const hit = items.filter((it) => idCislo(it) && pdJmenoNorm(it.name) === jmeno
          && idCislo(it.organization) === org);
        return hit.length === 1 ? { id: idCislo(hit[0]), text: textOsoby(hit[0]) }
          : { duvod: hit.length ? PD_DOHLEDANI_DUVODY.viceJmeno : PD_DOHLEDANI_DUVODY.nenalezenaJmeno };
      } };
  }
  if (def.hledej === 'organizace') {
    const nazev = pdJmenoNorm(v[0]);
    if (nazev.length < 2) return { duvod: PD_DOHLEDANI_DUVODY.kratke };
    return { klic: 'o:' + nazev, cesta: '/api/v2/organizations/search',
      dotaz: { term: String(v[0]).trim(), fields: 'name', exact_match: 'true', limit: 10 },
      over: (items) => {
        const hit = items.filter((it) => idCislo(it) && pdJmenoNorm(it.name) === nazev);
        return hit.length === 1 ? { id: idCislo(hit[0]), text: kratky(hit[0].name) }
          : { duvod: hit.length ? PD_DOHLEDANI_DUVODY.viceFirma : PD_DOHLEDANI_DUVODY.nenalezenaFirma };
      } };
  }
  return null;
}

/* Dohledá ID pro pole s `prevod: 'dohledani'`. Hledá jen tam, kde by se
 * opravdu zapisovalo: pole v mapě, KL vyplněný, pole dealu prázdné.
 *   definice  pole mapy (POLE_DEALU, u odeslání bez sekcí SoD),
 *   strany    { ock?, proj? } jako pdZapisDealu, pole = pdPoleMapa(),
 *   deal      deal z Pipedrive (null = nehledá se nic),
 *   zavolej   (cesta, volby) → data (pdZavolej s časovou mezí volajícího).
 * Vrací { dohledano: { klic: { id, text } | { duvod } }, hledani: počet dotazů }. */
export async function pdDohledej(definice, strany, pole, deal, zavolej, volby = {}) {
  const max = Number.isInteger(volby.max) ? volby.max : PD_DOHLEDANI_MAX;
  const lhuta = Number(volby.lhutaMs) > 0 ? Number(volby.lhutaMs) : PD_DOHLEDANI_LHUTA_MS;
  const dohledano = {};
  if (!deal || typeof deal !== 'object' || typeof zavolej !== 'function') return { dohledano, hledani: 0 };
  const mapa = (pole && pole.mapa) || {};
  const dotazy = new Map();   // klíč dotazu → { cesta, dotaz, pole: [{ klic, over }] }
  for (const def of definice || []) {
    if (!def || def.prevod !== 'dohledani' || !PD_SMER_ZAPIS.includes(def.smer) || !mapa[def.klic]) continue;
    const v = hodnotyPole(def, strany);
    if (!v) continue;
    if (pdJenPrazdneDuvod(def, pole, deal)) continue;   // obsazené pole se nehledá (nic se nepřepíše)
    const d = dotazPole(def, v, deal);
    if (!d) continue;
    if (d.duvod) { dohledano[def.klic] = { duvod: d.duvod }; continue; }
    if (!dotazy.has(d.klic)) {
      if (dotazy.size >= max) { dohledano[def.klic] = { duvod: PD_DOHLEDANI_DUVODY.limit }; continue; }
      dotazy.set(d.klic, { cesta: d.cesta, dotaz: d.dotaz, pole: [] });
    }
    dotazy.get(d.klic).pole.push({ klic: def.klic, over: d.over });
  }
  if (!dotazy.size) return { dohledano, hledani: 0 };
  /* Souběžně pod společnou lhůtou (U5). Nedoběhlý dotaz = „nelze ověřit“;
   * pozdní odpověď už nic nezmění (výsledek se zamkne při vypršení). */
  let vyprselo = false;
  let casovac;
  const konec = new Promise((ano) => { casovac = setTimeout(() => { vyprselo = true; ano(); }, lhuta); });
  const jeden = async (q) => {
    let vysl;
    try {
      const data = await zavolej(q.cesta, { dotaz: q.dotaz });
      const items = (data && Array.isArray(data.items) ? data.items : []).map((x) => (x && x.item) || null).filter(Boolean);
      vysl = (o) => o(items);
    } catch (e) {
      if (!(e instanceof PdChyba) && !(e && e.name === 'AbortError')) throw e;
      const d = (e && (e.stav === 504 || e.name === 'AbortError')) ? PD_DOHLEDANI_DUVODY.casem : PD_DOHLEDANI_DUVODY.chyba;
      vysl = () => ({ duvod: d });
    }
    if (vyprselo) return;
    for (const p of q.pole) if (!dohledano[p.klic]) dohledano[p.klic] = vysl(p.over);
  };
  try {
    await Promise.race([Promise.all([...dotazy.values()].map(jeden)), konec]);
  } finally { clearTimeout(casovac); }
  vyprselo = true;
  for (const q of dotazy.values()) for (const p of q.pole) if (!dohledano[p.klic]) dohledano[p.klic] = { duvod: PD_DOHLEDANI_DUVODY.casem };
  return { dohledano, hledani: dotazy.size };
}
