/* NÁLEZY 18. KOLA TESTOVÁNÍ (K18, 30. 9. 2026) — Word nabídky PROJ, překlady
 * cizojazyčných nabídek. Každý oddíl hlídá jeden nález; bez jeho opravy
 * testy oddílu selžou.
 *
 *   N92 — Word PROJ neukázal cenu geodetického zaměření (šablona PROJ v3 pro
 *         ni nemá místo), CELKEM ji přitom obsahoval: u zakázky P09 bylo ve
 *         Wordu vidět 18 200 Kč, CELKEM 41 600 Kč. Blok ceny v šabloně PROJ v4
 *         hlídá test_sablona_proj_v4.js; tady je kontrola „cenaWordProj",
 *         která se ozve, když šablona cenu nabízené činnosti nemá kam dát,
 *         a stažení symbolů šablony i kvůli oceněnému geodetu.
 *
 * Spuštění: cd src && node test_k18_nalezy.js */
const fs = require('fs');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./preklad.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const EP = nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./firma.js');
nacti('./plan_plateb.js');
const NP = nacti('./nabidka_proj.js');
const zk = nacti('./zakazka.js');
nacti('./zamek.js');
nacti('./kryci.js');
nacti('./kryci_proj.js');
nacti('./sablony_online.js');
const K = require('./kontroly.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info.slice(0, 700) : JSON.stringify(info).slice(0, 700))); } };
global.NAST = { firma: global.firmaDefault() };

/* ======================= N92: cena činnosti ve Wordu ======================= */
{
  /* Symboly skutečné šablony PROJ v3 (Sablona_NABIDKA_PROJ.docx, K18). */
  const V3 = ['ADRESA', 'BLOK_NAVIC_KON', 'BLOK_NAVIC_ZAC', 'CISLO_NABIDKY', 'DATUM', 'NAZEV_AKCE', 'OBJEDNATEL',
    'OBJEDNATEL_KONTAKT', 'PODM_PLATNOST_NABIDKY', 'PODM_SPLATNOST_DNI_CISLO', 'POPIS_ZAMERU', 'PROJ_CELKEM_BEZ_DPH',
    'PROJ_CENA_AD', 'PROJ_CENA_DPS', 'PROJ_CENA_DPZ', 'PROJ_CENA_EZC', 'PROJ_CENA_IC', 'PROJ_CENA_KOLAUDACE',
    'PROJ_CENA_PRED_SLEVOU', 'PROJ_CENA_SP1', 'PROJ_CENA_SP2', 'PROJ_CENA_SP3', 'PROJ_CENA_VARIANTA', 'PROJ_CENA_ZAMERENI',
    'PROJ_DPH_SAZBA', 'PROJ_POLOZKY_NAVIC', 'PROJ_SLEVA_KC', 'PROJ_SLEVA_PROC', 'UVODNI_FOTO', 'UVOD_NABIDKY_PROJ',
    'ZPRAC_EMAIL', 'ZPRAC_JMENO', 'ZPRAC_PODPIS', 'ZPRAC_TEL'];
  const sablona = (symboly, verze) => ({ typ: 'nabidkaProj', verze: verze || 3, nazev: 'Sablona_NABIDKA_PROJ_v3.docx', symboly });
  /* Zakázka jako P09: studie až kolaudace z výchozího zadání a k nim geodet. */
  const zakazka = (geodetKc, uprav) => {
    const z = zk.novaZakazka(); z.cislo = '2026 - OVP - CN - 0409';
    const v = z.varianty[0];
    v.data.proj.cenik = ZC.zkusebniCenikProj();
    v.data.proj.cenik.fixy.geodet = geodetKc || 0;
    if (uprav) uprav(v.data.proj.zadani);
    return { z, v, r: EP.vypocetProj(v.data.proj.zadani, v.data.proj.cenik) };
  };
  const nalez = (ctx) => K.kontrolyProved(ctx).nalezy.find(n => n.kod === 'cenaWordProj');

  const pravidlo = K.kontrolyPravidla().find(p => p.kod === 'cenaWordProj');
  test('N92: pravidlo cenaWordProj je v katalogu a je to varování (dokument nezastaví)', !!pravidlo && !pravidlo.zabranaMozna, pravidlo);

  const p09 = zakazka(19500);
  const n1 = nalez({ projVysledek: p09.r, sablonaNabidkaProj: sablona(V3) });
  test('N92: oceněný geodet a šablona v3 → varování', !!n1 && n1.uroven === K.KONTROLY_UROVEN, n1);
  test('N92: věta jmenuje činnost, chybějící symbol, šablonu i nápravu (PROJ v4)',
    !!n1 && /GEODETICKÉ ZAMĚŘENÍ/.test(n1.text) && /\{\{PROJ_CENA_GEODET\}\}/.test(n1.text)
    && /Sablona_NABIDKA_PROJ_v3/.test(n1.text) && /verze 3/.test(n1.text) && /CELKEM/.test(n1.text) && /PROJ v4/.test(n1.text), n1 && n1.text);
  test('N92: text je bez částek (vidí ho každý)', !!n1 && !/\d\s?\d{3}/.test(n1.text), n1 && n1.text);
  test('N92: šablona v4 (blok {{PROJ_CENA_GEODET_BLOK}}) je v pořádku',
    !nalez({ projVysledek: p09.r, sablonaNabidkaProj: sablona(V3.concat('PROJ_CENA_GEODET_BLOK', 'CENA_GEODET_ZAC', 'CENA_GEODET_KON'), 4) }));
  test('N92: šablona se symbolem {{PROJ_CENA_GEODET}} je v pořádku taky',
    !nalez({ projVysledek: p09.r, sablonaNabidkaProj: sablona(V3.concat('PROJ_CENA_GEODET')) }));
  const bezGeodetu = zakazka(0);
  test('N92: bez oceněného geodetu šablona v3 nic nehlásí', !nalez({ projVysledek: bezGeodetu.r, sablonaNabidkaProj: sablona(V3) }));
  test('N92: neznámá šablona = mlčí (nehádá se)', !nalez({ projVysledek: p09.r, sablonaNabidkaProj: null })
    && !nalez({ projVysledek: p09.r, sablonaNabidkaProj: sablona([]) }));
  test('N92: zakázka jen OCK mlčí', !nalez({ projVysledek: p09.r, sablonaNabidkaProj: sablona(V3), jenOck: true })
    && !nalez({ projVysledek: p09.r, sablonaNabidkaProj: sablona(V3), zak: { jenOck: true } }));
  const nDps = nalez({ projVysledek: bezGeodetu.r, sablonaNabidkaProj: sablona(V3.filter(s => s !== 'PROJ_CENA_DPS')) });
  test('N92: vlastní šablona bez {{PROJ_CENA_DPS}} u oceněné DPS → varování jmenuje DPS',
    !!nDps && /DPS – DOKUMENTACE PRO PROVEDENÍ STAVBY/.test(nDps.text) && /\{\{PROJ_CENA_DPS\}\}/.test(nDps.text) && !/GEODET/.test(nDps.text), nDps && nDps.text);
  /* Zaměření: „část 1" studie ho ukáže, dokud se studie nenabízí. */
  const jenSp1 = V3.filter(s => s !== 'PROJ_CENA_ZAMERENI');
  const zam = zakazka(0, zad => {
    zad.sekce.forEach(s => (s.polozky || []).forEach(p => { p.vyrazeno = s.key !== 'zamereni'; }));
    zad.sekce.find(s => s.key === 'zamereni').polozky.forEach(p => { p.vyrazeno = false; });
  });
  test('příprava: zakázka jen na zaměření má oceněné jen zaměření',
    zam.r.sekce.filter(s => s.celkem > 0).map(s => s.key).join(',') === 'zamereni', zam.r.sekce.filter(s => s.celkem > 0).map(s => s.key));
  test('N92: jen zaměření a šablona s {{PROJ_CENA_SP1}} bez {{PROJ_CENA_ZAMERENI}} — cenu ukáže „část 1", mlčí',
    !nalez({ projVysledek: zam.r, sablonaNabidkaProj: sablona(jenSp1) }));
  const zamSt = zakazka(0, zad => { zad.sekce.find(s => s.key === 'zamereni').polozky.forEach(p => { p.vyrazeno = false; }); });
  test('N92: zaměření se studií — „část 1" nese jen odkaz, bez {{PROJ_CENA_ZAMERENI}} se ozve',
    !!nalez({ projVysledek: zamSt.r, sablonaNabidkaProj: sablona(jenSp1) }));

  /* Smysl pravidla: ozve se PRÁVĚ TEHDY, když se částky činností, které Word
   * ukáže, nesečtou do CELKEM (před slevou — šablona v3 slevu vypisuje). */
  const soucetSedi = (z) => {
    const mapa = NP.NABIDKA_PROJ_CENA_SYMBOL;
    if (!mapa) return null;                          // bez mapy symbolů není co počítat
    const c = NP.nabidkaProjCeny(z.v, 'cz');
    const vidi = k => [mapa[k], mapa[k] + '_BLOK'].some(s => V3.includes(s));
    const vse = NP.NABIDKA_PROJ_SEKCE.reduce((a, k) => a + (c.cenyPred[k] || 0), 0);
    const vWordu = NP.NABIDKA_PROJ_SEKCE.reduce((a, k) => a + (vidi(k) ? (c.cenyPred[k] || 0) : 0), 0);
    return Math.abs(vse - vWordu) < 0.005;
  };
  test('N92: P09 (s geodetem) — ve Wordu v3 se částky do CELKEM nesečtou a pravidlo svítí', soucetSedi(p09) === false && !!n1);
  test('N92: bez geodetu se sečtou a pravidlo mlčí', soucetSedi(bezGeodetu) === true && !nalez({ projVysledek: bezGeodetu.r, sablonaNabidkaProj: sablona(V3) }));

  /* Bez mapy symbolů (modul nabídky PROJ chybí, třeba na serveru) se nehádá. */
  const mapa = global.NABIDKA_PROJ_CENA_SYMBOL;
  delete global.NABIDKA_PROJ_CENA_SYMBOL;
  test('N92: bez mapy symbolů pravidlo mlčí', !nalez({ projVysledek: p09.r, sablonaNabidkaProj: sablona(V3) }));
  global.NABIDKA_PROJ_CENA_SYMBOL = mapa;

  /* Symboly šablony se stahují na pozadí jen, když je co hlídat — nově
   * i kvůli oceněnému geodetu (ui/kontroly_ui.js). */
  const kod = fs.readFileSync(__dirname + '/ui/kontroly_ui.js', 'utf8');
  const stazeno = [];
  global.sablonyOnlineAktivni = () => true;
  global.onlineSablonaMeta = typ => (typ === 'nabidkaProj' ? { verze: 3, nazev: 'Sablona_NABIDKA_PROJ_v3.docx' } : null);
  global.onlineSablonaStahni = typ => { stazeno.push(typ); return new Promise(() => {}); };
  global.docxTextSablony = () => [];
  const ui = new Function(kod + '\nreturn { kontrolySablonaNabidkaProj };')();
  ui.kontrolySablonaNabidkaProj(null, bezGeodetu.r, 'cz');
  test('N92: bez slevy, vlastních položek, plánu i geodetu se šablona nestahuje', stazeno.length === 0, stazeno);
  ui.kontrolySablonaNabidkaProj(null, p09.r, 'cz');
  test('N92: s oceněným geodetem se šablona PROJ stáhne (pravidlo pak ví, co v ní je)', stazeno.indexOf('nabidkaProj') >= 0, stazeno);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
