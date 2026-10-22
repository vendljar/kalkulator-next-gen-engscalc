/* Controlling — hromadný export předkalkulace za období (#447, dávka C3,
 * 21. 10. 2026; rozhodnutí J. V. 21. 10. 2026, bod 2).
 *
 * GET /api/controlling/export?od=RRRR-MM-DD&do=RRRR-MM-DD&oblast=obe|ock|proj&rada=obe|cr|zahr&podle=zamceni|prodej
 *   (podle=prodej — C6: datum prodeje z objednaných příplatků místo data zamčení)
 *   → { ok, exporty: [ export jedné zakázky (ctrlExportVarianty) ], data, verzeMapovani,
 *       preskoceno: [ { soubor, cislo, duvod } ], kdy, kdo, filtr }
 *   #504: odpověď nese i { export: id, dalsi: soubor | null, kandidatu, zpracovano };
 *   je-li `dalsi`, prohlížeč pošle další dávku s &export=<id>&po=<dalsi>
 *   (ctrlHromadnyStahni) a dávky složí do jednoho souboru.
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
 * z ověřeného filtru; export po dávkách má jeden záznam (stav probiha →
 * hotovo). Meze CTRL_HROMADNY (src/controlling.js) — při
 * překročení 413 s výzvou zúžit období, nikdy potichu oříznutý soubor. */
import { uloziste, vyzadujRoli, json } from '../lib/sdilene.mjs';
import { jadro, jadroChyba } from '../lib/jadro.mjs';
import { pdStavPripoj } from '../lib/pd_stav.mjs';
import { randomUUID } from 'node:crypto';

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

  /* Navazující dávka (#504): `export` = id záznamu protokolu z první dávky,
   * `po` = jméno posledního zpracovaného souboru. */
  const exportId = url.searchParams.get('export') || '';
  const po = url.searchParams.get('po') || '';
  if ((exportId && !G.CTRL_EXPORT_ID.test(exportId)) || po.length > 300 || (po && !exportId))
    return json({ ok: false, chyba: 'Navazující dávka exportu má neplatný tvar — spusťte export znovu.' }, 400);

  const db = await sProg.cti('controlling');
  const platny = db && db.platny ? db.platny : null;
  const data = platny ? platny.data : null;
  const verzeMapovani = platny ? platny.verze : null;

  const navaz = exportId ? G.ctrlProtokolNavaz(await sProg.cti('controlling_exporty'), exportId, filtr, relace.email) : null;
  if (exportId && !navaz)
    return json({ ok: false, chyba: 'Navazující dávka nepatří k žádnému rozběhnutému exportu — spusťte export znovu.' }, 409);
  if (navaz && (navaz.verzeMapovani == null ? null : navaz.verzeMapovani) !== verzeMapovani)
    return json({ ok: false, chyba: 'Mapování controllingu se během exportu změnilo — spusťte export znovu.' }, 409);

  const s = await uloziste('zakazky');
  const kandidati = G.ctrlHromadnyKandidati(await s.cti('_rejstrik'), filtr);
  if (kandidati.length > M.cteni)
    return json({ ok: false, chyba: 'Pro zvolené období by se muselo přečíst ' + kandidati.length
      + ' zakázek (strop ' + M.cteni + ') — zužte období nebo filtr.' }, 413);
  const zbyva = G.ctrlHromadnyZa(kandidati, po);

  /* Čas exportu je jeden pro všechny dávky (z první dávky v protokolu). */
  const kdy = navaz ? navaz.kdy : new Date().toISOString();
  const opts = { jekly: J.JEKLY, data, verzeMapovani, kdo: relace.email, kdy };

  /* Jedna zakázka → { exp } | { preskoc } | {} (mimo výběr). */
  let bajty = 0;
  const zpracuj = async (k) => {
    let zak = null;
    try {
      const raw = await s.cti('z/' + k.soubor);
      zak = raw ? G.importZakazka(raw) : null;
    } catch (e) { zak = null; }
    if (!zak) return { preskoc: { soubor: k.soubor, cislo: k.cislo, duvod: 'zakázku se nepodařilo přečíst' } };
    /* Sloupec „Stav Pipedrive" (P1): poslední známý stav dealu z úložiště pd_stav. */
    await pdStavPripoj(zak);
    /* Nečekaný tvar uložené zakázky shodí jen ji, ne celý export (K6-S6). */
    let v;
    try { v = G.ctrlHromadnyZakazka(zak, filtr, opts); }
    catch (e) { v = { ok: false, duvod: 'zakázku se nepodařilo zpracovat' }; }
    if (v.ok) { bajty += G.ctrlBajty(JSON.stringify(v.exp)); return { exp: v.exp }; }
    return v.mimo ? {} : { preskoc: { soubor: k.soubor, cislo: k.cislo, duvod: v.duvod } };
  };
  /* Souběžné čtení (#504): M.soubeh pracovníků bere kandidáty v pořadí;
   * nový se nebere po vyčerpání časového rozpočtu, velikosti nebo počtu
   * dávky. Rozebrané doběhnou, takže zpracovaný je vždy souvislý začátek
   * seznamu a kurzor `dalsi` nic nepřeskočí. Aspoň jeden se vezme vždy. */
  const zacatek = Date.now();
  const vysledky = [];
  let vzato = 0;
  const dost = () => vzato >= zbyva.length || vzato >= M.davkaMax || bajty > M.davkaBajty
    || (vzato > 0 && Date.now() - zacatek > M.casMs);
  const pracovnik = async () => { while (!dost()) { const i = vzato++; vysledky[i] = await zpracuj(zbyva[i]); } };
  await Promise.all(Array.from({ length: Math.max(1, M.soubeh) }, pracovnik));
  const exporty = [];
  const preskoceno = [];
  vysledky.forEach(r => { if (r.exp) exporty.push(r.exp); else if (r.preskoc) preskoceno.push(r.preskoc); });
  const hotovo = vzato >= zbyva.length;

  const zakazek = (navaz ? (+navaz.zakazek || 0) : 0) + exporty.length;
  if (zakazek > M.zakazek) {
    if (navaz) await sProg.zapis('controlling_exporty', G.ctrlProtokolDavka(await sProg.cti('controlling_exporty'), navaz.id,
      { zakazek: 0, radku: 0, preskoceno: 0 }, 'odmitnuto'));
    return json({ ok: false, chyba: 'Do období spadá víc než ' + M.zakazek + ' zakázek (strop'
      + ' v jednom souboru) — rozdělte export na kratší období.' }, 413);
  }

  const id = navaz ? navaz.id : randomUUID().replace(/-/g, '');
  const odpoved = { ok: true, exporty, data, verzeMapovani, preskoceno, kdy, kdo: relace.email, filtr,
    export: id, dalsi: hotovo ? null : zbyva[vzato - 1].soubor,
    kandidatu: kandidati.length, zpracovano: kandidati.length - zbyva.length + vzato };
  const telo = JSON.stringify(odpoved);
  if (G.ctrlBajty(telo) > M.odpoved)
    return json({ ok: false, chyba: 'Export za zvolené období je příliš velký (' + Math.round(G.ctrlBajty(telo) / 1048576)
      + ' MB) — rozdělte ho na kratší období.' }, 413);

  /* Protokol (#504): první dávka založí záznam, další do něj přičítají. */
  const davka = { zakazek: exporty.length, radku: exporty.reduce((a, e) => a + e.radky.length, 0), preskoceno: preskoceno.length };
  const stav = hotovo ? 'hotovo' : 'probiha';
  const prot = await sProg.cti('controlling_exporty');
  await sProg.zapis('controlling_exporty', navaz ? G.ctrlProtokolDavka(prot, id, davka, stav)
    : G.ctrlProtokolPridej(prot, { id, kdy, kdo: relace.email,
      od: filtr.od, do: filtr.do, oblast: filtr.oblast, rada: filtr.rada, podle: filtr.podle,
      zakazek: davka.zakazek, radku: davka.radku, preskoceno: davka.preskoceno, davek: 1, stav, verzeMapovani }));
  return new Response(telo, { status: 200, headers: { 'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store' } });
};
export const config = { path: '/api/controlling/export' };
