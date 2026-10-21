/* Controlling — číselník nákladových skupin a mapování klíčů ceníku
 * (#447, dávka C1, 20. 10. 2026; návrh podklady/CONTROLLING_NAVRH_20_10.md).
 *
 * GET  /api/controlling  → { ok, db: { schema, platny: { verze, kdy, kdo,
 *                          poznamka, data: { skupiny, mapa } }, historie: [ … bez dat ] } | null }
 * POST /api/controlling { data: { skupiny, mapa }, poznamka } → nová verze
 *
 * OBOJÍ JEN ADMINISTRÁTOR (rozhodnutí J. V. 20. 10. 2026, J7: controlling
 * a export předkalkulace jsou jen pro správce). Mapování samo ceny nenese,
 * ale celá sekce je správcovská — a jedna hranice se hlídá snáz než dvě.
 *
 * Heslo správce se u zápisu NEŽÁDÁ (na rozdíl od matice zobrazení, B168):
 * mapování nepřiděluje žádná práva ani nemění cenu, jen říká, do které
 * kapitoly patří který klíč. Podvržené mapování by rozházelo export, ne
 * přístup k datům.
 *
 * Server klientovi nevěří: role z relace, tělo musí být objekt (B131),
 * strop velikosti 413, data projdou touž kontrolou jako v prohlížeči
 * (ctrlDataKontrola v src/controlling.js) — jinak 400.
 *
 * Ukládá se do úložiště `program` pod klíč `controlling` — noční otisk
 * i ruční záloha ho berou s sebou (lib/zalohovani.mjs → zalohaDoplnky)
 * a obnova vrací touž očistou (functions/obnova.mjs, část `controlling`). */
import { uloziste, vyzadujRoli, json } from '../lib/sdilene.mjs';
import { jadro, jadroChyba } from '../lib/jadro.mjs';

export default async (req) => {
  try { await jadro(); } catch (e) { return jadroChyba(e); }
  const M = globalThis.CTRL_MEZE;
  const s = await uloziste('program');

  if (req.method !== 'GET' && req.method !== 'POST') return json({ ok: false, chyba: 'Použijte GET nebo POST.' }, 405);
  const { chyba, relace } = await vyzadujRoli(req, 'Administrátor');
  if (chyba) return chyba;

  if (req.method === 'GET') {
    const db = await s.cti('controlling');
    if (!db) return json({ ok: true, db: null });
    /* Historie bez dat: k přehledu verzí stačí kdo, kdy a proč; obsah
     * starších verzí nese záloha. */
    const historie = (Array.isArray(db.historie) ? db.historie : []).map(h => {
      const { data, ...zbytek } = h || {}; return zbytek;
    });
    return json({ ok: true, db: { schema: db.schema || 1, platny: db.platny || null, historie } });
  }

  const delka = +req.headers.get('content-length') || 0;
  if (delka > M.telo)
    return json({ ok: false, chyba: 'Záznam je příliš velký (strop ' + Math.round(M.telo / 1024) + ' kB).' }, 413);
  let text; try { text = await req.text(); } catch (e) { return json({ ok: false, chyba: 'Vstup se nepodařilo přečíst.' }, 400); }
  if (globalThis.ctrlBajty(text) > M.telo)
    return json({ ok: false, chyba: 'Záznam je příliš velký (strop ' + Math.round(M.telo / 1024) + ' kB).' }, 413);
  let t; try { t = JSON.parse(text); } catch (e) { return json({ ok: false, chyba: 'Vstup není platný JSON.' }, 400); }
  if (!t || typeof t !== 'object' || Array.isArray(t)) return json({ ok: false, chyba: 'Vstup musí být objekt JSON.' }, 400);

  const k = globalThis.ctrlDataKontrola(t.data);
  if (!k.ok) return json({ ok: false, chyba: k.chyba }, 400);
  const db = await s.cti('controlling');
  if (db && globalThis.ctrlBezeZmeny(db, k.data))
    return json({ ok: false, chyba: 'Číselník ani mapování se od platné verze neliší – není co ukládat.' }, 400);
  const nova = globalThis.ctrlDbNovaVerze(db, { data: k.data, kdo: relace.email,
    poznamka: typeof t.poznamka === 'string' ? t.poznamka : '' });
  await s.zapis('controlling', nova);
  return json({ ok: true, verze: nova.platny.verze, kdy: nova.platny.kdy });
};
export const config = { path: '/api/controlling' };
