/* SEC-M server-B, bod 8: ZÁLOHY A OBNOVA (zaloha, zaloha_nocni, zaloha_vynuceno, obnova,
 * lib/zalohovani.mjs, lib/uklid.mjs). Kdo stáhne zálohu a co v ní je, náhled, token, potvrzení,
 * souběh (SEC-N2 a jednorázová obnova), pojistka úbytku, retence, co jde „na Disk". */
import { priprav, pripravData, F, req, pamet, jsonOf, sada, zakazkaCislo, ulozZak, kopie, S } from './harness.mjs';
const T = sada('p4_zalohy_obnova');
process.env.PIPEDRIVE_TOKEN = 'TAJNY-PD-TOKEN-SECM-0000';
process.env.PIPEDRIVE_DOMENA = 'pokusna-firma';
const U = await priprav();
await pripravData(U.admin.cookie);
for (let i = 1; i <= 4; i++) await ulozZak(zakazkaCislo('2026 - ZB - CN - 000' + i), U.obch.cookie, '');
await req(F.uzivatele, 'POST', '/api/uzivatele', { akce: 'podpis', obrazek: 'data:image/png;base64,iVBORw0KGgo=' }, U.obch.cookie);
const TAJNE = [process.env.TAJEMSTVI_RELACE, process.env.ADMIN_INIT_HESLO, process.env.PIPEDRIVE_TOKEN, 'PokusHeslo-obch'];
const otiskHesla = /"[0-9a-f]{32}:[0-9a-f]{128}"/;

/* ---------- kdo stáhne zálohu, co v ní je ---------- */
for (const [n, url] of [['zaloha', '/api/zaloha'], ['zaloha?zdroj=nocni', '/api/zaloha?zdroj=nocni'], ['zaloha_vynuceno GET', '/api/zaloha_vynuceno']]) {
  const fn = n.startsWith('zaloha_v') ? F.zaloha_vynuceno : F.zaloha;
  const st = {};
  for (const kdo of ['anon', 'obch', 'ved', 'admin2']) st[kdo] = (await req(fn, 'GET', url, undefined, kdo === 'anon' ? null : U[kdo].cookie)).status;
  T.t('Z1 ' + n + ': anonym 401, obchodník/vedoucí 403, admin 200 ' + JSON.stringify(st), st.anon === 401 && st.obch === 403 && st.ved === 403 && st.admin2 === 200);
}
await F.zaloha_nocni(new Request('http://x/'));                  // noční otisk (v paměti)
for (const [n, url] of [['plná záloha', '/api/zaloha'], ['kopie na Disk', '/api/zaloha?zdroj=nocni']]) {
  const text = await (await req(F.zaloha, 'GET', url, undefined, U.admin2.cookie)).text();
  const z = JSON.parse(text).zaloha;
  T.t('Z2 ' + n + ': bez otisků hesel', !otiskHesla.test(text) && !(z.uzivatele || []).some(u => 'heslo' in u));
  T.t('Z3 ' + n + ': bez tajemství (TAJEMSTVI_RELACE, ADMIN_INIT_HESLO, PIPEDRIVE_TOKEN, hesla)', !TAJNE.some(x => text.includes(x)));
  T.t('Z4 ' + n + ': bez tokenů obnovy, počítadel pokusů a cache Pipedrive', !/obnova-[0-9a-f]{32}|"e:pokus|strop:/.test(text));
  console.log('     ' + n + ': části = ' + Object.keys(z).join(', ') + ' · podpisy: ' + (z.podpisy ? Object.keys(z.podpisy).length + ' skenů' : 'null') + ' · velikost ' + Math.round(text.length / 1024) + ' kB');
}
/* noční otisk v úložišti nese otisky hesel (záměr — nikdy neopouští server) */
const nocni = pamet.get('zalohy/' + new Date().toISOString().slice(0, 10)) || '';
console.log('     (info) noční otisk v Blobs nese otisky hesel:', otiskHesla.test(nocni), '(záměr, neopouští server)');

/* ---------- obnova: potvrzení, token, heslo ---------- */
const ob = (telo, kdo) => req(F.obnova, 'POST', '/api/obnova', telo, U[kdo || 'admin2'].cookie).then(async r => ({ st: r.status, t: await jsonOf(r) }));
const den = new Date().toISOString().slice(0, 10);
let x = await ob({ rezim: 'prepsat', zdroj: { otisk: den }, casti: ['firma'] });
T.t('O1 ostrá obnova bez potvrzení → 428', x.st === 428, x);
x = await ob({ rezim: 'prepsat', nahled: true, zdroj: { otisk: den } }, 'obch');
T.t('O2 obnova obchodníkem → 403', x.st === 403, x.st);
x = await ob({ rezim: 'prepsat', potvrzeni: 'OBNOVIT', zdroj: { otisk: den }, casti: ['uzivatele'] });
T.t('O3 účty z otisku bez hesla správce → 401 hesloSpravce', x.st === 401 && x.t.kod === 'hesloSpravce', x);
x = await ob({ rezim: 'prepsat', nahled: true, zdroj: { otisk: den }, casti: ['uzivatele'] });
T.t('O4 náhled účtů bez hesla → 200 a v odpovědi žádný otisk hesla', x.st === 200 && !otiskHesla.test(JSON.stringify(x.t)), x.st);
x = await ob({ rezim: 'prepsat', nahled: true, zdroj: { otisk: '../uzivatele/' + S.ADMIN_EMAIL } });
T.t('O5 otisk mimo tvar klíče → 400', x.st === 400, x.st);
x = await ob({ rezim: 'prepsat', nahled: true, zdroj: { otisk: 'souhrn/' + den } });
T.t('O5b otisk = souhrn/… → 400', x.st === 400, x.st);
const z1 = await ob({ faze: 'zacatek', rezim: 'doplnit', potvrzeni: 'OBNOVIT' });
T.t('O6 začátek obnovy → 200 + token', z1.st === 200 && /^[0-9a-f]{32}$/.test(z1.t.obnovaId), z1);
x = await ob({ faze: 'zacatek', rezim: 'doplnit', potvrzeni: 'OBNOVIT' }, 'admin');
T.t('O7 druhý začátek (jiný admin) za běhu → 409', x.st === 409, x.st);
console.log('     (info) 409 prozradí druhému správci obnovaId:', !!(x.t.obnovaBezi && x.t.obnovaBezi.obnovaId));
x = await ob({ faze: 'konec', obnovaId: z1.t.obnovaId }, 'admin');
T.t('O8 konec cizím správcem → 403', x.st === 403, x.st);
x = await ob({ rezim: 'doplnit', obnovaId: z1.t.obnovaId, zdroj: { otisk: den }, casti: ['firma'] }, 'admin');
T.t('O9 dávka s cizím tokenem → 403', x.st === 403, x.st);
x = await ob({ rezim: 'doplnit', potvrzeni: 'OBNOVIT', zdroj: { otisk: den }, casti: ['firma'] }, 'admin');
T.t('O10 jednorázová obnova během rozběhnuté → 409', x.st === 409, x.st);
x = await ob({ faze: 'zrusit', obnovaId: z1.t.obnovaId }, 'admin');
T.t('O11 zahození cizí obnovy jiným správcem → 200 (záměr B28)', x.st === 200, x.st);

/* ---------- SEC-N2: dva souběžné začátky ---------- */
{
  globalThis.__ZPOZDI_CTI = async (n, k) => { if (n === 'zalohy' && /^obnova-/.test(k)) await new Promise(r => setTimeout(r, 20)); };
  const [a, b] = await Promise.all([ob({ faze: 'zacatek', rezim: 'doplnit', potvrzeni: 'OBNOVIT' }), ob({ faze: 'zacatek', rezim: 'doplnit', potvrzeni: 'OBNOVIT' }, 'admin')]);
  globalThis.__ZPOZDI_CTI = null;
  T.t('O12 SEC-N2: dva souběžné začátky → právě jeden 200 ' + a.st + '/' + b.st, [a.st, b.st].filter(s => s === 200).length === 1);
  for (const t of [a, b]) if (t.st === 200) await ob({ faze: 'zrusit', obnovaId: t.t.obnovaId });
}
/* ---------- jednorázová obnova souběžně se začátkem / s jinou jednorázovou ---------- */
{
  const pred = [...pamet.keys()].filter(k => /^zalohy\/.*pred-obnovou$/.test(k));
  /* stav PŘED obnovou A: značka v názvu akce jedné zakázky (otisk dne ji nemá) */
  const kz = [...pamet.keys()].find(k => /^zakazky\/z\/2026-ZB-CN-0001/.test(k));
  const zm = JSON.parse(pamet.get(kz)); zm.nazevAkce = 'STAV-PRED-A'; pamet.set(kz, JSON.stringify(zm));
  let zdrz = true;
  globalThis.__ZPOZDI_ZAPIS = async (n, k) => { if (zdrz && n === 'zakazky' && /^z\//.test(k)) await new Promise(r => setTimeout(r, 30)); };
  const jedna = ob({ rezim: 'prepsat', potvrzeni: 'OBNOVIT', zdroj: { otisk: den }, casti: ['zakazky'] });
  await new Promise(r => setTimeout(r, 5));
  const zac = await ob({ faze: 'zacatek', rezim: 'doplnit', potvrzeni: 'OBNOVIT' }, 'admin');
  const dva = await ob({ rezim: 'prepsat', potvrzeni: 'OBNOVIT', zdroj: { otisk: den }, casti: ['zakazky'] }, 'admin');
  const j = await jedna; zdrz = false; globalThis.__ZPOZDI_ZAPIS = null;
  const po = [...pamet.keys()].filter(k => /^zalohy\/.*pred-obnovou$/.test(k));
  console.log('     jednorázová A: ' + j.st + ' (otisk ' + j.t.otiskPred + ') · začátek po dávkách během A: ' + zac.st + ' · jednorázová B během A: ' + dva.st + ' (otisk ' + dva.t.otiskPred + ')');
  console.log('     otisků „před obnovou" přibylo: ' + (po.length - pred.length) + ' (při stejné sekundě sdílejí klíč → B přepíše cestu zpátky A)');
  const cesta = JSON.parse(pamet.get('zalohy/' + j.t.otiskPred) || 'null');
  const vOtisku = cesta && cesta.zakazky && Object.values(cesta.zakazky).some(z => z && z.nazevAkce === 'STAV-PRED-A');
  console.log('     otisk „před obnovou" A (' + j.t.otiskPred + ') nese stav před A: ' + vOtisku + ' · pořídil ho: ' + (cesta && cesta.kdo));
  T.t('O13 jednorázová obnova drží zámek proti souběžnému začátku po dávkách', zac.st === 409, zac.st);
  T.t('O13b cesta zpátky obnovy A (otisk před obnovou) nese stav před A', vOtisku === true);
  T.t('O14 dvě jednorázové obnovy souběžně se vyloučí (jedna 409)', dva.st === 409, dva.st);
  if (zac.st === 200) await ob({ faze: 'zrusit', obnovaId: zac.t.obnovaId });
}
/* ---------- obnova ze souboru: klíče a obsah ---------- */
{
  const soubor = { porizena: '2026-10-01T00:00:00Z', zakazky: {} };
  const zz = zakazkaCislo('2026 - ZB - CN - 0999'); soubor.zakazky['podslozka/x.json'] = zz; soubor.zakazky['..'] = kopie(zz);
  soubor.program = JSON.parse(pamet.get('program/db')); soubor.program.platny.slevy = JSON.parse('{"minMarze":0,"stropy":{"Obchodník":1},"__proto__":{"x":1}}');
  x = await ob({ rezim: 'prepsat', potvrzeni: 'OBNOVIT', zdroj: { soubor }, casti: ['zakazky', 'program'] }, 'admin');
  const klice = [...pamet.keys()].filter(k => /zakazky\/z\/(podslozka|\.\.)/.test(k));
  console.log('     obnova ze souboru: ' + x.st + ' · zapsané klíče: ' + JSON.stringify(klice));
  const g = await req(F.zakazky, 'GET', '/api/zakazky?soubor=' + encodeURIComponent('podslozka/x.json'), undefined, U.admin2.cookie);
  const d = await req(F.zakazky, 'DELETE', '/api/zakazky?soubor=' + encodeURIComponent('podslozka/x.json'), undefined, U.admin2.cookie);
  T.t('O15 klíč s „/" ze souboru se buď nezapíše, nebo jde přes API otevřít a smazat (GET ' + g.status + ', DELETE ' + d.status + ')', !klice.some(k => k.includes('podslozka')) || (g.status === 200 && d.status === 200));
  const db = JSON.parse(pamet.get('program/db'));
  console.log('     program ze souboru: stropy Obchodník =', db.platny.slevy.stropy && db.platny.slevy.stropy['Obchodník'], '· minMarze =', db.platny.slevy.minMarze, '· __proto__ uložen:', /"__proto__"/.test(pamet.get('program/db')));
  T.t('O16 program ze souboru projde kontrolou jako /api/program (bez `__proto__`)', !/"__proto__"/.test(pamet.get('program/db')));
}
/* ---------- retence a pojistka ---------- */
{
  const r = await req(F.zaloha_vynuceno, 'POST', '/api/zaloha_vynuceno', { akce: 'kopie-disk', kopie: { soubor: 'otisk_' + den + '.json', slozka: '_Zaloha Netlify DB', velikostB: 1, sha256: 'a'.repeat(64), otisk: den, puvod: 'nocni-otisk' } }, U.admin2.cookie);
  T.t('R1 záznam kopie na Disk bez hesla správce → 401', r.status === 401, r.status);
  const r2 = await req(F.zaloha_vynuceno, 'POST', '/api/zaloha_vynuceno', { akce: 'retence-potvrdit', den }, U.admin2.cookie);
  T.t('R2 potvrzení úbytku bez varování → 409', r2.status === 409, r2.status);
  const r3 = await req(F.zaloha_vynuceno, 'POST', '/api/zaloha_vynuceno', {}, U.obch.cookie);
  T.t('R3 vynucený otisk obchodníkem → 403', r3.status === 403, r3.status);
  const a = await req(F.zaloha_vynuceno, 'POST', '/api/zaloha_vynuceno', {}, U.admin2.cookie);
  const b = await req(F.zaloha_vynuceno, 'POST', '/api/zaloha_vynuceno', {}, U.admin2.cookie);
  T.t('R4 limit vynucených otisků (1/10 min) → 200 pak 429', a.status === 200 && b.status === 429, [a.status, b.status]);
  /* žádná cesta API nemaže otisky: projdi všechny funkce, zda kdy smazaly klíč zalohy/<den> */
  const vse = [...pamet.keys()].filter(k => /^zalohy\/\d{4}-\d{2}-\d{2}$/.test(k));
  T.t('R5 noční otisk dne existuje po všech pokusech (nic ho nesmazalo)', vse.length >= 1, vse);
}
/* ---------- pojistka úbytku: obejít postupným mazáním (K9-S1) ---------- */
{
  const zal = await import('../../../netlify/lib/zalohovani.mjs');
  const nastav = (k, pz) => { pamet.set('zalohy/' + k, JSON.stringify({ porizena: k + 'T02:00:00Z', zdroj: 'nocni-otisk', zakazky: {}, uzivatele: [] }));
    pamet.set('zalohy/souhrn/' + k, JSON.stringify({ den: k, porizena: k + 'T02:00:00Z', zdroj: 'nocni-otisk', pocetZakazek: pz, pocetUctu: 5 })); };
  for (const k of [...pamet.keys()]) if (k.startsWith('zalohy/')) pamet.delete(k);
  let pocet = 100, varovani = 0;
  for (let d = 1; d <= 14; d++) {
    const k = '2026-11-' + String(d).padStart(2, '0'); pocet = Math.floor(pocet * 0.9); nastav(k, pocet);
    const v = await zal.retenceProved(k, k, Date.parse(k + 'T03:00:00Z'));
    if (v.varovani) varovani++;
  }
  console.log('     pojistka úbytku: 14 nocí po −10 % → ' + pocet + ' ze 100 zakázek, varování: ' + varovani);
  T.t('R6 pozvolný úbytek 100 → ' + pocet + ' zakázek za 14 nocí vyvolá varování (K9-S1)', varovani > 0);
}
process.exitCode = T.konec() ? 1 : 0;
