/* ===== KAPITOLY III.–VI. CENOVÉ NABÍDKY =====
 * (#282, nálezy N15 a N16 kola 6; mail D. Sikory 21. 9. 2026:
 *  „nám tam schází úplně — platební podmínky, požadavky na provedení
 *   realizace, termíny realizace, předání díla")
 *
 * Wordová šablona ty kapitoly měla, aplikace ne — nabídka z aplikace tedy
 * končila cenou a s dokumentem, který zákazník dostal, se neshodovala.
 *
 * DVA ZDROJE, ZÁMĚRNĚ RŮZNÉ:
 *   · III. PLATEBNÍ PODMÍNKY se skládá z ÚDAJŮ ZAKÁZKY (zálohy, splatnost,
 *     platnost nabídky z krycího listu). Druhý opis týchž vět by se dřív
 *     nebo později rozešel s tím, co obchodník u zakázky nastavil.
 *   · IV.–VI. a doložky jsou FIREMNÍ STANDARD z Nastavení → Firma; mění se
 *     jednou za čas a pro všechny naráz.
 *
 * ŽÁDNÉ CENY — zkouší se texty a struktura, ne částky.
 */
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
global.vypocet = eng.vypocet; global.DEFAULT_ZADANI = eng.DEFAULT_ZADANI;
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const ep = require('./engine_proj.js');
global.DEFAULT_ZADANI_PROJ = ep.DEFAULT_ZADANI_PROJ; global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const tsm = require('./techspec.js');
global.TECHSPEC_DEF = tsm.TECHSPEC_DEF; global.tsHodnota = tsm.tsHodnota; global.DEFAULT_TECHSPEC = tsm.DEFAULT_TECHSPEC;
const zk = require('./zakazka.js'); Object.keys(zk).forEach(k => { global[k] = zk[k]; });
const fm = require('./firma.js'); Object.keys(fm).forEach(k => { global[k] = fm[k]; });
const kr = require('./kryci.js'); Object.keys(kr).forEach(k => { global[k] = kr[k]; });
const P = require('./preklad.js'); global.tr = P.tr;
const N = require('./nabidka.js');
const fs = require('fs');
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const KAPITOLY = ['kapPozadavky', 'kapTerminy', 'kapPredani', 'dolozky'];
const SEKCE = { kapPozadavky: 'IV. POŽADAVKY PRO PROVEDENÍ REALIZACE',
                kapTerminy: 'V. TERMÍNY REALIZACE',
                kapPredani: 'VI. PŘEDÁNÍ DÍLA', dolozky: 'DOLOŽKY' };

function nahled(jazyk, upravFirmu, upravZadani) {
  const puv = global.NAST;
  const f = Object.assign({}, fm.DEFAULT_FIRMA, { nazev: 'Zkušební firma s.r.o.' });
  if (upravFirmu) upravFirmu(f);
  global.NAST = { firma: f };
  const zak = zk.novaZakazka();
  const v = zak.varianty[0];
  v.data.cenik = ZC.zkusebniCenik();
  if (upravZadani) upravZadani(v.data.ock.zadani);
  const d = N.nabidkaData(zak, v, JEKLY, jazyk);
  const s = N.nabidkaNahledSekce(d.placeholders, jazyk);
  global.NAST = puv;
  return { ph: d.placeholders, sekce: s, nazvy: s.map(x => x.sekce) };
}

/* ---------- 0) lešení si nesmí odporovat se specifikací (P8/7) ----------
 *
 * Kapitola IV. žádá po objednateli „zajištění montážního lešení". Když je
 * ale vnější lešení v základní ceně, technická specifikace u téže zakázky
 * říká, že je součástí dodávky — dokument si protiřečil a zákazník si mohl
 * vybrat výklad, který je pro něj levnější.
 *
 * Rozhodnutí J. V. 22. 9. 2026: odrážka zmizí, když je lešení v dodávce.
 * Hlídá se ve všech třech jazycích, protože kapitola se nepřekládá — každý
 * jazyk má vlastní ručně psaný text. */
{
  const LESENI = /lešen|scaffold|gerüst|échafaud/i;
  [['cz', 'Zajištění montážního lešení'], ['en', 'scaffold'], ['de', 'Gerüst']].forEach(([jaz]) => {
    const bez = nahled(jaz, null, (z) => { z.typSachty = 'exteriérová'; z.volitelne.leseniVnejsi = false; });
    const sNim = nahled(jaz, null, (z) => { z.typSachty = 'exteriérová'; z.volitelne.leseniVnejsi = true; });
    const radky = (ph) => String(ph.FIRMA_NAB_POZADAVKY || '').split('\n');
    test('kapitola IV. (' + jaz + ') odrážku o lešení má, když v dodávce není',
      radky(bez.ph).some(r => LESENI.test(r)), radky(bez.ph).filter(r => LESENI.test(r)));
    test('a nemá ji, když vnější lešení v dodávce je',
      !radky(sNim.ph).some(r => LESENI.test(r)), radky(sNim.ph).filter(r => LESENI.test(r)));
    /* Pojistka proti prázdnému testu: zmizet smí JEDNA odrážka, ne kapitola. */
    test('ostatní odrážky (' + jaz + ') zůstanou',
      radky(sNim.ph).length === radky(bez.ph).length - 1,
      [radky(bez.ph).length, radky(sNim.ph).length]);
  });

  /* Interiérová šachta nemá vnější lešení v základní ceně, takže odrážka
   * zůstává: bez příplatku si ho objednatel zajistí sám. */
  const int = nahled('cz', null, (z) => { z.typSachty = 'interiérová'; z.volitelne.leseniVnejsi = true; });
  test('na interiérové šachtě odrážka zůstává',
    String(int.ph.FIRMA_NAB_POZADAVKY || '').split('\n').some(r => LESENI.test(r)));
  /* A v rozšíření nabídky u ní nesmí stát „v základní ceně" (nález K1).
   * Od 22. 9. večer je tam naopak CENA PŘÍPLATKU — J. V.: „vnější lešení
   * vrať do příplatkových položek". Do té doby (odpoledne) tam byla
   * pomlčka, protože položka u interiérové šachty neexistovala vůbec. */
  test('a v nabídce u ní nestojí „v základní ceně"',
    String(int.ph.PRIP_LESENI_VNEJSI || '').indexOf('základní') < 0, int.ph.PRIP_LESENI_VNEJSI);
  test('ale cena příplatku (lešení se u ní nabízí jako příplatek)',
    /\d/.test(String(int.ph.PRIP_LESENI_VNEJSI || '')), int.ph.PRIP_LESENI_VNEJSI);
  test('a specifikace u ní odkazuje na příplatkové ceny',
    /příplatkové ceny/.test(String(int.ph.TS_LESENI_VNE || '')), int.ph.TS_LESENI_VNE);

  /* ŘÁDEK „LEŠENÍ KOLEM OCK…" V SEKCI SOUČÁSTÍ DODÁVKY NENÍ (P8/7).
   * Schválený návrh chtěl srovnat specifikaci i kapitolu IV.; oprava K1
   * srovnala jen kapitolu. U lešení v základní ceně tak dokument pořád
   * tvrdil v jedné sekci „je součástí dodávky" a v druhé „součástí dodávky
   * není — zajistí objednatel". Řádek teď v tom případě zmizí (jako sokl). */
  const neniSekce = (n) => (n.sekce.find(s => s.sekce === 'SOUČÁSTÍ DODÁVKY NENÍ') || { radky: [] })
    .radky.map(rr => rr[0]);
  const extSLesenim = nahled('cz', null, (z) => { z.typSachty = 'exteriérová'; z.volitelne.leseniVnejsi = true; });
  const extBezLeseni = nahled('cz', null, (z) => { z.typSachty = 'exteriérová'; z.volitelne.leseniVnejsi = false; });
  test('lešení v základní ceně: řádek LEŠENÍ KOLEM OCK v „Součástí dodávky není" chybí',
    neniSekce(extSLesenim).indexOf('LEŠENÍ KOLEM OCK PRO PROVEDENÍ OPLÁŠTĚNÍ') < 0
    && extSLesenim.ph.TS_NENI_LESENI === '', neniSekce(extSLesenim));
  test('bez lešení v ceně tam je', neniSekce(extBezLeseni).indexOf('LEŠENÍ KOLEM OCK PRO PROVEDENÍ OPLÁŠTĚNÍ') >= 0,
    neniSekce(extBezLeseni));
  test('a u interiérové šachty taky (lešení je tam příplatek)',
    neniSekce(int).indexOf('LEŠENÍ KOLEM OCK PRO PROVEDENÍ OPLÁŠTĚNÍ') >= 0, neniSekce(int));
  /* Pojistka proti prázdnému testu: zmizet smí jen ten jeden řádek. */
  test('ostatní řádky sekce zůstanou',
    neniSekce(extSLesenim).length === neniSekce(extBezLeseni).length - 1,
    [neniSekce(extBezLeseni).length, neniSekce(extSLesenim).length]);

  /* STATIKA V DOKUMENTU SE ŘÍDÍ CENOU (P8/6). Model a hraniční případy
   * hlídá test_specifikace_cena.js; tady jen, že to dojde až do nabídky. */
  const sStatikou = nahled('cz');
  const bezStatiky = nahled('cz', null, (z) => { z.mnozstviPrepis = { 'STATICKÉ POSOUZENÍ': 0 }; });
  test('nabídka: statika v ceně → „ano"', sStatikou.ph.TS_STATIKA === 'ano', sStatikou.ph.TS_STATIKA);
  test('nabídka: statika vypnutá množstvím 0 → „ne"', bezStatiky.ph.TS_STATIKA === 'ne', bezStatiky.ph.TS_STATIKA);
  const ext = nahled('cz', null, (z) => { z.typSachty = 'exteriérová'; z.volitelne.leseniVnejsi = true; });
  test('na exteriérové v základní ceně naopak stojí',
    String(ext.ph.PRIP_LESENI_VNEJSI || '').indexOf('základní') >= 0, ext.ph.PRIP_LESENI_VNEJSI);
}

/* ---------- 0b) nulová sazba DPH má v nabídce vlastní jméno (22. 9. 2026 večer) ----------
 *
 * Zahraniční řada ceníku od téhle dávky přepíná DPH na 0 %. Podmínka
 * `dph <= 0.15 ? 'snížená' : 'základní'` by pak tiskla „DPH 0 % (snížená
 * sazba)" — nesmysl, který zákazník přečte jako chybu v nabídce. */
{
  const sDph = (sazba, jaz) => {
    const puv = global.NAST;
    global.NAST = { firma: Object.assign({}, fm.DEFAULT_FIRMA, { nazev: 'Zkušební firma s.r.o.' }) };
    const zak = zk.novaZakazka();
    const v = zak.varianty[0];
    v.data.cenik = Object.assign(ZC.zkusebniCenik(), { dph: sazba, kurzEurKc: 25 });
    const ph = N.nabidkaData(zak, v, JEKLY, jaz || 'cz').placeholders;
    global.NAST = puv;
    return ph;
  };
  const nula = sDph(0);
  test('0 % se jmenuje „nulová", ne „snížená"', nula.DPH_NAZEV === 'nulová' && nula.DPH_SAZBA === '0',
    [nula.DPH_SAZBA, nula.DPH_NAZEV]);
  test('částka DPH je u nulové sazby nulová', /^0[,.]00/.test(String(nula.DPH_KC).trim()), nula.DPH_KC);
  test('snížená sazba zůstává snížená', sDph(0.12).DPH_NAZEV === 'snížená', sDph(0.12).DPH_NAZEV);
  test('základní zůstává základní', sDph(0.21).DPH_NAZEV === 'základní', sDph(0.21).DPH_NAZEV);
  /* Zahraniční nabídka se tiskne v cizím jazyce — jméno musí být ve slovníku,
   * jinak by zůstalo česky a export chybějících překladů by ho hlásil. */
  test('v angličtině „zero"', sDph(0, 'en').DPH_NAZEV === 'zero', sDph(0, 'en').DPH_NAZEV);
  test('v němčině „Null"', sDph(0, 'de').DPH_NAZEV === 'Null', sDph(0, 'de').DPH_NAZEV);
}

/* ---------- 1) výchozí texty existují ve všech třech jazycích ---------- */

[['cz', ''], ['en', 'En'], ['de', 'De']].forEach(([jaz, suf]) => {
  KAPITOLY.forEach(base => {
    const v = String(fm.DEFAULT_FIRMA[base + suf] || '').split('\n').filter(r => r.trim());
    test('výchozí text ' + base + ' (' + jaz + ') není prázdný', v.length > 0, v.length);
  });
});

/* Všechny tři jazyky musí mít STEJNÝ POČET odrážek — jinak se někde při
 * přepisu ztratil řádek a zákazník dostane kratší podmínky než Čech. */
KAPITOLY.forEach(base => {
  const pocty = ['', 'En', 'De'].map(suf =>
    String(fm.DEFAULT_FIRMA[base + suf] || '').split('\n').filter(r => r.trim()).length);
  test('všechny jazyky mají u ' + base + ' stejný počet odrážek',
    pocty[0] === pocty[1] && pocty[1] === pocty[2], pocty);
});

/* ---------- 2) v repozitáři není název firmy ----------
 *
 * Firemní údaje jsou v kódu schválně ukázkové (skutečné bydlí mimo
 * repozitář). Doložka o autorských právech nese značku {FIRMA}. */
KAPITOLY.forEach(base => {
  ['', 'En', 'De'].forEach(suf => {
    const t = String(fm.DEFAULT_FIRMA[base + suf] || '');
    test('výchozí text ' + base + suf + ' neobsahuje název firmy',
      !/engineers/i.test(t), t.slice(0, 80));
  });
});
test('doložka používá značku {FIRMA}', /\{FIRMA\}/.test(String(fm.DEFAULT_FIRMA.dolozky || '')));

/* ---------- 3) firmaKapitola: řádky, prázdné řádky, {FIRMA} ---------- */
{
  const f = { nazev: 'Zkušební firma s.r.o.', kapPredani: 'první\n\n  druhá  \n\nod {FIRMA}\n' };
  const k = fm.firmaKapitola(f, 'kapPredani', 'cz');
  test('prázdné řádky se zahodí', k.radky.length === 3, k.radky);
  test('řádky se ořežou', k.radky[1] === 'druhá', k.radky);
  test('{FIRMA} se nahradí názvem', k.radky[2] === 'od Zkušební firma s.r.o.', k.radky);
  test('a chybi je false, když text je', k.chybi === false);

  const prazdna = fm.firmaKapitola({ kapPredani: '   \n  ' }, 'kapPredani', 'cz');
  test('samé mezery se berou jako nevyplněno', prazdna.chybi === true && prazdna.radky.length === 0);

  /* Bez názvu firmy se značka NENAHRADÍ prázdnem — prázdné místo v doložce
   * o autorských právech by vypadalo jako chyba sazby, ne jako chybějící
   * údaj. Zůstane vidět, že se má doplnit. */
  const bezNazvu = fm.firmaKapitola({ kapPredani: 'od {FIRMA}' }, 'kapPredani', 'cz');
  test('bez vyplněného názvu firmy zůstane značka vidět',
    bezNazvu.radky[0] === 'od {FIRMA}', bezNazvu.radky);
}

/* ---------- 4) francouzština: čeština + hlasité upozornění ---------- */
{
  const fr = fm.firmaKapitola(Object.assign({}, fm.DEFAULT_FIRMA), 'kapPredani', 'fr');
  test('francouzština hlásí chybějící překlad', fr.chybi === true);
  test('a vydá český text, ne prázdno', fr.radky.length > 0, fr.radky.length);

  const n = nahled('fr');
  const sek = n.sekce.find(s => /REMISE|PŘEDÁNÍ/.test(s.sekce));
  test('francouzský náhled kapitolu má', !!sek, n.nazvy.join(' | '));
  const varovani = sek ? sek.radky.filter(r => /⚠/.test(String(r[0]))) : [];
  test('a nese právě jedno upozornění na chybějící překlad',
    varovani.length === 1, varovani.map(r => String(r[0]).slice(0, 60)));
}

/* ---------- 5) náhled: kapitoly stojí za cenou a ve správném pořadí ---------- */
{
  const n = nahled('cz');
  const poradi = ['III. PLATEBNÍ PODMÍNKY', 'IV. POŽADAVKY PRO PROVEDENÍ REALIZACE',
                  'V. TERMÍNY REALIZACE', 'VI. PŘEDÁNÍ DÍLA', 'DOLOŽKY'];
  poradi.forEach(s => test('náhled nese sekci ' + s, n.nazvy.includes(s), n.nazvy.join(' | ')));
  const idx = poradi.map(s => n.nazvy.indexOf(s));
  test('kapitoly jdou ve správném pořadí',
    idx.every((v, i) => i === 0 || v > idx[i - 1]), idx);
  const cena = n.nazvy.findIndex(s => /CENOVÁ NABÍDKA/.test(s));
  test('a všechny stojí až za cenou', idx.every(v => v > cena), { cena, idx });
  test('dodavatel zůstal úplně poslední',
    n.nazvy[n.nazvy.length - 1] === 'DODAVATEL', n.nazvy.slice(-2));
}

/* ---------- 6) kapitola III. se skládá z údajů zakázky ---------- */
{
  const n = nahled('cz');
  const sek = n.sekce.find(s => s.sekce === 'III. PLATEBNÍ PODMÍNKY');
  test('kapitola III. má řádky', !!sek && sek.radky.length >= 4, sek && sek.radky.length);
  const popisky = sek ? sek.radky.map(r => String(r[0])) : [];
  ['1. dílčí faktura', 'Splatnost faktur (dní)', 'Platnost nabídky'].forEach(p =>
    test('kapitola III. nese ' + p, popisky.includes(p), popisky));
  /* Hodnoty musí přijít z krycího listu, ne z pevného textu. */
  test('hodnoty kapitoly III. jsou ze symbolů PODM_',
    sek && sek.radky.every(r => String(r[1] || '').trim() !== ''),
    sek && sek.radky.map(r => r[1]));
  test('splatnost v kapitole III. sedí s PODM_SPLATNOST_DNI',
    sek && sek.radky.some(r => String(r[0]) === 'Splatnost faktur (dní)'
      && String(r[1]) === String(n.ph.PODM_SPLATNOST_DNI)),
    n.ph.PODM_SPLATNOST_DNI);
}

/* ---------- 7) prázdná kapitola zmizí i s nadpisem ----------
 *
 * Zároveň je to POJISTKA PROTI PRÁZDNÉMU TESTU: kdyby se kapitoly do náhledu
 * vůbec nedostávaly, kontroly výš by nemohly projít — a tahle ukazuje, že na
 * obsahu pole opravdu záleží. */
KAPITOLY.forEach(base => {
  const n = nahled('cz', f => { f[base] = ''; });
  test('prázdná ' + base + ' zmizí z náhledu i s nadpisem',
    !n.nazvy.includes(SEKCE[base]), n.nazvy.join(' | '));
  /* Ostatní kapitoly tím zmizet nesmí. */
  const zbytek = KAPITOLY.filter(x => x !== base);
  test('a ostatní kapitoly zůstanou',
    zbytek.every(x => n.nazvy.includes(SEKCE[x])), n.nazvy.join(' | '));
});

/* ---------- 8) v kapitolách nejsou ceny ----------
 *
 * Kapitoly popisují podmínky, ne peníze. Částka, která se sem omylem
 * dostane, by si odporovala s cenou o pár řádků výš. Procenta záloh jsou
 * v pořádku — ta do platebních podmínek patří —, ale měna ne. */
{
  const n = nahled('cz');
  ['IV. POŽADAVKY PRO PROVEDENÍ REALIZACE', 'V. TERMÍNY REALIZACE',
   'VI. PŘEDÁNÍ DÍLA', 'DOLOŽKY'].forEach(nazev => {
    const sek = n.sekce.find(s => s.sekce === nazev);
    const text = sek ? sek.radky.map(r => String(r[0]) + ' ' + String(r[1] || '')).join(' ') : '';
    test('kapitola ' + nazev + ' neobsahuje měnu',
      !/(Kč|EUR|€)/.test(text), text.slice(0, 100));
  });
}

/* ---------- 9) symboly do šablony ---------- */
{
  const n = nahled('en');
  ['FIRMA_NAB_POZADAVKY', 'FIRMA_NAB_TERMINY', 'FIRMA_NAB_PREDANI', 'FIRMA_NAB_DOLOZKY'].forEach(s => {
    test('symbol ' + s + ' je vyplněný', String(n.ph[s] || '').trim() !== '', n.ph[s]);
  });
  test('anglické symboly nesou anglický text',
    /Handover protocol/.test(String(n.ph.FIRMA_NAB_PREDANI || '')), String(n.ph.FIRMA_NAB_PREDANI || '').slice(0, 60));
  test('a příznak chybějícího překladu je prázdný', !n.ph.FIRMA_NAB_PREDANI_CHYBI);
  const fr = nahled('fr');
  test('u francouzštiny je příznak nastavený', fr.ph.FIRMA_NAB_PREDANI_CHYBI === '1');
}

/* ---------- 10) jazykové symboly do šablony nesou hotový text ----------
 *
 * `firmaPlaceholders` vydává VŠECHNA pole s prefixem FIRMA_, tedy i
 * {{FIRMA_NAB_DOLOZKY_DE}}. Do 21. 9. 2026 (nezávislá revize) to byla
 * syrová hodnota pole — se značkou {FIRMA} a s prázdnými řádky. Kdo si
 * takový symbol vložil do wordové šablony, dostal v dokumentu
 * „…von {FIRMA} weitergegeben…". Formulář v Nastavení přitom ty jazykové
 * symboly nabízí jako ty správné. */
{
  const f = Object.assign({}, fm.DEFAULT_FIRMA, { nazev: 'Zkušební firma s.r.o.' });
  const ph = fm.firmaPlaceholders(f, x => x);
  const symboly = [];
  ['kapPozadavky', 'kapTerminy', 'kapPredani', 'dolozky'].forEach(base => {
    const zaklad = 'FIRMA_NAB_' + base.replace(/^kap/, '').toUpperCase();
    ['', '_EN', '_DE'].forEach(suf => symboly.push(zaklad + suf));
  });
  symboly.forEach(s => {
    const v = String(ph[s] == null ? '' : ph[s]);
    test('symbol ' + s + ' je vyplněný', v.trim() !== '', v.slice(0, 40));
    test('symbol ' + s + ' nenese značku {FIRMA}', !/\{FIRMA\}/.test(v), v.slice(0, 80));
  });
  /* Pojistka proti prázdnému testu: značka v poli OPRAVDU je, takže se
   * ověřuje náhrada, ne to, že ji text nikdy neobsahoval. */
  test('kontrola není prázdná — v uloženém poli značka {FIRMA} je',
    /\{FIRMA\}/.test(String(fm.DEFAULT_FIRMA.dolozkyDe || '')),
    String(fm.DEFAULT_FIRMA.dolozkyDe || '').slice(0, 80));
  test('a jazykový symbol nese opravdu ten jazyk',
    /Urheberrechte/.test(String(ph.FIRMA_NAB_DOLOZKY_DE || '')),
    String(ph.FIRMA_NAB_DOLOZKY_DE || '').slice(0, 60));
  /* Německá doložka musí být celá věta — zdrojový dokument J. V. má
   * „behält sich {FIRMA}- und Urheberrechte vor" bez „die Eigentums-". */
  test('německá doložka si vyhrazuje i vlastnické právo',
    /die Eigentums- und Urheberrechte/.test(String(ph.FIRMA_NAB_DOLOZKY_DE || '')),
    String(ph.FIRMA_NAB_DOLOZKY_DE || '').slice(0, 160));
}

/* ---------- 11) platební podmínky se do ciziny tisknou PŘELOŽENÉ ----------
 * (#283, rozhodnutí J. V. 21. 9. 2026)
 *
 * Kapitola III. bere hodnoty z krycího listu a ty jsou volný text — slovníkem
 * prošly beze změny, takže anglická nabídka měla nadpisy anglicky a hodnoty
 * česky („50 % – po podpisu smlouvy", „2 měsíce"). Zákazník dostal kapitolu,
 * které z poloviny nerozuměl.
 *
 * Překládá se KONEČNÁ SADA PŘEDVYPLNĚNÝCH hodnot. Co obchodník napíše ručně,
 * projde beze změny — vymýšlet překlad cizí věty se nesmí. */
{
  const HODNOTY = ['Bez zálohy', '30 \u2013 po podpisu smlouvy'.replace('30 ', '30 % '),
                   '50 % \u2013 po podpisu smlouvy', '40 % \u2013 po zahájení montáže',
                   '10 % \u2013 po předání', '2 měsíce', 'Náš standard / měsíční',
                   'Uplatněn limit 10 %', '0,05 % / den'];
  HODNOTY.forEach(h => {
    ['en', 'de'].forEach(jaz => {
      const p = P.tr(h, jaz);
      test('„' + h + '" se přeloží do ' + jaz, p !== h && String(p).trim() !== '', p);
    });
  });
  /* POJISTKA PROTI PRÁZDNÉMU TESTU: v češtině se nic nepřekládá, takže kdyby
   * `tr` vracela pořád vstup, kontroly výš by padaly — a kdyby vracela
   * cokoli jiného, padla by tahle. */
  test('v češtině zůstává původní znění', P.tr('2 měsíce', 'cz') === '2 měsíce');
  /* A ruční text se nepřekládá ani nemrzačí. */
  const rucni = 'Dohodnuto telefonicky s panem Novákem';
  test('ručně napsaná podmínka projde beze změny', P.tr(rucni, 'en') === rucni, P.tr(rucni, 'en'));
}


/* ---------- TERMÍN DODÁNÍ V KAPITOLE V. (#330, nález TD1, 24. 9. 2026) ----------
 *
 * Krycí list počítal termín dodání i s +4 týdny za ATYP, ale do nabídky se
 * nedostal — kapitola V. byla jen text z Firmy („cca 12 týdnů") a atypický
 * zákazník dostal o 4 týdny kratší termín. Rozhodnutí J. V. 24. 9. 2026:
 * termín ze zakázky je první odrážka kapitoly V., zbytek zůstává z Firmy. */
{
  const lhuta = f => { f.terminDodaniOck = 'cca 12 týdnů'; f.terminAtypTydny = '4'; };
  const kapV = (n) => (n.sekce.find(s => /^V\. /.test(s.sekce) || /^V\. /.test(String(s.sekce))) || { radky: [] }).radky;
  const bezny = nahled('cz', lhuta, z => { z.atyp = false; });
  const atyp = nahled('cz', lhuta, z => { z.atyp = true; });
  test('#330: běžná zakázka má v kapitole V. první odrážku „Termín dodání: cca 12 týdnů"',
    kapV(bezny)[0] && kapV(bezny)[0][0] === 'Termín dodání' && kapV(bezny)[0][1] === 'cca 12 týdnů', kapV(bezny)[0]);
  test('#330: atypická zakázka nese prodloužený termín z krycího listu',
    kapV(atyp)[0] && /^cca 16 týdnů \(vč\. 4 týdnů za ATYP\)$/.test(kapV(atyp)[0][1]), kapV(atyp)[0]);
  test('#330: symbol pro Word nese totéž ({{PODM_TERMIN_DODANI}})',
    atyp.ph.PODM_TERMIN_DODANI === kapV(atyp)[0][1], atyp.ph.PODM_TERMIN_DODANI);
  test('#330: zbytek kapitoly V. zůstává textem z Firmy',
    kapV(atyp).length > 1 && /Harmonogram/.test(kapV(atyp).map(r => r[0]).join('\n')));
  const prazdna = nahled('cz', f => { f.terminDodaniOck = ''; });
  test('#330: bez lhůty ve Firmě se termín nevymýšlí — odrážka chybí',
    !kapV(prazdna).some(r => r[0] === 'Termín dodání'), kapV(prazdna)[0]);
  const jenTermin = nahled('cz', f => { lhuta(f); f.kapTerminy = ''; });
  test('#330: prázdný text kapitoly V. — kapitola zůstane s termínem dodání',
    kapV(jenTermin).length === 1 && kapV(jenTermin)[0][0] === 'Termín dodání', kapV(jenTermin));
  [['en', /^approx\. 16 weeks \(incl\. 4 weeks for the non-standard design\)$/, 'Delivery time'],
   ['de', /^ca\. 16 Wochen \(inkl\. 4 Wochen für die Sonderausführung\)$/, 'Lieferzeit'],
   ['fr', /^env\. 16 semaines \(dont 4 semaines pour l.exécution spéciale\)$/, 'Délai de livraison']].forEach(([jaz, re, popis]) => {
    const n = nahled(jaz, lhuta, z => { z.atyp = true; });
    const r = (n.sekce.find(s => s.radky.some(x => x[0] === popis)) || { radky: [] }).radky.find(x => x[0] === popis);
    test('#330: ' + jaz + ' — termín dodání přeložený celý', !!r && re.test(r[1]), r);
  });
  test('#330: vzor zná i termín bez „cca" a bez ATYP', P.tr('12 týdnů', 'en') === '12 weeks', P.tr('12 týdnů', 'en'));
  test('#330: obecné „cca …" platí dál', P.tr('cca 3 dny', 'en') === 'approx. 3 dny');
}

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
