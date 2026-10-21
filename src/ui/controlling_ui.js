/* ============================================================
 * Nastavení → Controlling (#447, dávka C2, 20. 10. 2026)
 * Návrh a rozhodnutí J. V. J1–J11: podklady/CONTROLLING_NAVRH_20_10.md
 *
 * Tři karty:
 *   1. Nákladové skupiny — číselník kapitol (název, položka manažerské
 *      výsledovky, účty Helios nyní / budoucí, přímý × nepřímý,
 *      variabilní × fixní, oblast);
 *   2. Mapování položek — každý klíč ceníku, pseudo-klíč a trvalá položka
 *      → skupina; filtr „jen nezařazené", export a import XLSX ve tvaru
 *      Andyiny tabulky;
 *   3. Export předkalkulace — otevřená zakázka, JEN ZAMČENÁ ŘÍDÍCÍ varianta
 *      (J9), XLSX (Řádky, Kapitoly, Popis) nebo CSV; od C3 (21. 10. 2026)
 *      i HROMADNĚ ZA OBDOBÍ — počítá server (/api/controlling/export),
 *      prohlížeč z odpovědi jen složí soubor týmž ctrlExportListy — a
 *      protokol exportů. Export jedné varianty jde od C3 spustit i z
 *      Přehledu cenových nabídek (tlačítko u zamčené řídící varianty,
 *      ctrlUiExportPrehled), jen administrátor.
 *
 * Jen administrátor přihlášený online (J7) — hranici drží server
 * (/api/controlling vrací ostatním 403); záložka je v NAST_PANELY
 * `jenAdmin`. Změny se drží v pracovní kopii a na server jdou až
 * tlačítkem Uložit (vznikne verze s autorem a poznámkou); na server jdou
 * jen ODCHYLKY mapování od výchozího v kódu (ctrlOdchylky).
 *
 * Model (výpočty, kontrola, export) je v src/controlling.js — tady jen
 * kreslení a obsluha. Načítá se po přihlášení správce (onlinePoPrihlaseni,
 * vedle slovníku) a z otevřené záložky Controlling; KARTA CENÍKU SE NA
 * SERVER NEPTÁ — vykreslení nesmí spouštět dotaz (nález kola C2: harness
 * simulující online režim nad file:// hlásil chybu fetch v konzoli).
 * Příznak `nacita` se nastaví PŘED dotazem, jinak by překreslení během
 * čekání spouštělo další a další dotaz (poučení z kartotéky zákazníků).
 * ============================================================ */

const CTRL_STAV = { nacteno: false, nacita: false, chyba: '', db: null, data: null, puvodni: '',
  karta: 'skupiny', oblast: 'vse', jenNezarazene: false, hledej: '', hlaska: '', hlaskaChyba: false,
  import: null, pracuje: false,
  /* C3: výběr hromadného exportu (období podle data zamčení, oblast, řada)
   * a protokol exportů ze serveru (null = zatím nenačten). */
  hrom: null, protokol: null };

function ctrlUiPrekresli() { if (typeof render === 'function') render(); }
function ctrlUiZprava(text, chyba) { CTRL_STAV.hlaska = text || ''; CTRL_STAV.hlaskaChyba = !!chyba; ctrlUiPrekresli(); }
function ctrlUiSmi() { return typeof jeAdminOnline === 'function' && jeAdminOnline(); }
/* Server je na dosah jen přes http(s) — otevřený soubor (file://) se ptát
 * nesmí: dotaz by jen skončil chybou v konzoli (nález kola C2: harnessy,
 * které kreslí kartu ceníku jako správce, hlásily „Fetch API cannot load
 * file:///api/controlling"). Harness controllingu si funkci nahradí. */
function ctrlUiServer() { return typeof onlineMozne !== 'function' || onlineMozne(); }
/* Platná (uložená) data a pracovní kopie. Otisk pracovní kopie se porovnává
 * s otiskem při načtení — tak se pozná, že je co ukládat. */
function ctrlUiUlozena() { const p = CTRL_STAV.db && CTRL_STAV.db.platny; return ctrlPlatne(p ? p.data : null); }
function ctrlUiOtisk(data) { return JSON.stringify(ctrlOdchylky(data)); }
function ctrlUiZmeneno() { return !!CTRL_STAV.data && ctrlUiOtisk(CTRL_STAV.data) !== CTRL_STAV.puvodni; }
function ctrlUiNastavDb(db) {
  CTRL_STAV.db = db || null;
  CTRL_STAV.data = ctrlUiUlozena();
  CTRL_STAV.puvodni = ctrlUiOtisk(CTRL_STAV.data);
}

function ctrlUiNacti() {
  if (!ctrlUiSmi() || !ctrlUiServer() || CTRL_STAV.nacita) return Promise.resolve(false);
  CTRL_STAV.nacita = true; CTRL_STAV.chyba = '';
  return onlineApi('/api/controlling').then(o => { ctrlUiNastavDb(o.db); return true; })
    .catch(e => { CTRL_STAV.chyba = e.message || String(e); return false; })
    .then(v => { CTRL_STAV.nacita = false; CTRL_STAV.nacteno = true; ctrlUiPrekresli(); return v; });
}
/* Pro kreslení: načíst jen jednou; z render() se volá přes setTimeout,
 * aby zápis stavu neproběhl uvnitř vykreslování. */
function ctrlUiNactiBrzy() {
  if (CTRL_STAV.nacteno || CTRL_STAV.nacita || !ctrlUiSmi() || !ctrlUiServer()) return;
  CTRL_STAV.nacita = true;
  setTimeout(() => { CTRL_STAV.nacita = false; ctrlUiNacti(); }, 0);
}

/* ---------- úpravy pracovní kopie ---------- */
function ctrlUiSkupina(i, pole, hodnota) {
  const s = CTRL_STAV.data && CTRL_STAV.data.skupiny[i];
  if (!s) return;
  if (pole === 'ucetNyni' || pole === 'ucetBudouci')
    s[pole] = String(hodnota || '').split(/[,;\s]+/).map(x => x.trim()).filter(Boolean);
  else s[pole] = String(hodnota == null ? '' : hodnota).trim();
  CTRL_STAV.hlaska = '';
  ctrlUiPrekresli();
}
function ctrlUiIdZNazvu(nazev, existujici) {
  const zaklad = String(nazev || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'skupina';
  let id = /^[a-z0-9]/.test(zaklad) ? zaklad : 's-' + zaklad, n = 2;
  while (existujici.includes(id) || id === CTRL_NENI_NAKLAD) id = zaklad.slice(0, 27) + '-' + (n++);
  return id;
}
async function ctrlUiPridejSkupinu() {
  if (!CTRL_STAV.data) return;
  const nazev = await dotaz('Název nové nákladové skupiny (kapitoly):', '');
  if (nazev === null || !String(nazev).trim()) return;
  const ids = CTRL_STAV.data.skupiny.map(s => s.id);
  CTRL_STAV.data.skupiny.splice(CTRL_STAV.data.skupiny.length - 1, 0, { id: ctrlUiIdZNazvu(nazev, ids),
    nazev: String(nazev).trim(), manVysl: '', ucetNyni: [], ucetBudouci: [], typ: 'primy', chovani: 'variabilni', oblast: 'obe' });
  ctrlUiZprava('Skupina přidána — platit začne po uložení.');
}
async function ctrlUiSmazSkupinu(i) {
  const s = CTRL_STAV.data && CTRL_STAV.data.skupiny[i];
  if (!s || s.id === CTRL_NEZARAZENO) return;
  const n = Object.keys(CTRL_STAV.data.mapa).filter(k => CTRL_STAV.data.mapa[k] === s.id).length;
  if (!await potvrd('Zrušit skupinu „' + s.nazev + '"?\n\n' + (n
    ? n + ' ' + (n === 1 ? 'položka do ní patří a spadne' : 'položek do ní patří a spadnou') + ' do skupiny Nezařazeno.'
    : 'Žádná položka do ní nepatří.'))) return;
  CTRL_STAV.data.skupiny.splice(i, 1);
  Object.keys(CTRL_STAV.data.mapa).forEach(k => { if (CTRL_STAV.data.mapa[k] === s.id) CTRL_STAV.data.mapa[k] = CTRL_NEZARAZENO; });
  ctrlUiZprava('Skupina zrušena — platit začne po uložení.');
}
function ctrlUiMapa(klic, skupina) {
  if (!CTRL_STAV.data) return;
  CTRL_STAV.data.mapa[klic] = skupina;
  CTRL_STAV.hlaska = '';
  ctrlUiPrekresli();
}
async function ctrlUiZahod() {
  if (!ctrlUiZmeneno()) return;
  if (!await potvrd('Zahodit neuložené změny controllingu a vrátit platnou verzi?')) return;
  CTRL_STAV.data = ctrlUiUlozena(); CTRL_STAV.import = null;
  ctrlUiZprava('Neuložené změny zahozeny.');
}
async function ctrlUiUloz() {
  if (!ctrlUiSmi()) return ctrlUiZprava('Controlling ukládá jen administrátor přihlášený online.', true);
  if (!ctrlUiZmeneno()) return ctrlUiZprava('Od platné verze se nic nezměnilo — není co ukládat.');
  const data = ctrlOdchylky(CTRL_STAV.data);
  const k = ctrlDataKontrola(data);
  if (!k.ok) return ctrlUiZprava('Nejde uložit: ' + k.chyba, true);
  const p = CTRL_STAV.db && CTRL_STAV.db.platny;
  const pozn = await dotaz('Uložit číselník skupin a mapování controllingu jako novou verzi?\n\n'
    + (p ? 'Dosud platí verze ' + p.verze + '. ' : 'Zatím platí výchozí rozvržení z aplikace. ')
    + 'Nová verze bude platit pro všechny další exporty předkalkulace.\n\nČím se změna zdůvodňuje (nepovinné):', '');
  if (pozn === null) return;
  CTRL_STAV.pracuje = true; ctrlUiPrekresli();
  try {
    const o = await onlineApi('/api/controlling', { data, poznamka: String(pozn || '') });
    CTRL_STAV.import = null;
    await ctrlUiNacti();
    ctrlUiZprava('Uloženo — platí verze ' + o.verze + '.');
  } catch (e) { ctrlUiZprava('Uložit se nepodařilo: ' + e.message, true); }
  finally { CTRL_STAV.pracuje = false; ctrlUiPrekresli(); }
}

/* ---------- soubory ---------- */
function ctrlUiStahni(blob, jmeno) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = jmeno; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
const ctrlUiDnes = () => new Date().toISOString().slice(0, 10);
function ctrlUiKatalogNazvy() {
  return ctrlKatalogNazvy(typeof KATALOG !== 'undefined' ? KATALOG : null, typeof PC !== 'undefined' ? PC : null);
}
function ctrlUiMapaXlsx() {
  if (!CTRL_STAV.data) return;
  try {
    ctrlUiStahni(xlsxZapis(ctrlMapaListy(CTRL_STAV.data, ctrlUiKatalogNazvy())), 'CONTROLLING_MAPOVANI_' + ctrlUiDnes() + '.xlsx');
    ctrlUiZprava('Mapování staženo — listy Mapování a Skupiny. Upravený soubor jde nahrát zpět.');
  } catch (e) { ctrlUiZprava('Stažení mapování se nepovedlo: ' + e.message, true); }
}
function ctrlUiMapaImport() {
  if (!CTRL_STAV.data) return;
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.xlsx';
  inp.onchange = () => {
    const f = inp.files && inp.files[0]; if (!f) return;
    f.arrayBuffer().then(buf => xlsxPrecti(new Uint8Array(buf))).then(sheets => {
      const imp = ctrlImportZListu(sheets, CTRL_STAV.data);
      CTRL_STAV.import = { soubor: f.name, zmeny: imp.zmeny, chyby: imp.chyby, data: imp.data };
      CTRL_STAV.karta = 'mapa';
      ctrlUiZprava('Soubor ' + f.name + ' načten — zkontrolujte změny a převezměte je.');
    }).catch(e => ctrlUiZprava('Soubor se nepodařilo přečíst: ' + e.message, true));
  };
  inp.click();
}
function ctrlUiImportPrevezmi() {
  const imp = CTRL_STAV.import;
  if (!imp) return;
  CTRL_STAV.data = imp.data; CTRL_STAV.import = null;
  ctrlUiZprava('Převzato ' + imp.zmeny.length + ' změn ze souboru — platit začnou po uložení.');
}
function ctrlUiImportZrus() { CTRL_STAV.import = null; ctrlUiPrekresli(); }

/* Export předkalkulace otevřené zakázky. Mapování se bere ULOŽENÉ (platná
 * verze), ne rozpracovaná kopie — číslo verze v souboru musí odpovídat
 * tomu, podle čeho se řadilo. */
function ctrlUiExportVarianta() {
  const zak = (typeof ZAK !== 'undefined') ? ZAK : null;
  const v = zak && typeof ridiciVarianta === 'function' ? ridiciVarianta(zak) : null;
  return { zak, v };
}
function ctrlUiExport(format) {
  if (!ctrlUiSmi()) return ctrlUiZprava('Export předkalkulace smí jen administrátor přihlášený online.', true);
  const { zak, v } = ctrlUiExportVarianta();
  const p = CTRL_STAV.db && CTRL_STAV.db.platny;
  const data = p ? p.data : null;
  const exp = ctrlExportVarianty(zak, v, { jekly: typeof JEKLY !== 'undefined' ? JEKLY : null, data,
    verzeMapovani: p ? p.verze : null, kdo: (ONLINE_STAV.ja && ONLINE_STAV.ja.email) || '',
    build: (typeof buildVerze === 'function' && buildVerze()) || '' });
  if (!exp.ok) return ctrlUiZprava(exp.chyba, true);
  const cislo = String((exp.strany[0] && exp.strany[0].cislo) || 'zakazka').replace(/[^0-9A-Za-z.-]+/g, '_').replace(/^_+|_+$/g, '');
  const jmeno = 'PREDKALKULACE_' + cislo + '_' + ctrlUiDnes();
  try {
    if (format === 'csv') ctrlUiStahni(new Blob([ctrlExportCsv(exp, data)], { type: 'text/csv;charset=utf-8' }), jmeno + '.csv');
    else ctrlUiStahni(xlsxZapis(ctrlExportListy(exp, data)), jmeno + '.xlsx');
    /* Do protokolu zakázky se export nezapisuje: zápis by zakázku změnil
     * (a spustil ukládání) jen kvůli tomu, že si ji někdo přečetl. Protokol
     * exportů vede hromadný export na serveru (C3); export jedné otevřené
     * varianty dělá prohlížeč z dat, která už má. */
    ctrlUiZprava('Staženo ' + jmeno + '.' + format + ' — ' + exp.radky.length + ' řádků'
      + (ctrlUiZmeneno() ? '. Pozor: neuložené změny mapování se do exportu nepromítly — platí uložená verze.' : '.'));
  } catch (e) { ctrlUiZprava('Export se nepovedl: ' + e.message, true); }
}

/* Přehled cenových nabídek (C3, rozhodnutí J. V. 21. 10. 2026, bod 1):
 * tlačítko „Export pro controlling" u zamčené řídící varianty otevřené
 * zakázky. Mapování se dotáhne ze serveru, pokud ještě není načtené.
 * Přehled nemá vlastní lištu hlášek, takže chyba jde do dialogu; zdařilý
 * export ohlásí prohlížeč stažením souboru. */
async function ctrlUiExportPrehled(format) {
  if (!ctrlUiSmi()) return hlaska('Export pro controlling smí jen administrátor přihlášený online.');
  if (!CTRL_STAV.nacteno) await ctrlUiNacti();
  if (CTRL_STAV.chyba) return hlaska('Controlling se nepodařilo načíst: ' + CTRL_STAV.chyba);
  ctrlUiExport(format || 'xlsx');
  if (CTRL_STAV.hlaskaChyba) return hlaska(CTRL_STAV.hlaska);
}
/* Má mít řádek přehledu tlačítko? Jen řídící zamčená varianta otevřené
 * zakázky a jen administrátor online — mimo rolový náhled (P16: tlačítko,
 * které by obchodník neviděl, se v jeho pohledu nekreslí). */
function ctrlUiPrehledTlacitko(r) {
  if (!r || !r.ridici || !r.zamceno || !ctrlUiSmi()) return '';
  if (typeof nahledJakykoli === 'function' && nahledJakykoli()) return '';
  return `<button class="mini" onclick="ctrlUiExportPrehled('xlsx')" data-ctrl-prehled="1"
        title="Export pro controlling — předkalkulace zamčené řídící varianty (.xlsx), jen administrátor">Export pro controlling</button>`;
}

/* ---------- C3: hromadný export za období ---------- */
/* Výchozí období: od prvního dne tohoto měsíce do dneška (místní čas). */
function ctrlUiDenLokal(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function ctrlUiHrom() {
  if (!CTRL_STAV.hrom) {
    const d = new Date();
    CTRL_STAV.hrom = { od: ctrlUiDenLokal(new Date(d.getFullYear(), d.getMonth(), 1)), do: ctrlUiDenLokal(d), oblast: 'obe', rada: 'obe' };
  }
  return CTRL_STAV.hrom;
}
function ctrlUiHromSet(pole, hodnota) { ctrlUiHrom()[pole] = String(hodnota || ''); CTRL_STAV.hlaska = ''; ctrlUiPrekresli(); }
function ctrlUiProtokolNacti() {
  if (!ctrlUiSmi() || !ctrlUiServer()) return Promise.resolve();
  return onlineApi('/api/controlling/export?protokol=1')
    .then(o => { CTRL_STAV.protokol = o.zaznamy || []; })
    .catch(e => { CTRL_STAV.protokol = []; CTRL_STAV.hlaska = 'Protokol exportů se nenačetl: ' + e.message; CTRL_STAV.hlaskaChyba = true; })
    .then(() => ctrlUiPrekresli());
}
async function ctrlUiHromadny(format) {
  if (!ctrlUiSmi()) return ctrlUiZprava('Hromadný export smí jen administrátor přihlášený online.', true);
  const h = ctrlUiHrom();
  const f = ctrlHromadnyFiltr(h);
  if (!f.ok) return ctrlUiZprava(f.chyba, true);
  CTRL_STAV.pracuje = true; ctrlUiZprava('Server počítá export za období ' + h.od + ' – ' + h.do + '…');
  try {
    const q = new URLSearchParams(f.filtr).toString();
    const o = await onlineApi('/api/controlling/export?' + q);
    if (!o.exporty || !o.exporty.length) {
      ctrlUiZprava('V období ' + f.filtr.od + ' – ' + f.filtr.do + ' není žádná zamčená řídící varianta odpovídající filtru'
        + (o.preskoceno && o.preskoceno.length ? ' (přeskočeno ' + o.preskoceno.length + ': ' + o.preskoceno.slice(0, 3).map(p => p.cislo || p.soubor).join(', ') + ')' : '') + '.');
    } else {
      const opts = { kdy: o.kdy, kdo: o.kdo, verzeMapovani: o.verzeMapovani,
        build: (typeof buildVerze === 'function' && buildVerze()) || '',
        hromadny: Object.assign({}, o.filtr || f.filtr, { preskoceno: o.preskoceno || [] }) };
      const zuz = (f.filtr.oblast !== 'obe' ? '_' + f.filtr.oblast.toUpperCase() : '') + (f.filtr.rada !== 'obe' ? '_' + f.filtr.rada.toUpperCase() : '');
      const jmeno = 'PREDKALKULACE_' + f.filtr.od + '_' + f.filtr.do + zuz;
      if (format === 'csv') ctrlUiStahni(new Blob([ctrlExportCsv(o.exporty, o.data, opts)], { type: 'text/csv;charset=utf-8' }), jmeno + '.csv');
      else ctrlUiStahni(xlsxZapis(ctrlExportListy(o.exporty, o.data, opts)), jmeno + '.xlsx');
      const radku = o.exporty.reduce((a, e) => a + e.radky.length, 0);
      ctrlUiZprava('Staženo ' + jmeno + '.' + format + ' — ' + o.exporty.length + ' '
        + (o.exporty.length === 1 ? 'zakázka' : (o.exporty.length < 5 ? 'zakázky' : 'zakázek')) + ', ' + radku + ' řádků'
        + (o.preskoceno && o.preskoceno.length ? '; přeskočeno ' + o.preskoceno.length + ' (důvody v listu Popis)' : '') + '.');
    }
    await ctrlUiProtokolNacti();
  } catch (e) { ctrlUiZprava('Hromadný export se nepovedl: ' + e.message, true); }
  finally { CTRL_STAV.pracuje = false; ctrlUiPrekresli(); }
}
function ctrlUiKartaHromadny() {
  const h = ctrlUiHrom();
  if (CTRL_STAV.protokol === null) { CTRL_STAV.protokol = []; setTimeout(ctrlUiProtokolNacti, 0); }
  const sel = (id, pole, volby) => `<select id="${id}" onchange="ctrlUiHromSet('${pole}', this.value)">${volby.map(([v, t]) =>
    `<option value="${v}"${h[pole] === v ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
  const prot = (CTRL_STAV.protokol || []).slice(0, 10).map(z => `<tr><td>${esc(new Date(z.kdy).toLocaleString('cs-CZ'))}</td>
      <td>${esc(z.kdo || '')}</td><td>${esc(z.od || '')} – ${esc(z.do || '')}</td>
      <td>${esc({ ock: 'OCK', proj: 'PROJ' }[z.oblast] || 'obě')}</td><td>${esc({ cr: 'ČR', zahr: 'ZAHR' }[z.rada] || 'obě')}</td>
      <td>${+z.zakazek || 0}</td><td>${+z.radku || 0}</td></tr>`).join('');
  return `<div class="sec-title" style="margin-top:14px">Hromadně za období</div>
    <div class="note">Všechny <b>zamčené řídící varianty</b>, jejichž nabídka byla zamčena (odeslána) v zadaném období —
      částky ze zmrazeného výsledku tisku. Počítá server; soubor má stejné listy a sloupce jako export jedné zakázky.
      Každý export se zapíše do protokolu.</div>
    <div class="btns" style="margin:8px 0;align-items:center">
      <label>od <input type="date" id="ctrlHromOd" value="${esc(h.od)}" onchange="ctrlUiHromSet('od', this.value)"></label>
      <label>do <input type="date" id="ctrlHromDo" value="${esc(h.do)}" onchange="ctrlUiHromSet('do', this.value)"></label>
      ${sel('ctrlHromOblast', 'oblast', [['obe', 'OCK i PROJ'], ['ock', 'jen OCK'], ['proj', 'jen PROJ']])}
      ${sel('ctrlHromRada', 'rada', [['obe', 'ČR i ZAHR'], ['cr', 'jen ČR'], ['zahr', 'jen ZAHR']])}
      <button class="primary" id="ctrlHromXlsx" onclick="ctrlUiHromadny('xlsx')" ${CTRL_STAV.pracuje ? 'disabled' : ''}>⤓ Za období (.xlsx)</button>
      <button id="ctrlHromCsv" onclick="ctrlUiHromadny('csv')" ${CTRL_STAV.pracuje ? 'disabled' : ''}>⤓ CSV</button></div>
    ${prot ? `<div class="note">Poslední exporty za období:</div><div style="overflow-x:auto"><table class="ceniktbl" id="ctrlProtokol">
      <tr><th>Kdy</th><th>Kdo</th><th>Období</th><th>Oblast</th><th>Řada</th><th>Zakázek</th><th>Řádků</th></tr>${prot}</table></div>`
      : '<div class="note" id="ctrlProtokolPrazdny">Protokol exportů je zatím prázdný.</div>'}`;
}

/* ---------- kreslení ---------- */
function ctrlUiSelectSkupiny(hodnota, onchange, id, sNenaklad) {
  const sk = (CTRL_STAV.data ? CTRL_STAV.data.skupiny : CTRL_SKUPINY_VYCHOZI);
  const volby = sk.map(s => `<option value="${esc(s.id)}"${s.id === hodnota ? ' selected' : ''}>${esc(s.nazev)}</option>`).join('')
    + (sNenaklad ? `<option value="${CTRL_NENI_NAKLAD}"${hodnota === CTRL_NENI_NAKLAD ? ' selected' : ''}>— není náklad —</option>` : '');
  return `<select${id ? ` id="${esc(id)}"` : ''} onchange="${onchange}">${volby}</select>`;
}
function ctrlUiKartaSkupiny() {
  const d = CTRL_STAV.data;
  /* Volby jsou literály z kódu (typ, chování, oblast); escapují se i tak. */
  const sel = (i, pole, hodnoty, akt) => `<select onchange="ctrlUiSkupina(${+i}, '${escJs(pole)}', this.value)">${hodnoty.map(([v, t]) =>
    `<option value="${esc(v)}"${v === akt ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  const radky = d.skupiny.map((s, i) => `<tr data-ctrl-skupina="${esc(s.id)}">
      <td><code>${esc(s.id)}</code></td>
      <td><input value="${esc(s.nazev)}" style="min-width:16em" onchange="ctrlUiSkupina(${i}, 'nazev', this.value)"></td>
      <td><input value="${esc(s.manVysl || '')}" onchange="ctrlUiSkupina(${i}, 'manVysl', this.value)"></td>
      <td><input value="${esc((s.ucetNyni || []).join(', '))}" size="14" onchange="ctrlUiSkupina(${i}, 'ucetNyni', this.value)"></td>
      <td><input value="${esc((s.ucetBudouci || []).join(', '))}" size="14" onchange="ctrlUiSkupina(${i}, 'ucetBudouci', this.value)"></td>
      <td>${sel(i, 'typ', [['primy', 'přímý'], ['neprimy', 'nepřímý']], s.typ)}</td>
      <td>${sel(i, 'chovani', [['variabilni', 'variabilní'], ['fixni', 'fixní']], s.chovani)}</td>
      <td>${sel(i, 'oblast', [['ock', 'OCK'], ['proj', 'PROJ'], ['obe', 'obě']], s.oblast)}</td>
      <td class="noprint">${s.id === CTRL_NEZARAZENO ? '<span class="note">nejde zrušit</span>'
        : `<button class="mini" onclick="ctrlUiSmazSkupinu(${i})" title="zrušit skupinu">✕</button>`}</td>
    </tr>`).join('');
  return `<div class="note">Kapitoly nákladů pro porovnání předkalkulace se skutečností v Reporting CZ. Výchozí obsah je
      rozvržení A. Mácové (15. 9. 2026) a rozhodnutí J. V. z 20. 10. 2026. Účty Helios oddělujte čárkou.
      Identifikátor skupiny se nemění ani při přejmenování — podle něj se páruje export.</div>
    <div style="overflow-x:auto"><table class="ceniktbl" id="ctrlSkupiny"><tr><th>Id</th><th>Název</th><th>Položka v ManVysl</th>
      <th>Účet Helios nyní</th><th>Účet Helios budoucí</th><th>Typ nákladu</th><th>Chování</th><th>Oblast</th><th class="noprint"></th></tr>
      ${radky}</table></div>
    <div class="btns" style="margin-top:8px"><button onclick="ctrlUiPridejSkupinu()">+ přidat skupinu</button></div>`;
}
/* Všechny klíče, které se mapují: ceník, pseudo-klíče, trvalé položky
 * katalogu OCK a ceníku PROJ otevřené varianty a zařazení uložená dřív. */
function ctrlUiKlice() {
  const k = ctrlKliceCeniku().concat(Object.keys(CTRL_MAPA_VYCHOZI))
    .concat(ctrlKliceKatalogu(typeof KATALOG !== 'undefined' ? KATALOG : null, typeof PC !== 'undefined' ? PC : null))
    .concat(Object.keys((CTRL_STAV.data && CTRL_STAV.data.mapa) || {}));
  return k.filter((x, i, a) => a.indexOf(x) === i);
}
function ctrlUiNezarazene() {
  if (!CTRL_STAV.data) return [];
  return ctrlNezarazene(CTRL_STAV.data, ctrlKliceKatalogu(typeof KATALOG !== 'undefined' ? KATALOG : null, typeof PC !== 'undefined' ? PC : null));
}
function ctrlUiKartaMapa() {
  const d = CTRL_STAV.data;
  const nazvy = ctrlUiKatalogNazvy();
  const nez = ctrlUiNezarazene();
  const hledej = String(CTRL_STAV.hledej || '').toLowerCase();
  const radky = ctrlUiKlice().map(k => ({ k, p: ctrlPopisKlice(k, nazvy) }))
    .filter(x => CTRL_STAV.oblast === 'vse' || x.p.oblast === CTRL_STAV.oblast)
    .filter(x => !CTRL_STAV.jenNezarazene || nez.includes(x.k))
    .filter(x => !hledej || (x.k + ' ' + x.p.nazev + ' ' + x.p.sekce).toLowerCase().includes(hledej));
  const tab = radky.map(({ k, p }) => {
    const g = Object.prototype.hasOwnProperty.call(d.mapa, k) ? d.mapa[k]
      : (k.startsWith('K.') ? ctrlSkupinaKlice(d.mapa, k, '').skupina : CTRL_NEZARAZENO);
    const stit = nez.includes(k) ? ' <span class="pill warn">nezařazeno</span>'
      : (CTRL_MAPA_VYCHOZI[k] !== undefined && CTRL_MAPA_VYCHOZI[k] !== g ? ' <span class="pill">upraveno</span>' : '');
    return `<tr data-ctrl-klic="${esc(k)}"><td><code>${esc(k)}</code></td><td style="white-space:normal">${esc(p.nazev)}${stit}</td>
      <td>${esc(p.oblast.toUpperCase())}</td><td style="white-space:normal">${esc(p.sekce)}</td><td>${esc(p.jednotka)}</td>
      <td>${ctrlUiSelectSkupiny(g, `ctrlUiMapa('${escJs(k)}', this.value)`, '', true)}</td></tr>`;
  }).join('');
  const imp = CTRL_STAV.import;
  const impHtml = imp ? `<div style="margin:10px 0;padding:10px;border:1px solid var(--line);border-radius:8px" id="ctrlImport">
      <div class="sec-title">Nahraný soubor ${esc(imp.soubor)}</div>
      <div class="note">${imp.zmeny.length ? `<b>${imp.zmeny.length}</b> změn proti pracovní kopii: `
        + imp.zmeny.slice(0, 15).map(z => esc(z.klic) + ' (' + esc(z.z || '—') + ' → ' + esc(z.na) + ')').join(', ')
        + (imp.zmeny.length > 15 ? ' a další' : '') : 'Soubor se od pracovní kopie neliší.'}</div>
      ${imp.chyby.length ? `<div class="note" style="color:var(--red, #c0392b)">Nepřevezme se: ${imp.chyby.slice(0, 10).map(esc).join(' · ')}${imp.chyby.length > 10 ? ' …' : ''}</div>` : ''}
      <div class="btns" style="margin-top:6px">${imp.zmeny.length ? `<button class="primary" id="ctrlImportPrevezmi" onclick="ctrlUiImportPrevezmi()">Převzít ${imp.zmeny.length} změn</button>` : ''}
        <button onclick="ctrlUiImportZrus()">Zahodit soubor</button></div></div>` : '';
  return `<div class="note">Každá položka ceníku se řadí do skupiny podle svého <b>klíče</b> (ne podle názvu). Položky
      ceníku mají výchozí zařazení v aplikaci; <b>trvalé položky</b> přidané do ceníku či katalogu je potřeba zařadit
      ručně — do té doby se v exportu přidrží výchozí skupiny své sekce a jsou označené jako nezařazené.
      „Není náklad" = přirážky, DPH, počty hodin a výchozí hodnoty zadání.</div>
    <div class="btns" style="margin:8px 0;align-items:center">
      <select id="ctrlOblast" onchange="CTRL_STAV.oblast=this.value;ctrlUiPrekresli()">
        ${[['vse', 'OCK i PROJ'], ['ock', 'jen OCK'], ['proj', 'jen PROJ']].map(([v, t]) =>
          `<option value="${v}"${CTRL_STAV.oblast === v ? ' selected' : ''}>${t}</option>`).join('')}</select>
      <label><input type="checkbox" id="ctrlJenNez" ${CTRL_STAV.jenNezarazene ? 'checked' : ''}
        onchange="CTRL_STAV.jenNezarazene=this.checked;ctrlUiPrekresli()"> jen nezařazené (${nez.length})</label>
      <input id="ctrlHledej" placeholder="hledat klíč nebo název…" value="${esc(CTRL_STAV.hledej)}"
        onchange="CTRL_STAV.hledej=this.value;ctrlUiPrekresli()">
      <button onclick="ctrlUiMapaXlsx()">⤓ Stáhnout mapování (.xlsx)</button>
      <button onclick="ctrlUiMapaImport()">⤒ Nahrát mapování (.xlsx)</button></div>
    ${impHtml}
    <div style="overflow-x:auto"><table class="ceniktbl" id="ctrlMapa"><tr><th>Klíč</th><th>Název</th><th>Oblast</th><th>Sekce</th>
      <th>Jednotka</th><th>Skupina</th></tr>${tab || '<tr><td colspan="6" class="note">Filtru nic neodpovídá.</td></tr>'}</table></div>`;
}
function ctrlUiKartaExport() {
  const { zak, v } = ctrlUiExportVarianta();
  const zamek = v && v.zamek && v.zamek.zamceno ? v.zamek : null;
  const cislo = zak ? String(zak.cislo || '') : '';
  const stav = !zak || !v ? 'Není otevřená žádná zakázka.'
    : !zamek ? `Řídící varianta zakázky <b>${esc(cislo || 'bez čísla')}</b> není zamčená — exportuje se jen odeslaná
        (zamčená) nabídka (rozhodnutí J. V. 20. 10. 2026). Zamyká se prvním tiskem nabídky.`
    : `Zakázka <b>${esc(cislo)}</b> — ${esc(zak.nazevAkce || '')}; řídící varianta zamčena
        ${esc(new Date(zamek.kdy).toLocaleString('cs-CZ'))}${zamek.vysledek ? ' (výsledek zmrazený při tisku)'
          : ' — <b>bez zmrazeného výsledku</b> (nabídka před 15. 9. 2026), počítá se dnešním výpočtem'}.`;
  const p = CTRL_STAV.db && CTRL_STAV.db.platny;
  return `<div class="note">Předkalkulace otevřené zakázky po kapitolách — pro porovnání se skutečností v Reporting CZ.
      Exportuje se <b>řídící zamčená varianta</b>: částky jsou zmrazené z okamžiku odeslání nabídky, změna ceníku je
      už neovlivní. Vše v <b>Kč bez DPH</b>, i u zahraniční řady. Řadí se podle <b>uloženého</b> mapování
      (${p ? 'verze ' + esc(p.verze) : 'výchozí rozvržení'}).</div>
    <div class="note" id="ctrlExportStav" style="margin-top:8px">${stav}</div>
    <div class="btns" style="margin-top:8px">
      <button class="primary" id="ctrlExportXlsx" onclick="ctrlUiExport('xlsx')" ${zamek ? '' : 'disabled'}>⤓ Stáhnout předkalkulaci (.xlsx)</button>
      <button id="ctrlExportCsv" onclick="ctrlUiExport('csv')" ${zamek ? '' : 'disabled'}>⤓ CSV (list Řádky)</button></div>
    <div class="note">Sešit má listy <b>Řádky</b> (jeden řádek kalkulace: klíč, skupina, účty, množství, jednotková
      a celková nákladová cena, prodejní cena), <b>Kapitoly</b> (součty po skupinách a souhrn zakázky se slevou,
      zaokrouhlením a marží) a <b>Popis</b> (verze struktury souboru, kdo a kdy exportoval, číselník).
      Příplatky jsou nabídnuté volby — jsou v exportu označené a do nákladu základní ceny se nepočítají.
      Export otevřené zakázky jde spustit i z Přehledu cenových nabídek (tlačítko u zamčené řídící varianty).</div>
    ${ctrlUiKartaHromadny()}`;
}
function nastControlling() {
  if (!ctrlUiSmi()) return `<div class="note">Controlling je dostupný <b>jen administrátorovi přihlášenému online</b>
      — číselník i mapování leží na serveru.</div>`;
  if (!ctrlUiServer()) return `<div class="note">Controlling leží na serveru — otevřete aplikaci z webu (ne ze souboru).</div>`;
  if (!CTRL_STAV.nacteno) { ctrlUiNactiBrzy(); return `<div class="note">Načítám controlling ze serveru…</div>`; }
  if (CTRL_STAV.chyba && !CTRL_STAV.data) return `<div class="note" style="color:var(--red, #c0392b)">Controlling se nepodařilo
      načíst: ${esc(CTRL_STAV.chyba)}</div><div class="btns"><button onclick="CTRL_STAV.nacteno=false;ctrlUiNacti()">Zkusit znovu</button></div>`;
  const p = CTRL_STAV.db && CTRL_STAV.db.platny;
  const datum = (x) => { const dd = new Date(x); return isNaN(dd) ? esc(x || '') : esc(dd.toLocaleString('cs-CZ')); };
  const info = p ? `Platí <b>verze ${esc(p.verze)}</b> — uložil ${esc(p.kdo || '')} ${datum(p.kdy)}${p.poznamka ? ' (' + esc(p.poznamka) + ')' : ''}.`
    : 'Zatím neuložena žádná verze — platí <b>výchozí rozvržení</b> z aplikace.';
  const zmeneno = ctrlUiZmeneno();
  const nez = ctrlUiNezarazene().length;
  const karta = { skupiny: ctrlUiKartaSkupiny, mapa: ctrlUiKartaMapa, export: ctrlUiKartaExport }[CTRL_STAV.karta] || ctrlUiKartaSkupiny;
  const tlac = (k, t) => `<button id="ctrlKarta_${k}" ${CTRL_STAV.karta === k ? 'class="primary"' : ''}
      onclick="CTRL_STAV.karta='${k}';ctrlUiPrekresli()">${t}</button>`;
  return `<div class="note" id="ctrlInfo">${info}</div>
    <div class="btns" style="margin:8px 0">${tlac('skupiny', 'Nákladové skupiny')}${tlac('mapa', 'Mapování položek'
      + (nez ? ` <span class="pill warn">${nez} nezařazené</span>` : ''))}${tlac('export', 'Export předkalkulace')}</div>
    ${karta()}
    <div class="btns" style="margin-top:12px;border-top:1px solid var(--line);padding-top:8px">
      <button class="primary" id="ctrlUloz" onclick="ctrlUiUloz()" ${zmeneno && !CTRL_STAV.pracuje ? '' : 'disabled'}>Uložit jako novou verzi</button>
      <button id="ctrlZahod" onclick="ctrlUiZahod()" ${zmeneno ? '' : 'disabled'}>Zahodit změny</button>
      <span class="note" id="ctrlZmeneno">${zmeneno ? 'Jsou neuložené změny — ostatním platí až po uložení.' : 'Odpovídá uložené verzi.'}</span></div>
    <div class="note" id="ctrlStav" style="margin-top:6px;${CTRL_STAV.hlaskaChyba ? 'color:var(--red, #c0392b)' : ''}">${esc(CTRL_STAV.hlaska || '')}</div>`;
}

/* ---------- J5: upozornění u zveřejnění ceníku ----------
 * Rozhodnutí J. V. 20. 10. 2026: nezařazená položka zveřejnění ceníku
 * NEBLOKUJE — upozorní se a položku jde zařadit rovnou tady. Ceníkové
 * klíče mají výchozí zařazení v kódu (hlídá src/test_controlling.js), takže
 * se tu objevují jen trvalé položky přidané administrátorem. */
function ctrlUpozorneniBlok() {
  if (!ctrlUiSmi() || !CTRL_STAV.nacteno || !CTRL_STAV.data) return '';
  const nez = ctrlUiNezarazene();
  if (!nez.length) return '';
  const nazvy = ctrlUiKatalogNazvy();
  const vyber = nez.map(k => {
    const p = ctrlPopisKlice(k, nazvy);
    const g = ctrlSkupinaKlice(CTRL_STAV.data.mapa, k, '').skupina;
    return `<div class="btns" style="align-items:center;margin:4px 0" data-ctrl-nezarazeno="${esc(k)}">
      <span>${esc(p.nazev)} <code>${esc(k)}</code></span>
      ${ctrlUiSelectSkupiny(g, `ctrlUiMapa('${escJs(k)}', this.value)`, '', true)}</div>`;
  }).join('');
  return `<div class="${zapisTridaHlasky('varovani')}" id="ctrlUpozorneni" style="margin-top:10px">
      <b>Controlling:</b> ${nez.length} ${nez.length === 1 ? 'trvalá položka nemá' : 'trvalých položek nemá'} nákladovou skupinu.
      Zveřejnění to neblokuje; v exportu předkalkulace se do zařazení přidrží výchozí skupiny své sekce.
      ${vyber}
      <div class="btns" style="margin-top:6px"><button id="ctrlUpozorneniUloz" onclick="ctrlUiUloz()">Uložit zařazení</button>
        <span class="note">(uloží se jako nová verze controllingu, Nastavení → Controlling)</span></div></div>`;
}
