/* ============================================================================
 * ČÍSLO NABÍDKY (CN) — DIALOGY PŘI ZMĚNĚ V HLAVIČCE (#727, J. V. 23. 11. 2026)
 *
 * Model (pořadí pravidel, texty) je v src/cislo_nabidky.js. Tady se jen ptá.
 * Volá se z set() v ui/common.js pro cestu ZAK.cislo — tedy ze všech míst,
 * kde pole číslo nabídky je (hlavička OCK i PROJ, technická specifikace,
 * krycí listy přes bind). Vrací true = set() skončí (změna čeká na
 * odpověď, nebo neprojde); false = set() pokračuje jako dřív.
 *
 * Po odpovědi ANO se set() zavolá znovu s průchodem CN_UI.pruchod — dál
 * platí všechny ostatní stráže (zámek čtení, A3 u odeslané nabídky…).
 * ============================================================================ */

const CN_UI = { pruchod: null };

/* Zakázka už leží v databázi (online nebo ve složce). */
function cnZakazkaUlozena() {
  return !!((typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV.soubor)
    || (typeof ULO_STAV !== 'undefined' && ULO_STAV.soubor));
}

function cnDuplicitniSoubor(po) {
  if (typeof zakazkaDuplicita !== 'function' || typeof ONLINE_STAV === 'undefined') return '';
  return zakazkaDuplicita({ cislo: po, nazevAkce: '' }, ONLINE_STAV.rejstrik, ONLINE_STAV.soubor).cislo || '';
}

/* Otevře Načíst zakázku s textem v hledání (bod 2). */
function cnOtevriHledani(text) {
  if (typeof ONLINE_STAV !== 'undefined') ONLINE_STAV.hledat = String(text || '').trim();
  if (typeof zakNactiUI === 'function') zakNactiUI();
  setTimeout(() => {
    const el = document.getElementById('onlineZakHledat');
    if (el) { el.focus(); try { el.select(); } catch (e) { /* nic */ } }
  }, 0);
}

function cnZmenaUI(v) {
  if (CN_UI.pruchod !== null && CN_UI.pruchod === v) { CN_UI.pruchod = null; return false; }
  if (typeof cnZmenaPosud !== 'function') return false;
  /* Odeslaná nabídka a role bez práva: rozhodne A3 v set() vlastní hláškou. */
  if (typeof zakazkaMaOdeslanou === 'function' && zakazkaMaOdeslanou(ZAK)
    && (typeof jeAdmin !== 'function' || !jeAdmin())) return false;
  const pred = get('ZAK.cislo');
  const posud = (jeToCislo) => cnZmenaPosud({ pred, po: v, ulozena: cnZakazkaUlozena(),
    dupSoubor: cnDuplicitniSoubor(v), jeToCislo });
  const proved = () => { CN_UI.pruchod = v; try { set('ZAK.cislo', v); } finally { CN_UI.pruchod = null; } };
  const dale = (p) => {
    if (p.akce === 'nic' || p.akce === 'provest') { proved(); return; }
    if (p.akce === 'zamitnout') { hlaska(p.text, { nadpis: 'Číslo nabídky se nezměnilo' }).then(() => render()); return; }
    if (p.akce === 'potvrdit') {
      potvrd(p.text, { nadpis: 'Změna čísla nabídky', ano: 'ANO', ne: 'NE', vychoziNe: true })
        .then(ok => { if (ok) proved(); else render(); });
    }
  };
  const p = posud(false);
  if (p.akce === 'nic' || p.akce === 'provest') return false;
  render();   // v poli zůstane původní číslo, dokud se nerozhodne
  if (p.akce === 'hledat') {
    volba(p.text, [
      { kod: 'hledat', popis: 'Vyhledat zakázku', primary: true },
      { kod: 'cislo', popis: 'Je to číslo nabídky' },
      { kod: 'zrusit', popis: 'Zrušit' },
    ], { nadpis: 'Chtěli jste zakázku vyhledat?' }).then(k => {
      if (k === 'hledat') { render(); cnOtevriHledani(v); return; }
      if (k === 'cislo') { dale(posud(true)); return; }
      render();
    });
    return true;
  }
  dale(p);
  return true;
}

if (typeof module !== 'undefined') module.exports = { cnZmenaUI, cnZakazkaUlozena, cnOtevriHledani, CN_UI };
