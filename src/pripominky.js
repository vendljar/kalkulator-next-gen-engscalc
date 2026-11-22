/* ============================================================
 * PŘIPOMÍNKY Z APLIKACE (dávka PR, zadání J. V. 21. 11. 2026)
 *
 * Obchodník nahlásí přímo z aplikace chybu, nesedící cenu, návrh nebo dotaz;
 * správce je v Nastavení → Připomínky třídí a odpovídá, koordinace vývoje
 * čte frontu oprav vlastním klíčem a vrací stav a číslo roadmapy.
 *
 * TENHLE SOUBOR JE ČISTÁ LOGIKA (jako zakaznici.js): žádný DOM, žádné
 * fetch. Běží v prohlížeči, v Node testech i na serveru
 * (netlify/lib/pripominky_modul.cjs). Očistu vstupu dělá server TÍMTO
 * kódem — nikdy neuloží, co mu kdo pošle.
 *
 * ZÁSADY
 *  1. Odesláním se v zakázce nic nemění. Připomínka je samostatný záznam.
 *  2. Autor vidí jen svoje připomínky a jen to, co se ho týká (stav,
 *     odpověď, průběh). Kontext a snímek obrazovky vidí jen správce.
 *  3. Koordinace (klíč) dostane jen to, co potřebuje k opravě: číslo, typ,
 *     text, stav, obrazovku, označené místo a verzi. Ne autora, ne zakázku,
 *     ne snímek, ne hodnoty polí (B257).
 *  4. Odložení a zamítnutí bez zdůvodnění neexistuje — autor ho vidí vždy
 *     (rozhodnutí J. V. 21. 11. 2026).
 * ============================================================ */

const PRIPOMINKA_TYPY = [
  { id: 'chyba', ikona: '🐞', nazev: 'Chyba', popis: 'něco nefunguje',
    placeholder: 'Co jste dělali a co se stalo? Např. „Po kliknutí na Uložit zakázku se nic nestalo."' },
  { id: 'cena', ikona: '💰', nazev: 'Cena', popis: 'cena nesedí',
    placeholder: 'Která položka nebo součet nesedí a jakou hodnotu jste čekali?' },
  { id: 'navrh', ikona: '💡', nazev: 'Návrh', popis: 'šlo by to líp',
    placeholder: 'Co by vám ušetřilo práci? Popište, jak by to mělo fungovat.' },
  { id: 'dotaz', ikona: '❓', nazev: 'Dotaz', popis: 'nevím, jak na to',
    placeholder: 'Na co se chcete zeptat? Např. „Jak přidám druhou šachtu do nabídky?"' },
];

/* Stavy. `krok` = kam ukazuje průběh autorovi (0 Přijato … 3 Hotovo),
 * `uzavreno` = vyřízeno (týká se uchovávání), `oranzove` = odpověď je
 * zdůvodnění odložení/zamítnutí. */
const PRIPOMINKA_STAVY = [
  { id: 'nova', nazev: 'Nová', krok: 0 },
  { id: 'fronta', nazev: 'Ve frontě oprav', krok: 0 },
  { id: 'resi', nazev: 'Řeší se', krok: 1 },
  { id: 'test', nazev: 'Na testu', krok: 2 },
  { id: 'hotovo', nazev: 'Hotovo', krok: 3, uzavreno: true },
  { id: 'odlozeno', nazev: 'Odloženo', krok: 0, oranzove: true },
  { id: 'zamitnuto', nazev: 'Zamítnuto', krok: 0, oranzove: true, uzavreno: true },
  { id: 'duplicitni', nazev: 'Duplicitní', krok: 0, oranzove: true, uzavreno: true },
];
const PRIPOMINKA_KROKY = ['Přijato', 'Řeší se', 'Testuje se', 'Hotovo'];

/* Filtry správce (čipy). */
const PRIPOMINKA_FILTRY = [
  { id: 'nove', nazev: 'Nové', stavy: ['nova'] },
  { id: 'fronta', nazev: 'Ve frontě oprav', stavy: ['fronta'] },
  { id: 'resi', nazev: 'Řeší se', stavy: ['resi'] },
  { id: 'test', nazev: 'Na testu', stavy: ['test'] },
  { id: 'hotovo', nazev: 'Hotové', stavy: ['hotovo'] },
  { id: 'odlozene', nazev: 'Odložené / zamítnuté', stavy: ['odlozeno', 'zamitnuto', 'duplicitni'] },
  { id: 'vse', nazev: 'Vše', stavy: null },
];
const PRIPOMINKA_ZDROJE = [
  { id: 'oba', nazev: 'ostrý web i test' },
  { id: 'ostry', nazev: 'jen ostrý' },
  { id: 'test', nazev: 'jen test' },
];
const PRIPOMINKA_ROLE = ['Obchodník', 'Vedoucí', 'Administrátor'];

/* Meze (B257). Snímek je datový zápis JPEG/PNG v base64. */
const PRIPOMINKA_TEXT_MIN = 10;
const PRIPOMINKA_TEXT_MAX = 4000;
const PRIPOMINKA_ODPOVED_MAX = 4000;
const PRIPOMINKA_SNIMEK_MAX = 700000;
const PRIPOMINKA_KONTEXT_MAX = 8000;
const PRIPOMINKA_LIMIT_DEN = 20;
const PRIPOMINKA_LIMIT_DEN_MAX = 200;
const PRIPOMINKA_UCHOVAT_DNI = 365;
const PRIPOMINKA_PRUBEH_MAX = 50;
const PRIPOMINKA_ID_TVAR = /^P-\d{4,6}$/;
const PRIPOMINKA_ROADMAPA_TVAR = /^#?\d{1,5}$/;

function _ptxt(v, max) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return '';
  /* Řídicí znaky pryč (kromě konce řádku a tabulátoru) — text jde do
   * tabulky správce, do e-mailu i ke koordinaci. Escapuje se až při
   * vykreslení (esc), tady jen ořez a očista. */
  const s = String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u2028\u2029]/g, '').trim();
  return max ? s.slice(0, max) : s;
}
function pripominkaTyp(id) { return PRIPOMINKA_TYPY.find(t => t.id === id) || null; }
function pripominkaStav(id) { return PRIPOMINKA_STAVY.find(s => s.id === id) || null; }
function pripominkaCislo(n) { return 'P-' + String(Math.max(1, Math.floor(+n) || 1)).padStart(4, '0'); }
function pripominkaIdPlatne(id) { return typeof id === 'string' && PRIPOMINKA_ID_TVAR.test(id); }
/* Text „stačí aspoň krátká věta": po očistě nejmíň 10 znaků. */
function pripominkaTextStaci(text) { return _ptxt(text, PRIPOMINKA_TEXT_MAX).length >= PRIPOMINKA_TEXT_MIN; }
function pripominkaLzeOdeslat(typ, text) { return !!pripominkaTyp(typ) && pripominkaTextStaci(text); }

/* ---------- nastavení (záznam `nastaveni` v úložišti pripominky) ---------- */
function pripominkyNastaveniVychozi() {
  return { zapnuto: false, role: PRIPOMINKA_ROLE.slice(), snimekVychozi: true, emailSpravci: false,
    zdrojFronty: 'oba', intervalKoordinace: 'každou hodinu 7–19 h', limitDen: PRIPOMINKA_LIMIT_DEN,
    uchovatDni: PRIPOMINKA_UCHOVAT_DNI };
}
/* Očista nastavení od správce. Klíč koordinace (hash) se sem NIKDY nepíše
 * — drží ho server zvlášť a nastavuje jen akcí „klic". */
function pripominkyNastaveniOciste(v) {
  const z = pripominkyNastaveniVychozi();
  const x = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  if (typeof x.zapnuto === 'boolean') z.zapnuto = x.zapnuto;
  if (Array.isArray(x.role)) z.role = PRIPOMINKA_ROLE.filter(r => x.role.includes(r));
  if (typeof x.snimekVychozi === 'boolean') z.snimekVychozi = x.snimekVychozi;
  if (typeof x.emailSpravci === 'boolean') z.emailSpravci = x.emailSpravci;
  if (PRIPOMINKA_ZDROJE.some(q => q.id === x.zdrojFronty)) z.zdrojFronty = x.zdrojFronty;
  if (typeof x.intervalKoordinace === 'string' && _ptxt(x.intervalKoordinace, 120)) z.intervalKoordinace = _ptxt(x.intervalKoordinace, 120);
  const lim = Math.floor(+x.limitDen);
  if (Number.isFinite(lim) && lim >= 1) z.limitDen = Math.min(PRIPOMINKA_LIMIT_DEN_MAX, lim);
  const dni = Math.floor(+x.uchovatDni);
  if (Number.isFinite(dni) && dni >= 0) z.uchovatDni = Math.min(3650, dni);
  return z;
}
function pripominkySmiOdesilat(nastaveni, role) {
  const n = pripominkyNastaveniOciste(nastaveni);
  return !!n.zapnuto && n.role.includes(role);
}

/* ---------- snímek obrazovky ---------- */
/* Jen JPEG nebo PNG jako datový zápis — žádné SVG (umí nést skript), žádný
 * odkaz. Prázdno = bez snímku. Vrací { ok, obrazek } nebo { ok:false, chyba }. */
function pripominkaSnimekZkontroluj(obrazek) {
  const s = typeof obrazek === 'string' ? obrazek.trim() : '';
  if (!s) return { ok: true, obrazek: '' };
  if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(s))
    return { ok: false, chyba: 'Snímek obrazovky musí být obrázek JPEG nebo PNG.' };
  if (s.length > PRIPOMINKA_SNIMEK_MAX)
    return { ok: false, chyba: 'Snímek obrazovky je příliš velký (' + Math.round(s.length / 1024) + ' kB, nejvýš '
      + Math.round(PRIPOMINKA_SNIMEK_MAX / 1024) + ' kB).' };
  return { ok: true, obrazek: s };
}

/* ---------- kontext (přikládá se automaticky) ---------- */
function _pcislo(v, min, max) { const n = Math.round(+v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : 0; }
function pripominkaKontextOciste(v) {
  const x = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  const zak = x.zakazka && typeof x.zakazka === 'object' ? x.zakazka : {};
  const m = x.misto && typeof x.misto === 'object' ? x.misto : null;
  const k = {
    obrazovka: _ptxt(x.obrazovka, 120),
    zalozka: _ptxt(x.zalozka, 40).replace(/[^a-z0-9_-]/gi, ''),
    zakazka: { cislo: _ptxt(zak.cislo, 120), varianta: _ptxt(zak.varianta, 80), soubor: _ptxt(zak.soubor, 200) },
    misto: null,
    verze: _ptxt(x.verze, 40),
    prohlizec: _ptxt(x.prohlizec, 300),
    okno: { w: _pcislo(x.okno && x.okno.w, 0, 20000), h: _pcislo(x.okno && x.okno.h, 0, 20000) },
    /* Hodnoty vybraných polí BEZ CEN (klient posílá jen popisky a text
     * z polí, která nejsou cenová; server jen ořezává). */
    pole: Array.isArray(x.pole) ? x.pole.slice(0, 30).map(p => ({
      popisek: _ptxt(p && p.popisek, 80), hodnota: _ptxt(p && p.hodnota, 120) })).filter(p => p.popisek) : [],
  };
  if (m) {
    const r = m.rect && typeof m.rect === 'object' ? m.rect : {};
    /* `zdroj` popisku (N1 revize 22. 11. 2026): 'popis' = z popisu prvku
     * (label, aria-label, title, placeholder), 'obsah' = z obsahu stránky
     * (text prvku, první buňka řádku — může nést cenu nebo jméno). Neznámé
     * = 'obsah' (bezpečná strana). Ke koordinaci jde jen 'popis'. */
    k.misto = { sekce: _ptxt(m.sekce, 120), popisek: _ptxt(m.popisek, 160), zdroj: m.zdroj === 'popis' ? 'popis' : 'obsah',
      selektor: _ptxt(m.selektor, 300),
      rect: { x: _pcislo(r.x, -20000, 20000), y: _pcislo(r.y, -20000, 20000), w: _pcislo(r.w, 0, 20000), h: _pcislo(r.h, 0, 20000),
        vw: _pcislo(r.vw, 0, 20000), vh: _pcislo(r.vh, 0, 20000) } };
    if (!k.misto.sekce && !k.misto.popisek) k.misto = null;
  }
  /* Strop velikosti: přebytečná pole se zahodí, ne celý kontext. */
  while (JSON.stringify(k).length > PRIPOMINKA_KONTEXT_MAX && k.pole.length) k.pole.pop();
  return k;
}
function pripominkaMistoPopis(misto) {
  if (!misto) return '';
  return [misto.sekce, misto.popisek].filter(Boolean).join(' › ');
}

/* ---------- nová připomínka (server) ---------- */
/* `relace` = { email, jmeno }, `ted` ISO, `zdroj` 'ostry'|'test'. Vrací
 * { ok, pripominka } nebo { ok:false, chyba }. Číslo přidělí server. */
function pripominkaNova(vstup, relace, ted, zdroj, cislo) {
  const v = vstup && typeof vstup === 'object' && !Array.isArray(vstup) ? vstup : {};
  if (!pripominkaTyp(v.typ)) return { ok: false, chyba: 'Zvolte, co chcete nahlásit (chyba, cena, návrh nebo dotaz).' };
  if (typeof v.text !== 'string') return { ok: false, chyba: 'Popište připomínku vlastními slovy.' };
  const text = _ptxt(v.text);
  if (text.length > PRIPOMINKA_TEXT_MAX) return { ok: false, chyba: 'Text je příliš dlouhý (nejvýš ' + PRIPOMINKA_TEXT_MAX + ' znaků).' };
  if (text.length < PRIPOMINKA_TEXT_MIN) return { ok: false, chyba: 'Napište aspoň krátkou větu (nejméně ' + PRIPOMINKA_TEXT_MIN + ' znaků).' };
  const r = relace || {};
  const kdy = _ptxt(ted, 40);
  const p = {
    id: pripominkaCislo(cislo), cislo: Math.max(1, Math.floor(+cislo) || 1),
    typ: v.typ, text, autor: _ptxt(r.email, 254).toLowerCase(), autorJmeno: _ptxt(r.jmeno, 120).replace(/[<>]/g, ''),
    kdy, zmeneno: kdy, zdroj: zdroj === 'test' ? 'test' : 'ostry',
    stav: 'nova', roadmapa: '', odpoved: '', odpovedKdy: '', odpovedKdo: '', duplicitniS: '',
    odpovedNova: false, prectenoSpravcem: false, snimek: false,
    kontext: pripominkaKontextOciste(v.kontext),
    prubeh: [{ kdy, stav: 'nova', kdo: 'autor', text: '' }],
  };
  return { ok: true, pripominka: p };
}

/* ---------- změna stavu (správce nebo koordinace) ---------- */
/* Akce správce: fronta | uzavrit | odlozit | zamitnout | duplicitni | odpovedet | stav.
 * Koordinace: jen akce 'stav' se stavem resi/test/hotovo/odlozeno/zamitnuto
 * a/nebo roadmapa a odpověď — a jen u připomínky, kterou správce pustil do
 * fronty (stav ≠ nova). Vrací { ok, pripominka } nebo { ok:false, chyba, kod }. */
const PRIPOMINKA_STAVY_KOORDINACE = ['fronta', 'resi', 'test', 'hotovo', 'odlozeno', 'zamitnuto'];
function pripominkaZmen(stara, zmena, kdo, ted, existujeId) {
  if (!stara || typeof stara !== 'object') return { ok: false, chyba: 'Připomínka nenalezena.', kod: 404 };
  const z = zmena && typeof zmena === 'object' && !Array.isArray(zmena) ? zmena : {};
  const koord = kdo === 'koordinace';
  const p = JSON.parse(JSON.stringify(stara));
  const odpoved = z.odpoved === undefined ? undefined : _ptxt(z.odpoved, PRIPOMINKA_ODPOVED_MAX + 1);
  if (odpoved !== undefined && odpoved.length > PRIPOMINKA_ODPOVED_MAX)
    return { ok: false, chyba: 'Odpověď je příliš dlouhá (nejvýš ' + PRIPOMINKA_ODPOVED_MAX + ' znaků).', kod: 400 };
  let novyStav = null;
  const akce = _ptxt(z.akce, 20);
  if (koord) {
    if (p.stav === 'nova') return { ok: false, chyba: 'Připomínku ještě nepustil správce do fronty oprav.', kod: 403 };
    if (akce && akce !== 'stav') return { ok: false, chyba: 'Klíč koordinace smí měnit jen stav, odpověď a číslo roadmapy.', kod: 403 };
    if (z.stav !== undefined) {
      if (!PRIPOMINKA_STAVY_KOORDINACE.includes(z.stav)) return { ok: false, chyba: 'Neznámý nebo nepovolený stav.', kod: 400 };
      novyStav = z.stav;
    }
  } else {
    const mapa = { fronta: 'fronta', uzavrit: 'hotovo', odlozit: 'odlozeno', zamitnout: 'zamitnuto', duplicitni: 'duplicitni' };
    if (mapa[akce]) novyStav = mapa[akce];
    else if (akce === 'stav') {
      if (!pripominkaStav(z.stav)) return { ok: false, chyba: 'Neznámý stav.', kod: 400 };
      novyStav = z.stav;
    } else if (akce !== 'odpovedet' && akce !== 'roadmapa') return { ok: false, chyba: 'Neznámá akce.', kod: 400 };
    if (akce === 'uzavrit' && !(odpoved || p.odpoved))
      return { ok: false, chyba: 'Napište odpověď, se kterou připomínku uzavíráte.', kod: 400 };
    if (akce === 'odpovedet' && !odpoved) return { ok: false, chyba: 'Odpověď je prázdná.', kod: 400 };
  }
  /* Rozhodnutí J. V.: odložení a zamítnutí jen se zdůvodněním. Platí pro
   * správce i koordinaci a zdůvodnění musí přijít s tímto krokem. */
  if ((novyStav === 'odlozeno' || novyStav === 'zamitnuto') && novyStav !== p.stav && !odpoved)
    return { ok: false, chyba: 'U odložení a zamítnutí je zdůvodnění povinné — autor ho uvidí.', kod: 400 };
  if (novyStav === 'duplicitni') {
    const s = _ptxt(z.duplicitniS, 12).toUpperCase();
    if (!pripominkaIdPlatne(s) || s === p.id) return { ok: false, chyba: 'Uveďte číslo připomínky, se kterou je duplicitní (P-0000).', kod: 400 };
    if (typeof existujeId === 'function' && !existujeId(s)) return { ok: false, chyba: 'Připomínka ' + s + ' neexistuje.', kod: 400 };
    p.duplicitniS = s;
  }
  if (z.roadmapa !== undefined) {
    const r = _ptxt(z.roadmapa, 8);
    if (r && !PRIPOMINKA_ROADMAPA_TVAR.test(r)) return { ok: false, chyba: 'Číslo roadmapy má tvar #123.', kod: 400 };
    p.roadmapa = r ? '#' + r.replace(/^#/, '') : '';
  }
  const kdy = _ptxt(ted, 40);
  const zmenaStavu = novyStav && novyStav !== p.stav;
  if (zmenaStavu) p.stav = novyStav;
  if (odpoved) {
    p.odpoved = odpoved; p.odpovedKdy = kdy; p.odpovedKdo = koord ? 'koordinace' : 'správce';
  }
  /* Autor dostane upozornění na novou odpověď i na posun stavu. */
  if (odpoved || zmenaStavu) p.odpovedNova = true;
  if (zmenaStavu || odpoved || z.roadmapa !== undefined) {
    p.zmeneno = kdy;
    p.prubeh = (Array.isArray(p.prubeh) ? p.prubeh : []).concat([{ kdy, stav: p.stav,
      kdo: koord ? 'koordinace' : 'správce', text: odpoved ? odpoved.slice(0, 300) : '' }]).slice(-PRIPOMINKA_PRUBEH_MAX);
  }
  return { ok: true, pripominka: p };
}

/* ---------- pohledy ---------- */
/* Co smí vidět autor: bez kontextu, snímku, interních příznaků a roadmapy. */
function pripominkaProAutora(p) {
  if (!p) return null;
  return { id: p.id, typ: p.typ, text: p.text, kdy: p.kdy, zmeneno: p.zmeneno, stav: p.stav,
    odpoved: p.odpoved || '', odpovedKdy: p.odpovedKdy || '', odpovedNova: !!p.odpovedNova,
    duplicitniS: p.duplicitniS || '',
    prubeh: (p.prubeh || []).map(x => ({ kdy: x.kdy, stav: x.stav })) };
}
/* Označené místo pro koordinaci (N1 revize 22. 11. 2026): nadpis okna ani
 * obsah prvku ne (cena, jméno zákazníka) — jen popisek z popisu prvku a jen
 * bez číslic a zavináče. Jinak prázdno; zbývá obrazovka a selektor. */
function pripominkaMistoProKoordinaci(m) {
  if (!m || m.zdroj !== 'popis') return '';
  const t = _ptxt(m.popisek, 160);
  return /[0-9@]/.test(t) ? '' : t;
}
/* Co smí vidět koordinace (B257): žádný autor, zakázka, pole ani snímek. */
function pripominkaProKoordinaci(p) {
  if (!p) return null;
  const k = p.kontext || {};
  return { id: p.id, typ: p.typ, text: p.text, kdy: p.kdy, zmeneno: p.zmeneno, zdroj: p.zdroj, stav: p.stav,
    roadmapa: p.roadmapa || '', odpoved: p.odpoved || '', duplicitniS: p.duplicitniS || '',
    kontext: { obrazovka: k.obrazovka || '', misto: pripominkaMistoProKoordinaci(k.misto),
      selektor: (k.misto && k.misto.selektor) || '', verze: k.verze || '' },
    prubeh: (p.prubeh || []).map(x => ({ kdy: x.kdy, stav: x.stav })) };
}
function pripominkaKrok(stav) { const s = pripominkaStav(stav); return s ? s.krok : 0; }
function pripominkaOranzove(stav) { const s = pripominkaStav(stav); return !!(s && s.oranzove); }
function pripominkyNovychOdpovedi(seznam) { return (seznam || []).filter(p => p && p.odpovedNova).length; }
function pripominkyNeprectenych(seznam) { return (seznam || []).filter(p => p && !p.prectenoSpravcem).length; }

function _pnorm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function pripominkyFiltruj(seznam, filtr, zdroj, hledej) {
  const f = PRIPOMINKA_FILTRY.find(x => x.id === filtr) || PRIPOMINKA_FILTRY.find(x => x.id === 'vse');
  const slova = _pnorm(hledej).split(/\s+/).filter(Boolean);
  return (seznam || []).filter(p => {
    if (!p) return false;
    if (f.stavy && !f.stavy.includes(p.stav)) return false;
    if (zdroj === 'ostry' && p.zdroj !== 'ostry') return false;
    if (zdroj === 'test' && p.zdroj !== 'test') return false;
    if (slova.length) {
      const t = _pnorm([p.id, p.text, p.autor, p.autorJmeno, p.roadmapa, p.odpoved,
        p.kontext && p.kontext.obrazovka, p.kontext && p.kontext.zakazka && p.kontext.zakazka.cislo].join(' '));
      if (!slova.every(s => t.includes(s))) return false;
    }
    return true;
  }).sort((a, b) => String(b.kdy).localeCompare(String(a.kdy)));
}
function pripominkyPocty(seznam, zdroj) {
  const o = {};
  PRIPOMINKA_FILTRY.forEach(f => { o[f.id] = pripominkyFiltruj(seznam, f.id, zdroj, '').length; });
  return o;
}
/* Uchovávání vyřízených: vrací id záznamů ke smazání (uzavřené a neměněné
 * déle než `dni`). 0 = uchovávat navždy. */
function pripominkyKSmazani(seznam, dni, tedMs) {
  const d = Math.floor(+dni);
  if (!Number.isFinite(d) || d <= 0) return [];
  const mez = tedMs - d * 86400000;
  return (seznam || []).filter(p => {
    const s = pripominkaStav(p && p.stav);
    const t = Date.parse(p && (p.zmeneno || p.kdy));
    return s && s.uzavreno && Number.isFinite(t) && t < mez;
  }).map(p => p.id);
}
/* Obnova ze zálohy: záznam projde tvarovou kontrolou a očistou. */
function pripominkaObnovaOciste(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  if (!pripominkaIdPlatne(v.id) || !pripominkaTyp(v.typ) || !pripominkaStav(v.stav)) return null;
  const r = pripominkaNova({ typ: v.typ, text: typeof v.text === 'string' && v.text.length >= PRIPOMINKA_TEXT_MIN ? v.text : String(v.text || '') + ' (obnoveno)',
    kontext: v.kontext }, { email: v.autor, jmeno: v.autorJmeno }, v.kdy, v.zdroj, +String(v.id).slice(2));
  if (!r.ok) return null;
  const p = r.pripominka;
  p.stav = v.stav; p.zmeneno = _ptxt(v.zmeneno, 40) || p.kdy;
  const rm = _ptxt(v.roadmapa, 8); p.roadmapa = PRIPOMINKA_ROADMAPA_TVAR.test(rm) ? '#' + rm.replace(/^#/, '') : '';
  p.odpoved = _ptxt(v.odpoved, PRIPOMINKA_ODPOVED_MAX); p.odpovedKdy = _ptxt(v.odpovedKdy, 40);
  p.odpovedKdo = v.odpovedKdo === 'koordinace' ? 'koordinace' : (p.odpoved ? 'správce' : '');
  p.duplicitniS = pripominkaIdPlatne(v.duplicitniS) ? v.duplicitniS : '';
  p.odpovedNova = !!v.odpovedNova; p.prectenoSpravcem = !!v.prectenoSpravcem; p.snimek = false;
  p.prubeh = (Array.isArray(v.prubeh) ? v.prubeh : []).slice(-PRIPOMINKA_PRUBEH_MAX).map(x => ({
    kdy: _ptxt(x && x.kdy, 40), stav: pripominkaStav(x && x.stav) ? x.stav : p.stav,
    kdo: ['autor', 'správce', 'koordinace'].includes(x && x.kdo) ? x.kdo : 'správce', text: _ptxt(x && x.text, 300) }));
  return p;
}
/* Text e-mailu správci (připravený; aplikace e-maily zatím neodesílá). */
function pripominkaEmailText(p) {
  const t = pripominkaTyp(p.typ);
  return { predmet: 'Nová připomínka ' + p.id + ' (' + (t ? t.nazev : p.typ) + ')',
    telo: 'Nová připomínka ' + p.id + ' od ' + (p.autorJmeno || p.autor) + '.\n\n' + p.text
      + '\n\nOtevřete Nastavení → Připomínky.' };
}

if (typeof module !== 'undefined')
  module.exports = { PRIPOMINKA_TYPY, PRIPOMINKA_STAVY, PRIPOMINKA_KROKY, PRIPOMINKA_FILTRY, PRIPOMINKA_ZDROJE,
    PRIPOMINKA_ROLE, PRIPOMINKA_TEXT_MIN, PRIPOMINKA_TEXT_MAX, PRIPOMINKA_ODPOVED_MAX, PRIPOMINKA_SNIMEK_MAX,
    PRIPOMINKA_KONTEXT_MAX, PRIPOMINKA_LIMIT_DEN, PRIPOMINKA_LIMIT_DEN_MAX, PRIPOMINKA_UCHOVAT_DNI,
    PRIPOMINKA_ID_TVAR, PRIPOMINKA_STAVY_KOORDINACE,
    pripominkaTyp, pripominkaStav, pripominkaCislo, pripominkaIdPlatne, pripominkaTextStaci, pripominkaLzeOdeslat,
    pripominkyNastaveniVychozi, pripominkyNastaveniOciste, pripominkySmiOdesilat, pripominkaSnimekZkontroluj,
    pripominkaKontextOciste, pripominkaMistoPopis, pripominkaMistoProKoordinaci, pripominkaNova, pripominkaZmen, pripominkaProAutora,
    pripominkaProKoordinaci, pripominkaKrok, pripominkaOranzove, pripominkyNovychOdpovedi, pripominkyNeprectenych,
    pripominkyFiltruj, pripominkyPocty, pripominkyKSmazani, pripominkaObnovaOciste, pripominkaEmailText };
