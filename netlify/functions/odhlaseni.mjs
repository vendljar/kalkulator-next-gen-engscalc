import { json, cizihoPuvodu, vyzadujRoli, uloziste, hesloVerzeUctu } from '../lib/sdilene.mjs';
/* Odhlášení jen na POST (audit 22. 8. 2026, B17): odkaz z cizí stránky
 * (GET přes navigaci posílá cookie i se SameSite=Lax) by jinak uživatele
 * odhlásil. Nic víc to neumí, ale je to obtěžování zadarmo. */
export default async (req) => {
  if (req.method !== 'POST') return json({ ok: false, chyba: 'Použijte POST.' }, 405);
  /* Původ a tvar požadavku jako u přihlášení (B78, hloubkový test 24. 9. 2026):
   * cizí Origin, „null" (sandboxovaný rámec) i formulářové tělo se odmítnou.
   * Aplikace posílá JSON ze stejné adresy; cizí stránka nemá odhlašovat. */
  const origin = req.headers.get('origin');
  const ct = String(req.headers.get('content-type') || '').toLowerCase();
  if (cizihoPuvodu(req) || origin === 'null'
      || /^(application\/x-www-form-urlencoded|multipart\/form-data)/.test(ct))
    return json({ ok: false, chyba: 'Odhlášení je možné jen z aplikace.' }, 403);
  /* ODHLÁŠENÍ PLATÍ I NA SERVERU (B6, audit 22. 8. 2026; 13. 10. 2026).
   * Relace je podepsaná cookie s platností 12 hodin. Dřív odhlášení jen
   * smazalo cookie v prohlížeči — kdo si ji předtím zkopíroval (sdílený
   * počítač, zachycený požadavek), přihlášený zůstal až do vypršení.
   * Odhlášení proto zvedne verzi hesla účtu: všechny dosud vydané relace
   * toho účtu přestanou platit — vědomě i na ostatních zařízeních (stejně
   * jako změna hesla). Neplatná nebo chybějící relace nic nezvedá; selhání
   * úložiště odhlášení v prohlížeči nezastaví. */
  try {
    const { relace } = await vyzadujRoli(req);
    if (relace) {
      /* Revize 13. 10.: účet se čte znovu těsně před zápisem a mění se jen
       * verze hesla — dřív se zapisovala kopie přečtená v ověření relace
       * a souběžná změna správce (vypnutí, reset hesla, role) se mohla
       * přepsat zpět. Zvýšení verze nikdy nesníží verzi, kterou mezitím
       * nastavil reset hesla. */
      const u = await uloziste('uzivatele');
      const cerstvy = await u.cti(relace.email);
      if (cerstvy) {
        cerstvy.hesloVerze = hesloVerzeUctu(cerstvy) + 1;
        await u.zapis(relace.email, cerstvy);
      }
    }
  } catch (e) { /* cookie se smaže i tak */ }
  return json({ ok: true }, 200,
    { 'Set-Cookie': 'relace=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0' });
};
export const config = { path: '/api/odhlaseni' };
