/* ============================================================
 * VAZBA KALKULACE NA DEAL Z WEBHOOKU A OPRAVA ORGANIZACE (K40c #581,
 * rozhodnutí J. V. 11. 11. 2026, meze B208–B209, oddíl PW #553)
 *
 * Čistá logika bez sítě, kterou sdílí functions/pd_webhook.mjs,
 * functions/pd_vazba.mjs (V pořádku / Zrušit vazbu / Vazba je chybná),
 * functions/pd_organizace.mjs (Opravit firmu v Pipedrive) a uložení zakázky
 * (lib/zakazka_kontrola.mjs — pole psaná jen serverem).
 *
 *   zak.pdVazbaWebhook = { deal, kdy, cislo, strana, stav, ares, icoOtisk,
 *                          aresRozdily: [...], doplneno: [...], zanikla?,
 *                          nahlaseno?: { kdo, kdy } }
 *     stav: 'ceka'      webhook navázal EXISTUJÍCÍ kalkulaci (čeká na „V pořádku“),
 *           'potvrzeno' člověk vazbu potvrdil,
 *           'webhook'   kalkulaci webhook založil (nebo vazba starší než K40c),
 *           'zruseno'   vazbu zrušil autor nebo administrátor (pojistka).
 *     ares: '' | 'ok' | 'neplatne' | 'nenalezeno' | 'vypadek' (poslední dotaz).
 *   zak.pdDealyOdmitnute = ['123', …]  — dealy, které webhook u této
 *     kalkulace už nesmí navázat (409 před jakýmkoli zápisem), strop 50.
 *
 * Obě pole píše JEN server: při běžném uložení (i obnově ze souboru) se berou
 * z uložené verze, mění je jen výslovná akce. Údaje doplněné webhookem se
 * zrušením vazby nevracejí (rozhodnutí J. V. 11. 11.).
 * ============================================================ */
import { PD_WEBHOOK_AUTOR } from './pd_webhook.mjs';
import { aresIcoNorm, aresIcoPlatne, aresText } from './ares_server.mjs';

export const PD_VAZBA_STAVY = ['ceka', 'potvrzeno', 'webhook', 'zruseno'];
export const PD_ODMITNUTE_MAX = 50;
export const PD_VAZBA_POLE = ['nazevAkce', 'adresa', 'objednatel', 'adresaObjednatele', 'ico', 'dic', 'kontakt', 'terminPredani'];
export const PD_ORG_POLE = ['nazev', 'adresa', 'dic'];
export const PD_ORG_POPIS = { nazev: 'Název organizace', adresa: 'Adresa organizace', dic: 'DIČ organizace' };
export const PD_POLE_POPIS = { nazevAkce: 'název akce', adresa: 'adresa stavby', objednatel: 'zákazník',
  adresaObjednatele: 'sídlo zákazníka', ico: 'IČO', dic: 'DIČ', kontakt: 'kontakt', terminPredani: 'termín předání (krycí list)' };

const ID = /^[1-9][0-9]{0,9}$/;
const KDY = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const txt = (x, max) => (typeof x === 'string' ? x.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '');
const seznam = (x, povolene) => (Array.isArray(x) ? [...new Set(x.filter((k) => typeof k === 'string' && povolene.includes(k)))] : []);

/* Čistý tvar (whitelist) — cizí pole ani `__proto__` neprojdou. null = nic. */
export function pdVazbaNorm(x) {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
  const deal = String(x.deal == null ? '' : x.deal);
  if (!ID.test(deal) || !PD_VAZBA_STAVY.includes(x.stav)) return null;
  const v = { deal, kdy: KDY.test(String(x.kdy || '')) ? x.kdy : '', cislo: txt(x.cislo, 80),
    strana: x.strana === 'proj' ? 'proj' : 'ock', stav: x.stav,
    ares: ['ok', 'neplatne', 'nenalezeno', 'vypadek'].includes(x.ares) ? x.ares : '',
    icoOtisk: /^[0-9a-f]{16}$/.test(String(x.icoOtisk || '')) ? x.icoOtisk : '',
    aresRozdily: seznam(x.aresRozdily, PD_ORG_POLE), doplneno: seznam(x.doplneno, PD_VAZBA_POLE) };
  if (x.zanikla === true) v.zanikla = true;
  if (x.icoShoda === true) v.icoShoda = true;   // IČO organizace dealu = IČO hlavičky (zhasíná tlačítko opravy; rozhoduje server)
  const n = x.nahlaseno;
  if (n && typeof n === 'object' && !Array.isArray(n) && typeof n.kdo === 'string' && KDY.test(String(n.kdy || '')))
    v.nahlaseno = { kdo: txt(n.kdo, 200), kdy: n.kdy };
  return v;
}

export function pdOdmitnuteNorm(x) {
  return Array.isArray(x) ? [...new Set(x.map((d) => String(d == null ? '' : d)).filter((d) => ID.test(d)))].slice(-PD_ODMITNUTE_MAX) : [];
}

/* Deal je u této kalkulace odmítnutý (zrušená vazba). */
export function pdOdmitnuto(zak, dealId) {
  return pdOdmitnuteNorm(zak && zak.pdDealyOdmitnute).includes(String(dealId));
}

/* Vazba z webhooku je živá: má tvar, není zrušená a deal zakázky je pořád týž. */
export function pdVazbaZiva(zak, normDeal) {
  const v = pdVazbaNorm(zak && zak.pdVazbaWebhook);
  const n = typeof normDeal === 'function' ? normDeal : (x) => String(x == null ? '' : x).trim();
  return !!v && v.stav !== 'zruseno' && (n(zak.pdDealId) || '') === v.deal ? v : null;
}

/* Kdo smí vazbu zrušit, měnit deal a opravit firmu v Pipedrive: administrátor,
 * nebo autor zakázky — `autor` z ULOŽENÉ verze = e-mail relace. Zakázka
 * založená webhookem (autor pipedrive-webhook) jen administrátor. */
export function pdVazbaSmiMenit(ulozena, relace) {
  const r = relace || {};
  if (r.role === 'Administrátor') return true;
  const autor = String((ulozena && ulozena.autor) || '').trim().toLowerCase();
  const ja = String(r.email || '').trim().toLowerCase();
  return !!autor && !!ja && autor !== PD_WEBHOOK_AUTOR && autor === ja;
}

/* POLE PSANÁ JEN SERVEREM při uložení zakázky (vzor uloZamekRazitkaDrz /
 * interní poznámky): z uložené verze, klientské hodnoty se zahodí. Obnova
 * ze souboru je nepřebírá (zůstane stav databáze); obnova z otisku (záloha
 * serveru, klient ji upravit nemůže) je bere ze zálohy, jen v čistém tvaru. */
export function pdVazbaDrz(stara, zak, volby = {}) {
  if (!zak || typeof zak !== 'object') return;
  const zOtisku = volby.obnova === true && volby.zeSouboru !== true;
  const zdroj = zOtisku ? zak : stara;
  const v = pdVazbaNorm(zdroj && zdroj.pdVazbaWebhook);
  const o = pdOdmitnuteNorm(zdroj && zdroj.pdDealyOdmitnute);
  if (v) zak.pdVazbaWebhook = v; else delete zak.pdVazbaWebhook;
  if (o.length) zak.pdDealyOdmitnute = o; else delete zak.pdDealyOdmitnute;
}

/* Zápis rejstříku zakázek jedním záznamem (vzor functions/zakazky.mjs, K7-S1). */
export async function pdRejstrikZapis(s, ULO, vyhradne, zak, jmeno, razitko, kdo) {
  await vyhradne('zakazky/_rejstrik', async () => {
    const rej = (await s.cti('_rejstrik')) || { schema: 1, zakazky: [] };
    const novy = ULO.uloRejstrikSloucit(Array.isArray(rej.zakazky) ? rej.zakazky : [],
      ULO.uloRejstrikZaznam(zak, { soubor: jmeno, razitko }));
    await s.zapis('_rejstrik', { schema: 1, zakazky: ULO.uloRejstrikSerad(novy), kdo: kdo || PD_WEBHOOK_AUTOR,
      upraveno: new Date().toISOString() });
  });
}

/* Záznam do protokolu zakázky (jen názvy polí, nikdy kontakty). */
export function pdProtokol(zak, kdo, co) {
  const f = globalThis.protokolZapis;
  if (typeof f === 'function') f(zak, { kdo: String(kdo || ''), kde: 'Pipedrive', co: String(co).slice(0, 600) });
  else {   // pojistka bez modulu protokolu (nemá nastat — jádro ho načítá)
    if (!Array.isArray(zak.protokol)) zak.protokol = [];
    zak.protokol.push({ id: 'p' + Date.now().toString(36), kdy: new Date().toISOString(), kdo: String(kdo || ''), kde: 'Pipedrive', co: String(co).slice(0, 600) });
  }
}
export const pdPoleText = (klice) => (klice || []).map((k) => PD_POLE_POPIS[k] || k).join(', ');
export const pdOrgText = (klice) => (klice || []).map((k) => PD_ORG_POPIS[k] || k).join(', ');

/* SHODA IČO (B209, slučitelnost s víc zákazníky v zakázce): organizace dealu
 * a hlavička zakázky musí mít totéž platné IČO (mezery a úvodní nuly
 * nerozhodují). Jinak se z ARES nečte ani do Pipedrive nezapisuje (409). */
export function pdIcoShoda(icoOrg, icoHlavicky) {
  const o = aresIcoNorm(icoOrg), h = aresIcoNorm(icoHlavicky);
  if (!String(icoOrg == null ? '' : icoOrg).trim()) return { ok: false, duvod: 'Organizace dealu v Pipedrive nemá IČ — opravu firmy nejde ověřit.' };
  if (!String(icoHlavicky == null ? '' : icoHlavicky).trim()) return { ok: false, duvod: 'Hlavička zakázky nemá IČO — opravu firmy nejde ověřit.' };
  if (!aresIcoPlatne(o) || !aresIcoPlatne(h)) return { ok: false, duvod: 'IČO organizace nebo hlavičky neprojde kontrolní číslicí — firma se v Pipedrive neopravuje.' };
  if (o !== h) return { ok: false, duvod: 'IČO organizace dealu (' + o + ') se liší od IČO v hlavičce zakázky (' + h + ') — firma se v Pipedrive neopravuje.' };
  return { ok: true, ico: o };
}

/* Hodnoty organizace z API v2 (jen řetězce). */
export function pdOrgHodnoty(org, mapaOrg, pdHodnota) {
  const o = org || {};
  const cf = o.custom_fields || {};
  const adr = o.address && typeof o.address === 'object' ? o.address.value : o.address;
  const dicHash = mapaOrg && mapaOrg.dic;
  return { nazev: aresText(typeof o.name === 'string' ? o.name : '', 300), adresa: aresText(typeof adr === 'string' ? adr : '', 400),
    dic: dicHash ? aresText(pdHodnota(cf[dicHash]), 40) : '', maDic: !!dicHash };
}

/* Rozdíly organizace × ARES jen pro pole, která umíme zapsat. Prázdná hodnota
 * z ARES nic nemaže. `dicChybi` = účet pole DIČ nemá (oprava ho přeskočí). */
export function pdOrgRozdily(orgHodnoty, subjekt) {
  const h = orgHodnoty || {};
  const s = subjekt || {};
  const nove = { nazev: s.nazev || '', adresa: s.adresa || '', dic: s.dic || '' };
  const rozdily = [];
  for (const k of PD_ORG_POLE) {
    if (k === 'dic' && !h.maDic) continue;
    const n = String(nove[k] || '').trim(), t = String(h[k] || '').trim();
    if (n && n !== t) rozdily.push({ klic: k, label: PD_ORG_POPIS[k], ted: t, nove: n });
  }
  return { rozdily, dicChybi: !h.maDic && !!nove.dic };
}

/* Tělo PATCH /api/v2/organizations/<id> jen z vybraných rozdílů. */
export function pdOrgTelo(rozdily, mapaOrg) {
  const t = {};
  for (const r of rozdily || []) {
    if (r.klic === 'nazev') t.name = r.nove;
    else if (r.klic === 'adresa') t.address = { value: r.nove };
    else if (r.klic === 'dic' && mapaOrg && mapaOrg.dic) (t.custom_fields = t.custom_fields || {})[mapaOrg.dic] = r.nove;
  }
  return t;
}
