/* PROTOTYP VS (#570) — vrstva A2: smyšlený zkušební ceník (src/zkusebni_cenik.js z main) a ukázková hlavička.
 * Běží i ve srovnávacím snímku čistého main. Žádná skutečná cena ani osobní údaj. */
(function () {
const ZKUSEBNI_CENIK = {
  zkusebni: true,
  marze: 0.20, dph: 0.12,
  profilasKgKc: 100,
  powertechExt: 200, powertechInt: 200,
  montazniNosnik: 1000, lemovaniKgKc: 100,
  oplechPracKc: 500, nytKc: 10, spodniRamKc: 5000, cilkoKc: 100, mustekKc: 40000,
  zamecnikAtypKc: 800,            /* #7 – sazba atypické zámečnické práce */
  montazHodKc: 500, vetraciMrizkaKc: 5000, transportKc: 5000,
  zastreseniM2Kc: 5000, oplechFasadaBmKc: 500,
  skloBokyKc: 2000,  skloBokyNazev: 'dvojsklo čiré (zkušební)',
  skloCelniKc: 1000, skloCelniNazev: 'bezpečnostní sklo čiré (zkušební)',
  skloVsg442Kc: 1200,
  /* praceOplasteniKc, hakyKc a lakovnaListaBm mají schválně NEkulatou
   hodnotu: kulatá se náhodou shodovala se skutečnou cenou a strážce
   (zkontroluj_pred_gitem.py, kontrola 7) to po právu hlásil. */
  praceOplasteniKc: 530, plastKotvyKc: 5000, tmeleniKc: 500,
  striskaDvurKc: 10000, cestovniKc: 10000, cisteniKc: 10000,
  prechodoveKgKc: 500, leseniVnitrniKc: 1000, leseniFix: 10000,
  leseniVnejsiKc: 500, hakyKc: 530, zabradliKc: 5000, soklBmKc: 5000,
  sken3dKc: 5000, vystupZamereniKc: 10000, engineeringKc: 10000,
  projekceHodKc: 1000, statikaKc: 1000, statikaHod: 10, rezieKancelareKc: 50000,
  zaskleniListyProjHod: 4,
  stavbyvedouciHod: 40, stavbyvedouciKc: 1000,
  atypPrirazka: 0.20,
  spojovaci: { riplockM10: 5, riplockM8: 5, nordlock: 10, nytM10: 5, nytM8: 5,
               nytM6: 5, tSrouby: 100, sroubM10: 5, sroubM8: 5, sroubM6: 5,
               zavitTyc: 200, chemKotva: 200 },
  lak: { rezim: 'tomas',
         lakovnaProfilBm: 100, lakovnaListaBm: 120, lakovnaM2: 500,
         tomasProfilM2: 500, tomasListaBm: 50, tomasPlechKs: 50, tomasOplechM2: 500, tomasTercKs: 20 },
  priplatky: { vsgFolieM2: 500, sknM2: 500, medStrechaM2: 5000,
               ventilatorKc: 20000, zabranyDvereKc: 2000, madlaBmKc: 2000,
               leseniHlavaKc: 1000, montazDveriKc: 2000, prechMontKc: 1000 },
};

const ZKUSEBNI_CENIK_PROJ = {
  zkusebni: true,
  dph: 0.21,
  marze: 0.20,
  sazby: { projektant: 1000, statik: 1000, zamereni: 1000 },
  dopravaKmKc: 10,
  dopravaHodKc: 1000,                // hodina cesty mimo Prahu (8. 9. 2026)
  vyjezdTechnikKc: 3500,             // Akce mimo Prahu – 1 výjezd technika (D2, smyšlené)
  dopravaPausalKc: 1000,
  fixy: {
    pamatkari: 0,
    uzemniRozvoj: 0,
    pbr: 10000,
    studieOsvitu: 0,
    elektroDpz: 10000,
    ic: 20000,
    elektroDps: 10000,
    ezc: 20000,
    kolaudace: 10000,
    geodet: 0,
  },
};

/* Čerstvá kopie – testy si ceník běžně upravují a nesmí si tím rozbít
 * ostatní sady, které běží ve stejném procesu. */
const zkusebniCenik = () => JSON.parse(JSON.stringify(ZKUSEBNI_CENIK));
const zkusebniCenikProj = () => JSON.parse(JSON.stringify(ZKUSEBNI_CENIK_PROJ));

/* Můstky v NOVÉM tvaru (#354; #548 / K10-S2): smyšlené sazby pro testy.
 * Do v2.11.2 testy četly výchozí hodnoty migrace z jádra — a ty byly
 * skutečné a šly do sestavení. Jádro už žádné nemá; tyhle nejsou naše ceny.
 * Na šířce šachty 1,6 m a délce 1 m: materiál 1 × 20 000 × 1600/2000
 * = 16 000, hodiny max(14, 6 + 10 × 1) = 16, montáž 16 × 500 = 8 000. */
const ZKUSEBNI_MUSTKY = {
  mustekKc: 20000, mustekRefSirkaMm: 2000, mustekMontazHodKc: 500,
  mustekMontazZakladHod: 6, mustekMontazBmHod: 10, mustekMontazMinHod: 14,
};
const zkusebniMustky = () => JSON.parse(JSON.stringify(ZKUSEBNI_MUSTKY));
  /* Skladebné sazby můstků (#560) — SMYŠLENÉ, převzaté ze src/test_560_mustky_sekce.js. */
  const SKLADBA = { mustekRamBmKc: 10000, mustekPodlahaPlechM2Kc: 1000, mustekPodlahaPororostM2Kc: 1100, mustekPodlahaVanaM2Kc: 1200,
    mustekZabradliKovBmKc: 2000, mustekZabradliSkloBmKc: 5000, mustekKotveniDeskaKc: 3000, mustekKotveniSloupKc: 3100,
    mustekKotveniKonzolaKc: 3200, mustekZabradliSkloMontazHodBm: 1 };
  /* Režim zkušebního ceníku: 'skladebny' (nové sazby můstků) nebo 'stary' (bez nich → výpočet #354 a lišta). */
  window.PROTO_CENIK = { rezim: 'skladebny' };
  window.PROTO_cenikNastav = function (rezim) {
    const v = aktivniVarianta(ZAK);
    PROTO_CENIK.rezim = rezim === 'stary' ? 'stary' : 'skladebny';
    Object.assign(v.data.cenik, zkusebniCenik(), zkusebniMustky());
    Object.keys(SKLADBA).forEach(k => { v.data.cenik[k] = PROTO_CENIK.rezim === 'skladebny' ? SKLADBA[k] : 0; });
  };
  try {
    const v = aktivniVarianta(ZAK);
    PROTO_cenikNastav('skladebny');
    Object.assign(v.data.proj.cenik, zkusebniCenikProj());
    ZAK.cislo = '2026 - OPR - CN - 0412';
    ZAK.nazevAkce = 'Bytový dům Nad Parkem (ukázka)';
    ZAK.adresa = 'Praha 6 (smyšlená adresa)';
    ZAK.objednatel = 'Ukázková stavební s.r.o.';
    ZAK.datum = '2026-11-06';
    Object.assign(v.data.ock.zadani, { zdvih: 17.3, prejezd: 2.7, prohluben: 1.05, sirka: 1.51, hloubka: 1.515, nastupiste: 6 });
    syncVarianta();
    render();
  } catch (e) { console.error('PROTOTYP A2', e); }
})();
