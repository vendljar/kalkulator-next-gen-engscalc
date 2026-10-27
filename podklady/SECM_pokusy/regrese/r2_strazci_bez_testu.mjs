/* SEC-M regrese — strážce, jehož vypnutí (vlastní mutace R-M5)
 * žádný test nechytí. Na main ověřuje, že strážce SÁM drží (chování), a ukazuje,
 * proč ho stávající test nevidí:
 *   R-M5  hlavní účet nejde archivovat — test_prava.mjs to zkouší cookie
 *         HLAVNÍHO správce, takže 400 vrátí už strážce „vlastní účet“ (L31);
 *         zde to zkouší vedlejší správce (admin2).
 * (R-M24 se tu neověřuje: u existujícího účtu stav aktivní/archiv drží už
 *  stavUctuDrziServer — B30 — a hlavní účet obnoví jen on sám, takže strážce
 *  je pojistka navíc; pokus se zálohou aktivni=false dal 200 a účet zapnutý
 *  i bez strážce.)
 * Spuštění z kořene repa: node podklady/SECM_pokusy/regrese/r2_strazci_bez_testu.mjs
 * (nad kopií se zmutovaným kódem: zkopírovat i S1 harness a pustit tam). */
import { priprav, F, req, pamet, S } from '../../S1_pokusy/server/harness.mjs';
const U = await priprav();
const vysl = [];

// R-M5
const r5 = await req(F.uzivatele, 'POST', '/api/uzivatele', { akce: 'archiv', email: S.ADMIN_EMAIL, archiv: true }, U.admin2.cookie);
const t5 = await r5.json();  // pojistka: bez strážce (if (false)) → 200 a archiv=true
const hl5 = JSON.parse(pamet.get('uzivatele/' + S.ADMIN_EMAIL) || '{}');
console.log('R-M5: vedlejší správce archivuje hlavní účet →', r5.status, (t5.chyba || '').slice(0, 60), '| hlavní účet archiv =', !!hl5.archiv);
vysl.push(r5.status === 400 && !hl5.archiv);

console.log('VÝSLEDEK: ' + (vysl.every(Boolean) ? 'strážce R-M5 na tomto kódu drží (chybí jen test, viz vlastni_mutace.mjs)'
  : 'STRÁŽCE NEDRŽÍ nebo pokus neproběhl: ' + JSON.stringify(vysl)));
