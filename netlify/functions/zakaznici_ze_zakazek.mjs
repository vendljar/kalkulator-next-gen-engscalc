/* ============================================================
 * ZÁKAZNÍCI ZE ZAKÁZEK — hromadné naplnění databáze zákazníků (ZK #755,
 * J. V. 24. 11. 2026). JEN Administrátor (server ověřuje roli účtu).
 *
 * GET  /api/zakaznici-ze-zakazek                    → { navrh, protokol }
 * POST /api/zakaznici-ze-zakazek { akce: 'nahled' [, id] [, znovu] }
 *        náhled po kouscích: bez `id` začne nový (přečte zakázky, seskupí
 *        podle IČO), s `id` pokračuje. Každé volání má časový rozpočet;
 *        klient volá znovu, dokud `navrh.faze !== 'hotovo'`. `znovu: true`
 *        vrátí položky „zkusit znovu“ (výpadek, strop kola / dne) do fronty
 *        a začne nové kolo dotazů — pokračuje tam, kde se skončilo (R3).
 * POST { akce: 'zalozit', id }   → zakládá karty položek „založit“ hotového
 *        náhledu PO KOUSCÍCH s časovým rozpočtem (revize R1); klient volá,
 *        dokud `hotovo`. Protokol vznikne hned prvním voláním a nese průběžné
 *        počty (i po přerušení), nic existujícího se nepřepíše; po dokončení
 *        se náhled smaže.
 * POST { akce: 'zrusit' }         → zahodí náhled (rozpracovaný zápis = protokol „přerušen“).
 *
 * KARTY SE NEČTOU (revize R2): existence karty se pozná z klíčů úložiště
 * (zzExistujiciZKlicu); čte se jen karta téhož klíče těsně před zápisem.
 * PAMĚŤ „NESEDÍ“ (revize R3, `zk-nesedi`): IČO, které nesedělo s ARES, se
 * v dalším náhledu do ARES znovu neposílá, dokud se nezmění jeho nejnovější
 * zakázka (soubor + razítko uložení) a nejvýš `nesediPlatnostMs`.
 *
 * NÁHLED NIC NEZAPISUJE do karet. Drží se na serveru (úložiště
 * `zakaznici_hromadne`, klíč `zk-navrh`) — zápis bere data z něj a ze zakázek, ne od klienta.
 * Návrh nenese osobní údaje: jen IČO, název a sídlo firmy, počet zakázek,
 * odkaz na nejnovější zakázku a subjekt z ARES; kontakty se čtou ze zakázky
 * až při zápisu karty (a znovu se ověří shoda s ARES).
 *
 * MEZE ARES: jen platné IČO (kontrolní číslice), jen IČO bez karty, nejvýš
 * `aresNaVolani` dotazů za volání s pauzou `pauzaMs` mezi nimi, strop
 * `aresMaxNavrh` na jedno kolo náhledu a `aresMaxDen` za den (počítadlo `zk-den`).
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
  aresMaxNavrh: 600,        // dotazů na jedno kolo náhledu („Zkusit znovu“ = další kolo)
  aresMaxDen: 1500,
  cteniNaVolani: 400,       // zakázek přečtených v jednom volání
  zapisNaVolani: 100,       // karet zapsaných v jednom volání (a časový rozpočet)
  platnostMs: 24 * 3600 * 1000,
  nesediPlatnostMs: 30 * 24 * 3600 * 1000,
  protokolMax: 100,
  cekej: (ms) => new Promise((r) => setTimeout(r, ms)),
  ted: () => Date.now(),
};
/* Náhled, denní počítadlo ARES, paměť „nesedí“ a protokol jsou ve VLASTNÍM
 * úložišti: celé úložiště `zakaznici` jde do zálohy a obnova v něm přijme jen
 * karty (z/) a historii (h/). Toto úložiště je výjimka ze zálohy (provozní
 * stopa; test_zalohy.mjs N4). */
export const ZZ_ULOZISTE = 'zakaznici_hromadne';
const KLIC_NAVRH = 'zk-navrh';
const KLIC_PROTOKOL = 'zk-protokol';
const KLIC_DEN = 'zk-den';
const KLIC_NESEDI = 'zk-nesedi';

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
    dotazuAres: n.dotazu || 0, pocty: ZZ.zzPocty(polozky), polozky,
    zapis: n.zapis ? { zbyva: n.zapis.fronta.length, ...n.zapis.v } : null };
}

export default async (req) => {
  const { chyba, relace } = await vyzadujRoli(req, 'Administrátor');
  if (chyba) return chyba;
  const s = await uloziste('zakaznici');
  const sH = await uloziste(ZZ_ULOZISTE);
  const N = ZZ_NASTAVENI;

  /* Záznam protokolu podle id (vytvoří / doplní). */
  const protokolZapis = async (zaznam) => {
    const prot = await sH.cti(KLIC_PROTOKOL);
    const seznam = (Array.isArray(prot) ? prot : []).filter(x => !(x && x.id === zaznam.id));
    await sH.zapis(KLIC_PROTOKOL, seznam.concat([zaznam]).slice(-N.protokolMax));
  };
  /* Náhled pryč; rozpracovaný zápis se v protokolu označí jako přerušený (R1, R5). */
  const navrhSmaz = async (n, proc) => {
    if (n && n.zapis && n.zapis.protokol) await protokolZapis({ ...n.zapis.protokol, ...n.zapis.v, stav: proc });
    await sH.smaz(KLIC_NAVRH);
  };
  /* Propadlý náhled (24 h) se nevydá a smaže (revize R5). */
  const navrhCti = async () => {
    const n = await sH.cti(KLIC_NAVRH);
    if (n && !(N.ted() - Date.parse(n.zacatek) < N.platnostMs)) { await navrhSmaz(n, 'přerušen (náhled propadl)'); return null; }
    return n;
  };

  if (req.method === 'GET') {
    return vyhradne('zakaznici/hromadne', async () => {
      const n = await navrhCti();
      const p = await sH.cti(KLIC_PROTOKOL);
      return json({ ok: true, navrh: souhrn(n), protokol: Array.isArray(p) ? p : [] });
    });
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
    const uplynulo = () => N.ted() - start;
    let n = await navrhCti();

    if (t.akce === 'zrusit') {
      if (n) await navrhSmaz(n, 'přerušen (náhled zahozen)');
      return json({ ok: true, navrh: null });
    }

    if (t.akce === 'zalozit') {
      if (!n || !id || n.id !== id)
        return json({ ok: false, chyba: 'Náhled už neplatí (propadl, zapsal ho někdo jiný nebo běží novější). Spusťte náhled znovu.' }, 409);
      if (n.faze !== 'hotovo' && n.faze !== 'zapis')
        return json({ ok: false, chyba: 'Náhled ještě není dokončený.' }, 409);
      if (n.faze === 'hotovo') {
        const pocty = ZZ.zzPocty(Object.values(n.polozky));
        n.faze = 'zapis';
        n.zapis = {
          zacatek: ted,
          fronta: Object.values(n.polozky).filter(p => p.stav === 'zalozit' && p.ares).map(p => p.ico).sort(),
          v: { zalozeno: 0, uzExistovalo: 0, zmenenoMezitim: 0, strop: 0 },
          protokol: { id: n.id, kdy: ted, kdo: relace.email, stav: 'probíhá', zakazek: n.seskup.zakazek || 0,
            ico: Object.keys(n.polozky).length, bezIco: n.seskup.bezIco || 0, neplatneIco: n.seskup.neplatneIco || 0,
            dotazuAres: n.dotazu || 0, navrzeno: pocty.zalozit, existovalo: pocty.existuje, nesedi: pocty.nesedi,
            aresNedostupny: pocty.vypadek },
        };
        await sH.zapis(KLIC_NAVRH, n);
        await protokolZapis({ ...n.zapis.protokol, ...n.zapis.v });
      }
      const z = n.zapis;
      const sZak = await uloziste('zakazky');
      const klice = await s.seznam('z/');                 // R2: jedno načtení seznamu klíčů, žádné čtení karet
      const ex = ZZ.zzExistujiciZKlicu(klice);
      let pocetKaret = klice.length;
      const poznamka = 'Založeno hromadně ze zakázek, údaje ověřené v ARES ' + z.zacatek.slice(0, 10) + '.';
      let zapsano = 0;
      while (z.fronta.length && zapsano < N.zapisNaVolani && (zapsano === 0 || uplynulo() < N.rozpocetMs)) {
        const ico = z.fronta[0];
        const p = n.polozky[ico];
        const klic = g.zakaznikKlic({ ico });
        await vyhradne('zakaznici/' + klic, async () => {
          const stara = await s.cti('z/' + klic);
          if (stara || ZZ.zzKartaExistuje(ex, ico, p.ares.nazev)) {
            /* Karta z TOHOTO zápisu (volání spadlo po zápisu karty, před uložením
             * průběžných počtů) se počítá jako založená, ne jako existující. */
            const nase = stara && stara.autor === relace.email && stara.poznamka === poznamka && String(stara.zalozen || '') >= z.zacatek;
            if (nase) z.v.zalozeno++; else z.v.uzExistovalo++;
            return;
          }
          const zak = await sZak.cti('z/' + p.soubor);
          const strana = ZZ.zzStranaSIco(zak, ico);
          const sh = strana ? ZZ.zzShoda({ nazev: strana.hlavicka.objednatel, sidlo: strana.hlavicka.adresaObjednatele },
            { stav: 'ok', subjekt: p.ares }) : null;
          if (!sh || sh.stav !== 'zalozit') { z.v.zmenenoMezitim++; return; }   // zakázka se mezitím změnila
          if (pocetKaret >= ZAKAZNICI_MAX) { z.v.strop++; return; }
          const karta = ZZ.zzKarta(p.ares, strana, relace.email, ted, poznamka);
          await s.zapis('z/' + klic, karta);
          ex.ico.add(ico); pocetKaret++; z.v.zalozeno++;
        });
        z.fronta.shift(); zapsano++;
      }
      const hotovo = !z.fronta.length;
      const zaznam = { ...z.protokol, ...z.v, stav: hotovo ? 'dokončen' : 'probíhá', zbyva: z.fronta.length };
      if (hotovo) delete zaznam.zbyva;
      await protokolZapis(zaznam);
      if (hotovo) await sH.smaz(KLIC_NAVRH);
      else await sH.zapis(KLIC_NAVRH, n);
      return json({ ok: true, hotovo, vysledek: zaznam, navrh: hotovo ? null : souhrn(n) });
    }

    if (t.akce !== 'nahled') return json({ ok: false, chyba: 'Neznámá akce.' }, 400);

    if (id && (!n || n.id !== id))
      return json({ ok: false, chyba: 'Náhled už neplatí (propadl, nebo ho mezitím spustil jiný administrátor). Spusťte ho znovu.' }, 409);
    if (!id && n && n.faze === 'zapis')
      return json({ ok: false, chyba: 'Zápis karet z minulého náhledu ještě neskončil — dokončete ho (Založit), nebo náhled zahoďte.' }, 409);
    if (!id) {
      const sZak = await uloziste('zakazky');
      const klice = (await sZak.seznam('z/')).map(k => k.slice(2)).sort();
      n = { schema: 2, id: ted + '-' + Math.random().toString(36).slice(2, 8), kdo: relace.email, zacatek: ted,
        faze: 'cteni', klice, ctiOd: 0, seskup: {}, polozky: {}, fronta: [], dotazu: 0, dotazuKolo: 0 };
    }
    if (n.faze === 'zapis') return json({ ok: true, navrh: souhrn(n) });
    /* „Zkusit znovu“ = další kolo: položky „zkusit znovu“ (výpadek, strop kola
     * nebo dne) zpět do fronty, ostatní výsledky zůstávají (R3). */
    if (t.znovu === true && n.faze === 'hotovo') {
      for (const p of Object.values(n.polozky))
        if (p.stav === 'vypadek') { p.stav = 'zbyva'; p.duvod = ''; n.fronta.push(p.ico); }
      n.fronta.sort();
      n.dotazuKolo = 0;
      if (n.fronta.length) n.faze = 'ares';
    }

    if (n.faze === 'cteni') {
      const sZak = await uloziste('zakazky');
      let precteno = 0;
      while (n.ctiOd < n.klice.length && precteno < N.cteniNaVolani && (precteno === 0 || uplynulo() < N.rozpocetMs)) {
        const soubor = n.klice[n.ctiOd++]; precteno++;
        const zak = await sZak.cti('z/' + soubor);
        if (zak) ZZ.zzSeskupPridej(n.seskup, soubor, zak);
      }
      if (n.ctiOd >= n.klice.length) {
        const ex = ZZ.zzExistujiciZKlicu(await s.seznam('z/'));   // R2: jen klíče
        const nesedi = (await sH.cti(KLIC_NESEDI)) || {};
        for (const sk of Object.values(n.seskup.skupiny || {})) {
          const p = { ico: sk.ico, nazev: sk.nazev, sidlo: sk.sidlo, pocet: sk.pocet, soubor: sk.soubor, kdy: sk.kdy, stav: 'zbyva', duvod: '' };
          const m = nesedi[sk.ico];
          if (ex.ico.has(sk.ico)) { p.stav = 'existuje'; p.duvod = 'karta s tímto IČO už existuje'; }
          else if (m && m.soubor === sk.soubor && m.kdy === sk.kdy && start - Date.parse(m.overeno) < N.nesediPlatnostMs) {
            /* R3: nesedělo už minule a nejnovější zakázka je táž — do ARES znovu ne. */
            p.stav = 'nesedi'; p.duvod = m.duvod + ' (ověřeno v ARES ' + String(m.overeno).slice(0, 10) + ')';
            p.aresNazev = m.aresNazev || ''; p.aresSidlo = m.aresSidlo || '';
          }
          else n.fronta.push(sk.ico);
          n.polozky[sk.ico] = p;
        }
        delete n.seskup.skupiny;                               // R10: údaje už nese `polozky`
        n.fronta.sort();
        n.faze = 'ares';
      }
    }

    if (n.faze === 'ares' && n.fronta.length) {
      const ex = ZZ.zzExistujiciZKlicu(await s.seznam('z/'));
      const denDnes = ted.slice(0, 10);
      let den = await sH.cti(KLIC_DEN);
      if (!den || den.den !== denDnes) den = { den: denDnes, pocet: 0 };
      let nesedi = null;
      let dotazy = 0;
      /* První dotaz jen, když zbývá čas (revize R2) — jinak další volání. */
      while (n.fronta.length && dotazy < N.aresNaVolani && uplynulo() < N.rozpocetMs - ARES_TIMEOUT_MS - N.pauzaMs) {
        if ((n.dotazuKolo || 0) >= N.aresMaxNavrh || den.pocet >= N.aresMaxDen) {
          const proc = den.pocet >= N.aresMaxDen ? 'denní strop dotazů do ARES — zkusit znovu zítra'
            : 'strop dotazů do ARES na jedno kolo — „Zkusit znovu“ pokračuje';
          for (const ico of n.fronta) { n.polozky[ico].stav = 'vypadek'; n.polozky[ico].duvod = proc; }
          n.fronta = [];
          break;
        }
        if (dotazy > 0) await N.cekej(N.pauzaMs);
        const ico = n.fronta.shift();
        const p = n.polozky[ico];
        const r = await aresNacti(ico, { fetch: ARES_SIT.fetch });
        dotazy++; n.dotazu++; n.dotazuKolo = (n.dotazuKolo || 0) + 1; den.pocet++;
        const sh = ZZ.zzShoda(p, r);
        p.stav = sh.stav; p.duvod = sh.duvod;
        delete p.ares; delete p.aresNazev; delete p.aresSidlo;
        if (r.stav === 'ok' && r.subjekt) { p.aresNazev = r.subjekt.nazev; p.aresSidlo = r.subjekt.adresa; }
        if (sh.stav === 'zalozit') {
          const uz = ZZ.zzKartaExistuje(ex, ico, r.subjekt.nazev);
          if (uz) { p.stav = 'existuje'; p.duvod = uz; }
          else p.ares = r.subjekt;
        }
        if (sh.stav !== 'vypadek') {
          nesedi = nesedi || (await sH.cti(KLIC_NESEDI)) || {};
          if (sh.stav === 'nesedi') nesedi[ico] = { soubor: p.soubor, kdy: p.kdy, duvod: sh.duvod, overeno: ted,
            aresNazev: p.aresNazev || '', aresSidlo: p.aresSidlo || '' };
          else delete nesedi[ico];
        }
      }
      if (dotazy) await sH.zapis(KLIC_DEN, den);
      if (nesedi) {
        for (const k of Object.keys(nesedi)) if (!(start - Date.parse(nesedi[k].overeno) < N.nesediPlatnostMs)) delete nesedi[k];
        await sH.zapis(KLIC_NESEDI, nesedi);
      }
    }
    if (n.faze === 'ares' && !n.fronta.length) n.faze = 'hotovo';
    await sH.zapis(KLIC_NAVRH, n);
    return json({ ok: true, navrh: souhrn(n) });
  });
};

export const config = { path: '/api/zakaznici-ze-zakazek' };
