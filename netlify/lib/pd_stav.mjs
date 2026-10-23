/* ============================================================
 * STAV DEALU PIPEDRIVE U ZAKÁZKY (P1, rozhodnutí J. V. 22. 10. 2026)
 *
 * Hlavička zakázky ukazuje stav propojeného dealu (open / lost / won /
 * deleted), jen ke čtení, nic neovlivňuje; export controllingu ho nese jako
 * informaci. Podklad: podklady/PIPEDRIVE_STAV_DEALU_22_10.md.
 *
 * PROČ VLASTNÍ ÚLOŽIŠTĚ A NE ZÁPIS DO ZAKÁZKY. Uložení zakázky (POST
 * /api/zakazky) nemá zámek — čte, kontroluje a zapisuje celý záznam. Kdyby
 * čtení stavu z Pipedrive zapsalo `pdStav` přímo do uložené zakázky, mohlo
 * by souběžně přepsat čerstvě uloženou práci obchodníka starší kopií (nebo
 * by mu změnilo razítko a další uložení by skončilo kolizí 409). Poslední
 * známý stav proto leží v úložišti `pd_stav` pod klíčem `deal:<id>` a k
 * zakázce se PŘIPOJUJE: při čtení zakázky, při jejím uložení (server dosadí
 * svůj stav, ten z prohlížeče se nebere) a v hromadném exportu.
 *
 * Chyba API, deal nenalezen (smazaný deal Pipedrive po 30 dnech odstraní),
 * vyčerpaný strop i nenastavené napojení jen ponechají poslední známý stav.
 * Do Pipedrive se nic nezapisuje.
 * ============================================================ */
import { uloziste } from './sdilene.mjs';
import { jadro } from './jadro.mjs';
import { pdNastaveno, pdZavolej, PdChyba, pdStropCerstvych } from './pipedrive.mjs';

export const PD_STAV_ULOZISTE = 'pd_stav';
/* Jak dlouho platí načtený stav, než se zeptáme znovu. Stav dealu se mění
 * jednou za týdny; otevření zakázky nemá stát dotaz do Pipedrive pokaždé. */
export const PD_STAV_CERSTVY_MS = 10 * 60 * 1000;
/* Strop čerstvých dotazů na stav na uživatele za hodinu (vlastní počítadlo,
 * detail dealu `pd_deal.mjs` má svých 30). Dotaz stojí 2 tokeny. */
export const PD_STAV_MAX = 120;

const klic = (id) => 'deal:' + id;

async function G() { await jadro(); return globalThis; }

/* Poslední známý stav dealu z úložiště, nebo null. */
export async function pdStavCti(dealId) {
  const g = await G();
  const id = g.ctrlPdDealIdNorm(dealId);
  if (!id) return null;
  const z = await (await uloziste(PD_STAV_ULOZISTE)).cti(klic(id));
  return g.pdStavNorm(z) || null;
}

/* K zakázce připojí poslední známý stav jejího dealu (je-li v úložišti).
 * Bez dealu nebo bez záznamu zakázku nemění. Selhání úložiště nesmí shodit
 * čtení zakázky — stav je jen informace. */
export async function pdStavPripoj(zak) {
  if (!zak || typeof zak !== 'object') return zak;
  try {
    const st = await pdStavCti(zak.pdDealId);
    if (st) zak.pdStav = st;
  } catch (e) { /* bez stavu */ }
  return zak;
}

/* Uložení zakázky: `pdStav` určuje server. Platí stav z úložiště pro deal
 * zakázky; když tam nic není a deal se nezměnil, zůstává stav uložené verze;
 * jinak (bez dealu, deal změněn) se pole odebere. Tvar z prohlížeče už
 * prošel kontrolou (pdStavKontrola → 400), obsah se z něj nepřebírá. */
export async function pdStavUlozeni(zak, stara) {
  const g = await G();
  const id = g.ctrlPdDealIdNorm(zak && zak.pdDealId);
  let st = null;
  if (id) {
    try { st = await pdStavCti(id); } catch (e) { st = null; }
    if (!st && stara && g.ctrlPdDealIdNorm(stara.pdDealId) === id) st = g.pdStavNorm(stara.pdStav) || null;
  }
  if (st) zak.pdStav = st; else delete zak.pdStav;
  return zak;
}

/* Načte stav dealu z Pipedrive (je-li záznam starší než PD_STAV_CERSTVY_MS)
 * a uloží ho. Vrací { nastaveno, pdStav } — pdStav je poslední známý stav
 * (po úspěšném načtení nový), nebo null. */
export async function pdStavObnov(dealId, email) {
  const g = await G();
  const id = g.ctrlPdDealIdNorm(dealId);
  const nastaveno = pdNastaveno();
  if (!id) return { nastaveno, pdStav: null };
  const s = await uloziste(PD_STAV_ULOZISTE);
  const znamy = g.pdStavNorm(await s.cti(klic(id))) || null;
  if (!nastaveno) return { nastaveno, pdStav: znamy };
  if (znamy && (Date.now() - Date.parse(znamy.nacteno)) < PD_STAV_CERSTVY_MS) return { nastaveno, pdStav: znamy };
  /* K7-S6 (#508, J. V. 23. 10. 2026): souběžné dotazy na zastaralý stav téhož
   * dealu se v instanci funkce spojí do jednoho volání Pipedrive (sdílený
   * promise); strop čerstvých dotazů platí jen tomu, kdo volání spustil.
   * Mezi instancemi se nespojují (B158) — mez v BEZPECNOST_MEZE.md. */
  const bezi = PD_STAV_BEZI.get(id);
  if (bezi) return bezi;
  const p = pdStavNacti(g, s, id, email, znamy, nastaveno);
  PD_STAV_BEZI.set(id, p);
  try { return await p; } finally { PD_STAV_BEZI.delete(id); }
}
const PD_STAV_BEZI = new Map();
async function pdStavNacti(g, s, id, email, znamy, nastaveno) {
  if (!(await pdStropCerstvych(email, 'stav', PD_STAV_MAX))) return { nastaveno, pdStav: znamy };
  let deal;
  try { deal = await pdZavolej('/api/v2/deals/' + id); }
  catch (e) {
    if (e instanceof PdChyba) return { nastaveno, pdStav: znamy };
    throw e;
  }
  const status = g.pdStavZDealu(deal);
  if (!status) return { nastaveno, pdStav: znamy };
  const novy = { status, nacteno: new Date().toISOString() };
  await s.zapis(klic(id), novy);
  return { nastaveno, pdStav: novy };
}
