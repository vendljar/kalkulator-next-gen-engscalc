/* Mapa vlastních polí Pipedrive (9. 8. 2026, #16).
 *
 * GET /api/pd/pole            → { ok, nastaveno, mapa, popisy, chybi, typNesedi,
 *                                 nejednoznacne, nezarazeno, poridano, … }
 * GET /api/pd/pole?obnovit=1  → totéž, ale s vynuceným dotazem do Pipedrive
 *                               (jen Administrátor)
 *
 * Proč cache: seznam vlastních polí se mění jednou za rok, ale potřebuje ho
 * KAŽDÉ načtení dealu. Obnovení jsou dva dotazy po 10 tokenech (dealFields
 * a organizationFields, x-token-cost ve specifikaci v2), tedy 20 za jedno
 * obnovení — bez cache by pár desítek načtení denně ukrojilo znatelný kus
 * limitu jen za čtení něčeho, co se nemění. Platnost jeden den je kompromis: když se pole
 * v CRM přejmenuje, projeví se to nejpozději zítra a administrátor to umí
 * uspíšit přepínačem `obnovit`. Mapa uložená ve starším tvaru (`verze`) se
 * nepoužije vůbec — po změně párování (21. 10. 2026) by jinak ještě den
 * platila mapa, která tři pole párovala se špatným polem CRM.
 *
 * Odpověď schválně NENESE token ani nic z prostředí — jen názvy polí a jejich
 * hashe, což je informace o tvaru CRM, ne o datech zakázek. */
import { uloziste, json } from '../lib/sdilene.mjs';
import { pdNastaveno, pdZavolej, PdChyba, PD_TOKEN_PROMENNA, PD_DOMENA_PROMENNA,
         pdPristup } from '../lib/pipedrive.mjs';
import { pdMapaZPoli, POLE_DEALU, POLE_ORGANIZACE, PD_POLE_VERZE } from '../lib/pd_mapa.mjs';

const ULOZISTE = 'pipedrive';
const KLIC = 'pole';
export const PLATNOST_MS = 24 * 3600 * 1000;

/* Vrací hotovou mapu i ostatním funkcím (pd_dealy, pd_deal), aby si ji
 * nemusela každá skládat po svém — a hlavně aby cache byla jedna. */
export async function pdPoleMapa(obnovit = false) {
  const s = await uloziste(ULOZISTE);
  const ulozene = await s.cti(KLIC);
  if (!obnovit && ulozene && ulozene.verze === PD_POLE_VERZE
      && (Date.now() - (ulozene.poridano || 0)) < PLATNOST_MS)
    return ulozene;

  const [poleDealu, poleOrg] = await Promise.all([
    pdZavolej('/api/v2/dealFields', { dotaz: { limit: 500 } }),
    pdZavolej('/api/v2/organizationFields', { dotaz: { limit: 500 } }),
  ]);
  const deal = pdMapaZPoli(poleDealu, POLE_DEALU);
  const org = pdMapaZPoli(poleOrg, POLE_ORGANIZACE);
  const cerstve = {
    verze: PD_POLE_VERZE, poridano: Date.now(),
    mapa: deal.mapa, popisy: deal.popisy, chybi: deal.chybi, typNesedi: deal.typNesedi,
    nejednoznacne: deal.nejednoznacne, nezarazeno: deal.nezarazeno,
    mapaOrganizace: org.mapa, popisyOrganizace: org.popisy, chybiOrganizace: org.chybi,
    typNesediOrganizace: org.typNesedi, nejednoznacneOrganizace: org.nejednoznacne,
  };
  await s.zapis(KLIC, cerstve);
  return cerstve;
}

export default async (req) => {
  /* Přihlášení, původ a právo z matice (B80) — lib/pipedrive.mjs. */
  const { chyba, relace } = await pdPristup(req);
  if (chyba) return chyba;

  if (!pdNastaveno())
    return json({ ok: true, nastaveno: false, mapa: {}, chybi: [], typNesedi: [], nejednoznacne: [], nezarazeno: [],
      chyba: 'Napojení na Pipedrive zatím není nastavené. Administrátor doplní '
        + PD_TOKEN_PROMENNA + ' a ' + PD_DOMENA_PROMENNA + ' v Netlify.' });

  const url = new URL(req.url);
  const obnovit = url.searchParams.get('obnovit') === '1';
  /* Obnovení stojí dotaz do Pipedrive, takže ho smí spustit jen správce —
   * jinak by stačilo držet prst na F5 a rozpočet je pryč. */
  if (obnovit && relace.role !== 'Administrátor')
    return json({ ok: false, chyba: 'Obnovit mapu polí smí jen administrátor.' }, 403);

  try {
    const m = await pdPoleMapa(obnovit);
    return json({ ok: true, nastaveno: true, ...m });
  } catch (e) {
    if (e instanceof PdChyba) return json({ ok: false, chyba: e.message }, e.stav >= 500 ? 502 : e.stav);
    throw e;
  }
};
export const config = { path: '/api/pd/pole' };
