/* PoC čočky IN (audit 20. 11. 2026) — webhook /api/pd/webhook a /api/zaloha_disk proti anonymovi
 * a proti držiteli klíče. Jen lokálně: paměťové úložiště + simulátor Pipedrive, síť zakázaná.
 * Spuštění: node podklady/audit_2026-11-20/poc_IN_webhook_anonym.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-poc-in-tajemstvi-jen-lokalne';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = 'spravce@priklad.cz';
for (const k of ['PIPEDRIVE_SIMULATOR_SCENAR', 'PIPEDRIVE_TOKEN', 'PIPEDRIVE_DOMENA', 'PROSTREDI', 'PIPEDRIVE_WEBHOOK_KLIC', 'KNG_DISK_TOKEN',
  'NETLIFY', 'SITE_ID', 'SITE_NAME', 'DEPLOY_ID', 'CONTEXT', 'BRANCH', 'HEAD', 'URL', 'DEPLOY_URL', 'DEPLOY_PRIME_URL']) delete process.env[k];
process.env.PIPEDRIVE_SIMULATOR = '1';
const pamet = new Map(); let zapisu = 0, cteni = 0;
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { cteni++; return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { zapisu++; pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { cteni++; return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { zapisu++; pamet.delete(nazev + '/' + k); },
});
const venku = [];
globalThis.fetch = async (url) => { venku.push(String(url)); throw new Error('síť je v PoC zakázaná: ' + url); };
const R = new URL('../..', import.meta.url).pathname;
const imp = (p) => import(R + p);
(await imp('netlify/lib/ares_server.mjs')).ARES_SIT.fetch = async () => new Response('{}', { status: 404 });
const { default: webhook } = await imp('netlify/functions/pd_webhook.mjs');
const { default: disk } = await imp('netlify/functions/zaloha_disk.mjs');
const SIM = await imp('netlify/lib/pipedrive_simulator.mjs');
const { jadro } = await imp('netlify/lib/jadro.mjs');
await jadro();
const vysledky = [];
const bod = (nazev, odolne, info) => { vysledky.push(odolne); console.log((odolne ? 'ODOLNÉ    ' : 'ZRANITELNÉ ') + nazev + (info ? '  [' + info + ']' : '')); };
const KLIC = 'poc-in-klic-webhooku-0123456789abcdefghijklmnopq';
async function w(telo, hlavicky = {}, url = 'https://testweb.example/api/pd/webhook', metoda = 'POST') {
  const r = await webhook(new Request(url, { method: metoda, headers: { 'content-type': 'application/json', ...hlavicky },
    body: metoda === 'GET' ? undefined : (typeof telo === 'string' ? telo : JSON.stringify(telo)) }));
  const text = await r.text(); let j = {}; try { j = JSON.parse(text); } catch (e) { /* nic */ }
  return { status: r.status, text, ...j };
}
const pd = () => SIM.pdSimStav().pozadavky.length;
const D = () => SIM.pdSimStav().data;
const deal = D().dealy.find((d) => d.status === 'open' && d.org_id && d.person_id && /^CN-\d+ /.test(d.title));

/* 1) tajemství v prostředí chybí → nepropustí nic */
let z0 = zapisu, c0 = cteni, p0 = pd();
let r = await w({ dealId: deal.id }, { 'x-kalkulator-klic': '' });
let r2 = await w({ dealId: deal.id }, { 'x-kalkulator-klic': 'cokoli-cokoli-cokoli-cokoli-cokoli-cokoli' });
bod('webhook bez PIPEDRIVE_WEBHOOK_KLIC v prostředí: 503, bez úložiště a bez Pipedrive', r.status === 503 && r2.status === 503 && zapisu === z0 && cteni === c0 && pd() === p0, r.status + '/' + r2.status);
process.env.PIPEDRIVE_WEBHOOK_KLIC = '   ';
r = await w({ dealId: deal.id }, { 'x-kalkulator-klic': '   ' });
bod('klíč z mezer = nenastavený (503)', r.status === 503, String(r.status));
process.env.PIPEDRIVE_WEBHOOK_KLIC = KLIC;

/* 2) anonym: žádný / špatný klíč, klíč v adrese, prázdný Bearer/Basic, pole hlaviček */
z0 = zapisu; c0 = cteni; p0 = pd();
const pokusy = [
  [{}, undefined], [{ 'x-kalkulator-klic': KLIC.slice(0, -1) + 'X' }, undefined], [{ 'x-kalkulator-klic': KLIC + ' x' }, undefined],
  [{ authorization: 'Bearer ' }, undefined], [{ authorization: 'Basic ' + Buffer.from('uzivatel:').toString('base64') }, undefined],
  [{ authorization: 'Basic ' + Buffer.from(KLIC).toString('base64') }, undefined],            // klíč jako JMÉNO, ne heslo
  [{}, 'https://testweb.example/api/pd/webhook?klic=' + KLIC + '&x-kalkulator-klic=' + KLIC],
  [{ cookie: 'x-kalkulator-klic=' + KLIC }, undefined],
];
const stavy = [];
for (const [h, u] of pokusy) stavy.push((await w({ dealId: deal.id, cena: 1 }, h, u)).status);
bod('anonym (8 obměn bez platného klíče): vždy 401, žádný zápis ani čtení úložiště, žádný dotaz do Pipedrive',
  stavy.every((s) => s === 401) && zapisu === z0 && cteni === c0 && pd() === p0, stavy.join(','));
r = await w(undefined, { 'x-kalkulator-klic': KLIC }, undefined, 'GET');
bod('GET s platným klíčem → 405 (jen POST)', r.status === 405, String(r.status));

/* 3) držitel klíče: velké tělo, cizí pole v těle, replay */
r = await w(JSON.stringify({ dealId: deal.id, vypln: 'x'.repeat(20000) }), { 'x-kalkulator-klic': KLIC });
bod('tělo nad 16 KiB → 413', r.status === 413, String(r.status));
r = await w({ dealId: deal.id, cena: 123456, zakazka: { varianty: [] }, soubor: '../../uzivatele/x', autor: 'spravce@priklad.cz', pdDealId: 1 }, { 'x-kalkulator-klic': KLIC });
const soubor = r.soubor; const zak = JSON.parse(pamet.get('zakazky/z/' + soubor) || 'null');
bod('z těla se bere jen ID dealu (cena, soubor, autor z těla ignorovány)', r.status === 200 && r.akce === 'zalozeno' && zak && zak.autor === 'pipedrive-webhook'
  && /^[A-Za-z0-9._-]+$/.test(soubor) && !JSON.stringify(zak).includes('123456'), r.status + ' ' + r.akce + ' ' + soubor);
bod('odpověď webhooku nenese e-mail, telefon ani token', !/@|\+420|x-api-token|simulator"/.test(r.text.replace(/pipedrive-webhook/g, '')), r.text.slice(0, 0));
const razitko = zak.uloRazitko; z0 = zapisu;
const pocetZak = () => [...pamet.keys()].filter((k) => k.startsWith('zakazky/z/')).length; const n0 = pocetZak();
const patch0 = SIM.pdSimStav().pozadavky.filter((x) => x.startsWith('PATCH')).length;
r = await w({ dealId: deal.id }, { 'x-kalkulator-klic': KLIC });
bod('replay téhož doručení: bezeZmeny, razítko i počet zakázek stejné, žádný další PATCH dealu',
  r.akce === 'bezeZmeny' && JSON.parse(pamet.get('zakazky/z/' + soubor)).uloRazitko === razitko && pocetZak() === n0
  && SIM.pdSimStav().pozadavky.filter((x) => x.startsWith('PATCH')).length === patch0, r.akce);

/* 4) odkaz zapsaný do dealu: bez proměnné URL se bere z hostitele POŽADAVKU */
const d2 = D().dealy.find((d) => d.status === 'open' && d.org_id && d.person_id && /^CN-\d+ /.test(d.title) && d.id !== deal.id);
r = await w({ dealId: d2.id }, { 'x-kalkulator-klic': KLIC }, 'https://stare-nasazeni--testweb.example/api/pd/webhook');
const odkazCizi = String(r.odkaz || '');
process.env.URL = 'https://testweb.example';
const d3 = D().dealy.find((d) => d.status === 'open' && d.org_id && d.person_id && /^CN-\d+ /.test(d.title) && ![deal.id, d2.id].includes(d.id));
const r3 = await w({ dealId: d3.id }, { 'x-kalkulator-klic': KLIC }, 'https://stare-nasazeni--testweb.example/api/pd/webhook');
delete process.env.URL;
console.log('INFO       odkaz do dealu bez proměnné URL: ' + odkazCizi.replace(/\?.*/, '?…') + ' ; s proměnnou URL: ' + String(r3.odkaz || '').replace(/\?.*/, '?…'));
bod('s proměnnou URL se hostitel požadavku do odkazu nedostane', String(r3.odkaz || '').startsWith('https://testweb.example/'), '');

/* 5) strop: 60 platných volání za hodinu, pak 429 bez Pipedrive */
let posledni = 0, n = 0;
for (; n < 80; n++) { const x = await w({ dealId: deal.id }, { 'x-kalkulator-klic': KLIC }); posledni = x.status; if (x.status === 429) break; }
p0 = pd(); r = await w({ dealId: deal.id }, { 'x-kalkulator-klic': KLIC });
bod('strop volání webhooku: 429 a do Pipedrive se nejde', posledni === 429 && r.status === 429 && pd() === p0, 'po ' + n + ' dalších voláních');

/* 6) /api/zaloha_disk: bez tokenu v prostředí vypnuto; anonym ale ZAPISUJE počítadlo */
const dz = async (hlavicky = {}, url = 'https://testweb.example/api/zaloha_disk', init = {}) => {
  const x = await disk(new Request(url, { headers: hlavicky, ...init })); return { status: x.status, text: await x.text() }; };
z0 = zapisu;
r = await dz({ authorization: 'Bearer ' + 'a'.repeat(64) });
bod('zaloha_disk bez KNG_DISK_TOKEN: 403 (cesta vypnutá)', r.status === 403, String(r.status));
process.env.KNG_DISK_TOKEN = 'poc-in-disk-token-0123456789abcdefghijklmnopqrstuvwxyz';
r = await dz({ authorization: 'Bearer ' + 'a'.repeat(64) });
const rQ = await dz({}, 'https://testweb.example/api/zaloha_disk?token=' + process.env.KNG_DISK_TOKEN);
const rO = await dz({ authorization: 'Bearer ' + process.env.KNG_DISK_TOKEN, origin: 'https://testweb.example' });
bod('zaloha_disk: špatný token 403, token v adrese 400, s hlavičkou Origin 403 i se správným tokenem', r.status === 403 && rQ.status === 400 && rO.status === 403, [r.status, rQ.status, rO.status].join(','));
let s429 = 0; for (let i = 0; i < 12; i++) { const x = await dz({ authorization: 'Bearer spatny-token', 'x-nf-client-connection-ip': '198.51.100.7' }); if (x.status === 429) s429++; }
bod('zaloha_disk: brzda špatných tokenů z jedné adresy (429 po 10 pokusech)', s429 >= 1, s429 + '× 429 z 12');
const klicu0 = [...pamet.keys()].filter((k) => k.startsWith('disk_kopie/spatne:')).length;
for (let i = 0; i < 50; i++) await dz({ 'x-forwarded-for': '203.0.113.' + i });
const klicu1 = [...pamet.keys()].filter((k) => k.startsWith('disk_kopie/spatne:')).length;
console.log('INFO       anonymní požadavky bez tokenu zakládají záznam počítadla na adresu: +' + (klicu1 - klicu0) + ' klíčů za 50 požadavků (na Netlify adresu určuje x-nf-client-connection-ip, ne klient; mez B212)');
r = await dz({ authorization: 'Bearer ' + process.env.KNG_DISK_TOKEN });
bod('zaloha_disk: metadata se správným tokenem neobsahují token ani hesla', r.status === 200 && !r.text.includes(process.env.KNG_DISK_TOKEN) && !/heslo/i.test(r.text), String(r.status));
bod('do sítě nešlo nic', venku.length === 0, venku.join(' '));
console.log('\n' + (vysledky.every(Boolean) ? 'ODOLNÉ' : 'ZRANITELNÉ') + ' — ' + vysledky.filter(Boolean).length + '/' + vysledky.length + ' bodů odolných');
