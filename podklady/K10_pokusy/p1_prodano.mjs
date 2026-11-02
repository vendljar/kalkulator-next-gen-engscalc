/* K10 #541 — P1 PRODÁNO (#540): role, obejití přes jiné cesty API, stopa,
 * controlling. Paměťové úložiště, smyšlená data, bez sítě.
 * node podklady/K10_pokusy/p1_prodano.mjs */
import { F, S, pamet, jreq, priprav, pripravData, zakazkaCislo, odesli, uloz, nacti, zmen, zk, zam, nalez, over, konec, require } from './harness.mjs';
const U = await priprav(); await pripravData(U.admin.cookie);
const OBJ = require('../../src/objednane.js'); const CTRL = require('../../src/controlling.js');
const dnes = OBJ.objDnes();
let n = 200;
const nova = async (cookie) => { const r = await uloz(odesli(zakazkaCislo('2026 - OPR - CN - 0' + (n++))), cookie || U.obch.cookie); if (r.status !== 200) throw new Error(JSON.stringify(r)); return r.soubor; };
const prodej = (datum) => a => { a.varianty[0].prodano = { datum: datum || dnes }; };

/* 1. cizí obchodník (není autor) prodá */
{ const s = await nova(); const r = await zmen(s, U.obch2.cookie, prodej(), U.admin.cookie);
  over('P1.1 cizí obchodník (ne autor) prodat nesmí → 403', r.status === 403, r);
  const r2 = await zmen(s, U.obch2.cookie, a => { a.autor = U.obch2.email; prodej()(a); }, U.admin.cookie);
  over('P1.1b cizí obchodník si nepřepíše autora a neprodá → 403', r2.status === 403, r2); }

/* 2. datum prodeje dávno v minulosti / před odesláním nabídky */
{ const s = await nova(); const r = await zmen(s, U.obch.cookie, prodej('2001-01-01'));
  const g = await nacti(s, U.admin.cookie);
  nalez('K10-S1', 'prodej s datem 2001-01-01 (před odesláním nabídky, 25 let zpět) server přijme a controlling ho vezme do dávného období',
    r.status === 200 && g.varianty[0].prodano && g.varianty[0].prodano.datum === '2001-01-01',
    { status: r.status, datum: g.varianty[0].prodano && g.varianty[0].prodano.datum, zamekKdy: g.varianty[0].zamek.kdy,
      ctrl: CTRL.ctrlRejstrikDny(g).prodej }); }

/* 3. obchodník smaže prodanou variantu / změní jí id / přesune prodej */
{ const s = await nova(); await zmen(s, U.obch.cookie, prodej());
  const r1 = await zmen(s, U.obch.cookie, a => { a.varianty[0].id = 'jine-id'; });
  over('P1.3a změna id prodané varianty obchodníkem → odmítnuto', r1.status >= 400, r1);
  const r2 = await zmen(s, U.obch.cookie, a => { const k = zam.klonujVariantu(a, a.varianty[0].id); a.varianty.splice(0, 1); });
  over('P1.3b smazání prodané varianty (zůstane klon) obchodníkem → odmítnuto', r2.status >= 400, r2);
  const r3 = await zmen(s, U.obch.cookie, a => { const k = zam.klonujVariantu(a, a.varianty[0].id); odesli({ ...a, varianty: [k] }); k.prodano = { datum: dnes }; });
  over('P1.3c druhá prodaná varianta → 400', r3.status === 400, r3);
  const r4 = await zmen(s, U.obch.cookie, a => { a.varianty[0].prodano = null; });
  over('P1.3d prodano:null obchodníkem (= odemčení) → 403', r4.status === 403, r4);
  const r5 = await zmen(s, U.obch.cookie, a => { a.varianty[0].prodano = { datum: dnes, pipedrive: { stav: 'odeslano', kdy: 'x' } }; });
  const g5 = await nacti(s, U.admin.cookie);
  over('P1.3e stav Pipedrive „odesláno" klient nepodvrhne', g5.varianty[0].prodano.pipedrive.stav === 'ceka', { r5: r5.status, pd: g5.varianty[0].prodano.pipedrive });
  const r6 = await zmen(s, U.ved.cookie, a => { a.prodejOdemknout = { varianta: 'jina', duvod: 'duvod dlouhy' }; delete a.varianty[0].prodano; });
  over('P1.3f důvod k jiné variantě odemčení neprovede → 400', r6.status === 400, r6);
  const r7 = await zmen(s, U.admin.cookie, a => { a.varianty[0].zamek = null; });
  over('P1.3g odemčení odeslané nabídky správcem při trvajícím prodeji → odmítnuto', r7.status >= 400, r7);
  const r8 = await zmen(s, U.admin.cookie, a => { const h = a.varianty[0].data.kryci = Object.assign({ hodnoty: {} }, a.varianty[0].data.kryci); h.hodnoty.cisloCN = 'X-1'; });
  over('P1.3h pole jen pro správce (cisloCN) po Prodáno ani správci → 409', r8.status === 409, r8);
  const r9 = await zmen(s, U.ved.cookie, a => { OBJ.prodOdemkni(a, a.varianty[0], 'odemceni a zmena'); a.nazevAkce = 'Jiná akce'; a.ico = '11223344'; });
  over('P1.3i odemčení + změna hlavičky v jednom požadavku → 409 (hlavička podle uložené prodané)', r9.status === 409, r9);
}

/* 4. XSS / délka v důvodu a historii */
{ const s = await nova(); await zmen(s, U.obch.cookie, prodej());
  const xss = '<img src=x onerror=alert(1)>' + 'A'.repeat(2000);
  const r = await zmen(s, U.ved.cookie, a => { OBJ.prodOdemkni(a, a.varianty[0], xss); a.prodejHistorie = [{ akce: 'prodano', kdo: '<script>', duvod: 'podvrh' }]; });
  const g = await nacti(s, U.admin.cookie);
  const h = g.prodejHistorie || [];
  over('P1.4 důvod oříznut na 500 znaků, podvržená historie zahozena (1 + 1 záznam ze serveru)', r.status === 200 && h.length === 2
    && h[1].duvod.length === 500 && h.every(x => x.kdo !== '<script>'), { st: r.status, h: h.map(x => [x.akce, x.kdo, (x.duvod || '').length]) }); }

/* 5. nová zakázka (stara = null) už prodaná — kdokoli, kdo smí ukládat */
{ const z = odesli(zakazkaCislo('2026 - OPR - CN - 0' + (n++))); z.varianty[0].prodano = { datum: '2020-02-02', kdo: 'podvrh' };
  z.prodejHistorie = [{ akce: 'odemceno', kdo: 'podvrh', duvod: 'x' }];
  const r = await uloz(z, U.obch2.cookie); const g = r.soubor ? await nacti(r.soubor, U.admin.cookie) : null;
  over('P1.5 nová zakázka přijde už prodaná: razítko kdo z relace, historie jen ze serveru',
    r.status === 200 && g.varianty[0].prodano.kdo === U.obch2.email && g.prodejHistorie.length === 1 && g.prodejHistorie[0].akce === 'prodano', { r: r.status, h: g && g.prodejHistorie }); }

/* 6. přepis (prepsat:true) a uložení bez razítka */
{ const s = await nova(); await zmen(s, U.obch.cookie, prodej());
  const g = await nacti(s, U.admin.cookie); const a = zk.importZakazka(JSON.parse(JSON.stringify(g))); delete a.varianty[0].prodano;
  const r = await uloz(a, U.obch.cookie, { prepsat: true });
  const g2 = await nacti(s, U.admin.cookie);
  over('P1.6 přepis bez razítka (prepsat:true) prodej obchodníkem neodemkne', r.status >= 400 && !!g2.varianty[0].prodano, { r: r.status, ch: r.chyba }); }

/* 7. obnova ze SOUBORU správcem — soubor bez prodeje proti DB s prodejem; soubor s podvrženou historií */
{ const s = await nova(); await zmen(s, U.obch.cookie, prodej());
  const g = await nacti(s, U.admin.cookie); const a = JSON.parse(JSON.stringify(g)); delete a.varianty[0].prodano;
  a.prodejHistorie = [];
  const zal = (await jreq(F.zaloha, 'GET', '/api/zaloha', undefined, U.admin.cookie)).zaloha;
  const klic = Object.keys(zal.zakazky || {}).find(k => k.includes(s.replace(/\.json$/, '')));
  zal.zakazky[klic] = a;
  const r = await jreq(F.obnova, 'POST', '/api/obnova', { zdroj: { soubor: zal }, rezim: 'prepsat', casti: ['zakazky'], potvrzeni: 'OBNOVIT' }, U.admin.cookie);
  const g2 = await nacti(s, U.admin.cookie);
  over('P1.7 obnova ze souboru bez prodeje: prodej v DB zůstane (bez důvodu se neodemkne)', !!g2.varianty[0].prodano && (g2.prodejHistorie || []).length >= 1,
    { st: r.status, chyba: r.chyba, klic, casti: JSON.stringify(r.casti && r.casti.zakazky || r).slice(0, 300) }); }

/* 8. controlling: prodej z Prodáno, ne objednané */
{ const s = await nova(); await zmen(s, U.obch.cookie, prodej('2026-10-01'));
  const g = await nacti(s, U.admin.cookie); const p = CTRL.ctrlRejstrikDny(g);
  over('P1.8 controlling (rejstřík) bere datum prodeje z Prodáno', p.prodej && p.prodej.den === '2026-10-01', p); }
konec();
