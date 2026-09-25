/* Ověření v prohlížeči: zadání šachty bez popisných odstavců a detail výpočtu
 * s vysvětlením u každého řádku (T4, dávka E4, 24. 9. 2026).
 *
 * PROČ TAHLE SADA. `src/test_zadani_popisky.js` hlídal tyhle věci regulárními
 * výrazy nad ZDROJÁKEM obrazovek (`kalk_ock.js`, `detail_ui.js`,
 * `detail_proj_ui.js`). Revize v22.9.9 (nález T4) upozornila, že takový test
 * hlídá tvar kódu, ne to, co člověk vidí: projde i tehdy, když se řetězec
 * přesune do funkce, která se nikdy nezavolá, a spadne při neškodném
 * přejmenování proměnné. Tady se tytéž požadavky ověřují na VYKRESLENÉ
 * stránce:
 *
 *   1) v zadání šachty nejsou popisné odstavce (div.note) u stříšky a počtu
 *      nástupišť — vysvětlení zůstává jako tooltip (zadání J. V. 10. 9. 2026);
 *   2) varování u počtu pater se ukáže, když bez něj nejde spočítat výška;
 *   3) vysvětlení se přestěhovala do detailu výpočtu;
 *   4) každý řádek detailu OCK i PROJ má vyplněný sloupec vysvětlení;
 *   5) nula v číselném poli se po kliknutí označí (první klávesa ji přepíše).
 *
 * Spuštění: NODE_PATH=$(npm root -g) node overit_zadani_detail.mjs
 */
import { createRequire } from 'module';
import path from 'path';
import { pathToFileURL } from 'url';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  console.error('Playwright není k dispozici. NODE_PATH=$(npm root -g) node overit_zadani_detail.mjs');
  process.exit(2);
}

const KDE = pathToFileURL(path.resolve('dist/kalkulacka.html')).href;
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + detail)); }
};

const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
const konzole = [];
p.on('pageerror', e => konzole.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') konzole.push('error: ' + m.text()); });
await p.goto(KDE);
await p.waitForTimeout(600);

/* ---------- 1) zadání bez popisných odstavců ---------- */
console.log('zadání šachty');
const zadani = await p.evaluate(() => {
  /* Průchozí šachta — jen u ní se počet nástupišť dopočítává z A + C. */
  Z.pruchoziSachta = true; Z.nastupisteC = 2;
  prepniTab('kalk'); render();
  const karta = document.querySelector('#ock-zadani');
  const noty = karta ? [...karta.querySelectorAll('.note')].map(n => n.textContent) : null;
  const tituly = karta ? [...karta.querySelectorAll('[title]')].map(e => e.getAttribute('title')) : [];
  Z.pruchoziSachta = false; Z.nastupisteC = 0; render();
  return { karta: !!karta, noty, tituly };
});
zkus('karta zadání šachty se vykreslila', zadani.karta);
zkus('pod polem Stříška není popisný odstavec „bez stříšky"',
  zadani.noty && !zadani.noty.some(t => /bez stříšky/i.test(t)), JSON.stringify(zadani.noty));
zkus('pod polem Počet nástupišť není odstavec „Dopočítáno z A + C"',
  zadani.noty && !zadani.noty.some(t => /Dopočítáno z A \+ C/i.test(t)), JSON.stringify(zadani.noty));
zkus('vysvětlení stříšky zůstalo jako tooltip', zadani.tituly.some(t => /^počet kusů/i.test(t)),
  zadani.tituly.slice(0, 8).join(' | '));
zkus('dopočet nástupišť zůstal jako tooltip', zadani.tituly.some(t => /dopočítáno z nástupišť A \+ C/i.test(t)));

/* ---------- 2) varování u počtu pater ---------- */
const patra = await p.evaluate(() => {
  const puv = { pruchozi: Z.pruchoziSachta, patra: Z.pocetPater };
  Z.pruchoziSachta = true; Z.pocetPater = ''; render();
  const t = (document.querySelector('#ock-zadani') || {}).textContent || '';
  Z.pruchoziSachta = puv.pruchozi; Z.pocetPater = puv.patra; render();
  return /aspoň 2/.test(t);
});
zkus('průchozí šachta bez počtu pater ukáže varování „aspoň 2"', patra);

/* ---------- 3) + 4) detail výpočtu OCK ---------- */
console.log('\ndetail výpočtu');
/* Sloupec vysvětlení je v tabulkách detailu `table.dv` buňka `td.f`
 * (vykresluje se, když je zapnuté „zobrazit vzorce" — výchozí stav).
 * Hledá se jen na zadané stránce, ne ve skrytých záložkách. */
const radkyBezVysvetleni = (stranka) => [...document.querySelectorAll('#' + stranka + ' table.dv tr')]
  .map(tr => [...tr.children])
  .filter(td => td.length >= 3 && td[td.length - 1].tagName === 'TD' && td[td.length - 1].classList.contains('f'))
  .filter(td => !td[td.length - 1].textContent.trim())
  .map(td => td[0].textContent.trim().slice(0, 40));
const detOck = await p.evaluate((fnSrc) => {
  const fn = () => new Function('return (' + fnSrc + ')')()('page-detail');
  DETAIL_VZORCE = true;
  Z.pruchoziSachta = true; Z.nastupisteC = 2; render();
  prepniTab('detail'); render();
  const el = document.getElementById('page-detail');
  const t = el ? el.innerText : '';
  const vysl = { je: !!el && t.length > 500, t,
    radku: el ? el.querySelectorAll('table tr').length : 0, prazdne: fn(),
    vysvetleni: el ? el.querySelectorAll('table.dv td.f').length : 0 };
  Z.pruchoziSachta = false; Z.nastupisteC = 0; prepniTab('kalk'); render();
  return vysl;
}, radkyBezVysvetleni.toString());
zkus('detail výpočtu OCK se vykreslil', detOck.je, detOck.t.length);
zkus('detail ukazuje, zda je šachta průchozí', /Průchozí šachta/.test(detOck.t));
zkus('detail rozepisuje nástupiště A a C',
  /nástupiště A \(čelní stěna\)/.test(detOck.t) && /nástupiště C \(zadní stěna\)/.test(detOck.t));
zkus('detail ukazuje počet pater', /počet pater/i.test(detOck.t));
zkus('detail ukazuje stříšku nad nástupiště a že nula znamená bez stříšky',
  /Stříška nad nástupiště/.test(detOck.t) && /nula znamená bez stříšky/.test(detOck.t));
zkus('u průchozí šachty se výška podlaží počítá z pater', /zdvih \/ \(počet pater − 1\)/.test(detOck.t));
zkus('detail OCK má desítky řádků', detOck.radku >= 20, detOck.radku);
zkus('detail OCK má sloupec vysvětlení (desítky buněk)', detOck.vysvetleni >= 20, detOck.vysvetleni);
zkus('žádný řádek detailu OCK nemá prázdné vysvětlení', detOck.prazdne.length === 0, detOck.prazdne.join(' | '));

/* ---------- detail výpočtu PROJ ---------- */
const detProj = await p.evaluate((fnSrc) => {
  const fn = () => new Function('return (' + fnSrc + ')')()('page-detailproj');
  prepniTab('detailproj'); render();
  const el = document.getElementById('page-detailproj');
  const vysl = { je: !!el && el.innerText.length > 200, radku: el ? el.querySelectorAll('table tr').length : 0, prazdne: fn() };
  prepniTab('kalk'); render();
  return vysl;
}, radkyBezVysvetleni.toString());
zkus('detail výpočtu PROJ se vykreslil', detProj.je);
zkus('žádný řádek detailu PROJ nemá prázdné vysvětlení', detProj.prazdne.length === 0, detProj.prazdne.join(' | '));

/* Sonda na sobě: kdyby hledání prázdných buněk nic nenacházelo z principu,
 * dvě kontroly výš by prošly vždycky. */
const sonda = await p.evaluate((fnSrc) => {
  const fn = () => new Function('return (' + fnSrc + ')')()('sonda-detail');
  const el = document.createElement('div'); el.id = 'sonda-detail';
  el.innerHTML = '<table class="dv"><tr><td>Řádek bez vysvětlení</td><td class="val">5</td><td class="f"> </td></tr>'
    + '<tr><td>Řádek s vysvětlením</td><td class="val">5</td><td class="f">3 × nástupiště</td></tr></table>';
  document.body.appendChild(el);
  const n = fn().length; el.remove(); return n;
}, radkyBezVysvetleni.toString());
zkus('(sonda) hlídač prázdné vysvětlení opravdu pozná', sonda === 1, sonda);

/* ---------- 5) nula se po kliknutí označí ---------- */
console.log('\nnula v poli');
const nula = await p.evaluate(async () => {
  prepniTab('kalk'); render();
  const pole = [...document.querySelectorAll('#ock-zadani input[type=number]')]
    .filter(i => !i.readOnly && !i.disabled);
  if (!pole.length) return { chyba: 'žádné číselné pole' };
  const cil = pole[0];
  const puv = cil.value;
  let oznaceno = 0;
  const orig = HTMLInputElement.prototype.select;
  HTMLInputElement.prototype.select = function () { oznaceno++; return orig.call(this); };
  try {
    cil.value = '0'; cil.focus(); cil.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const priNule = oznaceno; cil.blur();
    cil.value = '25'; cil.focus(); cil.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    return { priNule, priCisle: oznaceno - priNule };
  } finally { HTMLInputElement.prototype.select = orig; cil.value = puv; cil.blur(); }
});
zkus('kliknutí do pole s nulou ji označí', nula.priNule >= 1, JSON.stringify(nula));
zkus('kliknutí do vyplněného čísla ho neoznačí (opravuje se jedna číslice)', nula.priCisle === 0, JSON.stringify(nula));

/* N56 (rozhodnutí J. V. 24. 9. 2026): záporné hodiny ručně zadat nejde —
 * montáž a projekce v OCK, hodiny i rezerva položek PROJ. */
const hod = await p.evaluate(() => {
  const texty = []; const puvH = window.hlaska; window.hlaska = t => { texty.push(String(t)); return Promise.resolve(); };
  try {
    const pred = { atyp: Z.montazAtypHod, zakl: Z.projekceZakladHod };
    set('Z.montazAtypHod', -100); set('Z.projekceZakladHod', -5);
    const po = { atyp: Z.montazAtypHod, zakl: Z.projekceZakladHod };
    set('Z.montazAtypHod', 7); const kladne = Z.montazAtypHod;
    const i = PJ.sekce.findIndex(x => (x.polozky || []).some(q => q.typ === 'hod'));
    const j = PJ.sekce[i].polozky.findIndex(q => q.typ === 'hod');
    const pH = PJ.sekce[i].polozky[j].hodiny, pR = PJ.sekce[i].polozky[j].rezerva;
    pjSet(i, 'polozky.' + j + '.hodiny', -8); pjSet(i, 'polozky.' + j + '.rezerva', -34);
    const pjPo = { h: PJ.sekce[i].polozky[j].hodiny, r: PJ.sekce[i].polozky[j].rezerva };
    set('Z.montazAtypHod', pred.atyp);
    const minAttr = !!document.querySelector('input[onchange*="Z.montazAtypHod"][min="0"]');
    return { pred, po, kladne, pH, pR, pjPo, texty, minAttr };
  } finally { window.hlaska = puvH; }
});
zkus('N56: záporné ATYP hodiny montáže ani základ projekce se neuloží', hod.po.atyp === hod.pred.atyp && hod.po.zakl === hod.pred.zakl, JSON.stringify(hod));
zkus('N56: kladné hodiny projdou', hod.kladne === 7, JSON.stringify(hod));
zkus('N56: záporné hodiny ani rezerva položky PROJ se neuloží', hod.pjPo.h === hod.pH && hod.pjPo.r === hod.pR, JSON.stringify(hod));
zkus('N56: uživatel dostane hlášku, proč', hod.texty.length === 4 && hod.texty.every(t => /nemohou být záporné/.test(t)), JSON.stringify(hod.texty));
zkus('N56: pole hodin má min="0"', hod.minAttr);

/* N58, N58b (zadání J. V. 24. 9. 2026): Zadání šachty — světlík nad dveřmi
 * je rolovací menu mezi počtem sloupků a světlíky na bocích, můstek ve
 * 4. sloupci na jeho dřívějším místě; výplň boků se ukáže s boky. */
const n58 = await p.evaluate(() => {
  prepniTab('kalk'); render();
  const lbl = t => [...document.querySelectorAll('#inputs .row > label')].find(l => l.textContent.trim() === t);
  const sloupec = t => { const l = lbl(t); return l ? l.parentElement.parentElement : null; };
  const poradi = (kontejner, t) => kontejner ? [...kontejner.querySelectorAll(':scope > .row > label')].map(l => l.textContent.trim()).indexOf(t) : -1;
  const s2 = sloupec('Počet nástupišť'), s3 = sloupec('Typ portálů'), s4 = sloupec('Čistý vstup – šířka');
  const nad = lbl('Světlík nad šachetními dveřmi');
  const sel = nad && nad.parentElement.querySelector('select');
  const volby = sel ? [...sel.options].map(o => o.textContent.trim()) : [];
  const out = {
    stejnySloupec: !!s3 && sloupec('Světlík nad šachetními dveřmi') === s3 && sloupec('Světlíky na bocích dveří') === s3,
    poradi3: [poradi(s3, 'Typ portálů'), poradi(s3, 'Světlík nad šachetními dveřmi'), poradi(s3, 'Světlíky na bocích dveří')],
    /* 25. 9. 2026: nástupiště → sloupky → stříška ve 2. sloupci, typ portálů
     * za opláštěním ve 3., přechodové plechy za čistým vstupem ve 4. */
    poradi2: [poradi(s2, 'Vnitřní hloubka'), poradi(s2, 'Počet nástupišť'), poradi(s2, 'Počet sloupků'), poradi(s2, 'Stříška nad nástupiště')],
    poradi3b: [poradi(s3, 'Opláštění'), poradi(s3, 'Typ portálů')],
    mustekV4: !!s4 && sloupec('Můstek mezi budovou a OCK') === s4,
    poradi4: [poradi(s4, 'Čistý vstup – šířka'), poradi(s4, 'Přechodové plechy'), poradi(s4, 'Můstek mezi budovou a OCK'), poradi(s4, 'ATYP (nestandardní zakázka)')],
    zadneZaskrtavatko: !document.querySelector('#inputs input[type=checkbox][onchange*="svetlikNadDvermi"]'),
    volby, vybrano: sel ? sel.value : '',
  };
  nadDvermiSet('stavba');
  out.poStavba = { nad: Z.nadDvermi, stary: Z.svetlikNadDvermi };
  nadDvermiSet('sklo');
  out.poSklo = { nad: Z.nadDvermi, stary: Z.svetlikNadDvermi };
  out.bokyPred = !!lbl('Výplň boků dveří');
  set('Z.svetlikyBoky', 2); render();
  out.bokyPo = !!lbl('Výplň boků dveří');
  set('Z.svetlikyBoky', 0); nadDvermiSet('plech'); render();
  return out;
});
zkus('25. 9.: 2. sloupec hloubka → počet nástupišť → počet sloupků → stříška',
  n58.poradi2.every((x, i, a) => x >= 0 && (i === 0 || a[i - 1] + 1 === x)), JSON.stringify(n58.poradi2));
zkus('25. 9.: typ portálů je ve 3. sloupci hned za opláštěním',
  n58.poradi3b[0] >= 0 && n58.poradi3b[1] === n58.poradi3b[0] + 1, JSON.stringify(n58.poradi3b));
zkus('N58: světlík nad dveřmi je ve 3. sloupci mezi typem portálů a světlíky na bocích',
  n58.stejnySloupec && n58.poradi3[0] >= 0 && n58.poradi3[0] < n58.poradi3[1] && n58.poradi3[1] < n58.poradi3[2], JSON.stringify(n58));
zkus('4. sloupec: čistý vstup → přechodové plechy → můstek → ATYP',
  n58.mustekV4 && n58.poradi4.every((x, i, a) => x >= 0 && (i === 0 || a[i - 1] < x)), JSON.stringify(n58.poradi4));
zkus('N58: menu nabízí bez / sklo / plech / materiál opláštění / zajistí stavba',
  n58.volby.join('|') === 'bez|sklo|plech|materiál opláštění|zajistí stavba', n58.volby.join('|'));
zkus('N58: staré zaškrtávátko zmizelo', n58.zadneZaskrtavatko);
zkus('N58: volba se uloží a staré pole drží v souladu (stavba → ne, sklo → ano)',
  n58.poStavba.nad === 'stavba' && n58.poStavba.stary === false && n58.poSklo.nad === 'sklo' && n58.poSklo.stary === true, JSON.stringify(n58));
zkus('N58b: výplň boků se ukáže až s boky', !n58.bokyPred && n58.bokyPo, JSON.stringify(n58));

zkus('za celý průchod nevznikla chyba v konzoli', konzole.length === 0, konzole.slice(0, 2).join(' | '));
await b.close();
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
