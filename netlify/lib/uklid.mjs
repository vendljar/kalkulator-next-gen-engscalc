/* NOČNÍ ÚKLID ÚLOŽIŠŤ (dávka H1, 18. 10. 2026 — nálezy B174 a B175).
 *
 * Volá ho noční otisk (functions/zaloha_nocni.mjs) po pořízení zálohy; chyba
 * úklidu zálohu neohrozí (volající ji zachytí a jen vrátí v odpovědi).
 *
 * B174 — `pd_cache`: detail obchodního případu (`deal:<id>`) nese jména,
 * e-maily a telefony kontaktů z Pipedrive, seznam (`dealy:<stav>`) názvy
 * případů a počítadlo stropu (`strop:<email>`) e-mail uživatele. Cache platí
 * 90 s a strop hodinu, záznamy ale zůstávaly v Blobs napořád. Úklid smaže
 * záznam starší než PD_CACHE_UKLID_DNU dní (výchozí volba dávky H1: 30 dní —
 * rezerva na dohledání „co Pipedrive vrátil" při reklamaci, a přitom žádná
 * osobní data na neurčito) a záznam, u kterého stáří nejde zjistit.
 *
 * B175 — analytika: klíče prvků z doby před v15.10.2 mohou nést zbytek
 * argumentu volání (jméno zákazníka). Server je od dávky H1 při zápisu
 * čistí (analytikaKlicOrez), uložené dny jednou projde tahle očista
 * a přepíše jen ty, které ji potřebují. Hotový průchod si zapíše značku
 * `ocista-b175`, další noci už dny nečte. */
import { uloziste } from './sdilene.mjs';
import { jadro } from './jadro.mjs';
import { PD_CACHE_ULOZISTE } from './pipedrive.mjs';

export const PD_CACHE_UKLID_DNU = 30;
const DEN_MS = 24 * 3600 * 1000;
export const ANALYTIKA_OCISTA_ZNACKA = 'ocista-b175';

/* Čas pořízení záznamu cache podle druhu klíče; null = nejde zjistit. */
function pdCacheKdy(klic, z) {
  if (!z || typeof z !== 'object') return null;
  const t = klic.startsWith('strop:') ? +z.od : +z.poridano;
  return isFinite(t) && t > 0 ? t : null;
}

/* Vrací { prohledano, smazano }. */
export async function pdCacheUklid(ted = Date.now()) {
  const s = await uloziste(PD_CACHE_ULOZISTE);
  let prohledano = 0, smazano = 0;
  for (const klic of await s.seznam()) {
    prohledano++;
    let z = null;
    try { z = await s.cti(klic); } catch (e) { z = null; }
    const kdy = pdCacheKdy(klic, z);
    if (kdy !== null && ted - kdy <= PD_CACHE_UKLID_DNU * DEN_MS) continue;
    await s.smaz(klic);
    smazano++;
  }
  return { prohledano, smazano };
}

/* Vrací { preskoceno } nebo { dnu, ocisteno }. */
export async function analytikaOcista() {
  const s = await uloziste('analytika');
  if (await s.cti(ANALYTIKA_OCISTA_ZNACKA)) return { preskoceno: true };
  await jadro();
  const g = globalThis;
  let dnu = 0, ocisteno = 0;
  for (const klic of await s.seznam('den/')) {
    dnu++;
    const novy = g.analytikaDenOcisti(await s.cti(klic));
    if (!novy) continue;
    await s.zapis(klic, novy);
    ocisteno++;
  }
  await s.zapis(ANALYTIKA_OCISTA_ZNACKA, { kdy: new Date().toISOString(), dnu, ocisteno });
  return { dnu, ocisteno };
}

/* Obojí; chyba jedné části nezastaví druhou. */
export async function nocniUklid(ted = Date.now()) {
  const v = {};
  try { v.pdCache = await pdCacheUklid(ted); } catch (e) { v.pdCache = { chyba: String(e && e.message || e) }; }
  try { v.analytika = await analytikaOcista(); } catch (e) { v.analytika = { chyba: String(e && e.message || e) }; }
  return v;
}
