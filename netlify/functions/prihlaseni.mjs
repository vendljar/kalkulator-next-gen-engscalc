/* POST /api/prihlaseni { email, heslo } → HttpOnly cookie relace.
 * První přihlášení administrátora zakládá účet heslem z ADMIN_INIT_HESLO.
 *
 * Od 9. 8. 2026 tudy vedou dvě opatření z bezpečnostního auditu:
 *   #92 — brzda proti hádání hesel (počítadlo neúspěchů, zpoždění, 429).
 *         NIKDY nebrání správnému heslu; podrobnosti v lib/sdilene.mjs.
 *   #93 — u neznámého e-mailu se počítá scrypt proti zástupnému otisku,
 *         aby se z času odpovědi nedalo přečíst, které adresy existují.
 */
import { uloziste, otiskHesla, hesloSedi, relaceCookie, json, ADMIN_EMAIL,
         profilZUctu, podpisCti, FALESNY_OTISK, POKUSY_MAX,
         zpozdeniMs, pockej, pokusyZacatek, pokusyUspech, pokusyAdresaNadLimit, adresaKlienta,
         EMAIL_MAX, HESLO_MAX, spravceNastaven, cizihoPuvodu } from '../lib/sdilene.mjs';

export default async (req) => {
  if (req.method !== 'POST') return json({ ok: false, chyba: 'Použijte POST.' }, 405);
  /* Přihlášení z cizí stránky (nález B78 hloubkového testu 24. 9. 2026).
   * Ostatní funkce odmítají cizí původ přes `prihlaseny()`, přihlášení ale
   * relaci teprve zakládá — cizí stránka tak mohla prohlížeč obchodníka
   * potichu přihlásit do SVÉHO účtu a zakázky by se ukládaly útočníkovi.
   * Odmítá se cizí Origin, „null" (sandboxovaný rámec) i formulářový tvar
   * těla; aplikace posílá JSON ze stejné adresy. */
  const origin = req.headers.get('origin');
  const ct = String(req.headers.get('content-type') || '').toLowerCase();
  if (cizihoPuvodu(req) || origin === 'null'
      || /^(application\/x-www-form-urlencoded|multipart\/form-data)/.test(ct))
    return json({ ok: false, chyba: 'Přihlášení je možné jen z aplikace.' }, 403);
  let email = '', heslo = '';
  try { const t = await req.json(); email = String(t.email || '').trim().toLowerCase(); heslo = String(t.heslo || ''); }
  catch (e) { return json({ ok: false, chyba: 'Vstup není platný JSON.' }, 400); }
  if (!email || !heslo) return json({ ok: false, chyba: 'Zadejte e-mail i heslo.' }, 400);
  /* Délky (B16): nesmyslně dlouhý e-mail by založil obří klíč v počítadle
   * pokusů, nesmyslně dlouhé heslo by zaměstnalo scrypt. Stejná hláška jako
   * u špatného hesla — tvar vstupu nesmí prozradit, co existuje. */
  if (email.length > EMAIL_MAX || heslo.length > HESLO_MAX)
    return json({ ok: false, chyba: 'Nesprávný e-mail nebo heslo.' }, 401);

  /* Pokus se započítá HNED — dřív než se cokoli ověřuje (B4, 22. 8. 2026).
   * Čekání podle počítadla běží také před ověřením, aby souběžné požadavky
   * platily stejně jako ty popořadě. Správné heslo počítadla vynuluje. */
  const ip = adresaKlienta(req);
  const pokusy = await pokusyZacatek(email, ip);
  /* LIMIT ADRESY SE ROZHODUJE PŘED OVĚŘENÍM HESLA (B75, hloubkový test
   * 24. 9. 2026; do té doby se i nad limitem počítal scrypt a správné heslo
   * prošlo). Zásada #92 „brzda nikdy nebrání správnému heslu" platí dál pro
   * počítadlo E-MAILU: to je ta obrana proti zamknutí majitele cizími pokusy.
   * Počítadlo ADRESY je jiný případ — kdo z jedné adresy poslal přes šedesát
   * špatných hesel za čtvrt hodiny, není majitel, který se spletl; a hádání
   * nesmí ani zaměstnávat server scryptem. Odmítá se hned, 429. */
  if (pokusyAdresaNadLimit(pokusy))
    return json({ ok: false, chyba: 'Příliš mnoho neúspěšných pokusů z této adresy. Zkuste to za '
      + 'několik minut znovu, nebo se ozvěte správci.' }, 429);
  await pockej(zpozdeniMs(pokusy.email.n));

  const u = await uloziste('uzivatele');
  let ucet = await u.cti(email);

  /* bootstrap prvního administrátora — heslo si uživatel nastavil sám
   * v prostředí Netlify, nikdy neputovalo přes konverzaci */
  if (!ucet && email === ADMIN_EMAIL && process.env.ADMIN_INIT_HESLO
      && heslo === process.env.ADMIN_INIT_HESLO) {
    ucet = { email, jmeno: 'Jaroslav Vendl', role: 'Administrátor',
             heslo: otiskHesla(heslo), zalozen: new Date().toISOString(), aktivni: true };
    await u.zapis(email, ucet);
  }

  /* Heslo se ověřuje jako PRVNÍ a vždycky — i u neznámého účtu (proti
   * zástupnému otisku) a i tehdy, když je počítadlo neúspěchů přeplněné.
   * Kdyby brzda předběhla ověření, stačilo by nasypat deset špatných hesel
   * a majitel účtu by se nedostal dovnitř ani se správným. */
  const sedi = hesloSedi(heslo, (ucet && ucet.heslo) ? ucet.heslo : FALESNY_OTISK);
  const pustit = !!ucet && ucet.aktivni !== false && sedi;

  if (pustit) {
    await pokusyUspech(email, ip);
    const cookie = relaceCookie(ucet);                    // nese verzi hesla (B6)
    /* Profil se vrací rovnou při přihlášení (#145): aplikace jím vyplňuje blok
     * „Vypracoval" v cenové nabídce. Kdyby si ho musela dotahovat zvlášť, první
     * nabídka udělaná hned po přihlášení by odešla bez podpisu a bez telefonu. */
    return json({ ok: true, ...profilZUctu(ucet), hlavni: ucet.email === ADMIN_EMAIL,
      /* Jen administrátorovi (B57, #278), stejně jako /api/ja. */
      ...(ucet.role === 'Administrátor' ? { spravceNastaven: spravceNastaven() } : {}),
      podpis: await podpisCti(ucet.email) }, 200, { 'Set-Cookie': cookie });
  }

  if (pokusy.email.n > POKUSY_MAX)
    return json({ ok: false, chyba: 'Příliš mnoho neúspěšných pokusů. Zkuste to za '
      + 'několik minut znovu, nebo se ozvěte správci.' }, 429);
  return json({ ok: false, chyba: 'Nesprávný e-mail nebo heslo.' }, 401);
};
export const config = { path: '/api/prihlaseni' };
