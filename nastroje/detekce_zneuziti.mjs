/* DETEKCE DŘÍVĚJŠÍHO OBCHÁZENÍ SCHVALOVÁNÍ V ZÁLOZE DATABÁZE
 * (jednorázový nástroj, 29. 9. 2026 — B111 a B96, třída „koncová cena
 * bez schválení").
 *
 * PROČ
 * Do opravy B111 přijal server vlastní položku se zápornou cenou nebo
 * množstvím, záporné hodiny i záporné přepisy, do opravy B96 krok
 * obchodního zaokrouhlení mimo výčet — obchodník tak mohl snížit cenu
 * nabídky bez schválení a beze stopy v dokumentu. Oprava brání novým
 * případům; tenhle skript najde ty, které už v databázi leží (i ve
 * variantách zamčených = odeslaných, které server jako doklad neposuzuje).
 *
 * CO DĚLÁ A CO NEDĚLÁ
 *   – JEN ČTE soubor zálohy (Nastavení → Databáze → „Zálohovat teď", nebo
 *     noční otisk stažený jako JSON). Nic neodesílá, nic nepřepisuje.
 *   – Používá tytéž funkce jako server (src/uloziste.js), takže hlásí
 *     přesně to, co by dnes server odmítl.
 *   – Vypíše zakázku, variantu, zda je zamčená (odeslaná) a cesty k polím.
 *
 * SPUŠTĚNÍ (J. V.)
 *   node nastroje/detekce_zneuziti.mjs <zaloha.json> [--json]
 * Soubor může být celá záloha ({ zakazky: { soubor: zakázka } }) nebo
 * jedna zakázka ({ varianty: [...] }). Návratový kód 0 = nic nenalezeno,
 * 1 = nalezeno, 2 = soubor nejde přečíst. */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ULO = require('../src/uloziste.js');

/* Kontroly, které skript umí. Každá dostane variantu a vrátí [{ kde, duvod }]. */
const KONTROLY = [
  { kod: 'B111', nazev: 'záporná částka, množství nebo hodiny',
    najdi: (v) => ULO.uloZaporneVZadani(v.data.ock && v.data.ock.zadani, v.data.proj && v.data.proj.zadani)
      .filter(p => p.duvod === 'zaporne') },
  /* B96: krok nebo směr obchodního zaokrouhlení mimo výčet (ZAOKR_KROKY,
   * ZAOKR_SMERY) — do opravy server přijal jakékoli kladné číslo a krok
   * ⌊cena/2⌋+1 srazil cenu nabídky na polovinu. */
  { kod: 'B96', nazev: 'obchodní zaokrouhlení mimo nabídku',
    najdi: (v) => [['zaokr', v.data.zaokr], ['zaokrProj', v.data.zaokrProj]]
      .filter(([, z]) => ULO.uloZaokrVadne(z))
      .map(([k, z]) => ({ kde: k + ': krok ' + JSON.stringify(z && z.krok) + ', směr ' + JSON.stringify(z && z.smer) })) },
];

export function detekuj(zaloha) {
  const zakazky = zaloha && Array.isArray(zaloha.varianty) ? { '(zakázka)': zaloha }
    : (zaloha && zaloha.zakazky && typeof zaloha.zakazky === 'object' ? zaloha.zakazky : {});
  const nalezy = [];
  Object.keys(zakazky).forEach(soubor => {
    const z = zakazky[soubor];
    if (!z || !Array.isArray(z.varianty)) return;
    z.varianty.forEach(v => {
      if (!v || !v.data || typeof v.data !== 'object') return;
      KONTROLY.forEach(k => {
        let mista = [];
        try { mista = k.najdi(v); } catch (e) { mista = [{ kde: 'chyba čtení: ' + e.message }]; }
        if (mista.length) nalezy.push({ kontrola: k.kod, nazev: k.nazev, soubor, cislo: z.cislo || '',
          varianta: String(v.nazev || v.id || '?'), zamcena: !!(v.zamek && v.zamek.zamceno),
          autor: z.autor || '', upravil: z.upravil || '', mista: mista.map(m => m.kde) });
      });
    });
  });
  return nalezy;
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const soubor = process.argv[2];
  if (!soubor) { console.error('Použití: node nastroje/detekce_zneuziti.mjs <zaloha.json> [--json]'); process.exit(2); }
  let data;
  try { data = JSON.parse(readFileSync(soubor, 'utf8')); }
  catch (e) { console.error('Soubor nejde přečíst: ' + e.message); process.exit(2); }
  const nalezy = detekuj(data);
  if (process.argv.includes('--json')) console.log(JSON.stringify(nalezy, null, 2));
  else if (!nalezy.length) console.log('Nic nenalezeno — žádná varianta nenese to, co by dnešní server odmítl.');
  else {
    nalezy.forEach(n => console.log(`[${n.kontrola}] ${n.cislo || n.soubor} · varianta ${n.varianta}`
      + (n.zamcena ? ' · ZAMČENÁ (odeslaná)' : '') + ` · ${n.nazev}\n    ${n.mista.join('\n    ')}`
      + (n.upravil ? `\n    naposledy upravil: ${n.upravil}` : '')));
    console.log(`\nNalezeno: ${nalezy.length} (zamčených ${nalezy.filter(n => n.zamcena).length}).`);
  }
  process.exit(nalezy.length ? 1 : 0);
}
