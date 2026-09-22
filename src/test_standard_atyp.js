/* ===== ATYP NESMÍ ZŮSTAT ZAPNUTÝ U STANDARDNÍ ŠACHTY =====
 * (nález V36 / úkol O7, 3. kolo testů, 14. 9. 2026)
 *
 * CO SE STALO
 * Při zadávání fiktivní zakázky 9003 od nuly zaškrtla kontrola standardu
 * v jednom z mezikroků „ATYP (nestandardní zakázka)" a nastavila atypové
 * vstupy (rezervy 30 %, zámečník, projekce +25 h, montáž). Když bylo zadání
 * hotové, odznak hlásil STANDARD OCK — ale ATYP zůstal zaškrtnutý i s celou
 * přirážkou. Na 9003 to dělalo +33 % ceny.
 *
 * DVĚ PŘÍČINY
 *  1. Kontrola posuzovala i ROZDĚLANÉ zadání. Nová nabídka začíná od 9. 9.
 *     s nulovými rozměry, takže se šachta vyhodnocovala ještě dřív, než
 *     vůbec existovala. Nula ale není rozměr, je to nevyplněné pole.
 *  2. Automat běží jen při ZMĚNĚ zadání přes `set`. Přepnutí typu šachty
 *     ale dosazuje profily přímo do zadání, takže kontrola proběhla nad
 *     starými profily a o návratu do standardu se nedozvěděla.
 *
 * Tahle sada hlídá obojí a k tomu pravidlo, které se nesmí ztratit:
 * ručně zaškrtnutý ATYP zůstává, automat sahá jen na svoje.
 */
const fs = require('fs');
const S = require('./standard_ock.js');
const eng = require('./engine.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const STD = S.STANDARD_VYCHOZI;
/* Zadání fiktivní 9003 ze 3. kola: interiér 1,6 × 1,8, zdvih 9, 4 nástupiště,
 * zasklení na terče. Podle standardu je to standardní šachta. */
const z9003 = () => ({
  typSachty: 'interiérová', zaskleni: 'na terče', typPortalu: 'zapuštěný',
  sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2,
  roztec: 1.25, nastupiste: 4, rohoveSloupky: 4, svetlikNadDvermi: false, svetlikyBoky: 0,
  cistyVstupMm: 900, sirkaRamuMm: 100, mustek: false,
  profily: { sloupek: { dim: '80x40', tl: 4 } },
});
const vyska = (z) => z.prejezd + z.zdvih + z.prohluben;

/* ---------- 1) rozdělané zadání se neposuzuje ---------- */

test('nulové rozměry hlásí, že chybí šířka', S.standardRozmeryChybi({ sirka: 0, hloubka: 2, zdvih: 9 }));
test('nulové rozměry hlásí, že chybí hloubka', S.standardRozmeryChybi({ sirka: 2, hloubka: 0, zdvih: 9 }));
test('nulové rozměry hlásí, že chybí zdvih', S.standardRozmeryChybi({ sirka: 2, hloubka: 2, zdvih: 0 }));
test('prázdný řetězec je taky nevyplněno', S.standardRozmeryChybi({ sirka: '', hloubka: 2, zdvih: 9 }));
test('záporný rozměr je nevyplněno', S.standardRozmeryChybi({ sirka: -1, hloubka: 2, zdvih: 9 }));
test('vyplněné rozměry chybějící nehlásí', !S.standardRozmeryChybi({ sirka: 1.6, hloubka: 1.8, zdvih: 9 }));

{
  /* JÁDRO NÁLEZU: nová nabídka (samé nuly) se dřív vyhodnotila jako
   * „standard" — a v jiném mezikroku jako „atyp", na což se věší automat. */
  const prazdne = Object.assign(z9003(), { sirka: 0, hloubka: 0, zdvih: 0, prejezd: 0, prohluben: 0 });
  const v = S.standardVyhodnot(prazdne, 0, STD, []);
  test('prázdné zadání se NEvyhodnotí jako standard', v.stav !== 'standard', v.stav);
  test('prázdné zadání se NEvyhodnotí jako atyp', v.stav !== 'atyp', v.stav);
  test('prázdné zadání hlásí „nelze posoudit"', v.stav === 'nelze', v.stav);
  test('a nese značku rozmeryChybi, podle které automat mlčí', v.rozmeryChybi === true);
  test('odznak u prázdného zadání říká NELZE POSOUDIT',
    S.standardPopis(v) === 'NELZE POSOUDIT', S.standardPopis(v));
  test('rozpis vyjmenuje, co chybí',
    v.nalezy.length === 3 && v.nalezy.every(n => n.stav === 'nelze'),
    v.nalezy.map(n => n.co));
}

{
  /* Rozdělané zadání: rozměry ano, zdvih ještě ne. */
  const castecne = Object.assign(z9003(), { zdvih: 0 });
  const v = S.standardVyhodnot(castecne, vyska(castecne), STD, []);
  test('chybí-li jen zdvih, pořád se neposuzuje', v.stav === 'nelze' && v.rozmeryChybi === true, v.stav);
}

/* ---------- 2) hotové 9003 je standard ---------- */

{
  const z = z9003();
  const v = S.standardVyhodnot(z, vyska(z), STD, []);
  test('hotové 9003 je STANDARD OCK', v.stav === 'standard', [v.stav, v.nalezy.map(n => n.co)]);
  test('hotové 9003 nemá jediný nález', v.nalezy.length === 0, v.nalezy);
  test('a značku rozmeryChybi nenese', !v.rozmeryChybi);

  /* Zaškrtnutý ATYP nesmí sám o sobě kontrolu ovlivnit — jinak by se automat
   * zacyklil: zapnu ATYP, kontrola kvůli tomu hlásí atyp, ATYP zůstane. */
  const sAtypem = Object.assign(z9003(), { atyp: true, rezervaProfilyPct: 0.3, rezervaPlechyPct: 0.3 });
  const v2 = S.standardVyhodnot(sAtypem, vyska(sAtypem), STD, []);
  test('zaškrtnutý ATYP výsledek kontroly nemění', v2.stav === v.stav, v2.stav);
}

/* ---------- 3) pravidla automatu na zdroji ----------
 * Automat sedí v ui/common.js, které v Node nejde načíst (je to část
 * jednosouborové aplikace). Hlídají se proto pravidla, na kterých stojí. */
const ui = fs.readFileSync(__dirname + '/ui/common.js', 'utf8');

test('automat mlčí nad rozdělaným zadáním', /if \(v\.rozmeryChybi\) return false;/.test(ui));
test('automat vypíná jen to, co sám zaškrtl (Z.atypAutomat)',
  /Z\.atyp && Z\.atypAutomat/.test(ui));
test('automat umí režim „jen vypnout" pro otevřenou zakázku',
  /jenVypnout/.test(ui) && /if \(jenVypnout\) return false;/.test(ui));
test('úklid po otevření zakázky existuje', /function standardAtypUklid\(\)/.test(ui));
test('úklid sahá jen na automatem zaškrtnutý ATYP',
  /standardAtypUklid[\s\S]{0,400}?!Z\.atypAutomat\) return false/.test(ui));
test('úklid změnu ceny říká nahlas', /standardAtypUklid[\s\S]{0,600}?progZprava/.test(ui));
test('u standardní šachty se ručně zaškrtnutý ATYP označí',
  /ATYP zaškrtnut ručně/.test(ui));
test('to označení se týká JEN ručního ATYPu',
  /v\.stav === 'standard' && Z && Z\.atyp && !Z\.atypAutomat/.test(ui));

const online = fs.readFileSync(__dirname + '/ui/online_ui.js', 'utf8');
test('otevření zakázky ze serveru úklid pouští', /standardAtypUklid\(\)/.test(online));

const kalk = fs.readFileSync(__dirname + '/ui/kalk_ock.js', 'utf8');
{
  const prepni = (kalk.match(/function typSachtyPrepni\([\s\S]*?\n\}/) || [''])[0];
  test('přepnutí typu šachty pouští kontrolu znovu', /standardAtypAutomat\(\)/.test(prepni), prepni.length);
  test('a pouští ji AŽ po dosazení profilů',
    prepni.indexOf('Z.profily = JSON.parse') < prepni.indexOf('standardAtypAutomat()'),
    [prepni.indexOf('Z.profily = JSON.parse'), prepni.indexOf('standardAtypAutomat()')]);
}

/* ---------- 4) zaškrtávátka reagují na klik i mezerník (N10) ----------
 * Mezerník vyvolá `change`, ne `click`. Zaškrtávátko obsluhované přes
 * `onclick` proto klávesnicí nefunguje — a nikdo si toho nevšimne, protože
 * myší funguje. V Zadání šachty se proto smí jen `onchange`. */
{
  const zadaniBlok = (kalk.match(/const sl = \(obsah\)[\s\S]*?document\.getElementById\('inputs'\)[\s\S]*?\n\}/) || [''])[0];
  const checkboxy = zadaniBlok.match(/<input type="checkbox"[^>]*>/g) || [];
  const sOnclick = checkboxy.filter(c => /onclick=/.test(c));
  test('v Zadání šachty se našla zaškrtávátka', checkboxy.length >= 3, checkboxy.length);
  test('žádné zaškrtávátko v Zadání šachty neběží přes onclick', sOnclick.length === 0, sOnclick);
  test('všechna zaškrtávátka mají onchange',
    checkboxy.every(c => /onchange=/.test(c)), checkboxy.filter(c => !/onchange=/.test(c)));
}

/* ---------- 5) cena: ATYP proti ne-ATYP ---------- */
{
  const ZC = require('./zkusebni_cenik.js');
  const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));
  const zaklad = () => Object.assign(JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI)), {
    typSachty: 'interiérová', zaskleni: 'na terče',
    sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4,
  });
  const bez = zaklad();
  const s = Object.assign(zaklad(), {
    atyp: true, rezervaProfilyPct: 0.30, rezervaPlechyPct: 0.30,
    rezervaZakladPct: 0.30, zamecnikAtypKc: 25000, projekceAtypHod: 25, montazAtypHod: 6,
  });
  const cenaBez = eng.vypocet(bez, ZC.zkusebniCenik(), JEKLY, false).souhrn.zakladCena;
  const cenaS = eng.vypocet(s, ZC.zkusebniCenik(), JEKLY, false).souhrn.zakladCena;
  test('zapnutý ATYP cenu znatelně zvedá — proto nesmí zůstat viset',
    cenaS > cenaBez * 1.1, [cenaBez, cenaS]);
}

/* ---------- P11: DVĚ CESTY K HODINÁM ATYP (nález N24) ----------
 *
 * Hlášení ze 3. kola: automatické zapnutí ATYP dalo „Montáž – atyp navíc"
 * 5 hodin, ruční zaškrtnutí 6 hodin — rozdíl 2 000 Kč v ceně.
 *
 * Měřením 22. 9. 2026 se ukázalo, že VZOREC je v obou cestách týž:
 *   Math.round(sazba × (montazZakladHod + hodinyNavicCelkem))
 * Liší se ale ZDROJ SAZBY, a to způsobem, který dokáže dát jiné číslo:
 *
 *   · `atypPrepni` (ui/kalk_ock.js) — zaškrtnutí, ruční i automatické:
 *       S(klic) = cenikVychozi(C, klic, ATYP_NAHRADA[klic])
 *     Když ceník sazbu nemá, POUŽIJE SE NÁHRADA ZE SESTAVENÍ.
 *
 *   · `cenikDoZadani` (ui/kalk_ock.js) — přepočet na platný ceník při
 *     otevření zakázky:
 *       cenikVychozi(c, 'atypMontazPct', null)
 *     Když ceník sazbu nemá, vrátí null a hodiny se VŮBEC NEPŘEPOČÍTAJÍ.
 *
 * Jedna cesta tedy má záchrannou hodnotu a druhá ne. U ceníku BEZ té sazby
 * se proto hodiny podle cesty buď dopočítají z náhrady, nebo zůstanou, jak
 * byly — a to jsou dvě různá čísla u téže zakázky.
 *
 * Změřená citlivost zaokrouhlení (zkušební šachta, základ 24 h,
 * hodinyNavicCelkem −3,25): sazba 0,30 → 6 h, sazba 0,25 → 5 h. Přesně ten
 * hlášený rozdíl tedy vznikne i při nezměněné geometrii, jen jiným zdrojem
 * sazby.
 *
 * SJEDNOTIT SE NESMÍ POTICHU: dát `cenikDoZadani` tutéž náhradu znamená, že
 * se u ceníku bez sazby začne přepočítávat tam, kde se dosud nepřepočítávalo
 * — a to hne cenou. Čeká na rozhodnutí J. V. (roadmapa #298).
 *
 * Tenhle test rozdíl POJMENUJE a drží ho na místě, aby se nezměnil nikým
 * nepozorovaně. Je to kontrola zdroje, ne chování — logika je v UI, které
 * v Node nejde načíst. */
{
  const kalk = fs.readFileSync(__dirname + '/ui/kalk_ock.js', 'utf8');
  const prepni = (kalk.match(/function atypPrepni\(zap, opts\)[\s\S]*?\n\}/) || [''])[0];
  const doZadani = (kalk.match(/function cenikDoZadani\(v\)[\s\S]*?\n\}/) || [''])[0];

  test('P11: kontrola není prázdná — obě funkce se ve zdroji našly',
    prepni.length > 200 && doZadani.length > 200,
    { prepni: prepni.length, doZadani: doZadani.length });

  /* Vzorec je týž — kdyby se rozešel i ten, rozdíl by přestal být jen
   * v záchranné hodnotě a tenhle popis by přestal platit. */
  const vzorec = /Math\.round\([\s\S]{0,60}?\(\(\+[zZ]\.montazZakladHod \|\| 0\) \+ navic\)\)/;
  test('P11: obě cesty počítají hodiny týmž vzorcem',
    vzorec.test(prepni) && vzorec.test(doZadani),
    { prepni: vzorec.test(prepni), doZadani: vzorec.test(doZadani) });

  /* A tady je ten doložený rozdíl. Až padne rozhodnutí #298, tenhle řádek
   * se změní spolu s kódem — ne dřív. */
  test('P11: zaškrtnutí má u chybějící sazby náhradu ze sestavení',
    /ATYP_NAHRADA\[klic\]/.test(kalk) && /vych\(klic, ATYP_NAHRADA\[klic\]\)/.test(kalk));
  test('P11: přepočet ceníku náhradu NEMÁ (vrací null a přeskočí)',
    /cenikVychozi\(c, 'atypMontazPct', null\)/.test(doZadani));
  test('P11: a když sazba chybí, přepočet se u montáže opravdu přeskočí',
    /if \(pm != null && !zadaniRucniJe\(d, 'montazAtypHod'\)\)/.test(doZadani));
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
