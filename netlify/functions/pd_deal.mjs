/* Detail jednoho obchodního případu přeložený do polí kalkulačky
 * (9. 8. 2026, #16 — čtecí část).
 *
 * GET /api/pd/deal?id=<číslo>
 *   → { ok, nastaveno, deal: { …hlavička…, …krycí list…, odkaz },
 *       chybiPole: [...], varovani: [...] }
 *
 * Co se sem VĚDOMĚ nedostane: cena. `hodnotaCrm` je informativní údaj pro
 * porovnání „v CRM je X, spočítali jste Y" a do výpočtu nevstupuje. Pravidlo
 * projektu je, že částky vznikají výhradně z kalkulace — převzatá cena
 * z CRM by byla přesně ten „odhad", který se do dokumentů nesmí dostat.
 *
 * Organizace a osoba se dotahují zvlášť, protože deal nese jen jejich ID.
 * Jsou to dva dotazy navíc po 1 tokenu; načtení dealu tedy stojí 3 tokeny
 * denního rozpočtu, což je proti jedné stránce seznamu (10) zanedbatelné.
 * (Ceny podle x-token-cost ve specifikaci v2, ověřeno 22. 9. 2026.)
 *
 * Zákazník je organizace a osoba DEALU (`org_id`, `person_id`). Do 21. 10.
 * 2026 měl přednost „Zdroj poptávky – Organizace" s předpokladem, že je to
 * vždy výtahová firma. Není (J. V. 21. 10. 2026, ověřeno na účtu): zdroj
 * je ten, kdo poptávku přinesl, a 19 ze 138 vyplněných má jinou roli; u 49
 * dealů projekce by se zákazníkem stala výtahovka místo investora.
 *
 * Podmínky krycího listu se z CRM nečtou — jejich vlastníkem je kalkulace
 * a do Pipedrive se zapisují (pd_mapa.mjs, „KDO JE ZDROJEM"). */
import { uloziste, json } from '../lib/sdilene.mjs';
import { pdNastaveno, pdZavolej, pdOdkazNaDeal, PdChyba, pdPristup, pdStropCerstvych,
         PD_CACHE_ULOZISTE } from '../lib/pipedrive.mjs';
import { pdDealNaNase, PD_CTENI } from '../lib/pd_mapa.mjs';
import { pdPoleMapa } from './pd_pole.mjs';

/* Krátká cache detailu (B80): opakované otevření téhož případu nejde do
 * Pipedrive ani se nepočítá do stropu. 90 s jako u seznamu (B19). */
const PD_DEAL_CACHE_MS = 90 * 1000;
const ID_MAX = 2147483647;

async function bezpecne(cesta) {
  /* Chybějící organizace nebo osoba nesmí shodit celé načtení — deal je
   * použitelný i bez nich, jen se nedoplní zákazník. */
  try { return await pdZavolej(cesta); } catch (e) { return null; }
}

export default async (req) => {
  /* Přihlášení, původ a právo z matice (B80) — lib/pipedrive.mjs. */
  const { chyba, relace } = await pdPristup(req);
  if (chyba) return chyba;

  if (!pdNastaveno())
    return json({ ok: true, nastaveno: false, deal: null,
      chyba: 'Napojení na Pipedrive zatím není nastavené.' });

  /* Jen kladné celé číslo (B80): „-1", „1.5", „1e3" ani mezery do cesty
   * k Pipedrive nepatří a jen by zakládaly nové klíče cache. */
  const idTxt = String(new URL(req.url).searchParams.get('id') || '');
  const id = Number(idTxt);
  if (!/^[0-9]{1,10}$/.test(idTxt) || id < 1 || id > ID_MAX)
    return json({ ok: false, chyba: 'Chybí číslo obchodního případu.' }, 400);

  try {
    const cache = await uloziste(PD_CACHE_ULOZISTE);
    const klic = 'deal:' + id;
    const ulozene = await cache.cti(klic);
    if (ulozene && ulozene.odpoved && (Date.now() - (ulozene.poridano || 0)) < PD_DEAL_CACHE_MS)
      return json(ulozene.odpoved);
    if (!(await pdStropCerstvych(relace.email)))
      return json({ ok: false, nastaveno: true, chyba: 'Z Pipedrive jste za poslední hodinu načetli '
        + 'příliš mnoho obchodních případů. Zkuste to později, nebo se ozvěte správci.' }, 429);

    const pole = await pdPoleMapa();
    const deal = await pdZavolej('/api/v2/deals/' + id, { dotaz: { include_option_labels: true } });
    if (!deal) return json({ ok: false, chyba: 'Pipedrive takový případ nezná.' }, 404);

    const idFirmy = deal.org_id || null;
    const idOsoby = deal.person_id || null;

    const [organizace, osoba] = await Promise.all([
      idFirmy ? bezpecne('/api/v2/organizations/' + idFirmy) : null,
      idOsoby ? bezpecne('/api/v2/persons/' + idOsoby) : null,
    ]);

    const nase = pdDealNaNase(deal, pole.mapa,
      { organizace, osoba, mapaOrganizace: pole.mapaOrganizace });
    nase.odkaz = pdOdkazNaDeal(id);

    /* Varování říkají obchodníkovi, co si musí doplnit sám. Bez nich by se
     * prázdné pole tvářilo jako „v CRM je prázdno", i kdyby jen chyběla
     * mapa — a to jsou dvě úplně jiné situace. */
    const varovani = [];
    if (!nase.cislo) varovani.push('Z názvu případu nejde vyčíst číslo nabídky '
      + '(očekává se tvar „CN-123 …") — doplňte ho v hlavičce ručně.');
    if (!organizace) varovani.push('K případu není navázaná organizace, zákazník zůstal prázdný.');
    else if (!nase.ico) varovani.push('Organizace v CRM nemá vyplněné IČO.');
    if (!nase.adresa) varovani.push('V CRM není vyplněná adresa realizace.');
    /* Jen pole, která detail opravdu čte (PD_CTENI). Pole pro zápis, která
     * v CRM chybí, obchodníka při načítání nezajímají — ukazuje je přehled mapy. */
    const ctene = (s) => (s || []).filter((x) => PD_CTENI.includes(x.klic));
    const chybi = ctene(pole.chybi);
    if (chybi.length)
      varovani.push('Nepodařilo se v CRM najít pole: '
        + chybi.map((x) => '„' + x.nazev + '"').join(', ') + '.');
    /* Správný název, jiný typ: pole se nečte vůbec — výběr místo čísla by se
     * do krycího listu dostal jako popiska, ne jako hodnota. */
    const jinyTyp = ctene(pole.typNesedi);
    if (jinyTyp.length)
      varovani.push('Pole v CRM má jiný typ, než kalkulačka čeká, a nenačetlo se: '
        + jinyTyp.map((x) => '„' + x.nazev + '" (je ' + x.je + ', čeká se ' + x.ocekavano + ')').join(', ') + '.');
    const vickrat = ctene(pole.nejednoznacne);
    if (vickrat.length)
      varovani.push('Pole je v CRM víckrát pod stejným názvem a nenačetlo se: '
        + vickrat.map((x) => '„' + x.nazev + '"').join(', ') + '.');

    const odpoved = { ok: true, nastaveno: true, deal: nase,
      chybiPole: chybi, varovani };
    await cache.zapis(klic, { poridano: Date.now(), odpoved });
    return json(odpoved);
  } catch (e) {
    /* Odmítnutý token Pipedrive (401) nesmí odejít jako 401 — klient by ho
     * vzal za vypršelé přihlášení a obchodníka odhlásil (vzor pd_pole, #114;
     * ukázal to simulátor, #536). */
    if (e instanceof PdChyba)
      return json({ ok: false, nastaveno: true, chyba: e.message }, (e.stav >= 500 || e.stav === 401) ? 502 : e.stav);
    throw e;
  }
};
export const config = { path: '/api/pd/deal' };
