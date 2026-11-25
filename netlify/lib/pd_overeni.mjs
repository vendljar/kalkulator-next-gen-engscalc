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
 *   1. vazba z webhooku (pdVazbaWebhook) právě na tento deal — POTVRZENÁ
 *      („V pořádku“), nebo u zakázky, kterou webhook sám založil (RJ N1:
 *      „ceka“ nestačí; pd_vazba.mjs pdVazbaDokladaZapis);
 *   2. pole „Odkaz na kalkulaci" v dealu míří na tuto zakázku (pdWebhookOdkaz) —
 *      ale ne u nepotvrzené vazby „ceka“ na týž deal (odkaz zapsal webhook sám)
 *      ani u dealu odmítnutého / se zrušenou vazbou (RJ R2);
 *   (3. číslo nabídky v dealu — ZRUŠENO v RJ, rozhodnutí J. V. 22. 11. 2026, #704-7:
 *      novou zakázkou s klíčem = číslem cizího dealu šlo zapsat do cizího dealu;
 *      číslo nabídky si autor zakázky volí sám, vazbu tedy nedokládá.)
 * Jinak se nezapisuje nic (stav „neověřeno"). Čte se jen deal (GET).
 * ============================================================ */
import { pdHodnota } from './pd_mapa.mjs';
import { pdVazbaDokladaZapis, pdVazbaZiva, pdVazbaNorm, pdOdmitnuto } from './pd_vazba.mjs';

export const PD_DEAL_NEPATRI = 'Deal v Pipedrive nepatří této zakázce (zakázka nemá vazbu z Pipedrive na tento deal '
  + 'a pole „Odkaz na kalkulaci" v dealu nemíří na tuto zakázku) — do dealu se nic nezapsalo. '
  + 'Zkontrolujte číslo obchodního případu v Controllingu, nebo v dealu vyplňte odkaz na kalkulaci.';

export const PD_DEAL_CEKA = 'Vazba zakázky na deal v Pipedrive čeká na potvrzení „V pořádku“ (navázal ji webhook) — '
  + 'do dealu se nic nezapsalo. Vazbu potvrďte v liště zakázky, nebo ji označte jako chybnou.';

export const PD_DEAL_ZRUSENO = 'Vazba zakázky na tento deal v Pipedrive byla zrušena (deal je u kalkulace odmítnutý) — '
  + 'odkaz v dealu ji nedokládá, do dealu se nic nezapsalo.';

/* Vrací { ok: true, zdroj: 'vazba'|'odkaz' } nebo { ok: false, duvod }.
 * `zavolej(cesta)` = čtení Pipedrive (s časovou mezí volajícího),
 * `poleMapa()` = mapa polí (pd_pole.mjs), `odkaz` = odkaz na tuto kalkulaci
 * (pdWebhookOdkaz(soubor, req)) nebo ''. Chyba čtení (PdChyba) se propouští. */
export async function pdDealPatriZakazce(zak, dealId, { zavolej, poleMapa, odkaz = '' } = {}, G = globalThis) {
  const id = String(dealId || '');
  if (!/^[1-9][0-9]{0,11}$/.test(id) || !zak || typeof zak !== 'object') return { ok: false, duvod: PD_DEAL_NEPATRI };
  const norm = (x) => (typeof G.ctrlPdDealIdNorm === 'function' ? G.ctrlPdDealIdNorm(x) : String(x || '')) || '';
  const vazba = pdVazbaDokladaZapis(zak, norm);   // RJ N1: „ceka“ nestačí
  if (vazba && String(vazba.deal) === id) return { ok: true, zdroj: 'vazba' };
  /* RJ N1: nepotvrzená vazba z webhooku na TENTO deal zastaví zápis i s odkazem
   * v dealu — odkaz tam zapsal sám webhook při navázání, vazbu tedy nedokládá. */
  const ziva = pdVazbaZiva(zak, norm);
  if (ziva && String(ziva.deal) === id && ziva.stav === 'ceka') return { ok: false, duvod: PD_DEAL_CEKA };
  /* RJ R2 (revize Fable 22. 11. 2026): deal, jehož vazbu u zakázky někdo zrušil
   * (pdDealyOdmitnute / vazba „zruseno“), odkaz v dealu nedoloží — mazání odkazu
   * při zrušení může selhat (chyba, časová mez, strop) a odkaz od webhooku by pak
   * po novém připojení dealu pustil zápis. */
  const vz = pdVazbaNorm(zak.pdVazbaWebhook);
  if (pdOdmitnuto(zak, id) || (vz && vz.deal === id && vz.stav === 'zruseno')) return { ok: false, duvod: PD_DEAL_ZRUSENO };
  if (typeof zavolej !== 'function' || typeof poleMapa !== 'function') return { ok: false, duvod: PD_DEAL_NEPATRI };
  const pole = await poleMapa();
  const mapa = (pole && pole.mapa) || {};
  const d = await zavolej('/api/v2/deals/' + Number(id));
  if (!d || typeof d !== 'object') return { ok: false, duvod: PD_DEAL_NEPATRI };
  const cf = (d.custom_fields && typeof d.custom_fields === 'object') ? d.custom_fields : {};
  /* PV N3 (#752): přečtený deal se vrací — volající ho nečte podruhé. */
  if (odkaz && mapa.odkazKalkulace && pdHodnota(cf[mapa.odkazKalkulace]).trim() === odkaz) return { ok: true, zdroj: 'odkaz', deal: d };
  return { ok: false, duvod: PD_DEAL_NEPATRI };
}
