/* ===== POPISKY PRYČ ZE ZADÁNÍ, NULA SE NEMUSÍ MAZAT (10. 9. 2026) =====
 *
 * Zadání J. V.: „Ze zadání šachty odstraň popisné texty. Ty přenes do detailu
 * výpočtu. Nastav buňky tak, aby když je v nich nula a kliknu do nich, tak jsem
 * tu nulu nemusel mazat, ale mohl ji rovnou přepsat."
 *
 * Obojí je snadné omylem vrátit: popisek se do karty přidá jedním řádkem
 * a označování nuly zmizí, jakmile někdo sáhne na podmínku. Prohlížeč ani
 * jedno nehlásí jako chybu — proto to hlídá tahle sada.
 *
 * Popisky se testují na ZDROJOVÉM KÓDU (stejně jako test_proj_vzhled.js):
 * co se vykreslí do karty, je řetězec v `kalk_ock.js`. Komentáře se odstraní,
 * jinak by sada padala na vlastní vysvětlivce.
 */
const fs = require('fs');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n + (info ? '  – ' + info : '')); }
};

const bezKomentaru = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const kalkZdroj = fs.readFileSync(__dirname + '/ui/kalk_ock.js', 'utf8');
const kalk = bezKomentaru(kalkZdroj);
const detailZdroj = fs.readFileSync(__dirname + '/ui/detail_ui.js', 'utf8');
const detail = bezKomentaru(detailZdroj);
const commonZdroj = fs.readFileSync(__dirname + '/ui/common.js', 'utf8');

/* ---------- 1) v zadání šachty už popisné texty nejsou ---------- */

/* Hledá se vykreslený odstavec `div.note`, ne samotná věta — táž věta smí
 * zůstat v tooltipu, tam žádný řádek nezabere. */
test('pod polem Stříška nad nástupiště není popisný odstavec',
  !/class="note"[\s\S]{0,300}?bez stříšky/.test(kalk));
test('pod polem Počet nástupišť není popisný odstavec „Dopočítáno z A + C"',
  !/class="note"[\s\S]{0,300}?Dopočítáno z A \+ C/.test(kalk));
test('vysvětlení stříšky zůstalo aspoň jako tooltip nad polem',
  /t: *'počet kusů/.test(kalk));
test('dopočet nástupišť zůstal aspoň jako tooltip nad polem',
  /title="dopočítáno z nástupišť A \+ C/.test(kalk));

/* Varování u počtu pater NENÍ popisný text – ukáže se, jen když se bez něj
 * nedá spočítat výška podlaží. Kdyby zmizelo, obchodník uvidí tiché nuly. */
test('varování u počtu pater zůstalo v zadání',
  /patraVarovani/.test(kalk) && /aspoň 2/.test(kalk));

/* ---------- 2) vysvětlení se přestěhovalo do detailu výpočtu ---------- */

test('detail výpočtu ukazuje, zda je šachta průchozí', /'Průchozí šachta'/.test(detail));
test('detail výpočtu rozepisuje nástupiště A a C',
  /nástupiště A \(čelní stěna\)/.test(detail) && /nástupiště C \(zadní stěna\)/.test(detail));
test('detail výpočtu ukazuje počet pater', /počet pater/.test(detail));
test('detail výpočtu ukazuje počet kusů stříšky', /'Stříška nad nástupiště'/.test(detail));
test('detail výpočtu vysvětluje, že nula znamená bez stříšky',
  /nula znamená bez stříšky/.test(detail));
test('detail výpočtu bere celkový počet nástupišť z nastupisteCelkem',
  /nastupisteCelkem/.test(detail));
test('u průchozí šachty se výška podlaží počítá z pater, ne z nástupišť',
  /zdvih \/ \(počet pater − 1\)/.test(detail));

/* ---------- 3) nula v poli se označí, aby ji šlo rovnou přepsat ---------- */

/* Funkce se vytáhne ze zdroje a spustí samostatně: `ui/common.js` jako celek
 * potřebuje prohlížeč, ale tahle jedna funkce je čistá práce nad elementem. */
const kus = commonZdroj.match(/function nulaOznac\(el\)[\s\S]*?\n\}/);
test('funkce nulaOznac je v ui/common.js', !!kus);

if (kus) {
  const nulaOznac = new Function(kus[0] + '\nreturn nulaOznac;')();
  const pole = (v, extra) => Object.assign(
    { tagName: 'INPUT', type: 'number', value: v, readOnly: false, disabled: false,
      oznaceno: false, select() { this.oznaceno = true; } }, extra || {});

  const nula = pole('0'); nulaOznac(nula);
  test('nula se označí, takže ji první stisk klávesy přepíše', nula.oznaceno === true);

  const desetinna = pole('0,00'); nulaOznac(desetinna);
  test('desetinná nula (0,00) se označí taky', desetinna.oznaceno === true);

  const tecka = pole('0.0'); nulaOznac(tecka);
  test('desetinná nula s tečkou se označí taky', tecka.oznaceno === true);

  const cislo = pole('25'); nulaOznac(cislo);
  test('vyplněné číslo se NEoznačí – kliknutím se opravuje jedna číslice',
    cislo.oznaceno === false);

  const prazdne = pole(''); nulaOznac(prazdne);
  test('prázdné pole se neoznačuje', prazdne.oznaceno === false);

  const jenCteni = pole('0', { readOnly: true }); nulaOznac(jenCteni);
  test('pole jen ke čtení (dopočítaný počet nástupišť) se neoznačuje',
    jenCteni.oznaceno === false);

  const vypnute = pole('0', { disabled: true }); nulaOznac(vypnute);
  test('vypnuté pole se neoznačuje', vypnute.oznaceno === false);

  const datum = pole('0', { type: 'date' }); nulaOznac(datum);
  test('pole typu date se neoznačuje', datum.oznaceno === false);

  const vyber = pole('0', { tagName: 'SELECT' }); nulaOznac(vyber);
  test('rolovací seznam se neoznačuje', vyber.oznaceno === false);

  let spadlo = false;
  try { nulaOznac(null); nulaOznac(undefined); } catch (e) { spadlo = true; }
  test('prázdný cíl události funkci nepoloží', spadlo === false);
}

/* Registrace posluchače nesmí spadnout v Node – sady načítají ui/common.js. */
test('nulaOznacStart se v prostředí bez DOM tiše vypne',
  /typeof document === 'undefined'/.test(commonZdroj));

/* ---------- 4) každý řádek detailu má vysvětlení ----------
 *
 * Zadání J. V. 10. 9. 2026: „doplň vysvětlující informace paušálně pro všechny
 * položky v detailech výpočtu OCK a PROJ." Podnětem byl řádek Oplechování
 * dveří: číslo 15 ks se v zadání nikde nebere, počítá se jako 3 × nástupiště,
 * a ve sloupci vzorců stála prázdná buňka.
 *
 * Prázdný třetí prvek řádku (`, ''`) je právě ta prázdná buňka. Hlídá se na
 * zdroji, protože ve vykreslené tabulce se prázdná buňka od vyplněné nepozná
 * jinak než okem — a nový řádek se přidává jedním řádkem kódu. */
const detailProjZdroj = fs.readFileSync(__dirname + '/ui/detail_proj_ui.js', 'utf8');
const prazdne = (s) => (s.match(/,\s*''\]/g) || []).length;

test('detail výpočtu OCK nemá řádek bez vysvětlení',
  prazdne(detailZdroj) === 0, prazdne(detailZdroj) + ' prázdných');
test('detail výpočtu PROJ nemá řádek bez vysvětlení',
  prazdne(detailProjZdroj) === 0, prazdne(detailProjZdroj) + ' prázdných');

/* Sonda na sobě: kdyby se hledání rozbilo, test by mlčel a prošel by i detail
 * plný prázdných buněk. */
test('hlídač prázdných buněk skutečně prázdnou buňku pozná',
  prazdne("['Něco', `${x}`, ''],") === 1 && prazdne("['Něco', `${x}`, 'vzorec'],") === 0);

/* Vysvětlení nesmí být jen tečka nebo mezera – kontroluje se, že jich je hodně
 * a že mají obsah. */
const vzorce = (s) => (s.match(/,\s*'[^']{10,}'\]/g) || []).length;
test('detail OCK má vysvětlení u desítek řádků', vzorce(detailZdroj) >= 20, vzorce(detailZdroj));
test('detail PROJ má vysvětlení u řádků závěru i ceníku', vzorce(detailProjZdroj) >= 5,
  vzorce(detailProjZdroj));

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
