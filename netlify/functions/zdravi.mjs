/* /api/zdravi — kontrola, že serverová část na Netlify žije (K3).
 * Odpovídá { ok, verze, cas }; verze se čte z verze.txt přibalené k funkci. */
/* Čtení verze.txt je od 22. 9. 2026 ve sdilene.mjs — potřebuje ho i /api/zakazky
 * (razítko ověření odeslané nabídky, B59). */
import { serverVerze as verze } from '../lib/sdilene.mjs';

/* Prostředí (20. 8. 2026): TESTOVACÍ web má vlastní Netlify site, a tedy
 * i vlastní úložiště Blobs — data se s ostrým provozem nikdy nepotkají.
 * Jediné, co chybělo, byla jistota, KDE člověk zrovna je: dvě stejně
 * vypadající kalkulačky vedle sebe jsou pozvánka k tomu udělat nabídku
 * v testu a odeslat ji zákazníkovi. Proměnná PROSTREDI (`test` / `ostre`)
 * se proto hlásí sem a klient podle ní kreslí červený pruh.
 * Nenastavená proměnná = ostrý provoz: kdo si nový web zakládá, nastaví ji,
 * a starý ostrý web se chová dál stejně. */
function prostredi() {
  const p = String(process.env.PROSTREDI || '').trim().toLowerCase();
  return (p === 'test' || p === 'sandbox' || p === 'testovaci') ? 'test' : 'ostre';
}

/* Příznak „hlavní správce nastaven" tu byl od 16. 9. do 23. 9. 2026. Hlásil
 * se ale anonymně komukoli (nález B57) a v aplikaci ho nikdo neviděl (#278).
 * Od 23. 9. ho dostává jen přihlášený administrátor (/api/ja, přihlášení)
 * a aplikace mu ho ukáže v Nastavení → Uživatelé. */

export default async () =>
  Response.json({ ok: true, verze: verze(), prostredi: prostredi(),
    popisProstredi: String(process.env.PROSTREDI_POPIS || '').trim(),
    cas: new Date().toISOString(), beh: 'netlify' });

export const config = { path: '/api/zdravi' };
