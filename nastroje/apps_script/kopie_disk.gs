/* ============================================================
 * KALKULATOR NEXT GEN — NOČNÍ KOPIE ZÁLOHY NA DISK GOOGLE (#577 AS, 10. 11. 2026)
 *
 * Google Apps Script v účtu správce. Každý den (časový spouštěč) stáhne
 * z webu kalkulátoru kopii posledního NOČNÍHO otisku databáze (bez otisků
 * hesel a bez podpisů — stejný obsah jako kopie z prohlížeče), uloží ji do
 * složky na Disku jako otisk_<prostředí>_RRRR-MM-DD_HHMM.json.gz, ověří
 * velikost a SHA-256, potvrdí kopii serveru, zapíše posledni_kopie_<prostředí>.json
 * a uklidí staré kopie podle stejného pravidla jako prohlížeč (7 dní, nedělní
 * 8 týdnů, první v měsíci 6 měsíců; jen kopie vlastního prostředí, nikdy
 * nejnovější; při úbytku dat pod 90 % nemaže a upozorní).
 *
 * Návod krok za krokem: podklady/NAVOD_ZALOHA_APPS_SCRIPT.md v repozitáři.
 *
 * NASTAVENÍ (Nastavení projektu → Vlastnosti skriptu; NIC z toho do kódu):
 *   KNG_MAIN_TOKEN   token ostrého webu (stejný jako KNG_DISK_TOKEN v Netlify)
 *   KNG_TEST_TOKEN   nepovinné — token testovacího webu (druhá konfigurace)
 *   KNG_SLOZKA_ID    nepovinné — ID složky na Disku (výchozí níž)
 *   KNG_MAIN_URL / KNG_TEST_URL  nepovinné — adresa webu (výchozí níž)
 *   KNG_HODINA       nepovinné — hodina spouštěče (výchozí 6)
 *
 * Spouštěné funkce: nastavitSpoustec (jednou), kopieDiskRucne (první běh
 * a kdykoli ručně), kopieDiskNoc (spouštěč), kopieDiskPokracuj (navázání,
 * když se běh nevejde do 6 minut), kopieDiskStav (výpis nastavení bez tokenů).
 * Chyba → e-mail na adresu účtu, pod kterým skript běží (adresa v kódu není).
 * ============================================================ */

var KNG_VYCHOZI = {
  SLOZKA_ID: '1g6vf8fLwjTWDiRVIU_Mw97Ts0Etg0lLO',   // „_Zaloha Netlify DB" (jen výchozí, přepíše KNG_SLOZKA_ID)
  SLOZKA_JMENO: '_Zaloha Netlify DB',
  MAIN_URL: 'https://engscalc.netlify.app',
  TEST_URL: 'https://testengscalc.netlify.app',
  HODINA: 6,
  LIMIT_MS: 270000                                  // běh skriptu má strop 6 min; po 4,5 min se naváže
};
var KNG_POKRACOVANI_MAX = 8;         // kolikrát smí jeden otisk navázat (8 × 4,5 min)
var KNG_KROKU_PRIPRAVY_MAX = 600;
var KNG_POKUSU = 3;                  // opakování kusu / požadavku při přechodné chybě
var KNG_ZAZNAM_MAX = 40;
var KNG_DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
var KNG_DRIVE_API = 'https://www.googleapis.com/drive/v3/files/';
var KNG_DEN_MS = 86400000;

/* ---------------- spouštěné funkce ---------------- */

/** Vytvoří denní spouštěč (smaže starý). Spustit jednou po vložení skriptu. */
function nastavitSpoustec() {
  var n = kngNastaveni_();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'kopieDiskNoc') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('kopieDiskNoc').timeBased().everyDays(1).atHour(n.hodina).create();
  kngZaznam_('spouštěč nastaven: každý den mezi ' + n.hodina + ':00 a ' + (n.hodina + 1) + ':00 (časové pásmo projektu)');
}
/** Spouštěč (každý den). */
function kopieDiskNoc() { return kngBeh_('spouštěč'); }
/** Ruční běh — první zkouška i kdykoli potom. */
function kopieDiskRucne() { return kngBeh_('ručně'); }
/** Navázání běhu, který se nevešel do limitu (plánuje skript sám). */
function kopieDiskPokracuj() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'kopieDiskPokracuj') ScriptApp.deleteTrigger(t);
  });
  return kngBeh_('navázání');
}
/** Výpis nastavení a posledních záznamů (tokeny jen délkou). */
function kopieDiskStav() {
  var n = kngNastaveni_();
  var r = ['složka: ' + n.slozkaId, 'hodina spouštěče: ' + n.hodina];
  n.weby.forEach(function (w) { r.push(w.prostredi + ': ' + w.url + ' (token ' + w.token.length + ' znaků)'); });
  if (!n.weby.length) r.push('ŽÁDNÝ token — doplňte vlastnost KNG_MAIN_TOKEN');
  r.push('spouštěče: ' + ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); }).join(', '));
  r = r.concat(kngZaznamy_().slice(-10).map(function (z) { return z.kdy + ' ' + z.text; }));
  console.log(r.join('\n'));
  return r;
}

/* ---------------- běh ---------------- */

function kngBeh_(proc) {
  var zacatek = Date.now();
  var zamek = LockService.getScriptLock();
  if (!zamek.tryLock(10000)) { kngZaznam_('jiný běh skriptu ještě pracuje — tento (' + proc + ') končí'); return null; }
  var chyby = [], upozorneni = [], hlaseni = [], navazat = false;
  try {
    var n;
    try { n = kngNastaveni_(); }
    catch (e) { chyby.push(kngText_(e)); n = null; }
    if (n && !n.weby.length) chyby.push('chybí token — ve vlastnostech skriptu není KNG_MAIN_TOKEN (ani KNG_TEST_TOKEN)');
    (n ? n.weby : []).forEach(function (w) {
      try {
        var r = kngKopirujWeb_(n, w, zacatek);
        hlaseni.push(w.prostredi + ': ' + r.text);
        if (r.upozorneni) upozorneni.push(w.prostredi + ': ' + r.upozorneni);
      } catch (e) {
        if (e && e.kngPokracovat) {
          navazat = true;
          var st = kngStav_(w) || {};
          st.pokracovani = (st.pokracovani || 0) + 1;
          kngStavUloz_(w, st);
          if (st.pokracovani > KNG_POKRACOVANI_MAX) {
            kngStavSmaz_(w);
            chyby.push(w.prostredi + ': kopie se nedokončila ani po ' + KNG_POKRACOVANI_MAX + ' navázáních — zkusí se při dalším spuštění znovu od začátku');
          } else hlaseni.push(w.prostredi + ': běh se nevešel do limitu, naváže za minutu (' + st.pokracovani + '. navázání)');
        } else chyby.push(w.prostredi + ': ' + kngText_(e));
      }
    });
    if (navazat) ScriptApp.newTrigger('kopieDiskPokracuj').timeBased().after(60 * 1000).create();
  } finally { zamek.releaseLock(); }
  hlaseni.forEach(function (t) { kngZaznam_(t); });
  chyby.forEach(function (t) { kngZaznam_('CHYBA ' + t); });
  upozorneni.forEach(function (t) { kngZaznam_('UPOZORNĚNÍ ' + t); });
  if (chyby.length || upozorneni.length) {
    kngEmail_((chyby.length ? 'CHYBA' : 'Upozornění') + ' — kopie zálohy kalkulátoru na Disk',
      (chyby.length ? 'Kopie zálohy na Disk Google se nepodařila:\n\n- ' + chyby.join('\n- ') + '\n\n' : '')
      + (upozorneni.length ? 'Upozornění:\n\n- ' + upozorneni.join('\n- ') + '\n\n' : '')
      + (hlaseni.length ? 'Průběh:\n- ' + hlaseni.join('\n- ') + '\n\n' : '')
      + 'Spuštění: ' + proc + ', ' + new Date().toISOString() + '.\n'
      + 'Co dál: script.google.com → projekt → Spuštění (Executions); záloha záloh: v aplikaci Nastavení → Databáze → '
      + '„Zkopírovat zálohu na Disk teď". Postup: podklady/NAVOD_ZALOHA_APPS_SCRIPT.md.');
  }
  return { chyby: chyby, upozorneni: upozorneni, hlaseni: hlaseni, navazat: navazat };
}

/* Jeden web (ostrý nebo testovací). Vrací { text, upozorneni }. */
function kngKopirujWeb_(n, w, zacatek) {
  var info = kngApi_(w, 'get', '/api/zaloha_disk');
  if (info.prostredi !== w.prostredi)
    throw new Error('web ' + w.url + ' hlásí prostředí „' + info.prostredi + '", ve skriptu je nastavený jako „' + w.prostredi
      + '" — zkontrolujte adresu a token');
  if (!info.nocni) throw new Error('v Netlify chybí noční otisk za posledních 7 dní — zkontrolujte noční zálohu (Netlify → Logs → Functions → zaloha_nocni)');
  if (info.kopieDisk && info.kopieDisk.otisk === info.nocni.otisk) {
    kngStavSmaz_(w);
    return { text: 'kopie otisku ' + info.nocni.otisk + ' už na Disku je (' + info.kopieDisk.soubor + ', '
      + (info.kopieDisk.zdroj === 'skript' ? 'skript' : 'prohlížeč') + ') — nic k práci' };
  }
  /* 1) příprava souboru na serveru (po krocích) */
  var p = null, kroku = 0;
  do {
    kngCas_(zacatek, n);
    if (++kroku > KNG_KROKU_PRIPRAVY_MAX) throw new Error('příprava kopie se nedokončila ani po ' + KNG_KROKU_PRIPRAVY_MAX + ' krocích');
    if (p && p.bezi) Utilities.sleep(5000);
    p = kngApi_(w, 'post', '/api/zaloha_disk', { akce: 'priprav' });
  } while (!p.hotovo);
  kngKontrolaPripravy_(p, w);
  var slozka = DriveApp.getFolderById(n.slozkaId);
  var stav = kngStav_(w);
  if (stav && stav.soubor && (stav.soubor !== p.soubor || stav.sha256 !== p.sha256)) {
    stav = { pokracovani: stav.pokracovani || 0 };      // rozpracovaná kopie jiného souboru je k ničemu
    kngStavUloz_(w, stav);
  }
  /* 2) soubor stejného jména se nepřepisuje */
  var souborId = stav && stav.souborId ? stav.souborId : '';
  if (!souborId && !(stav && stav.session)) {
    var stejne = kngSoubory_(slozka, p.soubor);
    if (stejne.length) {
      var m0 = stejne.length === 1 ? kngDriveMeta_(stejne[0].getId()) : null;
      if (m0 && +m0.size === p.velikostB && m0.sha256Checksum === p.sha256) souborId = stejne[0].getId();
      else throw new Error('ve složce už je soubor ' + p.soubor + ' s jiným obsahem — skript ho nepřepisuje. '
        + 'Pokud je to neúplná kopie, přesuňte ho do koše a spusťte kopieDiskRucne.');
    }
  }
  /* 3) nahrání po kusech (obnovitelné nahrávání Drive API) */
  if (!souborId) souborId = kngNahraj_(n, w, p, zacatek);
  /* 4) ověření uloženého souboru */
  /* Nesedí-li soubor, zapomene se rozpracovaný stav (jinak by další běh
   * ověřoval pořád týž vadný soubor) a soubor se nechá na místě — příští běh
   * ho jako „soubor stejného jména s jiným obsahem" nepřepíše a ohlásí. */
  var meta = kngDriveMeta_(souborId);
  if (+meta.size !== p.velikostB) { kngStavSmaz_(w); throw new Error('soubor ' + p.soubor + ' má na Disku ' + meta.size + ' B místo ' + p.velikostB
    + ' B — kopie se nezapočítá; přesuňte ho do koše, příští běh ho nahraje znovu'); }
  if (meta.sha256Checksum && meta.sha256Checksum !== p.sha256) { kngStavSmaz_(w);
    throw new Error('SHA-256 souboru ' + p.soubor + ' na Disku nesedí se serverem — kopie se nezapočítá; přesuňte ho do koše, příští běh ho nahraje znovu'); }
  var overeno = meta.sha256Checksum ? 'SHA-256 ověřený Diskem' : 'SHA-256 ověřený po kusech';
  /* 5) potvrzení serveru (záznam kopie, odemyká retenci v Netlify) */
  var predZaznam = kngPosledniCti_(slozka, w.prostredi);
  var c = kngApi_(w, 'post', '/api/zaloha_disk', { akce: 'potvrdit',
    kopie: { soubor: p.soubor, otisk: p.otisk, sha256: p.sha256, velikostB: p.velikostB } });
  kngStavSmaz_(w);
  kngPosledniZapis_(slozka, w.prostredi, { kdy: c.kopieDisk.kdy, soubor: p.soubor, velikostB: p.velikostB, velikostDatB: p.velikostDatB,
    sha256: p.sha256, otisk: p.otisk, puvod: 'nocni-otisk', slozka: slozka.getName(), prostredi: w.prostredi, zdroj: 'skript' });
  /* 6) úklid starých kopií */
  var u = kngUklid_(w, slozka, p, c, predZaznam, info.kopieDisk);
  return { text: 'zkopírováno ' + p.soubor + ' (' + kngMB_(p.velikostB) + ', ' + overeno + '). ' + u.text, upozorneni: u.upozorneni || '' };
}

function kngKontrolaPripravy_(p, w) {
  var r = retenceZalohDiskRozeber(p.soubor);
  if (!r || r.stary || r.prostredi !== w.prostredi || r.den !== p.otisk || !r.gzip)
    throw new Error('server poslal neplatné jméno kopie „' + p.soubor + '"');
  if (!/^[0-9a-f]{64}$/.test(String(p.sha256 || '')) || !(p.velikostB > 0) || !p.kusy || !p.kusy.length)
    throw new Error('server neposlal SHA-256, velikost nebo seznam kusů');
  if (!(p.kusB > 0) || p.kusB % 262144 !== 0) throw new Error('velikost kusu ' + p.kusB + ' není násobek 256 KiB');
  var soucet = 0;
  p.kusy.forEach(function (k, i) {
    if (i < p.kusy.length - 1 && k.b !== p.kusB) throw new Error('kus ' + i + ' nemá plnou délku');
    if (!(k.b > 0) || !/^[0-9a-f]{64}$/.test(String(k.sha256 || ''))) throw new Error('kus ' + i + ' nemá délku nebo SHA-256');
    soucet += k.b;
  });
  if (soucet !== p.velikostB) throw new Error('kusy nedávají velikost souboru (' + soucet + ' ≠ ' + p.velikostB + ')');
}

/* Obnovitelné nahrávání: kus ze serveru → rovnou do Disku (blob, žádné
 * skládání v paměti). Postup se ukládá do vlastností, takže navázaný běh
 * pokračuje dalším kusem. Vrací ID souboru. */
function kngNahraj_(n, w, p, zacatek) {
  var st = kngStav_(w);
  var dalsi = 0, session = '';
  if (st && st.session) {
    var z = kngNahravaniStav_(st.session, p.velikostB);
    if (z.hotovo) { st.souborId = z.id; kngStavUloz_(w, st); return z.id; }
    if (z.prijato >= 0) {
      var odkud = 0;
      for (var j = 0; j < p.kusy.length && odkud < z.prijato; j++) odkud += p.kusy[j].b;
      if (odkud === z.prijato) { dalsi = j; session = st.session; }
    }
  }
  if (!session) {
    var r = UrlFetchApp.fetch(KNG_DRIVE_UPLOAD + '?uploadType=resumable&supportsAllDrives=true', {
      method: 'post', contentType: 'application/json; charset=UTF-8',
      payload: JSON.stringify({ name: p.soubor, parents: [n.slozkaId], mimeType: 'application/gzip' }),
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Upload-Content-Type': 'application/gzip',
        'X-Upload-Content-Length': String(p.velikostB) },
      muteHttpExceptions: true, followRedirects: false });
    session = kngHlavicka_(r, 'location');
    if (r.getResponseCode() !== 200 || !session) throw new Error('Disk nezahájil nahrávání (HTTP ' + r.getResponseCode() + ')');
    dalsi = 0;
    st = { otisk: p.otisk, soubor: p.soubor, sha256: p.sha256, session: session, dalsiKus: 0, pokracovani: (st && st.pokracovani) || 0 };
    kngStavUloz_(w, st);
  }
  var od = 0;
  for (var i = 0; i < dalsi; i++) od += p.kusy[i].b;
  for (i = dalsi; i < p.kusy.length; i++) {
    kngCas_(zacatek, n);
    var blob = kngKus_(w, p, i);
    var b = p.kusy[i].b, posledni = i === p.kusy.length - 1;
    var resp = null;
    for (var pokus = 1; pokus <= KNG_POKUSU; pokus++) {
      resp = UrlFetchApp.fetch(session, { method: 'put', contentType: 'application/gzip', payload: blob,
        headers: { 'Content-Range': 'bytes ' + od + '-' + (od + b - 1) + '/' + p.velikostB },
        muteHttpExceptions: true, followRedirects: false });
      if (resp.getResponseCode() < 500) break;
      Utilities.sleep(2000 * pokus);
    }
    var kod = resp.getResponseCode();
    if (posledni) {
      if (kod !== 200 && kod !== 201) throw new Error('Disk nepřijal poslední kus (HTTP ' + kod + ')');
      var f = JSON.parse(resp.getContentText());
      st.souborId = f.id; st.dalsiKus = i + 1; kngStavUloz_(w, st);
      return f.id;
    }
    if (kod !== 308) throw new Error('Disk nepřijal kus ' + i + ' (HTTP ' + kod + ')');
    var rozsah = kngHlavicka_(resp, 'range');
    if (rozsah !== 'bytes=0-' + (od + b - 1)) throw new Error('Disk potvrdil jiný rozsah (' + rozsah + ') než ' + (od + b) + ' B — kopie se zkusí znovu');
    od += b; st.dalsiKus = i + 1; kngStavUloz_(w, st);
  }
  throw new Error('nahrávání skončilo bez souboru');
}
/* Kolik bajtů rozpracované nahrávání má (dotaz „bytes *\/celkem"). */
function kngNahravaniStav_(session, celkem) {
  var r = UrlFetchApp.fetch(session, { method: 'put', payload: '', headers: { 'Content-Range': 'bytes */' + celkem },
    muteHttpExceptions: true, followRedirects: false });
  var kod = r.getResponseCode();
  if (kod === 200 || kod === 201) return { hotovo: true, id: JSON.parse(r.getContentText()).id };
  if (kod !== 308) return { prijato: -1 };
  var m = /^bytes=0-(\d+)$/.exec(kngHlavicka_(r, 'range') || '');
  return { prijato: m ? +m[1] + 1 : 0 };
}
/* Kus ze serveru s kontrolou délky a SHA-256 (opakuje přechodné chyby). */
function kngKus_(w, p, i) {
  var chyba = '';
  for (var pokus = 1; pokus <= KNG_POKUSU; pokus++) {
    var r = UrlFetchApp.fetch(w.url + '/api/zaloha_disk?kus=' + i + '&otisk=' + encodeURIComponent(p.otisk), {
      method: 'get', headers: { Authorization: 'Bearer ' + w.token }, muteHttpExceptions: true, followRedirects: false });
    var kod = r.getResponseCode();
    if (kod === 200) {
      var blob = r.getBlob();
      var bajty = blob.getBytes();
      if (bajty.length === p.kusy[i].b && kngHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bajty)) === p.kusy[i].sha256)
        return blob;
      chyba = 'kus ' + i + ' nesedí (délka nebo SHA-256)';
    } else {
      chyba = 'kus ' + i + ': HTTP ' + kod + ' ' + kngChybaZOdpovedi_(r);
      if (kod !== 429 && kod < 500) break;
    }
    Utilities.sleep(2000 * pokus);
  }
  throw new Error(chyba);
}

/* Úklid starých kopií (pravidlo src/retence_zaloh.js, viz níž). Vrací { text, upozorneni }. */
function kngUklid_(w, slozka, p, c, predZaznam, kopieServer) {
  var nic = function (duvod) { return { text: 'Staré kopie se nemazaly: ' + duvod + '.' }; };
  if (slozka.getName() !== KNG_VYCHOZI.SLOZKA_JMENO) return nic('složka se nejmenuje „' + KNG_VYCHOZI.SLOZKA_JMENO + '"');
  var r = c.retence || {};
  /* pojistka stojí → nemazat a připomenout e-mailem (každý běh, dokud se nepotvrdí) */
  var stoji = function (duvod) { return { text: 'Staré kopie se nemazaly: ' + duvod + '.', upozorneni: duvod }; };
  if (r.stav === 'poskozene') return stoji('záznam varování pojistky záloh je poškozený — mazání stojí, dokud ho hlavní správce nepotvrdí');
  if (r.stav === 'drzi') return stoji('nepotvrzený úbytek dat (' + (r.text || r.den || '') + ') — mazání stojí, dokud ho v aplikaci nepotvrdíte (Nastavení → Databáze → „Úbytek byl záměrný")');
  var soubory = kngVsechnySoubory_(slozka);
  var jmena = Object.keys(soubory);
  var den = p.otisk;
  /* K40-X4 (B205): srovnávací kopie jen se dnem MENŠÍM než den nové kopie
   * (sdílená funkce z src/retence_zaloh.js); budoucí jména jsou podezřelá —
   * ohlásí se v textu i v e-mailu a nemažou se. */
  var vyber = retenceZalohDiskPredchozi(jmena, p.soubor, den, w.prostredi);
  /* Revize K40a D2: neplatný den kopie = pojistku nejde provést → nemazat a připomenout. */
  if (vyber.neplatnyDen) return stoji('den kopie nejde určit (' + den + ') — pojistku úbytku nejde provést, staré kopie se nemažou');
  var predchozi = vyber.predchozi;
  var podezrela = vyber.budouci;
  var pod = podezrela.length ? ' Podezřelé kopie s budoucím datem (nesmazány, nesrovnávají se — zkontrolujte a případně smažte ručně): '
    + podezrela.join(', ') + '.' : '';
  var podUpoz = podezrela.length ? 'podezřelé kopie s budoucím datem ve složce: ' + podezrela.join(', ') : '';
  var spoj = function (a, b) { return a && b ? a + '; ' + b : (a || b); };
  if (predchozi) {
    /* pojistka porovnává DATA (nekomprimovaná) — velikost předchozí kopie
     * ze záznamu; kde chybí, porovnají se velikosti souborů .gz */
    var predDat = predZaznam && predZaznam.soubor === predchozi && predZaznam.velikostDatB > 0 ? predZaznam.velikostDatB
      : (kopieServer && kopieServer.soubor === predchozi && kopieServer.velikostDatB > 0 ? kopieServer.velikostDatB : 0);
    var predB = predDat || soubory[predchozi][0].getSize();
    var noveB = predDat ? p.velikostDatB : p.velikostB;
    var co = retenceZalohPokles({ velikostB: predB }, { velikostB: noveB });
    if (co && !(r.stav === 'potvrzene' && r.den === den)) {
      kngApi_(w, 'post', '/api/zaloha_disk', { akce: 'varovani', disk: { den: den, predSoubor: predchozi, novySoubor: p.soubor,
        predVelikostB: predB, novaVelikostB: noveB } });
      var t = 'nová kopie ' + p.soubor + ' má proti ' + predchozi + ' méně dat (' + co.join(', ') + ') — nic se nesmazalo, '
        + 'zkontrolujte data a úbytek potvrďte v aplikaci (Nastavení → Databáze)';
      return { text: 'Staré kopie se nemazaly: ' + t + '.' + pod, upozorneni: spoj(t, podUpoz) };
    }
  }
  var ted = Date.parse((c.kopieDisk && c.kopieDisk.kdy) || '');
  var nicPod = function (duvod) { var o = nic(duvod); o.text += pod; if (podUpoz) o.upozorneni = podUpoz; return o; };
  if (!isFinite(ted)) return nicPod('chybí čas serveru');
  if (Math.abs(Date.now() - ted) > KNG_DEN_MS) return nicPod('hodiny serveru a Google se liší o víc než den');
  var smazat = retenceZalohDiskVyber(jmena, new Date(ted).toISOString().slice(0, 10), [p.soubor].concat(podezrela), w.prostredi);
  var smazano = [], chyby = [];
  smazat.forEach(function (j) {
    try { soubory[j].forEach(function (f) { f.setTrashed(true); }); smazano.push(j); }
    catch (e) { chyby.push(j + ': ' + kngText_(e)); }
  });
  return { text: (smazano.length ? 'Do koše přesunuto ' + smazano.length + ' starších kopií: ' + smazano.join(', ') + '.' : 'Starší kopie: nic ke smazání.')
    + (chyby.length ? ' Nepodařilo se smazat: ' + chyby.join('; ') + '.' : '') + pod,
    upozorneni: spoj(chyby.length ? 'nepodařilo se smazat ' + chyby.join('; ') : '', podUpoz) };
}

/* ---------------- Disk ---------------- */

function kngSoubory_(slozka, jmeno) {
  var out = [], it = slozka.getFilesByName(jmeno);
  while (it.hasNext()) { var f = it.next(); if (!f.isTrashed()) out.push(f); }
  return out;
}
function kngVsechnySoubory_(slozka) {
  var out = {}, it = slozka.getFiles();
  while (it.hasNext()) { var f = it.next(); if (f.isTrashed()) continue; var j = f.getName(); (out[j] = out[j] || []).push(f); }
  return out;
}
function kngDriveMeta_(id) {
  var r = UrlFetchApp.fetch(KNG_DRIVE_API + encodeURIComponent(id) + '?fields=id,name,size,sha256Checksum&supportsAllDrives=true', {
    method: 'get', headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('Disk nevrátil údaje souboru (HTTP ' + r.getResponseCode() + ')');
  return JSON.parse(r.getContentText());
}
function kngPosledniJmeno_(prostredi) { return 'posledni_kopie_' + prostredi + '.json'; }
function kngPosledniCti_(slozka, prostredi) {
  try { var f = kngSoubory_(slozka, kngPosledniJmeno_(prostredi)); return f.length ? JSON.parse(f[0].getBlob().getDataAsString()) : null; }
  catch (e) { return null; }
}
function kngPosledniZapis_(slozka, prostredi, zaznam) {
  var text = JSON.stringify(zaznam, null, 1);
  var f = kngSoubory_(slozka, kngPosledniJmeno_(prostredi));
  if (f.length) f[0].setContent(text);
  else slozka.createFile(kngPosledniJmeno_(prostredi), text, 'application/json');
}

/* ---------------- server kalkulátoru ---------------- */

function kngApi_(w, metoda, cesta, telo) {
  var opt = { method: metoda, headers: { Authorization: 'Bearer ' + w.token }, muteHttpExceptions: true, followRedirects: false };
  if (telo) { opt.contentType = 'application/json'; opt.payload = JSON.stringify(telo); }
  var r = null, kod = 0;
  for (var pokus = 1; pokus <= KNG_POKUSU; pokus++) {
    r = UrlFetchApp.fetch(w.url + cesta, opt);
    kod = r.getResponseCode();
    if (kod < 500) break;
    Utilities.sleep(2000 * pokus);
  }
  var o = null;
  try { o = JSON.parse(r.getContentText()); } catch (e) { o = null; }
  if (kod !== 200 || !o || !o.ok)
    throw new Error(w.url + cesta + ' → HTTP ' + kod + ': ' + ((o && o.chyba) || kngChybaZOdpovedi_(r)));
  return o;
}
function kngChybaZOdpovedi_(r) {
  try { var o = JSON.parse(r.getContentText()); if (o && o.chyba) return String(o.chyba).slice(0, 300); } catch (e) { /* není JSON */ }
  return String(r.getContentText() || '').slice(0, 200);
}

/* ---------------- pomocné ---------------- */

function kngNastaveni_() {
  var p = PropertiesService.getScriptProperties();
  var g = function (k) { var v = p.getProperty('KNG_' + k); return v == null || String(v).trim() === '' ? '' : String(v).trim(); };
  var weby = [];
  [['main', 'MAIN'], ['test', 'TEST']].forEach(function (x) {
    var token = g(x[1] + '_TOKEN');
    if (!token) return;
    var url = (g(x[1] + '_URL') || KNG_VYCHOZI[x[1] + '_URL']).replace(/\/+$/, '');
    if (!/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(url)) throw new Error('adresa ' + x[1] + ' „' + url + '" musí být https://jméno-webu bez cesty');
    weby.push({ prostredi: x[0], url: url, token: token });
  });
  var hodina = parseInt(g('HODINA'), 10);
  return { weby: weby, slozkaId: g('SLOZKA_ID') || KNG_VYCHOZI.SLOZKA_ID,
    hodina: hodina >= 0 && hodina <= 23 ? hodina : KNG_VYCHOZI.HODINA,
    limitMs: parseInt(g('LIMIT_MS'), 10) > 0 ? parseInt(g('LIMIT_MS'), 10) : KNG_VYCHOZI.LIMIT_MS };
}
function kngCas_(zacatek, n) {
  if (Date.now() - zacatek > n.limitMs) { var e = new Error('limit běhu'); e.kngPokracovat = true; throw e; }
}
function kngStav_(w) {
  var t = PropertiesService.getScriptProperties().getProperty('KNG_STAV_' + w.prostredi.toUpperCase());
  try { return t ? JSON.parse(t) : null; } catch (e) { return null; }
}
function kngStavUloz_(w, st) { PropertiesService.getScriptProperties().setProperty('KNG_STAV_' + w.prostredi.toUpperCase(), JSON.stringify(st)); }
function kngStavSmaz_(w) { PropertiesService.getScriptProperties().deleteProperty('KNG_STAV_' + w.prostredi.toUpperCase()); }
function kngZaznamy_() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('KNG_ZAZNAM') || '[]'); } catch (e) { return []; }
}
function kngZaznam_(text) {
  console.log(text);
  var z = kngZaznamy_();
  z.push({ kdy: new Date().toISOString(), text: String(text).slice(0, 500) });
  PropertiesService.getScriptProperties().setProperty('KNG_ZAZNAM', JSON.stringify(z.slice(-KNG_ZAZNAM_MAX)));
}
function kngEmail_(predmet, telo) {
  var komu = '';
  try { komu = Session.getEffectiveUser().getEmail(); } catch (e) { komu = ''; }
  if (!komu) { console.log('e-mail nejde poslat (adresa účtu není k dispozici): ' + predmet); return; }
  MailApp.sendEmail(komu, '[Kalkulátor] ' + predmet, telo);
}
function kngHlavicka_(r, jmeno) {
  var h = r.getHeaders() || {};
  for (var k in h) if (String(k).toLowerCase() === jmeno) return String(h[k]);
  return '';
}
function kngHex_(b) { return b.map(function (x) { return ((x + 256) % 256).toString(16).padStart(2, '0'); }).join(''); }
function kngMB_(b) { return (b / 1048576).toFixed(1).replace('.', ',') + ' MB'; }
function kngText_(e) { return String(e && e.message || e).slice(0, 500); }

/* ====== RETENCE ZÁLOH: kopie src/retence_zaloh.js (nevkládat ručně — nastroje/apps_script/vloz_retenci.py) ====== */
/* ============================================================
 * RETENCE ZÁLOH — KOLIK ZÁLOH SE DRŽÍ (#523 Z2, rozhodnutí J. V. 26. 10. 2026)
 *
 * Jediné místo, kde žije pravidlo „které zálohy zůstanou". Používají ho
 * DVĚ strany:
 *   - server (netlify/lib/zalohovani.mjs → retenceVyber) pro otisky
 *     v Netlify Blobs (úložiště `zalohy`), přes netlify/lib/retence_modul.cjs;
 *   - prohlížeč správce (src/ui/online_ui.js → kopieDiskUklid) pro kopie
 *     `otisk_<prostředí>_RRRR-MM-DD_HHMM.json(.gz)` ve složce „_Zaloha Netlify DB"
 *     na Disku (jen kopie vlastního prostředí, #552).
 * Dvě kopie téhož pravidla by se časem rozešly — proto jeden modul.
 *
 * Pravidlo J. V. 26. 10. 2026 (nahrazuje #151 N5 z 19. 10.):
 *   Blobs: denní (noční) otisky 14 dní; týdenní 8 týdnů; měsíční 6 měsíců;
 *          vynucené (ruční, při přihlášení) 7 dní; „před obnovou" 6 měsíců
 *          (#529, J. V. 27. 10. 2026; do té doby nikdy), nejnovější z nich
 *          zůstává vždy.
 *   Disk:  denní 7 dní; týdenní 8 týdnů; měsíční 6 měsíců.
 *
 * Výklad (výchozí volby dávky Z2, zdůvodnění v CHANGELOG):
 *   - věk = počet dní od data zálohy do dneška (UTC), dnešek je den 0;
 *     „14 dní" = věk 0–13, 14. den se maže (stejně jako dřív u 30 dní);
 *   - TÝDEN = pondělí až neděle; týdenní záloha = ta z neděle, a když
 *     neděle chybí, nejbližší starší v témže týdnu (= nejnovější záloha
 *     týdne); drží se, dokud není starší než 8 × 7 = 56 dní;
 *   - MĚSÍČNÍ záloha = první (nejstarší) záloha kalendářního měsíce; drží se,
 *     dokud není starší než 6 kalendářních měsíců (z 26. 4. se maže záloha
 *     z 26. 10. a starší, z 27. 10. zůstane);
 *   - záloha s datem v budoucnosti (posunuté hodiny) se nemaže;
 *   - nejnovější záloha se nesmaže nikdy, ať je jakkoli stará;
 *   - Blobs, STARÉ OTISKY (datum před RETENCE_ZALOH_STARE_PRED = 20. 10.
 *     2026): výjimka „staré nikdy" (RETENCE_OD) je zrušená. Ze starých
 *     zůstane jen první otisk každého měsíce (měsíční, 6 měsíců), ostatní
 *     smí retence smazat — i když by je jinak držel denní nebo týdenní
 *     pravidlo (J. V.: „ze starých otisků zůstane jeden z každého měsíce").
 *
 * Čisté funkce, žádný přístup k úložišti ani k hodinám — dnešek se předává.
 * ============================================================ */
const RETENCE_ZALOH_BLOBS = { dnu: 14, tydnu: 8, mesicu: 6, vynuceneDnu: 7, predObnovouMesicu: 6 };
const RETENCE_ZALOH_DISK = { dnu: 7, tydnu: 8, mesicu: 6 };
const RETENCE_ZALOH_STARE_PRED = '2026-10-20';
const RETENCE_ZALOH_DEN_MS = 86400000;

function retenceZalohDenMs(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d || ''))) return NaN;
  const t = Date.parse(d + 'T00:00:00Z');
  /* 2026-02-31 Date.parse přijme a posune — takové datum za datum nebereme */
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === d ? t : NaN;
}

/* Hranice měsíční zálohy: stejný den o `mesicu` měsíců zpět (31. 8. → 28./29. 2.). */
function retenceZalohMesicuZpet(dnesMs, mesicu) {
  const d = new Date(dnesMs);
  const r = d.getUTCFullYear(), m = d.getUTCMonth() - mesicu;
  const posledni = new Date(Date.UTC(r, m + 1, 0)).getUTCDate();
  return Date.UTC(r, m, Math.min(d.getUTCDate(), posledni));
}

/* Které DNY (RRRR-MM-DD) zůstanou. Vrací Map den → důvod ('nejnovější',
 * 'denní', 'týdenní', 'měsíční'), nebo null, když dnešek není platné datum
 * (pak se nesmí mazat nic). `opt.stareJenMesicni` = datum, před kterým
 * zůstává jen měsíční a nejnovější záloha (staré otisky v Blobs). */
function retenceZalohDrz(dny, dnes, pravidlo, opt) {
  const dnesMs = retenceZalohDenMs(dnes);
  if (!Number.isFinite(dnesMs) || !pravidlo) return null;
  const o = opt || {};
  const platne = [...new Set((dny || []).map(String))].filter(d => Number.isFinite(retenceZalohDenMs(d))).sort();
  const drz = new Map();
  if (!platne.length) return drz;
  const vek = (d) => Math.round((dnesMs - retenceZalohDenMs(d)) / RETENCE_ZALOH_DEN_MS);
  const stary = (d) => !!o.stareJenMesicni && d < o.stareJenMesicni;
  const pridej = (d, proc) => { if (!drz.has(d)) drz.set(d, proc); };
  pridej(platne[platne.length - 1], 'nejnovější');
  /* týdny (pondělí) a měsíce → zástupce */
  const tydny = new Map(), mesice = new Map();
  for (const d of platne) {
    const t = retenceZalohDenMs(d);
    const pondeli = new Date(t - ((new Date(t).getUTCDay() + 6) % 7) * RETENCE_ZALOH_DEN_MS).toISOString().slice(0, 10);
    tydny.set(pondeli, d);                       // vzestupně → zůstane poslední (neděle / nejbližší starší)
    if (!mesice.has(d.slice(0, 7))) mesice.set(d.slice(0, 7), d);   // první v měsíci
  }
  const hraniceMesicu = retenceZalohMesicuZpet(dnesMs, pravidlo.mesicu);
  for (const d of mesice.values())
    if (retenceZalohDenMs(d) > hraniceMesicu) pridej(d, 'měsíční');
  for (const d of platne) {
    if (stary(d)) continue;
    if (vek(d) < pravidlo.dnu) pridej(d, 'denní');      // i budoucí (záporný věk)
  }
  for (const d of tydny.values()) {
    if (stary(d)) continue;
    if (vek(d) < pravidlo.tydnu * 7) pridej(d, 'týdenní');
  }
  return drz;
}

/* KOPIE NA DISKU — JMÉNA SOUBORŮ (#552, J. V. 2. 11. 2026).
 * Ostrý i testovací web kopírují do TÉŽE složky „_Zaloha Netlify DB", proto
 * jméno nese prostředí a čas pořízení zálohy:
 *   otisk_<prostředí>_RRRR-MM-DD_HHMM.json(.gz)
 *   prostředí  main | test | jiny (náhled nasazení, místní běh) — hlásí ho
 *              server (prostrediZalohy v netlify/lib/zalohovani.mjs);
 *   datum      den nočního otisku (klíč v Blobs), u zálohy „aktuální stav"
 *              dnešek v Europe/Prague;
 *   HHMM       čas pořízení zálohy v Europe/Prague (noční otisk: kdy vznikl).
 * Starý tvar otisk_RRRR-MM-DD.json(.gz) (do v2.11.3) prostředí nenese — nejde
 * poznat, který web ho zapsal, proto ho úklid NIKDY nemaže; obnova ze souboru
 * jméno nekontroluje, takže načte oba tvary. Cokoli jiného (posledni_kopie…,
 * zaloha_online_…, „otisk_… (1).json", podsložky) se nemaže taky. */
const RETENCE_ZALOH_DISK_PROSTREDI = ['main', 'test', 'jiny'];
const RETENCE_ZALOH_DISK_JMENO_STARE = /^otisk_(\d{4}-\d{2}-\d{2})\.json(\.gz)?$/;
const RETENCE_ZALOH_DISK_JMENO = /^otisk_(main|test|jiny)_(\d{4}-\d{2}-\d{2})_([01]\d|2[0-3])([0-5]\d)\.json(\.gz)?$/;
/* Rozbor jména → { den, prostredi, hhmm, gzip, stary } nebo null. Starý tvar
 * má prostredi a hhmm null a stary true. Neplatné datum (2026-02-31) = null. */
function retenceZalohDiskRozeber(jmeno) {
  const j = String(jmeno == null ? '' : jmeno);
  let m = RETENCE_ZALOH_DISK_JMENO.exec(j);
  if (m) return Number.isFinite(retenceZalohDenMs(m[2]))
    ? { den: m[2], prostredi: m[1], hhmm: m[3] + m[4], gzip: !!m[5], stary: false } : null;
  m = RETENCE_ZALOH_DISK_JMENO_STARE.exec(j);
  if (m) return Number.isFinite(retenceZalohDenMs(m[1]))
    ? { den: m[1], prostredi: null, hhmm: null, gzip: !!m[2], stary: true } : null;
  return null;
}
/* JMÉNO KOPIE PRO SKRIPT (#577 AS, 10. 11. 2026). Noční kopii na Disk dělá
 * i skript Google Apps Script (nastroje/apps_script/kopie_disk.gs) — jméno
 * mu skládá SERVER (netlify/lib/kopie_skript.mjs) touto funkcí, aby bylo
 * stejné jako u kopie z prohlížeče (uloKopieDiskJmeno v src/uloziste.js,
 * vždy .json.gz). Shodu obou hlídá src/test_577_jmeno_kopie.js. `den` = den
 * nočního otisku, `kdy` = jeho pořízení (HHMM v Europe/Prague). Neplatný
 * den, prostředí nebo čas = '' (kopie pak nevznikne). */
function retenceZalohDiskJmeno(den, prostredi, kdy) {
  if (!RETENCE_ZALOH_DISK_PROSTREDI.includes(prostredi) || !Number.isFinite(retenceZalohDenMs(String(den || '')))) return '';
  const t = typeof kdy === 'number' ? kdy : Date.parse(String(kdy || ''));
  if (!Number.isFinite(t)) return '';
  try {
    const c = {};
    for (const x of new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Prague', hour: '2-digit', minute: '2-digit',
      hourCycle: 'h23' }).formatToParts(new Date(t))) c[x.type] = x.value;
    if (!/^\d{2}$/.test(c.hour || '') || !/^\d{2}$/.test(c.minute || '')) return '';
    return 'otisk_' + prostredi + '_' + den + '_' + c.hour + c.minute + '.json.gz';
  } catch (e) { return ''; }
}
/* `jmena` = jména souborů ve složce, `chranit` = jména, která se nesmažou
 * nikdy (právě zapsaná kopie), `prostredi` = prostředí webu, který uklízí.
 * Bere JEN soubory nového tvaru téhož prostředí — cizí prostředí ani starý
 * tvar se nemažou nikdy; bez platného prostředí se nesmaže nic. Pravidlo
 * počítá DNY, ne soubory: víc kopií z jednoho dne zůstane nebo odejde
 * spolu a „nejnovější" je nejnovější den vlastního prostředí. Vrací jména
 * ke smazání (seřazená). */
function retenceZalohDiskVyber(jmena, dnes, chranit, prostredi) {
  if (!RETENCE_ZALOH_DISK_PROSTREDI.includes(prostredi)) return [];
  const soubory = [...new Set((jmena || []).map(String))]
    .map(j => { const r = retenceZalohDiskRozeber(j); return r && !r.stary && r.prostredi === prostredi ? { j, d: r.den } : null; })
    .filter(Boolean);
  const drz = retenceZalohDrz(soubory.map(x => x.d), dnes, RETENCE_ZALOH_DISK);
  if (!drz) return [];
  const chranene = new Set((chranit || []).map(String));
  const chraneneDny = new Set(soubory.filter(x => chranene.has(x.j)).map(x => x.d));
  return soubory.filter(x => !drz.has(x.d) && !chranene.has(x.j) && !chraneneDny.has(x.d)).map(x => x.j).sort();
}

/* SROVNÁVACÍ KOPIE PRO POJISTKU ÚBYTKU (K40-X4, 11. 11. 2026, mez B205).
 * Do 11. 11. se nová kopie srovnávala s abecedně POSLEDNÍM jménem vlastního
 * prostředí ve sdílené složce — soubor s budoucím datem od kohokoli se
 * zápisem do složky pojistku vyřadil (malý = falešný úbytek) nebo zakryl
 * skutečný úbytek (velký). Bere se jen jméno téhož prostředí v novém tvaru
 * s dnem MENŠÍM než den nové kopie (`den` = den nočního otisku ze serveru);
 * stejný den ani právě zapsaný `soubor` ne. Jména s dnem větším vrací zvlášť
 * (`budouci`, seřazená) — úklid je ohlásí jako podezřelá a nemaže je.
 * Jediná funkce pro prohlížeč (kopieDiskUklid) i skript Apps Script
 * (kngUklid_, vkládá nastroje/apps_script/vloz_retenci.py).
 * Vrací { predchozi: jméno | null, budouci: [] }; u dne, který není platné
 * RRRR-MM-DD, navíc `neplatnyDen: true` — oba volající pak NEMAŽOU (revize
 * K40a D2, 12. 11. 2026: dřív se srovnání tiše přeskočilo a mazalo se). */
function retenceZalohDiskPredchozi(jmena, soubor, den, prostredi) {
  const out = { predchozi: null, budouci: [] };
  const d = String(den == null ? '' : den);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(retenceZalohDenMs(d))) { out.neplatnyDen = true; return out; }
  if (!RETENCE_ZALOH_DISK_PROSTREDI.includes(prostredi)) return out;
  const vlastni = [...new Set((jmena || []).map(String))]
    .map(j => { const r = retenceZalohDiskRozeber(j); return r && !r.stary && r.prostredi === prostredi && j !== String(soubor) ? { j, d: r.den } : null; })
    .filter(Boolean);
  out.budouci = vlastni.filter(x => x.d > d).map(x => x.j).sort();
  const starsi = vlastni.filter(x => x.d < d).map(x => x.j).sort();   // jméno řadí den i čas (#552)
  out.predchozi = starsi.length ? starsi[starsi.length - 1] : null;
  return out;
}

/* POJISTKA PROTI TICHÉ ZTRÁTĚ DAT (K3-N13 20. 10. 2026; rozšířeno #523 Z2,
 * pokyn J. V. 26. 10. 2026: „Zálohy se musí v čase zvětšovat; nenadálé
 * zmenšení musí být oznámené a schválené, jinak se staré zálohy nesmí
 * mazat."). Nová záloha proti předchozí je ÚBYTEK, když má
 *   - velikost dat < 90 % (nekomprimovaná velikost — gzip ji nezkreslí),
 *   - zakázek nebo účtů < 95 %,
 *   - šablon nebo podpisů méně (jakýkoli pokles).
 * Do 26. 10. platil jen pokles zakázek/účtů pod 50 %. Prahy jsou výchozí
 * volba koordinace — mění se JEN tady. Údaj, který některá záloha nenese
 * (starší otisk bez počtu šablon), se neporovnává. Vrací seznam textů
 * („zakázek 100 → 94") nebo null. Používá server (noční otisk proti
 * předchozímu nočnímu) i prohlížeč (kopie na Disku proti předchozí kopii). */
/* KUMULATIVNĚ (O-K9 #527, nález auditu K9-S1, výchozí volba koordinace
 * 26. 10. 2026): noční otisk se porovnává nejen s předchozím, ale
 * s MAXIMEM každého údaje za posledních `oknoDnu` dní — pozvolný úbytek
 * (4 % zakázek za noc) by jinak noc od noci prošel pod prahy. Prahy jsou
 * tytéž (90 % velikosti, 95 % zakázek a účtů, šablony a podpisy jakkoli). */
const RETENCE_ZALOH_POJISTKA = { velikost: 0.9, pocty: 0.95, oknoDnu: 30 };
/* Maximum každého údaje z několika záloh (`otisky` = pole údajů, např.
 * ze souhrnů) — pro kumulativní porovnání. Vrací { udaje, odkud }: údaje
 * s maximem a pro každý údaj, ze které zálohy (`klic`) pochází. Údaj, který
 * žádná záloha nenese, ve výsledku chybí. */
function retenceZalohMaximum(otisky) {
  const udaje = {}, odkud = {};
  for (const o of otisky || []) {
    if (!o) continue;
    for (const k of ['velikostB', 'pocetZakazek', 'pocetUctu', 'pocetSablon', 'pocetPodpisu']) {
      const x = o[k];
      if (typeof x !== 'number' || !Number.isFinite(x) || x < 0) continue;
      if (!(k in udaje) || x > udaje[k]) { udaje[k] = x; odkud[k] = String(o.klic || ''); }
    }
  }
  return { udaje, odkud };
}
function retenceZalohMB(b) { return (b / 1048576).toFixed(1).replace('.', ',') + ' MB'; }
function retenceZalohPokles(pred, nove) {
  if (!pred || !nove) return null;
  const c = (x) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null);
  const P = RETENCE_ZALOH_POJISTKA;
  const co = [];
  const pv = c(pred.velikostB), nv = c(nove.velikostB);
  if (pv !== null && pv > 0 && nv !== null && nv < pv * P.velikost)
    co.push('velikost ' + retenceZalohMB(pv) + ' → ' + retenceZalohMB(nv) + ' (' + Math.round(100 * nv / pv) + ' %)');
  for (const [k, nazev] of [['pocetZakazek', 'zakázek'], ['pocetUctu', 'účtů']]) {
    const a = c(pred[k]), b = c(nove[k]);
    if (a !== null && a > 0 && b !== null && b < a * P.pocty) co.push(nazev + ' ' + a + ' → ' + b);
  }
  for (const [k, nazev] of [['pocetSablon', 'šablon'], ['pocetPodpisu', 'podpisů']]) {
    const a = c(pred[k]), b = c(nove[k]);
    if (a !== null && b !== null && b < a) co.push(nazev + ' ' + a + ' → ' + b);
  }
  return co.length ? co : null;
}

/* Text pro obrazovku a příručku — ať se nerozejde s čísly výš. */
function retenceZalohPopis() {
  const b = RETENCE_ZALOH_BLOBS, d = RETENCE_ZALOH_DISK;
  return {
    blobs: 'Netlify: noční zálohy ' + b.dnu + ' dní, z každého týdne nedělní ' + b.tydnu + ' týdnů, z každého měsíce první '
      + b.mesicu + ' měsíců; ruční a automatické zálohy ' + b.vynuceneDnu + ' dní; zálohy před obnovou ' + b.predObnovouMesicu
      + ' měsíců (nejnovější z nich zůstává vždy).',
    disk: 'Disk Google: kopie ' + d.dnu + ' dní, z každého týdne nedělní ' + d.tydnu + ' týdnů, z každého měsíce první '
      + d.mesicu + ' měsíců.',
  };
}

if (typeof module !== 'undefined')
  module.exports = { RETENCE_ZALOH_POJISTKA, retenceZalohPokles, retenceZalohMaximum, RETENCE_ZALOH_BLOBS, RETENCE_ZALOH_DISK, RETENCE_ZALOH_STARE_PRED, RETENCE_ZALOH_DISK_JMENO,
    RETENCE_ZALOH_DISK_JMENO_STARE, RETENCE_ZALOH_DISK_PROSTREDI, retenceZalohDiskRozeber, retenceZalohDiskJmeno,
    retenceZalohDenMs, retenceZalohMesicuZpet, retenceZalohDrz, retenceZalohDiskVyber, retenceZalohDiskPredchozi, retenceZalohPopis };
/* ====== KONEC RETENCE ZÁLOH ====== */
