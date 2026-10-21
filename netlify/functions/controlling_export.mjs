/* Controlling — hromadný export předkalkulace za období (#447, dávka C3,
 * 21. 10. 2026; rozhodnutí J. V. 21. 10. 2026, bod 2).
 *
 * GET /api/controlling/export?od=RRRR-MM-DD&do=RRRR-MM-DD&oblast=obe|ock|proj&rada=obe|cr|zahr&podle=zamceni|prodej
 *   (podle=prodej — C6: datum prodeje z objednaných příplatků místo data zamčení)
 *   → { ok, exporty: [ export jedné zakázky (ctrlExportVarianty) ], data, verzeMapovani,
 *       preskoceno: [ { soubor, cislo, duvod } ], kdy, kdo, filtr }
 * GET /api/controlling/export?protokol=1
 *   → { ok, zaznamy: [ { kdy, kdo, od, do, oblast, rada, zakazek, radku } ] }
 *
 * JEN ADMINISTRÁTOR (J7) — export nese nákupní ceny a marže celé firmy za
 * období; hranici drží tahle funkce, ne skrytí tlačítka. Heslo správce se
 * nežádá (bod 4 rozhodnutí: nastavení controllingu dál bez hesla; export
 * nic nemění).
 *
 * Vybírá se podle DATA ZAMČENÍ řídící varianty (odeslání nabídky) v českém
 * čase, jen zamčené řídící varianty; částky ze zmrazeného výsledku tisku
 * (vypocetZ / vypocetProjZ přes ctrlExportVarianty). Mapování = platná
 * uložená verze. Soubor (XLSX / CSV) skládá prohlížeč týmž kódem jako
 * export jedné varianty (ctrlExportListy) — xlsx.js na server nepatří
 * (lib/jadro_moduly.cjs: moduly skládající dokumenty jsou jen v klientu).
 *
 * Každý export se zapíše do protokolu (úložiště `program`, klíč
 * `controlling_exporty`): kdo a kdy z relace a hodin serveru, rozsah
 * z ověřeného filtru. Meze CTRL_HROMADNY (src/controlling.js) — při
 * překročení 413 s výzvou zúžit období, nikdy potichu oříznutý soubor. */
import { uloziste, vyzadujRoli, json } from '../lib/sdilene.mjs';
import { jadro, jadroChyba } from '../lib/jadro.mjs';

export default async (req) => {
  let J;
  try { J = await jadro(); } catch (e) { return jadroChyba(e); }
  if (req.method !== 'GET') return json({ ok: false, chyba: 'Použijte GET.' }, 405);
  const { chyba, relace } = await vyzadujRoli(req, 'Administrátor');
  if (chyba) return chyba;
  const G = globalThis;
  const M = G.CTRL_HROMADNY;
  const sProg = await uloziste('program');
  const url = new URL(req.url);

  if (url.searchParams.get('protokol')) {
    const p = await sProg.cti('controlling_exporty');
    return json({ ok: true, zaznamy: (p && Array.isArray(p.zaznamy)) ? p.zaznamy.slice(0, 50) : [] });
  }

  const f = G.ctrlHromadnyFiltr({ od: url.searchParams.get('od'), do: url.searchParams.get('do'),
    oblast: url.searchParams.get('oblast'), rada: url.searchParams.get('rada'), podle: url.searchParams.get('podle') });
  if (!f.ok) return json({ ok: false, chyba: f.chyba }, 400);
  const filtr = f.filtr;

  const db = await sProg.cti('controlling');
  const platny = db && db.platny ? db.platny : null;
  const data = platny ? platny.data : null;
  const verzeMapovani = platny ? platny.verze : null;

  const s = await uloziste('zakazky');
  const kandidati = G.ctrlHromadnyKandidati(await s.cti('_rejstrik'), filtr);
  if (kandidati.length > M.cteni)
    return json({ ok: false, chyba: 'Pro zvolené období by se muselo přečíst ' + kandidati.length
      + ' zakázek (strop ' + M.cteni + ') — zužte období nebo filtr.' }, 413);

  const kdy = new Date().toISOString();
  const opts = { jekly: J.JEKLY, data, verzeMapovani, kdo: relace.email, kdy };
  const exporty = [];
  const preskoceno = [];
  for (const k of kandidati) {
    let zak = null;
    try {
      const raw = await s.cti('z/' + k.soubor);
      zak = raw ? G.importZakazka(raw) : null;
    } catch (e) { zak = null; }
    if (!zak) { preskoceno.push({ soubor: k.soubor, cislo: k.cislo, duvod: 'zakázku se nepodařilo přečíst' }); continue; }
    const v = G.ctrlHromadnyZakazka(zak, filtr, opts);
    if (v.ok) exporty.push(v.exp);
    else if (!v.mimo) preskoceno.push({ soubor: k.soubor, cislo: k.cislo, duvod: v.duvod });
  }
  if (exporty.length > M.zakazek)
    return json({ ok: false, chyba: 'Do období spadá ' + exporty.length + ' zakázek (strop ' + M.zakazek
      + ' v jednom souboru) — rozdělte export na kratší období.' }, 413);

  const odpoved = { ok: true, exporty, data, verzeMapovani, preskoceno, kdy, kdo: relace.email, filtr };
  const telo = JSON.stringify(odpoved);
  if (G.ctrlBajty(telo) > M.odpoved)
    return json({ ok: false, chyba: 'Export za zvolené období je příliš velký (' + Math.round(G.ctrlBajty(telo) / 1048576)
      + ' MB) — rozdělte ho na kratší období.' }, 413);

  const prot = await sProg.cti('controlling_exporty');
  await sProg.zapis('controlling_exporty', G.ctrlProtokolPridej(prot, { kdy, kdo: relace.email,
    od: filtr.od, do: filtr.do, oblast: filtr.oblast, rada: filtr.rada, podle: filtr.podle,
    zakazek: exporty.length, radku: exporty.reduce((a, e) => a + e.radky.length, 0), preskoceno: preskoceno.length }));
  return new Response(telo, { status: 200, headers: { 'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store' } });
};
export const config = { path: '/api/controlling/export' };
