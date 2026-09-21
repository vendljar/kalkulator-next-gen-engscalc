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

function nahled(jazyk, upravFirmu) {
  const puv = global.NAST;
  const f = Object.assign({}, fm.DEFAULT_FIRMA, { nazev: 'Zkušební firma s.r.o.' });
  if (upravFirmu) upravFirmu(f);
  global.NAST = { firma: f };
  const zak = zk.novaZakazka();
  const v = zak.varianty[0];
  v.data.cenik = ZC.zkusebniCenik();
  const d = N.nabidkaData(zak, v, JEKLY, jazyk);
  const s = N.nabidkaNahledSekce(d.placeholders, jazyk);
  global.NAST = puv;
  return { ph: d.placeholders, sekce: s, nazvy: s.map(x => x.sekce) };
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

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
