/* ============================================================
 * POZNÁMKA DEALU SE SEZNAMEM ŠACHET (VSD, doplněk J. V. 11. 11. 2026)
 *
 * Víc šachet v jedné nabídce (#570): seznam šachet nabídky se do Pipedrive
 * zapisuje jako POZNÁMKA (Note) u dealu, ne jako pole dealu. Pravidla J. V.:
 *   · jedna poznámka na deal a zakázku — nesmí se množit. Id poznámky si
 *     server drží v poli zakázky `pdPoznamkaSachty` { deal, id, otisk, kdy },
 *     které píše JEN server (hodnota z prohlížeče se zahodí, platí uložená
 *     verze téhož dealu — vzor pdStavUlozeni);
 *   · další zápis poznámku UPRAVÍ (PUT /v1/notes/{id}); zmizela-li mezitím
 *     v Pipedrive (404), nebo patří jinému dealu, založí se nová (POST);
 *   · zapisuje se jen se ZAPNUTÝM vypínačem víc šachet a jen u zakázky, jejíž
 *     řídící varianta má víc šachet. Vypnuto = nic se nemění (jedna šachta
 *     i zlatá sada beze změny);
 *   · text: escapovaný (obsah poznámky Pipedrive je HTML), s délkovým
 *     stropem, jen názvy šachet a kusy — žádné ceny ani osobní údaje navíc.
 *
 * KDY. Při uložení zakázky (POST /api/zakazky) uvnitř výhradního úseku
 * zakázky, před zápisem — id poznámky se tak uloží týmž zápisem a razítko
 * verze se nemění dvakrát (důvod viz lib/pd_stav.mjs). Do Pipedrive se
 * sahá JEN když se text proti uloženému otisku změnil (autosave bez změny
 * šachet nestojí nic), nejvýš PD_POZNAMKA_STROP zápisů za hodinu na deal
 * (B217) a bez opakování po 429/5xx (uložení zakázky se nezdrží o sekundy).
 * Selhání Pipedrive uložení NEZASTAVÍ: zakázka se uloží, otisk zůstane
 * starý a příští uložení zápis zkusí znovu; odpověď nese stav a varování.
 *
 * Poznámky Pipedrive API v2 protějšek nemají (lib/pipedrive.mjs) — v1.
 * ============================================================ */
import { createHash } from 'node:crypto';
import { pdNastaveno, pdZavolej, PdChyba, pdStropCerstvych } from './pipedrive.mjs';

export const PD_POZNAMKA_POLE = 'pdPoznamkaSachty';
/* Délka textu poznámky před escapováním (10 šachet × název ≤ 80 znaků se
 * vejde s rezervou; delší text se zkrátí s „…"). */
export const PD_POZNAMKA_MAX = 2000;
/* Strop zápisů poznámky na deal za hodinu (B217) — přejmenovávání šachet
 * s autosave nesmí vyčerpat denní rozpočet Pipedrive. */
export const PD_POZNAMKA_STROP = 20;
export const PD_POZNAMKA_UVOD = 'Šachty v nabídce: ';

const ID_TVAR = /^[1-9][0-9]{0,11}$/;
const OTISK_TVAR = /^[0-9a-f]{16}$/;

export function pdPoznamkaEsc(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* Text poznámky ze ŘÍDÍCÍ varianty zakázky (prostý text, bez escapování),
 * nebo '' = nic nezapisovat (jedna šachta, neplatný tvar). Stejná věta jako
 * řádek náhledu „Poznámka dealu — šachty v nabídce" (pd_nanecisto.js:
 * 'Šachty v nabídce: ' + vsPredmetText), jen z dat místo z výsledku výpočtu
 * — názvy a kusy jsou tytéž (sachtyZ / vsNazev / vsKs). */
export function pdPoznamkaText(zak, G = globalThis) {
  if (!zak || typeof zak !== 'object' || !Array.isArray(zak.varianty) || !zak.varianty.length) return '';
  const v = typeof G.ridiciVarianta === 'function' ? G.ridiciVarianta(zak) : zak.varianty[0];
  const ock = v && v.data && v.data.ock;
  if (!ock || typeof ock !== 'object' || !G.rezimViceSachet(ock)) return '';
  if (G.vsTvarProblemy(ock).length) return '';
  const l = G.sachtyZ(ock);
  const p = G.vsPocty(ock);
  let t = PD_POZNAMKA_UVOD + G.vsPoctyPopis(p.variant, p.celkem) + ' ('
    + l.map((s, i) => G.vsNazev(s, i) + ' ' + s.ks + ' ks').join(', ') + ')';
  t = t.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, ' ');
  if (t.length > PD_POZNAMKA_MAX) t = t.slice(0, PD_POZNAMKA_MAX - 1) + '…';
  return t;
}

export function pdPoznamkaOtisk(text) {
  return createHash('sha256').update(String(text), 'utf8').digest('hex').slice(0, 16);
}

/* Uložená hodnota pole, jen v čistém tvaru (jinak null). */
export function pdPoznamkaNorm(x) {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
  const deal = typeof x.deal === 'string' && ID_TVAR.test(x.deal) ? x.deal : '';
  const id = typeof x.id === 'number' && Number.isInteger(x.id) && x.id > 0 ? x.id : 0;
  const otisk = typeof x.otisk === 'string' && OTISK_TVAR.test(x.otisk) ? x.otisk : '';
  if (!deal || !id || !otisk) return null;
  return { deal, id, otisk, kdy: typeof x.kdy === 'string' ? x.kdy.slice(0, 40) : '' };
}

/* Zápis/úprava poznámky v Pipedrive. Vrací id poznámky. */
async function zapisDoPipedrive(dealId, id, obsah) {
  const jedenPokus = { pokusu: 1 };
  if (id) {
    let poznamka = null;
    try { poznamka = await pdZavolej('/api/v1/notes/' + id, jedenPokus); }
    catch (e) { if (!(e instanceof PdChyba) || e.stav !== 404) throw e; }
    /* Jen poznámka TÉHOŽ dealu (pojistka proti podvrženému id, např. ze
     * souboru obnovy) — jinak se nesahá a založí se nová. */
    if (poznamka && String(poznamka.deal_id) === dealId && poznamka.active_flag !== false) {
      try {
        await pdZavolej('/api/v1/notes/' + id, { ...jedenPokus, metoda: 'PUT', telo: { content: obsah } });
        return { id, akce: 'upraveno' };
      } catch (e) { if (!(e instanceof PdChyba) || e.stav !== 404) throw e; }
    }
  }
  const nova = await pdZavolej('/api/v1/notes', { ...jedenPokus, metoda: 'POST', telo: { content: obsah, deal_id: Number(dealId) } });
  const noveId = nova && Number(nova.id);
  if (!(Number.isInteger(noveId) && noveId > 0)) throw new PdChyba('Pipedrive nevrátil id poznámky.', 502);
  return { id: noveId, akce: 'zalozeno' };
}

/* Uložení zakázky (functions/zakazky.mjs, ve výhradním úseku zakázky).
 * Na místě nastaví zak[PD_POZNAMKA_POLE] a vrátí { stav, varovani? }:
 *   'bez'        — není co psát (vypnuto, bez dealu, bez napojení, jedna šachta),
 *   'beze-zmeny' — text se proti uloženému otisku nezměnil,
 *   'zalozeno' | 'upraveno' — zapsáno do Pipedrive,
 *   'strop' | 'chyba' — nezapsáno, zkusí se při dalším uložení. */
export async function pdPoznamkaUlozeni(zak, stara, { viceSachet } = {}, G = globalThis) {
  const dealId = G.ctrlPdDealIdNorm(zak && zak.pdDealId) || '';
  /* Pole píše jen server: platí uložená verze téhož dealu, klientova se zahodí. */
  const drz = pdPoznamkaNorm(stara && stara[PD_POZNAMKA_POLE]);
  const plati = drz && dealId && drz.deal === dealId ? drz : null;
  delete zak[PD_POZNAMKA_POLE];
  if (plati) zak[PD_POZNAMKA_POLE] = plati;

  if (viceSachet !== true || !dealId || !pdNastaveno()) return { stav: 'bez' };
  const text = pdPoznamkaText(zak, G);
  if (!text) return { stav: 'bez' };
  const otisk = pdPoznamkaOtisk(text);
  if (plati && plati.otisk === otisk) return { stav: 'beze-zmeny' };
  if (!(await pdStropCerstvych('deal:' + dealId, 'poznamka', PD_POZNAMKA_STROP)))
    return { stav: 'strop', varovani: 'Seznam šachet se do poznámky dealu v Pipedrive nezapsal (strop '
      + PD_POZNAMKA_STROP + ' zápisů za hodinu) — zapíše se při dalším uložení.' };
  try {
    const r = await zapisDoPipedrive(dealId, plati ? plati.id : 0, pdPoznamkaEsc(text));
    zak[PD_POZNAMKA_POLE] = { deal: dealId, id: r.id, otisk, kdy: new Date().toISOString() };
    return { stav: r.akce };
  } catch (e) {
    if (!(e instanceof PdChyba)) throw e;
    return { stav: 'chyba', varovani: 'Seznam šachet se do poznámky dealu v Pipedrive nezapsal: ' + e.message
      + ' Zakázka je uložená; zápis se zkusí při dalším uložení.' };
  }
}
