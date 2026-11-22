/* Čekání prohlížečových harnessů na STAV, ne na čas (C9 #608, 16. 11. 2026).
 *
 * Testovací kolo 48: overit_klon_tisk.mjs a overit_kryci_cislo_sod.mjs
 * vypršely při souběhu s jinými prohlížečovými běhy, samostatně prošly.
 * Harnessy čekaly pevnými `waitForTimeout` a pevnými limity (15 s, výchozích
 * 30 s Playwrightu) — pod zátěží se ukládání protáhne a pevné číslo nestačí,
 * a čekání „na nic" (dotaz na dialog, který neexistuje) spálí celý limit.
 *
 * Proto:
 *   - JEDNA KONSTANTA: všechny limity harnessu jsou násobky
 *     HARNESS_TIMEOUT_MS = proměnná prostředí KNG_HARNESS_TIMEOUT_MS
 *     (celé kladné číslo v ms, výchozí 15000). Pomalý stroj nebo souběh
 *     ji zvýší, nic se nepřepisuje v kódu. Neplatná hodnota = chyba (nikdy
 *     tiché „výchozí").
 *   - KLID STRÁNKY místo pevné pauzy: sledujAkce() obalí asynchronní akce
 *     aplikace (Prodáno, nabídka klonu, uložení …) počítadlem běžících
 *     volání; cekejNaKlid() čeká, až žádná nebeží a neběží ani uložení
 *     (ONLINE_STAV.ukladaBeh, ZAKULO_STAV.uklada).
 *
 * Použití (ESM harness přes createRequire):
 *   const { casLimit, sledujAkce, cekejNaKlid } = require('./nastroje/harness_cekani.js');
 *   page.setDefaultTimeout(casLimit());
 *   await sledujAkce(page, ['prodejUiProdej', 'onlineUloz']);
 *   await page.click(…); await cekejNaKlid(page);
 * Test: src/test_harness_cekani.js. */
'use strict';

const VYCHOZI_TIMEOUT_MS = 15000;

function harnessTimeoutMs(env = process.env) {
  const s = env.KNG_HARNESS_TIMEOUT_MS;
  if (s === undefined || String(s).trim() === '') return VYCHOZI_TIMEOUT_MS;
  const t = String(s).trim();
  if (!/^\d+$/.test(t) || +t <= 0)
    throw new Error('KNG_HARNESS_TIMEOUT_MS musí být celé kladné číslo v milisekundách (zadáno „' + s + '")');
  return +t;
}

const HARNESS_TIMEOUT_MS = harnessTimeoutMs();

/* Limit jako násobek základní konstanty (delší čekání = větší násobek). */
const casLimit = (nasobek = 1) => Math.max(1, Math.round(HARNESS_TIMEOUT_MS * nasobek));

/* Obalí asynchronní funkce aplikace počítadlem window.__kngAkce. Funkce
 * deklarované v klasickém skriptu jsou vlastnosti window, takže obal zachytí
 * i volání z kódu aplikace (onclick, set → zamekUpozorni …). Volat po načtení
 * aplikace (a znovu po reload — obal je jen v otevřené stránce). */
function sledujAkce(page, jmena) {
  return page.evaluate((jmena) => {
    if (typeof window.__kngAkce !== 'number') window.__kngAkce = 0;
    const chybi = [];
    for (const j of jmena) {
      const f = window[j];
      if (typeof f !== 'function') { chybi.push(j); continue; }
      if (f.__kngSledovano) continue;
      const obal = function (...a) {
        const r = f.apply(this, a);
        if (r && typeof r.then === 'function') {
          window.__kngAkce++;
          const hotovo = () => { window.__kngAkce--; };
          r.then(hotovo, hotovo);
        }
        return r;
      };
      obal.__kngSledovano = true;
      obal._puvodni = f;
      window[j] = obal;
    }
    return chybi;
  }, jmena).then((chybi) => {
    if (chybi.length) throw new Error('sledujAkce: v aplikaci chybí funkce ' + chybi.join(', '));
  });
}

/* Stránka je v klidu: žádná sledovaná akce neběží a neběží uložení. */
const klidStranky = () => (typeof window.__kngAkce !== 'number' || window.__kngAkce === 0)
  && (typeof ONLINE_STAV === 'undefined' || !ONLINE_STAV.ukladaBeh)
  && (typeof ZAKULO_STAV === 'undefined' || !ZAKULO_STAV.uklada);

function cekejNaKlid(page, nasobek = 1) {
  return page.waitForFunction(klidStranky, null, { timeout: casLimit(nasobek) });
}

/* START APLIKACE (#638, 21. 11. 2026): skripty jsou načtené a první sonda
 * serveru (/api/zdravi + /api/ja) doběhla — místo pevné pauzy po goto/reload. */
const startHotov = () => typeof window.render === 'function'
  && typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV.sondaHotova === true;
function cekejNaStart(page, nasobek = 4) {
  return page.waitForFunction(startHotov, null, { timeout: casLimit(nasobek) });
}

/* PŘIHLÁŠENÍ V PROHLÍŽEČI (#638). overit_zobrazeni.mjs a overit_zaporne.mjs
 * klikly na Přihlásit, počkaly pevných 500–600 ms a pak 10 s na
 * ONLINE_STAV.ja. Když server přihlášení odmítl (chybějící ADMIN_EMAIL,
 * brzda pokusů B4 / POKUSY_MAX, špatné heslo), harness jen vypršel
 * („Timeout 10000ms exceeded") a nikdo nevěděl proč. Teď se čeká na
 * VÝSLEDEK: buď je přihlášen ten, kdo se přihlašoval, a doběhlo i načtení
 * po přihlášení (ONLINE_STAV.pracuje = false), nebo aplikace ukázala
 * varování — a to se vypíše jako chyba s návodem. */
const vysledekPrihlaseni = (email) => {
  if (typeof ONLINE_STAV === 'undefined' || ONLINE_STAV.pracuje) return false;
  if (ONLINE_STAV.ja && String(ONLINE_STAV.ja.email || '').toLowerCase() === email) return 'ok';
  if (ONLINE_STAV.hlaskaTyp === 'varovani' && ONLINE_STAV.hlaska) return 'chyba:' + ONLINE_STAV.hlaska;
  return false;
};
const NAVOD_PRIHLASENI = 'Zkontroluj: (1) ADMIN_EMAIL — netlify/lib/sdilene.mjs ho čte při IMPORTU, '
  + 'harness proto musí jako první importovat nastroje/harness_prostredi.mjs; (2) brzdu pokusů '
  + '(POKUSY_MAX v sdilene.mjs, „Příliš mnoho neúspěšných pokusů"); (3) heslo zkušebního účtu.';
async function prihlasVProhlizeci(page, email, heslo, nasobek = 4) {
  const e = String(email).trim().toLowerCase();
  await page.evaluate(() => { ONLINE_STAV.hlaska = ''; ONLINE_STAV.hlaskaTyp = ''; });
  await page.fill('#onlineEmail', email);
  await page.fill('#onlineHeslo', heslo);
  await page.click('#prihlaseni-box >> text=Přihlásit');
  let v;
  try {
    v = await (await page.waitForFunction(vysledekPrihlaseni, e, { timeout: casLimit(nasobek) })).jsonValue();
  } catch (chyba) {
    throw new Error('Přihlášení ' + email + ' nedoběhlo do ' + casLimit(nasobek)
      + ' ms (KNG_HARNESS_TIMEOUT_MS). ' + NAVOD_PRIHLASENI);
  }
  if (v !== 'ok') throw new Error('Přihlášení ' + email + ' odmítnuto: „' + String(v).slice(6) + '". ' + NAVOD_PRIHLASENI);
}

module.exports = { VYCHOZI_TIMEOUT_MS, HARNESS_TIMEOUT_MS, harnessTimeoutMs, casLimit, sledujAkce, cekejNaKlid, klidStranky,
  startHotov, cekejNaStart, vysledekPrihlaseni, prihlasVProhlizeci, NAVOD_PRIHLASENI };
