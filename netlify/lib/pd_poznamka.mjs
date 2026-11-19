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
 *
 * DRUHY POZNÁMEK (VZ-E5 #604, 16. 11. 2026). Modul je zobecněný na „druh
 * poznámky“ { pole zakázky, úvod, stavba textu, prázdný stav, klíč stropu,
 * vypínač, předmět hlášek }. Šachty (PD_POZNAMKA_DRUH_SACHTY) zůstávají pod
 * dnešními jmény a s dnešním chováním; druhý druh je seznam DALŠÍCH
 * ZÁKAZNÍKŮ na zakázce (PD_POZNAMKA_DRUH_ZAKAZNICI, pole pdPoznamkaZakaznici,
 * úvod „Další zákazníci na zakázce: “, klíč stropu
 * strop:poznamka-zakaznici:deal:<id>, vypínač viceZakazniku, mez B225).
 * Text staví src/vz_poznamka.js (týž kód jako suchý běh v prohlížeči).
 * T1 (rozhodnutí J. V. 18. 11. 2026): nesedí-li organizace dealu na
 * řídícího zákazníka (podle IČO, prázdné = nesedí; jádro vzOrgNesediText),
 * nese text za seznamem řádek „Řídící zákazník v kalkulaci: C — Název
 * (organizace dealu se změní až prodejem)“ — bez IČO (mez B225). Organizaci
 * dealu dál mění jen prodej (E5b).
 * Obě poznámky se zapisují v JEDNOM uložení se SPOLEČNÝM časovým rozpočtem
 * PD_POZNAMKA_CELKEM_MS — šachty první, zákazníci druzí; nestihne-li se
 * druhá, stav „chyba“ s varováním a zkusí se při dalším uložení
 * (pdPoznamkyUlozeni; volající čte zakázku potřetí jen jednou pro obě).
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

/* VZ-E5 (#604): druh „další zákazníci“ — pole, úvod a klíč stropu. */
export const PD_POZNAMKA_ZAK_POLE = 'pdPoznamkaZakaznici';
export const PD_POZNAMKA_ZAK_UVOD = 'Další zákazníci na zakázce: ';
export const PD_POZNAMKA_ZAK_ZADNI = 'Další zákazníci na zakázce: žádní';

const ID_TVAR = /^[1-9][0-9]{0,11}$/;
const OTISK_TVAR = /^[0-9a-f]{16}$/;
const RIDICI = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g;

export function pdPoznamkaEsc(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* Obsah poznámky Pipedrive z prostého textu: řádky ('\n') escapované
 * a oddělené <br> (VZ-E5). Text šachet je jednořádkový — beze změny. */
export function pdPoznamkaObsah(text) {
  return String(text).split('\n').map(pdPoznamkaEsc).join('<br>');
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

/* VZ-E5: text poznámky dalších zákazníků (prostý text, řádky '\n') se
 * značkou zakázky, nebo '' = nic. `existuje` = zakázka už poznámku má
 * (pak bez dalších zákazníků „… žádní — nabídka <číslo>“). Seznam staví
 * src/vz_poznamka.js (vzPoznamkaText, týž kód jako suchý běh). */
export function pdPoznamkaZakText(zak, existuje = false, G = globalThis) {
  const znacka = pdPoznamkaZnacka(zak);
  if (!znacka || typeof G.vzPoznamkaText !== 'function') return '';
  const t = G.vzPoznamkaText(zak, { zadni: !!existuje });
  if (!t) return '';
  /* Značku doplní týž kód jako suchý běh (vzPoznamkaSeZnackou, VZ-E5 bod 5). */
  if (typeof G.vzPoznamkaSeZnackou === 'function') return G.vzPoznamkaSeZnackou(zak, t);
  return t.indexOf('\n') >= 0 ? t + '\n' + znacka.trim() : t + znacka;
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

/* Obsah poznámky bez značek HTML, s jednou mezerou místo bílých znaků
 * (Pipedrive může obsah obalit do <p>…</p> nebo <br> přepsat). */
const bezZnacek = (obsah, mezera) => String(obsah == null ? '' : obsah).replace(/<[^>]*>/g, mezera).trim();
const jednaMezera = (t) => t.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/* Je obsah poznámky Pipedrive „naše“ poznámka této zakázky? (escapovaný HTML;
 * Pipedrive může obsah obalit do <p>…</p> — porovnává se bez značek). */
export function pdPoznamkaJeNase(obsah, zak) {
  const t = bezZnacek(obsah, '');
  const znacka = pdPoznamkaZnacka(zak);
  return !!znacka && t.startsWith(pdPoznamkaEsc(PD_POZNAMKA_UVOD).trim()) && t.endsWith(pdPoznamkaEsc(znacka));
}

/* VZ-E5: poznámka dalších zákazníků této zakázky? Víc řádků (<br>), proto
 * se porovnává bez značek a s jednou mezerou: začíná úvodem, končí
 * „— nabídka <číslo>“ téže zakázky. */
export function pdPoznamkaZakJeNase(obsah, zak) {
  const t = jednaMezera(bezZnacek(obsah, ' '));
  const znacka = jednaMezera(pdPoznamkaEsc(pdPoznamkaZnacka(zak).trim()));
  return !!znacka && t.startsWith(jednaMezera(pdPoznamkaEsc(PD_POZNAMKA_ZAK_UVOD))) && t.endsWith(znacka);
}

/* ---------- druhy poznámek (VZ-E5) ----------
 *   pole     pole zakázky psané jen serverem { deal, id, otisk, kdy },
 *   uvod     úvod textu (rozpoznání vlastní poznámky; cizí druh se nepřepíše),
 *   text     (zak, existuje, G) → prostý text se značkou, nebo '',
 *   jeNase   (obsah, zak) → je to poznámka tohoto druhu a zakázky?
 *   strop    druh počítadla pdStropCerstvych (klíč strop:<strop>:deal:<id>),
 *   predmet  začátek varování. Vypínač předává volající (zapnuto). */
export const PD_POZNAMKA_DRUH_SACHTY = Object.freeze({
  pole: PD_POZNAMKA_POLE, uvod: PD_POZNAMKA_UVOD, strop: 'poznamka', predmet: 'Seznam šachet',
  jeNase: pdPoznamkaJeNase,
  text(zak, existuje, G) {
    const text = pdPoznamkaText(zak, G);
    if (text) return text;
    /* (b) Zakázka s poznámkou přešla na jednu šachtu: poznámku nemazat, upravit. */
    if (existuje && !pdPoznamkaSeznam(zak, G)) {
      const v = typeof G.ridiciVarianta === 'function' ? G.ridiciVarianta(zak) : (zak.varianty || [])[0];
      const ock = v && v.data && v.data.ock;
      if (ock && typeof ock === 'object' && !G.rezimViceSachet(ock) && !G.vsTvarProblemy(ock).length)
        return PD_POZNAMKA_JEDNA + pdPoznamkaZnacka(zak);
    }
    return '';
  },
});
export const PD_POZNAMKA_DRUH_ZAKAZNICI = Object.freeze({
  pole: PD_POZNAMKA_ZAK_POLE, uvod: PD_POZNAMKA_ZAK_UVOD, strop: 'poznamka-zakaznici', predmet: 'Seznam dalších zákazníků',
  jeNase: pdPoznamkaZakJeNase,
  text: (zak, existuje, G) => pdPoznamkaZakText(zak, existuje, G),
});
const DRUHY = [PD_POZNAMKA_DRUH_SACHTY, PD_POZNAMKA_DRUH_ZAKAZNICI];

/* Začíná obsah úvodem JINÉHO druhu? Taková poznámka se tímto druhem nikdy
 * nepřepíše (poznámka šachet ≠ poznámka zákazníků, VZ-E5). */
function jinyDruh(obsah, druh) {
  const t = jednaMezera(bezZnacek(obsah, ' '));
  return DRUHY.some((d) => d !== druh && t.startsWith(jednaMezera(pdPoznamkaEsc(d.uvod))));
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
async function najdiNasi(zavolej, dealId, zak, druh) {
  const seznam = await zavolej('/api/v1/notes', { dotaz: { deal_id: dealId, limit: 100, sort: 'add_time DESC' } });
  const p = (Array.isArray(seznam) ? seznam : []).find((x) => x && String(x.deal_id) === dealId
    && x.active_flag !== false && druh.jeNase(x.content, zak));
  const id = p && Number(p.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/* Zápis/úprava poznámky v Pipedrive. Vrací { id, akce }. */
async function zapisDoPipedrive(dealId, id, obsah, zak, zavolej, druh) {
  if (id) {
    let poznamka = null;
    try { poznamka = await zavolej('/api/v1/notes/' + id); }
    catch (e) { if (!(e instanceof PdChyba) || e.stav !== 404) throw e; }
    /* Jen poznámka TÉHOŽ dealu (pojistka proti podvrženému id, např. ze
     * souboru obnovy) — jinak se nesahá a hledá/zakládá se znovu. VZ-E5:
     * ani poznámka JINÉHO druhu téhož dealu (šachty ↔ zákazníci). */
    if (!(poznamka && String(poznamka.deal_id) === dealId && poznamka.active_flag !== false
      && !jinyDruh(poznamka.content, druh))) id = null;
  }
  if (!id) id = await najdiNasi(zavolej, dealId, zak, druh);
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

/* Jedna poznámka daného druhu při uložení zakázky. Na místě nastaví
 * zak[druh.pole] a vrátí { stav, volano, varovani? }:
 *   'bez'        — není co psát (vypnuto, bez dealu, bez napojení, nic k zápisu),
 *   'beze-zmeny' — text se proti uloženému otisku nezměnil,
 *   'bez-prava'  — bylo by co psát, uživatel nemá právo crm.pipedrive (bez varování),
 *   'zalozeno' | 'upraveno' — zapsáno do Pipedrive,
 *   'strop' | 'chyba' — nezapsáno, zkusí se při dalším uložení.
 * `termin` = společný konec časového rozpočtu (VZ-E5); prošlý termín =
 * 'chyba' bez volání a bez čerpání stropu. */
export async function pdPoznamkaDruhUlozeni(druh, zak, stara, { zapnuto, relace, matice, termin } = {}, G = globalThis) {
  const dealId = G.ctrlPdDealIdNorm(zak && zak.pdDealId) || '';
  /* Pole píše jen server: platí uložená verze téhož dealu, klientova se zahodí. */
  const drz = pdPoznamkaNorm(stara && stara[druh.pole]);
  const plati = drz && dealId && drz.deal === dealId ? drz : null;
  delete zak[druh.pole];
  if (plati) zak[druh.pole] = plati;

  if (zapnuto !== true || !dealId || !pdNastaveno()) return { stav: 'bez' };
  const text = druh.text(zak, !!plati, G);
  if (!text) return { stav: 'bez' };
  const otisk = pdPoznamkaOtisk(text);
  if (plati && plati.otisk === otisk) return { stav: 'beze-zmeny' };
  if (!pdPoznamkaSmi(relace, matice, G)) return { stav: 'bez-prava' };
  const konec = typeof termin === 'number' ? termin : Date.now() + PD_POZNAMKA_CELKEM_MS;
  const nezapsal = druh.predmet + ' se do poznámky dealu v Pipedrive nezapsal';
  if (konec - Date.now() <= 0)
    return { stav: 'chyba', varovani: nezapsal + ': Pipedrive neodpověděl včas. Zakázka je uložená; zápis se zkusí při dalším uložení.' };
  if (!(await pdStropCerstvych('deal:' + dealId, druh.strop, PD_POZNAMKA_STROP)))
    return { stav: 'strop', varovani: nezapsal + ' (strop '
      + PD_POZNAMKA_STROP + ' pokusů za hodinu) — zapíše se při dalším uložení.' };
  const zavolej = volani(konec);
  try {
    const r = await zapisDoPipedrive(dealId, plati ? plati.id : 0, pdPoznamkaObsah(text), zak, zavolej, druh);
    zak[druh.pole] = { deal: dealId, id: r.id, otisk, kdy: new Date().toISOString() };
    return { stav: r.akce, volano: true };
  } catch (e) {
    if (!(e instanceof PdChyba)) throw e;
    return { stav: 'chyba', volano: true, varovani: nezapsal + ': ' + e.message
      + ' Zakázka je uložená; zápis se zkusí při dalším uložení.' };
  }
}

/* Uložení zakázky — jen poznámka šachet (dnešní jméno a chování, VSD #588). */
export async function pdPoznamkaUlozeni(zak, stara, { viceSachet, relace, matice } = {}, G = globalThis) {
  return pdPoznamkaDruhUlozeni(PD_POZNAMKA_DRUH_SACHTY, zak, stara, { zapnuto: viceSachet, relace, matice }, G);
}

/* Uložení zakázky (functions/zakazky.mjs, ve výhradním úseku zakázky, VZ-E5):
 * obě poznámky v jednom společném časovém rozpočtu PD_POZNAMKA_CELKEM_MS,
 * šachty první, zákazníci druzí. Vrací { sachty, zakaznici, volano }. */
export async function pdPoznamkyUlozeni(zak, stara, { viceSachet, viceZakazniku, relace, matice, poleMapa } = {}, G = globalThis) {
  const termin = Date.now() + PD_POZNAMKA_CELKEM_MS;
  const sachty = await pdPoznamkaDruhUlozeni(PD_POZNAMKA_DRUH_SACHTY, zak, stara,
    { zapnuto: viceSachet, relace, matice, termin }, G);
  /* VZ T1 (N3): skutečná organizace dealu dřív, než se složí text poznámky zákazníků.
   * Revize N9: čtení má vlastní menší limit (PD_ORG_DEALU_MS) a poznámce
   * zákazníků z rozpočtu neukrajuje — o dobu čtení se její termín posune. */
  const zbyvalo = termin - Date.now();
  const org = await pdOrgDealuObnov(zak, { zapnuto: viceZakazniku, relace, matice, termin: Date.now() + Math.min(PD_ORG_DEALU_MS, Math.max(0, zbyvalo)), poleMapa }, G);
  const zakaznici = await pdPoznamkaDruhUlozeni(PD_POZNAMKA_DRUH_ZAKAZNICI, zak, stara,
    { zapnuto: viceZakazniku, relace, matice, termin: Date.now() + zbyvalo }, G);
  /* Revize N7: i samotné čtení organizace (zápis pdOrgDealu) vyžaduje třetí čtení zakázky. */
  return { sachty, zakaznici, org: org.stav, volano: !!(sachty.volano || zakaznici.volano || org.volano) };
}

/* SKUTEČNÁ ORGANIZACE DEALU (VZ T1, revize N3, rozhodnutí J. V. 18. 11. 2026).
 * Při uložení zakázky s víc zákazníky (vypínač viceZakazniku, deal, napojení
 * nebo simulátor, právo crm.pipedrive) server přečte deal a jeho organizaci
 * a zapíše do `zak.pdOrgDealu` { deal, org, ico, nazev, kdy } — řádek
 * „Řídící zákazník v kalkulaci“ se pak řídí skutečnou organizací, ne odhadem.
 * Jen čtení (GET deal, GET organizace), nejvýš jednou za PD_ORG_DEALU_STARI_MS
 * na zakázku a deal, strop PD_ORG_DEALU_STROP čtení za hodinu na deal, vlastní
 * limit PD_ORG_DEALU_MS (revize N9). Žádná chyba nic nezastaví (revize N8;
 * zůstává uložená hodnota, nebo odhad). Uloženou hodnotu z uložené verze drží
 * pdOrgDealuDrz (zakazka_kontrola.mjs) — tady se jen obnovuje. Vrací
 * { stav, volano } — `volano` = mluvilo se s Pipedrive (revize N7: třetí čtení). */
export const PD_ORG_DEALU_MS = 2500;   // revize N9: vlastní limit čtení organizace (mimo rozpočet poznámek)
export const PD_ORG_DEALU_STARI_MS = 3600 * 1000;
export const PD_ORG_DEALU_STROP = 20;
export async function pdOrgDealuObnov(zak, { zapnuto, relace, matice, termin, poleMapa, ted } = {}, G = globalThis) {
  const bez = (stav) => ({ stav, volano: false });
  const dealId = (zak && typeof G.ctrlPdDealIdNorm === 'function' && G.ctrlPdDealIdNorm(zak.pdDealId)) || '';
  if (zapnuto !== true || !dealId || !pdNastaveno() || typeof G.vzRezim !== 'function' || !G.vzRezim(zak)
    || typeof G.vzOrgDealuNorm !== 'function' || typeof poleMapa !== 'function') return bez('bez');
  if (typeof G.vzProdanaVarianta === 'function' && G.vzProdanaVarianta(zak)) return bez('bez');   // po prodeji organizaci řeší E5b
  const nyni = typeof ted === 'number' ? ted : Date.now();
  const znama = G.vzOrgDealuNorm(zak.pdOrgDealu);
  if (znama && znama.deal === dealId && znama.kdy && nyni - Date.parse(znama.kdy) < PD_ORG_DEALU_STARI_MS) return bez('cerstva');
  if (!pdPoznamkaSmi(relace, matice, G)) return bez('bez-prava');
  const konec = typeof termin === 'number' ? termin : nyni + PD_ORG_DEALU_MS;
  if (konec - Date.now() <= 0) return bez('chyba');
  /* Revize N8: čtení je informativní — žádná chyba (ani úložiště mapy polí) uložení nezastaví. */
  try {
    if (!(await pdStropCerstvych('deal:' + dealId, 'org-dealu', PD_ORG_DEALU_STROP))) return bez('strop');
  } catch (e) { return bez('chyba'); }
  const zavolej = volani(konec);
  let volano = false;
  try {
    const mapa = await Promise.race([poleMapa(), new Promise((_, ne) => {
      const t = setTimeout(() => ne(new PdChyba('Pipedrive neodpověděl včas.', 504)), Math.max(1, konec - Date.now()));
      if (t && t.unref) t.unref();
    })]);
    const hashIco = mapa && mapa.mapaOrganizace && mapa.mapaOrganizace.ico;
    volano = true;
    const d = await zavolej('/api/v2/deals/' + Number(dealId));
    if (!d) return { stav: 'chyba', volano };
    const orgId = Number(d.org_id) || 0;
    let ico = '', nazev = '';
    if (orgId) {
      const o = await zavolej('/api/v2/organizations/' + orgId);
      nazev = o && typeof o.name === 'string' ? o.name : '';
      const surove = hashIco && o ? ((o.custom_fields || {})[hashIco]) : '';
      const c = String(surove == null ? '' : surove).replace(/\D/g, '');
      ico = c && c.length <= 8 ? c.padStart(8, '0') : '';
    }
    const v = G.vzOrgDealuNorm({ deal: dealId, org: orgId, ico, nazev, kdy: new Date().toISOString() });
    if (v) zak.pdOrgDealu = v;
    return { stav: 'precteno', volano };
  } catch (e) {
    return { stav: 'chyba', volano };
  }
}
