/* Dodatkové texty položek platné pro celou aplikaci (22. 9. 2026, zadání J. V.).
 *
 * Zadání: „dodatkové texty pod příplatky a volitelnými položkami, které jako
 * administrátor zadám, mají zůstat v aplikaci uložené. Ostatní uživatelé je
 * mohou v případě potřeby upravovat, ale jen admin je může zadat, resp.
 * trvale přepisovat."
 *
 * PROČ SAMOSTATNÁ CESTA A NE CENÍK. Text je od #267 součástí ceníku, jenže
 * ceník se ZVEŘEJŇUJE: vydat kvůli jedné větě novou verzi ceníku znamená
 * novou verzi pro všechny budoucí nabídky, záznam v historii a porovnání
 * otisků. Správce to proto nedělal a text zůstával jen v jeho zakázce, kde
 * ho nikdo jiný neviděl. Tahle mapa stojí vedle ceníku, nemá verzi a zapisuje
 * se jedním polem.
 *
 * GET  /api/popisy  → { ok, popisy: { texty, kdo, kdy } | null } — každý přihlášený
 * POST /api/popisy { texty } → uložit — JEN Administrátor
 *
 * Ukládá se do úložiště `program` pod klíč `popisy`, aby to noční otisk
 * i ruční záloha braly s sebou jedním čtením — stejný vzor jako matice
 * zobrazení (/api/zobrazeni).
 *
 * Očistu dělá `popisyOciste()` ze src/cenik.js, tedy TÝMŽ kódem jako
 * prohlížeč: prázdné texty se nezapisují, klíč i text mají strop délky
 * a počet položek je omezený. Bez toho by se sem dal poslat slovník
 * o libovolné velikosti, který se pak vlije do ceníku každé nové zakázky.
 *
 * POZOR NA ODESLANÉ NABÍDKY: tahle mapa se vlévá do VÝCHOZÍHO ceníku při
 * přihlášení, ne do uložených zakázek. Zakázka si nese vlastní kopii ceníku,
 * takže pozdější změna textu nemění to, co už odešlo zákazníkovi. */
import { uloziste, vyzadujRoli, json } from '../lib/sdilene.mjs';
import { jadro, jadroChyba } from '../lib/jadro.mjs';

export default async (req) => {
  try { await jadro(); } catch (e) { return jadroChyba(e); }

  const s = await uloziste('program');

  if (req.method === 'GET') {
    const { chyba } = await vyzadujRoli(req);          // stačí být přihlášen
    if (chyba) return chyba;
    const p = await s.cti('popisy');
    return json({ ok: true, popisy: p || null });
  }
  if (req.method !== 'POST') return json({ ok: false, chyba: 'Použijte GET nebo POST.' }, 405);

  const { chyba, relace } = await vyzadujRoli(req, 'Administrátor');
  if (chyba) return chyba;
  let t; try { t = await req.json(); } catch (e) { return json({ ok: false, chyba: 'Vstup není platný JSON.' }, 400); }

  const texty = globalThis.popisyOciste(t && t.texty);
  const zaznam = { texty, kdo: relace.email, kdy: new Date().toISOString() };
  await s.zapis('popisy', zaznam);
  return json({ ok: true, kdy: zaznam.kdy, pocet: Object.keys(texty).length });
};
export const config = { path: '/api/popisy' };
