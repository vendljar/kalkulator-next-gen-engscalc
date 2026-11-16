/* VZ-E1 #600 — úkol z revize E0 (N2, koordinace 16. 11. 2026):
 *  1) variantu, na kterou ukazuje některý zákazník, nejde smazat
 *     (varSmaz v ui/zakazka_ui.js → hláška „Na variantu ukazuje zákazník X —
 *     nejdřív mu přiřaďte jinou variantu nebo ho odstraňte."), varianta bez
 *     zákazníka se smaže jako dřív;
 *  2) import, který zahodil vadná data víc zákazníků (`vzZahozeno`), se ohlásí
 *     (vzZahozenoVarovani; volá ji načtení ze souboru, ze složky i online —
 *     po vzoru fotoZahozena).
 * Pojistka: na e29f2b1 (před N2) selže — varSmaz variantu zákazníka smaže
 * a funkce vzSmazaniVariantyDuvod / vzZahozenoVarovani neexistují.
 * Spuštění: cd src && node test_vz_n2.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./preklad.js');
nacti('./docxgen.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./podminky.js');
nacti('./firma.js');
nacti('./plan_plateb.js');
const zk = nacti('./zakazka.js');
nacti('./zamek.js');
const VZ = nacti('./vice_zakazniku.js');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 300)); } };

/* Funkce z ui/zakazka_ui.js vyříznuté podle jména (soubor je obrazovka). */
const ui = fs.readFileSync(path.join(__dirname, 'ui', 'zakazka_ui.js'), 'utf8');
const vyrez = (jm) => {
  const i = ui.search(new RegExp('(async )?function ' + jm + '\\('));
  if (i < 0) return '';
  const j = ui.indexOf('\n}\n', i);
  return ui.slice(i, j + 2);
};
let hlasky = [];
global.hlaska = (t) => { hlasky.push(String(t)); return Promise.resolve(); };
global.potvrd = () => Promise.resolve(true);
global.render = () => {};
global.syncVarianta = () => {};
global.smiZobrazit = () => false;
vm.runInThisContext(['vzSmazaniVariantyDuvod', 'vzZahozenoVarovani', 'vzPoNacteniVarovani', 'varSmaz'].map(vyrez).join('\n'));
test('funkce N2 jsou v ui/zakazka_ui.js', typeof vzSmazaniVariantyDuvod === 'function' && typeof vzZahozenoVarovani === 'function');   // eslint-disable-line no-undef

const zakazka = () => {
  const z = zk.novaZakazka();
  z.objednatel = 'ALFA s.r.o. (smyšlené)';
  const v2 = ZM_klon(z);
  return { z, v2 };
};
function ZM_klon(z) { return klonujVariantu(z, z.varianty[0].id, { aktivovat: false }); }   // eslint-disable-line no-undef

(async () => {
  /* 1) zábrana smazání varianty se zákazníkem */
  {
    const { z, v2 } = zakazka();
    const r = VZ.vzPridej(z, { objednatel: 'BETA a.s. (smyšlené)' }, {});
    z.dalsiZakaznici[0].varianta = v2.id;   // BETA ukazuje na variantu 2
    global.ZAK = z; hlasky = [];
    await varSmaz(v2.id);   // eslint-disable-line no-undef
    test('varianta, na kterou ukazuje další zákazník, se nesmaže', r.ok && z.varianty.some(v => v.id === v2.id));
    test('… hláška jmenuje zákazníka a říká, co udělat', hlasky.length === 1
      && hlasky[0] === 'Na variantu ukazuje zákazník BETA a.s. (smyšlené) — nejdřív mu přiřaďte jinou variantu nebo ho odstraňte.', hlasky);
    hlasky = [];
    const rid = z.varianty[0].id;
    await varSmaz(rid);   // eslint-disable-line no-undef
    test('řídící variantu (řídící zákazník) taky ne', z.varianty.some(v => v.id === rid) && /ALFA s\.r\.o\./.test(hlasky[0] || ''), hlasky);
    const v3 = ZM_klon(z);
    hlasky = [];
    await varSmaz(v3.id);   // eslint-disable-line no-undef
    test('varianta bez zákazníka se smaže jako dřív', !z.varianty.some(v => v.id === v3.id) && !hlasky.length, hlasky);
  }
  /* jeden zákazník (bez dat VZ): beze změny proti dnešku */
  {
    const { z, v2 } = zakazka();
    global.ZAK = z; hlasky = [];
    test('jeden zákazník: žádná zábrana', vzSmazaniVariantyDuvod(z, z.varianty[0].id) === '');   // eslint-disable-line no-undef
    await varSmaz(v2.id);   // eslint-disable-line no-undef
    test('jeden zákazník: smazání varianty jako dřív', !z.varianty.some(v => v.id === v2.id) && !hlasky.length, hlasky);
  }
  /* 2) varování po importu s vadnými daty víc zákazníků */
  {
    const z = zk.novaZakazka();
    VZ.vzPridej(z, { objednatel: 'BETA a.s. (smyšlené)' }, {});
    z.dalsiZakaznici.push({ id: 'z2', pismeno: 'B', hlavicka: { objednatel: 'duplicitní id' }, varianta: z.varianty[0].id });
    const imp = zk.importZakazka(JSON.parse(JSON.stringify(z)));
    test('import vadný tvar zahodí a nese vzZahozeno', !('dalsiZakaznici' in imp) && Array.isArray(imp.vzZahozeno) && imp.vzZahozeno.length > 0, imp.vzZahozeno);
    const t = vzZahozenoVarovani(imp.vzZahozeno);   // eslint-disable-line no-undef
    test('varování říká, že údaje dalších zákazníků byly odebrány', /dalších zákazníků/.test(t) && /odebrány/.test(t), t);
    test('varování nenese názvy ani údaje zákazníků', !/BETA|duplicitní/.test(t), t);
    test('bez vad žádné varování', vzZahozenoVarovani(undefined) === '' && vzZahozenoVarovani([]) === '');   // eslint-disable-line no-undef
    const cista = zk.importZakazka(JSON.parse(JSON.stringify(zk.novaZakazka())));
    test('čistá zakázka nemá vzZahozeno', cista.vzZahozeno === undefined);
  }
  /* napojení na tři cesty načtení */
  {
    const src = n => fs.readFileSync(path.join(__dirname, 'ui', n), 'utf8');
    test('načtení ze souboru hlásí vzZahozeno i přesměrování', /vzPoNacteniVarovani\(ZAK\)/.test(src('common.js')));
    test('načtení ze složky hlásí vzZahozeno i přesměrování', /vzPoNacteniVarovani\(zak\)/.test(src('uloziste_ui.js')));
    test('online otevření hlásí vzZahozeno i přesměrování', /vzPoNacteniVarovani\(ZAK\)/.test(src('online_ui.js')));
  }
  /* 3) dorevize E0 D2: zákazník ukazuje na neexistující variantu */
  {
    const z = zk.novaZakazka();
    z.objednatel = 'ALFA s.r.o. (smyšlené)';
    const v2 = ZM_klon(z);
    VZ.vzPridej(z, { objednatel: 'BETA a.s. (smyšlené)' }, {});
    VZ.vzPridej(z, { objednatel: 'GAMA s.r.o. (smyšlené)' }, {});
    z.dalsiZakaznici[0].varianta = v2.id;
    const data = JSON.parse(JSON.stringify(z));
    data.varianty = data.varianty.filter(v => v.id !== v2.id);   // varianta BETA v souboru chybí
    const imp = zk.importZakazka(data);
    test('D2: import zákazníka přesměruje na řídící variantu', imp.dalsiZakaznici && imp.dalsiZakaznici[0].varianta === imp.varianty.find(v => v.ridici).id);
    const t = vzPoNacteniVarovani(imp);   // eslint-disable-line no-undef
    test('D2: upozornění „Zákazník X přešel na řídící variantu — mění se mu cena."',
      t === 'Zákazník BETA a.s. (smyšlené) přešel na řídící variantu — mění se mu cena.', t);
    test('D2: vzPresmerovano je nevýčtové (do souboru se nezapíše)', !Object.keys(imp).includes('vzPresmerovano'));
    /* data v paměti (bez importu): vzSrovnej po načtení */
    const z2 = JSON.parse(JSON.stringify(z));
    z2.dalsiZakaznici[1].varianta = 'neexistuje';
    const t2 = vzPoNacteniVarovani(z2);   // eslint-disable-line no-undef
    test('D2: vzSrovnej po načtení opraví ukazatel a ohlásí ho', z2.dalsiZakaznici[1].varianta === z2.varianty.find(v => v.ridici).id
      && /^Zákazník GAMA s\.r\.o\. \(smyšlené\) přešel na řídící variantu — mění se mu cena\.$/.test(t2), t2);
    test('D2: bez chybného ukazatele žádné upozornění', vzPoNacteniVarovani(zk.importZakazka(JSON.parse(JSON.stringify(z)))) === '');   // eslint-disable-line no-undef
  }
  console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
})();
