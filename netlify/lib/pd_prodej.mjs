/* ============================================================
 * ZÁPIS PRODEJE DO DEALU V PIPEDRIVE — ČISTÁ LOGIKA (PV #597, 23. 11. 2026)
 *
 * Rozsah rozhodl J. V. dříve (podklady/PIPEDRIVE_SPUSTENI.md B1): po stisku
 * Prodáno a POTVRZENÍ obchodníkem v tabulce „pole / dnes v Pipedrive / nová
 * hodnota“ se do dealu zapíše
 *   · pole krycího listu podle mapy (pd_mapa.mjs, převody pd_prevod.mjs §11.4:
 *     prázdné se neposílá, nepřevoditelné se neposílá s důvodem, text nad 255
 *     znaků se nezkracuje a nepošle s důvodem, přenesená DPH → volba 0 %,
 *     u kombinované zakázky rozhoduje OCK),
 *   · hodnota dealu = cena řídící (prodané) varianty bez DPH, kombinovaná
 *     OCK + PROJ = součet; po tisku SoD cena díla s objednanými příplatky
 *     (SEC-I17, ctrlCenaDilaSod) — počítá SERVER z uložené zakázky (K8-S3),
 *   · fáze „Vyhrané k podpisu SoD“; stav dealu (status) NIKDY (#545).
 * Jen změněná pole jedním PATCH. Tady je jen logika bez sítě; tok, práva,
 * vazbu, souběh a záznam stavu drží functions/pd_prodej.mjs.
 * ============================================================ */
import { createHash } from 'node:crypto';
import { pdWebhookCisloSedi, pdWebhookCisloVarianta } from './pd_webhook.mjs';

/* Strop pokusů o zápis prodeje na deal za hodinu (vzor B217, čerpají i neúspěšné). */
export const PD_PRODEJ_STROP = 20;
/* Časové meze (vzor VSD N2 / #588): jedno volání Pipedrive a celý požadavek. */
export const PD_PRODEJ_VOLANI_MS = 2500;
export const PD_PRODEJ_CELKEM_MS = 8000;
export const PD_PRODEJ_DUVOD_MAX = 300;

/* Podklad zápisu z ULOŽENÉ zakázky — celý ze serveru (revize PV V1, 23. 11.
 * 2026: texty krycího listu z prohlížeče, včetně Čísla nabídky = značky
 * vlastníka dealu #115 B, šly podvrhnout). Prodaná varianta je řídící
 * (PR #563); kopie s ní jako řídící a otevřenou jde do pdnPodklad (týž kód
 * jako náhled v prohlížeči — serverové hodnoty se s prohlížečem shodují,
 * ověřeno revizí ve 43/43 polích). Krycí list je po Prodáno zmrazený, do CRM
 * jdou jeho uložené hodnoty. Z požadavku se nebere nic kromě popisků zdroje.
 * Vrací { strany, varianta, zdrojCeny: { ock?: 'sod' | 'nabidka', proj?: 'nabidka' } }
 * nebo { chyba }. */
export function pdProdejStrany(zak, G = globalThis, jekly = null) {
  const p = typeof G.prodStav === 'function' ? G.prodStav(zak) : null;
  if (!p || !p.v) return { chyba: 'Zakázka není prodaná — zápis prodeje do Pipedrive jde až po stisku Prodáno.' };
  if (typeof G.pdnPodklad !== 'function') return { chyba: 'Serverová část pro zápis do Pipedrive se nenačetla.' };
  const kopie = JSON.parse(JSON.stringify(zak));
  (kopie.varianty || []).forEach((x) => { if (x) x.ridici = x.id === p.v.id; });
  kopie.aktivni = p.v.id;
  const pod = G.pdnPodklad(kopie, jekly, { faze: 'prodano' });
  if (!pod || !pod.ok) return { chyba: (pod && pod.chyba) || 'Podklad zápisu nejde složit.' };
  const strany = {}, zdrojCeny = {};
  for (const strana of ['ock', 'proj']) {
    const sv = pod.strany && pod.strany[strana];
    if (!sv) continue;
    const s = { hodnoty: sv.hodnoty || {}, rucne: sv.rucne || {}, mena: 'CZK' };
    if (strana === 'ock') s.atyp = sv.atyp === true;
    if (strana === 'proj' && typeof sv.kalendar === 'string') s.kalendar = sv.kalendar;
    /* PD2 Platba 1–8 (U7): částky ze snímku plánu prodané varianty (pdnPlatby). */
    if (strana === 'proj' && sv.platby && typeof sv.platby === 'object') {
      s.platby = sv.platby;
      s.platbyMimo = Array.isArray(sv.platbyMimo) ? sv.platbyMimo : [];
    }
    let cena = typeof sv.cena === 'number' && isFinite(sv.cena) ? sv.cena : null;
    zdrojCeny[strana] = 'nabidka';
    if (strana === 'ock' && typeof G.ctrlCenaDilaSod === 'function') {
      const sod = G.ctrlCenaDilaSod(p.v);
      if (typeof sod === 'number' && isFinite(sod) && sod > 0) { cena = sod; zdrojCeny.ock = 'sod'; }
    }
    if (cena !== null) s.cena = Math.round(cena * 100) / 100;
    strany[strana] = s;
  }
  if (!Object.keys(strany).length) return { chyba: 'Zakázka nemá stranu OCK ani PROJ, ze které by se dalo zapisovat.' };
  return { strany, varianta: p.v, zdrojCeny };
}

/* Hodnota pole jako srovnatelný klíč: volba podle id, vícevýběr bez pořadí,
 * částka { value, currency }, uživatel / volba jako objekt { id }, číslo
 * jako číslo („14“ = 14), prázdné = ''. */
export function pdProdejKlic(x) {
  if (x === null || x === undefined || x === '') return '';
  if (Array.isArray(x)) return x.length ? JSON.stringify(x.map(pdProdejKlic).sort()) : '';
  if (typeof x === 'object') {
    if (x.value !== undefined && x.currency !== undefined)
      return JSON.stringify([Number(x.value), String(x.currency || '').toUpperCase()]);
    if (x.id !== undefined) return pdProdejKlic(x.id);
    if (x.value !== undefined) return pdProdejKlic(x.value);
    return JSON.stringify(x);
  }
  if (typeof x === 'number') return isFinite(x) ? String(x) : '';
  if (typeof x === 'boolean') return String(x);
  const t = String(x).trim();
  return /^-?\d+(?:\.\d+)?$/.test(t) ? String(Number(t)) : t;
}

/* Jen změněná pole (#115: PATCH je částečná aktualizace — posílá se jen to,
 * co se proti dealu opravdu mění). `patch` = tělo z pdZamyslenyZapis,
 * `deal` = deal z Pipedrive. Vrací { patch: {...} | null, klice: [hash…],
 * hodnota: bool, faze: bool }. Status se nikdy neposílá (#545) — kdyby
 * v těle byl, vyhodí se. */
export function pdProdejZmeny(patch, deal) {
  if (!patch || typeof patch !== 'object') return { patch: null, klice: [], hodnota: false, faze: false };
  const d = deal || {};
  const cf = (d.custom_fields && typeof d.custom_fields === 'object') ? d.custom_fields : {};
  const out = {}, klice = [];
  for (const [k, v] of Object.entries(patch.custom_fields || {})) {
    if (pdProdejKlic(v) !== pdProdejKlic(cf[k])) { (out.custom_fields = out.custom_fields || {})[k] = v; klice.push(k); }
  }
  let hodnota = false;
  if (patch.value !== undefined && (pdProdejKlic({ value: patch.value, currency: patch.currency || '' })
      !== pdProdejKlic({ value: d.value == null ? NaN : d.value, currency: d.currency || '' }))) {
    out.value = patch.value; if (patch.currency !== undefined) out.currency = patch.currency; hodnota = true;
  }
  let faze = false;
  if (patch.stage_id !== undefined && Number(patch.stage_id) !== Number(d.stage_id)) { out.stage_id = patch.stage_id; faze = true; }
  return { patch: Object.keys(out).length ? out : null, klice, hodnota, faze };
}

/* Vlastník dealu podle čísla nabídky v dealu (#115 varianta B, J. V. 27. 10.):
 * prázdné CN = volný deal; shodné s číslem zakázky (bez přípony varianty
 * „.2“, s písmenem zákazníka podle pdWebhookCisloSedi) = náš; jiné = cizí. */
export function pdProdejCnSedi(cisloZakazky, cnDealu, zak) {
  const cn = String(cnDealu == null ? '' : cnDealu).trim();
  if (!cn) return true;
  if (!String(cisloZakazky == null ? '' : cisloZakazky).trim()) return false;
  if (pdWebhookCisloSedi(cisloZakazky, cn, zak)) return true;
  const v = pdWebhookCisloVarianta(cn);
  return v.pripona > 0 && pdWebhookCisloSedi(cisloZakazky, v.zaklad, zak);
}

/* Otisk toho, co obchodník v náhledu potvrdil: deal, jeho update_time
 * (souběh — kdokoli deal mezitím změnil, otisk nesedí), přesné tělo PATCH
 * a cizí číslo nabídky. Zápis otisk spočítá znovu a bez shody nezapíše. */
export function pdProdejOtisk(dealId, updateTime, patch, cizi) {
  const t = JSON.stringify({ d: String(dealId), u: String(updateTime || ''), p: patch || null, c: String(cizi || '') });
  return createHash('sha256').update(t).digest('hex').slice(0, 32);
}

/* Řádky náhledu označí, co odejde: `posle` (změna proti dealu) / `bezeZmeny`. */
export function pdProdejOznacRadky(radky, mapa, zmeny) {
  const zmenena = new Set(zmeny.klice || []);
  return (radky || []).filter((r) => r && r.klic !== 'poznamkaSachty' && r.klic !== 'poznamkaZakaznici').map((r) => {
    const x = Object.assign({}, r);
    let posle = false;
    if (r.stav === 'zapise') {
      if (r.klic === 'hodnotaDealu') posle = !!zmeny.hodnota;
      else if (r.klic === 'fazeDealu') posle = !!zmeny.faze;
      else posle = !!(mapa && mapa[r.klic] && zmenena.has(mapa[r.klic]));
    }
    x.posle = posle;
    x.bezeZmeny = r.stav === 'zapise' && !posle;
    return x;
  });
}

/* Stav zápisu do záznamu prodeje (v.prodano.pipedrive). `prevzeti` = zahájené
 * převzetí dealu { od: cizí CN, kdy } (revize PV S1) — zapisuje se PŘED PATCH
 * a drží se, dokud zápis neskončí „zapsano“ (pak se doplní poznámka k dealu). */
export function pdProdejStavZaznam(stav, duvod, kdy = new Date().toISOString(), prevzeti = null) {
  const o = { stav, kdy };
  if (stav === 'chyba') o.duvod = String(duvod || 'zápis se nepovedl').replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, PD_PRODEJ_DUVOD_MAX);
  if (prevzeti && stav !== 'zapsano') o.prevzeti = { od: String(prevzeti.od || '').replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 120),
    kdy: String(prevzeti.kdy || kdy).slice(0, 40) };
  return o;
}

/* Zahájené a nedokončené převzetí z uloženého záznamu prodeje, nebo null. */
export function pdProdejPrevzetiCeka(prodano) {
  const p = prodano && prodano.pipedrive && prodano.pipedrive.prevzeti;
  return p && typeof p === 'object' && typeof p.od === 'string' && p.od ? { od: p.od, kdy: String(p.kdy || '') } : null;
}

/* Do záznamu prodeje a protokolu jdou jen VLASTNÍ pevné věty (revize PV S4):
 * text chyby z Pipedrive může opakovat odeslanou hodnotu (jméno, e-mail
 * uživatelského pole). Surový text jde nejvýš v odpovědi tomu, kdo zapisoval. */
export function pdProdejChybaVeta(e) {
  const st = e && Number(e.stav);
  if (st === 400 || st === 422) return 'Pipedrive zápis odmítl (neplatná hodnota pole).';
  if (st === 401) return 'Pipedrive odmítl přístupový token.';
  if (st === 402) return 'Účet Pipedrive není aktivní.';
  if (st === 403) return 'Pipedrive přístup odmítl (archivovaný deal?).';
  if (st === 404) return 'Pipedrive deal zakázky nezná (smazaný?).';
  if (st === 429) return 'Pipedrive dočasně omezil počet požadavků — zkuste to za chvíli.';
  if (st === 504) return 'Pipedrive neodpověděl včas — zápis se nemusel dokončit; zkuste zápis znovu, náhled ukáže stav dealu.';
  if (st === 503) return 'Zápis do Pipedrive je vypnutý nebo nenastavený.';
  if (st >= 500) return 'Pipedrive momentálně neodpovídá — zkuste to za chvíli.';
  return 'Zápis do Pipedrive se nepovedl.';
}

/* Text poznámky k dealu při převzetí (#115 bod 4): kdo, kdy, z jaké zakázky —
 * prostý text (escapuje volající přes pdPoznamkaObsah), bez e-mailu. */
export function pdProdejPrevzetiText(cisloNove, cisloDrive, kdo, kdy) {
  const t = (x) => String(x == null ? '' : x).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 120);
  const den = String(kdy || '').slice(0, 10).split('-').reverse().map((x) => String(+x)).join('. ');
  return 'Deal převzat nabídkou ' + t(cisloNove) + ' (dříve ' + t(cisloDrive) + ') — ' + (t(kdo) || 'uživatel kalkulátoru')
    + ', ' + den + ' (kalkulátor, zápis prodeje)';
}
