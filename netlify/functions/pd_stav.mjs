/* Stav obchodního případu pro hlavičku kalkulace (22. 10. 2026).
 * Zadání J. V.: podklady/PIPEDRIVE_STAV_DEALU_22_10.md — pole „Stav
 * Pipedrive" v hlavičce OCK i PROJ, jen ke čtení, nic neovlivňuje.
 *
 * GET /api/pd/stav?deal=<id>
 *   → { ok, nastaveno, status, nacteno }   status: open | lost | won |
 *     deleted, nebo null (stav neznámý); nacteno: kdy ho server z Pipedrive
 *     přečetl (ISO, hodiny serveru). `nenalezen: true`, když deal Pipedrive
 *     nezná — pak se vrací poslední známý stav (smazaný deal Pipedrive po
 *     30 dnech odstraní úplně a kalkulace má dál ukazovat „Smazané").
 *
 * Prohlížeč dostane JEN stav a čas — žádný název, částku ani kontakty.
 * Kdo smí: přihlášený, ze stránky aplikace, s právem `crm.pipedrive` jako
 * ostatní /api/pd/* (B80). Uložený stav vidí v hlavičce každý, kdo vidí
 * zakázku; čtení z Pipedrive ho jen obnovuje.
 *
 * Kolik to stojí: detail dealu 1 token (x-token-cost ve specifikaci v2).
 * Když detail vrátí 404, zkusí se seznam smazaných (`status=deleted`,
 * 10 tokenů) — v2 smazaný deal v koši detailem vrátit nemusí. Opakované
 * otevření do PD_STAV_CACHE_MS jde bez Pipedrive; strop PD_STAV_MAX čtení
 * za hodinu na uživatele (vlastní počítadlo, detail dealu ho nesdílí).
 *
 * Chyby Pipedrive (špatný token 401, 403, výpadek) vrací 502 nebo 429 —
 * NIKDY 401: tu by prohlížeč (onlineApi) vzal jako vypršelé přihlášení.
 * Poslední známý stav tím zůstává beze změny (bod 5 zadání). Do Pipedrive
 * se nic nezapisuje. */
import { uloziste, json } from '../lib/sdilene.mjs';
import { pdNastaveno, pdZavolej, PdChyba, pdPristup, pdStropCerstvych,
         PD_STAV_ULOZISTE, PD_STAV_CACHE_MS, PD_STAV_MAX } from '../lib/pipedrive.mjs';
import { pdStavZDealu } from '../lib/pd_mapa.mjs';
import C from '../lib/controlling_modul.cjs';

const ID_MAX = 2147483647;

export default async (req) => {
  const { chyba, relace } = await pdPristup(req);
  if (chyba) return chyba;

  if (!pdNastaveno()) return json({ ok: true, nastaveno: false, status: null, nacteno: null });

  /* Jen kladné celé číslo — jako /api/pd/deal (B80). */
  const idTxt = String(new URL(req.url).searchParams.get('deal') || '');
  const id = Number(idTxt);
  if (!/^[0-9]{1,10}$/.test(idTxt) || id < 1 || id > ID_MAX)
    return json({ ok: false, chyba: 'Chybí číslo obchodního případu.' }, 400);

  const s = await uloziste(PD_STAV_ULOZISTE);
  const klic = 'stav/' + id;
  const zaznam = await s.cti(klic);
  const znamy = C.ctrlPdStavNorm(zaznam);
  const odpoved = (st, navic) => json(Object.assign({ ok: true, nastaveno: true,
    status: st ? st.status : null, nacteno: st ? st.nacteno : null }, navic || {}));

  const overeno = Date.parse(zaznam && zaznam.overeno);
  if (isFinite(overeno) && Date.now() - overeno < PD_STAV_CACHE_MS) return odpoved(znamy);

  if (!(await pdStropCerstvych(relace.email, { druh: 'stav', max: PD_STAV_MAX })))
    return json({ ok: false, nastaveno: true, chyba: 'Z Pipedrive jste za poslední hodinu načetli příliš mnoho '
      + 'stavů obchodních případů. Zkuste to později.' }, 429);

  const selhani = (e) => json({ ok: false, nastaveno: true, chyba: e.message }, e.stav === 429 ? 429 : 502);
  let status = null;
  try {
    status = pdStavZDealu(await pdZavolej('/api/v2/deals/' + id));
  } catch (e) {
    if (!(e instanceof PdChyba)) throw e;
    if (e.stav !== 404) return selhani(e);
    try {
      const smazane = await pdZavolej('/api/v2/deals', { dotaz: { ids: String(id), status: 'deleted', limit: 1 } });
      status = (Array.isArray(smazane) && smazane.some(d => d && Number(d.id) === id)) ? 'deleted' : null;
    } catch (e2) {
      if (!(e2 instanceof PdChyba)) throw e2;
      return selhani(e2);
    }
  }

  const ted = new Date().toISOString();
  if (!status) {
    /* Deal Pipedrive nezná (zmizel z koše, nebo id nesedí) nebo vrátil stav,
     * který neznáme: poslední známý stav zůstává, jen se zapíše, kdy se
     * server ptal — další dotaz až po PD_STAV_CACHE_MS. */
    await s.zapis(klic, { status: znamy ? znamy.status : null, nacteno: znamy ? znamy.nacteno : null, overeno: ted });
    return odpoved(znamy, { nenalezen: true });
  }
  await s.zapis(klic, { status, nacteno: ted, overeno: ted });
  return odpoved({ status, nacteno: ted });
};
export const config = { path: '/api/pd/stav' };
