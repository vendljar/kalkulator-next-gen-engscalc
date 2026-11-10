/* ================= VÍC ŠACHET V NABÍDCE — OBRAZOVKA (VS #570) =================
 *
 * Etapa E2 (roadmapa #592): zadání. Závazný návrh
 * podklady/NAVRH_VICE_SACHET_05_11.md (větev claude/vs-vice-sachet, R1–R21)
 * a prototyp v9 (podklady/vs_prototyp/b_vice_sachet.js). Data a výpočet
 * jsou v src/vice_sachet.js (E1); tady je jen kreslení a obsluha.
 *
 * VYPÍNAČ (R21): funkci zapíná administrátor v Nastavení → Zkušební funkce
 * (viceSachetZapnuto). S VYPNUTOU funkcí a zakázkou bez víc šachet vrací
 * každá kreslicí funkce prázdný řetězec — obrazovka je bajt po bajtu jako
 * dřív. Zakázka, která víc šachet už má, se s vypnutou funkcí počítá podle
 * dat, karta Šachty varianty jen vypíše šachty a lišta řekne proč nejdou
 * měnit; v zadání je vždy šachta 1 (server změnu šachet 2+ odmítne).
 *
 * ZAP + jedna šachta (R16, R17, R20): obrazovka jako dnes, jen v nadpisu
 * Zadání šachty pole „Počet variant šachet v nabídce" a „Počet kusů".
 * Režim víc šachet (≥ 2 varianty nebo ks > 1): karta Šachty varianty
 * (přepínač, název, Počet stejných kusů, Kopírovat, Smazat; v nadpisu Počet
 * variant a Počet šachet celkem — R19), v nadpisu zadání „Počet kusů této
 * šachty". Globální `Z` míří na zadání otevřené šachty (vsSyncZ), takže
 * všechny dnešní karty (zadání, opláštění, Můstky, profily, práce) i set()
 * pracují s ní bez úprav.
 *
 * SNÍŽENÍ POČTU (R18) se potvrzuje na stránce se jmény mazaných šachet;
 * smazání posílá `dalsi: []`, NIKDY nemaže klíč — chybějící `dalsi`
 * u uložené varianty s šachtami server odmítne (409, ochrana před starší
 * kartou prohlížeče). Omyl vrátí Zpět (historie zachytí každé překreslení).
 * ============================================================ */

/* Funkce zapnutá? Při prvním syncVarianta() (načítání souboru) online
 * vrstva ještě neexistuje — pak vypnuto. */
function vsZap() {
  try { return typeof viceSachetZapnuto === 'function' && viceSachetZapnuto(); } catch (e) { return false; }
}
function vsRezimUI() {
  return typeof OCK !== 'undefined' && !!OCK && typeof rezimViceSachet === 'function' && rezimViceSachet(OCK);
}
function vsSachtyUI() { return (typeof sachtyZ === 'function' && OCK) ? sachtyZ(OCK) : []; }
function vsVarianta() { return (typeof ZAK !== 'undefined' && ZAK) ? aktivniVarianta(ZAK) : null; }
function vsZamcena() {
  const v = vsVarianta();
  return !!(v && typeof variantaUzamcena === 'function' && variantaUzamcena(v));
}

/* Z → zadání otevřené šachty (volá syncVarianta). Přepnutí varianty vrací
 * šachtu 1; s vypnutou funkcí nebo v Modelu 1 vždy šachta 1. Trvalé položky
 * ceníku (katalog) dostanou i ostatní šachty — součet pak sedí bez ohledu na
 * to, kterou šachtu kdo naposledy otevřel. */
function vsSyncZ(v, zamcena) {
  if (!v) return;
  if (VS_UI.vid !== v.id) { VS_UI.vid = v.id; VS_UI.akt = 0; VS_UI.pohled = 'akt'; VS_UI.potvrdit = null; }
  const dalsi = (OCK && Array.isArray(OCK.dalsi)) ? OCK.dalsi : [];
  if (!vsZap() || !OCK.fixes) VS_UI.akt = 0;
  if (VS_UI.akt > dalsi.length) VS_UI.akt = dalsi.length;
  if (VS_UI.potvrdit) VS_UI.potvrdit = VS_UI.potvrdit.filter(i => i > 0 && i <= dalsi.length);
  if (VS_UI.potvrdit && !VS_UI.potvrdit.length) VS_UI.potvrdit = null;
  if (VS_UI.akt > 0) {
    const s = dalsi[VS_UI.akt - 1];
    if (s && s.zadani && typeof s.zadani === 'object') Z = s.zadani; else VS_UI.akt = 0;
  }
  if (!zamcena && vsZap() && typeof katalogAplikuj === 'function' && typeof KATALOG !== 'undefined')
    dalsi.forEach(s => { if (s && s.zadani && typeof s.zadani === 'object' && s.zadani !== Z) katalogAplikuj(KATALOG, s.zadani); });
}

/* Výsledek pro tabulky Cenové kalkulace: otevřená šachta (E2), v pohledu
 * Součet celá varianta (E3). Bez víc šachet = r. */
function vsKalkVysledek(r) {
  VS_UI.kalkSachta = false;
  if (!r || !Array.isArray(r.sachty)) return r;
  if (VS_UI.pohled === 'soucet') return r;
  const s = r.sachty[VS_UI.akt] || r.sachty[0];
  if (!s || !s.vysl) return r;
  VS_UI.kalkSachta = true;
  return s.vysl;
}
/* Řádek CELKEM v kalkulaci: šachta se na tisíce nezaokrouhluje (R3). */
function vsCelkemPopis(rS) {
  if (!VS_UI.kalkSachta) return 'CELKEM (zaokrouhleno ↑ na tisíce)';
  const s = vsSachtyUI()[VS_UI.akt];
  return 'CELKEM ŠACHTY ' + esc(vsNazev(s, VS_UI.akt)) + ' (1 ks, nezaokrouhleno — na tisíce se zaokrouhlí až součet)';
}
function vsCelkemBunka(rS) {
  if (!VS_UI.kalkSachta) return fmt0(rS.souhrn.zakladCena);
  const x = rS.souhrn.zakladCenaPredZaokr;
  return fmt(typeof x === 'number' ? x : rS.souhrn.zakladNaklad + rS.souhrn.zakladMarze);
}
function vsPriplatkyCelkem(rS) {
  if (!VS_UI.kalkSachta) return rS.souhrn.priplatkyCena;
  const x = rS.souhrn.priplatkyCenaPredZaokr;
  return typeof x === 'number' ? x : rS.souhrn.priplatkyCena;
}

/* ---------- kreslení ---------- */
const VS_POLE_STYL = 'width:46px;padding:2px 6px;font-size:12.5px';

function vsVstupVariant(n) {
  const m1 = !OCK.fixes, zam = vsZamcena();
  const dis = m1 ? ' disabled title="Víc šachet počítá jen Model 2 — Model 1 dovolí jen jednu šachtu."'
    : zam ? ' disabled title="Uzamčená (odeslaná) varianta — šachty nejde měnit."'
    : ' title="počet různých šachet (variant) v nabídce, 1–' + VS_VARIANT_MAX + '"';
  return `<label for="vsPocet" style="font-weight:400">Počet variant šachet v nabídce</label>
    <input ${CISLO_POLE} id="vsPocet" step="1" min="1" max="${VS_VARIANT_MAX}" value="${n}" style="${VS_POLE_STYL}"${dis} onchange="vsPocetVariant(this.value)">`;
}

/* Prvek v nadpisu karty Zadání šachty (R17, R19, R20). */
function vsZadaniNavic() {
  if (!OCK) return '';
  const rez = vsRezimUI();
  if (!rez && !vsZap()) return '';
  const l = vsSachtyUI();
  if (rez) {
    const s = l[VS_UI.akt] || l[0];
    return `<span class="vs-pocet" onclick="event.stopPropagation()">Počet kusů této šachty: <b id="vsKsTeto">${s ? s.ks : 1} ks</b></span>`;
  }
  const m1 = !OCK.fixes, zam = vsZamcena();
  const disKs = m1 ? ' disabled title="Víc šachet počítá jen Model 2 — Model 1 dovolí jen 1 kus."'
    : zam ? ' disabled title="Uzamčená (odeslaná) varianta — šachty nejde měnit."'
    : ' title="počet stejných kusů této šachty (1–' + VS_KS_MAX + '); 2 a více zapne režim víc šachet"';
  return `<span class="vs-pocet" onclick="event.stopPropagation()">${vsVstupVariant(l.length || 1)}
    <span style="margin-left:12px"><label for="vsKs1" style="font-weight:400">Počet kusů</label>
    <input ${CISLO_POLE} id="vsKs1" step="1" min="1" max="${VS_KS_MAX}" value="${l[0] ? l[0].ks : 1}" style="width:40px;padding:2px 6px;font-size:12.5px"${disKs} onchange="vsKsSet(this.value)"></span></span>`;
}

/* „ — Název šachty" za nadpisem Zadání šachty v režimu víc šachet. */
function vsZadaniTitul() {
  if (!vsRezimUI()) return '';
  const l = vsSachtyUI();
  return ' — ' + esc(vsNazev(l[VS_UI.akt] || l[0], l[VS_UI.akt] ? VS_UI.akt : 0));
}

function vsPotvrzeniHtml(l) {
  const p = VS_UI.potvrdit;
  if (!p || !p.length) return '';
  const jm = p.map(i => vsNazev(l[i], i)).join(', ');
  const jedna = p.length === 1;
  const zbude = l.length - p.length;
  const navrat = (zbude === 1 && l[0] && l[0].ks === 1) ? ' Kalkulátor se vrátí do zobrazení pro jednu šachtu.' : '';
  return `<div class="seznam-varovani" id="vsPotvrzeni" style="margin:8px 0"><b>Smazat ${jedna ? 'šachtu' : 'šachty'} ${esc(jm)}?</b>
    Smaže se i ${jedna ? 'její' : 'jejich'} zadání, můstky a příplatky. Omyl vrátí tlačítko Zpět.${navrat}
    <span style="display:inline-flex;gap:8px;margin-left:10px"><button class="mini vyzva" id="vsPotvrdAno" onclick="vsPotvrd(true)">Smazat</button><button class="mini" id="vsPotvrdNe" onclick="vsPotvrd(false)">Zrušit</button></span></div>`;
}

/* Karta „Šachty varianty" (R1, R18, R19) — jen v režimu víc šachet nebo
 * když čeká potvrzení mazání. */
function vsKartaSachty() {
  if (!OCK) return '';
  const rez = vsRezimUI();
  if (!rez && !VS_UI.potvrdit) return '';
  const l = vsSachtyUI();
  const celkem = l.reduce((a, s) => a + s.ks, 0);
  const zap = vsZap();
  if (!zap) {
    const seznam = l.map((s, i) => `<span class="pill">${esc(vsNazev(s, i))}${s.ks > 1 ? ' · ' + s.ks + ' ks' : ''}</span>`).join(' ');
    const lista = typeof vsVypnutoHlaska === 'function' ? vsVypnutoHlaska(ZAK, false) : '';
    return kartaRezim('ock', 'vsSachty', 'Šachty varianty',
      `<div class="vs-blok"><div class="seznam-varovani" id="vsVypnuto" style="margin:0 0 8px">${esc(lista)}</div>
        <div class="vs-radek">${seznam}<span class="note" style="margin:0">${l.length} ${vsVariantSlovo(l.length)} šachet · celkem ${celkem} ks</span></div>
        <div class="note">Zadání níže je šachta 1 (${esc(vsNazev(l[0], 0))}).</div></div>`, 'vs-sachty');
  }
  const akt = Math.min(VS_UI.akt, l.length - 1);
  const s = l[akt];
  const zam = vsZamcena(), m1 = !OCK.fixes;
  const dis = (zam || m1) ? ' disabled' : '';
  const prep = `<span class="rada-prep" id="vsPrepinac">${l.map((x, i) => `<button type="button" class="${i === akt ? 'on' : ''}" onclick="vsAkt(${i})">${esc(vsNazev(x, i))}${x.ks > 1 ? ' · ' + x.ks + ' ks' : ''}</button>`).join('')}</span>`;
  const inner = `<div class="vs-blok">${vsPotvrzeniHtml(l)}
    <div class="vs-radek">${prep}<span class="note" style="margin:0">${l.length} z ${VS_VARIANT_MAX} variant šachet · celkem ${celkem} ks</span></div>
    <div class="vs-radek"><label for="vsNazev">Název</label><input type="text" id="vsNazev" maxlength="${VS_NAZEV_MAX}" value="${esc(s.nazev || '')}"
        placeholder="${esc(vsNazev(s, akt))}"${dis} onchange="vsNazevSet(this.value)">
      <label for="vsKs" style="margin-left:12px">Počet stejných kusů</label><input ${CISLO_POLE} id="vsKs" step="1" min="1" max="${VS_KS_MAX}" value="${esc(s.ks)}"${dis} onchange="vsKsSet(this.value)">
      <button class="mini" id="vsKopie" onclick="vsKopie()"${l.length >= VS_VARIANT_MAX || zam || m1 ? ' disabled' : ''}>Kopírovat šachtu</button>
      <button class="mini" id="vsSmaz" onclick="vsSmaz()"${akt === 0 ? ' disabled title="šachtu 1 nejde smazat, jen přejmenovat"' : (zam ? ' disabled' : '')}>Smazat šachtu</button></div>
    <div class="note">Karty Zadání šachty, Opláštění, Můstky, Dimenze profilů a Práce a režie patří vybrané šachtě. Hlavička zakázky,
      ceník, přirážka, sleva a ruční ceny jsou společné pro variantu. Každá šachta se počítá celá, jako samostatná zakázka;
      Počet stejných kusů ji násobí.${m1 ? ' <b>Model 1 počítá jen šachtu 1 — přepněte variantu na Model 2.</b>' : ''}</div></div>`;
  const navic = rez ? `<span class="vs-pocet" onclick="event.stopPropagation()">${vsVstupVariant(l.length)}
      <span style="margin-left:14px">Počet šachet celkem: <b id="vsCelkem">${celkem} ks</b></span></span>` : '';
  return kartaRezim('ock', 'vsSachty', 'Šachty varianty', inner, 'vs-sachty', false, navic);
}

function vsVariantSlovo(n) { return n === 1 ? 'varianta' : (n >= 2 && n <= 4 ? 'varianty' : 'variant'); }

/* ---------- obsluha ---------- */

/* Zápis do šachet dovolen? Vrací true = zastaveno (a řekne proč). */
function vsStop(popis) {
  if (typeof nahledStop === 'function' && nahledStop(popis)) return true;
  if (typeof zamekCteniStop === 'function' && zamekCteniStop()) return true;
  if (typeof zamekStop === 'function' && zamekStop()) return true;
  if (!vsZap()) {
    hlaska('Víc šachet v nabídce je v Nastavení vypnuté — šachty (počet variant, kusy, názvy) teď nejde měnit. '
      + 'Zapnout je může administrátor (Nastavení → Zkušební funkce).');
    render();
    return true;
  }
  if (!OCK.fixes) {
    hlaska('Víc šachet počítá jen Model 2. Přepněte variantu na Model 2 (Režim výpočtu v hlavičce) a pak přidejte šachty.');
    render();
    return true;
  }
  return false;
}

function vsZmeneno() {
  const v = vsVarianta();
  if (v) v.upraveno = new Date().toISOString();
  syncVarianta();
  render();
}

/* Celé číslo z pole CISLO_POLE (el.value je normalizovaný text s tečkou). */
function vsCeleCislo(t, min, max) {
  const x = String(t == null ? '' : t).trim();
  if (!/^\d+$/.test(x)) return null;
  const n = +x;
  return (n >= min && n <= max) ? n : null;
}

function vsNoveId() {
  const pouzite = new Set(vsSachtyUI().map(s => s.id));
  let id;
  do { id = 's_' + Math.random().toString(36).slice(2, 8); } while (pouzite.has(id) || !/^s_[a-z0-9]+$/.test(id));
  return id;
}
const vsKopieDat = o => JSON.parse(JSON.stringify(o));

/* Počet variant šachet (R17): zvýšení přidá kopie poslední šachty („Šachta N"),
 * snížení čeká na potvrzení na stránce (R18). */
function vsPocetVariant(t) {
  const l = vsSachtyUI();
  const n = vsCeleCislo(t, 1, VS_VARIANT_MAX);
  if (n === null) {
    hlaska('Počet variant šachet v nabídce je celé číslo 1–' + VS_VARIANT_MAX + '.');
    render();
    return;
  }
  if (n === l.length) { if (VS_UI.potvrdit) { VS_UI.potvrdit = null; render(); } return; }
  if (vsStop('změna počtu variant šachet')) return;
  if (n < l.length) {
    VS_UI.potvrdit = l.map((_, i) => i).slice(n);
    render();
    return;
  }
  if (!Array.isArray(OCK.dalsi)) OCK.dalsi = [];
  while (vsSachtyUI().length < n) {
    const vse = vsSachtyUI();
    const posl = vse[vse.length - 1];
    OCK.dalsi.push({ id: vsNoveId(), nazev: 'Šachta ' + (vse.length + 1), ks: 1, zadani: vsKopieDat(posl.zadani) });
  }
  VS_UI.potvrdit = null;
  VS_UI.akt = vsSachtyUI().length - 1;
  VS_UI.pohled = 'akt';
  vsZmeneno();
}

/* Potvrzení mazání (R18). Šachta 1 zůstává vždy; `dalsi` zůstane jako [] —
 * klíč se NEMAŽE (server by uložení odmítl, 409). */
function vsPotvrd(ano) {
  const p = VS_UI.potvrdit;
  VS_UI.potvrdit = null;
  if (!ano || !p) { render(); return; }
  if (vsStop('smazání šachet')) return;
  const smaz = new Set(p.filter(i => i > 0));
  OCK.dalsi = (Array.isArray(OCK.dalsi) ? OCK.dalsi : []).filter((_, j) => !smaz.has(j + 1));
  VS_UI.akt = 0;
  VS_UI.pohled = 'akt';
  vsZmeneno();
}

function vsAkt(i) {
  const l = vsSachtyUI();
  VS_UI.akt = Math.max(0, Math.min(+i || 0, l.length - 1));
  VS_UI.pohled = 'akt';
  syncVarianta();
  render();
}

function vsNazevSet(t) {
  if (vsStop('přejmenování šachty')) return;
  const x = String(t == null ? '' : t).replace(/\s+/g, ' ').trim().slice(0, VS_NAZEV_MAX);
  if (VS_UI.akt === 0) OCK.nazev = x;
  else if (OCK.dalsi[VS_UI.akt - 1]) OCK.dalsi[VS_UI.akt - 1].nazev = x;
  vsZmeneno();
}

/* Počet stejných kusů otevřené šachty (R2, R19, R20). U šachty 1 se 1 ks
 * neukládá (data jako před VS). */
function vsKsSet(t) {
  const k = vsCeleCislo(t, 1, VS_KS_MAX);
  if (k === null) {
    hlaska('Počet kusů je celé číslo 1–' + VS_KS_MAX + '.');
    render();
    return;
  }
  const l = vsSachtyUI();
  const s = l[VS_UI.akt] || l[0];
  if (s && s.ks === k) return;
  if (vsStop('změna počtu kusů šachty')) return;
  if (VS_UI.akt === 0) { if (k === 1) delete OCK.ks; else OCK.ks = k; }
  else if (OCK.dalsi[VS_UI.akt - 1]) OCK.dalsi[VS_UI.akt - 1].ks = k;
  vsZmeneno();
}

function vsKopie() {
  const l = vsSachtyUI();
  if (l.length >= VS_VARIANT_MAX) { hlaska('Variant šachet může být nejvýš ' + VS_VARIANT_MAX + '.'); return; }
  if (vsStop('kopie šachty')) return;
  const s = l[VS_UI.akt] || l[0];
  if (!Array.isArray(OCK.dalsi)) OCK.dalsi = [];
  OCK.dalsi.push({ id: vsNoveId(), nazev: (vsNazev(s, VS_UI.akt) + ' (kopie)').slice(0, VS_NAZEV_MAX), ks: s.ks, zadani: vsKopieDat(s.zadani) });
  VS_UI.akt = vsSachtyUI().length - 1;
  VS_UI.pohled = 'akt';
  vsZmeneno();
}

function vsSmaz() {
  if (VS_UI.akt <= 0) return;
  if (vsStop('smazání šachty')) return;
  VS_UI.potvrdit = [VS_UI.akt];
  render();
}
