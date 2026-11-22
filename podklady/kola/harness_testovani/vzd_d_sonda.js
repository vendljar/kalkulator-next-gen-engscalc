// VZD (d) sonda — jen čtení: odkud nabídka PROJ u TEST 7650-K29-N50 bere řádek termínu DPZ (podmínky firmy / snímek varianty).
const H = require('./vzd_spolecne'); const OUT = (process.env.KNG_SP || H.SP) + '/sonda'; const { L, konec } = H.start(OUT);
(async () => { const A = await H.prohlizec(OUT, 'spravce');
  await A.otevriRe('7650 - K29-N50');
  L('d sonda', JSON.stringify(await A.E(() => { const v = aktivniVarianta(ZAK); const ef = nabidkaProjPodmEf(); const t = (((ef || {}).nabidkaProj || {}).terminy || {}).cz || [];
    const dv = v.data && v.data.podminky; const snimek = v.data && (v.data.podminkySnimek || (v.zamek && v.zamek.podminky));
    return { radkyDpz: t.filter(x => /DPZ/.test(x[0] || '')).map(x => ({ cinnost: x[0], termin: String(x[1]).slice(0, 80), klic: x[2] === undefined ? '(bez klíče)' : x[2], stare: x[3] })),
      firmaMaPodminky: !!(NAST && NAST.firma && NAST.firma.podminky), firmaTerminy: !!(NAST && NAST.firma && NAST.firma.podminky && NAST.firma.podminky.nabidkaProj && NAST.firma.podminky.nabidkaProj.terminy),
      variantaPodminky: dv ? Object.keys(dv) : null, snimek: !!snimek, nabiziStudie: nabidkaProjNabizi(v)('studie'), nabiziDpz: nabidkaProjNabizi(v)('dpz'), klice: Object.keys(v.data || {}) }; }), null, 1));
  konec(); await A.b.close(); })().catch(e => { console.error(e); konec(); process.exit(1); });
