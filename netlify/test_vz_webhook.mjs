/* ============================================================
 * VZ-E2 (#601) — WEBHOOK #553 A ČÍSLO NABÍDKY S PÍSMENEM ZÁKAZNÍKA
 * (návrh podklady/NAVRH_VICE_ZAKAZNIKU.md § 3 a § 7.3, zadání PROMPT_VZ_E2.md bod 1)
 *
 * Deal v Pipedrive může nést číslo nabídky dalšího zákazníka („CN-…-B").
 * Webhook (netlify/functions/pd_webhook.mjs) musí najít TUTÉŽ zakázku „CN-…"
 * a kontrola vlastníka dealu (#115 B) nesmí hodit 409 — ale JEN když zakázka
 * zákazníka s tím písmenem opravdu nese. Proti simulátoru Pipedrive
 * (PIPEDRIVE_SIMULATOR=1), ARES mock (404), do sítě nic:
 *   1. pomocné funkce lib: pdWebhookCisloZaklad, pdWebhookPismeno, pdWebhookCisloSedi;
 *   2. deal „…-B" najde zakázku se zákazníkem B (žádná nová), číslo v hlavičce
 *      se nepřepíše, deal „…" bez písmene i znovu „…-B" → tatáž zakázka (200);
 *   3. „…-C" u zakázky bez C: nový deal založí novou kalkulaci (jako dřív),
 *      navázaný deal → 409 (jako dřív), zakázka beze změny;
 *   4. zakázka bez víc zákazníků: deal „…-B" → nová kalkulace (jako dřív);
 *   5. přesná kalkulace „…-B" má přednost před základem; základ navázaný
 *      na jiný deal → 409 jako dřív;
 *   6. webhook dalsiZakaznici ani vzRidici nemění (porovnání před a po).
 * POJISTKA (ručně ověřeno 16. 11. 2026): s functions/pd_webhook.mjs vráceným
 * na HEAD (bez hledání podle základu a s původní kontrolou vlastníka
 * `pdWebhookCisloKlic(h.cislo) !== pdWebhookCisloKlic(cnDealu)`) selže 8 testů
 * bodů 2 a 5 (deal „…-B" založí novou kalkulaci „…-B.json", deal bez písmene
 * pak dostane 409, zakázka s B navázaná na jiný deal se obejde novou
 * kalkulací); s vrácenou JEN kontrolou vlastníka selže 5 testů bodu 2 (409).
 * Body 3, 4 a 6 hlídají, že se nic jiného nezměnilo — projdou i bez úpravy.
 * Spuštění: node netlify/test_vz_webhook.mjs
 * ============================================================ */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
for (const k of ['PIPEDRIVE_SIMULATOR_SCENAR', 'PIPEDRIVE_TOKEN', 'PIPEDRIVE_DOMENA', 'PROSTREDI', 'PIPEDRIVE_WEBHOOK_KLIC',
  'NETLIFY', 'SITE_ID', 'SITE_NAME', 'DEPLOY_ID', 'CONTEXT', 'BRANCH', 'HEAD', 'URL', 'DEPLOY_URL', 'DEPLOY_PRIME_URL']) delete process.env[k];
process.env.PIPEDRIVE_SIMULATOR = '1';
const KLIC = 'kng-test-webhook-klic-vz-e2-0123456789abcdefghij';
process.env.PIPEDRIVE_WEBHOOK_KLIC = KLIC;

const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
const venku = [];
globalThis.fetch = async (url) => { venku.push(String(url)); throw new Error('síť je v testu zakázaná: ' + url); };
/* ARES „subjekt nezná" — firma zůstane z dealu; ARES hlídá test_k40c_webhook.mjs. */
(await import('./lib/ares_server.mjs')).ARES_SIT.fetch = async () => new Response('{}', { status: 404 });

const { default: webhook } = await import('./functions/pd_webhook.mjs');
const SIM = await import('./lib/pipedrive_simulator.mjs');
const W = await import('./lib/pd_webhook.mjs');
const { pdHashZNazvu } = await import('./lib/pd_mapa.mjs');
const { jadro } = await import('./lib/jadro.mjs');
const { ULO } = await jadro();
const G = globalThis;

let ok = 0, fail = 0; const selhalo = [];
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; selhalo.push(n); console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info).slice(0, 600))); }
};
const J = (x) => JSON.stringify(x);
async function volej(dealId) {
  const r = await webhook(new Request('https://testweb.example/api/pd/webhook', { method: 'POST',
    headers: { 'content-type': 'application/json', 'x-kalkulator-klic': KLIC }, body: JSON.stringify({ dealId }) }));
  const text = await r.text();
  let j = {}; try { j = JSON.parse(text); } catch (e) { j = {}; }
  return { status: r.status, ...j };
}
const zakazkyKlice = () => [...pamet.keys()].filter((k) => k.startsWith('zakazky/z/'));
const zakazka = (soubor) => JSON.parse(pamet.get('zakazky/z/' + soubor) || 'null');
const D = () => SIM.pdSimStav().data;
const HASH_CN = pdHashZNazvu('Číslo nabídky (CN)');
const pouzite = new Set();
const dealS = () => {
  const d = D().dealy.find((x) => x.status === 'open' && x.org_id && x.person_id && /^CN-\d+ /.test(x.title) && !pouzite.has(x.id));
  if (d) pouzite.add(d.id);
  return d;
};
const nastavCn = (d, cn) => { D().dealy.find((x) => x.id === d.id).custom_fields[HASH_CN] = cn; };

/* Smyšlená zakázka obchodníka (bez ceníku, bez kontaktů skutečných osob). */
function ulozZakazku(cislo, pismenaDalsich, uprav) {
  const z = G.novaZakazka();
  Object.assign(z, { cislo, objednatel: 'Řídící Zkušební s.r.o. (smyšlené)', nazevAkce: 'Zkušební akce VZ', adresa: 'Stavba 1, Vzorov' });
  for (const p of pismenaDalsich) {
    const r = G.vzPridej(z, { objednatel: 'Zákazník ' + p + ' Zkušební s.r.o. (smyšlené)', adresaObjednatele: 'Ulice ' + p });
    if (!r.ok || r.zakaznik.pismeno !== p) throw new Error('příprava: vzPridej ' + p + ' ' + J(r));
  }
  if (uprav) uprav(z);
  z.uloRazitko = ULO.uloRazitkoNove();
  const soubor = ULO.uloJmenoSouboru(z);
  pamet.set('zakazky/z/' + soubor, J(z));
  return soubor;
}
const vz = (z) => J({ r: z && z.vzRidici, d: z && z.dalsiZakaznici });

/* ---------- 1. POMOCNÉ FUNKCE ---------- */
console.log('\n===== 1. POMOCNÉ FUNKCE (lib/pd_webhook.mjs) =====\n');
test('pdWebhookCisloZaklad: „…9940-B" → základ + B; „…9940.2-B" → „…9940.2" + B',
  J(W.pdWebhookCisloZaklad('2025-OPR-9940-B')) === J({ zaklad: '2025-OPR-9940', pismeno: 'B' })
  && J(W.pdWebhookCisloZaklad(' 2026 - OPR - CN - 9940.2-B ')) === J({ zaklad: '2026 - OPR - CN - 9940.2', pismeno: 'B' }));
test('pdWebhookCisloZaklad: bez písmene, „-A", „-b", „-BB", písmeno za písmenem, prázdno → pismeno \'\'',
  ['2025-OPR-9940', '2025-OPR-9940-A', '2025-OPR-9940-b', '2025-OPR-9940-BB', 'CN-X-B', '', null]
    .every((c) => W.pdWebhookCisloZaklad(c).pismeno === '' && W.pdWebhookCisloZaklad(c).zaklad === String(c == null ? '' : c).trim()));
test('shoda s jádrem: pdWebhookCisloZaklad = vzCisloRozloz (src/vice_zakazniku.js)',
  ['2025-OPR-9940-B', '9940.2-Z', 'CN-1-A', 'x-B', '7-BB', ' 12-C '].every((c) => J(W.pdWebhookCisloZaklad(c)) === J(G.vzCisloRozloz(c))));
{
  const z = G.novaZakazka(); z.cislo = 'CN-1';
  test('pdWebhookPismeno: zakázka s jedním zákazníkem → false', !W.pdWebhookPismeno(z, 'B'));
  G.vzPridej(z, { objednatel: 'Zákazník B (smyšlený)' });
  test('pdWebhookPismeno: další zákazník B → true, C → false', W.pdWebhookPismeno(z, 'B') && !W.pdWebhookPismeno(z, 'C'));
  test('pdWebhookPismeno: neplatné písmeno (\'\', A, b, BB, číslo) → false',
    ['', 'A', 'b', 'BB', 2, null].every((p) => !W.pdWebhookPismeno(z, p)));
  const pred = J(z);
  W.pdWebhookPismeno(z, 'B'); W.pdWebhookPismeno(z, 'Q');
  test('pdWebhookPismeno zakázku nemění', J(z) === pred);
  const r = G.novaZakazka(); r.vzRidici = { id: 'z3', pismeno: 'D', varianta: r.varianty[0].id }; r.dalsiZakaznici = [];
  test('pdWebhookPismeno: písmeno řídícího (po výměně řídícího) → true', W.pdWebhookPismeno(r, 'D'));
  const t = G.novaZakazka(); t.varianty[0].zamek = { zamceno: true, tisky: [{ typ: 'nabidka', zakaznik: { id: 'z4', pismeno: 'E' } }] };
  test('pdWebhookPismeno: písmeno z razítka tisku (zákazník odebrán po odeslání) → true', W.pdWebhookPismeno(t, 'E') && !W.pdWebhookPismeno(t, 'F'));
  test('pdWebhookPismeno: cizí tvary (null, pole, zakaznik text) nespadnou → false',
    !W.pdWebhookPismeno(null, 'B') && !W.pdWebhookPismeno([], 'B')
    && !W.pdWebhookPismeno({ dalsiZakaznici: [null, 'B'], varianty: [null, { zamek: { tisky: [null, { zakaznik: 'B' }] } }] }, 'B'));
  test('pdWebhookCisloSedi: totéž číslo (i jiné mezery) → true; jiné číslo → false',
    W.pdWebhookCisloSedi('CN-1', 'CN-1', z) && W.pdWebhookCisloSedi('CN 1', 'CN-1', z) && !W.pdWebhookCisloSedi('CN-1', 'CN-2', z));
  test('pdWebhookCisloSedi: „CN-1-B" na „CN-1" se zákazníkem B → true; „CN-1-C" → false; „CN-2-B" → false',
    W.pdWebhookCisloSedi('CN-1', 'CN-1-B', z) && !W.pdWebhookCisloSedi('CN-1', 'CN-1-C', z) && !W.pdWebhookCisloSedi('CN-1', 'CN-2-B', z));
  const bez = G.novaZakazka(); bez.cislo = 'CN-1';
  test('pdWebhookCisloSedi: „CN-1-B" u zakázky bez víc zákazníků → false (jako dřív)', !W.pdWebhookCisloSedi('CN-1', 'CN-1-B', bez));
  test('pdWebhookCisloSedi: kalkulace bez čísla → true (jako dřív)', W.pdWebhookCisloSedi('', 'CN-1-B', bez));
}

/* ---------- 2. DEAL „…-B" NAJDE ZAKÁZKU SE ZÁKAZNÍKEM B ---------- */
console.log('\n===== 2. DEAL S PÍSMENEM → TÁŽ ZAKÁZKA =====\n');
SIM.pdSimReset();
const D1 = dealS(), D2 = dealS(), D3 = dealS(), D4 = dealS(), D5 = dealS(), D6 = dealS();
test('příprava: šest dealů s CN v názvu', !!(D1 && D2 && D3 && D4 && D5 && D6));
const cn = (d) => d.title.split(' ')[0];
const S1 = ulozZakazku(cn(D1), ['B']);
const pred1 = zakazka(S1);
const pocet = zakazkyKlice().length;
nastavCn(D1, cn(D1) + '-B');
let r = await volej(D1.id);
test('deal „' + cn(D1) + '-B" → 200, navázaná TATÁŽ zakázka (žádná nová)', r.status === 200 && r.soubor === S1
  && r.akce === 'aktualizovano' && zakazkyKlice().length === pocet, [r.status, r.soubor, r.akce, r.chyba, zakazkyKlice()]);
let z = zakazka(S1);
test('zakázka navázaná na deal (pdDealId), číslo v hlavičce se nepřepsalo', z.pdDealId === String(D1.id) && z.cislo === cn(D1), [z.pdDealId, z.cislo]);
test('soubor „…-B.json" nevznikl', !pamet.has('zakazky/z/' + ULO.uloKlicSouboru(cn(D1) + '-B') + '.json'));
test('dalsiZakaznici a vzRidici beze změny', vz(z) === vz(pred1), [vz(z), vz(pred1)]);
test('hlavička řídícího (objednatel) zůstala — webhook ručně psané pole nepřepíše', z.objednatel === pred1.objednatel);
r = await volej(D1.id);
test('opakované doručení s „…-B" (vazba podle dealu) → 200 bez 409, tatáž zakázka', r.status === 200 && r.soubor === S1, r);
nastavCn(D1, cn(D1));
r = await volej(D1.id);
test('deal „' + cn(D1) + '" bez písmene → tatáž zakázka (200)', r.status === 200 && r.soubor === S1 && zakazkyKlice().length === pocet, r);
nastavCn(D1, cn(D1) + '-B');
r = await volej(D1.id);
test('… a zpět „…-B" → tatáž zakázka (200)', r.status === 200 && r.soubor === S1, r);
test('číslo v hlavičce pořád bez písmene', zakazka(S1).cislo === cn(D1));
test('po všech doručeních dalsiZakaznici a vzRidici beze změny', vz(zakazka(S1)) === vz(pred1));

/* Deal bez písmene napřed, pak písmeno: navázaný deal s „…-B" nesmí dostat 409. */
const S2 = ulozZakazku(cn(D2), ['B', 'C']);
const pred2 = zakazka(S2);
nastavCn(D2, cn(D2));
r = await volej(D2.id);
test('deal bez písmene naváže zakázku se zákazníky B a C', r.status === 200 && r.soubor === S2, r);
nastavCn(D2, cn(D2) + '-C');
r = await volej(D2.id);
test('týž deal s „…-C" (zákazník C v zakázce) → 200, žádné 409 vlastníka dealu', r.status === 200 && r.soubor === S2, r);
test('zakázka D2: číslo i zákazníci beze změny', zakazka(S2).cislo === cn(D2) && vz(zakazka(S2)) === vz(pred2));

/* ---------- 3. „…-C" U ZAKÁZKY BEZ C ---------- */
console.log('\n===== 3. PÍSMENO, KTERÉ ZAKÁZKA NENESE =====\n');
nastavCn(D1, cn(D1) + '-C');
const razitko1 = zakazka(S1).uloRazitko;
r = await volej(D1.id);
test('navázaný deal s „…-C" u zakázky jen s B → 409 jako dřív (jiné číslo), nic se nezměnilo',
  r.status === 409 && zakazka(S1).uloRazitko === razitko1 && zakazka(S1).cislo === cn(D1), r);
const S3 = ulozZakazku(cn(D3), ['B']);
const pred3 = pamet.get('zakazky/z/' + S3);
nastavCn(D3, cn(D3) + '-C');
const p3 = zakazkyKlice().length;
r = await volej(D3.id);
test('nový deal „…-C" u zakázky jen s B → nová kalkulace „…-C" jako dřív, zakázka „…" nedotčená',
  r.status === 200 && r.akce === 'zalozeno' && r.soubor !== S3 && zakazkyKlice().length === p3 + 1
  && pamet.get('zakazky/z/' + S3) === pred3 && zakazka(r.soubor).cislo === cn(D3) + '-C', [r.status, r.akce, r.soubor]);

/* ---------- 4. ZAKÁZKA BEZ VÍC ZÁKAZNÍKŮ ---------- */
console.log('\n===== 4. ZAKÁZKA S JEDNÍM ZÁKAZNÍKEM =====\n');
const S4 = ulozZakazku(cn(D4), []);
const pred4 = pamet.get('zakazky/z/' + S4);
nastavCn(D4, cn(D4) + '-B');
const p4 = zakazkyKlice().length;
r = await volej(D4.id);
test('deal „…-B" u zakázky bez víc zákazníků → nová kalkulace jako dřív, původní nedotčená',
  r.status === 200 && r.akce === 'zalozeno' && r.soubor !== S4 && zakazkyKlice().length === p4 + 1
  && pamet.get('zakazky/z/' + S4) === pred4, [r.status, r.akce, r.soubor]);
test('nová kalkulace nemá klíče víc zákazníků', !('dalsiZakaznici' in zakazka(r.soubor)) && !('vzRidici' in zakazka(r.soubor)));

/* ---------- 5. PŘEDNOST A CIZÍ DEAL ---------- */
console.log('\n===== 5. PŘESNÉ ČÍSLO MÁ PŘEDNOST, CIZÍ DEAL 409 =====\n');
const S5 = ulozZakazku(cn(D5), ['B']);
const S5b = ulozZakazku(cn(D5) + '-B', []);
const pred5 = pamet.get('zakazky/z/' + S5);
nastavCn(D5, cn(D5) + '-B');
r = await volej(D5.id);
test('existuje kalkulace přesně „…-B" → naváže se ta (jako dřív), zakázka „…" nedotčená',
  r.status === 200 && r.soubor === S5b && pamet.get('zakazky/z/' + S5) === pred5, [r.status, r.soubor, S5b]);
const S6 = ulozZakazku(cn(D6), ['B'], (z) => { z.pdDealId = String(D1.id); });
const pred6 = pamet.get('zakazky/z/' + S6);
nastavCn(D6, cn(D6) + '-B');
const p6 = zakazkyKlice().length;
r = await volej(D6.id);
test('zakázka se zákazníkem B navázaná na JINÝ deal → 409 jako dřív, nic nezapsáno',
  r.status === 409 && pamet.get('zakazky/z/' + S6) === pred6 && zakazkyKlice().length === p6, r);

/* ---------- 6. BEZ SÍTĚ ---------- */
test('do sítě za celý běh nic', venku.length === 0, venku);
console.log('\n' + ok + ' OK, ' + fail + ' FAIL' + (fail ? '\nSelhalo:\n  ' + selhalo.join('\n  ') : ''));
process.exit(fail ? 1 : 0);
