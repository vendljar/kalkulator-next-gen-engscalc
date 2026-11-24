/* ================= ZÁLOŽKA ZÁKAZNÍCI (#162, 20. 8. 2026) =================
 *
 * Obrazovka nad databází zákazníků. Model (co je karta, jak se kopíruje do
 * zakázky, co se s čím porovnává) drží src/zakaznici.js — tady je jen
 * hledání, formulář a tlačítka.
 *
 * PRAVIDLO, KTERÉ SE TU NESMÍ PORUŠIT: karta zákazníka jen PŘEDVYPLŇUJE.
 * Do zakázky se zapíše až na kliknutí a zpátky do karty se nic nevrací samo —
 * jedna překlepnutá zakázka by jinak rozbila údaje všem ostatním.
 * ======================================================================== */

const ZAK_DB = {
  seznam: [],           // stažené karty
  nacteno: false,
  nacita: false,        // běží dotaz na server? (proti dvojímu načtení)
  hledat: '',
  otevreny: null,       // rozpracovaná karta (kopie, ne odkaz do seznamu)
  novy: false,
  hlaska: '',
  pracuje: false,
  kontaktVolba: '',     // v které hlavičce ('ock'/'proj') čeká výběr kontaktní osoby
  historie: null,       // B234: načtená historie verzí otevřené karty (null = nenačteno)
};

/* ---------- našeptávání v poli „Zákazník" (22. 8. 2026, zadání J. V.) -------
 *
 * Táž mechanika jako u vyhledávání nabídek (naseptavacFiltr v online_ui.js),
 * jen jiný zdroj: jména z KARTOTÉKY zákazníků a k tomu zákazníci z rejstříku
 * zakázek — kdo v kartotéce ještě není, ale nabídku už dostal, se má
 * napovědět taky.
 *
 * VÝBĚREM SE DOTÁHNE ZBYTEK HLAVIČKY (23. 8. 2026, zadání J. V.: „po načtení
 * z našeptávače se stále do hlavičky nedotahuje kontaktní osoba a IČO").
 * Do té doby se vyplnil jen název, aby výběr nepřepsal už zapsané údaje —
 * jenže pak se muselo klikat ještě na „Vybrat z databáze zákazníků" a nebylo
 * poznat, proč se jednou dotáhne všechno a podruhé nic. Řeší to
 * `zakaznikPredvypln()`: doplní se jen PRÁZDNÁ pole a kontaktní osoba jen
 * tehdy, když je jednoznačná; víc jmen se nabídne k výběru. Kdo chce hlavičku
 * přepsat celou, má na to pořád tlačítko.
 *
 * Dvě hlavičky (OCK a PROJ) jsou v dokumentu obě, proto se box rozlišuje
 * příponou — dvě stejná id by byla chyba. */
function naseptavacZakazniciHodnoty() {
  const videno = {};
  const out = [];
  const pridej = (h) => {
    const t = String(h == null ? '' : h).trim();
    if (!t || videno[t.toLowerCase()]) return;
    videno[t.toLowerCase()] = true;
    out.push(t);
  };
  (typeof ZAK_DB !== 'undefined' ? (ZAK_DB.seznam || []) : []).forEach(z => pridej(z && z.nazev));
  (typeof ONLINE_STAV !== 'undefined' ? (ONLINE_STAV.rejstrik || []) : []).forEach(z => pridej(z && z.objednatel));
  return out;
}

function naseptavacZakKresli(kde, dotaz) {
  const el = document.getElementById('naseptBoxZak_' + kde);
  if (!el) return;
  if (typeof ZAK_DB !== 'undefined' && ZAK_DB.kontaktVolba === kde) {
    if (el.style.display !== 'none' && el.innerHTML.indexOf('Kontaktní osoba') >= 0) return;   // výběr kontaktu čeká
    ZAK_DB.kontaktVolba = '';
  }
  const slova = (typeof uloSlova === 'function') ? uloSlova(dotaz) : [];
  const n = !slova.length ? [] : naseptavacZakazniciHodnoty().filter(h => {
    const t = uloNorm(h);
    return h.toLowerCase() !== String(dotaz).trim().toLowerCase()
      && slova.every(x => t.indexOf(x) >= 0);
  }).slice(0, 10);
  if (!n.length) { el.style.display = 'none'; el.innerHTML = ''; return; }
  el.innerHTML = n.map(h => `<div class="nasept-radek"
    onmousedown="naseptavacZakVyber('${escJs(h)}','${kde}')">${esc(h)}</div>`).join('');
  el.style.display = '';
}

function naseptavacZakSchovej(kde) {
  setTimeout(() => {
    /* Výběr kontaktní osoby čeká na kliknutí — blur políčka ho nesmí zavřít. */
    if (typeof ZAK_DB !== 'undefined' && ZAK_DB.kontaktVolba === kde) return;
    const el = document.getElementById('naseptBoxZak_' + kde);
    if (el) el.style.display = 'none';
  }, 150);
}

/* Výběr firmy z našeptávače. Vyplní se název a — je-li firma v kartotéce —
 * rovnou i IČO, DIČ, sídlo a kontaktní osoba, ale JEN do prázdných polí
 * hlavičky (zakázka je pán, přepsané údaje se nepřebíjejí). Má-li karta víc
 * jmen (kontaktní osoba, zástupci smluvní/obchodní/technický), nabídne se
 * výběr v témže boxu pod polem Zákazník; do té doby zůstane pole Kontaktní
 * osoba prázdné — nic se nevybírá potichu. Firma jen z rejstříku zakázek
 * (bez karty) vyplní název sama, jako dřív. `kde` je 'ock' / 'proj'.
 *
 * Celý přepis hlavičky podle karty dělá dál tlačítko „Vybrat z databáze
 * zákazníků" — tam je to vědomé rozhodnutí, tady jen výpomoc. */
function naseptavacZakKarta(nazev) {
  const n = String(nazev || '').trim().toLowerCase();
  return ((typeof ZAK_DB !== 'undefined' && ZAK_DB.seznam) || [])
    .find(z => z && String(z.nazev || '').trim().toLowerCase() === n) || null;
}
/* CÍL ÚDAJŮ ZÁKAZNÍKA (VZ-E1 #600): kam se zapisuje výběr z našeptávače
 * a z karty zákazníka. Bez víc zákazníků je to hlavička zakázky (ZAK) jako
 * vždy; vzZakaznikCil (vice_zakazniku_ui.js) vrací formulář nového zákazníka
 * nebo otevřeného dalšího zákazníka — se stejnými klíči jako hlavička. */
function zakazniciCil(kde) {
  const vz = typeof vzZakaznikCil === 'function' ? vzZakaznikCil(kde) : null;
  if (vz) return vz;
  return {
    zak: ZAK,
    set: (k, v) => set('ZAK.' + k, v),
    zmrazeno: () => (typeof zamekZakCestaZmrazena === 'function' ? zamekZakCestaZmrazena(ZAK, 'ZAK.objednatel') : ''),
    /* VZ-F2 (#660): IČO jiného zákazníka zakázky (jen víc zákazníků). */
    icoDuvod: ico => (typeof vzIcoDuvod === 'function' && typeof vzRidiciId === 'function' ? vzIcoDuvod(vzRidiciId(ZAK), ico) : ''),
  };
}
/* VZ-F2 (#660): převzetí karty by zákazníkovi dalo IČO jiného zákazníka
 * zakázky → hláška a true (nic se nezapíše). `jenPrazdne` = našeptávač,
 * který IČO doplní jen do prázdného pole. */
function zakazniciIcoStop(cil, karta, jenPrazdne) {
  if (!cil || typeof cil.icoDuvod !== 'function' || !karta) return false;
  if (jenPrazdne && String((cil.zak && cil.zak.ico) || '').trim()) return false;
  const duvod = cil.icoDuvod(karta.ico);
  if (!duvod) return false;
  if (typeof hlaska === 'function') hlaska(duvod);
  render();
  return true;
}
function naseptavacZakVyber(hodnota, kde) {
  const cil = zakazniciCil(kde);
  const karta = naseptavacZakKarta(hodnota);
  if (!karta || typeof zakaznikPredvypln !== 'function') { cil.set('objednatel', hodnota); return; }
  if (!cil.formular && typeof zamekStop === 'function' && zamekStop()) return;
  /* Z1: po smlouvě o dílo kterékoli varianty se údaje zákazníka v hlavičce
   * nemění (zamekZakCestaZmrazena) — i když je otevřený nezamčený klon. */
  const zmrazeno = cil.zmrazeno();
  if (zmrazeno) {
    if (typeof hlaska === 'function') hlaska(zmrazeno);
    render(); return;
  }
  if (typeof nahledStop === 'function' && nahledStop('dotažení zákazníka do hlavičky')) return;
  if (zakazniciIcoStop(cil, karta, true)) return;
  const zak = cil.zak;
  const v = zakaznikPredvypln(karta, zak);
  if (v.zmeny.indexOf('objednatel') < 0) zak.objednatel = hodnota;   // název se vybral výslovně
  cil.set('objednatel', zak.objednatel);                             // zámek, razítko, render
  if (v.kontakty.length) naseptavacZakKontaktyNabidni(kde, v.kontakty);
}
function naseptavacZakKontaktyNabidni(kde, kontakty) {
  kde = kde || 'ock';
  const el = document.getElementById('naseptBoxZak_' + kde);
  if (!el) return;
  ZAK_DB.kontaktVolba = kde;
  el.innerHTML = `<div class="nasept-radek" style="font-weight:600;cursor:default">Kontaktní osoba — vyberte:
      <span style="float:right;font-weight:400;cursor:pointer" onmousedown="naseptavacZakKontaktVyber('','${kde}')" title="nechat prázdné">✕</span></div>`
    + kontakty.map(k => `<div class="nasept-radek" onmousedown="naseptavacZakKontaktVyber('${escJs(k.jmeno)}','${kde}')">${esc(k.jmeno)}
      <span style="color:#64748b;font-size:.85em"> · ${esc(k.role)}${k.tel ? ' · ' + esc(k.tel) : ''}${k.email ? ' · ' + esc(k.email) : ''}</span></div>`).join('');
  el.style.display = '';
  /* Box žije mimo render — po překreslení hlavičky by zmizel, proto se
   * znovu nasadí o krok později (render už proběhl v set()). */
  setTimeout(() => {
    const el2 = document.getElementById('naseptBoxZak_' + (kde || 'ock'));
    if (el2 && el2 !== el) { el2.innerHTML = el.innerHTML; el2.style.display = ''; }
  }, 0);
}
function naseptavacZakKontaktVyber(jmeno, kde) {
  ZAK_DB.kontaktVolba = '';
  if (jmeno) zakazniciCil(kde).set('kontakt', jmeno);
  naseptavacZakSchovej(kde || 'ock');
}

/* Kartotéka se stahuje, teprve když je otevřená záložka Zákazníci — jenže
 * našeptávač v hlavičce ji potřebuje dřív. Tohle je proto tichý dotaz při
 * prvním kliknutí do pole Zákazník: nic nekreslí, jen naplní seznam. */
function zakazniciNactiProNaseptavac() {
  if (typeof zakazniciMozne !== 'function' || !zakazniciMozne()) return;
  if (ZAK_DB.nacteno || ZAK_DB.nacita) return;
  zakazniciNacti();
}

function zakazniciMozne() {
  return typeof onlineApi === 'function' && typeof ONLINE_STAV !== 'undefined'
    && ONLINE_STAV.bezi && !!ONLINE_STAV.ja;
}

/* Načtení seznamu. Dvě pojistky, obě nutné (nález při zkoušce 20. 8. 2026):
 *  1) `nacteno` se nastaví i při NEÚSPĚCHU. Kdyby zůstalo false, další
 *     render by načtení zkusil znovu — a protože se render volá i po
 *     doběhnutí dotazu, vznikla by nekonečná smyčka render → fetch →
 *     render, která umlčí i ostatní časovače (například automatické
 *     ukládání zakázky).
 *  2) `nacita` brání druhému souběžnému dotazu, než ten první doběhne. */
function zakazniciNacti() {
  if (!zakazniciMozne() || ZAK_DB.nacita) return Promise.resolve(false);
  ZAK_DB.nacita = true;
  return onlineApi('/api/zakaznici')
    .then(o => { ZAK_DB.seznam = o.zakaznici || []; return true; })
    .catch(e => { ZAK_DB.hlaska = 'Seznam zákazníků se nepodařilo načíst: ' + e.message; return false; })
    .then(v => { ZAK_DB.nacita = false; ZAK_DB.nacteno = true; render(); return v; });
}

function zakazniciHledani(q) { ZAK_DB.hledat = q; render(); }

function zakaznikOtevri(klic) {
  const z = ZAK_DB.seznam.find(x => zakaznikKlic(x) === klic);
  if (!z) return;
  ZAK_DB.otevreny = JSON.parse(JSON.stringify(z));   // kopie: zavření = zahození změn
  ZAK_DB.novy = false; ZAK_DB.hlaska = ''; ZAK_DB.historie = null; render();
}

function zakaznikZavri() { ZAK_DB.otevreny = null; ZAK_DB.novy = false; render(); }

function zakaznikNovyUI() {
  ZAK_DB.otevreny = zakaznikNovy(); ZAK_DB.novy = true; ZAK_DB.hlaska = ''; render();
}

/* Založit kartu z otevřené zakázky — nejčastější cesta, jak databáze vznikne
 * (zadání J. V.: začínáme na zelené louce, plní se novými zakázkami). */
function zakaznikZeZakazkyUI() {
  ZAK_DB.otevreny = zakaznikZeZakazky(zakazniciCil('ock').zak);
  ZAK_DB.novy = true;
  ZAK_DB.hlaska = 'Karta je předvyplněná z otevřené zakázky — projděte ji a uložte.';
  prepniTab('zakaznici'); render();
}

/* Po změně pole se PŘEKRESLUJE (21. 8. 2026). Bez toho zůstalo tlačítko
 * „Najít firmu v ARES" zhasnuté i po vyplnění IČO — jeho stav se počítá při
 * vykreslení a nic ho nepřepočítalo (hlášeno J. V.: „hledání v ARES u nového
 * zákazníka nefunguje"). `onchange` se spouští až po opuštění pole, takže
 * překreslení nikomu nebere rozepsaný text. */
function zakaznikSet(id, v) {
  if (!ZAK_DB.otevreny) return;
  ZAK_DB.otevreny[id] = v;
  render();
}

async function zakaznikUloz() {
  const z = ZAK_DB.otevreny;
  if (!z) return Promise.resolve(false);
  if (!zakaznikKlic(z)) {
    ZAK_DB.hlaska = 'Vyplňte aspoň název, nebo IČO — bez toho nemá karta klíč.';
    render(); return Promise.resolve(false);
  }
  const podobni = ZAK_DB.novy ? zakazniciPodobni(ZAK_DB.seznam, z) : [];
  if (podobni.length && !await potvrd('Podobného zákazníka už v seznamu máme:\n\n'
      + podobni.map(x => '• ' + (x.nazev || '?') + (x.ico ? ' (IČO ' + x.ico + ')' : '')).join('\n')
      + '\n\nOpravdu založit další kartu?')) return Promise.resolve(false);
  ZAK_DB.pracuje = true; render();
  return onlineApi('/api/zakaznici', { zakaznik: z })
    .then(o => {
      ZAK_DB.pracuje = false;
      const klic = o.klic;
      ZAK_DB.seznam = ZAK_DB.seznam.filter(x => zakaznikKlic(x) !== klic).concat([o.zakaznik]);
      ZAK_DB.otevreny = JSON.parse(JSON.stringify(o.zakaznik));
      ZAK_DB.novy = false;
      /* B234: cizí kartu server nepřepíše — úprava čeká jako návrh změny. */
      ZAK_DB.hlaska = o.navrh ? (o.zprava || 'Úprava se uložila jako návrh změny.')
        + ' Převezme ji autor karty nebo administrátor.' : 'Uloženo.';
      render(); return true;
    })
    .catch(e => { ZAK_DB.pracuje = false; ZAK_DB.hlaska = 'Neuloženo: ' + e.message; render(); return false; });
}

async function zakaznikSmaz() {
  const z = ZAK_DB.otevreny;
  if (!z || !jeAdminOnline()) return;
  const klic = zakaznikKlic(z);
  if (!await potvrd('Smazat kartu zákazníka „' + (z.nazev || klic) + '"?\n\n'
    + 'Zakázky zůstanou, ale údaje, které jste u něj jednou dohledali, se ztratí.')) return;
  onlineApi('/api/zakaznici?klic=' + encodeURIComponent(klic), null, 'DELETE')
    .then(() => {
      ZAK_DB.seznam = ZAK_DB.seznam.filter(x => zakaznikKlic(x) !== klic);
      ZAK_DB.otevreny = null; ZAK_DB.hlaska = 'Karta smazána.'; render();
    })
    .catch(e => { ZAK_DB.hlaska = 'Nesmazáno: ' + e.message; render(); });
}

/* ---------- návrhy změn a historie karty (B234, 21. 11. 2026) ---------- */
function zakaznikJaSmi(z) {
  const ja = (typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV.ja) || null;
  return typeof zakaznikSmiMenit === 'function' ? zakaznikSmiMenit(ZAK_DB.novy ? null : z, ja || {}) : true;
}
function zakaznikNavrhRozhodni(id, prijmout) {
  const z = ZAK_DB.otevreny;
  if (!z) return Promise.resolve(false);
  const klic = zakaznikKlic(z);
  ZAK_DB.pracuje = true; render();
  return onlineApi('/api/zakaznici', { akce: prijmout ? 'navrhPrijmout' : 'navrhZamitnout', klic, id })
    .then(o => {
      ZAK_DB.pracuje = false;
      ZAK_DB.seznam = ZAK_DB.seznam.filter(x => zakaznikKlic(x) !== o.klic).concat([o.zakaznik]);
      ZAK_DB.otevreny = JSON.parse(JSON.stringify(o.zakaznik));
      ZAK_DB.historie = null;
      ZAK_DB.hlaska = prijmout ? 'Návrh změny převzat do karty.' : 'Návrh změny zamítnut.';
      render(); return true;
    })
    .catch(e => { ZAK_DB.pracuje = false; ZAK_DB.hlaska = 'Neprovedeno: ' + e.message; render(); return false; });
}
function zakaznikHistorieUI() {
  const z = ZAK_DB.otevreny;
  if (!z || ZAK_DB.novy) return Promise.resolve(false);
  return onlineApi('/api/zakaznici?klic=' + encodeURIComponent(zakaznikKlic(z)) + '&historie=1')
    .then(o => { ZAK_DB.historie = Array.isArray(o.historie) ? o.historie : []; render(); return true; })
    .catch(e => { ZAK_DB.hlaska = 'Historii se nepodařilo načíst: ' + e.message; render(); return false; });
}
function zakaznikPolePopis(id) {
  const p = ZAKAZNIK_POLE.find(x => x.id === id);
  return p ? p.label : (id === 'poznamka' ? 'Interní poznámka' : id);
}
function zakaznikNavrhyHtml(z) {
  const n = (typeof zakaznikNavrhyOciste === 'function') ? zakaznikNavrhyOciste(z && z.navrhy) : [];
  const smi = zakaznikJaSmi(z);
  const radky = n.map(x => '<li style="margin:4px 0">' + esc(x.jmeno || x.kdo) + ' (' + esc(String(x.kdy).slice(0, 16).replace('T', ' ')) + '): '
    + Object.keys(x.zmeny).map(k => esc(zakaznikPolePopis(k)) + ' → „' + esc(x.zmeny[k]) + '“').join('; ')
    + (smi ? ' <button class="mini" onclick="zakaznikNavrhRozhodni(\'' + escJs(x.id) + '\', true)">Převzít</button>'
      + ' <button class="mini" onclick="zakaznikNavrhRozhodni(\'' + escJs(x.id) + '\', false)">Zamítnout</button>' : '')
    + '</li>').join('');
  const kdo = smi ? '' : '<div class="note">Kartu mění jen její autor' + (z && z.autor ? ' (' + esc(z.autor) + ')' : '')
    + ' a administrátor. Vaše úprava se po uložení zapíše jako návrh změny.</div>';
  return kdo + (n.length ? '<h3>Návrhy změn (' + n.length + ')</h3><ul style="margin:0;padding-left:20px;font-size:13px">' + radky + '</ul>' : '');
}
function zakaznikHistorieHtml() {
  const h = ZAK_DB.historie;
  if (!Array.isArray(h)) return '';
  if (!h.length) return '<h3>Historie verzí</h3><div class="note">Karta zatím nemá uloženou starší verzi.</div>';
  const rozdil = (a, b) => (typeof zakaznikZmenyPole === 'function' ? Object.keys(zakaznikZmenyPole(a, b)) : []).map(zakaznikPolePopis).join(', ');
  const radky = h.slice().reverse().map((x, i, arr) => {
    const novejsi = i === 0 ? ZAK_DB.otevreny : arr[i - 1].verze;
    return '<li style="margin:4px 0">' + esc(String(x.kdy || '').slice(0, 16).replace('T', ' ')) + ' · ' + esc(x.kdo || '?')
      + (x.proc ? ' (' + esc(x.proc) + ')' : '') + ' — změněno: ' + esc(rozdil(x.verze, novejsi) || '—') + '</li>';
  }).join('');
  return '<h3>Historie verzí (' + h.length + ')</h3><ul style="margin:0;padding-left:20px;font-size:13px">' + radky + '</ul>';
}

/* ---------- karta → otevřená zakázka ---------- */
function zakaznikDoZakazkyUI(klic, kde) {
  const z = ZAK_DB.seznam.find(x => zakaznikKlic(x) === klic)
    || (ZAK_DB.otevreny && zakaznikKlic(ZAK_DB.otevreny) === klic ? ZAK_DB.otevreny : null);
  if (!z) return;
  const cil = zakazniciCil(kde || 'ock');
  if (!cil.formular && typeof zamekStop === 'function' && zamekStop()) return;
  /* Z1: po smlouvě o dílo kterékoli varianty se údaje zákazníka v hlavičce
   * nemění (zamekZakCestaZmrazena) — i když je otevřený nezamčený klon. */
  const zmrazeno = cil.zmrazeno();
  if (zmrazeno) {
    if (typeof hlaska === 'function') hlaska(zmrazeno);
    render(); return;
  }
  if (typeof nahledStop === 'function' && nahledStop('přenesení zákazníka do zakázky')) return;
  if (zakazniciIcoStop(cil, z, false)) return;
  const n = zakaznikDoZakazky(z, cil.zak);
  if (typeof cil.poPrevzeti === 'function') { cil.poPrevzeti(n, z); return; }   // VZ: formulář / další zákazník
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  ZAK_DB.hlaska = n
    ? 'Do otevřené zakázky se přeneslo ' + n + ' údajů. Cokoli tam přepíšete, se do karty samo nevrátí.'
    : 'V zakázce už bylo všechno stejné — nic se nezměnilo.';
  render();
}

/* ---------- zakázka → karta (nabídne se, nevnucuje se) ---------- */
/* Volá se po uložení zakázky. Když se hlavička liší od karty, ukáže seznam
 * rozdílů a teprve na potvrzení je zapíše. Nikdy nic potichu. */
async function zakaznikNabidniAktualizaci() {
  if (!zakazniciMozne() || !ZAK.zakaznikId) return Promise.resolve(false);
  const z = ZAK_DB.seznam.find(x => zakaznikKlic(x) === ZAK.zakaznikId);
  if (!z) return Promise.resolve(false);
  const rozdily = zakaznikRozdily(z, ZAK);
  if (!rozdily.length) return Promise.resolve(false);
  const popis = rozdily.map(r => '• ' + r.label + ': „' + (r.karta || '—') + '" → „' + r.zakazka + '"').join('\n');
  if (!await potvrd('U zákazníka „' + (z.nazev || '?') + '" se v téhle zakázce liší '
      + rozdily.length + ' údajů:\n\n' + popis
      + '\n\nUložit je i do jeho karty (platí pro příští zakázky)?')) return Promise.resolve(false);
  const novy = zakaznikPrevezmi(JSON.parse(JSON.stringify(z)), rozdily);
  return onlineApi('/api/zakaznici', { zakaznik: novy })
    .then(o => {
      ZAK_DB.seznam = ZAK_DB.seznam.filter(x => zakaznikKlic(x) !== o.klic).concat([o.zakaznik]);
      return true;
    })
    .catch(() => false);
}

/* Převodník pro dotažení z ARES (21. 8. 2026). Karta má jiná jména polí než
 * hlavička zakázky (`nazev` × `objednatel`, `sidlo` × `adresaObjednatele`),
 * ale ARES umí pracovat s čímkoli, co ta čtyři pole má. Vrací proto objekt,
 * který do karty jen ukazuje: čtení i zápis jdou rovnou do ZAK_DB.otevreny,
 * takže se nikde nedrží druhá kopie, která by se mohla rozejít. */
function zakaznikAresHlavicka() {
  const z = ZAK_DB.otevreny || (ZAK_DB.otevreny = zakaznikNovy());
  const mapa = { objednatel: 'nazev', adresaObjednatele: 'sidlo', ico: 'ico', dic: 'dic' };
  const o = {};
  Object.keys(mapa).forEach(k => Object.defineProperty(o, k, {
    enumerable: true,
    get() { return z[mapa[k]]; },
    set(v) { z[mapa[k]] = v; },
  }));
  return o;
}

/* ---------- vykreslení ---------- */

function renderZakaznici() {
  const el = document.getElementById('page-zakaznici');
  if (!el) return;
  if (!zakazniciMozne()) {
    el.innerHTML = `<div class="card"><div class="body"><div class="note">Seznam zákazníků žije
      v online databázi — přihlaste se prosím.</div></div></div>`;
    return;
  }
  /* Seznam se stahuje, teprve když je záložka opravdu otevřená — jinak by
   * si každá relace tahala karty, i když k nim nikdo nejde. */
  if (!ZAK_DB.nacteno) {
    if (typeof TAB !== 'undefined' && TAB === 'zakaznici') zakazniciNacti();
    el.innerHTML = `<div class="card"><div class="body">
      <div class="note">Načítám zákazníky…</div></div></div>`;
    return;
  }

  el.innerHTML = ZAK_DB.otevreny ? zakaznikKartaHtml() : zakazniciSeznamHtml();
}

function zakazniciSeznamHtml() {
  /* ZK #755: panel hromadného naplnění jen správci — po odhlášení a přihlášení
   * jiné role se stav panelu (náhled, protokol) zahodí. */
  if (ZAK_DB.hromadne && !(typeof jeAdminOnline === 'function' && jeAdminOnline())) ZAK_DB.hromadne = null;
  const nalezeni = zakazniciHledej(ZAK_DB.seznam, ZAK_DB.hledat)
    .sort((a, b) => String(a.nazev || '').localeCompare(String(b.nazev || ''), 'cs'));
  const radek = z => {
    const klic = zakaznikKlic(z);
    return `<tr><td style="text-align:left"><b>${esc(z.nazev || '(bez názvu)')}</b></td>
      <td>${esc(z.ico || '—')}</td><td style="text-align:left">${esc(z.sidlo || '—')}</td>
      <td>${esc(String(zakazniciPocetZakazek(klic)))}</td>
      <td>${esc(String(z.upraven || '').slice(0, 10) || '—')}</td>
      <td><button class="mini" onclick="zakaznikOtevri('${escJs(klic)}')">Otevřít</button></td></tr>`;
  };
  return card('Zákazníci', `
    <div class="note">Údaje, které u zákazníka vyplníte jednou, se příště jen přenesou do zakázky —
      nemusíte je psát znovu a nemůžou se rozejít. <b>Zakázka je vždycky pán:</b> karta jen
      předvyplňuje a co v zakázce přepíšete, se sem samo nevrátí.</div>
    ${ZAK_DB.hlaska ? `<div class="note" style="color:var(--acc)">${esc(ZAK_DB.hlaska)}</div>` : ''}
    <!-- Hledání stojí od 21. 8. 2026 VLEVO u tlačítek (zadání J. V.).
         Mřížka řádku ho tlačila k pravému okraji obrazovky, kde ho nikdo
         nehledal — přitom je to první věc, kterou tu člověk dělá. -->
    <div class="btns" style="margin-top:8px;align-items:center">
      <input type="text" style="width:280px" value="${esc(ZAK_DB.hledat)}"
        placeholder="🔎 hledat: název, IČO nebo město…"
        oninput="ZAK_DB.hledat=this.value" onchange="zakazniciHledani(this.value)">
      <button onclick="zakaznikNovyUI()">+ Nový zákazník</button>
      <button class="mini" onclick="zakaznikZeZakazkyUI()">Založit z otevřené zakázky</button>
      <button class="mini" onclick="ZAK_DB.nacteno=false;renderZakaznici()">↻ Načíst znovu</button>
      ${typeof jeAdminOnline === 'function' && jeAdminOnline() ? '<button class="mini" onclick="zakazniciHromadneOtevri()">Naplnit ze zakázek (ARES)…</button>' : ''}
      <span class="note" style="margin-left:auto">${nalezeni.length} z ${ZAK_DB.seznam.length}</span>
    </div>
    ${ZAK_DB.hromadne ? zakazniciHromadneHtml() : ''}
    ${nalezeni.length ? `<table style="margin-top:10px">
      <tr><th style="text-align:left">Zákazník</th><th>IČO</th><th style="text-align:left">Sídlo</th>
        <th>Zakázek</th><th>Upraveno</th><th></th></tr>
      ${nalezeni.map(radek).join('')}</table>`
      : `<div class="note" style="margin-top:10px">${ZAK_DB.seznam.length
          ? 'Hledání nic nenašlo.'
          : 'Zatím tu není žádný zákazník. Nejrychlejší cesta: otevřete zakázku s vyplněnou '
            + 'hlavičkou a dejte <b>Založit z otevřené zakázky</b>.'}</div>`}
  `, false, 'zakaznici-seznam');
}

/* Kolik zakázek se na kartu odkazuje. Bere se z rejstříku zakázek, ať
 * nevzniká druhá evidence — ta by se rozešla. */
function zakazniciPocetZakazek(klic) {
  const r = (typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV.rejstrik) || null;
  const z = (r && r.zakazky) || [];
  const n = z.filter(x => x && x.zakaznikId === klic).length;
  return n || '—';
}

function zakaznikKartaHtml() {
  const z = ZAK_DB.otevreny;
  const klic = zakaznikKlic(z);
  const radek = p => `<div class="kl-row"><div class="lbl">${esc(p.label)}</div>
    <div><input type="text" value="${esc(z[p.id] == null ? '' : z[p.id])}"
      onchange="zakaznikSet('${escJs(p.id)}', this.value)"></div>
    <div class="src"><span class="note" style="font-size:10px">${p.zak ? 'hlavička zakázky' : 'krycí list'}</span></div></div>`;
  const skupina = (nadpis, ids) => `<h3>${esc(nadpis)}</h3>`
    + ZAKAZNIK_POLE.filter(p => ids.includes(p.id)).map(radek).join('');

  return `<div class="kl-doc">
    <h1>${esc(z.nazev || 'Nový zákazník')}</h1>
    ${ZAK_DB.hlaska ? `<div class="note" style="color:var(--acc)">${esc(ZAK_DB.hlaska)}</div>` : ''}
    <div class="btns noprint" style="margin-bottom:10px">
      <button class="mini" onclick="zakaznikZavri()">← Zpět na seznam</button>
    </div>
    <!-- Dotažení z ARES i tady (21. 8. 2026): vyplní název, sídlo a DIČ podle
         IČO. Nic nepřepíše bez potvrzení — panel ukáže „takhle to je / takhle
         to bude" úplně stejně jako v hlavičce zakázky. -->
    ${typeof aresRadek === 'function' ? aresRadek('zakaznik') : ''}
    ${skupina('Identifikace', ['nazev', 'sidlo', 'ico', 'dic', 'kontaktOsoba', 'zapis', 'banka', 'ucet'])}
    ${skupina('Zástupci a kontakty', ['smluvniJmeno', 'smluvniPozice', 'smluvniTel', 'smluvniEmail',
      'obchodniJmeno', 'obchodniTel', 'obchodniEmail',
      'technickyJmeno', 'technickyTel', 'technickyEmail', 'fakturyEmail', 'fakturyTel'])}
    <h3>Interní poznámka</h3>
    <div class="kl-row"><div class="lbl">Poznámka</div>
      <div><input type="text" value="${esc(z.poznamka || '')}" placeholder="např. platí spolehlivě, jedná přes správce…"
        onchange="zakaznikSet('poznamka', this.value)"></div>
      <div class="src"><span class="note" style="font-size:10px">nikam se netiskne</span></div></div>

    <div class="btns noprint" style="margin-top:14px">
      <button class="primary" ${ZAK_DB.pracuje ? 'disabled' : ''} onclick="zakaznikUloz()">Uložit zákazníka</button>
      ${typeof vzZakaznikKartaTlacitka === 'function' ? vzZakaznikKartaTlacitka(klic) : ''}<button style="background:#86e8ad;color:#0B2E6B;border-color:#5fcf92"
        onclick="zakaznikDoZakazkyUI('${escJs(klic)}')">${typeof vzZakaznikKartaPopis === 'function' ? esc(vzZakaznikKartaPopis()) : 'Přenést do otevřené zakázky'}</button>
      ${(!ZAK_DB.novy && typeof jeAdminOnline === 'function' && jeAdminOnline())
        ? `<button class="mini" onclick="zakaznikSmaz()">Smazat kartu…</button>` : ''}
      ${!ZAK_DB.novy ? `<button class="mini" onclick="zakaznikHistorieUI()">Historie verzí</button>` : ''}
    </div>
    ${zakaznikNavrhyHtml(z)}
    ${zakaznikHistorieHtml()}
    <div class="note" style="margin-top:6px">Klíč záznamu: <code>${esc(klic || '—')}</code>
      ${z.autor ? ' · založil ' + esc(z.autor) : ''}${z.upraven ? ' · upraveno ' + esc(String(z.upraven).slice(0, 10)) : ''}.
      Prázdné pole karty nikdy nic v zakázce nepřepíše.</div>
  </div>`;
}

/* ---------- naplnění ze zakázek podle ARES (ZK #755, J. V. 24. 11. 2026) ----------
 * Jen administrátor (server roli ověřuje sám, /api/zakaznici-ze-zakazek).
 * Nejdřív NÁHLED: server projde uložené zakázky, seskupí je podle IČO a pro
 * IČO bez karty ověří ARES (po kouscích — prohlížeč volá znovu, dokud náhled
 * není hotový). Karty se zakládají až po potvrzení a jen u položek „založit“;
 * nic existujícího se nepřepisuje, druhý běh nic nezaloží. */
const ZK_STAVY = [
  { stav: 'zalozit', popis: 'Založit' },
  { stav: 'nesedi', popis: 'Nesedí s ARES' },
  { stav: 'vypadek', popis: 'Zkusit znovu (ARES nedostupný / strop)' },
  { stav: 'existuje', popis: 'Už existuje' },
  { stav: 'zbyva', popis: 'Čeká na ověření' },
];
const zkN = x => esc(String(Math.round(+x || 0)));
function zakazniciHromadneOtevri() {
  if (!jeAdminOnline()) return Promise.resolve(false);
  ZAK_DB.hromadne = { navrh: null, protokol: [], bezi: false, hlaska: '' };
  render();
  return onlineApi('/api/zakaznici-ze-zakazek')
    .then(o => { ZAK_DB.hromadne.navrh = o.navrh || null; ZAK_DB.hromadne.protokol = o.protokol || []; render(); return true; })
    .catch(e => { ZAK_DB.hromadne.hlaska = 'Nepodařilo se načíst: ' + e.message; render(); return false; });
}
function zakazniciHromadneZavri() { ZAK_DB.hromadne = null; render(); }
async function zakazniciHromadneNahled(znovu) {
  const h = ZAK_DB.hromadne;
  if (!h || h.bezi) return false;
  h.bezi = true; h.hlaska = ''; render();
  try {
    let o = await onlineApi('/api/zakaznici-ze-zakazek', znovu && h.navrh ? { akce: 'nahled', id: h.navrh.id, znovu: true } : { akce: 'nahled' });
    for (let i = 0; i < 500 && o.navrh && o.navrh.faze !== 'hotovo' && ZAK_DB.hromadne === h; i++) {
      h.navrh = o.navrh; render();
      await new Promise(r => setTimeout(r, 300));
      o = await onlineApi('/api/zakaznici-ze-zakazek', { akce: 'nahled', id: o.navrh.id });
    }
    h.navrh = o.navrh;
  } catch (e) { h.hlaska = 'Náhled se přerušil: ' + e.message; }
  h.bezi = false; render();
  return true;
}
async function zakazniciHromadneZalozit() {
  const h = ZAK_DB.hromadne;
  if (!h || h.bezi || !h.navrh || (h.navrh.faze !== 'hotovo' && h.navrh.faze !== 'zapis')) return false;
  /* Revize ZK R1: zápis běží po kouscích; rozpracovaný (faze 'zapis') se jen dokončí. */
  if (h.navrh.faze === 'hotovo') {
    const n = h.navrh.pocty.zalozit;
    if (!n) { h.hlaska = 'V náhledu není nic k založení.'; render(); return false; }
    if (!await potvrd('Založit ' + n + ' karet zákazníků podle ARES?\n\nExistující karty se nemění. '
        + 'Položky „nesedí s ARES“ a „ARES nedostupný“ se nezaloží.')) return false;
  }
  h.bezi = true; h.hlaska = ''; render();
  const id = h.navrh.id;
  let v = null;
  try {
    let o = await onlineApi('/api/zakaznici-ze-zakazek', { akce: 'zalozit', id });
    for (let i = 0; i < 1000 && !o.hotovo && ZAK_DB.hromadne === h; i++) {
      v = o.vysledek; h.navrh = o.navrh || h.navrh; render();
      await new Promise(r => setTimeout(r, 200));
      o = await onlineApi('/api/zakaznici-ze-zakazek', { akce: 'zalozit', id });
    }
    v = o.vysledek || {};
    if (o.hotovo) {
      h.navrh = null;
      h.protokol = (h.protokol || []).filter(x => !(x && x.id === v.id)).concat([v]);
      h.hlaska = 'Založeno karet: ' + (v.zalozeno || 0) + '.' + (v.zmenenoMezitim ? ' Zakázka se mezitím změnila (nezaloženo): ' + v.zmenenoMezitim + '.' : '')
        + (v.uzExistovalo ? ' Karta mezitím vznikla jinak: ' + v.uzExistovalo + '.' : '') + (v.strop ? ' Nad strop počtu karet: ' + v.strop + '.' : '');
    }
    ZAK_DB.nacteno = false;
  } catch (e) {
    /* Část karet už mohla vzniknout — skutečný stav ukáže server (náhled + protokol). */
    h.hlaska = 'Zápis se přerušil: ' + e.message + (v ? ' Zatím založeno: ' + (v.zalozeno || 0) + '.' : '') + ' Dejte „Dokončit zápis“.';
    ZAK_DB.nacteno = false;
    try { const o = await onlineApi('/api/zakaznici-ze-zakazek'); h.navrh = o.navrh || null; h.protokol = o.protokol || []; } catch (e2) { /* nic */ }
  }
  h.bezi = false; render();
  return true;
}
function zakazniciHromadneZrus() {
  const h = ZAK_DB.hromadne;
  if (!h || h.bezi) return Promise.resolve(false);
  return onlineApi('/api/zakaznici-ze-zakazek', { akce: 'zrusit' })
    .then(() => { h.navrh = null; h.hlaska = 'Náhled zahozen.'; render(); return true; })
    .catch(e => { h.hlaska = e.message; render(); return false; });
}
function zakazniciHromadneHtml() {
  const h = ZAK_DB.hromadne;
  const n = h.navrh;
  let html = '<div class="card" style="margin-top:10px"><div class="body">'
    + '<h3>Naplnit databázi zákazníků ze zakázek (ověření v ARES)</h3>'
    + '<div class="note">Projde uložené zakázky (i další zákazníky na zakázce) a seskupí je podle IČO. Kartu navrhne, jen když '
    + 'subjekt v ARES existuje, nezanikl a název i sídlo z ARES sedí s hlavičkou nejnovější zakázky. Karta = údaje z ARES '
    + '+ kontaktní osoba a zástupci z nejnovější zakázky. Nic se nezapíše bez potvrzení a existující karty se nemění.</div>';
  if (h.hlaska) html += '<div class="note" style="color:var(--acc)">' + esc(h.hlaska) + '</div>';
  html += '<div class="btns" style="margin-top:6px">'
    + '<button ' + (h.bezi ? 'disabled ' : '') + 'onclick="zakazniciHromadneNahled(false)">' + (n ? 'Nový náhled' : 'Spustit náhled') + '</button>'
    + (n && n.faze === 'hotovo' && n.pocty.vypadek ? ' <button class="mini" ' + (h.bezi ? 'disabled ' : '') + 'onclick="zakazniciHromadneNahled(true)">Zkusit znovu ARES (' + zkN(n.pocty.vypadek) + ')</button>' : '')
    + (n && n.faze === 'hotovo' && n.pocty.zalozit ? ' <button class="primary" ' + (h.bezi ? 'disabled ' : '') + 'onclick="zakazniciHromadneZalozit()">Založit ' + zkN(n.pocty.zalozit) + ' karet…</button>' : '')
    + (n && n.faze === 'zapis' ? ' <button class="primary" ' + (h.bezi ? 'disabled ' : '') + 'onclick="zakazniciHromadneZalozit()">Dokončit zápis (zbývá ' + zkN(n.zapis ? n.zapis.zbyva : 0) + ')</button>' : '')
    + (n ? ' <button class="mini" ' + (h.bezi ? 'disabled ' : '') + 'onclick="zakazniciHromadneZrus()">Zahodit náhled</button>' : '')
    + ' <button class="mini" onclick="zakazniciHromadneZavri()">Zavřít</button></div>';
  if (n) {
    const prubeh = n.faze === 'cteni' ? 'čtu zakázky ' + zkN(n.precteno) + ' / ' + zkN(n.zakazekCelkem)
      : n.faze === 'ares' ? 'ověřuji v ARES, zbývá ' + zkN(n.pocty.zbyva)
      : n.faze === 'zapis' ? 'zakládám karty: založeno ' + zkN(n.zapis ? n.zapis.zalozeno : 0) + ', zbývá ' + zkN(n.zapis ? n.zapis.zbyva : 0) : 'hotovo';
    html += '<div class="note" style="margin-top:6px">Stav: <b>' + esc(prubeh) + '</b> · zakázek ' + zkN(n.zakazek)
      + ' · dotazů do ARES ' + zkN(n.dotazuAres) + ' · bez IČO ' + zkN(n.bezIco) + ' · s neplatným IČO ' + zkN(n.neplatneIco)
      + ' (ty se neberou)</div>';
    html += '<table style="margin-top:6px"><tr>' + ZK_STAVY.map(x => '<th>' + esc(x.popis) + '</th>').join('') + '</tr><tr>'
      + ZK_STAVY.map(x => '<td>' + zkN(n.pocty[x.stav] || 0) + '</td>').join('') + '</tr></table>';
    const radky = (n.polozky || []).map(p => {
      const s = ZK_STAVY.find(x => x.stav === p.stav);
      return '<tr><td>' + esc(s ? s.popis : p.stav) + '</td><td>' + esc(p.ico) + '</td>'
        + '<td style="text-align:left">' + esc(p.nazev || '—') + '<br><span class="note">' + esc(p.sidlo || '') + '</span></td>'
        + '<td style="text-align:left">' + esc(p.aresNazev || '—') + '<br><span class="note">' + esc(p.aresSidlo || '') + '</span></td>'
        + '<td>' + zkN(p.pocet) + '</td><td style="text-align:left">' + esc(p.duvod || '') + '</td></tr>';
    }).join('');
    if (radky) html += '<table style="margin-top:6px"><tr><th>Návrh</th><th>IČO</th><th style="text-align:left">Hlavička nejnovější zakázky</th>'
      + '<th style="text-align:left">ARES</th><th>Zakázek</th><th style="text-align:left">Důvod</th></tr>' + radky + '</table>';
  }
  const prot = (h.protokol || []).slice(-5).reverse();
  if (prot.length) html += '<h3>Protokol</h3><ul style="margin:0;padding-left:20px;font-size:13px">' + prot.map(x =>
    '<li>' + esc(String(x.kdy || '').slice(0, 16).replace('T', ' ')) + ' · ' + esc(x.kdo || '?') + ' · ' + esc(x.stav || '') + ' — založeno ' + zkN(x.zalozeno || 0)
    + (x.zbyva ? ' (zbývá ' + zkN(x.zbyva) + ')' : '')
    + ', už existovalo ' + zkN((x.existovalo || 0) + (x.uzExistovalo || 0)) + ', nesedí ' + zkN(x.nesedi || 0) + ', ARES nedostupný ' + zkN(x.aresNedostupny || 0)
    + ', zakázek ' + zkN(x.zakazek || 0) + '</li>').join('') + '</ul>';
  return html + '</div></div>';
}
