/* ============================================================================
 * KOMPLETNÍ NÁHLED PODKLADŮ VE VZHLEDU WORDU (dávka NP, zadání J. V. 19. 11. 2026)
 *
 * „Kompletní náhled podkladů" u OCK byl do 19. 11. 2026 tabulka hodnot:
 * jiné pořadí než Word (příplatky až na konci), bez slevy, bez popisu záměru,
 * s tabulkou DODAVATEL navíc. Obchodník si v něm měl prohlédnout, jak nabídka
 * dopadne, a teprve pak ji vytisknout ve Wordu — tabulka mu to neřekla.
 *
 * Tenhle modul skládá DOKUMENT v pořadí a členění šablony CN v17:
 *   hlavička → Popis záměru (+ Pohled na objekt z ulice) → zlom stránky →
 *   A. TECHNICKÁ ČÁST / I. TECHNICKÁ SPECIFIKACE (sekce šachty, u víc šachet
 *   za každou šachtu, stavební a projekční práce, SOUČÁSTÍ DODÁVKY NENÍ,
 *   DALŠÍ UJEDNÁNÍ) → B. OBCHODNÍ ČÁST / I. CENOVÁ NABÍDKA (šachty, cena před
 *   slevou, SLEVA, cena, DPH, celkem, poznámky) → II. PŘÍPLATKY hned za cenou
 *   → III. PLATEBNÍ PODMÍNKY → IV.–VI. → DOLOŽKY → Vypracoval / Kancelář.
 *
 * ŽÁDNÝ DRUHÝ VÝPOČET. Hodnoty jsou symboly Wordu z `nabidkaData` (tytéž, které
 * dostane šablona), řádky technické části z `nabidkaNahledSekce` a pravidla,
 * kdy řádek nebo blok zmizí, jsou pravidla generátoru (docxgen.js):
 *   – řádek technické části s prázdnou hodnotou („", „-") zmizí, sekce bez
 *     řádků i s pruhem (odstranPrazdneTsRadky),
 *   – řádky slevy jen se slevou (SLEVA_KC), řádky ceny šachty / můstků /
 *     CENA CELKEM podle vyplněného symbolu (DOCX_CENA_CASTI),
 *   – prázdná kapitola IV.–VI. a doložky zmizí i s nadpisem (odstranPrazdneBloky),
 *   – věty platebního kalendáře řádek za větou (rozvinRadkyZaRadek),
 *   – vlastní řádky DALŠÍ UJEDNÁNÍ a lešení vnitřní (docxRadkyNavic).
 * Shodu textu náhledu s Wordem ze syntetické šablony CN v17 hlídá
 * src/test_np_nahled_word.js (porovnávací sada + zlatá sada VS/VZ).
 *
 * Pevný text šablony (věty popisu záměru, poznámky k ceně, nadpisy kapitol)
 * je opsaný ze šablony CN v17 (snímky podklady/kola/nahled_vs_word_2026-11-19)
 * a do cizího jazyka jde tímtéž slovníkem jako překlad šablony (tr). Nikdy se
 * nic nevymýšlí: co v datech není, v náhledu není.
 *
 * Modul je čistý (žádné DOM, žádné globální ZAK) — UI je v ui/nahled_word_ui.js.
 * Na „Kompletní náhled a tisk nabídky" (nabidkaOckDokument) se nesahá.
 * ============================================================================ */

/* Pevné texty šablony CN v17 (česky; {{SYMBOL}} dosadí nwDosad). */
const NW_TEXT = {
  hlObjednatel: 'Objednatel:', hlDatum: 'Datum:', hlNazev: 'Název akce:', hlCislo: 'Číslo nabídky:',
  hlAdresa: 'Adresa stavby / projekt:',
  popisNadpis: 'Popis záměru:',
  popisNase: 'Naše nabídka obsahuje výrobu, dodání a stavbu MONTOVANÉ ocelové konstrukce výtahové šachty včetně jejího opláštění. Specifikace provedení nabízené šachty je v technické části této nabídky.',
  popisSkladba: 'Nabídka se skládá z Technické a Obchodní části. Objednatelem odsouhlasená Technická část bude použita jako příloha smlouvy o dílo nebo závazné objednávky.',
  pohled: 'Pohled na objekt z ulice:',
  castA: 'A. TECHNICKÁ ČÁST NABÍDKY:',
  tsTitul: 'I. TECHNICKÁ SPECIFIKACE VÝTAHOVÉ ŠACHTY',
  tsPozn: '(tato technická specifikace bude použita jako příloha Smlouvy o Dílo nebo závazné objednávky)',
  poznRozmery: '* Uvažované rozměry nabízené šachty vychází ze zadání objednatele. Po přesném zaměření skutečného stavu zhotovitelem se mohou změnit!',
  poznProfily: '** parametry profilů se mohou změnit po zpracování statického posouzení',
  roztec: 'svislá rozteč příčníků:',
  castB: 'B. OBCHODNÍ ČÁST NABÍDKY:',
  cnTitul: 'I. CENOVÁ NABÍDKA:',
  sachta: 'VÝTAHOVÁ ŠACHTA',
  sachtaRozsah: 'rozsah dodávky dle Technické části nabídky - A. TECHNICKÁ SPECIFIKACE VÝTAHOVÉ ŠACHTY',
  mustky: 'MŮSTKY MEZI BUDOVOU A OCK',
  mustkyRozsah: 'rozsah dodávky dle Technické části nabídky - MŮSTKY MEZI BUDOVOU A OCK',
  predSlevou: 'Cena před slevou',
  sleva: 'Sleva', slevaHodnota: '− {{SLEVA_KC}} ({{SLEVA_PROC}} %)',
  celkemCena: 'CENA CELKEM', celkemCenaPopis: 'výtahová šachta a můstky mezi budovou a OCK',
  bezDph: 'bez DPH',
  dph: 'DPH {{DPH_SAZBA}} % ({{DPH_NAZEV}} sazba)',
  celkem: 'CELKEM za nabídku', vcDph: 'včetně DPH',
  poznCena: ['Poznámky k cenové nabídce: a. cena vychází z technické specifikace nabídky – viz výše',
    'b. DPH bude účtováno dle aktuálně platných daňových předpisů',
    'c. k úpravě celkové ceny může dojít po přesném zaměření a vyhodnocení statiky'],
  zvyseni: 'Dojde-li v průběhu realizace díla k VÝRAZNÉMU zvýšení cen vstupních materiálů, oceli, skla a dopravného a paliv, může zhotovitel cenu díla zvýšit o tento rozdíl. Pro posouzení cenových změn se přihlíží k cenám platným v době uzavření smlouvy o dílo (nebo objednávky) ve srovnání s cenami platnými v době, kdy byl zhotovitel povinen dílo provést.',
  priplatky: 'II. ROZŠÍŘENÍ CENOVÉ NABÍDKY – Příplatky:',
  kapIII: 'III. PLATEBNÍ PODMÍNKY:',
  splatky: 'Cena díla je splatná v následujících dílčích splátkách:',
  mesicne: 'Způsob fakturace:',
  poznPlatby: 'Poznámky k platebním podmínkám: v případě podepsané rámcové nebo subdodavatelské smlouvy, platí dohodnuté podmínky z těchto smluv. Bude-li potřeba upravit tyto standardní platební podmínky, jsme připraveni k jejich projednání na úrovni vedení společnosti.',
  splatnostNadpis: 'Splatnost faktur a platnost nabídky:',
  splatnost: 'Splatnost faktur {{PODM_SPLATNOST_DNI_CISLO}} dní ode dne vystavení.',
  platnost: 'Platnost této nabídky je {{PODM_PLATNOST_NABIDKY}} od data uvedeného v záhlaví.',
  kapIV: 'IV. POŽADAVKY PRO PROVEDENÍ REALIZACE:',
  kapV: 'V. TERMÍNY REALIZACE:',
  kapVI: 'VI. PŘEDÁNÍ DÍLA:',
  predaniPozn: 'Předávací protokol z bodů 1. a 2. lze nahradit oboustranně podepsaným zápisem do montážního deníku.',
  dolozky: 'DOLOŽKY:',
  vypracoval: 'Vypracoval:', tel: 'Tel: {{ZPRAC_TEL}}', email: 'Email: {{ZPRAC_EMAIL}}',
  kancelar: 'Kancelář:', kIco: 'IČ: {{FIRMA_ICO}}', kTel: 'Tel.: {{FIRMA_TELEFON}}',
  zahlavi: 'Cenová nabídka',
};

/* Sekce technické části, které popisují šachtu (u víc šachet se opakují). */
const NW_SEKCE_SACHTY = ['ZÁKLADNÍ PARAMETRY ŠACHTY', 'KONSTRUKČNÍ ŘEŠENÍ ŠACHTY', 'OPLÁŠTĚNÍ ŠACHTY',
  'DOPLŇKOVÉ KONSTRUKCE', 'MŮSTKY MEZI BUDOVOU A OCK'];
/* Sekce s širokým sloupcem popisků (projekční práce, co není součástí). */
const NW_SEKCE_SIROKE = ['PROJEKČNÍ A PŘÍPRAVNÉ PRÁCE', 'SOUČÁSTÍ DODÁVKY NENÍ', 'DALŠÍ UJEDNÁNÍ'];

/* Prázdná hodnota po pravidlu generátoru (docxgen jePrazdnaHodnota). */
function nwPrazdna(v) {
  const t = String(v == null ? '' : v).trim();
  return t === '' || t === '-' || t === '–' || t === '—';
}

/* PŘEKLAD PEVNÉHO TEXTU JAKO PŘEKLAD ŠABLONY (docxPrelozXml / docxPrelozUseky):
 * odstavec bez symbolu celý slovníkem; se symbolem nejdřív celý (se stejnými
 * symboly), jinak po úsecích mezi symboly — neznámý úsek nechá celý odstavec
 * česky (jako Word). Neutrální text (bez jazyka) se nepřekládá. */
function nwPreloz(text, L, tx) {
  const t = String(text == null ? '' : text);
  if (!L || L === 'cz') return t;
  /* TX J1: `tx` = nabídka neodeslaná / odeslaná po TX → opravená hesla PREKLAD_TX (preklad.js). */
  const stav = (tx && typeof trStavTx === 'function') ? ((x, l) => trStavTx(x, l, true))
    : (typeof trStav === 'function') ? trStav
    : ((typeof tr === 'function') ? ((x, l) => ({ text: tr(x, l), prelozeno: true })) : null);
  if (!stav) return t;
  /* tr() zapisuje text bez překladu do sběru náhledu (#518) — jako dosavadní náhled */
  const zapis = x => { if (typeof tr === 'function') tr(x, L); };
  if (!/\{\{/.test(t)) {
    const st = stav(t, L);
    if (!(st && st.prelozeno)) { zapis(t); return t; }
    /* NPT-N3 #691 (21. 11. 2026): slovník drží heslo bez koncové dvojtečky
     * („Adresa stavby / projekt“ → „Site address / project“), šablona CN ji
     * v EN i DE má („Site address / project:“). Interpunkce na konci jde
     * proto podle českého textu — stejně jako u úseků mezi symboly níž. */
    return nwInterpunkce(t, String(st.text), L);
  }
  const sym = x => (String(x).match(/\{\{[^{}]*\}\}/g) || []).sort().join('|');
  const cel = stav(t, L);
  if (cel && cel.prelozeno && cel.zdroj !== 'neutrální' && sym(cel.text) === sym(t)) return String(cel.text);
  let out = '';
  for (const u of t.split(/(\{\{[^{}]*\}\})/)) {
    if (/^\{\{[^{}]*\}\}$/.test(u) || !/\p{L}/u.test(u)) { out += u; continue; }
    const pred = u.match(/^[^\p{L}\p{N}]*/u)[0];
    const za = u.slice(pred.length).match(/[^\p{L}\p{N}:.!?*]*$/u)[0];
    const jadro = u.slice(pred.length, u.length - za.length);
    if (!jadro) { out += u; continue; }
    const st = stav(jadro, L);
    if (st && st.zdroj === 'neutrální') { out += u; continue; }
    if (!st || !st.prelozeno) { zapis(jadro); return t; }
    out += pred + nwInterpunkce(jadro, String(st.text), L) + za;
  }
  return out;
}

/* Koncová dvojtečka a tečka podle českého textu (slovník je ukládá bez nich). */
function nwInterpunkce(cz, pr, L) {
  const dvojtecka = /:\s*$/.test(cz), maDvojtecku = /\s?:\s*$/.test(pr);
  if (dvojtecka && !maDvojtecku) pr = pr.replace(/\s+$/, '') + (L === 'fr' ? ' :' : ':');
  else if (!dvojtecka && maDvojtecku) pr = pr.replace(/\s?:\s*$/, '');
  if (/\.\s*$/.test(cz) && !/[.!?…]\s*$/.test(pr)) pr += '.';
  return pr;
}

/* {{SYMBOL}} v pevném textu → hodnota (neznámý symbol zůstane, jako ve Wordu).
 * Hodnota končící „%" před „%" v textu ztratí svůj znak (docxZaSymbolemProcento). */
function nwDosad(text, ph) {
  return String(text).replace(/\{\{([A-Z0-9_]+)\}\}(\s*%)?/g, (cele, k, proc) => {
    if (!ph || ph[k] == null) return cele;
    let h = String(ph[k]);
    if (proc && /%\s*$/.test(h)) h = h.replace(/[\s ]*%\s*$/, '');
    return h + (proc || '');
  });
}

/* Řádky víceřádkové hodnoty (kapitoly z Firmy, platební kalendář). */
function nwRadky(v) {
  return String(v == null ? '' : v).split('\n').map(r => r.trim()).filter(Boolean);
}

/* Řádek technické části ve tvaru Wordu. Vrací null, když má zmizet. */
function nwTsRadek(r, ph, P, T) {
  const [popis, hodnota] = r;
  /* NPT-N1 #690 (J. V. 21. 11. 2026): Word CN v17 řádek světlíků (#375) nemá
   * a nedostane — cena světlíků se počítá v kalkulaci. Náhled musí odpovídat
   * Wordu, proto řádek vynechá (nabidkaNahledSekce ho dál vrací pro ostatní). */
  if (popis === P('SVĚTLÍKY U ŠACHETNÍCH DVEŘÍ')) return null;
  if (popis === P('POČET STANIC / NÁSTUPIŠŤ')) {
    const b = [ph.TS_STANICE, ph.TS_KABINA];
    return b.every(nwPrazdna) ? null : { bunky: [popis].concat(b) };
  }
  if (popis === P('SVISLÁ ROZTEČ PŘÍČNÍKŮ')) return nwPrazdna(hodnota) ? null : { bunky: ['', T('roztec'), hodnota], pod: true };
  return nwPrazdna(hodnota) ? null : { bunky: [popis, hodnota] };
}

/* Technická tabulka jedné sady sekcí (šachta nebo zakázka). `sekce` =
 * výstup nabidkaNahledSekce, `jmena` = přeložená jména sekcí, která se berou. */
function nwTsSekce(sekce, jmena, ph, P, T) {
  const out = [];
  sekce.filter(s => jmena.indexOf(s.sekce) >= 0).forEach(s => {
    const radky = s.radky.map(r => nwTsRadek(r, ph, P, T)).filter(Boolean);
    if (!radky.length) return;                       // sekce bez řádků zmizí i s pruhem
    const siroka = NW_SEKCE_SIROKE.map(P).indexOf(s.sekce) >= 0;
    out.push({ typ: 'pruh', text: s.sekce });
    radky.forEach(r => out.push(Object.assign({ typ: 'radek', siroka }, r)));
    if (s.sekce === P('ZÁKLADNÍ PARAMETRY ŠACHTY')) out.push({ typ: 'pozn', text: T('poznRozmery') });
    if (s.sekce === P('KONSTRUKČNÍ ŘEŠENÍ ŠACHTY')) out.push({ typ: 'pozn', text: T('poznProfily') });
  });
  return out;
}

/* ---------------------------------------------------------------------------
 * nwBloky(data, L, o) → pole bloků dokumentu v pořadí Wordu.
 *   data  výstup nabidkaData (placeholders, priplatky, sachty, tsExtra, platbyOck, obrazky)
 *   L     jazyk dokumentu ('cz' | 'en' | 'de' | 'fr')
 *   o     { foto: data URL úvodní fotky nebo '', logo } (nepovinné)
 * Blok: { typ, … } — typy viz nwHtml. Žádný výpočet ceny, jen skládání.
 * ------------------------------------------------------------------------- */
function nwBloky(data, L, o) {
  L = L || 'cz';
  o = o || {};
  const tx = !!data.txTisk;   // TX J1: opravená hesla slovníku jen pro neodeslanou / odeslanou po TX
  const P = t => (L !== 'cz' && typeof tr === 'function') ? (typeof trTx === 'function' ? trTx(t, L, tx) : tr(t, L)) : t;
  const ph = data.placeholders;
  /* Pevný text šablony: překlad jako docxPrelozSablonu (nwPreloz), pak symboly. */
  const T = (klic) => nwDosad(nwPreloz(NW_TEXT[klic], L, tx), ph);
  const bloky = [];

  /* 1) HLAVIČKA */
  bloky.push({ typ: 'hlavicka', radky: [
    [T('hlObjednatel'), [ph.OBJEDNATEL, ph.OBJEDNATEL_KONTAKT]],
    [T('hlDatum'), [ph.DATUM]],
    [T('hlNazev'), [ph.NAZEV_AKCE], 'velky'],
    [T('hlCislo'), [ph.CISLO_NABIDKY], 'tucne'],
    [T('hlAdresa'), [ph.ADRESA], 'tucne']] });

  /* 2) POPIS ZÁMĚRU A POHLED NA OBJEKT (šedý blok do konce první strany) */
  bloky.push({ typ: 'popis', nadpis: T('popisNadpis'), odstavce: [
    { text: ph.POPIS_ZAMERU_OCK },
    { text: T('popisNase'), styl: 'modry' },
    { text: ph.OPLASTENI_VETA, styl: 'modry' },
    { text: T('popisSkladba') }].filter(x => !nwPrazdna(x.text)),
    pohled: T('pohled'), foto: o.foto || '',
    /* PD2 #771 V1: nadpis bez fotky skrýt jen tam, kde ho skryje i Word (data.odstavceTextPryc);
     * klíč jen když platí — blok staré nabídky zůstane beze změny */
    ...((data.odstavceTextPryc || []).indexOf('Pohled na objekt z ulice:') >= 0 ? { bezPohledu: true } : {}) });
  bloky.push({ typ: 'zlom' });

  /* 3) A. TECHNICKÁ ČÁST */
  const vse = (typeof nabidkaNahledSekce === 'function' ? nabidkaNahledSekce : require('./nabidka.js').nabidkaNahledSekce)(
    ph, L, data.platbyOck, data.tsExtra, null, data.rucni, { tx });   // RP: ruční položky (jedna šachta / společné sekce)
  const jmSachty = NW_SEKCE_SACHTY.map(P);
  const ts = [{ typ: 'titul', text: T('tsTitul') }, { typ: 'pozn-titul', text: T('tsPozn') }];
  if (Array.isArray(data.sachty) && data.sachty.length) {
    /* VS-E4: technická část za každou šachtu s jejími symboly (smyčka {#sachty} v17) */
    const sNahled = (typeof nabidkaNahledSekce === 'function' ? nabidkaNahledSekce : require('./nabidka.js').nabidkaNahledSekce);
    data.sachty.forEach(sa => {
      const phS = Object.assign({}, ph, sa.ph);
      const radky = nwTsSekce(sNahled(phS, L, null, null, [], { tsRadky: sa.rucniTs || [] }, { tx }), jmSachty, phS, P, T);
      if (!nwPrazdna(sa.ph.SACHTA_TS_NAZEV)) ts.push({ typ: 'pruh', text: sa.ph.SACHTA_TS_NAZEV, sachta: true });
      radky.forEach(r => ts.push(r));
    });
  } else nwTsSekce(vse, jmSachty, ph, P, T).forEach(r => ts.push(r));
  nwTsSekce(vse, ['STAVEBNÍ A PŘÍPRAVNÉ PRÁCE', 'PROJEKČNÍ A PŘÍPRAVNÉ PRÁCE', 'SOUČÁSTÍ DODÁVKY NENÍ'].map(P), ph, P, T)
    .forEach(r => ts.push(r));
  /* DALŠÍ UJEDNÁNÍ — vlastní řádky specifikace (docxRadkyNavic: řádek s popiskem
   * se vloží i bez hodnoty, pruh jen když nějaký řádek je). Řádky se sekcí
   * NENÍ (`neni`, PG #2) už stojí na konci SOUČÁSTÍ DODÁVKY NENÍ (PG-N1). */
  const extra = (data.tsExtra || []).filter(e => e && !e.neni);
  if (extra.length) {
    ts.push({ typ: 'pruh', text: P('DALŠÍ UJEDNÁNÍ') });
    extra.forEach(e => ts.push({ typ: 'radek', siroka: true, bunky: [e.nazev, e.hodnota] }));
  }
  bloky.push({ typ: 'nadpis', uroven: 1, text: T('castA') });
  bloky.push({ typ: 'ts', radky: ts });

  /* 4) B. OBCHODNÍ ČÁST — I. CENOVÁ NABÍDKA (řádky jako cenová tabulka v17) */
  bloky.push({ typ: 'nadpis', uroven: 1, text: T('castB'), mezera: true });
  bloky.push({ typ: 'nadpis', uroven: 2, text: T('cnTitul') });
  const cena = [];
  const bez = T('bezDph');
  (Array.isArray(data.sachty) ? data.sachty : []).forEach(sa => {
    if ([sa.ph.SACHTA_NAZEV, sa.ph.SACHTA_POPIS, sa.ph.SACHTA_CENA_BEZ_DPH].every(nwPrazdna)) return;
    cena.push({ popis: [sa.ph.SACHTA_NAZEV, sa.ph.SACHTA_POPIS], hodnota: [sa.ph.SACHTA_CENA_BEZ_DPH, bez], styl: 'polozka' });
  });
  if (!nwPrazdna(ph.CENA_SACHTA_BEZ_DPH))
    cena.push({ popis: [T('sachta'), T('sachtaRozsah')], hodnota: [ph.CENA_SACHTA_BEZ_DPH, bez], styl: 'polozka' });
  if (!nwPrazdna(ph.CENA_MUSTKY_BEZ_DPH))
    cena.push({ popis: [T('mustky'), T('mustkyRozsah')], hodnota: [ph.CENA_MUSTKY_BEZ_DPH, bez], styl: 'polozka' });
  /* RP: ruční položky — řádek naklonovaný z řádku můstků (docxRadkyNavic) */
  ((data.rucni && data.rucni.ceny) || []).forEach(x =>
    cena.push({ popis: [x.nazev], hodnota: [x.cena, bez], styl: 'polozka' }));
  const sRucnimi = !!(data.rucni && data.rucni.ceny && data.rucni.ceny.length);
  /* SLEVA (nález z porovnání 19. 11. 2026: starý náhled ji vynechával) —
   * řádky jen se slevou, jako Word (rozhoduje SLEVA_KC). */
  if (!nwPrazdna(ph.SLEVA_KC)) {
    cena.push({ popis: [T('predSlevou')], hodnota: [ph.CENA_PRED_SLEVOU], styl: 'sleva' });
    cena.push({ popis: [T('sleva')], hodnota: [T('slevaHodnota')], styl: 'sleva' });
  }
  if (!nwPrazdna(ph.CENA_BEZ_DPH_SACHTA))
    cena.push({ popis: [T('sachta'), T('sachtaRozsah')], hodnota: [ph.CENA_BEZ_DPH_SACHTA, bez], styl: 'cena' });
  if (!nwPrazdna(ph.CENA_BEZ_DPH_CELKEM))
    /* RP: s ruční položkou jen „CENA CELKEM" (Word přejmenuje celý popisek) */
    cena.push({ popis: [T('celkemCena'), sRucnimi ? '' : T('celkemCenaPopis'), ph.SACHTY_CELKEM_POPIS].filter(x => !nwPrazdna(x)),
      hodnota: [ph.CENA_BEZ_DPH_CELKEM, bez], styl: 'cena' });
  cena.push({ popis: [T('dph')], hodnota: [ph.DPH_KC], styl: 'dph' });
  cena.push({ popis: [T('celkem')], hodnota: [ph.CENA_S_DPH, T('vcDph')], styl: 'celkem' });
  bloky.push({ typ: 'cena', radky: cena });
  {
    const pozn = NW_TEXT.poznCena.map(x => nwDosad(nwPreloz(x, L, tx), ph));
    /* TX #771 V6 (posudek CN-432, J. V. 26. 11. 2026): poznámky k ceně jako SEZNAM —
     * nadpis „Poznámky k cenové nabídce:“ a body a. b. c. jako položky seznamu, ne odstavce
     * s písmenem v textu. Jen neodeslaná a odeslaná po TX (data.txTisk); věty a jejich překlady
     * beze změny (písmeno bodu je číslování seznamu). Nejde-li věta rozdělit (vlastní překlad
     * bez „a.“), zůstanou odstavce jako dřív. */
    const m = data.txTisk ? String(pozn[0]).match(/^(.*?[:：])\s*a[.)]\s+(.+)$/) : null;
    const body = m ? [m[2]].concat(pozn.slice(1).map(x => String(x).replace(/^[a-z][.)]\s+/, ''))) : null;
    if (m && pozn.slice(1).every(x => /^[a-z][.)]\s+/.test(String(x))))
      bloky.push({ typ: 'seznam', styl: 'pozn-cena', nadpis: m[1], radky: body });
    else bloky.push({ typ: 'odstavce', styl: 'pozn-cena', radky: pozn });
  }
  bloky.push({ typ: 'odstavce', styl: 'kurziva', radky: [T('zvyseni')] });

  /* 5) II. PŘÍPLATKY — hned za cenou (Word); bez příplatků jen nadpis */
  bloky.push({ typ: 'nadpis', uroven: 2, text: T('priplatky'), mezera: true });
  (data.priplatky || []).forEach(pr => bloky.push({ typ: 'priplatek', nazev: pr.nazev, popis: pr.popis, cena: pr.cena, bezDph: bez }));

  /* 6) III. PLATEBNÍ PODMÍNKY (věty platebního kalendáře jako Word) */
  bloky.push({ typ: 'nadpis', uroven: 2, text: T('kapIII'), mezera: true });
  const splatky = nwRadky(ph.PODM_PLATEBNI_KALENDAR);
  if (splatky.length) bloky.push({ typ: 'ramecek', nadpis: T('splatky'), radky: splatky, cislovani: 'a', tmavy: true });
  if (!nwPrazdna(ph.PODM_FAKTURACE_MESICNE))
    bloky.push({ typ: 'ramecek', nadpis: T('mesicne'), radky: nwRadky(ph.PODM_FAKTURACE_MESICNE), tmavy: true });
  bloky.push({ typ: 'odstavce', styl: 'drobne', radky: [T('poznPlatby')] });
  bloky.push({ typ: 'ramecek', nadpis: T('splatnostNadpis'), radky: [T('splatnost'), T('platnost')], tmavy: true, mezera: true });

  /* 7) IV.–VI. A DOLOŽKY — prázdná kapitola zmizí i s nadpisem (KAP_*) */
  const kap = (klic, sym, o2) => {
    const radky = nwRadky(ph[sym]);
    if (!radky.length) return;
    bloky.push({ typ: 'nadpis', uroven: 2, text: P(NW_TEXT[klic]), mezera: true });
    bloky.push(Object.assign({ typ: 'ramecek', radky }, o2 || {}));
    if (klic === 'kapVI') bloky.push({ typ: 'odstavce', styl: 'drobne', radky: [T('predaniPozn')] });
  };
  kap('kapIV', 'FIRMA_NAB_POZADAVKY');
  kap('kapV', 'NAB_KAP_TERMINY', { cislovani: '1' });
  kap('kapVI', 'FIRMA_NAB_PREDANI', { cislovani: '1' });
  kap('dolozky', 'FIRMA_NAB_DOLOZKY');

  /* 8) PODPIS — Vypracoval (přihlášený zpracovatel) a Kancelář (Firma) */
  bloky.push({ typ: 'podpis',
    vypracoval: { nadpis: T('vypracoval'), jmeno: ph.ZPRAC_JMENO || '', funkce: ph.ZPRAC_FUNKCE || '',
      /* PD2 #771 V2: bez telefonu žádný řádek „Tel:“ (jako Word) */
      podpis: (data.obrazky && data.obrazky.ZPRAC_PODPIS) || '',
      tel: nwPrazdna(ph.ZPRAC_TEL) && (data.odstavceTextPryc || []).indexOf('Tel:') >= 0 ? '' : T('tel'), email: T('email') },
    kancelar: { nadpis: T('kancelar'), radky: [ph.FIRMA_NAZEV, ph.FIRMA_SIDLO_ULICE,
      [ph.FIRMA_SIDLO_PSC, ph.FIRMA_SIDLO_MESTO].filter(x => !nwPrazdna(x)).join('  '),
      T('kIco'), T('kTel')].filter(x => !nwPrazdna(x)), web: ph.FIRMA_WEB || '' } });
  return bloky;
}

/* Záhlaví a zápatí stránky (v UI se kreslí na každou stránku; do textu
 * dokumentu nepatří — Word je má v záhlaví/zápatí, ne v těle). */
function nwChrome(data, L) {
  const ph = data.placeholders || {};
  return { zahlavi: nwPreloz(NW_TEXT.zahlavi, L), paticka: nwRadky(ph.FIRMA_PATICKA), firma: ph.FIRMA_NAZEV || '' };
}

/* ---------------------------------------------------------------------------
 * HTML toku dokumentu (bez stránek). Každý text je v <p>/<h*>/<li> — z toho
 * se skládá text pro porovnání s Wordem (nwTextZHtml). Bloky nesou třídu
 * nw-blok; tabulka, kterou jde rozdělit mezi stránky, má nw-deli.
 * ------------------------------------------------------------------------- */
function nwEsc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const nwP = (t, cls) => `<p${cls ? ` class="${cls}"` : ''}>${nwEsc(t)}</p>`;
/* hodnota řádku specifikace: konec řádku = zalomení jako ve Wordu (`\n` →
 * <w:br/>, ruční položka RP: množství a pod ním dodatkový text) */
const nwPv = (t) => nwP(t).replace(/\n/g, '<br>');
function nwFotoPlatna(s) {
  return typeof s === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s);
}

function nwHtml(bloky) {
  return bloky.map(b => {
    switch (b.typ) {
      case 'hlavicka':
        return `<div class="nw-blok nw-hlavicka"><table>${b.radky.map(([l, v, st]) =>
          `<tr class="${st || ''}"><td class="nw-hl-l">${nwP(l)}</td><td class="nw-hl-v">${v.map(x => nwP(x)).join('')}</td></tr>`).join('')}</table></div>`;
      case 'popis':
        return `<div class="nw-blok nw-popis"><h3>${nwEsc(b.nadpis)}</h3><div class="nw-popis-telo">${b.odstavce.map(x => nwP(x.text, x.styl === 'modry' ? 'nw-modry' : '')).join('')}`
          /* PD2 #771 V1: bez fotky ani nadpis „Pohled na objekt z ulice:“ (jako Word) */
          + (b.bezPohledu && !nwFotoPlatna(b.foto) ? '' : `<h4>${nwEsc(b.pohled)}</h4>`)
          + (nwFotoPlatna(b.foto) ? `<img class="nw-foto" src="${nwEsc(b.foto)}" alt="">` : '') + '</div></div>';
      case 'zlom':
        return '<div class="nw-blok nw-zlom"></div>';
      case 'nadpis':
        return `<div class="nw-blok nw-nadpis${b.mezera ? ' nw-mezera' : ''}"><h${b.uroven}>${nwEsc(b.text)}</h${b.uroven}></div>`;
      case 'ts':
        return `<table class="nw-blok nw-deli nw-ts"><colgroup><col style="width:38%"><col style="width:25%"><col style="width:37%"></colgroup>${b.radky.map(r => {
          if (r.typ === 'titul') return `<tr class="nw-ts-titul"><td colspan="3"><h2>${nwEsc(r.text)}</h2></td></tr>`;
          if (r.typ === 'pozn-titul') return `<tr class="nw-ts-pozn-titul"><td colspan="3">${nwP(r.text)}</td></tr>`;
          if (r.typ === 'pruh') return `<tr class="nw-ts-pruh${r.sachta ? ' nw-ts-sachta' : ''}"><td colspan="3">${nwP(r.text)}</td></tr>`;
          if (r.typ === 'pozn') return `<tr class="nw-ts-pozn"><td colspan="3">${nwP(r.text)}</td></tr>`;
          const [l, ...v] = r.bunky;
          /* široký popisek (projekční práce, co není součástí, další ujednání) přes dva sloupce */
          if (v.length === 1 && r.siroka) return `<tr class="nw-ts-radek nw-siroka"><td class="nw-ts-l" colspan="2">${l ? nwP(l) : ''}</td><td>${nwPv(v[0])}</td></tr>`;
          if (v.length === 1) return `<tr class="nw-ts-radek"><td class="nw-ts-l">${l ? nwP(l) : ''}</td><td colspan="2">${nwPv(v[0])}</td></tr>`;
          return `<tr class="nw-ts-radek${r.pod ? ' nw-ts-pod' : ''}"><td class="nw-ts-l">${l ? nwP(l) : ''}</td>${v.map(x => `<td>${nwP(x)}</td>`).join('')}</tr>`;
        }).join('')}</table>`;
      case 'cena':
        return `<div class="nw-blok nw-cena">${b.radky.map(r =>
          `<table class="nw-cena-${r.styl}"><tr><td class="nw-cena-l">${r.popis.map((x, i) => nwP(x, i ? 'nw-sub' : '')).join('')}</td>`
          + `<td class="nw-cena-v">${r.hodnota.map((x, i) => nwP(x, i ? 'nw-sub' : '')).join('')}</td></tr></table>`).join('')}</div>`;
      case 'odstavce':
        return `<div class="nw-blok nw-odst nw-${b.styl}">${b.radky.map(x => nwP(x)).join('')}</div>`;
      case 'seznam':   // TX #771 V6: nadpis + seznam s písmeny (a. b. c.)
        return `<div class="nw-blok nw-odst nw-${b.styl} nw-seznam">${nwP(b.nadpis)}`
          + `<ol class="nw-ol nw-ol-pism">${b.radky.map(x => `<li>${nwEsc(x)}</li>`).join('')}</ol></div>`;
      case 'priplatek':
        return `<table class="nw-blok nw-priplatek"><tr><td class="nw-cena-l">${nwP(b.nazev, 'nw-tucne')}${nwPrazdna(b.popis) ? '' : nwP(b.popis, 'nw-sub')}</td>`
          + `<td class="nw-cena-v">${nwP(b.cena)}${nwP(b.bezDph, 'nw-sub nw-kurziva')}</td></tr></table>`;
      case 'ramecek': {
        const seznam = b.cislovani
          ? `<ol class="nw-ol nw-ol-${b.cislovani}">${b.radky.map(x => `<li>${nwEsc(x)}</li>`).join('')}</ol>`
          : b.radky.map(x => nwP(x)).join('');
        return `<div class="nw-blok nw-ramecek${b.tmavy ? ' nw-tmavy' : ''}${b.mezera ? ' nw-mezera' : ''}">`
          + (b.nadpis ? `<h5>${nwEsc(b.nadpis)}</h5>` : '') + `<div class="nw-ramecek-telo">${seznam}</div></div>`;
      }
      case 'podpis': {
        const v = b.vypracoval, k = b.kancelar;
        return `<div class="nw-blok nw-podpis"><h4>${nwEsc(v.nadpis)}</h4>`
          + (nwFotoPlatna(v.podpis) ? `<img class="nw-podpis-img" src="${nwEsc(v.podpis)}" alt="">` : '')
          + nwP(v.jmeno, 'nw-tucne') + nwP(v.funkce, 'nw-drobne') + (v.tel ? nwP(v.tel, 'nw-tucne') : '') + nwP(v.email, 'nw-tucne')
          + `<h4 class="nw-kancelar">${nwEsc(k.nadpis)}</h4>${k.radky.map(x => nwP(x, 'nw-tucne')).join('')}`
          + (k.web ? nwP(k.web, 'nw-web') : '') + '</div>';
      }
      default: return '';
    }
  }).join('\n');
}

/* ---------------------------------------------------------------------------
 * Text pro porovnání s Wordem: posloupnost řádků textu (odstavec = řádek,
 * zalomení <br> = nový řádek), mezery sjednocené, prázdné řádky pryč.
 * Číslování seznamů (<ol>) se nepočítá — ve Wordu je to číslování odstavce,
 * ne text. Totéž dělá nwTextZDocx nad document.xml.
 * ------------------------------------------------------------------------- */
function nwNorm(t) {
  return String(t).replace(/[\s  ]+/g, ' ').trim();
}
function nwOdEntit(s) {
  return String(s).replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, '\u00a0').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}
function nwTextZHtml(html) {
  const out = [];
  const re = /<(p|h1|h2|h3|h4|h5|li)\b[^>]*>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = re.exec(html))) {
    m[2].split(/<br\s*\/?>/i).forEach(c => { const t = nwNorm(nwOdEntit(c.replace(/<[^>]+>/g, ''))); if (t) out.push(t); });
  }
  return out;
}
function nwTextZDocx(xml) {
  const out = [];
  const telo = String(xml).replace(/<w:body>|<\/w:body>/g, '');
  const re = /<w:p[\s>](?:(?!<\/w:p>)[\s\S])*?<\/w:p>|<w:p\/>/g;
  let m;
  while ((m = re.exec(telo))) {
    const p = m[0].replace(/<w:tab\/>/g, ' ').replace(/<w:(?:br|cr)(?:\s[^>]*)?\/>/g, '\u0001');
    const text = (p.match(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>|\u0001/g) || [])
      .map(x => (x === '\u0001' ? '\u0001' : x.replace(/<[^>]+>/g, ''))).join('');
    nwOdEntit(text).split('\u0001').forEach(c => { const t = nwNorm(c); if (t) out.push(t); });
  }
  return out;
}

/* Upozornění pro obchodníka (pruh nad stránkami, netiskne se). Jen fakta
 * z dat — nic se nedopočítává. */
function nwVarovani(data, zak, o) {
  const ph = data.placeholders || {};
  const out = [];
  const z = zak || {};
  o = o || {};
  if (!o.foto) out.push('Chybí úvodní fotka — „Pohled na objekt z ulice" zůstane prázdný.');
  if (!String(z.popisZameru || '').trim()) out.push('Popis záměru není vyplněný — použije se věta podle typu šachty.');
  [['OBJEDNATEL', 'zákazník'], ['NAZEV_AKCE', 'název akce'], ['ADRESA', 'adresa stavby'], ['OBJEDNATEL_KONTAKT', 'kontaktní osoba']]
    .forEach(([k, n]) => { if (nwPrazdna(ph[k]) || ph[k] === '…') out.push('V hlavičce chybí ' + n + '.'); });
  [['FIRMA_NAB_POZADAVKY', 'IV. Požadavky pro provedení realizace'], ['NAB_KAP_TERMINY', 'V. Termíny realizace'],
    ['FIRMA_NAB_PREDANI', 'VI. Předání díla'], ['FIRMA_NAB_DOLOZKY', 'Doložky']].forEach(([k, n]) => {
    if (!nwRadky(ph[k]).length) out.push('Kapitola „' + n + '" je prázdná — v nabídce nebude.');
  });
  ['FIRMA_NAB_POZADAVKY', 'FIRMA_NAB_TERMINY', 'FIRMA_NAB_PREDANI', 'FIRMA_NAB_DOLOZKY'].forEach(k => {
    if (ph[k + '_CHYBI']) out.push('Text kapitoly ' + k.replace('FIRMA_NAB_', '').toLowerCase() + ' nemá překlad do jazyka dokumentu — je česky.');
  });
  if (nwPrazdna(ph.PODM_TERMIN_DODANI)) out.push('Termín dodání není vyplněný (krycí list / Firma).');
  if (nwPrazdna(ph.ZPRAC_JMENO)) out.push('Chybí jméno zpracovatele (Můj profil) — blok „Vypracoval" bude prázdný.');
  else if (nwPrazdna(ph.ZPRAC_TEL) || nwPrazdna(ph.ZPRAC_EMAIL)) out.push('U zpracovatele chybí telefon nebo e-mail (Můj profil).');
  if (!(data.priplatky || []).length) out.push('Žádné příplatky nejsou vybrány — kapitola II. bude jen nadpis.');
  return out;
}

if (typeof module !== 'undefined') module.exports = { NW_TEXT, nwPreloz, nwBloky, nwHtml, nwChrome, nwTextZHtml, nwTextZDocx, nwVarovani, nwDosad, nwPrazdna, nwInterpunkce };
