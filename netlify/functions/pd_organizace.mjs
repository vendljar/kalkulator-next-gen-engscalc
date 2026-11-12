/* „Opravit firmu v Pipedrive“ podle ARES (K40c #581, rozhodnutí J. V.
 * 11. 11. 2026, mez B209).
 *
 * POST /api/pd/organizace { soubor, akce: 'nahled' }
 *   → 200 { ok, organizace, rozdily: [{ klic, label, ted, nove }], dicChybi, dicVeta }
 * POST /api/pd/organizace { soubor, akce: 'zapis', organizace, pole: ['nazev','adresa','dic'] }
 *   → 200 { ok, zapsano: [klic], razitko }   (zapsano [] = nebylo co zapsat, nic se neposlalo)
 *
 * Kdo: AUTOR ZAKÁZKY (autor z ULOŽENÉ verze = e-mail relace) nebo
 * ADMINISTRÁTOR, a k tomu právo Pipedrive z matice (B80, pdPristup). Ostatní 403.
 *   · klientovi se nevěří nic kromě volby polí: deal bere server z uložené
 *     zakázky, organizaci z dealu, hodnoty z ARES načte sám a rozdíly
 *     spočítá znovu i při zápisu — zapíše jen pole, která klient potvrdil
 *     A která se pořád liší (PATCH jen změněných polí, nic jiného),
 *   · organizace musí patřit dealu navázanému na zakázku (zápis nese id
 *     z náhledu; jiné id = 403),
 *   · SHODA IČO: jen když IČO organizace dealu = IČO hlavičky ULOŽENÉ
 *     zakázky (po normalizaci, platná kontrolní číslice) — jinak 409 a nic
 *     se nečte z ARES ani nezapisuje. Oprava proto nikdy nemění IČ organizace;
 *     zapisuje jen název, adresu a DIČ (to jen, když účet takové pole má —
 *     pole se NIKDY nezakládá, chybějící se přeskočí a dialog to řekne),
 *   · nikdy automaticky, nikdy z webhooku; záznam do protokolu zakázky;
 *     po zápisu se smaže cache detailu dealu. */
import { uloziste, json, vyhradne } from '../lib/sdilene.mjs';
import { jadro, jadroChyba } from '../lib/jadro.mjs';
import { pdPristup, pdNastaveno, pdZavolej, PdChyba, pdStropCerstvych, PD_CACHE_ULOZISTE } from '../lib/pipedrive.mjs';
import { pdHodnota, pdIco } from '../lib/pd_mapa.mjs';
import { pdPoleMapa } from './pd_pole.mjs';
import { pdWebhookHlavicka } from '../lib/pd_webhook.mjs';
import { aresNacti, ARES_SIT } from '../lib/ares_server.mjs';
import {
  pdVazbaNorm, pdVazbaSmiMenit, pdIcoShoda, pdOrgHodnoty, pdOrgRozdily, pdOrgTelo, pdRejstrikZapis, pdProtokol, pdOrgText,
  PD_ORG_POLE,
} from '../lib/pd_vazba.mjs';

const SOUBOR_TVAR = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;
export const PD_ORGANIZACE_MAX = 20;
/* Tvrdý limit jednoho volání Pipedrive (VSD N2 `casLimitMs`), ARES má vlastní 3 s. */
export const PD_ORGANIZACE_CAS_MS = 2500;
export const PD_DIC_VETA = 'DIČ se do Pipedrive nezapíše — organizace takové pole nemá.';

export default async (req) => {
  const { chyba, relace } = await pdPristup(req);
  if (chyba) return chyba;
  if (req.method !== 'POST') return json({ ok: false, chyba: 'Použijte POST.' }, 405);
  let telo;
  try { telo = JSON.parse((await req.text()) || 'null'); } catch (e) { return json({ ok: false, chyba: 'Neplatný JSON.' }, 400); }
  if (!telo || typeof telo !== 'object' || Array.isArray(telo)) return json({ ok: false, chyba: 'Neplatný požadavek.' }, 400);
  const soubor = typeof telo.soubor === 'string' ? telo.soubor : '';
  const akce = telo.akce === 'nahled' || telo.akce === 'zapis' ? telo.akce : '';
  if (!SOUBOR_TVAR.test(soubor) || !akce) return json({ ok: false, chyba: 'Chybí zakázka nebo akce.' }, 400);
  let ULO;
  try { ({ ULO } = await jadro()); } catch (e) { return jadroChyba(e); }
  const G = globalThis;
  const s = await uloziste('zakazky');
  const ulozena = await s.cti('z/' + soubor);
  if (!ulozena || typeof ulozena !== 'object') return json({ ok: false, chyba: 'Zakázka nenalezena.' }, 404);
  if (!pdVazbaSmiMenit(ulozena, relace))
    return json({ ok: false, chyba: 'Firmu v Pipedrive smí opravit jen autor zakázky nebo administrátor.' }, 403);
  const deal = G.ctrlPdDealIdNorm(ulozena.pdDealId) || '';
  if (!deal) return json({ ok: false, chyba: 'Zakázka není navázaná na deal v Pipedrive.' }, 409);
  if (!pdNastaveno()) return json({ ok: false, chyba: 'Napojení na Pipedrive není nastavené.' }, 503);
  if (!(await pdStropCerstvych(relace.email, 'organizace', PD_ORGANIZACE_MAX)))
    return json({ ok: false, chyba: 'Oprava firmy byla za poslední hodinu volána příliš často.' }, 429);

  try {
    const pole = await pdPoleMapa();
    const mapaOrg = pole.mapaOrganizace || {};
    const d = await pdZavolej('/api/v2/deals/' + Number(deal), { casLimitMs: PD_ORGANIZACE_CAS_MS });
    if (!d) return json({ ok: false, chyba: 'Pipedrive deal zakázky nezná.' }, 404);
    if (!d.org_id) return json({ ok: false, chyba: 'K dealu není navázaná organizace.' }, 409);
    const orgId = Number(d.org_id);
    if (akce === 'zapis' && Number(telo.organizace) !== orgId)
      return json({ ok: false, chyba: 'Organizace nepatří dealu navázanému na tuto zakázku.' }, 403);
    const org = await pdZavolej('/api/v2/organizations/' + orgId, { casLimitMs: PD_ORGANIZACE_CAS_MS });
    if (!org) return json({ ok: false, chyba: 'Pipedrive organizaci dealu nezná.' }, 404);
    /* SHODA IČO organizace a hlavičky ULOŽENÉ zakázky (B209). */
    const vazba = pdVazbaNorm(ulozena.pdVazbaWebhook);
    const strana = vazba && vazba.deal === deal ? vazba.strana : 'ock';
    const hl = pdWebhookHlavicka(JSON.parse(JSON.stringify(ulozena)), strana);
    const icoOrg = mapaOrg.ico ? pdIco((org.custom_fields || {})[mapaOrg.ico]) : '';
    const shoda = pdIcoShoda(icoOrg, hl.ico);
    if (!shoda.ok) return json({ ok: false, chyba: shoda.duvod }, 409);
    const a = await aresNacti(shoda.ico, { fetch: ARES_SIT.fetch });
    if (a.stav !== 'ok')
      return json({ ok: false, chyba: { nenalezeno: 'ARES subjekt s tímto IČO nevede.', vypadek: 'ARES teď neodpovídá — zkuste to později.',
        neplatne: 'IČO neprojde kontrolní číslicí.' }[a.stav] || 'ARES neodpověděl.' }, 502);
    const { rozdily, dicChybi } = pdOrgRozdily(pdOrgHodnoty(org, mapaOrg, pdHodnota), a.subjekt);
    if (akce === 'nahled')
      return json({ ok: true, organizace: orgId, rozdily, dicChybi, dicVeta: dicChybi ? PD_DIC_VETA : '' });

    /* ZÁPIS: jen pole potvrzená klientem, která se PO NOVÉM VÝPOČTU pořád liší. */
    const potvrzeno = Array.isArray(telo.pole) ? telo.pole.filter((k) => PD_ORG_POLE.includes(k)) : [];
    const vyber = rozdily.filter((r) => potvrzeno.includes(r.klic));
    if (!vyber.length) return json({ ok: true, zapsano: [], zbyva: rozdily.map((r) => r.klic), dicChybi, dicVeta: dicChybi ? PD_DIC_VETA : '' });
    await pdZavolej('/api/v2/organizations/' + orgId, { metoda: 'PATCH', telo: pdOrgTelo(vyber, mapaOrg), casLimitMs: PD_ORGANIZACE_CAS_MS });
    try { await (await uloziste(PD_CACHE_ULOZISTE)).smaz('deal:' + deal); } catch (e) { /* cache jen zestárne */ }
    const zapsano = vyber.map((r) => r.klic);
    const zbyva = rozdily.filter((r) => !zapsano.includes(r.klic)).map((r) => r.klic);
    const kdo = String(relace.jmeno || relace.email || '');
    const v = await vyhradne('zakazky/z/' + soubor, async () => {
      const zak = await s.cti('z/' + soubor);
      if (!zak) return {};
      pdProtokol(zak, kdo, 'Opravil organizaci dealu ' + deal + ' v Pipedrive podle ARES: ' + pdOrgText(zapsano)
        + (dicChybi ? ' (DIČ přeskočeno — organizace pole DIČ nemá)' : ''));
      const vz = pdVazbaNorm(zak.pdVazbaWebhook);
      if (vz && vz.deal === deal) { vz.aresRozdily = zbyva; zak.pdVazbaWebhook = vz; }
      const razitko = ULO.uloRazitkoNove();
      zak.uloRazitko = razitko;
      await s.zapis('z/' + soubor, zak);
      return { zak, razitko };
    });
    if (v.zak) await pdRejstrikZapis(s, ULO, vyhradne, v.zak, soubor, v.razitko, String(relace.email || ''));
    return json({ ok: true, zapsano, zbyva, razitko: v.razitko || '', dicChybi, dicVeta: dicChybi ? PD_DIC_VETA : '' });
  } catch (e) {
    if (e instanceof PdChyba) return json({ ok: false, chyba: e.message }, (e.stav >= 500 || e.stav === 401) ? 502 : e.stav);
    throw e;
  }
};

export const config = { path: '/api/pd/organizace' };
