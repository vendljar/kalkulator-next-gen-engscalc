/* ============================================================
 * B174, B175 — noční úklid úložišť (dávka H1, 18. 10. 2026)
 *
 * B174: `pd_cache` (detail případu s kontakty z Pipedrive, seznam případů,
 * počítadlo stropu s e-mailem) se nemazal nikdy. Noční otisk teď po záloze
 * smaže záznamy starší 30 dní a záznamy bez zjistitelného stáří.
 * B175: uložené dny analytiky s klíči prvků z doby před v15.10.2 (zbytek
 * argumentu = jméno zákazníka) se jednou očistí; nový zápis čistí server.
 *
 * Pojistka: před opravou (bez lib/uklid.mjs a bez volání v zaloha_nocni.mjs)
 * sada nejde ani načíst a staré záznamy v úložišti zůstávají; po opravě
 * projde. Mutace B174/B175 v netlify/mutace.mjs.
 * ============================================================ */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
if (!process.env.ADMIN_EMAIL) process.env.ADMIN_EMAIL = 'spravce@priklad.cz';

const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
    .map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

const U = await import('./lib/uklid.mjs');
const { default: nocni } = await import('./functions/zaloha_nocni.mjs');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : info); }
};
const DEN = 24 * 3600 * 1000;
const ted = Date.now();
const ma = (ulo, k) => pamet.has(ulo + '/' + k);
const vloz = (ulo, k, v) => pamet.set(ulo + '/' + k, JSON.stringify(v));

/* ---------- B174: pd_cache ---------- */
function naplnCache() {
  vloz('pd_cache', 'deal:1', { poridano: ted - 31 * DEN, odpoved: { deal: { osoba: 'Jan Zkušební' } } });
  vloz('pd_cache', 'deal:2', { poridano: ted - 1 * DEN, odpoved: { deal: {} } });
  vloz('pd_cache', 'dealy:open', { poridano: ted - 40 * DEN, dealy: [] });
  vloz('pd_cache', 'dealy:won', { poridano: ted - 2 * DEN, dealy: [] });
  vloz('pd_cache', 'strop:stary@priklad.cz', { od: ted - 45 * DEN, pocet: 3 });
  vloz('pd_cache', 'strop:novy@priklad.cz', { od: ted - 3600 * 1000, pocet: 1 });
  vloz('pd_cache', 'deal:3', { odpoved: {} });           // bez stáří
  vloz('pd_cache', 'cizi', 'text');                      // nerozpoznaný záznam
}
naplnCache();
const r = await U.pdCacheUklid(ted);
test('B174: detail případu starší 30 dní (kontakty z CRM) se smaže', !ma('pd_cache', 'deal:1'));
test('B174: čerstvý detail případu zůstává', ma('pd_cache', 'deal:2'));
test('B174: starý seznam případů se smaže, čerstvý zůstává', !ma('pd_cache', 'dealy:open') && ma('pd_cache', 'dealy:won'));
test('B174: staré počítadlo stropu (e-mail) se smaže', !ma('pd_cache', 'strop:stary@priklad.cz'));
test('B174: běžící počítadlo stropu zůstává (strop platí dál)', ma('pd_cache', 'strop:novy@priklad.cz'));
test('B174: záznam bez zjistitelného stáří se smaže', !ma('pd_cache', 'deal:3') && !ma('pd_cache', 'cizi'));
test('B174: souhrn úklidu sedí (8 prohledáno, 5 smazáno)', r.prohledano === 8 && r.smazano === 5, JSON.stringify(r));
test('B174: hranice je přesně 30 dní', U.PD_CACHE_UKLID_DNU === 30);

/* ---------- B175: analytika ---------- */
const SPINAVY = "zakazky|BUTTON|otevriZakazku('2026-OPR-CN-0155 Bytový dům (Praha) Novák')";
const CISTY = 'zakazky|BUTTON|otevriZakazku(…)';
vloz('analytika', 'den/2025-03-01', {
  kliky: { [SPINAVY]: 3, [CISTY]: 2 }, zdrz: { [SPINAVY]: 10 }, zalozky: { zakazky: 1 },
  pocty: { zakazky: 1, kalkulace: 0, tiskyWord: 0, tiskyNahled: 0, prihlaseni: 1, chyby: 0 },
  poUzivateli: { 'obchodnik@priklad.cz': { zakazky: 1, kalkulace: 0, tiskyWord: 0, tiskyNahled: 0, prihlaseni: 1, chyby: 0,
    zalozky: { zakazky: 1 }, kliky: { [SPINAVY]: 3 } } },
});
vloz('analytika', 'den/2026-10-01', { kliky: { [CISTY]: 1 }, zdrz: {}, zalozky: {}, pocty: {}, poUzivateli: {}, neznamePole: 7 });

const a1 = await U.analytikaOcista();
const d = JSON.parse(pamet.get('analytika/den/2025-03-01'));
const vse = JSON.stringify(d);
test('B175: v uloženém dni nezůstalo jméno zákazníka', !/Novák|Praha|0155/.test(vse), vse);
test('B175: kliky se slily pod očištěný klíč (3 + 2)', d.kliky[CISTY] === 5, JSON.stringify(d.kliky));
test('B175: zdržení i kliky po uživateli jsou očištěné',
  d.zdrz[CISTY] === 10 && d.poUzivateli['obchodnik@priklad.cz'].kliky[CISTY] === 3, vse);
test('B175: počty dne zůstaly', d.pocty.zakazky === 1 && d.pocty.prihlaseni === 1, JSON.stringify(d.pocty));
test('B175: čistý den se nepřepisuje', JSON.parse(pamet.get('analytika/den/2026-10-01')).neznamePole === 7);
test('B175: souhrn očisty (2 dny, 1 očištěn)', a1.dnu === 2 && a1.ocisteno === 1, JSON.stringify(a1));
test('B175: hotová očista si zapíše značku', ma('analytika', U.ANALYTIKA_OCISTA_ZNACKA));
vloz('analytika', 'den/2025-03-02', { kliky: { [SPINAVY]: 1 } });
const a2 = await U.analytikaOcista();
test('B175: další noc už dny nečte (značka)', a2.preskoceno === true, JSON.stringify(a2));

/* ---------- noční otisk úklid opravdu volá ---------- */
pamet.delete('analytika/' + U.ANALYTIKA_OCISTA_ZNACKA);
naplnCache();
const odp = await (await nocni()).json();
test('noční otisk: odpověď nese výsledek úklidu', !!(odp.uklid && odp.uklid.pdCache && odp.uklid.analytika), JSON.stringify(odp.uklid));
test('noční otisk: stará cache Pipedrive je pryč', !ma('pd_cache', 'deal:1') && ma('pd_cache', 'deal:2'));
test('noční otisk: den analytiky ze včerejší noci je očištěný',
  !/Novák/.test(pamet.get('analytika/den/2025-03-02')), pamet.get('analytika/den/2025-03-02'));
test('noční otisk: záloha vznikla i s úklidem', odp.ok === true);

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
