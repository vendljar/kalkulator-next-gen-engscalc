/* Ověření v prohlížeči: technická specifikace se řídí cenou (22. 9. 2026
 * večer, rozhodnutí J. V. k P8/6 a P8/7).
 *
 * Proč harness a ne jen jednotkový test: počítání a hraniční případy hlídá
 * `src/test_specifikace_cena.js`. Tady jde o to, co uvidí obchodník:
 *   – statika je na obrazovce jen ke čtení a říká, kde se zapíná,
 *   – ruční hodnota ze starší zakázky se nesmaže, ale je vidět, že neplatí,
 *   – řádek „LEŠENÍ KOLEM OCK…" u lešení v ceně do tisku nejde,
 *   – vnější lešení je u interiérové šachty mezi příplatky.
 *
 * Spuštění: node overit_specifikace_cena.mjs
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const KOREN = fileURLToPath(new URL('.', import.meta.url));
const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + JSON.stringify(detail))); }
};

const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
const konzole = [];
p.on('pageerror', e => konzole.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') konzole.push('error: ' + m.text()); });
await p.goto(KDE);
await p.waitForTimeout(600);

/* Zkušební ceník ze `src/zkusebni_cenik.js` — sestavení nese samé nuly
 * a ze statiky za nulu se stav „v ceně" od „vypnutá" nepozná podle částky. */
const { createRequire } = await import('module');
const ZC = createRequire(import.meta.url)(KOREN + 'src/zkusebni_cenik.js');
await p.evaluate(([c, cp]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  NAST.jeAdmin = true;
  ZAK = novaZakazka(); syncVarianta(); render();
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);
await p.waitForTimeout(250);

console.log('\nTechnická specifikace se řídí cenou');

/* Najde na obrazovce specifikace řádek podle popisku. */
const radekSpec = (popisek) => p.evaluate((lbl) => {
  prepniTab('spec'); render();
  const r = [...document.querySelectorAll('#page-spec .spec-row')]
    .find(x => (x.querySelector('.lbl') || {}).textContent === lbl);
  if (!r) return null;
  const odv = r.querySelector('.spec-odvozene');
  return { text: r.textContent.replace(/\s+/g, ' ').trim(),
           /* Hodnota odvozeného pole zvlášť — vysvětlivka pod ní obsahuje
            * slova „ano" i „ne" a text celého řádku by kontrolu zamlžil. */
           hodnota: odv ? odv.textContent.trim() : null,
           maVstup: !!r.querySelector('select, input'),
           noprint: r.classList.contains('noprint') };
}, popisek);

/* ---------- 1) statika v ceně: jen ke čtení, „ano", s vysvětlením ---------- */
const s1 = await radekSpec('OVĚŘOVACÍ STATICKÝ VÝPOČET KONSTRUKCE');
zkus('řádek statiky je na obrazovce', !!s1);
zkus('a nejde přepsat (žádný rozbalovací seznam ani pole)', s1 && s1.maVstup === false, s1);
zkus('se statikou v ceně ukazuje „ano"', s1 && s1.hodnota === 'ano', s1);
zkus('a říká, kde se statika zapíná', s1 && /Řídí se cenou/.test(s1.text), s1 && s1.text);

/* ---------- 2) statika vypnutá množstvím 0 → „ne" ---------- */
await p.evaluate(() => { prepniTab('kalk'); mnozstviSet('STATICKÉ POSOUZENÍ', 0); render(); });
const s2 = await radekSpec('OVĚŘOVACÍ STATICKÝ VÝPOČET KONSTRUKCE');
zkus('po vypnutí statiky v kalkulaci ukazuje specifikace „ne"', s2 && s2.hodnota === 'ne', s2);

/* ---------- 3) ruční hodnota ze starší zakázky: zůstane, ale neplatí ---------- */
await p.evaluate(() => { TS.hodnoty.statika = 'ano'; render(); });
const s3 = await radekSpec('OVĚŘOVACÍ STATICKÝ VÝPOČET KONSTRUKCE');
zkus('ruční „ano" bez statiky v ceně se ukáže jako neplatné',
  s3 && /Ruční hodnota „ano“ se nepoužije/.test(s3.text), s3 && s3.text);
zkus('a v datech zůstává (nic se nemaže)', await p.evaluate(() => TS.hodnoty.statika === 'ano'));
const tisk = await p.evaluate(() => {
  const d = nabidkaData(ZAK, aktivniVarianta(ZAK), JEKLY, 'cz');
  return d.placeholders.TS_STATIKA;
});
zkus('do nabídky jde „ne" podle ceny, ne ruční „ano"', tisk === 'ne', tisk);
await p.evaluate(() => {
  delete TS.hodnoty.statika;
  prepniTab('kalk'); mnozstviSet('STATICKÉ POSOUZENÍ', '');
  render();
});

/* ---------- 4) lešení v základní ceně: řádek „LEŠENÍ KOLEM OCK" do tisku nejde ---------- */
await p.evaluate(() => { Z.typSachty = 'exteriérová'; Z.volitelne.leseniVnejsi = true; render(); });
const l1 = await radekSpec('LEŠENÍ KOLEM OCK PRO PROVEDENÍ OPLÁŠTĚNÍ');
zkus('s lešením v ceně je řádek na obrazovce označený „do dokumentu se nedává"',
  l1 && /do dokumentu se nedává/.test(l1.text), l1 && l1.text);
zkus('a do tisku specifikace nejde', l1 && l1.noprint === true, l1);
const nab1 = await p.evaluate(() => {
  const d = nabidkaData(ZAK, aktivniVarianta(ZAK), JEKLY, 'cz');
  return nabidkaNahledSekce(d.placeholders, 'cz')
    .find(s => s.sekce === 'SOUČÁSTÍ DODÁVKY NENÍ').radky.map(r => r[0]);
});
zkus('ani do náhledu nabídky', nab1.indexOf('LEŠENÍ KOLEM OCK PRO PROVEDENÍ OPLÁŠTĚNÍ') < 0, nab1);

await p.evaluate(() => { Z.volitelne.leseniVnejsi = false; render(); });
const l2 = await radekSpec('LEŠENÍ KOLEM OCK PRO PROVEDENÍ OPLÁŠTĚNÍ');
zkus('bez lešení v ceně je řádek zpátky a dá se měnit', l2 && l2.maVstup === true && l2.noprint === false, l2);

/* ---------- 5) interiérová šachta: vnější lešení mezi příplatky ---------- */
await p.evaluate(() => { Z.typSachty = 'interiérová'; Z.volitelne.leseniVnejsi = true; prepniTab('kalk'); render(); });
const int = await p.evaluate(() => {
  const r = spocitejVariantu(aktivniVarianta(ZAK)).ock;
  return {
    priplatek: (r.priplatky || []).some(x => x.key === 'leseniVnejsi'),
    vZaklade: (r.volitelneKatalog || []).some(x => x.key === 'leseniVnejsi'),
    /* innerHTML, ne innerText: administrátor má u názvů pole pro přejmenování
     * a hodnota inputu v innerText není. */
    naObrazovce: /LEŠENÍ - vnější/.test(document.getElementById('page-kalk').innerHTML),
  };
});
zkus('u interiérové šachty je vnější lešení mezi příplatky', int.priplatek, int);
zkus('ne v základní ceně', !int.vZaklade, int);
zkus('a obchodník ho v kalkulaci vidí', int.naObrazovce, int);

/* ---------- 6) ZAMĚŘENÍ 3D SKENEREM se řídí cenou (rozhodnutí J. V. 30. 9. 2026) ----------
 * Položka ZAMĚŘENÍ 3D SKENEREM v Režii Kalkulace OCK měla množství 0,
 * specifikace přitom dál tvrdila „ano". Teď je pole odvozené jako statika:
 * jen ke čtení, s vysvětlením, a ruční hodnota ze starší zakázky neplatí. */
await p.evaluate(() => { delete TS.hodnoty.sken3d; prepniTab('kalk'); mnozstviSet('ZAMĚŘENÍ 3D SKENEREM', ''); render(); });
const k1 = await radekSpec('ZAMĚŘENÍ PROSTORŮ 3D SKENEREM');
zkus('3D sken v ceně: řádek je jen ke čtení a ukazuje „ano"',
  k1 && k1.maVstup === false && k1.hodnota === 'ano', k1);
zkus('a říká, kde se zaměření vypíná (Režie, množstvím 0), se štítkem „z kalkulace"',
  k1 && /Řídí se cenou/.test(k1.text) && /Režie/.test(k1.text) && /z kalkulace/.test(k1.text), k1 && k1.text);
await p.evaluate(() => { prepniTab('kalk'); mnozstviSet('ZAMĚŘENÍ 3D SKENEREM', 0); render(); });
const k2 = await radekSpec('ZAMĚŘENÍ PROSTORŮ 3D SKENEREM');
zkus('po vypnutí 3D skenu množstvím 0 ukazuje specifikace „ne"', k2 && k2.hodnota === 'ne', k2);
await p.evaluate(() => { TS.hodnoty.sken3d = 'ano'; render(); });
const k3 = await radekSpec('ZAMĚŘENÍ PROSTORŮ 3D SKENEREM');
zkus('ruční „ano" bez skenu v ceně se ukáže jako neplatné',
  k3 && k3.hodnota === 'ne' && /Ruční hodnota „ano“ se nepoužije/.test(k3.text), k3 && k3.text);
const k4 = await p.evaluate(() => {
  const d = nabidkaData(ZAK, aktivniVarianta(ZAK), JEKLY, 'cz');
  const c = kryciCtx(ZAK, aktivniVarianta(ZAK), JEKLY);
  return { nabidka: d.placeholders.TS_SKEN3D, kryci: c.sken3d, vDatech: TS.hodnoty.sken3d };
});
zkus('do nabídky jde „ne" a krycí list (Zaměření strojovna) říká „Ne"',
  k4.nabidka === 'ne' && k4.kryci === 'Ne', k4);
zkus('ruční hodnota v datech zůstala (nic se nemaže)', k4.vDatech === 'ano', k4);
/* Řádek krycího listu (J. V. 30. 9. 2026: „když je v kalkulaci 0, tak je
 * v krycím listu položka automaticky ve stavu ne"): ani „Ano" kliknuté
 * v krycím listu dřív kalkulaci nepřebije — řádek je jen ke čtení. */
await p.evaluate(() => { prepniTab('kryci'); klSet('zamereniStrojovna', 'Ano'); render(); });
const k4b = await p.evaluate(() => {
  const r = [...document.querySelectorAll('#page-kryci .kl-row')]
    .find(x => /Zaměření strojovna/.test((x.querySelector('.lbl') || {}).textContent || ''));
  if (!r) return null;
  const radia = [...r.querySelectorAll('input[type=radio]')];
  const word = kryciData(ZAK, aktivniVarianta(ZAK), JEKLY, 'bo').sekce
    .reduce((a, s) => a.concat(s.radky), []).find(x => x[0] === 'Zaměření strojovna');
  return { zaskrtnuto: (radia.find(x => x.checked) || {}).value,
    jenCist: radia.length === 2 && radia.every(x => x.disabled), text: r.innerText, word: word && word[1] };
});
zkus('krycí list: dřívější ruční „Ano" neplatí, řádek ukazuje „Ne" jen ke čtení',
  k4b && k4b.zaskrtnuto === 'Ne' && k4b.jenCist && /neplatí/.test(k4b.text), k4b);
zkus('a Word krycího listu tiskne „Ne"', k4b && k4b.word === 'Ne', k4b);
await p.evaluate(() => { klReset('zamereniStrojovna'); });
await p.evaluate(() => { delete TS.hodnoty.sken3d; prepniTab('kalk'); mnozstviSet('ZAMĚŘENÍ 3D SKENEREM', ''); render(); });
const k5 = await radekSpec('ZAMĚŘENÍ PROSTORŮ 3D SKENEREM');
zkus('po vrácení množství je zpátky „ano"', k5 && k5.hodnota === 'ano', k5);

zkus('za celý průchod nevznikla chyba v konzoli', konzole.length === 0, konzole);
await b.close();
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
