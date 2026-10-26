/* ============================================================
 * OTISK ONLINE DATABÁZE (4. 8. 2026)
 *
 * Proč vlastní knihovna: do 4. 8. uměla otisk jen plánovaná funkce
 * zaloha_nocni.mjs, která vyváží `export const config = { schedule: … }`
 * a ŽÁDNOU cestu. Ručně se tedy vyvolat nedala, nikde se nedalo zjistit,
 * jestli kdy proběhla, a v obrazovce to vypadalo, že „vynucené zálohování
 * nefunguje" – ono totiž nebylo co vynutit. Pořízení otisku proto bydlí
 * tady a používají ho dvě funkce: plánovaná (noční) a obyčejná cesta
 * /api/zaloha_vynuceno pro administrátora.
 *
 * Otisk leží v úložišti `zalohy`, klíč = datum (jeden noční za den).
 * Vynucený otisk (ruční, při přihlášení) má od 19. 10. 2026 vlastní slot
 * s časem — viz klicVynuceny (#151 N1). Uživatelé se ukládají CELÍ včetně otisků hesel: otisk
 * zůstává ve stejném Blobs jako ostrá data a nikdy neopouští server, takže
 * obnova nevyžaduje reset všech hesel. Ven (na Disk Google) míří jiná
 * záloha – functions/zaloha.mjs, ta otisky hesel nenese.
 * ============================================================ */
import { uloziste, SMAZANI_ULOZISTE, vyhradne } from './sdilene.mjs';
import { randomBytes } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import RZ from './retence_modul.cjs';

const DEN_MS = 86400000;
export function denDnes(kdy) {
  return new Date(kdy || Date.now()).toISOString().slice(0, 10);
}

/* ČTENÍ PO DÁVKÁCH (#151 N2, 19. 10. 2026). Do 19. 10. četl otisk každý
 * záznam zvlášť a postupně — stovky čtení po desítkách ms. Plánovaná funkce
 * má v Netlify limit 30 s; po jeho překročení skončí bez zápisu a výpadek
 * odhalí až hlídka (#152) po 48 hodinách. Čte se proto paralelně po
 * skupinách (ne všechno naráz — tisíc souběžných požadavků by Blobs
 * přiškrtil). Výsledek drží pořadí klíčů. */
export const DAVKA_CTENI = 20;
export async function ctiPoDavkach(s, klice) {
  const out = [];
  for (let i = 0; i < klice.length; i += DAVKA_CTENI)
    out.push(...await Promise.all(klice.slice(i, i + DAVKA_CTENI).map(k => s.cti(k))));
  return out;
}
async function ctiCele(s, prefix) {
  const klice = await s.seznam(prefix);
  const hodnoty = await ctiPoDavkach(s, klice);
  const o = {};
  klice.forEach((k, i) => { o[prefix ? k.slice(prefix.length) : k] = hodnoty[i]; });
  return o;
}

/* Doplňky zálohy (bezpečnostní audit 22. 8. 2026, nález B9).
 *
 * Do 22. 8. nesla záloha program, firmu, zakázky, účty a šablony — a NIC
 * z toho, co přibylo později: kartotéku zákazníků (#162, celé úložiště
 * `zakaznici`), skeny podpisů (`podpisy`, #145) ani matici zobrazení
 * (`program/zobrazeni`, #136). Komentáře u nich tvrdily opak. Po obnově by
 * zmizel seznam zákazníků, podpisy všech obchodníků a práva zobrazení.
 * Jedno místo pro obě zálohy (noční otisk i ruční stažení), aby se příště
 * nerozešly. */
export async function zalohaDoplnky() {
  const sProg = await uloziste('program');
  const [zobrazeni, popisy, slovnik, controlling] = await ctiPoDavkach(sProg, ['zobrazeni', 'popisy', 'slovnik', 'controlling']);
  /* Dodatkové texty položek (22. 9. 2026) leží ve stejném úložišti pod
   * vlastním klíčem. Bez tohohle řádku by je obnova ze zálohy tiše smazala —
   * přesně ta chyba, kvůli které vznikl nález B9 (`popisy` výše).
   * Zveřejněný slovník (#401, 12. 10. 2026) — totéž poučení jako B9 a B104:
   * co se ukládá, musí být v záloze, jinak ho obnova tiše smaže (`slovnik`).
   * Úplnost hlídá netlify/test_zaloha_uplnost.mjs (#151 N4). */
  const zakaznici = await ctiCele(await uloziste('zakaznici'));
  const podpisy = await ctiCele(await uloziste('podpisy'));
  /* KNIHA SMAZANÝCH ÚČTŮ (23. 9. 2026, nález B58). Kdo, kdy a koho smazal —
   * bez ní by po obnově z nulové databáze zmizela jediná stopa po smazání
   * a obnova by neměla podle čeho odmítnout oživení smazaného účtu. */
  const smazani = await ctiCele(await uloziste(SMAZANI_ULOZISTE));
  return { zobrazeni: zobrazeni || null,
           smazani: Object.keys(smazani).length ? smazani : null,
           popisy: popisy || null,
           slovnik: slovnik || null,
           /* Controlling (#447): číselník skupin a mapování — bez něj by obnova
            * vrátila controlling na výchozí rozvržení z kódu. */
           controlling: controlling || null,
           zakaznici: Object.keys(zakaznici).length ? zakaznici : null,
           podpisy: Object.keys(podpisy).length ? podpisy : null };
}

/* Klíč otisku před obnovou (7. 9. 2026). Otisk pořízený těsně před obnovou
 * databáze NESMÍ ležet pod dnešním datem: kdyby se obnovovalo z dnešního
 * otisku, přepsal by zdroj obnovy sám sebe stavem před obnovou a cesta
 * zpátky by zmizela.
 *
 * Od 9. 9. 2026 (bezpečnostní audit, B28) nese klíč i ČAS: `<den>T<hhmmss>
 * -pred-obnovou`. Do té doby byl jeden slot na den a druhá obnova téhož dne
 * — nebo opakování po selhané dávce, které obrazovka sama nabízí — přepsala
 * jedinou cestu zpátky stavem napůl obnovené databáze. Vlastní slot na
 * každou obnovu stojí místo v úložišti (obnova je vzácná, administrátorská
 * akce), ale nikdy nezničí to, kvůli čemu otisk vznikl. Starší klíče bez
 * času zůstávají platné (OTISK_KLIC), z přehledu nemizí. */
export const OTISK_KLIC = /^\d{4}-\d{2}-\d{2}(-pred-obnovou|T\d{6}-(pred-obnovou|rucne|auto))?$/;

/* Kolik otisků „před obnovou" se drží v přehledu (nález B52, 14. 9. 2026).
 * Vlastní limit, aby série pokusů o obnovu nevytlačila denní zálohy — viz
 * komentář v seznamOtisku(). Otisky se tím nemažou, jen se nezobrazují
 * všechny: smazat cestu zpátky smí jedině člověk. */
export const OTISKY_PRED_OBNOVOU_LIMIT = 10;
export function klicPredObnovou(kdy) {
  const d = new Date(kdy || Date.now()).toISOString();      // 2026-09-09T15:30:12.345Z
  return d.slice(0, 10) + 'T' + d.slice(11, 19).replace(/:/g, '') + '-pred-obnovou';
}

/* KLÍČ VYNUCENÉHO OTISKU (#151 N1, 19. 10. 2026). Do 19. 10. mířil ruční
 * „Zálohovat teď" i otisk při přihlášení správce pod dnešní datum — tedy
 * PŘES noční otisk z 2:00. Pokazila-li se data dopoledne a správce pak
 * zálohoval, přepsal poslední dobrý stav; a hlídka (#152) ten den noční
 * otisk neviděla, takže kdo zálohoval ručně denně, dostal falešné varování.
 * Klíč `YYYY-MM-DD` teď patří jen noční funkci; vynucený otisk má vlastní
 * slot s časem `<den>T<hhmmss>-rucne` (resp. `-auto` při přihlášení),
 * stejně jako otisk před obnovou. */
export function klicVynuceny(druh, kdy) {
  const d = new Date(kdy || Date.now()).toISOString();
  return d.slice(0, 10) + 'T' + d.slice(11, 19).replace(/:/g, '') + (druh === 'auto' ? '-auto' : '-rucne');
}
/* LIMIT VYNUCENÝCH OTISKŮ (K3-N4, rozhodnutí J. V. 20. 10. 2026): nejvýš
 * 1 za 10 minut a 20 za den (klouzavých 24 hodin) — ruční i při přihlášení
 * dohromady. Každý vynucený otisk je plná kopie databáze na 90 dní
 * (retence), smyčka z relace správce by jinak nafoukla Blobs. Noční otisk
 * a otisk „před obnovou" se nepočítají a limit je nezastaví (jdou jinou
 * cestou). Počítá se z klíčů otisků `…T<hhmmss>-rucne|-auto` v úložišti —
 * čas je v klíči, žádný další záznam, který by se mohl rozejít. Čistá
 * funkce: `klice` = seznam úložiště `zalohy`, `ted` v ms. Vrací
 * { ok: true } nebo { ok: false, dalsiMs, chyba } (čas, kdy to půjde). */
export const VYNUCENE_ODSTUP_MS = 10 * 60 * 1000;
export const VYNUCENE_ZA_DEN = 20;
/* K4-N5 (O9): rezervace vynuceného otisku `vynucene-rezervace/<slot>~<náhoda>`
 * se zapíše PŘED pořízením otisku (to trvá sekundy — čte celou databázi)
 * a počítá se do limitu stejně jako otisk; slot a jeho rezervace jsou jeden
 * otisk. Do O9 se klíč otisku objevil až na konci pořizování, takže souběžné
 * požadavky limit obešly. */
export const VYNUCENE_REZERVACE = 'vynucene-rezervace/';
export function vynuceneLimit(klice, ted) {
  const nyni = Number.isFinite(+ted) && ted ? +ted : Date.now();
  const sloty = new Set();
  for (const k of (klice || []).map(String)) {
    const m = /^(?:vynucene-rezervace\/)?(\d{4}-\d{2}-\d{2}T\d{6}-(?:rucne|auto))(~[0-9a-f]+)?$/.exec(k);
    if (m && (k.startsWith(VYNUCENE_REZERVACE) ? !!m[2] : !m[2])) sloty.add(m[1] + (m[2] || ''));
  }
  /* rezervace s doběhlým otiskem téhož slotu se nepočítá dvakrát */
  for (const s of [...sloty]) { const i = s.indexOf('~'); if (i > 0 && sloty.has(s.slice(0, i))) sloty.delete(s); }
  const casy = [...sloty]
    .map(k => { const m = /^(\d{4}-\d{2}-\d{2})T(\d{2})(\d{2})(\d{2})-/.exec(k);     // sloty už jsou jen vynucené
      return m ? Date.parse(m[1] + 'T' + m[2] + ':' + m[3] + ':' + m[4] + 'Z') : NaN; })
    .filter(t => Number.isFinite(t) && t <= nyni && nyni - t < DEN_MS)
    .sort((a, b) => a - b);
  let dalsi = 0;
  if (casy.length && nyni - casy[casy.length - 1] < VYNUCENE_ODSTUP_MS) dalsi = casy[casy.length - 1] + VYNUCENE_ODSTUP_MS;
  if (casy.length >= VYNUCENE_ZA_DEN) dalsi = Math.max(dalsi, casy[casy.length - VYNUCENE_ZA_DEN] + DEN_MS);
  if (!dalsi) return { ok: true };
  const kdy = new Date(dalsi);
  const hhmm = kdy.toLocaleTimeString('cs-CZ', { timeZone: 'Europe/Prague', hour: '2-digit', minute: '2-digit' });
  const den = kdy.toLocaleDateString('cs-CZ', { timeZone: 'Europe/Prague' });
  const dnesDen = new Date(nyni).toLocaleDateString('cs-CZ', { timeZone: 'Europe/Prague' });
  const proc = casy.length >= VYNUCENE_ZA_DEN && dalsi >= casy[casy.length - VYNUCENE_ZA_DEN] + DEN_MS
    ? 'za posledních 24 hodin už vzniklo ' + VYNUCENE_ZA_DEN + ' vynucených záloh (víc denně nejde)'
    : 'poslední vynucená záloha je mladší než 10 minut';
  return { ok: false, dalsiMs: dalsi,
    chyba: 'Zálohu teď pořídit nejde: ' + proc + '. Znovu to půjde ' + (den === dnesDen ? 'dnes' : den)
      + ' v ' + hhmm + '. Noční záloha běží dál sama.' };
}

/* VYNUCENÝ OTISK S REZERVACÍ (K4-N5, O9). V rámci jedné instance funkce
 * se kontrola a rezervace řadí za sebe (vyhradne); mezi instancemi chrání
 * druhá kontrola limitu po zápisu rezervace (bez té vlastní): kdo vidí cizí
 * rezervaci, svou smaže a odmítne — při souběhu dvou instancí se odmítnou
 * obě (fail-closed, správce to za chvíli zkusí znovu). Rezervace se po
 * otisku smaže; zbylé (pád funkce) se uklidí po 24 h a do limitu se počítají
 * jen 24 h. Vrací { limit } (odmítnuto) nebo výsledek porizOtisk. */
export async function porizVynuceny(druh, kdo, opt = {}) {
  const s = await uloziste('zalohy');
  const rez = await vyhradne('zalohy-vynucene', async () => {
    const nyni = Date.now();
    const klice = await s.seznam();
    const limit = vynuceneLimit(klice, nyni);
    if (!limit.ok) return { limit };
    for (const k of klice) {                    // úklid rezervací starších 24 h (best effort)
      const m = /^vynucene-rezervace\/(\d{4}-\d{2}-\d{2})T(\d{2})(\d{2})(\d{2})-/.exec(k);
      if (m && nyni - Date.parse(m[1] + 'T' + m[2] + ':' + m[3] + ':' + m[4] + 'Z') >= DEN_MS) {
        try { await s.smaz(k); } catch (e) { /* uklidí se příště */ }
      }
    }
    const klic = klicVynuceny(druh, nyni);
    const rezKlic = VYNUCENE_REZERVACE + klic + '~' + randomBytes(4).toString('hex');
    await s.zapis(rezKlic, { kdy: new Date(nyni).toISOString(), kdo: String(kdo || '') });
    const znovu = vynuceneLimit((await s.seznam()).filter(k => k !== rezKlic), nyni);
    if (!znovu.ok) {
      try { await s.smaz(rezKlic); } catch (e) { /* počítá se nejvýš 24 h */ }
      return { limit: znovu };
    }
    return { klic, rezKlic };
  });
  if (rez.limit) return rez;
  /* #522: otisk po krocích. Nedokončený drží rezervaci dál (počítá se do
   * limitu, dokud ho prohlížeč nedopořídí — vynucenyPokracuj); hotový nebo
   * spadlý ji smaže. */
  let v;
  try { v = await porizOtiskKrok(rez.klic, 'vynuceno', kdo, { rozpocetMs: opt.rozpocetMs }); }
  catch (e) { try { await s.smaz(rez.rezKlic); } catch (e2) { /* počítá se nejvýš 24 h */ } throw e; }
  if (v.hotovo) { try { await s.smaz(rez.rezKlic); } catch (e) { /* otisk platí, rezervace dožije 24 h */ } }
  return v;
}

/* POKRAČOVÁNÍ VYNUCENÉHO OTISKU (#522). Prohlížeč volá, dokud nepřijde
 * `hotovo`. Jen klíč vynuceného slotu a jen existující rozpracovaný otisk
 * se zdrojem „vynuceno" — cestou se nedá založit nový otisk mimo limit. */
export const VYNUCENY_KLIC = /^\d{4}-\d{2}-\d{2}T\d{6}-(rucne|auto)$/;
export async function vynucenyPokracuj(klic, opt = {}) {
  if (!VYNUCENY_KLIC.test(String(klic || ''))) return { chyba: 'Neplatný klíč rozpracované zálohy.' };
  const s = await uloziste('zalohy');
  const st = await s.cti(OTISK_ROZPRACOVANY + klic);
  if (!st || st.zdroj !== 'vynuceno') {
    if (await s.cti(klic)) return porizOtiskKrok(klic, 'vynuceno', '', { jenPokracovat: true });   // už hotový
    return { chyba: 'Rozpracovaná záloha ' + klic + ' není (dokončila se jinde, nebo vypršela). Pořiďte ji znovu.' };
  }
  const v = await porizOtiskKrok(klic, 'vynuceno', st.kdo, { rozpocetMs: opt.rozpocetMs, jenPokracovat: true });
  if (v.hotovo) {
    for (const k of await s.seznam(VYNUCENE_REZERVACE + klic + '~')) { try { await s.smaz(k); } catch (e) { /* dožije 24 h */ } }
  }
  return v;
}

/* Kolik vynucených otisků se drží v přehledu — vlastní limit jako u otisků
 * před obnovou (B52), aby deset kliknutí nevytlačilo noční zálohy a hlídka
 * (#152) mezi nimi pořád našla poslední noční. */
export const OTISKY_VYNUCENE_LIMIT = 10;
/* Souhrn otisku (#151 N3) leží vedle něj pod `souhrn/<klíč>`. */
export const souhrnKlic = (klic) => 'souhrn/' + klic;

/* ============================================================
 * OTISK PO ČÁSTECH S NAVAZOVÁNÍM (#522 Z1, 26. 10. 2026)
 *
 * Co se stalo: ostrý engscalc (792 zakázek) neměl ani jednu zálohu. Do
 * v26.10.8 četl otisk CELOU databázi do paměti a zapsal ji jedním blobem
 * (u engscalc desítky MB). Čas i paměť rostly s databází: vynucený otisk
 * („Zálohovat teď", automatika po přihlášení) běží v synchronní funkci
 * s limitem 10 s, noční v plánované s limitem 30 s — po překročení Netlify
 * funkci ukončí a zápis, který byl až na konci, se nestane. Měření na
 * syntetické databázi (800 zakázek, 64 MB): 3,3 s čistého CPU, s latencí
 * Blobs 12–22 s. Nikde se přitom neukázalo proč — jen „zatím žádná".
 *
 * Teď: otisk se skládá z ČÁSTÍ `casti/<klíč>/<nnnnn>` (každá nejvýš
 * OTISK_CAST_MAX_B, jedna i víc sekcí) a pořizuje se po KROCÍCH. Krok čte
 * a zapisuje, dokud nevyčerpá časový rozpočet, a stav uloží do
 * `rozpracovany/<klíč>` (plán klíčů, pozice, počty) — po každé zapsané
 * části, takže ani tvrdé ukončení funkce nezahodí víc než jednu část.
 * Další krok (další běh noční funkce, další požadavek prohlížeče) naváže.
 * MANIFEST se zapíše pod klíč otisku AŽ NAKONEC: existence klíče dál
 * znamená hotový otisk, takže přehled, hlídka, retence i kopie na Disk
 * pracují beze změny. Starý jednolitý otisk čte ctiOtisk stejně jako nový.
 *
 * Mez: otisk pořizovaný na víc kroků není okamžitý snímek — zakázka
 * založená mezi kroky v něm chybí, smazaná se objeví jako null (stejně jako
 * dřív během sekund čtení). V noci a při ručním dokončení během minuty to
 * nevadí; obnova stejně zapisuje jen to, co otisk nese.
 * ============================================================ */
export const OTISK_FORMAT = 'kng-otisk-casti-1';
/* Strop části: pod limitem odpovědi funkce (~6 MB), aby šla část vydat
 * ke stažení i poslat do obnovy jedním požadavkem. */
export const OTISK_CAST_MAX_B = 4 * 1024 * 1024;
export const OTISK_ROZPRACOVANY = 'rozpracovany/';
export const OTISK_CASTI = 'casti/';
export const castKlic = (klic, i) => OTISK_CASTI + klic + '/' + String(i).padStart(5, '0');
/* Poslední pokus o otisk (hotovo / rozpracováno / chyba) — pro obrazovku
 * a log, aby výpadek nebyl tichý. Jen souhrnná pole, žádná data. */
export const OTISK_STAV_KLIC = 'otisk-stav';
/* Časové rozpočty kroku: synchronní funkce má limit 10 s (požadavek nese
 * i přihlášení a čtení stavu), plánovaná 30 s. Objekt, ne konstanty —
 * testy je zkracují. Synchronní 5 s: krok překročí rozpočet nejvýš o jednu
 * dávku čtení a zápis jedné části (≤ 4 MB). */
export const OTISK_ROZPOCET = { synchronniMs: 5000, nocniMs: 20000 };
/* Zámek kroku: dva prohlížeče (nebo dva běhy) nad týmž rozpracovaným
 * otiskem by zapisovaly tytéž části. Krok si stav „zamkne" na dobu svého
 * rozpočtu; kdo přijde mezitím, dostane `bezi: true` a zkusí to za chvíli. */
const OTISK_ZAMEK_NAVIC_MS = 20000;
/* KOMPRESE ČÁSTÍ (#523 Z2, 26. 10. 2026). Měření (nastroje/
 * mereni_komprese_otisku.mjs, smyšlená data v tvaru aplikace): text zakázek
 * gzip zmenší o ~99 %, base64 příloh o ~25 %, směs blízká engscalc
 * (~123 MB) o 32–41 % — nad prahem 30 %, který J. V. určil. Nová část se
 * proto ukládá jako gzip JSON (binární blob; base64 by úsporu u příloh
 * snědl) a manifest nese `komprese: 'gzip'`. Čtení umí obojí: otisk bez
 * pole `komprese` (Z1, v26.10.8) má části jako JSON. Úložiště bez binárního
 * zápisu (starší náhrady v testech) dostane části jako JSON. Čas: ~100 ms
 * CPU na 4MB část, rozbalení ~20 ms — v rozpočtu kroku. */
export const OTISK_KOMPRESE = 'gzip';
async function zapisCast(s, klic, i, cast, komprese) {
  const text = JSON.stringify(cast);
  if (komprese === OTISK_KOMPRESE) {
    const gz = gzipSync(Buffer.from(text, 'utf8'));
    await s.zapisBin(castKlic(klic, i), gz);
    return { velikostB: Buffer.byteLength(text), ulozenoB: gz.length };
  }
  await s.zapis(castKlic(klic, i), cast);
  return { velikostB: Buffer.byteLength(text), ulozenoB: Buffer.byteLength(text) };
}
/* Část podle manifestu `m`: null, když chybí. Neznámá komprese = výjimka
 * (radši žádná obnova než tichý nesmysl). */
async function ctiCast(s, klic, i, m) {
  if (!m.komprese) return await s.cti(castKlic(klic, i));
  if (m.komprese !== OTISK_KOMPRESE || typeof s.ctiBin !== 'function')
    throw new Error('otisk ' + klic + ' má části v neznámém formátu (' + String(m.komprese) + ')');
  const b = await s.ctiBin(castKlic(klic, i));
  return b == null ? null : JSON.parse(gunzipSync(b).toString('utf8'));
}

/* SEKCE OTISKU — jediné místo, odkud pořizování čte. Jednozáznamové (klic)
 * a mapy (celé úložiště, případně s předponou). Úplnost hlídá
 * netlify/test_zalohy.mjs (N4): nové úložiště nebo klíč patří sem. */
export const OTISK_SEKCE = [
  { nazev: 'program', ul: 'program', klic: 'db' },
  { nazev: 'firma', ul: 'program', klic: 'firma' },          // firma od 4. 8. 2026 online (functions/firma.mjs)
  { nazev: 'rejstrik', ul: 'zakazky', klic: '_rejstrik' },
  { nazev: 'zobrazeni', ul: 'program', klic: 'zobrazeni' },  // B9
  { nazev: 'popisy', ul: 'program', klic: 'popisy' },        // dodatkové texty (22. 9. 2026)
  { nazev: 'slovnik', ul: 'program', klic: 'slovnik' },      // zveřejněný slovník (#401)
  { nazev: 'controlling', ul: 'program', klic: 'controlling' }, // #447
  { nazev: 'zakazky', ul: 'zakazky', prefix: 'z/' },
  { nazev: 'uzivatele', ul: 'uzivatele', pole: true },       // celé účty včetně otisků hesel; náhrobky (null) se vynechají
  { nazev: 'sablony', ul: 'sablony' },                       // #139, celé úložiště včetně souborů
  { nazev: 'zakaznici', ul: 'zakaznici' },                   // B9
  { nazev: 'podpisy', ul: 'podpisy' },                       // B9
  { nazev: 'smazani', ul: SMAZANI_ULOZISTE },                // kniha smazaných účtů (B58)
];
const SEKCE_PODLE = Object.fromEntries(OTISK_SEKCE.map(x => [x.nazev, x]));
export const jeOtiskPoCastech = (o) => !!o && typeof o === 'object' && o.format === OTISK_FORMAT;

/* Výchozí tvar otisku (stejný jako u jednolitého): jednozáznamové null,
 * zakázky {}, účty [], ostatní mapy null, když jsou prázdné. */
function otiskZaklad(m) {
  const o = { porizena: String(m.porizena || ''), zdroj: String(m.zdroj || ''), kdo: String(m.kdo || '') };
  for (const x of OTISK_SEKCE) o[x.nazev] = x.klic ? null : {};
  return o;
}
function otiskSloz(o, cast) {
  for (const [n, v] of Object.entries(cast || {})) {
    const x = SEKCE_PODLE[n];
    if (!x) continue;
    if (x.klic) o[n] = v;
    else if (v && typeof v === 'object') Object.assign(o[n], v);
  }
}
function otiskDokonci(o) {
  for (const x of OTISK_SEKCE) {
    if (x.klic) continue;
    if (x.pole) o[x.nazev] = Object.values(o[x.nazev] || {}).filter(Boolean);
    else if (x.nazev !== 'zakazky' && !Object.keys(o[x.nazev]).length) o[x.nazev] = null;
  }
  return o;
}

/* Přečte otisk celý: nový (manifest + části) i starý jednolitý. Chybějící
 * část = otisk je poškozený → výjimka s číslem části (obnova z napůl
 * přečteného otisku by tiše vynechala data). */
export async function ctiOtisk(s, klic) {
  const m = await s.cti(klic);
  if (!jeOtiskPoCastech(m)) return m;
  const o = otiskZaklad(m);
  const klice = Array.from({ length: m.casti }, (_, i) => castKlic(klic, i));
  for (let i = 0; i < klice.length; i += 4) {
    const casti = await Promise.all(klice.slice(i, i + 4).map((k, j) => ctiCast(s, klic, i + j, m)));
    casti.forEach((c, j) => {
      if (!c) throw new Error('otisk ' + klic + ' je neúplný: chybí část ' + (i + j + 1) + ' z ' + m.casti);
      otiskSloz(o, c);
    });
  }
  return otiskDokonci(o);
}
/* Jedna část otisku v tvaru otisku (razítko + sekce, které nese) — pro
 * obnovu po částech a kopii na Disk po stránkách. Účty jako pole. Starý
 * jednolitý otisk má jedinou „část" 0 = celý otisk. */
export async function ctiOtiskCast(s, klic, i) {
  const m = await s.cti(klic);
  if (!m) return null;
  if (!jeOtiskPoCastech(m)) return i === 0 ? m : null;
  if (!Number.isInteger(i) || i < 0 || i >= m.casti) return null;
  const c = await ctiCast(s, klic, i, m);
  if (!c) throw new Error('otisk ' + klic + ' je neúplný: chybí část ' + (i + 1) + ' z ' + m.casti);
  const o = { porizena: String(m.porizena || ''), zdroj: String(m.zdroj || ''), kdo: String(m.kdo || '') };
  for (const [n, v] of Object.entries(c)) {
    const x = SEKCE_PODLE[n];
    if (!x) continue;
    o[n] = x.pole ? Object.values(v || {}).filter(Boolean) : v;
  }
  if (o.smazani !== undefined && o.uzivatele === undefined) o.uzivatele = [];   // kniha se obnovuje v bloku účtů
  return o;
}

/* VÝŘEZ ČÁSTI PRO OBNOVU (#522). Obnova zapisuje záznam po záznamu (čte
 * stávající, kontroluje, zapisuje) — celá část (stovky zakázek) by limit
 * požadavku nestihla, stejně jako by ho nestihl celý soubor; ten klient
 * posílá po 15 záznamech (OBNOVA_DAVKA_MAX_ZAZNAMU). Výřez bere záznamy
 * [od, od + kolik) v pevném pořadí (sekce podle OTISK_SEKCE, v mapě pořadí
 * klíčů) a vrací i `celkem`, aby klient věděl, kdy je část celá. Kniha
 * smazaných se obnovuje v bloku účtů — výřez s knihou bez účtů dostane
 * prázdný seznam účtů, aby se kniha nevynechala. */
export function otiskVyrez(o, od, kolik) {
  const out = { porizena: o.porizena, zdroj: o.zdroj, kdo: o.kdo };
  const zac = Math.max(0, od | 0), kon = zac + Math.max(1, kolik | 0);
  let i = 0;
  const bere = () => { const b = i >= zac && i < kon; i++; return b; };
  for (const x of OTISK_SEKCE) {
    if (!Object.prototype.hasOwnProperty.call(o, x.nazev)) continue;
    const v = o[x.nazev];
    if (x.klic || v == null || typeof v !== 'object') { if (bere()) out[x.nazev] = v; continue; }
    if (Array.isArray(v)) { for (const u of v) if (bere()) (out[x.nazev] || (out[x.nazev] = [])).push(u); continue; }
    for (const [k, h] of Object.entries(v)) if (bere()) (out[x.nazev] || (out[x.nazev] = {}))[k] = h;
  }
  if (out.smazani !== undefined && out.uzivatele === undefined) out.uzivatele = [];
  return { otisk: out, celkem: i };
}

/* Počty šablon a podpisů do manifestu a souhrnu (#523) — rozpracovaný
 * otisk ze Z1 je nemá, pak se nezapíšou (pojistka je neporovná). */
const pocetSP = (st) => (Number.isInteger(st.pocetSablon) ? { pocetSablon: st.pocetSablon, pocetPodpisu: st.pocetPodpisu } : {});
/* Plán nového otisku: klíče všech map (seznam je levný, čtou se jen klíče). */
async function otiskPlan(klic, zdroj, kdo, sZal) {
  const ul = {};
  for (const x of OTISK_SEKCE) if (!ul[x.ul]) ul[x.ul] = await uloziste(x.ul);
  const plan = await Promise.all(OTISK_SEKCE.map(async x => ({ n: x.nazev,
    k: x.klic ? [x.klic] : (await ul[x.ul].seznam(x.prefix)).filter(k => !x.prefix || k.startsWith(x.prefix)).sort() })));
  const ted = new Date().toISOString();
  return { klic, zdroj: String(zdroj || 'nocni-otisk'), kdo: String(kdo || ''), porizena: ted, naposled: ted,
    plan, pos: { i: 0, j: 0 }, casti: 0, velikostB: 0, ulozenoB: 0, pocetUctu: 0, praceMs: 0, kroku: 0,
    komprese: typeof sZal.zapisBin === 'function' && typeof sZal.ctiBin === 'function' ? OTISK_KOMPRESE : '',   // #523
    pocetZakazek: (plan.find(p => p.n === 'zakazky') || { k: [] }).k.length,
    /* #523: pojistka retence hlídá i úbytek šablon a podpisů */
    pocetSablon: (plan.find(p => p.n === 'sablony') || { k: [] }).k.length,
    pocetPodpisu: (plan.find(p => p.n === 'podpisy') || { k: [] }).k.length };
}
const otiskPostup = (st) => {
  let celkem = 0, hotovo = 0;
  st.plan.forEach((p, i) => { celkem += p.k.length; if (i < st.pos.i) hotovo += p.k.length; else if (i === st.pos.i) hotovo += st.pos.j; });
  return { hotovo, celkem, casti: st.casti };
};
async function otiskStavZapis(sZal, zaznam) {
  try { await sZal.zapis(OTISK_STAV_KLIC, { kdy: new Date().toISOString(), ...zaznam }); } catch (e) { /* jen pro obrazovku */ }
}

/* JEDEN KROK POŘIZOVÁNÍ. `opt.rozpocetMs` = kolik smí krok číst a zapisovat
 * (bez něj doběhne celý — testy, malé databáze); `opt.jenPokracovat` =
 * nezakládat nový (pokračování z prohlížeče). Vrací { den, hotovo, postup,
 * … } — u hotového i počty, velikost a trvání jako dřív porizOtisk. */
export async function porizOtiskKrok(klic, zdroj, kdo, opt = {}) {
  const zacatek = Date.now();
  const rozpocet = opt.rozpocetMs > 0 ? opt.rozpocetMs : Infinity;
  const sZal = await uloziste('zalohy');
  const stavKlic = OTISK_ROZPRACOVANY + klic;
  let st = await sZal.cti(stavKlic);
  if (!st) {
    const hotovy = await sZal.cti(klic);
    if (opt.jenPokracovat) {
      /* pokračování hotového (dokončil ho souběžný požadavek) = hotovo */
      if (!hotovy) throw new Error('rozpracovaný otisk ' + klic + ' není (vypršel, nebo byl uklizen) — pořiďte zálohu znovu');
      const sh = (await sZal.cti(souhrnKlic(klic))) || {};
      return { den: klic, hotovo: true, pocetZakazek: +sh.pocetZakazek || +hotovy.pocetZakazek || 0,
        pocetUctu: +sh.pocetUctu || +hotovy.pocetUctu || 0, velikostB: +sh.velikostB || 0, trvaniMs: +sh.trvaniMs || 0 };
    }
    /* Nový otisk pod existujícím klíčem (dva otisky před obnovou v téže
     * vteřině, opakovaný noční běh v testu) se pořizuje znovu, jako dřív
     * porizOtisk. Starý manifest jde pryč HNED: jinak by po dobu pořizování
     * ukazoval na části, které se právě přepisují. */
    if (hotovy) { await sZal.smaz(klic); try { await sZal.smaz(souhrnKlic(klic)); } catch (e) { /* bez souhrnu */ } }
    st = await otiskPlan(klic, zdroj, kdo, sZal);
  } else if (st.beziDo && Date.parse(st.beziDo) > zacatek) {
    return { den: klic, hotovo: false, bezi: true, postup: otiskPostup(st) };
  }
  st.beziDo = new Date(zacatek + Math.min(rozpocet, 120000) + OTISK_ZAMEK_NAVIC_MS).toISOString();
  st.kroku = (st.kroku || 0) + 1;
  await sZal.zapis(stavKlic, st);
  const ul = {};
  const ulZ = async (n) => ul[n] || (ul[n] = await uloziste(n));
  let cast = {}, castB = 0;
  const uloz = async (pos) => {
    if (Object.keys(cast).length) {
      const v = await zapisCast(sZal, klic, st.casti, cast, st.komprese);
      st.casti++; st.velikostB += v.velikostB; st.ulozenoB = (st.ulozenoB || 0) + v.ulozenoB;
      cast = {}; castB = 0;
    }
    st.pos = pos; st.naposled = new Date().toISOString();
    await sZal.zapis(stavKlic, st);           // postup přežije i tvrdé ukončení funkce
  };
  try {
    const pos = { ...st.pos };
    while (pos.i < st.plan.length) {
      const p = st.plan[pos.i], x = SEKCE_PODLE[p.n];
      const davka = p.k.slice(pos.j, pos.j + DAVKA_CTENI);
      const hodnoty = davka.length ? await ctiPoDavkach(await ulZ(x.ul), davka) : [];
      for (let d = 0; d < davka.length; d++) {
        const v = hodnoty[d];
        const b = (v == null ? 4 : Buffer.byteLength(JSON.stringify(v))) + davka[d].length + 8;
        if (castB > 0 && castB + b > OTISK_CAST_MAX_B) await uloz({ i: pos.i, j: pos.j + d });
        if (x.klic) cast[p.n] = v == null ? null : v;
        else (cast[p.n] || (cast[p.n] = {}))[x.prefix ? davka[d].slice(x.prefix.length) : davka[d]] = v == null ? null : v;
        castB += b;
        if (x.pole && v) st.pocetUctu++;
      }
      pos.j += davka.length;
      if (pos.j >= p.k.length) { pos.i++; pos.j = 0; }
      if (pos.i < st.plan.length && Date.now() - zacatek > rozpocet) {
        await uloz({ ...pos });
        st.praceMs = (st.praceMs || 0) + (Date.now() - zacatek); st.beziDo = null;
        await sZal.zapis(stavKlic, st);
        const postup = otiskPostup(st);
        await otiskStavZapis(sZal, { klic, zdroj: st.zdroj, kdo: st.kdo, stav: 'rozpracovano', postup });
        return { den: klic, hotovo: false, postup };
      }
    }
    await uloz({ ...pos });
    const praceMs = (st.praceMs || 0) + (Date.now() - zacatek);
    const manifest = { format: OTISK_FORMAT, porizena: st.porizena, dokoncena: new Date().toISOString(),
      zdroj: st.zdroj, kdo: st.kdo, casti: st.casti, pocetZakazek: st.pocetZakazek, pocetUctu: st.pocetUctu,
      velikostB: st.velikostB, kroku: st.kroku, ...pocetSP(st),
      ...(st.komprese ? { komprese: st.komprese, ulozenoB: st.ulozenoB || 0 } : {}) };   // #523: formát částí
    await sZal.zapis(klic, manifest);         // AŽ TEĎ otisk existuje
    /* SOUHRN VEDLE OTISKU (#151 N3). Zapisuje se AŽ PO otisku: když se
     * nepovede, přehled si počty vezme z manifestu. */
    const souhrn = { den: klic, porizena: st.porizena, zdroj: st.zdroj, kdo: st.kdo,
      pocetZakazek: st.pocetZakazek, pocetUctu: st.pocetUctu, velikostB: st.velikostB, trvaniMs: praceMs,
      casti: st.casti, kroku: st.kroku, ...pocetSP(st), ...(st.komprese ? { komprese: st.komprese, ulozenoB: st.ulozenoB || 0 } : {}) };
    try { await sZal.zapis(souhrnKlic(klic), souhrn); } catch (e) { /* přehled má záložní cestu */ }
    try { await sZal.smaz(stavKlic); } catch (e) { /* uklidí uklidRozpracovane */ }
    await otiskStavZapis(sZal, { klic, zdroj: st.zdroj, kdo: st.kdo, stav: 'hotovo',
      postup: otiskPostup({ ...st, pos: { i: st.plan.length, j: 0 } }) });
    return { den: klic, hotovo: true, pocetZakazek: st.pocetZakazek, pocetUctu: st.pocetUctu,
      velikostB: st.velikostB, ulozenoB: st.ulozenoB || st.velikostB, trvaniMs: praceMs, casti: st.casti, kroku: st.kroku };
  } catch (e) {
    const chyba = String(e && e.message || e);
    try { st.beziDo = null; st.chyba = chyba; await sZal.zapis(stavKlic, st); } catch (e2) { /* stav zůstane zamčený do beziDo */ }
    await otiskStavZapis(sZal, { klic, zdroj: st.zdroj, kdo: st.kdo, stav: 'chyba', chyba, postup: otiskPostup(st) });
    throw e;
  }
}

/* Celý otisk v jednom volání (testy, obnova bez dávek, malé databáze).
 * `klic` je nepovinný: bez něj otisk míří pod dnešní datum (noční záloha),
 * s ním pod zadaný slot (vynucený otisk — klicVynuceny, otisk před obnovou
 * — klicPredObnovou). */
export async function porizOtisk(zdroj, kdo, klic) {
  const v = await porizOtiskKrok(klic || denDnes(), zdroj, kdo);
  return { den: v.den, pocetZakazek: v.pocetZakazek, pocetUctu: v.pocetUctu, velikostB: v.velikostB, trvaniMs: v.trvaniMs };
}

/* Rozpracované otisky (pro přehled) — jen souhrnná pole. */
export async function seznamRozpracovanych() {
  const s = await uloziste('zalohy');
  const klice = (await s.seznam(OTISK_ROZPRACOVANY)).sort().reverse().slice(0, 5);
  const out = [];
  for (const k of klice) {
    const st = await s.cti(k);
    if (!st || !st.plan) continue;
    out.push({ den: String(st.klic || k.slice(OTISK_ROZPRACOVANY.length)), zdroj: String(st.zdroj || ''), kdo: String(st.kdo || ''),
      porizena: String(st.porizena || ''), naposled: String(st.naposled || ''), chyba: st.chyba ? String(st.chyba) : '',
      postup: otiskPostup(st) });
  }
  return out;
}

/* ÚKLID (noční funkce): rozpracovaný otisk bez pohybu 24 h se zahodí i s
 * částmi (prohlížeč zavřený uprostřed); části bez manifestu i bez stavu
 * (spadlé mazání retence) se smažou. Hotové otisky se nedotkne. */
export async function uklidRozpracovane(ted) {
  const s = await uloziste('zalohy');
  const nyni = Number.isFinite(+ted) && ted ? +ted : Date.now();
  const klice = await s.seznam();
  const mnozina = new Set(klice);
  const smazano = [];
  for (const k of klice.filter(k => k.startsWith(OTISK_ROZPRACOVANY))) {
    const st = await s.cti(k);
    const t = Date.parse((st && (st.naposled || st.porizena)) || '');
    if (Number.isFinite(t) && nyni - t < DEN_MS) continue;
    try { await s.smaz(k); mnozina.delete(k); smazano.push(k); } catch (e) { /* příště */ }
  }
  const manifesty = {};
  for (const k of klice.filter(k => k.startsWith(OTISK_CASTI))) {
    const otisk = k.slice(OTISK_CASTI.length, k.lastIndexOf('/'));
    if (mnozina.has(OTISK_ROZPRACOVANY + otisk)) continue;
    if (mnozina.has(otisk)) {
      /* části za koncem hotového otisku (zbytek přepsaného otisku) */
      if (!(otisk in manifesty)) manifesty[otisk] = await s.cti(otisk);
      const m = manifesty[otisk];
      if (!jeOtiskPoCastech(m) || parseInt(k.slice(k.lastIndexOf('/') + 1), 10) < m.casti) continue;
    }
    try { await s.smaz(k); smazano.push(k); } catch (e) { /* příště */ }
  }
  return smazano;
}

/* Souhrn pro obrazovku – vědomě BEZ dat. Kdyby seznam vozil obsah otisků,
 * stačilo by otevřít vývojářskou konzoli a přečíst celou databázi jedním
 * požadavkem; tady jde jen o to, kdy naposledy záloha vznikla.
 * Řadí se od nejnovější, protože obrazovku zajímá poslední otisk. */
export async function seznamOtisku(kolik) {
  const s = await uloziste('zalohy');
  /* Otisky před obnovou (7. 9. 2026) patří do přehledu taky — jsou to cesty
   * zpátky, ze kterých se dá obnovovat. Řetězcové řazení je dá hned před
   * den, ke kterému patří. */
  const vsechny = (await s.seznam()).filter(k => OTISK_KLIC.test(k)).sort().reverse();
  /* DENNÍ A „PŘED OBNOVOU" MAJÍ VLASTNÍ LIMITY (nález B52, 14. 9. 2026).
   *
   * Každý pokus o obnovu pořídí plný otisk `…Thhmmss-pred-obnovou`. Ty jsou
   * v řetězcovém řazení vyšší než denní otisk téhož dne, takže deset pokusů
   * za odpoledne vytlačilo z přehledu čtrnácti nejvyšších klíčů úplně
   * všechny denní zálohy — a správce, který hledal včerejší stav, ho v seznamu
   * nenašel. Přitom tam ležel; jen nebyl vidět, což je horší než kdyby tam
   * nebyl vůbec.
   *
   * Seznamy se proto vedou odděleně: denní otisky mají celý limit, otisky
   * před obnovou svých posledních deset. Totéž od 19. 10. 2026 (#151 N1)
   * vynucené otisky s časem (`-rucne`, `-auto`). */
  const jePredObnovou = (k) => k.indexOf('-pred-obnovou') >= 0;
  const jeVynuceny = (k) => /T\d{6}-(rucne|auto)$/.test(k);
  const denni = vsechny.filter(k => !jePredObnovou(k) && !jeVynuceny(k));
  const predObnovou = vsechny.filter(jePredObnovou);
  const vynucene = vsechny.filter(jeVynuceny);
  const limit = Math.max(1, kolik || 14);
  const vybrane = denni.slice(0, limit)
    .concat(predObnovou.slice(0, OTISKY_PRED_OBNOVOU_LIMIT))
    .concat(vynucene.slice(0, OTISKY_VYNUCENE_LIMIT))
    .sort().reverse();
  /* Souhrny (#151 N3) po dávkách; otisk bez souhrnu (pořízený před 19. 10.)
   * se dočte celý jako dřív. */
  const souhrny = await ctiPoDavkach(s, vybrane.map(souhrnKlic));
  const otisky = [];
  for (let i = 0; i < vybrane.length; i++) {
    const den = vybrane[i];
    const sh = souhrny[i];
    if (sh && sh.porizena) {
      otisky.push({ den, porizena: String(sh.porizena), zdroj: String(sh.zdroj || ''), kdo: String(sh.kdo || ''),
        pocetZakazek: +sh.pocetZakazek || 0, pocetUctu: +sh.pocetUctu || 0,
        ...(+sh.casti > 0 ? { casti: +sh.casti } : {}) });      // #522: počet částí pro obnovu po částech
      continue;
    }
    const o = await s.cti(den);
    if (!o) continue;
    if (jeOtiskPoCastech(o)) {                 // souhrn se nezapsal — počty nese manifest
      otisky.push({ den, porizena: String(o.porizena || ''), zdroj: String(o.zdroj || ''), kdo: String(o.kdo || ''),
        pocetZakazek: +o.pocetZakazek || 0, pocetUctu: +o.pocetUctu || 0, casti: +o.casti || 0 });
      continue;
    }
    otisky.push({
      den,
      porizena: String(o.porizena || ''),
      zdroj: String(o.zdroj || ''),
      kdo: String(o.kdo || ''),
      pocetZakazek: Object.keys(o.zakazky || {}).length,
      pocetUctu: (o.uzivatele || []).length,
    });
  }
  return otisky;
}

/* ============================================================
 * RETENCE OTISKŮ (#151 N5 19. 10. 2026; od #523 Z2 26. 10. 2026 nové
 * pravidlo J. V.)
 *
 * Do 19. 10. se nemazalo nic; pak (N5) 30 dní + první v měsíci 12 měsíců,
 * vynucené 90 dní a otisky před 20. 10. nikdy (RETENCE_OD). Ostrý engscalc
 * ale nese ~114 MB za den a automatické otisky přibývají při každém
 * přihlášení správce — rozhodnutí J. V. 26. 10. 2026:
 *   - noční (denní klíč) 14 dní, týdenní (neděle, jinak nejbližší starší
 *     v týdnu) 8 týdnů, měsíční (první v měsíci) 6 měsíců;
 *   - vynucené (`-rucne`, `-auto`) 7 dní;
 *   - otisky PŘED OBNOVOU se nemažou nikdy (cesta zpátky, maže jen člověk);
 *   - výjimka RETENCE_OD je ZRUŠENÁ: ze starých otisků (do 19. 10. 2026)
 *     zůstane jen první z každého měsíce, i ten po 6 měsících odejde;
 *   - nejnovější otisk se nesmaže nikdy, ať je jakkoli starý;
 *   - klíče mimo OTISK_KLIC (souhrny, části, tokeny, záznam kopie) výběr
 *     nevidí — souhrn a části odcházejí jen se svým otiskem.
 * Pravidlo samo (dny, týdny, měsíce) žije v src/retence_zaloh.js — totéž
 * používá prohlížeč pro kopie na Disku. Pojistky kolem (nový otisk musí
 * existovat, pokles dat, kopie na Disk) jsou v retenceProved.
 * Čistá funkce: `dnes` je 'YYYY-MM-DD' (UTC), vrací klíče ke smazání.
 * ============================================================ */
export const RETENCE_DENNI_DNU = RZ.RETENCE_ZALOH_BLOBS.dnu;
export const RETENCE_TYDNU = RZ.RETENCE_ZALOH_BLOBS.tydnu;
export const RETENCE_MESICU = RZ.RETENCE_ZALOH_BLOBS.mesicu;
export const RETENCE_VYNUCENE_DNU = RZ.RETENCE_ZALOH_BLOBS.vynuceneDnu;
export const RETENCE_STARE_PRED = RZ.RETENCE_ZALOH_STARE_PRED;
export function retenceVyber(klice, dnes) {
  const dnesMs = RZ.retenceZalohDenMs(String(dnes || ''));
  if (!Number.isFinite(dnesMs)) return [];
  const otisky = [...new Set((klice || []).map(String))]
    .filter(k => OTISK_KLIC.test(k) && Number.isFinite(RZ.retenceZalohDenMs(k.slice(0, 10))));
  if (!otisky.length) return [];
  const nejnovejsi = otisky.slice().sort().pop();
  const denni = otisky.filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
  const vynucene = otisky.filter(k => /T\d{6}-(rucne|auto)$/.test(k));
  const drz = RZ.retenceZalohDrz(denni, dnes, RZ.RETENCE_ZALOH_BLOBS, { stareJenMesicni: RETENCE_STARE_PRED });
  if (!drz) return [];
  const vek = (k) => Math.round((dnesMs - RZ.retenceZalohDenMs(k.slice(0, 10))) / DEN_MS);
  const smazat = [];
  for (const k of denni)
    if (!drz.has(k) && k !== nejnovejsi) smazat.push(k);
  for (const k of vynucene)
    if (vek(k) >= RETENCE_VYNUCENE_DNU && k !== nejnovejsi) smazat.push(k);
  return smazat.sort();
}

/* Pojistka retence (K3-N13; od #523 Z2 přísnější a bez časového uvolnění).
 * Prahy žijí v src/retence_zaloh.js (RETENCE_ZALOH_POJISTKA): velikost
 * < 90 %, zakázek / účtů < 95 %, šablon / podpisů méně. Klíč záznamu pro
 * hlídku. */
export const RETENCE_POKLES_PRAH = RZ.RETENCE_ZALOH_POJISTKA.pocty;
export const RETENCE_POKLES_VELIKOST = RZ.RETENCE_ZALOH_POJISTKA.velikost;
export const RETENCE_VAROVANI_KLIC = 'retence-varovani';
/* DRŽENÍ RETENCE DO POTVRZENÍ (K4-N13, dávka O11, 21. 10. 2026; #523 Z2).
 * Po úbytku dat retence stojí, dokud správce varování v administraci
 * nepotvrdí (POST /api/zaloha_vynuceno { akce: 'retence-potvrdit' }, heslo
 * správce). Do #523 se retence sama uvolnila po 30 dnech; pokyn J. V.
 * 26. 10. 2026 („nenadálé zmenšení musí být oznámené a schválené, jinak se
 * staré zálohy nesmí mazat") — výchozí volba Z2: ŽÁDNÉ automatické uvolnění,
 * ani u velikosti, ani u počtů. Úložiště mezitím roste, ale nic se neztratí
 * a hlídka svítí, dokud to správce nevyřeší.
 * Čistá funkce: vrací null (retence smí běžet), nebo { dnu }. */
export function retenceDrzena(varovani, ted) {
  if (!varovani || typeof varovani !== 'object' || varovani.potvrzeno) return null;
  const t = Date.parse(typeof varovani.kdy === 'string' ? varovani.kdy : '');
  if (!Number.isFinite(t)) return null;
  const nyni = Number.isFinite(+ted) && ted ? +ted : Date.now();
  return { dnu: Math.max(0, Math.floor((nyni - t) / DEN_MS)) };
}
/* Údaje otisku pro pojistku: počty zakázek a účtů, velikost dat
 * (nekomprimovaná) a počty šablon a podpisů (#523; starší otisky je nemají
 * — pak se neporovnávají). Ze souhrnu (#151 N3), z manifestu, u starého
 * jednolitého otisku z otisku samého (velikost se tam neporovnává — jiný
 * způsob měření). Vrací null, když otisk není. */
const cisloNeboNic = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : undefined);
const otiskUdaje = (z) => ({ zdroj: String(z.zdroj || ''), pocetZakazek: +z.pocetZakazek || 0, pocetUctu: +z.pocetUctu || 0,
  velikostB: cisloNeboNic(z.velikostB), pocetSablon: cisloNeboNic(z.pocetSablon), pocetPodpisu: cisloNeboNic(z.pocetPodpisu) });
async function otiskPocty(s, klic) {
  const sh = await s.cti(souhrnKlic(klic));
  if (sh && sh.porizena) return otiskUdaje(sh);
  const o = await s.cti(klic);
  if (!o) return null;
  if (jeOtiskPoCastech(o)) return otiskUdaje(o);
  return { zdroj: String(o.zdroj || ''), pocetZakazek: Object.keys(o.zakazky || {}).length,
    pocetUctu: (Array.isArray(o.uzivatele) ? o.uzivatele : []).filter(Boolean).length,
    pocetSablon: o.sablony && typeof o.sablony === 'object' ? Object.keys(o.sablony).length : 0,
    pocetPodpisu: o.podpisy && typeof o.podpisy === 'object' ? Object.keys(o.podpisy).length : 0 };
}
/* Čistá část: co ubylo (seznam textů) nebo null — src/retence_zaloh.js. */
export function retencePoklesPocty(pred, nove) { return RZ.retenceZalohPokles(pred, nove); }
/* Předchozí NOČNÍ otisk (denní klíč před novým, zdroj nocni-otisk; nejvýš
 * 7 dní zpátky jako posledniNocniOtisk) a porovnání. */
const POKLES_POLE = ['pocetZakazek', 'pocetUctu', 'velikostB', 'pocetSablon', 'pocetPodpisu'];
const vyber = (o) => Object.fromEntries(POKLES_POLE.filter(k => o[k] !== undefined).map(k => [k, o[k]]));
async function retencePokles(s, klice, novyKlic) {
  const nove = await otiskPocty(s, novyKlic);
  const predchozi = klice.filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k) && k < novyKlic).sort().reverse().slice(0, 7);
  for (const k of predchozi) {
    const pred = await otiskPocty(s, k);
    if (!pred || pred.zdroj !== 'nocni-otisk') continue;
    const co = retencePoklesPocty(pred, nove);
    if (!co) return null;
    return { den: novyKlic, predchozi: k, zdroj: 'nocni', pred: vyber(pred), nove: vyber(nove),
      text: 'noční otisk ' + novyKlic + ' má proti ' + k + ' méně dat (' + co.join(', ') + ')' };
  }
  return null;
}

/* Provedení retence — volá ji noční funkce AŽ PO úspěšném zápisu nového
 * otisku `novyKlic`. Pojistka navíc: když nový otisk v úložišti není
 * (zápis se nepovedl, nebo ho nejde přečíst), nesmaže se nic. Vrací
 * { smazano: [klíče], chyby: [..] }; chyba mazání jednoho klíče ostatní
 * nezastaví a otisk nikdy neohrozí. */
export async function retenceProved(novyKlic, dnes, ted, opt = {}) {
  const s = await uloziste('zalohy');
  const klice = await s.seznam();
  if (!novyKlic || !klice.includes(novyKlic) || !(await s.cti(souhrnKlic(novyKlic)) || await s.cti(novyKlic)))
    return { smazano: [], chyby: ['nový otisk ' + String(novyKlic) + ' v úložišti není — retence se neprovedla'] };
  /* POJISTKA KOPIE NA DISK (v19.10.8, výchozí volba koordinace 19. 10. 2026).
   * Retence je nevratná — první noc po nasazení by smazala všechny starší
   * otisky mimo pravidlo. Maže se proto jen tehdy, když existuje záznam
   * úspěšné kopie na Disk (N6) mladší než 7 dní; jinak se nesmaže nic a do
   * logu jde „retence čeká na první kopii na Disk". Platí trvale: když se
   * kopie na Disk přestanou dělat, retence se zastaví (úložiště poroste, ale
   * nic se neztratí). */
  /* POJISTKA PROTI TICHÉ ZTRÁTĚ DAT (K3-N13 20. 10. 2026, #523 Z2 26. 10.).
   * Nese-li nový noční otisk proti předchozímu nočnímu méně dat (velikost
   * < 90 %, zakázek / účtů < 95 %, šablon / podpisů méně —
   * src/retence_zaloh.js), retence se přeskočí, zaloguje se VAROVÁNÍ
   * a záznam `retence-varovani` ukáže hlídka v administraci. Retence pak
   * stojí, dokud správce úbytek nepotvrdí — viz retenceDrzena. */
  let pokles = await retencePokles(s, klice, novyKlic);
  /* Úbytek téhož dne, který správce už potvrdil, se znovu nehlásí (další
   * běh téže noci by potvrzení přepsal). */
  if (pokles) {
    let byl = null;
    try { byl = await s.cti(RETENCE_VAROVANI_KLIC); } catch (e) { /* níž se hlásí znovu */ }
    if (byl && byl.potvrzeno && byl.den === pokles.den && byl.zdroj !== 'disk') pokles = null;
  }
  if (pokles) {
    const varovani = { kdy: new Date(Number.isFinite(+ted) && ted ? +ted : Date.now()).toISOString(), ...pokles };
    try { await s.zapis(RETENCE_VAROVANI_KLIC, varovani); } catch (e) { /* varování je navíc, retence stejně stojí */ }
    return { smazano: [], chyby: [], ceka: 'retence přeskočena — ' + pokles.text, varovani };
  }
  /* K4-N13 (O11): nepotvrzené varování z dřívější noci (i z kopie na Disk,
   * #523) drží retenci dál — od #523 bez časového omezení. Nečitelný
   * záznam = radši nemazat. */
  let drzeno;
  try { drzeno = retenceDrzena(await s.cti(RETENCE_VAROVANI_KLIC), ted); }
  catch (e) { drzeno = { dnu: 0, chyba: String(e && e.message || e) }; }
  if (drzeno)
    return { smazano: [], chyby: [], drzeno, ceka: drzeno.chyba
      ? 'retence stojí — záznam varování pojistky nejde přečíst (' + drzeno.chyba + ')'
      : 'retence stojí do potvrzení úbytku dat správcem (varování před ' + drzeno.dnu + ' dny)' };
  const kopie = await s.cti(KOPIE_DISK_KLIC);
  if (!kopieDiskCerstva(kopie, ted))
    return { smazano: [], chyby: [], ceka: 'retence čeká na první kopii na Disk' };
  /* K3-N1 (20. 10. 2026): záznam píše prohlížeč, takže sám čas nestačí —
   * retenci odemkne jen kopie existujícího nočního otisku s velikostí
   * a otiskem SHA-256 (kopieDiskPodlozena). */
  if (!kopieDiskPodlozena(kopie, klice))
    return { smazano: [], chyby: [], ceka: 'retence čeká na podloženou kopii nočního otisku na Disk' };
  /* ČASOVÝ ROZPOČET (#523 Z2). Otisk po částech má desítky částí a první
   * noc po novém pravidle maže i staré otisky ze září — sekvenčně by to
   * plánovaná funkce (limit 30 s) nestihla. Maže se proto do vyčerpání
   * `opt.rozpocetMs` a zbytek (`zbyva`) dokončí další běh téže noci (noční
   * funkce pak den neuzavře). Pořadí u otisku: nejdřív manifest (otisk
   * přestane existovat celý naráz), pak souhrn, pak části po dávkách —
   * když funkci ukončí uprostřed, osiřelé části uklidí uklidRozpracovane. */
  const zacatek = Date.now();
  const rozpocet = opt.rozpocetMs > 0 ? opt.rozpocetMs : Infinity;
  const vybrane = retenceVyber(klice, dnes || denDnes()).filter(k => k !== novyKlic);
  const smazano = [], chyby = [];
  let zbyva = 0;
  for (const k of vybrane) {
    if (Date.now() - zacatek > rozpocet) { zbyva = vybrane.length - smazano.length - chyby.length; break; }
    try {
      await s.smaz(k);
      if (klice.includes(souhrnKlic(k))) await s.smaz(souhrnKlic(k));
      const casti = klice.filter(x => x.startsWith(OTISK_CASTI + k + '/'));   // #522: části otisku
      for (let i = 0; i < casti.length; i += DAVKA_CTENI) await Promise.all(casti.slice(i, i + DAVKA_CTENI).map(c => s.smaz(c)));
      smazano.push(k);
    } catch (e) { chyby.push(k + ': ' + String(e && e.message || e)); }
  }
  return { smazano, chyby, ...(zbyva ? { zbyva } : {}) };
}

/* ============================================================
 * KOPIE OTISKU NA DISK GOOGLE (#151 N6, rozhodnutí J. V. 19. 10. 2026)
 *
 * Netlify na Disk nedosáhne (nemá přihlašovací údaje Google), proto kopii
 * zapisuje prohlížeč správce do vybrané složky „_Zaloha Netlify DB".
 * Obsah podle J. V.: BEZ otisků hesel a BEZ podpisů — jako záloha ke
 * stažení, jen ještě bez skenů podpisů. Účty nesou e-mail, jméno, roli
 * a stav; obnova je ze souboru stejně nikdy nebere (B27).
 * ============================================================ */
/* POVOLENÝ SEZNAM ČÁSTÍ (K3-N12, audit K3; dávka O5 20. 10. 2026). Kopie
 * do 20. 10. brala vše kromě hesel a podpisů — nové úložiště s tajemstvím
 * by na Disk odešlo bez vědomého rozhodnutí. Teď jdou jen tyto části
 * (= stav 20. 10. 2026); novou část je třeba dopsat sem (test_zalohy N6
 * hlídá, že každá část zálohy je tu, nebo ji test vědomě vynechá). */
export const KOPIE_DISK_CASTI = ['porizena', 'zdroj', 'kdo', 'program', 'firma', 'rejstrik', 'zakazky', 'uzivatele',
  'sablony', 'zobrazeni', 'smazani', 'popisy', 'slovnik', 'controlling', 'zakaznici', 'podpisy'];
export function otiskProDisk(o) {
  if (!o || typeof o !== 'object') return null;
  const out = {};
  for (const k of KOPIE_DISK_CASTI) if (Object.prototype.hasOwnProperty.call(o, k)) out[k] = o[k];
  out.uzivatele = (Array.isArray(o.uzivatele) ? o.uzivatele : []).filter(Boolean)
    .map(x => ({ email: x.email, jmeno: x.jmeno, role: x.role, aktivni: x.aktivni !== false }));
  out.podpisy = null;
  return out;
}

/* Nejnovější NOČNÍ otisk (klíč dne se zdrojem nocni-otisk). Zdroj se bere ze
 * souhrnu, u starších otisků z otisku samého; prochází se nejvýš 7 dní
 * zpátky — starší noční otisk znamená výpadek, který hlásí hlídka #152. */
export async function posledniNocniOtisk() {
  const k = await posledniNocniKlic();
  return k ? { klic: k, otisk: await ctiOtisk(await uloziste('zalohy'), k) } : null;
}
/* Jen klíč (#522): kopie na Disk po stránkách si otisk čte po částech
 * a celý ho do paměti nebere. Zdroj ze souhrnu, z manifestu, nebo (starý
 * otisk bez souhrnu) z otisku samého. */
export async function posledniNocniKlic() {
  const s = await uloziste('zalohy');
  const denni = (await s.seznam()).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort().reverse().slice(0, 7);
  for (const k of denni) {
    const sh = await s.cti(souhrnKlic(k));
    if (sh && sh.zdroj && sh.zdroj !== 'nocni-otisk') continue;
    const o = await s.cti(k);
    if (o && o.zdroj === 'nocni-otisk') return k;
  }
  return null;
}

/* Záznam o poslední kopii na Disku — na serveru, aby hlídka (14 dní)
 * fungovala v každém prohlížeči, i tam, kde složka připojená není. */
export const KOPIE_DISK_KLIC = 'kopie-disk';
/* Složka na Disku Google, do které se kopie zapisuje (J. V. 19. 10. 2026);
 * od K3-N1 (J. V. 20. 10. 2026) server záznam z jiné složky nepřijme. Stejné
 * jméno nese klient (ULO_KOPIE_DISK_SLOZKA v src/uloziste.js). */
export const KOPIE_DISK_SLOZKA = '_Zaloha Netlify DB';
export const RETENCE_KOPIE_DISK_DNU = 7;
/* K3-N1 (audit K3, 20. 10. 2026): záznam kopie odemyká retenci, jen když
 * popisuje skutečnou kopii NOČNÍHO otisku — původ `nocni-otisk`, klíč dne,
 * který v úložišti je (`klice` = seznam úložiště `zalohy`), jméno souboru
 * k tomu otisku, velikost > 0 a platný SHA-256. Záznam „aktuální stav",
 * s nulovou velikostí nebo bez otisku hlídku 14 dní dál uspokojí, retenci
 * ne. Velikost se proti souhrnu neporovnává: na Disk jde otisk bez hesel
 * a podpisů (otiskProDisk), takže velikosti se liší vždy. Od v20.10.2
 * (K3-N1, J. V.) navíc heslo správce u záznamu a složka „_Zaloha Netlify DB". */
/* K4-N14 (O9): jen kopie ČERSTVÉHO nočního otisku — jeden ze 7 nejnovějších
 * denních klíčů v úložišti (klient kopíruje poslední noční). Do O9 prošel
 * i libovolně starý otisk (staré se nemažou). Počítá se z klíčů, ne z času,
 * takže na hodinách nezávisí. */
export const KOPIE_DISK_NEJNOVEJSICH = 7;
export function kopieDiskPodlozena(zaznam, klice) {
  if (!zaznam || typeof zaznam !== 'object' || zaznam.puvod !== 'nocni-otisk') return false;
  const otisk = typeof zaznam.otisk === 'string' ? zaznam.otisk : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(otisk) || !Array.isArray(klice)) return false;
  /* otisk musí v úložišti být (K3-N1) a být mezi 7 nejnovějšími (K4-N14) */
  const nejnovejsi = klice.filter(k => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k))
    .sort().reverse().slice(0, KOPIE_DISK_NEJNOVEJSICH);
  if (!nejnovejsi.includes(otisk)) return false;
  /* #523 Z2: kopie je od v26.10.9 komprimovaná (.json.gz); starší .json platí dál */
  if (zaznam.soubor !== 'otisk_' + otisk + '.json' && zaznam.soubor !== 'otisk_' + otisk + '.json.gz') return false;
  /* K3-N1 (rozhodnutí J. V. 20. 10. 2026): jen záznam potvrzený heslem
   * správce a jen kopie do složky „_Zaloha Netlify DB". Záznamy zapsané
   * před v20.10.2 tyhle značky nemají — retence počká na novou kopii. */
  if (zaznam.potvrzeno !== 'heslo-spravce' || zaznam.slozka !== KOPIE_DISK_SLOZKA) return false;
  return Number.isSafeInteger(zaznam.velikostB) && zaznam.velikostB > 0
    && /^[0-9a-f]{64}$/.test(String(zaznam.sha256 || ''));
}
export function kopieDiskCerstva(zaznam, ted) {
  const t = zaznam && Date.parse(zaznam.kdy || '');
  const nyni = Number.isFinite(+ted) && ted ? +ted : Date.now();
  return Number.isFinite(t) && nyni - t >= 0 && nyni - t < RETENCE_KOPIE_DISK_DNU * DEN_MS;
}

/* ============================================================
 * ZÁLOHA KE STAŽENÍ PO STRÁNKÁCH (#522 Z1, 26. 10. 2026)
 *
 * GET /api/zaloha i ?zdroj=nocni vracely celou databázi jednou odpovědí.
 * Netlify vydá z funkce nejvýš ~6 MB — u engscalc (desítky MB) tedy
 * „Stáhnout zálohu" i „Zkopírovat zálohu na Disk teď" padaly vždy. Teď se
 * záloha vydává po stránkách (nejvýš ZALOHA_STRANA_MAX_B a časový rozpočet
 * synchronní funkce) a prohlížeč je skládá (uloZalohaSloz v src/uloziste.js).
 * Ukazatel `po` = „<pořadí sekce>|<poslední vydaný klíč>": další stránka
 * pokračuje za ním, takže ani nový záznam mezi stránkami nic neposune.
 * Stránka nese mapy jako dílčí mapy, účty jako dílčí pole; prázdná mapa
 * přijde jako null (zakázky {}, účty []) — složený soubor má stejný tvar
 * jako dřívější celá záloha.
 * ============================================================ */
export const ZALOHA_STRANA_MAX_B = 4 * 1024 * 1024;
const uzivatelBezHesla = (x) => ({ email: x.email, jmeno: x.jmeno, role: x.role, aktivni: x.aktivni !== false });
/* Zdroj stránek: živá úložiště, nebo objekt otisku v paměti (starý
 * jednolitý otisk). `klice` vrací seřazené klíče mapy, null u jednozáznamové. */
export function zdrojZivy() {
  const ul = {};
  const ulZ = async (n) => ul[n] || (ul[n] = await uloziste(n));
  return {
    async klice(x) { if (x.klic) return null;
      return (await (await ulZ(x.ul)).seznam(x.prefix)).filter(k => !x.prefix || k.startsWith(x.prefix))
        .map(k => x.prefix ? k.slice(x.prefix.length) : k).sort(); },
    async hodnoty(x, klice) { return ctiPoDavkach(await ulZ(x.ul), klice.map(k => (x.prefix || '') + k)); },
    async jeden(x) { return (await (await ulZ(x.ul)).cti(x.klic)) || null; },
  };
}
export function zdrojZObjektu(o) {
  const mapa = (x) => { const v = o[x.nazev];
    if (x.pole) return Object.fromEntries((Array.isArray(v) ? v : []).map((u, i) => [String(i).padStart(6, '0'), u]));
    return v && typeof v === 'object' ? v : {}; };
  return {
    async klice(x) { return x.klic ? null : Object.keys(mapa(x)).sort(); },
    async hodnoty(x, klice) { const m = mapa(x); return klice.map(k => (m[k] === undefined ? null : m[k])); },
    async jeden(x) { return o[x.nazev] === undefined ? null : o[x.nazev]; },
  };
}
/* Jedna stránka. `opt.proDisk` = jen části KOPIE_DISK_CASTI, bez podpisů
 * (otiskProDisk); účty vždy bez otisků hesel (ven nikdy nejdou). */
export async function zalohaStrana(zdroj, po, opt = {}) {
  const zacatek = Date.now();
  const maxB = opt.maxB > 0 ? opt.maxB : ZALOHA_STRANA_MAX_B;
  const rozpocet = opt.rozpocetMs > 0 ? opt.rozpocetMs : OTISK_ROZPOCET.synchronniMs;
  const sekce = OTISK_SEKCE.filter(x => !opt.proDisk || (KOPIE_DISK_CASTI.includes(x.nazev) && x.nazev !== 'podpisy'));
  const text = String(po || '');
  const rez = text.indexOf('|');
  let i = rez > 0 ? parseInt(text.slice(0, rez), 10) : 0;
  let za = rez > 0 ? text.slice(rez + 1) : '';
  if (!Number.isInteger(i) || i < 0) i = 0;
  const strana = {};
  if (!text && opt.proDisk) strana.podpisy = null;
  let velikost = 0;
  for (; i < sekce.length; i++, za = '') {
    const x = sekce[i];
    const klice = await zdroj.klice(x);
    if (klice === null) {
      const v = await zdroj.jeden(x);
      const b = Buffer.byteLength(JSON.stringify(v));
      if (velikost > 0 && velikost + b > maxB) return { zaloha: strana, dalsi: i + '|' };
      strana[x.nazev] = v; velikost += b;
      continue;
    }
    const zbyva = za ? klice.filter(k => k > za) : klice;
    if (!zbyva.length) {
      if (!za) strana[x.nazev] = x.pole ? [] : (x.nazev === 'zakazky' ? {} : null);
      continue;
    }
    for (let j = 0; j < zbyva.length; j += DAVKA_CTENI) {
      if (velikost > 0 && Date.now() - zacatek > rozpocet) return { zaloha: strana, dalsi: i + '|' + (j ? zbyva[j - 1] : za) };
      const davka = zbyva.slice(j, j + DAVKA_CTENI);
      const hodnoty = await zdroj.hodnoty(x, davka);
      for (let d = 0; d < davka.length; d++) {
        const v = hodnoty[d];
        const b = (v == null ? 4 : Buffer.byteLength(JSON.stringify(v))) + davka[d].length + 8;
        if (velikost > 0 && velikost + b > maxB) {
          const posledni = d > 0 ? davka[d - 1] : (j > 0 ? zbyva[j - 1] : za);
          return { zaloha: strana, dalsi: i + '|' + posledni };
        }
        if (x.pole) { if (v) (strana[x.nazev] || (strana[x.nazev] = [])).push(uzivatelBezHesla(v)); else if (!strana[x.nazev]) strana[x.nazev] = []; }
        else (strana[x.nazev] || (strana[x.nazev] = {}))[davka[d]] = v == null ? null : v;
        velikost += b;
      }
    }
  }
  return { zaloha: strana, dalsi: null };
}
