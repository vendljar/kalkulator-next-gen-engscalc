/* GET /api/zaloha — kompletní JSON otisk online databáze (program + zakázky
 * + uživatelé bez otisků hesel). Jen Administrátor. Tohle je zdroj pro
 * „odlévání" na Disk Google: aplikace nabídne uložení souboru rovnou do
 * připojené složky na Disku (File System Access), takže záloha končí tam,
 * kde ji chce uživatel mít — verzovaná jménem s datem. */
import { uloziste, vyzadujRoli, json, hostitel } from '../lib/sdilene.mjs';
import { zalohaDoplnky, posledniNocniOtisk, otiskProDisk, posledniNocniKlic, zalohaStrana, zdrojZivy,
  zdrojZObjektu, jeOtiskPoCastech, ctiOtiskCast, ctiOtisk } from '../lib/zalohovani.mjs';

export default async (req) => {
  const { chyba } = await vyzadujRoli(req, 'Administrátor');
  if (chyba) return chyba;
  /* PO STRÁNKÁCH (#522 Z1): `?strana=1[&po=…]` — celá databáze se do jedné
   * odpovědi (~6 MB) u engscalc nevejde. Bez `strana` zůstává dřívější
   * celá odpověď (malé databáze a starší aplikace: ta by stránku nesložila
   * a uložila by neúplnou zálohu — radši ať selže celá). */
  const q = new URL(req.url).searchParams;
  if (q.get('strana')) return strankovane(req, q);
  /* KOPIE NA DISK (#151 N6, 19. 10. 2026): `?zdroj=nocni` vrátí poslední
   * NOČNÍ otisk očištěný pro Disk (bez otisků hesel a bez podpisů —
   * rozhodnutí J. V.). Není-li za posledních 7 dní žádný, vrátí aktuální
   * stav v témž tvaru; `puvod` říká, co to je. */
  if (new URL(req.url).searchParams.get('zdroj') === 'nocni') {
    const n = await posledniNocniOtisk();
    if (n) return json({ ok: true, puvod: 'nocni-otisk', otisk: n.klic,
      zaloha: { ...otiskProDisk(n.otisk), web: hostitel(req) || 'neznámý web' } });
    const ted = await (await zalohaTed(req)).json();
    return json({ ok: true, puvod: 'aktualni-stav', otisk: null, zaloha: otiskProDisk(ted.zaloha) });
  }
  return zalohaTed(req);
};

/* Stránka zálohy (#522). Ke stažení: aktuální stav bez otisků hesel (jako
 * zalohaTed). `zdroj=nocni`: poslední noční otisk očištěný pro Disk
 * (otiskProDisk), u otisku po částech jedna část = jedna stránka; klíč
 * otisku přijde v první odpovědi a další stránky ho posílají (`otisk=`),
 * aby se mezi stránkami nepřeskočilo na jiný otisk. */
async function strankovane(req, q) {
  const po = q.get('po') || '';
  const web = hostitel(req) || 'neznámý web';
  if (q.get('zdroj') === 'nocni') {
    const zadany = q.get('otisk');
    if (zadany && !/^\d{4}-\d{2}-\d{2}$/.test(zadany)) return json({ ok: false, chyba: 'Neplatný klíč otisku.' }, 400);
    const klic = zadany || (po ? null : await posledniNocniKlic());
    if (klic) {
      const s = await uloziste('zalohy');
      const m = await s.cti(klic);
      if (!m) return json({ ok: false, chyba: 'Otisk ' + klic + ' mezitím zmizel — začněte kopii znovu.' }, 404);
      if (jeOtiskPoCastech(m)) {
        const i = po ? parseInt(po, 10) : 0;
        if (!Number.isInteger(i) || i < 0 || i >= m.casti) return json({ ok: false, chyba: 'Neplatná stránka otisku.' }, 400);
        const cast = await ctiOtiskCast(s, klic, i);
        /* otiskProDisk doplní účty [] a podpisy null i do části, která je
         * nenese — složení by je přepsalo; vrací se jen to, co část nese. */
        const c = otiskProDisk(cast);
        const zaloha = {};
        for (const k of Object.keys(c)) if (Object.prototype.hasOwnProperty.call(cast, k) && k !== 'podpisy') zaloha[k] = c[k];
        if (i === 0) Object.assign(zaloha, { podpisy: null, web });
        return json({ ok: true, puvod: 'nocni-otisk', otisk: klic, zaloha,
          dalsi: i + 1 < m.casti ? String(i + 1) : null, stran: m.casti });
      }
      const st = await zalohaStrana(zdrojZObjektu(otiskProDisk(await ctiOtisk(s, klic))), po, { proDisk: true });
      if (!po) Object.assign(st.zaloha, { porizena: m.porizena, zdroj: m.zdroj, kdo: m.kdo || '', web });
      return json({ ok: true, puvod: 'nocni-otisk', otisk: klic, ...st });
    }
    const st = await zalohaStrana(zdrojZivy(), po, { proDisk: true });
    if (!po) Object.assign(st.zaloha, { porizena: new Date().toISOString(), zdroj: web });
    return json({ ok: true, puvod: 'aktualni-stav', otisk: null, ...st });
  }
  const st = await zalohaStrana(zdrojZivy(), po);
  if (!po) Object.assign(st.zaloha, { porizena: new Date().toISOString(), zdroj: web });
  return json({ ok: true, ...st });
}

async function zalohaTed(req) {
  const sProg = await uloziste('program');
  const prog = await sProg.cti('db');
  /* Firemní údaje jsou od 4. 8. 2026 taky online (obchodník složku nemapuje),
   * takže patří do zálohy stejně jako ceník — jinak by se po obnově vrátila
   * ukázková firma ze sestavení. */
  const firma = await sProg.cti('firma');
  const zak = await uloziste('zakazky');
  const klice = await zak.seznam('z/');
  const zakazky = {};
  for (const k of klice) zakazky[k.slice(2)] = await zak.cti(k);
  const rejstrik = await zak.cti('_rejstrik');
  const uziv = await uloziste('uzivatele');
  const uzivatele = [];
  for (const k of await uziv.seznam()) {
    const x = await uziv.cti(k);
    if (x) uzivatele.push({ email: x.email, jmeno: x.jmeno, role: x.role, aktivni: x.aktivni !== false });
  }
  /* Centrální šablony dokumentů (#139) patří do zálohy CELÉ, včetně souborů
   * všech verzí: po obnově musí jít vytisknout nabídku toutéž šablonou jako
   * před výpadkem — a doložit i starší verze. Base64 v JSONu přidá k záloze
   * stovky kB, což za jistotu obnovy stojí. */
  const sab = await uloziste('sablony');
  const sablony = {};
  for (const k of await sab.seznam()) sablony[k] = await sab.cti(k);
  /* zdroj = web, ze kterého záloha vznikla. Bere se z požadavku; do 7. 9. 2026
   * tu byla napevno doména schaftscalc, takže zálohy z engscalc.netlify.app
   * tvrdily, že jsou odjinud — a při obnově by nešlo poznat, ze kterého
   * webu soubor je. */
  return json({ ok: true, zaloha: {
    porizena: new Date().toISOString(), zdroj: hostitel(req) || 'neznámý web',
    program: prog || null, firma: firma || null,
    rejstrik: rejstrik || null, zakazky, uzivatele,
    sablony: Object.keys(sablony).length ? sablony : null,
    ...(await zalohaDoplnky()) } });          // zobrazeni, zakaznici, podpisy (B9, 22. 8. 2026)
}
export const config = { path: '/api/zaloha' };
