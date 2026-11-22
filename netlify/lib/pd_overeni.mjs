/* ============================================================
 * PATŘÍ DEAL ZAKÁZCE? (B235/B236, audit 20. 11. 2026; J. V. 21. 11. 2026)
 *
 * Deal, do kterého server zapisuje (poznámka šachet / zákazníků, organizace
 * vítěze), určuje pole `pdDealId` zakázky — a to smí zadat autor zakázky.
 * Do BZ server nic neověřoval: obchodník zapsal poznámku do libovolného
 * dealu firmy (B235) a akcí `vitez` přepojil organizaci cizího dealu (B236).
 *
 * Teď se před ZÁPISEM ověří, že deal opravdu patří zakázce, jedním z pravidel,
 * která už aplikace zná (návrh čočky IN):
 *   1. živá vazba z webhooku (pdVazbaWebhook) právě na tento deal — vazbu
 *      založilo CRM samo (pd_webhook.mjs, #553), ne obchodník;
 *   2. pole „Odkaz na kalkulaci" v dealu míří na tuto zakázku (pdWebhookOdkaz);
 *   3. číslo nabídky v dealu (pole „Číslo nabídky (CN)", jinak z názvu dealu) sedí s číslem
 *      zakázky, ze kterého je klíč jejího souboru (revize R4) — totéž pravidlo jako webhook (pdWebhookCisloSedi), ale obě
 *      čísla musí být neprázdná.
 * Jinak se nezapisuje nic (stav „neověřeno"). Čte se jen deal (GET).
 * ============================================================ */
import { pdHodnota, pdCisloZNazvu } from './pd_mapa.mjs';
import { pdWebhookCisloSedi, pdWebhookCisloKlic, pdWebhookHlavicka } from './pd_webhook.mjs';
import { pdVazbaZiva } from './pd_vazba.mjs';

export const PD_DEAL_NEPATRI = 'Deal v Pipedrive nepatří této zakázce (číslo nabídky ani odkaz na kalkulaci v dealu nesedí '
  + 's touto zakázkou) — do dealu se nic nezapsalo. Zkontrolujte číslo obchodního případu v Controllingu.';

/* Vrací { ok: true, zdroj: 'vazba'|'odkaz'|'cislo' } nebo { ok: false, duvod }.
 * `zavolej(cesta)` = čtení Pipedrive (s časovou mezí volajícího),
 * `poleMapa()` = mapa polí (pd_pole.mjs), `odkaz` = odkaz na tuto kalkulaci
 * (pdWebhookOdkaz(soubor, req)) nebo ''. Chyba čtení (PdChyba) se propouští. */
export async function pdDealPatriZakazce(zak, dealId, { zavolej, poleMapa, odkaz = '' } = {}, G = globalThis) {
  const id = String(dealId || '');
  if (!/^[1-9][0-9]{0,11}$/.test(id) || !zak || typeof zak !== 'object') return { ok: false, duvod: PD_DEAL_NEPATRI };
  const norm = (x) => (typeof G.ctrlPdDealIdNorm === 'function' ? G.ctrlPdDealIdNorm(x) : String(x || '')) || '';
  const vazba = pdVazbaZiva(zak, norm);
  if (vazba && String(vazba.deal) === id) return { ok: true, zdroj: 'vazba' };
  if (typeof zavolej !== 'function' || typeof poleMapa !== 'function') return { ok: false, duvod: PD_DEAL_NEPATRI };
  const pole = await poleMapa();
  const mapa = (pole && pole.mapa) || {};
  const d = await zavolej('/api/v2/deals/' + Number(id));
  if (!d || typeof d !== 'object') return { ok: false, duvod: PD_DEAL_NEPATRI };
  const cf = (d.custom_fields && typeof d.custom_fields === 'object') ? d.custom_fields : {};
  if (odkaz && mapa.odkazKalkulace && pdHodnota(cf[mapa.odkazKalkulace]).trim() === odkaz) return { ok: true, zdroj: 'odkaz' };
  /* Pole CN, jinak číslo z názvu dealu (`CN-84 …`) — totéž jako webhook (pdWebhookZadani). */
  const cnDealu = (mapa.cisloNabidky ? pdHodnota(cf[mapa.cisloNabidky]).trim() : '') || pdCisloZNazvu(d.title);
  /* Revize Fable R4: jen číslo, ze kterého je KLÍČ SOUBORU zakázky (uloJmenoSouboru:
   * číslo OCK, jinak číslo PROJ) — to cizí zakázce nepatří (kolize 409).
   * Číslo PROJ vedle čísla OCK autor volně přepisuje, proto se nepočítá. */
  const cislo = String(((G.uloCisloVyplneno ? G.uloCisloVyplneno(zak.cislo) : String(zak.cislo || '').trim())
    ? zak.cislo : pdWebhookHlavicka(JSON.parse(JSON.stringify(zak)), 'proj').cislo) || '').trim();
  if (cnDealu && pdWebhookCisloKlic(cislo) && pdWebhookCisloSedi(cislo, cnDealu, zak)) return { ok: true, zdroj: 'cislo' };
  return { ok: false, duvod: PD_DEAL_NEPATRI };
}
