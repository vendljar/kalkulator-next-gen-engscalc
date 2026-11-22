/* /api/pripominky — PŘIPOMÍNKY Z APLIKACE (dávka PR, zadání J. V. 21. 11. 2026)
 *
 * PŘIHLÁŠENÝ (cookie relace):
 *   GET   /api/pripominky                 → správce: všechny (bez snímku) + počty;
 *                                            ostatní: jen svoje (pohled autora)
 *   GET   /api/pripominky?moje=1           → kdokoli: jen svoje (pohled autora)
 *   GET   /api/pripominky?nastaveni=1      → zapnuto / smí odesílat / výchozí snímek / limit;
 *                                            správce navíc celé nastavení a stav klíče
 *   GET   /api/pripominky?snimek=P-0001    → snímek obrazovky — JEN správce
 *   POST  { typ, text, kontext, snimek }   → nová připomínka (funkce zapnutá, role povolena,
 *                                            nejvýš limitDen za den na uživatele)
 *   POST  { akce:'nastaveni', nastaveni }  → JEN správce
 *   POST  { akce:'klic' | 'klicZrusit', hesloSpravce } → JEN správce s vlastním heslem;
 *                                            nový klíč se vrátí JEDNOU, server drží jen SHA-256
 *   PATCH { id, akce, stav, odpoved, roadmapa, duplicitniS } → JEN správce
 *   PATCH { akce:'precteno', ids, jako:'autor'|'spravce' } → autor svoje (nové odpovědi
 *                                            přečteny) / správce (nepřečtené přečteny)
 *
 * KOORDINACE (hlavička Authorization: Bearer <klíč>, bez cookie):
 *   GET   /api/pripominky?pro=koordinace&od=<ISO>[&stav=fronta,resi]
 *                                          → připomínky puštěné správcem do fronty
 *                                            (stav ≠ nova), změněné od `od`; bez autora,
 *                                            zakázky, polí a snímku (B257)
 *   PATCH { id, stav, odpoved, roadmapa }  → jen stav / odpověď / číslo roadmapy
 * Klíč neplatí nikde jinde (žádná jiná funkce ho nezná). Špatný klíč: počítadlo
 * na adresu (10 / 15 min → 429) a záznam; správný klíč: nejvýš 300 požadavků
 * za hodinu (→ 429 a záznam). Klíč v adrese = 400.
 *
 * Bezpečnostní rozbor: BEZPECNOST_MEZE.md, B257. Logika (očista, pohledy,
 * přechody stavů): src/pripominky.js přes lib/pripominky_modul.cjs.
 */
import { createHash, randomBytes } from 'node:crypto';
import { uloziste, vyzadujRoli, json, hloubkaChyba, potvrdHesloSpravce, tajneShodne, vyhradne,
  adresaKlienta, pokusyIpKlic } from '../lib/sdilene.mjs';
import P from '../lib/pripominky_modul.cjs';

export const PR_ULOZISTE = 'pripominky';
export const PR_SNIMKY = 'pripominky_snimky';
export const PR_LIMIT = 'pripominky_limit';
/* Hash klíče koordinace leží MIMO úložiště připomínek (program/pripominky_klic):
 * úložiště `pripominky` jde do zálohy i do kopie na Disk a nemá nést nic, co
 * souvisí s tajemstvím. Po obnově ze zálohy vydá správce nový klíč (B257). */
export const PR_KLIC_KLIC = 'pripominky_klic';
const klicUloziste = () => uloziste('program');
export const PR_TELO_MAX = 800000;
export const PR_KLIC_SPATNE_MAX = 10;
export const PR_KLIC_OKNO_MS = 15 * 60 * 1000;
export const PR_KLIC_HODINA_MAX = 300;
export const PR_ZAZNAM_MAX = 100;
const ZAKAZANE_PARAMETRY = ['token', 'access_token', 'key', 'klic', 'auth', 'authorization'];

const zdrojWebu = () => (String(process.env.PROSTREDI || '').trim().toLowerCase() === 'test' ? 'test' : 'ostry');
const hashKlice = (k) => createHash('sha256').update(String(k), 'utf8').digest('hex');
const denUtc = () => new Date().toISOString().slice(0, 10);
function bearer(req) {
  const a = String(req.headers.get('authorization') || '');
  const m = /^Bearer[ \t]+([^\s]{1,512})[ \t]*$/.exec(a);
  return m ? m[1] : (a ? '\u0000' : '');           // hlavička je, ale v jiném tvaru → nikdy nesedí
}
async function nastaveniCti(s) { return P.pripominkyNastaveniOciste(await s.cti('nastaveni')); }

/* Záznam o použití klíče (B257: „při zneužití limit a záznam"). Bez obsahu
 * požadavku — jen čas, událost a klíč počítadla adresy. Úložiště limitů,
 * ne záloha (provozní stopa). */
async function zaznamPridej(req, udalost) {
  try {
    const sl = await uloziste(PR_LIMIT);
    await vyhradne('pripominky-zaznam', async () => {
      const z = (await sl.cti('klic_zaznam')) || { udalosti: [] };
      const u = Array.isArray(z.udalosti) ? z.udalosti : [];
      u.push({ kdy: new Date().toISOString(), udalost: String(udalost).slice(0, 80),
        adresa: pokusyIpKlic(adresaKlienta(req) || 'neznama') });
      await sl.zapis('klic_zaznam', { udalosti: u.slice(-PR_ZAZNAM_MAX) });
    });
  } catch (e) { /* záznam nesmí shodit odpověď */ }
  console.log('pripominky: klíč koordinace — ' + udalost);
}
async function spatnyKlicZapocti(req) {
  const sl = await uloziste(PR_LIMIT);
  const klic = 'spatne:' + pokusyIpKlic(adresaKlienta(req) || 'neznama');
  return vyhradne('pripominky-spatne', async () => {
    const z = await sl.cti(klic);
    const ted = Date.now();
    const n = z && ted - (+z.posledni || 0) <= PR_KLIC_OKNO_MS ? (+z.n || 0) + 1 : 1;
    await sl.zapis(klic, { n, posledni: ted });
    return n > PR_KLIC_SPATNE_MAX;
  });
}
async function hodinaZapocti() {
  const sl = await uloziste(PR_LIMIT);
  const klic = 'hodina/' + new Date().toISOString().slice(0, 13);
  return vyhradne('pripominky-hodina', async () => {
    const n = ((await sl.cti(klic)) || {}).n || 0;
    await sl.zapis(klic, { n: n + 1 });
    return n + 1 > PR_KLIC_HODINA_MAX;
  });
}

/* Ověření klíče koordinace. Vrací null (projde) nebo hotovou odpověď. */
async function overKlic(req, s) {
  if (req.headers.get('cookie') && /(^|;\s*)relace=/.test(req.headers.get('cookie') || ''))
    return json({ ok: false, chyba: 'Klíč koordinace se posílá bez přihlášení (bez cookie).' }, 400);
  const dany = bearer(req);
  const ulozeny = await (await klicUloziste()).cti(PR_KLIC_KLIC);
  const sedi = !!(ulozeny && ulozeny.hash && dany && tajneShodne(hashKlice(dany), ulozeny.hash));
  if (!sedi) {
    const nad = await spatnyKlicZapocti(req);
    await zaznamPridej(req, (!ulozeny || !ulozeny.hash ? 'klíč není vydaný' : 'špatný klíč') + (nad ? ' (nad limitem)' : ''));
    return nad ? json({ ok: false, chyba: 'Příliš mnoho neplatných pokusů — zkuste to za 15 minut.' }, 429)
      : json({ ok: false, chyba: 'Neplatný klíč koordinace.' }, 401);
  }
  if (await hodinaZapocti()) {
    await zaznamPridej(req, 'limit ' + PR_KLIC_HODINA_MAX + ' požadavků za hodinu');
    return json({ ok: false, chyba: 'Omezení četnosti klíče koordinace — zkuste to za hodinu.' }, 429);
  }
  return null;
}

async function cteniVse(s) {
  const klice = await s.seznam('p/');
  const out = [];
  for (const k of klice) { const p = await s.cti(k); if (p && p.id) out.push(p); }
  return out;
}

async function teloCti(req) {
  let text;
  try { text = await req.text(); } catch (e) { return { chyba: json({ ok: false, chyba: 'Vstup se nepodařilo přečíst.' }, 400) }; }
  if (text.length > PR_TELO_MAX) return { chyba: json({ ok: false, chyba: 'Připomínka je příliš velká (nejvýš '
    + Math.round(PR_TELO_MAX / 1024) + ' kB včetně snímku). Zkuste ji odeslat bez snímku.' }, 413) };
  let t; try { t = JSON.parse(text); } catch (e) { return { chyba: json({ ok: false, chyba: 'Vstup není platný JSON.' }, 400) }; }
  const stop = hloubkaChyba(t); if (stop) return { chyba: stop };
  if (!t || typeof t !== 'object' || Array.isArray(t)) return { chyba: json({ ok: false, chyba: 'Vstup musí být objekt JSON.' }, 400) };
  return { t };
}

export default async (req) => {
  const url = new URL(req.url);
  const q = url.searchParams;
  for (const k of q.keys()) if (ZAKAZANE_PARAMETRY.includes(k.toLowerCase()))
    return json({ ok: false, chyba: 'Klíč patří do hlavičky Authorization: Bearer, nikdy do adresy.' }, 400);
  const s = await uloziste(PR_ULOZISTE);

  /* ---------- KOORDINACE (klíč) ---------- */
  /* Cesta klíče jen pro schéma Bearer nebo ?pro=koordinace (N3 revize
   * 22. 11. 2026): Basic od hesla webu či proxy jde běžnou cestou relace. */
  if (/^\s*bearer\b/i.test(req.headers.get('authorization') || '') || q.get('pro') === 'koordinace') {
    if (req.method !== 'GET' && req.method !== 'PATCH')
      return json({ ok: false, chyba: 'Klíč koordinace smí jen číst (GET) a měnit stav (PATCH).' }, 405);
    if (req.method === 'GET' && q.get('pro') !== 'koordinace')
      return json({ ok: false, chyba: 'Čtení klíčem jen přes ?pro=koordinace.' }, 400);
    const stop = await overKlic(req, s); if (stop) return stop;
    if (req.method === 'GET') {
      const od = q.get('od') || '';
      const odMs = od ? Date.parse(od) : 0;
      if (od && !Number.isFinite(odMs)) return json({ ok: false, chyba: 'Parametr od musí být čas ISO 8601.' }, 400);
      const stavy = (q.get('stav') || '').split(',').map(x => x.trim()).filter(Boolean);
      if (stavy.some(x => !P.PRIPOMINKA_STAVY_KOORDINACE.concat(['duplicitni']).includes(x)))
        return json({ ok: false, chyba: 'Neznámý stav ve filtru.' }, 400);
      const seznam = (await cteniVse(s)).filter(p => p.stav !== 'nova'
        && (!odMs || Date.parse(p.zmeneno || p.kdy) >= odMs) && (!stavy.length || stavy.includes(p.stav)))
        .sort((a, b) => String(a.zmeneno).localeCompare(String(b.zmeneno))).slice(0, 500);
      const n = await nastaveniCti(s);
      return json({ ok: true, zdroj: zdrojWebu(), ted: new Date().toISOString(),
        zdrojFronty: n.zdrojFronty, intervalKoordinace: n.intervalKoordinace,
        pripominky: seznam.map(P.pripominkaProKoordinaci) });
    }
    const { t, chyba } = await teloCti(req); if (chyba) return chyba;
    if (!P.pripominkaIdPlatne(t.id)) return json({ ok: false, chyba: 'Neplatné číslo připomínky.' }, 400);
    const zmena = { akce: t.akce, stav: t.stav, odpoved: t.odpoved, roadmapa: t.roadmapa };
    return vyhradne('pripominka-' + t.id, async () => {
      const stara = await s.cti('p/' + t.id);
      const r = P.pripominkaZmen(stara, zmena, 'koordinace', new Date().toISOString());
      if (!r.ok) return json({ ok: false, chyba: r.chyba }, r.kod || 400);
      await s.zapis('p/' + t.id, r.pripominka);
      return json({ ok: true, pripominka: P.pripominkaProKoordinaci(r.pripominka) });
    });
  }

  /* ---------- PŘIHLÁŠENÝ ---------- */
  const { chyba, relace } = await vyzadujRoli(req);
  if (chyba) return chyba;
  const jeSpravce = relace.role === 'Administrátor';

  if (req.method === 'GET') {
    if (q.has('nastaveni')) {
      const n = await nastaveniCti(s);
      const o = { ok: true, zapnuto: n.zapnuto, smiOdesilat: P.pripominkySmiOdesilat(n, relace.role),
        snimekVychozi: n.snimekVychozi, limitDen: n.limitDen, zdroj: zdrojWebu(), emailUmime: false };
      if (jeSpravce) {
        const k = await (await klicUloziste()).cti(PR_KLIC_KLIC);
        const z = (await (await uloziste(PR_LIMIT)).cti('klic_zaznam')) || { udalosti: [] };
        o.nastaveni = n;
        o.klic = k && k.hash ? { nastaven: true, vytvoren: k.vytvoren || '', kdo: k.kdo || '' } : { nastaven: false };
        o.zaznam = (z.udalosti || []).slice(-20).reverse();
      }
      return json(o);
    }
    if (q.has('snimek')) {
      if (!jeSpravce) return json({ ok: false, chyba: 'Snímek obrazovky vidí jen správce.' }, 403);
      const id = q.get('snimek');
      if (!P.pripominkaIdPlatne(id)) return json({ ok: false, chyba: 'Neplatné číslo připomínky.' }, 400);
      const sn = await (await uloziste(PR_SNIMKY)).cti(id);
      return sn && sn.obrazek ? json({ ok: true, obrazek: sn.obrazek })
        : json({ ok: false, chyba: 'Připomínka nemá snímek.' }, 404);
    }
    let vse = await cteniVse(s);
    if (jeSpravce && !q.has('moje')) {
      /* Uchovávání vyřízených: úklid při čtení správcem, nejvýš 50 naráz. */
      const n = await nastaveniCti(s);
      const smaz = P.pripominkyKSmazani(vse, n.uchovatDni, Date.now()).slice(0, 50);
      if (smaz.length && typeof s.smaz === 'function') {
        const sn = await uloziste(PR_SNIMKY);
        for (const id of smaz) { await s.smaz('p/' + id); if (typeof sn.smaz === 'function') await sn.smaz(id); }
        vse = vse.filter(p => !smaz.includes(p.id));
      }
      return json({ ok: true, zdroj: zdrojWebu(), pripominky: vse, pocty: P.pripominkyPocty(vse, 'oba'),
        neprectenych: P.pripominkyNeprectenych(vse), smazano: smaz.length });
    }
    const moje = vse.filter(p => p.autor === relace.email).sort((a, b) => String(b.kdy).localeCompare(String(a.kdy)));
    return json({ ok: true, pripominky: moje.map(P.pripominkaProAutora), novychOdpovedi: P.pripominkyNovychOdpovedi(moje) });
  }

  if (req.method === 'POST') {
    const { t, chyba: ch } = await teloCti(req); if (ch) return ch;
    if (t.akce === 'nastaveni') {
      if (!jeSpravce) return json({ ok: false, chyba: 'Nastavení připomínek mění jen správce.' }, 403);
      const n = P.pripominkyNastaveniOciste(t.nastaveni);
      await s.zapis('nastaveni', Object.assign({}, n, { kdo: relace.email, kdy: new Date().toISOString() }));
      return json({ ok: true, nastaveni: n });
    }
    if (t.akce === 'klic' || t.akce === 'klicZrusit') {
      if (!jeSpravce) return json({ ok: false, chyba: 'Klíč pro koordinaci spravuje jen správce.' }, 403);
      { const stop = await potvrdHesloSpravce(req, relace, t.hesloSpravce); if (stop) return stop; }
      if (t.akce === 'klicZrusit') {
        await (await klicUloziste()).zapis(PR_KLIC_KLIC, { hash: '', zrusen: new Date().toISOString(), kdo: relace.email });
        await zaznamPridej(req, 'klíč zrušen správcem');
        return json({ ok: true, zrusen: true });
      }
      const klic = 'kngpr_' + randomBytes(32).toString('base64url');
      const vytvoren = new Date().toISOString();
      await (await klicUloziste()).zapis(PR_KLIC_KLIC, { hash: hashKlice(klic), vytvoren, kdo: relace.email });
      await zaznamPridej(req, 'nový klíč vydán správcem');
      return json({ ok: true, klic, vytvoren });
    }
    if (t.akce !== undefined) return json({ ok: false, chyba: 'Neznámá akce.' }, 400);

    /* nová připomínka */
    const n = await nastaveniCti(s);
    if (!n.zapnuto) return json({ ok: false, kod: 'vypnuto', chyba: 'Připomínky z aplikace jsou vypnuté.' }, 403);
    if (!n.role.includes(relace.role)) return json({ ok: false, kod: 'role', chyba: 'Vaše role připomínky odesílat nemůže.' }, 403);
    const sn = P.pripominkaSnimekZkontroluj(t.snimek);
    if (!sn.ok) return json({ ok: false, chyba: sn.chyba }, 400);
    const sl = await uloziste(PR_LIMIT);
    const denKlic = 'den/' + denUtc() + '/' + relace.email;
    return vyhradne('pripominky-nova', async () => {
      const dnes = ((await sl.cti(denKlic)) || {}).n || 0;
      if (dnes >= n.limitDen)
        return json({ ok: false, kod: 'limit', chyba: 'Dnes jste odeslali už ' + dnes + ' připomínek (limit ' + n.limitDen
          + ' za den). Další pošlete zítra, nebo napište správci.' }, 429);
      let cislo = (((await s.cti('citac')) || {}).n || 0) + 1;
      while (await s.cti('p/' + P.pripominkaCislo(cislo))) cislo++;
      const r = P.pripominkaNova(t, relace, new Date().toISOString(), zdrojWebu(), cislo);
      if (!r.ok) return json({ ok: false, chyba: r.chyba }, 400);
      const p = r.pripominka;
      if (sn.obrazek) { await (await uloziste(PR_SNIMKY)).zapis(p.id, { obrazek: sn.obrazek }); p.snimek = true; }
      await s.zapis('citac', { n: cislo });
      await s.zapis('p/' + p.id, p);
      await sl.zapis(denKlic, { n: dnes + 1 });
      /* E-mail správci: aplikace e-maily zatím neodesílá — text je připravený
       * (pripominkaEmailText), do logu jde jen předmět, ne obsah. */
      if (n.emailSpravci) console.log('pripominky: e-mail správci připraven, odesílání zatím není — ' + P.pripominkaEmailText(p).predmet);
      return json({ ok: true, id: p.id, pripominka: P.pripominkaProAutora(p) });
    });
  }

  if (req.method === 'PATCH') {
    const { t, chyba: ch } = await teloCti(req); if (ch) return ch;
    if (t.akce === 'precteno') {
      const ids = Array.isArray(t.ids) ? t.ids.slice(0, 200).filter(P.pripominkaIdPlatne) : [];
      const jakoSpravce = t.jako === 'spravce';
      if (jakoSpravce && !jeSpravce) return json({ ok: false, chyba: 'Jen správce.' }, 403);
      let n = 0;
      for (const id of ids) {
        await vyhradne('pripominka-' + id, async () => {
          const p = await s.cti('p/' + id);
          if (!p) return;
          if (jakoSpravce) { if (p.prectenoSpravcem) return; p.prectenoSpravcem = true; }
          else { if (p.autor !== relace.email || !p.odpovedNova) return; p.odpovedNova = false; }
          await s.zapis('p/' + id, p); n++;
        });
      }
      return json({ ok: true, oznaceno: n });
    }
    if (!jeSpravce) return json({ ok: false, chyba: 'Stav připomínky mění jen správce.' }, 403);
    if (!P.pripominkaIdPlatne(t.id)) return json({ ok: false, chyba: 'Neplatné číslo připomínky.' }, 400);
    const ids = new Set((await s.seznam('p/')).map(k => k.slice(2)));
    return vyhradne('pripominka-' + t.id, async () => {
      const stara = await s.cti('p/' + t.id);
      const r = P.pripominkaZmen(stara, t, 'spravce', new Date().toISOString(), (id) => ids.has(id));
      if (!r.ok) return json({ ok: false, chyba: r.chyba }, r.kod || 400);
      r.pripominka.prectenoSpravcem = true;
      await s.zapis('p/' + t.id, r.pripominka);
      return json({ ok: true, pripominka: r.pripominka });
    });
  }
  return json({ ok: false, chyba: 'Použijte GET, POST nebo PATCH.' }, 405);
};

export const config = { path: '/api/pripominky' };
