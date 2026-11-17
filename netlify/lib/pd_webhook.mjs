/* ============================================================
 * WEBHOOK „VYGENEROVAT NABÍDKU“ Z PIPEDRIVE — ČISTÁ LOGIKA (#553, varianta A,
 * rozhodnutí J. V. 3. 11. 2026)
 *
 * Automatizace v Pipedrive (zakládá ji integrátor) po změně pole „Vygenerovat
 * nabídku“ pošle POST na /api/pd/webhook (functions/pd_webhook.mjs). Tady je
 * všechno, co se dá otestovat bez sítě a bez úložiště:
 *
 *   · klíč webhooku (proměnná prostředí, porovnání v konstantním čase),
 *   · ID dealu z těla — JEDINÝ údaj, který se z těla bere; cena, název ani
 *     nic jiného z webhooku do kalkulace nejde,
 *   · zadání kalkulace z dealu (§12 / #113: číslo a název akce, adresa,
 *     zákazník, IČO, kontakt, typ zakázky → strana OCK / PROJ, konečné předání),
 *   · pravidlo přepisu (#113: „přepsat se smí jen prázdné pole, nebo po
 *     potvrzení“ — webhook potvrzení nemá): pole se přepíše, jen když je
 *     prázdné, nebo v něm pořád leží hodnota, kterou tam dal minulý webhook.
 *     Co obchodník v kalkulaci změnil, webhook nepřepíše nikdy. Poznávají se
 *     podle OTISKU (sha256, 16 znaků) v `zak.pdZadani` — samotné hodnoty
 *     (jména, telefony) se podruhé neukládají,
 *   · zamčená (odeslaná) varianta: webhook ji nemění NIKDY; se zamčenou
 *     variantou v zakázce se nemění ani hlavička (je na vytištěném papíře),
 *   · CENA se z CRM ani z webhooku nebere nikdy. Nová kalkulace se ukládá
 *     ve tvaru „bez ceníku“ (P12, zakazkaBezCeniku): ceník si doplní prohlížeč
 *     z platného zveřejněného ceníku při otevření — server žádnou cenu neurčuje.
 * ============================================================ */
import { createHash } from 'node:crypto';
import { tajneShodne } from './sdilene.mjs';

export const PD_WEBHOOK_KLIC_PROMENNA = 'PIPEDRIVE_WEBHOOK_KLIC';
/* Kratší klíč se bere jako nenastavený (webhook pak odpovídá 503): krátký
 * klíč jde uhodnout a webhook umí zakládat zakázky. */
export const PD_WEBHOOK_KLIC_MIN = 32;
/* Hlavička s klíčem. Alternativně `Authorization: Bearer <klíč>` nebo heslo
 * HTTP Basic (Pipedrive automatizace umí obojí); v adrese (query) se klíč
 * NEPŘIJÍMÁ — adresy se logují. */
export const PD_WEBHOOK_HLAVICKA = 'x-kalkulator-klic';
/* Strop volání webhooku s platným klíčem (B158 vzor): jedno volání stojí
 * 3–4 tokeny Pipedrive (deal, organizace, osoba, zápis odkazu 5) — 60 za
 * hodinu je pro ruční tlačítko v CRM velkorysá rezerva a smyčka automatizace
 * (#117) narazí do minuty. Počítadlo je společné pro celý webhook. */
export const PD_WEBHOOK_MAX = 60;
export const PD_WEBHOOK_OKNO_MS = 3600 * 1000;
export const PD_WEBHOOK_TELO_MAX = 16 * 1024;
/* Kdo zakázku založil/upravil (razítko autor/upravil). Není to účet —
 * přihlásit se pod ním nejde (žádný záznam v úložišti `uzivatele`). */
export const PD_WEBHOOK_AUTOR = 'pipedrive-webhook';
export const PD_WEBHOOK_AUTOR_JMENO = 'Pipedrive (webhook)';
export const PD_WEBHOOK_ULOZISTE = 'pd_webhook';
const ID_MAX = 2147483647;

/* Klíč z prostředí, nebo '' (nenastavený / příliš krátký). */
export function pdWebhookKlic(env = process.env) {
  const k = String((env && env[PD_WEBHOOK_KLIC_PROMENNA]) || '').trim();
  return k.length >= PD_WEBHOOK_KLIC_MIN ? k : '';
}

/* Klíč z požadavku: hlavička x-kalkulator-klic, Bearer, nebo heslo Basic. */
export function pdWebhookKlicZPozadavku(req) {
  const h = (n) => String((req && req.headers && req.headers.get(n)) || '');
  const prima = h(PD_WEBHOOK_HLAVICKA).trim();
  if (prima) return prima;
  const auth = h('authorization').trim();
  let m = /^Bearer\s+(.+)$/i.exec(auth);
  if (m) return m[1].trim();
  m = /^Basic\s+([A-Za-z0-9+/=]+)$/i.exec(auth);
  if (m) {
    let t = '';
    try { t = Buffer.from(m[1], 'base64').toString('utf8'); } catch (e) { t = ''; }
    const i = t.indexOf(':');
    return i >= 0 ? t.slice(i + 1) : '';
  }
  return '';
}

/* true jen při shodě s nastaveným klíčem — porovnání v konstantním čase
 * (tajneShodne: sha256 obou stran + timingSafeEqual). */
export function pdWebhookKlicSedi(dany, ocekavany) {
  if (!ocekavany || !dany) return false;
  return tajneShodne(dany, ocekavany);
}

/* ID dealu z těla webhooku: `dealId`, `deal_id`, nebo `{ data: { id } }`
 * se `meta.entity === 'deal'` (obecný webhook Pipedrive v2). Kladné celé
 * číslo do 2^31−1 jako text, jinak null. NIC JINÉHO SE Z TĚLA NEBERE. */
export function pdWebhookDealId(telo) {
  if (!telo || typeof telo !== 'object' || Array.isArray(telo)) return null;
  let x = telo.dealId !== undefined ? telo.dealId : telo.deal_id;
  if (x === undefined && telo.data && typeof telo.data === 'object' && telo.meta && typeof telo.meta === 'object'
      && telo.meta.entity === 'deal') x = telo.data.id;
  if (typeof x !== 'string' && typeof x !== 'number') return null;
  const s = String(x).trim();
  if (!/^[1-9][0-9]{0,9}$/.test(s) || +s > ID_MAX) return null;
  return s;
}

/* Otisk hodnoty pro pravidlo přepisu — 16 znaků sha256, prázdno = ''. */
export function pdWebhookOtisk(h) {
  const t = String(h == null ? '' : h).trim();
  return t ? createHash('sha256').update('kng553|' + t, 'utf8').digest('hex').slice(0, 16) : '';
}

/* Pole hlavičky, která webhook plní (na straně OCK: zakázka, PROJ: projHlavicka). */
/* K40c #581: + sídlo a DIČ zákazníka — firmu (objednatel, sídlo, IČO, DIČ)
 * webhook bere z ARES (lib/ares_server.mjs), když odpoví; jinak z dealu jako
 * dřív (bez sídla a DIČ, ty deal nemá). Pravidlo přepisu je pro všechna pole
 * stejné (`smi()`): prázdné pole, nebo hodnota naposledy zapsaná webhookem. */
export const PD_WEBHOOK_POLE = ['nazevAkce', 'adresa', 'objednatel', 'adresaObjednatele', 'ico', 'dic', 'kontakt'];
/* Pole hlavičky, která zná ARES (src/ares.js ARES_POLE). */
export const PD_WEBHOOK_POLE_ARES = ['objednatel', 'adresaObjednatele', 'ico', 'dic'];
/* Datum z CRM do krycího listu OCK nezamčených variant. */
export const PD_WEBHOOK_KRYCI = 'terminPredani';

/* Zadání z dealu: `nase` = výstup pdDealNaNase, `cnDealu` = hodnota pole
 * „Číslo nabídky (CN)“ v dealu. Strana podle Typu zakázky: Projekce… → PROJ,
 * jinak OCK (P6: OCK a PROJ jsou v CRM dva dealy). */
export function pdWebhookZadani(nase, cnDealu) {
  const n = nase || {};
  const txt = (x) => String(x == null ? '' : x).replace(/\s+/g, ' ').trim().slice(0, 500);
  const strana = /^\s*projekce/i.test(String(n.typZakazky || '')) ? 'proj' : 'ock';
  const kontakt = [txt(n.kontakt), txt(n.kontaktObjednatel)].filter(Boolean).join(', ');
  const datum = /^\d{4}-\d{2}-\d{2}$/.test(String(n.terminPlneni || '').slice(0, 10)) ? String(n.terminPlneni).slice(0, 10) : '';
  return {
    strana,
    cislo: txt(cnDealu) || txt(n.cislo),
    pole: { nazevAkce: txt(n.nazevAkce), adresa: txt(n.adresa), objednatel: txt(n.objednatel),
            adresaObjednatele: '', ico: txt(n.ico), dic: '', kontakt },
    terminPredani: strana === 'ock' ? datum : '',
  };
}

/* Výběrové pole bez popisky (API vrátí jen id volby) → popiska z definice
 * pole v mapě (`popis.volby`). Nenalezená volba = '' (nic se nehádá). */
export function pdWebhookVolbaText(hodnota, popis) {
  const t = String(hodnota == null ? '' : hodnota).trim();
  if (!/^\d+$/.test(t)) return t;
  const volby = (popis && Array.isArray(popis.volby)) ? popis.volby : [];
  const o = volby.find((x) => x && String(x.id) === t);
  return o ? String(o.label || '') : '';
}

/* VZ-E4 (#603, návrh § 7.3): u zakázky s víc zákazníky nese hlavička řídícího
 * zákazníka — po jeho výměně (bez prodeje) zůstává deal na organizaci původního.
 * Při NESHODĚ IČO organizace dealu a hlavičky (jen číslice) webhook pole firmy
 * (zákazník, sídlo, IČO, DIČ, kontakt) nepřepisuje ani prázdná nedoplňuje
 * a ARES se nevolá. Jeden zákazník / strana PROJ → false (dnešek). */
export const PD_WEBHOOK_FIRMA = ['objednatel', 'adresaObjednatele', 'ico', 'dic', 'kontakt'];
export function pdWebhookVzFirmaCizi(zak, icoDealu, strana) {
  const G = globalThis;
  if (!zak || strana === 'proj' || typeof G.vzRezim !== 'function' || !G.vzRezim(zak)) return false;
  const c = x => String(x == null ? '' : x).replace(/\D+/g, '');
  return c(icoDealu) !== c(zak.ico);
}

/* Kam na zakázce patří hlavička strany. */
export function pdWebhookHlavicka(zak, strana) {
  if (strana === 'proj') {
    if (!zak.projHlavicka || typeof zak.projHlavicka !== 'object' || Array.isArray(zak.projHlavicka)) zak.projHlavicka = {};
    return zak.projHlavicka;
  }
  return zak;
}

const zamcena = (v) => !!(globalThis.variantaUzamcena ? globalThis.variantaUzamcena(v) : (v && v.zamek && v.zamek.zamceno));

/* Uložený snímek otisků, nebo prázdný (cizí tvar se zahodí). */
function snimek(zak) {
  const p = zak && zak.pdZadani;
  const o = p && typeof p === 'object' && !Array.isArray(p) && p.otisk && typeof p.otisk === 'object' && !Array.isArray(p.otisk) ? p.otisk : {};
  const out = {};
  for (const k of PD_WEBHOOK_POLE.concat([PD_WEBHOOK_KRYCI])) if (typeof o[k] === 'string' && /^[0-9a-f]{16}$/.test(o[k])) out[k] = o[k];
  return out;
}

/* Přenese zadání do zakázky (na místě). Vrací { zmeneno: [...], ponechano: [...],
 * zamceno, variantyZmeneno }. `ponechano` = pole, která obchodník v kalkulaci
 * změnil a deal má jinou hodnotu (jen NÁZVY polí, žádné hodnoty).
 *   – zamčená varianta v zakázce → hlavička beze změny (zamceno: true),
 *   – krycí list: jen nezamčené varianty, jen strana OCK. */
export function pdWebhookPouzij(zak, zadani, dealId, kdy, volby = {}) {
  const otisk = snimek(zak);
  const novyOtisk = { ...otisk };
  const zmeneno = [], ponechano = [];
  const varianty = Array.isArray(zak.varianty) ? zak.varianty : [];
  /* Zmrazená hlavička (K40c: zamekZakCestaZmrazena po tisku SoD / odeslané CN)
   * se nemění stejně jako hlavička zakázky se zamčenou variantou. */
  const zamceno = varianty.some(zamcena) || volby.hlavickaZmrazena === true;
  const smi = (aktualni, klic) => {
    const a = String(aktualni == null ? '' : aktualni).trim();
    return !a || (otisk[klic] && pdWebhookOtisk(a) === otisk[klic]);
  };
  if (!zamceno) {
    const h = pdWebhookHlavicka(zak, zadani.strana);
    for (const k of PD_WEBHOOK_POLE) {
      if (volby.bezFirmy === true && PD_WEBHOOK_FIRMA.includes(k)) continue;   // VZ-E4: neshoda IČO u víc zákazníků
      const nova = zadani.pole[k] || '';
      const aktualni = typeof h[k] === 'string' ? h[k] : '';
      if (aktualni.trim() === nova) { if (nova) novyOtisk[k] = pdWebhookOtisk(nova); continue; }
      if (!nova) continue;                      // prázdno z CRM nic nemaže
      if (smi(aktualni, k)) { h[k] = nova; novyOtisk[k] = pdWebhookOtisk(nova); zmeneno.push(k); }
      else ponechano.push(k);
    }
  }
  let variantyZmeneno = 0;
  const datum = zadani.terminPredani;
  if (datum) {
    let ponechanoKryci = false;
    for (const v of varianty) {
      if (!v || !v.data || typeof v.data !== 'object' || zamcena(v)) continue;
      const d = v.data;
      if (!d.kryci || typeof d.kryci !== 'object' || Array.isArray(d.kryci)) d.kryci = { hodnoty: {} };
      if (!d.kryci.hodnoty || typeof d.kryci.hodnoty !== 'object' || Array.isArray(d.kryci.hodnoty)) d.kryci.hodnoty = {};
      const aktualni = typeof d.kryci.hodnoty[PD_WEBHOOK_KRYCI] === 'string' ? d.kryci.hodnoty[PD_WEBHOOK_KRYCI] : '';
      if (aktualni.trim() === datum) continue;
      if (smi(aktualni, PD_WEBHOOK_KRYCI)) { d.kryci.hodnoty[PD_WEBHOOK_KRYCI] = datum; variantyZmeneno++; }
      else ponechanoKryci = true;
    }
    novyOtisk[PD_WEBHOOK_KRYCI] = pdWebhookOtisk(datum);
    if (variantyZmeneno) zmeneno.push(PD_WEBHOOK_KRYCI);
    if (ponechanoKryci) ponechano.push(PD_WEBHOOK_KRYCI);
  }
  const zmenaOtisku = JSON.stringify(novyOtisk) !== JSON.stringify(otisk);
  if (zmeneno.length || zmenaOtisku || !zak.pdZadani || zak.pdZadani.deal !== String(dealId))
    zak.pdZadani = { deal: String(dealId), kdy: kdy || new Date().toISOString(), otisk: novyOtisk };
  return { zmeneno, ponechano, zamceno, variantyZmeneno };
}

/* Pojistka „zamčenou variantu webhook nikdy nemění“: každá varianta zamčená
 * v uložené verzi musí v nové verzi zůstat bajt po bajtu stejná. Vrací
 * seznam id porušených variant ([] = v pořádku). */
export function pdWebhookZamkyPoruseny(stara, nova) {
  const spatne = [];
  const nove = new Map(((nova && nova.varianty) || []).filter(Boolean).map((v) => [v.id, v]));
  for (const v of ((stara && stara.varianty) || [])) {
    if (!v || !zamcena(v)) continue;
    const n = nove.get(v.id);
    if (!n || JSON.stringify(n) !== JSON.stringify(v)) spatne.push(String(v.id));
  }
  return spatne;
}

/* Číslo nabídky strany pro porovnání vlastnictví dealu (#115 B): klíč
 * souboru (mezery, velikost písmen a pomlčky nerozhodují). */
export function pdWebhookCisloKlic(cislo) {
  const f = globalThis.uloKlicSouboru;
  const t = String(cislo == null ? '' : cislo).trim();
  return t ? (typeof f === 'function' ? f(t) : t.toLowerCase()) : '';
}

/* VZ-E2 (#601): číslo nabídky dalšího zákazníka nese písmeno („…9940-B",
 * návrh § 3). Rozklad stejným pravidlem jako vzCisloRozloz (src/vice_zakazniku.js):
 * písmeno B–Z jen za číslicí. Vrací { zaklad, pismeno } (bez písmene pismeno ''). */
export function pdWebhookCisloZaklad(cislo) {
  const c = String(cislo == null ? '' : cislo).trim();
  const m = /^(.*\d)-([B-Z])$/.exec(c);
  return m ? { zaklad: m[1], pismeno: m[2] } : { zaklad: c, pismeno: '' };
}

/* Nese uložená zakázka zákazníka s tímto písmenem? Jen ČTE: řídící
 * (vzRidici.pismeno), další zákazníci (dalsiZakaznici[].pismeno) a razítka
 * tisků (varianty[].zamek.tisky[].zakaznik.pismeno — písmeno zákazníka, kterému
 * nabídka odešla, i když ho mezitím odebrali). Zakázka s jedním zákazníkem → false. */
export function pdWebhookPismeno(zak, pismeno) {
  if (!zak || typeof zak !== 'object' || typeof pismeno !== 'string' || !/^[B-Z]$/.test(pismeno)) return false;
  const obj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
  if (obj(zak.vzRidici) && zak.vzRidici.pismeno === pismeno) return true;
  if (Array.isArray(zak.dalsiZakaznici) && zak.dalsiZakaznici.some((z) => obj(z) && z.pismeno === pismeno)) return true;
  return (Array.isArray(zak.varianty) ? zak.varianty : []).some((v) => obj(v) && obj(v.zamek) && Array.isArray(v.zamek.tisky)
    && v.zamek.tisky.some((t) => obj(t) && obj(t.zakaznik) && t.zakaznik.pismeno === pismeno));
}

/* VZ-E2 (#601, U4 revize): číslo varianty „…9940.2" → { zaklad: „…9940",
 * pripona: 2 } (přípona varianty v.pripona, zamek.js variantaCislo). Jen
 * kladné celé číslo bez úvodní nuly za číslicí; jinak pripona 0 a základ
 * beze změny. Webhook ji odřízne JEN u čísla s písmenem zákazníka. */
export function pdWebhookCisloVarianta(cislo) {
  const c = String(cislo == null ? '' : cislo).trim();
  const m = /^(.*\d)\.([1-9]\d{0,5})$/.exec(c);
  return m ? { zaklad: m[1], pripona: Number(m[2]) } : { zaklad: c, pripona: 0 };
}

/* Má uložená zakázka variantu s příponou `pripona` (v.pripona === N)? Jen ČTE. */
export function pdWebhookVariantaPripona(zak, pripona) {
  if (!zak || typeof zak !== 'object' || !Number.isInteger(pripona) || pripona < 1) return false;
  return (Array.isArray(zak.varianty) ? zak.varianty : [])
    .some((v) => !!v && typeof v === 'object' && v.pripona === pripona);
}

/* Vlastník dealu (#115 B) s písmenem zákazníka: CN dealu patří kalkulaci
 * s číslem `cisloKalkulace`, když se shodují klíče (jako dřív), nebo když CN
 * je „<číslo kalkulace>-P" a zakázka zákazníka s písmenem P opravdu nese,
 * nebo „<číslo kalkulace>.N-P" a zakázka nese P I variantu s příponou N (U4). */
export function pdWebhookCisloSedi(cisloKalkulace, cnDealu, zak) {
  const k = pdWebhookCisloKlic(cisloKalkulace);
  if (!k || k === pdWebhookCisloKlic(cnDealu)) return true;
  const r = pdWebhookCisloZaklad(cnDealu);
  if (!r.pismeno || !pdWebhookPismeno(zak, r.pismeno)) return false;
  if (pdWebhookCisloKlic(r.zaklad) === k) return true;
  const v = pdWebhookCisloVarianta(r.zaklad);
  return v.pripona > 0 && pdWebhookCisloKlic(v.zaklad) === k && pdWebhookVariantaPripona(zak, v.pripona);
}

/* Odkaz do aplikace: <web>/?zakazka=<soubor> (src/ui/online_ui.js ho po
 * přihlášení otevře). Web = proměnná Netlify URL, jinak původ požadavku. */
export function pdWebhookOdkaz(soubor, req, env = process.env) {
  let zaklad = String((env && env.URL) || '').trim();
  if (!/^https?:\/\/[^\s/]+/i.test(zaklad)) { try { zaklad = new URL(req.url).origin; } catch (e) { zaklad = ''; } }
  zaklad = zaklad.replace(/\/+$/, '');
  return zaklad + '/?zakazka=' + encodeURIComponent(String(soubor));
}
