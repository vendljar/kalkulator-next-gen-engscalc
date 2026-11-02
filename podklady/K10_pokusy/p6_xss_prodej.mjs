/* K10 #541 — P6 ULOŽENÉ XSS v kartě Prodej (#540): historie, důvod, kdo,
 * datum a náhled zápisu do Pipedrive. Karta se vyrenderuje ve vm (sod_ui.js
 * s esc z common.js a skutečnými objednane.js / zamek.js) nad zakázkou se
 * škodlivými hodnotami tak, jak by je mohl vrátit server (i obejitím klienta).
 * node podklady/K10_pokusy/p6_xss_prodej.mjs */
import { over, konec, require, zk, zam } from './harness.mjs';
import fs from 'node:fs'; import vm from 'node:vm';
const P = '<img src=x onerror=alert(1)>';
const ctx = { console, require, module: undefined };
vm.createContext(ctx);
const src = (f) => fs.readFileSync(new URL('../../src/' + f, import.meta.url), 'utf8');
const common = src('ui/common.js');
const esc = /const esc = [\s\S]*?;\n/.exec(common)[0] + /const escJs = [\s\S]*?;\n/.exec(common)[0];
vm.runInContext(esc.replace(/^const /gm, 'var '), ctx);
for (const f of ['objednane.js']) vm.runInContext(src(f).replace(/if \(typeof module[\s\S]*$/, ''), ctx);
Object.assign(ctx, { variantaProdana: zam.variantaProdana, variantaCislo: zam.variantaCislo, aktivniVarianta: zk.aktivniVarianta || ((z) => z.varianty[0]),
  hlaska() {}, render() {}, ONLINE_STAV: { ja: { email: 'x', role: 'Vedoucí' } } });
vm.runInContext(src('ui/sod_ui.js'), ctx);
const z = { cislo: '2026 - OPR - CN - 0601', aktivni: 'v1', varianty: [{ id: 'v1', nazev: P, data: {}, zamek: { zamceno: true, kdy: '2026-10-01T10:00:00.000Z', typ: 'nabidka', cislo: '2026 - OPR - CN - 0601' } }] };
z.varianty[0].prodano = { datum: '2026-10-01', kdo: P, kdy: P, pipedrive: { stav: P } };
z.prodejHistorie = [{ akce: P, varianta: P, cislo: P, datum: P, duvod: P, kdo: P, kdy: P }, { akce: 'odemceno', cislo: P, datum: '2026-10-02', duvod: '"><svg onload=alert(2)>', kdo: P, kdy: P }];
z.pdDealId = P;
ctx.ZAK = z;
let html = '';
try { html = vm.runInContext("prodejKarta('ock')", ctx); } catch (e) { html = 'VÝJIMKA ' + e.message; }
over('P6.1 karta Prodej se vyrenderuje', html.length > 200 && !html.startsWith('VÝJIMKA'), html.slice(0, 200));
over('P6.2 žádný surový <img/<svg z dat zakázky v kartě Prodej (a payload je tam escapovaný)', !/<img|<svg/i.test(html) && html.includes('&lt;img'), (html.match(/.{40}<(img|svg).{40}/i) || [''])[0]);
z.varianty[0].prodano = undefined; delete z.varianty[0].prodano;
let html2 = ''; try { html2 = vm.runInContext("prodejKarta('ock')", ctx); } catch (e) { html2 = 'VÝJIMKA ' + e.message; }
over('P6.3 neprodaná karta (formulář + historie) bez surového HTML z dat', !/<img|<svg/i.test(html2) && !html2.startsWith('VÝJIMKA'), html2.slice(0, 200));
konec();
