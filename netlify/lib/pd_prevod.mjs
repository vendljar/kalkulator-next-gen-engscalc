/* ============================================================
 * PŘEVOD HODNOT KRYCÍHO LISTU NA HODNOTY PIPEDRIVE (21. 10. 2026, #114)
 *
 * Krycí list drží všechno jako text, jak ho obchodník vidí („50 % – po
 * podpisu smlouvy", „Uplatněn limit 10 %", „2 měsíce"). Pipedrive chce
 * podle typu pole číslo, datum ISO, ID volby, pole ID voleb, nebo částku
 * s měnou. Tenhle modul je jediné místo, kde se jedno mění na druhé; zápis
 * (#115) ho jen volá. Je to čistá logika bez sítě — testuje se celý
 * (netlify/test_pd_prevod.mjs).
 *
 * Tři zásady, které platí pro každé pole:
 *   1. Prázdné se NEPOSÍLÁ. Zápis z kalkulace nikdy nemaže, co je v CRM —
 *      prázdné pole v krycím listu znamená „nevím", ne „smazat".
 *   2. Co nejde převést jednoznačně, se NEPOSÍLÁ a vrátí se důvod. Z textu
 *      se nebere „první číslo" (kryciCisloZTextu to tak dělá pro dokumenty):
 *      „NEUPLATNĚN limit 10 %" by se zapsalo jako limit 10 % — přesný opak.
 *      Hodnota se nikdy nezkracuje ani neodhaduje.
 *   3. Volba se hledá podle textu, ne podle pořadí. Pořadí voleb v Pipedrive
 *      může integrátor kdykoli změnit, ID volby se čte z definice pole.
 *
 * Výsledek převodu jednoho pole: { hodnota } (poslat), { prazdne: true }
 * (není co poslat) nebo { duvod } (nejde převést — ukázat obchodníkovi).
 * ============================================================ */

/* Zapisují se jen pole, jejichž vlastníkem je kalkulace (pd_mapa.mjs,
 * `smer: 'zapis'`). Pole, jejichž zdrojem je CRM, kalkulátor nikdy nepřepíše. */
export const PD_SMER_ZAPIS = ['zapis'];

/* Text volby pro porovnání: bez diakritiky a velikosti písmen, interpunkce
 * a pomlčky jako mezera, procento bez mezery („10 %" = „10%"). Krycí list
 * píše „nevýhradní, pro účel…", Pipedrive „Nevýhradní – pro účel…" — po
 * srovnání je to totéž. */
export function pdNorm(t) {
  return String(t == null ? '' : t).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/(\d)\s+%/g, '$1%').replace(/[^a-z0-9%]+/g, ' ').trim();
}

/* Všechna čísla v textu. Mezera mezi trojicemi je oddělovač tisíců
 * („125 000" = 125000), čárka i tečka desetinná („0,05"). */
export function pdCisla(t) {
  const s = String(t == null ? '' : t).replace(/\u00a0|\u202f/g, ' ');
  return (s.match(/\d{1,3}(?: \d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?/g) || [])
    .map((x) => Number(x.replace(/ /g, '').replace(',', '.')));
}

/* ID volby podle textu. Pořadí: přesná shoda → synonymum z mapy → (jen kde
 * to mapa dovolí) shoda prvního slova. Víc kandidátů = žádný. */
export function pdVolba(text, volby, def = {}) {
  const n = pdNorm(text);
  const vs = Array.isArray(volby) ? volby : [];
  if (!n || !vs.length) return null;
  const najdi = (cil) => vs.filter((o) => pdNorm(o.label) === pdNorm(cil));
  let hit = najdi(n);
  if (!hit.length && def.synonyma && def.synonyma[n]) hit = najdi(def.synonyma[n]);
  if (!hit.length && def.podleZacatku) {
    const slovo = n.split(' ')[0];
    hit = vs.filter((o) => pdNorm(o.label).split(' ')[0] === slovo);
  }
  return hit.length === 1 ? hit[0].id : null;
}

const nabidka = (volby) => (volby || []).map((o) => '„' + o.label + '"').join(', ');

/* Právě jedno číslo, jinak důvod. Text v závorce se nepočítá — „16 týdnů
 * (vč. 4 týdnů za ATYP)" je šestnáct týdnů, ne dvě čísla. */
/* Závorky pryč LINEÁRNĚ (K8-S2, #514, audit K8 24. 10. 2026). Regulár
 * `/\([^)]*\)/g` byl u textu s mnoha „(" bez „)" kvadratický (200 000× „("
 * = 18 s CPU v jednom požadavku). Průchod dává TÝŽ výsledek jako regulár:
 * od „(" k nejbližší „)" se nahradí mezerou, „(" bez „)" za sebou zůstane. */
export function pdBezZavorek(text) {
  const t = String(text);
  let out = '', i = 0;
  while (i < t.length) {
    const z = t.indexOf('(', i);
    if (z < 0) { out += t.slice(i); break; }
    const k = t.indexOf(')', z + 1);
    if (k < 0) { out += t.slice(i); break; }
    out += t.slice(i, z) + ' ';
    i = k + 1;
  }
  return out;
}

function jedno(text, bezZavorek) {
  const t = bezZavorek ? pdBezZavorek(text) : String(text);
  const c = pdCisla(t);
  if (c.length === 1) return { hodnota: c[0] };
  return { duvod: c.length ? 'v hodnotě „' + text + '" je víc čísel' : 'v hodnotě „' + text + '" není číslo' };
}

function cislo(def, text) {
  const n = pdNorm(text);
  if (def.prevod === 'limit' && /\bneuplatn/.test(n)) return { hodnota: 0 };
  if (/^bez zalohy\b/.test(n)) return { hodnota: 0 };
  if (def.jednotka === 'mesic') {
    if (/\b(tyd|den|dni|dnu|dny)/.test(n)) return { duvod: 'platnost „' + text + '" není v měsících' };
    return jedno(text, true);
  }
  if (def.jednotka === 'tyden') {
    if (/\b(mesic|den|dni|dnu|dny)/.test(n)) return { duvod: 'termín „' + text + '" není v týdnech' };
    return jedno(text, true);
  }
  return jedno(text, false);
}

/* Datum: pole typu date dává ISO (2026-11-30); ručně psané „30. 11. 2026"
 * se převede. Neexistující den (31. 2.) se nepošle. */
function datum(text) {
  const t = String(text).trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  const iso = m ? [m[1], m[2], m[3]] : null;
  m = /^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/.exec(t);
  const cz = m ? [m[3], m[2].padStart(2, '0'), m[1].padStart(2, '0')] : null;
  const d = iso || cz;
  if (!d) return { duvod: 'datum „' + t + '" není ve tvaru 30. 11. 2026' };
  const s = d.join('-');
  const kontrola = new Date(s + 'T00:00:00Z');
  if (isNaN(kontrola) || kontrola.toISOString().slice(0, 10) !== s) return { duvod: 'datum „' + t + '" neexistuje' };
  return { hodnota: s };
}

/* Částka: Pipedrive chce { value, currency }. Procento do peněz nepatří —
 * „0,05 % z ceny díla" není částka a nic se z něj nedopočítává. */
function mena(text, spolecne) {
  if (/%/.test(text)) return { duvod: '„' + text + '" je procento, pole čeká částku' };
  const j = jedno(text, false);
  if (j.duvod) return j;
  const n = pdNorm(text);
  const kod = /\beur\b|€/.test(String(text).toLowerCase()) ? 'EUR'
    : /\bkc\b|\bczk\b/.test(n) ? 'CZK' : (spolecne.mena || 'CZK');
  return { hodnota: { value: j.hodnota, currency: kod } };
}

/* Uživatel Pipedrive podle e-mailu (přesně), jinak podle jména bez titulů
 * a bez všeho za čárkou („Ing. Jan Vzorový, ČKAIT 0001234" → „jan vzorovy").
 * Seznam uživatelů dodá zápis (GET /users, oprávnění users:read). */
const TITULY = /\b(ing|arch|mgr|bc|judr|phdr|rndr|doc|prof|ph ?d|csc|mba|dis)\b/g;
function uzivatel(text, spolecne) {
  const lide = spolecne.uzivatele;
  if (!Array.isArray(lide)) return { duvod: 'seznam uživatelů Pipedrive není k dispozici' };
  const t = String(text).trim();
  let hit;
  if (/@/.test(t)) hit = lide.filter((u) => String(u.email || '').toLowerCase() === t.toLowerCase());
  else {
    const jmeno = (s) => pdNorm(String(s).split(',')[0]).replace(TITULY, ' ').replace(/\s+/g, ' ').trim();
    const j = jmeno(t);
    hit = j ? lide.filter((u) => jmeno(u.name || '') === j) : [];
  }
  if (hit.length === 1) return { hodnota: hit[0].id };
  return { duvod: hit.length ? '„' + t + '" odpovídá víc uživatelům Pipedrive' : '„' + t + '" mezi uživateli Pipedrive není' };
}

function rucne(zdroj, id) {
  const r = zdroj && zdroj.rucne;
  return !!(r && Object.prototype.hasOwnProperty.call(r, id) && String(r[id] == null ? '' : r[id]).trim() !== '');
}

/* Převod jednoho pole. `zdroj` = jedna strana zakázky:
 *   hodnoty    platné hodnoty krycího listu (id → text, jak je ukazuje
 *              kryciHodnota / kryciProjHodnota),
 *   rucne      ruční přepisy (data.kryci.hodnoty) — kvůli `jenRucne`,
 *   atyp       true/false z kalkulace OCK (pole „ATYP"),
 *   kalendar   PROJ: seznam plateb smlouvy o dílo (planPdKalendar, #512),
 *   cena, mena cena řídící varianty bez DPH a měna (hodnota dealu, #512).
 * `popis` = popisy[klic] z mapy polí (typ, volby, zapisovatelnost).
 * `spolecne` = { uzivatele, mena } pro celou zakázku. */
export function pdDoPd(def, strana, zdroj, popis, spolecne = {}) {
  if (!def || !PD_SMER_ZAPIS.includes(def.smer)) return { prazdne: true };
  const kl = def.kl && def.kl[strana];
  if (!kl) return { prazdne: true };
  if (def.jenRucne && def.jenRucne.includes(strana) && !rucne(zdroj, kl)) return { prazdne: true };

  const ids = [].concat(kl);
  const cti = (id) => {
    if (id === '@atyp') return (zdroj && zdroj.atyp === true) ? 'Ano' : (zdroj && zdroj.atyp === false) ? 'Ne' : '';
    if (id === '@kalendar') return String((zdroj && typeof zdroj.kalendar === 'string') ? zdroj.kalendar : '').trim();
    const h = zdroj && zdroj.hodnoty;
    return String(h && h[id] != null ? h[id] : '').trim();
  };
  const v = ids.map(cti);
  if (v.every((x) => x === '')) return { prazdne: true };
  if (!popis) return { duvod: 'pole „' + def.nazev + '" v Pipedrive chybí nebo má jiný typ' };
  if (popis.zapisovatelne === false) return { duvod: 'pole „' + def.nazev + '" je v Pipedrive jen ke čtení' };
  const volby = popis.volby || [];
  const volbou = (text) => {
    const id = pdVolba(text, volby, def);
    return id === null ? { duvod: '„' + text + '" není mezi volbami Pipedrive (' + nabidka(volby) + ')' } : { hodnota: id };
  };

  if (def.prevod === 'zadrzne') {
    const [ano, proc] = v;
    const n = pdNorm(ano);
    if (n === 'ne') return volbou('Ne');
    if (n !== 'ano') return { duvod: 'zádržné „' + ano + '" není Ano ani Ne' };
    if (!proc) return { duvod: 'zádržné je „Ano", ale bez procenta' };
    const j = jedno(proc, false);
    return j.duvod ? j : volbou(String(j.hodnota).replace('.', ',') + ' %');
  }
  if (def.prevod === 'dph') {
    const [sazba, rezim] = v;
    if (/\bprenesen|\breverse charge\b/.test(pdNorm(rezim))) {
      const nula = volby.filter((o) => /^0%/.test(pdNorm(o.label)));
      return nula.length === 1 ? { hodnota: nula[0].id } : { duvod: 'Pipedrive nemá volbu 0 % pro přenesenou daňovou povinnost' };
    }
    if (!sazba) return { prazdne: true };
    const j = jedno(sazba, false);
    return j.duvod ? j : volbou(j.hodnota + ' %');
  }
  if (def.prevod === 'dokumentace') {
    const [dsp, prov] = v.map(pdNorm);
    const vyber = [];
    for (const [ano, nazev] of [[dsp, 'DSP'], [prov, 'Prováděcí dokumentace']]) {
      if (ano === 'ano') {
        const id = pdVolba(nazev, volby);
        if (id === null) return { duvod: 'Pipedrive nemá volbu „' + nazev + '"' };
        vyber.push(id);
      } else if (ano && ano !== 'ne') return { duvod: '„' + ano + '" není Ano ani Ne' };
    }
    /* Obojí „Ne" je vědomá odpověď, ne prázdno: vícevýběr se v API v2
     * vyprazdňuje hodnotou null (prázdné pole [] Pipedrive nepřijme). */
    return { hodnota: vyber.length ? vyber : null };
  }

  const text = v[0];
  switch (def.druh) {
    case 'text':
      if (popis.typ === 'varchar' && text.length > 255)
        return { duvod: 'text má ' + text.length + ' znaků, pole „' + def.nazev + '" jich pojme 255' };
      return { hodnota: text };
    case 'cislo':
    case 'procento': return cislo(def, text);
    case 'datum': return datum(text);
    case 'volba': return volbou(text);
    case 'mena': return mena(text, spolecne);
    case 'uzivatel': return uzivatel(text, spolecne);
    default: return { duvod: 'údaj typu „' + def.druh + '" kalkulátor do Pipedrive nezapisuje' };
  }
}

/* HODNOTA DEALU (#512, rozhodnutí J. V. 23. 10. 2026). Nativní pole dealu
 * `value` + `currency`, ne vlastní pole: cena řídící varianty BEZ DPH
 * v měně zakázky, u kombinované zakázky součet OCK a PROJ. Cena je vždy
 * výsledek kalkulace (`zdroj.cena`), nikdy převzaté ani odhadnuté číslo:
 * chybí-li u kterékoli strany, nebo mají strany různou měnu, hodnota se
 * NEPOŠLE vůbec — poloviční součet by v CRM vypadal jako celá zakázka.
 * `stara` = { value, currency } dealu před zápisem (pro „stará → nová"). */
export function pdKcText(h) {
  if (!h || typeof h.value !== 'number' || !isFinite(h.value)) return '(prázdná)';
  const [cele, des] = Math.abs(h.value).toFixed(2).split('.');
  const t = cele.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (des === '00' ? '' : ',' + des);
  return (h.value < 0 ? '−' : '') + t + ' ' + (h.currency || '');
}
export function pdHodnotaDealu(strany, stara) {
  const casti = ['ock', 'proj'].filter((k) => strany && strany[k]);
  if (!casti.length) return { prazdne: true };
  let soucet = 0, mena = null;
  for (const k of casti) {
    const c = strany[k].cena;
    if (typeof c !== 'number' || !isFinite(c) || c <= 0)
      return { duvod: 'cena ' + k.toUpperCase() + ' bez DPH z kalkulace chybí — hodnota dealu se nezapíše' };
    const m = String(strany[k].mena || 'CZK').toUpperCase();
    if (mena && m !== mena) return { duvod: 'OCK a PROJ mají různou měnu (' + mena + ' / ' + m + ') — hodnota dealu se nezapíše' };
    mena = m; soucet += c;
  }
  const nova = { value: Math.round(soucet * 100) / 100, currency: mena };
  const s = (stara && typeof stara.value === 'number') ? { value: stara.value, currency: stara.currency || '' } : null;
  return { hodnota: nova, stara: s,
    zmena: !s || s.value !== nova.value || s.currency !== nova.currency,
    text: pdKcText(s) + ' → ' + pdKcText(nova) };
}

/* Celý zápis jedné zakázky do `custom_fields` dealu — jeden PATCH (5 tokenů)
 * bez ohledu na počet polí. `strany` = { ock?: zdroj, proj?: zdroj },
 * `pole` = mapa z pdPoleMapa() ({ mapa, popisy }). Hodnota dealu jde do
 * `deal` (value + currency vedle custom_fields v témže PATCH) a do
 * `potvrzeni` jako „stará → nová"; `spolecne.deal` = deal před zápisem.
 *
 * Kombinovaná zakázka: u polí, která mají OCK i PROJ, rozhoduje OCK
 * (realizace je smluvně nosná část). PROJ se použije, jen když OCK pro to
 * pole nic nemá. Když hodnotu OCK převést nejde, PROJ ji NENAHRADÍ —
 * do CRM by tiše odešla hodnota druhé smlouvy. */
export function pdZapisDealu(definice, strany, pole, spolecne = {}) {
  const custom_fields = {}, duvody = [], zapsano = [];
  const mapa = (pole && pole.mapa) || {}, popisy = (pole && pole.popisy) || {};
  for (const def of definice || []) {
    if (!PD_SMER_ZAPIS.includes(def.smer)) continue;
    for (const strana of ['ock', 'proj']) {
      if (!strany || !strany[strana]) continue;
      const r = pdDoPd(def, strana, strany[strana], mapa[def.klic] ? popisy[def.klic] : null, spolecne);
      if (r.prazdne) continue;
      if (r.duvod) duvody.push({ klic: def.klic, nazev: def.nazev, strana, duvod: r.duvod });
      else { custom_fields[mapa[def.klic]] = r.hodnota; zapsano.push(def.klic); }
      break;
    }
  }
  const deal = {}, potvrzeni = [];
  const hd = pdHodnotaDealu(strany, spolecne.deal);
  if (hd.duvod) duvody.push({ klic: 'hodnotaDealu', nazev: 'Hodnota dealu', strana: '', duvod: hd.duvod });
  else if (hd.hodnota) {
    Object.assign(deal, hd.hodnota);
    potvrzeni.push({ klic: 'hodnotaDealu', nazev: 'Hodnota dealu', text: hd.text, zmena: hd.zmena });
  }
  return { custom_fields, deal, duvody, zapsano, potvrzeni };
}

/* ============================================================
 * SUCHÝ BĚH ZÁPISU (#536, 27. 10. 2026)
 *
 * „Co by se zapsalo do Pipedrive" — tabulka pole v Pipedrive → hodnota →
 * zdroj v kalkulaci, s upozorněním na nedopsaná pole, hodnoty, které nejde
 * převést, a kolize. NIC SE NEODESÍLÁ. Rozhoduje TÁŽ logika jako zápis
 * (pdDoPd po stranách, OCK má přednost, PROJ nenahrazuje nepřevoditelnou
 * hodnotu OCK) — test hlídá, že řádky „zapíše" jsou přesně custom_fields
 * z pdZapisDealu. Náhled tak nemůže slibovat něco jiného, než pak odejde.
 *
 * Stav řádku:
 *   zapise      hodnota se převedla a odešla by,
 *   nelze       hodnota je vyplněná, ale převést ji nejde (důvod),
 *   chybiPole   pole v Pipedrive chybí / má jiný typ — nic by se nezapsalo,
 *   neovereno   uživatel Pipedrive se dohledá až při zápisu (bez seznamu
 *               uživatelů, tedy bez napojení),
 *   prazdne     v kalkulaci nevyplněno — do CRM nic (zápis nikdy nemaže).
 * Kolize (seznam vět u řádku):
 *   · OCK a PROJ mají pro totéž pole různé hodnoty — zapíše se OCK,
 *   · v CRM je dnes jiná hodnota — zápis ji přepíše (jen když je deal znám).
 * `zdroje` = { ock: { id → popis pole v kalkulaci }, proj: {…} } — popisky
 * posílá klient (zná krycí list), server je jen opisuje.
 * ============================================================ */
export const PD_NANECISTO_STAVY = ['zapise', 'nelze', 'chybiPole', 'neovereno', 'prazdne'];

/* Hodnota pole Pipedrive jako text pro člověka: volba podle ID → text,
 * částka → „12 300 CZK", uživatel → jméno. Rozumí hodnotě k zápisu
 * (ID, pole ID, { value, currency }) i hodnotě z dealu v API v2. */
export function pdZobraz(hodnota, popis, spolecne = {}) {
  if (hodnota === null || hodnota === undefined || hodnota === '') return '';
  const volby = (popis && popis.volby) || [];
  const typ = popis && popis.typ;
  if (Array.isArray(hodnota)) return hodnota.map((h) => pdZobraz(h, popis, spolecne)).filter(Boolean).join(', ');
  if (typeof hodnota === 'object') {
    if (hodnota.label !== undefined) return String(hodnota.label);
    if (typeof hodnota.value === 'number' && hodnota.currency !== undefined) return pdKcText(hodnota);
    if (hodnota.name !== undefined) return String(hodnota.name);
    if (hodnota.value !== undefined) return pdZobraz(hodnota.value, popis, spolecne);
    if (hodnota.id !== undefined) return pdZobraz(hodnota.id, popis, spolecne);
    return '';
  }
  if ((typ === 'enum' || typ === 'set') && volby.length) {
    const o = volby.find((x) => String(x.id) === String(hodnota));
    if (o) return String(o.label);
  }
  if (typ === 'user' && Array.isArray(spolecne.uzivatele)) {
    const u = spolecne.uzivatele.find((x) => String(x.id) === String(hodnota));
    if (u) return String(u.name || u.email || hodnota);
  }
  return String(hodnota);
}

function pdZdrojText(def, strana, zdroj, zdroje) {
  const popisky = (zdroje && zdroje[strana]) || {};
  return [].concat(def.kl[strana]).map((id) => {
    const p = popisky[id] || (id === '@atyp' ? 'Kalkulace OCK › ATYP'
      : id === '@kalendar' ? 'Plán plateb PROJ › platební kalendář smlouvy' : id);
    return strana.toUpperCase() + ': ' + p;
  }).join(' + ');
}

function pdHodnotaText(def, strana, zdroj) {
  return [].concat(def.kl[strana]).map((id) => {
    if (id === '@atyp') return (zdroj && zdroj.atyp === true) ? 'Ano' : (zdroj && zdroj.atyp === false) ? 'Ne' : '';
    if (id === '@kalendar') return String((zdroj && zdroj.kalendar) || '').trim();
    const h = zdroj && zdroj.hodnoty;
    return String(h && h[id] != null ? h[id] : '').trim();
  }).filter(Boolean).join(' / ');
}

export function pdNanecisto(definice, strany, pole, spolecne = {}, zdroje = {}) {
  const mapa = (pole && pole.mapa) || {}, popisy = (pole && pole.popisy) || {};
  const cf = (spolecne.deal && spolecne.deal.custom_fields) || null;
  const s = strany || {};
  const pritomne = ['ock', 'proj'].filter((k) => s[k]);
  const radky = [];
  for (const def of definice || []) {
    if (!PD_SMER_ZAPIS.includes(def.smer) || !def.kl) continue;
    const tykaSe = pritomne.filter((k) => def.kl[k]);
    if (!tykaSe.length) continue;
    const popis = mapa[def.klic] ? popisy[def.klic] : null;
    const r = { klic: def.klic, nazev: def.nazev, typ: popis ? popis.typ : (def.typ || []).join(' / '),
      strana: '', zdroj: pdZdrojText(def, tykaSe[0], s[tykaSe[0]], zdroje), hodnotaKalkulace: '',
      hodnota: null, hodnotaText: '', stav: 'prazdne', duvod: '', kolize: [], vCrm: '' };
    const texty = {};
    let vybrano = null;
    for (const strana of tykaSe) {
      texty[strana] = pdHodnotaText(def, strana, s[strana]);
      if (vybrano) continue;
      const v = pdDoPd(def, strana, s[strana], popis, spolecne);
      if (v.prazdne) continue;
      vybrano = { strana, v };
    }
    if (vybrano) {
      r.strana = vybrano.strana;
      r.zdroj = pdZdrojText(def, vybrano.strana, s[vybrano.strana], zdroje);
      r.hodnotaKalkulace = texty[vybrano.strana];
      if (vybrano.v.duvod) {
        r.duvod = vybrano.v.duvod;
        r.stav = !popis ? 'chybiPole'
          : (def.druh === 'uzivatel' && !Array.isArray(spolecne.uzivatele)) ? 'neovereno' : 'nelze';
      } else {
        r.stav = 'zapise';
        r.hodnota = vybrano.v.hodnota;
        r.hodnotaText = vybrano.v.hodnota === null ? '(vyprázdnit výběr)' : pdZobraz(vybrano.v.hodnota, popis, spolecne);
      }
    } else if (!mapa[def.klic]) {
      r.duvod = 'pole „' + def.nazev + '" v Pipedrive chybí nebo má jiný typ';
    }
    /* Kolize OCK × PROJ: obě strany vyplněné a jiné — zapíše se OCK
     * (pdZapisDealu), PROJ zůstane jen v kalkulaci. */
    if (texty.ock && texty.proj && pdNorm(texty.ock) !== pdNorm(texty.proj))
      r.kolize.push('OCK „' + texty.ock + '" × PROJ „' + texty.proj + '" — zapíše se hodnota OCK');
    /* Kolize s CRM: v dealu je dnes něco jiného, zápis by to přepsal. */
    if (cf && mapa[def.klic]) {
      r.vCrm = pdZobraz(cf[mapa[def.klic]], popis, spolecne);
      if (r.stav === 'zapise' && r.vCrm && pdNorm(r.vCrm) !== pdNorm(r.hodnotaText))
        r.kolize.push('v Pipedrive je dnes „' + r.vCrm + '" — zápis ji přepíše');
    }
    radky.push(r);
  }
  /* Hodnota dealu (nativní pole value + currency, #512). */
  const hd = pdHodnotaDealu(s, spolecne.deal ? { value: spolecne.deal.value, currency: spolecne.deal.currency } : null);
  if (!hd.prazdne) {
    const r = { klic: 'hodnotaDealu', nazev: 'Hodnota dealu', typ: 'monetary', strana: pritomne.join('+'),
      zdroj: pritomne.map((k) => k.toUpperCase() + ': cena řídící varianty bez DPH').join(' + '),
      hodnotaKalkulace: '', hodnota: null, hodnotaText: '', stav: 'zapise', duvod: '', kolize: [], vCrm: '' };
    if (hd.duvod) { r.stav = 'nelze'; r.duvod = hd.duvod; }
    else {
      r.hodnota = hd.hodnota; r.hodnotaText = pdKcText(hd.hodnota); r.hodnotaKalkulace = r.hodnotaText;
      if (hd.stara) { r.vCrm = pdKcText(hd.stara); if (hd.zmena) r.kolize.push('v Pipedrive je dnes „' + r.vCrm + '" — zápis ji přepíše'); }
    }
    radky.push(r);
  }
  const souhrn = { celkem: radky.length, kolize: radky.filter((r) => r.kolize.length).length };
  for (const st of PD_NANECISTO_STAVY) souhrn[st] = radky.filter((r) => r.stav === st).length;
  return { radky, souhrn };
}

/* ============================================================
 * ZAMÝŠLENÝ ZÁPIS VČETNĚ STAVU DEALU (#536 pro C4 #540, 27. 10. 2026)
 *
 * Tlačítko „Prodáno" na konci krycího listu (C4, rozhodnutí J. V.
 * 27. 10. 2026) zamkne krycí list a připraví zápis = data z krycího listu
 * + přepnutí dealu na „Vyhráno". Bez tokenu se zápis jen uloží jako
 * připravený a ukáže se „co by se zapsalo". Tahle funkce je jeho jediné
 * jádro, oddělené od UI i od sítě:
 *   pdZamyslenyZapis(definice, strany, pole, spolecne, { stav: 'won' })
 *     → { patch: { custom_fields, value?, currency?, status? }, radky, souhrn, duvody }
 * `patch` je přesně tělo PATCH /api/v2/deals/{id}, které by odešlo (a které
 * C4 smí uložit jako připravené); `radky` a `souhrn` jsou tabulka náhledu
 * (pdNanecisto) s řádkem „Stav dealu" navíc. Nic neodesílá.
 * ============================================================ */
export const PD_STAVY_DEALU = { open: 'Otevřeno', won: 'Vyhráno', lost: 'Prohráno' };

export function pdZamyslenyZapis(definice, strany, pole, spolecne = {}, volby = {}, zdroje = {}) {
  const z = pdZapisDealu(definice, strany, pole, spolecne);
  const n = pdNanecisto(definice, strany, pole, spolecne, zdroje);
  const patch = Object.assign({ custom_fields: z.custom_fields }, z.deal);
  const stav = volby && volby.stav;
  if (stav !== undefined && stav !== null && stav !== '') {
    if (!Object.prototype.hasOwnProperty.call(PD_STAVY_DEALU, stav))
      throw new Error('Neznámý stav dealu: ' + stav);
    patch.status = stav;
    const dnes = spolecne.deal ? String(spolecne.deal.status || '') : '';
    const r = { klic: 'stavDealu', nazev: 'Stav dealu', typ: 'status', strana: '',
      zdroj: volby.zdroj || 'Krycí list › Prodáno', hodnotaKalkulace: PD_STAVY_DEALU[stav],
      hodnota: stav, hodnotaText: PD_STAVY_DEALU[stav] + ' (' + stav + ')', stav: 'zapise', duvod: '',
      kolize: [], vCrm: dnes ? (PD_STAVY_DEALU[dnes] || dnes) + ' (' + dnes + ')' : '' };
    if (dnes && dnes !== stav && dnes !== 'open')
      r.kolize.push('deal je dnes „' + r.vCrm + '" — zápis ho přepne na „' + r.hodnotaText + '"');
    if (dnes === 'deleted') { r.stav = 'nelze'; r.duvod = 'deal je v Pipedrive smazaný'; delete patch.status; }
    n.radky.push(r);
    n.souhrn.celkem++; n.souhrn[r.stav]++;
    if (r.kolize.length) n.souhrn.kolize++;
  }
  return { patch, radky: n.radky, souhrn: n.souhrn, duvody: z.duvody };
}
