// Úklid po zkoušce PR na TESTU: připomínky VYPNOUT (původní nastavení z OUT/nastaveni_puvodni.json, zapnuto=false)
// a zrušit klíč koordinace (heslo správce). Vypíše jen stav (zapnuto, klíč nastaven), nic citlivého.
const fs = require('fs'); const { chromium } = require('playwright');
const T = 'https://testengscalc.netlify.app'; const OUT = process.env.OUT || (process.env.KNG_SP || '/tmp/claude-0/sp') + '/pr';
(async () => { const b = await chromium.launch(); const r = (await b.newContext()).request;
  console.log('přihlášení', (await r.post(T + '/api/prihlaseni', { data: { email: process.env.KNG_TEST_EMAIL, heslo: process.env.KNG_TEST_HESLO } })).status());
  let puv = null; try { puv = JSON.parse(fs.readFileSync(OUT + '/nastaveni_puvodni.json', 'utf8')); } catch (e) {}
  const zp = Object.assign({}, puv || {}, { zapnuto: false }); delete zp.kdo; delete zp.kdy;
  console.log('nastavení (vypnout)', (await r.post(T + '/api/pripominky', { data: { akce: 'nastaveni', nastaveni: zp } })).status());
  console.log('zrušení klíče', (await r.post(T + '/api/pripominky', { data: { akce: 'klicZrusit', hesloSpravce: process.env.KNG_TEST_HESLO } })).status());
  const n = await (await r.get(T + '/api/pripominky?nastaveni=1')).json();
  console.log('stav: zapnuto', n.zapnuto, '· klíč nastaven', n.klic && n.klic.nastaven, '· limitDen', n.limitDen);
  await b.close(); })().catch(e => { console.error('CHYBA', e.message); process.exit(1); });
