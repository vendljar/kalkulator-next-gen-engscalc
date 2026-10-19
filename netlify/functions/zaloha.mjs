/* GET /api/zaloha — kompletní JSON otisk online databáze (program + zakázky
 * + uživatelé bez otisků hesel). Jen Administrátor. Tohle je zdroj pro
 * „odlévání" na Disk Google: aplikace nabídne uložení souboru rovnou do
 * připojené složky na Disku (File System Access), takže záloha končí tam,
 * kde ji chce uživatel mít — verzovaná jménem s datem. */
import { uloziste, vyzadujRoli, json, hostitel } from '../lib/sdilene.mjs';
import { zalohaDoplnky, posledniNocniOtisk, otiskProDisk } from '../lib/zalohovani.mjs';

export default async (req) => {
  const { chyba } = await vyzadujRoli(req, 'Administrátor');
  if (chyba) return chyba;
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
