/* P1 (K13-N53, test 13. kola 24. 9. 2026) — přípona první varianty.
 *
 * Nová zakázka zakládala první variantu BEZ pole `pripona`. Když obchodník
 * udělal klon dřív, než zakázku poprvé uložil, dostal klon .2 a při importu
 * (klient i server) vzal zajistiZamek první variantu jako „chybějící" —
 * a protože už jiná varianta příponu měla, dal jí první volné číslo nad
 * maximem, tedy .3. Vytištěná nabídka „…555" se tím v aplikaci změnila na
 * „…555.3" a server obchodníkovi uložení odmítl (B56: číslo odeslané
 * nabídky smí změnit jen administrátor), administrátorovi zámek přepsal. */
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
global.vypocet = eng.vypocet; global.DEFAULT_ZADANI = eng.DEFAULT_ZADANI; global.DEFAULT_CENIK = ZC.zkusebniCenik();
const ep = require('./engine_proj.js');
global.DEFAULT_ZADANI_PROJ = ep.DEFAULT_ZADANI_PROJ; global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const tsm = require('./techspec.js');
global.TECHSPEC_DEF = tsm.TECHSPEC_DEF; global.tsHodnota = tsm.tsHodnota; global.DEFAULT_TECHSPEC = tsm.DEFAULT_TECHSPEC;
const sl = require('./sleva.js');
global.slevaPodil = sl.slevaPodil; global.slevaDefault = sl.slevaDefault;
const zk = require('./zakazka.js');
global.novaVarianta = zk.novaVarianta; global.novaVariantaData = zk.novaVariantaData;
global.aktivniVarianta = zk.aktivniVarianta; global.ridiciVarianta = zk.ridiciVarianta;
global.zakazkaUnikatniId = zk.zakazkaUnikatniId; global.slevaRozhodnutiZahod = zk.slevaRozhodnutiZahod;
const zm = require('./zamek.js');
global.zajistiZamek = zm.zajistiZamek;
global.variantaCislo = zm.variantaCislo; global.variantaUzamcena = zm.variantaUzamcena;
global.dokumentZamyka = zm.dokumentZamyka; global.dokumentPopis = zm.dokumentPopis;

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
const pres = z => zk.importZakazka(JSON.parse(JSON.stringify(z)));   // „uložení" = import jako na serveru

/* Sled 1: nová zakázka → klon → import. */
{
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 9136';
  test('nová zakázka: první varianta má příponu 0 hned od založení', z.varianty[0].pripona === 0, z.varianty[0].pripona);
  const k = zm.klonujVariantu(z, z.varianty[0].id);
  test('klon před prvním uložením dostane .2', k.pripona === 2, k.pripona);
  const u = pres(z);
  test('po importu má varianta 1 holé číslo', zm.variantaCislo(u, u.varianty[0]) === '2026 - OPR - CN - 9136',
    zm.variantaCislo(u, u.varianty[0]));
  test('po importu má klon .2', zm.variantaCislo(u, u.varianty[1]) === '2026 - OPR - CN - 9136.2',
    zm.variantaCislo(u, u.varianty[1]));
  const u2 = pres(u);
  test('opakovaný import nic nemění', u2.varianty[0].pripona === 0 && u2.varianty[1].pripona === 2 && u2.priponaMax === 2,
    [u2.varianty.map(v => v.pripona), u2.priponaMax]);
}

/* Sled 2: nová zakázka → tisk varianty 1 (zámek) → klon → import: číslo v zámku drží. */
{
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 9140';
  const v1 = z.varianty[0];
  zm.zamkniVariantu(v1, { typ: 'nabidka', cislo: zm.variantaCislo(z, v1), cisloPapir: true });
  test('zámek varianty 1 nese holé číslo', v1.zamek.cislo === '2026 - OPR - CN - 9140', v1.zamek.cislo);
  zm.klonujVariantu(z, v1.id);
  const u = pres(z);
  test('po importu zůstává číslo v zámku beze změny', u.varianty[0].zamek && u.varianty[0].zamek.cislo === '2026 - OPR - CN - 9140',
    u.varianty[0].zamek);
  test('po importu varianta 1 dál tiskne holé číslo (= papír)',
    zm.variantaCislo(u, u.varianty[0]) === u.varianty[0].zamek.cislo, zm.variantaCislo(u, u.varianty[0]));
}

/* Zakázka uložená starším klientem (varianta 1 bez přípony, klon .2, schéma 2)
 * — tvar, jaký dnes leží na serveru u zakázek, kde se klonovalo před uložením
 * a pak neuložilo. Import ji musí srovnat na 0, ne na .3. */
{
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 1';
  delete z.varianty[0].pripona;
  zm.klonujVariantu(z, z.varianty[0].id);
  const u = pres(z);
  test('stará podoba (varianta 1 bez přípony + klon .2): varianta 1 dostane 0', u.varianty[0].pripona === 0,
    u.varianty.map(v => v.pripona));
}

/* Pojistky, které oprava nesmí rozbít. */
{
  /* 0 už má jiná varianta (první smazaná, na indexu 0 je varianta přidaná
   * mimo klonujVariantu) — číslo se neopakuje, jde nad maximum. */
  const z = zk.novaZakazka(); z.cislo = 'X';
  const v2 = zk.novaVarianta('Varianta 2'); v2.pripona = 0;
  const v1 = z.varianty[0]; delete v1.pripona;
  z.varianty = [v1, v2];
  const u = pres(z);
  test('0 už obsazená → varianta bez přípony na indexu 0 dostane číslo nad maximem',
    u.varianty[0].pripona > 0 && u.varianty[1].pripona === 0, u.varianty.map(v => v.pripona));
}
{
  /* Varianta bez přípony NE na indexu 0 dál jde nad maximum. */
  const z = zk.novaZakazka(); z.cislo = 'X';
  zm.klonujVariantu(z, z.varianty[0].id);
  const v3 = zk.novaVarianta('Varianta 3'); z.varianty.push(v3);
  const u = pres(z);
  test('varianta bez přípony na dalším místě dostane .3', u.varianty[2].pripona === 3, u.varianty.map(v => v.pripona));
}
{
  /* Zakázka před #320 (bez schématu) se přečísluje podle pořadí jako dřív. */
  const z = zk.novaZakazka(); z.cislo = 'X';
  zm.klonujVariantu(z, z.varianty[0].id);
  delete z.priponySchema; z.varianty[0].pripona = 5; z.varianty[1].pripona = 1;
  const u = pres(z);
  test('bez schématu: migrace podle pořadí (0, 2)', u.varianty[0].pripona === 0 && u.varianty[1].pripona === 2,
    u.varianty.map(v => v.pripona));
}

/* Nález a oprava dat v aplikaci (Nastavení → Databáze, 25. 9. 2026). */
{
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 7';
  zm.klonujVariantu(z, z.varianty[0].id);
  z.varianty[0].pripona = 3;                     // stav po chybě K13-N53
  const n = zm.priponaPrvniNalez(z);
  test('nález: první varianta s .3 se najde', n && n.pripona === 3 && !n.zamcena && !n.holeZabrane, n);
  const r = zm.priponaPrvniOprav(z);
  test('oprava: první varianta dostane holé číslo', r.opraveno && z.varianty[0].pripona === 0
    && zm.variantaCislo(z, z.varianty[0]) === '2026 - OPR - CN - 7', r);
  test('oprava: klon zůstane .2', z.varianty[1].pripona === 2);
  test('po opravě už nález nic nehlásí', zm.priponaPrvniNalez(z) === null);
  test('v pořádku zakázka: oprava nic nedělá', zm.priponaPrvniOprav(z).opraveno === false);
}
{
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 8';
  z.varianty[0].pripona = 3;
  zm.zamkniVariantu(z.varianty[0], { typ: 'nabidka', cislo: '2026 - OPR - CN - 8.3' });
  const r = zm.priponaPrvniOprav(z);
  test('odeslaná varianta se neopravuje (nejdřív odemknout)', !r.opraveno && /odemknout/.test(r.duvod)
    && z.varianty[0].pripona === 3, r);
}
{
  const z = zk.novaZakazka(); z.cislo = 'X';
  const k = zm.klonujVariantu(z, z.varianty[0].id);
  z.varianty[0].pripona = 3; k.pripona = 0;       // holé číslo drží klon
  const r = zm.priponaPrvniOprav(z);
  test('holé číslo u jiné varianty: neopravuje se (dvě stejná čísla)', !r.opraveno && z.varianty[0].pripona === 3, r);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
