/* ============================================================================
 * RUČNÍ POLOŽKY KALKULACE OCK V NABÍDCE A KRYCÍM LISTU (dávka RP, #736 prac.;
 * rozhodnutí J. V. 23. 11. 2026, podnět CN-431).
 *
 * Ruční položka (řádek „+ přidat položku" v sekci kalkulace OCK, bez `kid`
 * — trvalé položky z ceníku sem nepatří) se do 23. 11. 2026 započítala do
 * ceny, ale nikde se nevytiskla. Od dávky RP:
 *   1. tiskne se VŽDY, do sekce technické specifikace, kterou určuje sekce
 *      kalkulace (RP_SEKCE_TS — pevný převod, žádná volba obchodníka);
 *   2. má jednotku (RP_JEDNOTKY, výchozí ks; starý soubor bez jednotky = ks)
 *      a nepovinný dodatkový text do cenové nabídky;
 *   3. řádek specifikace: NÁZEV VELKÝMI PÍSMENY | „množství jednotka"
 *      a pod tím dodatkový text (Word: klon řádku kotvy cílové sekce přes
 *      docxRadkyNavic; online náhled: řádek v sekci);
 *   4. cena: samostatný řádek v cenovém bloku (vzor můstků #560), součet
 *      řádků = cena před slevou na korunu i na euro — viz rpRozpisCeny;
 *   5. krycí list OCK: řádek „Ruční položky v ceně";
 *   6. překlad: název a dodatkový text volitelně EN/DE/FR (`jazyky`, vzor
 *      #379); chybí-li, kontrola před tiskem „rucniPolozkaCesky" upozorní.
 *
 * ŽÁDNÝ DRUHÝ VÝPOČET: cena položky je `sMarzi` řádku z výsledku výpočtu
 * (u odeslané nabídky ze zmrazeného výsledku), zadání dodá jen jednotku,
 * dodatkový text a překlady. Modul je čistý (žádné DOM, žádné ZAK).
 * ========================================================================== */

/* Jednotky ruční položky (J. V. 23. 11. 2026). */
const RP_JEDNOTKY = ['ks', 'bm', 'm²', 'kpl'];

/* Sekce kalkulace → sekce technické specifikace (J. V. 23. 11. 2026, bod 1).
 * Můstky v rozhodnutí nejsou — ruční řádek sekce MŮSTKY (jen skladebný
 * model) jde do sekce MŮSTKY MEZI BUDOVOU A OCK (návrh dávky, k potvrzení). */
const RP_SEKCE_TS = {
  hrubaOck: 'KONSTRUKČNÍ ŘEŠENÍ ŠACHTY', atyp: 'KONSTRUKČNÍ ŘEŠENÍ ŠACHTY',
  spojovaci: 'KONSTRUKČNÍ ŘEŠENÍ ŠACHTY', lakovani: 'KONSTRUKČNÍ ŘEŠENÍ ŠACHTY',
  oplasteni: 'OPLÁŠTĚNÍ ŠACHTY',
  volitelne: 'DOPLŇKOVÉ KONSTRUKCE',
  mustky: 'MŮSTKY MEZI BUDOVOU A OCK',
  rezie: 'PROJEKČNÍ A PŘÍPRAVNÉ PRÁCE',
};
/* Popisky sekcí kalkulace (krycí list, obrazovka). */
const RP_SEKCE_KALK = {
  hrubaOck: 'Hrubá OCK', atyp: 'ATYP', spojovaci: 'Spojovací materiál', lakovani: 'Lakování',
  oplasteni: 'Opláštění', volitelne: 'Volitelné', mustky: 'Můstky', rezie: 'Režie',
};
const RP_PORADI = ['hrubaOck', 'atyp', 'spojovaci', 'lakovani', 'oplasteni', 'volitelne', 'mustky', 'rezie'];
/* Sekce specifikace, které jsou u víc šachet za každou šachtu (smyčka
 * {#sachty} šablony v17/v18); PROJEKČNÍ A PŘÍPRAVNÉ PRÁCE je společná. */
const RP_SEKCE_SACHTY = ['KONSTRUKČNÍ ŘEŠENÍ ŠACHTY', 'OPLÁŠTĚNÍ ŠACHTY', 'DOPLŇKOVÉ KONSTRUKCE', 'MŮSTKY MEZI BUDOVOU A OCK'];

/* KOTVA VE WORDU: řádek, ZA který se ruční řádek naklonuje — poslední řádek
 * cílové sekce šablony CN (v18), pak náhradní kotvy pro starší šablony
 * (docxRadkyNavic bez kotvy řádek nevloží; rpKotva vybere první, kterou
 * šablona má). Kotva, která sama zmizí jako prázdná, klon nezruší. */
const RP_KOTVY = {
  'KONSTRUKČNÍ ŘEŠENÍ ŠACHTY': ['TS_POZARNI', 'TS_STRECHA', 'TS_HAKY'],
  'OPLÁŠTĚNÍ ŠACHTY': ['TS_NAPOJENI_DVERI', 'TS_PARAMETRY_KOTVY', 'TS_KOTVENI_OPLASTENI'],
  'DOPLŇKOVÉ KONSTRUKCE': ['TS_SOKL', 'TS_PRECHODOVE_PLECHY'],
  'MŮSTKY MEZI BUDOVOU A OCK': ['TS_MUSTKY_SLOUPY', 'TS_SOKL', 'TS_PRECHODOVE_PLECHY'],
  'PROJEKČNÍ A PŘÍPRAVNÉ PRÁCE': ['TS_STATIKA', 'TS_DILENSKA_DOK'],
};
function rpKotva(sekceTs, symboly) {
  const k = RP_KOTVY[sekceTs] || [];
  if (!symboly) return k[0] || null;
  return k.find(s => symboly.has(s)) || null;
}

function rpJednotka(p) { return (p && RP_JEDNOTKY.indexOf(p.jednotka) >= 0) ? p.jednotka : 'ks'; }

/* zdrojový záznam ruční položky v zadání (starší soubory: volitelneVlastni) */
function rpZdroj(Z, sekce, idx) {
  const z = Z || {};
  let a = (z.vlastniPolozky && Array.isArray(z.vlastniPolozky[sekce])) ? z.vlastniPolozky[sekce] : [];
  if (sekce === 'volitelne' && !a.length && Array.isArray(z.volitelneVlastni)) a = z.volitelneVlastni;
  return a[idx] || null;
}

/* Ruční položky z VÝSLEDKU výpočtu (jen počítané řádky — volitelné ruční
 * jsou zahrnuté vždy). Řádek: { sekce, sekceKalk, sekceTs, idx, nazev,
 * mnozstvi, jednotka, dodatek, jazyky, sMarzi }. Prázdný název nebo nulové
 * množství = řádek „vypnutý", netiskne se. Pořadí: sekce kalkulace, pak
 * pořadí v sekci. */
function rucniPolozkyVysledku(r, Z) {
  if (!r || !r.sekce) return [];
  const out = [];
  const pridej = (sekce, idx, row, src, sMarzi) => {
    const nazev = String(row.nazev == null ? '' : row.nazev).trim();
    const mn = +(row.mnozstvi != null ? row.mnozstvi : row.ks) || 0;
    if (!nazev || !(mn > 0)) return;
    out.push({
      sekce, sekceKalk: RP_SEKCE_KALK[sekce], sekceTs: RP_SEKCE_TS[sekce], idx,
      nazev, mnozstvi: mn, jednotka: rpJednotka(src),
      dodatek: String(src.dodatek == null ? '' : src.dodatek).trim(),
      jazyky: (src.jazyky && typeof src.jazyky === 'object' && !Array.isArray(src.jazyky)) ? src.jazyky : {},
      sMarzi: +sMarzi || 0,
    });
  };
  Object.keys(r.sekce).forEach(k => {
    (Array.isArray(r.sekce[k]) ? r.sekce[k] : []).forEach(row => {
      if (!row || !row.vlastni || !row.sekce || !RP_SEKCE_TS[row.sekce]) return;
      const src = rpZdroj(Z, row.sekce, row.idx) || {};
      /* trvalá položka z ceníku: `kid` ve výsledku, pojistka i v zadání (revize N5) */
      if (row.kid || src.kid) return;
      pridej(row.sekce, row.idx, row, src, row.sMarzi);
    });
  });
  /* SPOJOVACÍ MATERIÁL A LAKOVÁNÍ (revize N2). Jádro vede vlastní položky těchto
   * sekcí mimo r.sekce — jako náklad uvnitř jednoho řádku Hrubé OCK. V UI ruční
   * položka (bez kid) do nich nejde, jen u importovaného souboru; nesmí ale zvednout
   * cenu bez tisku. Cena s marží = náklad × poměr cena/náklad jejich řádku Hrubé OCK
   * (táž marže, žádný druhý výpočet). Pořadí řádků = pořadí v zadání. */
  const radekSekce = nazev => {
    let x = null;
    Object.keys(r.sekce).forEach(k => (Array.isArray(r.sekce[k]) ? r.sekce[k] : []).forEach(row => {
      if (row && (row.origNazev || row.nazev) === nazev) x = row;
    }));
    return x;
  };
  [['spojovaci', r.spojovaci && r.spojovaci.rows, 'SPOJOVACÍ MATERIÁL'],
   ['lakovani', r.lakovani && r.lakovani.vlastniRows, 'LAKOVÁNÍ (ŠACHTA, PLECHY, ZASKLENÍ, OPLECHOVÁNÍ)']].forEach(([sek, rows, nazevRadku]) => {
    const vl = (Array.isArray(rows) ? rows : []).filter(x => x && x.vlastni);
    if (!vl.length) return;
    const rs = radekSekce(nazevRadku);
    const pomer = (rs && +rs.naklad > 0) ? (+rs.sMarzi || 0) / (+rs.naklad) : 0;
    vl.forEach((row, i) => {
      const src = rpZdroj(Z, sek, i) || {};
      if (src.kid) return;
      pridej(sek, i, row, src, (+row.celkem || 0) * pomer);
    });
  });
  return out.sort((a, b) => (RP_PORADI.indexOf(a.sekce) - RP_PORADI.indexOf(b.sekce)) || (a.idx - b.idx));
}

/* Text položky v jazyce dokumentu: jazyková varianta (`jazyky[L][pole]`),
 * jinak slovník (P), jinak česky — jako dodatkové texty (#379). */
function rpText(p, pole, L, P) {
  const cz = String(p[pole] || '');
  if (!L || L === 'cz') return cz;
  const j = p.jazyky && p.jazyky[L] && p.jazyky[L][pole];
  if (typeof j === 'string' && j.trim()) return j.trim();
  return typeof P === 'function' ? P(cz) : cz;
}
function rpCislo(n) {
  return (typeof formatCislo === 'function') ? formatCislo(n, 3)
    : (+n).toLocaleString('cs-CZ', { maximumFractionDigits: 3 });
}
/* Řádek specifikace: [NÁZEV VELKÝMI, „množství jednotka" + \n dodatkový text] */
function rpRadekTs(p, L, P) {
  const tr_ = typeof P === 'function' ? P : (t => t);
  const nazev = rpText(p, 'nazev', L, P).toLocaleUpperCase(L === 'cz' || !L ? 'cs-CZ' : undefined);
  const dod = p.dodatek ? rpText(p, 'dodatek', L, P) : '';
  return { sekceTs: p.sekceTs, nazev, hodnota: rpCislo(p.mnozstvi) + ' ' + tr_(p.jednotka) + (dod ? '\n' + dod : '') };
}

/* Řádky pro docxRadkyNavic (Word) z hotových řádků specifikace (rpRadekTs).
 * `symboly` = Set symbolů šablony (bez šablony první kotva). `jenSekce` =
 * omezení na sekce (víc šachet). Ruční řádek se vloží i bez hodnoty (`vzdy`). */
function rpRadkyWord(radkyTs, symboly, jenSekce) {
  return (radkyTs || []).filter(t => !jenSekce || jenSekce.indexOf(t.sekceTs) >= 0).map(t => {
    const kotva = rpKotva(t.sekceTs, symboly);
    return kotva ? { kotva, vzdy: true, nazev: t.nazev, hodnota: t.hodnota, sekceTs: t.sekceTs } : null;
  }).filter(Boolean);
}

/* ROZPIS CENY (bod 4). `cenaPredSlevou` a `mustky` už v měně dokumentu,
 * `na` převod Kč → měna dokumentu (celá eura nahoru; v Kč identita).
 * Vrací { radky: [{ nazev, cena }], sachta } — řádky ruční položky jsou
 * jejich cena s marží (v haléřích / eurech zaokrouhlená), šachta je zbytek
 * do ceny před slevou, takže součet řádků sedí na korunu i na euro. Ruční
 * položky sekce Můstky se odečtou od řádku můstků. Bez položky s cenou null. */
function rpRozpisCeny(polozky, cenaPredSlevou, mustky, na, L, P) {
  const sCenou = (polozky || []).filter(p => p.sMarzi > 0);
  if (!sCenou.length) return null;
  const prevod = typeof na === 'function' ? na : (n => n);
  const hal = n => Math.round((+n || 0) * 100);
  const radky = sCenou.map(p => ({ nazev: rpText(p, 'nazev', L, P).toLocaleUpperCase(L === 'cz' || !L ? 'cs-CZ' : undefined),
    cenaH: hal(prevod(p.sMarzi)), mustky: p.sekce === 'mustky' }));
  const soucet = radky.reduce((a, x) => a + x.cenaH, 0);
  /* ruční řádky Můstků jsou uvnitř ceny můstků (bez řádku můstků ne) */
  const vMustcich = mustky ? Math.min(hal(mustky), radky.filter(x => x.mustky).reduce((a, x) => a + x.cenaH, 0)) : 0;
  const mustkyH = mustky ? hal(mustky) - vMustcich : 0;
  const sachtaH = hal(cenaPredSlevou) - soucet - mustkyH;   // šachta + můstky + ruční = cena před slevou
  return { radky: radky.map(x => ({ nazev: x.nazev, cena: x.cenaH / 100 })),
           sachta: sachtaH / 100, mustky: mustky ? mustkyH / 100 : 0 };
}

/* Krycí list (bod 5): „počet – název, množství jednotka, cena (sekce); …" */
function rpKryciText(polozky, kc) {
  const f = typeof kc === 'function' ? kc : (n => String(n));
  const a = polozky || [];
  if (!a.length) return 'bez ručních položek';
  /* N1 (J. V. 24. 11. 2026): u šachty s víc kusy cena za kus × kusy = celkem
   * („12 000 Kč/ks × 2 ks = 24 000 Kč"); u 1 ks jen cena. `ks` nese položka
   * (krycí list víc šachet), výsledek šachty je za jeden kus. */
  const cena = p => { const ks = Math.max(1, Math.round(+p.ks || 1));
    return ks > 1 ? f(p.sMarzi) + '/ks × ' + ks + ' ks = ' + f(p.sMarzi * ks) : f(p.sMarzi); };
  return a.length + ' – ' + a.map(p => p.nazev + ', ' + rpCislo(p.mnozstvi) + ' ' + p.jednotka + ', '
    + cena(p) + ' (' + p.sekceKalk + ')').join('; ');
}

/* Kontrola před tiskem (revize S1): ruční řádky, které šablona Wordu nemá kam
 * vložit (žádná kotva cílové sekce), a cenový blok bez řádku pro klon
 * ({{CENA_MUSTKY_BEZ_DPH}} v16+, ani {{CENA_BEZ_DPH}} ve starší). `symboly` =
 * pole nebo Set symbolů šablony. Vrací { specifikace: [položky], cena: bool }. */
function rpChybiVeWordu(polozky, symboly) {
  const sym = Array.isArray(symboly) ? new Set(symboly) : symboly;
  if (!sym || !sym.size) return { specifikace: [], cena: false };
  const a = polozky || [];
  return {
    specifikace: a.filter(p => !rpKotva(p.sekceTs, sym)),
    cena: a.some(p => p.sMarzi > 0) && !sym.has('CENA_MUSTKY_BEZ_DPH') && !sym.has('CENA_BEZ_DPH'),
  };
}

/* Kontrola před tiskem (bod 6): názvy položek, které v nabídce jazyka L
 * zůstanou česky — chybí jazyková varianta a slovník text nezná (název
 * i dodatkový text). Česká nabídka nic. */
function rpCeskeVCiziNabidce(polozky, L, trStavFn) {
  if (!L || L === 'cz') return [];
  const zna = t => (typeof trStavFn === 'function') ? trStavFn(t, L).prelozeno : false;
  const ma = (p, pole) => { const j = p.jazyky && p.jazyky[L] && p.jazyky[L][pole]; return typeof j === 'string' && !!j.trim(); };
  return (polozky || []).filter(p => (!ma(p, 'nazev') && !zna(p.nazev)) || (p.dodatek && !ma(p, 'dodatek') && !zna(p.dodatek)))
    .map(p => p.nazev);
}

if (typeof module !== 'undefined')
  module.exports = { RP_JEDNOTKY, RP_SEKCE_TS, RP_SEKCE_KALK, RP_SEKCE_SACHTY, RP_KOTVY, rpKotva, rpJednotka, rpZdroj,
    rucniPolozkyVysledku, rpText, rpRadekTs, rpRadkyWord, rpRozpisCeny, rpKryciText, rpCeskeVCiziNabidce, rpChybiVeWordu };
