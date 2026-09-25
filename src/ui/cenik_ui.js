/* ================= ZÁLOŽKA CENÍK NÁKLADŮ =================
 * Definice CENIK_DEF / CENIK_DEF_PROJ jsou v CORE (cenik.js) – jeden zdroj
 * pravdy pro záložku i pro Excel import/export. */

/* mapování ceníkových sekcí na sekce katalogu/kalkulace (kam patří vlastní položky).
 * Odvozeno z KATALOG_SEKCE_NAZEV – jeden zdroj pravdy; nová sekce katalogu tak
 * automaticky dostane i tlačítko „+ přidat“ v ceníku. */
const CENIK_GRP_SEKCE = (() => {
  const m = {};
  Object.keys(KATALOG_SEKCE_NAZEV).forEach(k => { m[KATALOG_SEKCE_NAZEV[k]] = k; });
  return m;
})();

/* ---------- zahraniční sloupec (#181, 31. 8. 2026) ----------
 *
 * Prázdná buňka znamená „stejná jako tuzemská" — udržují se jen odchylky,
 * ne druhá tabulka o třech stech řádcích. Zaškrtávátko „jen zahr." říká,
 * že položka v tuzemské kalkulaci vůbec není (cestovní náklady, překlady);
 * taková se v tuzemské zakázce nezobrazí ani s nulou.
 *
 * Zadává a zveřejňuje JEN administrátor — hlídá to i server. */
function cenikZahrHodnota(path) {
  const z = (typeof CENIK_ZAHR !== 'undefined') ? CENIK_ZAHR : null;
  const v = z && z.ceny ? z.ceny[path] : undefined;
  return v === undefined ? '' : v;
}
function cenikZahrSet(path, hodnota) {
  if (!jeAdmin() || typeof CENIK_ZAHR === 'undefined') return;
  const t = String(hodnota == null ? '' : hodnota).trim();
  if (t === '') delete CENIK_ZAHR.ceny[path];
  else {
    const c = parseFloat(t.replace(/\s/g, '').replace(',', '.'));
    if (!isFinite(c)) return;
    CENIK_ZAHR.ceny[path] = c;
  }
  if (typeof progZprava === 'function')
    progZprava('Zahraniční ceník se změnil — nezapomeňte ho zveřejnit tlačítkem níž, '
      + 'jinak platí jen vám a po odhlášení se ztratí.', 'varovani');
  render();
}
function cenikZahrJenSet(path, ano) {
  if (!jeAdmin() || typeof CENIK_ZAHR === 'undefined') return;
  if (ano) CENIK_ZAHR.jenZahr[path] = true; else delete CENIK_ZAHR.jenZahr[path];
  render();
}

/* ---------- globální přirážka pro zahraničí (3. 9. 2026) ----------
 * Dotaz J. V.: „je možné pro zahraniční zakázky předvolit globální přirážku
 * 40 % místo standardních 30 %? Nejlepší by bylo uvést to v ceníku zase jako
 * zahraniční variantu." Ano — přirážka je sledovaná ceníková cesta
 * (`C.marze` v CENIK_STARI_EXTRA), takže se pro ni dá držet odchylka úplně
 * stejně jako u kterékoli ceny. Pole stojí vedle tuzemského, ne v tabulce:
 * přirážka do tabulky cen nepatří, je to jedna hodnota nad celou nabídkou.
 *
 * Prázdné pole = pro zahraničí platí tuzemská přirážka. Hodnota se ZADÁVÁ
 * V PROCENTECH a ukládá jako podíl, přesně jako tuzemská. */
/* ZOBECNĚNO NA LIBOVOLNOU PROCENTNÍ CESTU (nález N18, 22. 9. 2026).
 *
 * Původně to uměla jen přirážka. Sazba DPH je přitom úplně stejný druh
 * hodnoty — jedno číslo nad celou nabídkou, uložené jako podíl, a taky
 * sledovaná ceníková cesta (`C.dph` / `PC.dph` v CENIK_STARI_EXTRA).
 * Rozdíl byl jen v tom, že pro ni nikdo neudělal pole: sloupec „Cena
 * Zahraničí" se kreslí u řádků tabulky a DPH v tabulce není.
 *
 * `opts.label` a `opts.title` mění text, chování zůstává jedno.
 *
 * NULA JE PLATNÁ HODNOTA, ne „prázdné". U DPH to není detail: 0 % znamená
 * přenesenou daňovou povinnost. `cenikZahrSet` maže odchylku jen u prázdného
 * řetězce a `cenikZahrHodnota` vrací nulu jako nulu — drží to test. */
function cenikZahrPctPole(cesta, opts) {
  const o = opts || {};
  const zv = cenikZahrHodnota(cesta);
  const pct = zv === '' ? '' : Math.round(zv * 10000) / 100;
  const label = o.label || '…&nbsp;pro ZAHRANIČÍ';
  const title = o.title || 'prázdné = i v zahraniční zakázce platí tuzemská přirážka';
  const reset = o.reset || 'převzít tuzemskou přirážku';
  const placeholder = o.placeholder || 'jako ČR';
  return `<span class="pct-wrap" style="margin-left:18px">
    <label style="margin-right:6px">${label}</label>
    <input type="number" step="1" class="zahr-cena${zv === '' ? '' : ' ma'}" style="width:80px"
      value="${esc(pct)}" placeholder="${esc(placeholder)}"
      title="${esc(title)}"
      onchange="cenikZahrSet('${cesta}', this.value === '' ? '' : (+this.value) / 100)"> %
    ${zv === '' ? '' : `<button class="mini noprint" title="${esc(reset)}"
      onclick="cenikZahrSet('${cesta}', '')">↺</button>`}</span>`;
}
/* Sazba DPH pro zahraniční řadu. Vlastní texty, jinak totéž co u přirážky.
 *
 * PRÁZDNÉ POLE TU ZNAMENÁ NULU, ne „jako v ČR" (22. 9. 2026 večer, J. V.:
 * „sazba DPH se při přepnutí na zahraniční ceník nepřepíná na 0 % … to by
 * bylo optimální"). Výchozí nulu doplňuje model (`cenikZahrSVychozimi`),
 * pole jen ukazuje, co platí. Kdo chce v zahraničí českou sazbu, zapíše ji. */
function cenikDphZahrPole(cesta) {
  return cenikZahrPctPole(cesta, {
    label: 'SAZBA DPH&nbsp;… pro ZAHRANIČÍ',
    placeholder: '0',
    title: 'prázdné = v zahraniční zakázce platí 0 % (dodávka do zahraničí bez české DPH). '
      + 'Chcete-li i v zahraničí českou sazbu, zapište ji sem.',
    reset: 'vrátit výchozích 0 %',
  });
}

function cenikRows(def, zahrSloupec) {
  return def.map(([grp, items]) => {
    const body = items.map(([path, l, u, note, typ]) => {
      const val = get(path);
      /* JE TO POLOŽKA, KTERÁ V TUZEMSKU NENÍ? (P4, nález N6, 21. 9. 2026.)
       * Počítá se dřív než editor ceny, protože u takové položky se tuzemské
       * pole zašedne — viz níž. Pevná sada (CENIK_JEN_ZAHR) je zaškrtnutá
       * a zamčená: odškrtnout ji nejde, výpočet ji stejně skryje. */
      const jenZahrPevne = (typeof CENIK_JEN_ZAHR !== 'undefined') && CENIK_JEN_ZAHR.indexOf(path) >= 0;
      const jenZahrPolozka = jenZahrPevne
        || ((typeof CENIK_ZAHR !== 'undefined') && !!CENIK_ZAHR.jenZahr[path]);
      let ed;
      if (typ === 'text') ed = `<input type="text" style="width:130px;text-align:left" value="${esc(val)}" onchange="set('${path}', this.value)">`;
      else if (typ === 'selLak') ed = `<select style="width:130px" onchange="set('${path}', this.value)">
          <option value="tomas" ${val === 'tomas' ? 'selected' : ''}>Tomáš</option>
          <option value="lakovna" ${val === 'lakovna' ? 'selected' : ''}>lakovna</option></select>`;
      /* Procenta se v datech drží jako desetinný podíl (0,30), ale zadávají
       * se lidsky — 30. Stejně jako globální přirážka o pár řádků výš
       * (31. 8. 2026, položky ATYP a výchozí rozsahy práce). */
      else if (typ === 'pct') ed = `<input type="number" step="1" value="${val == null || val === '' ? '' : Math.round(val * 10000) / 100}"
          placeholder="nenastaveno" onchange="set('${path}', this.value === '' ? 0 : (+this.value) / 100)">`;
      else ed = `<input type="number" step="any" value="${esc(val)}" onchange="set('${path}', +this.value)">`;
      /* TUZEMSKÁ CENA U POLOŽKY „JEN ZAHRANIČNÍ" SE NEZADÁVÁ (P4, nález N6).
       *
       * Ceník verze 27 měl u překladů CZ→DE vyplněnou i ČR hodnotu — dalo se
       * ji totiž normálně napsat. V kalkulaci se řádek neukázal, ale cena
       * tiše vstupovala do základu přirážky za ATYP a přes ni i do rezervy.
       * Pole, do kterého jde psát a nic to neudělá (nebo udělá něco jiného,
       * než člověk čeká), je horší než pole, které tam není. */
      if (jenZahrPolozka && zahrSloupec)
        ed = `<input type="number" value="" placeholder="neplatí v ČR" disabled
          title="Položka v tuzemské kalkulaci vůbec není, takže tuzemská cena nemá co ovlivnit. Zadává se jen cena ve sloupci Zahraničí.">`;
      let zahr = '';
      if (zahrSloupec) {
        const zv = cenikZahrHodnota(path);
        const pevne = jenZahrPevne;
        const jen = jenZahrPolozka;
        zahr = typ ? '<td colspan="2" class="note">—</td>' : `<td class="zahr-bunka">
          <input type="number" step="any" class="zahr-cena${zv === '' ? '' : ' ma'}" value="${esc(zv)}"
            placeholder="jako ČR" title="prázdné = platí tuzemská cena"
            onchange="cenikZahrSet('${path}', this.value)">
          ${zv === '' ? '' : `<button class="mini noprint" title="převzít tuzemskou cenu"
            onclick="cenikZahrSet('${path}', '')">↺</button>`}</td>
          <td class="zahr-bunka"><label title="${pevne
            ? 'položka v tuzemské zakázce neexistuje — dané ceníkem, nejde vypnout'
            : 'položka v tuzemské kalkulaci vůbec není'}">
            <input type="checkbox" ${jen ? 'checked' : ''} ${pevne ? 'disabled' : ''}
              onchange="cenikZahrJenSet('${escJs(path)}', this.checked)"> jen zahr.</label></td>`;
      }
      /* Třídy místo nth-child: se sloupcem Cena Zahraničí má tabulka šest
       * sloupců, ne čtyři, a stará pravidla podle pořadí pak trefila cizí
       * buňky — poznámka zůstala v `white-space:nowrap` a utekla mimo kartu
       * (hlášeno J. V. 1. 9. 2026: „popisný text se nám v ceníku nevejde na
       * stránku"). Třída ví, co je co, ať sloupců přibude kolik chce. */
      return `<tr${zahrSloupec && cenikZahrHodnota(path) !== '' ? ' class="ma-zahr"' : ''}>
        <td class="c-nazev">${l}${klicChip(path)}</td><td class="c-hod">${ed}</td>${zahr}<td class="c-jed">${u}</td><td class="c-pozn">${note}</td></tr>`;
    }).join('');
    const sl = zahrSloupec ? 6 : 4;
    /* Na konci skupiny: v OCK trvalé položky katalogu, v PROJ trvalé položky
     * sekcí projekce, které pod tuhle skupinu patří (2. 9. 2026). */
    const trvale = (def === CENIK_DEF_PROJ)
      ? ((typeof cenikProjTrvaleRadky === 'function')
        ? cenikProjTrvaleRadky(CENIK_PROJ_SEKCE_SKUPINY[grp] || []) : '')
      : cenikCustomRows(CENIK_GRP_SEKCE[grp], sl);
    return `<tr class="sec"><td colspan="${sl}">${grp}</td></tr>${body}${trvale}`;
  }).join('');
}
/* Vlastní položky přidané přímo v ceníku (per sekce) = TRVALÉ položky.
 * Zdrojem pravdy je KATALOG (mimo zakázku), takže se propíšou do každé nové
 * cenové nabídky. Změna se okamžitě promítne i do aktuální zakázky. */
function cenikCustomRows(sekceKey, sloupcu) {
  if (!sekceKey || !jeAdmin()) return '';
  const SL = sloupcu || 4;
  /* Trvalé položky mají zahraniční cenu přes ceník řady až tehdy, až se
   * stanou součástí CENIK_DEF — zatím jim sloupec jen dorovná šířku. */
  const mezera = SL > 4 ? '<td colspan="' + (SL - 4) + '" class="note">—</td>' : '';
  const arr = katalogSekce(KATALOG, sekceKey);
  /* Argumenty onclick/onchange přes escJs (B26, 9. 9. 2026): `kid` může
   * přijít z uložené zakázky (📌 v kalkulaci), tedy od kohokoli, a esc()
   * by tu nestačilo — entity prohlížeč dekóduje dřív, než JS argument
   * parsuje. sek je z pevného výčtu, escapuje se pro jednotnost. */
  const sk = escJs(sekceKey);
  const rows = arr.map(p => `<tr>
      <td><input type="text" value="${esc(p.nazev)}" onchange="katSet('${sk}','${escJs(p.kid)}','nazev',this.value)"></td>
      <td><input type="number" step="any" value="${+p.cena || 0}" onchange="katSet('${sk}','${escJs(p.kid)}','cena',this.value)"></td>
      ${mezera}
      <td><input type="number" step="any" style="width:70px" value="${+p.mnozstvi || 1}" onchange="katSet('${sk}','${escJs(p.kid)}','mnozstvi',this.value)" title="výchozí množství v nové nabídce"></td>
      <td><span class="pill ok" title="je součástí každé nové cenové nabídky">trvalá</span>
          <button class="mini noprint" title="odebrat z ceníku i z této zakázky" onclick="katDel('${sk}','${escJs(p.kid)}')">✕</button></td></tr>`).join('');
  const lokal = katalogCil(Z, sekceKey).filter(p => !p.kid).length;
  const info = lokal ? `<tr><td colspan="${SL}"><span class="note">V této zakázce je navíc ${lokal} položka/y přidaná přímo v kalkulaci
      (dočasná). Tlačítkem 📌 v Kalkulaci OCK ji uložíš sem natrvalo.</span></td></tr>` : '';
  return rows + info + `<tr class="pridat noprint"><td colspan="${SL}"><button class="mini" onclick="katAdd('${sk}')">+ přidat trvalou položku do sekce</button></td></tr>`;
}

/* --- obsluha trvalých (katalogových) položek ceníku --- */
function katAdd(sekceKey) {
  katalogPridejVc(KATALOG, Z, sekceKey, { nazev: 'Nová položka', mnozstvi: 1, cena: 0 });
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  render();
}
function katSet(sekceKey, kid, klic, hodnota) {
  katalogUpravVc(KATALOG, Z, sekceKey, kid, klic, hodnota);
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  render();
}
async function katDel(sekceKey, kid) {
  const p = katalogNajdi(KATALOG, sekceKey, kid);
  if (!await potvrd('Odebrat trvalou položku „' + ((p && p.nazev) || '') + '" z ceníku?\n\nZmizí i z této zakázky a nebude součástí nových nabídek.')) return;
  katalogSmazVc(KATALOG, Z, sekceKey, kid);
  render();
}

const CENIK_POZN = `<div class="note">Ceník je součástí aktivní varianty a ukládá se se zakázkou (tlačítko „Uložit zakázku") –
  změna cen tady se dotkne <b>jen této varianty</b>. Trvale, tedy pro všechny nové nabídky a přes nová
  sestavení aplikace, se ceny mění tlačítkem <b>Zveřejnit</b> v kartě Platný ceník programu nahoře.</div>`;

function renderCenik() {
  /* Zahraniční sloupec vidí a edituje jen administrátor (#181) — zveřejnění
   * hlídá i server, takže obchodníkovi by k ničemu nebyl. */
  const zahrSl = jeAdmin() && typeof CENIK_ZAHR !== 'undefined';
  const zahrPocet = zahrSl ? Object.keys(CENIK_ZAHR.ceny || {}).length : 0;
  document.getElementById('page-cenik').innerHTML =
    /* Lišta zámku čtení i tady (8. 9. 2026): ceník je součást otevřené varianty,
     * takže zamčená nabídka blokuje i jeho úpravy — a bez lišty tu nebylo kde
     * odemknout (hlášení J. V.: „přirážka se vždy vrátí na 20 %"). */
    `${typeof zamekCteniLista === 'function' ? zamekCteniLista() : ''}
     ${smiZobrazit('cenik.zverejnit') ? renderCenikProgramKarta() : ''}
     <div class="card"><h2 style="cursor:default">Ceník nákladů OCK – číselník jednotkových cen
       <span class="pill warn" style="float:right">každou cenu před nabídkou překontrolovat!</span></h2>
     <div class="body">
       ${cenikStariLista()}
       ${cenikVerzeLista()}
       <!-- Globální přirážka a sazba DPH v ceníku OCK (31. 8. 2026, zadání J. V.:
            „vlož globální přirážku do ceníku OCK, stejně jako je tomu v ceníku PROJ,
            a z ceníků ji natahuj do odpovídajících kalkulací"). Je to TÁŽ hodnota
            jako v hlavičce kalkulace — jedno úložiště (ceník varianty), dvě místa
            k zadání, přesně jako u projekce. Zveřejněním se z ní stává výchozí
            přirážka pro každou NOVOU zakázku. -->
       <div class="row" style="max-width:620px">
         ${inp('C.marze', { type: 'pct', l: 'GLOBÁLNÍ PŘIRÁŽKA OCK' })}
         ${zahrSl ? cenikZahrPctPole('C.marze') : ''}
       </div>
       <div class="note" style="margin-top:0">Táž hodnota jako v hlavičce Kalkulace OCK —
         změna se projeví na obou místech. <b>Zveřejněním ceníku</b> se z ní stane výchozí
         přirážka každé <b>nové</b> zakázky; rozpracovaným ani odeslaným nabídkám ji nikdo
         nepřepíše (přirážka je rozhodnutí k zakázce, viz #177).${zahrSl ? ` Vyplněná
         <b>přirážka pro zahraničí</b> se použije, jakmile se zakázka přepne na zahraniční
         ceník — a jen tehdy, když si ji obchodník v té zakázce sám nepřenastavil.` : ''}</div>
       ${zahrSl ? `<div class="row" style="max-width:620px">${cenikDphZahrPole('C.dph')}</div>
       <div class="note" style="margin-top:0"><b>Sazba DPH pro zahraničí</b> se použije, jakmile
         se zakázka přepne na zahraniční ceník — a jen tehdy, když si ji obchodník v té nabídce sám
         nepřenastavil. <b>Prázdné pole znamená 0 %</b> (dodávka do zahraničí bez české DPH);
         chcete-li v zahraničí jinou sazbu, zapište ji. Při návratu zakázky do tuzemska se vrátí
         tuzemská sazba.</div>` : ''}
       <div class="note">Sazbu DPH pro tuzemsko nastavíš v hlavičce Kalkulace OCK. Tlačítkem
         „+ přidat <b>trvalou</b> položku do sekce" založíš položku, která je od té chvíle součástí
         <b>každé nové cenové nabídky</b> (žije mimo zakázku, v katalogu). Položka přidaná přímo v Kalkulaci OCK
         platí jen pro danou zakázku – natrvalo ji uložíš tlačítkem 📌 u řádku. Výchozí zaškrtnutí volitelných
         řešíš v hlavním výpočtovém poli (sloupec „Výchozí").</div>
       <div class="cenik-scroll"><table class="ceniktbl">
         <tr><th class="c-nazev">Položka</th><th>Cena ČR</th>${zahrSl
           ? '<th>Cena Zahraničí</th><th>Jen zahraničí</th>' : ''}<th class="c-jed">Jednotka</th><th class="c-pozn">Poznámka</th></tr>
         ${cenikRows(CENIK_DEF, zahrSl)}
       </table></div>
       ${zahrSl ? `<div class="note">Prázdná buňka ve sloupci <b>Cena Zahraničí</b> znamená
         „stejná jako v ČR“ — udržují se jen odchylky. Zaškrtnutí <b>jen zahraničí</b> říká, že
         položka v tuzemské kalkulaci vůbec není (cestovní náklady, překlady); v tuzemské zakázce
         se pak nezobrazí ani s nulou. Odchylek je teď <b>${zahrPocet}</b>.
         Zveřejňují se spolu s tuzemským ceníkem, jedním tlačítkem a pod jedním číslem verze —
         obě řady tak nemůžou patřit k jiné verzi.</div>` : ''}
       ${smiZobrazit('cenik.import') ? `<div class="btns" style="margin-top:12px">
         <button class="primary" onclick="cenikExport()">⭳ Export do Excelu (OCK+PROJ)</button>
         <button onclick="cenikImport()">⭱ Import z Excelu</button>
       </div>` : ''}
       <div class="btns" style="margin-top:8px">
         <button onclick="resetCenik()">Obnovit výchozí ceník OCK</button>
       </div>
       <div class="note" id="cenikStav">Export vytvoří <b>.xlsx</b> se dvěma listy (Ceník OCK, Ceník PROJ). Uprav ceny v Excelu a nahraj zpět tlačítkem Import – před uložením uvidíš přehled změn.</div>
       ${CENIK_POZN}
     </div></div>
     ${cenikPopisyKarta()}`;
}

/* ================= ČÍSELNÍK DODATKOVÝCH TEXTŮ (25. 9. 2026) =================
 *
 * Zadání J. V.: „z aplikace se mi v čase ztrácí dodatkové texty, které jsem
 * tam vepsal. Myslím, že pro ně potřebujeme samostatný číselník, resp. pole
 * v ceníku nákladů OCK, aby je trvale držel."
 *
 * Texty dál bydlí ve společné mapě aplikace (`/api/popisy`) — ta nemá verzi
 * a nemusí se kvůli jedné větě zveřejňovat celý ceník. Nově má ale vlastní
 * obrazovku: všechny položky, pod které se text dá napsat, na jednom místě,
 * nezávisle na tom, která zakázka je otevřená. Zápis jde na server hned,
 * po jednom textu (server ho sloučí, viz popisy.mjs), takže už se nepřepíšou
 * navzájem dvě okna.
 *
 * Tlačítko „Najít texty v uložených zakázkách" je záchrana: text, který ze
 * společné mapy zmizel, obvykle pořád leží v zakázce, kde byl napsaný. */
const POPISY_CIS = { sber: null, hleda: false, chyba: '' };

function cenikPopisySpolecne() {
  return (typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV.popisy && ONLINE_STAV.popisy.texty)
    ? ONLINE_STAV.popisy.texty : {};
}

function cenikPopisyKarta() {
  if (typeof popisyCiselnik !== 'function' || typeof vypocet !== 'function') return '';
  const admin = (typeof jeAdminOnline === 'function') ? jeAdminOnline() : false;
  const online = typeof ONLINE_STAV !== 'undefined' && !!ONLINE_STAV.ja;
  const texty = cenikPopisySpolecne();
  let cis;
  try {
    cis = popisyCiselnik((z, c) => vypocet(z, c, JEKLY, (typeof OCK !== 'undefined' && OCK) ? OCK.fixes : true),
      (typeof DEFAULT_ZADANI !== 'undefined') ? DEFAULT_ZADANI : {}, C, texty);
  } catch (e) { return ''; }
  const zak = (C && C.popisy) || {};
  const sber = POPISY_CIS.sber;
  const kandidati = (klic) => {
    const sez = (sber && sber[klic]) || [];
    if (!sez.length) return '';
    return sez.slice(0, 3).map((x, i) => `<div class="note" style="margin:2px 0">
        <b>${esc(x.cislo)}</b>${x.pocet > 1 ? ` (+${x.pocet - 1})` : ''}: „${esc(x.text)}"
        ${admin ? `<button class="mini" onclick="cenikPopisPrevzit('${keyAttr(klic)}', ${i})">převzít</button>` : ''}
      </div>`).join('');
  };
  const radek = (r) => {
    const t = texty[r.klic] || '';
    const tz = zak[r.klic];
    const jinde = (typeof tz === 'string' && tz !== t)
      ? `<div class="note" style="margin:2px 0">V otevřené zakázce: ${tz ? '„' + esc(tz) + '"' : '<i>vědomě bez textu</i>'}</div>` : '';
    const pole = admin
      ? `<input type="text" style="width:100%" value="${esc(t)}" maxlength="${POPISY_MAX_TEXT}"
           placeholder="dodatkový text do cenové nabídky (nepovinné)"
           onchange="cenikPopisUlozCis('${keyAttr(r.klic)}', this.value)">`
      : (t ? esc(t) : '<span class="note">—</span>');
    return `<tr><td class="c-nazev">${esc(r.klic)}<div class="note" style="margin:0">${esc(r.skupina)}
        · ${r.typy.join(' + ')}</div></td><td>${pole}${jinde}${kandidati(r.klic)}</td></tr>`;
  };
  const osirele = cis.osirele.length ? `<tr><th colspan="2">Texty k položkám, které výpočet už nezná
      (přejmenované nebo zrušené) — nic se nemaže, rozhodněte sami</th></tr>`
    + cis.osirele.map(o => `<tr><td class="c-nazev">${esc(o.klic)}</td><td>${admin
      ? `<input type="text" style="width:100%" value="${esc(o.text)}" maxlength="${POPISY_MAX_TEXT}"
           onchange="cenikPopisUlozCis('${keyAttr(o.klic)}', this.value)">` : esc(o.text)}</td></tr>`).join('') : '';
  const kdo = (typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV.popisy && ONLINE_STAV.popisy.kdy)
    ? `Naposledy změněno ${esc(String(ONLINE_STAV.popisy.kdy).slice(0, 16).replace('T', ' '))}
       (${esc(ONLINE_STAV.popisy.kdo || '?')}).` : 'Zatím žádný text není uložený.';
  return `<div class="card" id="cenikPopisyKarta"><h2 style="cursor:default">Dodatkové texty do cenové nabídky – číselník</h2>
    <div class="body">
      <div class="note">Text se tiskne v cenové nabídce pod názvem příplatku nebo volitelné položky.
        Tady je <b>trvale uložený pro celou aplikaci</b> — nezávisle na zakázce i na verzi ceníku —
        a předvyplní se do každé nové i rozpracované zakázky, která u položky vlastní text nemá.
        Odeslané (uzamčené) nabídky se nemění. ${admin
          ? 'Každá změna se uloží hned, když opustíte pole.'
          : 'Texty zadává administrátor; ve své zakázce je můžete upravit v Kalkulaci OCK pod položkou.'}
        ${online ? kdo : '<b>Nepřihlášeno — texty se načtou po přihlášení.</b>'}</div>
      ${admin ? `<div class="btns" style="margin:6px 0">
        <button onclick="cenikPopisySber()" ${POPISY_CIS.hleda ? 'disabled' : ''}>${POPISY_CIS.hleda
          ? 'Hledám v uložených zakázkách…' : 'Najít texty v uložených zakázkách'}</button>
        ${sber ? `<span class="note">Nalezeno u ${Object.keys(sber).length} položek (jen texty,
          které se od číselníku liší).</span>` : ''}
        ${POPISY_CIS.chyba ? `<span class="note" style="color:#b00">${esc(POPISY_CIS.chyba)}</span>` : ''}
      </div>` : ''}
      <div class="cenik-scroll"><table class="ceniktbl">
        <tr><th class="c-nazev">Položka</th><th>Dodatkový text</th></tr>
        ${cis.radky.map(radek).join('')}
        ${osirele}
      </table></div>
    </div></div>`;
}

/* Uložení z číselníku. Do otevřené rozpracované zakázky se text doplní jen
 * tam, kde vlastní nemá — stejné pravidlo jako při otevření zakázky. */
function cenikPopisUlozCis(klic, text) {
  if (typeof onlinePopisUloz !== 'function') return Promise.resolve(false);
  return onlinePopisUloz(klic, text).then(ok => {
    if (ok && typeof popisyDoplnChybejici === 'function' && typeof ZAK !== 'undefined' && ZAK) {
      const v = aktivniVarianta(ZAK);
      const zam = (typeof variantaUzamcena === 'function') && variantaUzamcena(v);
      const t = String(text == null ? '' : text).trim();
      if (!zam && t && v && v.data && v.data.cenik && popisyDoplnChybejici(v.data.cenik, { [klic]: t })
        && typeof syncVarianta === 'function') syncVarianta();
    }
    render();
    return ok;
  });
}

function cenikPopisySber() {
  if (typeof onlineApi !== 'function') return;
  POPISY_CIS.hleda = true; POPISY_CIS.chyba = ''; render();
  onlineApi('/api/popisy?sber=1').then(o => { POPISY_CIS.sber = (o && o.nalez) || {}; })
    .catch(e => { POPISY_CIS.chyba = 'Hledání selhalo: ' + e.message; })
    .then(() => { POPISY_CIS.hleda = false; render(); });
}

function cenikPopisPrevzit(klic, i) {
  const x = POPISY_CIS.sber && POPISY_CIS.sber[klic] && POPISY_CIS.sber[klic][i];
  if (!x) return;
  cenikPopisUlozCis(klic, x.text).then(ok => {
    if (ok && POPISY_CIS.sber) { delete POPISY_CIS.sber[klic]; render(); }
  });
}

function renderCenikProj() {
  /* Zahraniční varianta i u přirážky projekce (3. 9. 2026, zadání J. V.:
   * „připrav tedy pro globální přirážku i variantu pro zahraničí"). Ostatní
   * ceny projekce zahraniční řadu nemají — ta je z #181 jen pro OCK —, ale
   * přirážka je sledovaná cesta (`PC.marze`), takže odchylku držet umí. */
  const zahrSlProj = jeAdmin() && typeof CENIK_ZAHR !== 'undefined';
  document.getElementById('page-cenikproj').innerHTML =
    /* Táž karta Databáze programu jako na záložce OCK (zadání 2. 8. 2026).
     * Zveřejnění a verzování je jedno pro obě sady — _program.json nese ceník
     * OCK i PROJ v jedné verzi — takže tohle je druhé vykreslení téže karty
     * nad týmž stavem, stejný vzor jako karty slevy a zaokrouhlení. Karta
     * nenese žádné id (card() bez čtvrtého argumentu), dvojí vykreslení
     * proto nic nezdvojí; hlídá to overit_program.mjs. */
    `${typeof zamekCteniLista === 'function' ? zamekCteniLista() : ''}
     ${smiZobrazit('cenik.zverejnit') ? renderCenikProgramKarta() : ''}
     <div class="card"><h2 style="cursor:default">Ceník nákladů PROJ – projekční práce
       <span class="pill warn" style="float:right">každou cenu před nabídkou překontrolovat!</span></h2>
     <div class="body">
       ${cenikStariLista()}
       ${cenikVerzeLista()}
       <div class="row" style="max-width:620px">
         ${inp('PC.marze', { type: 'pct', l: 'GLOBÁLNÍ PŘIRÁŽKA PROJ' })}
         ${zahrSlProj ? cenikZahrPctPole('PC.marze') : ''}
       </div>
       ${zahrSlProj ? `<div class="row" style="max-width:620px">${cenikDphZahrPole('PC.dph')}</div>
       <div class="note" style="margin-top:0">Vyplněná <b>přirážka pro
         zahraničí</b> se použije, jakmile se zakázka přepne na zahraniční ceník — a jen
         tehdy, když si ji obchodník v té zakázce sám nepřenastavil. Totéž platí pro
         <b>sazbu DPH</b>, jen s jiným výchozím stavem: <b>prázdné pole znamená 0 %</b>
         (dodávka do zahraničí bez české DPH). Ostatní ceny projekce
         zahraniční variantu nemají; liší-li se, doplňte je jako ruční sazbu v kalkulaci.</div>` : ''}
       <div class="cenik-scroll"><table class="ceniktbl">
         <tr><th>Položka</th><th>Cena</th><th>Jednotka</th><th>Poznámka</th></tr>
         ${cenikRows(CENIK_DEF_PROJ)}
       </table></div>
       <div class="note"><b>PŘEDVOLBY sazeb DPH a kurz EUR jsou společné s ceníkem OCK</b> —
         mají jeden zdroj pravdy, aby se nemohly rozejít. Nastavíte je v záložce
         <b>Ceník nákladů OCK</b> (sekce SAZBY DPH a CIZÍ MĚNA). <b>Vybraná sazba nabídky
         zůstává projekci vlastní</b> (<code>PC.dph</code>), a proto má i vlastní zahraniční
         odchylku v poli výš; projekce si z nich
         bere předvolby a kurz. Sazbu DPH pro konkrétní nabídku projekce vybíráte
         dál v hlavičce Kalkulace PROJ — ta zůstává vlastní.</div>
       ${smiZobrazit('cenik.import') ? `<div class="btns" style="margin-top:12px">
         <button class="primary" onclick="cenikExport()">⭳ Export do Excelu (OCK+PROJ)</button>
         <button onclick="cenikImport()">⭱ Import z Excelu</button>
       </div>` : ''}
       <div class="btns" style="margin-top:8px">
         <button onclick="resetCenikProj()">Obnovit výchozí ceník PROJ</button>
       </div>
       <div class="note">Fixní částky sekcí jsou provázané s kalkulací – změna zde se ihned projeví
       v záložce <b>Kalkulace PROJ</b> (a naopak, úprava částky u položky v kalkulaci se propíše sem).
       Hodiny jednotlivých položek se zadávají v kalkulaci; vlastní přidané položky mají cenu přímo u sebe.</div>
       ${CENIK_POZN}
       <div class="note">Ceník PROJ se zveřejňuje spolu s ceníkem OCK – jedním tlačítkem <b>Zveřejnit</b>
         v kartě <b>Databáze programu</b> nahoře (karta je na obou záložkách ceníku a je to táž karta).
         Obě sady tak vždy patří k téže verzi.</div>
     </div></div>`;
}

/* ---------- trvalé položky projekce v ceníku PROJ (1. 9. 2026) ----------
 *
 * Pokyn J. V.: „nově už budeme trvalé položky přidávat pouze v cenících."
 * V OCK to šlo vždycky (tlačítko „+ přidat trvalou položku do sekce" přímo
 * v tabulce ceníku), v projekci se trvalé položky zakládaly z kalkulace.
 * Tahle karta to místo dává i projekci: pro každou sekci nabídne seznam
 * trvalých položek a tlačítka na přidání hodinové a fixní.
 *
 * Zdroj pravdy je CENÍK varianty (`PC.vlastniPolozky`), stejně jako dřív;
 * změna se propíše do DEFAULT_CENIK_PROJ (aby ji dostala každá nová zakázka
 * v téhle relaci) a přes projKatalogAplikuj do otevřené kalkulace. */
function cenikProjTrvaleSekce() {
  const zdroj = (typeof PJ !== 'undefined' && PJ && Array.isArray(PJ.sekce)) ? PJ.sekce
    : ((typeof DEFAULT_ZADANI_PROJ !== 'undefined' && DEFAULT_ZADANI_PROJ.sekce) || []);
  return zdroj.map(s => ({ key: s.key, nazev: s.nazev }));
}
/* Kam v ceníku PROJ patří trvalé položky které sekce (2. 9. 2026, pokyn J. V.:
 * „přesuň tlačítka pro přidávání trvalých položek vždy na konec jednotlivých
 * sekcí, tedy tak jak to máme v ceníku OCK"). Do 2. 9. stály sekce projekce
 * v jednom bloku pod tabulkou; teď visí na skupinách ceníku, ke kterým věcně
 * patří. Dvě skupiny nesou po dvou sekcích (hodinové sazby pokrývají zaměření
 * i studii, kolaudace a geodet jdou spolu) — proto je u nich v tlačítku i
 * jméno sekce, ať je jasné, kam položka půjde. */
const CENIK_PROJ_SEKCE_SKUPINY = {
  'HODINOVÉ SAZBY (ZAMĚŘENÍ / STUDIE / DPZ / DPS)': ['zamereni', 'studie'],
  'PROJEDNÁNÍ STUDIE': ['projednani'],
  'DPZ – DOKUMENTACE PRO POVOLENÍ ZÁMĚRU': ['dpz'],
  'IČ – INŽENÝRSKÁ ČINNOST': ['ic'],
  'DPS – DOKUMENTACE PRO PROVEDENÍ STAVBY': ['dps'],
  'EZC – EKONOMICKÁ ZADÁVACÍ ČÁST': ['ezc'],
  'KOLAUDACE A GEODET': ['kolaudace', 'geodet'],
};

function cenikProjTrvaleRadky(sekce) {
  if (!jeAdmin() || typeof projKatalogSekce !== 'function') return '';
  const vsechny = cenikProjTrvaleSekce();
  const vyber = sekce ? vsechny.filter(x => sekce.indexOf(x.key) >= 0) : vsechny;
  if (!vyber.length) return '';
  const viceSekci = vyber.length > 1;
  const radky = vyber.map(sek => {
    const polozky = projKatalogSekce(PC, sek.key);
    /* `kid` přichází z uložené zakázky (PC = ceník varianty) — tedy od
     * obchodníka, ne z kódu. V argumentu onclick/onchange chrání jen escJs;
     * esc() tu do 9. 9. 2026 nechránilo vůbec (B26): prohlížeč HTML entity
     * dekóduje před parsováním JS, takže &#39; se zase stalo apostrofem. */
    const sk = escJs(sek.key);
    const seznam = polozky.map(p => {
      const kidJs = escJs(p.kid);
      const chip = klicChip('PC.vlastniPolozky.' + sek.key + '.' + p.kid);   // escapuje uvnitř
      return `<tr>
      <td class="c-nazev"><input type="text" class="nazev-ed" value="${esc(p.nazev)}"
        onchange="cenikProjTrvaleSet('${sk}','${kidJs}','nazev',this.value)">
        ${chip}</td>
      <td class="c-hod">${p.typ === 'hod'
        ? `<input type="number" step="any" style="width:90px" value="${+p.hodiny || 0}"
             title="hodin" onchange="cenikProjTrvaleSet('${sk}','${kidJs}','hodiny',this.value)">`
        : `<input type="number" step="any" value="${+p.cena || 0}"
             onchange="cenikProjTrvaleSet('${sk}','${kidJs}','cena',this.value)">`}</td>
      <td class="c-jed">${p.typ === 'hod' ? 'hod (' + esc(p.sazba || 'projektant') + ')' : 'Kč'}</td>
      <td class="c-pozn">trvalá položka${viceSekci ? ' — ' + esc(sek.nazev) : ''}, je v každé nové nabídce
        <button class="mini noprint" title="odebrat trvalou položku z ceníku"
          onclick="cenikProjTrvaleDel('${sk}','${kidJs}')">✕</button></td></tr>`;
    }).join('');
    const kam = viceSekci ? ' do ' + esc(sek.nazev) : ' do sekce';
    return seznam + `<tr class="pridat noprint"><td colspan="4">
        <button class="mini" onclick="cenikProjTrvaleAdd('${sk}','hod')">+ přidat trvalou hodinovou položku${kam}</button>
        <button class="mini" onclick="cenikProjTrvaleAdd('${sk}','fix')">+ přidat trvalou fixní položku${kam}</button>
      </td></tr>`;
  }).join('');
  return radky;
}

function cenikProjTrvaleAdd(sekKey, typ) {
  if (!jeAdmin()) return;
  const it = projKatalogPridej(PC, sekKey, { typ: typ === 'hod' ? 'hod' : 'fix' });
  if (typeof DEFAULT_CENIK_PROJ !== 'undefined' && DEFAULT_CENIK_PROJ !== PC) {
    DEFAULT_CENIK_PROJ.vlastniSeq = Math.max(+DEFAULT_CENIK_PROJ.vlastniSeq || 0, +PC.vlastniSeq || 0);
    if (!projKatalogSekce(DEFAULT_CENIK_PROJ, sekKey).some(k => k.kid === it.kid))
      projKatalogSekce(DEFAULT_CENIK_PROJ, sekKey).push(JSON.parse(JSON.stringify(it)));
  }
  projKatalogAplikuj(PC, PJ);
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  render();
}
function cenikProjTrvaleSet(sekKey, kid, klic, hodnota) {
  if (!jeAdmin()) return;
  [PC, (typeof DEFAULT_CENIK_PROJ !== 'undefined' ? DEFAULT_CENIK_PROJ : null)].forEach(cil => {
    if (!cil) return;
    const it = projKatalogSekce(cil, sekKey).find(k => k.kid === kid);
    if (!it) return;
    if (klic === 'nazev') it.nazev = String(hodnota);
    else it[klic] = +hodnota || 0;
  });
  /* A totéž v otevřené kalkulaci, ať se změna projeví hned. */
  (PJ.sekce || []).forEach(s => (s.polozky || []).forEach(p => {
    if (p.kid !== kid) return;
    if (klic === 'nazev') p.nazev = String(hodnota); else p[klic] = +hodnota || 0;
  }));
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  render();
}
async function cenikProjTrvaleDel(sekKey, kid) {
  if (!jeAdmin()) return;
  const it = projKatalogSekce(PC, sekKey).find(k => k.kid === kid);
  if (!await potvrd('Odebrat trvalou položku „' + ((it && it.nazev) || '') + '" z ceníku projekce?\n\n'
    + 'Zmizí i z této zakázky a nebude součástí nových nabídek.')) return;
  projKatalogSmaz(PC, sekKey, kid);
  if (typeof DEFAULT_CENIK_PROJ !== 'undefined' && DEFAULT_CENIK_PROJ !== PC)
    projKatalogSmaz(DEFAULT_CENIK_PROJ, sekKey, kid);
  (PJ.sekce || []).forEach(s => {
    if (!Array.isArray(s.polozky)) return;
    s.polozky = s.polozky.filter(p => p.kid !== kid);
  });
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  render();
}

async function resetCenik() {
  if (await potvrd('Vrátit ceny OCK na platný ceník programu?\n\nPřepíše se jen ceník této varianty, platná verze se nemění.')) {
    aktivniVarianta(ZAK).data.cenik = JSON.parse(JSON.stringify(DEFAULT_CENIK));
    syncVarianta(); render();
  }
}
async function resetCenikProj() {
  if (await potvrd('Vrátit ceny PROJ na platný ceník programu?\n\nPřepíše se jen ceník této varianty, platná verze se nemění.')) {
    aktivniVarianta(ZAK).data.proj.cenik = JSON.parse(JSON.stringify(DEFAULT_CENIK_PROJ));
    syncVarianta(); render();
  }
}

/* ---------- Excel export/import ceníku (OCK + PROJ) ---------- */
function cenikStav(t) { const el = document.getElementById('cenikStav'); if (el) el.textContent = t; }

function cenikExport() {
  try {
    const blob = xlsxZapis(cenikToSheets(C, PC));
    const cislo = (ZAK.cislo || '').replace(/\s+/g, '');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = ('CENIK_' + (cislo || 'ENG') + '.xlsx').replace(/[\\/:*?"<>|]+/g, '-');
    a.click();
    cenikStav('Export hotový – soubor je ve Stažených. Uprav ceny (sloupec Hodnota) a nahraj zpět Importem.');
  } catch (e) { cenikStav('Chyba exportu: ' + e.message); }
}

let CENIK_IMPORT = null;   // {zmeny, chyby, nezname} čekající na potvrzení
function cenikImport() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.xlsx';
  inp.onchange = () => {
    const f = inp.files[0]; if (!f) return;
    cenikStav('Načítám ' + f.name + '…');
    f.arrayBuffer().then(async buf => {
      try {
        const sheets = await xlsxPrecti(new Uint8Array(buf));
        CENIK_IMPORT = cenikDiffZeSheets(sheets, C, PC);
        cenikImportModal(CENIK_IMPORT);
      } catch (e) { cenikStav('Chyba importu: ' + e.message); }
    });
  };
  inp.click();
}

function cenikImportModal(res) {
  const kc = v => (typeof v === 'number' ? v.toLocaleString('cs-CZ') : String(v));
  const radky = res.zmeny.map(z =>
    `<tr><td>${esc(z.cesta)}</td><td>${esc(z.popis)}</td>
       <td style="text-align:right;color:#6b7686">${esc(kc(z.stara))}</td>
       <td style="text-align:right;font-weight:600">${esc(kc(z.nova))}</td></tr>`).join('');
  const chyby = res.chyby.length ? `<div class="neg" style="margin:8px 0">Chyby (${res.chyby.length}): ${res.chyby.map(esc).join('; ')}</div>` : '';
  const nezname = res.nezname.length ? `<div class="note">Ignorováno neznámých klíčů: ${res.nezname.length}.</div>` : '';
  const telo = res.zmeny.length
    ? `<div class="note">Zkontroluj ${res.zmeny.length} změn. Po potvrzení se zapíšou do ceníku aktivní varianty.</div>
       <table class="sd-tbl"><thead><tr><th>Klíč</th><th>Položka</th><th style="text-align:right">Původní</th><th style="text-align:right">Nová</th></tr></thead>
       <tbody>${radky}</tbody></table>`
    : '<div class="note">Žádné změny oproti aktuálnímu ceníku.</div>';
  const ov = document.getElementById('nastaveni-overlay');   // sdílený overlay pro modály
  const panel = document.getElementById('nastaveni-panel');
  panel.innerHTML = `<h2>Import ceníku z Excelu — přehled změn</h2>
    <div class="body">${chyby}${telo}${nezname}
      <div class="btns" style="margin-top:16px">
        ${res.zmeny.length ? '<button class="primary" onclick="cenikImportPotvrd()">Zapsat změny do ceníku</button>' : ''}
        <button onclick="zavriNastaveni()">Zavřít</button>
      </div></div>`;
  ov.style.display = 'flex';
}
function cenikImportPotvrd() {
  if (!CENIK_IMPORT) return;
  const n = cenikAplikuj(CENIK_IMPORT.zmeny, C, PC);
  CENIK_IMPORT = null;
  zavriNastaveni();
  syncVarianta(); render();
  cenikStav('Import hotový – zapsáno ' + n + ' změn do ceníku.');
}
