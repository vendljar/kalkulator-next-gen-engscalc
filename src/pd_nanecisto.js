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
  /* PD2: pole „jen do prázdného“ je v dealu vyplněné, platby mimo pole Platba 1–8. */
  ponechano: { text: 'ponechá se', pill: 'mut', popis: 'v Pipedrive zůstane, co tam je — kalkulátor doplňuje jen prázdné pole' },
};

/* Popisky polí krycího listu pro sloupec „Zdroj": „Krycí list OCK › Sekce › Pole". */
function pdnPopisky(sekce, nadpis) {
  const out = {};
  (sekce || []).forEach(s => (s.pole || []).forEach(p => {
    if (p && p.id && !p.mimoPipedrive) out[p.id] = nadpis + ' › ' + s.sekce + ' › ' + String(p.label || p.id).replace(/<[^>]*>/g, '');
  }));
  return out;
}

function pdnText(v) { return v === null || v === undefined ? '' : String(v).trim(); }

/* K53-N3 (PD2 #782): „Nabídku vypracoval“ jde do Pipedrive jako UŽIVATEL
 * podle e-mailu. Předvyplnění krycího listu bere přihlášeného uživatele
 * (zpracovatelKontaktProKryci) — na serveru, který zápis skládá, přihlášený
 * „není“ a hodnota spadla na Firmu (jméno bez e-mailu → „mezi uživateli
 * Pipedrive není“, kola 53–58). Pro Pipedrive proto platí: ruční hodnota
 * krycího listu > snímek zpracovatele ze zámku zapisované varianty (#665 —
 * kdo nabídku odeslal: jméno, telefon, e-mail) > dnešní předvyplnění.
 * Varianta bez snímku (starší zámek, nezamčená) = beze změny. */
function pdnZpracovatelZeZamku(v) {
  const z = v && v.zamek;
  const s = z && z.zamceno === true && z.zpracovatel;
  if (!s || typeof s !== 'object' || Array.isArray(s)) return '';
  const t = x => pdnText(x).replace(/[\u0000-\u001f\u007f,]+/g, ' ').replace(/\s+/g, ' ').trim();
  const email = t(s.email);
  if (!email) return '';
  return [[t(s.titul), t(s.jmeno)].filter(Boolean).join(' '), t(s.telefon), email].filter(Boolean).join(', ');
}
function pdnVypracoval(hodnoty, kl, v) {
  const ruc = kl && kl.hodnoty && kl.hodnoty.dodZpracoval;
  if (ruc !== undefined && ruc !== null && String(ruc).trim() !== '') return;
  const zz = pdnZpracovatelZeZamku(v);
  if (zz) hodnoty.dodZpracoval = zz;
}

/* PD2 Platba 1–8: platby dopočtu plánu (TÝŽ dopočet jako text Platebního
 * kalendáře, planPdKalendar) podle milníku do polí Platba 1–8 — pořadí
 * PLAN_SODP_STARE (planSodStareSymboly). Co poli neodpovídá → `mimo` (jen
 * v textu kalendáře). Plán z doby před plánem plateb, nesedící součet nebo
 * EUR (pole jsou v Kč) = nic. */
function pdnPlatby(pl) {
  if (!pl || pl.stary || pl.eur || !pl.dopocet || !pl.dopocet.sedi || typeof planSodStareSymboly !== 'function') return null;
  const r = planSodStareSymboly(pl.dopocet, n => String(n));
  const platby = {};
  Object.keys(r.symboly).forEach(k => {
    const m = /^SODP_PLATBA([1-8])_KC$/.exec(k);
    const c = Number(r.symboly[k]);
    if (m && isFinite(c)) platby[m[1]] = c;
  });
  const mimo = (r.navic || []).map(x => ({ text: pdnText(x.text).replace(/[.\s]+$/, ''), castka: Number(x.castka) }));
  return { platby, mimo };
}

function pdnStranaOck(zak, v, jekly) {
  const c = kryciCtx(zak, v, jekly);
  const kl = (v.data && v.data.kryci) || { hodnoty: {} };
  const hodnoty = {};
  KRYCI_SEKCE.forEach(s => s.pole.forEach(p => {
    if (p.mimoPipedrive) return;   // RP: ruční položky v ceně do CRM nejdou
    let x = '';
    try { x = kryciHodnota(p, kl, c); } catch (e) { x = ''; }
    hodnoty[p.id] = pdnText(x);
  }));
  let cena = null, vo = null;
  try {
    const r = (typeof vysledekStrany === 'function') ? vysledekStrany(zak, v, 'ock', jekly) : vypocetZ(v, jekly);
    const d = v.data || {};
    const cn = (r && typeof cenaNabidkyOck === 'function') ? cenaNabidkyOck(r, d.sleva || {}, d.zaokr) : null;
    if (cn && isFinite(+cn.cena)) cena = +cn.cena;
    vo = (typeof vsVystup === 'function') ? vsVystup(r) : null;
  } catch (e) { cena = null; }
  const zad = (v.data && v.data.ock && v.data.ock.zadani) || {};
  /* VS-E5 (#595, R6): víc šachet — hodnota dealu = cena celé nabídky (beze
   * změny), ATYP, je-li atypická kterákoli šachta, a seznam šachet do
   * poznámky dealu (`sachty`; náhled — poznámku do Pipedrive píše server
   * při uložení zakázky z uložených dat, VSD lib/pd_poznamka.mjs; tenhle
   * text se nikam nezapisuje). Jedna šachta = podklad beze změny. */
  pdnVypracoval(hodnoty, kl, v);
  const out = { hodnoty, rucne: pdnRucne(kl, zak),
    atyp: vo ? vsAtyp(v.data && v.data.ock) : !!zad.atyp, mena: 'CZK' };
  if (cena !== null) out.cena = cena;
  if (vo) out.sachty = 'Šachty v nabídce: ' + vsPredmetText(vo);
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
  pdnVypracoval(hodnoty, kl, v);
  let cena = null, kalendar = '', platby = null;
  try {
    const d = v.data || {};
    const r = (typeof vysledekStrany === 'function') ? vysledekStrany(zak, v, 'proj') : vypocetProjZ(v);
    const zaokrP = (typeof zaokrProjZ === 'function') ? zaokrProjZ(d) : d.zaokr;
    const cn = (r && typeof cenaNabidkyProj === 'function') ? cenaNabidkyProj(r, d.slevaProj, zaokrP) : null;
    if (cn && isFinite(+cn.cena)) cena = +cn.cena;
  } catch (e) { cena = null; }
  try {
    if (typeof nabidkaProjPlatby === 'function' && typeof planPdKalendar === 'function') {
      const pl = nabidkaProjPlatby(zak, v, 'cz');
      kalendar = pdnText(planPdKalendar(pl));
      if (kalendar) platby = pdnPlatby(pl);
    }
  } catch (e) { kalendar = ''; platby = null; }
  const out = { hodnoty, rucne: pdnRucne(kl, zak), kalendar, mena: 'CZK' };
  if (platby) { out.platby = platby.platby; out.platbyMimo = platby.mimo; }
  if (cena !== null) out.cena = cena;
  return out;
}

/* #673 (VZ-F2-R1): krycí listy pro Pipedrive vždy ZA ŘÍDÍCÍHO zákazníka.
 * Ruční pole zákazníka (zástupci, podpisy, kopie faktur, zmocnitel) zapsaná
 * u dalšího zákazníka leží v téže variantě (`kl.hodnoty` + `vzVlastnik`,
 * `hodnotyZakaznika`) — ze surové zakázky by je krycí list ukázal jako údaje
 * řídícího. Proto pohled řídícího (vzTiskPohled) a jeho kopie varianty bez
 * cizích ručních hodnot (vzVariantaBezCizichKl). Platí pro suchý běh i pro
 * budoucí ostrý zápis (#115) — obojí skládá tenhle podklad. Zakázka
 * s jedním zákazníkem → tytéž objekty (beze změny). */
function pdnPohledRidiciho(zak, v) {
  if (typeof vzRezim !== 'function' || !vzRezim(zak)) return { zak, v };
  const rid = vzRidiciId(zak);
  const p = vzTiskPohled(zak, rid, v);
  const vv = (p && vzTiskVarianta(p, v)) || vzVariantaBezCizichKl(v, rid);
  return { zak: p || zak, v: vv };
}
/* Ruční hodnoty krycího listu pro převod: jeden zákazník = `kl.hodnoty`;
 * v pohledu zákazníka navíc jeho `hodnotyZakaznika[id]` (cizí hodnoty už
 * vyjmula vzVariantaBezCizichKl). */
function pdnRucne(kl, zak) {
  const out = Object.assign({}, (kl && kl.hodnoty) || {});
  const p = zak && zak.vzPohledZakaznika;
  const hz = kl && kl.hodnotyZakaznika;
  const moje = (p && hz && typeof hz === 'object') ? hz[String(p.id)] : null;
  if (moje && typeof moje === 'object') Object.keys(moje).forEach(k => { if (moje[k] !== undefined && moje[k] !== '') out[k] = moje[k]; });
  return out;
}

/* Podklad pro POST /api/pd/nanecisto. `volby.faze: 'prodano'` přidá přesun
 * dealu do fáze „Vyhrané k podpisu SoD" — tlačítko „Prodáno" (C4 #540) volá
 * pdnPodklad(zak, jekly, { faze: 'prodano' }) a podklad pošle na tentýž
 * endpoint; odpověď nese `patch` (tělo zamýšleného PATCH, nebo null se
 * `zastaveno`) a tabulku náhledu. Stav dealu (won) Prodáno NEMĚNÍ (#545,
 * J. V. 2. 11. 2026) — přepne se v Pipedrive až po doručení podepsané SoD. */
function pdnPodklad(zak, jekly, volby) {
  if (!zak || !Array.isArray(zak.varianty) || !zak.varianty.length) return { ok: false, chyba: 'Není otevřená žádná zakázka.' };
  const v = (typeof ridiciVarianta === 'function') ? ridiciVarianta(zak) : zak.varianty[0];
  const vedouci = (typeof zakazkaVedouciStrana === 'function') ? zakazkaVedouciStrana(zak) : '';
  const strany = {}, zdroje = {}, upozorneni = [];
  const zr = pdnPohledRidiciho(zak, v);
  if (vedouci !== 'proj') {
    strany.ock = pdnStranaOck(zr.zak, zr.v, jekly);
    zdroje.ock = pdnPopisky(KRYCI_SEKCE, 'Krycí list OCK');
  }
  if (vedouci !== 'ock') {
    strany.proj = pdnStranaProj(zr.zak, zr.v);
    zdroje.proj = pdnPopisky(KRYCI_PROJ_SEKCE, 'Krycí list PROJ');
  }
  if (!vedouci) upozorneni.push('Zakázka nemá číslo nabídky OCK ani PROJ — v Pipedrive se OCK a PROJ evidují zvlášť '
    + 'pod vlastním číslem, zápis by nevěděl, kam patří. Náhled ukazuje obě strany; u stejného pole by vyhrála OCK.');
  if (zak.aktivni && v.id !== zak.aktivni) upozorneni.push('Do Pipedrive se zapisuje ŘÍDÍCÍ varianta „' + (v.nazev || v.id)
    + '", ne ta, která je právě otevřená.');
  const deal = (typeof ctrlPdDealIdNorm === 'function') ? ctrlPdDealIdNorm(zak.pdDealId) : pdnText(zak.pdDealId);
  const out = { ok: true, strany, zdroje, dealId: deal || null, upozorneni, varianta: { id: v.id, nazev: v.nazev || '' }, vedouci };
  if (volby && volby.faze) out.faze = volby.faze;
  const zakaznici = pdnZakaznici(zak, deal || '', volby);
  if (zakaznici) out.zakaznici = zakaznici;
  return out;
}

/* VZ-E5 (#604, bod 5): text poznámky dealu „Další zákazníci na zakázce“ pro
 * řádek náhledu — TÝŽ text, jaký zapíše uložení zakázky (server
 * pdPoznamkaZakText = vzPoznamkaText + vzPoznamkaSeZnackou). Jen se
 * zapnutým vypínačem víc zákazníků (viceZakaznikuZapnuto; v Node
 * `volby.viceZakazniku === true`). „žádní“ jen u zakázky, která poznámku
 * k TOMUTO dealu už má (pole pdPoznamkaZakaznici píše jen server). Jinak ''
 * — podklad i tělo pak zůstanou beze změny (žádný klíč navíc). Náhled nic
 * nezapisuje. */
function pdnZakaznici(zak, deal, volby) {
  const zap = (volby && volby.viceZakazniku === true)
    || (typeof viceZakaznikuZapnuto === 'function' && viceZakaznikuZapnuto() === true);
  if (!zap || typeof vzPoznamkaText !== 'function' || typeof vzPoznamkaSeZnackou !== 'function') return '';
  const drz = zak && zak.pdPoznamkaZakaznici;
  const zadni = !!(drz && typeof drz === 'object' && deal && String(drz.deal) === String(deal));
  try { return vzPoznamkaSeZnackou(zak, vzPoznamkaText(zak, { zadni })) || ''; }
  catch (e) { return ''; }
}

/* Tělo POST /api/pd/nanecisto z podkladu (UI karty i C4 „Prodáno"). */
function pdnTelo(p) {
  const t = { strany: p.strany, zdroje: p.zdroje, dealId: p.dealId };
  if (p.faze) t.faze = p.faze;
  if (typeof p.zakaznici === 'string' && p.zakaznici) t.zakaznici = p.zakaznici;
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
  /* K40-X5 (11. 11. 2026): záložní buňka bez format.js neměla ochranu vzorců
   * — místo vlastní kopie se v Node načte TÁŽ csvBunka z format.js. */
  const bunka = (typeof csvBunka === 'function') ? csvBunka : require('./format.js').csvBunka;
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
  module.exports = { PDN_STAVY, pdnPopisky, pdnPodklad, pdnPlatby, pdnZpracovatelZeZamku, pdnVypracoval, pdnPohledRidiciho, pdnRucne, pdnZakaznici, pdnTelo, pdnStranaOck, pdnStranaProj, pdnNazevSouboru, pdnCsv };
