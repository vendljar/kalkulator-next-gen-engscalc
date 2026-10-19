/* ============================================================
 * PLATEBNÍ A SMLUVNÍ PODMÍNKY FIRMY (#367 fáze 2, V8, 19. 10. 2026)
 *
 * Rozhodnutí J. V. 19. 10. 2026: „Varianta B + z kódu vše převést do Firma.
 * Nechceme mít tato data natvrdo v kódu." Výchozí hodnoty krycích listů OCK
 * a PROJ (splatnost, záloha a splátky, zádržné, záruka, pokuty, limit pokut)
 * do té doby stály jako literály v prefillech kryci.js, kryci_proj.js
 * a nabidka_proj.js. Teď je nese záznam Firma (NAST.firma.podminky) a edituje
 * je administrátor v Nastavení → Smlouvy / Šablony (přepínač OCK | PROJ).
 *
 * V KÓDU ZŮSTÁVÁ JEDINÁ KOPIE DNEŠNÍCH HODNOT — PODMINKY_VYCHOZI níže. Je to
 * továrna pro prázdné Nastavení (nová instalace, starší _nastaveni.json,
 * starší online záznam firmy), stejně jako DEFAULT_FIRMA. Sloučení s Firmou
 * se dělá PŘI ČTENÍ (podminkyEf), ne při načtení: uložená firma se při
 * načtení nahrazuje celá (konfigNahradVMiste) a klíče, které v ní nejsou,
 * by jinak zmizely — přesně tak se v produkci ztratily kapitoly IV.–VI.
 * (rozbor 19. 10. 2026, podklady/367_NASTAVENI_FIRMA_NAVRH.md kap. 8).
 *
 * Pořadí přednosti (beze změny): ruční zápis v krycím listu zakázky →
 * firemní standard (tady) → továrna. Odeslané a zamčené varianty čtou
 * zmrazené hodnoty (kryciZmrazPodminky), rozpracované bez ručního přepisu
 * převezmou změněný standard (Q2, jako plán plateb PROJ).
 *
 * Modul je čistá logika bez DOM: prohlížeč, server (/api/firma přes
 * firmaLzeZverejnit) i testy (test_podminky.js) volají tentýž kód.
 * ============================================================ */

/* Továrna = dnešní hodnoty z kódu (stav e3995e6), aby se výstup nezměnil. */
const PODMINKY_VYCHOZI = {
  v: 1,
  /* Číselník sazeb smluvní pokuty (dřív KRYCI_POKUTY v kryci.js a kopie
   * v kryci_proj.js). První volba je vždy bez pokuty. */
  sazbyPokut: ['0', '0,05 % / den', '0,1 % / den'],
  /* Limit smluvních pokut v % z ceny díla (dřív v textu KRYCI_LIMIT_POKUT). */
  limitPokutProc: 10,
  ock: {
    splatnostDni: 14,
    /* Volby zálohy v krycím listu; 0 = „Bez zálohy". */
    zalohyProc: [0, 30, 50, 70],
    zalohaMilnik: 'po podpisu smlouvy',
    zalohaProc: 50,
    faktura2Proc: 40,
    faktura2Milnik: 'po zahájení montáže',
    konecnaProc: 10,
    konecnaMilnik: 'po předání',
    zadrzneVan: 'Ano', zadrzneVanProc: '',
    zadrzneZaruka: 'Ne', zadrzneZarukaProc: '',
    zarukaMesicu: 60,
    pokutaDodavka: '0',
    pokutaSplatnost: '0,05 % / den',
    pokutaLimit: 'uplatnen',
  },
  proj: {
    splatnostDni: 14,
    pokutaTermin: '0',
    pokutaSplatnost: '0,05 % / den',
    pokutaLimit: 'uplatnen',
  },
};

/* SOUČET SPLÁTEK OCK ≠ 100 % (Q4, J. V. 19. 10. 2026 si nechal vysvětlit).
 * Zatím doporučené: chybný součet ZABLOKUJE zveřejnění firemních podmínek
 * (prohlížeč i server), v Nastavení svítí červený součet. Změna na „jen
 * upozornění" = přepsat tuhle jednu konstantu na false. */
const PODMINKY_SOUCET_BLOKUJE = true;

const PODMINKY_ZADRZNE_MAX = 20;
const PODMINKY_SPLATNOST_MAX = 120;
const PODMINKY_ZARUKA_MAX = 240;
const PODMINKY_MILNIK_MAX = 200;
const PODMINKY_VOLEB_MAX = 6;

/* ---------- pomocné ---------- */

function podmKopie(x) { return JSON.parse(JSON.stringify(x)); }

/* Číslo z hodnoty pole: číslo nebo text „12,5". Prázdno a nesmysl = NaN. */
function podmCislo(v) {
  if (typeof v === 'number') return v;
  const t = String(v == null ? '' : v).trim().replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(t) ? parseFloat(t) : NaN;
}
/* Procento do textu: 50 → „50", 12.5 → „12,5" (česky). */
function podmProcText(n) {
  const r = Math.round(+n * 100) / 100;
  return String(r).replace('.', ',');
}
const podmCeleVRozsahu = (v, min, max) => { const n = podmCislo(v); return Number.isInteger(n) && n >= min && n <= max; };
const podmProcPlatne = v => { const n = podmCislo(v); return isFinite(n) && n >= 0 && n <= 100 && Math.round(n * 100) === n * 100; };
const podmTextPlatny = v => typeof v === 'string' && v.trim() !== '' && v.length <= PODMINKY_MILNIK_MAX;
const podmAnoNe = v => v === 'Ano' || v === 'Ne';
const podmZadrzneProcPlatne = v => v === '' || v == null || (podmProcPlatne(v) && podmCislo(v) <= PODMINKY_ZADRZNE_MAX);
const podmLimitKod = v => v === 'uplatnen' || v === 'neuplatnen';
function podmSazbyPlatne(s) {
  if (!Array.isArray(s) || !s.length || s.length > PODMINKY_VOLEB_MAX) return false;
  if (s[0] !== '0') return false;
  if (new Set(s).size !== s.length) return false;
  return s.slice(1).every(x => typeof x === 'string' && /^\d+(,\d{1,3})? % \/ den$/.test(x));
}
function podmZalohyPlatne(z) {
  if (!Array.isArray(z) || !z.length || z.length > PODMINKY_VOLEB_MAX) return false;
  if (+z[0] !== 0) return false;
  if (new Set(z.map(Number)).size !== z.length) return false;
  return z.every(podmProcPlatne);
}

/* Pravidla jednotlivých polí: [klíč, je platné(v, celek)]. Z nich se skládá
 * jak sloučení (neplatná uložená hodnota → továrna), tak seznam vad. */
const PODMINKY_PRAVIDLA_OCK = {
  splatnostDni: v => podmCeleVRozsahu(v, 1, PODMINKY_SPLATNOST_MAX),
  zalohyProc: podmZalohyPlatne,
  zalohaMilnik: podmTextPlatny,
  zalohaProc: podmProcPlatne,
  faktura2Proc: podmProcPlatne,
  faktura2Milnik: podmTextPlatny,
  konecnaProc: podmProcPlatne,
  konecnaMilnik: podmTextPlatny,
  zadrzneVan: podmAnoNe, zadrzneVanProc: podmZadrzneProcPlatne,
  zadrzneZaruka: podmAnoNe, zadrzneZarukaProc: podmZadrzneProcPlatne,
  zarukaMesicu: v => podmCeleVRozsahu(v, 0, PODMINKY_ZARUKA_MAX),
  pokutaDodavka: (v, sazby) => sazby.indexOf(v) >= 0,
  pokutaSplatnost: (v, sazby) => sazby.indexOf(v) >= 0,
  pokutaLimit: podmLimitKod,
};
const PODMINKY_PRAVIDLA_PROJ = {
  splatnostDni: v => podmCeleVRozsahu(v, 1, PODMINKY_SPLATNOST_MAX),
  pokutaTermin: (v, sazby) => sazby.indexOf(v) >= 0,
  pokutaSplatnost: (v, sazby) => sazby.indexOf(v) >= 0,
  pokutaLimit: podmLimitKod,
};
const PODMINKY_POPISKY = {
  splatnostDni: 'splatnost (celé číslo 1–' + PODMINKY_SPLATNOST_MAX + ' dní)',
  zalohyProc: 'volby zálohy (1–' + PODMINKY_VOLEB_MAX + ' různých procent, první 0 = Bez zálohy)',
  zalohaMilnik: 'milník zálohy (text do ' + PODMINKY_MILNIK_MAX + ' znaků)',
  zalohaProc: 'výchozí záloha (0–100 %)',
  faktura2Proc: 'dílčí faktura č. 2 (0–100 %)',
  faktura2Milnik: 'milník dílčí faktury č. 2 (text do ' + PODMINKY_MILNIK_MAX + ' znaků)',
  konecnaProc: 'konečná faktura (0–100 %)',
  konecnaMilnik: 'milník konečné faktury (text do ' + PODMINKY_MILNIK_MAX + ' znaků)',
  zadrzneVan: 'zádržné do odstranění vad (Ano / Ne)',
  zadrzneVanProc: 'procento zádržného do odstranění vad (0–' + PODMINKY_ZADRZNE_MAX + ' %)',
  zadrzneZaruka: 'zádržné po dobu záruky (Ano / Ne)',
  zadrzneZarukaProc: 'procento zádržného po dobu záruky (0–' + PODMINKY_ZADRZNE_MAX + ' %)',
  zarukaMesicu: 'záruka (celé číslo 0–' + PODMINKY_ZARUKA_MAX + ' měsíců)',
  pokutaDodavka: 'pokuta za prodlení dodávky (z číselníku sazeb)',
  pokutaSplatnost: 'pokuta za prodlení splatnosti (z číselníku sazeb)',
  pokutaTermin: 'pokuta za prodlení s odevzdáním (z číselníku sazeb)',
  pokutaLimit: 'limit pokut (uplatněn / neuplatněn)',
};

/* ---------- sloučení Firmy s továrnou ---------- */

/* Platné podmínky: co je ve Firmě a projde pravidlem, jinak továrna.
 * Po polích — jedno vadné pole neshodí ostatní (zveřejnit vadné podmínky
 * stejně nejde, tohle je pojistka pro poškozená místní data). */
function podminkyEf(firma) {
  const ul = firma && typeof firma === 'object' && firma.podminky && typeof firma.podminky === 'object'
    ? firma.podminky : {};
  const T = PODMINKY_VYCHOZI;
  const sazby = podmSazbyPlatne(ul.sazbyPokut) ? ul.sazbyPokut.slice() : T.sazbyPokut.slice();
  const limit = podmCeleVRozsahu(ul.limitPokutProc, 0, 100) ? podmCislo(ul.limitPokutProc) : T.limitPokutProc;
  const cast = (k, pravidla) => {
    const zdroj = ul[k] && typeof ul[k] === 'object' && !Array.isArray(ul[k]) ? ul[k] : {};
    const out = {};
    Object.keys(T[k]).forEach(pole => {
      const v = zdroj[pole];
      const ok = v !== undefined && pravidla[pole](v, sazby);
      out[pole] = podmKopie(ok ? v : T[k][pole]);
    });
    /* Pokuta z továrny, kterou upravený číselník nezná → první sazba (0). */
    Object.keys(out).forEach(pole => {
      if (/^pokuta(?!Limit)/.test(pole) && sazby.indexOf(out[pole]) < 0) out[pole] = sazby[0];
    });
    return out;
  };
  const ef = { v: 1, sazbyPokut: sazby, limitPokutProc: limit,
    ock: cast('ock', PODMINKY_PRAVIDLA_OCK), proj: cast('proj', PODMINKY_PRAVIDLA_PROJ) };
  /* Výchozí záloha musí být mezi volbami — jinak by krycí list předvyplnil
   * hodnotu, kterou rozbalovátko nenabízí. */
  if (ef.ock.zalohyProc.map(Number).indexOf(+ef.ock.zalohaProc) < 0) ef.ock.zalohaProc = +ef.ock.zalohyProc[ef.ock.zalohyProc.length - 1];
  return ef;
}

/* Co z Firmy se liší od továrny (pro štítky „upraveno" v Nastavení). */
function podminkyUpraveno(firma, cast, pole) {
  const ef = podminkyEf(firma);
  const a = cast ? ef[cast][pole] : ef[pole];
  const b = cast ? PODMINKY_VYCHOZI[cast][pole] : PODMINKY_VYCHOZI[pole];
  return JSON.stringify(a) !== JSON.stringify(b);
}

/* ---------- texty pro krycí listy ---------- */

/* „Bez zálohy" / „50 % – po podpisu smlouvy" (znění KRYCI_ZALOHY). */
function podminkyZalohaText(ef, proc) {
  return +proc === 0 ? 'Bez zálohy' : podmProcText(proc) + ' % – ' + ef.ock.zalohaMilnik;
}
function podminkyZalohyVolby(ef) { return ef.ock.zalohyProc.map(p => podminkyZalohaText(ef, p)); }
function podminkyZalohaVychozi(ef) { return podminkyZalohaText(ef, ef.ock.zalohaProc); }
function podminkyFaktura2(ef) { return podmProcText(ef.ock.faktura2Proc) + ' % – ' + ef.ock.faktura2Milnik; }
function podminkyKonecna(ef) { return podmProcText(ef.ock.konecnaProc) + ' % – ' + ef.ock.konecnaMilnik; }
/* „Uplatněn limit 10 %" / „NEUPLATNĚN limit 10 %" (znění KRYCI_LIMIT_POKUT). */
function podminkyLimitVolby(ef) {
  const L = podmProcText(ef.limitPokutProc);
  return ['Uplatněn limit ' + L + ' %', 'NEUPLATNĚN limit ' + L + ' %'];
}
function podminkyLimitText(ef, kod) { return podminkyLimitVolby(ef)[kod === 'neuplatnen' ? 1 : 0]; }

/* ---------- součet splátek OCK (Q4) ---------- */

function podminkySoucetOck(ef) {
  const s = +ef.ock.zalohaProc + +ef.ock.faktura2Proc + +ef.ock.konecnaProc;
  const soucet = Math.round(s * 100) / 100;
  const ok = Math.abs(soucet - 100) < 0.001;
  return { soucet, ok, blokuje: !ok && PODMINKY_SOUCET_BLOKUJE };
}

/* ---------- kontrola před zveřejněním ---------- */

/* Seznam vad uložených podmínek (prázdný = v pořádku). Chybějící objekt
 * nevadí — platí továrna. Volá firmaLzeZverejnit (prohlížeč i server). */
function podminkyVady(p) {
  if (p === undefined || p === null) return [];
  if (typeof p !== 'object' || Array.isArray(p)) return ['podmínky nejsou objekt'];
  const v = [];
  if (p.sazbyPokut !== undefined && !podmSazbyPlatne(p.sazbyPokut))
    v.push('sazby pokut (1–' + PODMINKY_VOLEB_MAX + ' různých, první „0", další ve tvaru „N % / den")');
  if (p.limitPokutProc !== undefined && !podmCeleVRozsahu(p.limitPokutProc, 0, 100))
    v.push('limit pokut (celé číslo 0–100 %)');
  const sazby = podmSazbyPlatne(p.sazbyPokut) ? p.sazbyPokut : PODMINKY_VYCHOZI.sazbyPokut;
  [['ock', PODMINKY_PRAVIDLA_OCK, 'OCK'], ['proj', PODMINKY_PRAVIDLA_PROJ, 'PROJ']].forEach(([k, pravidla, jm]) => {
    if (p[k] === undefined) return;
    if (!p[k] || typeof p[k] !== 'object' || Array.isArray(p[k])) { v.push(jm + ': není objekt'); return; }
    Object.keys(p[k]).forEach(pole => {
      if (!pravidla[pole]) { v.push(jm + ': neznámé pole „' + pole + '"'); return; }
      if (!pravidla[pole](p[k][pole], sazby)) v.push(jm + ': ' + PODMINKY_POPISKY[pole]);
    });
  });
  const ef = podminkyEf({ podminky: p });
  const volby = p.ock && podmZalohyPlatne(p.ock.zalohyProc) ? p.ock.zalohyProc : PODMINKY_VYCHOZI.ock.zalohyProc;
  if (p.ock && p.ock.zalohaProc !== undefined && podmProcPlatne(p.ock.zalohaProc)
      && volby.map(Number).indexOf(+p.ock.zalohaProc) < 0)
    v.push('OCK: výchozí záloha musí být jednou z voleb zálohy');
  const s = podminkySoucetOck(ef);
  if (s.blokuje) v.push('OCK: záloha + dílčí faktura č. 2 + konečná faktura = ' + podmProcText(s.soucet) + ' %, musí dát 100 %');
  return v;
}

/* Čistá kopie pro zápis na server: jen známé klíče. */
function podminkyCiste(p) {
  if (!p || typeof p !== 'object') return null;
  const out = { v: 1 };
  if (p.sazbyPokut !== undefined) out.sazbyPokut = podmKopie(p.sazbyPokut);
  if (p.limitPokutProc !== undefined) out.limitPokutProc = p.limitPokutProc;
  [['ock', PODMINKY_PRAVIDLA_OCK], ['proj', PODMINKY_PRAVIDLA_PROJ]].forEach(([k, pravidla]) => {
    if (!p[k] || typeof p[k] !== 'object') return;
    const c = {};
    Object.keys(pravidla).forEach(pole => { if (p[k][pole] !== undefined) c[pole] = podmKopie(p[k][pole]); });
    out[k] = c;
  });
  return out;
}

/* Zápis jednoho pole (Nastavení). Vrací nový objekt podmínek. Prázdná
 * hodnota pole vrátí továrnu (klíč se odstraní). */
function podminkyNastav(p, cast, pole, hodnota) {
  const out = p && typeof p === 'object' ? podmKopie(p) : { v: 1 };
  out.v = 1;
  if (!cast) {
    if (hodnota === undefined || hodnota === '') delete out[pole]; else out[pole] = hodnota;
    return out;
  }
  out[cast] = out[cast] && typeof out[cast] === 'object' ? out[cast] : {};
  if (hodnota === undefined) delete out[cast][pole]; else out[cast][pole] = hodnota;
  if (!Object.keys(out[cast]).length) delete out[cast];
  return out;
}

/* Jeden objekt pro ostatní moduly — v prohlížeči jsou soubory v jednom
 * scope, v Node se načte přes require (vzor firmaPlanModul). */
const PODMINKY = { PODMINKY_VYCHOZI, PODMINKY_SOUCET_BLOKUJE, podminkyEf, podminkyUpraveno,
  podminkyZalohaText, podminkyZalohyVolby, podminkyZalohaVychozi, podminkyFaktura2, podminkyKonecna,
  podminkyLimitVolby, podminkyLimitText, podminkySoucetOck, podminkyVady, podminkyCiste, podminkyNastav,
  podmProcText, podmCislo };

if (typeof module !== 'undefined') module.exports = Object.assign({ PODMINKY }, PODMINKY);
