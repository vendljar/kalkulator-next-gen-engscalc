// Společné pomůcky zkoušek VZD a BZ (22. 11. 2026) na TESTU — nad d3_spolecne.js.
// Zápis jen do zakázek „TEST - …" (filtr v d3_spolecne), /api/pd* blokováno kromě /api/pd/nanecisto bez dealId.
const fs = require('fs');
const S = require('./d3_spolecne');
const SP = process.env.KNG_SP || '/tmp/claude-0/sp';
// Druhý háček po přihlášení: zprávy lišty online (onlineZprava) a hlášky uložení (zakUlozeniZprava).
async function hacky(P) {
  await P.E(() => { window.__oz = [];
    if (!window.__ozPuv && typeof onlineZprava === 'function') { window.__ozPuv = onlineZprava; window.onlineZprava = (t, typ) => { window.__oz.push(String(t)); return window.__ozPuv(t, typ); }; }
    if (!window.__zuPuv && typeof zakUlozeniZprava === 'function') { window.__zuPuv = zakUlozeniZprava; window.zakUlozeniZprava = (t, typ) => { if (t) window.__oz.push('ULOŽENÍ: ' + String(t)); return window.__zuPuv(t, typ); }; }
    window.__ozBer = () => { const x = window.__oz; window.__oz = []; return x; }; });
}
async function prohlizec(OUT, role) {
  const dir = OUT + '/' + role; fs.mkdirSync(dir, { recursive: true });
  const P = await S.otevriProhlizec(dir, role === 'obchodnik' ? 'obchodnik' : 'spravce');
  await hacky(P);
  const puvF5 = P.F5; P.F5 = async () => { await puvF5(); await hacky(P); };
  // Uložení s HTTP stavem a textem odpovědi (bez e-mailů) + zprávy lišty.
  P.ulozX = async (L, popis) => { if (!/^TEST - /.test(await P.E(() => ZAK.cislo || ''))) throw new Error('ukládání mimo TEST zakázku zastaveno');
    await P.E(() => window.__ozBer()); const n = P.zap.length; const ok = await P.E(async () => { try { return await onlineUloz(); } catch (e) { return 'výjimka ' + e.message; } }); await P.W(3500);
    const http = P.zap.slice(n).filter(x => /\/api\/zakazky/.test(x) || /ODPOVĚĎ/.test(x));
    const r = { ok, http, lista: (await P.E(() => window.__ozBer())).map(t => t.replace(/[\w.+-]+@[\w.-]+/g, '<email>').slice(0, 300)), hl: (await P.E(() => window.__hlBer())).filter(x => !/Uloženo online/.test(x)).slice(0, 4) };
    if (L) L('uložení', popis, r); return r; };
  // Rejstřík obnovit, když číslo (založené jinou relací) ještě nezná.
  const puvOtevri = P.otevri; P.otevri = async (cislo) => { if (!(await P.E(c => ONLINE_STAV.rejstrik.some(z => z.cislo === c), cislo))) { await P.E(() => onlineNactiRejstrik()); await P.W(2500); }
    const s = await puvOtevri(cislo); if (!s) throw new Error('nenalezeno v rejstříku ' + cislo); return s; };
  P.otevriRe = async (re) => { const c = await P.E(r => (ONLINE_STAV.rejstrik.find(z => new RegExp(r).test(z.cislo)) || {}).cislo, re); if (!c) throw new Error('nenalezeno ' + re); await P.otevri(c); return c; };
  return P;
}
// První volné číslo TEST ≥ od (obě řady v rejstříku).
const volne = (P, rada, od, kolik) => P.E(({ rada, od, kolik }) => { const out = []; for (let n = od; out.length < kolik && n < od + 200; n++) { const c = 'TEST - 2026 - ' + rada + ' - CN - ' + n; if (!ONLINE_STAV.rejstrik.some(z => z.cislo === c)) out.push(c); } return out; }, { rada, od, kolik });
// Nová zakázka z dat aktivní varianty zdrojové zakázky (rejstřík, jen čtení zdroje), bez slev a bez ručních hodnot KL.
const zaloz = (P, zdrojRe, cislo, akce, h, volby) => P.E(async ({ zdrojRe, cislo, akce, h, volby }) => {
  const z = ONLINE_STAV.rejstrik.find(x => new RegExp(zdrojRe).test(x.cislo)); if (!z) throw new Error('zdroj nenalezen ' + zdrojRe);
  const d = await (await fetch('/api/zakazky?soubor=' + encodeURIComponent(z.soubor), { credentials: 'include' })).json(); const zk = d.zakazka || d;
  const v0 = zk.varianty.find(x => String(x.id) === String(zk.aktivni)) || zk.varianty[0]; const kop = JSON.parse(JSON.stringify(v0.data));
  ZAK = novaZakazka(); syncVarianta(); ONLINE_STAV.soubor = ''; ONLINE_STAV.razitko = ''; ONLINE_STAV.posledni = '';
  Object.assign(ZAK, { cislo, nazevAkce: akce, adresa: 'Zkušební 22, 100 00 Praha', jenProj: !!zk.jenProj, jenOck: !!zk.jenOck }, h || {});
  if (volby && volby.jenProj !== undefined) ZAK.jenProj = volby.jenProj;
  // Čistá varianta: platný ceník z novaZakazka, ze zdroje jen rozměry OCK, zadání PROJ a technická specifikace
  // (celá data zdroje nesou starší ceník a řádky „nepočítat", které smí jen správce — 403 u obchodníka).
  const v = aktivniVarianta(ZAK);
  const ROZ = ['prejezd', 'zdvih', 'prohluben', 'sirka', 'hloubka', 'nastupiste', 'nastupisteA', 'nastupisteC', 'patra', 'typSachty', 'typPortalu', 'zaskleni', 'roztec', 'rohoveSloupky'];
  if (kop.ock && kop.ock.zadani) for (const k of ROZ) if (kop.ock.zadani[k] !== undefined) v.data.ock.zadani[k] = kop.ock.zadani[k];
  if (kop.proj && kop.proj.zadani) v.data.proj.zadani = kop.proj.zadani;
  if (kop.techspec) v.data.techspec = kop.techspec;
  syncVarianta(); if (typeof zamekCteniJe === 'function' && zamekCteniJe()) zamekCteniOdemkniUI(); render();
  return { cislo: ZAK.cislo, jenProj: !!ZAK.jenProj, jenOck: !!ZAK.jenOck, zdrojJenProj: !!zk.jenProj, variant: zk.varianty.length };
}, { zdrojRe, cislo, akce, h, volby });
// Platné IČO (mod 11) z prvních 7 číslic.
const ico = s7 => { const d = String(s7).split('').map(Number); const sum = d.reduce((a, x, i) => a + x * (8 - i), 0); return s7 + String((11 - sum % 11) % 10); };
const bezEmailu = s => String(s).replace(/[\w.+-]+@[\w.-]+/g, '<email>');
module.exports = Object.assign({}, S, { prohlizec, volne, zaloz, ico, bezEmailu, SP });
