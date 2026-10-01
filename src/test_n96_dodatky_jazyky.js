/* JAZYKOVÉ VARIANTY DODATKOVÝCH TEXTŮ (#379, nález K18-N96, 1. 10. 2026).
 *
 * Dodatkový text z ceníku (popis příplatku v kapitole II. nabídky) píše
 * člověk a slovník ho nezná — v anglické, německé i francouzské nabídce
 * proto zůstával česky (v30.9.4 o tom jen varovala kontrola „dodatekCesky").
 * Administrátor teď k textu vyplní varianty EN/DE/FR (`cenik.popisyJazyky`)
 * a nabídka v cizím jazyce vytiskne tu. Tahle sada hlídá:
 *   – očistu variant (tvar, jazyky, řídicí znaky, délka) — tentýž kód běží
 *     na serveru v /api/popisy;
 *   – výpočet nese variantu u příplatku, bez varianty se výstup nemění;
 *   – nabidkaData (online náhled i Word) tiskne variantu jazyka tisku,
 *     bez ní dosavadní cesta (slovník → jinak česky);
 *   – kontrola dodatekCesky mlčí, když varianta je, a hlásí, když chybí;
 *   – doplnění variant do zakázky jde jen za týmž českým textem;
 *   – odeslaná (uzamčená) nabídka drží variantu, se kterou odešla.
 *
 * Všechny texty jsou SMYŠLENÉ — skutečné firemní věty do repozitáře nepatří.
 *
 * Spuštění: cd src && node test_n96_dodatky_jazyky.js */
const fs = require('fs');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./preklad.js');
const eng = nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./firma.js');
nacti('./plan_plateb.js');
nacti('./nabidka_proj.js');
const zk = nacti('./zakazka.js');
const ZM = nacti('./zamek.js');
nacti('./kryci.js');
nacti('./kryci_proj.js');
nacti('./sablony_online.js');
nacti('./zpracovatel.js'); nacti('./dokumenty.js');
const CN = nacti('./cenik.js');
const K = require('./kontroly.js');
const NB = nacti('./nabidka.js');
const DX = require('./docxgen.js');
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

const SKN = 'Sklo SKN 176 (Ug=1,1) (EXT)';
const CZ = 'Ukázkový dodatek SKN';
const VAR = { en: 'Sample addendum SKN', de: 'Beispielzusatz SKN', fr: 'Addendum exemple SKN' };

/* Zakázka s exteriérovou šachtou a sklem SKN v nabídce (výchozí zadání ho
 * vynechává — N7). */
const zakazka = (popisy, jazyky) => {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 0379';
  const v = z.varianty[0];
  v.data.ock.zadani.typSachty = 'exteriérová';
  v.data.ock.zadani.priplatkyVynechat = [];
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), { kurzEurKc: 25, popisy: Object.assign({}, popisy) },
    jazyky ? { popisyJazyky: JSON.parse(JSON.stringify(jazyky)) } : {});
  return { z, v };
};
const sknRadek = (z, v, L) => NB.nabidkaData(z, v, JEKLY, L).priplatky.find(x => /SKN/.test(x.nazev));

/* ======================= očista variant ======================= */
{
  test('model: funkce variant existují (popisyJazykyOciste, cenikPopisJazyk, popisyJazykyDoplnChybejici)',
    typeof CN.popisyJazykyOciste === 'function' && typeof CN.cenikPopisJazyk === 'function'
      && typeof CN.popisyJazykyDoplnChybejici === 'function');
  const o = typeof CN.popisyJazykyOciste === 'function' ? CN.popisyJazykyOciste({
    [SKN]: { en: '  Sample\naddendum\u0007 ', de: 'x'.repeat(1000), fr: 7, cz: 'česky', it: 'italiano', __proto__x: 'y' },
    'Jen řetězec': 'není objekt',
    'Pole': ['en'],
    'Prázdné': { en: '   ', de: '' },
    '': { en: 'bez klíče' },
    ['k'.repeat(201)]: { en: 'dlouhý klíč' },
  }) : {};
  test('očista: povolené jsou jen en/de/fr, jen řetězce', JSON.stringify(Object.keys(o[SKN] || {})) === '["en","de"]', o[SKN]);
  test('očista: řídicí znaky pryč, zalomení → mezera, ořez mezer', (o[SKN] || {}).en === 'Sample addendum', o[SKN]);
  test('očista: strop délky jako u českého textu (300)', ((o[SKN] || {}).de || '').length === CN.POPISY_MAX_TEXT, ((o[SKN] || {}).de || '').length);
  test('očista: hodnota, která není objekt, a prázdné varianty se zahodí',
    !('Jen řetězec' in o) && !('Pole' in o) && !('Prázdné' in o), Object.keys(o));
  test('očista: prázdný a příliš dlouhý klíč se zahodí', !('' in o) && Object.keys(o).every(k => k.length <= 200), Object.keys(o));
  const sTexty = typeof CN.popisyJazykyOciste === 'function'
    ? CN.popisyJazykyOciste({ [SKN]: VAR, 'Bez českého': { en: 'orphan' } }, { [SKN]: CZ }) : {};
  test('očista s mapou textů: varianta bez českého textu se zahodí',
    !!sTexty[SKN] && !('Bez českého' in sTexty), sTexty);
  test('očista: vstup, který není objekt, dá prázdnou mapu',
    typeof CN.popisyJazykyOciste === 'function' && JSON.stringify(CN.popisyJazykyOciste('x')) === '{}'
      && JSON.stringify(CN.popisyJazykyOciste([1])) === '{}' && JSON.stringify(CN.popisyJazykyOciste(null)) === '{}');
}

/* ======================= výpočet nese variantu ======================= */
{
  const { v } = zakazka({ [SKN]: CZ }, { [SKN]: VAR });
  const r = eng.vypocet(v.data.ock.zadani, v.data.cenik, JEKLY, true);
  const p = r.priplatky.find(x => x.key === 'skn');
  test('výpočet: příplatek SKN nese varianty dodatkového textu', !!p && !!p.popisNabidkaJazyky
    && p.popisNabidkaJazyky.de === VAR.de && p.popisNabidkaJazyky.en === VAR.en, p && p.popisNabidkaJazyky);
  const { v: v0 } = zakazka({ [SKN]: CZ });
  const r0 = eng.vypocet(v0.data.ock.zadani, v0.data.cenik, JEKLY, true);
  test('výpočet: bez variant položka vlastnost nemá (výstup beze změny)',
    r0.priplatky.every(x => !('popisNabidkaJazyky' in x)));
}

/* ======================= nabidkaData (online náhled i Word) ======================= */
{
  const { z, v } = zakazka({ [SKN]: CZ }, { [SKN]: VAR });
  const de = sknRadek(z, v, 'de');
  test('nabídka DE: dodatkový text SKN je německá varianta', !!de && de.popis === VAR.de, de);
  const en = sknRadek(z, v, 'en');
  test('nabídka EN: anglická varianta', !!en && en.popis === VAR.en, en);
  const fr = sknRadek(z, v, 'fr');
  test('nabídka FR: francouzská varianta', !!fr && fr.popis === VAR.fr, fr);
  const cz = sknRadek(z, v, 'cz');
  test('nabídka CZ: český text (varianty se nečtou)', !!cz && cz.popis === CZ, cz);

  const { z: z1, v: v1 } = zakazka({ [SKN]: CZ }, { [SKN]: { en: VAR.en } });
  const de1 = sknRadek(z1, v1, 'de');
  test('bez varianty jazyka: zůstane dosavadní chování (text česky)', !!de1 && de1.popis === CZ, de1);
  const { z: z2, v: v2 } = zakazka({ [SKN]: 'materiál a montáž' }, { [SKN]: { en: VAR.en } });
  const de2 = sknRadek(z2, v2, 'de');
  test('bez varianty jazyka: text, který slovník zná, se dál přeloží', !!de2 && de2.popis !== 'materiál a montáž' && !!de2.popis, de2);
  const { z: z3, v: v3 } = zakazka({}, { [SKN]: VAR });
  const de3 = sknRadek(z3, v3, 'de');
  test('varianta bez českého textu se netiskne (prázdný text = žádný řádek)', !!de3 && de3.popis === '', de3);

  /* Word: šablona s prototypovou tabulkou příplatků dostane týž popis. */
  const proto = '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>{{PRIP_NAZEV}}</w:t></w:r></w:p><w:p><w:r><w:t>{{PRIP_POPIS}}</w:t></w:r></w:p></w:tc>'
    + '<w:tc><w:p><w:r><w:t>{{PRIP_CENA}}</w:t></w:r></w:p></w:tc></w:tr></w:tbl>';
  const xml = DX.expandujPriplatky('<w:body>' + proto + '</w:body>', NB.nabidkaData(z, v, JEKLY, 'de').priplatky);
  test('Word DE: řádek příplatku nese německou variantu', xml.indexOf(VAR.de) >= 0 && xml.indexOf(CZ) < 0, xml.slice(0, 400));
}

/* ======================= kontrola dodatekCesky ======================= */
{
  const ctx = (popisy, jazyky, jazyk) => {
    const zadani = JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI));
    zadani.typSachty = 'exteriérová'; zadani.priplatkyVynechat = [];
    const cenik = Object.assign(ZC.zkusebniCenik(), { popisy }, jazyky ? { popisyJazyky: jazyky } : {});
    return { zadani, cenik, jazyk, vysledek: eng.vypocet(zadani, cenik, JEKLY, true) };
  };
  const nalez = c => K.kontrolyProved(c).nalezy.find(n => n.kod === 'dodatekCesky');
  const bez = nalez(ctx({ [SKN]: CZ }, null, 'de'));
  test('kontrola: bez varianty → varování dodatekCesky (jmenuje SKN a jazyk)',
    !!bez && bez.text.indexOf(SKN) >= 0 && /\bDE\b/.test(bez.text), bez && bez.text);
  test('kontrola: varování řekne, kde variantu doplnit (číselník, administrátor)',
    !!bez && /číselník/.test(bez.text) && /administrátor/.test(bez.text), bez && bez.text);
  test('kontrola: s variantou jazyka tisku → bez varování', !nalez(ctx({ [SKN]: CZ }, { [SKN]: VAR }, 'de')));
  const jen = nalez(ctx({ [SKN]: CZ }, { [SKN]: { en: VAR.en } }, 'de'));
  test('kontrola: varianta jen pro jiný jazyk → varování dál', !!jen && jen.text.indexOf(SKN) >= 0, jen && jen.text);
}

/* ======================= doplnění variant do ceníku zakázky ======================= */
{
  const f = CN.popisyJazykyDoplnChybejici;
  if (typeof f === 'function') {
    const c1 = { popisy: { [SKN]: CZ } };
    const n1 = f(c1, { [SKN]: CZ }, { [SKN]: VAR });
    test('doplnění: k témuž českému textu se varianty doplní', n1 === 3 && c1.popisyJazyky[SKN].de === VAR.de, c1);
    const c2 = { popisy: { [SKN]: 'Vlastní text obchodníka' } };
    test('doplnění: k přepsanému českému textu se varianty nedoplní (překlad jiné věty)',
      f(c2, { [SKN]: CZ }, { [SKN]: VAR }) === 0 && !c2.popisyJazyky, c2);
    const c3 = { popisy: { [SKN]: CZ }, popisyJazyky: { [SKN]: { de: 'Eigene Variante' } } };
    f(c3, { [SKN]: CZ }, { [SKN]: VAR });
    test('doplnění: existující varianta zakázky se nepřepíše, chybějící jazyky se doplní',
      c3.popisyJazyky[SKN].de === 'Eigene Variante' && c3.popisyJazyky[SKN].en === VAR.en, c3);
    const c4 = { popisy: {} };
    CN.popisyVlij(c4, { [SKN]: CZ }, { [SKN]: VAR });
    test('vlití do výchozího ceníku: český text i varianty', c4.popisy[SKN] === CZ && c4.popisyJazyky[SKN].fr === VAR.fr, c4);
    const c5 = { popisy: { [SKN]: CZ }, popisyJazyky: { [SKN]: VAR } };
    c5.popisy[SKN] = 'Jiný text';
    CN.popisJazykySrovnej(c5, SKN, { [SKN]: CZ }, { [SKN]: VAR });
    test('změna českého textu v zakázce zahodí varianty (staré věty)', !c5.popisyJazyky || !c5.popisyJazyky[SKN], c5);
    c5.popisy[SKN] = CZ;
    CN.popisJazykySrovnej(c5, SKN, { [SKN]: CZ }, { [SKN]: VAR });
    test('návrat na společný text vrátí společné varianty', !!c5.popisyJazyky && c5.popisyJazyky[SKN].de === VAR.de, c5);
  } else test('doplnění: popisyJazykyDoplnChybejici existuje', false);
}

/* ======================= uzamčená (odeslaná) nabídka ======================= */
{
  const { z, v } = zakazka({ [SKN]: CZ }, { [SKN]: VAR });
  ZM.zamkniVariantu(v, { typ: 'cn', vysledek: ZM.zamekVysledekSpocti(v, JEKLY, '') });
  v.data.cenik.popisyJazyky[SKN].de = 'Später geändert';
  const de = sknRadek(z, v, 'de');
  test('uzamčená nabídka drží variantu, se kterou odešla', !!de && de.popis === VAR.de, de);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
