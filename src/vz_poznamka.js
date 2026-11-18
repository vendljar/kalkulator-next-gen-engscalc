/* ============================================================
 * VÍC ZÁKAZNÍKŮ — TEXT POZNÁMKY DEALU „Další zákazníci na zakázce“
 * (VZ-E5 #604, návrh § 7.2, rozhodnutí J. V. 16. 11. 2026)
 *
 * Jeden kód pro server (netlify/lib/pd_poznamka.mjs — poznámku zakládá
 * a přepisuje uložení zakázky) i prohlížeč (src/pd_nanecisto.js — řádek
 * suchého běhu „Poznámka dealu — další zákazníci“). Prostý text, řádky
 * oddělené '\n'; escapování a `<br>` doplní až zápis (pdPoznamkaEsc).
 *
 *   Další zákazníci na zakázce:
 *   • BETA Development a.s. — CN 2026 - OPR - CN - 9940.2-B z 12. 11. 2026, 1 333 000 Kč bez DPH
 *   • GAMA invest s.r.o. — nabídka zatím neodeslána (2026 - OPR - CN - 9940-C)
 *   — nabídka 2026 - OPR - CN - 9940
 *
 * T1: nesedí-li organizace dealu na řídícího zákazníka, přibude za seznamem
 * řádek „Řídící zákazník v kalkulaci: C — Název (organizace dealu se změní
 * až prodejem)“ (jádro vzOrgNesediText).
 *
 * Jen názvy dalších zákazníků, čísla, dny a ceny ODESLANÝCH nabídek — žádné
 * kontakty, osoby, IČO ani slevy (mez B225). Řídící zákazník v seznamu není
 * (deal vede on). Strop délky seznamu VZP_MAX znaků (bez značky) s řádkem
 * „… a další N“, řídicí znaky pryč.
 *
 * „Platná nabídka“ (poslední ODESLANÁ nabídka zákazníka) = vzPlatna z jádra
 * (VZ-E3 #602): poslední tisk v zámcích s razítkem `zakaznik.id` tohoto
 * zákazníka. Cena jen ze ZMRAZENÉHO výsledku zámku (vzCenaZamku), bez DPH,
 * vedoucí strana; starý zámek bez výsledku = bez ceny.
 * ============================================================ */

const VZP_UVOD = 'Další zákazníci na zakázce: ';
const VZP_ZADNI = 'Další zákazníci na zakázce: žádní';
const VZP_MAX = 2000;
const VZP_T1_MAX = 700;   // řádek T1: název řídícího ≤ 500 znaků + věta
const VZP_RIDICI = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g;
const VZP_KDY = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

const vzpObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
const vzpCisty = t => String(t == null ? '' : t).replace(VZP_RIDICI, ' ').replace(/\s+/g, ' ').trim();

/* Den v českém čase „12. 11. 2026“ (bez Intl den v UTC). */
function vzpDen(iso) {
  const s = typeof iso === 'string' ? iso : '';
  if (!VZP_KDY.test(s)) return '';
  const d = new Date(s);
  if (isNaN(d)) return '';
  let ymd;
  try { ymd = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Prague' }).format(d); }
  catch (e) { ymd = d.toISOString().slice(0, 10); }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  return m ? (+m[3]) + '. ' + (+m[2]) + '. ' + m[1] : '';
}

/* „1 333 000 Kč“ — mezery v tisících (obyčejné), haléře jen nenulové. */
function vzpCena(cena, mena) {
  if (typeof cena !== 'number' || !isFinite(cena)) return '';
  const [cele, des] = Math.abs(cena).toFixed(2).split('.');
  const t = cele.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (des === '00' ? '' : ',' + des);
  const m = String(mena || 'CZK').toUpperCase();
  return (cena < 0 ? '−' : '') + t + ' ' + (m === 'CZK' ? 'Kč' : (/^[A-Z]{3}$/.test(m) ? m : 'Kč'));
}

/* Číslo nabídky zákazníka nad variantou: číslo varianty + „-písmeno“.
 * (E2 zavádí číslování po zákaznících — po sloučení převzít jeho funkci.) */
function vzpCisloNabidky(zak, v, pismeno) {
  const zaklad = (typeof variantaCislo === 'function' && v) ? variantaCislo(zak, v) : String((zak && zak.cislo) || '');
  const c = vzpCisty(zaklad);
  /* VZ-E2 #601: písmeno skládá vzCisloSPismenem (tvar B–Z, nedopsaná předloha bez písmene). */
  if (c && typeof vzCisloSPismenem === 'function') return vzCisloSPismenem(c, pismeno || '');
  return c ? c + (pismeno ? '-' + pismeno : '') : '';
}

/* Platná nabídka a její cena: VZ-E3 (#602) — vzPlatna(zak, id) v jádře
 * (src/vice_zakazniku.js; server ji ukládá do `platna` při každém uložení). */

/* Je zakázka prodaná jinému zákazníkovi než `d`? (prodano.zakaznik plní E4;
 * prodej bez něj patří řídícímu.) */
function vzpNeprodano(zak, d) {
  const prod = ((zak && Array.isArray(zak.varianty)) ? zak.varianty : [])
    .filter(v => (typeof variantaProdana === 'function') ? variantaProdana(v) : !!(v && vzpObj(v.prodano)));
  if (!prod.length) return false;
  return !prod.some(v => String(v.prodano.zakaznik || '') === String(d.id));
}

/* Řádek jednoho dalšího zákazníka (bez odrážky). */
function vzpRadek(zak, d) {
  const nazev = vzpCisty(d.hlavicka && d.hlavicka.objednatel) || ('zákazník ' + (d.pismeno || d.id));
  const v = ((zak && zak.varianty) || []).find(x => x && String(x.id) === String(d.varianta)) || null;
  const aktualni = vzpCisloNabidky(zak, v, d.pismeno);
  const p = vzPlatna(zak, d.id);   // VZ-E3 #602 (dřív vzpPlatna)
  let stav;
  if (p) {
    const cena = vzpCena(p.cena, p.mena);
    stav = 'CN ' + vzpCisty(p.cislo) + ' z ' + vzpDen(p.kdy) + (cena ? ', ' + cena + ' bez DPH' : '');
    if (v && String(v.id) !== p.varianta) stav += '; připravuje se nová ' + aktualni;
  } else stav = 'nabídka zatím neodeslána' + (aktualni ? ' (' + aktualni + ')' : '');
  if (vzpNeprodano(zak, d)) stav += ' — neprodáno';
  return vzpCisty(nazev + ' — ' + stav);
}

/* Seznam dalších zákazníků jako řádky (bez úvodu a značky); strop VZP_MAX. */
function vzPoznamkaRadky(zak) {
  const dalsi = (typeof vzZakaznici === 'function') ? vzZakaznici(zak).filter(x => !x.ridici) : [];
  const radky = dalsi.map(d => '• ' + vzpRadek(zak, d));
  let delka = VZP_UVOD.trim().length;
  const out = [];
  for (let i = 0; i < radky.length; i++) {
    const zbyva = radky.length - i;
    const dalsiRadek = radky[i].length > VZP_MAX ? radky[i].slice(0, VZP_MAX - 1) + '…' : radky[i];
    const konec = zbyva > 1 ? ('\n… a další ' + (zbyva - 1)).length : 0;
    if (delka + 1 + dalsiRadek.length + konec > VZP_MAX) { out.push('… a další ' + zbyva); break; }
    out.push(dalsiRadek);
    delka += 1 + dalsiRadek.length;
  }
  return out;
}

/* Celý text poznámky (prostý text, řádky '\n') bez značky zakázky:
 *   víc zákazníků → úvod + řádky; `zadni` (poznámka už existuje, další
 *   zákazníci nejsou) → VZP_ZADNI; jinak ''. */
function vzPoznamkaText(zak, volby) {
  const o = volby || {};
  if (typeof vzRezim === 'function' && vzRezim(zak)) {
    const r = vzPoznamkaRadky(zak);
    /* T1 (rozhodnutí J. V. 18. 11. 2026): organizace dealu nesedí na řídícího
     * zákazníka (jádro vzOrgNesediText — bez IČO, jen písmeno a název) →
     * řádek „Řídící zákazník v kalkulaci: …" za seznamem. Řídící dál není
     * mezi dalšími. */
    const t1 = typeof vzOrgNesediText === 'function' ? vzpCisty(vzOrgNesediText(zak, false)).slice(0, VZP_T1_MAX) : '';
    if (r.length) return [VZP_UVOD.trim()].concat(r, t1 ? [t1] : []).join('\n');
  }
  return o.zadni ? VZP_ZADNI : '';
}

/* Text poznámky se ZNAČKOU zakázky (prostý text) — jeden kód pro server
 * (pd_poznamka.mjs pdPoznamkaZakText, zápis) i suchý běh (pd_nanecisto.js,
 * řádek „Poznámka dealu — další zákazníci“), aby náhled ukázal přesně to, co
 * se zapíše. Značka „— nabídka <číslo>“ (číslo zakázky bez řídicích znaků,
 * nejvýš VZP_CISLO_MAX znaků — totéž jako pdPoznamkaZnacka): u víceřádkového
 * textu na samostatném řádku, u jednořádkového („… žádní“) za textem.
 * Bez textu nebo bez čísla zakázky ''. */
const VZP_CISLO_MAX = 120;
function vzPoznamkaSeZnackou(zak, text) {
  const t = typeof text === 'string' ? text : '';
  const c = String((zak && zak.cislo) || '').replace(VZP_RIDICI, ' ').trim().slice(0, VZP_CISLO_MAX);
  if (!t || !c) return '';
  return t.indexOf('\n') >= 0 ? t + '\n— nabídka ' + c : t + ' — nabídka ' + c;
}

if (typeof module !== 'undefined' && module.exports)
  module.exports = { VZP_UVOD, VZP_ZADNI, VZP_MAX, VZP_T1_MAX, VZP_CISLO_MAX, vzpDen, vzpCena, vzpCisloNabidky,
    vzpNeprodano, vzpRadek, vzPoznamkaRadky, vzPoznamkaText, vzPoznamkaSeZnackou };
