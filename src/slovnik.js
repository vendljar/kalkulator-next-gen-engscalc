/* ============ POROVNÁNÍ SLOVNÍKU S TABULKOU VOCABULARY (#5) ============
 *
 * Slovník PREKLAD v preklad.js vznikl jednorázovým přepisem z tabulky
 * `EngineersCZ_Vocabulary_*.xlsx`. Od té doby žijí obě strany vlastním
 * životem: v tabulce se doplňují a opravují překlady (a chodí do ní rodilí
 * mluvčí, viz #32), v aplikaci přibývají hesla, která v tabulce nikdy nebyla.
 * Sesouhlasit to ručně přes 600 řádků je práce na půl dne a nikdo to nedělá.
 *
 * Tenhle modul je čistá logika porovnání – žádné DOM, žádné čtení souboru.
 * Dostane rozparsované řádky listu (z xlsxPrecti) a vrátí rozpad na čtyři
 * kategorie, které se liší mírou rizika:
 *
 *   doplnit   – v aplikaci je heslo bez překladu, tabulka ho má.
 *               Bezpečné: nic se nepřepisuje, jen se zaplní prázdné místo.
 *   rozdilne  – obě strany mají překlad a neshodují se.
 *               Tady musí rozhodnout člověk – tabulka nemusí mít pravdu,
 *               v aplikaci mohl někdo překlad vědomě upravit.
 *   nove      – heslo je jen v tabulce. Přidat se dá, ale slovník tím roste
 *               o věci, které aplikace nikdy nepoužije – proto zvlášť.
 *   jenVApp   – heslo je jen v aplikaci. Nic se s ním nedělá; je to podklad,
 *               co poslat překladatelům do tabulky.
 *
 * Klíčem porovnání je prekladNorm() – stejná normalizace, jakou používá tr(),
 * takže „UMÍSTĚNÍ ŠACHTY:" a „Umístění šachty" jsou totéž heslo. Bez toho by
 * porovnání hlásilo stovky falešných rozdílů kvůli velkým písmenům a dvojtečkám.
 * ====================================================================== */

const SLOVNIK_JAZYKY = ['en', 'de', 'fr'];

/* Hlavičku hledáme, ne předpokládáme: tabulka se v čase mění a sloupce se
 * v ní stěhují. Bereme první řádek do 20. pozice, kde se najde český sloupec
 * a aspoň jeden cizí jazyk. */
const SLOVNIK_HLAVICKY = {
  cz: /^(cz|cs|čes|cesk|czech|český|česky|čeština)/i,
  en: /^(en|eng|angl|english)/i,
  de: /^(de|ger|deu|něm|nem|german|deutsch)/i,
  fr: /^(fr|fra|fre|franc|fran|french|français)/i,
};

function slovnikNajdiHlavicku(rows) {
  const limit = Math.min((rows || []).length, 20);
  for (let ri = 0; ri < limit; ri++) {
    const radek = rows[ri] || [];
    const sl = {};
    radek.forEach((b, ci) => {
      const t = String(b == null ? '' : b).trim();
      if (!t) return;
      Object.keys(SLOVNIK_HLAVICKY).forEach(j => {
        if (sl[j] === undefined && SLOVNIK_HLAVICKY[j].test(t)) sl[j] = ci;
      });
    });
    if (sl.cz !== undefined && (sl.en !== undefined || sl.de !== undefined || sl.fr !== undefined))
      return { radek: ri, sloupce: sl };
  }
  return null;
}

/* Řádky listu → [{ cz, en, de, fr, radek }] (radek = číslo řádku v Excelu, od 1). */
function slovnikZListu(rows) {
  const h = slovnikNajdiHlavicku(rows);
  if (!h) return { chyba: 'V listu se nepodařilo najít hlavičku se sloupci CZ a aspoň jedním cizím jazykem.', polozky: [] };
  const bunka = (radek, ci) => ci === undefined ? '' : String(radek[ci] == null ? '' : radek[ci]).replace(/ /g, ' ').trim();
  const polozky = [];
  for (let ri = h.radek + 1; ri < rows.length; ri++) {
    const r = rows[ri] || [];
    const cz = bunka(r, h.sloupce.cz);
    if (!cz) continue;
    polozky.push({ cz, radek: ri + 1,
      en: bunka(r, h.sloupce.en), de: bunka(r, h.sloupce.de), fr: bunka(r, h.sloupce.fr) });
  }
  return { hlavicka: h, polozky, chyba: null };
}

/* Vybere z celého sešitu list, který vypadá jako slovník (nejvíc použitelných
 * řádků). Uživatel tak nemusí vědět, že se list jmenuje zrovna „Vocab". */
function slovnikVyberList(sheets) {
  let nej = null;
  (sheets || []).forEach(s => {
    const v = slovnikZListu(s.rows);
    if (v.chyba) return;
    if (!nej || v.polozky.length > nej.rozbor.polozky.length) nej = { list: s.nazev, rozbor: v };
  });
  return nej;
}

/* Porovná slovník aplikace s položkami z tabulky.
 * preklad = objekt PREKLAD (klíč = české heslo, hodnota = [EN, DE, FR]). */
function slovnikPorovnej(preklad, polozky, norm) {
  const nrm = norm || (s => String(s == null ? '' : s).trim().toLowerCase());
  const idx = {};                       // normalizovaný klíč → původní klíč v PREKLAD
  Object.keys(preklad || {}).forEach(k => { idx[nrm(k)] = k; });

  const doplnit = [], rozdilne = [], nove = [];
  const videnoVXlsx = {};
  let shodne = 0;

  (polozky || []).forEach(p => {
    const n = nrm(p.cz);
    if (!n) return;
    videnoVXlsx[n] = 1;
    const klic = idx[n];
    if (klic === undefined) {
      if (SLOVNIK_JAZYKY.some(j => p[j])) nove.push({ cz: p.cz, radek: p.radek, hodnoty: { en: p.en, de: p.de, fr: p.fr } });
      return;
    }
    SLOVNIK_JAZYKY.forEach((j, i) => {
      const vXlsx = p[j], vApp = (preklad[klic] || [])[i] || '';
      if (!vXlsx) return;                              // tabulka nic nenabízí
      if (!vApp) { doplnit.push({ klic, cz: p.cz, jazyk: j, tabulka: vXlsx, aplikace: '', radek: p.radek }); return; }
      if (vApp === vXlsx) { shodne++; return; }
      rozdilne.push({ klic, cz: p.cz, jazyk: j, tabulka: vXlsx, aplikace: vApp, radek: p.radek });
    });
  });

  const jenVApp = Object.keys(preklad || {})
    .filter(k => !videnoVXlsx[nrm(k)])
    .map(k => ({ klic: k, hodnoty: { en: (preklad[k] || [])[0] || '', de: (preklad[k] || [])[1] || '', fr: (preklad[k] || [])[2] || '' } }));

  return { doplnit, rozdilne, nove, jenVApp, shodne,
    souhrn: { vTabulce: (polozky || []).length, vAplikaci: Object.keys(preklad || {}).length,
      doplnit: doplnit.length, rozdilne: rozdilne.length, nove: nove.length, jenVApp: jenVApp.length, shodne } };
}

/* Zapíše vybrané změny do slovníku přes prekladNastav() – tedy včetně
 * přestavby rejstříku, aby se projevily hned. Vrací počet zapsaných hodnot.
 * Nic se nezapisuje bez explicitního seznamu: modul zásadně nic „nesrovnává
 * automaticky", protože překlad je odborná věc a tabulka nemusí mít pravdu. */
function slovnikAplikuj(zmeny, nastav) {
  let n = 0;
  (zmeny || []).forEach(z => {
    if (!z || !z.tabulka) return;
    if (nastav(z.klic != null ? z.klic : z.cz, z.jazyk, z.tabulka)) n++;
  });
  return n;
}

/* Nová hesla z tabulky → seznam změn pro slovnikAplikuj (po jazycích). */
function slovnikNoveJakoZmeny(nove) {
  const out = [];
  (nove || []).forEach(p => SLOVNIK_JAZYKY.forEach(j => {
    if (p.hodnoty[j]) out.push({ klic: p.cz, cz: p.cz, jazyk: j, tabulka: p.hodnoty[j], aplikace: '' });
  }));
  return out;
}

/* Podklad pro překladatele: hesla, která zná jen aplikace, jako CSV pro Excel. */
function slovnikCsvJenVApp(jenVApp) {
  /* B83: tatáž buňka jako csvBunka (format.js) — ochrana vzorců; záložka
   * pro samostatný běh v Node. */
  const q = (typeof csvBunka === 'function') ? csvBunka : (s => {
    let t = String(s == null ? '' : s); if (/^([=@\t\r]|[+\-][^\s])/.test(t)) t = "'" + t;
    return '"' + t.replace(/"/g, '""') + '"'; });
  const hlav = ['CZ', 'EN', 'DE', 'FR'].map(q).join(';');
  const radky = (jenVApp || []).map(r => [r.klic, r.hodnoty.en, r.hodnoty.de, r.hodnoty.fr].map(q).join(';'));
  return '﻿' + [hlav].concat(radky).join('\r\n');
}

/* ---------- export slovníku do XLSX (16. 9. 2026) ----------
 *
 * Zadání J. V.: „vygeneruj mi všechny verze slovníků, které aktuálně
 * používáme v databázi, v XLS a do aplikace přidej možnost jejich snadného
 * stažení."
 *
 * CO JE „VERZE SLOVNÍKU". Na rozdíl od ceníku slovník verzovaný NENÍ —
 * v databázi neleží historie jako `program.db`. Je jeden a putuje uvnitř
 * konfigurace (konfigurace.js, oddíl `slovnik`); tím se taky přenáší mezi
 * ostrým a testovacím webem. „Verzemi" jsou tedy JAZYKOVÉ MUTACE: EN, DE
 * a FR. Export proto dělá jeden sešit se čtyřmi listy — přehled všech
 * jazyků vedle sebe a pak list na každý jazyk zvlášť, protože překladateli
 * se posílá jeho jazyk, ne tabulka se třemi cizími sloupci.
 *
 * Bere se ŽIVÝ stav `PREKLAD`, ne to, co je zapsané ve zdrojáku: pokud si
 * administrátor načetl konfiguraci s upraveným slovníkem, exportuje se ta.
 * Jinak by soubor tvrdil něco jiného, než čím se právě překládá.
 *
 * Sloupec `stav` je tu kvůli reviznímu kolu (nález E, obchodník): rozlišuje
 * „přeloženo" od „chybí", aby šlo v Excelu filtrovat, co ještě není hotové,
 * bez porovnávání prázdných buněk. */
function slovnikToSheets(preklad, jazyky) {
  const P = preklad || {};
  const J = jazyky || [{ kod: 'en', nazev: 'English' }, { kod: 'de', nazev: 'Deutsch' },
                       { kod: 'fr', nazev: 'Français' }];
  const idx = { en: 0, de: 1, fr: 2 };
  /* Řazení podle českého hesla, ne podle pořadí v souboru: sešit jde do ruky
   * člověku, který v něm hledá slovo, ne pořadí zápisu. Porovnává se česky
   * (localeCompare), aby diakritika nespadla na konec. */
  const hesla = Object.keys(P).sort((a, b) => String(a).localeCompare(String(b), 'cs'));

  const prehled = [['CZ'].concat(J.map(j => j.kod.toUpperCase()))];
  hesla.forEach(cz => {
    const v = P[cz] || [];
    prehled.push([cz].concat(J.map(j => v[idx[j.kod]] || '')));
  });

  const sheets = [{ nazev: 'PŘEHLED', rows: prehled }];
  J.forEach(j => {
    const rows = [['CZ', j.kod.toUpperCase(), 'stav']];
    hesla.forEach(cz => {
      const t = (P[cz] || [])[idx[j.kod]] || '';
      rows.push([cz, t, t ? 'přeloženo' : 'CHYBÍ']);
    });
    sheets.push({ nazev: j.kod.toUpperCase(), rows });
  });
  return sheets;
}

/* Kolik hesel a kolik z nich přeložených — do popisku tlačítka i do hlášky
 * po stažení, ať je hned vidět, co v souboru je. */
function slovnikPrehled(preklad, jazyky) {
  const P = preklad || {};
  const J = jazyky || [{ kod: 'en' }, { kod: 'de' }, { kod: 'fr' }];
  const idx = { en: 0, de: 1, fr: 2 };
  const hesla = Object.keys(P);
  return {
    hesel: hesla.length,
    jazyky: J.map(j => ({
      kod: j.kod,
      prelozeno: hesla.filter(cz => (P[cz] || [])[idx[j.kod]]).length,
    })),
  };
}

/* ============ ZVEŘEJNĚNÝ SLOVNÍK (12. 10. 2026, #401) ============
 *
 * Zadání J. V. 12. 10.: „potřebuji, aby se slovník ukládal stejným způsobem
 * jako ceník". Do té doby žilo převzetí z tabulky Vocabulary jen v paměti
 * relace a po novém nahrání chtěla aplikace totéž znovu.
 *
 * Model je ceníkový: administrátor slovník ZVEŘEJNÍ (/api/slovnik), vznikne
 * verze s datem, autorem a poznámkou, dosud platná verze jde do historie
 * a každý přihlášený si platný slovník po přihlášení položí přes zabudovaný.
 *
 * ZVEŘEJŇUJÍ SE JEN ODCHYLKY od slovníku zabudovaného v sestavení
 * (PREKLAD_ZABUDOVANY v preklad.js), ne celý slovník. Celý by po každém
 * zveřejnění zmrazil i hesla, na která správce nesáhl — a oprava překladu
 * v kódu (běžná práce vývoje) by se pak online tiše neprojevila.
 *
 * Tytéž funkce volá server (netlify/functions/slovnik.mjs, obnova.mjs)
 * i prohlížeč — jedna pravda o tom, co je platný slovník. */
const SLOVNIK_MEZE = {
  hesel: 5000,              // počet hesel ve zveřejněném slovníku
  /* Délka českého hesla: zadání říkalo „např. 300", jenže zabudovaný
   * slovník má hesla (smluvní odstavce) až o 419 znacích — se stropem 300
   * by převzetí jejich překladu shodilo celé zveřejnění. Proto 1000. */
  klic: 1000,
  text: 2000,               // délka jednoho překladu (znaky)
  poznamka: 500,            // poznámka ke zveřejnění
  telo: 1024 * 1024,        // strop těla požadavku (bajty UTF-8) — 413
  /* Strop uloženého záznamu i s historií v BAJTECH UTF-8 (revize #401:
   * dřív ve znacích — česká a francouzská diakritika má 2 bajty, takže
   * „3 MB znaků" bylo až 6 MB). Musí se vejít do dávky obnovy
   * (OBNOVA_DAVKA_MAX_B 3,5 MB) i s rezervou do zálohy. */
  db: 2 * 1024 * 1024,
  historie: 20,             // kolik starších verzí se drží
  verze: 1000000,           // nejvyšší přípustné číslo verze (obnova ze zálohy)
};
/* Velikost v bajtech UTF-8 — tak ji měří úložiště, Netlify i dávky obnovy. */
function slovnikBajty(x) {
  const t = typeof x === 'string' ? x : JSON.stringify(x === undefined ? null : x);
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(t).length;
  return unescape(encodeURIComponent(t)).length;
}
/* Klíče, které by v obyčejném objektu sáhly na prototyp (PREKLAD[k] = …).
 * Od B160 (audit 25, 16. 10. 2026) i všechny ostatní vlastnosti
 * Object.prototype (hasOwnProperty, toString, valueOf …): heslo s takovým
 * názvem by v objektu PREKLAD zastínilo metodu. */
const SLOVNIK_ZAKAZANE_KLICE = ['__proto__', 'constructor', 'prototype']
  .concat(Object.getOwnPropertyNames(Object.prototype))
  .filter((k, i, a) => a.indexOf(k) === i);
/* Řídicí znaky rozbijí XML Wordu (nabídka v cizím jazyce) — do slovníku
 * nepatří; U+FFFE a U+FFFF XML 1.0 nepovoluje taky (revize #401). */
const SLOVNIK_RIDICI = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/;
/* Normalizace hesla stejná jako v tr() (prekladNorm z preklad.js). Kontrola
 * zakázaných klíčů musí platit i PO ní: „__proto__:" se normalizuje na
 * „__proto__" a v rejstříku PREKLAD_IDX by sáhlo na prototyp (revize #401). */
function slovnikNorm(k) {
  if (typeof prekladNorm === 'function') return prekladNorm(k);
  if (typeof require === 'function') { try { return require('./preklad.js').prekladNorm(k); } catch (e) { /* níž */ } }
  return String(k == null ? '' : k).trim().replace(/[\s:.*]+$/, '').toLowerCase();
}

/* Přísná kontrola hesel: { cz: [EN, DE, FR] }. Vrací { ok, chyba } nebo
 * { ok, hesla (čistá kopie), pocet }. Nic se nezkracuje ani nedomýšlí —
 * co neprojde, odmítne se celé (server 400), aby správce věděl proč. */
function slovnikHeslaKontrola(hesla) {
  const M = SLOVNIK_MEZE;
  if (!hesla || typeof hesla !== 'object' || Array.isArray(hesla))
    return { ok: false, chyba: 'Slovník musí být objekt hesel { české heslo: [EN, DE, FR] }.' };
  const klice = Object.keys(hesla);
  if (klice.length > M.hesel)
    return { ok: false, chyba: 'Slovník má ' + klice.length + ' hesel, víc než povolených ' + M.hesel + '.' };
  const out = {};
  for (const k of klice) {
    const kt = String(k).trim();
    if (!kt) return { ok: false, chyba: 'Slovník obsahuje prázdné heslo.' };
    if (k.length > M.klic) return { ok: false, chyba: 'Heslo „' + kt.slice(0, 40) + '…" je delší než ' + M.klic + ' znaků.' };
    /* Zakázané klíče se kontrolují PO normalizaci — ta pokryje i syrový tvar
     * (prekladNorm('__proto__') je zase '__proto__'), samostatná kontrola
     * syrového klíče by byla mrtvý kód (mutace ji nedokázala odlišit). */
    /* Syrový (oříznutý) klíč zvlášť kvůli B160: „hasOwnProperty" se
     * normalizuje na „hasownproperty", které už v seznamu není. */
    if (SLOVNIK_ZAKAZANE_KLICE.indexOf(kt) >= 0 || SLOVNIK_ZAKAZANE_KLICE.indexOf(slovnikNorm(kt)) >= 0)
      return { ok: false, chyba: 'Heslo „' + kt.slice(0, 40) + '" není povolené (po úpravě tvaru je to „' + slovnikNorm(kt) + '").' };
    if (SLOVNIK_RIDICI.test(k)) return { ok: false, chyba: 'Heslo „' + kt.slice(0, 40) + '" obsahuje řídicí znak.' };
    const v = hesla[k];
    if (!Array.isArray(v) || v.length !== 3 || v.some(x => typeof x !== 'string'))
      return { ok: false, chyba: 'Překlad hesla „' + kt.slice(0, 40) + '" musí být trojice textů [EN, DE, FR].' };
    if (v.some(x => x.length > M.text))
      return { ok: false, chyba: 'Překlad hesla „' + kt.slice(0, 40) + '" je delší než ' + M.text + ' znaků.' };
    if (v.some(x => SLOVNIK_RIDICI.test(x)))
      return { ok: false, chyba: 'Překlad hesla „' + kt.slice(0, 40) + '" obsahuje řídicí znak.' };
    out[k] = v.slice();
  }
  return { ok: true, hesla: out, pocet: klice.length };
}

/* Hesla živého slovníku, která se od zabudovaného liší (nebo v něm nejsou). */
function slovnikOdchylky(preklad, zabudovany) {
  const P = preklad || {}, Z = zabudovany || {};
  const out = {};
  Object.keys(P).forEach(k => {
    const v = P[k] || [], z = Object.prototype.hasOwnProperty.call(Z, k) ? Z[k] : null;
    const t = [v[0] || '', v[1] || '', v[2] || ''];
    if (!z || t[0] !== (z[0] || '') || t[1] !== (z[1] || '') || t[2] !== (z[2] || '')) out[k] = t;
  });
  return out;
}

/* Kanonický zápis hesel (seřazené klíče) — pro „beze změny". */
function slovnikOtisk(hesla) {
  const H = hesla || {};
  return JSON.stringify(Object.keys(H).sort().map(k => [k, H[k]]));
}
function slovnikBezeZmeny(db, hesla) {
  const p = db && db.platny;
  return !!p && slovnikOtisk(p.hesla) === slovnikOtisk(hesla);
}

/* Nová verze: dosud platná jde do historie s datem, do kdy platila. Vrací
 * NOVÝ objekt. Historie má strop počtu i velikosti — záznam musí projít
 * jednou dávkou obnovy ze zálohy (3,5 MB), jinak by se z ní nedal vrátit. */
function slovnikDbNovaVerze(db, ctx) {
  const c = ctx || {};
  const kdy = c.kdy || new Date().toISOString();
  const k = slovnikHeslaKontrola(c.hesla || {});
  if (!k.ok) throw new Error(k.chyba);
  const stary = db && db.platny ? db.platny : null;
  const platny = { verze: stary ? (+stary.verze || 0) + 1 : 1, kdy,
    kdo: String(c.kdo || '').slice(0, 200), poznamka: String(c.poznamka || '').slice(0, SLOVNIK_MEZE.poznamka),
    pocet: k.pocet, hesla: k.hesla };
  const historie = (stary ? [Object.assign({}, stary, { platnoDo: kdy })] : [])
    .concat(Array.isArray(db && db.historie) ? db.historie : []).slice(0, SLOVNIK_MEZE.historie);
  const nove = { schema: 1, platny, historie };
  while (nove.historie.length && slovnikBajty(nove) > SLOVNIK_MEZE.db) nove.historie.pop();
  return nove;
}

/* Očista uloženého záznamu (obnova ze zálohy, čtení v prohlížeči): platná
 * verze musí projít touž kontrolou jako zveřejnění, jinak se odmítne celý
 * záznam; vadné starší verze se z historie jen vypustí. */
/* Prázdný přepis zabudovaného překladu (revize #401, rozhodnutí 12. 10. 2026).
 * Zveřejněná odchylka smí znění zabudovaného hesla ZMĚNIT, ale ne vymazat:
 * prázdný text by v cizojazyčné nabídce vytiskl češtinu a v kódu by se to
 * nedalo dohledat. Smazat (vynechat ze zveřejnění) lze jen heslo, které
 * v kódu není. Vrací [{ klic, jazyk }] jazyků, kde zabudovaný slovník
 * překlad má a zveřejňovaná odchylka ho nechává prázdný. */
function slovnikPrazdnePrepisy(hesla, zabudovany) {
  const out = [], Z = zabudovany || {};
  Object.keys(hesla || {}).forEach(k => {
    if (!Object.prototype.hasOwnProperty.call(Z, k)) return;
    SLOVNIK_JAZYKY.forEach((j, i) => {
      if ((Z[k] || [])[i] && !((hesla[k] || [])[i])) out.push({ klic: k, jazyk: j });
    });
  });
  return out;
}
function slovnikPrazdnePrepisyText(chyby) {
  return 'Zveřejněný slovník nesmí zabudovanému heslu vymazat překlad ('
    + chyby.slice(0, 5).map(c => '„' + String(c.klic).slice(0, 40) + '" ' + c.jazyk.toUpperCase()).join(', ')
    + (chyby.length > 5 ? ' a další ' + (chyby.length - 5) : '')
    + '). Změnit znění jde, vymazat ne — cizojazyčná nabídka by vytiskla češtinu.';
}

/* `zabudovany` (nepovinný) = slovník ze sestavení: s ním platná verze
 * neprojde ani s prázdným přepisem zabudovaného hesla (jako zveřejnění). */
function slovnikDbOciste(db, zabudovany) {
  if (!db || typeof db !== 'object' || Array.isArray(db) || !db.platny || typeof db.platny !== 'object')
    return { ok: false, chyba: 'záznam slovníku nemá platnou verzi' };
  const txt = (x, max) => (typeof x === 'string' ? x.slice(0, max) : '');
  const zaznam = (z) => {
    if (!z || typeof z !== 'object' || Array.isArray(z)) return null;
    const k = slovnikHeslaKontrola(z.hesla);
    if (!k.ok) return { chyba: k.chyba };
    /* Verze jen celé číslo 1 … 1 000 000 (revize #401: ze zálohy prošlo
     * 1e300 i Infinity a další verze by se počítala z nesmyslu). */
    const v = (typeof z.verze === 'number' || typeof z.verze === 'string') ? +z.verze : NaN;
    if (!Number.isInteger(v) || v < 1 || v > SLOVNIK_MEZE.verze) return { chyba: 'verze slovníku není celé číslo 1 až ' + SLOVNIK_MEZE.verze };
    const out = { verze: v, kdy: txt(z.kdy, 40), kdo: txt(z.kdo, 200),
      poznamka: txt(z.poznamka, SLOVNIK_MEZE.poznamka), pocet: k.pocet, hesla: k.hesla };
    if (typeof z.platnoDo === 'string') out.platnoDo = txt(z.platnoDo, 40);
    return out;
  };
  const p = zaznam(db.platny);
  if (!p || p.chyba) return { ok: false, chyba: 'platná verze slovníku neprošla kontrolou' + (p && p.chyba ? ' (' + p.chyba + ')' : '') };
  if (zabudovany) {
    const pr = slovnikPrazdnePrepisy(p.hesla, zabudovany);
    if (pr.length) return { ok: false, chyba: 'platná verze slovníku neprošla kontrolou (' + slovnikPrazdnePrepisyText(pr) + ')' };
  }
  const historie = (Array.isArray(db.historie) ? db.historie : []).map(zaznam)
    .filter(z => z && !z.chyba).slice(0, SLOVNIK_MEZE.historie);
  const out = { schema: 1, platny: p, historie };
  while (out.historie.length && slovnikBajty(out) > SLOVNIK_MEZE.db) out.historie.pop();
  if (slovnikBajty(out) > SLOVNIK_MEZE.db) return { ok: false, chyba: 'záznam slovníku je větší než povolený strop' };
  return { ok: true, db: out };
}

/* RAZÍTKO SLOVNÍKU DO ZÁMKU ODESLANÉ NABÍDKY (revize #401, 12. 10. 2026).
 * Zámek zmrazí částky, ale překlady se při dotisku berou z dnešního
 * slovníku — po zveřejnění nové verze by dotisk nesl jiné znění, než jaké
 * zákazník dostal. Razítko { verze, otisk } říká, kterým slovníkem nabídka
 * odešla: `verze` = číslo zveřejněné verze (null = jen zabudovaný),
 * `otisk` = krátký otisk CELÉHO živého slovníku (FNV-1a, 8 hex znaků) —
 * pozná i změnu zabudovaného slovníku mezi sestaveními. */
function slovnikRazitko(preklad, verze) {
  const t = slovnikOtisk(preklad || {});
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  const v = +verze;
  return { verze: (Number.isInteger(v) && v >= 1 && v <= SLOVNIK_MEZE.verze) ? v : null,
           otisk: ('0000000' + h.toString(16)).slice(-8) };
}
/* Razítko z cizích dat (zámek ze zakázky) — jen známý tvar, jinak null. */
function slovnikRazitkoOciste(r) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return null;
  if (typeof r.otisk !== 'string' || !/^[0-9a-f]{8}$/.test(r.otisk)) return null;
  const v = +r.verze;
  return { verze: (r.verze != null && Number.isInteger(v) && v >= 1 && v <= SLOVNIK_MEZE.verze) ? v : null, otisk: r.otisk };
}

/* Položí zveřejněná hesla přes zabudovaný slovník (prohlížeč po přihlášení).
 * `predchozi` = klíče, které položila dřívější verze: ty, které nová verze
 * nenese, se vrátí na zabudované znění (nebo zmizí, když v sestavení nejsou).
 * `fn` = { importuj: prekladImport, smaz: prekladSmaz } — modul na globální
 * PREKLAD sám nesahá. Hesla, která neprojdou kontrolou, se nepoloží vůbec. */
function slovnikPoloz(hesla, predchozi, zabudovany, fn) {
  const k = slovnikHeslaKontrola(hesla || {});
  if (!k.ok) return { ok: false, chyba: k.chyba, pocet: 0, polozeno: (predchozi || []).slice() };
  const ma = (o, x) => !!o && Object.prototype.hasOwnProperty.call(o, x);
  (predchozi || []).forEach(cz => {
    if (ma(k.hesla, cz)) return;
    if (ma(zabudovany, cz)) fn.importuj({ hesla: { [cz]: zabudovany[cz].slice() } });
    else fn.smaz(cz);
  });
  const n = fn.importuj({ hesla: k.hesla });
  return { ok: true, pocet: n, polozeno: Object.keys(k.hesla) };
}

if (typeof module !== 'undefined' && module.exports)
  module.exports = { SLOVNIK_JAZYKY, slovnikNajdiHlavicku, slovnikZListu, slovnikVyberList,
    slovnikPorovnej, slovnikAplikuj, slovnikNoveJakoZmeny, slovnikCsvJenVApp,
    slovnikToSheets, slovnikPrehled,
    SLOVNIK_MEZE, SLOVNIK_ZAKAZANE_KLICE, SLOVNIK_RIDICI, slovnikBajty, slovnikNorm, slovnikPrazdnePrepisy,
    slovnikPrazdnePrepisyText, slovnikRazitko, slovnikRazitkoOciste, slovnikHeslaKontrola, slovnikOdchylky, slovnikOtisk,
    slovnikBezeZmeny, slovnikDbNovaVerze, slovnikDbOciste, slovnikPoloz };
