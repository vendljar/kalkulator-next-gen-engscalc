/* Databáze programu online — TÝŽ model jako _program.json ve složce.
 * GET  /api/program            → { db } (platný ceník + historie) — přihlášení
 * POST /api/program { cenik, cenikProj, katalog, slevy, poznamka }
 *      → zveřejnit jako platný — JEN Administrátor (pravidlo: „Platný ceník
 *        může zveřejňovat jen administrátor"). Verzování, otisky i odkládání
 *        starých verzí dělá stejný kód jako v aplikaci (src/program.js +
 *        cenik_stari.js) — žádná druhá pravda. */
import { uloziste, vyzadujRoli, json } from '../lib/sdilene.mjs';
import { jadro, jadroChyba } from '../lib/jadro.mjs';

export default async (req) => {
  /* Jádro (src/*.js) se naskládá do globálních jmen — programNovy,
   * programNovaVerze a spol. se pak volají přes globalThis stejně jako
   * v prohlížeči. Kdyby se načíst nepovedlo, uživatel dostane české
   * vysvětlení místo holé chyby 502. */
  try { await jadro(); } catch (e) { return jadroChyba(e); }

  const s = await uloziste('program');

  if (req.method === 'GET') {
    const { chyba } = await vyzadujRoli(req);          // stačí být přihlášen
    if (chyba) return chyba;
    const db = await s.cti('db');
    return json({ ok: true, db: db || null });
  }
  if (req.method !== 'POST') return json({ ok: false, chyba: 'Použijte GET nebo POST.' }, 405);

  const { chyba, relace } = await vyzadujRoli(req, 'Administrátor');
  if (chyba) return chyba;
  let t; try { t = await req.json(); } catch (e) { return json({ ok: false, chyba: 'Vstup není platný JSON.' }, 400); }

  /* Zahraniční odchylky (#181, 31. 8. 2026) jdou se stejnou verzí jako
   * tuzemský ceník. Očistu (jen známé cesty, jen čísla) dělá jádro
   * v programZaznam → cenikZahrOciste; server nevěří tomu, co přišlo. */
  /* Tvar `kid` trvalých položek (bezpečnostní audit 9. 9. 2026, B26): ceník
   * PROJ i katalog OCK přicházejí z otevřené zakázky administrátora — tedy
   * z dat, která mohl uložit kdokoli. Zveřejněný ceník se propíše do každé
   * nové nabídky, takže podvržený kid by tudy doputoval ke všem. */
  const spatneKid = globalThis.uloKidProblemyProgramu(t.cenikProj, t.katalog);
  if (spatneKid.length)
    return json({ ok: false, chyba: 'Ceník nese identifikátor trvalé položky v nepovoleném tvaru ('
      + spatneKid.map(x => x.kde).join(', ') + '). Povolená jsou písmena, číslice, tečka, '
      + 'podtržítko a pomlčka.' }, 400);
  const ctx = { cenik: t.cenik, cenikProj: t.cenikProj, zahranicni: t.zahranicni || null,
                katalog: t.katalog || null,
                slevy: t.slevy || null, kdo: relace.email, poznamka: String(t.poznamka || ''),
                build: String(t.build || '') };

  /* ZAHRANIČNÍ CENY DO TUZEMSKÉ ŘADY NEPROJDOU (P1, nález N1, 21. 9. 2026).
   *
   * Tatáž kontrola běží i v dialogu aplikace, ale tady musí být taky: dialog
   * jde obejít a server klientovi nevěří (viz bezpečnostní audit). Řada se
   * pozná z klíče `rada`, který do ceníku zapsal `cenikRadaPrepni` při
   * přepnutí varianty na Zahraničí — tedy přesně z toho, co vadnou verzi 27
   * prozradilo. Druhá větev (shoda ČR se zahraniční odchylkou u víc než pěti
   * položek) chytí i podklad, ze kterého klíč někdo odstranil.
   *
   * Klíče `rada` a `jenZahr` se ze zveřejněného ceníku zahazují v jádru
   * (programZaznam), takže se sem nedostanou ani oklikou přes soubor. */
  /* POJISTKA SE NESMÍ DÁT VYPNOUT VYNECHÁNÍM POLE (nález B55, audit
   * 22. 9. 2026). Do 22. 9. se ČR ceny porovnávaly výhradně proti odchylkám
   * Z TÉHOŽ POŽADAVKU. Kdo `zahranicni` neposlal — starší klient, ruční
   * volání —, neměl se s čím shodovat a druhá větev pojistky mlčky vypadla.
   * Přitom uložené odchylky server zná vždycky a v prohlížeči se odjakživa
   * porovnávalo právě proti nim (`CENIK_ZAHR` = odchylky, které platí).
   *
   * Proto se porovnává proti SLOUČENÍ obou zdrojů a předává se i platný
   * záznam — ten z počítání vyřadí položky, jejichž ČR cena se nemění, aby
   * šlo zrušit víc odchylek naráz. Kvůli tomu se `db` čte dřív než posudek. */
  let db = await s.cti('db');
  const platny = (db && db.platny) || null;
  const zahrProKontrolu = (typeof globalThis.cenikZahrSluc === 'function')
    ? globalThis.cenikZahrSluc(platny && platny.zahranicni, ctx.zahranicni)
    : ctx.zahranicni;
  const posudek = globalThis.cenikZverejneniKontrola(ctx, zahrProKontrolu, t.rada, platny);
  if (!posudek.ok)
    return json({ ok: false, kod: posudek.kod, chyba: posudek.duvod,
      polozky: (posudek.shody || []).map(s => s.popis) }, 400);
  if (!db) db = globalThis.programNovy(ctx);
  else {
    if (globalThis.programBezeZmeny(db, ctx))
      return json({ ok: false, chyba: 'Ceník se od platné verze neliší – není co zveřejňovat.' }, 400);
    db = globalThis.programNovaVerze(db, ctx);
  }
  await s.zapis('db', db);
  return json({ ok: true, verze: db.platny.verze, platnoOd: db.platny.platnoOd });
};
export const config = { path: '/api/program' };
