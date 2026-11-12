/* ============================================================
 * POZNÁMKA DEALU SE SEZNAMEM ŠACHET (VSD, doplněk J. V. 11. 11. 2026,
 * úpravy po revizi Fable 12. 11. 2026 — N1–N3, rozhodnutí koordinace a, b)
 *
 * Víc šachet v jedné nabídce (#570): seznam šachet nabídky se do Pipedrive
 * zapisuje jako POZNÁMKA (Note) u dealu, ne jako pole dealu. Pravidla:
 *   · jedna poznámka na deal a zakázku — nesmí se množit. Id poznámky si
 *     server drží v poli zakázky `pdPoznamkaSachty` { deal, id, otisk, kdy },
 *     které píše JEN server (hodnota z prohlížeče se zahodí, platí uložená
 *     verze téhož dealu — vzor pdStavUlozeni);
 *   · text nese ZNAČKU ČÍSLA ZAKÁZKY („— nabídka <číslo>“), aby dvě zakázky
 *     na jednom dealu nesdílely poznámku (N3). Nemá-li server id, nejdřív
 *     prohledá poznámky dealu (GET /v1/notes?deal_id=…) a převezme aktivní
 *     poznámku téhož dealu, která začíná „Šachty v nabídce: “ a nese značku
 *     — teprve když není, založí novou (POST). Tím se srovná i id ztracené
 *     kolizí 409 (N1);
 *   · další zápis poznámku UPRAVÍ (PUT /v1/notes/{id}) po ověření, že patří
 *     témuž dealu; zmizela-li (404) nebo je cizí, hledá/zakládá se znovu;
 *   · zapisuje se jen se ZAPNUTÝM vypínačem víc šachet a jen uživatel
 *     s právem `crm.pipedrive` (B80; bez práva stav „bez-prava“ bez varování
 *     — nejbližší uložení oprávněného to srovná). Zakládá se jen u řídící
 *     varianty s víc šachtami; přešla-li zakázka s poznámkou na jednu šachtu,
 *     poznámka se NEMAŽE, jen se upraví na „Šachty v nabídce: 1 šachta“ (b);
 *   · text: escapovaný (obsah poznámky Pipedrive je HTML), s délkovým
 *     stropem, jen názvy šachet, kusy a číslo nabídky — žádné ceny ani
 *     osobní údaje navíc.
 *
 * KDY. Při uložení zakázky (POST /api/zakazky) ve výhradním úseku zakázky,
 * po druhém čtení SEC-S1; volající po návratu z Pipedrive čte zakázku
 * POTŘETÍ a při změně razítka vrací 409 (N1, functions/zakazky.mjs). Do
 * Pipedrive jen při změně textu (otisk), nejvýš PD_POZNAMKA_STROP pokusů za
 * hodinu na deal (B217; čerpají i neúspěšné), bez opakování, každé volání
 * nejvýš PD_POZNAMKA_VOLANI_MS a celý zápis PD_POZNAMKA_CELKEM_MS (N2).
 * Selhání Pipedrive uložení NEZASTAVÍ: zakázka se uloží, otisk zůstane
 * starý a příští uložení zápis zkusí znovu; odpověď nese stav a varování.
 *
 * Poznámky Pipedrive API v2 protějšek nemají (lib/pipedrive.mjs) — v1.
 * ============================================================ */
import { createHash } from 'node:crypto';
import { pdNastaveno, pdZavolej, PdChyba, pdStropCerstvych, PD_PRAVO } from './pipedrive.mjs';

export const PD_POZNAMKA_POLE = 'pdPoznamkaSachty';
/* Délka seznamu šachet před escapováním (10 šachet × název ≤ 80 znaků se
 * vejde s rezervou; delší se zkrátí s „…"). Značka čísla nabídky se přidává
 * za seznam a nezkracuje se (číslo nabídky ≤ PD_POZNAMKA_CISLO_MAX). */
export const PD_POZNAMKA_MAX = 2000;
export const PD_POZNAMKA_CISLO_MAX = 120;
/* Strop pokusů o zápis poznámky na deal za hodinu (B217) — i neúspěšných. */
export const PD_POZNAMKA_STROP = 20;
/* Časové meze (N2): jedno volání Pipedrive a celý zápis poznámky. */
export const PD_POZNAMKA_VOLANI_MS = 2500;
export const PD_POZNAMKA_CELKEM_MS = 6000;
export const PD_POZNAMKA_UVOD = 'Šachty v nabídce: ';
export const PD_POZNAMKA_JEDNA = 'Šachty v nabídce: 1 šachta';
export const PD_POZNAMKA_ZNACKA = ' — nabídka ';

const ID_TVAR = /^[1-9][0-9]{0,11}$/;
const OTISK_TVAR = /^[0-9a-f]{16}$/;
const RIDICI = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g;

export function pdPoznamkaEsc(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* Značka zakázky v textu poznámky (prostý text): „ — nabídka <číslo>“. */
export function pdPoznamkaZnacka(zak) {
  const c = String((zak && zak.cislo) || '').replace(RIDICI, ' ').trim().slice(0, PD_POZNAMKA_CISLO_MAX);
  return c ? PD_POZNAMKA_ZNACKA + c : '';
}

/* Seznam šachet ŘÍDÍCÍ varianty (prostý text, bez značky), nebo '' = jedna
 * šachta / neplatný tvar. Stejná věta jako řádek náhledu „Poznámka dealu —
 * šachty v nabídce" (pd_nanecisto.js: 'Šachty v nabídce: ' + vsPredmetText),
 * jen z dat místo z výsledku výpočtu — názvy a kusy jsou tytéž. */
export function pdPoznamkaSeznam(zak, G = globalThis) {
  if (!zak || typeof zak !== 'object' || !Array.isArray(zak.varianty) || !zak.varianty.length) return '';
  const v = typeof G.ridiciVarianta === 'function' ? G.ridiciVarianta(zak) : zak.varianty[0];
  const ock = v && v.data && v.data.ock;
  if (!ock || typeof ock !== 'object' || !G.rezimViceSachet(ock)) return '';
  if (G.vsTvarProblemy(ock).length) return '';
  const l = G.sachtyZ(ock);
  const p = G.vsPocty(ock);
  let t = PD_POZNAMKA_UVOD + G.vsPoctyPopis(p.variant, p.celkem) + ' ('
    + l.map((s, i) => G.vsNazev(s, i) + ' ' + s.ks + ' ks').join(', ') + ')';
  t = t.replace(RIDICI, ' ');
  if (t.length > PD_POZNAMKA_MAX) t = t.slice(0, PD_POZNAMKA_MAX - 1) + '…';
  return t;
}

/* Celý text poznámky (prostý text) = seznam + značka zakázky; '' = nic. */
export function pdPoznamkaText(zak, G = globalThis) {
  const s = pdPoznamkaSeznam(zak, G);
  return s ? s + pdPoznamkaZnacka(zak) : '';
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

/* Je obsah poznámky Pipedrive „naše“ poznámka této zakázky? (escapovaný HTML;
 * Pipedrive může obsah obalit do <p>…</p> — porovnává se bez značek). */
export function pdPoznamkaJeNase(obsah, zak) {
  const t = String(obsah == null ? '' : obsah).replace(/<[^>]*>/g, '').trim();
  const znacka = pdPoznamkaZnacka(zak);
  return !!znacka && t.startsWith(pdPoznamkaEsc(PD_POZNAMKA_UVOD).trim()) && t.endsWith(pdPoznamkaEsc(znacka));
}

/* Volání Pipedrive s časovou mezí (N2): jedno volání nejvýš
 * PD_POZNAMKA_VOLANI_MS a nikdy za termín celého zápisu. */
function volani(termin) {
  return (cesta, volby = {}) => {
    const zbyva = termin - Date.now();
    if (zbyva <= 0) throw new PdChyba('Pipedrive neodpověděl včas.', 504);
    return pdZavolej(cesta, { ...volby, pokusu: 1, casLimitMs: Math.min(PD_POZNAMKA_VOLANI_MS, zbyva) });
  };
}

/* Najde aktivní poznámku této zakázky u dealu (N3), nebo null. */
async function najdiNasi(zavolej, dealId, zak) {
  const seznam = await zavolej('/api/v1/notes', { dotaz: { deal_id: dealId, limit: 100, sort: 'add_time DESC' } });
  const p = (Array.isArray(seznam) ? seznam : []).find((x) => x && String(x.deal_id) === dealId
    && x.active_flag !== false && pdPoznamkaJeNase(x.content, zak));
  const id = p && Number(p.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/* Zápis/úprava poznámky v Pipedrive. Vrací { id, akce }. */
async function zapisDoPipedrive(dealId, id, obsah, zak, zavolej) {
  if (id) {
    let poznamka = null;
    try { poznamka = await zavolej('/api/v1/notes/' + id); }
    catch (e) { if (!(e instanceof PdChyba) || e.stav !== 404) throw e; }
    /* Jen poznámka TÉHOŽ dealu (pojistka proti podvrženému id, např. ze
     * souboru obnovy) — jinak se nesahá a hledá/zakládá se znovu. */
    if (!(poznamka && String(poznamka.deal_id) === dealId && poznamka.active_flag !== false)) id = null;
  }
  if (!id) id = await najdiNasi(zavolej, dealId, zak);
  if (id) {
    try {
      await zavolej('/api/v1/notes/' + id, { metoda: 'PUT', telo: { content: obsah } });
      return { id, akce: 'upraveno' };
    } catch (e) { if (!(e instanceof PdChyba) || e.stav !== 404) throw e; }
  }
  const nova = await zavolej('/api/v1/notes', { metoda: 'POST', telo: { content: obsah, deal_id: Number(dealId) } });
  const noveId = nova && Number(nova.id);
  if (!(Number.isInteger(noveId) && noveId > 0)) throw new PdChyba('Pipedrive nevrátil id poznámky.', 502);
  return { id: noveId, akce: 'zalozeno' };
}

/* Smí uživatel psát do Pipedrive (B80, právo `crm.pipedrive`)? */
export function pdPoznamkaSmi(relace, matice, G = globalThis) {
  if (!relace) return false;
  if (relace.role === 'Administrátor') return true;
  const smi = G.zobrazeniSmi;
  return typeof smi === 'function' && !!smi(relace.role, PD_PRAVO, matice || null);
}

/* Uložení zakázky (functions/zakazky.mjs, ve výhradním úseku zakázky).
 * Na místě nastaví zak[PD_POZNAMKA_POLE] a vrátí { stav, volano, varovani? }:
 *   'bez'        — není co psát (vypnuto, bez dealu, bez napojení, jedna šachta bez poznámky),
 *   'beze-zmeny' — text se proti uloženému otisku nezměnil,
 *   'bez-prava'  — bylo by co psát, uživatel nemá právo crm.pipedrive (bez varování),
 *   'zalozeno' | 'upraveno' — zapsáno do Pipedrive,
 *   'strop' | 'chyba' — nezapsáno, zkusí se při dalším uložení.
 * `volano` = sahalo se do Pipedrive (volající pak čte zakázku potřetí, N1). */
export async function pdPoznamkaUlozeni(zak, stara, { viceSachet, relace, matice } = {}, G = globalThis) {
  const dealId = G.ctrlPdDealIdNorm(zak && zak.pdDealId) || '';
  /* Pole píše jen server: platí uložená verze téhož dealu, klientova se zahodí. */
  const drz = pdPoznamkaNorm(stara && stara[PD_POZNAMKA_POLE]);
  const plati = drz && dealId && drz.deal === dealId ? drz : null;
  delete zak[PD_POZNAMKA_POLE];
  if (plati) zak[PD_POZNAMKA_POLE] = plati;

  if (viceSachet !== true || !dealId || !pdNastaveno()) return { stav: 'bez' };
  let text = pdPoznamkaText(zak, G);
  /* (b) Zakázka s poznámkou přešla na jednu šachtu: poznámku nemazat, upravit. */
  if (!text && plati && !pdPoznamkaSeznam(zak, G)) {
    const v = typeof G.ridiciVarianta === 'function' ? G.ridiciVarianta(zak) : (zak.varianty || [])[0];
    const ock = v && v.data && v.data.ock;
    if (ock && typeof ock === 'object' && !G.rezimViceSachet(ock) && !G.vsTvarProblemy(ock).length)
      text = PD_POZNAMKA_JEDNA + pdPoznamkaZnacka(zak);
  }
  if (!text) return { stav: 'bez' };
  const otisk = pdPoznamkaOtisk(text);
  if (plati && plati.otisk === otisk) return { stav: 'beze-zmeny' };
  if (!pdPoznamkaSmi(relace, matice, G)) return { stav: 'bez-prava' };
  if (!(await pdStropCerstvych('deal:' + dealId, 'poznamka', PD_POZNAMKA_STROP)))
    return { stav: 'strop', varovani: 'Seznam šachet se do poznámky dealu v Pipedrive nezapsal (strop '
      + PD_POZNAMKA_STROP + ' pokusů za hodinu) — zapíše se při dalším uložení.' };
  const zavolej = volani(Date.now() + PD_POZNAMKA_CELKEM_MS);
  try {
    const r = await zapisDoPipedrive(dealId, plati ? plati.id : 0, pdPoznamkaEsc(text), zak, zavolej);
    zak[PD_POZNAMKA_POLE] = { deal: dealId, id: r.id, otisk, kdy: new Date().toISOString() };
    return { stav: r.akce, volano: true };
  } catch (e) {
    if (!(e instanceof PdChyba)) throw e;
    return { stav: 'chyba', volano: true, varovani: 'Seznam šachet se do poznámky dealu v Pipedrive nezapsal: ' + e.message
      + ' Zakázka je uložená; zápis se zkusí při dalším uložení.' };
  }
}
