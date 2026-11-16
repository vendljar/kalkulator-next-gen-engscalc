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
 * Jen názvy dalších zákazníků, čísla, dny a ceny ODESLANÝCH nabídek — žádné
 * kontakty, osoby, IČO ani slevy (mez B225). Řídící zákazník v seznamu není
 * (deal vede on). Strop délky seznamu VZP_MAX znaků (bez značky) s řádkem
 * „… a další N“, řídicí znaky pryč.
 *
 * „Platná nabídka“ (poslední ODESLANÁ nabídka zákazníka): dokud E3 nepočítá
 * `platna` na serveru, bere se `d.platna` (píše jen server, vzPlatnaDrz) a bez
 * ní poslední tisk v zámcích s razítkem `zakaznik.id` tohoto zákazníka
 * (zamek.tisky[].zakaznik, E3). Po sloučení E3 nahradit vzPlatna (PREDAVKA).
 * Cena jen ze ZMRAZENÉHO výsledku zámku (zamekVysledek), bez DPH, vedoucí
 * strana; starý zámek bez výsledku = bez ceny (nic se nepřepočítává).
 * ============================================================ */

const VZP_UVOD = 'Další zákazníci na zakázce: ';
const VZP_ZADNI = 'Další zákazníci na zakázce: žádní';
const VZP_MAX = 2000;
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
  return c ? c + (pismeno ? '-' + pismeno : '') : '';
}

/* Cena odeslané nabídky ze zmrazeného výsledku zámku (vedoucí strana, bez DPH). */
function vzpCenaZamku(zak, v) {
  const r = (typeof zamekVysledek === 'function') ? zamekVysledek(v) : null;
  if (!r) return null;
  const d = (v && v.data) || {};
  try {
    const proj = (typeof zakazkaVedouciStrana === 'function') && zakazkaVedouciStrana(zak) === 'proj';
    const cn = proj
      ? ((typeof cenaNabidkyProj === 'function' && r.proj)
        ? cenaNabidkyProj(r.proj, d.slevaProj, (typeof zaokrProjZ === 'function') ? zaokrProjZ(d) : d.zaokr) : null)
      : ((typeof cenaNabidkyOck === 'function' && r.ock) ? cenaNabidkyOck(r.ock, d.sleva || {}, d.zaokr) : null);
    return cn && typeof cn.cena === 'number' && isFinite(cn.cena) ? cn.cena : null;
  } catch (e) { return null; }
}

/* Poslední ODESLANÁ nabídka dalšího zákazníka { varianta, cislo, kdy, cena, mena } | null. */
function vzpPlatna(zak, d) {
  if (!d) return null;
  const p = d.platna;
  if (vzpObj(p) && typeof p.cislo === 'string' && p.cislo.trim() && typeof p.kdy === 'string' && vzpDen(p.kdy))
    return { varianta: String(p.varianta || ''), cislo: p.cislo, kdy: p.kdy,
      cena: typeof p.cena === 'number' && isFinite(p.cena) ? p.cena : null, mena: typeof p.mena === 'string' ? p.mena : 'CZK' };
  let nej = null;
  ((zak && Array.isArray(zak.varianty)) ? zak.varianty : []).forEach(v => {
    const z = v && v.zamek;
    if (!z || !z.zamceno || !Array.isArray(z.tisky)) return;
    z.tisky.forEach(t => {
      if (!t || !vzpObj(t.zakaznik) || String(t.zakaznik.id || '') !== String(d.id) || !vzpDen(t.kdy)) return;
      if (!nej || t.kdy > nej.t.kdy) nej = { v, t };
    });
  });
  if (!nej) return null;
  const zk = nej.t.zakaznik;
  const cislo = (typeof zk.cislo === 'string' && zk.cislo.trim()) ? zk.cislo
    : vzpCisloNabidky(zak, nej.v, typeof zk.pismeno === 'string' ? zk.pismeno : d.pismeno);
  return { varianta: String(nej.v.id || ''), cislo, kdy: nej.t.kdy, cena: vzpCenaZamku(zak, nej.v), mena: 'CZK' };
}

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
  const p = vzpPlatna(zak, d);
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
    if (r.length) return [VZP_UVOD.trim()].concat(r).join('\n');
  }
  return o.zadni ? VZP_ZADNI : '';
}

if (typeof module !== 'undefined' && module.exports)
  module.exports = { VZP_UVOD, VZP_ZADNI, VZP_MAX, vzpDen, vzpCena, vzpCisloNabidky, vzpCenaZamku, vzpPlatna,
    vzpNeprodano, vzpRadek, vzPoznamkaRadky, vzPoznamkaText };
