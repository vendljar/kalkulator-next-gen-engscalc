/* Test escapovacích pomocníků esc() a escJs() (#6).
 *
 * Obě funkce žijí v ui/common.js, které se nedá načíst přes require() – je to
 * kód rozhraní pracující s globálním stavem. Test si proto z toho souboru
 * vytáhne jen deklarace obou konstant a vyhodnotí je. Kdyby je někdo do
 * budoucna přepsal na `function esc(...)`, test spadne s jasnou hláškou –
 * a to je v pořádku, protože pak je potřeba znovu promyslet i tenhle test.
 *
 * Proč to vůbec testujeme: celé UI se skládá do řetězce a přiřazuje přes
 * innerHTML. Názvy položek, poznámky a popisky přitom píše uživatel nebo
 * přicházejí z importu. Apostrof v názvu položky („Kotva 'M8'") dřív rozbil
 * argument v onclick handleru; ostrá závorka rozbila rozvržení stránky.
 */
const fs = require('fs');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info || ''); } };

/* Konce řádků se srovnají hned při čtení (B46) — viz komentář u `vytahni`. */
const src = fs.readFileSync(__dirname + '/ui/common.js', 'utf8').replace(/\r\n/g, '\n');
/* KONEC DEKLARACE SE HLEDÁ BEZ OHLEDU NA KONCE ŘÁDKŮ (nález B46, 14. 9. 2026).
 *
 * Do 14. 9. se hledalo doslova `';\n'`. V souboru s CRLF tam ale žádné `;\n`
 * není — je tam `;\r\n` —, takže `indexOf` vrátil −1, `slice` uřízl celý
 * zbytek souboru a `eval` spadl na TDZ ještě před prvním testem. Na Windows
 * s `core.autocrlf=true` to potkalo každého, kdo pustil sady lokálně:
 * hlídač escapování mlčel a nikdo nevěděl, že neběží.
 *
 * Konce řádků se proto normalizují hned při čtení a hledá se `/;\r?\n/`
 * — dvě pojistky nad jednou věcí, protože tahle sada je poslední, co stojí
 * mezi neescapovanou interpolací a produkcí. */
const vytahni = jm => {
  const i = src.indexOf('const ' + jm + ' =');
  if (i < 0) throw new Error('v ui/common.js chybí deklarace `const ' + jm + ' =` (#6)');
  const zbytek = src.slice(i);
  const m = zbytek.match(/;\r?\n/);
  if (!m) throw new Error('v ui/common.js nejde najít konec deklarace `const ' + jm + ' =` (B46)');
  return zbytek.slice(0, m.index + 1);
};
const esc = eval(vytahni('esc') + 'esc');            // eslint-disable-line no-eval
const escJs = eval(vytahni('esc') + vytahni('escJs') + 'escJs');   // eslint-disable-line no-eval

/* ---- dlgEsc(): důkaz k allowlistu (14. 9. 2026) ----
 * dlgEsc je v OBALY, takže hlídač hodnotu v něm zabalenou pustí. Ověřuje se
 * proto obojí: že escapuje přes esc(), i že escapuje ve větvi BEZ esc() —
 * tu si sada vytáhne zvlášť, protože přesně v ní dřív text procházel syrový. */
{
  const zdrojDlg = fs.readFileSync(__dirname + '/ui/dialog.js', 'utf8');
  const kus = zdrojDlg.match(/function dlgEsc\(t\)[\s\S]*?\n\}/);
  test('dlgEsc se v ui/dialog.js našla', !!kus);
  if (kus) {
    const sEsc = eval('(function(){ ' + vytahni('esc') + kus[0] + ' return dlgEsc; })()');   // eslint-disable-line no-eval
    const bezEsc = eval('(function(){ ' + kus[0] + ' return dlgEsc; })()');                  // eslint-disable-line no-eval
    const utok = '<img src=x onerror=alert(1)>';
    test('dlgEsc escapuje ostrou závorku', !/[<>]/.test(sEsc(utok)), sEsc(utok));
    test('dlgEsc escapuje uvozovku i apostrof', !/["']/.test(sEsc('a"b\'c')), sEsc('a"b\'c'));
    test('dlgEsc escapuje i BEZ esc() — záložní větev není díra',
      !/[<>]/.test(bezEsc(utok)) && !/["']/.test(bezEsc('a"b\'c')), [bezEsc(utok), bezEsc('a"b\'c')]);
    test('dlgEsc zvládne null i undefined', sEsc(null) === '' && bezEsc(undefined) === '');
  }
}

/* ---- funkce, které skládají HTML z argumentu, musí escapovat samy ----
 * (nález B45, 14. 9. 2026)
 *
 * `dvKrok(nadpis, …)` vkládala nadpis do `<h3>` syrový. Volání z detailu OCK
 * předávají literály, takže to vypadalo neškodně — jenže detail PROJ skládá
 * nadpis z názvu sekce, který si pojmenuje obchodník a server ho nekontroluje.
 * Uložil zakázku se sekcí `<img src=x onerror=…>` a administrátorovi běžel
 * skript pod jeho relací, jakmile otevřel Detail výpočtu PROJ.
 *
 * Statický hlídač níž tohle nechytí: v `detail_proj_ui.js` je to `s.nazev`
 * předaný jako ARGUMENT, ne interpolace do HTML. Proto tenhle seznam —
 * funkce, o kterých víme, že si HTML skládají samy, se zavolají s `<b>`
 * a musí vrátit escapovanou podobu. */
{
  const HTML_Z_ARGUMENTU = [
    { soubor: 'detail_ui.js', fn: 'dvKrok', argy: ['<b>x</b>', '', 'id'], kde: 'nadpis kroku' },
  ];
  HTML_Z_ARGUMENTU.forEach(z => {
    const zdroj = fs.readFileSync(__dirname + '/ui/' + z.soubor, 'utf8').replace(/\r\n/g, '\n');
    const kus = zdroj.match(new RegExp('function ' + z.fn + '\\([\\s\\S]*?\\n\\}'));
    test(`${z.fn} se v ui/${z.soubor} našla`, !!kus);
    if (!kus) return;
    const fn = new Function('esc', kus[0] + '\nreturn ' + z.fn + ';')(esc);
    const html = fn.apply(null, z.argy);
    test(`${z.fn} escapuje ${z.kde}`, html.indexOf('<b>') < 0 && html.indexOf('&lt;b&gt;') >= 0, html.slice(0, 160));
  });
}

/* ---- esc(): text a obsah atributů ---- */
test('esc escapuje <', esc('<script>') === '&lt;script&gt;', esc('<script>'));
test('esc escapuje uvozovku', esc('a"b') === 'a&quot;b', esc('a"b'));
test('esc escapuje apostrof', esc("a'b") === 'a&#39;b', esc("a'b"));
test('esc escapuje ampersand jako první', esc('&lt;') === '&amp;lt;', esc('&lt;'));
test('esc zvládne null i undefined', esc(null) === '' && esc(undefined) === '');
test('esc nechá českou diakritiku být', esc('Příčník žebřík') === 'Příčník žebřík');
test('esc nechá číslo být', esc(12.5) === '12.5');

/* ---- escJs(): argument v onclick="fn('…')" ----
 * Prohlížeč nejdřív rozkóduje HTML entity a teprve výsledek čte jako JavaScript.
 * Simulujeme to: dekódujeme entity a podíváme se, co uvidí JS parser. */
const dekoduj = s => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const vyzkousej = vstup => {
  const vJs = dekoduj(escJs(vstup));         // co uvidí JavaScript po dekódování entit
  return eval("'" + vJs + "'");              // eslint-disable-line no-eval
};

test('escJs přežije apostrof v názvu', vyzkousej("Kotva 'M8'") === "Kotva 'M8'", escJs("Kotva 'M8'"));
test('escJs přežije zpětné lomítko', vyzkousej('C:\\temp') === 'C:\\temp', escJs('C:\\temp'));
test('escJs přežije uvozovky', vyzkousej('Profil "40x40"') === 'Profil "40x40"');
test('escJs přežije ostrou závorku', vyzkousej('<b>tučně</b>') === '<b>tučně</b>');
test('escJs nezanechá holý apostrof v HTML', !/[^\\&]'/.test(escJs("a'b")), escJs("a'b"));
test('escJs escapuje i pro HTML', escJs('<x>').indexOf('<') === -1, escJs('<x>'));

/* ---- kontrola, že se ve zdrojích neobjeví holá entita &#39; jako „ochrana" ----
 * Právě tenhle vzorec byl původní chybou (keyAttr v kalk_ock.js): entita se
 * rozkóduje dřív, než se obsah atributu předá JavaScriptu, takže neochrání nic. */
const kalk = fs.readFileSync(__dirname + '/ui/kalk_ock.js', 'utf8');
test('keyAttr už nespoléhá na entitu &#39;', !/replace\(\/'\/g, *'&#39;'\)/.test(kalk));

/* ---- dva útočné vzorky, na kterých se poznávají obě chyby najednou ----
 * Vzorky jsou schválně realistické. „Novák & syn "OK" <s.r.o.>" je jméno,
 * které nám do políčka objednatele opravdu může někdo napsat; obsahuje
 * ampersand, uvozovky i ostré závorky, tedy všechno, co rozbíjí HTML.
 * Druhý vzorek je klasický pokus o vložení skriptu — kdyby se do stránky
 * dostal neescapovaný, prohlížeč by ho spustil. */
const VZORKY = ['<img src=x onerror=alert(1)>', 'Novák & syn "OK" <s.r.o.>'];
for (const v of VZORKY) {
  const e = esc(v);
  test('esc: „' + v + '" nezanechá ostrou závorku', !/[<>]/.test(e), e);
  test('esc: „' + v + '" nezanechá uvozovku ani apostrof', !/["']/.test(e), e);
  /* Kontrola, že se text nepoškodil: po zpětném dekódování musí být stejný. */
  test('esc: „' + v + '" jde beze ztráty dekódovat zpět', dekoduj(e) === v, dekoduj(e));
  /* A totéž pro argument v onclick: po dekódování entit to musí být JS řetězec
   * s původním obsahem, ne kus kódu navíc. */
  test('escJs: „' + v + '" přežije cestu do onclick', vyzkousej(v) === v, escJs(v));
}

/* ================================================================
 * HLÍDAČ ZDROJŮ — aby se neescapovaný text nedostal do UI příště
 * ================================================================
 * Bezpečnostní úklid z 5. 8. 2026 prošel všech 30 souborů src/ui/ a nenašel
 * jedinou díru: každá interpolace, která nese text od uživatele, už tehdy
 * procházela esc(), escJs() nebo keyAttr(). Jenže revize je jednorázová věc
 * a soubory rostou dál. Proto ten nález zůstává zapsaný tady jako test:
 * projde se zdroj, vytáhnou se všechny interpolace ${…} na řádcích, které
 * skládají HTML, a ty, které vypadají na uživatelský text bez escapování,
 * se porovnají se seznamem míst prověřených při té revizi.
 *
 * Když někdo napíše nové `${zakaznik}` bez esc(), sada spadne a v hlášce
 * uvidí, kde. Má pak dvě možnosti: buď to obalí esc()/escJs() (skoro vždy
 * správně), nebo — pokud jde prokazatelně o vývojářský literál či hotový
 * kus HTML — si to místo přidá do PROVERENO níž i s důvodem. To druhé má
 * být vědomé rozhodnutí, ne omylem přehlédnutý řádek.
 *
 * Klíčem je soubor + text výrazu (ne číslo řádku — to se posouvá při každé
 * úpravě a seznam by za týden neseděl). */

/* Jména, která napovídají, že hodnota přichází od uživatele nebo z importu. */
/* `id` a `kid` přibyly 9. 9. 2026 (B26): identifikátory variant, poznámek,
 * příloh i trvalých položek ceníku cestují v uložené zakázce, tedy od
 * kohokoli, a v obrazovce jdou přímo do onclick. */
const RIZIKO = /\b(nazev|jmeno|popis|pozn|poznamka|text|email|kdo|firma|objednatel|stavba|adresa|ico|dic|mesto|ulice|psc|soubor|hlaska|chyba|zprava|cislo|klic|key|label|titul|kontakt|telefon|web|banka|ucet|zakaznik|vzkaz|duvod|misto|projekt|varianta|verze|puvod|orig|autor|uzivatel|role|znacka|typ|kod|sekce|polozka|item|id|kid)\b/i;
/* Funkce, po kterých je hodnota prokazatelně bezpečná. */
/* `dlgEsc` přibylo 14. 9. 2026: je to escapovací funkce modálů v ui/dialog.js
 * a od téhož dne escapuje i ve větvi bez `esc()` (dřív text vracela syrový,
 * což byl v allowlistu slib, který se nedal vymáhat). Že opravdu escapuje,
 * ověřuje sonda hned pod tímhle seznamem — do allowlistu se funkce nepřidává
 * na slovo, ale na důkaz. */
const OBALY = /^(esc|escJs|keyAttr|dlgEsc|num|fmt|fmt0|fmtKc|T|tsPrelozText|zapisTridaHlasky|JSON\.stringify|encodeURIComponent|e2|xmlEsc)$/;
const KONSTANTA = /^('[^'\\$]*'|"[^"\\$]*"|`[^`\\$]*`|[-+]?[0-9.]+|true|false|null|undefined)$/;

/* Vytáhne z řádku obsahy ${…}. Nestačí regulární výraz `\$\{[^}]*\}` —
 * uvnitř bývají objekty i vnořené šablony, takže se závorky musí počítat
 * a řetězce přeskakovat. */
function vyrazy(r) {
  const ven = [];
  for (let i = 0; i < r.length - 1; i++) {
    if (r[i] !== '$' || r[i + 1] !== '{') continue;
    let d = 1, j = i + 2, q = null;
    while (j < r.length && d > 0) {
      const c = r[j];
      if (q) { if (c === '\\') j++; else if (c === q) q = null; }
      else if (c === '"' || c === "'" || c === '`') q = c;
      else if (c === '{') d++;
      else if (c === '}') d--;
      j++;
    }
    if (d === 0) { ven.push(r.slice(i + 2, j - 1)); i = j - 2; }
  }
  return ven;
}
/* Vnořená šablona uvnitř výrazu se posuzuje po částech: rozhoduje to,
 * co se doopravdy tiskne, ne obal kolem. */
function listy(v, ven) {
  if (v.indexOf('`') >= 0) { for (const w of vyrazy(v)) listy(w, ven); return; }
  ven.push(v);
}
/* Projde výraz a ohlásí jen znaky mimo řetězce a mimo závorky —
 * kvůli hledání ternárního operátoru a spojování na nejvyšší úrovni. */
function mimo(v, cb) {
  let d = 0, q = null;
  for (let i = 0; i < v.length; i++) {
    const c = v[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if ('([{'.indexOf(c) >= 0) { d++; continue; }
    if (')]}'.indexOf(c) >= 0) { d--; continue; }
    if (d === 0) cb(i, c);
  }
}
/* Podmínka ternáru nás nezajímá — do stránky se tiskne jen jedna z větví. */
function ternar(v) {
  let iq = -1, ic = -1, hloubka = 0;
  mimo(v, (i, c) => {
    if (c === '?' && v[i + 1] !== '.' && v[i + 1] !== '?' && v[i - 1] !== '?') {
      if (iq < 0) iq = i; else hloubka++;
    } else if (c === ':' && iq >= 0 && ic < 0) {
      if (hloubka > 0) hloubka--; else ic = i;
    }
  });
  return (iq >= 0 && ic > iq) ? [v.slice(iq + 1, ic), v.slice(ic + 1)] : null;
}
function rozdel(v) {
  const rez = [];
  mimo(v, (i, c) => {
    if (c === '+' && v[i - 1] !== '+' && v[i + 1] !== '+') rez.push(i);
    else if (c === '|' && v[i + 1] === '|') rez.push(i);
  });
  if (!rez.length) return null;
  const casti = []; let z = 0;
  for (const i of rez) { casti.push(v.slice(z, i)); z = i + (v[i] === '|' ? 2 : 1); }
  casti.push(v.slice(z));
  return casti;
}
function celeVolani(v) {
  const m = v.match(/^([A-Za-z_$][\w$.]*)\s*\(/);
  return (m && v.endsWith(')')) ? m[1] : null;
}
/* Bezpečné je to, co se prokazatelně nedá naplnit textem od uživatele:
 * konstanta, číselné převedení, volání escapovací funkce — a dál rekurzivně
 * větve ternáru a jednotlivé sčítance skládaného řetězce. */
function hodnotaBezpecna(v) {
  const t = v.trim();
  if (!t) return true;
  if (KONSTANTA.test(t)) return true;
  if (/^[+-]\s*[A-Za-z_$(]/.test(t)) return true;
  const fn = celeVolani(t);
  if (fn && OBALY.test(fn)) return true;
  const tt = ternar(t);
  if (tt) return hodnotaBezpecna(tt[0]) && hodnotaBezpecna(tt[1]);
  const casti = rozdel(t);
  if (casti && casti.length > 1) return casti.every(hodnotaBezpecna);
  if (/^\(.*\)$/.test(t)) return hodnotaBezpecna(t.slice(1, -1));
  return false;
}

/* Místa prověřená ručně 5. 8. 2026. U každého je napsáno, PROČ je v pořádku —
 * kdyby se okolní kód změnil, důvod musí platit dál, jinak řádek ze seznamu
 * patří pryč. Nový záznam sem přidávejte jen po skutečné kontrole zdroje. */
const PROVERENO = {
  'common.js': {
    'label': 'popisek pole ve formulářové šabloně txt(path, label) – volá se s literály',
    'id': 'id karty / sekce / kotvy (card(), sekce(), detailKotvy) – literály z kódu, ne data',
  },
  /* `detail_ui.js` ze seznamu 14. 9. 2026 zmizel: `dvKrok()` od té chvíle
   * escapuje nadpis i id sama (nález B45), takže obě hodnoty projdou přes
   * `esc()` a k prověřování se nedostanou. Zdůvodnění „z pevného seznamu
   * DETAIL_KROKY" navíc přestalo platit v okamžiku, kdy detail PROJ začal
   * do dvKrok posílat název sekce z dat varianty — a přesně tím se nález
   * B45 stal zneužitelným. Že dvKrok escapuje, dokazuje sonda nahoře. */
  /* `dialog.js` ze seznamu 14. 9. 2026 zmizel celý: `dlgEsc` je od té chvíle
   * v OBALY, takže se hodnoty v něm zabalené k prověřování vůbec nedostanou.
   * Záznam v PROVERENO by na ně čekal marně a hlídač zastaralých záznamů by
   * ho (správně) hlásil. Že dlgEsc escapuje, dokazuje sonda nahoře. */
  'cenik_ui.js': {
    'label': 'popisek pole pro zahraniční procentní hodnotu (cenikZahrPctPole). '
      + 'Je to HOTOVÉ HTML — obsahuje `&nbsp;`, takže by ho esc() rozbilo na '
      + 'viditelné „&amp;nbsp;“. Obě volání ho předávají literálem z kódu '
      + '(přirážka a sazba DPH); z dat ani od uživatele sem nic nevstupuje. '
      + 'Ostatní texty té funkce (title, reset) přes esc() prochází.',
    'cenikPopisyKandidati(r.klic, admin)': 'hotové HTML kandidátů z uložených zakázek '
      + '(číselník dodatkových textů, 25. 9. 2026) — číslo zakázky, počet i text jdou uvnitř '
      + 'přes esc(), klíč do onclick přes keyAttr(), index přes escJs().',
  },
  'kalk_ock.js': {
    'col.admin ? pripNazev(x) : esc(x.nazev) + vypnutoHtml(x)':
      'obě větve escapují – pripNazev skládá HTML přes esc() uvnitř; vypnutoHtml je hotové HTML štítku (text je literál, popis přes esc())',
    'label': 'popisek řádku / KPI psaný vývojářem (profRow, sumRadek, kpiLine)',
    'popis': 'text tlačítka „+ …" předaný literálem do radekPridat()',
    'klic': 'hotový úsek HTML z klicChip() – cestu i titulek escapuje esc() uvnitř',
    'pozn': 'hotový úsek HTML `<span class="note">(${esc(r.pozn)})</span>`',
  },
  'kalk_proj.js': {
    'label': 'popisek KPI psaný vývojářem',
    'nazev': 'hotový úsek HTML – jméno položky je uvnitř escapované esc(p.nazev)',
  },
  'kryci_ui.js': {
    'label': 'popisek pole z konstanty KRYCI_SEKCE',
    'p.label': 'popisek pole z konstanty KRYCI_SEKCE',
    's.sekce': 'název sekce z konstanty KRYCI_SEKCE',
    "tiskListaHtml({ pozn: 'Verze ' + d.verzeNazev + ' — uložte jako samostatný soubor (' + d.nazevSouboru + '.pdf).' })":
      'tiskListaHtml vypisuje pozn přes esc(); nazevSouboru je navíc očištěn už v kryci.js',
    'znacka(p.verze)': 'znacka() vrací tři pevné HTML štítky (BO / Tech / BO+Tech)',
  },
  'kryci_proj_ui.js': {
    'label': 'popisek pole z konstanty KRYCI_SEKCE (zrcadlo kryci_ui.js)',
    'p.label': 'popisek pole z konstanty KRYCI_SEKCE',
    's.sekce': 'název sekce z konstanty KRYCI_SEKCE',
    "tiskListaHtml({ pozn: 'Verze ' + d.verzeNazev + ' — uložte jako samostatný soubor (' + d.nazevSouboru + '.pdf).' })":
      'tiskListaHtml vypisuje pozn přes esc(); nazevSouboru je očištěn v kryci_proj.js',
    'znacka(p.verze)': 'znacka() vrací tři pevné HTML štítky',
  },
  'nastaveni_ui.js': {
    "d.jenVApp.slice(0, 40).map(x => esc(x.klic)).join(' · ')": 'každý klíč prochází esc() uvnitř map()',
    'label': 'popisek řádku šablony psaný vývojářem',
    "m ? 'hotovo: ' + esc(m.nazev) + ' – kliknutím přegeneruji' : 'vyrobit ' + l.toUpperCase() + ' mutaci z české šablony'":
      'jméno souboru mutace prochází esc(), zbytek jsou literály',
    'popis': 'popisný text bloku nastavení psaný vývojářem',
    'pozn': 'poznámka k řádku šablony psaná vývojářem',
    "pole.filter(p => !(skryt && p.id !== 'korShodna')).map(poleHtml).join('')":
      'hotové HTML řádků formuláře z poleHtml() – každá hodnota uvnitř prochází esc()/escJs()',
    'sekce': 'hotový úsek HTML poskládaný výš (uvnitř už escapovaný)',
    'typ': "klíč šablony ('CN', 'OVP' …) z pevného výčtu",
  },
  'online_ui.js': {
    'hlaska': 'hotový úsek HTML `<div class="…">${esc(ONLINE_STAV.hlaska)}</div>`',
  },
  'poznamky_ui.js': {
    'id': "vývojářský literál: id textového pole se skládá jako "
      + "'poznText-' + (kde === 'proj' ? 'proj' : 'ock'), tedy ze dvou pevných "
      + 'řetězců — z venku do něj nic nevstupuje',
  },
  'program_ui.js': {
    'z.verze': 'pořadové číslo verze ceníku – číslo, ne text',
  },
  'protokol_ui.js': {
    'kdo': "výš: const kdo = z.kdo ? esc(z.kdo) : 'neuvedeno'",
  },
  'schvalovani_ui.js': {
    'duvod': 'hotový úsek HTML poskládaný o pár řádků výš – hodnota v něm '
      + 'prochází esc(SCHV_DUVODY[z.id]) a id přes escJs()',
  },
  'zakazka_ui.js': {
    'nazev': 'popisek pole v náhledu nabídky – pole() se volá s literály',
  },
};

/* ================================================================
 * HLÍDAČ ARGUMENTŮ V ATRIBUTECH UDÁLOSTÍ (bezpečnostní audit 9. 9. 2026, B26)
 * ================================================================
 * Předchozí hlídač bere esc() jako bezpečné všude — a v textu i v běžném
 * atributu to platí. V onclick="fn('${…}')" ale NE: prohlížeč nejdřív
 * dekóduje HTML entity (z &#39; je zase apostrof) a teprve pak parsuje
 * JavaScript, takže esc() tam nechrání vůbec. Přesně tak prošel kid trvalé
 * položky ceníku (cenik_ui.js) do onclick administrátorova tlačítka ✕.
 *
 * Tenhle hlídač proto projde jen atributy on*="…" a v nich připustí pouze
 * escJs()/keyAttr(), čísla, konstanty a jejich skládání. esc() se tu počítá
 * jako NEobalené. Bez seznamu výjimek: kdo potřebuje do onclick hodnotu
 * z dat, obalí ji escJs — je to o šest znaků víc. */
const OBALY_JS = /^(escJs|keyAttr|num|fmt|fmt0|JSON\.stringify|encodeURIComponent)$/;
function hodnotaBezpecnaJs(v) {
  const t = v.trim();
  if (!t) return true;
  if (KONSTANTA.test(t)) return true;
  if (/^[+-]\s*[A-Za-z_$(]/.test(t)) return true;
  if (/^this\b/.test(t)) return true;
  const fn = celeVolani(t);
  if (fn && OBALY_JS.test(fn)) return true;
  const tt = ternar(t);
  if (tt) return hodnotaBezpecnaJs(tt[0]) && hodnotaBezpecnaJs(tt[1]);
  const casti = rozdel(t);
  if (casti && casti.length > 1) return casti.every(hodnotaBezpecnaJs);
  if (/^\(.*\)$/.test(t)) return hodnotaBezpecnaJs(t.slice(1, -1));
  return false;
}
const UDALOST = /\bon[a-z]+="([^"]*)"/g;
const vJs = [];
const uiDir = __dirname + '/ui';
for (const f of fs.readdirSync(uiDir).sort()) {
  if (!f.endsWith('.js')) continue;
  fs.readFileSync(uiDir + '/' + f, 'utf8').split('\n').forEach((r, i) => {
    let m;
    UDALOST.lastIndex = 0;
    while ((m = UDALOST.exec(r))) {
      const ven = [];
      for (const v of vyrazy(m[1])) listy(v, ven);
      for (const v of ven) {
        if (hodnotaBezpecnaJs(v)) continue;
        /* Hlásí se hodnoty, které vypadají na data (RIZIKO), a KAŽDÉ esc() —
         * to je v onclick vždycky chyba, ať se hodnota jmenuje jakkoli. */
        if (!RIZIKO.test(v) && !/\besc\(/.test(v)) continue;
        vJs.push(f + ':' + (i + 1) + '  ${' + v.replace(/\s+/g, ' ').trim() + '}');
      }
    }
  });
}
test('v atributech on*="…" chrání jen escJs()/keyAttr(), ne esc()', vJs.length === 0,
  '\n      nalezeno ' + vJs.length + ':\n      ' + vJs.join('\n      ')
  + '\n      → argument uvnitř onclick="fn(\'…\')" obalte escJs() (esc() tam'
  + '\n        nechrání: prohlížeč entity dekóduje před parsováním JS)');

/* Sonda hlídače na sobě samém: kdyby se rozbil, nesmí mlčet. */
test('hlídač on* pozná esc() i holou hodnotu z dat a připustí escJs()',
  !hodnotaBezpecnaJs("esc(p.kid)") && !hodnotaBezpecnaJs("p.kid")
  && hodnotaBezpecnaJs("escJs(p.kid)") && hodnotaBezpecnaJs("'literal'")
  && hodnotaBezpecnaJs("+r.idx") && hodnotaBezpecnaJs("i") === false);

const nove = [];
const nepouzite = [];
for (const f of fs.readdirSync(uiDir).sort()) {
  if (!f.endsWith('.js')) continue;
  const videno = new Set();
  fs.readFileSync(uiDir + '/' + f, 'utf8').split('\n').forEach((r, i) => {
    /* Řádek musí vypadat, že skládá HTML – jinak jde o běžný kód. */
    if (!/[<>]|innerHTML|title=|value=|placeholder=/.test(r)) return;
    const ven = [];
    for (const v of vyrazy(r)) listy(v, ven);
    for (const v of ven) {
      if (hodnotaBezpecna(v) || !RIZIKO.test(v)) continue;
      const norm = v.replace(/\s+/g, ' ').trim();
      videno.add(norm);
      if (!(PROVERENO[f] && Object.prototype.hasOwnProperty.call(PROVERENO[f], norm)))
        nove.push(f + ':' + (i + 1) + '  ${' + norm + '}');
    }
  });
  for (const k of Object.keys(PROVERENO[f] || {}))
    if (!videno.has(k)) nepouzite.push(f + '  ${' + k + '}');
}

test('žádná nová neescapovaná interpolace v src/ui/', nove.length === 0,
  '\n      nalezeno ' + nove.length + ':\n      ' + nove.join('\n      ')
  + '\n      → obalte hodnotu esc() (text a atributy) nebo escJs()/keyAttr()'
  + '\n        (argument uvnitř onclick="fn(\'…\')"); pokud jde prokazatelně'
  + '\n        o vývojářský literál nebo hotové HTML, dopište místo do'
  + '\n        seznamu PROVERENO v src/test_escape.js i s důvodem.');

/* Opačný směr: záznam, který už v kódu není, se má ze seznamu smazat.
 * Jinak seznam zestárne a při dalším úklidu se mu nedá věřit. */
test('seznam PROVERENO neobsahuje zastaralé záznamy', nepouzite.length === 0,
  '\n      už se v kódu nevyskytují:\n      ' + nepouzite.join('\n      ')
  + '\n      → smažte je ze seznamu PROVERENO v src/test_escape.js');

/* ================================================================
 * HLÍDAČ ČLENSKÝCH VÝRAZŮ — BEZ OHLEDU NA JMÉNO (A2, 25. 9. 2026, nález B87)
 * ================================================================
 * Hlídač výš pozná hodnotu od uživatele podle JMÉNA (RIZIKO). Hloubkový test
 * 24. 9. 2026 (B69) ukázal, že to nestačí: `${Z.typPortalu}`, `${C.dph}` ani
 * `${p.hodiny}` na žádné jméno ze seznamu nevypadají, a přesto je to text ze
 * zakázky — server číselná pole nepřetypovává, takže uložená zakázka v nich
 * nese cokoli, a administrátorovi to běželo pod jeho relací.
 *
 * Tenhle hlídač proto nehledí na jméno, ale na TVAR: každý členský výraz
 * (`a.b`, `a[b]`, `a.b.c`) na řádku, který skládá HTML, je přístup do dat,
 * a bez esc()/escJs() se hlásí — ať se vlastnost jmenuje jakkoli. Bezpečné je
 * jen to, co je bezpečné z definice jazyka (`.length` je vždy číslo), nebo co
 * je v PROVERENO_CLENY ručně prověřené i s důvodem. Důvod má být takový, aby
 * se dal při další revizi ověřit ve zdroji („z konstanty X", „počet z Y").
 * Že hlídač B69 opravdu pozná, dokazuje sonda pod ním; že v prohlížeči
 * skutečně nic neběží, dokazuje overit_xss.mjs — tohle je jeho statický
 * protějšek, který běží v každé sadě a bez Chromia. */
const CLEN = /^[A-Za-z_$][\w$]*(\s*(\.[A-Za-z_$][\w$]*|\[[^\]]+\]|\?\.[A-Za-z_$][\w$]*))+$/;
/* Řádek skládá HTML: začátek značky, přiřazení innerHTML nebo atribut. Je to
 * přísnější než u hlídače jmen (tam stačí ostrá závorka): `>` má i porovnání
 * `Z.svetlikyBoky > 0` na řádku, který jen skládá text pro esc() o kus dál. */
const HTML_RADEK = /<[a-zA-Z\/!]|innerHTML|title=|value=|placeholder=|class=|href=|src=/;
const clenBezpecny = t => /\.length$/.test(t);

/* Prověřeno 25. 9. 2026 při zavedení hlídače. U každého výrazu je napsáno,
 * odkud hodnota přichází — kdyby se zdroj změnil na data, řádek ze seznamu
 * patří pryč a hodnota do esc(). */
const PROVERENO_CLENY = {
  'analytika_ui.js': {
    'p.zakazky': 'počet ze serverové analytiky (/api/analytika sčítá záznamy) — číslo',
    'p.kalkulace': 'počet ze serverové analytiky — číslo',
    'p.tiskyWord': 'počet ze serverové analytiky — číslo',
    'p.tiskyNahled': 'počet ze serverové analytiky — číslo',
    'p.prihlaseni': 'počet ze serverové analytiky — číslo',
    'p.chyby': 'počet ze serverové analytiky — číslo',
    'p.dnu': 'počet dnů se záznamem (server: dvojice.length) — číslo',
    'c.zakazky': 'součet za období z týchž počtů — číslo',
    'c.kalkulace': 'součet za období — číslo',
    'c.tiskyWord': 'součet za období — číslo',
    'c.tiskyNahled': 'součet za období — číslo',
    'c.prihlaseni': 'součet za období — číslo',
    'c.chyby': 'součet za období — číslo',
  },
  'archiv_ui.js': { 's.pocet': 'počet kalkulací v souboru archivu (archivSouboryHtml) — číslo' },
  'cenik_stari_ui.js': {
    's.zdrazeni': 'počet zdražených položek z porovnání ceníků — číslo',
    's.zlevneni': 'počet zlevněných položek — číslo',
    's.textove': 'počet textových změn — číslo',
  },
  'common.js': {
    'opts.l': 'popisek pole inp(): všechna volání předávají literál z kódu; větev s klíčem skládá literál + klicChip(), který escapuje uvnitř',
    'o[0]': 'hodnota volby výběru inp({type:sel}) — literální seznamy v kódu a konstanta BOKY_VYPLN_POPISY',
    'o[1]': 'popisek volby výběru — tytéž literální seznamy',
    'tridy[v.stav]': 'CSS třída z pevné mapy `tridy` podle stavu kontroly standardu',
    'v.kontrol': 'počet kontrolovaných pravidel standardu (standardVyhodnot) — číslo',
    'c.fn': 'jméno funkce z konfigurace karty slevy v kódu (slevaKarta: literály slevaSet/slevaProjSet)',
    'c.zrus': 'volání z téže konfigurace karty slevy — literál v kódu',
    'x.akce': 'onclick z literálů v zapisSelhani() (nastdbUlozHned(), progZverejni())',
    'x.stahni': 'onclick z literálů v zapisSelhani() (nastdbStahni(), progStahni())',
  },
  'detail_ui.js': { 'kopie.innerHTML': 'kopie už vykresleného detailu (escapovaného při render) do tiskového okna' },
  'kalk_ock.js': { 'r.idx': 'pořadový index vlastní položky z forEach v kódu — číslo' },
  'kryci_proj_ui.js': {
    'opts.src': 'popis zdroje automatiky z konstanty KRYCI_SEKCE (src: literál)',
    'p.bind': 'cesta k poli z konstanty KRYCI_SEKCE (bind: literál)',
  },
  'kryci_ui.js': {
    'opts.src': 'popis zdroje automatiky z konstanty KRYCI_SEKCE (src: literál)',
    'p.bind': 'cesta k poli z konstanty KRYCI_SEKCE (bind: literál)',
  },
  'nastaveni_ui.js': {
    'n.pripona': 'přípona varianty z priponyKontrola (zamek.js: pripona = pořadí varianty) — číslo',
    'p.symbol': 'symbol šablony z konstanty FIRMA_POLE (symbol: literál)',
    's.vTabulce': 'počet řádků nahrané tabulky slovníku — číslo',
    's.vAplikaci': 'počet hesel aplikace — číslo',
    's.shodne': 'počet shodných překladů — číslo',
    's.doplnit': 'počet překladů k doplnění — číslo',
    's.nove': 'počet nových hesel — číslo',
  },
  'online_ui.js': {
    'b.nove': 'počet z náhledu obnovy (server sčítá) — číslo',
    'b.prepsane': 'počet z náhledu obnovy — číslo',
    'b.bezeZmeny': 'počet z náhledu obnovy — číslo',
    'b.preskocene': 'počet z náhledu obnovy — číslo',
    'z.odeslane': 'počet odeslaných variant v záznamu rejstříku (uloRejstrikZaznam: filter().length) — číslo',
    'z.variant': 'počet variant v záznamu rejstříku (varianty.length) — číslo',
  },
  'sablony_sprava_ui.js': {
    'b.cls': 'CSS třída z literálů v sablStav() (ok / warn / …)',
    'm.stat.procenta': 'procento přeložených odstavců — číslo',
  },
  'schvalovani_ui.js': { 'SCHV_CIZI.prohledano': 'počet prohledaných zakázek ze serveru — číslo' },
  'techspec_ui.js': {
    'j.vlajka': 'emoji vlajky z konstanty JAZYKY (preklad.js)',
    'pokr.prelozeno': 'počet přeložených frází (prekladPokryti) — číslo',
    'pokr.celkem': 'počet frází — číslo',
    'pokr.procenta': 'procento pokrytí — číslo',
    'k.pocet': 'počet nevyplněných povinných polí — číslo',
  },
  'uloziste_ui.js': {
    'z.odeslane': 'počet odeslaných variant v záznamu rejstříku — číslo',
    'z.variant': 'počet variant v záznamu rejstříku — číslo',
  },
  'zakazka_ui.js': {
    'POR_STAV_ZNAK[k]': 'znak stavu z konstanty POR_STAV_ZNAK',
    'POR_STAV_ZNAK[it.stav]': 'znak stavu z konstanty POR_STAV_ZNAK',
    'it.stav': 'stav položky porovnání z pevného výčtu (pridano/odebrano/zmeneno/shodne) — klíče konstanty POR_STAV_ZNAK',
    's.pocty[k]': 'počet položek ve stavu — číslo',
    's.pocty.shodne': 'počet shodných položek — číslo',
    'NABIDKA_FOTO_NAZVY[c]': 'název nabídky z konstanty NABIDKA_FOTO_NAZVY',
  },
  'zaokrouhleni_ui.js': {
    'k.krok': 'krok zaokrouhlení z konstanty ZAOKR_KROKY — číslo',
    's.smer': 'směr zaokrouhlení z konstanty ZAOKR_SMERY — literál',
  },
};

const noveCleny = [], nepouziteCleny = [];
for (const f of fs.readdirSync(uiDir).sort()) {
  if (!f.endsWith('.js')) continue;
  const videno = new Set();
  fs.readFileSync(uiDir + '/' + f, 'utf8').split('\n').forEach((r, i) => {
    if (!HTML_RADEK.test(r)) return;
    const ven = [];
    for (const v of vyrazy(r)) listy(v, ven);
    for (const v of ven) {
      if (hodnotaBezpecna(v)) continue;
      const norm = v.replace(/\s+/g, ' ').trim();
      if (RIZIKO.test(norm)) continue;          // to hlásí hlídač jmen výš
      if (!CLEN.test(norm) || clenBezpecny(norm)) continue;
      videno.add(norm);
      if (!(PROVERENO_CLENY[f] && Object.prototype.hasOwnProperty.call(PROVERENO_CLENY[f], norm)))
        noveCleny.push(f + ':' + (i + 1) + '  ${' + norm + '}');
    }
  });
  for (const k of Object.keys(PROVERENO_CLENY[f] || {}))
    if (!videno.has(k)) nepouziteCleny.push(f + '  ${' + k + '}');
}
test('žádný nový neescapovaný členský výraz (přístup do dat) v HTML v src/ui/ — bez ohledu na jméno', noveCleny.length === 0,
  '\n      nalezeno ' + noveCleny.length + ':\n      ' + noveCleny.join('\n      ')
  + '\n      → obalte hodnotu esc() / escJs(); je-li to prokazatelně číslo z kódu'
  + '\n        nebo konstanta, dopište výraz do PROVERENO_CLENY v src/test_escape.js'
  + '\n        i s důvodem, který jde ověřit ve zdroji.');
test('seznam PROVERENO_CLENY neobsahuje zastaralé záznamy', nepouziteCleny.length === 0,
  '\n      už se v kódu nevyskytují:\n      ' + nepouziteCleny.join('\n      '));
/* Sonda hlídače na sobě: přesně ty výrazy z nálezu B69, které hlídač jmen
 * neviděl, musí tenhle hlídač chytit — a escapované či číselné pustit. */
test('hlídač členů pozná B69 (Z.typPortalu, C.dph, p.hodiny, s.pocty[k]) i bez jména v RIZIKO',
  ['Z.typPortalu', 'C.dph', 'p.hodiny', 's.pocty[k]', 'v.data.ock.zadani.zaskleni']
    .every(v => CLEN.test(v) && !hodnotaBezpecna(v) && !RIZIKO.test(v) && !clenBezpecny(v))
  && ['esc(Z.typPortalu)', '+Z.striskaKs || 0', "'literal'", 'escJs(p.kid)'].every(hodnotaBezpecna)
  && clenBezpecny('rows.length') && !CLEN.test('fn(p.x)') && !CLEN.test('i')
  && HTML_RADEK.test('<td>${Z.typPortalu}</td>') && HTML_RADEK.test('value="${C.dph}"')
  && !HTML_RADEK.test("` / ${Z.svetlikyBoky}${Z.svetlikyBoky > 0 ? 'x' : ''}`"));

/* Poslední pojistka: HTML se skládá jen v src/ui/. Kdyby někdo začal sázet
 * do stránky text i odjinud, tenhle hlídač by o tom nevěděl. */
const mimoUi = fs.readdirSync(__dirname)
  .filter(f => f.endsWith('.js') && !f.startsWith('test'))
  .filter(f => /\.innerHTML\s*=|insertAdjacentHTML|document\.write|\.outerHTML\s*=/
    .test(fs.readFileSync(__dirname + '/' + f, 'utf8')));
test('mimo src/ui/ se do stránky nesází HTML', mimoUi.length === 0, mimoUi.join(', '));

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
