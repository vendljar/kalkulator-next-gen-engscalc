import { json, cizihoPuvodu } from '../lib/sdilene.mjs';
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
  return json({ ok: true }, 200,
    { 'Set-Cookie': 'relace=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0' });
};
export const config = { path: '/api/odhlaseni' };
