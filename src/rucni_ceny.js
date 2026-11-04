/* ============================================================
 * RUČNÍ CENA POLOŽKY OBCHODNÍKEM S POTVRZENÍM (#561, rozhodnutí J. V. 4. 11. 2026)
 *
 * CO SE TÍM ŘEŠÍ
 * Obchodník má na konkrétní materiál (sklo, …) nabídku dodavatele a do v4.11.3
 * neměl kam cenu napsat: buňka ceny je za právem `sloupce.naklad`, ceník za
 * `tab.cenik` a server změnu ceníku odmítl 403 (B112, uloCenikProblemy).
 * Návrh `podklady/NAVRH_MUSTKY_A_ZMENA_CENY_04_11.md`, oddíl B.
 *
 * ROZHODNUTÍ J. V. (dialog 4. 11. 2026)
 *  – B-Q1: obchodník zadává NÁKUPNÍ cenu z nabídky dodavatele (nákladovou
 *    sazbu té položky pro tuto zakázku), aplikace k ní přičte přirážku jako
 *    jinde. Ceníkovou nákladovou sazbu dál nevidí (P12).
 *  – B-Q2: přepsat smí VŠECHNY položky ceníku OCK s cenou v Kč (adminský
 *    příznak „cena dle nabídky" u položky se nezavádí).
 *  – B-Q3: VŽDY JEN POTVRZENÍ OBCHODNÍKEM. Žádné schvalování, ani u snížení
 *    pod ceník. Nepotvrzená ruční cena zastaví tisk dokumentů (zábrana
 *    `rucniCenaNepotvrzena`, server 403 u nového zámku).
 *  – B-Q4 (#425) se nedělá — schvalování se ruční ceny netýká.
 *  – B-Q5 (controlling): v exportu zdroj ceny a odchylka od ceníku.
 *  – B-Q6 (příplatky „cena dle nabídky", S13): stejné potvrzení se zdrojem;
 *    starší vlastní cena příplatku bez záznamu = „potvrzeno bez dokladu"
 *    (čte se tak, data se nepřepisují — zamčené varianty zůstanou beze změny),
 *    tisk se neblokuje.
 *
 * DATA (v.data.rucniCeny, klíč = cesta ceníku „C.…")
 *   { hodnota: číslo > 0 (= hodnota v ceníku varianty),
 *     dodavatel, cislo, datum, platnostDo,   // zdroj (text, datum RRRR-MM-DD)
 *     zaklad: ceníková sazba v okamžiku potvrzení (razí server z platného ceníku),
 *     potvrdil: { jmeno, email, kdy } | null  // razí server z relace }
 * Cena sama leží v ceníku varianty (`v.data.cenik`) na své cestě — jádro,
 * zámek, ověření výsledku, krycí listy a controlling ji tak počítají jedním
 * kódem bez další větve. Záznam je doklad k té hodnotě: server pustí změnu
 * ceníku JEN na cestě, kde záznam nese tutéž hodnotu (uloCenikProblemy),
 * ostatní sazby ceníku hlídá dál beze změny.
 *
 * RAZÍTKO „KDO A KDY" (vzor B2 / B13 / vyjimky.js): klient posílá jen to, že
 * cenu potvrdil (`potvrdil` neprázdné); jméno, e-mail a čas zapíše server
 * z relace. Totéž potvrzení (stejný obsah: hodnota + zdroj) se při dalším
 * uložení vezme z uložené verze; změna obsahu bez nového potvrzení = null.
 *
 * P12: obchodník u položky vidí jen své číslo a zdroj; ceníkovou sazbu
 * (`zaklad`) a odchylku od ní ukazuje kalkulace jen s právem `sloupce.naklad`
 * (administrátor) a export controllingu (jen administrátor). Z odchylky a své
 * ceny by si obchodník ceníkovou sazbu dopočítal — proto ji nevidí ani jako
 * procento, ani jako směr (nad / pod ceníkem).
 * ============================================================ */

const RC_ZDROJ = ['dodavatel', 'cislo', 'datum', 'platnostDo'];
const RC_TEXT_MAX = 120;
const RC_MAX = 200;                       // položek na variantu (ceník OCK jich má ~100)
const RC_HODNOTA_MAX = 1e9;               // shodně s ULO_PREPIS_MAX
const RC_DATUM = /^\d{4}-\d{2}-\d{2}$/;
const RC_CESTA = /^C\.[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)?$/;
/* Stavy pro štítky a zábranu. */
const RC_NEPOTVRZENO = 'nepotvrzeno';
const RC_POTVRZENO = 'potvrzeno';
const RC_BEZ_DOKLADU = 'bezDokladu';     // starší vlastní cena příplatku S13

function rcDef() {
  if (typeof CENIK_DEF !== 'undefined') return CENIK_DEF;
  if (typeof require === 'function') { try { return require('./cenik.js').CENIK_DEF || []; } catch (e) { return []; } }
  return [];
}
function rcZakazkova(cesta) {
  if (typeof cenikPatriZakazce === 'function') return cenikPatriZakazce(cesta);
  return ['C.marze', 'C.dph'].indexOf(String(cesta)) >= 0;
}
/* Položka ceníku OCK s cenou v Kč (B-Q2: všechny). Ne: hodiny, mm, kg,
 * kurz EUR, přirážka a DPH (zakázkové hodnoty), textové volby. */
function rucniCenaSmi(cesta) {
  const c = String(cesta == null ? '' : cesta);
  if (!RC_CESTA.test(c) || rcZakazkova(c)) return false;
  let ok = false;
  rcDef().forEach(([, items]) => items.forEach(([p, , jed, , typ]) => {
    if (p === c && !typ && /^Kč/.test(String(jed || '')) && String(jed) !== 'Kč/EUR') ok = true;
  }));
  return ok;
}
function rucniCenaPopis(cesta) {
  let out = '';
  rcDef().forEach(([, items]) => items.forEach(([p, popis, jed]) => { if (p === cesta) out = String(popis || p); }));
  return out || String(cesta);
}
function rucniCenaJednotka(cesta) {
  let out = '';
  rcDef().forEach(([, items]) => items.forEach(([p, , jed]) => { if (p === cesta) out = String(jed || ''); }));
  return out;
}
function rcGet(cenik, cesta) {
  return String(cesta).split('.').slice(1).reduce((o, k) => (o == null ? undefined : o[k]), cenik || {});
}
function rcSet(cenik, cesta, val) {
  const ks = String(cesta).split('.').slice(1), last = ks.pop();
  if (ks.concat(last).some(k => k === '__proto__' || k === 'constructor' || k === 'prototype')) return;
  const cil = ks.reduce((o, k) => (o[k] = (o[k] && typeof o[k] === 'object') ? o[k] : {}), cenik);
  cil[last] = val;
}
function rcMa(o, k) { return !!o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k); }

function rucniCenyMapa(data) {
  const m = data && data.rucniCeny;
  return (m && typeof m === 'object' && !Array.isArray(m)) ? m : {};
}
function rucniCenaZaznam(data, cesta) {
  const m = rucniCenyMapa(data);
  return rcMa(m, String(cesta)) && m[cesta] && typeof m[cesta] === 'object' ? m[cesta] : null;
}
/* Záznam, který opravdu kryje hodnotu ceníku varianty (stejné číslo). Jen
 * takový vyřadí položku z kontroly směsi ceníků a z B112. */
function rucniCenaPlati(data, cesta) {
  const r = rucniCenaZaznam(data, cesta);
  if (!r || !rucniCenaSmi(cesta)) return false;
  const h = rcGet(data && data.cenik, cesta);
  return typeof r.hodnota === 'number' && isFinite(r.hodnota) && r.hodnota > 0 && h === r.hodnota;
}
/* Obsah potvrzení: hodnota a zdroj. Změna čehokoli = nové potvrzení. */
function rucniCenaObsah(r) {
  const x = r || {};
  return JSON.stringify([typeof x.hodnota === 'number' ? x.hodnota : null].concat(RC_ZDROJ.map(k => String(x[k] == null ? '' : x[k]))));
}
function rucniCenaDnes(dnes) {
  if (typeof dnes === 'string' && RC_DATUM.test(dnes)) return dnes;
  const d = dnes instanceof Date ? dnes : new Date();
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
/* Platnost nabídky dodavatele prošla (upozornění, ne zábrana). */
function rucniCenaProsla(r, dnes) {
  return !!r && RC_DATUM.test(String(r.platnostDo || '')) && String(r.platnostDo) < rucniCenaDnes(dnes);
}
function rucniCenaStav(r) {
  if (!r) return '';
  return (r.potvrdil && typeof r.potvrdil === 'object') ? RC_POTVRZENO : RC_NEPOTVRZENO;
}

/* ---------- úpravy v prohlížeči (vrací true, když se něco změnilo) ---------- */
/* `zaklad` = ceníková sazba před přepisem (prohlížeč ji ví z ceníku varianty);
 * server ji při potvrzení přepíše platným ceníkem. */
function rucniCenaNastav(data, cesta, hodnota) {
  if (!data || typeof data !== 'object' || !rucniCenaSmi(cesta)) return false;
  const h = +hodnota;
  if (!(isFinite(h) && h > 0 && h <= RC_HODNOTA_MAX)) return false;
  if (!data.cenik || typeof data.cenik !== 'object') data.cenik = {};
  if (!data.rucniCeny || typeof data.rucniCeny !== 'object' || Array.isArray(data.rucniCeny)) data.rucniCeny = {};
  const r = rucniCenaZaznam(data, cesta);
  if (r && r.hodnota === h && rcGet(data.cenik, cesta) === h) return false;
  const pred = rcGet(data.cenik, cesta);
  const n = r || { dodavatel: '', cislo: '', datum: '', platnostDo: '',
    zaklad: typeof pred === 'number' && isFinite(pred) ? pred : null };
  n.hodnota = h;
  n.potvrdil = null;
  data.rucniCeny[cesta] = n;
  rcSet(data.cenik, cesta, h);
  return true;
}
function rucniCenaZdrojNastav(data, cesta, pole, hodnota) {
  const r = rucniCenaZaznam(data, cesta);
  if (!r || RC_ZDROJ.indexOf(pole) < 0) return false;
  let t = String(hodnota == null ? '' : hodnota).replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, RC_TEXT_MAX);
  if ((pole === 'datum' || pole === 'platnostDo') && t && !RC_DATUM.test(t)) t = '';
  if (String(r[pole] || '') === t) return false;
  r[pole] = t;
  r.potvrdil = null;
  return true;
}
/* Potvrzení obchodníkem. Razítko je jen PROZATÍMNÍ (`lokalne`) — po uložení
 * ho server nahradí svým z relace (rucniCenyServer). */
function rucniCenaPotvrd(data, cesta, kdo, kdy) {
  const r = rucniCenaZaznam(data, cesta);
  if (!r || !rucniCenaPlati(data, cesta)) return false;
  r.potvrdil = { jmeno: String(kdo || ''), email: '', kdy: String(kdy || new Date().toISOString()), lokalne: true };
  return true;
}
/* ↺ vrátit na ceník: smaže záznam a vrátí sazbu (`dnesni` = ceníková hodnota
 * z platného ceníku pro řadu varianty; neznámá → `zaklad` záznamu). */
function rucniCenaVrat(data, cesta, dnesni) {
  const r = rucniCenaZaznam(data, cesta);
  if (!r) return false;
  const h = (typeof dnesni === 'number' && isFinite(dnesni)) ? dnesni
    : (typeof r.zaklad === 'number' && isFinite(r.zaklad) ? r.zaklad : undefined);
  delete data.rucniCeny[cesta];
  if (!Object.keys(data.rucniCeny).length) delete data.rucniCeny;
  if (h !== undefined) rcSet(data.cenik || (data.cenik = {}), cesta, h);
  return true;
}
/* Změna čísla jinou cestou (buňka ceny u správce, ceník varianty): záznam
 * se srovná a potvrzení padá. Příplatek S13 bez záznamu, který mění role bez
 * práva ceníku, záznam dostane (B-Q6: stejné potvrzení). Vrací true při změně. */
function rucniCenaPoSet(data, cesta, hodnota, opts) {
  opts = opts || {};
  if (!data || !rucniCenaSmi(cesta)) return false;
  const r = rucniCenaZaznam(data, cesta);
  const h = +hodnota;
  if (r) {
    if (!(isFinite(h) && h > 0)) { delete data.rucniCeny[cesta]; return true; }
    if (r.hodnota === h) return false;
    r.hodnota = h; r.potvrdil = null;
    return true;
  }
  if (!opts.dleNabidky || opts.smiCenik) return false;
  if (!(isFinite(h) && h > 0)) return false;
  if (!data.rucniCeny || typeof data.rucniCeny !== 'object') data.rucniCeny = {};
  data.rucniCeny[cesta] = { hodnota: h, dodavatel: '', cislo: '', datum: '', platnostDo: '',
    zaklad: typeof opts.puvodni === 'number' ? opts.puvodni : null, potvrdil: null };
  return true;
}

/* ---------- souhrny pro kontroly a štítky ---------- */
/* `dleNabidkyF(cesta)` → příznak S13 z PLATNÉHO ceníku; `dnesniF(cesta)` →
 * ceníková sazba platného ceníku pro řadu varianty (neznámá = undefined). */
function rucniCenyPrehled(data, opts) {
  opts = opts || {};
  const out = { nepotvrzene: [], potvrzene: [], prosle: [], cenikZmena: [], bezDokladu: [] };
  const m = rucniCenyMapa(data);
  Object.keys(m).sort().forEach(cesta => {
    const r = m[cesta];
    if (!r || typeof r !== 'object' || !rucniCenaSmi(cesta)) return;
    const pol = { cesta, popis: rucniCenaPopis(cesta) };
    if (rucniCenaStav(r) === RC_POTVRZENO) out.potvrzene.push(pol); else out.nepotvrzene.push(pol);
    if (rucniCenaProsla(r, opts.dnes)) out.prosle.push(pol);
    if (typeof opts.dnesniF === 'function' && rucniCenaStav(r) === RC_POTVRZENO) {
      const d = opts.dnesniF(cesta);
      if (typeof d === 'number' && typeof r.zaklad === 'number' && d !== r.zaklad) out.cenikZmena.push(pol);
    }
  });
  /* Starší vlastní cena příplatku dle nabídky (S13) bez záznamu. */
  if (typeof opts.dleNabidkyF === 'function' && typeof opts.dnesniF === 'function') {
    const c = (data && data.cenik && data.cenik.priplatky && typeof data.cenik.priplatky === 'object') ? data.cenik.priplatky : {};
    Object.keys(c).sort().forEach(k => {
      const cesta = 'C.priplatky.' + k;
      if (rcMa(m, cesta) || !opts.dleNabidkyF(cesta)) return;
      const d = opts.dnesniF(cesta), h = c[k];
      if (typeof d === 'number' && typeof h === 'number' && h !== d) out.bezDokladu.push({ cesta, popis: rucniCenaPopis(cesta) });
    });
  }
  return out;
}
/* Odchylka od ceníku (jen pro správce a controlling): { kc, pct } | null. */
function rucniCenaOdchylka(r) {
  if (!r || typeof r.hodnota !== 'number' || typeof r.zaklad !== 'number' || !isFinite(r.zaklad)) return null;
  const kc = Math.round((r.hodnota - r.zaklad) * 100) / 100;
  return { kc, pct: r.zaklad ? Math.round((r.hodnota - r.zaklad) / r.zaklad * 10000) / 100 : null };
}
/* Text zdroje pro controlling a bublinu štítku (bez částek). */
function rucniCenaZdrojText(r) {
  if (!r) return 'ceník';
  const casti = ['nabídka dodavatele'];
  if (r.dodavatel) casti.push(String(r.dodavatel));
  if (r.cislo) casti.push('č. ' + String(r.cislo));
  if (r.datum) casti.push('z ' + String(r.datum));
  if (r.platnostDo) casti.push('platná do ' + String(r.platnostDo));
  const p = r.potvrdil && typeof r.potvrdil === 'object' ? r.potvrdil : null;
  casti.push(p ? 'potvrdil ' + String(p.jmeno || p.email || '?') + (p.kdy ? ' ' + String(p.kdy).slice(0, 16).replace('T', ' ') : '')
    : 'nepotvrzeno');
  return casti.join(', ');
}

/* ---------- server ---------- */
/* Očista tvaru záznamů. Vrací { ok, mapa } nebo { ok:false, chyba }. */
function rucniCenyOciste(m) {
  if (m === undefined || m === null) return { ok: true, mapa: null };
  if (typeof m !== 'object' || Array.isArray(m)) return { ok: false, chyba: 'ruční ceny položek nemají platný tvar' };
  const klice = Object.keys(m);
  if (klice.length > RC_MAX) return { ok: false, chyba: 'příliš mnoho ručních cen položek (nejvýš ' + RC_MAX + ')' };
  const out = {};
  for (const k of klice) {
    if (!rucniCenaSmi(k)) return { ok: false, chyba: 'ruční cena u položky, která ji mít nesmí (' + (RC_CESTA.test(k) ? k : '?') + ')' };
    const r = m[k];
    if (!r || typeof r !== 'object' || Array.isArray(r)) return { ok: false, chyba: 'ruční cena položky ' + k + ' nemá platný tvar' };
    const h = r.hodnota;
    if (typeof h !== 'number' || !isFinite(h) || h <= 0 || h > RC_HODNOTA_MAX)
      return { ok: false, chyba: 'ruční cena položky ' + k + ' musí být kladné číslo' };
    const n = { hodnota: h };
    for (const z of RC_ZDROJ) {
      const t = r[z] == null ? '' : r[z];
      if (typeof t !== 'string' || t.length > RC_TEXT_MAX || /[\u0000-\u001F\u007F]/.test(t))
        return { ok: false, chyba: 'zdroj ruční ceny položky ' + k + ' (' + z + ') nemá platný tvar' };
      if ((z === 'datum' || z === 'platnostDo') && t && !RC_DATUM.test(t))
        return { ok: false, chyba: 'datum u ruční ceny položky ' + k + ' musí mít tvar RRRR-MM-DD' };
      n[z] = t;
    }
    n.zaklad = (typeof r.zaklad === 'number' && isFinite(r.zaklad)) ? r.zaklad : null;
    n.potvrdil = (r.potvrdil && typeof r.potvrdil === 'object' && !Array.isArray(r.potvrdil)) ? r.potvrdil : null;
    out[k] = n;
  }
  return { ok: true, mapa: out };
}
/* Uložení: tvar, hodnota = ceník varianty, razítka z relace. `stara` = uložená
 * verze po téže migraci, `ctx` = { program, zamcenaDriv(v), obnova }.
 * Varianta zamčená už v uložené verzi se nepřepisuje (data hlídá zámek).
 * V obnově je záznam doklad ze zálohy — jen se očistí tvar. */
function rucniCenyServer(stara, nova, relace, ctx) {
  relace = relace || {}; ctx = ctx || {};
  const ted = new Date().toISOString();
  const role = String(relace.role || '');
  const jmeno = (relace.jmeno || relace.email || '') + (role ? ' (' + role + ')' : '');
  const platny = ctx.program && ctx.program.platny ? ctx.program.platny : null;
  const stare = (stara && Array.isArray(stara.varianty)) ? stara.varianty : [];
  for (const v of ((nova && Array.isArray(nova.varianty)) ? nova.varianty : [])) {
    if (!v || !v.data || typeof v.data !== 'object') continue;
    const o = rucniCenyOciste(v.data.rucniCeny);
    if (!o.ok) return { ok: false, status: 400, chyba: 'Varianta „' + String(v.nazev || v.id).slice(0, 60) + '": ' + o.chyba + '.' };
    if (!o.mapa || !Object.keys(o.mapa).length) { delete v.data.rucniCeny; continue; }
    if (typeof ctx.zamcenaDriv === 'function' && ctx.zamcenaDriv(v)) continue;   // doklad, hlídá zámek
    if (ctx.obnova) { v.data.rucniCeny = o.mapa; continue; }
    const sv = stare.find(x => x && x.id === v.id);
    /* Klon (B154): totéž potvrzení se stejným obsahem z jiné uložené varianty. */
    const kandidati = (sv ? [sv] : []).concat(stare.filter(x => x !== sv));
    const dnesni = platny && typeof vyjimkyDnesniZProgramu === 'function' ? vyjimkyDnesniZProgramu(platny, v.data) : null;
    for (const k of Object.keys(o.mapa)) {
      const r = o.mapa[k];
      /* Hodnota záznamu = hodnota v ceníku varianty (jinak záznam nic nedokládá). */
      if (rcGet(v.data.cenik, k) !== r.hodnota)
        return { ok: false, status: 400, chyba: 'Varianta „' + String(v.nazev || v.id).slice(0, 60) + '": ruční cena položky „'
          + rucniCenaPopis(k) + '" nesedí s cenou v kalkulaci. Zadejte ji znovu.' };
      const obsah = rucniCenaObsah(r);
      let ulozeny = null;
      for (const x of kandidati) {
        const sr = x && x.data ? rucniCenaZaznam(x.data, k) : null;
        if (sr && rucniCenaObsah(sr) === obsah && sr.potvrdil && typeof sr.potvrdil === 'object' && !sr.potvrdil.lokalne) { ulozeny = sr; break; }
      }
      const vlastni = sv && sv.data ? rucniCenaZaznam(sv.data, k) : null;
      if (!r.potvrdil) {
        r.potvrdil = null;
        r.zaklad = vlastni && typeof vlastni.zaklad === 'number' ? vlastni.zaklad : r.zaklad;
      } else if (ulozeny) {
        r.potvrdil = JSON.parse(JSON.stringify({ jmeno: String(ulozeny.potvrdil.jmeno || ''),
          email: String(ulozeny.potvrdil.email || ''), kdy: String(ulozeny.potvrdil.kdy || '') }));
        r.zaklad = typeof ulozeny.zaklad === 'number' ? ulozeny.zaklad : null;
      } else {
        /* Nové potvrzení: razítko z relace, ceníková sazba z platného ceníku. */
        r.potvrdil = { jmeno, email: String(relace.email || ''), kdy: ted };
        const z = dnesni ? rcGet(dnesni.cenik, k) : undefined;
        r.zaklad = typeof z === 'number' && isFinite(z) ? z
          : (vlastni && typeof vlastni.zaklad === 'number' ? vlastni.zaklad : null);
      }
    }
    v.data.rucniCeny = o.mapa;
  }
  return { ok: true };
}
/* NOVÝ ZÁMEK (tisk = odeslání): nepotvrzená ruční cena ho nepustí — u každé
 * role, i u administrátora (zábranu v prohlížeči nepřekročí ani on). */
function rucniCenyZamekProblem(zak, v) {
  const d = (v && v.data) || {};
  const vyr = (typeof zakazkaVyrazenaStrana === 'function') ? (zakazkaVyrazenaStrana(zak) || '') : '';
  if (vyr === 'ock') return '';
  const nep = rucniCenyPrehled(d).nepotvrzene;
  if (!nep.length) return '';
  return 'ruční cena položky není potvrzená (' + nep.slice(0, 5).map(x => x.popis).join(', ')
    + (nep.length > 5 ? ' a další ' + (nep.length - 5) : '') + ') — potvrďte ji v Kalkulaci OCK tlačítkem „Potvrdit cenu“ '
    + 'a nabídku vytiskněte znovu; rozpracovanou zakázku lze dál ukládat';
}

if (typeof module !== 'undefined')
  module.exports = { RC_ZDROJ, RC_TEXT_MAX, RC_MAX, RC_NEPOTVRZENO, RC_POTVRZENO, RC_BEZ_DOKLADU,
    rucniCenaSmi, rucniCenaPopis, rucniCenaJednotka, rucniCenyMapa, rucniCenaZaznam, rucniCenaPlati, rucniCenaObsah,
    rucniCenaDnes, rucniCenaProsla, rucniCenaStav, rucniCenaNastav, rucniCenaZdrojNastav, rucniCenaPotvrd,
    rucniCenaVrat, rucniCenaPoSet, rucniCenyPrehled, rucniCenaOdchylka, rucniCenaZdrojText,
    rucniCenyOciste, rucniCenyServer, rucniCenyZamekProblem };
