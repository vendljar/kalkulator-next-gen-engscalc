/* Dodatkové texty položek platné pro celou aplikaci (22. 9. 2026, zadání J. V.).
 *
 * Zadání: „dodatkové texty pod příplatky a volitelnými položkami, které jako
 * administrátor zadám, mají zůstat v aplikaci uložené. Ostatní uživatelé je
 * mohou v případě potřeby upravovat, ale jen admin je může zadat, resp.
 * trvale přepisovat."
 *
 * PROČ SAMOSTATNÁ CESTA A NE CENÍK. Text je od #267 součástí ceníku, jenže
 * ceník se ZVEŘEJŇUJE: vydat kvůli jedné větě novou verzi ceníku znamená
 * novou verzi pro všechny budoucí nabídky, záznam v historii a porovnání
 * otisků. Správce to proto nedělal a text zůstával jen v jeho zakázce, kde
 * ho nikdo jiný neviděl. Tahle mapa stojí vedle ceníku, nemá verzi a zapisuje
 * se jedním polem.
 *
 * GET  /api/popisy  → { ok, popisy: { texty, kdo, kdy } | null } — každý přihlášený
 * POST /api/popisy { klic, text } | { texty, ocekavaneKdy } | { texty } → uložit — JEN Administrátor
 *      (tvary a proč jich je víc: u zápisu níž)
 *
 * Ukládá se do úložiště `program` pod klíč `popisy`, aby to noční otisk
 * i ruční záloha braly s sebou jedním čtením — stejný vzor jako matice
 * zobrazení (/api/zobrazeni).
 *
 * Očistu dělá `popisyOciste()` ze src/cenik.js, tedy TÝMŽ kódem jako
 * prohlížeč: prázdné texty se nezapisují, klíč i text mají strop délky
 * a počet položek je omezený. Bez toho by se sem dal poslat slovník
 * o libovolné velikosti, který se pak vlije do ceníku každé nové zakázky.
 *
 * POZOR NA ODESLANÉ NABÍDKY: tahle mapa se vlévá do VÝCHOZÍHO ceníku při
 * přihlášení, ne do uložených zakázek. Zakázka si nese vlastní kopii ceníku,
 * takže pozdější změna textu nemění to, co už odešlo zákazníkovi. */
import { uloziste, vyzadujRoli, json } from '../lib/sdilene.mjs';
import { jadro, jadroChyba } from '../lib/jadro.mjs';

export default async (req) => {
  try { await jadro(); } catch (e) { return jadroChyba(e); }

  const s = await uloziste('program');

  if (req.method === 'GET') {
    const url = new URL(req.url);
    /* ZÁCHRANA ZTRACENÝCH TEXTŮ (25. 9. 2026). Text, který zmizel ze
     * společné mapy, obvykle pořád leží v ceníku zakázky, kde byl napsaný.
     * `?sber=1` projde uložené zakázky a vrátí texty, které společná mapa
     * nemá nebo má jinak — jen k nahlédnutí, převzetí dělá administrátor
     * v číselníku po jednom. Jen administrátor: čte všechny zakázky. */
    if (url.searchParams.get('sber')) {
      const { chyba } = await vyzadujRoli(req, 'Administrátor');
      if (chyba) return chyba;
      const p = await s.cti('popisy');
      const spolecne = (p && p.texty) || {};
      const zak = await uloziste('zakazky');
      const nalez = {};
      /* Čte se po dvaceti souběžně — stovky zakázek po jedné by přetáhly
       * časový limit funkce. */
      const klice = await zak.seznam('z/');
      const nactene = [];
      for (let i = 0; i < klice.length; i += 20)
        nactene.push(...await Promise.all(klice.slice(i, i + 20).map(k =>
          zak.cti(k).then(z => [k, z]).catch(() => [k, null]))));
      for (const [k, z0] of nactene) {
        let z = z0;
        if (typeof z === 'string') { try { z = JSON.parse(z); } catch (e) { z = null; } }
        if (!z || !Array.isArray(z.varianty)) continue;
        for (const v of z.varianty) {
          const pop = v && v.data && v.data.cenik && v.data.cenik.popisy;
          if (!pop || typeof pop !== 'object') continue;
          const cist = globalThis.popisyOciste(pop);
          for (const klic of Object.keys(cist)) {
            if (spolecne[klic] === cist[klic]) continue;
            const kdy = String((v && v.upraveno) || z.upraveno || '');
            const zaznam = { text: cist[klic], cislo: String(z.cislo || k.slice(2)), kdy };
            const sez = nalez[klic] || (nalez[klic] = []);
            const stejny = sez.find(x => x.text === zaznam.text);
            if (stejny) { if (kdy > stejny.kdy) Object.assign(stejny, zaznam); stejny.pocet++; }
            else sez.push(Object.assign(zaznam, { pocet: 1 }));
          }
        }
      }
      Object.values(nalez).forEach(sez => sez.sort((a, b) => String(b.kdy).localeCompare(String(a.kdy))));
      return json({ ok: true, nalez });
    }
    const { chyba } = await vyzadujRoli(req);          // stačí být přihlášen
    if (chyba) return chyba;
    const p = await s.cti('popisy');
    return json({ ok: true, popisy: p || null });
  }
  if (req.method !== 'POST') return json({ ok: false, chyba: 'Použijte GET nebo POST.' }, 405);

  const { chyba, relace } = await vyzadujRoli(req, 'Administrátor');
  if (chyba) return chyba;
  let t; try { t = await req.json(); } catch (e) { return json({ ok: false, chyba: 'Vstup není platný JSON.' }, 400); }

  const texty = globalThis.popisyOciste(t && t.texty);
  const puvodni = (await s.cti('popisy')) || null;
  const stare = (puvodni && puvodni.texty && typeof puvodni.texty === 'object') ? puvodni.texty : {};

  /* TEXTY SE ZTRÁCELY (hlášeno J. V. 25. 9. 2026: „z aplikace se mi v čase
   * ztrácí dodatkové texty"). Do 25. 9. POST vždy PŘEPSAL celou mapu tím, co
   * poslal prohlížeč — a prohlížeč posílal mapu, kterou si načetl při
   * přihlášení. Stačily dvě otevřené karty (nebo karta otevřená od rána):
   * text zapsaný v jedné druhá při dalším zápisu smazala, protože o něm
   * nevěděla. Stejně dopadlo uložení po neúspěšném načtení mapy — prázdný
   * základ + jeden text = všechno ostatní pryč.
   *
   * Proto teď tři tvary:
   *   { klic, text }            → změna JEDNOHO textu, sloučí se se stavem
   *                                na serveru (prázdný text klíč smaže);
   *   { texty, ocekavaneKdy }   → celá mapa z číselníku; když ji mezitím
   *                                změnil někdo jiný, 409 a nic se nepřepíše;
   *   { texty } bez razítka     → starší prohlížeč: jen DOPLNÍ a ZMĚNÍ,
   *                                nikdy nemaže (mazat smí jen tvar s klíčem
   *                                nebo s razítkem). */
  let nove;
  if (t && typeof t.klic === 'string') {
    const klic = t.klic.trim();
    if (!klic) return json({ ok: false, chyba: 'Chybí název položky.' }, 400);
    nove = Object.assign({}, stare);
    const jeden = globalThis.popisyOciste({ [klic]: t.text });
    if (jeden[klic]) nove[klic] = jeden[klic]; else delete nove[klic];
    nove = globalThis.popisyOciste(nove);
  } else if (t && typeof t.ocekavaneKdy === 'string') {
    if ((puvodni ? String(puvodni.kdy || '') : '') !== t.ocekavaneKdy)
      return json({ ok: false, konflikt: true, popisy: puvodni,
        chyba: 'Dodatkové texty mezitím změnil někdo jiný (nebo jiné okno). Načtěte je znovu a změnu zopakujte.' }, 409);
    nove = texty;
  } else {
    nove = Object.assign({}, stare, texty);        // `texty` už prošly očistou výš
  }

  /* Předchozí stav se nezahazuje: posledních 30 verzí leží vedle mapy
   * (`popisy_historie`), takže ztracený text jde dohledat i bez zálohy. */
  if (puvodni) {
    let hist = [];
    try { hist = (await s.cti('popisy_historie')) || []; } catch (e) { hist = []; }
    if (!Array.isArray(hist)) hist = [];
    hist.unshift(puvodni);
    await s.zapis('popisy_historie', hist.slice(0, 30));
  }
  const zaznam = { texty: nove, kdo: relace.email, kdy: new Date().toISOString() };
  await s.zapis('popisy', zaznam);
  return json({ ok: true, kdy: zaznam.kdy, pocet: Object.keys(nove).length, popisy: zaznam });
};
export const config = { path: '/api/popisy' };
