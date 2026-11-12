/* Vazba kalkulace na deal z webhooku — V pořádku / Zrušit vazbu / Vazba je
 * chybná (K40c #581, rozhodnutí J. V. 11. 11. 2026, oddíl PW #553).
 *
 * POST /api/pd/vazba  { soubor, akce: 'potvrdit' | 'zrusit' | 'chybna', razitko? }
 *   → 200 { ok, akce, soubor, razitko, odkazVDealu?: 'smazano' | 'cizi' | 'prazdne' | 'nezjisteno', varovani: [...] }
 *   400 neplatný požadavek, 401 nepřihlášen, 403 cizí původ / „Zrušit vazbu“
 *   bez práva, 404 zakázka neexistuje, 409 vazba už neplatí / razítko nesedí.
 *
 *   potvrdit  každý přihlášený (právo ukládat má každý účet), jen stav „ceka“,
 *   chybna    každý přihlášený: příznak `nahlaseno = { kdo, kdy }` z relace,
 *             autor a administrátor ho vidí v upozornění a v Přehledu nabídek,
 *   zrusit    jen AUTOR ZAKÁZKY (autor z ULOŽENÉ verze = e-mail relace) nebo
 *             ADMINISTRÁTOR — pojistka proti cizímu dealu (překlep v čísle
 *             nabídky): smaže pdDealId, pdStav, pdZadani a index
 *             pd_webhook/deal:<id>, deal přidá do pdDealyOdmitnute (strop 50;
 *             další webhook dostane 409), z dealu smaže NÁŠ odkaz na kalkulaci
 *             (cizí hodnota zůstane). Doplněné údaje hlavičky a krycího listu
 *             se NEVRACEJÍ (rozhodnutí J. V. 11. 11.). Chyba Pipedrive zrušení
 *             nezastaví — vrátí varování a zapíše se do protokolu.
 * Vše se zapisuje do protokolu zakázky. Zamčené varianty se nemění (vazba je
 * v hlavičce zakázky, mimo data variant). */
import { uloziste, json, vyhradne } from '../lib/sdilene.mjs';
import { jadro, jadroChyba } from '../lib/jadro.mjs';
import { pdPristup, pdNastaveno, pdZavolej, PdChyba, pdStropCerstvych, PD_CACHE_ULOZISTE } from '../lib/pipedrive.mjs';
import { pdHodnota } from '../lib/pd_mapa.mjs';
import { pdPoleMapa } from './pd_pole.mjs';
import { pdWebhookOdkaz, pdWebhookHlavicka, PD_WEBHOOK_ULOZISTE } from '../lib/pd_webhook.mjs';
import {
  pdVazbaNorm, pdVazbaZiva, pdVazbaSmiMenit, pdOdmitnuteNorm, pdRejstrikZapis, pdProtokol, pdPoleText, PD_ODMITNUTE_MAX,
} from '../lib/pd_vazba.mjs';

const SOUBOR_TVAR = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;
const AKCE = ['potvrdit', 'zrusit', 'chybna'];
/* Zrušení sahá do Pipedrive (čtení dealu + PATCH): strop na uživatele (B80 vzor). */
export const PD_VAZBA_MAX = 20;

export default async (req) => {
  const { chyba, relace } = await pdPristup(req, { bezPrava: true });
  if (chyba) return chyba;
  if (req.method !== 'POST') return json({ ok: false, chyba: 'Použijte POST.' }, 405);
  let telo;
  try { telo = JSON.parse((await req.text()) || 'null'); } catch (e) { return json({ ok: false, chyba: 'Neplatný JSON.' }, 400); }
  if (!telo || typeof telo !== 'object' || Array.isArray(telo)) return json({ ok: false, chyba: 'Neplatný požadavek.' }, 400);
  const soubor = typeof telo.soubor === 'string' ? telo.soubor : '';
  const akce = typeof telo.akce === 'string' ? telo.akce : '';
  if (!SOUBOR_TVAR.test(soubor) || !AKCE.includes(akce)) return json({ ok: false, chyba: 'Chybí zakázka nebo akce.' }, 400);
  let ULO;
  try { ({ ULO } = await jadro()); } catch (e) { return jadroChyba(e); }
  const G = globalThis;
  const norm = (x) => G.ctrlPdDealIdNorm(x) || '';
  const s = await uloziste('zakazky');
  const ulozena = await s.cti('z/' + soubor);
  if (!ulozena || typeof ulozena !== 'object') return json({ ok: false, chyba: 'Zakázka nenalezena.' }, 404);
  if (typeof telo.razitko === 'string' && telo.razitko && telo.razitko !== ULO.uloRazitko(ulozena))
    return json({ ok: false, chyba: 'Zakázku mezitím někdo uložil — otevřete ji znovu.' }, 409);
  const vazba = pdVazbaZiva(ulozena, norm);
  if (!vazba) return json({ ok: false, chyba: 'Zakázka nemá živou vazbu na deal z webhooku.' }, 409);
  if (akce === 'potvrdit' && vazba.stav !== 'ceka') return json({ ok: false, chyba: 'Vazba už je potvrzená.' }, 409);
  if (akce === 'zrusit' && !pdVazbaSmiMenit(ulozena, relace))
    return json({ ok: false, chyba: 'Vazbu na deal smí zrušit jen autor zakázky nebo administrátor. Použijte „Vazba je chybná“.' }, 403);

  const kdo = String(relace.jmeno || relace.email || '');
  const varovani = [];
  let odkazVDealu = '';
  const deal = vazba.deal;
  const v = await vyhradne('zakazky/z/' + soubor, async () => {
    const zak = await s.cti('z/' + soubor);
    const ziva = zak && pdVazbaZiva(zak, norm);
    if (!ziva || ziva.deal !== deal) return { odpoved: json({ ok: false, chyba: 'Vazba se mezitím změnila — otevřete zakázku znovu.' }, 409) };
    const nova = pdVazbaNorm(ziva);
    const ted = new Date().toISOString();
    const cislo = String(pdWebhookHlavicka(JSON.parse(JSON.stringify(zak)), nova.strana).cislo || nova.cislo || '');
    if (akce === 'potvrdit') {
      nova.stav = 'potvrzeno';
      pdProtokol(zak, kdo, 'Vazbu na deal ' + deal + ' (číslo nabídky ' + cislo + ') potvrdil („V pořádku“)');
    } else if (akce === 'chybna') {
      /* Revize K40c N4: nahlášenou vazbu nejde nahlásit znovu (protokol by šlo plnit
       * donekonečna) — kontrola ve výhradním úseku, nad čerstvě přečtenou zakázkou. */
      if (nova.nahlaseno) return { odpoved: json({ ok: false, chyba: 'Vazba už je nahlášená jako chybná.' }, 409) };
      nova.nahlaseno = { kdo: String(relace.email || ''), kdy: ted };
      pdProtokol(zak, kdo, 'Vazbu na deal ' + deal + ' nahlásil jako chybnou — rozhodne autor zakázky nebo administrátor');
    } else {
      nova.stav = 'zruseno';
      delete nova.nahlaseno;
      delete zak.pdDealId; delete zak.pdStav; delete zak.pdZadani;
      zak.pdDealyOdmitnute = pdOdmitnuteNorm((zak.pdDealyOdmitnute || []).concat([deal])).slice(-PD_ODMITNUTE_MAX);
      pdProtokol(zak, kdo, 'Vazbu na deal ' + deal + ' zrušil; deal je u kalkulace odmítnutý (webhook ho znovu nenaváže); '
        + 'náš odkaz v dealu se maže po zápisu; údaje doplněné webhookem zůstaly: ' + (pdPoleText(nova.doplneno) || 'žádné'));
    }
    zak.pdVazbaWebhook = nova;
    zak.upravil = String(relace.email || '');
    if (relace.jmeno) zak.upravilJmeno = String(relace.jmeno); else delete zak.upravilJmeno;
    const razitko = ULO.uloRazitkoNove();
    zak.uloRazitko = razitko;
    await s.zapis('z/' + soubor, zak);
    return { zak, razitko };
  });
  if (v.odpoved) return v.odpoved;
  await pdRejstrikZapis(s, ULO, vyhradne, v.zak, soubor, v.razitko, String(relace.email || ''));
  /* ODKAZ V DEALU (jen zrušení): AŽ PO úspěšném zápisu zakázky (revize K40c N3)
   * a jen když v něm je odkaz na TUTO kalkulaci. Chyba Pipedrive zrušení
   * nezastaví — varování a dodatečný záznam v protokolu. */
  if (akce === 'zrusit') {
    odkazVDealu = 'nezjisteno';
    try {
      if (!pdNastaveno()) throw new PdChyba('Napojení na Pipedrive není nastavené.', 503);
      if (!(await pdStropCerstvych(relace.email, 'vazba', PD_VAZBA_MAX))) throw new PdChyba('Strop volání Pipedrive za hodinu.', 429);
      const pole = await pdPoleMapa();
      const hash = pole.mapa.odkazKalkulace;
      if (!hash) throw new PdChyba('V Pipedrive chybí pole „Odkaz na kalkulaci“.', 404);
      const d = await pdZavolej('/api/v2/deals/' + Number(deal));
      const ted = d ? pdHodnota((d.custom_fields || {})[hash]).trim() : '';
      if (!d) odkazVDealu = 'prazdne';
      else if (!ted) odkazVDealu = 'prazdne';
      else if (ted !== pdWebhookOdkaz(soubor, req)) odkazVDealu = 'cizi';
      else {
        await pdZavolej('/api/v2/deals/' + Number(deal), { metoda: 'PATCH', telo: { custom_fields: { [hash]: null } } });
        odkazVDealu = 'smazano';
        try { await (await uloziste(PD_CACHE_ULOZISTE)).smaz('deal:' + deal); } catch (e) { /* cache jen zestárne */ }
      }
    } catch (e) {
      varovani.push('Odkaz v dealu se nepodařilo ověřit ani smazat: ' + ((e instanceof PdChyba) ? e.message : 'chyba spojení')
        + ' Vazba je přesto zrušená — odkaz v Pipedrive případně smažte ručně.');
    }
  }
  if (odkazVDealu === 'nezjisteno' || odkazVDealu === 'cizi') {
    const d2 = await vyhradne('zakazky/z/' + soubor, async () => {
      const zak = await s.cti('z/' + soubor);
      if (!zak) return {};
      pdProtokol(zak, kdo, 'Odkaz v dealu ' + deal + ' ' + (odkazVDealu === 'cizi' ? 'nese jinou hodnotu — ponechán'
        : 'se nepodařilo smazat (chyba Pipedrive) — smažte ho v Pipedrive ručně'));
      const razitko = ULO.uloRazitkoNove();
      zak.uloRazitko = razitko;
      await s.zapis('z/' + soubor, zak);
      return { zak, razitko };
    });
    if (d2.zak) { v.zak = d2.zak; v.razitko = d2.razitko; await pdRejstrikZapis(s, ULO, vyhradne, v.zak, soubor, v.razitko, String(relace.email || '')); }
  }
  if (akce === 'zrusit') {
    const sw = await uloziste(PD_WEBHOOK_ULOZISTE);
    const idx = await sw.cti('deal:' + deal);
    if (idx && idx.soubor === soubor) await sw.smaz('deal:' + deal);
  }
  return json({ ok: true, akce, soubor, razitko: v.razitko, ...(akce === 'zrusit' ? { odkazVDealu } : {}), varovani });
};

export const config = { path: '/api/pd/vazba' };
