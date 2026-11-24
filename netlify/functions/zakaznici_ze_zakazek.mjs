/* ============================================================
 * ZÁKAZNÍCI ZE ZAKÁZEK — hromadné naplnění databáze zákazníků (ZK #755,
 * J. V. 24. 11. 2026). JEN Administrátor (server ověřuje roli účtu).
 *
 * GET  /api/zakaznici-ze-zakazek                    → { navrh, protokol }
 * POST /api/zakaznici-ze-zakazek { akce: 'nahled' [, id] [, znovu] }
 *        náhled po kouscích: bez `id` začne nový (přečte zakázky, seskupí
 *        podle IČO), s `id` pokračuje. Každé volání má časový rozpočet;
 *        klient volá znovu, dokud `navrh.faze !== 'hotovo'`. `znovu: true`
 *        vrátí položky „ARES nedostupný“ do fronty (zkusit znovu).
 * POST { akce: 'zalozit', id }   → založí karty položek „založit“ hotového
 *        náhledu; nic existujícího nepřepíše; zápis do protokolu; náhled smaže.
 * POST { akce: 'zrusit' }         → zahodí rozpracovaný náhled.
 *
 * NÁHLED NIC NEZAPISUJE do karet. Drží se na serveru (úložiště
 * `zakaznici_hromadne`, klíč `zk-navrh`) — zápis bere data z něj a ze zakázek, ne od klienta.
 * Návrh nenese osobní údaje: jen IČO, název a sídlo firmy, počet zakázek,
 * odkaz na nejnovější zakázku a subjekt z ARES; kontakty se čtou ze zakázky
 * až při zápisu karty (a znovu se ověří shoda s ARES).
 *
 * MEZE ARES: jen platné IČO (kontrolní číslice), jen IČO bez karty, nejvýš
 * `aresNaVolani` dotazů za volání s pauzou `pauzaMs` mezi nimi, strop
 * `aresMaxNavrh` na náhled a `aresMaxDen` za den (počítadlo `zk-den`).
 * Výpadek / strop = položka „zkusit znovu“, nic se nezapíše.
 * ============================================================ */
import { uloziste, vyzadujRoli, json, vyhradne, hloubkaChyba } from '../lib/sdilene.mjs';
import { aresNacti, ARES_SIT, ARES_TIMEOUT_MS } from '../lib/ares_server.mjs';
import * as ZZ from '../lib/zakaznici_ze_zakazek.mjs';
import g from '../lib/zakaznici_modul.cjs';
import { ZAKAZNICI_MAX } from './zakaznici.mjs';

export const ZZ_NASTAVENI = {
  pauzaMs: 400,             // mezi dvěma dotazy do ARES
  rozpocetMs: 7000,         // čas jednoho volání (funkce má limit 10 s)
  aresNaVolani: 10,
  aresMaxNavrh: 600,
  aresMaxDen: 1500,
  cteniNaVolani: 400,       // zakázek přečtených v jednom volání
  platnostMs: 24 * 3600 * 1000,
  protokolMax: 100,
  cekej: (ms) => new Promise((r) => setTimeout(r, ms)),
  ted: () => Date.now(),
};
/* Náhled, denní počítadlo ARES a protokol jsou ve VLASTNÍM úložišti: celé
 * úložiště `zakaznici` jde do zálohy a obnova v něm přijme jen karty (z/) a
 * historii (h/). Toto úložiště je výjimka ze zálohy (provozní stopa; test_zalohy.mjs N4). */
export const ZZ_ULOZISTE = 'zakaznici_hromadne';
const KLIC_NAVRH = 'zk-navrh';
const KLIC_PROTOKOL = 'zk-protokol';
const KLIC_DEN = 'zk-den';

async function karty(s) {
  const out = [];
  for (const k of await s.seznam('z/')) { const z = await s.cti(k); if (z) out.push(z); }
  return out;
}

/* Co jde klientovi: bez odkazů na soubory zakázek a bez kontaktů. */
function souhrn(n) {
  if (!n) return null;
  const polozky = Object.values(n.polozky || {}).map(p => ({ ico: p.ico, nazev: p.nazev, sidlo: p.sidlo, pocet: p.pocet,
    stav: p.stav, duvod: p.duvod || '', aresNazev: p.ares ? p.ares.nazev : (p.aresNazev || ''),
    aresSidlo: p.ares ? p.ares.adresa : (p.aresSidlo || '') }));
  const poradi = { zalozit: 0, nesedi: 1, vypadek: 2, zbyva: 3, existuje: 4 };
  polozky.sort((a, b) => (poradi[a.stav] - poradi[b.stav]) || String(a.nazev).localeCompare(String(b.nazev), 'cs') || (a.ico < b.ico ? -1 : 1));
  return { id: n.id, faze: n.faze, kdo: n.kdo, zacatek: n.zacatek, zakazekCelkem: n.klice.length, precteno: n.ctiOd,
    zakazek: n.seskup.zakazek || 0, bezIco: n.seskup.bezIco || 0, neplatneIco: n.seskup.neplatneIco || 0,
    dotazuAres: n.dotazu || 0, pocty: ZZ.zzPocty(polozky), polozky };
}

export default async (req) => {
  const { chyba, relace } = await vyzadujRoli(req, 'Administrátor');
  if (chyba) return chyba;
  const s = await uloziste('zakaznici');
  const sH = await uloziste(ZZ_ULOZISTE);
  const N = ZZ_NASTAVENI;

  if (req.method === 'GET') {
    const n = await sH.cti(KLIC_NAVRH);
    const p = await sH.cti(KLIC_PROTOKOL);
    return json({ ok: true, navrh: souhrn(n), protokol: Array.isArray(p) ? p : [] });
  }
  if (req.method !== 'POST') return json({ ok: false, chyba: 'Použijte GET nebo POST.' }, 405);

  let t; try { t = await req.json(); }
  catch (e) { return json({ ok: false, chyba: 'Vstup není platný JSON.' }, 400); }
  { const stop = hloubkaChyba(t); if (stop) return stop; }
  if (!t || typeof t !== 'object' || Array.isArray(t)) return json({ ok: false, chyba: 'Vstup musí být objekt JSON.' }, 400);
  const id = typeof t.id === 'string' ? t.id.slice(0, 60) : '';

  return vyhradne('zakaznici/hromadne', async () => {
    const start = N.ted();
    const ted = new Date(start).toISOString();
    let n = await sH.cti(KLIC_NAVRH);
    if (n && !(start - Date.parse(n.zacatek) < N.platnostMs)) n = null;   // propadlý náhled

    if (t.akce === 'zrusit') {
      if (typeof sH.smaz === 'function') await sH.smaz(KLIC_NAVRH);
      return json({ ok: true, navrh: null });
    }

    if (t.akce === 'zalozit') {
      if (!n || !id || n.id !== id)
        return json({ ok: false, chyba: 'Náhled už neplatí (propadl, zapsal ho někdo jiný nebo běží novější). Spusťte náhled znovu.' }, 409);
      if (n.faze !== 'hotovo')
        return json({ ok: false, chyba: 'Náhled ještě není dokončený.' }, 409);
      const sZak = await uloziste('zakazky');
      const vsechny = await karty(s);
      const ex = ZZ.zzExistujici(vsechny);
      let pocetKaret = (await s.seznam('z/')).length;
      const v = { zalozeno: 0, uzExistovalo: 0, zmeneno: 0, strop: 0 };
      const poznamka = 'Založeno hromadně ze zakázek, údaje ověřené v ARES ' + ted.slice(0, 10) + '.';
      const navrhy = Object.values(n.polozky).filter(p => p.stav === 'zalozit' && p.ares).sort((a, b) => (a.ico < b.ico ? -1 : 1));
      for (const p of navrhy) {
        const klic = g.zakaznikKlic({ ico: p.ico });
        await vyhradne('zakaznici/' + klic, async () => {
          if (await s.cti('z/' + klic) || ZZ.zzKartaExistuje(ex, p.ico, p.ares.nazev)) { v.uzExistovalo++; return; }
          const zak = await sZak.cti('z/' + p.soubor);
          const strana = ZZ.zzStranaSIco(zak, p.ico);
          const sh = strana ? ZZ.zzShoda({ nazev: strana.hlavicka.objednatel, sidlo: strana.hlavicka.adresaObjednatele },
            { stav: 'ok', subjekt: p.ares }) : null;
          if (!sh || sh.stav !== 'zalozit') { v.zmeneno++; return; }   // zakázka se mezitím změnila
          if (pocetKaret >= ZAKAZNICI_MAX) { v.strop++; return; }
          const karta = ZZ.zzKarta(p.ares, strana, relace.email, ted, poznamka);
          await s.zapis('z/' + klic, karta);
          ex.ico.set(p.ico, karta); pocetKaret++; v.zalozeno++;
        });
      }
      const pocty = ZZ.zzPocty(Object.values(n.polozky));
      const zaznam = { kdy: ted, kdo: relace.email, zakazek: n.seskup.zakazek || 0, ico: Object.keys(n.polozky).length,
        bezIco: n.seskup.bezIco || 0, neplatneIco: n.seskup.neplatneIco || 0, dotazuAres: n.dotazu || 0,
        navrzeno: pocty.zalozit, zalozeno: v.zalozeno, uzExistovalo: pocty.existuje + v.uzExistovalo,
        nesedi: pocty.nesedi, aresNedostupny: pocty.vypadek, zmenenoMezitim: v.zmeneno, strop: v.strop };
      const prot = await sH.cti(KLIC_PROTOKOL);
      await sH.zapis(KLIC_PROTOKOL, (Array.isArray(prot) ? prot : []).concat([zaznam]).slice(-N.protokolMax));
      if (typeof sH.smaz === 'function') await sH.smaz(KLIC_NAVRH);
      return json({ ok: true, vysledek: zaznam });
    }

    if (t.akce !== 'nahled') return json({ ok: false, chyba: 'Neznámá akce.' }, 400);

    if (id && (!n || n.id !== id))
      return json({ ok: false, chyba: 'Náhled už neplatí (propadl, nebo ho mezitím spustil jiný administrátor). Spusťte ho znovu.' }, 409);
    if (!id) {
      const sZak = await uloziste('zakazky');
      const klice = (await sZak.seznam('z/')).map(k => k.slice(2)).sort();
      n = { schema: 1, id: ted + '-' + Math.random().toString(36).slice(2, 8), kdo: relace.email, zacatek: ted,
        faze: 'cteni', klice, ctiOd: 0, seskup: {}, polozky: {}, fronta: [], dotazu: 0 };
    }
    if (t.znovu === true && n.faze === 'hotovo') {
      for (const p of Object.values(n.polozky))
        if (p.stav === 'vypadek') { p.stav = 'zbyva'; p.duvod = ''; n.fronta.push(p.ico); }
      if (n.fronta.length) n.faze = 'ares';
    }
    const uplynulo = () => N.ted() - start;

    if (n.faze === 'cteni') {
      const sZak = await uloziste('zakazky');
      let precteno = 0;
      while (n.ctiOd < n.klice.length && precteno < N.cteniNaVolani && (precteno === 0 || uplynulo() < N.rozpocetMs)) {
        const soubor = n.klice[n.ctiOd++]; precteno++;
        const zak = await sZak.cti('z/' + soubor);
        if (zak) ZZ.zzSeskupPridej(n.seskup, soubor, zak);
      }
      if (n.ctiOd >= n.klice.length) {
        const ex = ZZ.zzExistujici(await karty(s));
        for (const sk of Object.values(n.seskup.skupiny || {})) {
          const p = { ico: sk.ico, nazev: sk.nazev, sidlo: sk.sidlo, pocet: sk.pocet, soubor: sk.soubor, stav: 'zbyva', duvod: '' };
          if (ex.ico.has(sk.ico)) { p.stav = 'existuje'; p.duvod = 'karta s tímto IČO už existuje'; }
          else n.fronta.push(sk.ico);
          n.polozky[sk.ico] = p;
        }
        n.fronta.sort();
        n.faze = 'ares';
      }
    }

    if (n.faze === 'ares' && n.fronta.length) {
      const ex = ZZ.zzExistujici(await karty(s));
      const denDnes = ted.slice(0, 10);
      let den = await sH.cti(KLIC_DEN);
      if (!den || den.den !== denDnes) den = { den: denDnes, pocet: 0 };
      let dotazy = 0;
      while (n.fronta.length && dotazy < N.aresNaVolani
             && (dotazy === 0 || uplynulo() < N.rozpocetMs - ARES_TIMEOUT_MS - N.pauzaMs)) {
        if (n.dotazu >= N.aresMaxNavrh || den.pocet >= N.aresMaxDen) {
          const proc = n.dotazu >= N.aresMaxNavrh ? 'strop dotazů do ARES na jeden náhled' : 'denní strop dotazů do ARES';
          for (const ico of n.fronta) { n.polozky[ico].stav = 'vypadek'; n.polozky[ico].duvod = proc + ' — zkusit znovu později'; }
          n.fronta = [];
          break;
        }
        if (dotazy > 0) await N.cekej(N.pauzaMs);
        const ico = n.fronta.shift();
        const p = n.polozky[ico];
        const r = await aresNacti(ico, { fetch: ARES_SIT.fetch });
        dotazy++; n.dotazu++; den.pocet++;
        const sh = ZZ.zzShoda(p, r);
        p.stav = sh.stav; p.duvod = sh.duvod;
        delete p.ares; delete p.aresNazev; delete p.aresSidlo;
        if (r.stav === 'ok' && r.subjekt) { p.aresNazev = r.subjekt.nazev; p.aresSidlo = r.subjekt.adresa; }
        if (sh.stav === 'zalozit') {
          const uz = ZZ.zzKartaExistuje(ex, ico, r.subjekt.nazev);
          if (uz) { p.stav = 'existuje'; p.duvod = uz; }
          else p.ares = r.subjekt;
        }
      }
      if (dotazy) await sH.zapis(KLIC_DEN, den);
    }
    if (n.faze === 'ares' && !n.fronta.length) n.faze = 'hotovo';
    await sH.zapis(KLIC_NAVRH, n);
    return json({ ok: true, navrh: souhrn(n) });
  });
};

export const config = { path: '/api/zakaznici-ze-zakazek' };
