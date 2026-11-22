// Jen čtení: stav připomínek na TESTU (zapnuto, klíč, limit, počty) pro správce i obchodníka.
const { chromium } = require('playwright'); const T = 'https://testengscalc.netlify.app';
(async () => { const b = await chromium.launch();
  for (const [r, e, h] of [['správce', 'KNG_TEST_EMAIL', 'KNG_TEST_HESLO'], ['obchodník', 'KNG_TEST_OBCHODNIK_EMAIL', 'KNG_TEST_OBCHODNIK_HESLO']]) {
    const q = (await b.newContext()).request; await q.post(T + '/api/prihlaseni', { data: { email: process.env[e], heslo: process.env[h] } });
    const n = await (await q.get(T + '/api/pripominky?nastaveni=1')).json(); const s = r === 'správce' ? await (await q.get(T + '/api/pripominky')).json() : null;
    console.log(r, { zapnuto: n.zapnuto, smiOdesilat: n.smiOdesilat, limitDen: n.limitDen, klic: n.klic ? n.klic.nastaven : '(nevidí)', pripominky: s ? s.pripominky.map(p => p.id + ':' + p.stav).join(' ') : '' }); }
  const g = await (await b.newContext()).request.get(T + '/api/pripominky?pro=koordinace', { headers: { Authorization: 'Bearer kngpr_neplatny' } });
  console.log('koordinace bez platného klíče', g.status()); await b.close(); })();
