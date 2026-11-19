/* OČISTA ZLATÝCH OTISKŮ O ZMĚNU ZOBRAZENÍ D4 (19. 11. 2026, rozhodnutí J. V.).
 *
 * Dávka DO přejmenovala ZOBRAZOVANÝ název materiálu přechodových plechů ve
 * Volitelných na „PŘECHODOVÉ PLECHY - NEREZ (MATERIÁL)" (klíč `origNazev`
 * zůstal) a v seznamu `volitelneKatalog` posunula montáž hned pod materiál.
 * Čísla, pořadí sčítání (`sekce.volitelne`) ani dokumenty se nezměnily.
 *
 * Zlaté sady (zlata_560.js, zlata_vs.js) otiskují celý výsledek jádra
 * bajt po bajtu proti stromu výchozího commitu. Tahle očista vrátí popisek
 * a pořadí zobrazení do dřívější podoby — na starém stromu nedělá nic
 * (název = klíč, pořadí už je staré), na novém vrátí přesně starý tvar.
 * Otisky v test_560_zlata.json a test_vs_zlata.json proto zůstávají a dál
 * dokazují, že se jinak nezměnil ani bit. Pojistka: bez očisty sady padají
 * (vyp, vypZ, zamek / model1, model2). */
'use strict';
const PORADI_PRED_D4 = ['prechodove', 'leseniVnitrni', 'leseniVnejsi', 'prechMont'];
function radky(a) {
  a.forEach(y => {
    if (y && typeof y === 'object' && y.key === 'prechodove' && !y.nazevPrepsan
      && typeof y.origNazev === 'string') y.nazev = y.origNazev;
  });
}
function predD4(o) {
  if (!o || typeof o !== 'object') return o;
  if (Array.isArray(o)) { o.forEach(predD4); return o; }
  if (Array.isArray(o.volitelneKatalog)) {
    radky(o.volitelneKatalog);
    const iPred = k => { const i = PORADI_PRED_D4.indexOf(k); return i < 0 ? 99 : i; };
    const kat = o.volitelneKatalog.map((y, i) => ({ y, i }));
    kat.sort((a, b) => (iPred(a.y && a.y.key) < 99 && iPred(b.y && b.y.key) < 99)
      ? iPred(a.y.key) - iPred(b.y.key) : a.i - b.i);
    o.volitelneKatalog = kat.map(x => x.y);
  }
  if (o.sekce && Array.isArray(o.sekce.volitelne)) radky(o.sekce.volitelne);
  Object.keys(o).forEach(k => { if (k !== 'volitelneKatalog') predD4(o[k]); });
  return o;
}
/* Kopie výsledku po očistě (originál se nemění). */
function predD4Kopie(o) {
  if (o === undefined) return o;
  return predD4(JSON.parse(JSON.stringify(o)));
}
module.exports = { predD4, predD4Kopie };
