/* OBNOVA ONLINE DATABÁZE ZE ZÁLOHY (7. 9. 2026) — jen Administrátor.
 *
 * Proč: do 7. 9. 2026 byla záloha jednosměrná. /api/zaloha ji vydala ke
 * stažení, lib/zalohovani.mjs pořizoval otisk na serveru — ale zpátky vedla
 * jen ruční cesta po kusech: zveřejnit ceník ze složky, uložit zakázky po
 * jedné, založit účty znovu s novými hesly. Po havárii nebo omylu by to
 * byly hodiny práce. Tohle je opak zálohy: jeden požadavek, který umí
 * přepsat celou databázi — a proto je stejně citlivý a má pět pojistek.
 *
 * POST /api/obnova {
 *   zdroj:      { soubor: <záloha z /api/zaloha> }
 *               | { otisk: 'YYYY-MM-DD' | 'YYYY-MM-DD-pred-obnovou' },
 *   rezim:      'doplnit' (zapíše jen to, co na serveru chybí)
 *               | 'prepsat' (zapíše všechno ze zálohy přes stávající),
 *   casti:      ['program','firma','zobrazeni','zakazky','uzivatele',
 *                'sablony','zakaznici','podpisy']   — nepovinné = všechny,
 *   nahled:     true  → NIC nezapíše, jen vrátí, co by se stalo,
 *   potvrzeni:  'OBNOVIT' → bez něj se ostrá obnova odmítne (428)
 * } → { ok, nahled, zdroj: { typ, klic, porizena, web }, casti: { <část>:
 *      { nove, prepsane, bezeZmeny, preskocene, duvody: [{ klic, duvod }] } },
 *      rejstrik: { zakazek, prestaven }, otiskPred, upozorneni: [] }
 *
 * PĚT POJISTEK (zadání 7. 9. 2026):
 *  1) Náhled: stejný průchod bez zápisu; obrazovka bez něj obnovu nepustí
 *     a server ji bez `potvrzeni` odmítne.
 *  2) Otisk před obnovou: než se sáhne na první záznam, pořídí se otisk
 *     současného stavu pod klíčem `<den>-pred-obnovou`. Když se otisk
 *     nepovede, obnova se NEPROVEDE — nevratná operace bez cesty zpátky je
 *     horší než neprovedená obnova.
 *  3) Uzamčené nabídky: zakázka, které by obnova změnila data uzamčené
 *     (odeslané) varianty nebo jí sundala zámek, se přeskočí a vypíše — i v
 *     režimu „přepsat". Stejná kontrola jako při ukládání (zakazky.mjs).
 *  4) Obnova nikdy nemaže: ani „přepsat" neodstraní záznam, který v záloze
 *     není. Mazání je samostatné rozhodnutí (DELETE /api/zakazky), ne
 *     vedlejší účinek obnovy.
 *  5) Cizí nebo poškozený soubor se neobnovuje: musí nést razítko pořízení
 *     a aspoň jednu známou část.
 *
 * NA CO SE ZAPOMÍNÁ:
 *  – Účty: stažená záloha otisky hesel schválně nenese, takže účty z ní
 *    obnovit NEJDE — vznikly by účty, do kterých se nikdo nepřihlásí.
 *    Přeskočí se s důvodem a nabídne se serverový otisk, ten je nese celé.
 *  – Rejstřík zakázek se po zápisu poskládá ze SKUTEČNÉHO obsahu úložiště,
 *    ne ze zálohy — jinak by v seznamu zůstal sirotek po zakázce, kterou
 *    obnova kvůli zámku přeskočila.
 *  – Kolize klíčů: otisk před obnovou má vlastní slot (klicPredObnovou),
 *    takže obnova z dnešního otisku nepřepíše svůj zdroj. */
import { uloziste, vyzadujRoli, json, ADMIN_EMAIL } from '../lib/sdilene.mjs';
import { jadro, jadroChyba } from '../lib/jadro.mjs';
import { porizOtisk, denDnes, klicPredObnovou } from '../lib/zalohovani.mjs';

export const OBNOVA_CASTI = ['program', 'firma', 'zobrazeni', 'zakazky', 'uzivatele',
                             'sablony', 'zakaznici', 'podpisy'];
export const OBNOVA_REZIMY = ['doplnit', 'prepsat'];
export const OBNOVA_POTVRZENI = 'OBNOVIT';
const OTISK_KLIC = /^\d{4}-\d{2}-\d{2}(-pred-obnovou)?$/;
const KLIC_MAX = 200;

const stejne = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const bilance = () => ({ nove: 0, prepsane: 0, bezeZmeny: 0, preskocene: 0, duvody: [] });
const preskoc = (b, klic, duvod) => { b.preskocene++; b.duvody.push({ klic: String(klic), duvod }); };

/* Záloha vypadá jako záloha kalkulátoru: razítko pořízení + aspoň jedna
 * známá část (klíč přítomný, byť s null — i „ceník nebyl" je informace). */
function vypadaJakoZaloha(z) {
  return !!z && typeof z === 'object' && !Array.isArray(z)
    && typeof z.porizena === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(z.porizena)
    && OBNOVA_CASTI.some(c => Object.prototype.hasOwnProperty.call(z, c));
}

/* Jeden záznam v úložišti: rozhodne, do které kolonky patří, a když se
 * nejen nahlíží, zapíše. `kontrola(stary, novy)` vrací důvod přeskočení
 * (text) nebo prázdno — používají ji zakázky kvůli zámkům. */
async function zaznam(b, s, klic, novy, rezim, zapisovat, kontrola) {
  const stary = await s.cti(klic);
  if (stary != null && stejne(stary, novy)) { b.bezeZmeny++; return; }
  if (stary != null && rezim === 'doplnit') {
    preskoc(b, klic, 'na serveru už je a liší se — režim „doplnit" nepřepisuje'); return;
  }
  if (stary != null && kontrola) {
    const d = kontrola(stary, novy);
    if (d) { preskoc(b, klic, d); return; }
  }
  if (zapisovat) await s.zapis(klic, novy);
  if (stary == null) b.nove++; else b.prepsane++;
}

/* Mapa klíč → záznam (sablony, zakaznici, podpisy; zakázky s předponou). */
async function obnovMapu(b, s, mapa, rezim, zapisovat, predpona, kontrola) {
  if (!mapa || typeof mapa !== 'object' || Array.isArray(mapa)) {
    preskoc(b, '*', 'záloha tuto část nenese'); return;
  }
  for (const [k, v] of Object.entries(mapa)) {
    if (!k || k.length > KLIC_MAX) { preskoc(b, k, 'nepřijatelný klíč'); continue; }
    if (v == null || typeof v !== 'object') { preskoc(b, k, 'poškozený záznam (není objekt)'); continue; }
    await zaznam(b, s, (predpona || '') + k, v, rezim, zapisovat, kontrola);
  }
}

export default async (req) => {
  if (req.method !== 'POST') return json({ ok: false, chyba: 'Použijte POST.' }, 405);
  const { chyba, relace } = await vyzadujRoli(req, 'Administrátor');
  if (chyba) return chyba;
  let ULO;
  try { ({ ULO } = await jadro()); } catch (e) { return jadroChyba(e); }

  let t; try { t = await req.json(); } catch (e) { return json({ ok: false, chyba: 'Vstup není platný JSON.' }, 400); }
  if (!t || typeof t !== 'object') return json({ ok: false, chyba: 'Chybí tělo požadavku.' }, 400);

  /* --- vstupy --- */
  const rezim = String(t.rezim || '');
  if (!OBNOVA_REZIMY.includes(rezim))
    return json({ ok: false, chyba: 'Režim musí být „doplnit" nebo „prepsat".' }, 400);
  let casti = OBNOVA_CASTI;
  if (t.casti !== undefined) {
    if (!Array.isArray(t.casti) || !t.casti.length || t.casti.some(c => !OBNOVA_CASTI.includes(c)))
      return json({ ok: false, chyba: 'Neznámá část k obnově. Známé: ' + OBNOVA_CASTI.join(', ') + '.' }, 400);
    casti = OBNOVA_CASTI.filter(c => t.casti.includes(c));
  }
  const nahled = t.nahled === true;

  /* --- zdroj --- */
  const zd = t.zdroj && typeof t.zdroj === 'object' ? t.zdroj : {};
  let zaloha, zdrojPopis;
  if (zd.otisk !== undefined) {
    const klic = String(zd.otisk || '');
    if (!OTISK_KLIC.test(klic)) return json({ ok: false, chyba: 'Otisk se udává dnem (YYYY-MM-DD).' }, 400);
    zaloha = await (await uloziste('zalohy')).cti(klic);
    if (!zaloha) return json({ ok: false, chyba: 'Otisk ' + klic + ' na serveru není.' }, 404);
    zdrojPopis = { typ: 'otisk', klic };
  } else if (zd.soubor !== undefined) {
    zaloha = zd.soubor;
    if (!vypadaJakoZaloha(zaloha))
      return json({ ok: false, chyba: 'Soubor nevypadá jako záloha kalkulátoru: chybí razítko pořízení '
        + 'nebo žádná známá část (ceník, zakázky, účty…). Obnovuje se jen ze souboru z tlačítka „Stáhnout zálohu".' }, 400);
    zdrojPopis = { typ: 'soubor', klic: '' };
  } else {
    return json({ ok: false, chyba: 'Chybí zdroj: nahraný soubor zálohy, nebo otisk podle dne.' }, 400);
  }
  if (!vypadaJakoZaloha(zaloha))
    return json({ ok: false, chyba: 'Otisk je poškozený (chybí razítko pořízení nebo známé části).' }, 400);
  zdrojPopis.porizena = String(zaloha.porizena || '');
  zdrojPopis.web = String(zaloha.zdroj || '');

  /* Pojistka 1: ostrá obnova jen s výslovným potvrzením (428 = chybí
   * předpoklad). Obrazovka posílá potvrzení až po náhledu a dialogu. */
  if (!nahled && t.potvrzeni !== OBNOVA_POTVRZENI)
    return json({ ok: false, chyba: 'Obnova se provede jen s výslovným potvrzením po náhledu.' }, 428);

  /* Pojistka 2: otisk současného stavu DŘÍV, než se sáhne na první záznam.
   * Vlastní slot, aby obnova z dnešního otisku nepřepsala svůj zdroj. */
  let otiskPred = null;
  if (!nahled) {
    try {
      const v = await porizOtisk('pred-obnovou', relace.email, klicPredObnovou(denDnes()));
      otiskPred = v.den;
    } catch (e) {
      return json({ ok: false, chyba: 'Otisk současného stavu se nepovedl (' + (e && e.message ? e.message : e)
        + ') — obnova se NEPROVEDLA, nic se nezměnilo. Bez cesty zpátky se neobnovuje.' }, 500);
    }
  }

  const zapisovat = !nahled;
  const vysledek = {};
  const upozorneni = [];
  const sProg = await uloziste('program');

  /* Jednozáznamové části v úložišti `program`. */
  const jednoduche = { program: 'db', firma: 'firma', zobrazeni: 'zobrazeni' };
  for (const cast of Object.keys(jednoduche)) {
    if (!casti.includes(cast)) continue;
    const b = bilance();
    const hodnota = zaloha[cast];
    if (hodnota == null || typeof hodnota !== 'object') preskoc(b, jednoduche[cast], 'záloha tuto část nenese');
    else await zaznam(b, sProg, jednoduche[cast], hodnota, rezim, zapisovat);
    vysledek[cast] = b;
  }

  /* Zakázky: pojistka 3 — stejná kontrola zámků jako při ukládání. */
  let rejstrik = null;
  if (casti.includes('zakazky')) {
    const b = bilance();
    const s = await uloziste('zakazky');
    const kontrolaZamku = (stara, nova) => {
      const k = ULO.uloKontrolaZamku(stara, nova);
      if (!k.ok) return 'uzamčená (odeslaná) nabídka: ' + k.problemy.map(ULO.uloProblemPopis).join('; ');
      for (const sv of (stara.varianty || [])) {
        if (!(globalThis.variantaUzamcena && globalThis.variantaUzamcena(sv))) continue;
        const nv = (nova.varianty || []).find(v => v && v.id === sv.id);
        if (nv && !stejne(nv.data, sv.data)) {
          const cislo = (typeof globalThis.variantaCislo === 'function') ? globalThis.variantaCislo(stara, sv) : '';
          return 'změnila by se data uzamčené (odeslané) nabídky' + (cislo ? ' (' + cislo + ')' : '');
        }
      }
      return '';
    };
    await obnovMapu(b, s, zaloha.zakazky, rezim, zapisovat, 'z/', kontrolaZamku);
    vysledek.zakazky = b;

    /* Rejstřík ze skutečného obsahu úložiště — ne ze zálohy. V náhledu se
     * jen spočítá, kolik zakázek by po obnově v rejstříku bylo. */
    const klice = await s.seznam('z/');
    if (zapisovat) {
      const zaznamy = [];
      for (const k of klice) {
        const z = await s.cti(k);
        if (z && typeof z === 'object') zaznamy.push(ULO.uloRejstrikZaznam(z, { soubor: k.slice(2) }));
      }
      await s.zapis('_rejstrik', { schema: 1, zakazky: ULO.uloRejstrikSerad(zaznamy),
                                   kdo: relace.email, upraveno: new Date().toISOString() });
      rejstrik = { zakazek: zaznamy.length, prestaven: true };
    } else {
      rejstrik = { zakazek: klice.length + b.nove, prestaven: false };
    }
  }

  /* Účty: jen s otiskem hesla (serverový otisk). Hlavní administrátor se
   * nedá vypnout ani obnovou — stejné pravidlo jako v uzivatele.mjs. */
  if (casti.includes('uzivatele')) {
    const b = bilance();
    const s = await uloziste('uzivatele');
    const seznam = Array.isArray(zaloha.uzivatele) ? zaloha.uzivatele : null;
    if (!seznam) preskoc(b, '*', 'záloha tuto část nenese');
    else for (const u of seznam) {
      const email = String((u && u.email) || '').trim().toLowerCase();
      if (!email) { preskoc(b, '?', 'účet bez e-mailu'); continue; }
      if (!(typeof u.heslo === 'string' && u.heslo.includes(':'))) {
        preskoc(b, email, 'bez otisku hesla — stažená záloha hesla schválně nenese; účty obnovte ze serverového otisku');
        continue;
      }
      const novy = { ...u, email };
      if (email === ADMIN_EMAIL) novy.aktivni = true;
      const stary = await s.cti(email);
      if (email === relace.email && stary && !stejne(stary, novy) && rezim === 'prepsat')
        upozorneni.push('Váš vlastní účet se vrátí na stav z otisku (' + zdrojPopis.porizena.slice(0, 10)
          + ') — po obnově se přihlaste znovu heslem, které platilo tehdy.');
      await zaznam(b, s, email, novy, rezim, zapisovat);
    }
    vysledek.uzivatele = b;
  }

  /* Mapy: šablony, kartotéka zákazníků, podpisy (klíče přesně jako v úložišti). */
  const mapy = { sablony: 'sablony', zakaznici: 'zakaznici', podpisy: 'podpisy' };
  for (const cast of Object.keys(mapy)) {
    if (!casti.includes(cast)) continue;
    const b = bilance();
    await obnovMapu(b, await uloziste(mapy[cast]), zaloha[cast], rezim, zapisovat, '');
    vysledek[cast] = b;
  }

  if (otiskPred)
    upozorneni.push('Stav před obnovou leží v otisku ' + otiskPred + ' (jeden slot na den — další obnova téhož dne ho přepíše).');

  return json({ ok: true, nahled, rezim, zdroj: zdrojPopis, casti: vysledek, rejstrik, otiskPred, upozorneni });
};
export const config = { path: '/api/obnova' };
