/* OČISTA ZLATÝCH SCÉNÁŘŮ O PŘÍZNAK #757 (ER, 24. 11. 2026, svěřené rozhodnutí).
 *
 * Od #757 dostává NOVÁ kalkulace (`novaZakazka()`, ZADANI_NOVA) příznak
 * `engineeringPriplatek: true` a engineering je pak příplatek mimo nabídku.
 * Zlaté sady #560 a VS (zlata_560.js, zlata_vs.js) ale `novaZakazka()`
 * používají jen jako lešení pro STARÉ kalkulace — otiskují, že se jejich
 * výsledek nemění ani o bit. Tahle očista vrátí zadání do tvaru bez příznaku
 * (= kalkulace založená před #757). Na stromu před #757 nedělá nic (příznak
 * ani klíč 'engineering' tam nejsou). Nové chování hlídá
 * src/test_engineering_priplatek.js. Vrátit: smazat soubor a dvě volání. */
'use strict';
function predEr(zadani) {
  if (!zadani || typeof zadani !== 'object') return zadani;
  delete zadani.engineeringPriplatek;
  if (Array.isArray(zadani.priplatkyVynechat))
    zadani.priplatkyVynechat = zadani.priplatkyVynechat.filter(k => k !== 'engineering');
  return zadani;
}
module.exports = { predEr };
