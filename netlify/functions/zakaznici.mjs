/* Seznam zákazníků (#162, 20. 8. 2026) — jeden zákazník = jeden záznam.
 *
 * GET    /api/zakaznici              → { zakaznici: [...] }   — přihlášení
 * GET    /api/zakaznici?klic=X       → { zakaznik }           — přihlášení
 * POST   /api/zakaznici { zakaznik } → uloží                  — přihlášení
 * DELETE /api/zakaznici?klic=X       → smaže                  — JEN Administrátor
 *
 * GET    /api/zakaznici?klic=X&historie=1 → { historie: [...] } — přihlášení (B234)
 * POST   /api/zakaznici { akce: 'navrhPrijmout'|'navrhZamitnout', klic, id } — autor karty / Administrátor (B234)
 *
 * Práva podle zadání J. V. z 20. 8. 2026: číst smí každý přihlášený,
 * mazat jen administrátor — smazaná karta bere s sebou i všechno, co si
 * u toho zákazníka někdo jednou dohledal.
 * B234 (audit 20. 11. 2026, J. V. 21. 11. 2026): kartu ZALOŽÍ kdokoli
 * přihlášený, MĚNÍ ji jen její autor a administrátor. Úprava od kohokoli
 * jiného kartu nepřepíše — uloží se jako návrh změny (karta.navrhy), který
 * autor nebo administrátor převezme, nebo zamítne. Každá změna karty uloží
 * předchozí verzi do historie (`h/<klíč>`, nejvýš ZAKAZNIK_HISTORIE_MAX).
 *
 * Očistu vstupu dělá `zakaznikOciste` ze src/zakaznici.js — týž kód, jaký
 * si čistí prohlížeč. Server nikdy neuloží, co mu kdo pošle.
 */
import { uloziste, vyzadujRoli, json, klicZAdresyPlatny, hloubkaChyba, vyhradne } from '../lib/sdilene.mjs';

/* NN B244 (22. 11. 2026): strop počtu karet. Karet jsou desítky; 2 000 je
 * pojistka proti zahlcení číselníku (seznam se čte kartu po kartě). */
export const ZAKAZNICI_MAX = 2000;
/* SCHVÁLNĚ ne `jadro()`: to natáhne celé jádro (engine, preklad, docxgen…)
 * a při studeném startu se na prázdný seznam čekaly vteřiny (nález J. V.
 * 21. 8. 2026). Tady stačí jeden malý modul bez závislostí — proč jde přes
 * .cjs obal a ne přes createRequire, vysvětluje hlavička toho souboru. */
import g from '../lib/zakaznici_modul.cjs';

export default async (req) => {

  const { chyba, relace } = await vyzadujRoli(req);
  if (chyba) return chyba;
  const s = await uloziste('zakaznici');
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const klic = url.searchParams.get('klic');
    if (klic) {
      if (!klicZAdresyPlatny(klic)) return json({ ok: false, chyba: 'Neplatný klíč zákazníka.' }, 400);   // SEC-I4
      if (url.searchParams.get('historie')) {   // B234: historie verzí karty (čte každý přihlášený jako kartu)
        const h = await s.cti('h/' + klic);
        return json({ ok: true, historie: Array.isArray(h) ? h : [] });
      }
      const z = await s.cti('z/' + klic);
      return z ? json({ ok: true, zakaznik: z })
               : json({ ok: false, chyba: 'Zákazník nenalezen: ' + klic }, 404);
    }
    /* Seznam se skládá ze záznamů, ne z rejstříku: karet jsou desítky, ne
     * tisíce, a druhý soubor s rejstříkem by byl jen další místo, kde se to
     * může rozejít (poučení z rejstříku zakázek). */
    const klice = await s.seznam('z/');
    const zakaznici = [];
    for (const k of klice) {
      const z = await s.cti(k);
      if (z) zakaznici.push(z);
    }
    return json({ ok: true, zakaznici });
  }

  if (req.method === 'DELETE') {
    const { chyba: ch } = await vyzadujRoli(req, 'Administrátor');
    if (ch) return ch;
    const klic = url.searchParams.get('klic');
    if (!klic) return json({ ok: false, chyba: 'Chybí klíč zákazníka.' }, 400);
    if (!klicZAdresyPlatny(klic)) return json({ ok: false, chyba: 'Neplatný klíč zákazníka.' }, 400);   // SEC-I4
    if (typeof s.smaz === 'function') {
      await s.smaz('z/' + klic);
      await s.smaz('h/' + klic);   // revize Fable R5: historie smazané karty nezůstane ani ji nová karta nezdědí
    }
    return json({ ok: true, smazano: klic });
  }

  if (req.method !== 'POST')
    return json({ ok: false, chyba: 'Použijte GET, POST nebo DELETE.' }, 405);

  let t; try { t = await req.json(); }
  catch (e) { return json({ ok: false, chyba: 'Vstup není platný JSON.' }, 400); }
  { const stop = hloubkaChyba(t); if (stop) return stop; }   // SEC-M2 (#542): hluboké vnoření → 400, ne 500
  /* Tělo JSON `null`, číslo nebo pole (B131): dřív výjimka a 500. */
  if (!t || typeof t !== 'object' || Array.isArray(t)) return json({ ok: false, chyba: 'Vstup musí být objekt JSON.' }, 400);

  const ted = new Date().toISOString();
  /* B234: předchozí verze karty do historie (nejnovější na konci). */
  const doHistorie = async (klic, stary, kdo, proc) => {
    const h = await s.cti('h/' + klic);
    const hist = (Array.isArray(h) ? h : []).concat([{ kdy: ted, kdo, proc, verze: g.zakaznikVerze(stary) }]);
    await s.zapis('h/' + klic, hist.slice(-g.ZAKAZNIK_HISTORIE_MAX));
  };

  /* B234: převzetí / zamítnutí návrhu změny — jen autor karty a administrátor.
   * NN #705 (revize BZ R7): čtení karty, historie a zápis v jednom výhradním
   * úseku nad klíčem karty (vzor B158) — souběžné návrhy a úpravy se dřív
   * navzájem přepsaly. Mez: jen v rámci jedné instance funkce (jako B233). */
  if (t.akce === 'navrhPrijmout' || t.akce === 'navrhZamitnout') {
    const klic = String(t.klic || '');
    if (!klicZAdresyPlatny(klic)) return json({ ok: false, chyba: 'Neplatný klíč zákazníka.' }, 400);
    return vyhradne('zakaznici/' + klic, async () => {
    const stary = await s.cti('z/' + klic);
    if (!stary) return json({ ok: false, chyba: 'Zákazník nenalezen: ' + klic }, 404);
    if (!g.zakaznikSmiMenit(stary, relace))
      return json({ ok: false, chyba: 'Návrh změny karty převezme nebo zamítne jen autor karty nebo administrátor.' }, 403);
    const navrhy = g.zakaznikNavrhyOciste(stary.navrhy);
    const n = navrhy.find(x => x.id === String(t.id || ''));
    if (!n) return json({ ok: false, chyba: 'Návrh změny už na kartě není (převzal ho nebo zamítl někdo jiný).' }, 409);
    const nova = JSON.parse(JSON.stringify(stary));
    nova.navrhy = navrhy.filter(x => x !== n);
    if (!nova.navrhy.length) delete nova.navrhy;
    if (t.akce === 'navrhPrijmout') {
      Object.keys(n.zmeny).forEach(k => { nova[k] = n.zmeny[k]; });
      const ocistena = g.zakaznikOciste(nova, relace.email, ted);
      if (g.zakaznikKlic(ocistena) !== klic)
        return json({ ok: false, chyba: 'Návrh mění IČO nebo název, ze kterého je klíč karty — založte novou kartu.' }, 409);
      ocistena.autor = stary.autor; ocistena.zalozen = stary.zalozen || ocistena.zalozen;
      if (nova.navrhy) ocistena.navrhy = nova.navrhy;
      await doHistorie(klic, stary, relace.email, 'návrh ' + (n.jmeno || n.kdo));
      await s.zapis('z/' + klic, ocistena);
      return json({ ok: true, klic, zakaznik: ocistena });
    }
    await s.zapis('z/' + klic, nova);
    return json({ ok: true, klic, zakaznik: nova });
    });
  }

  /* NN B243: karta jako objekt a pole karty jako jednoduché hodnoty — objekt
   * místo textu (`{"toString":1}`) dřív shodil očistu výjimkou (500). */
  { const k = t.zakaznik;
    if (k !== undefined && (!k || typeof k !== 'object' || Array.isArray(k)))
      return json({ ok: false, chyba: 'Karta zákazníka musí být objekt.' }, 400);
    /* Jen pole, která očista čte — karta z klienta nese i `navrhy` (pole) a ty
     * server stejně zahodí. */
    if (k && g.zakaznikPoleObsahu().concat(['zalozen', 'autor']).some(x => k[x] !== null && typeof k[x] === 'object'))
      return json({ ok: false, chyba: 'Pole karty zákazníka musí být text.' }, 400); }
  const z = g.zakaznikOciste(t.zakaznik || {}, relace.email, ted);
  const klic = g.zakaznikKlic(z);
  if (!klic)
    return json({ ok: false, chyba: 'Zákazník musí mít vyplněné IČO nebo aspoň název.' }, 400);
  return vyhradne('zakaznici/' + klic, async () => {
  /* Zápis nesmí přepsat, kdo kartu založil — autor se drží z uloženého
   * záznamu, ne z toho, co přišlo od klienta. */
  const stary = await s.cti('z/' + klic);
  if (stary && !g.zakaznikSmiMenit(stary, relace)) {
    /* B234: cizí karta se nepřepíše — změna se uloží jako návrh. */
    const zmeny = g.zakaznikZmenyPole(stary, z);
    if (!Object.keys(zmeny).length) return json({ ok: true, klic, zakaznik: stary, navrh: false });
    const karta = g.zakaznikNavrhPridej(JSON.parse(JSON.stringify(stary)), zmeny, relace.email, relace.jmeno || '', ted,
      ted + '-' + Math.random().toString(36).slice(2, 8));
    await s.zapis('z/' + klic, karta);
    return json({ ok: true, klic, zakaznik: karta, navrh: true,
      zprava: 'Kartu mění jen její autor (' + (stary.autor || '—') + ') a administrátor. Vaše úprava se uložila jako návrh změny.' });
  }
  if (stary) {
    z.autor = stary.autor || z.autor; z.zalozen = stary.zalozen || z.zalozen;
    const navrhy = g.zakaznikNavrhyOciste(stary.navrhy);
    if (navrhy.length) z.navrhy = navrhy;   // návrhy drží server, klient je nepřepíše
    if (Object.keys(g.zakaznikZmenyPole(stary, z)).length) await doHistorie(klic, stary, relace.email, 'úprava');
  }
  else {
    z.autor = relace.email;   // nová karta: autora píše server z relace (audit 23. 8. 2026, B29)
    z.zalozen = ted;          // NN B244: čas založení píše server, ne klient
    const klice = await s.seznam('z/');
    /* NN B244: strop počtu karet. */
    if (klice.length >= ZAKAZNICI_MAX)
      return json({ ok: false, chyba: 'Číselník zákazníků je plný (nejvýš ' + ZAKAZNICI_MAX + ' karet). Napište správci.' }, 400);
    /* NN #705 (revize BZ R6): DVOJČE KARTY. Klíč je IČO, bez IČO název
     * (`n-…`). Kdo nesmí měnit kartu firmy, založil by dřív tutéž firmu znovu
     * pod druhým klíčem (s IČO × bez IČO) a obešel tak autora. Nová karta, jejíž
     * IČO nebo název už má cizí karta, se odmítne 409 — úpravu pošle jako návrh
     * na původní kartu. Autor dvojčete a administrátor kartu založit smějí. */
    const dvojce = await dvojceKarty(s, klice, z, klic);
    if (dvojce && !g.zakaznikSmiMenit(dvojce.karta, relace)) {
      /* Revize Fable R3 (vzor P7 / K16-N87): hláška jmenuje člověka jménem
       * z účtu, ne e-mailem; účet bez jména = „jiný kolega“. */
      let kdo = '';
      try { const u = dvojce.karta.autor ? await (await uloziste('uzivatele')).cti(String(dvojce.karta.autor).toLowerCase()) : null;
        kdo = (u && u.jmeno) ? String(u.jmeno) : ''; } catch (e) { kdo = ''; }
      return json({ ok: false, dvojce: dvojce.klic, chyba: 'Tento zákazník už má kartu (' + (dvojce.karta.nazev || dvojce.klic)
        + ', založil(a) ' + (kdo || 'jiný kolega') + '). Upravte tu — změna se uloží jako návrh pro jejího autora.' }, 409);
    }
  }
  await s.zapis('z/' + klic, z);
  return json({ ok: true, klic, zakaznik: z });
  });
};

/* NN #705: karta téže firmy pod JINÝM klíčem — shodné IČO, nebo shodný název
 * (klíč z názvu). Vrací { klic, karta } nebo null. Čte se jen při zakládání
 * nové karty (karet jsou desítky). */
async function dvojceKarty(s, klice, z, klic) {
  /* Shodný název se počítá jen tam, kde jedné ze dvou karet IČO chybí — dvě
   * firmy se stejným jménem a RŮZNÝM IČO dvojčata nejsou. */
  const icoTvar = (x) => { const i = String(x || '').replace(/[\s.]/g, ''); return /^\d{6,10}$/.test(i) ? i : ''; };
  const ico = icoTvar(z.ico);
  const nKlic = g.zakaznikKlic({ nazev: z.nazev });
  for (const k of klice) {
    const kk = k.slice(2);
    if (kk === klic) continue;
    const karta = await s.cti(k);
    if (!karta) continue;
    const icoK = icoTvar(karta.ico);
    if (ico && icoK === ico) return { klic: kk, karta };
    if (nKlic && (!ico || !icoK) && g.zakaznikKlic({ nazev: karta.nazev }) === nKlic) return { klic: kk, karta };
  }
  return null;
}

export const config = { path: '/api/zakaznici' };
