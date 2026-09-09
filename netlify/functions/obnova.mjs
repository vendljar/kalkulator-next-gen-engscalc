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
 *   zdroj:      { soubor: <záloha z /api/zaloha, nebo její část> }
 *               | { otisk: 'YYYY-MM-DD' | '…-pred-obnovou' },
 *   rezim:      'doplnit' (zapíše jen to, co na serveru chybí)
 *               | 'prepsat' (zapíše všechno ze zálohy přes stávající),
 *   casti:      ['program','firma','zobrazeni','zakazky','uzivatele',
 *                'sablony','zakaznici','podpisy']   — nepovinné = všechny,
 *   nahled:     true  → NIC nezapíše, jen vrátí, co by se stalo,
 *   potvrzeni:  'OBNOVIT' → bez něj se ostrá obnova odmítne (428)
 * } → { ok, nahled, zdroj: { typ, klic, porizena, web }, casti: { <část>:
 *      { nove, prepsane, bezeZmeny, preskocene, duvody: [{ klic, duvod }] } },
 *      rejstrik: { zakazek, existujicich, prestaven }, otiskPred, upozorneni: [] }
 *
 * OBNOVA PO DÁVKÁCH (7. 9. 2026 večer). Netlify přijme v jednom požadavku
 * nejvýš ~6 MB; záloha se šablonami, podpisy a přílohami zakázek má klidně
 * 20 MB (záloha ze schaftscalc: 19 MB). Klient ji proto posílá po částech
 * a server drží jednu obnovu jako celek:
 *   { faze: 'zacatek', rezim, potvrzeni }   → otisk před obnovou + obnovaId
 *   { obnovaId, zdroj: { soubor: <část> }, rezim, casti, potvrzeni }
 *                                            → dávka: bez dalšího otisku,
 *                                              bez přestavby rejstříku
 *   { faze: 'konec', obnovaId }             → přestaví rejstřík, vrátí součet
 *   { faze: 'zrusit', obnovaId }            → zahodí rozpracovanou obnovu
 *                                              (kterýkoli administrátor),
 *                                              rejstřík přestaví
 * Token žije v úložišti `zalohy` (klíč `obnova-<id>`, hodinu, jen pro toho,
 * kdo obnovu zahájil), aby dávky nemohl posílat nikdo jiný a aby se otisk
 * před obnovou nepořizoval znovu s napůl obnovenou databází — to by cestu
 * zpátky zničilo. Otisk ze serveru se dávkovat nemusí, ten si server čte sám.
 *
 * PĚT POJISTEK (zadání 7. 9. 2026):
 *  1) Náhled: stejný průchod bez zápisu; obrazovka bez něj obnovu nepustí
 *     a server ji bez `potvrzeni` odmítne.
 *  2) Otisk před obnovou: než se sáhne na první záznam, pořídí se otisk
 *     současného stavu pod vlastním klíčem `<den>T<hhmmss>-pred-obnovou`.
 *     Když se otisk nepovede, obnova se NEPROVEDE — nevratná operace bez
 *     cesty zpátky je horší než neprovedená obnova.
 *  3) Uzamčené nabídky: zakázka, které by obnova změnila data uzamčené
 *     (odeslané) varianty nebo jí sundala zámek, se přeskočí a vypíše — i v
 *     režimu „přepsat". Stejná kontrola jako při ukládání (zakazky.mjs).
 *  4) Obnova nikdy nemaže: ani „přepsat" neodstraní záznam, který v záloze
 *     není. Mazání je samostatné rozhodnutí (DELETE /api/zakazky), ne
 *     vedlejší účinek obnovy.
 *  5) Cizí nebo poškozený soubor se neobnovuje: musí nést razítko pořízení
 *     a aspoň jednu známou část.
 *
 * BEZPEČNOSTNÍ AUDIT 9. 9. 2026 (B27, B28, B30, B31, B32) přidal:
 *  – Účty a podpisy jdou JEN ze serverového otisku (B27, volba a): stažená
 *    záloha hesla nenese a soubor je to jediné, co si může kdokoli upravit
 *    v editoru. Vedlejší správce si do něj do 9. 9. mohl vložit vlastní
 *    scrypt otisk pro hlavní účet a převzít ho. Ani z otisku nesmí hlavní
 *    účet (ADMIN_EMAIL) a jeho podpis zapsat nikdo jiný než on sám; role
 *    jen z výčtu ROLE, e-mail v platném tvaru, podpis přes podpisZkontroluj.
 *  – Zámek „obnova běží" (B28): dokud existuje živý token rozpracované
 *    obnovy, druhý začátek i jednorázová obnova dostanou 409 s tím, kdo
 *    a kdy ji zahájil. Vypršelé tokeny se při té příležitosti uklidí.
 *    Otisk před obnovou má navíc klíč s časem, takže ani opakování po
 *    selhané dávce nepřepíše cestu zpátky.
 *  – Smazané účty se neoživí (B30): náhrobek `null` vypadal jako „nový
 *    záznam"; teď se čte kniha smazaných (SMAZANI_ULOZISTE). Stav účtu
 *    (aktivní / archiv) drží server — obnova neodarchivuje ani nezapne.
 *  – `hesloVerze` nikdy neklesne (B31): zapisuje se max(server, záloha),
 *    jinak by obnova oživila relace odvolané změnou hesla.
 *  – Zakázky ze zálohy procházejí uloIdProblemy jako při ukládání (B32).
 *
 * NA CO SE ZAPOMÍNÁ:
 *  – Rejstřík zakázek se po zápisu poskládá ze SKUTEČNÉHO obsahu úložiště,
 *    ne ze zálohy — jinak by v seznamu zůstal sirotek po zakázce, kterou
 *    obnova kvůli zámku přeskočila.
 *  – Kolize klíčů: otisk před obnovou má vlastní slot (klicPredObnovou),
 *    takže obnova z dnešního otisku nepřepíše svůj zdroj.
 *  – Záloha z jiného webu (schaftscalc → engscalc) se neodmítá, ale náhled
 *    na to upozorní: firemní údaje a účty toho druhého webu nemusí být to,
 *    co tu člověk chce. */
import { randomBytes } from 'node:crypto';
import { uloziste, vyzadujRoli, json, ADMIN_EMAIL, ROLE, hostitel, emailPlatny,
         podpisZkontroluj, hesloVerzeUctu, SMAZANI_ULOZISTE } from '../lib/sdilene.mjs';
import { jadro, jadroChyba } from '../lib/jadro.mjs';
import { porizOtisk, klicPredObnovou, OTISK_KLIC } from '../lib/zalohovani.mjs';

export const OBNOVA_CASTI = ['program', 'firma', 'zobrazeni', 'zakazky', 'uzivatele',
                             'sablony', 'zakaznici', 'podpisy'];
export const OBNOVA_REZIMY = ['doplnit', 'prepsat'];
export const OBNOVA_POTVRZENI = 'OBNOVIT';
export const OBNOVA_TOKEN_PLATNOST_MS = 60 * 60 * 1000;
const TOKEN_TVAR = /^[0-9a-f]{32}$/;
const KLIC_MAX = 200;
const TOKEN_PREDPONA = 'obnova-';
const tokenKlic = (id) => TOKEN_PREDPONA + id;
const maVlastni = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

const stejne = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const bilance = () => ({ nove: 0, prepsane: 0, bezeZmeny: 0, preskocene: 0, duvody: [] });
const preskoc = (b, klic, duvod) => { b.preskocene++; b.duvody.push({ klic: String(klic), duvod }); };

/* Záloha vypadá jako záloha kalkulátoru: razítko pořízení + aspoň jedna
 * známá část (klíč přítomný, byť s null — i „ceník nebyl" je informace). */
function vypadaJakoZaloha(z) {
  return !!z && typeof z === 'object' && !Array.isArray(z)
    && typeof z.porizena === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(z.porizena)
    && OBNOVA_CASTI.some(c => maVlastni(z, c));
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

/* Mapa klíč → záznam (sablony, zakaznici, podpisy; zakázky s předponou).
 * `overeni(klic, hodnota)` (B32) posoudí každý záznam ještě PŘED čtením
 * ze serveru — vrací důvod přeskočení, nebo prázdno. */
async function obnovMapu(b, s, mapa, rezim, zapisovat, predpona, kontrola, overeni) {
  if (!mapa || typeof mapa !== 'object' || Array.isArray(mapa)) {
    preskoc(b, '*', 'záloha tuto část nenese'); return;
  }
  for (const [k, v] of Object.entries(mapa)) {
    if (!k || k.length > KLIC_MAX) { preskoc(b, k, 'nepřijatelný klíč'); continue; }
    if (v == null || typeof v !== 'object') { preskoc(b, k, 'poškozený záznam (není objekt)'); continue; }
    if (overeni) {
      const d = overeni(k, v);
      if (d) { preskoc(b, k, d); continue; }
    }
    await zaznam(b, s, (predpona || '') + k, v, rezim, zapisovat, kontrola);
  }
}

/* Rejstřík ze skutečného obsahu úložiště — ne ze zálohy. */
async function prestavRejstrik(ULO, s, kdo) {
  const zaznamy = [];
  for (const k of await s.seznam('z/')) {
    const z = await s.cti(k);
    if (z && typeof z === 'object') zaznamy.push(ULO.uloRejstrikZaznam(z, { soubor: k.slice(2) }));
  }
  await s.zapis('_rejstrik', { schema: 1, zakazky: ULO.uloRejstrikSerad(zaznamy),
                               kdo, upraveno: new Date().toISOString() });
  return { zakazek: zaznamy.length, existujicich: zaznamy.length, prestaven: true };
}

const tokenVyprsel = (z) => !z || !z.zacatek || (Date.now() - Date.parse(z.zacatek) > OBNOVA_TOKEN_PLATNOST_MS);

/* Token rozpracované obnovy po dávkách. Vrací záznam, nebo odpověď s chybou. */
async function nactiToken(relace, id) {
  const klic = String(id || '');
  if (!TOKEN_TVAR.test(klic)) return { chyba: json({ ok: false, chyba: 'Neplatný token obnovy.' }, 400) };
  const s = await uloziste('zalohy');
  const z = await s.cti(tokenKlic(klic));
  if (!z || z.kdo !== relace.email)
    return { chyba: json({ ok: false, chyba: 'Obnova nebyla zahájena, nebo ji zahájil někdo jiný. Začněte znovu náhledem.' }, 403) };
  if (tokenVyprsel(z)) {
    await s.smaz(tokenKlic(klic));
    return { chyba: json({ ok: false, chyba: 'Zahájená obnova vypršela (hodina). Stav před ní je v otisku '
      + z.otiskPred + '; začněte znovu náhledem.' }, 410) };
  }
  return { token: z, s, klic: tokenKlic(klic) };
}

/* Zámek „obnova běží" (B28). Projde tokeny `obnova-*`: vypršelé smaže
 * (úklid opuštěných obnov — po výpadku prohlížeče uprostřed dávek by tu
 * jinak ležely napořád), živý vrátí. Druhý správce, nebo tentýž po selhané
 * dávce, tak nezačne novou obnovu přes rozpracovanou: obě by zapisovaly
 * do téže databáze a ta druhá by pořídila „otisk před obnovou" ze stavu,
 * který už je napůl obnovený. */
async function beziciObnova() {
  const s = await uloziste('zalohy');
  let ziva = null;
  for (const k of (await s.seznam(TOKEN_PREDPONA)) || []) {
    const z = await s.cti(k);
    if (tokenVyprsel(z)) { await s.smaz(k); continue; }
    if (!ziva || String(z.zacatek) < String(ziva.zacatek)) ziva = z;
  }
  return ziva;
}
async function zamekObnovy() {
  const z = await beziciObnova();
  return z ? obnovaBeziOdpoved(z) : null;
}
function obnovaBeziOdpoved(z) {
  const kdy = new Date(z.zacatek).toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' });
  return json({ ok: false,
    chyba: 'Obnovu už zahájil ' + z.kdo + ' (' + kdy + ', zapsáno ' + (z.davek || 0) + ' dávek) a ještě ji neuzavřel. '
      + 'Dokud běží, druhá obnova by přepsala cestu zpátky. Počkejte, až ji dokončí, nebo rozpracovanou obnovu zahoďte.',
    obnovaBezi: { obnovaId: z.id, kdo: z.kdo, zacatek: z.zacatek, otiskPred: z.otiskPred,
                  davek: z.davek || 0, rezim: z.rezim } }, 409);
}

/* Stav účtu drží server (B30): obnova nikdy neodarchivuje ani nezapne
 * účet — to jsou rozhodnutí správce s vlastními pojistkami v uzivatele.mjs
 * (archivovaný účet se nezapíná, hlavní se nevypíná). Záloha do nich nemá
 * co mluvit; přebírá se jen zbytek záznamu. */
function stavUctuDrziServer(novy, stary) {
  if (stary.aktivni === undefined) delete novy.aktivni; else novy.aktivni = stary.aktivni;
  ['archiv', 'archivKdy', 'archivKdo'].forEach(k => {
    if (stary[k] === undefined) delete novy[k]; else novy[k] = stary[k];
  });
}

export default async (req) => {
  if (req.method !== 'POST') return json({ ok: false, chyba: 'Použijte POST.' }, 405);
  const { chyba, relace } = await vyzadujRoli(req, 'Administrátor');
  if (chyba) return chyba;
  let ULO;
  try { ({ ULO } = await jadro()); } catch (e) { return jadroChyba(e); }

  let t; try { t = await req.json(); } catch (e) { return json({ ok: false, chyba: 'Vstup není platný JSON.' }, 400); }
  if (!t || typeof t !== 'object') return json({ ok: false, chyba: 'Chybí tělo požadavku.' }, 400);

  const faze = String(t.faze || '');
  const nahled = t.nahled === true;
  const upozorneni = [];

  /* --- konec obnovy po dávkách: přestavět rejstřík, vrátit součet, zahodit token --- */
  if (faze === 'konec') {
    const tk = await nactiToken(relace, t.obnovaId);
    if (tk.chyba) return tk.chyba;
    const rejstrik = await prestavRejstrik(ULO, await uloziste('zakazky'), relace.email);
    await tk.s.smaz(tk.klic);
    upozorneni.push('Stav před obnovou leží v otisku ' + tk.token.otiskPred + '.');
    return json({ ok: true, faze: 'konec', rezim: tk.token.rezim, davek: tk.token.davek,
                  souhrn: tk.token.souhrn, rejstrik, otiskPred: tk.token.otiskPred, upozorneni });
  }

  /* --- zahození rozpracované obnovy (B28): kterýkoli administrátor ---
   * Kdo obnovu zahájil, může být pryč (zavřený prohlížeč, dovolená), a bez
   * tohohle by databáze zůstala hodinu zamčená. Co se stihlo zapsat,
   * zůstává zapsané — rejstřík se přestaví, aby odpovídal obsahu, a cesta
   * zpátky je v otisku, na který odpověď ukáže. */
  if (faze === 'zrusit') {
    const klic = String(t.obnovaId || '');
    if (!TOKEN_TVAR.test(klic)) return json({ ok: false, chyba: 'Neplatný token obnovy.' }, 400);
    const s = await uloziste('zalohy');
    const z = await s.cti(tokenKlic(klic));
    if (!z) return json({ ok: false, chyba: 'Rozpracovaná obnova s tímto tokenem není (už skončila, nebo vypršela).' }, 404);
    const rejstrik = await prestavRejstrik(ULO, await uloziste('zakazky'), relace.email);
    await s.smaz(tokenKlic(klic));
    return json({ ok: true, faze: 'zrusit', zahozena: { kdo: z.kdo, zacatek: z.zacatek, davek: z.davek || 0 },
                  otiskPred: z.otiskPred, rejstrik,
                  upozorneni: ['Rozpracovaná obnova (' + z.kdo + ') je zahozená. Co stihla zapsat, zůstává zapsané; '
                    + 'stav před ní leží v otisku ' + z.otiskPred + '.'] });
  }

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

  /* --- začátek obnovy po dávkách: potvrzení, zámek, otisk, token --- */
  if (faze === 'zacatek') {
    if (t.potvrzeni !== OBNOVA_POTVRZENI)
      return json({ ok: false, chyba: 'Obnova se provede jen s výslovným potvrzením po náhledu.' }, 428);
    const zamek = await zamekObnovy();
    if (zamek) return zamek;
    let otiskPred;
    try { otiskPred = (await porizOtisk('pred-obnovou', relace.email, klicPredObnovou())).den; }
    catch (e) {
      return json({ ok: false, chyba: 'Otisk současného stavu se nepovedl (' + (e && e.message ? e.message : e)
        + ') — obnova se NEPROVEDLA, nic se nezměnilo. Bez cesty zpátky se neobnovuje.' }, 500);
    }
    const id = randomBytes(16).toString('hex');
    await (await uloziste('zalohy')).zapis(tokenKlic(id), { id, kdo: relace.email, zacatek: new Date().toISOString(),
      rezim, otiskPred, davek: 0, souhrn: { nove: 0, prepsane: 0, bezeZmeny: 0, preskocene: 0 } });
    return json({ ok: true, faze: 'zacatek', obnovaId: id, otiskPred, upozorneni: [] });
  }
  if (faze) return json({ ok: false, chyba: 'Neznámá fáze obnovy.' }, 400);

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
  const tenhleWeb = hostitel(req);
  if (zdrojPopis.web && tenhleWeb && /\./.test(zdrojPopis.web) && zdrojPopis.web !== tenhleWeb)
    upozorneni.push('Záloha pochází z jiného webu (' + zdrojPopis.web + ') než ten, do kterého obnovujete ('
      + tenhleWeb + '). Firemní údaje a účty toho webu nemusí být to, co tu chcete — zvažte odškrtnutí částí.');

  /* --- dávka rozpracované obnovy, nebo jednorázová obnova --- */
  let otiskPred = null;
  let tk = null;
  if (!nahled && t.obnovaId !== undefined) {
    tk = await nactiToken(relace, t.obnovaId);
    if (tk.chyba) return tk.chyba;
    if (tk.token.rezim !== rezim)
      return json({ ok: false, chyba: 'Dávka má jiný režim než zahájená obnova (' + tk.token.rezim + ').' }, 400);
    otiskPred = tk.token.otiskPred;
  } else if (!nahled) {
    /* Pojistka 1: ostrá obnova jen s výslovným potvrzením (428 = chybí
     * předpoklad). Obrazovka posílá potvrzení až po náhledu a dialogu. */
    if (t.potvrzeni !== OBNOVA_POTVRZENI)
      return json({ ok: false, chyba: 'Obnova se provede jen s výslovným potvrzením po náhledu.' }, 428);
    /* B28: ani jednorázová obnova nesmí běžet přes rozpracovanou. */
    const zamek = await zamekObnovy();
    if (zamek) return zamek;
    /* Pojistka 2: otisk současného stavu DŘÍV, než se sáhne na první záznam.
     * Vlastní slot s časem, aby obnova nepřepsala svůj zdroj ani cestu zpátky. */
    try { otiskPred = (await porizOtisk('pred-obnovou', relace.email, klicPredObnovou())).den; }
    catch (e) {
      return json({ ok: false, chyba: 'Otisk současného stavu se nepovedl (' + (e && e.message ? e.message : e)
        + ') — obnova se NEPROVEDLA, nic se nezměnilo. Bez cesty zpátky se neobnovuje.' }, 500);
    }
  }

  const zapisovat = !nahled;
  const vysledek = {};
  const sProg = await uloziste('program');

  /* Jednozáznamové části v úložišti `program`. */
  const jednoduche = { program: 'db', firma: 'firma', zobrazeni: 'zobrazeni' };
  for (const cast of Object.keys(jednoduche)) {
    if (!casti.includes(cast) || !maVlastni(zaloha, cast)) continue;
    const b = bilance();
    const hodnota = zaloha[cast];
    if (hodnota == null || typeof hodnota !== 'object') preskoc(b, jednoduche[cast], 'záloha tuto část nenese');
    else if (cast === 'program' && ULO.uloKidProblemyProgramu(hodnota.platny && hodnota.platny.cenikProj,
                                                               hodnota.platny && hodnota.platny.katalog).length) {
      /* B26: platný ceník ze zálohy nese kid trvalé položky v nepovoleném
       * tvaru — stejná kontrola jako při zveřejnění (/api/program). */
      preskoc(b, 'db', 'platný ceník v záloze nese identifikátor trvalé položky v nepovoleném tvaru — neobnovuje se');
    }
    else await zaznam(b, sProg, jednoduche[cast], hodnota, rezim, zapisovat);
    /* Přeskočený ceník v režimu „doplnit" je nejčastější důvod dojmu, že
     * „obnova nenahrála všechno" (7. 9. 2026): důvod proto říká obě verze. */
    if (cast === 'program' && b.preskocene && b.duvody[0] && /doplnit/.test(b.duvody[0].duvod)) {
      const stary = await sProg.cti('db');
      const v = (x) => (x && x.platny && x.platny.verze != null) ? 'verze ' + x.platny.verze + (x.platny.platnoOd ? ' z ' + x.platny.platnoOd : '') : 'bez verze';
      b.duvody[0].duvod = 'ceník na serveru už je (' + v(stary) + '); záloha nese ' + v(hodnota)
        + ' — nahradí ho jen režim „přepsat" (doplnit nepřepisuje)';
    }
    vysledek[cast] = b;
  }

  /* Zakázky: pojistka 3 — stejná kontrola zámků jako při ukládání;
   * a tvar i jedinečnost id jako při ukládání (B32, 9. 9. 2026). */
  let rejstrik = null;
  if (casti.includes('zakazky') && maVlastni(zaloha, 'zakazky')) {
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
    const overeniId = (k, v) => {
      const p = ULO.uloIdProblemy(v);
      return p.length ? ULO.uloIdProblemyText(p) : '';
    };
    await obnovMapu(b, s, zaloha.zakazky, rezim, zapisovat, 'z/', kontrolaZamku, overeniId);
    vysledek.zakazky = b;
    /* V náhledu a v dávce se rejstřík nestaví — jen se spočítá, kolik zakázek
     * by v něm bylo (existující + nové). Dávky ho přestaví jednou na konci. */
    const existujicich = (await s.seznam('z/')).length;
    if (zapisovat && !tk) rejstrik = await prestavRejstrik(ULO, s, relace.email);
    else rejstrik = { zakazek: existujicich + (zapisovat ? 0 : b.nove), existujicich: zapisovat ? existujicich - b.nove : existujicich, prestaven: false };
  }

  /* Účty (B27 a, B30, B31): jen ze serverového otisku, se stejnými
   * pojistkami jako správa účtů, a nikdy neoživí smazaný ani neodarchivuje. */
  if (casti.includes('uzivatele') && maVlastni(zaloha, 'uzivatele')) {
    const b = bilance();
    const s = await uloziste('uzivatele');
    const seznam = Array.isArray(zaloha.uzivatele) ? zaloha.uzivatele : null;
    const uctyZeSouboru = zdrojPopis.typ === 'soubor';
    if (!seznam) preskoc(b, '*', 'záloha tuto část nenese');
    else if (uctyZeSouboru) {
      for (const u of seznam) preskoc(b, String((u && u.email) || '?').trim().toLowerCase() || '?',
        'ze souboru se účty neobnovují — stažená záloha otisky hesel nenese a soubor jde upravit v editoru; '
        + 'účty a podpisy se zapisují jen ze serverového otisku');
      if (seznam.length) upozorneni.push('Účty a podpisy se ze souboru neobnovují — obnovte je ze serverového otisku (zdroj „otisk na serveru").');
    } else {
      const kniha = await uloziste(SMAZANI_ULOZISTE);
      for (const u of seznam) {
        const email = String((u && u.email) || '').trim().toLowerCase();
        if (!email) { preskoc(b, '?', 'účet bez e-mailu'); continue; }
        if (!emailPlatny(email)) { preskoc(b, email, 'e-mail nemá platný tvar'); continue; }
        if (!(typeof u.heslo === 'string' && u.heslo.includes(':'))) {
          preskoc(b, email, 'bez otisku hesla — účty obnovte ze serverového otisku');
          continue;
        }
        if (!ROLE.includes(u.role)) { preskoc(b, email, 'role mimo výčet (' + String(u.role) + ') se nezapisuje'); continue; }
        if (email === ADMIN_EMAIL && relace.email !== ADMIN_EMAIL) { preskoc(b, email, 'hlavní administrátorský účet obnoví jen on sám'); continue; }
        const smazan = await kniha.cti(email);
        if (smazan && smazan.smazano) {
          preskoc(b, email, 'účet byl smazán ' + String(smazan.kdy || '').slice(0, 10) + ' (' + String(smazan.kdo || '') + ') — obnova ho neoživí; '
            + 'vědomé oživení je samostatný krok správce');
          continue;
        }
        const stary = await s.cti(email);
        const novy = { ...u, email };
        if (stary) {
          stavUctuDrziServer(novy, stary);            // B30
          const vz = Math.max(hesloVerzeUctu(stary), hesloVerzeUctu(u));
          if (vz > 0) novy.hesloVerze = vz;           // B31: verze hesla nikdy neklesne
          if (rezim === 'prepsat' && ((u.aktivni !== false) !== (stary.aktivni !== false) || !!u.archiv !== !!stary.archiv))
            b.duvody.push({ klic: email, duvod: 'stav účtu (aktivní / archiv) drží server — v tom beze změny' });
        }
        if (email === ADMIN_EMAIL) novy.aktivni = true;
        if (email === relace.email && stary && !stejne(stary, novy) && rezim === 'prepsat')
          upozorneni.push('Váš vlastní účet se vrátí na stav z otisku (' + zdrojPopis.porizena.slice(0, 10)
            + ') — po obnově se přihlaste znovu heslem, které platilo tehdy.');
        await zaznam(b, s, email, novy, rezim, zapisovat);
      }
    }
    vysledek.uzivatele = b;
  }

  /* Mapy: šablony, kartotéka zákazníků, podpisy (klíče přesně jako v úložišti). */
  const mapy = { sablony: 'sablony', zakaznici: 'zakaznici', podpisy: 'podpisy' };
  for (const cast of Object.keys(mapy)) {
    if (!casti.includes(cast) || !maVlastni(zaloha, cast)) continue;
    const b = bilance();
    let overeni = null;
    if (cast === 'podpisy') {
      const podpisyZeSouboru = zdrojPopis.typ === 'soubor';
      if (podpisyZeSouboru) {
        /* B27 (a): podpis je razítko pod nabídkou — ze souboru, který jde
         * upravit v editoru, se nezapisuje. */
        overeni = () => 'ze souboru se podpisy neobnovují — jen ze serverového otisku';
      } else {
        overeni = (k, v) => {
          if (k === ADMIN_EMAIL && relace.email !== ADMIN_EMAIL) return 'podpis hlavního administrátora mění jen on sám';
          const kk = podpisZkontroluj(v && v.obrazek);   // B32: stejná kontrola jako při nahrání
          if (!kk.ok) return kk.chyba;
          return '';
        };
      }
    }
    await obnovMapu(b, await uloziste(mapy[cast]), zaloha[cast], rezim, zapisovat, '', null, overeni);
    vysledek[cast] = b;
  }

  /* Dávka: přičíst k součtu zahájené obnovy. */
  if (tk) {
    const so = tk.token.souhrn;
    Object.values(vysledek).forEach(b => { so.nove += b.nove; so.prepsane += b.prepsane; so.bezeZmeny += b.bezeZmeny; so.preskocene += b.preskocene; });
    tk.token.davek++;
    await tk.s.zapis(tk.klic, tk.token);
  } else if (otiskPred) {
    upozorneni.push('Stav před obnovou leží v otisku ' + otiskPred + '.');
  }

  return json({ ok: true, nahled, rezim, zdroj: zdrojPopis, casti: vysledek, rejstrik, otiskPred,
                davka: tk ? tk.token.davek : undefined, upozorneni });
};
export const config = { path: '/api/obnova' };
