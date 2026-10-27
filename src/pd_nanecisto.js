/* ============================================================
 * SUCHÝ BĚH ZÁPISU DO PIPEDRIVE — PODKLAD ZE ZAKÁZKY (#536, 27. 10. 2026)
 *
 * „Co by se zapsalo do Pipedrive": prohlížeč složí z krycích listů ŘÍDÍCÍ
 * varianty (ta se do CRM zapisuje, ne otevřená) podklad pro každou stranu
 * — tentýž tvar, jaký čte převod netlify/lib/pd_prevod.mjs (pdDoPd):
 *   hodnoty   id pole krycího listu → text, jak ho ukazuje krycí list,
 *   rucne     ruční přepisy (pole s `jenRucne` posílají jen ruční hodnotu),
 *   atyp      ATYP z kalkulace OCK,
 *   kalendar  PROJ: platební kalendář smlouvy (planPdKalendar, #512),
 *   cena      cena strany bez DPH jako v nabídce (hodnota dealu, #512),
 *   mena      'CZK' (hodnota dealu je vždy v korunách).
 * Převod, výběr strany a kolize počítá server (/api/pd/nanecisto) TOUŽ
 * logikou jako budoucí zápis (#115). Nic se neodesílá do Pipedrive.
 *
 * Strany: Pipedrive eviduje OCK a PROJ zvlášť (P6, J. V. 1. 10. 2026), takže
 * se posílá jen VEDOUCÍ strana zakázky (zakazkaVedouciStrana). Bez čísla
 * nabídky na obou stranách jdou obě — a náhled upozorní, že by zápis nevěděl,
 * pod kterým číslem.
 * ============================================================ */

const PDN_STAVY = {
  zapise: { text: 'zapíše se', pill: '', popis: 'hodnota se převedla a do Pipedrive by odešla' },
  nelze: { text: 'nelze převést', pill: 'bad', popis: 'hodnota je vyplněná, ale do pole Pipedrive ji převést nejde — nezapíše se' },
  chybiPole: { text: 'chybí pole v CRM', pill: 'bad', popis: 'pole v Pipedrive není (nebo má jiný typ) — nic se nezapíše' },
  neovereno: { text: 'dohledá zápis', pill: 'warn', popis: 'uživatele Pipedrive dohledá až zápis podle e-mailu nebo jména' },
  prazdne: { text: 'nevyplněno', pill: 'mut', popis: 'v kalkulaci prázdné — do Pipedrive nic (zápis nikdy nemaže)' },
};

/* Popisky polí krycího listu pro sloupec „Zdroj": „Krycí list OCK › Sekce › Pole". */
function pdnPopisky(sekce, nadpis) {
  const out = {};
  (sekce || []).forEach(s => (s.pole || []).forEach(p => {
    if (p && p.id) out[p.id] = nadpis + ' › ' + s.sekce + ' › ' + String(p.label || p.id).replace(/<[^>]*>/g, '');
  }));
  return out;
}

function pdnText(v) { return v === null || v === undefined ? '' : String(v).trim(); }

function pdnStranaOck(zak, v, jekly) {
  const c = kryciCtx(zak, v, jekly);
  const kl = (v.data && v.data.kryci) || { hodnoty: {} };
  const hodnoty = {};
  KRYCI_SEKCE.forEach(s => s.pole.forEach(p => {
    let x = '';
    try { x = kryciHodnota(p, kl, c); } catch (e) { x = ''; }
    hodnoty[p.id] = pdnText(x);
  }));
  let cena = null;
  try {
    const r = (typeof vysledekStrany === 'function') ? vysledekStrany(zak, v, 'ock', jekly) : vypocetZ(v, jekly);
    const d = v.data || {};
    const cn = (r && typeof cenaNabidkyOck === 'function') ? cenaNabidkyOck(r, d.sleva || {}, d.zaokr) : null;
    if (cn && isFinite(+cn.cena)) cena = +cn.cena;
  } catch (e) { cena = null; }
  const zad = (v.data && v.data.ock && v.data.ock.zadani) || {};
  const out = { hodnoty, rucne: Object.assign({}, kl.hodnoty || {}), atyp: !!zad.atyp, mena: 'CZK' };
  if (cena !== null) out.cena = cena;
  return out;
}

function pdnStranaProj(zak, v) {
  const c = kryciProjCtx(zak, v);
  const kl = (v.data && v.data.kryciProj) || { hodnoty: {} };
  const hodnoty = {};
  KRYCI_PROJ_SEKCE.forEach(s => s.pole.forEach(p => {
    let x = '';
    try {
      const vidi = (typeof kryciProjPoleViditelne !== 'function') || kryciProjPoleViditelne(p, c);
      x = vidi ? kryciProjHodnota(p, kl, c) : '';
    } catch (e) { x = ''; }
    hodnoty[p.id] = pdnText(x);
  }));
  let cena = null, kalendar = '';
  try {
    const d = v.data || {};
    const r = (typeof vysledekStrany === 'function') ? vysledekStrany(zak, v, 'proj') : vypocetProjZ(v);
    const zaokrP = (typeof zaokrProjZ === 'function') ? zaokrProjZ(d) : d.zaokr;
    const cn = (r && typeof cenaNabidkyProj === 'function') ? cenaNabidkyProj(r, d.slevaProj, zaokrP) : null;
    if (cn && isFinite(+cn.cena)) cena = +cn.cena;
  } catch (e) { cena = null; }
  try {
    if (typeof nabidkaProjPlatby === 'function' && typeof planPdKalendar === 'function')
      kalendar = pdnText(planPdKalendar(nabidkaProjPlatby(zak, v, 'cz')));
  } catch (e) { kalendar = ''; }
  const out = { hodnoty, rucne: Object.assign({}, kl.hodnoty || {}), kalendar, mena: 'CZK' };
  if (cena !== null) out.cena = cena;
  return out;
}

/* Podklad pro POST /api/pd/nanecisto. `volby.stav` ('won' / 'lost' / 'open')
 * přidá přepnutí stavu dealu — tlačítko „Prodáno" (C4 #540) volá
 * pdnPodklad(zak, jekly, { stav: 'won' }) a podklad pošle na tentýž endpoint;
 * odpověď nese `patch` (tělo zamýšleného PATCH) a tabulku náhledu. */
function pdnPodklad(zak, jekly, volby) {
  if (!zak || !Array.isArray(zak.varianty) || !zak.varianty.length) return { ok: false, chyba: 'Není otevřená žádná zakázka.' };
  const v = (typeof ridiciVarianta === 'function') ? ridiciVarianta(zak) : zak.varianty[0];
  const vedouci = (typeof zakazkaVedouciStrana === 'function') ? zakazkaVedouciStrana(zak) : '';
  const strany = {}, zdroje = {}, upozorneni = [];
  if (vedouci !== 'proj') {
    strany.ock = pdnStranaOck(zak, v, jekly);
    zdroje.ock = pdnPopisky(KRYCI_SEKCE, 'Krycí list OCK');
  }
  if (vedouci !== 'ock') {
    strany.proj = pdnStranaProj(zak, v);
    zdroje.proj = pdnPopisky(KRYCI_PROJ_SEKCE, 'Krycí list PROJ');
  }
  if (!vedouci) upozorneni.push('Zakázka nemá číslo nabídky OCK ani PROJ — v Pipedrive se OCK a PROJ evidují zvlášť '
    + 'pod vlastním číslem, zápis by nevěděl, kam patří. Náhled ukazuje obě strany; u stejného pole by vyhrála OCK.');
  if (zak.aktivni && v.id !== zak.aktivni) upozorneni.push('Do Pipedrive se zapisuje ŘÍDÍCÍ varianta „' + (v.nazev || v.id)
    + '", ne ta, která je právě otevřená.');
  const deal = (typeof ctrlPdDealIdNorm === 'function') ? ctrlPdDealIdNorm(zak.pdDealId) : pdnText(zak.pdDealId);
  const out = { ok: true, strany, zdroje, dealId: deal || null, upozorneni, varianta: { id: v.id, nazev: v.nazev || '' }, vedouci };
  if (volby && volby.stav) out.stav = volby.stav;
  return out;
}

/* Tělo POST /api/pd/nanecisto z podkladu (UI karty i C4 „Prodáno"). */
function pdnTelo(p) {
  const t = { strany: p.strany, zdroje: p.zdroje, dealId: p.dealId };
  if (p.stav) t.stav = p.stav;
  return t;
}

/* ---------- export pro integrátora ----------
 * Konvence názvů souborů `TYP_rok-OBSAH_verze.přípona` (E1 #533 ji zavádí
 * souběžně — tady lokálně, koordinace po sloučení sjednotí): typ PIPEDRIVE,
 * rok, obsah = číslo nabídky bez roku (jen písmena, číslice a pomlčky), verze aplikace. */
function pdnNazevSouboru(zak, verze) {
  /* Konvence názvů exportů (#533): PIPEDRIVE_<číslo zakázky>-NANECISTO_<verze>.csv */
  const f = (typeof nazevExportu === 'function') ? nazevExportu : require('./nazvy_souboru.js').nazevExportu;
  return f('pipedrive-nanecisto', { cislo: zak && zak.cislo, verze: verze || undefined });
}

/* CSV (středník, BOM kvůli Excelu, buňky přes csvBunka — B83). */
function pdnCsv(vysledek, meta) {
  const m = meta || {};
  const bunka = (typeof csvBunka === 'function') ? csvBunka : (t => '"' + String(t == null ? '' : t).replace(/"/g, '""') + '"');
  const radek = pole => pole.map(bunka).join(';');
  const out = [
    radek(['Suchý běh zápisu do Pipedrive — nic se neodeslalo']),
    radek(['Zakázka', m.cislo || '', m.nazevAkce || '']),
    radek(['Řídící varianta', m.varianta || '']),
    radek(['Režim', m.rezim || '', m.deal ? 'deal ' + m.deal : 'bez dealu']),
    radek(['Verze aplikace', m.verze || '']),
    '',
    radek(['Pole v Pipedrive', 'Typ pole', 'Hodnota k zápisu', 'Zdroj v kalkulaci', 'Hodnota v kalkulaci',
      'Stav', 'Důvod', 'Kolize', 'Dnes v Pipedrive']),
  ];
  ((vysledek && vysledek.radky) || []).forEach(r => out.push(radek([
    r.nazev, r.typ, r.hodnotaText, r.zdroj, r.hodnotaKalkulace,
    (PDN_STAVY[r.stav] || {}).text || r.stav, r.duvod, (r.kolize || []).join(' | '), r.vCrm,
  ])));
  ((vysledek && vysledek.varovani) || []).forEach(t => out.push(radek(['Upozornění', t])));
  return '﻿' + out.join('\r\n') + '\r\n';
}

if (typeof module !== 'undefined')
  module.exports = { PDN_STAVY, pdnPopisky, pdnPodklad, pdnTelo, pdnStranaOck, pdnStranaProj, pdnNazevSouboru, pdnCsv };
