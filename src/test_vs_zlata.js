/* ZLATÁ SADA VS-E0 (#570 / #590): zakázka s jednou šachtou = výchozí commit
 * 3ff5403 (v10.11.1) bajt po bajtu — výpočet, vypocetZ, koncová cena, symboly
 * a náhled CN (cz, en), text Wordu, krycí list, specifikace, SoD, Pipedrive,
 * controlling CSV, snímek a výsledek zámku. Otisky v src/test_vs_zlata.json
 * vyrobil nastroje/zlata_vs.js nad stromem 3ff5403; tady se tentýž skript
 * pustí nad dnešním stromem a porovná se otisk po otisku.
 *
 * Pojistka (10. 11. 2026): nad 3ff5403 projde 319/319 scénářů; úmyslná změna
 * výsledku (např. CEIL základu na stovky v engine.js) shodí vyp, vypZ, cenu
 * i dokumenty — viz zpráva commitu.
 *
 * Kdo VĚDOMĚ mění výsledek jedné šachty (nová funkce mimo VS), otisky
 * přegeneruje:  node nastroje/zlata_vs.js src > src/test_vs_zlata.json
 * a do commitu napíše proč. Kvůli VS se otisky nemění nikdy. */
'use strict';
const path = require('path');
const fs = require('fs');
const { zlata } = require('../nastroje/zlata_vs.js');

const ulozene = JSON.parse(fs.readFileSync(path.join(__dirname, 'test_vs_zlata.json'), 'utf8'));
process.env.KNG_ZLATA_VS_POCET = String(ulozene.pocetFuzz);

zlata(__dirname).then(ted => {
  const ocek = ulozene.scenare;
  let ok = 0, spatne = 0;
  const vypis = [];
  const klice = Object.keys(ocek);
  for (const k of klice) {
    const a = ocek[k], b = ted[k];
    if (!b) { spatne++; vypis.push(k + ': scénář chybí'); continue; }
    const rozdil = Object.keys(a).filter(x => a[x] !== b[x]);
    if (Object.keys(b).some(x => !(x in a))) rozdil.push('(nový klíč ' + Object.keys(b).filter(x => !(x in a)).join(',') + ')');
    if (rozdil.length) { spatne++; vypis.push(k + ': ' + rozdil.join(', ')); } else ok++;
  }
  const navic = Object.keys(ted).filter(k => !(k in ocek));
  if (navic.length) { spatne++; vypis.push('scénáře navíc: ' + navic.slice(0, 5).join(', ')); }
  if (klice.length < 300) { spatne++; vypis.push('málo scénářů (' + klice.length + ') — prázdná sada?'); }
  console.log('Zlatá sada VS (1 šachta = 3ff5403): ' + ok + '/' + klice.length + ' scénářů shodných.');
  if (spatne) {
    console.log('ROZDÍLY (' + spatne + '):');
    vypis.slice(0, 25).forEach(x => console.log('  ✗ ' + x));
    process.exit(1);
  }
}).catch(e => { console.error(e); process.exit(1); });
