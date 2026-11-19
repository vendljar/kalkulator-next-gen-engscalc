// Zkouška ON (#679) na TESTU — kdo je online. Jen čtení API a obrazovky; zápis jen přihlášení/odhlášení (aktivita).
// E-maily účtů se nevypisují (řádek obchodníka se hledá podle KNG_TEST_OBCHODNIK_EMAIL).
const { chromium } = require('playwright'); const fs = require('fs');
const OUT = process.env.OUT || '/tmp/on'; fs.mkdirSync(OUT, { recursive: true });
const LOG = []; const MAILS = [process.env.KNG_TEST_EMAIL, process.env.KNG_TEST_OBCHODNIK_EMAIL].filter(Boolean);
const skryj = s => { let x = s; for (const m of MAILS) x = x.split(m).join('<email>'); return x.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '<email>'); };
const L = (...a) => { const s = skryj(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); LOG.push(s); console.log(s); };
let ok = 0, fail = 0; const V = (id, pod, det) => { if (pod) ok++; else fail++; L((pod ? 'OK   ' : 'FAIL ') + id, det === undefined ? '' : det); };
async function relace(b, envE, envH, req) { const ctx = await b.newContext({ viewport: { width: 1400, height: 950 } }); const p = await ctx.newPage();
  await p.route('**/*', r => { const m = r.request().method(), path = new URL(r.request().url()).pathname; if (m === 'GET' || ['/api/prihlaseni', '/api/odhlaseni', '/api/analytika'].includes(path)) return r.continue(); req.push('BLOK ' + m + ' ' + path); return r.abort(); });
  p.on('request', r => { const u = new URL(r.url()); if (u.pathname.startsWith('/api/')) req.push(r.method() + ' ' + u.pathname); });
  await p.goto('https://testengscalc.netlify.app/', { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#onlineEmail', { timeout: 60000 });
  await p.fill('#onlineEmail', process.env[envE]); await p.fill('#onlineHeslo', process.env[envH]); await p.press('#onlineHeslo', 'Enter');
  await p.waitForSelector('#prihlaseni-overlay', { state: 'hidden', timeout: 60000 }); await p.waitForTimeout(4000);
  await p.evaluate(() => { window.potvrd = async () => true; window.hlaska = () => {}; }); return p; }
(async () => { const b = await chromium.launch(); const rA = [], rO = [];
  const pO = await relace(b, 'KNG_TEST_OBCHODNIK_EMAIL', 'KNG_TEST_OBCHODNIK_HESLO', rO);
  const pA = await relace(b, 'KNG_TEST_EMAIL', 'KNG_TEST_HESLO', rA);
  L('verze', await pA.evaluate(() => (document.body.innerText.match(/v\d+\.\d+\.\d+/) || [''])[0]));
  const radek = (mail) => pA.evaluate(async (mail) => { const pred = window.__n = (window.__n || 0);
      nastPanel('obecne'); nastPanel('uzivatele'); await new Promise(r => setTimeout(r, 3500));
      const ov = document.getElementById('nastaveni-overlay'); const th = [...ov.querySelectorAll('th')].map(t => t.textContent.trim());
      const tr = [...ov.querySelectorAll('tr')].find(r => r.textContent.includes(mail)); const td = tr && tr.querySelector('td.uz-aktivita');
      return { sloupec: th.includes('Naposledy aktivní'), radek: !!tr, tecka: !!(td && td.querySelector('.uz-online')), text: td ? td.textContent.replace(/\s+/g, ' ').trim() : null, title: td ? td.getAttribute('title') : null,
        barva: td && td.querySelector('.uz-online') ? getComputedStyle(td.querySelector('.uz-online')).color : null }; }, mail);
  await pA.evaluate(() => otevriNastaveni());
  let n0 = rA.filter(x => x === 'GET /api/uzivatele').length; let r1 = await radek(process.env.KNG_TEST_OBCHODNIK_EMAIL); let n1 = rA.filter(x => x === 'GET /api/uzivatele').length;
  L('obchodník přihlášený, řádek u správce', r1);
  V('ON1 sloupec „Naposledy aktivní"', r1.sloupec);
  V('ON1 obchodník online: zelená tečka + „online", relativní čas', r1.tecka && /online/.test(r1.text) && /právě teď|před \d+ min/.test(r1.text) && /26, 127, 55|rgb\(26, 127, 55\)/.test(r1.barva || ''), r1);
  V('ON1 přesný čas v title', /^Naposledy aktivní \S/.test(r1.title || '') && /\d{1,2}:\d{2}/.test(r1.title || ''), r1.title);
  V('ON1 přepnutí na záložku Uživatelé seznam znovu načte (GET /api/uzivatele)', n1 > n0, { pred: n0, po: n1 });
  await pA.screenshot({ path: OUT + '/on_uzivatele.png' });
  // API správce
  const api = await pA.evaluate(async () => { const r = await fetch('/api/uzivatele', { credentials: 'include' }); const j = await r.json(); const sez = j.uzivatele || j.ucty || j.seznam || (Array.isArray(j) ? j : []);
    const klice = [...new Set(sez.flatMap(u => Object.keys(u)))]; return { status: r.status, pocet: sez.length, klice, horniKlice: Object.keys(j) }; });
  L('API správce /api/uzivatele', api);
  V('ON4 v odpovědi API není IP ani prohlížeč', api.status === 200 && api.klice.includes('posledniAktivita') && !api.klice.some(k => /ip|agent|prohliz|browser|zarizeni|ua$/i.test(k)) && !api.horniKlice.some(k => /ip|agent/i.test(k)), api.klice);
  // obchodník
  const o = await pO.evaluate(async () => { const r = await fetch('/api/uzivatele', { credentials: 'include' }); const t = await r.text(); const ja = await (await fetch('/api/ja', { credentials: 'include' })).json();
    const plosky = (o, out = []) => { if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { out.push(k); plosky(v, out); } return out; };
    return { status: r.status, telo: t.slice(0, 200), udaj: /posledniAktivita|odhlaseni|"online"/.test(t), jaKlice: [...new Set(plosky(ja))], jaUdaj: /posledniAktivita|odhlaseni|"online"/.test(JSON.stringify(ja)) }; });
  V('ON2 obchodník: GET /api/uzivatele = 403 bez údaje', o.status === 403 && !o.udaj, { status: o.status, telo: o.telo });
  V('ON2 obchodník: /api/ja údaj o aktivitě nenese', !o.jaUdaj, o.jaKlice);
  const ja = await pA.evaluate(async () => JSON.stringify(await (await fetch('/api/ja', { credentials: 'include' })).json()));
  V('ON2 správce: /api/ja údaj o aktivitě nenese', !/posledniAktivita|odhlaseni|"online"/.test(ja));
  // odhlášení
  await pO.evaluate(() => onlineOdhlas()); await pO.waitForTimeout(3000); L('obchodník odhlášení', rO.filter(x => /odhlas/.test(x)));
  const r2 = await radek(process.env.KNG_TEST_OBCHODNIK_EMAIL); L('po odhlášení', r2);
  V('ON3 po odhlášení obchodníka správce online nevidí (bez tečky, bez „online"), title nese odhlášení', !r2.tecka && !/online/.test(r2.text || '') && /odhlášen\(a\) \S/.test(r2.title || ''), r2);
  const apiPo = await pA.evaluate(async (m) => { const j = await (await fetch('/api/uzivatele', { credentials: 'include' })).json(); const sez = j.uzivatele || j.ucty || j.seznam || [];
    const u = sez.find(x => JSON.stringify(x).includes(m)) || {}; return { online: u.online, maOdhlaseni: !!u.odhlaseni, maAktivitu: !!u.posledniAktivita }; }, process.env.KNG_TEST_OBCHODNIK_EMAIL);
  V('ON3 API: obchodník online=false, odhlášení zapsáno', apiPo.online === false && apiPo.maOdhlaseni, apiPo);
  await pA.screenshot({ path: OUT + '/on_po_odhlaseni.png' });
  L('požadavky správce (POST)', [...new Set(rA.filter(x => !/^GET/.test(x)))]); L('požadavky obchodník (POST)', [...new Set(rO.filter(x => !/^GET/.test(x)))]);
  L(`SOUHRN ${ok} OK, ${fail} FAIL`); fs.writeFileSync(OUT + '/log.txt', LOG.join('\n')); await b.close();
})().catch(e => { console.error('CHYBA', skryj(e.stack)); process.exit(1); });
